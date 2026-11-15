"""blender -b --factory-startup -t 3 --python src/build.py [-- --only cockpit]"""
import bpy,sys,time,json,traceback
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import config,materials,geometry as g,airframe,cockpit,gear,engines,detail,studio,validate

COMPONENTS={
 'fuselage':(airframe.build_fuselage,['Fuselage']),
 'wings':(airframe.build_wings,['Wings']),
 'stabilizers':(airframe.build_stabilizers,['Stabilizers']),
 'intakes':(airframe.build_intakes,['Intakes']),
 'cockpit':(cockpit.build,['Cockpit_Front','Cockpit_Rear']),
 'canopy':(cockpit.build_canopy,['Canopy']),
 'gear':(gear.build,['Gear_Nose','Gear_Main']),
 'engines':(engines.build,['Engines_Exterior','Removable_Panels','Exhibition_Structure']),
 'detail':(detail.build,['Surface_Detail']),
 'studio':(studio.build,['Stage','Lighting','Cameras']),
}
def run():
    t=time.time();args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    only=args[args.index('--only')+1] if '--only' in args else None
    output=Path(args[args.index('--output')+1]) if '--output' in args else config.ROOT/'F14A_TOMCAT_MASTER.blend'
    suffix='_component_check' if '--output' in args else ''
    if only:
        if only not in COMPONENTS:raise ValueError('Unknown component '+only)
        # Restore node material map when opening an existing master file.
        materials.M.update({m.name:m for m in bpy.data.materials})
        for o in list(bpy.data.objects):
            if o.get('generated_component')==only:bpy.data.objects.remove(o,do_unlink=True)
        g.ROOT=bpy.data.objects['F14A_STATIC_EXHIBIT_ROOT']
        tasks=[(only,COMPONENTS[only][0])]
    else:
        bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
        for c in list(bpy.data.collections):bpy.data.collections.remove(c)
        for c in config.COLLECTIONS:
            col=bpy.data.collections.new(c);bpy.context.scene.collection.children.link(col)
        materials.build()
        root=bpy.data.objects.new('F14A_STATIC_EXHIBIT_ROOT',None);bpy.data.collections['Auxiliary'].objects.link(root)
        root.empty_display_type='PLAIN_AXES';root.empty_display_size=1
        root['axes']='X port, Y aft, Z up; origin near wing glove center; meters'
        root['historical_identity']=config.IDENTITY
        g.ROOT=root
        tasks=[(name,fn) for name,(fn,_) in COMPONENTS.items()]
    progress=[]
    for name,fn in tasks:
        print('BUILD_COMPONENT',name,flush=True);start=time.time()
        before={o.name for o in bpy.data.objects};fn()
        for o in bpy.data.objects:
            if o.name not in before:o['generated_component']=name
        progress.append({'component':name,'seconds':round(time.time()-start,3)})
    cleanup=validate.clean_meshes([o for o in bpy.data.objects if o.get('generated_component')==only] if only else None)
    out=validate.audit(config.ROOT/'logs'/f'validation{suffix}.json')
    if not out['technical_pass']:raise RuntimeError('Technical validation failed; inspect validation JSON before saving')
    bpy.context.scene.camera=bpy.data.objects['01_FRONT_THREE_QUARTER']
    # Native project opens in material preview at a usable aircraft scale.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_distance=26
                area.spaces.active.region_3d.view_location=(0,0,2)
                area.spaces.active.clip_end=300
    bpy.context.scene.render.filepath=str(config.ROOT/'renders'/'01_FRONT_THREE_QUARTER.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
    (config.ROOT/'logs'/f'build{suffix}.json').write_text(json.dumps({'seconds':time.time()-t,'components':progress,'cleanup':cleanup,'technical_pass':out['technical_pass']},indent=2))
    print('BUILD_COMPLETE',round(time.time()-t,2),flush=True)
try:run()
except Exception:
    (config.ROOT/'logs'/'build_error.txt').write_text(traceback.format_exc());raise
