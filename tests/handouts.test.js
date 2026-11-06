import test from "node:test";
import assert from "node:assert/strict";
import {press,validCode,hitKey,keypadSvg,keys} from "../src/handout-model.js";
test("numeric codes preserve leading zeros and enforce 1-8 digits",()=>{
 for(const code of ["0","0001","12345678"])assert.equal(validCode(code),true);
 for(const code of ["","123456789","12x","<script>"])assert.equal(validCode(code),false);
});
test("correct code opens, incorrect code resets entry, C clears",()=>{
 let s={input:"",solved:false,status:"locked",attempts:0};
 s=press(s,"9","001");s=press(s,"OK","001");assert.equal(s.solved,false);assert.equal(s.status,"denied");
 for(const key of ["0","0","1"])s=press(s,key,"001");
 assert.equal(s.input,"001");s=press(s,"OK","001");assert.equal(s.solved,true);assert.equal(s.attempts,2);
 assert.deepEqual(press(s,"C","001"),s);
 const cleared=press({input:"123",solved:false},"C","001");assert.equal(cleared.input,"");
});
test("input caps at eight digits and invalid keys do nothing",()=>{
 let s={input:"",solved:false};for(let i=0;i<30;i++)s=press(s,"1","1998");
 assert.equal(s.input.length,8);assert.deepEqual(press(s,"evil","1998"),s);
});
test("all twelve map keys hit correctly across transforms and grid DPI",()=>{
 for(const rotation of [0,90,180,270])for(const scale of [.5,1,2])for(const ratio of [1,2]){
  const item={position:{x:100,y:-20},rotation,scale:{x:scale,y:scale},grid:{dpi:100}};
  keys.forEach((key,index)=>{
   const x=(64+index%3*80)*scale*ratio,y=(166+Math.floor(index/3)*68)*scale*ratio,a=rotation*Math.PI/180;
   const point={x:100+x*Math.cos(a)-y*Math.sin(a),y:-20+x*Math.sin(a)+y*Math.cos(a)};
   assert.equal(hitKey(item,point,100*ratio),key);
  });
 }
});
test("outside clicks ignored and public SVG does not expose password",()=>{
 const item={position:{x:0,y:0},rotation:0,scale:{x:1,y:1}};
 assert.equal(hitKey(item,{x:0,y:0}),null);
 assert.equal(hitKey(item,{x:103,y:166}),null);
 const svg=keypadSvg({input:"1998",status:"locked"});assert.ok(!svg.includes("1998"));assert.ok(svg.includes("••••"));
 assert.ok(keypadSvg({solved:true}).includes("ABERTO"));
});
