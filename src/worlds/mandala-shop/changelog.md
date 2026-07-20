# Changelog — Mandala Shop (storefront name: "Sanna")

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-19 — Claude (with James) — drift exits locked to three: door, blank frame, register

- James fixed the world's drift exits at exactly three: the shop door, the unpainted
  (blank) mandala frame, and the cash register. The floor-urn exit (`UrnFloor` /
  `drift-bowl`) is retired — its anchor in index.html is now `drift-register` ("into the
  cash register's drawer").
- world.js: `bowlMesh` replaced by a `registerMeshes` set; the register spec in
  `MESHY_SET` carries `drift: true`, and the instancing loop collects its meshes into
  the ray targets. Clicking the register fires `drift-register`.
- Poster-preview images are no longer drift links (James: visitors could click out
  before the shop even loads) — plain images now, anchor styling folded into
  `.previews img`, poster sub text and the room-load failure message rewritten to
  stop promising the pictures drift. Build stamp bumped to r4.

## 2026-07-19 — Claude (with James) — counter sign hugs the drum, glows like the door sign

- Counter SANNA sign rebuilt as five per-letter glyphs (`SignCounter_0..4` in build.py)
  wrapped around the drum axis at r 1.212 — the old single flat text sat at local y 1.26
  in front of a r 1.2 curved face, so it floated off the wood (a flat plane can't touch a
  cylinder). Back faces verified at exactly r 1.200 via headless measure script before
  the build edit; exported GLB node positions verified at r 1.212. room.glb re-exported
  headless (layout.js untouched, guard held). First export read "ANNAS" from the room —
  +phi runs right-to-left from the viewer's side; arc index flipped and re-exported.
- Counter letters join the door sign's lit treatment in world.js (`SignSanna` emissive
  0xd9a45b @ 0.55, condition extended to `SignCounter*`) — they read near-black unlit
  down at z 0.8.

## 2026-07-19 — Claude (with James) — ceiling light settled way down

- Center ridge lantern: tried 4.5 (25% of original 18) per James, still "way too bright" —
  settled at 1.8 (10% of original; history: 18 → 9 → 5.4 → 4.5 → 1.8).
  James had started to ask for "absolutely no light up in the top of the ceiling" in the
  2026-07-19 ~2 AM session but interrupted himself before it was built; today's call is to
  keep the ceiling light, at a quarter of full. Note the light was never actually removed —
  this is a brightness settle, not a restoration.

## 2026-07-18 — Claude (with James) — the shop gets a real door; the outside is retired

- Meshy shop door (James's library asset, `assets/door/shop-door.glb`, 1.19×2.80m
  bottom-origin) fills the arch closed at the old leaf's plane, width stretched 14% to
  the 1.36m opening. It joins `doorMeshes`, so hover + click-to-drift work as before.
  The procedural swung-open leaf (DoorPanel/DoorTop/DoorRing) is hidden; jambs and
  arch surround stay. Known: 36MB GLB (4K PBR JPEGs, 225k tris) — candidate for a
  texture shrink later.
- THERE IS NO OUTSIDE (James): souk panorama cylinder deleted from world.js,
  `OutsideGround` sand slab hidden alongside the old `Backdrop`. An opaque backer
  plane (1.8×3.2m) seals the arch behind the leaf — the Meshy door has transparent
  slivers around its edge and filigree. Backer went honey-sampled first, then
  near-black `#2b1d10`: the honey read as light leaking through. `Mossouk.png`
  stays on disk unused. Root todo #3 (city-tile panorama) dropped.
- Counter mosaic band is now front-only: build.py `half_drum()` grew `back_inset`
  (band cut 2cm deeper on chord + scoop), burying its back faces inside the body's
  wood — they were coplanar ("cut flush") and z-fought as flickering tiles on the
  desk's back. Verified numerically (band back y 0.298 vs body 0.276); room.glb
  re-exported headless.
- Desk plant swap: counter's left-lobe agave → `assets/plants/WallPlant.glb`
  (James's Meshy library), same spot/height normalization.
- Where things stand: door sealed and drifting, back of desk clean. NEXT if it
  resurfaces: door-GLB texture diet; any future "outside" gets built properly.

## 2026-07-17 — claude-fable — shared three.js lib: bare specifiers patched (no behavior change)

- `src/lib/three/loaders/GLTFLoader.js` + `utils/BufferGeometryUtils.js` + `utils/SkeletonUtils.js`
  now import `'../three.module.js'` directly instead of the bare `'three'` this world's
  index.html importmap resolved. Same URL, same module instance — the importmap can stay or
  go. Done for orb-dimension, which loads GLTFLoader without an importmap. If the vendored
  three.js is ever re-copied from node_modules, re-apply this patch.

## 2026-07-17 — Claude (with James) — curator polish, frame palette, drag-look toggle

- Drag-look now has two conventions, toggled by a small pill button top-left (injected
  from world.js in the world's palette; when curating it docks just right of the topbar's
  exit button, re-anchored every 30 frames): "drag moves the wall" (new default —
  drag right, view swings left, touch-style) and "drag swings the view" (the original
  mouse-look). Grab flips both axes — drag the wall itself, vertical included (James
  tried horizontal-only and reversed it). Persisted in localStorage under the shared key
  `elastic-look-mode` so other walkable worlds can adopt the same preference later.

## 2026-07-17 — Claude (with James) — curator polish: select-on-place, frame palette

- Placing a piece now selects it immediately (`dropCarry` → `select(placed)` in
  `src/core/curator.js`). Fixes James's bug: with an older piece still selected, hanging a
  new one and hitting a frame swatch restyled the old piece across the room.
- Frame swatches moved out of the bottom HUD bar into their own mini palette panel
  (`#cur-frames`) to its right — same panel style, matched height (flex-stretch wrapper
  `#cur-hudwrap`), small "FRAME" section label, swatches in a 5-across grid. Works in both
  carry mode (`data-style`) and selection mode (`data-selstyle`).
- Frame kit grown from 4 to 10 styles in `assets/layout.js`: added bone, silver, copper,
  mahogany, lacquer (deep red), lapis (blue) alongside walnut, oak, black, gold. Kit-only
  edit; slot data untouched.
- Curator mode now ghosts through furniture: `constrain()` skips the keep-out circles when
  `curatorActive`, so the center table and counter don't block camera moves while hanging
  art. Walls stay hard; visitors still collide with everything as before.
- Camera feel tuned per James (three rounds): drag-look sensitivity 0.0031 → 0.0014/0.0013,
  walk speed 1.7 → 2.2 m/s (top-speed cap 3.0 untouched), and look smoothing damp 10 → 22
  ("tight and responsive without much momentum" — 30 felt right, 22 adds back a whisper).
- Perf pass, zero-visual-risk batch: `powerPreference: 'high-performance'` on the renderer;
  hover/click ray targets cached (`rayTargets()` + dirty flag) instead of re-spread every
  third frame; camera Euler reused; `?fps=1` shows a monospace fps/worst-frame readout
  bottom-right. Still on the table if James wants more: lantern point-light consolidation
  (8 point lights is the big fragment cost) and pixel-ratio cap 1.75 → ~1.5 or dynamic
  resolution while the camera moves.
- Session close (2026-07-18 late): wash spots ease to 30% while a piece is in focus
  (washSpots + damp in tick — its first commit CRASHED the world, const declared after
  use at module level; moved above the spot builder, declaration-order sweep added to
  the check ritual). Ridge lantern −40% again (9 → 5.4). Eye height 1.55 → 1.7m.
  Outside sand halved forward / doubled wide (5×24 at x 8.5); panorama cylinder grew a
  4m clamped bottom skirt to cover the grazing gap, then lifted +40px-equivalent
  (~0.39m). STREET VERDICT (James): still not right and "not my fault" — the single
  16:9 frame is the wrong raw material for a wrap; the cylinder/mirror approach is
  sound. NEXT: evening session on a "city tile" concept — likely GPT panorama pieces
  designed to seam (or modular painted segments) mapped once around the existing
  cylinder. The wrap geometry, sand apron, and horizon-at-eye plumbing all carry over.
- Round 13 addendum: Meshy terracotta clay texture (~6cr,
  assets/textures/terracotta.png) mapped onto the 'terracotta' material — floor urns,
  console urn, and both plant pots (Urn*/_pot meshes UV'd via the tangent-planar pass;
  0.9m repeat). Session Meshy total ~90cr; actual balance 574 (James also spent on
  the Orb Dimension skull in a parallel session).
- Round 13 (while James is away, per his parting list): console tables ("the benches")
  wear desert wood bodies + sandstone-dark tops matching the counter (Console added to
  the UV pass); floor upgraded to Meshy terracotta clay tiles (~6cr,
  assets/textures/clay-tiles.png — a JPEG in a .png name, browsers sniff; 3m repeat →
  30cm tiles) laid under the existing floorGrime pass, procedural grid kept as the
  never-black fallback. NEXT SESSION: James returns with a plan for a large stitched
  GPT panorama (~4000×2400) to replace the mirrored single-frame on the street
  cylinder — the wrap geometry stays, just map the big image once across the arc.
- Round 12 — James's epiphany, the terminal form: a MOVING camera can't be served by
  any flat card (FS's plate worked because its camera is static). The souk image now
  wraps a 20m-radius CYLINDER centered on the doorway — 170° arc, mirrored copies at
  native ~55° each (negative repeat.x unmirrors BackSide), clamped top rows serve as
  sky (+6m headroom), painted horizon at eye height so building bases surface just
  above the sand. Old emissive Backdrop hidden (it sat inside the cylinder and
  occluded it). Known accepted trade: panorama = zero parallax, until a real village.
  Sand texture strengthened (tonal patches + heavier speckle). Doorway sightlines can
  no longer find an edge from any interior position.
- Round 11 — the ACTUAL matte-painting fix, both root causes finally named: (1) sizing
  the image to fill the doorway cone from point-blank stretched a ~55°-FOV picture
  across ~110° of view, doubling apparent sizes (every "zoomed in" complaint); (2) the
  tilted-backdrop attempt put the image's lower half 0.3–2m from the viewer,
  magnifying the foreground ("shop right up in my face"). Now: VERTICAL plane at the
  image's own depicted distance (13m from spawn), sized to its native ~55° FOV
  (≈7.8×4.4m), horizon at eye height — the painted shop sits at its painted distance.
  The near ground band is real street now: OutsideGround gets a packed-sand canvas
  texture (speckle + wind-drift streaks) instead of flat tan. Door stays look-only.
- Round 10 (the matte painting, finally right): after a small-near card (wrong: only
  works from one point) and a big-far vertical plane (wrong: ground gap = tan void band
  under the painting), the souk image is now a TILTED backdrop — bottom edge at the
  threshold (x 6.35), top leaning back to x 12, sized by the arch view cone at native
  aspect. Every doorway sightline lands on the image. Door is LOOK-ONLY: walk clamp at
  5.98 (inside the threshold) until a real village exists. Door frame (arch + jambs)
  wears the Meshy desert wood, UV'd. Lesson recorded: backdrops are angles, not props —
  and doorway mattes must be tilted or the near ground breaks them.
- Round 9 (doorway + street): interior Floor slab clipped to the shop footprint
  (16m → 12.3m — its tiles ran ~2m into the street); DoorJamb posts continue the
  arch surround's spring points to the floor (full wooden frame); door leaf folded
  back against the outside wall (hinge → 6.24, rot −86° — at 12° it jutted 1.3m
  into the street); souk painting now shown WHOLE at native aspect, 5.2×2.94m at
  x 6.85 (was a 10.5m blow-up at 7.6 — you only ever saw a crop through the arch);
  outside stroll clamp 7.1 → 6.55. Blender-render verified frame/tiles/fold.
- Round 8: rug pattern was off-center 1m — glTF flips V on export, so the texture
  offset needed 1/3 not 1/2 (also explains the original "tiling peek"); wheel/pinch
  was zooming the BROWSER (passive listener can't preventDefault) — wheel handler now
  non-passive, all zoom gestures drive the in-world dolly, UI panels exempt; DYNAMIC
  RESOLUTION per James's "art cannot degrade ever": full 1.75 when the camera is
  still or focused (i.e., whenever you're actually looking at art), 1.35 only while
  moving (0.25s settle debounce; ?px pins and disables), art textures bumped to max
  anisotropy.
- Round 7: rug wrap-bleed fixed (6.0m canvas for the 5.4m rug + ClampToEdgeWrapping —
  the border ring sat exactly on the repeat seam and ghosted in from the left);
  canted-wall wainscot stretch fixed (planar_uvs now projects vertical faces along
  each wall's own horizontal tangent instead of dropping a dominant axis — 45° walls
  kept square tiles; GLB rebuilt). PERF PASS 2: pixel-ratio cap 1.75 → 1.4 (?px
  override still live), wash spots 9 → 5 (canted corners rely on emissive art +
  hotspot quads), per-slot frame bars merged into one mesh (−66 draw calls).
  Remaining levers if still jerky: fixture arm/head merge, prop GLB texture
  downscaling, hotspot quad batching, spot count 5 → 3.
- Round 6 (read-back approved): tea service moved to the visitor's left-front edge —
  carafe at three (2.96,-2.37) with SIX glasses in a haphazard huddle (not fanned, per
  James); incense to front-left of the register (3.1,-1.86), SMOKE_TIP moved with it;
  small agave (0.35m) centered in the counter's right lobe; BrassBowl REMOVED (the
  "hemispherical pixelated object") — its drift exit reassigned to UrnFloor ("into the
  tall clay urn", same drift-bowl anchor id); ghost-wainscot-in-the-scoop fixed by
  rendering wood_desert/countertop_stone/mosaic double-sided (inverted boolean faces
  let you see through the counter); CounterTop slab slid 1in toward the wall (cutter
  rides along) so stone overhangs the body's scoop face — no raw wood edge.
- Round 5: counter props are Meshy models now (~60cr, meshy-5+refine —
  assets/props/register.glb, carafe.glb, glass.glb ×3 instances, incense.glb; the
  procedural register/carafe/glasses/incense James called "unrealistic" removed from
  build.py). Loaded by the generalized MESHY_SET runtime loader (per-spec y for
  counter-top height 1.06, height-normalized, instanced). Incense smoke is ANIMATED —
  Fifteen Sisters port: 18-sprite pool, soft radial puffs every 0.45s, sinuous
  widening climb, 6–8.5s lives, peak opacity 0.22, spawning at (4.13, 1.2, -1.7).
  Baked smoke curve dropped. Ceiling weave: finer again (tile 1.1 → 0.8m), brighter
  base, overlay 0.55 → 0.45. Also wrote James a GPT tuning prompt to flatten the
  souk billboard's street level (uphill illusion; horizon at standing eye height).
- Round 4 tweaks (James): spawn at the threshold (4.9 → 5.55, "like you've JUST walked
  in"); walk-out drift removed for now (door CLICK still drifts; constrain clamps the
  outside stroll at x 7.1, short of the billboard); desk slid 1ft toward the NE corner
  (COUNTER_AT 3.75,2.25 → 3.96,2.46 — scoop is the owner's spot, stool tucked into it,
  its collision circle dropped as unreachable, front arcs shifted). Ceiling weave made
  FINER (tile 2.4m → 1.1m: ~1cm threads instead of rope), base brighter, Meshy overlay
  0.75 → 0.55, tint → 0xfaf5ea ("threads too large... still a bit dark"; folds
  approved).
- Dressing round 3 (approved plan + follow-ups): the counter opening was NEVER real —
  the boolean cutters were unparented and carved thin air at the world origin ("round
  ass circle" bug); cutters now parent to their drums, and a second cylindrical cutter
  scoops a CRESCENT out of the chord (absolute 0.46r so all three drums cut flush;
  register moved to ly 0.88 clear of it; collision arcs slimmed to three 0.5 circles on
  the room-facing curve so pocket + scoop are standable). Tent: SAG deepened
  (0.10/0.17 → 0.16/0.2) + organic canvas_folds() ripples (world-space, enveloped to
  fade at eave/ridge/hip seams — first cut had sliver gaps at the hips), slope-space
  UVs. CEILING WENT BLACK first try: tent_fabric was mapped to canvas.png before the
  file existed (Meshy moderation kept blocking fabric prompts, of all things) — a
  missing map samples black. Now: procedural weave canvas base (never-black) with the
  Meshy canvas (finally generated, 6cr) overlaid at 75%, tint lightened to 0xf6efe0.
  Benches + counter body wear Meshy desert wood (wood-desert.png, 6cr; dedicated
  wood_desert mat + UVs); counter top wears sandstone under a dark 0x4a3424 tint
  (countertop_stone mat). Pillows raised out of the cushion (z 0.52 → 0.63 — they were
  "melting halfway down into it"). Music default 12% → 8%. Meshy spend ~18cr; ~787 left.
- Dressing round 2 (James's review of the 9-item pass): counter REBUILT for a real
  standing pocket — root pulled off the corner (4.05,2.55 → 3.75,2.25), boolean cut
  deepened (-0.62r/1.25r → -0.42r/1.3r), stool into the pocket (4.39,2.89), props
  re-fanned at arm's reach via counter_local() (register keys face the owner, tea
  service right, incense left, brass-bowl exit far left), SANNA base sign + counter
  lantern repositioned; collision reworked as three arcs hugging the solid drum so the
  pocket is walkable (single 1.55 circle + the 0.8 corner plug removed — plug was
  sealing the way in; stale [3.5,2.7] mystery circle also dropped). Pillows get
  per-pillow mandala textures (pillow_* mats + broad-face planar UVs in build.py; four
  canvas mandalas in world.js). Walls upgraded to Meshy sandstone
  (assets/textures/sandstone.png, nano-banana-2, 6cr) with the grime pass re-applied on
  top (canvas fallback kept for file://). SW palm pulled off the canted wall
  (-4.45,3.85 → -3.95,3.55). Spawn moved just inside the door (4.9,0) facing the hero
  wall. Music: 12% default and a 20s hush before the debut (custom sound-control
  adapter: silent permission probe, timer-armed start, manual clicks immediate, stop
  cancels). Meshy spend this session ~36cr; balance ~805.
- Big dressing pass (James's 9-item list): fixture dedupe (one spot per vertical stack
  — `fixtureOwner()`, topmost wins; fixes the door-left double); SANNA sign letters glow
  (emissive clone, no cast light); rug redrawn as a woven mandala (petal rings, lotus
  border, threadbare wear); wainscot redrawn as zellige star-and-cross with teal/cobalt
  accents and glaze chips; floor got scuffs/stains; NEW plaster grime texture (walls +
  piers now UV'd in build.py — UV_TARGETS gained Wall_/Pier_); benches rebuilt (beveled
  smooth cushions, rose/sage per bench, four plump pillows propped upright against the
  back); counter dressed (brass register with key deck + crank, tea carafe + three amber
  glasses, incense dish with ember + smoke wisp, stand-gap unchanged) and gold "SANNA"
  low on its room-facing base; art focus zoom eased (0.95 → 1.12 factor, gap around the
  piece); Meshy plants (~30cr, meshy-5: assets/plants/palm.glb + agave.glb) instanced at
  the retired lantern spots + corners with matching collision circles (stale lantern
  circles removed). Blender-render verified: counter props, base sign, leaning pillows.
- Lighting round 5 (root cause finally): any single scaled wash texture hides its bright
  core behind a large canvas — the four big side-wall singles (1.83/1.34m) showed nothing
  while the identical middle pieces were saved by the real wall-center spot. Wash split
  into two fixed-offset quads that art can't cover: HOT_MAT hotspot (0.8m tall) pinned
  0.26m above the frame top + SPILL_MAT spill hanging from the frame bottom (h*0.7+0.6).
- Lighting round 4 (superseded by round 5): glow pool redrawn as a single gallery scallop
  (256×512, entry above frame + destination-out cutoff). Still scaled with the painting,
  so big pieces still swallowed the core — kept for the record only.
- Lighting round 3: art canvases get emissive self-glow (their own texture as
  emissiveMap, warm white, 0.34) so outer paintings on the long walls read lit even
  though the real wash spots only cover wall centers. James approved the overall look.
- Lighting round 2 (James's notes): fixtures are now PER PAINTING, built at runtime by
  world.js `addFixture()` from layout.js — every wall/cord slot (each triptych panel too)
  gets a brass arm from above the molding (y 4.05, reach 0.72m — was 3.88/0.42), halogen
  head, and an additive warm glow pool on the wall behind it. Baked ArtSpot fixtures
  removed from build.py/GLB. Real lights stay at 9 wall-wash spots (raised/farther/dimmer,
  16 → 12) + ridge lantern halved (18 → 9) + counter; hemisphere 0.68 → 0.52 so the art
  reads as the light source. Plus: James's `assets/city/Mossouk.png` souk street stands
  outside the door (unlit 13.5m billboard at x 10.8, palm in front for parallax).
- Gallery-lighting EXPERIMENT (James's idea; full pre-experiment state snapshotted in
  tmp/mandala-shop/snapshots/2026-07-17-pre-spotlights/ — build.py, room.glb, world.js,
  layout.js; rollback = copy those back, no rebuild). Mini halogen art spots on thin
  brass arms out of the teal eave molding at 3.88m, one per wall section + two flanking
  the door wall (9 total), aimed at the art band at 1.9m. Fixture geometry + matching
  Blender SPOT lights in build.py (`art_spot()`); runtime THREE.SpotLights in world.js
  computed from POLY/EDGES so they mirror build.py's placement. Floor/standing lanterns
  and LanternConsoleS retired; kept center ridge lantern + counter lantern (point lights
  now 2, was 7; 9 spots added — net 11 lights, watch fps). Hemisphere 0.55 → 0.68 to
  cover the lost lantern ambient. Awaiting James's in-browser verdict.
- Room decluttered (build.py edit + headless GLB re-export; layout.js untouched):
  center table, platform, skirt, and all six cushions removed — open floor, rug stays.
  The brass bowl (drift exit) moved to the counter top (3.87, 1.67, 1.085). ArchSurround
  was accidentally a FULL torus — a moon-gate ring crossing the doorway at 1.4m; now a
  true half torus over the arch. LanternNE moved out of BenchN's footprint (2.6,3.85 →
  1.3,4.15). world.js synced: table point light dropped (8 → 7 lights), NE light + its
  collision circle moved, center 2.2m collision circle removed. Verified with four
  headless EEVEE renders (door, center, counter, bench).
- Multi-select + alignment tools (James: "I'm doing a lot of little fussy adjustments"):
  shift-click gathers 2+ pieces (a triptych joins/leaves whole; shift-click empty space
  keeps the selection). The HUD grows a multi section — "same height" (widths keep aspect),
  "same size" (exact copy), "tops"/"bottoms" edge alignment, and closer/apart gutter
  respacing (`,` `.`), all referenced to the FIRST piece selected. Gutter respacing wants
  wall pieces on one wall, keeps each piece's height, recenters the row, clamps to the
  wall. Ad-hoc multis nudge rigidly with arrows but can't be mouse-dragged (trio paths
  now gated by `isTrio()` — shared `group` — so triptych behavior is unchanged). Frame
  swatches and take-down apply to the whole selection. No persistent groups yet — the
  selection is the group; saved grouping is a possible follow-up.
- Next: James to eyeball the new frame materials in-world and tune colors/roughness by eye.

## 2026-07-16 — Claude (with James) — session 2: CURATOR MODE SHIPPED

- Curator mode v1 built and live, triptych authoring included (James's call: "fold that
  puppy into v1"). Entered only via the admin panel curate pill (`?curate=1`, served only);
  the old "coming soon" toast is gone.
- Reusable framework as planned: `src/core/curator.js` is world-agnostic — the world hands
  it an adapter (THREE + scene, live layout, analytic wall/floor geometry, slot CRUD hooks,
  frame kit, protected ids, input locks). A future gallery world reuses it by building the
  same adapter with its own kit/geometry.
- Features: bottom art tray scanned from `assets/art/` via the new server endpoint
  (thumbnails, ×N placement badges, blank-frame tile, rescan button); pick up → ghost
  preview rides a raycast (walls snap flush + yaw from the wall, floor gives easel or
  lean); kinds wall/cord/triptych on walls (keys 1–3 or pills), easel/lean on floor;
  triptych drops three linked panels (data-driven `slice`/`group` — the hardcoded
  TRIP_SLICE in world.js is gone, layout.js trip slots migrated); click selects (gold
  outline, trio selects together), drag slides along/between walls, arrows nudge 1 cm
  (Shift 10 cm), wheel or [ ] resizes, Q/E turns floor pieces, frame swatches + wall↔cord
  switch + take-down on the HUD; Ctrl+Z undo (snapshot stack); preview toggle hides all
  chrome; explicit save (dirty dot) → PUT with timestamped backup; revert reloads last
  save. The shimmering blank is protected — it's a drift exit, delete is refused.
- world.js refactor: slot registry (add/remove/update/reset with disposal), curator gates
  on focus-glide/drift exits/door walk-out/hover cursor, arrows/wheel lockable, WALLS
  (octagon + door keep-out band) exported to the adapter. Walking + collision untouched.
- Server: `GET /api/worlds/:slug/art` (image scan) and `PUT /api/worlds/:slug/layout`
  (shape validation incl. path-traversal guard; backup to `tmp/<slug>/layout-backups/`
  before every write; rewrites `assets/layout.js` in the same globalThis + Blender Z-up
  format). `build.py` layout.js reseed now gated behind `MS_WRITE_LAYOUT=1` — the file is
  curator-owned. 4174 server restarted on the new code.
- Verified statically (house rules, no browser QA): 11-check Node suite green against a
  scratch-port server — endpoint round-trip (written layout deep-equals the PUT), backup
  byte-match, malformed/traversal rejections, door-band + yaw + inset math against the
  shipped slots. James is the first real user of the UI.
- Not done: index.html build stamp still says r2 (bump to r3 at wrap-up — no mid-session
  .html edits). The quirky-JPEG worry is dropped: James confirms the triptych renders.
- Post-walkthrough tweaks (same session, James's notes): (1) "clear all" button in the
  curator topbar — takes down every piece except the protected drifting blank, confirm
  dialog, one Ctrl+Z restores the whole hang; (2) camera speed capped — stored wheel
  impulse clamped to ±1.5 and total travel speed hard-capped at TOP_SPEED = 3.0 m/s
  (~25% of the old uncapped wheel-rush top, per James's motion-sickness call; plain
  walking at 1.7 unchanged); (3) control bar moved from top-left into a shared bottom
  dock with the tray — pinned to the tray's left edge, 10px above, rides tray width
  (selection HUD and toast bumped up to clear it). No autosave, confirmed to James:
  explicit save only, amber dot = unsaved; plain F5/tab-close does NOT warn (offered a
  beforeunload guard, not yet requested).
- Curator UI iterations with James live: dock evolved bottom-center → left rail —
  toolbar flush to the top-left corner, tray touching it below, flush left, running to
  the page bottom; single column of 140px thumbnails, 12px even padding/gaps, scrollbar
  fully hidden (scroll still works); rescan pinned at the strip top; HUD + toasts
  bottom-center.
- James caught a real bug via the triptych "mirroring on its own": wallRightDir was
  negated, so any trio move/resize swapped the outer panels (and wall-piece arrow-nudges
  ran backwards). Fixed — slice 0 verified to sit on the viewer's left against the
  shipped seed. The accident became a feature at his request: mirror toggle (HUD button
  or M) — flips a piece's art horizontally via texture transform (`flip` slot property,
  server validates it, 4174 restarted); on a triptych it flips each panel AND swaps the
  outer slices so the whole composition mirrors. Blanks refuse politely.
- Live curation pass with James (running into the small hours of 2026-07-17), curator UI
  iterated to its v1 shape:
  - Dock rebuilt as a left rail flush to the screen edges: actions bar snug in the
    top-left corner, vertical thumbnail strip touching it directly below and always
    running to the bottom of the page. 140px tiles, even 12px padding and gaps, vertical
    scrolling only with the scrollbar fully hidden, rescan button pinned in the strip
    header. HUD and toasts recentered bottom-center. Room keeps ~92% of the screen.
  - Triptych spread control: , / . keys (2cm steps, shift = 10cm) plus closer/apart HUD
    buttons and a live gap readout. Moves and drags preserve the set gap (it used to snap
    back to the formula), resize scales it proportionally, clamp 0–1.5× panel width
    within wall space. Undoable.
  - Per-slot mirror toggle (`flip` in layout.js): M key or HUD button flips a piece
    horizontally at the UV level; a mirrored triptych also swaps its outer slices so the
    composition flips whole. Blank frames decline.
- Where things stand: curator v1 is real and James spent the night hanging art with it —
  his verdict: "so cool… like a dream come true." Next: his queued wishlist (lighting
  pass, proprietor, music; Meshy Premium lands 2026-07-17 for props/characters).

## 2026-07-16 — Claude (with James)

- Direction shift, James's call: art placement moves out of Blender and into a reusable
  browser-side "curator mode" — James dresses the gallery himself (pick up art from a tray
  scanned from `assets/art/`, place as wall/cord/easel/lean, resize, choose frame from a
  per-world kit, keyboard nudge, save). Framework will live in `src/core/` and be reused
  for future gallery worlds (e.g. a graffiti shop with a different frame kit).
- Architecture: room (Blender-baked GLB) + art layer (runtime, driven by `assets/layout.js`).
  Curate mode is entered ONLY via the map room's "curate" pill next to the Mandala Shop
  entry (James rejected hand-typed query params; the pill link carries the flag).
- Done this session: build.py grew MS_SKIP_RENDER / MS_EXPORT_GLB env flags; world-space
  planar UVs on patterned surfaces (floor, wainscot, counter, rug, door, table) so the web
  page can texture them procedurally; exported `assets/room.glb` (1.83 MB, 251 meshes,
  ~60k polys, art layer verified absent via clean-session reimport); `assets/layout.js`
  seed generated from the Blender arrangement (frame kit + 26 slots, Blender Z-up coords,
  convert to Three via (x, z, -y)); map room row restyled with the curate pill
  (index.html + styles/admin.css `.page-row` / `.curate-link`).
- SHIPPED the walkable page (same session): `world.js` + rebuilt `index.html`. Three.js
  0.185.1 vendored at `src/lib/three/` (three.module.js + three.core.js +
  loaders/GLTFLoader.js + utils/*, npm-installed, importmap maps bare 'three'). Room GLB +
  runtime art layer from layout.js (frames/cords/easel/lean/blank shimmer built in JS;
  triptych via texture offset slices). Drag-to-look + WASD/arrows with damped easing (no
  bob — James's motion sensitivity), click-a-piece glide-up viewer (Esc/click-away glides
  back, wheel adjusts distance), 8 warm point lights matching the Blender lanterns,
  procedural canvas textures keyed to GLB material names (floor_tile, tile_sandstone,
  rug_rose, wood_door). Collision: octagon half-plane walls (hard, iterated solve) +
  furniture circles (soft) + pinch plug near counter — caught a real wall-leak bug via the
  Node sim (`scratchpad verify-shop.mjs`): circles could shove you through the canted
  corner; fixed by circles-first/walls-last iteration. Drift exits: open door (walk out or
  click), brass bowl, shimmering blank frame (hidden data-drift anchors clicked from the
  scene); SANNA poster card stays as loading screen and file:// fallback with its own 3
  drift portals. Curate pill shows a "coming soon" toast for now. Build stamp r2 on page.
- Static verification only (house rule: no Browser-pane QA): GLB chunk parse (materials,
  door/bowl nodes, no art leakage, UV presence), collision sim probes, layout parse + art
  file existence, node --check on world.js. James is the first real walkthrough.
- Next: James walks the room and art-directs; then curator mode (tray from assets/art/,
  place/resize/frame/nudge/save via dev-server endpoints with timestamped backups); then
  extract the reusable gallery module to `src/core/` for future gallery worlds.
- James's first-walkthrough verdict: strong start, keep going. His shop wishlist: (1) a
  lighting pass (different mood than the v1 guess), (2) a proprietor character in the
  shop, (3) music. Meshy Premium (starts 2026-07-17) brings his big premade-object
  libraries — adapt via Blender or drop GLBs straight into worlds; good source for the
  proprietor and props. He has "tons of comments" queued for next session.

## 2026-07-15 — Claude (with James)

- World kicked off. Concept: a Moroccan/Ottoman tented shop pavilion ("Sanna" on the sign,
  Mandala Shop everywhere else) full of framed mandalas — James's actual artwork flown into
  the frames. Visitor stands in the shop, mouse-look + arrow keys, click a piece to glide up
  and view it full-res. Paradigm intended to be repeatable for other artists/art types.
- Two GPT-generated interior references live in `assets/reference/`. Twelve artworks (all
  square-ish) live in `assets/art/`.
- Display layout (v2, after James's "be bold" direction): every artwork placed TWICE = 24
  placements. A 2.6m peacock hero owns the back wall; a 2.1m-tall triptych (gold-star piece
  split across three panels via UV slices) plus a 1.9m ornate anchor the north wall; big
  green-glow piece, kraft trio, high pieces, and two cord-hung frames on the south wall;
  real art on all four canted corners; salon pairs flanking the door; easel piece; leaning
  blank stack + a few blanks as shop inventory.
- Wainscot reworked from glossy blue mosaic to matte 16cm sandstone/clay tiles after James
  flagged a swimming-pool vibe. Frame sizes doubled-to-tripled to use the 4m walls.
- Blender build is fully procedural: `tmp/mandala-shop/build.py` rebuilds the whole scene
  headless in ~20s and renders 4 preview cameras (~17s each, OPTIX). Scene in
  `tmp/mandala-shop/mandala-shop.blend`; renders in `tmp/mandala-shop/renders/`; frame
  layout exported to `tmp/mandala-shop/layout-manifest.json` for the future web build.
- Shipped a teaser page (`index.html`): SANNA title card + three preview renders (copies in
  `assets/preview/`) that act as drift portals. Dashboard control + drift/registry wired,
  file://-safe, no sound. Added to the map room Pages list and ran `npm run registry`
  (world #12 in the drift pool — pull it if James wants it out until the real room ships).
- Known quirk: `assets/art/20230402_012714.jpg` has a malformed JPEG header (Blender loads
  it; browsers may not) — verify/re-save before the web build.
- Next: James art-directs from the renders, then lightmap bake + glTF export + the real
  walkable Three.js page (mouse-look + arrow keys, click-to-glide art viewing) replaces the
  teaser. More art incoming from James (~12 pieces, some mandala-adjacent).
