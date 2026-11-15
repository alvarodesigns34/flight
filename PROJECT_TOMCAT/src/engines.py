"""Non-operational TF30-inspired exhibit surfaces, no engineered engine internals."""
from math import sin,cos,pi
import geometry as g
from geometry import mesh,tube,cylinder,ring,box,text,Fasteners
from materials import M

def build():
    for s,label in [(1,'Port'),(-1,'Starboard')]:
        g.collection('Engines_Exterior');x=s*1.43;zc=1.83
        # Curved nacelle surfaces continue from the rectangular intake shoulders.
        stations=[(1.55,.735,.62),(2.6,.77,.68),(4.0,.765,.70),(5.5,.73,.69),(6.8,.69,.655),(7.7,.66,.62),(8.25,.625,.59)]
        vs=[];lower=[];upper=[];n=112;ny=132
        for j in range(ny+1):
            y=stations[0][0]+(stations[-1][0]-stations[0][0])*j/ny
            w,h=g.interpolate(y,stations)
            for i in range(n):
                t=2*pi*i/n;vs.append((x+w*cos(t),y,zc+h*sin(t)))
        for j in range(ny):
            y=stations[0][0]+(stations[-1][0]-stations[0][0])*(j+.5)/ny
            for i in range(n):
                t=2*pi*(i+.5)/n;a=j*n+i
                f=(a,j*n+(i+1)%n,(j+1)*n+(i+1)%n,a+n)
                (upper if 4.35<y<7.40 and sin(t)>.22 else lower).append(f)
        nac=mesh(label+'_TF30_nacelle_skin',vs,lower,'Gull_gray');nac.data.materials.append(M['Warm_white'])
        for p in nac.data.polygons:
            if p.center.z<zc:p.material_index=1
        g.collection('Removable_Panels')
        o=mesh(label+'_dorsal_engine_access_cover',vs,upper,'Gull_gray')
        o['exhibit']='Removable visual shell; hide this collection for structure camera'
        g.collection('Engines_Exterior')
        fast=Fasteners()
        for yy in [2.8,3.8,4.35,5.35,6.4,7.4,7.82]:
            w,h=g.interpolate(yy,stations)
            tube(label+f'_nacelle_skin_join_{yy}',[(x+(w+.002)*cos(2*pi*i/112),yy,zc+(h+.002)*sin(2*pi*i/112)) for i in range(113)],.0018,'Panel_gap',True,res=1)
            for i in range(42):
                t=2*pi*i/42;fast.add((x+(w+.003)*cos(t),yy+.023,zc+(h+.003)*sin(t)),(cos(t),0,sin(t)),.005)
        for t in [.25,pi-.25,pi*1.5]:
            tube(label+f'_nacelle_long_seam_{t}',[(x+(g.interpolate(y,stations)[0]+.003)*cos(t),y,zc+(g.interpolate(y,stations)[1]+.003)*sin(t)) for y in [1.6+i*6.6/90 for i in range(91)]],.0016,'Panel_gap',res=1)
        fast.finish(label+'_nacelle_skin_fasteners','Gray_panel')
        # Nested circumferential casing sections: publicly visible exterior appearance only.
        g.collection('Exhibition_Structure')
        segments=[(2.6,3.5,.52,.53,'Aluminum'),(3.5,4.35,.53,.50,'Steel'),(4.35,5.15,.50,.46,'Aluminum'),(5.15,6.3,.46,.48,'Titanium'),(6.3,7.5,.48,.51,'Heat_bronze'),(7.5,8.35,.51,.57,'Titanium')]
        for i,(a,b,r0,r1,mat) in enumerate(segments):
            cylinder(label+f'_exhibit_casing_{i}',(x,a,zc),(x,b,zc),r0,mat,r1,n=96)
            ring(label+f'_exhibit_flange_{i}',(x,a,zc),r0+.02,.018,'Steel','Y',96,10)
            bolts=Fasteners()
            for k in range(28):
                t=2*pi*k/28;bolts.add((x+(r0+.027)*cos(t),a-.012,zc+(r0+.027)*sin(t)),(0,-1,0),.008)
            bolts.finish(label+f'_exhibit_flange_fasteners_{i}')
        for k in range(7):
            t=.25+2.65*k/6
            pts=[]
            for i in range(8):
                y=3.6+i*.5;r=.555 if y<4.5 else .525
                pts.append((x+r*cos(t),y,zc+r*sin(t)))
            tube(label+f'_decorative_casing_conduit_{k}',pts,.009 if k%2 else .014,'Steel' if k%2 else 'Aluminum')
            for y in [4.1,5.1,6.1]:
                box(label+f'_decorative_conduit_clip_{k}_{y}',(x+.565*cos(t),y,zc+.565*sin(t)),(.05,.035,.04),'Steel',.004)
        for yy in [4.5,5.7,7.0]:
            ring(label+f'_exhibit_partial_bulkhead_{yy}',(x,yy,zc),.60,.025,'Zinc_chromate','Y',80)
            cylinder(label+f'_exhibit_support_{yy}',(x-.45,yy,zc+.4),(x+.45,yy,zc+.4),.022,'Zinc_chromate')
        text(label+'_exhibit_disclaimer','TF30 / VISUAL STUDY',(x,5.8,zc+.59),.065,'Marking_black')
        # Deep visible intake fan impression. Broad ornamental radial sectors, not aerodynamic blade geometry.
        g.collection('Engines_Exterior')
        cylinder(label+'_intake_shadow_disc',(x,2.72,zc),(x,2.75,zc),.51,'Exhaust_dark',n=96)
        ring(label+'_intake_fan_shroud',(x,2.70,zc),.49,.025,'Steel','Y',96)
        for k in range(28):
            a=2*pi*k/28;b=a+.075
            v=[(x+.13*cos(a),2.695,zc+.13*sin(a)),(x+.46*cos(a+.10),2.695,zc+.46*sin(a+.10)),(x+.47*cos(b+.10),2.70,zc+.47*sin(b+.10)),(x+.13*cos(b),2.70,zc+.13*sin(b))]
            mesh(label+f'_intake_ornamental_vane_{k}',v,[(0,1,2,3)],'Steel')
        cylinder(label+'_intake_centerbody',(x,2.45,zc),(x,2.71,zc),.025,'Titanium',.13,n=64)
        # Segmented exhaust shell with separate overlapping petals and a real dark cavity.
        for y,r,mat in [(8.16,.625,'Titanium'),(8.40,.625,'Heat_bronze'),(8.57,.625,'Heat_blue')]:
            ring(label+f'_nozzle_mount_ring_{y}',(x,y,zc),r,.027,mat,'Y',112)
        n=24
        for k in range(n):
            a=2*pi*k/n+.006;b=2*pi*(k+1)/n-.006
            ys=[8.47,8.76,9.12,9.5504];rs=[.625,.655,.627,.585]
            verts=[]
            for yy,rr in zip(ys,rs):
                for j in range(5):
                    t=a+(b-a)*j/4;verts.append((x+rr*cos(t),yy,zc+rr*sin(t)))
            fs=[]
            for j in range(3):
                for i in range(4):q=j*5+i;fs.append((q,q+1,q+6,q+5))
            o=mesh(label+f'_TF30_exhaust_petal_{k:02}',verts,fs,'Titanium' if k%3 else 'Heat_bronze')
            sol=o.modifiers.new('Petal_visual_skin','SOLIDIFY');sol.thickness=.009
            t=(a+b)/2
            tube(label+f'_petal_stiffener_{k}',[(x+(rr+.008)*cos(t),yy,zc+(rr+.008)*sin(t)) for yy,rr in zip(ys[:3],rs[:3])],.009,'Heat_blue')
            cylinder(label+f'_nozzle_external_link_{k}',(x+.66*cos(t),8.20,zc+.66*sin(t)),(x+.67*cos(t),8.72,zc+.67*sin(t)),.012,'Steel',n=20)
        # Hollow inner liner and decorative rings, clearly identified as non-engineered exhibit geometry.
        verts=[];faces=[]
        for yy,rr in [(9.5504,.574),(9.16,.58),(8.6,.55),(7.82,.47)]:
            for i in range(112):
                t=2*pi*i/112;verts.append((x+rr*cos(t),yy,zc+rr*sin(t)))
        for j in range(3):
            for i in range(112):a=j*112+i;faces.append((a,j*112+(i+1)%112,(j+1)*112+(i+1)%112,a+112))
        mesh(label+'_exhaust_inner_liner',verts,faces,'Exhaust_dark')
        for j in range(7):ring(label+f'_inner_liner_ring_{j}',(x,8.0+j*.20,zc),.478+j*.015,.012,'Heat_bronze','Y',96)
        cylinder(label+'_deep_exhaust_shadow',(x,7.83,zc),(x,7.85,zc),.48,'Exhaust_dark',n=96)
        for k in range(12):
            t=2*pi*k/12
            tube(label+f'_exhaust_exhibit_radial_{k}',[(x+.10*cos(t),7.88,zc+.10*sin(t)),(x+.44*cos(t),7.88,zc+.44*sin(t))],.015,'Heat_bronze')
        ring(label+'_exhaust_exhibit_inner_ring',(x,7.91,zc),.22,.018,'Titanium','Y',80)
