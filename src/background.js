import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
const id = "com.onze1onze.arsenal/panel";
let target = null, last = "", running = false;
async function tick() {
 if (running) return;
 running = true;
 try {
  if (!target || !await OBR.scene.isReady()) {
   if (last) await OBR.popover.close(id);
   last = ""; return;
  }
  const tokenId = target;
  const [token] = await OBR.scene.items.getItems([tokenId]);
  if (!token) { target = null; return; }
  const bounds = await OBR.scene.items.getItemBounds([tokenId]);
  const [point, width, height] = await Promise.all([
   OBR.viewport.transformPoint({x:bounds.max.x,y:bounds.center.y}),
   OBR.viewport.getWidth(), OBR.viewport.getHeight()
  ]);
  if (target !== tokenId) return;
  const left = Math.round(point.x + 10), top = Math.round(point.y - 70);
  // Hide offscreen instead of pinning the panel to the viewport edge.
  if (left < 0 || left + 280 > width || top < 0 || top + 300 > height) {
   if (last) await OBR.popover.close(id);
   last = ""; return;
  }
  const key = tokenId + ":" + left + ":" + top;
  if (key === last) return;
  await OBR.popover.open({id,url:"/index.html?token="+encodeURIComponent(tokenId),width:280,height:300,
   anchorReference:"POSITION",anchorPosition:{left,top},transformOrigin:{horizontal:"LEFT",vertical:"TOP"},
   disableClickAway:true,marginThreshold:0});
  last = key;
 } catch(error) { console.error("Arsenal:",error); }
 finally { running = false; }
}
async function select(ids) {
 if (!ids?.length) return; // Camera clicks must not detach the selected character.
 if (ids.length !== 1) { target = null; void tick(); return; }
 const [token] = await OBR.scene.items.getItems(ids);
 target = token?.type === "IMAGE" && token.layer === "CHARACTER" ? token.id : null;
 void tick();
}
OBR.onReady(async () => {
 OBR.player.onChange(player => { if (player.selection !== undefined) void select(player.selection); });
 OBR.scene.onReadyChange(ready => { target = null; void tick(); if(ready) void OBR.player.getSelection().then(select); });
 await OBR.contextMenu.create({id:"com.onze1onze.arsenal/open",
 icons:[{icon:"/icon.svg",label:"Munição",filter:{every:[{key:"type",value:"IMAGE"},{key:"layer",value:"CHARACTER"}]}}],
 onClick:context=>{target=context.items[0]?.id || null;void tick();}});
 await select(await OBR.player.getSelection());
 setInterval(()=>void tick(),100);
});
