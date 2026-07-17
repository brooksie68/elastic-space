# DROPZILLA (formerly The Toot Suite) — changelog

## 2026-07-17 — Claude (Fable 5, with James)

- Bank two is live: **CHUCK OPINES** (`assets/audio/chuck-opines/`, amber accent) — 29 of
  James's talk-show reaction drops with labels + emoji, grouped by row: listening prompts,
  agreement/praise, pushback, jokes/laughs, misc. 7 slots left open for future clips.
  Later same day: final 7 landed (Selling My Ass 🫏, Uh-Huh 😑, That's So True 🙌,
  Seriously Right? 🎯, I'm Feelin' It 🕺, I'm Very Sensitive 🥺, My Balls Itch 🎱) —
  bank full at 36. (`i'm-very-sensitive.mp3` → James renamed to `im-very-sensitive.mp3`.)
- Open-slot support added: a `null` pad entry renders as a dark inert `.pad--empty` button;
  `triggerPad` guards against them and RANDOM only picks filled slots.
- world.json warnings: added "strong language" (Cursing Tirade, That's Bullshit).
- Retrigger choke: hitting a pad that's already playing cuts that voice and restarts the
  sample from the top (per-pad `activePad` map; different pads still layer freely, FX tails
  keep ringing). Enables the pep-pep-pep-Pepperidge Farm stutter James asked for.
- Where things stand: two banks live (GAS, CHUCK OPINES), eight bank slots open — the plan
  is to keep filling tabs as James produces audio sets (on the CLAUDE.md todo). Drift exits
  remain temporarily disabled (2026-07-16 entry); re-enabling is also on the todo.

## 2026-07-16 — Claude (Fable 5, with James)

- Bank one refreshed: **TOOTS → GAS**. James replaced the audio set with 36 new farts in
  `assets/audio/gas/` (28 brand-new, 8 survivors keeping their numbered filenames); the old
  `toots/` folder is gone. New pad grid wired to the new filenames with fresh labels + emoji
  icons (survivors keep their originals), loosely themed by row: squeaks/horns, family, food,
  swamp, wardrobe/secrets, and a finale row ending on Record Breaker 🏆.
- Pad icons roughly doubled (`.pad-icon` clamp 1rem/3.1vh/1.9rem → 2rem/6.4vh/4rem) per James —
  they now sit about as wide as the pad names below them.
- Pad layout air: icon/name gap 0.12em → clamp(6px, 1.6vh, 14px) (vh-proportional; centered
  stack means icon rises, name drops), plus `translateY(-15px)` on the icon per James's eye.
  (Tried names at weight 800 — read as Black, reverted to 600.)
- Temporarily disabled all three drift exits (skull sticker, "back in 5 — or never" note, patch
  cable) at James's request — no drifting links on the page for now; he found them distracting,
  the cable especially sitting near the RANDOM/BLEEP panel. The anchors are commented out in
  index.html (CSS and the drift.js/world-registry.js includes untouched); uncomment the block to
  restore. RANDOM and BLEEP themselves never had link actions — they're pure soundboard functions.

## 2026-07-15 — Claude (Fable 5, with James)

- Reimagined the world as **DROPZILLA**: a shock jock's sample deck styled like contemporary
  pad-controller hardware (dark chassis, backlit rubber pads, silkscreen labels, corner screws).
  Folder renamed `toot-suite` → `dropzilla` via git mv; registry regenerated; map room link updated.
- Bank system: ten physical bank buttons across the top rail; only bank 1 (**TOOTS** — the
  original 36 farts, moved to `assets/audio/toots/`) is live. Future banks are data + an audio
  folder; unassigned slots render dark and inert. Each bank carries its own backlight accent color.
- Green LCD strip shows bank, last-fired sample, knob readouts, and looper state.
- FX bus (Web Audio): pad audio routes MediaElementSource → drive (tanh waveshaper crossfade) →
  4-stage swept-allpass phaser → master, with delay (filtered feedback) and reverb (synthesized
  impulse convolver) sends. Knobs: PITCH (varispeed 0.5x–2x, `preservesPitch=false`, applies to
  newly fired sounds), DRIVE, PHASER, DELAY, REVERB. Knobs are draggable/wheelable/keyboard
  rotaries with conic-gradient value arcs; double-click resets.
- `file://` degradation: MediaElementSource silences file:// media (opaque origin), so pads play
  plain audio there and only the synthesized BLEEP goes through FX; LCD announces "FILE MODE".
- Looper: event-based (records pad hits + timestamps, retriggers through the live FX/pitch state).
  REC → REC closes the loop and rolls; REC while rolling = overdub; STOP/PLAY/CLR transport with
  LEDs; 30 s max; loop replays don't re-record themselves. BLEEP is not recorded (it's a hold).
  Master sound-off aborts recording or stops the loop.
- BLEEP (hold): 1 kHz censor sine, synthesized, routed through the FX bus. RANDOM: big red pad,
  fires a random pad from the current bank (and records into the looper as the resolved pad).
- Drift exits rebuilt as machine junk: a peeling skull sticker (bottom left), a coffee-stained
  sticky note (left bezel), and a patch cable plugged into the bottom edge running off-screen.
- Where things stand: device works with the TOOTS bank; imagery/branding pass and the remaining
  nine banks (R-rated voice drops, stings, crowd, etc.) come next. ElevenLabs generation sessions
  per bank, James curating. `warnings` in world.json says "crude humor" — add strong-language
  when the voice banks land.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-12 — Claude (Fable 5)

- World created at James's request: a big puffy candy-colored fart soundboard, built to make his daughter laugh.
- 36 bespoke farts generated via the ElevenLabs SFX API (`POST /v1/sound-generation`) into `assets/audio/` — each has its own prompt, duration (1–6 s), button name, and emoji. Confirmed along the way that the API has no public-SFX-library search endpoint; generation-only, which suited the brief.
- UI: responsive grid of 36 squishy pastel buttons (jiggle + puff-cloud particles on press), a MYSTERY FART button that plays a random one, playful tilted title. All DOM-generated from a manifest in `world.js`; no fetch(), so file:// works.
- Sound routes through the shared `ElasticSoundControl` (start arms the board, stop silences and halts everything, volume applies to in-flight farts). Concurrent playback capped at 12.
- Drift: three floating stink-puff clouds (fixed, gently animated) are the `data-drift` exits.
- Same session, after James's first look: reworked layout so the whole board fits the viewport with no scrolling — body is a fixed 100dvh flex column, the grid is 9×4 (6×6 under 1080px), buttons stretch to fill their cells, and type scales on vh. Under 640px it reverts to a scrolling 4-column grid since 36 buttons can't honestly fit a phone screen.
- Where things stand: complete and registered. Possible future silliness: keyboard-mashing mode, a fart sequencer, score-keeping for the grand finale.
