# Moon Battle 2075 — the TANK half. Claude instructions.

**ONE SESSION NOW (James, 2026-09-07): "let's work on the tanks a little bit,
just in this session, rather than trying to run two at the same time."** The
lander session owns this folder too from here on; `../tank-brief.md` is the
history of the split and still the look contract. `NEEDS.md` stays as a list
of what the two halves owe each other.

## THE CONTROLS (2026-09-07 — James: the hull-steers-the-gun scheme was "so goofy and hard to use")

The 2026 tank scheme, the way every modern tank game works:

1. **The mouse aims.** Pointer lock while you play (click the field to take
   it; Esc lets go and pauses). The VIEW turns with the mouse any way round,
   up and down, instantly — `t.look` / `t.pitch` in the core, absolute.
2. **The gun follows the view with mass** — core `TURRET`: a capped
   proportional slew (3 rad/s, eased by `accel`) that arrives in under 1.5 s
   from a full quarter turn and never loses a shot; `t.turret` /
   `t.gunPitch`. Shots and the laser leave along the GUN. On screen the gun
   is a diamond reticle (`#gunret`, `scene.gunReticle`) sliding onto the
   crosshair; the crosshair warms when the GUN (not the view) is on a
   hostile; `readouts().gunOnView` says it is laid.
3. **W goes where you look.** While driving, the hull (`t.heading`) swings
   onto the view; S backs straight away from it; A D veer on top and pivot
   the hull in place when standing. Looking around never moves the hull.
   (His first drive, 2026-09-07: "W and S are reversed!" — hull-relative
   driving after a mouse turn felt backwards; view-relative since.) With no
   mouse input the view rides the hull, so keys-only play still works
   (`input.look` undefined). Q / E still tilt.
4. **The hull marker** on the compass tape (a small tank glyph, an arrow at
   the edge when it is off the tape) so you always know where W goes.
5. **Z is the scope**: the field of view narrows 70%, eased, the mouse
   slows to 45%; an SVG ring + stadia overlay. Sensitivity is a PLAY dial
   (`play.sens`, `SENS` 0.0021 rad/px). **The wheel zooms** (2026-09-09):
   1× to 2× in four clicks, eased like the scope and stacked under it, the
   mouse slowed by the same factor; reset on restart / pause.
6. **The crosshair is the aim** (his first drive): the gun tracks the
   crosshair in a breath (TURRET 6.5 rad/s), and the crosshair's state is
   the whole story — dim while catching up, solid when laid, AMBER with a
   centre dot over a hostile (fire), dashed over a civilian. The tag follows
   the gun. **2026-09-09: the amber means THE SHELL LANDS THERE** — core
   `shellSolution` marches the shot under gravity every frame against the
   ground, structures and each hull where it WILL be; the arc is drawn as
   dashes, the landing mark pulses on a hit, lead ghosts stand where moving
   hulls will be; hulls are hit as their own box (`inHull`). THE BARREL was
   tried as a real perspective gun under the eye (`SHELL.muzzleDown`) and
   REJECTED the same night ("just floating in space. It looks really
   weird") — `gunBright` is 0 again, the drawing is behind the dial; do not
   bring a barrel back a third time without a new idea. The muzzle stays
   where it is (the arc starts there).
   Shells: star head + fading tail; a miss near a hostile is called
   SHORT / OVER / WIDE in feet. Sim TEST 12. Changelog 2026-09-09.
7. **The start is never the kill box** (his first drive): `startSpot` picks
   the highest clear ground in the stretch's first 1,500 ft with no hostile
   structure within `START_CLEAR` 1,300 ft; waves spawn `SPAWN_MIN`–
   `SPAWN_MAX` 1,900–2,800 ft out; grace 7 s. Sim-guarded.
8. **A faint wide grid** under everything (`gridBright` 0.11, 200 ft) — the
   plains were "massively flat and black"; contours and craters ride on it.

Sim TEST 11 guards all of it (94 assertions green). `input` is `{ drive,
turn, look, tilt, fire, laser }`; the old `pitch` (-1..1) still works.

## THE LOOK PASS — items 1, 2, 6, 7 BUILT 2026-09-07 (his picks; item 8 DROPPED by him: "lose 8, we'll figure out mission stuff later")

1. **A moon, not a grid**: the grid is off (`gridBright` 0, still a dial).
   Contours by marching squares over the ground mesh (`contourStep` 28 ft,
   only where the slope is a real rise — the lander's profile is WALLS
   along z, so a fine step drew stripes; keep it coarse), crater rims with
   an inner ring and rays (`craterBright`, one roll per 520 ft cell,
   hashed), rock fields (tetrahedra, `rockBright`, one roll per 260 ft
   cell), the flight line as a ticked trail (dashes, a cross every 200 ft).
   The core's ground gained a 22 ft swell across the flight line
   (`RELIEF_C`, 1,500 ft) so the plains are not flat.
2. **Line weight by distance**: the depth line shader carries a per-vertex
   width and a near brightness lift (`weightNear` 1.45 / `weightFar` 0.62
   over `weightRange` 1,100 ft; `nearWhite` 1.3) — near heavy and white,
   far hairline and green. The skylines, stars and ridges keep the far
   weight; the gun is near.
6. **The sky**: the EARTH (a disc on the star sphere at a hashed bearing,
   lit limb bright, terminator ellipse of the phase, latitude arcs, three
   hashed continents; `earthBright`), the HORIZON GLOW (the far crest drawn
   bright with three copies a few feet above it — under a pixel apart at
   11,000 ft, so they fuse into a rim of light; `hazeBright`), and THREE
   RIDGE DEPTHS WITH PARALLAX: two near ridges along the flight line 3,000
   ft either side (hashed by x, re-laid with the ground), the mid ring
   6,500 ft and the far ring 11,000 ft ANCHORED at the stretch's start
   (`scene.anchor`, laid once per world) so driving slides them past each
   other. Stars and the Earth ride with the tank (infinitely far).
7. **The cockpit as a modern instrument**: the COMPASS TAPE (±55° window,
   ticks every 10°, numbers every 30°, the lubber line = the view, contact
   blips, the hull glyph, the gun caret), the PROJECTED RANGE under the
   crosshair (what the gun's line meets and how far: `readouts().gunRange`
   / `gunHit`), the SCOPE, and the RECOIL as a pulse in the glow
   (`t.recoil` into the composite flash) — never camera motion.

Look-dev: `tmp/lunar-lander/tank-lookdev.html` (silent; click to take the
mouse; sliders for every dial above; `LAB.setLook`, `LAB.setScope`). Judge
there first. Not built from the nine: 3 structures that live, 4 turrets
tracking + wheel dust + the aiming line, 5 marks that stay, 9 death as
signal loss. Item 8 is dropped.

## THE DIRECTION (James, 2026-09-06, after his first look — this overrides everything below)

"This is not a clone of Battlezone." Battlezone is the jumping-off point for a
NOSTALGIC FEEL — a game from 40–50 years ago that is still fun to play now
because it has 2026 affordances, UI and game thinking. "It's not Battlezone
anyway. It's Moon Battle 2075." The first build was "the most
simplest basic wireframe" — a fair verdict; it proved the plumbing and the
match with the lander, not the look. He is not asking for greebles; he is
asking to be impressed that this session understands the aesthetic: modern,
cool, a fun ten-minute time-waster, nostalgic underneath. Every look choice
from here on is judged against that, in the look-dev page first. THE NEXT
PASS (agreed as the list, not yet built): 1 a moon not a grid (contours,
crater rims, rock fields, the flight line as a ticked trail); 2 line weight by
distance (near heavy + white, far hairline + green); 3 structures that live
(beacons, window dots, turning dishes, SAM rails that swing to you); 4 enemy
turrets tracking separately, wheel dust, a faint aiming line when one has you;
5 marks that stay (craters, scorch rings, wrecks); 6 a sky with Earth, a
horizon glow, skyline ridges at three depths with parallax; 7 the cockpit as
a modern instrument (compass tape, projected range, a scope view, a recoil
pulse in the glow — never camera motion); 8 the egress: mission one opens with
the camera descending from the lander's height onto the tank; 9 death as
signal loss (lines fray and drift). Same rule as the lander's CLAUDE.md
"THE DIRECTION": when in doubt, the contemporary choice wins.

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
- Shell: 520 ft/s, lunar gravity, radius 10; a RELOAD of 0.8 s between shots
  (`SHELL.reload`; was one-in-the-air until 2026-09-08, James's call) — any
  number in the air (`state.shells`); leaves along the GUN's yaw and pitch
  (looking up lobs). The console shows READY / LOADING with a reload bar.
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
  everything (three cells; the last one blinks) with the tanks left. The
  SHELL and LASER rows are buttons too (click fires), as on the lander's
  console.
  Crosshair centred, warms to the line colour over a hostile; the hostile
  under it draws at 1.25 (the lander's hover value) with the lander's AMBER
  tag over it — #ffb457, NAME + X, one word under (OVERHANG / RIDGE / DOOR /
  SHIELD; DOOR SHUT in pink #ff8fa3 as the refusal); civilians get nothing.
  Rubble is the lander's `_rubble` recipe stroke for stroke (same rng), so a
  building killed from the ground looks the same from the air.
- Keys (since 2026-09-07, see THE CONTROLS above): the mouse aims under
  pointer lock, W S drive, A D turn the hull, Q E tilt, click / Space
  shell, right click / L laser, Z scope, Esc / P pause, R restart (armed
  twice). Tuner: PLAY (mission, mouse sensitivity, hull turn rate, seed) +
  LOOK (the knobs, kept in localStorage — the lander's preset file is the
  lander's). A LANDER button (bottom right) goes back to the lander page.

## Not built / open

- The seam (climbing out of the lander into the tank): James's decision with
  both sessions when both halves stand. The tank page stands alone at
  `tank.html` until then; not a world (no admin row, registry, drift).
- Enemy tanks in the lander's side view: authored here in the shared format
  (`MODELS` in tank-render.js, model space x right / y up / z back) — tell the
  lander session the ids when James wants them going by.
- Revolved forms for the round structures (NEEDS.md item 1).
