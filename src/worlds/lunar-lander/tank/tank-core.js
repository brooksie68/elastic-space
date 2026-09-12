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
    hits: 3,                          // (kept for older readers: the hull is an ARMOR pool now, see below)
    lives: 3,
    armor: 100,                       // THE HULL POOL (2026-09-11): a shell takes DAMAGE.shell, a beam a nibble; 0 = dead
  };
  // What hurts the hull, by what fired it (James: the mech beam "isn't very
  // powerful but can fire relatively frequently"). Three tank shells kill a
  // whole hull, as before.
  const DAMAGE = { shell: 34, tower: 34, gunpit: 26, missile: 34, hover: 12, beam: 5, boss: 34 };
  // THE PICKUPS (James, 2026-09-11: "armor pickups here and there and some
  // bonus pickups: increased speed, increased shell speed, increased armor"):
  // canisters on the route, taken by driving over them. Bonuses stack to
  // BONUS_MAX each and hold for the whole tank campaign.
  const PICKUP = { reach: 18, armor: 34, bonusStep: 0.2, armorMaxStep: 34, max: 3 };
  const PICKUP_KINDS = ['armor', 'speed', 'shell', 'armormax'];
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
  // `dmg` names the DAMAGE row a hit does; `hover` lifts the hull that far off
  // the ground (hovercraft); `beam` = an instant hit-scan weapon instead of a
  // shell; `boss` = a mini boss (the level's last waypoint needs its death).
  const ENEMY = {
    slow:    { name: 'TANK',        mult: 1, speed: 24, turn: 0.55, range: 780, reload: 5.2, shellSpeed: 260, hp: 1, length: 24, width: 15, hullH: 8, dmg: 'shell' },
    medium:  { name: 'FAST TANK',   mult: 2, speed: 44, turn: 1.0,  range: 860, reload: 3.6, shellSpeed: 300, hp: 1, length: 21, width: 13, hullH: 6, dmg: 'shell' },
    hover:   { name: 'HOVER',       mult: 1, speed: 84, turn: 2.4,  range: 520, reload: 1.6, shellSpeed: 400, hp: 1, length: 14, width: 10, hullH: 5, dmg: 'hover', hover: 6, strafe: true },
    mech:    { name: 'MECH WALKER', mult: 2, speed: 30, turn: 1.3,  range: 720, reload: 1.4, shellSpeed: 0,   hp: 2, length: 12, width: 12, hullH: 24, dmg: 'beam', beam: true, box: { y0: 12, y1: 22, w: 10, l: 10 } },
    warden:  { name: 'THE WARDEN',  mult: 4, speed: 20, turn: 0.5,  range: 900, reload: 2.2, shellSpeed: 300, hp: 4, length: 34, width: 20, hullH: 11, dmg: 'shell', boss: true },
    strider: { name: 'THE STRIDER', mult: 5, speed: 34, turn: 1.1,  range: 900, reload: 0.9, shellSpeed: 320, hp: 5, length: 20, width: 20, hullH: 40, dmg: 'beam', beam: true, boss: true, shells: 3.0, box: { y0: 20.4, y1: 37.4, w: 17, l: 17 } },
    boss:    { name: 'SIEGE TANK',  mult: 5, speed: 30, turn: 0.7,  range: 1000, reload: 2.4, shellSpeed: 320, hp: 6, length: 44, width: 26, hullH: 14, dmg: 'boss', boss: true },
  };
  // Structures that shoot: the gun tower and the gun pit (emplacements) fire a
  // shell at the tank in range on a reload; the hangar spawns the base's
  // garrison as the tank closes.
  const GUN = { tower: { range: 900, reload: 3.6, shellSpeed: 300, hp: 2, dmg: 'tower' }, gunpit: { range: 620, reload: 4.4, shellSpeed: 280, hp: 1, dmg: 'gunpit' } };
  const HANGAR = { trigger: 1100, waves: [{ slow: 2, hover: 1 }, { slow: 1, hover: 2 }], hp: 4 };
  const BASE_HP = 6;
  const SAM = { range: 1100, reload: 6.5, missileSpeed: 150, missileTurn: 0.9, missileLife: 9, radius: 8, doorOpen: 2.0 };
  const SPAWN_MIN = 1900, SPAWN_MAX = 2800;   // ft from the tank, where a wave appears (was 1300–2200: "in the freaking kill box")
  const START_CLEAR = 1300;                   // ft: no hostile structure this near the start
  const RADAR_RANGE = 1600;

  // ---- the missions -------------------------------------------------------------------
  // Each mission is a stretch of the lander's chunks. It is complete when every
  // hostile structure in the stretch is dead and every wave has been spawned
  // and killed. Waves come when the field is nearly clear.
  // THE LEVELS (James, 2026-09-11: "same setup as the lander: 3 levels, each
  // level should entail laying waste to a variety of enemies and structures
  // on the way to a mini boss of some sort. base at the end"). Three stretches
  // EAST of the lander's base (the lander's levels end at chunk 17). Each is
  // a ROUTE: waypoints WP.spacing apart from the start to the end, each one a
  // landmark + an encounter dealt from the level's deck (in order, so the
  // fights escalate), the last one the mini boss; level 3 ends at THE BASE.
  const MISSIONS = [
    null,
    { name: 'THE ROAD OUT',    chunks: [18, 19],
      deck: [{ slow: 2 }, { hover: 2 }, { slow: 1, hover: 1 }, { tower: 1 }, { mech: 1 }, { slow: 2, hover: 1 }],
      boss: { warden: 1, slow: 1 } },
    { name: 'STRIDER COUNTRY', chunks: [20, 22],
      deck: [{ hover: 2 }, { mech: 1, slow: 1 }, { gunpit: 2 }, { medium: 2 }, { mech: 2 }, { tower: 1, hover: 1 }, { medium: 1, hover: 2 }, { mech: 1, medium: 1 }, { slow: 2, mech: 1 }],
      boss: { strider: 1, hover: 2 } },
    { name: 'THE LAST MILE',   chunks: [23, 26],
      deck: [{ medium: 2 }, { mech: 2 }, { hover: 3 }, { tower: 2 }, { slow: 2, mech: 1 }, { gunpit: 2, hover: 1 }, { medium: 2, mech: 1 }, { tower: 1, mech: 1 }, { hover: 3, medium: 1 }, { mech: 2, slow: 1 }, { medium: 3 }],
      boss: { boss: 1, hover: 2 }, base: true },
  ];
  // The route: waypoints WP.spacing ft apart (jittered), winding ±WP.z off the
  // flight line; an encounter spawns when the tank comes within WP.trigger,
  // a waypoint is REACHED within WP.reach (a boss waypoint needs its kill).
  const WP = { spacing: 1200, jitter: 220, z: 620, reach: 150, trigger: 950, first: 900 };
  const LANDMARK_SIDE = 130;          // ft: a landmark stands this far beside its waypoint, never on the road
  const DEFAULTS = { seed: 1, mission: 1, lives: TANK.lives, structureSpread: 420, spawnGrace: 7.0, score: 0, campaign: false };

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
    for (const o of (state.seated[k] || [])) out.push(o);
    cache[k] = out;
    return out;
  }
  // Seat a structure of the tank's own (a landmark, a gun tower, the base's
  // parts) at (x, z) on chunk k: the same object shape as the lander's, with a
  // faux lander record so every reader sees `st.alive`. Solid, flat under it.
  function seatStructure(state, id, x, z, extra) {
    const kind = S().BY_ID[id];
    const k = Math.floor(x / CHUNK_W);
    const n = (state.seated[k] || []).length;
    const d = kind.d;
    const sid = k + ':t' + n;
    const west = !!(extra && extra.face === 'west');   // the profile faces the road (west), so its footprint turns: w along z, d along x
    const fw = west ? d : kind.w, fd = west ? kind.w : d;
    const o = Object.assign({ st: { alive: true, id: id, sid: sid }, sid: sid, id: id, name: kind.name, cls: kind.cls, mult: kind.mult, hard: kind.hard, k: k,
      x: x, z: z, w: fw, h: kind.h, d: fd, x0: x - fw / 2, x1: x + fw / 2, z0: z - fd / 2, z1: z + fd / 2,
      y: 0, alive: true, hp: GUN[id] ? GUN[id].hp : id === 'hangar' ? HANGAR.hp : id === 'base' ? BASE_HP : 1, door: 0, reload: 0, fired: 0, seated: true, landmark: !!kind.landmark, gun: !!GUN[id] }, extra || {});
    o.y = naturalAt(state, x, z);
    if (!state.seated[k]) state.seated[k] = [];
    state.seated[k].push(o);
    if (state.structs[k]) state.structs[k].push(o);   // already cached: add it in place
    return o;
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
      structs: {}, prof: {}, seated: {},
      mission: 0, missionDef: null, wave: 0, waveT: 0, time: 0, missionTime: 0,
      phase: 'idle',      // idle | play | dead | complete | over
      score: o.score | 0, lives: o.lives, kills: 0,
      campaign: !!o.campaign, campaignDone: false,
      bonus: { speed: 0, shell: 0, armor: 0 },   // the pickups' bonuses, stacked, for the whole tank campaign
      route: [], wp: 0, pickups: [], beams: [],
      tank: null, shells: [], laser: { charge: 1, beam: null }, enemies: [], missiles: [], eshells: [],
      events: [], nextId: 1,
      log: [],
    };
    startMission(state, o.mission);
    return state;
  }
  // The bonuses bend the tank: top speed, the shell's speed (a flatter arc,
  // longer reach), the hull's size.
  function topSpeed(state) { return TANK.topSpeed * (1 + PICKUP.bonusStep * state.bonus.speed); }
  function shellSpeed(state) { return SHELL.speed * (1 + PICKUP.bonusStep * state.bonus.shell); }
  function armorMax(state) { return TANK.armor + PICKUP.armorMaxStep * state.bonus.armor; }
  function newTank(state, x, z, heading) {
    return { x: x, z: z, y: groundAt(state, x, z), heading: heading, turnV: 0, speed: 0,
      look: heading, pitch: 0,          // the view: yaw + pitch, absolute, the mouse's
      turret: heading, gunPitch: 0, turretV: 0,   // the gun: follows the view with mass
      hits: 0, armor: armorMax(state), alive: true, reload: 0, recoil: 0, grace: state.opts.spawnGrace };
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
    state.enemies = []; state.missiles = []; state.eshells = []; state.shells = []; state.beams = [];
    state.laser = { charge: 1, beam: null };
    // make sure every chunk of the stretch exists (and its structures are placed)
    for (let k = def.chunks[0] - 1; k <= def.chunks[1] + 1; k++) chunkStructures(state, k);
    const sp = startSpot(state, def);
    state.start = sp;
    state.tank = newTank(state, sp[0], sp[1], Math.PI / 2);
    layRoute(state, def, sp);
    state.phase = 'play';
    return true;
  }
  // THE ROUTE (James, 2026-09-11: "clear directional goals... waypoints, and
  // visual indicators, unique items and structures along the way. a definite
  // path in each level from the start to the end"). Waypoints march east from
  // the start to the stretch's end, winding across the flight line; each gets
  // a LANDMARK beside it (every level's set unique, in a hashed order), an
  // ENCOUNTER from the level's deck (in order), and the pickups lie on the
  // road between them. The last waypoint is the mini boss; on the last level
  // THE BASE stands beyond it as a waypoint of its own.
  function layRoute(state, def, sp) {
    const rng = C().mulberry32(C().hashSeed(state.seed, 7000 + state.mission));
    const x0 = sp[0], x1 = (def.chunks[1] + 1) * CHUNK_W - (def.base ? 900 : 500);
    const span = x1 - x0 - WP.first;
    const count = Math.max(3, Math.round(span / WP.spacing));
    const step = span / count;
    const marks = S().LANDMARKS.slice();
    for (let i = marks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = marks[i]; marks[i] = marks[j]; marks[j] = t; }
    const route = [];
    let z = sp[1];
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      const x = Math.min(x1, x0 + WP.first + step * i + (last ? step * 0.5 : (rng() - 0.5) * WP.jitter));
      z = Math.max(-WP.z, Math.min(WP.z, z + (rng() - 0.5) * 2 * 520));
      // never on a footprint: nudge across the road until the ground is open
      for (let tries = 0; tries < 16 && blocked(state, x, z, 14); tries++) z += (z > 0 ? -1 : 1) * 40;
      const enc = last ? def.boss : def.deck[i % def.deck.length];
      const wp = { i: i, x: x, z: z, y: 0, name: last ? 'THE ' + (def.base ? 'SIEGE' : 'BOSS') : 'WAYPOINT ' + (i + 1), landmark: null, encounter: enc, spawned: false, reached: false, done: false, boss: last, base: false, killsNeeded: [] };
      // the landmark beside it (not on the last: the boss has the ground)
      if (!last && i < marks.length) {
        const id = marks[i];
        // beside the road, inward when the road runs near its edge
        const side = z > WP.z - 220 ? -1 : z < -WP.z + 220 ? 1 : (rng() < 0.5 ? -1 : 1);
        const lz = z + side * LANDMARK_SIDE;
        const o = seatStructure(state, id, x, lz, {});
        wp.landmark = o; wp.name = o.name;
      }
      wp.y = groundAt(state, x, z);
      route.push(wp);
    }
    if (def.base) {
      // the base: a compound at the far end — the hull, the hangar, two towers, four pits
      const bx = (def.chunks[1] + 1) * CHUNK_W - 420, bz = 0;
      const hull = seatStructure(state, 'base', bx, bz, { hp: BASE_HP, face: 'west' });
      const hangar = seatStructure(state, 'hangar', bx - 260, bz + 200, { face: 'west' });
      const towers = [seatStructure(state, 'tower', bx - 300, bz - 260, {}), seatStructure(state, 'tower', bx + 40, bz - 300, {})];
      const pits = [seatStructure(state, 'gunpit', bx - 420, bz - 60, {}), seatStructure(state, 'gunpit', bx - 400, bz + 360, {}), seatStructure(state, 'gunpit', bx - 120, bz + 330, {}), seatStructure(state, 'gunpit', bx - 140, bz - 400, {})];
      const wp = { i: route.length, x: bx - 560, z: bz, y: 0, name: 'THE BASE', landmark: null, encounter: null, spawned: false, reached: false, done: false, boss: false, base: true, killsNeeded: [hull, hangar], hangar: hangar, hull: hull, towers: towers, pits: pits, hangarWave: 0 };
      wp.y = groundAt(state, wp.x, wp.z);
      route.push(wp);
    }
    state.route = route;
    state.wp = 0;
    // the pickups: an armor canister on most legs, a bonus on every third
    const pickups = [];
    for (let i = 0; i < route.length; i++) {
      const a = i === 0 ? { x: sp[0], z: sp[1] } : route[i - 1], b = route[i];
      const f = 0.35 + rng() * 0.3;
      const px = a.x + (b.x - a.x) * f, pz = a.z + (b.z - a.z) * f + (rng() - 0.5) * 120;
      if (i % 3 === 2) { const kind = ['speed', 'shell', 'armormax'][Math.floor(rng() * 3)]; pickups.push(makePickup(state, kind, px, pz)); }
      else if (rng() < 0.75) pickups.push(makePickup(state, 'armor', px, pz));
    }
    state.pickups = pickups;
    // the first waypoint's encounter is already on the field (a patrol waits by the road)
  }
  function makePickup(state, kind, x, z) {
    // never inside a footprint: nudge sideways until clear
    let px = x, pz = z, tries = 0;
    while (blocked(state, px, pz, 10) && tries++ < 12) pz += 30;
    return { id: state.nextId++, kind: kind, x: px, z: pz, y: groundAt(state, px, pz), taken: false };
  }
  function nextWaypoint(state) {
    for (const wp of state.route) if (!wp.done) return wp;
    return null;
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
  // The road, one step: the next waypoint's encounter comes out as the tank
  // closes; the waypoint is reached inside WP.reach (a boss's needs its kill;
  // the base's its hull and hangar); the level ends when the last is done.
  function stepRoute(state, events) {
    const t = state.tank;
    const wp = nextWaypoint(state);
    if (!wp) return;
    const dist = Math.hypot(wp.x - t.x, wp.z - t.z);
    if (!wp.spawned && dist < WP.trigger) {
      wp.spawned = true;
      if (wp.encounter) {
        const spawned = spawnGroup(state, wp.encounter, wp);
        if (wp.boss) for (const e of spawned) if (ENEMY[e.kind] && ENEMY[e.kind].boss) wp.killsNeeded.push(e);
        events.push({ type: 'encounter', wp: wp.i, name: wp.name, boss: wp.boss, count: spawned.length });
      }
    }
    if (wp.base && wp.spawned && wp.hangar.alive) {
      // the hangar's garrison: a wave each time the tank is inside the trigger with the field quiet
      const hd = Math.hypot(wp.hangar.x - t.x, wp.hangar.z - t.z);
      const alive = state.enemies.filter((e) => e.alive).length;
      if (hd < HANGAR.trigger && wp.hangarWave < HANGAR.waves.length && alive <= 1) {
        state.waveT += DT;
        if (state.waveT > 2.0) { state.waveT = 0; const w = HANGAR.waves[wp.hangarWave++]; spawnGroup(state, w, wp.hangar); events.push({ type: 'hangar', wave: wp.hangarWave, of: HANGAR.waves.length }); }
      }
    }
    if (!wp.reached && dist < WP.reach) { wp.reached = true; events.push({ type: 'waypoint', wp: wp.i, name: wp.name, of: state.route.length }); }
    if (wp.reached && !wp.done) {
      const need = wp.killsNeeded.every((o) => !o.alive);
      if (need) {
        wp.done = true;
        state.start = [wp.x, wp.z];   // a death respawns here now
        events.push({ type: 'waypointDone', wp: wp.i, name: wp.name, last: !nextWaypoint(state) });
        if (!nextWaypoint(state)) {
          state.phase = 'complete';
          state.log.push({ mission: state.mission, time: +state.missionTime.toFixed(1), score: state.score });
          const last = !MISSIONS[state.mission + 1];
          if (last) state.campaignDone = true;
          events.push({ type: 'complete', mission: state.mission, last: last });
        }
      }
    }
  }
  // Pickups: drive over one to take it.
  function stepPickups(state, events) {
    const t = state.tank;
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      if (Math.hypot(pk.x - t.x, pk.z - t.z) > PICKUP.reach) continue;
      pk.taken = true;
      let text = '';
      if (pk.kind === 'armor') { const before = t.armor; t.armor = Math.min(armorMax(state), t.armor + PICKUP.armor); text = 'ARMOR +' + Math.round(t.armor - before); }
      else if (pk.kind === 'speed') { state.bonus.speed = Math.min(PICKUP.max, state.bonus.speed + 1); text = 'SPEED +' + Math.round(PICKUP.bonusStep * 100 * state.bonus.speed) + '%'; }
      else if (pk.kind === 'shell') { state.bonus.shell = Math.min(PICKUP.max, state.bonus.shell + 1); text = 'SHELL SPEED +' + Math.round(PICKUP.bonusStep * 100 * state.bonus.shell) + '%'; }
      else if (pk.kind === 'armormax') { state.bonus.armor = Math.min(PICKUP.max, state.bonus.armor + 1); t.armor = armorMax(state); text = 'ARMOR ' + Math.round(armorMax(state)) + ' — FULL'; }
      events.push({ type: 'pickup', kind: pk.kind, x: pk.x, y: pk.y, z: pk.z, text: text });
    }
  }
  // A group (an encounter) comes out around a point: vehicles spread on the far
  // side of it from the tank, never inside a footprint and never nearer the
  // tank than SPAWN_NEAR; a tower or a gun pit is SEATED there for good.
  const SPAWN_NEAR = 420, SPAWN_RING = 260;
  function spawnGroup(state, w, at) {
    const t = state.tank;
    const out = [];
    state.wave++;
    const away = headingTo(t.x, t.z, at.x, at.z);
    for (const kind of Object.keys(w)) {
      for (let i = 0; i < w[kind]; i++) {
        let x = 0, z = 0, ok = false;
        for (let tries = 0; tries < 60 && !ok; tries++) {
          const ang = away + (state.rng() - 0.5) * Math.PI * 1.2;
          const dist = 80 + state.rng() * SPAWN_RING;
          const f = forward(ang);
          x = at.x + f[0] * dist; z = at.z + f[1] * dist;
          z = Math.max(-1100, Math.min(1100, z));
          ok = Math.hypot(x - t.x, z - t.z) >= SPAWN_NEAR;
          for (const o of structuresNear(state, x, z, 100)) if (boxDist(o, x, z) < (GUN[kind] ? 70 : 40)) ok = false;
          for (const e of state.enemies) if (e.alive && Math.hypot(e.x - x, e.z - z) < 40) ok = false;
        }
        if (GUN[kind]) { const o = seatStructure(state, kind, x, z, {}); out.push(o); continue; }
        const E = ENEMY[kind];
        if (!E) continue;
        const e = { id: state.nextId++, kind: kind, x: x, z: z, y: groundAt(state, x, z) + (E.hover || 0),
          heading: Math.atan2(t.x - x, -(t.z - z)), speed: 0, hp: E.hp, alive: true,
          reload: 1.2 + state.rng() * E.reload, strafe: state.rng() < 0.5 ? -1 : 1, strafeT: 2 + state.rng() * 4, mode: 'approach', age: 0, phase: state.rng() * 6.28 };
        state.enemies.push(e); out.push(e);
      }
    }
    return out;
  }
  // kept for older callers and the sim: a group around the tank's own front
  function spawnWave(state, w) {
    const t = state.tank;
    const f = forward(t.heading);
    return spawnGroup(state, w || { slow: 2 }, { x: t.x + f[0] * (SPAWN_MIN + 200), z: t.z + f[1] * (SPAWN_MIN + 200) });
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
    const top = topSpeed(state);
    const want = drive > 0 ? top : drive < 0 ? -TANK.reverse : 0;
    const slope = slopeAlong(state, t.x, t.z, t.heading);
    const grade = Math.max(0.45, 1 - Math.max(0, slope) * 1.4);     // uphill slows it, downhill does not speed it
    const target = want * (want > 0 ? grade : 1);
    if (Math.abs(target) > Math.abs(t.speed) && Math.sign(target) === Math.sign(t.speed || target)) t.speed += Math.sign(target) * TANK.accel * DT;
    else t.speed += (target - t.speed) * Math.min(1, TANK.brake * DT / Math.max(1, Math.abs(target - t.speed)));
    if (Math.abs(t.speed) < 0.05 && drive === 0) t.speed = 0;
    t.speed = Math.max(-TANK.reverse, Math.min(top, t.speed));
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
      const v = shellSpeed(state);
      state.shells.push({ x: mz[0], y: mz[1], z: mz[2], vx: d[0] * v, vy: d[1] * v, vz: d[2] * v, age: 0, mine: true });
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
    stepGuns(state, events);
    stepMissiles(state, events);
    stepEnemyShells(state, events);
    stepBeams(state);
    if (state.phase === 'play') stepPickups(state, events);
    if (state.phase === 'play') stepRoute(state, events);
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
  const SOL_DT = DT, SOL_ARC = 15;   // 2026-09-12: the march runs at the physics step — at 0.04 s it skipped a graze the real shell took (a rise 60 ft ahead of the muzzle)
  function shellSolution(state) {
    const t = state.tank;
    const o = muzzle(t), d = gunDir(t);
    const sv = shellSpeed(state);
    let x = o[0], y = o[1], z = o[2], vx = d[0] * sv, vy = d[1] * sv, vz = d[2] * sv;
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
      const ft = Math.min(SHELL.life, range / (sv * cp));
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
    if (!s.seated && typeof C().hitStructure === 'function') {
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
      // fairness, a tank that pauses to aim can be hit. A HOVER never stops:
      // it strafes across and fires on the move; a MECH fires its beam while
      // it walks (no shell to lob).
      if (dist < E.range && e.reload < 1.1 && t.grace <= 0 && !(e.reposT > 0) && !E.strafe && !E.beam) { e.mode = 'aim'; wantH = toTank; wantS = 0; }
      if (E.strafe && dist < E.range * 0.85) { e.mode = 'circle'; }
      // its line was blocked by a building: move sideways for a while
      if (e.reposT > 0) { e.reposT -= DT; e.mode = 'circle'; }
      if (e.mode === 'circle') {
        e.strafeT -= DT;
        if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = (E.strafe ? 1.4 : 2.5) + state.rng() * (E.strafe ? 1.8 : 4); }
        wantH = toTank + e.strafe * Math.PI / 2 * (E.strafe ? 1.0 : 0.8);
        wantS = E.speed * (E.strafe ? 1.0 : 0.7);
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
      e.y = groundAt(state, e.x, e.z) + (E.hover || 0);
      // fire when lined up, in range, reloaded, with a clear line
      e.reload -= DT;
      const aimErr = Math.abs(wrapAngle(toTank - e.heading));
      if (E.beam) {
        // THE BEAM: an instant line from the emitter to the hull, weak, frequent — it fires on the move
        // (the strider also lobs shells from its shoulders on its own clock)
        if (e.reload <= 0 && dist < E.range && t.grace <= 0) {
          const o = [e.x, e.y + E.hullH * 0.85, e.z];
          const target = [t.x, t.y + 4, t.z];
          const dd = [target[0] - o[0], target[1] - o[1], target[2] - o[2]];
          const L = Math.hypot(dd[0], dd[1], dd[2]) || 1;
          const dir = dd.map((v) => v / L);
          const rh = lineClear(state, o, target, e);
          const clear = rh === null;
          e.reload = E.reload * (0.9 + state.rng() * 0.2);
          if (clear) {
            state.beams.push({ x0: o[0], y0: o[1], z0: o[2], x1: target[0], y1: target[1], z1: target[2], age: 0, kind: e.kind });
            events.push({ type: 'beamFire', x: o[0], y: o[1], z: o[2], enemy: e });
            hullHit(state, events, 'beam', e, DAMAGE[E.dmg]);
          } else {
            state.beams.push({ x0: o[0], y0: o[1], z0: o[2], x1: rh[0], y1: rh[1], z1: rh[2], age: 0, kind: e.kind });
            events.push({ type: 'beamFire', x: o[0], y: o[1], z: o[2], enemy: e, blocked: true });
            e.reposT = 1.5 + state.rng() * 1.5;
          }
        }
        if (!E.shells) continue;
        // the strider's shells ride a second clock
        e.reload2 = (e.reload2 === undefined ? 2.5 : e.reload2) - DT;
        if (!(e.reload2 <= 0 && dist < E.range && aimErr < 0.2 && t.grace <= 0)) continue;
        e.reload2 = E.shells * (0.85 + state.rng() * 0.3);
      }
      const canFire = E.beam ? true : e.reload <= 0 && dist < E.range && aimErr < (E.strafe ? 0.5 : 0.12) && t.grace <= 0 && (E.strafe || Math.abs(e.speed) < 4);
      if (canFire) {
        const o = [e.x, e.y + E.hullH * 0.8, e.z];
        const dd = [dx / dist, 0, dz / dist];
        // the lob: solve the launch elevation for a flat shot that carries to the tank
        const g = GRAVITY, v = E.shellSpeed;
        const drop = (t.y + 3) - o[1];
        const el = lobElevation(v, dist, drop);
        const dir = [dd[0] * Math.cos(el), Math.sin(el), dd[2] * Math.cos(el)];
        // a structure in the way? then hold fire
        const rh = rayHit(state, o, dir, dist, 0);
        if (rh.what === 'structure' || rh.what === 'civilian') { e.reload = 0.6; e.reposT = 2.5 + state.rng() * 2; continue; }
        if (!E.beam) e.reload = E.reload * (0.85 + state.rng() * 0.3);
        state.eshells.push({ x: o[0], y: o[1], z: o[2], vx: dir[0] * v, vy: dir[1] * v, vz: dir[2] * v, age: 0, from: e.id, dmg: E.beam ? 'shell' : E.dmg });
        events.push({ type: 'enemyFire', x: o[0], y: o[1], z: o[2], enemy: e });
      }
    }
  }
  // The low ballistic elevation that carries a shell at speed v over `dist` ft
  // to a point `drop` ft above the muzzle (uphill targets get the aim they
  // deserve — the old half-angle guess fell short on a rise). Out of reach: 45°.
  function lobElevation(v, dist, drop) {
    const g = GRAVITY;
    const disc = v * v * v * v - g * (g * dist * dist + 2 * drop * v * v);
    if (disc < 0) return Math.PI / 4;
    return Math.atan2(v * v - Math.sqrt(disc), g * dist);
  }
  // The guns on the ground: a gun tower or a gun pit (an emplacement, seated
  // by the route) lobs a shell at the tank inside its range on its reload.
  function stepGuns(state, events) {
    const t = state.tank;
    for (const s of structuresNear(state, t.x, t.z, 1000)) {
      if (!s.alive || !s.gun) continue;
      const G = GUN[s.id];
      s.reload -= DT;
      const dist = Math.hypot(t.x - s.x, t.z - s.z);
      if (s.reload > 0 || dist > G.range || t.grace > 0) continue;
      const o = [s.x, s.y + s.h * 0.9, s.z];
      const dd = [(t.x - s.x) / dist, 0, (t.z - s.z) / dist];
      const v = G.shellSpeed;
      const drop = (t.y + 3) - o[1];
      const el = lobElevation(v, dist, drop);
      const dir = [dd[0] * Math.cos(el), Math.sin(el), dd[2] * Math.cos(el)];
      const rh = rayHit(state, o, dir, dist, 0);
      if ((rh.what === 'structure' || rh.what === 'civilian') && rh.structure !== s) { s.reload = 0.8; continue; }
      s.reload = G.reload * (0.85 + state.rng() * 0.3); s.fired++;
      state.eshells.push({ x: o[0], y: o[1], z: o[2], vx: dir[0] * v, vy: dir[1] * v, vz: dir[2] * v, age: 0, from: s.sid, dmg: G.dmg });
      events.push({ type: 'gunFire', x: o[0], y: o[1], z: o[2], structure: s });
    }
  }
  // Is the straight line from a to b clear of the ground (a little tolerance:
  // the hull sits on the ground) and of live structures? null = clear, else the
  // point where it meets something.
  function lineClear(state, a, b, shooter) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz);
    const n = Math.max(2, Math.ceil(L / 15));
    const near = structuresNear(state, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2, L / 2 + 60);
    for (let i = 1; i < n; i++) {
      const f = i / n, x = a[0] + dx * f, y = a[1] + dy * f, z = a[2] + dz * f;
      if (y < groundAt(state, x, z) - 2.5) return [x, y, z];
      for (const s of near) if (s.alive && inBox(s, x, y, z, 0) && (!shooter || Math.hypot(s.x - shooter.x, s.z - shooter.z) > 30)) return [x, y, z];
    }
    return null;
  }
  function stepBeams(state) {
    if (!state.beams.length) return;
    const keep = [];
    for (const b of state.beams) { b.age += DT; if (b.age < 0.16) keep.push(b); }
    state.beams = keep;
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
      if (Math.hypot(m.x - t.x, m.y - (t.y + 4), m.z - t.z) < TANK.length * 0.6) { hullHit(state, events, 'missile', m, DAMAGE.missile); continue; }
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
      if (Math.hypot(sh.x - t.x, sh.y - (t.y + 4), sh.z - t.z) < TANK.length * 0.55) { hullHit(state, events, sh.dmg === 'tower' || sh.dmg === 'gunpit' ? 'gun' : sh.dmg === 'hover' ? 'hover' : 'shell', sh, DAMAGE[sh.dmg] || DAMAGE.shell); continue; }
      let struck = false;
      for (const s of structuresNear(state, sh.x, sh.z, 40)) if (s.alive && inBox(s, sh.x, sh.y, sh.z, 0)) { struck = true; break; }
      if (struck) { events.push({ type: 'shellGround', x: sh.x, y: sh.y, z: sh.z }); continue; }
      const gy = groundAt(state, sh.x, sh.z);
      if (sh.y <= gy) { events.push({ type: 'shellGround', x: sh.x, y: gy, z: sh.z }); continue; }
      keep.push(sh);
    }
    state.eshells = keep;
  }
  // A hit on the hull takes `dmg` off the armor pool; `hits` (0..3) is the
  // pool read as thirds for the older instruments. Zero is the end of the tank.
  function hullHit(state, events, by, what, dmg) {
    const t = state.tank;
    if (!t.alive) return;
    const d = dmg === undefined ? DAMAGE.shell : dmg;
    t.armor = Math.max(0, t.armor - d);
    const max = armorMax(state);
    t.hits = Math.min(3, Math.floor((1 - t.armor / max) * 3 + 1e-6));
    if (t.armor > 0) { events.push({ type: 'hullHit', hits: t.hits, by: by, dmg: d, armor: t.armor }); return; }
    t.hits = 3;
    t.alive = false;
    state.lives -= 1;
    state.phase = state.lives > 0 ? 'dead' : 'over';
    events.push({ type: 'dead', by: by, lives: state.lives });
    if (state.phase === 'over') { state.bonus = { speed: 0, shell: 0, armor: 0 }; events.push({ type: 'over' }); }
  }
  // After a death with lives left: the same mission, the field as it stands
  // (kills stay dead), the tank back at the stretch's start, hull whole.
  function respawn(state) {
    if (state.phase !== 'dead') return false;
    const sp = state.start || startSpot(state, state.missionDef);
    state.tank = newTank(state, sp[0], sp[1], Math.PI / 2);
    state.shells = []; state.eshells = []; state.missiles = []; state.beams = [];
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
      armor: Math.round(t.armor), armorMax: Math.round(armorMax(state)), bonus: state.bonus, topSpeed: Math.round(topSpeed(state)), shellSpeed: Math.round(shellSpeed(state)),
      waypoint: (() => { const wp = nextWaypoint(state); if (!wp) return null; const rng2 = Math.hypot(wp.x - t.x, wp.z - t.z); return { i: wp.i, of: state.route.length, name: wp.name, range: Math.round(rng2), bearing: wrapAngle(headingTo(t.x, t.z, wp.x, wp.z) - t.look), reached: wp.reached, boss: wp.boss, base: wp.base, x: wp.x, z: wp.z }; })(),
      routeDone: state.route.filter((w) => w.done).length, routeTotal: state.route.length,
      shellReady: t.reload <= 0, reload: Math.max(0, Math.min(1, 1 - t.reload / SHELL.reload)), shellsOut: state.shells.length, laser: state.laser.charge,
      heading: t.heading, headingDeg: deg(t.heading),
      look: t.look, lookDeg: deg(t.look),
      hullBearing: wrapAngle(t.heading - t.look),
      gunBearing: wrapAngle(t.turret - t.look), gunTilt: t.gunPitch - t.pitch, gunOnView: Math.abs(wrapAngle(t.turret - t.look)) < 0.02 && Math.abs(t.gunPitch - t.pitch) < 0.02,
      gunRange: gr.range, gunHit: gr.what, solution: sol,
      speed: Math.round(t.speed), pitchDeg: Math.round(t.pitch * 180 / Math.PI),
      contacts: contacts, nearest: nearest, inRange: !!(nearest && nearest.range < 900),
      hostilesLeft: hostilesLeft(state), wave: state.wave, waves: 0, campaign: state.campaign, campaignDone: state.campaignDone,
      time: state.missionTime, x: Math.round(t.x), z: Math.round(t.z),
    };
  }

  globalThis.LunarTankCore = {
    DT: DT, CHUNK_W: CHUNK_W, GRAVITY: GRAVITY, shellSolution: shellSolution, muzzle: muzzle, gunDir: gunDir, inHull: inHull,
    TANK: TANK, TURRET: TURRET, SHELL: SHELL, LASER: LASER, ENEMY: ENEMY, SAM: SAM, MISSIONS: MISSIONS, DEFAULTS: DEFAULTS,
    DAMAGE: DAMAGE, PICKUP: PICKUP, PICKUP_KINDS: PICKUP_KINDS, GUN: GUN, HANGAR: HANGAR, BASE_HP: BASE_HP, WP: WP,
    layRoute: layRoute, nextWaypoint: nextWaypoint, seatStructure: seatStructure, spawnGroup: spawnGroup, topSpeed: topSpeed, shellSpeed: shellSpeed, armorMax: armorMax,
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
