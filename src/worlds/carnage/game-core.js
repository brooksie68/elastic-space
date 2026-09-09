// Carnage — the core. Bally Midway's Rampage (1986): the rules kept where they are the game — a side-on
// city of window cells you climb and punch down, buildings that collapse past a threshold, things behind
// the windows, soldiers and armour and something in the air — and everything else 2026.
//
// Pure: no DOM, no timers, no Math.random (a seeded rng lives in the state). Shared verbatim with
// tmp/carnage/sim.mjs — keep it pure or the sim lies. The renderer draws what the state says; the shell
// reads `state.events` after every step (the core empties it at the start of the next step).
//
// Units: x in cells (a building column is one cell wide), y in floors (0 = the street, feet).
// Monsters are 1.8 floors tall. The city is a row of buildings along x; there is no depth here.
(function () {
  'use strict';

  const City = globalThis.CarnageCity;
  const T = City.T, S = City.S;

  // ---- tunables (the shell's PLAY dials write into state.opts) --------------------------------
  const DEFAULTS = {
    seed: 1,
    day: 1,
    lives: 3,
    monster: 'george',       // george (the clown) | lizzie (the girl) | ralph (the king)
    companions: 1,           // computer-played monsters: 0, 1, 2
    flavour: 0.6,            // 0 = cabinet-equal monsters, 1 = big differences
    run: 6,                  // cells/s on the street
    climb: 3.2,              // floors/s on a face
    jumpV: 7.6,              // floors/s
    gravity: 22,             // floors/s²
    punchT: 0.34,            // s, one punch
    punchRepeat: 0.36,       // s between punches while held
    fallFree: 2,             // floors of free fall before it hurts
    fallDmg: 8,              // hp per floor beyond that
    collapseT: 1.9,          // s, a building coming down
    thresholdScale: 1,       // × the buildings' collapse thresholds
    spawnScale: 1,           // × the enemy cadence (lower = more of them)
    dealShift: 0,            // + = meaner windows (the day the deal table thinks it is)
    hazardScale: 1,          // × hazard damage
    streamerT: 1.5,          // s before the livestreamer's ring light knocks you off
    extraEvery: 25000,       // an extra life every this many points
    respawnT: 3,             // s gone before the next life drops in
    cpuRespawnT: 8,
    exits: 1,                // the ways out (0 in the sim's pure-rules suites)
    enemies: 1,              // soldiers / armour / the drone / traffic (0 in the sim's pure-rules suites)
    free: 1,                 // free mode: endless days (the campaign is his to write)
    buildings: 0,            // 0 = the day decides
    cpuIdle: 0,              // 1 = the companions stand still (the Damage Lab's dummies)
    maxFloors: 16,
  };

  const MON = { H: 1.8, HALF: 0.45, REACH: 1.4, COL_T: 0.16, REVERT_T: 1.6, WALKOFF: 2.0, HIT_T: 0.4, EAT_T: 0.5, ARRIVE_Y: 11, INVULN: 1.5 };
  const POINTS = {
    window: 25, wall: 50, neon: 1000, building: 1000, perFloor: 100, rival: 2500,
    soldier: 50, tank: 200, drone: 750, cruiser: 150, taxi: 100, bot: 50, teen: 1000, crushed: 25, dayBase: 500,
  };
  // what each deal does when you punch the cell it is in (after the window broke and showed it)
  const DEAL_FX = {
    customer: { pts: 500, hp: 12, eat: 1 }, worker: { pts: 500, hp: 12, eat: 1 }, waver: { pts: 500, hp: 12, eat: 1, waves: 1 }, zombie: { pts: 500, hp: 12, eat: 1 },
    fries: { pts: 100, hp: 8, eat: 1 }, shake: { pts: 100, hp: 8, eat: 1 }, nuggets: { pts: 100, hp: 8, eat: 1 }, patty: { pts: 100, hp: 8, eat: 1 }, cake: { pts: 150, hp: 10, eat: 1 },
    crown: { pts: 250, hp: 0, take: 1 }, cash: { pts: 500, take: 1 }, crypto: { pts: 2500, take: 1 },
    battery: { dmg: 20, fuse: 1.2, boom: 1 }, fryer: { dmg: 10, cool: 2.0, then: { pts: 100, hp: 8 } }, peloton: { dmg: 15, gone: 1 }, cactus: { dmg: 8, gone: 1 }, vape: { dmg: 5, gone: 1 }, smoothie: { dmg: 12, gone: 1 },
    streamer: { pts: 300, hp: 12, eat: 1, flash: 1 }, soldier: { pts: 50, hp: 5, eat: 1, fires: 1 }, supplement: { pts: 5000, hp: 100, eat: 1 }, corridor: { exit: 'corridor' },
  };
  const SOLDIER = { speed: 2.6, stopMin: 5, stopMax: 8, burst: 1.1, pause: 2.2, shotGap: 0.25, bullet: 11, dmg: 0.8, flyT: 0.9, spread: 0.18, cap: (day) => Math.min(5, 2 + Math.floor(day / 3)) };
  const TANK = { speed: 3, stopMin: 9, stopMax: 12, fireGap: 3.5, shell: 9, shellDmg: 8, hp: 2, wreckT: 3, backoff: 3, spread: 1.4 };
  const DRONE = { speed: 7, hoverMin: 2.2, hoverMax: 3.4, burst: 3, shotGap: 0.15, fireGap: 2.2, bullet: 14, dmg: 2, sway: 0.6, spread: 0.1 };
  const CARS = { cruiser: { speed: 8, pts: 150 }, taxi: { speed: 6, pts: 100 }, bot: { speed: 2.5, pts: 50, hp: 4 } };
  const BLIMP = { speed: 1.5, lift: 2.5 };

  // ---- rng --------------------------------------------------------------------------------------
  function hashSeed(seed) {
    if (typeof seed === 'number') return seed >>> 0;
    let h = 2166136261;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(state) {
    let t = (state.rngState += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    state.rngState = state.rngState >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rand(state, a, b) { return a + (b - a) * rng(state); }

  // ---- the three, and the variety dial ---------------------------------------------------------
  // Each has an edge and a small cost. f = 0 makes them identical (the cabinet); f = 1 is a big spread.
  function flavourFor(slug, f) {
    f = Math.max(0, Math.min(1, f || 0));
    if (slug === 'george') return { punch: 1 + 0.3 * f, climb: 1 - 0.1 * f, run: 1 };
    if (slug === 'lizzie') return { punch: 1 - 0.1 * f, climb: 1 + 0.35 * f, run: 1 };
    return { punch: 1, climb: 1 - 0.1 * f, run: 1 + 0.3 * f };   // ralph
  }
  const SLUGS = ['george', 'lizzie', 'ralph'];

  // ---- the game -----------------------------------------------------------------------------------
  function createGame(userOpts) {
    const opts = Object.assign({}, DEFAULTS, userOpts || {});
    const state = {
      opts, t: 0, rngState: hashSeed(opts.seed) || 1,
      day: opts.day || 1, city: null,
      monsters: [], playerId: 0,
      soldiers: [], tank: null, drone: null, cars: [], bullets: [], shells: [], items: [], blimp: null,
      timers: { soldier: 6, tank: 20, drone: 35, car: 4 },
      phase: 'play', phaseT: 0,
      score: 0, nextExtra: opts.extraEvery,
      stats: { cells: 0, buildings: 0, eaten: 0, soldiers: 0, tanks: 0, drones: 0, cars: 0, falls: 0, reverts: 0, days: 0 },
      events: [], nextId: 1, exit: null, over: false, dayPoints: 0,
    };
    // the player, then the companions in brand order
    const player = makeMonster(state, opts.monster, false);
    player.lives = opts.lives;
    state.monsters.push(player);
    state.playerId = player.id;
    const others = SLUGS.filter((s) => s !== opts.monster);
    for (let i = 0; i < Math.max(0, Math.min(2, opts.companions | 0)); i++) state.monsters.push(makeMonster(state, others[i], true));
    newDay(state, false);
    return state;
  }

  function makeMonster(state, slug, cpu) {
    return {
      id: state.nextId++, slug, cpu, x: 0, y: 0, vx: 0, vy: 0, facing: 1,
      st: 'street', b: -1, col: 0, colT: 0, fallFrom: 0, homeX: 0,
      hp: 100, lives: Infinity, score: 0,
      punchT: 0, punchFull: 0, punchDir: { dx: 0, dy: 0 }, punchHit: false, punchHeld: 0, prevPunch: false, prevJump: false, prevUp: false,
      eatT: 0, hitT: 0, invulnT: 0, stateT: 0, holdT: 0, subT: 0,
      flavour: flavourFor(slug, state.opts.flavour),
      lastEat: null, anim: 'idle',
      ai: { goal: -1, dir: 1, punchCd: 0, t: 0, wander: 0, stuck: 0 },
    };
  }

  function newDay(state, keepScoreEvent) {
    const day = state.day;
    state.city = City.makeCity(() => rng(state), day + Math.max(0, state.opts.dealShift | 0), { exits: state.opts.exits, buildings: state.opts.buildings, maxFloors: state.opts.maxFloors });
    state.soldiers.length = 0; state.tank = null; state.drone = null; state.cars.length = 0; state.bullets.length = 0; state.shells.length = 0; state.items.length = 0;
    state.blimp = null; state.blimpT = state.city.exits.blimp ? 20 : -1;
    const g = Math.min(8, day - 1);
    state.timers.soldier = 6; state.timers.tank = 20 - g; state.timers.drone = 35 - g * 2; state.timers.car = 4;
    state.dayPoints = 0;
    const sx = state.city.spawnX;
    state.monsters.forEach((m, i) => {
      m.x = Math.max(1, Math.min(state.city.width - 1, sx + i * 7)); m.y = 0; m.vx = 0; m.vy = 0; m.st = 'street'; m.b = -1; m.homeX = m.x;
      m.punchT = 0; m.eatT = 0; m.hitT = 0; m.stateT = 0; m.holdT = 0; m.subT = 0; m.invulnT = 0.5;
      if (m.hp <= 0) m.hp = 100;
      m.ai.goal = -1; m.ai.t = 0; m.ai.punchCd = 2;
    });
    state.phase = 'play'; state.phaseT = 0;
    state.events.push({ type: 'day', day, city: state.city.name, stateName: state.city.state, night: state.city.night, tag: state.city.tag });
    void keepScoreEvent;
  }

  // ---- helpers ------------------------------------------------------------------------------------
  const player = (state) => state.monsters[0];
  function nearestMonster(state, x, y, alive) {
    let best = null, bd = 1e9;
    for (const m of state.monsters) {
      if (alive && !isTarget(m)) continue;
      const d = Math.abs(m.x - x) + Math.abs(m.y - y) * 0.5;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  const isTarget = (m) => m.st === 'street' || m.st === 'climb' || m.st === 'roof' || m.st === 'jump' || m.st === 'fall';
  const isBig = (m) => m.st !== 'revert' && m.st !== 'walkoff' && m.st !== 'gone' && m.st !== 'dead';
  function bodyHit(m, x, y) { return Math.abs(x - m.x) < MON.HALF + 0.1 && y >= m.y - 0.1 && y <= m.y + MON.H + 0.1; }
  function building(state, id) { return id >= 0 ? state.city.buildings[id] : null; }
  function faceAt(state, x) {
    const b = City.buildingAt(state.city, x);
    return b && !b.down && !b.collapsing ? b : null;
  }
  function punchRow(m, b) { return Math.max(0, Math.min(b.floors - 1, Math.floor(m.y + 0.6))); }
  function addPoints(state, m, pts, x, y, what) {
    if (!pts) return;
    m.score += pts;
    if (!m.cpu) {
      state.score += pts; state.dayPoints += pts;
      state.events.push({ type: 'points', points: pts, x, y, what: what || '' });
      while (state.score >= state.nextExtra) { state.nextExtra += state.opts.extraEvery; m.lives++; state.events.push({ type: 'extraLife', lives: m.lives }); }
    }
  }
  function heal(m, hp) { m.hp = Math.min(100, m.hp + hp); }
  function damage(state, m, amount, src, x, y) {
    if (!isBig(m) || m.st === 'arrive') return false;
    if (m.invulnT > 0) return false;
    amount = Math.round(amount * 10) / 10;
    m.hp = Math.max(0, m.hp - amount);
    m.hitT = MON.HIT_T;
    state.events.push({ type: 'damage', who: m.id, slug: m.slug, amount, src, x: x == null ? m.x : x, y: y == null ? m.y + 1 : y, hp: m.hp });
    if (m.hp <= 0) revert(state, m, src);
    return true;
  }

  // ---- the revert: at zero the monster shrinks to a tired teenager in the uniform ------------------
  function revert(state, m, src) {
    m.st = 'revert'; m.stateT = 0; m.vx = 0; m.vy = 0; m.b = -1; m.punchT = 0; m.eatT = 0;
    m.homeX = m.x;
    state.stats.reverts++;
    state.events.push({ type: 'revert', who: m.id, slug: m.slug, x: m.x, y: m.y, src });
  }
  function loseLife(state, m, how) {
    if (m.cpu) { m.st = 'gone'; m.stateT = state.opts.cpuRespawnT; state.events.push({ type: 'gone', who: m.id, slug: m.slug, how }); return; }
    m.lives = Math.max(0, m.lives - 1);
    if (m.lives > 0) { m.st = 'gone'; m.stateT = state.opts.respawnT; state.events.push({ type: 'gone', who: m.id, slug: m.slug, how, lives: m.lives }); }
    else { m.st = 'dead'; state.over = true; state.phase = 'over'; state.phaseT = 0; state.events.push({ type: 'over', score: state.score, day: state.day, city: state.city.name }); }
  }
  function arrive(state, m) {
    m.st = 'arrive'; m.hp = 100; m.y = MON.ARRIVE_Y; m.vy = 0; m.vx = 0; m.b = -1;
    m.x = Math.max(1, Math.min(state.city.width - 1, m.homeX)); m.invulnT = MON.INVULN + 1;
    state.events.push({ type: 'arrive', who: m.id, slug: m.slug, x: m.x });
  }

  // ---- the step -------------------------------------------------------------------------------------
  // input: { move: -1|0|1, up, down, jump, punch } for the player; companions make their own.
  function step(state, input, dt) {
    state.events.length = 0;
    if (state.over) { state.phaseT += dt; return; }
    state.t += dt;
    if (state.phase === 'dayEnd') { stepAmbient(state, dt); state.phaseT += dt; if (state.phaseT >= 3.2) { state.phase = 'map'; state.phaseT = 0; state.events.push({ type: 'map', day: state.day, next: City.cityDef(state.day + 1)[0] }); } return; }
    if (state.phase === 'map') { state.phaseT += dt; if (state.phaseT >= 3.5) advanceDay(state); return; }

    stepBuildings(state, dt);
    stepItems(state, dt);
    for (const m of state.monsters) stepMonster(state, m, m.cpu ? (state.opts.cpuIdle ? IDLE : autopilot(state, m)) : (input || IDLE), dt);
    stepEnemies(state, dt);
    stepSpawns(state, dt);
    stepBlimp(state, dt);

    // the day ends when every building is down
    if (state.city.buildings.every((b) => b.down)) {
      state.phase = 'dayEnd'; state.phaseT = 0;
      const bonus = POINTS.dayBase * state.day;
      addPoints(state, player(state), bonus, player(state).x, 4, 'day');
      state.stats.days++;
      state.events.push({ type: 'dayEnd', day: state.day, city: state.city.name, bonus, dayPoints: state.dayPoints, score: state.score });
    }
  }
  const IDLE = { move: 0, up: false, down: false, jump: false, punch: false };
  function advanceDay(state) { state.day++; newDay(state, true); }
  function skipMap(state) { if (state.phase === 'map') advanceDay(state); }
  function stepAmbient(state, dt) { for (const c of state.cars) c.x += c.vx * dt; }

  // ---- buildings: neon blink, the collapse ------------------------------------------------------------
  function stepBuildings(state, dt) {
    for (const b of state.city.buildings) {
      if (b.neon && !b.neon.dead) {
        const ph = (state.t / b.neon.period + b.neon.phase) % 1;
        const on = ph < b.neon.on;
        if (on !== !!b.neon.lit) { b.neon.lit = on; state.events.push({ type: 'neon', b: b.id, on }); }
      }
      if (b.collapsing && !b.down) {
        b.dropT += dt / state.opts.collapseT;
        if (b.dropT >= 1) {
          b.dropT = 1; b.down = true; b.collapsing = false;
          const by = b.lastHitBy != null ? state.monsters.find((m) => m.id === b.lastHitBy) : null;
          let pts = POINTS.building + POINTS.perFloor * b.floors, rival = false;
          if (b.restaurant && by) { if (b.restaurant === by.slug) pts = 0; else { pts += POINTS.rival; rival = true; } }
          if (by) addPoints(state, by, pts, b.x0 + b.cols / 2, 2, 'building');
          state.stats.buildings++;
          state.events.push({ type: 'collapseEnd', b: b.id, points: pts, rival, restaurant: b.restaurant, by: by ? by.slug : null, x: b.x0 + b.cols / 2 });
        }
      }
    }
  }
  function startCollapse(state, b, by) {
    if (b.collapsing || b.down) return;
    b.collapsing = true; b.dropT = 0; b.lastHitBy = by ? by.id : b.lastHitBy;
    if (b.neon) b.neon.dead = true;
    // anyone on it falls with it
    for (const m of state.monsters) if ((m.st === 'climb' || m.st === 'roof') && m.b === b.id) { startFall(state, m, m.y, 0); }
    // anyone under it is in the way
    for (const s of state.soldiers) if (s.st !== 'dead' && s.st !== 'flyup' && s.x >= b.x0 - 0.3 && s.x <= b.x0 + b.cols + 0.3) { s.st = 'dead'; s.t = 0; state.stats.soldiers++; if (by) addPoints(state, by, POINTS.crushed, s.x, 1, 'crushed'); state.events.push({ type: 'soldierDie', id: s.id, x: s.x, how: 'crushed' }); }
    for (const c of state.cars) if (c.st === 'drive' && c.x >= b.x0 - 0.3 && c.x <= b.x0 + b.cols + 0.3) { c.st = 'wreck'; c.t = 0; state.events.push({ type: 'carWreck', kind: c.kind, x: c.x, how: 'crushed' }); }
    // the things in the windows go with the building
    for (let i = state.items.length - 1; i >= 0; i--) if (state.items[i].b === b.id) state.items.splice(i, 1);
    state.events.push({ type: 'collapseStart', b: b.id, x: b.x0 + b.cols / 2, floors: b.floors, by: by ? by.slug : null });
  }

  // ---- the things in the windows --------------------------------------------------------------------
  function spawnItem(state, b, k, deal) {
    const col = k % b.cols, row = Math.floor(k / b.cols);
    const it = { id: state.nextId++, b: b.id, k, col, row, x: b.x0 + col + 0.5, y: row, deal, t: 0, hot: deal === 'fryer', lit: deal === 'battery', held: 0, fireT: 1.0, built: 0 };
    state.items.push(it);
    return it;
  }
  function itemAt(state, bId, k) { for (const it of state.items) if (it.b === bId && it.k === k) return it; return null; }
  function removeItem(state, it) { const i = state.items.indexOf(it); if (i >= 0) state.items.splice(i, 1); }
  function inRange(m, it, cols, rows) {
    if (!isBig(m) || m.st === 'gone' || m.st === 'arrive') return false;
    if (m.st === 'climb' || m.st === 'roof') return m.b === it.b && Math.abs(m.col - it.col) <= cols && Math.abs(punchRowY(m) - it.row) <= rows;
    return Math.abs(m.x - it.x) <= cols + 0.5 && it.row <= rows;   // on the street: a ground-floor thing next to you
  }
  const punchRowY = (m) => Math.floor(m.y + 0.6);
  function stepItems(state, dt) {
    const hs = state.opts.hazardScale;
    for (let i = state.items.length - 1; i >= 0; i--) {
      if (i >= state.items.length) continue;
      const it = state.items[i];
      if (!it) continue;
      it.t += dt;
      const fx = DEAL_FX[it.deal];
      if (!fx) continue;
      if (fx.boom && it.lit) {
        if (it.t >= fx.fuse) { explode(state, it, fx.dmg * hs); continue; }
      } else if (it.deal === 'fryer' && it.hot) {
        if (it.t >= fx.cool) { it.hot = false; state.events.push({ type: 'ding', x: it.x, y: it.y }); }
      } else if (fx.flash) {
        if (it.t >= state.opts.streamerT) {
          // the ring light: anyone on that face nearby is knocked off
          for (const m of state.monsters) if (inRange(m, it, 1, 1) && (m.st === 'climb' || m.st === 'roof')) { startFall(state, m, m.y, m.col < it.col ? -2.5 : 2.5); m.hitT = MON.HIT_T; state.events.push({ type: 'knockedOff', who: m.id, slug: m.slug, x: m.x, y: m.y }); }
          state.events.push({ type: 'flash', x: it.x, y: it.y });
          state.items.splice(i, 1); continue;
        }
      } else if (fx.fires) {
        it.fireT -= dt;
        if (it.fireT <= 0) {
          it.fireT = 0.9;
          const m = nearestMonster(state, it.x, it.y, true);
          if (m && Math.abs(m.x - it.x) < 14) fireBullet(state, it.x, it.y + 0.6, m, SOLDIER.bullet, SOLDIER.dmg, 'window');
        }
      } else if (fx.waves) {
        // a waver builds points while a monster holds the cell
        let holder = null;
        for (const m of state.monsters) if ((m.st === 'climb') && m.b === it.b && m.col === it.col && punchRowY(m) === it.row) { holder = m; break; }
        if (holder) {
          it.held += dt;
          while (it.held >= 0.25 && it.built < 1000) { it.held -= 0.25; it.built += 50; addPoints(state, holder, 50, it.x, it.y, 'wave'); }
          if (it.built >= 1000) { state.events.push({ type: 'ducks', x: it.x, y: it.y }); state.items.splice(i, 1); continue; }
        }
      }
    }
  }
  function explode(state, it, dmg) {
    removeItem(state, it);
    state.events.push({ type: 'boom', x: it.x, y: it.y, b: it.b });
    for (const m of state.monsters) if (inRange(m, it, 1, 1)) damage(state, m, dmg, 'battery', it.x, it.y);
    // the blast takes the neighbouring cells with it
    const b = building(state, it.b);
    if (b && !b.down) for (const [dc, dr] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) { const k = City.cellAt(b, it.col + dc, it.row + dr); if (k >= 0 && b.state[k] !== S.BROKEN) breakCell(state, b, k, null, 'boom'); }
  }
  // punching an item after the window is open
  function interact(state, m, b, it) {
    const fx = DEAL_FX[it.deal];
    if (!fx) return;
    const hs = state.opts.hazardScale;
    if (fx.exit) { if (!m.cpu && state.opts.exits) takeExit(state, fx.exit, it.x, it.y); return; }
    if (fx.eat || fx.take) {
      if (it.deal === 'fryer' && it.hot) { damage(state, m, fx.dmg * hs, 'fryer', it.x, it.y); return; }
      addPoints(state, m, fx.pts, it.x, it.y, it.deal);
      if (fx.hp) heal(m, fx.hp);
      if (fx.eat) { m.eatT = MON.EAT_T; m.lastEat = it.deal; state.stats.eaten++; }
      state.events.push({ type: fx.eat ? 'eat' : 'take', who: m.id, slug: m.slug, what: it.deal, x: it.x, y: it.y, points: fx.pts, hp: fx.hp || 0 });
      removeItem(state, it);
      return;
    }
    if (it.deal === 'fryer') {
      if (it.hot) { damage(state, m, fx.dmg * hs, 'fryer', it.x, it.y); state.events.push({ type: 'hazard', what: 'fryer', x: it.x, y: it.y }); }
      else { addPoints(state, m, fx.then.pts, it.x, it.y, 'toast'); heal(m, fx.then.hp); m.eatT = MON.EAT_T; m.lastEat = 'toast'; state.stats.eaten++; state.events.push({ type: 'eat', who: m.id, slug: m.slug, what: 'toast', x: it.x, y: it.y, points: fx.then.pts, hp: fx.then.hp }); removeItem(state, it); }
      return;
    }
    if (fx.boom) { explode(state, it, fx.dmg * hs); return; }
    if (fx.dmg) {
      damage(state, m, fx.dmg * hs, it.deal, it.x, it.y);
      state.events.push({ type: 'hazard', what: it.deal, who: m.id, x: it.x, y: it.y });
      if (fx.gone) removeItem(state, it);
    }
  }

  // ---- cells ------------------------------------------------------------------------------------------
  function breakCell(state, b, k, m, how) {
    if (b.state[k] === S.BROKEN) return false;
    const t = b.cells[k];
    b.state[k] = S.BROKEN; b.broken++;
    if (t === T.NEON && b.neon) { b.neon.dead = true; }
    state.stats.cells++;
    const col = k % b.cols, row = Math.floor(k / b.cols);
    const deal = (t === T.WINDOW || t === T.STORE) ? b.deal[k] : 'none';
    const ev = { type: 'cellBreak', b: b.id, k, col, row, x: b.x0 + col + 0.5, y: row, cellType: t, deal, how: how || 'punch', by: m ? m.slug : null };
    state.events.push(ev);
    if (deal !== 'none') spawnItem(state, b, k, deal);
    if (m) b.lastHitBy = m.id;
    if (b.broken / b.punchable >= b.threshold * state.opts.thresholdScale) startCollapse(state, b, m);
    return true;
  }
  function punchCell(state, m, b, k) {
    const t = b.cells[k], st = b.state[k];
    const col = k % b.cols, row = Math.floor(k / b.cols);
    const x = b.x0 + col + 0.5;
    if (t === T.NEON) {
      if (st === S.BROKEN) return false;
      if (b.neon && b.neon.lit && !b.neon.dead) { damage(state, m, 15 * state.opts.hazardScale, 'neon', x, row); state.events.push({ type: 'neonShock', b: b.id, x, y: row }); return true; }
      addPoints(state, m, POINTS.neon, x, row, 'neon');
      for (const kk of b.neon.cells) breakCell(state, b, kk, m, 'neon');
      state.events.push({ type: 'neonOut', b: b.id, x, y: row });
      return true;
    }
    if (st === S.BROKEN) {
      const it = itemAt(state, b.id, k);
      if (it) { interact(state, m, b, it); return true; }
      return false;
    }
    if (t === T.WALL && st === S.INTACT) { b.state[k] = S.CRACKED; b.lastHitBy = m.id; state.events.push({ type: 'cellCrack', b: b.id, k, col, row, x, y: row }); return true; }
    addPoints(state, m, t === T.WALL ? POINTS.wall : POINTS.window, x, row, 'cell');
    breakCell(state, b, k, m, 'punch');
    return true;
  }

  // ---- monsters -----------------------------------------------------------------------------------------
  function startFall(state, m, from, vx) {
    m.st = 'fall'; m.fallFrom = from; m.vy = 0; m.vx = vx || 0; m.b = -1;
    state.events.push({ type: 'fall', who: m.id, slug: m.slug, from });
  }
  function land(state, m) {
    m.y = 0; m.vy = 0; m.st = 'street';
    const h = m.fallFrom;
    if (h > state.opts.fallFree) {
      const dmg = (h - state.opts.fallFree) * state.opts.fallDmg;
      state.stats.falls++;
      state.events.push({ type: 'landHard', who: m.id, slug: m.slug, x: m.x, from: h, dmg });
      damage(state, m, dmg, 'fall', m.x, 0);
    } else state.events.push({ type: 'land', who: m.id, slug: m.slug, x: m.x });
    m.fallFrom = 0;
  }
  function grab(state, m, b, y) {
    m.st = 'climb'; m.b = b.id; m.col = Math.max(0, Math.min(b.cols - 1, Math.floor(m.x - b.x0)));
    m.y = Math.max(0, Math.min(b.floors - 1, y)); m.vy = 0; m.vx = 0; m.colT = MON.COL_T; m.fallFrom = 0;
    state.events.push({ type: 'grab', who: m.id, slug: m.slug, b: b.id });
  }
  function stepMonster(state, m, input, dt) {
    const o = state.opts, W = state.city.width;
    if (m.st === 'dead') { m.anim = 'gone'; return; }
    if (m.st === 'gone') { m.anim = 'gone'; m.stateT -= dt; if (m.stateT <= 0) arrive(state, m); return; }
    if (m.st === 'revert') m.anim = 'revert';
    if (m.st === 'walkoff') m.anim = 'walkoff';
    if (m.st === 'arrive') {
      m.anim = 'fall'; m.y += m.vy * dt; m.vy -= o.gravity * dt; if (m.y <= 0) { m.y = 0; m.vy = 0; m.st = 'street'; m.invulnT = MON.INVULN; state.events.push({ type: 'landed', who: m.id, slug: m.slug, x: m.x }); } return; }
    if (m.st === 'revert') {
      m.stateT += dt;
      if (m.stateT >= MON.REVERT_T) { m.st = 'walkoff'; m.stateT = 0; m.y = 0; m.facing = m.x < W / 2 ? -1 : 1; state.events.push({ type: 'walkoff', who: m.id, slug: m.slug, x: m.x, dir: m.facing }); }
      return;
    }
    if (m.st === 'walkoff') {
      m.x += m.facing * MON.WALKOFF * dt;
      if (m.x < -1.5 || m.x > W + 1.5) loseLife(state, m, 'clockedOut');
      return;
    }
    if (m.invulnT > 0) m.invulnT -= dt;
    if (m.hitT > 0) m.hitT -= dt;
    if (m.eatT > 0) m.eatT -= dt;
    if (m.colT > 0) m.colT -= dt;
    const stunned = m.hitT > 0 || m.eatT > 0;
    const move = stunned ? 0 : (input.move | 0);
    if (move) m.facing = move > 0 ? 1 : -1;
    const upEdge = input.up && !m.prevUp;
    const jumpEdge = input.jump && !m.prevJump;
    m.prevUp = !!input.up; m.prevJump = !!input.jump;

    // the punch: edge, or held with a repeat
    if (m.punchT > 0) {
      m.punchT -= dt;
      if (!m.punchHit && m.punchT <= m.punchFull - 0.12) { m.punchHit = true; resolvePunch(state, m); }
      if (m.punchT <= 0) { m.punchT = 0; m.punchHeld = o.punchRepeat; }
    } else if (m.punchHeld > 0) m.punchHeld -= dt;
    const wantPunch = input.punch && (!m.prevPunch || m.punchHeld <= 0);
    m.prevPunch = !!input.punch;
    if (wantPunch && m.punchT <= 0 && !stunned && (m.st === 'street' || m.st === 'climb' || m.st === 'roof')) {
      m.punchFull = o.punchT / m.flavour.punch; m.punchT = m.punchFull; m.punchHit = false;
      m.punchDir.dx = move; m.punchDir.dy = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      if (m.st === 'street') m.punchDir.dy = 0;
      state.events.push({ type: 'punch', who: m.id, slug: m.slug, x: m.x, y: m.y, dx: m.punchDir.dx, dy: m.punchDir.dy });
    }
    const punching = m.punchT > 0;

    if (m.st === 'street') {
      const speed = o.run * m.flavour.run * (punching ? 0.35 : 1);
      m.vx = move * speed;
      m.x = Math.max(0.6, Math.min(W - 0.6, m.x + m.vx * dt));
      m.y = 0;
      // the subway: stand over it and hold down
      const sub = state.city.exits.subway;
      if (sub != null && !m.cpu && state.opts.exits && input.down && Math.abs(m.x - sub) < 0.9) { m.subT += dt; if (m.subT >= 0.6) takeExit(state, 'subway', sub, 0); } else m.subT = 0;
      if (!stunned && !punching) {
        if (input.up) { const b = faceAt(state, m.x); if (b) grab(state, m, b, 0); }
        else if (jumpEdge) { m.st = 'jump'; m.vy = o.jumpV; m.vx = move * speed; state.events.push({ type: 'jump', who: m.id, slug: m.slug, x: m.x, y: 0 }); }
      }
      // eating a reverted teenager who is walking past
      if (punching && m.punchHit && !m.ateTeen) { /* handled in resolvePunch */ }
    } else if (m.st === 'climb') {
      const b = building(state, m.b);
      if (!b || b.down) { startFall(state, m, m.y, 0); }
      else {
        if (!stunned) {
          const dy = ((input.up ? 1 : 0) - (input.down ? 1 : 0)) * o.climb * m.flavour.climb * (punching ? 0.4 : 1);
          m.y += dy * dt;
          if (m.y > b.floors - 1) {
            if (input.up) { m.st = 'roof'; m.y = b.floors; m.x = b.x0 + m.col + 0.5; m.vx = 0; state.events.push({ type: 'roof', who: m.id, slug: m.slug, b: b.id }); }
            else m.y = b.floors - 1;
          }
          if (m.y < 0) {
            m.y = 0;
            if (input.down) { m.st = 'street'; m.b = -1; m.vx = 0; }
          }
          if (m.st === 'climb' && move && m.colT <= 0 && !punching) {
            const nc = m.col + move;
            if (nc >= 0 && nc < b.cols) { m.col = nc; m.colT = MON.COL_T; }
            else if (m.y <= 0.05) { m.st = 'street'; m.b = -1; m.x = b.x0 + m.col + 0.5 + move * 0.6; }
            else { m.x = b.x0 + m.col + 0.5 + move * 0.7; startFall(state, m, m.y, move * 2.2); }
          }
          if (m.st === 'climb' && jumpEdge && !punching) { m.x = b.x0 + m.col + 0.5 - m.facing * 0.3; startFall(state, m, m.y, -m.facing * 1.5); state.events.push({ type: 'letGo', who: m.id, slug: m.slug }); }
        }
        if (m.st === 'climb') m.x = b.x0 + m.col + 0.5;
      }
    } else if (m.st === 'roof') {
      const b = building(state, m.b);
      if (!b || b.down) startFall(state, m, m.y, 0);
      else {
        const speed = o.run * m.flavour.run * 0.7 * (punching ? 0.35 : 1);
        m.vx = move * speed;
        m.x += m.vx * dt;
        m.y = b.floors;
        if (m.x < b.x0 - 0.2 || m.x > b.x0 + b.cols + 0.2) { startFall(state, m, m.y, move * 2); }
        else if (!stunned && !punching) {
          if (input.down) { m.col = Math.max(0, Math.min(b.cols - 1, Math.floor(m.x - b.x0))); m.st = 'climb'; m.y = b.floors - 1; m.x = b.x0 + m.col + 0.5; m.colT = MON.COL_T; }
          else if (jumpEdge) { m.st = 'jump'; m.vy = o.jumpV; m.vx = move * speed; m.jumpFrom = m.y; state.events.push({ type: 'jump', who: m.id, slug: m.slug, x: m.x, y: m.y }); }
        }
      }
    } else if (m.st === 'jump' || m.st === 'fall') {
      const jumping = m.st === 'jump';
      if (jumping && move) m.vx += move * 4 * dt;
      m.x = Math.max(0.6, Math.min(W - 0.6, m.x + m.vx * dt));
      m.y += m.vy * dt; m.vy -= o.gravity * dt;
      if (jumping && m.vy < 0 && m.fallFrom === 0) m.fallFrom = m.y;   // the top of the arc counts as the height you fall from
      // catch a face on the way (up held, or moving into it while jumping)
      if (input.up && m.vy < 2) { const b = faceAt(state, m.x); if (b && m.y < b.floors - 0.5 && m.y > 0.2) grab(state, m, b, m.y); }
      // the blimp
      if (m.st !== 'climb' && state.blimp && !m.cpu && state.opts.exits && Math.abs(m.x - state.blimp.x) < 2.6 && Math.abs(m.y + 1 - state.blimp.y) < 1.6) takeExit(state, 'blimp', state.blimp.x, state.blimp.y);
      if (m.st !== 'climb' && m.y <= 0) { if (jumping && m.fallFrom < o.fallFree + 0.01) m.fallFrom = 0; land(state, m); }
    }
    m.anim = animFor(m, punching, input);
  }
  function animFor(m, punching, input) {
    if (m.st === 'revert') return 'revert';
    if (m.st === 'walkoff') return 'walkoff';
    if (m.hitT > 0) return 'hit';
    if (punching) return 'punch';
    if (m.eatT > 0) return 'eat';
    if (m.st === 'climb') return (input.up || input.down) ? 'climb' : 'hang';
    if (m.st === 'jump') return 'jump';
    if (m.st === 'fall' || m.st === 'arrive') return 'fall';
    if (m.st === 'roof' || m.st === 'street') return m.vx !== 0 ? 'walk' : 'idle';
    return 'idle';
  }

  function resolvePunch(state, m) {
    let hit = false;
    const dir = m.punchDir;
    if (m.st === 'climb') {
      const b = building(state, m.b);
      if (b && !b.down) {
        const k = City.cellAt(b, m.col + dir.dx, punchRow(m, b) + dir.dy);
        if (k >= 0) hit = punchCell(state, m, b, k) || hit;
      }
    } else if (m.st === 'street') {
      const b = faceAt(state, m.x);
      if (b) { const k = City.cellAt(b, Math.floor(m.x - b.x0), 0); if (k >= 0) hit = punchCell(state, m, b, k) || hit; }
      const ahead = (x) => (x - m.x) * m.facing > -0.3 && Math.abs(x - m.x) <= MON.REACH + 0.3;
      for (const s of state.soldiers) if ((s.st === 'walk' || s.st === 'kneel' || s.st === 'fire') && ahead(s.x)) {
        s.st = 'flyup'; s.t = 0; s.vx = m.facing * 6; s.vy = 7; state.stats.soldiers++; addPoints(state, m, POINTS.soldier, s.x, 1, 'soldier');
        state.events.push({ type: 'soldierDie', id: s.id, x: s.x, how: 'punched', dir: m.facing }); hit = true;
      }
      const tk = state.tank;
      if (tk && tk.st !== 'wreck' && ahead(tk.x) && Math.abs(tk.x - m.x) <= MON.REACH + 0.9) {
        tk.hp--; hit = true; state.events.push({ type: 'tankHit', x: tk.x, hp: tk.hp });
        if (tk.hp <= 0) { tk.st = 'wreck'; tk.t = 0; state.stats.tanks++; addPoints(state, m, POINTS.tank, tk.x, 1, 'tank'); state.events.push({ type: 'tankDie', x: tk.x }); }
      }
      for (const c of state.cars) if (c.st === 'drive' && ahead(c.x) && Math.abs(c.x - m.x) <= MON.REACH + 0.6) {
        c.st = 'wreck'; c.t = 0; c.vx = 0; state.stats.cars++; hit = true;
        addPoints(state, m, CARS[c.kind].pts, c.x, 0.5, c.kind);
        if (CARS[c.kind].hp) { heal(m, CARS[c.kind].hp); m.eatT = MON.EAT_T; m.lastEat = 'burrito'; }
        state.events.push({ type: 'carWreck', kind: c.kind, x: c.x, how: 'punched', dir: m.facing });
      }
      // a reverted teenager walking past: dinner
      for (const t of state.monsters) if (t !== m && t.st === 'walkoff' && Math.abs(t.x - m.x) <= MON.REACH + 0.2) {
        addPoints(state, m, POINTS.teen, t.x, 1, 'teen'); heal(m, 15); m.eatT = MON.EAT_T; m.lastEat = 'teen'; state.stats.eaten++; hit = true;
        state.events.push({ type: 'eaten', who: t.id, slug: t.slug, by: m.slug, x: t.x });
        loseLife(state, t, 'eaten');
      }
    }
    // the drone: within a fist's reach of wherever you stand
    const d = state.drone;
    if (d && d.st !== 'dead' && Math.abs(d.x - m.x) <= 1.8 && d.y - m.y > -0.6 && d.y - m.y < 2.4 && (m.st !== 'street' || Math.sign(d.x - m.x) === m.facing || Math.abs(d.x - m.x) < 0.5)) {
      d.st = 'dead'; d.t = 0; d.vy = 0; d.vx = m.facing * 3; state.stats.drones++; hit = true;
      addPoints(state, m, POINTS.drone, d.x, d.y, 'drone');
      state.events.push({ type: 'droneDie', x: d.x, y: d.y });
    }
    // another monster in reach, in the direction of the punch
    for (const t of state.monsters) {
      if (t === m || !isBig(t) || t.st === 'gone' || t.st === 'arrive') continue;
      const dx = t.x - m.x, dy = t.y - m.y;
      if (Math.abs(dx) > MON.REACH + 0.2 || Math.abs(dy) > 1.3) continue;
      const wantDir = dir.dx || m.facing;
      if (Math.abs(dx) > 0.3 && Math.sign(dx) !== wantDir) continue;
      if (damage(state, t, 8, 'monster', t.x, t.y + 1)) { state.events.push({ type: 'monsterHit', who: t.id, slug: t.slug, by: m.slug, x: t.x, y: t.y + 1 }); hit = true; }
    }
    state.events.push({ type: 'punchLand', who: m.id, slug: m.slug, hit, x: m.x, y: m.y });
  }

  // ---- the ways out ----------------------------------------------------------------------------------
  function takeExit(state, which, x, y) {
    if (state.exit) return;
    state.exit = which;
    state.events.push({ type: 'exit', which, x, y });
  }

  // ---- enemies ------------------------------------------------------------------------------------------
  function fireBullet(state, x, y, target, speed, dmg, from) {
    const tx = target.x, ty = target.y + 0.9;
    const spread = from === 'drone' ? DRONE.spread : SOLDIER.spread;
    const a = Math.atan2(ty - y, tx - x) + (rng(state) - 0.5) * 2 * spread;
    state.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 2.2, dmg, from });
    state.events.push({ type: 'shot', x, y, from });
  }
  function stepEnemies(state, dt) {
    const W = state.city.width;
    // soldiers
    for (let i = state.soldiers.length - 1; i >= 0; i--) {
      const s = state.soldiers[i];
      s.t += dt;
      if (s.st === 'dead') { if (s.t > 0.3) state.soldiers.splice(i, 1); continue; }
      if (s.st === 'flyup') { s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= 20 * dt; if (s.t > SOLDIER.flyT) state.soldiers.splice(i, 1); continue; }
      const tgt = nearestMonster(state, s.x, 0, true);
      if (!tgt) { s.st = 'walk'; s.x += s.dir * SOLDIER.speed * dt; if (s.x < -2 || s.x > W + 2) state.soldiers.splice(i, 1); continue; }
      const dist = Math.abs(tgt.x - s.x);
      if (s.st === 'walk') {
        s.dir = tgt.x > s.x ? 1 : -1;
        if (dist > s.stop) s.x += s.dir * SOLDIER.speed * dt;
        else { s.st = 'kneel'; s.t = 0; }
      } else if (s.st === 'kneel') {
        if (s.t > 0.4) { s.st = 'fire'; s.t = 0; s.shotT = 0; s.burstT = 0; }
      } else if (s.st === 'fire') {
        s.dir = tgt.x > s.x ? 1 : -1;
        if (dist > s.stop + 5) { s.st = 'walk'; s.t = 0; continue; }
        s.burstT += dt;
        if (s.burstT <= SOLDIER.burst) {
          s.shotT -= dt;
          if (s.shotT <= 0) { s.shotT = SOLDIER.shotGap; fireBullet(state, s.x, 0.5, tgt, SOLDIER.bullet, SOLDIER.dmg, 'soldier'); }
        } else if (s.burstT > SOLDIER.burst + SOLDIER.pause) s.burstT = 0;
      }
    }
    // the armoured truck
    const tk = state.tank;
    if (tk) {
      tk.t += dt;
      if (tk.st === 'wreck') { if (tk.t > TANK.wreckT) { state.tank = null; } }
      else {
        const tgt = nearestMonster(state, tk.x, 0, true);
        if (tgt) {
          const dist = Math.abs(tgt.x - tk.x);
          tk.dir = tgt.x > tk.x ? 1 : -1;
          if (dist > tk.stop) { tk.x += tk.dir * TANK.speed * dt; tk.st = 'roll'; }
          else if (dist < TANK.backoff) { tk.x -= tk.dir * 2 * dt; tk.st = 'back'; }
          else tk.st = 'stop';
          tk.x = Math.max(-1, Math.min(W + 1, tk.x));
          tk.fireT -= dt;
          if (tk.fireT <= 0 && tk.st !== 'roll') {
            tk.fireT = TANK.fireGap;
            // a lob: solve for the target in ~1 s
            const ty = tgt.y + 0.9, tt = 1.0, aimX = tgt.x + (rng(state) - 0.5) * 2 * TANK.spread;
            const vx = (aimX - tk.x) / tt, vy = (ty - 0.8 + 0.5 * state.opts.gravity * tt * tt) / tt;
            state.shells.push({ x: tk.x, y: 0.8, vx, vy, life: 2.5 });
            state.events.push({ type: 'tankFire', x: tk.x, dir: tk.dir });
          }
        }
      }
    }
    // the drone
    const d = state.drone;
    if (d) {
      d.t += dt;
      if (d.st === 'dead') { d.x += d.vx * dt; d.y += d.vy * dt; d.vy -= 12 * dt; d.spin += dt * 8; if (d.y < -1 || d.t > 2.5) { state.drone = null; state.events.push({ type: 'droneCrash', x: d.x }); } }
      else {
        const tgt = nearestMonster(state, d.x, d.y, true) || player(state);
        d.sideT -= dt;
        if (d.sideT <= 0) { d.sideT = rand(state, 3, 6); d.side = rng(state) < 0.5 ? -1 : 1; d.hover = rand(state, DRONE.hoverMin, DRONE.hoverMax); }
        const hx = tgt.x + d.side * (d.hover + Math.sin(d.t * 1.3) * DRONE.sway), hy = Math.max(1.5, tgt.y + 1.2 + Math.sin(d.t * 0.9) * 0.4);
        d.x += (hx - d.x) * Math.min(1, dt * 2.2); d.y += (hy - d.y) * Math.min(1, dt * 2.2);
        d.st = Math.abs(hx - d.x) > 0.5 ? 'move' : 'hover';
        d.fireT -= dt;
        if (d.fireT <= 0) { d.fireT = DRONE.fireGap; d.burst = DRONE.burst; d.shotT = 0; }
        if (d.burst > 0) { d.shotT -= dt; if (d.shotT <= 0) { d.shotT = DRONE.shotGap; d.burst--; fireBullet(state, d.x, d.y - 0.3, tgt, DRONE.bullet, DRONE.dmg, 'drone'); } }
      }
    }
    // traffic
    for (let i = state.cars.length - 1; i >= 0; i--) {
      const c = state.cars[i];
      c.t += dt;
      if (c.st === 'wreck') { if (c.t > 4) state.cars.splice(i, 1); continue; }
      c.x += c.vx * dt;
      if (c.x < -3 || c.x > W + 3) state.cars.splice(i, 1);
    }
    // bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let gone = b.life <= 0 || b.y < -0.2;
      if (!gone) for (const m of state.monsters) { if (isTarget(m) && bodyHit(m, b.x, b.y)) { if (damage(state, m, b.dmg, b.from, b.x, b.y)) state.events.push({ type: 'bulletHit', who: m.id, x: b.x, y: b.y }); gone = true; break; } }
      if (gone) state.bullets.splice(i, 1);
    }
    // shells
    for (let i = state.shells.length - 1; i >= 0; i--) {
      const s = state.shells[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= state.opts.gravity * dt; s.life -= dt;
      let gone = s.life <= 0;
      for (const m of state.monsters) if (isTarget(m) && Math.abs(m.x - s.x) < 0.9 && s.y > m.y - 0.3 && s.y < m.y + MON.H + 0.4) { damage(state, m, TANK.shellDmg, 'shell', s.x, s.y); gone = true; break; }
      if (!gone && s.y <= 0) { gone = true; state.events.push({ type: 'shellGround', x: s.x }); }
      if (gone) { state.events.push({ type: 'shellBoom', x: s.x, y: Math.max(0, s.y) }); state.shells.splice(i, 1); }
    }
  }
  function stepSpawns(state, dt) {
    if (!state.opts.enemies) return;
    const tm = state.timers, W = state.city.width, day = state.day, sc = state.opts.spawnScale;
    const p = player(state);
    const farSide = () => (p.x < W / 2 ? W + 1.5 : -1.5);
    tm.soldier -= dt;
    if (tm.soldier <= 0) {
      tm.soldier = Math.max(4, 12 - day) * sc;
      const alive = state.soldiers.filter((s) => s.st === 'walk' || s.st === 'kneel' || s.st === 'fire').length;
      if (alive >= SOLDIER.cap(day)) tm.soldier = 2 * sc;
      else {
      const x = rng(state) < 0.5 ? -1.5 : W + 1.5;
      state.soldiers.push({ id: state.nextId++, x, y: 0, vx: 0, vy: 0, dir: x < 0 ? 1 : -1, st: 'walk', t: 0, stop: rand(state, SOLDIER.stopMin, SOLDIER.stopMax), shotT: 0, burstT: 0 });
      state.events.push({ type: 'soldier', x });
      }
    }
    tm.tank -= dt;
    if (tm.tank <= 0 && !state.tank) {
      tm.tank = 30 * sc;
      const x = farSide();
      state.tank = { x, y: 0, dir: x < 0 ? 1 : -1, st: 'roll', t: 0, fireT: 2.5, hp: TANK.hp, stop: rand(state, TANK.stopMin, TANK.stopMax) };
      state.events.push({ type: 'tank', x });
    }
    tm.drone -= dt;
    if (tm.drone <= 0 && !state.drone) {
      tm.drone = 40 * sc;
      const x = farSide();
      state.drone = { x, y: 9, vx: 0, vy: 0, st: 'move', t: 0, fireT: 3, burst: 0, shotT: 0, side: x < 0 ? -1 : 1, sideT: 4, hover: 3, spin: 0 };
      state.events.push({ type: 'drone', x });
    }
    tm.car -= dt;
    if (tm.car <= 0) {
      tm.car = rand(state, 6, 14);
      const r = rng(state);
      const kind = r < 0.25 ? 'cruiser' : r < 0.7 ? 'taxi' : 'bot';
      const x = rng(state) < 0.5 ? -2.5 : W + 2.5;
      state.cars.push({ id: state.nextId++, kind, x, vx: (x < 0 ? 1 : -1) * CARS[kind].speed, st: 'drive', t: 0 });
      state.events.push({ type: 'car', kind, x });
    }
  }
  function stepBlimp(state, dt) {
    if (state.blimpT >= 0) { state.blimpT -= dt; if (state.blimpT < 0) { const top = Math.max(...state.city.buildings.map((b) => b.floors)); state.blimp = { x: -6, y: top + BLIMP.lift, vx: BLIMP.speed }; state.events.push({ type: 'blimp', y: state.blimp.y }); } }
    if (state.blimp) { state.blimp.x += state.blimp.vx * dt; if (state.blimp.x > state.city.width + 8) { state.blimp = null; state.blimpT = 60; } }
  }

  // ---- the autopilot: honest wreckers. Companions use it; so do the attract mode and the sim. -----------
  function autopilot(state, m) {
    const ai = m.ai, city = state.city, out = { move: 0, up: false, down: false, jump: false, punch: false };
    if (!isBig(m) || m.st === 'gone' || m.st === 'arrive' || m.st === 'fall' || m.st === 'jump') return out;
    ai.t += 1 / 120; ai.punchCd -= 1 / 120;
    const p = player(state);
    // pick a building: the player's brand first (the companions' spite), then the nearest standing one
    let goal = building(state, ai.goal);
    if (!goal || goal.down || goal.collapsing) {
      let best = null, bd = 1e9;
      for (const b of city.buildings) {
        if (b.down || b.collapsing) continue;
        let d = Math.abs(b.x0 + b.cols / 2 - m.x);
        if (m.cpu && b.restaurant === p.slug) d -= 40;
        if (d < bd) { bd = d; best = b; }
      }
      ai.goal = best ? best.id : -1; goal = best; ai.dir = 1; ai.stuck = 0;
      if (!goal) return out;
    }
    // punch a monster in reach now and then
    for (const t of state.monsters) {
      if (t === m || !isBig(t) || t.st === 'gone') continue;
      if (Math.abs(t.x - m.x) <= MON.REACH && Math.abs(t.y - m.y) <= 1.2 && ai.punchCd <= 0 && (m.st === 'street' || (m.st === 'climb' && t.st === 'climb'))) {
        ai.punchCd = 7 + rng(state) * 5; out.move = t.x > m.x ? 1 : -1; if (m.st === 'climb') out.move = 0; out.punch = true;
        if (m.st === 'climb') { out.move = t.col > m.col ? 1 : t.col < m.col ? -1 : 0; }
        return out;
      }
    }
    if (m.st === 'street') {
      const cx = goal.x0 + goal.cols / 2;
      if (m.x < goal.x0 + 0.4) out.move = 1; else if (m.x > goal.x0 + goal.cols - 0.4) out.move = -1;
      else { out.up = true; }
      // a soldier or a car in the way is a snack
      for (const s of state.soldiers) if ((s.st === 'kneel' || s.st === 'fire' || s.st === 'walk') && Math.abs(s.x - m.x) < MON.REACH) { out.move = s.x > m.x ? 1 : -1; out.punch = (m.punchT <= 0); return out; }
      const face = faceAt(state, m.x);
      if (face && face.id !== goal.id && Math.abs(cx - m.x) > 3 && rng(state) < 0.01) { out.up = true; ai.goal = face.id; }
      void cx;
    } else if (m.st === 'climb') {
      const b = building(state, m.b);
      if (!b) return out;
      ai.goal = b.id;
      const row = punchRow(m, b);
      const worth = (kk) => kk >= 0 && b.state[kk] !== S.BROKEN && !(b.cells[kk] === T.NEON && b.neon && b.neon.lit && !b.neon.dead);
      const k = City.cellAt(b, m.col, row);
      const it = k >= 0 ? itemAt(state, b.id, k) : null;
      const fx = it ? DEAL_FX[it.deal] : null;
      if (worth(k)) { out.punch = m.punchT <= 0; return out; }
      if (it && (fx.eat || fx.take) && !(it.deal === 'fryer' && it.hot)) { out.punch = m.punchT <= 0; return out; }
      // clear the row you are on (nearest cell worth a punch), then up a floor; a lit battery: step away
      let best = -1, bd = 99;
      for (let c = 0; c < b.cols; c++) { const kk = City.cellAt(b, c, row); if (worth(kk)) { const d = Math.abs(c - m.col); if (d < bd) { bd = d; best = c; } } }
      if (it && fx.boom && it.lit) { out.move = m.col > 0 ? -1 : 1; if (best === m.col + out.move) out.move = 0; }
      else if (best >= 0) out.move = best > m.col ? 1 : -1;
      else if (row < b.floors - 1) out.up = true;
      else { out.down = true; if (m.y <= 0.05) ai.goal = -1; }
    } else if (m.st === 'roof') {
      out.down = true;
    }
    return out;
  }

  // ---- for the shell ----------------------------------------------------------------------------------------
  function summary(state) {
    const p = player(state);
    return { score: state.score, lives: p.lives, hp: p.hp, day: state.day, city: state.city.name, stateName: state.city.state, phase: state.phase,
      monsters: state.monsters.map((m) => ({ slug: m.slug, hp: m.hp, st: m.st, cpu: m.cpu, score: m.score })),
      standing: state.city.buildings.filter((b) => !b.down).length, total: state.city.buildings.length };
  }

  globalThis.CarnageCore = {
    createGame, step, autopilot, skipMap, advanceDay, summary, DEFAULTS, POINTS, DEAL_FX, MON, SOLDIER, TANK, DRONE, CARS, SLUGS, flavourFor,
    // for the sim and the labs
    punchCell, breakCell, startCollapse, damage, revert, spawnItem, itemAt, faceAt, building, player, rng, hashSeed, grab, startFall, takeExit,
  };
})();
