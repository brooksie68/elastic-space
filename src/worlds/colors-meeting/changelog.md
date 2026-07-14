# Changelog — Colors, Meeting

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-13 — claude-fable (with James)

- Changed the default (dusk) palette's first two pigments to #eb6145 (top) and #20346b (bottom) —
  a pairing James landed on and liked. Remaining three dusk colors unchanged.
- Fixed a color-math bug James caught by eye: the blue coefficient in hexToOklab's first LMS row
  was 0.1051457216 instead of OKLab's 0.0514459929, so blue-heavy pigments rendered purple (pure
  blue came back as rgb(129,0,255)). Round trip hex → OKLab → RGB is now exact. Note: all presets
  now render truer to their hex values than before, so every palette looks slightly different —
  blues most of all.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-12 — claude-fable (with James)

- First build, from idea #24 in Claude's Ideas.md ("Two Colours, Meeting"; James renamed it Colors, Meeting).
- Canvas 2D renderer: fields blended in OKLab on a 288×162 offscreen sim, upscaled, with per-column
  sine-sum seam waviness and a pre-baked grain overlay (overlay blend mode).
- All motion on incommensurate two-sine oscillators, periods 70s–19min; nothing loops, nothing is
  catchable in the act. Tempo control scales the sim clock (glacial / slow / restless).
- Conservator's panel behind the museum wall label (bottom right): fields 2–5, per-field pigment
  swatches, six palette presets, "let them wander" hue drift, tempo, seam softness, grain, seam
  drift range, and a reset ("Restore original hanging"). No persistence — resets on load by design.
- Deliberately silent; no sound-control include. Site's first mute world.
- Three drift exits: label fine print ("continues in the next gallery"), a door-shadow that
  surfaces occasionally in the lowest field, and a glint that rides the first seam's live position.
- After James's first review (approved, "wouldn't change a thing... except"): label link retitled
  to "Next Gallery", visually separated from the panel-opening card (rule above, brighter, small
  caps); added a fourth drift exit — a pale four-pane window that surfaces in the upper field on
  its own ~2-min cycle, mirroring the door-shadow below.
- Status: draft, awaiting James's review. Next: tune default palette and door-shadow timing,
  iterate on exits, then flip status when he approves.
