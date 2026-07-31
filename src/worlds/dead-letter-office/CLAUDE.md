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
- `tmp/dead-letter-office/nav-fuzz-sim.mjs` — the durable constraint/nav sim (rebuilt
  2026-07-27; the original was scratchpad-only and lost). Run it after ANY furniture,
  keep-out, or nav change: `node tmp/dead-letter-office/nav-fuzz-sim.mjs`. It reads
  world.js source directly, so no constant-copying drift.
- `tmp/dead-letter-office/archive-lookdev.html` — silent look-dev harness for the
  archive stacks (served: `/tmp/dead-letter-office/archive-lookdev.html?view=0..2`).
  Evals the live archive section out of world.js. KEEP IT — it is how archive changes
  get eyeballed without loading the sound world in a pane.

## Planned (James, 2026-07-22): the behavior weekend

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
- **Face/eyes: hands off** (James, 2026-07-21) — the frozen face ships as-is; the 3D eye-rig
  work stays parked in `tmp/dead-letter-office/meshy/viewer.html` until James reopens it.
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
  FURNITURE, or keep-out change. Box labels live in `ARCHIVE_LABELS` (James-approved
  tone includes DICK PICS (CONFISCATED) — do not sanitize; 72 entries since r12, the
  atlas caps at 80 tiles so at most 72 labels + the 8 plain/top tiles). The whole
  archive draws from one canvas atlas: never give boxes per-mesh materials. The
  radio keeps its own Meshy textures — PROP_MATERIALS must never grow a `prop_radio`
  key, and its emissive stays faintly on (0.22 off / 0.42 playing).
- Wall art is placeable (r12, 2026-07-28): `WALL_ART` catalog + `buildArtItem` in
  world.js; art items ride the same layout file with an extra `y` (hang height).
  `DLO_DEFAULT_ART` seeds the classic placements when a saved layout carries no art
  — keep it in sync if the catalog changes. In arrange mode art snaps to walls,
  wheel = height; furniture wheel-rotation snaps to 8 stops (45°) — James's rule,
  don't reintroduce free rotation. Fixtures (house sign, clock, drum-counter
  tallies, corkboard, STAIRS plate) are NOT placeable on purpose. server.mjs
  `furnitureTypes` must list every art type.
- Drag look is swing-only (James 2026-07-28): no grab mode, no toggle — do not
  bring the switch back.
- Tile textures follow the never-black rule: procedural canvas fallback first, Meshy tile
  overlay on load. Prop materials clone the wood tile — clones are registered on
  `texWood.userData.clones` so the overlay marks them dirty too.
- The old 2D pixel/plate world lives only in git history (pre-2026-07-21); its Blender build
  artifacts remain in `assets/room/` and `tmp/dead-letter-office/` for reference.
