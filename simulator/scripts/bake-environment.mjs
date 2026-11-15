// Offline PMREM at the exact runtime resolution (RGBA16F, full 2k sources).
import {build} from 'esbuild';import {createServer} from 'node:http';import {readFileSync,writeFileSync} from 'node:fs';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const code=`import * as T from 'three';import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
const r=new T.WebGLRenderer();r.setSize(4,4);document.body.appendChild(r.domElement);const p=new T.PMREMGenerator(r);
for(const name of ['studio-small-09','kloofendal-sky']){
 const hdr=await new RGBELoader().loadAsync('/'+name+'-2k.hdr'),target=p.fromEquirectangular(hdr);
 const data=new Uint16Array(target.width*target.height*4);r.readRenderTargetPixels(target,0,0,target.width,target.height,data);
 if(!data.some(x=>x>0))throw new Error('Empty PMREM');
 await fetch('/save/'+name+'?w='+target.width+'&h='+target.height,{method:'POST',body:data});console.log('BAKED',name,target.width,target.height);
 target.dispose();hdr.dispose();
}window.done=true;`;
const bundle=await build({stdin:{contents:code,resolveDir:process.cwd(),sourcefile:'bake-client.mjs'},bundle:true,write:false,format:'esm',target:'es2022'}),records=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
const server=createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<script type="module" src="/bake.js"></script>');}
 else if(url.pathname==='/bake.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}
 else if(url.pathname.startsWith('/save/')){
  const name=url.pathname.split('/').at(-1),parts=[];for await(const part of req)parts.push(part);const raw=Buffer.concat(parts),zipped=gzipSync(raw,{level:9});
  writeFileSync('simulator/assets/environment/'+name+'-pmrem.bin.gz',zipped);
  records.push({name,width:Number(url.searchParams.get('w')),height:Number(url.searchParams.get('h')),format:'RGBA16F',mapping:'CubeUVReflectionMapping',sourceSha256:sha(readFileSync('simulator/assets/environment/'+name+'-2k.hdr')),rawSha256:sha(raw),rawBytes:raw.length,compressedBytes:zipped.length,losslessGzip:true});res.end('ok');
 }else{res.end(readFileSync('simulator/assets/environment/'+url.pathname.slice(1)));}}
 catch(e){res.statusCode=500;res.end(e.message);}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{const page=await browser.newPage();page.on('console',m=>console.log(m.type(),m.text()));page.on('pageerror',e=>console.error(e));await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.done,{},{timeout:360000});writeFileSync('simulator/assets/environment/pmrem.json',JSON.stringify({threeRevision:'181',prefilter:'GGX VNDF PMREMGenerator, full source resolution',records},null,2)+'\n');console.log(records);}finally{await browser.close();server.close();}
