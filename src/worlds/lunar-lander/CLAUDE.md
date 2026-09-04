# Lunar Lander — Claude instructions

## START HERE (next session — James, 2026-09-04 late: "we can pick this up next session right here")

Round three is planned and agreed except for one pick. His wrap words: "nice
work. this looks cool and makes me feel nostalgic." The plan he approved:

1. **The ship is "a bit too 3D now and looks like a samurai hat."** Flatten it:
   less yaw toward the tilt (a hint, not a turn), drop the side-profile dome
   arc (the hat brim), lower the dome, keep the deck and legs. A silhouette with
   a little depth, not a solid.
2. **Direction indicator, his spec:** "a very faint circle around the ship and
   a little triangle" — the triangle rides the circle at the velocity heading,
   brightness scales with speed. Not an arrow (he didn't like the arrow).
3. **Fuel pads:** each moonscape has one, sometimes two, pads that refill fuel
   when you land there (planned: +150, +200 for a perfect), marked with a small
   fuel glyph beside the multiplier. Sim asserts count + refill.
4. **Earned landing tech, NOT a score bonus** (his correction: "I want to get a
   cool technology that helps me land easier... The bonus is landing on a 5X
   because you had that advantage"). A 4X/5X landing earns one piece for the
   rest of the game (a crash loses one), each drawn on the ship. The
   parachute is OUT ("silly"). He asked for a dozen ideas, "physically
   possible... fun or even funny" — delivered, AWAITING HIS SIX (or all
   twelve):
   1. Shock legs — land twice as hard; springs compress on touchdown.
   2. Spider legs — fan out under 60 ft; wider stance counts, tilt widens.
   3. Hover skirt — ring of jets under 50 ft cushions the last drop; trickles fuel.
   4. Gyro stabilizer — rotation self-centres on key release.
   5. Landing radar — dashed beam to the predicted touchdown; pad edges go green when the feet fit.
   6. Sticky feet — drift tolerance triples; skid on and stop dead.
   7. Auto-throttle — one tap under 100 ft holds a gentle descent until you touch the keys.
   8. Ballast drop — jettison a weight once per flight; thrust stronger after.
   9. Crash cage — one crash per game becomes a hard landing; cage draws bent after.
   10. Fuel scoop — fuel pads refill more and vent visible vapour from altitude.
   11. Long legs — stilts; body check relaxed, slopes of a few degrees count as a pad.
   12. Tow drone — detaches to hover over the nearest pad as a tethered beacon.
   Claude's pick for the set: 1, 2, 4, 5, 8, 9, earned in that order.
5. **A more realistic moonscape:** "if this was a NASA simulation... it would be
   flatter with plateaus, and yes some mountains, but maybe not so many really
   pointy ones." Regenerate: long flat maria and plateaus, gentle rolling
   hills, one or two proper sloped mountains per moonscape, rare sharp rims;
   pads on the flats and plateaus. Sim keeps proving pads flat + terrain under
   the spawn.

Then his flight, then the feature round proper (see the end of this file).

Atari's Lunar Lander (1979), the physics kept and the look taken to 2026. Built
2026-09-04 as a draft on James's go; rebuilt the same day on his direction
reset (below). Sibling of Surround — same architecture: pure core + sim,
three.js renderer, shell with a tuner and file-backed presets, a silent
look-dev harness, a sound-stubbed smoke page.

## THE DIRECTION (James, 2026-09-04, round two — this governs the look)

"Make it look super cool for 2026... you're still basically using green to
white, a single line drawing. But within that constraint, do whatever you
want." Not baroque, no doodads, no imitation of 1979 tech ("you don't have to
make it look scratchy and like old school tech"). So:

- **One register**: single-weight lines, green to white, glowing on black. No
  scanlines, glass curve, vignette, grain, ripple or persistence smear — all
  removed, not zeroed. Glow is the whole finish.
- **Three lines, no more**: near, the flight line, far. Each is a polyline
  with solid black beneath it, drawn far to near, so nothing shows through
  anything and the stars sit only behind the far line. His words: "It should
  just be three lines... the stars cannot be in front of any of the lines."
  No ridge rows, cross ties, pad platforms or spitting peak — "crazy town with
  all these lines going everywhere."
- **The lander reads as a drawing**: dimmer than the world (`shipBright`),
  few lines, a 2036 shape (wide hex deck, low crew dome with a window band,
  side tanks, four splayed legs, bell, mast). It was "so bright it has zero
  detail" — never let the ship bloom into a blob.
- **No velocity arrow.** He didn't like it.
- **Instruments are contemporary DOM/SVG**, not in-scene vector text: thin
  numerals, small caps labels, an SVG attitude indicator, a fuel bar, a thrust
  meter (a reading, not a control). Speeds grade themselves green inside a
  good landing near the ground and blink white outside it.

## THE THROTTLE (James, round two: "make the thrust very responsive and effective")

Hold to burn. W/↑ held ramps the lever linearly to full in `attack` seconds
(default 0.35, PLAY tab), release cuts to the trim at once. Thrust =
lever^1.7 (core `leverCurve`), so a tap is a nudge and a hold is a burn.
The wheel sets a hover trim (2% steps; S/↓ kills it), SHIFT is momentary full.
**Nothing may ever interrupt a held burn** — his round-one complaint was the
thrust "cutting out every couple seconds"; the throttle now reads the key
state every frame and has no timers, no ramp phases, no positional lever.
Holding the pointer on the field burns too (touch).

## THE ZOOM (James, round two: the pump warning)

"Be careful not to zoom in and out, in, out... as the person is bobbing along
right at the altitude in which you are triggering the zoom." The shell owns
the decision with hysteresis: in below `zoomAlt`, out only above `zoomAlt ×
1.75`, and never two changes inside 3 s (`ZOOM_OUT_RATIO`, `ZOOM_DWELL` in
game.js). Verified headless: a ship bobbing 430↔570 ft across a 480 ft trigger
stays zoomed throughout. The renderer only eases (`CAM_TAU` 0.9 s). Keep the
zoom — "cool, effective, and necessary" — and keep it from pumping.

## Docs

- `changelog.md` — session history, newest first.

## Files

- `game-core.js` — ALL game rules (gravity, lever curve, fuel, rotation,
  terrain, pads, grading, scoring, the secret flat), pure: no DOM, no timers,
  no Math.random (seeded rng). Shared verbatim with the sim; keep it pure or
  the sim lies. Exposes `globalThis.LunarCore`.
- `render3d.js` — the whole picture, nothing else: the 3-D line batch
  (segments → screen-space quads with a soft core, fogged by view distance),
  the ground fills, the vector font (pad labels, the tally), the lander solid,
  the effects (debris / dust that settles / touchdown rings / tally / plume /
  RCS puffs), the perspective camera with the eased zoom and a few degrees of
  bank, bloom + tint.
- `game.js` — the shell: attempt flow, the throttle, the zoom gate, input,
  instruments, sound synthesis, tuner, presets, the ledger.
- Sim: `node tmp/lunar-lander/sim.mjs` — 66,900 assertions on the real core
  (terrain, determinism, gravity, fuel through the lever curve, abort,
  rotation/inertia/wrap, every grade threshold, an autopilot that lands all
  four selections with fuel cost rising by selection, advance(), a full
  multi-attempt game). RUN IT after touching game-core.js.

## The look-dev harness — use it

`tmp/lunar-lander/lookdev.html` (served: `http://127.0.0.1:4174/tmp/lunar-lander/lookdev.html`)
is a **silent** page driving `render3d.js` with the sim's autopilot flying real
approaches and live sliders for every look parameter, plus CRASH / LAND / NEW
MOON / ZOOM buttons. It is where the picture gets judged before it flies. Keep it.
It surfaces every error on the page and exposes `globalThis.LAB = { scene, state,
tick, ... }` so a checker can drive frames when rAF is frozen (`LAB.tick(dt)`).

`tmp/lunar-lander/smoke.html` is generated by `node tmp/lunar-lander/make-smoke.mjs`:
the real world page with the shared sound control swapped for a no-op stub, so
the full shell can be loaded in the pane without ever creating an AudioContext
(house rule: never load a sound world in the preview pane). `SMOKE.pump(frames,
dtMs)` steps the real loop; `LANDER_DEBUG` is the shell's read-only handle.
**Regenerate it after editing index.html.** Pane screenshots of the smoke page
time out while the loop runs — pause it first (`keydown p`), hide `#pause-card`,
`LANDER_DEBUG.tick(1/60)`, then screenshot. The canvas alone can be captured
any time through `/api/dev-snapshot` (`toDataURL` right after a tick).

## World-specific rules

- **DRAFT (2026-09-04)**: not in the drift registry, no exits, listed under In
  progress worlds on the admin panel as "unwired". Drift wiring comes after
  the feature round.
- **The physics are the cabinet's**: gravity 5.3 ft/s² × selection (Training
  0.55 / Cadet 1.0 / Prime 1.35 / Command 1.7), full lever 16.5 ft/s² and 8.5
  fuel/s, Command rotation carries momentum, abort = 1.1 s forced full burn at
  double fuel cost. Grades: perfect ≤5 ft/s down · ≤3 across · ≤4° (50×pad +50
  fuel), good ≤15 · ≤6 · ≤10° (50×pad), hard ≤30 · ≤12 · ≤18° (15×pad), else a
  crash (5 points, −50 fuel). Both feet must be on the pad; touching anything
  else is a crash however gentle. The game ends when the tank is dry. Tune by
  feel through the tuner scales (gravity / attack), not by editing these.
- **The flight line is the truth**: physics stay in the x-y plane at z = 0;
  the near and far lines and the lander's yaw never move a collision point.
  The flight line is the brightest ground line; pads brighter still.
- **The lander is drawn larger than true** — 2.2× in the wide view, 1.25× on
  approach (`ds` in render3d.js) — so it is never a smudge; collision points
  never change. Feet still land inside the narrowest pad at 1.25×.
- **The start gate** (house rule from Surround): boot lands in attract with the
  card; only START begins a game; result cards gate every next flight; the
  game never runs on its own.
- **Camera restraint**: eased zoom, ≤3° bank, no shake ever (James gets motion
  sick). The crash has a slow-motion beat (0.18× easing back over ~0.7 s).
- The secret flat (35% of attempts, a 64 ft strip that is not a pad): landing on
  it gently is its own outcome, no points, and the drive-through appears. Keep
  it a secret — no marker, no mention on the card until it is found.
- Sound is Web Audio synthesis only: the engine is filtered looping noise
  opened by the thrust, the altimeter beeps quicken under 300 ft, crash /
  landing / abort / secret are envelopes. No samples.
- Tuner has two tabs. PLAY (selection, fuel, gravity scale, throttle attack,
  zoom on/off, moonscape seed) — selection / fuel / seed take hold at the next
  START. LOOK (14 render knobs) is live and file-backed: presets go to
  `assets/presets.json` through `PUT /api/worlds/lunar-lander/presets`, so
  **saving a preset is telling Claude**. The DOM chrome tints itself from the
  look's hue/saturation (`--ph` on the root).

## Renderer notes (hard-won)

- **Line quads wind either way** depending on the segment's direction — the
  line material must stay `DoubleSide` or every rightward segment is culled.
- **The canvas measures 0 in a hidden pane** at construction, so `render()`
  re-measures every frame (window first, then the canvas) and resizes when the
  size changes. Never write the canvas's CSS width/height from JS — a 2 px
  first measurement got pinned that way and the page stayed 2 px forever.
- **Draw order is the occlusion model**: every mesh is `transparent: true`
  with an explicit `renderOrder` (stars 0 → far fill 1 → far line 2 → flight
  fill 3 → flight line 4 → near fill 5 → near line 6 → live things 7). The
  fills are opaque black `MeshBasicMaterial` strips down to `FILL_FLOOR`. An
  opaque material would leave the transparent queue and break the order.
- Fog fades by view distance (`uFogA`/`uFogB`); the stars sit past the fog
  floor and are brightened to compensate.
- **The frame clock is clamped both ways** — a negative dt (a resumed tab, a
  synthetic pump) blew the throttle easing up to 1e41 once. `frame()` clamps
  dt to [0, 0.1].
- Terrain, pads, labels, the lander and the ground fills are drawn three times
  (±WORLD_W) so the wrap seam never shows at any zoom.
- Fill-rate: the chain is ~8 full-screen passes; the buffer is capped at
  `PIXEL_BUDGET` (2.9M px) with a `res` slider. Don't remove the cap.

## Not built yet (the feature round, James's picks)

Candidates named in the plan: multi-stage descents, a moving pad, meteor
showers, fuel crates, a co-op tow mode, terrain sets (crater field, lava plain);
surface dressing (craters / wreck / flag / beacons), Earth in the sky, meteors,
a drone bed + radio chatter; touch controls; an attract-mode demo flight (the
sim's autopilot is ready for it); drift exits + ship wiring.
