# Changelog — Pelagic Lantern Habitat

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-19 — claude-fable (with James)

- Jerry cameo, fulfilling the 07-12 note ("find a way for Jerry to cameo here someday, even if
  it makes no sense"). Beach-ball-sized 3D Jerry now swims in front of the station: a full
  Blender rebuild of the pool cell — gel membrane with inner wall, noise-textured glowing blue
  cytoplasm volume (James: "big ball of cytoplasm... glowing from the inside"), 17 shaded
  squishy organelles transcribed from jerrys-pool/site.css, an inner point light so he
  illuminates himself, and three hairline orbit rings outside the membrane.
- Look was co-directed over ~10 lookdev renders (iterations in tmp/pelagic-lantern-habitat/):
  emission-only materials read as "drawn on" → switched to lit Principled + subsurface +
  noise displacement; rings started inside his body (CSS % misread) → moved outside.
- Shipped as 17 per-part transparent PNGs (assets/jerry/, 1152px square, one shared camera
  frame so layers stack pixel-aligned) composited by a new canvas rig in world.js: per-part
  drift/pulse/spin/alpha animators, ring rotation at the pool's periods (20s/16s/32s-reverse),
  slow whole-cell wander. Draw order: aura → organelles → goo (membrane+cytoplasm veils the
  organs) → rings.
- Jerry tuner panel (Chrome Rift pattern, DOM-injected, "J" button bottom-left):
  position, size, goo/aura opacity, ring speed, pulse, organ drift, swim speed;
  localStorage `pelagic-jerry-tuner`. He's always on-screen for now, per James, while tuning.
- Blender sources committed: assets/blender/jerry_build.py (rebuilds from pelagic-habitat.blend),
  jerry_export.py (layer renders), pelagic-jerry.blend (built scene). Verified by Node sim
  (17 layers/frame, balanced canvas state); index.html untouched.
- Where things stand: live behind the tuner, James approved the lookdev ("we're ready to see
  him inside the pelagic"). Next: James tunes by eye; maybe split the 5 dark organelles into
  separate layers, and punch organelle saturation if the goo veil mutes them too much.
- Pool-parity pass (same day, after A/B review): James named what sells pool Jerry — saturated
  blurry-edged organs, strong roundness gradients on nucleus + body, correct 1px rings, and
  the nucleus reading as an interested little brain. Fixes: (1) ring PNGs deleted; rings are
  now 1px canvas ellipses in exact pool geometry/colors/spins (JERRY_RINGS in world.js);
  (2) nucleus interest system — eases toward the cursor, else the nearest jelly, else the
  beacon, clamped to 5% travel; drives both canvas layer offset and DOM --cell-nucleus-x/y;
  (3) layer exports now use the Standard view transform (AgX was bleaching organ chroma —
  brighter emission just went whiter), organs got hotter colors, wider fresnel edge-melt,
  and a 1.4px Gaussian at export; cytoplasm got a UL-bright→LR-deep diagonal shading gradient
  and deeper blue; (4) inner light 110→70W so organ self-color survives.
- Washout root-caused (James: "everything looks washed out white... missing the purple"):
  numeric pixel sampling proved the layers were CLIPPING — the 70W inner point light at
  point-blank range blew every organ to (240,240,240). Fixes: exports drop the lamp to 6W
  (it exists for lookdev scene-spill only), emissions pulled below clip, and gradients moved
  to an explicit face-plane diagonal (local x−z) after the rotated-Generated approach proved
  to run along the depth axis (invisible to camera). Cytoplasm emission is now a color ramp
  (pale cyan UL → indigo-violet LR), scatter shifted violet, pink added to the membrane rim.
  Verified numerically: nucleus warm-cream→indigo at 2.8:1 contrast, goo cyan→violet at 2:1.
  Lesson for future passes: sample pixels before judging color changes; under AgX OR Standard,
  raising emission whitens — chroma comes from keeping values sub-clip.
- Session end / where things stand: James asked whether Blender Jerry can truly rotate
  (organelles passing behind the nucleus). Answer: the .blend is real 3D; the in-world layer
  stack is not. Fork presented, UNDECIDED at close: (1) pseudo-3D canvas rig — rotate the
  known organelle 3D positions in JS, project, depth-sort/dim, nucleus occludes (recommended
  first step, no new assets); (2) three.js GLB for true 3D (volume shader must be faked);
  (3) baked turntable frames (rejected-ish: canned + heavy). Also on record: James is unsure
  what this world is FOR ("can't be a repeat of Jerry's Pool... something to do") and has
  considered archiving it — a purpose conversation should precede more Jerry polish.
- Same session, later: Jerry now SWIMS — orbit mode (default) takes him on a lap around the
  habitat: he shrinks/dims toward the far side and passes convincingly BEHIND the station and
  the terrain spires, via a station-cutout occluder (assets/jerry/station-mask.png, a Blender
  silhouette render from the plate camera; world.js masks the plate through it so the cutout
  is pixel-identical — no seam). Deliberately included the terrain spires in the mask so he
  can vanish behind a rock and re-emerge.
- Also added, at James's request before building the swim: DOM Jerry, the pool cell verbatim,
  as an A/B alternative to the 3D layers. Markup injected by world.js; styles are
  assets/jerry/dom-jerry.css, machine-extracted from jerrys-pool/site.css (44 blocks, scoped
  under #jerry-dom — regenerate with tmp/pelagic-lantern-habitat/extract_dom_jerry.cjs rather
  than hand-editing). Latent pool organelles get an "organ glow" tuner slider. He sits
  between #plate and #sea-canvas, so the same canvas cutout occludes him too.
- Tuner grew: style toggle (3D layers / pool verbatim), motion toggle (orbit / drift), orbit
  radius, lap seconds, far-side size and dim, organ glow. Verified by Node sim: occluder
  draws exactly the far half of each lap in both styles, never in drift mode.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

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
