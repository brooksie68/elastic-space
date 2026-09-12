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
    healMul: 1,          // how many pies a maze gets (× the level's deal)
    healHp: 35,          // what a pie is worth
    startLevel: 1,
    lives: 3,            // THE STRUCTURE (James 2026-09-11): a run has three lives; a death costs one and restarts the maze
    burstMul: 1.9,       // THE RUN BURST (James 2026-09-12): shift = a two-second burst at this × walk speed, then a two-second cooldown
    burstDur: 2, burstCool: 2,
    armorMul: 1,         // how many armor pickups a maze gets (× the level's deal)
    waveFrac: 0.34,      // REINFORCEMENTS (James 2026-09-12): when a space's whole first set is down, this share of it comes back; 0 = one set, the old level
    waveDelay: 6,        // the clock, in seconds, between the last one down and the next few out
  };

  // speeds in cells/s (a cell renders at 2.6 m); h = height in metres for the rig
  // notice = how far away a goon sees you (cells); doubled 2026-09-11 with the open dungeons so they come at you across a
  // room, not round a corner. weapons = what a goon of this type may carry (dealt at spawn, WEAPONS below).
  // The ghoul is OUT (James 2026-09-11, 'remove the green ghost bad guy') — the lizardman took its place in every mix.
  const GOON_TYPES = {
    lizardman:  { name: 'LIZARDMAN', speed: 1.5, reach: 1.1, dmg: 10, atk: 1.2, notice: 13, size: 1.25, r: 0.34, h: 2.2, weapons: ['sword', 'axe'] },
    brute:      { name: 'BRUTE',    speed: 1.05, reach: 1.15, dmg: 14, atk: 1.6, notice: 11, size: 1.3,  r: 0.4,  h: 2.6, weapons: ['hammer'] },
    // THE FLAYED ONE (2026-09-12) took the ratling's place — James: 'you cannot see it and it's hard to hit'; a skinless sprinter,
    // a man's height, fast and weak like the rat, with a meat hook
    flayed:     { name: 'FLAYED ONE', speed: 2.1, reach: 0.9, dmg: 6,  atk: 0.8, notice: 15, size: 1.0,  r: 0.3,  h: 1.9, weapons: ['hook'] },
    cultist:    { name: 'CULTIST',  speed: 1.3,  reach: 0.9,  dmg: 9,  atk: 2.2, notice: 16, size: 1.0,  r: 0.3,  h: 1.8, ranged: 6.5 },
    stalker:    { name: 'STALKER',  speed: 1.2,  reach: 1.8,  dmg: 12, atk: 1.5, notice: 14, size: 1.55, r: 0.3,  h: 3.0 },
    jabberwock: { name: 'THE JABBERWOCK', speed: 1.4, reach: 1.4, dmg: 12, atk: 1.6, notice: 99, size: 2.2, r: 0.55, h: 4.5 },
  };
  // the bad guys' weapons (James 2026-09-11): Meshy props in the right hand; a weapon sets the hit, the swing rate, the
  // reach and the windup (a hammer is slow and heavy). The verb is the death card's.
  const WEAPONS = {
    sword:  { name: 'SWORD',  verb: 'RUN THROUGH', dmgMul: 1.25, atkMul: 1.0,  reach: 0.3,  windup: 0.35 },
    axe:    { name: 'AXE',    verb: 'CHOPPED',     dmgMul: 1.5,  atkMul: 1.25, reach: 0.25, windup: 0.4 },
    hammer: { name: 'HAMMER', verb: 'FLATTENED',   dmgMul: 1.9,  atkMul: 1.5,  reach: 0.35, windup: 0.55 },
    shiv:   { name: 'SHIV',   verb: 'SHIVVED',     dmgMul: 0.8,  atkMul: 0.75, reach: 0,    windup: 0.2 },
    hook:   { name: 'HOOK',   verb: 'HOOKED',      dmgMul: 1.1,  atkMul: 0.9,  reach: 0.25, windup: 0.22 },   // the flayed one's meat hook
  };

  // THE STRUCTURE (James 2026-09-11): four mazes on the coarse lattice (nx × ny nodes, w = 3·nx + 1 cells; two-cell
  // corridors), rooms + one great hall each (hall = its size in nodes), then THE MIDDLE (the boss; its door opens when he dies) and THE THREE DOORS
  // (a round chamber with the three odd doors — the way out to the rest of Elastic Space). cave = eroded walls (THE DEEP).
  // THE WARREN (James 2026-09-12, 'start in a smaller area with rooms and hallways and then reach the larger spaces… each level
  // 2 to 3x the current size'): every maze is 2.5× the nodes it was; the corner you wake in (warren = its size in nodes) holds
  // only small rooms (warrenRooms of them, 2×2 nodes, no columns) and hallways; the big rooms (up to 3×3, columns), the great
  // hall(s) (halls of them) and the door all lie outside it, so a level opens up as you go.
  const LEVELS = [
    { n: 1, name: 'THE GATE',        nx: 10, ny: 9,  goons: 12, loops: 12, rooms: 6, warrenRooms: 3, warren: [5, 4], hall: [3, 3], halls: 1, theme: 0, mix: { lizardman: 6, flayed: 2 } },
    { n: 2, name: 'THE CATACOMBS',   nx: 12, ny: 10, goons: 18, loops: 18, rooms: 7, warrenRooms: 4, warren: [5, 5], hall: [3, 4], halls: 1, theme: 1, mix: { lizardman: 5, flayed: 3, cultist: 2 } },
    { n: 3, name: 'THE MEAT LOCKER', nx: 13, ny: 12, goons: 24, loops: 24, rooms: 8, warrenRooms: 4, warren: [6, 5], hall: [3, 4], halls: 2, theme: 2, mix: { lizardman: 4, flayed: 3, cultist: 2, brute: 3 } },
    { n: 4, name: 'THE DEEP',        nx: 15, ny: 13, goons: 28, loops: 30, rooms: 9, warrenRooms: 5, warren: [6, 6], hall: [4, 4], halls: 2, cave: true, theme: 3, mix: { lizardman: 3, flayed: 3, cultist: 3, brute: 3, stalker: 3 } },
    { n: 5, name: 'THE MIDDLE',      w: 25, h: 25, goons: 6,  loops: 0,  rooms: 0, theme: 4, arena: true, mix: { lizardman: 2, flayed: 2, cultist: 1, brute: 1 } },
    { n: 6, name: 'THE THREE DOORS', w: 13, h: 13, goons: 0,  loops: 0,  rooms: 0, theme: 4, exit: true, mix: {} },
  ];
  const MAZES = 4;   // how many of them are mazes (the cards say MAZE n OF 4)
  // THE WEAPON LAB (2026-09-07): one big bare hall, no key, no door, no boss; the creatures on the pads are
  // passive (notice 0 — they wander and never chase) and the lab host respawns them. startLevel(state, 'lab').
  const LAB_LEVEL = { n: 'lab', name: 'THE WEAPON LAB', w: 17, h: 17, goons: 0, loops: 0, rooms: 0, theme: 2, arena: true, lab: true, mix: {} };
  const LAB_PADS = [{ type: 'lizardman', dx: 4.5, dy: -1.6 }, { type: 'brute', dx: 5.5, dy: 0.2 }, { type: 'cultist', dx: 4.5, dy: 2.0 }];

  // cell values
  const OPEN = 0, WALL_A = 1, WALL_B = 2, WALL_C = 3, WALL_D = 4, DOOR = 5, DRIFT = 6, PROP = 7;   // PROP: a landmark stands here — solid like a wall, drawn as floor + the piece (2026-09-11)

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
  // THE STRUCTURE (James 2026-09-11, 'more open, bigger rooms, higher ceilings'): the maze runs on a coarse lattice —
  // every node is a 2×2 block of cells and every passage is two cells wide (5.2 m), so nothing is a one-cell tunnel;
  // rooms are carved over whole nodes (5×5 to 8×8 cells), the great hall over a 3×4 run of them (8×11); loops knock
  // walls out between nodes so dead ends are rare. Pitch 3: node (i, j) owns cells 1+3i..2+3i × 1+3j..2+3j and the
  // wall strip at 3(i+1) between two nodes opens for a passage. w = 3·nx + 1. Heights ride in level.tall: 0 corridor,
  // 1 room, 2 hall (the renderer's HEIGHTS).
  const PITCH = 3;
  const nodeX = (i) => 1 + PITCH * i, nodeY = (j) => 1 + PITCH * j;
  // open the two-cell strip between node (i, j) and its neighbour (i+di, j+dj)
  function passage(map, w, i, j, di, dj) {
    if (di) { const x = nodeX(Math.max(i, i + di)) - 1; for (let y = 0; y < 2; y++) map[(nodeY(j) + y) * w + x] = 0; }
    else { const y = nodeY(Math.max(j, j + dj)) - 1; for (let x = 0; x < 2; x++) map[y * w + nodeX(i) + x] = 0; }
  }
  const passageOpen = (map, w, i, j, di, dj) => di ? map[nodeY(j) * w + nodeX(Math.max(i, i + di)) - 1] === 0 : map[(nodeY(Math.max(j, j + dj)) - 1) * w + nodeX(i)] === 0;
  function makeMaze(nx, ny, rand, loops, warren) {
    const inWarren = (i, j) => !!warren && i < warren[0] && j < warren[1];
    const w = PITCH * nx + 1, h = PITCH * ny + 1;
    const g = new Uint8Array(w * h).fill(1);
    const seen = new Uint8Array(nx * ny);
    const openNode = (i, j) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g[(nodeY(j) + y) * w + nodeX(i) + x] = 0; };
    const stack = [[0, 0]]; seen[0] = 1; openNode(0, 0);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const opts = dirs.filter(([di, dj]) => i + di >= 0 && j + dj >= 0 && i + di < nx && j + dj < ny && !seen[(j + dj) * nx + i + di]);
      if (!opts.length) { stack.pop(); continue; }
      const [di, dj] = pick(rand, opts);
      seen[(j + dj) * nx + i + di] = 1; openNode(i + di, j + dj); passage(g, w, i, j, di, dj);
      stack.push([i + di, j + dj]);
    }
    // loops: extra passages between neighbours the tree left walled
    for (let k = 0, tries = 0; k < loops && tries < 400; tries++) {
      const i = Math.floor(rand() * nx), j = Math.floor(rand() * ny);
      const [di, dj] = pick(rand, [[1, 0], [0, 1]]);
      if (i + di >= nx || j + dj >= ny || passageOpen(g, w, i, j, di, dj)) continue;
      if (inWarren(i, j) && inWarren(i + di, j + dj) && rand() < 0.6) continue;   // the warren keeps most of its dead ends and turns
      passage(g, w, i, j, di, dj); k++;
    }
    return g;
  }

  function makeArena(w, h, rand, bare) {
    const g = new Uint8Array(w * h).fill(0);
    const at = (x, y) => y * w + x;
    for (let x = 0; x < w; x++) { g[at(x, 0)] = 1; g[at(x, h - 1)] = 1; }
    for (let y = 0; y < h; y++) { g[at(0, y)] = 1; g[at(w - 1, y)] = 1; }
    if (bare) return g;
    // a ring of pillars, a few broken
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    for (let y = 3; y < h - 3; y += 3) for (let x = 3; x < w - 3; x += 3) {
      if (Math.abs(x - cx) < 2 && Math.abs(y - cy) < 2) continue;
      if (rand() < 0.75) g[at(x, y)] = 1;
    }
    return g;
  }
  // THE THREE DOORS (2026-09-11): a round chamber — everything outside the circle is rock
  function makeRound(w, h) {
    const g = makeArena(w, h, null, true);
    const cx = w / 2, cy = h / 2, r = w / 2 - 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) g[y * w + x] = 1;
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

  // health: MEAT PIES OF DUBIOUS ORIGIN, on open cells away from the spawn and the key, spread apart
  function placeHeals(level, cells, n, rand) {
    const pool = cells.slice();
    for (let i = 0; i < n && pool.length; i++) {
      let ci = Math.floor(rand() * pool.length);
      if (level.heals.length) {
        let bestSep = -1;
        pool.forEach((c, j) => { const sep = Math.min(...level.heals.map((h) => Math.hypot(c[0] + 0.5 - h.x, c[1] + 0.5 - h.y))); if (sep > bestSep) { bestSep = sep; ci = j; } });
      }
      const c = pool.splice(ci, 1)[0];
      level.heals.push({ x: c[0] + 0.5, y: c[1] + 0.5 });
    }
  }
  // spread n picks from cells into list, each as far from the others as it can be
  function placeSpread(list, cells, n, rand) {
    const pool = cells.slice();
    for (let i = 0; i < n && pool.length; i++) {
      let ci = Math.floor(rand() * pool.length);
      if (list.length) {
        let bestSep = -1;
        pool.forEach((c, j) => { const sep = Math.min(...list.map((h) => Math.hypot(c[0] + 0.5 - h.x, c[1] + 0.5 - h.y))); if (sep > bestSep) { bestSep = sep; ci = j; } });
      }
      const c = pool.splice(ci, 1)[0];
      list.push({ x: c[0] + 0.5, y: c[1] + 0.5 });
    }
    return list;
  }
  function buildLevel(n, seedStr, opts) {
    const def = n === 'lab' ? LAB_LEVEL : LEVELS[n - 1];
    const rand = mulberry(hashStr(seedStr + ':' + n));
    const w = def.nx ? PITCH * def.nx + 1 : def.w, h = def.ny ? PITCH * def.ny + 1 : def.h;
    const map = def.exit ? makeRound(w, h) : def.arena ? makeArena(w, h, rand, def.lab) : makeMaze(def.nx, def.ny, rand, def.loops, def.warren);
    const level = { n, name: def.name, w, h, nx: def.nx || 0, ny: def.ny || 0, map, theme: def.theme, arena: !!def.arena, exit: !!def.exit, lab: !!def.lab, spawn: null, key: null, door: null, driftDoors: [], goonSpawns: [], heals: [], armors: [], bossSpawn: null, tall: new Uint8Array(w * h), rooms: [], markers: [], guide: null, landmarks: [], warren: def.warren || null, mix: def.mix || {} };
    const at = (x, y) => y * w + x;
    // rooms: open chambers carved over whole nodes with a tall ceiling, the great hall taller still; the arena is one hall
    if (def.arena) level.tall.fill(def.lab ? 1 : 2);
    else if (def.exit) level.tall.fill(1);
    else { carveRooms(level, def.rooms || 0, def.hall || null, rand, def.warren || null, def.warrenRooms || 0, def.halls || 1); if (def.cave) erodeCave(level, rand); placeLandmarks(level); }
    if (def.exit) { const mid = Math.floor(w / 2); map[mid * w + mid] = PROP; level.landmarks = [{ x: mid, y: mid, room: -1, slot: 0, hall: false }]; }
    // wall variants: mostly A, some B/C, rare D (the train's breakable walls; the look comes from the district now)
    for (let i = 0; i < map.length; i++) if (map[i] === 1) {
      const r = rand();
      map[i] = r < 0.62 ? WALL_A : r < 0.82 ? WALL_B : r < 0.95 ? WALL_C : WALL_D;
    }
    const open = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (map[at(x, y)] === OPEN) open.push([x, y]);
    assignDistricts(level);

    if (def.lab) {
      // the lab: you stand near the west wall facing east; the pads are a few cells ahead
      level.spawn = { x: 3.5, y: h / 2, a: 0 };
      level.pads = LAB_PADS.map((d, i) => ({ i, type: d.type, x: level.spawn.x + d.dx, y: level.spawn.y + d.dy }));
      for (const pad of level.pads) level.goonSpawns.push({ x: pad.x, y: pad.y, type: pad.type, pad: pad.i });
      return level;
    }
    if (def.exit) {
      // THE THREE DOORS: in from the south, the three odd doors north, east and west; nothing else lives here
      const mid = Math.floor(w / 2);
      level.spawn = { x: mid + 0.5, y: h - 2.5, a: -Math.PI / 2 };
      for (const [x, y, side, cx, cy] of [[mid, 0, 'n', mid, 1], [w - 1, mid, 'e', w - 2, mid], [0, mid, 'w', 1, mid]]) { map[at(x, y)] = DRIFT; level.driftDoors.push({ x, y, side, cx, cy }); }
      return level;
    }
    if (def.arena) {
      level.spawn = { x: 1.5, y: h - 1.5, a: -Math.PI / 4 };
      level.bossSpawn = { x: w / 2, y: h / 2 };
      // the way on: a door in the north wall that opens when he dies (the odd doors moved to THE THREE DOORS, 2026-09-11)
      const mid = Math.floor(w / 2);
      map[at(mid, 0)] = DOOR;
      level.door = { x: mid, y: 0, side: 'n', cx: mid, cy: 1 };
      const far = open.filter(([x, y]) => Math.hypot(x - 1, y - (h - 2)) > 9 && Math.hypot(x - w / 2, y - h / 2) > 3);
      for (let i = 0; i < def.goons && far.length; i++) {
        const c = far.splice(Math.floor(rand() * far.length), 1)[0];
        level.goonSpawns.push({ x: c[0] + 0.5, y: c[1] + 0.5, type: weightedType(rand, def.mix) });
      }
      placeSpread(level.heals, far, Math.round(2 * (opts.healMul == null ? 1 : opts.healMul)), rand);
      const am = opts.armorMul == null ? 1 : opts.armorMul;
      if (am > 0) { const plate = placeSpread([], far, 1, rand)[0]; if (plate) level.armors.push({ x: plate.x, y: plate.y, kind: 'plate' }); for (const hm of placeSpread([], far, Math.round(am), rand)) level.armors.push({ x: hm.x, y: hm.y, kind: 'helm' }); }
      return level;
    }

    // spawn at (1,1); face the open neighbour
    level.spawn = { x: 1.5, y: 1.5, a: map[at(2, 1)] === OPEN ? 0 : Math.PI / 2 };
    const dS = bfs(level, 1, 1);
    const roomOf = (x, y) => level.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || null;
    // key: the farthest cell from the spawn, a room preferred (the key room)
    let best = null, bestD = -1;
    for (const [x, y] of open) {
      const d = dS[at(x, y)];
      const rm = roomOf(x, y);
      const score = d + (rm && !rm.hall ? 5 : 0);
      if (d >= 0 && score > bestD) { bestD = score; best = [x, y]; }
    }
    level.key = { x: best[0] + 0.5, y: best[1] + 0.5 };
    const dK = bfs(level, best[0], best[1]);
    // exit door: a boundary wall next to an open cell far from both spawn and key — and outside the warren, so the way out is
    // always through the big spaces (the warren is where you start, never where you finish)
    const inWarren = (x, y) => !!def.warren && Math.floor((x - 1) / PITCH) < def.warren[0] && Math.floor((y - 1) / PITCH) < def.warren[1];
    let door = null, doorScore = -1;
    for (let pass = 0; pass < 2 && !door; pass++) for (const [x, y] of open) {   // pass 1 (never needed on these sizes) lets the warren back in rather than have no door
      if (pass === 0 && inWarren(x, y)) continue;
      const edge = x === 1 ? [0, y, 'w'] : x === w - 2 ? [w - 1, y, 'e'] : y === 1 ? [x, 0, 'n'] : y === h - 2 ? [x, h - 1, 's'] : null;
      if (!edge) continue;
      const s = Math.min(dS[at(x, y)], dK[at(x, y)] * 0.8);
      if (s > doorScore) { doorScore = s; door = { x: edge[0], y: edge[1], side: edge[2], cx: x, cy: y }; }
    }
    map[at(door.x, door.y)] = DOOR;
    level.door = door;
    // the critical path: spawn→key→door — THE GUIDE rides on it (arrows, signs, lamps: layGuide)
    const crit = new Set();
    const p1 = pathFrom(level, dS, best[0], best[1]) || [];
    const p2 = pathFrom(level, dK, door.cx, door.cy) || [];
    for (const c of p1) crit.add(c);
    for (const c of p2) crit.add(c);
    crit.add(at(1, 1));
    level.guide = { toKey: [at(1, 1), ...p1], toDoor: [at(best[0], best[1]), ...p2] };
    layGuide(level);
    // you wake facing down the route (the third cell of it, so you look along the hall, not at the next tile)
    if (p1.length) { const c = p1[Math.min(2, p1.length - 1)]; level.spawn.a = Math.atan2((Math.floor(c / w) + 0.5) - 1.5, (c % w) + 0.5 - 1.5); }
    // drift doors: three boundary walls next to cells off the critical path, spread apart (strict first, then relaxed)
    let cands = [];
    for (let relax = 0; relax < 4 && cands.length < 8; relax++) {   // keep relaxing until there is real choice, so the three spread out (2026-09-12: a seed put all three two cells apart)
      cands = [];
      for (const [x, y] of open) {
        if (relax < 2 && crit.has(at(x, y))) continue;
        if (relax < 1 && roomOf(x, y)) continue;
        const edge = x === 1 ? [0, y, 'w'] : x === w - 2 ? [w - 1, y, 'e'] : y === 1 ? [x, 0, 'n'] : y === h - 2 ? [x, h - 1, 's'] : null;
        if (!edge) continue;
        if (edge[0] === door.x && edge[1] === door.y) continue;
        const clear = relax < 3 ? 4 : 2;
        if (Math.hypot(x - best[0], y - best[1]) < clear || Math.hypot(x - door.cx, y - door.cy) < clear || Math.hypot(x - 1, y - 1) < clear) continue;
        cands.push({ x: edge[0], y: edge[1], side: edge[2], cx: x, cy: y });
      }
    }
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
    // goons: far back (James 2026-09-11) — at least eight steps from the spawn, never on the first stretch of the route,
    // and in a room the guide enters only on the far side of it from where you come in; two in three prefer a room
    const count = Math.max(1, Math.round(def.goons * (opts.goonMul || 1)));
    const head = new Set(level.guide.toKey.slice(0, 10));
    const entrance = {};
    for (const c of [...level.guide.toKey, ...level.guide.toDoor]) { const x = c % w, y = (c - x) / w; const rm = roomOf(x, y); if (rm && entrance[rm.id] == null) entrance[rm.id] = { x, y }; }
    const roomFar = {};
    for (const r of level.rooms) { const e = entrance[r.id]; if (!e) continue; let mx = 0; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (map[at(x, y)] === OPEN) mx = Math.max(mx, Math.abs(x - e.x) + Math.abs(y - e.y)); roomFar[r.id] = mx; }
    const ok = ([x, y]) => {
      if (dS[at(x, y)] < 8 || head.has(at(x, y)) || (x === best[0] && y === best[1])) return false;
      const rm = roomOf(x, y); const e = rm && entrance[rm.id];
      return !e || Math.abs(x - e.x) + Math.abs(y - e.y) >= roomFar[rm.id] * 0.55;
    };
    const roomPool = open.filter((c) => ok(c) && roomOf(c[0], c[1])), hallPool = open.filter((c) => ok(c) && !roomOf(c[0], c[1]));
    for (let i = 0; i < count; i++) {
      const pool = (rand() < 0.65 && roomPool.length) ? roomPool : hallPool.length ? hallPool : roomPool;
      if (!pool.length) break;
      const c = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      level.goonSpawns.push({ x: c[0] + 0.5, y: c[1] + 0.5, type: weightedType(rand, def.mix) });
    }
    // pies: one per four goons on the deal, at least six steps out, never on the key
    const pieCells = open.filter(([x, y]) => dS[at(x, y)] >= 6 && !(x === best[0] && y === best[1]));
    placeSpread(level.heals, pieCells, Math.max(1, Math.round(def.goons / 4 * (opts.healMul == null ? 1 : opts.healMul))), rand);
    // armor (2026-09-11): a breastplate in a side room the guide never enters (else somewhere far off the route), helms like pies
    const am = opts.armorMul == null ? 1 : opts.armorMul;
    if (am > 0) {
      const side = level.rooms.filter((r) => !entrance[r.id] && !r.hall);
      let plateCells = side.length ? open.filter(([x, y]) => { const rm = roomOf(x, y); return rm && side.includes(rm); }) : open.filter(([x, y]) => dS[at(x, y)] >= 8 && !crit.has(at(x, y)));
      if (!plateCells.length) plateCells = pieCells;
      const plate = placeSpread([], plateCells, 1, rand)[0];
      if (plate) level.armors.push({ x: plate.x, y: plate.y, kind: 'plate' });
      const helmCells = pieCells.filter(([x, y]) => !level.heals.some((hh) => Math.hypot(hh.x - x - 0.5, hh.y - y - 0.5) < 2));
      for (const hm of placeSpread([], helmCells, Math.max(1, Math.round(def.goons / 5 * am)), rand)) level.armors.push({ x: hm.x, y: hm.y, kind: 'helm' });
    }
    return level;
  }
  // rooms over whole nodes: 2×2 nodes = 5×5 cells, 2×3 = 5×8, 3×3 = 8×8; the great hall 3×4 or 4×3 (8×11 cells).
  // Never on the spawn node, never over another room (a wall's width apart is fine). A room inherits every passage that
  // crossed its edge and gets one or two doorways more, so it is never a dead end. The big ones get a few one-cell
  // columns at their inner lattice crossings (a column is a cell; the room stays open around it).
  // THE WARREN (2026-09-12): with warren = [wx, wy] nodes, zone 'warren' rooms must fit inside that corner (small, no
  // columns) and zone 'open' rooms and the halls must lie wholly outside it (i0 >= wx or j0 >= wy).
  function carveRooms(level, k, hall, rand, warren, warrenRooms, halls) {
    const { w, map, tall, nx, ny } = level;
    const at = (x, y) => y * w + x;
    const rooms = level.rooms;
    const tryPlace = (rw, rh, isHall, zone) => {
      for (let tries = 0; tries < 120; tries++) {
        let i0, j0;
        if (zone === 'warren') { if (warren[0] < rw || warren[1] < rh) return null; i0 = Math.floor(rand() * (warren[0] - rw + 1)); j0 = Math.floor(rand() * (warren[1] - rh + 1)); }
        else { i0 = Math.floor(rand() * (nx - rw + 1)); j0 = Math.floor(rand() * (ny - rh + 1)); if (zone === 'open' && i0 < warren[0] && j0 < warren[1]) continue; }
        if (i0 === 0 && j0 === 0) continue;
        let clash = false;
        for (const r of rooms) if (i0 < r.i + r.nw && i0 + rw > r.i && j0 < r.j + r.nh && j0 + rh > r.j) clash = true;   // a wall's width apart is fine
        if (clash) continue;
        const x0 = nodeX(i0), y0 = nodeY(j0), cw = PITCH * rw - 1, ch = PITCH * rh - 1;
        const room = { id: rooms.length, i: i0, j: j0, nw: rw, nh: rh, x: x0, y: y0, w: cw, h: ch, hall: isHall, warren: zone === 'warren' };
        for (let y = y0; y < y0 + ch; y++) for (let x = x0; x < x0 + cw; x++) { map[at(x, y)] = 0; tall[at(x, y)] = isHall ? 2 : 1; }
        if (rw >= 3 && rh >= 3 && zone !== 'warren') for (let j = j0 + 1; j < j0 + rh; j++) for (let i = i0 + 1; i < i0 + rw; i++) if (rand() < (isHall ? 0.85 : 0.5)) map[at(PITCH * i, PITCH * j)] = 1;
        // doorways
        const edges = [];
        for (let i = i0; i < i0 + rw; i++) { if (j0 > 0) edges.push([i, j0, 0, -1]); if (j0 + rh < ny) edges.push([i, j0 + rh - 1, 0, 1]); }
        for (let j = j0; j < j0 + rh; j++) { if (i0 > 0) edges.push([i0, j, -1, 0]); if (i0 + rw < nx) edges.push([i0 + rw - 1, j, 1, 0]); }
        const shut = edges.filter(([i, j, di, dj]) => !passageOpen(map, w, i, j, di, dj));
        for (let d = 0, want = 1 + Math.floor(rand() * 2); d < want && shut.length; d++) { const [i, j, di, dj] = shut.splice(Math.floor(rand() * shut.length), 1)[0]; passage(map, w, i, j, di, dj); }
        rooms.push(room);
        return room;
      }
      return null;
    };
    const openZone = warren ? 'open' : null;
    if (hall) for (let n = 0; n < (halls || 1); n++) { const flip = rand() < 0.5; tryPlace(flip ? hall[1] : hall[0], flip ? hall[0] : hall[1], true, openZone); }
    for (let n = 0; n < k; n++) tryPlace(pick(rand, warren ? [2, 3, 3] : [2, 2, 3]), pick(rand, warren ? [2, 3, 3] : [2, 2, 3]), false, openZone);
    if (warren) for (let n = 0; n < warrenRooms; n++) tryPlace(2, 2, false, 'warren');
  }
  // LANDMARKS (2026-09-11, 'landmarks or unusual formations that you can differentiate'): every room gets a slot at its
  // middle, the great hall three along its long axis — a PROP cell, solid like a wall, that the renderer stands a Meshy
  // piece on (the theme decides which). A slot needs open cells on all four sides so nothing is ever boxed in.
  function placeLandmarks(level) {
    const { w, map } = level;
    const at = (x, y) => y * w + x;
    const clear = (x, y) => map[at(x, y)] === 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => map[at(x + dx, y + dy)] === 0);
    for (const r of level.rooms) {
      const cx = r.x + Math.floor(r.w / 2), cy = r.y + Math.floor(r.h / 2);
      const slots = [[cx, cy]];
      if (r.hall) { if (r.w >= r.h) slots.push([r.x + 1, cy], [r.x + r.w - 2, cy]); else slots.push([cx, r.y + 1], [cx, r.y + r.h - 2]); }
      slots.forEach(([x, y], i) => {
        const cell = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].map(([ox, oy]) => [x + ox, y + oy]).find(([X, Y]) => clear(X, Y));
        if (!cell) return;
        map[at(cell[0], cell[1])] = PROP;
        level.landmarks.push({ x: cell[0], y: cell[1], room: r.id, slot: i, hall: !!r.hall });
      });
    }
  }
  // THE DEEP is a cavern: walls with open cells against them crumble here and there, so nothing reads as a grid
  function erodeCave(level, rand) {
    const { w, h, map, tall } = level;
    const at = (x, y) => y * w + x;
    const was = map.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (was[at(x, y)] !== 1) continue;
      const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => was[at(a, b)] === 0);
      if (!nb.length || rand() > 0.28) continue;
      map[at(x, y)] = 0;
      tall[at(x, y)] = Math.max(...nb.map(([a, b]) => tall[at(a, b)]));
    }
  }
  // DISTRICTS (2026-09-11, 'landmarks… different wall textures, colors, lighting'): every room seeds a district and the
  // corridors join the nearest room's, so a wing reads as one place — the renderer wears a tile set and a light colour
  // per district. level.district[cell] = room id (−1 in a wall); districtCount = the number of rooms (1 with none).
  function assignDistricts(level) {
    const { w, h, map, rooms } = level;
    const district = new Int16Array(w * h).fill(-1);
    const q = [];
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const c = y * w + x; if (map[c] === OPEN) { district[c] = r.id; q.push(c); } }
    if (!q.length) { for (let c = 0; c < map.length; c++) if (map[c] === OPEN) district[c] = 0; level.district = district; level.districtCount = 1; return; }
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % w;
      for (const n of [c + 1, c - 1, c + w, c - w]) {
        if (n < 0 || n >= w * h || Math.abs((n % w) - x) > 1) continue;
        if (map[n] === OPEN && district[n] < 0) { district[n] = district[c]; q.push(n); }
      }
    }
    level.district = district; level.districtCount = rooms.length;
  }
  // THE GUIDE (James 2026-09-11, 'arrows and rows of deltas and door signs and floor markings that continuously guide the
  // player towards the exit… occasionally obvious, frequently somewhat subtle, but always there'): markers laid along
  // the two legs of the route — toKey lit first, toDoor wakes when the key is picked up (the renderer's job).
  //   delta  a row of chevrons on the floor every third cell, pointing on; every fourth one is loud
  //   sign   over the way out of any place you could leave two other ways (a region = a room or a lattice node), and one at
  //          the spawn so you see the idea at once; always loud
  //   lamp   a light on the route every fifth cell, so the right way is a little brighter
  function layGuide(level) {
    const { w, h, map, nx } = level;
    const region = new Int32Array(w * h).fill(-1);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (map[y * w + x] !== OPEN) continue;
      const rm = level.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      region[y * w + x] = rm ? 100000 + rm.id : Math.floor((y - 1) / PITCH) * nx + Math.floor((x - 1) / PITCH);
    }
    const links = {};
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const c = y * w + x; if (region[c] < 0) continue;
      for (const n of [c + 1, c + w]) { if (region[n] < 0 || region[n] === region[c]) continue; (links[region[c]] = links[region[c]] || new Set()).add(region[n]); (links[region[n]] = links[region[n]] || new Set()).add(region[c]); }
    }
    const deg = (r) => (links[r] ? links[r].size : 0);
    const markers = [];
    for (const [leg, path] of [['key', level.guide.toKey], ['door', level.guide.toDoor]]) {
      for (let i = 0; i + 1 < path.length; i++) {
        const c = path[i], nxt = path[i + 1];
        const x = c % w, y = (c - x) / w, tx = nxt % w, ty = (nxt - tx) / w;
        const a = Math.atan2(ty - y, tx - x);
        if (i === 0 && leg === 'key') markers.push({ kind: 'sign', x: tx + 0.5, y: ty + 0.5, a, leg, loud: true });   // one cell ahead of the spawn, where you are looking
        if (i % 3 === 1) markers.push({ kind: 'delta', x: x + 0.5, y: y + 0.5, a, leg, loud: i % 12 === 1 });
        if (region[c] !== region[nxt] && deg(region[c]) >= 3) markers.push({ kind: 'sign', x: (x + tx) / 2 + 0.5, y: (y + ty) / 2 + 0.5, a, leg, loud: true });
        if (i % 5 === 3) markers.push({ kind: 'lamp', x: x + 0.5, y: y + 0.5, a, leg, loud: false });
      }
    }
    level.markers = markers;
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
      deaths: 0, deathBy: null, gagsSeen: {}, fuel: 10, lives: opts.lives == null ? 3 : opts.lives, armors: [],   // fuel: the flamethrower's seconds for the whole game — it never refills (James 2026-09-08)
    };
    startLevel(state, opts.startLevel === 'lab' ? 'lab' : Math.max(1, Math.min(LEVELS.length, opts.startLevel || 1)));
    return state;
  }
  let nextId = 1;
  function startLevel(state, n) {
    const level = buildLevel(n, state.seed, state.opts);
    state.n = n; state.level = level; state.phase = 'play';
    state.player = {
      x: level.spawn.x, y: level.spawn.y, a: level.spawn.a, aim: 0, r: 0.25, hp: 100, maxHp: 100, armor: 100, maxArmor: 100,   // full health AND full armor at the start of every level (James 2026-09-12; was: health carried over with a floor of 60, armor carried over)
      cool: 0, slow: 1, vx: 0, vy: 0, fx: { snot: 0, bees: 0, lump: 0, spin: 0, dead: 0, fall: 0, flash: 0, hurt: 0 },
      safe: { x: level.spawn.x, y: level.spawn.y }, driftPush: { i: -1, t: 0 }, spinDir: 1, ringing: 0,
      burst: 0, burstCool: 0, runHeld: false,   // the run burst: time left in it, time left before the next, and the key's last state (a tap starts one; holding does not chain)
    };
    state.goons = level.goonSpawns.map((s) => level.lab ? makeLabGoon(state, s) : makeGoon(s.type, s.x, s.y, state.rand));
    if (level.bossSpawn) {
      const b = makeGoon('jabberwock', level.bossSpawn.x, level.bossSpawn.y, state.rand);
      b.isBoss = true; b.hp = 100; b.maxHp = 100; b.cool = 2.5; b.strafeT = 0; b.strafeDir = 1; b.recent = [];
      state.goons.push(b);
    }
    state.shots = []; state.zones = []; state.scars = []; state.beams = []; state.emitters = [];
    state.key = level.key ? { x: level.key.x, y: level.key.y, held: false } : { held: true };
    state.heals = level.heals.map((h) => ({ x: h.x, y: h.y, taken: false }));
    state.armors = (level.armors || []).map((a) => ({ x: a.x, y: a.y, kind: a.kind, taken: false }));
    state.doorOpen = level.bossSpawn ? false : !level.key;   // the arena's door opens when the boss dies
    initWaves(state);
    state.pending = null;
    state.plate = null;
    state.events.push({ type: 'level', n, name: level.name });
  }
  function makeGoon(type, x, y, rand) {
    const def = GOON_TYPES[type];
    return {
      id: nextId++, type, def, x, y, a: rand() * TAU, r: def.r, hp: 1, state: 'idle', t: 0, dieT: 0, dieDur: 0, outcome: null, gagId: null,
      path: null, pathT: rand() * 0.4, wanderT: rand() * 2, atkT: 0, windup: 0, vx: 0, vy: 0, scale: 1, seed: rand(), pacT: 0, isBoss: false, blink: 0,
      weapon: def.weapons ? pick(rand, def.weapons) : null,   // dealt for life (2026-09-11)
    };
  }

  // a lab creature: passive (never notices you), faces you, remembers its pad so the host can put it back
  function makeLabGoon(state, s) {
    const g = makeGoon(s.type, s.x, s.y, state.rand);
    g.def = Object.assign({}, g.def, { notice: 0 });
    g.pad = s.pad; g.home = { x: s.x, y: s.y };
    g.a = Math.atan2(state.player.y - s.y, state.player.x - s.x);
    g.wanderT = 1 + state.rand() * 2;
    return g;
  }
  // put a lab creature back on its pad (a fresh goon, new id, so the renderer builds it clean); type may change
  function respawnLabGoon(state, g, type) {
    const i = state.goons.indexOf(g);
    const s = { x: g.home.x, y: g.home.y, type: type || g.type, pad: g.pad };
    const n = makeLabGoon(state, s);
    if (i >= 0) state.goons[i] = n; else state.goons.push(n);
    return n;
  }

  // ---------------------------------------------------------------- the roll
  // cuts.js (written by the dev server from the weapon lab's TRASH verdicts, loaded after gags.js) lists ids the
  // roll never deals; a forced gag (the lab, the configuration panel) still fires. Never empty: with everything
  // cut, the whole table stands. (2026-09-08)
  // passed.js (the same server, from the lab's PASSED verdicts) lists the approved shots: when it has any, the roll deals
  // ONLY from them (James 2026-09-11, 'only shoot the approved shots from the list. we'll keep adding to it'); the cuts
  // still apply on top. With nothing passed the old rule stands (everything not cut).
  function liveGags() {
    const c = globalThis.JABBERWOCKY_CUTS, p = globalThis.JABBERWOCKY_PASSED;
    const cut = (g) => Array.isArray(c) && c.includes(g.id);
    if (Array.isArray(p) && p.length) { const live = GAGS.filter((g) => p.includes(g.id) && !cut(g)); if (live.length) return live; }
    if (!Array.isArray(c) || !c.length) return GAGS;
    const live = GAGS.filter((g) => !cut(g));
    return live.length ? live : GAGS;
  }
  // a tier from the odds, over the tiers that have anything live (an empty tier folds its odds into the rest)
  function rollTier(state, live) {
    const o = state.opts.odds;
    const tiers = T.TIERS.filter((t) => live.some((g) => g.tier === t));
    const total = tiers.reduce((sum, t) => sum + o[t], 0);
    if (total <= 0) return tiers[0] || 'dispatch';
    let r = state.rand() * total;
    for (const t of tiers) { r -= o[t]; if (r <= 0) return t; }
    return tiers[tiers.length - 1];
  }
  function rollGag(state, forcedId) {
    if (forcedId && T.byId[forcedId]) return T.byId[forcedId];
    const live = liveGags();   // a dry flamethrower still comes up — it just clicks (James: 'it's just random, right?')
    const tier = rollTier(state, live);
    const pool = live.filter((g) => g.tier === tier && !state.recent.includes(g.id));
    const src = pool.length ? pool : (live.some((g) => g.tier === tier) ? live.filter((g) => g.tier === tier) : live);
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
    state.pending = { gag, t: state.opts.revealDelay + (gag.hold || 0) };   // hold: a gag that waits longer before it goes (the handbag: its voice first, the swing 0.8 s after the pull — James 2026-09-10)
    state.events.push({ type: 'pull', gag });
    return gag;
  }
  function launchPending(state) {
    const { gag } = state.pending;
    state.pending = null;
    const p = state.player;
    const a = p.a + (p.aim || 0);   // aim = cursor-aim yaw offset from the facing (0 under mouse look)
    launch(state, gag, p.x, p.y, a, 'player');
    const empty = gag.id === 'flamethrower' && state.fuel <= 0;
    state.plate = { name: gag.name, line: empty ? 'Empty. Ten seconds was all it ever had.' : (gag.line || ''), tier: empty ? 'dud' : gag.tier, t: 0, id: gag.id };
    state.events.push({ type: 'fire', gag, x: p.x, y: p.y, a, empty });
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
          const v = gag.speedVar != null ? gag.speedVar : 0.4;   // a volley's speed spread: 0.4 = 80-120% (speedVar per gag; the baseballs 0.9 = 55-145%)
          const sp = gag.speed * (n > 1 ? 1 - v / 2 + state.rand() * v : 1);
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
        if (gag.id === 'flamethrower' && state.fuel <= 0) return;   // the tank is dry
        state.emitters.push({ gag, t: 0, dur: gag.dur, rate: gag.rate, acc: 0, hostile, owner, aIsPlayer: owner === 'player', ox, oy, a });
        return;
      case 'area': {
        const tgt = aimPoint(state, gag.mode === 'wander' ? ox : ox, oy, a, gag.mode === 'wander' ? 3 : 7, hostile);
        spawnZone(state, gag, tgt.x, tgt.y, hostile, owner, { x: ox, y: oy, a });
        return;
      }
      case 'drop': {
        const tgt = aimPoint(state, ox, oy, a, 7, hostile);
        state.zones.push({ id: nextId++, gag, mode: 'drop', x: tgt.x, y: tgt.y, t: 0, dur: gag.fallT, r: gag.splash || 0.8, hostile, owner, sprite: gag.sprite, done: false });
        return;
      }
      case 'melee': {
        state.shots.push({ id: nextId++, gag, kind: 'melee', sprite: gag.sprite, x: mx, y: my, z: 0.45, a, t: 0, life: gag.swingLife || 0.45, reach: gag.reach, hostile, owner, dead: false, visual: true });   // swingLife: a slower swing for the fist (James)
        // the reach lands a beat in: the sprite lunges first
        state.zones.push({ id: nextId++, gag, mode: 'meleehit', x: ox, y: oy, a, t: 0, dur: 0.12, hostile, owner, done: false });
        return;
      }
      case 'train': {
        // straight down the barrel — it used to snap to the nearest grid axis (James 2026-09-10: "not really aiming from the weapon")
        const ax = Math.cos(a), ay = Math.sin(a);
        state.shots.push({ id: nextId++, gag, kind: 'train', sprite: gag.sprite, x: ox + ax * 1.1, y: oy + ay * 1.1, z: 0.5, a: Math.atan2(ay, ax), dx: ax, dy: ay, speed: gag.speed, breaks: gag.breaks, t: 0, life: 12, hostile, owner, hit: new Set(), dead: false, width: gag.width });
        return;
      }
      case 'summon': {
        state.shots.push({ id: nextId++, gag, kind: 'summon', sprite: gag.sprite, x: mx, y: my, z: 0.35, a, speed: gag.speed, turn: gag.turn, life: gag.life, t: 0, hitR: gag.hitR, pierce: !!gag.pierce, hostile, owner, hit: new Set(), dead: false, walker: true });   // pierce: the bees sting one after another (2026-09-11)
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

  function spawnZone(state, gag, x, y, hostile, owner, from) {
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
    if (gag.mode === 'wander' && from) { z.vx = Math.cos(from.a) * gag.speed; z.vy = Math.sin(from.a) * gag.speed; }   // it sets off down the aim (the tornado)
    if (gag.mode === 'wave' && from) { z.x = from.x; z.y = from.y; z.a = from.a; z.front = 0; z.laid = 0; }   // THE WAVE (the gravy, 2026-09-11): a fan from the muzzle down the aim; the front rolls out to gag.range over gag.dur
    if (gag.mode === 'pull' && gag.travel && from) {   // the black hole flows forward as a dark sphere first (James 2026-09-10)
      z.tx = x; z.ty = y; z.sx = from.x + Math.cos(from.a) * 0.6; z.sy = from.y + Math.sin(from.a) * 0.6; z.x = z.sx; z.y = z.sy; z.dur += gag.travel;
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
  const TORNADO_BURST = 3.0, DROP_T = 0.6;   // the tornado: 1.3 s up the funnel, a ride at the top, apart at 3 s; a dropped creature falls for 0.6 s
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
    if (outcome === 'fling' && gag.id === 'tornado') { g.vx = g.vy = 0; g.dieDur = TORNADO_BURST + 0.4; g.rideZone = from && from.zone != null ? from.zone : null; }   // the tornado keeps its catch: up the funnel, a ride, apart at the top (James 2026-09-10); it rides WITH the funnel and a tornado that ends first drops it back alive (2026-09-11)
    else if (outcome === 'fling') {
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
    const dmg = (gag.dmg != null ? gag.dmg : TIER_PLAYER_DMG[gag.tier] || 0) * (state.opts.damageMul == null ? 1 : state.opts.damageMul);   // 0 means none (the dial goes to 0; `|| 1` made it full)
    if (dmg <= 0) { state.events.push({ type: 'graze', gag, source }); return; }
    // armor takes two thirds of any hit while it lasts (2026-09-11)
    let absorbed = 0;
    if (p.armor > 0) { absorbed = Math.min(p.armor, dmg * 2 / 3); p.armor -= absorbed; }
    p.hp -= dmg - absorbed;
    p.fx.hurt = 0.5;
    state.events.push({ type: 'hurt', dmg: dmg - absorbed, absorbed, gag, source });
    if (p.hp <= 0) {
      p.hp = 0; p.armor = 0;
      state.phase = 'dead';
      state.deaths++;
      state.lives = Math.max(0, state.lives - 1);
      state.deathBy = { verb: gag.verb || (gag.outcome && OUTCOMES[gag.outcome] ? OUTCOMES[gag.outcome].verb : 'DONE IN'), name: gag.name || 'SOMETHING', source };
      state.events.push({ type: 'death', by: state.deathBy, lives: state.lives });
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
    stepWaves(state, dt);
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
    // THE RUN BURST: shift starts a burst (burstDur seconds at burstMul × walk) when the cooldown is over; then burstCool
    // seconds before the next; holding shift through it does not start another — let go and press again (James 2026-09-12)
    if (p.burst > 0) { p.burst -= dt; if (p.burst <= 0) { p.burst = 0; p.burstCool = o.burstCool == null ? 2 : o.burstCool; state.events.push({ type: 'burst-end' }); } }
    else if (p.burstCool > 0) p.burstCool = Math.max(0, p.burstCool - dt);
    if (input.run && !p.runHeld && p.burst <= 0 && p.burstCool <= 0) { p.burst = o.burstDur == null ? 2 : o.burstDur; state.events.push({ type: 'burst' }); }
    p.runHeld = !!input.run;
    const sp = o.moveSpeed * (p.burst > 0 ? (o.burstMul == null ? 1.9 : o.burstMul) : 1) * slow;
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
    // pies: a bite when you are hurt; a full belly walks past
    if (p.hp < p.maxHp) for (const h of state.heals) {
      if (h.taken || Math.hypot(h.x - p.x, h.y - p.y) > 0.6) continue;
      h.taken = true;
      const was = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + (state.opts.healHp == null ? 35 : state.opts.healHp));
      state.events.push({ type: 'heal', x: h.x, y: h.y, hp: p.hp, gained: p.hp - was });
    }
    // armor: a breastplate is +50, a helm +15, to 100; a full suit walks past
    if (p.armor < p.maxArmor) for (const a of state.armors) {
      if (a.taken || Math.hypot(a.x - p.x, a.y - p.y) > 0.6) continue;
      a.taken = true;
      const was = p.armor;
      p.armor = Math.min(p.maxArmor, p.armor + (a.kind === 'plate' ? 50 : 15));
      state.events.push({ type: 'armor', x: a.x, y: a.y, kind: a.kind, armor: p.armor, gained: p.armor - was });
    }
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
    // the flamethrower streams while the trigger is held, off a ten-second tank that never refills; no re-roll mid-stream
    const fe = state.emitters.find((e) => e.owner === 'player' && e.gag.id === 'flamethrower' && e.t < e.dur);
    if (fe) {
      state.fuel = Math.max(0, state.fuel - dt);
      if (state.fuel <= 0) fe.dur = fe.t;
      else if (input.fire) { fe.dur = Math.max(fe.dur, fe.t + 0.12); p.cool = Math.max(p.cool, 0.2); }
    }
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
      const ox = e.aIsPlayer ? p.x : e.ox, oy = e.aIsPlayer ? p.y : e.oy, a = e.aIsPlayer ? p.a + (p.aim || 0) : e.a;   // the stream follows the rifle's aim, not just the facing (James)
      while (e.acc >= 1) {
        e.acc -= 1;
        const aa = a + (state.rand() - 0.5) * (e.gag.jitter != null ? e.gag.jitter : 0.24);   // a hose (glue) barely wanders; the flame licks about (James 2026-09-10)
        const sp = e.gag.speed * (0.85 + state.rand() * 0.3);
        state.shots.push({
          id: nextId++, gag: e.gag, kind: 'bolt', sprite: e.gag.sprite, x: ox + Math.cos(aa) * 0.5, y: oy + Math.sin(aa) * 0.5, z: 0.3 + state.rand() * 0.25, a: aa,
          vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: e.gag.range / sp, t: 0, hitR: e.gag.hitR, pierce: false, bounce: false, hostile: e.hostile, owner: e.owner,
          hit: new Set(), ox, oy, splash: 0, dead: false, drop: !(e.gag.pools && state.rand() < e.gag.pools), wallScar: state.rand() < 0.12,   // pools: a few drops land as the scar (lava, 2026-09-10)
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
        if (s.hold > 0) s.hold -= dt;   // the swarm stays on its victim a while (gag.sting) before hunting the next (James 2026-09-11)
        else { const o = { x: s.x, y: s.y }; moveCircle(state, o, Math.cos(s.a) * s.speed * dt, Math.sin(s.a) * s.speed * dt, 0.2); s.x = o.x; s.y = o.y; }
        boltHits(state, s);
        const next = target ? Math.hypot(target.x - s.x, target.y - s.y) : Infinity;
        if (s.t >= s.life || (s.pierce && !target && s.t > 0.5) || (s.pierce && s.hit.size > 0 && !(s.hold > 0) && next > (s.gag.stingReach || 3.5))) { s.dead = true; state.events.push({ type: 'gone', gag: s.gag, x: s.x, y: s.y }); }   // the first victim for sure; a second or third only if close by (James 2026-09-11); nobody left = leave
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
        if (s.kind === 'summon' && s.gag.sting) { s.hold = s.gag.sting; s.x = g.x; s.y = g.y; }   // park on the victim
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
        const tr = z.tx != null ? g.travel : 0;
        if (z.t < tr) { const u = z.t / tr, e = u * u * (3 - 2 * u); z.x = z.sx + (z.tx - z.sx) * e; z.y = z.sy + (z.ty - z.sy) * e; }   // the flight out
        else if (z.tx != null) { z.x = z.tx; z.y = z.ty; }
        const k = z.t < tr ? 0 : Math.min(1, (z.t - tr) / 0.4);
        for (const t of state.goons) {
          if (t.state === 'dead') continue;
          if (t.state === 'dying') { if (t.gagId === g.id && k > 0) { const f = Math.min(1, dt * 5); t.x += (z.x - t.x) * f; t.y += (z.y - t.y) * f; } continue; }   // the caught are sucked into the centre (James 2026-09-10)
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
      } else if (z.mode === 'wave') {
        const k = Math.min(1, z.t / z.dur), e = 1 - (1 - k) * (1 - k) * (1 - k);   // fast out of the gun, slowing as it spreads
        z.front = g.range * e;
        const inFan = (t) => { const d = Math.hypot(t.x - z.x, t.y - z.y); if (d > z.front + t.r || d > g.range) return false; if (d < 0.3) return true; return Math.abs(angDiff(Math.atan2(t.y - z.y, t.x - z.x), z.a)) < g.spread + t.r / Math.max(0.3, d); };
        if (z.hostile) { if (z.hurtT <= 0 && inFan(p)) { hurtPlayer(state, g, z.owner); z.hurtT = 9; } if (z.hurtT > 0) z.hurtT -= dt; }
        else for (const t of state.goons) { if (t.state === 'dead' || t.state === 'dying' || t.isBoss && !inFan(t)) continue; if (inFan(t) && lineOfSight(state, z.x, z.y, t.x, t.y)) hitGoon(state, t, g, { x: z.x, y: z.y }); }
        if (g.scar) while (z.laid < Math.floor(z.front / 1.1)) {   // the gravy lies where it flowed: a pool every cell or so, scattered across the fan
          z.laid++; const d = z.laid * 1.1, aa = z.a + (state.rand() - 0.5) * 2 * g.spread * 0.8;
          const sx = z.x + Math.cos(aa) * d, sy = z.y + Math.sin(aa) * d;
          if (cellAt(state.level, sx, sy) === OPEN && lineOfSight(state, z.x, z.y, sx, sy)) addScar(state, g.scar, sx, sy, g);
        }
        if (z.t >= z.dur + 0.8) { z.dead = true; state.events.push({ type: 'gone', gag: g, x: z.x, y: z.y }); }
      } else if (z.mode === 'wander') {
        if (state.rand() < dt * 1.5) {   // it heads for the nearest creature, else away from the gun, with a little waver (James 2026-09-10: 'travels away from the gun towards the bad guys pretty reliably')
          const tgt = z.hostile ? p : nearestGoon(state, z.x, z.y);
          let a = tgt ? Math.atan2(tgt.y - z.y, tgt.x - z.x) : Math.atan2(z.y - p.y, z.x - p.x);
          if (state.rand() < 0.25) a = state.rand() * TAU; else a += (state.rand() - 0.5) * 0.8;
          z.vx = Math.cos(a) * g.speed; z.vy = Math.sin(a) * g.speed;
        }
        const o = { x: z.x, y: z.y };
        const hit = moveCircle(state, o, z.vx * dt, z.vy * dt, 0.4);
        if (hit.x) z.vx = -z.vx;
        if (hit.y) z.vy = -z.vy;
        z.x = o.x; z.y = o.y; z.a += dt * 9;
        for (const t of state.goons) {
          if (t.state === 'dead' || t.state === 'dying') continue;
          if (Math.hypot(t.x - z.x, t.y - z.y) < z.r + t.r) hitGoon(state, t, g, { x: z.x, y: z.y, zone: z.id });
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
        if (g.gagId === 'tornado' && g.outcome === 'fling' && !g.isBoss) {   // the ride: the caught creature travels with its funnel; if the tornado runs out before the burst it falls back alive (James 2026-09-11)
          const z = state.zones.find((z) => z.id === g.rideZone && !z.dead);
          if (z) { g.x = z.x; g.y = z.y; }
          else if (g.dieT < TORNADO_BURST) {
            g.state = 'idle'; g.hp = 1; g.outcome = null; g.gagId = null; g.dropped = DROP_T; g.stagger = 0.9; g.wanderT = 1 + state.rand() * 2; g.path = null; g.rideZone = null;
            state.kills = Math.max(0, state.kills - 1);
            state.events.push({ type: 'dropped', goon: g, x: g.x, y: g.y });
            continue;
          }
        }
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
          if (g.isBoss) { state.phase = 'won'; state.doorOpen = true; state.events.push({ type: 'won' }); }   // his door opens (2026-09-11)
        }
        continue;
      }
      if (g.dropped > 0) g.dropped -= dt;
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
          // lab creatures drift about their pad and come back to it
          if (g.home) g.target = { x: g.home.x + Math.cos(a) * 0.8, y: g.home.y + Math.sin(a) * 0.8 };
          else g.target = { x: g.x + Math.cos(a) * 2.5, y: g.y + Math.sin(a) * 2.5 };
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
        const wp = g.weapon ? WEAPONS[g.weapon] : null;
        if (dist < def.reach + (wp ? wp.reach : 0) + p.r) {
          g.a = Math.atan2(p.y - g.y, p.x - g.x);
          g.atkT -= dt;
          if (g.atkT <= 0) { g.atkT = def.atk * (wp ? wp.atkMul : 1); g.windup = wp ? wp.windup : 0.3; state.events.push({ type: 'swing', goon: g, weapon: g.weapon }); }
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
          if (g.windup <= 0 && dist < def.reach + (wp ? wp.reach : 0) + p.r + 0.2) hurtPlayer(state, { name: 'A ' + def.name + (wp ? (/^[AEIOU]/.test(wp.name) ? ' WITH AN ' : ' WITH A ') + wp.name : ''), verb: wp ? wp.verb : 'BEATEN', tier: 'x', dmg: def.dmg * (wp ? wp.dmgMul : 1) }, 'goon');   // 'WITH AN AXE' (2026-09-12)
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

  // REINFORCEMENTS (James 2026-09-12: 'endless bad guys… once you kill the first whole set in a given space, then fewer
  // spawn — say there's 12 in an area and you kill them all, a clock starts and after 6 seconds 4 more come out'): a space
  // is a district (a room and the corridors that join it). Every goon remembers the district it was dealt to; when that
  // district's whole set is down (dead, dying or pacified) its clock runs (waveDelay) and waveFrac of the first set comes
  // back — out of your sight, well away from you, the far side of the space preferred — and again each time those fall,
  // for as long as you stay. waveFrac 0 is the old one-set level. Mazes only: not the arena, not the lab. Corpses beyond
  // twenty go, oldest first, so a long stay never piles up bodies.
  const CORPSES_KEPT = 20;
  function initWaves(state) {
    const L = state.level; state.waves = null;
    if (!L.district || L.arena || L.lab || L.exit || !L.rooms.length) return;
    const waves = {};
    for (const g of state.goons) {
      g.district = Math.max(0, L.district[Math.floor(g.y) * L.w + Math.floor(g.x)]);
      const w = waves[g.district] || (waves[g.district] = { first: 0, clock: -1, sent: 0 });
      w.first++;
    }
    state.waves = waves;
  }
  function stepWaves(state, dt) {
    const W = state.waves; if (!W) return;
    const frac = state.opts.waveFrac == null ? DEFAULTS.waveFrac : state.opts.waveFrac;
    if (frac <= 0) return;
    const delay = state.opts.waveDelay == null ? DEFAULTS.waveDelay : state.opts.waveDelay;
    const alive = {};
    for (const g of state.goons) if (g.state !== 'dead' && g.state !== 'dying' && g.state !== 'pacified' && g.district != null) alive[g.district] = (alive[g.district] || 0) + 1;
    for (const d in W) {
      const w = W[d];
      if (alive[d]) { w.clock = -1; continue; }
      if (w.clock < 0) { w.clock = delay; continue; }
      w.clock -= dt;
      if (w.clock > 0) continue;
      const sent = spawnWave(state, +d, Math.max(1, Math.round(w.first * frac)));
      if (sent) { w.sent += sent; w.clock = -1; } else w.clock = 2;   // nowhere out of your sight just now: try again shortly
    }
    // the corpse cap
    let dead = 0;
    for (const g of state.goons) if (g.state === 'dead' && !g.isBoss) { if (g.deadAt == null) g.deadAt = state.t; dead++; }
    if (dead > CORPSES_KEPT) {
      const gone = state.goons.filter((g) => g.state === 'dead' && !g.isBoss).sort((a, b) => a.deadAt - b.deadAt).slice(0, dead - CORPSES_KEPT);
      state.goons = state.goons.filter((g) => !gone.includes(g));
    }
  }
  // n fresh goons into district d: open cells of it at least six away from you and out of your line of sight, never the
  // key's cell or on top of somebody; dealt from the far third
  function spawnWave(state, d, n) {
    const L = state.level, p = state.player;
    const cells = [];
    for (let y = 1; y < L.h - 1; y++) for (let x = 1; x < L.w - 1; x++) {
      const c = y * L.w + x;
      if (L.map[c] !== OPEN || L.district[c] !== d) continue;
      const cx = x + 0.5, cy = y + 0.5, dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist < 6) continue;
      if (L.key && Math.floor(L.key.x) === x && Math.floor(L.key.y) === y) continue;
      if (state.goons.some((g) => g.state !== 'dead' && Math.hypot(g.x - cx, g.y - cy) < 0.8)) continue;
      if (lineOfSight(state, p.x, p.y, cx, cy)) continue;
      cells.push({ x: cx, y: cy, dist });
    }
    if (!cells.length) return 0;
    cells.sort((a, b) => b.dist - a.dist);
    const pool = cells.slice(0, Math.max(n * 3, Math.ceil(cells.length / 3)));
    let sent = 0;
    for (let i = 0; i < n && pool.length; i++) {
      const c = pool.splice(Math.floor(state.rand() * pool.length), 1)[0];
      const g = makeGoon(weightedType(state.rand, L.mix), c.x, c.y, state.rand);
      g.district = d; g.wave = true; g.wanderT = 0.3 + state.rand();
      state.goons.push(g); sent++;
      state.events.push({ type: 'wave', goon: g, x: g.x, y: g.y, district: d });
    }
    return sent;
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
    const live = liveGags().filter((g) => g.kind !== 'train');
    const tier = rollTier(state, live);
    let pool = live.filter((g) => g.tier === tier && !b.recent.includes(g.id));
    if (!pool.length) pool = live.filter((g) => g.tier === tier);
    if (!pool.length) pool = live.length ? live : GAGS;
    const g = pool[Math.floor(state.rand() * pool.length)];
    b.recent.push(g.id); if (b.recent.length > 6) b.recent.shift();
    return g;
  }

  // ---------------------------------------------------------------- flow
  function nextLevel(state) {
    if (state.n === 'lab' || state.n >= LEVELS.length) return false;
    startLevel(state, state.n + 1);
    return true;
  }
  // AGAIN costs nothing more than the life already spent; with no lives left there is no again (the host shows GAME OVER)
  function retryLevel(state) {
    if (state.lives <= 0) return false;
    startLevel(state, state.n);
    state.player.hp = 100; state.player.armor = 100;   // a retry is a level start: full, like every level (2026-09-12)
    return true;
  }
  function goonsLeft(state) { return state.goons.filter((g) => g.state !== 'dead' && g.state !== 'dying' && g.state !== 'pacified').length; }

  globalThis.JabberwockyCore = {
    VERSION: 3, DEFAULTS, GOON_TYPES, WEAPONS, LEVELS, MAZES, PITCH, LAB_LEVEL, LAB_PADS, OUTCOMES, SCARS, GAGS, CELL: { OPEN, WALL_A, WALL_B, WALL_C, WALL_D, DOOR, DRIFT, PROP },
    hashStr, mulberry, makeMaze, buildLevel, bfs, bfsPath, cellAt, solidAt, castRay, lineOfSight, aimPoint,
    newGame, startLevel, nextLevel, retryLevel, step, fire, rollGag, bossRoll, launch, hitGoon, hurtPlayer, addScar, goonsLeft, angDiff,
    makeLabGoon, respawnLabGoon, liveGags, rollTier, spawnWave, stepWaves,
  };
})();
