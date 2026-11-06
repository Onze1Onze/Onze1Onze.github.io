import {DEATH_KEY,normalizeCondition} from "./death-state.js?v=1.16.0";
export const VISUAL_KEY="com.onze1onze.arsenal/condition-visual";
export const GRAYSCALE_SKSL=`
uniform shader scene;
uniform mat3 modelView;
half4 main(float2 coord) {
 vec2 uv=(vec3(coord,1)*modelView).xy;
 half4 c=scene.eval(uv);
 half l=dot(c.rgb,half3(0.2126,0.7152,0.0722));
 return half4(l,l,l,c.a);
}
`;
export function skullGeometry(bounds,status,dpi=150){
 const size=(status==="dead"?48:30)*Math.max(.5,dpi/150);
 return {size,x:bounds.center.x,y:bounds.min.y-size*.65-5};
}
export function createConditionVisuals(api,{buildBillboard,buildEffect},origin){
 let revision=0,handled=0,pending=null;
 async function drain(){
  while(handled!==revision){
   const version=revision;handled=version;
   try{
    if(!await api.scene.isReady())return;
    const tokens=await api.scene.items.getItems(i=>i.type==="IMAGE"&&i.layer==="CHARACTER"&&normalizeCondition(i.metadata[DEATH_KEY]).status!=="alive");
    const local=await api.scene.local.getItems(i=>!!i.metadata[VISUAL_KEY]);
    const desired=[];
    const dpi=await api.scene.grid.getDpi();
    for(const token of tokens){
     const status=normalizeCondition(token.metadata[DEATH_KEY]).status;
     const bounds=await api.scene.items.getItemBounds([token.id]);
     if(version!==revision)break;
     const geometry=skullGeometry(bounds,status,dpi);
     const url=new URL(status==="dead"?"/skull-dead.svg":"/skull-dying.svg",origin).href;
     const image=buildBillboard({url,mime:"image/svg+xml",width:48,height:48},{dpi,offset:{x:24,y:24}})
      .name(status==="dead"?"Morto":"Morrendo").position({x:geometry.x,y:geometry.y})
      .scale({x:geometry.size/48,y:geometry.size/48}).rotation(0).attachedTo(token.id)
      .disableAttachmentBehavior(["ROTATION","SCALE","COPY"]).locked(true).disableHit(true).layer("ATTACHMENT")
      .visible(token.visible).metadata({[VISUAL_KEY]:{tokenId:token.id,kind:"skull",status}}).build();
     desired.push(image);
     if(status==="dead")desired.push(buildEffect().name("Condição: preto e branco").effectType("ATTACHMENT")
      .sksl(GRAYSCALE_SKSL).attachedTo(token.id).locked(true).disableHit(true).layer("POST_PROCESS")
      .visible(token.visible).metadata({[VISUAL_KEY]:{tokenId:token.id,kind:"grayscale",status}}).build());
    }
    if(version!==revision)continue;
    const key=item=>item.metadata[VISUAL_KEY].tokenId+":"+item.metadata[VISUAL_KEY].kind;
    const kept=new Set(),add=[];
    for(const item of desired){
     const existing=local.find(old=>key(old)===key(item)&&!kept.has(old.id));
     if(existing){
      kept.add(existing.id);
      const fields=["position","rotation","scale","visible","attachedTo","metadata","image","grid","sksl","layer","name","disableAttachmentBehavior"];
      const changed=fields.some(field=>JSON.stringify(existing[field])!==JSON.stringify(item[field]));
      if(changed)await api.scene.local.updateItems([existing.id],drafts=>{for(const draft of drafts)for(const field of fields)if(item[field]!==undefined)draft[field]=item[field];});
     }else add.push(item);
    }
    if(add.length)await api.scene.local.addItems(add);
    const remove=local.filter(item=>!kept.has(item.id)).map(item=>item.id);
    if(remove.length)await api.scene.local.deleteItems(remove);
   }catch(error){api.reportError?.(error);}
  }
 }
 function refresh(){revision++;if(!pending)pending=drain().finally(()=>{pending=null;});return pending;}
 return {refresh};
}
