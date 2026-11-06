// Procedural effects: no third-party recordings, downloads or autoplay.
export const SOUND_PROFILES = Object.freeze({
 pistol:{body:125,tail:.16,crack:2400,gap:.1,reload:[0,.10,.24]},
 revolver:{body:155,tail:.22,crack:3100,gap:.15,reload:[0,.08,.16,.31]},
 hunting:{body:85,tail:.34,crack:1900,gap:.2,reload:[0,.15,.37]},
 smg:{body:145,tail:.10,crack:2800,gap:.065,reload:[0,.08,.20]},
 shotgun:{body:58,tail:.42,crack:1400,gap:.22,reload:[0,.18,.34,.46]},
 assault:{body:105,tail:.20,crack:3400,gap:.085,reload:[0,.12,.29]},
 sniper:{body:48,tail:.48,crack:2200,gap:.25,reload:[0,.22,.48]},
 machinegun:{body:75,tail:.26,crack:2700,gap:.105,reload:[0,.07,.14,.21,.38]}
});
export function ammoFeedback(before,after) {
 if(before.weapon!==after.weapon)return null;
 const spent=[],restored=[];
 before.rounds.forEach((loaded,i)=>{
  if(loaded && after.rounds[i]===false)spent.push(i);
  if(!loaded && after.rounds[i]===true)restored.push(i);
 });
 return spent.length?{weapon:after.weapon,type:"shot",indices:spent}:restored.length?{weapon:after.weapon,type:"reload",indices:restored}:null;
}
export function createWeaponAudio(Context = globalThis.AudioContext || globalThis.webkitAudioContext) {
 let context,master,noise,closed=false;
 function init() {
  if(closed||!Context)return false;
  if(!context){
   context=new Context();
   const limiter=context.createDynamicsCompressor();
   limiter.threshold.value=-15;limiter.knee.value=8;limiter.ratio.value=12;limiter.attack.value=.002;limiter.release.value=.1;
   master=context.createGain();master.gain.value=.22;master.connect(limiter);limiter.connect(context.destination);
   noise=context.createBuffer(1,Math.ceil(context.sampleRate*.55),context.sampleRate);
   const samples=noise.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  }
  return true;
 }
 async function unlock(){
  try{if(!init())return false;if(context.state==="suspended")await context.resume();return context.state==="running";}catch{return false;}
 }
 function voice(kind,time,duration,frequency,volume,endFrequency) {
  const gain=context.createGain(),filter=context.createBiquadFilter();
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.002);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  filter.type=kind==="noise"?"lowpass":"highpass";filter.frequency.value=kind==="noise"?frequency:25;
  const source=kind==="noise"?context.createBufferSource():context.createOscillator();
  if(kind==="noise")source.buffer=noise;
  else {source.type="triangle";source.frequency.setValueAtTime(frequency,time);source.frequency.exponentialRampToValueAtTime(endFrequency||35,time+duration);}
  source.connect(filter);filter.connect(gain);gain.connect(master);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  source.start(time);source.stop(time+duration+.01);
 }
 async function play(effect) {
  try{
   if(!effect||!Object.hasOwn(SOUND_PROFILES,effect.weapon)||!await unlock())return;
   const p=SOUND_PROFILES[effect.weapon],now=context.currentTime+.008;
   if(effect.type==="shot") {
    const count=Math.min(10,effect.indices.length);
    for(let i=0;i<count;i++){
     const time=now+i*p.gap;
     voice("noise",time,.035,p.crack,.8);
     voice("tone",time,p.tail,p.body,.75,30);
     voice("noise",time+.008,p.tail,p.crack*.35,.28);
    }
   } else if(effect.type==="reload") {
    p.reload.forEach((offset,i)=>{
     voice("noise",now+offset,.028+i*.006,900+p.body*6+i*370,.24);
     voice("tone",now+offset,.035,500+p.body+i*170,.09,220);
    });
   }
  }catch{/* Sound failure must never block ammunition edits. */}
 }
 function dispose(){closed=true;if(context)void context.close().catch(()=>{});}
 return {unlock,play,dispose};
}
