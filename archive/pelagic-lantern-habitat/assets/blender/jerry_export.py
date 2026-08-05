"""Export Jerry as per-part transparent layers for the canvas rig.

Loads pelagic-jerry.blend (already built by jerry_build.py), aims a dedicated
square camera at Jerry, hides all non-Jerry geometry (lights stay on so his
lighting matches the plate), disables the water fog (the world supplies its
own water), and renders one PNG per animatable part. All layers share the
same camera so they composite pixel-aligned in canvas.

Run: blender.exe --background pelagic-jerry.blend --python jerry_export.py
"""
import bpy, math
from mathutils import Vector

OUT = r"C:\Users\brook\ai-projects\elastic-space\src\worlds\pelagic-lantern-habitat\assets\jerry"
import os
os.makedirs(OUT, exist_ok=True)

sc = bpy.context.scene

# ---------- layer groups: name -> object-name prefixes ----------
LAYERS = {
    "aura":      ["jerry_aura"],
    "goo":       ["jerry_membrane", "jerry_wall", "jerry_filament"],
    "nucleus":   ["jerry_nucleus"],
    "vesicle-a": ["jerry_vesicle_a"],
    "vesicle-b": ["jerry_vesicle_b"],
    "mito-a":    ["jerry_mito_a"],
    "mito-b":    ["jerry_mito_b"],
    "mito-c":    ["jerry_mito_c"],
    "golgi":     ["jerry_golgi_"],
    "ribo":      ["jerry_ribo_"],
    "crystal":   ["jerry_crystal"],
    "seed":      ["jerry_seed"],          # includes pupil
    "void":      ["jerry_void"],          # includes halo ring
    "dark":      ["jerry_dark_"],
}
ALL_JERRY_PREFIXES = [p for ps in LAYERS.values() for p in ps]

def is_jerry_mesh(ob):
    return ob.type == 'MESH' and any(ob.name.startswith(p) for p in ALL_JERRY_PREFIXES)

root = bpy.data.objects["jerry_root"]

# ---------- dedicated export camera ----------
cam0 = bpy.data.objects["Cam"]
camd = bpy.data.cameras.new("JerryCamData")
jcam = bpy.data.objects.new("JerryCam", camd)
sc.collection.objects.link(jcam)
jcam.location = cam0.location
target = root.location
d = (target - jcam.location)
jcam.rotation_euler = (-d.normalized()).to_track_quat('Z', 'Y').to_euler()
# frame ~1.45 m at Jerry's distance on a 36 mm sensor
camd.lens = 36.0 * d.length / 1.45
camd.sensor_fit = 'HORIZONTAL'
sc.camera = jcam

# ---------- render setup ----------
sc.render.resolution_x = 1152
sc.render.resolution_y = 1152
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.eevee.taa_render_samples = 96
# Standard, not AgX: keep the organs' chroma (pool-Jerry vibrancy);
# the plate behind stays AgX, the contrast is the point
sc.view_settings.view_transform = 'Standard'

# water fog off: the live world supplies its own water behind the layers
w = sc.world
if w and w.use_nodes:
    outn = next(n for n in w.node_tree.nodes if n.type == 'OUTPUT_WORLD')
    for lk in list(w.node_tree.links):
        if lk.to_node == outn and lk.to_socket.name == 'Volume':
            w.node_tree.links.remove(lk)

# hide every non-Jerry mesh; keep all lights (station warm spill included)
for ob in sc.objects:
    if ob.type == 'MESH' and not is_jerry_mesh(ob):
        ob.hide_render = True

lamp = bpy.data.objects.get("L_jerry")
if lamp:
    lamp.data.energy = 6.0

jerry_meshes = [ob for ob in sc.objects if is_jerry_mesh(ob)]

# ---------- passes ----------
for layer, prefixes in LAYERS.items():
    for ob in jerry_meshes:
        ob.hide_render = not any(ob.name.startswith(p) for p in prefixes)
    # exclusions: seed prefix also matches nothing else; void prefix ok
    sc.render.filepath = os.path.join(OUT, f"{layer}.png")
    bpy.ops.render.render(write_still=True)
    print(f"LAYER_DONE {layer}")

print("EXPORT_DONE")
