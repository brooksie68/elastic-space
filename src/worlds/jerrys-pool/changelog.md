# Changelog — Jerry's Pool

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-12 — claude-fable (perf pass 1-4 + 30-second opening guarantee)

- Optimizations 1-4 from the session's list, all behavior-preserving:
  (1) `will-change` now only on layers a rAF loop actually animates (`.rig-anim` + puffs);
  static bodies/shells/discs no longer get compositor layers — verified counts: walker 11,
  fan 11, gulper 6, barrel 2 promoted layers. (2) Glow boost quantized to 0.02 steps with
  `String()` serialization matching the style engine, so a steady glow stops rewriting (and
  re-rasterizing the blur). (3) Glow proximity re-measured every 3rd frame per entry
  (round-robin slots) with easing still per-frame; Jerry's orb radius cached 250 ms.
  (4) Colony wave/tether, walker gait/pores, and fan spin/arm-wave loops now run at 30 fps
  (frame-skip; all phase from absolute time so motion is unchanged). Gulper (surge tail) and
  barrel (squash) stay at 60.
- Opening policy revised per James: every recurring creature appears at least once in the
  first 30 s — random moment, not scripted (fast creatures inside their normal window, slow
  ones 0-26 s), first spawns forced past the concurrency skip where supported. Leviathan
  alone keeps its 2-4 minute entrance. `introduce()` replaces the plain scheduler kickoff;
  rubric updated. Cache `?v=bossman-3` (css+js).
- Pane check: no errors, glow probe still peaks clean (two filter terms, 1.84), pumped-tick
  verification per the frozen-timeline rule.

## 2026-07-12 — claude-fable (bossman glow + unforced opening)

- Jerry glow extended to the whole cast ("he's the bossman"): the per-creature glow blocks were
  replaced by one shared registry/ticker (`registerJerryGlow` + `jerryGlowTick`). Registration is
  automatic inside `animateDenizen` (amoebas, rays, vake, urchin, colony, walker, wave-2 trio)
  plus manual hooks for jellies, dot schools, and the alien fish + their cloned companions.
  External filter rewrites (fed-amoeba saturation, alien-fish depth loop) are adopted as the new
  base so the boost rides on top. Leviathan deliberately exempt — it has its own Jerry reaction
  (panic dive) and its silhouette is too big for edge-proximity to mean anything.
- Bug found by in-pane tick-pumping (rAF is frozen in an unviewed pane, so the ticker was driven
  manually with a stubbed rAF): the style engine normalizes filter strings (1.060 → 1.06), which
  made every tick think an external rewrite happened and adopt its own boost — brightness terms
  accumulated. Fix: `lastWritten` stores the read-back serialization. Verified: probe on Jerry
  reaches `brightness(1.839)` with exactly two filter terms; element 927 px away stays untouched.
- Opening wave removed per James: `emitOpeningDenizens` deleted; every scheduler's first delay is
  now `Math.random() * (its normal max)`, so early arrivals are possible, never forced (7 denizens
  showed up naturally within 8 s on one roll). Rubric's opening table replaced with the new policy
  + a glow section. Cache `?v=bossman-2`.

## 2026-07-12 — claude-fable (Jerry proximity glow)

- Per James: the wave-2 trio now react to Jerry. New `jerryGlowFactor(el, range=260)` measures
  the gap from a denizen's silhouette to Jerry's edge (via `cellMotion` + orb radius, same data
  the amoebas steer by) → 0..1. Each rAF loop eases toward it (7%/frame) and appends up to
  +85% brightness onto the creature's base depth filter; style writes are skipped under a
  0.005 delta. Verified in-pane with mock rects: factor 1.0 on Jerry, 0.5 midway, 0 outside
  range; no console errors. Cache `?v=wave2-5`.
- Colony/walker/vake and the older cast don't glow — offered as a follow-up if James wants
  the whole pool reacting.

## 2026-07-12 — claude-fable (gulper lurk-and-surge)

- Per James: gulper confined to the lower half (band 0.5–0.82 of viewport height, base
  0.56–0.76) and given real swimming behavior. Crossing is now 121 baked keyframes: slow
  patrol speed with 2–3 gaussian glide-surges, two-component vertical meander, and the nose
  pitching along the path tangent (±14° clamp, mirror-aware sign). The rAF tail beat reads the
  same surge envelope — faster and wider mid-surge (period ~2.1 s lurking → ~0.9 s surging).
  Crossing 30–44 s (was 26–40; rubric updated). Whole-body bob trimmed. Cache `?v=wave2-4`.
  Pane check: keyframes bake y 579–705 on an 1110 px viewport, ±14° pitch, no errors.

## 2026-07-12 — claude-fable (gulper ghostlier)

- Per James: body much ghostlier, other parts staying visible. Body now true 45% alpha at the
  core → 12% at edges (verified 112/255 center in the PNG); jaw + dorsal spikes split onto their
  own firmer `gulper-flesh-mat` (~74%); eye/teeth/lure/fins untouched. Two material lessons baked
  into `translucent_body_mat`: closed meshes double their transparency (front+back surfaces →
  alpha = 1-(1-fac)^2), so backfaces are now culled in the shader and the dialed opacity is what
  renders. Crops unchanged again; cache tag `?v=wave2-3`. Pane check clean (6 layers, no errors).

## 2026-07-12 — claude-fable (gulper fixes)

- Swimming direction: gulper's mirror logic was inverted (swam tail-first); flip now matches the
  walker/barrel convention (`fromLeft ? -1 : 1`).
- Translucent flesh per James: body material is now `translucent_body_mat` in build_denizens2.py —
  shaded like before but alpha ~0.75 through the core feathering to ~0.3 at silhouette edges
  (facing-driven), eye/lure/teeth/fins unaffected. First re-render exposed a pipeline subtlety:
  a translucent holdout bakes see-through ghost pixels into the hinged-part layers (pale smudges
  that would swing with the jaw), so render_layers2.py now swaps holdout objects to an opaque
  stand-in material during part renders. Crop rects came back identical to wave2-1, so site.js
  manifests needed no changes. Cache tag `?v=wave2-2`.
- Pane check: no console errors, 6 gulper layers load, left-entering gulper carries flip −1
  (jaw leads). Visual pass on the translucency is James's.

## 2026-07-12 — claude-fable (wave-2 denizens: gulper, fan dancer, barrel drifter)

- James asked for 10 new denizen concepts and picked-by-proxy my favorite 3, built solo
  (no check-ins, per instruction): the **lure gulper** (anglerfish: hinged jaw snap every
  6–11 s, tail beat, pectoral scull, bobbing lure with pulsing halo), the **fan dancer**
  (feather-star: 10 feathered arm layers running a metachronal wave around the ring while
  the whole animal slowly rotates and drifts), and the **barrel drifter** (jet salp:
  rim-lit translucent shell squashing per contraction, amber nucleus pulse, velocity
  surges baked into 96 crossing keyframes, one cyan exhaust puff per contraction —
  capped at 6 with a TTL fallback, fading within ~a third of the body width astern).
- New Blender scene `tmp/jerrys-pool-denizens/denizens2.blend` (build_denizens2.py, seed 11,
  creatures at x=60/80/100) + generalized layer renderer render_layers2.py (per-job holdouts,
  anchor manifest); the barrel puffs needed render_barrel_puffs.py because they were parked
  outside the camera frame. 21 layers, 981 KB total, in `gulper/`, `fan-dancer/`,
  `barrel-drifter/` under the world root.
- `site.js`: shared `buildLayerRig`/`setRigPivot` helpers (the walker predates them and keeps
  its own inline versions); three spawn functions with inlined manifests, schedulers
  (25–40 s / 22–36 s / 18–32 s), and forced opening spawns at 1.2 s (barrel), 2.1 s (fan),
  4.4 s (gulper) — all inside James's requested first-5-seconds window. Rubric updated.
  Cache tags `?v=wave2-1`.
- Pane check: all three assemble in the opening wave, 20 layer imgs load, no console errors,
  exhaust puffs reaped correctly. Motion pending James's demo (frozen-timeline rule).
- The 7 unbuilt concepts (chain siphonophore, comb jelly, whip eel, spore floater, glass
  skitterer, mirror mola, burrow lurker) are logged in `Claude's Ideas.md`.

## 2026-07-12 — claude-fable (vake frequency bump)

- Per James: vake attempt cadence doubled, every 30–60 s → every 15–30 s (opening dart at 1.8 s
  unchanged, still max one, no concurrency skip). Rubric updated. Script cache tag `?v=vake-3`.
- James approved both animated denizens this session ("came out so great... really super cool") —
  colony wave and walker shamble are done pending nothing.

## 2026-07-12 — claude-fable (walker shamble pass)

- James demoed the live walker ("freaking awesome") but the legs read as barely moving. Shamble
  pass: legs rebuilt longer in `build_denizens.py` (knee `d*1.45,z+0.15` → `d*1.75,z+0.55`, foot
  `d*1.95` → `d*2.5`, slightly thinner bevel 0.09) — full deterministic scene rebuild (seed 7, so
  everything else re-rendered identical) + walker layer re-render; leg crops grew ~60% and their
  manifest entries in `site.js` updated (body/pores/puffs unchanged).
- Gait juiced: swing 6.5°→13° with a jittered second harmonic per leg (uneven strides), lift
  0.014→0.03·h, bob 0.016→0.028·h, sway 1.1°→1.9°, new per-step forward lurch (0.013·h) on the
  rig so the legs look like they're driving the body. Steps slightly quicker (gait cycle
  5.2–6.8 s → 4–5.2 s) while the crossing slowed (52–78 s → 68–92 s) — more steps per distance =
  shamble. Cache tag `?v=walker-live-3`. Rubric untouched (attempt cadence/counts unchanged;
  crossing duration isn't a rubric value).
- Pane check: no console errors, all layers load, puff cap holds (4 alive). Motion pending
  James's demo per the frozen-timeline rule.

## 2026-07-12 — claude-fable (walker live session)

- Vent walker fully live, same layered-sprite technique as the colony: re-rendered from
  `denizens.blend` as 14 layers (`vent-walker/`, ~490 KB) by
  `tmp/jerrys-pool-denizens/render_walker_layers.py` — body (plume and pores stripped), 3 legs
  (each + knee/foot glows, body rendered as a Cycles holdout so far-side legs stay occluded),
  7 pores + halos (pores 2–3 are fully body-occluded and correctly have no layer), and 3 smoke
  puff variants (the old baked plume balls). Manifest inlined in `site.js`.
- Tripod gait: each leg rotates around its hip anchor (staggered thirds, one full cycle per
  5.2–6.8 s), lifting while it sweeps forward and planted coming back; a rig wrapper bobs and
  sways the whole body in sync (WAAPI keeps only the flat crossing + fades). Pores pulse
  asynchronously — each with its own random 1.4–3.2 s period and phase.
- Live smoke, deliberately self-contained per James: puffs spawn at the vent mouth every
  0.65–1.4 s, rise/drift/swell/fade over 3–4.2 s, topping out just past the old baked plume
  height — nothing drifts on indefinitely. Capped at 7 concurrent with a timer-based removal
  fallback: puff cleanup originally hung off `animation.finished`, which never resolves while a
  tab isn't rendering (document timeline stalls), so hidden tabs accumulated orphan puffs
  (62 in ~1 min in the Browser pane). Timer clock keeps running, so the cap + TTL make it leak-proof.
- Discovered in the process: the CC Browser pane freezes `document.timeline` entirely when not
  being viewed — WAAPI/rAF motion can't be probed there; only DOM assembly and console errors.
- Crossing timing, spawn schedule, concurrency unchanged (rubric untouched). Old `vent-walker.png`
  no longer referenced (kept on disk). Cache tags `?v=walker-live-1/-2`.
- Where things stand: assembly + console verified in the pane; motion pending James's demo. Gait
  speed, swing angle (6.5°), puff cadence, and pore pulse ranges are the likely tuning knobs.

## 2026-07-12 — claude-fable (lantern wave session)

- Lantern colony now undulates for real: re-rendered from `denizens.blend` as 12 per-bulb sprite
  layers (`lantern-colony/bulb-00..11.png`, ~570 KB total; each layer = shell + core + halo + that
  bulb's filaments, auto-cropped to alpha bbox by `tmp/jerrys-pool-denizens/render_colony_layers.py`,
  placement manifest inlined in `site.js` — no fetch on `file://`). A rAF loop drives a traveling
  sine head→tail: one cycle per 6 bulbs (~2 cycles ride the body), 2.4–3.3 s period, amplitude 8%
  of body height, plus a subtle per-bulb opacity shimmer riding the same wave.
- The baked tether is gone from the sprite; `site.js` redraws it every frame as a two-stroke SVG
  path (cyan glow + core) through the wave-displaced bulb centers, with the original overhang past
  head and tail. Whole-body motion softened (9–16 px slow sway, was 22–40 px × 4.5 cycles) so the
  body wave reads instead of fighting a global bob.
- Crossing timing, spawn schedule, and concurrency unchanged (rubric untouched). Old single-sprite
  `lantern-colony.png` is no longer referenced (kept on disk for now). Cache tags bumped to
  `?v=lantern-wave-1`. James confirmed the wave looks right in preview.
- Where things stand: colony done pending James's own-browser demo at depth/blur extremes. Vent
  walker still static apart from stride bob — candidate next step: layered plume for live smoke.

## 2026-07-11 — claude-fable (Blender denizens session)

- Two new Europan denizens, modeled in Blender (headless 5.1, Cycles) and baked to transparent
  sprites: the **sulfur lantern colony** (seven-bulb glowing chain on a cyan tether, pulse baked
  head-to-tail) and the **vent walker** (dark tripod bottom-dweller with amber chemosynthetic pores
  and a rising vent plume). Sprites live at `lantern-colony.png` / `vent-walker.png` (world root,
  leviathan precedent); parametric build script + full-res renders + `denizens.blend` in repo-root
  `tmp/jerrys-pool-denizens/` (untracked) — everything regenerates via
  `blender --background --factory-startup --python build_denizens.py`.
- `site.js`: `spawnLanternColony` (mid-water head-first drift with sine bob, 46–68 s crossings) and
  `spawnVentWalker` (seafloor walk with stride bob, 52–78 s crossings), both depth-scaled/blurred,
  max one each, respecting the 6-denizen concurrency skip via `animateDenizen`. Medium-frequency
  schedulers (16–28 s / 20–34 s attempts) plus opening-wave spawns at 2.6 s and 3.6 s (forced).
  `site.css`: shared sprite rule. Rubric and current-index updated.
- Round 2 after James's demo (loved the look): colony re-rendered with 12 bulbs (was 7) and drawn
  50% smaller (120–230 px wide), sine bob made actually visible (48 keyframes, 4.5 cycles per
  crossing — was 10 keyframes / ~1 cycle, imperceptible). Walker lowered by its own leg length
  (baseline now `innerHeight - height * 0.64 - offset`, feet sit in the seafloor zone) and its
  vent plume re-rendered with a strong sideways lean; the sprite mirrors per direction so the
  smoke always trails the walk.
- Where things stand: `node --check` passes; James still to demo in his own browser. Possible next
  step (offered, not requested): layered sprite renders so the colony's pulse animates live in JS
  instead of being baked.

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
