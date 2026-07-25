# Changelog — Relaaax

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-24 (latest) — Claude (Fable 5)

- **The full expansion** — James: "I want every single thing you just described.
  Do all of them." Twelve structural features, twelve FX-rack effects, a two-tab
  control surface, and a detachable controller window; the three DJ sets
  re-choreographed with the new powers.
- **Structure (relaaax-field.js v2):** tile shapes (11 silhouettes via
  clip-path/mask), layouts (grid / brick / hex / radial rings-and-spokes /
  phyllotaxis spiral — patterns get synthetic (ring, spoke) coords so all 24
  keep meaning), Mondrian merges (hash-chosen 2×2 slabs), per-tile
  rotate/spin/displace/size-pulse (composited transforms, only written when
  active), waveform morphs (triangle/sine/square/saw in oscValue), multi-stop
  palettes + hueShift (256-entry LUT, duo = the original pickers exactly),
  counter layer (phase-inverted difference-blend twins), nested tiles (0–2
  levels, counter-phased). Grid layout keeps the ORIGINAL flex DOM path —
  defaults still render pork 2002 verbatim (regression-asserted in the sim).
- **FX rack (fx.js):** WebGL chain — trails, feedback zoom + rotation,
  pixelate, RGB split, turbulence warp, slit-scan, kaleidoscope (2–12 way),
  bloom, grain, CRT (scanlines/barrel/beat-synced sync tear), shutter, iris.
  All 13 knobs are ordinary field config keys (fx*), so sliders, matrix
  targets, and compositions drive them for free. When any is nonzero the field
  hides its DOM and hands fx.js an analytic display list per frame (works for
  every layout); rack off = DOM path untouched. 1600px fill-rate cap,
  graceful bypass without WebGL. Shaders compile/link verified in-browser.
- **Mod matrix expansion (music-dsp.js):** 20 new targets — the structure
  params + the whole FX rack. beat→fx rgb, bass→fx bloom, beat→displace etc.
- **Control surface rebuild (tuner.js + tuner.css):** the panel is now built
  by a standalone module with two tabs — **visual** (presets, main sliders,
  structure, pattern, grid, margins, corners, FX rack, colors, frame) and
  **audio** (player + DJ, reactivity envelopes + beat, mod matrix, react
  presets + per-track). world.js became the host: owns clean state, routes
  commands, serves snapshots. music.js registers its command handler/snapshot
  part and mounts the tuner.
- **Detachable controller (tuner.html + tuner-remote.js):** "detach ⧉" in the
  panel header pops the same surface into its own window over
  BroadcastChannel("relaaax-ctl") — drag it to the laptop screen, visualization
  stays clean on the big screen. The in-page panel hides while detached; the
  tuner toggle reclaims. Same-origin (served) only.
- **DJ sets v2 (assets/compositions.js):** same measured anchors, new
  choreography — Angular: diamond fire rite, circle-white inversion with
  pixel-crunch hits, spinning-triangle feedback tunnel, brick CRT furnace,
  radial ring shrine, square-wave Mondrian consumption, white shutter hammer
  with RGB tearing, iris out. Jungle: acid palette, phyllotaxis spore burst,
  hex-packed sparkle body, ocean-palette liquid breakdown, star-shaped spiral
  frenzy, kaleidoscope daylight, slit-shaped moog worm, radial night ride.
  Timber: sine bar-slat sea, ocean-palette squall with beat-kicked
  displacement, one-bar sheet lightning, bioluminescent counter-interference
  spiral, slit rain, trails as the storm passes, iris shut in the harbor.
- Verified: composition-sim grew to 58 assertions (new key ranges + select
  whitelists, per-set FX/alt-layout usage, field-v2 unit checks: pork-2002
  default regression, layoutTiles counts + pattern-coord ranges, LUT
  endpoints, waveform bounds); music-sim 14/14; all scripts syntax-checked;
  shaders compiled/linked in-browser. rAF paths can't run in the preview pane
  (frozen timeline) — James's first live run is the visual verification.
- Status: BUILT. James raves, then we tune sets/effects by name and by ear.

## 2026-07-24 (later) — Claude (Fable 5)

- **Visual DJ Claude** — per James ("blow my mind... giant crowd raving"): each
  track now has a Claude-authored, structure-synced light-show composition, with
  a "visual dj" toggle in the music section (claude's set / free play, persisted).
- Groundwork: `tmp/relaaax/track-analyze.mjs` decodes the MP3s in Node
  (audio-decode devDep) and measures BPM, beat grid + first downbeat, band-energy
  profile, section boundaries, drops, and quiet stretches (ASCII energy strips in
  the console). JSON per track in `tmp/relaaax/analysis/`. All event times in the
  sets are these measured moments.
- New files: `composition.js` (DOM-free timeline engine — timed events, numeric
  ramps, hex-color crossfades, string/boolean snaps, seek-safe replay) and
  `assets/compositions.js` (the three authored sets, ~70 labelled events total).
  Each set opens with a complete field base so it plays identically regardless
  of slider state, and swaps the mod matrix per section.
- The sets: **Angular Ritual** (temple gloom → fire rite at the measured 25s
  drop → full white/black inversion at 59s → furnace/tunnel middle → 45s
  "consumption" morph → void → white strobe hammer at 178s → embers out);
  **Jungle Moog Ritual** (canopy greens → scatter frenzy → cyan liquid
  breakdown at 121s → daylight-inversion drop at 210s → circle "organism" →
  60s snake-coil morph → long night ride out over the 8-minute tail);
  **Timber at Sea** (black sea swells → squall at 47s → sheet-lightning
  one-bar inversion at 80s → bioluminescent rings → storm passes → last wave
  at 158s → harbor, true black out).
- Engine integration in `music.js`: with the DJ on, the composition supplies
  BOTH the field base and the reactivity settings; live beat detection still
  rides on top (composed macro, reactive micro). Free play restores James's
  sliders and settings completely. Track switches rebuild the engine.
- Verified: `node tmp/relaaax/composition-sim.mjs` — 39 assertions (event
  legality vs field ranges/patterns/matrix shapes, sampled playback in bounds,
  incremental == fresh replay, backward seek, ramp midpoints, drop snaps, and
  each set's authored blackout + inversion moments). All pass; music-sim still
  14/14.
- Status: BUILT, awaiting James at the rave. Tuning the sets is conversational —
  events carry labels ("the 59s inversion") so he can name moments to change.

## 2026-07-24 — Claude (Fable 5)

- **Music reactivity, phase 1** — the field now dances to James's Suno tracks.
  Three MP3s live in `assets/sound-tracks/` (Angular Ritual, Jungle Moog Ritual,
  Timber at Sea); new tracks are dropped there and added to the `TRACKS` list at
  the top of `music.js`.
- New files: `music-dsp.js` (band energies, per-band auto-gain + envelope
  followers, bass-flux beat detector, mod-matrix math — deliberately DOM-free so
  the sim runs the shipping code) and `music.js` (Web Audio graph, track player,
  reactivity tuner UI, the per-frame modulation loop). The field renderer stays
  music-blind; audio taps the analyser BEFORE the volume gain so reactivity is
  independent of listening level.
- Tuner grew a **music** section: play/prev/next/track/shuffle (auto-advance on
  end), react master (×0–×2), attack/release envelope sliders, beat sense (with a
  dot that flashes on every detected hit) + beat decay, and a six-row **mod
  matrix** — each row wires a source (bass / low mid / mid / high / level / beat)
  to a field knob (speed, size, blur, spread, twist, desync, holds, ease) with a
  bipolar amount. Defaults are the aggressive set James asked for: beat→size,
  bass→blur, beat→twist, mid→spread, high→desync, level→speed.
- Reactivity has its own presets (localStorage `relaaax-music-presets`, factory
  "stock aggressive" protected) plus a **per track** checkbox that remembers and
  recalls settings for whichever song is playing. Player/settings persist under
  `relaaax-music`.
- Plumbing: `world.js` now keeps an authoritative CLEAN `state` (what the sliders
  say) and exposes it as `globalThis.relaaaxTuner` — music modulation writes over
  the live field every frame but never contaminates saves, presets, or readouts.
  `relaaax-field.js` `setConfig` refreshes selectively by key (colors/geometry/
  fit only when touched) so per-frame modulation does zero layout work; tuner
  behavior unchanged.
- Sound control wired per all-world rules (`core/sound-control.js`, custom
  start/stop/setVolume onto the gain node; one autoplay attempt).
- Verified by sim: `node tmp/relaaax/music-sim.mjs` — 14 assertions on the beat
  detector (pulse train hit rate, no beats on constant signal or silence,
  auto-gain finds beats in a quiet mix), envelope bounds, mod clamping/master/
  off-rows/negative amounts, and FFT band-bin math. All pass.
- Status: BUILT, awaiting James's first listen + tune. Next: he reacts, we
  iterate mappings/ranges by ear; live audio input is the "maybe later" phase 2.

## 2026-07-23 — Claude (Fable 5)

- Big tuner expansion, all per James's spec. The field generalizes from the fixed
  pork layout to an N×M grid with a pattern engine; **defaults still render the 2002
  composition exactly** (pork spec matrix, 540×420 design space, 100px cells —
  verified by Node sim, scratchpad `relaaax-sim.mjs` this session).
- New controls: grid rows × cols (1–24 each, sliders); fill toggle (stretches the
  composition edge-to-edge, non-uniform); margins per side with a link mode
  (linked / mirrored / free); gap ↔ / gap ↕ / row inset; corner radius for tiles,
  row backgrounds, and the outer frame; gaussian blur on a full-width slider with a
  cubic curve (very fine at the low end, total wash at the top, 0–300 design px).
- Pattern engine: 24 flashing patterns in a dropdown with prev/next buttons —
  pork 2002, unison, sweeps, diagonals, ripple, rings, pinwheel, checkerboard,
  quarters, stripes, bounces, snake, spiral, scatter, sparkle, tempo rows/cols,
  x-cross, drops, edges-in. Two tweak sliders: **spread** (scales phase offsets,
  0 = unison, >×1 wraps extra bands) and **twist** (per-pattern variant knob, hint
  text under the dropdown says what it does per pattern). Pattern/twist changes
  never rebuild the DOM or interrupt the clock; grid changes rebuild DOM but keep
  the clock, so nothing ever visually restarts.
- Renderer internals: geometry moved to unitless CSS vars multiplied by --ux/--uy/
  --umin (x/y split is what makes fill mode possible); rows are still boxes with
  their own oscillating background like the original. `oscValue` grew a rawPhase
  arg but stays backward-compatible. desync seeds unchanged, so saved desync
  settings scatter identically.
- Tuner panel now scrolls when taller than the viewport; sections labelled
  pattern / grid / margins / corners. localStorage shape unchanged (new keys
  default in), so James's existing tune survives.
- Later same session — **tile size** (James: "maybe the most important one"): new
  full-width size slider (position², 0–300 design px, stock 32 near a third across).
  The grid pitch stays anchored to the 32px base + gaps while the rendered square
  uses `tileSize`, so growing tiles close the gaps, butt up, overlap, and spill
  into chaos instead of pushing the grid apart. Cells got fixed pitch heights
  (padding → explicit height) and tiles `position: relative` so oversized tiles
  paint above every row background instead of being buried by the next row's box.
  Tile corner radius reinterpreted as a fraction of tile size (slider now 0–50%,
  50% = circles at any size; saved px values auto-migrate).
- Later again — presets + frame snaps (James: "this has gotten much cooler, keep
  going"). **Presets**: new row at the top of the tuner — dropdown with a "built in"
  group from `presets.js` (the permanent list: pork 2002, lava lamp, wave wall,
  checker strobe, orbs, chaos engine, hypno rings, lounge — seeded deliberately
  different from each other) and a "yours" group saved to localStorage
  (`relaaax-presets`) via the save button (prompt for a name; built-in names
  protected; delete only enabled for saved ones). A preset is a PARTIAL over
  DEFAULTS — loading resets unmentioned knobs, so presets fully determine the look;
  frame size is page state and stays out. Any hand tweak flips the dropdown back
  to "— custom —". The convention: when one of James's saved presets earns
  permanence, Claude bakes it into `presets.js`. **Frame snaps**: "full width"
  (window width, height keeps current proportion) and "fit screen" (window's exact
  size/aspect) buttons in the frame row. Sim extended to validate factory presets
  (legal keys, pattern ids, hex colors, ranges).
- Last tweak of the night: clicking anywhere off the tuner panel closes it
  (pointerdown with the toggle excluded, so slider drags released outside don't
  close it and the toggle doesn't double-fire). James on the session: "actually
  getting quite amazing… the blur effect adds so much… way beyond what I expected."
- Session close — James's direction for next time: **music reactivity**. He'll
  import 5–6 tracks, a track player picks the song, the field reacts rhythmically —
  with its own many-slider tuner section. Maybe live input later; tracks first.
  Details in this world's CLAUDE.md "Next session" section.
- Still draft: no registry, no drift, no sound. Next: James plays with all of it.

## 2026-07-19 — Claude (Fable 5)

- World created. This is the Spastic Space pork.html recreation, renamed by James from
  "pork" to **Relaaax** (folder + title) before the build.
- Built `relaaax-field.js`: standalone embeddable renderer of the pork oscillator field —
  breathing outer box (10s bgthrobback), three nested boxes, 3×4 bordered tiles, caption
  "mesmerizing, ain't it?". Timing decoded from the original GIFs (see
  `assets/spastic-space/recreation-notes.md`). JS rAF oscillators lerping between two
  palette colors; geometry scales off the container (`--u` = one 2002 pixel), so any
  size/aspect works.
- Tuner (Chrome Rift pattern, localStorage `relaaax-tuner`): speed (position², ×0–×8),
  holds scale, desync, ease (linear↔smooth ramps), border width, low/high/bg color
  pickers, caption toggle, reset + per-slider double-click reset.
- index.html stages the field in a centered 1024×768 frame — temporary, per James, while
  he decides the final setting (idea floated: a TV in someone's kitchen, big screen,
  people watching and drooling).
- Deliberately unshipped: no registry entry, no drift exits, no sound. Status `draft`.
  Next: James tunes by eye; then the setting.
- Later same session: added to the admin panel's In progress worlds list. James liked
  the result; per his direction the caption ("mesmerizing, ain't it?") was removed
  entirely (field, config, and toggle), and the four mini sliders got one-line
  descriptions under them (`.tuner-desc`).
- Frame sizing added to the panel: width × height text inputs (default 1024×768,
  persisted under localStorage `relaaax-frame`, separate from field config since the
  frame is staging). Any size/aspect; oversized frames scale down proportionally to fit
  the window. Reset restores it too.
