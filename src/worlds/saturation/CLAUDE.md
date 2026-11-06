# Saturation — Claude instructions

A wall of pictures (20 across × 16 down by default) where every cell flickers to another
random picture from a folder of folders of images at its own random moment, one to three
seconds after its last swap, forever. James's idea, 2026-10-16; a proof of concept first —
he wants to see the grid on his screen, then "we'll go from there."

## Docs

- `changelog.md` — session history, newest first.

## How it works

- `world.js` builds the grid, keeps one `img` per cell, and swaps on a rAF loop; each cell
  carries its own next-swap time drawn from [min, max] seconds.
- The pool comes from the dev server: `GET /api/images?dir=<absolute folder>` walks the
  folder recursively (jpg / jpeg / png / webp / gif, cap 20,000) and
  `GET /api/image-file?path=<absolute file>` serves one picture — only under a folder
  listed in that server process. Both routes live in `server.mjs`. Under `file://` the page
  still runs with colour swatches in the cells and a note that it needs the server.
- Configuration: the `C` button (or the C key) opens a panel — folder path, across, down,
  min s, max s, gap px, fit (fill the cell / whole picture), load folder, defaults. Saved
  in localStorage (`saturation-config-1`). Click-away and Escape close it.
- Browse: `GET /api/pick-folder?start=` opens Windows' folder picker on the desktop from the
  server process (PowerShell `-STA` + `FolderBrowserDialog`) and returns `{ path }`. It cannot
  open from a sandboxed shell — test it from James's own server window, never from Bash.
- Pause: the panel button or Space; `setPaused` freezes the clocks and shifts every cell's
  next-swap time on resume.
- Sweeps: `sweeps.js` exports `window.SATURATION_SWEEPS`, a list of `{ name, setup?, at }`;
  `at(col, row, cols, rows, rnd, state)` returns the cell's place 0..1 in the sweep and
  `world.js` sets each cell's next-swap time to start + place × sweep length. Add a pattern by
  adding an entry; the headless check is in the 2026-10-16 changelog entry.
- Thumbnails: after a folder loads, every picture is fetched once in the background, shrunk
  on a canvas to the cell's size and kept as a small JPEG in the tab's memory; the cells only
  ever swap those. They are freed on a folder change or when the tab closes. The originals are
  fetched and served `no-store` so the browser never keeps a disk copy (2026-11-06).
- Open, not asked for: no cap on the thumbnail set while a folder is loaded (20,000 pictures
  ≈ 100–300 MB of tab memory); a grid-size change does not remake the thumbnails.

## World-specific rules

- Draft, unwired: no drift exits yet, no sound. Both wait for James's go.
- The grid and the flicker are the whole picture; nothing else sits on the screen but the
  shared top-right icons and the C button.
