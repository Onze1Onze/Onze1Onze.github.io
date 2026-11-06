import test from "node:test";
import assert from "node:assert/strict";
import {createPortraitController,portraitPosition} from "../src/portrait-controller.js";
function fixture(){
 const events=[],tokens={a:{id:"a",type:"IMAGE",layer:"CHARACTER"},b:{id:"b",type:"IMAGE",layer:"CHARACTER"},map:{id:"map",type:"IMAGE",layer:"MAP"}};
 let ready=true;
 const api={scene:{isReady:async()=>ready,items:{getItems:async ids=>ids.map(id=>tokens[id]).filter(Boolean)}},
 viewport:{getWidth:async()=>1366,getHeight:async()=>600},popover:{open:async p=>events.push(["open",p]),close:async()=>events.push(["close"])},reportError:e=>{throw e;}};
 return {api,events,tokens,controller:createPortraitController(api),setReady:value=>{ready=value;}};
}
test("portrait opens bottom left, swaps tokens and closes on invalid selection",async()=>{
 const f=fixture();await f.controller.select(["a"]);
 assert.equal(f.events.at(-1)[1].width,220);assert.equal(f.events.at(-1)[1].height,76);
 assert.deepEqual(f.events.at(-1)[1].anchorPosition,{left:16,top:508});
 await f.controller.select(["b"]);assert.ok(f.events.at(-1)[1].url.includes("token=b"));
 for(const ids of [[],null,["a","b"],["map"]]){await f.controller.select(ids);assert.equal(f.events.at(-1)[0],"close");}
});
test("portrait closes on deletion and scene shutdown",async()=>{
 const f=fixture();await f.controller.select(["a"]);delete f.tokens.a;await f.controller.refresh();
 assert.equal(f.events.at(-1)[0],"close");
 await f.controller.select(["b"]);f.setReady(false);await f.controller.refresh();assert.equal(f.events.at(-1)[0],"close");
});
test("deselect during opening closes the late portrait",async()=>{
 const f=fixture();let release,entered;
 const started=new Promise(r=>{entered=r;}),pause=new Promise(r=>{release=r;});
 f.api.popover.open=async p=>{f.events.push(["open",p]);entered();await pause;};
 const pending=f.controller.select(["a"]);await started;f.controller.select([]);release();await pending;
 assert.equal(f.events.at(-1)[0],"close");
});
test("portrait remains fixed while token metadata changes",async()=>{
 const f=fixture();await f.controller.select(["a"]);f.tokens.a.name="Renamed";
 await f.controller.refresh();assert.equal(f.events.filter(e=>e[0]==="open").length,1);
 assert.deepEqual(portraitPosition(180,70),{left:16,top:0});
});
