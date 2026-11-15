"""Read-only master audit, optional regeneration comparison. Run inside Blender."""
import bpy, sys, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'PROJECT_TOMCAT/src'))
import validate
out=ROOT/'simulator/evidence';out.mkdir(exist_ok=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
name=args[0] if args else 'master_audit'
result=validate.audit(out/(name+'.json'))
result['input_file']=bpy.data.filepath
result['input_sha256']=hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest()
result['audit_scope']='Geometry checks are not an exhaustive intersection or historical-accuracy proof.'
(out/(name+'.json')).write_text(json.dumps(result,indent=2))
assert result['technical_pass']
assert not result['external_images']
print('AUDIT_PASS',name)
