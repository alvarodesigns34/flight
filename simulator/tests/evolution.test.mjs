import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {MeshoptDecoder} from 'meshoptimizer';
import {Simulation,evaluate,rk4,norm,dot,scale,add,quaternion,csvHeader} from '../src/physics.mjs';
import {terrainHeight,terrainSample,TERRAIN_STEP} from '../src/terrain.mjs';
import {TerrainRings} from '../src/terrain-rings.mjs';import * as THREE from 'three';
import {defaults,validateProfile,response} from '../src/input-profile.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('finest render triangles and contact interpolation match at arbitrary points',()=>{
 const rings=new TerrainRings(new THREE.MeshBasicMaterial(),new THREE.Group());assert.equal(rings.triangles,131072);
 const {g}=rings.rings[0],p=g.attributes.position;
 for(const [x,z] of [[5,7],[17,13],[-245,431],[615,-321]]){
  const ix=Math.floor(x/TERRAIN_STEP),iz=Math.floor(z/TERRAIN_STEP),u=x/TERRAIN_STEP-ix,v=z/TERRAIN_STEP-iz;
  const a=(iz+64)*129+ix+64,indices=u+v<=1?[a,a+129,a+1]:[a+1,a+129,a+130];
  const tri=new THREE.Triangle(...indices.map(i=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i))));
  const plane=tri.getPlane(new THREE.Plane()),height=-(plane.normal.x*x+plane.normal.z*z+plane.constant)/plane.normal.y;
  assert.ok(Math.abs(height-terrainSample(x,z).height)<1e-4);
 }
 assert.ok(rings.update(500,800));assert.equal(rings.update(500,800),false);
 rings.update(5000,-5500);
 for(let level=0;level<4;level++){
  const p=rings.rings[level].g.attributes.position;
  for(let i=1;i<128;i+=2)assert.ok(Math.abs(p.getY(i*129)-(p.getY((i-1)*129)+p.getY((i+1)*129))/2)<1e-4);
 }
 assert.ok(terrainHeight(5000,-5500)>300);
});
test('invalid state, wind and integration intervals fail explicitly',()=>{
 const s=new Simulation();for(const y of [[],s.state.map((x,i)=>i===3?NaN:x),s.state.map((x,i)=>i>=6&&i<10?0:x)])assert.throws(()=>evaluate(y,s.controls));
 assert.throws(()=>evaluate(s.state,s.controls,[NaN,0,0]));for(const h of [0,-1,NaN,.2])assert.throws(()=>rk4(s.state,h,s.controls));
});
test('actuators move progressively, settle and remain independent of render FPS',()=>{
 const results=[];
 for(const fps of [30,60,144]){const s=new Simulation();s.controls.gear=1;s.controls.flaps=1;s.controls.elevator+=.15;
  s.advance(1/fps);s.advance(1/fps);assert.ok(s.applied.gear>0&&s.applied.gear<1);assert.ok(s.applied.elevator<s.controls.elevator);
  for(let i=2;i<fps*6;i++)s.advance(1/fps);assert.ok(Math.abs(s.applied.gear-1)<1e-9);assert.ok(Math.abs(s.applied.flaps-1)<1e-9);results.push(s.state);
 }
 for(const state of results)assert.ok(norm(state.map((v,i)=>v-results[0][i]))<1e-7);
});
test('slope contacts align with terrain normals and friction opposes tangential motion',()=>{
 const s=new Simulation();s.reset('runway');s.state[0]=5500;s.state[1]=5000;s.state[2]=-terrainSample(5000,-5500).height-1.8;s.state[3]=4;s.state[4]=2;
 const r=evaluate(s.state,s.controls);assert.ok(r.contactData.some(c=>c.load>0));
 for(const c of r.contactData.filter(c=>c.load>0)){
  assert.ok(Math.abs(norm(c.normal)-1)<1e-12);assert.ok(c.normal[2]<-.5);
  const expected=terrainSample(c.point[1],-c.point[0]).normal;assert.ok(norm(c.normal.map((v,i)=>v-expected[i]))<1e-12);
 }
 // On a flat runway, all horizontal contact work must be nonpositive.
 s.state[0]=s.state[1]=0;s.state[2]=-2.05;const flat=evaluate(s.state,s.controls);
 assert.ok(flat.force[0]*s.state[3]+flat.force[1]*s.state[4]<0);
});
test('ground integration converges and deterministic gusts do not introduce NaNs',()=>{
 const end=h=>{const s=new Simulation();s.reset('runway');for(let t=0;t<4-h/2;t+=h)s.step(h);return s;};
 const a=end(1/120),b=end(1/240);assert.ok(norm(a.state.slice(0,6).map((v,i)=>v-b.state[i]))<.002);assert.ok(Math.abs(a.state[5])<.02);
 const s=new Simulation(),t=new Simulation();s.gustStrength=t.gustStrength=3;
 for(let i=0;i<1200;i++){s.step();t.step();}assert.deepEqual(s.state,t.state);assert.ok(s.state.every(Number.isFinite));
 assert.equal(s.telemetry[0].length,csvHeader.split(',').length);
});
test('loaded supports stay extended until a new airborne gear command',()=>{
 const s=new Simulation();s.reset('runway');s.controls.gear=0;s.step();assert.equal(s.controls.gear,1);assert.equal(s.applied.gear,1);
 s.state[2]=-100;s.controls.gear=0;s.step();assert.ok(s.applied.gear<1);
});
test('gamepad response is continuous, bounded, symmetric and validates persisted settings',()=>{
 const p=defaults();assert.equal(response(.05,p),0);assert.ok(response(.090001,p)<1e-6);assert.equal(response(1,p),1);assert.equal(response(-.5,p),-response(.5,p));assert.equal(response(NaN,p),0);
 assert.equal(validateProfile({sensitivity:99,deadzone:-3,curve:NaN}).sensitivity,1);assert.equal(validateProfile({deadzone:-3}).deadzone,0);
 const centered={...p,center:[.1,0,0,0]};assert.equal(response(.1,centered),0);
});
test('compressed models decode to exact source bytes, including index order and corner normals',async()=>{
 await MeshoptDecoder.ready;
 const parse=path=>{const b=readFileSync(path),n=b.readUInt32LE(12);return {json:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(n+28)};};
 for(const name of ['original','evolved']){
  const source=parse(`simulator/assets/tomcat-${name}.glb`),compressed=parse(`simulator/assets/tomcat-${name}.meshopt.glb`);
  for(const [i,v] of compressed.json.bufferViews.entries()){
   const ext=v.extensions?.EXT_meshopt_compression;if(!ext)continue;
   const decoded=new Uint8Array(v.byteLength);MeshoptDecoder.decodeGltfBuffer(decoded,ext.count,ext.byteStride,compressed.bin.subarray(ext.byteOffset,ext.byteOffset+ext.byteLength),ext.mode,ext.filter);
   const original=source.json.bufferViews[i],raw=source.bin.subarray(original.byteOffset||0,(original.byteOffset||0)+original.byteLength);assert.equal(hash(decoded),hash(raw));
  }
 }
});
test('prefiltered HDR data is complete and byte-exact after gzip decoding',()=>{
 const manifest=JSON.parse(readFileSync('simulator/assets/environment/pmrem.json'));
 for(const r of manifest.records){const raw=gunzipSync(readFileSync(`simulator/assets/environment/${r.name}-pmrem.bin.gz`));assert.equal(raw.length,r.width*r.height*8);assert.equal(hash(raw),r.rawSha256);assert.equal(hash(readFileSync(`simulator/assets/environment/${r.name}-2k.hdr`)),r.sourceSha256);}
});
test('evolved native download matches the independently saved model and metadata',()=>{
 const meta=JSON.parse(readFileSync('simulator/assets/evolved-model.json'));
 assert.equal(hash(readFileSync('PROJECT_TOMCAT/evolved/F14A_TOMCAT_EVOLVED.blend')),meta.native_sha256);
 assert.equal(hash(readFileSync('simulator/assets/F14A_TOMCAT_EVOLVED.blend')),meta.native_sha256);
 assert.equal(meta.retained_object_identities,1832);assert.equal(meta.component_inventory.length,1832);assert.equal(new Set(meta.component_inventory).size,1832);assert.equal(meta.added_objects.length,2);assert.equal(meta.accidental_omissions,0);
});
