/** Smoke-test a staged or live Pages subpath without requiring a local Python API. */
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=new URL(process.argv[2]||'http://127.0.0.1:5175/flight/');
if(!base.pathname.endsWith('/'))throw new Error('Pass the site URL with its trailing slash');
const output=process.argv[3]||'/tmp/tomcat-pages-check.json';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1100,height:800}});
 const errors=[],failedRequests=[],httpErrors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>failedRequests.push(r.url()));
 page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
 await page.goto(base.href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.flightLab?.ready,{},{timeout:120000});
 await page.locator('#play').click();await page.waitForFunction(()=>window.flightLab.running&&window.flightLab.time>.3);
 await page.locator('#play').click();await page.waitForFunction(()=>!window.flightLab.running);
 await page.locator('#sweep').fill('60');await page.locator('#sweep').dispatchEvent('input');
 await page.waitForFunction(()=>window.flightLab.controls.sweep===.6);
 const runtime=await page.evaluate(()=>window.flightLab);
 // Read through the same browser connection as the app, including its proxy.
 const build=await page.evaluate(async url=>{
  const response=await fetch(url);
  if(!response.ok)throw new Error('Missing deployed build manifest: '+response.status);
  return response.json();
 },new URL('build-info.json',base).href);
 const result={checked_at:new Date().toISOString(),url:base.href,source_commit:build.source_commit,runtime_files:build.files.length,
  checks:['Pages subdirectory asset loading','WebGL aircraft ready','start flight','pause flight','wing configuration control'],runtime,errors,failedRequests,httpErrors};
 await page.screenshot({path:output.replace(/\.json$/,'.png')});
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 if(errors.length||failedRequests.length||httpErrors.length)throw new Error(JSON.stringify({errors,failedRequests,httpErrors}));
 console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
