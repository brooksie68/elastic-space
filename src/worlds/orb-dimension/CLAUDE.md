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
