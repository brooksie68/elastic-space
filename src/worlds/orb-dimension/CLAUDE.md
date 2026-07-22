# The Orb Dimension — Claude instructions

Free flight through cave-black space among drifting glowing orbs — and the mile-high fossil skull of a dead god, red-eyed, at the center of it all.

## Docs

- `changelog.md` — session history, newest first (long flight-model history; the spaceship arc was retired).

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
- The space is STATIC as of v38: 48 × 48 × 12 km (SPACE_X/Z/Y consts = the old slider
  maxes). There are no spread sliders; sanitizeCfg() force-restores the constants against
  stale saved presets. Don't reintroduce space tuning without James asking.
- Named places (v38, James-approved): the skull is Korrudan; the reef colonies are
  Yth-Alune (flagship), Sorrek Bloom, Vhal-Imir — NAV_NAMES in world.js, order matches
  REEF_COLONIES.
- Fuel is deliberately forgiving: impulse (W/S) never burns fuel; H2O feeds the booster
  (180s tank), deuterium feeds overdrive (120s tank); stations refill to FULL on a
  150m flyover. Don't add drain to impulse or partial refills without discussion.
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
