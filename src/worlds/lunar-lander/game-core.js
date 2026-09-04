// Lunar Lander — the game core.
//
// A faithful model of Atari's 1979 cabinet: lunar gravity, momentum, a
// proportional thrust lever that burns fuel, four difficulty selections,
// jagged terrain with marked pads worth 2×–5×, and landings graded by
// vertical speed, drift, and attitude. Fuel is the currency: the game runs
// until the tank is dry.
//
// Pure module: no DOM, no timers, no Math.random (seeded rng only). Shared
// verbatim with tmp/lunar-lander/sim.mjs — keep it pure or the sim lies.
(function () {
  'use strict';

  const DT = 1 / 120;               // fixed physics step, seconds
  const WORLD_W = 4000;             // feet; the ship wraps at the edges
  const SPAWN = { x: 320, y: 1720, vx: 62, vy: -6 };
  const GRAVITY = 5.3;              // ft/s², the Moon
  const MAX_THRUST = 16.5;          // ft/s² at a full lever
  const FUEL_BURN = 8.5;            // units/s at a full lever
  const ABORT_TIME = 1.1;           // seconds of forced full burn
  const ABORT_BURN = 2.0;           // fuel-cost multiplier while aborting
  const LEVER_CURVE = 1.7;          // thrust = lever^curve: fine at the bottom, a punch at the top
  const TERRAIN_STEP = 50;          // feet between base terrain samples

  // The LEM, in feet, upright: feet at the bottom corners, the cabin above.
  // These are collision points; the drawing in the renderer is its own thing.
  const SHIP = {
    footL: [-15, -11],
    footR: [15, -11],
    top: [0, 15],
    sideL: [-13, 2],
    sideR: [13, 2],
  };

  // The four selections on the cabinet. Gravity multiplies GRAVITY; rot is the
  // hand-on-key rotation rate (rad/s); inertia > 0 means rotation carries
  // momentum (Command) and must be countered.
  const DIFFICULTY = {
    training: { label: 'TRAINING', gravity: 0.55, rot: 1.9, inertia: 0, pads: 5 },
    cadet:    { label: 'CADET',    gravity: 1.0,  rot: 1.6, inertia: 0, pads: 4 },
    prime:    { label: 'PRIME',    gravity: 1.35, rot: 1.45, inertia: 0, pads: 4 },
    command:  { label: 'COMMAND',  gravity: 1.7,  rot: 0,   inertia: 2.6, pads: 3 },
  };

  // Landing grades — vertical speed, horizontal drift, tilt from upright.
  const GRADES = [
    { name: 'perfect', vy: 5,  vx: 3,  tilt: 4 * Math.PI / 180,  points: 50, fuel: 50 },
    { name: 'good',    vy: 15, vx: 6,  tilt: 10 * Math.PI / 180, points: 50, fuel: 0 },
    { name: 'hard',    vy: 30, vx: 12, tilt: 18 * Math.PI / 180, points: 15, fuel: 0 },
  ];
  const CRASH_POINTS = 5;
  const CRASH_FUEL = 50;            // fuel lost in a crash

  // Pad tiers: width in feet → multiplier. Narrower pays more.
  const PAD_TIERS = [
    { width: 150, mult: 2 },
    { width: 105, mult: 3 },
    { width: 72,  mult: 4 },
    { width: 50,  mult: 5 },
  ];

  const DEFAULTS = {
    seed: 1,
    difficulty: 'cadet',
    fuel: 750,
    gravityScale: 1,       // tuner: stretch the selection's gravity
    rotScale: 1,
    thrustScale: 1,
    leverCurve: LEVER_CURVE,
    secretOdds: 0.35,      // chance an attempt hides the secret flat
  };

  // ---- rng ---------------------------------------------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(seed, attempt) {
    let h = (seed * 2654435761 + attempt * 40503 + 0x9e3779b9) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  // ---- terrain -------------------------------------------------------------
  // Midpoint-displaced ridge across WORLD_W, then pads flattened into it. The
  // last point equals the first so the wrap seam is seamless.
  function makeTerrain(seed, difficulty, opts) {
    const rng = mulberry32(seed);
    const n = Math.round(WORLD_W / TERRAIN_STEP);      // 80 segments
    const ys = new Array(n + 1);
    // coarse skeleton: hills every ~8 samples
    const coarse = [];
    for (let i = 0; i <= n; i += 8) coarse.push(230 + rng() * 520);
    coarse[coarse.length - 1] = coarse[0];
    for (let i = 0; i <= n; i++) {
      const c = i / 8;
      const i0 = Math.floor(c), t = c - i0;
      const a = coarse[Math.min(i0, coarse.length - 1)];
      const b = coarse[Math.min(i0 + 1, coarse.length - 1)];
      const s = t * t * (3 - 2 * t);
      ys[i] = a + (b - a) * s;
    }
    // jaggedness: sample noise, larger on rougher selections
    const rough = difficulty === 'training' ? 55 : difficulty === 'cadet' ? 80 : 110;
    for (let i = 1; i < n; i++) ys[i] += (rng() - 0.5) * 2 * rough;
    // a few sharp peaks
    const peaks = 2 + Math.floor(rng() * 3);
    for (let p = 0; p < peaks; p++) {
      const i = 2 + Math.floor(rng() * (n - 4));
      ys[i] += 180 + rng() * 260;
      ys[i - 1] += 60 + rng() * 80;
      ys[i + 1] += 60 + rng() * 80;
    }
    ys[n] = ys[0];

    // pads: one per tier, the extra ones on easy selections repeat the wide tiers
    const padCount = DIFFICULTY[difficulty].pads;
    const pads = [];
    const tiers = [];
    for (let k = 0; k < padCount; k++) tiers.push(PAD_TIERS[k % PAD_TIERS.length]);
    // shuffle tiers
    for (let i = tiers.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = tiers[i]; tiers[i] = tiers[j]; tiers[j] = t;
    }
    const taken = [];
    let guard = 0;
    for (let k = 0; k < tiers.length && guard < 400; k++) {
      const w = tiers[k].width;
      let ok = false, x0 = 0;
      while (!ok && guard++ < 400) {
        x0 = 80 + rng() * (WORLD_W - 160 - w);
        ok = true;
        for (const t of taken) {
          if (x0 < t[1] + 140 && x0 + w > t[0] - 140) { ok = false; break; }
        }
      }
      if (!ok) continue;
      const x1 = x0 + w;
      const i0 = Math.floor(x0 / TERRAIN_STEP), i1 = Math.ceil(x1 / TERRAIN_STEP);
      let y = 0;
      for (let i = i0; i <= i1; i++) y += ys[i];
      y = y / (i1 - i0 + 1);
      y = Math.max(200, Math.min(760, y));
      taken.push([x0, x1]);
      pads.push({ x0: +x0.toFixed(2), x1: +x1.toFixed(2), y: +y.toFixed(2), mult: tiers[k].mult, i0: i0, i1: i1 });
    }
    // the secret flat — a strip that is not a pad
    let secret = null;
    if (rng() < opts.secretOdds) {
      const w = 64;
      for (let tries = 0; tries < 60; tries++) {
        const x0 = 80 + rng() * (WORLD_W - 160 - w);
        let ok = true;
        for (const t of taken) if (x0 < t[1] + 160 && x0 + w > t[0] - 160) { ok = false; break; }
        if (!ok) continue;
        const i0 = Math.floor(x0 / TERRAIN_STEP), i1 = Math.ceil((x0 + w) / TERRAIN_STEP);
        let y = 0;
        for (let i = i0; i <= i1; i++) y += ys[i];
        y = Math.max(200, Math.min(760, y / (i1 - i0 + 1)));
        secret = { x0: +x0.toFixed(2), x1: +(x0 + w).toFixed(2), y: +y.toFixed(2), i0: i0, i1: i1 };
        taken.push([x0, x0 + w]);
        break;
      }
    }
    // Build the polyline: base samples with pads spliced in as exact flats.
    const pts = [];
    const flats = pads.slice();
    if (secret) flats.push(secret);
    flats.sort((a, b) => a.x0 - b.x0);
    let fi = 0;
    for (let i = 0; i <= n; i++) {
      const x = i * TERRAIN_STEP;
      while (fi < flats.length && flats[fi].x1 < x) fi++;
      const f = flats[fi];
      if (f && x >= f.x0 - TERRAIN_STEP && x <= f.x1 + TERRAIN_STEP) {
        // inside or beside a flat: emit the flat's corners once, skip interior samples
        if (x >= f.x0 - TERRAIN_STEP && x < f.x0) {
          pts.push([x, ys[i]]);
          pts.push([f.x0, f.y]);
          pts.push([f.x1, f.y]);
        } else if (x > f.x1) {
          pts.push([x, ys[i]]);
        }
        // samples strictly inside the flat are dropped
        continue;
      }
      pts.push([x, ys[i]]);
    }
    // wrap seam: force last == first
    pts[pts.length - 1] = [WORLD_W, pts[0][1]];
    return { pts: pts, pads: pads, secret: secret, width: WORLD_W, seed: seed };
  }

  function wrapX(x) {
    x = x % WORLD_W;
    return x < 0 ? x + WORLD_W : x;
  }

  // Ground height under x (terrain polyline, wrapped). Linear scan is fine: ~90 points.
  function groundAt(terrain, x) {
    x = wrapX(x);
    const pts = terrain.pts;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid][0] <= x) lo = mid; else hi = mid;
    }
    const a = pts[lo], b = pts[hi];
    const span = b[0] - a[0];
    if (span <= 0) return a[1];
    const t = (x - a[0]) / span;
    return a[1] + (b[1] - a[1]) * t;
  }

  function padUnder(terrain, x0, x1) {
    for (const p of terrain.pads) {
      if (x0 >= p.x0 - 0.5 && x1 <= p.x1 + 0.5) return p;
    }
    return null;
  }
  function secretUnder(terrain, x0, x1) {
    const s = terrain.secret;
    if (!s) return null;
    return (x0 >= s.x0 - 0.5 && x1 <= s.x1 + 0.5) ? s : null;
  }

  // ---- game --------------------------------------------------------------
  function createGame(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    if (!DIFFICULTY[o.difficulty]) o.difficulty = 'cadet';
    const state = {
      opts: o,
      seed: o.seed >>> 0,
      difficulty: o.difficulty,
      fuel: o.fuel,
      fuelStart: o.fuel,
      score: 0,
      attempt: 0,
      time: 0,
      phase: 'idle',       // idle | flying | landed | crashed | over
      terrain: null,
      ship: null,
      result: null,        // last attempt's outcome
      log: [],             // every attempt's outcome, oldest first
    };
    newAttempt(state);
    return state;
  }

  function newAttempt(state) {
    if (state.phase === 'over') return false;
    state.attempt += 1;
    state.terrain = makeTerrain(hashSeed(state.seed, state.attempt), state.difficulty, state.opts);
    state.ship = {
      x: SPAWN.x, y: SPAWN.y, vx: SPAWN.vx, vy: SPAWN.vy,
      angle: 0, angVel: 0,
      lever: 0,            // 0..1, the commanded thrust
      thrust: 0,           // 0..1, what is actually burning this step
      abortT: 0,
      alive: true,
    };
    state.phase = 'flying';
    state.result = null;
    state.attemptTime = 0;
    return true;
  }

  function shipPoints(ship) {
    const c = Math.cos(ship.angle), s = Math.sin(ship.angle);
    // angle > 0 tilts the nose to the right (clockwise on screen).
    const map = (p) => [ship.x + p[0] * c + p[1] * s, ship.y - p[0] * s + p[1] * c];
    return {
      footL: map(SHIP.footL), footR: map(SHIP.footR),
      top: map(SHIP.top), sideL: map(SHIP.sideL), sideR: map(SHIP.sideR),
    };
  }

  // Normalised tilt: angle folded into [-pi, pi], abs.
  function tiltOf(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return Math.abs(a);
  }

  function altitude(state) {
    const s = state.ship;
    if (!s) return 0;
    const pts = shipPoints(s);
    const fy = Math.min(pts.footL[1], pts.footR[1]);
    const fx = (pts.footL[0] + pts.footR[0]) * 0.5;
    return fy - groundAt(state.terrain, fx);
  }

  // input: { rotate: -1|0|1, lever: 0..1, abort: bool }
  function step(state, input) {
    const events = [];
    if (state.phase !== 'flying') return events;
    const d = DIFFICULTY[state.difficulty];
    const o = state.opts;
    const s = state.ship;
    const g = GRAVITY * d.gravity * o.gravityScale;

    // rotation
    const rot = input.rotate | 0;
    if (d.inertia > 0) {
      s.angVel += rot * d.inertia * o.rotScale * DT;
    } else {
      s.angVel = rot * d.rot * o.rotScale;
    }
    s.angle += s.angVel * DT;

    // the lever and the abort burst
    s.lever = Math.max(0, Math.min(1, +input.lever || 0));
    if (input.abort && s.abortT <= 0 && state.fuel > 0) {
      s.abortT = ABORT_TIME;
      events.push({ type: 'abort' });
    }
    let thrust = Math.pow(s.lever, o.leverCurve);
    let burnMult = 1;
    if (s.abortT > 0) {
      s.abortT -= DT;
      thrust = 1;
      burnMult = ABORT_BURN;
    }
    if (state.fuel <= 0) { thrust = 0; state.fuel = 0; }
    s.thrust = thrust;
    if (thrust > 0) {
      state.fuel = Math.max(0, state.fuel - FUEL_BURN * thrust * burnMult * DT);
      if (state.fuel === 0) events.push({ type: 'dry' });
    }

    // integrate
    const a = MAX_THRUST * o.thrustScale * thrust;
    const ax = Math.sin(s.angle) * a;
    const ay = Math.cos(s.angle) * a - g;
    s.vx += ax * DT;
    s.vy += ay * DT;
    s.x = wrapX(s.x + s.vx * DT);
    s.y += s.vy * DT;
    state.time += DT;
    state.attemptTime += DT;

    // contact
    const pts = shipPoints(s);
    const T = state.terrain;
    const gl = groundAt(T, pts.footL[0]);
    const gr = groundAt(T, pts.footR[0]);
    const footHit = pts.footL[1] <= gl || pts.footR[1] <= gr;
    const bodyHit = pts.top[1] <= groundAt(T, pts.top[0]) ||
      pts.sideL[1] <= groundAt(T, pts.sideL[0]) ||
      pts.sideR[1] <= groundAt(T, pts.sideR[0]);
    if (footHit || bodyHit) {
      resolveContact(state, pts, bodyHit, events);
    }
    return events;
  }

  function resolveContact(state, pts, bodyHit, events) {
    const s = state.ship;
    const T = state.terrain;
    const tilt = tiltOf(s.angle);
    const vy = -s.vy;                 // positive = descending
    const vx = Math.abs(s.vx);
    const lx = Math.min(pts.footL[0], pts.footR[0]);
    const rx = Math.max(pts.footL[0], pts.footR[0]);
    const pad = bodyHit ? null : padUnder(T, lx, rx);
    const secret = bodyHit ? null : secretUnder(T, lx, rx);
    let grade = null;
    if ((pad || secret) && !bodyHit) {
      for (const G of GRADES) {
        if (vy <= G.vy && vx <= G.vx && tilt <= G.tilt) { grade = G; break; }
      }
    }
    const result = {
      attempt: state.attempt,
      vy: +vy.toFixed(1), vx: +vx.toFixed(1), tilt: +(tilt * 180 / Math.PI).toFixed(1),
      x: s.x, y: s.y,
      pad: pad ? { mult: pad.mult, x0: pad.x0, x1: pad.x1 } : null,
      secret: !!secret,
      time: +state.attemptTime.toFixed(1),
    };
    if (grade && secret) {
      result.kind = 'secret';
      result.points = 0;
      s.y = secret.y - SHIP.footL[1];
      s.vx = s.vy = 0; s.angle = 0; s.angVel = 0;
      state.phase = 'landed';
    } else if (grade) {
      result.kind = grade.name;
      result.points = grade.points * pad.mult;
      result.fuelBonus = grade.fuel;
      state.score += result.points;
      state.fuel += grade.fuel;
      s.y = pad.y - SHIP.footL[1];
      s.vx = s.vy = 0; s.angle = 0; s.angVel = 0;
      state.phase = 'landed';
    } else {
      result.kind = 'crash';
      result.points = CRASH_POINTS;
      result.reason = bodyHit ? 'body' : (!pad && !secret) ? 'terrain' :
        vy > GRADES[2].vy ? 'speed' : tilt > GRADES[2].tilt ? 'tilt' : 'drift';
      state.score += CRASH_POINTS;
      state.fuel = Math.max(0, state.fuel - CRASH_FUEL);
      state.phase = 'crashed';
      s.alive = false;
    }
    s.thrust = 0;
    s.lever = 0;
    state.result = result;
    state.log.push(result);
    events.push({ type: result.kind === 'crash' ? 'crashed' : 'landed', result: result });
    if (state.fuel <= 0) {
      state.fuel = 0;
      state.phase = 'over';
      events.push({ type: 'over' });
    }
  }

  // Run whole fixed steps for `seconds`; returns collected events and the
  // leftover fraction so a shell can accumulate.
  function advance(state, input, seconds, carry) {
    let t = (carry || 0) + seconds;
    const events = [];
    let n = 0;
    while (t >= DT && n < 600) {
      const ev = step(state, input);
      for (const e of ev) events.push(e);
      t -= DT;
      n++;
      if (state.phase !== 'flying') break;
    }
    return { events: events, carry: t >= DT ? 0 : t };
  }

  function readouts(state) {
    const s = state.ship;
    return {
      altitude: Math.max(0, Math.round(altitude(state))),
      hSpeed: Math.round(s.vx),
      vSpeed: Math.round(s.vy),
      fuel: Math.round(state.fuel),
      score: state.score,
      time: state.time,
      tilt: Math.round(tiltOf(s.angle) * 180 / Math.PI),
    };
  }

  globalThis.LunarCore = {
    DT: DT,
    WORLD_W: WORLD_W,
    SPAWN: SPAWN,
    SHIP: SHIP,
    GRAVITY: GRAVITY,
    MAX_THRUST: MAX_THRUST,
    FUEL_BURN: FUEL_BURN,
    LEVER_CURVE: LEVER_CURVE,
    DIFFICULTY: DIFFICULTY,
    GRADES: GRADES,
    PAD_TIERS: PAD_TIERS,
    DEFAULTS: DEFAULTS,
    mulberry32: mulberry32,
    hashSeed: hashSeed,
    makeTerrain: makeTerrain,
    groundAt: groundAt,
    wrapX: wrapX,
    padUnder: padUnder,
    createGame: createGame,
    newAttempt: newAttempt,
    shipPoints: shipPoints,
    tiltOf: tiltOf,
    altitude: altitude,
    step: step,
    advance: advance,
    readouts: readouts,
  };
})();
