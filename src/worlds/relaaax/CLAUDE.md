# Relaaax — Claude instructions

The Spastic Space pork.html oscillator field (2002), rebuilt as a tunable, embeddable
renderer. Formerly referred to as the "pork" recreation — James renamed it Relaaax
(2026-07-19).

## Docs

- `changelog.md` — session history, newest first.
- `assets/spastic-space/recreation-notes.md` (repo root assets) — the source spec:
  decoded GIF timing table, framing, era notes. The timing constants in
  `relaaax-field.js` come straight from it.

## Next session (2026-07-24 wrap)

- James has NOT yet had his first real run of the full expansion + v2 DJ sets —
  start there; expect by-ear tuning of sets (by event label) and effects.
- Five "hard direction" ideas pitched and well received, NONE chosen yet — his
  pick pending: (1) GPU fluid sim under the field, (2) 3D fly-through lattice,
  (3) waveform-as-matter (Lissajous ribbons / spectral terrain), (4) Electric
  Sheep-style evolutionary preset breeding + auto-DJ, (5) diegetic 3D rave venue
  with the field on the big screen (extends his TV-in-a-scene setting idea).
  Discuss before building — these are co-build scale.
- Still open: more Suno tracks coming (add to TRACKS in music.js + analyze +
  compose), live audio input phase 2, final setting decision, ship wiring
  (drift/registry/admin link — world is still draft).

## Architecture map (v2, 2026-07-24)

- `relaaax-field.js` — the renderer/instrument. v2 adds structure (layouts,
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
  `#rlx-tuner`) and detached (`tuner.html` + `tuner-remote.js`, over
  BroadcastChannel "relaaax-ctl"). New field/music params get their control
  HERE, in the right tab.
- `world.js` — host: clean state authority, command router
  (`RelaaaxHost`), field presets, frame, detach handshake.
- `music.js` — audio graph, player, reactivity loop, DJ playback; registers
  with the host and mounts the tuner. `music-dsp.js` — DOM-free DSP + the
  TARGETS table (new modulatable params get an entry there).
- Script order in index.html matters: field → presets → dsp → composition →
  compositions → fx → tuner → world → music.
- Sims: `node tmp/relaaax/composition-sim.mjs` (58 asserts — engine, sets,
  field-v2 units) and `node tmp/relaaax/music-sim.mjs` (14) after ANY change
  to the field math, DSP, engine, or sets.

## World-specific rules

- **Architecture is deliberate:** `relaaax-field.js` is a standalone renderer
  (`RelaaaxField.mount(container, config)`) that knows nothing about the page, tuner,
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
  don't retune them in code; the tuner exists so James tunes by eye, persisted to
  localStorage under `relaaax-tuner`.
- `presets.js` is the PERMANENT preset list (each config a partial over DEFAULTS).
  James's saved presets live in localStorage `relaaax-presets`; when he says one
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
  `tmp/relaaax/music-sim.mjs` runs the exact shipping code — run it after any
  DSP change (14 assertions). `music.js` is page glue: audio graph, player,
  reactivity UI, modulation loop.
- **The modulation contract:** `world.js` owns the clean base config (`state`,
  exposed as `globalThis.relaaaxTuner`); music writes modulated values onto the
  live field per frame and restores base on stop/master-0. Never save, reflect,
  or preset from `field.getConfig()` while music can be playing — always the
  clean state. `relaaax-field.js#setConfig` refreshes selectively by key so
  these per-frame writes do no layout work; keep new config keys sorted into
  FIT_KEYS/GEO_KEYS/COLOR_KEYS or they won't refresh.
- The analyser taps BEFORE the volume gain — reactivity must never depend on
  listening level. Element volume stays 1; the gain node is the volume.
- Reactivity presets (`relaaax-music-presets`, factory "stock aggressive"
  protected like field presets) and per-track recall (`relaaax-music`
  store) follow the field-preset rules: bake earned ones into code only on
  James's say-so.
- Phase 2 ideas (unbuilt, James's "maybe some other something more later"):
  live audio input (mic), possibly tempo-locked pattern advances.

## Visual DJ (built 2026-07-24, same session, James's "go nuts")

- Each track has a Claude-authored composition in `assets/compositions.js`:
  timed events (labelled!) placed on MEASURED musical moments — re-run
  `node tmp/relaaax/track-analyze.mjs` for the analysis (BPM, downbeat, sections,
  drops, quiets; JSON in `tmp/relaaax/analysis/`). When a track is added or
  replaced, analyze first, then compose; never place events by guesswork.
- `composition.js` is the DOM-free engine (ramps lerp numerics + hex colors,
  strings/booleans snap, backward seek replays). `music.js` holds the toggle
  (`store.dj`: "claude" default / "free") and the tick-loop merge: composition
  supplies field base + reactivity settings; live modulation rides on top;
  free play/pause restores the tuner's clean base entirely.
- Tuning the sets is conversational — James names a labelled moment ("the 59s
  inversion"), Claude edits that event. After ANY edit to compositions.js or
  composition.js, run `node tmp/relaaax/composition-sim.mjs` (39 assertions:
  ranges, patterns, replay determinism, authored blackout/inversion moments).
- Sets deliberately open with a full field base at t=0 so they play identically
  regardless of slider state — keep that invariant for new sets.
