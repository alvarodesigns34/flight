import bpy, math
from math import sin,cos,pi,sqrt
from mathutils import Vector
import geometry as g
from geometry import mesh,tube,cylinder,box,sphere,ring,text,Fasteners
from config import SPAN,FIN_CANT_OFFSET
from materials import M

def build_fuselage():
    from cockpit import CANOPY
    g.collection('Fuselage')
    vs=[];fs=[];indices=[];ny=320;nt=96
    for j in range(ny+1):
        y=-9.30+(9.25+9.3)*j/ny
        for i in range(nt):vs.append(g.bodypoint(y,2*pi*i/nt))
    for j in range(ny):
        y=-9.30+18.55*(j+.5)/ny
        for i in range(nt):
            t=2*pi*(i+.5)/nt
            # The opening exposes actual cockpit geometry; no opaque skin under glass.
            if CANOPY[0][0]<y<CANOPY[-1][0] and sin(t)>0 and abs(g.bodypoint(y,t)[0])<g.interpolate(y,CANOPY)[0]+.012:continue
            if -6.43<y<-4.75 and sin(t)<0 and abs(g.bodypoint(y,t)[0])<.34:continue
            fs.append((j*nt+i,(j+1)*nt+i,(j+1)*nt+(i+1)%nt,j*nt+(i+1)%nt))
            indices.append(2 if y<-7.25 else (1 if sin(t)<-.18 else 0))
    fs.extend([tuple(range(nt-1,-1,-1)),tuple(ny*nt+i for i in range(nt))]);indices.extend([2,0])
    o=mesh('F14A_contoured_primary_skin',vs,fs,'Gull_gray')
    o.data.materials.append(M['Warm_white']);o.data.materials.append(M['Radome'])
    for p,i in zip(o.data.polygons,indices):p.material_index=i
    o['design']='Hermite station loft; artistic cross-sections, not engineering profiles'
    o['reference']='NNAM envelope; NASA historical silhouettes; VF84 1978 photograph'
    cylinder('Nose_probe', (0,-9.5504,2.18),(0,-9.25,2.18),.005,'Steel',.018,32)
    for s in [-1,1]:
        pts=[]
        for j in range(70):
            y=-6.43+j*1.68/69;w,h,z=g.interpolate(y)
            pts.append((s*.344,y,z-h*sqrt(1-(.344/w)**2)))
        tube(f'Nose_well_skin_edge_{s}',pts,.011,'Warm_white')
    # Coaming skirts bridge the curved skin to the optical shell, closing side gaps.
    for s in [-1,1]:
        verts=[];faces=[]
        for j in range(161):
            y=CANOPY[0][0]+(CANOPY[-1][0]-CANOPY[0][0])*j/160
            cw,ch,cz=g.interpolate(y,CANOPY);bw,bh,bz=g.interpolate(y)
            xx=min(cw,bw*.99);zz=bz+bh*sqrt(max(.001,1-(xx/bw)**2))
            verts.extend([(s*(xx+.014),y,zz-.018),(s*(cw+.005),y,cz+.005)])
        for j in range(160):a=2*j;faces.append((a,a+1,a+3,a+2))
        o=mesh(f'Cockpit_coaming_skin_{s}',verts,faces,'Gull_gray')
        sol=o.modifiers.new('Coaming_skin_thickness','SOLIDIFY');sol.thickness=.010
    # Panel joins follow the loft surface; inferred skin bays are documented as estimates.
    g.collection('Surface_Detail');fast=Fasteners()
    for idx,y in enumerate([-7.25,-6.70,-6.35,-5.8,-4.8,-3.0,-2.4,-1.35,.2,1.65,3.1,4.65,5.6,6.8,7.65]):
        for start,end in [(0,pi),(pi,2*pi)]:
            pts=[]
            for k in range(65):
                t=start+(end-start)*k/64
                if CANOPY[0][0]<y<CANOPY[-1][0] and sin(t)>0 and abs(g.bodypoint(y,t)[0])<g.interpolate(y,CANOPY)[0]+.025:
                    if len(pts)>1:tube(f'Skin_station_{idx}_{start:.1f}_partial',pts,.0014,'Panel_gap',res=1)
                    pts=[];continue
                pts.append(g.bodypoint(y,t,.002))
            if len(pts)>1:tube(f'Skin_station_{idx}_{start:.1f}',pts,.0014,'Panel_gap',res=1)
        for k in range(36):
            t=2*pi*k/36
            if CANOPY[0][0]<y<CANOPY[-1][0] and sin(t)>0 and abs(g.bodypoint(y,t)[0])<g.interpolate(y,CANOPY)[0]+.025:continue
            fast.add(g.bodypoint(y+.025,t,.0025),(cos(t),0,sin(t)),.005)
    for idx,t in enumerate([-.7,-.2,.25,pi-.25,pi+.2,pi+.7,pi*1.5]):
        tube(f'Longitudinal_skin_join_{idx}',[g.bodypoint(-7.23+i*14.8/160,t,.002) for i in range(161)],.0013,'Panel_gap',res=1)
    fast.finish('Fuselage_flush_fasteners','Gray_panel')
    # Inferred removable skin bays with small, deliberate finish differences.
    for idx,(ya,yb,ta,tb) in enumerate([(-6.69,-6.36,-.22,.22),(-5.79,-4.81,pi-.48,pi-.12),(-2.39,-1.36,.48,1.05),(.21,1.64,1.2,1.9),(3.11,4.64,1.2,1.9),(5.61,6.79,1.02,1.44)]):
        pv=[];pf=[]
        for j in range(20):
            y=ya+(yb-ya)*j/19
            for k in range(18):pv.append(g.bodypoint(y,ta+(tb-ta)*k/17,.0011))
        for j in range(19):
            for k in range(17):a=j*18+k;pf.append((a,a+1,a+19,a+18))
        mesh(f'Inferred_skin_bay_finish_{idx}',pv,pf,'Gray_panel')
    # Small nose chine strips, anti-glare area and access hatch boundaries.
    for s in [-1,1]:
        tube(f'Nose_chine_{s}',[g.bodypoint(y,0 if s==1 else pi,.006) for y in [-7.4,-6.8,-6.1,-5.4,-4.6,-3.8,-3]],.008,'Gull_gray')
    pts=[];faces=[]
    for j in range(60):
        y=-7.28+j*1.13/59
        for i in range(17):pts.append(g.bodypoint(y,pi*.5+(i/16-.5)*.62,.004))
    for j in range(59):
        for i in range(16):a=j*17+i;faces.append((a,a+1,a+18,a+17))
    mesh('Nose_antiglare_painted_area',pts,faces,'Antiglare')

def wing_point(s,u,v,offset=0):
    x=2.06+(SPAN/2-2.06)*u
    le=.28+2.96*u
    chord=4.08-2.95*u
    z=2.43-.11*u
    thick=(.128*(1-u)+.041*u)*sin(pi*v)**.73
    return (s*x,le+chord*v,z+thick+offset)

def horizontal_surface(name,s,root,tip,mat,spansteps=44,chordsteps=48,thickness=.13):
    # root/tip: x, leading y, chord, z. Sculpted closed visual section.
    vs=[];fs=[]
    for side in [1,-1]:
        for j in range(spansteps+1):
            u=j/spansteps;x=root[0]*(1-u)+tip[0]*u;le=root[1]*(1-u)+tip[1]*u
            chord=root[2]*(1-u)+tip[2]*u;z=root[3]*(1-u)+tip[3]*u
            for i in range(chordsteps+1):
                v=i/chordsteps
                t=thickness*(1-.72*u)*sin(pi*v)**.73
                vs.append((s*x,le+chord*v,z+side*t))
    stride=chordsteps+1;layer=(spansteps+1)*stride
    for j in range(spansteps):
        for i in range(chordsteps):
            a=j*stride+i
            fs.append((a,a+stride,a+stride+1,a+1) if s>0 else (a,a+1,a+stride+1,a+stride))
            a+=layer
            fs.append((a,a+1,a+stride+1,a+stride) if s>0 else (a,a+stride,a+stride+1,a+1))
    for j in [0,spansteps]:
        for i in range(chordsteps):
            a=j*stride+i;fs.append((a,a+1,a+1+layer,a+layer))
    for i in [0,chordsteps]:
        for j in range(spansteps):
            a=j*stride+i;fs.append((a,a+layer,a+layer+stride,a+stride))
    o=mesh(name,vs,fs,mat)
    return o

def build_wings():
    g.collection('Wings')
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        pivot=bpy.data.objects.new(f'{label}_wing_exhibition_pivot',None);g.link(pivot)
        pivot.location=(s*2.06,.85,2.43);pivot.empty_display_type='CIRCLE';pivot.empty_display_size=.3
        pivot['purpose']='Static assembly origin; no rig or animation'
        o=horizontal_surface(f'{label}_variable_sweep_wing',s,(2.06,.28,4.08,2.43),(SPAN/2,3.24,1.13,2.32),'Gull_gray')
        # Convert world-authored meshes to pivot coordinates without changing their placement.
        o.parent=pivot;o.matrix_parent_inverse=pivot.matrix_basis.inverted()
        o['sweep_pose']='Extended museum pose, artist-derived planform'
        # True detached trailing edge panels and slat skin over a coherent wing form.
        for panel,(u0,u1) in enumerate([(.04,.29),(.30,.61),(.62,.94)]):
            vs=[];fs=[];nu=22;nv=10
            for j in range(nu+1):
                u=u0+(u1-u0)*j/nu
                for i in range(nv+1):vs.append(wing_point(s,u,.76+.225*i/nv,.004))
            for j in range(nu):
                for i in range(nv):a=j*(nv+1)+i;fs.append((a,a+1,a+nv+2,a+nv+1))
            ob=mesh(f'{label}_flap_skin_{panel+1}',vs,fs,'Warm_white')
            solid=ob.modifiers.new('Panel_skin_thickness','SOLIDIFY');solid.thickness=.007
            ob.parent=pivot;ob.matrix_parent_inverse=pivot.matrix_basis.inverted()
        # The wing glove is an independently removable sculpted airfoil volume.
        gl=horizontal_surface(f'{label}_wing_glove_cover',s,(.68,-2.20,6.1,2.35),(3.12,.36,3.55,2.42),'Gull_gray',36,48,.115)
        gl['evidence']='Glove outline visually estimated; overlap with wing is intentional'
        # Raised cover stiffeners visible in public historical research photographs.
        # Their placement is artistic, with no structural or manufacturing interpretation.
        for idx,xabs in enumerate([2.18,2.43,2.68]):
            u=(xabs-.68)/(3.12-.68);le=-2.20+2.56*u;ch=6.1-2.55*u
            pts=[]
            for j in range(32):
                v=.47+j*.41/31
                pts.append((s*xabs,le+ch*v,2.35+.07*u+.115*(1-.72*u)*sin(pi*v)**.73+.011))
            tube(f'{label}_glove_cover_stiffener_{idx}',pts,.010,'Gull_gray')
        for v in [.14,.45,.91]:
            pts=[]
            for j in range(61):
                u=j/60;x=.68+2.44*u;le=-2.20+2.56*u;ch=6.1-2.55*u
                pts.append((s*x,le+ch*v,2.35+.07*u+.115*(1-.72*u)*sin(pi*v)**.73+.004))
            tube(f'{label}_glove_skin_join_{v}',pts,.0018,'Panel_gap',res=1)
        seams=[];riv=Fasteners()
        for v in [.075,.30,.56,.755,.985]:
            seams.append(tube(f'{label}_wing_chord_join_{v}',[wing_point(s,j/100,v,.006) for j in range(101)],.0017,'Panel_gap',res=1))
        for u in [.08,.29,.45,.61,.79,.94]:
            seams.append(tube(f'{label}_wing_span_join_{u}',[wing_point(s,u,.08+j*.90/70,.006) for j in range(71)],.0016,'Panel_gap',res=1))
            for k in range(30):riv.add(wing_point(s,u+.004,.1+k*.86/29,.008),r=.005)
        # Static spoiler access faces; no mechanical implementation.
        for idx,(ua,ub) in enumerate([(.10,.27),(.31,.44),(.48,.60)]):
            pts=[wing_point(s,ua,.53,.007),wing_point(s,ub,.53,.007),wing_point(s,ub,.73,.007),wing_point(s,ua,.73,.007)]
            tube(f'{label}_spoiler_perimeter_{idx}',pts,.0021,'Panel_gap',True,res=1)
        rv=riv.finish(f'{label}_wing_fastener_rows','Gray_panel')
        for ob in seams+([rv] if rv else []):ob.parent=pivot;ob.matrix_parent_inverse=pivot.matrix_basis.inverted()
        sphere(f'{label}_wingtip_navigation_lens',(s*(SPAN/2-.022),4.05,2.33),(.021,.11,.027),'Nav_red' if s>0 else 'Nav_green')

def tailpoint(s,u,v,offset=0):
    z=2.44+(4.8768-2.44)*u
    x=s*(1.52+FIN_CANT_OFFSET*u+offset)
    le=4.66+1.87*u;chord=3.88-2.22*u
    return (x,le+chord*v,z)

def build_stabilizers():
    g.collection('Stabilizers')
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        n=44;m=40;vs=[];fs=[]
        for side in [-1,1]:
            for j in range(n+1):
                u=j/n
                for i in range(m+1):
                    v=i/m;x,y,z=tailpoint(s,u,v)
                    vs.append((x+side*.082*(1-.65*u)*sin(pi*v)**.7,y,z))
        layer=(n+1)*(m+1)
        for side in range(2):
            for j in range(n):
                for i in range(m):
                    a=side*layer+j*(m+1)+i
                    fs.append((a,a+1,a+m+2,a+m+1) if side==1 else (a,a+m+1,a+m+2,a+1))
        for j in [0,n]:
            for i in range(m):a=j*(m+1)+i;fs.append((a,a+1,a+1+layer,a+layer))
        for i in [0,m]:
            for j in range(n):a=j*(m+1)+i;fs.append((a,a+layer,a+layer+m+1,a+m+1))
        tail=mesh(f'{label}_canted_vertical_fin',vs,fs,'Black_tail')
        tail['cant']='Artist reconstruction from public photographs'
        # Separate rudder visual skin, with thin gap following the actual outer contour.
        for side in [-1,1]:
            pts=[tailpoint(s,j/70,.77,side*.047) for j in range(71)]
            tube(f'{label}_rudder_separation_{side}',pts,.0028,'Panel_gap',res=1)
            vs=[];faces=[]
            for j in range(8):
                u=.938+.062*j/7
                for i in range(25):
                    v=.015+.97*i/24;x,y,z=tailpoint(s,u,v)
                    vs.append((x+side*.035,y,z+.001))
            for j in range(7):
                for i in range(24):a=j*25+i;faces.append((a,a+1,a+26,a+25))
            mesh(f'{label}_yellow_fin_cap_{side}',vs,faces,'Squadron_yellow')
        riv=Fasteners()
        for u in [.12,.42,.78]:
            for side in [-1,1]:
                tube(f'{label}_fin_skin_joint_{u}_{side}',[tuple((x+side*.079,y,z)) for x,y,z in [tailpoint(s,u,.02+j*.95/70) for j in range(71)]],.0013,'Panel_gap',res=1)
                for i in range(24):
                    x,y,z=tailpoint(s,u,.04+.9*i/23);riv.add((x+side*.083,y,z),(side,0,0),.0045)
        riv.finish(f'{label}_fin_skin_fasteners','Steel')
        horizontal_surface(f'{label}_all_moving_horizontal_tail',s,(2.13,5.83,3.72,1.97),(4.5,8.06,1.49,1.91),'Gull_gray',40,48,.078)
        cylinder(f'{label}_stabilator_exhibition_attachment',(s*1.99,7.05,1.97),(s*2.25,7.05,1.97),.083,'Steel',n=48)
        for v in [.13,.78]:
            pts=[]
            for j in range(70):
                u=j/69;x=2.13+2.37*u;le=5.83+2.23*u;ch=3.72-2.23*u
                pts.append((s*x,le+ch*v,1.97-.06*u+.078*(1-.72*u)*sin(pi*v)**.73+.003))
            tube(f'{label}_stabilator_panel_{v}',pts,.0018,'Panel_gap',res=1)
        # Ventral strakes: distinct visual planes beneath the engine rear quarters.
        v=[(s*1.75,5.6,1.30),(s*2.0,6.55,.70),(s*2.03,8.0,.86),(s*1.76,7.8,1.31)]
        ob=mesh(f'{label}_ventral_strake',v,[(0,1,2,3)],'Warm_white',False)
        mod=ob.modifiers.new('Strake_thickness','SOLIDIFY');mod.thickness=.025

def build_intakes():
    g.collection('Intakes')
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        # Intake duct has four real walls, a bevelled rectangular lip and a darkened interior transition.
        sections=[(-2.62,[(.66,2.44),(2.13,2.31),(2.02,1.26),(.70,1.29)]),
                  (-1.75,[(.65,2.38),(2.14,2.33),(2.08,1.19),(.63,1.21)]),
                  (.0,[(.69,2.32),(2.16,2.30),(2.16,1.12),(.65,1.13)]),
                  (2.0,[(.76,2.31),(2.16,2.29),(2.14,1.13),(.74,1.14)]),
                  (3.0,[(.86,2.28),(2.07,2.28),(2.08,1.19),(.85,1.19)])]
        vs=[];fs=[]
        for y,coords in sections:
            for x,z in coords:vs.append((s*x,y,z))
        for j in range(len(sections)-1):
            for i in range(4):
                if i==2:continue
                a=j*4+i;b=j*4+(i+1)%4;fs.append((a,b,b+4,a+4))
        # Subdivided lower skin with an actual visible main-gear well opening.
        for j in range(len(sections)-1):
            y0,coords0=sections[j];y1,coords1=sections[j+1]
            for row in range(36):
                ua=row/36;ub=(row+1)/36
                for col in range(28):
                    va=col/28;vb=(col+1)/28
                    def point(u,v):
                        xx=(coords0[2][0]*(1-v)+coords0[3][0]*v)*(1-u)+(coords1[2][0]*(1-v)+coords1[3][0]*v)*u
                        zz=(coords0[2][1]*(1-v)+coords0[3][1]*v)*(1-u)+(coords1[2][1]*(1-v)+coords1[3][1]*v)*u
                        return (s*xx,y0+(y1-y0)*u,zz)
                    xc,yc,zc=point((ua+ub)/2,(va+vb)/2)
                    if .08<yc<1.58 and abs(xc)>1.5:continue
                    a=len(vs);vs.extend([point(ua,va),point(ua,vb),point(ub,vb),point(ub,va)]);fs.append((a,a+1,a+2,a+3))
        duct=mesh(f'{label}_intake_outer_shell',vs,fs,'Warm_white',False)
        mod=duct.modifiers.new('Intake_wall_thickness','SOLIDIFY');mod.thickness=.035
        bevel(duct,.012,3)
        lip=[(s*x,-2.625,z) for x,z in sections[0][1]]
        tube(f'{label}_rolled_intake_lip',lip,.025,'Aluminum',True)
        # Interior plates and a deep throat. Exposed depth is visible in front renders.
        mesh(f'{label}_duct_inner_roof',[(s*.73,-2.54,2.405),(s*2.05,-2.54,2.30),(s*2.05,.5,2.06),(s*.73,.5,2.10)],[(0,1,2,3)],'Gray_panel',False)
        mesh(f'{label}_deep_intake_throat',[(s*.86,2.95,2.28),(s*2.07,2.95,2.28),(s*2.07,2.95,1.19),(s*.86,2.95,1.19)],[(0,1,2,3)],'Exhaust_dark',False)
        for y in [-2.12,-1.46,-.7,.3,1.35]:
            tube(f'{label}_duct_interior_joint_{y}',[(s*.72,y,1.25),(s*2.06,y,1.25),(s*2.07,y,2.23)],.006,'Gray_panel')
        # Outer intake shoulder access plates and fasteners.
        for idx,y in enumerate([-1.8,-.8,.3,1.4]):
            pts=[(s*2.171,y,1.40),(s*2.171,y+.78,1.40),(s*2.171,y+.78,2.06),(s*2.171,y,2.06)]
            tube(f'{label}_intake_access_{idx}',pts,.002,'Panel_gap',True,res=1)
        # Boundary-layer splitter strip, visually independent.
        box(f'{label}_intake_splitter',(s*.65,-2.08,1.84),(.038,1.12,1.03),'Gull_gray',.008)

# Kept local to avoid importing a bpy operator into procedural surface construction.
bevel=g.bevel
