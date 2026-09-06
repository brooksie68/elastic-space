# Changelog — Jabberwocky

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-09-06 (James flying the gore pass) — Claude (Fable 5.1) — map flip, eased mouse look

- Corner map: the maze's forward axis drew downward — flipped with a canvas transform so ahead is up (his
  "the map has the up down backwards").
- Configuration was unreachable in play: the pause card (z 20) sat over the configuration button (z 12), so
  after Esc the click never landed. Button and panel now float above the card; `C` opens/closes the panel
  from the keyboard (pauses + frees the mouse); the keys line says so. Esc always frees the pointer.
- Mouse look ("herky jerky... too fast and goofy"): mouse motion now goes into `lookBank` and each frame
  spends `1 - e^(-dt·14)` of it (about 70 ms to settle) for both turn and pitch, instead of applying every
  mousemove raw. Default sensitivity 1 → 0.75 (his saved panel value still wins — the Mouse look slider).

## 2026-09-06 (late night) — Claude (Fable 5.1) — THE GORE PASS, BUILT ("do as much as possible without me")

James's go on the review, in his words: do as much as possible without him. Built, captured, not yet seen by him:
- **A · the deaths** (render3d.js `outcomeFx` + the gore kit): `gibBurst` = 20 pieces (boss 30), ribs + skull
  guaranteed, three intestine ropes, `mist`, four `wallSplats`, a `pool` decal that spreads, gibs capped at 80
  (`spawnGib` retires the oldest settled). Squash = pink-tinted rug at 2.3× / 0.16 that STAYS; `view.minY`
  lifts hip-origin rigs so the pancake sits on the floor. Freeze = translucent ice `block` growing to full,
  then 22 shards + 6 blue gibs + frost puff. Fling = `castRay` to the first wall, arc there in 0.55 s, `splatAt`
  the wall, slide down, flatten. Vapor = skeleton flash (emissive 1.4) → top-down dissolve → `ash`. Chew =
  a gib knocked off every other bite, body shrinks, skull + ribs remain. Inflate pops into the full burst.
  `R.strike(x,y)` = a blood puff on every kill (world.js + lab wire it on 'kill').
- **The explosion kit** `boomFx` (three additive fireball layers, ten-sprite smoke ring, point-light flash,
  shake) — gated by `BOOM_GAGS` (rocket, wrongway, meteor, piledriver); every other splash gets `impactFx`
  + a puff in `SPLASH_COLOR`. `R.boom(x,y,r,gagId)` on 'boom' events; `R.impact` on 'impact'.
- **C · nothing at the lens**: melee sprites are 0.55 and lunge from 0.7 cells to the reach and back
  (no more screen-filling cards); stream sprites 0.22 and fade inside 0.9 cells of the player.
- **B · THE PROPS** — `PROPS` table (keyed by sprite name) + `assets/models/props/<name>.glb`: 28 Meshy
  props (`tmp/jabberwocky/props.mjs`, meshy-5 preview 5 cr + refine 10 cr, prompts inside, manifest
  `props-manifest.json`; Meshy's queue cap refused three on the first pass — a rerun picks up whatever is not
  on disk; **537 credits** all told, balance 3683 → 3146) + four primitives (`primProp`: cannonball, bowling
  ball with holes, baseball with a seam, knife). `fitProp` sizes each to its metres and centres it;
  `litProp` gives them emissive so they read in torchlight; `syncPropShot` spins / rolls / tumbles / walks /
  flies by `motion`; `restProp` settles the ones that `stays` where they stop, and the scar decal is skipped
  when the prop itself is the scar. Drop and flash zones (anvil, piano, sneaker, vending, sink, mousetrap,
  karaoke) use their prop and keep it. Slimmed with `slim_models.py` on the props dir (safe there: the
  dir name matches the root so nothing is treated as a clip) → 8 MB for all 28.
- **E · drops**: a shadow disc grows under the falling thing, `impactFx` dust ring + shake on landing;
  tornado = seven spinning torus rings under the sprite; flash-mode areas 1.3 cells.
- **F · sound**: five ElevenLabs one-shots via sfx-batch.mjs — crunch (after gib/inflate), boing (fling),
  wallsplat (fling lands), icecrack (freeze), vapor; OUT_FILES remapped.
- Bugs found on the way: gibs were picked by load order not name (`models.gibByName`); a stale
  `obj.visible` hid any prop born within half a cell of the muzzle (cannonball, train vanished);
  `debugGoon(id)` added to the renderer API for the lab.
- Captures: `tmp/snapshots/v2-* v3-* v8-* v9-*` (after strips), review page rebuilt with AFTER strips and
  after-scores (average 2.29 → 2.72 by my eye, 40 gags re-shot). Sim 116,893 green, draw-check green.
NOT DONE: a real strike animation per summon (the core already lands them in 0.6 s — the review's "summons
don't land" was the slow expire/chew deaths reading as nothing), viewmodel-scene melee props, vines that
wrap, the jack that springs, the anvil is dark on a dark floor. AWAITING JAMES'S FLIGHT.

## 2026-09-06 (night) — Claude (Fable 5.1) — THE RIFLE REVIEW (nothing built)

James: go through the whole catalog, review every gag for how well it shows the thing, rank them 1–5 with a
picture each and a plan; emphasis on PG-13 cartoon gore, bones and rib cages flying. Done as a headless play:
`tmp/jabberwocky/lab3d.html?level=5&manual=1` (new `manual` flag — no animation loop, a script drives
`LAB.step` + `LAB.R.update`; `LAB.loaded` / `LAB.input` exposed) fired all 100 gags at three creatures three
cells out and saved a four-frame strip per gag (0.45 / 0.9 / 1.7 / 3.2 s) through /api/dev-snapshot →
`tmp/snapshots/gag-<id>.jpg`, plus fifteen outcome close-ups `out-<outcome>-<gag>.jpg`. Renderer gained
`setSkipRender(v)` so a capture can step 190 frames and draw four (the hidden pane renders slowly).
Review kit in `tmp/jabberwocky/review/` (KEEP): `catalog.py` (every gag in plain words), `verdicts.py`
(score + plan), `review.py` → `rifle-review.html` (published as an artifact), `review_sheets.py` (contact
sheets). Verdict: average 2.29 / 5 — 11 ones, 50 twos, 38 threes, one four (lightning), no fives. The six
fixes, in build order: A the deaths (gib ×3 with rib cage + skull guaranteed, visible pancake that stays, ice
block, fling to the wall, skeleton flash, chew to a skeleton, one explosion kit — no credits), B ~30 real
props instead of stickers (Meshy ~350 cr + Blender primitives), C nothing spawns at the lens (melee as
viewmodel props, streams 1.2 cells out), D summons that land, E drops/areas read, F ~15 gore one-shots.
BUG FOUND AND FIXED on the way: smother/glue blobs (`view.blob`) were never removed on level clear, so
green domes leaked into the next maze; clearEntities + goon retirement now drop them.
AWAITING JAMES'S READ of the page and his go on which fixes (A is free).

## 2026-09-06 (later still) — Claude (Fable 5.1) — the corner map actually maps

James: "the Map doesn't work." Measured in the pane (`?silent=1&nolock=1`): it drew, but the reveal was a
fixed five-by-five block around the player on a 150 px canvas — 6,400 of 90,000 pixels lit, a pink smudge.
Now: every open cell within seven of you that you have line of sight to (core `lineOfSight`) is revealed
with its ring of walls, so corridors and rooms draw as you look down them and the map accumulates into the
real maze; canvas 440 px drawn at 220 px; pies show as red dots once seen (key yellow, door red/green, drift
doors blue as before). M still toggles it; the PLAY panel's Corner map seg unchanged.

## 2026-09-06 (later) — Claude (Fable 5.1) — MEAT PIES (health pickups)

James: "could use some health boost pickups." Each maze now deals MEAT PIES OF DUBIOUS ORIGIN — one per four
goons on the level's deal (2/3/4/5 through the mazes, 2 in the arena), placed on open cells at least six
steps from the spawn, never on the key, spread farthest-apart like the drift doors. A pie is a code-drawn
sprite (crust, wobbling red filling breathing through the vent, two flies, red glow) bobbing at knee height
in the 3-D scene. Walk over one when hurt: +35, capped at 100, a three-bite chew + a little rising chord, and
the hint "A MEAT PIE OF DUBIOUS ORIGIN · +35 · DO NOT ASK WHAT KIND". At full health you walk past it and it
stays for later. Retry re-bakes them. Core opts `healMul` / `healHp` exist (defaults 1 / 35), not dialed in
the panel — ship defaults first. Sim TEST 11 (placement, heal, no overfill, retry); draw-check runs the pie.
116,893 assertions green. Cache tags bumped.

## 2026-09-06 — Claude (Fable 5.1) — vertical mouse look

James: "it's too hard to kill the rat cause I can't aim down." The camera had a `view.pitch` slot but nothing
ever set it — mouse Y was ignored, so the ratling (1.1 tall, 0.22 wide, under the reticle) was a floor-level
blur you could not put the cross on. Now mouse Y pitches the camera (same sensitivity as the turn, clamped
to about ±45°, mouse down = look down); pitch resets to level on every new game / retry / next maze. Hits are
still decided on the maze floor plane by the core (pitch never changes what a shot hits — a rat on the line
was always dying; you just could not see it), so no sim change. Cache tag bumped.

## 2026-09-05 (later, same night) — Claude (Fable 5.1) — THE DUNGEON REBUILD

James flew the one-shot. Verdict: the creativity and the maze were "pretty close to what I expected,"
but three dramatic changes: too clown-like ("I was hoping it would be more like actual Doom or some
type of dungeon-crawling, dark and humorous, rated PG-13 with gore and violence, but cartoony"); the
motion made him sick ("too jerky and all over the place"); the resolution read as 640×480. He wanted
the plan discussed first. Plan agreed (his answers: motion hits when turning; loved the plan; Meshy for
the creatures; "go nuts w Meshy"; gore very welcome — "all sorts of body parts and giblets and
intestines… though rare"; more space in halls and rooms, "the tightness was contributing greatly";
"take your time to really upgrade this… use eleven labs if you need sounds"; a Suno track coming).

What changed:

- **Renderer replaced.** The 2D column raycaster (`render.js`, gone) caused the turning sickness: edge
  crawl at 60% resolution. `render3d.js` is three.js: real geometry per cell, Meshy tiles on walls,
  floor and ceiling, torch light baked into vertex colours + four live flickering torches, the rifle's
  rune light, fog, native resolution. Head bob defaults to 0, shake to 0.25.
- **Space.** Cells render at 2.6 m, corridors 3.2 m tall; the core now carves 2–5 ROOMS per maze (3×3 to
  5×5 cells) with 5.4 m ceilings and step faces where heights meet; mazes grew 15→27 wide; walk speed
  retuned in metres.
- **Clowns out, dungeon in.** Themes: THE GATE (stone, moss, iron), THE CATACOMBS (brick, skulls,
  niches), THE MEAT LOCKER (bloody tile, corrugated rust, hooks, drain), THE DEEP (basalt, obsidian
  veins, runes, chains), THE MIDDLE (volcanic rock, bone inlay, lava, cage bars). 31 seamless tiles from
  Meshy text-to-image (nano-banana-2), plus the iron-banded door and the three odd doors (spiral, eye,
  chalk drawing) as images.
- **Creatures as rigged 3D models.** Concepts (nano-banana-pro) → image-to-3D (meshy-7, remeshed 30k)
  → rig (walk/run free) → custom clips (attack, die, hit, dance; cultist throw; ghoul monster-walk).
  Ghoul, brute (cleaver), ratling, cultist (throws flaming skulls now, not pies), stalker (lantern
  head). The Jabberwock refused the rigger twice (Meshy pose estimation is humanoid-only), so he is a
  posed statue holding his own rifle, moved procedurally (hover, lean in on the windup, rear on a hit).
  Fifteen outcomes done on the mesh: squash scales, freeze tints then shatters into ice, glue sinks,
  gas tints and topples, fling spins, drop sinks, burn chars with fire and embers, chew leaves skull and
  ribs, gib hides the body and throws Meshy GIBLETS (intestines, arm, leg, skull, ribs) with bounce
  physics, blood particles, floor drips and wall splats; expire plays the die clip, pacify the dance
  clip with roses. Boss death bursts twice.
- **The rifle is a real viewmodel** (Meshy rifle + gauntlets), recoil, rune window on the chamber,
  muzzle flash lighting the walls. Rifle placement is four dials in LOOK.
- **Sound.** The calliope is gone for good; the bed is a drone with drips, chains and a far moan. 42
  ElevenLabs one-shots (`assets/audio/sfx/`) sit in front of the synthesis recipes (creature notices per
  species, gunshot, explosion, gib, chomp, hurt, death, train horn, moo, honk, yowl, sneeze, zap…); a
  missing file falls back to the recipe. `assets/audio/theme.mp3` loops under everything on its own
  volume channel when James drops his Suno track in.
- **Pipeline.** `tmp/jabberwocky/meshy.mjs` polls/downloads in bulk against the API; headless Blender
  scripts render every model to a sheet and slim the GLBs (232 MB → 16 MB: armature-only clips, 1K
  textures). `tmp/jabberwocky/lab3d.html` replaces the 2D lab. Spend: ~700 Meshy credits.
- **Verified:** the sim (116,837 assertions green, rooms included), the lab at levels 1/3/5, every
  creature through attack / die / dance in the line-up, gags and gibs in the arena, the world page's
  title → BEGIN → level card → pause flow under `?silent=1&nolock=1`. Culling bug found and fixed (north
  and south faces were wound backwards; level materials are double-sided now).

Late fixes the same night: James's first load of the rebuild was a black screen with the HUD — the
draw.js trim had dropped the `S` constant the scars use, so the art module never loaded and the page
died before the title card (`node --check` can't see that; `tmp/jabberwocky/draw-check.mjs` now loads
draw.js under a stub canvas and runs every drawer). His Suno track is in as `assets/audio/theme.mp3`,
default music level 0.22 on his "keep it rather low." He loaded it again: "works now," then went
testing; "really good work tonight," stopping point.

Where things stand: draft, `unwired`. James has loaded the rebuild and started testing; his notes on
the motion, the look, the hands, the gore and the odds are next. Then ship. Open ideas, not built:
his own hands wrapped properly around the grip (the gauntlet pair sits as one piece), a rigged Jabberwock
if Meshy ever takes one, wall decals for every scar, more giblet variety.

## 2026-09-05 — Claude (Fable 5.1) — BUILT AS A ONE-SHOT

James's draft "Battle Level w the Jabberwocky Rifle" (Doom-like, one weapon, every shot something
different, "dark, violent, funny, ridiculous, insane clown posse vibe"). His answers to the three
questions: a handful of short mazes; the boss uses a Jabberwocky rifle too; scars stay until you move
on. His go on the thirteen-line outline, with "use the ones I suggested and use your imagination for
the rest. surprise me. be silly. be gross. be violent. be funny. be ridiculous." Name: Jabberwocky.

What existed at the end of the first build (the 2D raycaster version, superseded the same night):

- **The table** (`gags.js`): 100 gags — 65 dispatch, 15 weird, 11 dud, 9 backfire. All twenty-five
  of his plus seventy-five more. Thirteen kinds of delivery, fifteen outcomes, fifty scars. Every gag
  has a name for the plate and a dry line.
- **The core** (`core.js`, pure): recursive-backtracker mazes, key at the farthest dead end, door on the
  far boundary, three drift doors off the critical path; five goon types with notice/chase/swing AI on
  BFS paths; the roll with tier odds and an eight-deep no-repeat; the beat before the gag; every
  projectile kind; scars with hazards; the train that breaks walls; the boss with his own table.
- **The art** (`draw.js`): everything drawn in code — gag sprites, clown goons with death animations,
  scars, wall textures, the gloved hands and the rifle. (The clowns, textures and hands were retired in
  the rebuild; the gag sprites, scars and key remain.)
- **The raycaster** (`render.js`, retired): textured column casting at 60% resolution.
- **Sound** (`sound.js`): all synthesis, a calliope waltz (retired).
- **The host** (`world.js` + `index.html`): pointer-lock FPS input, the plate, HUD, corner map, cards,
  configuration panel with a force-one-gag picker, file-backed presets, three drift doors per level.
- **Verification:** `tmp/jabberwocky/sim.mjs`, ten tests, 96,891 assertions green; the 2D lab's sheet.

James's flight verdict is at the top of the next entry.
