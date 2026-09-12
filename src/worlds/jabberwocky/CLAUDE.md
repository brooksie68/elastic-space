# Jabberwocky — Claude instructions

A first-person dungeon crawler where the only weapon is the Jabberwocky rifle, and every pull of the
trigger fires something different. One hundred gags across four tiers. Four mazes, then the Jabberwock
in the middle with a rifle exactly like yours. Built 2026-09-05 as a one-shot on James's go, then
REBUILT THE SAME NIGHT on his verdict (too clown-like, motion sickness, too low-res): three.js dungeon,
Meshy creatures, PG-13 cartoon gore.

## START HERE (2026-09-12)

- JAMES'S TODO TONIGHT: a music track per level — drop `theme-2.mp3` … `theme-6.mp3` into `assets/audio/` (2 THE CATACOMBS,
  3 THE MEAT LOCKER, 4 THE DEEP, 5 THE MIDDLE, 6 THE THREE DOORS). Level 1 keeps `theme.mp3`. A level with no file is
  silent on purpose (his "only play the music we have on level 1"); sound.js `setLevel(n)` swaps tracks with a fade.
- THE WARREN (2026-09-12, "start in a smaller area with rooms and hallways and then reach the larger spaces"): `LEVELS[].warren`
  [wx, wy] nodes at the spawn corner — only 2×2-node rooms (`warrenRooms`, `room.warren`, no columns) and hallways with few
  loops; the big rooms, the halls (`halls`) and THE DOOR are always outside it. Mazes are ~2.5× (31×28 … 46×40 cells).
- REINFORCEMENTS (2026-09-12, "endless bad guys"): a district's whole set down → `waveDelay` (6 s) → round(first × `waveFrac`
  0.34) come back out of your sight, forever. Core `initWaves / stepWaves / spawnWave`, event `wave`, corpses capped at 20.
  Dials PLAY → Reinforcements / Reinforcement clock; 0 = the old one-set level.
- THE FLAYED ONE (2026-09-12) is the fast weak one — the ratling is OUT ("you cannot see it… hard to hit"; files on disk until
  ship). `tmp/jabberwocky/creature.mjs <name> concept | model | clips` + `moves.mjs <name>` is THE PIPELINE for any new
  creature now (a CREATURES row: prompt + rig height; keep concepts A-pose, front-on, tailless). Its hook = `PROPS.hook`.
- PERFORMANCE (2026-09-12, his "a little laggy at times"): `R.profile = true` in the console, then `R.perf` = smoothed ms per
  section (cam / torch / head / decor / goons / shots / bodies / render, mv* for the last creature view built). The rules that
  came out of the pass: hand `canvasTex` a drawer FUNCTION, never a drawn canvas (a hit must not draw); anything past the fog
  is switched off (`near2` / `cullR2`); creatures past ten cells are drawn only in sight (`goonInSight`); brackets are one
  instanced mesh; clip actions bind on first use. Measure before and after in the pane with `renderer.info` (autoReset off).
- AWAITING HIS FLIGHT of all of it: the warren's feel, the wave size / clock, the flayed one's look and speed, the armor glow,
  the frame rate.

## THE STRUCTURE (2026-09-11, James's brief, built on his "let it rip"; read the changelog entry first)

- Six levels: four mazes (`LEVELS[].nx × ny` lattice nodes, `PITCH` 3 — every corridor two cells wide; rooms over whole
  nodes with `tall` 1 = 8 m, the great hall `tall` 2 = 11 m; THE DEEP `cave: true` erodes its walls), THE MIDDLE (the boss;
  its north door opens when he dies), THE THREE DOORS (`exit: true`, round, the three odd drift doors — the way out).
  `C.MAZES` = 4. Sizes are in cells; the renderer's `HEIGHTS` [4.4, 8.0, 11.0] follow `level.tall`.
- DISTRICTS: `level.district[cell]` (a room id; −1 in a wall) → `THEMES[t].districts[k]` in render3d.js: walls / floor / ceil /
  light. Add a district to a theme there; a tile name with a dash borrows another theme's tile. Torches and the bake take the
  district's light colour.
- LANDMARKS: `CELL.PROP` (7) cells from `placeLandmarks` (one per room, three in the hall) → `level.landmarks[]`; the theme's
  `landmarks` list (hero first) and `hang`; `LANDMARK_SIZE` sizes them; files in `assets/models/landmarks/`. A PROP cell is
  solid, draws floor + ceiling and no faces. New landmark = a props.mjs row, `PROPS_OUT=landmarks node props.mjs <name>`, slim
  on the landmarks dir, a name in a theme list + LANDMARK_SIZE.
- THE GUIDE: `level.guide` (toKey / toDoor cell lists) and `level.markers[]` {kind delta | sign | lamp, x, y, a, leg, loud}
  from `layGuide`; the renderer draws them (`guideTex`, per-theme `sign` style) and `syncGuide` fades the legs with the key
  (`look.guide` = configuration → LOOK → Route markings). Never remove the guide; James hates getting lost.
- Goons spawn ≥ 8 steps out and on the far side of any room the route enters; notice ranges doubled. Keep fights far back.
- EVERY LEVEL STARTS FULL (James 2026-09-12): 100 health, 100 armor, on the way through the door and on a retry.
- LIVES (`opts.lives` 3, `state.lives`; `retryLevel` false at zero) and ARMOR (`player.armor` 0–100 takes two thirds of a hit;
  `state.armors` pickups plate +50 / helm +15; `armorMul`). HUD: ARMOR bar + three skulls. Dials: PLAY → Lives per run, Armor
  pickups ×.
- THE ROLL deals only `passed.js` (`JABBERWOCKY_PASSED`, written by the server with cuts.js) when it has anything; the lab
  fires everything. Passing a weapon in the lab puts it in the game on the next load. All 31 passed so far are dispatch.
- THE BAD GUYS' WEAPONS: core `WEAPONS` + `GOON_TYPES[].weapons` → `goon.weapon`; renderer `armGoon` (RightHand bone, PCA long
  axis, grip rule `GRIP_AT_FAT`) and `dropWeapon`. THE MOVES: `ATTACKS[type]` + `DEATHS4` in render3d.js, ids in
  tmp/jabberwocky/actions3.json, `moves.mjs` submits / downloads per creature (retries the ten-task cap).
- THE LIZARDMAN is the common goon (the ghoul and the ratling are out of the mixes and the lab; their files go at ship). Its
  pipeline was `tmp/jabberwocky/lizardman.mjs`, now generalized as `creature.mjs <name>` (the flayed one, 2026-09-12); take one
  (tail, turned head) was refused by the rigger — keep creature concepts A-pose, front-on, tailless.
- THE CORNER MAP (2026-09-12, his "modernize the map"): `drawMap` in world.js — the world in miniature, you at the centre,
  ahead up, wings in their district colours, walls as lines, KEY / EXIT always labelled (pinned to the rim when off the map),
  bad guys red by kind (`GOON_INK`), a legend under it. Never back to blocks; keep the exit marked at all times.
- `slim_models.py` wants the MODELS ROOT (or a scratch root with `<creature>/` dirs inside): a creature dir passed directly is
  treated as props and its clips stay skinned. It re-exports everything it touches.

## THE WEAPON LAB — START HERE (2026-09-07)

`lab.html` + `lab.js` (admin panel → Labs → Weapon Lab; `?silent=1&nolock=1` for the pane). One bare lit hall
(core `startLevel: 'lab'`, `LAB_LEVEL`, `makeLabGoon` / `respawnLabGoon`), passive creatures on pads (notice 0,
they drift about their pad) that come back two seconds after they die or dance, every gag in a list with plain
facts, Q/E to step, the plate, the real sound. **THE NOTES LOOP is James's channel to Claude for weapon work:**
- `notes.json` in this folder, served by `/api/worlds/jabberwocky/notes` (GET; POST ops add / edit / delete /
  seen / rank). Shape: `notes[] {id, gag|null, text, at, status new|done, reply, rank?}`, `updates{gag: {at, note}}`,
  `seen{gag: at}`, `ranks{gag: {rank 1–5, at}}` (2026-09-08: his 1–5 per weapon, 1 = BEST and 5 = worst, from the dropdown beside SUBMIT, saved
  the moment it is picked, shown on the row; a note carries the rank he had given the weapon; for sorting later).
  Committed with the world — it is the paper trail.
- The boxes hold what he types as a draft per weapon (localStorage) until SUBMIT — the poll must never touch them
  (2026-09-08, the wiped-box bug).
- VERDICTS (2026-09-08): `verdicts{gag: {status passed|trash, at}}` — the lab's IN REVIEW / PASSED / TRASH switch; the
  list groups the tiers (in review) then PASSED and TRASH. TRASH is out of the roll at once: the server writes
  `cuts.js` (`JABBERWOCKY_CUTS`, loaded by index.html after gags.js; core `liveGags()`), so a trash needs nothing from
  Claude — delete trashed gags from gags.js for real only at ship, on his word. PASSED is his bookkeeping.
  `notes.mjs verdicts` lists both with their notes; `watch` prints every verdict change.
- A NOTE'S ACTION (2026-09-08): the dropdown by SUBMIT — `update` (default) / `pass` / `trash` — rides on the note
  (`note.action`) and the server applies the verdict in the same save. THE RULE, refined: an `update` note is a change
  request — act on it as before; a `pass` or `trash` note is his comment on a verdict already applied — nothing to
  build unless the text asks for something. He should never have to write "pass" or "trash" in a note.
- Claude's side: `node tmp/jabberwocky/notes.mjs new | done <id> "reply" | update <gag> "what changed" | ranks | watch`.
  `watch` polls every 10 s and prints each new note once — run it under the Monitor tool (persistent) at the
  start of any Jabberwocky session so a note wakes the session.
- THE RULE (his brief): act on a note without asking or commenting; when a weapon changes, `update <gag>` (the
  page shows a green dot on that row + a toast + the tab title count, and PushNotification him), then `done`
  the note with a one-line reply. Spend rule: Meshy / ElevenLabs / Blender only when a note needs a new prop
  or sound, under ~50 credits per note, cost written in the reply; bigger asks get the non-spend part done and
  the cost named in the reply. Run `sim.mjs` + `tmp/jabberwocky/lab-smoke.mjs` before marking anything done.
- Bump `lab.js?v=` in lab.html when lab.js changes; the game's `core.js?v=` when the core changes.
- TWO MOUSE MODELS (2026-09-07): mouse look (captured, the game's default) and CURSOR AIM (`cursor-aim.js`; the game's
  configuration → PLAY → Mouse). Keep both working in the game; he is deciding which he prefers. THE LAB IS CURSOR-ONLY
  (2026-09-08, his order): no edge push, ever — the camera turns only on a right-drag or the keys (A/D + arrows), Q/E
  strafe, [ / ] step weapons.

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
  `tmp/jabberwocky/lab-smoke.mjs` — the weapon lab headless: passive pads, all 100 gags, respawn.
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
  die hit dance` (+ `throw` for the cultist; the ghoul's `monster` walk is history — the ghoul is out, the lizardman in, 2026-09-11; each creature also carries the four new deaths + its attack subset, see THE STRUCTURE above). **THE CLIP DECK (James 2026-09-11, 225 cr):**
  fifteen more Meshy library clips on all five (`tmp/jabberwocky/actions2.json` = clip name → Meshy action id; the full
  678-clip catalog is `tmp/jabberwocky/anim-library.json`, free to pull again; `render3d.js` DECK / DEATH_BY_GAG /
  DEATH_POOL / RUN_POOL / DANCE_POOL is where they are dealt):
  | clip | Meshy action | where it plays |
  |---|---|---|
  | dieback | 189 Dying Backwards | slapfight, trombone; in the random death pool |
  | gutdeath | 188 Fall Dead from Abdominal Injury | sand, curse; pool |
  | electro | 181 Electrocuted Fall | lightning (after the shock) |
  | shotback | 183 Shot and Fall Backward | bullet, boomerang; pool |
  | shotfront | 184 Shot and Fall Forward | baseballs; pool |
  | falldown | 366 Falling Down | gas (keels over), bees, legos, audit; pool |
  | fall3 | 504 Fall 3 | the hole — falls flailing |
  | backflip | 452 Backflip | a third of the goons flip off a dud hit |
  | runjump | 463 Run and Jump | 40% of goons leap the moment they notice you |
  | run3 / runfast5 / runfast7 / hellorun | 15 / 533 / 535 / 110 | each goon runs its own way when chasing (with the rig's own `run`) |
  | dance1 / dance2 | 22 / 23 Funny Dancing | pacified goons deal one of the three dances |
  Every other `expire` kill deals from the death pool by the goon's seed (the same goon always dies the same way). A
  missing clip falls through to `die` / the old hand-coded motion. Meshy queues ten tasks at a time (429
  NoMorePendingTasks): `tmp/jabberwocky/animate-missing.mjs` resubmits whatever a batch dropped. Ghoul, brute, ratling,
  cultist, stalker, and the flayed one (2026-09-12, `creature.mjs`). The Jabberwock is `jabberwock/base.glb` only: Meshy's rigger wants a humanoid and
  refused the dragon twice, so he is a posed statue (rifle in hand) moved procedurally.
- `assets/models/gibs/` — intestines, arm, leg, skull, ribs. `rifle.glb`, `gauntlets.glb` (the viewmodel).
- `assets/models/props/` — 28 Meshy props (2026-09-06, `tmp/jabberwocky/props.mjs`, keyed by SPRITE name)
  that replace the billboard stickers: they fly/spin/roll/tumble/walk by `PROPS[name].motion` in render3d.js
  and the heavy ones rest where they land as the scar. A missing file falls back to the sprite. New prop =
  one PROPS row + a prompt in props.mjs + run it + slim (`slim_models.py` on the props dir). Never run
  slim_models.py on a mixed dir: anything not named base.glb outside gibs/props is stripped to a clip. To slim ONE
  prop, put the file at the ROOT of a scratch dir and pass that dir (a `props/` subfolder in scratch reads as a clip dir
  and strips it to 132 bytes — 2026-09-08, recovered from the Meshy task id in props-manifest.json).
  A prop that does not face +Z in three.js terms gets a `yaw` in its PROPS row (the train and bus lie along -X: +π/2;
  render_models.py on the GLB shows which way — 2026-09-10). Stream gags: `jitter` (angle scatter), `hose` (one tube through
  every drop, per-gag material in HOSE_MAT), `chunks` (bits fly from the pour), `pools` (that fraction of drops lands as the scar).
  PROPS `variants: N` = `<name>-1..N.glb`, a random one per shot; `dark` multiplies the material colour; motion `swing` = the
  handbag (an `arm` prop on the roundhouse, the purse hanging off the hand). Gags: `deathSound` (its own kill sound, sets
  welcome), `loop` (a file that loops while the zone lives — sound.js loopFile, the hosts' stopDeadLoops). Numbered sets play
  IN TURN, not at random (2026-09-10). Meshy text-to-3D will not make a severed limb — it makes the whole person (twice).
- **THE GORE DRAWER (James 2026-09-10):** seventeen Meshy gibs in `GIBS` (render3d.js) — the original five plus heart, liver,
  kidney, lungs, stomach, brain, halfbrain, eyeball, spine, jaw, hand, foot — and `GORE` = the menu by kind (organs / brains /
  bones / limbs) with `gorePick(n)`. FIVE SPLATTER KINDS via `bloodTex()`. **THE LAB RULE:** a note like "increase the gore",
  "more giblets", "blood and guts" on a weapon = add a `gorePick(3–5)` dropGibs + gibBurst / wallSplats / pool to that weapon's
  kill in outcomeFx (keyed by `g.gagId`, like the anvil) — pick a nice selection across the kinds, never the same three; no
  bespoke particles (the gore kit is the vocabulary). New gib = a prompt in props.mjs run with `PROPS_OUT=gibs`, slim at 512,
  a name in GIBS and in a GORE kind.
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
- **Shift is a burst, not a hold** (James 2026-09-12): two seconds at 1.9× walk, two seconds of cooldown, a tap starts it and
  holding never chains; the RUN bar on the HUD shows it. `burstMul / burstDur / burstCool` in DEFAULTS.
- **Motion:** head bob defaults to 0, shake to 0.25, no CRT anything, native resolution. MOTION SICKNESS PASS (James 2026-09-12): the look settle is a LOOK dial in ms (default 25, was a fixed 70), the corner map is NORTH-UP by default (PLAY → Map turns; the arrow turns, the dish does not), field of view 88 (was 76). Keep the run burst — he likes it. The 2D
  raycaster made James sick and is gone for good; never bring back per-column rendering.
- **Space:** cells are 2.6 m wide, corridors two cells wide and 4.4 m tall, rooms 8 m, the great hall 11 m (2026-09-11; was 3.2 / 5.4 one-cell tunnels). Tightness was part of the nausea — never narrow it again. The warren (2026-09-12) is smaller ROOMS and more turns, never narrower halls.
- **No clowns.** The enemies are dungeon creatures; the humour lives in the gags and the plate.
- **Scars persist per level and clear at the door.** The train breaks up to six walls; the bus does not.
- **The boss uses the same table** including duds and backfires (his backfires hurt him).
- **Drift doors** are the three odd doors on the boundary of each maze and the three in THE THREE DOORS past the arena; keep walking into one for 0.7 s.
- **Sound files are decoded buffers, never a media element per play** (2026-09-12, the leak that choked the mix by level 3): `buffers` / `decodeFile` at preflight, buffer sources that disconnect on end, a time-counted 40-voice cap; file:// keeps pooled elements (≤ 3 per name). `tmp/jabberwocky/sound-smoke.mjs` proves nothing accumulates — run it after touching sound.js.
- **Sound is the shared control only.** New one-shots: add the prompt to `sfx-batch.mjs`, run it, map
  the id in `sound.js` `FILES`; keep a recipe fallback. James drops his own files into `assets/audio/sfx/` too;
  NUMBERED SETS: `<name>-01.mp3`, `-02` … beside any one-shot name are found at preflight (contiguous from 01) and
  every play picks one at random (2026-09-08; the death scream is the first set).
- **The bed has no chirps.** The drip ping and the chain clicks were cut 2026-09-08 (James: "a small
  chirping noise... i hate it. please make it stop"). The bed is the drone, a rare far moan and a rare
  low thud. Nothing short or high-pitched goes back into it, in the game or the lab.
- **Meshy:** rigging is humanoid-only (pose estimation) — anything with a long neck, tail or wings will
  be refused; generate posed instead and move it procedurally. Animation clips download with skins by
  default; slim them. Text-to-image concepts with words in them bake the words into the mesh.

## Status

Draft (`unwired` in the admin panel). The 3D rebuild is verified in the lab (levels 1, 3, 5, every
creature through attack / die / dance, gags, gibs) and the world page's cards run with `?silent=1&nolock=1`.
NOT yet flown by James since the rebuild. His eyes decide: the motion, the look, the hands, the gore
level, the odds. Waiting on his Suno track (`assets/audio/theme.mp3`). Then ship.
