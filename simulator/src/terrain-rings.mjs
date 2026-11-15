import * as THREE from 'three';
import {terrainHeight,noise2,TERRAIN_STEP} from './terrain.mjs';
// Five nested grids. Level zero uses the exact contact grid and diagonals.
export class TerrainRings {
 constructor(material,group){
  this.rings=[];this.center=[Infinity,Infinity];
  for(let level=0;level<5;level++){
   const step=TERRAIN_STEP*2**level,n=128,vertices=[],indices=[],colors=[],uvs=[];
   for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){vertices.push((x-n/2)*step,0,(z-n/2)*step);colors.push(1,1,1);uvs.push(x/n,z/n);}
   for(let z=0;z<n;z++)for(let x=0;x<n;x++){
    if(level>0&&x>=32&&x<96&&z>=32&&z<96)continue;
    const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);
   const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;group.add(mesh);this.rings.push({g,mesh,step});
  }this.update(0,0);
 }
 update(east,south){
  const cx=Math.round(east/320)*320,cz=Math.round(south/320)*320;
  if(cx===this.center[0]&&cz===this.center[1])return false;this.center=[cx,cz];
  for(const {g,step} of this.rings){
   const p=g.attributes.position,c=g.attributes.color;
   const level=this.rings.findIndex(r=>r.g===g);
   for(let z=0;z<=128;z++)for(let x=0;x<=128;x++){
    const i=z*129+x,px=cx+(x-64)*step,pz=cz+(z-64)*step;
    let h=terrainHeight(px,pz);
    // Stitch every fine outer edge to the next ring's linear edge. The
    // contact neighbourhood is far inside this boundary, without morphing.
    if(level<4){if((x===0||x===128)&&z%2)h=(terrainHeight(px,pz-step)+terrainHeight(px,pz+step))/2;else if((z===0||z===128)&&x%2)h=(terrainHeight(px-step,pz)+terrainHeight(px+step,pz))/2;}
    p.setXYZ(i,px,h,pz);const tint=.78+noise2(px*.0004,pz*.0004)*.28;c.setXYZ(i,tint,tint,tint);
   }p.needsUpdate=c.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
  }return true;
 }
 get triangles(){return this.rings.reduce((s,{g})=>s+g.index.count/3,0);}
}
