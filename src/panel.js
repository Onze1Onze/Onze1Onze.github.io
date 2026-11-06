export const PANEL_ID = "com.onze1onze.arsenal/panel";
export function panelSize(layout) {
  return {width: 250, height: layout === "revolver" ? 148 : 108};
}
// Owlbear's SDK exposes viewport and party size, but not the Players DOM bounds.
export function panelPosition(width, height, playerCount, panelHeight) {
  return {
    left: Math.max(0, Math.min(16, width - 250)),
    top: Math.max(0, Math.min(142 + Math.max(1, playerCount) * 48, height - panelHeight - 12))
  };
}
export function createPanelController(api, normalize) {
  let desired = [], revision = 0, handled = 0, activeKey = "", pending = null;
  async function drain() {
    while (handled !== revision) {
      const version = revision, ids = desired;
      handled = version;
      try {
        const ready = await api.scene.isReady();
        const items = ready && ids.length === 1 ? await api.scene.items.getItems(ids) : [];
        if (version !== revision) continue;
        const token = items.find(item => item.type === "IMAGE" && item.layer === "CHARACTER");
        if (!token) {
          await api.popover.close(PANEL_ID);
          activeKey = "";
          continue;
        }
        const layout = normalize(token.metadata?.["com.onze1onze.arsenal/ammo"]).layout;
        const size = panelSize(layout);
        const [width, height, players] = await Promise.all([
          api.viewport.getWidth(), api.viewport.getHeight(), api.party.getPlayers()
        ]);
        if (version !== revision) continue;
        const position = panelPosition(width, height, players.length + 1, size.height);
        const key = JSON.stringify([token.id, layout, position]);
        if (key === activeKey) continue;
        await api.popover.open({
          id: PANEL_ID, url: "/index.html?v=1.10.0&token=" + encodeURIComponent(token.id),
          ...size, anchorReference: "POSITION", anchorPosition: position,
          transformOrigin: {horizontal: "LEFT", vertical: "TOP"},
          disableClickAway: true, marginThreshold: 0
        });
        activeKey = key;
      } catch (error) {
        activeKey = "";
        try { await api.popover.close(PANEL_ID); } catch {}
        api.reportError(error);
      }
    }
  }
  function select(ids) {
    desired = Array.isArray(ids) ? [...ids] : [];
    revision++;
    if (!pending) pending = drain().finally(() => { pending = null; });
    return pending;
  }
  return {select, refresh: () => select(desired)};
}
