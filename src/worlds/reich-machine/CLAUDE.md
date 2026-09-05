# The Reich Machine — Claude instructions

A phase-shifting step machine after Steve Reich's tape and Piano Phase pieces: N tracks, each a
step sequence on one voice, each running a little faster or slower than the master, drifting past
each other. Draft world (In progress, unwired). James's brief: `world-drafts.json` → "The Reich
Machine". Aesthetic direction for the later look pass: Glass Bead Game meets The Player of Games
meets Arcane — a ceremonial game-board instrument. NOT built yet; the current face is plain.

## Docs

- `changelog.md` — session history, newest first. Read it before touching anything.
- `tmp/reich-machine/` (gitignored, James's machine only) — the whole sound pipeline:
  `render_library.py` + `library.html` (the 3,008-patch Surge audition page James picked from),
  `james-picks.txt` (his fifteen), `render_banks.py` → `encode_banks.mjs` (voice banks into
  `assets/voices/`), `sim.mjs` (the engine sim). KEEP all of it.

## Architecture

- `engine.js` — pure core, no DOM/audio, runs in Node for the sim. Tracks carry a fractional
  phase in steps; `advance(dt)` returns note events. Per-track `rate` (the offset knob),
  `pull` (0 = tape drift, 1 = Piano Phase lingering at lock points, capped so it never freezes),
  `hold` (everything on the master), `nudge` (whole steps). Scales/chords/figures live here.
- `player.js` — Web Audio: lookahead scheduler (25 ms tick, 150 ms lookahead, 25 ms engine
  chunks), the sampler (nearest sampled note + playback-rate bend; `hit` / `hold` articulations;
  note-off before the baked release crossfades into the sample's own release segment at
  `holdEnd`), per-track effects chain, master chain (comp + limiter + shared convolver reverb).
  Falls back to a synthesized `tone` voice when banks can't load (file://).
- `world.js` + `world.css` — the plain face.
- `assets/voices/voices.json` + `<slug>/{hit,hold}/<midi>.mp3` — THE VOICE CONTRACT. A voice
  is a folder of one-note files plus a manifest entry (`notes` sampled every 2 semitones,
  `rms` for loudness matching, `holdEnd`, `hitTail`, `lead` = MP3 encoder onset delay the
  scheduler starts early by). Any source (Surge today; a DAW, hardware, samples later) that
  writes that folder is a voice. Nothing above it changes.

## World-specific rules

- Every voice is rendered DRY (Surge's own effect slots switched off) and pitch-checked; the
  library pass measured the octave offset per patch and the bank render applies it. Effects
  come from the machine's own chain only.
- James's sound criterion (2026-09-05): voices that don't ring over each other — short, clean,
  so the interlocking notes and rhythms stay audible. Prefer short ring-out when adding voices.
- The offset knob is the instrument: fine (0.01 % steps), ±5 %, with the "comes around every"
  readout so the drift time is legible. Never quantize a track's timing back to the grid
  without the pull dial being turned up by hand; at pull 0 the drift is pure.
- Pitch quantizing (notes snap to the chosen scale/chord) is the other "quantize" and stays;
  the microtonal line (`micro` per track, cents per step) is the exception.
- `node tmp/reich-machine/sim.mjs` must stay green when the engine changes.
- No autoplay of the machine itself: the page opens stopped; the shared speaker button only
  gates the AudioContext.
