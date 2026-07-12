# Changelog — Wildflowers at Dusk

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-12 — claude-fable (giant scale + crest + thrum fade)

- **Giant plate 20% larger**: `.landscape-giant` width 90vw → 108vw (world.css).
- **Lower crest**: final resting `shownY` 24% → 44% of the (now taller) plate, which lands the
  head ~100px lower than the old crest at 1920×1080 — it now settles just shy of the top of
  frame instead of drifting past it.
- **Thrum fade retimed**: the fade-out now runs over the final 5s of the rise and hits silence
  exactly when the giant stops, instead of starting at the stop and trailing 5s past it.
  `updateThrum` gain is now `min(fadeIn, fadeOut)` clamped to [0,1].
- Next: James to eyeball the new size/crest height in his own browser; `shownY` in world.js is
  the single knob if the resting height needs a nudge.

## 2026-07-12 — claude-fable (background rain sheets)

- **Two occluded rain sheets** behind the foreground rain, same lift/fade/blur trick as the back
  flower rows. The far sheet draws on the cloud canvas (between sky and cloud sprites) so every
  landscape plate hides it — it only shows against the open sky. The mid sheet draws on a new
  `#rain-mid` canvas slotted into `.landscape-layers` at z-index 2 (after the giant), so the middle
  and near ridges cut it off. Both are slower (0.22× / 0.38× foreground speed), shorter, fainter,
  and carry a sub-pixel blur (0.6px / 0.4px) — deliberately light so the specks stay visible.
- Each sheet is 150 streaks batched into a single stroked path, so the blur costs one filtered
  composite per sheet per frame, not one per drop.
- The new canvas is in the resize handler (DPR-aware) and inherits the end-of-arc blur via the
  existing `.landscape-layers` target. Foreground rain untouched.
- Next: James to eyeball density/alpha of the two sheets in his own browser; both are tuned
  conservatively and easy to push brighter via `farRainSheet`/`midRainSheet` in world.js.
- **Accent pass (James review: "too hard to see, accentuate even if less realistic")**: counts
  150 → 180 per sheet, alpha 0.20/0.27 → 0.38/0.50, lineWidth 0.8/0.9 → 1.2/1.4, length scale
  0.34/0.52 → 0.42/0.62. Speeds and blur unchanged so the parallax and softness still read.
- **Speed pass (James review: back sheets "look like they're levitating")**: speed scales
  0.22/0.38 → 0.45/0.65 of foreground. Still slower than the front rain so depth ordering holds,
  but fast enough to read as rain rising, not drifting.

## 2026-07-11 — claude-fable (dissolution + depth session)

- **The dissolution**: field elements now depart upward with the rising rain. First departure ~26s
  after load (always a lone foreground bloom for the first 6 events), then intervals decay ×0.88 per
  event while batch size grows ×1.28, compounding into a torrent that empties the entire field by
  roughly 3.5 minutes. Foreground flowers shed their blooms (petals rise, wobble, spin, fade near the
  sky) while the stem withers in place; grasses/ferns/mounds/shrubs/vines lift off whole. Back-row
  departures spawn small colored "motes" that rise, and the row canvas is re-baked without them
  (throttled to one row per frame). Trees, cedar, sky, clouds, rain, and landscape stay. Nothing
  returns without a reload; no persistence.
- **3 new background vegetation layers**: back rows went 3 → 6 (offsets 74/91/106, scales
  0.31/0.25/0.20), each stepped back with more blur and less brightness; all six rows now carry
  grasses (26–34) and shrubs (2–4) in addition to flowers.
- **Perf**: row blur/brightness/saturate filter now baked once into the offscreen row canvas instead
  of applied per-frame per-row — per-frame cost dropped despite doubling the layer count.
- **Volumetric rain**: 230 → 490 drops in three depth bands (140 far @ 0.42, 120 mid @ 0.66, 230 near
  @ 1.0); far bands are thinner, slower, dimmer streaks only.
- **Soundtrack wired**: `assets/audio/gentlerain.mp3` (James's ElevenLabs pick) plays looped via a
  media element attached to the shared `ElasticSoundControl` — standard speaker button + hover volume
  slider top right, one autoplay attempt. No gain processing needed on this file.
- Note: the old `startAudio` path (synth rain/bells + Whitman recitation) was already dead code —
  `#audio-toggle` doesn't exist in the HTML — and remains in world.js unwired. Decide later whether
  to layer the poem/bells back in through the sound control or delete the code.
- **End blur**: 5s after the last piece of flora has fully ascended (queue drained, no active
  departures, no motes), a CSS blur ramps across both canvases + the landscape plates over 20s
  (quadratic ease-in, 0 → 110px) until the whole image is a wash. The sound-control button stays
  crisp (it's UI, not scene); rain/clouds keep animating underneath the blur. One-time; reload resets.
- **Ground strip fade**: the dark green-teal ground fill at the bottom of the canvas (the strip the
  flora sits on) now fades with dissolution progress — solid until ~55% of items have departed, then
  eases (quadratic) to fully transparent by the time the departure queue is empty, so the landscape
  plates read clean to the bottom of the viewport once the field is bare.
- **Field lowered**: the planting baseline moved from 91% of viewport height to 20px above the
  bottom edge (mote spawns moved to match), so the old ~170px ground band is now a thin strip and
  the mid-ground layers read properly above the foreground.
- **Rise strips**: the four timid deep rows (16–31% scale, 74–128px offsets — invisible behind the
  foreground) were replaced with three near-full-size strips stepping up the hill behind the field:
  offsets 112/198/282px, scales 0.8/0.62/0.48 with a 1.35× height boost, brightness 62/48/36%,
  blur 1.6/2.6/3.6px, 60/50/42 flowers + 130/105/88 grasses + 8/7/6 shrubs. Baked once per row
  (filters applied at bake time), so per-frame cost is unchanged. The three original small rows
  (offsets 16/36/56) remain as the immediate mid-ground.
- **Debugging note**: James's Chrome held a stale world.js cached from before the server's
  no-store fix — a hard refresh (Ctrl+Shift+R) was required once. Verified live rendering by
  pixel-sampling the canvas (rise bands 45–75% painted). A temporary "duplicate field floating
  mid-sky" test confirmed file delivery and was removed.
- **Graduated rank stack (replaces rise strips)**: after visual review against a temporary mid-sky
  duplicate of the field, the three big rise strips and the three original small tuck rows were all
  replaced by five tightly-spaced ranks behind the foreground line — offsets 40/80/120/160/200px,
  scales 0.92/0.82/0.72/0.62/0.52, blur 0.4–2.0px, brightness 98–72%, saturation 96–74%
  (James: keep back ranks nearly as bright as the front — reads better and pays off when everything
  ascends). Foreground-like height variety within each rank creates underlap. Counts: 72–48 flowers,
  150–110 grasses, 8–4 shrubs per rank; all baked once per row so frame cost is flat.
- Sky-duplicate test rig removed; field now renders only along the bottom.
- **Rank tuning (approved)**: after review against the sky duplicate, blur softened to
  0.4/0.8/1.2/1.6/2.0px and brightness lifted to 98/93/87/80/72% with saturation 96/91/86/80/74%
  (James: back ranks nearly as bright as front — "cooler looking and more effective when everybody
  flies up"). Correction: the earlier "stale cache" theory was wrong — the rows were always
  rendering, just too dark/blurred to see against the dark landscape.
- **Terrain-edge following (approved)**: at load/resize, the near-ridge plate's top silhouette is
  pixel-sampled (offscreen probe canvas, 6px columns, try/catch → flat rows under file:// taint)
  and ranks plant along it with graduated follow weights, final values 0/0.1/0.22/0.35/0.48
  front→back (0.95 max was "too high over the ridge"; halved). Lift clamped −200/+20px; mote spawn
  points inherit the lift. James: "much more natural… the actual hillside has a whole bunch of
  flowers on it."
- **The Giant**: James supplied `assets/giant/giant.png` (colossal marble bust on chroma green).
  Keyed to transparency with a PIL script (green-dominance alpha, LOW 18 / HIGH 80, 0.85 despill);
  original preserved as `giant-source.png` per the cloud-source convention. He lives as a DOM plate
  between far-hills (z2) and middle-hills (z3): 40vw wide, anchored `bottom: 26vh`, left 55%,
  blur 3px / saturate 70% / brightness 58%. He rises from the hidden valley (translateY 112% → 22%,
  smoothstep) over the final 30s of the dissolution — the schedule is simulated at queue build to
  predict blur start (queue-empty time + ~14s), so his crest coincides with the end blur beginning.
  Being inside `.landscape-layers`, the end blur swallows him with the rest of the scene.
- **Giant tuning (James, live review via REVIEW_SKIP_TO_GIANT)**: rise lengthened 30s → 45s → 55s
  (same crest point, synced to blur ETA); blur 3 → 5 → 7px; saturation 70% → 55%; size 40vw → 60vw;
  centered (left 55% → 50%); crest raised (shownY 22 → 12) to show the full neck.
- **Power thrum**: `assets/audio/power-thrum.mp3` (James's ElevenLabs file) starts looping the moment
  the giant's rise begins and never stops until reload. Sound control refactored from `{media}` to
  custom start/stop/setVolume mastering BOTH tracks — mute kills everything, slider scales
  everything. If sound is enabled after the rise began, the thrum joins in correctly (`thrumDue`).
- **REVIEW_SKIP_TO_GIANT flag is ON** (world.js, giant section): every load fast-forwards to ~3s
  before the rise — pre-departed flora marked gone via schedule replay, clock shifted by `timeSkip`.
  Flip to `false` to restore the full ~3.5-min ride before shipping.
- **Giant final tuning (approved — "That was perfect")**: size settled at 90vw (1.5× the first
  approved size); rise travels hiddenY 99% → shownY 32% over 55s, head just under the viewport top
  at crest; blur 7px, saturate 55%, brightness 58%, centered (left 50%, bottom 26vh). Thrum fades in
  over the first 10s of the rise (no delay — the deeper 99% start gives the sound its head start
  before he breaks the ridge), holds, fades out over 5s at crest; lives only for the rise.
- **Final inspection passed** ("passed with flying colors"): rise extended to 65s — he keeps
  climbing ~10s into the end blur (riseEnd = blurEta + 10000), head drifting just past the top of
  frame (shownY 24); thrum fade-out keys off riseEnd so it follows him through the wash.
  REVIEW_SKIP_TO_GIANT flipped to false — the full ride ships: ~26s stillness → slow rapture over
  ~3.5 min → torrent + giant + thrum → empty beat → 20s blur-out. Reload restores the meadow.
- World state: SHIPPED. Tuning knobs documented in entries above if revisited.

## 2026-07-11 — claude-fable (wrap-up session)

- **Sunface assets deleted for good**: James — "remove all sunface files completely. they will NOT
  be used." Both `assets/sunface/` (world) and `assets/wildflowers-dusk-sunface/` (repo root) are
  gone; the entry below saying assets were kept for reuse is now historical.

## 2026-07-11 — claude-fable (with James, live-tuning session)

- **Clouds**: 4 → 7 layers; recycled clouds respawn with their leading edge at the left viewport edge
  (was up to a sprite-width further out, causing minutes of empty sky); fade-in 3× faster; cloud band
  raised — sprite height capped at 42% viewport, bottoms held above 52% so clouds clear the middle-ground
  ridge; drift slowed to 5–17 px/s (was 8–28).
- **Clouds moved behind the mountains**: new second canvas `#cloud-field` (z-index 0, before
  `.landscape-layers` in DOM) carries sky glow + clouds; main `#sky-field` canvas keeps rain, trees, field.
  `context` is now a swappable `let` with `screenContext`/`cloudScreenContext` per-pass in `animate()`.
- **Performance pass** (page was freezing after back-flower rows landed):
  - Cloud sprites baked once per layer into offscreen canvases at half res with blur/saturate applied at
    bake time (`bakeCloudLayer`); per-frame is plain `drawImage` + `globalAlpha`. Respawns re-bake
    (`baked: null` in the spawn object).
  - Pine branches + cedar (~620 ellipses/frame) pre-rendered to `treeLayer` on resize; per-frame single
    `drawImage` with ±1.6px drift.
  - Back flower rows pre-rendered to 3 offscreen canvases; composited with one filtered `drawImage` each
    (never set `context.filter` around per-petal draws — that was the freeze).
  - Flower depth-sort cached at init (`flowersByDepth`).
  - Remaining known perf backlog (proposed, not done): throttle/pre-render field vegetation, cap DPR,
    remove dead code (`drawLandscape`/`drawHillLayer`/`drawDistantFauna`/`createCloudSprite`, unused
    `streamers` array).
- **Vegetation colors**: low bushes/grasses first matched to sampled near-ridge plate colors (teal-leaning),
  then replaced by James's explicit 7-color ground palette — `113422, 103031, 1D2341, 22566C, 283B38,
  153437, 164145` — assigned randomly per plant (`groundPalette`/`pickGround`) across grasses, ferns,
  shrubs, mounds, vines. Sampling tool lives at scratchpad only (zero-dep PNG decoder).
- **Mounds** reworked from flat-bottomed half-ellipse domes ("wide mushrooms") into irregular multi-lobe
  leaf clumps with grass-blade fans.
- **Back flower rows**: 3 receding rows (66 flowers) behind the main line — smaller, darker, blurrier
  with depth (offsets 16/36/56px, scale 0.68/0.52/0.40, brightness 78/64/50%, blur 0.6/1.2/1.9px).
- **Flower accents**: ~32% of flowers (main + back rows) override petal color with random pick from
  `FE8C6E / 7D4E9A / 3287C7` (`pickAccent`, `flower.colorOverride`; centers keep variety color).
- **Rain**: 120 → 230 drops (two "+50%"-ish requests).
- **Grasses**: 150 → 200 tufts.
- **Mountain plate blur**: 5.5px → 4.6px (CSS, `world.css`).
- **Sunface built then removed**: 4-expression morphing sun (assets remain in `assets/sunface/` and repo
  `assets/wildflowers-dusk-sunface/`) was added with timed appear/fade cycles, then James cut it from the
  page entirely. Code is fully gone; assets kept for possible reuse.
- Where things stand: James is happy with clouds and rain; vegetation palette freshly applied and
  worth a look with fresh eyes. Perf backlog above is the agreed next step if it still stutters.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history, `world.json`, and `docs/`.
- Where things stand: live and featured, with a large **uncommitted painted-landscape session** pending in
  the working tree (authored in a prior James + agent session):
  - Four painted landscape plates added as DOM images under the Canvas: `mountains.png`, `far-hills.png`,
    `middle-hills.png`, `near-ridge.png` in `assets/landscape/`, stacked with z-index and depth-specific blur.
  - `world.js` expanded by ~695 lines (cloud sprite drift, cedar framing, foreground vegetation work).
  - `world.css` layer stacking/blur changes; new `assets/clouds/`; new `cloudscape.svg`.
  - `*-source.png` files keep the chroma-green generation output; runtime loads only the alpha-ready
    files without the `-source` suffix.
  - Parallel doc updates pending in the same working tree: `CLAUDE.md`, `README.md`,
    `docs/architecture.md`, `session handoff.md`.

## 2026-07-04 — launch (commit 97499fe, "Launch Elastic Space")

- World shipped live. A rainstorm runs in reverse over a dusk field; Whitman rises through the weather.
- Canvas renderer: reverse rain, drifting cloud sprites, cedar framing, foreground vegetation.
- Whitman recitation via speech synthesis, begun only after the visitor opens the audio gate;
  soundtrack listed as reverse rain, speech synthesis, glass bells.
- Exits: flower portals (`.flower-portals` nav) using shared random drift.

## Standing guidance

1. Desktop-first; no mobile-specific compromises unless explicitly requested.
2. Layer order: sky, rain, clouds, painted terrain, cedar/foreground vegetation. Rain renders behind clouds.
3. Landscape plates stay opaque and separately stacked; never replace them with translucent procedural polygons.
