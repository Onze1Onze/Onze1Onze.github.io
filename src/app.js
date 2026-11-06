import OBR from "https://esm.sh/@owlbear-rodeo/sdk@2.3.0";
import {KEY, WEAPONS, normalize, change} from "./state.js?v=1.6.0";
import {PANEL_ID, panelSize} from "./panel.js?v=1.6.0";
import {roundPlacement, magazineWidth} from "./layout.js?v=1.6.0";
const $ = id => document.getElementById(id);
const tokenId = new URLSearchParams(location.search).get("token");
let current = null, busy = false;
const bullet = '<svg viewBox="0 0 30 70" aria-hidden="true"><path fill="currentColor" d="M6 54V22Q6 6 15 2q9 4 9 20v32zM4 57h22v9H4z"/><path stroke="#11151c" opacity=".3" d="M7 24h16M10 28v22"/></svg>';
const shell = '<svg viewBox="0 0 30 70" aria-hidden="true"><path fill="currentColor" d="M5 5h20v47H5z"/><path fill="#b5945e" d="M3 53h24v13H3z"/><path stroke="#191a22" opacity=".3" d="M10 8v41M20 8v41"/></svg>';
const longRound = '<svg viewBox="0 0 30 70" aria-hidden="true"><path fill="currentColor" d="M8 66V32l3-8V14l4-13 4 13v10l3 8v34z"/><path stroke="#191a22" opacity=".4" d="M8 34h14M8 60h14"/></svg>';
const sniperRound = '<svg viewBox="0 0 90 34" aria-hidden="true"><path fill="currentColor" d="M3 5h47l10 5h11l16 7-16 7H60l-10 5H3z"/><path stroke="#191a22" opacity=".4" d="M10 5v24M50 5v24"/></svg>';
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
  const weapon = WEAPONS[state.weapon];
  $("name").title += " · " + weapon.name;
  $("burst").hidden = !weapon.burst;
  $("burst").disabled = busy || state.rounds.filter(Boolean).length < 10;
  $("burst").title = state.rounds.filter(Boolean).length < 10 ? "Requer 10 balas carregadas" : "Gastar 10 balas carregadas";
  const container = $("rounds"), scroll = container.scrollLeft;
  const focusIndex = container.contains(document.activeElement) ? document.activeElement.dataset.index : null;
  container.className = state.layout;
  container.replaceChildren();
  const magazine = document.createElement("div");
  magazine.className = "magazine";
  magazine.style.width = magazineWidth(state.weapon,state.capacity)+"px";
  container.append(magazine);
  state.rounds.forEach((loaded, index) => {
    const button = document.createElement("button");
    button.type = "button"; button.dataset.index = index;
    button.className = "round" + (loaded ? "" : " spent"); button.disabled = busy;
    button.setAttribute("aria-label", "Bala " + (index+1) + (loaded ? ": carregada" : ": gasta"));
    button.setAttribute("aria-pressed", String(loaded));
    button.title = "Bala " + (index+1) + (loaded ? " · carregada" : " · gasta");
    button.innerHTML = state.weapon==="revolver" ? chamber : state.weapon==="shotgun" ? shell : state.weapon==="sniper" ? sniperRound : ["hunting","assault","machinegun"].includes(state.weapon) ? longRound : bullet;
    const p = roundPlacement(state.weapon,index);
    if(state.weapon==="revolver") {
      button.style.cssText="left:"+p.x+"px;top:"+p.y+"px;width:"+p.size+"px;height:"+p.size+"px";
    } else {
      button.style.cssText="left:"+p.x+"px;top:"+p.y+"px;width:"+p.width+"px;height:"+p.height+"px";
    }
    button.onclick = () => { void mutate({type:"toggle",index}); };
    magazine.append(button);
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
  $("weapon").value = state.weapon;
  await resize(220);
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
  const action = {type:"configure",weapon:$("weapon").value};
  if (await mutate(action)) $("config").close();
};
for(const [id,weapon] of Object.entries(WEAPONS)) {
 const option=document.createElement("option");option.value=id;option.textContent=weapon.name+" · "+weapon.capacity+" "+(weapon.capacity===1?"bala":"balas");$("weapon").append(option);
}
$("burst").onclick = () => { void mutate({type:"burst"}); };
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
