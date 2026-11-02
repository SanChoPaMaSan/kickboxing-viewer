import { Vector3 } from 'three';
export type Kind = 'straight'|'hook'|'upper'|'middle'|'low';
export type Technique = {id:string; name:string; en:string; side:0|1; kind:Kind; limb:string; description:string};
export const techniques: Technique[] = [
 {id:'jab',name:'잽',en:'JAB',side:0,kind:'straight',limb:'왼손',description:'앞손을 직선으로 뻗고 빠르게 가드로 회수합니다.'},
 {id:'hook-left',name:'훅',en:'LEAD HOOK',side:0,kind:'hook',limb:'왼손',description:'왼팔을 굽힌 상태에서 몸통을 회전하며 수평 궤적을 그립니다.'},
 {id:'upper-left',name:'어퍼컷',en:'LEAD UPPERCUT',side:0,kind:'upper',limb:'왼손',description:'무게중심을 낮춘 뒤 왼주먹을 아래에서 위로 올립니다.'},
 {id:'middle-left',name:'미들킥',en:'LEAD MIDDLE KICK',side:0,kind:'middle',limb:'왼발',description:'오른발로 지지하고 골반을 돌려 왼발로 몸통 높이를 타격합니다.'},
 {id:'low-left',name:'로우킥',en:'LEAD LOW KICK',side:0,kind:'low',limb:'왼발',description:'오른발로 지지하며 왼발을 허벅지 높이의 낮은 궤적으로 회전합니다.'},
 {id:'cross',name:'스트레이트',en:'REAR CROSS',side:1,kind:'straight',limb:'오른손',description:'뒷손과 오른쪽 어깨를 전방으로 보내며 직선으로 타격합니다.'},
 {id:'hook-right',name:'훅',en:'REAR HOOK',side:1,kind:'hook',limb:'오른손',description:'오른팔을 굽힌 상태에서 몸통을 회전하며 수평 궤적을 그립니다.'},
 {id:'upper-right',name:'어퍼컷',en:'REAR UPPERCUT',side:1,kind:'upper',limb:'오른손',description:'무게중심을 낮춘 뒤 오른주먹을 아래에서 위로 올립니다.'},
 {id:'middle-right',name:'미들킥',en:'REAR MIDDLE KICK',side:1,kind:'middle',limb:'오른발',description:'왼발로 지지하고 골반을 돌려 오른발로 몸통 높이를 타격합니다.'},
 {id:'low-right',name:'로우킥',en:'REAR LOW KICK',side:1,kind:'low',limb:'오른발',description:'왼발로 지지하며 오른발을 허벅지 높이의 낮은 궤적으로 회전합니다.'},
];
export type Pose = {hip:Vector3; yaw:number; lean:number; hands:Vector3[]; feet:Vector3[]; kick:number};
export const duration = 2.4;
export function guard():Pose {return {hip:new Vector3(0,.99,0),yaw:-.18,lean:0,hands:[new Vector3(.3,1.66,.38),new Vector3(-.3,1.61,.23)],feet:[new Vector3(.28,.09,.3),new Vector3(-.29,.09,-.27)],kick:-1};}
const smooth=(x:number)=> x*x*(3-2*x);
export function poseAt(tech:Technique|undefined, progress:number):Pose {
 const p=guard(); if(!tech || progress<=0 || progress>=1)return p;
 const t=progress, side=tech.side, sign=side===0?1:-1;
 const prep=t<.22?smooth(t/.22):1;
 const strike=t<.22?0:t<.5?smooth((t-.22)/.28):1;
 const back=t<.58?0:smooth((t-.58)/.42);
 const envelope=prep*(1-back),w=strike*(1-back);
 p.yaw -= sign*(tech.kind==='straight'?.38:.65)*w;
 if(tech.kind==='straight'){
  p.hip.z+=.1*w;
  p.hands[side].lerp(new Vector3(sign*.16,1.61,.72),w);
 }else if(tech.kind==='hook'){
  const angle=1.2-strike*1.55;
  const target=new Vector3(sign*Math.sin(angle)*.53,1.57,Math.cos(angle)*.53+.07);
  p.hands[side].lerp(target,envelope);
 }else if(tech.kind==='upper'){
  p.hip.y-=.075*envelope*(1-strike);
  p.hands[side].lerp(new Vector3(sign*.19,1.12+strike*.64,.3+strike*.3),envelope);
 }else{
  p.kick=side;
  p.hip.x=-sign*.18*envelope;p.hip.y-=.06*envelope;
  p.lean=-.13*w;
  const angle=1.1-strike*1.05;
  const height=tech.kind==='middle'?1.05:.43;
  const radius=.4+strike*.43;
  const target=new Vector3(sign*Math.sin(angle)*radius,height*(.5+.5*strike),Math.cos(angle)*radius);
  p.feet[side].lerp(target,envelope);
  p.hands[side].lerp(new Vector3(sign*.5,1.22,-.02),w*.6);
 }
 return p;
}
// Two-link IK keeps upper and lower limb lengths constant. Anatomical left is +X.
export function jointBetween(a:Vector3,b:Vector3,l1:number,l2:number,hint:Vector3):Vector3 {
 const dir=b.clone().sub(a), raw=dir.length(); dir.normalize();
 const d=Math.max(.001,Math.min(raw,l1+l2-.001));
 const along=(l1*l1-l2*l2+d*d)/(2*d);
 const perpendicular=hint.clone().sub(a).addScaledVector(dir,-hint.clone().sub(a).dot(dir)).normalize();
 return a.clone().addScaledVector(dir,along).addScaledVector(perpendicular,Math.sqrt(Math.max(0,l1*l1-along*along)));
}

