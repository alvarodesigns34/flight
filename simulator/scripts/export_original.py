"""Full-resolution browser derivative of the ORIGINAL master, without decimation.
Preserves every evaluated aircraft triangle, corner normals, colours and all
interior exhibit parts. The native source is copied byte-for-byte alongside it.
Blender procedural shaders require a documented PBR adaptation in WebGL.
"""
import bpy, hashlib, json, shutil
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'simulator/assets';OUT.mkdir(exist_ok=True)
SOURCE=ROOT/'PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend'
EXPECTED='72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED,'Original master changed'

def group(o):
    n=o.name
    if n.startswith('Upper_port_national_insignia'):return 'Port_wing'
    for side in ['Port','Starboard']:
        if n.startswith(side+'_'):
            if (o.parent and o.parent.name==side+'_wing_exhibition_pivot') or any(k in n for k in ['wingtip_navigation','wing_chord','wing_span','wing_fastener','spoiler_']):return side+'_wing'
            if n.startswith(side+'_all_moving_horizontal_tail') or n.startswith(side+'_stabilator_panel'):return side+'_tail'
    cols={c.name for c in o.users_collection}
    if cols&{'Gear_Main','Gear_Nose'} or 'bay_door_identification' in n:return 'gear'
    if 'Exhibition_Structure' in cols:return 'structure'
    if 'Removable_Panels' in cols:return 'covers'
    if 'Canopy' in cols:return 'canopy'
    if cols&{'Cockpit_Front','Cockpit_Rear'}:return 'cockpit'
    return 'airframe'

deps=bpy.context.evaluated_depsgraph_get();batches={};objects=0;triangles=0
for o in list(bpy.context.scene.objects):
    if o.type not in {'MESH','CURVE','FONT'} or not o.parent:continue
    objects+=1;eo=o.evaluated_get(deps);me=eo.to_mesh()
    if not me:continue
    me.calc_loop_triangles();world=o.matrix_world.copy();normal_matrix=world.to_3x3().inverted().transposed()
    positions=[tuple(world@v.co) for v in me.vertices]
    normals=[tuple((normal_matrix@n.vector).normalized()) for n in me.corner_normals]
    mats=[m.name if m else 'default' for m in me.materials];grp=group(o);remap={}
    for tri in me.loop_triangles:
        matname=mats[tri.material_index] if mats else 'default'
        v,f,ns=batches.setdefault((grp,matname),([],[],[]));face=[]
        for idx,loop in zip(tri.vertices,tri.loops):
            normal=normals[loop];key=(matname,idx,tuple(round(x,7) for x in normal))
            if key not in remap:remap[key]=len(v);v.append(positions[idx]);ns.append(normal)
            face.append(remap[key])
        f.append(tuple(face));triangles+=1
    eo.to_mesh_clear()
print('ORIGINAL_EVALUATED',objects,triangles,flush=True)
scene=bpy.data.scenes.new('Original_full_resolution');bpy.context.window.scene=scene
materials={};provenance={}
for source in list(bpy.data.materials):
    if not source.use_nodes:continue
    m=source.copy();m.name=source.name+'_original';p=m.node_tree.nodes.get('Principled BSDF')
    if p:
        provenance[source.name]={k:list(p.inputs[k].default_value) if hasattr(p.inputs[k].default_value,'__len__') else p.inputs[k].default_value for k in ['Base Color','Roughness','Metallic','IOR','Transmission Weight']}
        for socket in ['Base Color','Roughness','Normal']:
            for link in list(p.inputs[socket].links):m.node_tree.links.remove(link)
    materials[source.name]=m
pivots={'Port_wing':(2.06,.85,2.43),'Starboard_wing':(-2.06,.85,2.43),'Port_tail':(2.13,7.05,1.97),'Starboard_tail':(-2.13,7.05,1.97)}
for grp in sorted({key[0] for key in batches}):
    center=pivots.get(grp,(0,0,0));parent=bpy.data.objects.new(grp,None);scene.collection.objects.link(parent);parent.location=center
    for (name,mat),(vertices,faces,normals) in batches.items():
        if name!=grp:continue
        mesh=bpy.data.meshes.new(name+'_'+mat);mesh.from_pydata([tuple(Vector(p)-Vector(center)) for p in vertices],[],faces);mesh.update()
        for polygon in mesh.polygons:polygon.use_smooth=True
        mesh.normals_split_custom_set_from_vertices(normals)
        ob=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(ob);ob.parent=parent
        if mat in materials:mesh.materials.append(materials[mat])
bpy.ops.export_scene.gltf(filepath=str(OUT/'tomcat-original.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True,export_yup=True,use_active_scene=True)
shutil.copyfile(SOURCE,OUT/'F14A_TOMCAT_ORIGINAL.blend')
assert sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH')==triangles
metadata={'source_sha256':EXPECTED,'source_commit':'a43319cc19591294c537d8e8064a71d0997f84dc','source_objects':objects,'source_evaluated_triangles':triangles,'exported_triangles':triangles,'decimated':False,'omitted_objects':0,'corner_normals_preserved':True,'mesh_batches':sum(o.type=='MESH' for o in scene.objects),'bytes':(OUT/'tomcat-original.glb').stat().st_size,'asset_sha256':hashlib.sha256((OUT/'tomcat-original.glb').read_bytes()).hexdigest(),'native_download_sha256':hashlib.sha256((OUT/'F14A_TOMCAT_ORIGINAL.blend').read_bytes()).hexdigest(),'material_adaptation':'Authored PBR base colours, roughness, metalness, IOR and transmission retained. Blender Noise/ColorRamp/bump are approximated in the browser, not pixel-identical to Cycles.','material_defaults':provenance}
(OUT/'original-model.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps({k:v for k,v in metadata.items() if k!='material_defaults'},indent=2),flush=True)
