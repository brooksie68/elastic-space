import bpy, math, random
from mathutils import Vector

sc = bpy.context.scene
random.seed(11)

# ---- remove the old one-man habitat ----
for ob in list(sc.objects):
    if ob.name.startswith(("hab_", "win_", "L_win_", "L_beacon")):
        bpy.data.objects.remove(ob, do_unlink=True)

HAB = Vector((0, 15.5, 5.2))  # farther back
R = 4.6                       # building-sized

m_hull = bpy.data.materials["m_hull"]
m_trim = bpy.data.materials["m_trim"]
m_glow = bpy.data.materials["m_glow"]
m_beacon = bpy.data.materials["m_beacon"]

def variant_glow(name, estr):
    m = bpy.data.materials.get(name)
    if m: return m
    m = m_glow.copy(); m.name = name
    m.node_tree.nodes["Principled BSDF"].inputs['Emission Strength'].default_value = estr
    return m
m_glow_dim = variant_glow("m_glow_dim", 2.2)
m_glow_off = variant_glow("m_glow_off", 0.15)

def setmat(ob, m):
    ob.data.materials.clear(); ob.data.materials.append(m)

dg = bpy.context.evaluated_depsgraph_get()
def floor_z(x, y):
    hit, loc, *_ = sc.ray_cast(dg, Vector((x, y, 30)), Vector((0, 0, -1)))
    return loc.z if hit else 0.0

# ---- hull ----
bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=96, ring_count=48, location=HAB)
hull = bpy.context.active_object; hull.name = "hab_hull"
bpy.ops.object.shade_smooth(); setmat(hull, m_hull)

# ---- rings: equator + upper + lower ----
for nm, lat, minor in [("hab_ring_eq", 0, 0.16), ("hab_ring_up", 40, 0.10), ("hab_ring_lo", -35, 0.10)]:
    la = math.radians(lat)
    bpy.ops.mesh.primitive_torus_add(major_radius=R*math.cos(la)+0.07, minor_radius=minor,
        location=HAB + Vector((0, 0, R*math.sin(la))), major_segments=96)
    t = bpy.context.active_object; t.name = nm
    bpy.ops.object.shade_smooth(); setmat(t, m_trim)

def sphere_dir(az_deg, el_deg):
    a, e = math.radians(az_deg), math.radians(el_deg)
    return Vector((math.sin(a)*math.cos(e), -math.cos(a)*math.cos(e), math.sin(e)))

def add_window(az, el, wr, mat, rimmed=False, tag=""):
    d = sphere_dir(az, el)
    pos = HAB + d * R
    rot = d.to_track_quat('Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_cylinder_add(radius=wr, depth=0.08, location=pos + d*0.02, vertices=20)
    disc = bpy.context.active_object; disc.name = f"win_glow{tag}"
    disc.rotation_euler = rot
    setmat(disc, mat)
    if rimmed:
        bpy.ops.mesh.primitive_torus_add(major_radius=wr+0.06, minor_radius=0.07,
            location=pos + d*0.04, major_segments=48)
        rim = bpy.context.active_object; rim.name = f"win_rim{tag}"
        rim.rotation_euler = rot
        bpy.ops.object.shade_smooth(); setmat(rim, m_trim)

# ---- feature windows ----
add_window(0, 14, 0.80, m_glow, rimmed=True, tag="_main")
add_window(-28, 12, 0.42, m_glow, rimmed=True, tag="_mid_l")
add_window(27, 13, 0.40, m_glow, rimmed=True, tag="_mid_r")

# keep-clear zones around feature windows (az, el, radius in degrees)
clear = [(0, 14, 14), (-28, 12, 9), (27, 13, 9)]

# ---- rows of tiny portholes across the front ----
count = 0
bands = [(-28, 0), (-15, 6), (-2, 0), (11, 6), (24, 0), (36, 6), (46, 0)]
for el, az_off in bands:
    step = 9 if abs(el) < 30 else 12
    az = -66 + az_off
    while az <= 66:
        if not any(math.hypot(az-ca, el-ce) < cr for ca, ce, cr in clear):
            if random.random() < 0.22:   # skip some: lived-in, not disco ball
                az += step
                continue
            roll = random.random()
            mat = m_glow if roll < 0.62 else (m_glow_dim if roll < 0.88 else m_glow_off)
            add_window(az + random.uniform(-1.5, 1.5), el + random.uniform(-1.2, 1.2),
                       random.uniform(0.13, 0.19), mat, tag=f"_{count}")
            count += 1
        az += step
# a few tiny ones below the lower ring
for el in (-44, -52):
    for az in range(-40, 41, 16):
        roll = random.random()
        mat = m_glow if roll < 0.55 else m_glow_dim
        add_window(az + random.uniform(-2, 2), el, random.uniform(0.12, 0.16), mat, tag=f"_{count}")
        count += 1

# ---- legs ----
for i in range(4):
    a = math.radians(45 + i*90)
    top = HAB + Vector((math.cos(a)*R*0.70, math.sin(a)*R*0.70, -R*0.62))
    fx, fy = math.cos(a)*5.8, HAB.y + math.sin(a)*5.8
    foot = Vector((fx, fy, floor_z(fx, fy) + 0.1))
    mid = (top + foot) / 2
    vec = foot - top
    bpy.ops.mesh.primitive_cylinder_add(radius=0.40, depth=vec.length, location=mid)
    leg = bpy.context.active_object; leg.name = f"hab_leg_{i}"
    leg.rotation_euler = vec.to_track_quat('Z', 'Y').to_euler()
    setmat(leg, m_trim)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.65, depth=0.35, location=foot)
    ft = bpy.context.active_object; ft.name = f"hab_foot_{i}"
    setmat(ft, m_trim)

# ---- mast + beacon ----
bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=2.0, location=HAB + Vector((0,0,R+0.9)))
mast = bpy.context.active_object; mast.name = "hab_mast"; setmat(mast, m_trim)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.24, location=HAB + Vector((0,0,R+1.9)))
bea = bpy.context.active_object; bea.name = "hab_beacon"
bpy.ops.object.shade_smooth(); setmat(bea, m_beacon)
lb = bpy.data.lights.new("L_beacon", 'POINT'); lb.color=(1.0,0.65,0.3); lb.energy=140; lb.use_shadow=False
ob = bpy.data.objects.new("L_beacon", lb); ob.location = HAB + Vector((0,0,R+1.9)); sc.collection.objects.link(ob)

# second small antenna, off-centre
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=1.8,
    location=HAB + Vector((1.6, 0.5, R*0.92+0.8)), rotation=(math.radians(8), math.radians(-6), 0))
a2 = bpy.context.active_object; a2.name = "hab_antenna2"; setmat(a2, m_trim)

# ---- side pod module (right), connected by tube ----
pod_c = Vector((7.6, 17.0, 0))
pod_c.z = floor_z(pod_c.x, pod_c.y) + 1.75
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.8, segments=48, ring_count=24, location=pod_c)
pod = bpy.context.active_object; pod.name = "hab_pod"
bpy.ops.object.shade_smooth(); setmat(pod, m_hull)
bpy.ops.mesh.primitive_torus_add(major_radius=1.84, minor_radius=0.08, location=pod_c, major_segments=64)
pr = bpy.context.active_object; pr.name = "hab_pod_ring"
bpy.ops.object.shade_smooth(); setmat(pr, m_trim)
# connecting tube
t0 = HAB + (pod_c - HAB).normalized() * (R*0.9)
t1 = pod_c + (HAB - pod_c).normalized() * 1.5
mid = (t0 + t1)/2; vec = t1 - t0
bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=vec.length, location=mid)
tube = bpy.context.active_object; tube.name = "hab_tube"
tube.rotation_euler = vec.to_track_quat('Z','Y').to_euler()
bpy.ops.object.shade_smooth(); setmat(tube, m_hull)
# pod windows facing camera
for i, (az, el) in enumerate([(-18,8),(0,10),(18,8),(-10,-8),(8,-8),(24,-4)]):
    d = sphere_dir(az, el)
    pos = pod_c + d * 1.8
    rot = d.to_track_quat('Z','Y').to_euler()
    roll = random.random()
    mat = m_glow if roll < 0.7 else m_glow_dim
    bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.07, location=pos + d*0.02, vertices=16)
    w = bpy.context.active_object; w.name = f"win_pod_{i}"
    w.rotation_euler = rot; setmat(w, mat)

# ---- warm spill lights across the front (no shadows) ----
for i, (az, el) in enumerate([(-35, 5), (0, 0), (34, 8), (-12, -30), (14, 30)]):
    d = sphere_dir(az, el)
    l = bpy.data.lights.new(f"L_win_{i}", 'POINT')
    l.color = (1.0, 0.62, 0.28); l.energy = 150; l.use_shadow = False; l.shadow_soft_size = 0.8
    ob = bpy.data.objects.new(f"L_win_{i}", l)
    ob.location = HAB + d * (R + 1.3)
    sc.collection.objects.link(ob)
# pod spill
l = bpy.data.lights.new("L_win_pod", 'POINT')
l.color = (1.0, 0.62, 0.28); l.energy = 90; l.use_shadow = False
ob = bpy.data.objects.new("L_win_pod", l); ob.location = pod_c + Vector((0, -2.2, 0.4))
sc.collection.objects.link(ob)

# ---- re-aim camera: habitat upper-centre, flora foreground ----
cam = bpy.data.objects["Cam"]
d = (Vector((0, 2.5, 4.5)) - cam.location).normalized()
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render7.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print(f"TINY_WINDOWS {count} | RENDER_DONE")
