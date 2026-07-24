# The Orb Dimension — Claude instructions

Free flight through cave-black space among drifting glowing orbs — and the mile-high fossil skull of a dead god, red-eyed, at the center of it all.

## Docs

- `changelog.md` — session history, newest first (long flight-model history; the spaceship arc was retired).
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
- Fuel is deliberately forgiving IN THE CORE and at colony doorsteps: impulse (W/S)
  never burns fuel; H2O feeds the booster, deuterium feeds overdrive (tank seconds in
  cfg since v49); stations refill to FULL on a 150m flyover. The gulf between core and
  ring is honestly empty in phase 1 (guaranteed-find grid is a later phase). Don't add
  drain to impulse or partial refills without discussion.
- Lock-on autopilot (v43): nose on the nav ring 3s → armed → click inside = AUTO. Any
  control input (except N) releases it instantly — never make the autopilot fight the
  pilot. Coast release point = standoff + (|thrust|+|impulse|)·3.2s.
- Both impulse and thruster COAST on release (τ 3.2s, v44); X is the brake. Spawn is
  [0,0,20000] pitched −3° onto Korrudan's face (SPAWN_PITCH, James-calibrated, v42).
- The skull's eye-gaze offset is clamped to 48m — the v29 sim measured only 53m of
  clearance between eye center and socket bone. Don't raise the clamp without re-measuring.
- The skull normal map (`assets/skull/skull-normal.jpg`) is raw-extracted from the source
  GLB, glTF +Y convention. If bumps ever read as dents, flip the green sign in perturb().
- v47 systems (interiors, worldlets, Vess-Karai, colony life, the fleet): run
  `tmp/orb-dimension/v47-sim.mjs` after touching any of them (binary formats, Lantern
  placement, instance-stride wiring, shader kind coverage) — plus reef-sim as always.
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
- Vess-Karai the Lantern is fixed geometry at [9500, −5850, 6500] (LANTERN consts;
  `pyramid_build.py` in tmp regenerates pyramid.bin). Its apex must stay below the
  station grid's floor (−4370) — the no-overlap proof in v47-sim depends on it.
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
