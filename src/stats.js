import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {SHEET_KEY,parseSheetLink,METRICS} from "./sheet-source.js?v=1.15.0";
import {createSheetPoller} from "./sheet-poller.js?v=1.15.0";
import {STATS_ID} from "./sheet-controller.js?v=1.15.0";
const $=id=>document.getElementById(id),tokenId=new URLSearchParams(location.search).get("token");
let active="",revision=0,disposed=false;
const format=new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2});
function message(text,stale=false){$("status").textContent=text;$("status").title=text;document.body.classList.toggle("stale",stale);}
const poller=createSheetPoller({
 onData:values=>{
  if(disposed)return;
  for(const value of values){
   $(value.id+"-value").textContent=format.format(value.current)+" / "+format.format(value.maximum);
   $(value.id+"-fill").style.width=value.percent+"%";
   const bar=$(value.id+"-bar");
   bar.setAttribute("aria-valuemin","0");bar.setAttribute("aria-valuemax",String(value.maximum));
   bar.setAttribute("aria-valuenow",String(Math.min(value.maximum,Math.max(0,value.current))));
   bar.setAttribute("aria-valuetext",value.current+" de "+value.maximum);
  }
  message("Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
 },
 onError:error=>{if(!disposed)message(error.message,true);}
});
function stop(){disposed=true;poller.stop();}
function render(token){
 if(disposed)return;
 if(!token||token.type!=="IMAGE"||token.layer!=="CHARACTER"){
  poller.stop();void OBR.popover.close(STATS_ID);return;
 }
 let config;
 try{config=parseSheetLink(token.metadata?.[SHEET_KEY]?.url);}catch{poller.stop();void OBR.popover.close(STATS_ID);return;}
 if(config.url===active)return;
 active=config.url;
 for(const metric of METRICS){$(metric.id+"-value").textContent="— / —";$(metric.id+"-fill").style.width="0%";}
 message("Lendo ficha…");poller.start(config);
}
globalThis.addEventListener("pagehide",stop,{once:true});
OBR.onReady(async()=>{
 OBR.scene.items.onChange(items=>{revision++;render(items.find(item=>item.id===tokenId));});
 OBR.scene.onReadyChange(ready=>{if(!ready){stop();void OBR.popover.close(STATS_ID);}});
 const version=++revision;
 try{const [token]=await OBR.scene.items.getItems([tokenId]);if(version===revision)render(token);}
 catch{message("Não foi possível carregar o token.",true);}
});
