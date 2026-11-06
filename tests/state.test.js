import test from "node:test";
import assert from "node:assert/strict";
import {normalize,change,WEAPONS} from "../src/state.js";
const remaining = state => state.rounds.filter(Boolean).length;
test("eight weapons enforce fixed capacities even with forged capacity",()=>{
 const expected={pistol:12,revolver:6,hunting:4,smg:20,shotgun:6,assault:30,sniper:1,machinegun:50};
 assert.deepEqual(Object.fromEntries(Object.entries(WEAPONS).map(([id,w])=>[id,w.capacity])),expected);
 for(const [weapon,capacity] of Object.entries(expected)) {
  const state=normalize({weapon,capacity:999,rounds:Array(100).fill(false)});
  assert.equal(state.capacity,capacity);assert.equal(state.rounds.length,capacity);assert.equal(remaining(state),0);
 }
});
test("old data migrates preserving spent slots and filling new slots",()=>{
 assert.equal(normalize(null).capacity,12);
 assert.equal(normalize({layout:"revolver",capacity:20,rounds:[false,true]}).capacity,6);
 assert.equal(normalize({layout:"rifle",rounds:[false]}).weapon,"hunting");
 const state=normalize({layout:"pistol",capacity:2,rounds:[false,false]});
 assert.equal(remaining(state),10);
 assert.equal(normalize({weapon:"not-real"}).weapon,"pistol");
});
test("toggle is reversible, immutable and ignores invalid indices",()=>{
 const state=normalize();const changed=change(state,{type:"toggle",index:0});
 assert.equal(changed.rounds[0],false);assert.equal(state.rounds[0],true);
 assert.deepEqual(change(changed,{type:"toggle",index:0}),state);
 for(const index of [-1,12,1.5,NaN])assert.deepEqual(change(state,{type:"toggle",index}),state);
});
test("switching weapons preserves each magazine, including the last round",()=>{
 let state=change(normalize(),{type:"toggle",index:0});
 state=change(state,{type:"configure",weapon:"sniper"});
 state=change(state,{type:"toggle",index:0});assert.equal(remaining(state),0);
 state=change(state,{type:"configure",weapon:"pistol"});assert.equal(remaining(state),11);
 state=change(state,{type:"configure",weapon:"sniper"});assert.equal(remaining(state),0);
});
test("manual capacity/layout edits and unknown weapon do not change capacity",()=>{
 const state=normalize({weapon:"assault"});
 assert.deepEqual(change(state,{type:"configure",capacity:7,layout:"revolver"}),state);
 assert.deepEqual(change(state,{type:"configure",weapon:"bad"}),state);
});
test("burst exists only for assault and machinegun",()=>{
 for(const weapon of Object.keys(WEAPONS)) {
  const state=normalize({weapon});const next=change(state,{type:"burst"});
  assert.equal(remaining(next),WEAPONS[weapon].capacity-(WEAPONS[weapon].burst?10:0));
  assert.equal(remaining(state),WEAPONS[weapon].capacity);
 }
});
test("burst spends loaded slots rather than ten positions",()=>{
 const rounds=Array.from({length:30},(_,i)=>i%2===1);
 const state=normalize({weapon:"assault",rounds});
 const next=change(state,{type:"burst"});
 assert.equal(remaining(next),5);
 assert.ok(next.rounds.slice(0,20).every(x=>!x));assert.equal(remaining(state),15);
});
test("burst boundaries zero through full magazine never underflow",()=>{
 for(const weapon of ["assault","machinegun"])for(let count=0;count<=WEAPONS[weapon].capacity;count++){
  const state=normalize({weapon,rounds:Array.from({length:WEAPONS[weapon].capacity},(_,i)=>i<count)});
  const next=change(state,{type:"burst"});
  assert.equal(remaining(next),count>=10?count-10:count);
 }
});
test("repeated bursts stop at zero and retain state after reopening",()=>{
 let state=normalize({weapon:"machinegun"});
 for(let i=0;i<7;i++)state=change(state,{type:"burst"});
 assert.equal(remaining(state),0);assert.equal(remaining(normalize(JSON.parse(JSON.stringify(state)))),0);
});
test("weapon data for two tokens is independent",()=>{
 const a=normalize({weapon:"assault"}),b=normalize({weapon:"assault"});
 const spent=change(a,{type:"burst"});
 assert.equal(remaining(spent),20);assert.equal(remaining(b),30);
});
