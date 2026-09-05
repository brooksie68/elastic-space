"""KEEP: isolated headless Blender log geometry builder. No live-window access."""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
random.seed(41)
ROOT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
out=[]
for k in range(5):
    n, rings=56,30
    length=1.65 if k<3 else 1.45
    radius=.16 if k<3 else .145
    verts=[]; faces=[]; uv=[]
    for j in range(rings+1):
        t=j/rings
        for i in range(n):
            a=2*math.pi*i/n
            r=radius*(1+.095*math.sin(a*7+k)+.045*math.sin(a*19+t*7)+.03*random.uniform(-1,1))
            # Flatten a split face and leave uneven bark ridges.
            yy=min(math.cos(a)*r,r*.65)
            verts.append(((t-.5)*length,yy,math.sin(a)*r))
    for j in range(rings):
        for i in range(n):
            faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.extend([tuple(reversed(range(n))),tuple(rings*n+i for i in range(n))])
    mesh=bpy.data.meshes.new('split-log'); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new('Log-%d'%k,mesh); bpy.context.collection.objects.link(obj)
    mesh.uv_layers.new()
    for p in mesh.polygons:
        p.use_smooth=p.index<rings*n
        for li in p.loop_indices:
            vi=mesh.loops[li].vertex_index; j,i=divmod(vi,n)
            if p.index<rings*n:
                u=i/n
                if p.index%n==n-1 and i==0:u=1
                mesh.uv_layers.active.data[li].uv=(u,j/rings)
            else:mesh.uv_layers.active.data[li].uv=(verts[vi][1]/radius*.45+.5,verts[vi][2]/radius*.45+.5)
    mesh.calc_loop_triangles()
    pos=[]; normal=[]; tex=[]; groups=[]
    for tri in mesh.loop_triangles:
        cap=tri.polygon_index>=rings*n
        for li in tri.loops:
            vi=mesh.loops[li].vertex_index
            pos.extend(round(v,6) for v in mesh.vertices[vi].co)
            normal.extend(round(v,6) for v in (mesh.polygons[tri.polygon_index].normal if cap else mesh.vertices[vi].normal))
            tex.extend(round(v,6) for v in mesh.uv_layers.active.data[li].uv)
        groups.append(1 if cap else 0)
    out.append(dict(position=pos,normal=normal,uv=tex,groups=groups))
    obj.location=(0,k*.4,0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'logs.blend'))
(ROOT/'logs.js').write_text('window.FIREPLACE_LOGS='+json.dumps(out,separators=(',',':'))+';\n')
print('EXPORTED',len(out),'logs',sum(len(x['position'])//9 for x in out),'triangles')
