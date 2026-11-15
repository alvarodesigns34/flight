"""Export editable-scene metadata, without modifying the scene or manufacturing data."""
import bpy,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from config import ROOT
materials=[]
for m in bpy.data.materials:
    if not m.users or not m.use_nodes:continue
    p=m.node_tree.nodes.get('Principled BSDF')
    if not p:continue
    inputs={}
    for name in ['Base Color','Metallic','Roughness','IOR','Transmission Weight']:
        socket=p.inputs[name];value=socket.default_value
        inputs[name]={'default':list(value) if hasattr(value,'__len__') else value,'linked':socket.is_linked}
    materials.append({'name':m.name,'shader':'Principled BSDF','inputs':inputs,'nodes':[n.bl_idname for n in m.node_tree.nodes]})
(ROOT/'resources'/'MATERIAL_PALETTE.json').write_text(json.dumps(materials,indent=2))
records=[]
for o in bpy.data.objects:
    if o.type=='EMPTY' or o.type=='CAMERA' or any(o.name.endswith(s) for s in ['variable_sweep_wing','canted_vertical_fin','all_moving_horizontal_tail','intake_outer_shell','instrument_panel','tub_floor','TF30_nacelle_skin','dorsal_engine_access_cover']):
        records.append({'name':o.name,'type':o.type,'component':o.get('generated_component'),'parent':o.parent.name if o.parent else None,'location_local_m':list(o.location),'rotation_euler_rad':list(o.rotation_euler),'scale':list(o.scale),'matrix_world':[[v for v in row] for row in o.matrix_world],'dimensions_m':list(o.dimensions)})
(ROOT/'resources'/'COMPONENT_TRANSFORMS.json').write_text(json.dumps({'axes':'X port, Y aft, Z up; meters','note':'Visual scene transforms. Many skin meshes are authored in assembly coordinates. Wing exhibition pivots are parent empties; no animation. These are not historical engineering coordinates.','objects':records},indent=2))
print('METADATA_EXPORTED',len(materials),len(records),flush=True)
