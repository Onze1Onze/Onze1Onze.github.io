import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {KEY,WEAPONS,normalize,change} from "../src/state.js";
import {PANEL_ID,panelSize} from "../src/panel.js";
import {roundPlacement,magazineWidth} from "../src/layout.js";
const appSource = readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
function element(id="") {
 return {id,children:[],dataset:{},style:{},listeners:{},scrollLeft:0,
 append(x){this.children.push(x);},replaceChildren(){this.children=[];},setAttribute(){},
 contains(){return false;},querySelector(){return null;},
 addEventListener(k,fn){this.listeners[k]=fn;},
 showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},reportValidity(){return true;}};
}
async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
async function ui(){
 const ids=["tracker","settings","name","remaining","capacity","rounds","status","config","config-form","weapon","cancel","burst"];
 const nodes=Object.fromEntries(ids.map(id=>[id,element(id)]));
 let token={id:"a",name:"Jaren",type:"IMAGE",layer:"CHARACTER",metadata:{}},ready,fail=false;
 const heights=[];
 const sdk={isAvailable:true,onReady:fn=>{ready=fn;},scene:{items:{
 getItems:async()=>[token],updateItems:async(ids,fn)=>{if(fail)throw Error("denied");fn([token]);},
 onChange:()=>{}}},popover:{setHeight:async(id,h)=>{heights.push(h);},close:async()=>{}}};
 const document={getElementById:id=>nodes[id]||null,createElement:()=>element(),activeElement:null};
 new Function("OBR","document","location","URLSearchParams","KEY","WEAPONS","normalize","change","PANEL_ID","panelSize","roundPlacement","magazineWidth","console",
 appSource.replace(/^import .*;\n/gm,""))(sdk,document,{search:"?token=a"},URLSearchParams,KEY,WEAPONS,normalize,change,PANEL_ID,panelSize,roundPlacement,magazineWidth,{error:()=>{}});
 await ready();
 async function choose(weapon){
  nodes.settings.onclick();await flush();nodes.weapon.value=weapon;
  await nodes["config-form"].onsubmit({preventDefault(){}});
 }
 return {nodes,token,heights,choose,setFail:value=>{fail=value;}};
}
test("UI offers all fixed weapons, no capacity input, and exact bullet counts",async()=>{
 const u=await ui();assert.equal(u.nodes.weapon.children.length,8);
 for(const [id,weapon] of Object.entries(WEAPONS)){
  await u.choose(id);
  assert.equal(u.nodes.capacity.textContent,weapon.capacity);
  assert.equal(u.nodes.rounds.children[0].children.length,weapon.capacity);
  assert.equal(u.nodes.burst.hidden,!weapon.burst);
  assert.equal(u.heights.at(-1),id==="revolver"?148:108);
 }
});
test("burst UI spends ten, ignores overlapping clicks and disables below ten",async()=>{
 const u=await ui();await u.choose("assault");
 u.nodes.burst.onclick();u.nodes.burst.onclick();await flush();
 assert.equal(u.nodes.remaining.textContent,20);
 u.nodes.burst.onclick();await flush();u.nodes.burst.onclick();await flush();
 assert.equal(u.nodes.remaining.textContent,0);assert.equal(u.nodes.burst.disabled,true);
 await u.choose("pistol");assert.equal(u.nodes.burst.hidden,true);
});
test("failed save retains settings and the old magazine",async()=>{
 const u=await ui();u.nodes.settings.onclick();await flush();
 u.nodes.weapon.value="machinegun";u.setFail(true);
 await u.nodes["config-form"].onsubmit({preventDefault(){}});
 assert.equal(u.nodes.config.open,true);
 assert.equal(u.nodes.remaining.textContent,12);
 assert.ok(u.nodes.status.textContent.includes("permissão"));
});
