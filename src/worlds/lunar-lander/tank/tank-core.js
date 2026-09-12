// Moon Battle 2100 — the TANK core.
//
// The ground half of the game: the pilot has climbed out of the lander into a
// lunar tank and fights among the same structures the lander flew over. First
// person, Battlezone as the spiritual guide, built the 2026 way.
//
// Everything that is a rule lives here: the ground (the lander's own chunked
// moon, softened for wheels, with relief across the flight line and each
// structure's footprint flattened), the tank (the hull on the keys, the view
// on the mouse, the gun following the view with mass — TURRET), the shell
// (one in the air, lunar gravity), the laser blast (a charge), the hull (two
// hits absorbed, the third kills), the enemies (slow tank, medium tank, the
// SAM sites already in the chunk data), scoring on the lander's X ratings,
// civilians never targetable, and the missions (five, then the boss).
//
// Pure: no DOM, no timers, no Math.random (seeded rng only). Fixed 1/120 s
// step. Loads AFTER structures.js (LunarStructures) and game-core.js
// (LunarCore) — the moon is read through LunarCore, never copied. Shared
// verbatim with tmp/lunar-lander/tank-sim.mjs; keep it pure or the sim lies.
// Exposes globalThis.LunarTankCore.
(function () {
  'use strict';

  const DT = 1 / 120;
  const CHUNK_W = 4000;
  const GRAVITY = 5.3;                // ft/s², the Moon

  // ---- the tank ---------------------------------------------------------------
  const TANK = {
    length: 22, width: 14, hullH: 7,  // feet; the collision body
    eye: 9.5,                         // the commander's eye above the ground
    topSpeed: 62, reverse: 28,        // ft/s
    accel: 34, brake: 70,             // ft/s²
    turnRate: 1.05,                   // rad/s at full lock
    turnAccel: 5.5,                   // rad/s² — the turn eases in and out
    pitchMax: 0.42, pitchMin: -0.22,  // look up / down, radians
    pitchRate: 2.4,                   // rad/s the look moves under the keys (the mouse sets it directly)
    hits: 3,                          // the third hit kills
    lives: 3,
  };
  // ---- the turret (2026-09-07, James: "the way the steering works... so goofy") -----
  // The commander's VIEW is the mouse: instant, free, any way round (t.look /
  // t.pitch). The GUN follows the view with mass: it slews toward it at a
  // capped rate, easing in as it arrives, never so slow that a shot is lost
  // (t.turret / t.gunPitch). The HULL is the keys (t.heading): W S drive it,
  // A D turn it, independent of where the view points. Shots leave along the
  // gun, not the view.
  const TURRET = {
    yawRate: 6.5,                     // rad/s, the gun's fastest slew (James, 2026-09-07: "I can't tell what the hell's going on with the aiming" — the crosshair IS the aim now; the lag is a breath, not a wait)
    pitchRate: 4.0,                   // rad/s up and down
    accel: 40.0,                      // rad/s²: the slew eases in and out
    gain: 14.0,                       // proportional: slew = gain × the angle left, capped at yawRate
  };
  // ---- the shell ------------------------------------------------------------------
  // muzzleAhead / muzzleDown: where the shell leaves, under the barrel the renderer draws
  // (2026-09-09); bodyPad: how close a shell must pass a hull to strike it (the hit body is
  // the hull's own box now, not a sphere twice its height)
  const SHELL = { speed: 520, life: 4.5, radius: 10, bodyPad: 4, muzzleAhead: 16, muzzleDown: 2.2, reload: 0.8 };   // reload, not one-in-the-air (James, 2026-09-08): walk fire onto a target
  // ---- the laser --------------------------------------------------------------------
  const LASER = { range: 1400, recharge: 6.0, radius: 6, beamLife: 0.22 };
  // ---- the enemies ---------------------------------------------------------------------
  // `mult` is the X rating on the lander's scale: points = 100 × mult.
  const ENEMY = {
    slow:   { name: 'TANK',        mult: 1, speed: 24, turn: 0.55, range: 780, reload: 5.2, shellSpeed: 260, hp: 1, length: 24, width: 15, hullH: 8 },
    medium: { name: 'FAST TANK',   mult: 2, speed: 44, turn: 1.0,  range: 860, reload: 3.6, shellSpeed: 300, hp: 1, length: 21, width: 13, hullH: 6 },
    boss:   { name: 'SIEGE TANK',  mult: 5, speed: 30, turn: 0.7,  range: 1000, reload: 2.4, shellSpeed: 320, hp: 6, length: 44, width: 26, hullH: 14 },
  };
  const SAM = { range: 1100, reload: 6.5, missileSpeed: 150, missileTurn: 0.9, missileLife: 9, radius: 8, doorOpen: 2.0 };
  const SPAWN_MIN = 1900, SPAWN_MAX = 2800;   // ft from the tank, where a wave appears (was 1300–2200: "in the freaking kill box")
  const START_CLEAR = 1300;                   // ft: no hostile structure this near the start
  const RADAR_RANGE = 1600;

  // ---- the missions -------------------------------------------------------------------
  // Each mission is a stretch of the lander's chunks. It is complete when every
  // hostile structure in the stretch is dead and every wave has been spawned
  // and killed. Waves come when the field is nearly clear.
  const MISSIONS = [
    null,
    { name: 'FIRST PATROL',   chunks: [1, 2], waves: [{ slow: 2 }, { slow: 3 }] },
    { name: 'THE OUTPOST',    chunks: [3, 4], waves: [{ slow: 2, medium: 1 }, { slow: 2, medium: 1 }, { medium: 2 }] },
    { name: 'CROSSFIRE',      chunks: [5, 6], waves: [{ slow: 3, medium: 1 }, { medium: 2 }, { slow: 2, medium: 2 }] },
    { name: 'THE LONG FIELD', chunks: [7, 9], waves: [{ slow: 2, medium: 2 }, { medium: 3 }, { slow: 3, medium: 2 }] },
    { name: 'HOLD THE LINE',  chunks: [10, 12], waves: [{ medium: 3 }, { slow: 3, medium: 3 }, { medium: 4 }] },
    { name: 'THE SIEGE',      chunks: [13, 14], waves: [{ medium: 2 }, { boss: 1, medium: 2 }] },
  ];

  const DEFAULTS = { seed: 1, mission: 1, lives: TANK.lives, structureSpread: 420, spawnGrace: 7.0 };

  // ---- rng --------------------------------------------------------------------------------
  const C = () => globalThis.LunarCore;
  const S = () => globalThis.LunarStructures;
  function hash01(seed, k) { return C().hashSeed(seed, k) / 4294967296; }

  // ---- the ground ---------------------------------------------------------------------------
  // The lander's flight profile runs along x. Wheels want gentler ground than a
  // ship's plot: heights above each chunk's base are compressed (tanh) and
  // averaged over 100 ft; across the flight line a little hashed relief rolls
  // in z; every structure flattens the ground under its footprint (blended at
  // the edge). Physics ask THIS function, nothing else.
  const SOFT = 80;          // ft: the compression scale for hills (a 900 ft mountain is an 80 ft rise here)
  const RELIEF_A = 9, RELIEF_L = 500, RELIEF_B = 2.5, RELIEF_LB = 130;
  const RELIEF_C = 22, RELIEF_LC = 1500;   // the long swell across the flight line (2026-09-07: so the contours close into a moon, not a grid)
  const FLAT_MARGIN = 40;   // ft: the blend from natural ground to a structure's flat
  function baseAt(state, x) {
    const k = Math.floor(x / CHUNK_W);
    const a = C().seamLevel(state.seed, k), b = C().seamLevel(state.seed, k + 1);
    const t = (x - k * CHUNK_W) / CHUNK_W;
    return a + (b - a) * t;
  }
  function valueNoise(seed, x, z, L, salt) {
    const gx = Math.floor(x / L), gz = Math.floor(z / L);
    const fx = x / L - gx, fz = z / L - gz;
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const h = (i, j) => hash01(seed, (i * 7919 + j * 104729 + salt * 31) | 0);
    const a = h(gx, gz), b = h(gx + 1, gz), c = h(gx, gz + 1), d = h(gx + 1, gz + 1);
    return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz - 0.5;
  }
  // The softened profile, cached per chunk at PROF_STEP ft: the lander's plot
  // averaged over ±200 ft with a triangle kernel sampled every 10 ft (a pad's
  // 50 ft wall or a rough-zone spike becomes a rise a tank can take), then
  // heights above the chunk's base compressed through tanh(SOFT).
  const PROF_STEP = 5;
  function profileAt(state, x) {
    const k = Math.floor(x / CHUNK_W);
    let prof = state.prof[k];
    if (!prof) {
      const land = state.land;
      const n = CHUNK_W / PROF_STEP + 1;
      prof = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const xx = k * CHUNK_W + i * PROF_STEP;
        let g = 0, wsum = 0;
        for (let j = -20; j <= 20; j++) { const w = 21 - Math.abs(j); g += w * C().groundAt(land, xx + j * 10); wsum += w; }
        g /= wsum;
        const b = baseAt(state, xx);
        prof[i] = b + SOFT * Math.tanh((g - b) / SOFT);
      }
      state.prof[k] = prof;
    }
    const u = (x - k * CHUNK_W) / PROF_STEP;
    const i = Math.min(prof.length - 2, Math.max(0, Math.floor(u)));
    const t = Math.min(1, Math.max(0, u - i));
    return prof[i] + (prof[i + 1] - prof[i]) * t;
  }
  function naturalAt(state, x, z) {
    return profileAt(state, x) + RELIEF_C * 2 * valueNoise(state.seed, x, z, RELIEF_LC, 9) + RELIEF_A * 2 * valueNoise(state.seed, x, z, RELIEF_L, 3) + RELIEF_B * 2 * valueNoise(state.seed, x, z, RELIEF_LB, 5);
  }
  // Structures with their depth position. Cached per chunk on the tank state:
  // each gets a hashed z within ±structureSpread of the flight line and the
  // level it stands at (its natural ground, so the flat has no step at the
  // centre).
  function chunkStructures(state, k) {
    const cache = state.structs;
    if (cache[k]) return cache[k];
    const ch = C().getChunk(state.land, k);
    const out = [];
    const spread = state.opts.structureSpread;
    for (const st of ch.structures) {
      const kind = S().BY_ID[st.id];
      const cx = (st.x0 + st.x1) / 2;
      const n = out.length;
      const z = (hash01(state.seed, k * 977 + n * 131 + 17) - 0.5) * 2 * spread;
      const d = kind ? kind.d : 30;
      const o = { st: st, sid: st.sid, id: st.id, name: st.name, cls: st.cls, mult: st.mult, hard: st.hard, k: k,
        x: cx, z: z, w: st.x1 - st.x0, h: st.h, d: d, x0: st.x0, x1: st.x1, z0: z - d / 2, z1: z + d / 2,
        y: 0, alive: st.alive !== false, hp: st.hard === 'shield' ? 2 : 1, door: 0, reload: 0, fired: 0 };
      o.y = naturalAt(state, cx, z);
      out.push(o);
    }
    cache[k] = out;
    return out;
  }
  function structuresNear(state, x, z, reach) {
    const out = [];
    const k0 = Math.floor((x - reach) / CHUNK_W), k1 = Math.floor((x + reach) / CHUNK_W);
    for (let k = k0; k <= k1; k++) for (const o of chunkStructures(state, k)) {
      if (o.x1 < x - reach || o.x0 > x + reach) continue;
      if (z !== undefined && (o.z1 < z - reach || o.z0 > z + reach)) continue;
      out.push(o);
    }
    return out;
  }
  // distance from (x, z) to a structure's footprint box, 0 inside
  function boxDist(o, x, z) {
    const dx = x < o.x0 ? o.x0 - x : x > o.x1 ? x - o.x1 : 0;
    const dz = z < o.z0 ? o.z0 - z : z > o.z1 ? z - o.z1 : 0;
    return Math.hypot(dx, dz);
  }
  function groundAt(state, x, z) {
    let y = naturalAt(state, x, z);
    for (const o of structuresNear(state, x, z, FLAT_MARGIN + 1)) {
      const dist = boxDist(o, x, z);
      if (dist >= FLAT_MARGIN) continue;
      const t = 1 - dist / FLAT_MARGIN;
      const e = t * t * (3 - 2 * t);
      y = y + (o.y - y) * e;
    }
    return y;
  }
  // the slope under a heading: rise per foot travelled
  function slopeAlong(state, x, z, heading) {
    const dx = Math.sin(heading) * 6, dz = -Math.cos(heading) * 6;
    return (groundAt(state, x + dx, z + dz) - groundAt(state, x - dx, z - dz)) / 12;
  }

  // ---- the game ------------------------------------------------------------------------------
  function createGame(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const seed = o.seed >>> 0;
    const land = C().createGame({ seed: seed });
    const state = {
      opts: o, seed: seed, land: land,
      rng: C().mulberry32(C().hashSeed(seed, 4242)),
      structs: {}, prof: {},
      mission: 0, missionDef: null, wave: 0, waveT: 0, time: 0, missionTime: 0,
      phase: 'idle',      // idle | play | dead | complete | over
      score: 0, lives: o.lives, kills: 0,
      tank: null, shells: [], laser: { charge: 1, beam: null }, enemies: [], missiles: [], eshells: [],
      events: [], nextId: 1,
      log: [],
    };
    startMission(state, o.mission);
    return state;
  }
  function newTank(state, x, z, heading) {
    return { x: x, z: z, y: groundAt(state, x, z), heading: heading, turnV: 0, speed: 0,
      look: heading, pitch: 0,          // the view: yaw + pitch, absolute, the mouse's
      turret: heading, gunPitch: 0, turretV: 0,   // the gun: follows the view with mass
      hits: 0, alive: true, reload: 0, recoil: 0, grace: state.opts.spawnGrace };
  }
  // A mission starts the tank near the left edge of its stretch, facing down
  // the stretch (+x) — on the HIGHEST clear ground in the first 1,500 ft with
  // no hostile structure within START_CLEAR (James, 2026-09-07: "why do you
  // keep starting me in the freaking valley with everybody on top of me?").
  // Hostile structures in the stretch are the standing targets; the waves
  // come as data says, further out than they did.
  function startSpot(state, def) {
    const xa = def.chunks[0] * CHUNK_W + 260, xb = xa + 1500;
    // first the clearance (the nearest hostile, capped at START_CLEAR), then the height
    let best = null, bestD = -1, bestY = -1e9;
    for (let x = xa; x <= xb; x += 50) for (const z of [0, -220, 220, -440, 440, -660, 660]) {
      if (blocked(state, x, z, 16)) continue;
      let d = START_CLEAR;
      for (const o of structuresNear(state, x, z, START_CLEAR)) if (o.alive && o.cls !== 'civ') d = Math.min(d, Math.hypot(o.x - x, o.z - z));
      const y = groundAt(state, x, z) - Math.abs(z) * 0.01;   // high ground, the flight line preferred at a tie
      if (d > bestD + 40 || (d > bestD - 40 && y > bestY)) { bestD = Math.max(bestD, d); bestY = y; best = [x, z]; }
    }
    return best || [xa, 0];
  }
  function startMission(state, m) {
    const def = MISSIONS[m];
    if (!def) return false;
    state.mission = m;
    state.missionDef = def;
    state.wave = 0; state.waveT = 0; state.missionTime = 0;
    state.enemies = []; state.missiles = []; state.eshells = []; state.shells = [];
    state.laser = { charge: 1, beam: null };
    // make sure every chunk of the stretch exists (and its structures are placed)
    for (let k = def.chunks[0] - 1; k <= def.chunks[1] + 1; k++) chunkStructures(state, k);
    const sp = startSpot(state, def);
    state.start = sp;
    state.tank = newTank(state, sp[0], sp[1], Math.PI / 2);
    state.phase = 'play';
    spawnWave(state);
    return true;
  }
  function stretchHostiles(state) {
    const def = state.missionDef;
    const out = [];
    for (let k = def.chunks[0]; k <= def.chunks[1]; k++) for (const o of chunkStructures(state, k)) if (o.cls !== 'civ') out.push(o);
    return out;
  }
  function hostilesLeft(state) {
    let n = 0;
    for (const o of stretchHostiles(state)) if (o.alive) n++;
    for (const e of state.enemies) if (e.alive) n++;
    return n;
  }
  function spawnWave(state) {
    const def = state.missionDef;
    const w = def.waves[state.wave];
    if (!w) return false;
    state.wave++;
    const t = state.tank;
    const [k0, k1] = def.chunks;
    for (const kind of Object.keys(w)) {
      for (let i = 0; i < w[kind]; i++) {
        // ahead of the tank, spread across the stretch's width, never inside a footprint
        let x = 0, z = 0, ok = false;
        for (let tries = 0; tries < 40 && !ok; tries++) {
          const ang = (state.rng() - 0.5) * Math.PI * 1.1;     // mostly ahead (+x)
          const dist = SPAWN_MIN + state.rng() * (SPAWN_MAX - SPAWN_MIN);
          x = t.x + Math.cos(ang) * dist;
          z = t.z + Math.sin(ang) * dist;
          x = Math.max(k0 * CHUNK_W + 100, Math.min((k1 + 1) * CHUNK_W - 100, x));
          z = Math.max(-900, Math.min(900, z));
          ok = Math.hypot(x - t.x, z - t.z) >= SPAWN_MIN * 0.85;   // the clamp can pull it in: never inside the start's breathing room
          for (const o of structuresNear(state, x, z, 80)) if (boxDist(o, x, z) < 40) ok = false;
        }
        const E = ENEMY[kind];
        state.enemies.push({ id: state.nextId++, kind: kind, x: x, z: z, y: groundAt(state, x, z),
          heading: Math.atan2(t.x - x, -(t.z - z)), speed: 0, hp: E.hp, alive: true,
          reload: 1.5 + state.rng() * E.reload, strafe: state.rng() < 0.5 ? -1 : 1, strafeT: 2 + state.rng() * 4, mode: 'approach', age: 0 });
      }
    }
    state.events.push({ type: 'wave', wave: state.wave, of: def.waves.length });
    return true;
  }

  // heading: 0 = toward -z (the way the camera looks at rest), +x is heading π/2
  function forward(h) { return [Math.sin(h), -Math.cos(h)]; }
  function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  function headingTo(fx, fz, tx, tz) { return Math.atan2(tx - fx, -(tz - fz)); }

  // Can a body of half-width r stand at (x, z)? Structures are solid.
  function blocked(state, x, z, r) {
    for (const o of structuresNear(state, x, z, r + 2)) if (o.alive && boxDist(o, x, z) < r) return o;
    return null;
  }

  // input: { drive: -1|0|1, turn: -1..1 (the hull), look: rad (the view's yaw, absolute — the mouse; omit to
  //          let the view ride the hull), tilt: rad (the view's pitch, absolute; omit to use `pitch`),
  //          pitch: -1..1 (the keys' look target, legacy), fire: bool, laser: bool }
  function step(state, input) {
    const events = state.events;
    events.length = 0;
    if (state.phase !== 'play') return events;
    const t = state.tank;
    state.time += DT; state.missionTime += DT;
    if (t.grace > 0) t.grace -= DT;
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - DT * 4);

    // ---- drive ----
    const drive = input.drive | 0;
    const want = drive > 0 ? TANK.topSpeed : drive < 0 ? -TANK.reverse : 0;
    const slope = slopeAlong(state, t.x, t.z, t.heading);
    const grade = Math.max(0.45, 1 - Math.max(0, slope) * 1.4);     // uphill slows it, downhill does not speed it
    const target = want * (want > 0 ? grade : 1);
    if (Math.abs(target) > Math.abs(t.speed) && Math.sign(target) === Math.sign(t.speed || target)) t.speed += Math.sign(target) * TANK.accel * DT;
    else t.speed += (target - t.speed) * Math.min(1, TANK.brake * DT / Math.max(1, Math.abs(target - t.speed)));
    if (Math.abs(t.speed) < 0.05 && drive === 0) t.speed = 0;
    t.speed = Math.max(-TANK.reverse, Math.min(TANK.topSpeed, t.speed));
    // ---- turn (eased, never instant: motion restraint) ----
    // W goes where you LOOK (James, 2026-09-07: "W and S are reversed!" — after a mouse turn the
    // hull's own heading felt backwards): while driving, the hull swings toward the view
    // (S backs straight away from it); A D veer on top, and pivot the hull when standing.
    const align = drive !== 0 ? Math.max(-1, Math.min(1, wrapAngle(t.look - t.heading) * 2.5)) : 0;
    const turnWant = Math.max(-1, Math.min(1, align + (+input.turn || 0))) * TANK.turnRate;   // keys send ±1; an autopilot may send a fraction
    const dv = turnWant - t.turnV;
    t.turnV += Math.sign(dv) * Math.min(Math.abs(dv), TANK.turnAccel * DT);
    const turned = t.turnV * DT;
    t.heading = wrapAngle(t.heading + turned);
    // ---- the view: the mouse's yaw + pitch, absolute; with no mouse it rides the hull ----
    if (typeof input.look === 'number' && Number.isFinite(input.look)) t.look = wrapAngle(input.look);
    else t.look = wrapAngle(t.look + turned);
    if (typeof input.tilt === 'number' && Number.isFinite(input.tilt)) {
      t.pitch = Math.max(TANK.pitchMin, Math.min(TANK.pitchMax, input.tilt));
    } else {
      const pw = Math.max(-1, Math.min(1, +input.pitch || 0));
      const pitchWant = pw >= 0 ? pw * TANK.pitchMax : -pw * TANK.pitchMin;
      const dp = pitchWant - t.pitch;
      t.pitch += Math.sign(dp) * Math.min(Math.abs(dp), TANK.pitchRate * DT);
    }
    // ---- the gun follows the view with mass: a capped proportional slew that eases ----
    const left = wrapAngle(t.look - t.turret);
    const wantV = Math.max(-TURRET.yawRate, Math.min(TURRET.yawRate, left * TURRET.gain));
    t.turretV += Math.max(-TURRET.accel * DT, Math.min(TURRET.accel * DT, wantV - t.turretV));
    if (Math.abs(left) < 0.0015 && Math.abs(t.turretV) < 0.05) { t.turret = t.look; t.turretV = 0; }
    else t.turret = wrapAngle(t.turret + t.turretV * DT);
    const gp = t.pitch - t.gunPitch;
    t.gunPitch += Math.sign(gp) * Math.min(Math.abs(gp), TURRET.pitchRate * DT);
    // ---- move, sliding off anything solid ----
    const f = forward(t.heading);
    const nx = t.x + f[0] * t.speed * DT, nz = t.z + f[1] * t.speed * DT;
    const r = TANK.width * 0.6;
    if (!blocked(state, nx, nz, r)) { t.x = nx; t.z = nz; }
    else if (!blocked(state, nx, t.z, r)) { t.x = nx; t.speed *= 0.6; }
    else if (!blocked(state, t.x, nz, r)) { t.z = nz; t.speed *= 0.6; }
    else { if (Math.abs(t.speed) > 12) events.push({ type: 'bump' }); t.speed = 0; }
    t.y = groundAt(state, t.x, t.z);

    // ---- the shell: one in the air ----
    if (t.reload > 0) t.reload -= DT;
    const g = forward(t.turret);   // the gun's line, not the view's
    if (input.fire && t.reload <= 0) {
      const mz = muzzle(t), d = gunDir(t);
      state.shells.push({ x: mz[0], y: mz[1], z: mz[2], vx: d[0] * SHELL.speed, vy: d[1] * SHELL.speed, vz: d[2] * SHELL.speed, age: 0, mine: true });
      t.recoil = 1; t.reload = SHELL.reload;
      events.push({ type: 'fire' });
    }
    // ---- the laser: a charge, a line, the first thing on it ----
    const L = state.laser;
    L.charge = Math.min(1, L.charge + DT / LASER.recharge);
    if (L.beam) { L.beam.age += DT; if (L.beam.age > LASER.beamLife) L.beam = null; }
    if (input.laser && L.charge >= 1) {
      L.charge = 0;
      const mz = muzzle(t), dir = gunDir(t);
      const hit = rayHit(state, mz, dir, LASER.range, LASER.radius);
      L.beam = { x0: mz[0], y0: mz[1], z0: mz[2], x1: hit.x, y1: hit.y, z1: hit.z, age: 0 };
      events.push({ type: 'laser', hit: hit.what });
      if (hit.enemy) damageEnemy(state, hit.enemy, events, 'laser');
      else if (hit.structure) damageStructure(state, hit.structure, events, 'laser');
      else if (hit.missile) { hit.missile.alive = false; events.push({ type: 'missileDown', x: hit.x, y: hit.y, z: hit.z }); }
    }

    stepShell(state, events);
    stepEnemies(state, events);
    stepSams(state, events);
    stepMissiles(state, events);
    stepEnemyShells(state, events);

    // ---- waves + the mission's end ----
    if (state.phase === 'play') {
      const aliveEnemies = state.enemies.filter((e) => e.alive).length;
      if (aliveEnemies <= 1 && state.wave < state.missionDef.waves.length) {
        state.waveT += DT;
        if (state.waveT > 2.5) { state.waveT = 0; spawnWave(state); }
      }
      if (hostilesLeft(state) === 0 && state.wave >= state.missionDef.waves.length) {
        state.phase = 'complete';
        state.log.push({ mission: state.mission, time: +state.missionTime.toFixed(1), score: state.score });
        events.push({ type: 'complete', mission: state.mission, last: !MISSIONS[state.mission + 1] });
      }
    }
    return events;
  }

  // A ray against enemies, missiles and structure boxes; returns the nearest.
  function rayHit(state, o, d, range, radius) {
    let best = { t: range, what: 'none' };
    // enemies as their hull boxes (2026-09-09; they were spheres twice the hull's height)
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const tt = rayHull(o, d, e, e.x, e.z, radius);
      if (tt !== null && tt < best.t) best = { t: tt, what: 'enemy', enemy: e };
    }
    for (const m of state.missiles) {
      if (!m.alive) continue;
      const tt = raySphere(o, d, [m.x, m.y, m.z], SAM.radius + radius);
      if (tt !== null && tt < best.t) best = { t: tt, what: 'missile', missile: m };
    }
    for (const s of structuresNear(state, o[0], undefined, range)) {
      if (!s.alive) continue;
      const tt = rayBox(o, d, s);
      if (tt !== null && tt < best.t) best = { t: tt, what: s.cls === 'civ' ? 'civilian' : 'structure', structure: s };
    }
    // the ground: march it
    for (let tt = 20; tt < best.t; tt += 20) {
      const x = o[0] + d[0] * tt, y = o[1] + d[1] * tt, z = o[2] + d[2] * tt;
      if (y < groundAt(state, x, z)) { best = { t: tt, what: 'ground' }; break; }
    }
    return { t: best.t, what: best.what, enemy: best.enemy, missile: best.missile, structure: best.structure,
      x: o[0] + d[0] * best.t, y: o[1] + d[1] * best.t, z: o[2] + d[2] * best.t };
  }
  // The gun's muzzle and line (the shell's start), under the drawn barrel.
  function gunDir(t) {
    const g = forward(t.turret), cp = Math.cos(t.gunPitch), sp = Math.sin(t.gunPitch);
    return [g[0] * cp, sp, g[1] * cp];
  }
  function muzzle(t) {
    const g = forward(t.turret), cp = Math.cos(t.gunPitch), sp = Math.sin(t.gunPitch);
    const eye = t.y + TANK.eye - SHELL.muzzleDown;
    return [t.x + g[0] * cp * SHELL.muzzleAhead, eye + sp * SHELL.muzzleAhead, t.z + g[1] * cp * SHELL.muzzleAhead];
  }
  // An enemy's hit body: its hull box, turned to its heading, standing on the ground at
  // (cx, cz) — the caller passes where the hull IS or where it WILL BE (the lead).
  function hullLocal(e, cx, cz, x, y, z) {
    const sh = Math.sin(e.heading), ch = Math.cos(e.heading);
    const dx = x - cx, dz = z - cz;
    return [dx * ch + dz * sh, y - e.y, dx * sh - dz * ch];   // right, up, ahead
  }
  function inHull(e, cx, cz, x, y, z, pad) {
    const E = ENEMY[e.kind], l = hullLocal(e, cx, cz, x, y, z);
    return Math.abs(l[0]) < E.width / 2 + pad && l[1] > -pad && l[1] < E.hullH + pad && Math.abs(l[2]) < E.length / 2 + pad;
  }
  function rayHull(o, d, e, cx, cz, pad) {
    const E = ENEMY[e.kind];
    const lo = hullLocal(e, cx, cz, o[0], o[1], o[2]);
    const ld = hullLocal(e, cx, cz, cx + d[0], e.y + d[1], cz + d[2]);
    const mn = [-E.width / 2 - pad, -pad, -E.length / 2 - pad], mx = [E.width / 2 + pad, E.hullH + pad, E.length / 2 + pad];
    let t0 = 0, t1 = 1e9;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(ld[i]) < 1e-9) { if (lo[i] < mn[i] || lo[i] > mx[i]) return null; continue; }
      let a = (mn[i] - lo[i]) / ld[i], b = (mx[i] - lo[i]) / ld[i];
      if (a > b) { const q = a; a = b; b = q; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return null;
    }
    return t0;
  }
  // THE SOLUTION (2026-09-09, James: the reticle lit above the tank while the shell fell
  // short and behind): march the shell the gun would fire now, under gravity, until it
  // meets something — the ground, a structure, a missile, or a hull WHERE IT WILL BE when
  // the shell gets there (each enemy carried on at its speed and heading). Returns the arc
  // (a point every SOL_ARC steps), the landing point and what it is, and one lead ghost per
  // enemy: where its hull will stand when a shell fired now reaches its range.
  const SOL_DT = 0.04, SOL_ARC = 3;
  function shellSolution(state) {
    const t = state.tank;
    const o = muzzle(t), d = gunDir(t);
    let x = o[0], y = o[1], z = o[2], vx = d[0] * SHELL.speed, vy = d[1] * SHELL.speed, vz = d[2] * SHELL.speed;
    const near = structuresNear(state, t.x, t.z, 2600);
    const arc = [[x, y, z]];
    let impact = null, tau = 0;
    for (let i = 1; i * SOL_DT <= SHELL.life; i++) {
      vy -= GRAVITY * SOL_DT;
      x += vx * SOL_DT; y += vy * SOL_DT; z += vz * SOL_DT;
      tau = i * SOL_DT;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const f = forward(e.heading);
        if (inHull(e, e.x + f[0] * e.speed * tau, e.z + f[1] * e.speed * tau, x, y, z, SHELL.bodyPad)) { impact = { what: 'enemy', enemy: e }; break; }
      }
      if (impact) break;
      for (const m of state.missiles) if (m.alive && Math.hypot(x - m.x, y - m.y, z - m.z) < SAM.radius + SHELL.radius) { impact = { what: 'missile', missile: m }; break; }
      if (impact) break;
      for (const s of near) if (s.alive && inBox(s, x, y, z, 1)) { impact = { what: s.cls === 'civ' ? 'civilian' : 'structure', structure: s }; break; }
      if (impact) break;
      const gy = groundAt(state, x, z);
      if (y <= gy) { y = gy; impact = { what: 'ground' }; break; }
      if (i % SOL_ARC === 0) arc.push([x, y, z]);
    }
    if (!impact) impact = { what: 'none' };
    impact.x = x; impact.y = y; impact.z = z; impact.t = tau;
    impact.range = Math.round(Math.hypot(x - t.x, z - t.z));
    arc.push([x, y, z]);
    // the leads: where each hull will be when a shell fired now arrives at its range
    const leads = [];
    const cp = Math.max(0.05, Math.cos(t.gunPitch));
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const range = Math.hypot(e.x - t.x, e.z - t.z);
      if (range > RADAR_RANGE) continue;
      const ft = Math.min(SHELL.life, range / (SHELL.speed * cp));
      const f = forward(e.heading);
      const lx = e.x + f[0] * e.speed * ft, lz = e.z + f[1] * e.speed * ft;
      const E = ENEMY[e.kind];
      leads.push({ id: e.id, x: lx, y: groundAt(state, lx, lz), z: lz, hullH: E.hullH, width: E.width, length: E.length, heading: e.heading, moving: Math.abs(e.speed) * ft > 6, flight: ft });
    }
    return { arc: arc, impact: impact, leads: leads };
  }
  function raySphere(o, d, c, r) {
    const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
    const b = ox * d[0] + oy * d[1] + oz * d[2];
    const cc = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : (cc < 0 ? 0 : null);
  }
  function rayBox(o, d, s) {
    let t0 = 0, t1 = 1e9;
    const lo = [s.x0, s.y, s.z0], hi = [s.x1, s.y + s.h, s.z1];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return null; continue; }
      let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i];
      if (a > b) { const q = a; a = b; b = q; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return null;
    }
    return t0;
  }
  function inBox(s, x, y, z, r) {
    return x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r && y > s.y - r && y < s.y + s.h + r;
  }

  function damageEnemy(state, e, events, by) {
    e.hp -= 1;
    if (e.hp > 0) { events.push({ type: 'hit', x: e.x, y: e.y + 4, z: e.z, enemy: e }); return; }
    e.alive = false;
    const E = ENEMY[e.kind];
    const pts = 100 * E.mult;
    state.score += pts; state.kills++;
    events.push({ type: 'kill', x: e.x, y: e.y, z: e.z, kind: e.kind, points: pts, by: by, enemy: e });
  }
  // Hostile structures die to a hit (a shield takes two; a bunker's door must
  // be open — it opens for two seconds when its own SAM fires, the tank's
  // own timer since the SAM fires at the tank). Civilians absorb the shot and
  // pay nothing: never targetable, never harmed. The damage itself goes
  // through the LANDER core's `hitStructure` when it is there (2026-09-06,
  // the lander session's ask): one rule for shield / dead / the level count,
  // and the lander's chunk object flips so both halves see the same moon.
  function damageStructure(state, s, events, by) {
    if (s.cls === 'civ') { events.push({ type: 'absorbed', x: s.x, y: s.y + s.h / 2, z: s.z, structure: s }); return; }
    if (s.hard === 'door' && s.door <= 0) { events.push({ type: 'absorbed', x: s.x, y: s.y + s.h / 2, z: s.z, structure: s, door: true }); return; }
    if (typeof C().hitStructure === 'function') {
      C().hitStructure(state.land, s.sid, s.x, s.y + s.h / 2);
      s.hp = s.st.alive === false ? 0 : Math.max(1, s.hp - 1);
    } else {
      s.hp -= 1;
      if (s.hp <= 0) s.st.alive = false;
    }
    if (s.st.alive !== false) { events.push({ type: 'hit', x: s.x, y: s.y + s.h / 2, z: s.z, structure: s }); return; }
    s.alive = false;
    const pts = 100 * (s.mult || 1);
    state.score += pts; state.kills++;
    events.push({ type: 'kill', x: s.x, y: s.y, z: s.z, kind: s.id, points: pts, by: by, structure: s });
  }

  // every shell in the air; one returns true when the shell is spent
  function stepOneShell(state, sh, events) {
    sh.age += DT;
    sh.vy -= GRAVITY * DT;
    sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.z += sh.vz * DT;
    if (sh.age > SHELL.life) return true;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (inHull(e, e.x, e.z, sh.x, sh.y, sh.z, SHELL.bodyPad)) { damageEnemy(state, e, events, 'shell'); return true; }
    }
    for (const m of state.missiles) {
      if (!m.alive) continue;
      if (Math.hypot(sh.x - m.x, sh.y - m.y, sh.z - m.z) < SAM.radius + SHELL.radius) { m.alive = false; events.push({ type: 'missileDown', x: m.x, y: m.y, z: m.z }); return true; }
    }
    for (const s of structuresNear(state, sh.x, sh.z, 60)) {
      if (!s.alive) continue;
      if (inBox(s, sh.x, sh.y, sh.z, 1)) { damageStructure(state, s, events, 'shell'); return true; }
    }
    const gy = groundAt(state, sh.x, sh.z);
    if (sh.y <= gy) { events.push({ type: 'shellGround', x: sh.x, y: gy, z: sh.z }); return true; }
    return false;
  }
  function stepShell(state, events) {
    if (!state.shells.length) return;
    const keep = [];
    for (const sh of state.shells) if (!stepOneShell(state, sh, events)) keep.push(sh);
    state.shells = keep;
  }

  // The enemies: approach to range, then circle-strafe and fire when lined
  // up. They never drive through a structure and never stack on each other.
  function stepEnemies(state, events) {
    const t = state.tank;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const E = ENEMY[e.kind];
      e.age += DT;
      const dx = t.x - e.x, dz = t.z - e.z;
      const dist = Math.hypot(dx, dz);
      const toTank = headingTo(e.x, e.z, t.x, t.z);
      let wantH = toTank, wantS = E.speed;
      if (dist > E.range * 0.85) { e.mode = 'approach'; }
      else if (dist < E.range * 0.45) { e.mode = 'back'; }
      else { e.mode = 'circle'; }
      // about to fire and in range: stop, square up, shoot — the arcade's
      // fairness, a tank that pauses to aim can be hit
      if (dist < E.range && e.reload < 1.1 && t.grace <= 0 && !(e.reposT > 0)) { e.mode = 'aim'; wantH = toTank; wantS = 0; }
      // its line was blocked by a building: move sideways for a while
      if (e.reposT > 0) { e.reposT -= DT; e.mode = 'circle'; }
      if (e.mode === 'circle') {
        e.strafeT -= DT;
        if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = 2.5 + state.rng() * 4; }
        wantH = toTank + e.strafe * Math.PI / 2 * 0.8;
        wantS = E.speed * 0.7;
      } else if (e.mode === 'back') {
        wantH = toTank; wantS = -E.speed * 0.5;
      }
      // steer
      const dh = wrapAngle(wantH - e.heading);
      e.heading = wrapAngle(e.heading + Math.sign(dh) * Math.min(Math.abs(dh), E.turn * DT));
      e.speed += (wantS - e.speed) * Math.min(1, 1.6 * DT);
      const f = forward(e.heading);
      let nx = e.x + f[0] * e.speed * DT, nz = e.z + f[1] * e.speed * DT;
      // avoid structures: if the next step is blocked, turn away and creep
      const r = E.width * 0.6;
      const blk = blocked(state, nx, nz, r);
      if (blk) {
        const away = headingTo(blk.x, blk.z, e.x, e.z);
        e.heading = wrapAngle(e.heading + Math.sign(wrapAngle(away - e.heading)) * E.turn * 2 * DT);
        nx = e.x; nz = e.z; e.speed *= 0.5;
      }
      // keep off each other
      for (const o of state.enemies) {
        if (o === e || !o.alive) continue;
        const ddx = nx - o.x, ddz = nz - o.z, dd = Math.hypot(ddx, ddz);
        if (dd < 40 && dd > 0.01) { nx += ddx / dd * (40 - dd) * 0.5; nz += ddz / dd * (40 - dd) * 0.5; }
      }
      // never into the player's tank
      if (Math.hypot(nx - t.x, nz - t.z) > TANK.length) { e.x = nx; e.z = nz; }
      e.y = groundAt(state, e.x, e.z);
      // fire when lined up, in range, reloaded, with a clear line
      e.reload -= DT;
      const aimErr = Math.abs(wrapAngle(toTank - e.heading));
      if (e.reload <= 0 && dist < E.range && aimErr < 0.12 && t.grace <= 0 && Math.abs(e.speed) < 4) {
        const o = [e.x, e.y + E.hullH * 0.8, e.z];
        const dd = [dx / dist, 0, dz / dist];
        // the lob: solve the launch elevation for a flat shot that carries to the tank
        const g = GRAVITY, v = E.shellSpeed;
        const drop = (t.y + 3) - o[1];
        const s2 = Math.asin(Math.max(-1, Math.min(1, (g * dist / (v * v)))));   // sin(2θ) ≈ g·d/v²
        const el = s2 / 2 + Math.atan2(drop, dist) * 0.5;
        const dir = [dd[0] * Math.cos(el), Math.sin(el), dd[2] * Math.cos(el)];
        // a structure in the way? then hold fire
        const rh = rayHit(state, o, dir, dist, 0);
        if (rh.what === 'structure' || rh.what === 'civilian') { e.reload = 0.6; e.reposT = 2.5 + state.rng() * 2; continue; }
        e.reload = E.reload * (0.85 + state.rng() * 0.3);
        state.eshells.push({ x: o[0], y: o[1], z: o[2], vx: dir[0] * v, vy: dir[1] * v, vz: dir[2] * v, age: 0, from: e.id });
        events.push({ type: 'enemyFire', x: o[0], y: o[1], z: o[2], enemy: e });
      }
    }
  }
  // SAM sites in the stretch (and any nearby) fire a ground missile at the
  // tank in range; a bunker's roof SAM fires too and opens its door for two
  // seconds as it does.
  function stepSams(state, events) {
    const t = state.tank;
    for (const s of structuresNear(state, t.x, t.z, SAM.range + 100)) {
      if (!s.alive) continue;
      if (s.door > 0) s.door -= DT;
      if (s.id !== 'sam' && s.id !== 'bunker') continue;
      s.reload -= DT;
      const dist = Math.hypot(t.x - s.x, t.z - s.z);
      if (s.reload > 0 || dist > SAM.range || t.grace > 0) continue;
      s.reload = SAM.reload * (0.9 + state.rng() * 0.2); s.fired++;
      if (s.id === 'bunker') s.door = SAM.doorOpen;
      const h = headingTo(s.x, s.z, t.x, t.z);
      state.missiles.push({ id: state.nextId++, x: s.x, y: s.y + s.h, z: s.z, heading: h, pitch: 0.5, speed: SAM.missileSpeed * 0.5, age: 0, alive: true, from: s.sid });
      events.push({ type: 'samLaunch', x: s.x, y: s.y + s.h, z: s.z, structure: s });
    }
  }
  function stepMissiles(state, events) {
    const t = state.tank;
    const keep = [];
    for (const m of state.missiles) {
      if (!m.alive) continue;
      m.age += DT;
      m.speed = Math.min(SAM.missileSpeed, m.speed + 60 * DT);
      // home on the tank, weakly, and level off toward it
      const want = headingTo(m.x, m.z, t.x, t.z);
      const dh = wrapAngle(want - m.heading);
      m.heading = wrapAngle(m.heading + Math.sign(dh) * Math.min(Math.abs(dh), SAM.missileTurn * DT));
      const dist = Math.hypot(t.x - m.x, t.z - m.z);
      let wantPitch = Math.atan2((t.y + 10) - m.y, Math.max(1, dist));
      if (m.y - groundAt(state, m.x, m.z) < 14 && dist > 80) wantPitch = Math.max(wantPitch, 0.18);   // stay off the ground until the last stretch
      m.pitch += (wantPitch - m.pitch) * Math.min(1, 1.6 * DT);
      const f = forward(m.heading);
      const cp = Math.cos(m.pitch);
      m.x += f[0] * cp * m.speed * DT; m.z += f[1] * cp * m.speed * DT; m.y += Math.sin(m.pitch) * m.speed * DT;
      if (m.age > SAM.missileLife) { events.push({ type: 'missileOut', x: m.x, y: m.y, z: m.z }); continue; }
      if (Math.hypot(m.x - t.x, m.y - (t.y + 4), m.z - t.z) < TANK.length * 0.6) { hullHit(state, events, 'missile', m); continue; }
      const gy = groundAt(state, m.x, m.z);
      if (m.y <= gy) { events.push({ type: 'missileGround', x: m.x, y: gy, z: m.z }); continue; }
      let struck = false;
      for (const s of structuresNear(state, m.x, m.z, 40)) if (s.alive && s.sid !== m.from && inBox(s, m.x, m.y, m.z, 0)) { struck = true; break; }
      if (struck) { events.push({ type: 'missileGround', x: m.x, y: m.y, z: m.z }); continue; }
      keep.push(m);
    }
    state.missiles = keep;
  }
  function stepEnemyShells(state, events) {
    const t = state.tank;
    const keep = [];
    for (const sh of state.eshells) {
      sh.age += DT;
      sh.vy -= GRAVITY * DT;
      sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.z += sh.vz * DT;
      if (sh.age > 6) continue;
      if (Math.hypot(sh.x - t.x, sh.y - (t.y + 4), sh.z - t.z) < TANK.length * 0.55) { hullHit(state, events, 'shell', sh); continue; }
      let struck = false;
      for (const s of structuresNear(state, sh.x, sh.z, 40)) if (s.alive && inBox(s, sh.x, sh.y, sh.z, 0)) { struck = true; break; }
      if (struck) { events.push({ type: 'shellGround', x: sh.x, y: sh.y, z: sh.z }); continue; }
      const gy = groundAt(state, sh.x, sh.z);
      if (sh.y <= gy) { events.push({ type: 'shellGround', x: sh.x, y: gy, z: sh.z }); continue; }
      keep.push(sh);
    }
    state.eshells = keep;
  }
  function hullHit(state, events, by, what) {
    const t = state.tank;
    t.hits += 1;
    if (t.hits < TANK.hits) { events.push({ type: 'hullHit', hits: t.hits, by: by }); return; }
    t.alive = false;
    state.lives -= 1;
    state.phase = state.lives > 0 ? 'dead' : 'over';
    events.push({ type: 'dead', by: by, lives: state.lives });
    if (state.phase === 'over') events.push({ type: 'over' });
  }
  // After a death with lives left: the same mission, the field as it stands
  // (kills stay dead), the tank back at the stretch's start, hull whole.
  function respawn(state) {
    if (state.phase !== 'dead') return false;
    const sp = state.start || startSpot(state, state.missionDef);
    state.tank = newTank(state, sp[0], sp[1], Math.PI / 2);
    state.shells = []; state.eshells = []; state.missiles = [];
    state.laser.charge = 1; state.laser.beam = null;
    state.phase = 'play';
    return true;
  }
  function nextMission(state) {
    if (state.phase !== 'complete') return false;
    return startMission(state, state.mission + 1);
  }

  function advance(state, input, seconds, carry) {
    let t = (carry || 0) + seconds;
    const events = [];
    let n = 0;
    const inp = Object.assign({}, input);
    while (t >= DT && n < 600) {
      const ev = step(state, inp);
      for (const e of ev) events.push(e);
      inp.fire = false; inp.laser = false;     // edges, not levels
      t -= DT; n++;
      if (state.phase !== 'play') break;
    }
    return { events: events, carry: t >= DT ? 0 : t };
  }

  // What the instruments read. Radar contacts are relative to the VIEW (the
  // way the commander is looking): bearing (rad, 0 ahead, + right), range
  // (ft). hullBearing is where the hull points from the view; gunBearing /
  // gunTilt where the gun is from the view (the lagging reticle); gunRange is
  // what the gun's line meets and how far (the projected range).
  function readouts(state) {
    const t = state.tank;
    const contacts = [];
    const eye = t.y + TANK.eye;
    const rel = (x, z, cy, kind, alive, extra) => {
      const dx = x - t.x, dz = z - t.z;
      const range = Math.hypot(dx, dz);
      if (range > RADAR_RANGE) return;
      // dy: the target's centre above the eye — what a gunner reads to lay the gun
      contacts.push(Object.assign({ bearing: wrapAngle(headingTo(t.x, t.z, x, z) - t.look), gunBearing: wrapAngle(headingTo(t.x, t.z, x, z) - t.turret), range: Math.round(range), dy: +(cy - eye).toFixed(1), kind: kind, alive: alive }, extra || {}));
    };
    for (const e of state.enemies) if (e.alive) rel(e.x, e.z, e.y + ENEMY[e.kind].hullH / 2, e.kind, true, { id: e.id, name: ENEMY[e.kind].name, mult: ENEMY[e.kind].mult });
    for (const s of structuresNear(state, t.x, t.z, RADAR_RANGE)) if (s.alive && s.cls !== 'civ') rel(s.x, s.z, s.y + Math.min(s.h, 30) / 2, s.id, true, { sid: s.sid, name: s.name, mult: s.mult || 1, hard: s.hard, doorShut: s.hard === 'door' && s.door <= 0 });
    for (const m of state.missiles) if (m.alive) rel(m.x, m.z, m.y, 'missile', true, { id: m.id });
    let nearest = null;
    for (const c of contacts) if (c.kind !== 'missile' && (!nearest || c.range < nearest.range)) nearest = c;
    // the projected range is the SHELL's landing (the arc), not the straight line (2026-09-09)
    const sol = shellSolution(state);
    const gr = sol.impact;
    const deg = (a) => Math.round(((a * 180 / Math.PI) % 360 + 360) % 360);
    return {
      score: state.score, mission: state.mission, missionName: state.missionDef ? state.missionDef.name : '',
      hits: t.hits, hitsMax: TANK.hits, lives: state.lives,
      shellReady: t.reload <= 0, reload: Math.max(0, Math.min(1, 1 - t.reload / SHELL.reload)), shellsOut: state.shells.length, laser: state.laser.charge,
      heading: t.heading, headingDeg: deg(t.heading),
      look: t.look, lookDeg: deg(t.look),
      hullBearing: wrapAngle(t.heading - t.look),
      gunBearing: wrapAngle(t.turret - t.look), gunTilt: t.gunPitch - t.pitch, gunOnView: Math.abs(wrapAngle(t.turret - t.look)) < 0.02 && Math.abs(t.gunPitch - t.pitch) < 0.02,
      gunRange: gr.range, gunHit: gr.what, solution: sol,
      speed: Math.round(t.speed), pitchDeg: Math.round(t.pitch * 180 / Math.PI),
      contacts: contacts, nearest: nearest, inRange: !!(nearest && nearest.range < 900),
      hostilesLeft: hostilesLeft(state), wave: state.wave, waves: state.missionDef ? state.missionDef.waves.length : 0,
      time: state.missionTime, x: Math.round(t.x), z: Math.round(t.z),
    };
  }

  globalThis.LunarTankCore = {
    DT: DT, CHUNK_W: CHUNK_W, GRAVITY: GRAVITY, shellSolution: shellSolution, muzzle: muzzle, gunDir: gunDir, inHull: inHull,
    TANK: TANK, TURRET: TURRET, SHELL: SHELL, LASER: LASER, ENEMY: ENEMY, SAM: SAM, MISSIONS: MISSIONS, DEFAULTS: DEFAULTS,
    RADAR_RANGE: RADAR_RANGE, SPAWN_MIN: SPAWN_MIN, SPAWN_MAX: SPAWN_MAX, FLAT_MARGIN: FLAT_MARGIN,
    createGame: createGame, startMission: startMission, startSpot: startSpot, respawn: respawn, nextMission: nextMission,
    START_CLEAR: START_CLEAR,
    step: step, advance: advance, readouts: readouts,
    groundAt: groundAt, naturalAt: naturalAt, baseAt: baseAt, slopeAlong: slopeAlong,
    chunkStructures: chunkStructures, structuresNear: structuresNear, stretchHostiles: stretchHostiles, hostilesLeft: hostilesLeft,
    boxDist: boxDist, blocked: blocked, rayHit: rayHit, forward: forward, wrapAngle: wrapAngle, headingTo: headingTo,
    spawnWave: spawnWave, hullHit: hullHit, damageStructure: damageStructure, damageEnemy: damageEnemy,
  };
})();
