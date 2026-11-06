import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
const id = "com.onze1onze.arsenal/panel";
const PANEL_WIDTH = 230, PANEL_HEIGHT = 240, GAP = 10;
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
    if (!token) { target = null; return; }
    const bounds = await OBR.scene.items.getItemBounds([tokenId]);
    const [point, viewportWidth, viewportHeight] = await Promise.all([
      OBR.viewport.transformPoint({x: bounds.max.x, y: bounds.center.y}),
      OBR.viewport.getWidth(), OBR.viewport.getHeight()
    ]);
    if (target !== tokenId) return;

    // Calculate the position once, when the token is selected.
    // POSITION keeps the panel fixed while the camera moves.
    let left = Math.round(point.x + GAP);
    if (left + PANEL_WIDTH > viewportWidth) left = Math.round(point.x - PANEL_WIDTH - GAP);
    left = Math.max(0, Math.min(left, viewportWidth - PANEL_WIDTH));
    const top = Math.max(0, Math.min(
      Math.round(point.y - PANEL_HEIGHT / 2),
      viewportHeight - PANEL_HEIGHT
    ));
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
  if (!ids?.length) return;
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