# DROPZILLA (formerly The Toot Suite) — changelog

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
