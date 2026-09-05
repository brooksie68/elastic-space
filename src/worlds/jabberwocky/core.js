// Jabberwocky — the pure core. No DOM, no canvas, no audio: mazes, the player, goons, the rifle's
// roll, every projectile kind, scars, the boss. world.js drives it; tmp/jabberwocky/sim.mjs asserts on it.
// Units: one maze cell = 1. Angles in radians, +x east, +y south (screen down), angle 0 = +x.
(function () {
  const T = globalThis.JABBERWOCKY_GAGS;
  const GAGS = T.GAGS, OUTCOMES = T.OUTCOMES, SCARS = T.SCARS;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- defaults (the PLAY tab)
  const DEFAULTS = {
    odds: { dispatch: 60, weird: 25, dud: 10, backfire: 5 },
    goonMul: 1,          // goon count multiplier
    goonSpeed: 1,        // goon speed multiplier
    moveSpeed: 2.0,      // player cells per second (a cell is 2.6 m in the renderer)
    turnSpeed: 2.4,      // keyboard turn, radians per second
    fireCool: 0.9,       // seconds between pulls
    revealDelay: 0.28,   // the beat between the pull and the gag
    damageMul: 1,        // damage to the player
    bossFire: 2.4,       // seconds between the boss's pulls
    seed: '',
    forceGag: '',        // a gag id to fire every time (the lab / the configuration panel)
    startLevel: 1,
  };

  // speeds in cells/s (a cell renders at 2.6 m); h = height in metres for the rig
  const GOON_TYPES = {
    ghoul:      { name: 'GHOUL',    speed: 1.55, reach: 0.95, dmg: 8,  atk: 1.1, notice: 7, size: 1.0,  r: 0.3,  h: 1.8 },
    brute:      { name: 'BRUTE',    speed: 1.05, reach: 1.15, dmg: 14, atk: 1.6, notice: 6, size: 1.3,  r: 0.4,  h: 2.6 },
    ratling:    { name: 'RATLING',  speed: 2.4,  reach: 0.7,  dmg: 4,  atk: 0.7, notice: 8, size: 0.7,  r: 0.22, h: 1.1 },
    cultist:    { name: 'CULTIST',  speed: 1.3,  reach: 0.9,  dmg: 9,  atk: 2.2, notice: 9, size: 1.0,  r: 0.3,  h: 1.8, ranged: 6.5 },
    stalker:    { name: 'STALKER',  speed: 1.2,  reach: 1.8,  dmg: 12, atk: 1.5, notice: 8, size: 1.55, r: 0.3,  h: 3.0 },
    jabberwock: { name: 'THE JABBERWOCK', speed: 1.4, reach: 1.4, dmg: 12, atk: 1.6, notice: 99, size: 2.2, r: 0.55, h: 4.5 },
  };

  const LEVELS = [
    { n: 1, name: 'THE GATE',        w: 15, h: 15, goons: 6,  loops: 4,  rooms: 2, theme: 0, mix: { ghoul: 6, ratling: 2 } },
    { n: 2, name: 'THE CATACOMBS',   w: 19, h: 19, goons: 10, loops: 6,  rooms: 3, theme: 1, mix: { ghoul: 5, ratling: 3, cultist: 2 } },
    { n: 3, name: 'THE MEAT LOCKER', w: 23, h: 23, goons: 14, loops: 8,  rooms: 4, theme: 2, mix: { ghoul: 4, ratling: 3, cultist: 2, brute: 3 } },
    { n: 4, name: 'THE DEEP',        w: 27, h: 27, goons: 18, loops: 10, rooms: 5, theme: 3, mix: { ghoul: 3, ratling: 3, cultist: 3, brute: 3, stalker: 3 } },
    { n: 5, name: 'THE MIDDLE',      w: 21, h: 21, goons: 6,  loops: 0,  rooms: 0, theme: 4, arena: true, mix: { ghoul: 2, ratling: 2, cultist: 1, brute: 1 } },
  ];

  // cell values
  const OPEN = 0, WALL_A = 1, WALL_B = 2, WALL_C = 3, WALL_D = 4, DOOR = 5, DRIFT = 6;

  // ---------------------------------------------------------------- rng
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

  // ---------------------------------------------------------------- maze
  // Recursive backtracker on odd cells, then a few walls knocked out for loops.
  function makeMaze(w, h, rand, loops) {
    const g = new Uint8Array(w * h).fill(1);
    const at = (x, y) => y * w + x;
    const stack = [[1, 1]];
    g[at(1, 1)] = 0;
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const opts = [];
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && g[at(nx, ny)] === 1) opts.push([dx, dy]);
      }
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy] = pick(rand, opts);
      g[at(x + dx / 2, y + dy / 2)] = 0;
      g[at(x + dx, y + dy)] = 0;
      stack.push([x + dx, y + dy]);
    }
    let tries = 0;
    for (let k = 0; k < loops && tries < 500; tries++) {
      const x = 1 + Math.floor(rand() * (w - 2)), y = 1 + Math.floor(rand() * (h - 2));
      if (g[at(x, y)] !== 1) continue;
      const hz = g[at(x - 1, y)] === 0 && g[at(x + 1, y)] === 0;
      const vt = g[at(x, y - 1)] === 0 && g[at(x, y + 1)] === 0;
      if (hz !== vt) { g[at(x, y)] = 0; k++; }
    }
    return g;
  }

  function makeArena(w, h, rand) {
    const g = new Uint8Array(w * h).fill(0);
    const at = (x, y) => y * w + x;
    for (let x = 0; x < w; x++) { g[at(x, 0)] = 1; g[at(x, h - 1)] = 1; }
    for (let y = 0; y < h; y++) { g[at(0, y)] = 1; g[at(w - 1, y)] = 1; }
    // a ring of pillars, a few broken
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    for (let y = 3; y < h - 3; y += 3) for (let x = 3; x < w - 3; x += 3) {
      if (Math.abs(x - cx) < 2 && Math.abs(y - cy) < 2) continue;
      if (rand() < 0.75) g[at(x, y)] = 1;
    }
    return g;
  }

  function bfs(level, sx, sy) {
    const { w, h, map } = level;
    const dist = new Int32Array(w * h).fill(-1);
    const q = [sy * w + sx];
    dist[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % w, y = (c - x) / w, d = dist[c];
      const nb = [c + 1, c - 1, c + w, c - w];
      for (const n of nb) {
        const nx = n % w, ny = (n - nx) / w;
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        if (n < 0 || n >= w * h || dist[n] !== -1) continue;
        if (map[n] !== OPEN) continue;
        dist[n] = d + 1;
        q.push(n);
      }
    }
    return dist;
  }
  function pathFrom(level, dist, tx, ty) {
    // walk downhill from target to the source; returns cells source→target (excluding source)
    const { w, map } = level;
    let c = ty * w + tx;
    if (dist[c] < 0) return null;
    const path = [];
    while (dist[c] > 0) {
      path.push(c);
      const x = c % w, y = (c - x) / w;
      const nb = [c + 1, c - 1, c + w, c - w];
      let best = -1;
      for (const n of nb) {
        const nx = n % w, ny = (n - nx) / w;
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        if (n >= 0 && n < map.length && dist[n] === dist[c] - 1) { best = n; break; }
      }
      if (best < 0) return null;
      c = best;
    }
    return path.reverse();
  }
  // BFS from (fx,fy) then the path to (tx,ty)
  function bfsPath(level, fx, fy, tx, ty) {
    const d = bfs(level, fx, fy);
    return pathFrom(level, d, tx, ty);
  }
  const degree = (level, x, y) => {
    const { w, map } = level;
    let n = 0;
    if (map[y * w + x + 1] === OPEN) n++;
    if (map[y * w + x - 1] === OPEN) n++;
    if (map[(y + 1) * w + x] === OPEN) n++;
    if (map[(y - 1) * w + x] === OPEN) n++;
    return n;
  };

  function buildLevel(n, seedStr, opts) {
    const def = LEVELS[n - 1];
    const rand = mulberry(hashStr(seedStr + ':' + n));
    const w = def.w, h = def.h;
    const map = def.arena ? makeArena(w, h, rand) : makeMaze(w, h, rand, def.loops);
    const level = { n, name: def.name, w, h, map, theme: def.theme, arena: !!def.arena, spawn: null, key: null, door: null, driftDoors: [], goonSpawns: [], bossSpawn: null, tall: new Uint8Array(w * h), rooms: [] };
    const at = (x, y) => y * w + x;
    // rooms: open chambers carved into the maze with a tall ceiling; the arena is one big hall
    if (def.arena) level.tall.fill(1); else carveRooms(level, def.rooms || 0, rand);
    // wall variants: mostly A, some B/C, rare D
    for (let i = 0; i < map.length; i++) if (map[i] === 1) {
      const r = rand();
      map[i] = r < 0.62 ? WALL_A : r < 0.82 ? WALL_B : r < 0.95 ? WALL_C : WALL_D;
    }
    const open = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (map[at(x, y)] === OPEN) open.push([x, y]);

    if (def.arena) {
      level.spawn = { x: 1.5, y: h - 1.5, a: -Math.PI / 4 };
      level.bossSpawn = { x: w / 2, y: h / 2 };
      // drift doors: three on the walls, away from the spawn corner
      const walls = [[Math.floor(w / 2), 0, 'n'], [w - 1, Math.floor(h / 2), 'e'], [Math.floor(w / 3), h - 1, 's']];
      for (const [x, y, side] of walls) { map[at(x, y)] = DRIFT; level.driftDoors.push({ x, y, side }); }
      const far = open.filter(([x, y]) => Math.hypot(x - 1, y - (h - 2)) > 6 && Math.hypot(x - w / 2, y - h / 2) > 3);
      for (let i = 0; i < def.goons && far.length; i++) {
        const c = far.splice(Math.floor(rand() * far.length), 1)[0];
        level.goonSpawns.push({ x: c[0] + 0.5, y: c[1] + 0.5, type: weightedType(rand, def.mix) });
      }
      return level;
    }

    // spawn at (1,1); face the open neighbour
    level.spawn = { x: 1.5, y: 1.5, a: map[at(2, 1)] === OPEN ? 0 : Math.PI / 2 };
    const dS = bfs(level, 1, 1);
    // key: the farthest dead end from the spawn
    let best = null, bestD = -1;
    for (const [x, y] of open) {
      const d = dS[at(x, y)];
      const dead = degree(level, x, y) === 1;
      const score = d + (dead ? 6 : 0);
      if (d >= 0 && score > bestD) { bestD = score; best = [x, y]; }
    }
    level.key = { x: best[0] + 0.5, y: best[1] + 0.5 };
    const dK = bfs(level, best[0], best[1]);
    // exit door: a boundary wall next to an open cell far from both spawn and key
    let door = null, doorScore = -1;
    for (const [x, y] of open) {
      const edge = x === 1 ? [0, y, 'w'] : x === w - 2 ? [w - 1, y, 'e'] : y === 1 ? [x, 0, 'n'] : y === h - 2 ? [x, h - 1, 's'] : null;
      if (!edge) continue;
      const s = Math.min(dS[at(x, y)], dK[at(x, y)] * 0.8);
      if (s > doorScore) { doorScore = s; door = { x: edge[0], y: edge[1], side: edge[2], cx: x, cy: y }; }
    }
    map[at(door.x, door.y)] = DOOR;
    level.door = door;
    // the critical path: spawn→key→door
    const crit = new Set();
    const p1 = pathFrom(level, dS, best[0], best[1]) || [];
    const p2 = pathFrom(level, dK, door.cx, door.cy) || [];
    for (const c of p1) crit.add(c);
    for (const c of p2) crit.add(c);
    crit.add(at(1, 1));
    // drift doors: three boundary walls next to dead ends off the critical path
    // strict first (dead ends, off the critical path, clear of key/door/spawn), then relaxed
    let cands = [];
    for (let relax = 0; relax < 4 && cands.length < 3; relax++) {
      cands = [];
      for (const [x, y] of open) {
        if (relax < 2 && crit.has(at(x, y))) continue;
        if (relax < 1 && degree(level, x, y) !== 1) continue;
        const edge = x === 1 ? [0, y, 'w'] : x === w - 2 ? [w - 1, y, 'e'] : y === 1 ? [x, 0, 'n'] : y === h - 2 ? [x, h - 1, 's'] : null;
        if (!edge) continue;
        if (edge[0] === door.x && edge[1] === door.y) continue;
        const clear = relax < 3 ? 3 : 1.5;
        if (Math.hypot(x - best[0], y - best[1]) < clear || Math.hypot(x - door.cx, y - door.cy) < clear || Math.hypot(x - 1, y - 1) < clear) continue;
        cands.push({ x: edge[0], y: edge[1], side: edge[2], cx: x, cy: y });
      }
    }
    // spread them: greedy farthest-apart
    while (level.driftDoors.length < 3 && cands.length) {
      let ci = 0;
      if (level.driftDoors.length) {
        let bestSep = -1;
        cands.forEach((c, i) => {
          const sep = Math.min(...level.driftDoors.map((d) => Math.hypot(c.x - d.x, c.y - d.y)));
          if (sep > bestSep) { bestSep = sep; ci = i; }
        });
      } else ci = Math.floor(rand() * cands.length);
      const c = cands.splice(ci, 1)[0];
      map[at(c.x, c.y)] = DRIFT;
      level.driftDoors.push(c);
    }
    // goons: open cells at least 4 steps from the spawn, weighted by depth so the far maze is busier
    const count = Math.max(1, Math.round(def.goons * (opts.goonMul || 1)));
    const pool = open.filter(([x, y]) => dS[at(x, y)] >= 4 && !(x === best[0] && y === best[1]));
    for (let i = 0; i < count && pool.length; i++) {
      const c = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      level.goonSpawns.push({ x: c[0] + 0.5, y: c[1] + 0.5, type: weightedType(rand, def.mix) });
    }
    return level;
  }
  // carve k rooms (3x3 / 5x3 / 5x5 cells) at odd-aligned spots, never over the spawn corner, never touching
  function carveRooms(level, k, rand) {
    const { w, h, map, tall } = level;
    const at = (x, y) => y * w + x;
    let placed = 0;
    for (let tries = 0; tries < 80 && placed < k; tries++) {
      const rw = pick(rand, [3, 5, 5]), rh = pick(rand, [3, 3, 5]);
      const x0 = 1 + 2 * Math.floor(rand() * ((w - 1 - rw) / 2)), y0 = 1 + 2 * Math.floor(rand() * ((h - 1 - rh) / 2));
      if (x0 + rw > w - 1 || y0 + rh > h - 1) continue;
      if (x0 <= 3 && y0 <= 3) continue;                       // not on the spawn
      let clash = false;
      for (const r of level.rooms) if (x0 < r.x + r.w + 2 && x0 + rw + 2 > r.x && y0 < r.y + r.h + 2 && y0 + rh + 2 > r.y) clash = true;
      if (clash) continue;
      for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) { map[at(x, y)] = 0; tall[at(x, y)] = 1; }
      level.rooms.push({ x: x0, y: y0, w: rw, h: rh });
      placed++;
    }
  }
  function weightedType(rand, mix) {
    let total = 0;
    for (const k in mix) total += mix[k];
    let r = rand() * total;
    for (const k in mix) { r -= mix[k]; if (r <= 0) return k; }
    return Object.keys(mix)[0];
  }

  // ---------------------------------------------------------------- geometry
  function cellAt(level, x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) return WALL_A;
    return level.map[cy * level.w + cx];
  }
  function solidAt(state, x, y) {
    const v = cellAt(state.level, x, y);
    if (v === OPEN) return false;
    if (v === DOOR && state.doorOpen) return false;
    return true;
  }
  // move a circle through the grid, sliding along walls; returns { hitX, hitY }
  function moveCircle(state, o, dx, dy, r) {
    const hit = { x: false, y: false };
    if (dx) {
      const nx = o.x + dx;
      const ex = nx + Math.sign(dx) * r;
      if (solidAt(state, ex, o.y - r * 0.8) || solidAt(state, ex, o.y + r * 0.8)) hit.x = true;
      else o.x = nx;
    }
    if (dy) {
      const ny = o.y + dy;
      const ey = ny + Math.sign(dy) * r;
      if (solidAt(state, o.x - r * 0.8, ey) || solidAt(state, o.x + r * 0.8, ey)) hit.y = true;
      else o.y = ny;
    }
    return hit;
  }
  // DDA ray against the grid; returns { d, x, y, cell } or null past maxD
  function castRay(state, x0, y0, a, maxD) {
    const level = state.level;
    const dx = Math.cos(a), dy = Math.sin(a);
    let mx = Math.floor(x0), my = Math.floor(y0);
    const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
    let sx, sy, tx, ty;
    if (dx < 0) { sx = -1; tx = (x0 - mx) * ddx; } else { sx = 1; tx = (mx + 1 - x0) * ddx; }
    if (dy < 0) { sy = -1; ty = (y0 - my) * ddy; } else { sy = 1; ty = (my + 1 - y0) * ddy; }
    let d = 0;
    for (let i = 0; i < 200; i++) {
      if (tx < ty) { d = tx; tx += ddx; mx += sx; } else { d = ty; ty += ddy; my += sy; }
      if (d > maxD) return null;
      if (mx < 0 || my < 0 || mx >= level.w || my >= level.h) return { d, x: x0 + dx * d, y: y0 + dy * d, cell: WALL_A, mx, my };
      const v = level.map[my * level.w + mx];
      if (v !== OPEN && !(v === DOOR && state.doorOpen)) return { d, x: x0 + dx * d, y: y0 + dy * d, cell: v, mx, my };
    }
    return null;
  }
  function lineOfSight(state, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const hit = castRay(state, x0, y0, Math.atan2(y1 - y0, x1 - x0), d);
    return !hit;
  }
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  // ---------------------------------------------------------------- state
  function newGame(optsIn) {
    const opts = Object.assign({}, DEFAULTS, optsIn || {});
    opts.odds = Object.assign({}, DEFAULTS.odds, (optsIn && optsIn.odds) || {});
    const seed = opts.seed || String(Math.floor(Math.random() * 1e9));
    const state = {
      opts, seed, rand: mulberry(hashStr(seed + ':play')),
      n: 0, level: null, phase: 'play', t: 0,
      player: null, goons: [], shots: [], zones: [], scars: [], beams: [], emitters: [],
      key: null, doorOpen: false, kills: 0, shotsFired: 0, recent: [], events: [], plate: null, pending: null,
      deaths: 0, deathBy: null, gagsSeen: {},
    };
    startLevel(state, Math.max(1, Math.min(LEVELS.length, opts.startLevel || 1)));
    return state;
  }
  let nextId = 1;
  function startLevel(state, n) {
    const level = buildLevel(n, state.seed, state.opts);
    state.n = n; state.level = level; state.phase = 'play';
    state.player = {
      x: level.spawn.x, y: level.spawn.y, a: level.spawn.a, r: 0.25, hp: state.player ? Math.max(state.player.hp, 60) : 100, maxHp: 100,
      cool: 0, slow: 1, vx: 0, vy: 0, fx: { snot: 0, bees: 0, lump: 0, spin: 0, dead: 0, fall: 0, flash: 0, hurt: 0 },
      safe: { x: level.spawn.x, y: level.spawn.y }, driftPush: { i: -1, t: 0 }, spinDir: 1, ringing: 0,
    };
    state.goons = level.goonSpawns.map((s) => makeGoon(s.type, s.x, s.y, state.rand));
    if (level.bossSpawn) {
      const b = makeGoon('jabberwock', level.bossSpawn.x, level.bossSpawn.y, state.rand);
      b.isBoss = true; b.hp = 100; b.maxHp = 100; b.cool = 2.5; b.strafeT = 0; b.strafeDir = 1; b.recent = [];
      state.goons.push(b);
    }
    state.shots = []; state.zones = []; state.scars = []; state.beams = []; state.emitters = [];
    state.key = level.key ? { x: level.key.x, y: level.key.y, held: false } : { held: true };
    state.doorOpen = !level.key;
    state.pending = null;
    state.plate = null;
    state.events.push({ type: 'level', n, name: level.name });
  }
  function makeGoon(type, x, y, rand) {
    const def = GOON_TYPES[type];
    return {
      id: nextId++, type, def, x, y, a: rand() * TAU, r: def.r, hp: 1, state: 'idle', t: 0, dieT: 0, dieDur: 0, outcome: null, gagId: null,
      path: null, pathT: rand() * 0.4, wanderT: rand() * 2, atkT: 0, windup: 0, vx: 0, vy: 0, scale: 1, seed: rand(), pacT: 0, isBoss: false, blink: 0,
    };
  }

  // ---------------------------------------------------------------- the roll
  function rollGag(state, forcedId) {
    if (forcedId && T.byId[forcedId]) return T.byId[forcedId];
    const o = state.opts.odds;
    const total = o.dispatch + o.weird + o.dud + o.backfire;
    let r = state.rand() * total;
    let tier = 'dispatch';
    for (const t of T.TIERS) { r -= o[t]; if (r <= 0) { tier = t; break; } }
    const pool = GAGS.filter((g) => g.tier === tier && !state.recent.includes(g.id));
    const src = pool.length ? pool : GAGS.filter((g) => g.tier === tier);
    const g = src[Math.floor(state.rand() * src.length)];
    state.recent.push(g.id);
    if (state.recent.length > 8) state.recent.shift();
    return g;
  }

  // the aim point for lobs, drops and areas: the first goon along the ray, else short of the wall
  function aimPoint(state, ox, oy, a, maxD, hostile) {
    const targets = hostile ? [state.player] : state.goons.filter((g) => g.state !== 'dead' && g.state !== 'dying');
    const dx = Math.cos(a), dy = Math.sin(a);
    let bestD = Infinity, best = null;
    for (const g of targets) {
      const rx = g.x - ox, ry = g.y - oy;
      const along = rx * dx + ry * dy;
      if (along < 0.3 || along > maxD) continue;
      const perp = Math.abs(rx * dy - ry * dx);
      if (perp < 0.7 && along < bestD) { bestD = along; best = g; }
    }
    const wall = castRay(state, ox, oy, a, maxD);
    if (best && (!wall || bestD < wall.d)) return { x: best.x, y: best.y, d: bestD, goon: best };
    const d = wall ? Math.max(0.6, wall.d - 0.6) : maxD;
    return { x: ox + dx * d, y: oy + dy * d, d, goon: null };
  }

  // ---------------------------------------------------------------- firing
  function fire(state, forcedId) {
    const p = state.player;
    if (state.phase !== 'play' || p.cool > 0 || p.fx.dead > 0 || state.pending) return null;
    const gag = rollGag(state, forcedId || state.opts.forceGag);
    p.cool = state.opts.fireCool;
    state.shotsFired++;
    state.gagsSeen[gag.id] = (state.gagsSeen[gag.id] || 0) + 1;
    state.pending = { gag, t: state.opts.revealDelay };
    state.events.push({ type: 'pull', gag });
    return gag;
  }
  function launchPending(state) {
    const { gag } = state.pending;
    state.pending = null;
    const p = state.player;
    launch(state, gag, p.x, p.y, p.a, 'player');
    state.plate = { name: gag.name, line: gag.line || '', tier: gag.tier, t: 0, id: gag.id };
    state.events.push({ type: 'fire', gag, x: p.x, y: p.y, a: p.a });
  }

  // launch a gag from a point in a direction; owner 'player' | 'boss' | 'rifle' (the little one)
  function launch(state, gag, ox, oy, a, owner) {
    const hostile = owner === 'boss';
    const mx = ox + Math.cos(a) * 0.45, my = oy + Math.sin(a) * 0.45;
    switch (gag.kind) {
      case 'beam': return fireBeam(state, gag, ox, oy, a, hostile);
      case 'bolt': {
        const n = gag.count || 1;
        const a0 = gag.backwards ? a + Math.PI : a;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (state.rand() - 0.5) * (gag.spread || 0) : 0;
          const aa = a0 + spread;
          const sp = gag.speed * (n > 1 ? 0.8 + state.rand() * 0.4 : 1);
          state.shots.push({
            id: nextId++, gag, kind: 'bolt', sprite: gag.sprite, x: ox + Math.cos(aa) * 0.45, y: oy + Math.sin(aa) * 0.45, z: gag.floats ? 0.5 : 0.35, a: aa,
            vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: gag.life, t: 0, hitR: gag.hitR || 0.4, pierce: !!gag.pierce, bounce: !!gag.bounce,
            hostile, owner, hit: new Set(), ox, oy, returning: false, splash: gag.splash || 0, spin: !!gag.spin, roll: !!gag.roll, dead: false,
          });
        }
        return;
      }
      case 'lob':
      case 'recurse': {
        const tgt = aimPoint(state, ox, oy, a, 7.5, hostile);
        state.shots.push({ id: nextId++, gag, kind: 'lob', sprite: gag.sprite, x: mx, y: my, z: 0.4, a, x0: mx, y0: my, x1: tgt.x, y1: tgt.y, T: Math.max(0.35, tgt.d / gag.speed), arc: gag.arc || 1, t: 0, hitR: 0.5, hostile, owner, hit: new Set(), dead: false, splash: gag.splash || 0 });
        return;
      }
      case 'stream':
        state.emitters.push({ gag, t: 0, dur: gag.dur, rate: gag.rate, acc: 0, hostile, owner, aIsPlayer: owner === 'player', ox, oy, a });
        return;
      case 'area': {
        const tgt = aimPoint(state, gag.mode === 'wander' ? ox : ox, oy, a, gag.mode === 'wander' ? 3 : 7, hostile);
        spawnZone(state, gag, tgt.x, tgt.y, hostile, owner);
        return;
      }
      case 'drop': {
        const tgt = aimPoint(state, ox, oy, a, 7, hostile);
        state.zones.push({ id: nextId++, gag, mode: 'drop', x: tgt.x, y: tgt.y, t: 0, dur: gag.fallT, r: gag.splash || 0.8, hostile, owner, sprite: gag.sprite, done: false });
        return;
      }
      case 'melee': {
        state.shots.push({ id: nextId++, gag, kind: 'melee', sprite: gag.sprite, x: mx, y: my, z: 0.45, a, t: 0, life: 0.45, reach: gag.reach, hostile, owner, dead: false, visual: true });
        // the reach lands a beat in: the sprite lunges first
        state.zones.push({ id: nextId++, gag, mode: 'meleehit', x: ox, y: oy, a, t: 0, dur: 0.12, hostile, owner, done: false });
        return;
      }
      case 'train': {
        // the dominant axis of the aim
        const ax = Math.abs(Math.cos(a)) >= Math.abs(Math.sin(a)) ? Math.sign(Math.cos(a)) || 1 : 0;
        const ay = ax ? 0 : Math.sign(Math.sin(a)) || 1;
        state.shots.push({ id: nextId++, gag, kind: 'train', sprite: gag.sprite, x: ox + ax * 1.1, y: oy + ay * 1.1, z: 0.5, a: Math.atan2(ay, ax), dx: ax, dy: ay, speed: gag.speed, breaks: gag.breaks, t: 0, life: 12, hostile, owner, hit: new Set(), dead: false, width: gag.width });
        return;
      }
      case 'summon': {
        state.shots.push({ id: nextId++, gag, kind: 'summon', sprite: gag.sprite, x: mx, y: my, z: 0.35, a, speed: gag.speed, turn: gag.turn, life: gag.life, t: 0, hitR: gag.hitR, hostile, owner, hit: new Set(), dead: false, walker: true });
        return;
      }
      case 'self': return selfHit(state, gag, a);
      case 'swap': {
        const tgt = aimPoint(state, ox, oy, a, gag.range, hostile);
        if (tgt.goon) {
          const g = tgt.goon;
          const px = state.player.x, py = state.player.y;
          state.player.x = g.x; state.player.y = g.y; state.player.safe = { x: g.x, y: g.y };
          g.x = px; g.y = py; g.state = 'chase'; g.path = null;
          state.events.push({ type: 'swap', goon: g });
        } else state.plate = { name: 'A TRADE', line: 'Nothing to trade with. The rifle shrugs.', tier: 'weird', t: 0, id: 'swap' };
        return;
      }
      case 'plate': {
        if (gag.scar) addScar(state, gag.scar, ox + Math.cos(a) * 0.8, oy + Math.sin(a) * 0.8, gag);
        return;
      }
    }
  }

  function fireBeam(state, gag, ox, oy, a, hostile) {
    const dx = Math.cos(a), dy = Math.sin(a);
    const wall = gag.walls ? null : castRay(state, ox, oy, a, gag.range);
    const maxD = wall ? wall.d : gag.range;
    const targets = hostile ? [state.player] : state.goons.filter((g) => g.state !== 'dead' && g.state !== 'dying');
    const hits = [];
    for (const g of targets) {
      const rx = g.x - ox, ry = g.y - oy;
      const along = rx * dx + ry * dy;
      if (along < 0.2 || along > maxD) continue;
      const perp = Math.abs(rx * dy - ry * dx);
      if (perp < (g.r || 0.3) + 0.25) hits.push({ g, along });
    }
    hits.sort((p, q) => p.along - q.along);
    const victims = gag.pierce ? hits.map((h) => h.g) : hits.slice(0, 1).map((h) => h.g);
    if (gag.chain && victims.length) {
      const v0 = victims[0];
      for (const g of targets) if (g !== v0 && Math.hypot(g.x - v0.x, g.y - v0.y) < gag.chain) victims.push(g);
    }
    const endD = victims.length && !gag.pierce ? hits[0].along : maxD;
    state.beams.push({ gag, x0: ox, y0: oy, x1: ox + dx * endD, y1: oy + dy * endD, t: 0, life: gag.id === 'sand' ? 0.5 : 0.25, chain: gag.chain ? victims.slice(1).map((g) => ({ x: g.x, y: g.y })) : null });
    if (gag.flash) state.player.fx.flash = Math.max(state.player.fx.flash, gag.flash * 0.6);
    if (gag.id === 'sand') state.player.ringing = 3;
    for (const v of victims) {
      if (hostile) hurtPlayer(state, gag, 'boss');
      else { hitGoon(state, v, gag, { x: ox, y: oy }); if (gag.scar) addScar(state, gag.scar, v.x, v.y, gag); }
    }
    if (wall && gag.scar && !victims.length && gag.id !== 'curse') addScar(state, gag.scar, wall.x - dx * 0.3, wall.y - dy * 0.3, gag);
    state.events.push({ type: 'beam', gag, hits: victims.length });
  }

  function spawnZone(state, gag, x, y, hostile, owner) {
    const z = { id: nextId++, gag, mode: gag.mode, x, y, r: gag.r, t: 0, dur: gag.dur || 0.01, hostile, owner, sprite: gag.sprite, done: false, vx: 0, vy: 0, hurtT: 0, a: state.rand() * TAU };
    if (gag.mode === 'instant') {
      applySplash(state, gag, x, y, gag.r, hostile, owner);
      if (gag.scar) addScar(state, gag.scar, x, y, gag);
      z.dur = 0.6; z.mode = 'flash';   // stays a beat for the sprite
    } else if (gag.mode === 'linger') {
      applySplash(state, gag, x, y, gag.r * 0.7, hostile, owner);
      if (gag.scar) addScar(state, gag.scar, x, y, gag);
      z.dur = 0.8; z.mode = 'flash';
    } else if (gag.mode === 'wander') {
      const a = state.rand() * TAU;
      z.vx = Math.cos(a) * gag.speed; z.vy = Math.sin(a) * gag.speed;
    }
    state.zones.push(z);
    state.events.push({ type: 'zone', gag, x, y });
  }

  function applySplash(state, gag, x, y, r, hostile, owner) {
    let n = 0;
    if (hostile) {
      const p = state.player;
      if (Math.hypot(p.x - x, p.y - y) < r + p.r) { hurtPlayer(state, gag, owner); n++; }
    } else {
      for (const g of state.goons) {
        if (g.state === 'dead' || g.state === 'dying') continue;
        if (Math.hypot(g.x - x, g.y - y) < r + g.r) { hitGoon(state, g, gag, { x, y }); n++; }
      }
      if (gag.selfSplash && Math.hypot(state.player.x - x, state.player.y - y) < r) hurtPlayer(state, { name: gag.name, verb: gag.verb, tier: 'backfire', dmg: gag.selfSplash }, 'self');
    }
    return n;
  }

  function selfHit(state, gag, a) {
    const p = state.player;
    if (gag.dmg) hurtPlayer(state, { name: gag.name, verb: gag.verb || 'DONE IN', tier: 'backfire', dmg: gag.dmg }, 'self');
    if (gag.knock) { p.vx -= Math.cos(a) * gag.knock; p.vy -= Math.sin(a) * gag.knock; }
    switch (gag.effect) {
      case 'snot': p.fx.snot = gag.dur; break;
      case 'lump': p.fx.lump = gag.dur; break;
      case 'bees': p.fx.bees = gag.dur; break;
      case 'dead': p.fx.dead = gag.dur; break;
      case 'spin': p.fx.spin = gag.dur; p.spinDir = state.rand() < 0.5 ? -1 : 1; break;
      case 'teleport': {
        const open = [];
        const { w, h, map } = state.level;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (map[y * w + x] === OPEN) open.push([x, y]);
        const c = pick(state.rand, open);
        p.x = c[0] + 0.5; p.y = c[1] + 0.5; p.safe = { x: p.x, y: p.y };
        p.fx.flash = 0.5;
        break;
      }
    }
    state.events.push({ type: 'self', gag });
  }

  // ---------------------------------------------------------------- hits
  function hitGoon(state, g, gag, from) {
    if (g.state === 'dead' || g.state === 'dying') return false;
    if (g.isBoss) return hitBoss(state, g, gag, from);
    if (!gag.outcome) { g.blink = 0.4; state.events.push({ type: 'dud-hit', gag, goon: g }); return false; }
    let outcome = gag.outcome;
    if (gag.altOutcome && state.rand() < gag.altChance) outcome = gag.altOutcome;
    const def = OUTCOMES[outcome];
    g.gagId = gag.id;
    g.outcome = outcome;
    if (def.lethal === false) {
      g.state = 'pacified'; g.pacT = 0; g.path = null;
      state.events.push({ type: 'pacify', gag, goon: g, outcome });
      return true;
    }
    g.state = 'dying'; g.dieT = 0; g.dieDur = gag.longDeath || def.dur; g.hp = 0;
    if (outcome === 'fling') {
      const ang = Math.atan2(g.y - from.y, g.x - from.x);
      g.vx = Math.cos(ang) * 7; g.vy = Math.sin(ang) * 7; g.dieDur = 3;
    }
    if (outcome === 'drop' && gag.id !== 'hole') addScar(state, 'hole', g.x, g.y, gag);
    state.kills++;
    state.events.push({ type: 'kill', gag, goon: g, outcome, x: g.x, y: g.y });
    return true;
  }
  const TIER_BOSS_DMG = { dispatch: 20, weird: 10, dud: 0, backfire: 0 };
  function hitBoss(state, b, gag, from) {
    const dmg = TIER_BOSS_DMG[gag.tier] || 0;
    if (!dmg) { b.blink = 0.4; state.events.push({ type: 'dud-hit', gag, goon: b }); return false; }
    b.hp -= dmg;
    b.blink = 0.5; b.react = { outcome: gag.outcome, t: 0 }; b.stagger = 0.7;
    state.events.push({ type: 'bosshit', gag, hp: b.hp, outcome: gag.outcome });
    if (b.hp <= 0) {
      b.hp = 0; b.state = 'dying'; b.dieT = 0; b.outcome = gag.outcome || 'expire'; b.gagId = gag.id; b.dieDur = 4;
      state.kills++;
      state.events.push({ type: 'kill', gag, goon: b, outcome: b.outcome, x: b.x, y: b.y, boss: true });
    }
    return true;
  }
  // gag = a gag record, or { name, verb, tier, dmg } for direct damage
  const TIER_PLAYER_DMG = { dispatch: 35, weird: 15, dud: 0, backfire: 0 };
  function hurtPlayer(state, gag, source) {
    const p = state.player;
    if (state.phase !== 'play') return;
    const dmg = (gag.dmg != null ? gag.dmg : TIER_PLAYER_DMG[gag.tier] || 0) * (state.opts.damageMul || 1);
    if (dmg <= 0) { state.events.push({ type: 'graze', gag, source }); return; }
    p.hp -= dmg;
    p.fx.hurt = 0.5;
    state.events.push({ type: 'hurt', dmg, gag, source });
    if (p.hp <= 0) {
      p.hp = 0;
      state.phase = 'dead';
      state.deaths++;
      state.deathBy = { verb: gag.verb || (gag.outcome && OUTCOMES[gag.outcome] ? OUTCOMES[gag.outcome].verb : 'DONE IN'), name: gag.name || 'SOMETHING', source };
      state.events.push({ type: 'death', by: state.deathBy });
    }
  }
  function addScar(state, type, x, y, gag) {
    const def = SCARS[type];
    if (!def) return;
    if (state.scars.length > 180) {
      const i = state.scars.findIndex((s) => !s.hazard);
      state.scars.splice(i >= 0 ? i : 0, 1);
    }
    state.scars.push({ id: nextId++, type, x, y, r: def.r, hazard: def.hazard || null, slow: def.slow, dps: def.dps, life: def.life || Infinity, t: 0, gagId: gag ? gag.id : null, gag, a: state.rand() * TAU, seed: state.rand() });
  }

  // ---------------------------------------------------------------- step
  function step(state, input, dtIn) {
    const dt = Math.min(dtIn, 1 / 30);
    state.t += dt;
    state.events = state.events || [];
    if (state.plate) state.plate.t += dt;
    if (state.phase !== 'play') { tickCorpses(state, dt); return; }
    stepPlayer(state, input, dt);
    if (state.pending) { state.pending.t -= dt; if (state.pending.t <= 0) launchPending(state); }
    stepEmitters(state, dt);
    stepShots(state, dt);
    stepZones(state, dt);
    stepScars(state, dt);
    stepGoons(state, dt);
    for (const b of state.beams) b.t += dt;
    state.beams = state.beams.filter((b) => b.t < b.life);
  }
  function tickCorpses(state, dt) {
    for (const g of state.goons) if (g.state === 'dying') { g.dieT += dt; if (g.dieT >= g.dieDur) g.state = 'dead'; }
  }

  function stepPlayer(state, input, dt) {
    const p = state.player, fx = p.fx, o = state.opts;
    for (const k in fx) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt);
    if (p.ringing > 0) p.ringing -= dt;
    if (p.cool > 0) p.cool -= dt;
    if (fx.fall > 0) return;   // in the dark, climbing out
    // look
    p.a += (input.look || 0) + (input.turn || 0) * o.turnSpeed * dt;
    if (fx.spin > 0) p.a += p.spinDir * (TAU / 1.2) * dt;
    p.a = ((p.a % TAU) + TAU) % TAU;
    // hazard slow
    let slow = 1;
    for (const s of state.scars) if (s.hazard === 'slow' && Math.hypot(s.x - p.x, s.y - p.y) < s.r) slow = Math.min(slow, s.slow);
    p.slow = slow;
    const sp = o.moveSpeed * (input.run ? 1.35 : 1) * slow;
    let mx = Math.cos(p.a) * (input.fwd || 0) + Math.cos(p.a + Math.PI / 2) * (input.strafe || 0);
    let my = Math.sin(p.a) * (input.fwd || 0) + Math.sin(p.a + Math.PI / 2) * (input.strafe || 0);
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    const dx = mx * sp * dt + p.vx * dt, dy = my * sp * dt + p.vy * dt;
    p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
    const hit = moveCircle(state, p, dx, dy, p.r);
    if (hit.x) p.vx = 0;
    if (hit.y) p.vy = 0;
    p.moving = m > 0.1;
    // hazards: damage, holes
    let inHole = false;
    for (const s of state.scars) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (s.hazard === 'dps' && d < s.r) hurtOverTime(state, s, dt);
      if (s.hazard === 'fall' && d < s.r * 0.8) inHole = true;
    }
    if (inHole) {
      hurtPlayer(state, { name: 'A HOLE', verb: 'FELL DOWN', tier: 'dispatch', dmg: 20 }, 'hole');
      if (state.phase === 'play') { fx.fall = 0.9; p.x = p.safe.x; p.y = p.safe.y; p.vx = p.vy = 0; state.events.push({ type: 'fall' }); }
      return;
    }
    let nearHole = false;
    for (const s of state.scars) if (s.hazard === 'fall' && Math.hypot(s.x - p.x, s.y - p.y) < s.r + 0.9) nearHole = true;
    if (!nearHole) { p.safe.x = p.x; p.safe.y = p.y; }
    // key + door
    if (state.key && !state.key.held && Math.hypot(state.key.x - p.x, state.key.y - p.y) < 0.6) {
      state.key.held = true; state.doorOpen = true;
      state.events.push({ type: 'key' });
    }
    const lvl = state.level;
    if (lvl.door && state.doorOpen && Math.floor(p.x) === lvl.door.x && Math.floor(p.y) === lvl.door.y) {
      state.phase = 'cleared';
      state.events.push({ type: 'cleared', n: state.n });
      return;
    }
    // drift doors: keep walking into one and it gives
    const ahead = { x: p.x + Math.cos(p.a) * 0.55, y: p.y + Math.sin(p.a) * 0.55 };
    const di = lvl.driftDoors.findIndex((d) => Math.floor(ahead.x) === d.x && Math.floor(ahead.y) === d.y);
    if (di >= 0 && (input.fwd || 0) > 0.3) {
      if (p.driftPush.i !== di) { p.driftPush.i = di; p.driftPush.t = 0; }
      p.driftPush.t += dt;
      if (p.driftPush.t >= 0.7) { p.driftPush.t = -99; state.events.push({ type: 'drift', i: di }); }
    } else if (p.driftPush.t > 0) p.driftPush.t = Math.max(0, p.driftPush.t - dt * 2);
    // fire
    if (input.fire) fire(state);
  }
  function hurtOverTime(state, s, dt) {
    s.hurtAcc = (s.hurtAcc || 0) + s.dps * dt;
    if (s.hurtAcc >= 4) {
      const amt = Math.floor(s.hurtAcc);
      s.hurtAcc -= amt;
      const gag = s.gag || { name: 'THE FLOOR', tier: 'dispatch' };
      hurtPlayer(state, { name: gag.name, verb: gag.verb || (gag.outcome ? OUTCOMES[gag.outcome].verb : 'DONE IN'), tier: gag.tier, dmg: amt }, 'scar');
    }
  }

  function stepEmitters(state, dt) {
    for (const e of state.emitters) {
      e.t += dt;
      e.acc += e.rate * dt;
      const p = state.player;
      const ox = e.aIsPlayer ? p.x : e.ox, oy = e.aIsPlayer ? p.y : e.oy, a = e.aIsPlayer ? p.a : e.a;
      while (e.acc >= 1) {
        e.acc -= 1;
        const aa = a + (state.rand() - 0.5) * 0.24;
        const sp = e.gag.speed * (0.85 + state.rand() * 0.3);
        state.shots.push({
          id: nextId++, gag: e.gag, kind: 'bolt', sprite: e.gag.sprite, x: ox + Math.cos(aa) * 0.5, y: oy + Math.sin(aa) * 0.5, z: 0.3 + state.rand() * 0.25, a: aa,
          vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: e.gag.range / sp, t: 0, hitR: e.gag.hitR, pierce: false, bounce: false, hostile: e.hostile, owner: e.owner,
          hit: new Set(), ox, oy, splash: 0, dead: false, drop: true, wallScar: state.rand() < 0.12,
        });
      }
    }
    state.emitters = state.emitters.filter((e) => e.t < e.dur);
  }

  function stepShots(state, dt) {
    const p = state.player;
    for (const s of state.shots) {
      s.t += dt;
      if (s.visual) { if (s.t >= s.life) s.dead = true; continue; }
      if (s.kind === 'bolt') {
        if (s.gag.returns && !s.returning && s.t > s.gag.returns) { s.returning = true; s.hit.clear(); }
        if (s.returning) {
          const ang = Math.atan2(p.y - s.y, p.x - s.x);
          const sp = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp; s.a = ang;
          if (Math.hypot(p.x - s.x, p.y - s.y) < 0.5) { hurtPlayer(state, { name: s.gag.name, verb: s.gag.verb, tier: 'backfire', dmg: s.gag.selfDmg }, 'self'); s.dead = true; state.events.push({ type: 'boomerang-hit' }); continue; }
        }
        if (s.gag.homingHostile) { /* reserved */ }
        // substep fast bolts
        const steps = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 0.25));
        for (let i = 0; i < steps && !s.dead; i++) {
          const nx = s.x + s.vx * dt / steps, ny = s.y + s.vy * dt / steps;
          if (solidAt(state, nx, ny)) {
            if (s.bounce) {
              if (solidAt(state, nx, s.y)) s.vx = -s.vx; else if (solidAt(state, s.x, ny)) s.vy = -s.vy; else { s.vx = -s.vx; s.vy = -s.vy; }
              s.a = Math.atan2(s.vy, s.vx);
              state.events.push({ type: 'bounce', gag: s.gag, x: s.x, y: s.y });
            } else {
              if (s.splash) applySplash(state, s.gag, s.x, s.y, s.splash, s.hostile, s.owner);
              if (s.gag.scar && (s.gag.kind === 'bolt' && !s.drop || s.wallScar)) addScar(state, s.gag.scar, s.x, s.y, s.gag);
              if (s.splash) state.events.push({ type: 'boom', gag: s.gag, x: s.x, y: s.y, r: s.splash });
              else if (!s.drop) state.events.push({ type: 'land', gag: s.gag, x: s.x, y: s.y });
              s.dead = true;
            }
          } else { s.x = nx; s.y = ny; }
        }
        if (s.dead) continue;
        if (s.gag.floats) s.z = 0.5 + Math.sin(s.t * 3) * 0.15;
        boltHits(state, s);
        if (s.t >= s.life) {
          s.dead = true;
          if (s.gag.scar && !s.drop && s.gag.tier !== 'backfire') addScar(state, s.gag.scar, s.x, s.y, s.gag);
          if (!s.drop) state.events.push({ type: 'land', gag: s.gag, x: s.x, y: s.y });
        }
      } else if (s.kind === 'lob') {
        const u = Math.min(1, s.t / s.T);
        s.x = s.x0 + (s.x1 - s.x0) * u; s.y = s.y0 + (s.y1 - s.y0) * u;
        s.z = 0.4 + s.arc * 4 * u * (1 - u);
        if (s.z < 0.9) boltHits(state, s);
        if (s.dead) continue;
        if (u >= 1) { landLob(state, s); s.dead = true; }
      } else if (s.kind === 'summon') {
        const target = s.hostile ? p : nearestGoon(state, s.x, s.y, s.hit);
        if (target) {
          const want = Math.atan2(target.y - s.y, target.x - s.x);
          const d = angDiff(want, s.a);
          s.a += Math.max(-s.turn * dt, Math.min(s.turn * dt, d));
        }
        const o = { x: s.x, y: s.y };
        moveCircle(state, o, Math.cos(s.a) * s.speed * dt, Math.sin(s.a) * s.speed * dt, 0.2);
        s.x = o.x; s.y = o.y;
        boltHits(state, s);
        if (s.t >= s.life) { s.dead = true; state.events.push({ type: 'gone', gag: s.gag, x: s.x, y: s.y }); }
      } else if (s.kind === 'train') {
        const nx = s.x + s.dx * s.speed * dt, ny = s.y + s.dy * s.speed * dt;
        const lvl = state.level;
        const cx = Math.floor(nx + s.dx * 0.5), cy = Math.floor(ny + s.dy * 0.5);
        const boundary = cx <= 0 || cy <= 0 || cx >= lvl.w - 1 || cy >= lvl.h - 1;
        const v = cellAt(lvl, cx, cy);
        if (v !== OPEN && !(v === DOOR && state.doorOpen)) {
          if (!boundary && v >= WALL_A && v <= WALL_D && s.breaks > 0) {
            lvl.map[cy * lvl.w + cx] = OPEN; s.breaks--;
            addScar(state, 'rails', cx + 0.5, cy + 0.5, s.gag);
            state.events.push({ type: 'wallbreak', gag: s.gag, x: cx + 0.5, y: cy + 0.5 });
          } else { s.dead = true; state.events.push({ type: 'crash', gag: s.gag, x: s.x, y: s.y }); continue; }
        }
        s.x = nx; s.y = ny;
        // everyone on the track ahead
        const targets = s.hostile ? [p] : state.goons.filter((g) => g.state !== 'dead' && g.state !== 'dying');
        for (const g of targets) {
          const rx = g.x - s.x, ry = g.y - s.y;
          const along = rx * s.dx + ry * s.dy, perp = Math.abs(rx * s.dy - ry * s.dx);
          if (along > -0.4 && along < 1.0 && perp < s.width) {
            if (s.hostile) hurtPlayer(state, s.gag, 'boss'); else hitGoon(state, g, s.gag, { x: s.x, y: s.y });
          }
        }
        if (s.t >= s.life) s.dead = true;
      }
    }
    state.shots = state.shots.filter((s) => !s.dead);
  }
  function nearestGoon(state, x, y, exclude) {
    let best = null, bd = Infinity;
    for (const g of state.goons) {
      if (g.state === 'dead' || g.state === 'dying' || (exclude && exclude.has(g.id))) continue;
      const d = Math.hypot(g.x - x, g.y - y);
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  }
  function boltHits(state, s) {
    const p = state.player;
    if (s.hostile) {
      if (!s.returning && Math.hypot(p.x - s.x, p.y - s.y) < s.hitR + p.r) {
        hurtPlayer(state, s.gag, s.owner);
        if (s.splash) { state.events.push({ type: 'boom', gag: s.gag, x: s.x, y: s.y, r: s.splash }); }
        s.dead = true;
      }
      return;
    }
    for (const g of state.goons) {
      if (g.state === 'dead' || g.state === 'dying' || s.hit.has(g.id)) continue;
      if (Math.hypot(g.x - s.x, g.y - s.y) < s.hitR + g.r) {
        s.hit.add(g.id);
        if (s.splash) {
          applySplash(state, s.gag, s.x, s.y, s.splash, s.hostile, s.owner);
          if (s.gag.scar) addScar(state, s.gag.scar, s.x, s.y, s.gag);
          state.events.push({ type: 'boom', gag: s.gag, x: s.x, y: s.y, r: s.splash });
          s.dead = true; return;
        }
        const killed = hitGoon(state, g, s.gag, { x: s.ox != null ? s.ox : s.x, y: s.oy != null ? s.oy : s.y });
        if (s.gag.cloud) addScar(state, s.gag.cloud, g.x, g.y, s.gag);
        if (!s.pierce) {
          if (s.gag.scar && !s.drop && s.kind !== 'summon') addScar(state, s.gag.scar, g.x, g.y, s.gag);
          if (s.kind === 'summon' && s.gag.scar) addScar(state, s.gag.scar, g.x, g.y, s.gag);
          s.dead = true;
          if (!killed && s.gag.tier === 'dud') state.events.push({ type: 'land', gag: s.gag, x: s.x, y: s.y });
          return;
        }
      }
    }
  }
  function landLob(state, s) {
    const g = s.gag;
    state.events.push({ type: 'boom', gag: g, x: s.x, y: s.y, r: s.splash || 0.3 });
    if (g.kind === 'recurse') {
      const tgt = nearestGoon(state, s.x, s.y, null);
      const pool = GAGS.filter((x) => x.tier === 'dispatch' && x.kind !== 'train' && x.kind !== 'recurse' && x.kind !== 'self');
      const g2 = pool[Math.floor(state.rand() * pool.length)];
      const a = tgt ? Math.atan2(tgt.y - s.y, tgt.x - s.x) : state.rand() * TAU;
      launch(state, g2, s.x, s.y, a, s.owner === 'boss' ? 'boss' : 'rifle');
      state.plate = { name: 'THE SMALLER RIFLE FIRED ' + g2.name, line: g2.line || '', tier: g2.tier, t: 0, id: g2.id };
      state.events.push({ type: 'fire', gag: g2, x: s.x, y: s.y, a, little: true });
      return;
    }
    if (g.fortunes) {
      state.plate = { name: 'A FORTUNE COOKIE', line: pick(state.rand, g.fortunes), tier: 'dud', t: 0, id: g.id };
    }
    if (s.splash) applySplash(state, g, s.x, s.y, s.splash, s.hostile, s.owner);
    if (g.scar) addScar(state, g.scar, s.x, s.y, g);
    if (g.burst) {
      for (let i = 0; i < g.burst.count; i++) {
        const a = state.rand() * TAU;
        state.shots.push({ id: nextId++, gag: g, kind: 'summon', sprite: g.burst.sprite, x: s.x + Math.cos(a) * 0.2, y: s.y + Math.sin(a) * 0.2, z: 0.3, a, speed: g.burst.speed, turn: g.burst.turn, life: g.burst.life, t: 0, hitR: g.burst.hitR, hostile: s.hostile, owner: s.owner, hit: new Set(), dead: false, walker: true });
      }
    }
  }

  function stepZones(state, dt) {
    const p = state.player;
    for (const z of state.zones) {
      z.t += dt;
      const g = z.gag;
      if (z.mode === 'drop') {
        if (z.t >= z.dur && !z.done) {
          z.done = true;
          applySplash(state, g, z.x, z.y, z.r, z.hostile, z.owner);
          if (g.scar) addScar(state, g.scar, z.x, z.y, g);
          if (g.flash) p.fx.flash = Math.max(p.fx.flash, g.flash * 0.5);
          state.events.push({ type: 'impact', gag: g, x: z.x, y: z.y, r: z.r });
          z.dur = z.t + 0.5;  // linger a beat for the sprite
        }
        if (z.done && z.t >= z.dur) z.dead = true;
      } else if (z.mode === 'meleehit') {
        if (z.t >= z.dur && !z.done) {
          z.done = true;
          const targets = z.hostile ? [p] : state.goons.filter((x) => x.state !== 'dead' && x.state !== 'dying');
          let n = 0;
          for (const t of targets) {
            const d = Math.hypot(t.x - z.x, t.y - z.y);
            if (d > g.reach + t.r) continue;
            if (Math.abs(angDiff(Math.atan2(t.y - z.y, t.x - z.x), z.a)) > g.arc) continue;
            if (z.hostile) hurtPlayer(state, g, z.owner); else { hitGoon(state, t, g, { x: z.x, y: z.y }); n++; if (g.scar) addScar(state, g.scar, t.x, t.y, g); }
          }
          if (!n && g.scar && !z.hostile) addScar(state, g.scar, z.x + Math.cos(z.a) * 1.2, z.y + Math.sin(z.a) * 1.2, g);
          state.events.push({ type: 'melee', gag: g, hits: n });
          z.dead = true;
        }
      } else if (z.mode === 'flash') {
        if (z.t >= z.dur) z.dead = true;
      } else if (z.mode === 'pull') {
        const k = Math.min(1, z.t / 0.4);
        for (const t of state.goons) {
          if (t.state === 'dead' || t.state === 'dying') continue;
          const d = Math.hypot(t.x - z.x, t.y - z.y);
          if (d < z.r) {
            const pull = (1 - d / z.r) * 6 * k;
            t.x += (z.x - t.x) / (d || 1) * pull * dt; t.y += (z.y - t.y) / (d || 1) * pull * dt; t.pulled = 0.3;
            if (d < 0.45) hitGoon(state, t, g, { x: z.x, y: z.y });
          }
        }
        const dp = Math.hypot(p.x - z.x, p.y - z.y);
        if (dp < g.pullsPlayer) {
          const pull = (1 - dp / g.pullsPlayer) * 3.5 * k;
          p.vx += (z.x - p.x) / (dp || 1) * pull * dt * 8; p.vy += (z.y - p.y) / (dp || 1) * pull * dt * 8;
          if (dp < 0.4 && z.hurtT <= 0) { hurtPlayer(state, { name: g.name, verb: g.verb, tier: 'dispatch', dmg: 25 }, 'self'); z.hurtT = 0.8; p.vx = -p.vx * 2; p.vy = -p.vy * 2; }
        }
        if (z.hurtT > 0) z.hurtT -= dt;
        if (z.t >= z.dur) { z.dead = true; state.events.push({ type: 'pop', gag: g, x: z.x, y: z.y }); }
      } else if (z.mode === 'wander') {
        if (state.rand() < dt * 1.5) { const a = state.rand() * TAU; z.vx = Math.cos(a) * g.speed; z.vy = Math.sin(a) * g.speed; }
        const o = { x: z.x, y: z.y };
        const hit = moveCircle(state, o, z.vx * dt, z.vy * dt, 0.4);
        if (hit.x) z.vx = -z.vx;
        if (hit.y) z.vy = -z.vy;
        z.x = o.x; z.y = o.y; z.a += dt * 9;
        for (const t of state.goons) {
          if (t.state === 'dead' || t.state === 'dying') continue;
          if (Math.hypot(t.x - z.x, t.y - z.y) < z.r + t.r) hitGoon(state, t, g, { x: z.x, y: z.y });
        }
        if (z.hurtT > 0) z.hurtT -= dt;
        if (Math.hypot(p.x - z.x, p.y - z.y) < z.r && z.hurtT <= 0) {
          hurtPlayer(state, { name: g.name, verb: g.verb, tier: 'dispatch', dmg: g.hurtsPlayer }, 'self');
          const ang = Math.atan2(p.y - z.y, p.x - z.x);
          p.vx += Math.cos(ang) * 6; p.vy += Math.sin(ang) * 6; z.hurtT = 1.2;
        }
        if (z.t >= z.dur) { z.dead = true; state.events.push({ type: 'gone', gag: g, x: z.x, y: z.y }); }
      }
    }
    state.zones = state.zones.filter((z) => !z.dead);
  }

  function stepScars(state, dt) {
    for (const s of state.scars) {
      s.t += dt;
      if (s.hazard === 'dps' && s.dps >= 9) {
        for (const g of state.goons) {
          if (g.state === 'dead' || g.state === 'dying' || g.isBoss) continue;
          if (Math.hypot(g.x - s.x, g.y - s.y) < s.r * 0.9) {
            g.hp -= (s.dps / 18) * dt;   // gas takes a goon in ~2 s, lava in under 1
            if (g.hp <= 0 && s.gag) hitGoon(state, g, s.gag, { x: s.x, y: s.y });
          }
        }
      }
    }
    state.scars = state.scars.filter((s) => s.t < s.life);
  }

  // ---------------------------------------------------------------- goons
  function stepGoons(state, dt) {
    const p = state.player, gs = state.opts.goonSpeed || 1;
    for (const g of state.goons) {
      g.t += dt;
      if (g.blink > 0) g.blink -= dt;
      if (g.pulled > 0) g.pulled -= dt;
      if (g.state === 'dead') continue;
      if (g.state === 'dying') {
        g.dieT += dt;
        if (g.outcome === 'fling' && !g.isBoss) {
          const o = { x: g.x, y: g.y };
          const hit = moveCircle(state, o, g.vx * dt, g.vy * dt, 0.2);
          g.x = o.x; g.y = o.y; g.spin = (g.spin || 0) + dt * 12;
          if (hit.x || hit.y) { g.vx = g.vy = 0; g.state = 'dead'; g.splat = true; state.events.push({ type: 'splat', goon: g, x: g.x, y: g.y }); addScar(state, 'blood', g.x, g.y, null); }
        }
        if (g.outcome === 'shrink') g.scale = Math.max(0.02, 1 - g.dieT / g.dieDur);
        if (g.outcome === 'inflate') g.scale = g.dieT < g.dieDur - 0.3 ? 1 + (g.dieT / g.dieDur) * 1.4 : 0.01;
        if (g.dieT >= g.dieDur) {
          g.state = 'dead';
          if (g.isBoss) { state.phase = 'won'; state.events.push({ type: 'won' }); }
        }
        continue;
      }
      if (g.state === 'pacified') { g.pacT += dt; continue; }
      const def = g.def;
      const dist = Math.hypot(p.x - g.x, p.y - g.y);
      if (g.isBoss) { stepBoss(state, g, dt, dist); continue; }
      if (g.stagger > 0) { g.stagger -= dt; continue; }
      if (g.state === 'idle') {
        g.wanderT -= dt;
        if (dist < def.notice && lineOfSight(state, g.x, g.y, p.x, p.y)) { g.state = 'chase'; g.pathT = 0; state.events.push({ type: 'notice', goon: g }); }
        else if (g.wanderT <= 0) {
          g.wanderT = 1.5 + state.rand() * 3;
          const a = state.rand() * TAU;
          g.target = { x: g.x + Math.cos(a) * 2.5, y: g.y + Math.sin(a) * 2.5 };
        } else if (g.target) {
          const ang = Math.atan2(g.target.y - g.y, g.target.x - g.x);
          g.a = ang;
          const hit = moveCircle(state, g, Math.cos(ang) * def.speed * 0.4 * gs * dt, Math.sin(ang) * def.speed * 0.4 * gs * dt, g.r);
          if (hit.x || hit.y || Math.hypot(g.target.x - g.x, g.target.y - g.y) < 0.3) g.target = null;
        }
      } else if (g.state === 'chase') {
        g.pathT -= dt;
        if (g.pathT <= 0) {
          g.pathT = 0.45;
          const path = bfsPath(state.level, Math.floor(g.x), Math.floor(g.y), Math.floor(p.x), Math.floor(p.y));
          g.path = path;
        }
        if (dist > def.notice * 2.2) { g.state = 'idle'; continue; }
        // ranged: cultists throw flaming skulls
        if (def.ranged && dist < def.ranged && dist > 1.6 && lineOfSight(state, g.x, g.y, p.x, p.y)) {
          g.a = Math.atan2(p.y - g.y, p.x - g.x);
          g.atkT -= dt;
          if (g.atkT <= 0) {
            g.atkT = def.atk;
            const a = g.a + (state.rand() - 0.5) * 0.15;
            state.shots.push({ id: nextId++, gag: { id: 'skull', name: 'A FLAMING SKULL FROM A CULTIST', verb: 'SKULLED', tier: 'x', dmg: def.dmg, sprite: 'skull' }, kind: 'bolt', sprite: 'skull', x: g.x + Math.cos(a) * 0.4, y: g.y + Math.sin(a) * 0.4, z: 0.4, a, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, life: 1.6, t: 0, hitR: 0.35, pierce: false, bounce: false, hostile: true, owner: 'goon', hit: new Set(), splash: 0, dead: false, drop: true });
            state.events.push({ type: 'throw', goon: g });
          }
          continue;
        }
        if (dist < def.reach + p.r) {
          g.a = Math.atan2(p.y - g.y, p.x - g.x);
          g.atkT -= dt;
          if (g.atkT <= 0) { g.atkT = def.atk; g.windup = 0.3; state.events.push({ type: 'swing', goon: g }); }
        } else {
          const next = g.path && g.path.length ? g.path[0] : null;
          let tx = p.x, ty = p.y;
          if (next != null && !(lineOfSight(state, g.x, g.y, p.x, p.y) && dist < 2.5)) {
            const w = state.level.w;
            tx = (next % w) + 0.5; ty = Math.floor(next / w) + 0.5;
            if (Math.hypot(tx - g.x, ty - g.y) < 0.25) { g.path.shift(); }
          }
          const ang = Math.atan2(ty - g.y, tx - g.x);
          g.a = ang;
          moveCircle(state, g, Math.cos(ang) * def.speed * gs * dt, Math.sin(ang) * def.speed * gs * dt, g.r);
        }
        if (g.windup > 0) {
          g.windup -= dt;
          if (g.windup <= 0 && dist < def.reach + p.r + 0.2) hurtPlayer(state, { name: 'A ' + def.name, verb: 'BEATEN', tier: 'x', dmg: def.dmg }, 'goon');
        }
      }
      // goons don't stack
      for (const o of state.goons) {
        if (o === g || o.state === 'dead' || o.state === 'dying') continue;
        const d = Math.hypot(o.x - g.x, o.y - g.y), min = g.r + o.r;
        if (d < min && d > 0.001) { const push = (min - d) * 0.5; g.x -= (o.x - g.x) / d * push; g.y -= (o.y - g.y) / d * push; }
      }
    }
  }

  function stepBoss(state, b, dt, dist) {
    const p = state.player, def = b.def;
    if (b.react) { b.react.t += dt; if (b.react.t > 0.9) b.react = null; }
    if (b.stagger > 0) { b.stagger -= dt; return; }
    b.a = Math.atan2(p.y - b.y, p.x - b.x);
    const los = lineOfSight(state, b.x, b.y, p.x, p.y);
    // keep a fighting distance, strafe
    let mx = 0, my = 0;
    if (dist < 3.5) { mx -= Math.cos(b.a); my -= Math.sin(b.a); }
    else if (dist > 7 || !los) {
      b.pathT = (b.pathT || 0) - dt;
      if (b.pathT <= 0) { b.pathT = 0.5; b.path = bfsPath(state.level, Math.floor(b.x), Math.floor(b.y), Math.floor(p.x), Math.floor(p.y)); }
      const next = b.path && b.path.length ? b.path[0] : null;
      if (next != null) {
        const w = state.level.w, tx = (next % w) + 0.5, ty = Math.floor(next / w) + 0.5;
        if (Math.hypot(tx - b.x, ty - b.y) < 0.3) b.path.shift();
        const ang = Math.atan2(ty - b.y, tx - b.x);
        mx += Math.cos(ang); my += Math.sin(ang);
      } else { mx += Math.cos(b.a); my += Math.sin(b.a); }
    }
    b.strafeT -= dt;
    if (b.strafeT <= 0) { b.strafeT = 1.2 + state.rand() * 1.5; b.strafeDir = state.rand() < 0.5 ? -1 : 1; }
    mx += Math.cos(b.a + Math.PI / 2) * b.strafeDir * 0.7; my += Math.sin(b.a + Math.PI / 2) * b.strafeDir * 0.7;
    const m = Math.hypot(mx, my) || 1;
    const hit = moveCircle(state, b, mx / m * def.speed * dt, my / m * def.speed * dt, b.r);
    if (hit.x || hit.y) b.strafeDir = -b.strafeDir;
    // his rifle
    b.cool -= dt;
    if (b.windup > 0) {
      b.windup -= dt;
      if (b.windup <= 0) {
        const gag = bossRoll(state, b);
        b.lastGag = gag;
        if (gag.kind === 'self') {
          // his rifle turned on him
          b.hp -= 12; b.blink = 0.5; b.stagger = 0.8; b.react = { outcome: 'expire', t: 0 };
          state.events.push({ type: 'bossbackfire', gag, hp: b.hp });
          state.plate = { name: 'HIS RIFLE FIRED ' + gag.name + ' AT HIM', line: 'Same table. Same odds.', tier: 'backfire', t: 0, id: gag.id };
          if (b.hp <= 0) { b.hp = 0; b.state = 'dying'; b.dieT = 0; b.outcome = 'expire'; b.gagId = gag.id; b.dieDur = 4; state.kills++; state.events.push({ type: 'kill', gag, goon: b, outcome: 'expire', x: b.x, y: b.y, boss: true }); }
        } else if (gag.kind === 'swap' || gag.kind === 'recurse') {
          state.plate = { name: 'HE FIRED ' + gag.name + ' AT YOU', line: 'It did nothing. This time.', tier: gag.tier, t: 0, id: gag.id };
        } else {
          launch(state, gag, b.x, b.y, b.a, 'boss');
          state.plate = { name: 'HE FIRED ' + gag.name + ' AT YOU', line: gag.tier === 'dud' ? 'His table has duds too.' : gag.tier === 'weird' ? 'Odd. Still hurts.' : (gag.line || ''), tier: gag.tier, t: 0, id: gag.id };
        }
        state.events.push({ type: 'bossfire', gag });
      }
    } else if (b.cool <= 0 && los && dist < 9) {
      b.cool = state.opts.bossFire;
      b.windup = 0.55;
      state.events.push({ type: 'bosswind' });
    }
  }
  function bossRoll(state, b) {
    const o = state.opts.odds;
    const total = o.dispatch + o.weird + o.dud + o.backfire;
    let r = state.rand() * total, tier = 'dispatch';
    for (const t of T.TIERS) { r -= o[t]; if (r <= 0) { tier = t; break; } }
    const pool = GAGS.filter((g) => g.tier === tier && !b.recent.includes(g.id) && g.kind !== 'train');
    const g = pool[Math.floor(state.rand() * pool.length)];
    b.recent.push(g.id); if (b.recent.length > 6) b.recent.shift();
    return g;
  }

  // ---------------------------------------------------------------- flow
  function nextLevel(state) {
    if (state.n >= LEVELS.length) return false;
    startLevel(state, state.n + 1);
    return true;
  }
  function retryLevel(state) {
    const hp = 100;
    startLevel(state, state.n);
    state.player.hp = hp;
  }
  function goonsLeft(state) { return state.goons.filter((g) => g.state !== 'dead' && g.state !== 'dying' && g.state !== 'pacified').length; }

  globalThis.JabberwockyCore = {
    VERSION: 1, DEFAULTS, GOON_TYPES, LEVELS, OUTCOMES, SCARS, GAGS, CELL: { OPEN, WALL_A, WALL_B, WALL_C, WALL_D, DOOR, DRIFT },
    hashStr, mulberry, makeMaze, buildLevel, bfs, bfsPath, cellAt, solidAt, castRay, lineOfSight, aimPoint,
    newGame, startLevel, nextLevel, retryLevel, step, fire, rollGag, launch, hitGoon, hurtPlayer, addScar, goonsLeft, angDiff,
  };
})();
