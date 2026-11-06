import test from "node:test";
import assert from "node:assert/strict";
import {SHEET_KEY,METRICS,parseSheetLink,requestUrl,parseVisualization,parsePublished,parseCsv,numberValue,metricValues,fetchMetrics} from "../src/sheet-source.js";
import {createSheetPoller} from "../src/sheet-poller.js";
import {createSheetController,statsPosition,STATS_ID,registerSheetMenu} from "../src/sheet-controller.js";
const link="https://docs.google.com/spreadsheets/d/sample-id/edit#gid=42";
const cells={F9:40,J9:60,M9:18,Q9:25,T9:6,X9:12};
function visualization(values=cells){
 const c=Array.from({length:19},()=>null);
 for(const [cell,value] of Object.entries(values))c[cell.charCodeAt(0)-70]={v:value};
 return "/*O_o*/\ngoogle.visualization.Query.setResponse("+JSON.stringify({status:"ok",table:{rows:[{c}]}})+");";
}
function published(){
 const rows=Array.from({length:9},()=>Array(25).fill(""));
 for(const [cell,value] of Object.entries(cells))rows[8][cell.charCodeAt(0)-65]=String(value);
 rows[0][0]='Nome, "Personagem"\nFicha';
 return rows.map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(",")).join("\r\n");
}
test("accepts Google document and published URLs, preserving gid and dropping unrelated parameters",()=>{
 assert.equal(parseSheetLink(link).gid,"42");
 assert.equal(parseSheetLink(link.replace("/d/","/u/1/d/")).id,"sample-id");
 const c=parseSheetLink("https://docs.google.com/spreadsheets/d/e/public-id/pubhtml?gid=7&widget=true");
 assert.equal(c.published,true);assert.equal(c.gid,"7");assert.ok(!c.url.includes("widget"));
 assert.equal(parseSheetLink("https://docs.google.com/spreadsheets/d/sample-id/edit?gid=5#gid=8").gid,"5");
 assert.equal(parseSheetLink("https://docs.google.com/spreadsheets/d/sample-id/edit").gid,"0");
});
test("rejects non-Google hosts, credential-bearing and non-HTTPS links",()=>{
 for(const bad of ["https://evil.test/x","https://docs.google.com.evil.test/spreadsheets/d/id/edit","http://docs.google.com/spreadsheets/d/id/edit","https://user@docs.google.com/spreadsheets/d/id/edit","https://docs.google.com/document/d/id","javascript:alert(1)",link.replace("gid=42","gid=abc")])
 assert.throws(()=>parseSheetLink(bad));
 assert.throws(()=>requestUrl({url:"https://evil.test/"}));
});
test("reads precisely all six top-left cells of the merged ranges",()=>{
 const values=parseVisualization(visualization());
 assert.deepEqual(values.map(v=>[v.label,v.current,v.maximum]),[["Vida",18,25],["Sanidade",40,60],["PE",6,12]]);
 const url=new URL(requestUrl(parseSheetLink(link)));
 assert.equal(url.searchParams.get("range"),"F9:X9");assert.equal(url.searchParams.get("headers"),"0");
 assert.equal(url.searchParams.get("gid"),"42");
});
test("published CSV respects row 9, blanks, quotes, CRLF and multiline cells",()=>{
 assert.deepEqual(parsePublished(published()),parseVisualization(visualization()));
 assert.deepEqual(parseCsv('\uFEFF"a,b","c""d"\r\n"e\nf",0'),[["a,b",'c"d'],["e\nf","0"]]);
 assert.throws(()=>parseCsv('"unfinished'));
});
test("zero/negative current and over-maximum points retain real values with safe bar widths",()=>{
 const values=metricValues({...cells,M9:-5,Q9:0,F9:90,J9:60});
 assert.equal(values[0].current,-5);assert.equal(values[0].percent,0);assert.equal(values[1].percent,100);
 assert.equal(numberValue(" 12,5 "),12.5);assert.equal(numberValue("1.234,50"),1234.5);
 assert.equal(numberValue("1,234.50"),1234.5);assert.equal(numberValue(""),null);
 assert.throws(()=>metricValues({...cells,X9:-1}));assert.throws(()=>metricValues({...cells,F9:""}));
});
test("login pages, API errors and missing cells report failure rather than zero",()=>{
 assert.throws(()=>parseVisualization("<html>login</html>"));
 assert.throws(()=>parseVisualization('google.visualization.Query.setResponse({"status":"error"});'));
 assert.throws(()=>parseVisualization(visualization({...cells,T9:null})));
 assert.throws(()=>parsePublished("1,2,3"));
});
test("fetch is credential-free, constrained to Google, and reports network errors",async()=>{
 let requested;
 const values=await fetchMetrics(parseSheetLink(link),{fetchImpl:async(url,options)=>{requested={url,options};return {ok:true,headers:{get:()=>null},text:async()=>visualization()};}});
 assert.equal(values.length,3);assert.equal(requested.options.credentials,"omit");assert.equal(requested.options.referrerPolicy,"no-referrer");
 await assert.rejects(fetchMetrics({url:link},{fetchImpl:async()=>({ok:false,status:403})}));
 await assert.rejects(fetchMetrics({url:link},{fetchImpl:async()=>{throw Error("CORS");}}));
 await assert.rejects(fetchMetrics({url:link},{fetchImpl:async()=>({ok:true,headers:{get:()=>"3000000"},text:async()=>""})}));
});
function timers(){
 let id=0;const tasks=new Map();
 return {tasks,setTimeout:(fn,ms)=>{tasks.set(++id,{fn,ms});return id;},clearTimeout:id=>tasks.delete(id)};
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
test("polling repeats at 20 seconds and stops on close",async()=>{
 const clock=timers(),data=[],errors=[];let count=0;
 const poller=createSheetPoller({timers:clock,onData:x=>data.push(x),onError:e=>errors.push(e),read:async()=>{count++;return count;}});
 poller.start({url:link});await flush();assert.deepEqual(data,[1]);
 const [id,task]=[...clock.tasks].find(([,task])=>task.ms===20000);clock.tasks.delete(id);task.fn();await flush();
 assert.deepEqual(data,[1,2]);assert.equal(errors.length,0);poller.stop();assert.equal(clock.tasks.size,0);
});
test("slow responses from the previous token never overwrite the new token",async()=>{
 const clock=timers(),data=[],pending=[];
 const poller=createSheetPoller({timers:clock,onData:v=>data.push(v),onError:()=>{},read:(config,{signal})=>new Promise(resolve=>pending.push({config,signal,resolve}))});
 poller.start({url:"old"});poller.start({url:"new"});assert.equal(pending[0].signal.aborted,true);
 pending[1].resolve("NEW");await flush();pending[0].resolve("OLD");await flush();
 assert.deepEqual(data,["NEW"]);poller.stop();
});
test("polling reports failures and schedules a retry without cached fake values",async()=>{
 const clock=timers(),errors=[],data=[];
 const poller=createSheetPoller({timers:clock,onData:v=>data.push(v),onError:e=>errors.push(e),read:async()=>{throw Error("private");}});
 poller.start({url:link});await flush();
 assert.equal(data.length,0);assert.equal(errors[0].message,"private");
 assert.ok([...clock.tasks.values()].some(t=>t.ms===20000));poller.stop();
});
function fixture(){
 const events=[],tokens={a:{id:"a",type:"IMAGE",layer:"CHARACTER",metadata:{[SHEET_KEY]:{url:link}}},b:{id:"b",type:"IMAGE",layer:"CHARACTER",metadata:{}}};
 const api={scene:{isReady:async()=>true,items:{getItems:async ids=>ids.map(id=>tokens[id]).filter(Boolean)}},viewport:{getWidth:async()=>1366,getHeight:async()=>700},popover:{open:async p=>events.push(["open",p]),close:async()=>events.push(["close"])},reportError:e=>{throw e;}};
 return {events,tokens,api,controller:createSheetController(api)};
}
test("bars open to the right of portrait only for a linked character; unlink and deselect close",async()=>{
 const f=fixture();await f.controller.select(["a"]);assert.equal(f.events.at(-1)[1].id,STATS_ID);
 assert.deepEqual(f.events.at(-1)[1].anchorPosition,{left:244,top:584});
 for(const ids of [[],["b"],["a","b"]]){await f.controller.select(ids);assert.equal(f.events.at(-1)[0],"close");}
 await f.controller.select(["a"]);delete f.tokens.a.metadata[SHEET_KEY];await f.controller.refresh();assert.equal(f.events.at(-1)[0],"close");
});
test("deselect during opening closes a late bars window",async()=>{
 const f=fixture();let release,entered;
 const started=new Promise(r=>{entered=r;}),pause=new Promise(r=>{release=r;});
 f.api.popover.open=async p=>{f.events.push(["open",p]);entered();await pause;};
 const pending=f.controller.select(["a"]);await started;f.controller.select([]);release();await pending;
 assert.equal(f.events.at(-1)[0],"close");
});
test("same link does not reopen on ammo changes; new sheet link refreshes window",async()=>{
 const f=fixture();await f.controller.select(["a"]);await f.controller.refresh();
 assert.equal(f.events.filter(e=>e[0]==="open").length,1);
 f.tokens.a.metadata[SHEET_KEY].url=link.replace("42","8");await f.controller.refresh();
 assert.equal(f.events.filter(e=>e[0]==="open").length,2);
});
test("narrow viewports stack status above portrait rather than overlap",()=>{
 const p=statsPosition(390,700);assert.equal(p.left,16);assert.equal(p.top+p.height+8,700-76-16);
 assert.ok(p.left+p.width<=390);
});
test("link option uses the native context menu restricted to one character",async()=>{
 let menu;await registerSheetMenu({contextMenu:{create:async value=>{menu=value;}}});
 assert.equal(menu.icons[0].label,"Vincular ficha");assert.equal(menu.icons[0].filter.max,1);
 assert.ok(menu.icons[0].filter.every.some(f=>f.key==="layer"&&f.value==="CHARACTER"));
});
