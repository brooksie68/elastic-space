// Battle for the Moon 2075 — the lander core (born as Lunar Lander).
//
// Lunar gravity, momentum, a proportional thrust lever that burns fuel,
// landings graded by vertical speed, drift, and attitude — flown over an
// ENDLESS moon (2026-09-04, James: "fly as far as you have the fuel for").
// The moonscape is generated in 4,000 ft chunks, each hashed from the game's
// seed and its index, so any chunk is the same every time you reach it and the
// world persists for the whole life: pads you have landed on stay landed on
// (they refuel you but pay nothing twice). Each chunk rolls its own DEAL of
// pads — sometimes the prize is under you, sometimes three chunks out. After a
// landing the next flight fires you back up through the RING ACCELERATOR
// beside the pad; after a crash you drop back in above the wreck. Fuel is the
// currency: the game runs until the tank is dry. A clean 4X/5X landing earns a
// piece of landing tech kept for the rest of the game (a crash loses the
// newest piece).
//
// Pure module: no DOM, no timers, no Math.random (seeded rng only). Shared
// verbatim with tmp/lunar-lander/sim.mjs — keep it pure or the sim lies.
(function () {
  'use strict';

  const DT = 1 / 120;               // fixed physics step, seconds
  const CHUNK_W = 4000;             // feet per moonscape chunk
  const SPAWN = { x: 320, y: 1720, vx: 62, vy: -6 };
  const RESPAWN_ABOVE = 900;        // after a crash: at least this far above the ground
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
    top: [0, 19],
    sideL: [-13, 2],
    sideR: [13, 2],
  };

  // THE FLIGHT (2026-09-06, James: "I don't want those levels at all"): the
  // four 1979 cabinet selections are gone. One feel — the old Cadet — and it
  // never changes between LEVELS; levels change enemies, weapons, targets and
  // the moon's deals. Gravity multiplies GRAVITY; rot is the hand-on-key
  // rotation rate (rad/s); inertia 0 = rotation stops when the key lifts;
  // pads = the standard deal's count. roughMax / roughAmp ration the rough
  // zones per chunk.
  const FLIGHT = { gravity: 1.0, rot: 1.6, inertia: 0, pads: 4, roughMax: 2, roughAmp: 75 };

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
  const TIER_BY_MULT = {};
  for (const t of PAD_TIERS) TIER_BY_MULT[t.mult] = t;

  // Fuel pads: landing on one refills the tank on top of the grade's own refund.
  const FUEL_PAD_REFILL = 150;
  const FUEL_PAD_PERFECT = 200;

  // Chunk deals — every chunk rolls its own character when it is first
  // generated (hashed, so it is fixed once rolled). Chunk 0 is always a fair
  // standard deal with a fuel pad. The deal picks the pads; which of them
  // carry fuel is the drought rule below.
  const DEALS = ['standard', 'sparse', 'rich', 'dry', 'jackpot'];

  // THE FUEL DROUGHT (2026-09-05, James: "I went by like eight pads before
  // there were suddenly two in a row and I died... it needs to be
  // considerably more common" — but no every-other / every-third rule).
  // Pads are walked in flight order, across chunk seams, and each one rolls
  // for fuel with odds that climb with the number of fuel-less pads since the
  // last fuel pad: FUEL_ODDS[drought] (low right after one, so fuel seldom comes twice running). Three dry pads in a row are ordinary;
  // four is rare (about one run in fifty); five never. A dry deal halves the
  // early odds (the pity climb still fires), a rich deal lifts them. Chunk 0
  // always carries at least one.
  const FUEL_ODDS = [0.15, 0.35, 0.60, 0.85, 1.0];

  // THE WEAPONS (Battle for the Moon, round two, 2026-09-06 — James's riff +
  // answers, world CLAUDE.md "Round one design"). Two weapons from the start
  // and chaff for round three. Ammo refills at pads the way fuel does: each
  // pad may carry ONE supply (missiles / laser / chaff) on its own drought
  // ladder, so you can always get some but may have to choose fuel or
  // weapons this landing.
  const LOADOUT = { missiles: 4, laser: 3, chaff: 3 };
  const AMMO_MAX = { missiles: 6, laser: 5, chaff: 5 };
  const PAD_SUPPLY = { missiles: 2, laser: 2, chaff: 2 };
  const WEAPON_ODDS = [0.28, 0.45, 0.65, 0.85, 1.0];   // a supply on this pad, by the run of pads without one
  const HIT_ODDS = 0.85;            // "pretty accurate... a very small likelihood that they could miss"
  const MISSILE_SPEED = 260;        // ft/s, after a short boost
  const MISSILE_TURN = 2.6;         // rad/s toward its aim point
  const MISSILE_LIFE = 10;          // s, then it is spent wherever it is
  const MISS_SPREAD = [70, 170];    // ft from the target where a miss lands
  const TARGET_POINTS = 100;        // × the target's multiplier
  const CIVILIAN_PENALTY = 150;     // a missile miss that lands on a civilian building
  const OVERHANG_SLOPE = 0.9;       // a data centre under its rock lip: the shot comes from the open (right) side, rise/run under this
  const RIDGE_ALT = 220;            // an ammo depot behind a ridge: the missile needs this much height over it to arc in
  const DOOR_PERIOD = 12, DOOR_OPEN = 2.0;   // a bunker's blast door: open DOOR_OPEN s every DOOR_PERIOD s (round three ties it to its own SAM firing)
  const LEVEL_CHUNKS = 8;           // level 1 is clear when every hostile in chunks 1..8 is gone (James's yes, 2026-09-06)
  const BASE_MISS_CHECK = 22;       // ft: a miss within this of a civilian's box edge hits it
  const FUEL_DEAL_MULT = { standard: 1, sparse: 1, rich: 1.25, dry: 0.5, jackpot: 1 };

  // The ring accelerator beside every pad: rail base sits `offset` ft right of
  // the pad's right edge, `rings` rings along a rail `railLen` ft long.
  const ACCEL = { offset: 46, rings: 8, ringR: 15, railLen: 196 };   // 8 rings 25.4 ft apart (James: "three rings taller")
  const APRON = 150;                // ft of flat ground right of every pad: the accelerator's footing + a clear first climb
  const LAUNCH_HEIGHT = 1450;       // ft above the pad = "flying height"; apexFrac of it is coasted

  // The ways out (drift exits, 2026-09-04). A RELAY pad — a derelict tower's
  // pad — appears on some chunks two or more away from home; landing on it
  // offers the way in. The HORIZON ring hangs far above every chunk's centre;
  // flying through it is a way out that costs the fuel to get there.
  const RELAY_MIN_CHUNK = 2;
  const RELAY_ODDS = 0.3;
  const HORIZON = { y: 3900, r: 140 };
  const LAUNCH_DEFAULTS = { angle: 60, apexFrac: 0.75 };

  // Landing tech — earned in this order by a clean (good or perfect) landing
  // on a 4X or 5X pad; the last piece needs a perfect on a 5X. A crash loses
  // the newest piece. Each piece changes the rules a little:
  //   shock  — the vertical-speed limits of every grade double
  //   spider — the tilt limits of every grade grow by half
  //   auto   — no rule change; the shell may fly autoLever() under AUTO_ALT
  const TECH = [
    { id: 'shock',  name: 'SHOCK LEGS' },
    { id: 'spider', name: 'SPIDER LEGS' },
    { id: 'auto',   name: 'AUTO-THROTTLE' },
  ];
  const TECH_MULT = 4;              // pad multiplier that earns a piece
  const TECH_FINAL_MULT = 5;        // the last piece: a perfect here
  const SHOCK_VY = 2.0;
  const SPIDER_TILT = 1.5;
  // (The GYRO STABILIZER — self-levelling with no key held — and the LANDING
  // RADAR — a beam to the predicted touchdown — were pieces until 2026-09-05/06.
  // James: the gyro "makes it harder to fly rather than helping", the radar
  // "makes the experience and flying worse". Removed for good; do not bring
  // either back.)
  const AUTO_ALT = 100;             // ft — auto-throttle may engage below this
  const AUTO_VY = -4;               // ft/s — the descent it holds
  const SPIDER_ALT = 60;            // ft — where the legs fan out (drawing only)

  const DEFAULTS = {
    seed: 1,
    level: 1,
    fuel: 750,
    gravityScale: 1,       // tuner: stretch the selection's gravity
    rotScale: 1,
    thrustScale: 1,
    leverCurve: LEVER_CURVE,
    secretOdds: 0.35,      // chance a chunk hides the secret flat
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
  function hashSeed(seed, k) {
    let h = (seed * 2654435761 + (k + 0x40000000) * 40503 + 0x9e3779b9) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  const hash01 = (seed, k) => hashSeed(seed, k) / 4294967296;

  // ---- terrain: one chunk -----------------------------------------------
  // Zoned, the way a NASA plot would read: long flat maria and raised
  // plateaus, gentle rolling hills, one or two properly sloped mountains, and
  // a rough stretch here and there because it is a game. Pads sit on the
  // flats. Every chunk begins and ends in a mare whose level is hashed from
  // the SEAM index, so chunk k meets chunk k+1 exactly.
  function seamLevel(seed, k) { return 260 + hash01(seed, k * 7 + 3) * 120; }

  function makeChunk(seed, k, opts, carry) {
    const rng = mulberry32(hashSeed(seed, k));
    const n = Math.round(CHUNK_W / TERRAIN_STEP);      // 80 segments
    const X0 = k * CHUNK_W;
    const ys = new Array(n + 1).fill(0);
    const levelA = seamLevel(seed, k), levelB = seamLevel(seed, k + 1);
    const base = (levelA + levelB) * 0.5;
    const roughMax = FLIGHT.roughMax;
    const roughAmp = FLIGHT.roughAmp;
    const mountains = 1 + (rng() < 0.5 ? 1 : 0);

    // zone sequence in samples; the first and last are maria (the seams)
    const zones = [];
    const pick = () => {
      const r = rng();
      return r < 0.3 ? 'mare' : r < 0.55 ? 'plateau' : r < 0.85 ? 'hills' : 'rough';
    };
    const lenOf = (t) => t === 'mare' ? 8 + Math.floor(rng() * 9) : t === 'plateau' ? 6 + Math.floor(rng() * 7) :
      t === 'hills' ? 6 + Math.floor(rng() * 9) : t === 'mountain' ? 9 + Math.floor(rng() * 6) : 4 + Math.floor(rng() * 5);
    let used = 0, roughs = 0, mts = 0;
    zones.push({ type: 'mare', len: 6 + Math.floor(rng() * 5) });
    used += zones[0].len;
    while (used < n - 6) {
      let t = pick();
      if (t === 'rough' && roughs >= roughMax) t = 'hills';
      if (mts < mountains && zones[zones.length - 1].type !== 'mountain' &&
        (rng() < 0.22 || used > n * 0.72 - 14 * (mountains - mts))) t = 'mountain';
      let len = lenOf(t);
      if (used + len > n - 6) len = n - 6 - used;
      if (len < 3) break;
      if (t === 'mountain' && len < 8) t = 'hills';    // a clipped mountain is a hill
      if (t === 'rough') roughs++;
      if (t === 'mountain') mts++;
      zones.push({ type: t, len: len });
      used += len;
    }
    zones.push({ type: 'mare', len: n - used });

    // per-zone heights
    let i = 0;
    for (const z of zones) {
      z.i0 = i; z.i1 = i + z.len; i += z.len;
      if (z.type === 'mare') z.level = base + (rng() - 0.4) * 50;
      else if (z.type === 'plateau') z.level = base + 120 + rng() * 190;
      else if (z.type === 'hills') z.level = base + 20 + rng() * 60;
      else if (z.type === 'rough') z.level = base + 40 + rng() * 100;
      else z.level = base;
    }
    zones[0].level = levelA;
    zones[zones.length - 1].level = levelB;
    for (let zi = 0; zi < zones.length; zi++) {
      const z = zones[zi];
      if (z.type === 'mare' || z.type === 'plateau') {
        for (let k2 = z.i0; k2 <= z.i1; k2++) ys[k2] = z.level + (rng() - 0.5) * 5;
      } else if (z.type === 'hills') {
        const amp = 35 + rng() * 50, wl = 4 + rng() * 3, ph = rng() * Math.PI * 2;
        for (let k2 = z.i0; k2 <= z.i1; k2++) ys[k2] = z.level + Math.sin((k2 - z.i0) / wl * Math.PI * 2 + ph) * amp + (rng() - 0.5) * 16;
      } else if (z.type === 'rough') {
        for (let k2 = z.i0; k2 <= z.i1; k2++) ys[k2] = z.level + (rng() - 0.5) * 2 * roughAmp;
        if (rng() < 0.4) { const k2 = z.i0 + 1 + Math.floor(rng() * Math.max(1, z.len - 2)); ys[k2] += 120 + rng() * 120; }
      } else {
        // mountain: a broad triangle with two slightly different flanks, a
        // shoulder on one side, a little jitter on the way up; it rises from
        // the higher of its neighbours and never pokes above the spawn
        const prev = zones[zi - 1] ? zones[zi - 1].level : base, next = zones[zi + 1] ? zones[zi + 1].level : base;
        const foot = Math.max(base, prev, next);
        const peakK = z.i0 + 3 + Math.floor(rng() * Math.max(1, z.len - 6));
        const peakH = Math.min(1250 - foot, 350 + rng() * 270);
        const shoulder = rng() < 0.6 ? 0.45 + rng() * 0.2 : 0;
        const shoulderSide = rng() < 0.5 ? -1 : 1;
        for (let k2 = z.i0; k2 <= z.i1; k2++) {
          let t = k2 <= peakK ? (k2 - z.i0) / Math.max(1, peakK - z.i0) : (z.i1 - k2) / Math.max(1, z.i1 - peakK);
          const side = k2 <= peakK ? -1 : 1;
          if (shoulder && side === shoulderSide && t > shoulder - 0.12 && t < shoulder + 0.12) t = shoulder;
          ys[k2] = foot + peakH * t + (t > 0.05 && t < 0.95 ? (rng() - 0.5) * 30 : 0);
        }
      }
    }
    // soften zone boundaries into short slopes (flats keep their interiors)
    for (let zi = 1; zi < zones.length; zi++) {
      const b = zones[zi].i0;
      if (b < 2 || b > n - 2) continue;
      const a = ys[b - 2], c = ys[b + 2];
      ys[b - 1] = a + (c - a) * 0.25; ys[b] = a + (c - a) * 0.5; ys[b + 1] = a + (c - a) * 0.75;
    }
    // the seams are exact
    ys[0] = levelA; ys[1] = levelA + (ys[2] - levelA) * 0.5;
    ys[n] = levelB; ys[n - 1] = levelB + (ys[n - 2] - levelB) * 0.5;

    // ---- the deal: which pads this chunk offers ----
    let deal = 'standard';
    if (k !== 0) {
      const r = rng();
      deal = r < 0.16 ? 'sparse' : r < 0.34 ? 'rich' : r < 0.46 ? 'dry' : r < 0.54 ? 'jackpot' : 'standard';
    }
    const tiers = [];
    if (deal === 'standard') {
      const count = FLIGHT.pads;
      for (let q = 0; q < count; q++) tiers.push(PAD_TIERS[q % PAD_TIERS.length]);
    } else if (deal === 'sparse') {
      tiers.push(TIER_BY_MULT[5], TIER_BY_MULT[2]);
    } else if (deal === 'rich') {
      tiers.push(TIER_BY_MULT[2], TIER_BY_MULT[3], TIER_BY_MULT[4], TIER_BY_MULT[5], TIER_BY_MULT[4]);
    } else if (deal === 'dry') {
      tiers.push(TIER_BY_MULT[3], TIER_BY_MULT[2], TIER_BY_MULT[4]);
    } else {
      // jackpot: two 5X pads (one of them will be fuel); a 3X to make the approach
      tiers.push(TIER_BY_MULT[5], TIER_BY_MULT[5], TIER_BY_MULT[3]);
    }
    for (let i2 = tiers.length - 1; i2 > 0; i2--) {
      const j = Math.floor(rng() * (i2 + 1));
      const t = tiers[i2]; tiers[i2] = tiers[j]; tiers[j] = t;
    }
    // pads go on the flats (maria, plateaus) first
    const zoneSpan = (z) => [Math.max(80, (z.i0 + 1) * TERRAIN_STEP), Math.min(CHUNK_W - 80, (z.i1 - 1) * TERRAIN_STEP)];
    const flats = [], hillsZ = [], anyZ = [];
    for (const z of zones) {
      const sp = zoneSpan(z);
      if (sp[1] - sp[0] <= 100) continue;
      if (z.type === 'mare' || z.type === 'plateau') flats.push(sp);
      else if (z.type === 'hills') hillsZ.push(sp);
      if (z.type !== 'mountain') anyZ.push(sp);   // never on a mountain
    }
    const taken = [];
    const clear = (x0, x1, gap) => { for (const t of taken) if (x0 < t[1] + gap && x1 > t[0] - gap) return false; return true; };
    const pads = [];
    for (let q = 0; q < tiers.length; q++) {
      const w = tiers[q].width;
      let ok = false, x0 = 0;
      // flats first, then hills, then anything that is not a mountain
      for (const pool of [flats, hillsZ, anyZ]) {
        for (let tries = 0; tries < 200 && !ok; tries++) {
          const f = pool[Math.floor(rng() * pool.length)];
          // the pad sits inside the zone; its apron may spill into the next one
          if (!f || f[1] - f[0] < w + 40) continue;
          x0 = f[0] + 20 + rng() * (f[1] - f[0] - w - 40);
          ok = x0 + w + APRON <= CHUNK_W - 20 && clear(x0, x0 + w + APRON, 60);
        }
        if (ok) break;
      }
      if (!ok) continue;
      const x1 = x0 + w;
      const i0 = Math.floor(x0 / TERRAIN_STEP), i1 = Math.ceil(x1 / TERRAIN_STEP);
      let y = 0;
      for (let i3 = i0; i3 <= i1; i3++) y += ys[i3];
      y = y / (i1 - i0 + 1);
      y = Math.max(200, Math.min(760, y));
      taken.push([x0, x1 + APRON]);
      pads.push({ x0: +(X0 + x0).toFixed(2), x1: +(X0 + x1).toFixed(2), y: +y.toFixed(2), mult: tiers[q].mult, fuel: false, used: false, k: k, id: k + ':' + pads.length, apron: +(X0 + x1 + APRON).toFixed(2) });
    }
    // the relay: one pad on some far chunks belongs to a derelict relay tower
    if (pads.length && Math.abs(k) >= RELAY_MIN_CHUNK && rng() < RELAY_ODDS) {
      pads[Math.floor(rng() * pads.length)].relay = true;
    }
    // the fuel drought walk: flight order, odds climbing since the last fuel pad
    const carryIn = typeof carry === 'number' ? { fuel: carry, weapon: 0 } : (carry || { fuel: 0, weapon: 0 });
    let drought = carryIn.fuel || 0;
    const byX = pads.slice().sort((a, b) => a.x0 - b.x0);
    const mult = FUEL_DEAL_MULT[deal];
    for (const p of byX) {
      const odds = FUEL_ODDS[Math.min(drought, FUEL_ODDS.length - 1)];
      p.fuel = odds >= 1 || rng() < odds * mult;
      drought = p.fuel ? 0 : drought + 1;
    }
    if (deal === 'jackpot' && !byX.some((p) => p.mult === 5 && p.fuel)) {
      // the jackpot's promise: one of its 5X pads is the fuel
      const fives = byX.filter((p) => p.mult === 5);
      const pick = fives[Math.floor(rng() * fives.length)];
      if (pick) pick.fuel = true;
      drought = 0; for (const p of byX) drought = p.fuel ? 0 : drought + 1;
    }
    if (k === 0 && pads.length && !byX.some((p) => p.fuel)) {
      byX[Math.floor(rng() * byX.length)].fuel = true;
      drought = 0; for (const p of byX) drought = p.fuel ? 0 : drought + 1;
    }
    // the weapon supply walk: one supply per pad at most, its own drought
    // ladder across seams; which supply is the roll's (missiles favoured)
    let wdrought = carryIn.weapon || 0;
    for (const p of byX) {
      p.supply = null;
      const odds = WEAPON_ODDS[Math.min(wdrought, WEAPON_ODDS.length - 1)];
      if (odds >= 1 || rng() < odds) {
        const r = rng();
        p.supply = r < 0.45 ? 'missiles' : r < 0.8 ? 'laser' : 'chaff';
        wdrought = 0;
      } else wdrought++;
    }
    if (k === 0 && pads.length && !byX.some((p) => p.supply)) {
      byX[byX.length - 1].supply = 'missiles';
      wdrought = 0;
    }
    // the secret flat — a strip that is not a pad
    let secret = null;
    if (rng() < opts.secretOdds) {
      const w = 64;
      for (let tries = 0; tries < 60; tries++) {
        const x0 = 80 + rng() * (CHUNK_W - 160 - w);
        if (!clear(x0, x0 + w, 160)) continue;
        const i0 = Math.floor(x0 / TERRAIN_STEP), i1 = Math.ceil((x0 + w) / TERRAIN_STEP);
        let y = 0;
        for (let i3 = i0; i3 <= i1; i3++) y += ys[i3];
        y = Math.max(200, Math.min(760, y / (i1 - i0 + 1)));
        secret = { x0: +(X0 + x0).toFixed(2), x1: +(X0 + x0 + w).toFixed(2), y: +y.toFixed(2), k: k };
        taken.push([x0, x0 + w]);
        break;
      }
    }
    // ---- the structures (Battle for the Moon, round one): civilians on every
    // chunk, hostiles by the deal, none hostile on chunk 0. Drawings live in
    // structures.js (LunarStructures); the core keeps the footprint, the class
    // and the multiplier. Each footprint flattens the ground under it like a
    // pad does. Solid: the ship crashes into them (step → struck).
    const structures = [];
    const ST = globalThis.LunarStructures;
    if (ST) {
      const pick = (list) => list[Math.floor(rng() * list.length)];
      // hostiles are seated first (they are the game), civilians fill what is left
      const want = [];
      if (k !== 0) {
        if (deal === 'jackpot') want.push('core');
        else if (Math.abs(k) >= 2 && rng() < 0.3) want.push(pick(ST.HARD));
        const nOpen = 1 + (rng() < 0.45 ? 1 : 0);
        for (let q = 0; q < nOpen; q++) want.push(pick(['sam', 'sam', 'gunpit', 'radar', 'jammer']));
      }
      const nCiv = 3 + Math.floor(rng() * 4);   // 3–6 civilians
      for (let q = 0; q < nCiv; q++) want.push(pick(ST.CIV));
      const launchClear = (x0, x1) => { for (const p of pads) if (x0 < p.apron - X0 + 130 && x1 > p.x0 - X0 - 30) return false; return true; };
      for (const id of want) {
        const kind = ST.BY_ID[id];
        if (!kind) continue;
        const w = kind.w;
        const pools = [flats, hillsZ, anyZ];
        let ok = false, x0 = 0, y = 0;
        for (const pool of pools) {
          for (let tries = 0; tries < 160 && !ok; tries++) {
            const f = pool[Math.floor(rng() * pool.length)];
            if (!f || f[1] - f[0] < w + 40) continue;
            x0 = f[0] + 20 + rng() * (f[1] - f[0] - w - 40);
            if (x0 + w > CHUNK_W - 20 || !clear(x0, x0 + w, 60) || !launchClear(x0, x0 + w)) continue;
            const i0 = Math.floor(x0 / TERRAIN_STEP), i1 = Math.ceil((x0 + w) / TERRAIN_STEP);
            let sum = 0, lo = 1e9, hi = -1e9;
            for (let i3 = i0; i3 <= i1; i3++) { sum += ys[i3]; lo = Math.min(lo, ys[i3]); hi = Math.max(hi, ys[i3]); }
            if (hi - lo > Math.max(40, w * 0.35)) continue;   // needs level-ish ground
            y = sum / (i1 - i0 + 1);
            ok = true;
          }
          if (ok) break;
        }
        if (!ok) continue;
        taken.push([x0, x0 + w]);
        structures.push({ id: kind.id, name: kind.name, cls: kind.cls, mult: kind.mult, hard: kind.hard,
          x0: +(X0 + x0).toFixed(2), x1: +(X0 + x0 + w).toFixed(2), y: +y.toFixed(2), h: kind.h, k: k,
          sid: k + ':s' + structures.length, alive: true, hp: kind.hard === 'shield' ? 2 : 1 });
      }
    }
    // Build the polyline (absolute x): base samples with flats spliced in exactly.
    const pts = [];
    const flatsAll = pads.map((p) => ({ x0: p.x0, x1: p.apron, y: p.y }));
    if (secret) flatsAll.push({ x0: secret.x0, x1: secret.x1, y: secret.y });
    for (const st of structures) flatsAll.push({ x0: st.x0, x1: st.x1, y: st.y });
    flatsAll.sort((a, b) => a.x0 - b.x0);
    let fi = 0;
    for (let i4 = 0; i4 <= n; i4++) {
      const x = X0 + i4 * TERRAIN_STEP;
      while (fi < flatsAll.length && flatsAll[fi].x1 < x) fi++;
      const f = flatsAll[fi];
      if (f && x >= f.x0 - TERRAIN_STEP && x <= f.x1 + TERRAIN_STEP) {
        if (x >= f.x0 - TERRAIN_STEP && x < f.x0) {
          pts.push([x, ys[i4]]);
          pts.push([f.x0, f.y]);
          pts.push([f.x1, f.y]);
        } else if (x > f.x1) {
          pts.push([x, ys[i4]]);
        }
        continue;
      }
      pts.push([x, ys[i4]]);
    }
    const zoneOut = zones.map((z) => ({ type: z.type, x0: X0 + z.i0 * TERRAIN_STEP, x1: X0 + z.i1 * TERRAIN_STEP }));
    return { k: k, x0: X0, x1: X0 + CHUNK_W, pts: pts, pads: pads, secret: secret, zones: zoneOut, deal: deal, seed: seed, drought: drought, wdrought: wdrought, structures: structures };
  }

  // ---- the world: chunks on demand, kept for the life ----------------------
  function chunkIndex(x) { return Math.floor(x / CHUNK_W); }
  function getChunk(state, k) {
    const w = state.world;
    let c = w.chunks[k];
    if (!c) {
      // the fuel drought carries across the seam from the chunk before (flight
      // goes right; chunks left of home start fresh)
      const prev = k > 0 ? getChunk(state, k - 1) : null;
      const carry = prev ? { fuel: prev.drought, weapon: prev.wdrought } : { fuel: 0, weapon: 0 };
      c = makeChunk(state.seed, k, state.opts, carry); w.chunks[k] = c; w.version++;
    }
    return c;
  }
  function chunksBetween(state, xa, xb) {
    const out = [];
    for (let k = chunkIndex(xa); k <= chunkIndex(xb); k++) out.push(getChunk(state, k));
    return out;
  }
  function padsNear(state, x, reach) {
    const out = [];
    for (const c of chunksBetween(state, x - reach, x + reach)) for (const p of c.pads) out.push(p);
    return out;
  }
  function structuresNear(state, x, reach) {
    const out = [];
    for (const c of chunksBetween(state, x - reach, x + reach)) for (const st of c.structures) out.push(st);
    return out;
  }

  // Ground height under x. Accepts a game state (endless world) or any object
  // with a `pts` polyline (a single chunk, for tests and the harness).
  function groundAt(w, x) {
    const pts = w.pts ? w.pts : getChunk(w, chunkIndex(x)).pts;
    let lo = 0, hi = pts.length - 1;
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[hi][0]) return pts[hi][1];
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
  function padUnder(w, x0, x1) {
    const pads = w.pads ? w.pads : padsNear(w, (x0 + x1) / 2, CHUNK_W / 2);
    for (const p of pads) {
      if (x0 >= p.x0 - 0.5 && x1 <= p.x1 + 0.5) return p;
    }
    return null;
  }
  function secretUnder(w, x0, x1) {
    const s = w.pts ? w.secret : getChunk(w, chunkIndex((x0 + x1) / 2)).secret;
    if (!s) return null;
    return (x0 >= s.x0 - 0.5 && x1 <= s.x1 + 0.5) ? s : null;
  }

  // ---- game --------------------------------------------------------------
  function createGame(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const state = {
      opts: o,
      seed: o.seed >>> 0,
      level: o.level || 1,
      fuel: o.fuel,
      fuelStart: o.fuel,
      score: 0,
      attempt: 0,
      time: 0,
      phase: 'idle',       // idle | flying | launch | landed | crashed | over
      world: { chunks: {}, version: 0 },
      ship: null,
      result: null,        // last attempt's outcome
      log: [],             // every attempt's outcome, oldest first
      tech: [],            // landing tech held, in the order earned (TECH ids)
      launch: null,        // { pad } while phase === 'launch'
      farthest: 0,         // ft from the spawn, the furthest the ship has been
      gated: false,        // set once the ship has flown through a horizon ring
      ammo: { missiles: LOADOUT.missiles, laser: LOADOUT.laser, chaff: LOADOUT.chaff },
      shots: [],           // missiles in the air and chaff clouds falling
      rolls: 0,            // the weapons' own seeded roll counter (hit / miss / spread)
      hostilesTotal: 0,    // the level's goal: hostiles in chunks 1..LEVEL_CHUNKS
      hostilesLeft: 0,
      levelClear: false,   // every hostile in the level's stretch is gone — the relay ends the level
    };
    getChunk(state, 0);
    // the level's stretch exists from the start: its hostiles are the goal,
    // and a relay pad is promised inside it (chunk LEVEL_CHUNKS gets one if
    // none was dealt) so the level can always be ended
    let relay = false, n = 0;
    for (let k = 1; k <= LEVEL_CHUNKS; k++) {
      const c = getChunk(state, k);
      for (const st of c.structures) if (st.cls !== 'civ') n++;
      if (c.pads.some((p) => p.relay)) relay = true;
    }
    if (!relay) {
      const c = getChunk(state, LEVEL_CHUNKS);
      if (c.pads.length) c.pads[c.pads.length - 1].relay = true;
    }
    state.hostilesTotal = n; state.hostilesLeft = n;
    newAttempt(state);
    return state;
  }

  // ---- the weapons --------------------------------------------------------------------------------
  // The weapons' own rolls: hashed from the seed and a counter, so a game is
  // the same game every time and the sim can count hits.
  function rollW(state) { return mulberry32(hashSeed(state.seed ^ 0x5bd1e995, state.rolls++))(); }
  function structureById(state, sid) {
    const k = parseInt(sid, 10);
    const c = state.world.chunks[k];
    if (!c) return null;
    for (const st of c.structures) if (st.sid === sid) return st;
    return null;
  }
  // The hostile whose box holds (x, y), grown by `slack` ft; civilians never answer.
  function hostileAt(state, x, y, slack) {
    const g = slack || 0;
    for (const st of structuresNear(state, x, 300)) {
      if (st.cls === 'civ' || !st.alive) continue;
      if (x >= st.x0 - g && x <= st.x1 + g && y >= st.y - g && y <= st.y + st.h + g) return st;
    }
    return null;
  }
  function doorOpen(state, st) {
    const t = (state.time + st.k * 3.7) % DOOR_PERIOD;
    return t < DOOR_OPEN;
  }
  // Can this weapon be fired at this structure from where the ship is now?
  // { ok, why } — why is the one word the cursor tag shows: CIVILIAN / DESTROYED /
  // OVERHANG / RIDGE / DOOR.
  function targetable(state, st, weapon) {
    if (!st || st.cls === 'civ') return { ok: false, why: 'CIVILIAN' };
    if (!st.alive) return { ok: false, why: 'DESTROYED' };
    const s = state.ship;
    const cx = (st.x0 + st.x1) / 2;
    if (st.hard === 'overhang') {
      const dx = s.x - cx, dy = s.y - st.y;
      if (dx <= st.x1 - cx || dy / dx > OVERHANG_SLOPE) return { ok: false, why: 'OVERHANG' };
    } else if (st.hard === 'ridge') {
      if (weapon !== 'missiles' || s.y - st.y < RIDGE_ALT) return { ok: false, why: 'RIDGE' };
    } else if (st.hard === 'door') {
      if (!doorOpen(state, st)) return { ok: false, why: 'DOOR' };
    }
    return { ok: true, why: st.hard === 'shield' && st.hp > 1 ? 'SHIELD' : null };
  }
  // A hit lands: the shield goes first on a shielded target, then the building.
  function damage(state, st, events, x, y) {
    st.hp -= 1;
    if (st.hp > 0) { events.push({ type: 'shield', sid: st.sid, x: x, y: y }); return false; }
    st.alive = false;
    state.world.version++;
    if (st.cls !== 'civ') {
      const points = TARGET_POINTS * st.mult;
      state.score += points;
      events.push({ type: 'kill', sid: st.sid, id: st.id, name: st.name, mult: st.mult, points: points, x: (st.x0 + st.x1) / 2, y: st.y });
      if (st.k >= 1 && st.k <= LEVEL_CHUNKS) {
        state.hostilesLeft = Math.max(0, state.hostilesLeft - 1);
        if (state.hostilesLeft === 0 && !state.levelClear) { state.levelClear = true; events.push({ type: 'levelClear', level: state.level }); }
      }
    } else {
      state.score -= CIVILIAN_PENALTY;
      events.push({ type: 'civHit', sid: st.sid, id: st.id, name: st.name, points: -CIVILIAN_PENALTY, x: (st.x0 + st.x1) / 2, y: st.y });
    }
    return true;
  }
  // Fire a weapon at a structure. Returns { ok, why, events } — the events are
  // also what a shell would get from step(), returned here so an instant
  // weapon (the laser) resolves in the same call.
  function fire(state, weapon, sid) {
    const events = [];
    if (state.phase !== 'flying') return { ok: false, why: 'NOT FLYING', events: events };
    if (weapon !== 'missiles' && weapon !== 'laser') return { ok: false, why: 'NO SUCH WEAPON', events: events };
    if (state.ammo[weapon] <= 0) return { ok: false, why: 'EMPTY', events: events };
    const st = structureById(state, sid);
    const t = targetable(state, st, weapon);
    if (!t.ok) return { ok: false, why: t.why, events: events };
    state.ammo[weapon] -= 1;
    const hit = rollW(state) < HIT_ODDS;
    const s = state.ship;
    const cx = (st.x0 + st.x1) / 2, cy = st.y + st.h * 0.5;
    let ax = cx, ay = cy;
    if (!hit) {
      const spread = MISS_SPREAD[0] + rollW(state) * (MISS_SPREAD[1] - MISS_SPREAD[0]);
      ax = cx + (rollW(state) < 0.5 ? -spread : spread);
      ay = groundAt(state, ax);
    }
    if (weapon === 'laser') {
      events.push({ type: 'laser', from: { x: s.x, y: s.y }, to: { x: ax, y: ay }, hit: hit, sid: sid });
      if (hit) damage(state, st, events, ax, ay);
      else events.push({ type: 'miss', weapon: 'laser', x: ax, y: ay, sid: sid });
    } else {
      const shot = { kind: 'missile', x: s.x, y: s.y - 6, vx: s.vx, vy: s.vy + 60, sid: sid, hit: hit, ax: ax, ay: ay, t: 0, id: 'm' + state.rolls };
      state.shots.push(shot);
      events.push({ type: 'launch', shot: shot.id, sid: sid });
    }
    return { ok: true, why: null, events: events };
  }
  function dropChaff(state) {
    if (state.phase !== 'flying' || state.ammo.chaff <= 0) return false;
    state.ammo.chaff -= 1;
    const s = state.ship;
    state.shots.push({ kind: 'chaff', x: s.x, y: s.y - 8, vx: s.vx * 0.5, vy: Math.min(0, s.vy) - 10, t: 0, life: 4.5, id: 'c' + (state.rolls++) });
    return true;
  }
  // The shots in the air, one fixed step: a missile boosts then turns toward
  // its aim point at MISSILE_TURN rad/s; it strikes when it reaches the point,
  // meets the ground, or is spent. Chaff falls and drifts.
  function stepShots(state, events) {
    if (!state.shots.length) return;
    const keep = [];
    for (const sh of state.shots) {
      sh.t += DT;
      if (sh.kind === 'chaff') {
        sh.vy -= GRAVITY * 0.35 * DT; sh.x += sh.vx * DT; sh.y += sh.vy * DT;
        const gy = groundAt(state, sh.x);
        if (sh.y < gy) sh.y = gy;
        if (sh.t < sh.life) keep.push(sh);
        continue;
      }
      const dx = sh.ax - sh.x, dy = sh.ay - sh.y;
      const dist = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx);
      let have = Math.atan2(sh.vy, sh.vx);
      let d = want - have;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const turn = Math.max(-MISSILE_TURN * DT, Math.min(MISSILE_TURN * DT, d));
      have += turn;
      const speed = Math.min(MISSILE_SPEED, 40 + sh.t * 400);
      sh.vx = Math.cos(have) * speed; sh.vy = Math.sin(have) * speed;
      sh.x += sh.vx * DT; sh.y += sh.vy * DT;
      const gy = groundAt(state, sh.x);
      const arrived = dist < speed * DT * 1.5 || sh.y <= gy || sh.t >= MISSILE_LIFE;
      if (!arrived) { keep.push(sh); continue; }
      const ix = sh.x, iy = Math.max(sh.y, gy);
      events.push({ type: 'impact', shot: sh.id, x: ix, y: iy, hit: sh.hit, sid: sh.sid });
      const st = structureById(state, sh.sid);
      if (sh.hit && st && st.alive) damage(state, st, events, ix, iy);
      else {
        events.push({ type: 'miss', weapon: 'missiles', x: ix, y: iy, sid: sh.sid });
        // a miss can land on a civilian building
        for (const c of structuresNear(state, ix, 300)) {
          if (c.cls !== 'civ' || !c.alive) continue;
          if (ix >= c.x0 - BASE_MISS_CHECK && ix <= c.x1 + BASE_MISS_CHECK) { damage(state, c, events, ix, iy); break; }
        }
      }
    }
    state.shots = keep;
  }
  function hostilesLeft(state) { return state.hostilesLeft; }
  // For the tank side (or any other shooter): a hit on a structure through the
  // same rules — shield first, then dead, score, the level's count. Returns
  // the events a shell would draw.
  function hitStructure(state, sid, x, y) {
    const events = [];
    const st = structureById(state, sid);
    if (!st || !st.alive) return events;
    damage(state, st, events, x === undefined ? (st.x0 + st.x1) / 2 : x, y === undefined ? st.y : y);
    return events;
  }

  // The next flight. The world stays. After a landing on a pad the ship sits on
  // it and the phase is 'launch' — the shell plays the accelerator sequence
  // and calls launchFire(). After a crash (or the secret flat) the ship drops
  // in from above where it ended. The very first flight is the classic spawn.
  function newAttempt(state) {
    if (state.phase === 'over') return false;
    const last = state.result;
    state.attempt += 1;
    state.launch = null;
    const ship = {
      x: SPAWN.x, y: SPAWN.y, vx: SPAWN.vx, vy: SPAWN.vy,
      angle: 0, angVel: 0,
      lever: 0, thrust: 0, abortT: 0, alive: true,
    };
    if (last && last.kind !== 'crash' && last.pad) {
      const pad = findPad(state, last.pad.id);
      ship.x = last.x; ship.y = pad.y - SHIP.footL[1]; ship.vx = 0; ship.vy = 0;
      state.launch = { pad: pad };
      state.phase = 'launch';
    } else if (last) {
      ship.x = last.x;
      ship.y = Math.max(SPAWN.y, groundAt(state, last.x) + RESPAWN_ABOVE);
      state.phase = 'flying';
    } else {
      state.phase = 'flying';
    }
    state.ship = ship;
    state.result = null;
    state.attemptTime = 0;
    return true;
  }
  function findPad(state, id) {
    const k = parseInt(id.split(':')[0], 10);
    for (const p of getChunk(state, k).pads) if (p.id === id) return p;
    return null;
  }

  // The accelerator's rail base for a pad, in world feet.
  function accelBase(pad) { return { x: pad.x1 + ACCEL.offset, y: pad.y }; }

  // The exit state for a launch at `angleDeg`: where the ship leaves the rail
  // and how fast, so that it coasts to apexFrac of LAUNCH_HEIGHT above the pad.
  function launchExit(state, pad, angleDeg, apexFrac) {
    const d = FLIGHT;
    const g = GRAVITY * d.gravity * state.opts.gravityScale;
    const ang = angleDeg * Math.PI / 180;
    const frac = apexFrac === undefined ? LAUNCH_DEFAULTS.apexFrac : apexFrac;
    const base = accelBase(pad);
    const exitX = base.x + Math.cos(ang) * ACCEL.railLen, exitY = base.y + Math.sin(ang) * ACCEL.railLen;
    const apex = LAUNCH_HEIGHT * frac;
    const climb = Math.max(1, apex - (exitY - base.y));
    const vy = Math.sqrt(2 * g * climb);
    return { x: exitX, y: exitY - SHIP.footL[1], vx: vy / Math.tan(ang), vy: vy, g: g, angle: Math.PI / 2 - ang };
  }
  // Is the coast from that exit clear of the ground all the way up and over
  // the top? (checked until the ship is back down to 60% of its apex height,
  // with LAUNCH_CLEAR ft to spare under every collision point)
  const LAUNCH_CLEAR = 40;
  function launchClear(state, exit) {
    const h = 1 / 30;
    const sim = { x: exit.x, y: exit.y, vx: exit.vx, vy: exit.vy, angle: exit.angle };
    const top = exit.y + exit.vy * exit.vy / (2 * exit.g);
    const floor = exit.y + (top - exit.y) * 0.6;
    for (let k = 0; k < 90 * 30; k++) {
      sim.vy -= exit.g * h;
      sim.x += sim.vx * h;
      sim.y += sim.vy * h;
      const pts = shipPoints(sim);
      for (const key of ['footL', 'footR', 'top', 'sideL', 'sideR']) {
        const q = pts[key];
        if (q[1] - groundAt(state, q[0]) < LAUNCH_CLEAR) return false;
      }
      if (sim.vy < 0 && sim.y < floor) return true;
    }
    return true;
  }
  // The angle the accelerator will actually use: the pilot's angle if the
  // coast is clear, else steepened in 5° steps until it is (James was fired
  // into a mountainside once; never again). The shell tilts to THIS angle.
  function launchAngleFor(state, angleDeg, apexFrac) {
    const pad = state.launch ? state.launch.pad : null;
    if (!pad) return angleDeg;
    let a = angleDeg === undefined ? LAUNCH_DEFAULTS.angle : angleDeg;
    while (a < 88 && !launchClear(state, launchExit(state, pad, a, apexFrac))) a = Math.min(88, a + 5);
    return a;
  }

  // Fire the ship off the accelerator: it leaves the end of the tilted rail
  // with just the speed that coasts to apexFrac of LAUNCH_HEIGHT above the
  // pad, drifting downrange. Burns nothing. The angle is aimed clear first.
  function launchFire(state, angleDeg, apexFrac) {
    if (state.phase !== 'launch' || !state.launch) return false;
    const pad = state.launch.pad;
    const used = launchAngleFor(state, angleDeg, apexFrac);
    const ex = launchExit(state, pad, used, apexFrac);
    const ang = used * Math.PI / 180;
    const exitX = ex.x, exitY = ex.y + SHIP.footL[1];
    const vy = ex.vy, vx = ex.vx;
    state.lastLaunch = { angle: used, asked: angleDeg === undefined ? LAUNCH_DEFAULTS.angle : angleDeg };
    const s = state.ship;
    s.x = exitX; s.y = exitY - SHIP.footL[1];                  // feet at the rail's end
    s.vx = vx; s.vy = vy;
    s.angle = Math.PI / 2 - ang;                              // nose along the rail
    s.angVel = 0; s.lever = 0; s.thrust = 0; s.abortT = 0;
    state.launch = null;
    state.phase = 'flying';
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
    return fy - groundAt(state, fx);
  }

  // ---- landing tech ---------------------------------------------------------
  function hasTech(state, id) { return state.tech.indexOf(id) >= 0; }
  function techNext(state) { return state.tech.length < TECH.length ? TECH[state.tech.length] : null; }
  // The grades as they stand with the tech held: shock legs double the
  // vertical-speed limits, spider legs widen the tilt limits by half.
  function gradesFor(state) {
    const vyK = hasTech(state, 'shock') ? SHOCK_VY : 1;
    const tiltK = hasTech(state, 'spider') ? SPIDER_TILT : 1;
    if (vyK === 1 && tiltK === 1) return GRADES;
    return GRADES.map((G) => ({ name: G.name, vy: G.vy * vyK, vx: G.vx, tilt: G.tilt * tiltK, points: G.points, fuel: G.fuel }));
  }
  // Does this landing earn the next piece? Good or perfect on a 4X/5X; the
  // last piece wants a perfect on a 5X. A used pad earns nothing.
  function techEarnedBy(state, grade, pad) {
    const next = techNext(state);
    if (!next || !pad || !grade || pad.used) return null;
    if (grade.name !== 'perfect' && grade.name !== 'good') return null;
    if (pad.mult < TECH_MULT) return null;
    if (next.id === 'auto' && !(grade.name === 'perfect' && pad.mult >= TECH_FINAL_MULT)) return null;
    return next;
  }

  // The lever that holds a target descent rate right now (the auto-throttle
  // computes it every step; the shell decides when it is engaged). Thinks in
  // thrust, then undoes the lever curve.
  function autoLever(state, vyTarget) {
    const s = state.ship;
    const d = FLIGHT;
    const o = state.opts;
    const g = GRAVITY * d.gravity * o.gravityScale;
    const target = vyTarget === undefined ? AUTO_VY : vyTarget;
    const accDes = g + (target - s.vy) * 1.6;
    const cosA = Math.max(0.3, Math.cos(s.angle));
    let lever = accDes / (MAX_THRUST * o.thrustScale * cosA);
    lever = Math.max(0, Math.min(1, lever));
    return Math.pow(lever, 1 / o.leverCurve);
  }

  // The horizon ring over chunk k, and whether the ship is inside one.
  function horizonRing(k) { return { x: k * CHUNK_W + CHUNK_W / 2, y: HORIZON.y, r: HORIZON.r }; }
  function inHorizon(state) {
    const s = state.ship;
    const ring = horizonRing(chunkIndex(s.x));
    return Math.hypot(s.x - ring.x, s.y - ring.y) <= ring.r;
  }

  // The wide-view camera follow (pure, so the sim can prove it never pumps):
  // a dead zone of ±deadFrac of the view width around the camera; past it the
  // camera eases toward keeping the ship at the dead-zone edge, and the ease
  // tightens the nearer the ship gets to the screen edge.
  function cameraFollow(cx, shipX, viewW, dt, deadFrac) {
    const dead = viewW * (deadFrac === undefined ? 0.2 : deadFrac);
    const dx = shipX - cx;
    let over = 0;
    if (dx > dead) over = dx - dead; else if (dx < -dead) over = dx + dead;
    if (over === 0) return cx;
    const edge = Math.max(0, Math.min(1, Math.abs(over) / (viewW * 0.3)));
    const tau = 0.9 - 0.65 * edge;
    const k = 1 - Math.exp(-dt / tau);
    return cx + over * k;
  }

  // input: { rotate: -1|0|1, lever: 0..1, abort: bool }
  function step(state, input) {
    const events = [];
    if (state.phase !== 'flying') return events;
    const d = FLIGHT;
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

    // integrate — no wrap: the moon goes on
    const a = MAX_THRUST * o.thrustScale * thrust;
    const ax = Math.sin(s.angle) * a;
    const ay = Math.cos(s.angle) * a - g;
    s.vx += ax * DT;
    s.vy += ay * DT;
    s.x += s.vx * DT;
    s.y += s.vy * DT;
    state.time += DT;
    state.attemptTime += DT;
    stepShots(state, events);
    const range = Math.abs(s.x - SPAWN.x);
    if (range > state.farthest) state.farthest = range;
    // the horizon ring: fly through it and the world lets you go (once)
    if (!state.gated && inHorizon(state)) { state.gated = true; events.push({ type: 'gate' }); }

    // contact
    const pts = shipPoints(s);
    const gl = groundAt(state, pts.footL[0]);
    const gr = groundAt(state, pts.footR[0]);
    const footHit = pts.footL[1] <= gl || pts.footR[1] <= gr;
    const bodyHit = pts.top[1] <= groundAt(state, pts.top[0]) ||
      pts.sideL[1] <= groundAt(state, pts.sideL[0]) ||
      pts.sideR[1] <= groundAt(state, pts.sideR[0]);
    // the structures are solid: any point of the ship inside one is a crash
    let struck = null;
    if (!footHit && !bodyHit) {
      for (const st of structuresNear(state, s.x, 200)) {
        if (!st.alive) continue;
        for (const key of ['footL', 'footR', 'top', 'sideL', 'sideR']) {
          const p = pts[key];
          if (p[0] >= st.x0 && p[0] <= st.x1 && p[1] >= st.y && p[1] <= st.y + st.h) { struck = st; break; }
        }
        if (struck) break;
      }
    }
    if (footHit || bodyHit || struck) {
      resolveContact(state, pts, bodyHit || !!struck, events, struck);
    }
    return events;
  }

  function resolveContact(state, pts, bodyHit, events, struck) {
    const s = state.ship;
    const tilt = tiltOf(s.angle);
    const vy = -s.vy;                 // positive = descending
    const vx = Math.abs(s.vx);
    const lx = Math.min(pts.footL[0], pts.footR[0]);
    const rx = Math.max(pts.footL[0], pts.footR[0]);
    const pad = bodyHit ? null : padUnder(state, lx, rx);
    const secret = bodyHit ? null : secretUnder(state, lx, rx);
    const grades = gradesFor(state);
    let grade = null;
    if ((pad || secret) && !bodyHit) {
      for (const G of grades) {
        if (vy <= G.vy && vx <= G.vx && tilt <= G.tilt) { grade = G; break; }
      }
    }
    const result = {
      attempt: state.attempt,
      vy: +vy.toFixed(1), vx: +vx.toFixed(1), tilt: +(tilt * 180 / Math.PI).toFixed(1),
      x: s.x, y: s.y,
      chunk: chunkIndex(s.x),
      range: Math.round(s.x - SPAWN.x),
      pad: pad ? { id: pad.id, mult: pad.mult, x0: pad.x0, x1: pad.x1, fuel: !!pad.fuel, supply: pad.supply || null, used: !!pad.used, relay: !!pad.relay } : null,
      secret: !!secret,
      struck: struck ? { id: struck.id, name: struck.name, cls: struck.cls } : null,
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
      result.reused = !!pad.used;
      result.points = pad.used ? 0 : grade.points * pad.mult;   // a pad pays once per life
      result.fuelBonus = grade.fuel;
      if (pad.fuel) {
        result.fuelPad = grade.name === 'perfect' ? FUEL_PAD_PERFECT : FUEL_PAD_REFILL;
        result.fuelBonus += result.fuelPad;
      }
      if (pad.supply) {
        // the pad's supply, every landing, like fuel; capped
        const before = state.ammo[pad.supply];
        state.ammo[pad.supply] = Math.min(AMMO_MAX[pad.supply], before + PAD_SUPPLY[pad.supply]);
        result.supply = { kind: pad.supply, amount: state.ammo[pad.supply] - before };
      }
      if (pad.relay && state.levelClear && !state.levelDone) {
        // the level's end: the stretch is clear and you are down on the relay
        state.levelDone = true;
        result.levelDone = state.level;
      }
      state.score += result.points;
      state.fuel += result.fuelBonus;
      const earned = techEarnedBy(state, grade, pad);
      if (earned) { state.tech.push(earned.id); result.techEarned = earned.id; }
      if (!pad.used) { pad.used = true; state.world.version++; }
      s.y = pad.y - SHIP.footL[1];
      s.vx = s.vy = 0; s.angle = 0; s.angVel = 0;
      state.phase = 'landed';
    } else {
      result.kind = 'crash';
      result.points = CRASH_POINTS;
      result.reason = struck ? 'struck' : bodyHit ? 'body' : (!pad && !secret) ? 'terrain' :
        vy > grades[2].vy ? 'speed' : tilt > grades[2].tilt ? 'tilt' : 'drift';
      state.score += CRASH_POINTS;
      state.fuel = Math.max(0, state.fuel - CRASH_FUEL);
      if (state.tech.length) result.techLost = state.tech.pop();
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
      range: Math.round(s.x - SPAWN.x),      // ft downrange of the spawn (negative = left)
      chunk: chunkIndex(s.x),
      ammo: state.ammo,
      hostilesLeft: state.hostilesLeft,
      hostilesTotal: state.hostilesTotal,
      levelClear: state.levelClear,
    };
  }

  globalThis.LunarCore = {
    DT: DT,
    CHUNK_W: CHUNK_W,
    SPAWN: SPAWN,
    SHIP: SHIP,
    GRAVITY: GRAVITY,
    MAX_THRUST: MAX_THRUST,
    FUEL_BURN: FUEL_BURN,
    LEVER_CURVE: LEVER_CURVE,
    FLIGHT: FLIGHT,
    GRADES: GRADES,
    PAD_TIERS: PAD_TIERS,
    DEALS: DEALS,
    FUEL_ODDS: FUEL_ODDS,
    ACCEL: ACCEL,
    APRON: APRON,
    LAUNCH_HEIGHT: LAUNCH_HEIGHT,
    LAUNCH_DEFAULTS: LAUNCH_DEFAULTS,
    HORIZON: HORIZON,
    RELAY_MIN_CHUNK: RELAY_MIN_CHUNK,
    horizonRing: horizonRing,
    inHorizon: inHorizon,
    DEFAULTS: DEFAULTS,
    TECH: TECH,
    TECH_MULT: TECH_MULT,
    TECH_FINAL_MULT: TECH_FINAL_MULT,
    SHOCK_VY: SHOCK_VY,
    SPIDER_TILT: SPIDER_TILT,
    AUTO_ALT: AUTO_ALT,
    AUTO_VY: AUTO_VY,
    SPIDER_ALT: SPIDER_ALT,
    FUEL_PAD_REFILL: FUEL_PAD_REFILL,
    FUEL_PAD_PERFECT: FUEL_PAD_PERFECT,
    mulberry32: mulberry32,
    hashSeed: hashSeed,
    seamLevel: seamLevel,
    makeChunk: makeChunk,
    chunkIndex: chunkIndex,
    getChunk: getChunk,
    chunksBetween: chunksBetween,
    padsNear: padsNear,
    structuresNear: structuresNear,
    groundAt: groundAt,
    padUnder: padUnder,
    accelBase: accelBase,
    launchFire: launchFire,
    launchAngleFor: launchAngleFor,
    launchClear: launchClear,
    launchExit: launchExit,
    cameraFollow: cameraFollow,
    hasTech: hasTech,
    LOADOUT: LOADOUT, AMMO_MAX: AMMO_MAX, PAD_SUPPLY: PAD_SUPPLY, WEAPON_ODDS: WEAPON_ODDS, HIT_ODDS: HIT_ODDS,
    MISSILE_SPEED: MISSILE_SPEED, TARGET_POINTS: TARGET_POINTS, CIVILIAN_PENALTY: CIVILIAN_PENALTY,
    LEVEL_CHUNKS: LEVEL_CHUNKS, RIDGE_ALT: RIDGE_ALT, DOOR_PERIOD: DOOR_PERIOD, DOOR_OPEN: DOOR_OPEN,
    structureById: structureById, hostileAt: hostileAt, targetable: targetable, doorOpen: doorOpen,
    fire: fire, dropChaff: dropChaff, hostilesLeft: hostilesLeft, hitStructure: hitStructure,
    techNext: techNext,
    gradesFor: gradesFor,
    autoLever: autoLever,
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
