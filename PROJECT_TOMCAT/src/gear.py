import math
from math import sin,cos,pi
from mathutils import Vector
import geometry as g
from geometry import mesh,box,cylinder,ring,tube,text,Fasteners

def forged_link(label,a,b,width=.12,thickness=.035):
    """Sculptural perforated plate with a real lightening aperture, not an engineered part."""
    a=Vector(a);b=Vector(b);center=(a+b)*.5;long=(b-a).normalized()
    normal=Vector((1,0,0));side=long.cross(normal).normalized()
    length=(b-a).length;verts=[];faces=[];n=48
    for depth in [-thickness/2,thickness/2]:
        for inner in [False,True]:
            for i in range(n):
                t=2*pi*i/n
                rx=length*(.29 if inner else .61);ry=width*(.19 if inner else .50)
                verts.append(tuple(center+long*rx*cos(t)+side*ry*sin(t)+normal*depth))
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    o=mesh(label,verts,faces,'Wheel_white');g.bevel(o,.005,3)
    for idx,p in enumerate([a,b]):
        cylinder(label+f'_pin_{idx}',tuple(p-normal*(thickness*.8)),tuple(p+normal*(thickness*.8)),width*.19,'Steel',n=6)
        for s in [-1,1]:ring(label+f'_pin_washer_{idx}_{s}',tuple(p+normal*s*thickness*.55),width*.23,.005,'Steel','X',32,8)
    return o

def wheel(label,x,y,z,r,width):
    # Lathed tire carcass with shoulders, recessed rim and circumferential tread grooves.
    profile=[(-width*.5,r*.60),(-width*.52,r*.79),(-width*.47,r*.93),(-width*.36,r*.985),(-width*.23,r),(-width*.10,r*.999),(width*.10,r*.999),(width*.23,r),(width*.36,r*.985),(width*.47,r*.93),(width*.52,r*.79),(width*.5,r*.60)]
    # Insert actual recessed tread slots into the radial cross section.
    for xx in [-.18,-.06,.06,.18]:
        axial=xx*width*1.6
        profile += [(axial-.006,r*.998),(axial-.003,r-.012),(axial+.003,r-.012),(axial+.006,r*.998)]
    profile=sorted(profile)
    vs=[];fs=[];n=96
    for a,rr in profile:
        for i in range(n):t=2*pi*i/n;vs.append((x+a,y+rr*cos(t),z+rr*sin(t)))
    for j in range(len(profile)-1):
        for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    mesh(label+'_tire',vs,fs,'Rubber')
    cylinder(label+'_rim_barrel',(x-width*.48,y,z),(x+width*.48,y,z),r*.60,'Wheel_white',n=64)
    fast=Fasteners()
    for side in [-1,1]:
        a=x+side*width*.503
        ring(label+f'_rim_bead_{side}',(a,y,z),r*.60,.018,'Wheel_white','X',64)
        cylinder(label+f'_hub_recess_{side}',(a,y,z),(a+side*.006,y,z),r*.39,'Steel',n=48)
        cylinder(label+f'_axle_cap_{side}',(a,y,z),(a+side*.035,y,z),r*.17,'Wheel_white',n=48)
        cylinder(label+f'_axle_hex_nut_{side}',(a+side*.037,y,z),(a+side*.055,y,z),r*.095,'Steel',n=6)
        ring(label+f'_hub_seal_{side}',(a+side*.034,y,z),r*.175,.006,'Rubber','X',48)
        ring(label+f'_brake_disc_{side}',(a-side*.045,y,z),r*.47,.021,'Steel','X',64)
        for j in range(10):
            t=2*pi*j/10;yy=y+cos(t)*r*.465;zz=z+sin(t)*r*.465
            cylinder(label+f'_rim_recess_{side}_{j}',(a+side*.001,yy,zz),(a+side*.007,yy,zz),r*.062,'Instrument_black',n=20)
            fast.add((a+side*.012,y+cos(t+.17)*r*.32,z+sin(t+.17)*r*.32),(side,0,0),.012)
        # Sidewall lettering is geometric and stays legible at close range.
        text(label+f'_sidewall_legend_{side}','AVIATION',(a+side*.01,y,z+r*.75),r*.105,'Gray_panel',normal=(side,0,0),up=(0,0,1))
    fast.finish(label+'_rim_bolts')

def bay(label,x,y,z,w,length):
    box(label+'_bay_ceiling',(x,y,z),(w,length,.045),'Warm_white',.01)
    for s in [-1,1]:
        box(label+f'_bay_sidewall_{s}',(x+s*w*.48,y,z-.13),(.035,length,.27),'Warm_white',.01)
        for i in range(7):
            yy=y-length*.43+length*.86*i/6
            tube(label+f'_bay_frame_{s}_{i}',[(x+s*w*.47,yy,z-.24),(x+s*w*.47,yy,z-.025),(x+s*w*.24,yy,z-.025)],.013,'Wheel_white')
        for i in range(3):
            tube(label+f'_decorative_bay_line_{s}_{i}',[(x+s*(w*.2+i*.04),y-length*.4,z-.04),(x+s*(w*.2+i*.04),y+length*.4,z-.04)],.008 if i<2 else .012,'Steel')
    for i in range(3):box(label+f'_bay_visual_equipment_{i}',(x-w*.22+i*w*.22,y+length*.33,z-.08),(.13,.22,.10),'Cockpit_gray',.015)

def build():
    g.collection('Gear_Nose')
    bay('Nose',0,-5.60,1.91,.69,1.72)
    # Doors sit beside the opening, visibly distinct from the skin.
    for s in [-1,1]:
        door=box(f'Nose_bay_door_{s}',(s*.40,-5.52,1.59),(.035,1.65,.46),'Warm_white',.012)
        door.rotation_euler[1]=s*.22
        tube(f'Nose_door_inner_perimeter_{s}',[(s*.373,-6.25,1.44),(s*.373,-4.79,1.44),(s*.373,-4.79,1.75),(s*.373,-6.25,1.75)],.008,'Wheel_white',True)
        for j in range(5):
            box(f'Nose_door_inner_rib_{s}_{j}',(s*.375,-6.15+j*.30,1.60),(.018,.025,.28),'Wheel_white',.006)
        for y in [-6.13,-5.72,-5.23]:cylinder(f'Nose_door_hinge_{s}_{y}',(s*.35,y,1.84),(s*.35,y+.09,1.84),.025,'Steel')
        tube(f'Nose_door_actuator_{s}',[(s*.17,-5.75,1.76),(s*.39,-5.75,1.51)],.012,'Chrome')
    cylinder('Nose_upper_shock_body',(0,-5.68,1.83),(0,-5.66,1.07),.092,'Wheel_white',.075)
    cylinder('Nose_polished_oleo',(0,-5.66,1.09),(0,-5.64,.62),.045,'Chrome')
    cylinder('Nose_lower_fork_body',(0,-5.64,.72),(0,-5.55,.39),.075,'Wheel_white',.060)
    for i,z in enumerate([1.72,1.59,1.32,1.13]):
        cylinder(f'Nose_cast_body_collar_{i}',(0,-5.68,z-.022),(0,-5.68,z+.022),.101 if i<2 else .087,'Wheel_white')
        ring(f'Nose_collar_edge_{i}',(0,-5.68,z-.025),.095 if i<2 else .080,.004,'Steel','Z',48)
    for s in [-1,1]:
        box(f'Nose_trunnion_cast_lug_{s}',(s*.105,-5.65,1.63),(.075,.24,.19),'Wheel_white',.035)
        cylinder(f'Nose_trunnion_endcap_{s}',(s*.13,-5.65,1.63),(s*.17,-5.65,1.63),.055,'Steel',n=6)
    ring('Nose_oleo_dust_seal',(0,-5.66,1.07),.064,.012,'Rubber','Z',48)
    for s in [-1,1]:
        cylinder(f'Nose_fork_{s}',(s*.12,-5.61,.66),(s*.16,-5.48,.30),.033,'Wheel_white')
        cylinder(f'Nose_axle_{s}',(0,-5.48,.30),(s*.26,-5.48,.30),.036,'Steel')
        wheel(f'Nose_{"port" if s>0 else "starboard"}',s*.195,-5.48,.30,.30,.135)
    # Scissors, drag brace and static carrier launch bar visual silhouette.
    for s in [-1,1]:
        forged_link(f'Nose_scissor_upper_{s}',(s*.09,-5.58,1.16),(s*.09,-5.34,.91),.105,.024)
        forged_link(f'Nose_scissor_lower_{s}',(s*.09,-5.34,.91),(s*.09,-5.57,.74),.092,.024)
        cylinder(f'Nose_brace_{s}',(s*.20,-4.92,1.80),(s*.055,-5.62,.91),.028,'Wheel_white')
    cylinder('Nose_launch_bar_display',(0,-5.65,.71),(0,-6.10,.29),.026,'Steel')
    cylinder('Nose_launch_bar_crosspiece',(-.10,-6.10,.29),(.10,-6.10,.29),.03,'Steel')
    tube('Nose_visible_flexible_line',[(-.09,-5.71,1.7),(-.12,-5.73,1.1),(-.1,-5.65,.65),(-.13,-5.48,.39)],.011,'Rubber')
    cylinder('Nose_landing_lamp_housing',(.10,-5.73,1.30),(.10,-5.86,1.30),.062,'Steel')
    cylinder('Nose_landing_lamp_lens',(.10,-5.86,1.30),(.10,-5.87,1.30),.055,'Lamp')
    ring('Nose_lamp_bezel',(.10,-5.871,1.30),.055,.005,'Aluminum','Y',64)
    for j in range(-3,4):
        zz=1.30+j*.012;half=(.050**2-(j*.012)**2)**.5
        tube(f'Nose_lamp_lens_ridge_{j}',[(.10-half,-5.874,zz),(.10+half,-5.874,zz)],.001,'Gauge_glass',res=1)
    text('Nose_strut_inspection_plate','INSPECT\nDISPLAY',( -.104,-5.68,1.43),.020,'Marking_black',normal=(-1,0,0),up=(0,0,1))
    g.collection('Gear_Main')
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        bay(label,s*1.83,.83,1.58,.65,1.48)
        door=box(label+'_main_outer_door',(s*2.15,1.10,1.23),(.045,1.36,.62),'Warm_white',.018)
        door.rotation_euler[1]=s*.2
        box(label+'_main_door_inner_rib',(s*2.115,1.10,1.24),(.025,1.13,.035),'Wheel_white',.008)
        cylinder(label+'_main_trunnion',(s*1.49,.62,1.65),(s*2.02,.62,1.65),.075,'Steel')
        cylinder(label+'_main_upper_strut',(s*1.72,.66,1.63),(s*2.07,1.07,.98),.099,'Wheel_white',.082)
        cylinder(label+'_main_oleo',(s*2.07,1.07,.98),(s*2.21,1.32,.60),.052,'Chrome')
        cylinder(label+'_main_axle_body',(s*2.21,1.32,.60),(s*2.27,1.40,.49),.09,'Wheel_white')
        cylinder(label+'_main_wheel_axle',(s*2.12,1.40,.49),(s*2.52,1.40,.49),.065,'Steel')
        wheel(label+'_main_wheel',s*2.40,1.40,.49,.49,.30)
        for dx in [-.065,.065]:
            forged_link(label+f'_torque_link_upper_{dx}',(s*2.02+dx,1.09,1.04),(s*2.09+dx,1.37,.83),.13,.03)
            forged_link(label+f'_torque_link_lower_{dx}',(s*2.09+dx,1.37,.83),(s*2.20+dx,1.34,.63),.11,.03)
        cylinder(label+'_drag_brace',(s*1.45,1.45,1.58),(s*2.16,1.22,.73),.036,'Wheel_white')
        cylinder(label+'_side_brace',(s*1.15,.15,1.65),(s*2.08,1.08,.96),.033,'Wheel_white')
        cylinder(label+'_brace_piston',(s*1.25,.24,1.58),(s*1.66,.65,1.26),.019,'Chrome')
        for j in range(3):
            tube(label+f'_exterior_brake_line_{j}',[(s*(1.77+j*.025),.69,1.55),(s*(2.13+j*.025),1.05,.98),(s*(2.25+j*.025),1.38,.60),(s*2.27,1.52,.48)],.007 if j else .011,'Rubber' if j==0 else 'Steel')
        for idx,(xx,yy,zz) in enumerate([(2.07,1.07,.98),(2.09,1.37,.83),(1.72,.66,1.63)]):
            cylinder(label+f'_joint_bolt_{idx}',(s*xx-.11,yy,zz),(s*xx+.11,yy,zz),.025,'Steel',n=6)
        text(label+'_bay_door_identification','210',(s*(2.15+.026*cos(.2)),.93,1.23-.026*sin(.2)),.16,'Marking_black',normal=(s*cos(.2),0,-sin(.2)),up=(s*sin(.2),0,cos(.2)))
