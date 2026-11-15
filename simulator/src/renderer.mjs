import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Landscape} from './world.mjs';
const B=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(0,1,0,0,0,0,-1,0,-1,0,0,0,0,0,0,1));
const A=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(0,0,1,0,-1,0,0,0,0,-1,0,0,0,0,0,1));
const v=(x,y,z)=>new THREE.Vector3(x,y,z);

function detailShader(material) {
 // Fine paint/metal finish. Geometry and authored PBR defaults are untouched.
 // This is a browser approximation of the source procedural bump, not a bake.
 if(material.name.includes('glass')||material.name.includes('CRT'))return;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vAircraftPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAircraftPosition=position;');
  shader.fragmentShader='varying vec3 vAircraftPosition;\nfloat finishHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float finish=finishHash(floor(vAircraftPosition*220.0));
    roughnessFactor=clamp(roughnessFactor+(finish-.5)*.035,.035,1.0);`);
 };
 material.customProgramCacheKey=()=> 'tomcat-finish-v2';
}
function cloneAircraft(source) {
 const clone=source.clone(true),materials=new Map();
 clone.traverse(o=>{if(o.isMesh){const original=o.material;if(!materials.has(original)){const mat=original.clone();detailShader(mat);materials.set(original,mat);}o.material=materials.get(original);o.castShadow=!o.material.name.includes('glass');o.receiveShadow=true;}});
 return clone;
}
export class FlightRenderer {
 constructor(element) {
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});
  this.renderer.setSize(innerWidth,innerHeight);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  element.appendChild(this.renderer.domElement);this.renderer.domElement.tabIndex=0;
  this.renderer.domElement.setAttribute('aria-label','Arrastra para girar la cámara; usa las flechas para pilotar');
  this.renderer.domElement.addEventListener('pointerdown',()=>this.renderer.domElement.focus());
  this.flightScene=new THREE.Scene();this.flightScene.fog=new THREE.FogExp2('#a4b9c2',.000025);
  this.studioScene=new THREE.Scene();this.studioScene.background=new THREE.Color('#18232d');
  this.camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.2,90000);
  this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=true;this.orbit.minDistance=12;this.orbit.maxDistance=180;this.orbit.enablePan=false;
  this.orbit.maxPolarAngle=Math.PI*.88;
  this.dirty=true;this.renderedFrames=0;this.orbit.addEventListener('change',()=>this.dirty=true);document.addEventListener('input',()=>this.dirty=true);document.addEventListener('change',()=>this.dirty=true);
  this.mode='orbit';this.tab='flight';this.quality='ultra';this.first=true;this.lastPosition=new THREE.Vector3();this.light='day';
  this.root=new THREE.Group();this.flightScene.add(this.root);this.parts={};this.autoRotate=false;
  this.makeStudio();window.addEventListener('resize',()=>this.resize());this.resize();
 }
 makeStudio(){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshStandardMaterial({color:'#303e48',roughness:.72,metalness:.08}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;this.studioScene.add(floor);
  this.studioScene.add(new THREE.HemisphereLight('#eff5ff','#3d4855',.35));
  const key=new THREE.DirectionalLight('#fff3e6',1.5);key.position.set(-15,25,-20);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:90});key.shadow.bias=-.00008;key.shadow.normalBias=.008;this.studioScene.add(key);this.studioKey=key;
  const fill=new THREE.DirectionalLight('#c8e5ff',.45);fill.position.set(12,8,8);this.studioScene.add(fill);
 }
 async load(progress){
  const loader=new GLTFLoader(),rgbe=new RGBELoader(),t=new THREE.TextureLoader();
  const [gltf,studioHDR,skyHDR,grass,rock,normal,rough,metadata]=await Promise.all([
   loader.loadAsync('assets/tomcat-original.glb',p=>progress?.(`Avión original · ${p.total?Math.round(p.loaded/p.total*100):0}%`)),
   rgbe.loadAsync('assets/environment/studio-small-09-2k.hdr'),rgbe.loadAsync('assets/environment/kloofendal-sky-2k.hdr'),
   t.loadAsync('assets/environment/grass-rock-albedo-2k.jpg'),t.loadAsync('assets/environment/rock-albedo-2k.jpg'),
   t.loadAsync('assets/environment/grass-rock-normal-2k.jpg'),t.loadAsync('assets/environment/grass-rock-roughness-2k.jpg'),
   fetch('assets/original-model.json').then(r=>{if(!r.ok)throw new Error('No se pudo verificar el modelo original');return r.json();})
  ]);
  progress?.('Preparando iluminación HDR y paisaje…');
  this.metadata=metadata;this.source=gltf.scene;this.gallery=cloneAircraft(this.source);this.gallery.rotation.y=Math.PI;this.studioScene.add(this.gallery);
  this.highModel=cloneAircraft(this.source);this.highModel.position.y=-2.2;this.root.add(this.highModel);this.model=this.highModel;
  this.partsForModel();
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.studioEnvironment=pmrem.fromEquirectangular(studioHDR);this.flightEnvironment=pmrem.fromEquirectangular(skyHDR);studioHDR.dispose();pmrem.dispose();
  this.studioScene.environment=this.studioEnvironment.texture;this.studioScene.environmentIntensity=.5;
  skyHDR.mapping=THREE.EquirectangularReflectionMapping;this.flightScene.background=skyHDR;this.flightScene.backgroundRotation.y=1.15;this.flightScene.backgroundIntensity=.8;this.flightScene.environment=this.flightEnvironment.texture;this.flightScene.environmentIntensity=.4;
  grass.colorSpace=rock.colorSpace=THREE.SRGBColorSpace;
  this.landscape=new Landscape(this.flightScene,{grass,rock,normal,rough});
  this.setQuality(this.quality);this.setTab(this.tab);
 }
 partsForModel(){for(const name of ['Port_wing','Starboard_wing','Port_tail','Starboard_tail','gear'])this.parts[name]=this.model.getObjectByName(name);}
 resize(){
  this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;
  const offset=document.body.classList.contains('focus-mode')?0:this.tab==='model'? (innerWidth>760?-.07:-.02) : this.mode==='pilot'?0:innerWidth>760?-.02:-.08;
  this.camera.setViewOffset(innerWidth,innerHeight,innerWidth*offset,0,innerWidth,innerHeight);this.camera.updateProjectionMatrix();this.first=true;this.dirty=true;
 }
 setTab(tab){
  this.tab=tab;this.orbit.enabled=tab==='model'||this.mode==='orbit';this.orbit.enablePan=tab==='model';this.orbit.minDistance=tab==='model'?1.2:15;this.orbit.maxDistance=tab==='model'?120:240;this.orbit.maxPolarAngle=tab==='model'?Math.PI:Math.PI*.88;
  this.camera.up.set(0,1,0);this.orbit.autoRotate=tab==='model'&&this.autoRotate;
  this.camera.near=tab==='model'?.04:.5;this.camera.far=tab==='model'?500:90000;this.renderer.toneMappingExposure=tab==='model'?.85:(this.light==='sunset'?.8:.9);
  this.resize();if(tab==='model'&&this.gallery)this.preset('hero');
 }
 setMode(mode){this.mode=mode;this.orbit.enabled=this.tab==='model'||mode==='orbit';this.camera.up.set(0,1,0);this.resize();}
 setQuality(quality){
  this.quality=quality;this.renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='ultra'?2:quality==='high'?1.5:1));
  this.renderer.shadowMap.enabled=quality!=='light'||this.tab==='model';
  if(this.landscape){this.landscape.sun.shadow.mapSize.set(quality==='ultra'?2048:1024,quality==='ultra'?2048:1024);}
  if(this.highModel)this.highModel.traverse(o=>{if(o.isMesh&&o.material.name.includes('glass')){o.material.transmission=quality==='ultra'?1:0;o.material.transparent=quality!=='ultra';o.material.opacity=quality==='ultra'?1:.20;o.material.depthWrite=quality==='ultra';o.material.needsUpdate=true;}});
  // The inspection tab always keeps the full geometry. Effects follow the user's quality setting.
  if(this.gallery)this.gallery.traverse(o=>{if(o.isMesh&&o.material.name.includes('glass')){o.material.transmission=quality==='ultra'?1:0;o.material.opacity=quality==='ultra'?1:.20;o.material.transparent=quality!=='ultra';o.material.depthWrite=quality==='ultra';}});
  this.resize();
 }
 setLight(light){this.light=light;this.landscape?.setLight(light);this.flightScene.backgroundIntensity=light==='sunset'?.42:.8;if(this.tab==='flight')this.renderer.toneMappingExposure=light==='sunset'?.8:.9;}
 preset(name){
  const mobile=innerWidth<760?1.85:1;
  const presets={hero:[[-25,9,-29],[0,2.1,0]],port:[[-30,4,0],[0,2.1,0]],front:[[0,5,-34],[0,2.1,0]],top:[[0,35,.01],[0,0,0]],cockpit:[[-3.8,5.1,-8.2],[0,2.7,-4.8]],gear:[[-3.0,1.6,-6.9],[0,.65,-5.4]],engines:[[-5,4,14],[0,2,7.5]],underside:[[-14,-14,14],[0,2,0]]};
  const [position,target]=presets[name]||presets.hero;const focus=new THREE.Vector3(...target),offset=new THREE.Vector3(...position).sub(focus).multiplyScalar(['hero','port','front','top','underside'].includes(name)?mobile:1);
  this.camera.up.set(0,1,0);this.camera.position.copy(focus).add(offset);this.orbit.target.copy(focus);this.orbit.update();this.first=false;
 }
 cutaway(mode){
  this.dirty=true;
  const canopy=this.gallery?.getObjectByName('canopy'),covers=this.gallery?.getObjectByName('covers');
  if(canopy)canopy.visible=mode!=='cockpit';if(covers)covers.visible=mode!=='structure';
 }
 setWireframe(value){this.dirty=true;this.gallery?.traverse(o=>{if(o.isMesh)o.material.wireframe=value;});}
 setRotate(value){this.dirty=true;this.autoRotate=value;this.orbit.autoRotate=this.tab==='model'&&value;this.orbit.autoRotateSpeed=.6;}
 update(sim,dt,active=false){
  if(this.tab==='model'){
   if(this.first)this.preset('hero');this.orbit.update(dt);this.renderer.shadowMap.enabled=this.quality!=='light';if(this.dirty||this.autoRotate){this.renderer.render(this.studioScene,this.camera);this.renderedFrames++;this.dirty=false;}return;
  }
  const s=sim.state,c=sim.controls,pos=v(s[1],-s[2],-s[0]);this.root.position.copy(pos);
  this.root.quaternion.copy(B).multiply(new THREE.Quaternion(s[7],s[8],s[9],s[6])).multiply(A);
  if(this.parts.Port_wing)this.parts.Port_wing.rotation.y=c.sweep*.78;
  if(this.parts.Starboard_wing)this.parts.Starboard_wing.rotation.y=-c.sweep*.78;
  for(const name of ['Port_tail','Starboard_tail'])if(this.parts[name])this.parts[name].rotation.x=c.elevator*.3;
  if(this.parts.gear)this.parts.gear.visible=c.gear>.5;
  const shift=pos.clone().sub(this.lastPosition),zoom=innerWidth<=760?1.8:1;
  if(this.mode==='orbit'){
   if(this.first){this.camera.position.copy(pos).add(v(28,11,37).multiplyScalar(zoom));this.orbit.target.copy(pos);this.first=false;}else{this.camera.position.add(shift);this.orbit.target.copy(pos);}
   this.orbit.update(dt);
  }else if(this.mode==='chase'){
   const forward=v(0,0,1).applyQuaternion(this.root.quaternion),desired=pos.clone().addScaledVector(forward,-38*zoom).add(v(0,10*zoom,0));
   if(this.first){this.camera.position.copy(desired);this.first=false;}else this.camera.position.lerp(desired,1-Math.exp(-dt*5));
   this.camera.up.set(0,1,0);this.camera.lookAt(pos.clone().addScaledVector(forward,25));
  }else{
   this.camera.position.copy(pos).add(v(0,1,5.1).applyQuaternion(this.root.quaternion));this.camera.up.copy(v(0,1,0).applyQuaternion(this.root.quaternion));this.camera.lookAt(this.camera.position.clone().add(v(0,0,100).applyQuaternion(this.root.quaternion)));
  }
  this.model.visible=this.mode!=='pilot';this.lastPosition.copy(pos);this.renderer.shadowMap.enabled=this.quality!=='light';this.landscape.update(pos,active?dt:0,this.quality);if(this.dirty||active){this.renderer.render(this.flightScene,this.camera);this.renderedFrames++;this.dirty=false;}
 }
 diagnostics(){return {tab:this.tab,quality:this.quality,renderedFrames:this.renderedFrames,originalTriangles:this.metadata?.source_evaluated_triangles,originalObjects:this.metadata?.source_objects,originalSimplified:false,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}
