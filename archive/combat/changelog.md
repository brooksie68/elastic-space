# Changelog — Combat

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-25 — Claude (Fable 5) — point resets (same night, James's directive)

- James: "after death, both players start out at the beginning again." New
  `Core.resetPositions()` — after a hit the spin plays out (~1.4s), then both
  tanks return to their spawn corners, shells and AI state cleared, small
  arrival shimmer at each corner. Clock keeps running; no countdown between
  points. Sim: reset assertions added, ace-vs-rookie now resets between points
  like real play (1166-131) — 546,356 assertions pass.

## 2026-07-25 — Claude (Fable 5) — real 2600 mazes (same night, James's feedback)

- James: the first maze was too sparse — "it can't just be a square in the middle
  or a plus sign... there's a little baffle to hide behind, and then there's some
  various little lines and walls." Went to the source: fetched the Combat (1977)
  ROM disassembly and decoded its playfield bitmaps (the kernel mirrors 20×12
  half-field cells both horizontally and vertically).
- Mazes 1 and 2 are now the AUTHENTIC arcade fields: "the 2600" (complex tank
  field — center nubs, four corner baffles, four L-hooks, footed side walls, mid
  dashes) and "tank pong" (simple field — split center wall, footed side walls,
  long mid dashes). Disassembly kept at `tmp/combat/combat-disassembly.asm`.
- The other four densified in the same idiom: crossfire (cross + corner Ls +
  flanking dashes), baffles (four border baffles + broken center line + ticks),
  chambers (+ center dashes), the ring (+ border nubs + corner ticks).
- New `tmp/combat/plot.mjs` ASCII-plots any maze. Sim re-run: 546,350 assertions
  pass (connectivity + symmetry for all six, AI hunts in all six, ace 1593-125).

## 2026-07-25 — Claude (Fable 5)

- World created on James's direct ask after Surround landed: "try to do Combat,
  but just do level one against the computer... one tank and one computer
  player... six different maze variations. Just different things to sneak
  around and move behind."
- Built as Surround's sibling (same glass HUD/countdown/tuner styling, same
  pure-core + sim architecture): tank duel, forward-only driving, one live
  shell each, hit = spin + invulnerable + play continues, 2:16 timed match.
- Six symmetric mazes (the classic / pillars / the cross / baffles / chambers /
  the ring), all sim-asserted connected and mirror/point-symmetric.
- Three AI tiers: ROOKIE / VETERAN / ACE — BFS grid pathfinding when out of
  sight, padded-LOS aiming, ace leads the target and dodges shells. Two bugs
  the sim caught: corner-graze LOS left the AI plinking a wall forever (fixed
  with shell-radius LOS padding), and the dodge reflex muted the ace's guns —
  it lost to the rookie 684-1001 until dodging allowed snap shots (now
  1618-129).
- Bounce-shots tuner toggle (billiard-style wall reflections, live).
- Sound: engine drones with thrust pitch, noise-burst fire/explosions, bounce
  ping, countdown, fanfare — Web Audio through the shared control.
- Sim: `node tmp/combat/sim.mjs` — 556,648 assertions pass.
- Status: DRAFT, awaiting James's first drive. No drift/registry wiring yet.
  Next: feel pass, then ship wiring.
