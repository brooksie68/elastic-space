// Jabberwocky — THE WEAPON LAB (2026-09-07). One bare hall, three passive creatures on pads that come back
// two seconds after they die, every weapon in a list with what it is and what it does, and a notes file
// that Claude reads from disk (`notes.json` via /api/worlds/jabberwocky/notes). The page polls the file
// every ten seconds; a weapon Claude has changed since you last opened it shows a green dot, and the
// change arrives as a toast. Same core, same renderer, same sound as the game.
// 2026-09-08: the note boxes keep what you type until you SUBMIT (the poll used to wipe them every ten
// seconds — his "the first line disappears"); drafts ride in localStorage per weapon; a 1–5 RANK per weapon
// saves the moment it is picked (`ranks` in notes.json), shows on the row, and rides along on the next note.
// Same day, PASSED / TRASH: a verdict switch under the facts moves a weapon to a section at the bottom of the list
// with its notes (`verdicts` in notes.json); trash also has the server write cuts.js, and the game's roll skips
// those ids from its next load. Then the ACTION dropdown by SUBMIT (update — the default — / pass / trash): the
// note carries its verdict, applied by the server in the same save, so he never has to write it in the note.
import { createRenderer } from './render3d.js?v=33';
import { yawFromCursor, pitchFromCursor, edgePush } from './cursor-aim.js?v=1';

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
const drafts = prefs.drafts && typeof prefs.drafts === 'object' ? prefs.drafts : (prefs.drafts = {});   // typed, not yet submitted: per weapon id, '_general' for the general box

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
// no music in the lab, ever (James) — the effects and the room bed only, one volume
Sfx.setMusic(false);
// no shared speaker in the lab (James): sound starts on the first click or key in the room, the SOUND button in the bar mutes it
let soundOn = prefs.sound !== false, soundStarted = false;
function soundUi() { $('sound').classList.toggle('go', soundOn); $('sound').textContent = soundOn ? 'SOUND' : 'MUTED'; }
function startSound() { if (SILENT || !soundOn || soundStarted) return; soundStarted = true; try { Sfx.start(); } catch (e) {} }
$('sound').addEventListener('click', () => { soundOn = !soundOn; prefs.sound = soundOn; savePrefs(); soundUi(); if (soundOn) { soundStarted = false; startSound(); } else { soundStarted = false; try { Sfx.stop(); } catch (e) {} } });
soundUi();
canvas.addEventListener('mousedown', startSound); addEventListener('keydown', (e) => { if (!typing(e)) startSound(); });
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
// Two mouse modes (James, first flight: "I'm trapped"; then the cursor-aim conversation). CURSOR is the default:
// the mouse is a real cursor, the reticle rides it, the rifle points at it, left click fires; the camera turns on
// the arrow keys, by pushing the cursor into the left/right edge of the room, or by holding the right button and
// dragging. CAPTURED is the game's mouse look: click the room to take the mouse, esc gives it back. ?nolock=1 = cursor.
// 2026-09-08 James: in the lab the mouse moves the cursor and the rifle follows; the camera turns ONLY on a right-button
// drag or the keys (A/D, arrows) — the edge push that turned him whenever the cursor neared the sides is gone.
let mouseMode = 'cursor';
const cursor = { x: 0, y: 0, in: false, push: 0, pitchPush: 0 };
const EDGE = 0.1;
const playW = () => innerWidth - 400, playH = () => innerHeight;
const locked = () => mouseMode === 'cursor' || document.pointerLockElement === canvas;
function lock() { if (mouseMode === 'cursor' || locked()) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
let dragLook = false;
canvas.addEventListener('mousedown', (e) => {
  if (mouseMode === 'cursor') { if (e.button === 2) dragLook = true; else if (e.button === 0) input.fire = true; return; }
  if (!locked()) { lock(); return; }
  if (e.button === 0) input.fire = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; if (e.button === 2) dragLook = false; });
addEventListener('mousemove', (e) => {
  if (mouseMode === 'cursor') {
    cursor.x = e.clientX; cursor.y = e.clientY; cursor.in = e.clientX < playW();
    if (dragLook) { lookBank.x += e.movementX * 0.0022 * sens; lookBank.y += e.movementY * 0.0022 * sens; }   // hold the right button to look; nothing else about the mouse turns the camera
    return;
  }
  if (!locked()) return;
  lookBank.x += e.movementX * 0.0022 * sens; lookBank.y += e.movementY * 0.0022 * sens;
});
canvas.addEventListener('mouseleave', () => { cursor.in = false; });
// each frame under cursor aim: the aim offset from the cursor, the reticle on it, the edge push into the turn
const cross = $('cross');
function aimFromCursor(dt) {
  const p = state.player;
  if (mouseMode !== 'cursor' || !cursor.in) { p.aim = 0; R.vm.aim += (0 - R.vm.aim) * Math.min(1, dt * 10); R.vm.aimY += (0 - R.vm.aimY) * Math.min(1, dt * 10); cross.style.left = ''; cross.style.top = ''; cursor.push = 0; return; }
  const w = innerWidth, h = innerHeight;   // the camera fills the whole window (the panel just covers its right edge), so the centre + fov are the window's
  p.aim = yawFromCursor(cursor.x, w, h, look.fov || 76);
  const py = pitchFromCursor(cursor.y, h, look.fov || 76);
  R.vm.aim += (p.aim * 0.9 - R.vm.aim) * Math.min(1, dt * 14);
  R.vm.aimY += (py - R.vm.aimY) * Math.min(1, dt * 14);
  cross.style.left = cursor.x + 'px'; cross.style.top = cursor.y + 'px';
  cursor.push = 0; cursor.pitchPush = 0;   // no edge push: the mouse never turns the camera here (James)
}
function setMouse(m) {
  mouseMode = m; prefs.mouse = m; savePrefs(); dragLook = false; cursor.in = false;
  if (m === 'cursor') unlock();
  state.player.aim = 0;
  $('keys').innerHTML = '<b>the rifle points at the cursor</b> · <b>left click</b> fires · <b>W</b>/<b>S</b> move · <b>A</b>/<b>D</b> or <b>arrows</b> turn · <b>Q</b>/<b>E</b> strafe · <b>right-drag</b> looks · <b>[</b>/<b>]</b> previous/next weapon · <b>R</b> reset · <b>1–4</b> a tier';
}
setMouse(mouseMode);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
addEventListener('keydown', (e) => {
  if (typing(e)) return;
  keys[e.code] = true;
  if (e.code === 'Space') { input.fire = true; e.preventDefault(); }
  if (e.code === 'BracketLeft') stepPick(-1);
  if (e.code === 'BracketRight') stepPick(1);
  if (e.code === 'KeyR') { reset(); hint('RESET'); }
  if (e.code >= 'Digit1' && e.code <= 'Digit4') { const tier = T.TIERS[+e.code.slice(5) - 1]; const g = T.GAGS.find((x) => x.tier === tier && verdictOf(x.id) === 'review') || T.GAGS.find((x) => x.tier === tier); if (g) pick(g.id); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') input.fire = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.fire = false; });
function readKeys() {
  input.fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  input.strafe = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
  input.turn = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
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
      case 'pull': Sfx.play('pull'); Sfx.reel(state.opts.revealDelay); if (e.gag.id === 'baseballs') setTimeout(() => Sfx.play('batterup'), Math.max(0, state.opts.revealDelay * 1000 - 100));   // BATTER UP a tenth before the balls fly (James) R.vm.spin = 0.001; R.vm.mood = e.gag.tier === 'dud' || e.gag.tier === 'backfire' ? 'shudder' : BIG.has(e.gag.id) ? 'purr' : 'idle'; break;
      case 'fire': R.fire(); Sfx.play(e.empty ? 'pull' : e.gag.sound, e.little ? pan(e.x, e.y) : 0); Sfx.reveal(e.gag.tier); showPlate(state.plate); if (e.gag.kind === 'melee' || e.gag.kind === 'self') R.shake(0.5); break;
      case 'kill': { const oc = () => Sfx.outcome(e.outcome, pan(e.x, e.y)); if (e.gag && e.gag.id === 'baseballs') setTimeout(oc, 260); else if (e.gag && e.gag.id === 'fist') Sfx.play('punch', pan(e.x, e.y)); else if (e.gag && e.gag.id === 'eagle') { /* the eagle's sound plays at the trigger; the hit is silent */ } else oc(); }   // the fist lands with James's punch.mp3 if (e.outcome !== 'pacify' && e.outcome !== 'vapor') R.strike(e.x, e.y); if (e.outcome === 'gib' || e.outcome === 'inflate') setTimeout(() => Sfx.play('crunch', pan(e.x, e.y)), 90); if (e.outcome === 'fling') setTimeout(() => Sfx.play('wallsplat', pan(e.x, e.y)), 560); break;
      case 'pacify': Sfx.play('pacify', pan(e.goon.x, e.goon.y)); break;
      case 'hurt': R.shake(0.6); Sfx.play('hurt'); break;
      case 'death': Sfx.play('death'); hint('THAT ONE KILLED YOU · NEVER MIND', 2600); state.phase = 'play'; state.player.hp = 100; break;
      case 'splat': Sfx.play('splat', pan(e.x, e.y)); break;
      case 'boom': Sfx.play(e.gag.splashSound || 'boom', pan(e.x, e.y)); R.boom(e.x, e.y, e.r, e.gag.id); break;   // a pie lands wet, not with an explosion
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
let last = performance.now(), lastHud = 0, sizeW = 0, sizeH = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; view.t += dt;
  if (canvas.clientWidth !== sizeW || canvas.clientHeight !== sizeH) { sizeW = canvas.clientWidth; sizeH = canvas.clientHeight; R.resize(); }   // a missed resize event would skew the aim
  readKeys();
  aimFromCursor(dt);
  if (cursor.push) input.turn += cursor.push * 0.8;
  if (cursor.pitchPush) view.pitch = Math.max(-1, Math.min(1, view.pitch - cursor.pitchPush * dt * 1.2));
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
let notes = { notes: [], updates: {}, seen: {}, ranks: {}, verdicts: {} };
function verdictOf(id) { const v = (notes.verdicts || {})[id]; return v && v.status ? v.status : 'review'; }
let listKey = null;
// the four tiers hold what is still in review; PASSED and TRASH sit at the bottom and only show when they hold something
function buildList() {
  list.innerHTML = ''; rows.clear();
  const sections = T.TIERS.map((tier) => [tier, T.GAGS.filter((g) => g.tier === tier && verdictOf(g.id) === 'review')]);
  for (const v of ['passed', 'trash']) { const gs = T.GAGS.filter((g) => verdictOf(g.id) === v); if (gs.length) sections.push([v, gs]); }
  for (const [key, gags] of sections) {
    const h = document.createElement('h3'); h.className = key; h.innerHTML = key + '<span>' + gags.length + '</span>'; list.appendChild(h);
    const moved = key === 'passed' || key === 'trash';
    for (const g of gags) {
      const r = document.createElement('div'); r.className = 'row' + (key === 'trash' ? ' trash' : ''); r.dataset.id = g.id;
      r.innerHTML = `<i class="dot hidden"></i><span class="nm">${g.name}</span><b class="rk"></b><span class="k">${moved ? g.tier + ' · ' : ''}${g.kind}</span>`;
      r.addEventListener('click', () => pick(g.id));
      list.appendChild(r); rows.set(g.id, r);
    }
  }
  listKey = JSON.stringify(notes.verdicts || {});
  if ($('search').value) $('search').dispatchEvent(new Event('input'));   // keep a live filter applied
}
function unseen(id) { const u = notes.updates[id]; return !!(u && (!notes.seen[id] || u.at > notes.seen[id])); }
function rankOf(id) { const r = (notes.ranks || {})[id]; return r && r.rank ? r.rank : 0; }
function openNotes(id) { return notes.notes.filter((n) => n.gag === id && n.status === 'new').length; }
function syncRows() {
  let updated = 0;
  if (JSON.stringify(notes.verdicts || {}) !== listKey) buildList();   // a verdict moved a row: regroup
  for (const [id, r] of rows) {
    r.classList.toggle('on', id === current);
    const dot = r.querySelector('.dot'); const u = unseen(id); dot.classList.toggle('hidden', !u); if (notes.updates[id]) updated++;
    const rk = rankOf(id); r.querySelector('.rk').textContent = rk ? String(rk) : '';
    let pend = r.querySelector('.pend'); const o = openNotes(id) > 0;
    if (o && !pend) { pend = document.createElement('i'); pend.className = 'pend'; pend.title = 'a note is waiting'; r.insertBefore(pend, r.querySelector('.k')); }
    if (!o && pend) pend.remove();
  }
  $('cnt-total').textContent = T.GAGS.length;
  $('cnt-passed').textContent = T.GAGS.filter((g) => verdictOf(g.id) === 'passed').length;
  $('cnt-trash').textContent = T.GAGS.filter((g) => verdictOf(g.id) === 'trash').length;
  $('cnt-updates').textContent = updated;
  $('cnt-open').textContent = notes.notes.filter((n) => n.status === 'new').length;
  const badge = Object.keys(notes.updates).filter(unseen).length;
  document.title = (badge ? '(' + badge + ') ' : '') + 'Jabberwocky — the weapon lab';
}
function stepPick(d) { const ids = [...rows.keys()].filter((id) => !rows.get(id).classList.contains('hid')); const i = ids.indexOf(current); pick(ids[(i + d + ids.length) % ids.length]); }
function pick(id) {
  $('w-note').value = drafts[id] || '';   // the box follows the weapon; what was typed for another one keeps
  $('w-action').value = 'update';   // the action is per note: back to the default
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
  const v = verdictOf(current); $('verdict').querySelectorAll('button').forEach((b) => b.classList.toggle('go', b.dataset.v === v));
  const u = notes.updates[current];
  $('d-update').classList.toggle('show', !!u);
  if (u) { $('d-update-text').textContent = u.note || 'changed'; $('d-update-when').textContent = when(u.at); }
  const rk = String(rankOf(current)); if ($('w-rank').value !== rk) $('w-rank').value = rk;   // never touch the note box here: the poll calls this while he types
  $('w-notes').innerHTML = notes.notes.filter((n) => n.gag === current).slice().reverse().map(noteHtml).join('');
  wireNoteButtons($('w-notes'));
}
function when(iso) { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function noteHtml(n) {
  return `<div class="note" data-id="${n.id}"><div class="meta"><span class="${n.status}">${n.status === 'done' ? 'done' : 'waiting'}</span><span>${when(n.at)}</span>${n.rank ? '<span class="rk">rank ' + n.rank + '</span>' : ''}${n.action ? '<span class="ac ' + n.action + '">' + n.action + '</span>' : ''}${n.status === 'new' ? '<button data-del type="button">delete</button>' : ''}</div><div class="txt">${esc(n.text)}</div>${n.reply ? `<div class="rep">${esc(n.reply)}</div>` : ''}</div>`;
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
  const text = ta.value.trim();
  const rank = gag ? rankOf(gag) : 0, action = gag ? $('w-action').value : null;
  if (!text) {
    // an empty box with pass / trash picked is a plain move (James: "select pass… press submit… immediately")
    if (gag && action && action !== 'update') { $('verdict').querySelector('[data-v=' + (action === 'pass' ? 'passed' : 'trash') + ']').click(); $('w-action').value = 'update'; return; }
    st.textContent = 'nothing to submit'; return;
  }
  st.textContent = 'saving…';
  const op = { op: 'add', gag, text }; if (rank) op.rank = rank; if (action) op.action = action;
  const d = await post(op);
  if (!d) { st.textContent = 'not saved'; return; }
  notes = d; ta.value = ''; delete drafts[gag || '_general']; savePrefs();
  if (gag) $('w-action').value = 'update';
  askNotify();
  syncRows(); showDetail(); showGeneral();
  if (gag) { const r = rows.get(gag); if (r) r.scrollIntoView({ block: 'nearest' }); }   // pass / trash moved the row
  st.textContent = action === 'pass' ? 'submitted · moved to PASSED with this note' : action === 'trash' ? 'submitted · moved to TRASH · out of the game from its next load' : 'submitted · Claude checks every ten seconds';
}
$('w-note-save').addEventListener('click', () => saveNote(current, $('w-note'), $('w-note-st')));
$('g-note-save').addEventListener('click', () => saveNote(null, $('g-note'), $('g-note-st')));
for (const id of ['w-note', 'g-note']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $(id + '-save').click(); });
$('w-note').addEventListener('input', () => { drafts[current] = $('w-note').value; savePrefs(); });
$('g-note').addEventListener('input', () => { drafts._general = $('g-note').value; savePrefs(); });
$('g-note').value = drafts._general || '';
// the 1–5 rank: saves the moment it is picked, shows on the row, rides along on any note submitted after it
$('w-rank').addEventListener('change', async () => {
  const rank = +$('w-rank').value || 0, gag = current, st = $('w-note-st');
  st.textContent = 'saving rank…';
  const d = await post({ op: 'rank', gag, rank });
  if (!d) { st.textContent = 'rank not saved'; return; }
  notes = d; syncRows();
  st.textContent = rank ? 'rank ' + rank + ' saved' : 'rank cleared';
});
// the verdict: IN REVIEW (the tier list) / PASSED / TRASH — the row moves to its section with everything on it
$('verdict').querySelectorAll('button').forEach((b) => b.addEventListener('click', async () => {
  const status = b.dataset.v, gag = current;
  if (status === verdictOf(gag)) return;
  const d = await post({ op: 'verdict', gag, status });
  if (!d) return;
  notes = d; syncRows(); showDetail();
  hint(status === 'review' ? 'BACK IN THE LIST' : status === 'passed' ? 'PASSED · MOVED WITH ITS NOTES' : 'TRASHED · OUT OF THE GAME FROM ITS NEXT LOAD', 2400);
  const r = rows.get(gag); if (r) r.scrollIntoView({ block: 'nearest' });
}));

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
globalThis.LAB = { get state() { return state; }, R, C, T, pick, reset, input, view, lookBank, setMouse, cursor, aimFromCursor, get notes() { return notes; }, poll, step: (n) => { for (let i = 0; i < n; i++) simTick(1 / 60); } };
