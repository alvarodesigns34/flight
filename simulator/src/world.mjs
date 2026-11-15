import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {terrainHeight,terrainSample,noise2,fbm,WATER_HEIGHT} from './terrain.mjs';
import {TerrainRings} from './terrain-rings.mjs';
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
  const mat=new THREE.MeshStandardMaterial({color:'#c4c8a6',roughness:1,vertexColors:true,normalMap:tex.normal,normalScale:new THREE.Vector2(.65,.65),roughnessMap:tex.rough});
  for(const t of [tex.grass,tex.rock,tex.normal,tex.rough]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}
  mat.onBeforeCompile=shader=>{
   shader.uniforms.grassAtlas={value:tex.grass};shader.uniforms.rockAtlas={value:tex.rock};shader.uniforms.landTime={value:0};this.landShader=shader;
   shader.vertexShader='varying vec3 vLandPosition; varying float vLandSlope;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLandPosition=position; vLandSlope=1.0-normal.y;');
   shader.fragmentShader='uniform sampler2D grassAtlas; uniform sampler2D rockAtlas; uniform float landTime; varying vec3 vLandPosition; varying float vLandSlope;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
    // World-space normals retain a stable metre scale across all five rings.
    vec3 landNormal=texture2D(normalMap,vLandPosition.xz*.02).xyz*2.0-1.0;
    normal=normalize(normal+mat3(viewMatrix)*vec3(landNormal.x,0.0,landNormal.y)*.18);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness*(.8+.2*texture2D(roughnessMap,vLandPosition.xz*.02).g);`);
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
  this.terrainRings=new TerrainRings(mat,this.group);
 }
 ocean(){
  const material=new THREE.MeshPhysicalMaterial({color:'#17495b',metalness:0,ior:1.333,roughness:.19,envMapIntensity:1});
  material.onBeforeCompile=shader=>{
   shader.uniforms.oceanTime={value:0};(this.oceanShaders??=[]).push(shader);
   shader.vertexShader='uniform float oceanTime; varying vec2 vOceanXZ;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec2 oceanXZ=(modelMatrix*vec4(position,1.0)).xz;vOceanXZ=oceanXZ;
    float edge=1.0-smoothstep(5500.0,7900.0,max(abs(position.x),abs(position.z)));
    transformed.y+=edge*(.65*sin(dot(oceanXZ,vec2(.018,.011))-oceanTime*.42)+.24*sin(dot(oceanXZ,vec2(-.024,.029))-oceanTime*.61)+.10*sin(dot(oceanXZ,vec2(.065,.020))-oceanTime*.83));`);
   shader.fragmentShader=`uniform float oceanTime; varying vec2 vOceanXZ;
float oceanHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y*31.31);}
vec2 oceanGradient(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f),du=6.0*f*(1.0-f);float a=oceanHash(i),b=oceanHash(i+vec2(1,0)),c=oceanHash(i+vec2(0,1)),d=oceanHash(i+vec2(1,1));return vec2(mix(b-a,d-c,u.y)*du.x,mix(c-a,d-b,u.x)*du.y);}
`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
    vec2 slope=.65*vec2(.018,.011)*cos(dot(vOceanXZ,vec2(.018,.011))-oceanTime*.42)+.24*vec2(-.024,.029)*cos(dot(vOceanXZ,vec2(-.024,.029))-oceanTime*.61);
    // Non-periodic smooth gradients replace the visibly repeated normal tile.
    vec2 q=vec2(.82*vOceanXZ.x+.57*vOceanXZ.y,-.57*vOceanXZ.x+.82*vOceanXZ.y);
    vec2 g=oceanGradient(q*.12+vec2(oceanTime*.035,0.0))*.055+oceanGradient(q*.42+vec2(13.7,-9.3)-oceanTime*.024)*.018;
    vec2 detail=vec2(.82*g.x-.57*g.y,.57*g.x+.82*g.y);
    detail*=1.0-smoothstep(.25,1.5,length(fwidth(vOceanXZ))*.42);
    float attenuation=1.0-smoothstep(5000.0,40000.0,distance(cameraPosition,vec3(vOceanXZ.x,-16.0,vOceanXZ.y)));
    normal=normalize(mat3(viewMatrix)*vec3((detail.x-slope.x)*attenuation,1.0,(detail.y-slope.y)*attenuation));`);
  };
  const near=new THREE.PlaneGeometry(16000,16000,192,192);near.rotateX(-Math.PI/2);
  this.water=new THREE.Mesh(near,material);this.water.position.y=WATER_HEIGHT;this.water.receiveShadow=true;this.group.add(this.water);
  // Four distant strips leave a hole for the displaced surface, avoiding a
  // second flat surface through the wave troughs. Both share a calm edge.
  this.farWater=new THREE.Group();this.group.add(this.farWater);
  for(const [w,d,x,z] of [[164000,180000,-90000,0],[164000,180000,90000,0],[16000,164000,0,-90000],[16000,164000,0,90000]]){
   const geometry=new THREE.PlaneGeometry(w,d);geometry.rotateX(-Math.PI/2);const far=new THREE.Mesh(geometry,material);far.position.set(x,WATER_HEIGHT,z);this.farWater.add(far);
  }
 }
 airport(){
  const worldGroup=this.group;this.group=new THREE.Group();worldGroup.add(this.group);const airportGroup=this.group;
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
  const lampMaterial=new THREE.MeshBasicMaterial({color:'#f3e4aa'});
  for(let z=-3100;z<600;z+=65)for(const x of [-27,27]){const light=new THREE.Mesh(new THREE.SphereGeometry(.35,5,4),lampMaterial);light.position.set(x,.35,z);this.group.add(light);}
  const wall=new THREE.MeshStandardMaterial({color:'#b4b6ae',roughness:.7,metalness:.1}),roof=new THREE.MeshStandardMaterial({color:'#657477',roughness:.65,metalness:.5}),glass=new THREE.MeshPhysicalMaterial({color:'#6398a5',metalness:.2,roughness:.16});
  for(let i=0;i<6;i++){
   const x=210+i*87,z=390;
   // Thin arched roof, hollow interior, individual door leaves and exposed ribs.
   const shape=new THREE.Shape();shape.moveTo(-34,12);
   for(let j=0;j<=48;j++){const t=Math.PI-Math.PI*j/48;shape.lineTo(34*Math.cos(t),12+11*Math.sin(t));}
   for(let j=48;j>=0;j--){const t=Math.PI-Math.PI*j/48;shape.lineTo(33.65*Math.cos(t),12+10.65*Math.sin(t));}shape.closePath();
   const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:75,steps:1,bevelEnabled:false,curveSegments:48}),roof);shell.position.set(x,0,z-37.5);shell.castShadow=true;shell.receiveShadow=true;this.group.add(shell);
   for(const side of [-1,1]){this.box(.4,12,75,wall,x+side*33.8,6,z);this.box(5,12,.4,wall,x+side*30.8,6,z-37.5);this.box(11,11.5,.3,roof,x+side*24.7,5.75,z-37.8);}
   this.box(67,12,.4,wall,x,6,z+37.5);this.box(67,.25,75,asphalt,x,.13,z);
   for(let j=0;j<10;j++){
    const curve=new THREE.EllipseCurve(0,12,34.1,11.1,0,Math.PI,false,0),points=curve.getPoints(32).map(p=>new THREE.Vector3(p.x,p.y,-37+j*8.2));
    const rib=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.11,5,false),wall);rib.position.set(x,0,z);this.group.add(rib);
   }
   for(let j=0;j<8;j++)this.box(5,1.8,.25,glass,x-27+j*7.7,14.1,z-37.6);
   this.box(68,.3,1,wall,x,12,z-38);this.box(10,.3,3,wall,x+29,3,z-41);
   for(let j=0;j<4;j++)this.box(.4,2.8,.4,roof,x+25+j*2,1.4,z-42);
  }
  // Octagonal observation cab on a tapered shaft with an exterior gallery.
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(6,9,26,8),wall);shaft.position.set(150,13,440);this.group.add(shaft);
  const cab=new THREE.Mesh(new THREE.CylinderGeometry(13,10,7,8),glass);cab.position.set(150,29,440);this.group.add(cab);
  for(let i=0;i<8;i++){const t=i*Math.PI/4;this.box(.4,8,.4,roof,150+12*Math.cos(t),29,440+12*Math.sin(t));}
  this.box(29,.8,29,roof,150,33,440);this.box(28,.4,28,wall,150,25.4,440);
  for(let i=0;i<12;i++){this.box(.2,1.5,.2,roof,137+i*2.35,26.3,426);this.box(.2,1.5,.2,roof,137+i*2.35,26.3,454);}
  this.box(29,.15,.15,roof,150,27,426);this.box(29,.15,.15,roof,150,27,454);
  this.box(80,8,24,wall,305,4,515);this.box(84,1,28,roof,305,8.5,515);
  const pole=new THREE.MeshStandardMaterial({color:'#5c6260',metalness:.65,roughness:.45});
  for(let i=0;i<7;i++){const x=180+i*100;this.box(.35,20,.35,pole,x,10,310);this.box(5,.4,1.2,wall,x,20,310);}
  // Static geometry is merged per shared material to keep airport draw calls
  // independent of the number of roof ribs, mullions and architectural pieces.
  airportGroup.updateMatrixWorld(true);const batches=new Map(),remove=[];
  airportGroup.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geometry);remove.push(o);});
  for(const o of remove)airportGroup.remove(o);
  for(const [material,geometries] of batches){const merged=mergeGeometries(geometries.map(g=>g.index?g.toNonIndexed():g));if(merged){const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;airportGroup.add(mesh);}}
  this.group=worldGroup;

 }
 plane(w,h,mat,x,z,y){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;this.group.add(o);return o;}
 box(w,h,d,mat,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;this.group.add(o);return o;}
 vegetation(){
  const parts=[];for(let i=0;i<5;i++){const g=new THREE.ConeGeometry(2.6-i*.35,4,8,1);g.translate(0,3+i*1.65,0);parts.push(g);}
  const pine=mergeGeometries(parts),leaves=[];
  for(const [x,y,z,s] of [[0,7,0,3],[2.1,6.5,.4,2.2],[-1.8,7.5,.5,2.3],[.3,8.7,-1,2.1],[.5,5.9,1.3,2.1]]){const g=new THREE.IcosahedronGeometry(s,1);g.scale(1,.85,1);g.translate(x,y,z);leaves.push(g);}
  const broad=mergeGeometries(leaves),bark=new THREE.CylinderGeometry(.20,.36,7,7);bark.translate(0,3.5,0);
  const crowns=[pine,broad],green=new THREE.MeshStandardMaterial({color:'#526347',roughness:1}),wood=new THREE.MeshStandardMaterial({color:'#4e4434',roughness:1});
  const rng=seeded(4242),clusters=Array.from({length:48},()=>[(rng()-.5)*18000,(rng()-.5)*24000]),cells=new Map();let accepted=0;
  for(let i=0;i<80000&&accepted<4500;i++){
   const cluster=clusters[i%clusters.length],x=cluster[0]+(rng()+rng()-1)*560,z=cluster[1]+(rng()+rng()-1)*560,h=terrainSample(x,z).height;
   if(h<25||h>760||Math.max(Math.abs(x)/950,Math.abs(z+1300)/3300)<1||noise2(x*.001,z*.001)<.39)continue;
   const species=rng()<.42?0:1,key=Math.floor(x/2000)+','+Math.floor(z/2000)+','+species;
   if(!cells.has(key))cells.set(key,{species,trees:[]});
   cells.get(key).trees.push({x,z,h,scale:.8+rng()*1.8,stretch:.75+rng()*.6,angle:rng()*Math.PI*2,tint:rng()});accepted++;
  }
  const dummy=new THREE.Object3D();this.vegetationChunks=[];
  for(const {species,trees} of cells.values()){
   const crown=new THREE.InstancedMesh(crowns[species],green,trees.length),trunk=new THREE.InstancedMesh(bark,wood,trees.length);
   for(const [i,t] of trees.entries()){dummy.position.set(t.x,t.h,t.z);dummy.scale.set(t.scale,t.scale*t.stretch,t.scale);dummy.rotation.y=t.angle;dummy.updateMatrix();crown.setMatrixAt(i,dummy.matrix);trunk.setMatrixAt(i,dummy.matrix);crown.setColorAt(i,C('#526246').lerp(C('#a5ac7a'),t.tint*.5));}
   crown.computeBoundingSphere();trunk.computeBoundingSphere();crown.receiveShadow=true;this.group.add(crown,trunk);this.vegetationChunks.push({crown,trunk});
  }
  this.treeCount=accepted;
 }
 setLight(mode){this.daylight=mode;this.sun.color.set(mode==='sunset'?'#ffbe7c':'#fff3dd');this.sun.intensity=mode==='sunset'?1.9:2.5;this.ambient.intensity=mode==='sunset'?.38:.5;}
 update(position,dt,quality){
  this.time+=dt;this.water.material.roughness=quality==='ultra'?.16:quality==='high'?.22:.28;
  this.water.position.x=Math.round(position.x/100)*100;this.water.position.z=Math.round(position.z/100)*100;this.farWater.position.set(this.water.position.x,0,this.water.position.z);
  for(const shader of this.oceanShaders||[])shader.uniforms.oceanTime.value=this.time;
  this.terrainRings.update(position.x,position.z);
  if(this.landShader)this.landShader.uniforms.landTime.value=this.time;
  this.sun.position.copy(position).add(new THREE.Vector3(-1800,this.daylight==='sunset'?1100:3600,2400));this.sun.target.position.copy(position);this.sun.target.updateMatrixWorld();
  this.sun.castShadow=quality!=='light';
 }
}
