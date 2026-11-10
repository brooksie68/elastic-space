# Softly — Claude instructions

Nothing but overlapping full-screen gradients, fading in and out (James's quickie, 2026-10-16).

## Docs

- `changelog.md` — session history, newest first.

## World-specific rules

- Every wash is a linear gradient with ONE or TWO stops only: color → color, or color → transparent. Never more stops.
- Random color, random angle, at most 5 on screen at once; a wandering tempo speeds and slows everything (constants at the top of world.js).
- The washes are drawn in ONE WebGL fragment shader (world.js): CSS linear-gradient math per pixel, float compositing, a 1/255 noise dither before output so there is no banding. The old stacked-div renderer stays as the no-WebGL fallback. Never add per-wash drift of angle or position without his word — the liquid feel is the crossfade of still gradients. Silent test page: `tmp/softly/silent.html` (world.js without sound.js).
- Sound: `sound.js` plays James's Suno track `assets/audio/Softly.mp3` on a loop (4 s fade in) through the shared sound control; the earlier synthesised chord + chimes are in git history only. Three drift exits: invisible soft round blurs in the top-left, bottom-left and bottom-right corners (top right is the controls); they glow faintly on hover. In the drift registry since 2026-10-16 (world.json live).
- Fullscreen: `fullscreen.js` — a third round button under the speaker (or the F key) enters the browser's fullscreen; the button, Escape or a double-click anywhere leaves (`leave()` retries every exit and locks re-entry for a second — he got stuck once, keep it bulletproof). In fullscreen the three corner icons fade out (2 s) after 3 s without mouse motion, fade back in (2 s) on motion, and go again 3 s after it stops; never while the pointer is over a control. Constants at the top of the file.
