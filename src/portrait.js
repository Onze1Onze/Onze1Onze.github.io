import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {PORTRAIT_ID} from "./portrait-controller.js?v=1.11.1";
const tokenId=new URLSearchParams(location.search).get("token");
const name=document.getElementById("name"),image=document.getElementById("portrait"),fallback=document.getElementById("fallback");
let source="",revision=0;
function render(token){
 if(!token || token.type!=="IMAGE" || token.layer!=="CHARACTER"){
  void OBR.popover.close(PORTRAIT_ID);return;
 }
 const label=typeof token.name==="string"&&token.name.trim()?token.name:"Personagem";
 name.textContent=label;name.title=label;
 fallback.textContent=Array.from(label.trim()).slice(0,2).join("").toUpperCase();
 let url="";
 try{const parsed=new URL(token.image?.url);if(["https:","http:"].includes(parsed.protocol))url=parsed.href;}catch{}
 if(url===source)return;
 source=url;image.hidden=true;fallback.hidden=false;
 if(!url){image.removeAttribute("src");return;}
 image.onload=()=>{if(source===url){image.hidden=false;fallback.hidden=true;}};
 image.onerror=()=>{if(source===url){image.hidden=true;fallback.hidden=false;}};
 image.src=url;
}
OBR.onReady(async()=>{
 OBR.scene.items.onChange(items=>{revision++;render(items.find(item=>item.id===tokenId));});
 OBR.scene.onReadyChange(ready=>{if(!ready)void OBR.popover.close(PORTRAIT_ID);});
 const version=++revision;
 try{const [token]=await OBR.scene.items.getItems([tokenId]);if(version===revision)render(token);}
 catch{void OBR.popover.close(PORTRAIT_ID);}
});
