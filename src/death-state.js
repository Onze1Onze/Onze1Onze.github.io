export const DEATH_KEY="com.onze1onze.arsenal/condition";
export function normalizeCondition(raw){
 const value=raw&&typeof raw==="object"?raw:{};
 const hp=typeof value.hp==="number"&&Number.isFinite(value.hp)?value.hp:null;
 const marks=Array.from({length:3},(_,i)=>value.marks?.[i]===true);
 const status=hp===null||hp>0?"alive":marks.every(Boolean)?"dead":"dying";
 return {hp,status,marks:status==="alive"?[false,false,false]:marks,source:typeof value.source==="string"?value.source:""};
}
export function healthCondition(raw,hp,source){
 if(typeof hp!=="number"||!Number.isFinite(hp))return normalizeCondition(raw);
 const before=normalizeCondition(raw);
 return normalizeCondition({hp,marks:before.source===source?before.marks:[false,false,false],source});
}
export function toggleFailure(raw,index){
 const state=normalizeCondition(raw);
 if(state.status==="alive"||!Number.isInteger(index)||index<0||index>2)return state;
 state.marks[index]=!state.marks[index];return normalizeCondition(state);
}
export async function syncHealth(api,id,hp,source){
 if(typeof hp!=="number"||!Number.isFinite(hp))return;
 // This function never touches token images, sheet settings or ammunition.
 await api.scene.items.updateItems([id],items=>{
  for(const item of items){
   if(item.type!=="IMAGE"||item.layer!=="CHARACTER")continue;
   if(item.metadata["com.onze1onze.arsenal/sheet"]?.url!==source)continue;
   const next=healthCondition(item.metadata[DEATH_KEY],hp,source);
   if(JSON.stringify(item.metadata[DEATH_KEY])!==JSON.stringify(next))item.metadata[DEATH_KEY]=next;
  }
 });
}
