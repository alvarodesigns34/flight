// Lossless EXT_meshopt_compression: no quantization, no decimation and exact
// index order. Every decoded bufferView is checked byte for byte before writing.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const sha=b=>createHash('sha256').update(b).digest('hex'),reports=[];
for(const name of ['original','evolved']){
 const path=`simulator/assets/tomcat-${name}`,file=readFileSync(path+'.glb');
 const jsonLength=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+jsonLength).toString()),bin=file.subarray(28+jsonLength);
 const pieces=[];let length=0,compressedViews=0;
 const append=b=>{const off=length;pieces.push(b);length+=b.length;if(length%4){const pad=Buffer.alloc(4-length%4);pieces.push(pad);length+=pad.length;}return off;};
 for(const [i,view] of json.bufferViews.entries()){
  const raw=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  if(view.target!==34962&&view.target!==34963){view.byteOffset=append(raw);continue;}
  const acc=json.accessors.find(a=>a.bufferView===i),stride=view.byteStride||({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[acc.componentType])*({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[acc.type]);
  if(!stride)throw new Error(`No stride in ${name} bufferView ${i}`);
  const mode=view.target===34963?'INDICES':'ATTRIBUTES',count=raw.length/stride;
  const encoded=MeshoptEncoder.encodeGltfBuffer(raw,count,stride,mode),decoded=new Uint8Array(raw.length);
  MeshoptDecoder.decodeGltfBuffer(decoded,count,stride,encoded,mode,'NONE');
  if(Buffer.compare(raw,decoded)!==0)throw new Error('Lossless decode mismatch');
  const off=append(Buffer.from(encoded));view.buffer=1;
  view.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:off,byteLength:encoded.length,byteStride:stride,count,mode,filter:'NONE'}};compressedViews++;
 }
 json.buffers=[{byteLength:length},{byteLength:bin.length,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 for(const key of ['extensionsUsed','extensionsRequired'])json[key]=[...new Set([...(json[key]||[]),'EXT_meshopt_compression'])];
 let data=Buffer.from(JSON.stringify(json));if(data.length%4)data=Buffer.concat([data,Buffer.alloc(4-data.length%4,32)]);
 const binary=Buffer.concat(pieces),head=Buffer.alloc(20);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+data.length+binary.length,8);head.writeUInt32LE(data.length,12);head.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
 const result=Buffer.concat([head,data,bh,binary]);writeFileSync(path+'.meshopt.glb',result);
 reports.push({name,sourceBytes:file.length,compressedBytes:result.length,sourceSha256:sha(file),compressedSha256:sha(result),compressedViews,decodedBufferViewsByteIdentical:true,quantized:false,decimated:false});
}
writeFileSync('simulator/evidence/model-compression.json',JSON.stringify(reports,null,2)+'\n');console.log(reports);
