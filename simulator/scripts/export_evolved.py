"""Author a separate visual evolution. Run with the immutable master open.

This is an artistic exhibit rig, not engineering geometry or real kinematics.
Original object identities are retained; selected geometry is replaced explicitly.
"""
import bpy, math, json, hashlib, sys,re,shutil
from collections import Counter
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'simulator/assets';NATIVE=ROOT/'PROJECT_TOMCAT/evolved'
SOURCE=ROOT/'PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend'
SHA='72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SHA
sys.path.insert(0,str(ROOT/'PROJECT_TOMCAT/src'))
sys.path.insert(0,str(Path(__file__).resolve().parent))
from config import SPAN
from airframe import tailpoint
source_scene=bpy.context.scene
source_objects=[o for o in source_scene.objects if o.type in {'MESH','CURVE','FONT'} and o.parent]
inventory={o.name for o in source_objects};changes=[];pivots={}
if '--export-existing' in sys.argv:inventory=set(json.loads((OUT/'evolved-model.json').read_text())['component_inventory'])

def replace(o,vertices,faces,reason):
    old=o.data;mesh=bpy.data.meshes.new(o.name+'_evolved_mesh');mesh.from_pydata(vertices,[],faces);mesh.update()
    for m in old.materials:mesh.materials.append(m)
    o.data=mesh
    for m in list(o.modifiers):o.modifiers.remove(m)
    for p in mesh.polygons:p.use_smooth=True
    o['evolution']=reason;changes.append({'object':o.name,'reason':reason,'vertices_before':len(old.vertices),'vertices_after':len(mesh.vertices)})

def point(s,u,v,side=1):
    return (s*(2.06+(SPAN/2-2.06)*u),.28+2.96*u+(4.08-2.95*u)*v,2.43-.11*u+side*(.128*(1-u)+.041*u)*max(0,math.sin(math.pi*v))**.73)

def closed_surface(s,us,vs,skip=None):
    vertices=[point(s,u,v,side) for side in [1,-1] for u in us for v in vs]
    stride=len(vs);layer=len(us)*stride;top=[]
    for j in range(len(us)-1):
        for i in range(len(vs)-1):
            if skip and skip((us[j]+us[j+1])/2,(vs[i]+vs[i+1])/2):continue
            a=j*stride+i;top.append((a,a+stride,a+stride+1,a+1))
    # Match exterior winding for both sides, close every cutout boundary.
    if s<0:top=[tuple(reversed(f)) for f in top]
    faces=top+[tuple(i+layer for i in reversed(f)) for f in top]
    edges=Counter(tuple(sorted((a,b))) for f in top for a,b in zip(f,f[1:]+f[:1]))
    for f in top:
        for a,b in zip(f,f[1:]+f[:1]):
            if edges[tuple(sorted((a,b)))]==1:faces.append((b,a,a+layer,b+layer))
    return vertices,faces

if '--export-existing' not in sys.argv:
    ranges=[(.04,.29),(.30,.61),(.62,.94)]
    def subdiv(values,step):
        result=[]
        for a,b in zip(values,values[1:]):result.extend(a+(b-a)*i/max(1,math.ceil((b-a)/step)) for i in range(max(1,math.ceil((b-a)/step))))
        return result+[values[-1]]
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        wing=bpy.data.objects[label+'_variable_sweep_wing']
        us=subdiv([0,.04,.29,.30,.61,.62,.94,1],1/44);vs=subdiv([0,.75,1],1/48)
        vertices,faces=closed_surface(s,us,vs,lambda u,v:v>.75 and any(a<u<b for a,b in ranges))
        replace(wing,vertices,faces,'Closed wing with actual trailing-edge cutouts; overlapping flap overlays removed')
        for i,(a,b) in enumerate(ranges,1):
            o=bpy.data.objects[f'{label}_flap_skin_{i}']
            vertices,faces=closed_surface(s,subdiv([a+.0015,b-.0015],1/44),subdiv([.754,1],1/48))
            replace(o,vertices,faces,'Closed, separated flap volume with hinge clearance and independent exhibition pivot')
            grp=f'{label}_flap_{i}';p0=Vector(point(s,a,.75,0));p1=Vector(point(s,b,.75,0));axis=(p1-p0).normalized()
            pivots[grp]={'center':tuple((p0+p1)/2),'parent':label+'_wing','axis':tuple(axis),'sign':-s}
            o['export_group']=grp

    # Replace the static rudder outline with a genuine closed movable volume.
    def fin_surface(s,us,vs,skip=None):
        vertices=[];faces=[]
        for side in [-1,1]:
            for u in us:
                for v in vs:
                    x,y,z=tailpoint(s,u,v);vertices.append((x+side*.082*(1-.65*u)*max(0,math.sin(math.pi*v))**.7,y,z))
        stride=len(vs);layer=len(us)*stride;skin=[]
        for j in range(len(us)-1):
            for i in range(len(vs)-1):
                if skip and skip((us[j]+us[j+1])/2,(vs[i]+vs[i+1])/2):continue
                a=j*stride+i;skin.append((a,a+stride,a+stride+1,a+1))
        faces=skin+[tuple(i+layer for i in reversed(f)) for f in skin]
        edges=Counter(tuple(sorted((a,b))) for f in skin for a,b in zip(f,f[1:]+f[:1]))
        for f in skin:
            for a,b in zip(f,f[1:]+f[:1]):
                if edges[tuple(sorted((a,b)))]==1:faces.append((b,a,a+layer,b+layer))
        return vertices,faces
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        fin=bpy.data.objects[label+'_canted_vertical_fin']
        vertices,faces=fin_surface(s,subdiv([0,.02,.938,1],1/44),subdiv([0,.768,1],1/40),lambda u,v:.02<u<.938 and v>.768)
        replace(fin,vertices,faces,'Closed fin with a trailing-edge opening for an independent rudder')
        rudder=fin.copy();rudder.data=fin.data.copy();rudder.name=label+'_articulated_rudder';source_scene.collection.objects.link(rudder)
        vertices,faces=fin_surface(s,subdiv([.022,.936],1/44),subdiv([.774,1],1/40))
        replace(rudder,vertices,faces,'Closed rudder with hinge clearance; illustrative visual motion only')
        rudder['export_group']=label+'_rudder';source_objects.append(rudder)

    # Replace block cushions with tailored rounded volumes: curved edges, shallow
    # button depressions, broad fabric folds and an independently closed back.
    for o in source_objects:
        if not (o.name.endswith('_seat_cushion') or o.name.endswith('_back_cushion')):continue
        size=[.48,.48,.15] if o.name.endswith('_seat_cushion') else [.48,.15,.60]
        verts=[];faces=[];n=24;radius=.038
        # Rounded cube projected from six independent face grids. No open borders.
        for axis in range(3):
            aa,bb=[k for k in range(3) if k!=axis]
            for sign in [-1,1]:
                start=len(verts)
                for j in range(n+1):
                    for i in range(n+1):
                        p=Vector((0,0,0));p[axis]=sign*size[axis]/2;p[aa]=(i/n-.5)*size[aa];p[bb]=(j/n-.5)*size[bb]
                        core=Vector([max(-d/2+radius,min(d/2-radius,p[k])) for k,d in enumerate(size)])
                        rounded=core+(p-core).normalized()*radius
                        # Cloth tension on the usable seat/back face, not random noise.
                        if (axis==2 and sign==1 and size[1]>.2) or (axis==1 and sign==-1 and size[2]>.2):
                            u=(i/n-.5)*2;v=(j/n-.5)*2;fade=max(0,(1-u*u)*(1-v*v))
                            bolster=.028*math.exp(-((abs(u)-.70)/.18)**2)*(1-v*v)+.013*math.exp(-((v+.40)/.30)**2)
                            quilting=-.004*math.exp(-((abs(u)-.34)/.045)**2)
                            rounded[axis]+=sign*fade*(bolster+quilting+.003*math.sin(16*u+3*v)*math.sin(8*v)-.012*math.exp(-18*(u*u+v*v)))
                        verts.append(tuple(rounded))
                for j in range(n):
                    for i in range(n):
                        a=start+j*(n+1)+i;f=(a,a+1,a+n+2,a+n+1)
                        # Grid winding is + for (x,y), - for (x,z), + for (y,z).
                        if sign*(1 if axis!=1 else -1)<0:f=tuple(reversed(f))
                        faces.append(f)
        replace(o,verts,faces,'Tailored rounded cushion with tension folds and shallow compressed seating area')
        # Weld the coincident borders for a manifold upholstered volume.
        import bmesh
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(o.data);bm.free()

    # Deterministic authored PBR texture set, UV mapped and packed into the native
    # file as well as embedded in glTF. No external downloads or procedural-only
    # Blender nodes are required by the browser.
    TEX=OUT/'finish';TEX.mkdir(exist_ok=True)
    def image(name,kind):
        n=512;im=bpy.data.images.new(name,width=n,height=n,alpha=False);im.colorspace_settings.name='Non-Color'
        pixels=[]
        for y in range(n):
            for x in range(n):
                u=x/n*math.tau;v=y/n*math.tau
                grain=math.sin(37*u+11*v)*math.sin(23*v-7*u)
                if kind=='cloth':
                    # Plain weave with broad tension variation. Tangent-space normal.
                    dx=.17*math.sin(64*u)*(.65+.35*math.cos(64*v));dy=.17*math.sin(64*v)*(.65+.35*math.cos(64*u))
                    nz=math.sqrt(max(0,1-dx*dx-dy*dy));rgb=((dx+1)/2,(dy+1)/2,(nz+1)/2)
                else:
                    broad=.5+.20*math.sin(3*u+2*v)+.12*math.sin(7*u-5*v)+.04*grain
                    rough=.35+.12*broad
                    # glTF ORM: red AO, green roughness, blue metalness factor 1.
                    rgb=(1,rough,1)
                pixels.extend((*rgb,1))
        im.pixels.foreach_set(pixels);im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
    paint=image('paint-orm','paint');fabric=image('fabric-normal','cloth')
    material_copies={}
    for old in list(bpy.data.materials):
        if not old.use_nodes:continue
        m=old.copy();m.name=old.name+'_evolved';p=m.node_tree.nodes.get('Principled BSDF')
        if not p:continue
        for socket in ['Base Color','Roughness','Normal']:
            for link in list(p.inputs[socket].links):m.node_tree.links.remove(link)
        if old.name=='Gauge_glass':p.inputs['Roughness'].default_value=.02
        if old.name in ['Gull_gray','Warm_white','Gray_panel','Radome']:
            t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=paint;t.label='Subtle satin paint variation, authored ORM'
            separate=m.node_tree.nodes.new('ShaderNodeSeparateColor');m.node_tree.links.new(t.outputs['Color'],separate.inputs[0]);m.node_tree.links.new(separate.outputs['Green'],p.inputs['Roughness'])
        if old.name in ['Olive_fabric','Harness']:
            t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=fabric
            normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45
            m.node_tree.links.new(t.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
        material_copies[old.name]=m

    for o in source_objects:
        if o.type!='MESH':continue
        for i,m in enumerate(o.data.materials):
            if m and m.name in material_copies:o.data.materials[i]=material_copies[m.name]
        uv=o.data.uv_layers.new(name='Evolved_UV') if not o.data.uv_layers else o.data.uv_layers[0]
        for poly in o.data.polygons:
            # Seam-aware cylindrical skin UVs; other surfaces use dominant-axis
            # projection at a consistent metre scale, including fabric cushions.
            worldnormal=(o.matrix_world.to_3x3()@poly.normal).normalized();drop=max(range(3),key=lambda k:abs(worldnormal[k]));axes=[k for k in range(3) if k!=drop]
            values=[]
            for li in poly.loop_indices:
                p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
                if o.name=='F14A_contoured_primary_skin':
                    from geometry import interpolate
                    w,h,z=interpolate(p.y);values.append(((p.y+9.3)/18.55,math.atan2((p.z-z)/max(h,.001),p.x/max(w,.001))/math.tau))
                else:
                    uv_scale=12 if any(m and ('Olive_fabric' in m.name or 'Harness' in m.name) for m in o.data.materials) else .5
                    values.append((p[axes[0]]*uv_scale,p[axes[1]]*uv_scale))
            if o.name=='F14A_contoured_primary_skin' and max(v[1] for v in values)-min(v[1] for v in values)>.5:values=[(u,v+1 if v<0 else v) for u,v in values]
            for li,value in zip(poly.loop_indices,values):uv.data[li].uv=value

    from bake_ao import bake
    ao_record=bake(source_objects,TEX)
    assert inventory.issubset({o.name for o in source_objects})
    NATIVE.mkdir(exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE/'F14A_TOMCAT_EVOLVED.blend'),compress=True)
else:
    previous=json.loads((OUT/'evolved-model.json').read_text());changes=previous['changes'];ao_record=previous['ambient_occlusion']

# Rebuild exhibition pivots identically when exporting an existing native file.
for s,label in [(1,'Port'),(-1,'Starboard')]:
    for i,(a,b) in enumerate([(.04,.29),(.30,.61),(.62,.94)],1):
        p0=Vector(point(s,a,.75,0));p1=Vector(point(s,b,.75,0))
        pivots[f'{label}_flap_{i}']={'center':tuple((p0+p1)/2),'parent':label+'_wing','axis':tuple((p1-p0).normalized()),'sign':-s}

for s,label in [(1,'Port'),(-1,'Starboard')]:
    p0=Vector(tailpoint(s,.02,.77));p1=Vector(tailpoint(s,.938,.77))
    pivots[label+'_rudder']={'center':tuple((p0+p1)/2),'axis':tuple((p1-p0).normalized())}

def group(o):
    n=o.name;cols={c.name for c in o.users_collection}
    if 'export_group' in o:return o['export_group']
    if cols&{'Gear_Main','Gear_Nose'} or 'bay_door_identification' in n:
        if '_bay_' in n and '_door_' not in n:return 'gear_bays'
        side='Nose' if 'Gear_Nose' in cols else 'Port' if n.startswith('Port') else 'Starboard'
        if 'door' in n.lower():
            if side=='Nose':return 'Nose_doors_'+('Starboard' if re.search(r'_\-1(?:_|$)',n) else 'Port')
            return side+'_doors'
        return side+'_gear'
    if n.startswith('Upper_port_national_insignia'):return 'Port_wing'
    for side in ['Port','Starboard']:
        if n.startswith(side+'_'):
            if (o.parent and o.parent.name==side+'_wing_exhibition_pivot') or any(k in n for k in ['wingtip_navigation','wing_chord','wing_span','wing_fastener','spoiler_']):return side+'_wing'
            if n.startswith(side+'_all_moving_horizontal_tail') or n.startswith(side+'_stabilator_panel'):return side+'_tail'
    for col,grp in [('Exhibition_Structure','structure'),('Removable_Panels','covers'),('Canopy','canopy'),('Cockpit_Front','cockpit'),('Cockpit_Rear','cockpit')]:
        if col in cols:return grp
    return 'airframe'

deps=bpy.context.evaluated_depsgraph_get();batches={};triangles=0
for o in source_objects:
    eo=o.evaluated_get(deps);me=eo.to_mesh()
    if not me:continue
    me.calc_loop_triangles();world=o.matrix_world.copy();nm=world.to_3x3().inverted().transposed()
    pos=[tuple(world@v.co) for v in me.vertices];normals=[tuple((nm@n.vector).normalized()) for n in me.corner_normals]
    uvs=me.uv_layers.active;materials=[m.name if m else 'default' for m in me.materials];remap={};grp=group(o)
    base_group=grp
    for tri in me.loop_triangles:
        grp=base_group
        center=sum((Vector(pos[i]) for i in tri.vertices),Vector())/3
        # Details and markings follow the surface they are painted on, rather
        # than floating above the undeformed main wing or fin.
        for s,label in [(1,'Port'),(-1,'Starboard')]:
            if base_group==label+'_wing':
                u=(s*center.x-2.06)/(SPAN/2-2.06);v=(center.y-.28-2.96*u)/max(.1,4.08-2.95*u)
                if v>.754:
                    for i,(a,b) in enumerate([(.04,.29),(.30,.61),(.62,.94)],1):
                        if a<u<b:grp=f'{label}_flap_{i}'
            if o.name.startswith(label+'_') and base_group=='airframe':
                u=(center.z-2.44)/(4.8768-2.44);cx,le,zz=tailpoint(s,u,0);v=(center.y-le)/max(.1,3.88-2.22*u)
                if .022<u<.936 and v>.774 and v<1.01 and abs(center.x-cx)<.18:grp=label+'_rudder'
        mat=materials[tri.material_index] if materials else 'default';verts,faces,ns,uv,uv2=batches.setdefault((grp,mat),([],[],[],[],[]));face=[]
        for idx,li in zip(tri.vertices,tri.loops):
            normal=normals[li];coord=tuple(me.uv_layers[0].data[li].uv) if me.uv_layers else (0,0);lightuv=tuple(me.uv_layers['AO_UV'].data[li].uv) if 'AO_UV' in me.uv_layers else (0,0);key=(grp,mat,idx,tuple(round(x,7) for x in normal),coord,lightuv)
            if key not in remap:remap[key]=len(verts);verts.append(pos[idx]);ns.append(normal);uv.append(coord);uv2.append(lightuv)
            face.append(remap[key])
        faces.append(tuple(face));triangles+=1
    eo.to_mesh_clear()

scene=bpy.data.scenes.new('Evolved_browser');bpy.context.window.scene=scene
for side,s in [('Port',1),('Starboard',-1)]:
    pivots[side+'_wing']={'center':(s*2.06,.85,2.43)};pivots[side+'_tail']={'center':(s*2.13,7.05,1.97)}
    pivots[side+'_gear']={'center':(s*2.69,.66,1.35)};pivots[side+'_doors']={'center':(s*2.15,1.1,1.58)}
pivots['Nose_gear']={'center':(0,-4.95,1.60)}
pivots['Nose_doors_Port']={'center':(.35,-5.52,1.84)};pivots['Nose_doors_Starboard']={'center':(-.35,-5.52,1.84)}
parents={}
for grp in sorted({key[0] for key in batches}):
    p=bpy.data.objects.new(grp,None);scene.collection.objects.link(p);parents[grp]=p;p.location=pivots.get(grp,{}).get('center',(0,0,0))
for grp,p in parents.items():
    spec=pivots.get(grp,{})
    if 'axis' in spec:
        x,y,z=spec['axis'];p['hinge_axis']=[x,z,-y];p['hinge_sign']=spec.get('sign',1)
    if spec.get('parent'):
        center=p.location.copy();p.parent=parents[spec['parent']];p.location=center-p.parent.location
        x,y,z=spec['axis'];p['hinge_axis']=[x,z,-y];p['hinge_sign']=spec['sign']
for (grp,mat),(verts,faces,ns,uvs,uv2s) in batches.items():
    center=Vector(pivots.get(grp,{}).get('center',(0,0,0)))
    mesh=bpy.data.meshes.new(grp+'_'+mat);mesh.from_pydata([tuple(Vector(p)-center) for p in verts],[],faces);mesh.update()
    for p in mesh.polygons:p.use_smooth=True
    mesh.normals_split_custom_set_from_vertices(ns)
    material=bpy.data.materials.get(mat)
    has_textures=material and material.use_nodes and any(n.type=='TEX_IMAGE' and n.image for n in material.node_tree.nodes)
    if has_textures:
        uv=mesh.uv_layers.new(name='Evolved_UV')
        for li,loop in enumerate(mesh.loops):uv.data[li].uv=uvs[loop.vertex_index]
        if mat.endswith('_AO'):
            ao=mesh.uv_layers.new(name='AO_UV')
            for li,loop in enumerate(mesh.loops):ao.data[li].uv=uv2s[loop.vertex_index]
        mesh.uv_layers.active=uv;uv.active_render=True
    ob=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(ob);ob.parent=parents[grp]
    if mat in bpy.data.materials:mesh.materials.append(bpy.data.materials[mat])
bpy.ops.export_scene.gltf(filepath=str(OUT/'tomcat-evolved.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True,export_yup=True,use_active_scene=True)
meta={'source_sha256':SHA,'source_objects':len(inventory),'exported_objects':len(source_objects),'added_objects':sorted({o.name for o in source_objects}-inventory),'retained_object_identities':len(inventory),'accidental_omissions':0,'triangles':triangles,'mesh_batches':len(batches),'changes':changes,'material_adaptation':'Embedded UV satin paint roughness and woven fabric tangent normals. Source PBR defaults retained for other surfaces. Artistic authoring; no real-aircraft calibration.','rig':'Independent flap/rudder volumes, attached markings, split nose/main gear and doors; exhibition motion only','asset_sha256':hashlib.sha256((OUT/'tomcat-evolved.glb').read_bytes()).hexdigest(),'native_sha256':hashlib.sha256((NATIVE/'F14A_TOMCAT_EVOLVED.blend').read_bytes()).hexdigest(),'bytes':(OUT/'tomcat-evolved.glb').stat().st_size}
shutil.copyfile(NATIVE/'F14A_TOMCAT_EVOLVED.blend',OUT/'F14A_TOMCAT_EVOLVED.blend')
meta['browser_lenses']='Thin transparent PBR approximation for readability; native retains transmissive lenses. Canopy keeps physical transmission in Ultra.'
meta['ambient_occlusion']=ao_record
meta['component_inventory']=sorted(inventory)
(OUT/'evolved-model.json').write_text(json.dumps(meta,indent=2)+'\n')
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SHA
print('EVOLVED',json.dumps({k:v for k,v in meta.items() if k not in ['component_inventory','changes']}),flush=True)
