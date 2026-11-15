"""Static camera rendering; state restored after each view. No keyframes."""
import bpy,sys,time,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from config import ROOT

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
camera_arg=args[0] if args else '01_FRONT_THREE_QUARTER'
width=int(args[1]) if len(args)>1 else 1600
samples=int(args[2]) if len(args)>2 else 64
names=sorted(c.name for c in bpy.data.objects if c.type=='CAMERA') if camera_arg in ['all','final'] else camera_arg.split(',')
scene=bpy.context.scene
scene.cycles.use_denoising='--no-denoise' not in args
scene.render.resolution_x=width;scene.render.resolution_y=round(width*11/16);scene.cycles.samples=samples
records=[]
for name in names:
    start=time.time();hidden=[]
    if camera_arg=='final':
        width,samples=(1800,48) if name.startswith('01_') else ((1400,40) if int(name[:2]) in [2,7,8,9,10,11] else (1280,24))
        scene.render.resolution_x=width;scene.cycles.samples=samples
    scene.render.resolution_y=width if name=='04_TOP' else round(width*11/16)
    scene.camera=bpy.data.objects[name]
    if name in ['03_PORT_PROFILE','05_FRONT','06_REAR']:
        for o in bpy.data.collections['Stage'].objects:o.hide_render=True;hidden.append(o)
    if name=='07_COCKPIT_CUTAWAY':
        for o in bpy.data.collections['Canopy'].objects:
            if o.name=='Canopy_transparent_shell':o.hide_render=True;hidden.append(o)
    if name=='10_STRUCTURE_CUTAWAY':
        for o in bpy.data.collections['Removable_Panels'].objects:o.hide_render=True;hidden.append(o)
    scene.render.filepath=str(ROOT/'renders'/f'{name}.png')
    print('RENDER_START',name,width,samples,flush=True)
    bpy.ops.render.render(write_still=True)
    for o in hidden:o.hide_render=False
    records.append({'camera':name,'width':width,'samples':samples,'seconds':round(time.time()-start,2),'hidden_static_cutaway':[o.name for o in hidden if o.name!='Neutral_studio_floor'],'hidden_stage':[o.name for o in hidden if o.name=='Neutral_studio_floor']})
    (ROOT/'logs'/f'render_{name}.json').write_text(json.dumps(records[-1],indent=2))
print('RENDER_COMPLETE',json.dumps(records),flush=True)
