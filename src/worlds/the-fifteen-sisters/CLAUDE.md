# The Fifteen Sisters — Claude instructions

In a salon at dusk, fifteen rainbow glass pendulums — each a hair shorter than the last — drift out of phase into snakes, braids and chaos, then snap back into unison once a minute.

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- Pendulum periods are tuned so the full pattern resolves back to unison once a minute —
  changing lengths, damping, or timing breaks the resolve. Verify the cycle, not just a
  few seconds of motion.
- No sampled bells or bowls in this world, ever. James has thrown the "church bell"
  out three times (2026-07-20, 07-28, 09-01); the last one was the ElevenLabs
  Tibetan bowl, whose ring sat a quarter-tone sharp of two sisters and soured the
  whole effect. The sisters' only voice is the Web Audio sine in `playChime()`.
  Any future voice must be synthesized on the same `freqFor(i)` grid so it cannot
  drift from the tuning — never a pitch-shifted sample. Pitch forensics for any
  candidate sound: `tmp/the-fifteen-sisters/bell-hunt.mjs`; `chime-render.mjs` beside it
  renders the chime graph offline with and without a candidate sound and scans both
  for off-grid tones — run it before adding any voice (both local, gitignored).
- Add further constraints here as they surface.
