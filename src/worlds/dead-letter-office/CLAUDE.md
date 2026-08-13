# The Dead Letter Office — Claude instructions

A walkable 3D basement mail hall (three.js). Undeliverable mail falls from a ceiling chute
into the wire basket; the postmaster walks his shift; opened letters can be read, and a few
return addresses still work.

## Docs

- `changelog.md` — session history, newest first.
- `README.md` — world overview and structure.
- `assets/props/props-manifest.json` — Meshy task ids for every generated asset (props are
  UNTEXTURED previews, textured in-engine; a proper Meshy refine is 10cr/prop later).
- `assets/radio-music/` — Suno tracks James authors for the office's AM radio (BUILT
  2026-07-27: 1950s bakelite set on the file cabinet bank, click toggles, "radio"
  channel on the sound control, distance × facing falloff — volume follows where the
  camera looks since r12). Each source mp3 gets a baked `-radio.mp3` sibling via
  `node tools/radio-bake.mjs <file>` — the radio plays ONLY the baked versions.
  The r12 house chain (James's "tinny 1955 AM" ask): `--hp 550 --lp 2400 --box 6
  --squash 24 --drive 1.7 --static -30 --crackle 2.5 --kbps 96 --clip 1`. Always
  pass `--clip 1`: without it the narrowband bake can't reach source RMS and lands
  5–7dB quiet (James hears loudness shifts). Since 2026-07-30 the radio is a
  SEQUENTIAL broadcast — `RADIO_PROGRAM` in world.js: song → DJ sign-off of
  that tune → two ads → DJ intro of the next → song, looping (James's spec:
  the sign-off must come BEFORE the ads). dj1–8: odd = sign-off, even = intro,
  dj8 loops the set; all speech (djs + ads ad1–8) is voice Bill (Social Media)
  `AGhk9wKpcIV2UvBus4CY`, eleven_v3, stability 1.0 via tools/eleven.mjs.
  Program order is load-bearing (the DJ references): never shuffle, and
  tune-in must start on a `song:true` entry. When James drops a new track,
  bake with those flags and splice it into `RADIO_PROGRAM` — which means new
  DJ copy (a sign-off and an intro) on either side, not just a list append.
- `tmp/dead-letter-office/gait-sim.mjs` — the foot-plant sim (r21): replays the
  postmaster's walking drive math against per-frame foot data baked into
  motion-meta.js and asserts planted-foot world drift in mm (James's law: a
  planted foot is frozen). Run after ANY motion-pack rebuild or drive-math
  change: `node tmp/dead-letter-office/gait-sim.mjs`.
- `tmp/dead-letter-office/nav-fuzz-sim.mjs` — the durable constraint/nav sim (rebuilt
  2026-07-27; the original was scratchpad-only and lost). Run it after ANY furniture,
  keep-out, or nav change: `node tmp/dead-letter-office/nav-fuzz-sim.mjs`. It reads
  world.js source directly, so no constant-copying drift. (A stray copy lives in
  `tmp/dead-letter-office/_files/` from a folder shuffle — its relative path is
  broken there; the canonical one above is the live sim, restored 2026-08-03.)
- `tmp/dead-letter-office/archive-lookdev.html` — silent look-dev harness for the
  archive stacks (served: `/tmp/dead-letter-office/archive-lookdev.html?view=0..2`).
  Evals the live archive section out of world.js. KEEP IT — it is how archive changes
  get eyeballed without loading the sound world in a pane.

## Planned (James, 2026-07-22): the behavior weekend

UPDATED 2026-08-12 (r22): James re-upped this with specifics — current gestures are
"kinda wishy washy"; he wants a real hand gesture, an armful-of-letters carry, a
hopper built onto the furnace side to drop them into, mug held at the coffee
station, a donut raised to the mouth with chewing, camera-look moments, and
speech clips paired to specific actions. See changelog r22.

A dedicated weekend session on the postmaster's behaviors — much more natural: needs-based
routine picking (coffee level / basket fullness / boredom) instead of weighted random,
dumping the basket down the furnace chute (chute slot itself still to build, south wall
between the ZIP and IDLE HANDS posters), drinking the coffee he pours, answering a wall
telephone (his half in the bubble only), and — someday — a rare Jerry visit: flat white
line-drawing billboard walking through the 3D room, unacknowledged. Also parked: GPT
posters (PNGs → assets/posters/), the cat (low-poly procedural path recommended).

Also approved in spirit (2026-07-22, plans pitched, James went to bed before answering):
**ElevenLabs voice** for all his lines — James picks a homey gruff older voice from the
library, then: consolidate line pools into one module, bake per-line mp3s keyed to text,
"voice" channel on the sound control, tune delivery on 3-4 test lines first. **Letters
lore expansion** — deck 12 → ~30 with 3-4 threads (both halves of correspondences that
never met; thread deals in order once opened), plus his own desk letters: an unrequited
correspondence (proposed name June — pending his verdict) with the open question of the
knife: unsent replies, or replies returned "moved — left no address" (Claude's vote:
the second — the office holds their whole almost-romance). Get his answers first.

## World-specific rules

- **The postmaster's name is John Dough** (James, 2026-07-28 — John Doe spelled like
  the bread; the wall sign above the desk is canonical). Keep the spelling.

- **The twelve letters are authored (2026-07-04) and protected** — never generate or reword
  them. The four airmail letters carry the drift exits; the stairwell door is the fifth.
  The deck grew to 58 on 2026-07-30 (25 "later acquisitions" then 21 "shelf-box strata" —
  Santa/chains/divorce/evictions/resignations/confessions sampling the archive box labels)
  and to 68 on 2026-07-31 (the "length strata": James wants realistic length VARIETY —
  two-word scraps through four multi-page sagas; the letter panel scrolls, so long is
  safe). All growth was James's ask, Claude-written in the house voice; includes the KDLO
  listener letter and the Novak/Kessler pair that never met. James signed off on the
  full 68 on 2026-07-31 — the protection now covers the WHOLE deck: additions come only
  from James's explicit ask, rewording never. Length spread is part of the deck's
  character — new letters must not regress to uniform paragraph-scale.
- (The 2026-07-21 "face/eyes: hands off" rule and its parked eye-rig viewer are RETIRED
  2026-08-12 — that was the Meshy-era head; the CC5 face is fully rigged and James now
  wants MORE face work: iClone facial experiments + camera eye-tracking, see changelog
  r22. The old viewer sits in `tmp/dead-letter-office/_files/meshy-OLD/`, admin-panel
  pill removed.)
- **PM_V2 (2026-08-04): John Dough, the CC5 bake, is the live postmaster** —
  `PM_V2` in world.js picks john-dough.glb + the animation pack. v2 has no
  Meshy dual atlas — world.js recreates the emissive trick by hand; bones are
  CC_Base_* names. (The Mixamo/ARP retarget era ended r16 — its scripts stay
  in tmp/dead-letter-office/cc5-bake/retarget/ for reference only.)
- **r15–r16 (2026-08-07/08): the do-over body + THE ICLONE MOTION PIPELINE** —
  john-dough.glb is the FULL-FAT v2 bake (standard-height skeleton, Beard &
  Brows white beard, uniform-pack clothes, native 2048 textures, ~88MB —
  James's "one high-res character in a low-res room" call; bake scripts
  durable in tmp/dead-letter-office/cc5-bake/bake-v2/, bake_full.py is the
  shipped one). **Motions come from iClone now**: James auditions/trims in
  iClone (CC5 → File → Export → Send to iClone; NEVER import an FBX there),
  exports per-motion FBXs (Blender preset, 60fps, Range brackets, no
  textures) into tmp/dead-letter-office/iclone-motions/, and build_pack.py
  turns the folder into assets/postmaster/iclone-pack.glb — it pins walk
  clips in place AND normalizes each clip's iClone stage yaw by measuring
  the animated hips vs rest (do not skip that step; every iClone export
  carries a different yaw). Blender 5.1 note: action.fcurves is gone, use
  the script's all_fcurves(). **ALL EIGHT CLIPS LIVE since r20 (2026-08-10)**:
  walk + idle-1/2/3 + walk-start/walk-end (three-phase gait — the world
  drives his ground position from each take's measured foot-travel curve in
  assets/postmaster/motion-meta.js, regenerated by build_pack.py; never
  reintroduce a plain crossfade start/stop), walk-think (25% amble, own
  measured tempo via clipCruise), talk (under any station line via pmSay).
  build_pack.py measures ground speed from the PLANTED FOOT, not the root —
  these iClone exports are already in-place, root travel reads ~zero.
  **pmSplay defaults
  0 since r16** (iClone motions fit his body natively; the knob remains for
  imported clips — it gates on !pmStillOn or it windmills in museum mode).
  **pmHeight dial** (default 1.90) rescales him live; walk timeScale derives
  from the clip's measured treadmill speed (0.324 m/s per meter of height —
  re-measure via the changelog r16 method if the walk clip ever changes).
  pmStill (FREEZE button) = museum mode: teleports him to open floor,
  idle-1 held at STILL (never the A-pose), every click force-answers from
  QA_ROTATION.
- **r17 (2026-08-08): THE VOICE IS THE ONLY CHANNEL — speech bubbles are
  DEAD, permanently** (James: "they won't be coming back"; speak() routes
  to recorded audio only; the line pools are his future recording script).
  Mouth = the AccuLips viseme pipeline: per-line FBX from iClone (Range
  bracketed FROM THE AUDIO CLIP START, Delete Unused Morphs UNCHECKED; the
  full click-path recipe is `tmp/dead-letter-office/iclone-speech/README.md`) →
  tmp/dead-letter-office/iclone-speech/build_speech.py → assets/
  speech-clips/visemes.js (60fps morph tracks + jaw scalar; script-tag
  loaded). applyVisemes syncs to audio.currentTime + lipSync dial (James's
  machine needs ~0.4s — his audio chain's latency, persisted). lipPunch
  dial = articulation gain. **Post-mixer bone writes must be ABSOLUTE
  (base × delta), never a bare quaternion multiply** — relative writes
  compound whenever a near-frozen clip stops rewriting the bone (the
  swallowed-jaw demon; splay windmill was the same bug). The amplitude
  jaw-flap survives ONLY as fallback for unbaked lines — James rejected it
  as a primary on sight. **r18 (2026-08-10): 13 lines live and viseme-baked**
  (James's ElevenLabs + AccuLips batch; recipe in tmp/dead-letter-office/
  iclone-speech/README.md; six new lines joined PM_AMBIENT; TTS-era
  monologues retired to PM_MONOLOGUE_SCRIPT pending re-record). radioOn
  restored to true at load 2026-08-10 (James's call). REMAINING TEMP STATE:
  clicks answer from QA_ROTATION (all 20 since r22) while frozen — normal pools resume
  when his QA verdict lands. SPAWN_DEFAULT is his captured corner
  (2026-08-10); the tuner's capture-spawn button lets him re-bank it.
  Optimization pass is queued (his go given, checkpoint REQUIRED first and
  exists: tmp/dead-letter-office/checkpoint-2026-08-08/); morph-normals
  rebuild tabled as the next mouth-fidelity lever.
- **r23 (2026-08-12): the OPENING SEQUENCE + CAMERA-LOOK.** `introPhase` machine in
  pmTick: 2s after load John walks desk→H3, pivots to the visitor, delivers Duluth
  with head+eye camera-look, then walks on to the furnace (routine + ambient held
  until it resolves; freeze cancels; reducedMotion skips). `headLookTick` (post-mixer,
  after pmTick) aims CC_Base_Head (0.75) + CC_Base_L/R_Eye (0.3) at the camera
  whenever `pmFaceCamera > 0` — bounded world-delta localized per bone, recomputed
  from the clip pose every frame (never a compounding write). Click answers get the
  look for free. Awaiting James's flight verdict.
- Postmaster integration facts (learned the hard way, sessions 07-17/18):
  1. Meshy materials carry the color atlas twice — `map` AND `emissiveMap`. Since r4 the
     emissive copy is kept ON at partial strength deliberately (James: he must always be
     visible; `pmGlow` tuner drives `emissiveIntensity`, default 0.42). Anything that swaps
     his atlas must swap both maps, and never zero pmGlow "for realism."
  2. One-shot actions MUST `fadeOut` in the mixer `finished` handler (clamped end poses
     otherwise pile up in the blend and every later gesture reads tiny).
  3. Never hold a looping action at timeScale exactly 0 — use a hair above (STILL=0.0001).
- The postmaster's movement uses a hand-laid nav graph (`NAV_NODES`/`NAV_EDGES` in world.js)
  and the camera uses circle+box keep-outs (`CIRCLES`/`BOXES` → precomputed `BOX_PUSHES`:
  only faces inside the walls and not buried in a neighboring box are push targets — naive
  least-penetration pushes trapped the camera two different ways). If you move furniture or
  stations, re-run the fuzz sim (scratchpad pattern in the 2026-07-21/22 changelog entries)
  before shipping. Adjacent keep-out boxes should OVERLAP, never leave a sub-body-radius gap.
- Never make the fluorescents (or anything) flicker/strobe — hard James veto from the 2D
  era ("makes me feel like I'm gonna have a seizure"). The furnace's slow ember waver is
  the approved exception.
- Room look is tuned live via the "tune the office" panel (localStorage `dlo-room-tuner-v2`;
  the key version-bumps whenever defaults change materially, or stored values mask them);
  bake James's numbers back into `TUNE_DEFAULTS` when he settles them.
- The basket pile is real accumulation (per-layer, `PILE` in world.js): letters land bottom
  layer first, mound past the rim, spill to the floor. Never bring back silent despawn of
  visible letters — the cage is see-through.
- The archive stacks (r10–r11, 2026-07-27): shelf/box/crate placements live in
  `assets/layout.js` (kind "furniture"; script-tag loaded, file:// safe;
  `DLO_DEFAULT_LAYOUT` in world.js is the fallback — keep the two seeded lists in
  sync when defaults change). **James edits the layout himself in arrange mode**
  (`?arrange=1` served, "arrange" pill on the admin panel row; `arrange.js`): never
  hand-edit item coordinates casually — the layout is his. Camera keep-outs DERIVE
  from item footprints (`itemKeepOut` + `mergeItemBoxes` in world.js — replicated
  verbatim in the sim; change one, change both). Run the sim after any layout,
  FURNITURE, or keep-out change.
- The furnishing expansion (r13, 2026-08-03 — James: "arrange everything in a
  perfectly human way"): nearly everything is a placeable now — the desk, his
  chair + all the desk dressing (`svc-lamp`/`svc-mug`/`svc-papers`/`svc-rts`),
  the file cabinet bank, THE RADIO, couch, plants, all three tables, bookshelf,
  parcels, tabletop `svc-*` clutter, the rug, the pigeonholes, and the house
  sign + JOHN DOUGH sign as wall art (`art-housesign` / `art-postmaster`).
  `surf: true` types have NO camera keep-out, carry a `y`, and raycast onto
  surfaces when dragged (the rug is surf-flagged — walkable — but lives in
  the furniture palette). GLB types (`glb:` in the def) clone Meshy props; the
  radio's def flags `keepMats` (Meshy atlas stays) + `radio` (click-toggle,
  glow mats, RADIO_POS follows the item; removeFurnitureItem calls
  record.cleanup to deregister). The banker's-lamp light anchors to the first
  placed `svc-lamp` and goes dark with none. Pigeonhole filing slots ride the
  first placed `pigeonholes` item (PIGEON_LOCAL_SLOTS → world in
  refreshDynStations); with none placed the basket routine burns everything.
  Round-five additions: `rug-2` (1920s oriental, drawn 4-way-symmetric),
  `coat-rack`, `radiator`, and the corkboard as `art-corkboard` wall art.
  Fixed set is down to: basket, furnace, clock, drum-counter tallies, STAIRS
  plate, windows/door/welcome mat. server.mjs `furnitureTypes` must list
  every type — new placeables need a server entry too (and a server restart).
- **The desk faces the room since r13** (James, per the original art): John
  Dough works behind it, back to the north wall, chair in the gap — all as
  layout items now.
- **THE POSTMASTER IS REHIRED (2026-08-04)**: `PM_ENABLED = true`, `NAV_WARN
  = true`, sim 44/44 against James's furnished 60-item layout. His window
  station lives at the SOUTH-WEST window now (−5.6, 4.8, via H4 only) — the
  oil tank owns the west window and James's layout always wins; when a
  placed item lights red, bend the pm's static stations/edges around it and
  re-run the sim. Art-seeding still fires only when no layout file exists.
- Arrange mode since 2026-08-04 also has: per-item lock (L key / button,
  orange outline, `locked` in the layout JSON), spawn-IN-HAND (palette click
  → item rides cursor, click sets down, Esc cancels), Ctrl+S save, R/F eye
  height (now a world-level control, live view too), Shift sprint, wall art
  dragging on wall planes with height in the drag, art mounting on vertical
  FURNITURE faces, footprint-aware wall clamping, world-click→palette
  highlight, shade to 2.5 (server caps 2.6). Ceiling fixtures ghost to 10%
  only while the camera is inside their ~1m bubble (per-fixture mat clones).
- Prop import pipeline (proven ×8 on 2026-08-03/04): James generates on the
  Meshy canvas → drops GLBs in `tmp/dead-letter-office/_files/` → headless-
  Blender render-verify, then bake (decimate only if heavy, 1024 WebP) →
  `assets/props/*.glb` (no hyphens in filenames — the material-stem regex is
  `\w+`) → FURNITURE/WALL_ART def (+ server allowlist + restart). `wear:`
  on a keepMats def composites the rust tile over its atlas at load
  (wastebasket = 15%). Floor lamps cast real light — pool of FOUR
  PointLights anchored to the first four placed. rust-tile.jpg was regraded
  in place (desat + umber) — regrade beats regenerate, zero credits.
- **Dynamic stations (r13)**: `desk`, `coffee`, `couch`, `cabinets`,
  `pigeon` and `corkboard` anchor to the first placed desk / work-table /
  couch / cabinet-bank / pigeonholes / corkboard-art item
  (`refreshDynStations`, called from rebuildKeepOuts). The stand-off sits on
  the item's front side (the desk's rotY convention faces its user); if no
  straight hub walk is clear the wiring routes around the item via a `…Side`
  node instead of clipping through it. No item placed → the routine drops out
  of the rotation and the postmaster homes at wander1. `PM_LANES` exists but
  is empty (camera-only floor machinery, sim-extracted — keep in lockstep).
- **Arrange mode has "clear the room"** (r13, James's ask): removes every
  placed item after a native confirm; nothing persists until "save layout".
- Box labels live in `ARCHIVE_LABELS` (James-approved
  tone includes DICK PICS (CONFISCATED) — do not sanitize; 72 entries since r12, the
  atlas caps at 80 tiles so at most 72 labels + the 8 plain/top tiles). The whole
  archive draws from one canvas atlas: never give boxes per-mesh materials. The
  radio keeps its own Meshy textures — PROP_MATERIALS must never grow a `prop_radio`
  key, and its emissive stays faintly on (0.22 off / 0.42 playing).
- Wall art is placeable (r12, 2026-07-28): `WALL_ART` catalog + `buildArtItem` in
  world.js; art items ride the same layout file with an extra `y` (hang height).
  `DLO_DEFAULT_ART` seeds the classic placements ONLY when no layout file
  exists at all (a saved art-less layout stays bare on purpose — the
  blank-canvas rule, 2026-08-03). In arrange mode art snaps to walls,
  wheel = height; furniture wheel-rotation snaps to 8 stops (45°) — James's rule,
  don't reintroduce free rotation. Remaining fixtures (clock, drum-counter
  tallies, STAIRS plate) are NOT placeable on purpose; the house sign, JOHN
  DOUGH sign, and corkboard moved into the art catalog in r13. server.mjs
  `furnitureTypes` must list every art type.
- Drag look is swing-only (James 2026-07-28): no grab mode, no toggle — do not
  bring the switch back.
- Tile textures follow the never-black rule: procedural canvas fallback first, Meshy tile
  overlay on load. Prop materials clone the wood tile — clones are registered on
  `texWood.userData.clones` so the overlay marks them dirty too.
- The old 2D pixel/plate world lives only in git history (pre-2026-07-21); its Blender build
  artifacts remain in `assets/room/` and `tmp/dead-letter-office/` for reference.
