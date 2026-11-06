import {DEATH_KEY,normalizeCondition,toggleFailure,syncHealth} from "./death-state.js?v=1.16.0";
import OBR from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";
import {SHEET_KEY,parseSheetLink,METRICS} from "./sheet-source.js?v=1.16.0";
import {createSheetPoller} from "./sheet-poller.js?v=1.16.0";
import {STATS_ID} from "./sheet-controller.js?v=1.16.0";
const $=id=>document.getElementById(id),tokenId=new URLSearchParams(location.search).get("token");
let active="",revision=0,disposed=false,current=null,markBusy=false;
const markers=[...document.querySelectorAll("[data-mark]")];
function renderCondition(){
 const state=normalizeCondition(current?.metadata?.[DEATH_KEY]);
 document.body.classList.toggle("dying",state.status==="dying");document.body.classList.toggle("dead",state.status==="dead");
 $("condition-label").textContent={alive:"Em pé",dying:"Morrendo",dead:"Morto"}[state.status];
 $("death-track").hidden=state.status==="alive";
 $("death-title").textContent=state.status==="dead"?"Morto":"Morrendo";
 $("death-count").textContent=state.marks.filter(Boolean).length+" / 3";
 markers.forEach((button,index)=>{button.setAttribute("aria-pressed",String(state.marks[index]));button.disabled=markBusy;});
}
async function mark(index){
 if(markBusy||disposed||!current)return;
 markBusy=true;renderCondition();
 try{
  await OBR.scene.items.updateItems([tokenId],items=>{for(const token of items){
   if(token.type==="IMAGE"&&token.layer==="CHARACTER"&&token.metadata?.[SHEET_KEY]?.url===active)
    token.metadata[DEATH_KEY]=toggleFailure(token.metadata[DEATH_KEY],index);
  }});
  const [token]=await OBR.scene.items.getItems([tokenId]);if(!disposed)render(token);
 }catch(error){message("Sem permissão para alterar os marcadores.",false);console.error(error);}
 finally{markBusy=false;if(!disposed)renderCondition();}
}
markers.forEach((button,index)=>{button.onclick=()=>{void mark(index);};});
const format=new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2});
function message(text,stale=false){$("status").textContent=text;$("status").title=text;document.body.classList.toggle("stale",stale);}
const poller=createSheetPoller({
 onData:values=>{
  if(disposed)return;
  for(const value of values){
   if(value.kind==="detail"){$(value.id+"-value").textContent=value.value;$(value.id+"-value").title=value.label+": "+value.value;continue;}
   $(value.id+"-value").textContent=format.format(value.current)+" / "+format.format(value.maximum);
   $(value.id+"-fill").style.width=value.percent+"%";
   const bar=$(value.id+"-bar");
   bar.setAttribute("aria-valuemin","0");bar.setAttribute("aria-valuemax",String(value.maximum));
   bar.setAttribute("aria-valuenow",String(Math.min(value.maximum,Math.max(0,value.current))));
   bar.setAttribute("aria-valuetext",value.current+" de "+value.maximum);
  }
  const hp=values.find(value=>value.id==="hp")?.current;
  void updateLocalHealth(hp);
  message("Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
 },
 onError:error=>{if(!disposed)message(error.message,true);}
});
async function updateLocalHealth(hp){
 try{
  // An elected GM monitors the entire scene. Without a GM, the selected token may sync via its editor.
  const role=await OBR.player.getRole(),party=await OBR.party.getPlayers();
  if(role==="GM"||party.some(player=>player.role==="GM")||disposed)return;
  await syncHealth(OBR,tokenId,hp,active);
 }catch(error){console.error("Condição:",error);}
}
function stop(){disposed=true;poller.stop();}
function render(token){
 if(disposed)return;
 current=token;renderCondition();
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
