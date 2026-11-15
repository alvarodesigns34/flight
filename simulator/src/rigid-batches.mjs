import * as THREE from 'three';
// Rigid multi-draw batches retain every vertex, normal, UV and index. Keep the
// original hierarchy as the animation rig; only the rendering path changes.
// Call only when WEBGL_multi_draw is supported, otherwise retain normal meshes.
export function batchRigidParts(root){
 root.updateWorldMatrix(true,true);const materials=new Map(),records=[],batches=[];
 root.traverse(o=>{if(o.isMesh&&!o.isBatchedMesh&&!Array.isArray(o.material)&&!o.material.transparent&&!(o.material.transmission>0)){
  const key=o.material.uuid+'|'+Object.keys(o.geometry.attributes).sort().join(',');
  if(!materials.has(key))materials.set(key,[]);materials.get(key).push(o);
 }});
 for(const objects of materials.values()){
  if(objects.length<2)continue;
  const vertices=objects.reduce((s,o)=>s+o.geometry.attributes.position.count,0),indices=objects.reduce((s,o)=>s+(o.geometry.index?.count||0),0);
  const batch=new THREE.BatchedMesh(objects.length,vertices,indices,objects[0].material);batch.name='Rigid_batch_'+objects[0].material.name;batch.castShadow=objects.some(o=>o.castShadow);batch.receiveShadow=objects.some(o=>o.receiveShadow);batch.frustumCulled=false;root.add(batch);batches.push(batch);
  for(const object of objects){const geometryId=batch.addGeometry(object.geometry),instanceId=batch.addInstance(geometryId);records.push({object,batch,geometryId,instanceId});object.visible=false;}
 }
 const inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4();
 function update(){
  root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
  for(const r of records){matrix.multiplyMatrices(inverse,r.object.matrixWorld);r.batch.setMatrixAt(r.instanceId,matrix);let visible=true;for(let p=r.object.parent;p&&p!==root;p=p.parent)visible&&=p.visible;r.batch.setVisibleAt(r.instanceId,visible);}
 }
 update();return {update,records,batches,stats:{sourceMeshBatches:records.length,multiDrawBatches:batches.length}};
}
