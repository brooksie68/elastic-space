// Jabberwocky — THE WEAPON LAB (2026-09-07). One bare hall, three passive creatures on pads that come back
// two seconds after they die, every weapon in a list with what it is and what it does, and a notes file
// that Claude reads from disk (`notes.json` via /api/worlds/jabberwocky/notes). The page polls the file
// every ten seconds; a weapon Claude has changed since you last opened it shows a green dot, and the
// change arrives as a toast. Same core, same renderer, same sound as the game.
import { createRenderer } from './render3d.js?v=3';

const C = globalThis.JabberwockyCore, T = globalThis.JABBERWOCKY_GAGS, Sfx = globalThis.JabberwockySfx;
const $ = (id) => document.getElementById(id);
const served = location.protocol !== 'file:';
const q = new URLSearchParams(location.search);
const NOTES_URL = '/api/worlds/jabberwocky/notes';
const POLL_MS = 10000;
const RESPAWN_S = 2;
const LS = 'jabberwocky-lab-v1';
let prefs = {}; try { prefs = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
const savePrefs = () => { try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (e) {} };

// ---- renderer --------------------------------------------------------------------------------------------
const canvas = $('view');
const R = createRenderer(canvas);
let look = { bob: 0, shake: 0.25, fog: 40, brightness: 1.05 };
try { const l = JSON.parse(localStorage.getItem('jabberwocky-look-v2') || 'null'); if (l) look = Object.assign({}, l, { bob: 0 }); } catch (e) {}
look.brightness = Math.max(look.brightness || 1, 1.35); look.torchLight = Math.max(look.torchLight || 1, 1.4);   // the lab is lit for looking, not for dread
R.setLook(look); R.resize();
addEventListener('resize', () => R.resize());

// ---- sound ------------------------------------------------------------------------------------------------
const SILENT = q.get('silent') === '1';
if (window.ElasticSoundControl && !SILENT) ElasticSoundControl.attach({
  start: () => Sfx.start(), stop: () => Sfx.stop(), setVolume: (v) => Sfx.setVolume(v),
  channels: [{ label: 'music', value: Sfx.musicLevel, setVolume: (v) => Sfx.setMusicVolume(v) }],
});
const pan = (x, y) => { const p = state.player; return Math.sin(Math.atan2(y - p.y, x - p.x) - p.a) * 0.8; };

// ---- state -------------------------------------------------------------------------------------------------
let state = C.newGame({ startLevel: 'lab', seed: 'lab', fireCool: 0.6, revealDelay: 0.28 });
state.events = [];
const view = { t: 0, bob: 0, pitch: 0 };
const input = { fwd: 0, strafe: 0, turn: 0, look: 0, fire: false, run: false };
const lookBank = { x: 0, y: 0 };
const LOOK_EASE = 14;
const keys = {};
let sens = 0.75; try { const p = JSON.parse(localStorage.getItem('jabberwocky-play-v2') || 'null'); if (p && p.sens) sens = p.sens; } catch (e) {}
const BIG = new Set(['train', 'blackhole', 'meteor', 'sand', 'tent', 'tornado', 'piano', 'bus']);
const gone = new Map();   // goon id → view.t when it died or was pacified

const CREW = {
  trio: ['ghoul', 'brute', 'cultist'],
  five: ['ghoul', 'brute', 'ratling', 'cultist', 'stalker'],
  ghouls: ['ghoul', 'ghoul', 'ghoul'], brutes: ['brute', 'brute', 'brute'], ratlings: ['ratling', 'ratling', 'ratling'], stalkers: ['stalker', 'stalker', 'stalker'],
};
function placeCrew(types) {
  const L = state.level, sp = L.spawn;
  const n = types.length;
  L.pads = types.map((type, i) => ({ i, type, x: sp.x + 4.6 + (i % 2) * 0.9, y: sp.y + (i - (n - 1) / 2) * 1.5 }));
  L.goonSpawns = L.pads.map((p) => ({ x: p.x, y: p.y, type: p.type, pad: p.i }));
  state.goons = L.goonSpawns.map((s) => C.makeLabGoon(state, s));
  gone.clear();
}
function reset() {
  const p = state.player, sp = state.level.spawn;
  p.x = sp.x; p.y = sp.y; p.a = sp.a; p.vx = p.vy = 0; p.hp = 100; p.cool = 0; p.safe = { x: sp.x, y: sp.y };
  for (const k in p.fx) p.fx[k] = 0;
  view.pitch = 0;
  state.shots = []; state.zones = []; state.emitters = []; state.beams = []; state.scars = []; state.pending = null; state.phase = 'play'; state.plate = null;
  placeCrew(CREW[$('creatures').value] || CREW.trio);
  R.buildLevel(state);
  R.vm.spin = 0;
}
$('creatures').value = prefs.crew || 'trio';
$('creatures').addEventListener('change', () => { prefs.crew = $('creatures').value; savePrefs(); reset(); });
$('reset').addEventListener('click', () => { reset(); hint('RESET'); });
reset();

// ---- input ---------------------------------------------------------------------------------------------------
// Two mouse modes (James: "I'm trapped" — the captured mouse locked him out of the panel). FREE is the default:
// the pointer is never taken, left click fires, hold the RIGHT button and drag to look, the panel is always live.
// CAPTURED is the game's way: click the room to take the mouse, esc gives it back. ?nolock=1 forces free.
let mouseMode = q.get('nolock') === '1' ? 'free' : (prefs.mouse || 'free');
const locked = () => mouseMode === 'free' || document.pointerLockElement === canvas;
function lock() { if (mouseMode === 'free' || locked()) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
let dragLook = false;
canvas.addEventListener('mousedown', (e) => {
  if (mouseMode === 'free') { if (e.button === 2) dragLook = true; else if (e.button === 0) input.fire = true; return; }
  if (!locked()) { lock(); return; }
  if (e.button === 0) input.fire = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; if (e.button === 2) dragLook = false; });
addEventListener('mousemove', (e) => {
  if (mouseMode === 'free' ? !dragLook : !locked()) return;
  lookBank.x += e.movementX * 0.0022 * sens; lookBank.y += e.movementY * 0.0022 * sens;
});
function setMouse(m) {
  mouseMode = m; prefs.mouse = m; savePrefs(); dragLook = false;
  if (m === 'free') unlock();
  $('mouse').querySelectorAll('button').forEach((b) => b.classList.toggle('go', b.dataset.m === m));
  $('keys').innerHTML = m === 'free'
    ? '<b>left click</b> fires · <b>hold right button + drag</b> to look · <b>WASD</b> · <b>arrows</b> turn · <b>Q</b>/<b>E</b> previous/next weapon · <b>R</b> reset · <b>1–4</b> jump to a tier'
    : '<b>click the room</b> to take the mouse · <b>esc</b> gives it back · <b>click</b>/<b>space</b> fires · <b>WASD</b> · <b>Q</b>/<b>E</b> previous/next weapon · <b>R</b> reset · <b>1–4</b> jump to a tier';
}
$('mouse').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setMouse(b.dataset.m)));
setMouse(mouseMode);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
addEventListener('keydown', (e) => {
  if (typing(e)) return;
  keys[e.code] = true;
  if (e.code === 'Space') { input.fire = true; e.preventDefault(); }
  if (e.code === 'KeyQ') stepPick(-1);
  if (e.code === 'KeyE') stepPick(1);
  if (e.code === 'KeyR') { reset(); hint('RESET'); }
  if (e.code >= 'Digit1' && e.code <= 'Digit4') { const tier = T.TIERS[+e.code.slice(5) - 1]; const g = T.GAGS.find((x) => x.tier === tier); if (g) pick(g.id); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') input.fire = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.fire = false; });
function readKeys() {
  input.fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  input.strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  input.turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  input.run = !!(keys.ShiftLeft || keys.ShiftRight);
}
$('fire').addEventListener('click', () => { state.player.cool = 0; C.fire(state, current); });

// ---- the plate + hints -------------------------------------------------------------------------------------------
const plate = $('plate');
let plateHideT = null;
function showPlate(p) {
  if (!p) return;
  $('plate-name').textContent = p.name; $('plate-line').textContent = p.line || '';
  plate.className = 'show pop ' + p.tier; void plate.offsetWidth;
  if (plateHideT) clearTimeout(plateHideT);
  plateHideT = setTimeout(() => plate.classList.remove('show'), 2200 + Math.min(2500, p.name.length * 40));
}
let hintT = null;
function hint(s, ms) { const h = $('hint'); h.textContent = s; h.classList.add('show'); if (hintT) clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('show'), ms || 1800); }

// ---- events from the core --------------------------------------------------------------------------------------
function handleEvents() {
  const ev = state.events; state.events = [];
  for (const e of ev) {
    switch (e.type) {
      case 'pull': Sfx.play('pull'); Sfx.reel(state.opts.revealDelay); R.vm.spin = 0.001; R.vm.mood = e.gag.tier === 'dud' || e.gag.tier === 'backfire' ? 'shudder' : BIG.has(e.gag.id) ? 'purr' : 'idle'; break;
      case 'fire': R.fire(); Sfx.play(e.gag.sound, e.little ? pan(e.x, e.y) : 0); Sfx.reveal(e.gag.tier); showPlate(state.plate); if (e.gag.kind === 'melee' || e.gag.kind === 'self') R.shake(0.5); break;
      case 'kill': Sfx.outcome(e.outcome, pan(e.x, e.y)); if (e.outcome !== 'pacify' && e.outcome !== 'vapor') R.strike(e.x, e.y); if (e.outcome === 'gib' || e.outcome === 'inflate') setTimeout(() => Sfx.play('crunch', pan(e.x, e.y)), 90); if (e.outcome === 'fling') setTimeout(() => Sfx.play('wallsplat', pan(e.x, e.y)), 560); break;
      case 'pacify': Sfx.play('pacify', pan(e.goon.x, e.goon.y)); break;
      case 'hurt': R.shake(0.6); Sfx.play('hurt'); break;
      case 'death': Sfx.play('death'); hint('THAT ONE KILLED YOU · NEVER MIND', 2600); state.phase = 'play'; state.player.hp = 100; break;
      case 'splat': Sfx.play('splat', pan(e.x, e.y)); break;
      case 'boom': Sfx.play('boom', pan(e.x, e.y)); R.boom(e.x, e.y, e.r, e.gag.id); break;
      case 'impact': R.impact(e.x, e.y, e.r); Sfx.play('thud', pan(e.x, e.y)); break;
      case 'wallbreak': Sfx.play('wallbreak', pan(e.x, e.y)); R.shake(0.5); R.buildLevel(state); break;
      case 'crash': Sfx.play('boom', pan(e.x, e.y)); break;
      case 'bounce': Sfx.play('bounce', pan(e.x, e.y)); break;
      case 'pop': Sfx.play('pop', pan(e.x, e.y)); break;
      case 'fall': Sfx.play('fall'); break;
      case 'swing': Sfx.play('swing', pan(e.goon.x, e.goon.y)); break;
      case 'self': R.shake(0.6); break;
      case 'boomerang-hit': Sfx.play('hurt'); break;
      case 'swap': R.shake(0.4); break;
    }
  }
}

// one step of the lab: the core, its events, the healing, the pads (frame() and LAB.step both use it)
let simT = 0;
function simTick(dt) {
  simT += dt;
  C.step(state, input, dt);
  handleEvents();
  const p = state.player;
  if (state.phase !== 'play') { state.phase = 'play'; p.hp = 100; }
  if (p.hp < 100) p.hp = Math.min(100, p.hp + dt * 12);   // the lab heals you; backfires still sting
  // the pads: whatever dies or dances comes back after two seconds
  for (const g of state.goons) {
    const out = g.state === 'dead' || g.state === 'pacified';
    if (!out) { gone.delete(g.id); continue; }
    if (!gone.has(g.id)) gone.set(g.id, simT);
    else if (simT - gone.get(g.id) >= RESPAWN_S) { gone.delete(g.id); C.respawnLabGoon(state, g); }
  }
}

// ---- the loop ------------------------------------------------------------------------------------------------------
let last = performance.now(), lastHud = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; view.t += dt;
  readKeys();
  const k = 1 - Math.exp(-dt * LOOK_EASE);
  input.look = lookBank.x * k; lookBank.x -= input.look;
  const dy = lookBank.y * k; lookBank.y -= dy;
  view.pitch = Math.max(-1, Math.min(1, view.pitch - dy));
  simTick(dt);
  input.look = 0;
  const p = state.player;
  if (p.moving && p.fx.fall <= 0) view.bob = (view.bob + dt * 1.6) % 1;
  R.vm.bob = 0;
  if (R.vm.spin > 0 && state.pending) R.vm.spin += dt; else R.vm.spin = 0;
  R.vm.dead += ((p.fx.dead > 0 ? 1 : 0) - R.vm.dead) * Math.min(1, dt * 6);
  if (now - lastHud > 120) { lastHud = now; $('hp-num').textContent = Math.round(p.hp); $('hp-fill').style.width = Math.round(p.hp) + '%'; }
  R.update(state, view, dt);
}

// ---- the list ---------------------------------------------------------------------------------------------------------
const KINDS = {
  beam: 'an instant line from the muzzle', bolt: 'flies straight from the muzzle', lob: 'arcs through the air and lands', stream: 'a cone of many small things',
  area: 'appears at the aim point', drop: 'falls from the ceiling onto the aim point', melee: 'a reach attack from the muzzle', train: 'sweeps the whole row and breaks walls',
  summon: 'a creature that hunts on its own', self: 'happens to you', swap: 'trades places', recurse: 'fires another gag when it lands', plate: 'nothing but the words',
};
const TIER_WORDS = { dispatch: 'DISPATCH — it kills', weird: 'WEIRD — it works, oddly', dud: 'DUD — nothing much', backfire: 'BACKFIRE — it hurts you' };
const HAZ = { slow: 'slows anyone in it', dps: 'hurts anyone standing in it', fall: 'a hole — anyone in it drops' };
const list = $('list');
const rows = new Map();
let current = prefs.pick && T.byId[prefs.pick] ? prefs.pick : T.GAGS[0].id;
let notes = { notes: [], updates: {}, seen: {} };
function buildList() {
  list.innerHTML = '';
  for (const tier of T.TIERS) {
    const h = document.createElement('h3'); h.textContent = tier; const n = T.GAGS.filter((g) => g.tier === tier).length; h.innerHTML = tier + '<span>' + n + '</span>'; list.appendChild(h);
    for (const g of T.GAGS) {
      if (g.tier !== tier) continue;
      const r = document.createElement('div'); r.className = 'row'; r.dataset.id = g.id;
      r.innerHTML = `<i class="dot hidden"></i><span class="nm">${g.name}</span><span class="k">${g.kind}</span>`;
      r.addEventListener('click', () => pick(g.id));
      list.appendChild(r); rows.set(g.id, r);
    }
  }
}
function unseen(id) { const u = notes.updates[id]; return !!(u && (!notes.seen[id] || u.at > notes.seen[id])); }
function openNotes(id) { return notes.notes.filter((n) => n.gag === id && n.status === 'new').length; }
function syncRows() {
  let updated = 0;
  for (const [id, r] of rows) {
    r.classList.toggle('on', id === current);
    const dot = r.querySelector('.dot'); const u = unseen(id); dot.classList.toggle('hidden', !u); if (notes.updates[id]) updated++;
    let pend = r.querySelector('.pend'); const o = openNotes(id) > 0;
    if (o && !pend) { pend = document.createElement('i'); pend.className = 'pend'; pend.title = 'a note is waiting'; r.insertBefore(pend, r.querySelector('.k')); }
    if (!o && pend) pend.remove();
  }
  $('cnt-total').textContent = T.GAGS.length;
  $('cnt-updates').textContent = updated;
  $('cnt-open').textContent = notes.notes.filter((n) => n.status === 'new').length;
  const badge = Object.keys(notes.updates).filter(unseen).length;
  document.title = (badge ? '(' + badge + ') ' : '') + 'Jabberwocky — the weapon lab';
}
function stepPick(d) { const ids = [...rows.keys()].filter((id) => !rows.get(id).classList.contains('hid')); const i = ids.indexOf(current); pick(ids[(i + d + ids.length) % ids.length]); }
function pick(id) {
  current = id; prefs.pick = id; savePrefs();
  state.opts.forceGag = id;
  $('hud-weapon').textContent = T.byId[id].name;
  const r = rows.get(id); if (r) r.scrollIntoView({ block: 'nearest' });
  if (unseen(id)) post({ op: 'seen', gag: id }).then((d) => { if (d) { notes = d; syncRows(); } });
  syncRows(); showDetail();
}
$('search').addEventListener('input', () => {
  const s = $('search').value.trim().toLowerCase();
  for (const [id, r] of rows) { const g = T.byId[id]; r.classList.toggle('hid', !!s && !(g.name.toLowerCase().includes(s) || g.kind.includes(s) || (g.outcome || '').includes(s) || id.includes(s))); }
  list.querySelectorAll('h3').forEach((h) => { let n = h.nextElementSibling, any = false; while (n && n.tagName !== 'H3') { if (!n.classList.contains('hid')) any = true; n = n.nextElementSibling; } h.style.display = any ? '' : 'none'; });
});

function facts(g) {
  const f = [];
  f.push(['tier', TIER_WORDS[g.tier]]);
  f.push(['how', KINDS[g.kind] || g.kind]);
  const oc = g.outcome ? T.OUTCOMES[g.outcome] : null;
  if (oc) f.push(['the victim is', (g.verb || oc.verb) + (oc.lethal === false ? ' (not killed)' : '') + (g.altOutcome ? ' · or ' + (T.OUTCOMES[g.altOutcome] ? T.OUTCOMES[g.altOutcome].verb : g.altOutcome) + ' (' + Math.round((g.altChance || 0) * 100) + '%)' : '')]);
  else if (g.tier === 'dud') f.push(['the victim is', 'unharmed']);
  const nums = [];
  if (g.count) nums.push(g.count + ' of them'); if (g.speed) nums.push(g.speed + ' cells/s'); if (g.range) nums.push('reach ' + g.range); if (g.reach) nums.push('reach ' + g.reach);
  if (g.splash) nums.push('splash ' + g.splash); if (g.r) nums.push('radius ' + g.r); if (g.dur) nums.push(g.dur + ' s'); if (g.life) nums.push('lives ' + g.life + ' s'); if (g.rate) nums.push(g.rate + '/s');
  if (g.pierce) nums.push('pierces'); if (g.walls) nums.push('through walls'); if (g.returns) nums.push('comes back'); if (g.backwards) nums.push('fires backwards'); if (g.breaks) nums.push('breaks ' + g.breaks + ' walls');
  if (nums.length) f.push(['numbers', nums.join(' · ')]);
  if (g.dmg != null && g.tier === 'backfire') f.push(['to you', g.dmg + ' damage' + (g.effect ? ' · ' + g.effect + (g.dur ? ' for ' + g.dur + ' s' : '') : '') + (g.knock ? ' · knocked back ' + g.knock : '')]);
  if (g.selfDmg || g.selfSplash) f.push(['to you', (g.selfDmg || g.selfSplash) + ' damage if it reaches you']);
  if (g.scar) { const s = T.SCARS[g.scar]; f.push(['leaves', g.scar + (s && s.hazard ? ' — ' + HAZ[s.hazard] : '') + (s && s.life ? ' · fades in ' + s.life + ' s' : '')]); }
  f.push(['looks like', g.sprite === 'none' ? 'nothing you can see' : g.sprite]);
  f.push(['sounds like', g.sound || '—']);
  return f;
}
function showDetail() {
  const g = T.byId[current];
  $('d-name').textContent = g.name; $('d-name').className = g.tier;
  $('d-line').textContent = g.line || '';
  $('d-facts').innerHTML = facts(g).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  const u = notes.updates[current];
  $('d-update').classList.toggle('show', !!u);
  if (u) { $('d-update-text').textContent = u.note || 'changed'; $('d-update-when').textContent = when(u.at); }
  $('w-note').value = '';
  $('w-notes').innerHTML = notes.notes.filter((n) => n.gag === current).slice().reverse().map(noteHtml).join('');
  wireNoteButtons($('w-notes'));
}
function when(iso) { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function noteHtml(n) {
  return `<div class="note" data-id="${n.id}"><div class="meta"><span class="${n.status}">${n.status === 'done' ? 'done' : 'waiting'}</span><span>${when(n.at)}</span>${n.status === 'new' ? '<button data-del type="button">delete</button>' : ''}</div><div class="txt">${esc(n.text)}</div>${n.reply ? `<div class="rep">${esc(n.reply)}</div>` : ''}</div>`;
}
function wireNoteButtons(root) { root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { const id = b.closest('.note').dataset.id; const d = await post({ op: 'delete', id }); if (d) { notes = d; syncRows(); showDetail(); showGeneral(); } })); }
function showGeneral() {
  const gs = notes.notes.filter((n) => !n.gag);
  $('g-notes').innerHTML = gs.slice().reverse().map(noteHtml).join('');
  wireNoteButtons($('g-notes'));
  const open = gs.filter((n) => n.status === 'new').length;
  $('general-cnt').textContent = ($('general').classList.contains('closed') ? '▸ open' : '▾ close') + (gs.length ? ' · ' + gs.length + (open ? ' (' + open + ' waiting)' : '') : '');
}
$('general-h').addEventListener('click', () => { $('general').classList.toggle('closed'); showGeneral(); });

// ---- notes: the file on disk ---------------------------------------------------------------------------------------------
async function post(op) {
  if (!served) { $('sync').textContent = 'notes need the local server'; return null; }
  try { const r = await fetch(NOTES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op) }); if (!r.ok) throw new Error((await r.json()).error || r.status); return await r.json(); }
  catch (e) { $('sync').textContent = 'save failed: ' + e.message; return null; }
}
async function saveNote(gag, ta, st) {
  const text = ta.value.trim(); if (!text) return;
  st.textContent = 'saving…';
  const d = await post({ op: 'add', gag, text });
  if (!d) { st.textContent = 'not saved'; return; }
  notes = d; ta.value = '';
  askNotify();
  syncRows(); showDetail(); showGeneral();
  st.textContent = 'saved · Claude checks every ten seconds';
}
$('w-note-save').addEventListener('click', () => saveNote(current, $('w-note'), $('w-note-st')));
$('g-note-save').addEventListener('click', () => saveNote(null, $('g-note'), $('g-note-st')));
for (const id of ['w-note', 'g-note']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $(id + '-save').click(); });

let lastUpdateKeys = null;
async function poll() {
  if (!served) return;
  try {
    const d = await (await fetch(NOTES_URL, { cache: 'no-store' })).json();
    const before = lastUpdateKeys;
    const nowKeys = Object.entries(d.updates || {}).map(([id, u]) => id + '@' + u.at);
    notes = d;
    $('sync').textContent = 'synced ' + new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (before) {
      const fresh = nowKeys.filter((k) => !before.includes(k));
      if (fresh.length) announce(fresh.map((k) => k.split('@')[0]));
    }
    lastUpdateKeys = nowKeys;
    syncRows(); showDetail(); showGeneral();
  } catch (e) { $('sync').textContent = 'notes offline'; }
}
function announce(ids) {
  const names = ids.map((id) => T.byId[id] ? T.byId[id].name : id);
  const t = $('toast'); t.innerHTML = '<b>UPDATED</b> · ' + names.join(' · ') + '<br><small style="color:var(--ink-dim)">' + esc((notes.updates[ids[0]] || {}).note || '') + '</small>';
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 7000);
  try { Sfx.play('key'); } catch (e) {}
  if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('Weapon lab: ' + names.join(', '), { body: (notes.updates[ids[0]] || {}).note || 'updated', silent: true }); } catch (e) {} }
}
function askNotify() { if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} } }

// ---- go ------------------------------------------------------------------------------------------------------------
buildList();
pick(current);
poll(); setInterval(poll, POLL_MS);
R.load((k) => { $('load').textContent = 'LOADING THE DUNGEON ' + Math.round(k * 100) + '%'; }).then(() => { $('load').classList.add('off'); });
requestAnimationFrame(frame);
globalThis.LAB = { get state() { return state; }, R, C, T, pick, reset, input, view, lookBank, setMouse, get notes() { return notes; }, poll, step: (n) => { for (let i = 0; i < n; i++) simTick(1 / 60); } };
