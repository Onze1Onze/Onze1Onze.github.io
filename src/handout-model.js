export const HK="com.onze1onze.arsenal/keypad";
export const CHANNEL="com.onze1onze.arsenal/handouts";
export const TOOL=HK+"/tool", MODE=HK+"/mode", TRAY=HK+"/tray", SETTINGS=HK+"/settings";
export const keys=["1","2","3","4","5","6","7","8","9","C","0","OK"];
export function validCode(code){return typeof code==="string" && /^[0-9]{1,8}$/.test(code);}
export function press(state,key,code){
 if(!validCode(code)||!keys.includes(key)||state.solved)return {...state};
 let input=typeof state.input==="string"?state.input:"";
 if(key==="C")return {...state,input:"",status:"locked"};
 if(key==="OK"){const solved=input===code;return {...state,input:"",solved,status:solved?"open":"denied",attempts:(state.attempts||0)+1};}
 return {...state,input:(state.status==="denied"?"":input).concat(key).slice(0,8),status:"locked"};
}
export function hitKey(item,point,sceneDpi=item.grid?.dpi||1){
 // Image grid offsets are zero; rotation and scale are supported.
 const angle=-(item.rotation||0)*Math.PI/180,dx=point.x-item.position.x,dy=point.y-item.position.y;
 const ratio=sceneDpi/(item.grid?.dpi||sceneDpi);
 const x=(dx*Math.cos(angle)-dy*Math.sin(angle))/(item.scale.x*ratio);
 const y=(dx*Math.sin(angle)+dy*Math.cos(angle))/(item.scale.y*ratio);
 const col=Math.floor((x-30)/80),row=Math.floor((y-138)/68);
 if(col<0||col>2||row<0||row>3 || (x-30)%80>68 || (y-138)%68>56)return null;
 return keys[row*3+col];
}
export function keypadSvg(state={}){
 const color=state.solved?"#8fe4aa":state.status==="denied"?"#ff957f":"#a5d9a3";
 const display=state.solved?"ABERTO":state.status==="denied"?"NEGADO":"•".repeat((state.input||"").length)||"— — — —";
 return '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><defs><linearGradient id="m" x2="1" y2="1"><stop stop-color="#a4aaa5"/><stop offset=".4" stop-color="#535b58"/><stop offset="1" stop-color="#919892"/></linearGradient><linearGradient id="k" x2="0" y2="1"><stop stop-color="#555b58"/><stop offset="1" stop-color="#272f2c"/></linearGradient></defs><rect x="7" y="7" width="286" height="436" rx="25" fill="#171c19" stroke="#b49b68" stroke-width="3"/><rect x="17" y="17" width="266" height="416" rx="19" fill="url(#m)"/><rect x="29" y="41" width="242" height="78" rx="10" fill="#14251b" stroke="#303b30" stroke-width="4"/><path d="M40 45h100l-60 70H40z" fill="#ffffff08"/><text x="149" y="87" text-anchor="middle" font-family="monospace" font-size="23" fill="'+color+'">'+display+'</text><circle cx="250" cy="56" r="6" fill="'+color+'"/>'+keys.map((key,i)=>{const x=30+(i%3)*80,y=138+Math.floor(i/3)*68;return '<rect x="'+x+'" y="'+y+'" width="68" height="56" rx="10" fill="'+(key==="C"?"#8f4435":key==="OK"?"#347249":"url(#k)")+'" stroke="#202820" stroke-width="4"/><path d="M'+(x+10)+' '+(y+8)+'h48" stroke="#ffffff24" stroke-width="3"/><text x="'+(x+34)+'" y="'+(y+38)+'" text-anchor="middle" fill="#eee9dc" font-family="sans-serif" font-size="'+(key==="OK"?20:30)+'" font-weight="bold">'+(key==="OK"?"✓":key)+'</text>';}).join("")+'<text x="150" y="428" text-anchor="middle" fill="#202820" font-family="monospace" font-size="10" letter-spacing="2">ACCESS CONTROL / 01</text>'+[[28,28],[272,28],[28,422],[272,422]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="4" fill="#242d28"/><path d="M'+(x-2)+' '+y+'h4" stroke="#a1a48a"/>').join("")+'</svg>';
}
export function imageUrl(state){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(keypadSvg(state));}
