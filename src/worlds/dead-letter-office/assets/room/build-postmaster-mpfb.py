# Rebuild the MPFB2 Dead Letter Postmaster (body + face + skin + eyes).
#
# Replay script for the character approved-in-progress on 2026-07-12, after the
# live Blender session was switched out from under it. Run it INSIDE Blender
# with dlo-room.blend already open — it never opens or saves files itself.
#   - Live session:  paste into the Script editor or run via Blender MCP
#     execute_blender_code once the shared instance is free.
#   - Headless:      blender dlo-room.blend --python build-postmaster-mpfb.py
#     (then save explicitly), or via the MCP *_for_cli tools.
#
# Requires the MPFB extension (blender_org repo, id "mpfb"), Blender 4.2+.
# Everything MPFB outputs is CC0.
#
# Where this left off: face approved direction (aged, eye bags, broad nose,
# jowls), MPFB v2 skin working, eyeballs placed with iris discs at the sphere
# surface. Next steps after replay: mustache/beard, cap + specs + vest refit
# from the primitive postmaster, desk pose, plate re-render at 1920x1080.

import bpy
import math
import os
from mathutils import Vector

from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.services.materialservice import MaterialService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService

BODY_NAME = "Postmaster_MPFB"
RIG_NAME = "Postmaster_MPFB.rig"
# park him outside the room; posing/placement at the desk is a later step
RIG_LOCATION = (20.0, 0.0, 0.0)

# sturdy old postmaster: male, old, a little heavy, not muscular
MACRO = {"gender": 1.0, "age": 0.85, "muscle": 0.35, "weight": 0.62,
         "height": 0.45, "proportions": 0.5}

# face character: heavy eye bags, jowls, broad nose, rounder softer head
TARGETS = {
    "nose/nose-scale-horiz-incr": 0.45,
    "nose/nose-base-down": 0.3,
    "cheek/l-cheek-bones-decr": 0.3,
    "cheek/r-cheek-bones-decr": 0.3,
    "chin/chin-jaw-drop-incr": 0.35,
    "head/head-age-incr": 0.5,
    "head/head-scale-horiz-incr": 0.25,
    "mouth/mouth-scale-horiz-decr": 0.2,
    "eyes/l-eye-bag-incr": 0.5,
    "eyes/r-eye-bag-incr": 0.5,
    "forehead/forehead-scale-vert-incr": 0.2,
    "torso/torso-vshape-decr": 0.3,
    "stomach/stomach-pregnant-incr": 0.25,
}

EYE_RADIUS = 0.0135          # base sphere radius before per-socket scaling
EYE_SOCKET_FIT = 0.85        # eyeball radius as fraction of socket helper radius
IRIS_LOCAL_Y = -0.01365      # just proud of the sphere surface, else invisible


def build():
    assert bpy.data.objects.get(BODY_NAME) is None, f"{BODY_NAME} already exists"

    # --- body -------------------------------------------------------------
    # macro dict MUST start from the full default dict: a partial dict
    # KeyErrors on "race" AFTER creating a stray mesh
    macro = TargetService.get_default_macro_info_dict()
    macro.update(MACRO)
    body = HumanService.create_human(macro_detail_dict=macro)
    body.name = BODY_NAME

    # --- face/build targets -----------------------------------------------
    tdir = LocationService.get_mpfb_data("targets")
    for rel, weight in TARGETS.items():
        path = os.path.join(tdir, rel.replace("/", os.sep) + ".target.gz")
        if not os.path.exists(path):
            alt = path[: -len(".gz")]
            path = alt if os.path.exists(alt) else None
        if path:
            TargetService.load_target(body, path, weight=weight)
        else:
            print("MISSING TARGET:", rel)

    # --- rig (parents the mesh to the armature) ----------------------------
    rig = HumanService.add_builtin_rig(body, "default", import_weights=True)
    rig.name = RIG_NAME
    rig.location = RIG_LOCATION
    body.location = (0, 0, 0)

    # --- skin: MPFB v2 material with bundled face/body textures ------------
    body.data.materials.clear()
    MaterialService.create_v2_skin_material("PM_SkinV2", body)

    # --- eyeballs: spheres centered on the helper-eye vertex groups --------
    # helper verts are removed by the "Hide helpers" MASK modifier, so
    # disable masks while sampling the evaluated mesh
    mask_state = [(m, m.show_viewport) for m in body.modifiers if m.type == 'MASK']
    for m, _ in mask_state:
        m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = body.evaluated_get(dg).to_mesh()
    sockets = {}
    for gname in ("helper-l-eye", "helper-r-eye"):
        gi = body.vertex_groups[gname].index
        pts = [body.matrix_world @ v.co for v in mesh.vertices
               for g in v.groups if g.group == gi and g.weight > 0.5]
        center = sum(pts, Vector()) / len(pts)
        radius = max((p - center).length for p in pts)
        sockets[gname] = (center, radius)
    body.evaluated_get(dg).to_mesh_clear()
    for m, state in mask_state:
        m.show_viewport = state

    sclera = bpy.data.materials.get("PM_Sclera") or bpy.data.materials.new("PM_Sclera")
    sclera.use_nodes = True
    s = sclera.node_tree.nodes["Principled BSDF"]
    s.inputs["Base Color"].default_value = (0.9, 0.87, 0.84, 1)
    s.inputs["Roughness"].default_value = 0.15
    iris_mat = bpy.data.materials.get("PM_Iris") or bpy.data.materials.new("PM_Iris")
    iris_mat.use_nodes = True
    i = iris_mat.node_tree.nodes["Principled BSDF"]
    i.inputs["Base Color"].default_value = (0.12, 0.16, 0.2, 1)
    i.inputs["Roughness"].default_value = 0.25

    for gname, side in (("helper-l-eye", "L"), ("helper-r-eye", "R")):
        center, radius = sockets[gname]
        bpy.ops.mesh.primitive_uv_sphere_add(radius=EYE_RADIUS, segments=24, ring_count=16)
        eye = bpy.context.active_object
        eye.name = f"PM_Eye_{side}"
        bpy.ops.object.shade_smooth()
        eye.data.materials.append(sclera)
        bpy.ops.mesh.primitive_circle_add(radius=0.006, fill_type='NGON')
        iris = bpy.context.active_object
        iris.name = f"PM_Iris_{side}"
        iris.data.materials.append(iris_mat)
        iris.parent = eye
        iris.location = (0, IRIS_LOCAL_Y, 0)
        iris.rotation_euler = (math.radians(90), 0, 0)
        scale = (radius * EYE_SOCKET_FIT) / EYE_RADIUS
        eye.scale = (scale, scale, scale)
        eye.location = center
        # TODO when posing: parent eyes to the rig's head bone, preserving
        # world transform (bone parenting offsets by the bone tail — verify
        # placement after, this bit us once already)

    print("Postmaster rebuilt:", body.name, rig.name)
    return body, rig


if __name__ == "__main__":
    build()
