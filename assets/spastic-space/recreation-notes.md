# Spastic Space recreation notes — pork + scary_corndog

Analysis session 2026-07-19. Source material: this folder (`assets/spastic-space/`),
James's ~2002-era site "Spastic Space" (pre-Flash pages only; the Flash work is lost).
The two pages approved for recreation as Elastic Space worlds: **pork.html** and
**scary_corndog.html**. Discussion happened in-session; this doc is the durable spec.

## Framing (James, 2026-07-19 — read this before "recreating" anything)

These are NOT recreations of pages. The original HTML, table layouts, and especially the
old link structure are irrelevant — drift replaces all of that, and it's better. What we
extract is the *material*: the oscillator fields, the compositions, the sensibility. The
deliverables are Elastic Space worlds that happen to be built from Spastic Space DNA.
Fidelity to the source is a reference point, not a goal — when modern tools let a piece
be more than the original was, let it.

## Context from James

- Original pages were designed for 800×600 / 1024×768 — recreations must be **scaled up**
  for modern screens, not pixel-copied.
- The aesthetic: abstract, sarcastic, stream-of-consciousness web design. Hidden links,
  pages that are jokes about being pages.
- The GIFs are just fades/blinks between black and white at different speeds. We recreate
  with CSS/JS, not GIFs.
- The key effect to preserve: **many small oscillators at different periods running in
  parallel → composite pattern that never visibly repeats, feels organic.**
- James wants **tuner panels** (Chrome Rift pattern: toggle button + bottom panel, sliders,
  localStorage) on both pages so timing can be tweaked live by eye.

## The two source pages

### pork.html — title "stop it asshole"
- Three nested `<table>`s. Cell/table backgrounds are throbbing GIFs (`slutbag/bgthrob*.gif`),
  including a 256×256 slow one (`bgthrobback.gif`) behind everything.
- Inside: rows of 32×32 throb tiles, most linking to other pages
  (launch, tao, zipperhed, hypnowheel, whoops, kiddiehats, flo, beauty, red, red_hot).
- Caption below the stack: **"mesmerizing, ain't it?"**
- Everything pulses; layers at different tempos churn against each other.

### scary_corndog.html — title "Scary_Corndog"
- A ~14-column table mosaic of blinking black/white squares (`slutbag/bw1–14.gif`) at
  4/8/16/24 px, plus columns of 1×1 px images stacked with `<br>` (render as stippled
  vertical threads) and 620px-tall 1px verticals (long right-side rules).
- A few throb GIFs mixed in among the blinkers.
- Links hidden invisibly among the squares: red, 666, 23, whoops, savage_crap, pork (×2),
  squire, doinkdot, bababa, beancake, launch, 12345. Two Dreamweaver `MM_swapImage`
  rollovers. Navigation = mousing around a minefield.
- `scary-corndog.png` in this folder is a true rendering (one frozen instant) — use it as
  the visual reference for composition/density.

## Decoded GIF timing (exact, from tools/gif-analyze.mjs)

All animations loop forever. Delays in the GIFs are centiseconds; converted here to seconds.

### bgthrob family (pork) — smooth triangle fade white→black→white
21 frames, solid color per frame, even ~25-luminance steps. All six are the SAME ramp;
only the holds differ:

| file | hold | where |
|---|---|---|
| bgthrob.gif (32×32) | none | free-running ramp, every frame 0-delay |
| bgthrob2.gif (32×32) | 0.5s | at white |
| bgthrob3.gif (32×32) | 1.0s | at white |
| bgthrob4.gif (32×32) | 1.5s | at white |
| bgthrob325698741.gif (32×32) | 0.5s | at **black** (inverted-phase feel) |
| bgthrobback.gif (256×256) | 5.0s + 5.0s | at black AND at white — 10s breathing background |

### bw family (corndog) — 2-frame hard blink, pure white ↔ pure black, no fade

| file | frame A | frame B |
|---|---|---|
| bw1 | white 0 | black 0 (full-speed strobe) |
| bw2 | white 0 | black 0.5s |
| bw3 | white 1.0s | black 0 |
| bw4 | white 1.0s | black 0.2s |
| bw5 | black 0.2s | white 1.0s |
| bw6 | black 0.5s | white 0.2s |
| bw7 | black 0 | white 0 (full-speed strobe) |
| bw8 | black 1.0s | white 2.0s |
| bw9 | black 0.2s | white 2.0s |
| bw10 | white 2.0s | black 0 |
| bw11 | white 2.0s | black 3.2s |
| bw12 | white 0.4s | black 0.7s |
| bw13 | white 0.6s | black 0.1s |
| bw14 | white 0.2s | black 0.4s |

### Era note on 0-delay frames
Old IE played 0-delay frames as fast as it could decode (true strobe / fast shimmer).
Modern browsers clamp 0-delay to ~100ms/frame. So "authentic" has two readings:
2002-fast or modern-slow. James decides at build time — make it a tuner option.

**Safety note:** the full-speed strobes (bw1/bw7), scaled up on a modern screen, are in
photosensitive-flicker territory. Decide deliberately; probably cap the strobe rate.

## Build plan (co-build; plan first, James's go before building)

1. Two new worlds from `src/worlds/_template/`: `src/worlds/pork/` and
   `src/worlds/scary-corndog/`. Standard contract: world.json, CLAUDE.md, changelog.md,
   dashboard-control.js, registry (`npm run registry`), admin panel Pages links.
2. **CSS instead of GIFs.** Each tile = one element with custom properties for period,
   duty/hold, and phase (`animation-delay`). Throbs = luminance-ramp keyframes with holds;
   bw's = `steps(1)` square waves. One small stylesheet replaces all 20 GIFs.
3. **Per-instance phase de-sync** — every `bw3` on the original page blinked in unison
   (one shared decoded image). CSS gives each square its own phase offset. More organic
   than the original; make the de-sync amount tunable.
4. Scale up: corndog's mosaic composition grows 2–3×; pork's nested throb boxes likewise.
   Keep the compositions (use original HTML as layout spec + scary-corndog.png as proof).
5. Hidden-link hotspots become `data-drift` exits (≥3 per page, diegetic, invisible-until-
   moused just like the originals). world-registry.js + drift.js wiring per contract.
6. Tuner panel per page (Chrome Rift pattern): sliders for global speed, hold lengths,
   strobe cap, de-sync amount; localStorage-persisted.
7. Keep original titles ("stop it asshole" / "Scary_Corndog") and pork's caption
   "mesmerizing, ain't it?". No sound on either (the bgsound page was granite.html).

## Flash status update (2026-07-19, Ruffle session) — NOT lost

The "Flash work is lost" assumption above is wrong. Same day as the analysis session,
a parallel session set up **Ruffle** (the wasm Flash Player emulator, official
`@ruffle-rs/ruffle` 0.4.0) and James supplied **70 surviving .swf files** — everything
he has, per James. They play today in the test harness:

- Player page: `http://127.0.0.1:4174/tmp/flash-test/` (dev server must be up; Ruffle
  cannot run under `file://`). Clickable pill per SWF, plus drag-and-drop.
- Files: `C:\Users\brook\ai-projects\elastic-space\tmp\flash-test\swf\` (manifest
  `swfs.json` beside it — regenerate after adding files).
- Provenance: 26 recovered from the JBB-UX-Portfolio Terrawise.com v1.0 archive; the
  other 44 James added by hand, including the Spastic Space-flavored set: `s_01`–`s_31`,
  `ugh1`–`ugh4`, `hypnowheel.swf` (pork.html links to a hypnowheel page), `hairybanana`,
  `bombhead`, `superpanel`, `soundfun_01`, `face`, `gradient`, `hammer`, `horse1`.
- Playback quality: era suggests ActionScript 1/2, Ruffle's strongest territory. James
  has been browsing them and reports several hold up ("balls is so neat").

**⚠ Durability:** `tmp/` is gitignored — right now the only copies inside the project
tree are in a scratch folder. Before any tmp cleanup, these 70 files need a durable home
(e.g. `assets/spastic-space/swf/`). Ask James.

What embedding on the site would take, if/when wanted:

1. Vendor the Ruffle package into the repo (~10 MB of wasm+JS, self-contained, no CDN).
2. Served-only: Ruffle hard-fails on `file://`, so an embedding world violates the
   graceful-degradation rule unless it falls back to a static capture of the movie.
3. Audio-bearing SWFs (`soundfun_01` at least) would need wiring through the shared
   sound control, or muting.

**Status: parked at James's explicit request.** No embedding, no world-building. He
floated (same session): a couple of SWFs might get embedded "here or there"; a favorite
or two ("balls") could be *recreated* with contemporary techniques; and the thread he's
most drawn to is abstract rule-based animation — which is exactly the oscillator-field
insight this spec already documents. The two recreations above are the approved lane.

## Build status (2026-07-19, build session)

The pork recreation is renamed **Relaaax** (James, folder + title) and its field is
built: `src/worlds/relaaax/` — standalone renderer (`relaaax-field.js`) + Chrome
Rift-style tuner, staged in a temporary 1024×768 frame. Draft status, unregistered, no
drift exits yet; final setting TBD (James is thinking about displaying it on an
in-scene TV). See that folder's CLAUDE.md and changelog. scary_corndog remains unbuilt.

## Open questions for James (from the analysis session)

1. Keep a fixed cross-link between the two pages (they linked each other in the original)
   alongside random drift?
2. 0-delay tiles: 2002-fast or modern-clamped as the default?
3. Admin panel listing shows the original page titles verbatim?
