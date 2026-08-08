# Changelog — Lumina

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-08-08 — Claude (Fable 5) — Audio thread reopened (review only) + two panel fixes

- **James reopened the parked audio/beat thread** with a "turn a critical eye"
  brief. Claude's self-review of the detection stack, proposals awaiting his
  picks: (1) time-varying tempo/confidence incl. honest "no beat here" (NEXT
  UP item 1), (2) a PUNCH REVIEW LANE — detector output becomes proposals he
  auditions and confirms/kills/adds, verdicts persist like BPM_OVERRIDE
  (Claude's top pick — feeds the rhythm template), (3) per-stem envelope
  lanes baked offline into the grid (kick/hats/harmonic as mod sources),
  (4) repetition/self-similarity structure + per-punch confidence,
  (5) 4/4-only downbeat noted as a limit, (6) a server analyze endpoint so
  dropped-in tracks can earn a grid without Claude in the loop. No code.
- Confirmed for him: MP3 auto-discovery already works (drop into
  assets/sound-tracks/, reload the served page; band reactivity only until
  analyzed). He has new Suno tracks coming — two landed in the folder
  untracked this session (His Dark Orchestra, The Flow), not yet analyzed.
- **Relevance-dimming design conversation opened** (his ask: controls that
  can't affect the current look get visually deprioritized). Plan on the
  table: RELEVANCE predicate table keyed by control id, evaluated per
  snapshot, crisp structural gates + threshold occlusion gates (sceneMix/
  sceneTiles), sim-enforced coverage. Four calls awaiting his answers: dim
  only vs sink (rec: dim only), dimmed stays live (rec: yes), card-header
  dimming without auto-collapse, dice keeps rolling inert keys (rec: yes).
  His beat-hookup ask (easier param↔beat wiring) noted, held behind this.
- **Fix: ⓘ popover title painted black** — the popover hangs off
  document.body, outside .lum-tuner, so var(--gold) resolved to nothing.
  The popover now carries its own --gold/--gold-ember copies (tuner.css).
- **Fix: ⓘ/star icons wrapped to a second line in narrow columns** ("pushed
  everything apart"). Control rows are now nowrap: the slider track (or the
  select) is the only elastic element (track min 4em→3em), labels/output/
  star/ⓘ are flex:none with nowrap labels. STANDING RULE from James: nothing
  in a control row ever line-breaks; everything stays put.

## 2026-08-03 — Claude (Fable 5) — Jungle Moog Ritual v3: THE REEL (v2 killed same night)

- James flew the deepening ritual and killed the structure on sight: "somehow
  you got it in your head that I wanted this back and forth thing... four
  bars of this, four bars of that. It's really boring. What I want is a blow
  you away reel. This is the demo reel for the investors... Never come back
  to the same thing twice. Every single cut should be something new, all the
  way through. Cut frequently and often and use very extreme changes."
  STANDING LESSON for all future sets: call-and-response trading is DEAD as
  a default shape — call() survives for lulls a brief explicitly asks for.
- v3 = THE REEL: **71 cuts, every look appears exactly once and never
  returns.** No totems, no vocabulary reuse — the score IS the vocabulary
  (JUNGLE_REEL entries generate one look each). Adjacent cuts are authored
  maximally opposed: supernova (gold fire, full fold, out of the gate at
  bar 1) → blacksnap (two dim rings in a void) → acidwall (full-bleed lime
  hex) → violetfold (triple-refold nebula) → dustfield (400 drifting
  embers) → magmaslabs (giant molten squares)... whiteout at the b21
  monster, theeye (a single watching ring) at b62, detonation at b146,
  zenith → eventide → lightsout to close with 3s to spare.
- Still measured, not chaotic: all 33 punches hit, cuts land on punch bars
  or 4/2-bar marks, quiet pockets get extreme QUIET cuts (voidhush /
  deepdrift / heldbreath / exhale), the b85 build and b246 climb are the
  only ramps besides the outro. Eight shared REACT archetypes keep every
  cut beat-locked (pulse/bar/swing rows; nothing follows lagging bands).
- The fold runs the whole reel: supernova/violetfold/glasscut/goldburst/
  lacequake/lily/kalvortex/cathedral/greenfurnace/zenith all use kal
  rings/refold/spin differently. Avg cut ≈ 3.6 bars ≈ 6.7s.
- Sims 335/335 + 53 green. Tune by bar label ("b118 lacequake").

## 2026-08-03 — Claude (Fable 5) — Jungle Moog Ritual set v2: the deepening ritual (SUPERSEDED same night — see v3 above)

- James's brief, same night as Wave 1: "take a pass at doing a VJ session on
  jungle moog ritual and try to be really surprising. Try to match the beat.
  Try to look for where the breaks are, and don't be too repetitive... use
  some of the new effects early in the set and throughout."
- The old four-look set is REPLACED. New architecture: Zion's reset-chassis
  pattern (JBASE/jl — every look complete, nothing bleeds) with a hybrid
  shape — three recurring TOTEMS (totem = THE MANDALA, a flame genome
  through the new kal fold, on screen by bar 9 and returning all night with
  different genomes/ring depths; undergrowth; machine) anchoring ELEVEN
  ONE-SHOT looks that each appear exactly once (firstlight, moth, vines,
  drums, rain, eyes, strobeswamp, cavefire, glowworms, ignition, breakpool).
- The measured structure drives everything: all 33 punches hit; the b21
  monster (2.73) gets moth (triple-refold neon lace); the b146 late monster
  (2.61) gets ignition (white-hot gold phoenix through full rings, gated);
  both measured quiet pockets (bars 67-71 twice, bar 143.5) get breakpool
  hushes with the b69/b73 drops ripping out of them; the b85 build is a
  4-bar strobeswamp ramp into the b94 drop.
- New effects early + throughout, per his instruction: firstlight OPENS the
  track already folded (soft 5-way, slow spin), and kal rings/refold/spin
  appear in totem, moth, cavefire, ignition and the closing dissolve — plus
  the new matrix targets in anger (bass→fxKalRing breathing in totem,
  bass→fxKalSpin in moth, pulse→fxKalSpin in ignition).
- Grooves run syncBeats 1-4 with pulse/bar/swing rows everywhere — nothing
  rhythmic follows lagging band envelopes. Accents rotate (downbeat, four,
  eighths, offbeat, gallop, backbeat, stutter). Outro: the mandala dissolves
  over a 6-bar ramp at b249, black by b257 with 3s to spare.
- Sims: 335/335 + 53 + 24 green, first run. Tune by bar label ("b118 moth").
- AWAITING JAMES'S FLIGHT — his first authored set that uses the fold.

## 2026-08-03 — Claude (Fable 5) — WAVE 1: the ⓘ library, per-scene controls, the fold

James's brief after studying his Synesthesia captures together ("the interface
is equally important... reduce the descriptive text into a small i icon...
become more verbose and show significant visual examples"). Plan approved as
three waves; the audio/beat-detection thread EXPLICITLY PARKED at his call —
no tick-lock, no structure lane, no detection changes until he reopens it.

- **The ⓘ info system.** All `.tuner-desc` sentences and card summaries are
  off the surface — every control and card now carries a small circled-i that
  opens a fixed popover (click-away + Esc dismiss, house rule) with VERBOSE
  plain-language copy and, on ~44 controls, an animated mini-demo showing the
  knob being swept (mini flash-field engine, FX cartoons, scene stage,
  envelope meters). Content lives in **tuner-info.js** (new file, loaded
  before tuner.js in BOTH index.html and tuner.html):
  `LUMINA_INFO.INFO["scope:key" | "card:id" | "row:id"]` +
  `DEMOS[name] -> factory() -> draw(ctx,w,h,t)`. The factories look entries
  up by control id and fall back to any inline `desc` string, so a missing
  entry degrades to the short sentence, never to nothing. NEW-CONTROL RULE:
  register an INFO entry (and a demo if it earns one) when adding a control.
  The popover lives on document.body — `.lum-tuner`'s backdrop-filter makes
  the panel a containing block that would trap position:fixed. The only
  surviving surface prose is the pattern hint (a live readout, not a desc).
- **Per-scene controls + punch verbs (the Synesthesia two-tier model).**
  scenes.js grew `DEFS`: each scene declares its own `params` (custom knobs,
  shown in the scene card only while that scene plays — flame's genome menu
  moved there, so it no longer haunts the other scenes) and up to THREE
  `punches` (James's cap) — momentary verbs that join the perform strip as
  gold pads while their scene is playing, riding world.js's existing punch
  machinery ("scn-" prefix, never in state; a held pad is released before a
  scene change rebuilds the strip). Launch verbs: ink surge, ridge quake,
  flame flare, nebula burst. composition-sim enforces the whole contract
  (params ∈ DEFAULTS ∩ GROUPS.scene with kind+info, ≤3 verbs, real override
  keys). Adding a scene's controls/verbs now never touches tuner.js.
- **fxKaleido v2 — the fold.** Proven FIRST in `tmp/lumina/fold-lab.html`
  (KEEP IT — procedural engraved-gold + neon-RGB sources standing in for
  James's two kaleidoscope reference families; posts 4×4 contact sheets via
  /api/dev-snapshot; round 1 landed both families). Then ported verbatim into
  fx.js FS_POST: three new field keys — `fxKalRing` (radial ring-repeat: the
  references fold in RADIUS, not just angle — concentric mandala bands),
  `fxKalIter` (0/1/2 iterative refolds → lace), `fxKalSpin` (the fold space
  slowly wheels; the picture underneath doesn't). All default 0 == the
  legacy fold exactly (old presets/sets render untouched). Dice: the subs
  never ride the rack shuffle (they're inert without kaleido) — they roll
  only WITH a rolled kaleido (ring 60% / iter 35% / spin 50%). Matrix targets
  added for ring + spin (iter is discrete — a ramp would flicker).
  `tmp/lumina/kal-probe.html` (keep) proves the fold end-to-end through the
  real mount+attach chain with rAF pumped manually, A/B legacy-vs-v2.
- Dice odds stay per James: scene rolls flat/uniform ("let it go nuts"),
  blur discipline untouched at ~5%.
- Sims: composition-sim grew the DEFS + kal contracts — 335/335; music-sim
  53/53; timeline-sim 24/24; fx-test compiles the new FS_POST (FX-OK);
  tuner.html loads clean (89 ⓘ buttons, all three kal sliders, popover +
  demos + click-away verified live; per-scene section and pads verified by
  synthetic BroadcastChannel snapshots — genome select appears on flame,
  pads swap ink→surge / flame→flare).
- AWAITING JAMES: the ⓘ feel (per-control popovers + demos), the quieter
  surface, scene verbs under his fingers, and the fold in flight — kal
  rings/fold/spin over the flame scene is the Synesthesia-mandala bet.
  NEXT (wave 2, each with his go): fiber-sphere instrument lab, ink v2,
  rainbow palette family + gradient-wash breather, flame evolution stage 1.

## 2026-07-31 — Claude (Fable 5) — THE PERFORMANCE TIMELINE (record your own set)

- James's brief, after Zion v2 still didn't hit his felt beat: he doesn't
  trust the analyzer's grid, and he can't perform four perfect minutes live —
  *"record segments, record myself doing moves, then stop and go back to an
  earlier part, press record again and try something else."* **NO QUANTIZE,
  his explicit call** — raw audio-time capture, his hands decide the beat.
  The timeline strip deliberately shows seconds + energy silhouette, never
  bar claims.
- Architecture: `timeline.js` (new, DOM-free, sim-tested) holds the event
  model ({t,k,v} control moves / {t,base} whole-look landings / pad+freeze
  events), the punch-in MERGE CONTRACT, and the replay cursor.
  world.js grew a field-command TAP (recording source) and `replayBase` /
  `replayPunch` / `replayFreeze` (replay sink — bypasses the tap, the undo
  stack, and preset churn: the ghost never re-records). music.js wires
  capture+replay to the audio clock: per-track store (`lumina-timeline`),
  loop-region cycling (an armed pass banks a take every lap), latch
  (touch a key during a take and the ghost releases that key), fold-on-seek
  (scrub anywhere, the look catches up). Playback is a third player mode:
  **"your set"** ("mine"), next to claude's set and free play.
- The merge contract (per-parameter punch-in): outside the region nothing
  changes; inside, a prior control move dies only if the new take touched
  that key; a whole-look jump in a take wipes its region; pads clear pads.
  Melt rolls record their LANDING state, not the 2s glide (documented
  limitation). Dice rolls record the rolled result, so replays are
  deterministic.
- Panel: new full-width **timeline card** (stock home: visual row 3; stored
  layouts adopt it at the bottom — drag it up or reset). Energy-silhouette
  strip: click = jump, drag = loop region, double-click = clear loop; gold
  ticks = moves (tall = look jumps, blue = pads); red playhead while armed.
  Buttons: ● record / ■ punch out, take counter, undo take, clear loop,
  clear track (confirmed). Arming flips claude's set to free play first.
- New sim `tmp/lumina/timeline-sim.mjs` (24 asserts) runs the shipping
  timeline.js: merge rules, [tIn,tOut) boundary, fold accumulation, sticky
  freeze, cursor no-double-fire, backward-seek rewind. All suites green
  (24 + 300 + 53). Card render + "your set" option verified live in
  tuner.html.
- NOT DONE YET: file-backed timeline persistence (localStorage only — a
  server route like presets' would make recordings durable + tell Claude),
  and transcribing an earned performance into compositions.js as canon.

## 2026-07-31 — Claude (Fable 5) — Zion Rips v2: the one-way journey

- James's second brief, verbatim spirit: lull them with a little A B A B,
  then *"rock it off into a journey to infinity and beyond. Take them
  someplace they've never been and never return."* The v1 four-look
  vocabulary was leaning on compositional structure way too hard for him.
- v2: bars 1–19 are the lull — A/B traded straight on the stutter intro's
  punches (offbeat, inverted, tight — same two rooms, growing suspicion).
  From bar 21 (first 16-bar phrase) it is a ONE-WAY TRIP: **29 looks, each
  built complete on a reset chassis (`ZBASE` + `zl()` helper), each played
  exactly once, never revisited** — shatter, barcode, magma, reef,
  strobehall, pinwheel, acidmelt, drummachine, dotmatrix, temple, ghost,
  lasercage, flock, hexstorm, then the break pair (deepsea b82, horizon b86
  on the measured quiet floor), supernova at the b91 drop-back, tunnel,
  serpent, twinsuns, graveyard, confetti, xray, clockwork, prism, whitehole
  at the b127 final drop, afterimage, ascension, void.
- Still musically anchored: every event on a punch bar or 8/16 phrase mark,
  grooves at syncBeats 1–2 with pulse/bar/swing rows, break at 8/16.
  Tune by bar label ("b110 confetti").
- Sim pushed back once — "pushes sliders to extremes (3 of 12)" — and it was
  right, given the brief: peaks turned up to honest stops (magma merge 0.92,
  hexstorm displace 0.92, supernova drive 0.97/warp 0.96, confetti desync
  0.92, whitehole 190px slabs + shutter 0.75, void blur 90). 300/300 + 53/53
  green. The ZBASE/zl chassis is the pattern for future
  journey-style sets — steal it.

## 2026-07-31 — Claude (Fable 5) — two new tracks measured + composed

- James dropped **Spore Circuit** and **Zion Rips** into sound-tracks/ and
  asked for authored sets — with a specific brief for Zion: *"REALLY pay
  attention to the sections. do things at 8 bars and 16, listen for the
  breaks. and keep Lumina pretty tightly synced to the beat in general."*
- Analyzer run (both tracks added to track-analyze.mjs TRACKS; grid + JSON
  regenerated). **Spore Circuit**: 130.05 BPM at 3.59× lock — the most
  confident grid we have; A[1–20] B[21–64] A'[65–76] B''[77–102]; big drop
  bar 47; 17 punches. **Zion Rips**: 155.2 BPM, 133 bars, clean 16-bar
  phrases from bar 21; A[1–20] stutter intro (silence→drop at b12 and b17),
  B[21–80], A-BREAK[81–92] (quiet floor b84–86, drop out b91), B'[93–133],
  final drop b127; 38 punches.
- **Spore Circuit set** — bio-techno: petri dish (spiral/ink), mycelium
  lattice (hex/rings/"drops" pattern), sporeburst (radial stars + flame
  genomes, firebird/gold-phoenix rotation), culture bloom (merged sunset
  slabs). Hits all 17 punch bars.
- **Zion Rips set** — machine city: the gate (bronze bars, CRT green,
  ridge), the engine room (copper hex pistons, square wave, sync 1), the rip
  (neon slit lasers, fxSlit), the slam (blown-out white for drops), the
  break (ocean ink fog, iris, sync 4 — bars 82–91 own it). Hits ALL 38
  punch bars; every identity change sits on a 16-bar phrase boundary
  (21/37/53/69/93) with 8-bar variations between; every groove look runs
  syncBeats 1–2 with pulse/bar/swing matrix rows — nothing follows lagging
  band envelopes for rhythm. Outro ramp is 1.5 bars because bar 133 starts
  2.7s before the file ends (a 4-bar glide would die half-open — the sim's
  scene-fade + blackness asserts caught exactly this).
- Both tracks baked into music.js TRACKS (measured grid + composed set, not
  just folder-discovery reactivity). composition-sim grew the two tracks
  (durations + count 3→5): 300/300; music-sim 53/53.
- No BPM_OVERRIDE lines added — James hasn't called tempos on these; the
  detector's locks look sane (Spore especially). If his ear disagrees,
  override and re-run analyze + sims.

## 2026-07-31 — Claude (Fable 5) — pass 6.4: cards cross tabs

- James: the visual tab needs access to the audio cards — reactivity
  "controls so much about how this works... visually." Cards are now
  TAB-AGNOSTIC: every gear row grew a ⇄ button that sends the card to the
  other tab's board (own row at the end; drag into place from there). The
  registration pane is only the card's HOME — default placement + adoption
  for stores that predate it. renderLayout resolves ids across both
  registries and dedupes (first placement wins).
- Stock layout updated: reactivity now opens FULL-WIDTH on the visual board,
  third row, under perform; audio keeps player + a matrix/react-presets
  pair. Existing stored layouts keep reactivity where it was (stores win
  over defaults, by design) — ⇄ or reset to get the new arrangement.
- Verified live: ⇄ moved mod matrix into the visual pane's DOM and back,
  gear regrouped both times, hidden flags untouched, fresh load lands on the
  new stock layout.

## 2026-07-31 — Claude (Fable 5) — pass 6.3: ember control labels

- All control titles (slider/select/chip labels + checkbox labels like
  "fill") moved from 70% white to `--gold-ember` (#cc945c) — the card gold
  pulled a step darker and toward red, James's spec: kin to the gold titles,
  clearly distinct from them AND from the white explanatory text. One CSS
  var; tune there.

## 2026-07-31 — Claude (Fable 5) — pass 6.2: type dialed in by eye

- 26px overshot ("too far in the other direction"): base is now **21px** —
  James's exact spec, the 26px-era 80% becomes the new 100%. Scale key
  bumped again (`lumina-ui-scale3`, the per-base-change rule). Everything
  else he called "really going great."

## 2026-07-31 — Claude (Fable 5) — pass 6.1: frozen head, no docks, human-size type

James's reaction to pass 6 ("amazing... so slick") plus three fixes:

- **The head actually freezes now.** His "freeze rows" ask exposed a real
  bug: in the detached window the DOCUMENT scrolls, but `.lum-tuner` kept its
  `overflow-y: auto`, making it the sticky container — so the "sticky" head
  rode away with the page. `body.lum-tuner-page .lum-tuner { overflow-y:
  visible }` fixes it; verified by scrolling 800px and reading the head's
  rect (top stays 0). Tabs + top-right controls + command bar are now frozen
  at the top no matter what.
- **Dock picker UI removed** ("kill the dock icons... I'm only gonna ever
  use this as a remote"). Host dock machinery stays for the
  no-BroadcastChannel fallback; no buttons.
- **Base type 16px → 26px** ("the baseline font size needs to be larger" —
  at the old base, 100% put descriptions at ~10.9px). Now 100% ≈ readable
  (descs ~18.7px), ~60% reproduces the old cramped look, scale floor 80 → 50.
  Scale storage moved to `lumina-ui-scale2` so percentages saved against the
  old base can't land huge; every window restarts at the new 100%.

## 2026-07-31 — Claude (Fable 5) — panel pass 6: the board is yours

Same night as pass 5. James flew the five and came back with the structural
brief: transport must live IN the panel, the board must be rearrangeable
("one to five cards and a variable height"), hiding must mean GONE (the gear),
fit screen should just be the default, and the top-right chrome was fighting
the picture. Plan shown first, his additions folded in, then built:

- **The command bar.** A second sticky row under the tabs, on both tabs, both
  homes: play/pause + stop (SVG icons — text transport glyphs go color-emoji
  on Windows), then ❄ freeze / 🎲 dice / melt die / ↩ back, then VOLUME. All
  reuse the existing host commands and light up from snapshots.
- **The layout engine.** Cards register in a per-pane registry; the panes
  render from `lumina-layout` (per window, v1 schema): rows of 1–5 cards,
  equal width shares, each row auto height or pinned in em (scales with the
  text-size control). `edit layout` toggles grip bars (⠿ drag a card; drop
  beside a card to join its row — a red line refuses a full row of 5 — or
  into a gap for a new full-width row) and ↕ row-bottom grips (drag = pin
  height, cards scroll inside; double-click = auto). Stock layout: looks and
  perform full-width (they were half-empty before), pattern full-width so the
  animated chips spread out. EXTENSIBILITY CONTRACT: a card the store has
  never seen lands as its own row at the end; stored ids that no longer exist
  drop silently — future cards need zero migration.
- **The gear (⚙).** Checklist of every card (+ my deck): unchecked = removed
  from the board entirely, not collapsed; recheck and it returns where it
  last lived. `reset layout` restores stock rows/heights/visibility.
  Click-away closes it (house rule).
- **Fit screen is THE default.** The frame always opens at the window size
  and follows window resizes until a size is chosen by hand that session
  ("set"/"full width" pin it; "fit screen" hands it back to auto). Frame
  sizes no longer persist at all — the old stored-size-wins load behavior and
  the 1024×768 upgrade rule are gone.
- **Top-right chrome (this world only).** The shared speaker is hidden —
  volume now lives in the player bar (new slider) and the command bar, all
  driving the same shared gain so they stay in sync. The dashboard icon reads
  at 50% alpha, 100% on hover.
- **Player bar collapse.** ▾ in the brand row folds the whole transport away
  to logo + LUMINA + ▴; persisted (`lumina-player-mini`). The bar stays
  visible (protected behavior) — just small.
- Verified in the served tuner.html: no console errors; stock rows exactly as
  authored; edit toggle shows 16 card grips + 10 row grips; gear hide/show/
  reset round-trips; a synthetic pointer drag moved "scene" out of its shared
  row into its own new row with the drop marker showing. Sims 252 + 43 green.
  NOT yet driven by a human against a live host — James is the click test.

## 2026-07-31 — Claude (Fable 5) — panel pass 5: the five ("fuck it, do them all")

James's go on all five usability proposals in one pass, same session as pass 4.
Section titles also bumped 0.95em → 1.08em (+2px) on his ask.

- **Per-card 🎲 + 🔒.** Every visual card's header has its own dice (rolls
  ONLY that card's keys) and a lock (every dice roll — plain, melt, card —
  leaves a locked card's keys at their current values). Key-groups live in
  presets.js `LuminaRandom.GROUPS`; the HOST enforces locks (world.js
  `randomize {group}` / `lockToggle` commands, `lumina-locks` storage, in the
  snapshot as `snap.locks`). composition-sim asserts every rolled key belongs
  to exactly ONE group — an ungrouped key would be unrollable-by-card and
  unlockable (252 asserts green).
- **Visual pickers.** layout/shape/wave/palette (structure), scene, and the
  whole pattern list are thumbnail CHIP STRIPS now, not dropdowns. Layout
  chips plot the field's real `layoutTiles()`; wave chips draw the actual
  curve; palette chips are the actual ramps; pattern chips ANIMATE the real
  per-tile phase math at ~20fps (one shared loop, skipped while hidden).
  Unknown future values get a generic fallback chip — extending the field
  never breaks the picker.
- **Ghost dots.** music.js streams the matrix-modulated values (~15 Hz,
  `host.mod` → bus `onMod`, over the BroadcastChannel too) and every field
  slider grew a gold ghost dot that dances where the music is actually
  holding that knob. Fades out ~450ms after the modulation stops.
- **The perform strip.** New full-width card under "looks": six momentary
  punch pads (blackout / strobe / freeze / kaleido / iris / warp — hold keys
  1–6) that fire while held and restore clean on release (host-side
  overrides, never in `state`; the music tick merges them last so pads work
  mid-set), plus an XY pad driving any two knobs at once (axes persisted,
  `lumina-xy`).
- **My deck + collapsible cards.** Star (☆) any slider/select/chip-strip to
  pin a live copy into "my deck" — a gold-bordered card above the tabs,
  visible from both. Every card collapses to its header (▾). Favs/collapse
  persist per window (`lumina-favs` / `lumina-collapsed`), like text size.
- Verified: tuner.html loads clean (no console errors; 17 cards, 11 locks,
  57 chips, 6 pads, 50 ghost dots, no horizontal scroll); node --check on all
  five edited JS files; sims 252 + 43 green. NOT yet click-tested against a
  live host — the pane can't load index.html (music autoplay rule). AWAITING
  JAMES: roll/lock feel, pad choices + punch depths, XY defaults
  (warp × scene drive), chip art, deck workflow.

## 2026-07-31 — Claude (Fable 5) — panel pass 4: cards, gold, columns, copy

James's four-part brief, same session as the dice odds work:

- **Text size is a − / + stepper now** (tab bar, steps of 10, double-click the
  % resets) — his call: "plus minus like it is everywhere else." The slider
  and its `.tuner-textrange` rule are gone.
- **Sections are CARDS flowing into CSS columns** (`.tuner-cards`,
  `columns: 24em`). His complaint was real and measured: every section was
  its own tiny grid, so a maximized window put everything in a left stack.
  Verified at 1920×1080: four columns of 454px cards, edge to edge, no
  horizontal scroll; audio tab three cards + full-width player. "looks"
  (presets + dice + speed/size/blur) and "player" are full-width top cards
  outside the columns. Each section's multiple `minis()` grids merged into
  one per card so controls flow evenly.
- **Gold section headers** (`--gold: #e3b968`) + every card opens with a
  `.tuner-summary` — ONE plain sentence: what this group of controls does.
  New groupings got names in the process: the formerly unlabeled
  holds/desync/ease/border block is "pulse"; colors + frame + reset are
  "canvas".
- **Copy pass over every `.tuner-desc`**: shorter, plainer, says what you'll
  see, jargon out ("chromatic aberration" → "red, green and blue slip apart,
  broken-projector style"). The long presets paragraph cut to one line; the
  technical WebGL rack footnote deleted.
- Also: sticky tab bar got a solid background (cards scrolled visibly under
  it), descs nudged brighter/larger (0.45→0.52 alpha, 0.68→0.72em), matrix
  rows can wrap inside their card.
- STATUS: layout verified numerically (pane wouldn't composite for
  screenshots); AWAITING JAMES'S EYES on the whole pass — gold hue, card
  grouping, summary copy all tunable. The VJ-instrument design conversation
  (NEXT UP 4) is still open; this pass is its typographic/layout groundwork.

## 2026-07-31 — Claude (Fable 5) — iris pulled from the dice rack

- James: the iris comes up too often on dice rolls — *"a cool effect... gets
  old pretty quickly"*; it's best used deliberately (breakdowns/drops), which
  *"isn't really gonna happen with dice flipping."* Riding the general FX rack
  it landed on ~30% of rolls (2–4 of 10 effects per roll). Now it rolls like
  the smear trio: excluded from the rack, its own `odds(0.08)` gate — about a
  quarter of the old rate. Depth range unchanged (0.15–0.9, anti-blackout cap
  at 0.5 with no scene). composition-sim grew an iris rate guard next to the
  blur one.

## 2026-07-31 — Claude (Fable 5) — melt roll halved to 2s

- James flew the 5% blur odds ("definitely much better"), then asked for the
  melt roll to run half as long: `rollTween(4000)` → `rollTween(2000)` in
  world.js. The shape is untouched — same sin veil, same peak-blur structural
  swap at p=0.5 — everything just happens in 2s instead of 4s. No sim guards
  the duration; sims still green (composition 125, music 43).

## 2026-07-31 — Claude (Fable 5) — dice blur odds cut to a quarter

- James: blur rolls still land way too often on both dice — *"it needs to be
  only, like, twenty five percent as much as it's happening now."* One knob
  covers both buttons (🎲 and the melt roll both target `LuminaRandom.roll`):
  `blur: odds(0.2)` → `odds(0.05)` in presets.js. Range (≤22) untouched, so
  when blur DOES land it looks the same — it just lands on ~1 roll in 20
  instead of 1 in 5.
- The melt roll's transition veil is unchanged — that blur is the dissolve
  effect itself, not the landed look.
- composition-sim grew a rate guard next to the smear guard: >0 and <8% of
  3000 seeded rolls (binomial headroom over a true 5%). Sims green
  (composition 125, music 43).

## 2026-07-28 — Claude (Fable 5) — track dropdown + folder discovery

- James's ask: the track name in the player should be a dropdown ("switch to
  any track that's loaded"), and the folder should just pick up any MP3s he
  drops in. Both in:
  - The transport-bar track readout is now a `<select>` (sends the existing
    `player/select` command). Rebuilds are sig-guarded and skip while focused —
    the ~4 Hz playing snapshots would otherwise snap an open dropdown shut.
  - New server route `GET /api/worlds/:slug/tracks` lists
    `assets/sound-tracks/` audio (mp3/m4a/ogg/wav; mirrors the art route).
    When served, music.js fetches it at load and appends anything not in the
    baked TRACKS list (label = filename); file:// keeps the baked list.
    Verified on a throwaway :4175 instance — **the running dev server needs
    one restart (launcher double-click) before discovery goes live**.
  - Discovered tracks play with full band reactivity; the beat clock and
    claude's-set need the offline analyze/compose pass, so keepers still get
    told to Claude and baked in (comment in music.js says so).
- Sims green (music 43, composition 124). Dropdown not yet click-tested —
  music world, stays out of the agent pane; James's next session is the test.
- The panel-redesign conversation (START HERE above) remains queued — this
  was a self-contained player ask.

**The world was called Relaaax until 2026-07-26.** Entries below that date use the old
name — that is deliberate, not drift. See the rename entry immediately following.

## 2026-07-27 panel pass 2: reach + contrast — Claude (Fable 5)

James's five notes at session open, all built. This is still tactical polish — the big
regroup ("VJ instrument", NEXT UP item 4) remains a design conversation for its own
session.

- **Configuration button in the transport bar.** The panel no longer opens from the
  tiny circle-of-sliders icon bottom right — that button is gone. A labelled
  `configuration` button now rides at the end of the transport bar (bottom left, after
  the free-play/claude's-set switch). music.js seats the same `#lum-tuner-toggle`
  element into the bar, so world.js's open/close/detach logic is untouched; if the bar
  ever failed to mount, the button falls back to fixed bottom-left. Label is
  "configuration" for now — James floated "visual audio config" as an alternative.
- **DETACHED IS THE DEFAULT (James, same session, mind changed after seeing pass 2).**
  The configuration button now opens the controls in the detached window
  (`tuner.html`), not the in-page panel; clicking it again closes whichever form is
  up. The way back in-page is the dock picker, which now renders in BOTH modes: in
  the window it means "close this window and dock the controls into the page on this
  edge" (`{scope:"page", type:"attach", value:side}` → host closes the remote, shows
  the embedded panel docked there). Embedded it still just switches edges. No
  BroadcastChannel → the button falls back to the in-page panel. Verified by probe:
  embedded mount sends `dock`, detached mount sends `attach`, window has no detach
  button.
- **Four-way dock.** New `dock ◧ ⬒ ⬓ ◨` picker in the panel's tab bar (embedded only —
  the detached window keeps just detach). The open panel docks left, top, bottom, or
  right (right is the default = the old behavior); choice persists (`lumina-dock`).
  Plumbing: `{scope:"page", type:"dock"}` command → world.js sets
  `body.lum-dock-<side>`, world.css reserves the edge via `--lum-dock-w/-h`, and
  `applyFrame()` now reads those vars in its width formula so the frame genuinely
  shrinks out of the panel's way (the old right-dock CSS width rule was dead — inline
  style always won). The transport bar shifts clear when the panel docks left or
  bottom (it must stay visible, always). All four sides verified numerically at
  1920×1080: paddings land on the right edges, frame drops to 853px under top/bottom.
- **Charcoal, not black.** Panel surface `rgba(8,8,8,.78)` → `rgba(42,42,48,.92)`,
  detached page and select dropdowns to match, transport bar too; every pure `#fff`
  text color softened to `#f2f2f6`. James: the white-on-black contrast "gives eye
  fatigue really quickly".
- **Slider thumbs doubled** — 1em → 2em (≈13px → ≈27px; input height 2.1em to contain
  them). Discovered in the process: range inputs do NOT inherit the panel font, so
  their em resolves against the browser's ~13.33px input default and never scaled with
  the text-size control — which is also why pass 1 measured the 20em cap at 267px.
  Documented in tuner.css; left that way on purpose so the measured caps hold.
- **Section headers readable** — `.tuner-section` 0.66em/40% white → 0.95em/500
  weight/78% white, tracking eased 0.28em → 0.18em. James: "I can barely read them."

- **The little player (third brief of the day).** The transport bar became a two-row
  card: a brand row — new inline-SVG Lumina logo (four-point light glint, warm-amber →
  violet gradient, `#lum-logo-g`) + the LUMINA wordmark — above the transport row.
  Controls re-ordered to deck standard with SEPARATE play and pause: ◀◀ ▶ ❚❚ ■ ▶▶,
  then track name, mode select, configuration, and last the ❄ animation freeze. All
  five transport glyphs are inline SVG, not text — ⏪-class glyphs render as color
  emoji on Windows. New `play`/`pause` player commands in music.js (`toggle` remains
  for the tuner and the speaker); play lights up while playing, pause while paused
  mid-track. Wrapper class is `.lum-player` — world.js click-away exempts it, and the
  dock-clear rules moved onto it.
- **Animation freeze (❄).** `{scope:"field", type:"freeze"}` toggles
  `field.setFrozen()`: the field's frame dt collapses to 0, so the field clock — and
  through the frameHook dt, the scene/FX clocks — hold still while rendering
  continues (tuning stays live on a frozen picture; music, if playing, plays on).
  Deliberately transient: not a config key, never saved, never in presets, resetAll
  leaves it alone. `frozen` rides in the snapshot; the ❄ lights while frozen. James
  asked for "an icon, I don't know what to put" — went with a six-spoke snowflake,
  easy to swap.
- **Dice on the player.** A five-pip SVG die, last in the row past the ❄ (James:
  "blast to a new look anytime" without opening the config). Sends the same
  `{scope:"field", type:"randomize"}` as the panel's 🎲, so the panel's ↩ back undoes
  bar rolls too.
- **Expand toggle on the player.** Corner-arrows button next to the dice:
  `{scope:"frame", type:"expandToggle"}` snaps the frame to the full window and
  remembers the prior size; click again (arrows flipped inward, button lit) to snap
  back. Transient like the freeze — never persisted as the expanded size would be, so
  a reload comes back at the pre-expand size, and any manual frame set/snap clears
  the toggle (you took control). `snap.frame.expanded` drives the icon swap.
- **Hotkeys.** Space = play/pause, Z = roll the dice (main page). Skipped while a
  form control has focus; bar buttons and the configuration button blur after click
  so Space doesn't re-fire the last-pressed button.
- **House default scaled up (James's brief: "six more on either side… sixteen
  across, nine or ten bars stacked", full screen).** The page now opens at 16 cols ×
  10 rows in a full-window frame: `START` in world.js overlays rows/cols on the
  renderer's DEFAULTS, and reset/resetAll target START. The renderer's DEFAULTS are
  untouched (pork-2002-verbatim 3×4, sim contract holds — 123/42 green) and presets
  stay partials over DEFAULTS, so "pork 2002" in the menu is still the exact
  original. Frame: full-window is the default; a stored manual size persists and
  wins, except a stored legacy 1024×768, which upgrades to full-window. The .lum-frame
  CSS no longer hard-codes 1024/4:3 (applyFrame owns size inline; a CSS height would
  override the inline aspect-ratio — don't add one).

## 2026-07-28 — the melt roll (Claude, James's ask; v2 same day on his report)

- **Blurry-die button next to the dice** (same five-pip SVG under an feGaussianBlur):
  `{scope:"field", type:"randomizeTween"}` → `rollTween(4000)` in world.js — the same
  LuminaRandom roll, but eased to over 4s. One pushHistory entry, so ↩ undoes the
  whole glide; state + notifyBase update per frame so music modulation rides the
  moving base; any other config write (slider, preset, dice, reset, undo) cancels
  mid-flight and leaves the look where it stands. saveConfig only at completion.
- **v2 — one continuous dissolve.** v1 snapped the unmorphable keys (grid, layout,
  scene, pattern) at t=0, which James correctly read as "immediately jumps, then
  tweens to get ANOTHER thing." Now the CURRENT look stays up and melts: a
  sin-shaped blur veil (TWEEN_VEIL 14 design px, on top of the lerped blur) rises
  over the first half, the structural swap happens at PEAK veil (p=0.5) where
  nothing is legible, and the second half sharpens into the new look while
  numerics/colors finish. The veil is display-only — it never lands in `state`, so
  cancel/complete both leave the honest blur value (cancelTween strips it).

## 2026-07-28 — the ACTUAL blur bug, third pass (Claude, James's 3rd report)

- **It was the stock reactivity matrix all along: `bass → blur, amt 0.45`.** With
  span 80 that writes up to ~36 design-px of blur every frame there's bass; on the
  GL path (any FX/scene on — every roll) that blur is a CSS filter on the WHOLE
  canvas, scaled by design→screen (~7× full-window) = total whiteout the moment
  music plays. James's "crisp for two tenths of a second" = the envelope attack
  before the first bass write; "no way out" = rewritten per frame. MAX_DIM (pass 2)
  and roll ranges (pass 1) were real but minor. Fixes: stock row is now
  bass→sizePulse 0.4; mergeSettings migrates a stored bass/blur/0.45 row (exact
  match only — hand-tuned blur rows survive) so James's persisted settings heal on
  load; the GL canvas blur is capped at 64 CSS px so no writer can ever whiteout
  again; music-sim asserts the stock matrix drives no whole-frame smear target
  (43/43). His "default launch" preset still pre-dates fill — reset → set as
  default re-captures (told him, pass 2 note stands).

## 2026-07-28 — the REAL blur bug + edge-to-edge start (Claude, James's 2nd report)

- **"Blur every single time I hit the dice" — root cause was resolution, not roll
  values.** fx.js MAX_DIM capped every FX frame at 1600px; inside the old 1024px
  staging frame that never downscaled below CSS size, but the full-window frame
  (2026-07-27) stretched a ≤1600px canvas across James's ~2560px viewport — a 1.6×
  upscale, so the ENTIRE GL path (any roll: 2–4 FX on) rendered soft. The crisp
  split-second he saw was the DOM path's last frame before the canvas covered it;
  his no-FX presets stayed on the DOM path, which is why they looked fine. MAX_DIM
  is now 2560 (≥1:1 with his CSS pixels; ~2.6× the old fill cost — watch for frame
  drops on heavy scenes at full screen). The 07-28 smear-discipline changes stay:
  they were real, just not the cause.
- **START is edge-to-edge.** His call: "tile until it fills the space… the outer
  border fills the entire space", not a fixed grid. START now sets `fill: true` and
  derives rows from the window aspect (`autoGrid()`: cols 16, rows =
  round(16·h/w) clamped 1..24 — 9 at 16:9) so tiles stay near-square and nothing
  letterboxes. NOTE: a "default launch" preset saved before this keeps its stored
  fill/grid — reset (new edge-to-edge baseline) → tune → set as default re-captures.

## 2026-07-28 — dice smear fix (Claude, James's bug report)

- **"Blur after blur" diagnosed and fixed.** Two compounding causes in
  `LuminaRandom.roll`: (1) `blur` rolled up to 70 design-px and the ≤12 clamp only
  ran with scene "none" — scene rolls kept the full blob; (2) the feedback trio
  (fxTrails/fxZoom/fxZoomRot) sat in the general FX rack, so ~58% of rolls carried
  at least one whole-frame smear at up to 0.9 — crisp for a split second, then the
  picture dissolved. Now: blur is an accent (20% of rolls, ≤22), and the feedback
  trio rolls separately — at most ONE of the three, 25% of rolls, 0.1–0.45 deep.
  composition-sim asserts the discipline over 3000 rolls (blur ≤ 24, ≤1 feedback
  effect ≤ 0.5, smear rolls under 35%); 124/124 + 42/42 green.

## 2026-07-28 — "default launch" (Claude, James's brief + plan approval)

- **"default launch"** is a reserved user preset (case-insensitive name match): if it
  exists, the page OPENS on it — James's explicit carve-out from the 2026-07-25
  never-apply-on-load rule ("set as default" is a deliberate designation; the
  automatic last-session state still never applies on load). No preset → house START
  (16×10 full-window). It's otherwise an ordinary preset: pick it from the menu to
  snap back, delete it to return to factory launch; panel reset still targets the
  factory baseline. Frame size and music settings are not part of it (both have
  their own persistence).
- **`set as default` button** in the preset row after delete: confirms
  ("Overwrite…?") only when a default launch already exists, then sends
  `{scope:"field", type:"presetSetDefault"}` — world.js writes the current clean
  state (+ marginLink) into the preset, preserving James's original key casing.
  User-preset loading moved above state init in world.js so the opening state can
  read it. Probe-verified: button present, no-existing-preset click sends the
  command dialog-free. Sims 123/42 green.

Sims green (composition 123, music 42). Not yet seen by James's eye — the embedded
panel, the bar button, real dock switching, and the player card were verified by
computed-style/DOM probes on tuner.html (sound world stays out of the agent pane),
not by a human look.

## 2026-07-27 panel pass 1 — Claude (Opus 5)

James's brief, first three items built. The rest of it is a plan, not code (below).

- **Roboto.** The panel had no `font-family` at all — it had been rendering in
  browser-default Times New Roman since it was built, embedded and detached, which
  nobody had noticed. Now Roboto, bundled locally as
  `assets/fonts/roboto-latin-var.woff2` (43 KB, latin subset, variable weight, Apache
  2.0, from Google Fonts) so it survives offline and `file://` — the same approach The
  Fifteen Sisters uses for Aref Ruqaa. Roboto is not installed on Windows, so a plain
  font stack would have silently fallen through to Arial.
- **Slider tracks are capped.** Measured A/B at a 1585px panel: the widest slider went
  **1470px → 267px**, the full-width rows **1453px → 267px**, and the median small
  slider **636px → 100px**. Two changes did it — `.tuner-minis` is now a grid
  (`repeat(auto-fill, minmax(15em, 1fr))`, five uniform columns at that width) instead
  of `flex: 1`, which let two controls split the whole panel between them; and range
  inputs are capped at 20em, 7.5em inside a column. Panel got ~8% taller as a result;
  the column minimum is one value in `tuner.css` if he wants it tuned.
- **Text size control**, per the standing rule (Valence Lab 2026-07-26, restated here).
  The whole stylesheet was converted rem→em off a single `--ui-base: 16px` ×
  `--ui-scale`, so one multiplier moves type, padding, control heights and slider
  tracks together. Only viewport-anchored chrome (bottom offset, scroll cap, width
  backstop) stays in rem. The control sits in the sticky tab bar and persists **per
  window** (`lumina-ui-scale`) — deliberately NOT synced over the channel, because the
  detached controller usually lives on a different screen than the visuals. Default is
  100% = the panel exactly as it was; the knob goes 80–220%.
- **The roll cluster: ↩ back — 🎲 dice — keep.** Back undoes the last whole-look jump
  (a roll or a preset load, 30 deep, `canUndo` in the snapshot drives the disabled
  state). Slider drags are deliberately NOT recorded — during live play the stack would
  fill with micro-steps and "back" would stop meaning "undo that roll". `keep` banks
  what's on screen under a pre-filled name ("keep 1", "keep 2"…), so freezing a good
  roll is one keystroke instead of inventing a name mid-set.

Verified: sims 123 + 42 green, JS syntax clean, Roboto confirmed loading and applied in
the browser, the before/after slider widths above are measured in a live panel, all
three new controls present and `back` correctly disabled with an empty history. **Not
click-tested:** the back/keep command round trip is verified by construction only — the
detached controller has no host to talk to, and the host page plays music, which doesn't
go in the agent browser pane. Worth James clicking once. A column-width sweep
(13/15/17/19/21em) was attempted and abandoned when the pane hung; 15em is a guess that
measures well at 1585px, not an optimum.

**NEXT, and this is the real work (James, 2026-07-27, needs its own session):** the panel
is "kind of a big jumble of lots of different stuff". He wants it regrouped with short
clear explanations, and rebuilt to invite live play *while music is running* — you should
be able to see what you're about to do and use it like a VJ. The dice becomes "a whole
control function" rather than one button. Treat pass 1 as typography and reach; the
grouping pass is a design conversation before it is code.

## 2026-07-26 rename — Claude (Opus 5)

**Relaaax → Lumina.** James's call, and overdue by his own reckoning: *"it's now not
really appropriate or descriptive of what's going on here… we've got a pretty amazing
full service visualizer that's only just beginning."* Relaaax named a black-and-white
GIF loop from 2002; this is a music-reactive light instrument. **Lumina** is Thomas
Wilfred's term for light treated as an art form in its own right — he built the
Clavilux to play it in 1919.

Naming went through app-style one-worders (Rubato, Onda, Fugu), organ vocabulary
(Tonewheel, Pipedream, Drawbar) and James's own device-catalog lane (The Brilliantine
Forge, The Visual Tone Organ) before he landed on Lumina.

What moved:

- **Folder** `src/worlds/relaaax/` → `src/worlds/lumina/`; `relaaax-field.js` →
  `lumina-field.js`; scratch/sims `tmp/relaaax/` → `tmp/lumina/`.
- **Globals**: `RelaaaxField`/`RelaaaxFX`/`RelaaaxScenes`/`RelaaaxHost`/
  `RelaaaxMusicDSP`/`RelaaaxCompositionEngine`/`relaaaxTuner`/`relaaaxField` and the
  `RELAAAX_*` data globals (`TRACK_GRID`, `COMPOSITIONS`, `LOOKS`, `FLAME_GENOMES`,
  `PRESETS`) → `Lumina*` / `LUMINA_*`.
- **CSS prefix** `rlx-` → `lum-` (141 occurrences); DOM ids `relaaax-frame` →
  `lumina-frame`, `rlx-tuner` → `lum-tuner`.
- **localStorage keys and BroadcastChannel** `relaaax-*` → `lumina-*`.
- `world.json` slug + title, and a summary that finally describes the current world
  rather than the draft field renderer; admin panel link (re-sorted D→L→O).
- Outside the world: `server.mjs` flame-picks path, `docs/building-a-world.md`,
  `assets/spastic-space/recreation-notes.md`, arachno-wars-2500's CLAUDE.md, and the
  project CLAUDE.md todo.

**`migrate-storage.js` is new** — it loads first on both index.html and tuner.html and
copies James's saved tuner state, field presets, reactivity presets, per-track recall
and last tab from the old `relaaax-*` keys the first time each page runs. Non-destructive
(old keys are left alone). Delete the file and its two script tags once he confirms
everything came across.

Verified: `composition-sim` 123/123, `music-sim` 42/42, `fx-test.html` FX-OK (all six
shader programs compile), `clock-test.html` CLOCK-OK (20 assertions across all three
tracks — impulses still land 0 frames late). The detached controller `tuner.html` mounts
its full 115-control surface with no console errors, all renamed globals present, zero
stray `rlx-` in the DOM.

fx-test's live-mount half reports `false` in the agent Browser pane, as always — the pane
doesn't composite, so rAF fires about once every four seconds and fx.js never un-hides
its canvas (it starts `display:none` and only reveals once the GL path actually draws).
Pumping the rAF queue by hand proves the live path is fine: canvas un-hides, GL renders
(mean luma 79, max 255, full frame lit on the flame scene). Worth remembering for any
future WebGL check here — the frozen-pane `false` is not a failure signal.

**Pre-existing, found while verifying, NOT fixed (needs James's call):** no stylesheet in
this world declares a `font-family` — not `world.css`, not `tuner.css` — and `tuner.html`
links only `tuner.css`. So the entire control surface, embedded and detached, renders in
the browser default serif (Times New Roman). Confirmed against `git show HEAD` that this
predates the rename. One line of CSS whenever he wants it.

Unchanged on purpose: the `pork-2002` preset id, `PORK_TILES`/`PORK_ROWS` and the
decoded 2002 timing constants. Those name the source material, not the world.

## 2026-07-26 wrap — Claude (Opus 5)

James's verdict on v6: *"Definitely major improvement… you're making really
good progress."* Remaining gripes, both fair: there are still places where the
beat or the A/B/A/C structure is read wrong. Plus a key piece of information —
**Timber at Sea is atonal and arrhythmic for its first minute with no beat at
all**, which is exactly why its lock is the weakest of the three and why a
single global tempo is the wrong model for it.

- The real find of the night was his, not mine: **hitting the manual 🎲 every
  four bars** — *"quite incredible… one of the better visualizations I've
  actually seen, and we barely started."*
- I over-read that as a spec and built an automatic version (roll every N
  bars / on detected punches, with a partial-roll depth so the look mutates
  instead of jumping). **Reverted at his instruction** — the idea is good, it
  just isn't ready to drop in. Verified clean: no traces left, sims still
  123 + 42.
- **Three directions recorded for next session** (see the world CLAUDE.md
  "NEXT UP" section): time-varying beat detection that admits when there is no
  beat; splitting the audio into registers/instruments so different parameters
  follow different players; and per-parameter re-rolling locked to the grid.
  All approved as direction, none approved to build — each gets its own go.

## 2026-07-26 night — Claude (Opus 5)

James: "Angular Ritual is 115 BPM… you're not doing a good job detecting the
logical sections or switching at the breaks… I'd like more composition in the
variety — one setting for 4 beats then another, then the 1st again but
varied… when there's a breakdown or significant rhythmic shift that's when
you PUNCH it… and get the visualization reacting in time, pulsing and moving
along with the beat." Plus: add a dice.

- **THE CLOCK WAS WRONG, and it was the root cause.** He called Angular at
  115; the analyzer said 76.01 — exactly 2/3, a metrical-level error. Measured
  independently: 115 explains 2.55× as many onsets as chance, 76 barely 1.35×.
  Jungle and Timber were ~1% off, which is seconds of drift by the end.
  Every event in every set had been placed on a grid that wasn't the music's.
- **Tempo detection rewritten** (three failed scoring schemes before one held):
  superflux onsets (log-magnitude flux, max-filter across bins, adaptive
  whitening) → comb filter PROPOSES candidates plus their metrical relatives →
  8th-grid alignment DISPOSES via a binomial likelihood ratio. A plain hit
  ratio favours sparse grids (gave Timber 82.6 = 124×⅔); hits-minus-chance
  favours dense ones (gave 186.2 = 124×3/2); the likelihood test plus a
  log-normal dance-tempo prior settles it. `BPM_OVERRIDE` lets James's ear win
  outright. Result: Angular 115 (99 bars), Jungle 129.1, Timber 123.95, all
  with ~16ms on-grid error.
- **Structure detection** now finds what a VJ actually hits: break-returns
  (percussion drops out, then lands), builds (energy climbing 4+ bars), drops
  (hard energy jumps), and GROOVE CHANGES (the 16-step rhythm fingerprint of
  the bar changes even when the level doesn't) — the last of which the old
  analyzer was completely blind to. 11 punches in Angular, 33 each in Jungle
  and Timber.
- **The beat clock (`assets/track-grid.js` + DSP `clockAt`/`createAccents`).**
  The visuals no longer chase the audio through envelope followers. Track time
  converts straight to beat/bar/phrase position, and four new lag-free mod
  sources join the matrix: **pulse** (accent impulse), **bar**, **phrase**,
  **swing**. Ten accent patterns (downbeat, backbeat, offbeat, eighths,
  gallop, clave, stutter…) decide which sixteenths fire. `syncBeats` locks one
  flash cycle to an exact number of beats so the field breathes WITH the track
  instead of drifting against it. Verified: the impulse lands on the exact
  frame its sixteenth begins, on all three tracks.
- **Sets rebuilt as composition, not a list (v6).** Each track now has a LOOK
  VOCABULARY (3–4 complete identities), VARIATION operators (invert, hue,
  shape, fast, slow, scene, tiles, burst, tight, blast, accent swaps) and a
  SCORE WRITTEN IN BARS. Phrases trade call-and-response (A B A' B'), returns
  are varied rather than repeated, and new looks are reserved for measured
  punches. Angular 50 events (median 2-bar gap), Jungle 69 (4-bar), Timber 32
  (3-bar); they land 8/11, 26/33 and 21/33 of the detected punches. Because
  the score is in bars, re-measuring a track re-times the whole set — the
  class of error that started this session is now structurally impossible.
- **The dice** (James's ask): 🎲 in the visual tab rolls every visual
  parameter at once — layout, shape, pattern, palette, colours, scene, genome
  and a random handful of FX. Lives in presets.js so it is testable; the only
  guard is anti-blackout.
- **Verification**: composition-sim 123, music-sim 42, plus a new
  `tmp/relaaax/clock-test.html`. Bugs caught by tests, not by eye: the dice
  didn't know about two new keys; `nest` was wired as a mod target (it isn't
  one); `syncBeats` was being interpolated by ramps (4.07 beats per cycle);
  accents fired against a phantom grid before the first downbeat.

## 2026-07-26 later — Claude (Opus 5)

James on the v4 sets: "be considerably more active — never more than eight
bars without changing dramatically, a lot more on the beat, a lot more color
schemes, very extreme sliders, almost break it."

- **All three sets recut from scratch (v5).** Angular changes every TWO bars
  (35 events), Jungle every four with an eight-bar floor in the tail (48
  events), Timber every four (23 events). Measured worst-case gap: 2.3 bars
  (Angular), 8.0 (Jungle), 4.4 (Timber).
- **Color churn is now structural:** 40–45 distinct color states per set,
  cycling all eight field ramps plus "genome", with hueShift walking on top.
  No set sits in one scheme for more than a couple of bars.
- **Scene + genome rotation:** 4–5 distinct scene states per set; Jungle alone
  visits 15 of the 20 bred flame genomes, Angular 8.
- **Extremes on purpose:** speed to 6.4, tileSize to 280, blur to 190, and
  full-range desync / displace / counter / merge / kaleido / shutter, plus
  deliberately absurd combinations (three 280px tiles; saw wave at speed 6.2;
  nest 2 under counter 0.85; nebula at sceneSpeed 2 inside a feedback tunnel).
  Matrix rows now include NEGATIVE amounts so sources pull knobs down.
- **Four new sim rules enforce the brief** (108 assertions total, up from 90):
  max 8 bars between events + an active tail, ≥12 distinct color states,
  ≥4 scene states and ≥2 genomes per set, and ≥7 of 12 tracked sliders driven
  to their extreme band. Two real bugs caught: `nest` was wired as a matrix
  target (it isn't one — it rebuilds DOM), and Timber wasn't actually extreme
  enough to pass its own bar.

## 2026-07-26 — Claude (Opus 5)

James culled the flame farm (20 of 7,307) using a new checkbox gallery, and
those picks are now the flame scene's actual content.

- **Picking gallery + save path:** gallery.html rebuilt as a picking tool
  (click to check, sticky Save bar, localStorage so a closed tab loses
  nothing). Saving POSTs to a new `POST /api/flame-picks`, which writes
  `tmp/relaaax/flame-farm/picks.json`; if the server is off it downloads the
  same JSON instead. Also added `OPTIONS /api/*` CORS preflight — pages opened
  straight from disk (Origin "null") could not POST JSON before this.
- **Genomes are live (`assets/flame-genomes.js`):** export-genomes.mjs turns
  picks into GPU-ready IFS rows (affine pairs, weight CDF, variation id,
  color coord) plus each genome's own 6-stop bred palette, a precomputed
  framing (center/scale from 2nd–98th percentiles), and a per-genome GAIN.
- **The flame shader is genome-driven** (was a hardcoded 3-branch IFS): up to
  5 transforms from uniforms, all 8 classic variations, 24 chaos-game
  iterations, 120k points. `sceneGenome` (tuner select) picks which one;
  `scenePalette: "genome"` uses the colors it was bred with. sceneWarp now
  drives a gentle per-transform wobble — at 0 the genome renders exactly as
  it was judged. Four presets: flame shrine (gold phoenix), amber globe,
  violet veil, green triskelion.
- **Two real bugs caught by testing, not by eye:**
  (1) the per-iteration branch choice used an additive sequence, so every
  point followed the same branch order and the whole cloud collapsed to a dot
  — 13 of 20 genomes rendered as specks until it was replaced with a properly
  mixed hash; (2) diffuse genomes arrived washed out because the offline
  renderer accumulates 1.8M iterations while the scene has ~120k one-shot
  samples — fixed with the baked per-genome gain (coverage-derived).
- **New verification tooling:** `tmp/relaaax/genome-test.html` renders every
  genome through the LIVE shader, flags bad fill ratios, and posts a contact
  sheet to `tmp/snapshots/` via a new `POST /api/dev-snapshot` — the agent's
  browser pane can't screenshot unless it's on screen, so test pages now hand
  their output back as files. Sims: composition 90/90 (10 new genome
  assertions), music 14/14, all six shader programs compile.
- Note: the dev server was restarted three times this session to pick up the
  new endpoints; it runs in its own window as usual.

## 2026-07-25 night — Claude (Fable 5)

James's first look at v3 from a hotel laptop, and the feedback was direct:
controls too buried, no real stop, the sets looked like the same program
(fair — v3 kept the v2 skeleton), and "show me that you understand the music."

- **Transport bar (music.js + world.css):** always-visible bottom-left strip —
  prev / play-pause / STOP (rewinds, hands the field back to the sliders) /
  next, track name, and the free-play ↔ claude's-set switch. No tuner digging.
- **Free play is the default now** (was claude's set): entering the world =
  the baseline animation; audio playing = baseline + reactivity; the composed
  sets are an explicit opt-in on the transport bar. resetAll matches.
- **Docked single-screen mode:** opening the in-page panel now docks it
  full-height on the right and shifts the stage left (body.rlx-docked) —
  visualization and controls share one laptop screen. The detached window
  path is unchanged for two-screen sessions. Transport bar is excluded from
  the click-away dismissal.
- **DJ sets v4 — the real re-cut** (compositions.js rewritten from scratch):
  every event is now `B(n)` — the exact start of bar n from the analyzer's
  downbeat + bar length — or a measured drop/quiet; labels carry their bar
  numbers. Scene swaps ONLY on section boundaries and drops, with the scene
  as the lead voice (mix 0.8–1, tiles pulled down to 0.3–0.6 so it reads);
  8/16-bar phrase mutations between. Jungle's b9 flame burst lands dead on
  its measured 15.31s drop; its nebula night ride enters on the bar-145
  section and steps hue every 16 bars; Timber's nebula bioluminescence
  enters exactly on the bar-45 B section and the last wave on the bar-81 C
  section; Angular's white room (59s) and hammer (178s) hard-cut the scene
  to none for contrast.
- **The counting is now sim-enforced:** composition-sim gained a per-set
  assertion that every event sits within 90ms of a bar boundary or on a
  measured drop/quiet edge — 79/79 pass (music-sim 14/14).
- Next: James drives it — baseline first, then sliders, then audio, then the
  sets. Set tuning stays conversational by bar-numbered label ("b41
  lightning"). Flame-farm gallery still filling overnight for the cull.

## 2026-07-25 late — Claude (Fable 5)

James's "push the envelope" session: he shared 37 reference frames
(tmp/relaaax/viz-examples — Electric Sheep flames, Mandelbrot zooms, neon
kaleidoscopes, ink turbulence, nebula tunnels) and asked for real musical
structure intelligence. Plan discussed, two ideas explicitly shelved (true
fluid sim, 3D rave venue), everything else greenlit ("do all that other
stuff").

- **Scene layer (new `scenes.js` + fx.js pass 0):** full-frame GPU backdrops
  rendered UNDER the tile layer inside the existing rack — `ink` (double
  domain-warped fbm filaments), `ridge` (ridged-multifractal neon energy
  walls), `flame` (real fractal-flame chaos game: 90k seeded points iterated
  16 rounds through an animated 3-branch IFS in the vertex shader, additive
  splat + Reinhard tone map), `nebula` (polar star-tunnel with depth-scrolled
  fbm and streaking stars). Composited in the feedback pass, so trails /
  tunnel / kaleido / the whole post chain fold scenes and tiles together.
- **New config keys** (all tuner sliders + mod-matrix targets + composition
  params): `scene`, `scenePalette`, `sceneMix` (also crossfades the breathing
  boxes out — display-list items are tagged `backdrop`), `sceneTiles`,
  `sceneSpeed` (own clock, never snaps), `sceneScale`, `sceneDrive`,
  `sceneWarp`, `sceneHue`. Scene palettes ride the field's LUT pipeline
  (named ramps / duo pickers / hue rotation) as 6 GLSL stops. Defaults keep
  `scene: "none"` — pork 2002 untouched (sim-asserted). Four new factory
  presets: inkwell, flame shrine, star tunnel, neon membrane.
- **Phrase/section intelligence (track-analyze.mjs):** bar-level fingerprints
  → Foote checkerboard novelty (adaptive kernel) → boundary peaks quantized to
  the 4-bar grid → phrase-length vote (8/12/16/24/32) → lettered sections with
  energy. Emitted as `totalBars` / `phrase` / `sectionsV2` in the analysis
  JSON. Validation: Angular's first boundary lands on its measured bar-9 drop;
  Timber reads A-A-B-A-C; Jungle's night-ride boundary (bar 145 → 270.6s)
  matches the v2 set's hand-placed 269s event within a bar.
- **DJ sets v3:** the v2 choreography kept as the skeleton (James hasn't seen
  it yet), scenes woven in on the measured boundaries — Angular runs
  ridge-temple → flame drop → hard white cut (scene off) → furnace ridge →
  flame afterglow; Jungle runs acid ink → ocean-ink liquid breakdown → acid
  flame frenzy → bare hex plateau → neon nebula night ride with slow hue
  drift; Timber runs ocean ink → squall churn → ocean nebula bioluminescence →
  rain ink → fade to harbor. Several events snapped to exact analyzer times
  (45.35, 133.58, 270.63…); scene mod-matrix rows (bass→sceneDrive etc.)
  swapped into the high-energy sections.
- **Verification:** fx-test.html rebuilt — it now compiles ALL programs
  synchronously against a real GL context (authoritative even when the
  preview pane isn't compositing) and reports per-program status: all six
  compile+link OK. composition-sim extended to 76 assertions (scene ranges,
  shader uniform contract + brace balance, palette-stop math, per-set
  scene usage + fade-out, pork-2002 default regression); music-sim 14/14.
- **Flame farm (tmp/relaaax/flame-farm/):** overnight genome search approved —
  headless renderer + scorer + gallery page; see that folder's README for
  status/results.
- Still standing: James's first real run (now of v3), setting decision, ship
  wiring, live-input phase 2. Shelved by James this session: true GPU fluid
  sim (revisit if curl-noise ink leaves him wanting), 3D rave venue (maybe,
  undecided).

## 2026-07-25 — Claude (Fable 5)

James's three asks: a fuller player, reset on both panels, and the default back
to the basic animation.

- **Player transport (audio tab):** stop button (pause + rewind to top) next to
  play/pause, seek scrubber with elapsed/total time readout, and a volume
  slider wired through the shared sound control (`soundUI.setVolume`) so it and
  the speaker's hover slider always agree. `timeupdate`/`loadedmetadata` now
  stream host snapshots (~4 Hz while playing) to drive the playhead; both
  preset dropdowns got sig-guarded option rebuilds so the streaming snapshots
  can't close an open dropdown.
- **Reset on both panels:** visual already had its reset (field + frame); the
  audio tab now has a matching one — reactivity, matrix, shuffle, per-track,
  and DJ mode back to stock (playback and volume untouched), via a new
  music-scope `resetAll` command.
- **Default is pork 2002 again:** the page always opens on pure DEFAULTS — the
  basic 2002 animation. Tuner changes still save to localStorage on every move,
  but the saved state is no longer applied on load; it lives in the field
  preset menu as "last session" (auto group), so a reload never loses a
  tuning session.
- Sims: composition 58/58, music 14/14 pass. Standing next steps unchanged
  (James's first real run of the expansion + v2 sets, hard-direction pick,
  setting decision, ship wiring).

## 2026-07-24 — Claude (Fable 5)

- **The full expansion** — James: "I want every single thing you just described.
  Do all of them." Twelve structural features, twelve FX-rack effects, a two-tab
  control surface, and a detachable controller window; the three DJ sets
  re-choreographed with the new powers.
- **Structure (relaaax-field.js v2):** tile shapes (11 silhouettes via
  clip-path/mask), layouts (grid / brick / hex / radial rings-and-spokes /
  phyllotaxis spiral — patterns get synthetic (ring, spoke) coords so all 24
  keep meaning), Mondrian merges (hash-chosen 2×2 slabs), per-tile
  rotate/spin/displace/size-pulse (composited transforms, only written when
  active), waveform morphs (triangle/sine/square/saw in oscValue), multi-stop
  palettes + hueShift (256-entry LUT, duo = the original pickers exactly),
  counter layer (phase-inverted difference-blend twins), nested tiles (0–2
  levels, counter-phased). Grid layout keeps the ORIGINAL flex DOM path —
  defaults still render pork 2002 verbatim (regression-asserted in the sim).
- **FX rack (fx.js):** WebGL chain — trails, feedback zoom + rotation,
  pixelate, RGB split, turbulence warp, slit-scan, kaleidoscope (2–12 way),
  bloom, grain, CRT (scanlines/barrel/beat-synced sync tear), shutter, iris.
  All 13 knobs are ordinary field config keys (fx*), so sliders, matrix
  targets, and compositions drive them for free. When any is nonzero the field
  hides its DOM and hands fx.js an analytic display list per frame (works for
  every layout); rack off = DOM path untouched. 1600px fill-rate cap,
  graceful bypass without WebGL. Shaders compile/link verified in-browser.
- **Mod matrix expansion (music-dsp.js):** 20 new targets — the structure
  params + the whole FX rack. beat→fx rgb, bass→fx bloom, beat→displace etc.
- **Control surface rebuild (tuner.js + tuner.css):** the panel is now built
  by a standalone module with two tabs — **visual** (presets, main sliders,
  structure, pattern, grid, margins, corners, FX rack, colors, frame) and
  **audio** (player + DJ, reactivity envelopes + beat, mod matrix, react
  presets + per-track). world.js became the host: owns clean state, routes
  commands, serves snapshots. music.js registers its command handler/snapshot
  part and mounts the tuner.
- **Detachable controller (tuner.html + tuner-remote.js):** "detach ⧉" in the
  panel header pops the same surface into its own window over
  BroadcastChannel("relaaax-ctl") — drag it to the laptop screen, visualization
  stays clean on the big screen. The in-page panel hides while detached; the
  tuner toggle reclaims. Same-origin (served) only.
- **DJ sets v2 (assets/compositions.js):** same measured anchors, new
  choreography — Angular: diamond fire rite, circle-white inversion with
  pixel-crunch hits, spinning-triangle feedback tunnel, brick CRT furnace,
  radial ring shrine, square-wave Mondrian consumption, white shutter hammer
  with RGB tearing, iris out. Jungle: acid palette, phyllotaxis spore burst,
  hex-packed sparkle body, ocean-palette liquid breakdown, star-shaped spiral
  frenzy, kaleidoscope daylight, slit-shaped moog worm, radial night ride.
  Timber: sine bar-slat sea, ocean-palette squall with beat-kicked
  displacement, one-bar sheet lightning, bioluminescent counter-interference
  spiral, slit rain, trails as the storm passes, iris shut in the harbor.
- Verified: composition-sim grew to 58 assertions (new key ranges + select
  whitelists, per-set FX/alt-layout usage, field-v2 unit checks: pork-2002
  default regression, layoutTiles counts + pattern-coord ranges, LUT
  endpoints, waveform bounds); music-sim 14/14; all scripts syntax-checked;
  shaders compiled/linked in-browser. rAF paths can't run in the preview pane
  (frozen timeline) — James's first live run is the visual verification.
- Status: BUILT. James raves, then we tune sets/effects by name and by ear.

## 2026-07-24 (later) — Claude (Fable 5)

- **Visual DJ Claude** — per James ("blow my mind... giant crowd raving"): each
  track now has a Claude-authored, structure-synced light-show composition, with
  a "visual dj" toggle in the music section (claude's set / free play, persisted).
- Groundwork: `tmp/relaaax/track-analyze.mjs` decodes the MP3s in Node
  (audio-decode devDep) and measures BPM, beat grid + first downbeat, band-energy
  profile, section boundaries, drops, and quiet stretches (ASCII energy strips in
  the console). JSON per track in `tmp/relaaax/analysis/`. All event times in the
  sets are these measured moments.
- New files: `composition.js` (DOM-free timeline engine — timed events, numeric
  ramps, hex-color crossfades, string/boolean snaps, seek-safe replay) and
  `assets/compositions.js` (the three authored sets, ~70 labelled events total).
  Each set opens with a complete field base so it plays identically regardless
  of slider state, and swaps the mod matrix per section.
- The sets: **Angular Ritual** (temple gloom → fire rite at the measured 25s
  drop → full white/black inversion at 59s → furnace/tunnel middle → 45s
  "consumption" morph → void → white strobe hammer at 178s → embers out);
  **Jungle Moog Ritual** (canopy greens → scatter frenzy → cyan liquid
  breakdown at 121s → daylight-inversion drop at 210s → circle "organism" →
  60s snake-coil morph → long night ride out over the 8-minute tail);
  **Timber at Sea** (black sea swells → squall at 47s → sheet-lightning
  one-bar inversion at 80s → bioluminescent rings → storm passes → last wave
  at 158s → harbor, true black out).
- Engine integration in `music.js`: with the DJ on, the composition supplies
  BOTH the field base and the reactivity settings; live beat detection still
  rides on top (composed macro, reactive micro). Free play restores James's
  sliders and settings completely. Track switches rebuild the engine.
- Verified: `node tmp/relaaax/composition-sim.mjs` — 39 assertions (event
  legality vs field ranges/patterns/matrix shapes, sampled playback in bounds,
  incremental == fresh replay, backward seek, ramp midpoints, drop snaps, and
  each set's authored blackout + inversion moments). All pass; music-sim still
  14/14.
- Status: BUILT, awaiting James at the rave. Tuning the sets is conversational —
  events carry labels ("the 59s inversion") so he can name moments to change.

## 2026-07-24 — Claude (Fable 5)

- **Music reactivity, phase 1** — the field now dances to James's Suno tracks.
  Three MP3s live in `assets/sound-tracks/` (Angular Ritual, Jungle Moog Ritual,
  Timber at Sea); new tracks are dropped there and added to the `TRACKS` list at
  the top of `music.js`.
- New files: `music-dsp.js` (band energies, per-band auto-gain + envelope
  followers, bass-flux beat detector, mod-matrix math — deliberately DOM-free so
  the sim runs the shipping code) and `music.js` (Web Audio graph, track player,
  reactivity tuner UI, the per-frame modulation loop). The field renderer stays
  music-blind; audio taps the analyser BEFORE the volume gain so reactivity is
  independent of listening level.
- Tuner grew a **music** section: play/prev/next/track/shuffle (auto-advance on
  end), react master (×0–×2), attack/release envelope sliders, beat sense (with a
  dot that flashes on every detected hit) + beat decay, and a six-row **mod
  matrix** — each row wires a source (bass / low mid / mid / high / level / beat)
  to a field knob (speed, size, blur, spread, twist, desync, holds, ease) with a
  bipolar amount. Defaults are the aggressive set James asked for: beat→size,
  bass→blur, beat→twist, mid→spread, high→desync, level→speed.
- Reactivity has its own presets (localStorage `relaaax-music-presets`, factory
  "stock aggressive" protected) plus a **per track** checkbox that remembers and
  recalls settings for whichever song is playing. Player/settings persist under
  `relaaax-music`.
- Plumbing: `world.js` now keeps an authoritative CLEAN `state` (what the sliders
  say) and exposes it as `globalThis.relaaaxTuner` — music modulation writes over
  the live field every frame but never contaminates saves, presets, or readouts.
  `relaaax-field.js` `setConfig` refreshes selectively by key (colors/geometry/
  fit only when touched) so per-frame modulation does zero layout work; tuner
  behavior unchanged.
- Sound control wired per all-world rules (`core/sound-control.js`, custom
  start/stop/setVolume onto the gain node; one autoplay attempt).
- Verified by sim: `node tmp/relaaax/music-sim.mjs` — 14 assertions on the beat
  detector (pulse train hit rate, no beats on constant signal or silence,
  auto-gain finds beats in a quiet mix), envelope bounds, mod clamping/master/
  off-rows/negative amounts, and FFT band-bin math. All pass.
- Status: BUILT, awaiting James's first listen + tune. Next: he reacts, we
  iterate mappings/ranges by ear; live audio input is the "maybe later" phase 2.

## 2026-07-23 — Claude (Fable 5)

- Big tuner expansion, all per James's spec. The field generalizes from the fixed
  pork layout to an N×M grid with a pattern engine; **defaults still render the 2002
  composition exactly** (pork spec matrix, 540×420 design space, 100px cells —
  verified by Node sim, scratchpad `relaaax-sim.mjs` this session).
- New controls: grid rows × cols (1–24 each, sliders); fill toggle (stretches the
  composition edge-to-edge, non-uniform); margins per side with a link mode
  (linked / mirrored / free); gap ↔ / gap ↕ / row inset; corner radius for tiles,
  row backgrounds, and the outer frame; gaussian blur on a full-width slider with a
  cubic curve (very fine at the low end, total wash at the top, 0–300 design px).
- Pattern engine: 24 flashing patterns in a dropdown with prev/next buttons —
  pork 2002, unison, sweeps, diagonals, ripple, rings, pinwheel, checkerboard,
  quarters, stripes, bounces, snake, spiral, scatter, sparkle, tempo rows/cols,
  x-cross, drops, edges-in. Two tweak sliders: **spread** (scales phase offsets,
  0 = unison, >×1 wraps extra bands) and **twist** (per-pattern variant knob, hint
  text under the dropdown says what it does per pattern). Pattern/twist changes
  never rebuild the DOM or interrupt the clock; grid changes rebuild DOM but keep
  the clock, so nothing ever visually restarts.
- Renderer internals: geometry moved to unitless CSS vars multiplied by --ux/--uy/
  --umin (x/y split is what makes fill mode possible); rows are still boxes with
  their own oscillating background like the original. `oscValue` grew a rawPhase
  arg but stays backward-compatible. desync seeds unchanged, so saved desync
  settings scatter identically.
- Tuner panel now scrolls when taller than the viewport; sections labelled
  pattern / grid / margins / corners. localStorage shape unchanged (new keys
  default in), so James's existing tune survives.
- Later same session — **tile size** (James: "maybe the most important one"): new
  full-width size slider (position², 0–300 design px, stock 32 near a third across).
  The grid pitch stays anchored to the 32px base + gaps while the rendered square
  uses `tileSize`, so growing tiles close the gaps, butt up, overlap, and spill
  into chaos instead of pushing the grid apart. Cells got fixed pitch heights
  (padding → explicit height) and tiles `position: relative` so oversized tiles
  paint above every row background instead of being buried by the next row's box.
  Tile corner radius reinterpreted as a fraction of tile size (slider now 0–50%,
  50% = circles at any size; saved px values auto-migrate).
- Later again — presets + frame snaps (James: "this has gotten much cooler, keep
  going"). **Presets**: new row at the top of the tuner — dropdown with a "built in"
  group from `presets.js` (the permanent list: pork 2002, lava lamp, wave wall,
  checker strobe, orbs, chaos engine, hypno rings, lounge — seeded deliberately
  different from each other) and a "yours" group saved to localStorage
  (`relaaax-presets`) via the save button (prompt for a name; built-in names
  protected; delete only enabled for saved ones). A preset is a PARTIAL over
  DEFAULTS — loading resets unmentioned knobs, so presets fully determine the look;
  frame size is page state and stays out. Any hand tweak flips the dropdown back
  to "— custom —". The convention: when one of James's saved presets earns
  permanence, Claude bakes it into `presets.js`. **Frame snaps**: "full width"
  (window width, height keeps current proportion) and "fit screen" (window's exact
  size/aspect) buttons in the frame row. Sim extended to validate factory presets
  (legal keys, pattern ids, hex colors, ranges).
- Last tweak of the night: clicking anywhere off the tuner panel closes it
  (pointerdown with the toggle excluded, so slider drags released outside don't
  close it and the toggle doesn't double-fire). James on the session: "actually
  getting quite amazing… the blur effect adds so much… way beyond what I expected."
- Session close — James's direction for next time: **music reactivity**. He'll
  import 5–6 tracks, a track player picks the song, the field reacts rhythmically —
  with its own many-slider tuner section. Maybe live input later; tracks first.
  Details in this world's CLAUDE.md "Next session" section.
- Still draft: no registry, no drift, no sound. Next: James plays with all of it.

## 2026-07-19 — Claude (Fable 5)

- World created. This is the Spastic Space pork.html recreation, renamed by James from
  "pork" to **Relaaax** (folder + title) before the build.
- Built `relaaax-field.js`: standalone embeddable renderer of the pork oscillator field —
  breathing outer box (10s bgthrobback), three nested boxes, 3×4 bordered tiles, caption
  "mesmerizing, ain't it?". Timing decoded from the original GIFs (see
  `assets/spastic-space/recreation-notes.md`). JS rAF oscillators lerping between two
  palette colors; geometry scales off the container (`--u` = one 2002 pixel), so any
  size/aspect works.
- Tuner (Chrome Rift pattern, localStorage `relaaax-tuner`): speed (position², ×0–×8),
  holds scale, desync, ease (linear↔smooth ramps), border width, low/high/bg color
  pickers, caption toggle, reset + per-slider double-click reset.
- index.html stages the field in a centered 1024×768 frame — temporary, per James, while
  he decides the final setting (idea floated: a TV in someone's kitchen, big screen,
  people watching and drooling).
- Deliberately unshipped: no registry entry, no drift exits, no sound. Status `draft`.
  Next: James tunes by eye; then the setting.
- Later same session: added to the admin panel's In progress worlds list. James liked
  the result; per his direction the caption ("mesmerizing, ain't it?") was removed
  entirely (field, config, and toggle), and the four mini sliders got one-line
  descriptions under them (`.tuner-desc`).
- Frame sizing added to the panel: width × height text inputs (default 1024×768,
  persisted under localStorage `relaaax-frame`, separate from field config since the
  frame is staging). Any size/aspect; oversized frames scale down proportionally to fit
  the window. Reset restores it too.
