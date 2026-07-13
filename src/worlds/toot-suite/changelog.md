# The Toot Suite — changelog

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
