import bpy, math, random
from mathutils import Vector

sc = bpy.context.scene
random.seed(33)

# ---- dim + thin the far glow specks ----
m_far = bpy.data.materials.new("m_farglow")
m_far.use_nodes = True
b = m_far.node_tree.nodes["Principled BSDF"]
b.inputs['Base Color'].default_value = (0.01, 0.03, 0.04, 1)
b.inputs['Emission Color'].default_value = (0.35, 0.75, 0.85, 1)
b.inputs['Emission Strength'].default_value = 2.2

fars = [o for o in sc.objects if o.name.startswith("farglow_")]
for i, ob in enumerate(fars):
    if i % 3 == 0:
        bpy.data.objects.remove(ob, do_unlink=True)
    else:
        ob.data.materials.clear()
        ob.data.materials.append(m_far)
        ob.scale = (0.7, 0.7, 0.7)

# ---- make the spires read as silhouettes ----
m_spire = bpy.data.materials.new("m_spire")
m_spire.use_nodes = True
b = m_spire.node_tree.nodes["Principled BSDF"]
b.inputs['Base Color'].default_value = (0.010, 0.020, 0.032, 1)
b.inputs['Roughness'].default_value = 0.9
for ob in sc.objects:
    if ob.name.startswith("spire_"):
        ob.data.materials.clear()
        ob.data.materials.append(m_spire)
        ob.scale.z *= 1.35

# brighten the water column behind them
w = sc.world.node_tree
ramp = next(n for n in w.nodes if n.bl_idname == "ShaderNodeValToRGB")
ramp.color_ramp.elements[1].color = (0.030, 0.150, 0.235, 1)

# ---- fake god rays: emissive translucent cones fading at both ends ----
m_ray = bpy.data.materials.new("m_godray")
m_ray.use_nodes = True
nt = m_ray.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
mix = nt.nodes.new("ShaderNodeMixShader")
trans = nt.nodes.new("ShaderNodeBsdfTransparent")
emit = nt.nodes.new("ShaderNodeEmission")
emit.inputs['Color'].default_value = (0.35, 0.65, 0.90, 1)
emit.inputs['Strength'].default_value = 0.9
texco = nt.nodes.new("ShaderNodeTexCoord")
grad = nt.nodes.new("ShaderNodeTexGradient")
mapping = nt.nodes.new("ShaderNodeMapping")
mapping.inputs['Rotation'].default_value[1] = math.radians(-90)  # along object Z
ramp2 = nt.nodes.new("ShaderNodeValToRGB")
ramp2.color_ramp.elements[0].position = 0.0
ramp2.color_ramp.elements[0].color = (0, 0, 0, 1)        # bottom fully transparent
ramp2.color_ramp.elements[1].position = 0.85
ramp2.color_ramp.elements[1].color = (0.16, 0.16, 0.16, 1)  # subtle at top
nt.links.new(texco.outputs['Object'], mapping.inputs['Vector'])
nt.links.new(mapping.outputs['Vector'], grad.inputs['Vector'])
nt.links.new(grad.outputs['Fac'], ramp2.inputs['Fac'])
nt.links.new(ramp2.outputs['Color'], mix.inputs['Fac'])
nt.links.new(trans.outputs['BSDF'], mix.inputs[1])
nt.links.new(emit.outputs['Emission'], mix.inputs[2])
nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
m_ray.surface_render_method = 'BLENDED'
m_ray.use_backface_culling = False

for i, (x, y, tilt_x, tilt_y, r_top, r_bot) in enumerate([
        (-4.5, 2.0, 8, -14, 1.2, 4.5),
        ( 2.0, 4.0, 6,  10, 1.0, 3.6),
        ( 7.5, -1.0, 10, 18, 0.8, 3.0)]):
    h = 26
    bpy.ops.mesh.primitive_cone_add(radius1=r_bot, radius2=r_top, depth=h, vertices=24,
        location=(x, y, h/2 - 2))
    ob = bpy.context.active_object; ob.name = f"godray_{i}"
    ob.rotation_euler = (math.radians(tilt_x), math.radians(tilt_y), 0)
    ob.visible_shadow = False
    ob.data.materials.append(m_ray)

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render4.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
