# Lumina — Claude instructions

Began as the Spastic Space pork.html oscillator field (2002), rebuilt as a tunable,
embeddable renderer; it is now a full music-reactive visualizer (scene layer, FX rack,
beat clock, authored DJ sets).

**Naming history — two renames, don't get them confused.** The build started as the
"pork" recreation, which James renamed **Relaaax** on 2026-07-19 (after the original
2002 GIF piece). On 2026-07-26 he renamed it again to **Lumina**, because the old name
described a black-and-white GIF loop and no longer described this: *"it's now not really
appropriate or descriptive of what's going on here."* Lumina is Thomas Wilfred's term
for light treated as an art form in its own right. Everything — folder, slug, globals,
CSS prefix (`lum-`), localStorage keys, BroadcastChannel — is `lumina` now;
`migrate-storage.js` copies James's saved state over from the old keys on first load.
Entries in `changelog.md` from before that date use the old names on purpose.

## Docs

- `changelog.md` — session history, newest first.
- `assets/spastic-space/recreation-notes.md` (repo root assets) — the source spec:
  decoded GIF timing table, framing, era notes. The timing constants in
  `lumina-field.js` come straight from it.

## START HERE — the wave queue (2026-08-03, James's "to infinity and beyond")

**2026-08-08 UPDATE — THE AUDIO THREAD IS REOPENED (James's explicit ask,
supersedes the "parked" note below):** he wants the detection stack made
"more intelligent and dynamic" and is ready to work hard on it. Claude's
review + proposals are in the 2026-08-08 changelog entry; his picks are
PENDING. Also pending his answers: the RELEVANCE DIMMING design (controls
that can't affect the current look dim — 4 design calls in the changelog
entry) — he called it the starting point, ahead of easier param↔beat
wiring. New Suno tracks are landing in assets/sound-tracks/ (auto-discovery
carries them); analyze keepers when he names them. PANEL RULE (2026-08-08):
control rows NEVER wrap — the slider track/select is the only elastic
element; label, output, star, ⓘ stay pinned on one line. And the ⓘ popover
carries its own --gold copies because it lives on document.body — any new
panel custom property a popover style uses must be duplicated there.

**FIRST, PROPOSED 2026-08-03 late and NOT yet approved — the LEARNING BENCH.**
James's ask after flying the new FX: a way to learn effects one at a time
from a clean start ("okay, this one makes them round... this one blurs").
Proposal on the table, awaiting his go + two answers: (1) `bench` command-bar
button — snapshot current state, cut to the 2002 grid with all fx/scene at
zero, show an effect-chip strip where each chip SOLOS its effect at mid
value (click next chip = previous drops out), press again to restore;
(2) the PRACTICE CLOCK — a silent fixed-120BPM internal grid feeding
pulse/bar/swing/accents so beat-reactive behavior works with no track
playing (NOT the parked audio thread — no detection, just a clock).
Open questions: build both together? chips = FX rack only first, or also
scenes/structure? Reminders that already exist for him: "pork 2002" preset
= the baseline grid, double-click any slider resets that key, visual-tab
reset = house default.

The 2026-08-03 session studied his 27 reference stills (tmp/lumina/
viz-examples — the Synesthesia captures are the quality AND interface
target) and set a three-wave build plan. **THE AUDIO THREAD IS PARKED, his
explicit call:** no beat-detection changes, no tempo-matching complexity, no
tick-lock, no structure lane — "we will come back to it." The timeline-markup
/ rhythm-template idea (slot timing authored, content dice-rolled) stays
agreed DIRECTION for later; see the project CLAUDE.md Todo and the
`lumina-structure-rhythm-template` memory.

**WAVE 1 — BUILT 2026-08-03, awaiting his eyes** (changelog entry has the
detail): the ⓘ info library (tuner-info.js), per-scene controls + punch
verbs (scenes.js DEFS), fxKaleido v2 fold (rings/refold/spin +
fold-lab.html). Dice odds his calls: scene rolls flat "nuts random", blur
stays minimized.

**WAVE 2 — next, each with its own go:** (1) the fiber-sphere instrument
(his four "sphere" stills are ONE object: woven calm ↔ EXPLODE ↔ inside
view ↔ long fibers; 3D GPU fiber system, own look-dev lab, EXPLODE punch);
(2) ink scene v2 (the "swirls" stills: more octaves, sharper filaments,
deeper dark-to-electric range); (3) rainbow soft-gradient palette family +
an ultra-soft gradient-wash breather scene (viz 8); (4) flame evolution
stage 1 (approved genome swirl — see `lumina-flame-evolution` memory).

**WAVE 3 — backlog:** chrome cavern cluster (synesthesia 6/7/8: displaced
heightfield + wet specular, lab first), Voronoi cells (viz 18, Max Cooper
"Order From Chaos"), tunnel cluster, remaining FX (plasma, caustics, moiré,
glitch, feedback zoom, full chromatic-aberration bloom).

Older context worth keeping: the ↩ back and `keep` buttons have still never
been human-clicked against a live host, and the `.tuner-minis` 15em column
minimum has never been swept.

## Next session (2026-07-25 night wrap)

- **Protected behaviors added on James's direct feedback (laptop session):**
  (1) free play is the DEFAULT — claude's set is opt-in via the transport
  bar; never make a composed set the entry experience again. (2) The
  player (music.js, bottom-left, `.lum-player` since 2026-07-27) stays
  always visible — a two-row card: brand row (SVG logo + LUMINA wordmark)
  over the transport row ◀◀ ▶ ❚❚ ■ ▶▶ (separate play and pause; SVG icons
  only — text transport glyphs go color-emoji on Windows), track name, set
  switch, the labelled `configuration` button (music.js seats
  `#lum-tuner-toggle` there, world.js owns its behavior), then the ❄
  animation freeze ({scope:"field", type:"freeze"} → field.setFrozen: dt→0,
  picture holds, rendering and music continue; transient — never saved into
  presets, resetAll leaves it alone), then the 🎲 dice (five-pip SVG die,
  same randomize command as the panel's — ↩ back undoes bar rolls too),
  then the blurry die (melt roll v2: {scope:"field", type:"randomizeTween"}
  → world.js rollTween(2000) (4s → 2s, James 2026-07-31) — numerics/hex
  colors ease in-out over 2s
  while a sin-shaped blur veil rises; the unmorphable keys — grid, layout,
  scene, pattern — swap at PEAK veil (p=0.5) where nothing is legible, then
  it sharpens into the new look. The veil never lands in `state`; ONE undo
  entry; any other config write cancels and strips the veil), then the ⛶ expand toggle ({scope:"frame", type:"expandToggle"}: frame →
  full window ↔ prior size; arrows flip inward while expanded; manual frame
  sizing clears it). Hotkeys on the main page: Space = play/pause,
  Z = dice — suppressed while a form control has focus, and bar buttons
  blur after click so Space never re-fires the last-pressed button.
  2026-07-31 additions: a VOLUME slider in the bar (the shared top-right
  speaker is HIDDEN in this world, James's call — world.css `.es-sound
  {display:none}`; the bar's slider, the panel's command bar, and the audio
  tab all drive the same shared gain), the dashboard icon at 50% alpha, and
  a ▾ collapse in the brand row that folds the card to logo + LUMINA + ▴
  (`lumina-player-mini`; "always visible" now means at least the wordmark).
  (3) **The controls open DETACHED by default** (James, 2026-07-27, second
  call of the day — supersedes the in-page-first flow): the configuration
  button opens/closes the `tuner.html` window. THE DOCK PICKER UI WAS
  REMOVED 2026-07-31 (James: "kill the dock icons... I'm only gonna ever use
  this as a remote") — do not resurrect it. The host still understands
  {scope:"page", type:"dock"/"attach"} and the `lumina-dock` /
  `body.lum-dock-<side>` / `--lum-dock-w/-h` machinery survives because the
  no-BroadcastChannel fallback still docks the panel in-page; there is just
  no button for it.
- **Sets are v4** — fully re-cut on the bar grid; every event is B(n) or a
  measured drop/quiet, labels carry bar numbers ("b41 sheet lightning"), and
  composition-sim ENFORCES the grid (events within 90ms of a bar or on a
  measured transient). Keep that assertion green when editing sets.
- James still hasn't had a full run: his stated flow is baseline → visual
  experiments → audio + reactivity → claude's sets. Expect 10%-step tweaks
  to scene gains/tone maps by bar-numbered label.
- SHELVED BY JAMES 2026-07-25 (his call after plain-terms recap): true GPU
  fluid sim (revisit only if the curl-noise ink scene leaves him wanting) and
  the 3D rave venue (he's unsure he wants it at all — do not pitch again
  unprompted). The other 2026-07-24 direction ideas are absorbed: #3
  waveform-as-matter = a future scene; #4 Electric Sheep breeding = the flame
  farm (tmp/lumina/flame-farm) feeding new flame genomes.
- Flame farm results (if the overnight batch ran) need James's morning cull —
  picks become named genomes/scenes.
- Still open: more Suno tracks (add to TRACKS + analyze + compose), live audio
  input phase 2, final setting decision, ship wiring (drift/registry/admin
  link — world is still draft).

## Scene layer (v3, 2026-07-25)

- `scenes.js` — pure data/helpers (shader sources + palette-stop math), no
  DOM/GL: fx.js compiles and renders, sims lint it, tuner.html loads it for
  the scene list. Four scenes: ink, ridge, flame (90k-point GPU chaos game),
  nebula. Shared uniform contract: uTime/uScale/uDrive/uWarp/uBeat/uPal[6]
  (+uRes for frag scenes, uAspect/uGain for flame).
- Scenes render in fx.js "pass 0" into their own framebuffer, then the
  feedback pass composites: `mix(scene * sceneMix, tile.rgb, tile.a *
  sceneTiles)` — tile canvas goes transparent-background when a scene is on,
  and display-list items tagged `kind: "backdrop"` (outer box + row boxes)
  fade with `1 - sceneMix`. Flame gets a Reinhard tone map (uSceneTone).
  With scene "none" every uniform collapses to the pre-v3 math exactly.
- `scene !== "none"` activates the GL path even with all fx* at 0 (gate in
  lumina-field.js frame()).
- The scene clock accumulates dt * sceneSpeed (like the field clock) —
  modulating sceneSpeed never snaps the scene.
- Scene shader edits are verified by tmp/lumina/fx-test.html, which compiles
  every program SYNCHRONOUSLY against a real GL context — trust that half
  even when the Browser pane isn't compositing (its live-mount half needs a
  displayed pane). Run composition-sim after any scenes.js/DEFAULTS change.
- Adding a scene: shader in scenes.js (+LIST), nothing in fx.js unless it
  needs a custom draw path (flame pattern), tuner select picks it up from
  LIST, sim asserts the uniform contract automatically via SCENES.FRAG.
- **Per-scene registration (2026-08-03, `DEFS` in scenes.js — the
  Synesthesia two-tier model):** every scene ALSO registers in DEFS —
  `params` (its own knobs: key must exist in DEFAULTS and in
  LuminaRandom.GROUPS.scene, carries kind + info text; shown in the scene
  card only while that scene plays) and up to THREE `punches` (James's cap
  — momentary verbs, "scn-" prefixed field-key override maps; they appear
  as gold pads in the perform strip while the scene plays and ride
  world.js's punch machinery, never landing in state). composition-sim
  enforces all of it. Adding scene controls/verbs never touches tuner.js.

## Flame genomes (2026-07-26)

- The flame scene plays REAL bred genomes from `assets/flame-genomes.js`
  (James's 20 picks of 7,307). Never hand-edit that file — re-run
  `node tmp/lumina/flame-farm/export-genomes.mjs` (it reads picks.json +
  genomes.json). Renders: `tmp/lumina/flame-farm/renders/<id>.png`.
- `sceneGenome` selects by NAME; `scenePalette: "genome"` uses the genome's
  own bred stops. Each genome carries a precomputed frame {cx, cy, scale,
  gain} — gain equalizes diffuse vs concentrated attractors, without it the
  spread-out ones render as faint fog.
- **Two lessons, both invisible to reasoning and caught only by rendering:**
  (1) the chaos game's per-iteration branch pick needs a WELL-MIXED hash —
  an additive sequence makes every point follow the same branch order and the
  cloud collapses to a dot; (2) live sample counts are ~15× lower than the
  offline farm's, so brightness must be normalized per genome.
- Verify with `tmp/lumina/genome-test.html` (renders all genomes through the
  shipping shader, flags fill ratios, posts a contact sheet to
  `tmp/snapshots/flame-genomes-live.jpg` via `POST /api/dev-snapshot` —
  that endpoint exists because the agent browser pane can't screenshot unless
  it's displayed; use it for any WebGL work here).

## NEXT UP — James's three, agreed 2026-07-26 (each needs its own go)

He named these after watching v6 and playing with the dice. All three are
approved as DIRECTION, none are approved to build — discuss and plan first.

1. **Better beat detection, generally — including "there is no beat here."**
   The current detector forces ONE confident tempo across a whole track.
   James: *"Timber is completely atonal, arrhythmic for the first minute —
   there's actually no beat at all, so that's pretty hard to set your beat
   to."* That is a correct diagnosis of why Timber's lock is weakest (1.52×
   vs Angular's 2.55×). The fix is time-varying: measure beat confidence per
   bar/section, let tempo drift or lapse, and have the visuals KNOW when
   there's nothing to lock to (accents silent, free-running motion) instead
   of pulsing against an invented grid.
2. **Split the sound into registers / instruments.** He asked for "some type
   of comb filter so that we're hearing different instruments, different
   registers" and driving individual parameters from each. Today everything
   follows four coarse bands and one overall level. Real separation (kick vs
   hats vs mids, or harmonic/percussive separation) would let the kick drive
   one thing and the hats another.
3. **Per-parameter re-rolling, in time.** The dice, but musical: individual
   knobs re-rolling on their own schedules against the beat grid, rather than
   the whole look changing at once.
4. **Make the panel a VJ instrument (added 2026-07-27, after panel pass 1).**
   His words: it is *"kind of a big jumble of lots of different stuff"* and
   needs *"better grouping with shorter, clear explanations"*; it must
   *"invite play, and invite live play while music is playing"* — you should
   *"be able to see what you're gonna do and kind of use it like a VJ."* And
   the dice *"is gonna become a whole control function"*, not one button.
   Pass 1 (2026-07-27) only did typography and reach: Roboto, capped slider
   tracks, a text-size control, and the ↩/🎲/keep roll cluster. The grouping
   and the live-play affordances are untouched and are a DESIGN CONVERSATION
   FIRST — plan with him before writing panel code. Bear in mind the descs
   are currently long sentences under each control; his ask is shorter and
   clearer, which means editing copy as much as moving boxes.

**Dice status:** the manual 🎲 button SHIPPED and James loves it — *"pressing
that dice button every four bars is quite incredible, one of the better
visualizations I've actually seen."* An automatic version (roll every N bars /
on punches, with a partial-roll depth) was built the same night and
**REVERTED at his instruction** — not because it was wrong but because it
isn't ready to go in "willy nilly". Some variation of it lands later, most
likely as item 3. Don't re-add it unprompted.

## The clock, and why it is sacred (2026-07-26)

- **James's ear beats the detector. Always.** He called Angular Ritual at 115
  when the analyzer said 76.01 (exactly 2/3 — a metrical-level error) and he
  was right to within 0.2%. `BPM_OVERRIDE` at the top of track-analyze.mjs is
  where his calls live; add a line whenever he names a tempo.
- Tempo detection is comb-proposes / alignment-disposes with a **binomial
  likelihood ratio**, not a hit ratio and not hits-minus-chance. Both of those
  are metrically biased and were tried and rejected the same night (ratio →
  Timber at 82.6 = ×⅔; excess → 186.2 = ×3/2). Don't "simplify" it back.
- `assets/track-grid.js` is generated — never hand-edit. It carries bpm, beat
  and bar length, first downbeat, sections, per-bar energy, and PUNCHES
  (drop / break-return / groove / build).
- **Sets are authored in BARS** (see below). Times are derived from the grid
  at load, so re-measuring a track re-times its whole set.

## Beat lock (v6, 2026-07-26)

- Four mod sources come from the grid, not the audio, so they have no
  detection lag: `pulse` (accent impulse), `bar`, `phrase`, `swing`. Use them
  for anything that should feel ON the beat; keep the band followers (bass,
  mid…) for texture that should follow the sound.
- `accent` (field key) picks which sixteenths pulse fires on — ten patterns in
  music-dsp.js ACCENTS. `syncBeats` locks one flash cycle to N beats exactly
  (music.js computes speed = RAMP / (syncBeats × beatLen)).
- Accents deliberately do NOT fire before the first downbeat.
- `syncBeats`/`nest`/`rows`/`cols` are in composition.js SNAP_KEYS — they must
  never be interpolated by a ramp.
- Verify with `tmp/lumina/clock-test.html` (asserts the impulse lands on the
  exact frame its sixteenth begins).

## Set composition (v6): looks + variations + a bar score

- `assets/compositions.js` defines, per track: a LOOK vocabulary (complete
  named identities), VARIATION operators that bend a look while keeping it
  recognizable, and a SCORE of `[bar, look, variation, extra]`.
- `call(from, to, every, pairs, varies)` expands call-and-response phrases —
  this is James's "one setting for 4 beats, then another, then the first again
  but varied".
- **New looks are reserved for measured punches**; between them, vary. The sim
  asserts the set lands on ≥70% of the analyzer's punches.
- Tune conversationally by bar label ("b45 D/blast").

## Musical structure (analyzer v2, 2026-07-25)

- track-analyze.mjs now emits `totalBars`, `phrase` ({len, confidence} from an
  8/12/16/24/32-bar vote), and `sectionsV2` (lettered sections with bar-grid
  boundaries + energy) alongside the old sections/drops/quiets. Compose scene
  changes on sectionsV2 boundaries / drops; smaller mutations on 8/16-bar
  phrases; convert bars→seconds via firstDownbeat + (bar-1)*barLen.

## Architecture map (v2, 2026-07-24)

- `lumina-field.js` — the renderer/instrument. v2 adds structure (layouts,
  shapes, waveforms, palettes/hueShift, merge/rotate/spin/displace/sizePulse,
  counter, nest) and the fx* config keys. Grid layout keeps the ORIGINAL flex
  DOM path; defaults render pork 2002 verbatim (sim-asserted — keep it that
  way). Non-grid layouts + FX read positions from `layoutTiles()` /
  `displayList()` (analytic, design coords).
- `fx.js` — WebGL post chain (13 effects + the kaleido v2 fold, 2026-08-03:
  `fxKalRing` radial ring-repeat / `fxKalIter` 0-2 refolds / `fxKalSpin`
  slow fold rotation — sub-params inert unless fxKaleido > 0, all-zero ==
  the legacy fold exactly, so old presets/sets are untouched. The dice rolls
  them only WITH a rolled kaleido, never in the rack shuffle. Judged in
  `tmp/lumina/fold-lab.html` (KEEP — that's where fold math gets judged
  before it ships) and proven end-to-end by `tmp/lumina/kal-probe.html`).
  Consumes the field's display list
  via `field.setFrameHook`; active iff any fx* key > 0; DOM path untouched
  when off. FX knobs are field config keys — never invent a side channel.
  **MAX_DIM (the FX resolution cap) must stay ≥ the CSS pixel width of a
  full-window frame on James's screen (~2560)** — below that the whole GL
  path upscales and reads as blur (the 2026-07-28 "blur every roll" bug;
  1600 was fine only inside the old 1024px staging frame).
- `tuner.js` + `tuner.css` — the whole control surface (two tabs: visual |
  audio), bus-driven, no state of its own. Runs embedded (index.html shell
  `#lum-tuner`) and detached (`tuner.html` + `tuner-remote.js`, over
  BroadcastChannel "lumina-ctl"). New field/music params get their control
  HERE, in the right tab — inside the right CARD: since 2026-07-31 (pass 4)
  sections are `.tuner-card`s created by `card(parent, title, summary, {group})`,
  flowing into CSS columns (`.tuner-cards`, 24em) so a maximized window
  fills side to side; "looks", "perform" and "player" are full-width cards
  outside the columns. Headers are gold (`--gold`), and every card carries a
  one-sentence plain-language `.tuner-summary` — new sections must too.
  Control descs are deliberately short and non-technical; the text-size
  control is a − / + stepper, not a slider.
- **Panel pass 5 (2026-07-31, James's "do them all") — the five live-play
  systems.** (1) Per-card 🎲/🔒: key-groups in presets.js
  `LuminaRandom.GROUPS` — every NEW rollable key must join exactly one group
  (composition-sim enforces coverage); locks are host-enforced in world.js
  (`randomize {group}`, `lockToggle`, `lumina-locks`) and honored by BOTH
  dice including the melt roll. (2) Visual pickers: layout/shape/wave/
  palette/scene/pattern are chip strips (`chips()` + draw fns at the top of
  tuner.js); every drawer must survive unknown values (generic fallback) so
  extending the field can't break the picker; pattern chips animate the real
  phase math. (3) Ghost dots: music.js streams live modulated values via
  `host.mod` (~15 Hz) → bus `onMod`; field sliders show a gold dot where the
  music holds them. (4) The perform strip: momentary punch pads (PUNCHES in
  world.js — overrides ride over state and NEVER land in it; music tick
  merges `bridge.getPunch()` last) + an XY pad (axes in `lumina-xy`). Keys
  1–6 hold-to-fire. (5) "my deck" favorites (☆ on any control, `lumina-favs`)
  + per-card collapse (`lumina-collapsed`) — per window, like text size.
  New controls automatically join the deck system via the factory BUILDERS
  registry; bypass the factories and you lose starring.
- **Panel pass 6 (2026-07-31): the layout engine + command bar.** The sticky
  header is `.tuner-head` = tabs row + COMMAND BAR (play/pause, stop, freeze,
  dice, melt, back, volume — SVG transport icons, reflect from snapshots).
  Cards register in a per-pane registry (`CARDS` in tuner.js via `card(pane,
  title, summary, opts)` — pane is the string "visual"|"audio", cards never
  append themselves); panes render from `lumina-layout` (per window): rows of
  1–5 cards (MAX_PER_ROW), equal flex shares, row height auto or pinned in
  `em`. `edit layout` = drag grips + row-height grips; the ⚙ gear = per-card
  show/hide (hidden means NOT RENDERED, distinct from ▾ collapse) + reset.
  THE EXTENSIBILITY CONTRACT: register a card and it appears as its own row
  at the end for stores that predate it; ids that stop existing drop
  silently. Never hand a card a fixed width — width is always the row share.
  CARDS ARE TAB-AGNOSTIC (2026-07-31, James: the visual tab must be able to
  host reactivity/matrix): the registration pane is only the card's HOME
  (default placement + adoption); the gear's ⇄ sends any card to the other
  tab's board, renderLayout resolves ids across both registries and dedupes.
  Reactivity's stock home is the VISUAL board (full-width, under perform).
- **The panel is sized in `em` off ONE base (2026-07-27).** `.lum-tuner` sets
  `--ui-base: 21px` (16px until 2026-07-31, then 26px for an hour; James
  dialed the final size by eye — "the current eighty percent becomes the new
  one hundred". Scale floor is 50; the scale key is `lumina-ui-scale3` —
  bump the key WHENEVER the base changes so old-base percentages can't land
  at the wrong physical size) and
  `font-size: calc(var(--ui-base) * var(--ui-scale, 1))`;
  every type size, pad, gap, control height and slider cap in `tuner.css` is
  `em` so the text-size control in the tab bar scales the whole surface
  together. EXCEPTION (found 2026-07-27): range inputs don't inherit the panel
  font, so their `em` resolves against the browser's ~13.33px input default and
  does NOT follow the text-size control — that's why the 20em/7.5em caps
  measure 267px/100px, and it's kept that way on purpose (the caps were
  measured; see the comment in tuner.css). **Do not add `rem` values to this stylesheet** — the only three
  left are viewport-anchored on purpose (bottom offset, scroll cap, width
  backstop). Keep the `--ui-scale` fallback in step with `UI_SCALE_DEFAULT` in
  tuner.js; it is what paints before the module runs. The scale persists PER
  WINDOW (`lumina-ui-scale`) and is deliberately not sent over the channel —
  the detached controller is usually on a different screen.
- **Slider tracks are capped** (20em, 7.5em inside a grid column) and control
  rows are grid columns, not `flex: 1`. Before this, two controls could split
  a 1585px panel between them and a knob got a 1470px track. Don't reintroduce
  fluid track widths — long tracks cost mouse travel and buy no precision.
- **The roll cluster** (↩ back / 🎲 dice / keep) lives in the preset row.
  `back` sends `{scope:"field", type:"undo"}`; world.js keeps a 30-deep stack
  pushed inside `applyPreset`, so it records whole-look JUMPS only — never
  slider drags. If you ever make hand tweaks undoable, do it as a separate
  stack; mixing them makes "back" useless during a set.
- `world.js` — host: clean state authority, command router
  (`LuminaHost`), field presets, frame, detach handshake. Since 2026-07-31
  also the timeline hooks: `onFieldCommand` (the recording tap — every live
  field command with post-state) and `replayBase`/`replayPunch`/
  `replayFreeze` (the replay sink — bypasses the tap, the undo stack, and
  preset churn; the ghost must never re-record or pollute undo).
- `timeline.js` — THE PERFORMANCE RECORDER core (2026-07-31), DOM-free:
  event model, punch-in merge contract, replay cursor. **NO QUANTIZE — a
  James law, not a default:** he does not trust the analyzer's grid; moves
  are stored at raw audio time and the timeline UI must never snap, nudge,
  or show bar claims. music.js owns the wiring (capture, per-track store
  `lumina-timeline`, loop cycling, latch, fold-on-seek, the "mine" / "your
  set" player mode). Run `node tmp/lumina/timeline-sim.mjs` after touching
  any of it. Known limitation: melt rolls record their landing, not the
  glide. Not yet file-backed (localStorage only).
  **NAMED TAKES (2026-08-12, James's brief after losing a performance to the
  track-end auto-advance):** recording survives EVERY exit — track end while
  armed auto-punches-out, commits, prompts to save ("James N" pre-filled;
  Cancel keeps it as the unsaved working recording), then STAYS on the track
  rewound + paused and switches the set menu to the take so play replays it
  (NO auto-advance while recording, his explicit call, round 2 same night);
  track switch / ■ stop commit silently. Takes live in `lumina-takes` (per track,
  `bankTake()` in music.js); the SET MENU is the picker (his call): both dj
  selects list free/claude, then a disabled divider + this track's takes
  (+ "unsaved recording" when the working recording differs from every
  take) — zero takes, zero entries; never re-add a bare "your set" entry.
  The working recording remains the only overdub surface; armed replay
  always ghosts the WORKING recording. Selects rebuild sig-guarded and
  reflect from `music.djValue`, not `dj`.
- `music.js` — audio graph, player, reactivity loop, DJ playback; registers
  with the host and mounts the tuner. `music-dsp.js` — DOM-free DSP + the
  TARGETS table (new modulatable params get an entry there).
- `tuner-info.js` — THE ⓘ LIBRARY (2026-08-03, James's brief: short labels
  on the surface, verbose explanations + "significant visual examples"
  behind a small i). `LUMINA_INFO.INFO[id]` (ids `"scope:key"`, `"card:id"`,
  `"row:id"`) holds the copy; `DEMOS[name]` are draw-closure factories for
  the animated mini-demos (mini flash-field engine, FX cartoons, scene
  stage, envelope meters). Loaded before tuner.js in BOTH index.html and
  tuner.html. The control factories look entries up by id and fall back to
  any inline `desc`; the popover lives on document.body (the panel's
  backdrop-filter would trap position:fixed) and inherits the text-size
  control via an inline font-size on open. **Every new control or card must
  register an INFO entry** — surface prose is retired; the only surviving
  on-panel sentence is the pattern hint (a live readout).
- Script order in index.html matters: field → presets → dsp → composition →
  compositions → flame-genomes → scenes → fx → tuner-info → tuner → world →
  timeline → music.
- Sims: `node tmp/lumina/composition-sim.mjs` (58 asserts — engine, sets,
  field-v2 units) and `node tmp/lumina/music-sim.mjs` (14) after ANY change
  to the field math, DSP, engine, or sets.

## World-specific rules

- **Architecture is deliberate:** `lumina-field.js` is a standalone renderer
  (`LuminaField.mount(container, config)`) that knows nothing about the page, tuner,
  or localStorage. The final setting is undecided (James is thinking a TV in a scene —
  people watching and drooling), so the field must stay droppable into any container.
  Keep page concerns in `world.js`.
- The field scales all geometry off its container via `--ux`/`--uy`/`--umin`
  ("one 2002 pixel", split per axis since 2026-07-23 so fill mode can stretch);
  size and aspect ratio of the host box must never matter. Geometry knobs land as
  unitless CSS vars on the root — world.css multiplies them by the u-vars.
- Flashing patterns live in the renderer's `PATTERNS` array (24 as of 2026-07-23):
  each assigns per-tile timing spec + phase offset from (row, col, grid, twist).
  `spread` scales phases at runtime (no rebuild); `twist` re-runs the pattern;
  only grid-size changes rebuild DOM — and even that keeps the field clock, so motion
  never restarts. "pork 2002" must always reproduce the original spec matrix
  verbatim at 3×4.
- Rendering is JS rAF driving background colors — NOT CSS keyframe animations. This is
  what makes live tuning phase-continuous (speed changes never snap) and desync a real
  parameter. Don't "simplify" it to CSS animations.
- Timing constants (RAMP = 2.1s, the hold table) are decoded from the original GIFs —
  don't retune them in code; the tuner exists so James tunes by eye.
- **Load behavior (James, 2026-07-25; scaled 2026-07-27; "default launch"
  2026-07-28): the page OPENS on the user preset named "default launch" if
  one exists** (case-insensitive; the `set as default` button in the preset
  row overwrites it with the current look, confirm-guarded). This is James's
  explicit carve-out from the never-apply-on-load rule — the automatic
  last-session state still NEVER applies on load. **Without that preset, the
  page opens on the HOUSE DEFAULT — the 2002 animation edge-to-edge: 16 cols,
  rows derived from the window aspect (autoGrid), fill mode ON so the outer
  border reaches every screen edge, in a full-window frame** (`START` in
  world.js = renderer DEFAULTS + autoGrid + fill;
  reset/resetAll target START). FRAME: fit-screen is the default and frame
  sizes NEVER persist (James, 2026-07-31 — replaces the old stored-size-wins
  rule): the frame opens at window size and follows window resizes until a
  size is set by hand that session; "fit screen" returns it to auto. The
  renderer's own DEFAULTS
  stay pork-2002-verbatim at 3×4 (sim contract), and presets remain partials
  over DEFAULTS — not START — so a preset without rows/cols means the
  original grid ("pork 2002" in the menu is the true original). Tuning still
  writes to localStorage (`lumina-tuner`) on every change, but the stored
  state is never applied silently on load — it's reachable as the "last
  session" entry (value `last`, "auto" optgroup) in the field preset menu.
  Don't reintroduce apply-on-load.
- Both tuner tabs have a reset: visual's resets field + frame (`resetAll`,
  field scope), audio's resets reactivity/matrix/shuffle/per-track/DJ mode
  (`resetAll`, music scope — leaves playback and volume alone).
- Player transport (2026-07-25): play/pause, stop (pause + rewind), prev/next,
  seek scrubber + time readout, volume slider (drives the shared sound control
  via `soundUI.setVolume`, so the speaker's hover slider stays in sync).
  `timeupdate` streams snapshots ~4 Hz while playing — tuner selects with
  rebuilt option lists must sig-guard their rebuilds or open dropdowns snap
  shut (see the preset reflectors in tuner.js).
- `presets.js` is the PERMANENT preset list (each config a partial over DEFAULTS).
  James's saved presets live in localStorage `lumina-presets`; when he says one
  earns a spot, bake it into `presets.js` — never delete or retune existing
  entries there without his say-so.
- The staging frame in index.html is TEMPORARY, not the design (full-window
  by default since 2026-07-27; resizable via the panel and the ⛶ toggle).
- Status: draft/WIP — intentionally NOT in the registry, no drift exits, no admin panel
  link yet. Those land at ship time along with the final setting.
- Open idea (unbuilt): a "steps" option quantizing the ramp to the GIFs' 21 discrete
  levels for the authentic stepped flicker.

## Music reactivity (built 2026-07-24, phase 1)

- Tracks are James's Suno MP3s in `assets/sound-tracks/`. Since 2026-07-28 a
  served page AUTO-DISCOVERS any audio in that folder
  (`GET /api/worlds/:slug/tracks` in server.mjs → appended to `TRACKS` at
  load; the player's track readout is a dropdown). The baked `TRACKS` list in
  music.js remains the file:// fallback AND the set with measured grids +
  composed sets: discovered tracks get band reactivity only, so when a
  dropped-in track earns a keep, analyze it (track-analyze.mjs), compose it,
  and bake it into `TRACKS`.
- Architecture mirrors the field/world split: `music-dsp.js` is the DOM-free
  math (bands, auto-gain, envelopes, beat detector, mod matrix) so
  `tmp/lumina/music-sim.mjs` runs the exact shipping code — run it after any
  DSP change (14 assertions). `music.js` is page glue: audio graph, player,
  reactivity UI, modulation loop.
- **The modulation contract:** `world.js` owns the clean base config (`state`,
  exposed as `globalThis.luminaTuner`); music writes modulated values onto the
  live field per frame and restores base on stop/master-0. Never save, reflect,
  or preset from `field.getConfig()` while music can be playing — always the
  clean state. `lumina-field.js#setConfig` refreshes selectively by key so
  these per-frame writes do no layout work; keep new config keys sorted into
  FIT_KEYS/GEO_KEYS/COLOR_KEYS or they won't refresh.
- The analyser taps BEFORE the volume gain — reactivity must never depend on
  listening level. Element volume stays 1; the gain node is the volume.
- Reactivity presets (`lumina-music-presets`, factory "stock aggressive"
  protected like field presets) and per-track recall (`lumina-music`
  store) follow the field-preset rules: bake earned ones into code only on
  James's say-so.
- Phase 2 ideas (unbuilt, James's "maybe some other something more later"):
  live audio input (mic), possibly tempo-locked pattern advances.

## Visual DJ (built 2026-07-24, same session, James's "go nuts")

- Each track has a Claude-authored composition in `assets/compositions.js`:
  timed events (labelled!) placed on MEASURED musical moments — re-run
  `node tmp/lumina/track-analyze.mjs` for the analysis (BPM, downbeat, sections,
  drops, quiets; JSON in `tmp/lumina/analysis/`). When a track is added or
  replaced, analyze first, then compose; never place events by guesswork.
- `composition.js` is the DOM-free engine (ramps lerp numerics + hex colors,
  strings/booleans snap, backward seek replays). `music.js` holds the toggle
  (`store.dj`: "claude" default / "free") and the tick-loop merge: composition
  supplies field base + reactivity settings; live modulation rides on top;
  free play/pause restores the tuner's clean base entirely.
- Tuning the sets is conversational — James names a labelled moment ("the 59s
  inversion"), Claude edits that event. After ANY edit to compositions.js or
  composition.js, run `node tmp/lumina/composition-sim.mjs` (39 assertions:
  ranges, patterns, replay determinism, authored blackout/inversion moments).
- Sets deliberately open with a full field base at t=0 so they play identically
  regardless of slider state — keep that invariant for new sets.
