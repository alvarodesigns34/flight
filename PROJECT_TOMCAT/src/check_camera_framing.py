"""Check that the six whole-aircraft cameras include the complete visual assembly."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
from config import ROOT
scene=bpy.context.scene;records=[]
objects=[o for o in bpy.data.objects if o.parent and o.type in {'MESH','CURVE','FONT'}]
for camera in sorted([o for o in bpy.data.objects if o.type=='CAMERA' and int(o.name[:2])<=6],key=lambda x:x.name):
    scene.camera=camera
    scene.render.resolution_x=1280;scene.render.resolution_y=1280 if camera.name=='04_TOP' else 880
    bpy.context.view_layer.update()
    points=[world_to_camera_view(scene,camera,o.matrix_world@Vector(c)) for o in objects for c in o.bound_box]
    bounds={'x':[min(p.x for p in points),max(p.x for p in points)],'y':[min(p.y for p in points),max(p.y for p in points)]}
    passed=all(0<=v<=1 for interval in bounds.values() for v in interval)
    records.append(dict(camera=camera.name,bounds=bounds,full_aircraft_in_frame=passed))
(ROOT/'logs'/'camera_framing.json').write_text(json.dumps(records,indent=2))
assert all(r['full_aircraft_in_frame'] for r in records), records
print('ALL_SIX_CAMERAS_FRAME_AIRCRAFT',flush=True)
