"""Build 3D Jerry (beach-ball scale) inside the pelagic habitat scene.

Anatomy transcribed from jerrys-pool/site.css. Jerry = 0.6 m diameter membrane
sphere, organelles inside, three thin rings orbiting. Everything lives in a
"Jerry" collection so layers can be isolated for transparent exports later.

Run:  blender.exe --background pelagic-habitat.blend --python jerry_build.py
Saves pelagic-jerry.blend + lookdev render, leaves pelagic-habitat.blend alone.
"""
import bpy, math
from mathutils import Vector, Euler

sc = bpy.context.scene
D = 0.6            # Jerry diameter (beach ball)
R = D / 2

# ---------- placement: 2.2 m in front of the camera, slightly left/up ----------
cam = bpy.data.objects["Cam"]
cm = cam.matrix_world
JERRY = cm @ Vector((-0.55, 0.25, -2.2))   # cam space: x right, y up, -z forward

# ---------- collection ----------
jcol = bpy.data.collections.new("Jerry")
sc.collection.children.link(jcol)

def link(ob):
    for c in ob.users_collection:
        c.objects.unlink(ob)
    jcol.objects.link(ob)

# ---------- material helpers ----------
def emit_mat(name, color, strength, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    if alpha >= 1.0:
        nt.links.new(em.outputs[0], out.inputs[0])
    else:
        mix = nt.nodes.new("ShaderNodeMixShader")
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix.inputs[0].default_value = alpha
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(em.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs[0])
        try:
            m.surface_render_method = 'BLENDED'
        except AttributeError:
            m.blend_method = 'BLEND'
    return m

def squish(ob, strength):
    """Noise-displace so the shape reads soft and organic, not CAD."""
    tex = bpy.data.textures.new(f"n_{ob.name}", 'CLOUDS')
    tex.noise_scale = 0.35
    tex.noise_depth = 2
    mod = ob.modifiers.new("squish", 'DISPLACE')
    mod.texture = tex
    mod.texture_coords = 'GLOBAL'
    mod.strength = strength
    mod.mid_level = 0.5

def gradient_emit_mat(name, c0, c1, strength, axis='Z'):
    """Shaded squishy organelle: gradient base color on a Principled BSDF that
    reacts to Jerry's inner light, faint self-glow, soft fresnel-faded edges."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    pr = nt.nodes.new("ShaderNodeBsdfPrincipled")
    pr.inputs["Roughness"].default_value = 0.6
    if "Subsurface Weight" in pr.inputs:
        pr.inputs["Subsurface Weight"].default_value = 0.35
    tc = nt.nodes.new("ShaderNodeTexCoord")
    # face-plane diagonal: local x - z (UL of the visible face = low, LR = high)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    dsub = nt.nodes.new("ShaderNodeMath")
    dsub.operation = 'SUBTRACT'
    dmr = nt.nodes.new("ShaderNodeMapRange")
    dmr.inputs["From Min"].default_value = -0.5
    dmr.inputs["From Max"].default_value = 0.5
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c0, 1)
    ramp.color_ramp.elements[1].color = (*c1, 1)
    ramp.color_ramp.elements[0].position = 0.15
    ramp.color_ramp.elements[1].position = 0.8
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["X"], dsub.inputs[0])
    nt.links.new(sep.outputs["Z"], dsub.inputs[1])
    nt.links.new(dsub.outputs[0], dmr.inputs["Value"])
    nt.links.new(dmr.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs["Color"], pr.inputs["Base Color"])
    nt.links.new(ramp.outputs["Color"], pr.inputs["Emission Color"])
    pr.inputs["Emission Strength"].default_value = strength * 0.38
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.45
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 1.6
    nt.links.new(lw.outputs["Fresnel"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs[0])
    nt.links.new(pr.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    return m

def dark_mat(name, rim=(0.25, 0.42, 0.46)):
    """Near-black blob with faint teal fresnel rim (dark organelles)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    dark = nt.nodes.new("ShaderNodeBsdfDiffuse")
    dark.inputs["Color"].default_value = (0.008, 0.02, 0.035, 1)
    rimn = nt.nodes.new("ShaderNodeEmission")
    rimn.inputs["Color"].default_value = (*rim, 1)
    rimn.inputs["Strength"].default_value = 1.2
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    nt.links.new(lw.outputs["Facing"], mix.inputs[0])
    nt.links.new(dark.outputs[0], mix.inputs[1])
    nt.links.new(rimn.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m

# membrane: gel surface + glowing blue cytoplasm volume inside.
# James 2026-07-19: "big ball of cytoplasm... glowing from the inside... blue, with an aura."
def membrane_mat():
    m = bpy.data.materials.new("m_jerry_membrane")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    # face = mostly transparent + a soft glossy sheen so scene light drapes the dome
    tr0 = nt.nodes.new("ShaderNodeBsdfTransparent")
    tr0.inputs["Color"].default_value = (0.88, 0.99, 0.97, 1)
    gl = nt.nodes.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.38
    gl.inputs["Color"].default_value = (0.78, 0.72, 1.0, 1)
    facemix = nt.nodes.new("ShaderNodeMixShader")
    facemix.inputs[0].default_value = 0.16
    nt.links.new(tr0.outputs[0], facemix.inputs[1])
    nt.links.new(gl.outputs[0], facemix.inputs[2])
    tr = facemix  # downstream wiring uses tr.outputs[0]
    rim = nt.nodes.new("ShaderNodeEmission")
    rim.inputs["Strength"].default_value = 1.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.396, 0.831, 1.0, 1)   # 101,212,255
    ramp.color_ramp.elements[1].color = (0.561, 1.0, 0.882, 1)   # 143,255,225
    ramp.color_ramp.elements[1].position = 0.45
    e_pink = ramp.color_ramp.elements.new(0.85)
    e_pink.color = (1.0, 0.43, 0.66, 1)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.62
    lw2 = nt.nodes.new("ShaderNodeLayerWeight")
    lw2.inputs["Blend"].default_value = 0.35
    # confine the glow to the rim: fresnel^3
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 1.7
    nt.links.new(lw.outputs["Fresnel"], ramp.inputs[0])
    nt.links.new(ramp.outputs["Color"], rim.inputs["Color"])
    nt.links.new(lw2.outputs["Fresnel"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(rim.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    # cytoplasm: blue scattering/emitting fog filling the sphere
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (0.32, 0.38, 1.0, 1)
    vol.inputs["Anisotropy"].default_value = 0.25
    vol.inputs["Emission Strength"].default_value = 2.2
    vol.inputs["Emission Color"].default_value = (0.13, 0.48, 1.0, 1)
    # juicy: noise-modulated density = filaments and thick/thin patches
    vtex = nt.nodes.new("ShaderNodeTexNoise")
    vtex.inputs["Scale"].default_value = 9.0
    vtex.inputs["Detail"].default_value = 6.0
    vtex.inputs["Roughness"].default_value = 0.62
    vramp = nt.nodes.new("ShaderNodeValToRGB")
    vramp.color_ramp.elements[0].position = 0.32
    vramp.color_ramp.elements[1].position = 0.72
    vmath = nt.nodes.new("ShaderNodeMath")
    vmath.operation = 'MULTIPLY'
    vmath.inputs[1].default_value = 2.6
    vtc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(vtc.outputs["Object"], vtex.inputs[0])
    nt.links.new(vtex.outputs["Fac"], vramp.inputs[0])
    nt.links.new(vramp.outputs["Color"], vmath.inputs[0])
    # radial falloff: denser core, thinner edges
    vlen = nt.nodes.new("ShaderNodeVectorMath")
    vlen.operation = 'LENGTH'
    vmr = nt.nodes.new("ShaderNodeMapRange")
    vmr.inputs["From Min"].default_value = 0.0
    vmr.inputs["From Max"].default_value = 0.3
    vmr.inputs["To Min"].default_value = 1.7
    vmr.inputs["To Max"].default_value = 0.6
    vmul2 = nt.nodes.new("ShaderNodeMath")
    vmul2.operation = 'MULTIPLY'
    nt.links.new(vtc.outputs["Object"], vlen.inputs[0])
    nt.links.new(vlen.outputs["Value"], vmr.inputs["Value"])
    nt.links.new(vmath.outputs[0], vmul2.inputs[0])
    nt.links.new(vmr.outputs[0], vmul2.inputs[1])
    nt.links.new(vmul2.outputs[0], vol.inputs["Density"])
    # roundness: emission shades diagonally across the body (UL bright, LR deep)
    ssep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ssub = nt.nodes.new("ShaderNodeMath")
    ssub.operation = 'SUBTRACT'
    sfac = nt.nodes.new("ShaderNodeMapRange")
    sfac.inputs["From Min"].default_value = -0.42
    sfac.inputs["From Max"].default_value = 0.42
    smr = nt.nodes.new("ShaderNodeMapRange")
    smr.inputs["To Min"].default_value = 1.3
    smr.inputs["To Max"].default_value = 0.08
    cramp = nt.nodes.new("ShaderNodeValToRGB")
    cramp.color_ramp.elements[0].color = (0.72, 0.95, 1.0, 1)
    cramp.color_ramp.elements[0].position = 0.1
    cramp.color_ramp.elements[1].color = (0.22, 0.1, 0.6, 1)
    cramp.color_ramp.elements[1].position = 0.85
    nt.links.new(vtc.outputs["Object"], ssep.inputs[0])
    nt.links.new(ssep.outputs["X"], ssub.inputs[0])
    nt.links.new(ssep.outputs["Z"], ssub.inputs[1])
    nt.links.new(ssub.outputs[0], sfac.inputs["Value"])
    nt.links.new(sfac.outputs[0], smr.inputs["Value"])
    nt.links.new(sfac.outputs[0], cramp.inputs[0])
    nt.links.new(smr.outputs[0], vol.inputs["Emission Strength"])
    nt.links.new(cramp.outputs["Color"], vol.inputs["Emission Color"])
    nt.links.new(vol.outputs[0], out.inputs["Volume"])
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    m.use_backface_culling = True
    return m

def aura_mat():
    """Soft additive blue halo shell around the whole cell."""
    m = bpy.data.materials.new("m_jerry_aura")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.4, 0.45, 1.0, 1)
    em.inputs["Strength"].default_value = 0.6
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.3
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 4.0
    nt.links.new(lw.outputs["Fresnel"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    m.use_backface_culling = True
    return m

def setmat(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)

# ---------- CSS % -> local position mapping ----------
# CSS: left/top of bounding box in orb %, width/height in orb %.
# Local frame: x = screen right, z = screen up, y = depth (toward station).
def css_pos(left, top, w, h, depth=0.0):
    cx = left + w / 2
    cy = top + h / 2
    return Vector(((cx - 50) / 100 * D, depth, (50 - cy) / 100 * D))

def blob(name, left, top, w, h, mat, depth=0.0, rot_deg=0.0, squash=0.55):
    """Ellipsoid organelle. w/h in orb %; squash = depth axis ratio."""
    pos = css_pos(left, top, w, h, depth)
    # keep inside membrane
    if pos.length > R * 0.82:
        pos = pos.normalized() * R * 0.82
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, segments=48, ring_count=24)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w / 100 * D, min(w, h) / 100 * D * squash, h / 100 * D)
    ob.location = pos
    ob.rotation_euler = Euler((0, math.radians(-rot_deg), 0))
    bpy.ops.object.shade_smooth()
    squish(ob, 0.16)
    setmat(ob, mat)
    link(ob)
    return ob

# ---------- root empty (everything parents to this) ----------
root = bpy.data.objects.new("jerry_root", None)
root.location = JERRY
# face the camera: local +y should point away from cam (cam looks +y-ish already)
jcol.objects.link(root)

parts = []

# ---------- membrane ----------
bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=64, ring_count=32)
mem = bpy.context.active_object
mem.name = "jerry_membrane"
bpy.ops.object.shade_smooth()
squish(mem, 0.045)
setmat(mem, membrane_mat())
link(mem)
parts.append(mem)

# ---------- inner membrane wall: visible thickness ----------
def inner_wall_mat():
    m = bpy.data.materials.new("m_jerry_wall")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.3, 0.68, 0.95, 1)
    em.inputs["Strength"].default_value = 0.55
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.32
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 2.2
    nt.links.new(lw.outputs["Fresnel"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    m.use_backface_culling = True
    return m

bpy.ops.mesh.primitive_uv_sphere_add(radius=R * 0.94, segments=64, ring_count=32)
wall = bpy.context.active_object
wall.name = "jerry_wall"
bpy.ops.object.shade_smooth()
squish(wall, 0.045)
setmat(wall, inner_wall_mat())
link(wall)
parts.append(wall)

# ---------- aura shell ----------
bpy.ops.mesh.primitive_uv_sphere_add(radius=R * 1.16, segments=48, ring_count=24)
aura = bpy.context.active_object
aura.name = "jerry_aura"
bpy.ops.object.shade_smooth()
setmat(aura, aura_mat())
link(aura)
parts.append(aura)

# ---------- halo billboard: soft radial glow with no hard edge ----------
def halo_mat():
    m = bpy.data.materials.new("m_jerry_halo")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.28, 0.62, 1.0, 1)
    em.inputs["Strength"].default_value = 0.9
    tc = nt.nodes.new("ShaderNodeTexCoord")
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = 'SPHERICAL'
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2.3, 2.3, 1)
    mp.inputs["Location"].default_value = (-1.15, -1.15, 0)
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 1.8
    nt.links.new(tc.outputs["Generated"], mp.inputs[0])
    nt.links.new(mp.outputs[0], grad.inputs[0])
    nt.links.new(grad.outputs["Fac"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    return m

bpy.ops.mesh.primitive_plane_add(size=1)
halo = bpy.context.active_object
halo.name = "jerry_halo"
halo.scale = (R * 4.4, R * 4.4, 1)
halo.location = Vector((0, 0.28, 0))   # just behind the membrane
halo.rotation_euler = Euler((math.radians(90), 0, 0))
setmat(halo, halo_mat())
link(halo)
parts.append(halo)

# ---------- inner light: Jerry glows onto the water and seafloor ----------
jl = bpy.data.lights.new("L_jerry", 'POINT')
jl.color = (0.3, 0.62, 1.0)
jl.energy = 70
jl.use_shadow = True
jl.shadow_soft_size = 0.55
jlob = bpy.data.objects.new("L_jerry", jl)
jlob.location = Vector((0.07, -0.13, 0.1))
jcol.objects.link(jlob)
parts.append(jlob)

# ---------- nucleus: lavender-indigo, warm highlight ----------
m_nuc = gradient_emit_mat("m_jerry_nucleus", (1.0, 0.82, 0.4), (0.06, 0.04, 0.32), 2.0)
# nucleus: mostly self-colored — a strong emission gradient mixed over the shaded
# base so the warm-cream-to-indigo read survives the blue inner light and the goo
_nnt = m_nuc.node_tree
_npr = next(n for n in _nnt.nodes if n.type == 'BSDF_PRINCIPLED')
_nramp = next(n for n in _nnt.nodes if n.type == 'VALTORGB')
_nramp.color_ramp.elements[0].color = (1.0, 0.88, 0.6, 1)
_nramp.color_ramp.elements[0].position = 0.15
_nramp.color_ramp.elements[1].color = (0.12, 0.07, 0.42, 1)
_nramp.color_ramp.elements[1].position = 0.7
_nmix_edge = next(n for n in _nnt.nodes if n.type == 'MIX_SHADER')
_nem = _nnt.nodes.new("ShaderNodeEmission")
_nem.inputs["Strength"].default_value = 0.75
_nnt.links.new(_nramp.outputs["Color"], _nem.inputs["Color"])
_nmix2 = _nnt.nodes.new("ShaderNodeMixShader")
_nmix2.inputs[0].default_value = 0.85
_nnt.links.new(_npr.outputs[0], _nmix2.inputs[1])
_nnt.links.new(_nem.outputs[0], _nmix2.inputs[2])
_nnt.links.new(_nmix2.outputs[0], _nmix_edge.inputs[1])
parts.append(blob("jerry_nucleus", 48 - 17, 52 - 17, 34, 34, m_nuc, depth=0.03, squash=0.8))

# ---------- vesicles: white-mint / white-pink ----------
m_va = gradient_emit_mat("m_jerry_vesicle_a", (0.6, 1.0, 0.9), (0.15, 0.85, 0.65), 2.2)
m_vb = gradient_emit_mat("m_jerry_vesicle_b", (1.0, 0.65, 0.85), (0.85, 0.15, 0.55), 2.0)
parts.append(blob("jerry_vesicle_a", 26, 30, 12, 12, m_va, depth=-0.07))
parts.append(blob("jerry_vesicle_b", 68, 63, 10, 10, m_vb, depth=0.06))

# ---------- filament haze: big faint wispy blob ----------
m_fil = emit_mat("m_jerry_filament", (0.56, 1.0, 0.88), 0.5, alpha=0.06)
parts.append(blob("jerry_filament", 21, 21, 58, 58, m_fil, depth=0.0, squash=0.45))

# ---------- mitochondria: gold -> pink -> purple ----------
m_mito = gradient_emit_mat("m_jerry_mito", (1.0, 0.5, 0.08), (0.28, 0.12, 1.0), 2.2)
parts.append(blob("jerry_mito_a", 18, 55, 23, 12, m_mito, depth=-0.05, rot_deg=28))
parts.append(blob("jerry_mito_b", 58, 22, 20 * 0.82, 10 * 0.82, m_mito, depth=0.08, rot_deg=-34))
parts.append(blob("jerry_mito_c", 61, 73, 17 * 0.7, 9 * 0.7, m_mito, depth=-0.08, rot_deg=14))

# ---------- golgi: stack of 4 thin arcs (mint/cyan/purple/pink) ----------
golgi_colors = [(0.4, 1.0, 0.6), (0.15, 0.75, 1.0), (0.4, 0.3, 1.0), (1.0, 0.25, 0.65)]
gpos = css_pos(27, 24, 25, 12, depth=-0.04)
for i, gc in enumerate(golgi_colors):
    bpy.ops.mesh.primitive_torus_add(major_radius=(12.5 - i * 1.1) / 100 * D * 0.5 + 0.02,
                                     minor_radius=0.004, major_segments=48, minor_segments=8)
    ob = bpy.context.active_object
    ob.name = f"jerry_golgi_{i}"
    ob.scale = (1, 0.55, 1)
    ob.location = gpos + Vector((0, 0, (1.5 - i) * 0.013))
    ob.rotation_euler = Euler((math.radians(78), math.radians(18), 0))
    bpy.ops.object.shade_smooth()
    setmat(ob, emit_mat(f"m_jerry_golgi_{i}", gc, 2.6))
    link(ob)
    parts.append(ob)

# ---------- ribosome cloud: cluster of tiny bright beads ----------
ribo = [((0, 0), (1.0, 0.95, 0.56)), ((7, 2), (1.0, 0.47, 0.84)), ((14, -3), (0.56, 1.0, 0.88)),
        ((21, 4), (1.0, 0.88, 0.54)), ((3, 10), (0.53, 0.85, 1.0)), ((11, 13), (1.0, 0.47, 0.84)),
        ((20, 11), (0.73, 1.0, 0.57)), ((27, 16), (0.62, 0.54, 1.0)), ((8, 22), (1.0, 0.95, 0.56)),
        ((18, 25), (0.45, 0.95, 1.0)), ((29, 28), (1.0, 0.55, 0.81))]
rbase = css_pos(35, 66, 2.4, 2.4, depth=0.04)
for i, ((ox, oy), col) in enumerate(ribo):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.008, segments=12, ring_count=8)
    ob = bpy.context.active_object
    ob.name = f"jerry_ribo_{i}"
    # box-shadow offsets were px on a tiny element; scale to ~1/3 orb %
    ob.location = rbase + Vector((ox * 0.0035, 0, -oy * 0.0035))
    bpy.ops.object.shade_smooth()
    setmat(ob, emit_mat(f"m_jerry_ribo_{i}", col, 3.2))
    link(ob)
    parts.append(ob)

# ---------- alien crystal: faceted shard, 4-color gradient ----------
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.5)
cry = bpy.context.active_object
cry.name = "jerry_crystal"
cry.scale = (11 / 100 * D * 0.5, 0.045, 15 / 100 * D * 0.5)
cry.location = css_pos(75, 43, 11, 15, depth=-0.06)
cry.rotation_euler = Euler((math.radians(12), math.radians(-25), math.radians(8)))
setmat(cry, gradient_emit_mat("m_jerry_crystal", (0.9, 1.0, 0.2), (1.0, 0.08, 0.65), 2.6))
link(cry)
parts.append(cry)

# ---------- alien seed: rainbow blob, dark pupil ----------
m_seed = gradient_emit_mat("m_jerry_seed", (1.0, 0.85, 0.05), (0.02, 1.0, 0.68), 2.4)
seed = blob("jerry_seed", 12, 35, 10, 12, m_seed, depth=0.02, rot_deg=21)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.011, segments=12, ring_count=8)
pup = bpy.context.active_object
pup.name = "jerry_seed_pupil"
pup.location = seed.location + Vector((-0.008, -0.02, 0.008))
setmat(pup, emit_mat("m_jerry_seed_pupil", (0.01, 0.02, 0.06), 0.4))
link(pup)
parts.append(pup)

# ---------- alien void: black core + purple-pink halo ring ----------
vpos = css_pos(46, 14, 11, 11, depth=0.05)
bpy.ops.mesh.primitive_uv_sphere_add(radius=11 / 100 * D * 0.5 * 0.6, segments=24, ring_count=12)
void = bpy.context.active_object
void.name = "jerry_void"
void.location = vpos
bpy.ops.object.shade_smooth()
setmat(void, emit_mat("m_jerry_void_core", (0.0, 0.0, 0.0), 0.0))
link(void)
parts.append(void)
bpy.ops.mesh.primitive_torus_add(major_radius=11 / 100 * D * 0.5 * 0.78, minor_radius=0.006,
                                 major_segments=48, minor_segments=8)
vring = bpy.context.active_object
vring.name = "jerry_void_ring"
vring.location = vpos
vring.rotation_euler = Euler((math.radians(90), 0, 0))
bpy.ops.object.shade_smooth()
setmat(vring, gradient_emit_mat("m_jerry_void_ring", (0.25, 0.12, 1.0), (1.0, 0.15, 0.62), 3.0))
link(vring)
parts.append(vring)

# ---------- dark organelles: five light-eating blobs ----------
m_dark = dark_mat("m_jerry_dark")
for nm, l, t, w, h, rot in [("a", 22, 72, 9, 7, 18), ("b", 68, 34, 8, 5, -31),
                            ("c", 39, 81, 6, 8, 42), ("d", 79, 59, 7, 5, 9),
                            ("e", 17, 20, 5, 6, -16)]:
    parts.append(blob(f"jerry_dark_{nm}", l, t, w, h, m_dark,
                      depth=(0.09 if nm in "bd" else -0.09), rot_deg=rot, squash=0.8))

# ---------- rings: three thin orbit lines ----------
# ring-a: 68% mint-white | ring-b: 54x86% gold, rot 25 | ring-c: 92% pink, rot -18
rings = [("jerry_ring_a", 1.35, 1.35, (0.5, 1.0, 0.85), 25, 2.2, 0),
         ("jerry_ring_b", 1.25, 1.75, (1.0, 0.75, 0.3), 16, 2.4, 25),
         ("jerry_ring_c", 1.7, 1.7, (1.0, 0.3, 0.55), 32, 2.0, -18)]
for nm, rw, rh, col, _, estr, tilt in rings:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.0015,
                                     major_segments=96, minor_segments=8)
    ob = bpy.context.active_object
    ob.name = nm
    ob.scale = (rw * D, rh * D, 1)
    ob.location = Vector((0, 0, 0))
    # rings face the camera (torus lies in XY; rotate to XZ) then screen-tilt
    ob.rotation_euler = Euler((math.radians(90), math.radians(-tilt), 0))
    bpy.ops.object.shade_smooth()
    setmat(ob, emit_mat(f"m_{nm}", col, estr))
    link(ob)
    parts.append(ob)

# ---------- parent everything to root, move root into place ----------
for ob in parts:
    ob.parent = root

# aim Jerry's local frame at the camera so the CSS face reads correctly:
# local -y should point toward the camera
to_cam = (cm.translation - JERRY).normalized()
root.rotation_euler = (-to_cam).to_track_quat('Y', 'Z').to_euler()

# ---------- render ----------
sc.render.resolution_percentage = 50
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\jerry-lookdev13.png"
bpy.ops.wm.save_as_mainfile(filepath=r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\pelagic-jerry.blend")
bpy.ops.render.render(write_still=True)
print("JERRY_BUILD_DONE parts=%d" % len(parts))
