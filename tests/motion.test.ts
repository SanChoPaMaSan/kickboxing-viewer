import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {techniques,poseAt,guard,jointBetween} from '../src/motion.ts';
test('ten cards with the requested anatomical sides and order',()=>{
 assert.equal(techniques.length,10);assert.equal(new Set(techniques.map(t=>t.id)).size,10);
 assert.deepEqual(techniques.filter(t=>t.side===0).map(t=>t.kind),['straight','hook','upper','middle','low']);
 assert.deepEqual(techniques.filter(t=>t.side===1).map(t=>t.kind),['straight','hook','upper','middle','low']);
});
test('all motions start and end at the exact guard, with continuous finite poses',()=>{
 for(const tech of techniques){assert.deepEqual(poseAt(tech,0),guard());assert.deepEqual(poseAt(tech,1),guard());let prev=poseAt(tech,0);
 for(let n=1;n<=240;n++){const p=poseAt(tech,n/240);for(const [i,v]of [...p.hands,...p.feet].entries()){assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.distanceTo([...prev.hands,...prev.feet][i])<.06,tech.id+' discontinuity');}prev=p;}}
});
test('selected limb moves; opposite hand or support foot remains in place',()=>{
 for(const t of techniques){const p=poseAt(t,.5),g=guard();const kick=t.kind==='middle'||t.kind==='low';const a=kick?p.feet:p.hands,b=kick?g.feet:g.hands;assert.ok(a[t.side].distanceTo(b[t.side])>.2);assert.deepEqual(a[1-t.side],b[1-t.side]);}
});
test('middle kicks are higher than low kicks and hooks differ from uppercuts',()=>{
 for(const side of [0,1] as const){const get=(kind:string,t:number)=>poseAt(techniques.find(x=>x.side===side&&x.kind===kind),t);assert.ok(get('middle',.5).feet[side].y-get('low',.5).feet[side].y>.5);assert.ok(get('hook',.22).hands[side].y-get('upper',.22).hands[side].y>.3);}
});
test('limb endpoints stay within joint reach over all frames',()=>{
 for(const t of techniques)for(let n=0;n<=100;n++){const p=poseAt(t,n/100),rot=new Euler(p.lean,p.yaw,0);for(const side of [0,1]){const sign=side===0?1:-1;const shoulder=new Vector3(sign*.25,.46,0).applyEuler(rot).add(p.hip);const hip=new Vector3(sign*.15,-.04,0).applyEuler(rot).add(p.hip);assert.ok(shoulder.distanceTo(p.hands[side])<=.64,t.id+' arm reach '+n);assert.ok(hip.distanceTo(p.feet[side])<=.98,t.id+' leg reach '+n);}}
});
test('IK preserves both segment lengths for reachable targets',()=>{const a=new Vector3(0,0,0),b=new Vector3(0,.5,0),j=jointBetween(a,b,.32,.32,new Vector3(1,0,0));assert.ok(Math.abs(j.distanceTo(a)-.32)<1e-8);assert.ok(Math.abs(j.distanceTo(b)-.32)<1e-8);});
