import bpy

sc = bpy.context.scene
sc.render.resolution_percentage = 100
sc.eevee.taa_render_samples = 128
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\plate-final.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
