import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {HK,CHANNEL,SETTINGS,validCode} from "./handout-model.js?v=1.12.0";
const $=id=>document.getElementById(id),id=new URLSearchParams(location.search).get("id");
let timer;
async function admin(action,extra={}){
 if(await OBR.player.getRole()!=="GM")return;
 clearTimeout(timer);$("status").textContent="Salvando…";
 await OBR.broadcast.sendMessage(CHANNEL,{type:"admin",id,action,...extra},{destination:"LOCAL"});
 timer=setTimeout(()=>{$("status").textContent="Sem confirmação. Confira a notificação e tente novamente.";},5000);
}
$("close").onclick=()=>OBR.popover.close(SETTINGS);
$("form").onsubmit=event=>{event.preventDefault();void admin("save",{title:$("title").value,code:$("code").value,onTop:$("onTop").checked});};
$("reset").onclick=()=>admin("reset");
$("solve").onclick=()=>admin("solve");
$("delete").onclick=()=>{if(confirm("Remover este teclado da cena?"))void admin("delete");};
$("move").onclick=()=>admin("move");
OBR.onReady(async()=>{
 if(await OBR.player.getRole()!=="GM"){$("status").textContent="Somente o mestre pode configurar.";return;}
 const [item]=await OBR.scene.items.getItems([id]);
 if(!item?.metadata[HK]){$("status").textContent="Este teclado não existe mais.";return;}
 $("controls").hidden=false;$("title").value=item.name;$("onTop").checked=item.metadata[HK].onTop;
 $("status").textContent=localStorage.getItem(HK+"/"+id)?"Senha já configurada neste navegador.":"Defina uma nova senha neste navegador.";
 OBR.broadcast.onMessage(CHANNEL,async event=>{
  if(event.connectionId!==await OBR.player.getConnectionId())return;
  if(event.data?.type==="saved"&&event.data.id===id){clearTimeout(timer);$("code").value="";$("status").textContent="Atualizado."; }
 });
 OBR.scene.items.onChange(items=>{if(!items.some(item=>item.id===id))void OBR.popover.close(SETTINGS);});
});
