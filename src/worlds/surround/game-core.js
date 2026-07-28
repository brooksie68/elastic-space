// Surround — pure game core. No DOM, no canvas, no timers, no Math.random.
// Loaded by the browser (classic script) AND by the Node sim (tmp/surround/sim.mjs).
// Keep it pure or the sim lies.
//
// Cell values: 0 empty, 1..N player trails (player i lays i+1), 4 = the
// containment field itself (overtime shrink) — lethal, neutral, unphaseable.
(function () {
  // 0 up, 1 right, 2 down, 3 left
  const DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const OPPOSITE = [2, 3, 0, 1];
  const FIELD = 4;
  const PHASE_MAX_CELLS = 4;   // how deep a phased rider may run inside walls

  function createGame(opts) {
    opts = opts || {};
    const w = opts.w || 44;
    const h = opts.h || 24;
    const state = {
      w: w,
      h: h,
      cells: new Uint8Array(w * h),
      players: [],
      playerCount: opts.players || 2,
      tick: 0,
      shrink: 0,
      // Specials, all off by default so the classic game stays the classic game:
      // gapEvery: 0|n — every nth cell of every trail is a gap
      // zone: bool — the drifting interference patch where trails don't lay
      // overtime: null | { start, every } — ticks; the field eats a ring each
      rules: opts.rules || {},
    };
    resetRound(state);
    return state;
  }

  function makePlayer(x, y, dir) {
    return {
      x: x, y: y, dir: dir, pendingDir: dir,
      alive: true, crashInto: null,
      escaped: false,     // rode out through the breach — gone, not wrecked
      travel: 0,          // cells entered since spawn — drives the gap pattern
      lastLaid: true,     // did the last move lay a wall (the renderer asks)
      phasing: false,     // currently inside walls
      phaseArmed: false,  // charge spent, waiting for the first wall contact
      phaseCharges: 1,    // once per round
      phaseCells: 0,
    };
  }

  // Two riders spawn on the horizontal midline facing each other, classic
  // Surround. Three (the gauntlet) puts both hunters on the right, thirds-high.
  function resetRound(state) {
    state.cells.fill(0);
    state.tick = 0;
    state.shrink = 0;
    const midY = Math.floor(state.h / 2);
    const x0 = Math.max(1, Math.round(state.w * 0.18));
    const x1 = state.w - 1 - x0;
    if (state.playerCount >= 3) {
      state.players = [
        makePlayer(x0, midY, 1),
        makePlayer(x1, Math.floor(state.h / 3), 3),
        makePlayer(x1, Math.floor((state.h * 2) / 3), 3),
      ];
    } else {
      state.players = [
        makePlayer(x0, midY, 1),
        makePlayer(x1, midY, 3),
      ];
    }
    state.players.forEach(function (p, i) {
      state.cells[p.y * state.w + p.x] = i + 1;
    });
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

  // ---- specials geometry ---------------------------------------------------

  // The interference zone drifts on a deterministic Lissajous path — pure
  // function of the tick so the sim can replay it.
  function zoneAt(state) {
    const t = state.tick;
    return {
      x: state.w * (0.5 + 0.30 * Math.sin(t * 0.013)),
      y: state.h * (0.5 + 0.30 * Math.cos(t * 0.017)),
      r: Math.min(state.w, state.h) * 0.17,
    };
  }

  function inZone(state, x, y) {
    if (!state.rules.zone) return false;
    const z = zoneAt(state);
    const dx = x + 0.5 - z.x;
    const dy = y + 0.5 - z.y;
    return dx * dx + dy * dy <= z.r * z.r;
  }

  // The breach: rules.breach = { side, lo, hi } — an open span of the arena
  // boundary. side 0 = y<0, 1 = x>=w, 2 = y>=h, 3 = x<0; lo..hi is the cell
  // range along that wall. Riding out through it is an escape, not a crash.
  function crossesBreach(state, from, to) {
    const b = state.rules.breach;
    if (!b) return false;
    if (b.side === 0 && to.y < 0) return from.x >= b.lo && from.x <= b.hi;
    if (b.side === 2 && to.y >= state.h) return from.x >= b.lo && from.x <= b.hi;
    if (b.side === 3 && to.x < 0) return from.y >= b.lo && from.y <= b.hi;
    if (b.side === 1 && to.x >= state.w) return from.y >= b.lo && from.y <= b.hi;
    return false;
  }

  // Phase cloak: spend the round's charge; the next wall contact is a
  // pass-through instead of a crash.
  function armPhase(state, idx) {
    const p = state.players[idx];
    if (!p || !p.alive || p.phaseArmed || p.phasing || p.phaseCharges <= 0) return false;
    p.phaseCharges--;
    p.phaseArmed = true;
    return true;
  }

  // Turn assist: a player who crashed on the LAST step (crashInto still set)
  // may be revived by a perpendicular turn into a free cell — the shell grants
  // a short real-time grace window for the input to land. The revived player
  // does not move this tick; they lost one step to the wall, which is the
  // honest price of the late turn.
  function reviveAfterCrash(state, idx, dir) {
    const p = state.players[idx];
    if (!p || p.alive || !p.crashInto) return false;
    if (dir === p.dir || dir === OPPOSITE[p.dir]) return false;
    if (!cellFree(state, p.x + DIRS[dir].x, p.y + DIRS[dir].y)) return false;
    p.alive = true;
    p.crashInto = null;
    p.dir = dir;
    p.pendingDir = dir;
    return true;
  }

  // ---- the step ------------------------------------------------------------

  // Move every masked living player one cell, simultaneously. Fills `crashed`.
  function subStep(state, mask, crashed) {
    const players = state.players;
    const w = state.w;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (mask[i] && p.alive) p.dir = p.pendingDir;
    }
    const next = players.map(function (p, i) {
      return mask[i] && p.alive
        ? { x: p.x + DIRS[p.dir].x, y: p.y + DIRS[p.dir].y }
        : null;
    });
    const dead = players.map(function () { return false; });
    const phase = players.map(function () { return false; });
    const escape = players.map(function () { return false; });

    for (let i = 0; i < players.length; i++) {
      const n = next[i];
      if (!n) continue;
      const p = players[i];
      if (!inBounds(state, n.x, n.y)) {
        if (crossesBreach(state, p, n)) escape[i] = true;
        else dead[i] = true;
        continue;
      }
      const v = state.cells[n.y * w + n.x];
      if (v !== 0) {
        // Phase: through trails only, never the field, never too deep.
        if ((p.phasing || p.phaseArmed) && v !== FIELD && p.phaseCells < PHASE_MAX_CELLS) {
          phase[i] = true;
        } else {
          dead[i] = true;
        }
      }
    }
    // Head-to-head: same target cell, or swapping through each other, kills
    // both — phase does not protect from another rider.
    for (let i = 0; i < players.length; i++) {
      if (!next[i]) continue;
      for (let j = i + 1; j < players.length; j++) {
        if (!next[j]) continue;
        if (next[i].x === next[j].x && next[i].y === next[j].y) {
          dead[i] = dead[j] = true;
        }
        if (next[i].x === players[j].x && next[i].y === players[j].y &&
            next[j].x === players[i].x && next[j].y === players[i].y) {
          dead[i] = dead[j] = true;
        }
      }
      // Riding into a living rider who is not moving this sub-step (boost).
      for (let j = 0; j < players.length; j++) {
        if (j === i || next[j] || !players[j].alive) continue;
        if (next[i].x === players[j].x && next[i].y === players[j].y) dead[i] = true;
      }
    }

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const n = next[i];
      if (!p.alive || !n) continue;
      if (escape[i] && !dead[i]) {
        // Out through the tear: gone from the arena, no wreck, no point.
        p.alive = false;
        p.escaped = true;
        continue;
      }
      if (dead[i]) {
        p.alive = false;
        p.crashInto = n;
        crashed.push(i);
        continue;
      }
      p.x = n.x;
      p.y = n.y;
      p.travel++;
      if (phase[i]) {
        p.phasing = true;
        p.phaseArmed = false;
        p.phaseCells++;
        p.lastLaid = false;
        continue;
      }
      if (p.phasing) { p.phasing = false; p.phaseCells = 0; }
      // Lay the wall — unless this cell is a gap or inside the interference zone.
      const gapped = state.rules.gapEvery > 0 && p.travel % state.rules.gapEvery === 0;
      if (gapped || inZone(state, p.x, p.y)) {
        p.lastLaid = false;
      } else {
        state.cells[p.y * w + p.x] = i + 1;
        p.lastLaid = true;
      }
    }
  }

  // Overtime: the containment field eats the arena one ring at a time. The
  // breach corridor is never sealed — the tear stays an exit to the end.
  function inBreachCorridor(state, x, y) {
    const b = state.rules.breach;
    if (!b) return false;
    if (b.side === 0 || b.side === 2) return x >= b.lo && x <= b.hi;
    return y >= b.lo && y <= b.hi;
  }

  function consumeRing(state, r, crashed) {
    const w = state.w, h = state.h;
    for (let x = r; x < w - r; x++) {
      for (let y = r; y < h - r; y++) {
        if (x !== r && x !== w - 1 - r && y !== r && y !== h - 1 - r) continue;
        if (inBreachCorridor(state, x, y)) continue;
        const i = y * w + x;
        if (state.cells[i] === 0) state.cells[i] = FIELD;
      }
    }
    state.players.forEach(function (p, i) {
      if (!p.alive) return;
      if (inBreachCorridor(state, p.x, p.y)) return;
      if (p.x === r || p.x === w - 1 - r || p.y === r || p.y === h - 1 - r) {
        p.alive = false;
        p.crashInto = { x: p.x, y: p.y };
        crashed.push(i);
      }
    });
  }

  // Advance one tick. opts.boost: array of booleans — a boosted living player
  // moves a second cell after the simultaneous move. Returns crashed indices.
  function step(state, opts) {
    const players = state.players;
    const crashed = [];
    subStep(state, players.map(function (p) { return p.alive; }), crashed);
    const boost = opts && opts.boost;
    if (boost) {
      for (let i = 0; i < players.length; i++) {
        if (!boost[i] || !players[i].alive) continue;
        const mask = players.map(function (_, k) { return k === i; });
        subStep(state, mask, crashed);
      }
    }
    state.tick++;
    const ot = state.rules.overtime;
    if (ot) {
      const maxRings = Math.max(0, Math.floor(Math.min(state.w, state.h) / 2) - 3);
      const due = state.tick >= ot.start
        ? Math.min(maxRings, 1 + Math.floor((state.tick - ot.start) / ot.every))
        : 0;
      while (state.shrink < due) {
        consumeRing(state, state.shrink, crashed);
        state.shrink++;
      }
    }
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

  // Every CPU measures itself against the human; the human's AI mirror (the
  // sim's AI-vs-AI games) measures against player 1.
  function rivalIndex(meIdx) { return meIdx === 0 ? 1 : 0; }

  // Voronoi territory: with my head hypothetically at (sx, sy), how many empty
  // cells do I reach strictly sooner than the rival (half credit for ties)?
  function voronoiScore(state, meIdx, sx, sy) {
    const opp = state.players[rivalIndex(meIdx)];
    const i = sy * state.w + sx;
    const prev = state.cells[i];
    state.cells[i] = meIdx + 1; // occupy candidate so the rival can't path through it
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
    const opp = state.players[rivalIndex(idx)];
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
    FIELD: FIELD,
    createGame: createGame,
    resetRound: resetRound,
    setDirection: setDirection,
    reviveAfterCrash: reviveAfterCrash,
    armPhase: armPhase,
    zoneAt: zoneAt,
    inZone: inZone,
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
