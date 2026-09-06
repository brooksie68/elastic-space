# Battle for the Moon 2075 — the TANK half. Claude instructions.

This folder is the TANK session's. The lander session (the flying half, one
folder up) never edits anything here; this session never edits anything
outside `tank/` and `tmp/lunar-lander/tank-*`. The split, the git protocol
and the look contract are in `../tank-brief.md` — read it first, then this.
Needs for the lander side go in `NEEDS.md` here, one line to James.

## What it is (James, 2026-09-06)

"Like Battle Zone!" — the spiritual guide, not a recreation. First person
out of a lunar tank: turn, look up and down, drive; structures the lander flew
over stand here in 3-D ("use the same wire model and build it into a 3D
shape"); enemy tanks built here may go by in the lander's side view later.
His calls: slow tank + medium tank + SAM site for now; the arcade shell (one
in the air) plus a laser blast; a hull that absorbs two hits and dies on the
third; five missions and a boss mission, like the lander. The two halves must
feel like ONE game when the pilot climbs out — the lander session and this
one align on presentation by message (both sessions are live at once).

## How it is built (the lander's discipline, exactly)

- `tank-core.js` — ALL rules, pure (no DOM, timers, Math.random; seeded rng;
  fixed 1/120 s). Loads AFTER `../structures.js` and `../game-core.js`:
  the moon is read through `LunarCore` (chunks, `groundAt`, seam levels,
  `chunk.structures`), never copied. Exposes `globalThis.LunarTankCore`.
- `tmp/lunar-lander/tank-sim.mjs` — asserts on the real core
  (`node tmp/lunar-lander/tank-sim.mjs`). Ten tests: determinism + the
  shared moon, the ground, driving, the shell, the laser, the hull, enemies,
  SAM sites + the bunker door, missions + an autopilot that clears mission 1,
  readouts. RUN IT after touching tank-core.js. Nothing is handed over red.
- `tank-render.js` — the picture, three.js ES module. **The line kit is a
  COPY of render3d.js** (DEFAULT_PARAMS, the six shaders, LineBatch,
  GroundFill, the post chain), dated in the header, every constant identical;
  when the lander session pulls `vector-kit.js` out, this imports it. ONE
  extension, marked: `LINE_VERT_DEPTH` — the same quad expansion, clipped to
  the near plane in the shader, writing real depth. First person occludes by
  DEPTH (black fills write it: the ground mesh, the skyline strips, a black
  box under every structure and enemy hull; the line batches test it), where
  the side view occludes by draw order.
- `tank.js` + `tank.html` — the shell: mission flow, input, the console,
  sound (Web Audio synthesis through the shared control), tuner. The console
  CSS is the lander's `:root` / `.panel` / `.lbl` / `.num` / `.unit`
  verbatim so the two consoles are one family. `?silent=1` skips the sound
  attach (pane-safe; no AudioContext is made).
- `tmp/lunar-lander/tank-lookdev.html` — the silent look-dev page: the real
  core + renderer, WASD drive, Q/E look, Space/L fire, sliders for every look
  knob, NEW MOON / M1 M2 M3 BOSS / KILL NEAREST / HULL HIT / WAVE buttons, an
  autopilot checkbox. `globalThis.LAB` (`LAB.tick(dt)`, `LAB.state`,
  `LAB.scene`) so a checker can drive frames when the pane freezes rAF.
  KEEP IT — it is where the picture is judged.

## The ground (rules)

- Physics ask `groundAt(state, x, z)` and nothing else. It is the lander's
  flight profile along x, SOFTENED for wheels: averaged over ±200 ft (a
  pad's 50 ft wall, a rough-zone spike become rises), heights above the
  chunk's base compressed through `tanh(SOFT = 80)`; cached per chunk at 5 ft
  (`profileAt`); plus two octaves of hashed relief in z (6 ft at 500, 2 ft at
  130); every structure's footprint is dead flat at its own natural level,
  blended over `FLAT_MARGIN` 40 ft. Sim TEST 2 guards: max grade < 1.0, no
  5 ft step, every footprint flat.
- Structures come from `chunk.structures` with a hashed z within
  ±`structureSpread` (420 ft) of the flight line (`chunkStructures`, cached
  per chunk on the tank state). `x` is the lander's footprint centre; `alive`
  flips on the lander's object too (`s.st.alive`).
- The flight line (z = 0) is drawn on the ground brighter than the grid:
  the path the lander flew.

## The rules (as built; every number is a constant at the top of the core)

- Tank: 62 ft/s forward, 28 reverse, the turn EASES in and out
  (`turnAccel`), a slope slows it; look ±0.42/−0.22 rad, rate-limited; eye
  9.5 ft. Structures are solid (slide off, `bump` event).
- Shell: 520 ft/s, lunar gravity, one in the air, radius 10; leaves along the
  heading AND the look pitch (looking up lobs).
- Laser: instant line to 1400 ft, one charge, 6 s recharge; hits the first
  thing on it; stops on civilians without harm; downs missiles.
- Enemies: `ENEMY.slow` / `medium` / `boss` (the siege tank, 6 hp, the boss
  mission only). Approach to range, circle-strafe, then STOP to aim and fire
  (`mode 'aim'`, `Math.abs(e.speed) < 4` before a shot — the arcade's
  fairness). They avoid structures, keep off each other, hold fire when a
  building is in the line and reposition (`reposT`). Their shells hurt at
  12 ft of the hull centre.
- SAM sites (`sam` structures, and the bunker's roof SAM) fire a homing
  ground missile at 1100 ft every 6.5 s; the bunker's DOOR opens 2 s when it
  fires — the only time a shell hurts it. Shield (`core`) takes two.
- Hull: `TANK.hits` 3 — two absorbed, the third kills; `TANK.lives` 3;
  `respawn` keeps the field as it stands (kills stay dead).
- Score: 100 × the X rating (enemies: slow 1, medium 2, boss 5; structures:
  the lander's `mult`). Civilians: never targetable, absorb shots, pay
  nothing. A hostile structure's damage runs through the LANDER core's
  `hitStructure` (one rule for shield / dead / level count; the lander's
  chunk object flips) — the tank only gates it (civilian, door shut) and
  reads `alive` back. The tank's own score is its own tally.
- Missions: `MISSIONS[1..6]` — a chunk stretch + waves. Complete when every
  hostile structure in the stretch is dead and every wave spawned and dead.
  Waves come when ≤ 1 enemy is left. Spawns 1300–2200 ft off, mostly ahead.
- Readouts (`readouts(state)`): contacts as bearing / range / `dy` (target
  centre above the eye — what a gunner lays the gun with) / kind; nearest;
  inRange (< 900 ft); hull; shell ready; laser charge; heading; speed.

## The look (rules)

- Everything in the brief's list 1–8 holds. Civilians 0.62, hostiles 0.85,
  enemy tanks 0.95, the ground grid 0.28 (every 100 ft, laid EXACTLY along
  the ground mesh's rows so a line never sinks under a chord), the flight
  line 0.5, fog on ground lines 500 → 2600 ft, two skyline rings (7,000 and
  11,000 ft, hashed by bearing so turning never moves them), stars behind.
- The camera: heading direct (the core eases the turn), look pitch direct
  (rate-limited in the core), the ground's pitch and roll eased in (τ 0.6 s,
  roll ≤ 0.05 rad). **No shake, ever.** Death: the view sags forward over
  ~1 s and the lines dim.
- Your gun is only the last six feet of the barrel under the crosshair (a
  full barrel from the eye read as a giant V). Kills break along their own
  strokes (`spawnBreak`), sparks, an expanding ground ring; hull hits fracture
  the picture with SVG cracks in the console's ink and a 90 ms black veil —
  no red flash.
- Instruments: ONE console top centre — radar (SVG sweep, blips: dots for
  tanks, squares for sites, a blinking dot for a missile; the note reads NO
  CONTACT / N CONTACTS / ENEMY IN RANGE / MISSILE INBOUND), SHELL + LASER,
  HEADING + SPEED, SCORE + mission meta, and HULL as the big bar under
  everything (three cells; the last one blinks) with the tanks left.
  Crosshair centred, warms to the line colour over a hostile; the hostile
  under it draws at 1.25 (the lander's hover value) with the lander's AMBER
  tag over it — #ffb457, NAME + X, one word under (OVERHANG / RIDGE / DOOR /
  SHIELD; DOOR SHUT in pink #ff8fa3 as the refusal); civilians get nothing.
  Rubble is the lander's `_rubble` recipe stroke for stroke (same rng), so a
  building killed from the ground looks the same from the air.
- Keys: W S drive, A D turn, mouse height = look (no pointer lock; a PLAY
  dial turns it off; Q E look too), click / Space shell, right click / L
  laser, P pause, R restart (armed twice). Tuner: PLAY (mission, mouse look,
  turn rate, seed) + LOOK (the knobs, kept in localStorage — the lander's
  preset file is the lander's).

## Not built / open

- The seam (climbing out of the lander into the tank): James's decision with
  both sessions when both halves stand. The tank page stands alone at
  `tank.html` until then; not a world (no admin row, registry, drift).
- Enemy tanks in the lander's side view: authored here in the shared format
  (`MODELS` in tank-render.js, model space x right / y up / z back) — tell the
  lander session the ids when James wants them going by.
- Revolved forms for the round structures (NEEDS.md item 1).
