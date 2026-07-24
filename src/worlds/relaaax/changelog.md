# Changelog — Relaaax

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

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
