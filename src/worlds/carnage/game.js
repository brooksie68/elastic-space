// Carnage — the shell: the loading gate, the attract demo behind the start card, the game loop, input,
// the HUD, the plate (one cynical line at a time), the day tally and the map between days, the
// configuration panel with file-backed presets, sound hooks, the ways out.
// Rules live in game-core.js and city.js; the picture in render3d.js; the sounds in sound.js.
import { createRenderer, LOOK_DEFAULTS, CELL } from './render3d.js';

const Core = globalThis.CarnageCore, City = globalThis.CarnageCity, Icons = globalThis.CarnageIcons;
const Sfx = globalThis.CarnageSfx || { play() {}, start() {}, stop() {}, setVolume() {}, voice() {}, bed() {}, setDrone() {}, setSiren() {}, setDust() {}, setNight() {}, setMusic() {} };

const PLAY_KEY = 'carnage-play-v1';
const LOOK_KEY = 'carnage-look-v1';
const UI_KEY = 'carnage-ui-v1';
const MODE_KEY = 'carnage-mode-v1';
const PLAY_DEFAULTS = { lives: 3, flavour: 0.6, thresholdScale: 1, fallDmg: 8, spawnScale: 1, hazardScale: 1, streamerT: 1.5, dealShift: 0, day: 1, seed: '' };
const LOOK_RANGES = {
  viewCells: { label: 'How wide the picture is (cells)', min: 16, max: 40, step: 1 },
  pitch: { label: 'Camera tilt', min: 0, max: 14, step: 0.5 },
  camEase: { label: 'Camera follow', min: 0.5, max: 4, step: 0.1 },
  lookAhead: { label: 'Look ahead (cells)', min: 0, max: 6, step: 0.25 },
  glow: { label: 'Glow', min: 0, max: 2.5, step: 0.05 },
  exposure: { label: 'Exposure', min: 0.5, max: 1.8, step: 0.05 },
  roomLight: { label: 'Rooms — how lit', min: 0, max: 2.5, step: 0.05 },
  wear: { label: 'Grime on the walls', min: 0, max: 1.5, step: 0.05 },
  dust: { label: 'Dust', min: 0, max: 2.5, step: 0.05 },
  debris: { label: 'Debris — how much flies', min: 0, max: 2.5, step: 0.05 },
  fogDepth: { label: 'Haze on the far rows', min: 0.4, max: 2, step: 0.05 },
  stars: { label: 'Stars', min: 0, max: 2, step: 0.05 },
  res: { label: 'Resolution', min: 0.5, max: 1, step: 0.05 },
};
const NAMES = { george: 'THE CLOWN', lizzie: 'THE GIRL', ralph: 'THE KING' };
const EDGES = { george: 'hits harder', lizzie: 'climbs faster', ralph: 'runs faster' };
const STEP = 1 / 120;
const EXIT_BEAT = 900;
const MAP_AUTO = 7;   // s on the map before it drives itself

// ---- the register: cynical, funny, PG-13. One line at a time on the plate. -------------------------------
const COPY = {
  eat: {
    customer: 'CUSTOMER. FIVE STARS.', worker: 'REMOTE WORKER. STILL ON MUTE.', waver: 'HE WAVED. HE\'S EATEN.', zombie: 'NEVER LOOKED UP FROM THE PHONE.',
    fries: 'FRIES. COLD.', shake: 'THE MACHINE WORKED TODAY.', nuggets: 'NUGGETS. SHAPE UNCLEAR.', patty: 'SQUARE. NEVER CUTS CORNERS.', cake: 'SOMEBODY\'S BIRTHDAY.',
    streamer: 'LIVESTREAMER. FOUR VIEWERS.', soldier: 'NATIONAL GUARD. WEEKEND WARRIOR.', supplement: 'MEGA SUPPLEMENT. SIDE EFFECTS INCLUDE THIS.', toast: 'THE AIR FRYER DINGED. TOAST.', teen: 'EMPLOYEE OF THE MONTH.', burrito: 'THE BURRITO WAS YOURS ANYWAY.',
  },
  take: { crown: 'A PAPER CROWN. YOU\'RE ROYALTY NOW.', cash: 'CASH. REMEMBER CASH?', crypto: 'CRYPTO. WORTHLESS BY FRIDAY.' },
  hazard: { fryer: 'AIR FRYER. STILL HOT.', peloton: 'THE BIKE WAS STILL ON.', cactus: 'A CACTUS. IN AN OFFICE.', vape: 'MANGO ICE. YOU COUGHED.', smoothie: 'WELLNESS SMOOTHIE. IT WAS NOT.', neon: 'STILL PLUGGED IN.' },
  boom: 'E-BIKE BATTERY. AS SEEN ON THE NEWS.',
  flash: 'RING LIGHT. YOU\'RE FAMOUS.',
  building: 'CONDEMNED.', rival: 'REGIONAL MANAGER PROMOTED TO RUBBLE.', own: 'THAT ONE WAS YOURS. NICE.',
  neonOut: 'SIGN\'S OFF. NOBODY\'S HOME.',
  revert: 'SHIFT\'S OVER. CLOCK OUT.', gone: 'ANOTHER SHIFT.', arrive: 'BACK ON THE CLOCK.',
  soldier: { punched: 'WEEKEND WARRIOR. WEEKEND\'S OVER.', crushed: 'IN THE WAY.' },
  tank: 'SWAT. RETIRED.', drone: 'DRONE. DEPRECATED.',
  car: { cruiser: 'OFFICER DOWN. HIS CAR, ANYWAY.', taxi: 'SURGE PRICING CANCELLED.', bot: 'DELIVERY ROBOT. IT HAD ONE JOB.' },
  fall: 'THAT WAS MORE THAN TWO FLOORS.', knockedOff: 'OFF THE BUILDING. ON CAMERA.',
  extraLife: 'ANOTHER SHIFT.',
  waveDuck: 'HE STOPPED WAVING.',
  ding: 'DING.',
};
const TICKER = [
  'BREAKING: LOCAL MAN FILMS INSTEAD OF RUNNING', 'MARKETS SHRUG', 'MAYOR: "THOUGHTS AND PRAYERS"', 'INSURANCE: NOT COVERED', 'NEW ORDINANCE BANS BEING EATEN',
  'TRAFFIC ADVISORY: EVERYTHING', 'CITY COUNCIL TO FORM COMMITTEE', 'ANALYSTS: "UNPRECEDENTED"', 'RENT STILL DUE', 'DRONE FOOTAGE GOES VIRAL, DRONE DOES NOT',
  'NATIONAL GUARD REQUESTS MORE GUARD', 'FRANCHISE OWNER: "WE ARE FINE"', 'LIVESTREAMER HITS 4 VIEWERS', 'AIR FRYER RECALL EXPANDED', 'TAXES FILED ON TIME BY NOBODY',
];

function load(key, defaults) { try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) { return Object.assign({}, defaults); } }
function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }
const $ = (id) => document.getElementById(id);
const fmt = (n) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

let play = load(PLAY_KEY, PLAY_DEFAULTS);
let look = load(LOOK_KEY, LOOK_DEFAULTS);
let choice = load(MODE_KEY, { monster: 'george', companions: 1, mode: 'free' });
let state = null, R = null;
let mode = 'loading';   // loading | attract | play | paused | dayEnd | map | over | exiting
let carry = 0, lastT = 0, restartArmed = 0, hintFadeDone = false, mapT = 0, exitPending = null, tunerPaused = false, hurtT = 0, whiteT = 0, portraitsReady = false;
const keys = new Set();
let mouseDown = false;
const portraits = {};

// ---- the renderer ---------------------------------------------------------------------------------------------
const canvas = $('field');
try { R = createRenderer(canvas, look); } catch (e) { document.body.classList.add('nogl'); console.error(e); }

// ---- sound ------------------------------------------------------------------------------------------------------
if (window.ElasticSoundControl && Sfx.start) {
  ElasticSoundControl.attach({ start: () => Sfx.start(), stop: () => Sfx.stop(), setVolume: (v) => Sfx.setVolume(v) });
}
function pan(x) { if (!R) return 0; const half = (R.look.viewCells * CELL) / 2; return Math.max(-1, Math.min(1, (x * CELL - R.camera.position.x) / half)) * 0.8; }

// ---- the plate + the ticker -------------------------------------------------------------------------------------
const plateEl = $('plate'), plateLine = $('plate-line');
const plateQ = [];
let plateT = 0;
function plate(text, kind, big) {
  if (!text) return;
  if (big) { plateQ.length = 0; plateQ.unshift({ text, kind }); plateT = 0; }
  else if (plateQ.length < 3) plateQ.push({ text, kind });
}
function stepPlate(dt) {
  if (plateT > 0) { plateT -= dt; if (plateT <= 0) plateEl.classList.remove('show'); return; }
  if (!plateQ.length) return;
  const p = plateQ.shift();
  plateLine.textContent = p.text;
  plateEl.className = 'show pop' + (p.kind ? ' ' + p.kind : '');
  void plateEl.offsetWidth;
  plateT = 1.7;
  setTimeout(() => plateEl.classList.remove('pop'), 320);
}
let tickerT = 0, tickerI = Math.floor(Math.random() * TICKER.length);
function stepTicker(dt) {
  tickerT -= dt;
  if (tickerT <= 0) { tickerT = 11; $('ticker').innerHTML = '<b>NEWS</b> · ' + TICKER[tickerI % TICKER.length]; tickerI++; }
}

// ---- floats -------------------------------------------------------------------------------------------------------
const floatLayer = $('float');
const _pt = {};
function floatText(x, y, text, cls) {
  if (!R) return;
  R.project(x, y + 1, _pt);
  if (!_pt.visible) return;
  const el = document.createElement('div');
  el.className = 'float' + (cls ? ' ' + cls : '');
  el.textContent = text;
  el.style.left = _pt.x + 'px'; el.style.top = _pt.y + 'px';
  floatLayer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// ---- the HUD -----------------------------------------------------------------------------------------------------
const monCards = new Map();
function buildHud() {
  const box = $('monsters');
  box.innerHTML = ''; monCards.clear();
  if (!state) return;
  for (const m of state.monsters) {
    const el = document.createElement('div');
    el.className = 'panel mon' + (m.cpu ? '' : ' you');
    el.style.setProperty('--c', 'var(--' + m.slug + ')');
    const c = portraits[m.slug] ? portraits[m.slug].cloneNode(true) : document.createElement('div');
    if (portraits[m.slug]) { const ctx = c.getContext('2d'); ctx.drawImage(portraits[m.slug], 0, 0); } else c.className = 'face';
    el.appendChild(c);
    const info = document.createElement('div');
    info.innerHTML = '<div class="name">' + NAMES[m.slug] + (m.cpu ? '' : ' · YOU') + '</div><div class="bar"><i></i></div><div class="lives"></div>';
    el.appendChild(info);
    box.appendChild(el);
    monCards.set(m.id, { el, bar: info.querySelector('.bar i'), lives: info.querySelector('.lives'), lastLives: -1, lastHp: -1 });
  }
}
let hudKey = '';
function renderHud() {
  if (!state) return;
  const inGame = mode !== 'attract';
  for (const m of state.monsters) {
    const c = monCards.get(m.id);
    if (!c) continue;
    const hp = inGame ? m.hp : 100;
    if (hp !== c.lastHp) { c.lastHp = hp; c.bar.style.transform = 'scaleX(' + (hp / 100).toFixed(3) + ')'; }
    const lives = m.cpu ? -1 : (inGame ? m.lives : play.lives);
    if (lives !== c.lastLives) {
      c.lastLives = lives;
      if (m.cpu) c.lives.innerHTML = '';
      else { let g = ''; for (let i = 0; i < Math.min(6, lives); i++) g += '<i></i>'; if (lives > 6) g += '<span class="more">+' + (lives - 6) + '</span>'; if (lives <= 0) g = '<span class="more">LAST SHIFT</span>'; c.lives.innerHTML = g; }
    }
    c.el.classList.toggle('gone', m.st === 'gone' || m.st === 'dead' || m.st === 'walkoff' || m.st === 'revert');
  }
  const key = [inGame ? state.score : 0, state.day, state.city.name].join('|');
  if (key !== hudKey) {
    hudKey = key;
    $('score').textContent = fmt(inGame ? state.score : 0);
    $('day').textContent = String(state.day);
    $('city').textContent = state.city.name + ', ' + state.city.state;
    $('city-tag').textContent = state.city.tag;
  }
}

// ---- the map between days -----------------------------------------------------------------------------------------
const US = [[-124.7, 48.4], [-123.0, 46.2], [-124.4, 42.0], [-124.2, 40.4], [-122.5, 37.8], [-120.6, 34.6], [-117.1, 32.5], [-114.7, 32.7], [-111.0, 31.3], [-108.2, 31.8], [-106.5, 31.8], [-104.9, 29.7], [-103.0, 29.0], [-101.4, 29.8], [-99.5, 27.5], [-97.4, 25.9], [-97.2, 27.8], [-94.9, 29.4], [-93.8, 29.7], [-91.0, 29.2], [-89.4, 29.0], [-88.1, 30.3], [-85.7, 30.1], [-84.0, 29.9], [-82.7, 28.0], [-81.0, 25.1], [-80.4, 25.2], [-80.1, 26.8], [-80.6, 28.5], [-81.5, 30.7], [-81.0, 32.0], [-79.0, 33.5], [-77.9, 34.0], [-76.0, 35.2], [-76.0, 36.9], [-75.2, 38.4], [-74.7, 39.2], [-74.0, 40.5], [-72.0, 41.0], [-70.0, 41.6], [-70.8, 42.9], [-68.9, 44.4], [-67.0, 44.8], [-67.8, 47.1], [-69.2, 47.4], [-71.5, 45.0], [-74.8, 45.0], [-76.8, 43.6], [-79.0, 43.3], [-79.1, 42.8], [-82.4, 41.7], [-83.5, 41.8], [-82.4, 43.0], [-83.5, 45.9], [-84.7, 46.5], [-88.4, 48.3], [-89.6, 48.0], [-94.8, 49.4], [-97.2, 49.0], [-104.0, 49.0], [-111.0, 49.0], [-117.0, 49.0], [-122.7, 49.0]];
const proj = (lon, lat) => [((lon + 125.5) / 59.5) * 600, ((49.8 - lat) / 25.5) * 340];
function buildMap(day, startDay) {
  const svg = $('usmap');
  const n = City.CITIES.length;
  const cur = City.cityDef(day), nxt = City.cityDef(day + 1);
  let s = '<path class="us" d="M' + US.map((p) => proj(p[0], p[1]).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z" />';
  for (const c of City.CITIES) { const [x, y] = proj(c[3], c[2]); s += '<circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2" />'; }
  // the road so far
  if (day > startDay) {
    const pts = [];
    for (let d = startDay; d <= day; d++) { const c = City.cityDef(d); pts.push(proj(c[3], c[2])); }
    s += '<polyline class="past" points="' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ') + '" />';
  }
  const a = proj(cur[3], cur[2]), b = proj(nxt[3], nxt[2]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  s += '<path class="route" style="stroke-dasharray:' + len.toFixed(0) + ';stroke-dashoffset:' + len.toFixed(0) + '" d="M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + '" />';
  s += '<circle class="here" cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="4" /><circle class="next" cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="4.5" />';
  s += '<text x="' + (a[0] + 7).toFixed(1) + '" y="' + (a[1] - 6).toFixed(1) + '">' + cur[0] + '</text><text x="' + (b[0] + 7).toFixed(1) + '" y="' + (b[1] + 14).toFixed(1) + '">' + nxt[0] + '</text>';
  svg.innerHTML = s;
  void n;
}

// ---- flow ------------------------------------------------------------------------------------------------------------
function coreOpts(attract) {
  let seed = play.seed;
  if (!seed) seed = String((Math.random() * 1e9) >>> 0);
  return {
    seed: attract ? String(Date.now() % 1000003) : seed,
    day: attract ? 1 + Math.floor(Math.random() * 6) : play.day,
    lives: attract ? 99 : play.lives,
    monster: attract ? Core.SLUGS[Math.floor(Math.random() * 3)] : choice.monster,
    companions: attract ? 2 : choice.companions,
    flavour: play.flavour, thresholdScale: play.thresholdScale, fallDmg: play.fallDmg, spawnScale: play.spawnScale, hazardScale: play.hazardScale, streamerT: play.streamerT, dealShift: play.dealShift,
    exits: attract ? 0 : 1, enemies: 1, free: 1,
  };
}
function applyLiveOpts() {
  if (!state) return;
  Object.assign(state.opts, { thresholdScale: play.thresholdScale, fallDmg: play.fallDmg, spawnScale: play.spawnScale, hazardScale: play.hazardScale, streamerT: play.streamerT });
}
function showCard(id) {
  for (const c of document.querySelectorAll('.card')) c.classList.toggle('show', c.id === id);
}
function enterAttract(resultLine) {
  mode = 'attract';
  state = Core.createGame(coreOpts(true));
  exitPending = null;
  Sfx.setDrone(false); Sfx.setSiren(false);
  $('start-result').style.display = resultLine ? 'block' : 'none';
  $('start-result').textContent = resultLine || '';
  showCard('start-card');
  $('pause-card').classList.remove('show');
  $('controls').style.display = 'none';
  $('hud').style.opacity = '0.4'; $('ticker').style.opacity = '0';
  renderPick();
  buildHud(); renderHud();
}
function startGame() {
  state = Core.createGame(coreOpts(false));
  mode = 'play';
  carry = 0; exitPending = null; restartArmed = 0;
  $('btn-restart').classList.remove('armed'); $('btn-restart').textContent = 'RESTART';
  showCard('');
  $('controls').style.display = 'flex';
  $('hud').style.opacity = '1'; $('ticker').style.opacity = '1';
  buildHud(); renderHud();
  plate(state.city.name.toUpperCase() + ', ' + state.city.state + '. ' + state.city.tag.toUpperCase(), '', true);
  Sfx.play('start'); Sfx.voice(choice.monster, 'start');
}
function gameOver() {
  mode = 'over';
  Sfx.setDrone(false); Sfx.setSiren(false); Sfx.play('over');
  $('o-score').textContent = fmt(state.score);
  $('o-detail').textContent = 'DAY ' + state.day + ' · ' + state.stats.buildings + ' BUILDINGS · ' + state.stats.eaten + ' EATEN · ' + state.stats.days + ' CITIES LEVELLED';
  showCard('over-card');
  $('controls').style.display = 'none';
}
function dayEnd(e) {
  mode = 'dayEnd';
  Sfx.setDrone(false); Sfx.setSiren(false); Sfx.play('dayEnd');
  $('d-city').textContent = e.city.toUpperCase() + ': LEVELLED';
  $('d-points').textContent = fmt(e.dayPoints) + ' TODAY · DAY BONUS ' + fmt(e.bonus);
  $('d-detail').textContent = 'SCORE ' + fmt(e.score);
  showCard('day-card');
}
function showMap() {
  mode = 'map'; mapT = 0;
  const nxt = City.cityDef(state.day + 1);
  $('mp-city').textContent = nxt[0].toUpperCase() + ', ' + nxt[1];
  $('mp-tag').textContent = (nxt[4] && nxt[4].tag) || '';
  buildMap(state.day, state.opts.day);
  showCard('map-card');
}
function drive() {
  if (mode !== 'map') return;
  Core.skipMap(state);
  mode = 'play';
  showCard('');
  buildHud(); renderHud();
  plate(state.city.name.toUpperCase() + ', ' + state.city.state + '. ' + state.city.tag.toUpperCase(), '', true);
  Sfx.play('start');
}
const EXITS = { subway: () => $('exit-subway'), corridor: () => $('exit-corridor'), blimp: () => $('exit-blimp') };
function takeExit(which) {
  const a = EXITS[which] && EXITS[which]();
  if (!a) return;
  Sfx.setDrone(false); Sfx.setSiren(false);
  a.click();
}

// ---- the portraits: rendered from the models once the renderer has drawn a frame --------------------------------
function makePortraits() {
  for (const slug of Core.SLUGS) { try { portraits[slug] = R.portrait(slug, 128); } catch (e) { console.error(e); } }
  document.querySelectorAll('#pick canvas').forEach((c) => { const slug = c.parentNode.dataset.v; if (portraits[slug]) { c.getContext('2d').clearRect(0, 0, 96, 96); c.getContext('2d').drawImage(portraits[slug], 0, 0, 96, 96); } });
  buildHud(); renderHud();
}

// ---- the start card picks ------------------------------------------------------------------------------------------
function renderPick() {
  const box = $('pick');
  if (!box.children.length) {
    for (const slug of Core.SLUGS) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.v = slug; b.style.setProperty('--c', 'var(--' + slug + ')');
      const c = document.createElement('canvas'); c.width = 96; c.height = 96;
      if (portraits[slug]) c.getContext('2d').drawImage(portraits[slug], 0, 0, 96, 96);
      b.appendChild(c);
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = NAMES[slug]; b.appendChild(nm);
      const ed = document.createElement('span'); ed.className = 'edge'; ed.textContent = EDGES[slug]; b.appendChild(ed);
      b.addEventListener('click', () => { choice.monster = slug; save(MODE_KEY, choice); renderPick(); Sfx.play('ui'); Sfx.voice(slug, 'pick'); });
      box.appendChild(b);
    }
  }
  box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === choice.monster));
  document.querySelectorAll('#m-comp button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(choice.companions)));
  document.querySelectorAll('#pick .edge').forEach((e) => { e.style.opacity = play.flavour > 0 ? 1 : 0.35; });
}
document.querySelectorAll('#m-comp button').forEach((b) => b.addEventListener('click', () => { choice.companions = parseInt(b.dataset.v, 10); save(MODE_KEY, choice); renderPick(); Sfx.play('ui'); }));

// ---- input ------------------------------------------------------------------------------------------------------------
function currentInput() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  return {
    move: (right ? 1 : 0) - (left ? 1 : 0),
    up: keys.has('ArrowUp') || keys.has('KeyW'),
    down: keys.has('ArrowDown') || keys.has('KeyS'),
    jump: keys.has('Space'),
    punch: keys.has('KeyJ') || keys.has('KeyK') || mouseDown,
  };
}
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'KeyC') { e.preventDefault(); if (tuner.classList.contains('open')) closeTuner(); else openTuner(); return; }
  if (mode === 'attract') { if (e.code === 'Enter') { e.preventDefault(); startGame(); } return; }
  if (mode === 'over') { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); enterAttract(); } return; }
  if (mode === 'map') { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); drive(); } return; }
  if (mode === 'dayEnd') return;
  if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
  if (mode === 'paused') { if (e.code === 'Space') { e.preventDefault(); togglePause(); } return; }
  if (e.code === 'KeyR') { e.preventDefault(); armRestart(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (!hintFadeDone) { hintFadeDone = true; $('hint').classList.add('faded'); }
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouseDown = false; if (mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') togglePause(); });
canvas.addEventListener('pointerdown', (e) => { if (e.button === 0 && mode === 'play') mouseDown = true; });
document.addEventListener('pointerup', () => { mouseDown = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function togglePause() {
  if (mode === 'play') { mode = 'paused'; $('pause-card').classList.add('show'); $('btn-pause').textContent = 'RESUME'; Sfx.setDrone(false); Sfx.setSiren(false); }
  else if (mode === 'paused') { mode = 'play'; $('pause-card').classList.remove('show'); $('btn-pause').textContent = 'BREAK'; lastT = 0; }
}
function armRestart() {
  if (mode !== 'play' && mode !== 'paused') return;
  if (restartArmed > 0) { restartArmed = 0; $('btn-restart').classList.remove('armed'); $('btn-restart').textContent = 'RESTART'; if (mode === 'paused') togglePause(); startGame(); }
  else { restartArmed = 3; $('btn-restart').classList.add('armed'); $('btn-restart').textContent = 'SURE?'; }
}
$('btn-start').addEventListener('click', startGame);
$('btn-again').addEventListener('click', () => enterAttract());
$('btn-go').addEventListener('click', drive);
$('btn-pause').addEventListener('click', () => togglePause());
$('btn-restart').addEventListener('click', () => armRestart());

// ---- events from the core -----------------------------------------------------------------------------------------------
function handleEvents(st) {
  const you = st.monsters[0];
  for (const e of st.events) {
    R.event(e, st);
    const mine = e.who == null || e.who === you.id;
    switch (e.type) {
      case 'punch': Sfx.play('swing', pan(e.x)); break;
      case 'punchLand': if (e.hit) Sfx.play('hit', pan(e.x)); break;
      case 'cellBreak': Sfx.play(e.cellType === 1 ? 'wallBreak' : e.cellType === 2 ? 'neonBreak' : 'glass', pan(e.x)); if (e.deal !== 'none' && e.deal !== 'corridor') Sfx.play('reveal', pan(e.x)); break;
      case 'cellCrack': Sfx.play('crack', pan(e.x)); break;
      case 'points': if (e.points >= 100) floatText(e.x, e.y, '+' + fmt(e.points), e.points >= 1000 ? 'big' : ''); break;
      case 'eat': if (e.who === you.id) { plate(COPY.eat[e.what] || 'EATEN.'); Sfx.play(e.what === 'customer' || e.what === 'worker' || e.what === 'waver' || e.what === 'zombie' || e.what === 'streamer' || e.what === 'soldier' || e.what === 'teen' ? 'chomp' : 'munch', pan(e.x)); if (e.what === 'supplement') Sfx.play('power', pan(e.x)); Sfx.voice(you.slug, 'eat'); } else Sfx.play('chomp', pan(e.x)); break;
      case 'take': if (e.who === you.id) plate(COPY.take[e.what]); Sfx.play('cash', pan(e.x)); break;
      case 'hazard': if (e.who === you.id) plate(COPY.hazard[e.what] || 'OUCH.', 'bad'); Sfx.play(e.what === 'peloton' ? 'zap' : e.what === 'fryer' ? 'sizzle' : e.what === 'vape' ? 'cough' : 'ouch', pan(e.x)); break;
      case 'boom': plate(COPY.boom, 'bad'); Sfx.play('boom', pan(e.x)); break;
      case 'ding': Sfx.play('ding', pan(e.x)); break;
      case 'flash': Sfx.play('flash', pan(e.x)); whiteT = 0.35; break;
      case 'knockedOff': if (mine) plate(COPY.knockedOff, 'bad'); break;
      case 'neon': break;
      case 'neonOut': if (mine) plate(COPY.neonOut); Sfx.play('neonOut', pan(e.x)); break;
      case 'neonShock': if (mine) plate(COPY.hazard.neon, 'bad'); Sfx.play('zap', pan(e.x)); break;
      case 'collapseStart': Sfx.play('rumble', pan(e.x)); Sfx.setDust(1); break;
      case 'collapseEnd': Sfx.play('crash', pan(e.x)); Sfx.setDust(0.5); if (e.by === you.slug) { plate(e.rival ? COPY.rival : e.restaurant === you.slug ? COPY.own : COPY.building, e.rival ? 'good' : '', true); Sfx.voice(you.slug, 'building'); } break;
      case 'damage': if (e.who === you.id) { hurtT = 0.35; Sfx.play(e.src === 'fall' ? 'thud' : 'ouch', pan(e.x)); } break;
      case 'landHard': if (mine) plate(COPY.fall, 'bad'); Sfx.play('thud', pan(e.x)); break;
      case 'land': Sfx.play('step', pan(e.x)); break;
      case 'jump': Sfx.play('jump', pan(e.x)); break;
      case 'grab': Sfx.play('grab', pan(st.monsters.find((m) => m.id === e.who).x)); break;
      case 'revert': if (e.who === you.id) plate(COPY.revert, 'bad', true); Sfx.play('revert', pan(e.x)); Sfx.voice(e.slug, 'revert'); break;
      case 'walkoff': Sfx.play('walkoff', pan(e.x)); break;
      case 'eaten': plate(e.by === you.slug ? COPY.eat.teen : 'THE ' + NAMES[e.slug].replace('THE ', '') + ' GOT EATEN.', e.by === you.slug ? 'good' : ''); Sfx.play('chomp', pan(e.x)); break;
      case 'gone': if (e.who === you.id) { if (e.lives > 0) plate(COPY.gone); } break;
      case 'arrive': if (e.who === you.id) plate(COPY.arrive); Sfx.play('arrive', pan(e.x)); break;
      case 'landed': Sfx.play('thud', pan(e.x)); break;
      case 'soldier': Sfx.play('bark', pan(e.x)); break;
      case 'shot': Sfx.play(e.from === 'drone' ? 'droneShot' : 'shot', pan(e.x)); break;
      case 'soldierDie': if (mine) plate(COPY.soldier[e.how] || COPY.soldier.punched); Sfx.play(e.how === 'crushed' ? 'squish' : 'yelp', pan(e.x)); break;
      case 'tank': Sfx.play('engine', pan(e.x)); break;
      case 'tankFire': Sfx.play('cannon', pan(e.x)); break;
      case 'shellBoom': Sfx.play('shell', pan(e.x)); break;
      case 'tankHit': Sfx.play('clang', pan(e.x)); break;
      case 'tankDie': plate(COPY.tank); Sfx.play('boom', pan(e.x)); break;
      case 'drone': Sfx.setDrone(true); break;
      case 'droneDie': plate(COPY.drone); Sfx.play('droneDie', pan(e.x)); Sfx.setDrone(false); break;
      case 'droneCrash': Sfx.play('boom', pan(e.x)); break;
      case 'car': if (e.kind === 'cruiser') Sfx.setSiren(true); else if (e.kind === 'taxi') Sfx.play('horn', pan(e.x)); break;
      case 'carWreck': if (e.how === 'punched') plate(COPY.car[e.kind]); Sfx.play('wreck', pan(e.x)); if (e.kind === 'cruiser') Sfx.setSiren(false); break;
      case 'ducks': if (mine) plate(COPY.waveDuck); break;
      case 'extraLife': plate(COPY.extraLife, 'good', true); Sfx.play('extra'); break;
      case 'monsterHit': Sfx.play('hit', pan(e.x)); if (e.who === you.id) hurtT = 0.3; break;
      case 'bulletHit': if (e.who === you.id) hurtT = Math.max(hurtT, 0.12); break;
      case 'dayEnd': dayEnd(e); break;
      case 'map': showMap(); break;
      case 'day': if (mode === 'play') { hudKey = ''; } break;
      case 'exit': mode = 'exiting'; exitPending = e.which; Sfx.play('exit'); setTimeout(() => takeExit(e.which), EXIT_BEAT); break;
      case 'over': gameOver(); break;
      default: break;
    }
  }
  // the cruiser's siren stops when it leaves
  if (!st.cars.some((c) => c.kind === 'cruiser' && c.st === 'drive')) Sfx.setSiren(false);
  if (!st.drone) Sfx.setDrone(false);
}

// ---- the loop ----------------------------------------------------------------------------------------------------------
function frameStep(dt) {
  if (!state) return;
  if (mode === 'attract') {
    Core.step(state, Core.autopilot(state, state.monsters[0]), dt);
    for (const e of state.events) R.event(e, state);
    if (state.over || state.phase !== 'play' || state.exit) { state = Core.createGame(coreOpts(true)); buildHud(); }
    return;
  }
  if (mode === 'dayEnd') { Core.step(state, { move: 0, up: false, down: false, jump: false, punch: false }, dt); handleEvents(state); return; }   // the tally runs on the core's clock; the map event follows
  if (mode !== 'play' && mode !== 'exiting') return;
  const input = mode === 'play' ? currentInput() : { move: 0, up: false, down: false, jump: false, punch: false };
  Core.step(state, input, dt);
  handleEvents(state);
  if (restartArmed > 0) { restartArmed -= dt; if (restartArmed <= 0) { restartArmed = 0; $('btn-restart').classList.remove('armed'); $('btn-restart').textContent = 'RESTART'; } }
}
function frame(t) {
  requestAnimationFrame(frame);
  if (!R || mode === 'loading') return;
  const dtReal = lastT ? Math.max(0, Math.min(0.1, (t - lastT) / 1000)) : 0;
  lastT = t;
  carry += dtReal;
  while (carry >= STEP) { frameStep(STEP); carry -= STEP; }
  if (mode === 'map') { mapT += dtReal; if (mapT > MAP_AUTO) drive(); }
  R.update(state, dtReal);
  R.render();
  if (!portraitsReady) { portraitsReady = true; makePortraits(); }
  stepPlate(dtReal); stepTicker(dtReal);
  if (hurtT > 0) { hurtT -= dtReal; $('hurt').style.opacity = String(Math.min(1, hurtT * 3)); } else $('hurt').style.opacity = '0';
  if (whiteT > 0) { whiteT -= dtReal; $('whiteout').style.opacity = String(Math.min(1, whiteT * 3)); } else $('whiteout').style.opacity = '0';
  Sfx.setNight(R.night);
  renderHud();
}

// ---- the configuration panel ----------------------------------------------------------------------------------------------
const tuner = $('tuner');
function openTuner() { tuner.classList.add('open'); if (mode === 'play') { togglePause(); tunerPaused = true; } }
function closeTuner() { tuner.classList.remove('open'); if (tunerPaused && mode === 'paused') togglePause(); tunerPaused = false; }
$('tuner-toggle').addEventListener('click', (e) => { e.stopPropagation(); if (tuner.classList.contains('open')) closeTuner(); else openTuner(); });
document.addEventListener('pointerdown', (e) => { if (!tuner.classList.contains('open')) return; if (e.target.closest('#tuner') || e.target.closest('#tuner-toggle')) return; closeTuner(); });
tuner.addEventListener('keydown', (e) => e.stopPropagation());
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab-body').forEach((x) => x.classList.toggle('on', x.dataset.body === b.dataset.tab));
}));
function seg(id, key, parse) { $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { play[key] = parse ? parse(b.dataset.v) : b.dataset.v; save(PLAY_KEY, play); syncPlayUI(); applyLiveOpts(); })); }
seg('t-lives', 'lives', (v) => parseInt(v, 10));
function slider(id, key) { $(id).addEventListener('input', (e) => { play[key] = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); applyLiveOpts(); }); }
slider('t-flavour', 'flavour'); slider('t-thr', 'thresholdScale'); slider('t-fall', 'fallDmg'); slider('t-spawn', 'spawnScale'); slider('t-haz', 'hazardScale'); slider('t-streamer', 'streamerT'); slider('t-deal', 'dealShift'); slider('t-day', 'day');
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  const on = (id, v) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on('t-lives', play.lives);
  $('t-flavour').value = play.flavour; $('t-flavour-val').textContent = play.flavour <= 0 ? 'ALL THE SAME' : Math.round(play.flavour * 100) + '%';
  $('t-thr').value = play.thresholdScale; $('t-thr-val').textContent = '×' + play.thresholdScale.toFixed(2);
  $('t-fall').value = play.fallDmg; $('t-fall-val').textContent = play.fallDmg;
  $('t-spawn').value = play.spawnScale; $('t-spawn-val').textContent = play.spawnScale < 1 ? 'MORE (' + play.spawnScale.toFixed(1) + ')' : play.spawnScale > 1 ? 'FEWER (' + play.spawnScale.toFixed(1) + ')' : 'AS DEALT';
  $('t-haz').value = play.hazardScale; $('t-haz-val').textContent = '×' + play.hazardScale.toFixed(1);
  $('t-streamer').value = play.streamerT; $('t-streamer-val').textContent = play.streamerT.toFixed(1) + 's';
  $('t-deal').value = play.dealShift; $('t-deal-val').textContent = play.dealShift ? '+' + play.dealShift : 'AS DEALT';
  $('t-day').value = play.day; $('t-day-val').textContent = play.day + ' · ' + City.cityDef(play.day)[0];
  $('t-seed').value = play.seed || '';
  renderPick();
}
let ui = load(UI_KEY, { scale: 1 });
function applyUi() { document.documentElement.style.setProperty('--ui-scale', String(ui.scale)); $('t-ui').value = ui.scale; $('t-ui-val').textContent = Math.round(ui.scale * 100) + '%'; }
$('t-ui').addEventListener('input', (e) => { ui.scale = parseFloat(e.target.value); save(UI_KEY, ui); applyUi(); });
const lookRows = $('look-rows');
function buildLookRows() {
  lookRows.innerHTML = '';
  for (const key of Object.keys(LOOK_RANGES)) {
    const r = LOOK_RANGES[key];
    const row = document.createElement('div');
    row.className = 't-row';
    row.innerHTML = `<div class="t-label"><span>${r.label}</span><span data-val="${key}"></span></div><input type="range" data-key="${key}" min="${r.min}" max="${r.max}" step="${r.step}" />`;
    lookRows.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => { look[key] = parseFloat(e.target.value); save(LOOK_KEY, look); syncLookUI(); applyLook(key === 'res' || key === 'viewCells'); });
  }
  const row = document.createElement('div');
  row.className = 't-row';
  row.innerHTML = '<div class="t-label"><span>Time of day</span><span></span></div><div class="t-seg" id="t-night"><button data-v="-1" type="button">THE CITY DECIDES</button><button data-v="0" type="button">DAY</button><button data-v="1" type="button">NIGHT</button></div>';
  lookRows.appendChild(row);
  row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { look.night = parseInt(b.dataset.v, 10); save(LOOK_KEY, look); syncLookUI(); applyLook(false); }));
}
function syncLookUI() {
  lookRows.querySelectorAll('input').forEach((inp) => { const k = inp.dataset.key; inp.value = look[k]; lookRows.querySelector(`[data-val="${k}"]`).textContent = (+look[k]).toFixed(LOOK_RANGES[k].step < 0.1 ? 2 : LOOK_RANGES[k].step < 1 ? 1 : 0); });
  const tn = $('t-night'); if (tn) tn.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(look.night)));
}
function applyLook(resized) { if (!R) return; R.setLook(look); if (resized) R.resize(); }
$('t-reset').addEventListener('click', () => { look = Object.assign({}, LOOK_DEFAULTS); save(LOOK_KEY, look); syncLookUI(); applyLook(true); });

// ---- presets (file-backed via the dev server; saving IS telling Claude) -----------------------------------------------
const presetSelect = $('preset-select'), presetNote = $('preset-note');
const PRESET_URL = '/api/worlds/carnage/presets';
let presets = {};
const served = location.protocol === 'http:' || location.protocol === 'https:';
function fillPresetList() { presetSelect.innerHTML = '<option value="">— preset —</option>'; Object.keys(presets).sort().forEach((name) => { const o = document.createElement('option'); o.value = name; o.textContent = name; presetSelect.appendChild(o); }); }
async function loadPresets() {
  if (!served) { presetNote.textContent = 'presets need the local server'; return; }
  try {
    const r = await fetch(PRESET_URL); const data = await r.json();
    presets = data.presets || {}; fillPresetList();
    if (data.default && presets[data.default]) { presetSelect.value = data.default; if (!localStorage.getItem(LOOK_KEY)) { look = Object.assign({}, LOOK_DEFAULTS, presets[data.default]); syncLookUI(); applyLook(true); } }
  } catch (e) { presetNote.textContent = 'presets unavailable'; }
}
async function savePresets(defaultName) { const r = await fetch(PRESET_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presets, default: defaultName || null }) }); if (!r.ok) throw new Error((await r.json()).error || r.statusText); }
presetSelect.addEventListener('change', () => { const p = presets[presetSelect.value]; if (!p) return; look = Object.assign({}, LOOK_DEFAULTS, p); save(LOOK_KEY, look); syncLookUI(); applyLook(true); });
$('preset-save').addEventListener('click', async () => { const name = (prompt('Preset name', presetSelect.value || 'look-01') || '').trim(); if (!name) return; presets[name] = Object.assign({}, look); try { await savePresets(name); fillPresetList(); presetSelect.value = name; presetNote.textContent = 'saved "' + name + '"'; } catch (e) { presetNote.textContent = 'save failed: ' + e.message; } });
$('preset-del').addEventListener('click', async () => { const name = presetSelect.value; if (!name || !presets[name]) return; delete presets[name]; try { await savePresets(null); fillPresetList(); presetNote.textContent = 'deleted "' + name + '"'; } catch (e) { presetNote.textContent = 'delete failed: ' + e.message; } });

// ---- go ------------------------------------------------------------------------------------------------------------------
window.addEventListener('resize', () => { if (R) R.resize(); });
buildLookRows(); syncPlayUI(); syncLookUI(); applyUi();
loadPresets();
if (R) {
  R.load((p) => { $('load-bar').style.width = Math.round(p * 100) + '%'; $('load-sub').textContent = p < 0.5 ? 'clocking in' : p < 0.9 ? 'warming the fryer' : 'unlocking the doors'; }).then((r) => {
    $('loading').classList.add('gone');
    if (r && r.failed) console.warn('carnage: ' + r.failed + ' assets missing, fallback shapes in use');
    enterAttract();
    requestAnimationFrame(frame);
  });
}

// the headless checker's read-only handle
globalThis.CARNAGE_DEBUG = { get state() { return state; }, get mode() { return mode; }, get R() { return R; }, start: startGame, step: frameStep, Core, keys, drive, plate };
