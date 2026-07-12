# Changelog — The Dead Letter Office

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-11 — claude-fable

- Sped up the mail at James's request ("its painful"): envelope fall speed ~2.5x (base 11–24 → 28–60 px/s
  before depth scaling), basket-sink floor 55 → 90 px/s, spawn gap 3.5–9s → 1.8–4.6s so the room
  stays populated at the faster clearance rate.
- Blender-rendered room backdrop (James approved the still; GPT reference image as target).
  Fully scripted scene via Blender MCP — `assets/room/dlo-room.blend` is the editable source,
  `room-render.png` the pixelated runtime plate (4x downres, Bayer dither, green grade, vignette),
  `room-clean-source.png` the ungraded render (not loaded by the page).
- `USE_ROOM_RENDER` flag in world.js draws the plate over the painted room and retargets mail
  physics at the rendered basket; painted-canvas code intact beneath — flip the flag to revert.
  Painted basket/desk overlay canvases hidden in render mode.
- James's verdict on the pixelation pass: too grainy (Bayer dither on smooth gradients + non-integer
  scaling moiré). **Decision: ship the clean render.** Re-rendered at native 1920x1080, no post;
  `room-render.png` replaced, redundant `room-clean-source.png` dropped, .blend updated in assets.
- Render mode now sizes the canvas 1:1 with the viewport (no DETAIL-grid resample), draws cover-fit
  (odd aspects crop, not distort), `image-rendering: auto`. Basket target: cx 19%, rim 64% of the
  drawn plate. Pixel-art postmaster hidden and `speak()` muted until his 3D replacement exists.
- 3D Postmaster built and shipped (James approved the room, asked for the postmaster next).
  Chunky low-poly figure from scripted primitives: cap + brass badge, round specs, mustache over
  grey beard, slate vest, red tie, sleeves leaning on the desk. Debug lessons preserved for
  posterity: `primitive_cube_add(size=1)` is a 1m edge (half my assumed size — the "exploded
  boxes" bug), and he was invisible at first because he stood exactly behind the banker's lamp.
  Portrait camera workflow (temp cam, deleted after) was the breakthrough for iterating his face.
- He is baked into `room-render.png` (scene lighting + contact shadows for free; new
  `light_deskbulb` warms the desk corner). His old canvas is now a transparent click hotspot at
  his rendered bbox (Blender NDC-measured: x 0.630–0.737, y 0.410–0.635 of the plate);
  click-to-speak works, bubble anchored above his cap. Punch clock moved to top-left wall,
  counter-style. Pixel-art painter code all intact behind `USE_ROOM_RENDER`.
- Arms de-jacked per James ("he's like jacked"): slimmer shoulder slab, thinner arms hung more
  vertically, smaller cuffs/hands. Pose rig added while in there: `PM_shoulder_l/r` and
  `PM_head_root` pivot empties (pose = rotate a pivot, no remodeling), plus hidden props
  `pm_prop_letter` and `pm_prop_stamp` for future pose plates. One more transform lesson logged:
  re-parenting under a fresh empty needs explicit local transforms (or a depsgraph update first)
  — his head briefly migrated to the ceiling.
- Fixed-arms render deployed as `room-render.png`; blend re-copied. Basket occluder parts
  identified for next time: `basket_cage`, `basket_rim`, `basket_sign` (+`_l1/_l2` lines).
- Where things stand: **draft.** Rendered room + slim-armed postmaster live; session wrapped
  mid-pose-work at James's request. Next, in order: (1) pose plates via render-border crops
  (region x 0.56–0.82, screen-y 0.32–0.72; sort/stamp/sigh + idle base) swapped over the plate in
  `USE_ROOM_RENDER` mode; (2) transparent basket-front occluder plate (film_transparent, front
  wires + placard only, overlay img at z-index 5); (3) envelope CSS restyle to match the render.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history and `world.json`.
- Where things stand: **status `draft` — awaiting James's approval for publication.** No pending
  working-tree changes.

## 2026-07-04 — interaction expansion (commit bb868ab, "Expand Dead Letter Office interactions")

- Postmaster sprite added: idle animations plus timed commentary.
- All mail now lands in the UNSORTED basket.
- Punch clock added; tracks visit time.

## 2026-07-04 — created (claude-fable with James; manifest createdAt ~02:50Z, in launch commit 97499fe)

- World created: undeliverable mail drifts down through lamplight; opened letters can be read.
- Letters are authored, not generated. Pixel-art and typography-forward night office. No sound.
- Exits: four ink-blue return addresses use shared random drift.

## Standing guidance

1. Draft until James approves publication.
2. Letters stay authored — resist the urge to generate them.
