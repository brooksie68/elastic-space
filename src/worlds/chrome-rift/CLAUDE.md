# The Chrome Rift — Claude instructions

A stark chamber of shifting bands — monochrome until you tune it via the hidden tuner panel.

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- The tuner (toggle button + bottom panel, localStorage-persisted sliders, built 2026-07-15)
  is the reference implementation for world config panels — keep it working.
- High band speeds must blur, not strobe.
- The dice (2026-09-05, Lumina's pair): the sharp die snaps every control + the gradient to a
  random setting, the blurry die melts there over two seconds under a fog veil (`meltVeil`
  adds to the edges blur in `frame()`, never lands in config). Any hand on a control cancels a
  melt. Both live at the head of the preset strip AND in the bottom-right corner (left of the
  music note); the corner dice are exempt from click-away so a roll keeps the panel open.
  A new control must join `rollSettings()`/`meltRoll()` or the dice will never touch it.
  Silent lab for judging it without sound: `tmp/chrome-rift/dice-check.html?open=1` (KEEP).
- Soundtrack is James's Suno "Saffron" tracks in `assets/audio/` (looping playlist in
  world.js, tiny music player button next to the tuner toggle). Adding a track = drop the
  MP3 in `assets/audio/` and add a line to `TRACKS` in world.js.
