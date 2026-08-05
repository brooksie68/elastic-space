import bpy, math
from mathutils import Vector

sc = bpy.context.scene
m_hull = bpy.data.materials["m_hull"]
m_trim = bpy.data.materials["m_trim"]
m_glow = bpy.data.materials["m_glow"]
m_strip = bpy.data.materials["m_strip"]

def setmat(ob, m):
    ob.data.materials.clear(); ob.data.materials.append(m)

dg = bpy.context.evaluated_depsgraph_get()
def floor_z(x, y):
    hit, loc, *_ = sc.ray_cast(dg, Vector((x, y, 30)), Vector((0, 0, -1)))
    return loc.z if hit else 0.0

def cyl_between(p0, p1, r, name, mat):
    mid = (p0 + p1) / 2; vec = p1 - p0
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=vec.length, location=mid)
    ob = bpy.context.active_object; ob.name = name
    ob.rotation_euler = vec.to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.shade_smooth(); setmat(ob, mat)
    return ob

HABX, HABY = 0.0, 15.5
DECK0_Z = 3.4

# ---- 1. entry dome: move clear of the big deck, bigger door, visible tube ----
for nm in ("hab_entry_dome", "hab_entry_ring", "win_entry_door", "hab_lift_tube"):
    ob = bpy.data.objects.get(nm)
    if ob: bpy.data.objects.remove(ob, do_unlink=True)

ex, ey = 5.6, 11.2
ez = floor_z(ex, ey)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.35, segments=48, ring_count=24, location=(ex, ey, ez+0.3))
ed = bpy.context.active_object; ed.name = "hab_entry_dome"
bpy.ops.object.shade_smooth(); setmat(ed, m_hull)
bpy.ops.mesh.primitive_torus_add(major_radius=1.36, minor_radius=0.06, location=(ex, ey, ez+0.5),
    major_segments=48)
er = bpy.context.active_object; er.name = "hab_entry_ring"
bpy.ops.object.shade_smooth(); setmat(er, m_trim)
bpy.ops.mesh.primitive_cube_add(size=1, location=(ex-0.35, ey-1.24, ez+0.62))
door = bpy.context.active_object; door.name = "win_entry_door"
door.scale = (0.34, 0.08, 0.72)
door.rotation_euler = (0, 0, math.radians(14))
setmat(door, m_glow)
# clearly visible slanted tube up to deck 0 rim
cyl_between(Vector((ex-0.4, ey+0.4, ez+1.4)), Vector((3.4, 13.2, DECK0_Z-0.15)),
            0.40, "hab_lift_tube", m_hull)
# small lit ring where tube meets dome
bpy.ops.mesh.primitive_torus_add(major_radius=0.44, minor_radius=0.05,
    location=(ex-0.4, ey+0.4, ez+1.42),
    rotation=(math.radians(48), 0, math.radians(30)), major_segments=32)
tr = bpy.context.active_object; tr.name = "hab_tube_ring"
bpy.ops.object.shade_smooth(); setmat(tr, m_trim)

# ---- 2. side pod: hang it off a beefy horizontal arm, drop the stool legs ----
for ob in list(sc.objects):
    if ob.name.startswith("hab_pod_leg_"):
        bpy.data.objects.remove(ob, do_unlink=True)
pod = bpy.data.objects["hab_pod"]
strip = bpy.data.objects["win_strip_pod"]
tube = bpy.data.objects.get("hab_pod_tube")
if tube: bpy.data.objects.remove(tube, do_unlink=True)
px, py, pz = -6.8, HABY+1.0, DECK0_Z          # raise pod level with big deck
pod.location = (px, py, pz)
strip.location = (px, py, pz)
cyl_between(Vector((px+1.3, py, pz)), Vector((HABX-4.4, HABY+0.6, DECK0_Z)), 0.45, "hab_pod_tube", m_hull)
# collars on the arm ends
for i, (cx, cy) in enumerate(((px+1.5, py), (HABX-4.5, HABY+0.58))):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.50, minor_radius=0.06, location=(cx, cy, pz),
        rotation=(0, math.radians(90), math.radians(6)), major_segments=32)
    c = bpy.context.active_object; c.name = f"hab_pod_collar_{i}"
    bpy.ops.object.shade_smooth(); setmat(c, m_trim)
# single support column under pod
lx, ly = px, py
cyl_between(Vector((px, py, pz-0.35)), Vector((lx, ly, floor_z(lx, ly)+0.1)), 0.16, "hab_pod_column", m_trim)

# ---- 3. rooftop structures on the big deck ----
# deck 0: r=5 lens at z 3.4, scale z 0.22 -> surface z = 3.4 + 0.22*sqrt(25-r^2)
def deck0_top(r_pos, az_deg):
    a = math.radians(az_deg)
    x = HABX + math.sin(a) * r_pos
    y = HABY - math.cos(a) * r_pos
    z = DECK0_Z + 0.22 * math.sqrt(max(25 - r_pos*r_pos, 0))
    return x, y, z

for i, (az, rr, dr) in enumerate([(-42, 3.0, 0.55), (8, 2.4, 0.45), (48, 3.2, 0.60)]):
    x, y, z = deck0_top(rr, az)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=dr, segments=32, ring_count=16, location=(x, y, z+dr*0.25))
    d = bpy.context.active_object; d.name = f"hab_roof_dome_{i}"
    bpy.ops.object.shade_smooth(); setmat(d, m_hull)
    bpy.ops.mesh.primitive_torus_add(major_radius=dr*0.82, minor_radius=0.035,
        location=(x, y, z+dr*0.42), major_segments=32)
    g = bpy.context.active_object; g.name = f"win_roof_ring_{i}"
    setmat(g, m_strip)
for i, (az, rr) in enumerate([(-20, 3.6), (30, 4.0)]):
    x, y, z = deck0_top(rr, az)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=1.3, location=(x, y, z+0.6))
    a2 = bpy.context.active_object; a2.name = f"hab_roof_ant_{i}"
    setmat(a2, m_trim)

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render9.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
