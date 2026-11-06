import {createHandout} from "./handout-create.js?v=1.13.0";
import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {HK,CHANNEL,TOOL,MODE,TRAY} from "./handout-model.js?v=1.13.0";
const $=id=>document.getElementById(id);
let folded=false;
const send=data=>OBR.broadcast.sendMessage(CHANNEL,data,{destination:"LOCAL"});
async function render(){
 const gm=await OBR.player.getRole()==="GM",ready=await OBR.scene.isReady();
 $("catalog-hint").textContent=gm?"Adicionar à cena":"Ativar interação no mapa";
 $("keypad").disabled=!ready;
 $("list").replaceChildren();
 if(!ready){$("status").textContent="Abra uma cena.";return;}
 $("status").textContent="";
 const items=await OBR.scene.items.getItems(item=>!!item.metadata[HK]);
 if(!items.length)$("status").textContent=gm?"Adicione seu primeiro handout acima.":"Aguardando o mestre colocar um teclado.";
 for(const item of items){
  const row=document.createElement("div");row.className="row";
  const use=document.createElement("button");use.className="use";use.textContent=(item.metadata[HK].solved?"◉ ":"◌ ")+item.name;use.title="Interagir no mapa";
  use.onclick=async()=>{await OBR.tool.activateMode(TOOL,MODE);const bounds=await OBR.scene.items.getItemBounds([item.id]);await OBR.viewport.animateToBounds(bounds);};
  row.append(use);
  if(gm){const config=document.createElement("button");config.textContent="⚙";config.title="Configurar";config.onclick=()=>send({type:"configure",id:item.id});row.append(config);}
  $("list").append(row);
 }
}
$("fold").onclick=async()=>{folded=!folded;$("body").hidden=folded;$("fold").textContent=folded?"+":"−";await OBR.action.setHeight(folded?44:310);};
$("keypad").onclick=async()=>{
 try{const gm=await OBR.player.getRole()==="GM";$("keypad").disabled=true;
 if(gm){const id=await createHandout();$("status").textContent="Teclado colocado na cena. Senha inicial: 1998.";await send({type:"configure",id});}else await OBR.tool.activateMode(TOOL,MODE);
 }catch(error){$("status").textContent=error.message;}finally{$("keypad").disabled=false;}
};
OBR.onReady(()=>{OBR.scene.items.onChange(()=>void render());OBR.scene.onReadyChange(()=>void render());OBR.player.onChange(()=>void render());void render();});
