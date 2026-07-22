# The Dead Letter Office — Claude instructions

A walkable 3D basement mail hall (three.js). Undeliverable mail falls from a ceiling chute
into the wire basket; the postmaster walks his shift; opened letters can be read, and a few
return addresses still work.

## Docs

- `changelog.md` — session history, newest first.
- `README.md` — world overview and structure.
- `assets/props/props-manifest.json` — Meshy task ids for every generated asset (props are
  UNTEXTURED previews, textured in-engine; a proper Meshy refine is 10cr/prop later).

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

- **The twelve letters are authored (2026-07-04) and protected** — never generate or reword
  them. The four airmail letters carry the drift exits; the stairwell door is the fifth.
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
- Tile textures follow the never-black rule: procedural canvas fallback first, Meshy tile
  overlay on load. Prop materials clone the wood tile — clones are registered on
  `texWood.userData.clones` so the overlay marks them dirty too.
- The old 2D pixel/plate world lives only in git history (pre-2026-07-21); its Blender build
  artifacts remain in `assets/room/` and `tmp/dead-letter-office/` for reference.
