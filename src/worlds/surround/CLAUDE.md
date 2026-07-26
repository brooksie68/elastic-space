# Surround — Claude instructions

Player-vs-computer recreation of Atari's Surround (1977) with a slick 2026 neon
treatment: glowing trails on a glass-dark arena, glass HUD, synthesized sound.
James's direct ask 2026-07-25 ("make it slick and modern looking").

## Docs

- `changelog.md` — session history, newest first.

## Files

- `game-core.js` — ALL game logic (grid, movement, collisions, the three AI
  levels), pure module: no DOM, no timers, no Math.random. Shared verbatim with
  the sim; keep it pure or the sim lies.
- `game.js` — rendering, input, sound synthesis, match flow, tuner. No game
  rules in here.
- Sim: `node tmp/surround/sim.mjs` — 7000+ assertions on the real core
  (collisions, AI never reverses / takes the only exit / avoids pockets,
  seeded full-game strength ordering, fuzz invariants). RUN IT after touching
  game-core.js.

## World-specific rules

- Draft status: no drift wiring, not in the registry yet. Exits arrive at ship
  time (and remember the registry generator includes drafts — hand-check).
- AI levels are 1 DRIFTER (wobbly wall-avoider), 2 HUNTER (greedy flood-fill
  space), 3 ORACLE (Voronoi territory while contested, wall-hugging
  space-filler once the arena splits — the separated mode is what makes it
  strong; don't remove it). Sim asserts hard > medium > easy; keep that
  ordering when tuning.
- Simultaneous crash = draw, no point (classic Surround behavior).
- Tuner (localStorage `surround-tuner-v1`): speed and glow are live; arena,
  opponent, first-to restart the match by design.
- Crash feedback is flash + particles only — NO screen shake (James gets motion
  sick; camera restraint is a house rule).
- Speed ramps within a round (+3.5%/s, capped +90%); the hum pitch tracks it.

## Not built yet

Feel pass with James (speed curve, glow defaults, AI default level) → possible
extras (wrap-around walls variant, two-player local, round intro variants) →
ship wiring (drift exits, registry, completed-worlds move).
