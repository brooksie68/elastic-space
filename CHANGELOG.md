# Elastic Space — Changelog

Newest entries first. One entry per meaningful session or release — add at session
wrap-up (`/wrapitup`). Created 2026-07-11 for the ops dashboard; entries below seeded
from git history.
Last push to origin as of 2026-07-11: **2026-07-11**.

Per-world changelogs in `src/worlds/<slug>/changelog.md` remain the canonical detail;
this file tracks project-level activity.

## 2026-07-22 (Dead Letter Office: the 3D room, r1–r8)

- DLO rebuilt as a walkable 3D basement hall (Mandala-Shop-style walk/look controls):
  Meshy-rigged postmaster walks a nav-graph shift (desk, basket pickups via bow, filing,
  furnace burns, punch clock, coffee/donuts, corkboard, cabinets, fire-poking, couch
  sits, door breaks), mail falls from a ceiling chute and genuinely piles up in the
  basket bottom-first, mounding past the rim and spilling to the floor. All 12 authored
  letters + airmail drift exits preserved; stairwell door is a fifth exit.
- James's punch-list rounds: fluorescent brightness pass, polished-concrete Meshy floor,
  extra windows, file-cabinet bank, tables, parcels; optimization pass (skinned-mesh
  raycast proxy, 288k→86k decimation, Lambert paper, frozen pile matrices); pmGlow
  always-visible self-light; height to 1.89m; couch/bookshelf/sad plants; James's five
  GPT posters hung. Meshy spend ~129cr total. Room tuner (v2 key) + strict fuzz sim.
- Parked in the world CLAUDE.md: behavior weekend (needs-based routines, furnace chute
  slot, telephone), ElevenLabs voice for his lines, letters-lore expansion (threads +
  the June desk correspondence — two open questions await James), the cat, Jerry visit.

## 2026-07-19 (Admin panel: worlds list overhaul)

- Worlds list split into "In progress worlds" and "Completed worlds" sections, both
  alphabetized ignoring a leading "The", Welcome pinned on top; "pages" eyebrow dropped.
- Kebab (⋮) menu on every world row replaces the inline archive button: "move to
  completed" / "move to in progress" (always the opposite of the row's section) plus
  archive underneath. New `POST /api/worlds/:slug/status` endpoint rewrites the static
  lists in index.html, alphabetical insert included (sim-verified).
- Color pass: one `--highlight` azure wash for all hovers/active states (links, tabs,
  kebab, draft cards) replacing the muddy amber-soft; section titles and "Server
  running" in the gold accent; masthead status/chrome cards equal height.

## 2026-07-19 (Arachno-Wars: feel + systems session)

- Arachno-Wars 2000, one long tuning session with James: clean practice range (no
  decorations), thinner HUD rings, smaller chevron, slower waist-seam pulse, per-player
  hull tints (`HULL_TINT`, screen-composite tinting), real shield stat + energy-sphere /
  HP-arc / orange power-line indicator re-map, smoothed thrust envelope, ~3s fuel,
  always-on retro-braking (sim-verified soft landings), double-tap A/D burst run with
  momentum-carrying rocket leaps. Detail in the world changelog.
- Direction discovery: rapid-fire horde combat ("me against the world") is the fun —
  logged as a todo, discussion pending.

## 2026-07-19 (Relaaax: pork field built)

- New draft world **Relaaax** (`src/worlds/relaaax/`) — the Spastic Space pork.html
  recreation, renamed by James pre-build. Standalone renderer `relaaax-field.js`: rAF
  oscillators with the decoded GIF timing (2.1s ramp + per-class holds), color-lerped,
  geometry scaled off any container (`--u` = one 2002 px), phase-continuous live tuning.
- Chrome Rift-style tuner: speed/holds/desync/ease/border sliders with description lines,
  low/high/bg color pickers, frame width×height text inputs (staging frame, default
  1024×768), reset; localStorage `relaaax-tuner` + `relaaax-frame`.
- Caption cut by James; math verified by Node sim against the GIF table; added to admin
  panel In progress list. Unregistered, no drift exits — setting TBD (in-scene TV idea).

## 2026-07-19 (Pelagic: 3D Jerry cameo)

- Pelagic Lantern Habitat: 3D Jerry shipped — Blender-built cell (headless, scripted:
  jerry_build.py) at beach-ball scale, exported as per-part transparent layers composited
  by a new canvas rig in world.js; orbit path behind the station via a masked-plate cutout;
  DOM pool-Jerry ported verbatim as an A/B alternate; "J" tuner panel (localStorage).
- Look co-directed over ~13 lookdev renders; washout root-caused numerically (70W inner
  lamp clipping layers to white + gradients running along the depth axis) — fixed with
  sub-clip emissions, Standard view transform, face-plane diagonal gradients, violet
  cytoplasm. Nucleus "interest" system eases toward cursor/jellies/beacon.
- Open at close: true-3D rotation fork (pseudo-3D layer rig vs three.js GLB) undecided;
  James questioning the world's purpose — may precede further polish with that conversation.

## 2026-07-18 (Orb Dimension: skull era)

- Orb dimension v14–v33 (two nights): NMS-style flight matured (persistent banking,
  coordinated turns, S-reverse), spaceship/cockpit arc explored end-to-end and retired by
  James (parked in tmp/orb-dimension/parked/, v17 viewscreen restored + full-spin reticle).
- THE SKULL shipped: James's Meshy "alien god skull" at world center — 1800m, tilted back
  5°, rendered inside the world's own WebGL2 pipeline (depth-tested against orbs), red orb
  eyes seated in measured sockets, 2.4km orb-free buffer, cleared load-in sightline,
  spawn at 5.6km. Skull replaced the Heart as home.
- Shared lib: vendored three.js loaders/utils bare 'three' specifiers patched to relative
  imports (documented in orb + mandala changelogs; mandala unaffected functionally).
- Meshy prompt-handoff workflow validated (Claude authors prompt package, James tunes on
  canvas, Claude pulls via API) — ship + skull both produced this way.

## 2026-07-18 (Fifteen Sisters polish session)

- Fifteen Sisters: citysounds bed baked with Dropzilla-style convolution reverb (30%,
  RMS-matched, loop-safe) so the city sits outside in the distance; bed cut to 0.49×,
  world volume starts at 80%.
- Fifteen Sisters: salon walls re-rendered with the mandala shop's sandstone (0.8
  overlay, gentle); default evening now Candlelight, evening chips reordered.

## 2026-07-18 (Mandala Shop marathon session)

- Mandala Shop transformed — "fifty times better" (James): Meshy texture pipeline
  validated as the look multiplier (sandstone walls, canvas tent, desert wood,
  zellige→clay-tile floor, terracotta pottery, ~90cr); Meshy props (register, tea
  service ×6 glasses, incense burner) replace procedurals; animated FS-style incense
  smoke; music player (oasis tracks, 8% start, 20s hush); gallery lighting overhaul
  (per-painting fixtures, focus dimming); counter rebuilt with real crescent scoop
  (boolean-parenting bug found); room decluttered, doorway framed, souk street on a
  wrapped panorama cylinder (city-tile image plan pending); curator multi-select +
  align tools, 10-frame palette, select-on-place; drag-look grab/swing toggle; perf
  passes (dynamic resolution, lights 13→7, draw-call merges) + browser-zoom fix.
- Full detail in src/worlds/mandala-shop/changelog.md (rounds 1–13 + session close).

## 2026-07-17 (global wrap — 07-16/17 sessions committed)

- Dropzilla: GAS bank (replaces TOOTS) and CHUCK OPINES bank live — 2 of 10 banks filled;
  drift exits temporarily disabled during the soundboard build-out.
- Curator mode shipped: reusable `src/core/curator.js` (Mandala Shop is the reference
  adapter) + server endpoints for art listing and layout writes.
- Admin panel: world editor tab with drafts API (`world-drafts.json`), world archive control.
- Jerry's Pool: Mary (Jerry's girlfriend) random visit event, rubric updated.
- Dead Letter Office: Meshy postmaster experiment landed (ref art committed; working
  assets in `tmp/`).
- Get Your Ass in the Moss retired to `archive/` (James's call — dead end).

## 2026-07-13 (launcher cleanup)

- ONE launcher: `start-elastic-space.cmd` (renamed from `map-room.cmd`) — idempotent,
  reuses a running server, opens the map room. Deleted `serve-local.cmd` and
  `start-local.cmd`. Port locked to **4174** everywhere (server default changed from
  4173; all docs updated; 4173 retired). Launchable from the ai-projects ops dashboard's
  new per-project Launch button.
- Map room header reworked: worlds open in new tabs; final header is white
  "Elastic Space Admin" (smaller) with an orange "← all projects" eyebrow link to the
  ops dashboard (localhost:4400) — now a standing rule for every panel we build.

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
