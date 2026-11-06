import test from "node:test";
import assert from "node:assert/strict";
import {roundPlacement,magazineWidth} from "../src/layout.js";
import {WEAPONS} from "../src/state.js";
test("all eight weapon layouts fit, remain accessible by scrolling and never overlap",()=>{
 for(const [weapon,definition] of Object.entries(WEAPONS)){
  const positions=Array.from({length:definition.capacity},(_,i)=>roundPlacement(weapon,i));
  positions.forEach((p,i)=>{
   if(weapon==="revolver") {
    assert.ok(p.x-p.size/2>=0 && p.y-p.size/2>=0 && p.x+p.size/2<=96 && p.y+p.size/2<=96);
    positions.slice(0,i).forEach(q=>assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=(p.size+q.size)/2));
   } else {
    assert.ok(p.x>=0 && p.y>=0 && p.x+p.width<=magazineWidth(weapon,definition.capacity) && p.y+p.height<=46);
    positions.slice(0,i).forEach(q=>assert.ok(p.x>=q.x+q.width || q.x>=p.x+p.width || p.y>=q.y+q.height || q.y>=p.y+p.height));
   }
  });
 }
});
