# Colors, Meeting — Claude instructions

Fields of color meeting at seams that breathe on periods of minutes — too slowly to catch, too surely to deny.

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- The slowness is the point: seam motion runs on minute-scale periods. Do not speed it up
  to make changes easier to verify — verify with sampled values instead.
- The dice (2026-09-05, Lumina's pair): both in the panel's top-right corner AND both on the
  wall label before the title, thin and frosted (James: "very subtle... very thin frosted
  white"). The sharp die snaps every control; the soft die melts there over two seconds under
  a fog veil (`meltVeil` adds to seam softness in `render()`, never in state) with the
  unglidable things — field count, tempo, wander — swapping at the peak. During a melt the
  fields are retinted in place (`retint()`), never rebuilt, so the seams don't jump. A new
  control must join `rollSettings()`/`meltRoll()` or the dice will never touch it. The wall
  dice are exempt from click-away.
- Nothing else documented yet — add constraints here as they surface.
