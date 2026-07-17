# Changelog — The Dead Letter Office

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-17 — claude-fable (with James, Meshy postmaster night)

- First Meshy character experiment, and it landed: a full 3D postmaster generated from the
  GPT concept art (`assets/ref/Normal.png`, cursor patched out — the blocky MPFB2 model was
  deliberately NOT used as input in any form). Meshy-6 image-to-3D + PBR (30cr), rigged (5cr),
  16 library animations (48cr). ~83 credits total, balance 997. All assets in
  `tmp/dead-letter-office/meshy/`: static + rigged GLBs, walk/run, 16 animation GLBs, and a
  consolidated 1.2MB `anims/postmaster-anim-pack.glb` (all 18 clips, NLA-track export).
- Face expression system, zero credits: eyes located in two rotated UV islands of the texture
  atlas (face-up = +X in both), four hand-painted variants (blink / wide / eye-roll / half-lid)
  verified via headless Blender face renders — all first-try. `meshy/faces/*.jpg`.
- Test viewer at `tmp/dead-letter-office/meshy/viewer.html` (served): postmaster standing IN
  the layered concept art (room/basket/desk depth planes), scene-matched lighting, drag/turntable,
  idle/walk/run modes, auto-fidget mode, 13 one-shot buttons, 4 face buttons, auto-blink.
- Known issues for next session: (1) he pops ~8% bigger during idle than other clips — suspect
  stale scale/root tracks differing between clips in the pack; inspect pack JSON, likely strip
  scale tracks. (2) Most library one-shots read tiny/mushy (facepalm can't reach face, bow ~3°,
  alert nothing) — leading suspicion is Meshy's retarget collapsing big gestures onto his stocky
  proportions; verify by rendering the raw withSkin GLBs directly vs the pack, compare with
  Meshy's own previews, and hand-animate replacements in Blender where needed.
- Where things stand: experiment declared a smashing success by James. Next: fix the two anim
  issues, audition/replace weak clips one by one, then the bigger arc — 3D room/desk treatment,
  his comings and goings, real letter content, letters physically filling the basket, and a
  furnace-feeding routine for the overflow.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-12 — claude-fable (later session, "do everything" batch)

- Asset-library check: only the default (empty, nonexistent) user library is configured —
  clutter stays scripted primitives in the house style.
- Dingy pass (all headless): noise-driven grime mixes injected into dlo_wall/wall_l/floor/
  ceil/wood/rug materials (world-position noise, height-faded on walls), bulb dimmed and
  ambered, plant killed (drooped sickly leaves), poster yellowed and tilted 3°. Clutter:
  twine-tied letter bundles on two shelves, ink bottle + lid on the desk, leaning carton
  stack right of frame, four more stray floor papers, two crumpled balls (`npm3_*`).
- Basket-front occluder: cage + rim bisected at y=2.7 via bmesh bisect_plane into back
  halves (stay in the plate) and `*_front` duplicates (hidden from the plate). Front set +
  DEAD LETTERS placard rendered film_transparent → `assets/room/basket-front.png`
  (crop px 81, 720, 485x354). world.js overlays it as a fixed img at z-index 5 — above the
  mail layer (z 3) — so envelopes visibly sink into the cage. Plate has no front wires,
  so no doubling and no compositor-seam risk. Sink deepened (0.45 → 1.35 envelope
  heights past the rim) and sink fade eased (0.4 → 0.22) to use the new depth.
- Base plate + all five pose crops re-rendered under the new light (same crop rect, so
  world.js constants held).
- Envelope restyle: pixel-art hard border/offset-shadow/pixelated swapped for soft
  1px border, warm graded paper, blurred drop shadow, soft creases; far/mid depth
  rows now also get a touch of blur.
- First sound in this world: `assets/audio/stamp-thunk.mp3` (ElevenLabs sfx, authoring
  pipeline). Plays on the stamp-down pose frame, routed through the shared
  ElasticSoundControl (zero-volume probe in start() so the control only reads "on"
  when audio will actually be heard).
- Postmaster material: +6 ambient lines, +4 click lines, shift lines extended to 30/45/60
  minutes; four melancholy ambient lines now trigger the sigh pose when spoken.
- Where things stand: **full batch awaiting James's eyeball** (dinge level, occluder
  alignment, envelope look, thunk volume are the judgement calls).

## 2026-07-12 — claude-fable (later session)

- MPFB Postmaster moved to the desk, posed, and animated. All work headless
  (`blender --background` on `tmp/dead-letter-office/dlo-room.blend`); the live instance
  was never touched.
- Rig work: head props (`NPM_head_anchor`) and both eyeballs bone-parented to `head`,
  clothing anchor to `spine01` (keep-world-matrix parenting — no tail-offset surprises).
  Old primitive `pm_*` figure hidden from render everywhere (kept in the file).
- Placement: rig at (-1.7, 1.58, 0), rotated 180° (MPFB rest faces -Y), scaled 1.26 —
  the room is theatrical scale (desk top at 1.22 m) and at human 1.68 m he read as a doll.
- Pose: forearms-on-desk idle. Guessed euler angles failed (jazz hands); the fix was
  world-axis aiming helpers that measure a bone segment's current direction and rotate
  by the delta. White shirt sleeves + cuffs added as cylinders along the posed arm
  bones, bone-parented so they follow every pose.
- Portrait rig (PM_PortraitCam, PM_Key/Fill/Rim) deleted; render restored to 1920x1080.
  New base plate rendered → `assets/room/room-render.png`; blend re-copied to assets.
- Animation: five pose plates rendered from one pixel-aligned border crop
  (px 1209, 454, 206x279 of the plate): idle, sort (letter to face — letter and stamp
  props live in the blend, parented to the wrists), stamp-up, stamp-down, sigh.
  Since EEVEE is deterministic, the crops match the plate exactly outside the figure.
- world.js: pose plates load as fixed-position imgs glued to the plate's cover-fit rect
  (idle always shown, action plates paint over it); the existing 140 ms `pmStep` tick now
  drives a weighted pose scheduler in render mode (sort/stamp-thump/sigh every 7–16 s,
  respects reduced motion); clicking him triggers the sort pose alongside his line.
  Click hotspot re-measured: x 0.6439, y 0.4449, w 0.0792, h 0.208.
- Verification: `node --check` clean; browser QA blocked — the dev server died
  mid-session (blank tab), so the pose swap has not been watched live yet.
- James's live QA, two fixes: (1) fluorescent tube-flicker overlay removed outright
  (".flicker" div + CSS animation, from the original build — "makes me feel like I'm
  gonna have a seizure"); (2) flickering rectangle around the postmaster — the pose
  crops were separate <img> layers scaled by the compositor while the plate under them
  is scaled by canvas drawImage, so the crop boundary ghosted at any viewport ≠ 1:1.
  Poses now draw straight onto the room canvas with the same scaler (consecutive crops
  share one opaque rect, so each draw fully covers the last; layout re-draws via
  SCENE.plate* + drawPmPose()). No more overlay DOM at all.
- Where things stand: **posed and animated, pending James's eyeball.** Possible next:
  stamp thunk one-shot (ElevenLabs), basket-front occluder plate, envelope CSS restyle
  to match the render.

## 2026-07-12 — claude-fable

- Started the realistic 3D Postmaster to replace the primitive one (target: the GPT pixel-art
  reference — warm sturdy old fellow, walrus mustache, round specs, cap with badge). Built with
  MPFB2 (installed from extensions.blender.org; CC0 output): aged macro body, 13 face targets
  (eye bags, jowls, broad nose), MPFB v2 skin shader with bundled textures, placed eyeballs.
- Lost mid-portrait: another Claude session opened its own .blend in the shared live Blender
  instance, closing the unsaved scene. Nothing on disk was harmed.
- Full rebuild is scripted: `assets/room/build-postmaster-mpfb.py` (run inside an open
  dlo-room.blend, live or headless; never opens/saves files itself). Header documents where the
  build left off and what comes next.
- Replay succeeded once the live instance freed up (one Blender crash mid-render along the way;
  the save-after-every-call habit meant zero loss). Character now fully built and dressed in
  `tmp/dead-letter-office/dlo-room.blend`, standing at (20, 0, 0) outside the room:
  - Head: cap/badge/specs/brows/mustache/beard cloned from the primitive postmaster (`npm_*`
    objects) and refit at 0.48 scale. Mustache placement only worked after querying the `lips`
    vertex-group bounds — his lips protrude to y -0.149, further than any eyeballed guess.
  - Body: James rejected the solid vest slab ("umpire's breastplate") and box hips ("fupa like
    a cinder block"). Redesign: white shirt block is the chest, vest is two front strips + side
    + back panels (open-vest look per the GPT reference), untucked shirt hem, slim trousers.
    Body itself reshaped via targets: stomach zeroed, hips/glutes/thighs slimmed.
  - James's verdict: "still very blocky... but acceptable. He looks appropriate for the room."
- Blend saved and re-copied to `assets/room/dlo-room.blend` (3.4 MB). Portrait rig
  (`PM_PortraitCam`, `PM_Key/Fill/Rim` lights) still in the file for next session's pose work.
- Where things stand: **dressed, unposed.** Next: move to desk, hide old `pm_*` figure, desk
  pose (forearms on desk), white sleeves + cuffs on the posed arms, eyes parented to head bone
  (watch the bone-tail offset gotcha), delete portrait rig, restore render res to 1920x1080
  (currently 640x800), plate render, re-measure hotspot NDC bbox for world.js.

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
