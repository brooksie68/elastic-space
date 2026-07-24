# Relaaax — Claude instructions

The Spastic Space pork.html oscillator field (2002), rebuilt as a tunable, embeddable
renderer. Formerly referred to as the "pork" recreation — James renamed it Relaaax
(2026-07-19).

## Docs

- `changelog.md` — session history, newest first.
- `assets/spastic-space/recreation-notes.md` (repo root assets) — the source spec:
  decoded GIF timing table, framing, era notes. The timing constants in
  `relaaax-field.js` come straight from it.

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

## Next session (James, 2026-07-24)

- **Music reactivity.** James will import 5–6 tracks (likely his Suno MP3s →
  `assets/audio/`, the Chrome Rift pattern); a track player in the page chooses
  the song; the field reacts RHYTHMICALLY to the playing music. "With sliders, of
  course. Many sliders, many, many sliders" — reactivity gets its own tuner
  section, as tunable as everything else. Likely shape: Web Audio AnalyserNode
  driving field params (speed/phase/tile size/blur/etc.), routed through the
  shared sound control per all-world rules. "Maybe some other something more
  later" — probably live audio input; ahead-of-time tracks first. Plan with him
  at session start before building.
