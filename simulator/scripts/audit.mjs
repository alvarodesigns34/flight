// Comparable screenshots and CPU/browser measurements. Software GPU results are
// evidence of this environment only, never a claim about physical GPUs.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.argv[2]||'/tmp/flight-audit',base=process.argv[3]||'http://127.0.0.1:5173/',full=process.argv[4]==='evolved';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1,reducedMotion:'reduce'});
page.setDefaultTimeout(240000);const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 const began=Date.now();await page.goto(base+'?quality=light');await page.waitForFunction(()=>window.flightLab?.ready);
 const readyMs=Date.now()-began,initialEncodedBytes=await page.evaluate(()=>performance.getEntriesByType('resource').reduce((s,r)=>s+r.encodedBodySize,0));console.log('READY',readyMs);
 const shot=async name=>{await page.waitForTimeout(150);await page.screenshot({path:`${out}/${name}.png`});console.log(name);};
 await shot('01-flight-desktop');
 if(full){await page.locator('#play').click();await page.waitForFunction(()=>window.flightLab.running&&window.flightLab.time>.1);}
 await page.locator('#tab-model').click();await page.waitForFunction(()=>window.flightLab?.tab==='model'&&!window.flightLab.assetLoading&&document.getElementById('asset-progress').hidden);if(process.argv[4]==='evolved'){await page.locator('#model-version').selectOption('evolved');await page.waitForFunction(()=>document.getElementById('asset-progress').hidden&&window.flightLab.modelVersion==='evolved');}await page.locator('#focus-view').click();
 if(full&&await page.evaluate(()=>window.flightLab.running||window.flightLab.actualOriginalTriangles!==1316961))throw new Error('Inspector pause/original geometry failed');
 for(const [i,p] of ['hero','port','top','cockpit','gear','engines'].entries()){
  await page.evaluate(p=>document.querySelector(`[data-preset="${p}"]`).click(),p);
  if(p==='cockpit')await page.evaluate(()=>{const e=document.getElementById('cutaway');e.value='cockpit';e.dispatchEvent(new Event('change'));});
  await shot(`${String(i+2).padStart(2,'0')}-${p}`);
  if(p==='cockpit')await page.evaluate(()=>{const e=document.getElementById('cutaway');e.value='closed';e.dispatchEvent(new Event('change'));});
 }
 await page.locator('#focus-view').click();await page.locator('#tab-flight').click();
 if(await page.locator('#settings-toggle').count())await page.locator('#settings-toggle').click();
 for(const [i,scene] of ['coastal','runway'].entries()){
  await page.locator('#scenario').selectOption(scene);await shot(`${i+8}-${scene}`);
 }
 await page.locator('#scenario').selectOption('coastal');await page.locator('#daylight').selectOption('sunset');await shot('10-sunset');
 await page.locator('#daylight').selectOption('day');await page.locator('#play').click();
 const timing=await page.evaluate(()=>new Promise(resolve=>{
  const a=[],start=performance.now();let last=start;
  function frame(t){a.push(t-last);last=t;if(t-start<6000)requestAnimationFrame(frame);else{a.sort((x,y)=>x-y);resolve({frames:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],elapsedMs:t-start,diagnostics:window.flightLab});}}requestAnimationFrame(frame);
 }));await page.locator('#play').click();
 await page.setViewportSize({width:390,height:844});await shot('11-flight-mobile');await page.locator('#tab-model').click();await page.waitForFunction(()=>!window.flightLab.assetLoading);await shot('12-model-mobile');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal mobile overflow');
 const checks=['12 comparable views','desktop and 390px layout','no browser or HTTP errors'];
 if(full){
  await page.locator('#tab-flight').click();
  await page.locator('#touch-throttle').fill('78');await page.locator('#touch-throttle').dispatchEvent('input');await page.waitForFunction(()=>window.flightLab.controls.throttle===.78);
  await page.setViewportSize({width:960,height:720});
  await page.locator('#input-settings').click();await page.locator('#sensitivity').fill('85');await page.locator('#sensitivity').dispatchEvent('input');
  await page.locator('[data-binding="KeyW"]').click();await page.keyboard.press('KeyT');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('flight-input-v1')));if(saved.sensitivity!==.85||saved.bindings.KeyW!=='KeyT')throw new Error('Input profile did not persist');
  await page.locator('#restore-controls').click();await page.locator('#close-controls').click();
  await page.locator('#trim-up').click();await page.waitForFunction(()=>document.getElementById('trim-value').textContent==='+1%');await page.locator('#center-controls').click();
  await page.locator('#play').click();await page.locator('#viewport canvas').focus();const pitch=await page.evaluate(()=>window.flightLab.angles[1]);
  await page.keyboard.down('ArrowUp');await page.waitForFunction(p=>window.flightLab.controls.elevator>.1&&window.flightLab.angles[1]>p+.008,pitch);await page.keyboard.up('ArrowUp');
  await page.locator('#play').click();await page.waitForFunction(()=>!window.flightLab.running);
  await page.locator('#sound').click();await page.waitForFunction(()=>document.getElementById('sound').getAttribute('aria-pressed')==='true');await page.locator('#sound').click();
  await page.locator('#technical-toggle').click();if(!await page.locator('#technical').isVisible())throw new Error('Diagnostics panel failed');
  const diagnosticDownload=page.waitForEvent('download');await page.locator('#export-diagnostics').click();await diagnosticDownload;await page.locator('#technical-toggle').click();
  await page.locator('#settings-toggle').click();const csvDownload=page.waitForEvent('download');await page.locator('#export').click();await csvDownload;await page.locator('#settings-toggle').click();
  await page.locator('#quality').selectOption('ultra');await page.waitForFunction(()=>window.flightLab.quality==='ultra');await shot('13-flight-ultra');
  await page.locator('[data-camera="pilot"]').click();await shot('14-pilot-ultra');
  await page.locator('#tab-model').click();await page.waitForFunction(()=>document.getElementById('asset-progress').hidden);await page.locator('#focus-view').click();await shot('15-evolved-ultra');
  await page.evaluate(()=>{document.querySelector('[data-preset="cockpit"]').click();const s=document.getElementById('cutaway');s.value='cockpit';s.dispatchEvent(new Event('change'));});await shot('16-cockpit-ultra');
  for(const [i,name] of ['pilot-panel','rear-panel'].entries()){await page.evaluate(p=>document.querySelector(`[data-preset="${p}"]`).click(),name);await shot(`${17+i}-${name}`);}
  checks.push('full original decoded triangle count','inspector pauses flight','evolved edition','touch throttle','profile persistence and key rebinding','trim','keyboard changes physical pitch','audio toggle','diagnostic JSON download','telemetry CSV download','Ultra materials','geometric pilot cockpit','both cockpit stations');
 }
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').slice(-2).join('/'),bytes:r.encodedBodySize,durationMs:r.duration})));
 const report={capturedAt:new Date().toISOString(),base,viewport:[960,720],quality:'light (13–18 supplementary Ultra)',gpu:'Chromium SwiftShader (software)',edition:process.argv[4]||'original',readyMs,initialEncodedBytes,timing,timingSampleValid:timing.frames>=20,totalEncodedBytes:resources.reduce((s,r)=>s+r.bytes,0),resources,checks,errors};
 writeFileSync(out+'/audit.json',JSON.stringify(report,null,2));if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify({readyMs,timing,totalEncodedBytes:report.totalEncodedBytes}));
}finally{await browser.close();}
