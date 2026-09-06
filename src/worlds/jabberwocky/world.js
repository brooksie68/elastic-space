// Jabberwocky — the host. Input, the loop, the HUD, the cards, the plate, the corner map, the
// configuration panel, sound routing, and the three ways out. All game logic lives in core.js; all
// drawing lives in render3d.js (three.js). This file is a module because the renderer is.
import { createRenderer, S } from './render3d.js?v=3';

const C = globalThis.JabberwockyCore, T = globalThis.JABBERWOCKY_GAGS, Sfx = globalThis.JabberwockySfx;
const $ = (id) => document.getElementById(id);
const served = location.protocol !== 'file:';
const TAU = Math.PI * 2;

// ---- settings ------------------------------------------------------------------------------------
const PLAY_KEY = 'jabberwocky-play-v2', LOOK_KEY = 'jabberwocky-look-v2', UI_KEY = 'jabberwocky-ui-v1';
const PLAY_DEFAULTS = { odds: { dispatch: 60, weird: 25, dud: 10, backfire: 5 }, goonMul: 1, goonSpeed: 1, damageMul: 1, fireCool: 0.9, revealDelay: 0.28, bossFire: 2.4, moveSpeed: 2.0, sens: 0.75, map: 1, startLevel: 1, seed: '', forceGag: '' };
const LOOK_RANGES = {
  fov:         { label: 'Field of view', min: 60, max: 100, step: 1, def: 76, sum: 'Wider sees more of the corridor at once.' },
  fog:         { label: 'Fog distance', min: 10, max: 60, step: 1, def: 34, sum: 'How far down a hall you can see before it goes dark. In metres.' },
  res:         { label: 'Render scale', min: 0.5, max: 1, step: 0.05, def: 1, sum: 'One is native resolution. Lower if the frame rate drops.' },
  brightness:  { label: 'Brightness', min: 0.5, max: 2, step: 0.05, def: 1, sum: 'The overall light level.' },
  torchLight:  { label: 'Torch light', min: 0, max: 2, step: 0.05, def: 1, sum: 'How much the torches carry.' },
  bob:         { label: 'Head bob', min: 0, max: 1, step: 0.05, def: 0, sum: 'Zero is steady. Leave it there if motion bothers you.' },
  shake:       { label: 'Shake', min: 0, max: 1, step: 0.05, def: 0.25, sum: 'Camera kick on hits and impacts.' },
  spriteScale: { label: 'Gag size', min: 0.6, max: 1.6, step: 0.05, def: 1, sum: 'Everything the rifle fires, scaled.' },
  decalScale:  { label: 'Scar size', min: 0.5, max: 2, step: 0.05, def: 1, sum: 'The mess on the floor, scaled.' },
  plateSize:   { label: 'Plate size', min: 0.6, max: 1.6, step: 0.05, def: 1, sum: 'The words that flash when the rifle does something.' },
  vmX:         { label: 'Rifle — right', min: 0, max: 0.6, step: 0.01, def: 0.26, sum: 'Where the rifle sits in your hands.' },
  vmY:         { label: 'Rifle — down', min: -0.6, max: 0, step: 0.01, def: -0.3, sum: '' },
  vmZ:         { label: 'Rifle — out', min: -1.2, max: -0.3, step: 0.01, def: -0.78, sum: '' },
  vmScale:     { label: 'Rifle — size', min: 0.5, max: 1.6, step: 0.02, def: 1, sum: '' },
};
const DEFAULT_LOOK = {}; for (const k in LOOK_RANGES) DEFAULT_LOOK[k] = LOOK_RANGES[k].def;
function deepMerge(a, b) { const o = Array.isArray(a) ? [] : {}; for (const k in a) o[k] = a[k] && typeof a[k] === 'object' ? deepMerge(a[k], (b && b[k]) || {}) : (b && k in b ? b[k] : a[k]); for (const k in b) if (!(k in o)) o[k] = b[k]; return o; }
function load(key, def) { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); return deepMerge(def, s || {}); } catch (e) { return deepMerge(def, {}); } }
function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }
let play = load(PLAY_KEY, PLAY_DEFAULTS), look = load(LOOK_KEY, DEFAULT_LOOK), ui = load(UI_KEY, { scale: 1 });

// ---- renderer + overlay ----------------------------------------------------------------------------
const canvas = $('view');
const R = createRenderer(canvas);
const overlay = $('overlay'), octx = overlay.getContext('2d');
function resize() { R.setLook(look); R.resize(); overlay.width = Math.round(innerWidth * Math.min(2, devicePixelRatio || 1) * 0.5); overlay.height = Math.round(innerHeight * Math.min(2, devicePixelRatio || 1) * 0.5); }
addEventListener('resize', resize);

// ---- sound -------------------------------------------------------------------------------------------
// ?silent=1 never attaches sound at all (for headless looks in the browser pane)
const SILENT = new URLSearchParams(location.search).get('silent') === '1';
if (window.ElasticSoundControl && !SILENT) ElasticSoundControl.attach({
  start: () => Sfx.start(), stop: () => Sfx.stop(), setVolume: (v) => Sfx.setVolume(v),
  channels: [{ label: 'music', value: Sfx.musicLevel, setVolume: (v) => Sfx.setMusicVolume(v) }],
});
function pan(x, y) { if (!state) return 0; const p = state.player; const a = Math.atan2(y - p.y, x - p.x) - p.a; return Math.sin(a) * 0.8; }

// ---- state ---------------------------------------------------------------------------------------------
let state = null;
let mode = 'attract';          // attract | play | paused | card | dead | won | drifting
const view = { t: 0, bob: 0, pitch: 0 };
const anim = { bob: 0 };
const fx = { hurt: 0 };
const input = { fwd: 0, strafe: 0, turn: 0, look: 0, fire: false, run: false };
const lookBank = { x: 0, y: 0 };   // mouse motion waiting to be spent
const LOOK_EASE = 14;              // per second: ~70 ms to settle; higher = snappier
const keys = {};
let seen = new Set(), seenLevel = null;
let noticeT = 0, cardTimer = null, lastHud = 0;
const BIG = new Set(['train', 'blackhole', 'meteor', 'sand', 'tent', 'tornado', 'piano', 'bus']);

function opts() {
  return { odds: Object.assign({}, play.odds), goonMul: play.goonMul, goonSpeed: play.goonSpeed, damageMul: play.damageMul, fireCool: play.fireCool, revealDelay: play.revealDelay, bossFire: play.bossFire, moveSpeed: play.moveSpeed, seed: play.seed, forceGag: play.forceGag, startLevel: play.startLevel };
}
function liveOpts() { if (!state) return; Object.assign(state.opts, { goonSpeed: play.goonSpeed, damageMul: play.damageMul, fireCool: play.fireCool, revealDelay: play.revealDelay, bossFire: play.bossFire, moveSpeed: play.moveSpeed, forceGag: play.forceGag }); state.opts.odds = Object.assign({}, play.odds); }

// ---- input --------------------------------------------------------------------------------------------
// ?nolock=1 plays without capturing the mouse (arrow keys turn) — for headless checks and anyone who hates pointer lock
const NOLOCK = new URLSearchParams(location.search).get('nolock') === '1';
const locked = () => NOLOCK || document.pointerLockElement === canvas;
function lock() { if (NOLOCK) return; if (!locked()) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
function unlock() { if (!NOLOCK && document.pointerLockElement === canvas) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => {
  if (NOLOCK) return;
  if (!locked() && mode === 'play') pause();
  $('hint').classList.toggle('show', mode === 'play' && !locked());
});
canvas.addEventListener('mousedown', (e) => {
  if (mode !== 'play') return;
  if (!locked()) { lock(); return; }
  if (e.button === 0) input.fire = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; });
addEventListener('mousemove', (e) => {
  if (mode !== 'play' || !locked()) return;
  // the mouse feeds a bank; each frame drains a share of it so the turn eases instead of jumping (James: "herky jerky")
  lookBank.x += e.movementX * 0.0022 * play.sens;
  lookBank.y += e.movementY * 0.0022 * play.sens;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  keys[e.code] = true;
  if (e.code === 'Space') { input.fire = true; e.preventDefault(); }
  if (e.code === 'KeyP') { if (mode === 'play') pause(); else if (mode === 'paused') resume(); }
  if (e.code === 'KeyC') { if (tuner.classList.contains('open')) closeTuner(); else openTuner(); }   // configuration from the keyboard: the mouse is locked while you play
  if (e.code === 'KeyM') { play.map = play.map ? 0 : 1; save(PLAY_KEY, play); syncPlayUI(); }
  if (mode === 'card' && cardTimer && (e.code === 'Space' || e.code === 'Enter')) skipCard();
  if (mode === 'attract' && e.code === 'Enter') begin();
  if (mode === 'won' && e.code === 'Enter') { hideCard(); begin(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') input.fire = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.fire = false; });
function readKeys() {
  input.fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  input.strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  input.turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  input.run = !!(keys.ShiftLeft || keys.ShiftRight);
}

// ---- cards ------------------------------------------------------------------------------------------
const card = $('card');
let cardAction = null;
function showCard(o) {
  $('card-kicker').textContent = o.kicker || '';
  $('card-title').textContent = o.title || '';
  $('card-title').classList.toggle('red', !!o.red);
  $('card-sub').textContent = o.sub || '';
  $('card-lines').innerHTML = (o.lines || []).map((l) => `<div>${l}</div>`).join('');
  $('card-btn').textContent = o.btn || '';
  $('card-btn').style.display = o.btn ? '' : 'none';
  $('card-btn').disabled = !!o.disabled;
  $('card-keys').innerHTML = o.keys || '';
  card.classList.add('show');
  cardAction = o.action || null;
  if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; }
  if (o.auto) cardTimer = setTimeout(skipCard, o.auto);
}
function hideCard() { card.classList.remove('show'); if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; } }
function skipCard() { if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; } if (cardAction) { const a = cardAction; cardAction = null; a(); } }
$('card-btn').addEventListener('click', () => skipCard());
card.addEventListener('click', () => { if (mode === 'card' && cardTimer) skipCard(); });

const KEYS_LINE = '<b>WASD</b> walk · <b>mouse</b> look · <b>click</b> or <b>space</b> fires · <b>shift</b> runs · <b>M</b> map · <b>P</b> pause · <b>C</b> configuration · <b>esc</b> frees the mouse';
const BLURBS = {
  1: 'The gate. Ghouls, mostly. Find the key. It opens the door. The door is not where the key is.',
  2: 'Catacombs. Cultists throw flaming skulls, ratlings are faster than you would like. The key is further.',
  3: 'The meat locker. Something is dripping. The brutes are slow. The brutes hit very hard.',
  4: 'The deep. Stalkers reach you from a corridor away. The door is a long way from the key.',
  5: 'No key. No door. Just him, in the middle, with a rifle exactly like yours.',
};
function attract() {
  mode = 'attract';
  showCard({
    kicker: 'A MAZE · A RIFLE · NO IDEA WHAT IT SHOOTS', title: 'JABBERWOCKY',
    sub: 'Find the key. Find the door. Four mazes down, the Jabberwock waits in the middle with a rifle exactly like yours. Every pull of the trigger is a different thing. Some of them are your problem.',
    btn: R.ready ? 'BEGIN' : 'LOADING THE DUNGEON', disabled: !R.ready, keys: KEYS_LINE, action: begin,
  });
}
function begin() {
  hideCard();
  state = C.newGame(opts()); view.pitch = 0;
  seen = new Set(); seenLevel = null;
  mode = 'play';
  lock();
  handleEvents();
  syncHud(true);
}
function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  showCard({ kicker: 'PAUSED', title: state.level.name, sub: 'The dungeon holds its breath. The rifle is thinking.', btn: 'RESUME', keys: KEYS_LINE, action: resume });
}
function resume() { if (mode !== 'paused') return; hideCard(); mode = 'play'; lock(); }
function levelCard(n, name) {
  mode = 'card';
  showCard({ kicker: n === 5 ? 'THE LAST ONE' : 'MAZE ' + n + ' OF 4', title: name, sub: BLURBS[n] || '', auto: 2600, keys: 'click or space to go', action: () => { hideCard(); mode = 'play'; lock(); } });
}
function deathCard() {
  mode = 'dead';
  unlock();
  const by = state.deathBy || { verb: 'DONE IN', name: 'SOMETHING' };
  const src = by.source;
  const sub = src === 'self' ? 'That one was the rifle. The rifle is not sorry.' : src === 'boss' ? 'His table. His pull. Your problem.' : src === 'scar' ? 'You walked into something you fired. Everyone does it once.' : src === 'hole' ? 'It went down. Nobody knows how far. You found out.' : 'Something got close. They do that.';
  setTimeout(() => showCard({
    kicker: 'YOU WERE', title: by.verb + ' BY ' + by.name, red: true, sub,
    lines: [`${state.shotsFired} pulls · ${state.kills} kills · ${Object.keys(state.gagsSeen).length} of ${T.GAGS.length} gags seen · ${state.deaths} deaths`],
    btn: 'AGAIN', keys: 'same maze, same table', action: () => { hideCard(); C.retryLevel(state); view.pitch = 0; mode = 'play'; lock(); handleEvents(); syncHud(true); },
  }), 900);
}
function winCard() {
  mode = 'won';
  unlock();
  const b = state.goons.find((g) => g.isBoss);
  const verb = b && b.gagId && T.byId[b.gagId] && T.byId[b.gagId].verb ? T.byId[b.gagId].verb : (b && b.outcome && T.OUTCOMES[b.outcome] ? T.OUTCOMES[b.outcome].verb : 'DONE IN');
  setTimeout(() => showCard({
    kicker: 'THE MIDDLE OF THE MAZE', title: 'THE JABBERWOCK IS ' + verb,
    sub: 'The rifle is yours now. It was always yours. The three odd doors in the walls have started to hum.',
    lines: [`${state.shotsFired} pulls · ${state.kills} kills · ${Object.keys(state.gagsSeen).length} of ${T.GAGS.length} gags seen · ${state.deaths} deaths`],
    btn: 'WALK', keys: 'find one of the three doors and keep walking into it · or <b>enter</b> for a new run', action: () => { hideCard(); state.phase = 'play'; state.finished = true; mode = 'play'; lock(); },
  }), 1200);
}

// ---- the plate ------------------------------------------------------------------------------------
const plate = $('plate');
let plateHideT = null;
function showPlate(p) {
  if (!p) return;
  $('plate-name').textContent = p.name;
  $('plate-line').textContent = p.line || '';
  plate.className = 'show pop ' + p.tier;
  plate.style.fontSize = (look.plateSize || 1) + 'em';
  void plate.offsetWidth;
  if (plateHideT) clearTimeout(plateHideT);
  plateHideT = setTimeout(() => plate.classList.remove('show'), 2200 + Math.min(2500, p.name.length * 40));
}

// ---- events from the core ------------------------------------------------------------------------------
function handleEvents() {
  const ev = state.events; state.events = [];
  for (const e of ev) {
    switch (e.type) {
      case 'level': R.buildLevel(state); levelCard(e.n, e.name); Sfx.play('level'); seen = new Set(); seenLevel = state.level; syncHud(true); break;
      case 'pull': Sfx.play('pull'); Sfx.reel(state.opts.revealDelay); R.vm.spin = 0.001; R.vm.mood = e.gag.tier === 'dud' || e.gag.tier === 'backfire' ? 'shudder' : BIG.has(e.gag.id) ? 'purr' : 'idle'; break;
      case 'fire': R.fire(); Sfx.play(e.gag.sound, e.little ? pan(e.x, e.y) : 0); Sfx.reveal(e.gag.tier); showPlate(state.plate); if (e.gag.kind === 'melee' || e.gag.kind === 'self') R.shake(0.5); break;
      case 'kill': Sfx.outcome(e.outcome, pan(e.x, e.y)); if (e.outcome !== 'pacify' && e.outcome !== 'vapor') R.strike(e.x, e.y); if (e.outcome === 'gib' || e.outcome === 'inflate') setTimeout(() => Sfx.play('crunch', pan(e.x, e.y)), 90); if (e.outcome === 'fling') setTimeout(() => Sfx.play('wallsplat', pan(e.x, e.y)), 560); if (e.boss) { Sfx.play('bossdead'); R.shake(1); } break;
      case 'pacify': Sfx.play('pacify', pan(e.goon.x, e.goon.y)); break;
      case 'hurt': fx.hurt = 1; R.shake(0.6); Sfx.play('hurt'); break;
      case 'death': Sfx.play('death'); deathCard(); break;
      case 'heal': Sfx.play('heal'); hint('A MEAT PIE OF DUBIOUS ORIGIN · +' + e.gained + ' · DO NOT ASK WHAT KIND', 2600); break;
      case 'key': Sfx.play('key'); setTimeout(() => Sfx.play('door'), 400); hint('THE DOOR IS OPEN — IT IS NOT HERE', 3500); break;
      case 'cleared': Sfx.play('cleared'); mode = 'card'; showCard({ kicker: 'MAZE ' + e.n + ' CLEARED', title: 'THROUGH THE DOOR', sub: 'The scars stay behind. The rifle comes with you.', auto: 1800, action: () => { hideCard(); C.nextLevel(state); view.pitch = 0; mode = 'play'; handleEvents(); } }); break;
      case 'won': Sfx.play('win'); winCard(); break;
      case 'drift': mode = 'drifting'; Sfx.play('drift'); unlock(); $('fade').classList.add('on'); setTimeout(() => { const a = $('exit-' + e.i); if (a) a.click(); }, 700); break;
      case 'notice': if (view.t > noticeT) { noticeT = view.t + 0.6; Sfx.play('notice', pan(e.goon.x, e.goon.y), e.goon.type); } break;
      case 'swing': Sfx.play('swing', pan(e.goon.x, e.goon.y)); break;
      case 'throw': Sfx.play('throw', pan(e.goon.x, e.goon.y)); break;
      case 'splat': Sfx.play('splat', pan(e.x, e.y)); break;
      case 'boom': Sfx.play('boom', pan(e.x, e.y)); R.boom(e.x, e.y, e.r, e.gag.id); break;
      case 'impact': R.impact(e.x, e.y, e.r); Sfx.play('thud', pan(e.x, e.y)); break;
      case 'wallbreak': Sfx.play('wallbreak', pan(e.x, e.y)); R.shake(0.5); R.buildLevel(state); break;
      case 'crash': Sfx.play('boom', pan(e.x, e.y)); break;
      case 'bounce': Sfx.play('bounce', pan(e.x, e.y)); break;
      case 'pop': Sfx.play('pop', pan(e.x, e.y)); break;
      case 'fall': Sfx.play('fall'); break;
      case 'bosswind': Sfx.play('bosswind'); break;
      case 'bossfire': Sfx.play(e.gag.sound, 0); showPlate(state.plate); break;
      case 'bosshit': Sfx.play('bosshit'); break;
      case 'bossbackfire': Sfx.play('bosshit'); showPlate(state.plate); break;
      case 'self': R.shake(0.6); break;
      case 'boomerang-hit': fx.hurt = 1; Sfx.play('hurt'); break;
      case 'swap': R.shake(0.4); break;
    }
  }
}
let hintT = null;
function hint(s, ms) { const h = $('hint'); h.textContent = s; h.classList.add('show'); if (hintT) clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('show'), ms || 2500); }

// ---- HUD -----------------------------------------------------------------------------------------------
function syncHud(force) {
  if (!state) return;
  const p = state.player;
  const hp = Math.max(0, Math.round(p.hp));
  $('hp-num').textContent = hp;
  const fill = $('hp-fill'); fill.style.width = hp + '%'; fill.classList.toggle('low', hp < 30);
  if (force) $('level-name').textContent = state.level.name;
  $('key-icon').classList.toggle('held', !!(state.key && state.key.held));
  const left = C.goonsLeft(state);
  $('goons-left').textContent = state.level.arena ? (left ? left + ' LEFT' : 'CLEAR') : (left + ' LEFT');
  $('gags-seen').textContent = Object.keys(state.gagsSeen).length + ' OF ' + T.GAGS.length + ' SEEN';
}

// ---- the corner map ----------------------------------------------------------------------------------------
const mm = $('minimap'), mctx = mm.getContext('2d');
function drawMap() {
  if (!play.map) { mm.classList.add('off'); return; }
  mm.classList.remove('off');
  const L = state.level, p = state.player;
  if (seenLevel !== L) { seen = new Set(); seenLevel = L; }
  // reveal: every open cell within seven of you that you can actually see, plus the walls around it
  const px = Math.floor(p.x), py = Math.floor(p.y), RV = 7;
  const mark = (x, y) => { if (x >= 0 && y >= 0 && x < L.w && y < L.h) seen.add(y * L.w + x); };
  for (let dy = -RV; dy <= RV; dy++) for (let dx = -RV; dx <= RV; dx++) {
    const x = px + dx, y = py + dy;
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) continue;
    const i = y * L.w + x;
    if (L.map[i] !== C.CELL.OPEN && !(dx === 0 && dy === 0)) continue;
    if ((dx || dy) && !C.lineOfSight(state, p.x, p.y, x + 0.5, y + 0.5)) continue;
    for (let ny = -1; ny <= 1; ny++) for (let nx = -1; nx <= 1; nx++) mark(x + nx, y + ny);
  }
  const size = mm.width, cs = Math.floor(size / Math.max(L.w, L.h));
  const ox = (size - cs * L.w) / 2, oy = (size - cs * L.h) / 2;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, size, size);
  mctx.fillStyle = 'rgba(8,5,10,0.8)'; mctx.fillRect(0, 0, size, size);
  mctx.setTransform(1, 0, 0, -1, 0, size);   // the maze's y grows away from you; the map's grows down — flip it so forward is up
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = y * L.w + x;
    if (!seen.has(i)) continue;
    const v = L.map[i];
    if (v === C.CELL.OPEN) mctx.fillStyle = 'rgba(244,236,242,0.18)';
    else if (v === C.CELL.DOOR) mctx.fillStyle = state.doorOpen ? '#58ff7a' : '#ff2040';
    else if (v === C.CELL.DRIFT) mctx.fillStyle = '#7fd7ff';
    else mctx.fillStyle = 'rgba(255,47,184,0.55)';
    mctx.fillRect(ox + x * cs, oy + y * cs, cs, cs);
  }
  if (state.key && !state.key.held && seen.has(Math.floor(state.key.y) * L.w + Math.floor(state.key.x))) { mctx.fillStyle = '#ffd23a'; mctx.beginPath(); mctx.arc(ox + state.key.x * cs, oy + state.key.y * cs, cs * 0.35, 0, TAU); mctx.fill(); }
  for (const h of state.heals || []) { if (h.taken || !seen.has(Math.floor(h.y) * L.w + Math.floor(h.x))) continue; mctx.fillStyle = '#ff5a3a'; mctx.beginPath(); mctx.arc(ox + h.x * cs, oy + h.y * cs, cs * 0.3, 0, TAU); mctx.fill(); }
  for (const g of state.goons) { if (g.state === 'dead' || !seen.has(Math.floor(g.y) * L.w + Math.floor(g.x))) continue; if (Math.hypot(g.x - p.x, g.y - p.y) > 3) continue; mctx.fillStyle = g.isBoss ? '#ff2040' : '#f4ecf2'; mctx.beginPath(); mctx.arc(ox + g.x * cs, oy + g.y * cs, cs * 0.3, 0, TAU); mctx.fill(); }
  mctx.save(); mctx.translate(ox + p.x * cs, oy + p.y * cs); mctx.rotate(p.a);
  mctx.fillStyle = '#ffd23a'; mctx.beginPath(); mctx.moveTo(cs * 0.7, 0); mctx.lineTo(-cs * 0.4, -cs * 0.4); mctx.lineTo(-cs * 0.4, cs * 0.4); mctx.closePath(); mctx.fill(); mctx.restore();
}

// ---- overlays (a 2D canvas over the WebGL frame) ------------------------------------------------------------
function drawOverlays() {
  const W = overlay.width, H = overlay.height, p = state.player, s = W / 960;
  octx.clearRect(0, 0, W, H);
  if (p.fx.flash > 0) { octx.fillStyle = `rgba(255,255,255,${Math.min(0.95, p.fx.flash * 1.6)})`; octx.fillRect(0, 0, W, H); }
  if (fx.hurt > 0) { const g = octx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(180,10,20,0)'); g.addColorStop(1, `rgba(180,10,20,${0.7 * fx.hurt})`); octx.fillStyle = g; octx.fillRect(0, 0, W, H); }
  if (p.hp < 30 && p.hp > 0) { const k = 0.25 + 0.15 * Math.sin(view.t * 6); const g = octx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); g.addColorStop(0, 'rgba(120,0,10,0)'); g.addColorStop(1, `rgba(120,0,10,${k})`); octx.fillStyle = g; octx.fillRect(0, 0, W, H); }
  if (p.fx.snot > 0) { const k = Math.min(1, p.fx.snot / 1.5); octx.globalAlpha = 0.75 * k; const B = globalThis.JabberwockyDraw.primitives; for (let i = 0; i < 7; i++) { const sx = ((i * 137) % 100) / 100 * W, sy = ((i * 89) % 100) / 100 * H + (3.5 - p.fx.snot) * H * 0.08 * (i % 3); B.blob(octx, sx, sy, (40 + (i % 3) * 30) * s, (60 + (i % 4) * 30) * s, 'rgba(120,200,60,0.85)', 0); } octx.globalAlpha = 1; }
  if (p.fx.bees > 0) { for (let i = 0; i < 24; i++) { const t = view.t * 9 + i; const x = W / 2 + Math.sin(t * 1.3 + i) * W * 0.4, y = H / 2 + Math.cos(t * 1.7 + i * 2) * H * 0.4; octx.fillStyle = '#ffd23a'; octx.beginPath(); octx.ellipse(x, y, 6 * s, 4 * s, 0, 0, TAU); octx.fill(); octx.fillStyle = '#120a12'; octx.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 8 * s); } }
  if (p.fx.fall > 0) { octx.fillStyle = `rgba(0,0,0,${Math.min(1, p.fx.fall * 3)})`; octx.fillRect(0, 0, W, H); octx.fillStyle = '#c9c1cc'; octx.font = `800 ${16 * s}px ${getComputedStyle(document.body).fontFamily}`; octx.textAlign = 'center'; octx.fillText('YOU CLIMB OUT', W / 2, H / 2); }
  if (p.fx.dead > 0) { octx.fillStyle = 'rgba(40,40,50,0.18)'; octx.fillRect(0, 0, W, H); }
  if (p.ringing > 0) { octx.fillStyle = `rgba(255,255,255,${Math.min(0.25, p.ringing * 0.08)})`; octx.fillRect(0, 0, W, H); }
}

// ---- the loop --------------------------------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  view.t += dt;
  if (!state) return;
  if (mode === 'play') {
    readKeys();
    const k = 1 - Math.exp(-dt * LOOK_EASE);
    input.look = lookBank.x * k; lookBank.x -= input.look;
    const dy = lookBank.y * k; lookBank.y -= dy;
    view.pitch = Math.max(-1, Math.min(1, view.pitch - dy));   // pitch = rise of the look target over one unit forward, ~±45°
    C.step(state, input, dt);
    input.look = 0;
    handleEvents();
    const p = state.player;
    if (p.moving && p.fx.fall <= 0) anim.bob = (anim.bob + dt * (input.run ? 2.2 : 1.6)) % 1; else anim.bob += (Math.round(anim.bob) - anim.bob) * Math.min(1, dt * 8);
    view.bob = anim.bob; R.vm.bob = anim.bob;
    if (R.vm.spin > 0 && state.pending) R.vm.spin += dt; else R.vm.spin = 0;
    R.vm.dead += ((p.fx.dead > 0 ? 1 : 0) - R.vm.dead) * Math.min(1, dt * 6);
    fx.hurt = Math.max(0, fx.hurt - dt * 1.6);
    if (now - lastHud > 120) { lastHud = now; syncHud(false); drawMap(); }
  }
  R.update(state, view, mode === 'play' ? dt : 0);
  drawOverlays();
}

// ---- configuration ---------------------------------------------------------------------------------------------
const tuner = $('tuner');
let tunerPaused = false;
function openTuner() { tuner.classList.add('open'); if (mode === 'play') { pause(); tunerPaused = true; } unlock(); }
function closeTuner() { tuner.classList.remove('open'); if (tunerPaused && mode === 'paused') { hideCard(); mode = 'play'; } tunerPaused = false; }
$('tuner-toggle').addEventListener('click', (e) => { e.stopPropagation(); if (tuner.classList.contains('open')) closeTuner(); else openTuner(); });
document.addEventListener('pointerdown', (e) => {
  if (!tuner.classList.contains('open')) return;
  if (e.target.closest('#tuner') || e.target.closest('#tuner-toggle')) return;
  closeTuner();
});
tuner.addEventListener('keydown', (e) => e.stopPropagation());
tuner.addEventListener('mousedown', (e) => e.stopPropagation());
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab-body').forEach((x) => x.classList.toggle('on', x.dataset.body === b.dataset.tab));
}));
function applyUi() { document.documentElement.style.setProperty('--ui-scale', ui.scale); $('ts-val').textContent = Math.round(ui.scale * 100) + '%'; }
$('ts-up').addEventListener('click', () => { ui.scale = Math.min(1.8, +(ui.scale + 0.1).toFixed(2)); save(UI_KEY, ui); applyUi(); });
$('ts-down').addEventListener('click', () => { ui.scale = Math.max(0.7, +(ui.scale - 0.1).toFixed(2)); save(UI_KEY, ui); applyUi(); });
applyUi();
const slider = (id, get, set, fmt) => { const el = $(id); el.addEventListener('input', () => { set(parseFloat(el.value)); save(PLAY_KEY, play); liveOpts(); syncPlayUI(); }); return () => { el.value = get(); $(id + '-val').textContent = fmt(get()); }; };
const syncs = [
  slider('t-odds-dispatch', () => play.odds.dispatch, (v) => play.odds.dispatch = v, (v) => v),
  slider('t-odds-weird', () => play.odds.weird, (v) => play.odds.weird = v, (v) => v),
  slider('t-odds-dud', () => play.odds.dud, (v) => play.odds.dud = v, (v) => v),
  slider('t-odds-backfire', () => play.odds.backfire, (v) => play.odds.backfire = v, (v) => v),
  slider('t-goonmul', () => play.goonMul, (v) => play.goonMul = v, (v) => v.toFixed(2) + '×'),
  slider('t-goonspeed', () => play.goonSpeed, (v) => play.goonSpeed = v, (v) => v.toFixed(2) + '×'),
  slider('t-dmg', () => play.damageMul, (v) => play.damageMul = v, (v) => v.toFixed(1) + '×'),
  slider('t-cool', () => play.fireCool, (v) => play.fireCool = v, (v) => v.toFixed(2) + 's'),
  slider('t-reveal', () => play.revealDelay, (v) => play.revealDelay = v, (v) => v.toFixed(2) + 's'),
  slider('t-boss', () => play.bossFire, (v) => play.bossFire = v, (v) => v.toFixed(1) + 's'),
  slider('t-move', () => play.moveSpeed, (v) => play.moveSpeed = v, (v) => (v * S).toFixed(1) + ' m/s'),
  slider('t-sens', () => play.sens, (v) => play.sens = v, (v) => v.toFixed(2) + '×'),
];
const force = $('t-force');
for (const tier of T.TIERS) { const og = document.createElement('optgroup'); og.label = tier.toUpperCase(); for (const g of T.GAGS) if (g.tier === tier) { const o = document.createElement('option'); o.value = g.id; o.textContent = g.name; og.appendChild(o); } force.appendChild(og); }
force.addEventListener('change', () => { play.forceGag = force.value; save(PLAY_KEY, play); liveOpts(); });
function seg(id, key, parse) { $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { play[key] = parse ? parse(b.dataset.v) : b.dataset.v; save(PLAY_KEY, play); syncPlayUI(); })); }
seg('t-map', 'map', (v) => parseInt(v, 10));
seg('t-level', 'startLevel', (v) => parseInt(v, 10));
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  for (const s of syncs) s();
  force.value = play.forceGag || '';
  $('t-map').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(play.map)));
  $('t-level').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(play.startLevel)));
  $('t-seed').value = play.seed || '';
  const total = play.odds.dispatch + play.odds.weird + play.odds.dud + play.odds.backfire || 1;
  for (const k of T.TIERS) $('t-odds-' + k + '-val').textContent = play.odds[k] + ' (' + Math.round(play.odds[k] / total * 100) + '%)';
  if (state) drawMap();
}
const lookRows = $('look-rows');
for (const key of Object.keys(LOOK_RANGES)) {
  const r = LOOK_RANGES[key];
  const row = document.createElement('div'); row.className = 't-row';
  row.innerHTML = `<div class="t-label"><span>${r.label}</span><span data-val="${key}"></span></div><input type="range" data-key="${key}" min="${r.min}" max="${r.max}" step="${r.step}" />${r.sum ? `<div class="t-sum">${r.sum}</div>` : ''}`;
  lookRows.appendChild(row);
  row.querySelector('input').addEventListener('input', (e) => { look[key] = parseFloat(e.target.value); save(LOOK_KEY, look); syncLookUI(); applyLook(key === 'res'); });
}
function syncLookUI() { lookRows.querySelectorAll('input').forEach((inp) => { const k = inp.dataset.key; inp.value = look[k]; lookRows.querySelector(`[data-val="${k}"]`).textContent = (+look[k]).toFixed(LOOK_RANGES[k].step < 0.1 ? 2 : LOOK_RANGES[k].step < 1 ? 1 : 0); }); }
function applyLook(resized) { R.setLook(look); if (resized) resize(); plate.style.fontSize = (look.plateSize || 1) + 'em'; }
$('t-reset').addEventListener('click', () => { look = Object.assign({}, DEFAULT_LOOK); save(LOOK_KEY, look); syncLookUI(); applyLook(true); });
const PRESET_URL = '/api/worlds/jabberwocky/presets';
const presetSelect = $('preset-select'), presetNote = $('preset-note');
let presets = {}, presetDefault = null;
function fillPresets() { presetSelect.innerHTML = '<option value="">— preset —</option>'; Object.keys(presets).sort().forEach((n) => { const o = document.createElement('option'); o.value = n; o.textContent = n + (n === presetDefault ? ' (default)' : ''); presetSelect.appendChild(o); }); }
async function loadPresets() {
  if (!served) { presetNote.textContent = 'presets need the local server'; return; }
  try {
    const data = await (await fetch(PRESET_URL)).json();
    presets = data.presets || {}; presetDefault = data.default || null;
    fillPresets();
    if (presetDefault && presets[presetDefault] && !localStorage.getItem(LOOK_KEY)) { look = Object.assign({}, DEFAULT_LOOK, presets[presetDefault]); syncLookUI(); applyLook(true); }
    presetNote.textContent = 'presets save to the world folder';
  } catch (e) { presetNote.textContent = 'presets unavailable'; }
}
async function putPresets() { await fetch(PRESET_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presets, default: presetDefault }) }); fillPresets(); }
presetSelect.addEventListener('change', () => { const p = presets[presetSelect.value]; if (!p) return; look = Object.assign({}, DEFAULT_LOOK, p); save(LOOK_KEY, look); syncLookUI(); applyLook(true); });
$('preset-save').addEventListener('click', async () => { const name = (prompt('Preset name', presetSelect.value || 'look-01') || '').trim(); if (!name) return; presets[name] = Object.assign({}, look); await putPresets(); presetSelect.value = name; presetNote.textContent = 'saved "' + name + '"'; });
$('preset-default').addEventListener('click', async () => { if (!presetSelect.value) return; presetDefault = presetSelect.value; await putPresets(); presetNote.textContent = '"' + presetDefault + '" is the default'; });
$('preset-del').addEventListener('click', async () => { const n = presetSelect.value; if (!n || !presets[n]) return; delete presets[n]; if (presetDefault === n) presetDefault = null; await putPresets(); presetNote.textContent = 'deleted "' + n + '"'; });

// ---- go ------------------------------------------------------------------------------------------------------
resize(); syncPlayUI(); syncLookUI(); applyLook(false); loadPresets();
state = C.newGame(opts()); state.events = []; mode = 'attract';
R.buildLevel(state);
attract();
R.load((k) => { if (mode === 'attract') $('card-btn').textContent = 'LOADING THE DUNGEON ' + Math.round(k * 100) + '%'; }).then(() => { if (mode === 'attract') { $('card-btn').textContent = 'BEGIN'; $('card-btn').disabled = false; } });
requestAnimationFrame(frame);
globalThis.JABBERWOCKY = { get state() { return state; }, get mode() { return mode; }, begin, play, look, R, input, keys };
