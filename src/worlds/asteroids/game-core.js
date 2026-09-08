// Asteroids — the core. Atari 1979, the rules kept.
//
// Pure: no DOM, no timers, no Math.random (a seeded rng lives in the state).
// Shared verbatim with tmp/asteroids/sim.mjs — keep it pure or the sim lies.
// The renderer draws what the state says; the shell reads `state.events`
// after every step (the core empties it at the start of the next step).
//
// The field wraps both ways (a torus). Positions stay in [0, W) × [0, H).
// Units: the field is H = 750 tall; W follows the window's aspect.
(function () {
  'use strict';

  const TAU = Math.PI * 2;

  // ---- tunables (the shell's PLAY dials write into state.opts) ------------------
  const DEFAULTS = {
    fieldH: 750,
    aspect: 16 / 9,
    lives: 3,
    rotRate: 3.8,          // rad/s — a full turn in ~1.65 s
    thrust: 330,           // u/s² — top speed in about a second and a half
    drag: 0.55,            // 1/s — the cabinet's slight brake
    maxSpeed: 520,
    shotSpeed: 620,
    shotLife: 1.4,         // s — about two-thirds of the field's width
    shotCap: 4,            // on screen at once
    fireRepeat: 0.2,       // s between shots while the key is held (0 = tap only)
    hyperRisk: 0.06,       // chance a jump ends you
    hyperCooldown: 2.0,
    saucerMin: 7,          // s between saucers, low end
    saucerMax: 15,
    lurk: 1,               // the later ROM's rule: camping brings the saucer sooner
    waveBase: 4,
    waveStep: 2,
    waveCap: 11,
    extraEvery: 10000,
    exits: 1,              // the diegetic ways out (0 in the sim's pure-rules suites)
  };

  const SIZE = { R: [15, 30, 62], PTS: [100, 50, 20], SPEED: [[110, 210], [70, 150], [40, 95]] };
  const SHIP = { R: 14, NOSE: 16, TAIL: 11, HALF: 10 };   // the collision triangle: nose ahead, two tail corners
  const SAUCER = { big: { r: 26, speed: 95, fire: 1.25, pts: 200 }, small: { r: 14, speed: 135, fire: 0.85, pts: 1000 } };
  const SAUCER_SHOT = { speed: 470, life: 1.3 };
  const RESPAWN_WAIT = 2.2;     // s dead before the centre is even checked
  const SAFE_R = 130;           // the clear circle the respawn waits for
  const SPAWN_CLEAR = 200;      // rocks never spawn nearer the ship than this
  const WAVE_GAP = 2.0;
  const HYPER_T = 0.7;
  const OVER_T = 1.8;
  const HULK = { w: 220, h: 56, speed: 34, bay: { x: -18, y: 0, w: 60, h: 34 } };   // the bay, in the hulk's frame

  // Four rock outlines, unit radius, counter-clockwise. Creases are drawn by the
  // renderer as interior facet lines (index pairs): a broken chord across the
  // face, never through the centre (that read as a sliced pie).
  const SHAPES = [
    { pts: [[1, 0.1], [0.75, 0.55], [0.45, 0.95], [-0.1, 0.85], [-0.55, 0.9], [-0.95, 0.45], [-0.8, -0.05], [-0.95, -0.5], [-0.5, -0.85], [0.05, -0.7], [0.5, -0.95], [0.9, -0.45]], creases: [[1, 4], [4, 8], [8, 11]] },
    { pts: [[0.95, 0.3], [0.55, 0.7], [0.2, 1.0], [-0.4, 0.8], [-0.9, 0.6], [-1.0, 0.0], [-0.7, -0.5], [-0.75, -0.9], [-0.2, -0.85], [0.3, -1.0], [0.8, -0.7], [0.7, -0.2]], creases: [[2, 5], [5, 9], [9, 0]] },
    { pts: [[0.85, 0.5], [0.35, 0.65], [0.1, 1.0], [-0.45, 0.9], [-1.0, 0.4], [-0.6, 0.0], [-0.95, -0.45], [-0.55, -0.95], [0.0, -0.6], [0.45, -0.95], [1.0, -0.5], [0.6, 0.0]], creases: [[0, 3], [3, 7], [7, 10]] },
    { pts: [[1.0, 0.2], [0.65, 0.75], [0.15, 0.8], [-0.2, 1.0], [-0.7, 0.7], [-1.0, 0.1], [-0.85, -0.45], [-0.35, -0.65], [-0.45, -1.0], [0.2, -0.9], [0.75, -0.75], [0.8, -0.3]], creases: [[1, 5], [5, 8], [8, 11]] },
  ];

  // normalise: the longest corner of every outline sits exactly on the radius
  for (const sh of SHAPES) {
    let m = 0;
    for (const p of sh.pts) m = Math.max(m, Math.hypot(p[0], p[1]));
    for (const p of sh.pts) { p[0] /= m; p[1] /= m; }
  }

  // The ship's drawing outline, for the renderer AND the collision points (nose + two tail corners).
  const SHIP_HULL = [[SHIP.NOSE, 0], [-SHIP.TAIL, SHIP.HALF], [-SHIP.TAIL, -SHIP.HALF]];

  // ---- rng ---------------------------------------------------------------------------
  function rng(state) {
    let t = (state.rngState += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    state.rngState = state.rngState >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rand(state, a, b) { return a + (b - a) * rng(state); }
  function pick(state, arr) { return arr[Math.floor(rng(state) * arr.length) % arr.length]; }

  // ---- geometry ------------------------------------------------------------------------
  function wrap(v, m) { v %= m; return v < 0 ? v + m : v; }
  // the shortest offset from a to b on the torus
  function delta(state, ax, ay, bx, by, out) {
    let dx = bx - ax, dy = by - ay;
    const W = state.W, H = state.H;
    if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
    if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
    out = out || {};
    out.dx = dx; out.dy = dy;
    return out;
  }
  function dist(state, ax, ay, bx, by) { const d = delta(state, ax, ay, bx, by, _d); return Math.hypot(d.dx, d.dy); }
  const _d = {};

  // A rock's polygon in world space, relative to its centre (rotation applied).
  function rockPoly(rock, out) {
    const sh = SHAPES[rock.shape].pts;
    const r = SIZE.R[rock.size];
    const c = Math.cos(rock.a), s = Math.sin(rock.a);
    out = out || [];
    out.length = sh.length;
    for (let i = 0; i < sh.length; i++) {
      const x = sh[i][0] * r, y = sh[i][1] * r;
      out[i] = [x * c - y * s, x * s + y * c];
    }
    return out;
  }
  // point (px, py) relative to the polygon's centre, inside?
  function pointInPoly(poly, px, py) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      const cross = (yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi;
      if (cross) inside = !inside;
    }
    return inside;
  }
  function shipPoints(ship, out) {
    const c = Math.cos(ship.a), s = Math.sin(ship.a);
    out = out || [];
    for (let i = 0; i < SHIP_HULL.length; i++) {
      const x = SHIP_HULL[i][0], y = SHIP_HULL[i][1];
      out[i] = [x * c - y * s, x * s + y * c];
    }
    out.length = SHIP_HULL.length;
    return out;
  }
  // Does the ship (at 0,0 in these coordinates) touch a rock centred at (dx, dy)?
  function shipHitsRock(state, ship, rock) {
    const d = delta(state, ship.x, ship.y, rock.x, rock.y, _d);
    const R = SIZE.R[rock.size] + SHIP.NOSE;
    if (d.dx * d.dx + d.dy * d.dy > R * R) return false;
    const poly = rockPoly(rock, _poly);
    const sp = shipPoints(ship, _sp);
    for (const p of sp) if (pointInPoly(poly, p[0] - d.dx, p[1] - d.dy)) return true;   // a ship corner inside the rock
    // a rock corner inside the ship's triangle (small rocks against a big nose)
    for (const q of poly) if (pointInPoly(sp, q[0] + d.dx, q[1] + d.dy)) return true;
    // the ship's centre inside (a rock swallowing the hull between corners)
    return pointInPoly(poly, -d.dx, -d.dy);
  }
  const _poly = [], _sp = [];

  // ---- state -------------------------------------------------------------------------
  function createGame(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const seed = (o.seed === undefined || o.seed === null || o.seed === '') ? 1 : (typeof o.seed === 'string' ? hashStr(o.seed) : (o.seed | 0));
    if (!(o.aspect > 0) || !isFinite(o.aspect)) o.aspect = 16 / 9;   // a zero-size window at load must not poison the field
    const H = o.fieldH, W = Math.round(H * o.aspect);
    const state = {
      opts: o,
      seed,
      rngState: seed >>> 0,
      W, H,
      t: 0,
      wave: 0,
      score: 0,
      lives: o.lives,
      nextExtra: o.extraEvery,
      ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, alive: true, thrust: 0, hidden: false, hyperT: 0, hyperCd: 0, jumps: 0, fireCd: 0, deadT: 0, waitingClear: false },
      rocks: [],
      bullets: [],
      saucer: null,
      saucerT: 0,
      hulk: null,
      hulkWaves: 0,           // waves since the last hulk
      lurkT: 0,
      waveT: 0,               // > 0: the gap before the next wave
      over: false,
      overT: 0,
      exit: null,             // 'hulk' | 'hyper' | 'rock' once taken
      nextId: 1,
      events: [],
      stats: { rocks: 0, saucers: 0, shots: 0, deaths: 0, jumps: 0, waves: 0 },
      firePrev: false,
      hyperPrev: false,
    };
    state.saucerT = rand(state, o.saucerMin, o.saucerMax);
    startWave(state);
    return state;
  }
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h || 1;
  }

  // The window changed shape: the field follows, everything keeps its place proportionally.
  function resizeField(state, aspect) {
    if (!(aspect > 0) || !isFinite(aspect)) return;
    const W = Math.round(state.H * aspect);
    if (W === state.W) return;
    const k = W / state.W;
    state.W = W;
    state.opts.aspect = aspect;
    for (const r of state.rocks) r.x *= k;
    for (const b of state.bullets) b.x *= k;
    state.ship.x *= k;
    if (state.saucer) state.saucer.x *= k;
    if (state.hulk) state.hulk.x *= k;
  }

  function emit(state, type, data) { const e = data || {}; e.type = type; state.events.push(e); return e; }

  function waveCount(state, wave) { return Math.min(state.opts.waveCap, state.opts.waveBase + state.opts.waveStep * (wave - 1)); }

  function startWave(state) {
    state.wave++;
    state.stats.waves++;
    const n = waveCount(state, state.wave);
    const o = state.opts;
    for (let i = 0; i < n; i++) spawnRock(state, 2, null, null, null);
    // the hollow rock: from wave 2 on, one large rock in the wave hides a doorway (wave 1: a coin flip)
    if (o.exits && (state.wave >= 2 || rng(state) < 0.5)) {
      const r = spawnRock(state, 2, null, null, null);
      r.hollow = true; r.open = false;
      r.vx *= 0.5; r.vy *= 0.5;
    }
    // the derelict: drifts across every third wave or so
    state.hulkWaves++;
    if (o.exits && !state.hulk && (state.hulkWaves >= 3 || (state.wave >= 2 && rng(state) < 0.35))) spawnHulk(state);
    emit(state, 'wave', { wave: state.wave, rocks: n });
  }

  function spawnRock(state, size, x, y, parent) {
    const o = state.opts;
    const ship = state.ship;
    if (x === null) {
      // on an edge, away from the ship
      for (let tries = 0; tries < 30; tries++) {
        if (rng(state) < 0.5) { x = rng(state) < 0.5 ? 0 : state.W - 1; y = rand(state, 0, state.H); }
        else { y = rng(state) < 0.5 ? 0 : state.H - 1; x = rand(state, 0, state.W); }
        if (dist(state, x, y, ship.x, ship.y) > SPAWN_CLEAR) break;
      }
    }
    const sp = rand(state, SIZE.SPEED[size][0], SIZE.SPEED[size][1]);
    let ang = rand(state, 0, TAU);
    let vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
    if (parent) {
      // children carry the parent's drift plus a kick to each side
      vx = parent.vx * 0.5 + vx; vy = parent.vy * 0.5 + vy;
    }
    const rock = {
      id: state.nextId++, x: wrap(x, state.W), y: wrap(y, state.H), vx, vy,
      a: rand(state, 0, TAU), spin: rand(state, 0.3, 1.6) * (rng(state) < 0.5 ? -1 : 1),
      size, shape: Math.floor(rng(state) * SHAPES.length), hollow: false, open: false,
    };
    state.rocks.push(rock);
    return rock;
  }

  function spawnHulk(state) {
    const dir = rng(state) < 0.5 ? 1 : -1;
    state.hulk = {
      x: dir > 0 ? -HULK.w : state.W + HULK.w,
      y: rand(state, state.H * 0.2, state.H * 0.8),
      vx: HULK.speed * dir, dir,
      life: 0,
    };
    state.hulkWaves = 0;
    emit(state, 'hulk');
  }

  function spawnSaucer(state) {
    const o = state.opts;
    const lurking = o.lurk && state.lurkT > 12;
    let pSmall = Math.max(0.2, Math.min(0.9, 0.2 + state.score / 40000));
    if (lurking) pSmall = 0.9;
    const size = rng(state) < pSmall ? 'small' : 'big';
    const def = SAUCER[size];
    const dir = rng(state) < 0.5 ? 1 : -1;
    state.saucer = {
      size, r: def.r,
      x: dir > 0 ? -def.r : state.W + def.r, y: rand(state, state.H * 0.1, state.H * 0.9),
      vx: def.speed * dir, vy: 0, dir,
      fireT: def.fire * 0.6, turnT: rand(state, 0.8, 2.0),
    };
    state.stats.saucers++;
    emit(state, 'saucer', { size });
  }

  // ---- the step --------------------------------------------------------------------------
  // input: { rotate: -1..1, thrust: bool, fire: bool, hyper: bool }
  function step(state, input, dt) {
    state.events.length = 0;
    if (state.over) { state.overT += dt; return state; }
    const o = state.opts;
    const ship = state.ship;
    state.t += dt;
    input = input || {};

    // ---- the ship
    if (ship.alive && !ship.hidden) {
      const rot = Math.max(-1, Math.min(1, input.rotate || 0));
      ship.a += rot * o.rotRate * dt;
      const th = input.thrust ? 1 : 0;
      ship.thrust = th;
      if (th) { ship.vx += Math.cos(ship.a) * o.thrust * dt; ship.vy += Math.sin(ship.a) * o.thrust * dt; }
      const k = Math.exp(-o.drag * dt);
      ship.vx *= k; ship.vy *= k;
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > o.maxSpeed) { ship.vx *= o.maxSpeed / sp; ship.vy *= o.maxSpeed / sp; }
      ship.x = wrap(ship.x + ship.vx * dt, state.W);
      ship.y = wrap(ship.y + ship.vy * dt, state.H);
      // the lurk clock: sitting still, the saucer learns where you are
      if (sp < 25 && !th) state.lurkT += dt; else state.lurkT = 0;
      // fire
      ship.fireCd = Math.max(0, ship.fireCd - dt);
      const firePress = input.fire && !state.firePrev;
      const fireHold = input.fire && o.fireRepeat > 0 && ship.fireCd <= 0;
      if ((firePress || fireHold) && countShots(state, 'ship') < o.shotCap) {
        state.bullets.push({
          x: wrap(ship.x + Math.cos(ship.a) * SHIP.NOSE, state.W), y: wrap(ship.y + Math.sin(ship.a) * SHIP.NOSE, state.H),
          vx: ship.vx + Math.cos(ship.a) * o.shotSpeed, vy: ship.vy + Math.sin(ship.a) * o.shotSpeed,
          life: o.shotLife, from: 'ship',
        });
        ship.fireCd = o.fireRepeat;
        state.stats.shots++;
        emit(state, 'fire');
      }
      // hyperspace
      ship.hyperCd = Math.max(0, ship.hyperCd - dt);
      if (input.hyper && !state.hyperPrev && ship.hyperCd <= 0) {
        ship.hidden = true; ship.hyperT = HYPER_T; ship.thrust = 0;
        ship.jumps++; state.stats.jumps++;
        emit(state, 'hyper', { x: ship.x, y: ship.y });
      }
    } else if (ship.alive && ship.hidden) {
      ship.hyperT -= dt;
      if (ship.hyperT <= 0) {
        // the long jump: a rare jump lands you somewhere else entirely
        const exitP = o.exits ? Math.min(0.5, 0.03 + 0.05 * (ship.jumps - 1)) : 0;
        if (rng(state) < exitP) {
          takeExit(state, 'hyper');
        } else if (rng(state) < o.hyperRisk) {
          ship.hidden = false;
          killShip(state, 'hyper');
        } else {
          ship.x = rand(state, state.W * 0.1, state.W * 0.9);
          ship.y = rand(state, state.H * 0.1, state.H * 0.9);
          ship.vx = 0; ship.vy = 0; ship.hidden = false;
          ship.hyperCd = o.hyperCooldown;
          emit(state, 'reappear', { x: ship.x, y: ship.y });
        }
      }
    } else if (!ship.alive) {
      ship.deadT += dt;
      if (state.lives <= 0) {
        if (ship.deadT > OVER_T) { state.over = true; emit(state, 'over', { score: state.score, wave: state.wave }); }
      } else if (ship.deadT >= RESPAWN_WAIT) {
        ship.waitingClear = true;
        if (centreClear(state)) {
          ship.alive = true; ship.waitingClear = false;
          ship.x = state.W / 2; ship.y = state.H / 2; ship.vx = 0; ship.vy = 0; ship.a = -Math.PI / 2;
          ship.hidden = false; ship.hyperCd = 0; ship.fireCd = 0;
          emit(state, 'respawn');
        }
      }
    }
    state.firePrev = !!input.fire;
    state.hyperPrev = !!input.hyper;

    // ---- rocks
    for (const r of state.rocks) {
      r.x = wrap(r.x + r.vx * dt, state.W);
      r.y = wrap(r.y + r.vy * dt, state.H);
      r.a += r.spin * dt;
    }

    // ---- bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x = wrap(b.x + b.vx * dt, state.W);
      b.y = wrap(b.y + b.vy * dt, state.H);
      b.life -= dt;
      if (b.life <= 0) state.bullets.splice(i, 1);
    }

    // ---- the saucer
    if (state.saucer) stepSaucer(state, dt);
    else if (!state.over) {
      const lurking = o.lurk && state.lurkT > 12;
      state.saucerT -= dt * (lurking ? 2.5 : 1);
      if (state.saucerT <= 0 && state.rocks.length > 0 && ship.alive) spawnSaucer(state);
    }

    // ---- the derelict
    if (state.hulk) {
      const h = state.hulk;
      h.x += h.vx * dt; h.life += dt;
      if ((h.dir > 0 && h.x > state.W + HULK.w) || (h.dir < 0 && h.x < -HULK.w)) { state.hulk = null; emit(state, 'hulkGone'); }
    }

    // ---- collisions
    collide(state);

    // ---- the wave
    if (!state.over && rocksLeft(state) === 0 && !state.saucer) {
      if (state.waveT <= 0) { state.waveT = WAVE_GAP; emit(state, 'cleared', { wave: state.wave }); }
      else {
        state.waveT -= dt;
        if (state.waveT <= 0) { state.waveT = 0; startWave(state); }
      }
    }
    return state;
  }

  function countShots(state, from) { let n = 0; for (const b of state.bullets) if (b.from === from) n++; return n; }
  function rocksLeft(state) { let n = 0; for (const r of state.rocks) if (!r.hollow) n++; return n; }

  function centreClear(state) {
    const cx = state.W / 2, cy = state.H / 2;
    for (const r of state.rocks) if (dist(state, cx, cy, r.x, r.y) < SAFE_R + SIZE.R[r.size]) return false;
    if (state.saucer && dist(state, cx, cy, state.saucer.x, state.saucer.y) < SAFE_R + state.saucer.r) return false;
    for (const b of state.bullets) if (b.from === 'saucer' && dist(state, cx, cy, b.x, b.y) < SAFE_R) return false;
    return true;
  }

  function stepSaucer(state, dt) {
    const s = state.saucer, ship = state.ship, o = state.opts;
    const def = SAUCER[s.size];
    s.turnT -= dt;
    if (s.turnT <= 0) {
      s.turnT = rand(state, 0.7, 2.0);
      const pickDir = rng(state);
      s.vy = pickDir < 0.4 ? 0 : (pickDir < 0.7 ? def.speed : -def.speed);
    }
    s.x += s.vx * dt;
    s.y = wrap(s.y + s.vy * dt, state.H);
    if ((s.dir > 0 && s.x > state.W + s.r) || (s.dir < 0 && s.x < -s.r)) {
      state.saucer = null;
      state.saucerT = rand(state, o.saucerMin, o.saucerMax);
      emit(state, 'saucerGone');
      return;
    }
    s.fireT -= dt;
    if (s.fireT <= 0 && s.x > 0 && s.x < state.W) {
      s.fireT = def.fire;
      let ang;
      if (s.size === 'small' && ship.alive && !ship.hidden) {
        const d = delta(state, s.x, s.y, ship.x, ship.y, _d);
        // lead a little, then miss by an error that shrinks as the score climbs
        const lead = 0.25;
        const err = Math.max(0.03, 0.45 * (1 - Math.min(1, state.score / 40000)));
        ang = Math.atan2(d.dy + ship.vy * lead, d.dx + ship.vx * lead) + rand(state, -err, err);
      } else {
        ang = rand(state, 0, TAU);
      }
      state.bullets.push({
        x: wrap(s.x + Math.cos(ang) * (s.r + 4), state.W), y: wrap(s.y + Math.sin(ang) * (s.r + 4), state.H),
        vx: Math.cos(ang) * SAUCER_SHOT.speed, vy: Math.sin(ang) * SAUCER_SHOT.speed,
        life: SAUCER_SHOT.life, from: 'saucer',
      });
      emit(state, 'saucerFire', { size: s.size });
    }
  }

  function addScore(state, pts) {
    state.score += pts;
    while (state.score >= state.nextExtra) {
      state.nextExtra += state.opts.extraEvery;
      state.lives++;
      emit(state, 'extraLife', { lives: state.lives });
    }
  }

  function breakRock(state, idx, by) {
    const r = state.rocks[idx];
    state.rocks.splice(idx, 1);
    if (r.size > 0) {
      spawnRock(state, r.size - 1, r.x, r.y, r);
      spawnRock(state, r.size - 1, r.x, r.y, r);
    }
    const pts = by === 'ship' ? SIZE.PTS[r.size] : 0;
    if (pts) addScore(state, pts);
    state.stats.rocks++;
    emit(state, 'rockHit', { x: r.x, y: r.y, size: r.size, shape: r.shape, a: r.a, vx: r.vx, vy: r.vy, points: pts, by });
  }

  function killShip(state, cause) {
    const ship = state.ship;
    if (!ship.alive) return;
    ship.alive = false; ship.deadT = 0; ship.thrust = 0; ship.hidden = false;
    state.lives--;
    state.stats.deaths++;
    state.lurkT = 0;
    emit(state, 'shipDie', { x: ship.x, y: ship.y, a: ship.a, vx: ship.vx, vy: ship.vy, cause, lives: state.lives });
  }

  function killSaucer(state, by) {
    const s = state.saucer;
    const pts = by === 'ship' ? SAUCER[s.size].pts : 0;
    if (pts) addScore(state, pts);
    state.saucer = null;
    state.saucerT = rand(state, state.opts.saucerMin, state.opts.saucerMax);
    emit(state, 'saucerHit', { x: s.x, y: s.y, size: s.size, points: pts, by });
  }

  function takeExit(state, which) {
    if (state.exit) return;
    state.exit = which;
    state.ship.hidden = true;
    state.ship.thrust = 0;
    emit(state, 'exit', { which });
  }

  function collide(state) {
    const ship = state.ship;
    // bullets vs rocks / saucer / ship
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      let hit = false;
      for (let j = state.rocks.length - 1; j >= 0 && !hit; j--) {
        const r = state.rocks[j];
        const d = delta(state, r.x, r.y, b.x, b.y, _d);
        const R = SIZE.R[r.size];
        if (d.dx * d.dx + d.dy * d.dy > R * R) continue;
        if (!pointInPoly(rockPoly(r, _poly), d.dx, d.dy)) continue;
        hit = true;
        if (r.hollow) {
          // the hollow rock does not break: a ship's shot opens it
          if (b.from === 'ship' && !r.open) { r.open = true; r.spin *= 0.3; r.vx *= 0.4; r.vy *= 0.4; emit(state, 'rockOpen', { id: r.id, x: r.x, y: r.y }); }
        } else breakRock(state, j, b.from);
      }
      if (!hit && state.saucer && b.from === 'ship') {
        const s = state.saucer;
        const d = delta(state, s.x, s.y, b.x, b.y, _d);
        if (d.dx * d.dx + d.dy * d.dy * 2.6 < s.r * s.r) { hit = true; killSaucer(state, 'ship'); }
      }
      if (!hit && b.from === 'saucer' && ship.alive && !ship.hidden) {
        const d = delta(state, ship.x, ship.y, b.x, b.y, _d);
        if (d.dx * d.dx + d.dy * d.dy < SHIP.NOSE * SHIP.NOSE && pointInPoly(shipPoints(ship, _sp), d.dx, d.dy)) { hit = true; killShip(state, 'saucer'); }
      }
      if (hit) state.bullets.splice(i, 1);
    }
    // the ship vs rocks
    if (ship.alive && !ship.hidden) {
      for (let j = state.rocks.length - 1; j >= 0; j--) {
        const r = state.rocks[j];
        if (!shipHitsRock(state, ship, r)) continue;
        if (r.hollow && r.open) { takeExit(state, 'rock'); break; }   // through the doorway
        if (r.hollow) { killShip(state, 'rock'); break; }              // a closed hollow rock is still a rock
        killShip(state, 'rock');
        break;
      }
    }
    // the ship vs the saucer
    if (ship.alive && !ship.hidden && state.saucer) {
      const s = state.saucer;
      if (dist(state, ship.x, ship.y, s.x, s.y) < s.r + SHIP.R) { killSaucer(state, 'crash'); killShip(state, 'saucer'); }
    }
    // the saucer vs rocks (it dies, no points)
    if (state.saucer) {
      const s = state.saucer;
      for (let j = state.rocks.length - 1; j >= 0; j--) {
        const r = state.rocks[j];
        if (r.hollow) continue;
        if (dist(state, s.x, s.y, r.x, r.y) < s.r * 0.8 + SIZE.R[r.size] * 0.85) { killSaucer(state, 'rock'); breakRock(state, j, 'saucer'); break; }
      }
    }
    // the ship in the derelict's bay
    if (ship.alive && !ship.hidden && state.hulk) {
      const h = state.hulk, bay = HULK.bay;
      const bx = h.x + bay.x * h.dir, by = h.y + bay.y;
      if (Math.abs(ship.x - bx) < bay.w / 2 && Math.abs(ship.y - by) < bay.h / 2) takeExit(state, 'hulk');
    }
  }

  // ---- a simple autopilot (for the sim and the look-dev page) ------------------------------
  // Turns toward the nearest rock (over the torus), fires when lined up, thrusts
  // away from anything about to hit it. Not clever; enough to clear a wave.
  function autopilot(state) {
    const ship = state.ship;
    const input = { rotate: 0, thrust: false, fire: false, hyper: false };
    if (!ship.alive || ship.hidden) return input;
    let best = null, bestD = 1e9, threat = null, threatD = 1e9;
    const targets = state.rocks.filter((r) => !r.hollow);
    if (state.saucer) targets.push({ x: state.saucer.x, y: state.saucer.y, vx: state.saucer.vx, vy: state.saucer.vy, size: 1 });
    for (const r of targets) {
      const d = delta(state, ship.x, ship.y, r.x, r.y, _d);
      const dd = Math.hypot(d.dx, d.dy);
      if (dd < bestD) { bestD = dd; best = { dx: d.dx, dy: d.dy, r }; }
      // closing?
      const rvx = r.vx - ship.vx, rvy = r.vy - ship.vy;
      const closing = -(d.dx * rvx + d.dy * rvy) / Math.max(1, dd);
      if (closing > 0 && dd / closing < 1.2 && dd < threatD) { threatD = dd; threat = { dx: d.dx, dy: d.dy }; }
    }
    if (!best) return input;
    // aim with lead
    const lead = bestD / state.opts.shotSpeed;
    const ax = best.dx + best.r.vx * lead, ay = best.dy + best.r.vy * lead;
    const want = Math.atan2(ay, ax);
    let da = want - ship.a;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    input.rotate = Math.abs(da) < 0.02 ? 0 : (da > 0 ? 1 : -1);
    input.fire = Math.abs(da) < 0.12;
    if (threat && threatD < 120) {
      // point away and burn a little
      const away = Math.atan2(-threat.dy, -threat.dx);
      let db = away - ship.a;
      while (db > Math.PI) db -= TAU;
      while (db < -Math.PI) db += TAU;
      input.rotate = db > 0 ? 1 : -1;
      input.fire = false;
      input.thrust = Math.abs(db) < 0.6;
    }
    return input;
  }

  const Core = {
    DEFAULTS, SIZE, SHIP, SHIP_HULL, SAUCER, SHAPES, HULK, SAFE_R, RESPAWN_WAIT, HYPER_T, WAVE_GAP,
    createGame, step, resizeField, autopilot,
    rockPoly, pointInPoly, shipPoints, shipHitsRock, delta, dist, wrap, waveCount, rocksLeft, centreClear, rng,
  };
  globalThis.AsteroidsCore = Core;
})();
