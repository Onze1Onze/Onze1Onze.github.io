export const KEY = "com.onze1onze.arsenal/ammo";
export function normalize(value = {}) {
  value = value && typeof value === "object" ? value : {};
  const raw = Number(value.capacity);
  const capacity = Number.isFinite(raw) ? Math.min(60, Math.max(1, Math.trunc(raw))) : 12;
  const layout = ["pistol", "rifle", "revolver"].includes(value.layout) ? value.layout : "pistol";
  return { capacity, layout, rounds: Array.from({length: capacity}, (_, i) => typeof value.rounds?.[i] === "boolean" ? value.rounds[i] : true) };
}
export function change(value, action) {
  const state = normalize(value);
  if (action.type === "toggle" && Number.isInteger(action.index) && action.index >= 0 && action.index < state.capacity) state.rounds[action.index] = !state.rounds[action.index];
  if (action.type === "reload") state.rounds.fill(true);
  if (action.type === "empty") state.rounds.fill(false);
  if (action.type === "configure") return normalize({...state, capacity: action.capacity, layout: action.layout});
  return state;
}
