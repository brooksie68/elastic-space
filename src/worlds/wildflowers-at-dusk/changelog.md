# Changelog — Wildflowers at Dusk

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-11 — claude-fable (wrap-up session)

- **Sunface assets deleted for good**: James — "remove all sunface files completely. they will NOT
  be used." Both `assets/sunface/` (world) and `assets/wildflowers-dusk-sunface/` (repo root) are
  gone; the entry below saying assets were kept for reuse is now historical.

## 2026-07-11 — claude-fable (with James, live-tuning session)

- **Clouds**: 4 → 7 layers; recycled clouds respawn with their leading edge at the left viewport edge
  (was up to a sprite-width further out, causing minutes of empty sky); fade-in 3× faster; cloud band
  raised — sprite height capped at 42% viewport, bottoms held above 52% so clouds clear the middle-ground
  ridge; drift slowed to 5–17 px/s (was 8–28).
- **Clouds moved behind the mountains**: new second canvas `#cloud-field` (z-index 0, before
  `.landscape-layers` in DOM) carries sky glow + clouds; main `#sky-field` canvas keeps rain, trees, field.
  `context` is now a swappable `let` with `screenContext`/`cloudScreenContext` per-pass in `animate()`.
- **Performance pass** (page was freezing after back-flower rows landed):
  - Cloud sprites baked once per layer into offscreen canvases at half res with blur/saturate applied at
    bake time (`bakeCloudLayer`); per-frame is plain `drawImage` + `globalAlpha`. Respawns re-bake
    (`baked: null` in the spawn object).
  - Pine branches + cedar (~620 ellipses/frame) pre-rendered to `treeLayer` on resize; per-frame single
    `drawImage` with ±1.6px drift.
  - Back flower rows pre-rendered to 3 offscreen canvases; composited with one filtered `drawImage` each
    (never set `context.filter` around per-petal draws — that was the freeze).
  - Flower depth-sort cached at init (`flowersByDepth`).
  - Remaining known perf backlog (proposed, not done): throttle/pre-render field vegetation, cap DPR,
    remove dead code (`drawLandscape`/`drawHillLayer`/`drawDistantFauna`/`createCloudSprite`, unused
    `streamers` array).
- **Vegetation colors**: low bushes/grasses first matched to sampled near-ridge plate colors (teal-leaning),
  then replaced by James's explicit 7-color ground palette — `113422, 103031, 1D2341, 22566C, 283B38,
  153437, 164145` — assigned randomly per plant (`groundPalette`/`pickGround`) across grasses, ferns,
  shrubs, mounds, vines. Sampling tool lives at scratchpad only (zero-dep PNG decoder).
- **Mounds** reworked from flat-bottomed half-ellipse domes ("wide mushrooms") into irregular multi-lobe
  leaf clumps with grass-blade fans.
- **Back flower rows**: 3 receding rows (66 flowers) behind the main line — smaller, darker, blurrier
  with depth (offsets 16/36/56px, scale 0.68/0.52/0.40, brightness 78/64/50%, blur 0.6/1.2/1.9px).
- **Flower accents**: ~32% of flowers (main + back rows) override petal color with random pick from
  `FE8C6E / 7D4E9A / 3287C7` (`pickAccent`, `flower.colorOverride`; centers keep variety color).
- **Rain**: 120 → 230 drops (two "+50%"-ish requests).
- **Grasses**: 150 → 200 tufts.
- **Mountain plate blur**: 5.5px → 4.6px (CSS, `world.css`).
- **Sunface built then removed**: 4-expression morphing sun (assets remain in `assets/sunface/` and repo
  `assets/wildflowers-dusk-sunface/`) was added with timed appear/fade cycles, then James cut it from the
  page entirely. Code is fully gone; assets kept for possible reuse.
- Where things stand: James is happy with clouds and rain; vegetation palette freshly applied and
  worth a look with fresh eyes. Perf backlog above is the agreed next step if it still stutters.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history, `world.json`, and `docs/`.
- Where things stand: live and featured, with a large **uncommitted painted-landscape session** pending in
  the working tree (authored in a prior James + agent session):
  - Four painted landscape plates added as DOM images under the Canvas: `mountains.png`, `far-hills.png`,
    `middle-hills.png`, `near-ridge.png` in `assets/landscape/`, stacked with z-index and depth-specific blur.
  - `world.js` expanded by ~695 lines (cloud sprite drift, cedar framing, foreground vegetation work).
  - `world.css` layer stacking/blur changes; new `assets/clouds/`; new `cloudscape.svg`.
  - `*-source.png` files keep the chroma-green generation output; runtime loads only the alpha-ready
    files without the `-source` suffix.
  - Parallel doc updates pending in the same working tree: `CLAUDE.md`, `README.md`,
    `docs/architecture.md`, `session handoff.md`.

## 2026-07-04 — launch (commit 97499fe, "Launch Elastic Space")

- World shipped live. A rainstorm runs in reverse over a dusk field; Whitman rises through the weather.
- Canvas renderer: reverse rain, drifting cloud sprites, cedar framing, foreground vegetation.
- Whitman recitation via speech synthesis, begun only after the visitor opens the audio gate;
  soundtrack listed as reverse rain, speech synthesis, glass bells.
- Exits: flower portals (`.flower-portals` nav) using shared random drift.

## Standing guidance

1. Desktop-first; no mobile-specific compromises unless explicitly requested.
2. Layer order: sky, rain, clouds, painted terrain, cedar/foreground vegetation. Rain renders behind clouds.
3. Landscape plates stay opaque and separately stacked; never replace them with translucent procedural polygons.
