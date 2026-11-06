import {DEATH_KEY} from "./death-state.js?v=1.16.1";
import OBR from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";
import {SHEET_KEY,parseSheetLink,fetchMetrics} from "./sheet-source.js?v=1.16.1";
import {SHEET_SETTINGS_ID} from "./sheet-controller.js?v=1.16.1";
const $=id=>document.getElementById(id),tokenId=new URLSearchParams(location.search).get("token");
let busy=false,disposed=false,request=null;
function controls(disabled){$("save").disabled=disabled;$("unlink").disabled=disabled;$("link").disabled=disabled;}
function shutdown(){disposed=true;request?.abort();}
globalThis.addEventListener("pagehide",shutdown,{once:true});
$("close").onclick=()=>{shutdown();void OBR.popover.close(SHEET_SETTINGS_ID);};
async function save(unlink=false){
 if(busy||disposed)return;
 if(!unlink&&!$("form").reportValidity())return;
 busy=true;controls(true);let timeout;
 try{
  let config=null;
  if(!unlink){
   config=parseSheetLink($("link").value);$("status").textContent="Verificando acesso e os valores da ficha…";
   request=new AbortController();timeout=setTimeout(()=>request.abort(),12000);
   await fetchMetrics(config,{signal:request.signal});
  }
  if(disposed)return;
  let found=false;
  await OBR.scene.items.updateItems([tokenId],items=>{
   for(const token of items){
    if(token.type!=="IMAGE"||token.layer!=="CHARACTER")continue;
    found=true;
    if(unlink){delete token.metadata[SHEET_KEY];delete token.metadata[DEATH_KEY];}else {
     if(token.metadata[SHEET_KEY]?.url!==config.url)delete token.metadata[DEATH_KEY];
     token.metadata[SHEET_KEY]={url:config.url};
    }
   }
  });
  if(!found)throw Error("O personagem não está mais nesta cena.");
  if(disposed)return;
  $("link").value=config?.url||"";
  $("status").textContent=unlink?"Ficha desvinculada.":"Ficha vinculada. As barras aparecem ao lado do personagem.";
 }catch(error){
  if(!disposed)$("status").textContent=error.name==="AbortError"?"A consulta demorou demais. Confira a conexão e tente novamente.":error.message||"Não foi possível salvar. Confira a permissão de edição do token.";
 }finally{
  clearTimeout(timeout);busy=false;if(!disposed)controls(false);
 }
}
$("form").onsubmit=event=>{event.preventDefault();void save();};
$("unlink").onclick=()=>{void save(true);};
controls(true);
OBR.onReady(async()=>{
 try{
  const [token]=await OBR.scene.items.getItems([tokenId]);
  if(!token||token.type!=="IMAGE"||token.layer!=="CHARACTER")throw Error("Selecione um token de personagem.");
  $("name").textContent=token.name||"Personagem";
  $("link").value=token.metadata?.[SHEET_KEY]?.url||"";
  $("status").textContent="Os intervalos mesclados são lidos pela célula superior esquerda.";
  controls(false);
  OBR.scene.onReadyChange(ready=>{if(!ready){shutdown();void OBR.popover.close(SHEET_SETTINGS_ID);}});
  OBR.scene.items.onChange(items=>{if(!items.some(item=>item.id===tokenId)){shutdown();void OBR.popover.close(SHEET_SETTINGS_ID);}});
 }catch(error){$("status").textContent=error.message;}
});
