# Changelog — The Orb Dimension

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-29 — claude-fable (Being Editor: persistence)

James tweaked the Being Editor to a look he liked, closed the tab, and the
look was gone — the lab had zero persistence. Fixed two ways:

- FILE-BACKED PRESETS: server.mjs presets route generalized to
  `/api/(worlds|labs)/:slug/presets` (labs resolve under src/labs/, backups
  in tmp/labs-<slug>/preset-backups/). The editor grew a presets section
  (picker / save / save as / make default) writing
  `src/labs/being-editor/assets/presets.json` — saving IS telling Claude,
  same contract as the world tuners. localStorage is the boot cache and
  file:// fallback; an empty file gets seeded from the browser store.
- CONTINUOUS AUTOSAVE: every slider input snapshots to localStorage
  (`elastic-being-editor-state`) and reopening the tab restores it —
  last-touched state beats the default preset on load, by design.

Snapshot keys: glow/turb/cplx/cor/heat/edge/fam. Needs a server restart to
serve the new labs route. His lost look still needs re-tweaking, sadly.

## 2026-07-28 — claude-fable (v55.4 — lens shift: the X IS the axis)

James, flying: "press D... the reticle should stay pointed exactly onto
whatever I started from — it's going around in a larger circle." Right
again: the reticle X sits at the GLASS center (the console pushes the
glass up), but the optical axis exited through the WINDOW center — so a
pure roll orbited the point under the X around the true screen center.

- ASYMMETRIC FRUSTUM (`projShiftY()` = the reticle's NDC height,
  proj[9] = −shift): the principal point now passes through the reticle
  cross. Rolls pivot exactly on the X, turns pivot on the X, and the
  magnifier zooms into the X. This finishes the v54.2b thread (the stick
  anchor moved to the glass center then; now the projection itself has).
- The three CPU-side projections follow the shift: rayDir (clicks land
  where the eye says), home marker, nav ring. Everything GPU-side rides
  proj automatically. Verified numerically: axis point renders at the
  reticle pixel, ray at the reticle pixel is exactly cam.f, overlay of a
  dead-ahead target lands on the reticle pixel.

Full suite green. Awaiting James's barrel roll.

## 2026-07-28 — claude-fable (v55.3 — THE POD CONTRACT; v55.2 reverted)

James flew v55.2 and killed it, with a clear spec: "I don't want this ship
to act like a plane. This is space... I just point where I wanna go...
It turns where I turn it, and it stays there while I drag the mouse
around." At 90° bank the horizon-lock blend whipped the view ("I just did
a barrel roll") — the blend zone near knife-edge was real motion, not
display.

- v55.2's world-axis yaw blend REVERTED: yaw is plain `rotateCam(cam.u,
  yawStep)` again. Pod contract: ship-frame rotations only, forever.
- THE REAL ORIGINAL BUG FOUND: the WHOLE reticle (v25) counter-rotated
  with WORLD bank — so honest body-frame turns visibly spun his
  instrument ("phantom D key"). The reticle now shows COMMANDED roll
  (`rollShown` = A/D integral; R and leveling glide it home; goHome
  zeroes it). Dragging the mouse cannot move it, by construction. BNK in
  the console keeps honest world bank.
- stick-sim TEST 7 replaced: knife-edge + two full dragged circles →
  ship-up invariant to 0.0, commanded-roll display unchanged; new guards
  pin the yaw/pitch application lines and the rollShown reticle drive.

Full suite green. Awaiting James: set any tilt, drag anywhere — the
reticle must never move on its own.

## 2026-07-28 — claude-fable (v55.2 — horizon-locked yaw: the bank stays put)

James, flying: banked left with A, held a left turn — and partway around
the bank read as if D were pressed, the turn switching sides on its own.
"I wanna back into a turn and hold that bank indefinitely... fifty circles
in a row."

Diagnosis: yaw rotated about SHIP-up. Rotating about a tilted axis
corkscrews the orientation against the horizon — 180° into a banked turn
the bank reads reversed. Geometry, not an input bug.

- Yaw now rotates about the HORIZON vertical, which preserves every basis
  vector's angle to the horizon: the bank he set — and the reticle tilt —
  stay mathematically pinned through any number of circles. Sign-corrected
  by u[1] so inverted flight still follows the hand (the v48.3 lesson);
  smoothly blends back to ship-up yaw near vertical pitch (world yaw there
  reads as roll) and near knife-edge bank (sign flicker). A/D remain pure
  pencil roll; pitch remains ship-frame.
- stick-sim TEST 7: two full 45°-banked circles → bank drift 0.0 (exact);
  contrast leg proves the old axis drifted 0.79 rad in a quarter turn.
  New guard lines on the axis blend.

Full suite green. Awaiting James's circles.

## 2026-07-28 — claude-fable (v55.1 — the magnifier)

James's ask (his pick between site-wide and in-ship): a ship zoom.

- WHEEL zooms the view 1×–8× (exponential notches, eased in the frame
  loop — never a snap, motion restraint); Z eases back to 1×. Implemented
  as effective-FOV narrowing: `zoom`/`zoomTarget` next to the matrices,
  `tanF() = tan(FOV/2)/zoom`, and every projection-adjacent tan site
  (setProj, rayDir clicks, home marker, nav ring) reads it — clicks and
  HUD overlays stay glued to the world at any magnification.
- STEERING SLOWS TO MATCH (÷zoom): the stick gain line (stick-sim guard
  updated to the new verbatim form — at zoom 1 it is the identical
  formula) and the arrow ROT. On-screen angular speed stays constant, so
  the view can't whip while magnified.
- "MAG ×2.4" readout under the reticle (instrument-faint, hidden at 1×),
  CTRL card documents wheel/Z.

Full suite green + shaders compile. Awaiting James's eye.

## 2026-07-28 — claude-fable (v55 — the distance vibe: aerial + detail melt)

James, flying: "Korrudan is 86km away and it looks as clear as day... teeny
little high res lights... killing the distance vibe." Diagnosis: not missing
blur — impossible detail (subpixel window grids rendered razor-crisp at any
range). His pick of the offered routes: dissolve-at-source + aerial pass,
both on dials; true post-DOF held in reserve (it taxes exactly the frames
that already dip).

- AERIAL PERSPECTIVE (`aerial` dial, "the air", 0–3, default 1): shared
  `COMM_AER` GLSL snippet — luminance-preserving desaturation drifting
  toward a cool haze cast (lum × [0.74,0.82,1.05]), 1−exp(−d·uAer),
  uAer = cfg.aerial/120000 (~50% quieted at 86km). Multiplicative only, so
  it can never lift black space and is premultiplied-alpha safe. Applied to
  STRUCTURE only: skull, comm solid/glass/bridge, robots + castes. Orbs
  already desaturate (v47 line kept), beacons/hearts stay fog-proof
  long-range reads, nebulae ARE the weather — all untouched.
- DETAIL MELT (`melt` dial, "the air", 0–2, default 1): fwidth()-measured
  projected size — crust window cells below ~6px (×melt) crossfade into
  their steady average glow (lit 0.34 × duty 0.31 × mean flicker ≈ 0.09,
  no flicker at range), glass data-dashes dissolve into their 0.18 duty
  average. Kills the "teeny lights" shimmer too. 0 = the old crisp look.
- shader-check.html learned the COMM_AER substitution (all comm shaders +
  ROBOT_FS interpolate it now).

Full suite green + all shaders compile. Awaiting James's flight: both
dials default 1, tune the vibe by eye (aerial = how fast color quiets,
melt = how eagerly detail dissolves).

## 2026-07-28 — claude-fable (v54.3 — presets travel + capture spawn)

James asked: "if I set a start preset and we push, does a visitor get
exactly what I set?" Honest answer was no — two gaps, both fixed:

- STATIC-HOST FALLBACK: the preset boot fetch now falls back from the
  dev-server API route to the committed `assets/presets.json` itself, so
  a public host (GitHub Pages / elastic-space.net) serves his start
  preset instead of factory defaults. file:// still degrades to
  localStorage/defaults as before.
- FIRST-LOAD APPLY: a fresh browser used to boot on defaults even when
  the file loaded (it only seeded the cache for the NEXT load). The boot
  path now records what it applied (`bootStartSnap`); when the file
  arrives with a different start preset, `lateApplyStart` (= the same
  `applyPresetSnapshot` the apply button uses) applies it live.
- CAPTURE SPAWN (his ask, same breath): new tuner spawn row — "capture
  spawn" stores the ship's position + facing (`cfg.spawnPose`, {pos,f,u},
  meters) with a live readout in km; "stock spawn" clears it. It rides
  the preset snapshot, so capture → save preset → set as start = the
  world opens exactly there, aimed exactly that way. sanitizeCfg clamps
  the pos into SPACE bounds and null's any malformed pose;
  `applySpawnPose` orthonormalizes the basis (parallel-up fallback).
  Applying a preset that carries a pose teleports via goHome (motion
  zeroed, autopilot off); presets without one mean stock (pre-cleared,
  never inherited). H (return home) honors the captured pose too.

Full suite green + shader-check pass. Awaiting James: capture a spot,
star it, and reload — and eventually a fresh-browser test of the
visitor path.

## 2026-07-28 — claude-fable (v54.2 — the grab circle gets its own dial)

James, flying: the steering grab zone felt like it was only the reticle
circle itself — too small to hit reliably. His spec: ~3× the radius, same
center, reticle untouched, plus a temporary faint dotted ring at the new
edge so he can see and tune it.

- `stickGrab` (px, default 390 = 3× the old reach/2 = 130) is a new cfg
  key + slider in "the stick" tuner group (60–800). The center-mode grab
  test in pointermove now uses it directly; stickReach and all deflection
  math are untouched (stick-sim still guards those lines verbatim).
- GHOST GRAB RING: `#stick-grab`, a 1px dotted rgba(150,205,255,0.16)
  circle pinned to the reticle center, diameter = stickGrab×2, live-follows
  the slider. Temporary instrumentation — flip GRAB_RING (frame loop) to
  false to retire it once the radius lands.
- Full suite green (init-smoke + 8 extraction sims) + shader-check pass.

v54.2b, same session (James flew it: ring not dotted, not centered, more
of it below the reticle than above):

- THE CROSS IS NOT THE WINDOW CENTER — the glass sits above the console,
  so window/2 rides low. New `reticleCenter()` (vsEls.ret rect, cached,
  resize-stale) now feeds ALL of center-mode: the grab test, the stick
  anchor, and the ghost ring. Steering neutral finally sits on the actual
  cross, not a point below it.
- The ring is an SVG circle now (dasharray 0.5/10, round caps = real
  spaced ghost dots at 0.28 alpha) — a 1px dotted CSS border renders as a
  hazy solid line at that alpha.
- init-smoke's document stub learned `createElementNS` (returns the same
  element stub as createElement).

Where it stands: awaiting James's flight — he tunes the radius by eye,
then we either keep the ring, dim it, or flip GRAB_RING off.

## 2026-07-28 — claude-fable (v54 — the nebula size dial + the Being Editor)

James flew v53: "the nebulas are cool if a little bit underwhelming. They seem
kinda small for the space." He floated 5×; the honest ceiling is 2× (beyond
that the banks merge and lose their one-palette identities).

- NEBULA SCALE DIAL: `nebScale` (0.5–2, default 1.6, layout dial) in
  GOD MODE · the nebulae. Scale multiplies bank RADII only — seats stay put,
  so the dial never re-rolls the sky. Default ships at 1.6 (his complaint was
  "too small"; the dial is there for his 10% passes either way).
- SEAT RESEED (one-time): gulf seats now reject the spawn corridor at the
  DIAL CEILING (24km × SCALE_CAP + 6km margin, 9 samples along spawn→origin),
  so no legal dial setting can drop gas on the player's first frame or the
  run home. Old bank #1 sat 2km off the spawn at 1.6 — that's why. SCALE_CAP
  (2) in nebulaGeometry restates the slider max — change them together.
- SIM: TEST 2's blanket "nobody past 110km" satellite check replaced with
  real satellite-town clearance (communityLayout seats, verbatim cut, +8km);
  new TEST 10 re-proves spawn/approach/satellite/sightline/identity bars AT
  the ceiling, reading SCALE_DEFAULT and SCALE_MAX out of world.js so the
  sim can't drift from the sliders. All 10 pass; full suite + shader-check
  green.
- BEING EDITOR (`src/labs/being-editor/`): the saelyri lab promoted to a real
  lab page (face-lab styling, admin panel Labs link, dashboard icon), with a
  being dropdown (single entry today — the roster is the contract that more
  peoples arrive here). The v54 shader round answers "add in the internal
  structure": turbulence moved OFF the distance field (silhouette holds now),
  interior split into three layers — luminous shell at d=0 (new `edge`
  slider), ridged-fbm energy filaments (structure slider drives frequency +
  count, white-hot at crossings), and a shrunk-form skeleton riding core
  heat. Veins deliberately don't feed alpha — light inside the glass, not
  fog. tmp/orb-dimension/saelyri-lab.html is superseded (banner added).
- v54.1 SAME SESSION, with James looking: his verdict on the first cut —
  loves the "rippling purple fire at the edges", interior "pure white all
  the way through". Two real bugs found by capture (via the server's
  /api/dev-snapshot — the pane wouldn't composite for screenshots all
  night): (1) the skeleton term used max(d+0.16,0) = 1.0 across the WHOLE
  interior — a filled core, not an inner surface; abs() made it a band.
  (2) exposure: interior terms summed past 1.0 over ~25 march steps, so
  everything clipped white. Emission now ~3x dimmer with the shell
  coefficient raised to keep the edge fire exactly as bright; alpha got its
  own weight (aw) so occlusion didn't dim with it; veins' white component
  0.5 → 0.32 so knots read hot against purple, not white against white.
  Sheets r3 (tmp/snapshots/being-editor-*-r3.png): filament networks read
  through every state, homes are shell-less plasma. AWAITING HIS VERDICT.

## 2026-07-25 — Claude (Fable 5) — click-away dismissal (site-wide sweep)

- New house rule from James: every control panel dismisses on click-away. One
  `pointerdown`-outside handler now closes whichever of NAV/TUNE/CTRL is open
  (via `setOpen("none")`); presses inside the open panel or on its own button
  are exempt, and pressing another panel's button still opens that panel.
  Grabbing the stick/canvas drops the panel immediately — that's the intent.

## 2026-07-26 — claude-fable (v53.2 — the console was eating its bottom rows)

James: "Some of the controls are going off the bottom of the screen... I can't
read the z position. I can't read the bank rate. I can't read the bottom
system parameter." Real bug, and it had been there a while — not a v53
regression.

- CAUSE: `.vs-rows p` sized its type at `clamp(13px, 1.75vh, 20px)` — a 13px
  FLOOR — while the console box is `clamp(80px, 9.5vh, 150px)`. Below ~1440px
  of viewport height the box keeps shrinking and the type doesn't, so the rows
  outgrow the glass and `.vs-screen{overflow:hidden}` silently eats the last
  one. Exactly the three readouts he named: BNK, Z, SHD.
- MEASURED, not guessed: `tmp/orb-dimension/console-fit.html` renders the
  console markup against the real world.css inside iframes at seven viewport
  heights (each iframe is its own viewport, which is what makes vh testable)
  and reports overflow per pod. Before: clipped at every height below 1440
  (worst 24px, NAV at 1080 — 4K at 200% Windows scaling, James's likely case).
  After: 0px at all seven.
- FIX: new `--readout-h` custom property = the actual usable height inside a
  screen (console height minus pod padding, stencil label, screen padding and
  border). Row type is now `min(old clamp, --readout-h / 3.75)` at 1.22
  line-height, so it can never exceed what the glass holds. NAV, which carries
  four rows to everyone else's three, gets `/4.6` at 1.1 leading — the extra
  row costs size instead of legibility.
- Nothing changes at 1440px and above: still 20px / 17px, pixel-identical to
  before. At 1080 the rows land at 16.3px and NAV at 13.3px — smaller than the
  old nominal, but visible, which they were not.

## 2026-07-26 — claude-fable (v53.1 — spawn moved twice as far back)

James: "I think I need to be, like, twice as far back." Spawn 27km → 54km
(pitch stays 0°, still dead on the face). The 12km station now subtends
~13° instead of ~25° — it reads as a place you fly TO rather than one you
are already parked at.

- The spawn now sits IN the nebulae's gulf band (52–82km), so the move
  needed a clearance check before it was safe: nearest bank #1 clears the
  spawn by 13km and the whole approach line by 12.3km. nebula-sim TEST 9
  now guards both — a reseed can never drop gas on the player's first frame
  or on the run home.
- Sight-corridor bounds extended 27600 → 54600 in the orb-field push and
  the station-grid bad() (plus the sims that mirror them). No station or
  orb actually changes — both populations bottom out around 24km, well
  inside the old bound — so the fuel grid does not re-roll; the constant is
  updated to keep the invariant honest for whatever expands next.
- All 9 sims green.

## 2026-07-26 — claude-fable (v53 — THE NEBULAE: gas in the gulf)

James's brief ("the word I was looking for is nebula") → 7 look-dev rounds in
`tmp/orb-dimension/nebula-lab.html` with his notes each round → his go to
move it in. Five banks of glowing gas: one over home in the spawn sky, four
in the gulf band (52–82km), each speaking ONE palette from a five-scheme
deck (mutara / ember / verdant / ice / rose — his call: nebulae get their
own identity, not the reef hue families). Visuals only, no sensor fuzz.

- THE LOOK, from the lab: strands of stretched wisps in 4 size octaves,
  torn alpha (no radial discs), directional shading off the noise gradient,
  dark dust lanes drifting to the lit side, buried furnace knots. Rounds
  fixed: cotton-candy pink → deep field + lit cores; quilted noise →
  features ride puff size; GREEN DRIFT under heavy overlap (premultiplied
  alpha over low coverage races the channels to the 8-bit ceiling — cured
  by keeping color near alpha scale, and the same discipline is now in the
  world shader); fibers → gas (4 gentle octaves, wider shading taps).
- THE SOMERSAULT (James, r7): wisps pirouetted when a strand pointed at the
  camera — its screen projection collapses and the axis direction swings.
  Cure: the stretch RELAXES TO ROUND as the projection degenerates, so a
  degenerate axis has nothing to swing. Quantified, not eyeballed —
  nebula-sim TEST 7 bounds the worst visible axis swing per orbit step
  (6.3° at bar 6.5; the lab's validated build measured 4.8°).
- THE FILL-RATE GUARD (the part that isn't visible): the lab shader
  evaluated 3 fbm — 48 sines — PER FRAGMENT, across ~13 screens of blended
  gas. At 4K that is unshippable, and v33's veil bomb already TDR-crashed
  James's rig once. Two fixes: (1) the identical alpha+gradient field is
  BAKED ONCE at init into a 6-variant atlas (`bakeWispAtlas`, 51ms, no
  fetch — the gas still blows on file://), so a fragment is now one texture
  fetch; (2) an aggressive near-fade (a wisp is gone below 4 of its own
  radii, full at 9) plus smaller size octaves. nebula-sim TEST 6 bars
  interior overdraw at 13.0 screens AT THE DENSITY SLIDER'S CEILING, not
  just the default — the tuner cannot outrun the GPU (slider max capped
  1.2 for exactly this reason).
- Atlas coarse family re-tuned 3.2 → 4.8 after eyeballing the bake: at 3.2
  the radial body term dominates and big wisps read as DISCS — James's
  ball-pit failure mode, caught by the preview before it ever flew.
- Fog: nebulae take haze at 0.08 strength — the veil rule, never
  fog-exempt. Drawn blended after the meshes, before the orb field, depth
  tested (a bank behind Korrudan stays behind it), no depth write.
- GOD MODE group "the nebulae": nebGlow (permanent feel), nebDensity
  (layout — rebuilds on change).
- NEW SIMS: `nebula-sim.mjs` (8 tests: determinism, placement, home-bank
  clearances, puff integrity, palette variety, overdraw, somersault bound,
  flight bounds) and `wisp-atlas-check.mjs` (runs the SHIPPED bake against
  a stubbed GL: cost, upload wiring, per-variant gas statistics, border
  vanishing for mipmap bleed, gradient signal — plus a PNG preview at
  `tmp/orb-dimension/wisp-atlas.png`).
- shader-check.html now compiles NEB_VS/FS too — and immediately earned it:
  it caught an undeclared `r` left behind when the fbm block was swapped
  for the texture fetch, which would have silently killed the entire
  nebula pass at runtime.
- reef-sim TEST 9 DE-FLAKED: it sampled 20k fuel probes with unseeded
  Math.random against bars close to the real distribution, so it failed on
  unlucky rolls (caught in a full-suite run). Probes are seeded now — same
  coverage, same numbers every run. A guard sim that cries wolf gets
  ignored.
- All 9 sims + init-smoke + shader check green, twice over. Build stamp v53.
- AWAITING JAMES'S FLIGHT: the look in-world (this is the first time the
  gas has been seen anywhere but the lab), bank placement, glow/density by
  eye, and whether the interior thins too much on entry — the near-fade is
  the knob, and it's the one holding the frame rate, so we tune it against
  TEST 6 rather than freely.

## 2026-07-25 — claude-fable (v52 — KORRUDAN STATION: the Knowhere pass)

James's brief after flying v51: the head read 20× his ship, not 2000×, and
the v51 machine cloud obscured it. Reference study: Knowhere (GotG) — bone
dominant, machinery in crusted districts, scale sold by thousands of tiny
lights. His calls: 12km skull, keep the Meshy mesh, halfway window glow,
REMOVE Vess-Karai ("cool experiment, another format later").

- VESS-KARAI RETIRED: pyramid loader/draw/nav row/caretaker beat/courtesies
  all removed; assets/pyramid/ + pyramid_build.py archived on disk. Its hum
  synth survives as the CITY HUM — gain now steered by distance to the
  crust (sound.cityHum). v47-sim TEST 1 now asserts the retirement is clean.
- SKULL ×20 (SKULL_SCALE 3 → 20): 12km tall, spanning the core's full
  height. Everything re-derived: eyes (fix ±1800/32.7/3811.3, r 1067), gaze
  (clamp 48→320, engage 6→18km — seated rule holds, clearance scales to
  ~353m), spawn [0,0,27000] with SPAWN_PITCH reset to 0 (James recalibrates
  by eye), skull fog softened 1.6→1.05 so the monument reads at 27km.
- SKULL_EL [4600,7100,6700]: the station keep is an ELLIPSOID now (a 12km
  head is not a sphere). Used by: station-grid bad(), the orb-field push
  (assemble), capital sun push, the city hum. Sight corridor stretched to
  z 27600, radius 2100–2300.
- CAPITAL DE-CLOUDED: Tonic's machine core is GONE — Korrudan is the body.
  Satellites keep their full v51 cores. Capital keeps: suns (pushed outside
  the ellipsoid), bridges, 3 cranium feeds (targets rescaled), 10 orbital
  hoops (6.4–9.2km) and 26 through-the-bone threads at station scale.
  capital coreR = 7400 (crust envelope) for orbits/standoffs.
- THE CRUST — the city ON the bone: tmp/orb-dimension/crust_points.mjs
  samples the real skull surface (area-weighted, interior/mouth/socket
  filtered, region-tagged jaw/crown/side/back/face, 22 districts) into
  assets/skull/crust.bin; crustGeometry() in world.js (CRUST_SEED marked
  block) grows shanty stacks with LIT WINDOW GRIDS (the scale ruler — new
  aux-kind-2 branch in the solid shader, windows resist fog pow 0.55),
  gantry masts, tank farms, a warm refinery jaw (positional warmth — the
  whole chin is one furnace), and a two-ring mechanical IRIS in each eye
  socket (the red eyes stay). Face region ~bare (sim-asserted <35% of jaw
  density). ~19k tris, drawn in the capital's commDraw slot, served-only.
- FUEL: the ellipsoid carves the grid's center, so Korrudan seeds its own
  doorstep ring (6 H2O + 3 DEU just off the crust, sightline-guarded).
  Forgiveness bars hold (p95 6.7/8.2km, max 10.3/13.0km — reef-sim TEST 9).
- Capital castes rework: archivists orbit OUTSIDE the bone (1.06–1.3 ×
  coreR), wrights hop crust-point to crust-point near their bearing (no
  chords through the skull). NAV: KORRUDAN standoff 2600→8800.
- NEW SIM crust-sim.mjs (7 tests: atlas sanity, determinism, anchorage,
  face-readability, budget, iris rings, warm jaw). All sims + init-smoke +
  shader check green. reef-sim gaze/station/corridor tests updated to v52
  numbers; society-sim TESTs 3/8/11 rewritten for the ellipsoid contract.
- AWAITING JAMES'S FLIGHT: the 27km approach (scale read!), window-glow
  density (halfway setting), hoop presence, refinery warmth, spawn pitch.

## 2026-07-25 — claude-fable (v51.1 — hotfix: world would not load)

James's report: only the ship chrome loaded. Cause: the v51 caste-spawn code
called `vnorm` inside makeActors — but `vnorm` is a flight-section const
declared AFTER the init-time rebuildAll() call. TDZ ReferenceError at init;
the IIFE died before the renderer started. The extraction sims can never see
this class of bug (they only evaluate the society block). Fixes:
- spawn normalizes by hand (no flight-section helpers at init time).
- NEW SIM: `tmp/orb-dimension/init-smoke.mjs` — runs the whole world.js IIFE
  in Node under a stubbed DOM/WebGL2 (init + two rAF ticks). Verified it
  fails on the exact v51 bug and passes on the fix. Run it after ANY world.js
  change, alongside the extraction sims.

## 2026-07-25 — claude-fable (v51 — THE CAPITAL WRAPS KORRUDAN + the Cadence castes)

James's directives, built same session: the capital moves ONTO the skull,
robotic complexity doubles, and six new Blender-built robot kinds populate
all four hybrid towns.

- CAPITAL_POS → [0, 0, 0]: Tonic is now built around and through the
  god-skull itself. New capital-only geometry: 8 wrap hoops banding the bone
  at 950–2450m (leaning axes — never a face-on cap), 26 long threads passing
  clean THROUGH the head (depth test hides the middles inside the bone).
  Element-center discipline (`faceClear`): big planes/slabs resample off a
  face cylinder (z 700–4800, r 1250) and out of the bone (r 1500) — the red
  eyes stay readable from spawn; only thin webbing crosses the view.
- THE SKULL FEEDS: three capital suns — picked greedy-farthest-apart —
  drive wide ribbons from sun skin to deep inside the cranium. Bridge shader
  aux.w=1 marks a feed: three packets streaming INWARD only over a hotter
  carrier (no return traffic; the god gets fed, it does not answer). Stored
  in `GEO[0].feeds`; society-sim TEST 11 asserts 3 feeds, distinct suns,
  termination inside the cranium, satellites feed-free.
- CAPITAL SUN COURTESIES (deterministic pushes, no RNG): suns clear the
  spawn sightline cylinder and keep 3.2km off Vess-Karai (literal Lantern
  coords inside the block — it must stand alone in the sim).
- ROBOTIC ELEMENTS DOUBLED (all four towns): data planes 24→48, slabs
  40→80, webbing struts 110→220, tesseract frames 8→16. New mechanical
  kinds: 6 gear-band rings girdling each core, 18 elbowed conduit runs,
  10 antenna masts with cross-arms. ~8.3–9.6k tris per community (bars
  20k/60k hold); glass overdraw worst probe 7.9 screens (bar 15).
- THE CADENCE CASTES: six citizen robot kinds, built from primitives in
  headless Blender (`tmp/orb-dimension/cadence_robots.py` →
  `assets/robot/cadence-01..06.bin`, magic CBOT, same layout as robot.bin,
  + shared 256px flat-color `cadence-palette.jpg`, UVs pinned to swatch
  centers — the Jerry's Pool denizen spirit in 3D). Kinds: chanter
  (tuning-fork monk, sings to its sun), lattice-wright (open cube frame +
  tool arms, works the webbing), archivist (gyro sphere, circles the core),
  ferry (cargo barge, shuttles the light bridges sun-skin to sun-skin),
  warden (broad sentinel, walks the shell perimeter), gardener (hanging-arm
  pod, tends sun crystals). Spawn: 3 of each at the capital, 2 at each
  satellite (54 total), each with an under-hull work glow (fleet trick).
  Served-only like the fleet; file:// towns just have no citizens out.
  Shared ROBOT_VS/ROBOT_FS hoisted (fleet + castes, one shader; palette on
  its own texture unit); one VAO bind per kind per frame, 14km cull.
- Society-sim rewritten where the contract flipped: TEST 3 now asserts the
  capital IS seated on Korrudan (plus sun clearances), TEST 11 added for
  feeds. All 11 pass; reef/v47/ladder/stick sims green; all shaders
  (incl. new bridge feed branch + hoisted robot pair) compile-verified.
- Nav row: "the capital · wrapped around Korrudan". Help panel documents
  the castes. Build stamp v51.
- Preview sheet for James: `tmp/orb-dimension/cadence-preview.png`.
- AWAITING JAMES'S EYES: the wrapped capital from spawn, feed read,
  element density, caste silhouettes/scales (all tunable by eye next pass).

## 2026-07-24 — claude-fable (v50 — THE COOPERATIVE SOCIETIES, Phase A: the bones)

James's go after full plan consensus (names, procedural-vs-Meshy, scale,
hexagram placement, satellite sizing). The peoples: the SAELYRI (beings of
light) and the CADENCE (the machine society — it named itself in the common
tongue, for its own heartbeat). Four communities: the capital TONIC in the
Korrudan core precinct at [-15000, 2600, -12000], satellites MEDIANT /
DOMINANT / SUBDOMINANT on the opposite points of a six-pointed star against
the reef colonies — colony ideal angles +60°, at HALF the ring radius
(~125 km), own seeded jitter/height. Chord-degree settlement names: flag for
James's veto.

- COMMUNITY GENERATOR (`communityLayout` / `communityGeometry`, SOCIETY_SEED,
  sim-extracted markers `const SOCIETY_SEED =` … `// society hues`): per
  community a lopsided Cadence core (iridescent glass planes, data-rain
  planes, gunmetal slabs, strut webbing with racing data pulses, nested
  tesseract frames) and 7–9 Saelyri nodes — mini-suns with internal crystal
  planes — on jittered dodeca-face seats, flattened 0.78, joined by
  light bridges (nearest neighbors AROUND the shell, never through the
  middle) carrying two-way pulse packets in the endpoint node colors.
- FULLY PROCEDURAL (the consensus call): three new GL programs (solid /
  glass / bridge) on one 15-float vertex layout, community-local verts +
  ship-space uOrigin (v49 camera-relative discipline). Works on file://.
  ~3.6k tris per community. Detail culls at 300km with a 50km fade feather
  (fog owns it long before); node HEARTS (beacon trick) carry the
  long-range read — every society is a small constellation across the map.
- STATIONS: capital airspace via radial push (assemble()'s skull-KEEP
  pattern, no RNG consumed — the v38/v49 forgiving-fuel numbers survive
  exactly); satellites get doorstep clusters (2 H2O + 1 DEU outside the
  shell). Counts now 76 water / 42 deuterium.
- NAV: "the cooperative societies" section (Tonic/Mediant/Dominant/
  Subdominant), standoff parks outside the node shell. GOD MODE group
  "the societies": commScale / commSat (0.66 default, James-approved) /
  commVert / commJitter (freeze with geography) + nodeGlow / pulseTempo
  (permanent). Satellite DISTANCE is deliberately not a dial — derives from
  colonyDist/2 so the hexagram survives ring tuning.
- VERIFIED: new `tmp/orb-dimension/society-sim.mjs` (10 tests: determinism,
  hexagram, precinct clearances, shells, bridge graph, mesh sanity,
  separations, station respect, glass overdraw 5.0 screens vs bar 15,
  bounds). reef-sim updated (station chain now evaluates the society block;
  counts 76/42) — all 10 pass with the ORIGINAL fuel distribution. ladder,
  stick, v47 sims pass. All four community shaders compile+link verified in
  a no-audio harness (tmp/orb-dimension/shader-check.html). Stamp v50.

Where things stand: Phase A bones await James's eyes (his preset james-prefs-01
is the start preset — file-backed as of v49.4). Phases agreed and pending, each
with its own checkpoint: B = the peoples (Saelyri SDF light-forms with the
geometric morph set, fleet community routes, acknowledgment), C = resources +
harvest verbs (crystalline tritium / oxygen + lithium asteroids), D = the reef
expansion (quadruple size, 3 new creatures, gestaltic glyphs, neuronal bodies,
titanium filaments). Sound for the societies: deferred to B deliberately.

## 2026-07-24 — claude-fable (v49.4 — presets become a file: saving IS telling Claude)

James's better idea, minutes after v49.3: don't add a send step — make saving
a named preset just write a file. Done; the "→ claude" button lived one
version.

- Preset store is now `assets/presets.json` (committed, sessions read AND
  write it). Server: `GET/PUT /api/worlds/:slug/presets` (generic, any world;
  shape-validated, timestamped backups to tmp/<slug>/preset-backups/).
- World: every preset save/delete/set-as-start PUTs the whole store; on boot
  (served) the file is fetched and wins — picker repaints via the
  onPresetStoreReplaced hook. localStorage stays as boot cache + file://
  fallback. First served load with browser presets and an empty/absent file
  SEEDS the file (so james-prefs-01 migrates itself on next reload).
- A start-preset change made in the file applies on next reload, never
  mid-flight. Smoke-tested GET/PUT round trip + validation rejection; all
  four sims pass; stamp v49.4.

Where things stand: still awaiting the first big-dimension flight verdicts.
James reloads → his presets appear in assets/presets.json → any session just
reads the file. Claude edits to the file show up in the picker on his next
reload.

## 2026-07-24 — claude-fable (v49.3 — "→ claude": tuner presets get a channel to the session)

James saved a preset (james-prefs-01) and asked how to "tell" Claude his
settings — localStorage is browser-side, invisible to the session. Built the
channel he asked for:

- New tuner button "→ claude" in the presets row: prompts for a one-line note,
  then POSTs the live cfg snapshot + ALL named presets (+ which is default) to
  the dev server. Served-only; under file:// it reports "no server ✗".
- New server endpoint `POST /api/worlds/:slug/prefs` (generic, any world):
  writes a timestamped JSON dump to `tmp/<slug>/prefs/prefs-<stamp>.json`
  with { saved, world, note, cfg, presets, default }. tmp/ is gitignored —
  it's a message to the session, not shipped data.
- Flow: James clicks → types a note → tells Claude "sent" → Claude reads the
  newest file in tmp/orb-dimension/prefs/. Endpoint smoke-tested; all four
  sims pass; stamp v49.3.

Where things stand: still awaiting the first big-dimension flight verdicts.
When James sends a dump he wants kept, bake those values into cfg defaults
(or the presets story of a later phase) — the dump file itself is ephemeral.

## 2026-07-24 — claude-fable (v49.2 — the ball pit was the veils: scaled fog restored)

The ghost balls survived v49.1 ("a ball pit at the McDonald's" — James). He
invited a browser look ("if you wanna load a browser and take a look, you
should") and one screenshot settled it: the halos were innocent this round —
the VEILS were the balls. v49 had moved them to the 500km walls and made them
fog-EXEMPT; their entire dim-mottling character had only ever existed under
v38 fog (they rendered at 0.14–0.66 of authored brightness), so exemption
lit 84 giant spheres at full alpha.

- Fix: veils get fog at 0.05 strength (walls moved ~21x out, so 1/21 fog
  reproduces the v38 rendered brightness at the same viewing angles) instead
  of exemption. One shader line. James: "looks way better."
- Halo long-range gate (v49.1) stands — the two layers were separate crimes.
- Stamp v49.2; all four sims pass.

Where things stand: James has SEEN the big dimension (looks right now);
full flight-feel verdicts (250km distance, dust density, beacon brightness,
overdrive slam) still to come. Tune points if the walls read wrong: the 0.05
veil-fog scale in the FS, or delete the veil layer if space should have no
walls at all.

## 2026-07-23 — claude-fable (v49.1 — the halo becomes long-range only)

James finally asked what the "ghost balls" were: the halo layer — the cave-era
scattered-light envelope around every orb, controlled by the glow slider. His
read was right: up close it's just a second translucent ball, and the world is
space now, not a cave. Fix (his go, "give 'er a whirl"):

- DISTANCE GATE: halo fades in from 40 to 140 radii of distance — within ~40
  radii you see only glass and light; far away the halo still does its real
  job (a distant orb reads as a glow at all). Heart-flagged beacons/sun keep a
  constant gate ratio via the never-shrink radius — still lit across the map.
  Veils exempt (they are scattered wash on far rock, the one place the cave
  logic still holds).
- TIGHTENED: falloff pow 2.2 → 4.0 — what remains at range reads as radiance,
  not a shell with an edge. The breathing pulse survives (distant twinkle).
- Glow slider now means "long-range luminance." Stamp v49.1; all four sims pass.

Where things stand: still awaiting James's first big-dimension flight — now
without the ghost balls. If the far-field reads too dim with halos gated, the
40/140 radii thresholds are the tune points (in the FS halo block).

## 2026-07-23 — claude-fable (v49 — THE BIG DIMENSION, phase 1: the flight-feel expansion)

James's go, same session as the spec. Scope was deliberately "prove the bones":
size, ladder, ring — nothing decorative.

- SPACE: flight bounds are 1,000 × 1,000 × 250 km (SPACE_X/Z/Y half-extents
  500k/500k/125k). The populated core keeps the old 48×48×12 as CORE_X/Z/Y —
  field, station grid, skull, Lantern all exactly where they were. Far plane
  80km → 1,600km. Veils moved to the REAL walls (fixed coords at ±SPACE, ~21×
  radius, fog-exempt in the shader — rock 600km away still reads).
- CAMERA-RELATIVE RENDERING: the whole scene renders in ship space. Orb
  instances subtract cam.pos in float64 at upload; the view matrix is
  rotation-only; skull subtracts uCamPos in its VS; robots seat their model
  matrix relative; the Lantern gets relative origin/light uniforms. This is
  the float32-jitter fix that makes 250km colonies renderable up close.
- FLAT SPEED LADDER (never a sum — max-magnitude of impulse vs thrust):
  impulse 240 free · booster 1,200, 240s H2O, full in 5s · overdrive 3,600,
  360s DEU, slams in 3s. All cfg-driven (GOD MODE). Engine audio and HUD
  normalize to the cfg tops. Autopilot cruises up to overdrive speed for the
  long hauls (the "grab a drink" loop).
- THE RING (James's layout spec): the three reef colonies moved out to a
  jittered triangle ~250km from center, mid-plane — colonyLayout(LAYOUT_SEED),
  dials colonyDist/Vert/Jitter in the tuner, applyColonyLayout() → relayout()
  re-seats colonies/stations/actors without re-rolling the field. Names kept
  (Yth-Alune flagship + hidden exit, Sorrek Bloom, Vhal-Imir). Each colony:
  a heart-flagged BEACON (fog-proof family-color smudge visible across the
  map) and a doorstep cluster (2 water + 1 deuterium, outside the shell).
- CAMERA-LOCAL DUST: motes recycle through a ±4km/±2km box around the ship
  (wrap in the frame loop) — honest parallax at 3,600 m/s anywhere in the gulf.
- GOD MODE tuner groups: "drive" (3 tops, 2 tanks, 2 spools) + "the ring"
  (3 layout dials, rebuild-on-release). Tuner panel got a max-height scroll.
- Robots became explicitly LOCAL workers (40km leash, nearest-station
  fallback) so nobody signs up for a three-day haul; Lantern caretakers spawn
  at their post; colony-doorstep stations mean some robots work the ring.
- VERIFIED: reef-sim updated (new extraction incl. layout block, v49 bounds,
  station counts 70/39, colony-doorstep forgiveness, new TEST 10 ring
  determinism/spec) + NEW ladder-sim.mjs (source-guards the flat-speed and
  camera-relative lines; asserts spec math: 1,000km = 77% of a DEU tank,
  diagonal 1,436km > 1,296km range, spools hit 98% on the mark) + v47-sim
  (floor const) — all four sims PASS. Build stamp v49.

Where things stand: awaiting James's first flight — this whole phase exists so
he can feel the size before anything else gets built. Everything else in
expansion-spec.md (stargates, depot grid, grown reefs, hub society, luminous
region) remains spec-only. Watch for: dust density at rest (box is ±4km,
tunable), beacon brightness, whether 3,600 needs more speed-reading than dust
alone, HUD POS pod width at 6-figure coords.

## 2026-07-23 — claude-fable (expansion spec recorded — no code changes)

Planning session for "the big dimension." James riffed the numbers live and settled a
phase spec, recorded in `expansion-spec.md`: 1,000×1,000×250 km space, flat non-additive
speed ladder (impulse 240 free · booster 1,200, 240s tank, 5s spool · overdrive 3,600,
360s tank, 3s spool → 1,296 km per tank, so a 1,000 km crossing lands with ~23% reserve
and only the diagonal forces a depot stop), 5–6 stargates, guaranteed-find fuel-depot
grid (~50 km default). Key design rules that emerged: tank-as-ruler shaping (one tank ≈
one map plus reserve), overdrive slams while booster builds, "every gate has a road."

Also in the spec: a GOD MODE tuner-controls running tally (James's list, keeps growing —
top speed and tank length are the key knobs) with the constraint that geography is NOT
god mode: overall size and key POI locations eventually finalize and freeze, v38-style.
Feel is forever tunable, the map is eventually law. Late riff, unsettled: circular or
spherical space — Claude's read is boundary shape is nearly free and nearly imperceptible;
the real lever is population shape (galaxy-disc distribution inside any boundary), noting
a 1,000 km disc/sphere kills the tank-out-ranging diagonal.

Where things stand: SPEC ONLY. world.js untouched — current build still flies
120/400/1200 additive. Next step is a build plan drafted from the spec's open-questions
list (gate placement, core relocation, clump character, depot catch, 3,600 m/s
readability), discussed with James, explicit go before any code.

## 2026-07-22 — claude-fable (v48 — the drag-stick: deflection steering with a saturation rim)

James named the problem precisely: with relative-drag steering he had to keep
moving the mouse "farther and farther" to hold a turn — he'd independently
invented the saturation radius every mouse-flight game uses. Discussed first
(his call: build my recommendation, tune by feel), then built:

- DRAG-STICK: pressing plants a virtual joystick where you clicked; the
  pointer's offset from that anchor commands a turn RATE. Deadzone (14px),
  response curve (^1.7 — gentle near center for aim), and a saturation rim
  (260px) past which more distance adds nothing: park the cursor at the rim
  and the ship holds its best turn forever. Nothing accumulates in pointermove
  anymore — the frame loop reads the live offset and feeds pending at rate*dt,
  exactly like the arrow keys, so the v47 critically-damped servo still owns
  all smoothing. Pitch max 30°/s vs yaw 42°/s (~70% — kinder to the stomach).
- INSTRUMENTS: a faint ice-blue anchor dot + dashed saturation rim (reticle's
  palette — orange stays nav's), shown while steering or once a press is
  clearly a hold; the rim brightens at full deflection so "farther adds
  nothing" is visible. z-index 5, under the nav ring.
- HANDS-ON DISCIPLINE: crossing the deadzone is the "hands on" signal — it
  arms the stick and releases autopilot/leveling. AutoNav engage, R, and H
  all DISARM it (stickLive=false), so a cursor merely parked off-center can
  never steer; the hand must move again to reclaim the ship.
- TUNER: new "the stick" group — mode select (drag-stick / center-stick,
  the latter always-on at screen center, Freelancer style), dead zone, reach,
  yaw °/s, pitch °/s, response. Presets carry stickMode like grouping.
- VERIFIED: new `tmp/orb-dimension/stick-sim.mjs` (source-guard on the
  shipped formulas + 6 tests: deadzone, saturation, signs, monotonic curve,
  servo settles on command with zero overshoot and dies on release). v47-sim's
  stamp check now accepts any v>=47. All three sims pass.

Where things stand: James hasn't flown it yet — defaults are educated guesses
awaiting his hands. Center-stick mode is built but untried. If the drag-stick
feels wrong, the old feel is NOT a tuner setting — it was replaced; the
changelog history (v9–v47) has the full flight-model account.

v48.1 (same day, after James's first flight): "definitely an improvement" —
but the rim circle was too present, maybe unnecessary. Hidden via STICK_RIM
flag in the stick block (physics and anchor dot untouched, rim DOM/CSS kept);
flip the flag to bring it back. Stamp bumped to v48.1 so a stale tab is
detectable.

v48.2 (same day, James's spec, verbally precise): the stick is PINNED to the
center reticle — "don't follow the mouse click around... pin it to the
middle." Center mode is now hold + pull: grab must BEGIN within reach/2 of
the reticle (a drag started out at a portal stays a drag), pull away =
increasing turn pressure through the same deadzone/curve/saturation, release
or return = neutral. Arming is per-hold (pointerup always disarms). No dot,
no rim in center mode — the reticle itself marks neutral; the always-on
no-button center variant from v48 is gone. Drag-stick survives as the tuner
alternative. One-time migration (stickModeV) forces saved v48 cfgs onto
center once; after that the tuner choice rules. Same deflection math —
stick-sim still passes untouched.

v48.3 (same day): James felt roll fighting the pull ("upside down, it wants
to pull the other way") — correctly diagnosed: the v26 coordinated bank-carve
rotates around WORLD-vertical while the stick pulls in SCREEN space; at steep
bank it bends the ship off the mouse line, inverted it reads reversed. Fix:
the carve yields to the hand — scaled by (1 − stickMag), so full pull = pure
mouse authority, hands-off banked flight keeps the v26 carve exactly. The
carve line is now source-guarded in stick-sim.

v48.4 (same day): the yield wasn't enough — James's pencil spec retired the
v26 carve outright: "A and D shouldn't make me do anything except rotate the
ship around its middle axis... like a pencil coming all the way straight
through the middle." His test case: flying at the skull + D should corkscrew
with the nose glued to the skull, not careen right. The carve was the
pre-stick era's only way to turn in flight; the stick owns turning now.
BANK_CARVE flag (default false) keeps the v26 code one flip from returning.
Roll still banks-and-stays; R still levels.

v48.5 (same day): "this feels better... I should turn slower" — max turn
rate defaults dropped 42→28°/s yaw, 30→20°/s pitch (ratio kept). Stick
migrations restructured into a versioned ladder (stickModeV, now 3) — each
voice-made feel decision force-applies once over older saved cfgs, then the
tuner rules. The rates remain live sliders (TUNE → "the stick") for James's
by-eye pass.

v48.6 (same day): with the stick slowed, roll stopped keeping up with the
nose ("time for the rolling to keep up with the nose pull"). ROLL_RATE
0.46→0.51 rad/s — James's protocol: +10% per step, iterate by ear until it
sits. History of this const: 0.66 → 0.46 → 0.51.

## 2026-07-21 — claude-fable (v47 — THE DIMENSION WAKES UP: interiors, worldlets, Vess-Karai, colony life, the fleet)

James's six-item brief ("surprise the shit out of me", 100 Meshy credits authorized —
81 spent), all built:

- SMOOTH STEERING: the mouse-look ease is now a critically-damped second-order
  servo (LOOK_W 10) — angular velocity is continuous, so hand jitter can't echo
  into rapid back-and-forth. Net rotation still equals drag distance. Verified by
  sim: 3.4x less 8Hz jitter in output velocity, half the peak jerk, same latency.
- VESS-KARAI, THE LANTERN: a 1km beveled glass pyramid (Blender headless →
  `assets/pyramid/pyramid.bin`, magic PYRA, 284 flat-shaded tris) standing on the
  cave floor at [9500, −5850, 6500] — apex 850m above the flight floor, provably
  outside the station grid and sight corridor. Fresnel glass pass (facets quiet,
  beveled ribs catch rim light), a white-gold fog-proof sun pulsing inside, a warm
  wash pooling beneath, six ember lights circling the base, a low 55Hz beat-hum
  within 2km. On the NAV panel under the monument section (standoff 1500).
- ORB INTERIORS: instance data grew 16→20 floats (i4 = kind, p0, p1, activity).
  ~52% of field orbs now carry an interior; every one is a vague glowing nothing
  from afar, stirs as you approach, and is fully awake beside you (act 0/1/2,
  distance-driven, smoothed, thresholds scale with orb size). 23 procedural scenes
  in the fragment shader — James's list (swirl lights, water+fish w/ bubbles,
  kaleidoscope, metaball blobs, orrery, tech×6: reactor/data-rain/radar/gyro/
  circuit/beacon — tech deliberately common) plus inventions: snow-globe city,
  storm orb w/ lightning, ember hive, clockwork, galaxy, the eye that opens when
  you get close, forge, singing crystals, moons, metronome, jellyfish tank,
  library w/ a book that leaves its shelf. Three Meshy paintings live behind
  glass as rare finds: THE BEAR READING (moss-green, spectacles, tea — ~1 in
  170 orbs), a bioluminescent terrarium, an inventor's workshop.
- WORLDLETS: five Meshy planet maps (lava, ice, gas giant, ocean, desert) on a
  1024² texture array; ~8% of field orbs render as rotating lit planets —
  seed-keyed light direction, limb darkening, hue-tinted atmosphere, night-side
  city lights that only sparkle at act 2. Longitude samples mirror-wrapped, so
  the maps never show a seam. Welcoming ring guarantees: gas worldlet, reactor,
  the bear, and the fish near the skull.
- COLONY LIFE: polyp pulses are COORDINATED now — phase falls with distance from
  each colony's heart, waves of light rolling outward (fadePhase math in
  makeReef; the extracted reefGeometry block untouched — all 9 sim tests PASS).
  Per colony: 10 exchange motes arcing polyp-to-polyp on eased Béziers, 8 rune
  glyphs (64-rune seeded canvas atlas, unit 4) drifting out into the dark, and
  three energy species — 5 darters (closed-form lissajous streaks with 3-echo
  tails, screen-space elongation), 4 pulse jellies, 6 flutter moths on figure-8s
  around favorite polyps. Colony comms chatter (sparse glassy blips through the
  cave echo) within 2.6km.
- THE FLEET: 14 service robots — James's Meshy bot (meshy-6 text-to-3d + refine,
  the credits' centerpiece: cyclops eye, teal panels, hazard-striped hover skirt)
  prepped headless to `assets/robot/robot.bin` (RBOT, 9k tris, 6m tall) + 1K
  basecolor. Own mesh pass, per-robot matrix, engine-light-from-below in the
  shader, hover bob. Job loop: travel (eased, ~110 m/s max) → service (patient
  orbit) → next client; clients weighted to inhabited orbs, then depots,
  colonies, and the Lantern (robots 0–1 are its dedicated caretakers). Cargo orb
  swings below on supply runs; cyan engine glow brightens with speed. A robot's
  visit WAKES its client orb (svc boost → act). Fleet is served-only (mesh
  fetch) and stays fully dark on file://.
- Draw order: skull + robots (opaque, depth-written) → Lantern glass (blended,
  no depth write) → orbs (depth-tested, no writes). Orbs behind the glass shine
  through it, as glass full of light should.
- Verification: `tmp/orb-dimension/v47-sim.mjs` (6 tests: binary formats, robot
  height, Lantern placement invariants, instance-stride wiring, shader kind
  coverage, asset presence — ALL PASS) + reef-sim 9/9 + all 8 GLSL shaders parsed
  clean (@shaderfrog/glsl-parser) + node --check. Stamp v47.
- UNTESTED BY JAMES'S EYE (all one-number tunes): interior brightness/scale per
  scene, worldlet rotation speeds, glass alpha + inner-glow strength, creature
  sizes, act distance thresholds, chatter/hum levels, and ROBOT_FACING (flip to
  −1 in world.js if the fleet flies backwards).

## 2026-07-19 — claude-fable (v46 — mouth globe removed)

- James pulled the v45 mouth globe after seeing it ("that's my fault, just
  take that out") — makeMouth() and its wiring removed clean. The eyes and
  the mouth's warm shader pulse (v27) are untouched. Stamp v46.

## 2026-07-19 — claude-fable (v45 — the red globe in Korrudan's mouth)

- Per James: a red globe up inside the roof of the mouth. Palate located by
  probing skull.bin for downward-facing normals in the mouth region
  (canonical centroid 0,−117,155); the globe (r=100, flag-3 red like the
  eyes) seats at world (0,−361.6,513.5) — nested up into the bone by the
  depth test, glowing down into the mouth, pulsing on the old Heart's 7s
  beat. Visible from spawn as a red star inside the open jaw (flag 3 carries
  the star-size floor). It does not gaze-track; only the eyes do. Stamp v45.

## 2026-07-19 — claude-fable (v44 — impulse coasts)

- James: releasing W at 120 m/s in space should not be a wall. Impulse now
  has its own velocity state: quick ramp while held (τ 0.5s), and on release
  it coasts on the same 3.2s constant as the thruster — forward and reverse
  alike. X (all-stop) bleeds it fast like everything else; H zeroes it; the
  autopilot's release point accounts for impulse + thrust coast distance.
  The instant stop is gone. Stamp v44.

## 2026-07-19 — claude-fable (v43 — N toggles NAV, lock-on autopilot)

- N toggles the NAV panel from the keyboard (any other key hands control
  back — see below).
- LOCK-ON, per James's spec: with a target ringed, hold the nose on the ring
  (the existing ~3° lock) for 3 continuous seconds → the ring ARMS (bright,
  breathing). Click inside the armed circle → autopilot: the nose eases onto
  the course (0.5 rad/s cap), nav-assist thrusters cruise at up to 900 m/s
  (distance/8, floor 140 — no tank drain), mode line reads AUTO, ring shows
  a steady double border. Release point = standoff + |thrust|·3.2s (the
  coast time constant), so the ship cuts power one coast-length out and
  drifts to a stop at the doorstep: 2600m off Korrudan (the buffer edge),
  700m off a colony, dead on top of a fuel station (the flyover refuels).
- ANY control input cancels: keys (except N), mouse steering, H, X. Panel
  retarget also resets the arm/lock state.
- Controls card: N row + a lock-on explainer. Stamp v43.

## 2026-07-19 — claude-fable (v42 — spawn aims between the eyes)

- James: dead-on at the skull needs pitch −3 from spawn. Baked it: the spawn
  basis (and H-home) now loads with the nose dipped 3° — position unchanged
  at [0,0,20000], ATT honestly reads PIT −03, R levels to the true horizon
  as always. spawnBasis() is the one source of the starting orientation.
  Stamp v42.

## 2026-07-19 — claude-fable (v41 — spawn at z 20,000)

- Start position and H-home moved to [0, 0, 20000] — a proper long approach
  to Korrudan across the static space (face ~19.4km out; ~16s of overdrive).
- The load-in sight corridor stretched with it (z 0..20600, both the orb
  exclusion and station placement) so nothing parks in the view on the way
  in. Sim re-run: all 9 PASS (stations re-jittered around the longer
  corridor, forgiveness bars unchanged). POS Z placeholder updated.
  Stamp v41.

## 2026-07-19 — claude-fable (v40 — the parked-bank drift, solved)

- James pinned the "side-to-side coasting": bank the ship (A/D), stand still,
  and the view slides sideways forever at 0 m/s. That was the v26 coordinated
  turn carving heading at ANY speed — pure rotation, so the speedo was right.
- Fix: turn authority now scales with speed (|speed| / 120, capped at 1) and
  is zero at a standstill — wings need airflow. Held banks still sweep full
  circles the moment you're moving at impulse speed or better; a parked
  banked ship just sits there, tilted and patient. Stamp v40.

## 2026-07-19 — claude-fable (v39 — slimmer bays, button stack past the fuel gauge)

- All dash bays slimmed another notch per James (pods 11% → 9.5%, SYS 8.5%,
  FUEL 11.5%, cluster 22% → 19% / min 210px).
- NAV / TUNE / CTRL now stack vertically in the bay row itself, just past the
  fuel gauge — no longer floating at the console's absolute top right. Same
  instrument glass, tighter padding. Stamp v39.

## 2026-07-19 — claude-fable (v38 — impulse, fuel, NAV, and the space goes static)

Big approved batch (plan discussed, James: "love all suggestions", tanks doubled).

- FLIGHT: W/S renamed IMPULSE, 80 → 120 m/s, burns nothing, mode line shows
  IMPULSE. Overdrive 800 → 1200 m/s (engine drone rescaled to match). The
  controls card now says "reverse booster" for S + shift.
- THE SPACE IS STATIC: 48 × 48 × 12 km — the old slider maximums, now
  SPACE_X/Z/Y constants. Spread sliders and "the space" tuner group removed;
  sanitizeCfg() overrides stale saved presets. Defaults densified for the
  bigger volume (orbs 140 → 400, dust 1400 → 2200) and the veil patches
  doubled (r 3200–5200) to keep the same angular wall cover. sim.mjs updated
  to the new cfg: all 6 legacy tests still PASS.
- FUEL (forgiving by design): H2O tank feeds the booster (180s of continuous
  burn), deuterium feeds overdrive (120s). Dry tank = that drive refuses
  (ENG reads NO H2O / NO DEU; overdrive sputters out with the wind-down);
  impulse is always free — limp, never stranded. 64 water globes (knots of
  blue glass) + 36 deuterium depots (tight hot amber-green pulses) at seeded
  STRATIFIED positions — pure-random left 14km voids, the jittered grid
  caps the worst H2O gap at 9.7km (TEST 9). 150m flyover refills to full:
  two-note chime through the cave echo (water high/glassy, deuterium lower)
  + the meter sweeps up with a glow flourish. New FUEL bay (same glass) with
  H2O and DEU bars; they breathe amber below 25%.
- NAV: third deck button. Panel lists Korrudan (the Head), the globe-thread
  communities by name — Yth-Alune, Sorrek Bloom, Vhal-Imir — and
  water/deuterium (nearest at click). Click to target: orange ring on the
  item (edge-clamped off-screen, name + live distance beneath), pointer
  arrow orbiting the reticle toward its bearing; within ~3° the ring locks
  solid and the arrow stands down. Click again to clear.
- reef-sim.mjs grew TESTS 7–9 (station determinism/exclusions/forgiveness);
  extraction-marker gotcha: the markers also appear in doc comments — the
  sim anchors on `const STATION_SEED =` with an offset search. ALL PASS ×9.
  Stamp v38.

## 2026-07-19 — claude-fable (v37 — longer coast, X all-stop, deck buttons + controls card)

Three James asks in one pass (his fourth item — side-to-side coasting should
be shorter — is PENDING a numbered-question answer: there is no lateral
velocity in this flight model, so it's either the bank-turn carving during a
coast or the mouse-look ease; waiting on which before touching either).

- Coast: free-coast time constant 1.6s → 3.2s — releasing a burn now carries
  you roughly twice as long. The all-stop exists precisely so the long drift
  never becomes a nuisance.
- X = ALL-STOP: the clear "stop in space" control. Cancels overdrive (with
  the wind-down thump), bleeds thrust at τ 0.35s — fast but no head-snap —
  console reads BRAKE while it's working. Any fresh thrust input (shift,
  space, W, S) releases it.
- TUNE + CTRL are ship controls now: two buttons seated on the deck's flat
  run, upper right of the console, styled as small panes of the same blue
  instrument glass (same gradient, whitish outline, top sheen — per James,
  "just like all the other panels look, but these are just buttons"). The
  floating "tune" pill is gone. TUNE opens the tuner; CTRL opens a new
  controls card (right side, above the console): every flight control plus a
  legend of the console bays. One panel at a time — each closes the other;
  buttons blur after click so the space bar keeps toggling overdrive, and
  engaged buttons light like active instruments.
- Hint line now mentions X and CTRL. Stamp v37.

## 2026-07-19 — claude-fable (v36 — booster de-sirened)

- James: the shift booster sounded like a police siren / blowing hot air. Guilty
  parties: the 620→1500 Hz gliding sine "turbine whine" (that WAS a siren) and
  the sawtooth sub growl. Both gone. The booster is now a pure low rushing
  noise — white noise through a lowpass whose cutoff opens 180→480 Hz with the
  throttle, over a fixed 70 Hz noise bed for weight. Nothing tonal, no pitch
  glides; the reverse burn darkens the rush instead of dropping a tone.
  Overdrive's pulsing saws are untouched (different drive, different animal).
  Stamp v36.

## 2026-07-19 — claude-fable (v35 — compact console rows, the reef spreads)

James's pass on v34 (a couple minutes' look): panel rows fall too wide — labels
and values shouldn't be justified across the bay — and the reef earns more.

- Console rows compacted: no more space-between justify. Labels sit tight
  against their values (fixed 4.6ch label column so values still align down
  the glass), bays slimmed 14% → 11% (SYS 9.5%), the cluster capped at 22%,
  and the whole instrument group packs toward the center with the wings
  pinned at the ends — the bare deck between is deliberate open real estate
  for future systems ("we can use that space for other things later").
- THE REEF SPREADS: one colony → a species. REEF_COLONIES table: the flagship
  at [6600,−900,−5200] grown ~30% (12 trees, longer branches, 380 spores) plus
  two outlying patches at [−8200,600,3400] and [−2600,−1500,−8600]. Hidden
  exit stays flagship-only; NAV's REEF row now reads the NEAREST colony.
- reef-sim.mjs updated for multi-colony (extraction marker is now
  `const REEF_COLONIES`): 5905 points, deterministic, nearest-to-origin
  7723m, 0 corridor hits, max spread 893m, worst overdraw 2.6 screens, gaze
  clamp holds. ALL PASS. Stamp v35.

## 2026-07-19 — claude-fable (v34 — skull detail, engine sound, HUD readability, THE REEF, the gaze)

James's session brief: skull needs its detail back, engines need voices, HUD text
was unreadably tiny (plus he wants live position), and from the pitch list he
picked the Reef and the Gaze to build.

- SKULL NORMAL MAP: the Meshy source GLB carried a 4K normal map we'd been
  throwing away. Extracted raw from the GLB (Node, zero re-encode —
  `assets/skull/skull-normal.jpg`, 15.7MB) and sampled in the skull shader via
  a screen-space cotangent frame (no tangent attribute needed; UV flips absorb
  into B automatically). Fine sculpted detail returns at zero triangle cost;
  decimation stays 0.45. Optional load — missing file = v33 lighting. glTF +Y
  convention assumed: if bumps read as dents to James's eye, flip the green
  channel sign in perturb(). If he still wants more, next lever is decimate
  0.45 → 0.75 (~28MB bin).
- ENGINE SOUND: three synthesized voices on a new "engines" bus with its own
  channel slider (arachno-wars pattern). Thruster = cold-gas hiss (W/S).
  Booster = throaty sub-saw + noise + turbine whine climbing with the shift
  burn (and carrying the wind-down as thrust decays). Overdrive = detuned saws
  pulsing at 4.4Hz — a genuinely different animal — with an ignition thump +
  noise breath on engage and a low wind-down on disengage. Reverse burn (S)
  detunes everything to 0.82x so the flip is audible. All params move through
  setTargetAtTime from the frame loop.
- HUD READABILITY REDESIGN: same footprint philosophy (console cap 118 → 150px,
  ~7% of a 4K screen) but the type roughly DOUBLED: rows clamp to 20px, the
  speed number to 46px, everything gets a faint phosphor glow. Screens went
  glassy — gradient glass faces, top-edge sheen, cyan inner glow, rounded
  bezels. New POS bay (live X/Y/Z in meters, running as you fly) between the
  cluster and NAV; NAV gains a REEF range row. Wings slimmed to make room.
- THE REEF: a bioluminescent orb colony at [6600, −900, −5200] (~8.5km out) —
  nine seeded branching mineral growths (dim, desaturated nodes every 7m,
  tight 1.35x quads) crusted with 272 fast-pulsing polyps in five hue
  families, 300 drifting spores, and a pale exit orb nested at its heart (a
  hidden BONUS exit — the three near home stay canonical). Fixed world coords
  like the skull; spread sliders and wander can't touch it. Geometry is a pure
  function of REEF_SEED — identical every visit.
- THE GAZE: within ~6km the skull's red eyes track the ship — each eye drifts
  inside its socket toward you (48m clamp < the 53m measured bone clearance,
  slow 1/0.6s ease). Beyond range they relax to dead ahead. Cheapest possible
  haunting.
- Verification: `tmp/orb-dimension/reef-sim.mjs` extracts reefGeometry()
  VERBATIM from world.js and asserts: deterministic (2 runs identical, 2223
  pts), population budget, clears the KEEP-2400 buffer (nearest 7886m) and the
  sight corridor (0 hits), inside default flight bounds, worst in-colony
  overdraw 1.7 screens, gaze clamp ≤ 48m over 40k poses. ALL PASS. Stamp v34.
- Untested by James's eye yet: normal-map light direction, engine mix levels,
  HUD type scale, reef look from inside. All four are one-number tweaks.

## 2026-07-18 — claude-fable (v33 — bigger buffer + a clear sightline at load-in)

- Monument buffer widened: KEEP 1560 → 2400m (skull corner ~1370, so ~1km of empty dark
  around the bone in every direction).
- New corridor exclusion: a 950m-radius cylinder along the view axis from the buffer edge
  to just past spawn (z 0..6200) — orbs can no longer sit between the load-in camera and
  the face. Both zones sphere+cylinder sim-verified together, 40k trials, 0 violations.
  Dust motes still drift everywhere (atmosphere). Stamp v33.

## 2026-07-18 — claude-fable (v32 — eyes to 2x, head tilted back 5°)

- Eyes: radius 240 ("Yikes!") → 160 (double the original 80), same wide ±270 seats.
- The skull now tilts back 5°: rotation about X baked into the loader (positions AND
  normals, after the 3x scale), face lifted skyward. The eye fixed positions carry the
  same rotation ((±270,−45,570) → (±270,4.9,571.7)) — retilt them if the angle changes.
  Stamp v32.

## 2026-07-18 — claude-fable (v31 — eyes tripled and un-crossed)

- James: the red orbs read cross-eyed, hugging the nose. Radius 80 → 240, x ±180 → ±270
  (world m). Same y/depth. Update the comment's canonical socket numbers if re-measuring —
  the wider seat matches the outer halves of the measured socket holes. Stamp v31.

## 2026-07-18 — claude-fable (v30 — spawn to [0,0,5600])

- Another 2000m back per James (2600 → 3600 → 5600 over three requests; the skull's face
  is now ~4.76km from spawn, still well inside the 11.4km flight bound). H-home matches.
  Stamp v30.

## 2026-07-18 — claude-fable (v29 — spawn back again, monument clearance, red eyes)

- Spawn + H-home moved another 1000m back: [0,0,3600] (skull face now ~2.76km ahead).
- Monument clearance: assemble() pushes any orb within 1560m of the origin radially out to
  a shell just past the skull (corner radius ~1370m at 3x + wander margin) — the welcome
  ring (250–1000m) and near portals now form the inner shell around the monument. Dust
  motes stay as ember atmosphere (one-line change if James wants them out too); veils
  unaffected. Sim: worst post-push radius 1572m over 20k trials.
- THE EYES: two fixed red orbs (r=80, hues 2/357, sat 92%, slow 3.2s pulse) seated in the
  measured socket centers (skull.bin hole-map: canonical ±60,−15,190 → world ±180,−45,570).
  New instance flag 3 = eye: red-tinted shader branch + the heart's never-smaller-than-a-
  star clause, so the red gaze is visible all the way from spawn. o.fix positions are
  spread-slider-proof and wander-proof; socket bone partially occludes the glow (depth
  test) so they read as nested, not floating. Sim-verified seating (53–55m to bone).
  Stamp v29.

## 2026-07-18 — claude-fable (v28 — skull scale + quality fix, per James's drive-by review)

- James's two notes before leaving for a movie, both valid: (1) 600m at 2600m viewing
  distance subtends ~13° — reads like a nearby orb, not a monument; (2) decimation to 16%
  visibly faceted the bone up close ("looks like junk").
- Fixes: re-exported at decimate 0.45 → 579k tris (was 206k) with the full 4K basecolor
  (was 2K) — 22MB served total, fine locally; and the loader now scales positions 3x at
  parse (SKULL_SCALE const in world.js) → the skull stands 1800m tall, ~38° from spawn,
  face ~1760m away. Anisotropic filtering (x8) added for grazing-angle sharpness. Binary
  re-validated by the Node sim (579k tris, y ±300 canonical). Stamp v28.
- Untested by James yet (he's at the movies) — next session: judge scale and surface
  quality in-world; if 3x still reads small, it's a one-number change.

## 2026-07-18 — claude-fable (v27 — THE SKULL: a 600m fossil god at the center of the world)

- James's Meshy skull ("alien god skull v2", tuned by him on the canvas, 600m tall,
  exported to `assets/ref/`) now floats at the exact center, face toward spawn. Weathered
  bone, bronze-green metal veins, hanging jaw. It dwarfs everything, as ordered.
- Probes confirmed no surgery needed: the mouth is an open ring and the severed underside
  is open — fly in through the teeth, exit below. No collision (walls are ghosts, v1).
- Pipeline (`tmp/orb-dimension/skull_prep.py`, headless Blender): recenter on origin,
  decimate 1.29M→206k tris, export custom binary (SKUL magic, interleaved pos/norm/uv +
  u32 indices, Y-up world coords) + 2K basecolor JPG — 7.4MB total, down from 70MB.
  Node sim validates the binary exactly as world.js parses it (bbox/normals/uvs/indices).
- Rendering: new skull pass inside the world's own WebGL2 pipeline (NOT an overlay canvas
  — that lesson is learned). Context now has a depth buffer; skull draws first (opaque,
  depth-written), orbs then depth-TEST with writes off, so sprites clip behind bone and
  shine through the eye sockets. Shader: basecolor × (cool starlight key + faint fill +
  warm pulse breathing up into the mouth from below — the Heart's soul lives on) with the
  orbs' haze knob. Skull texture on unit 1; orb state handed back after each pass.
- The Heart orb itself is retired (assemble() no longer includes it; makeHeart() kept for
  lore). HOME readout + edge marker already pointed at the origin = the skull's center.
- Served-only enhancement: skull.bin needs fetch(), so on file:// the world simply has no
  skull. Known quirk: portal clicks ignore skull occlusion (can click an orb through bone).
  Stamp v27 (v26 was taken by the coordinated-turn build below).
- Next: James flies it — judge scale from spawn, lighting/pulse, whether mouth-transit
  wants collision or interior detail later. `assets/ref/` (70MB) stays gitignored?  — decide
  at wrap-up whether to commit the source GLB or just the prepped assets.

## 2026-07-18 — claude-fable (v26 — coordinated turn: banking is turning)

- James: no way to HOLD a turn — mouse steering runs out of desk, bank alone didn't
  change heading, so a full banked circle back to the start was impossible.
- Added the aircraft rule after the roll block: while banked, the ship carves around the
  world-vertical at TURN_RATE(0.5 rad/s) x sin(bank) — hold a bank, sweep a continuous
  circle; level (or R) and the turn stops. Node-sim verified: 45° held bank closes a full
  360° circle in ~18s with zero bank drift; left banks left, right banks right. Arrow keys
  still steer directly; mouse unchanged. Stamp v26.

## 2026-07-18 — claude-fable (v25 — REDIRECTION: spaceship retired, v17 viewscreen restored)

- James's call after flying the whole arc: no flying/shooting game here — too much work for
  the reward, and that road is all hard design decisions best made deliberately on paper,
  not prompted through. The original vision stands: a giant black space full of orbs to fly
  through, to be populated with Meshy-made wonders (doorways, big floating things, things
  on the ground below).
- Restored the v15/v17 viewscreen HUD character-for-character (dark canopy frame + gussets,
  canted machined deck, wings, stencil labels, inset screens): version archaeology via the
  earlier session's transcript confirmed v13=corner brackets (in git), v14=the "Claude
  Design" cards, v15=the hybrid deck James approved, v16/17=flight-only. All v18-v24
  cockpit work is OUT of the world: no three.js overlay, no C/V keys, no plate chrome.
- One upgrade kept, per James: the boresight reticle is now the full attitude instrument —
  the WHOLE reticle counter-rotates through 360° with bank (was: horizon bars only), so a
  barrel roll spins it all the way around inside the fixed canopy.
- Kept: spawn/H-home at [0,0,2600] (James: definitely better), v16/17 S-reverse flight,
  patched shared three loaders, `assets/ship/crescent-wishbone.glb` (beloved model, future
  set-dressing candidate?). Parked in `tmp/orb-dimension/parked/`: cockpit3d.js + the
  extracted chrome plates. Concepts stay in `tmp/orb-dimension/concepts/`. Stamp v25.
- Meshy round-trip pipeline (concept → James art-directs in Meshy → API pull → world) is
  proven and stays — that's the tool for populating the space going forward.

## 2026-07-17 — claude-fable (exterior view PARKED; interior is the focus)

- James's call: the exterior/ship direction is getting too complicated for a two-person
  team right now. The interior view — load in, fly around the orbs from inside a cockpit —
  is the original vision and is close. Exterior stays functional behind V (ship, plumes,
  lazy GLB load all keep working) but gets no further investment for now; leaving V now
  ALWAYS restores the interior cockpit even if it had been toggled off.
- Keep from this arc either way: the Meshy account→API→repo model pipeline, the GLB
  inspection/preview headless-Blender recipe, `assets/ship/crescent-wishbone.glb`, and the
  patched shared three.js loaders. Interior work continues from the v19 extracted chrome +
  v21 hard-lock doctrine.

## 2026-07-17 — claude-fable (v24 — ship orientation fixed: nose forward)

- James's v23 report: ship rendered in profile facing screen-left, plumes floating where
  the tail would be if it faced away. Root cause: the model's LENGTH runs along its X axis
  (nose −X, tail +X, pods ±Z) — v23 assumed nose −Z and never rotated it, and the nozzle
  scan hunted max-Z with a stale matrixWorld (pre-add, unbaked transforms).
- Fix: nozzles now scanned in ship-local coords (updateMatrixWorld before scale/rotate,
  tail = max X, cluster per z-sign); ship rotated −90° about Y so nose points −Z; plumes
  placed via the explicit local→rig map (x,y,z)→(−z·S, y·S, x·S), aft = rig +Z. Nose sign
  confirmed two independent ways (James's report; which Blender preview azimuth caught the
  thruster glow). Stamp v24.
- Still open from James's look: hull reads more silver than white (env/material tune),
  ship is rigid in camera space by design — consider a few degrees of input-driven lean.

## 2026-07-17 — claude-fable (v23 — exterior ship view: the Crescent Wishbone flies)

- James designed his ship in Meshy ("Crescent Wishbone Spaceship", image-to-3d) — pulled via
  the Meshy API straight into `assets/ship/crescent-wishbone.glb` (36MB, 294k tris, 4K PBR
  set + loose texture copies alongside). Headless Blender previews in `tmp/orb-dimension/`;
  hull reads dark there only because bare metal needs an environment to reflect.
- V toggles the exterior view: the ship rides 13.5m ahead / 3.4m below the camera, nose
  forward, rigid in camera space — the world canvas supplies all motion cues, so the chase
  cam needed zero changes to the world renderer. C still toggles the interior placeholder;
  GLB lazy-loads on first V press only.
- Engine plumes: nozzle positions found by scanning the mesh for rearmost vertex clusters
  per side at load; each gets an additive glow sprite + cone that scale with thrust (idle
  wisp → W → shift burn → overdrive 2.4x), light flicker, plus a point light so the hull
  catches its own engine glow. Pearlescent hull lit by a PMREM synthetic environment
  (space sphere + two light cards).
- Shared-lib note: vendored `src/lib/three/` loaders/utils had bare `'three'` import
  specifiers (mandala-shop resolved them via its index.html importmap). Patched all three
  files to relative `'../three.module.js'` so orb-dimension works without an importmap —
  same URL/instance either way, mandala-shop unaffected. Orb's index.html untouched.
  Stamp v23.
- Next: James flies it; tune ship offset/scale, plume look, maybe input-driven ship lean
  (into turns, never lagging); texture downsize before public ship.

## 2026-07-17 — claude-fable (v22 — spawn pulled back 1000m)

- Start point and H-home reset moved from [0,0,1600] to [0,0,2600], same heading (facing
  the heart down −Z). More approach room for the new cockpit. Stamp v22.

## 2026-07-17 — claude-fable (v21 — cockpit hard-locked to camera, lag removed)

- James flew v20: the camera-lag lean fought the arrow-key steering ("extreme odds against
  the wasd keys") and let the cockpit drift off the reticle. His spec, now law: the cockpit
  horizon stays LOCKED to the reticle at all times; a full barrel roll shows the world
  rolling around a rock-steady canopy, cockpit glued to the view.
- cockpit3d.js: all smoothing/delta/clamp code deleted; frame() just renders. The cockpit is
  rigid in camera space — the world canvas underneath supplies all motion cues. The 3D rig's
  continuing value: perspective depth now, ship GLB + exterior chase view next. Stamp v21.

## 2026-07-17 — claude-fable (v20 — 3D cockpit proof: transparent three.js overlay + camera lag)

- James called the flat plates' limit: a cockpit that stays screen-fixed through banks kills
  the illusion. New tactic agreed: real 3D cockpit, camera inside, eventually an exterior
  view too. This build proves the rig with a placeholder before any ship modeling.
- `cockpit3d.js` (new): transparent three.js canvas (vendored `src/lib/three/`) at z5 under
  the HUD, DPR capped 1.5. Placeholder cube-built cockpit matching the concept layout: two
  swept side struts, carbon console slab with five glowing frosted sockets, rear bulkhead
  ring so looking back shows cabin. Loaded via dynamic import from world.js — on file:// the
  module can't load and the flat v19 chrome simply stays (graceful degradation).
- Motion: the cockpit is rigid in camera space; the illusion comes from LAG. A smoothed
  basis (τ=0.15s) trails the live flight basis; the cockpit rotates by the delta, hard-
  clamped at 7° (motion-sickness restraint). Node sim with real three.js verifies: lean
  rises into a bank, saturates at 7.00°, decays to 0 within ~0.5s of leveling. C toggles
  3D cockpit vs flat plates (mode-3d class hides .ck-*/.vs-console-rig). Stamp v20.
- Next: James picks/draws the ship design; then Meshy image-to-3D exterior + interior
  (Blender fallback for the interior), GLB replaces the cube frame, exterior chase view.

## 2026-07-17 — claude-fable (v19 — chrome extracted from the chosen concept, supersedes v18)

- James rejected the v18 plates: the green-screen image-to-image pass had REGENERATED the
  design (fat beige struts, rope-like carbon weave, hallucinated grab handles) instead of
  converting it. Lesson recorded: every Meshy image-to-image pass is a redraw, not an edit —
  never use one to "convert" approved art.
- v19 extracts the chrome pixel-for-pixel from the approved concept
  (`tmp/orb-dimension/concepts/cockpit-concept-3-open-glass.png`) via flood-fill background
  keying (scipy label from frame edges, star despeckle, 0.8px edge soften) — `extract_v2.py`
  + `slice_v3.py`. Thin swooping struts, molded console, glowing sockets all survive intact.
- Slices: band crop y765 (the arch tops out ~y770), caps split at the socket gaps (x267/x772),
  strut feet masked so no band artwork rides along; struts now render ABOVE the band and
  overlap ~28px so the foot plants onto the console face. Verified by PIL-composited
  simulations at 1600x900, 2560x900, 900x1100 (`v3-assembled-*.png`). Stamp v19.
- Instruments: ATT / cluster / NAV mapped to the three middle sockets by native
  x-fractions; SYS absolutely positioned into the right cap's socket.

## 2026-07-17 — claude-fable (v18 — rendered cockpit chrome, Meshy pipeline)

- The dashboard-style dark canopy (flat struts, gussets, machined deck) is replaced with
  rendered art: pearlescent white metal struts + carbon-trimmed frosted-glass console band,
  concepted via Meshy (nano-banana-pro), chroma-keyed and sliced with PIL. Concepts and
  scripts live in `tmp/orb-dimension/concepts/`; production plates in `assets/cockpit/`.
- Resize scheme: struts anchor to the side edges and scale with viewport height (wider
  window = more open glass between them, no stretching); the console band is a 3-slice —
  sculpted caps at native aspect, middle slice stretches. Struts tuck ~46px under the band
  so the joint never seams. Chrome is ~80% open center per James's brief.
- Existing readouts (ATT / speed cluster / NAV / SYS) now sit as dark glass insets over the
  frosted band middle — alignment with the drawn sockets is approximate, instrument
  restyling (alien typography, weapons/shields panels) is the next pass. Old .vs-wing DOM
  kept but display:none. Stamp v18.
- Next: tune band height / socket alignment with James's eye, restore the pearlescent glow
  (CSS or a re-render), higher-res plates if 1024px source shows soft on big screens.

## 2026-07-17 — claude-fable (v17 — S reverses the boosts, supersedes v16)

- James corrected v16: "not brake, reverse." S now flips the burn direction while held —
  shift and overdrive thrust backwards at full strength (−400/−800), swinging smoothly
  through zero, and swing forward again on release. Overdrive stays toggled throughout.
  Console: speed shows a − sign, mode reads REVERSE, throttle bar turns amber on a
  reverse burn. Stamp v17.

## 2026-07-17 — claude-fable (v16 — S brakes the boosts)

- S now outranks shift/space (per James): holding it kicks the overdrive toggle off,
  blocks the shift burn from building, and bleeds thrust at a 0.5s time constant
  (vs 1.6s free coast). Console mode line shows BRAKE while it's doing that. Stamp v16.

## 2026-07-17 — claude-fable (v15 — cockpit redesign: hybrid deck + glass)

- James's verdict on the v14 console: "looks like Claude Design" — four identical rounded
  cards read as a SaaS dashboard, not a ship. Redesigned in the hybrid direction he chose
  (canted physical console + sparse glass projections):
  - Console is now ONE machined deck, perspective-tilted toward the pilot
    (rotateX 13° in a 640px perspective rig; deck spans -2%..102% so the top-edge
    convergence never gaps against the side struts). No border-radius cards, no gaps —
    instrument screens are inset into the metal (dark faces, inner shadow, scanlines
    on the screens only), stencil paint labels (ATT/NAV/SYS) on the deck itself.
  - Asymmetry: unequal wings of inert structure (vent slats + four bolt heads each,
    7% left / 4.5% right), pods 15/15/12.5%, central velocity cluster rises out of
    the deck with a clipped-corner silhouette and an amber hazard-stripe lip.
  - Glass layer: boresight reticle dead center (four arc segments, cross ticks, dot)
    whose horizon bars counter-rotate with bank every frame — the first live
    instrument on the canopy, and the anchor point for weapons later. Faint bracket
    arcs mid-screen left/right.
- Flight untouched this pass (James: A/D roll "definite improvement"; more tuning later).
  Stamp v15.

## 2026-07-17 — claude-fable (v14 — ship viewscreen + A/D roll)

- HUD rebuilt as a proper ship viewscreen (James: "feel like you are in a ship", ≤10% of
  the screen): canopy frame all the way around — top strut with heading-tape ticks, side
  struts, angled corner gussets, faint interior glass glow — and a bottom console of four
  readout panels: ATTITUDE (HDG/PIT/BNK), VELOCITY (big m/s number, live throttle bar,
  IDLE/COAST/BURN/OVERDRIVE mode line), NAV (HOME distance, CONTACTS within 2.5 km,
  EXITS), SYSTEMS (ENG NOMINAL; WEP and SHD report OFFLINE — weapons, shields, and
  enemies to blow up are the planned next phase). Console text refreshes at ~8 Hz;
  throttle bar every frame. CRT scanlines over the console. Old hairline corners/edges
  and the floating speed readout are gone (speed lives in the console now).
- Roll moved Q/E → A/D at James's request (NMS-style: bank with keys, point the nose
  with the mouse) and slowed 30% (0.66 → 0.46 rad/s). Strafe removed; Q/E deliberately
  unassigned for now. Hint text updated, stamp v14.
- Flight hint, tuner toggle/panel, and the portal focus anchor all sit above the console
  (CSS vars --console-h / --vs-side).
- Next: weapons, shields, enemies — the SYSTEMS panel is waiting to flip WEP/SHD online.
  James is also going to study No Man's Sky's flight feel for further tuning.

## 2026-07-16 — claude-fable (session close — committed at v13)

- First commit of the world: `src/worlds/orb-dimension/` plus its map-room link, drift
  registry entry, and World Ideas #55 (status `live`). Blender build scripts, the .blend,
  lit previews, and the verification sim live in `tmp/orb-dimension/` — gitignored by
  repo policy, local only.
- Where things stand: flyable, tunable, stable — James is happily doing barrel rolls.
  Controls: W/S dolly, A/D strafe, Q/E persistent roll, R levels, shift thruster (400),
  space toggles overdrive (800), drag steers in the local frame, H hard-resets home.
  Rescue/orientation net: the fog-proof Heart star + edge marker + veils (no view
  direction is ever black — sim-verified).
- Next, per James: default-preset values he'll paste from "copy settings"; Blender cave
  room (floor/ceiling/walls at honest scale); space stations and dimensional doors as
  the real exits; POI map; Procreate → image-to-3D → Blender model pipeline for props;
  possibly secret worlds outside the drift.

## 2026-07-16 — claude-fable (v13 — tuner presets)

- Presets row at the bottom of the tuner: name field + save / apply / set as start /
  delete, stored in localStorage (`elastic-orb-dimension-presets-v1`). "Set as start"
  (★) makes that preset win on every load — James's chosen default load-in. "copy
  settings" puts the live values on the clipboard as JSON so he can paste them in chat
  for me to bake into the shipped DEFAULTS.
- Applying a preset re-rolls the field only if the grouping changed; otherwise the
  existing orbs just retune in place. Stamp v13.
- Also incoming from James: Procreate drawings → image-to-3D → Blender → world models
  (the validated Hunyuan3D pipeline is exactly this; see memory `hunyuan3d-pipeline`),
  plus interest in another 3D generator. Models for stations/doors will likely arrive
  by that road.

## 2026-07-16 — claude-fable (v12 — overdrive + ghost HUD)

- Roll rate backed off 40% per James (1.1 → 0.66 rad/s).
- Space = OVERDRIVE toggle: ramps to 800 m/s and HOLDS until tapped again, then coasts
  down (or settles to 400 if shift still held). H clears it.
- First pass of the minimal HUD ("invisible jet" brief: a humanoid species 10,000 years
  ahead, exotic-matter ship): hairline corner brackets, 6px frosted-glass slivers on all
  four window edges (backdrop blur), speed readout reworked into thin letterspaced glass
  type — brightens with a hairline underline while overdrive is engaged. Shows for any
  motion now (dolly/strafe included). Stamp v12.
- James's roadmap for this world, logged: space stations; doors leading to other
  dimensions (probably the real exits); a map with points of interest; possibly SECRET
  WORLDS hidden outside the drift system entirely. "Now THAT is elastic space, baby."

## 2026-07-16 — claude-fable (v11 — free flight: persistent roll + banking)

- James (a No Man's Sky pilot, thousands of hours) wants real 3D flight: Q/E roll while
  held and STAY rolled, R glides back to the plane of the ecliptic, banking into turns.
- Camera rebuilt from horizon-locked yaw/pitch to a free orthonormal basis (f/r/u) rotated
  incrementally in its own frame (Rodrigues + per-frame re-orthonormalization). Mouse and
  arrows now yaw/pitch in the LOCAL frame, so a banked yaw curves the bank; pitch is
  unclamped (loops possible). Q/E roll at ~63°/s with eased start/stop, persistent. R
  levels roll+pitch keeping heading (~1s glide, cancelled by any look/roll input). Strafe
  slides along the banked wing plane. H hard-resets orientation, position, thruster.
  All downstream math (billboards, view matrix, raycast, home marker) was already
  basis-driven, so it inherited free flight unchanged. Stamp v11.

## 2026-07-15 — claude-fable (v10 — A/D strafe)

- v9 thruster confirmed working well. Q/E barrel-roll idea discussed and parked (tap-to-
  roll recommended if revisited); James chose A/D strafe first. A/D slide left/right at
  dolly speed (80 m/s, horizon-locked, instant stop), composing with dolly + thruster;
  mouse look unchanged. Strafe + drag-to-look is the orbit-an-orb combo. Stamp v10.

## 2026-07-15 — claude-fable (v9 — the thruster)

- James confirmed v8 flight feels smooth (dollied, steered mid-flight with the mouse,
  orbited an orb and looked back at himself) and spec'd motion step two himself: shift
  fires a thruster that takes a few seconds to reach full velocity, then coasts to a stop
  over a few seconds after release.
- Implemented exactly that: hold shift → speed ramps toward 400 m/s (≈95% in ~3.5s);
  release → exponential coast (~6s to standstill), zeroed below 4 m/s. Velocity direction
  always follows the gaze — steering curves the flight rather than diverging from it.
  W/S dolly (80 m/s, instant stop) composes on top, so S is a soft brake while coasting.
  H / "return home" also kills the thruster. Small m/s readout shows while thrusting or
  coasting. Bounds and all v6–v8 GPU guards unchanged. Stamp v9.
- Next candidates when James asks: a speed/VMAX knob in the tuner ("the flight" group),
  vertical or strafe drift, sound reacting to speed, and the Blender cave room.

## 2026-07-15 — claude-fable (v8 — the dolly + grouped tuner)

- James signed off on the look ("this is starting to look amazing") and asked for the
  dolly. Motion step one: hold W to glide forward along the gaze at a constant gentle
  80 m/s, S to back out, release = instant dead stop. No momentum, no strafing, no speed
  control. Bounds clamp to 0.95x spread. H (and the tuner button, now "return home")
  restores position AND view.
- Tuner controls grouped into labelled subpanels per James: "the field" (orbs, dust,
  grouping), "the space" (width/depth/height), "the orbs" (sizes, glass, glow), "the air"
  (haze, color fade). Actions row unchanged.
- Sim TEST 3 back to random positions across the whole dolly-reachable volume: still
  zero blind poses in 2000. All six tests PASS.
- Next steps when James asks: strafe or vertical drift as motion step two; then maybe
  gentle speed control; the Blender cave room remains the big build on deck.

## 2026-07-15 — claude-fable (v7 — square glow fix)

- FIRST CONFIRMED WORKING VIEW: James sees the orbs (in pirate voice). One visual bug in
  his report: glows rendering as translucent rectangles/squares — the v6 fill-rate fix
  shrank dust quads to 1.6x and veils to 1.05x, but the halo falloff still assumed a 2.6x
  quad, so the gradient was cut mid-fade at the card edge. Halo falloff (and the discard
  radius) is now normalized per instance to its own quad size — every glow reaches zero
  before its card's edge. Stamp bumped to v7.

## 2026-07-15 — claude-fable (seventh pass, same session — v6 stamp + resilience)

- James reported the page loading quarter-size top-left then "zooming" to fill, then
  FLIGHT — which is impossible in the look-only build. Verified: server hash == disk hash
  (current build served), no external edits, world folder untracked/unmodified. Strong
  suspicion: a stale tab still running pass-5 JS (the crashed tab restored). To end the
  ambiguity forever, the hint line now ends with a build stamp ("· v6") — if the stamp is
  missing, it's an old copy.
- Hardening from the report anyway: canvas gets inline fullscreen styles + dark body
  fallback (a failed stylesheet can never leave a 300x150 canvas on a white page); vertex
  shader caps billboard radius at 0.8x distance; CPU skips quads inside the near-fade's
  zero zone (draws only the culled count); DYNAMIC RESOLUTION — frame-time EMA scales
  internal render res down to 0.5x when the GPU drowns (James is on 3840x2160) and creeps
  back up when load eases. webglcontextlost still auto-reloads.
- Sim suite now 6 tests, all PASS: group in view at spawn (27 orbs); wander ≤ ~10 m/s;
  zero blind orientations /2000; home always indicated; overdraw 4.3 screens (defaults);
  maxed-tuner abuse 150.8 raw screens → 37.7 at the dynamic-res floor (affordable).
- Rendering answer for James: the canvas renders at the monitor's native resolution
  (device-pixel-ratio aware, no upscale-zoom anywhere in the code).

## 2026-07-15 — claude-fable (sixth pass, same session — LOOK-ONLY build)

- James's session ended in a GPU context loss (white screen + sad-face square, audio still
  playing): the fifth pass's veil patches were a fill-rate bomb — near the walls, dozens of
  screen-covering translucent quads per frame → frame rate collapse (his "gray blur" and
  the un-stoppable slow cruise: at 2 FPS the velocity damping takes ~10 real seconds) →
  Windows TDR killed the context. Fixed with per-instance quad sizes (veils 1.05x radius,
  dust 1.6x, orbs 2.6x); sim TEST 5 now asserts worst-case overdraw (5.0 screens, was 50+).
  webglcontextlost handler reloads the page if it ever happens again.
- Per James, flight is REMOVED for now — figure it out bit by bit. The camera is bolted
  1600m outside the central group, facing it. Drag or arrow keys rotate the view; H or the
  tuner's "recenter view" resets it; nothing else moves, ever. No momentum anywhere.
  Fly-speed slider and wheel-speed gone. Flight returns once looking works for James.
- Sim updated for the look-only build, all PASS: 27 group orbs squarely in view at spawn;
  zero blind orientations in 2000; wander ≤ 9 m/s; home always indicated; overdraw ≤ 5.
- Next: James verifies he can just LOOK — group ahead, swing away, swing back, orbs still
  there. Then reintroduce motion one small piece at a time (probably slow dolly first).

## 2026-07-15 — claude-fable (fifth pass, same session — verified in simulation)

- James lost the field a third time, so this pass was verified headlessly before handover:
  `tmp/orb-dimension/sim.mjs` replicates the world's math (population, wander, camera
  physics, projection, fog) and asserts. Results: camera drift over 120s with no input =
  exactly 0m; max wander speed 9.4 m/s; ZERO blind poses out of 2000 random positions +
  orientations (worst case sees 8 glows, mean 61); home always indicated.
- Found: tuner sliders re-rolled the ENTIRE field on every input tick (scrubbing "orbs"
  teleported everything — reads as "they zoomed by and vanished"). Orbs now live in
  persistent pools; count/dust sliders add/remove at the list's far end and never touch
  what's around you. Only "regenerate" and grouping changes re-roll.
- The Heart: one bright fog-proof pulsing white star at the exact center (the mysterious
  ambient source, made visible). Never renders below star-size on screen — visible from
  anywhere. You spawn 900m from it, facing it; H flies you back to it.
- Home marker: when the heart is off-screen, a soft dot glides along the screen edge in
  its direction. You can always point yourself home.
- Veil patches: ~120 huge, very dim glowing washes parked on the cave's ceiling, floor,
  and walls (deterministic grid, just past the flyable bounds) — faint mottling of rock
  miles away. Every possible view direction meets at least one; doubles as the interim
  answer to "some texture back there" until the Blender room is built.
- Flyable bounds pulled strictly inside the inhabited volume (0.95x spread); dust spills
  to 1.3x and got bigger (2–6m) and denser (default 1400), so looking out from the edge
  still shows embers. Speed cap halved to 600 m/s, default 150, gentler wheel; saved
  tuner values are clamped to current ranges on load.

## 2026-07-15 — claude-fable (fourth pass, same session)

- Root cause of James getting lost found: orb wander amplitude was scaled to the volume
  size (±480m at default spread), so the near orbs drifted their entire distance-to-viewer
  sideways within seconds — the field visibly fled the camera on load, twice. Wander is now
  absolute meters (60m orbs / 30m dust / 15m portals, a few m/s — "drifting slowly about").
- Ember dust layer: ~900 tiny motes (1.5–4.5m, halo-dominant, twinkling) fill the whole
  volume so no viewing direction is ever pure black and flying always has parallax to read
  speed against. "dust" slider in the tuner (0–2500).
- Welcoming ring tightened: 12 orbs at 250–1000m, evenly spread in angle, biased large.
- Pale exit orbs now resist fog 60% — they read as lighthouses from far off.
- Drag-look sensitivity nearly halved (0.0022 → 0.0013 rad/px).

## 2026-07-15 — claude-fable (third pass, same session)

- James got lost on first load: spawn was at the field's edge looking across it, so one
  drag swept every orb out of view with nothing nearby to reorient by. Now you wake DEAD
  CENTER in the volume, perfectly stationary (idle bob removed entirely — the camera never
  moves unbidden). A "welcoming committee" of a dozen orbs always rings the spawn at
  350–1600m regardless of grouping, and the three pale exit orbs sit within sight of home.
- Added H = fly home (also the tuner's "fly home" button); hint mentions it.

## 2026-07-15 — claude-fable (second pass, same session)

- Camera flight, per James: rebuilt the renderer from DOM-sprite parallax to raw WebGL2 —
  one instanced draw of billboard quads (a sphere is the one shape a billboard renders
  honestly, which is why the Blender sprites survive a flythrough). The four shell PNGs
  live in a texture array; each orb's two crossfading color layers + halo are composited
  behind the glass in the fragment shader. Depth-sorted back-to-front, premultiplied alpha
  over the CSS cave background.
- Flight: drag to look, WASD + E/Q (or Space) to fly, scroll sets cruise speed, shift ×3.
  Deliberately gentle — damped acceleration, smoothed look, pitch clamp, no roll (James's
  motion sensitivity). Gentle idle bob until first input; off under prefers-reduced-motion.
- Tuner panel (Chrome Rift pattern: toggle button + bottom panel, localStorage):
  orb count, width/depth/height spreads, size range, glass opacity, glow, haze, color-fade
  speed, fly speed, grouping select (scatter / clusters / strata / river), regenerate /
  fly home / reset. Positions are stored normalized, so spread sliders stretch the volume
  LIVE mid-flight — that's the "stretch them way out" experiment James asked for.
- Exits: pale pulsing orbs — three near the flight start plus one per ~60 orbs scattered.
  Click = raycast → triggers the hidden data-drift anchors (still keyboard-focusable).
- index.html deliberately untouched (canvas/tuner/hint injected from world.js).
- Where things stand: flyable and tunable. Next: the cave itself — Blender-rendered
  floor/ceiling/wall geometry or baked shells mounted around this volume (renderer is now
  true 3D, so mounting real surfaces is straightforward); orb-lit ground pools; sound
  experiments (speed-reactive wind, orb proximity chimes).

## 2026-07-15 — claude-fable

- First build, from James's pitch: an endless black volume — cave-black, not monitor-black,
  ten miles across and two miles high, dimly lit by an unfindable ambient source, with dozens
  of glowing colored balls drifting through it.
- Orb sprites rendered in headless Blender (Cycles, transparent film): four translucent glass
  shell variants (`glass`, `frosted`, `swirl`, `banded`) in `assets/orbs/`. The shells are
  neutral grays with real alpha — all hue comes from layered color gradients the page stacks
  BEHIND each shell (two crossfading hue layers + an outer halo). Build script + .blend +
  lit previews live in `tmp/orb-dimension/`.
- The space is code: world-coordinate volume with perspective projection (scale, dimming,
  depth blur by z), 46 drifting orbs in four depth bands plus one out-of-focus near wanderer,
  sum-of-sines wander, very slow camera drift + gentle pointer parallax (both off under
  prefers-reduced-motion).
- Three pale white pulsing orbs are the drift exits (`data-drift`, clamped on-screen).
- Sound: Web Audio synthesis through the shared sound control — sub-bass air rumble plus
  sparse far-off tones through an echo chain.
- Where things stand: first pass complete and registered. Untuned by James's eye yet — likely
  knobs: orb count/size mix, drift and crossfade speeds, how dim the ambient light sits,
  halo strength, ping frequency/loudness.
