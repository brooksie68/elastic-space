# Elastic Space — Changelog

Newest entries first. One entry per meaningful session or release — add at session
wrap-up (`/wrapitup`). Created 2026-07-11 for the ops dashboard; entries below seeded
from git history.
Last push to origin as of 2026-07-11: **2026-07-11**.

Per-world changelogs in `src/worlds/<slug>/changelog.md` remain the canonical detail;
this file tracks project-level activity.

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
