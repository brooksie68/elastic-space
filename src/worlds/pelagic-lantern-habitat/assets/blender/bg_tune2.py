import bpy, math, random
from mathutils import Vector

sc = bpy.context.scene
random.seed(21)

# ---- clear flora blocking the habitat view (centre corridor) ----
doomed = []
for ob in sc.objects:
    if ob.name.startswith(("flora_", "kelp_")):
        x, y = ob.location.x, ob.location.y
        if -1.8 < x < 1.8 and -8.5 < y < -2.5:
            doomed.append(ob)
for ob in doomed:
    bpy.data.objects.remove(ob, do_unlink=True)

# also drop that centre cluster's point light
l = bpy.data.objects.get("L_flora_59")
for ob in list(sc.objects):
    if ob.type == 'LIGHT' and ob.name.startswith("L_flora_"):
        if -1.8 < ob.location.x < 1.8 and -8.5 < ob.location.y < -2.5:
            bpy.data.objects.remove(ob, do_unlink=True)

# ---- visible god rays: crank the shafts, aim one at the habitat ----
s0 = bpy.data.objects.get("L_shaft_0")
s1 = bpy.data.objects.get("L_shaft_1")
if s0:
    s0.data.energy = 9000
    s0.location = (-3, 4, 24)
    d = (Vector((-1.5, -1, 0)) - s0.location).normalized()
    s0.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
if s1:
    s1.data.energy = 6500
    s1.location = (7, 2, 24)
    d = (Vector((5, -4, 0)) - s1.location).normalized()
    s1.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# a bit more ambient floor read
bpy.data.objects["L_sun"].data.energy = 1.4

# ---- distant silhouettes: dark spires + faint far glow specks ----
m_rock = bpy.data.materials.get("m_rock")
for i, (x, y, h, r) in enumerate([(-18, 18, 14, 3.2), (-9, 24, 18, 4.5), (14, 20, 12, 3.0),
                                   (22, 14, 9, 2.4), (4, 28, 20, 5.0)]):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r*0.25, depth=h, vertices=12,
        location=(x, y, h/2 - 1.5))
    ob = bpy.context.active_object; ob.name = f"spire_{i}"
    ob.rotation_euler[2] = random.uniform(0, math.tau)
    bpy.ops.object.shade_smooth()
    ob.data.materials.append(m_rock)

# faint distant flora specks on the spire slopes
glows = [m for m in bpy.data.materials if m.name.startswith("m_flora_")]
for i in range(26):
    x = random.uniform(-22, 24); y = random.uniform(10, 26)
    z = random.uniform(0.3, 9)
    r = random.uniform(0.10, 0.22)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=10, ring_count=8, location=(x, y, z))
    ob = bpy.context.active_object; ob.name = f"farglow_{i}"
    ob.data.materials.append(random.choice(glows))

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render3.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print(f"REMOVED {len(doomed)} centre flora | RENDER_DONE")
