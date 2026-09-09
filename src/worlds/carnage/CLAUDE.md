# Carnage — Claude instructions

Bally Midway's Rampage (1986) with the rules kept where they are the game and everything else 2026:
a real three.js city seen from the side, buildings you climb and punch down cell by cell, three giant
fast-food mascots (a clown, a pigtailed girl, a plastic-grinned king — from descriptions, never a brand),
the things behind the windows dealt from a table that gets meaner by the day, the National Guard, a SWAT
truck, a drone, and one cynical line at a time on the plate. Named CARNAGE by James 2026-09-08 (the working
title was Rampage). **BUILT 2026-09-08 as a one-shot on his brief** (plan.md, "THE BRIEF" at the top):
free mode first, the campaign is his to write, a Damage Lab with the notes loop, PG-13 cynical and funny.
Draft, "unwired": not in the drift registry until he has flown it and said ship.

## START HERE

- `changelog.md` top entry — what was built, what he has not seen, the open list.
- The notes loop is his channel for verb work: `node tmp/carnage/notes.mjs watch` under the Monitor tool at
  the start of any Carnage session (a note in the Damage Lab wakes the session). THE RULE (from the Jabberwocky
  weapon lab): act on a note without asking; when a verb changes, `notes.mjs update <verb> "what changed"`
  (green dot + toast in the lab), then `done <id> "reply"`. Run `tmp/carnage/sim.mjs` before marking anything
  done. Bump `?v=` on the changed file in index.html / lab.html.
- Meshy: 522 credits spent on this build (his cap was 550; balance 3,146 → 2,624). Anything new costs
  credits: state the cost first.

## Files

- `city.js` — pure: the 57-city road trip (Peoria first, Plano's wellness day last, then it loops), the six
  building families, the deal table (`DEALS`, weights by day), `makeCity(rng, day, opts)`.
- `game-core.js` — ALL rules, pure (no DOM, timers, Math.random). `createGame(opts)`, `step(state, input, dt)`,
  `autopilot(state, m)` (the companions, the attract demo and the sim all use it), `summary`, and the
  building blocks the lab uses (`breakCell`, `startCollapse`, `damage`, `spawnItem`…). Exposes
  `globalThis.CarnageCore`. Shared verbatim with the sim — keep it pure or the sim lies.
- `render3d.js` — the picture, nothing else: the facade shader (per-cell windows with parallax rooms,
  curtains, blinds, air conditioners; cracks; punched holes with rims, teeth, rebar and hanging blinds; neon
  from the sign atlas; storefronts with awnings), buildings as boxes with rooftop kit, the collapse (squash +
  debris + dust + shards + one low thud), the street with lamps, planters and the real cars parked, two far
  rows, the sky dome, day and night, the monsters / teenager / soldiers as rigged Meshy models with clips,
  the statics, the things in the windows as canvas icons, the post chain (the composite tone-maps and
  encodes — render targets are linear), `portrait(slug)` for the HUD.
- `icons.js` — the 2D art: 23 window icons, the neon atlas (8 signs), the blimp banners, the brand marks.
- `sound.js` — file-backed one-shots (`assets/audio/sfx/`, 54 ElevenLabs files incl. the voices: the clown
  laughs, the girl speaks as Lily, the king creaks) with a synthesis recipe behind every id; beds (traffic,
  rotor, siren, dust, neon hum at night). No music unless `assets/audio/theme.mp3` appears (0.22).
- `game.js` (module) + `index.html` — the shell: loading gate, attract demo, start card (monster · company ·
  FREE MODE | CAMPAIGN · SOON), HUD (portraits from the models, health, lives, score, day, city, the news
  ticker), the plate, floats, the day tally and THE MAP between days (a hand-authored US outline, the route
  drawn), configuration panel (PLAY + LOOK, presets via `PUT /api/worlds/carnage/presets`), the ways out.
- `verbs.js` + `lab.html` + `lab.js` — THE DAMAGE LAB (admin panel → Labs): 53 verbs with plain facts and
  STAGE IT, the game's keys, a dummy or wrecker rival, the army only when staged, ranks / verdicts / notes.
- `notes.json` — the paper trail (`/api/worlds/carnage/notes`, the generic route).
- `assets/models/` — george / lizzie / ralph / teen / soldier (`base.glb` + armature-only clips), the five
  statics (swat, drone, cruiser, taxi, bot). `assets/textures/` — the ten tiles. `assets/audio/sfx/`.
- tmp/carnage/ (KEEP): `sim.mjs` (22 tests, 1.9 M assertions), `lookdev.html` (silent, autopilot, every look
  dial, BREAK / COLLAPSE / BOOM / FLASH / SOLDIER / TANK / DRONE / CAR / REVERT / NIGHT / NEXT CITY,
  `?snap=name` captures through /api/dev-snapshot, `LAB` globals), `make-smoke.mjs` → `smoke.html`
  (`SMOKE.pump`), `meshy.mjs` + the manifests, `slim_models.py`, `render_models.py`, `sfx-batch.mjs`,
  `notes.mjs`, the concept images and raw downloads in `meshy/` and `models/`.

## World-specific rules

- THE ONE CONSTRAINT: a flat side-on city of window cells you climb and punch down. Everything else is 2026.
  No pixel-art imitation, no CRT.
- Mascots come from DESCRIPTIONS, never brand names (Meshy prompts, copy, code). Slugs stay george /
  lizzie / ralph; the display names (THE CLOWN / THE GIRL / THE KING) are his to change.
- The register is cynical, funny, PG-13. One line at a time on the plate (`COPY` in game.js); the ticker
  rotates headlines. Never cute.
- NOTHING IS SAVED between visits (James): no high score. Dials persist like every sibling's; presets are
  tuning, file-backed.
- Camera restraint: a fixed side camera, a long-eased follow, one low thud on a collapse, nothing else.
- The rules are the cabinet's where they are the game: a window in one punch, a wall in two, a building
  down past 55–65% broken (bigger needs more), two floors of fall are free, the revert at zero. Points:
  window 25 · wall 50 · neon 1000 · person 500 · waver up to 1000 · food 100 · cash 500 · crypto 2500 ·
  soldier 50 · SWAT 200 · drone 750 · cruiser 150 · taxi 100 · bot 50 · building 1000 + 100/floor · a
  rival restaurant +2500 · yours 0 · the teenager 1000 · day 500 × day · a life every 25,000.
- Meshy rigs keep the geometry at a hundredth under the armature with the bones in centimetres: FIT BY THE
  SKINNED VERTICES (`Box3.setFromObject(model, true)`), never the raw geometry. Clips from Meshy's animation
  library target the same skeleton (armature-only GLBs, slimmed by `slim_models.py`).
- The post chain owns tone mapping and sRGB (the composite shader); the renderer's own tone mapping is off.
  Anything drawn straight to the canvas will look dark — do not.
- Every actor's material keeps Meshy's atlas as its emissive map at a low intensity so the monsters read at
  night; the hurt flash is the red channel of that emissive.
- `look.night` −1 lets the city decide (alternating by day, some cities forced); the LOOK tab can force it.
- Draft, unwired: not in the drift registry, no `npm run registry` for this world before ship.

## Status

BUILT 2026-09-08, unjudged — James has not flown it. His eyes decide: the feel of the keys, the pace of the
army, the look of the rooms and the holes, the copy. The campaign is unwritten (the start card says SOON).
