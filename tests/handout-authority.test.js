import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as model from "../src/handout-model.js";
const source=readFileSync(new URL("../src/handouts.js",import.meta.url),"utf8");
async function fixture(){
 let role="GM",callback;
 const item={id:"door",name:"Door",image:{url:""},metadata:{[model.HK]:{owner:"gm",input:"",solved:false,status:"locked",attempts:0}}};
 const storage=new Map([[model.HK+"/door","001"]]),writes=[],errors=[];
 const api={
  player:{id:"gm",getConnectionId:async()=>"local",getRole:async()=>role},
  scene:{isReady:async()=>true,onReadyChange:()=>{},items:{
   getItems:async()=>[item],updateItems:async(ids,fn)=>{fn([item]);writes.push(item);}}},
  viewport:{getWidth:async()=>1200},
  popover:{open:async()=>{},close:async()=>{}},
  broadcast:{onMessage:(channel,fn)=>{callback=fn;},sendMessage:async()=>{}},
  tool:{create:async()=>{},createMode:async()=>{}},
  contextMenu:{create:async()=>{}},notification:{show:async message=>errors.push(message)}
 };
 const localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
 const start=new Function("OBR","buildImage","window","localStorage",...Object.keys(model),source.replace(/^import .*;\n/gm,"").replace("export async function","async function")+";return startHandouts;")(
 api,()=>{throw Error("unexpected create");},{addEventListener(){}},localStorage,...Object.values(model));
 await start();
 async function send(data,connectionId="remote"){callback({data,connectionId});for(let i=0;i<100;i++)await Promise.resolve();}
 return {send,item,writes,storage,setRole:value=>{role=value;}};
}
test("remote player admin messages cannot change settings or passwords",async()=>{
 const f=await fixture();await f.send({type:"admin",id:"door",action:"save",title:"Hacked",code:"9999"});
 assert.equal(f.writes.length,0);assert.equal(f.storage.get(model.HK+"/door"),"001");
});
test("even local admin requires GM role",async()=>{
 const f=await fixture();f.setRole("PLAYER");await f.send({type:"admin",id:"door",action:"solve"},"local");
 assert.equal(f.writes.length,0);assert.equal(f.item.metadata[model.HK].solved,false);
});
test("GM config and reset work, but validation key messages never set secrets",async()=>{
 const f=await fixture();await f.send({type:"admin",id:"door",action:"save",title:"Vault",code:"0000",onTop:true},"local");
 assert.equal(f.item.name,"Vault");assert.equal(f.storage.get(model.HK+"/door"),"0000");
 assert.equal(JSON.stringify(f.item).includes("0000"),false);
 await f.send({type:"admin",id:"door",action:"solve"},"local");assert.equal(f.item.metadata[model.HK].solved,true);
 await f.send({type:"admin",id:"door",action:"reset"},"local");assert.equal(f.item.metadata[model.HK].solved,false);
});
