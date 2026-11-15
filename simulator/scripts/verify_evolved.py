"""Independent saved-native inventory, materials and modified-surface checks."""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
meta=json.loads((ROOT/'simulator/assets/evolved-model.json').read_text())
objects={o.name:o for o in bpy.context.scene.objects if o.type in {'MESH','CURVE','FONT'} and o.parent}
assert set(meta['component_inventory']).issubset(objects)
assert len(meta['component_inventory'])==1832
assert set(objects)-set(meta['component_inventory'])==set(meta['added_objects'])
assert len(objects)==1834
modified=[]
for change in meta['changes']:
    o=objects[change['object']];assert o.type=='MESH'
    assert len(o.data.vertices)>0 and len(o.data.polygons)>0
    assert 'evolution' in o;modified.append(o.name)
for side in ['Port','Starboard']:
    assert objects[side+'_articulated_rudder']['export_group']==side+'_rudder'
    for i in range(1,4):assert objects[f'{side}_flap_skin_{i}']['export_group']==f'{side}_flap_{i}'
for name in meta['ambient_occlusion']['selected_objects']:
    o=objects[name];assert 'AO_UV' in o.data.uv_layers
    assert all(m.name.endswith('_AO') for m in o.data.materials)
assert all(image.packed_file for image in bpy.data.images if image.name in ['paint-orm','fabric-normal','Evolved_local_occlusion'])
for name in ['F14A_TOMCAT_MASTER.blend']:
    assert hashlib.sha256((ROOT/'PROJECT_TOMCAT'/name).read_bytes()).hexdigest()==meta['source_sha256']
result={'native_file':'PROJECT_TOMCAT/evolved/F14A_TOMCAT_EVOLVED.blend','native_sha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'source_objects_retained':1832,'added_objects':meta['added_objects'],'modified_objects':modified,'ao_objects':len(meta['ambient_occlusion']['selected_objects']),'images_packed':True,'original_hash_verified':True}
(ROOT/'simulator/evidence/evolved-native.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
