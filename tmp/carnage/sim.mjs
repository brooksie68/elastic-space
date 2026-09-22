// Carnage core sim — run: node tmp/carnage/sim.mjs
// Loads the real city.js + game-core.js (side-effect globals) and asserts on them.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const world = path.resolve(here, '../../src/worlds/carnage');
await import(pathToFileURL(path.join(world, 'city.js')).href);
await import(pathToFileURL(path.join(world, 'game-core.js')).href);
const C = globalThis.CarnageCore, City = globalThis.CarnageCity;
const T = City.T, S = City.S;

let passed = 0;
const failures = [];
let current = '';
function assert(cond, msg) {
  if (!cond) { throw new Error(msg); }
  passed++;
}
function test(name, fn) {
  current = name;
  try { fn(); } catch (e) { failures.push(name + ' -> ' + (e && e.message ? e.message : e)); console.error('FAIL ' + name + ': ' + (e && e.stack ? e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | ') : e)); }
}
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const DT = 1 / 120;
const IDLE = { move: 0, up: false, down: false, jump: false, punch: false };
const inp = (o) => Object.assign({}, IDLE, o);
function run(state, input, seconds, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    C.step(state, typeof input === 'function' ? input(state) : input, DT);
    if (onStep && onStep(state) === false) return;
  }
}
function events(state, type) { return state.events.filter((e) => e.type === type); }
// a quiet city: no enemies, no exits, no companions — the rules alone
function pure(opts) { return C.createGame(Object.assign({ exits: 0, enemies: 0, companions: 0, seed: 3, lives: 3, flavour: 0 }, opts || {})); }
const P = (s) => s.monsters[0];
function collect(state, input, seconds) {
  const got = [];
  run(state, input, seconds, (s) => { for (const e of s.events) got.push(e); });
  return got;
}
// one punch: press for a step, hold off, let it resolve
function punchOnce(state, extra) {
  const got = [];
  const m = P(state);
  for (let i = 0; i < 120 && (m.hitT > 0 || m.eatT > 0 || m.punchT > 0); i++) { C.step(state, IDLE, DT); got.push(...state.events); }   // wait until a punch can start
  m.prevPunch = false;
  C.step(state, inp(Object.assign({ punch: true }, extra || {})), DT);
  got.push(...state.events);
  run(state, inp(Object.assign({}, extra || {}, { punch: false, up: false, down: false, move: 0 })), 0.4, (s) => { got.push(...s.events); });
  return got;
}
function firstStanding(state) { return state.city.buildings.find((b) => !b.down && !b.collapsing); }
function fresh(m) { m.hitT = 0; m.eatT = 0; m.punchT = 0; m.punchHeld = 0; m.invulnT = 0; m.prevPunch = false; m.prevJump = false; m.prevUp = false; m.subT = 0; }
function placeOnFace(state, m, b, col, y) {
  m.x = b.x0 + col + 0.5; m.y = y; m.st = 'climb'; m.b = b.id; m.col = col; m.colT = 0; m.vx = 0; m.vy = 0; fresh(m);
}
function placeOnStreet(state, m, x) { m.x = x; m.y = 0; m.st = 'street'; m.b = -1; m.vx = 0; m.vy = 0; fresh(m); }
// the hands on cell k: the ground floor is punched from the street, anything higher from the face
function placeAtCell(state, m, b, k) { const col = k % b.cols, row = Math.floor(k / b.cols); if (row === 0) placeOnStreet(state, m, b.x0 + col + 0.5); else placeOnFace(state, m, b, col, Math.max(0, row - C.monHand(state))); }

test('1: determinism', () => {
  const script = (s) => inp({ move: Math.sin(s.t) > 0 ? 1 : -1, up: Math.floor(s.t) % 3 === 0, jump: Math.floor(s.t * 4) % 7 === 0, punch: Math.floor(s.t * 3) % 2 === 0 });
  const a = C.createGame({ seed: 11, companions: 2 }), b = C.createGame({ seed: 11, companions: 2 });
  run(a, script, 25); run(b, script, 25);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same seed + same inputs = same game');
  const c = C.createGame({ seed: 12, companions: 2 });
  run(c, script, 25);
  assert(JSON.stringify(c) !== JSON.stringify(a), 'another seed is another game');
  assert(a.stats.cells > 0, 'the game did things (' + a.stats.cells + ' cells)');
});

test('2: the city', () => {
  const dealIds = new Set(City.DEAL_IDS.concat(['corridor', 'supplement']));
  for (let day = 1; day <= 60; day += 1) {
    for (const seed of [1, 2, 3]) {
      const s = C.createGame({ seed, day, exits: 1, enemies: 0, companions: 0 });
      const city = s.city;
      assert(city.name === City.cityDef(day)[0], 'the day names the city');
      const brands = city.buildings.filter((b) => b.restaurant).map((b) => b.restaurant).sort();
      assert(brands.join() === 'george,lizzie,ralph', 'one restaurant of each brand (day ' + day + ')');
      let lastEnd = -1;
      for (const b of city.buildings) {
        assert(b.x0 > lastEnd, 'buildings do not overlap'); lastEnd = b.x0 + b.cols;
        assert(b.cols >= 3 && b.cols <= 7 && b.floors >= 3 && b.floors <= 16, 'sizes in range');
        assert(b.threshold >= 0.55 && b.threshold <= 0.65, 'threshold 55–65%');
        assert(b.cells.length === b.cols * b.floors && b.punchable === b.cells.length, 'cell count');
        for (let k = 0; k < b.cells.length; k++) {
          const t = b.cells[k];
          assert(t >= 0 && t <= 3, 'valid cell type');
          if (t === T.WINDOW || t === T.STORE) assert(dealIds.has(b.deal[k]), 'every window has a deal (' + b.deal[k] + ')');
          else assert(b.deal[k] === 'none', 'walls and neon deal nothing');
        }
        for (let c = 0; c < b.cols; c++) assert(b.cells[c] === T.STORE, 'every ground floor is a shopfront (no first-floor apartments)');
        if (b.restaurant) for (let c = 0; c < b.cols; c++) assert(b.cells[c] === T.STORE, 'a restaurant is a storefront across the ground floor');
        if (b.neon) { assert(b.neon.cells.length >= 2, 'neon is at least two cells'); for (const k of b.neon.cells) assert(b.cells[k] === T.NEON, 'neon cells are neon'); }
      }
      assert(city.width > lastEnd, 'the city is wider than its last building');
      assert(typeof city.night === 'boolean', 'night is decided');
      if (City.cityDef(day)[4].special === 'wellness') {
        const n = city.buildings.reduce((a, b) => a + b.deal.filter((d) => d === 'supplement').length, 0);
        assert(n >= 1, 'the wellness day deals a supplement');
      }
      assert('subway' in city.exits && 'corridor' in city.exits && 'blimp' in city.exits, 'the exits are decided');
      if (city.exits.corridor) { const b = city.buildings[city.exits.corridor.b]; assert(b.deal[city.exits.corridor.k] === 'corridor', 'the corridor window is dealt'); }
    }
  }
  const q = C.createGame({ seed: 5, exits: 0, enemies: 0 });
  assert(Object.keys(q.city.exits).length === 0, 'exits: 0 deals no ways out');
  assert(!q.city.buildings.some((b) => b.deal.includes('corridor')), 'no corridor window without exits');
  // the deal table gets meaner with the day
  const rngA = (function () { let s = 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  let hazEarly = 0, hazLate = 0;
  for (let i = 0; i < 4000; i++) { if (City.DEALS[City.pickDeal(rngA, 1)].kind === 'hazard') hazEarly++; }
  for (let i = 0; i < 4000; i++) { if (City.DEALS[City.pickDeal(rngA, 10)].kind === 'hazard') hazLate++; }
  assert(hazLate > hazEarly * 1.3, 'day 10 deals more hazards than day 1 (' + hazEarly + ' vs ' + hazLate + ')');
});

test('3: the street', () => {
  const s = pure();
  const m = P(s);
  placeOnStreet(s, m, 10);
  run(s, inp({ move: 1 }), 1);
  assert(near(m.x, 10 + s.opts.run * m.flavour.run, 0.05), 'a second of running = run speed (' + m.x.toFixed(2) + ')');
  assert(m.facing === 1, 'facing follows the move');
  run(s, inp({ move: -1 }), 0.5);
  assert(m.facing === -1, 'and back');
  placeOnStreet(s, m, 1);
  run(s, inp({ move: -1 }), 2);
  assert(m.x >= 0.6, 'clamped at the left edge');
  placeOnStreet(s, m, s.city.width - 1);
  run(s, inp({ move: 1 }), 2);
  assert(m.x <= s.city.width - 0.6, 'clamped at the right edge');
  assert(m.anim === 'walk', 'walking animates as walk');
  run(s, IDLE, 0.1);
  assert(m.anim === 'idle', 'standing still is idle');
});

test('4: grab, climb, the roof, the edges', () => {
  const s = pure();
  const m = P(s);
  const b = firstStanding(s);
  placeOnStreet(s, m, b.x0 + 1.5);
  run(s, inp({ up: true }), 0.05);
  assert(m.st === 'climb' && m.b === b.id && m.col === 1, 'up in front of a building grabs the face');
  const y0 = m.y;
  run(s, inp({ up: true }), 1);
  assert(near(m.y - y0, s.opts.climb * m.flavour.climb, 0.05), 'a second of climbing = climb speed (' + (m.y - y0).toFixed(2) + ')');
  assert(m.anim === 'climb', 'climbing animates');
  run(s, inp({ up: true }), 20);
  assert(m.st === 'roof' && near(m.y, b.floors, 1e-9), 'climbing past the top hoists onto the roof');
  run(s, inp({ move: 1 }), 5);
  assert(m.st === 'street' || m.st === 'fall', 'walking off the roof edge drops you (' + m.st + ')');
  run(s, IDLE, 3);
  assert(m.st === 'street' && m.y === 0, 'and you land on the street');
  const dmgEv = s.stats.falls;
  assert(dmgEv === 1 && m.hp < 100, 'a fall from ' + b.floors + ' floors hurts (' + m.hp + ')');
  const expected = 100 - (b.floors - s.opts.fallFree) * s.opts.fallDmg;
  assert(near(m.hp, Math.max(0, expected), 0.11), 'by the rule: (floors - 2) x 8 (' + m.hp + ' vs ' + expected + ')');
  // sideways off the face at height
  m.hp = 100;
  placeOnFace(s, m, b, 0, 1.5);
  run(s, inp({ move: -1 }), 0.3);
  assert(m.st === 'fall' || m.st === 'street', 'moving off the left edge lets go');
  run(s, IDLE, 2);
  assert(m.st === 'street' && m.hp === 100, 'a short drop is free');
  // sideways at the bottom steps off onto the street
  placeOnFace(s, m, b, b.cols - 1, 0);
  run(s, inp({ move: 1 }), 0.2);
  assert(m.st === 'street', 'stepping off at the ground');
  // climbing down to the street
  placeOnFace(s, m, b, 1, 2);
  run(s, inp({ down: true }), 3);
  assert(m.st === 'street' && m.y === 0, 'down at the bottom steps onto the street');
  // the roof: down climbs back onto the face
  placeOnFace(s, m, b, 1, b.floors - 1);
  run(s, inp({ up: true }), 1);
  assert(m.st === 'roof', 'on the roof');
  run(s, inp({ down: true }), 0.05);
  assert(m.st === 'climb' && near(m.y, b.floors - 1, 0.25), 'down from the roof climbs back on (' + m.y.toFixed(2) + ')');
  // a collapsing building cannot be grabbed
  const b2 = s.city.buildings[1];
  C.startCollapse(s, b2, null);
  placeOnStreet(s, m, b2.x0 + 1);
  run(s, inp({ up: true }), 0.1);
  assert(m.st === 'street', 'no grabbing a building that is coming down');
});

test('5: the jump', () => {
  const s = pure();
  const m = P(s);
  placeOnStreet(s, m, 3);
  let top = 0;
  C.step(s, inp({ jump: true }), DT);
  assert(m.st === 'jump', 'jump lifts off');
  run(s, IDLE, 2, (st) => { top = Math.max(top, m.y); });
  const apex = s.opts.jumpV * s.opts.jumpV / (2 * s.opts.gravity);
  assert(near(top, apex, 0.15), 'apex by physics (' + top.toFixed(2) + ' vs ' + apex.toFixed(2) + ')');
  assert(m.st === 'street' && m.hp === 100, 'a jump lands without damage');
  // holding jump does not bounce
  run(s, inp({ jump: true }), 1.5);
  assert(m.st === 'street', 'jump is edge-triggered');
  // catch a face mid-air
  const b = firstStanding(s);
  placeOnStreet(s, m, b.x0 + 1.5);
  C.step(s, inp({ jump: true }), DT);
  run(s, inp({ up: true }), 0.6, (st) => m.st !== 'climb');
  assert(m.st === 'climb' && m.y > 0.2, 'up in the air catches the face (' + m.y.toFixed(2) + ')');
});

test('6: punching cells', () => {
  const s = pure();
  const m = P(s);
  const b = firstStanding(s);
  // find a window and a wall
  let wk = -1, xk = -1;
  for (let k = 0; k < b.cells.length; k++) { if (wk < 0 && b.cells[k] === T.WINDOW && Math.floor(k / b.cols) > 0) wk = k; if (xk < 0 && b.cells[k] === T.WALL) xk = k; }
  assert(wk >= 0, 'a window exists above the ground floor');
  b.deal[wk] = 'none';
  placeAtCell(s, m, b, wk);
  const got = punchOnce(s);
  assert(got.some((e) => e.type === 'punch') && got.some((e) => e.type === 'punchLand' && e.hit), 'a punch lands');
  assert(b.state[wk] === S.BROKEN, 'a window breaks in one');
  assert(got.some((e) => e.type === 'cellBreak' && e.k === wk && e.deal === 'none'), 'cellBreak with the deal');
  assert(s.score === C.POINTS.window, 'window points');
  const again = punchOnce(s);
  assert(!again.some((e) => e.type === 'punchLand' && e.hit) && s.score === C.POINTS.window, 'a punch into an empty hole is nothing');
  if (xk >= 0) {
    placeAtCell(s, m, b, xk);
    const g1 = punchOnce(s);
    assert(b.state[xk] === S.CRACKED && g1.some((e) => e.type === 'cellCrack'), 'a wall cracks first');
    punchOnce(s);
    assert(b.state[xk] === S.BROKEN, 'and breaks on the second');
    assert(s.score === C.POINTS.window + C.POINTS.wall, 'wall points');
  }
  // aiming: up hits the cell above, sideways the neighbour
  const row = 1, col = 1;
  const kUp = City.cellAt(b, col, row + 1), kSide = City.cellAt(b, col + 1, row);
  if (kUp >= 0 && b.state[kUp] !== S.BROKEN) {
    placeAtCell(s, m, b, City.cellAt(b, col, row)); b.deal[kUp] = 'none';
    punchOnce(s, { up: true });
    assert(b.state[kUp] !== S.INTACT, 'up + punch hits the cell above');
  }
  if (kSide >= 0 && b.state[kSide] !== S.BROKEN) {
    placeAtCell(s, m, b, City.cellAt(b, col, row)); b.deal[kSide] = 'none';
    const before = b.state[kSide];
    punchOnce(s, { move: 1 });
    assert(b.state[kSide] !== before || b.state[kSide] === S.BROKEN, 'side + punch hits the neighbour');
  }
  // from the street: the ground floor under you
  const b3 = s.city.buildings[2];
  b3.deal[1] = 'none';
  placeOnStreet(s, m, b3.x0 + 1.5);
  punchOnce(s, { pdy: -1 });
  assert(b3.state[1] !== S.INTACT, 'the stomp (down + punch) hits the ground floor under you');
  // down-right stomps the ground-floor cell to the right
  const kR = City.cellAt(b3, 2, 0);
  if (kR >= 0 && b3.cells[kR] !== T.NEON) { b3.deal[kR] = 'none'; b3.state[kR] = S.INTACT; placeOnStreet(s, m, b3.x0 + 1.5); punchOnce(s, { pdx: 1, pdy: -1 }); assert(b3.state[kR] !== S.INTACT, 'down-right stomps the ground-floor cell to the right'); }
  // and a straight punch from the street hits the floor the fists are at
  const rowHand = Math.floor(C.monHand(s));
  const kHand = City.cellAt(b3, 1, rowHand);
  if (kHand >= 0 && b3.cells[kHand] !== T.NEON) { b3.deal[kHand] = 'none'; placeOnStreet(s, m, b3.x0 + 1.5); punchOnce(s, { pdx: 0, pdy: 0 }); assert(b3.state[kHand] !== S.INTACT, 'a straight punch from the street hits the cell at fist height (row ' + rowHand + ')'); }
  // the punch animation + the repeat
  placeOnFace(s, m, b, 0, 2);
  const cnt = collect(s, inp({ punch: true }), 3).filter((e) => e.type === 'punch').length;
  assert(cnt >= 3 && cnt <= 6, 'held punch repeats (' + cnt + ' in 3 s)');
});

test('7: the collapse', () => {
  const s = pure({ seed: 9 });
  const m = P(s);
  const b = s.city.buildings.find((bb) => !bb.down && !bb.collapsing && !bb.restaurant);   // a plain building: no rival bonus in the points
  b.deal.fill('none');
  const need = Math.ceil(b.threshold * b.punchable);
  for (let k = 0; k < need - 1; k++) C.breakCell(s, b, k, m, 'test');
  assert(!b.collapsing, 'one short of the threshold stands');
  placeOnFace(s, m, b, b.cols - 1, b.floors - 1);
  C.step(s, IDLE, DT);
  const last = b.cells.length - 1;
  b.state[last] = S.INTACT;
  C.breakCell(s, b, last, m, 'test');
  assert(b.collapsing && s.events.some((e) => e.type === 'collapseStart'), 'the threshold brings it down');
  assert(m.st === 'fall', 'whoever is on it falls');
  let ended = null;
  const jolts = [];
  run(s, IDLE, C.collapseDuration(s, b) + 0.5, (st) => { const e = events(st, 'collapseEnd')[0]; if (e) ended = e; jolts.push(...events(st, 'collapseJolt')); });
  assert(b.down && ended, 'and it is down after its duration');
  assert(C.collapseDuration(s, b) >= s.opts.floorT * b.floors, 'a building takes 0.4 s a floor');
  assert(jolts.length === b.floors - 1 && jolts.every((j, i) => j.floor === i + 1 && j.b === b.id), 'one jolt per floor crushed out on the way down');
  assert(ended.points === C.POINTS.building + C.POINTS.perFloor * b.floors, 'building points by floors');
  assert(m.st === 'street' && m.hp < 100, 'the fall from the top hurt');
  // rival vs own restaurant
  const s2 = pure({ seed: 9, monster: 'lizzie' });
  const m2 = P(s2);
  const rival = s2.city.buildings.find((x) => x.restaurant === 'george');
  const own = s2.city.buildings.find((x) => x.restaurant === 'lizzie');
  for (const bb of [rival, own]) { bb.deal.fill('none'); const n = Math.ceil(bb.threshold * bb.punchable); for (let k = 0; k < n; k++) C.breakCell(s2, bb, k, m2, 'test'); }
  const ends = [];
  run(s2, IDLE, Math.max(C.collapseDuration(s2, rival), C.collapseDuration(s2, own)) + 1, (st) => ends.push(...events(st, 'collapseEnd')));
  const er = ends.find((e) => e.b === rival.id), eo = ends.find((e) => e.b === own.id);
  assert(er && er.rival && er.points === C.POINTS.building + C.POINTS.perFloor * rival.floors + C.POINTS.rival, 'a rival restaurant pays the bonus');
  assert(eo && !eo.rival && eo.points === 0, 'your own pays nothing');
  // the day ends when every building is down
  const s3 = pure({ seed: 4, buildings: 3 });
  for (const bb of s3.city.buildings) C.startCollapse(s3, bb, P(s3));
  const got = collect(s3, IDLE, Math.max(...s3.city.buildings.map((b) => C.collapseDuration(s3, b))) + 1);
  assert(got.some((e) => e.type === 'dayEnd'), 'every building down ends the day');
  assert(s3.phase === 'dayEnd' || s3.phase === 'map', 'the tally phase');
});

test('8: the things in the windows', () => {
  function setup(deal, opts) {
    const s = pure(Object.assign({ seed: 21 }, opts || {}));
    const m = P(s);
    const b = s.city.buildings.find((x) => !x.restaurant && x.floors >= 4);
    let k = -1;
    for (let i = b.cols; i < b.cells.length; i++) if (b.cells[i] === T.WINDOW) { k = i; break; }
    b.deal.fill('none');
    b.deal[k] = deal;
    placeAtCell(s, m, b, k);
    return { s, m, b, k };
  }
  // the edibles
  for (const [deal, pts, hp] of [['customer', 500, 12], ['worker', 500, 12], ['zombie', 500, 12], ['fries', 100, 8], ['shake', 100, 8], ['nuggets', 100, 8], ['patty', 100, 8], ['cake', 150, 10], ['streamer', 300, 12], ['soldier', 50, 5], ['supplement', 5000, 100]]) {
    const { s, m, b, k } = setup(deal);
    m.hp = 40;
    const g1 = punchOnce(s);
    assert(g1.some((e) => e.type === 'cellBreak' && e.deal === deal) && s.items.length === 1, deal + ' appears when the window breaks');
    const g2 = punchOnce(s);
    assert(g2.some((e) => e.type === 'eat' && e.what === deal), deal + ' is eaten on the next punch');
    assert(s.score === C.POINTS.window + pts, deal + ' points (' + s.score + ')');
    assert(near(m.hp, Math.min(100, 40 + hp), 1e-9), deal + ' heals ' + hp + ' (' + m.hp + ')');
    assert(s.items.length === 0 && m.anim === 'eat', deal + ' is gone and the chew plays');
  }
  // the money
  for (const [deal, pts] of [['cash', 500], ['crypto', 2500], ['crown', 250]]) {
    const { s } = setup(deal);
    punchOnce(s); const g = punchOnce(s);
    assert(g.some((e) => e.type === 'take' && e.what === deal) && s.score === C.POINTS.window + pts, deal + ' pays ' + pts);
  }
  // the hazards that hurt on the punch
  for (const [deal, dmg] of [['peloton', 15], ['cactus', 8], ['vape', 5], ['smoothie', 12]]) {
    const { s, m } = setup(deal);
    punchOnce(s); const g = punchOnce(s);
    assert(g.some((e) => e.type === 'hazard' && e.what === deal) && near(m.hp, 100 - dmg, 1e-9), deal + ' hurts ' + dmg + ' (' + m.hp + ')');
    assert(s.items.length === 0, deal + ' is spent');
  }
  // the e-bike battery: a fuse, then a blast that takes the neighbours
  {
    const { s, m, b, k } = setup('battery');
    punchOnce(s);
    const it = s.items[0];
    assert(it && it.lit, 'the battery is lit');
    const got = collect(s, IDLE, 1.3);
    assert(got.some((e) => e.type === 'boom'), 'it goes off after the fuse');
    assert(near(m.hp, 80, 1e-9), 'and hurts 20 if you stayed (' + m.hp + ')');
    const nb = City.cellAt(b, it.col + 1, it.row);
    if (nb >= 0) assert(b.state[nb] === S.BROKEN, 'the blast takes the next cell');
    // punching it early sets it off now
    const q = setup('battery');
    punchOnce(q.s); const g2 = punchOnce(q.s);
    assert(g2.some((e) => e.type === 'boom') && near(q.m.hp, 80, 1e-9), 'punching a lit battery is a bad idea');
    // walking away is fine
    const w = setup('battery');
    punchOnce(w.s); placeOnStreet(w.s, w.m, 1); run(w.s, IDLE, 1.5);
    assert(w.m.hp === 100, 'out of range of the blast');
  }
  // the air fryer: hot, then it dings and it is food
  {
    const { s, m } = setup('fryer');
    punchOnce(s); const g = punchOnce(s);
    assert(g.some((e) => e.type === 'hazard' && e.what === 'fryer') && near(m.hp, 90, 1e-9), 'the fryer burns while hot');
    const got = collect(s, IDLE, 2.2);
    assert(got.some((e) => e.type === 'ding'), 'it dings');
    const g2 = punchOnce(s);
    assert(g2.some((e) => e.type === 'eat' && e.what === 'toast') && near(m.hp, 98, 1e-9), 'then it is food');
  }
  // the livestreamer: eat inside the window or the ring light knocks you off
  {
    const { s, m } = setup('streamer');
    const b = s.city.buildings.reduce((a, x) => (x.floors > a.floors ? x : a));
    b.deal.fill('none');
    let kk = -1; for (let r = b.floors - 1; r >= 1 && kk < 0; r--) for (let c = 0; c < b.cols && kk < 0; c++) { const k2 = City.cellAt(b, c, r); if (b.cells[k2] === T.WINDOW) kk = k2; }   // the highest window (the top row can be a wall band)
    b.deal[kk] = 'streamer';
    placeAtCell(s, m, b, kk);
    punchOnce(s);
    const got = collect(s, IDLE, s.opts.streamerT + 0.1);
    assert(got.some((e) => e.type === 'flash') && got.some((e) => e.type === 'knockedOff'), 'the flash knocks you off');
    assert(m.st === 'fall' || m.st === 'street', 'you are falling');
    run(s, IDLE, 2);
    assert(m.hp < 100, 'and it hurt from that height (' + m.hp + ')');
  }
  // a soldier in a window fires until eaten
  {
    const { s, m } = setup('soldier');
    punchOnce(s);
    const got = collect(s, IDLE, 2.5);
    assert(got.filter((e) => e.type === 'shot' && e.from === 'window').length >= 2, 'the window soldier fires');
    assert(m.hp < 100, 'and it stings (' + m.hp + ')');
  }
  // a waver builds points while you hold the cell, then ducks
  {
    const { s, m } = setup('waver');
    punchOnce(s);
    const got = collect(s, IDLE, 5.5);
    assert(s.score >= C.POINTS.window + 1000 && got.some((e) => e.type === 'ducks'), 'the waver pays up to 1000 and ducks (' + s.score + ')');
    assert(s.items.length === 0, 'gone');
  }
  // the corridor: an exit for the player only, only with exits on
  {
    const { s, m } = setup('corridor', { exits: 1 });
    punchOnce(s); punchOnce(s);
    assert(s.exit === 'corridor', 'the corridor window is a way out');
    const q = setup('corridor', { exits: 0 });
    punchOnce(q.s); punchOnce(q.s);
    assert(!q.s.exit, 'not with exits off');
    void m;
  }
  // hazard scale
  {
    const { s, m } = setup('cactus', { hazardScale: 2 });
    punchOnce(s); punchOnce(s);
    assert(near(m.hp, 84, 1e-9), 'hazardScale doubles the sting');
  }
});

test('9: neon', () => {
  const s = pure({ seed: 2 });
  const m = P(s);
  let b = s.city.buildings.find((x) => x.neon);
  if (!b) { b = firstStanding(s); const row = b.floors - 2; b.cells[row * b.cols] = T.NEON; b.cells[row * b.cols + 1] = T.NEON; b.neon = { cells: [row * b.cols, row * b.cols + 1], period: 3, on: 0.6, phase: 0, dead: false }; }
  const k = b.neon.cells[0];
  placeAtCell(s, m, b, k);
  b.neon.lit = true; b.neon.phase = 0; s.t = 0.01;   // lit
  let g = punchOnce(s);
  assert(g.some((e) => e.type === 'neonShock') && near(m.hp, 85, 1e-9), 'punching a lit sign shocks');
  b.neon.lit = false; b.neon.on = 0; b.neon.phase = 0;
  g = punchOnce(s);
  assert(g.some((e) => e.type === 'neonOut') && s.score === C.POINTS.neon, 'punching it off pays 1000');
  assert(b.neon.cells.every((kk) => b.state[kk] === S.BROKEN) && b.neon.dead, 'the whole sign breaks');
  let cnt = 0;
  for (let seed = 1; seed <= 6; seed++) cnt += collect(pure({ seed }), IDLE, 12).filter((e) => e.type === 'neon').length;
  assert(cnt >= 4, 'signs blink on a schedule (' + cnt + ')');
});

test('10: soldiers', () => {
  const s = C.createGame({ seed: 8, exits: 0, enemies: 1, companions: 0 });
  const m = P(s);
  placeOnStreet(s, m, s.city.width / 2);
  s.timers.car = 1e9;
  C.launchWave(s, 'squad');
  const got = s.events.slice(); got.push(...collect(s, IDLE, 14));
  assert(got.some((e) => e.type === 'soldier'), 'a soldier arrives');
  const sol = s.soldiers[0];
  assert(sol && (sol.st === 'fire' || sol.st === 'kneel' || sol.st === 'leave'), 'walks up, kneels, fires his bursts, pulls back (' + (sol && sol.st) + ')');
  assert(got.some((e) => e.type === 'soldierLeave'), 'day one: two bursts and he pulls back');
  assert(got.filter((e) => e.type === 'shot' && e.from === 'soldier').length >= 3, 'and fires bursts');
  assert(m.hp < 100, 'bullets hurt (' + m.hp + ')');
  // punch him
  placeOnStreet(s, m, sol.x - 1);
  m.facing = 1;
  const g = punchOnce(s, { move: 1 });
  assert(g.some((e) => e.type === 'soldierDie' && e.how === 'punched'), 'a punch sends him flying');
  assert(s.score >= C.POINTS.soldier, 'soldier points');
  run(s, IDLE, 1.2);
  assert(!s.soldiers.includes(sol), 'and he is gone');
  // crushed under a collapse
  const b = firstStanding(s);
  s.soldiers.push({ id: 999, x: b.x0 + 1, y: 0, vx: 0, vy: 0, dir: 1, st: 'kneel', t: 0, stop: 6, shotT: 0, burstT: 0 });
  C.startCollapse(s, b, m);
  assert(s.events.some((e) => e.type === 'soldierDie' && e.how === 'crushed'), 'a soldier under a falling building is in the way');
  // cadence rises with the day
  const early = C.createGame({ seed: 8, day: 1, enemies: 1, companions: 0, exits: 0 }), late = C.createGame({ seed: 8, day: 9, enemies: 1, companions: 0, exits: 0 });
  const armed = (e) => e.type === 'soldier' || e.type === 'sniper';
  const ce = collect(early, IDLE, 240).filter(armed).length, cl = collect(late, IDLE, 240).filter(armed).length;
  assert(cl > ce, 'more soldiers by day 9 (' + ce + ' vs ' + cl + ')');
});

test('11: the armoured truck', () => {
  const s = C.createGame({ seed: 8, exits: 0, enemies: 1, companions: 0 });
  const m = P(s);
  placeOnStreet(s, m, s.city.width / 2);
  s.timers.car = 1e9; s.opts.armyDay = 99;
  C.launchWave(s, 'truck');
  const got = s.events.slice(); got.push(...collect(s, IDLE, 12));
  assert(got.some((e) => e.type === 'tank') && s.tank, 'the truck rolls in');
  assert(got.some((e) => e.type === 'tankFire'), 'and fires');
  const dist = Math.abs(s.tank.x - m.x);
  assert(dist >= C.TANK.stopMin - 0.5 && dist <= C.TANK.stopMax + 1.5, 'it keeps its distance (' + dist.toFixed(1) + ')');
  assert(m.hp < 100 || got.some((e) => e.type === 'shellGround'), 'shells land somewhere');
  // walk up and punch it twice
  const tk = s.tank;
  placeOnStreet(s, m, tk.x - 1.2); m.facing = 1; m.hp = 100; m.lane = 1; m.laneK = 1;   // the truck lives in the road lane
  punchOnce(s, { move: 1 });
  assert(tk.hp === 1, 'first punch dents it (from the road lane)');
  placeOnStreet(s, m, tk.x - 1.2); m.facing = 1; m.lane = 1; m.laneK = 1;
  const g2 = punchOnce(s, { move: 1 });
  assert(g2.some((e) => e.type === 'tankDie') && tk.st === 'wreck', 'second punch wrecks it');
  assert(s.score >= C.POINTS.tank, 'tank points');
  run(s, IDLE, C.TANK.wreckT + 0.2);
  assert(!s.tank, 'the wreck is cleared');
});

test('12: the drone', () => {
  const s = C.createGame({ seed: 8, exits: 0, enemies: 1, companions: 0 });
  const m = P(s);
  const b = firstStanding(s);
  placeOnFace(s, m, b, 1, Math.min(3, b.floors - 1));
  s.timers.car = 1e9; s.opts.armyDay = 99;
  C.launchWave(s, 'drone');
  const got = s.events.slice(); got.push(...collect(s, IDLE, 10));
  assert(got.some((e) => e.type === 'drone') && s.drone, 'the drone comes');
  assert(got.filter((e) => e.type === 'shot' && e.from === 'drone').length >= 3, 'and fires bursts');
  assert(Math.abs(s.drone.y - (m.y + 1.2)) < 1.2, 'it hovers at your height (' + s.drone.y.toFixed(1) + ' vs ' + m.y + ')');
  // swipe it when it drifts in
  s.drone.x = m.x + 1.2; s.drone.y = m.y + 1; s.drone.side = 1; s.drone.hover = 1.0; s.drone.sideT = 99;
  fresh(m);
  const g = punchOnce(s, { move: 1 });
  assert(g.some((e) => e.type === 'droneDie'), 'the swipe');
  assert(s.score >= C.POINTS.drone, 'drone points');
  run(s, IDLE, 3);
  assert(!s.drone, 'it crashed and cleared');
});

test('13: traffic', () => {
  const s = C.createGame({ seed: 8, exits: 0, enemies: 1, companions: 0 });
  const m = P(s);
  placeOnStreet(s, m, s.city.width / 2);
  s.opts.armyDay = 99; s.timers.car = 0.1;
  const got = [];
  run(s, IDLE, 5, (st) => { got.push(...st.events); return st.cars.length === 0; });
  assert(got.some((e) => e.type === 'car') && s.cars.length === 1, 'a car comes through');
  const c = s.cars[0];
  const x0 = c.x; run(s, IDLE, 0.8);
  assert(c.x !== x0, 'it moves');
  placeOnStreet(s, m, c.x + c.vx * 0.3); m.facing = c.vx > 0 ? -1 : 1;
  m.hp = 50;
  if (c.kind !== 'bot') { m.lane = 1; m.laneK = 1; }   // cars are punched from the road lane; the bot trundles the pavement
  const g = punchOnce(s, { move: m.facing });
  assert(g.some((e) => e.type === 'carWreck' && e.kind === c.kind), 'a punch wrecks it (' + c.kind + ')');
  assert(s.score >= C.CARS[c.kind].pts, 'car points');
  if (c.kind === 'bot') assert(m.hp === 54, 'the delivery bot had a burrito in it');
  // every kind through the street, none of them hurt
  const s2 = C.createGame({ seed: 3, exits: 0, enemies: 1, companions: 0 });
  placeOnStreet(s2, P(s2), 4);
  s2.opts.armyDay = 99;
  const kinds = new Set(collect(s2, IDLE, 360).filter((e) => e.type === 'car').map((e) => e.kind));
  assert(kinds.size >= 3 && P(s2).hp === 100, 'cruisers, taxis, hatchbacks, SUVs and bots pass; traffic is harmless (' + [...kinds].join(' ') + ')');
});

test('14: the revert, the walk-off, lives, game over', () => {
  const s = pure({ seed: 6, lives: 2 });
  const m = P(s);
  placeOnStreet(s, m, 6);
  C.damage(s, m, 100, 'test');
  assert(m.st === 'revert' && s.events.some((e) => e.type === 'revert'), 'zero health reverts');
  assert(s.events.some((e) => e.type === 'damage' && e.hp === 0), 'the damage event carries the health');
  assert(!C.damage(s, m, 5, 'test'), 'a reverted monster takes no more damage');
  run(s, IDLE, C.MON.REVERT_T + 0.05);
  assert(m.st === 'walkoff' && m.anim === 'walkoff', 'then the teenager walks off');
  let gone = null;
  run(s, IDLE, 30, (st) => { const e = events(st, 'gone')[0]; if (e) gone = e; return !gone; });
  assert(gone && gone.how === 'clockedOut' && m.lives === 1, 'clocking out costs a life');
  run(s, IDLE, s.opts.respawnT + 0.05);
  assert(m.st === 'arrive' && m.hp === 100, 'the next life drops in at full health');
  run(s, IDLE, 3, (st) => m.st !== 'street');
  assert(m.st === 'street' && m.y === 0, 'and lands');
  assert(m.invulnT > 0, 'briefly untouchable');
  run(s, IDLE, 3);
  m.invulnT = 0;
  C.damage(s, m, 100, 'test');
  run(s, IDLE, C.MON.REVERT_T + 30);
  assert(s.over && s.phase === 'over' && m.st === 'dead', 'the last life is game over');
  // eating the teenager
  const s2 = C.createGame({ seed: 6, exits: 0, enemies: 0, companions: 1, lives: 3 });
  const p = P(s2), q = s2.monsters[1];
  placeOnStreet(s2, p, 10); placeOnStreet(s2, q, 12);
  q.invulnT = 0;
  C.damage(s2, q, 100, 'test');
  run(s2, IDLE, C.MON.REVERT_T + 0.05);
  assert(q.st === 'walkoff', 'the companion reverted');
  q.x = 11.2; p.facing = 1; p.hp = 50;
  const g = punchOnce(s2, { move: 1 });
  assert(g.some((e) => e.type === 'eaten' && e.slug === q.slug), 'the teenager is dinner');
  assert(s2.score >= C.POINTS.teen && p.hp === 65, 'points and health for it');
  assert(q.st === 'gone', 'and the companion is gone for a while');
  run(s2, IDLE, s2.opts.cpuRespawnT + 3.5);
  assert((q.st === 'street' || q.st === 'climb') && q.hp > 0, 'companions always come back (' + q.st + ', hp ' + q.hp + ')');
});

test('15: an extra life', () => {
  const s = pure({ seed: 6, extraEvery: 1000 });
  const m = P(s);
  const b = firstStanding(s);
  b.deal.fill('none');
  const lives0 = m.lives;
  for (const bb of s.city.buildings) { if (s.score >= 1000) break; bb.deal.fill('none'); for (let k = 0; k < bb.cells.length && s.score < 1000; k++) { if (bb.cells[k] === T.WINDOW || bb.cells[k] === T.STORE) { placeAtCell(s, m, bb, k); punchOnce(s, Math.floor(k / bb.cols) === 0 ? { pdy: -1 } : undefined); } } }
  run(s, IDLE, 3);
  assert(m.lives > lives0 && m.lives - lives0 === Math.floor(s.score / 1000), 'a life at each gate (' + s.score + ' → +' + (m.lives - lives0) + ')');
});

test('16: the days', () => {
  const s = pure({ seed: 4, buildings: 3 });
  const m = P(s);
  m.hp = 60;
  for (const b of s.city.buildings) C.startCollapse(s, b, m);
  const got = collect(s, IDLE, Math.max(...s.city.buildings.map((b) => C.collapseDuration(s, b))) + 3.4);
  const de = got.find((e) => e.type === 'dayEnd');
  assert(de && de.day === 1 && de.bonus === C.POINTS.dayBase, 'the tally');
  assert(s.phase === 'map', 'then the map');
  C.skipMap(s);
  assert(s.day === 2 && s.city.name === City.cityDef(2)[0] && s.phase === 'play', 'skipping the map starts the next day');
  assert(m.st === 'street' && m.hp === 60, 'the monster keeps its health across days');
  assert(s.city.buildings.every((b) => !b.down) && s.items.length === 0, 'a fresh city');
  // the map plays out on its own too
  const s2 = pure({ seed: 4, buildings: 3 });
  for (const b of s2.city.buildings) C.startCollapse(s2, b, null);
  run(s2, IDLE, Math.max(...s2.city.buildings.map((b) => C.collapseDuration(s2, b))) + 3.3 + 3.6);
  assert(s2.day === 2, 'the map ends by itself');
  // day 57 is the wellness day
  const w = pure({ seed: 4, day: City.CITIES.length });
  assert(w.city.special === 'wellness', 'Plano');
});

test('17: companions', () => {
  const s = C.createGame({ seed: 13, exits: 0, enemies: 0, companions: 2, lives: 99 });
  assert(s.monsters.length === 3 && new Set(s.monsters.map((m) => m.slug)).size === 3, 'three different monsters');
  assert(s.monsters[1].cpu && s.monsters[2].cpu && !s.monsters[0].cpu, 'two of them computer-played');
  const got = collect(s, (st) => C.autopilot(st, P(st)), 90);
  const byCpu = got.filter((e) => e.type === 'cellBreak' && e.by && e.by !== P(s).slug).length;
  assert(byCpu > 20, 'companions wreck (' + byCpu + ' cells)');
  assert(s.monsters[1].score > 0 && s.monsters[2].score > 0, 'they keep their own score');
  // they go for your restaurant first
  const s2 = C.createGame({ seed: 13, exits: 0, enemies: 0, companions: 1, lives: 99 });
  const q = s2.monsters[1];
  run(s2, IDLE, 0.1);
  assert(q.ai.goal >= 0 && s2.city.buildings[q.ai.goal].restaurant === P(s2).slug, 'a companion heads for your brand first');
  // a companion next to you punches you
  const s3 = C.createGame({ seed: 13, exits: 0, enemies: 0, companions: 1, lives: 99 });
  const p3 = P(s3), q3 = s3.monsters[1];
  const b = firstStanding(s3);
  placeOnFace(s3, p3, b, 1, 2); placeOnFace(s3, q3, b, 2, 2); q3.ai.punchCd = 0;
  const hits = collect(s3, IDLE, 2).filter((e) => e.type === 'monsterHit' && e.who === p3.id);
  assert(hits.length >= 1 && p3.hp <= 92, 'a companion in reach punches you (' + p3.hp + ')');
  // and you can punch them
  placeOnFace(s3, p3, b, 1, 2); placeOnFace(s3, q3, b, 2, 2); q3.ai.punchCd = 99; q3.hp = 100; p3.hitT = 0; s3.opts.cpuIdle = 1;   // the rival stands still for it
  const g = punchOnce(s3, { pdx: 1, pdy: 0 });
  assert(g.some((e) => e.type === 'monsterHit' && e.who === q3.id) && q3.hp === 92, 'and they can be punched');
  assert(s.monsters.every((m) => Number.isFinite(m.x) && Number.isFinite(m.y)), 'nobody left the number line');
});

test('18: the ways out', () => {
  // the subway: stand over it and hold down
  let s = null;
  for (let seed = 1; seed < 40 && !s; seed++) { const q = C.createGame({ seed, exits: 1, enemies: 0, companions: 0 }); if (q.city.exits.subway != null) s = q; }
  assert(s, 'some city has a subway');
  const m = P(s);
  placeOnStreet(s, m, s.city.exits.subway);
  run(s, inp({ down: true }), 0.3);
  assert(!s.exit, 'a tap is not enough');
  run(s, inp({ down: true }), 0.4);
  assert(s.exit === 'subway' && s.events.some((e) => e.type === 'exit') || s.exit === 'subway', 'holding down over the subway leaves');
  // the blimp: from a roof, jump into it
  const s2 = C.createGame({ seed: 3, day: 3, exits: 1, enemies: 0, companions: 0 });
  assert(s2.city.exits.blimp, 'day 3 has the blimp');
  run(s2, IDLE, 21);
  assert(s2.blimp, 'it crosses after twenty seconds');
  const m2 = P(s2);
  const top = s2.city.buildings.reduce((a, b) => (b.floors > a.floors ? b : a));
  placeOnFace(s2, m2, top, 0, top.floors - 1);
  run(s2, inp({ up: true }), 1);
  assert(m2.st === 'roof', 'on the tallest roof');
  s2.blimp.x = m2.x;
  C.step(s2, inp({ jump: true }), DT);
  run(s2, IDLE, 1.5, (st) => !st.exit);
  assert(s2.exit === 'blimp', 'a jump into the blimp leaves');
  // exits off: nothing
  const s3 = C.createGame({ seed: 3, day: 3, exits: 0, enemies: 0, companions: 0 });
  run(s3, IDLE, 25);
  assert(!s3.blimp && s3.city.exits.subway == null, 'exits: 0 has no blimp and no subway');
});

test('19: the variety dial', () => {
  const f = (slug, v) => C.flavourFor(slug, v);
  assert(f('george', 0).punch === 1 && f('lizzie', 0).climb === 1 && f('ralph', 0).run === 1, 'flavour 0 = the cabinet, all equal');
  assert(f('george', 1).punch > f('lizzie', 1).punch && f('lizzie', 1).climb > f('ralph', 1).climb && f('ralph', 1).run > f('george', 1).run, 'each has an edge');
  const speeds = {};
  for (const slug of C.SLUGS) { const s = pure({ monster: slug, flavour: 1 }); const m = P(s); placeOnStreet(s, m, 5); run(s, inp({ move: 1 }), 1); speeds[slug] = m.x - 5; }
  assert(speeds.ralph > speeds.george && speeds.ralph > speeds.lizzie, 'the king runs fastest');
  const climbs = {};
  for (const slug of C.SLUGS) { const s = pure({ monster: slug, flavour: 1 }); const m = P(s); const b = firstStanding(s); placeOnFace(s, m, b, 1, 0); run(s, inp({ up: true }), 1); climbs[slug] = m.y; }
  assert(climbs.lizzie > climbs.george && climbs.lizzie > climbs.ralph, 'the girl climbs fastest');
  const punches = {};
  for (const slug of C.SLUGS) { const s = pure({ monster: slug, flavour: 1 }); const m = P(s); const b = firstStanding(s); b.deal.fill('none'); placeOnFace(s, m, b, 1, 1); punches[slug] = collect(s, inp({ punch: true }), 4).filter((e) => e.type === 'punch').length; }
  assert(punches.george >= punches.lizzie && punches.george >= punches.ralph, 'the clown punches fastest (' + JSON.stringify(punches) + ')');
});

test('20: the autopilot clears a small day', () => {
  const s = C.createGame({ seed: 17, exits: 0, enemies: 1, companions: 1, lives: 99, buildings: 3 });
  let cleared = false;
  run(s, (st) => C.autopilot(st, P(st)), 400, (st) => { if (st.day >= 2 || st.phase !== 'play') { cleared = true; return false; } });
  assert(cleared, 'the autopilot brings a three-building city down (t=' + s.t.toFixed(0) + ', standing ' + s.city.buildings.filter((b) => !b.down).length + ')');
});


test('23: round two — the lanes, the aimed punch, the smash, the run burst, the waves', () => {
  // the lanes: S steps into the road, W steps back; a punch from the face lane cannot reach a car, from the road it can
  let s = C.createGame({ seed: 5, exits: 0, enemies: 1, companions: 0 });
  s.opts.armyDay = 99; s.timers.car = 1e9;
  let m = P(s);
  placeOnStreet(s, m, firstStanding(s).x0 + 1.5);
  let g = collect(s, inp({ down: true }), 0.05); g.push(...collect(s, IDLE, 0.5));
  assert(m.lane === 1 && m.laneK === 1 && !m.laneMoving, 'S crosses to the road (lane ' + m.lane + ', k ' + m.laneK + ')');
  assert(g.some((e) => e.type === 'laneStart' && e.lane === 1) && g.some((e) => e.type === 'lane' && e.lane === 1), 'the crossing is announced and lands');
  g = collect(s, inp({ up: true }), 0.05); g.push(...collect(s, IDLE, 0.5));
  assert(m.lane === 0 && m.laneK === 0 && m.st === 'street', 'W steps back to the faces without grabbing (a tap)');
  run(s, inp({ up: true }), 0.4);
  assert(m.st === 'climb', 'W held at the faces grabs the building');
  // a car: punched from the road lane only
  placeOnStreet(s, m, 6); m.lane = 0; m.laneK = 0;
  s.cars.push({ id: 900, kind: 'taxi', x: 6.8, vx: 0, st: 'drive', t: 0 });
  g = punchOnce(s, { pdx: 1, pdy: 0 });
  assert(!g.some((e) => e.type === 'carWreck'), 'from the face lane the punch misses the taxi');
  m.lane = 1; m.laneK = 1;
  g = punchOnce(s, { pdx: 1, pdy: 0 });
  assert(g.some((e) => e.type === 'carWreck' && e.kind === 'taxi'), 'from the road it wrecks it');
  // bullets aimed at the other lane miss
  s = C.createGame({ seed: 5, exits: 0, enemies: 1, companions: 0 }); s.opts.armyDay = 99; s.timers.car = 1e9; m = P(s);
  placeOnStreet(s, m, 10); m.lane = 1; m.laneK = 1;
  s.bullets.push({ x: 10 - 2, y: 1, vx: 20, vy: 0, life: 1, dmg: 5, from: 'soldier', lane: 0 });
  run(s, IDLE, 0.5);
  assert(m.hp === 100, 'a bullet aimed at the face lane passes a monster in the road');
  s.bullets.push({ x: 10 - 2, y: 1, vx: 20, vy: 0, life: 1, dmg: 5, from: 'soldier', lane: 1 });
  run(s, IDLE, 0.5);
  assert(m.hp === 95, 'one aimed at the road hits (' + m.hp + ')');
  // bullets never stop you: walking into a burst keeps you walking
  s = C.createGame({ seed: 5, exits: 0, enemies: 1, companions: 0 }); s.opts.armyDay = 99; s.timers.car = 1e9; m = P(s);
  placeOnStreet(s, m, 6); m.invulnT = 0;
  for (let i = 0; i < 6; i++) s.bullets.push({ x: 8 + i * 0.3, y: 1, vx: -20, vy: 0, life: 1, dmg: 0.8, from: 'soldier', lane: 0 });
  const xb = m.x; run(s, inp({ move: 1 }), 0.5);
  assert(m.hp < 100 && m.x - xb > 2.5, 'shot six times and still walked forward (' + (m.x - xb).toFixed(2) + ' cells, hp ' + m.hp + ')');
  assert(m.hitT <= 0, 'a bullet never staggers');
  C.damage(s, m, 8, 'shell'); assert(m.hitT > 0, 'a shell does');
  // the truck rams a monster standing in the road
  s = C.createGame({ seed: 5, exits: 0, enemies: 1, companions: 0 }); s.opts.armyDay = 99; s.timers.car = 1e9; m = P(s);
  placeOnStreet(s, m, 8); m.lane = 1; m.laneK = 1; m.invulnT = 0;
  C.spawnTruck(s, 3); s.tank.stop = 0.2;
  g = collect(s, IDLE, 4);
  assert(g.some((e) => e.type === 'rammed' && e.by === 'truck') && m.hp < 100, 'the truck rams (' + m.hp + ')');
  // the 8-way punch on a face: every direction hits the right cell
  s = pure({ seed: 4 }); m = P(s);
  const b = s.city.buildings.find((bb) => bb.cols >= 3 && bb.floors >= 6);
  b.deal.fill('none');
  for (const [dx, dy] of [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]) {
    placeOnFace(s, m, b, 1, 2);
    const row = Math.floor(2 + C.monHand(s));
    const k = City.cellAt(b, 1 + dx, row + dy);
    if (k < 0 || b.cells[k] === T.NEON) continue;
    b.state[k] = S.INTACT; b.cells[k] = T.WINDOW;
    const before = b.broken;
    punchOnce(s, { pdx: dx, pdy: dy });
    assert(b.state[k] === S.BROKEN && b.broken === before + 1, 'punch ' + dx + ',' + dy + ' breaks the cell it aims at');
    assert(m.y === 2 && m.st === 'climb', 'and the monster does not move for it');
  }
  // the smash: Space on a face drops you and the landing takes what is under the fists
  s = C.createGame({ seed: 5, exits: 0, enemies: 1, companions: 0 }); s.opts.armyDay = 99; s.timers.car = 1e9; m = P(s);
  const bb = firstStanding(s);
  placeOnFace(s, m, bb, 1, 3);
  s.soldiers.push({ id: 901, x: bb.x0 + 1.5, y: 0, vx: 0, vy: 0, dir: 1, st: 'kneel', t: 0, stop: 6, shotT: 0, burstT: 0 });
  g = collect(s, inp({ jump: true }), 0.05);
  assert(m.st === 'fall' && m.smashing && g.some((e) => e.type === 'smash'), 'Space on a face starts the smash');
  g.push(...collect(s, IDLE, 2));
  assert(m.st === 'street' && !m.smashing, 'it lands');
  assert(g.some((e) => e.type === 'smashLand' && e.hit), 'the landing hits');
  assert(g.some((e) => e.type === 'soldierDie' && e.how === 'smashed'), 'the soldier under it is smashed');
  assert(m.hp === 100, 'three floors of smash are free (' + m.hp + ')');
  // the run burst: a double tap
  s = pure({ seed: 4 }); m = P(s);
  placeOnStreet(s, m, 5);
  const tapped = [];
  const tap = (dir) => { C.step(s, inp({ move: dir }), DT); tapped.push(...s.events); C.step(s, IDLE, DT); tapped.push(...s.events); };
  tap(1); const x0 = m.x; tap(1);
  assert(m.burstT > 0, 'two taps inside the window start a burst');
  g = tapped.concat(collect(s, inp({ move: 1 }), 0.4));
  const burstDist = m.x - x0;
  assert(g.some((e) => e.type === 'burst'), 'the burst is announced');
  run(s, IDLE, 0.6);
  assert(m.burstT === 0, 'and it ends on its own');
  placeOnStreet(s, m, 5); const x1 = m.x; run(s, inp({ move: 1 }), 0.4); const walkDist = m.x - x1;
  assert(burstDist > walkDist * 1.6, 'a burst covers more ground than a walk (' + burstDist.toFixed(2) + ' vs ' + walkDist.toFixed(2) + ')');
  // the army: day one waits for the clock AND ten broken cells; then waves with lulls; day nine adds kinds
  s = C.createGame({ seed: 8, exits: 0, enemies: 1, companions: 0 }); m = P(s);
  placeOnStreet(s, m, s.city.width / 2);
  let got = collect(s, IDLE, 60);
  assert(!got.some((e) => e.type === 'wave'), 'no wave in sixty quiet seconds on day one (nothing broken)');
  const b1 = firstStanding(s); b1.deal.fill('none');
  for (let k = 0; k < 12; k++) C.breakCell(s, b1, k, m, 'test');
  got = collect(s, IDLE, 2);
  assert(got.some((e) => e.type === 'wave' && e.kind === 'squad'), 'ten cells broken after the clock: the first wave, a squad');
  assert(s.soldiers.length === 2, 'day one: two soldiers');
  got = collect(s, IDLE, 40);
  assert(got.some((e) => e.type === 'lull'), 'the wave ends in a lull');
  const kindsSeen = new Set();
  const s9 = C.createGame({ seed: 8, day: 9, exits: 0, enemies: 1, companions: 0 });
  placeOnStreet(s9, P(s9), s9.city.width / 2);
  run(s9, IDLE, 240, (st) => { for (const e of st.events) if (e.type === 'wave') kindsSeen.add(e.kind); });
  assert(kindsSeen.size >= 3, 'day nine rolls at least three wave kinds (' + [...kindsSeen].join(' ') + ')');
  // the screamer is dealt a lot on day one, less later
  let d1 = 0, d9 = 0, n1 = 0, n9 = 0;
  for (const seed of [1, 2, 3, 4]) {
    const a = C.createGame({ seed, day: 1, exits: 0, enemies: 0, companions: 0 }), z = C.createGame({ seed, day: 9, exits: 0, enemies: 0, companions: 0 });
    for (const bb2 of a.city.buildings) for (let k = 0; k < bb2.cells.length; k++) if (bb2.cells[k] === T.WINDOW) { n1++; if (bb2.deal[k] === 'screamer') d1++; }
    for (const bb2 of z.city.buildings) for (let k = 0; k < bb2.cells.length; k++) if (bb2.cells[k] === T.WINDOW) { n9++; if (bb2.deal[k] === 'screamer') d9++; }
  }
  assert(d1 / n1 > 0.25 && d1 / n1 > d9 / n9, 'the screamer: ' + (100 * d1 / n1).toFixed(0) + '% of day-one windows, ' + (100 * d9 / n9).toFixed(0) + '% on day nine');
});

test('21: stress — many seeds, long runs, everyone playing, nothing goes wrong', () => {
  for (let seed = 30; seed < 38; seed++) {
    const s = C.createGame({ seed, day: 1 + (seed % 5), exits: 1, enemies: 1, companions: 2, lives: 99 });
    run(s, (st) => C.autopilot(st, P(st)), 150, (st) => {
      for (const m of st.monsters) {
        assert(Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.hp), 'finite monster');
        assert(m.x >= -3 && m.x <= st.city.width + 3, 'monster on the street (' + m.x + ')');
        assert(m.hp >= 0 && m.hp <= 100, 'hp in range');
        if (m.st === 'climb') { const b = st.city.buildings[m.b]; assert(b && m.col >= 0 && m.col < b.cols && m.y >= 0 && m.y <= b.floors - 1 + 1e-9, 'climbing inside the face'); }
      }
      assert(st.items.length < 400 && st.bullets.length < 200 && st.soldiers.length < 30 && st.cars.length < 20, 'lists stay bounded');
      if (st.exit) { st.exit = null; }   // the lab never leaves
    });
    assert(s.stats.cells > 50, 'seed ' + seed + ' wrecked (' + s.stats.cells + ' cells, ' + s.stats.buildings + ' buildings)');
  }
});

test('22: the summary', () => {
  const s = C.createGame({ seed: 1, companions: 2, exits: 0, enemies: 0 });
  const sum = C.summary(s);
  assert(sum.monsters.length === 3 && sum.total === s.city.buildings.length && sum.standing === sum.total && sum.city === 'Peoria', 'summary');
});

if (failures.length) { console.error(String.fromCharCode(10) + failures.length + ' FAILED:' + String.fromCharCode(10) + '  ' + failures.join(String.fromCharCode(10) + '  ')); process.exit(1); }
console.log('carnage sim: ' + passed + ' assertions passed');
