# Changelog — Relaaax

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

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
