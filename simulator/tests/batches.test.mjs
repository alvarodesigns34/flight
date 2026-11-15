import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {batchRigidParts} from '../src/rigid-batches.mjs';
test('rigid batches retain exact geometry and follow nested control pivots',()=>{
 const root=new THREE.Group(),wing=new THREE.Group(),flap=new THREE.Group(),material=new THREE.MeshStandardMaterial();root.add(wing);wing.add(flap);wing.position.set(2,1,3);flap.position.set(3,0,-1);
 const a=new THREE.Mesh(new THREE.BoxGeometry(2,.2,4),material),b=new THREE.Mesh(new THREE.BoxGeometry(1,.1,2),material);wing.add(a);flap.add(b);
 const batch=batchRigidParts(root);assert.equal(batch.batches.length,1);assert.equal(batch.records.length,2);
 assert.equal(batch.batches[0].geometry.attributes.position.count,a.geometry.attributes.position.count+b.geometry.attributes.position.count);
 for(const angles of [[0,0],[.6,.3],[-.2,-.5]]){
  wing.rotation.y=angles[0];flap.rotation.x=angles[1];root.position.set(7000,1000,-4500);batch.update();root.updateMatrixWorld(true);
  for(const r of batch.records){const matrix=new THREE.Matrix4();r.batch.getMatrixAt(r.instanceId,matrix);const expected=new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(r.object.matrixWorld);assert.ok(matrix.elements.every((x,i)=>Math.abs(x-expected.elements[i])<1e-6));}
 }
 flap.visible=false;batch.update();assert.equal(batch.batches[0].getVisibleAt(batch.records.find(r=>r.object===b).instanceId),false);
});
