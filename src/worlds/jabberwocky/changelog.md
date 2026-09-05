# Changelog — Jabberwocky

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

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
