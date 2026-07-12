# Changelog — Pelagic Lantern Habitat

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-12 — claude-fable

- Complete rebuild around a Blender-rendered plate (co-directed with James). The old all-canvas dome
  scene is replaced by `assets/habitat-plate.jpg` (2560x1440 JPEG, 182KB), rendered headless from
  `tmp/pelagic-lantern-habitat/pelagic-habitat.blend`: a three-tier disk station (2350-era, per James —
  "not a big sphere") with lit rim bands, disciplined porthole rows, observation dome, halo ring,
  beacon spire, hanging pod module, seafloor entry dome with lift tube, on a seafloor of fluorescent
  flora clusters, kelp lanterns, and plankton. Iteration renders live in `tmp/pelagic-lantern-habitat/`.
- Canvas overlay on top of the plate: rising bubble streams (station + vents), drifting plankton
  motes, subtle surface-light shafts, beacon pulse, four friendly jelly drifters (welcoming, per
  owner note). All anchors are plate NDC mapped through the CSS cover-fit transform (DLO pattern).
- Drift exits are now diegetic hotspots: airlock door, beacon, pod module, plus a hidden bonus on
  the magenta flora cluster. Sound (thrum + drift noise + bubble clicks) moved behind the shared
  `ElasticSoundControl`; the old in-scene toggle is gone.
- `world.json` summary updated; registry regenerated.
- Post-check fixes: bubbles grew exponentially (radius compounded per frame) — now linear growth
  capped at 1.7x birth size. Dev server's 5-minute cache (`max-age=300`) masked the fix; James
  approved removing it — `server.mjs` now sends `no-store` for everything.
- Blender sources committed to `assets/blender/` (pelagic-habitat.blend + all bg_*.py build
  scripts); `tmp/pelagic-lantern-habitat/` remains the local working dir (gitignored). All builds
  ran headless (`blender.exe --background`) — see the new "Blender usage" section in root CLAUDE.md.
- Where things stand: live, James-approved ("neat starting point"). The .blend is the master for
  future asset renders (isolated objects on transparent backgrounds when the world needs layers).
- Next ideas from James: swap primitives for premade models as we learn Blender together; find a
  way for Jerry (de facto site mascot) to cameo here someday, even if it makes no sense.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history and `world.json`.
- Where things stand: live and featured. No pending working-tree changes.

## 2026-07-04 — launch (commit 97499fe, "Launch Elastic Space")

- World shipped live: deep under an alien sea, a glowing habitat hums while friendly creatures
  circle the dome.
- Soundtrack listed as low thrumming, bubble clicks, subsea drift — gated, no autoplay.

## Standing guidance

1. Keep the creatures welcoming rather than eerie (owner note in `world.json`).
