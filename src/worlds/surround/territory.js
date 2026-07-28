// Surround — territory field. Pure: given a game state, work out which side
// reaches each empty cell first. Feeds the floor wash and the HUD meter.
//
// Kept out of game-core.js so the sim's contract stays untouched; kept out of
// render3d.js so the renderer stays pure presentation.
//
// Sides, not riders: channel 0 is the player, channel 1 is every CPU rider
// merged (the gauntlet round has two hunters — the wash shows you-vs-them).

// out: Float32Array(w * h * 2) — [player claim, cpu claim] per cell, 0..1
// occ: Uint8Array(w * h) — 1 where a wall is laid (for the floor scorch)
// Returns the balance in -1..1 (positive = the player owns more space).
export function computeClaim(Core, state, out, occ) {
  const w = state.w;
  const h = state.h;
  const me = state.players[0];
  const da = me.alive ? Core.bfsDist(state, me.x, me.y) : null;
  const cpuDists = [];
  for (let k = 1; k < state.players.length; k++) {
    const p = state.players[k];
    if (p.alive) cpuDists.push(Core.bfsDist(state, p.x, p.y));
  }

  let ca = 0;
  let cb = 0;
  for (let i = 0; i < w * h; i++) {
    const cell = state.cells[i];
    if (occ) occ[i] = cell === 0 ? 0 : 1;
    if (cell !== 0) {
      // A laid wall belongs to whoever laid it — keeps the wash reading as
      // owned ground rather than punching holes in it. The overtime field
      // (Core.FIELD) belongs to nobody.
      out[i * 2] = cell === 1 ? 0.85 : 0;
      out[i * 2 + 1] = cell >= 2 && cell !== Core.FIELD ? 0.85 : 0;
      continue;
    }
    const ra = da ? da[i] : -1;
    let rb = -1;
    for (const d of cpuDists) {
      if (d[i] >= 0 && (rb < 0 || d[i] < rb)) rb = d[i];
    }
    let p0 = 0;
    let p1 = 0;
    if (ra >= 0 && (rb < 0 || ra < rb)) { p0 = 1; ca++; }
    else if (rb >= 0 && (ra < 0 || rb < ra)) { p1 = 1; cb++; }
    else if (ra >= 0 && rb >= 0) { p0 = 0.5; p1 = 0.5; ca += 0.5; cb += 0.5; }
    // Contested ground fades out with distance so the wash stays soft.
    const d = Math.max(ra, rb);
    const fade = d < 0 ? 0 : Math.exp(-d / 26);
    out[i * 2] = p0 * (0.35 + 0.65 * fade);
    out[i * 2 + 1] = p1 * (0.35 + 0.65 * fade);
  }
  const total = ca + cb;
  return total > 0 ? (ca - cb) / total : 0;
}
