import bpy, math
from mathutils import Vector

sc = bpy.context.scene

# ---- report / rebuild lights + camera if missing ----
def ensure(name, maker):
    if name not in bpy.data.objects:
        maker()
        return f"{name}: created"
    return f"{name}: present"

log = []

def mk_sun():
    sun = bpy.data.lights.new("L_sun", 'SUN')
    sun.color = (0.35, 0.65, 0.85); sun.energy = 0.8; sun.angle = math.radians(15)
    ob = bpy.data.objects.new("L_sun", sun)
    ob.rotation_euler = (math.radians(18), math.radians(-8), 0)
    sc.collection.objects.link(ob)
log.append(ensure("L_sun", mk_sun))

def mk_shaft(i, x, y, en):
    def f():
        sp = bpy.data.lights.new(f"L_shaft_{i}", 'SPOT')
        sp.color = (0.30, 0.60, 0.80); sp.energy = en
        sp.spot_size = math.radians(28); sp.spot_blend = 0.6; sp.shadow_soft_size = 1.0
        o = bpy.data.objects.new(f"L_shaft_{i}", sp)
        o.location = (x, y, 22)
        o.rotation_euler = (math.radians(6*(i*2-1)), 0, 0)
        sc.collection.objects.link(o)
    return f
log.append(ensure("L_shaft_0", mk_shaft(0, -5, -3, 900)))
log.append(ensure("L_shaft_1", mk_shaft(1, 6, 1, 700)))

def mk_cam():
    cam_data = bpy.data.cameras.new("Cam"); cam_data.lens = 32
    cam = bpy.data.objects.new("Cam", cam_data)
    cam.location = (0.4, -14.5, 5.0)
    sc.collection.objects.link(cam)
    d = (Vector((0, 0, 2.6)) - cam.location).normalized()
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
log.append(ensure("Cam", mk_cam))
sc.camera = bpy.data.objects["Cam"]

# ---- compositor bloom ----
ng = bpy.data.node_groups.get("PelagicComp")
if ng is None:
    ng = bpy.data.node_groups.new("PelagicComp", 'CompositorNodeTree')
    ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new("CompositorNodeRLayers")
    g = ng.nodes.new("CompositorNodeGlare")
    out = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs['Image'], g.inputs['Image'])
    ng.links.new(g.outputs['Image'], out.inputs['Image'])
    log.append("PelagicComp: created")
else:
    g = next(n for n in ng.nodes if n.bl_idname == "CompositorNodeGlare")
    log.append("PelagicComp: present")
sc.compositing_node_group = ng
g.inputs['Type'].default_value = 'Bloom'
g.inputs['Threshold'].default_value = 1.1
g.inputs['Strength'].default_value = 1.0
g.inputs['Size'].default_value = 0.55

# ---- volumetrics sanity (in case these were also lost) ----
sc.eevee.volumetric_start = 0.5
sc.eevee.volumetric_end = 120.0

print("STATE: " + " | ".join(log))

sc.render.resolution_percentage = 40
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
