import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
const id = "com.onze1onze.arsenal/panel";
let previous = null;
async function open(token) {
  await OBR.popover.open({ id, url: "/index.html?token=" + encodeURIComponent(token.id), width: 420, height: 520 });
}
async function selectionChanged(ids) {
  try {
    if (!await OBR.scene.isReady()) { previous = null; return; }
    if (ids?.length !== 1) { previous = null; await OBR.popover.close(id); return; }
    const [token] = await OBR.scene.items.getItems(ids);
    if (token?.type !== "IMAGE" || token.layer !== "CHARACTER") { previous = null; await OBR.popover.close(id); return; }
    if (previous !== token.id) { previous = token.id; await open(token); }
  } catch (error) { previous = null; console.error("Arsenal:", error); }
}
OBR.onReady(async () => {
  OBR.player.onChange(player => { void selectionChanged(player.selection); });
  OBR.scene.onReadyChange(ready => { previous = null; if (ready) void OBR.player.getSelection().then(selectionChanged); else void OBR.popover.close(id); });
  await OBR.contextMenu.create({
    id: "com.onze1onze.arsenal/open",
    icons: [{icon: "/icon.svg", label: "Munição", filter: {every: [{key: "type", value: "IMAGE"}, {key: "layer", value: "CHARACTER"}]}}],
    onClick: context => { if (context.items[0]) void open(context.items[0]); }
  });
  await selectionChanged(await OBR.player.getSelection());
});
