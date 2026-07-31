# Combat — Claude instructions

Player-vs-computer recreation of Atari's Combat (1977), tank duel only ("level
one"), with the same slick 2026 neon treatment as Surround (its sibling world —
shared glass HUD/tuner styling and Sfx skeleton). James's direct ask 2026-07-25:
one tank, one computer player, six maze variations to sneak around.

## Docs

- `changelog.md` — session history, newest first.

## Files

- `game-core.js` — ALL game rules (movement, walls, shells, spin, the six
  mazes, LOS, BFS pathfinding, three AI levels), pure module: no DOM, no
  timers, no Math.random. Shared verbatim with the sim; keep it pure or the
  sim lies.
- `game.js` — rendering, input, sound synthesis, match flow, tuner. No game
  rules in here.
- Sim: `node tmp/combat/sim.mjs` — 556k assertions (mostly per-tick fuzz
  invariants): maze connectivity + symmetry, collision/no-penetration, firing
  rules, spin invulnerability, bounce reflection, AI hunts a hidden target in
  all six mazes, ace beats rookie. RUN IT after touching game-core.js.

## World-specific rules

- Draft status: no drift wiring, not in the registry yet. Exits arrive at ship
  time (registry generator includes drafts — hand-check the diff).
- Original-Combat behaviors kept deliberately: forward-only driving (no
  reverse), one live shell per tank, hit tank spins + is invulnerable while
  spinning, timed match (2:16 default — the original's clock), draw allowed.
  DEPARTURE from the original (James, 2026-07-25): after a point, BOTH tanks
  return to their spawn corners — the spin plays out (~1.4s, `resetIn` in
  game.js), then `Core.resetPositions()` reseats tanks, clears shells + AI
  state. Don't revert to continue-in-place.
- AI levels: 1 ROOKIE (sloppy aim, real trigger lag), 2 VETERAN, 3 ACE (leads
  the target, dodges incoming shells, snap-shoots while dodging). Two
  hard-won AI rules: (a) firing LOS uses `hasLOS(..., pad = SHELL_R + 0.5)` —
  unpadded center-line LOS reads clear on corner grazes and the AI stands
  plinking the corner forever; (b) dodge must not mute the guns — the ace
  lost to the rookie until dodging allowed snap shots. Sim asserts the
  strength ordering; keep it when tuning.
- The six mazes in `MAZES` are mirror- or point-symmetric (sim-asserted) so
  neither spawn side is favored. New walls must keep a symmetric twin and
  pass the connectivity assertion.
- Mazes 1 ("the 2600") and 2 ("tank pong") are DECODED FROM THE REAL ROM —
  the Combat (1977) disassembly's playfield bitmaps (PF0_0/PF1_0/PF2_0 and
  PF1_2/PF2_2), 20×12 half-field cells mirrored horizontally and vertically
  by the kernel. Reference copy: `tmp/combat/combat-disassembly.asm` (it also
  holds the clouds field for a future biplanes/jets pass). One 2600 cell =
  6u × 135/23u. Don't "tidy" their geometry — it's the authentic layout.
  `node tmp/combat/plot.mjs [n]` ASCII-plots any maze for a quick eyeball.
- Corridor discipline: the tank is 8.4u across and the AI grid needs a free
  5u-grid cell center (2.5+5k) inside a gap to path through it — keep new
  gaps ≥ 12u and run the sim's connectivity + hunt tests.
- Tuner (localStorage `combat-tuner-v1`): speed, glow, bounce are live;
  arena / opponent / match length restart. Click-away dismissal per house rule.
- Crash feedback is flash + particles only — NO screen shake (motion restraint).
- Keyboard-first: arrows/WASD + space. Touch only restarts a finished match —
  virtual touch controls are NOT built (note for a future pass).

## Not built yet

Feel pass with James (tank/shell speeds, AI default, maze tweaks) → possible
extras (billiard-only scoring variant, invisible-tank variant, two-player
local, touch controls) → ship wiring (drift exits, registry).
