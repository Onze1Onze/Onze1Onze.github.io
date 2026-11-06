import {DEATH_KEY,normalizeCondition,toggleFailure,syncHealth} from "../src/death-state.js";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SHEET_KEY,parseSheetLink,DETAILS} from "../src/sheet-source.js";
import {SHEET_SETTINGS_ID,STATS_ID} from "../src/sheet-controller.js";
const settingsSource=readFileSync(new URL("../src/sheet-settings.js",import.meta.url),"utf8").replace(/^import .*;\n/gm,"");
function element(){
 return {value:"",textContent:"",style:{},disabled:false,reportValidity:()=>true,setAttribute(){},classList:{toggle(){}}};
}
async function settingsFixture({readFailure=false,writeFailure=false}={}){
 const nodes=Object.fromEntries(["form","save","unlink","link","name","status","close"].map(id=>[id,element()]));
 const token={id:"a",name:"Jaren",type:"IMAGE",layer:"CHARACTER",metadata:{"ammo":{rounds:[false,true]}}};
 let ready;const writes=[],links=[];
 const api={onReady:fn=>{ready=fn;},scene:{items:{getItems:async()=>[token],onChange:()=>{},updateItems:async(ids,fn)=>{if(writeFailure)throw Error("Sem permissão.");fn([token]);writes.push(token);}},onReadyChange:()=>{}},popover:{close:async()=>{}}};
 const read=async config=>{links.push(config);if(readFailure)throw Error("Planilha privada.");return [];};
 new Function("OBR","document","globalThis","URLSearchParams","location","SHEET_KEY","parseSheetLink","fetchMetrics","SHEET_SETTINGS_ID","DEATH_KEY",settingsSource)(
 api,{getElementById:id=>nodes[id]},{addEventListener(){}},URLSearchParams,{search:"?token=a"},SHEET_KEY,parseSheetLink,read,SHEET_SETTINGS_ID,DEATH_KEY);
 await ready();
 return {nodes,token,writes,links};
}
async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
test("saving validates Sheets first and changes only this token's sheet metadata",async()=>{
 const f=await settingsFixture();f.nodes.link.value="https://docs.google.com/spreadsheets/d/example/edit#gid=42";
 f.nodes.form.onsubmit({preventDefault(){}});await flush();
 assert.equal(f.links.length,1);assert.equal(f.writes.length,1);assert.equal(f.token.metadata[SHEET_KEY].url,"https://docs.google.com/spreadsheets/d/example/edit?gid=42");
 assert.deepEqual(f.token.metadata.ammo,{rounds:[false,true]});assert.equal(f.nodes.save.disabled,false);
});
test("private sheet failures never save a broken link; permission errors remain visible",async()=>{
 const f=await settingsFixture({readFailure:true});f.nodes.link.value="https://docs.google.com/spreadsheets/d/example/edit";
 f.nodes.form.onsubmit({preventDefault(){}});await flush();
 assert.equal(f.writes.length,0);assert.ok(f.nodes.status.textContent.includes("privada"));
 const denied=await settingsFixture({writeFailure:true});denied.nodes.link.value=f.nodes.link.value;
 denied.nodes.form.onsubmit({preventDefault(){}});await flush();assert.equal(denied.writes.length,0);assert.ok(denied.nodes.status.textContent.includes("permissão"));
});
test("unlink removes only the sheet configuration without fetching Google",async()=>{
 const f=await settingsFixture();f.token.metadata[SHEET_KEY]={url:"https://docs.google.com/spreadsheets/d/example/edit"};
 f.nodes.unlink.onclick();await flush();
 assert.equal(f.token.metadata[SHEET_KEY],undefined);assert.equal(f.links.length,0);assert.deepEqual(f.token.metadata.ammo,{rounds:[false,true]});
});
test("status UI preserves old values but marks them stale on network failure",async()=>{
 const nodes={};
 for(const id of ["hp","san","pe"])for(const suffix of ["value","fill","bar"])nodes[id+"-"+suffix]=element();
 for(const id of ["condition-label","death-track","death-title","death-count","movement-value","defense-value","block-value","dodge-value"])nodes[id]=element();
 nodes.status=element();
 const toggles=[],body={classList:{toggle:(name,value)=>toggles.push([name,value])}};
 let handlers,ready,stopped=0;
 const api={player:{getRole:async()=>"GM"},party:{getPlayers:async()=>[]},onReady:fn=>{ready=fn;},scene:{items:{getItems:async()=>[{id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{[SHEET_KEY]:{url:"https://docs.google.com/spreadsheets/d/id/edit"}}}],onChange:()=>{}},onReadyChange:()=>{}},popover:{close:async()=>{}}};
 const source=readFileSync(new URL("../src/stats.js",import.meta.url),"utf8").replace(/^import .*;\n/gm,"");
 new Function("OBR","document","globalThis","location","SHEET_KEY","parseSheetLink","METRICS","DETAILS","createSheetPoller","STATS_ID","DEATH_KEY","normalizeCondition","toggleFailure","syncHealth",source)(
 api,{getElementById:id=>nodes[id],body,querySelectorAll:()=>[]},{addEventListener(){}},{search:"?token=a"},SHEET_KEY,parseSheetLink,[{id:"hp"},{id:"san"},{id:"pe"}],DETAILS,callbacks=>{handlers=callbacks;return {start(){},stop(){stopped++;}};},STATS_ID,DEATH_KEY,normalizeCondition,toggleFailure,syncHealth);
 await ready();
 handlers.onData([{id:"hp",current:18,maximum:25,percent:72},{id:"san",current:40,maximum:60,percent:66.66},{id:"pe",current:6,maximum:12,percent:50}]);
 assert.equal(nodes["hp-value"].textContent,"18 / 25");assert.equal(nodes["hp-fill"].style.width,"72%");
 handlers.onError(Error("Sem conexão"));
 assert.equal(nodes["hp-value"].textContent,"18 / 25");assert.equal(toggles.at(-1)[1],true);
});

test("death buttons write shared marks, reach dead at three and permit undo; permission failures preserve state",async()=>{
 const nodes={};
 for(const id of ["hp","san","pe"])for(const suffix of ["value","fill","bar"])nodes[id+"-"+suffix]=element();
 for(const id of ["status","condition-label","death-track","death-title","death-count","movement-value","defense-value","block-value","dodge-value"])nodes[id]=element();
 const marks=Array.from({length:3},()=>({...element(),attrs:{},setAttribute(k,v){this.attrs[k]=v;}}));
 const url="https://docs.google.com/spreadsheets/d/id/edit?gid=0";
 const token={id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{[SHEET_KEY]:{url},[DEATH_KEY]:{hp:0,status:"dying",marks:[false,false,false],source:url}}};
 let ready,fail=false;
 const api={player:{getRole:async()=>"GM"},party:{getPlayers:async()=>[]},onReady:fn=>{ready=fn;},scene:{items:{
 getItems:async()=>[token],onChange:()=>{},updateItems:async(ids,fn)=>{if(fail)throw Error("permission");fn([token]);}},onReadyChange:()=>{}},popover:{close:async()=>{}}};
 const source=readFileSync(new URL("../src/stats.js",import.meta.url),"utf8").replace(/^import .*;\n/gm,"");
 new Function("OBR","document","globalThis","location","SHEET_KEY","parseSheetLink","METRICS","DETAILS","createSheetPoller","STATS_ID","DEATH_KEY","normalizeCondition","toggleFailure","syncHealth","console",source)(
 api,{getElementById:id=>nodes[id],querySelectorAll:()=>marks,body:{classList:{toggle(){}}}},{addEventListener(){}},{search:"?token=a"},SHEET_KEY,parseSheetLink,[{id:"hp"},{id:"san"},{id:"pe"}],DETAILS,()=>({start(){},stop(){}}),STATS_ID,DEATH_KEY,normalizeCondition,toggleFailure,syncHealth,{error(){}});
 await ready();assert.equal(nodes["death-track"].hidden,false);
 for(const button of marks){button.onclick();await flush();}
 assert.equal(token.metadata[DEATH_KEY].status,"dead");assert.equal(nodes["condition-label"].textContent,"Morto");
 marks[1].onclick();await flush();assert.equal(token.metadata[DEATH_KEY].status,"dying");
 assert.equal(marks[1].attrs["aria-pressed"],"false");
 fail=true;marks[1].onclick();await flush();assert.equal(token.metadata[DEATH_KEY].status,"dying");
 assert.ok(nodes.status.textContent.includes("permissão"));
});
