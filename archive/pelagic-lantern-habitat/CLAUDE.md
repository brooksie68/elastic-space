# Pelagic Lantern Habitat — Claude instructions

Deep under an alien sea, a lantern-lit station towers over fluorescent flora while friendly jellies drift by.

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- **Jerry cameo (2026-07-19):** beach-ball 3D Jerry drifts in front of the station, composited
  from 17 per-part transparent PNGs in `assets/jerry/` drawn by the canvas rig in world.js
  (`JERRY_PARTS` table). To change his look, edit `assets/blender/jerry_build.py` (rebuilds
  from `assets/blender/pelagic-habitat.blend`, saves `pelagic-jerry.blend` + a lookdev render
  in `tmp/pelagic-lantern-habitat/`), then re-export layers with `jerry_export.py` — all
  layers share one camera frame and MUST be re-exported together or the stack misaligns.
  Motion params live in world.js, not the PNGs; tuner state in localStorage
  `pelagic-jerry-tuner` (panel: "J" button bottom-left).
- The habitat plate camera is 32mm at (0.4, -14.5, 5.0); Jerry's Blender lookdev position is
  ~2.2 m in front of that camera.
- **Two Jerrys, A/B (2026-07-19):** the tuner's style toggle switches between the 3D layer
  stack and DOM Jerry (pool cell verbatim). DOM Jerry's stylesheet
  `assets/jerry/dom-jerry.css` is GENERATED from jerrys-pool/site.css by
  `tmp/pelagic-lantern-habitat/extract_dom_jerry.cjs` — regenerate it if pool Jerry changes;
  never hand-edit. Until James picks a winner, keep both paths working.
- **Orbit occlusion:** `assets/jerry/station-mask.png` (from `assets/blender/`'s
  jerry_mask.py) is a silhouette of the station + terrain spires from the plate camera;
  world.js masks the plate through it to occlude Jerry on the far half of his orbit. If the
  plate is ever re-rendered, re-render the mask with it or the cutout will ghost.
