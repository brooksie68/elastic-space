// Carnage — the cities. Pure: no DOM, no timers, no Math.random (the rng is handed in by the core).
//
// A city is a row of buildings, each a grid of cells (window / wall / neon / storefront), with what is
// behind every window dealt from a seeded table that gets meaner with the day. It is 2026: the things
// in the windows are remote workers, phone zombies, air fryers, e-bike batteries and livestreamers.
// Shared verbatim with tmp/carnage/sim.mjs — keep it pure or the sim lies.
(function () {
  'use strict';

  // ---- the road trip: one city a day, a loop that starts in Peoria and ends on Plano's wellness day ----
  // [name, state, lat, lon, flags] — flags: water (a waterfront day), night (forced), tag (the line on the
  // day card), special ('wellness' = the supplement deal). Night otherwise alternates by day.
  const CITIES = [
    ['Peoria', 'IL', 40.69, -89.59, { tag: 'Will it play here.' }],
    ['Chicago', 'IL', 41.88, -87.63, { water: 1, tag: 'Deep dish. Deep debt.' }],
    ['Milwaukee', 'WI', 43.04, -87.91, { water: 1, tag: 'Beer, cheese, and the third shift.' }],
    ['Detroit', 'MI', 42.33, -83.05, { tag: 'Already renovating.' }],
    ['Cleveland', 'OH', 41.5, -81.69, { water: 1, tag: 'The river is not on fire. Yet.' }],
    ['Pittsburgh', 'PA', 40.44, -79.99, { tag: 'Four hundred bridges, one tow truck.' }],
    ['Buffalo', 'NY', 42.89, -78.88, { water: 1, tag: 'Wings, snow, disappointment.' }],
    ['Boston', 'MA', 42.36, -71.06, { water: 1, tag: 'Wicked.' }],
    ['Providence', 'RI', 41.82, -71.41, { tag: 'Divinely named. Mortally parked.' }],
    ['Hartford', 'CT', 41.76, -72.69, { tag: 'Insured against everything but this.' }],
    ['New York', 'NY', 40.71, -74.01, { water: 1, night: 1, tag: 'The city that never sleeps. It is very tired.' }],
    ['Newark', 'NJ', 40.74, -74.17, { tag: 'Where your flight actually lands.' }],
    ['Philadelphia', 'PA', 39.95, -75.17, { tag: 'Booing since 1776.' }],
    ['Baltimore', 'MD', 39.29, -76.61, { water: 1, tag: 'Charm City. Some assembly required.' }],
    ['Washington', 'DC', 38.91, -77.04, { night: 1, tag: 'Nobody here is responsible for this.' }],
    ['Richmond', 'VA', 37.54, -77.44, { tag: 'A river runs through the permit process.' }],
    ['Raleigh', 'NC', 35.78, -78.64, { tag: 'Research Triangle. Third angle pending.' }],
    ['Charlotte', 'NC', 35.23, -80.84, { tag: 'Every bank you have ever hated.' }],
    ['Atlanta', 'GA', 33.75, -84.39, { night: 1, tag: 'Traffic. It moved, once.' }],
    ['Jacksonville', 'FL', 30.33, -81.66, { water: 1, tag: 'Biggest city by land, if you count the parking.' }],
    ['Orlando', 'FL', 28.54, -81.38, { tag: 'Fun. Mandatory.' }],
    ['Miami', 'FL', 25.76, -80.19, { water: 1, night: 1, tag: 'Two feet above sea level and rising nowhere.' }],
    ['Tampa', 'FL', 27.95, -82.46, { water: 1, tag: 'Retirement, but louder.' }],
    ['Birmingham', 'AL', 33.52, -86.81, { tag: 'Still magic. Mostly.' }],
    ['Nashville', 'TN', 36.16, -86.78, { night: 1, tag: 'Every third building is a bachelorette.' }],
    ['Memphis', 'TN', 35.15, -90.05, { water: 1, tag: 'Barbecue, and a river that means it.' }],
    ['New Orleans', 'LA', 29.95, -90.07, { water: 1, night: 1, tag: 'Below sea level. Above the law.' }],
    ['Houston', 'TX', 29.76, -95.37, { tag: 'We have a problem.' }],
    ['San Antonio', 'TX', 29.42, -98.49, { tag: 'Remember the parking garage.' }],
    ['Austin', 'TX', 30.27, -97.74, { night: 1, tag: 'Keep it weird. Keep it billable.' }],
    ['Dallas', 'TX', 32.78, -96.8, { tag: 'Big money. Somebody else\'s.' }],
    ['Oklahoma City', 'OK', 35.47, -97.52, { tag: 'The wind comes sweeping. So do we.' }],
    ['Kansas City', 'MO', 39.1, -94.58, { tag: 'Barbecue, fountains, insurance. Pick one.' }],
    ['St. Louis', 'MO', 38.63, -90.2, { water: 1, tag: 'The arch gets a pass.' }],
    ['Omaha', 'NE', 41.26, -95.94, { tag: 'The oracle did not see this coming.' }],
    ['Minneapolis', 'MN', 44.98, -93.27, { water: 1, tag: 'Forty below. Still cheerful.' }],
    ['Denver', 'CO', 39.74, -104.99, { tag: 'A mile high. The rent, too.' }],
    ['Salt Lake City', 'UT', 40.76, -111.89, { tag: 'Clean streets. Not for long.' }],
    ['Phoenix', 'AZ', 33.45, -112.07, { tag: 'A dry heat. A dry riot.' }],
    ['Las Vegas', 'NV', 36.17, -115.14, { night: 1, tag: 'What happens here is on camera.' }],
    ['Los Angeles', 'CA', 34.05, -118.24, { water: 1, night: 1, tag: 'Everyone here has a script about this.' }],
    ['San Diego', 'CA', 32.72, -117.16, { water: 1, tag: 'Nice weather for it.' }],
    ['San Francisco', 'CA', 37.77, -122.42, { water: 1, tag: 'Disrupting. Being disrupted.' }],
    ['Sacramento', 'CA', 38.58, -121.49, { tag: 'A capital. The state\'s, anyway.' }],
    ['Portland', 'OR', 45.52, -122.68, { water: 1, tag: 'Weird is a franchise now.' }],
    ['Seattle', 'WA', 47.61, -122.33, { water: 1, night: 1, tag: 'Coffee, rain, a rocket to nowhere.' }],
    ['Boise', 'ID', 43.62, -116.2, { tag: 'Potatoes. Servers. Us.' }],
    ['Albuquerque', 'NM', 35.08, -106.65, { tag: 'Breaking everything.' }],
    ['El Paso', 'TX', 31.76, -106.49, { tag: 'The end of the road. The other end.' }],
    ['Tulsa', 'OK', 36.15, -95.99, { tag: 'Oil money, art deco, dust.' }],
    ['Little Rock', 'AR', 34.75, -92.29, { tag: 'Little. Rocked.' }],
    ['Louisville', 'KY', 38.25, -85.76, { tag: 'Bourbon, and a fast horse out of town.' }],
    ['Indianapolis', 'IN', 39.77, -86.16, { tag: 'Five hundred miles of this.' }],
    ['Columbus', 'OH', 39.96, -83.0, { tag: 'The test market.' }],
    ['Cincinnati', 'OH', 39.1, -84.51, { tag: 'Chili on spaghetti. This is on you.' }],
    ['Plano', 'TX', 33.02, -96.7, { special: 'wellness', tag: 'The wellness day. A clinic is handing out supplements.' }],
  ];

  // ---- building families (the renderer maps these to tiles + room lights) ----
  // pattern: which columns are wall cells (1) vs window cells (0), repeating; every family also has a wall
  // row now and then (a spandrel band) so no face is a flat sheet of glass unless it is the glass tower.
  const FAMILIES = [
    { id: 'brick_red', pattern: [0, 0, 1], band: 0, minFloors: 4, maxFloors: 9 },
    { id: 'brick_tan', pattern: [0, 1, 0, 0], band: 5, minFloors: 4, maxFloors: 10 },
    { id: 'concrete', pattern: [0, 0, 1, 0], band: 4, minFloors: 6, maxFloors: 14 },
    { id: 'stucco', pattern: [0, 1], band: 0, minFloors: 3, maxFloors: 7 },
    { id: 'steel', pattern: [0, 0, 0, 1], band: 6, minFloors: 5, maxFloors: 12 },
    { id: 'glass', pattern: [0], band: 0, minFloors: 8, maxFloors: 16 },
  ];

  // cell types
  const T = { WINDOW: 0, WALL: 1, NEON: 2, STORE: 3 };
  // cell states
  const S = { INTACT: 0, CRACKED: 1, BROKEN: 2 };

  // ---- what is behind a window: the deal table, weights by day ----
  // kind: person | food | money | hazard | special. The core knows what each id does.
  const DEALS = {
    none: { kind: 'none', w: (d) => 34 },
    customer: { kind: 'person', w: (d) => 8 },
    worker: { kind: 'person', w: (d) => 5 },
    waver: { kind: 'person', w: (d) => 3 },
    zombie: { kind: 'person', w: (d) => 3 },
    fries: { kind: 'food', w: (d) => 4 },
    shake: { kind: 'food', w: (d) => 3 },
    nuggets: { kind: 'food', w: (d) => 3 },
    patty: { kind: 'food', w: (d) => 3 },
    cake: { kind: 'food', w: (d) => 2 },
    crown: { kind: 'money', w: (d) => 2 },
    cash: { kind: 'money', w: (d) => 4 },
    crypto: { kind: 'money', w: (d) => 1 },
    battery: { kind: 'hazard', w: (d) => 3 + d * 0.5 },
    fryer: { kind: 'hazard', w: (d) => 3 },
    peloton: { kind: 'hazard', w: (d) => 2 + d * 0.3 },
    cactus: { kind: 'hazard', w: (d) => 2 },
    vape: { kind: 'hazard', w: (d) => 2 },
    smoothie: { kind: 'hazard', w: (d) => 2 },
    streamer: { kind: 'hazard', w: (d) => 3 + d * 0.4 },
    soldier: { kind: 'hazard', w: (d) => (d >= 2 ? 2 + d * 0.5 : 0) },
  };
  const DEAL_IDS = Object.keys(DEALS);

  function pickDeal(rng, day) {
    let total = 0;
    for (const id of DEAL_IDS) total += DEALS[id].w(day);
    let r = rng() * total;
    for (const id of DEAL_IDS) { r -= DEALS[id].w(day); if (r <= 0) return id; }
    return 'none';
  }

  // ---- the city ----
  // opts: { exits: 1|0, buildings?, minFloors?, maxFloors? } — the day sets the defaults.
  function makeCity(rng, day, opts) {
    opts = opts || {};
    const def = CITIES[(day - 1) % CITIES.length];
    const flags = def[4] || {};
    const night = flags.night ? true : (day % 2 === 0);
    const count = opts.buildings || Math.min(12, 6 + Math.floor(day / 2));
    const familyPool = pickFamilies(rng);
    const buildings = [];
    let x = 2 + Math.floor(rng() * 2);
    // restaurants: one of each brand, on three different buildings with room for a storefront
    const brands = ['george', 'lizzie', 'ralph'];
    const slots = shuffle(rng, range(count)).slice(0, 3);
    for (let i = 0; i < count; i++) {
      const fam = familyPool[Math.floor(rng() * familyPool.length)];
      const F = FAMILIES[fam];
      const grow = Math.min(8, day - 1);
      const floors = clampi(F.minFloors + Math.floor(rng() * (F.maxFloors - F.minFloors + 1 + grow)), 3, opts.maxFloors || 16);
      const cols = 3 + Math.floor(rng() * 5);   // 3–7
      const b = {
        id: i, x0: x, cols, floors, family: fam,
        cells: new Uint8Array(cols * floors),    // types
        state: new Uint8Array(cols * floors),    // 0 intact, 1 cracked, 2 broken
        deal: new Array(cols * floors).fill('none'),
        restaurant: null,
        broken: 0, punchable: 0,
        threshold: 0,
        collapsing: false, down: false, dropT: 0,
        neon: null,                              // { cells: [i...], period, on, phase }
        hp: 0,
      };
      // cells
      for (let r = 0; r < floors; r++) {
        const bandRow = F.band > 0 && r > 0 && r % F.band === 0;
        for (let c = 0; c < cols; c++) {
          let t = F.pattern[c % F.pattern.length] ? T.WALL : T.WINDOW;
          if (bandRow) t = T.WALL;
          if (r === 0 && t === T.WALL && c === Math.floor(cols / 2)) t = T.WINDOW;   // a door
          b.cells[r * cols + c] = t;
        }
      }
      // a restaurant: the whole ground floor is the storefront
      const slot = slots.indexOf(i);
      if (slot >= 0) {
        b.restaurant = brands[slot];
        for (let c = 0; c < cols; c++) b.cells[c] = T.STORE;
      }
      // a neon sign on a tall enough building, high up, two or three cells wide
      if (floors >= 6 && rng() < 0.45) {
        const row = floors - 2;
        const w = Math.min(cols, 2 + Math.floor(rng() * 2));
        const c0 = Math.floor(rng() * (cols - w + 1));
        const cellsIdx = [];
        for (let c = c0; c < c0 + w; c++) { b.cells[row * cols + c] = T.NEON; cellsIdx.push(row * cols + c); }
        b.neon = { cells: cellsIdx, period: 3.2 + rng() * 1.6, on: 0.62, phase: rng(), dead: false };
      }
      // the deals: every window (and storefront) gets one
      for (let k = 0; k < b.cells.length; k++) {
        if (b.cells[k] === T.WINDOW || b.cells[k] === T.STORE) b.deal[k] = pickDeal(rng, day);
      }
      if (flags.special === 'wellness') {
        // the supplement: two windows on the day, always
        for (let n = 0; n < 2; n++) { const k = Math.floor(rng() * b.cells.length); if (b.cells[k] === T.WINDOW) b.deal[k] = 'supplement'; }
      }
      b.punchable = b.cells.length;
      b.threshold = 0.55 + 0.1 * Math.max(0, Math.min(1, (b.cells.length - 20) / 60));
      buildings.push(b);
      x += cols + 1 + Math.floor(rng() * 2);
    }
    const width = x + 2;
    // the ways out that live in the city: a subway entrance in a gap (half the cities), one window
    // whose room is not a room (a corridor of light), the blimp every third day
    const exits = opts.exits === 0 ? {} : {
      subway: rng() < 0.5 ? gapX(rng, buildings) : null,
      corridor: (function () {
        const cands = buildings.filter((b) => !b.restaurant && b.floors >= 4);
        if (!cands.length) return null;
        const b = cands[Math.floor(rng() * cands.length)];
        let tries = 40;
        while (tries-- > 0) {
          const k = Math.floor(rng() * b.cells.length);
          if (b.cells[k] === T.WINDOW && Math.floor(k / b.cols) >= 1) { b.deal[k] = 'corridor'; return { b: b.id, k }; }
        }
        return null;
      })(),
      blimp: day % 3 === 0,
    };
    return {
      day, name: def[0], state: def[1], lat: def[2], lon: def[3], tag: flags.tag || '', night, water: !!flags.water,
      special: flags.special || null, buildings, width, exits,
      spawnX: Math.min(width - 3, buildings[0].x0 + 1),
    };
  }

  function pickFamilies(rng) {
    const all = range(FAMILIES.length);
    const picked = shuffle(rng, all).slice(0, 3);
    // the pool weights: repeat the first pick so a city has a look
    return [picked[0], picked[0], picked[1], picked[2]];
  }
  function gapX(rng, buildings) {
    if (buildings.length < 2) return null;
    const i = 1 + Math.floor(rng() * (buildings.length - 1));
    const a = buildings[i - 1], b = buildings[i];
    return (a.x0 + a.cols + b.x0) / 2;
  }
  function range(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a; }
  function shuffle(rng, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clampi(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---- helpers the core and the renderer share ----
  function cellAt(b, col, row) { return (col < 0 || row < 0 || col >= b.cols || row >= b.floors) ? -1 : row * b.cols + col; }
  function buildingAt(city, x) {
    for (const b of city.buildings) if (x >= b.x0 && x < b.x0 + b.cols) return b;
    return null;
  }
  function cityDef(day) { return CITIES[(day - 1) % CITIES.length]; }

  globalThis.CarnageCity = { CITIES, FAMILIES, DEALS, DEAL_IDS, T, S, makeCity, cellAt, buildingAt, cityDef, pickDeal };
})();
