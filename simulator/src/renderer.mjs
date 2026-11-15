import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Landscape} from './world.mjs';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {loadEnvironment} from './environment.mjs';
import {batchRigidParts} from './rigid-batches.mjs';
const B=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(0,1,0,0,0,0,-1,0,-1,0,0,0,0,0,0,1));
const A=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(0,0,1,0,-1,0,0,0,0,-1,0,0,0,0,0,1));
const v=(x,y,z)=>new THREE.Vector3(x,y,z);

function cloneAircraft(source,evolved=true) {
 const clone=source.clone(true),materials=new Map();
 clone.traverse(o=>{if(o.isMesh){const original=o.material;if(!materials.has(original)){const mat=original.clone();if(mat.aoMap)mat.aoMapIntensity=.55;if(evolved&&mat.name.startsWith('Gauge_glass'))mat.userData.thinLens=true;materials.set(original,mat);}o.material=materials.get(original);o.castShadow=!o.material.name.includes('glass');o.receiveShadow=true;}});
 return clone;
}
export class FlightRenderer {
 constructor(element) {
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});
  this.renderer.setSize(innerWidth,innerHeight);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;
  this.renderer.info.autoReset=false;this.frameStats={};this.modelVersion='original';this.assetLoading=false;this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  element.appendChild(this.renderer.domElement);this.renderer.domElement.tabIndex=0;
  this.renderer.domElement.setAttribute('aria-label','Arrastra para girar la cámara; usa las flechas para pilotar');
  this.renderer.domElement.addEventListener('pointerdown',()=>{this.renderer.domElement.focus();this.presetTransition=null;});
  this.flightScene=new THREE.Scene();this.flightScene.fog=new THREE.FogExp2('#a4b9c2',.000025);
  this.studioScene=new THREE.Scene();this.studioScene.background=new THREE.Color('#18232d');this.studioScene.fog=new THREE.FogExp2('#18232d',.012);
  this.camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.2,90000);
  this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=true;this.orbit.minDistance=12;this.orbit.maxDistance=180;this.orbit.enablePan=false;
  this.orbit.maxPolarAngle=Math.PI*.88;
  this.dirty=true;this.renderedFrames=0;this.orbit.addEventListener('change',()=>this.dirty=true);document.addEventListener('input',()=>this.dirty=true);document.addEventListener('change',()=>this.dirty=true);
  this.mode='orbit';this.tab='flight';this.quality='ultra';this.first=true;this.lastPosition=new THREE.Vector3();this.light='day';
  this.root=new THREE.Group();this.flightScene.add(this.root);this.parts={};this.autoRotate=false;
  this.makeStudio();window.addEventListener('resize',()=>this.resize());this.resize();
 }
 makeStudio(){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({color:'#18232d',roughness:.72,metalness:.08}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;this.studioScene.add(floor);
  this.studioScene.add(new THREE.HemisphereLight('#eff5ff','#3d4855',.35));
  const key=new THREE.DirectionalLight('#fff3e6',1.5);key.position.set(-15,25,-20);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:90});key.shadow.bias=-.00015;key.shadow.normalBias=.035;this.studioScene.add(key);this.studioKey=key;
  const fill=new THREE.DirectionalLight('#c8e5ff',.45);fill.position.set(12,8,8);this.studioScene.add(fill);
 }
 async load(progress){
  this.loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const t=new THREE.TextureLoader();
  const [gltf,skyHDR,grass,rock,normal,rough,metadata,evolved,pmrem]=await Promise.all([
   this.loader.loadAsync('assets/tomcat-evolved.meshopt.glb',p=>progress?.(`Modelo evolucionado · ${p.total?Math.round(p.loaded/p.total*100):0}%`)),
   new RGBELoader().loadAsync('assets/environment/kloofendal-sky-2k.hdr'),
   t.loadAsync('assets/environment/grass-rock-albedo-2k.jpg'),t.loadAsync('assets/environment/rock-albedo-2k.jpg'),
   t.loadAsync('assets/environment/grass-rock-normal-2k.jpg'),t.loadAsync('assets/environment/grass-rock-roughness-2k.jpg'),
   fetch('assets/original-model.json').then(r=>r.json()),fetch('assets/evolved-model.json').then(r=>r.json()),fetch('assets/environment/pmrem.json').then(r=>r.json())
  ]);
  progress?.('Preparando materiales y paisaje…');this.metadata=metadata;this.evolvedMetadata=evolved;
  this.source=gltf.scene;this.highModel=cloneAircraft(this.source);this.highModel.position.y=-2.2;this.root.add(this.highModel);this.model=this.highModel;
  this.evolvedGallery=cloneAircraft(this.source);this.evolvedGallery.rotation.y=Math.PI;this.evolvedGallery.visible=false;this.studioScene.add(this.evolvedGallery);
  this.partsForModel();
  if(this.renderer.extensions.has('WEBGL_multi_draw'))this.rigidBatches=batchRigidParts(this.highModel);
  this.pmremManifest=pmrem;this.flightEnvironment=await loadEnvironment(this.renderer,'kloofendal-sky',pmrem);
  this.studioScene.environmentIntensity=.5;
  skyHDR.mapping=THREE.EquirectangularReflectionMapping;this.flightScene.background=skyHDR;this.flightScene.backgroundRotation.y=1.15;this.flightScene.backgroundIntensity=.8;this.flightScene.environment=this.flightEnvironment;this.flightScene.environmentIntensity=.4;
  grass.colorSpace=rock.colorSpace=THREE.SRGBColorSpace;this.landscape=new Landscape(this.flightScene,{grass,rock,normal,rough});
  this.setQuality(this.quality);this.setTab(this.tab);
 }
 async selectModel(version='original'){
  this.modelVersion=version;if(!this.studioEnvironment){this.studioEnvironment=await loadEnvironment(this.renderer,'studio-small-09',this.pmremManifest);this.studioScene.environment=this.studioEnvironment;}
  if(this.gallery)this.gallery.visible=false;this.evolvedGallery.visible=false;
  if(version==='original'&&!this.originalGallery){
   this.assetLoading=true;
   try{const gltf=await this.loader.loadAsync('assets/tomcat-original.meshopt.glb');this.originalGallery=cloneAircraft(gltf.scene,false);this.originalGallery.rotation.y=Math.PI;this.originalGallery.visible=false;this.studioScene.add(this.originalGallery);this.actualOriginalTriangles=0;this.originalGallery.traverse(o=>{if(o.isMesh)this.actualOriginalTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});}
   finally{this.assetLoading=false;}
  }
  this.gallery=version==='original'?this.originalGallery:this.evolvedGallery;this.gallery.visible=true;
  this.setQuality(this.quality);this.cutaway(document.getElementById('cutaway').value);this.setWireframe(document.getElementById('wireframe').checked);this.preset('hero');this.dirty=true;
 }
 partsForModel(){for(const name of ['Port_wing','Starboard_wing','Port_tail','Starboard_tail','Port_rudder','Starboard_rudder','Nose_gear','Port_gear','Starboard_gear','Nose_doors_Port','Nose_doors_Starboard','Port_doors','Starboard_doors',...['Port','Starboard'].flatMap(s=>[1,2,3].map(i=>s+'_flap_'+i))])this.parts[name]=this.model.getObjectByName(name);this.partOrigins=new Map(Object.values(this.parts).filter(Boolean).map(p=>[p,p.position.clone()]));}
 render(scene){
  if(scene===this.flightScene)this.rigidBatches?.update();
  this.renderer.info.reset();const began=performance.now();this.renderer.render(scene,this.camera);
  this.frameStats={cpuSubmitMs:performance.now()-began,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,textures:this.renderer.info.memory.textures,geometries:this.renderer.info.memory.geometries};this.renderedFrames++;this.dirty=false;
 }
 resize(){
  this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;
  const offset=document.body.classList.contains('focus-mode')?0:this.tab==='model'? (innerWidth>760?-.07:-.02) : this.mode==='pilot'?0:innerWidth>760?-.02:-.08;
  this.camera.setViewOffset(innerWidth,innerHeight,innerWidth*offset,this.tab==='flight'&&innerWidth<=760&&this.mode!=='pilot'?innerHeight*.16:0,innerWidth,innerHeight);this.camera.updateProjectionMatrix();this.first=true;this.dirty=true;
 }
 setTab(tab){
  this.tab=tab;this.orbit.enabled=tab==='model'||this.mode==='orbit';this.orbit.enablePan=tab==='model';this.orbit.minDistance=tab==='model'?1.2:15;this.orbit.maxDistance=tab==='model'?120:240;this.orbit.maxPolarAngle=tab==='model'?Math.PI:Math.PI*.88;
  this.camera.up.set(0,1,0);this.orbit.autoRotate=tab==='model'&&this.autoRotate&&!this.reducedMotion;
  this.camera.near=tab==='model'||this.mode==='pilot'?.04:.5;this.camera.far=tab==='model'?500:90000;this.camera.fov=tab==='flight'&&this.mode==='pilot'?62:42;this.renderer.toneMappingExposure=tab==='model'?.85:(this.light==='sunset'?.8:.9);
  this.resize();if(tab==='model'&&this.gallery)this.preset('hero');
 }
 setMode(mode){
  const changed=mode!==this.mode;if(changed&&!this.reducedMotion)this.cameraTransition={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),elapsed:0};
  this.mode=mode;this.orbit.enabled=this.tab==='model'||mode==='orbit';this.camera.up.set(0,1,0);this.resize();
  this.camera.fov=mode==='pilot'?62:42;this.camera.near=mode==='pilot'?.04:.5;this.camera.updateProjectionMatrix();
  if(changed&&mode==='orbit'){this.first=false;this.orbit.target.copy(this.lastPosition);this.cameraTransition=null;}
 }
 setQuality(quality){
  this.quality=quality;this.renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='ultra'?2:quality==='high'?1.5:1));
  this.renderer.shadowMap.enabled=quality!=='light'||this.tab==='model';
  if(this.landscape){this.landscape.sun.shadow.mapSize.set(quality==='ultra'?2048:1024,quality==='ultra'?2048:1024);}
  if(this.highModel)this.highModel.traverse(o=>{if(o.isMesh&&o.material.name.includes('glass')){o.material.transmission=quality==='ultra'?1:0;o.material.transparent=quality!=='ultra';o.material.opacity=quality==='ultra'?1:.20;o.material.depthWrite=quality==='ultra';o.material.needsUpdate=true;}});
  // The inspection tab always keeps the full geometry. Effects follow the user's quality setting.
  for(const gallery of [this.originalGallery,this.evolvedGallery].filter(Boolean))gallery.traverse(o=>{if(o.isMesh&&o.material.name.includes('glass')){o.material.transmission=quality==='ultra'?1:0;o.material.opacity=quality==='ultra'?1:.20;o.material.transparent=quality!=='ultra';o.material.depthWrite=quality==='ultra';o.material.needsUpdate=true;}});
  // Sub-millimetre instrument lenses use a thin transparent approximation.
  // Screen-space transmission blurred the geometric dial marks at close range.
  for(const model of [this.highModel,this.evolvedGallery].filter(Boolean))model.traverse(o=>{if(o.isMesh&&o.material.userData.thinLens){Object.assign(o.material,{transmission:0,transparent:true,opacity:.075,roughness:.04,clearcoat:1,clearcoatRoughness:.03,depthWrite:false,side:THREE.FrontSide});o.material.needsUpdate=true;}});
  this.resize();
 }
 setLight(light){this.light=light;this.landscape?.setLight(light);this.flightScene.backgroundIntensity=light==='sunset'?.42:.8;if(this.tab==='flight')this.renderer.toneMappingExposure=light==='sunset'?.8:.9;}
 preset(name,animate=false){
  const startPosition=this.camera.position.clone(),startTarget=this.orbit.target.clone();
  const mobile=innerWidth<760?1.85:1;
  const presets={hero:[[-25,9,-29],[0,2.1,0]],port:[[-30,4,0],[0,2.1,0]],front:[[0,5,-34],[0,2.1,0]],top:[[0,35,.01],[0,0,0]],cockpit:[[-3.8,5.1,-8.2],[0,2.7,-4.8]],'pilot-panel':[[.35,3.25,-5.0],[0,2.85,-5.73]],'rear-panel':[[.35,3.25,-3.5],[0,2.85,-4.28]],gear:[[-3.0,1.6,-6.9],[0,.65,-5.4]],engines:[[-5,4,14],[0,2,7.5]],underside:[[-14,-14,14],[0,2,0]]};
  const [position,target]=presets[name]||presets.hero;const focus=new THREE.Vector3(...target),offset=new THREE.Vector3(...position).sub(focus).multiplyScalar(['hero','port','front','top','underside'].includes(name)?mobile:1);
  if(animate&&!this.reducedMotion){const from=startPosition.clone().sub(startTarget);this.presetTransition={startTarget,endTarget:focus,from:from.normalize(),turn:new THREE.Quaternion().setFromUnitVectors(from,offset.clone().normalize()),startRadius:startPosition.distanceTo(startTarget),endRadius:offset.length(),elapsed:0};this.camera.position.copy(startPosition);this.orbit.target.copy(startTarget);}
  else{this.camera.position.copy(focus).add(offset);this.orbit.target.copy(focus);this.presetTransition=null;}
  this.camera.up.set(0,1,0);this.orbit.update();this.first=false;this.dirty=true;
 }
 cutaway(mode){
  this.dirty=true;
  const canopy=this.gallery?.getObjectByName('canopy'),covers=this.gallery?.getObjectByName('covers');
  if(canopy)canopy.visible=mode!=='cockpit';if(covers)covers.visible=mode!=='structure';
 }
 setWireframe(value){this.dirty=true;this.gallery?.traverse(o=>{if(o.isMesh)o.material.wireframe=value;});}
 setRotate(value){this.dirty=true;this.autoRotate=value;this.orbit.autoRotate=this.tab==='model'&&value&&!this.reducedMotion;this.orbit.autoRotateSpeed=.6;}
 update(sim,dt,active=false){
  if(this.tab==='model'){
   if(this.first)this.preset('hero');
   if(this.presetTransition){const t=this.presetTransition;t.elapsed+=dt;const a=Math.min(1,t.elapsed/.65),s=a*a*(3-2*a);this.orbit.target.lerpVectors(t.startTarget,t.endTarget,s);const direction=t.from.clone().applyQuaternion(new THREE.Quaternion().slerp(t.turn,s));this.camera.position.copy(this.orbit.target).addScaledVector(direction,THREE.MathUtils.lerp(t.startRadius,t.endRadius,s));this.dirty=true;if(a===1)this.presetTransition=null;}
   this.orbit.update(dt);this.renderer.shadowMap.enabled=this.quality!=='light';if(this.dirty||(this.autoRotate&&!this.reducedMotion))this.render(this.studioScene);return;
  }
  const f=Math.max(0,Math.min(1,sim.accumulator*120)),s=active?sim.state.map((v,i)=>i<3?sim.previousState[i]*(1-f)+v*f:v):sim.state,c=sim.applied||sim.controls,pos=v(s[1],-s[2],-s[0]);this.root.position.copy(pos);
  this.root.quaternion.copy(B).multiply(new THREE.Quaternion(s[7],s[8],s[9],s[6])).multiply(A);
  if(this.parts.Port_wing)this.parts.Port_wing.rotation.y=c.sweep*.78;
  if(this.parts.Starboard_wing)this.parts.Starboard_wing.rotation.y=-c.sweep*.78;
  for(const [side,sign] of [['Port',1],['Starboard',-1]]){const tail=this.parts[side+'_tail'];if(tail)tail.rotation.x=c.elevator*.3+sign*c.aileron*.3;const rudder=this.parts[side+'_rudder'];if(rudder)rudder.quaternion.setFromAxisAngle(new THREE.Vector3(...rudder.userData.hinge_axis),-c.rudder*.6);}
  for(const side of ['Port','Starboard'])for(let i=1;i<=3;i++){
   const p=this.parts[side+'_flap_'+i];if(p)p.quaternion.setFromAxisAngle(new THREE.Vector3(...p.userData.hinge_axis),p.userData.hinge_sign*c.flaps*.52);
  }
  const folded=1-c.gear,phase=Math.min(1,folded/.8),door=Math.max(0,(folded-.8)/.2);
  for(const [name,axis,sign] of [['Nose_gear','x',-1],['Port_gear','z',-1],['Starboard_gear','z',1]]){
   const p=this.parts[name];if(p){p.rotation[axis]=sign*phase*Math.PI*.5;p.visible=folded<.999;p.position.copy(this.partOrigins.get(p));}
  }
  for(const [name,sign] of [['Nose_doors_Port',-1],['Nose_doors_Starboard',1],['Port_doors',-1],['Starboard_doors',1]]){const p=this.parts[name];if(p)p.rotation.z=sign*door*1.3;}
  const contacts=sim.read().contactData;
  for(const [index,name] of ['Nose_gear','Port_gear','Starboard_gear'].entries()){const p=this.parts[name];if(p&&c.gear>.95)p.position.y+=Math.min(.22,contacts[index]?.compression||0);}

  const shift=pos.clone().sub(this.lastPosition),zoom=innerWidth<=760?1.8:1;
  if(this.mode==='orbit'){
   if(this.first){this.camera.position.copy(pos).add(v(28,11,37).multiplyScalar(zoom));this.orbit.target.copy(pos);this.first=false;}else{this.camera.position.add(shift);this.orbit.target.copy(pos);}
   this.orbit.update(dt);
  }else if(this.mode==='chase'){
   const forward=v(0,0,1).applyQuaternion(this.root.quaternion),desired=pos.clone().addScaledVector(forward,-38*zoom).add(v(0,10*zoom,0));
   if(this.first){this.camera.position.copy(desired);this.first=false;}else this.camera.position.lerp(desired,1-Math.exp(-dt*5));
   this.camera.up.set(0,1,0);const look=pos.clone().addScaledVector(forward,25);this.lookTarget??=look.clone();this.lookTarget.lerp(look,1-Math.exp(-dt*6));this.camera.lookAt(this.lookTarget);
  }else{
   this.camera.position.copy(pos).add(v(0,1.04,5.2).applyQuaternion(this.root.quaternion));this.camera.up.copy(v(0,1,0).applyQuaternion(this.root.quaternion));this.camera.lookAt(this.camera.position.clone().add(v(0,0,100).applyQuaternion(this.root.quaternion)));
  }
  if(this.cameraTransition){const t=this.cameraTransition;t.elapsed+=dt;const a=Math.min(1,t.elapsed/.65),s=a*a*(3-2*a),desired=this.camera.quaternion.clone();this.camera.position.lerpVectors(t.position,this.camera.position,s);this.camera.quaternion.slerpQuaternions(t.quaternion,desired,s);this.dirty=true;if(a===1)this.cameraTransition=null;}
  this.model.visible=true;this.lastPosition.copy(pos);this.renderer.shadowMap.enabled=this.quality!=='light';this.landscape.update(pos,active?dt:0,this.quality);if(this.dirty||active)this.render(this.flightScene);
 }
 diagnostics(){return {tab:this.tab,quality:this.quality,renderedFrames:this.renderedFrames,originalTriangles:this.metadata?.source_evaluated_triangles,originalObjects:this.metadata?.source_objects,originalSimplified:false,evolvedTriangles:this.evolvedMetadata?.triangles,modelVersion:this.modelVersion,assetLoading:this.assetLoading,originalLoaded:!!this.originalGallery,actualOriginalTriangles:this.actualOriginalTriangles||0,treeCount:this.landscape?.treeCount,vegetationChunks:this.landscape?.vegetationChunks.length,terrainTriangles:this.landscape?.terrainRings.triangles,rigidBatching:!!this.rigidBatches,rigidBatchStats:this.rigidBatches?.stats,...this.frameStats,gpuMs:null};}
}
