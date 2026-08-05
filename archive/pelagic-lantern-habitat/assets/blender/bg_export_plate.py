import bpy, os

sc = bpy.context.scene
out = r"C:\Users\brook\ai-projects\elastic-space\src\worlds\pelagic-lantern-habitat\assets"
os.makedirs(out, exist_ok=True)
sc.render.resolution_percentage = 100
sc.eevee.taa_render_samples = 128
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 92
sc.render.filepath = os.path.join(out, "habitat-plate.jpg")
bpy.ops.render.render(write_still=True)
print("EXPORT_DONE", sc.render.filepath)
