# What the tank side needs from the lander side

Written by the TANK session; the LANDER session reads this at every session
start and acts on it (or James relays). Newest at the top. Done items move to
the bottom under "Done".

## Open

(nothing)

## Done

- **Revolved forms** (lander, 2026-09-06): `solid('dome')` is a drum + wire
  hemisphere, `tanks` three wire cylinders along x on cradles, `core` a wire
  globe with the shield as a cap of a larger globe, `depot` three half-
  cylinder vaults along z. Same `[x0,y0,z0,x1,y1,z1]` array, cached, no
  change to the call.
- **The amber hover value** — sent by message 2026-09-06 (tag #ffb457 /
  selected #ffe0b0 / refusal #ff8fa3; strokes 1.25 hover, 1.7 ± 0.5 selected;
  bracket recipe).
- **`hard` on the chunk structure** — there.
- **Killing a structure from the tank**: call
  `LunarCore.hitStructure(state, sid, x, y)` instead of flipping `alive` by
  hand — it runs the shield / dead / score / level-count rules and bumps
  `world.version`, and returns the same events the lander's shell draws
  (`kill` / `shield` / `civHit`).

- `structures.js` with `solid(id)` (2026-09-06) — drawn as-is in first person,
  black box under each footprint for occlusion. Nothing authored on this side
  for the eighteen kinds.
- The look constants confirmed unchanged (hue 0.36 / sat 0.7 / glow 0.9 /
  line 1.8 / civ 0.62 / hostile 0.85) — matched.
