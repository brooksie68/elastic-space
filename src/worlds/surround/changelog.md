# Changelog — Surround

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-28 — Claude (Fable 5) — the service hatch cut (James)

- James, flying the ship build: the warning-striped hatch under the glass is
  "distracting and shouldn't be there." Removed entirely — mesh, shader,
  anchor, `_placeHatch`, the DOM anchor. Five exits remain (two breaches,
  the stray star, the horizon wall, the stuck pixel) — still past the
  three-exit norm. Tags → ?v=10.

## 2026-07-28 — Claude (Fable 5) — SHIPPED: second breach, the stray star, full wiring

- James's ship brief: two breaches ("broken edge" exits), neither ever behind
  the scorekeeping panel ("you can't click on it or see it very well, and
  that's not cool"), plus one star blob floating outside the arena in a
  subtle off-palette colour ("not like a bright red or a bright pink or lime
  green"), keep the stuck pixel, then full ship wiring.
- **Second breach**: `rules.breach` is an array now; `rollBreaches` tears two
  holes on two different walls every round. Side 0 (far wall, top of frame)
  never hosts one, and `behindHud` vetoes any candidate whose projection
  lands in the HUD's rect — the near wall is the always-available fallback.
  Field shader carves both (`uBreach`/`uBreach2`); sim 7228.
- **The stray star**: dusty rose-amber camera-facing sprite (a hue the
  cyan/blue arena never uses, alpha ≤ 0.3), slow Lissajous off the arena's
  left edge, `data-drift` anchor like the rest.
- **Ship review found three invisible exits** at default look params: the
  blob orbited off the left frame edge ~95% of the time, and hatch + farWall
  projections fell off-frame whenever the per-round camera refit shifted the
  view offset (~100px round to round — measured via a new
  `SURROUND_DEBUG.arena` handle in the smoke page). All exit props are
  frame-aware now: blob and hatch walk inward until they project on-screen
  (hatch also clears the pause/restart/forfeit cluster, which sits above the
  exits and stole the click), farWall moved nearer (w/2+9) and its anchor
  picks the deepest-in-frame stretch of the wall. Verified 20-24/24 samples
  visible for all six exits at 1920x1080 AND 1280x800 across ten rounds
  (gauntlet + blackout included), zero HUD overlaps, zero control overlaps,
  no console errors; blob pixels confirmed non-black by render-target
  readback.
- **Ship wiring**: `world.json` (status live), registry regenerated (the four
  still-draft worlds pruned per the drafts gotcha), admin panel row moved to
  Completed worlds (unwired tag dropped), World Ideas #59 → SHIPPED,
  `npm run check-worlds` clean for surround. Tags → ?v=9.

## 2026-07-28 — Claude (Fable 5) — breach v3: still, quiet, and REAL

- James's two notes on v2.5: the outer ring still flickers ("humans are really
  good at noticing flickering and movement... what you had before was just a
  ghostly unmoving ring and it was almost enough") — and flying through the
  hole didn't drift him out, he "just kept blowing up."
- **All breach animation removed.** Marker ring and field tear are now fully
  static — jags hashed without time, no sputter, no pulse — and the marker
  dropped another ~75% (col 0.09, alpha 0.07). A ghostly unmoving tear.
- **Riding through the breach now IS the exit.** Core rule (`rules.breach =
  {side, lo, hi}` mirroring the visual span via game.js `breachSpan`): crossing
  the boundary inside the span sets `escaped` instead of crashing — no wreck,
  no point. The shell clicks the breach's own data-drift anchor, so the drift
  state rides along. CPUs can flee too (a fled hunter counts as gone for round
  resolution). Overtime's `consumeRing` never seals the breach corridor — the
  tear stays a way out to the end. Round-over check restructured to read
  survivors after any step, not just after crashes.
- Sim 7220 (escape through span / off-span kills / cpu flight / corridor
  survives overtime). Smoke 6 rounds clean with the anchor intercepted.
  Tags → ?v=8.

## 2026-07-28 — Claude (Fable 5) — breach v2 toned down

- James on breach v2: "a giant glowing electronic butthole. Tone it down quite
  a bit... definitely know it's there, but not be like, oh, look at that."
  The hole in the lattice (the absence) stays as the signal; the marker went
  from beacon to quiet torn edge: random flashes and inner shimmer removed,
  ring ~65% dimmer and cooler, sputter slowed (11 Hz → 5 Hz), mesh 5.6×3.0 →
  4.6×2.5; field-rim brightness 1.6 → 0.45 and its alpha contribution 0.7 →
  0.22. Tags → ?v=7. His eye judges the new level.

## 2026-07-28 — Claude (Fable 5) — the breach made obvious

- James flew the specials build: crash samples "sound really cool", but he
  couldn't find the way out of the arena. The breach was a dark patch on a
  dark void — invisible. Rebuilt:
  - The FIELD shader now genuinely tears open (`uBreach`): the lattice alpha
    dies inside an ellipse and the torn edge sputters hot — a visible HOLE in
    the wall, not a decal over it.
  - The breach marker mesh is bright jagged arcs + random flashes (additive,
    bloom-catching, 5.6×3.0) with a faint beckoning shimmer inside.
  - **It moves**: every round `stageRound` re-rolls the wall (any of the four
    sides) and the position along it (his idea). `_placeBreach` runs per frame
    so it also rides the overtime shrink.
- Verified in lookdev (all four walls, shrink tracking, shader compiles) and
  smoke (anchor lands at distinct screen spots round to round, no errors).
  Visual brightness still James's call on next flight. Tags → ?v=6.

## 2026-07-28 — Claude (Fable 5) — crash hit samples

- James dropped two produced samples into `assets/cycle-hits/`
  (light-trail-hit.mp3, wall-hit.mp3) — wired: every death now picks its sample
  by what was actually hit (`hitKind`): out of bounds or the overtime field →
  wall-hit; a trail or another rider → light-trail-hit; consumed where you
  stood by the closing ring → wall-hit. The sample replaces the synthesized
  noise burst, keeping the low 220→55 Hz power-down drop underneath for
  weight. Forfeit keeps the pure synth (self-destruct, nothing hit).
- Media elements (cloneNode per play), not fetch+decode — file:// keeps
  working; volume follows the shared sound control.
- Fixed en route: a round won on the last CPU's crash was sounding twice
  (gameTick + resolveRound) — resolveRound now only voices the player's own
  death.
- Sim untouched (7210 green), smoke clean through 4 rounds. Samples not yet
  heard in-world by anyone — James's ear judges level and fit. Tags → ?v=5.

## 2026-07-28 — Claude (Fable 5)

- **THE SPECIALS + THE WAYS OUT** — James green-lit the whole suggestion list
  ("do every single one of those things"). Seven specials and four drift exits
  in one pass.
- **Core generalized to N riders** (the gauntlet forced it): `game-core.js`
  rewritten — players array any length, pairwise collision checks, per-player
  `travel`/`lastLaid`, cell value 4 = the field itself. All seven specials are
  core rules where they touch play, so the sim owns them (7210 assertions).
  `territory.js` now scores *sides*: channel 0 the player, channel 1 all CPUs.
- **The specials** (SPECIALS tuner tab, all toggles; gaps + zone default OFF,
  the rest ON):
  - *Boost* — hold Shift: a second cell per tick, fuel bar in the HUD
    (drain ~1.1s, slow regen), hum pitches up.
  - *Phase* — press X, once a round: next wall contact is a pass-through
    (`armPhase`; ≤4 cells deep, never the field, never head-to-head). Rider
    ghosts (dart 0.3 opacity, halo dimmed), wall breaks while inside.
  - *Trail gaps* — every 4th cell of every trail stays open (the 1977 "erase"
    spirit).
  - *Overtime* — from tick 220 the containment field eats a ring of cells
    every 14 ticks (`consumeRing`, riders on the ring die with it); field
    panels visibly close in, pulse per ring.
  - *Interference zone* — a drifting Lissajous patch (`zoneAt`, pure in tick)
    where trails refuse to lay; floor shows flickering static.
  - *Gauntlet* — every 5th round is 2-v-1: ORACLE/HUNTER plus a DRIFTER
    wingman, third rider colour derived from the CPU's, round worth 2 pips,
    round can continue over a dead hunter's wreckage (`resolveRound` replaced
    the old pairwise finalize).
  - *Blackout* — every 4th round the grid/territory/dust ease to near-dark,
    headlights only (eased param override, saved look untouched).
  - Countdown shows a round tag ("GAUNTLET — 2 v 1, DOUBLE PIP" / "BLACKOUT").
- **Renderer**: trails support real breaks (aCut bridge points + fragment
  discard — gaps, zone cells and phasing all share it); third rider slot
  everywhere (trails/heads/floor pools/field response); `setZone`/`setShrink`/
  `setPhasing`/`setActive`; exit props (below).
- **The ways out** (drift wired: world-registry.js + drift.js now load; this
  world still is NOT in the registry — draft): a flickering torn breach panel
  on the left containment wall, a warning-striped service hatch down in the
  void past the far corner, a riderless light-wall running to the horizon out
  beyond the right side, and a stuck pixel (DOM dot, lower left). Three DOM
  anchors chase their scene props via `projectToScreen` each frame; all four
  are `data-drift` with generic labels.
- Fix en route: frame dt clamped at ≥0 (the smoke harness's backwards clock
  ran boost regen in reverse; real suspend/wake could too).
- Verified: sim 7210 green (gaps/boost/phase/zone/overtime/3-rider suites);
  lookdev numeric checks (shader compiles, gap bridge points, shrink ease,
  ghost dart, anchor projection); smoke full match — 10 rounds through
  BLACKOUT (r4/r8) and GAUNTLET (r5/r10) tags to "THE MACHINE WINS 0–10" and
  back to the gate, then 3 rounds with gaps+zone enabled; zero errors.
  **Nobody has eyeballed the exit props or specials visuals yet** — pane
  wouldn't composite; James judges the look on his next flight. Tags at ?v=4.

## 2026-07-27 — Claude (Fable 5)

- **Feel pass 1, from James's first real play session** ("played it a lot of
  times, and it's pretty fun"). Four asks, four changes:
- **Bigger arena in the frame.** The camera fit was |max|-based, so the tilted
  near edge's downward overhang reserved matching slack on the far side too —
  that slack pooled as the "pretty big gap" between the arena and the HUD.
  `_fitDistance` now fits projected *extents* and `_updateCamera` re-centres the
  frustum each frame via `setViewOffset`; `FIT_Y` 0.94 → 0.96. Measured at
  1920×1080 (medium grid, default tilt): width now binds at 99%, the arena rides
  ~50px higher, margins split evenly. Vertical fill saturates ~85% at the
  default tilt — that is the ground plane's own horizon, not slack; a more
  overhead **tilt** (LOOK slider, lower value) is the lever if James wants
  taller still. Deeper grids were measured and rejected: the near edge blows up,
  width shrinks, cells get smaller.
- **Turn assist** (the "I turned at the last second and it crashed" fix). New
  core rule `reviveAfterCrash`: a rider whose crash happened on the immediately
  previous step can be revived by a perpendicular turn into a free cell — they
  lose the step, which is the honest price. The shell holds a solo player crash
  in a **grace window** (PLAY tuner slider, default 120 ms, 0 = off) during
  which the whole game freezes and the sparks are deferred; a saving input
  revives, expiry finalizes the crash exactly as before. Draws (double crashes)
  get no grace. Sim grew to 7160 assertions covering revive legality.
- **24 colour pairs**, rolled fresh every match (never repeating the previous
  pair, persisted in `surround-pair-v1`). `COLOR_PAIRS` in game.js is the list;
  the renderer's new `setPalette` re-skins riders in place (hot/cold derived
  from body), and the HUD/banner/meter CSS all tint off `--p1`/`--p2` via
  `color-mix` now, so one CSS-var write restyles everything.
- **Restart** (the "I'm down a lot and this sucks" button): R key or the new
  button between PAUSE and FORFEIT; same two-step SURE? arm as forfeit, but
  wipes the score and starts a fresh match (with fresh colours) instead of
  conceding. No loss recorded.
- **The start gate** (James, same session: "do not start ever until the person
  clicks the button"). New `attract` mode: boot lands on a centered welcome
  card (SURROUND wordmark, controls line, START button, tinted off --p1) over a
  staged board with both riders parked. Match end and forfeit show their banner
  for 2.4 s then return to the gate with a result line ("YOU WIN 10–6").
  Removed every other way in: Space/tap-to-restart and the NEW MATCH button are
  gone; R/F/steering are inert at the gate; tuner restart-class changes at the
  gate re-stage under the card. `startRound` split into `stageRound` (board +
  parked riders, no motion) + countdown; `enterAttract` is the single landing.
- Verified: sim green, lookdev `LAB` numeric camera checks (centre = 0, extents
  at fit), long smoke pumps through multiple rounds incl. grace-expiry path,
  scripted pause/restart/colour-roll, and a scripted gate walk (boot parked 5 s,
  key mash can't start it, START → countdown, forfeit → banner → gate + result).
  Cache tags bumped to ?v=3, smoke.html regenerated. Still ahead: James flies
  this pass, then ship wiring.

## 2026-07-26 — Claude (Opus 5)

- **The 3D rebuild.** James, before ever playing the 2D draft: "this is gonna be
  one of the most boring looking things I've ever seen... spruce it up massively,
  bring it up to 2026 with 3D effects, a neat HUD, cool lighting effects."
- `game-core.js` untouched — the sim still passes 7139 assertions. The 2D canvas
  renderer in `game.js` was replaced wholesale; `game.js` is now the shell only.
- New `render3d.js` (three.js r185, importmap like the other 3D worlds):
  - Light-walls that **rise out of the floor behind each rider** as it passes,
    run white-hot at the head and cool into the player colour down the tail.
    One geometry, three materials (ribbon / hot top rail / floor bleed).
  - **Mirrored under-glass reflections** of every wall, faded with depth.
  - Glass floor + infinite void grid, with light pools and headlight cones
    thrown by each rider, crash shockwave rings, and a **territory wash** — the
    floor shows in colour who reaches which ground first (real BFS, new
    `territory.js`, eased per frame through a small DataTexture).
  - A **containment field** on the perimeter that brightens where a rider nears
    it — the arena wall is now something you can see yourself about to hit.
  - Rider heads: banked darts with halo, vertical light shaft, and a light pool.
  - Crash: sparks with physics, floor shockwave, frame flash, bloom spike, and a
    **power-down wave** that runs back along the dead rider's wall leaving it
    cold. Still no screen shake — house rule.
  - Custom post chain: bright-pass → 3-level separable Gaussian bloom → ACES
    tone map, vignette, corner chromatic aberration, grain, scanlines.
  - Ambient dust motes for depth; the void takes a faint tint from whoever is
    winning the territory battle.
- New HUD: big tabular scores with a bump on the point, pip rails, round + live
  speed multiplier, opponent name, and a **territory meter** under the glass bar
  (toggleable). Countdown got a ring sweep; banners restyled.
- Tuner is now two tabs — PLAY (unchanged knobs + territory read-out) and LOOK
  (14 live render knobs) — with **file-backed presets** through
  `PUT /api/worlds/surround/presets`, so saving a look tells Claude.
- Sound unchanged in character; added stereo panning of the engine hum by the
  player's x position and a spark tick on near misses.
- Perf: scene buffer capped at 2.9M px with a `res` slider (4K would otherwise
  ask for 18M px a frame through ~8 full-screen passes); 2× MSAA.
- Two harnesses, both kept: `tmp/surround/lookdev.html` (silent AI-vs-AI look
  dev with every slider) and `tmp/surround/smoke.html` (generated by
  `make-smoke.mjs` — the real page with sound stubbed out, so the full shell can
  be exercised in the preview pane without audio).
- Bugs found and fixed during the build, both worth remembering: `half` is a
  reserved GLSL word, and `pow()` with a negative base returns NaN which the
  bloom blur then smears across the entire frame (black screen). Both guarded.

### Same night, on James's first look

- **The board was tiny in the top-left corner.** A `<canvas>` is a *replaced*
  element, so `position: absolute; inset: 0` with `width: auto` leaves it at its
  intrinsic 300x150 anchored top-left — it does not stretch the way a div does.
  The old 2D renderer hid this by writing `canvas.style.width` by hand. Fixed
  twice over: explicit `width: 100vw; height: 100vh` in CSS, and `setSize(w, h,
  true)` sized from `window.innerWidth/innerHeight` so three writes the inline
  style too.
- Also guarded a zero-size window (hidden tab, collapsed frame): it used to put
  NaN through `camera.aspect` and take the whole render loop down silently.
- **Pause + forfeit**, on James's ask:
  - PAUSE / RESUME button bottom-right, plus `P` or `Esc`; `Space` resumes.
    Resuming mid-round gives an 800 ms "GO" beat so a pause taken mid-corner is
    not an instant death. Hums stop while paused and come back with the beat.
  - Auto-pause on window blur / tab hide — losing the window no longer costs a
    rider.
  - **The arena only filled ~56% of the frame.** `_updateCamera` used a
    closed-form guess with a hardcoded `* 1.24` margin. Replaced with a real
    solve: project the arena's eight corners (floor + containment field tops),
    scale the distance by the overshoot, iterate to convergence. Now pinned at
    99% of frame width at every aspect, arena size and tilt.
  - **Reshaped the arena presets** — 34x19/44x24/58x32 → 34x23/44x30/58x39.
    The originals were sized for a flat 2D field at 16:9; seen at a tilt the
    depth axis foreshortens, so a 16:9 grid projects far wider than the window
    and leaves dead bands top and bottom. ~1.5:1 grids project as ~16:9.
    Vertical fill 70% → 83%; on-screen area roughly doubles with the fit fix.
    Rounds run ~25% longer (classic is 1320 cells, was 1056).
  - The containment field is now built one unit tall and scaled per frame, so it
    tracks the wall-height slider instead of being frozen at build time.
  - FORFEIT is two-step: first press arms it ("SURE?", pink), second concedes;
    the arm expires by itself after 3 s. Conceding powers down the player's wall
    like a real crash, then the banner reads FORFEIT and the button becomes
    NEW MATCH.
- Status: DRAFT, **awaiting James's first look at the 3D version** — he has not
  played either version yet. Feel pass next, then ship wiring (world.json, drift
  exits, registry).

## 2026-07-25 — Claude (Fable 5)

- World created on James's direct ask ("make Surround: player vs computer — make it
  slick and modern looking, 2026 appropriate") after a level-of-effort chat about
  early console recreations.
- Built: pure game core (`game-core.js`) + renderer/shell (`game.js`) + page.
  Neon rounded trails with layered glow, interpolated head orbs, particle crash
  bursts (no screen shake), glass HUD with score pips, countdown, banners.
- Three AI levels: DRIFTER (wobble + wall avoidance), HUNTER (greedy flood-fill),
  ORACLE (Voronoi territory + wall-hugging space-fill once separated — the
  separated mode was needed; pure Voronoi lost endgames to the greedy AI 36-44,
  after the fix it sweeps 80-0).
- Sound: Web Audio synthesis through the shared sound control — dual engine hums
  (pitch tracks the speed ramp), turn blips, filtered-noise crash, point chime,
  countdown ticks, win/lose fanfare.
- Tuner panel (Chrome Rift pattern, localStorage `surround-tuner-v1`): speed,
  glow live; arena size / AI level / first-to restart the match.
- Sim: `node tmp/surround/sim.mjs` — 7139 assertions pass.
- Same night: click-away dismissal added to the tuner (James's new all-worlds
  rule — every control panel closes on a `pointerdown` outside it).
- Status: DRAFT, awaiting James's first play. No drift/registry wiring yet.
  Next: feel pass with James, then ship wiring.
