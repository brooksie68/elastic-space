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
  ladder-sim stick-sim` plus `tmp/orb-dimension/shader-check.html` in the browser
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
  expansion: space + ladder + ring colonies + GOD MODE) BUILT 2026-07-23 as v49 with
  James's go — awaiting his first flight. Stargates, depot grid, grown reefs, hub
  society, luminous region: still spec-only, still need discussion.

## World-specific rules

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
  thrust). Tops/tanks/spools live in cfg (GOD MODE tuner group): defaults 240 / 1,200
  (240s H2O, 5s spool) / 3,600 (360s DEU, 3s spool). `tmp/orb-dimension/ladder-sim.mjs`
  guards the shipped lines and the spec math — run it after touching flight or fuel.
- Dust is CAMERA-LOCAL as of v49: motes recycle through a box around the ship (wrap
  math in the frame loop) so speed reads at 3,600 anywhere in the gulf. Don't move dust
  back to world-fixed scatter.
- Veils are fogged at 0.05 strength (v49.2), NEVER fog-exempt: their dim-mottling look
  only exists under fog — exemption rendered them as a ball pit of giant spheres
  (James's report, confirmed by screenshot). Halos are long-range only (v49.1 gate,
  40→140 radii). If wall/glow brightness reads wrong, those are the tune points.
- The reef colonies ring the core at ~250 km (v49): colonyLayout(LAYOUT_SEED) computes
  seats from the GOD MODE ring dials (colonyDist/Vert/Jitter, defaults 250/0/0.5);
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
