import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
const id = "com.onze1onze.arsenal/panel";
const PANEL_WIDTH = 300, PANEL_HEIGHT = 130;
let target = null, last = "", running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    if (!target || !await OBR.scene.isReady()) {
      if (last) await OBR.popover.close(id);
      last = "";
      return;
    }
    const tokenId = target;
    const [token] = await OBR.scene.items.getItems([tokenId]);
    if (!token) { target = null; if (last) await OBR.popover.close(id); last = ""; return; }
    // The player list is in the upper-left. Keep this bar directly below it.
    const viewportWidth = await OBR.viewport.getWidth();
    const left = Math.max(8, Math.min(16, viewportWidth - PANEL_WIDTH - 8));
    const top = 310;
    const key = tokenId + ":" + left + ":" + top;
    if (key === last) return;
    await OBR.popover.open({
      id,
      url: "/index.html?token=" + encodeURIComponent(tokenId),
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      anchorReference: "POSITION",
      anchorPosition: {left, top},
      transformOrigin: {horizontal: "LEFT", vertical: "TOP"},
      disableClickAway: true,
      marginThreshold: 0
    });
    last = key;
  } catch (error) {
    console.error("Arsenal:", error);
  } finally {
    running = false;
  }
}
async function select(ids) {
  if (!ids?.length) {
    target = null;
    void tick();
    return;
  }
  if (ids.length !== 1) {
    target = null;
    void tick();
    return;
  }
  const [token] = await OBR.scene.items.getItems(ids);
  target = token?.type === "IMAGE" && token.layer === "CHARACTER" ? token.id : null;
  void tick();
}
OBR.onReady(async () => {
  OBR.player.onChange(player => {
    if (player.selection !== undefined) void select(player.selection);
  });
  OBR.scene.onReadyChange(ready => {
    target = null;
    void tick();
    if (ready) void OBR.player.getSelection().then(select);
  });
  await select(await OBR.player.getSelection());
});