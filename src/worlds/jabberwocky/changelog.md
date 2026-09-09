# Changelog — Jabberwocky

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

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
