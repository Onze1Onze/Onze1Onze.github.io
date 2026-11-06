import {createHealthMonitor} from "./health-monitor.js?v=1.16.0";
import {createConditionVisuals} from "./death-visuals.js?v=1.16.0";
import {createSheetController,registerSheetMenu,SHEET_SETTINGS_ID} from "./sheet-controller.js?v=1.16.0";
import {cleanupRetired} from "./cleanup-retired.js?v=1.16.0";
import {createPortraitController} from "./portrait-controller.js?v=1.16.0";
import OBR,{buildBillboard,buildEffect} from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";
import {normalize} from "./state.js?v=1.16.0";
import {createPanelController} from "./panel.js?v=1.16.0";
OBR.onReady(async () => {
  const cleanup=()=>cleanupRetired(OBR).catch(error=>console.error("Limpeza de dados antigos:",error));
  await cleanup();
  const panel = createPanelController({
    scene: OBR.scene, viewport: OBR.viewport, party: OBR.party, popover: OBR.popover,
    reportError: error => console.error("Arsenal:", error)
  }, normalize);
  const portrait=createPortraitController({
    scene:OBR.scene,viewport:OBR.viewport,popover:OBR.popover,
    reportError:error=>console.error("Retrato:",error)
  });
  const sheets=createSheetController({
    scene:OBR.scene,viewport:OBR.viewport,popover:OBR.popover,
    reportError:error=>console.error("Ficha:",error)
  });
  await registerSheetMenu(OBR).catch(error=>console.error("Menu da ficha:",error));
  const selectAll=ids=>Promise.all([panel.select(ids),portrait.select(ids),sheets.select(ids)]);
  const refreshAll=()=>Promise.all([panel.refresh(),portrait.refresh(),sheets.refresh()]);
  const monitor=createHealthMonitor({
    scene:OBR.scene,player:OBR.player,party:OBR.party,
    reportError:error=>console.error("Leitura de Vida:",error)
  });
  const visuals=createConditionVisuals({
    scene:OBR.scene,reportError:error=>console.error("Efeito de condição:",error)
  },{buildBillboard,buildEffect},location.origin);
  let links="";
  async function refreshConditions(){
    await visuals.refresh();
    if(!await OBR.scene.isReady())return;
    const tokens=await OBR.scene.items.getItems(i=>i.type==="IMAGE"&&i.layer==="CHARACTER");
    const next=JSON.stringify(tokens.map(i=>[i.id,i.metadata["com.onze1onze.arsenal/sheet"]?.url]).filter(([,url])=>url).sort());
    if(next!==links){links=next;monitor.refresh();}
  }
  OBR.scene.items.onChange(()=>{void refreshConditions().catch(console.error);});
  OBR.party.onChange(()=>monitor.refresh());
  globalThis.addEventListener("pagehide",()=>monitor.stop(),{once:true});
  monitor.refresh();void visuals.refresh();
  let selectionRevision = 0;
  async function readSelection() {
    const version = ++selectionRevision;
    const ids = await OBR.player.getSelection();
    if (version === selectionRevision) await selectAll(ids);
  }
  OBR.player.onChange(player => {
    selectionRevision++;
    void selectAll(player.selection);
  });
  OBR.scene.onReadyChange(ready => {
    monitor.refresh({sceneChanged:true});
    void visuals.refresh();
    links="";
    void OBR.popover.close(SHEET_SETTINGS_ID);
    if(ready)void cleanup();
    selectionRevision++;
    void selectAll([]);
    if (ready) void readSelection();
  });
  OBR.scene.items.onChange(() => { void refreshAll(); });
  OBR.party.onChange(() => { void refreshAll(); });
  window.addEventListener("resize", () => { void refreshAll(); });
  await readSelection();
});
