import OBR,{buildImage} from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {HK} from "./handout-model.js?v=1.13.0";
export async function createHandout(){
 if(await OBR.player.getRole()!=="GM")throw Error("Somente o mestre pode criar handouts.");
 if(!await OBR.scene.isReady())throw Error("Abra uma cena primeiro.");
 const [w,h,dpi]=await Promise.all([OBR.viewport.getWidth(),OBR.viewport.getHeight(),OBR.scene.grid.getDpi()]);
 const center=await OBR.viewport.inverseTransformPoint({x:w/2,y:h/2});
 const state={title:"Teclado de porta",owner:OBR.player.id,input:"",solved:false,status:"locked",attempts:0,onTop:true};
 const item=buildImage({url:new URL("/handout-locked.svg",location.origin).href,mime:"image/svg+xml",width:300,height:450},{dpi,offset:{x:0,y:0}})
 .name(state.title).layer("POPOVER").position({x:center.x-150,y:center.y-225}).locked(true).metadata({[HK]:state}).build();
 localStorage.setItem(HK+"/"+item.id,"1998");
 await OBR.scene.items.addItems([item]);return item.id;
}
