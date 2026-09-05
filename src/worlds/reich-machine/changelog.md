# Changelog — The Reich Machine

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-09-05 — Claude (Fable 5.1) — the machine, first pass, on James's go

The sound gate first. James's concern before any GUI: "not with shitty sounds." So:

- **The Surge XT library audition** (`tmp/reich-machine/render_library.py` + `library.html`):
  every patch on the machine (637 factory + 2,371 third-party = 3,008) rendered DRY — each
  patch's own effect slots zeroed in the patch XML before render (the `fx_bypass` plugin
  parameter did nothing headless; the XML edit must keep byte length or the plugin segfaults) —
  pitch-checked (harmonic product spectrum, second-note confirmation) and transposed to concert
  pitch where the patch sat octaves off (1,248 of them). Page: search, author/category filters,
  pitched/unpitched/all, ring-out filter, Q–I plays a C major scale, four short melodies as
  loop buttons, keys release on key-up, F stars. Playback fixes on his ear: loudness-matched
  per note + master gain + safety compressor (the first cut summed peak-normalized samples and
  clipped), note-off (the first cut rang everything like a pedal down).
- **His fifteen picks** (`james-picks.txt`): DX EP, EP 1, Deep End, Plain, Square Bass, Guitar 1,
  Kalimba, Whatever, Synth Tom 2, Flute (LinnStrument), Evil Sucker Seq, Gumdrops, Blur, Gliss
  Lead, Music Box Lead. His criterion for this machine: voices that don't ring over each other,
  so the interlocking stays audible.
- **Voice banks** (`render_banks.py` → `encode_banks.mjs` → `assets/voices/`): every other
  semitone C2–C7, two articulations (0.12 s hit; 4 s hold + release), dry, transposed, peak-
  normalized per voice, MP3 112 kbps mono, 26 MB for fifteen voices; `voices.json` carries
  notes / rms / holdEnd / hitTail / lead (measured encoder onset delay, ~25 ms).
- **engine.js** (pure): tracks with fractional step phase, per-track rate, pull-to-grid law
  (deviation × (1 − pull·cos²(π·offset)), capped 0.97 so it never freezes), hold, nudge,
  27 scales, 25 chords, 10 original figures in scale degrees, quantize/requantize, the
  microtonal line, snapshot/restore. `tmp/reich-machine/sim.mjs`: 9 tests, 257 assertions,
  green (grid timing, chunk invariance, the 1 % track laps in exactly L/(sps·dev) seconds,
  pull lingers ~>50 % near lock points yet still drifts through, hold/nudge, pitch material,
  six-voice run).
- **player.js**: lookahead scheduler, sampler with nearest-note rate bend and a real release
  crossfade at note-off, per-track chain (distortion → ring mod → auto-wah → univibe →
  compressor → level; delay loop + reverb send), master comp + limiter + convolver room,
  harmonizer as a second triggered note, envelope filter per note, built-in tone voice as the
  file:// fallback.
- **The plain face** (`world.js`/`world.css`): transport, tempo, steps per beat, hold; root /
  scale / chord; two-octave keyboard (arm a step, play a key to write it); per track: voice,
  length, figure fill, articulation, gate, level, mute, micro, THE OFFSET SLIDER (±5 % in
  0.01 % steps, double-click to zero, "comes around every m:ss"), pull, nudge, phase bar +
  drift readout, the step grid (rows = scale notes over two octaves; playhead), cents row in
  micro mode, effects fold-out; master volume / room / squash; presets in localStorage,
  autosave, demo button (two tracks of the twelve-note figure, one at +1 %).
- Draft world: `world.json` draft, admin row under In progress (unwired), no exits yet.
- Scheduler verified in a hidden pane (timers throttled to 1 Hz): lookahead widens to 1.4 s
  when `document.hidden`, past-due notes drop, phase stays continuous — step spacing exact.
  Pane check: loads clean, two voices decode (incl. synth-tom-2), no console errors.
- James's read at wrap: "really good work tonight" — he had not yet played it.

NOT DONE / NEXT (his eyes first): the look pass (Glass Bead Game / Player of Games / Arcane —
a look-dev page before it goes in), drift exits + ship wiring, Lumina panel (parked at his word).
Untested by ear: the release crossfade on every voice, harmonizer voicing, the univibe. The
Node MP3 decoder complained on synth-tom-2's very short hit files; the browser decodes them
itself — verify it plays.
