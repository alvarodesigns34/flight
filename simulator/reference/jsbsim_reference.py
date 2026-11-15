"""Optional civil JSBSim reference adapter. Independent of the interactive visual shell.
Install: python -m pip install -r simulator/reference/requirements.txt
This exercises a mature 6-DOF engine using its bundled civil C172 model. It does
not validate the generic browser model or establish F-14 performance fidelity.
"""
import argparse, csv, json, math
from pathlib import Path
import jsbsim
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--seconds',type=float,default=10)
args=parser.parse_args()
if not 0<args.seconds<=300:parser.error('seconds must be in (0,300]')
fdm=jsbsim.FGFDMExec(jsbsim.get_default_root_dir());fdm.set_debug_level(0)
fdm.disable_output();fdm.set_dt(1/120)
assert fdm.load_model('c172x')
fdm['ic/h-sl-ft']=5000
fdm['ic/vt-fps']=180
fdm['ic/lat-geod-deg']=37
fdm['ic/long-gc-deg']=-122
fdm['ic/psi-true-deg']=0
fdm['propulsion/set-running']=-1
assert fdm.run_ic()
fdm.do_trim(0)
rows=[]
for i in range(round(args.seconds*120)):
    assert fdm.run()
    if i%12==0:
        row=[fdm.get_sim_time(),fdm['position/h-sl-ft']*.3048,fdm['velocities/vtrue-fps']*.3048,fdm['attitude/phi-rad'],fdm['attitude/theta-rad'],fdm['attitude/psi-rad']]
        assert all(math.isfinite(x) for x in row);rows.append(row)
out=ROOT/'simulator/evidence'
with (out/'jsbsim_civil_reference.csv').open('w') as f:
    writer=csv.writer(f);writer.writerow(['time_s','altitude_m','airspeed_mps','roll_rad','pitch_rad','yaw_rad']);writer.writerows(rows)
result={'engine':'JSBSim','version':jsbsim.__version__,'aircraft':'bundled c172x civil reference','physics_hz':120,'duration_s':fdm.get_sim_time(),'samples':len(rows),'trim_success':True,'all_finite':True,'first':rows[0],'last':rows[-1],'scope':'Engine integration smoke test only. No F-14 coefficients used; no browser-model cross-validation.'}
(out/'jsbsim_reference.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
