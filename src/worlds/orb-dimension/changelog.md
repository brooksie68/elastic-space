# Changelog — The Orb Dimension

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-16 — claude-fable (session close — committed at v13)

- First commit of the world: `src/worlds/orb-dimension/` plus its map-room link, drift
  registry entry, and World Ideas #55 (status `live`). Blender build scripts, the .blend,
  lit previews, and the verification sim live in `tmp/orb-dimension/` — gitignored by
  repo policy, local only.
- Where things stand: flyable, tunable, stable — James is happily doing barrel rolls.
  Controls: W/S dolly, A/D strafe, Q/E persistent roll, R levels, shift thruster (400),
  space toggles overdrive (800), drag steers in the local frame, H hard-resets home.
  Rescue/orientation net: the fog-proof Heart star + edge marker + veils (no view
  direction is ever black — sim-verified).
- Next, per James: default-preset values he'll paste from "copy settings"; Blender cave
  room (floor/ceiling/walls at honest scale); space stations and dimensional doors as
  the real exits; POI map; Procreate → image-to-3D → Blender model pipeline for props;
  possibly secret worlds outside the drift.

## 2026-07-16 — claude-fable (v13 — tuner presets)

- Presets row at the bottom of the tuner: name field + save / apply / set as start /
  delete, stored in localStorage (`elastic-orb-dimension-presets-v1`). "Set as start"
  (★) makes that preset win on every load — James's chosen default load-in. "copy
  settings" puts the live values on the clipboard as JSON so he can paste them in chat
  for me to bake into the shipped DEFAULTS.
- Applying a preset re-rolls the field only if the grouping changed; otherwise the
  existing orbs just retune in place. Stamp v13.
- Also incoming from James: Procreate drawings → image-to-3D → Blender → world models
  (the validated Hunyuan3D pipeline is exactly this; see memory `hunyuan3d-pipeline`),
  plus interest in another 3D generator. Models for stations/doors will likely arrive
  by that road.

## 2026-07-16 — claude-fable (v12 — overdrive + ghost HUD)

- Roll rate backed off 40% per James (1.1 → 0.66 rad/s).
- Space = OVERDRIVE toggle: ramps to 800 m/s and HOLDS until tapped again, then coasts
  down (or settles to 400 if shift still held). H clears it.
- First pass of the minimal HUD ("invisible jet" brief: a humanoid species 10,000 years
  ahead, exotic-matter ship): hairline corner brackets, 6px frosted-glass slivers on all
  four window edges (backdrop blur), speed readout reworked into thin letterspaced glass
  type — brightens with a hairline underline while overdrive is engaged. Shows for any
  motion now (dolly/strafe included). Stamp v12.
- James's roadmap for this world, logged: space stations; doors leading to other
  dimensions (probably the real exits); a map with points of interest; possibly SECRET
  WORLDS hidden outside the drift system entirely. "Now THAT is elastic space, baby."

## 2026-07-16 — claude-fable (v11 — free flight: persistent roll + banking)

- James (a No Man's Sky pilot, thousands of hours) wants real 3D flight: Q/E roll while
  held and STAY rolled, R glides back to the plane of the ecliptic, banking into turns.
- Camera rebuilt from horizon-locked yaw/pitch to a free orthonormal basis (f/r/u) rotated
  incrementally in its own frame (Rodrigues + per-frame re-orthonormalization). Mouse and
  arrows now yaw/pitch in the LOCAL frame, so a banked yaw curves the bank; pitch is
  unclamped (loops possible). Q/E roll at ~63°/s with eased start/stop, persistent. R
  levels roll+pitch keeping heading (~1s glide, cancelled by any look/roll input). Strafe
  slides along the banked wing plane. H hard-resets orientation, position, thruster.
  All downstream math (billboards, view matrix, raycast, home marker) was already
  basis-driven, so it inherited free flight unchanged. Stamp v11.

## 2026-07-15 — claude-fable (v10 — A/D strafe)

- v9 thruster confirmed working well. Q/E barrel-roll idea discussed and parked (tap-to-
  roll recommended if revisited); James chose A/D strafe first. A/D slide left/right at
  dolly speed (80 m/s, horizon-locked, instant stop), composing with dolly + thruster;
  mouse look unchanged. Strafe + drag-to-look is the orbit-an-orb combo. Stamp v10.

## 2026-07-15 — claude-fable (v9 — the thruster)

- James confirmed v8 flight feels smooth (dollied, steered mid-flight with the mouse,
  orbited an orb and looked back at himself) and spec'd motion step two himself: shift
  fires a thruster that takes a few seconds to reach full velocity, then coasts to a stop
  over a few seconds after release.
- Implemented exactly that: hold shift → speed ramps toward 400 m/s (≈95% in ~3.5s);
  release → exponential coast (~6s to standstill), zeroed below 4 m/s. Velocity direction
  always follows the gaze — steering curves the flight rather than diverging from it.
  W/S dolly (80 m/s, instant stop) composes on top, so S is a soft brake while coasting.
  H / "return home" also kills the thruster. Small m/s readout shows while thrusting or
  coasting. Bounds and all v6–v8 GPU guards unchanged. Stamp v9.
- Next candidates when James asks: a speed/VMAX knob in the tuner ("the flight" group),
  vertical or strafe drift, sound reacting to speed, and the Blender cave room.

## 2026-07-15 — claude-fable (v8 — the dolly + grouped tuner)

- James signed off on the look ("this is starting to look amazing") and asked for the
  dolly. Motion step one: hold W to glide forward along the gaze at a constant gentle
  80 m/s, S to back out, release = instant dead stop. No momentum, no strafing, no speed
  control. Bounds clamp to 0.95x spread. H (and the tuner button, now "return home")
  restores position AND view.
- Tuner controls grouped into labelled subpanels per James: "the field" (orbs, dust,
  grouping), "the space" (width/depth/height), "the orbs" (sizes, glass, glow), "the air"
  (haze, color fade). Actions row unchanged.
- Sim TEST 3 back to random positions across the whole dolly-reachable volume: still
  zero blind poses in 2000. All six tests PASS.
- Next steps when James asks: strafe or vertical drift as motion step two; then maybe
  gentle speed control; the Blender cave room remains the big build on deck.

## 2026-07-15 — claude-fable (v7 — square glow fix)

- FIRST CONFIRMED WORKING VIEW: James sees the orbs (in pirate voice). One visual bug in
  his report: glows rendering as translucent rectangles/squares — the v6 fill-rate fix
  shrank dust quads to 1.6x and veils to 1.05x, but the halo falloff still assumed a 2.6x
  quad, so the gradient was cut mid-fade at the card edge. Halo falloff (and the discard
  radius) is now normalized per instance to its own quad size — every glow reaches zero
  before its card's edge. Stamp bumped to v7.

## 2026-07-15 — claude-fable (seventh pass, same session — v6 stamp + resilience)

- James reported the page loading quarter-size top-left then "zooming" to fill, then
  FLIGHT — which is impossible in the look-only build. Verified: server hash == disk hash
  (current build served), no external edits, world folder untracked/unmodified. Strong
  suspicion: a stale tab still running pass-5 JS (the crashed tab restored). To end the
  ambiguity forever, the hint line now ends with a build stamp ("· v6") — if the stamp is
  missing, it's an old copy.
- Hardening from the report anyway: canvas gets inline fullscreen styles + dark body
  fallback (a failed stylesheet can never leave a 300x150 canvas on a white page); vertex
  shader caps billboard radius at 0.8x distance; CPU skips quads inside the near-fade's
  zero zone (draws only the culled count); DYNAMIC RESOLUTION — frame-time EMA scales
  internal render res down to 0.5x when the GPU drowns (James is on 3840x2160) and creeps
  back up when load eases. webglcontextlost still auto-reloads.
- Sim suite now 6 tests, all PASS: group in view at spawn (27 orbs); wander ≤ ~10 m/s;
  zero blind orientations /2000; home always indicated; overdraw 4.3 screens (defaults);
  maxed-tuner abuse 150.8 raw screens → 37.7 at the dynamic-res floor (affordable).
- Rendering answer for James: the canvas renders at the monitor's native resolution
  (device-pixel-ratio aware, no upscale-zoom anywhere in the code).

## 2026-07-15 — claude-fable (sixth pass, same session — LOOK-ONLY build)

- James's session ended in a GPU context loss (white screen + sad-face square, audio still
  playing): the fifth pass's veil patches were a fill-rate bomb — near the walls, dozens of
  screen-covering translucent quads per frame → frame rate collapse (his "gray blur" and
  the un-stoppable slow cruise: at 2 FPS the velocity damping takes ~10 real seconds) →
  Windows TDR killed the context. Fixed with per-instance quad sizes (veils 1.05x radius,
  dust 1.6x, orbs 2.6x); sim TEST 5 now asserts worst-case overdraw (5.0 screens, was 50+).
  webglcontextlost handler reloads the page if it ever happens again.
- Per James, flight is REMOVED for now — figure it out bit by bit. The camera is bolted
  1600m outside the central group, facing it. Drag or arrow keys rotate the view; H or the
  tuner's "recenter view" resets it; nothing else moves, ever. No momentum anywhere.
  Fly-speed slider and wheel-speed gone. Flight returns once looking works for James.
- Sim updated for the look-only build, all PASS: 27 group orbs squarely in view at spawn;
  zero blind orientations in 2000; wander ≤ 9 m/s; home always indicated; overdraw ≤ 5.
- Next: James verifies he can just LOOK — group ahead, swing away, swing back, orbs still
  there. Then reintroduce motion one small piece at a time (probably slow dolly first).

## 2026-07-15 — claude-fable (fifth pass, same session — verified in simulation)

- James lost the field a third time, so this pass was verified headlessly before handover:
  `tmp/orb-dimension/sim.mjs` replicates the world's math (population, wander, camera
  physics, projection, fog) and asserts. Results: camera drift over 120s with no input =
  exactly 0m; max wander speed 9.4 m/s; ZERO blind poses out of 2000 random positions +
  orientations (worst case sees 8 glows, mean 61); home always indicated.
- Found: tuner sliders re-rolled the ENTIRE field on every input tick (scrubbing "orbs"
  teleported everything — reads as "they zoomed by and vanished"). Orbs now live in
  persistent pools; count/dust sliders add/remove at the list's far end and never touch
  what's around you. Only "regenerate" and grouping changes re-roll.
- The Heart: one bright fog-proof pulsing white star at the exact center (the mysterious
  ambient source, made visible). Never renders below star-size on screen — visible from
  anywhere. You spawn 900m from it, facing it; H flies you back to it.
- Home marker: when the heart is off-screen, a soft dot glides along the screen edge in
  its direction. You can always point yourself home.
- Veil patches: ~120 huge, very dim glowing washes parked on the cave's ceiling, floor,
  and walls (deterministic grid, just past the flyable bounds) — faint mottling of rock
  miles away. Every possible view direction meets at least one; doubles as the interim
  answer to "some texture back there" until the Blender room is built.
- Flyable bounds pulled strictly inside the inhabited volume (0.95x spread); dust spills
  to 1.3x and got bigger (2–6m) and denser (default 1400), so looking out from the edge
  still shows embers. Speed cap halved to 600 m/s, default 150, gentler wheel; saved
  tuner values are clamped to current ranges on load.

## 2026-07-15 — claude-fable (fourth pass, same session)

- Root cause of James getting lost found: orb wander amplitude was scaled to the volume
  size (±480m at default spread), so the near orbs drifted their entire distance-to-viewer
  sideways within seconds — the field visibly fled the camera on load, twice. Wander is now
  absolute meters (60m orbs / 30m dust / 15m portals, a few m/s — "drifting slowly about").
- Ember dust layer: ~900 tiny motes (1.5–4.5m, halo-dominant, twinkling) fill the whole
  volume so no viewing direction is ever pure black and flying always has parallax to read
  speed against. "dust" slider in the tuner (0–2500).
- Welcoming ring tightened: 12 orbs at 250–1000m, evenly spread in angle, biased large.
- Pale exit orbs now resist fog 60% — they read as lighthouses from far off.
- Drag-look sensitivity nearly halved (0.0022 → 0.0013 rad/px).

## 2026-07-15 — claude-fable (third pass, same session)

- James got lost on first load: spawn was at the field's edge looking across it, so one
  drag swept every orb out of view with nothing nearby to reorient by. Now you wake DEAD
  CENTER in the volume, perfectly stationary (idle bob removed entirely — the camera never
  moves unbidden). A "welcoming committee" of a dozen orbs always rings the spawn at
  350–1600m regardless of grouping, and the three pale exit orbs sit within sight of home.
- Added H = fly home (also the tuner's "fly home" button); hint mentions it.

## 2026-07-15 — claude-fable (second pass, same session)

- Camera flight, per James: rebuilt the renderer from DOM-sprite parallax to raw WebGL2 —
  one instanced draw of billboard quads (a sphere is the one shape a billboard renders
  honestly, which is why the Blender sprites survive a flythrough). The four shell PNGs
  live in a texture array; each orb's two crossfading color layers + halo are composited
  behind the glass in the fragment shader. Depth-sorted back-to-front, premultiplied alpha
  over the CSS cave background.
- Flight: drag to look, WASD + E/Q (or Space) to fly, scroll sets cruise speed, shift ×3.
  Deliberately gentle — damped acceleration, smoothed look, pitch clamp, no roll (James's
  motion sensitivity). Gentle idle bob until first input; off under prefers-reduced-motion.
- Tuner panel (Chrome Rift pattern: toggle button + bottom panel, localStorage):
  orb count, width/depth/height spreads, size range, glass opacity, glow, haze, color-fade
  speed, fly speed, grouping select (scatter / clusters / strata / river), regenerate /
  fly home / reset. Positions are stored normalized, so spread sliders stretch the volume
  LIVE mid-flight — that's the "stretch them way out" experiment James asked for.
- Exits: pale pulsing orbs — three near the flight start plus one per ~60 orbs scattered.
  Click = raycast → triggers the hidden data-drift anchors (still keyboard-focusable).
- index.html deliberately untouched (canvas/tuner/hint injected from world.js).
- Where things stand: flyable and tunable. Next: the cave itself — Blender-rendered
  floor/ceiling/wall geometry or baked shells mounted around this volume (renderer is now
  true 3D, so mounting real surfaces is straightforward); orb-lit ground pools; sound
  experiments (speed-reactive wind, orb proximity chimes).

## 2026-07-15 — claude-fable

- First build, from James's pitch: an endless black volume — cave-black, not monitor-black,
  ten miles across and two miles high, dimly lit by an unfindable ambient source, with dozens
  of glowing colored balls drifting through it.
- Orb sprites rendered in headless Blender (Cycles, transparent film): four translucent glass
  shell variants (`glass`, `frosted`, `swirl`, `banded`) in `assets/orbs/`. The shells are
  neutral grays with real alpha — all hue comes from layered color gradients the page stacks
  BEHIND each shell (two crossfading hue layers + an outer halo). Build script + .blend +
  lit previews live in `tmp/orb-dimension/`.
- The space is code: world-coordinate volume with perspective projection (scale, dimming,
  depth blur by z), 46 drifting orbs in four depth bands plus one out-of-focus near wanderer,
  sum-of-sines wander, very slow camera drift + gentle pointer parallax (both off under
  prefers-reduced-motion).
- Three pale white pulsing orbs are the drift exits (`data-drift`, clamped on-screen).
- Sound: Web Audio synthesis through the shared sound control — sub-bass air rumble plus
  sparse far-off tones through an echo chain.
- Where things stand: first pass complete and registered. Untuned by James's eye yet — likely
  knobs: orb count/size mix, drift and crossfade speeds, how dim the ambient light sits,
  halo strength, ping frequency/loudness.
