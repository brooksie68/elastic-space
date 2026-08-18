# The Buildings — pipeline, contract, lessons (v58 2026-08-14/15, v59 2026-08-16)

The Orb Dimension's towns were "featureless Blender shapes" (James, 2026-08-14).
The fix is a fleet of ~30 real building/tech meshes, each lit the way a GPT
reference paints it, dressed with our seamless-tile library, dropped into the
towns. **building-01, 01a and 01b stand in-world through placer v3** (2026-08-16,
James: "hella good... I prefer yours to the GPT versions") — everything below is
what got them there and is the recipe for the rest. Read this before touching
any building work; it is the single place the process lives.

## The workflow, per building (the part that has to stay EASY)

James's steps (his tools, his eye):
1. Concept: ChatGPT renders the building as a matte-gray clay model on white,
   3/4 view (the concept PNGs are in `tmp/orb-dimension/building models/`).
2. Lit reference: drop the gray image back into ChatGPT with the TREATMENT
   PROMPT (boilerplate + per-building specific — see "The treatment prompt
   pack" below; Claude writes each one, one building at a time, James
   approves). Save as `renders/<name>-GPT.png`. One 3/4 view is enough for
   round/near-symmetric buildings; for an asymmetric one ALSO make a BACK
   guide: screenshot the Meshy model from behind (James's way — a Meshy
   screenshot + a five-word prompt in the same thread worked first try for
   01a; Claude's Blender clay plate did not), save as
   `renders/<name>-back-GPT.png`. Then `BLDG=<name> BLDG_SIDE=back python
   guide_extract2.py` → `<name>-guide-back.json`; the placer raycasts the
   back from its own camera (`BLDG_AZ_BACK`/`BLDG_EL_BACK`, 01a = 200/12,
   picked with `BLDG_SIDE=back rot_sheet.py`) and STOPS inventing the back
   (no mirrored grids, no random ribs) — v59.
3. Meshy: image-to-3D from the GRAY image, **remesh OFF**, export **raw** GLB
   (5–6 M tris, ~160 MB) into `renders/<name>-highres.glb`. Do NOT use Meshy's
   remesher — at 10k/30k/50k it melts every edge; our local pipe keeps them.
4. Reads the plan, says go, flies it, dictates the viewing seat.

Claude's steps (all headless, ~1 minute per building once the guide exists).
Every script takes the building by name — env `BLDG=<name>` for the Python
ones (they default to building-01b-tower), argv for the Node/decimate ones.
`<name>` is the concept file stem, e.g. `building-01a-tower`. Runbook, from
the repo root (bash; Blender = `"/c/Program Files/Blender Foundation/Blender
5.1/blender.exe" --background`):
5. **Intake:** `node --max-old-space-size=8192 tmp/orb-dimension/weld_bldg.mjs
   <name>` — Node hash-weld of the raw GLB (6 M → 1 M verts, 2 s) →
   `<name>-welded.glb`; then `blender --python tmp/orb-dimension/
   decimate_bldg.py -- <name>` — planar dissolve + collapse to ~45k tris →
   `<name>-local.glb` + `<name>-local-check.png` (30 s). Never weld in Blender
   (25-min hangs).
6. **Guide extraction:** `BLDG=<name> python tmp/orb-dimension/guide_extract2.py`
   — segments the GPT image's lit pixels into panes, then GROUPS panes into
   structures (vstrip / hrow / grid / dot × amber / cyan / magenta). Output
   `renders/<name>-guide.json` + `<name>-guide.png` overlay to eyeball. ~150
   structures for 01b (was 1,558 ungrouped panes — that was the "glitter").
6b. **Guide camera(s):** `BLDG=<name> [BLDG_SIDE=back] [BLDG_EL=8]
   [AZS=0,10,…] [TW=400] blender --python tmp/orb-dimension/rot_sheet.py`
   renders the local mesh at a fan of azimuths in the placer's exact camera
   convention next to the guide (`<name>-rotsheet.png`); pick AZ/EL by eye
   (landmarks: which side the drum / arm / platforms sit, gaps between them).
   Back = front + 180 as a rule; the back guide's elevation is usually a bit
   higher (James shoots Meshy from slightly above). Delete the sheet after.
   THE TABLE (keep it current):
   | building | front AZ/EL | back AZ/EL |
   |---|---|---|
   | building-01b-tower | -28 / 8 | (no back guide; 152 / 8 proof only) |
   | building-01a-tower | 35 / 8 | 200 / 12 |
   | building-01-tower | 230 / 8 | 50 / 12 |
   | building-01c-tower | 0 / 8 | (near-symmetric, no back guide; Meshy skipped the guide's hanging drum cluster) |
7. **Guided placement:** `BLDG=<name> BLDG_AZ=<az> BLDG_EL=<el>
   [BLDG_AZ_BACK=<az> BLDG_EL_BACK=<el>] blender --python
   tmp/orb-dimension/guide_place3.py` (v3 - guide_place2 is the v58
   cylindrical-only version, kept for reference, not used). What v3 does:
   classifies every face (tower BODY = cylindrical; STRUT = thin structure;
   off-shaft ISLANDS = platforms, drums, pods -> planar/curved patches in an
   atlas), raycasts every guide structure from the front camera (and the
   back camera when a back guide exists) with dense sampling along its long
   axis, SPLITS a structure per surface it touches, rejects anything that
   lands on a strut, and paints: shaft recess columns + disc rims + cupola +
   beacon (from the mesh), guide rows/columns/grids on the shaft
   (cylindrical) and on the patches (in the patch's own space; edge trims
   run the full edge on thin rim patches, all trims 2 px). Renders the FAIR
   PROOF (`<name>-proof.png`, `-proof-back.png`, key light rides each
   camera) and `<name>-compare.png` (guide | proof, both sides) - the
   compare sheet is what gets judged. `DBG=1` prints per-island structure
   counts and dumps the biggest curved patch (`_patch.png`).
8. **Export:** same env (+ optional `BLDG_TILE=<tile>.png`, default
   `armor-sheet-b-weathered.png`), `blender --python
   tmp/orb-dimension/export_bldg.py` runs step 7 and writes
   `src/worlds/orb-dimension/assets/buildings/<name>.bin` (BLDG format),
   `<name>-light.png` (4096, RGB = exact emissive, A = window presence),
   `<name>-surf.jpg` (the seamless tile, triplanar in-shader - NOT a bake).
   01b alone ships under the short stem `building-01b`. Then bump `BLDG_V`
   in world.js - the browser WILL cache the old light map otherwise.
9. In-world: add a row to `BLDG_KINDS` in world.js (id = asset stem, label,
   `vantage: null` until James dictates one); `seatTestBuildings()` seats
   one instance per kind, 900 m apart off Mediant; James views it with
   **VIEW [V]** (fallback seat until his vantage lands; he can also save his
   own vantages with the **+** button - localStorage `orb-vantages`), gives
   notes; iterate 7->8 in one-minute turns.

## The light-map layout (v3, painted space - the export flips V)

- **[0, 0.089) and (0.100, 0.315]: the ISLAND ATLAS** - every off-shaft
  island gets a rectangle here (shelf-packed; if they don't fit, the patch
  scale drops uniformly and patch panes are scaled with it so window pitch
  stays physical - 01a/01 pack at ~50%). Curved islands (drums, round pods
  - merged runs of small side facets with >45 deg normal spread) are
  unwrapped around their own vertical axis. Landing pads = the two biggest
  up-facing patches in the platform band, blue frame + inner rectangle,
  2 px. Undersides get nothing. Slivers -> the DEAD row.
- 0.0915: **dead row** (black; flat body lids, undersides, slivers).
- 0.093-0.100: **strut band**, 0.0965 exactly = **STRUT row** - the world
  shader keys the strut alloy tile + no windows off it (`isStrut`). Nothing
  else may live in this band (lesson: a dead row at 0.0975 turned every
  saucer top pale - v59 bug, fixed).
- **[0.325, 0.985]: the SHAFT band** - cylindrical U = angle, V = height.
  Flat/near-flat body faces (|nz| > 0.45: saucer tops, cupola caps, domed
  lids) go to the dead row instead - a flat face at one height would sample
  one row and smear it (James's "crazy whack" top-down). The world shader
  ALSO masks near-horizontal body faces (`wall`), belt and braces.
- 0.988-0.999: **spire beacon** row (red).
- Colors are EXACT, painted at full alpha: amber windows (1.0, 0.78, 0.30),
  blue **1C9BF4**, pink **C810BF**, red **FF2020** (beacon), dark-amber
  (0.42, 0.30, 0.10) for quiet bands. Verified pixel-exact in a Standard-
  transform, AA-off render (dist 0).
- Nothing amber below zn 0.10 (the tower sinks into the superstructure).
- Amber columns live in the flute RECESSES only; disc rims get continuous
  rows — two by default, and where the guide painted amber grids/rows on a
  rim the row count follows the guide's extent (2..5, capped by the rim
  face; v3.2, 01c's script bands); the collar between saucers is erased then given two
  dark-amber rings; the cupola gets two rows + a blue line between + one
  pink ring at its base; pink conduits stop below the lower saucer.
- Discs (v3.2, 01c — six thin discs down the whole shaft, only ~1.4× the
  cage radius): a z-slice is DISC when its max radius stands 1.2× over the
  shaft baseline (30th percentile of the radius profile, ±0.15 h) AND its
  outer faces cover >70 % of the circle — OR the v3.0 rule (top third,
  >90 % of the top-third max) so the 01 family's saucers never move. Rows
  sit on the RIM (the full-radius slices), never the chamfers; a thin rim
  gets one row; rim rows are dense (lit 0.95, flip 1.5 %); the collar
  erase only fires for two discs < 0.08 h apart (01b), a story between two
  discs is shaft; guide cyan rows landing on a disc drop to the rim's
  lower edge (the under-disc trim). SHAFT TOP = under the top disc (or
  under the lower saucer of a < 0.08 h collar stack, 01b): the flute
  columns run as high as any guide amber on the shaft up to that cap (01c's
  top stories were dark — the extractor's long strips were all low), and
  the pink conduits stop there. Re-proved 01/01a/01b identical (rims a hair
  denser).
- Face classes, how they're decided (guide_place3.py): shaft radius per
  z-slice = 25th percentile of side-facing radii (NOT the 92nd within 0.14h
  - the platforms inflated that and dead-mapped nothing); FAR = r > 1.45x
  that; a far slice that covers >70% of the circle is a disc/base ring
  (stays body), otherwise off-shaft; STRUT = side face whose inward
  thickness < 7% of height (+ small horizontal caps hugging struts).

## The world side (world.js, "v58", kinds table v59)

- `BLDG_VS/BLDG_FS` + `bldgMesh` loader: `BLDG_KINDS` table (v59) - each
  kind owns its VAO + surf/light textures, bound to units 8/9 per kind at
  draw (10 = shared strut alloy, 11 = upload scratch); a kind whose assets
  are missing is skipped, never fatal. Drawn in the opaque pass in ship
  space like the robots. Triplanar surface from object-space position
  (`vO`, `vON`), 16 repeats over the height (~25 m per tile - large formed
  sheets, James: "not a grid of little panels with rivets").
- **METAL (v59, James: "looks like cardboard"):** the shader has a real
  specular response - key + a second glint light, shininess from the tile's
  wear (bright = polished), fresnel edge sheen; lids (near-horizontal faces)
  get only a soft sheen (`spScale`), else the faceted saucer tops threw a
  pie-wedge highlight. Base darkened (x0.55) - "not black, dark gunmetal".
- **TILES (tmp/orb-dimension/textures/, 27 cr 2026-08-16):** `armor-sheet-a`
  (one continuous brushed sheet, no seams), `armor-sheet-b-seamless` (large
  angular sheets, a few seams, one lighter rib - wrap-blended seamless),
  `armor-sheet-b-weathered` (B + the dark wear lifted off a Meshy "worn"
  variant: streaks from seams, scuffs, faint mottle - the DEFAULT surf),
  `strut-alloy` (matte pale-warm machined banding - the strut/arm/zig-zag
  material, replaced pale ceramic; shader x0.8). Meshy tiles are NOT
  seamless out of the box - wrap-blend them (shift by half, 14% feather
  cross-fade at the seams); a Meshy tile with a strong diagonal rib turns
  into stripes when repeated (lift the wear off it instead of using it
  whole). 01b currently wears sheet-A, 01a/01 the weathered B, for James's
  comparison. James's GPT material brief (the source of the tile prompts)
  is in the changelog v59.
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
  iconic incl. four 01 towers, 7 generic, 10 tech, 2 turret views;
  `glowhome-01.png` = a golden crystalline sphere James dropped 2026-08-16,
  unexplained yet).
- Tile library: `tmp/orb-dimension/textures/` (14 seamless tiles, 42 cr,
  contact sheet `_contact-sheet.png` - NOT yet including the four v59
  armor/strut tiles; `riveted-plate` was retaken with rivets on seams
  only).
- `renders/` holds exactly SEVEN kinds of file per building and nothing else
  (James purged 120 iteration files 2026-08-16 — "I can't stand it"; keep
  guided/compare/align passes out of here, or delete them at the end of a
  round): `<name>-GPT.png` (guide), `<name>-highres.glb` (raw Meshy — the
  only irreplaceable one), `<name>-welded.glb`, `<name>-local.glb` (45k),
  `<name>-guide.json` + `<name>-guide.png` (extractor output),
  `<name>-proof.png` + `-proof-back.png` (the pass that shipped). 01b's set
  is there under those names (was `example.png` / `guide-structures.json` /
  `guided23`; the scripts were repointed). Shipped .bin + maps:
  `src/worlds/orb-dimension/assets/buildings/`.

## The treatment prompt pack (ChatGPT lit guides)

Written one building at a time, in this order: 01, 01a, (01b done), 02, 03…
alphabetically down `building models/`. Every prompt = the BOILERPLATE
verbatim + the building's specific paragraph. Boilerplate DRAFT 2026-08-16,
awaiting James's approval:

> Take this matte-gray clay render of a sci-fi building and give it the
> treatment. Keep the geometry, proportions, camera angle and framing EXACTLY
> as in the source — do not add, remove, move or reshape any part, and do not
> change the viewpoint. Replace the white background with pure black.
> Re-render the surfaces as dark weathered gunmetal: panel seams, rivets,
> faint scuffs, no bright bare metal, no color on the material itself. Then
> light it with exactly three emissive colors and nothing else: warm AMBER
> windows (small, in tidy regular rows and grids — real window scale, hundreds
> of little rectangles, some panes dark), CYAN trim strips along edges,
> ledges, disc rims and travel paths, MAGENTA lines on undersides, service
> bays and mechanical parts. Windows are crisp flat panes, not glowing blobs.
> Trim is thin continuous lines. Keep glow tight — a small halo, no fog, no
> atmosphere, no lens flare, no volumetric light, no visible light sources
> shining on other surfaces. Unlit surfaces stay dark. No text, no logos, no
> people, no ground, no shadow on the floor. Photoreal, sharp, single 3/4
> view, same aspect ratio as the source.

Per-building specifics (append as each is approved):

- **building-01-tower**: tall pillar tower, fluted central shaft, saucer +
  small cupola + spire on top, one long angled outrigger arm up-right, a
  stacked-drum module hanging right, four cantilevered flat platforms, a pale
  zig-zag structural member down the front. Amber columns in the flutes +
  two rows around the saucer rim; drum module and platform pods get small
  amber grids. Cyan: saucer rim, every platform's leading edge, outrigger
  edges, cupola top. Magenta: platform undersides, zig-zag joints, base
  drums. Zig-zag stays lighter matte ceramic (not glowing). One red beacon
  dot at the spire tip.

## Next

Run the other buildings through steps 1-9 (01, 01a, 01b done - James
2026-08-16: "looks hella good... I prefer yours to the GPT versions"; 01c
2026-08-17, four placer rounds, in-world awaiting his eyes; order
is alphabetical down the folder: 02-sphere next, a new family - expect the
face classifier to need work, the shaft/flute assumptions don't hold).
Open polish, no verdict needed: patch pane density vs the guide, the
guide's cyan hairlines on struts (currently forbidden). Then: James's
vantage numbers per building, Then: placement system (many instances,
scales, half-sunk in bone), the conduit spurs feeding buildings, warning
flashers, ad atlas + alien script, and only THEN the Saelyri population/crowd
design (parked behind the look overhaul at James's call).
