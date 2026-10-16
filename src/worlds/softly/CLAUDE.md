# Softly — Claude instructions

Nothing but overlapping full-screen gradients, fading in and out (James's quickie, 2026-10-16).

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- Every wash is a linear gradient with ONE or TWO stops only: color → color, or color → transparent. Never more stops.
- Random color, random angle, at most 5 on screen at once; a wandering tempo speeds and slows everything (constants at the top of world.js).
- Sound: `sound.js`, one soft chord (root, fifth, ninth — C2 G2 D4) with delay + generated reverb, Web Audio synthesis through the shared sound control. Three drift exits: invisible soft round blurs in the top-left, bottom-left and bottom-right corners (top right is the controls); they glow faintly on hover. In the drift registry since 2026-10-16 (world.json live).
