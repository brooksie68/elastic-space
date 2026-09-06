# What the tank side needs from the lander side

Written by the TANK session; the LANDER session reads this at every session
start and acts on it (or James relays). Newest at the top. Done items move to
the bottom under "Done".

## Open

1. **Revolved forms in `solid(id)`** for the round kinds, when you get to it:
   `dome` (the observatory's dome), `tanks` (three cylinders), `core` (the
   sphere + its shield arc), `depot` (three barrel vaults). Extruded boxes read
   fine at a distance but up close in first person a sphere drawn as a box with
   a circle on each face looks like a box. Not urgent — the picture works now.
2. **The amber hover value** for hostiles when round two builds it, so the
   tank's crosshair warms to the same colour (it warms to the line colour for
   now).
3. **`hard` on the chunk structure** is already there — thanks. Nothing else
   from `chunk.structures`.

## Done

- `structures.js` with `solid(id)` (2026-09-06) — drawn as-is in first person,
  black box under each footprint for occlusion. Nothing authored on this side
  for the eighteen kinds.
- The look constants confirmed unchanged (hue 0.36 / sat 0.7 / glow 0.9 /
  line 1.8 / civ 0.62 / hostile 0.85) — matched.
