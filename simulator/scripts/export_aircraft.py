"""Export a derived, material-batched browser mesh; never save the original master.
Blender +X port,+Y aft,+Z up -> glTF +X port,+Y up,-Z aft.
The viewer applies its explicit body-to-model matrix. Pivots retain exact visual placement.
"""
import bpy, bmesh, json, sys, hashlib
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'simulator/assets';OUT.mkdir(exist_ok=True)
source=ROOT/'PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend'
deps=bpy.context.evaluated_depsgraph_get()
# Parts that move together must share a batch, including their paint and panel details.
def group(o):
    n=o.name
    if n.startswith('Upper_port_national_insignia'):return 'Port_wing'
    for side in ['Port','Starboard']:
        if n.startswith(side+'_'):
            if (o.parent and o.parent.name==side+'_wing_exhibition_pivot') or any(k in n for k in ['wingtip_navigation','wing_chord','wing_span','wing_fastener','spoiler_']):return side+'_wing'
            if n.startswith(side+'_all_moving_horizontal_tail') or n.startswith(side+'_stabilator_panel'):return side+'_tail'
    if any(c.name in ['Gear_Main','Gear_Nose'] for c in o.users_collection):return 'gear'
    if 'bay_door_identification' in n:return 'gear'
    return 'airframe'
batches={};skipped=[];triangles=0;print('EXPORT_BEGIN',flush=True)
for o in list(bpy.data.objects):
    if o.type not in {'MESH','CURVE','FONT'} or not o.parent:continue
    if any(c.name=='Exhibition_Structure' for c in o.users_collection):skipped.append(o.name);continue
    eo=o.evaluated_get(deps);me=eo.to_mesh()
    if not me:continue
    me.calc_loop_triangles()
    # Batch by material, preserving evaluated triangles and world coordinates. Normals are regenerated after LOD.
    world=o.matrix_world.copy()
    transformed=[tuple(world@v.co) for v in me.vertices]
    index_map={}
    object_group=group(o)
    material_names=[m.name if m else 'default' for m in me.materials]
    for tri in me.loop_triangles:
        matname=material_names[tri.material_index] if material_names else 'default'
        key=(object_group,matname)
        v,f,_=batches.setdefault(key,([],[],matname))
        face=[]
        for idx in tri.vertices:
            remap=(matname,idx)
            if remap not in index_map:
                index_map[remap]=len(v);v.append(transformed[idx])
            face.append(index_map[remap])
        f.append(tuple(face));triangles+=1
    eo.to_mesh_clear()
print('BATCHED',triangles,len(batches),flush=True)
# Isolate the derivative in a fresh scene. Deleting the source objects while a
# dependency graph is alive can invalidate evaluated mesh references in Blender.
scene=bpy.data.scenes.new('Interactive_export');bpy.context.window.scene=scene
# glTF cannot reproduce Blender Noise/ColorRamp material networks. Keep the
# authored representative PBR defaults explicitly, rather than exporting white.
material_cache={}
for source_material in list(bpy.data.materials):
    if not source_material.use_nodes:continue
    mat=source_material.copy();mat.name=source_material.name+'_interactive'
    p=mat.node_tree.nodes.get('Principled BSDF')
    if p:
        for socket in ['Base Color','Roughness','Normal']:
            for link in list(p.inputs[socket].links):mat.node_tree.links.remove(link)
        # Transparent glass is handled as alpha in the viewer, avoiding expensive
        # realtime transmission prepasses on low-powered devices.
        p.inputs['Transmission Weight'].default_value=0
    material_cache[source_material.name]=mat
# Use metre-scale visual pivots. Static master remains untouched.
pivots={'airframe':(0,0,2.2),'gear':(0,0,2.2),'Port_wing':(2.06,.85,2.43),'Starboard_wing':(-2.06,.85,2.43),'Port_tail':(2.13,7.05,1.97),'Starboard_tail':(-2.13,7.05,1.97)}
for name,center in pivots.items():
    print('EXPORT_GROUP',name,flush=True)
    parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent);parent.location=center
    for (grp,matname),(v,f,_) in batches.items():
        mat=material_cache.get(matname)
        if grp!=name:continue
        mesh=bpy.data.meshes.new(grp+'_'+matname);mesh.from_pydata([tuple(Vector(p)-Vector(center)) for p in v],[],f);mesh.update()
        ob=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(ob);ob.parent=parent
        if mat:mesh.materials.append(mat)
        # Weld triangle vertices before simplification; moderate reduction for the interactive derivative only.
        bpy.context.view_layer.objects.active=ob;ob.select_set(True)
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(mesh);bm.free()
        if len(mesh.polygons)>2000:
            mod=ob.modifiers.new('Interactive_LOD','DECIMATE');mod.ratio=.30;bpy.ops.object.modifier_apply(modifier=mod.name)
        for p in ob.data.polygons:p.use_smooth=True
        ob.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(OUT/'tomcat.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True,export_yup=True)
result={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source_triangles_exported_before_lod':triangles,'derived_triangles':sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'draw_meshes':sum(o.type=='MESH' for o in scene.objects),'omitted_exhibition_objects':len(skipped),'asset_sha256':hashlib.sha256((OUT/'tomcat.glb').read_bytes()).hexdigest(),'bytes':(OUT/'tomcat.glb').stat().st_size,'pivots_blender_m':pivots,'limitation':'Visual rig only; pivot positions and motion are artistic, not engineering data. Gear toggles visibility without mechanical kinematics. Procedural Blender shaders are flattened to authored PBR defaults.'}
(ROOT/'simulator/evidence/export.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
