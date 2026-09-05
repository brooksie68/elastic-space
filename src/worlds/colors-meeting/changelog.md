# Changelog — Colors, Meeting

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-09-05 — Claude (Fable 5.1) — THE DICE (James's ask, after the Chrome Rift's)

- James: "add this same functionality to the colors meeting world. On the control panel, up
  in the top right corner, put the dice. And on the actual screen itself, just before where
  it says colors meeting, pigment on light, dimension variable, very subtle, only like very
  thin frosted white dice icon. And random settings." Built as asked.
- THE PANEL: both dice in the top-right corner of the Conservator's Notes (22px squares in
  the panel's own border style; sharp die, then the soft one under a 0.6px blur).
- THE WALL: one thin frosted die (stroke 1, white at 0.34 alpha, 20px) sits before the
  label card — title and medium moved into a flex row beside it; the Next Gallery rule
  below now spans the die too. Warms to 0.6 with the label's hover, 0.92 on its own.
  It rolls the sharp roll. Clicking it while the notes are open leaves them open.
- THE SHARP DIE snaps every control: fields 2–5, pigments, tempo (any of the three), seam,
  grain, drift (uniform), wander 30%. Pigments: 60% one of the six palettes (never the one
  up), 40% a fresh hanging mixed in OKLCH — five close-valued pigments around one hue,
  L 0.28–0.6 with ±0.14 scatter, chroma 0.05–0.16, a brighter complementary accent on one
  field 45% of the time. The palette select reads the preset's name when a roll lands on one.
- THE MELT ROLL glides there over two seconds: pigments lerp in OKLab (the room's own math),
  seam/grain/drift ease, swatches and sliders track live, and a fog veil (`meltVeil`, +0.22
  seam softness at the peak, sin-shaped, added in `render()`, never in state) widens every
  seam until the canvas is one gradient; at that peak the field count, tempo, and wander
  swap and the new fields are built once (fresh oscillators, unseen), then `retint()`
  recolors in place for the rest of the glide so the seams never jump. The loop renders
  every frame while a melt is in flight (the 90ms cadence resumes after). Any hand on a
  control — slider, swatch, radio, select, checkbox, reset — cancels mid-flight (capture
  phase) and the hanging stays where it stands.
- Rule kept: the seam motion itself is untouched; the melt is a two-second, user-triggered
  transition, not a speed-up.
- Same session, his ask ("add the other die that does the two second fade"): the soft die
  joins the wall label too — the pair sits before the title (5px apart, 8px more before the
  card), same thin frosted stroke, the soft one under the 0.6px blur, wired to the melt.
- Where things stand: awaiting James's eyes on the wall dice's weight and the fresh palettes.

## 2026-07-25 — Claude (Fable 5) — click-away dismissal (site-wide sweep)

- New house rule from James: every control panel dismisses on click-away. The
  conservator's panel now closes on a `pointerdown` outside it or the wall label
  (clicking the painting dismisses the notes).

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
