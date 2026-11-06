import {SHEET_KEY,parseSheetLink,fetchMetrics} from "./sheet-source.js?v=1.16.0";
import {syncHealth} from "./death-state.js?v=1.16.0";
export async function isHealthAuthority(api){
 const role=await api.player.getRole(),id=await api.player.getId();
 if(role!=="GM")return false;
 const others=await api.party.getPlayers();
 const masters=[id,...others.filter(p=>p.role==="GM").map(p=>p.id)].sort();
 return masters[0]===id;
}
export function createHealthMonitor(api,{read=fetchMetrics,timers=globalThis,delay=20000}={}){
 let stopped=false,running=false,again=false,timer=null,generation=0;
 const requests=new Set();
 function cancel(){generation++;for(const request of requests)request.abort();requests.clear();}
 async function cycle(){
  if(stopped)return;
  if(running){again=true;return;}
  running=true;again=false;const version=generation;
  try{
   if(!await api.scene.isReady()||!await isHealthAuthority(api))return;
   const tokens=await api.scene.items.getItems(i=>i.type==="IMAGE"&&i.layer==="CHARACTER"&&!!i.metadata[SHEET_KEY]);
   for(let offset=0;offset<tokens.length;offset+=3){
    if(stopped||version!==generation)return;
    await Promise.all(tokens.slice(offset,offset+3).map(async token=>{
     const request=new AbortController();requests.add(request);
     const timeout=timers.setTimeout(()=>request.abort(),12000);
     try{
      const config=parseSheetLink(token.metadata[SHEET_KEY].url);
      const values=await read(config,{signal:request.signal});
      const hp=values.find(v=>v.id==="hp")?.current;
      if(!stopped&&version===generation&&await api.scene.isReady()&&await isHealthAuthority(api))
       await syncHealth(api,token.id,hp,config.url);
     }catch(error){if(error.name!=="AbortError")api.reportError?.(error);}
     finally{timers.clearTimeout(timeout);requests.delete(request);}
    }));
   }
  }catch(error){api.reportError?.(error);}
  finally{
   running=false;
   if(!stopped){if(timer!==null)timers.clearTimeout(timer);timer=timers.setTimeout(cycle,again?0:delay);}
  }
 }
 function refresh({sceneChanged=false}={}){
  if(sceneChanged)cancel();
  if(timer!==null)timers.clearTimeout(timer);
  timer=null;void cycle();
 }
 function stop(){stopped=true;cancel();if(timer!==null)timers.clearTimeout(timer);}
 return {refresh,stop};
}
