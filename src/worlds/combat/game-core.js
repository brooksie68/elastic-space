// Combat — pure game core. No DOM, no canvas, no timers, no Math.random.
// Loaded by the browser (classic script) AND by the Node sim (tmp/combat/sim.mjs).
// Keep it pure or the sim lies.
(function () {
  // Field is 240 x 135 world units, origin top-left, y down, angles in radians
  // (0 = +x). All walls are axis-aligned rects [x, y, w, h].
  const W = 240, H = 135, BORDER = 4;
  const TANK_R = 4.2, TANK_SPEED = 30, TANK_ROT = 3.4;
  const SHELL_SPEED = 95, SHELL_R = 0.9, SHELL_RANGE = 150, MUZZLE = 6.4;
  const COOLDOWN = 0.3;
  const SPIN_TIME = 1.15, SPIN_RATE = 13;
  const BOUNCE_MAX = 3, BOUNCE_RANGE = 260;
  const CELL = 5; // AI grid

  const BORDER_WALLS = [
    [0, 0, W, BORDER],
    [0, H - BORDER, W, BORDER],
    [0, 0, BORDER, H],
    [W - BORDER, 0, BORDER, H],
  ];

  // Six interior layouts — things to sneak around and move behind.
  // All mirror- or point-symmetric so neither side has the better half.
  // Mazes 1 and 2 are decoded from the Combat (1977) ROM disassembly's
  // playfield bitmaps (PF0_0/PF1_0/PF2_0 = complex, PF1_2/PF2_2 = simple):
  // 20x12 half-field cells, mirrored horizontally AND vertically by the
  // kernel (EOR #$F8 scanline reflection). One 2600 cell = 6u x 135/23u.
  const MAZES = [
    { name: "the 2600", walls: [
      // center nubs off the top/bottom borders (cols 19-20, rows 1-2)
      [114, 5.87, 12, 11.74], [114, 117.39, 12, 11.74],
      // four corner baffles (cols 6-8 / 31-33, rows 4 / 18)
      [36, 23.48, 18, 5.87], [186, 23.48, 18, 5.87],
      [36, 105.65, 18, 5.87], [186, 105.65, 18, 5.87],
      // four L-hooks flanking center (cols 14-16 + tick, rows 6-7 / 15-16)
      [84, 35.22, 18, 5.87], [84, 41.09, 6, 5.87],
      [138, 35.22, 18, 5.87], [150, 41.09, 6, 5.87],
      [84, 93.91, 18, 5.87], [84, 88.04, 6, 5.87],
      [138, 93.91, 18, 5.87], [150, 88.04, 6, 5.87],
      // side walls with feet (col 6 / 33, rows 8-14; feet col 5 / 34)
      [36, 46.96, 6, 41.09], [198, 46.96, 6, 41.09],
      [30, 46.96, 6, 5.87], [204, 46.96, 6, 5.87],
      [30, 82.17, 6, 5.87], [204, 82.17, 6, 5.87],
      // mid-height dashes (cols 10-11 / 28-29, row 11)
      [60, 64.57, 12, 5.87], [168, 64.57, 12, 5.87],
    ] },
    { name: "tank pong", walls: [
      // split center wall (cols 19-20, rows 4-7 / 15-18 — gap at mid-height)
      [114, 23.48, 12, 23.48], [114, 88.04, 12, 23.48],
      // side walls with feet (col 6 / 33, rows 9-13; feet col 5 / 34)
      [36, 52.83, 6, 29.35], [198, 52.83, 6, 29.35],
      [30, 52.83, 6, 5.87], [204, 52.83, 6, 5.87],
      [30, 76.3, 6, 5.87], [204, 76.3, 6, 5.87],
      // long mid-height dashes (cols 11-14 / 25-28, row 11)
      [66, 64.57, 24, 5.87], [150, 64.57, 24, 5.87],
    ] },
    { name: "crossfire", walls: [
      [116, 47, 8, 41], [98, 63.5, 44, 8],
      [40, 28, 26, 7], [40, 28, 7, 20],
      [174, 28, 26, 7], [193, 28, 7, 20],
      [40, 100, 26, 7], [40, 87, 7, 20],
      [174, 100, 26, 7], [193, 87, 7, 20],
      [66, 63.5, 18, 8], [156, 63.5, 18, 8],
    ] },
    { name: "baffles", walls: [
      [4, 36, 56, 7], [180, 92, 56, 7],
      [180, 36, 56, 7], [4, 92, 56, 7],
      [60, 64, 44, 7], [136, 64, 44, 7],
      [88, 28, 7, 16], [145, 91, 7, 16],
      [145, 28, 7, 16], [88, 91, 7, 16],
    ] },
    { name: "chambers", walls: [
      [40, 30, 34, 7], [40, 30, 7, 26],
      [166, 30, 34, 7], [193, 30, 7, 26],
      [40, 98, 34, 7], [40, 79, 7, 26],
      [166, 98, 34, 7], [193, 79, 7, 26],
      [104, 63.5, 10, 8], [126, 63.5, 10, 8],
    ] },
    { name: "the ring", walls: [
      [104, 26, 32, 7], [104, 102, 32, 7],
      [62, 54, 7, 27], [171, 54, 7, 27],
      [116, 4, 8, 8], [116, 123, 8, 8],
      [34, 24, 16, 6], [190, 24, 16, 6],
      [34, 105, 16, 6], [190, 105, 16, 6],
    ] },
  ];

  const SPAWNS = [
    { x: 26, y: H / 2, a: 0 },
    { x: W - 26, y: H / 2, a: Math.PI },
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function angDiff(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  // ---- setup -----------------------------------------------------------------

  function buildGrid(walls) {
    const cw = Math.floor(W / CELL), ch = Math.floor(H / CELL);
    const cells = new Uint8Array(cw * ch); // 1 = blocked for a tank center
    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
        for (const w of walls) {
          if (px > w[0] - TANK_R && px < w[0] + w[2] + TANK_R &&
              py > w[1] - TANK_R && py < w[1] + w[3] + TANK_R) {
            cells[cy * cw + cx] = 1;
            break;
          }
        }
      }
    }
    return { cw, ch, cells };
  }

  function createGame(opts) {
    opts = opts || {};
    const mazeIdx = clamp(opts.maze | 0, 0, MAZES.length - 1);
    const walls = BORDER_WALLS.concat(MAZES[mazeIdx].walls);
    const state = {
      W: W, H: H,
      maze: mazeIdx,
      walls: walls,
      grid: buildGrid(walls),
      speed: opts.speed || 1,
      bounce: !!opts.bounce,
      time: 0,
      tanks: SPAWNS.map(function (s) {
        return {
          x: s.x, y: s.y, a: s.a, vx: 0, vy: 0,
          spin: 0, spinDir: 1, kx: 0, ky: 0,
          cool: 0, ai: null,
        };
      }),
      shells: [],
    };
    return state;
  }

  // ---- geometry helpers ---------------------------------------------------------

  function circleWallPush(t, w, r) {
    const cx = clamp(t.x, w[0], w[0] + w[2]);
    const cy = clamp(t.y, w[1], w[1] + w[3]);
    const dx = t.x - cx, dy = t.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;
    if (d2 === 0) {
      // center inside the wall: exit along the thinnest side
      const l = t.x - w[0], rt = w[0] + w[2] - t.x;
      const tp = t.y - w[1], b = w[1] + w[3] - t.y;
      const m = Math.min(l, rt, tp, b);
      if (m === l) t.x = w[0] - r;
      else if (m === rt) t.x = w[0] + w[2] + r;
      else if (m === tp) t.y = w[1] - r;
      else t.y = w[1] + w[3] + r;
    } else {
      const d = Math.sqrt(d2);
      t.x = cx + (dx / d) * r;
      t.y = cy + (dy / d) * r;
    }
    return true;
  }

  function collideWalls(state, t) {
    // two passes so corners settle
    for (let pass = 0; pass < 2; pass++) {
      let hit = false;
      for (const w of state.walls) hit = circleWallPush(t, w, TANK_R) || hit;
      if (!hit) break;
    }
  }

  function pointInWall(x, y, w, pad) {
    return x > w[0] - pad && x < w[0] + w[2] + pad &&
           y > w[1] - pad && y < w[1] + w[3] + pad;
  }

  // segment vs AABB (slab test)
  function segHitsRect(x0, y0, x1, y1, w) {
    const dx = x1 - x0, dy = y1 - y0;
    let tmin = 0, tmax = 1;
    for (let axis = 0; axis < 2; axis++) {
      const p = axis === 0 ? x0 : y0;
      const d = axis === 0 ? dx : dy;
      const lo = axis === 0 ? w[0] : w[1];
      const hi = axis === 0 ? w[0] + w[2] : w[1] + w[3];
      if (Math.abs(d) < 1e-9) {
        if (p < lo || p > hi) return false;
      } else {
        let t1 = (lo - p) / d, t2 = (hi - p) / d;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }
    }
    return true;
  }

  // pad > 0 inflates the walls — use the shell radius when asking "can I SHOOT
  // him", or a corner-grazing center line reads clear while every shell clips.
  function hasLOS(state, x0, y0, x1, y1, pad) {
    pad = pad || 0;
    for (const w of state.walls) {
      const r = pad ? [w[0] - pad, w[1] - pad, w[2] + pad * 2, w[3] + pad * 2] : w;
      if (segHitsRect(x0, y0, x1, y1, r)) return false;
    }
    return true;
  }

  // ---- stepping ---------------------------------------------------------------------

  // inputs: [{ thrust, turn (-1/0/1), fire }, ...] — one per tank.
  // Returns events: {type:'fire'|'hit'|'wallHit'|'bounce', ...}
  function step(state, dt, inputs) {
    const events = [];
    state.time += dt;
    for (let i = 0; i < 2; i++) {
      const t = state.tanks[i];
      const inp = inputs && inputs[i] ? inputs[i] : {};
      const px = t.x, py = t.y;
      if (t.spin > 0) {
        t.spin = Math.max(0, t.spin - dt);
        t.a += SPIN_RATE * (t.spin / SPIN_TIME + 0.15) * dt * t.spinDir;
        t.x += t.kx * dt;
        t.y += t.ky * dt;
        const damp = Math.pow(0.03, dt);
        t.kx *= damp;
        t.ky *= damp;
      } else {
        if (inp.turn) t.a += TANK_ROT * clamp(inp.turn, -1, 1) * dt;
        if (inp.thrust) {
          t.x += Math.cos(t.a) * TANK_SPEED * state.speed * dt;
          t.y += Math.sin(t.a) * TANK_SPEED * state.speed * dt;
        }
        if (inp.fire && t.cool <= 0 && !state.shells.some(function (s) { return s.owner === i; })) {
          state.shells.push({
            x: t.x + Math.cos(t.a) * MUZZLE,
            y: t.y + Math.sin(t.a) * MUZZLE,
            vx: Math.cos(t.a) * SHELL_SPEED,
            vy: Math.sin(t.a) * SHELL_SPEED,
            owner: i, dist: 0, bounces: 0,
          });
          t.cool = COOLDOWN;
          events.push({ type: "fire", who: i });
        }
      }
      t.cool = Math.max(0, t.cool - dt);
      collideWalls(state, t);
      t.vx = (t.x - px) / dt;
      t.vy = (t.y - py) / dt;
    }

    // tank vs tank: push apart evenly
    const a = state.tanks[0], b = state.tanks[1];
    {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy, min = TANK_R * 2;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2), push = (min - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        collideWalls(state, a);
        collideWalls(state, b);
      }
    }

    // shells
    for (let si = state.shells.length - 1; si >= 0; si--) {
      const s = state.shells[si];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.dist += SHELL_SPEED * dt;
      const range = state.bounce ? BOUNCE_RANGE : SHELL_RANGE;
      let dead = s.dist > range;
      // walls
      if (!dead) {
        for (const w of state.walls) {
          if (!pointInWall(s.x, s.y, w, SHELL_R)) continue;
          if (state.bounce && s.bounces < BOUNCE_MAX) {
            // reflect off the nearer axis
            const l = s.x - (w[0] - SHELL_R), r = (w[0] + w[2] + SHELL_R) - s.x;
            const tp = s.y - (w[1] - SHELL_R), bo = (w[1] + w[3] + SHELL_R) - s.y;
            const m = Math.min(l, r, tp, bo);
            if (m === l) { s.x = w[0] - SHELL_R; s.vx = -Math.abs(s.vx); }
            else if (m === r) { s.x = w[0] + w[2] + SHELL_R; s.vx = Math.abs(s.vx); }
            else if (m === tp) { s.y = w[1] - SHELL_R; s.vy = -Math.abs(s.vy); }
            else { s.y = w[1] + w[3] + SHELL_R; s.vy = Math.abs(s.vy); }
            s.bounces++;
            events.push({ type: "bounce", x: s.x, y: s.y });
          } else {
            dead = true;
            events.push({ type: "wallHit", x: s.x, y: s.y });
          }
          break;
        }
      }
      // tanks
      if (!dead) {
        for (let ti = 0; ti < 2; ti++) {
          if (ti === s.owner) continue;
          const t = state.tanks[ti];
          if (t.spin > 0) continue; // spinning tanks are invulnerable
          const dx = t.x - s.x, dy = t.y - s.y;
          const rr = TANK_R + SHELL_R;
          if (dx * dx + dy * dy < rr * rr) {
            t.spin = SPIN_TIME;
            // spin away from the shell's side of approach
            t.spinDir = (s.vx * dy - s.vy * dx) > 0 ? -1 : 1;
            t.kx = s.vx * 0.22;
            t.ky = s.vy * 0.22;
            dead = true;
            events.push({ type: "hit", shooter: s.owner, victim: ti, x: t.x, y: t.y });
            break;
          }
        }
      }
      if (dead) state.shells.splice(si, 1);
    }
    return events;
  }

  // After a point, both tanks return to their corners (James, 2026-07-25).
  // The page calls this once the victim's spin has played out.
  function resetPositions(state) {
    state.shells.length = 0;
    for (let i = 0; i < 2; i++) {
      const t = state.tanks[i];
      const s = SPAWNS[i];
      t.x = s.x; t.y = s.y; t.a = s.a;
      t.vx = 0; t.vy = 0;
      t.spin = 0; t.kx = 0; t.ky = 0;
      t.cool = 0; t.ai = null;
    }
  }

  // ---- pathfinding ----------------------------------------------------------------------

  function cellOf(state, x, y) {
    const g = state.grid;
    return {
      cx: clamp(Math.floor(x / CELL), 0, g.cw - 1),
      cy: clamp(Math.floor(y / CELL), 0, g.ch - 1),
    };
  }

  function nearestFree(state, cx, cy) {
    const g = state.grid;
    if (!g.cells[cy * g.cw + cx]) return { cx: cx, cy: cy };
    for (let r = 1; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= g.cw || ny >= g.ch) continue;
          if (!g.cells[ny * g.cw + nx]) return { cx: nx, cy: ny };
        }
      }
    }
    return { cx: cx, cy: cy };
  }

  // BFS path from world (x0,y0) to (x1,y1); returns array of waypoints
  // (world coords, goal last) or null if unreachable.
  function findPath(state, x0, y0, x1, y1) {
    const g = state.grid;
    const from = nearestFree(state, cellOf(state, x0, y0).cx, cellOf(state, x0, y0).cy);
    const to = nearestFree(state, cellOf(state, x1, y1).cx, cellOf(state, x1, y1).cy);
    const prev = new Int32Array(g.cw * g.ch).fill(-2);
    const qx = new Int32Array(g.cw * g.ch);
    const qy = new Int32Array(g.cw * g.ch);
    let head = 0, tail = 0;
    prev[from.cy * g.cw + from.cx] = -1;
    qx[tail] = from.cx; qy[tail] = from.cy; tail++;
    const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let found = from.cx === to.cx && from.cy === to.cy;
    while (head < tail && !found) {
      const cx = qx[head], cy = qy[head]; head++;
      for (const d of DIRS4) {
        const nx = cx + d[0], ny = cy + d[1];
        if (nx < 0 || ny < 0 || nx >= g.cw || ny >= g.ch) continue;
        const i = ny * g.cw + nx;
        if (prev[i] !== -2 || g.cells[i]) continue;
        prev[i] = cy * g.cw + cx;
        if (nx === to.cx && ny === to.cy) { found = true; break; }
        qx[tail] = nx; qy[tail] = ny; tail++;
      }
    }
    if (!found) return null;
    const path = [];
    let cur = to.cy * g.cw + to.cx;
    while (cur !== -1 && cur !== -2) {
      path.push({ x: (cur % g.cw) * CELL + CELL / 2, y: Math.floor(cur / g.cw) * CELL + CELL / 2 });
      cur = prev[cur];
    }
    path.reverse();
    return path;
  }

  // ---- AI ----------------------------------------------------------------------------------

  const AI_PARAMS = {
    1: { tol: 0.24, lead: 0, engage: 105, repath: 0.6, hesit: 0.4, dodge: false, closeTo: 85 },
    2: { tol: 0.13, lead: 0, engage: 130, repath: 0.35, hesit: 0.12, dodge: false, closeTo: 60 },
    3: { tol: 0.085, lead: 1, engage: 150, repath: 0.25, hesit: 0, dodge: true, closeTo: 55 },
  };

  // Returns an input object for tank idx. level 1..3, rng: () => [0,1).
  function aiThink(state, idx, level, rng, dt) {
    const me = state.tanks[idx];
    const foe = state.tanks[1 - idx];
    const inp = { thrust: false, turn: 0, fire: false };
    if (me.spin > 0) return inp;
    const P = AI_PARAMS[level] || AI_PARAMS[2];
    const ai = me.ai || (me.ai = { repath: 0, path: null, hold: 0 });
    ai.repath -= dt;
    ai.hold = Math.max(0, (ai.hold || 0) - dt);

    const dx = foe.x - me.x, dy = foe.y - me.y;
    const dist = Math.hypot(dx, dy);
    const los = hasLOS(state, me.x, me.y, foe.x, foe.y, SHELL_R + 0.5);

    // aiming solution (used both for normal fire and snap shots while dodging)
    let aimErr = null;
    if (los && foe.spin <= 0) {
      let tx = foe.x, ty = foe.y;
      if (P.lead) {
        const tt = dist / SHELL_SPEED;
        tx += (foe.vx || 0) * tt;
        ty += (foe.vy || 0) * tt;
      }
      aimErr = angDiff(Math.atan2(ty - me.y, tx - me.x) - me.a);
    }
    const canFire = me.cool <= 0 &&
      !state.shells.some(function (s) { return s.owner === idx; });
    // close range forgives a wider aim cone — the target subtends more arc
    const effTol = P.tol * clamp(60 / Math.max(dist, 1), 1, 3);

    // dodge incoming fire (ace only) — but keep shooting while sidestepping
    if (P.dodge) {
      for (const s of state.shells) {
        if (s.owner === idx) continue;
        const rx = me.x - s.x, ry = me.y - s.y;
        const sv = Math.hypot(s.vx, s.vy);
        const tClose = (rx * s.vx + ry * s.vy) / (sv * sv);
        if (tClose < 0 || tClose > 0.8) continue;
        const cx = s.x + s.vx * tClose - me.x;
        const cy = s.y + s.vy * tClose - me.y;
        if (Math.hypot(cx, cy) > TANK_R + 2) continue; // would actually hit
        // steer perpendicular to the shell's heading, away from its line
        const side = (s.vx * ry - s.vy * rx) > 0 ? 1 : -1;
        const want = Math.atan2(s.vy, s.vx) + side * Math.PI / 2;
        const err = angDiff(want - me.a);
        inp.turn = err > 0 ? 1 : -1;
        inp.thrust = Math.abs(err) < 1.2;
        if (aimErr !== null && Math.abs(aimErr) < effTol * 1.5 && canFire && dist < P.engage) {
          inp.fire = true; // snap shot on the way out
        }
        return inp;
      }
    }

    if (aimErr !== null && dist < P.engage) {
      inp.turn = aimErr > 0.02 ? 1 : aimErr < -0.02 ? -1 : 0;
      if (Math.abs(aimErr) < effTol && canFire) {
        if (ai.hold <= 0) {
          if (rng() < P.hesit) ai.hold = 0.2 + rng() * 0.35; // real trigger lag
          else inp.fire = true;
        }
      }
      if (dist > P.closeTo && Math.abs(aimErr) < 0.55) inp.thrust = true;
      return inp;
    }

    // no line of sight (or foe is spinning): hunt via the grid
    if (ai.repath <= 0 || !ai.path || ai.path.length === 0) {
      ai.path = findPath(state, me.x, me.y, foe.x, foe.y);
      ai.repath = P.repath;
    }
    if (ai.path && ai.path.length) {
      while (ai.path.length && Math.hypot(ai.path[0].x - me.x, ai.path[0].y - me.y) < 6) {
        ai.path.shift();
      }
      const wp = ai.path[0] || { x: foe.x, y: foe.y };
      const want = Math.atan2(wp.y - me.y, wp.x - me.x);
      const err = angDiff(want - me.a);
      inp.turn = err > 0.03 ? 1 : err < -0.03 ? -1 : 0;
      inp.thrust = Math.abs(err) < 0.7;
    } else {
      // unreachable (shouldn't happen in shipped mazes): wander
      inp.turn = rng() < 0.5 ? 1 : -1;
      inp.thrust = true;
    }
    return inp;
  }

  globalThis.CombatCore = {
    W: W, H: H, BORDER: BORDER, CELL: CELL,
    TANK_R: TANK_R, TANK_SPEED: TANK_SPEED, TANK_ROT: TANK_ROT,
    SHELL_SPEED: SHELL_SPEED, SHELL_R: SHELL_R, SHELL_RANGE: SHELL_RANGE,
    MUZZLE: MUZZLE, COOLDOWN: COOLDOWN, SPIN_TIME: SPIN_TIME,
    BOUNCE_MAX: BOUNCE_MAX, BOUNCE_RANGE: BOUNCE_RANGE,
    MAZES: MAZES, SPAWNS: SPAWNS, BORDER_WALLS: BORDER_WALLS,
    createGame: createGame,
    resetPositions: resetPositions,
    step: step,
    hasLOS: hasLOS,
    segHitsRect: segHitsRect,
    findPath: findPath,
    cellOf: cellOf,
    aiThink: aiThink,
    angDiff: angDiff,
  };
})();
