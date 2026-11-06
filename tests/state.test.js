import test from "node:test";
import assert from "node:assert/strict";
import {normalize,change} from "../src/state.js";
test("defaults and capacity limits",()=>{assert.equal(normalize().capacity,12);assert.equal(normalize({capacity:999}).capacity,60);assert.equal(normalize({capacity:-1}).capacity,1);assert.equal(normalize({capacity:"oops"}).capacity,12)});
test("toggle is reversible and immutable",()=>{const a=normalize();const b=change(a,{type:"toggle",index:0});assert.equal(b.rounds[0],false);assert.equal(a.rounds[0],true);assert.deepEqual(change(b,{type:"toggle",index:0}),a)});
test("resize preserves existing rounds",()=>{const a=change(normalize(),{type:"toggle",index:0});const b=change(a,{type:"configure",capacity:20,layout:"rifle"});assert.equal(b.rounds[0],false);assert.equal(b.rounds[19],true);assert.equal(change(b,{type:"configure",capacity:6,layout:"revolver"}).rounds.length,6)});
test("reload and empty",()=>{const a=change(normalize(),{type:"empty"});assert.ok(a.rounds.every(x=>!x));assert.ok(change(a,{type:"reload"}).rounds.every(Boolean))});
test("invalid index and layout",()=>{const a=normalize({layout:"bad"});assert.equal(a.layout,"pistol");assert.deepEqual(change(a,{type:"toggle",index:90}),a)});
