import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseDetailVisualization,fetchMetrics,DETAILS,requestDetailsUrl,parseSheetLink} from "../src/sheet-source.js";
const url="https://docs.google.com/spreadsheets/d/ficha/edit?gid=23";
function result(cells,from="F",to="R"){
 const cols=[],c=[];for(let code=from.charCodeAt(0);code<=to.charCodeAt(0);code++){const key=String.fromCharCode(code);cols.push({id:key});c.push(cells[key]??null);}
 return JSON.stringify({status:"ok",table:{cols,rows:[{c}]}});
}
const basic=result({F:{v:40},J:{v:60},M:{v:18},Q:{v:25},T:{v:6},X:{v:12}},"F","X");
const extra=result({F:{v:15},J:{v:20},L:{v:0},P:{v:9,f:"9 m"}});
function response(text){return {ok:true,headers:{get:()=>null},text:async()=>text};}
test("four scalar values read only row 16, retain formatted units and zero without a maximum",()=>{
 const values=parseDetailVisualization(extra);
 assert.deepEqual(values.map(v=>[v.id,v.value]),[["movement","9 m"],["defense","15"],["block","0"],["dodge","20"]]);
 for(const value of values){assert.equal(value.maximum,undefined);assert.equal(value.percent,undefined);}
});
test("single-row reads ignore arbitrary rows, merged interiors and column-type inference from row 9",async()=>{
 const requests=[];
 const values=await fetchMetrics({url},{fetchImpl:async link=>{
  const range=new URL(link).searchParams.get("range");requests.push(range);
  return response(range==="F9:X9"?basic:extra);
 }});
 assert.deepEqual(requests.sort(),["F16:R16","F9:X9"]);
 assert.equal(values.find(v=>v.id==="hp").current,18);
 assert.equal(values.find(v=>v.id==="defense").value,"15");
 assert.equal(new URL(requestDetailsUrl(parseSheetLink(url))).searchParams.get("gid"),"23");
});
test("absolute column IDs map to F/J/L/P even if Google omits empty columns",()=>{
 const values=parseDetailVisualization(JSON.stringify({status:"ok",table:{cols:[{id:"F"},{id:"J"},{id:"L"},{id:"P"}],rows:[{c:[{v:15},{v:20},{v:0},{v:9,f:"9 m"}]}]}}));
 assert.deepEqual(values.map(v=>v.value),["9 m","15","0","20"]);
});
test("an extra-field request failure cannot suppress valid HP or turn it into zero",async()=>{
 const values=await fetchMetrics({url},{fetchImpl:async link=>{
  if(new URL(link).searchParams.get("range")==="F16:R16")throw Error("network");
  return response(basic);
 }});
 assert.equal(values.find(v=>v.id==="hp").current,18);
 assert.ok(values.filter(v=>v.kind==="detail").every(v=>v.error));
});
test("published links still require one CSV read and keep absolute line-16 coordinates",async()=>{
 const rows=Array.from({length:18},()=>Array(25).fill(""));
 for(const [cell,value] of Object.entries({F9:40,J9:60,M9:18,Q9:25,T9:6,X9:12,F16:15,J16:20,L16:0,P16:"9 m"}))
 rows[Number(cell.slice(1))-1][cell.charCodeAt(0)-65]=String(value);
 let count=0;
 const values=await fetchMetrics({url:"https://docs.google.com/spreadsheets/d/e/published/pubhtml?gid=23"},{fetchImpl:async()=>{count++;return response(rows.map(row=>row.join(",")).join("\n"));}});
 assert.equal(count,1);assert.equal(values.find(v=>v.id==="block").value,"0");
 assert.equal(values.find(v=>v.id==="movement").value,"9 m");
});
test("UI renders unique values as plain text, without progress bars or fake maxima",async()=>{
 const nodes={};const element=()=>({textContent:"",style:{},setAttribute(){}});
 for(const id of ["hp","san","pe"])for(const suffix of ["value","fill","bar"])nodes[id+"-"+suffix]=element();
 for(const id of ["condition-label","death-track","death-title","death-count","movement-value","defense-value","block-value","dodge-value","status"])nodes[id]=element();
 let handlers;
 const source=readFileSync(new URL("../src/stats.js",import.meta.url),"utf8").replace(/^import .*;\n/gm,"");
 new Function("OBR","document","globalThis","location","SHEET_KEY","parseSheetLink","METRICS","DETAILS","createSheetPoller","STATS_ID","DEATH_KEY","normalizeCondition","toggleFailure","syncHealth",source)(
 {onReady(){},player:{getRole:async()=>"GM"},party:{getPlayers:async()=>[]}},
 {getElementById:id=>nodes[id]??null,querySelectorAll:()=>[],body:{classList:{toggle(){}}}},
 {addEventListener(){}},{search:"?token=a"},"key",()=>{},[{id:"hp"},{id:"san"},{id:"pe"}],DETAILS,
 cb=>{handlers=cb;return {start(){},stop(){}};},"stats","condition",()=>({status:"alive",marks:[false,false,false]}),()=>{},()=>{});
 handlers.onData([{id:"hp",current:18,maximum:25,percent:72},{id:"san",current:40,maximum:60,percent:66.66},{id:"pe",current:6,maximum:12,percent:50},...parseDetailVisualization(extra)]);
 assert.equal(nodes["movement-value"].textContent,"9 m");assert.equal(nodes["defense-value"].textContent,"15");assert.equal(nodes["block-value"].textContent,"0");assert.equal(nodes["dodge-value"].textContent,"20");
 assert.equal(nodes["hp-value"].textContent,"18 / 25");
 handlers.onData([{id:"hp",current:17,maximum:25,percent:68},...DETAILS.map(d=>({...d,kind:"detail",value:"—",error:"Sem acesso aos valores únicos."}))]);
 assert.equal(nodes["defense-value"].textContent,"15");assert.equal(nodes["hp-value"].textContent,"17 / 25");assert.ok(nodes.status.textContent.includes("valores únicos"));
});
