# Changelog — Saturation

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-11-06 — Claude (Fable 5.1)

- James's question: "are you positive that you are clearing all the thumbnails? where are they
  when they are in use?" Answer from reading the code: the thumbnails live in the tab's memory
  only and are freed on a folder change, a stale warm-up, or closing the tab. Not cleared: the
  full-size originals, which the server sent with a one-hour cache header, so the browser kept a
  disk copy of every photo it shrank.
- Fixed on his go: `/api/image-file` now answers `Cache-Control: no-store` (`server.mjs`) and
  `makeThumb` fetches with `cache: 'no-store'` (`world.js`), so the page side holds even on an
  un-restarted server. **Server restart needed** for the header. Not verified in a running tab.
- Still open, not asked for: no cap on the thumbnail set while a folder is loaded (20,000
  pictures ≈ 100–300 MB of tab memory); a grid-size change does not remake the thumbnails.

## 2026-10-16 — Claude (Fable 5.1)

- World created as a draft on James's ask: a 20 × 16 grid of pictures, each cell swapping to a
  random picture from a folder of folders of images at a random moment one to three seconds
  after its last swap, a continuous flicker across the whole screen.
- `server.mjs` gained `/api/images?dir=` (recursive listing of any folder on disk) and
  `/api/image-file?path=` (serves one picture under a listed folder) — **server restart needed**.
- `world.js` + `world.css` + `index.html`: the grid, the per-cell timers, the configuration
  panel (C), background cache warming, colour swatches when no folder is set.
- His first look: "a great proof of concept" → THE SPEED SLIDER in the panel (his ask): a
  slider from 1/10× to 10× that divides the min–max gap; min and max stay; double-click
  resets it to 1×; saved with the rest.
- Then PAUSE (a panel button, or Space; the clocks stop and every cell's next swap is pushed
  by the time paused) and BROWSE (the … button by the folder field, or load folder with an
  empty field): `GET /api/pick-folder` runs Windows' own folder picker from the server on
  his desktop — PowerShell `FolderBrowserDialog`, -STA — and answers with the chosen path,
  which then loads. Proven to open from an unsandboxed process (James: "it opened").
- His "this makes my laptop fan go wild" → THE THUMBNAILS: every swap had been decoding a
  full-size photo, ~160 a second. Now each picture is fetched once, shrunk on a canvas to the
  cell's size (× device pixels, cap 360) and kept as a small JPEG blob; the cells only ever swap
  those. Three workers in the background, the folder shuffled first so the screen fills from all
  over it; the status reads "N of M pictures ready". Measured: 1,600 swaps in 12 ms.
- THE SWEEPS (his ask: "out of nowhere, it suddenly does a sweep across the screen"):
  `sweeps.js` holds fourteen patterns — wipe right / left / down / up, diagonal, ripple out,
  ripple in, ripple from a random point, swirl, checkerboard, snake, rain, column shuffle,
  split from the middle. Every 8–15 s one is picked at random and hands every cell a moment
  within the next 1.2 s; the cell swaps then and drops back into its random rhythm. Panel:
  sweeps on/off, every min / max s, sweep s, sweep now (S), last sweep's name. Pause holds
  the sweep clock too. Headless check: every pattern maps every cell into 0..1.
- The speed slider widened on his ask: full stop at the left (only the sweeps move), 1× in
  the middle, 1000× at the right (10^((pos − 0.5) × 6)); a change takes hold at once. Past
  ~60× every cell wants more than one swap a frame, so the top end is simply every cell every
  frame — the slider deliberately runs past what a browser can show. Stored as `rate`.
- Admin row under In progress worlds, note `unwired`. No exits, no sound, not in the registry.
- Where it stands: proof of concept, awaiting James's first look. He has not yet named the
  folder; he types it into the panel. Next, on his word: a folder default, exits, whatever the
  flicker wants once he has seen it.
