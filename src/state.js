export const KEY = "com.onze1onze.arsenal/ammo";
export const WEAPONS = Object.freeze({
 pistol: Object.freeze({name:"Pistola",capacity:12,burst:false}),
 revolver: Object.freeze({name:"Revólver",capacity:6,burst:false}),
 hunting: Object.freeze({name:"Fuzil de Caça",capacity:4,burst:false}),
 smg: Object.freeze({name:"Submetralhadora",capacity:20,burst:false}),
 shotgun: Object.freeze({name:"Espingarda",capacity:6,burst:false}),
 assault: Object.freeze({name:"Fuzil de Assalto",capacity:30,burst:true}),
 sniper: Object.freeze({name:"Fuzil de Precisão",capacity:1,burst:false}),
 machinegun: Object.freeze({name:"Metralhadora",capacity:50,burst:true})
});
const valid = weapon => Object.hasOwn(WEAPONS, weapon);
function roundsFor(weapon, rounds) {
 return Array.from({length:WEAPONS[weapon].capacity},(_,i)=>typeof rounds?.[i]==="boolean"?rounds[i]:true);
}
export function normalize(value = {}) {
 value = value && typeof value==="object" ? value : {};
 const weapon = valid(value.weapon) ? value.weapon : value.layout==="revolver" ? "revolver" : value.layout==="rifle" ? "hunting" : "pistol";
 const magazines = {};
 for(const id of Object.keys(WEAPONS)) {
  if(Array.isArray(value.magazines?.[id])) magazines[id]=roundsFor(id,value.magazines[id]);
 }
 const rounds = roundsFor(weapon,Array.isArray(value.rounds)?value.rounds:magazines[weapon]);
 magazines[weapon] = [...rounds];
 return {weapon,layout:weapon,capacity:WEAPONS[weapon].capacity,rounds,magazines};
}
export function change(value, action = {}) {
 const state = normalize(value);
 if(action.type==="configure" && valid(action.weapon)) {
  state.weapon=action.weapon;state.layout=action.weapon;
  state.capacity=WEAPONS[action.weapon].capacity;
  state.rounds=roundsFor(action.weapon,state.magazines[action.weapon]);
 }
 if(action.type==="toggle" && Number.isInteger(action.index) && action.index>=0 && action.index<state.capacity)
  state.rounds[action.index]=!state.rounds[action.index];
 if(action.type==="burst" && WEAPONS[state.weapon].burst && state.rounds.filter(Boolean).length>=10) {
  let spent=0;
  for(let i=0;i<state.rounds.length && spent<10;i++) if(state.rounds[i]) {state.rounds[i]=false;spent++;}
 }
 state.magazines[state.weapon]=[...state.rounds];
 return state;
}
