import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {KEY, normalize, change} from "./state.js";
const $ = id => document.getElementById(id);
const fixed = new URLSearchParams(location.search).get("token");
let selected = fixed, current = null, busy = false, revision = 0;
const bullet = '<svg viewBox="0 0 30 70" aria-hidden="true"><path fill="currentColor" d="M6 54V22Q6 6 15 2q9 4 9 20v32z"/><path fill="currentColor" d="M4 57h22v9H4z"/><path stroke="#11151c" opacity=".3" d="M7 24h16M10 28v22"/></svg>';
const chamber = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="currentColor"/><circle cx="20" cy="20" r="10" fill="none" stroke="#11151c" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#11151c"/></svg>';
function render() {
  $("tracker").hidden = !current;
  $("settings").disabled = !current || busy;
  if (!current) { $("name").textContent = "Selecione um personagem"; return; }
  const state = normalize(current.metadata[KEY]);
  $("name").textContent = current.name || "Personagem";
  $("remaining").textContent = state.rounds.filter(Boolean).length;
  $("capacity").textContent = state.capacity;
  $("layout-label").textContent = {pistol:"PISTOLA",rifle:"FUZIL",revolver:"REVÓLVER"}[state.layout];
  const container = $("rounds");
  container.className = state.layout;
  container.replaceChildren();
  state.rounds.forEach((loaded, index) => {
    const button = document.createElement("button");
    button.className = "round" + (loaded ? "" : " spent");
    button.type = "button"; button.disabled = busy;
    button.setAttribute("aria-label", "Bala " + (index+1) + (loaded ? ": carregada" : ": gasta"));
    button.setAttribute("aria-pressed", String(loaded));
    button.innerHTML = state.layout === "revolver" ? chamber : bullet;
    if (state.layout === "revolver") {
      const ring = Math.floor(index / 15);
      const start = ring * 15;
      const count = Math.min(15, state.capacity - start);
      const angle = (index - start) / count * Math.PI * 2 - Math.PI/2;
      const radius = Math.min(67, 20 + ring * 15);
      const single = state.capacity <= 15;
      const r = single ? 60 : radius;
      const size = single ? Math.min(32, 2*Math.PI*r / count - 4) : 14;
      button.style.cssText = "left:calc(50% + "+Math.cos(angle)*r+"px);top:calc(50% + "+Math.sin(angle)*r+"px);width:"+size+"px;height:"+size+"px";
    }
    button.onclick = () => mutate({type:"toggle",index});
    container.append(button);
  });
  $("reload").disabled = busy; $("empty").disabled = busy;
}
async function refresh() {
  const version = ++revision;
  try {
    if (!await OBR.scene.isReady()) { current = null; $("status").textContent = "Abra uma cena para usar a munição."; render(); return; }
    const selection = fixed ? [fixed] : await OBR.player.getSelection();
    const ids = selection || [];
    const items = ids.length === 1 ? await OBR.scene.items.getItems(ids) : [];
    if (version !== revision) return;
    current = items.find(item => item.type === "IMAGE" && item.layer === "CHARACTER") || null;
    selected = current?.id;
    $("status").textContent = current ? "" : "Selecione um único token da camada Personagem.";
    render();
  } catch (error) { $("status").textContent = "Não foi possível ler o token. " + error.message; }
}
async function mutate(action) {
  if (!selected || busy) return;
  const target = selected;
  busy = true; render();
  try {
    await OBR.scene.items.updateItems([target], items => {
      for (const item of items) item.metadata[KEY] = change(item.metadata[KEY], action);
    });
    $("status").textContent = "";
  } catch (error) { $("status").textContent = "Não foi possível salvar. Verifique sua permissão para editar este token. " + error.message; }
  finally { busy = false; render(); }
}
$("settings").onclick = () => {
  if (!current) return;
  const state = normalize(current.metadata[KEY]);
  $("size").value = state.capacity; $("layout").value = state.layout;
  $("config").showModal();
};
$("cancel").onclick = () => $("config").close();
$("config-form").onsubmit = event => {
  event.preventDefault();
  if (!$("config-form").reportValidity()) return;
  $("config").close();
  void mutate({type:"configure",capacity:Number($("size").value),layout:$("layout").value});
};
$("reload").onclick = () => mutate({type:"reload"});
$("empty").onclick = () => mutate({type:"empty"});
render();
if (!OBR.isAvailable) {
  $("status").textContent = "Instale esta extensão no Owlbear Rodeo usando https://Onze1Onze.github.io/manifest.json";
} else OBR.onReady(async () => {
  OBR.scene.items.onChange(items => {
    const token = items.find(item => item.id === selected);
    current = token?.type === "IMAGE" && token.layer === "CHARACTER" ? token : null;
    if (!current) $("config").close();
    render();
  });
  OBR.scene.onReadyChange(() => { $("config").close(); void refresh(); });
  if (!fixed) OBR.player.onChange(player => { if (player.selection !== undefined) { $("config").close(); void refresh(); } });
  await refresh();
});
