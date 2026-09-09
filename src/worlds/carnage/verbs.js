// Carnage — THE VERBS: everything a monster does, one entry each, for the Damage Lab. Plain facts and a
// `stage` that sets the situation up in the lab's city (the doing is yours: the keys are the game's).
// Loaded as a plain script by lab.html; tmp/carnage/notes.mjs imports it for the names.
// stage(ctx) gets { state, C, City, p (the player), front() → { b, k } the cell in front, standing() → a building,
//   place(x, y?) → put the player somewhere, deal(id) → put a thing behind the window in front and open it }.
(function () {
  'use strict';
  const V = [];
  const add = (o) => V.push(o);
  const G = { MOVING: 'moving', PUNCHING: 'punching', WINDOWS: 'the windows', STREET: 'the street', ENDS: 'the ends' };

  // ---- moving ----
  add({ id: 'walk', group: G.MOVING, name: 'Walk', facts: [['keys', 'A D or the arrows'], ['speed', '6 cells a second (the king +30% with variety up)'], ['note', 'a punch slows you to a third while it swings']], stage: (c) => c.place(c.state.city.buildings[0].x0 - 1.5) });
  add({ id: 'climb', group: G.MOVING, name: 'Climb', facts: [['keys', 'W in front of a building grabs it; W S move up and down the face'], ['speed', '3.2 floors a second (the girl +35% with variety up)'], ['note', 'you climb with your back to us, like the cabinet']], stage: (c) => c.place(c.state.city.buildings[0].x0 + 1.5) });
  add({ id: 'sideways', group: G.MOVING, name: 'Sideways on a face', facts: [['keys', 'A D while climbing steps one column'], ['edge', 'stepping off the side of a building lets go — a fall'], ['bottom', 'at the ground, S or a sideways step puts you on the street']], stage: (c) => { const b = c.standing(); c.face(b, 1, 2); } });
  add({ id: 'hang', group: G.MOVING, name: 'Hang', facts: [['what', 'stop climbing and you hang there'], ['note', 'a hanging monster is a soldier\'s favourite target']], stage: (c) => { const b = c.standing(); c.face(b, 1, 3); } });
  add({ id: 'jump', group: G.MOVING, name: 'Jump', facts: [['keys', 'Space on the street or a roof'], ['height', 'about 1.3 floors'], ['catch', 'W in the air catches a building on the way']], stage: (c) => c.place(c.state.city.buildings[0].x0 - 2) });
  add({ id: 'letgo', group: G.MOVING, name: 'Let go', facts: [['keys', 'Space while climbing'], ['what', 'a fall from where you were — free under two floors']], stage: (c) => { const b = c.standing(); c.face(b, 1, 1.5); } });
  add({ id: 'roof', group: G.MOVING, name: 'The roof', facts: [['keys', 'W past the top hoists you onto the roof; S climbs back down'], ['what', 'walk the roof, jump from it (the blimp is up there some days)'], ['edge', 'walking off drops you the whole height']], stage: (c) => { const b = c.standing(); c.face(b, 1, b.floors - 1.2); } });
  add({ id: 'fallshort', group: G.MOVING, name: 'A short fall', facts: [['rule', 'two floors are free'], ['note', 'climbing down is always free']], stage: (c) => { const b = c.standing(); c.face(b, 1, 1.8); } });
  add({ id: 'fallhard', group: G.MOVING, name: 'A long fall', facts: [['rule', '8 health per floor past two (a dial)'], ['collapse', 'a building coming down under you is a fall from wherever you were'], ['note', 'the dust puffs and the thud scale with the height']], stage: (c) => { const b = c.standing(); c.face(b, 1, b.floors - 1); } });

  // ---- punching ----
  add({ id: 'window', group: G.PUNCHING, name: 'Punch a window', facts: [['keys', 'J or click; hold to keep punching'], ['aim', 'W S A D held with the punch aims a cell up, down or sideways'], ['one punch', 'a window breaks in one; 25 points; what was behind it appears']], stage: (c) => { const f = c.front(); if (f) { f.b.state[f.k] = 0; f.b.deal[f.k] = 'none'; c.refresh(f.b); } } });
  add({ id: 'wall', group: G.PUNCHING, name: 'Punch a wall', facts: [['two punches', 'cracks, then a hole; 50 points'], ['note', 'a hole in a wall counts toward the collapse like a window']], stage: (c) => c.wallFront() });
  add({ id: 'neonoff', group: G.PUNCHING, name: 'A neon sign, off', facts: [['what', 'signs blink on a schedule; punch one while it is OFF'], ['points', '1000, the whole sign goes'], ['note', 'signs sit two floors under the roof on the taller buildings']], stage: (c) => c.neon(false) });
  add({ id: 'neonon', group: G.PUNCHING, name: 'A neon sign, on', facts: [['what', 'punch it while it is ON'], ['cost', '15 health, sparks, the sign stays']], stage: (c) => c.neon(true) });
  add({ id: 'store', group: G.PUNCHING, name: 'A storefront', facts: [['what', 'the ground floor of one of the three restaurants'], ['rule', 'every street has one of each brand; yours pays nothing when it comes down, a rival\'s pays 2500'], ['note', 'the companions go for YOUR brand first']], stage: (c) => { const b = c.state.city.buildings.find((x) => x.restaurant && x.restaurant !== c.p.slug); if (b) c.place(b.x0 + 1.5); } });
  add({ id: 'rival', group: G.PUNCHING, name: 'Punch a rival', facts: [['reach', 'a monster within a cell and a bit, in the direction you face'], ['hit', '8 health, a flinch'], ['note', 'they punch back on their own clock']], stage: (c) => c.rivalNext() });
  add({ id: 'punched', group: G.PUNCHING, name: 'Get punched', facts: [['what', 'a companion next to you swings every 7–12 s'], ['hit', '8 health, a flinch, you cannot act for 0.4 s']], stage: (c) => c.rivalNext(true) });

  // ---- the windows ----
  const deal = (id, name, facts) => add({ id, group: G.WINDOWS, name, facts, stage: (c) => c.deal(id) });
  deal('customer', 'A customer', [['eat', 'punch the open window again: 500 points, +12 health'], ['note', 'five stars']]);
  deal('worker', 'A remote worker', [['eat', '500 points, +12 health'], ['note', 'still on mute']]);
  deal('waver', 'A waver', [['hold', 'stay on the cell: 50 points every quarter second up to 1000, then he ducks'], ['eat', 'punch him any time: 500, +12']]);
  deal('zombie', 'A phone zombie', [['eat', '500, +12'], ['note', 'never looked up']]);
  deal('fries', 'Fries', [['eat', '100 points, +8 health']]);
  deal('shake', 'A shake', [['eat', '100, +8'], ['note', 'the machine worked today']]);
  deal('nuggets', 'Nuggets', [['eat', '100, +8']]);
  deal('patty', 'A square patty', [['eat', '100, +8']]);
  deal('cake', 'A birthday cake', [['eat', '150, +10']]);
  deal('crown', 'A paper crown', [['take', '250 points, no health']]);
  deal('cash', 'Cash', [['take', '500']]);
  deal('crypto', 'Crypto', [['take', '2500 — worthless by Friday, but the counter does not know']]);
  deal('battery', 'An e-bike battery', [['fuse', '1.2 s after the window opens, it goes'], ['blast', '20 health to anyone within a cell, and the four cells around it break'], ['punch', 'punching it sets it off now']]);
  deal('fryer', 'An air fryer', [['hot', 'punching it while hot: 10 health'], ['ding', 'after 2 s it dings and it is toast: 100 points, +8']]);
  deal('peloton', 'A live exercise bike', [['punch', '15 health, sparks; then it is spent']]);
  deal('cactus', 'A cactus', [['punch', '8 health']]);
  deal('vape', 'A vape', [['punch', '5 health and a cough']]);
  deal('smoothie', 'A wellness smoothie', [['punch', '12 health']]);
  deal('streamer', 'A livestreamer', [['eat', 'inside 1.5 s (a dial): 300, +12'], ['flash', 'or the ring light goes off and knocks you off the building'], ['note', 'four viewers']]);
  deal('soldierwin', 'A soldier in the window', [['fires', 'every 0.9 s at the nearest monster'], ['eat', 'punch him: 50, +5']]);
  deal('supplement', 'A mega supplement', [['where', 'Plano, the wellness day, two windows'], ['eat', 'full health and 5000 points']]);
  deal('corridor', 'A corridor of light', [['what', 'one window a city is not a room'], ['punch', 'open it, then punch again to climb in — a way out of the world (the lab never leaves)']]);

  // ---- the street ----
  add({ id: 'soldier', group: G.STREET, name: 'A soldier', facts: [['comes', 'walks in from an edge, stops 5–8 cells off, kneels, fires bursts with spread'], ['hit', '0.8 health a bullet'], ['punch', 'from the street, within reach ahead: he flies; 50 points'], ['cap', 'two at once on day one, up to five by day nine']], stage: (c) => { c.state.timers.soldier = 0; c.place(c.p.x); } });
  add({ id: 'crushed', group: G.STREET, name: 'In the way', facts: [['what', 'a soldier under a building that comes down'], ['points', '25, the copy says IN THE WAY']], stage: (c) => { const b = c.standing(); c.state.soldiers.push({ id: c.state.nextId++, x: b.x0 + 1, y: 0, vx: 0, vy: 0, dir: 1, st: 'kneel', t: 0, stop: 6, shotT: 0, burstT: 0 }); c.place(b.x0 + b.cols + 1); } });
  add({ id: 'tank', group: G.STREET, name: 'The SWAT truck', facts: [['comes', 'rolls in from the far side, keeps 9–12 cells off, backs away if you close in'], ['fires', 'a lobbed shell every 3.5 s; 8 health on a hit'], ['punch', 'two punches from the street; 200 points, then a wreck for 3 s']], stage: (c) => { c.state.tank = null; c.state.timers.tank = 0; } });
  add({ id: 'drone', group: G.STREET, name: 'The drone', facts: [['comes', 'hovers 2–3 cells to one side at your height, sways, switches sides'], ['fires', 'bursts of three; 2 health each'], ['swipe', 'when it drifts within a fist\'s reach: 750 points, it falls']], stage: (c) => { c.state.drone = null; c.state.timers.drone = 0; } });
  add({ id: 'cruiser', group: G.STREET, name: 'A police cruiser', facts: [['what', 'drives through with the lights on, harmless'], ['punch', '150 points, a wreck']], stage: (c) => c.car('cruiser') });
  add({ id: 'taxi', group: G.STREET, name: 'A taxi', facts: [['punch', '100 points']], stage: (c) => c.car('taxi') });
  add({ id: 'bot', group: G.STREET, name: 'A delivery robot', facts: [['what', 'trundles along the pavement'], ['punch', '50 points and +4 health: the burrito was yours anyway']], stage: (c) => c.car('bot') });
  add({ id: 'subway', group: G.STREET, name: 'The subway', facts: [['where', 'a stairwell in a gap on half the streets'], ['do', 'stand over it and hold S for 0.6 s — a way out (the lab never leaves)']], stage: (c) => { const x = c.state.city.exits.subway; if (x != null) c.place(x); } });
  add({ id: 'blimp', group: G.STREET, name: 'The blimp', facts: [['when', 'every third day, twenty seconds in, crossing above the tallest roof'], ['do', 'jump into it from a roof — a way out (the lab never leaves)']], stage: (c) => { const top = c.state.city.buildings.reduce((a, b) => (b.floors > a.floors ? b : a)); c.state.blimpT = 0.1; c.state.blimp = null; c.face(top, 1, top.floors - 1.2); } });

  // ---- the ends ----
  add({ id: 'collapse', group: G.ENDS, name: 'A collapse', facts: [['rule', 'a building comes down when 55–65% of its cells are broken (bigger needs more; a dial scales it)'], ['then', 'floors pancake over 1.9 s: debris, dust, glass, one low thud'], ['points', '1000 + 100 a floor; a rival restaurant +2500; your own restaurant 0']], stage: (c) => { const f = c.front(); const b = f ? f.b : c.standing(); c.nearThreshold(b); } });
  add({ id: 'collapsefall', group: G.ENDS, name: 'On it when it goes', facts: [['what', 'anyone on a collapsing building falls from where they were'], ['note', 'the fall hurts by the usual rule']], stage: (c) => { const b = c.standing(); c.nearThreshold(b); c.face(b, 0, b.floors - 1); } });
  add({ id: 'revert', group: G.ENDS, name: 'The revert', facts: [['at zero', 'the monster shrinks (1.6 s) into a tired teenager in the same uniform'], ['then', 'the teen walks to the nearest edge to clock out; that is the life'], ['next', 'three seconds later the next life drops in from the sky, full health, a short shield']], stage: (c) => { c.p.invulnT = 0; c.C.damage(c.state, c.p, 100, 'lab'); } });
  add({ id: 'eaten', group: G.ENDS, name: 'Eat the teenager', facts: [['what', 'a reverted rival walking past is dinner: 1000 points, +15 health'], ['note', 'employee of the month']], stage: (c) => c.rivalRevert() });
  add({ id: 'dayend', group: G.ENDS, name: 'The day ends', facts: [['when', 'every building is down'], ['then', 'the tally (500 × the day), the map, the next city'], ['note', 'health carries over; the city is fresh']], stage: (c) => { for (const b of c.state.city.buildings) if (!b.down) c.C.startCollapse(c.state, b, c.p); } });
  add({ id: 'extra', group: G.ENDS, name: 'An extra life', facts: [['gate', 'every 25,000 points'], ['note', 'the plate says ANOTHER SHIFT']], stage: (c) => { c.state.nextExtra = c.state.score + 500; } });

  globalThis.CARNAGE_VERBS = { VERBS: V, byId: Object.fromEntries(V.map((v) => [v.id, v])), GROUPS: Object.values(G) };
})();
