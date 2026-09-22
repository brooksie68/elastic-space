# Changelog — Carnage (was Rampage)

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-09-21 — Claude — ROUND TWO, built on James's first flight brief ("GREAT plan... have at it")

His brief: the monsters should move back and forth across the street; the climbing is weak; the punch is "a shrug",
he can't see any punching; punches on the arrow keys by direction; Space = jump and smash down; double-tap for a run
burst; the police attack right away and all the time; a detailed, highly colourful 16-bit look (backgrounds, buildings,
the plants are rectangles); real definitive damage; things, people and interiors in the windows; plain glass that
smashes, fist-shaped holes, and a lady screaming and waving that you can eat. The plan is plan.md "ROUND TWO".

- **THE KEYS** (`game.js`, `lab.js`, the CONTROLS panel, the hint): W A S D walk, climb, cross the street; the ARROWS
  punch by direction, eight ways (`input.pdx / pdy`; two arrows = a corner; hold to keep punching); Space jumps, and
  on a face / a roof / in the air it is THE SMASH; a double tap of A or D on the street is THE RUN BURST (the core reads
  the taps: 0.6 s at 2.2x, a skid, soldiers bowled over). J / K / click punch straight. Day one's first thirty seconds
  teach the keys on the plate, one calm line at a time (`LESSONS`, kind `teach`).
- **THE LANES** (core): `m.lane` 0 = at the faces, 1 = the road; S steps out (0.28 s crossing, `laneK`), W steps back,
  W held at the faces grabs. Cars, the SWAT truck and the drone's swipe are reached from the road; soldiers, the bot and the
  buildings from the faces (the stomp and the smash reach both). Bullets and shells carry the target's lane and miss the
  other one. The truck rams a monster in its way in the road (6 health); a car meeting one crumples (4 health, a wreck,
  no points). The companions never cross (`!m.cpu`).
- **THE ARCADE MOTION** (core + renderer): the climb is a HOP PER CELL — once started it finishes (`m.hop / hopT /
  hopDur / hopFrom / hopTo`, the hand alternates), the roof / the street at the ends as before; `grab` and `startFall`
  reset it. THE STRIKE-AND-REACH LAYER in `render3d.js` (`aimArm`, `rotateBoneWorld`): after the mixer, the striking
  arm's Arm / ForeArm / Hand bones are turned in world space so the fist arrives in the cell the rules hit (wind-up 22%,
  strike to 42%, hold to 72%, recover; the body leans and lunges); on a hop the free hand reaches the next sill first;
  the smash holds both fists up on the way down and slams them into the ground on landing (`slamHold`); a grip kick
  dips the body as each hop lands. Five new Meshy library clips per monster (45 cr, balance 1,192 -> 1,147): a left hook,
  a right uppercut, jump-and-slam, a ladder climb (paced to the hop: one cycle per two hops), a two-fisted forward
  punch (the stomp). The punch picks by direction: up = the uppercut, else hook / jab alternating; the street stomp =
  both fists. Slimmed through `slim_models.py` from `models/anims2/` (`CARNAGE_ANIMS_DIR`), the old clips untouched.
- **THE SMASH** (core): Space on a face, a roof, or in the air (above 0.8 floors): let go, drop at 1.8x gravity, and
  `smashLand` takes everything within 0.9 x reach in either lane — the ground-floor cells under and beside, soldiers
  (`smashed`), the truck (two hits' worth), cars, a rival on the street (12), a walking-off teenager. A smash gets a
  floor and a half more of free fall. Events `smash`, `smashLand { big }` (a dust ring, debris, a thud, a flash).
- **THE ARMY IN WAVES** (core `state.army`, `launchWave`, `WAVE_KINDS`): day one opens quiet — nothing until
  `armyStart` (40 s) AND `armyCells` (10) cells are broken; day n >= 2 waits 8 s. A wave, then a lull (`waveGap` 20 s,
  -1.2 s a day, floor 6), never the same kind twice running: a SQUAD (two on day one, both from one side, two bursts
  each and they pull back — `s.maxBursts`, state `leave`), the TRUCK (day 2), a SNIPER (day 2: a window near you
  opens on its own with a soldier in it), the DRONE (day 3), a SQUAD WITH A CRUISER (day 4). A wave ends when its
  units are gone or after 32 s. PLAY dials: the army starts / wave gap / the army from day (`armyDay`). The old
  soldier / tank / drone timers are gone; `spawnSoldier / spawnTruck / spawnDrone / spawnSniper / launchWave` are
  exported for the lab and the sim. Traffic stays on its own clock (14 s quiet on day one).
- **THE 16-BIT CITY** (`render3d.js` + `icons.js`): a saturated palette per family (`FAMILY_TINT / FAMILY_TRIM`,
  rolled a little per building; the tile only gives the value now — `uTint`, `uTrim`); a trim-coloured CORNICE with a
  dark underside; window frames, mullions, sills and lintels in the trim; FIRE ESCAPES on 45% of the buildings
  (landings, rails, stairs, a ladder); a drainpipe; painted SHOP SIGNS over three quarters of the plain ground floors
  (`shopAtlas`: DINER / BODEGA / LAUNDROMAT / PAWN / PIZZA BY THE SLICE / TATTOO / PHONES UNLOCKED / NAILS & WAX,
  `uShop`); the water tank in rust. THE SKY is painted bands with dither and a big sun with a ring (peach horizon by
  day, purple by night). THE SKYLINE is four painted layers of silhouettes (`Icons.skyline`: set-back towers,
  antennas, water towers, domes, a bridge on the third, hills on the fourth; window dots by day, lit by night; each
  layer's canvas sized to its plane so nothing stretches) at -70 / -150 / -280 / -470 m — the instanced far rows are
  retired (the code stays, skipped). THE PLANTS: code-drawn 16-bit billboards (`Icons.tree`: round, tall, palm on
  southern days, bush, flowers): bushes and flowers on the planters, trees on the near pavement now and then, a tree in
  every gap between buildings. The ground behind the buildings is a dim fog colour, not black.
- **THE DAMAGE** (the facade shader): a wall's first punch is THE FIST PRINT — a fist-shaped dent (palm, four
  knuckles, a thumb; mirrored by the seed) with a light lip, a dark inside and cracks radiating from it; the second
  punch is the hole in the same shape with a jagged brick rim and THE ROOM VISIBLE INSIDE; cracks run from any cell
  toward a broken neighbour (`texelFetch` of the four neighbours). Windows shatter with a sheet of glass (26 shards)
  and teeth top and bottom; the wall sheds tinted chunks. Rooms are painted now: wallpaper stripes and diamonds, a
  framed picture, a lamp on a side table, a bed, a bar with bottles, the TV.
- **THE PEOPLE**: a lit window shows a person doing something (`person()` in the shader, six rolls: typing at a
  laptop, on the couch by the screen, cooking with steam, a couple, a cat on the sill with green eyes, or nobody).
  THE SCREAMER is a new deal (`screamer`, 42 weight on day one = about a third of the windows, -8 a day to a floor of 6):
  she appears in the hole, arms up, waving (four frames, `Icons.screamer`, 9 fps), a scream one-shot on the reveal
  (two ElevenLabs takes + a synthesis fallback), scores like the waver while you hold the cell, a punch eats her
  (500, +12; plate "SHE SCREAMED. SHE'S EATEN."). THE BUG THAT HID EVERYONE: the window things sat at z = -1.2 m
  behind the opaque facade plane and were never visible in-game; they now sit at +0.14 m inside the opening, bigger
  (0.78 / 0.86 of a cell), the people sway.
- **Sounds**: `scream1 / scream2 / slam / skid` (ElevenLabs) + recipes for `grip / burst / skid / slam / scream`.
- **Verification**: sim TEST 23 (the lanes, bullets by lane, the ram, the 8-way punch, the smash, the burst, the
  grace + waves + kinds, the screamer's weight) — 1,908,149 green; tests 6 / 10 / 11 / 12 / 13 updated to the new rules
  (the stomp for the ground floor, waves instead of timers, the road lane for cars and the truck). The look-dev page
  got PUNCH / LANE / SMASH / BURST / SCREAMER / WAVE / CLIMB buttons and `LAB.drive(input, seconds)`;
  captures in tmp/snapshots/r2-*.jpg (the strike, the stomp, the road lane, the day and night city, the damage
  close-up). The smoke page ran a game through the keys, a lane crossing, a climb, punches and the first wave with no
  errors. The Damage Lab's verbs follow the keys (new: Cross the street, The run burst, The stomp, The screamer, The
  waves; "Let go" is now "The smash"). Cache tags ?v=2.
- **His first read, the same night** ("huge improvements all around"): the monsters shrank a little on every action.
  Measured in the lab: the IDLE clip carried a hips scale track of 1.176, so the standing pose was 17% bigger than
  every other clip and every action was a shrink back to true size. Scale tracks are now stripped from every clip at
  load (`rigged()` in render3d.js); idle / punch / walk all measure 10.3–10.9 m. Tags: game.js?v=3, render3d.js?v=2.
- **His next two asks, same night, built**: (1) the camera never loses a climbing monster — after the eased follow, a
  projected clamp keeps the head under the top edge and the feet above the bottom (two passes in `stepCamera`); a
  climb onto an 11-floor roof keeps the head at 72% of the frame at worst. (2) DOWN-RIGHT / DOWN-LEFT on the street
  are directional stomps: both fists come down to that side and the ground-floor cell that way breaks (a plain DOWN
  still takes the cell under you and its neighbours). Sim +1 assertion. Tags: game-core.js?v=3, render3d.js?v=3.
- **The stomp, three rounds with him watching**: the two-fisted clip read as a hand clap (one target; then two
  targets a shoulder apart), then the ground-stomp clip read as a shuffle (its foot lift comes late and the punch
  window cuts it off). Now THE STOMP IS A DRIVEN LEG: the bone layer kicks the near leg up ahead (38% of the punch),
  slams the foot to the ground on the beat, holds, releases; the body drops and steps toward the side of a diagonal.
  Leg chains (`UpLeg / Leg / Foot`) join the arm chains in `view.bones`. Captures r5-stomp-lift / r5-stomp-slam.
- **Where things stand**: AWAITING HIS FLIGHT of all of it. Not done from the plan: the collapse shedding frames and
  signs as debris (item 6's last line). Open after his flight: the lane feel (the crossing time is `laneT`), the wave
  pacing dials, whether the ladder clip or the old climb clip reads better (`ladder` is the default when present).

## 2026-09-08 (later that night) — Claude — his first two asks before flying it

- "This looks amazing!" — then, before playing: the characters larger, half again at least. Answered with the
  natural size: standing on the street, a monster's fists should sit in the middle of the second-floor window,
  which with hands at 55% of the body puts it at 2.7 floors tall — exactly half again the first cut's 1.8.
  Built as a dial: `opts.monsterH` (default 2.7; configuration → PLAY → Monster size, 2–4 floors). The hands
  (`monHand`), the reach (`monReach`), the hitbox, the drone's hover height and swipe reach, the soldiers' and
  the truck's aim, the blimp catch and the rival punch all follow the size. On the street the giant now
  SMASHES DOWN (the stomp clip) instead of jabbing above the storefront. The sim's helpers place a monster
  by the cell its hands reach (`placeAtCell`); 1,904,917 assertions green. (He asked whether they grow as
  the game goes — no, never did, the cabinet never did; the potion he remembered is a later game.)
- "I can't read the controls well at all": a CONTROLS button, always at the bottom right, opens a panel with
  every key in readable type (sized off the same base as configuration, so the text-size dial moves it too),
  pausing a live game; click-away or Esc closes it. The hint line at the bottom left is bigger and brighter.

## 2026-09-08 (night) — Claude — BUILT, the whole thing, on James's brief

His brief in the evening (plan.md, THE BRIEF at the top): variety on, companions none / one / both,
free mode first and a small campaign later (his), not a 100% copy — keep it retro but put the time into
detailed building damage, creatures and backgrounds, a cool HUD, PG-13 cynical and funny, a Damage Lab,
2026 as the time period, "take your time and check your own work throughout." Built solo through the
night; he has not seen any of it.

- **The core** (`city.js` + `game-core.js`, pure): the 57-city road trip (Peoria → … → Plano's wellness
  day, then it loops), six building families with patterns and spandrel bands, three restaurants a street
  (one of each brand, rival bonus, your own pays nothing, companions go for yours), the deal table (24
  things behind a window, weights by the day: remote workers, phone zombies, on-brand food, cash, crypto,
  e-bike batteries, air fryers, live exercise bikes, cacti, vapes, wellness smoothies, livestreamers with a
  ring light, soldiers in windows, the supplement, the corridor of light), the grid moves (street / grab /
  climb / sideways / the roof / jump / let go / fall with the two-floor rule), the punch with aim, cracks and
  holes, neon on and off, the collapse past 55–65%, the revert to a tired teenager who walks off (and can be
  eaten), lives and the drop-in, the National Guard with spread and a cap, the SWAT truck's lob, the drone's
  swipe, traffic (cruiser / taxi / delivery bot), the blimp, the subway, the day end + the map, the variety
  dial (the clown hits harder, the girl climbs faster, the king runs faster), the autopilot that plays the
  companions, the attract demo and the sim. `tmp/carnage/sim.mjs`: 22 tests, 1,903,403 assertions green.
  Two things the smoke run caught before the sim did: soldiers shredded everyone (322 bullet hits in 90 s →
  spread, slower bullets, shorter bursts, a cap of two on day one) and the wreckers barely wrecked (the sweep
  now clears the row it is on, skips lit neon, then goes up a floor).
- **The picture** (`render3d.js`, three.js): the facade shader draws every cell — glass with a sky
  reflection over a parallax room (seven room styles, a lit fraction that rises at night, TV flicker),
  curtains, half blinds, air conditioners; walls crack then hole with innards and rebar; a punched window
  gets a ragged dark rim, soot, a few teeth on the sill, a blind hanging out, the room behind wrecked and dim;
  neon signs from a canvas atlas (PIZZA / VAPE / OPEN 24 HRS / NAILS / GOLD 4 CASH / PSYCHIC / NOW HIRING /
  TAX HELP), storefronts with striped awnings and the brand mark. Buildings are boxes with the family tile on
  the sides, a roof tile, parapets, water tanks / AC plants / vents / a beacon mast. The collapse squashes the
  building over 1.9 s shedding debris, dust, shards; then the rubble mound. The street: pavement, kerbs, a
  22 m road with dashes, lamps (lit pools at night), hydrants, bins, the near pavement with planters and a
  fence and the real Meshy taxi + cruiser parked among block cars. Two far rows of instanced blocks with lit
  windows, fogged; a sky dome with sun / moon / stars; clouds; day and night palettes. Monsters, the teen and
  the soldiers are rigged Meshy models with clips; the five statics; the things in the windows are canvas
  icons with glows; bullets are streaks, shells trail dust, the drone has rotor discs and a blinking light,
  the cruiser flashes red and blue. The post chain: bloom + vignette + ACES + sRGB in the composite.
  Three self-critique rounds through the silent look-dev page and native captures (tmp/snapshots/c1-*, c2-*,
  g1-*): the first frame was black (tone mapping and sRGB must live in the composite — render targets are
  linear); George rendered a hundred times too big (Meshy rigs keep the geometry at a hundredth under the
  armature — fit by the skinned vertices); the spawn flicker never restored visibility; cloned tiles never
  got their image; the near band was a black void; the far rows competed; the blinds were white; the holes
  had no rim; the monsters went black at night (their own atlas as a low emissive fixes it).
- **The look-dev page** `tmp/carnage/lookdev.html` (KEEP): autopilot, every look dial, BREAK / WALL /
  COLLAPSE / BOOM / FLASH / SOLDIER / TANK / DRONE / CAR / REVERT / NIGHT / NEXT CITY, `?snap=name`.
- **The assets** (Meshy, 522 credits of his 550 cap; balance 3,146 → 2,624): three concept images
  (nano-banana-pro, T-pose, no text) → image-to-3D (meshy-7) → rigs → nine clips each (idle, two punches,
  climb, eat, hit, fall, jump, stomp) + walk/run; the soldier (text-to-3D, remeshed to rig, fire + fly-up), the
  teenager (the first came with folded arms and would not rig — regenerated on meshy-5 with an explicit
  T-pose, textured, rigged, a tired walk); five statics (SWAT truck, drone, cruiser, taxi, delivery bot) at
  ~32k tris; ten seamless tiles (concrete and glass cropped of their borders). Slimmed by
  `tmp/carnage/slim_models.py` into `assets/models/` (18 MB). Raw downloads and the manifests stay in
  tmp/carnage/ (gitignored).
- **The sound** (`sound.js`): 54 ElevenLabs one-shots (`tmp/carnage/sfx-batch.mjs`) with a synthesis recipe
  behind every id; the clown laughs, the girl speaks as Lily ("Let's make it a fresh one." / "Mmm. Never
  frozen." / "Oops. That one was somebody's." / "I'm telling my dad."), the king creaks; beds for traffic, the
  rotor, the siren, the dust roll, a neon hum at night. No music (his call) — the hook waits for a
  `theme.mp3`.
- **The shell** (`index.html` + `game.js`): the loading gate, the attract demo behind the start card, the
  picks with portraits rendered from the models, company ALONE / ONE RIVAL / BOTH RIVALS, FREE MODE with
  CAMPAIGN · SOON disabled, the HUD (three monster cards with health and lives, score, day, city + its
  tag, the news ticker), the plate (one cynical line at a time: "REMOTE WORKER. STILL ON MUTE." /
  "REGIONAL MANAGER PROMOTED TO RUBBLE." / "SHIFT'S OVER. CLOCK OUT."), floats, the hurt vignette, the
  ring-light whiteout, the day tally card, THE MAP (a hand-drawn US outline, every city a dot, the road so
  far dotted, the next leg drawn), pause ("ON BREAK"), two-step restart, configuration (PLAY: lives, variety,
  collapse, falls, the army, hazards, the livestreamer window, the deal, start day, seed, text size; LOOK:
  fourteen dials + day/night + presets), the four ways out (the subway, the corridor window, the blimp, a
  smudge on the skyline). Nothing saved between visits.
- **THE DAMAGE LAB** (`lab.html` + `lab.js` + `verbs.js`, admin panel → Labs): one street, the monster you
  pick, 53 verbs in five groups with plain facts and STAGE IT (Enter), the game's keys, a rival that is a dummy
  or a wrecker or absent, the army only when staged, ranks 1–5, IN REVIEW / PASSED / TRASH, notes with
  drafts, the general box — the notes loop through `/api/worlds/carnage/notes` (`notes.json`) and
  `tmp/carnage/notes.mjs watch` on Claude's side.
- **Verified**: sim green; the smoke page (`tmp/carnage/make-smoke.mjs` → `smoke.html`) clocked in, moved,
  climbed, punched, ran the autopilot, ended a day into the tally and the map, drove to day two, lost three
  lives into the FIRED card — no errors; the Damage Lab loaded silent with every verb listed and three staged;
  `npm run check-worlds` shows only the draft's registry line.
- **Where things stand**: unjudged. His flight decides the feel (keys, pace, the army), the look (rooms,
  holes, the night), the copy, the names. The campaign is unwritten. Then ship (registry, admin note off,
  World Ideas #66 → live).

## 2026-09-08 (later) — Claude (with James)

- THE NAME: CARNAGE. James's call reading the plan the morning after ("We'll call this one
  Carnage!"). Folder `src/worlds/rampage/` → `src/worlds/carnage/`, slug, world.json title +
  summary, the holding page, the admin row (now after Asteroids in In progress worlds), World
  Ideas #66, the repo CLAUDE.md running-list entry. Nothing was built, so nothing else moved.
- His calls: #2 score KEPT across lives, and nothing is saved between visits ("this is a world,
  there's not going to be any saving long term" — the localStorage high score is out of the
  plan, session-only now); #4 no Suno track for now; #5 Meshy spend ~540 cr is fine with a HARD
  CAP of 550 — stop and tell him before any call that would pass it (his balance 3,100 at his
  count); #6 the name. #1 (the flavour dial) and #3 (companion monsters) he didn't follow —
  explained in plain words, awaiting his numbers; the plan's defaults stand until then.
- Where things stand: still nothing built, no credits spent. The build starts on his answers
  to 1 and 3 (or his "you pick").

## 2026-09-08 — Claude (with James)

- The plan: James asked for a detailed one-shot plan for a pretty faithful Rampage with the
  2026 treatment (Surround / Moon Battle 2075 as the reference). Written as `plan.md`
  (first at tmp/rampage/, moved here): faithful 1986 rules in a pure sim-tested core, a real
  3-D side-on city, collapse as the set piece, Meshy rigged monsters, four played-through
  exits, the configuration panel, verification list, his calls.
- The monsters: his riff went Bezos / Trump / Musk, then "a giant Ronald, a giant Wendy, and
  a giant King" — "love this idea." Folded in: three mascot monsters (described, never
  named), a restaurant of each on every street with a rival bonus, on-brand window food,
  the revert as a tired teenager in uniform clocking out, three voice sets (the king never
  speaks), restaurant fronts in the Meshy estimate (~540 cr).
- Set up on his word ("add this to the in progress world, set it up. We're going to build
  it."): folder scaffold, world.json draft, CLAUDE.md, this changelog, a holding
  index.html, admin row under In progress worlds ("unwired"), World Ideas #66.
- Where things stand: nothing built, no credits spent, the six calls in plan.md unanswered
  by his choice. Next session starts from plan.md on the stated defaults.
