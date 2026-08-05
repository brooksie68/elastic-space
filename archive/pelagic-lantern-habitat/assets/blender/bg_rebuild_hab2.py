import bpy, math, random
from mathutils import Vector

sc = bpy.context.scene
random.seed(5)

# ---- remove the sphere habitat ----
for ob in list(sc.objects):
    if ob.name.startswith(("hab_", "win_", "L_win_", "L_beacon")):
        bpy.data.objects.remove(ob, do_unlink=True)

HABX, HABY = 0.0, 15.5
m_hull = bpy.data.materials["m_hull"]
m_trim = bpy.data.materials["m_trim"]
m_glow = bpy.data.materials["m_glow"]
m_beacon = bpy.data.materials["m_beacon"]

m_strip = bpy.data.materials.get("m_strip")
if not m_strip:
    m_strip = m_glow.copy(); m_strip.name = "m_strip"
    m_strip.node_tree.nodes["Principled BSDF"].inputs['Emission Strength'].default_value = 4.5

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

# ================= CENTRAL CORE =================
CORE_R = 1.15
bpy.ops.mesh.primitive_cylinder_add(radius=CORE_R, depth=9.4, location=(HABX, HABY, 5.7), vertices=48)
core = bpy.context.active_object; core.name = "hab_core"
bpy.ops.object.shade_smooth(); setmat(core, m_hull)

# ================= DISK DECKS =================
# (radius, centre z, x offset)  — big low deck, mid deck, small high deck
decks = [(5.0, 3.4, 0.0), (3.5, 6.3, 0.6), (2.2, 8.7, -0.3)]
for i, (dr, dz, dx) in enumerate(decks):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=dr, segments=64, ring_count=32,
        location=(HABX+dx, HABY, dz))
    d = bpy.context.active_object; d.name = f"hab_deck_{i}"
    d.scale = (1, 1, 0.22)
    bpy.ops.object.shade_smooth(); setmat(d, m_hull)
    # trim rings above/below the rim
    for s, zoff in (("t", 0.30), ("b", -0.30)):
        bpy.ops.mesh.primitive_torus_add(major_radius=dr*0.93, minor_radius=0.06,
            location=(HABX+dx, HABY, dz+zoff), major_segments=96)
        t = bpy.context.active_object; t.name = f"hab_deck_{i}_trim_{s}"
        bpy.ops.object.shade_smooth(); setmat(t, m_trim)
    # core collar at deck junction
    bpy.ops.mesh.primitive_torus_add(major_radius=CORE_R+0.12, minor_radius=0.09,
        location=(HABX, HABY, dz), major_segments=48)
    c = bpy.context.active_object; c.name = f"hab_collar_{i}"
    bpy.ops.object.shade_smooth(); setmat(c, m_trim)

# ---- lit window bands: continuous strips around deck 0 and deck 2 rims ----
for i, (dr, dz, dx) in enumerate(decks):
    if i == 1: continue
    bpy.ops.mesh.primitive_cylinder_add(radius=dr+0.015, depth=0.13,
        location=(HABX+dx, HABY, dz), vertices=96)
    s = bpy.context.active_object; s.name = f"win_strip_{i}"
    setmat(s, m_strip)

# ---- deck 1: disciplined porthole row, every 10 degrees across the front ----
dr, dz, dx = decks[1]
w = 0
for az in range(-80, 81, 10):
    a = math.radians(az)
    dirv = Vector((math.sin(a), -math.cos(a), 0))
    pos = Vector((HABX+dx, HABY, dz)) + dirv * (dr - 0.02)
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    win = bpy.context.active_object; win.name = f"win_row1_{w}"
    win.scale = (0.16, 0.05, 0.11)
    win.rotation_euler = (0, 0, a)
    setmat(win, m_glow); w += 1

# ---- core windows: three vertical columns of square lights, evenly spaced ----
for az in (-28, 0, 28):
    a = math.radians(az)
    dirv = Vector((math.sin(a), -math.cos(a), 0))
    for k, wz in enumerate((4.4, 5.0, 5.6, 7.0, 7.6)):
        pos = Vector((HABX, HABY, wz)) + dirv * (CORE_R - 0.02)
        bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
        win = bpy.context.active_object; win.name = f"win_core_{az}_{k}"
        win.scale = (0.11, 0.05, 0.11)
        win.rotation_euler = (0, 0, a)
        setmat(win, m_glow)

# ================= OBSERVATION DOME on top deck =================
dr2, dz2, dx2 = decks[2]
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.95, segments=48, ring_count=24,
    location=(HABX+dx2, HABY, dz2+0.35))
dome = bpy.context.active_object; dome.name = "hab_dome"
bpy.ops.object.shade_smooth(); setmat(dome, m_strip)
bpy.ops.mesh.primitive_torus_add(major_radius=0.96, minor_radius=0.07,
    location=(HABX+dx2, HABY, dz2+0.42), major_segments=48)
dr_ = bpy.context.active_object; dr_.name = "hab_dome_ring"
bpy.ops.object.shade_smooth(); setmat(dr_, m_trim)

# ================= HALO RING above top deck =================
bpy.ops.mesh.primitive_torus_add(major_radius=2.9, minor_radius=0.07,
    location=(HABX+dx2, HABY, dz2+1.45), major_segments=96)
halo = bpy.context.active_object; halo.name = "hab_halo"
bpy.ops.object.shade_smooth(); setmat(halo, m_trim)
for j in range(3):
    a = math.radians(30 + j*120)
    p0 = Vector((HABX+dx2 + math.cos(a)*1.9, HABY + math.sin(a)*1.9, dz2+0.15))
    p1 = Vector((HABX+dx2 + math.cos(a)*2.9, HABY + math.sin(a)*2.9, dz2+1.45))
    cyl_between(p0, p1, 0.05, f"hab_halo_pylon_{j}", m_trim)

# ================= SPIRE + BEACON =================
bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=2.6, location=(HABX+dx2, HABY, dz2+1.75))
sp = bpy.context.active_object; sp.name = "hab_spire"; setmat(sp, m_trim)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.20, location=(HABX+dx2, HABY, dz2+3.1))
bea = bpy.context.active_object; bea.name = "hab_beacon"
bpy.ops.object.shade_smooth(); setmat(bea, m_beacon)
lb = bpy.data.lights.new("L_beacon", 'POINT'); lb.color=(1.0,0.65,0.3); lb.energy=140; lb.use_shadow=False
ob = bpy.data.objects.new("L_beacon", lb); ob.location = (HABX+dx2, HABY, dz2+3.1); sc.collection.objects.link(ob)

# ================= INTER-DECK STRUTS =================
for j in range(4):
    a = math.radians(45 + j*90)
    p0 = Vector((HABX + math.cos(a)*3.6, HABY + math.sin(a)*3.6, decks[0][1]+0.25))
    p1 = Vector((HABX+0.6 + math.cos(a)*2.6, HABY + math.sin(a)*2.6, decks[1][1]-0.2))
    cyl_between(p0, p1, 0.09, f"hab_strut_ab_{j}", m_trim)
for j in range(3):
    a = math.radians(90 + j*120)
    p0 = Vector((HABX+0.6 + math.cos(a)*2.4, HABY + math.sin(a)*2.4, decks[1][1]+0.22))
    p1 = Vector((HABX-0.3 + math.cos(a)*1.6, HABY + math.sin(a)*1.6, decks[2][1]-0.18))
    cyl_between(p0, p1, 0.07, f"hab_strut_bc_{j}", m_trim)

# ================= LEGS: columns with seafloor piles =================
for j in range(4):
    a = math.radians(45 + j*90)
    top = Vector((HABX + math.cos(a)*3.4, HABY + math.sin(a)*3.4, decks[0][1]-0.35))
    fx, fy = HABX + math.cos(a)*5.2, HABY + math.sin(a)*5.2
    fz = floor_z(fx, fy)
    foot = Vector((fx, fy, fz + 0.15))
    cyl_between(top, foot, 0.30, f"hab_leg_{j}", m_trim)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=0.9, location=(fx, fy, fz+0.1))
    p = bpy.context.active_object; p.name = f"hab_pile_{j}"; setmat(p, m_hull)

# ================= ELEVATOR TUBE to seafloor entry dome =================
ex, ey = HABX+3.6, HABY-2.5
ez = floor_z(ex, ey)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.25, segments=48, ring_count=24, location=(ex, ey, ez+0.25))
ed = bpy.context.active_object; ed.name = "hab_entry_dome"
bpy.ops.object.shade_smooth(); setmat(ed, m_hull)
bpy.ops.mesh.primitive_torus_add(major_radius=1.05, minor_radius=0.06, location=(ex, ey, ez+0.85),
    rotation=(math.radians(35), 0, math.radians(-20)), major_segments=48)
er = bpy.context.active_object; er.name = "hab_entry_ring"
bpy.ops.object.shade_smooth(); setmat(er, m_trim)
# lit door slit facing camera
bpy.ops.mesh.primitive_cube_add(size=1, location=(ex, ey-1.18, ez+0.55))
door = bpy.context.active_object; door.name = "win_entry_door"
door.scale = (0.28, 0.06, 0.55)
setmat(door, m_glow)
# tube up to deck 0 underside
cyl_between(Vector((ex, ey, ez+1.2)), Vector((HABX+2.4, HABY-1.6, decks[0][1]-0.5)),
            0.42, "hab_lift_tube", m_hull)

# ================= SIDE POD on connector (left) =================
px, py = HABX-6.8, HABY+1.0
pz = decks[0][1] - 0.3
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.7, segments=48, ring_count=24, location=(px, py, pz))
pod = bpy.context.active_object; pod.name = "hab_pod"
pod.scale = (1, 1, 0.35)
bpy.ops.object.shade_smooth(); setmat(pod, m_hull)
bpy.ops.mesh.primitive_cylinder_add(radius=1.72, depth=0.10, location=(px, py, pz), vertices=64)
ps = bpy.context.active_object; ps.name = "win_strip_pod"
setmat(ps, m_strip)
cyl_between(Vector((px+1.4, py, pz)), Vector((HABX-4.6, HABY, decks[0][1])), 0.30, "hab_pod_tube", m_hull)
# pod legs
for j, aa in enumerate((210, 330, 90)):
    a = math.radians(aa)
    lx, ly = px + math.cos(a)*1.9, py + math.sin(a)*1.9
    lz = floor_z(lx, ly)
    cyl_between(Vector((px + math.cos(a)*1.2, py + math.sin(a)*1.2, pz-0.25)),
                Vector((lx, ly, lz+0.1)), 0.12, f"hab_pod_leg_{j}", m_trim)

# ================= WARM SPILL LIGHTS =================
spots = [(0, 12.0, 3.4, 420), (-3.5, 13.5, 6.3, 260), (2.8, 13.8, 8.7, 200),
         (px, py-2.2, pz, 120), (ex, ey-1.6, ez+0.9, 90)]
for i, (lx, ly, lz, en) in enumerate(spots):
    l = bpy.data.lights.new(f"L_win_{i}", 'POINT')
    l.color = (1.0, 0.62, 0.28); l.energy = en; l.use_shadow = False; l.shadow_soft_size = 0.9
    ob = bpy.data.objects.new(f"L_win_{i}", l)
    ob.location = (lx, ly, lz)
    sc.collection.objects.link(ob)

# camera aim
cam = bpy.data.objects["Cam"]
d = (Vector((0, 2.5, 4.6)) - cam.location).normalized()
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render8.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
