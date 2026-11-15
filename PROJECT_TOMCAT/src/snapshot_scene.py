"""Fingerprint renderable object contents to verify a narrowly scoped cosmetic edit."""
import bpy,sys,json,hashlib
from pathlib import Path
bpy.context.view_layer.update();result={}
for o in bpy.data.objects:
    if o.type not in {'MESH','CURVE','FONT'}:continue
    data={'type':o.type,'matrix':[[round(v,7) for v in row] for row in o.matrix_world], 'materials':[m.name if m else None for m in o.data.materials]}
    if o.type=='MESH':
        data['vertices']=sorted(tuple(round(c,6) for c in v.co) for v in o.data.vertices)
        data['face_sizes']=sorted(len(p.vertices) for p in o.data.polygons)
        data['smooth_faces']=sum(p.use_smooth for p in o.data.polygons)
    elif o.type=='FONT':data['text']=[o.data.body,o.data.size,o.data.extrude,o.data.offset]
    else:data['curve']=[o.data.bevel_depth,o.data.bevel_resolution,[[tuple(p.co) for p in sp.points] for sp in o.data.splines]]
    result[o.name]=hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()
output=Path(sys.argv[sys.argv.index('--')+1]);output.write_text(json.dumps(result,indent=2))
print('SNAPSHOT_WRITTEN',len(result))
