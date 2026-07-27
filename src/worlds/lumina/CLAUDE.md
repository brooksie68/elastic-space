# Lumina — Claude instructions

Began as the Spastic Space pork.html oscillator field (2002), rebuilt as a tunable,
embeddable renderer; it is now a full music-reactive visualizer (scene layer, FX rack,
beat clock, authored DJ sets).

**Naming history — two renames, don't get them confused.** The build started as the
"pork" recreation, which James renamed **Relaaax** on 2026-07-19 (after the original
2002 GIF piece). On 2026-07-26 he renamed it again to **Lumina**, because the old name
described a black-and-white GIF loop and no longer described this: *"it's now not really
appropriate or descriptive of what's going on here."* Lumina is Thomas Wilfred's term
for light treated as an art form in its own right. Everything — folder, slug, globals,
CSS prefix (`lum-`), localStorage keys, BroadcastChannel — is `lumina` now;
`migrate-storage.js` copies James's saved state over from the old keys on first load.
Entries in `changelog.md` from before that date use the old names on purpose.

## Docs

- `changelog.md` — session history, newest first.
- `assets/spastic-space/recreation-notes.md` (repo root assets) — the source spec:
  decoded GIF timing table, framing, era notes. The timing constants in
  `lumina-field.js` come straight from it.

## START HERE — next session is the panel (James, 2026-07-27 wrap)

He ended the 2026-07-27 session by saying so directly: **the next session starts on
optimizing the panel.** Don't open with anything else, and don't start by writing panel
code — his brief is a design problem. Read NEXT UP item 4 below for the full brief in his
words, then have the conversation.

The three things worth carrying in from the end of that session:

1. **"Shorter, clear explanations" is largely a COPY EDIT.** Every control currently has
   a long full sentence of `.tuner-desc` under it. Rewriting that copy is cheaper to
   iterate on than moving boxes, and it may deliver most of what he means by "big jumble"
   on its own. Consider proposing a copy pass as step one, before any restructuring.
2. **Two loose ends from pass 1**, both small: the ↩ back and `keep` buttons have never
   been clicked by anyone (verified by construction only — the detached controller has no
   host to talk to, and the host page plays music, which doesn't go in the agent browser
   pane), and the `.tuner-minis` column minimum is 15em, a value that measured well at
   1585px rather than an optimum. A column-width sweep (13/15/17/19/21em) was attempted
   and abandoned when the browser pane hung; it would settle the ~8% height increase that
   capping the sliders introduced.
3. **The dice is the spine of the redesign,** not a button to relocate. His framing: it
   "is gonna become a whole control function." The ↩/🎲/keep cluster shipped in pass 1 is
   the seed of that, and NEXT UP item 3 (per-parameter re-rolling locked to the beat grid)
   is probably the same feature seen from the other end. Design them together.

## Next session (2026-07-25 night wrap)

- **Protected behaviors added on James's direct feedback (laptop session):**
  (1) free play is the DEFAULT — claude's set is opt-in via the transport
  bar; never make a composed set the entry experience again. (2) The
  transport bar (music.js, bottom-left) stays always visible — prev/play/
  STOP/next, track name, set switch. (3) Docked mode: the open in-page panel
  docks right (body.lum-docked) so one laptop screen fits viz + controls.
- **Sets are v4** — fully re-cut on the bar grid; every event is B(n) or a
  measured drop/quiet, labels carry bar numbers ("b41 sheet lightning"), and
  composition-sim ENFORCES the grid (events within 90ms of a bar or on a
  measured transient). Keep that assertion green when editing sets.
- James still hasn't had a full run: his stated flow is baseline → visual
  experiments → audio + reactivity → claude's sets. Expect 10%-step tweaks
  to scene gains/tone maps by bar-numbered label.
- SHELVED BY JAMES 2026-07-25 (his call after plain-terms recap): true GPU
  fluid sim (revisit only if the curl-noise ink scene leaves him wanting) and
  the 3D rave venue (he's unsure he wants it at all — do not pitch again
  unprompted). The other 2026-07-24 direction ideas are absorbed: #3
  waveform-as-matter = a future scene; #4 Electric Sheep breeding = the flame
  farm (tmp/lumina/flame-farm) feeding new flame genomes.
- Flame farm results (if the overnight batch ran) need James's morning cull —
  picks become named genomes/scenes.
- Still open: more Suno tracks (add to TRACKS + analyze + compose), live audio
  input phase 2, final setting decision, ship wiring (drift/registry/admin
  link — world is still draft).

## Scene layer (v3, 2026-07-25)

- `scenes.js` — pure data/helpers (shader sources + palette-stop math), no
  DOM/GL: fx.js compiles and renders, sims lint it, tuner.html loads it for
  the scene list. Four scenes: ink, ridge, flame (90k-point GPU chaos game),
  nebula. Shared uniform contract: uTime/uScale/uDrive/uWarp/uBeat/uPal[6]
  (+uRes for frag scenes, uAspect/uGain for flame).
- Scenes render in fx.js "pass 0" into their own framebuffer, then the
  feedback pass composites: `mix(scene * sceneMix, tile.rgb, tile.a *
  sceneTiles)` — tile canvas goes transparent-background when a scene is on,
  and display-list items tagged `kind: "backdrop"` (outer box + row boxes)
  fade with `1 - sceneMix`. Flame gets a Reinhard tone map (uSceneTone).
  With scene "none" every uniform collapses to the pre-v3 math exactly.
- `scene !== "none"` activates the GL path even with all fx* at 0 (gate in
  lumina-field.js frame()).
- The scene clock accumulates dt * sceneSpeed (like the field clock) —
  modulating sceneSpeed never snaps the scene.
- Scene shader edits are verified by tmp/lumina/fx-test.html, which compiles
  every program SYNCHRONOUSLY against a real GL context — trust that half
  even when the Browser pane isn't compositing (its live-mount half needs a
  displayed pane). Run composition-sim after any scenes.js/DEFAULTS change.
- Adding a scene: shader in scenes.js (+LIST), nothing in fx.js unless it
  needs a custom draw path (flame pattern), tuner select picks it up from
  LIST, sim asserts the uniform contract automatically via SCENES.FRAG.

## Flame genomes (2026-07-26)

- The flame scene plays REAL bred genomes from `assets/flame-genomes.js`
  (James's 20 picks of 7,307). Never hand-edit that file — re-run
  `node tmp/lumina/flame-farm/export-genomes.mjs` (it reads picks.json +
  genomes.json). Renders: `tmp/lumina/flame-farm/renders/<id>.png`.
- `sceneGenome` selects by NAME; `scenePalette: "genome"` uses the genome's
  own bred stops. Each genome carries a precomputed frame {cx, cy, scale,
  gain} — gain equalizes diffuse vs concentrated attractors, without it the
  spread-out ones render as faint fog.
- **Two lessons, both invisible to reasoning and caught only by rendering:**
  (1) the chaos game's per-iteration branch pick needs a WELL-MIXED hash —
  an additive sequence makes every point follow the same branch order and the
  cloud collapses to a dot; (2) live sample counts are ~15× lower than the
  offline farm's, so brightness must be normalized per genome.
- Verify with `tmp/lumina/genome-test.html` (renders all genomes through the
  shipping shader, flags fill ratios, posts a contact sheet to
  `tmp/snapshots/flame-genomes-live.jpg` via `POST /api/dev-snapshot` —
  that endpoint exists because the agent browser pane can't screenshot unless
  it's displayed; use it for any WebGL work here).

## NEXT UP — James's three, agreed 2026-07-26 (each needs its own go)

He named these after watching v6 and playing with the dice. All three are
approved as DIRECTION, none are approved to build — discuss and plan first.

1. **Better beat detection, generally — including "there is no beat here."**
   The current detector forces ONE confident tempo across a whole track.
   James: *"Timber is completely atonal, arrhythmic for the first minute —
   there's actually no beat at all, so that's pretty hard to set your beat
   to."* That is a correct diagnosis of why Timber's lock is weakest (1.52×
   vs Angular's 2.55×). The fix is time-varying: measure beat confidence per
   bar/section, let tempo drift or lapse, and have the visuals KNOW when
   there's nothing to lock to (accents silent, free-running motion) instead
   of pulsing against an invented grid.
2. **Split the sound into registers / instruments.** He asked for "some type
   of comb filter so that we're hearing different instruments, different
   registers" and driving individual parameters from each. Today everything
   follows four coarse bands and one overall level. Real separation (kick vs
   hats vs mids, or harmonic/percussive separation) would let the kick drive
   one thing and the hats another.
3. **Per-parameter re-rolling, in time.** The dice, but musical: individual
   knobs re-rolling on their own schedules against the beat grid, rather than
   the whole look changing at once.
4. **Make the panel a VJ instrument (added 2026-07-27, after panel pass 1).**
   His words: it is *"kind of a big jumble of lots of different stuff"* and
   needs *"better grouping with shorter, clear explanations"*; it must
   *"invite play, and invite live play while music is playing"* — you should
   *"be able to see what you're gonna do and kind of use it like a VJ."* And
   the dice *"is gonna become a whole control function"*, not one button.
   Pass 1 (2026-07-27) only did typography and reach: Roboto, capped slider
   tracks, a text-size control, and the ↩/🎲/keep roll cluster. The grouping
   and the live-play affordances are untouched and are a DESIGN CONVERSATION
   FIRST — plan with him before writing panel code. Bear in mind the descs
   are currently long sentences under each control; his ask is shorter and
   clearer, which means editing copy as much as moving boxes.

**Dice status:** the manual 🎲 button SHIPPED and James loves it — *"pressing
that dice button every four bars is quite incredible, one of the better
visualizations I've actually seen."* An automatic version (roll every N bars /
on punches, with a partial-roll depth) was built the same night and
**REVERTED at his instruction** — not because it was wrong but because it
isn't ready to go in "willy nilly". Some variation of it lands later, most
likely as item 3. Don't re-add it unprompted.

## The clock, and why it is sacred (2026-07-26)

- **James's ear beats the detector. Always.** He called Angular Ritual at 115
  when the analyzer said 76.01 (exactly 2/3 — a metrical-level error) and he
  was right to within 0.2%. `BPM_OVERRIDE` at the top of track-analyze.mjs is
  where his calls live; add a line whenever he names a tempo.
- Tempo detection is comb-proposes / alignment-disposes with a **binomial
  likelihood ratio**, not a hit ratio and not hits-minus-chance. Both of those
  are metrically biased and were tried and rejected the same night (ratio →
  Timber at 82.6 = ×⅔; excess → 186.2 = ×3/2). Don't "simplify" it back.
- `assets/track-grid.js` is generated — never hand-edit. It carries bpm, beat
  and bar length, first downbeat, sections, per-bar energy, and PUNCHES
  (drop / break-return / groove / build).
- **Sets are authored in BARS** (see below). Times are derived from the grid
  at load, so re-measuring a track re-times its whole set.

## Beat lock (v6, 2026-07-26)

- Four mod sources come from the grid, not the audio, so they have no
  detection lag: `pulse` (accent impulse), `bar`, `phrase`, `swing`. Use them
  for anything that should feel ON the beat; keep the band followers (bass,
  mid…) for texture that should follow the sound.
- `accent` (field key) picks which sixteenths pulse fires on — ten patterns in
  music-dsp.js ACCENTS. `syncBeats` locks one flash cycle to N beats exactly
  (music.js computes speed = RAMP / (syncBeats × beatLen)).
- Accents deliberately do NOT fire before the first downbeat.
- `syncBeats`/`nest`/`rows`/`cols` are in composition.js SNAP_KEYS — they must
  never be interpolated by a ramp.
- Verify with `tmp/lumina/clock-test.html` (asserts the impulse lands on the
  exact frame its sixteenth begins).

## Set composition (v6): looks + variations + a bar score

- `assets/compositions.js` defines, per track: a LOOK vocabulary (complete
  named identities), VARIATION operators that bend a look while keeping it
  recognizable, and a SCORE of `[bar, look, variation, extra]`.
- `call(from, to, every, pairs, varies)` expands call-and-response phrases —
  this is James's "one setting for 4 beats, then another, then the first again
  but varied".
- **New looks are reserved for measured punches**; between them, vary. The sim
  asserts the set lands on ≥70% of the analyzer's punches.
- Tune conversationally by bar label ("b45 D/blast").

## Musical structure (analyzer v2, 2026-07-25)

- track-analyze.mjs now emits `totalBars`, `phrase` ({len, confidence} from an
  8/12/16/24/32-bar vote), and `sectionsV2` (lettered sections with bar-grid
  boundaries + energy) alongside the old sections/drops/quiets. Compose scene
  changes on sectionsV2 boundaries / drops; smaller mutations on 8/16-bar
  phrases; convert bars→seconds via firstDownbeat + (bar-1)*barLen.

## Architecture map (v2, 2026-07-24)

- `lumina-field.js` — the renderer/instrument. v2 adds structure (layouts,
  shapes, waveforms, palettes/hueShift, merge/rotate/spin/displace/sizePulse,
  counter, nest) and the fx* config keys. Grid layout keeps the ORIGINAL flex
  DOM path; defaults render pork 2002 verbatim (sim-asserted — keep it that
  way). Non-grid layouts + FX read positions from `layoutTiles()` /
  `displayList()` (analytic, design coords).
- `fx.js` — WebGL post chain (13 effects). Consumes the field's display list
  via `field.setFrameHook`; active iff any fx* key > 0; DOM path untouched
  when off. FX knobs are field config keys — never invent a side channel.
- `tuner.js` + `tuner.css` — the whole control surface (two tabs: visual |
  audio), bus-driven, no state of its own. Runs embedded (index.html shell
  `#lum-tuner`) and detached (`tuner.html` + `tuner-remote.js`, over
  BroadcastChannel "lumina-ctl"). New field/music params get their control
  HERE, in the right tab.
- **The panel is sized in `em` off ONE base (2026-07-27).** `.lum-tuner` sets
  `--ui-base: 16px` and `font-size: calc(var(--ui-base) * var(--ui-scale, 1))`;
  every type size, pad, gap, control height and slider cap in `tuner.css` is
  `em` so the text-size control in the tab bar scales the whole surface
  together. **Do not add `rem` values to this stylesheet** — the only three
  left are viewport-anchored on purpose (bottom offset, scroll cap, width
  backstop). Keep the `--ui-scale` fallback in step with `UI_SCALE_DEFAULT` in
  tuner.js; it is what paints before the module runs. The scale persists PER
  WINDOW (`lumina-ui-scale`) and is deliberately not sent over the channel —
  the detached controller is usually on a different screen.
- **Slider tracks are capped** (20em, 7.5em inside a grid column) and control
  rows are grid columns, not `flex: 1`. Before this, two controls could split
  a 1585px panel between them and a knob got a 1470px track. Don't reintroduce
  fluid track widths — long tracks cost mouse travel and buy no precision.
- **The roll cluster** (↩ back / 🎲 dice / keep) lives in the preset row.
  `back` sends `{scope:"field", type:"undo"}`; world.js keeps a 30-deep stack
  pushed inside `applyPreset`, so it records whole-look JUMPS only — never
  slider drags. If you ever make hand tweaks undoable, do it as a separate
  stack; mixing them makes "back" useless during a set.
- `world.js` — host: clean state authority, command router
  (`LuminaHost`), field presets, frame, detach handshake.
- `music.js` — audio graph, player, reactivity loop, DJ playback; registers
  with the host and mounts the tuner. `music-dsp.js` — DOM-free DSP + the
  TARGETS table (new modulatable params get an entry there).
- Script order in index.html matters: field → presets → dsp → composition →
  compositions → fx → tuner → world → music.
- Sims: `node tmp/lumina/composition-sim.mjs` (58 asserts — engine, sets,
  field-v2 units) and `node tmp/lumina/music-sim.mjs` (14) after ANY change
  to the field math, DSP, engine, or sets.

## World-specific rules

- **Architecture is deliberate:** `lumina-field.js` is a standalone renderer
  (`LuminaField.mount(container, config)`) that knows nothing about the page, tuner,
  or localStorage. The final setting is undecided (James is thinking a TV in a scene —
  people watching and drooling), so the field must stay droppable into any container.
  Keep page concerns in `world.js`.
- The field scales all geometry off its container via `--ux`/`--uy`/`--umin`
  ("one 2002 pixel", split per axis since 2026-07-23 so fill mode can stretch);
  size and aspect ratio of the host box must never matter. Geometry knobs land as
  unitless CSS vars on the root — world.css multiplies them by the u-vars.
- Flashing patterns live in the renderer's `PATTERNS` array (24 as of 2026-07-23):
  each assigns per-tile timing spec + phase offset from (row, col, grid, twist).
  `spread` scales phases at runtime (no rebuild); `twist` re-runs the pattern;
  only grid-size changes rebuild DOM — and even that keeps the field clock, so motion
  never restarts. "pork 2002" must always reproduce the original spec matrix
  verbatim at 3×4.
- Rendering is JS rAF driving background colors — NOT CSS keyframe animations. This is
  what makes live tuning phase-continuous (speed changes never snap) and desync a real
  parameter. Don't "simplify" it to CSS animations.
- Timing constants (RAMP = 2.1s, the hold table) are decoded from the original GIFs —
  don't retune them in code; the tuner exists so James tunes by eye.
- **Load behavior (James, 2026-07-25): the page always OPENS on pure DEFAULTS —
  the basic pork 2002 animation.** Tuning still writes to localStorage
  (`lumina-tuner`) on every change, but the stored state is never applied
  silently on load — it's reachable as the "last session" entry (value `last`,
  "auto" optgroup) in the field preset menu. Don't reintroduce apply-on-load.
- Both tuner tabs have a reset: visual's resets field + frame (`resetAll`,
  field scope), audio's resets reactivity/matrix/shuffle/per-track/DJ mode
  (`resetAll`, music scope — leaves playback and volume alone).
- Player transport (2026-07-25): play/pause, stop (pause + rewind), prev/next,
  seek scrubber + time readout, volume slider (drives the shared sound control
  via `soundUI.setVolume`, so the speaker's hover slider stays in sync).
  `timeupdate` streams snapshots ~4 Hz while playing — tuner selects with
  rebuilt option lists must sig-guard their rebuilds or open dropdowns snap
  shut (see the preset reflectors in tuner.js).
- `presets.js` is the PERMANENT preset list (each config a partial over DEFAULTS).
  James's saved presets live in localStorage `lumina-presets`; when he says one
  earns a spot, bake it into `presets.js` — never delete or retune existing
  entries there without his say-so.
- The 1024×768 frame in index.html is TEMPORARY staging, not the design.
- Status: draft/WIP — intentionally NOT in the registry, no drift exits, no admin panel
  link yet. Those land at ship time along with the final setting.
- Open idea (unbuilt): a "steps" option quantizing the ramp to the GIFs' 21 discrete
  levels for the authentic stepped flicker.

## Music reactivity (built 2026-07-24, phase 1)

- Tracks are James's Suno MP3s in `assets/sound-tracks/` — a new track is
  dropped there AND added to the `TRACKS` list at the top of `music.js`
  (no directory listing: file:// must keep working).
- Architecture mirrors the field/world split: `music-dsp.js` is the DOM-free
  math (bands, auto-gain, envelopes, beat detector, mod matrix) so
  `tmp/lumina/music-sim.mjs` runs the exact shipping code — run it after any
  DSP change (14 assertions). `music.js` is page glue: audio graph, player,
  reactivity UI, modulation loop.
- **The modulation contract:** `world.js` owns the clean base config (`state`,
  exposed as `globalThis.luminaTuner`); music writes modulated values onto the
  live field per frame and restores base on stop/master-0. Never save, reflect,
  or preset from `field.getConfig()` while music can be playing — always the
  clean state. `lumina-field.js#setConfig` refreshes selectively by key so
  these per-frame writes do no layout work; keep new config keys sorted into
  FIT_KEYS/GEO_KEYS/COLOR_KEYS or they won't refresh.
- The analyser taps BEFORE the volume gain — reactivity must never depend on
  listening level. Element volume stays 1; the gain node is the volume.
- Reactivity presets (`lumina-music-presets`, factory "stock aggressive"
  protected like field presets) and per-track recall (`lumina-music`
  store) follow the field-preset rules: bake earned ones into code only on
  James's say-so.
- Phase 2 ideas (unbuilt, James's "maybe some other something more later"):
  live audio input (mic), possibly tempo-locked pattern advances.

## Visual DJ (built 2026-07-24, same session, James's "go nuts")

- Each track has a Claude-authored composition in `assets/compositions.js`:
  timed events (labelled!) placed on MEASURED musical moments — re-run
  `node tmp/lumina/track-analyze.mjs` for the analysis (BPM, downbeat, sections,
  drops, quiets; JSON in `tmp/lumina/analysis/`). When a track is added or
  replaced, analyze first, then compose; never place events by guesswork.
- `composition.js` is the DOM-free engine (ramps lerp numerics + hex colors,
  strings/booleans snap, backward seek replays). `music.js` holds the toggle
  (`store.dj`: "claude" default / "free") and the tick-loop merge: composition
  supplies field base + reactivity settings; live modulation rides on top;
  free play/pause restores the tuner's clean base entirely.
- Tuning the sets is conversational — James names a labelled moment ("the 59s
  inversion"), Claude edits that event. After ANY edit to compositions.js or
  composition.js, run `node tmp/lumina/composition-sim.mjs` (39 assertions:
  ranges, patterns, replay determinism, authored blackout/inversion moments).
- Sets deliberately open with a full field base at t=0 so they play identically
  regardless of slider state — keep that invariant for new sets.
