# Rampage — Claude instructions (working title)

A pretty faithful clone of Bally Midway's Rampage (1986) with the 2026 treatment
of the Retro arcade family (Surround, Moon Battle 2075). The monsters are three
giant fast-food mascots: a clown in red and yellow, a pigtailed girl in a blue
dress, a king with the frozen plastic grin (James, 2026-09-08, "love this idea").

## START HERE

- `plan.md` — THE PLAN, agreed in shape 2026-09-08 ("we're going to build it").
  Read it first. Its "His calls" list (six items: flavour dial, score across
  lives, companions, Suno, Meshy spend, the name) is UNANSWERED — James said he
  won't answer yet. Build on the plan's stated defaults; each call stays a
  dial or a swap, never a rebuild.
- Nothing is built. The folder is a scaffold: world.json (draft), this file,
  changelog, plan, a holding index.html. No Meshy credits spent (state the
  cost and get his confirmation before any call; the plan estimates ~540 cr).
- Architecture follows the siblings exactly — read `../surround/CLAUDE.md` and
  `../lunar-lander/CLAUDE.md` for the pure-core + sim + look-dev + smoke
  pattern before writing code. The rigged-model pipeline is Jabberwocky's
  (`../jabberwocky/CLAUDE.md`, tmp/jabberwocky/ scripts).

## Docs

- `plan.md` — the one-shot plan.
- `changelog.md` — session history, newest first.

## World-specific rules

- THE ONE CONSTRAINT: a flat side-on city of window cells you climb and punch
  down. Everything else is 2026 — no pixel-art imitation, no CRT.
- Mascots come from DESCRIPTIONS, never brand names (Meshy prompts, copy,
  code). Code slugs for the three stay george / lizzie / ralph.
- Nothing ships bare: Meshy tiles + wear on every surface from day one.
- Camera restraint: fixed side camera, long-eased track, one low thud on a
  collapse, no shake otherwise.
- Draft, unwired: not in the drift registry, no exits until ship. Do not run
  `npm run registry` for this world before ship.
