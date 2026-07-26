// Surround — pure game core. No DOM, no canvas, no timers, no Math.random.
// Loaded by the browser (classic script) AND by the Node sim (tmp/surround/sim.mjs).
// Keep it pure or the sim lies.
(function () {
  // 0 up, 1 right, 2 down, 3 left
  const DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const OPPOSITE = [2, 3, 0, 1];

  function createGame(opts) {
    opts = opts || {};
    const w = opts.w || 44;
    const h = opts.h || 24;
    const state = {
      w: w,
      h: h,
      cells: new Uint8Array(w * h), // 0 empty, 1 player trail, 2 cpu trail
      players: [],
      tick: 0,
    };
    resetRound(state);
    return state;
  }

  // Both riders spawn on the horizontal midline facing each other, classic Surround.
  function resetRound(state) {
    state.cells.fill(0);
    state.tick = 0;
    const midY = Math.floor(state.h / 2);
    const x0 = Math.max(1, Math.round(state.w * 0.18));
    const x1 = state.w - 1 - x0;
    state.players = [
      { x: x0, y: midY, dir: 1, pendingDir: 1, alive: true, crashInto: null },
      { x: x1, y: midY, dir: 3, pendingDir: 3, alive: true, crashInto: null },
    ];
    state.cells[midY * state.w + x0] = 1;
    state.cells[midY * state.w + x1] = 2;
  }

  function setDirection(state, idx, dir) {
    const p = state.players[idx];
    if (!p || !p.alive) return false;
    if (dir === OPPOSITE[p.dir] || dir === p.dir) return dir === p.dir;
    p.pendingDir = dir;
    return true;
  }

  function inBounds(state, x, y) {
    return x >= 0 && y >= 0 && x < state.w && y < state.h;
  }

  function cellFree(state, x, y) {
    return inBounds(state, x, y) && state.cells[y * state.w + x] === 0;
  }

  // Advance one tick. Returns array of player indices that crashed this tick.
  function step(state) {
    const a = state.players[0];
    const b = state.players[1];
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      if (p.alive) p.dir = p.pendingDir;
    }
    const next = state.players.map(function (p) {
      return p.alive ? { x: p.x + DIRS[p.dir].x, y: p.y + DIRS[p.dir].y } : null;
    });
    const dead = [false, false];
    for (let i = 0; i < 2; i++) {
      const n = next[i];
      if (!n) continue;
      if (!inBounds(state, n.x, n.y)) dead[i] = true;
      else if (state.cells[n.y * state.w + n.x] !== 0) dead[i] = true;
    }
    if (a.alive && b.alive && next[0] && next[1]) {
      // both steering into the same cell
      if (next[0].x === next[1].x && next[0].y === next[1].y) {
        dead[0] = dead[1] = true;
      }
      // head-on swap through each other
      if (next[0].x === b.x && next[0].y === b.y && next[1].x === a.x && next[1].y === a.y) {
        dead[0] = dead[1] = true;
      }
    }
    const crashed = [];
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      const n = next[i];
      if (!p.alive || !n) continue;
      if (dead[i]) {
        p.alive = false;
        p.crashInto = n;
        crashed.push(i);
        continue;
      }
      p.x = n.x;
      p.y = n.y;
      state.cells[p.y * state.w + p.x] = i + 1;
    }
    state.tick++;
    return crashed;
  }

  // ---- AI ----------------------------------------------------------------

  // straight, left, right (never reverse)
  function candidates(p) {
    return [p.dir, (p.dir + 3) % 4, (p.dir + 1) % 4];
  }

  // Bounded flood-fill: how many empty cells are reachable from (sx, sy),
  // counting (sx, sy) itself. Stops at cap.
  function floodSize(state, sx, sy, cap) {
    if (!cellFree(state, sx, sy)) return 0;
    const w = state.w, h = state.h;
    const seen = new Uint8Array(w * h);
    const qx = new Int32Array(cap + 4);
    const qy = new Int32Array(cap + 4);
    let head = 0, tail = 0, count = 0;
    seen[sy * w + sx] = 1;
    qx[tail] = sx; qy[tail] = sy; tail++;
    while (head < tail) {
      const x = qx[head], y = qy[head]; head++;
      count++;
      if (count >= cap) return count;
      for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d].x, ny = y + DIRS[d].y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = ny * w + nx;
        if (seen[i] || state.cells[i] !== 0) continue;
        seen[i] = 1;
        qx[tail] = nx; qy[tail] = ny; tail++;
      }
    }
    return count;
  }

  // BFS distance field over empty cells from (sx, sy). The source counts as
  // reachable even if occupied (it's a head). -1 = unreachable.
  function bfsDist(state, sx, sy) {
    const w = state.w, h = state.h;
    const dist = new Int32Array(w * h).fill(-1);
    const qx = new Int32Array(w * h);
    const qy = new Int32Array(w * h);
    let head = 0, tail = 0;
    dist[sy * w + sx] = 0;
    qx[tail] = sx; qy[tail] = sy; tail++;
    while (head < tail) {
      const x = qx[head], y = qy[head]; head++;
      const d = dist[y * w + x];
      for (let k = 0; k < 4; k++) {
        const nx = x + DIRS[k].x, ny = y + DIRS[k].y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = ny * w + nx;
        if (dist[i] !== -1 || state.cells[i] !== 0) continue;
        dist[i] = d + 1;
        qx[tail] = nx; qy[tail] = ny; tail++;
      }
    }
    return dist;
  }

  // Voronoi territory: with my head hypothetically at (sx, sy), how many empty
  // cells do I reach strictly sooner than the opponent (half credit for ties)?
  function voronoiScore(state, meIdx, sx, sy) {
    const opp = state.players[1 - meIdx];
    const i = sy * state.w + sx;
    const prev = state.cells[i];
    state.cells[i] = meIdx + 1; // occupy candidate so opponent can't path through it
    const mine = bfsDist(state, sx, sy);
    const theirs = bfsDist(state, opp.x, opp.y);
    state.cells[i] = prev;
    let score = 0;
    for (let k = 0; k < mine.length; k++) {
      if (state.cells[k] !== 0) continue;
      const dm = mine[k], dt = theirs[k];
      if (dm < 0) continue;
      if (dt < 0 || dm < dt) score += 1;
      else if (dm === dt) score += 0.5;
    }
    return score;
  }

  // Pick a direction for player idx. level: 1 easy, 2 medium, 3 hard.
  // rng: () => [0,1) — injected so the sim can seed it.
  function aiChoose(state, idx, level, rng) {
    const p = state.players[idx];
    const opp = state.players[1 - idx];
    const cands = candidates(p);
    const safe = cands.filter(function (d) {
      return cellFree(state, p.x + DIRS[d].x, p.y + DIRS[d].y);
    });
    if (safe.length === 0) return p.dir; // doomed — ride it out straight
    if (level <= 1) {
      // keep heading, dodge walls, occasionally wobble
      if (safe.indexOf(p.dir) !== -1 && rng() < 0.85) return p.dir;
      return safe[Math.floor(rng() * safe.length)];
    }
    if (level === 2) {
      // greedy local space, prefers straight on ties
      let best = [], bestScore = -1;
      for (let i = 0; i < safe.length; i++) {
        const d = safe[i];
        const s = floodSize(state, p.x + DIRS[d].x, p.y + DIRS[d].y, 220);
        if (s > bestScore) { bestScore = s; best = [d]; }
        else if (s === bestScore) best.push(d);
      }
      if (best.indexOf(p.dir) !== -1) return p.dir;
      return best[Math.floor(rng() * best.length)];
    }
    // level 3: territory (Voronoi) while contested; space-filling once separated
    let separated = true;
    if (opp.alive) {
      const reach = bfsDist(state, p.x, p.y);
      for (let k = 0; k < 4; k++) {
        const ox = opp.x + DIRS[k].x, oy = opp.y + DIRS[k].y;
        if (inBounds(state, ox, oy) && state.cells[oy * state.w + ox] === 0 &&
            reach[oy * state.w + ox] >= 0) { separated = false; break; }
      }
    }
    let bestDir = safe[0], bestScore = -Infinity;
    for (let i = 0; i < safe.length; i++) {
      const d = safe[i];
      const nx = p.x + DIRS[d].x, ny = p.y + DIRS[d].y;
      let score;
      if (separated) {
        // the walls are down to a private chamber: keep the biggest reachable
        // area, hug walls (fewer free neighbors) so the fill stays tight
        let nbrs = 0;
        for (let k = 0; k < 4; k++) {
          if (cellFree(state, nx + DIRS[k].x, ny + DIRS[k].y)) nbrs++;
        }
        score = floodSize(state, nx, ny, state.w * state.h) * 10 - nbrs;
        if (d === p.dir) score += 0.3;
      } else {
        score = voronoiScore(state, idx, nx, ny);
        if (opp.alive && Math.abs(nx - opp.x) + Math.abs(ny - opp.y) === 1) score -= 3;
        if (d === p.dir) score += 0.25;
      }
      score += rng() * 0.01;
      if (score > bestScore) { bestScore = score; bestDir = d; }
    }
    return bestDir;
  }

  globalThis.SurroundCore = {
    DIRS: DIRS,
    OPPOSITE: OPPOSITE,
    createGame: createGame,
    resetRound: resetRound,
    setDirection: setDirection,
    step: step,
    inBounds: inBounds,
    cellFree: cellFree,
    candidates: candidates,
    floodSize: floodSize,
    bfsDist: bfsDist,
    voronoiScore: voronoiScore,
    aiChoose: aiChoose,
  };
})();
