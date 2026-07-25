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
- THE LEGS ARE LIQUID METAL (James, 2026-07-24): diamond-hard when needed, fluid when
  needed. They STRETCH — thigh a little, knee→tip considerably — to reach across gulfs
  several body-lengths wide; the tank can hang from two threads to line up a shot.
  Future verbs this implies (not built): squeezing skinny through small holes/tunnels,
  legs as jab/poke weapons, grabbing + tool use, interfacing with computers/devices/
  vehicles/buildings. Stray legs reaching across gaps is THE POINT — never remove it
  for tidiness.

## Current state: graybox b6

b5–b8 (2026-07-24): longer lower legs (L1=30/L2=52, stances ±24..±80, solveKnee
min-distance clamp). The teardrop (rear legs trailing at speed) took THREE fixes, all
needed: (1) wave cadence speed-scaled (12/|speedAlong| clamped 0.024–0.07) so planted
feet re-step before drifting far; (2) step targets refresh every frame — a frozen
world-space target + the whip's slow-reach phase let the body run away from mid-step
feet; (3) step duration shortens with speed (0.1→0.065s). Lead is now pure forward
bias (speedAlong*0.024 cap ±10). Whip profile shape is untouched and stays that way.

b9 (2026-07-24): foot targets via P.walk perimeter arc-length (sign-corrected for edge
winding), NOT straight-tangent + closestOnTerrain — past a convex corner the old probes
all snapped to the same vertex (rear legs clumped straight, James's screenshot). Feet
wrap around corners now; cross-poly planting only via the b10 liquid-metal gulf reach.

b10–b11 (2026-07-24): liquid-metal legs (stretch past L1+L2, thigh 0.28×/shin 0.8× of
excess, thin by stretch ratio; cross-gap targets allowed to OTHER polygons within 150px
when perimeter stance wraps >45px off the straight ideal). Asymmetric gait, James's
explicit anti-realism call: front legs overreach +26px and pull, rear legs compress 45%
toward the body and force-lift at drift 42 — never let a rear pair stream out back.

b12 (2026-07-24): per-leg length multipliers (`len` in LEG_DEFS: all 1.25×, second pair
1.3125×, outer pair 1.375×; solveKnee takes len), body ride height untouched (squat),
barrel +30% (tip at 42.4). Pair-by-pair length tweaks are one-number changes now.

b2–b3 (2026-07-24): visibility pass — light overcast sky, dark terrain, tank/legs as dark
silhouette; apparent size comes from camera zoom (cam.scale divisor 800). GOTCHA: never
scale leg geometry (LEG_DEFS/L1/L2) for size — b2 tried VIS=1.5 and the whip-leg IK
degenerated (straight legs, fast flicker). Size = camera zoom, period.

b4 (2026-07-24): 8 legs per AW2000 reference art James shared — tight hips, wide tangent
stance (outer legs flat, inner knees high), tapered segments with knee bulb + needle tip,
lower segment longer than upper (L2−L1 must stay under the inner-leg foot distance or the
IK flips). Wave gait: front→back rank pairs step two-at-a-time in a ripple.

PROTECTED (James, b3 feedback): cling/climb/over-and-under traversal, fast stable landing
catch, overall leg speed + fluidity. Don't trade these away while tuning looks.
Feel questions below still unanswered.

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
