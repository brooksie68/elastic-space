// Carnage — THE DAMAGE LAB. One street, the monster you pick, every verb in a list with plain facts and a
// STAGE IT button that sets the situation up (the doing is yours, with the game's keys), a dummy rival to
// punch, the army only when you ask, and the notes loop: `notes.json` through /api/worlds/carnage/notes —
// you write a note on a verb, Claude reads it from disk (tmp/carnage/notes.mjs watch), acts, and stamps the
// verb updated (the green dot + a toast here). Ranks 1–5 and PASSED / TRASH verdicts per verb, like the
// Jabberwocky weapon lab. Same core, same renderer, same sounds as the game; no music in the lab, ever.
import { createRenderer, LOOK_DEFAULTS, CELL } from './render3d.js?v=1';

const C = globalThis.CarnageCore, City = globalThis.CarnageCity, V = globalThis.CARNAGE_VERBS, Sfx = globalThis.CarnageSfx;
const T = City.T, S = City.S;
const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const served = location.protocol !== 'file:';
const NOTES_URL = '/api/worlds/carnage/notes';
const POLL_MS = 10000;
const PANEL_W = 420;
const LS = 'carnage-lab-v1';
let prefs = {}; try { prefs = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
const savePrefs = () => { try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (e) {} };
const drafts = prefs.drafts && typeof prefs.drafts === 'object' ? prefs.drafts : (prefs.drafts = {});
const errEl = $('err');
const showErr = (m) => { errEl.style.display = 'block'; errEl.textContent += m + '\n'; };
window.onerror = (m, s, l) => showErr(m + ' @' + (s || '').split('/').pop() + ':' + l);
window.addEventListener('unhandledrejection', (e) => showErr('REJECT: ' + (e.reason && e.reason.stack || e.reason)));

// ---- renderer + sound ---------------------------------------------------------------------------------------
const canvas = $('view');
const look = Object.assign({}, LOOK_DEFAULTS, { lookAhead: 0, night: q.get('night') === '1' ? 1 : q.get('night') === '0' ? 0 : 0 });
const R = createRenderer(canvas, look);
function fitShift() { const w = Math.max(1, window.innerWidth); look.shiftCells = -(PANEL_W / w) * look.viewCells / 2; R.setLook(look); }
fitShift();
addEventListener('resize', () => { R.resize(); fitShift(); });
const SILENT = q.get('silent') === '1';
if (Sfx) Sfx.setMusic(false);
if (window.ElasticSoundControl && !SILENT && Sfx) ElasticSoundControl.attach({ start: () => Sfx.start(), stop: () => Sfx.stop(), setVolume: (v) => Sfx.setVolume(v) });
const pan = (x) => Math.max(-1, Math.min(1, (x * CELL - R.camera.position.x) / (look.viewCells * CELL / 2))) * 0.8;

// ---- the street ------------------------------------------------------------------------------------------------
let state = null;
let monster = q.get('monster') || prefs.monster || 'george';
let company = prefs.company || 'dummy';
let army = prefs.army || 'off';
function newStreet() {
  state = C.createGame({ seed: 'lab-' + monster, day: 1, monster, companions: company === 'none' ? 0 : 1, cpuIdle: company === 'wrecker' ? 0 : 1, enemies: 1, exits: 1, lives: 99, buildings: 4 });
  holdArmy();
  const p = state.monsters[0];
  p.x = state.city.buildings[0].x0 + 1.5; p.homeX = p.x;
  if (state.monsters[1]) { const r = state.monsters[1]; r.x = state.city.buildings[1].x0 + 1.5; r.homeX = r.x; }
  $('who').textContent = { george: 'the clown', lizzie: 'the girl', ralph: 'the king' }[monster];
  $('where').textContent = state.city.name.toLowerCase();
}
function holdArmy() { if (army === 'off') { state.timers.soldier = Math.max(state.timers.soldier, 1e8); state.timers.tank = Math.max(state.timers.tank, 1e8); state.timers.drone = Math.max(state.timers.drone, 1e8); state.timers.car = Math.max(state.timers.car, 1e8); } }
newStreet();
$('monster').value = monster; $('company').value = company; $('army').value = army;
$('monster').addEventListener('change', () => { monster = $('monster').value; prefs.monster = monster; savePrefs(); newStreet(); hint('RESET'); });
$('company').addEventListener('change', () => { company = $('company').value; prefs.company = company; savePrefs(); newStreet(); });
$('army').addEventListener('change', () => { army = $('army').value; prefs.army = army; savePrefs(); if (army === 'on') { state.timers.soldier = 3; state.timers.tank = 12; state.timers.drone = 20; state.timers.car = 2; } else holdArmy(); });
$('reset').addEventListener('click', () => { newStreet(); hint('RESET'); });
$('night').addEventListener('click', () => { look.night = R.night ? 0 : 1; R.setLook(look); });

// ---- input: the game's keys -------------------------------------------------------------------------------------
const keys = new Set();
let mouseDown = false;
const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
addEventListener('keydown', (e) => {
  if (typing(e)) return;
  if (e.code === 'KeyQ') { step(-1); return; }
  if (e.code === 'KeyE') { step(1); return; }
  if (e.code === 'Enter') { stage(); return; }
  if (e.code === 'KeyR') { newStreet(); hint('RESET'); return; }
  if (e.code === 'KeyN') { look.night = R.night ? 0 : 1; R.setLook(look); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouseDown = false; });
canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) mouseDown = true; });
addEventListener('pointerup', () => { mouseDown = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function currentInput() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA'), right = keys.has('ArrowRight') || keys.has('KeyD');
  return { move: (right ? 1 : 0) - (left ? 1 : 0), up: keys.has('ArrowUp') || keys.has('KeyW'), down: keys.has('ArrowDown') || keys.has('KeyS'), jump: keys.has('Space'), punch: keys.has('KeyJ') || keys.has('KeyK') || mouseDown };
}

// ---- the loop ------------------------------------------------------------------------------------------------------
const STEP = 1 / 120;
let carry = 0, last = 0, loaded = false;
R.load(() => {}).then(() => { loaded = true; });
function sound(e) {
  if (!Sfx) return;
  switch (e.type) {
    case 'punch': Sfx.play('swing', pan(e.x)); break;
    case 'punchLand': if (e.hit) Sfx.play('hit', pan(e.x)); break;
    case 'cellBreak': Sfx.play(e.cellType === 1 ? 'wallBreak' : e.cellType === 2 ? 'neonBreak' : 'glass', pan(e.x)); break;
    case 'cellCrack': Sfx.play('crack', pan(e.x)); break;
    case 'eat': Sfx.play('chomp', pan(e.x)); break;
    case 'take': Sfx.play('cash', pan(e.x)); break;
    case 'hazard': Sfx.play(e.what === 'peloton' ? 'zap' : e.what === 'fryer' ? 'sizzle' : e.what === 'vape' ? 'cough' : 'ouch', pan(e.x)); break;
    case 'boom': Sfx.play('boom', pan(e.x)); break;
    case 'ding': Sfx.play('ding', pan(e.x)); break;
    case 'flash': Sfx.play('flash', pan(e.x)); break;
    case 'neonOut': Sfx.play('neonOut', pan(e.x)); break;
    case 'neonShock': Sfx.play('zap', pan(e.x)); break;
    case 'collapseStart': Sfx.play('rumble', pan(e.x)); Sfx.setDust(1); break;
    case 'collapseEnd': Sfx.play('crash', pan(e.x)); break;
    case 'landHard': case 'landed': Sfx.play('thud', pan(e.x)); break;
    case 'land': Sfx.play('step', pan(e.x)); break;
    case 'jump': Sfx.play('jump', pan(e.x)); break;
    case 'revert': Sfx.play('revert', pan(e.x)); Sfx.voice(e.slug, 'revert'); break;
    case 'walkoff': Sfx.play('walkoff', pan(e.x)); break;
    case 'eaten': Sfx.play('chomp', pan(e.x)); break;
    case 'arrive': Sfx.play('arrive', pan(e.x)); break;
    case 'soldier': Sfx.play('bark', pan(e.x)); break;
    case 'shot': Sfx.play(e.from === 'drone' ? 'droneShot' : 'shot', pan(e.x)); break;
    case 'soldierDie': Sfx.play(e.how === 'crushed' ? 'squish' : 'yelp', pan(e.x)); break;
    case 'tank': Sfx.play('engine', pan(e.x)); break;
    case 'tankFire': Sfx.play('cannon', pan(e.x)); break;
    case 'shellBoom': Sfx.play('shell', pan(e.x)); break;
    case 'tankHit': Sfx.play('clang', pan(e.x)); break;
    case 'tankDie': Sfx.play('boom', pan(e.x)); break;
    case 'drone': Sfx.setDrone(true); break;
    case 'droneDie': Sfx.play('droneDie', pan(e.x)); Sfx.setDrone(false); break;
    case 'droneCrash': Sfx.play('boom', pan(e.x)); break;
    case 'car': if (e.kind === 'cruiser') Sfx.setSiren(true); else if (e.kind === 'taxi') Sfx.play('horn', pan(e.x)); break;
    case 'carWreck': Sfx.play('wreck', pan(e.x)); if (e.kind === 'cruiser') Sfx.setSiren(false); break;
    case 'monsterHit': Sfx.play('hit', pan(e.x)); break;
    case 'extraLife': Sfx.play('extra'); break;
    case 'dayEnd': Sfx.play('dayEnd'); break;
    default: break;
  }
}
function tick(dt) {
  carry += dt;
  while (carry >= STEP) {
    C.step(state, currentInput(), STEP);
    for (const e of state.events) { R.event(e, state); sound(e); }
    if (state.exit) { state.exit = null; hint('A WAY OUT — the lab never leaves'); }
    if (state.phase === 'map') C.skipMap(state);   // the next street comes straight in
    if (state.over) newStreet();
    holdArmy();
    carry -= STEP;
  }
  R.update(state, dt);
  R.render();
  if (Sfx) { Sfx.setNight(R.night); if (!state.cars.some((c) => c.kind === 'cruiser' && c.st === 'drive')) Sfx.setSiren(false); if (!state.drone) Sfx.setDrone(false); }
  const p = state.monsters[0];
  $('hp-fill').style.width = p.hp + '%'; $('hp-num').textContent = String(Math.round(p.hp));
  $('cells').textContent = state.stats.cells + ' cells · ' + state.score + ' pts';
}
function frame(t) { requestAnimationFrame(frame); if (!loaded) return; const dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t; tick(dt); }
requestAnimationFrame(frame);

// ---- the plate + toasts ----------------------------------------------------------------------------------------------
const plate = $('plate');
let plateT = null;
function showPlate(name, line) {
  $('plate-name').textContent = name; $('plate-line').textContent = line || '';
  plate.className = 'show pop'; void plate.offsetWidth;
  clearTimeout(plateT); plateT = setTimeout(() => plate.classList.remove('show'), 2200);
  setTimeout(() => plate.classList.remove('pop'), 340);
}
let hintT = null;
function hint(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(hintT); hintT = setTimeout(() => el.classList.remove('show'), 2400); }

// ---- staging: the context every verb's stage() gets --------------------------------------------------------------------
function player() { return state.monsters[0]; }
function standing() { return state.city.buildings.find((b) => !b.down && !b.collapsing) || state.city.buildings[0]; }
function refresh(b) { const v = R.buildingViews.get(b.id); if (v) { for (let k = 0; k < b.cells.length; k++) { v.data[k * 4] = b.cells[k]; v.data[k * 4 + 1] = b.state[k]; } v.cellsTex.needsUpdate = true; } }
function fresh(m) { m.hitT = 0; m.eatT = 0; m.punchT = 0; m.punchHeld = 0; m.invulnT = 0; m.subT = 0; m.vx = 0; m.vy = 0; }
function place(x, m) { m = m || player(); m.x = Math.max(0.6, Math.min(state.city.width - 0.6, x)); m.y = 0; m.st = 'street'; m.b = -1; fresh(m); }
function face(b, col, y, m) { m = m || player(); m.x = b.x0 + col + 0.5; m.y = Math.max(0, Math.min(b.floors - 1, y)); m.st = 'climb'; m.b = b.id; m.col = col; m.colT = 0; fresh(m); }
function front() {
  const p = player();
  let b = p.st === 'climb' ? state.city.buildings[p.b] : City.buildingAt(state.city, p.x);
  if (!b || b.down || b.collapsing) { b = standing(); place(b.x0 + 1.5); }
  const col = p.st === 'climb' ? p.col : Math.max(0, Math.min(b.cols - 1, Math.floor(p.x - b.x0)));
  const row = p.st === 'climb' ? Math.max(0, Math.min(b.floors - 1, Math.floor(p.y + 0.6))) : 0;
  return { b, k: row * b.cols + col, col, row };
}
function windowFront() {
  // the nearest window cell on the row in front; walls and neon are skipped
  const f = front();
  const b = f.b;
  for (let d = 0; d < b.cols; d++) for (const c of [f.col + d, f.col - d]) {
    if (c < 0 || c >= b.cols) continue;
    const k = f.row * b.cols + c;
    if (b.cells[k] === T.WINDOW || b.cells[k] === T.STORE) { if (c !== f.col) { if (player().st === 'climb') face(b, c, player().y); else place(b.x0 + c + 0.5); } return { b, k, col: c, row: f.row }; }
  }
  return f;
}
function clearItem(b, k) { for (let i = state.items.length - 1; i >= 0; i--) if (state.items[i].b === b.id && state.items[i].k === k) state.items.splice(i, 1); }
function flush() { for (const e of state.events) { R.event(e, state); sound(e); } state.events.length = 0; }
const ctx = {
  get state() { return state; }, C, City, get p() { return player(); },
  front, standing, place, face, refresh,
  deal(id) {
    const f = windowFront();
    clearItem(f.b, f.k);
    if (f.b.state[f.k] === S.BROKEN) { f.b.state[f.k] = S.INTACT; f.b.broken = Math.max(0, f.b.broken - 1); }
    f.b.deal[f.k] = id;
    C.breakCell(state, f.b, f.k, player(), 'lab');
    refresh(f.b); flush();
  },
  wallFront() {
    const f = front(); const b = f.b;
    for (let d = 0; d < b.cols; d++) for (const c of [f.col + d, f.col - d]) {
      if (c < 0 || c >= b.cols) continue;
      const k = f.row * b.cols + c;
      if (b.cells[k] === T.WALL) { b.state[k] = S.INTACT; refresh(b); if (player().st === 'climb') face(b, c, player().y); else { b.cells[k] = T.WALL; place(b.x0 + c + 0.5); } return; }
    }
    // no wall on this row: make one
    b.cells[f.k] = T.WALL; b.state[f.k] = S.INTACT; b.deal[f.k] = 'none'; clearItem(b, f.k); refresh(b);
  },
  neon(lit) {
    let b = state.city.buildings.find((x) => x.neon && !x.down);
    if (!b) { b = standing(); const row = Math.max(1, b.floors - 2); const cells = [row * b.cols, row * b.cols + 1]; for (const k of cells) { b.cells[k] = T.NEON; b.state[k] = S.INTACT; b.deal[k] = 'none'; } b.neon = { cells, period: 3.4, on: 0.62, phase: 0, dead: false }; }
    for (const k of b.neon.cells) b.state[k] = S.INTACT;
    b.neon.dead = false; b.neon.on = lit ? 1 : 0; b.neon.lit = !!lit;
    const v = R.buildingViews.get(b.id); if (v) v.uniforms.uNeonLit.value = lit ? 1 : 0;
    refresh(b);
    const k0 = b.neon.cells[0];
    face(b, k0 % b.cols, Math.floor(k0 / b.cols));
  },
  rivalNext(punchy) {
    const p = player(), r = state.monsters[1];
    if (!r) { hint('no rival: pick one in the bar'); return; }
    if (p.st === 'climb') { const b = state.city.buildings[p.b]; face(b, Math.min(b.cols - 1, p.col + 1 === p.col ? p.col : p.col + (p.col + 1 < b.cols ? 1 : -1)), p.y, r); }
    else place(p.x + 1.3, r);
    r.hp = 100; r.ai.punchCd = punchy ? 0.5 : 99;
    if (punchy) state.opts.cpuIdle = 0; else state.opts.cpuIdle = company === 'wrecker' ? 0 : 1;
  },
  rivalRevert() {
    const p = player(), r = state.monsters[1];
    if (!r) { hint('no rival: pick one in the bar'); return; }
    place(p.x, p); place(p.x + 2.5, r); r.invulnT = 0;
    C.damage(state, r, 100, 'lab'); flush();
  },
  car(kind) {
    const p = player();
    const x = p.x < state.city.width / 2 ? state.city.width + 2.5 : -2.5;
    state.cars.push({ id: state.nextId++, kind, x, vx: (x < 0 ? 1 : -1) * C.CARS[kind].speed, st: 'drive', t: 0 });
    place(p.x);
  },
  nearThreshold(b) {
    if (b.down || b.collapsing) b = standing();
    const need = Math.ceil(b.threshold * state.opts.thresholdScale * b.punchable);
    let k = 0;
    while (b.broken < need - 1 && k < b.cells.length) { if (b.state[k] !== S.BROKEN && b.cells[k] !== T.NEON) { b.deal[k] = 'none'; b.state[k] = S.BROKEN; b.broken++; } k++; }
    refresh(b);
    const p = player();
    if (p.st !== 'climb' || p.b !== b.id) place(b.x0 + 1.5);
  },
};

// ---- the list --------------------------------------------------------------------------------------------------------
let current = null;
let notes = { notes: [], updates: {}, seen: {}, ranks: {}, verdicts: {} };
function verdictOf(id) { const v = (notes.verdicts || {})[id]; return v && v.status ? v.status : 'review'; }
function rankOf(id) { const r = (notes.ranks || {})[id]; return r && r.rank ? r.rank : 0; }
function unseen(id) { const u = (notes.updates || {})[id]; if (!u) return false; const s = (notes.seen || {})[id]; return !s || s < u.at; }
const list = $('list');
let listKey = '';
function buildList() {
  const sections = V.GROUPS.map((g) => [g, V.VERBS.filter((v) => v.group === g && verdictOf(v.id) === 'review')]);
  for (const st of ['passed', 'trash']) { const vs = V.VERBS.filter((v) => verdictOf(v.id) === st); if (vs.length) sections.push([st, vs]); }
  let h = '';
  for (const [g, vs] of sections) {
    if (!vs.length) continue;
    h += `<h3 class="${g}">${g}<span>${vs.length}</span></h3>`;
    for (const v of vs) h += `<div class="row${verdictOf(v.id) === 'trash' ? ' trash' : ''}" data-id="${v.id}"><span class="dot hidden"></span><span class="nm">${v.name}</span><span class="rk"></span></div>`;
  }
  list.innerHTML = h;
  list.querySelectorAll('.row').forEach((r) => r.addEventListener('click', () => pick(r.dataset.id)));
  listKey = JSON.stringify(notes.verdicts || {});
  syncRows();
}
function syncRows() {
  if (JSON.stringify(notes.verdicts || {}) !== listKey) { buildList(); return; }
  const filter = ($('search').value || '').trim().toLowerCase();
  list.querySelectorAll('.row').forEach((r) => {
    const id = r.dataset.id, v = V.byId[id];
    r.classList.toggle('on', id === current);
    r.classList.toggle('hid', !!filter && !(v.name.toLowerCase().includes(filter) || id.includes(filter)));
    r.querySelector('.dot').classList.toggle('hidden', !unseen(id));
    const rk = rankOf(id); r.querySelector('.rk').textContent = rk ? String(rk) : '';
  });
  $('cnt').textContent = V.VERBS.length;
  $('cnt-new').textContent = notes.notes.filter((n) => n.status === 'new').length;
  $('cnt-passed').textContent = V.VERBS.filter((v) => verdictOf(v.id) === 'passed').length;
  $('cnt-trash').textContent = V.VERBS.filter((v) => verdictOf(v.id) === 'trash').length;
}
$('search').addEventListener('input', syncRows);
function visibleIds() { return Array.from(list.querySelectorAll('.row')).filter((r) => !r.classList.contains('hid')).map((r) => r.dataset.id); }
function step(d) { const ids = visibleIds(); if (!ids.length) return; const i = ids.indexOf(current); pick(ids[(i + d + ids.length) % ids.length]); }
function pick(id) {
  if (current && $('w-note').value.trim()) drafts[current] = $('w-note').value; else if (current) delete drafts[current];
  savePrefs();
  current = id;
  syncRows();
  showDetail();
  if (unseen(id) && served) post({ op: 'seen', gag: id }).then((d) => { if (d) { notes = d; syncRows(); } });
  const r = list.querySelector(`.row[data-id="${id}"]`); if (r) r.scrollIntoView({ block: 'nearest' });
}
function stage() {
  const v = V.byId[current]; if (!v) return;
  try { v.stage(ctx); flush(); } catch (e) { showErr('stage ' + current + ': ' + (e.stack || e)); return; }
  showPlate(v.name.toUpperCase(), v.facts[0] ? v.facts[0][1] : '');
  $('do-st').textContent = 'staged — now do it';
}
$('do').addEventListener('click', stage);
function showDetail() {
  const v = V.byId[current];
  if (!v) return;
  $('d-name').textContent = v.name; $('d-group').textContent = v.group;
  $('facts').innerHTML = v.facts.map(([k, val]) => `<div><b>${k}</b><span>${esc(val)}</span></div>`).join('');
  $('do-st').textContent = '';
  const vd = verdictOf(current); $('verdict').querySelectorAll('button').forEach((b) => { b.classList.toggle('go', b.dataset.v === vd); b.classList.toggle(vd, b.dataset.v === vd); });
  $('w-note').value = drafts[current] || '';
  const rk = String(rankOf(current)); if ($('w-rank').value !== rk) $('w-rank').value = rk;
  $('w-note-st').textContent = '';
  $('d-notes').innerHTML = notes.notes.filter((n) => n.gag === current).slice().reverse().map(noteHtml).join('');
  wireNoteButtons($('d-notes'));
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function when(iso) { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
function noteHtml(n) {
  return `<div class="note" data-id="${n.id}"><div class="meta"><span class="${n.status}">${n.status === 'done' ? 'done' : 'waiting'}</span><span>${when(n.at)}</span>${n.rank ? '<span class="rk">rank ' + n.rank + '</span>' : ''}${n.action ? '<span class="ac ' + n.action + '">' + n.action + '</span>' : ''}${n.status === 'new' ? '<button data-del type="button">delete</button>' : ''}</div><div class="txt">${esc(n.text)}</div>${n.reply ? `<div class="rep">${esc(n.reply)}</div>` : ''}</div>`;
}
function wireNoteButtons(root) { root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { const id = b.closest('.note').dataset.id; const d = await post({ op: 'delete', id }); if (d) { notes = d; syncRows(); showDetail(); showGeneral(); } })); }
function showGeneral() { $('g-notes').innerHTML = notes.notes.filter((n) => !n.gag).slice().reverse().map(noteHtml).join(''); wireNoteButtons($('g-notes')); }

// ---- the notes loop ------------------------------------------------------------------------------------------------------
async function post(op) {
  if (!served) { hint('notes need the local server'); return null; }
  try { const r = await fetch(NOTES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op) }); if (!r.ok) throw new Error((await r.json()).error || r.status); return await r.json(); }
  catch (e) { hint('not saved: ' + e.message); return null; }
}
async function submit(gag, box, st) {
  const text = box.value.trim(); if (!text) return;
  st.textContent = 'sending…';
  const rank = gag ? rankOf(gag) : 0, action = gag ? $('w-action').value : null;
  const op = { op: 'add', gag, text }; if (rank) op.rank = rank; if (action) op.action = action;
  const d = await post(op);
  if (!d) { st.textContent = 'not sent'; return; }
  notes = d; box.value = ''; if (gag) delete drafts[gag]; else delete drafts._general; savePrefs();
  st.textContent = 'sent — Claude reads it within a minute';
  syncRows(); showDetail(); showGeneral();
}
$('w-submit').addEventListener('click', () => { if (current) submit(current, $('w-note'), $('w-note-st')); });
$('g-submit').addEventListener('click', () => submit(null, $('g-note'), $('g-note-st')));
$('w-note').addEventListener('input', () => { if (current) { drafts[current] = $('w-note').value; savePrefs(); } });
$('g-note').addEventListener('input', () => { drafts._general = $('g-note').value; savePrefs(); });
$('g-note').value = drafts._general || '';
$('w-rank').addEventListener('change', async () => {
  const rank = +$('w-rank').value || 0, gag = current, st = $('w-note-st');
  if (!gag) return;
  st.textContent = 'saving rank…';
  const d = await post({ op: 'rank', gag, rank });
  if (!d) { st.textContent = 'rank not saved'; return; }
  notes = d; syncRows(); st.textContent = rank ? 'rank ' + rank + ' saved' : 'rank cleared';
});
$('verdict').querySelectorAll('button').forEach((b) => b.addEventListener('click', async () => {
  const status = b.dataset.v, gag = current; if (!gag || status === verdictOf(gag)) return;
  const d = await post({ op: 'verdict', gag, status });
  if (!d) return;
  notes = d; syncRows(); showDetail();
}));
let lastUpdates = '';
async function poll() {
  if (!served) return;
  try {
    const d = await (await fetch(NOTES_URL, { cache: 'no-store' })).json();
    const prev = notes; notes = d;
    const ups = JSON.stringify(d.updates || {});
    if (lastUpdates && ups !== lastUpdates) {
      for (const [gag, u] of Object.entries(d.updates || {})) { const was = (prev.updates || {})[gag]; if (!was || was.at !== u.at) { const v = V.byId[gag]; hint((v ? v.name : gag) + ' — ' + (u.note || 'updated')); } }
    }
    lastUpdates = ups;
    const replied = d.notes.filter((n) => n.status === 'done' && !prev.notes.some((m) => m.id === n.id && m.status === 'done'));
    if (prev.notes.length && replied.length) hint('Claude replied on ' + replied.length + ' note' + (replied.length > 1 ? 's' : ''));
    const waiting = d.notes.filter((n) => n.status === 'new').length;
    document.title = (waiting ? '(' + waiting + ') ' : '') + 'Carnage — the damage lab';
    syncRows(); if (current) { const box = $('w-note'); const keep = box.value; showDetail(); box.value = keep; } showGeneral();
  } catch (e) { /* the server is away; the page keeps working */ }
}
buildList();
pick(q.get('verb') && V.byId[q.get('verb')] ? q.get('verb') : V.VERBS[0].id);
poll(); setInterval(poll, POLL_MS);
if (q.get('verb')) setTimeout(stage, 800);

globalThis.LAB = { R, get state() { return state; }, C, City, V, look, tick, stage, pick, ctx, get loaded() { return loaded; } };
