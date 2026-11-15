from math import sin,cos,pi
import geometry as g
from geometry import mesh,tube,box,text,cylinder,sphere,Fasteners
from airframe import wing_point,tailpoint
from config import FIN_CANT_SLOPE
import bmesh

def subdivide_decal(ob,cuts=7):
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=cuts,use_grid_fill=True)
    bm.to_mesh(ob.data);bm.free()

def starbars(name,x,y,z,scale=1,normal=(0,0,1),up=(0,1,0)):
    from mathutils import Vector
    nz=Vector(normal);ny=Vector(up);nx=ny.cross(nz)
    def p(a,b,h=0):return tuple(Vector((x,y,z))+nx*a*scale+ny*b*scale+nz*h)
    # Insignia reconstructed as native polygons, no borrowed image or texture.
    n=64
    mesh(name+'_blue_disc',[p(.45*cos(2*pi*i/n),.45*sin(2*pi*i/n)) for i in range(n)],[tuple(range(n))],'Insignia_blue',False)
    for s in [-1,1]:
        mesh(name+f'_bar_outline_{s}',[p(s*.30,-.155,.0004),p(s*.84,-.155,.0004),p(s*.84,.155,.0004),p(s*.30,.155,.0004)],[(0,1,2,3)],'Insignia_blue',False)
        mesh(name+f'_white_bar_{s}',[p(s*.33,-.105,.0008),p(s*.79,-.105,.0008),p(s*.79,.105,.0008),p(s*.33,.105,.0008)],[(0,1,2,3)],'Marking_white',False)
        mesh(name+f'_red_bar_{s}',[p(s*.33,-.025,.001),p(s*.79,-.025,.001),p(s*.79,.025,.001),p(s*.33,.025,.001)],[(0,1,2,3)],'Warning_red',False)
    vs=[]
    for i in range(10):
        a=pi/2+2*pi*i/10;r=.405 if i%2==0 else .171;vs.append(p(r*cos(a),r*sin(a),.0012))
    mesh(name+'_white_star',vs,[tuple(range(10))],'Marking_white',False)

def skull(label,s,face=1):
    # Native emblem; a graphic reconstruction from the historic photograph, not an official vector.
    center_u=.60;center_v=.48
    def p(a,b,depth=.09):
        # a is along fin chord; b vertical. Follow the fin's outward cant.
        u=center_u+b/2.4368;xx,yy,zz=tailpoint(s,u,center_v)
        v=center_v+a/(3.88-2.22*u)
        surface=.082*(1-.65*u)*max(0,sin(pi*v))**.7
        return (xx+s*face*(surface+.003+(depth-.09)*.3),yy+a,zz)
    def poly(name,coords,mat,depth=.09):
        from mathutils import Vector
        from mathutils.geometry import tessellate_polygon
        points=[Vector((a,b,0)) for a,b in coords]
        triangles=tessellate_polygon([points])
        verts=[];faces=[];n=12
        for tri in triangles:
            tri=[points[k] if isinstance(k,int) else k for k in tri]
            lookup={}
            for i in range(n+1):
                for j in range(n-i+1):
                    q=tri[0]*(1-(i+j)/n)+tri[1]*(i/n)+tri[2]*(j/n)
                    lookup[i,j]=len(verts);verts.append(p(q.x,q.y,depth))
            for i in range(n):
                for j in range(n-i):
                    faces.append((lookup[i,j],lookup[i+1,j],lookup[i,j+1]))
                    if i+j<n-1:faces.append((lookup[i+1,j],lookup[i+1,j+1],lookup[i,j+1]))
        return mesh(label+name,verts,faces,mat,False)
    for sign in [-1,1]:
        dy=.54*sign;ln=(.78**2+dy**2)**.5;da=-dy/ln*.027;db=.78/ln*.027
        poly(f'_crossbone_{sign}',[(-.39+da,-sign*.32+db),(.39+da,sign*.22+db),(.39-da,sign*.22-db),(-.39-da,-sign*.32-db)],'Marking_white')
        for a,b in [(-.39,sign*-.32),(.39,sign*.22)]:
            for q in [-1,1]:sphere(label+f'_bone_knuckle_{sign}_{a}_{q}',p(a,b+q*.026),(.0015,.042,.032),'Marking_white',16,8)
    coords=[(-.22,.25),(-.245,.13),(-.21,-.005),(-.14,-.08),(-.11,-.22),(.11,-.22),(.14,-.08),(.21,-.005),(.245,.13),(.22,.25),(.12,.32),(-.12,.32)]
    poly('_skull',coords,'Marking_white',.10)
    for a in [-.10,.10]:poly(f'_eye_{a}',[(a-.065,.14),(a+.055,.12),(a+.05,.015),(a-.045,.025)],'Black_tail',.103)
    poly('_nasal',[(-.035,-.055),(.035,-.055),(0,.015)],'Black_tail',.104)
    for a in [-.075,-.025,.025,.075]:tube(label+f'_tooth_{a}',[p(a,-.20,.105),p(a,-.12,.105)],.004,'Black_tail',res=1)
    nx=(s*face,0,-FIN_CANT_SLOPE*face);up=(s*FIN_CANT_SLOPE,0,1)
    for letter,u,v in [('A',.79,.23),('J',.49,.72)]:
        x,y,z=tailpoint(s,u,v)
        offset=.082*(1-.65*u)*sin(pi*v)**.7
        outline=text(label+'_tail_code_outline_'+letter,letter,(x+s*face*(offset+.003),y,z),.46,'Squadron_yellow',normal=nx,up=up)
        outline.data.offset=.012
        text(label+'_tail_code_fill_'+letter,letter,(x+s*face*(offset+.005),y,z),.46,'Black_tail',normal=nx,up=up)
    x,y,z=tailpoint(s,.08,.47)
    text(label+'_tail_buno','160391',(x+s*face*.075,y,z),.095,'Marking_white',normal=nx,up=up)

def build():
    g.collection('Surface_Detail')
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        skull(label,s)
        skull(label+'_inboard',s,-1)
        # Nose identifiers track the local skin with a narrow offset.
        text(label+'_modex','210',(s*.681,-6.07,2.34),.31,'Marking_black',normal=(s,0,.10),up=(-s*.10,0,1))
        text(label+'_navy','NAVY',(s*2.207,3.72,1.88),.28,'Marking_black',normal=(s,0,0),up=(0,0,1))
        text(label+'_squadron','VF-84',(s*2.207,4.18,1.61),.095,'Marking_black',normal=(s,0,0),up=(0,0,1))
        text(label+'_carrier','USS NIMITZ',(s*1.96,5.34,1.62),.085,'Marking_black',normal=(s,0,0),up=(0,0,1))
        # Intake warning perimeter with actual separate paint geometry.
        tube(label+'_intake_red_warning',[(s*2.155,-2.38,1.42),(s*2.155,-2.38,2.23),(s*2.155,-1.87,1.83),(s*2.155,-2.38,1.42)],.013,'Warning_red')
        text(label+'_intake_warning','DANGER',(s*2.17,-2.15,1.82),.069,'Warning_red',normal=(s,0,0),up=(0,0,1))
        # Ejection-seat triangle markings are graphic only.
        for yy in [-5.05,-3.65]:
            w,h,z=g.interpolate(yy)
            mesh(label+f'_seat_warning_{yy}',[(s*(w+.006),yy-.10,2.38),(s*(w+.008),yy+.10,2.38),(s*(w+.007),yy,2.55)],[(0,1,2)],'Warning_red',False)
        # Small yellow/black fuselage chevron is only a livery interpretation.
        pts=[]
        for yy,zz in [(-2.55,2.50),(-1.9,2.28),(-1.15,2.47)]:
            w,h,z=g.interpolate(yy);t=.22 if s>0 else pi-.22
            pts.append(g.bodypoint(yy,t,.012))
        tube(label+'_squadron_chevron',pts,.038,'Squadron_yellow')
        # Period access lids and restrained ventilation louvres, no arbitrary rivet noise.
        for idx,yy in enumerate([-6.4,-4.9,-3.2]):
            w,h,zc=g.interpolate(yy);xx=s*(w+.008)
            z=zc-.08
            tube(label+f'_forward_service_hatch_{idx}',[(xx,yy-.18,z-.10),(xx,yy+.18,z-.10),(xx,yy+.18,z+.10),(xx,yy-.18,z+.10)],.0016,'Panel_gap',True,res=1)
        for j in range(7):
            yy=-5.9+j*.065;w,h,z=g.interpolate(yy)
            tube(label+f'_forward_vent_louvre_{j}',[(s*(w+.01),yy,2.15),(s*(w+.01),yy+.024,2.32)],.007,'Panel_gap',res=1)
        for j in range(11):
            yy=.1+j*.115
            box(label+f'_dorsal_vent_gap_{j}',(s*1.46,yy,2.552),(.34,.025,.008),'Panel_gap',.004)
        for j in range(9):
            yy=5.25+j*.102
            box(label+f'_aft_cooling_slot_{j}',(s*1.44,yy,2.535),(.33,.022,.009),'Panel_gap',.003)
        # Visible exterior antennae in a restrained early-A arrangement.
        sphere(label+'_glove_position_lens',(s*2.50,-.15,2.53),(.10,.05,.026),'Nav_red' if s>0 else 'Nav_green')
        cylinder(label+'_tail_static_wick',(s*4.38,9.45,1.92),(s*4.43,9.53,1.92),.003,'Instrument_black',n=12)
    p=wing_point(1,.53,.43,.014)
    starbars('Upper_port_national_insignia',*p,.88,up=(0,-1,0))
    for ob in list(g.COL.objects):
        if not ob.name.startswith('Upper_port_national_insignia') or ob.type!='MESH':continue
        subdivide_decal(ob)
        for vtx in ob.data.vertices:
            xx,yy,zz=vtx.co;u=(abs(xx)-2.06)/(19.5326/2-2.06);v=(yy-(.28+2.96*u))/(4.08-2.95*u)
            vtx.co.z=wing_point(1,u,v,.003+abs(zz-p[2]))[2]
    # Historic reference places the national insignia below the rear cockpit.
    # Start with native vector geometry, then conform every vertex to the loft.
    for s in [-1,1]:
        prefix=f'Side_insignia_{s}'
        starbars(prefix,s*.785,-3.87,2.20,.53,(s,0,0),(0,0,1))
        for ob in list(g.COL.objects):
            if not ob.name.startswith(prefix) or ob.type!='MESH':continue
            subdivide_decal(ob)
            for vert in ob.data.vertices:
                xx,yy,zz=vert.co;w,h,zc=g.interpolate(yy)
                frac=max(.01,1-((zz-zc)/h)**2)
                vert.co.x=s*(w*frac**.5+.006+abs(xx-s*.785))
    for yy in [-1.80,4.12]:
        vs=[(-.015,yy-.22,2.54),(-.015,yy+.18,2.54),(-.015,yy+.07,2.90),(.015,yy-.22,2.54),(.015,yy+.18,2.54),(.015,yy+.07,2.90)]
        mesh(f'Dorsal_blade_antenna_{yy}',vs,[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'Gull_gray',False)
    # Early chin fairing without later D dual sensor pods.
    sphere('Early_A_chin_fairing',(0,-6.57,1.77),(.105,.30,.12),'Warm_white')
    cylinder('Early_A_chin_dark_end',(0,-6.84,1.78),(0,-6.87,1.78),.065,'Instrument_black',n=32)
    # Small maintenance text is explicitly representative rather than fabricated official stencilling.
    for s in [-1,1]:
        for j,yy in enumerate([-.9,.6,3.2,5.8]):
            text(f'Service_label_{s}_{j}','SERVICE',(s*2.207,yy,1.53),.040,'Gray_panel',normal=(s,0,0),up=(0,0,1))
