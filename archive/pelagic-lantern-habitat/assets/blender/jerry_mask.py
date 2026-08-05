"""Render the station silhouette mask (alpha = station pixels) from the plate
camera. The world masks the plate through it to build a perfect station cutout
that occludes Jerry when his orbit takes him behind the habitat.

Run: blender.exe --background pelagic-jerry.blend --python jerry_mask.py
"""
import bpy

sc = bpy.context.scene
STATION_PREFIXES = ("hab_", "win_", "spire")

# flat white emission override
white = bpy.data.materials.new("m_mask_white")
white.use_nodes = True
nt = white.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (1, 1, 1, 1)
em.inputs["Strength"].default_value = 1.0
nt.links.new(em.outputs[0], out.inputs[0])

for ob in sc.objects:
    if ob.type == 'MESH':
        if ob.name.startswith(STATION_PREFIXES):
            ob.hide_render = False
            ob.data.materials.clear()
            ob.data.materials.append(white)
        else:
            ob.hide_render = True
    elif ob.type == 'LIGHT':
        ob.hide_render = True

# no fog, transparent film, plate camera and aspect
w = sc.world
if w and w.use_nodes:
    outn = next(n for n in w.node_tree.nodes if n.type == 'OUTPUT_WORLD')
    for lk in list(w.node_tree.links):
        if lk.to_node == outn and lk.to_socket.name == 'Volume':
            w.node_tree.links.remove(lk)

sc.camera = bpy.data.objects["Cam"]
sc.render.resolution_x = 1280
sc.render.resolution_y = 720
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.eevee.taa_render_samples = 32
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\src\worlds\pelagic-lantern-habitat\assets\jerry\station-mask.png"
bpy.ops.render.render(write_still=True)
print("MASK_DONE")
