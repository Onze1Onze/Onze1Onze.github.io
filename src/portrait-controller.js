export const PORTRAIT_ID = "com.onze1onze.arsenal/portrait";
export function portraitPosition(width,height) {
 return {left:Math.max(0,width-220-16),top:Math.max(0,height-76-16)};
}
export function createPortraitController(api) {
 let selection=[],revision=0,handled=0,active="",pending=null;
 async function drain(){
  while(handled!==revision){
   const version=revision,ids=selection;
   handled=version;
   try{
    const ready=await api.scene.isReady();
    const items=ready&&ids.length===1?await api.scene.items.getItems(ids):[];
    if(version!==revision)continue;
    const token=items.find(item=>item.type==="IMAGE"&&item.layer==="CHARACTER");
    if(!token){await api.popover.close(PORTRAIT_ID);active="";continue;}
    const [width,height]=await Promise.all([api.viewport.getWidth(),api.viewport.getHeight()]);
    if(version!==revision)continue;
    const position=portraitPosition(width,height),key=JSON.stringify([token.id,position]);
    if(key===active)continue;
    await api.popover.open({
     id:PORTRAIT_ID,url:"/portrait.html?v=1.10.0&token="+encodeURIComponent(token.id),
     width:220,height:76,anchorReference:"POSITION",anchorPosition:position,
     transformOrigin:{horizontal:"LEFT",vertical:"TOP"},disableClickAway:true,marginThreshold:0
    });
    active=key;
   }catch(error){active="";try{await api.popover.close(PORTRAIT_ID);}catch{}api.reportError(error);}
  }
 }
 function select(ids){
  selection=Array.isArray(ids)?[...ids]:[];revision++;
  if(!pending)pending=drain().finally(()=>{pending=null;});
  return pending;
 }
 return {select,refresh:()=>select(selection)};
}
