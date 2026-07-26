# Changelog — Surround

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-25 — Claude (Fable 5)

- World created on James's direct ask ("make Surround: player vs computer — make it
  slick and modern looking, 2026 appropriate") after a level-of-effort chat about
  early console recreations.
- Built: pure game core (`game-core.js`) + renderer/shell (`game.js`) + page.
  Neon rounded trails with layered glow, interpolated head orbs, particle crash
  bursts (no screen shake), glass HUD with score pips, countdown, banners.
- Three AI levels: DRIFTER (wobble + wall avoidance), HUNTER (greedy flood-fill),
  ORACLE (Voronoi territory + wall-hugging space-fill once separated — the
  separated mode was needed; pure Voronoi lost endgames to the greedy AI 36-44,
  after the fix it sweeps 80-0).
- Sound: Web Audio synthesis through the shared sound control — dual engine hums
  (pitch tracks the speed ramp), turn blips, filtered-noise crash, point chime,
  countdown ticks, win/lose fanfare.
- Tuner panel (Chrome Rift pattern, localStorage `surround-tuner-v1`): speed,
  glow live; arena size / AI level / first-to restart the match.
- Sim: `node tmp/surround/sim.mjs` — 7139 assertions pass.
- Same night: click-away dismissal added to the tuner (James's new all-worlds
  rule — every control panel closes on a `pointerdown` outside it).
- Status: DRAFT, awaiting James's first play. No drift/registry wiring yet.
  Next: feel pass with James, then ship wiring.
