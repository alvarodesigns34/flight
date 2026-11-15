import bpy,math
from mathutils import Vector
import geometry as g
from geometry import box,text

CAMERAS={
 '01_FRONT_THREE_QUARTER':((-23,-29,15),(0,0,1.8),23.5),
 '02_REAR_THREE_QUARTER':((-23,27,13),(0,1,1.8),23.5),
 '03_PORT_PROFILE':((32,0,2.15),(0,0,2.15),24),
 '04_TOP':((0,0,36),(0,0,0),22.8),
 '05_FRONT':((0,-34,2.15),(0,-.2,2.15),23.5),
 '06_REAR':((0,33,2.2),(0,1,2.2),23.5),
 '07_COCKPIT_CUTAWAY':((-2.8,-1.1,5.75),(0,-4.45,2.65),4.7),
 '08_NOSE_LANDING_GEAR':((-2.3,-8.5,1.9),(0,-5.55,.95),2.7),
 '09_TF30_EXHAUSTS':((-4.7,14.7,4.1),(0,8.65,1.9),5.6),
 '10_STRUCTURE_CUTAWAY':((-6.7,9.6,8.6),(-1.43,5.8,2.05),4.9),
 '11_MAIN_LANDING_GEAR':((-5,-1.5,1.8),(-2.1,1.05,.91),2.9),
}

def camera(name,loc,target,scale):
    data=bpy.data.cameras.new(name);data.type='ORTHO';data.ortho_scale=scale
    ob=bpy.data.objects.new(name,data);g.link(ob,parent=False);ob.location=loc
    ob.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    if name=='04_TOP':ob.rotation_euler=(0,0,math.pi)
    data.lens=55;data.clip_start=.05;data.clip_end=200
    return ob
def area(name,loc,target,power,color,size,size_y=None):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='RECTANGLE';d.size=size;d.size_y=size_y or size
    o=bpy.data.objects.new(name,d);g.link(o,parent=False);o.location=loc
    o.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    return o
def build():
    scene=bpy.context.scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.unit_settings.length_unit='METERS'
    g.collection('Stage')
    floor=box('Neutral_studio_floor',(0,0,-.045),(200,200,.06),'Floor',0)
    floor['purpose']='Neutral geometry assessment stage'
    g.collection('Lighting')
    area('Key_large_softbox',(-10,-8,16),(0,0,0),4100,(1,.91,.80),11,17)
    area('Fill_cool_softbox',(11,-3,11),(0,0,2),2900,(.78,.88,1),9,15)
    area('Rim_rear_strip',(1,11,15),(0,2,1.8),5100,(.85,.92,1),13,5)
    area('Nose_reflection_strip',(-1,-12,9),(0,-4,2),1200,(1,1,1),3,9)
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.22,.26,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    g.collection('Cameras')
    for name,(loc,target,scale) in CAMERAS.items():camera(name,loc,target,scale)
    scene.camera=bpy.data.objects['01_FRONT_THREE_QUARTER']
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=64
    # Render with the official Blender binary (bundled OIDN); distro build lacks it.
    scene.cycles.use_denoising=True;scene.cycles.max_bounces=10
    scene.cycles.transmission_bounces=8;scene.cycles.glossy_bounces=4
    scene.render.threads_mode='FIXED';scene.render.threads=3
    scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8'
    scene.view_settings.view_transform='AgX'
    scene.render.film_transparent=False
    scene['identity']='F-14A-95-GR / 160391 / VF-84 / circa 1978; artistic reconstruction'
    scene['readme']='Read RESEARCH_AND_REFERENCES.md and BUILD_REPORT.md; no animation or functional systems.'
    for workspace in bpy.data.workspaces:
        for screen in [workspace.screens[0]] if hasattr(workspace,'screens') and workspace.screens else []:
            for ar in screen.areas:
                if ar.type=='VIEW_3D':ar.spaces.active.clip_end=200
