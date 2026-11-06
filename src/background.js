import {createPortraitController} from "./portrait-controller.js?v=1.11.1";
import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {normalize} from "./state.js?v=1.11.1";
import {createPanelController} from "./panel.js?v=1.11.1";
OBR.onReady(async () => {
  const panel = createPanelController({
    scene: OBR.scene, viewport: OBR.viewport, party: OBR.party, popover: OBR.popover,
    reportError: error => console.error("Arsenal:", error)
  }, normalize);
  const portrait=createPortraitController({
    scene:OBR.scene,viewport:OBR.viewport,popover:OBR.popover,
    reportError:error=>console.error("Retrato:",error)
  });
  const selectAll=ids=>Promise.all([panel.select(ids),portrait.select(ids)]);
  const refreshAll=()=>Promise.all([panel.refresh(),portrait.refresh()]);
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
    selectionRevision++;
    void selectAll([]);
    if (ready) void readSelection();
  });
  OBR.scene.items.onChange(() => { void refreshAll(); });
  OBR.party.onChange(() => { void refreshAll(); });
  window.addEventListener("resize", () => { void refreshAll(); });
  await readSelection();
});
