"""Package the executable checkpoint from an exact committed source revision."""
import argparse, hashlib, io, json, subprocess, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--ref',default='HEAD');args=parser.parse_args()
sha=subprocess.check_output(['git','rev-parse',args.ref],cwd=ROOT,text=True).strip()
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',sha,'--','simulator'],cwd=ROOT,text=True).splitlines()
paths=[p for p in paths if not any(x in p.split('/') for x in ['evidence','tests','scripts','reference']) and p!='simulator/README.md']
# Runtime root is the simulator directory. Source/development docs stay in Git.
selected={p:p.removeprefix('simulator/') for p in paths}
selected['simulator/README.md']='README.md'
for name in ['SIMULATION_DESIGN.md','FLIGHT_MODEL.md','VALIDATION_REPORT.md','CONTINUATION.md','BUILD_REPORT.md']:
    selected[name]='docs/'+name
out=ROOT/'downloads/TOMCAT_FLIGHT_LAB.zip';records=[]
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for source,target in sorted(selected.items()):
        data=subprocess.check_output(['git','show',f'{sha}:{source}'],cwd=ROOT)
        entry=zipfile.ZipInfo('TOMCAT_FLIGHT_LAB/'+target,date_time=(2026,11,15,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=(0o100755 if target.endswith('.sh') else 0o100644)<<16
        z.writestr(entry,data);records.append({'path':target,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    manifest={'source_repository':'https://github.com/alvarodesigns34/flight','source_commit':sha,'files':records,'run':'python3 serve.py, then http://127.0.0.1:5173','scope':'Generic educational flight dynamics; artistic historic aircraft shell.'}
    z.writestr('TOMCAT_FLIGHT_LAB/PACKAGE_MANIFEST.json',json.dumps(manifest,indent=2))
result={'file':out.name,'source_commit':sha,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'file_count':len(records)}
(ROOT/'downloads/TOMCAT_FLIGHT_LAB.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
