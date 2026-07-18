# The Fifteen Sisters — evening salon backdrop plate.
# Headless build: constructs the whole scene from empty, renders a 1920x1080 PNG,
# and exports NDC hotspot coordinates for the door / candle / moon / bright star.
#
# Run:
#   & "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python tmp/the-fifteen-sisters/build-salon.py -- [preview]

import bpy
import bmesh
import json
import math
import random
import sys
from mathutils import Vector

ROOT = r"C:\Users\brook\ai-projects\elastic-space"
TMP = ROOT + r"\tmp\the-fifteen-sisters"
OUT_ROOM = ROOT + r"\src\worlds\the-fifteen-sisters\assets\room"

PREVIEW = "preview" in sys.argv

# ---------------------------------------------------------------- fresh scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = eng
        break
    except Exception:
        continue

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 40 if PREVIEW else 100
scene.eevee.taa_render_samples = 32 if PREVIEW else 160
try:
    scene.eevee.use_raytracing = True
except Exception:
    pass
try:
    scene.eevee.volumetric_tile_size = "4"
    scene.eevee.volumetric_samples = 96
except Exception:
    pass
scene.view_settings.look = "AgX - Base Contrast" if "AgX" in scene.view_settings.view_transform else scene.view_settings.look

# ------------------------------------------------------------------- helpers
def mat(name, color, rough=0.8, metallic=0.0, emit=None, emit_strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    if emit is not None:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    return m

def box(name, size, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size  # unit cube: scale == final dimensions
    bpy.ops.object.transform_apply(scale=True)
    if material:
        ob.data.materials.append(material)
    return ob

def cyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.active_object
    ob.name = name
    if material:
        ob.data.materials.append(material)
    return ob

def sphere(name, r, loc, material, squash=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=16)
    ob = bpy.context.active_object
    ob.name = name
    bpy.ops.object.shade_smooth()
    if squash:
        ob.scale = squash
        bpy.ops.object.transform_apply(scale=True)
    if material:
        ob.data.materials.append(material)
    return ob

def mix_rgb(nt):
    # ShaderNodeMix has same-named sockets per data type; grab the color ones by identifier
    node = nt.nodes.new("ShaderNodeMix")
    node.data_type = "RGBA"
    socks = {s.identifier: s for s in node.inputs}
    out = next(o for o in node.outputs if o.identifier == "Result_Color")
    return node, socks["Factor_Float"], socks["A_Color"], socks["B_Color"], out

def cut(target, cutter):
    mod = target.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    target.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

# ------------------------------------------------------------------ materials
def plaster_material():
    # lived-in plaster: fine grain bump, large damp mottling, scuffs and scum
    # rising from the floor, faint vertical streaks. World-space coords so every
    # wall segment shares one continuous surface.
    m = mat("plaster", (0.060, 0.064, 0.088), rough=0.92)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")

    # fine grain in the surface itself
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 30.0
    grain.inputs["Detail"].default_value = 10.0
    grain.inputs["Roughness"].default_value = 0.68
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.10
    nt.links.new(geo.outputs["Position"], grain.inputs["Vector"])
    nt.links.new(grain.outputs["Fac"], bump.inputs["Height"])

    # sandstone borrowed from the mandala shop, applied gently: box-projected in
    # world space, folded in as a low-factor overlay so the salon keeps its dark
    # evening value while the stone lends strata, cracks and a little warmth.
    simg = bpy.data.images.load(ROOT + r"\src\worlds\mandala-shop\assets\textures\sandstone.png")
    smap2 = nt.nodes.new("ShaderNodeMapping")
    smap2.inputs["Scale"].default_value = (0.35, 0.35, 0.35)  # ~2.9 m repeat
    stex = nt.nodes.new("ShaderNodeTexImage")
    stex.image = simg
    stex.projection = "BOX"
    stex.projection_blend = 0.3
    nt.links.new(geo.outputs["Position"], smap2.inputs["Vector"])
    nt.links.new(smap2.outputs["Vector"], stex.inputs["Vector"])

    # gentle relief from the stone so the candlelight can catch it
    sbw = nt.nodes.new("ShaderNodeRGBToBW")
    sbump = nt.nodes.new("ShaderNodeBump")
    sbump.inputs["Strength"].default_value = 0.20
    nt.links.new(stex.outputs["Color"], sbw.inputs["Color"])
    nt.links.new(sbw.outputs["Val"], sbump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], sbump.inputs["Normal"])
    nt.links.new(sbump.outputs["Normal"], bsdf.inputs["Normal"])

    def maprange(vmin, vmax, tmin, tmax):
        n = nt.nodes.new("ShaderNodeMapRange")
        n.clamp = True
        n.inputs["From Min"].default_value = vmin
        n.inputs["From Max"].default_value = vmax
        n.inputs["To Min"].default_value = tmin
        n.inputs["To Max"].default_value = tmax
        return n

    # large mottled patches (old damp)
    mott = nt.nodes.new("ShaderNodeTexNoise")
    mott.inputs["Scale"].default_value = 0.5
    mott.inputs["Detail"].default_value = 4.0
    nt.links.new(geo.outputs["Position"], mott.inputs["Vector"])
    mott_f = maprange(0.46, 0.75, 0.0, 0.30)
    nt.links.new(mott.outputs["Fac"], mott_f.inputs["Value"])

    # scuffs and scum climbing from the floor, broken up by the streak noise
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    low = maprange(1.35, 0.0, 0.0, 0.42)
    nt.links.new(sep.outputs["Z"], low.inputs["Value"])

    # faint vertical streaks (water has run down these walls)
    smap = nt.nodes.new("ShaderNodeMapping")
    smap.inputs["Scale"].default_value = (6.0, 6.0, 0.45)
    streak = nt.nodes.new("ShaderNodeTexNoise")
    streak.inputs["Scale"].default_value = 1.0
    streak.inputs["Detail"].default_value = 5.0
    nt.links.new(geo.outputs["Position"], smap.inputs["Vector"])
    nt.links.new(smap.outputs["Vector"], streak.inputs["Vector"])
    streak_f = maprange(0.52, 0.78, 0.0, 0.22)
    nt.links.new(streak.outputs["Fac"], streak_f.inputs["Value"])

    # low grime modulated by the streaks so it isn't a clean gradient
    lowmod = nt.nodes.new("ShaderNodeMath")
    lowmod.operation = "MULTIPLY_ADD"
    nt.links.new(low.outputs["Result"], lowmod.inputs[0])
    nt.links.new(streak.outputs["Fac"], lowmod.inputs[1])
    lowmod.inputs[2].default_value = 0.0

    add1 = nt.nodes.new("ShaderNodeMath")
    add1.operation = "ADD"
    nt.links.new(mott_f.outputs["Result"], add1.inputs[0])
    nt.links.new(streak_f.outputs["Result"], add1.inputs[1])
    add2 = nt.nodes.new("ShaderNodeMath")
    add2.operation = "ADD"
    add2.use_clamp = True
    nt.links.new(add1.outputs[0], add2.inputs[0])
    nt.links.new(lowmod.outputs[0], add2.inputs[1])
    cap = nt.nodes.new("ShaderNodeMath")
    cap.operation = "MINIMUM"
    cap.inputs[1].default_value = 0.55
    nt.links.new(add2.outputs[0], cap.inputs[0])

    # base tone with the sandstone overlaid at low strength, then grime on top
    sandmix, sfac, sa, sb, sout = mix_rgb(nt)
    sandmix.blend_type = "OVERLAY"
    sfac.default_value = 0.80
    sa.default_value = (0.060, 0.064, 0.088, 1)
    nt.links.new(stex.outputs["Color"], sb)

    mixn, mfac, ma, mb, mout = mix_rgb(nt)
    mb.default_value = (0.030, 0.028, 0.024, 1)  # brownish grime
    nt.links.new(sout, ma)
    nt.links.new(cap.outputs[0], mfac)
    nt.links.new(mout, bsdf.inputs["Base Color"])
    return m

M_PLASTER = plaster_material()
M_FLOOR = mat("floor", (0.036, 0.032, 0.029), rough=0.38)
M_STONE = mat("stone-sill", (0.095, 0.092, 0.09), rough=0.85)
M_BRONZE = mat("bronze", (0.045, 0.035, 0.025), rough=0.42, metallic=0.85)
M_WOOD = mat("dark-wood", (0.055, 0.036, 0.024), rough=0.55)
M_HILL = mat("hill", (0.010, 0.013, 0.026), rough=1.0)
M_GROUND = mat("night-ground", (0.012, 0.013, 0.020), rough=0.9)
M_MOON = mat("moon", (1, 1, 1), emit=(1.0, 0.96, 0.88), emit_strength=6.0)
M_STAR = mat("star", (1, 1, 1), emit=(0.9, 0.94, 1.0), emit_strength=14.0)
M_STAR_X = mat("star-exit", (1, 1, 1), emit=(1.0, 0.98, 0.9), emit_strength=38.0)
M_FLAME = mat("flame", (1, 1, 1), emit=(1.0, 0.55, 0.18), emit_strength=45.0)
M_CANDLE = mat("candle-wax", (0.85, 0.78, 0.62), rough=0.5)

# Floor tile lines via brick texture on roughness/color
ft = M_FLOOR.node_tree
brick = ft.nodes.new("ShaderNodeTexBrick")
brick.inputs["Scale"].default_value = 1.0
brick.inputs["Color1"].default_value = (0.052, 0.046, 0.042, 1)
brick.inputs["Color2"].default_value = (0.041, 0.036, 0.033, 1)
brick.inputs["Mortar"].default_value = (0.018, 0.016, 0.015, 1)
brick.inputs["Mortar Size"].default_value = 0.012
brick.offset = 0.5
tc = ft.nodes.new("ShaderNodeTexCoord")
mapn = ft.nodes.new("ShaderNodeMapping")
mapn.inputs["Scale"].default_value = (0.62, 0.62, 0.62)
ft.links.new(tc.outputs["Object"], mapn.inputs["Vector"])
ft.links.new(mapn.outputs["Vector"], brick.inputs["Vector"])
ft.links.new(brick.outputs["Color"], ft.nodes["Principled BSDF"].inputs["Base Color"])

# stone wears unevenly: roughness wanders tile to tile so reflections break up
fgeo = ft.nodes.new("ShaderNodeNewGeometry")
fwear = ft.nodes.new("ShaderNodeTexNoise")
fwear.inputs["Scale"].default_value = 1.1
fwear.inputs["Detail"].default_value = 5.0
fwr = ft.nodes.new("ShaderNodeMapRange")
fwr.clamp = True
fwr.inputs["From Min"].default_value = 0.3
fwr.inputs["From Max"].default_value = 0.7
fwr.inputs["To Min"].default_value = 0.30
fwr.inputs["To Max"].default_value = 0.62
ft.links.new(fgeo.outputs["Position"], fwear.inputs["Vector"])
ft.links.new(fwear.outputs["Fac"], fwr.inputs["Value"])
ft.links.new(fwr.outputs["Result"], ft.nodes["Principled BSDF"].inputs["Roughness"])

# wood grain on every wooden thing (door, bench, chair, tables)
wt = M_WOOD.node_tree
wgeo = wt.nodes.new("ShaderNodeNewGeometry")
wmap = wt.nodes.new("ShaderNodeMapping")
wmap.inputs["Scale"].default_value = (2.2, 2.2, 14.0)  # stretched grain
wnoise = wt.nodes.new("ShaderNodeTexNoise")
wnoise.inputs["Scale"].default_value = 3.0
wnoise.inputs["Detail"].default_value = 7.0
wnoise.inputs["Distortion"].default_value = 0.5
wramp = wt.nodes.new("ShaderNodeValToRGB")
wels = wramp.color_ramp.elements
wels[0].position = 0.32
wels[0].color = (0.062, 0.041, 0.027, 1)
wels[1].position = 0.72
wels[1].color = (0.036, 0.022, 0.014, 1)
wt.links.new(wgeo.outputs["Position"], wmap.inputs["Vector"])
wt.links.new(wmap.outputs["Vector"], wnoise.inputs["Vector"])
wt.links.new(wnoise.outputs["Fac"], wramp.inputs["Fac"])
wt.links.new(wramp.outputs["Color"], wt.nodes["Principled BSDF"].inputs["Base Color"])

# --------------------------------------------------------------------- world
world = bpy.data.worlds.new("dusk")
scene.world = world
world.use_nodes = True
wn = world.node_tree
wn.nodes.clear()
out = wn.nodes.new("ShaderNodeOutputWorld")
bg = wn.nodes.new("ShaderNodeBackground")
bg.inputs["Strength"].default_value = 1.0
ramp = wn.nodes.new("ShaderNodeValToRGB")
# dusk gradient: amber horizon -> rose -> violet -> indigo -> near-black zenith
els = ramp.color_ramp.elements
els[0].position = 0.0
els[0].color = (0.55, 0.20, 0.055, 1)      # amber glow at horizon
els[1].position = 1.0
els[1].color = (0.004, 0.007, 0.022, 1)    # zenith
e = ramp.color_ramp.elements.new(0.055)
e.color = (0.42, 0.115, 0.075, 1)          # rose
e = ramp.color_ramp.elements.new(0.16)
e.color = (0.115, 0.065, 0.14, 1)          # violet
e = ramp.color_ramp.elements.new(0.38)
e.color = (0.018, 0.028, 0.085, 1)         # indigo
sep = wn.nodes.new("ShaderNodeSeparateXYZ")
norm = wn.nodes.new("ShaderNodeVectorMath")
norm.operation = "NORMALIZE"
geo = wn.nodes.new("ShaderNodeNewGeometry")
# map z [0..0.7] -> ramp
mapr = wn.nodes.new("ShaderNodeMapRange")
# Incoming points toward the viewer, so sky elevation is -Incoming.z
mapr.inputs["From Min"].default_value = 0.0
mapr.inputs["From Max"].default_value = -0.7
wn.links.new(geo.outputs["Incoming"], norm.inputs[0])
wn.links.new(norm.outputs["Vector"], sep.inputs[0])
wn.links.new(sep.outputs["Z"], mapr.inputs["Value"])
wn.links.new(mapr.outputs["Result"], ramp.inputs["Fac"])
wn.links.new(ramp.outputs["Color"], bg.inputs["Color"])
wn.links.new(bg.outputs["Background"], out.inputs["Surface"])

# ---------------------------------------------------------------------- room
H = 7.0
WALL_Y = 6.0

# Back wall assembled from clean segments; only the three small spandrel
# slabs get a boolean (the arch bite), which keeps the geometry honest.
WALL_TH = 0.35

def wallseg(name, x0, x1, z0, z1):
    return box(name, (x1 - x0, WALL_TH, z1 - z0),
               ((x0 + x1) / 2, WALL_Y, (z0 + z1) / 2), M_PLASTER)

# arch openings: (cx, width, sill, spring)  arch radius = width/2
ARCHES = [(-3.6, 1.7, 0.55, 3.0), (0.0, 3.0, 0.55, 3.4), (3.6, 1.7, 0.55, 3.0)]
DOOR_CX, DOOR_W, DOOR_H = -5.06, 0.92, 2.35
DX0, DX1 = DOOR_CX - DOOR_W / 2, DOOR_CX + DOOR_W / 2

# piers between and around the openings
wallseg("pier-far-left", -6.65, DX0, 0, H)
wallseg("pier-door-right", DX1, -4.45, 0, H)
wallseg("pier-over-door", DX0, DX1, DOOR_H, H)
wallseg("pier-l", -2.75, -1.5, 0, H)
wallseg("pier-r", 1.5, 2.75, 0, H)
wallseg("pier-far-right", 4.45, 6.65, 0, H)

for cx, w, sill, spring in ARCHES:
    r = w / 2
    # base under the opening
    wallseg(f"base-{cx}", cx - r, cx + r, 0, sill)
    # spandrel above with the arch bitten out
    sp = wallseg(f"spandrel-{cx}", cx - r, cx + r, spring, H)
    cut(sp, cyl("c", r, 2.0, (cx, WALL_Y, spring), None, rot=(math.radians(90), 0, 0)))
    # stone sill
    box("sill", (w + 0.36, 0.55, 0.09), (cx, WALL_Y - 0.08, sill - 0.045), M_STONE)

# cornice + wainscot rail on the piers only — never across a window or the door
PIERS = ((-6.65, -5.55), (-4.60, -4.45), (-2.75, -1.5), (1.5, 2.75), (4.45, 6.65))
box("cornice", (13.0, 0.10, 0.16), (0, WALL_Y - 0.22, 5.55), M_STONE)
for wx0, wx1 in PIERS:
    if wx1 - wx0 > 0.1:
        box("wainscot", (wx1 - wx0, 0.06, 0.07), ((wx0 + wx1) / 2, WALL_Y - 0.20, 1.02), M_STONE)

# zellij: mosaic tile band on every pier below the wainscot rail
def zellij_material():
    m = bpy.data.materials.new("zellij")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.22
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 14.0
    sepc = nt.nodes.new("ShaderNodeSeparateColor")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[0].color = (0.03, 0.10, 0.35, 1)      # cobalt
    els[1].position = 0.24
    els[1].color = (0.05, 0.32, 0.30, 1)      # teal
    for pos, col in ((0.5, (0.75, 0.72, 0.62, 1)),    # bone white
                     (0.68, (0.55, 0.30, 0.05, 1)),   # saffron
                     (0.86, (0.38, 0.10, 0.05, 1))):  # terracotta
        e = ramp.color_ramp.elements.new(pos)
        e.color = col
    edge = nt.nodes.new("ShaderNodeTexVoronoi")
    edge.feature = "DISTANCE_TO_EDGE"
    edge.inputs["Scale"].default_value = 14.0
    grout = nt.nodes.new("ShaderNodeValToRGB")
    grout.color_ramp.elements[0].position = 0.0
    grout.color_ramp.elements[0].color = (1, 1, 1, 1)   # on the tile edge -> grout
    grout.color_ramp.elements[1].position = 0.035
    grout.color_ramp.elements[1].color = (0, 0, 0, 1)   # inside the tile -> colour
    mix, mfac, ma, mb, mout = mix_rgb(nt)
    mb.default_value = (0.62, 0.58, 0.5, 1)  # grout
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], edge.inputs["Vector"])
    nt.links.new(vor.outputs["Color"], sepc.inputs["Color"])
    nt.links.new(sepc.outputs["Red"], ramp.inputs["Fac"])
    nt.links.new(edge.outputs["Distance"], grout.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], ma)
    nt.links.new(grout.outputs["Color"], mfac)
    nt.links.new(mout, bsdf.inputs["Base Color"])
    return m

M_ZELLIJ = zellij_material()
for wx0, wx1 in PIERS:
    if wx1 - wx0 > 0.1:
        box("zellij", (wx1 - wx0, 0.03, 0.94), ((wx0 + wx1) / 2, WALL_Y - 0.185, 0.5), M_ZELLIJ)

# two proper paintings between the arches — gilt frames, colourful abstracts
M_GILT = mat("gilt", (0.42, 0.30, 0.10), rough=0.35, metallic=0.9)

def painting_material(name, stops):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.6
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 5.0
    noise.inputs["Detail"].default_value = 6.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = stops[0][0]
    els[0].color = stops[0][1]
    els[1].position = stops[-1][0]
    els[1].color = stops[-1][1]
    for pos, col in stops[1:-1]:
        e = ramp.color_ramp.elements.new(pos)
        e.color = col
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return m

P_WARM = painting_material("painting-warm", (
    (0.0, (0.30, 0.04, 0.05, 1)), (0.4, (0.6, 0.18, 0.06, 1)),
    (0.65, (0.75, 0.45, 0.1, 1)), (1.0, (0.5, 0.1, 0.2, 1))))
P_COOL = painting_material("painting-cool", (
    (0.0, (0.02, 0.08, 0.25, 1)), (0.42, (0.05, 0.3, 0.32, 1)),
    (0.7, (0.55, 0.42, 0.12, 1)), (1.0, (0.1, 0.05, 0.3, 1))))
for px, pmat in ((-2.12, P_WARM), (2.12, P_COOL)):
    box("frame", (0.78, 0.06, 1.05), (px, WALL_Y - 0.20, 2.75), M_GILT)
    box("canvas", (0.68, 0.06, 0.95), (px, WALL_Y - 0.23, 2.75), pmat)

# door recess: darkness behind, wooden panel ajar into the room, warm seam
box("door-dark", (DOOR_W + 0.2, 0.05, DOOR_H + 0.1),
    (DOOR_CX, WALL_Y + 0.30, DOOR_H / 2), mat("door-void", (0.004, 0.003, 0.006), rough=1.0))
ANG = math.radians(26)
HINGE_X = DX0
HALF = (DOOR_W - 0.04) / 2
door = box("door-panel", (DOOR_W - 0.04, 0.06, DOOR_H - 0.04),
           (HINGE_X + HALF * math.cos(ANG), WALL_Y - WALL_TH / 2 - HALF * math.sin(ANG), DOOR_H / 2),
           M_WOOD)
door.rotation_euler = (0, 0, -ANG)
# lintel
box("door-lintel", (DOOR_W + 0.3, 0.5, 0.12), (DOOR_CX, WALL_Y - 0.06, DOOR_H + 0.06), M_STONE)
# warm seam light behind the door
seam = bpy.data.lights.new("door-seam", "AREA")
seam.color = (1.0, 0.55, 0.22)
seam.energy = 14.0
seam.size = 0.06
seam.size_y = DOOR_H * 0.9
ob = bpy.data.objects.new("door-seam", seam)
ob.location = (DOOR_CX + DOOR_W / 2 - 0.10, WALL_Y + 0.30, DOOR_H / 2)
ob.rotation_euler = (math.radians(-90), 0, 0)
scene.collection.objects.link(ob)

# floor / side walls / ceiling
box("floor", (13.0, 12.0, 0.1), (0, 0.6, -0.05), M_FLOOR)
box("wall-left", (0.3, 12.0, H), (-6.65, 0.6, H / 2), M_PLASTER)
box("wall-right", (0.3, 12.0, H), (6.65, 0.6, H / 2), M_PLASTER)
box("ceiling", (13.4, 12.0, 0.3), (0, 0.6, H + 0.15), M_PLASTER)

# outside: NOTHING renders. The windows come out transparent (film_transparent)
# and the page composites James's city painting behind the plate, pixel-exact —
# no tonemap, no haze, no filtering. Interior sunset spill comes from the
# window area lights below.

# the exit star hangs in the sky through the right arch (bakes onto the
# transparent plate, so its glare flare rides OVER the live city image)
STAR_X = Vector((14.9, 40.0, 9.2))
sphere("star-exit", 0.14, STAR_X, M_STAR_X)

# ---------------------------------------------------------------- candelabra
CAND = Vector((4.55, 4.9, 0))
cyl("cand-base", 0.16, 0.05, (CAND.x, CAND.y, 0.025), M_BRONZE)
cyl("cand-pole", 0.024, 1.35, (CAND.x, CAND.y, 0.7), M_BRONZE)
cyl("cand-dish", 0.10, 0.03, (CAND.x, CAND.y, 1.39), M_BRONZE)
cyl("candle", 0.021, 0.22, (CAND.x, CAND.y, 1.51), M_CANDLE)
FLAME = Vector((CAND.x, CAND.y, 1.665))
sphere("flame", 0.016, FLAME, M_FLAME, squash=(1, 1, 2.1))
light = bpy.data.lights.new("candle-light", "POINT")
light.color = (1.0, 0.60, 0.28)
light.energy = 140.0
light.shadow_soft_size = 0.12
ob = bpy.data.objects.new("candle-light", light)
ob.location = (CAND.x, CAND.y - 0.15, 1.78)
scene.collection.objects.link(ob)

# a second, humbler candle on the left to warm the door side
CAND2 = Vector((-4.4, 5.2, 0))
cyl("cand2-pole", 0.02, 0.95, (CAND2.x, CAND2.y, 0.5), M_BRONZE)
cyl("cand2-dish", 0.085, 0.03, (CAND2.x, CAND2.y, 0.99), M_BRONZE)
cyl("candle2", 0.019, 0.18, (CAND2.x, CAND2.y, 1.09), M_CANDLE)
sphere("flame2", 0.014, (CAND2.x, CAND2.y, 1.215), M_FLAME, squash=(1, 1, 2.0))
light2 = bpy.data.lights.new("candle-light-2", "POINT")
light2.color = (1.0, 0.58, 0.26)
light2.energy = 70.0
light2.shadow_soft_size = 0.10
ob = bpy.data.objects.new("candle-light-2", light2)
ob.location = (CAND2.x, CAND2.y - 0.12, 1.33)
scene.collection.objects.link(ob)

# a long low wooden bench beneath the centre window
box("bench", (2.6, 0.42, 0.07), (0, 5.45, 0.46), M_WOOD)
box("bench-leg-1", (0.07, 0.36, 0.43), (-1.15, 5.45, 0.215), M_WOOD)
box("bench-leg-2", (0.07, 0.36, 0.43), (1.15, 5.45, 0.215), M_WOOD)

# ------------------------------------------------------- furnishing the salon
# (the balls are the feature — everything here stays mid-value and behind them)

def rug_material(name, field, field2, border, accent, half_w, half_d):
    # Generated coords (0..1 over the bounding box) — object coords are
    # unreliable here because transform_apply doesn't stick in background mode.
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.95
    tc = nt.nodes.new("ShaderNodeTexCoord")
    # centred coords: n = 2g - 1 per axis, so edges sit at |n| = 1
    cen = nt.nodes.new("ShaderNodeVectorMath"); cen.operation = "SUBTRACT"
    cen.inputs[1].default_value = (0.5, 0.5, 0.0)
    dbl = nt.nodes.new("ShaderNodeVectorMath"); dbl.operation = "SCALE"
    dbl.inputs["Scale"].default_value = 2.0
    nt.links.new(tc.outputs["Generated"], cen.inputs[0])
    nt.links.new(cen.outputs["Vector"], dbl.inputs[0])
    flat = nt.nodes.new("ShaderNodeVectorMath"); flat.operation = "MULTIPLY"
    flat.inputs[1].default_value = (1.0, 1.0, 0.0)
    nt.links.new(dbl.outputs["Vector"], flat.inputs[0])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(flat.outputs["Vector"], sep.inputs[0])
    def absval(out_sock):
        ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
        nt.links.new(out_sock, ab.inputs[0])
        return ab.outputs[0]
    mx = nt.nodes.new("ShaderNodeMath")
    mx.operation = "MAXIMUM"
    nt.links.new(absval(sep.outputs["X"]), mx.inputs[0])
    nt.links.new(absval(sep.outputs["Y"]), mx.inputs[1])
    # field: fine checker of two close tones
    chk = nt.nodes.new("ShaderNodeTexChecker")
    chk.inputs["Scale"].default_value = 22.0
    chk.inputs["Color1"].default_value = field
    chk.inputs["Color2"].default_value = field2
    nt.links.new(tc.outputs["Generated"], chk.inputs["Vector"])
    # central medallion: circle in generated space = ellipse matching the rug
    dist = nt.nodes.new("ShaderNodeVectorMath"); dist.operation = "LENGTH"
    nt.links.new(flat.outputs["Vector"], dist.inputs[0])
    mix_med, mm_fac, mm_a, mm_b, mm_out = mix_rgb(nt)
    nt.links.new(chk.outputs["Color"], mm_a)
    mm_b.default_value = accent
    fac = nt.nodes.new("ShaderNodeMath"); fac.operation = "LESS_THAN"
    fac.inputs[1].default_value = 0.45
    nt.links.new(dist.outputs["Value"], fac.inputs[0])
    nt.links.new(fac.outputs[0], mm_fac)
    # border bands over everything
    bord = nt.nodes.new("ShaderNodeValToRGB")
    bord.color_ramp.interpolation = "CONSTANT"
    els = bord.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0, 0, 0, 0)
    for pos, col in ((0.78, accent), (0.84, (0, 0, 0, 0)), (0.9, border)):
        e = bord.color_ramp.elements.new(pos); e.color = col
    nt.links.new(mx.outputs[0], bord.inputs["Fac"])
    mix_b, mb_fac, mb_a, mb_b, mb_out = mix_rgb(nt)
    nt.links.new(mm_out, mb_a)
    nt.links.new(bord.outputs["Color"], mb_b)
    nt.links.new(bord.outputs["Alpha"], mb_fac)
    nt.links.new(mb_out, bsdf.inputs["Base Color"])
    return m

RUG1 = rug_material("rug-grand", (0.30, 0.05, 0.06, 1), (0.24, 0.04, 0.05, 1),
                    (0.05, 0.08, 0.22, 1), (0.55, 0.32, 0.08, 1), 3.1, 1.3)
box("rug-grand", (6.2, 2.6, 0.025), (0, 3.1, 0.0125), RUG1)
RUG2 = rug_material("rug-door", (0.05, 0.22, 0.20, 1), (0.04, 0.17, 0.16, 1),
                    (0.38, 0.10, 0.05, 1), (0.6, 0.45, 0.15, 1), 0.8, 1.2)
box("rug-door", (1.6, 2.4, 0.025), (-4.3, 2.9, 0.0125), RUG2, rot=(0, 0, math.radians(14)))

# a chair by the left pier, crimson cushion
M_CUSHION = mat("cushion", (0.34, 0.045, 0.06), rough=0.85)
CH = Vector((-2.35, 5.02, 0))
CANG = math.radians(-16)
def chair_off(dx, dy):
    return (CH.x + dx * math.cos(CANG) - dy * math.sin(CANG),
            CH.y + dx * math.sin(CANG) + dy * math.cos(CANG))
for dx, dy in ((-0.19, -0.17), (0.19, -0.17), (-0.19, 0.17), (0.19, 0.17)):
    x, y = chair_off(dx, dy)
    box("chair-leg", (0.045, 0.045, 0.45), (x, y, 0.225), M_WOOD, rot=(0, 0, CANG))
box("chair-seat", (0.48, 0.44, 0.05), (CH.x, CH.y, 0.475), M_WOOD, rot=(0, 0, CANG))
box("chair-cushion", (0.42, 0.38, 0.07), (CH.x, CH.y, 0.535), M_CUSHION, rot=(0, 0, CANG))
bx, by = chair_off(0, 0.20)
box("chair-back", (0.48, 0.05, 0.62), (bx, by, 0.79), M_WOOD, rot=(0, 0, CANG))

# potted palm at the right edge
M_POT = mat("pot-glaze", (0.05, 0.24, 0.24), rough=0.25)
M_LEAF = mat("palm-leaf", (0.030, 0.115, 0.045), rough=0.6)
PALM = Vector((5.05, 4.2, 0))
bpy.ops.mesh.primitive_cone_add(radius1=0.24, radius2=0.32, depth=0.52,
                                location=(PALM.x, PALM.y, 0.26), vertices=32)
pot = bpy.context.active_object
pot.name = "palm-pot"
pot.data.materials.append(M_POT)
cyl("palm-soil", 0.28, 0.04, (PALM.x, PALM.y, 0.5), mat("soil", (0.05, 0.035, 0.02), rough=1.0))
cyl("palm-trunk", 0.045, 1.15, (PALM.x, PALM.y, 1.05), M_WOOD, rot=(math.radians(4), 0, 0))
TRUNK_TOP = Vector((PALM.x, PALM.y - 0.08, 1.62))
random.seed(7)
for k in range(11):
    az = k * (2 * math.pi / 11) + random.uniform(-0.15, 0.15)
    tilt = math.radians(random.choice((-100, -85, -70, -55, -45)))
    # frond long axis after Rx(90+tilt), Rz(az): u = Rz(az) @ (0, -sin tilt, cos tilt)
    u = Vector((math.sin(tilt) * math.sin(az), -math.sin(tilt) * math.cos(az), math.cos(tilt)))
    bpy.ops.mesh.primitive_plane_add(size=1, location=TRUNK_TOP + u * 0.6)
    frond = bpy.context.active_object
    frond.name = "palm-frond"
    frond.scale = (0.18, 1.25, 1)
    frond.rotation_euler = (math.radians(90) + tilt, 0, az)
    frond.data.materials.append(M_LEAF)

# a small round table with bottles and glasses
def glass_mat(name, color):
    m = mat(name, color, rough=0.05)
    bsdf = m.node_tree.nodes["Principled BSDF"]
    for key in ("Transmission Weight", "Transmission"):
        try:
            bsdf.inputs[key].default_value = 1.0
            break
        except Exception:
            continue
    return m

TBL = Vector((2.35, 5.3, 0))
cyl("table-top", 0.42, 0.045, (TBL.x, TBL.y, 0.74), M_WOOD)
cyl("table-col", 0.05, 0.7, (TBL.x, TBL.y, 0.37), M_WOOD)
cyl("table-base", 0.24, 0.04, (TBL.x, TBL.y, 0.02), M_WOOD)
G_GREEN = glass_mat("bottle-green", (0.08, 0.3, 0.1))
G_AMBER = glass_mat("bottle-amber", (0.45, 0.22, 0.04))
G_CLEAR = glass_mat("glass-clear", (0.85, 0.87, 0.85))
cyl("bottle-1", 0.05, 0.3, (TBL.x - 0.13, TBL.y + 0.05, 0.915), G_GREEN)
cyl("bottle-1-neck", 0.017, 0.13, (TBL.x - 0.13, TBL.y + 0.05, 1.12), G_GREEN)
cyl("bottle-2", 0.065, 0.2, (TBL.x + 0.05, TBL.y - 0.1, 0.865), G_AMBER)
cyl("bottle-2-neck", 0.02, 0.1, (TBL.x + 0.05, TBL.y - 0.1, 1.01), G_AMBER)
cyl("glass-1", 0.033, 0.1, (TBL.x + 0.18, TBL.y + 0.12, 0.815), G_CLEAR)
cyl("glass-2", 0.033, 0.1, (TBL.x + 0.24, TBL.y - 0.04, 0.815), G_CLEAR)
tl = bpy.data.lights.new("table-light", "POINT")
tl.color = (1.0, 0.62, 0.3)
tl.energy = 12.0
tl.shadow_soft_size = 0.2
ob = bpy.data.objects.new("table-light", tl)
ob.location = (TBL.x, TBL.y - 0.3, 1.7)
scene.collection.objects.link(ob)

# fruit on the bench
M_WICKER = mat("wicker", (0.30, 0.19, 0.08), rough=0.9)
cyl("basket", 0.17, 0.1, (-0.75, 5.42, 0.545), M_WICKER)
random.seed(3)
FRUITS = (((0.62, 0.22, 0.03), 3), ((0.35, 0.03, 0.05), 2), ((0.66, 0.52, 0.07), 1))
fi = 0
for col, count in FRUITS:
    mf = mat(f"fruit-{fi}", col, rough=0.35)
    for _ in range(count):
        sphere("fruit", 0.048, (-0.75 + random.uniform(-0.08, 0.08),
                                5.42 + random.uniform(-0.07, 0.07),
                                0.62 + random.uniform(0, 0.04)), mf)
    fi += 1

# incense table at the far left, by the door — brass dish, a stick, an ember.
# The smoke is live: the page animates a wisp from the exported "incense"
# hotspot, so no baked smoke here.
ITBL = Vector((-5.35, 4.75, 0))
cyl("itable-top", 0.30, 0.04, (ITBL.x, ITBL.y, 0.72), M_WOOD)
cyl("itable-col", 0.04, 0.68, (ITBL.x, ITBL.y, 0.36), M_WOOD)
cyl("itable-base", 0.17, 0.035, (ITBL.x, ITBL.y, 0.0175), M_WOOD)
cyl("incense-dish", 0.06, 0.025, (ITBL.x, ITBL.y, 0.7525), M_BRONZE)
cyl("incense-stick", 0.004, 0.24, (ITBL.x - 0.025, ITBL.y, 0.865), M_WOOD, rot=(0, math.radians(12), 0))
M_EMBER = mat("ember", (1, 1, 1), emit=(1.0, 0.35, 0.08), emit_strength=10.0)
INCENSE_TIP = Vector((ITBL.x, ITBL.y, 0.982))
sphere("incense-ember", 0.008, INCENSE_TIP, M_EMBER)
il = bpy.data.lights.new("incense-light", "POINT")
il.color = (1.0, 0.45, 0.15)
il.energy = 3.0
il.shadow_soft_size = 0.08
ob = bpy.data.objects.new("incense-light", il)
ob.location = (ITBL.x, ITBL.y - 0.1, 1.1)
scene.collection.objects.link(ob)

# ------------------------------------------------------------ window skylight
for cx, w, sill, spring in ARCHES:
    r = w / 2
    L = bpy.data.lights.new(f"window-{cx}", "AREA")
    L.color = (0.95, 0.52, 0.38)   # sunset spill from the city sky
    L.energy = 85.0
    L.shape = "RECTANGLE"
    L.size = w
    L.size_y = spring + r - sill
    ob = bpy.data.objects.new(f"window-{cx}", L)
    ob.location = (cx, WALL_Y + 0.4, (sill + spring + r) / 2)
    ob.rotation_euler = (math.radians(-90), 0, 0)
    scene.collection.objects.link(ob)

# whisper of cool fill so the interior never crushes to black
fill = bpy.data.lights.new("fill", "AREA")
fill.color = (0.8, 0.62, 0.55)
fill.energy = 18.0
fill.size = 8.0
ob = bpy.data.objects.new("fill", fill)
ob.location = (0, -3.5, 5.8)
ob.rotation_euler = (math.radians(15), 0, 0)
scene.collection.objects.link(ob)

# (volumetric haze removed: it veiled the city through the windows, and the
# city now composites in the page where nothing may touch its pixels)

# -------------------------------------------------------------------- camera
cam = bpy.data.cameras.new("cam")
cam.lens = 30.0
cam.clip_end = 500.0
camob = bpy.data.objects.new("cam", cam)
camob.location = (0, -5.2, 1.9)
camob.rotation_euler = (math.radians(91.5), 0, 0)
scene.collection.objects.link(camob)
scene.camera = camob

# --------------------------------------------------------------- compositing
try:
    scene.use_nodes = True
    ct = scene.node_tree
    legacy_comp = True
except AttributeError:
    ct = bpy.data.node_groups.new("salon-comp", "CompositorNodeTree")
    scene.compositing_node_group = ct
    legacy_comp = False
ct.nodes.clear()
rl = ct.nodes.new("CompositorNodeRLayers")
glare = ct.nodes.new("CompositorNodeGlare")
if legacy_comp:
    comp = ct.nodes.new("CompositorNodeComposite")
else:
    ct.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    comp = ct.nodes.new("NodeGroupOutput")
try:
    glare.glare_type = "FOG_GLOW"
except Exception:
    pass
for prop, val in (("quality", "HIGH"), ("threshold", 1.0), ("size", 8), ("mix", -0.35)):
    try:
        setattr(glare, prop, val)
    except Exception:
        pass
for inp, val in (("Threshold", 1.4), ("Strength", 0.18), ("Size", 0.5), ("Saturation", 1.0)):
    try:
        glare.inputs[inp].default_value = val
    except Exception:
        pass
ct.links.new(rl.outputs["Image"], glare.inputs["Image"])
ct.links.new(glare.outputs["Image"], comp.inputs[0])

# ---------------------------------------------------------------- NDC export
from bpy_extras.object_utils import world_to_camera_view as w2cv

bpy.context.view_layer.update()

def ndc(p):
    v = w2cv(scene, camob, Vector(p))
    return {"x": round(v.x, 4), "y": round(1.0 - v.y, 4)}  # y down, CSS-style

hotspots = {
    "image": {"w": 1920, "h": 1080},
    "door": ndc((DOOR_CX, WALL_Y, DOOR_H * 0.55)),
    "doorTop": ndc((DOOR_CX, WALL_Y, DOOR_H)),
    "doorBottom": ndc((DOOR_CX, WALL_Y, 0.0)),
    "flame": ndc(FLAME),
    "flame2": ndc((CAND2.x, CAND2.y, 1.215)),
    "incense": ndc(INCENSE_TIP),
    "star": ndc(STAR_X),
    "archLeft": {"a": ndc((-3.6 - 0.85, WALL_Y, 0.55)), "b": ndc((-3.6 + 0.85, WALL_Y, 3.85))},
    "archCenter": {"a": ndc((-1.5, WALL_Y, 0.55)), "b": ndc((1.5, WALL_Y, 4.9))},
    "archRight": {"a": ndc((3.6 - 0.85, WALL_Y, 0.55)), "b": ndc((3.6 + 0.85, WALL_Y, 3.85))},
    "floorLine": ndc((0, WALL_Y, 0.0)),
    "beamHint": {"left": ndc((-5.0, 4.0, 5.6)), "right": ndc((5.0, 4.0, 5.6))},
}
with open(TMP + r"\salon-map.json", "w") as f:
    json.dump(hotspots, f, indent=2)

# --------------------------------------------------------------------- render
scene.render.filepath = (TMP + r"\salon-preview.png") if PREVIEW else (TMP + r"\salon.png")
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
bpy.ops.wm.save_as_mainfile(filepath=TMP + r"\salon.blend")
bpy.ops.render.render(write_still=True)
print("SALON_RENDER_DONE ->", scene.render.filepath)
