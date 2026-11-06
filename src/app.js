import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {KEY, normalize, change} from "./state.js?v=1.5.0";
import {PANEL_ID, panelSize} from "./panel.js?v=1.5.0";
import {chamberPosition} from "./layout.js?v=1.5.0";
const $ = id => document.getElementById(id);
const tokenId = new URLSearchParams(location.search).get("token");
let current = null, busy = false;
const bullet = '<svg viewBox="0 0 30 70" aria-hidden="true"><path fill="currentColor" d="M6 54V22Q6 6 15 2q9 4 9 20v32zM4 57h22v9H4z"/><path stroke="#11151c" opacity=".3" d="M7 24h16M10 28v22"/></svg>';
const chamber = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="currentColor"/><circle cx="20" cy="20" r="10" fill="none" stroke="#191a22" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#191a22"/></svg>';
function render() {
  $("tracker").hidden = !current;
  $("settings").disabled = !current || busy;
  if (!current) return;
  const state = normalize(current.metadata?.[KEY]);
  $("name").textContent = current.name || "Personagem";
  $("name").title = current.name || "Personagem";
  $("remaining").textContent = state.rounds.filter(Boolean).length;
  $("capacity").textContent = state.capacity;
  const container = $("rounds"), scroll = container.scrollLeft;
  const focusIndex = container.contains(document.activeElement) ? document.activeElement.dataset.index : null;
  container.className = state.layout;
  container.replaceChildren();
  const drums = [];
  state.rounds.forEach((loaded, index) => {
    const button = document.createElement("button");
    button.type = "button"; button.dataset.index = index;
    button.className = "round" + (loaded ? "" : " spent"); button.disabled = busy;
    button.setAttribute("aria-label", "Bala " + (index+1) + (loaded ? ": carregada" : ": gasta"));
    button.setAttribute("aria-pressed", String(loaded));
    button.title = "Bala " + (index+1) + (loaded ? " · carregada" : " · gasta");
    button.innerHTML = state.layout === "revolver" ? chamber : bullet;
    let parent = container;
    if (state.layout === "revolver") {
      const p = chamberPosition(index, state.capacity);
      if (!drums[p.group]) {
        const drum = document.createElement("div"); drum.className = "drum";
        container.append(drum); drums[p.group] = drum;
      }
      parent = drums[p.group];
      button.style.cssText = "left:"+p.x+"px;top:"+p.y+"px;width:"+p.size+"px;height:"+p.size+"px";
    }
    button.onclick = () => { void mutate({type:"toggle",index}); };
    parent.append(button);
  });
  container.scrollLeft = scroll;
  if (focusIndex !== null) container.querySelector('[data-index="'+focusIndex+'"]')?.focus({preventScroll:true});
}
async function refresh() {
  const [token] = await OBR.scene.items.getItems([tokenId]);
  current = token?.type === "IMAGE" && token.layer === "CHARACTER" ? token : null;
  if (!current) { await OBR.popover.close(PANEL_ID); return; }
  render();
}
async function resize(height) {
  if (OBR.isAvailable) await OBR.popover.setHeight(PANEL_ID, height);
}
async function mutate(action) {
  if (!current || busy) return;
  busy = true; render();
  try {
    await OBR.scene.items.updateItems([tokenId], items => {
      for (const item of items) item.metadata[KEY] = change(item.metadata?.[KEY], action);
    });
    // Do not depend on an onChange event arriving before updateItems resolves.
    await refresh();
    $("status").textContent = "";
    return true;
  } catch (error) {
    $("status").textContent = "Não foi possível salvar. Verifique a permissão do token.";
    console.error("Arsenal:", error);
    return false;
  } finally { busy = false; render(); }
}
async function openConfig() {
  if (!current || busy) return;
  const state = normalize(current.metadata?.[KEY]);
  $("size").value = state.capacity; $("layout").value = state.layout;
  await resize(280);
  $("config").showModal();
  $("settings").setAttribute("aria-expanded", "true");
}
$("settings").onclick = () => { void openConfig().catch(console.error); };
$("cancel").onclick = () => $("config").close();
$("config").addEventListener("close", () => {
  $("settings").setAttribute("aria-expanded", "false");
  const height = panelSize(normalize(current?.metadata?.[KEY]).layout).height;
  void resize(height).catch(console.error);
});
$("config-form").onsubmit = async event => {
  event.preventDefault();
  if (!$("config-form").reportValidity() || busy) return;
  const action = {type:"configure",capacity:Number($("size").value),layout:$("layout").value};
  if (await mutate(action)) $("config").close();
};
render();
if (!OBR.isAvailable) {
  $("status").textContent = "Abra esta extensão em uma sala do Owlbear Rodeo.";
} else OBR.onReady(async () => {
  try {
    OBR.scene.items.onChange(items => {
      const token = items.find(item => item.id === tokenId);
      current = token?.type === "IMAGE" && token.layer === "CHARACTER" ? token : null;
      if (!current) { void OBR.popover.close(PANEL_ID); return; }
      render();
    });
    $("status").textContent = "";
    await refresh();
  } catch (error) { $("status").textContent = "Não foi possível carregar o personagem."; console.error(error); }
});
