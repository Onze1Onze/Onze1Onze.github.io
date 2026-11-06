import test from "node:test";
import assert from "node:assert/strict";
import {createPanelController, panelPosition} from "../src/panel.js";
import {normalize, KEY} from "../src/state.js";
import {chamberPosition} from "../src/layout.js";
function fixture() {
  const events = [];
  let ready = true;
  const tokens = {
    a: {id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{}},
    b: {id:"b",type:"IMAGE",layer:"CHARACTER",metadata:{}},
    map: {id:"map",type:"IMAGE",layer:"MAP",metadata:{}}
  };
  const api = {
    scene: {isReady: async()=>ready, items:{getItems:async ids=>ids.map(id=>tokens[id]).filter(Boolean)}},
    viewport:{getWidth:async()=>1366,getHeight:async()=>600},
    party:{getPlayers:async()=>[]},
    popover:{open:async value=>{events.push(["open", value]);},close:async()=>{events.push(["close"]);}},
    reportError:error=>{throw error;}
  };
  return {api,events,tokens,controller:createPanelController(api,normalize),setReady:value=>{ready=value;}};
}
function deferred() {let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
test("empty/null/multiple/non-character selections close the bar",async()=>{
  const f=fixture();
  await f.controller.select(["a"]);
  for(const ids of [[],null,["a","b"],["map"]]) {
    await f.controller.select(ids);
    assert.equal(f.events.at(-1)[0],"close");
  }
});
test("deselect while opening cannot leave an orphan panel",async()=>{
  const f=fixture(), entered=deferred(), release=deferred();
  f.api.popover.open=async value=>{f.events.push(["open",value]);entered.resolve();await release.promise;};
  const pending=f.controller.select(["a"]);await entered.promise;
  f.controller.select([]);release.resolve();await pending;
  assert.equal(f.events.at(-1)[0],"close");
});
test("a slow old token lookup cannot reopen after selecting another token",async()=>{
  const f=fixture(), entered=deferred(), release=deferred();
  const read=f.api.scene.items.getItems;
  f.api.scene.items.getItems=async ids=>{if(ids[0]==="a"){entered.resolve();await release.promise;}return read(ids);};
  const pending=f.controller.select(["a"]);await entered.promise;
  f.controller.select(["b"]);release.resolve();await pending;
  const opens=f.events.filter(event=>event[0]==="open");
  assert.equal(opens.length,1);
  assert.ok(opens[0][1].url.includes("token=b"));
});
test("deletion and scene closure hide the bar",async()=>{
  const f=fixture();await f.controller.select(["a"]);
  delete f.tokens.a;await f.controller.refresh();
  assert.equal(f.events.at(-1)[0],"close");
  await f.controller.select(["b"]);f.setReady(false);await f.controller.refresh();
  assert.equal(f.events.at(-1)[0],"close");
});
test("metadata-only changes do not reopen a fixed bar",async()=>{
  const f=fixture();await f.controller.select(["a"]);
  f.tokens.a.metadata[KEY]={capacity:6,rounds:[false]};
  await f.controller.refresh();
  assert.equal(f.events.filter(event=>event[0]==="open").length,1);
  f.tokens.a.metadata[KEY].layout="revolver";await f.controller.refresh();
  assert.equal(f.events.at(-1)[1].height,148);
});
test("position fits short screens and accounts for party size",()=>{
  assert.equal(panelPosition(1366,600,1,108).top,190);
  assert.equal(panelPosition(1366,600,3,108).top,286);
  assert.ok(panelPosition(400,260,6,148).top+148<=260);
});
test("all revolver chambers fit within their drum without overlaps",()=>{
  for(let capacity=1;capacity<=60;capacity++){
    const positions=Array.from({length:capacity},(_,i)=>chamberPosition(i,capacity));
    for(let i=0;i<positions.length;i++){
      const p=positions[i];
      assert.ok(p.x-p.size/2>=0 && p.y-p.size/2>=0);
      assert.ok(p.x+p.size/2<=96 && p.y+p.size/2<=96);
      for(let j=0;j<i;j++){
        const q=positions[j];
        if(p.group===q.group)assert.ok(Math.hypot(p.x-q.x,p.y-q.y) >= (p.size+q.size)/2);
      }
    }
  }
});
