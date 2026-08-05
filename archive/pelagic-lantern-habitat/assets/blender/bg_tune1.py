import bpy, math
from mathutils import Vector

sc = bpy.context.scene

# ---- tame the warm blowout ----
for ob in bpy.data.objects:
    if ob.name.startswith("L_win_"):
        ob.data.energy *= 0.28          # 220 -> ~60
        ob.data.shadow_soft_size = 0.25

m = bpy.data.materials.get("m_glow")
b = m.node_tree.nodes["Principled BSDF"]
b.inputs['Emission Strength'].default_value = 6.5   # was 14

mb = bpy.data.materials.get("m_beacon")
mb.node_tree.nodes["Principled BSDF"].inputs['Emission Strength'].default_value = 18

# ---- deep-water feel: bluer, denser haze, brighter upper gradient ----
w = sc.world.node_tree
ramp = next(n for n in w.nodes if n.bl_idname == "ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.002, 0.010, 0.024, 1)
ramp.color_ramp.elements[1].color = (0.020, 0.110, 0.180, 1)
vol = next(n for n in w.nodes if n.bl_idname == "ShaderNodeVolumePrincipled")
vol.inputs['Color'].default_value = (0.04, 0.16, 0.24, 1)
vol.inputs['Density'].default_value = 0.028

# ---- blue rim light to carve the hull silhouette ----
if "L_rim" not in bpy.data.objects:
    rim = bpy.data.lights.new("L_rim", 'AREA')
    rim.color = (0.25, 0.60, 0.90)
    rim.energy = 500
    rim.size = 6
    ob = bpy.data.objects.new("L_rim", rim)
    ob.location = (-4, 5, 8)   # behind-left, above
    d = (Vector((0, 0, 2.4)) - ob.location).normalized()
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.collection.objects.link(ob)

# ---- tighter bloom ----
ng = bpy.data.node_groups["PelagicComp"]
g = next(n for n in ng.nodes if n.bl_idname == "CompositorNodeGlare")
g.inputs['Threshold'].default_value = 1.6
g.inputs['Strength'].default_value = 0.65
g.inputs['Size'].default_value = 0.38

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render2.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
