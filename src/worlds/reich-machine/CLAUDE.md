# The Reich Machine — Claude instructions

A phase-shifting step machine after Steve Reich's tape and Piano Phase pieces: up to four tracks,
each a step sequence on one voice, each running a little faster or slower than the master, drifting
past each other. Draft world (In progress, unwired). James's brief: `world-drafts.json` → "The Reich
Machine". Since 2026-09-06 it is a WORLD: a 1970s control room (three.js) with the machine's console
laid over the bottom of the view. The earlier Glass Bead Game / Player of Games / Arcane direction is
superseded by the studio at James's word.

## START HERE (2026-09-06)

THE BENCH is built to his pen sketch (changelog 2026-09-06 later still) and he flew it: "this direction
is good. We're going to do a bunch more tuning still. It's not quite right yet" — tuning continues the
next session, by his eye, against the sketch. Open on his side: panel text size at the new distance,
desk tilt/size, the room. Then exits + ship wiring.

## Docs

- `changelog.md` — session history, newest first. Read it before touching anything.
- `tmp/reich-machine/` (gitignored, James's machine only) — the sound pipeline
  (`render_library.py` + `library.html`, the 3,008-patch Surge audition page; `james-picks.txt`;
  `render_banks.py` → `encode_banks.mjs` into `assets/voices/`), `sim.mjs` (the engine sim),
  `shrink.py` (Meshy GLB → lean GLB), `meshy/` (raw + remeshed GLBs). KEEP all of it.

## Architecture

- `engine.js` — pure core, no DOM/audio, runs in Node for the sim. Tracks carry a fractional
  phase in steps; `advance(dt)` returns note events. Per-track `rate` (the offset knob),
  `pull` (0 = tape drift, 1 = Piano Phase lingering at lock points, capped so it never freezes),
  `hold` (everything on the master), `nudge` (whole steps), `solo`. Scales/chords/figures (the
  "musical phrases") live here, plus the dice: `rollPhrase(len, rng)` and `rollMachine(m, opts)`.
- `player.js` — Web Audio: lookahead scheduler (25 ms tick, 150 ms lookahead, 25 ms engine
  chunks), the sampler (nearest sampled note + playback-rate bend; `hit` / `hold` articulations;
  note-off before the baked release crossfades into the sample's own release segment at
  `holdEnd`), per-track effects chain, master chain (comp + limiter + shared convolver reverb),
  analysers for the meters (`P.levels()`), solo. Falls back to a synthesized `tone` voice when
  banks can't load (file://).
- `index.html` + `world.js` + `world.css` — THE BENCH: four DOM panels (`#screen` editor, `#lip`
  button row + piano + scribble strip, `#wingL` four strips, `#wingR` key / transport / master /
  dice / presets) that studio.js places in the room with CSS 3-D (1 DOM px = 1.3 mm; sizes are
  fixed px in world.css — change a panel's size there and the desk slab follows). Every control
  carries a `data-help` sentence — keep that when adding controls. James's sketch is the layout
  reference (changelog 2026-09-06 later still).
- `studio.js` — THE ROOM (three.js module via the import map): the control room, four reel-to-reel
  machines on the credenza (reels turn at each track's rate), two monitors, the console shell,
  lights, the free look. Fed by `window.ReichStudio.update({ playing, master, tracks })` from
  world.js each frame. `window.ReichStudio.snapshot(name)` posts a real render to
  /api/dev-snapshot — USE IT: the Browser pane does not composite WebGL frames reliably here.
- `plain.html` + `plain.js` + `plain.css` — THE OLD PLAIN FACE, kept whole at James's word as the
  seed of a possible MOBILE experience. Same engine + player. Do not delete; do not let it rot
  silently — if the engine API changes, keep it loading.
- `assets/models/{tape,monitor,console}.glb` — Meshy (text-to-3d → refine → REMESH → shrink.py).
  Never Blender-decimate a raw Meshy soup (it shreds); remesh at Meshy (5 cr), then shrink.
- `assets/tiles/` — nano-banana seamless tiles (walnut, foam, carpet, slats).
- `assets/voices/voices.json` + `<slug>/{hit,hold}/<midi>.mp3` — THE VOICE CONTRACT. A voice
  is a folder of one-note files plus a manifest entry (`notes` sampled every 2 semitones,
  `rms` for loudness matching, `holdEnd`, `hitTail`, `lead` = MP3 encoder onset delay the
  scheduler starts early by). Any source that writes that folder is a voice.

## World-specific rules

- Every voice is rendered DRY (Surge's own effect slots switched off) and pitch-checked; effects
  come from the machine's own chain only.
- James's sound criterion (2026-09-05): voices that don't ring over each other — short, clean,
  so the interlocking notes and rhythms stay audible. Prefer short ring-out when adding voices.
- The offset knob is the instrument: fine (0.01 % steps), ±5 %, with the "comes around every"
  readout so the drift time is legible. Never quantize a track's timing back to the grid
  without the pull switch being turned up by hand; at "tape" the drift is pure.
- Pitch quantizing (notes snap to the chosen key) is the other "quantize" and stays; the
  microtonal line (`micro` per track, cents per step) is the exception.
- NEVER light up a whole grid column for the armed or playing step (James, 2026-09-06: "really
  distracting"). The armed step is a marker in the step-number row; the playhead lights the step
  number and the sounding pill only.
- The figures are "musical phrases" in every label (his word). "Gate" is "note length". "Nudge"
  is "shift". The phase bar is the clock face.
- Four tracks maximum: one reel-to-reel machine each in the room.
- THE VIEW DOES NOT MOVE. No mouse look of any kind (James, 2026-09-06, twice: "crazy town", then "kill the mouse movement entirely").
- `node tmp/reich-machine/sim.mjs` must stay green when the engine changes.
- No autoplay of the machine itself: the page opens stopped; the shared speaker button only
  gates the AudioContext.
