export function chamberPosition(index, capacity = 6) {
 const angle=index/capacity*Math.PI*2-Math.PI/2;
 return {group:0,x:48+Math.cos(angle)*31,y:48+Math.sin(angle)*31,size:22};
}
export function roundPlacement(weapon,index) {
 if(weapon==="revolver") return chamberPosition(index);
 if(weapon==="assault") return {x:10+Math.floor(index/2)*25,y:4+(index%2)*21,width:23,height:21};
 if(weapon==="machinegun") return {x:8+index*24,y:4+(index%2)*4,width:22,height:37};
 if(weapon==="smg") return {x:6+index*19,y:3,width:18,height:42};
 if(weapon==="hunting") return {x:8+index*48,y:3,width:38,height:42};
 if(weapon==="shotgun") return {x:6+index*34,y:3,width:29,height:42};
 if(weapon==="sniper") return {x:69,y:2,width:76,height:44};
 return {x:6+index*27,y:3,width:25,height:42};
}
export function magazineWidth(weapon,capacity) {
 if(weapon==="revolver") return 96;
 if(weapon==="assault") return 20+Math.ceil(capacity/2)*25;
 if(weapon==="machinegun") return 16+capacity*24;
 if(weapon==="smg") return 12+capacity*19;
 if(weapon==="hunting") return 16+capacity*48;
 if(weapon==="shotgun") return 12+capacity*34;
 if(weapon==="sniper") return 214;
 return 12+capacity*27;
}
