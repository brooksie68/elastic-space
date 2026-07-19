# The Chrome Rift — Claude instructions

A stark chamber of shifting bands — monochrome until you tune it via the hidden tuner panel.

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- The tuner (toggle button + bottom panel, localStorage-persisted sliders, built 2026-07-15)
  is the reference implementation for world config panels — keep it working.
- High band speeds must blur, not strobe.
- Soundtrack is James's Suno "Saffron" tracks in `assets/audio/` (looping playlist in
  world.js, tiny music player button next to the tuner toggle). Adding a track = drop the
  MP3 in `assets/audio/` and add a line to `TRACKS` in world.js.
