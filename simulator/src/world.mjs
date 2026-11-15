import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {terrainHeight,noise2,fbm,WATER_HEIGHT} from './terrain.mjs';
const C=x=>new THREE.Color(x);
function seeded(seed=73){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function texture(canvas,srgb=true){const t=new THREE.CanvasTexture(canvas);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export class Landscape {
 constructor(scene,textures) {
  this.scene=scene;this.group=new THREE.Group();scene.add(this.group);this.time=0;this.daylight='day';
  this.sun=new THREE.DirectionalLight('#fff3dd',2.5);this.sun.position.set(-1800,3600,2400);this.sun.castShadow=true;
  this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-35;this.sun.shadow.camera.right=35;this.sun.shadow.camera.top=35;this.sun.shadow.camera.bottom=-35;this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=8000;this.sun.shadow.bias=-.00012;this.sun.shadow.normalBias=.035;scene.add(this.sun,this.sun.target);
  this.ambient=new THREE.HemisphereLight('#dcefff','#737e55',.5);scene.add(this.ambient);
  this.terrain(textures);this.ocean();this.airport();this.vegetation();
 }
 terrain(tex) {
  const g=new THREE.PlaneGeometry(40000,40000,512,512);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=terrainHeight(x,z);p.setY(i,h);const tint=.78+noise2(x*.0004,z*.0004)*.28;colors.push(tint,tint,tint);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({color:'#c4c8a6',roughness:1,vertexColors:true,normalMap:tex.normal,normalScale:new THREE.Vector2(.65,.65),roughnessMap:tex.rough});
  for(const t of [tex.grass,tex.rock,tex.normal,tex.rough]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}
  tex.normal.repeat.set(800,800);tex.rough.repeat.set(800,800);
  mat.onBeforeCompile=shader=>{
   shader.uniforms.grassAtlas={value:tex.grass};shader.uniforms.rockAtlas={value:tex.rock};shader.uniforms.landTime={value:0};this.landShader=shader;
   shader.vertexShader='varying vec3 vLandPosition; varying float vLandSlope;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLandPosition=position; vLandSlope=1.0-normal.y;');
   shader.fragmentShader='uniform sampler2D grassAtlas; uniform sampler2D rockAtlas; uniform float landTime; varying vec3 vLandPosition; varying float vLandSlope;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec2 landUV=vLandPosition.xz;
    vec3 grassA=texture2D(grassAtlas,landUV*.012).rgb;
    vec3 grassB=texture2D(grassAtlas,vec2(landUV.y,-landUV.x)*.0047).rgb;
    vec3 grass=mix(grassA,grassB,.48);
    float grassLuma=dot(grass,vec3(.2126,.7152,.0722));
    grass=mix(grass,grassLuma*vec3(.62,.91,.44),.65)*1.3;
    vec3 rock=texture2D(rockAtlas,landUV*.006).rgb;
    float cliff=smoothstep(.12,.65,vLandSlope);
    float beach=1.0-smoothstep(-13.0,-4.0,vLandPosition.y);
    vec3 terrain=mix(grass,rock,cliff);
    terrain=mix(terrain,vec3(.47,.38,.23),beach*.80);
    float cloud=.90+.10*sin(landUV.x*.0005+landTime*.005)*sin(landUV.y*.00037+landTime*.003);
    diffuseColor.rgb*=terrain*cloud*1.45;`);
  };
  const terrain=new THREE.Mesh(g,mat);terrain.receiveShadow=true;this.group.add(terrain);
 }
 ocean(){
  const c=canvas(256,256),ctx=c.getContext('2d'),d=ctx.createImageData(256,256);
  for(let z=0;z<256;z++)for(let x=0;x<256;x++){
   // Integer Fourier harmonics make the normal tile seamless at 256 pixels.
   const h=(a,b)=>{const u=a*Math.PI*2/256,w=b*Math.PI*2/256;return .43*Math.sin(7*u+3*w)+.24*Math.sin(13*u-11*w+.7)+.17*Math.sin(23*u+17*w+1.4)+.12*Math.sin(3*u-19*w+.3);};
   const dx=(h(x+1,z)-h(x-1,z))*.7,dz=(h(x,z+1)-h(x,z-1))*.7,i=(z*256+x)*4;
   d.data[i]=128+dx*100;d.data[i+1]=128+dz*100;d.data[i+2]=245;d.data[i+3]=255;
  }ctx.putImageData(d,0,0);const normals=texture(c,false);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;
  this.water=new Water(new THREE.PlaneGeometry(180000,180000),{textureWidth:512,textureHeight:512,waterNormals:normals,sunDirection:new THREE.Vector3(-.4,.8,.5),sunColor:0xfff1d9,waterColor:0x22575e,distortionScale:2.6,fog:true});
  // Fresnel reflectance for air/water (IOR 1 / 1.333), rather than the
  // artistic 30% base reflectance of the upstream Water example.
  const waterR0=((1.333-1)/(1.333+1))**2;
  this.water.material.fragmentShader=this.water.material.fragmentShader.replace('float rf0 = 0.3;',`float rf0 = ${waterR0.toFixed(8)};`);
  this.water.rotation.x=-Math.PI/2;this.water.position.y=WATER_HEIGHT;this.group.add(this.water);
  const calmNormals=normals.clone();calmNormals.needsUpdate=true;calmNormals.repeat.set(4500,4500);
  this.waterFallback=new THREE.Mesh(new THREE.PlaneGeometry(180000,180000),new THREE.MeshStandardMaterial({color:'#245765',metalness:.35,roughness:.23,normalMap:calmNormals,normalScale:new THREE.Vector2(.45,.45)}));this.waterFallback.rotation.x=-Math.PI/2;this.waterFallback.position.y=WATER_HEIGHT;this.group.add(this.waterFallback);
 }
 airport(){
  const rng=seeded(84),c=canvas(512,4096),ctx=c.getContext('2d');ctx.fillStyle='#363a3a';ctx.fillRect(0,0,512,4096);
  for(let i=0;i<95000;i++){const v=40+Math.floor(rng()*45);ctx.fillStyle=`rgba(${v},${v},${v},.2)`;ctx.fillRect(rng()*512,rng()*4096,1+rng()*3,1+rng()*4);}
  ctx.strokeStyle='#c4c2b3';ctx.lineWidth=4;ctx.strokeRect(15,35,482,4026);
  ctx.fillStyle='#efede0';for(let y=260;y<3850;y+=160)ctx.fillRect(251,y,10,85);
  for(const y of [110,3820])for(let x=75;x<460;x+=45)ctx.fillRect(x,y,24,90);
  ctx.font='bold 120px Arial';ctx.textAlign='center';ctx.fillText('36',256,390);ctx.save();ctx.translate(256,3750);ctx.rotate(Math.PI);ctx.fillText('18',0,0);ctx.restore();
  ctx.fillStyle='#e4e1d4';for(const y of [620,3320]){ctx.fillRect(90,y,50,170);ctx.fillRect(372,y,50,170);}
  for(let i=0;i<350;i++){ctx.strokeStyle=`rgba(12,13,13,${.012+rng()*.04})`;ctx.lineWidth=1+rng()*3;ctx.beginPath();const x=185+rng()*145,y=500+rng()*1500;ctx.moveTo(x,y);ctx.lineTo(x+(rng()-.5)*7,y+180+rng()*300);ctx.stroke();}
  const runway=new THREE.Mesh(new THREE.PlaneGeometry(50,3800),new THREE.MeshStandardMaterial({map:texture(c),roughness:.94}));runway.rotation.x=-Math.PI/2;runway.position.set(0,.055,-1300);runway.receiveShadow=true;this.group.add(runway);
  const asphalt=new THREE.MeshStandardMaterial({color:'#51564f',roughness:1});
  this.plane(20,2500,asphalt,100,-1000,.045);this.plane(650,280,asphalt,360,220,.04);
  const yellow=new THREE.LineBasicMaterial({color:'#b4a46a'});
  for(const x of [97,103]){const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.07,200),new THREE.Vector3(x,.07,-2250)]);this.group.add(new THREE.Line(geom,yellow));}
  for(let z=-3100;z<600;z+=65)for(const x of [-27,27]){const light=new THREE.Mesh(new THREE.SphereGeometry(.35,5,4),new THREE.MeshBasicMaterial({color:'#f3e4aa'}));light.position.set(x,.35,z);this.group.add(light);}
  const wall=new THREE.MeshStandardMaterial({color:'#b4b6ae',roughness:.7,metalness:.1}),roof=new THREE.MeshStandardMaterial({color:'#657477',roughness:.65,metalness:.5}),glass=new THREE.MeshPhysicalMaterial({color:'#6398a5',metalness:.2,roughness:.16});
  for(let i=0;i<6;i++){
   const x=210+i*87;this.box(66,18,75,wall,x,9,390);this.box(69,1.3,78,roof,x,18.5,390);this.box(52,12,.25,roof,x,6,352);
   for(let j=0;j<9;j++)this.box(1.0,18,75.5,roof,x-32+j*8,9,390);
   this.box(45,2,.3,glass,x,15,351.5);
  }
  this.box(18,26,18,wall,150,13,440);this.box(27,7,25,glass,150,30,440);this.box(31,1.2,29,roof,150,34,440);
  this.box(80,8,24,wall,305,4,515);this.box(84,1,28,roof,305,8.5,515);
  const pole=new THREE.MeshStandardMaterial({color:'#5c6260',metalness:.65,roughness:.45});
  for(let i=0;i<7;i++){const x=180+i*100;this.box(.35,20,.35,pole,x,10,310);this.box(5,.4,1.2,wall,x,20,310);}
 }
 plane(w,h,mat,x,z,y){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;this.group.add(o);return o;}
 box(w,h,d,mat,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;this.group.add(o);return o;}
 vegetation(){
  const geometries=[];
  for(let i=0;i<5;i++){const g=new THREE.ConeGeometry(2.6-i*.35,4,7,1);g.translate(0,3+i*1.65,0);geometries.push(g);}
  const crown=mergeGeometries(geometries),bark=new THREE.CylinderGeometry(.18,.30,7,5);bark.translate(0,3.5,0);
  const count=3500,trees=new THREE.InstancedMesh(crown,new THREE.MeshStandardMaterial({color:'#3f5738',roughness:1}),count),trunks=new THREE.InstancedMesh(bark,new THREE.MeshStandardMaterial({color:'#4f4635',roughness:1}),count),dummy=new THREE.Object3D(),rng=seeded(4242);
  const clusters=Array.from({length:36},()=>[(rng()-.5)*18000,(rng()-.5)*24000]);
  let accepted=0;
  for(let i=0;i<65000&&accepted<count;i++){
   const cluster=clusters[i%clusters.length],x=cluster[0]+(rng()+rng()-1)*420,z=cluster[1]+(rng()+rng()-1)*420,h=terrainHeight(x,z);
   if(h<25||h>700||Math.max(Math.abs(x)/950,Math.abs(z+1300)/3300)<1||noise2(x*.001,z*.001)<.43)continue;
   const s=1+rng()*1.8;dummy.position.set(x,h,z);dummy.scale.set(s,s*(.8+rng()*.5),s);dummy.rotation.y=rng()*Math.PI*2;dummy.updateMatrix();trees.setMatrixAt(accepted,dummy.matrix);trunks.setMatrixAt(accepted,dummy.matrix);trees.setColorAt(accepted,C('#3b5531').lerp(C('#71814e'),rng()*.65));accepted++;
  }trees.count=trunks.count=accepted;trees.receiveShadow=true;this.group.add(trees,trunks);
 }
 setLight(mode){this.daylight=mode;this.sun.color.set(mode==='sunset'?'#ffbe7c':'#fff3dd');this.sun.intensity=mode==='sunset'?1.9:2.5;this.ambient.intensity=mode==='sunset'?.38:.5;}
 update(position,dt,quality){
  this.time+=dt;this.water.material.uniforms.time.value=this.time*.65;this.water.visible=quality==='ultra';this.waterFallback.visible=quality!=='ultra';this.waterFallback.material.normalMap.offset.set(this.time*.012,this.time*.006);
  if(this.landShader)this.landShader.uniforms.landTime.value=this.time;
  this.sun.position.copy(position).add(new THREE.Vector3(-1800,this.daylight==='sunset'?1100:3600,2400));this.sun.target.position.copy(position);this.sun.target.updateMatrixWorld();
  this.sun.castShadow=quality!=='light';
 }
}
