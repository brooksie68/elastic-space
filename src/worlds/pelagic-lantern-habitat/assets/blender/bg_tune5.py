import bpy

sc = bpy.context.scene

# remove the fake god ray cones
for ob in list(sc.objects):
    if ob.name.startswith("godray_"):
        bpy.data.objects.remove(ob, do_unlink=True)

# calm the shaft spots back to gentle floor pools
s0 = bpy.data.objects.get("L_shaft_0")
s1 = bpy.data.objects.get("L_shaft_1")
if s0: s0.data.energy = 2200
if s1: s1.data.energy = 1600

# push spires deeper for haze separation
for ob in sc.objects:
    if ob.name.startswith("spire_"):
        ob.location.y += 8

sc.render.resolution_percentage = 40
sc.render.filepath = r"C:\Users\brook\ai-projects\elastic-space\tmp\pelagic-lantern-habitat\test-render6.png"
bpy.ops.wm.save_mainfile()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
