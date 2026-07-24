# Arachno-Wars 2500 — Claude instructions

The spider-vision side-scroller (see `../arachno-wars-2000/spider-vision.md` — this world
IS that game). Forked from Arachno-Wars 2000 on 2026-07-24; AW2000 stays untouched as the
archived artillery duel. Working title — James may rename.

## Agreed direction (James, 2026-07-24)

- Real-time side-scroller, left to right through hostile territory to a boss per level.
- Terrain: chunk-stitched authored sections (feels endless, levels have ends), caves with
  ceilings, cornices/curlicues/ledges for upside-down angles.
- My tank vs the world: pillboxes, robots, planes from above — jerk-reflex blasting with
  moments of precision sniping.
- Tricks: web-pull, tunneling, drone, bomb lob, rock knockover — all eventually available,
  earned as you go.
- Tech tree: weapons / shields / movement / specials.
- Health: BOTH checkpoints-respawn and armor accumulation.
- Enemy pressure style: stay open (bullet-hell vs deadly-sparse undecided).
- Camera: James gets motion sickness — dead-zone follow, slow easing, NO camera rotation
  ever (the tank rotates on surfaces, the world does not), no snap moves. Hard constraint.

## Current state: graybox b1

Movement prototype only — no enemies, no art, no sound, no drift wiring (draft, like
Relaaax was). One gauntlet level exercising every traversal verb.

- `physics.js` — ALL movement logic, pure module (no DOM/canvas/timers). Shared verbatim
  with the sim; keep it pure or the sim lies.
- `level-graybox.js` — polygon level data + helpers. Solid simple polygons; the tank walks
  ANY perimeter (walls, ceilings, undersides).
- `game.js` — rendering, input, whip-leg IK, camera, HUD. No physics decisions in here.
- Sim: `node tmp/arachno-wars-2500/movement-sim.mjs` — 27 assertions on the real physics
  (normals, perimeter walks, jump/land, ceiling attach, web reel, respawn, fuzz). RUN IT
  after touching physics.js or level geometry.

Controls: WASD = walk along surface (input projects onto the surface tangent), SPACE jump,
SHIFT rocket (fuel-metered, refills while attached), E web (casts toward input direction,
straight up if none; reels to anchor), R reset, backquote debug overlay.

## Open feel questions for James's first drive

1. Lateral-only input stalls at the base of a vertical wall (projection is zero — you
   point up a wall to climb it). Keep, or add auto-climb assist at walls?
2. Walking off a cliff edge never detaches — the tank clings around the corner and down
   the face. Intentional (spider fantasy). Too sticky?
3. Web is a straight reel, no swing physics yet.
4. Tuning values (speeds, fuel, whip-step timing) are all in `physics.js` defaults() and
   the leg constants in game.js — tuner panel later, once the verbs feel right.

## Not built yet (in rough order)

Feel pass with James → tuner panel (Chrome Rift pattern) → first enemy (pillbox) + firing
→ chunk system for level assembly → tunneling verb → checkpoints → tech tree → art pass
(port AW2000's black-carbon tank layers + whip-leg language) → sound → ship wiring
(drift exits, registry, sound control).
