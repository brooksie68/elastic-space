# The Orb Dimension — Claude instructions

Free flight through cave-black space among drifting glowing orbs — and KORRUDAN STATION at the center of it all: the 12km fossil skull of a dead god, red-eyed, its bone crusted with the Cadence's city (v52, James's Knowhere brief).

## Docs

- `changelog.md` — session history, newest first (long flight-model history; the spaceship arc was retired).
- HUD/console CSS: the readout rows must fit `--readout-h` (world.css) — the console
  box shrinks with the viewport, so type sized in raw vh outgrows its glass and
  `.vs-screen{overflow:hidden}` eats the bottom row (v53.2 bug: BNK/Z/SHD invisible
  below 1440px tall). After ANY console type or height change, open
  `tmp/orb-dimension/console-fit.html` — it measures overflow per pod at seven
  viewport heights and must report 0px everywhere.
- The full suite (run all of it after any world.js change; ~20s):
  `init-smoke society-sim reef-sim crust-sim nebula-sim wisp-atlas-check v47-sim
  ladder-sim stick-sim sphere-sim` plus `tmp/orb-dimension/shader-check.html` in the browser
  (v61: society-sim carries the crowd tests 12–15; `crowd-lab.html` is the crowds'
  look-dev harness — capture a sheet after any crowd change)
  (it compiles every shader — it has caught real runtime-killers the Node sims
  cannot see). Guard sims must be DETERMINISTIC: reef-sim's fuel probes were
  unseeded and failed on unlucky rolls until v53 seeded them; if you add sampling,
  seed it.
- After ANY world.js change, run `node tmp/orb-dimension/init-smoke.mjs` in addition
  to the extraction sims — it executes the whole IIFE under a stubbed DOM/WebGL2 and
  catches init-order bugs (TDZ traps) the block-extraction sims are blind to (v51
  shipped one: makeActors used a flight-section const; only the ship chrome loaded).
  Init-time code (anything reachable from rebuildAll) must not call helpers declared
  in the camera/flight section — inline the math instead.
- `expansion-spec.md` — "the big dimension" phase spec (2026-07-23, James's numbers):
  1,000×1,000×250 km, flat speed ladder, stargates, depot grid. PHASE 1 (flight-feel
  expansion: space + ladder + ring colonies + configuration) BUILT 2026-07-23 as v49 with
  James's go — awaiting his first flight. Stargates, depot grid, grown reefs, hub
  society, luminous region: still spec-only, still need discussion.

## START HERE (open, James's timing)

- **START HERE (James, 2026-09-06 wrap): THE REST OF THE BUILDINGS.** His words: "do a bunch
  more and add them here and fill this up. And when it feels pretty full and awesome, we'll use
  that whole setup for Subdominant and Mediant." So: run the remaining concepts in
  tmp/orb-dimension/building models/ through the pipe (read `buildings.md` first — it is the
  whole pipeline; ~1 min per building for real; the ten tech pieces could skip the lit guide),
  seat them on Dominant's pads as they land, until Dominant feels full. Then the other two
  kernels reuse the setup. TRAFFIC STEP 2 (the three tube types) IS CANCELLED — his call
  ("too much work for no important return"; the brief was only to shape the lights' logic).
  THE STATION'S LIGHTS ARE FROZEN (rule below); both blur dials default 0 (v75.1). His traffic
  speed/amount defaults are 0.65 / 0.65 (v75.2, his numbers).
- **v71 + v72 BUILT 2026-09-06 (step 1 of the traffic plan + his flight notes):** a stream
  never lights more than a quarter of its length; far window blur defaults 3 (the start
  preset used to overwrite it — the save button now says when the file was not written);
  building windows show earlier (far gain); station windows ×3 + brighter
  (`gen_station_light.mjs`, KEEP); white packets 45%; dials "traffic speed ×" + "traffic
  amount"; packets soften with far window blur. AWAITING HIS FLIGHT; then traffic step 2.
- **STATION TRAFFIC — THE PLAN, STEP 1 BUILT AS v71, STEP 2 OPEN (2026-09-06 03:00, James: "I like your
  plan... I need to review it again tomorrow. Don't lose it.").** Read the plan file FIRST:
  `C:/Users/brook/.claude/plans/stop-rushing-forward-iterative-zebra.md` (a copy is in the changelog entry "2026-09-06 — the traffic plan"). Short form:
  the STATION LAB AS IT STANDS IS THE TARGET PICTURE from every distance (his words: windows
  and packets "look awesome... not much glinting"); the ring inner rails he LOVES — never
  touch; the one fault is spokes so full of packets they read as lighted bars. Step 1 (his
  nod given, build on his go after he re-reads): one rule in `trafficAt` — a stream never
  lights more than ~a quarter of its length (spacing ≥ 4 bead lengths, every tier); v70.3's
  2 px floor + 6 px thinning stay; rails/bridges/shares untouched; lab at 2.5/6/16 km, then
  he flies Dominant and compares to the lab at the same distance (read the world's resScale
  in flight — it drops to 0.5 under load, the lab never does). Step 2, its own go: the three
  tube types from his brief (transport = current thickness, manufacturing = middle, data =
  thinner; manufacturing most regular, data most varied like binary traffic, transport/cargo
  bunched on loose timers, faked with lights + timers, no simulation; blue/green/white only).
  Tonight's lesson (v70–v70.3 went in circles): judge every packet change against the LAB
  picture, one small change per round, his eyes between.
- **THE TOWNSHIP KERNELS (2026-09-05, James: the satellite cores are "a crazy, ridiculous
  jumble of granite blocks") — DOMINANT BUILT AS v68, AWAITING HIS EYES.** v70 (2026-09-06): the far-light rules — the station shares "far window blur" (James keeps 3) + footprint follow, packets melt under ~3 px, James's traffic mix (40% regular, variety without density, dense chains 5% and dim); see the changelog. Plan he nodded
  to: one kernel per town — Mediant an asteroid, Dominant a spine-and-ring station (built),
  Subdominant a stacked platform; the five finished buildings seat on pads at any scale /
  orientation / sink (his reuse rule: "get as much mileage out of this work as possible");
  more buildings land in the deal as they come through the pipe. Judge in
  `src/labs/station-lab/index.html` (admin Labs), then fly to Dominant. Rules: the station
  code lives inside communityGeometry (society-sim extracts it — local helpers only); the
  big members are forced titanium via `aux.z = 1` on a slab; pads carry `role` and
  `seatStationBuildings()` turns roles into instances. Tri bar 20k per town (TEST 6).
- **EVERY SPHERE BECOMES A REAL 3-D SHAPE (2026-09-03, "it has to") — PHASE 1 BUILT
  2026-09-04 (v63, THE BALL), AWAITING HIS FLIGHT.** Every eligible orb is a per-pixel
  sphere impostor now (real normal + depth test, key light from its nearest heart,
  refracted 2D interiors, worldlets as true globes, beings in world axes); dust, veils
  and crowd clouds stay discs by design. Dial "real spheres" in "the air" (0 = the old
  disc). Judge in `src/labs/sphere-lab/index.html`; guard with `sphere-sim`.
  He flew v63 ("pretty good"); the day's fixes are v63.1–v63.9. **PHASE 2 BUILT AS v64
  (2026-09-04, unjudged at his word): the 23 procedural interiors are VOLUMES** —
  `volMarch`/`volKind` in the orb FS, 20-step chord march gated on screen size, one
  recipe per kind, paintings flat. Judge in `src/labs/sphere-lab/index.html?sheet=interiors`.
  He read the BALL sheet row by row the same night → v64.1–v64.4 (water refilled, ball edge
  0.12, patterned shells world-locked + triplanar pattern, the baked highlight erased from
  balls via the min-over-rotations copy, galaxy on the ecliptic with a rigid arm pattern);
  rows 1/2/6/8 pass. NEXT: his read of the INTERIORS sheet, kind by kind.
  Rules: a recipe is emission + density at a point in the unit ball
  (orb axes, y up); thin features must be ≥ ~0.045 wide or 20 steps dot them; disc-like
  scenes get a real tilt so no viewer sees them edge-on; every kind must keep a `kind == N`
  branch (sphere-sim TEST 1 counts them). Changelog v63 + v64.
- **MESHY 3-D THINGS INSIDE THE BALLS (James, 2026-09-04, after reading the lab: "we will.
  In fact, definitely put that down") — PLACEHOLDER, NOT NOW.** Some interiors (the bear
  painting and its kin) are not worth making volumetric in-shader; the plan is real
  Meshy models inside the glass instead. Unscoped; his go when.

## World-specific rules

- THE STATION LIGHTS ARE FROZEN (James, 2026-09-06: "the exact right number of lights...
  freeze that and never change it again. If that ever changes again, I'm going to be so
  fucking pissed off"): the Dominant station's light look at `stnFarBlur` 0 / `stnLights` 1 —
  the map (gen_station_light.mjs v74.1, BLDG_V 34), the shader window cells (~8% at 2.2×), the
  packets, and the halo path in BLDG_FS — is his. Do not change their defaults, counts,
  brightness or blur. "far window blur" is the BUILDINGS' dial; "far window blur station lights"
  is the station's and defaults to 0.
- THE BALL (v63): orbs are per-pixel sphere impostors. The rules that hold it up —
  (1) the fragment shader writes `gl_FragDepth` on EVERY path (default
  `gl_FragCoord.z` at the top; a path that skips it makes depth undefined);
  (2) the hit runs in the distance-normalized frame (`cn = vCen/dist`, `rn = radius/dist`)
  — never the plain `|c|²−r²` form, it loses the radius in float32 at world distances;
  (3) facing (`bnz`) is measured against the PIXEL'S ray `rd`, never the center line
  `rd0` — the atlas rim is unreachable otherwise (round-3 bug); (4) the glass atlas is
  sampled with `textureGrad` on the disc's gradients, or the limb mips its rim away;
  (5) orbs never write depth — the orb pass keeps `depthMask(false)`; (6) the instance
  stride is 6 vec4 (FLOATS 24) — `i5` = key light dir + ball flag 0/1/2, set in the fill
  loop, guarded by v47-sim TEST 4; (7) dust, veils, glyphs, creatures and crowd clouds
  are flag 0 — do not make them balls, they are washes; (8) any new screen↔world
  math in the shader must use `vWp` (the quad point) for its ray — it already carries
  the v55.4 lens shift. Run `sphere-sim` after touching any of it; judge looks in
  sphere-lab.html before the world.

- THE MATERIAL PASS (v66): every solid the Cadence programs draw goes through
  `COMM_MAT` (tiles triplanar on `vLoc`, seeded wear, the building metal's specular) and
  every bridge wears its iron sheath. NOTHING SHIPS BARE (James, 2026-09-05): a new piece
  with a flat colour is a bug. Judge in `src/labs/material-lab/index.html`; new tiles go in
  `assets/tiles/` seam-blended (tmp script in the v66 session), bound on units 12–15.
  TEXTURE UNITS ARE SPOKEN FOR (v68.8 bug: the station tile on unit 5 sampled the fleet
  atlas in-world and read as stone while the lab looked right): 0–4 orbs/skull, 5 fleet,
  6 castes, 7 wisp atlas, 8–11 buildings, 12–15 tiles (hull / iron / station metal /
  titanium). A new tile must take a unit from this table, never a "free-looking" one.
- PACKETS ARE BLUE OR WHITE (v67, James: "I've hated them for weeks"): every data packet on
  a strut, bridge or feed uses `packetCol()` — three shades, never a family hue. Bridges roll
  one of three conduit families (iron / titanium / glass, `uBridgeFam`); judge them in the
  Material Lab rows 5–7.
- THE BUDGET (James, 2026-09-05: "keep your eye on the frame rates and processor cycles...
  let's not break the bank"): every station/kernel addition states its cost in the changelog
  (tris, draw calls, fragment loops); building instances skip below ~2 px (v68.7); society-sim
  TEST 6 bars 20k tris per town; his gaming laptop is the gate, not a weaker machine.
- CACHE TAGS (v63.7): index.html loads `world.js?v=NNN` and `world.css?v=NNN` — bump
  both with every build stamp, or James's reload serves him the old file and he reports a
  build as broken that he has never run.
- NAMING: the tuner panel is the "configuration" panel — never "GOD MODE" (James retired
  that phrase 2026-09-01: a one-off he said once, "goofy"; every world has a config
  panel and this is just this world's). Old changelog entries keep the old name.

- Flight feel is heavily matured (v14–v33) — do not retune acceleration, damping, or camera
  behavior casually; check the changelog history first.
- Camera restraint applies doubly here: James gets motion sick. No added shake, no fast easing.
- The Reef (v34, multi-colony v35) is fixed geometry: a pure function of REEF_SEED over
  the REEF_COLONIES table in `reefGeometry()`. `tmp/orb-dimension/reef-sim.mjs` extracts
  that block verbatim from world.js and asserts on it — after any reef change, run the
  sim; keep the extraction markers (`const REEF_COLONIES` … `// hue families`) intact.
- Fuel stations (v38) are the same discipline: `stationGeometry()` (stratified jittered
  grid, STATION_SEED) with markers `const STATION_SEED =` … `// station hues` — the sim
  extracts and asserts determinism, exclusion zones, and the forgiveness bars (TEST 9).
- The space is 1,000 × 1,000 × 250 km as of v49 ("the big dimension", per
  `expansion-spec.md` — read it before touching any of this). SPACE_X/Z/Y are the flight
  bounds (half-extents 500k/500k/125k m); CORE_X/Z/Y keep the old 48×48×12 as the
  populated core (field, station grid, skull, Lantern — all unchanged). Still no space
  sliders; sanitizeCfg() force-restores the CORE spreads. Geography finalizes and
  freezes — never put SPACE_* on a slider.
- CAMERA-RELATIVE RENDERING (v49): everything renders in ship space — instance positions
  subtract cam.pos in JS (float64) at upload, the view matrix is rotation-only
  (view[12..14] = 0), meshes get relative uniforms. NEVER reintroduce a world-space view
  translation or world-coord instance uploads: float32 jitter at 250km+ was the reason.
  ladder-sim source-guards both lines.
- Flight is a FLAT ladder as of v49 (James: never a sum — max-magnitude of impulse vs
  thrust). Tops/tanks/spools live in cfg (configuration tuner group): defaults 240 / 1,200
  (240s H2O, 5s spool) / 3,600 (360s DEU, 3s spool). `tmp/orb-dimension/ladder-sim.mjs`
  guards the shipped lines and the spec math — run it after touching flight or fuel.
- Dust is CAMERA-LOCAL as of v49: motes recycle through a box around the ship (wrap
  math in the frame loop) so speed reads at 3,600 anywhere in the gulf. Don't move dust
  back to world-fixed scatter.
- DISTANCE VIBE (v55): two dials in "the air" — `aerial` (luminance-preserving
  desaturate+cool with distance, shared COMM_AER snippet, structure shaders
  only: skull/comm/robots) and `melt` (fwidth-based subpixel dissolve: crust
  windows and glass dashes crossfade into their average glow instead of
  staying razor-crisp). Orbs keep their own v47 desaturation, beacons/hearts
  stay fog-proof, nebulae are exempt (they ARE the weather). True post-DOF
  was deliberately NOT built (fill-rate). shader-check substitutes COMM_AER —
  new shaders using it must keep the `${COMM_AER}` interpolation verbatim.
- Veils are fogged at 0.05 strength (v49.2), NEVER fog-exempt: their dim-mottling look
  only exists under fog — exemption rendered them as a ball pit of giant spheres
  (James's report, confirmed by screenshot). Halos are long-range only (v49.1 gate,
  40→140 radii). If wall/glow brightness reads wrong, those are the tune points.
- The reef colonies ring the core at ~250 km (v49): colonyLayout(LAYOUT_SEED) computes
  seats from the configuration ring dials (colonyDist/Vert/Jitter, defaults 250/0/0.5);
  applyColonyLayout() writes REEF_COLONIES[i].c; relayout() re-seats colonies + doorstep
  stations + actors without re-rolling the field pools. Ring dials are tuning-phase
  only — they freeze with the geography. Each colony has a heart-flagged beacon (fog-proof
  smudge across the map) and a doorstep station cluster (2 H2O + 1 DEU).
- Named places (v38, James-approved): the skull is Korrudan; the reef colonies are
  Yth-Alune (flagship), Sorrek Bloom, Vhal-Imir — NAV_NAMES in world.js, order matches
  REEF_COLONIES.
- THE COOPERATIVE SOCIETIES (v50, capital rebuilt v51): the SAELYRI (light-beings) +
  the CADENCE (machines; named itself in the common tongue). Four communities in
  COMMUNITIES[]: capital Tonic WRAPPED AROUND KORRUDAN at the origin (v51, James's
  spec — the skull is the capital's heart), satellites Mediant/Dominant/Subdominant on
  the anti-colony points of the hexagram (colony ideal angles +60°, radius =
  colonyDist/2 — DERIVED, never a dial). `communityLayout`/`communityGeometry` are
  fixed seeded geometry; markers `const SOCIETY_SEED =` … `// society hues` — run
  `tmp/orb-dimension/society-sim.mjs` after ANY society change (reef-sim also
  evaluates the block for stations). Rules: bridges never pass within 0.45×shellR of
  center; node hearts are the long-range read (beacon discipline); detail culls at
  300km with fade feather — don't fog-exempt society geometry. Stations: capital
  airspace = radial push (CAPITAL_KEEP, no RNG — never switch it to rejection, that
  re-rolls the whole forgiving-fuel grid); satellites carry doorstep clusters
  (counts 76 H2O / 42 DEU since v50). Chord-degree settlement names shipped
  provisionally — James may veto. Phases B (peoples/acknowledgment), C (resources:
  crystalline tritium + oxygen/lithium asteroids, harvest verbs), D (reef expansion:
  4× size, 3 new creatures, gestaltic glyphs, neuronal bodies) each need their own
  James checkpoint — see changelog v50 + expansion-spec.md.
- KORRUDAN STATION (v52, James's Knowhere brief): the skull is 12km
  (SKULL_SCALE 20) and IS the capital — Tonic has NO machine cloud (satellites keep
  theirs). SKULL_EL [4600,7100,6700] in the society block is the station keep
  ellipsoid — station grid, orb pushes, sun pushes, and the city hum all key off it;
  never reintroduce a sphere keep. Capital-only geometry (`isCap`): 10 orbital hoops,
  26 through-the-bone threads, THREE sun feeds (bridge-pass ribbons, aux.w=1 = feed →
  the shader streams packets INWARD only — the god is fed, it does not answer).
  Capital suns get deterministic no-RNG pushes out of the ellipsoid and off the
  spawn sightline. Society-sim TEST 3 asserts the wrap, TEST 8 the fuel contract
  (Korrudan doorstep ring 6 H2O + 3 DEU), TEST 11 the feeds.
- THE CRUST (v52): the city grows FROM the bone. `tmp/orb-dimension/crust_points.mjs`
  samples the real skull surface → `assets/skull/crust.bin` (rerun after any skull
  mesh change); `crustGeometry()` in world.js (markers: CRUST_SEED declaration → the
  crust-hues comment — NEVER quote those marker strings verbatim in nearby comments,
  the sim's block-cut will find the comment first) grows shanty stacks with window
  grids (solid-shader aux kind 2 — the scale ruler), gantry masts, tank farms, the
  warm refinery jaw (warmth is positional: low+forward = furnace), and the two iris
  rings per eye socket. THE FACE STAYS ALMOST BARE (crust-sim TEST 4) and the bone
  must always dominate — Knowhere rule: ~75% bare bone, districts not blankets. Run
  `node tmp/orb-dimension/crust-sim.mjs` after touching any of it. CRUST_SCALE/TILT
  in the block restate the skull loader's numbers — change both together.
  v57 (James's close-up brief — "the windows are way too big... don't look at
  all like real buildings"): window pitch is PHYSICAL (~7.4×5.6m; ec carries
  face half-sizes + pattern id; portholes square 6.2m) — never go back to a
  per-face fixed grid, that's what made windows read as hundred-footers. Three
  wall patterns per stack (grid / down-strips / portholes); roofs and floors
  are style -1 dim service hatches (wall patterns on ceilings read as monster
  stripes). Solid-shader aux kind 3 = emissive screens/neon (ad program with
  the bright frame + neon program; both melt like windows). Tech kit: comm
  dishes, sign pylons, rooftop kits (greebles/antennae/billboards/neon rails),
  tank level-bands. Judge ALL crust look changes in
  `tmp/orb-dimension/crust-lab.html` FIRST (auto-captures a 6-pane sheet to
  tmp/snapshots/ via /api/dev-snapshot) — three rounds ran there before James
  saw anything.
- THE NEBULAE (v53, James's brief): five banks of glowing gas — one over home
  in the spawn sky, four in the gulf (52–82km) — each speaking ONE of five
  palettes (their own identity, deliberately NOT the reef hue families).
  Markers: the NEBULA_SEED declaration → the nebula-hues comment; run
  `node tmp/orb-dimension/nebula-sim.mjs` after any change. Three rules that
  are load-bearing, all learned the hard way in `nebula-lab.html` (7 rounds
  with James — keep the lab, it is where look changes get judged BEFORE they
  fly): (1) NO BALL PIT — wisps are torn by baked noise, stretched along
  their strand, in 4 size octaves; a sprite must never read as a disc.
  (2) NO SOMERSAULTS — the stretch axis relaxes to round as its screen
  projection degenerates; never restore a hard normalize, TEST 7 bounds the
  residual swing. (3) THE NEAR-FADE IS THE FRAME RATE — a wisp is gone below
  4 of its own radii and full at 9; TEST 6 bars interior overdraw at the
  DENSITY SLIDER'S CEILING (hence the 1.2 cap). Tune the fade against the sim,
  never freely. The alpha+gradient field is BAKED at init into a 6-variant
  atlas (`bakeWispAtlas`, unit 7) because per-fragment fbm cost 48 sines —
  `wisp-atlas-check.mjs` runs the shipped bake and writes a PNG preview; look
  at it after touching frequencies (the coarse family at 3.2 baked discs).
  v54: `nebScale` (0.5–2, default 1.6) multiplies bank RADII only — seats
  stay put, and gulf seat selection rejects the spawn corridor at the DIAL
  CEILING (SCALE_CAP in nebulaGeometry restates the slider max — change them
  together). Sim TEST 10 re-proves every clearance bar at the ceiling and
  reads both numbers out of world.js. Satellite keep-out is the real town
  seats (communityLayout), not a blanket ring radius.
- THE SAELYRI IN-WORLD (v56, Phase B1 — James's go on the 11-point plan +
  "ten times the populations"): kind-65 orb actors, 10m beings, 140 at
  default dials (`saelyri` capital pop ×0.6 satellites, `citizens` per-caste
  robots, `saeNotice` greet range — configuration · the societies). Rules:
  (1) the look is the Being Editor's shader with preset james-being-01
  BAKED as FS constants — look changes happen in the editor first, then
  re-bake the constants (they're commented at the kind-65 block); never
  fork the look here. (2) LOD is the population contract: below act 0.2 a
  being is a 2-line mote — never make far beings busy; filaments gate on
  act>1. (3) All motion is CLOSED-FORM in updateActors (orbits + bridge
  ping-pong + morph schedule are pure functions of t); saelyriLayout is
  deterministic and lives INSIDE the society-sim extraction markers — run
  `node tmp/orb-dimension/society-sim.mjs` (TEST 12) after any change, and
  shader-check (it compiles the main orb FS now). Capital orbits re-roll
  deterministically until the whole circle clears Korrudan — don't remove
  the guard, TEST 12 bars it at the dial ceiling. (4) Acknowledgment is
  respond-in-place: face the pod, brighten, glyph, chord. Approach behavior
  is a LATER personality pass — don't add it unasked. (5) The greeting
  glyphs are atlas rows 8–9 (SAE_GLYPH0=64, ten authored marks, random
  color per greeting); reef rune picks stay in 0..63; the atlas is 8×10 and
  the kind-60 shader divides y by 10. (6) Chords: SAE_CHORDS per family,
  25s per-being + 1.6s global spacing — never let a crowd stack chords.
  Phase B2 (fleet community routes + society sound beds) needs its own go.
- THE CROWDS (v61, 2026-09-01 — James's go on the eight-point design): the
  Saelyri are rolled as GROUPS doing seven verbs (congregation / stream / pair /
  gathering / home traffic / play / FORMATION — v63.6, six shapes from
  `saeFormation()`, society-sim TEST 16 bars seat spacing 8–95 m, all six
  shapes rolled, and the pose reproducing the shape), sized to their HEADCOUNT at 15–40 m
  spacing — never to the sun (crowd-lab round 1: rings sized to the sun put
  beings 300 m apart and nothing read as a crowd). Read `crowds.md` FIRST.
  Rules: (1) `saelyriLayout` / `saelyriPose` / `saelyriMorph` / `saeCloud` live
  INSIDE the society-sim extraction markers and may only use what the block
  declares (TAU, Math, mulberry32, SKULL_EL, COMMUNITIES) — no `clamp`, no
  flight helpers; `SAE_TOWERS` restates BLDG_KINDS.length (TEST 15). (2) Every
  pose is a pure function of t; nothing integrates. (3) Capital discipline:
  rings/orbits re-roll clear of the bone, stream routes reject bridges that cut
  the ellipsoid, home lanes face outward, and EVERY capital pose is pushed to
  en ≥ 1.04 last — TEST 13 samples 33k poses and bars the pushed share at 5%;
  if it climbs, fix the roll, don't raise the bar. (4) Crowd clouds (kind 66)
  are gated OFF inside 2.5 radii and collapse their quad to a point under the
  gate (a zero-alpha quad still costs pixels); TEST 14 bars cloud fill at 6
  screens. (5) The verb mix is dealt exactly to the weights — tune weights,
  never the draw. (6) Judge every crowd look change in
  `tmp/orb-dimension/crowd-lab.html` first (T toggles forced/natural tide).
  Dials live in the configuration panel's "the crowds" group; `saelyri` is
  retired (saved cfgs carrying it are ignored). (7) v63.5: THE CROWD CLOUDS (kind 66) ARE
  RETIRED — James: the beings themselves resolve from far dots to bodies "very well";
  every stand-in read as fuzzy puffballs. `CROWD_CLOUDS = false` at the group roll, no
  dial. Do not bring back a far-LOD proxy for a crowd; if far towns read empty, make the
  far MOTES brighter — never a blob.
- THE BUILDINGS (v58, 2026-08-14/15): read `buildings.md` in this folder
  FIRST — it is the whole pipeline (concept → GPT lit guide → Meshy raw GLB →
  Node weld + Blender decimate → guide_extract2/guide_place2 → export_bldg →
  BLDG .bin + light map) and the list of dead ends. Load-bearing rules:
  (1) placement of lights comes from the GPT GUIDE via raycast; we author the
  panes — never rule systems, never pixel projection, never silhouette sweeps.
  (2) `BLDG_V` in world.js MUST be bumped on every export (browser caches
  the light map). (3) The light map is cylindrical with reserved rows (pad
  strip, dead rows, strut row 0.0965 → pale ceramic + no windows, beacon
  row) and the export flips V. (4) Neon: tight kernel/whisper weight for
  amber, wide accent-only kernel/big weight for blue+pink — change weights
  to dim, never widen amber's kernel. (5) Every building carries a
  DICTATED `vantage` (James's coordinates); VIEW [V] on the deck jumps to
  it. Deck shortcuts N/T/C/V, four equal rows, console-fit must stay 0px.
- THE FIELD HOMES (v62, 2026-09-03 — supersedes the Meshy home below for what
  stands in the shells): the generator `tmp/orb-dimension/glowhome_fields3.py`
  (lattice + `order` dial rolled per seed 0.3–0.7, three size tiers, crystals at
  ANY angle — no gravity, no up — eight lab instruments, filaments, blobs, honey +
  teal + blues) is baked by `export_fields.py <NN> <seed> [order]` into
  `assets/homes/fields-01..06.bin`, magic GHM2 (GHOM record; uv.x = class×1000 +
  hue°, uv.y = opacity). Rules: (1) look changes happen in the generator and are
  judged on a three-seed sheet (`gh_sheet.py`) BEFORE re-baking; (2) re-bake only
  in `--export` mode and keep each roll ≤ ~50k tris (the first bake was 157k —
  bevels + ring segments on the small tier); (3) bump `glowHome.v` on every
  re-bake; (3b, v63.9) a roll is centred on its BULK (iterated p85 trimmed mean), never its
  bbox — spears drag a bbox centre off the body and the home sits half outside its ball;
  the loader re-centres every GHM2 file the same way, so the two are idempotent together; (4) the glass program's kind 3 + class/4 branch is the in-world
  material — panes carry their own opacity, ribbons/filaments are hot lines;
  (5) each shell deals itself a roll + a random orientation from SOCIETY_SEED —
  `homeSeed` rotates the deal and only re-uploads the communities; (6) the hex
  plates remain the file:// fallback, `homeV0/homeI0` rule unchanged; (7) v62.2 THE
  HOME GLOW PASS: the homes draw twice — once sharp in the glass pass (weight
  1 − 0.75·homeBlur) and once alone into a quarter-res FBO (`homeGlow`, depth pre-pass
  of skull + Cadence solids, uHomePass=1 discards everything else), blurred 2×, added
  after the orbs on TEXTURE9 — never bind that pass's textures on unit 0, other programs
  keep their bindings across frames; the pass restores viewport/blend/depth itself.
- THE GLOW HOMES (v60.1, 2026-08-17): the energy beings' habitat inside every
  Saelyri SHELL (James, 2026-09-01: the glowing balls are shells, not suns — the
  inside is dark; force fields have zero thickness — see changelog 2026-09-01/02) is a MESHY structure James made from a GPT concept, re-materialed
  in-world by the glass program (kind-2 crystal: fresnel dims faces / brightens
  edges, sun term glows from the core, family hue). Pipe, name-driven:
  `weld_bldg.mjs <name>` → `decimate_bldg.py -- <name>` → `export_home.py --
  <name> [tris]` → `assets/homes/<name>.bin` (GHOM, big-endian magic, unit
  radius, Y-up); `glowHome.name` in world.js picks it; bump its `?v=` on every
  re-export. Fit is `HOME_FIT` = 0.45 × nd.r — the visible ball is the heart orb
  at 0.5 × nd.r, homes must stay inside it (James's standing correction). The 15
  hex plates in communityGeometry are the FALLBACK only (file:// / before the
  fetch lands) — `homeV0/homeI0` mark where they start in the glass tail; keep
  them last in the glass buffer or the cut breaks. Blender look-dev harness:
  `tmp/orb-dimension/glowhome_look.py` (judge new homes there before exporting).
  init-smoke asserts the mesh path (HOMES line).
- THE BEING EDITOR (`src/labs/being-editor/`, v54): the Saelyri look-dev lab,
  promoted from tmp/orb-dimension/saelyri-lab.html (superseded, kept as v53
  reference). A lab, not a world — no drift/registry; linked from the admin
  panel Labs section. Being dropdown is the roster contract for future
  peoples. Shader discipline: turbulence NEVER displaces the distance field
  (that was the blob bug) — interior is three layers: shell at d=0 (`edge`
  slider), ridged-fbm filaments (structure), shrunk-form skeleton (core
  heat); veins don't feed alpha. When the look lands, this shader becomes
  Phase B's SDF actors in-world.
- THE CADENCE CASTES (v51): six citizen robot kinds — chanter / lattice-wright /
  archivist / ferry / warden / gardener — Blender-built from primitives by
  `tmp/orb-dimension/cadence_robots.py` → `assets/robot/cadence-01..06.bin` (magic
  CBOT, robot.bin layout) + shared `cadence-palette.jpg` (flat-color swatches, UVs
  pinned to swatch centers; edit colors by editing SWATCHES in the script and
  re-running headless — never repaint the jpg by hand). 3 per caste at the capital,
  2 at each satellite, seeded in makeActors, closed-form work loops in updateActors,
  drawn one VAO bind per kind, 14km cull. Served-only like the fleet: on file:// the
  towns have no citizens and their work glows stay dark (fixedR 0) — keep that
  pattern for any new caste. ROBOT_VS/ROBOT_FS are shared fleet+caste shaders; each
  program parks its texture on its own unit (fleet 5, castes 6).
- Fuel is deliberately forgiving IN THE CORE and at colony doorsteps: impulse (W/S)
  never burns fuel; H2O feeds the booster, deuterium feeds overdrive (tank seconds in
  cfg since v49); stations refill to FULL on a 150m flyover. The gulf between core and
  ring is honestly empty in phase 1 (guaranteed-find grid is a later phase). Don't add
  drain to impulse or partial refills without discussion.
- Lock-on autopilot (v43): nose on the nav ring 3s → armed → click inside = AUTO. Any
  control input (except N) releases it instantly — never make the autopilot fight the
  pilot. Coast release point = standoff + (|thrust|+|impulse|)·3.2s.
- Both impulse and thruster COAST on release (τ 3.2s, v44); X is the brake. Spawn is
  [0,0,54000] facing the station (v53.1, James's "twice as far back"; SPAWN_PITCH is 0
  — the v42 −3° was calibrated for the 1.8km skull). The spawn sits INSIDE the nebulae's
  52–82km gulf band, so nebula-sim TEST 9 guards that no bank swallows the spawn or the
  approach line — if the spawn moves again, move that test's SPAWN with it, and the
  sight-corridor bounds (54600) in assemble() + stationGeometry() + their sims.
- The skull's eye-gaze offset is clamped to 320m (v52 = the v29-measured 48m clamp /
  53m socket clearance, both × 20/3). Don't raise the clamp without re-measuring;
  reef-sim TEST 6 mirrors these numbers — change both together.
- The skull normal map (`assets/skull/skull-normal.jpg`) is raw-extracted from the source
  GLB, glTF +Y convention. If bumps ever read as dents, flip the green sign in perturb().
- v47 systems (interiors, worldlets, colony life, the fleet): run
  `tmp/orb-dimension/v47-sim.mjs` after touching any of them (binary formats,
  retirement cleanliness, instance-stride wiring, shader kind coverage) — plus
  reef-sim as always.
- THE MAGNIFIER (v55.1): wheel zooms 1×–8× by narrowing effective FOV
  (`zoom`/`tanF()` beside the matrices); Z resets. Every tan(FOV/2) site
  MUST go through tanF() — a raw tan reintroduces click/HUD drift while
  zoomed.
- LENS SHIFT (v55.4): the optical axis passes through the RETICLE X, not
  the window center (proj[9] = −projShiftY(); the glass sits above the
  console so the two differ). Any new screen↔world math must include
  projShiftY() on the y side (see rayDir / home marker / nav ring) or it
  will land below the eye's truth. Rolls/turns/zoom all pivot on the X —
  that is the point of it (James's in-place barrel roll). Steering rates divide by zoom (stick gain + arrow ROT; stick-sim
  guards the gain line's exact /(mag * zoom) form) — never let zoomed turn
  rates run at full speed, that's a motion-sickness whip.
- Mouse look is a critically-damped second-order servo (LOOK_W 10, v47). Do not revert
  to a first-order ease — the discontinuous velocity was the jerk James flagged.
- Steering is a virtual joystick PINNED to the center reticle (v48.2, James's spec):
  grab within reach/2 of the reticle, hold, pull — offset commands a turn rate
  (deadzone → curve → saturation rim), fed to the v47 servo at rate*dt like the
  arrows. Release = neutral, arming is per-hold. No stick chrome in center mode —
  the reticle marks neutral (the v48 rim circle was "too present"; STICK_RIM flag
  brings it back for tuning). Feel lives in cfg (stickDead/Reach/YawMax/PitchMax/
  Curve, tuner group "the stick"); drag-stick (press plants it anywhere) is the
  tuner alternative. Don't touch the formulas — `tmp/orb-dimension/stick-sim.mjs`
  source-guards them and must pass after any change. stickLive discipline:
  autopilot engage, R, H, and release disarm; only beyond-deadzone motion while
  holding re-arms. Never let a parked cursor steer.
- THE POD CONTRACT (v55.3, James: "this is space... I just point where I
  wanna go. It turns where I turn it, and it stays there"): EVERY rotation
  is ship-frame — yaw about cam.u, pitch about cam.r, roll about cam.f. No
  world-frame axes, no attitude-dependent blending, no aerodynamic behavior,
  ever. (The v55.2 horizon-locked yaw was tried the same night and REVERTED
  — it whipped the view near 90° bank. Don't rebuild it.) The reticle tilt
  shows COMMANDED roll (`rollShown`: A/D integral, R/goHome ease it home),
  never world attitude — world-bank drive is what made honest body-frame
  turns read as phantom rolls. BNK in the console stays world telemetry.
  stick-sim TEST 7 + guards hold all of this.
- The v26 bank-carve is RETIRED (v48.4, James's pencil spec): A/D is pure roll
  about the boresight and must never change heading — flying + roll = corkscrew
  with the nose glued to the target. Turning belongs to the stick alone. The
  carve code survives behind BANK_CARVE (false); don't re-enable without James.
  General rule from the v48.3→v48.4 arc: no world-frame rotation may ever fight
  or redirect the pilot's pull.
- Instance data is 5 vec4s (FLOATS 20); i4 = kind, p0, p1, activity. Kinds: 0 plain,
  1–26 procedural interiors, 40+p0 art layers, 50+p0 worldlets, 60–64 colony actors.
  Interiors have three proximity states (act 0/1/2, smoothed, size-scaled thresholds) —
  "vague nothings from far away" is the contract, don't make far orbs busy.
- Tech interiors stay relatively common (decorate() weights, James's spec). The bear
  (art layer 0) stays rare — that's what makes finding it an event.
- Vess-Karai the Lantern is RETIRED (v52, James: "completely remove... we'll bring
  it back in another format later"). assets/pyramid/ and tmp pyramid_build.py stay
  archived on disk; v47-sim TEST 1 asserts world.js never touches them. Do not
  rebuild it without James; its hum synth lives on as the city hum (sound.cityHum).
- Worldlet maps sample with MIRRORED longitude (no seam, geography doubles back —
  deliberate). Planet layers are 3–7 of the art array; a 3.5% inset crop at upload
  kills the generated maps' letterbox borders.
- Colony actors rewrite their o.fix arrays every frame — the renderer doesn't know
  they move. Never spawn an actor at [0,0,0] (that's inside the skull); seat it first.
- The robot fleet is served-only (mesh fetch) and its glow/cargo actors stay at
  radius 0 until the mesh loads. ROBOT_FACING in world.js flips the nose if James
  reports the fleet flying backwards — glTF says +Z front, unverified by eye.
- Meshy spend 2026-07-21: 81 credits (5 planet maps, 3 interior paintings, robot
  preview+refine) — James pre-authorized 100.
- Tuner presets are FILE-BACKED as of v49.4: `assets/presets.json` is the source
  of truth when served ({ presets: {name: snapshot}, default }), synced via
  `GET/PUT /api/worlds/:slug/presets` (server.mjs, generic — timestamped backups
  in tmp/<slug>/preset-backups/). Saving a preset in the tuner writes the file;
  to see what James saved, just read it. Sessions may also edit it (his picker
  updates on reload; a changed start preset applies next reload, never
  mid-flight). localStorage is only the boot cache and file:// fallback — an
  empty/absent file gets seeded from the browser store on load, so never ship a
  placeholder presets.json.
