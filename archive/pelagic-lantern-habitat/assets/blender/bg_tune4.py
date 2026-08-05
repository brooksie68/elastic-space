import bpy, math

sc = bpy.context.scene

# ---- god rays: normalize fade along cone height, make them whisper-subtle ----
m_ray = bpy.data.materials["m_godray"]
nt = m_ray.node_tree
mapping = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeMapping")
# object Z runs -13..+13 (cone height 26); rotate put it on gradient X.
# normalize: x' = z/26 + 0.5  -> 0 at bottom, 1 at top
mapping.inputs['Scale'].default_value[0] = 1.0/26.0
mapping.inputs['Location'].default_value[0] = 0.5
ramp2 = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeValToRGB")
ramp2.color_ramp.elements[0].position = 0.05
ramp2.color_ramp.elements[0].color = (0, 0, 0, 1)
ramp2.color_ramp.elements[1].position = 0.9
ramp2.color_ramp.elements[1].color = (0.05, 0.05, 0.05, 1)   # max 5% mix
emit = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeEmission")
emit.inputs['Strength'].default_value = 0.5

# ---- water back to deep: darker sky ramp, thinner haze ----
w = sc.world.node_tree
ramp = next(n for n in w.nodes if n.bl_idname == "ShaderNodeValToRGB")
ramp.color_ramp.elements[1].color = (0.018, 0.100, 0.170, 1)
vol = next(n for n in w.nodes if n.bl_idname == "ShaderNodeVolumePrincipled")
vol.inputs['Density'].default_value = 0.016

# ---- shadow pool overflow: flora + window lights don't need shadows ----
for ob in sc.objects:
    if ob.type == 'LIGHT' and ob.name.startswith(("L_flora_", "L_win_", "L_beacon")):
        ob.data.use_shadow = False
try:
    sc.eevee.shadow_pool_size = '1024'
except Exception as e:
    print("pool:", e)

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render5.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
