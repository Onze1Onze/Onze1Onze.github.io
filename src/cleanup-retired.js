// Compatibility cleanup for scene objects created by a removed feature.
// No interaction, UI, validation or broadcast handler is registered here.
const RETIRED_KEY = "com.onze1onze.arsenal/keypad";
export async function cleanupRetired(OBR) {
 const suffixes=["/tray","/settings"];
 await Promise.allSettled([
  ...suffixes.map(suffix=>OBR.popover.close(RETIRED_KEY+suffix)),
  OBR.contextMenu.remove(RETIRED_KEY+"/config"),
  OBR.tool.removeMode(RETIRED_KEY+"/mode"),
  OBR.tool.remove(RETIRED_KEY+"/tool")
 ]);
 try{
  for(let i=localStorage.length-1;i>=0;i--){
   const key=localStorage.key(i);
   if(key?.startsWith(RETIRED_KEY+"/"))localStorage.removeItem(key);
  }
 }catch(error){console.error("Limpeza de dados locais:",error);}
 if(await OBR.player.getRole()!=="GM" || !await OBR.scene.isReady())return;
 const items=await OBR.scene.items.getItems(item=>Object.hasOwn(item.metadata||{},RETIRED_KEY));
 if(items.length)await OBR.scene.items.deleteItems(items.map(item=>item.id));
}
