"""Verify all package hashes, extract and start the standalone offline server."""
import hashlib, json, subprocess, sys, tempfile, time, urllib.request, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
package=ROOT/'downloads/TOMCAT_FLIGHT_LAB.zip'
with tempfile.TemporaryDirectory(prefix='tomcat-package-') as tmp:
    with zipfile.ZipFile(package) as z:
        assert z.testzip() is None
        z.extractall(tmp)
    folder=Path(tmp)/'TOMCAT_FLIGHT_LAB'
    manifest=json.loads((folder/'PACKAGE_MANIFEST.json').read_text())
    for entry in manifest['files']:
        data=(folder/entry['path']).read_bytes()
        assert len(data)==entry['bytes']
        assert hashlib.sha256(data).hexdigest()==entry['sha256'],entry['path']
    process=subprocess.Popen([sys.executable,str(folder/'serve.py'),'--port','5174'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                with urllib.request.urlopen('http://127.0.0.1:5174/',timeout=2) as r:
                    assert r.status==200;assert b'Tomcat' in r.read();break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('Packaged server did not become ready')
        for path in ['dist/app.js','style.css','assets/tomcat-original.glb','assets/THREE-LICENSE.txt']:
            with urllib.request.urlopen('http://127.0.0.1:5174/'+path) as r:
                assert r.status==200
                assert hashlib.sha256(r.read()).hexdigest()==hashlib.sha256((folder/path).read_bytes()).hexdigest()
        # Render the extracted application with the existing development test runner.
        script="""
import {chromium} from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:700}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5174/?quality=light');await page.waitForFunction(()=>window.flightLab?.ready,{},{timeout:240000});
await page.locator('#play').click();await page.waitForFunction(()=>window.flightLab?.time>.3);
await page.locator('#play').click();await page.waitForFunction(()=>!window.flightLab.running);
if(errors.length)throw new Error(JSON.stringify(errors));
console.log(JSON.stringify({ready:true,started:true,paused:true,errors}));await browser.close();
"""
        run=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True,timeout=360)
        assert run.returncode==0,run.stderr
        result={'source_commit':manifest['source_commit'],'verified_files':len(manifest['files']),'zip_integrity':True,'standalone_server':True,'http_asset_hashes_match':True,'browser':json.loads(run.stdout.strip())}
        (ROOT/'simulator/evidence/package_check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    finally:
        process.terminate();process.wait(timeout=10)
