import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const color=c=>new THREE.Color(c);
const B=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(0,1,0,0,0,0,-1,0,-1,0,0,0,0,0,0,1));
const A=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(0,0,1,0,-1,0,0,0,0,-1,0,0,0,0,0,1));
export class FlightRenderer {
 constructor(element) {
  this.scene=new THREE.Scene();this.scene.background=color('#b6d1e0');this.scene.fog=new THREE.FogExp2('#bdd1d7',.000025);
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
  element.appendChild(this.renderer.domElement);
  this.camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,1,100000);
  this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=true;this.orbit.minDistance=15;this.orbit.maxDistance=300;this.orbit.enablePan=false;
  this.orbit.maxPolarAngle=Math.PI*.78;
  this.mode='orbit';this.root=new THREE.Group();this.scene.add(this.root);this.parts={};this.lastPosition=new THREE.Vector3();this.first=true;
  this.scene.add(new THREE.HemisphereLight('#e6f4ff','#8e907c',1.8));
  const sun=new THREE.DirectionalLight('#fff1d7',2);sun.position.set(-400,800,-200);this.scene.add(sun);
  this.landscape();window.addEventListener('resize',()=>this.resize());this.resize();
 }
 resize(){
  this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;
  this.camera.setViewOffset(innerWidth,innerHeight,this.mode==='pilot'?0:(innerWidth>700?-innerWidth*.12: -innerWidth*.27),0,innerWidth,innerHeight);this.camera.updateProjectionMatrix();this.first=true;
 }
 landscape(){
  // Procedural fictional landscape; no external map imagery or real-airfield data.
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(240000,240000),new THREE.MeshStandardMaterial({color:'#638c99',roughness:.42,metalness:.18}));sea.rotation.x=-Math.PI/2;sea.position.y=-8;this.scene.add(sea);
  const land=new THREE.Shape();const radius=12500;
  for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=radius*(1+.12*Math.sin(a*5)+.08*Math.cos(a*9));const x=Math.cos(a)*r,z=Math.sin(a)*r;i?land.lineTo(x,z):land.moveTo(x,z);}
  const island=new THREE.Mesh(new THREE.ShapeGeometry(land),new THREE.MeshStandardMaterial({color:'#a4ab84',roughness:1}));island.rotation.x=-Math.PI/2;this.scene.add(island);
  const mountains=new THREE.PlaneGeometry(22000,9000,70,30);mountains.rotateX(-Math.PI/2);
  const pos=mountains.attributes.position,colors=[];
  for(let i=0;i<pos.count;i++) {
   const x=pos.getX(i),z=pos.getZ(i)-9500;
   const envelope=Math.sin(Math.PI*(pos.getZ(i)+4500)/9000)**2;
   const h=Math.max(0,envelope*(450+260*Math.sin(x*.0007)+180*Math.cos(x*.0019+z*.0015)+150*Math.sin(z*.002)));
   pos.setY(i,h+1);pos.setZ(i,z);
   const c=color('#7c8c76').lerp(color('#b7b69a'),h/1100);colors.push(c.r,c.g,c.b);
  }
  mountains.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mountains.computeVertexNormals();
  this.scene.add(new THREE.Mesh(mountains,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1})));
  const plane=(w,l,c,x,z,y=.05)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),new THREE.MeshStandardMaterial({color:c,roughness:1}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);this.scene.add(m);return m;};
  plane(90,4200,'#87907c',0,-1500);plane(44,3600,'#4e5757',0,-1400,.12);
  for(let i=0;i<36;i++)plane(1,30,'#e9e6cf',0,200-i*95,.14);
  for(const s of [-1,1]){plane(.7,3520,'#e3e2d1',s*20,-1400,.14);for(let j=0;j<5;j++)plane(2,40,'#f3f0d7',s*(4+j*3),270,.15);}
  plane(18,1000,'#73796b',130,-100);plane(500,240,'#8b907d',300,300);
  const hangarMat=new THREE.MeshStandardMaterial({color:'#c6c5af',roughness:.8});
  for(let i=0;i<7;i++){const h=new THREE.Mesh(new THREE.BoxGeometry(50,16,65),hangarMat);h.position.set(250+i*80,8,380);this.scene.add(h);}
  // Sparse original low-poly clouds, kept well clear of the local starting position.
  const cloudMat=new THREE.MeshBasicMaterial({color:'#f2f1e7',transparent:true,opacity:.42,depthWrite:false});
  for(let i=0;i<28;i++) {
   const a=i*2.399,r=18000+(i%6)*3500;
   const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),cloudMat);mesh.position.set(Math.cos(a)*r,3600+(i%4)*450,Math.sin(a)*r);mesh.scale.set(1100+(i%3)*350,150,700);this.scene.add(mesh);
  }
 }
 async load(onProgress) {
  const gltf=await new GLTFLoader().loadAsync('assets/tomcat.glb',p=>onProgress?.(p.total?Math.round(p.loaded/p.total*100):0));
  this.model=gltf.scene;this.model.position.y=-2.2;this.root.add(this.model);
  for(const n of ['Port_wing','Starboard_wing','Port_tail','Starboard_tail','gear'])this.parts[n]=this.model.getObjectByName(n);
  this.model.traverse(o=>{if(o.isMesh){o.frustumCulled=true;if(o.material.name.includes('glass')){o.material.transparent=true;o.material.opacity=.22;o.material.depthWrite=false;o.material.transmission=0;}}});
 }
 setMode(mode){this.mode=mode;this.first=true;this.orbit.enabled=mode==='orbit';this.resize();}
 update(sim,dt) {
  const s=sim.state,c=sim.controls,pos=new THREE.Vector3(s[1],-s[2],-s[0]);
  this.root.position.copy(pos);
  const orientation=new THREE.Quaternion(s[7],s[8],s[9],s[6]);this.root.quaternion.copy(B).multiply(orientation).multiply(A);
  // Visual wing rotation is an illustrative rig. All wing markings follow the same parent.
  if(this.parts.Port_wing)this.parts.Port_wing.rotation.y=c.sweep*.78;
  if(this.parts.Starboard_wing)this.parts.Starboard_wing.rotation.y=-c.sweep*.78;
  for(const n of ['Port_tail','Starboard_tail'])if(this.parts[n])this.parts[n].rotation.x=c.elevator*.3;
  if(this.parts.gear)this.parts.gear.visible=c.gear>.5;
  const shift=pos.clone().sub(this.lastPosition);
  if(this.mode==='orbit') {
   if(this.first){this.camera.position.copy(pos).add(new THREE.Vector3(-28,10,-34).multiplyScalar(innerWidth<=700?3.4:1));this.orbit.target.copy(pos);this.first=false;}
   else {this.camera.position.add(shift);this.orbit.target.copy(pos);}
   this.orbit.update();
  } else if(this.mode==='chase') {
   const forward=new THREE.Vector3(0,0,1).applyQuaternion(this.root.quaternion);
   const zoom=innerWidth<=700?3.4:1;
   const desired=pos.clone().addScaledVector(forward,-40*zoom).add(new THREE.Vector3(0,11*zoom,0));
   if(this.first){this.camera.position.copy(desired);this.first=false;}else this.camera.position.lerp(desired,1-Math.exp(-dt*5));
   this.camera.up.set(0,1,0);this.camera.lookAt(pos.clone().addScaledVector(forward,20));
  } else {
   const offset=new THREE.Vector3(0,1,5.1).applyQuaternion(this.root.quaternion);
   this.camera.position.copy(pos).add(offset);
   this.camera.up.copy(new THREE.Vector3(0,1,0).applyQuaternion(this.root.quaternion));
   this.camera.lookAt(this.camera.position.clone().add(new THREE.Vector3(0,0,100).applyQuaternion(this.root.quaternion)));
  }
  this.model.visible=this.mode!=='pilot';this.lastPosition.copy(pos);
  this.renderer.render(this.scene,this.camera);
 }
}
