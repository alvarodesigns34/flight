import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const baseline='8e799375aa3b0a9ce32d9334d72df0eef8606bc4',dir=mkdtempSync(join(tmpdir(),'flight-physics-'));
try{
 for(const name of ['physics','parameters','terrain'])writeFileSync(join(dir,name+'.mjs'),execFileSync('git',['show',baseline+':simulator/src/'+name+'.mjs']));
 const before=await import(pathToFileURL(join(dir,'physics.mjs'))),after=await import('../src/physics.mjs'),records=[];
 for(const version of ['before','after','after','before','before','after']){
  const {Simulation}=version==='before'?before:after,s=new Simulation();for(let i=0;i<240;i++)s.step();const times=[];
  for(let i=0;i<2400;i++){const start=performance.now();s.step();times.push(performance.now()-start);}times.sort((a,b)=>a-b);
  records.push({version,steps:2400,simulatedSeconds:20,meanMs:times.reduce((s,x)=>s+x,0)/times.length,medianMs:times[1200],p95Ms:times[2280],finite:s.state.every(Number.isFinite)});
 }
 const result={at:new Date().toISOString(),baseline,currentPhysicsSha256:createHash('sha256').update(readFileSync('simulator/src/physics.mjs')).digest('hex'),method:'240 warmup steps, 2400 measured steps per run, 3 interleaved runs. performance.now wall duration, including telemetry. No browser rendering.',fixedStepBudgetMs:1000/120,records};
 writeFileSync('simulator/evidence/transformation/physics-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{rmSync(dir,{recursive:true,force:true});}
