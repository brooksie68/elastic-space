# The Buildings — pipeline, contract, lessons (v58, 2026-08-14/15)

The Orb Dimension's towns were "featureless Blender shapes" (James, 2026-08-14).
The fix is a fleet of ~30 real building/tech meshes, each lit the way a GPT
reference paints it, dressed with our seamless-tile library, dropped into the
towns. **building-01b is the finished reference article** — everything below is
what got it there and is the recipe for the other 29. Read this before touching
any building work; it is the single place the process lives.

## The workflow, per building (the part that has to stay EASY)

James's steps (his tools, his eye):
1. Concept: ChatGPT renders the building as a matte-gray clay model on white,
   3/4 view (prompt pack + boilerplate live in this session's chat, 2026-08-14;
   the concept PNGs are in `tmp/orb-dimension/building models/`).
2. Lit reference: drop the gray image back into ChatGPT, "give this the
   treatment" (the light plan: amber windows in arrays, cyan trim on edges/paths,
   magenta on undersides/service). Save as `renders/<name>-GPT.png` (01b's is
   `renders/example.png`). One 3/4 view is enough for round/near-symmetric
   buildings; ask for a back view too when the building is strongly asymmetric.
3. Meshy: image-to-3D from the GRAY image, **remesh OFF**, export **raw** GLB
   (5–6 M tris, ~160 MB) into `renders/<name>-highres.glb`. Do NOT use Meshy's
   remesher — at 10k/30k/50k it melts every edge; our local pipe keeps them.
4. Reads the plan, says go, flies it, dictates the viewing seat.

Claude's steps (all headless, ~1 minute per building once the guide exists):
5. **Intake:** Node weld (`decimate_bldg*.py`'s Node one-liner: hash-merge
   the triangle soup, seconds) → Blender planar dissolve + collapse to ~45k
   tris → `renders/<name>-local.glb`. Never weld in Blender (25-min hangs).
6. **Guide extraction:** `tmp/orb-dimension/guide_extract2.py` — segments the
   GPT image's lit pixels into panes, then GROUPS panes into structures
   (vstrip / hrow / grid / dot × amber / cyan / magenta). Output
   `renders/guide-structures.json` + an overlay PNG to eyeball. ~150
   structures for 01b (was 1,558 ungrouped panes — that was the "glitter").
7. **Guided placement:** `tmp/orb-dimension/guide_place2.py` — aligns a camera
   to the guide, raycasts each structure onto the mesh to learn its
   theta/z, then paints an authored cylindrical LIGHT MAP: my own window
   primitives (unlit panes included, five life variants) at the guided
   positions, pattern continued around the back from the mesh (recess
   detection → a column in every flute; disc rims from the radius profile →
   two rows per disc; annex grids mirrored). Renders front/back proofs.
8. **Export:** `tmp/orb-dimension/export_bldg.py` runs step 7 and writes
   `src/worlds/orb-dimension/assets/buildings/<name>.bin` (BLDG format),
   `<name>-light.png` (4096, RGB = exact emissive, A = window presence),
   `<name>-surf.jpg` (the seamless tile, triplanar in-shader). Then bump
   `BLDG_V` in world.js — the browser WILL cache the old light map otherwise.
9. In-world: seat + `vantage` on the building's record in world.js
   (`seatTestBuildings`), James views it with **VIEW [V]**, gives notes;
   iterate 7→8 in one-minute turns.

## The light-map contract (cylindrical, 4096²)

- U = angle around the shaft axis (0..1 = 0..2π), V = height (0 = base,
  1 = spire tip) — **but PNGs are top-down in the browser**, so the export
  writes `v = 1 - v`. (Lesson: two rounds of "the rings are at the bottom"
  were this. Verify with `check_export.py`, which re-reads the .bin + PNG.)
- Colors are EXACT, painted at full alpha: amber windows (1.0, 0.78, 0.30),
  blue **1C9BF4**, pink **C810BF**, red **FF2020** (beacon), dark-amber
  (0.42, 0.30, 0.10) for quiet bands. Verified pixel-exact in a Standard-
  transform, AA-off render (dist 0).
- Reserved rows (painted-space V, i.e. BEFORE the flip):
  - 0.005–0.09 : **landing-pad strip** — platform TOP faces get planar UVs
    here (islands by coplanarity, since a strut can split a pad), painted
    with a blue frame + inner rectangle.
  - 0.093–0.099 : **dead rows** — off-shaft non-top faces (platform rims,
    undersides, annex outward faces) map here so shaft windows never sweep
    across them; the STRUT/CONDUIT row is 0.0965 exactly and the world
    shader keys **pale ceramic + no windows** off it (the guide's
    inscrutable alien member — agreed dark).
  - 0.988–0.999 : **spire beacon** row (red).
- Nothing amber below zn 0.10 (the tower sinks into the superstructure).
- Amber columns live in the flute RECESSES only; disc rims get exactly two
  continuous rows each; the collar between saucers is erased then given two
  dark-amber rings; the cupola gets two rows + a blue line between + one
  pink ring at its base; pink conduits stop below the lower saucer.

## The world side (world.js, "v58")

- `BLDG_VS/BLDG_FS` + `bldgMesh` loader (units 8 surf, 9 light, 10 ceramic),
  drawn in the opaque pass in ship space like the robots. Triplanar surface
  from object-space position (`vO`, `vON`).
- **Neon rule (James's spec):** the pane's CENTER runs hot toward white, the
  OUTSIDE stays saturated. Two halo kernels: TIGHT (1.2 texel, LOD 0) for
  amber with a whisper weight (0.06) so windows stay panes; WIDE (4 texel,
  LOD 1.5) that only admits accent-colored texels for blue/pink with a big
  weight (1.5). Never widen the kernel to change amber's brightness — the
  kernel is what smears, the weight is what dims (lesson, pass 12→13).
- Light map: mag filter NEAREST (crisp pane edges), mips for distance,
  WRAP_T clamped. `bldgGlow` dial (GOD MODE · the societies) scales core
  lift + halos, never hue.
- Beacon: off, then a bright quick blink (~0.36 s) every 3 s (`uTime`).
- **VIEW picker on the deck** (dropdown + VIEW [V], persisted last pick in
  localStorage `orb-bldg-pick`): jumps to the building's DICTATED `vantage`
  (James's coordinates; 01b = 7167 / 2957 / 125247), nose on its middle, all
  motion zeroed like H. Deck shortcuts: NAV [N] TUNE [T] CTRL [C] VIEW [V],
  labels carry the bracket. Four equal-height rows in the button column;
  console-fit harness must stay 0px.
- Verification after ANY change: `node tmp/orb-dimension/init-smoke.mjs`,
  the eight sims, `shader-check.html` (BLDG_VS/FS compile there),
  `console-fit.html` if the deck changed.

## What did NOT work (don't rebuild)

- Rule systems that invent window placement from geometry (skin_v2–v5):
  glitter. The GUIDE decides placement; we only author the panes.
- Pixel-projecting the GPT image onto the mesh (`project_*.py`): smears on
  grazing faces, mirrored lie on the back. James: "I didn't want you to wrap
  it with the image texture."
- Camera matching by silhouette IoU (`align_sweep.py`): flat ~0.50 at every
  angle on a round tower — useless. The guide camera for 01b is az −28°,
  el 8°, straight (no mirror); the ray/render mismatch that looked like a
  mirror was a basis-vector bug, fixed. For future buildings: eyeball the
  guide's angle from its platforms/landmarks and confirm with the compare
  render (`_guidedN-compare.png`), don't sweep.
- Meshy's remesher (any count) and Blender's weld on 5.9 M verts.

## Assets on disk

- Concepts: `tmp/orb-dimension/building models/*.png` (33 images: 13
  iconic incl. four 01 towers, 7 generic, 10 tech, 2 turret views).
- Tile library: `tmp/orb-dimension/textures/` (14 seamless tiles, 42 cr,
  contact sheet `_contact-sheet.png`; `riveted-plate` was retaken with rivets
  on seams only).
- 01b: `renders/building-01b-tower-highres.glb` (raw), `-local.glb` (45k),
  `example.png` (guide), guided renders `building-01b-guidedN(.png|-back.png)`
  and compares. Shipped: `src/worlds/orb-dimension/assets/buildings/`.

## Next

Run the other 29 through steps 1–9. Then: placement system (many instances,
scales, half-sunk in bone), the conduit spurs feeding buildings, warning
flashers, ad atlas + alien script, and only THEN the Saelyri population/crowd
design (parked behind the look overhaul at James's call).
