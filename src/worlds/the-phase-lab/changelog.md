# Changelog — The Reich Machine

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-09-06 (later still) — Claude — THE BENCH: the console is furniture in the room, per James's sketch

His sketch (pen, one perspective view): a wraparound desk in three sections with the piano along the
front and the note grid standing up behind it; the four reel-to-reels framed in the back wall; two
speaker cabinets on each side wall; cloud lights on the ceiling. His answers: keep the back of the
room as built and just build the bench in front, one open room; strips left / master right; the
console tipped up more than a mixing desk — "a specialized studio... a console that fits the way
this looks and works"; and the mouse moves the whole camera view a small amount.

- **The bench**: four DOM panels (`#screen` the editor, `#lip` the button row + piano + scribble
  strip, `#wingL` the four strips in a 2 × 2, `#wingR` the key / transport / master / dice /
  presets) placed IN the room by CSS 3-D transforms driven by the three.js camera every frame
  (the CSS3DRenderer matrices, 1 DOM px = 1.3 mm). The screen stands at 55°, the lip at 18°,
  the wings share the tilt and swing 32° toward the seat. Under each panel a walnut slab with a
  brushed inset; a plinth under the lip, legs under the wings. The Meshy console shell is gone.
- The whole view drifts with the mouse: yaw ±0.045 rad, pitch ±0.035, eased; the panels move
  with it because they are placed from the same camera.
- Second speaker cabinet each side on the side walls; five cloud lights on the ceiling.
- Strips lost their small VU and vertical fader (a level slider + M/S in the bottom row).
- The effects drawer is a flat card in the middle of the view.
- Pane check at 1920 × 1080: all four panels land inside the frame, no console errors.
- Then his first word on it: "kill the mouse movement entirely" — done; the camera is fixed.
- His second read, against his sketch: the console took over half the frame (his: the bottom
  third), everything "big and goofy" and soft (the panels were being UPSCALED — the sketch's
  proportions also fix that: they now render at ~0.7× their DOM size), the wings bent AWAY from
  the seat (sign error in the wing yaw — they wrap toward you now), the piano was card-sized,
  and the speakers and reels must be in full view at all times. Rebuilt to the sketch: seat at
  z 3.35, desk lower and smaller (screen 920 × 360 px, lip 920 × 150 with a 460 px piano, wings
  400 × 560, 1 px = 1.5 mm), machines raised (credenza 1.15 m) so they clear the desk, FOUR
  cabinets on walnut brackets high on the side walls (two each side, toed in), floor speakers +
  risers gone. Pane check: desk spans 327–1593 px of 1920 and 546–904 px of 1080.

## 2026-09-06 (later) — Claude — the free look is FROZEN at James's word

His first flight of the studio: the look swung the wrong way, stopped tracking over the console,
and the rest view hid the machines — fixed once (direction, whole-window tracking, rest pitch −0.12,
ceiling hotspot cut), then his verdict: "this whole mouse look thing isn't working at all... a panel,
like a piece of software, and this floating view above... why is it even moving at all? Freeze it in
the center." So: no mouse look, no wheel lean; the camera sits at the rest view where all four
machines and both monitors are in frame above the console. A conversation about where the whole
thing deviates from what he imagined comes next, at his word.

## 2026-09-06 — Claude (Fable 5.1) — THE STUDIO + THE CONSOLE, pass 1, on James's go

James played the first pass: "cool and a great start... quite a lot as I envisioned it" — but "it's not a
world, it's just software", and the plain face was "a little bit hard to use". His brief: a recording-
studio environment (a console in front of you, big monitors facing you, a nice big room), the controls
moved down onto a friendlier console, ten recommendations for making it easier, the key/mode picker
findable, the per-track arrows + slider explained, "gate" explained, the figures not called presets, the
lit-up column when clicking notes GONE, more physical, a physical piano. His answers to the seven
questions: 1970s studio with FOUR reel-to-reel machines (one per track that can be added); free mouse
look, small range; Meshy go; four tracks; one big editor; the figures are "musical phrases"; the rest
of the ten built. And: KEEP the old face aside for a possible mobile experience.

- **The plain face is kept whole** as `plain.html` + `plain.js` + `plain.css` (the mobile candidate).
  `index.html` is now the studio.
- **`studio.js`** (three.js module, import map like Surround): a 13 × 11 m control room — carpet,
  slatted-fabric back wall, foam squares on the sides, walnut ceiling, a walnut dado; four Meshy
  reel-to-reel machines on a walnut credenza just past the console, reels turning at each track's own
  rate (procedural reels laid exactly over Meshy's baked ones, measured from the mesh: ±0.242 W,
  0.82 H); two Meshy monitors on 1 m walnut stands, toed in, cabinets breathing with the level, warm
  washes behind them that pulse; the Meshy console shell under the control surface; a tally LED per
  machine. Free look: yaw ±0.2 rad from the pointer's x anywhere, pitch only while the pointer is over
  the room (eased ~0.4 s, motion-sickness discipline), wheel over the room leans in (fov 50 → 26).
  `window.ReichStudio.update({ playing, master, tracks })` is fed every frame by world.js;
  `.snapshot(name)` posts a real render to /api/dev-snapshot (the pane does not composite WebGL
  reliably — every look this session went through that route).
- **Meshy** (~130 credits): three text-to-3d previews + PBR refines (tape deck, monitor, console) + a
  Meshy REMESH of each (5 cr) after Blender's collapse decimate SHREDDED the raw 1M-tri soups (holes
  everywhere; the remesh is the clean route) → `tmp/reich-machine/shrink.py` drops the emission map,
  shrinks maps (base 2048 / rest 1024), exports JPEG GLBs: `assets/models/{tape,monitor,console}.glb`
  at 3.0 / 1.9 / 4.0 MB. Four nano-banana tiles in `assets/tiles/` (walnut, foam, carpet, slats — two
  had painted borders, cropped). The raw + remesh GLBs stay in `tmp/reich-machine/meshy/`.
- **The console** (`world.css` + `world.js`): brushed panel with walnut cheeks, silkscreen labels,
  amber readouts, a fixed bottom slab (50 vh, 520–680 px) over the room. THE METER BRIDGE: transport
  (▶ ⏮ ● record), tempo stepper, steps-per-beat buttons, hold; THE KEY as one big lit window ("C
  mixolydian · dominant 7") with root / scale / chord under it; two master VUs (real needles off a
  master analyser), volume / room / squash, the dice pair, presets. FOUR CHANNEL STRIPS: tally LED,
  voice name-plate (hover plays it), the OFFSET KNOB (drag up/down 0.02 %/px, shift for 0.002, wheel
  0.01 %, double-click zero) with "+1.00 %" and "comes around every m:ss" printed under it, the
  tape / lean / piano phase switch (pull 0 / 0.5 / 1), a CLOCK FACE (hand = offset from the master,
  twelve o'clock = in step) with the drift readout and "shift ◀ ▶" (nudge), NOTE LENGTH (gate),
  a small VU, a vertical fader, M / S (solo is new — engine field + player honours it). Empty slots
  are "+ track" plates, four maximum. THE EDITOR for the selected track: title, MUSICAL PHRASE chips
  (▶ plays the phrase on the track's voice at tempo, the name writes it, "🎲 roll one"), length
  buttons 4 5 6 7 8 12 16 + a number, notes auto/short/held, octaves C2–C5, micro, clear, more…;
  the grid with a step-number row above it — the ARMED step is a small marker there and the
  playhead lights the step number + the sounding pill only. Notes are pills: click writes + arms,
  drag a pill to move it (ghost outline while dragging), drag across empties draws, right-click /
  shift clears, hover a cell ~220 ms for a soft preview, Delete clears the armed step, 1–4 select
  tracks, R records. RECORD: play the piano while it runs and notes land on the nearest step of the
  selected track. THE PIANO on the lip, physical keys that press. THE SCRIBBLE STRIP under it shows
  the silkscreen help of whatever the pointer is over (every control carries `data-help`). The
  DRAWER (more…) holds the thirteen effects for the selected track; the cents row appears in the
  editor in micro mode. The dice: phrase die = `E.rollPhrase` (random walk, small steps, ~15 %
  rests) into the selected track in the current key; machine die = `E.rollMachine` (key, 2–4
  tracks, voices, phrases, offsets ¼–2 %). Amber veil flash on a roll.
- engine: `solo`, `rollPhrase`, `rollMachine`; player: master + per-chain analysers (`P.levels()`),
  solo in `applyFx`, `preview` takes a velocity. Sim: TEST 10 (dice shapes, rolled machines play,
  solo rides snapshots) — 3,000+ assertions green.
- Pane checks (volume at zero): dice machine → four strips + key + editor; grid click writes + arms
  with NO lit column; pill move gesture (source cleared, target set); piano writes to the armed step
  and advances; phrase audition lights; drawer shows 13 sliders; length buttons re-grid.

NOT DONE / NEXT (his eyes first): the look in flight (room brightness, machine size, the monitors
read small — a regenerate is one prompt away), motion-sickness read on the free look, iterate the
one-editor layout after pass 1 (his call), then exits + ship wiring. The console model is fully
hidden under the control surface at rest (kept — it shows if the slab ever shortens).

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
