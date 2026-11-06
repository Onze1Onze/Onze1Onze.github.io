import test from "node:test";
import assert from "node:assert/strict";
import {DEATH_KEY,normalizeCondition,healthCondition,toggleFailure,syncHealth} from "../src/death-state.js";
import {DETAILS,parseVisualization,parsePublished,SHEET_KEY} from "../src/sheet-source.js";
import {createHealthMonitor,isHealthAuthority} from "../src/health-monitor.js";
import {createConditionVisuals,VISUAL_KEY,skullGeometry,GRAYSCALE_SKSL} from "../src/death-visuals.js";
const url="https://docs.google.com/spreadsheets/d/ficha/edit?gid=0";
test("healthy -> dying -> dead after exactly three manual markers, then recovery clears them",()=>{
 let state=healthCondition(undefined,18,url);assert.equal(state.status,"alive");
 state=healthCondition(state,0,url);assert.equal(state.status,"dying");
 state=toggleFailure(state,0);state=toggleFailure(state,1);assert.equal(state.status,"dying");
 state=toggleFailure(state,2);assert.equal(state.status,"dead");
 state=healthCondition(state,0,url);assert.equal(state.status,"dead");
 state=toggleFailure(state,1);assert.equal(state.status,"dying");
 state=healthCondition(state,1,url);assert.equal(state.status,"alive");assert.deepEqual(state.marks,[false,false,false]);
});
test("negative HP is dying; invalid HP cannot create dying state; source changes reset markers",()=>{
 const state=healthCondition(undefined,-5,url);assert.equal(state.status,"dying");
 const marked=toggleFailure(state,0);
 assert.deepEqual(healthCondition(marked,NaN,url),marked);
 assert.equal(healthCondition(marked,0,"other").marks[0],false);
 assert.equal(normalizeCondition({hp:"0",marks:[true,true,true]}).status,"alive");
 for(const index of [-1,3,0.5])assert.deepEqual(toggleFailure(marked,index),marked);
 assert.equal(toggleFailure(healthCondition(null,18,url),0).status,"alive");
});
test("health sync preserves unrelated metadata, marks and image; rejects obsolete links and invalid HP",async()=>{
 const token={id:"a",type:"IMAGE",layer:"CHARACTER",image:{url:"original"},metadata:{[SHEET_KEY]:{url},ammo:{rounds:[false]}}};
 let writes=0;
 const api={scene:{items:{updateItems:async(ids,fn)=>{writes++;fn([token]);}}}};
 await syncHealth(api,"a",0,url);token.metadata[DEATH_KEY]=toggleFailure(token.metadata[DEATH_KEY],0);
 await syncHealth(api,"a",0,url);assert.equal(token.metadata[DEATH_KEY].marks[0],true);
 assert.equal(token.image.url,"original");assert.deepEqual(token.metadata.ammo,{rounds:[false]});
 await syncHealth(api,"a",20,"old-sheet");assert.equal(token.metadata[DEATH_KEY].status,"dying");
 const count=writes;await syncHealth(api,"a",undefined,url);assert.equal(writes,count);
});
test("all four new merged fields map to F16/J16/L16/P16, including movement formatted with unit",()=>{
 const rows=Array.from({length:10},()=>({c:Array(19).fill(null)}));
 for(const [cell,value] of Object.entries({F9:40,J9:60,M9:18,Q9:25,T9:6,X9:12,F16:15,J16:20,L16:5,P16:9})){
  const row=Number(cell.slice(1))-9,col=cell.charCodeAt(0)-70;
  rows[row].c[col]={v:value,...(cell==="P16"?{f:"9 m"}:{})};
 }
 const v=parseVisualization(JSON.stringify({status:"ok",table:{rows:[rows[0]]}}),JSON.stringify({status:"ok",table:{rows:[rows[7]]}}));
 assert.deepEqual(v.slice(3).map(d=>[d.id,d.value]),[["movement","9 m"],["defense","15"],["block","5"],["dodge","20"]]);
 const csv=Array.from({length:18},()=>Array(25).fill(""));
 for(const [cell,value] of Object.entries({F9:40,J9:60,M9:18,Q9:25,T9:6,X9:12,F16:15,J16:20,L16:5,P16:"9 m"}))csv[Number(cell.slice(1))-1][cell.charCodeAt(0)-65]=String(value);
 assert.deepEqual(parsePublished(csv.map(r=>r.join(",")).join("\n")),v);
});
test("missing optional fields show placeholders, not zeros or a health failure",()=>{
 const rows=[{c:Array(19).fill(null)}];for(const [cell,value] of Object.entries({F9:40,J9:60,M9:18,Q9:25,T9:6,X9:12}))rows[0].c[cell.charCodeAt(0)-70]={v:value};
 const values=parseVisualization(JSON.stringify({status:"ok",table:{rows}}));
 assert.ok(values.slice(3).every(v=>v.value==="—"));assert.equal(values[0].current,18);
});
function clock(){let id=0;const tasks=new Map();return {tasks,setTimeout:(fn,ms)=>{tasks.set(++id,{fn,ms});return id;},clearTimeout:id=>tasks.delete(id)};}
async function flush(){for(let i=0;i<80;i++)await Promise.resolve();}
test("one elected GM monitors unselected tokens and writes valid HP only",async()=>{
 const token={id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{[SHEET_KEY]:{url}}};
 const timers=clock(),errors=[];
 const api={player:{getRole:async()=>"GM",getId:async()=>"1"},party:{getPlayers:async()=>[{id:"2",role:"GM"}]},scene:{isReady:async()=>true,items:{getItems:async filter=>[token].filter(filter),updateItems:async(ids,fn)=>fn([token])}},reportError:e=>errors.push(e)};
 assert.equal(await isHealthAuthority(api),true);
 const monitor=createHealthMonitor(api,{timers,read:async()=>[{id:"hp",current:0}]});
 monitor.refresh();await flush();assert.equal(token.metadata[DEATH_KEY].status,"dying");
 assert.ok([...timers.tasks.values()].some(task=>task.ms===20000));monitor.stop();assert.equal(timers.tasks.size,0);
 api.player.getId=async()=>"3";assert.equal(await isHealthAuthority(api),false);
 assert.equal(errors.length,0);
});
test("a failed sheet read preserves an existing state and a scene switch discards an old reply",async()=>{
 const token={id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{[SHEET_KEY]:{url},[DEATH_KEY]:healthCondition(null,10,url)}};
 const api={player:{getRole:async()=>"GM",getId:async()=>"1"},party:{getPlayers:async()=>[]},scene:{isReady:async()=>true,items:{getItems:async filter=>[token].filter(filter),updateItems:async(ids,fn)=>fn([token])}},reportError:()=>{}};
 const timers=clock();let resolve;
 const monitor=createHealthMonitor(api,{timers,read:()=>new Promise(r=>{resolve=r;})});
 monitor.refresh();await flush();monitor.refresh({sceneChanged:true});resolve([{id:"hp",current:0}]);await flush();
 assert.equal(token.metadata[DEATH_KEY].status,"alive");monitor.stop();
});
// A fluent SDK fake records fields without loading the live browser SDK.
function makeBuilder(type,image,grid){
 const item={id:"id-"+Math.random(),type,image,grid,position:{x:0,y:0},scale:{x:1,y:1},metadata:{}};
 const proxy=new Proxy({}, {get:(_,key)=>key==="build"?()=>structuredClone(item):value=>{item[key]=value;return proxy;}});
 return proxy;
}
test("skull and grayscale appear, follow token bounds, survive deselection and disappear on recovery",async()=>{
 let token={id:"a",type:"IMAGE",layer:"CHARACTER",visible:true,metadata:{[DEATH_KEY]:healthCondition(null,0,url)}};
 const local=[],errors=[];
 const bounds={min:{x:0,y:0},max:{x:100,y:100},center:{x:50,y:50}};
 const api={scene:{isReady:async()=>true,grid:{getDpi:async()=>150},items:{getItems:async filter=>[token].filter(filter),getItemBounds:async()=>bounds},local:{
  getItems:async filter=>local.filter(filter),addItems:async items=>local.push(...items),
  deleteItems:async ids=>{for(let i=local.length-1;i>=0;i--)if(ids.includes(local[i].id))local.splice(i,1);},
  updateItems:async(ids,fn)=>fn(local.filter(i=>ids.includes(i.id)))
 }},reportError:e=>errors.push(e)};
 const visuals=createConditionVisuals(api,{buildBillboard:(image,grid)=>makeBuilder("BILLBOARD",image,grid),buildEffect:()=>makeBuilder("EFFECT")},"https://example.test");
 await visuals.refresh();assert.equal(local.length,1);assert.ok(local[0].image.url.endsWith("skull-dying.svg"));
 for(let i=0;i<3;i++)token.metadata[DEATH_KEY]=toggleFailure(token.metadata[DEATH_KEY],i);
 await visuals.refresh();assert.equal(local.length,2);assert.ok(local.some(i=>i.sksl===GRAYSCALE_SKSL&&i.attachedTo==="a"));
 const skull=local.find(i=>i.type==="BILLBOARD");assert.ok(skull.image.url.endsWith("skull-dead.svg"));assert.equal(skull.visible,true);
 bounds.min.y=200;bounds.center.y=250;await visuals.refresh();assert.ok(local.find(i=>i.type==="BILLBOARD").position.y>100);
 token.metadata[DEATH_KEY]=healthCondition(token.metadata[DEATH_KEY],1,url);await visuals.refresh();assert.equal(local.length,0);
 assert.equal(errors.length,0);assert.ok(skullGeometry(bounds,"dead").size>skullGeometry(bounds,"dying").size);
});

test("network failure never changes an existing healthy character to dying",async()=>{
 const token={id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{[SHEET_KEY]:{url},[DEATH_KEY]:healthCondition(null,12,url)}};
 const timers=clock(),errors=[];let writes=0;
 const api={player:{getRole:async()=>"GM",getId:async()=>"1"},party:{getPlayers:async()=>[]},scene:{isReady:async()=>true,items:{getItems:async filter=>[token].filter(filter),updateItems:async()=>{writes++;}}},reportError:e=>errors.push(e)};
 const monitor=createHealthMonitor(api,{timers,read:async()=>{throw Error("private");}});
 monitor.refresh();await flush();assert.equal(token.metadata[DEATH_KEY].hp,12);assert.equal(writes,0);assert.equal(errors.length,1);monitor.stop();
});
