# Changelog — The Monochrome Rift

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-11 — claude-fable

- Removed the random full-screen white flashes entirely at James's request (photosensitivity hazard):
  deleted the `.flash` overlay div, its CSS, and the `maybeFlash()` logic in `world.js`.
- Cleared the `flashing visuals` warning and the word "flashes" from the `world.json` summary,
  since the world no longer flashes.
- Slowed the whole animation by half (time scale in `animate()` 0.5 → 0.25).
- Tried 12 horizontal cross-bands with `difference` compositing for visual interest; James rejected
  it ("it sucks") and it was fully reverted. The scene stays all-vertical.
- Widened band widths to 1%–22% of viewport (was 4%–16%) for thin-sliver vs. heavy-slab contrast;
  final animation time scale settled at 0.18 after trying 0.25 and 0.125.
- Replaced the entire Web Audio synth soundscape (grinder, wind, chimes — which was unreachable
  anyway; its `#audio-toggle` button didn't exist in the HTML) with James's own generated track
  `assets/audio/rift-drone.mp3`, a meditative shruti/harmonium raga drone. It loops continuously:
  autoplay is attempted on load, with pointerdown/keydown fallback for browsers that block it.
  ElevenLabs generation happened this session (Creator tier) but James curated the final track
  himself; music generation is his call going forward, not an agent task.
- Built the shared sound control (`src/core/sound-control.js`) to James's spec — speaker button top
  right, double pulse on load, tooltip, on/off states, hover volume slider, one autoplay attempt —
  and made this world its first adopter (`ElasticSoundControl.attach({ media: drone })`). The
  click-anywhere/keydown fallback was removed; the speaker button is now the sound affordance.
  Documented in `CLAUDE.md` and `docs/architecture.md`; root `index.html` got a visitor note about
  granting the browser sound permission.
- Where things stand: visuals are bands + scanlines + glow, all vertical, slow. James says the world
  "needs a lot of work" — more revisions coming.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history and `world.json`.
- Where things stand: live. No pending working-tree changes.

## 2026-07-04 — launch (commit 97499fe, "Launch Elastic Space")

- World shipped live: a stark chamber of shifting black and white with flashes, grinding resonance,
  air rush, and distant chimes.
- Manifest carries a `flashing visuals` warning.
- Audio (grinding drone, wind noise, distant chimes) is gated — no autoplay.

## Standing guidance

1. Keep the page severe and spare (owner note in `world.json`).
2. No flashing or strobing visuals — removed 2026-07-11 for photosensitivity; do not reintroduce.
   If any rapid-luminance effect is ever added, restore the `flashing visuals` warning in `world.json`.
