# Changelog — Arachno-Wars 2000

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-13 — Claude (with James)

Big cleanup pass on James's direction: make v1 actually fun.

- **Bomblet bug fixed**: `spawnBomblets` ignored the parent shell's velocity and always burst
  up-left; bomblets now fan forward around the parent's heading with inherited momentum.
- **Six weapons**: Shell, Bomblets, Rocket, plus new **Beam** (hitscan lance that melts a limited
  depth of rock — `BEAM_BURN_BUDGET`), **Egg Sac** (one squashy bounce, then hatches 3 spiderlings
  that crawl at the enemy and pop), and **Silk Bridge** (raises a walkable strand across a gap,
  drawn as silk over the surface). Keys 1–6; AI uses Shell/Bomblets/Rocket/Egg Sac.
- **Audio**: all sfxr/Web Audio synthesis replaced with 23 ElevenLabs assets in `assets/audio/`
  (22 SFX + a cheeky chiptune battle-theme loop). Music rides a separate volume channel — the
  shared sound control (`src/core/sound-control.js`) gained backward-compatible `channels:`
  support rendering a labelled second slider. First-pass sounds; James curates by ear.
- **Terrain/flora**: dark purple stripy foreground replaced with warm canyon rock matching bg.png
  (surface-anchored gradient, wavy sedimentary strata exposed by craters, sunlit rim). Old
  childlike pines/cacti/mushrooms replaced with junipers, ocotillo, agave, dusty scrub, dry
  bunchgrass, rock spires, and small strung webs.
- **Tanks**: teal (P1) / amber (P2) per James's reference art. Blender-rendered striped lozenge
  bodies with dome + antennae (`assets/tanks/`, build script `tmp/arachno-wars-2000/build-tank.py`,
  headless); legs stay procedural — now 8 long harvestman legs arching above the hull. Barrel is a
  long dark leg-cannon (`BARREL_LEN`).
- **Exits** (replacing the corner cobwebs): a clickable blimp crossing the sky; an archery
  bullseye with an "OUT" sign behind each tank — hitting one with any weapon drifts onward; and a
  fifth HUD card, **EJECT** — click it, the canopy blows, the little guy flails skyward, drift.
  All route through a hidden `data-drift` anchor so drift.js picks the destination.
- Where things stand: shipped as first pass, syntax-checked but not yet play-tested by James.
  Sound set and music are ElevenLabs first drafts awaiting his ear. Tank sprite could get more
  mechanical detail (under-rig, hip hardware) in a later Blender pass. The Phaser rewrite lives
  on separately in `arachno-wars-two`.

## 2026-07-12 — Claude (with James)

- Unarchived Arachno-Wars 2000 (James's original one-session artillery game proof-of-concept,
  previously at `C:\Users\brook\ai-projects\_archive\arachno-wars`) and made it an Elastic Space
  world. Game code is untouched except for audio integration.
- Integrated the shared chrome: dashboard icon, sound control, drift. All game audio (jsfxr
  one-shots, Web Audio rumble and shell whistle) now gates through the shared speaker button's
  on/off and volume state via a small `esSound` shim in game.js.
- Added three diegetic drift exits: faint corner cobwebs (top-left, bottom-left, bottom-right —
  top-right belongs to the dashboard/sound icons). They brighten on hover.
- Registered the world (`npm run registry`) and added it to the map room's Pages list.
- The active sequel project remains `ai-projects/arachno-wars-two`; this world is the finished v1
  and is not the codebase going forward. Original design spec: the archive folder's `HANDOFF.md`.
