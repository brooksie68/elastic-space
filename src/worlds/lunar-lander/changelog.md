# Lunar Lander — changelog

Newest entries first. Never rewrite or delete earlier entries.

## 2026-09-04 (session end) — Claude — round two flown, round three agreed

James flew round two: "nice work. this looks cool and makes me feel
nostalgic." His notes became the round-three plan (recorded in full at the top
of the world CLAUDE.md): the ship is too 3-D ("samurai hat"), a faint circle +
triangle for direction instead of an arrow, fuel pads (one or two per
moonscape), earned landing TECH on a 4X/5X landing (not a score bonus; the
parachute is out; a dozen ideas delivered, his six-pick pending), and a more
realistic, flatter moonscape with plateaus and fewer pointy peaks. Nothing
built for round three yet.

## 2026-09-04 (later still) — Claude — ROUND TWO: the direction reset

James's verdict on round one, in full: the thrust control "sucks"; the ship
"so bright it has zero detail"; the velocity arrow — no; the parallax
"dramatically overcomplicated... should just be three lines"; stars showing
through the back mountains — "crazy town with all these lines going
everywhere"; and the real correction: don't imitate a CRT or 1979 at all —
"make it look super cool for 2026... still basically using green to white, a
single line drawing. But within that constraint, do whatever you want. You can
make the ship look like it's from 2030. NASA 2036." Plus: the thruster must
tap-goose AND go to full fast AND hold as long as there is fuel (round one's
burn was "cutting out every couple seconds — that was goofy"); every readout
and instrument "completely contemporary"; and the zoom must never pump when a
pilot bobs across the trigger altitude. Built the same night:

1. **Renderer rebuilt** (`render3d.js`): three ground lines only — near,
   flight, far — each a polyline with an opaque black fill beneath it, drawn
   far to near in an explicit renderOrder chain, stars only behind the far
   line. Ridge rows, cross ties, pad platforms, the spitting peak, the in-scene
   HUD batch, the velocity arrow: gone. The whole CRT post chain removed
   (persistence, scanlines, curve, vignette, grain, ripple); what remains is
   bloom + a green-to-white tint. New lander: wide hex deck, low crew dome with
   a window band, side tanks, four splayed legs, bell, mast — few lines, drawn
   at `shipBright` 0.7 under the world so it reads as a drawing. Drawn 2.2×
   true in the wide view and 1.25× on approach.
2. **The throttle** (`game.js`): hold to burn, linear attack to full in
   `attack` s (0.35 default, PLAY tab), instant cut on release, wheel = hover
   trim, S kills the trim, SHIFT = momentary full, pointer-hold on the field
   burns. No timers, no ramp phases — nothing can interrupt a held burn.
   Verified headless: held 5 s = thrust 1.00 throughout.
3. **The zoom gate** with hysteresis (in below `zoomAlt`, out above 1.75×,
   3 s dwell between changes). Verified headless: bobbing 430↔570 ft across
   a 480 ft trigger held the zoom the whole time. Zoom eases at 0.9 s.
4. **Contemporary instruments** (`index.html`, DOM/SVG): altitude large and
   thin, vertical/horizontal speeds that turn green inside a good landing and
   blink white outside it near the ground, score, fuel with a bar, an SVG
   attitude indicator with the good/hard tolerance arcs and a needle, a thrust
   meter with the trim mark. Glass cards in the Surround register.
5. Bug found on the way: a negative frame dt (the smoke pump's clock ran
   behind the real one) blew the throttle easing to 1e41; `frame()` now clamps
   dt to [0, 0.1].

Sim: 66,900 assertions green. Look-dev + smoke pages updated (smoke pane
screenshots need the game paused first — noted in the world CLAUDE.md).
AWAITING JAMES'S FLIGHT: the throttle feel, the three-line look, the ship, the
instruments, the zoom gate.

## 2026-09-04 (later) — Claude — ROUND ONE: the lever, and the modernization proper

James flew the draft: "fun. lots to come. you didn't modernize it!?" Fair — the
draft modernized the monitor and left the composition at 1979. He picked depth,
the ship, feedback and the vector HUD (1, 2, 5, 6 of the eight offered) and
asked for a much more responsive thruster ("awkwardly quantized... the smallest
amount is too much"). Plan nodded, built:

- **The lever.** Thrust now follows a response curve (thrust = lever^1.7,
  `leverCurve` in the core defaults — fine at the bottom, a punch at the top);
  keys ramp at a quarter rate for the first 0.35 s (a tap is a whisper) then
  accelerate while held; the wheel steps 2% (was 8%) and the knob/wheel set a
  target the lever eases to over 60 ms. Sim retuned to the curve (the pilot
  thinks in thrust and inverts the curve), 66,900 green.
- **Depth.** Perspective camera (fov 38°, placed so the flight plane fills the
  frame exactly as the ortho view did); the ridge is a wireframe strip of four
  rows (z −260/−130/0/+130 with per-moonscape jitter, cross ties every third
  sample, the z = 0 flight line brightest); pads are platforms across the rows
  with corner posts; a far range at z −1400, a farther one at −2700, a near
  foreground range at +520, all fogged by view distance (stars pushed past the
  fog floor and compensated); the camera banks up to 3° with lateral speed on
  approach, eased over 1.1 s. First cut had the far ranges too tall and jagged
  and the fog eating the stars — retuned by eye in the harness.
- **The ship.** A real wireframe LEM: octagonal cabin prism with a window,
  descent-stage box, two-ring nozzle, four legs with struts and cross pads, an
  antenna with a dish, RCS quads. It yaws toward its tilt (0.7× the angle) so it
  shows its side as it leans. Thrust plume of particles out of the nozzle (rate
  and speed by thrust, gravity-bent, dying on the ground) plus the short core
  flame; RCS puffs from the cabin corner opposite the turn while a rotate key is
  held. The crash now breaks every 3-D stroke apart in 3-D.
- **Feedback.** Touchdown: two shockwave rings on the ground plane (elliptical
  in perspective) and dust that flies, lands and settles as specks; a slow-motion
  beat on a crash (time scale 0.18 easing back over 0.7 s — the pieces hang);
  the points tally rises from the pad in vector digits ("+150") and fades.
- **The vector HUD.** In-scene instruments through an ortho pixel camera:
  attitude ball at bottom centre (rotating horizon + pitch ladder + ground
  hatching, fixed ship chevron, the good ±10° / hard ±18° tolerance wedges at the
  top with the tilt needle pointing into them), fuel bar along the left edge
  (three fill lines, quarter ticks, blinks under 15% in flight), and the velocity
  vector arrow off the ship in the world (length by speed). DOM readouts stay as
  the small print. LOOK tab gained fov / depth / ridge rows / camera bank /
  thrust plume / instruments.
- Renderer lesson: `resize()` had written the canvas's CSS size from a 2 px
  first measurement and pinned it there — CSS owns the on-screen size now and
  the window is measured first.

**Where things stand**: AWAITING JAMES'S FLIGHT of round one (the lever feel
first, then the depth, the ship, the feedback, the instruments). Not built from
the eight: the surface dressing (craters, wreck, flag, beacons), Earth + meteors,
the two-colour phosphor, the drone bed and radio chatter.

## 2026-09-04 — Claude — BUILT AS A DRAFT (James's go on the ten-item plan)

James asked for the Surround treatment: the 1979 cabinet, modernized with bells
and whistles, retro vibe intact, then a feature round once it flies. Plan agreed
(faithful core → vector look → the lever → synthesis sound → whistles → tuner →
start gate → look-dev harness → sim → draft), his "go", built in one session.

- **The core** (`game-core.js`, pure): lunar gravity × four selections (Training
  / Cadet / Prime / Command — Command's rotation carries momentum), a
  proportional lever burning fuel, the abort burst (1.1 s forced full burn at
  double cost), horizontal wrap, seeded midpoint terrain with pads spliced in as
  exact flats (one per tier, 150/105/72/50 ft → 2×/3×/4×/5×, count by
  selection), a 64 ft secret flat on 35% of attempts, landing graded by
  vertical speed / drift / tilt (perfect / good / hard, both feet on the pad or
  it's a crash), the cabinet's scoring (50×pad, 15×pad, crash 5), fuel as
  currency (+50 on a perfect, −50 on a crash, game over when dry), a per-game
  log of every attempt.
- **The sim** (`tmp/lunar-lander/sim.mjs`, 66,899 assertions): terrain
  invariants across 480 moonscapes (flat pads, no overlap, seamless wrap, under
  the spawn), determinism, gravity integration, burn rates, the dry event, the
  abort once-per-burst rule, rotation modes, wrap, every grade threshold and
  crash reason, the secret outcome, a PD autopilot that lands 23–24 of 24 on
  every selection with fuel cost rising Training → Command (185 / 220 / 255 /
  295), advance() accumulation, a full multi-attempt game to a dry tank.
- **The picture** (`render3d.js`): a line batch that turns segments into
  screen-space quads with a soft core and halo (additive, DoubleSide — the
  first render was black because rightward quads wind clockwise and got
  culled), a 4×6 stroke font (pad multipliers in-world), the LEM in twelve
  strokes with a flickering thrust flame sized by the lever, the ship coming
  apart along its own strokes on a crash (pieces bounce on the terrain),
  touchdown dust, the spitting peak (the highest point throws sparks now and
  then), 260 stars per moonscape, the drive-through with two arches once the
  secret is found. Camera: orthographic, whole world wide, an eased 3× zoom on
  final approach (0.55 s time constant, no shake — motion restraint), the LEM
  drawn up to 2.2× in the wide view. Post: phosphor persistence (frame-rate
  independent), three-level bloom, phosphor tint with a whitening core,
  scanlines, barrel curve, vignette, grain, a supply-ripple flicker.
- **The shell** (`game.js` + `index.html`): the cabinet's readouts as DOM
  (SCORE / TIME / FUEL and ALTITUDE / HORIZONTAL SPEED / VERTICAL SPEED with
  arrows, fuel blinks under 100, a fast sink blinks under 150 ft), the thrust
  lever gauge (W/S ramp, wheel steps, knob drags, SHIFT momentary full), arrows
  rotate, SPACE aborts, P pauses, R restarts (armed → confirm), the attract card
  with the ledger (top five, localStorage), result cards in the cabinet's words
  ("YOU JUST DESTROYED A 100 MEGABUCK LANDER", "AUUGH! YOU CAME IN SIDEWAYS"),
  Web Audio synthesis (filtered-noise engine opened by the lever, altimeter
  beeps under 300 ft, crash / landing / abort / secret / game-over cues) through
  the shared sound control, a two-tab tuner (PLAY + LOOK with file-backed
  presets, click-away dismiss), the DOM chrome tinted from the look's hue.
- **Harnesses**: `tmp/lunar-lander/lookdev.html` (silent, the sim's autopilot
  flying real approaches, every knob live, CRASH / LAND / NEW MOON / ZOOM) and
  `tmp/lunar-lander/smoke.html` (`make-smoke.mjs`, sound stubbed, `SMOKE.pump`).
  Verified in the pane: attract, START, lever, rotation, the zoomed LEM, the
  crash debris. No console errors.
- Draft status: `world.json` draft, admin panel row under In progress worlds
  (unwired), not in the registry, no exits.

**Where things stand**: AWAITING JAMES'S FIRST FLIGHT (the feel of the lever,
the zoom, the grading, the look). Then the feature round, his picks: multi-stage
descents, a moving pad, meteor showers, fuel crates, a co-op tow mode, terrain
sets; then drift exits and ship wiring. James paused the session here.
