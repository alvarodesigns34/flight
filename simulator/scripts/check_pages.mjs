/** Smoke-test a staged or live Pages subpath without requiring a local Python API. */
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=new URL(process.argv[2]||'http://127.0.0.1:5175/flight/');
if(!base.pathname.endsWith('/'))throw new Error('Pass the site URL with its trailing slash');
const output=process.argv[3]||'/tmp/tomcat-pages-check.json';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1100,height:800}});
 page.setDefaultTimeout(240000);
 const errors=[],failedRequests=[],httpErrors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>failedRequests.push(r.url()));
 page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
 await page.goto(base.href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.flightLab?.ready,{},{timeout:240000});
 await page.locator('#play').click();await page.waitForFunction(()=>window.flightLab.running&&window.flightLab.time>.3);
 await page.locator('#play').click();await page.waitForFunction(()=>!window.flightLab.running);
 await page.locator('#settings-toggle').click();await page.locator('details.configuration > summary').click();
 await page.locator('#sweep').fill('60');await page.locator('#sweep').dispatchEvent('input');
 await page.waitForFunction(()=>window.flightLab.controls.sweep===.6);
 if(base.searchParams.has('verify')){await page.locator('#quality').selectOption('ultra');await page.waitForFunction(()=>window.flightLab.quality==='ultra');}
 await page.screenshot({path:output.replace(/\.json$/,'-flight.png')});
 await page.locator('#tab-model').click();await page.waitForFunction(()=>window.flightLab.tab==='model'&&!window.flightLab.running&&window.flightLab.originalLoaded&&document.getElementById('asset-progress').hidden);
 const runtime=await page.evaluate(()=>window.flightLab);
 if(runtime.originalTriangles!==1316961||runtime.originalObjects!==1832||runtime.originalSimplified!==false||runtime.actualOriginalTriangles!==1316961)throw new Error('Public inspector does not contain the full original model');
 // Read through the same browser connection as the app, including its proxy.
 const build=await page.evaluate(async url=>{
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error('Missing deployed build manifest: '+response.status);
  return response.json();
 },new URL('build-info.json?verify='+encodeURIComponent(base.searchParams.get('verify')||Date.now()),base).href);
 const expected=base.searchParams.get('verify');if(expected&&!build.source_commit.startsWith(expected))throw new Error('Unexpected deployed source commit: '+build.source_commit);
 const result={checked_at:new Date().toISOString(),url:base.href,source_commit:build.source_commit,runtime_files:build.files.length,
  checks:['Pages subdirectory asset loading','WebGL aircraft ready','start flight','pause flight','wing configuration control','original-model tab','full original geometry in public inspector'],runtime,errors,failedRequests,httpErrors};
 await page.screenshot({path:output.replace(/\.json$/,'.png')});
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 if(errors.length||failedRequests.length||httpErrors.length)throw new Error(JSON.stringify({errors,failedRequests,httpErrors}));
 console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
