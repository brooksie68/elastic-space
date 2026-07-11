# Changelog — Jerry's Pool

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-11 — claude-fable (Hunyuan3D research session)

- No world code changed. Evaluated Tencent Hunyuan3D-2 (github.com/Tencent-Hunyuan/Hunyuan3D-2) as a
  3D asset pipeline for Elastic Space, using a Jerry's Pool denizen concept as the test case.
- Proved the loop end to end via the free Hugging Face Space's REST API (the Gradio UI at
  tencent-hunyuan3d-2.hf.space works fine in a normal browser): hand-drew a flat SVG alien
  anglerfish concept → rasterized to PNG → image-to-3D → volumetric GLB in 7.3 s (9.4 MB, 616k faces).
  Mesh kept the lure antenna, dorsal spikes, tail fins, eye socket, and turned painted spots into
  raised bumps; invented a plausible far side. Text-to-3D errors on that Space; image-to-3D is the path.
- Constraints learned: the free Space is shape-only (texture stage disabled — gray clay); textured
  output needs 3d.hunyuan.tencent.com or ≥16 GB VRAM locally (James's 4070 Laptop has 8 GB — enough
  for shape-only/mini). License: Tencent community license, outputs owned by us, fine under 1M MAU,
  not valid in EU/UK/South Korea (irrelevant here). Meshes need decimation (~10–20k faces) for web;
  the Space's export panel has built-in simplification.
- Test artifacts (input SVG + 4 mesh renders + comparison page) in repo-root `tmp/hunyuan-test/`
  (untracked, disposable). The generated GLB was NOT downloaded — it lived on HF temp storage and
  will expire; regenerate from the SVG if wanted.
- Where things stand: pipeline validated, James reviewed the comparison page. Possible follow-ups:
  a Three.js world using a generated GLB (mind the no-fetch-on-file:// rule — embed base64 or degrade),
  or bake-to-sprite renders for 2D worlds. Not yet logged in `Claude's Ideas.md`.

## 2026-07-11 — claude-fable (later session)

- Ambience audio: `assets/audio/jerry's-pool-sound-1.mp3` (supplied by James) now loops via the shared
  sound control — `ElasticSoundControl.attach({ media })`, volume 0.7, speaker button top right with
  the standard one autoplay attempt. `sound-control.js` added to `index.html`; script cache tag bumped
  to `?v=pool-audio-1` (later superseded by `?v=vake-2`).
- Fed amoebas show it: when an amoeba finishes consuming a jelly or another amoeba, its inline
  `saturate()` doubles (capped at 2.6) so it carries a richer color for its satiated departure
  until it exits the screen. The existing 700 ms filter transition makes the shift ease in.
- New denizen: the vake (born from a typo of "cake") — a dark, fast, shark-ish arrowhead with a
  forked tail, a faint wake streak, and a small pale eye dot. Pushed into the background per James:
  small (42–88 px), heavily blurred (2.5–4 px), dark and desaturated (brightness 0.35–0.5,
  saturate 0.65), faint (opacity 0.32–0.44), and `z-index: 2` alongside the leviathan.
  Darts across the pool in 3–5 s with S-shaped swoops (2 sine cycles,
  100–160 px amplitude) applied perpendicular to its travel line. The nose points along the path:
  per-keyframe tangent rotation with angle unwrapping so it never barrel-rolls (the first
  rotate-to-heading pass rolled weirdly; this replaces it). It's a rogue — 55% of crossings are
  horizontal-ish, the rest vertical, and both allow heavy diagonal drift (up to 90% of the
  cross-axis), so it can come from any edge. Final timing per James: guaranteed opening-wave dart
  at 1.8 s (so it's always seen once), then an attempt every 30–60 s, max one, no concurrency
  skip. Rubric updated; cache tags bumped
  to `?v=vake-2` (all tuning passes had shipped under `vake-1`, which risked stale caches).
- Where things stand: all three features (ambience audio, vake, fed-amoeba saturation) are live and
  syntax-checked; James reviewed the vake in his browser through several tuning rounds and approved
  ("the vake is dope"). The fed-amoeba saturation boost has not yet had a visual pass from James.
  Nothing committed this session — git handled elsewhere.

## 2026-07-11 — claude-fable

- Plankton layer: 50 of the 330 current dots are now tiny sealife — 10 species (coscinodiscus, navicula,
  triceratium, fragilaria chain, copepod, radiolarian, ceratium, volvox, asterionella, foraminifera),
  5 individuals each, ~9–17 px, fixed random orientation. Colors: species art is drawn white and each
  individual gets a fully random tint at spawn (any hue; halo matches), per James's follow-up.
- They are static models pre-rendered once to 64 px canvas textures and ride the exact same orbit +
  Jerry-influence physics as the dots (pressure/wake/side displacement untouched; population still 330).
- Within 190 px of Jerry they glow: additive color halo + full brightness + slight scale-up, held ~2.8 s
  after he leaves, ~1.1 s fade. Trigger piggybacks on the existing per-frame Jerry-distance check.
- Rendering stays batched: 10 species textures + 1 shared halo texture alongside the 2 dot textures;
  Canvas fallback path handles plankton too. Script cache tag bumped to `?v=plankton-1`.
- Also this session: repo-wide "no dev server" rule recorded in `CLAUDE.md` (James loads via `file://`);
  `docs/current-index.md` verification updated to match.
- Where things stand: syntax-checked; awaiting James's visual pass on sizes/colors/glow timing.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history, `world.json`, and `docs/`.
- Where things stand: live and featured; primary launch-season world. An uncommitted `site.css` pass is
  pending in the working tree: seamount solidity fix — all mounts moved to `opacity: 1` and `mask-image: none`,
  with blur increased roughly +5px per depth tier so distance reads through blur/value instead of transparency.
  Matches the seamount rule added to `CLAUDE.md` in the same (uncommitted) session.

## 2026-07-04 — launch (commit 97499fe, "Launch Elastic Space")

- World shipped live. Built in the week prior (manifest `createdAt` 2026-07-01).
- Scene: DOM/CSS environment, Canvas background, PixiJS/WebGL renderer dedicated to the 330-dot current
  field (shared-texture batching, local PixiJS bundle in `assets/the plasma pool — pixi_files/`, no CDN).
- Dot physics in depth tiers: far 15 FPS, middle 30 FPS, near 60 FPS; dots near Jerry promoted to 60 FPS
  regardless of depth. Off-screen dots stay continuous in orbit but skip rendering and Jerry-influence work.
- Jerry's dot pressure, wake, side displacement, and recovery behavior established as a core spatial
  effect — must survive any renderer optimization.
- Denizen system with spawn timing governed by `docs/denizen-frequency-rubric.md` (canonical; update it
  whenever timing/counts/concurrency change).
- Exits: Jerry's emitted orbs use shared random drift. No sound.

## Standing guidance

1. Read `docs/current-index.md` before touching the renderer or dot physics.
2. Seamounts are solid terrain: opacity 1, no alpha masks; depth via blur, value, scale.
3. Denizen timing changes require a rubric update.
