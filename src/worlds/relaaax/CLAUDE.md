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
- The field scales all geometry off its container via `--u` ("one 2002 pixel");
  size and aspect ratio of the host box must never matter.
- Rendering is JS rAF driving background colors — NOT CSS keyframe animations. This is
  what makes live tuning phase-continuous (speed changes never snap) and desync a real
  parameter. Don't "simplify" it to CSS animations.
- Timing constants (RAMP = 2.1s, the hold table) are decoded from the original GIFs —
  don't retune them in code; the tuner exists so James tunes by eye, persisted to
  localStorage under `relaaax-tuner`.
- The 1024×768 frame in index.html is TEMPORARY staging, not the design.
- Status: draft/WIP — intentionally NOT in the registry, no drift exits, no admin panel
  link yet. Those land at ship time along with the final setting.
- Open idea (unbuilt): a "steps" option quantizing the ramp to the GIFs' 21 discrete
  levels for the authentic stepped flicker.
