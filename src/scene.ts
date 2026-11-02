import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { guard, jointBetween, poseAt, duration, type Technique, type Pose } from './motion';
export class Arena {
 renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.PerspectiveCamera(36,1,.1,60); controls:OrbitControls;
 private observer:ResizeObserver; private frame=0; private last=0; private elapsed=0; private transition=0; private previous:Pose=guard(); private current:Pose=guard();
 technique?:Technique; playing=false; repeat=false; speed=1;
 private body:T.Mesh; private head:T.Mesh; private pelvis:T.Mesh; private neck:T.Mesh; private limbs:T.Mesh[][]=[]; private gloves:T.Mesh[]=[]; private shoes:T.Mesh[]=[]; private joints:T.Mesh[][]=[];
 private materials:T.Material[]=[]; private geometries:T.BufferGeometry[]=[];
 onProgress:(progress:number,playing:boolean)=>void=()=>{};
 private lost=(event:Event)=>{event.preventDefault();this.playing=false;this.onError('3D 그래픽 연결이 끊겼습니다. 페이지를 새로고침해 주세요.');};
 constructor(private host:HTMLElement,private onError:(message:string)=>void){
 this.renderer=new T.WebGLRenderer({antialias:true,alpha:true}); this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
 host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','회전 및 확대 가능한 3D 킥복싱 캐릭터');this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
 this.camera.position.set(3.4,2.3,6.2);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1,0);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=3;this.controls.maxDistance=9;this.controls.maxPolarAngle=Math.PI/2-.03;
 this.scene.add(new T.HemisphereLight(0xdfffe9,0x18231d,2.6));
 const key=new T.DirectionalLight(0xfff3dd,4);key.position.set(3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=4;key.shadow.camera.bottom=-3;key.shadow.bias=-.001;this.scene.add(key);
 const rim=new T.DirectionalLight(0xa3ff61,3);rim.position.set(-3,3,-3);this.scene.add(rim);
 const mat=(color:number,roughness=.6,metalness=.1)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});this.materials.push(m);return m;};
 const skin=mat(0xa8aca3),dark=mat(0x252d29),shorts=mat(0x171d19),lime=mat(0xc4f86b,.32),white=mat(0xf4efe4,.4);
 const sphere=(r:number,m:T.Material,sx=1,sy=1,sz=1)=>{const geo=new T.SphereGeometry(r,24,16);this.geometries.push(geo);const mesh=new T.Mesh(geo,m);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;this.scene.add(mesh);return mesh;};
 const bone=(r:number,m:T.Material)=>{const geo=new T.CylinderGeometry(r*.85,r,1,16);this.geometries.push(geo);const mesh=new T.Mesh(geo,m);mesh.castShadow=true;this.scene.add(mesh);return mesh;};
 this.body=sphere(1,dark,.29,.35,.17);this.pelvis=sphere(1,shorts,.27,.18,.18);this.head=sphere(1,skin,.145,.19,.145);this.neck=bone(.07,skin);
 // Headband and front-facing visor make orientation readable from every angle.
 const band=sphere(1,lime,1.015,.23,1.015);this.scene.remove(band);this.head.add(band);band.position.y=.4;
 const face=sphere(1,dark,.68,.12,.15);this.scene.remove(face);this.head.add(face);face.position.set(0,.06,.94);
 for(let i=0;i<2;i++){
 this.limbs.push([bone(.085,skin),bone(.067,skin),bone(.115,shorts),bone(.075,skin)]);
 this.gloves.push(sphere(1,i===0?lime:white,.115,.13,.15));
 this.shoes.push(sphere(1,dark,.095,.075,.19));
 this.joints.push([sphere(.079,skin),sphere(.087,skin)]);
 }
 const stageGeo=new T.CylinderGeometry(1.65,1.7,.09,80);this.geometries.push(stageGeo);const stage=new T.Mesh(stageGeo,mat(0x202b24));stage.position.y=-.055;stage.receiveShadow=true;this.scene.add(stage);
 const ringGeo=new T.TorusGeometry(1.61,.012,8,100);this.geometries.push(ringGeo);const ring=new T.Mesh(ringGeo,lime);ring.rotation.x=Math.PI/2;ring.position.y=.002;this.scene.add(ring);
 const grid=new T.GridHelper(3,12,0x45543b,0x303c33);grid.position.y=.002;this.scene.add(grid);
 this.scene.fog=new T.Fog(0x121a15,10,22);
 this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();this.animate(0);
 }
 private resize(){const {width,height}=this.host.getBoundingClientRect();this.renderer.setSize(width,height);this.camera.aspect=width/Math.max(height,1);this.camera.updateProjectionMatrix();}
 select(t:Technique){this.previous=this.current;this.transition=.18;this.technique=t;this.elapsed=0;this.playing=true;}
 replay(){if(this.technique)this.select(this.technique);}
 toggle(){if(this.elapsed>=duration)this.replay();else this.playing=!this.playing;}
 resetCamera(){this.camera.position.set(3.4,2.3,6.2);this.controls.target.set(0,1,0);this.controls.update();}
 private connect(mesh:T.Mesh,a:T.Vector3,b:T.Vector3){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=a.distanceTo(b);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}
 private apply(p:Pose){
 const rot=new T.Euler(p.lean,p.yaw,0);const at=(x:number,y:number,z:number)=>new T.Vector3(x,y,z).applyEuler(rot).add(p.hip);
 this.pelvis.position.copy(p.hip);this.pelvis.rotation.copy(rot);this.body.position.copy(at(0,.29,0));this.body.rotation.copy(rot);this.head.position.copy(at(0,.72,.015));this.head.rotation.copy(rot);this.connect(this.neck,at(0,.51,0),at(0,.58,0));
 for(let i=0;i<2;i++){
 const sign=i===0?1:-1,shoulder=at(sign*.25,.46,0),hip=at(sign*.15,-.04,0),hand=p.hands[i],foot=p.feet[i];
 const elbow=jointBetween(shoulder,hand,.32,.32,new T.Vector3(sign*.7,1.05,.1));
 const knee=jointBetween(hip,foot,.49,.49,new T.Vector3(sign*.42,.6,.8));
 this.connect(this.limbs[i][0],shoulder,elbow);this.connect(this.limbs[i][1],elbow,hand);this.connect(this.limbs[i][2],hip,knee);this.connect(this.limbs[i][3],knee,foot);
 this.joints[i][0].position.copy(elbow);this.joints[i][1].position.copy(knee);this.gloves[i].position.copy(hand);this.gloves[i].quaternion.setFromUnitVectors(new T.Vector3(0,0,1),hand.clone().sub(elbow).normalize());this.shoes[i].position.copy(foot);this.shoes[i].rotation.set(p.kick===i?-.45:0,p.yaw+(p.kick>=0&&p.kick!==i?-.7*(p.kick===0?1:-1):0),0);
 }
 }
 private animate=(now:number)=>{
 const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
 if(this.playing){this.elapsed+=dt*this.speed;if(this.elapsed>=duration){if(this.repeat)this.elapsed%=duration;else{this.elapsed=duration;this.playing=false;}}}
 const p=poseAt(this.technique,this.elapsed/duration);
 if(this.transition>0&&this.playing){this.transition=Math.max(0,this.transition-dt);const a=1-this.transition/.18;p.hip.lerpVectors(this.previous.hip,p.hip,a);p.yaw=T.MathUtils.lerp(this.previous.yaw,p.yaw,a);p.lean=T.MathUtils.lerp(this.previous.lean,p.lean,a);p.hands.forEach((h,i)=>h.lerpVectors(this.previous.hands[i],h,a));p.feet.forEach((f,i)=>f.lerpVectors(this.previous.feet[i],f,a));}
 else if(!this.playing&&this.transition>0){this.apply(this.current);this.controls.update();this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.animate);return;}
 this.current=p;this.apply(p);this.controls.update();this.renderer.render(this.scene,this.camera);this.onProgress(this.elapsed/duration,this.playing);this.frame=requestAnimationFrame(this.animate);
 };
 dispose(){cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){o.geometry.dispose();const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(x=>x.dispose());}});this.renderer.dispose();this.renderer.domElement.remove();}
}
