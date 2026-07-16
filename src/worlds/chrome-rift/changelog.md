# Changelog — The Chrome Rift (formerly The Monochrome Rift)

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-16 — claude-fable (with James)

- MUSIC REPLACED: James retired the raga drone (both `rift-drone` mp3s deleted) in favor of two
  tracks he made in Suno — `assets/audio/saffron-01.mp3` and `saffron-02.mp3` (~8 minutes total).
  He expects to add three or four more Saffron tracks later; adding one = drop the file in
  `assets/audio/` and add a line to `TRACKS` in world.js — everything else follows.
- NEW: tiny music player. A note button just left of the tuner toggle (same round style,
  `right: 4.1rem`) opens a small panel above the pair — one row per track: play/pause button +
  title, the playing track highlighted. Click a playing track's button to stop it; click another
  track to switch. Left alone, the playlist plays in order and wraps around forever (the shared
  sound control's autoplay attempt starts track 1, `ended` chains the rest).
- One Audio element serves the whole playlist (src swaps per track), so the shared sound control
  (mute/volume/on-off icon) and the breathe analyser keep working across track changes — the
  MediaElementSource is wired to the element once and survives src swaps.
- Wording updated drone → music: breathe slider tooltip, guide's breathe entry, world.json
  soundtrack, and world.js comments.
- Player round 2 (James): panel stretched to a fixed width (min(20rem, vw−8rem)) and a seek
  slider added below the track list — same styling as the tuner sliders, scrubs the playing
  track. While the pointer holds the thumb, timeupdate stops writing back so drags don't fight
  the playhead; switching tracks resets it to 0. Note: server.mjs serves no Range requests, so
  seeking relies on buffered data — instant on loopback, worth remembering if worlds ever ship
  with long audio on a range-less host.
- SEEK FIX (same session): the slider snapped back to 0 and restarted the track — the caveat
  above was the whole story: no Range support + no-store meant Chrome could not seek at all.
  server.mjs now serves byte ranges (Accept-Ranges/Content-Length on 200s, 206 with
  Content-Range for `bytes=` requests incl. suffix/open-ended, 416 when unsatisfiable) and
  learned audio/video MIME types (.mp3 was application/octet-stream). Server restarted via the
  launcher pattern; verified with curl (200/206/416 all correct, pages and API unaffected).
  No world-code change — the slider logic was fine.
- Where things stand: player is in and wired; James curates the soundtrack himself (more Suno
  tracks expected). World visuals unchanged this session.

## 2026-07-15 — claude-fable (with James)

- RENAMED: The Monochrome Rift → **The Chrome Rift**. Folder moved `monochrome-rift/` →
  `chrome-rift/` (git history preserved), slug/title updated in `world.json`, map-room link and
  archived-homepage fallback links updated, registry regenerated. Old URL no longer resolves.
- NEW: tuner panel (James's spec — worlds are getting controls). A small sliders button bottom
  right toggles a bottom-center panel; both sit above the drift portals so tuning never drifts you
  away. Settings persist in localStorage (`chrome-rift-config`).
- Speed control: wide slider (~half the screen), from full stop to ×800 of the shipped rate.
  Mapping is position⁴ so the low range tunes subtly; readout shows the multiplier; double-click
  resets to ×1. High speeds render with temporal supersampling (up to 48 sub-frame samples
  averaged per frame) so the bands smear into a gray blur instead of strobing — the
  no-flashing/photosensitivity rule below still holds at every speed.
- Gradient colors: start/end pickers plus 13 preset chips (Monochrome reset + the dozen:
  Old Glory, Roots Reggae, The Simpsons, Batman, The Matrix, Miami Vice, Halloween, Christmas,
  Mardi Gras, Pac-Man, Molten Core, The Abyss). Presets may carry three colors; bands walk
  consecutive palette pairs, and the backdrop derives from the deepest color so the default
  look is pixel-identical to before.
- Rendering reworked for the blur budget: the band field only varies horizontally, scanlines only
  vertically, so each now renders into a 1px strip stretched onto the canvas — dozens of blur
  samples cost less than the old full-screen fills.
- FOUR MORE TUNER PARAMETERS (James approved all four pitched candidates same session):
  1. **bands** (3–60, default 18) — draws the first N of a fixed 60-band pool so sliding down and
     back restores the same bands; band width scales by √(18/N) so three huge slabs at the low end
     become dense slivers at the high end without whiting out.
  2. **wander** (0–100%, default 6%) — the bands' roam distance, position² mapping; 100% sweeps
     the full viewport width.
  3. **breathe** (0–100%, default 50%) — audio-reactive: an analyser on the drone yields an RMS
     level auto-ranged against its own rolling min/max (so the steady raga still breathes);
     band speed swells up to ×1.9 and the glow swells/brightens with it (alpha capped 0.3).
     GOTCHA: the MediaElementSource is only wired once the AudioContext is confirmed running —
     wiring into a suspended context would silence permission-granted autoplay. Falls back to
     inert under file://.
  4. **pull** (0–100%, default 50%) — the center glow eases toward the cursor (τ≈0.9s); pull
     blends the target between its home (62%, 50%) and the pointer; returns home when the
     cursor leaves.
- Every slider now resets to its own default on double-click; all six parameters persist in
  `chrome-rift-config`.
- Panel-wide RESET button (end of the colors row): restores every parameter and the Monochrome
  palette to defaults in one click.
- INFO GUIDE — small circled-i button next to reset opens a `<dialog>` describing every
  control (James-approved prose, verbatim from session; the presets line deliberately doesn't
  name the thirteen — visitors get to figure them out). Two-column list sized to fit without
  scrolling on normal windows. Opens NON-MODALLY (James's call): no backdrop, no focus trap —
  the scene keeps animating and the tuner stays fully usable beneath it, so you can try
  controls while reading. Docked directly above the tuner panel at the panel's exact width
  with a 10px gap (world.js measures the panel on open/toggle/resize); × or Esc closes it
  (Esc handled manually — non-modal dialogs don't get it natively).
- SEVENTH PARAMETER — **edges** (0–100%, default 50%): edge clarity of the bands. The default
  50% is the shipped gradient softness; below it, a horizontal canvas `filter: blur()` pass
  (position², up to ~48px) fogs the whole band field; above it, the gradient's color transitions
  pinch around their midpoints (stops 0/0.45/1 → plateaus) until 100% is hard-edged slabs.
  Blur applies at the single strip blit, so cost is one GPU pass regardless of speed samples.
- Where things stand: monochrome-by-default look preserved (breathe/pull animate but the still
  composition is unchanged); James still considers the world in need of more work.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

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
