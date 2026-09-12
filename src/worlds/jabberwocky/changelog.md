# Changelog — Jabberwocky

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-09-11 (late) — Claude (Fable 5.1) — THE STRUCTURE: open mazes, districts, the guide, lives, armor, the lizardman, weapons, the moves

James's brief ("time to work on the structure"): four levels, a boss, then a room with three doors out; three lives; he hates
getting lost in dungeon games — make the levels unique between AND within themselves (landmarks, formations, textures, colours,
lighting, architecture) and lay arrows / rows of deltas / door signs / floor markings that always lead to the exit,
"occasionally obvious, frequently somewhat subtle"; bigger rooms, higher ceilings, more open, so the weapons have room to
look cool; the bad guys far back; a couple of swords, axes and hammers from Meshy plus his eighteen library moves (fourteen
attacks, four deaths — everyone gets every death, each creature its own attack subset); the green ghost (the ghoul) out for a
lizardman / ogre / marauder of Claude's choice, gnarly; armor + pickups + a meter by health; the rifle deals only the PASSED
list. Plan posted, "great plan", moves folded in, "let it rip". Built in one session:

- THE LATTICE MAZE (core `makeMaze`): the backtracker runs on nodes of 2×2 cells (`PITCH` 3), so every corridor is two cells
  wide (5.2 m) and `loops` knock walls out between nodes. `LEVELS` rows are `nx × ny` nodes now (19 / 22 / 25 / 28 cells
  across); `w` is even — the sim's odd-maze assertion went. Heights ride in `level.tall` as 0 / 1 / 2 → the renderer's
  `HEIGHTS` [4.4, 8.0, 11.0] (was 3.2 / 5.4). ROOMS over whole nodes (`carveRooms`: 2×2 = 5×5 cells … 3×3 = 8×8), a wall's
  width apart, never on the spawn node; each inherits the passages that crossed its edge and gets one or two doorways more;
  the big ones get one-cell columns at their inner lattice crossings; ONE GREAT HALL per level (`hall: [3, 3]` … `[4, 4]`
  nodes, 11 m ceiling). THE DEEP is `cave: true` — `erodeCave` crumbles a quarter of the walls that touch open cells.
  Rooms per level now 3–9 (min 3 at level 1; avg 4.3 / 5.4 / 6.9 / 8.1).
- DISTRICTS (`assignDistricts`): every room seeds one, corridors flood to the nearest; `level.district[cell]`. The renderer's
  `THEMES[t].districts[]` cycles a wall set (the four variants) + floor + ceiling (a full tile name borrows another theme's) +
  a light colour; torches take the colour of their district and bake it (`t.color`); the live torches too. GLOW is keyed by
  tile name now. So THE GATE has an amber gatehouse, a green moss wing and a pale iron wing; THE CATACOMBS candle amber, a
  blue crypt, a bone-white hall; THE MEAT LOCKER cold fluorescent, red emergency, frost; THE DEEP violet, cyan, lava orange.
- LANDMARKS: sixteen Meshy statics (props.mjs, PROPS_OUT=landmarks, 240 cr; `assets/models/landmarks/`; `LANDMARK_SIZE` in
  render3d.js): statue / well / brazier / banner · ossuary / sarcophagus / bonepillar / chandelier · grinder / boiler / barrels /
  carcass · monolith / crystal / altar / stalagmite (+ the brazier in THE THREE DOORS). The core marks a slot per room (three
  along the hall's long axis) as a `PROP` cell (`CELL.PROP` 7, solid like a wall, needs open cells on all four sides —
  `placeLandmarks`); the renderer draws floor + ceiling there, no faces, and stands the piece on it — the theme's hero in the
  hall's middle, the rest dealt by room; the chandelier / carcass hang over every room's slot. Facing sheet
  tmp/jabberwocky/renders/structure-landmarks-sheet.png.
- THE GUIDE (`layGuide` → `level.markers`; renderer `guideTex` / `guideViews` / `syncGuide`): along the two legs of the route
  (spawn → key, key → door; `level.guide`): a row of three chevrons on the floor every third cell (every fourth loud), a
  hanging SIGN (the word + ▲ in the theme's hand: KEY / GATE · WAY OUT · EXIT · ONWARD) over the way out of any region you
  could leave two other ways (a region = a room or a lattice node) and one a cell ahead of the spawn, a soft LAMP every fifth
  cell (also baked into the light, so the right way is a little brighter). The key leg burns first; picking up the key wakes
  the door leg and dims the key leg. Subtle markers sit at 45% of loud ones; configuration → LOOK → "Route markings" (0–1.5,
  0 hides them). You wake facing down the route. Sim: never seven cells of the route without a marker.
- FAR BACK: goons spawn at least eight steps from you, never on the first ten cells of the route, and in a room the guide
  enters only on the far 45% from its entrance; two in three prefer a room; notice ranges roughly doubled (13 / 11 / 14 / 16 /
  14). Fog default 34 → 70 m (range to 120), camera far 220, the torch cap 60 → 140.
- THE MIDDLE (25×25) lost its drift doors and gained a DOOR in the north wall that opens when the Jabberwock dies
  (`state.doorOpen` on `won`); through it → THE THREE DOORS, level 6 (`exit: true`, `makeRound` 13×13, three odd doors n / e /
  w, a brazier in the middle, no goons). Cards: MAZE n OF 4 / THE LAST ONE / THE WAY OUT; "THROUGH HIS DOOR".
- THREE LIVES (`opts.lives`, `state.lives`): a death costs one, AGAIN restarts the maze (health 100, armor 0) while they last,
  GAME OVER → NEW RUN at zero (`retryLevel` returns false). HUD: three skulls under the bars. Dial: PLAY → "Lives per run".
- ARMOR: `player.armor` 0–100, two thirds of any hit goes to armor while it lasts (backfires too), carries across levels, dies
  with you; the hurt event says what it absorbed. Pickups (`level.armors`, `state.armors`): THE SUIT (+50 — Meshy sent a whole
  standing suit for "breastplate"; it stands where it lies) in a side room the guide never enters, HELMS (+15, one per five
  goons) like the pies; the arena deals one of each. HUD ARMOR bar in steel blue; `armor` sound (a plate clank with a ring);
  dial PLAY → "Armor pickups ×". Props `plate` / `helm` (30 cr).
- THE LIZARDMAN replaces the ghoul in every mix and on the lab's first pad (`GOON_TYPES.lizardman`: speed 1.5, dmg 10, 2.2 m,
  sword or axe). tmp/jabberwocky/lizardman.mjs: concept (nano-banana-pro) → image-to-3D (meshy-7, 30k, textured) → rig →
  clips. TAKE ONE (a long tail, head turned) was gorgeous and REFUSED by the rigger twice ("pose estimation failed", 39 cr
  gone — benched as `take1` in lizardman.json); TAKE TWO (A-pose, front-on, no tail) rigged first try. 32 files: base, walk,
  run, the four base clips, the fifteen-clip deck, the four new deaths, its six attacks. The ghoul's files stay on disk until
  ship; `ghoul` is out of GOON_TYPES and CREATURES.
- WEAPONS: seven Meshy props (105 cr): sword-1/2, axe-1/2, hammer-1/2, shiv (`PROPS` rows with `variants`). Core `WEAPONS`
  (dmgMul / atkMul / reach / windup / verb) and `GOON_TYPES[].weapons` — a goon deals one for life at `makeGoon` (lizardman
  sword or axe, brute hammer, ratling shiv, cultist and stalker unarmed); the melee uses it; the death card says "FLATTENED BY
  A BRUTE WITH A HAMMER". Renderer `armGoon`: the prop in the `RightHand` bone, its long axis found by a vertex PCA (a Meshy
  sword lies on a diagonal), the grip at the fat end for swords and shivs and the thin end for axes and hammers, the holder
  undoing the rig's centimetre scale; `dropWeapon` lets it fall as a body at the death. At rest a hanging hand points the
  blade at the floor (right, as a sword hangs); NOT yet judged mid-swing by eye.
- THE MOVES (tmp/jabberwocky/actions3.json, moves.mjs; 132 cr + the lizardman's 30): the four deaths join `DEATH_POOL` and the
  obvious pairings (`DEATH_BY_GAG`: vines → strangled, rocket / sneeze → blownback, cart / train / handbag → knockdown, gravel →
  slowfall); `ATTACKS[type]` per creature (in render3d.js, with the action ids), `attackClip` deals one at random per swing.
- THE PASSED-ONLY ROLL: the server now writes `passed.js` (`JABBERWOCKY_PASSED`) beside cuts.js on every verdict; index.html
  loads it; core `liveGags()` deals only passed, uncut gags when the list has any (`rollTier` folds an empty tier's odds into
  the rest; the boss the same; a forced gag still fires). All 31 passed today are dispatch — the game is all-kill until
  weird / dud / backfire gags pass in the lab. THE SERVER NEEDS A RESTART for the passed.js write (the file exists already).
- Sim TEST 3 rewritten for six levels (lattice, rooms, districts, guide coverage, landmarks, armor, far spawns, the arena
  door), TEST 7 lizardman, TEST 8 the door opens, TEST 14 the structure (lives, armor math, passed-only roll, weapons, the way
  on): 545,042 green. lab-smoke, smoke, draw-check ok. Pane (silent, nolock): level 1's hall with the statue, the KEY sign
  over the passage with the chevrons and the well down the hall, the suit, the HUD; the death card "SHIVVED BY A RATLING WITH
  A SHIV · 2 LIVES LEFT"; THE THREE DOORS; the boss killed me with passed knives; the lab's lizardman.
- GOTCHA: `slim_models.py` keys on the MODELS ROOT — a creature dir passed directly is treated as textured props and its clips
  come back skinned (the lizardman sat at 82 MB). Run it on a scratch root with `<creature>/` inside (it also re-exports every
  file it touches: the first, wrong pass re-wrote ~100 already-slim clips of brute / cultist / ratling / stalker byte-different
  but content-identical; they show as modified in git and are NOT staged — `git checkout` them or commit them, James's call).
- Meshy: 1,979 → 1,332 (647 cr: concepts 18, take-one model 30, take two 35, lizardman clips 87, moves 102, weapons 105,
  armor 30, landmarks 240). Tags: core 23, sound 23, world 63, lab.js 105, render3d 82; PLAY storage key v3.
- NOT DONE / HIS EYES: the weapon in the hand mid-swing; the sign text sizes; the arena's tier; his read of the whole thing.

## 2026-09-11 — Claude (Fable 5.1) — the third review night: the clip deck, the cow's legs, the hornets

James in the lab, the watcher armed, every note acted on without asking:

- HOLE ("arms up as they go down"): arm bones written straight up and waving after the mixer during `drop`; then the fall3 clip
  took the job once it landed (the arms code stands in when a creature has no clip).
- TORNADO ("the timer on the spin is independent of the tornado… if it ran out they could fall back to the ground alive"):
  core — a caught goon carries `rideZone` and travels WITH the funnel; 1.3 s up, a ride at the top, the burst at 3 s
  (`TORNADO_BURST`); if the tornado's zone dies first the goon is put back to `idle`, hp 1, `dropped` 0.6 s, the kill count
  taken back, a `dropped` event; renderer — the ride orbits the funnel top, a dropped goon falls from the top tumbling with
  the hit clip and lands in a puff. sim TEST 6 grew the ride + drop + full-ride cases.
- VINES ("pop up quickly and then move around… get smaller and larger… writhe and roil"): rise 2.0 s → 0.35 s, then every vine
  swells and shrinks on its own beats (two sines each on width and height), turns ±0.9 rad and leans; the coils on the
  caught creature writhe too.
- BEES ("a wasp or a hornet from Meshy… scary and gnarly"): a realistic Meshy hornet (15 cr) → `props/bees.glb`, wings split
  (split_wings.py 0.3), PROPS motion `swarm` (`count: 11`): the shot view is a Group of clones, each on its own orbit radius /
  rate / height / bob, nose along its circle, wings beating at 70 rad/s, buzzing jitter; spreads out over 0.5 s from the muzzle.
- COW ("60% larger… land on its side… move its legs a couple times before flopping"): size 1.8 → 2.9; `split_legs.py`
  (new, headless Blender: the vertices below 42% of the height split into four by quadrant, hip pivots) → `props/cow.glb`
  (the original in tmp/jabberwocky/models/cow-orig/); PROPS `legs: true`; on landing the zone view hands the prop to
  extras with a `tick` (`legsTick`): 1.5 s on its feet kicking all four legs and rocking, then 0.42 s rolling onto its side
  (random side), a dust puff on the thump. extras entries can carry `tick(e, dt)` now (return false = done, stays put).
- THE CLIP DECK (his "get 'em, add 'em, catalog 'em, weave them into every gun response — some random and some obvious"):
  fifteen Meshy library clips × five creatures = 75 animation tasks (225 cr; Meshy queues ten at a time — the first pass
  dropped 40 with 429 NoMorePendingTasks, `animate-missing.mjs` resubmitted them with retries; `meshy.mjs anims` polled +
  downloaded, `slim_models.py` stripped them to armature-only, 545 MB → 4.2 MB). The catalog table is in the world
  CLAUDE.md. The weave in render3d.js: `DEATH_BY_GAG` (lightning → electro, bullet/boomerang → shotback, baseballs →
  shotfront, sand/curse → gutdeath, gas → falldown at 45%, hole → fall3, slapfight/trombone → dieback, bees/legos/audit →
  falldown) and every other expire dealt from `DEATH_POOL` by the goon's seed (`dealClip`); `RUN_POOL` per goon when
  chasing (run ×2, run3, runfast5, runfast7, hellorun — at 0.85 speed); `runjump` once on notice for 40% of goons;
  `backflip` off a dud hit for a third; pacified goons deal one of three dances. One-shots (`busyOnce`) finish before the
  run/walk logic resumes. Also answered: Meshy's library is 678 clips (`anim-library.json`, the free list endpoint), and
  his paid plan owns every generated asset outright, commercial use included.
- THE REST OF THE NIGHT (each on a note, each verified by hand-driving the lab in the pane — `LAB.step` + `R.update` loops,
  never timed waits, the pane's clock stalls when hidden): the HOLE closes over after 12 s (scar `life`); BEES — the
  summon now carries `pierce`, parks on each victim (`sting: 2.0`; NOT `hold`, which is the rifle's pull-to-launch delay
  and produced a phantom two-second wait before the swarm — the "two bees" bug), takes a second or third only within
  `stingReach` 3.5 cells, and a spent swarm climbs away into the ceiling (`swarmAway` in extras; extras entries can carry
  `gone: true` to be spliced when their tick ends); the body cloud that doubled the swarm is OFF; the LAB waits for a
  one-shot death clip before a pad respawns (`R.clipDone`, 7 s cap); LIGHTNING plays electro straight from the shock, no
  arm writes; GAS falls face forward (shotfront) and its death voice is a wheeze (the vibrato read as three notes); the
  COW ended as: 60% bigger, flies out already on its side (`motion: 'side'`), lands on its side, more blood + two giblets —
  the leg-kick (`split_legs.py`, `legsTick`, `legs: true`) is built and retired at his word; the SNEAKER 20% bigger,
  the squash instant (`u * 10`) and every falling prop now drops from the cell's ceiling under gravity, touching down
  0.15 s after the kill so the crush happens as it lands; more blood on the sneaker; THE LEGOS are a `drop` from the
  ceiling now — one Meshy brick (15 cr, `props/brick.glb`) recoloured eight ways, ~190 let go across the fall
  (`brickRain`, the `bricks` body list, dry bodies with a `rest` height so they heap in the middle); THE GRAVY is a
  new core kind — `mode: 'wave'`: a fan from the muzzle down the aim, the front rolls to `range` over `dur`, everyone in
  the fan with line of sight is smothered, pools laid along the way; the renderer's `makeGravyWave` / `syncGravyWave`
  = seventy noise-bumped glossy lumps riding behind the front, thigh-high at the leading edge, steam wisps, sinking
  away; the smother blob is gone for the gravy. sim TEST 6 grew the wave case; TEST 1 knows the mode. THE LAB PAGE: the
  name / line / facts card removed, the card capped at 35vh (its own working controls, history below the fold), the
  find box + SOUND + FIRE gone from the bar (creature picker + RESET remain). Tonight's verdicts: glue, lightning,
  anvil, hole, tornado, vines, bees, gas, cow, cart, legos PASSED; wetcat, porcupine TRASH. Meshy total 270 cr.
  Final tags: core 22, gags 37, render3d 81, lab.js 104, world.js 62, sound 22.
- Also tonight (early): glue, lightning, anvil PASSED by his hand. Meshy tonight: 15 + 15 + 225 = 255 cr (balance 2,114 before the
  clips). Sim 122,906 green, lab smoke ok, draw-check ok; pane: the lab loads clean and fires bullet / gas / hole with no errors.
  Tags: core 18, render3d 70, lab.js 91, world.js 51.

## 2026-09-10 (after midnight) — Claude (Fable 5.1) — the second review night, first five notes

James in the weapon lab, the watcher armed, each note acted on without asking (all his notes carried `update`;
mousetrap and the donkey kick went to TRASH by his hand — nothing to do, cuts.js has them):

- GLUE ("this should look like a hose is shooting out of the gun"): THE HOSE — every live drop of a `hose: true`
  stream is a control point on one tube (CatmullRom → TubeGeometry, radius 0.08, rebuilt each frame) from the
  viewmodel's muzzle out, sagging with distance; per-gag `jitter` on the stream's angle (0.08 for a hose, the old
  0.24 for the rest); rate 40, 1.6 s. His second note ("still looks like a bunch of snowballs") was the old page
  — code only changes on a reload, so the UPDATED toast now says "reload the page to load the change" — and the
  drops inside the rope are gone for good: only the head shows one, at 0.14.
- PIRANHAS ("really cartoony… flying sidewise… blue. see if you get one from meshy… a school… chomp better"):
  a realistic Meshy piranha (`props/piranha.glb`, 15 cr, slimmed to 313 KB — the manifest has the task), PROPS
  motion `swim` (nose-first along the flight, a tail-beat yaw + roll, its own bob), jitter 0.4 so it fans as a
  school, rate 22; THE FRENZY — on a piranha kill seven fish (clones) circle the body at their own heights and
  lunge in to the bone and back (`syncSchool`), gone when the body is; torn down with the goon view. The 2D
  sprite (the scar's fish) recoloured silver with a red belly.
- BLACK HOLE ("flow forward like a dark black sphere… accretion disk ala Interstellar… monsters sucked into the
  center"): `travel: 0.7` on the gag — spawnZone takes the origin, the zone starts 0.6 cells out of the muzzle
  and eases to the aim point with no pull, then pulls for 2.2 s; the renderer builds it (`makeBlackHole`): a
  black sphere, a photon ring, a tilted accretion disk and the lensed halo standing over the top (one canvas
  gradient, banded, additive), small and dark in flight, opening at the target, collapsing at the end, warm
  light; the caught creature keeps being pulled to the centre while dying (core) and the vapor case for
  `gagId === 'blackhole'` lifts it to the hole, stretches it tall and thin, spins it and shrinks it in — no
  white-out. Sim: the test gives it 4 s (the flight comes first).
- TRAIN ("going sideways. double it in size and turn it so it's driving away"): size 3 → 6; per-prop `yaw` in
  PROPS — the Meshy train and bus both lie along -X (render_models.py on both), the flying props face +Z in
  three.js terms, so both get +π/2. (First cut used -π/2 and the train drove at the camera; the pane caught it.)
- LAVA ("a firehose of lava and it arcs and… a lot of chunks fly out"): a hose stream (`hose`, `chunks`,
  `pools: 0.06`): a glowing Lambert rope (emissive orange), a few drops land as the lava scar (core: `drop` is
  false for those), `lavaBits` particles burst from the rope's head every frame + a point light at the pour.
- The pane caught one more: the black hole view's teardown hit `PROPS[undefined].stays` (it is a prop-less view)
  — guarded. Sim 122,902 green (one assertion fewer: the old lob-lava test count), lab smoke ok, draw-check ok.
- CART ("again, its going sideways. all the models you got made are going sideways"): every prop rendered front + side
  (tmp/jabberwocky/renders/facing-sheet.png): the walkers, the fish, the eagle, the cow and the porcupine all face +Z; the
  cart alone sits at 45° in its file — yaw π/4. Tags: core 13, render3d 38, lab.js 49.
- GLUE, third note ("there's no rope. just more snowballs again"): the rope draws in the pane through the lab's own FIRE
  button and its real loop — his tab was the page from before tonight (never reloaded; he could not see the new toast either).
  THE LAB RELOADS ITSELF 2.5 s after an UPDATED toast (drafts, pick and prefs are in localStorage). gags.js / draw.js tags
  bumped too (both changed tonight without one; the server is no-store anyway). Tags: gags 15, draw 4, lab.js 50.
- Glue PASSED (rank 2), piranhas PASSED (rank 1), black hole PASSED (rank 1). TRAIN ("not coming out of the front of the gun"):
  train-kind props lerp from the muzzle over their first 0.5 s like the flame (the bus too). Tags: render3d 39, lab.js 51.
- LAVA ("seems like it requires a lot of processing?"): each pool carried a PointLight and the hose another — every change
  in the light count recompiles every shader. One lit pool at a time (`userData.lit`), no hose light, tube 36×5, pools 0.04.
- TRAIN again ("still comes out of the middle of the screen"): the lerp target is the muzzle + halfW along the heading (the
  rear at the barrel; the first cut put the centre there, camera inside the model), 0.7 s. Tags: render3d 41, lab.js 53, gags 16.
- LAVA PASSED. TRAIN, third note ("not really aiming from the weapon… is this a real model?"): it is; the core snapped a train
  to the dominant grid axis — now dx/dy = cos/sin of the aim, everything downstream already took a unit vector. Tags: core 14, lab.js 54.
- HOLE ("randomly use the following death screams": hole-death-01..04): per-gag `deathSound` — sound.js `outcome(id, pan, gag)`
  plays it first (numbered set probed at preflight from the gag table), both hosts pass the gag on kill. Tags: sound 16, gags 17, lab.js 55, world.js 44.
- HOLE round two ("trigger the sounds in succession"): every numbered set now plays in turn (01, 02, … round again; `seriesAt`).
  TRAIN PASSED, GRAVEL PASSED then back to review for round two.
- GRAVEL ("get 6 rough pebbles from meshy"): PROPS `variants: N` loads `<name>-1..N.glb` into an array and propFor deals a
  random one; a single "six pebbles" generation (15 cr) came back as polygon soup — 158 loose parts, a centroid-clustered
  split (tmp/jabberwocky/split_pebbles.py, kept) gave shards and a three-pebble clump — so SIX SINGLE generations (90 cr),
  slimmed to ~300 KB each. Round two on his eye: half the size (0.11), `dark: 0.5` (the loader multiplies the material
  colour), 48 a second.
- HANDBAG ("get the arm and the handbag on a strap as two separate models… overly large… swinging from just to the right of
  the gun"): a real quilted Meshy purse with a handle (15 cr, faces +Z, slimmed); PROPS motion `swing` — the ARM rides the
  fist's roundhouse from the right (hand at 1.25 m, an `arm` prop cloned once per swing and torn down with the shot), the
  purse hangs from the hand, thrown outward along the swing's tangent by a lag and whipping ahead at the middle; reach 2.2,
  swingLife 0.6, purse size 2.2. THE ARM: Meshy's text-to-3D made a WHOLE OLD LADY twice when asked for a severed old lady's
  forearm (30 cr, both benched in tmp/jabberwocky/models/ladyarm-take1/2.glb, manifest entries renamed) — the arm is the
  giant Meshy FIST with its forearm stump (armSize 3.0). A drawn image → image-to-3D (~21 cr) is the route if he wants the
  lady's arm proper; offered in the reply, not spent.
- TORNADO ("use tornado.mp3 while it's on screen… a classic vortex of many stacked plates… tiny at the floor, wide at the
  ceiling, twists and roils"): sound.js `loopFile(name, pan)` (a looping Audio through the sfx gain with a stop that fades);
  gag `loop: 'tornado'` + `sound: 'none'`; both hosts start the loop on the zone event and `stopDeadLoops()` after each step
  ends it when no such zone lives. THE VORTEX: eighteen CircleGeometry plates (radius 0.12 → 0.8 × the hurt radius, y 0.04 →
  H_LOW), a streaked canvas disc (`vortexTex`, spiral streaks cut out of a soft ring), each turning at 13 → 5 rad/s and
  roiling off the axis, tilting a little; the old torus cone is gone. Tags: render3d 47, lab.js 62, gags 21, sound 18,
  world.js 45, core 14. Meshy tonight: 15 + 15 + 90 + 15 + 15 + 15 = 165 cr.
- HANDBAG: his purse.mp3 on the swing (FILES purse). Tags: sound 19, lab.js 63.
- VINES ("one of the weakest… lime green squiggles on the ground… come up out of the ground… darker green… leaves and
  berries… thinner tips… coil up and around… pull them down and crush them… like constrictor snakes… 6–10 of them… colour
  variations"): THE VINE KIT — `makeVine` (a helix that tightens as it climbs, four tube runs of shrinking radius 0.11 → 0.014,
  leaf cards on a canvas leaf, berry clusters red or purple, six dark greens), `spawnVinePatch` (7–10 vines within the hurt
  radius rising out of the floor with a staggered delay, holding to 4.6 s, sinking by 5.5), `stepVinePatches` each frame,
  `syncCoils` (three coils climb a caught creature, tighten, then it is pulled down and crushed — outcome 'smother', the
  blob skipped for vines; a blood burst + pool at the crush). Coils go with the body (the first cut left them standing
  around the corpse). The 2D fallback + scar recoloured dark green.
- ANVIL ("5 times larger… blood and guts"): size 4.5; a squash by the anvil throws a gib burst, wall splats and intestines +
  a gore pick. PIANO ("piano-crash.mp3… 3x larger"): size 6.6; gag `splashSound: 'pianocrash'` — the hosts' impact event
  now plays `gag.splashSound || 'thud'` (any drop can carry its own landing sound).
- HANDBAG ("don't double up on the lady's yell or add any echo. add a little reverb… like a medium room"): `deathSound:
  'none'` = the kill plays nothing on top of the weapon's own file (sound.js outcome() honours it); `FILE_ROOM` — a
  0.9 s noise-tail convolver send per file, the purse at 0.28.
- THE GORE DRAWER (James, out of the lab: "a dozen more organs and bones eyeballs limbs different kinds of blood splatters
  half brains whole brains… put all that stuff into rotation… and when I say increase the gore or more giblets pick a nice
  selection from the menu"): twelve Meshy gibs — heart, liver, kidney, lungs, stomach, brain, halfbrain, eyeball, spine,
  jaw, hand, foot (props.mjs with `PROPS_OUT=gibs`, realistic-wet prompts, 180 cr, slimmed to 512) in `GIBS`; `GORE` = the
  menu by kind (organs / brains / bones / limbs) and `gorePick(n)` = a selection spread across the kinds; the burst deals a
  brain fifth every time then the whole drawer, chew bites and the drops after a chew / the anvil draw from the menu.
  FIVE SPLATTER KINDS (draw.js: blood, bloodspray, blooddrips, bloodsmear with a handprint, bloodchunks) — `bloodTex()`
  picks one at every blood-decal site (pools, wall splats, drips, the fling splat).
- SNEEZE ("no snot… a blast of wind… very light, slightly opaque material flying away from the gun in an expanding cone"):
  gag `sprite: 'none', gust: true, scar: null`; THE GUST — soft sprites born 0.7 m ahead of the muzzle six a frame while
  the swing lasts, flying down the aim in a 0.9 rad cone, swelling 0.12 → 1.7 m and fading (opacity 0.13 peak; the first cut
  at 0.22 from the lens itself whited out the screen), `stepGusts` with the particles.
- LIGHTNING ("just looks like a straight bolt… bifurcations… crooked and scraggly… a bright white core with a bright golden
  yellow aura… jump up six inches with their arms out… a flickering skeleton through the opacity of their body"): THE BOLT —
  `boltPath` (perpendicular jitter along the run), `boltVariant` (main + 2–4 forks), `makeBolt` (three jitters cycled every
  45 ms; a white core cylinder inside a fat additive gold one per segment; a warm light at the strike); the chain links are
  bolts too; zero-length / vertical runs guarded (a chain link onto the same spot made NaN geometry). THE SHOCK — outcome
  'burn' → 'expire' with `view.shock`: the 'hit' clip, LeftArm / RightArm written straight out after the mixer, a
  six-inch hop with a buzz, the body at 0.35–0.6 opacity while skull + ribs + spine (the gore drawer, emissive) flicker
  inside it, random flashes; at u 0.3 the parts go and the 'die' clip runs.
- HOLE ("25% larger… some type of edging"): SCARS hole r 0.55 → 0.69; the scar and the sprite get a pale stone rim with
  broken tick marks round it. Gibs sheet: tmp/jabberwocky/renders/gibs-sheet.png. Tags: render3d 55, lab.js 73, gags 27,
  draw 7. Meshy tonight so far: 165 + 180 = 345 cr.
- TORNADO round two (his screenshot tmp/jabberwocky/review/tornado.png: "three different directional stacks… an upside down
  stack"): the old 2D funnel SPRITE was still drawn at 6 m over the plates — opacity 0 now; 24 plates from 0.1 to the room's
  ceiling + 0.35 (H_TALL in rooms via levelRef.tall), radius k^1.2, ONE travelling wave up the stack (offset and lean by k) so
  it snakes as one. Gravel PASSED (rank 2). Tags: render3d 56, lab.js 74.
- HANDBAG ("start the voice sample right away, but hold off for about 800 milliseconds before the animation"): gag `hold` (extra
  seconds on the pending launch, core) + `earlySound` (the hosts play the gag sound on the pull event and skip it on fire);
  the purse holds 0.52 so pull → swing is 0.8 s. Tags: core 15, gags 28, lab.js 75, world.js 47.
- TORNADO round three ("completely flat… no volume… a pancake shaped volume of grey… 10–15% opacity… a pretty significant
  blur"): each plate is a Group — the streaked disc + two squashed spheres (1.05× at 0.09, 1.3× at 0.04, the blur) — the
  wave moves the group, the spin turns the disc. Tags: render3d 58, lab.js 77.
- VINES round two ("slow it down… variety in the shapes… doubling back… forking off to the side… more leaves and bigger…
  don't use only corkscrews"): `vinePath` by shape — coil / snake / arch (climbs, leans over, doubles back, up again) /
  wander (a random walk with kinks) — dealt round the patch; `tubeAlong`; one to three leafed forks off the side; leaves
  16–26 at 0.42–0.58; rise 2.0 s, hold to 6.0, gone by 7.4; the creature coils stay coils (forks 0). PIANO round two
  ("that's huge… two times… black"): size 4.4, `dark: 0.35` (the single-prop loader honours dark now, emissive too).
  SNEEZE PASSED. Tags: render3d 60, lab.js 79.
- TORNADO round four ("travels away from the gun towards the bad guys pretty reliably"): a wander zone sets off down the aim
  (spawnZone gets `from`) and each re-aim (1.5/s) points at the nearest live goon (the player when hostile), else away from
  the player, ±0.4 rad waver, one in four a random turn. Tags: core 16, lab.js 80.
- HANDBAG: the floor sticker (scar) dropped — the purse is in the hand. Tags: gags 29, lab.js 81.
- TORNADO round five ("once the monsters get up into the tornado… fly apart into limbs and body parts"): the fling case for
  gagId tornado — 1.3 s spiralling up to 3.4 m spinning, then hide + gibBurst + wall splats + all four limbs and a gorePick(5)
  thrown outward from the top. Tags: render3d 61, lab.js 82.
- TORNADO, the catch fixed in the core: a tornado fling gives no wall velocity (the pane showed them dead at the wall before
  the burst) — they stay put, dieDur 1.7, and go apart at the top. VINES round three ("struggle… and yell in pain and fear for
  a second or two"): `longDeath: 3.4`, `deathSound: 'scream'` (the numbered set), and while the pull has not begun the hit
  clip repeats with a thrash (yaw + position jitter). Tags: core 17, gags 30, render3d 62, lab.js 83.
- A BROKEN MINUTE: a line comment inserted mid-line in the vines edit swallowed the rest of the line — render3d.js failed to
  parse and the lab went blank until the fix (render3d 63); James: "the lab stopped loading". Lesson: block comments inside
  one-line cases, never //. HANDBAG PASSED (rank 2).
- PIANO round three ("two of the legs break… tips over on a diagonal… the top fly off… blood and guts"): split_piano.py
  (KEEP) cuts the Meshy piano into body / legs-front / legs-back / lid by height in a normalised frame; PROPS `pieces` loads
  them raw scaled by size into models.pieces; on landing the whole is swapped for the body (+ back legs as a child), the
  front legs and the lid go into the gib physics with a throw, seven black splinters scatter, a dust puff, and the body
  drops and tips (rotation.x 0.55, z 0.18) over 0.45 s; restProp keeps a `keepPose` wreck as it lies; the squash by piano
  gets the anvil's blood and guts. Tags: render3d 64, lab.js 85.
- GLUE round three ("arms and tops of the heads could come out of the glue while they struggled"): the glue case sinks the
  body to 0.62 of its height in the first fifth, then a struggle to 0.8 (the hit clip on repeat, a bob, LeftArm / RightArm
  written up at ±2.5 with a wave) and under. ANVIL round two ("three times… black… a glowing white rectangle"): size 2.7,
  PROPS `solid` = one flat colour with the maps and the emissive dropped (0x17171b, rough iron). PIANO PASSED (rank 1,
  "AWESOME!!!"). Tags: render3d 66, lab.js 87.

## 2026-09-08 (evening) — Claude (the Carnage session) — THE CHIRP IS GONE

- James, from the Carnage session, first order of business: "there's a small chirping noise or
  noises happening in this game and in the lab and i hate it. please make it stop." It was the
  dungeon bed in `sound.js`: the water DRIP (a 1.8–3.4 kHz sine ping, gain 0.5, more than half of
  all bed events, one every 1.5–6.5 s) and the CHAIN (bursts of bandpassed square clicks at
  0.9–2.4 kHz). Both cut for good; the bed is now the drone + a rare far moan + a rare low wooden
  thud, one event every 7–19 s. Same bed in the game and the lab, so both are quiet now. Rule
  added to CLAUDE.md: nothing short or high-pitched goes back into the bed.

## 2026-09-08 — Claude (Fable 5.1) — the note box kept, the 1–5 rank

- NUMBERED SOUND SETS (his ask: rotate randomly through scream-01 … scream-NN, he will add more): sound.js probes
  `<name>-01.mp3`, `-02` … for every one-shot name at preflight, counting up until a number is missing, and `playFile`
  picks one of the set at random. Works for any name in FILES / OUT_FILES / NOTICE; the plain `<name>.mp3` is the fallback
  when there is no set. Five screams are in. Also: SUBMIT with an empty box and pass / trash picked applies the verdict
  (it used to say 'nothing to submit').
- EAGLE sound round four ("remove the pause, trigger the eagle sound the second I press the trigger"): the gag's sound
  is eagleattack (plays on the fire event); the hit is silent.
- EAGLE sound round three ("there's a secondary sound first… don't tell me there's no other sound"): it was the
  gag's launch `screech` on the fire event; the gag's sound is `none` now, eagleattack on the attack is the only one.
- THE BARREL TIP, FOR REAL (his screenshot: aiming left, the beam began far left of the gun): the muzzle-flash object
  sits at z −0.75 in the viewmodel while the rifle is fitTo 0.7 about its centre — 0.4 past the barrel, a long lever that
  swung wide with the aim. `vmTip` (z −0.36) is the point projected now; the flash stays where it was. Pane, aiming
  left: the beam's near end sits on the barrel. (Pane gotcha recorded: the lab's cameras only get their first real
  resize on a screenshot-driven frame — probe after a screenshot, or the aspect reads NaN.) EAGLE sound: his
  eagleattack.mp3 alone on the attack (the chew's chomp no longer doubles it). SAND + FLAMETHROWER passed.
- FLAMETHROWER round five ("still points where it was pointing when you pull the trigger… not when you move just the
  weapon"): `stepEmitters` aims the player's stream at `p.a + p.aim` (the cursor aim), not the facing alone.
- THE MUZZLE POINT IS THE VIEWMODEL'S (his "this beam is not emitting from the tip of the gun"): `_muzzleWorld` = the
  viewmodel muzzle-flash sprite projected through vmCamera to the screen and unprojected through the world camera 0.9 m
  out — so beams and the flame stream leave exactly under the drawn barrel tip, aim, pitch and placement dials included.
- EAGLE (his note: flap its wings, feather texture, more realistic, grainofsand for the attack): a realistic Meshy harpy
  eagle (15 cr; the manifest's old entry had to be cleared — `done: true` just re-downloads), `tmp/jabberwocky/
  split_wings.py` (headless Blender: separates the mesh beyond 28% of the half-width into LWing / RWing with origins at
  the root, textures to 1024), the flyhigh motion flaps LWing / RWing ±0.55 rad at 11 rad/s when present; the eagle's
  kill plays `eagleattack` (= grainofsand.mp3, his call). LANDED: `props/eagle.glb` = Body + RWing + LWing (320 KB; the
  split script's first pass renamed the wrong object — it now picks the object that did not exist before the separate).
  Pane: it flies at the pads, wings at different angles frame to frame. The cartoon eagle is in the manifest as
  `eagle-cartoon`. Note done.
- SAND's blast plays James's `grainofsand.mp3` (FILES sand; the recipe stays as the fallback).
- FLAMETHROWER round four ("a dry one can still be dealt, it's random… still not tracking the end of the muzzle"):
  `_muzzleWorld` is now built from the player's facing + cursor-aim yaw (+ pitch), where the rifle actually points, not
  the camera's forward — flames and beams alike; the roll exclusion is gone, a dry pull just clicks. Sim TEST 13 updated.
- SAND round six ("make the hole 1/3 smaller and it'll be perfect"): 0.55 → 0.37 m.
- FLAMETHROWER round three ("if I hold it down it should run out after 10 seconds and not return"): `state.fuel` (10 s
  a game, never refills); while a player flamethrower emitter lives, fuel burns and, with the trigger held, the emitter
  is extended and the cool held so no re-roll happens mid-stream; dry: the stream ends, a forced pull (the lab) shows
  the plate 'Empty. Ten seconds was all it ever had.' + the hosts click instead of the flame sound (`fire.empty`), and
  `rollGag` never deals it again. Sim TEST 13 — 122,903 green.
- SAND round five ("it should disappear during the drop… getting smaller as the character is going down"): the hole is
  sized by the chest bone's world height against its height at the hit (squared), gone as the chest reaches 0.3 m.
- FIST round six ("make the arc smaller so it starts and finishes closer to the player"): base radius 0.35, sweep × 0.65.
- The burn outcome's sound is James's `burnttoast.mp3` (OUT_FILES burn; his note on the flamethrower).
- FLAMETHROWER round two ("coming out of the center of the screen… have it coming out of the end of the gun"): the
  player's flame sprites lerp from `_muzzleWorld` (the beams' barrel point, one frame stale) onto their true position over
  the first 0.32 s, eased; the near-player fade no longer applies to the player's own flames.
- FIST round five ("slow it down 20% and pull it 20% closer"): core melee shots take `gag.swingLife` (fist 0.54, default
  0.45); the punch arc radius × 0.8. Sim green.
- POISON GAS round three ("worked awesome… triple the volume"): 48 wisps, spread 0.85 r and 1.75 m tall, base opacity 0.26.
- FIST round four ("the model itself is not rotating as it moves along the arc… the whole arm and wrist needs to
  rotate"): heading = a + φ − π/2, the arc's tangent — straight ahead as it leaves, a full quarter turn by the peak.
- POISON GAS round two ("still appears instantly… the entire cloud rotates back and forth… repurpose Lumina's Ink…
  more translucent by far… gross yellowy-green… a volume"): the first cut hung on the ZONE, which lives 0.2 s — the nine
  seconds of gas is the SCAR (`gas`, a billboard). Now `makeGasVolume` / `updateGasVolume` replace the gas scar's
  billboard: sixteen sprites of four baked wisp textures (34 soft discs each, edge-faded), 0x9ccc36 / 0xc8e050, base
  opacity 0.22, own drift / spin / pulse, eased in over 1.5 s, fading over the scar's last 2 s. Pane: nothing at
  0.2 s, a drifting haze at 2 s. The zone cloud is gone.
- FIST round three ("coming in from the left… sliding in at 45°… you know what an arc is, right?"): the right vector was
  left-handed (right of heading a in x/z is (−sin a, cos a)); the punch is now a quarter circle around the player from
  a + 90° to a at full reach and back, the fist yawed along the swing. Pane: enters from the right, flattens the row.
- FIST round two ("awesome… come around from the right in an arc like a half-roundhouse… range at least 2X"): reach
  3.2 → 6.4; the punch motion adds a lateral term 1.4 × (1 − sin πk) along the player's right, and yaws the fist with it.
- POISON GAS (his note: grow from small, blobs moving / pulsing / fading on their own, some blur, his gasss.mp3):
  `makeGasCloud` / `updateGasCloud` in render3d.js — eight soft-dot green sprites with their own phase, drift, size and
  opacity pulses, eased in over a second, thinning over the last 1.5 s; the gag's sound is `gasss` (FILES + a hiss
  recipe fallback). SAND round four ("goes away too soon… two more seconds"): the hole holds until 2 s past the
  drop, then squashes away over 0.6 s.
- FLAMETHROWER ("the fire on the burning characters is much cooler than what comes out of the gun… a stream of that"):
  stream particles with sprite `flame` are additive `flameTex` sprites (the burn outcome's fire) that grow 0.55 → 1.95,
  lift, animate through the four frames and thin out over the particle's life, embers off them; the draw.js triangles
  are gone from the gun. Pane: a roaring cone. Note done.
- FIST landed: `props/fist.glb` (Meshy 15 cr, slimmed from a scratch root), size 3.2 after the pane showed 2.2 reading
  smaller than a creature (the forearm sets the fit). Note done.
- JELLO (his note: reuse the pie's burst, darker translucent lime, blobby nonsense shapes, a tighter pile three or four
  times the berries): `berries()` became `chunks(x, y, z, n, opt)` (colour, shapes round|blobby, opacity, spread, up, size);
  `jelloPile()` = 140 translucent 0x2f8a1e pieces of six geometries in a tight clump; MAX_GIBS 80 → 240 so the pile
  stays beside the gibs; splash + smother colours darkened; jello lands with the splat. Note done.
- SAND round three ("cheesy, but it works… when the model hits the floor the hole needs to compress down and disappear"):
  `view.hole` shrinks (width and, faster, height) between 32% and 60% of the die clip and is removed. FIST (his note: a
  Meshy fist "stupid big… fingers curling in, thumb over them" + his own punch.mp3): PROPS `fist` size 2.2 with a new
  `punch` motion (lunge from the muzzle to the reach and back at chest height, knuckles along the swing, a little roll),
  the hit plays `punch` in both hosts instead of the squash file; the Meshy prop (props.mjs, 15 cr) — sprite until it lands.
- KNIVES round three landed: `assets/models/props/knife.glb` (Meshy, 15 cr, slimmed to 1024 textures via slim_models.py on a
  scratch copy — never on the mixed models dir). Pane: four big knives tumbling end over end toward the pads. Note done.
- BASEBALLS round three ("timing… batter up a tenth of a second earlier than the balls… delay the yell when the ball
  hits by two or three tenths"): BATTER UP now fires on the trigger pull, timed revealDelay − 0.1 s so it lands a tenth
  before the balls leave; the baseballs' kill sounds wait 260 ms (both hosts); the recipe no longer plays it.
- SAND round two ("the hole drifts… doesn't stay with the character"): `holeOn()` hangs a messy hole (torn-flesh blob,
  cauterised rim, black through; no depth test, renderOrder 5) on the Spine02/Spine01/Spine bone of the creature (all five
  rigs carry those), scaled against the bone's world scale, so it rides the die clip and the fall. Pane: the brute wears
  it through the drop. `render3d.js?v=11`. KNIVES round three ("large cigarettes… go to Meshy… twice as large… only 4…
  spinning pretty fast"): four knives, size 2.0, endover at 16 rad/s; a Meshy prop `knife` (props.mjs, 15 cr) replaces the
  code-built one — primProp stands by if the file is missing.
- **NO DASHBOARD ICON, NO SHARED SPEAKER IN THE LAB** (his ask: "this isn't really like a world… they're conflicting"):
  lab.html no longer loads dashboard-control.js or sound-control.js. Sound starts on the first click or key in the room; a
  SOUND / MUTED button in the bar (persisted) is the mute. The game page is untouched. `lab.js?v=16`.
- BULLET → **A LASER BLAST** (his pass note: "looks cool, but not like a bullet… rename it Laser Blast"): name, verb
  (LASERED) and line in gags.js; the id stays `bullet` so its rank, notes and verdict keep. It is in PASSED.
- **THE LAB'S EDGE PUSH IS GONE** (his ask, then his correction after the first cut also took the right-drag: "KEEP the
  hold-right-click… remove the incidental mouse motion… driving me crazy"): the mouse moves the cursor and the rifle
  follows; the camera turns only on a right-button drag or the keys. The CURSOR AIM / MOUSE LOOK switch left the lab
  (the game keeps both). W/S move, A/D or the arrows turn, Q/E strafe, [ / ] step weapons. `lab.js?v=15`.
- BASEBALLS again ("batter up! needs to be louder, the death yell is overpowering it"): `FILE_GAIN` in sound.js — a per-file
  level over the 0.9 house level; batterup 2.6. Note done.
- **FIVE MORE NOTES, THE SAME HOUR** (each `update` + done; sim 122,896 + smoke green after each):
  ROCKET ("pointing straight up and down… kids book… Quake") — the Meshy prop is out; `prim: 'rocket'` in PROPS builds a
  Quake rocket (olive body, red nose, four fins) nose along the flight axis, a flickering additive flame + hot sprite +
  a thin dark smoke trail out the back (`syncPropShot`); the first cut's white puffs hid it in the pane, thinned.
  KNIVES round two ("still can't see them… end over end… self lighted… slower") — `motion: 'endover'` (rotateX along
  the flight), the blade self-lit pale steel, 1.0 long, 6.5 cells/s, life 2.8. BASEBALLS ("more… different velocities…
  a man yelling batter up") — 20 balls, a per-gag `speedVar` in the bolt launch (0.9 = 55–145%; every other volley keeps
  the old 80–120%), and `batterup.mp3` (ElevenLabs TTS, Harry, `tools/eleven.mjs tts`) mapped in FILES and played by
  the baseballs recipe before the whooshes. PIE ("an explosion of blueberries… a wet splat") — `berries()` throws 36
  little spheres on the gib physics (they settle as litter) + purple puffs from `R.boom` for the pie; a lob's landing
  now plays `gag.splashSound` if set (pie: splat) instead of the explosion file, in world.js + lab.js. SAND ("allow it
  if the damage can be a hole in the creature") — outcome vapor → expire, verb HOLED CLEAN THROUGH, `holeAt()` hangs a
  black disc with a white-hot rim at chest height that sinks and fades with the fall. Cache tags bumped throughout.
- **FIRST NOTE ACTED ON — A HAIL OF KNIVES** (his note, rank 4: "too dark and too small. lighter metal and a bit slower"):
  the blade was metalness 0.9 with nothing to reflect down here, so it painted near black — now pale steel with its own
  glow (metalness 0.35, emissive), thicker (0.022) so it reads edge-on, the knife 0.55 → 0.8; speed 11 → 8.5 cells/s, life
  1.6 → 2.1 s (gags.js). Sim 122,896 + smoke green; `update knives` + note done. His first PASSED (chainsaw) landed the
  same minute — nothing to build on a pass.
- **The note box was being wiped every ten seconds** (his "as soon as it does a line break, the first line
  disappears… I can't see my comment before sending"): the page's poll re-rendered the weapon detail and cleared the
  box each time, so whatever he had typed vanished at the next poll and only what he typed after it showed.
  `showDetail()` never touches the box now. What is typed is a DRAFT per weapon (plus one for the general box) in
  localStorage: it survives the poll, a weapon switch (the box follows the weapon; the other weapon's draft keeps) and
  a reload, and clears only on submit. Pane test: two lines typed, two polls forced, both lines still there.
- **Boxes seven lines tall** (rows="7", drag to grow), **SUBMIT** buttons (were SAVE NOTE), ctrl+enter still
  submits, "nothing to submit" on an empty box.
- **THE RANK** (his ask, "so I can rank each one as well as give a note, and then we can do some sorting later"): a
  1–5 dropdown (— clears) beside SUBMIT under the weapon's box. Saves the moment it is picked (`ranks{gag: {rank,
  at}}` in notes.json, server op `rank`), shows as a gold number on the weapon's row, and rides along on any note
  submitted after it (`note.rank`; the note's meta line shows "rank N"). Nothing sorts yet. Claude's side:
  `notes.mjs ranks` lists every ranked weapon best first; `list` / `new` / `watch` lines show the rank in the brackets.
- **1 = best, 5 = worst** (his "1 good 5 bad, right?" — a ranking, so first place is 1; the first cut had no direction and
  the Claude-side listing assumed 5 was best): the dropdown says so on its two ends, `ranks` lists 1 first.
- server.mjs: the notes route gained the `rank` op, `rank` on `add`, and `ranks: {}` in the default shape (generic,
  any world); the server was restarted for it, the launcher's way. No core change, sim untouched. `lab.js?v=5`.
- The watcher (`notes.mjs watch` under Monitor) re-armed at the start of the session, his first ask.
- **PASSED and TRASH** (his ask: "add a 'passed' status so that I can move them there with the comments… a trash
  category for ones I want to be permanently removed"): a VERDICT switch under the weapon's facts — IN REVIEW /
  PASSED / TRASH. The list is now the four tiers (what is still in review) with PASSED and TRASH sections at the
  bottom, shown only when they hold something; a weapon moves there with its rank badge and every note it has (notes
  are keyed by weapon, nothing to copy); the header counts both. `verdicts{gag: {status passed|trash, at}}` in
  notes.json, server op `verdict` (review clears it). **Trash is out of the game from its next load**: the server
  writes `cuts.js` beside notes.json (`globalThis.JABBERWOCKY_CUTS = [ids]`), index.html loads it right after gags.js
  (a plain script, so it works from file://), and `liveGags()` in core.js takes those ids out of both rolls (the
  player's and the boss's; an emptied tier falls back to the rest; a forced gag — the lab — still fires). Back to
  IN REVIEW restores it. Claude's side: `notes.mjs verdicts` lists both groups with rank + notes; `watch` prints every
  verdict change. Sim TEST 12 (cut gags never roll, forced still fires, everything cut still stands) — 122,896 green.
- At ship, trashed gags get deleted from gags.js for real, on his word — not before.
- **THE ACTION DROPDOWN** (his "add another drop down for update, pass, trash to make it so I don't have to say it
  every time. make update the default"): beside RANK under the weapon's box — update / pass / trash, update by
  default, back to update after every submit and on every weapon switch. The note carries it (`note.action`, shown on
  the note's meta line) and the server applies the verdict in the same save: pass → PASSED, trash → TRASH (+ cuts.js),
  update → back in review. So a pass or trash note IS the comment that moved the weapon; the VERDICT switch stays for
  moving one without a note. The status line moved under the row to make room. `notes.mjs` lines show the action in
  the brackets (update = act; pass / trash = his comment, nothing to build unless the text asks). Server restarted.

## 2026-09-07 — Claude (Fable 5.1) — the map mirror, THE WEAPON LAB, the notes loop

- **Corner map left/right were backwards** (his first line of the session): yesterday's "ahead is up" flip was a
  Y-only mirror, which swaps left and right. Now a 180° rotation (`setTransform(-1, 0, 0, -1, size, size)`), so
  forward is up and left stays left.
- **THE WEAPON LAB, built on his go** (his brief: a big room, a couple of bad guys who don't fight back, an easy
  selector with info on each weapon, kills reset in 2 s, a notes field Claude reads and acts on, a check every 10 s,
  a notification + a clear indicator when a weapon is updated): `lab.html` / `lab.js`, linked from the admin panel
  Labs list. Core: `LAB_LEVEL` (17×17 bare hall, tall, theme 2, no key/door/boss/drift), `startLevel(state, 'lab')`,
  `makeLabGoon` (notice 0, `home` pad, faces you, wanders within 0.8 of the pad), `respawnLabGoon` (a fresh goon,
  new id, on the pad; type may change). Host: the list by tier with a search box, facts per weapon (tier, how, the
  victim's fate incl. alt outcomes, the numbers, what it does to you, the scar + hazard, sprite, sound, the line),
  Q/E step, 1–4 jump to a tier, R reset, a creatures picker (trio / all five / three of one kind), the plate, the
  real sound through the shared control, the lab heals you and a death is a hint. Whatever dies or dances comes back
  two seconds after it is dead/pacified. Lit brighter than the game (brightness ≥ 1.35, torches ≥ 1.4).
- **THE NOTES LOOP**: `notes.json` in the world folder + server route `/api/worlds/:slug/notes` (generic; GET, POST
  add/edit/delete/seen with read-modify-write). Per-weapon notes + general notes on the page, each note shows
  waiting/done + Claude's reply; the page polls every 10 s; an `updates[gag]` newer than `seen[gag]` = green dot on
  the row, toast, tab-title count, a browser Notification if allowed, a chime; opening the weapon marks it seen.
  Claude's tools: `tmp/jabberwocky/notes.mjs` (new / done / update / watch) — `watch` runs under Monitor and wakes
  the session on a new note. The server was restarted for the route (its own minimized window, as the launcher does).
- `tmp/jabberwocky/lab-smoke.mjs` (208 assertions: passive for 20 s, all 100 gags, respawn, type swap). Sim 116,893
  green. Verified in the pane: respawn at 2 s after dead, pacified back at 2 s, note save, update → toast + dot →
  opened → seen.
- **MOUSE FREE (his first flight: "I'm trapped")**: the lab no longer captures the pointer by default. Left click fires,
  hold the right button and drag to look, arrows turn, the panel is always live. A MOUSE FREE / CAPTURED switch in the
  bar (persisted); captured is the game's way (click the room, esc gives it back). `?nolock=1` forces free.
- **CURSOR AIM (his "what am I missing?" — the answer was the second mouse model, and he wants to feel it)**: a real
  cursor, the reticle rides it, the rifle swings to point at it (`vm.aim` / `vm.aimY`, eased), the shot leaves at the
  cursor's yaw (`player.aim`, added to the facing in `launchPending`), turning on the arrows or by pushing the cursor
  into the outer 10% of the screen (eased), right-drag looks; the maths in `cursor-aim.js` (yaw from the horizontal
  fov, cosmetic pitch, edge push). THE LAB defaults to it (CURSOR AIM / MOUSE LOOK in the bar). THE GAME keeps mouse
  look as the default and gets a **Mouse: LOOK / CURSOR AIM** row in configuration → PLAY (persisted; the cards' key
  line follows). Under cursor aim the game never captures the pointer, so nothing to esc out of.
- **"Why can't it shoot where the cursor is?"** — because the lab measured the cursor against the play area (the window
  minus the panel) while the camera fills the whole window: the view's centre was 200 px right of where the maths
  thought, so every shot went left of the cursor. Now measured against the window; pane test: a bullet with the cursor
  on each creature kills it, aim angle = true angle ±0.1°. The lab's loop also re-fits the renderer if a resize is
  missed (the pane's fake resize never reached it, which skewed the first test). The reticle's rest position is the
  window centre. Shots still fly level — hits are two-dimensional in this engine, so the cursor's height is cosmetic.
- **No music in the lab** (his ask): `Sfx.setMusic(false)` — no element is ever created; the music channel is gone from
  the lab's speaker.
- NEXT: his flight of the lab; then notes arrive and get acted on one by one.

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
