# Jabberwocky — Claude instructions

A first-person dungeon crawler where the only weapon is the Jabberwocky rifle, and every pull of the
trigger fires something different. One hundred gags across four tiers. Four mazes, then the Jabberwock
in the middle with a rifle exactly like yours. Built 2026-09-05 as a one-shot on James's go, then
REBUILT THE SAME NIGHT on his verdict (too clown-like, motion sickness, too low-res): three.js dungeon,
Meshy creatures, PG-13 cartoon gore.

## Docs

- `changelog.md` — session history, newest first. Read the top entry first.
- `gags.js` — THE TABLE. Read its header: tiers, kinds, outcomes, scars. Adding a gag is one line here
  plus a drawer in `draw.js` (`PROJ`) and a sound in `sound.js` (recipe in `R`, or a file in `FILES`).
- `tmp/jabberwocky/lab3d.html` (KEEP) — the silent 3D lab, served on 4174. `?level=N`, `?gag=<id>` fires
  one on load, `?sheet=1` lines the six creatures up and walks them through attack / die / dance,
  AUTO ALL fires the whole table in turn, drag to look, WASD to move. In the browser pane the animation
  loop stalls between screenshots: drive it by hand from the console — `LAB.step(n)` steps the core,
  `for (…) LAB.R.update(LAB.state, LAB.view, 0.016)` steps the renderer.
- `tmp/jabberwocky/review/` (KEEP) — THE RIFLE REVIEW 2026-09-06: every gag scored 1–5 with a capture strip
  and a plan (`catalog.py` words, `verdicts.py` scores, `review.py` builds `rifle-review.html`). Recapture:
  lab `?level=5&manual=1`, the `CAP` script in the changelog entry; strips land in `tmp/snapshots/gag-*.jpg`.
- `tmp/jabberwocky/sim.mjs` — ten tests, ~117k assertions on the core. Run it before saying anything is done.
- `tmp/jabberwocky/meshy.mjs` (KEEP) — the Meshy helper: `images`, `models`, `rigs`, `animate`, `anims`
  poll and download in bulk with the API key from `.env`. Manifests of every task id sit beside it
  (`meshy-images.json`, `meshy-models.json`, `meshy-rigs.json`, `meshy-anims.json`, `actions.json`).
- `tmp/jabberwocky/render_models.py`, `slim_models.py` — headless Blender: render every GLB to a sheet;
  strip animation GLBs to armature-only and downscale textures (232 MB → 16 MB). Run slim on anything new.
- `tmp/jabberwocky/sfx-batch.mjs` — the ElevenLabs one-shot batch (42 sounds, prompts inside).

## The files

- `core.js` — pure logic, no DOM: mazes (recursive backtracker + loops + carved rooms with tall
  ceilings; the arena for level 5), the player, goons, the roll, every projectile kind, scars with
  hazards, the boss. `newGame(opts)`, `step(state, input, dt)`, `fire(state, forcedId)`; events on
  `state.events`. One cell = 1 unit here; the renderer draws a cell at 2.6 m.
- `render3d.js` — three.js. Level geometry built per cell from the map (walls only where they face open
  space, taller in rooms, step faces where heights meet), Meshy tiles per theme, torch light BAKED into
  vertex colours plus four live flickering torches, the rune light on the rifle, the muzzle flash. The
  creatures are rigged Meshy GLBs with clips; the fifteen outcomes are done on the mesh (squash = scale,
  freeze = tint then ice shards, gib = hide + Meshy giblets with physics + blood particles + floor and
  wall decals, expire = the die clip, pacify = the dance clip with roses…). Gags are billboard sprites
  from `draw.js`, scars are floor decals, beams are glowing cylinders. The rifle and gauntlets are a
  viewmodel scene rendered on top.
- `draw.js` — the 2D art that survives: 100 gag sprites, 50 scars, the key.
- `sound.js` — file-backed one-shots (ElevenLabs, `assets/audio/sfx/`) with a synthesis recipe behind
  every one of them, so nothing is ever silent and it works from `file://`. The dungeon bed (drone,
  drips, chains, a far moan). Music: `assets/audio/theme.mp3` loops under everything if the file exists
  (James's Suno track goes there), on its own volume channel.
- `world.js` (module) — the host: pointer-lock input (`?nolock=1` plays without capture, `?silent=1`
  never attaches sound), the loop, HUD, cards, the plate, the corner map, the configuration panel (PLAY +
  LOOK with rifle placement dials, file-backed presets), the three ways out.

## The assets (all Meshy, 2026-09-05, ~700 credits)

- `assets/textures/` — 31 seamless tiles (nano-banana-2): five themes × three walls + a plain fourth
  wall for the deep and the arena + floor + ceiling, the locked door, the three odd doors.
- `assets/models/<creature>/` — `base.glb` (rigged, 1K textures) + armature-only clips `walk run attack
  die hit dance` (+ `throw` for the cultist, `monster` walk for the ghoul). Ghoul, brute, ratling,
  cultist, stalker. The Jabberwock is `jabberwock/base.glb` only: Meshy's rigger wants a humanoid and
  refused the dragon twice, so he is a posed statue (rifle in hand) moved procedurally.
- `assets/models/gibs/` — intestines, arm, leg, skull, ribs. `rifle.glb`, `gauntlets.glb` (the viewmodel).
- `assets/models/props/` — 28 Meshy props (2026-09-06, `tmp/jabberwocky/props.mjs`, keyed by SPRITE name)
  that replace the billboard stickers: they fly/spin/roll/tumble/walk by `PROPS[name].motion` in render3d.js
  and the heavy ones rest where they land as the scar. A missing file falls back to the sprite. New prop =
  one PROPS row + a prompt in props.mjs + run it + slim (`slim_models.py` on the props dir). Never run
  slim_models.py on a mixed dir: anything not named base.glb outside gibs/props is stripped to a clip.
- Concept images and raw downloads live in `tmp/jabberwocky/meshy/` and `models/` (gitignored).

## World-specific rules

- **The rifle is the game.** Every pull rolls a tier by the odds (60 / 25 / 10 / 5), then a gag from
  that tier, never repeating within eight. The beat before the reveal (`revealDelay`) is deliberate.
  Never preview the roll; the rifle's shudder and purr are mood, not a tell.
- **Fifty gags, fifteen outcomes.** New gags pick an existing outcome; no bespoke deaths.
- **Duds and backfires stay in.** They are the comedy.
- **Gore is PG-13 and cartoon**: giblets, blood, bones, never realism. Since the 2026-09-06 gore pass the
  gib burst is THE spectacle (ribs + skull every time, mist, wall splats, a pool) and the gore kit in
  render3d.js (`gibBurst / spawnGib / mist / puff / pool / ash / splatAt / boomFx / impactFx`) is the
  vocabulary — reuse it, don't add bespoke particles. Explosions only for `BOOM_GAGS`.
- **Motion:** head bob defaults to 0, shake to 0.25, no CRT anything, native resolution. The 2D
  raycaster made James sick and is gone for good; never bring back per-column rendering.
- **Space:** cells are 2.6 m wide, corridors 3.2 m tall, rooms 5.4 m. Tightness was part of the nausea.
- **No clowns.** The enemies are dungeon creatures; the humour lives in the gags and the plate.
- **Scars persist per level and clear at the door.** The train breaks up to six walls; the bus does not.
- **The boss uses the same table** including duds and backfires (his backfires hurt him).
- **Drift doors** are the three odd doors on the boundary; keep walking into one for 0.7 s.
- **Sound is the shared control only.** New one-shots: add the prompt to `sfx-batch.mjs`, run it, map
  the id in `sound.js` `FILES`; keep a recipe fallback.
- **Meshy:** rigging is humanoid-only (pose estimation) — anything with a long neck, tail or wings will
  be refused; generate posed instead and move it procedurally. Animation clips download with skins by
  default; slim them. Text-to-image concepts with words in them bake the words into the mesh.

## Status

Draft (`unwired` in the admin panel). The 3D rebuild is verified in the lab (levels 1, 3, 5, every
creature through attack / die / dance, gags, gibs) and the world page's cards run with `?silent=1&nolock=1`.
NOT yet flown by James since the rebuild. His eyes decide: the motion, the look, the hands, the gore
level, the odds. Waiting on his Suno track (`assets/audio/theme.mp3`). Then ship.
