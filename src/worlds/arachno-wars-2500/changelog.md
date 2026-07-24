# Arachno-Wars 2500 — changelog

## 2026-07-24 — Claude (with James) — graybox b1: the fork and the movement prototype

- World created as the spider-vision side-scroller, forked from Arachno-Wars 2000 (which
  stays intact as the archived artillery duel). Direction agreed in chat: real-time,
  left-to-right through hostile territory, boss per level, tricks earned as you go, tech
  tree (weapons/shields/movement/specials), health = checkpoints AND armor, enemy
  pressure style left open. James: "make it so."
- Built the agreed step one — a graybox movement prototype, no enemies, no art:
  - `physics.js`: pure movement module. Polygon terrain, cling-to-any-perimeter walking
    (walls, ceilings, undersides), corner crossing, ballistic flight with sweep collision,
    fuel-metered rocket, web cast + straight reel, kill-plane respawn to last safe floor.
  - `level-graybox.js`: one gauntlet level — rolling ground, ledge staircase, floating
    C-pocket, chasm with grippable walls + web-anchor rock, cave with wavy ceiling for
    web pulls, step ledges, a G-shaped curlicue entered from below, goal pad.
  - `game.js`: renderer + input + 4 whip-legs (2-bone IK, slow-reach-then-SNAP steps,
    landing catch-steps), dead-zone camera (never rotates — motion-sickness rule), fuel
    bar, falls counter, world-space signage, debug overlay (backquote), build stamp.
- Verified by simulation before any browser look: `tmp/arachno-wars-2500/movement-sim.mjs`,
  27 assertions on the real physics module — all pass. Two sim-side fixes during
  bring-up (stair test needed diagonal input like a real player; chasm test had spawned
  inside rock).
- James's first look, same night: "I see what you're going for here, and I think it's a
  successful test. A long way to go yet, though." More tomorrow.
- Status: draft — no drift/registry/sound wiring yet.
  Feel questions listed in CLAUDE.md (wall-stall vs auto-climb, cliff-edge cling, web
  swing). Next after feel pass: tuner panel, then the first pillbox.
