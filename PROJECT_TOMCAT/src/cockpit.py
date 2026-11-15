"""Decorative period cockpit: modeled instruments, no operational systems."""
import bpy,math
from math import sin,cos,pi
import geometry as g
from geometry import box,tube,cylinder,sphere,ring,text,mesh,Fasteners
from materials import M

def dial(name,x,y,z,r,seed=0):
    cylinder(name+'_case',(x,y-.018,z),(x,y+.018,z),r*1.13,'Instrument_black',n=40)
    cylinder(name+'_face',(x,y+.018,z),(x,y+.019,z),r*.94,'Instrument_face',n=40)
    ring(name+'_bezel',(x,y+.025,z),r,.006,'Instrument_black',axis='Y',n=40,m=8)
    verts=[];faces=[]
    for i in range(24):
        a=2*pi*(i/30)+.35;rr=r*.82;ln=r*(.20 if i%3==0 else .105);w=.0013
        vx=sin(a);vz=cos(a);start=len(verts)
        for rad,side in [(rr,-1),(rr,1),(rr-ln,1),(rr-ln,-1)]:
            verts.append((x+rad*vx+side*w*vz,y+.030,z+rad*vz-side*w*vx))
        faces.append(tuple(start+k for k in range(4)))
    mesh(name+'_engraved_ticks',verts,faces,'Needle',False)
    a=seed*.71+1.6
    tube(name+'_needle',[(x-r*.1*sin(a),y+.033,z-r*.1*cos(a)),(x+r*.65*sin(a),y+.033,z+r*.65*cos(a))],.0018,'Needle',res=1)
    cylinder(name+'_hub',(x,y+.032,z),(x,y+.037,z),.008,'Needle',n=16)
    text(name+'_scale','0   5   10',(x,y+.033,z-r*.45),r*.21,'Needle',normal=(0,1,0),up=(0,0,1))
    # Individual lens, not a flat instrument atlas.
    lens=cylinder(name+'_lens',(x,y+.039,z),(x,y+.040,z),r*.91,'Gauge_glass',n=40)

def seat(label,y):
    box(label+'_seat_pan',(0,y,2.25),(.56,.62,.11),'Seat_frame',.035)
    box(label+'_seat_cushion',(0,y-.055,2.34),(.48,.48,.15),'Olive_fabric',.055)
    back=box(label+'_back_cushion',(0,y+.19,2.68),(.48,.15,.60),'Olive_fabric',.05)
    back.rotation_euler[0]=-.10
    box(label+'_back_structure',(0,y+.30,2.70),(.56,.11,.82),'Seat_frame',.035)
    box(label+'_headrest',(0,y+.245,3.16),(.38,.22,.24),'Instrument_black',.055)
    for s in [-1,1]:
        cylinder(label+f'_seat_guide_{s}',(s*.265,y+.29,2.22),(s*.265,y+.29,3.20),.021,'Steel')
        box(label+f'_side_frame_{s}',(s*.27,y,2.50),(.055,.49,.12),'Seat_frame',.02)
        box(label+f'_arm_pad_{s}',(s*.285,y-.04,2.63),(.07,.38,.055),'Instrument_black',.022)
        # Harnesses are broad actual ribbon meshes with separate buckles and stitched edges.
        pts=[(s*.155,y+.087,3.01),(s*.14,y+.06,2.84),(s*.11,y+.05,2.60),(s*.08,y-.13,2.41)]
        verts=[]
        for x,yy,z in pts:verts.extend([(x-.027,yy,z),(x+.027,yy,z)])
        ob=mesh(label+f'_shoulder_harness_{s}',verts,[(0,1,3,2),(2,3,5,4),(4,5,7,6)],'Harness')
        mod=ob.modifiers.new('Woven_webbing_thickness','SOLIDIFY');mod.thickness=.003
        for side in [-1,1]:tube(label+f'_harness_stitch_{s}_{side}',[(x+side*.022,yy-.002,z) for x,yy,z in pts],.00065,'Olive_fabric',res=1)
        box(label+f'_harness_adjuster_{s}',(s*.135,y+.04,2.81),(.064,.012,.055),'Aluminum',.006)
        tube(label+f'_seat_cushion_piping_{s}',[(s*.226,y-.28,2.37),(s*.226,y+.13,2.37),(s*.226,y+.105,2.93)],.004,'Harness')
    box(label+'_lap_buckle',(0,y-.15,2.43),(.095,.055,.035),'Steel',.008)
    # Visual period seat handle; deliberately disconnected from any functional mechanism.
    loop=[(.125*cos(2*pi*i/64),y+.25,3.325+.048*sin(2*pi*i/64)) for i in range(65)]
    tube(label+'_seat_handle_display',loop,.011,'Squadron_yellow',True)
    for i in range(0,64,5):tube(label+f'_handle_stripe_{i}',loop[i:i+3],.0115,'Marking_black',res=1)
    text(label+'_seat_plaque','DISPLAY',(0,y+.357,2.85),.033,'Marking_white',normal=(0,1,0),up=(0,0,1))

def panel(label,y,rear=False):
    box(label+'_instrument_panel',(0,y,2.79),(1.02,.075,.55),'Cockpit_gray',.05)
    fast=Fasteners()
    for x in [-.46,.46]:
        for z in [2.57,3.00]:fast.add((x,y+.043,z),(0,1,0),.009)
    # Distinct analog clusters around period display silhouettes. Decorative layout;
    # exact equipment identities and wiring are intentionally not reconstructed.
    layout=[(-.37,2.95,.059),(-.21,2.95,.058),(-.37,2.79,.066),(-.21,2.79,.062),(-.37,2.61,.044),(.28,2.98,.043),(.41,2.98,.047),(.28,2.82,.056),(.40,2.69,.040),(.40,2.57,.035)]
    if rear:layout=[(-.35,2.95,.048),(-.35,2.79,.058),(-.35,2.61,.040),(.32,2.94,.045),(.35,2.77,.053),(.36,2.60,.038)]
    for idx,(x,z,r) in enumerate(layout):dial(label+f'_analog_{idx}',x,y+.052,z,r,idx)
    for j in range(3):
        xx=-.235+j*.052
        box(label+f'_vertical_scale_housing_{j}',(xx,y+.065,2.59),(.037,.027,.19),'Instrument_black',.004)
        for k in range(9):
            box(label+f'_vertical_tick_{j}_{k}',(xx,y+.082,2.515+k*.018),(.025,.002,.002),'Needle',0)
        box(label+f'_vertical_pointer_{j}',(xx+.010,y+.085,2.55+j*.025),(.012,.003,.012),'Squadron_yellow',.002)
    if rear:
        box(label+'_round_display_housing',(0,y+.09,2.71),(.31,.09,.29),'Instrument_black',.02)
        cylinder(label+'_round_crt',(0,y+.14,2.71),(0,y+.145,2.71),.117,'CRT',n=64)
        ring(label+'_display_ring',(0,y+.15,2.71),.125,.009,'Instrument_black')
        box(label+'_upper_period_display_case',(0,y+.06,2.98),(.25,.08,.17),'Instrument_black',.018)
        box(label+'_upper_period_display_glass',(0,y+.105,2.98),(.21,.004,.13),'CRT',.012)
        text(label+'_exhibit_label','VISUAL REPLICA',(0,y+.155,2.50),.026,'Needle',normal=(0,1,0),up=(0,0,1))
    else:
        for idx,(z,w,h) in enumerate([(2.91,.24,.21),(2.64,.27,.22)]):
            box(label+f'_period_display_frame_{idx}',(0,y+.05,z),(w+.045,.08,h+.035),'Instrument_black',.017)
            box(label+f'_period_display_glass_{idx}',(0,y+.095,z),(w,.006,h),'CRT',.009)
            for s in [-1,1]:
                for yy in [-1,1]:
                    cylinder(label+f'_display_screw_{idx}_{s}_{yy}',(s*(w*.5+.01),y+.09,z+yy*(h*.5+.006)),(s*(w*.5+.01),y+.099,z+yy*(h*.5+.006)),.005,'Steel',n=12)
        # Small optical reflector as a static glass plate, no information projected.
        o=box(label+'_optical_reflector',(0,y-.04,3.22),(.19,.006,.14),'Canopy_optical_glass',.007);o.rotation_euler[0]=-.26
    for j in range(8):
        xx=-.35+j*.10
        box(label+f'_annunciator_{j}',(xx,y+.045,3.103),(.082,.02,.035),'Instrument_black',.004)
        text(label+f'_annunciator_legend_{j}','AUX',(xx,y+.058,3.103),.014,'Needle',normal=(0,1,0),up=(0,0,1))
    for x in [-.445,.445]:
        for i in range(3):
            cylinder(label+f'_panel_knob_{x}_{i}',(x,y+.04,2.60+i*.16),(x,y+.09,2.60+i*.16),.018,'Instrument_black',n=24)
            tube(label+f'_knob_index_{x}_{i}',[(x,y+.094,2.60+i*.16),(x,y+.094,2.61+i*.16)],.0017,'Needle',res=1)
    fast.finish(label+'_panel_mounting_screws')
    # Glare hood is a shell canopy above the actual instruments.
    verts=[]
    for j in range(30):
        a=pi*j/29
        for yy in [y-.20,y+.01]:verts.append((.55*cos(a),yy,2.97+.17*sin(a)))
    ob=mesh(label+'_panel_glare_hood',verts,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(29)],'Antiglare')
    sol=ob.modifiers.new('Hood_edge_thickness','SOLIDIFY');sol.thickness=.008

def consoles(label,y):
    for s in [-1,1]:
        box(label+f'_console_{s}',(s*.44,y,2.38),(.22,1.04,.16),'Cockpit_gray',.02)
        for j in range(5):
            yy=y-.40+j*.20
            box(label+f'_console_insert_{s}_{j}',(s*.44,yy,2.467),(.19,.17,.012),'Instrument_black',.007)
            text(label+f'_console_caption_{s}_{j}',['AUX','LIGHT','PANEL','TRIM','TEST'][j],(s*.44,yy-.055,2.476),.017,'Needle')
            for k in range(3):
                xx=s*.44+(k-1)*.052
                cylinder(label+f'_toggle_base_{s}_{j}_{k}',(xx,yy,2.477),(xx,yy,2.485),.009,'Aluminum',n=16)
                cylinder(label+f'_toggle_stem_{s}_{j}_{k}',(xx,yy,2.485),(xx+.006,yy+.006,2.513),.0035,'Steel',n=12)
                sphere(label+f'_toggle_cap_{s}_{j}_{k}',(xx+.006,yy+.006,2.514),(.006,.006,.010),'Needle',12,6)
        for i in range(2):
            cylinder(label+f'_rotary_{s}_{i}',(s*.44,y-.34+i*.36,2.49),(s*.44,y-.34+i*.36,2.526),.022,'Instrument_black',n=24)
        tube(label+f'_console_cable_{s}',[(s*.56,y+.45,2.34),(s*.56,y+.35,2.21),(s*.49,y-.35,2.16)],.012,'Rubber')

def build():
    for label,y,rear,col in [('Pilot',-5.12,False,'Cockpit_Front'),('RIO',-3.67,True,'Cockpit_Rear')]:
        g.collection(col)
        box(label+'_tub_floor',(0,y-.10,2.105),(1.12,1.48,.07),'Cockpit_gray',.025)
        for s in [-1,1]:
            box(label+f'_tub_sidewall_{s}',(s*.577,y-.02,2.38),(.04,1.36,.48),'Cockpit_gray',.02)
            for j in range(5):box(label+f'_wall_pad_{s}_{j}',(s*.55,y-.54+j*.25,2.54),(.025,.21,.15),'Antiglare',.012)
        seat(label,y)
        panel(label,y-.61,rear)
        consoles(label,y)
        cylinder(label+'_control_pedestal',(0,y-.33,2.19),(0,y-.34,2.46),.035,'Steel')
        tube(label+'_decorative_control_grip',[(0,y-.34,2.46),(0,y-.37,2.62),(.015,y-.32,2.66)],.025,'Instrument_black')
        for s in [-1,1]:
            ob=box(label+f'_pedal_{s}',(s*.16,y-.76,2.23),(.15,.10,.13),'Steel',.012)
            ob.rotation_euler[0]=.4
            for j in range(4):tube(label+f'_pedal_rib_{s}_{j}',[(s*.16-.059,y-.79,2.19+j*.025),(s*.16+.059,y-.79,2.19+j*.025)],.003,'Aluminum')
        box(label+'_rear_bulkhead',(0,y+.52,2.56),(1.08,.04,.88),'Cockpit_gray',.03)

CANOPY=[(-6.66,.14,.06,2.74),(-6.38,.39,.32,2.71),(-5.95,.57,.61,2.69),(-5.52,.655,.79,2.68),(-4.90,.685,.83,2.67),(-4.2,.675,.81,2.66),(-3.5,.61,.70,2.66),(-2.95,.47,.43,2.67),(-2.61,.23,.045,2.69)]
def cp(y,t,offset=0):
    w,h,z=g.interpolate(y,CANOPY);return ((w+offset)*cos(t),y,z+(h+offset)*sin(t))
def build_canopy():
    g.collection('Canopy');vs=[];fs=[]
    for j in range(161):
        y=CANOPY[0][0]+(CANOPY[-1][0]-CANOPY[0][0])*j/160
        for i in range(65):vs.append(cp(y,pi*i/64))
    for j in range(160):
        for i in range(64):a=j*65+i;fs.append((a,a+1,a+66,a+65))
    ob=mesh('Canopy_transparent_shell',vs,fs,'Canopy_optical_glass')
    sol=ob.modifiers.new('Real_glass_shell_thickness','SOLIDIFY');sol.thickness=.007
    ob['optics']='IOR 1.45, 7 mm artistic shell thickness; not an engineering measurement'
    for i,y in enumerate([-6.64,-5.58,-4.24,-2.63]):
        tube(f'Canopy_transverse_frame_{i}',[cp(y,pi*k/80,.012) for k in range(81)],.025 if i in [0,3] else .033,'Gull_gray')
        tube(f'Canopy_frame_inner_seal_{i}',[cp(y,pi*k/80,-.022) for k in range(81)],.009,'Rubber')
    for s,t in [(-1,pi),(1,0)]:
        tube(f'Canopy_lower_rail_{s}',[cp(-6.63+j*4.0/100,t,.008) for j in range(101)],.028,'Gull_gray')
        tube(f'Canopy_lower_seal_{s}',[cp(-6.63+j*4.0/100,t,.018) for j in range(101)],.008,'Rubber')
        tube(f'Windscreen_front_side_frame_{s}',[cp(-6.63+j*1.05/50,pi*.5+s*.43,.014) for j in range(51)],.020,'Gull_gray')
    fast=Fasteners()
    for y in [-6.3,-6.1,-5.9,-5.6,-5.2,-4.8,-4.4,-4.0,-3.6,-3.2,-2.9]:
        for t in [0,pi]:fast.add(cp(y,t,.027),(cos(t),0,.2),.007)
    fast.finish('Canopy_rail_screws')
    for s in [-1,1]:
        for i in range(3):box(f'Canopy_rearview_mirror_{s}_{i}',(s*(.18+i*.09),-5.54,3.29-i*.027),(.09,.025,.055),'Steel',.009)
