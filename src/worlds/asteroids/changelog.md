# Asteroids — changelog

Newest first. Never rewrite or delete earlier entries.

## 2026-09-08 — BUILT as a one-shot (Claude Fable 5.1, James's "ok" on the plan)

The plan (`tmp/asteroids/plan.md`) was okayed with one word and built whole:
Atari's Asteroids with the rules kept, in the Retro arcade's 2026 register.

- `game-core.js` — the pure core: torus field (H 750, W by aspect), the ship
  (rotate 3.8 rad/s, thrust 330 with drag 0.55/s, cap 520, wrap, four shots at
  620 u/s for 1.4 s carrying the ship's drift, hold-to-fire at 0.2 s or tap
  only), rocks (radii 15/30/62, four normalised outlines, 100/50/20, large → two
  medium → two small), waves 4 +2 cap 11 spawning on the edges away from the
  ship, the two saucers (big 200 sprays, small 1000 leads the ship with an
  error that shrinks with the score; their shots split rocks for nothing; one
  at a time, crossing the field, wrapping only vertically), the lurk rule
  (still 12 s → 2.5× saucer timer + a small one), safe respawn (2.2 s then a
  clear 130-unit circle), an extra ship every 10,000, hyperspace (0.7 s away,
  6% death, 2 s recharge), game over after a beat. Three played exits: the
  derelict's bay, the long jump (3% + 5%/jump), the hollow rock (glints,
  opens on a shot, fly through). `autopilot()` for the sim and the lab.
- `tmp/asteroids/sim.mjs` — 2,230 assertions, fifteen suites (see the CLAUDE.md
  file list). Green.
- `render3d.js` — fixed camera, the field filling the window; two star layers
  as dots; rocks as black-filled outlines with a broken crease chord; wrap
  copies; the 2036 dart at 1.2× its hull with a flame + pink-noise-shaped
  plume; strokes fly apart on every break with sparks and a ring; the saucers
  as two drone shapes; the derelict as a dead station with a breathing lit bay;
  the hollow rock's glint and, opened, rings of light; bloom + tint.
- `index.html` / `game.js` — the attract gate (rocks drift, nobody flies), the
  console (score, ships, wave, hyperspace bar, best), floating points, the
  heartbeat that quickens as the field thins, thrust noise, three explosion
  sizes, two sirens, the configuration panel (PLAY + LOOK, text size, presets,
  click-away, C toggles, opening pauses), pause/restart (two-step), the four
  drift anchors (three hidden + the visible smudge), high score in localStorage.
- `tmp/asteroids/lookdev.html` (silent look-dev, KEEP) and `make-smoke.mjs` →
  `smoke.html` (sound-stubbed shell; the pump keeps its own clock).
- Verified headless: three self-critique rounds in the lab (fixed: a zero-size
  window at load poisoned the field's aspect with NaN; the crease lines crossed
  at the centre like a sliced pie → a broken chord; stars drew as dashes → dots;
  the ship was small → 1.2×); the smoke page pumped through attract → start →
  fire (four-shot cap) → burn → turn → hyperspace → pause → game over, no errors.
- Admin row under In progress worlds with the "unwired" note; world.json
  `draft`; NOT in the registry. World Ideas #65.

Where things stand: awaiting James's flight — feel (turn / thrust / brake),
the saucer cadence, the hollow rock and the derelict in play, the look dials.
Then ship wiring on his word. His three calls from the plan stand: the title
stays Asteroids, rocks spin in-plane, one mode.
