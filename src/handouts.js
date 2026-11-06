import OBR,{buildImage} from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {HK,CHANNEL,TOOL,MODE,TRAY,SETTINGS,validCode,press,hitKey,imageUrl} from "./handout-model.js?v=1.12.0";
export async function startHandouts(){
 let sequence=Promise.resolve(),sceneRevision=0;
 const connection=await OBR.player.getConnectionId();
 const rates=new Map();
 const report=error=>{console.error("Handouts:",error);void OBR.notification.show(error.message||"Não foi possível atualizar o handout.","ERROR");};
 const send=data=>OBR.broadcast.sendMessage(CHANNEL,data,{destination:"ALL"});
 async function openTray(){
  const width=await OBR.viewport.getWidth();
  await OBR.popover.open({id:TRAY,url:"/handouts.html?v=1.12.0",width:240,height:250,anchorReference:"POSITION",
   anchorPosition:{left:Math.max(0,width-310),top:16},transformOrigin:{horizontal:"LEFT",vertical:"TOP"},disableClickAway:true,marginThreshold:0});
 }
 async function configure(id){
  if(await OBR.player.getRole()!=="GM")return;
  const width=await OBR.viewport.getWidth();
  await OBR.popover.open({id:SETTINGS,url:"/handout-settings.html?v=1.12.0&id="+encodeURIComponent(id),width:300,height:420,
   anchorReference:"POSITION",anchorPosition:{left:Math.max(0,width-370),top:90},transformOrigin:{horizontal:"LEFT",vertical:"TOP"},disableClickAway:true});
 }
 async function update(id,fn){
  await OBR.scene.items.updateItems([id],items=>{for(const item of items){
   const state=item.metadata[HK];if(!state)continue;
   const next=fn(state);item.metadata[HK]=next;item.image.url=imageUrl(next);
   item.name=next.title||"Teclado de porta";item.layer=next.onTop?"POPOVER":"PROP";item.zIndex=next.onTop?Date.now():0;
  }});
 }
 async function handle(event){
  const d=event.data;
  if(!d||typeof d!=="object"||!await OBR.scene.isReady())return;
  const gm=await OBR.player.getRole()==="GM",local=event.connectionId===connection;
  if(d.type==="interact"&&local){await OBR.tool.activateMode(TOOL,MODE);return;}
  if(d.type==="configure"&&local&&gm){await configure(d.id);return;}
  if(d.type==="create"&&local&&gm){
   const creatingScene=sceneRevision;
   const [w,h,dpi]=await Promise.all([OBR.viewport.getWidth(),OBR.viewport.getHeight(),OBR.scene.grid.getDpi()]);
   const center=await OBR.viewport.inverseTransformPoint({x:w/2,y:h/2});
   const state={title:"Teclado de porta",owner:OBR.player.id,input:"",solved:false,status:"locked",attempts:0,onTop:true};
   const item=buildImage({url:imageUrl(state),mime:"image/svg+xml",width:300,height:450},{dpi,offset:{x:0,y:0}})
    .name(state.title).layer("POPOVER").position({x:center.x-150,y:center.y-225}).locked(true).metadata({[HK]:state}).build();
   if(creatingScene!==sceneRevision)return;
   localStorage.setItem(HK+"/"+item.id,"1998");
   await OBR.scene.items.addItems([item]);await OBR.tool.activateMode(TOOL,MODE);await configure(item.id);return;
  }
  if(typeof d.id!=="string")return;
  const [item]=await OBR.scene.items.getItems([d.id]);const state=item?.metadata?.[HK];
  if(!state)return;
  if(d.type==="admin"&&local&&gm){
   if(d.action==="save"){
    if(d.code && !validCode(d.code))throw Error("Use de 1 a 8 dígitos na senha.");
    if(!d.code && !localStorage.getItem(HK+"/"+d.id))throw Error("Defina uma senha neste navegador.");
    if(d.code)localStorage.setItem(HK+"/"+d.id,d.code);
    await update(d.id,s=>({...s,title:String(d.title||"Teclado de porta").slice(0,60),owner:OBR.player.id,onTop:!!d.onTop,input:"",solved:false,status:"locked"}));
   } else if(d.action==="reset")await update(d.id,s=>({...s,input:"",solved:false,status:"locked",attempts:0}));
   else if(d.action==="solve")await update(d.id,s=>({...s,input:"",solved:true,status:"open"}));
   else if(d.action==="move")await OBR.scene.items.updateItems([d.id],items=>{for(const item of items)item.locked=!item.locked;});
   else if(d.action==="delete")await OBR.scene.items.deleteItems([d.id]);
   await OBR.broadcast.sendMessage(CHANNEL,{type:"saved",id:d.id},{destination:"LOCAL"});return;
  }
  if(d.type==="key"&&gm&&state.owner===OBR.player.id){
   const code=localStorage.getItem(HK+"/"+d.id);
   if(!validCode(code))return;
   const key=event.connectionId+":"+d.id,now=Date.now();
   if(now-(rates.get(key)||0)<65)return;
   if(rates.size>500)rates.clear();rates.set(key,now);
   await update(d.id,s=>press(s,d.key,code));
  }
 }
 OBR.broadcast.onMessage(CHANNEL,event=>{const revision=sceneRevision;sequence=sequence.then(()=>revision===sceneRevision?handle(event):null).catch(report);});
 await OBR.tool.create({id:TOOL,icons:[{icon:"/handout-icon.svg",label:"Interagir com handouts"}],defaultMode:MODE});
 await OBR.tool.createMode({id:MODE,icons:[{icon:"/handout-icon.svg",label:"Teclado de porta"}],preventDrag:{},
  onToolClick:async(_,event)=>{
   const item=event.target;
   if(item?.metadata?.[HK]){const key=hitKey(item,event.pointerPosition,await OBR.scene.grid.getDpi());if(key)await send({type:"key",id:item.id,key});}
   return false;
  }});
 await OBR.contextMenu.create({id:HK+"/config",icons:[{icon:"/handout-icon.svg",label:"Configurar teclado",filter:{roles:["GM"],every:[{key:["metadata",HK],operator:"!=",value:undefined}]}}],
  onClick:context=>{void configure(context.items[0]?.id).catch(report);}});
 OBR.scene.onReadyChange(ready=>{sceneRevision++;void OBR.popover.close(SETTINGS);if(ready)void openTray().catch(report);});
 window.addEventListener("resize",()=>{void openTray().catch(report);});
 await openTray();
}
