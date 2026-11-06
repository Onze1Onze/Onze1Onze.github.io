import {normalizeCondition,DEATH_KEY} from "./death-state.js?v=1.16.1";
import {SHEET_KEY,parseSheetLink} from "./sheet-source.js?v=1.16.1";
export const STATS_ID="com.onze1onze.arsenal/stats";
export const SHEET_SETTINGS_ID="com.onze1onze.arsenal/sheet-settings";
export function statsPosition(width,height,critical=false){
 const panelWidth=Math.min(260,Math.max(120,width-32));
 const beside=width>=244+panelWidth+16;
 const panelHeight=critical?218:174;
 return {width:panelWidth,height:panelHeight,left:beside?244:Math.max(0,Math.min(16,width-panelWidth)),top:Math.max(0,height-(beside?panelHeight+16:panelHeight+100))};
}
export function createSheetController(api){
 let ids=[],revision=0,handled=0,active="",pending=null;
 async function drain(){
  while(handled!==revision){
   const version=revision,selected=ids;handled=version;
   try{
    const ready=await api.scene.isReady();
    const items=ready&&selected.length===1?await api.scene.items.getItems(selected):[];
    if(version!==revision)continue;
    const token=items.find(i=>i.type==="IMAGE"&&i.layer==="CHARACTER");
    let config;try{if(token?.metadata?.[SHEET_KEY])config=parseSheetLink(token.metadata[SHEET_KEY].url);}catch{}
    if(!token||!config){await api.popover.close(STATS_ID);active="";continue;}
    const [w,h]=await Promise.all([api.viewport.getWidth(),api.viewport.getHeight()]);
    if(version!==revision)continue;
    const position=statsPosition(w,h,normalizeCondition(token.metadata[DEATH_KEY]).status!=="alive"),key=JSON.stringify([token.id,config.url,position]);
    if(key===active)continue;
    await api.popover.open({id:STATS_ID,url:"/stats.html?v=1.16.1&token="+encodeURIComponent(token.id),
     width:position.width,height:position.height,anchorReference:"POSITION",anchorPosition:{left:position.left,top:position.top},
     transformOrigin:{horizontal:"LEFT",vertical:"TOP"},disableClickAway:true,marginThreshold:0});
    active=key;
   }catch(error){active="";try{await api.popover.close(STATS_ID);}catch{}api.reportError(error);}
  }
 }
 function select(selection){ids=Array.isArray(selection)?[...selection]:[];revision++;if(!pending)pending=drain().finally(()=>{pending=null;});return pending;}
 return {select,refresh:()=>select(ids)};
}
export async function registerSheetMenu(OBR){
 await OBR.contextMenu.create({id:SHEET_KEY+"/link",
  icons:[{icon:"/sheet-icon.svg",label:"Vincular ficha",
   filter:{min:1,max:1,every:[{key:"type",value:"IMAGE"},{key:"layer",value:"CHARACTER"}]}}],
  onClick:async context=>{
   const token=context.items[0];if(!token)return;
   await OBR.popover.open({id:SHEET_SETTINGS_ID,url:"/sheet-settings.html?v=1.16.1&token="+encodeURIComponent(token.id),width:340,height:480});
  }});
}
