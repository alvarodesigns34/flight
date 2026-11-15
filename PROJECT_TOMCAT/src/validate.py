import bpy,bmesh,json,math,collections,hashlib
from mathutils import Vector
from config import ROOT,LENGTH,SPAN,HEIGHT,FIN_CANT_DEG

def clean_meshes(objects=None):
    summary={'welded_vertices':0,'removed_loose_vertices':0}
    for o in (objects if objects is not None else bpy.data.objects):
        if o.type!='MESH':continue
        bm=bmesh.new();bm.from_mesh(o.data);before=len(bm.verts)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-7)
        summary['welded_vertices']+=before-len(bm.verts)
        loose=[v for v in bm.verts if not v.link_faces]
        summary['removed_loose_vertices']+=len(loose)
        if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
    return summary

def audit(write_path=None):
    bpy.context.view_layer.update()
    objects=[o for o in bpy.data.objects if o.parent and o.type in {'MESH','CURVE','FONT'}]
    verts=sum(len(o.data.vertices) for o in objects if o.type=='MESH')
    polys=sum(len(o.data.polygons) for o in objects if o.type=='MESH')
    tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')
    pts=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    bounds=[[min(p[i] for p in pts),max(p[i] for p in pts)] for i in range(3)]
    # Key assembly envelopes use the deliberately authoritative geometry, excluding antenna and label bounds.
    probe=bpy.data.objects['Nose_probe'];rear=bpy.data.objects['Port_TF30_exhaust_petal_00']
    nose_y=min((probe.matrix_world@v.co).y for v in probe.data.vertices)
    aft_y=max((rear.matrix_world@v.co).y for v in rear.data.vertices)
    wing_pts=[o.matrix_world@v.co for o in objects if o.name.endswith('variable_sweep_wing') for v in o.data.vertices]
    tipz=max((o.matrix_world@v.co).z for o in objects if o.name.endswith('canted_vertical_fin') for v in o.data.vertices)
    measurements={'length_m':aft_y-nose_y,'span_m':max(p.x for p in wing_pts)-min(p.x for p in wing_pts),'height_to_fin_m':tipz}
    expected={'length_m':LENGTH,'span_m':SPAN,'height_to_fin_m':HEIGHT}
    checks={key:abs(value-expected[key])<.001 for key,value in measurements.items()}
    missing=[o.name for o in objects if not o.data.materials]
    zero=[];nonfinite=[];open_meshes=[];signatures={};duplicates=[]
    for o in objects:
        if o.type!='MESH':continue
        for v in o.data.vertices:
            if not all(math.isfinite(c) for c in v.co):nonfinite.append(o.name);break
        if any(p.area<1e-12 for p in o.data.polygons):zero.append(o.name)
        signature=hashlib.sha256()
        signature.update(str(tuple(round(x,8) for row in o.matrix_world for x in row)).encode())
        signature.update(str([tuple(round(c,8) for c in v.co) for v in o.data.vertices]).encode())
        signature.update(str([tuple(p.vertices) for p in o.data.polygons]).encode())
        sig=signature.hexdigest()
        if sig in signatures:duplicates.append([signatures[sig],o.name])
        else:signatures[sig]=o.name
        bm=bmesh.new();bm.from_mesh(o.data)
        if any(not e.is_manifold for e in bm.edges):open_meshes.append(o.name)
        bm.free()
    # Check reflected point sets of primary matched meshes with millimeter rounding.
    symmetry={}
    for suffix in ['variable_sweep_wing','canted_vertical_fin','all_moving_horizontal_tail','TF30_nacelle_skin']:
        l=bpy.data.objects.get('Port_'+suffix);r=bpy.data.objects.get('Starboard_'+suffix)
        def coordinates(o,reflect=False):
            return {(round((-1 if reflect else 1)*(o.matrix_world@v.co).x,4),round((o.matrix_world@v.co).y,4),round((o.matrix_world@v.co).z,4)) for v in o.data.vertices}
        symmetry[suffix]=coordinates(l,True)==coordinates(r) if l and r else False
    actions=[o.name for o in bpy.data.objects if o.animation_data]
    tail_inner=min(abs(v.co.x) for o in objects if o.name.endswith('all_moving_horizontal_tail') for v in o.data.vertices)
    nozzle_outer=max(abs(v.co.x) for o in objects if '_TF30_exhaust_petal_' in o.name for v in o.data.vertices)
    tail_nozzle_clearance=tail_inner-nozzle_outer
    fin_angles={}
    for label in ['Port','Starboard']:
        fin=bpy.data.objects[label+'_canted_vertical_fin'];vv=fin.data.vertices
        bottom=min(v.co.z for v in vv);top=max(v.co.z for v in vv)
        low=[v.co.x for v in vv if abs(v.co.z-bottom)<1e-5];high=[v.co.x for v in vv if abs(v.co.z-top)<1e-5]
        fin_angles[label]=math.degrees(math.atan2(abs(sum(high)/len(high))-abs(sum(low)/len(low)),top-bottom))
    laterality={
      'port_wing_positive_x':sum(v.co.x for v in bpy.data.objects['Port_variable_sweep_wing'].data.vertices)>0,
      'starboard_wing_negative_x':sum(v.co.x for v in bpy.data.objects['Starboard_variable_sweep_wing'].data.vertices)<0,
      'port_red_lens':bpy.data.objects['Port_wingtip_navigation_lens'].data.materials[0].name=='Nav_red',
      'starboard_green_lens':bpy.data.objects['Starboard_wingtip_navigation_lens'].data.materials[0].name=='Nav_green',
      'insignia_on_upper_port':all(v.co.x>0 for o in objects if o.name.startswith('Upper_port_national_insignia') for v in o.data.vertices),
      'port_profile_camera_positive_x':bpy.data.objects['03_PORT_PROFILE'].location.x>0}
    evaluated_triangles=0
    deps=bpy.context.evaluated_depsgraph_get()
    for o in objects:
        eo=o.evaluated_get(deps);me=eo.to_mesh()
        if me:evaluated_triangles+=sum(len(p.vertices)-2 for p in me.polygons)
        eo.to_mesh_clear()
    used_materials={m.name for ob in bpy.data.objects if ob.type in {'MESH','CURVE','FONT'} for m in ob.data.materials if m}
    out={'blender':bpy.app.version_string,'object_count_aircraft':len(objects),'mesh_vertices':verts,'mesh_faces':polys,'base_triangles':tris,'evaluated_triangles_including_curves':evaluated_triangles,'materials':len(used_materials),'cameras':len([o for o in bpy.data.objects if o.type=='CAMERA']),
      'measurements':measurements,'targets':expected,'dimension_checks':checks,'bounds_all_visual_geometry':bounds,
      'missing_materials':missing,'degenerate_face_objects':zero,'nonfinite_objects':nonfinite,'coincident_duplicate_meshes':duplicates,
      'primary_symmetry':symmetry,'animation_data_objects':actions,
      'aft_stabilator_nozzle_lateral_separation_m':tail_nozzle_clearance,
      'measured_fin_cant_deg':fin_angles,
      'laterality_checks':laterality,
      'open_surface_objects':open_meshes,'open_surfaces_note':'Intentional skin patches, decals, ducts, glass and ornamental vanes are not manufacturing solids.',
      'external_images':[{'path':im.filepath,'packed':bool(im.packed_file)} for im in bpy.data.images if im.source=='FILE'],
      'collections':{c.name:len(c.objects) for c in bpy.data.collections},
      'precision_limit':'Only overall envelope is verified numerically. Cross-sections, cockpit, gear, skin layout and exhibit engine structure are artistic estimates.'}
    out['technical_pass']=all(checks.values()) and all(symmetry.values()) and not missing and not zero and not nonfinite and not actions and not duplicates and tail_nozzle_clearance>0 and all(abs(a-FIN_CANT_DEG)<.01 for a in fin_angles.values()) and all(laterality.values())
    (write_path or ROOT/'logs'/'validation.json').write_text(json.dumps(out,indent=2))
    print('VALIDATION',json.dumps({k:v for k,v in out.items() if k not in ['open_surface_objects','collections']},indent=2),flush=True)
    return out
