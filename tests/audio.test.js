import test from "node:test";
import assert from "node:assert/strict";
import {SOUND_PROFILES,ammoFeedback,createWeaponAudio} from "../src/audio.js";
import {WEAPONS,normalize,change} from "../src/state.js";
test("eight weapons have distinct shot and reload profiles",()=>{
 assert.deepEqual(Object.keys(SOUND_PROFILES).sort(),Object.keys(WEAPONS).sort());
 assert.equal(new Set(Object.values(SOUND_PROFILES).map(p=>JSON.stringify(p))).size,8);
 for(const p of Object.values(SOUND_PROFILES)){assert.ok(p.body>0&&p.tail>0&&p.gap>0);assert.ok(p.reload.length>=3);}
});
test("feedback reflects actual spent/restored slots, not configuration or no-op",()=>{
 for(const weapon of Object.keys(WEAPONS)){
  const before=normalize({weapon}),after=change(before,{type:"toggle",index:0});
  assert.equal(ammoFeedback(before,after).type,"shot");
  assert.equal(ammoFeedback(after,before).type,"reload");
  assert.equal(ammoFeedback(before,before),null);
 }
 const before=normalize({weapon:"assault"}),after=change(before,{type:"burst"});
 assert.equal(ammoFeedback(before,after).indices.length,10);
 assert.equal(ammoFeedback(before,normalize({weapon:"pistol"})),null);
});
test("audio unavailable or blocked does not reject ammo feedback",async()=>{
 const missing=createWeaponAudio(null);assert.equal(await missing.unlock(),false);
 await missing.play({weapon:"pistol",type:"shot",indices:[0]});
 const blocked=createWeaponAudio(class{constructor(){throw Error("blocked");}});
 await blocked.play({weapon:"shotgun",type:"reload",indices:[0]});blocked.dispose();
});
test("audio schedules bounded nodes for each weapon and releases finished voices",async()=>{
 const sources=[],params=[];
 const param=()=>({value:0,setValueAtTime(v,t){params.push([v,t]);},exponentialRampToValueAtTime(v,t){params.push([v,t]);}});
 function node(){return {connect(){},disconnect(){this.disconnected=true;}};}
 class Context{
 constructor(){this.state="suspended";this.currentTime=1;this.sampleRate=8000;this.destination=node();}
 async resume(){this.state="running";}
 async close(){this.state="closed";}
 createGain(){return {...node(),gain:param()};}
 createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
 createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
 createBiquadFilter(){return {...node(),frequency:param()};}
 createBufferSource(){const s={...node(),start(t){this.startTime=t;},stop(t){this.stopTime=t;}};sources.push(s);return s;}
 createOscillator(){const s=this.createBufferSource();s.frequency=param();return s;}
 }
 const audio=createWeaponAudio(Context);assert.equal(await audio.unlock(),true);
 for(const weapon of Object.keys(WEAPONS)){
  await audio.play({weapon,type:"shot",indices:[0]});
  await audio.play({weapon,type:"reload",indices:[0]});
 }
 const count=sources.length;
 await audio.play({weapon:"assault",type:"shot",indices:Array(100).fill(0)});
 assert.equal(sources.length-count,30);
 for(const s of sources){assert.ok(s.stopTime>s.startTime && s.stopTime-s.startTime<.6);s.onended();assert.ok(s.disconnected);}
 assert.ok(params.every(([v,t])=>Number.isFinite(v)&&Number.isFinite(t)));
 audio.dispose();await audio.play({weapon:"pistol",type:"shot",indices:[0]});
 assert.equal(sources.length,count+30);
});
