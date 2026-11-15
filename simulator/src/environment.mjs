import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
// Offline GGX prefilter, byte-preserving gzip of the runtime RGBA16F target.
export async function loadEnvironment(renderer,name,manifest){
 const record=manifest.records.find(r=>r.name===name);
 if(typeof DecompressionStream!=='undefined'&&record){
  const response=await fetch(`assets/environment/${name}-pmrem.bin.gz`);
  if(!response.ok)throw new Error('No se pudo cargar la iluminación');
  const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(bytes.byteLength!==record.rawBytes)throw new Error('Iluminación incompleta');
  const texture=new THREE.DataTexture(new Uint16Array(bytes),record.width,record.height,THREE.RGBAFormat,THREE.HalfFloatType);
  texture.mapping=THREE.CubeUVReflectionMapping;texture.colorSpace=THREE.LinearSRGBColorSpace;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
 }
 const hdr=await new RGBELoader().loadAsync(`assets/environment/${name}-2k.hdr`),pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(hdr);
 hdr.dispose();pmrem.dispose();return target.texture;
}
