import {fetchMetrics} from "./sheet-source.js?v=1.15.0";
export function createSheetPoller({onData,onError,read=fetchMetrics,delay=20000,timers=globalThis}) {
 let revision=0,abort=null,timer=null;
 function stop(){revision++;if(timer!==null)timers.clearTimeout(timer);timer=null;abort?.abort();abort=null;}
 function start(config){
  stop();const version=revision;
  async function poll(){
   const request=new AbortController();abort=request;
   const timeout=timers.setTimeout(()=>request.abort(),12000);
   try{
    const values=await read(config,{signal:request.signal});
    if(version===revision)onData(values);
   }catch(error){
    if(version===revision)onError(error.name==="AbortError"?Error("Tempo de leitura esgotado. Tentando novamente…"):error);
   }finally{
    timers.clearTimeout(timeout);
    if(version===revision)timer=timers.setTimeout(poll,delay);
   }
  }
  void poll();
 }
 return {start,stop};
}
