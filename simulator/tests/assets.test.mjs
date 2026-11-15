import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const asset=new URL('../assets/',import.meta.url),meta=JSON.parse(readFileSync(new URL('original-model.json',asset)));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
test('the inspector retains every original aircraft triangle and normal attribute',()=>{
 const buffer=readFileSync(new URL('tomcat-original.glb',asset));assert.equal(buffer.readUInt32LE(0),0x46546c67);assert.equal(buffer.readUInt32LE(8),buffer.length);
 const jsonLength=buffer.readUInt32LE(12),gltf=JSON.parse(buffer.subarray(20,20+jsonLength).toString());
 let triangles=0;
 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
  triangles+=gltf.accessors[primitive.indices].count/3;
  assert.ok(primitive.attributes.NORMAL!==undefined,'Missing original corner normals');
  assert.equal(gltf.accessors[primitive.attributes.NORMAL].count,gltf.accessors[primitive.attributes.POSITION].count);
 }
 assert.equal(triangles,1316961);assert.equal(triangles,meta.source_evaluated_triangles);assert.equal(meta.source_objects,1832);assert.equal(meta.decimated,false);assert.equal(meta.omitted_objects,0);
 assert.equal(sha(new URL('tomcat-original.glb',asset)),meta.asset_sha256);
});
test('native download is byte-identical to the original master',()=>{
 const expected='72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0';
 assert.equal(sha(new URL('F14A_TOMCAT_ORIGINAL.blend',asset)),expected);
 assert.equal(sha(new URL('../../PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend',import.meta.url)),expected);
});
