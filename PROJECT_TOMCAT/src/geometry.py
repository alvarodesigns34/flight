import bpy, math
from mathutils import Vector,Matrix
from materials import M
from config import SECTIONS
from math import sin,cos,pi

COL=None
ROOT=None
def collection(name):
    global COL
    COL=bpy.data.collections.get(name)
    return COL
def link(obj,mat=None,col=None,parent=True):
    (col or COL).objects.link(obj)
    if mat:obj.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    if ROOT and parent and (col or COL).name not in ['Stage','Cameras','Lighting','Auxiliary']:
        obj.parent=ROOT
    obj['evidence']='Visual approximation; see RESEARCH_AND_REFERENCES.md'
    return obj
def mesh(name,verts,faces,mat,smooth=True,col=None):
    d=bpy.data.meshes.new(name+'_mesh');d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);link(o,mat,col)
    if smooth:
        for p in d.polygons:p.use_smooth=True
    return o
def bevel(o,width=.015,segments=3):
    m=o.modifiers.new('Manufactured_edge_radius_visual','BEVEL');m.width=width;m.segments=segments
    m=o.modifiers.new('Weighted_corner_normals','WEIGHTED_NORMAL');m.keep_sharp=True
    return o
def box(name,loc,scale,mat,bev=.015):
    x,y,z=scale
    verts=[(a*x/2,b*y/2,c*z/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    o=mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,False)
    o.location=loc
    if bev:bevel(o,bev)
    return o
def tube(name,points,r,mat,closed=False,res=3):
    d=bpy.data.curves.new(name+'_curve','CURVE');d.dimensions='3D';d.resolution_u=1
    d.bevel_depth=r;d.bevel_resolution=res
    sp=d.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    sp.use_cyclic_u=closed
    return link(bpy.data.objects.new(name,d),mat)
def cylinder(name,a,b,r,mat,r2=None,n=48):
    a=Vector(a);b=Vector(b);v=b-a
    verts=[]
    for z,rad in [(0,r),(v.length,r if r2 is None else r2)]:
        for i in range(n):
            t=2*pi*i/n;verts.append((rad*cos(t),rad*sin(t),z))
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    o=mesh(name,verts,faces,mat);o.location=a
    # Flat ends must not inherit side-wall shading, especially on instrument lenses.
    o.data.polygons[0].use_smooth=False;o.data.polygons[1].use_smooth=False
    o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    return o
def sphere(name,p,scale,mat,n=32,rings=16):
    verts=[];faces=[]
    for j in range(rings+1):
        v=pi*j/rings
        for i in range(n):
            u=2*pi*i/n;verts.append((scale[0]*sin(v)*cos(u),scale[1]*sin(v)*sin(u),scale[2]*cos(v)))
    for j in range(rings):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    o=mesh(name,verts,faces,mat);o.location=p;return o
def ring(name,center,r,minor,mat,axis='Y',n=64,m=10):
    vs=[];fs=[]
    for i in range(n):
        u=2*pi*i/n
        for j in range(m):
            v=2*pi*j/m;a=(r+minor*cos(v))*cos(u);b=(r+minor*cos(v))*sin(u);c=minor*sin(v)
            q=(a,c,b) if axis=='Y' else ((c,a,b) if axis=='X' else (a,b,c))
            vs.append(tuple(q[k]+center[k] for k in range(3)))
    for i in range(n):
        for j in range(m):fs.append((i*m+j,((i+1)%n)*m+j,((i+1)%n)*m+(j+1)%m,i*m+(j+1)%m))
    return mesh(name,vs,fs,mat)
def text(name,body,p,size,mat,normal=(0,0,1),up=(0,1,0),align='CENTER'):
    d=bpy.data.curves.new(name+'_type','FONT');d.body=body;d.size=size;d.align_x=align;d.align_y='CENTER'
    d.extrude=.0002;d.resolution_u=6
    o=link(bpy.data.objects.new(name,d),mat);o.location=p
    nz=Vector(normal).normalized();ny=Vector(up).normalized();nx=ny.cross(nz).normalized();ny=nz.cross(nx)
    o.rotation_euler=Matrix((nx,ny,nz)).transposed().to_euler()
    return o
def interpolate(y,sections=SECTIONS):
    # Monotone cubic Hermite avoids ring facets and profile overshoot.
    if y<=sections[0][0]:return sections[0][1:]
    if y>=sections[-1][0]:return sections[-1][1:]
    for i in range(len(sections)-1):
        if sections[i][0]<=y<=sections[i+1][0]:break
    a,b=sections[i:i+2];h=b[0]-a[0];t=(y-a[0])/h
    values=[]
    for k in range(1,len(a)):
        delta=(b[k]-a[k])/h
        def slope(j):
            if j==0:return (sections[1][k]-sections[0][k])/(sections[1][0]-sections[0][0])
            if j==len(sections)-1:return (sections[-1][k]-sections[-2][k])/(sections[-1][0]-sections[-2][0])
            d0=(sections[j][k]-sections[j-1][k])/(sections[j][0]-sections[j-1][0])
            d1=(sections[j+1][k]-sections[j][k])/(sections[j+1][0]-sections[j][0])
            return 0 if d0*d1<=0 else 2*d0*d1/(d0+d1)
        m0=slope(i);m1=slope(i+1)
        values.append((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*h*m1)
    return values
def bodypoint(y,t,offset=0):
    w,h,z=interpolate(y);return ((w+offset)*cos(t),y,z+(h+offset)*sin(t))

class Fasteners:
    """Batch tiny decorative fasteners into one mesh per component."""
    def __init__(self):self.v=[];self.f=[]
    def add(self,p,normal=(0,0,1),r=.009):
        p=Vector(p);nz=Vector(normal).normalized();nx=nz.cross(Vector((0,1,.12))).normalized();ny=nz.cross(nx)
        k=len(self.v);n=8
        for h,rr in [(0,r),(.0025,r*.83)]:
            for i in range(n):
                t=2*pi*i/n;self.v.append(tuple(p+nx*rr*cos(t)+ny*rr*sin(t)+nz*h))
        self.f.append(tuple(k+n+i for i in range(n)))
        self.f.extend((k+i,k+(i+1)%n,k+(i+1)%n+n,k+i+n) for i in range(n))
    def finish(self,name,mat='Steel'):
        return mesh(name,self.v,self.f,mat,False) if self.v else None
