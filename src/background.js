import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {normalize} from "./state.js?v=1.7.0";
import {createPanelController} from "./panel.js?v=1.7.0";
OBR.onReady(async () => {
  const panel = createPanelController({
    scene: OBR.scene, viewport: OBR.viewport, party: OBR.party, popover: OBR.popover,
    reportError: error => console.error("Arsenal:", error)
  }, normalize);
  let selectionRevision = 0;
  async function readSelection() {
    const version = ++selectionRevision;
    const ids = await OBR.player.getSelection();
    if (version === selectionRevision) await panel.select(ids);
  }
  OBR.player.onChange(player => {
    selectionRevision++;
    void panel.select(player.selection);
  });
  OBR.scene.onReadyChange(ready => {
    selectionRevision++;
    void panel.select([]);
    if (ready) void readSelection();
  });
  OBR.scene.items.onChange(() => { void panel.refresh(); });
  OBR.party.onChange(() => { void panel.refresh(); });
  window.addEventListener("resize", () => { void panel.refresh(); });
  await readSelection();
});
