// Saturation — THE SWEEPS. Every so often (8–15 s by default) the random flicker is
// interrupted by one pattern: every cell is handed a moment, in ms from the start of the
// sweep, and swaps exactly then; afterwards it falls back into its own random rhythm.
// A pattern is a function (col, row, cols, rows, rnd) → 0..1, the cell's place in the
// sweep; world.js multiplies by the sweep length. `rnd` is a seeded random for the sweep
// so a pattern can pick a centre or an order once and have every cell agree on it.
(() => {
  const TAU = Math.PI * 2;
  const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

  const SWEEPS = [
    { name: 'wipe right', at: (c, r, C) => c / (C - 1) },
    { name: 'wipe left', at: (c, r, C) => 1 - c / (C - 1) },
    { name: 'wipe down', at: (c, r, C, R) => r / (R - 1) },
    { name: 'wipe up', at: (c, r, C, R) => 1 - r / (R - 1) },
    { name: 'diagonal', at: (c, r, C, R) => (c + r) / (C + R - 2) },
    {
      name: 'ripple out',
      at: (c, r, C, R) => dist(c, r, (C - 1) / 2, (R - 1) / 2) / dist(0, 0, (C - 1) / 2, (R - 1) / 2),
    },
    {
      name: 'ripple in',
      at: (c, r, C, R) => 1 - dist(c, r, (C - 1) / 2, (R - 1) / 2) / dist(0, 0, (C - 1) / 2, (R - 1) / 2),
    },
    {
      // a point somewhere on the screen, picked fresh each time
      name: 'ripple from a point',
      setup: (C, R, rnd) => ({ cx: rnd() * (C - 1), cy: rnd() * (R - 1) }),
      at: (c, r, C, R, rnd, s) => dist(c, r, s.cx, s.cy) / Math.max(dist(0, 0, s.cx, s.cy), dist(C - 1, 0, s.cx, s.cy), dist(0, R - 1, s.cx, s.cy), dist(C - 1, R - 1, s.cx, s.cy)),
    },
    {
      // one turn of the clock hand from the centre, the far cells a touch behind the near
      name: 'swirl',
      setup: (C, R, rnd) => ({ dir: rnd() < 0.5 ? 1 : -1, start: rnd() * TAU }),
      at: (c, r, C, R, rnd, s) => {
        const cx = (C - 1) / 2, cy = (R - 1) / 2;
        let a = Math.atan2((r - cy) * (C / R), c - cx) * s.dir - s.start;
        a = ((a % TAU) + TAU) % TAU;
        const d = dist(c, r, cx, cy) / dist(0, 0, cx, cy);
        return Math.min(1, a / TAU * 0.85 + d * 0.15);
      },
    },
    { name: 'checkerboard', at: (c, r) => ((c + r) % 2) * 0.5 },
    {
      // row by row, each row read the opposite way to the one above
      name: 'snake',
      at: (c, r, C, R) => (r + ((r % 2 ? C - 1 - c : c) / (C - 1))) / R,
    },
    {
      // every column falls from the top, each starting a little apart
      name: 'rain',
      setup: (C, R, rnd) => ({ off: Array.from({ length: C }, () => rnd() * 0.5) }),
      at: (c, r, C, R, rnd, s) => s.off[c] + (r / (R - 1)) * 0.5,
    },
    {
      // whole columns, one at a time, in a shuffled order
      name: 'column shuffle',
      setup: (C, R, rnd) => {
        const order = Array.from({ length: C }, (_, i) => i);
        for (let i = C - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
        const place = []; order.forEach((col, i) => { place[col] = i; });
        return { place };
      },
      at: (c, r, C, R, rnd, s) => s.place[c] / (C - 1),
    },
    { name: 'split from the middle', at: (c, r, C) => Math.abs(c - (C - 1) / 2) / ((C - 1) / 2) },
  ];

  window.SATURATION_SWEEPS = SWEEPS;
})();
