# Elastic Space — Changelog

Newest entries first. One entry per meaningful session or release — add at session
wrap-up (`/wrapitup`). Created 2026-07-11 for the ops dashboard; entries below seeded
from git history.
Last push to origin as of 2026-07-11: **2026-07-11**.

Per-world changelogs in `src/worlds/<slug>/changelog.md` remain the canonical detail;
this file tracks project-level activity.

## 2026-07-13 (launcher cleanup)

- ONE launcher: `start-elastic-space.cmd` (renamed from `map-room.cmd`) — idempotent,
  reuses a running server, opens the map room. Deleted `serve-local.cmd` and
  `start-local.cmd`. Port locked to **4174** everywhere (server default changed from
  4173; all docs updated; 4173 retired). Launchable from the ai-projects ops dashboard's
  new per-project Launch button.

## 2026-07-13 (Coach 9 session)

- NEW WORLD: Coach 9 (idea #37) — window seat on a train that never arrives; style-first pass.
  Inline-SVG interior (woman reading, child who points at set pieces), canvas parallax loop
  (~3 min: meadow → tunnel → highland → station stop → dusk), pastel palette keyframes
- Set pieces: pastel cows, pond rowboat, Wildflowers giant on the far ridge; tunnel mirrors
  the interior and muffles audio; station stops under a generated sim-language name
- Web Audio rail rhythm via shared sound control; one ElevenLabs music track behind a
  cassette-player toggle (music prompts can't name studios/artists — ToS reject)
- Verdict: James lukewarm ("very meh") — on the fence whether the world continues; if it does,
  the art pipeline changes (Blender toon plates or supplied artwork), not more canvas tuning

## 2026-07-13 (Arachno-Wars session)

- NEW WORLD: Arachno-Wars 2000 (idea #52) — James's original one-session artillery game
  unarchived from `_archive/arachno-wars` and shipped as a world, then overhauled: bomblet
  split-direction bug fixed; six weapons (added Beam that lases through limited rock, Egg Sac
  that hatches homing spiderlings, Silk Bridge that builds walkable terrain)
- All audio replaced with 23 ElevenLabs assets incl. a chiptune battle-theme loop; shared
  sound-control gained backward-compatible `channels:` support (separate music volume slider)
- Terrain retextured to warm canyon strata matching the painted bg; childlike flora replaced
  with junipers/ocotillo/agave/spires/webs; tanks rebuilt to James's reference art — Blender
  striped-lozenge bodies (teal/amber) on 8 long procedural harvestman legs
- Three game-mechanic drift exits: clickable blimp, OUT bullseye targets behind each tank
  (hit with any weapon), and an EJECT card that blows the canopy and drifts

## 2026-07-13 (overnight session)

- NEW WORLD: The Fifteen Sisters (idea #6) — pendulum wave in a salon at dusk; 15 rainbow glass
  pendulums on a shared wave clock (sister i swings 22+i times per cycle; unison returns exactly
  once per cycle at any tempo), drifting through snakes/braids/chaos back to unison
- Blender-rendered salon plate with TRANSPARENT windows (film_transparent + RGBA): James's
  GPT city painting composites raw behind the plate — pixel-exact, no tonemap/haze/filter ever
- Furnished salon: patterned rugs, zellij pier bands, chair, palm, bottle table, fruit, incense,
  gilt paintings — all procedural in the committed build script; plate render is the shipped asset
- Three vantages (Front / 45° / 90° buttons) off one physics core, eased camera swings between
- Keeper's cabinet: glass palette, form, evening light, tempo, momentum/friction, chime toggle,
  tuning (penta/major/chromatic/dom7/harmonic-major), voices (glass/bowls/blend), release
  patterns (together/cascade/mirror/by-hand) + gather/release; "drop the sisters" opening ritual
- Audio: Web Audio chimes w/ equal-loudness lift, ElevenLabs crickets + distant bell + Tibetan
  bowl (pitch-shifted via audio-element playbackRate into a full tuned scale), James's
  citysounds bed at 0.7x; all through the shared sound control
- Three diegetic drift exits (door ajar, exit star over the city, wandering moth); registered in
  drift + map room Pages list; World Ideas.md #6 marked built

## 2026-07-12 (late session)

- Wildflowers at Dusk: full dissolution arc — flora ascends piece by piece on an accelerating
  schedule (~3.5 min: lone petals → torrent), ground strip fades, 20s end blur washes the scene
- Field rebuilt: baseline lowered to 20px above viewport bottom; five graduated ranks behind the
  foreground (offsets 40–200px, brightness 98–72%) planted along the near-ridge plate's
  pixel-sampled top silhouette; all ranks baked offscreen (flat frame cost)
- The Giant: chroma-keyed marble bust (James's asset) rises from the hidden valley over 65s at the
  finale, cresting past the top of frame as the blur takes hold; power-thrum track fades in/out
  with his rise; one master sound control now rules all page audio (rain + thrum)
- Soundtrack: gentlerain.mp3 looping via shared ElasticSoundControl
- Session lesson: "invisible" back layers were a brightness/scale problem, not caching — the
  mid-sky duplicate A/B trick (render the field against plain sky) diagnosed it

## 2026-07-12

- Pelagic Lantern Habitat: complete rebuild around a Blender-rendered plate — 2350-era
  three-tier disk station (lit rim bands, porthole rows, halo ring, beacon, pod module,
  seafloor entry dome) over fluorescent flora; canvas overlay adds bubbles, plankton,
  light shafts, beacon pulse, friendly jellies; diegetic drift hotspots + shared sound control
- All Blender work ran headless (`blender.exe --background`) after a live-instance collision
  destroyed another session's in-progress DLO portrait work; new "Blender usage" rules in
  CLAUDE.md (live instance is shared/ask-first, headless default, .blend per world in tmp/)
- Blender sources committed: `pelagic-lantern-habitat/assets/blender/` (.blend + build scripts)
- server.mjs: removed the 5-minute CSS/JS cache — everything is `no-store` now (James's call,
  after it masked a bubble-growth fix during debugging)

## 2026-07-11 (late session)

- Dead Letter Office: letter fall speed ~2.5x + faster spawn cadence (was painfully slow)
- Dead Letter Office: Blender-rendered room backdrop (scripted via Blender MCP, GPT reference
  as target); clean 1920×1080 plate, `USE_ROOM_RENDER` flag, painted room intact underneath
- Dead Letter Office: 3D low-poly Postmaster baked into the plate; transparent click hotspot,
  speech bubble, punch clock top-left; arms slimmed on request; pose rig + props staged
- New assets: `dead-letter-office/assets/room/` (render plate + editable .blend)

## 2026-07-11

- Assets: Wildflowers at Dusk runtime cloud sprites
- Assets: Wildflowers at Dusk cloud sprite sources
- Assets: Wildflowers at Dusk landscape plates
- Assets: Dead Letter Office layers, landscape references
- Assets: world audio (Jerry's Pool, Monochrome Rift, Singing Plate)
- Session work: shared sound control, Rift overhaul, changelogs, tools

## 2026-07-04

- Expand Dead Letter Office interactions
- Launch Elastic Space
