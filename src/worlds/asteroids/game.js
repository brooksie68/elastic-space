// Asteroids — the shell: the attract gate, the game loop, input, the console,
// sound synthesis, the configuration panel, presets, the ways out.
// Rules live in game-core.js; the picture lives in render3d.js.
import { AsteroidsScene, DEFAULT_PARAMS } from './render3d.js';

const Core = globalThis.AsteroidsCore;

const PLAY_KEY = 'asteroids-play-v2';   // v2: the shot cap went (James, 2026-09-08)
const LOOK_KEY = 'asteroids-look-v1';
const HI_KEY = 'asteroids-hi-v1';
const UI_KEY = 'asteroids-ui-v1';
const PLAY_DEFAULTS = { lives: 3, rotRate: 3.8, thrust: 330, drag: 0.55, shotCap: 0, fireRepeat: 0.12, saucer: 7, hyperRisk: 0.06, lurk: 1, seed: '' };
const LOOK_RANGES = {
  hue: { label: 'Hue', min: 0, max: 1, step: 0.01 },
  saturation: { label: 'Colour', min: 0, max: 1, step: 0.05 },
  glow: { label: 'Glow', min: 0, max: 2.5, step: 0.05 },
  lineWeight: { label: 'Line weight', min: 1, max: 4, step: 0.1 },
  brightness: { label: 'Brightness', min: 0.4, max: 2, step: 0.05 },
  shipBright: { label: 'Ship brightness', min: 0.3, max: 1.6, step: 0.05 },
  rockBright: { label: 'Rock brightness', min: 0.4, max: 1.6, step: 0.05 },
  crease: { label: 'Facet lines', min: 0, max: 1, step: 0.05 },
  stars: { label: 'Stars', min: 0, max: 2, step: 0.05 },
  starDepth: { label: 'Star depth', min: 0.4, max: 2.5, step: 0.05 },
  plume: { label: 'Plume', min: 0, max: 2.5, step: 0.05 },
  fragments: { label: 'Pieces fly', min: 0.2, max: 2.5, step: 0.05 },
  res: { label: 'Resolution', min: 0.5, max: 1, step: 0.05 },
};
const STEP = 1 / 120;
const ASPECT_MIN = 1.2, ASPECT_MAX = 2.4;
const EXIT_BEAT = 750;   // ms between the exit event and the drift

function load(key, defaults) {
  try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) { return Object.assign({}, defaults); }
}
function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }
const $ = (id) => document.getElementById(id);
const fmt = (n) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

let play = load(PLAY_KEY, PLAY_DEFAULTS);
let look = load(LOOK_KEY, DEFAULT_PARAMS);
let hi = 0;
try { hi = parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0; } catch (e) {}
let state = null;        // the live game (or the attract demo)
let scene = null;
let mode = 'attract';    // attract | play | paused | over | exiting
let carry = 0;
let lastT = 0;
let restartArmed = 0;
let hintFadeDone = false;
let heartT = 0;
let heartLow = false;
let exitPending = null;

const keys = new Set();
let mouseDown = false;

// ---- the renderer -------------------------------------------------------------------------
const canvas = $('field');
try {
  scene = new AsteroidsScene(canvas, look, Core);
} catch (e) {
  document.body.classList.add('nogl');
  console.error(e);
}
function applyTint() {
  const h = look.hue * 360;
  const s = 100 * Math.min(1, look.saturation);
  const root = document.documentElement.style;
  root.setProperty('--ph', `hsl(${h.toFixed(0)} ${s.toFixed(0)}% 70%)`);
  root.setProperty('--ph-dim', `hsl(${h.toFixed(0)} ${s.toFixed(0)}% 70% / 0.55)`);
  root.setProperty('--ph-faint', `hsl(${h.toFixed(0)} ${s.toFixed(0)}% 70% / 0.2)`);
  root.setProperty('--glass-edge', `hsl(${h.toFixed(0)} ${s.toFixed(0)}% 70% / 0.16)`);
}
applyTint();

function fieldAspect() {
  const w = window.innerWidth || 1920, h = window.innerHeight || 1080;
  return Math.max(ASPECT_MIN, Math.min(ASPECT_MAX, w / Math.max(1, h)));
}

// ---- sound (Web Audio synthesis, through the shared control) --------------------------------
const Sfx = {
  ctx: null, master: null, on: false, vol: 0.8,
  thrustGain: null, thrustSrc: null, thrustFilter: null,
  siren: null,
  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
    this.thrustSrc = this.ctx.createBufferSource();
    this.thrustSrc.buffer = buf; this.thrustSrc.loop = true;
    this.thrustFilter = this.ctx.createBiquadFilter();
    this.thrustFilter.type = 'lowpass'; this.thrustFilter.frequency.value = 300; this.thrustFilter.Q.value = 0.7;
    this.thrustGain = this.ctx.createGain(); this.thrustGain.gain.value = 0;
    this.thrustSrc.connect(this.thrustFilter).connect(this.thrustGain).connect(this.master);
    this.thrustSrc.start();
    return true;
  },
  start() {
    if (!this.ensure()) return;
    this.on = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.setTargetAtTime(this.vol, this.ctx.currentTime, 0.05);
  },
  stop() {
    this.on = false;
    if (this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  },
  setVolume(v) { this.vol = v; if (this.on && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
  thrust(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.thrustGain.gain.setTargetAtTime(level * 0.7, t, 0.03);
    this.thrustFilter.frequency.setTargetAtTime(240 + level * 700, t, 0.05);
  },
  env(type, f, dur, vol, f2) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, fc) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
  },
  // the heartbeat: two thumps, the second a hair lower
  beat(low) { this.env('sine', low ? 52 : 62, 0.13, low ? 0.32 : 0.36, low ? 36 : 44); },
  fire() { this.env('square', 880, 0.09, 0.05, 220); this.noise(0.06, 0.12, 4000); },
  boom(size) {
    // three sizes: big is long and low, small is a snap
    const dur = [0.28, 0.5, 0.85][size], vol = [0.35, 0.55, 0.85][size], fc = [2400, 1200, 700][size];
    this.noise(dur, vol, fc);
    this.env('sine', [140, 90, 60][size], dur * 0.8, [0.12, 0.25, 0.4][size], 30);
  },
  saucerBoom() { this.noise(0.6, 0.7, 1600); this.env('sawtooth', 300, 0.5, 0.15, 40); },
  die() { this.noise(1.2, 0.9, 900); this.env('sine', 70, 1.0, 0.5, 24); },
  hyper() { this.env('sine', 1400, 0.35, 0.12, 120); this.noise(0.3, 0.25, 3000); },
  reappear() { this.env('sine', 160, 0.3, 0.1, 1200); },
  open() { [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.35, 0.09), i * 110)); },
  extra() { [659, 880, 1046, 1318, 1046, 1318].forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.18, 0.11), i * 95)); },
  over() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.4, 0.14), i * 170)); },
  wave() { [523, 784].forEach((f, i) => setTimeout(() => this.env('sine', f, 0.2, 0.07), i * 120)); },
  exit() { [262, 392, 523, 784, 1046].forEach((f, i) => setTimeout(() => this.env('sine', f, 0.5, 0.1), i * 90)); },
  sirenStart(size) {
    if (!this.ctx) return;
    this.sirenStop();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    const g = this.ctx.createGain();
    o.type = size === 'small' ? 'square' : 'sawtooth';
    o.frequency.value = size === 'small' ? 360 : 105;
    lfo.type = 'sine'; lfo.frequency.value = size === 'small' ? 7 : 2.8;
    lg.gain.value = size === 'small' ? 70 : 22;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(size === 'small' ? 0.035 : 0.05, t + 0.2);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = size === 'small' ? 2400 : 900;
    o.connect(f).connect(g).connect(this.master);
    o.start(t); lfo.start(t);
    this.siren = { o, lfo, g };
  },
  sirenStop() {
    if (!this.siren || !this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.siren;
    s.g.gain.setTargetAtTime(0.0001, t, 0.08);
    try { s.o.stop(t + 0.4); s.lfo.stop(t + 0.4); } catch (e) {}
    this.siren = null;
  },
};
if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({ start: () => Sfx.start(), stop: () => Sfx.stop(), setVolume: (v) => Sfx.setVolume(v) });
}

// ---- the ways out -----------------------------------------------------------------------------
const EXITS = { hulk: () => $('exit-hulk'), hyper: () => $('exit-hyper'), rock: () => $('exit-rock') };
function takeExit(which) {
  const a = EXITS[which] && EXITS[which]();
  if (!a) return;
  Sfx.thrust(0); Sfx.sirenStop();
  a.click();
}

// ---- the game --------------------------------------------------------------------------------
function coreOpts(attract) {
  return {
    seed: attract ? String(Date.now() % 100000) : (play.seed || String((Math.random() * 1e6) | 0)),
    aspect: fieldAspect(),
    lives: attract ? 1 : play.lives,
    rotRate: play.rotRate, thrust: play.thrust, drag: play.drag, shotCap: play.shotCap, fireRepeat: play.fireRepeat,
    saucerMin: attract ? 1e9 : play.saucer, saucerMax: attract ? 1e9 : play.saucer * 2.1,
    hyperRisk: play.hyperRisk, lurk: play.lurk, exits: attract ? 0 : 1,
  };
}
function applyLiveOpts() {
  if (!state) return;
  Object.assign(state.opts, { rotRate: play.rotRate, thrust: play.thrust, drag: play.drag, shotCap: play.shotCap, fireRepeat: play.fireRepeat, hyperRisk: play.hyperRisk, lurk: play.lurk });
  if (mode !== 'attract') { state.opts.saucerMin = play.saucer; state.opts.saucerMax = play.saucer * 2.1; }
}
function enterAttract(resultLine) {
  mode = 'attract';
  state = Core.createGame(coreOpts(true));
  state.ship.alive = false;   // rocks drift, nobody flies
  exitPending = null;
  Sfx.thrust(0); Sfx.sirenStop();
  $('start-result').style.display = resultLine ? 'block' : 'none';
  $('start-result').textContent = resultLine || '';
  $('hi-line').textContent = hi > 0 ? 'BEST ' + fmt(hi) : '';
  $('start-card').classList.add('show');
  $('over-card').classList.remove('show');
  $('pause-card').classList.remove('show');
  $('controls').style.display = 'none';
  $('console').style.opacity = '0.35';
  renderHud();
}
function startGame() {
  state = Core.createGame(coreOpts(false));
  mode = 'play';
  carry = 0; heartT = 0; heartLow = false; exitPending = null;
  restartArmed = 0; $('btn-restart').classList.remove('armed'); $('btn-restart').textContent = 'RESTART';
  $('start-card').classList.remove('show');
  $('over-card').classList.remove('show');
  $('controls').style.display = 'flex';
  $('console').style.opacity = '1';
  Sfx.wave();
  renderHud();
}
function gameOver() {
  mode = 'over';
  Sfx.thrust(0); Sfx.sirenStop(); Sfx.over();
  const best = state.score > hi;
  if (best) { hi = state.score; try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {} }
  $('o-score').textContent = fmt(state.score);
  $('o-detail').textContent = 'WAVE ' + state.wave + ' · ' + state.stats.rocks + ' ROCKS · ' + state.stats.saucers + ' SAUCERS';
  $('o-hi').textContent = best ? 'A NEW BEST' : 'BEST ' + fmt(hi);
  $('over-card').classList.add('show');
  $('controls').style.display = 'none';
}

// ---- input ------------------------------------------------------------------------------------
function currentInput() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  return {
    rotate: (right ? 1 : 0) - (left ? 1 : 0),
    thrust: keys.has('ArrowUp') || keys.has('KeyW'),
    fire: keys.has('Space') || mouseDown,
    hyper: keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyH') || keys.has('ArrowDown') || keys.has('KeyS'),
  };
}
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'KeyC') { e.preventDefault(); if (tuner.classList.contains('open')) closeTuner(); else openTuner(); return; }
  if (mode === 'attract') {
    if (e.code === 'Enter') { e.preventDefault(); startGame(); }
    return;
  }
  if (mode === 'over') { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); enterAttract(); } return; }
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
  if (mode === 'play') {
    mode = 'paused';
    $('pause-card').classList.add('show');
    $('btn-pause').textContent = 'RESUME';
    Sfx.thrust(0);
  } else if (mode === 'paused') {
    mode = 'play';
    $('pause-card').classList.remove('show');
    $('btn-pause').textContent = 'PAUSE';
    lastT = 0;
  }
}
function armRestart() {
  if (mode !== 'play' && mode !== 'paused') return;
  if (restartArmed > 0) {
    restartArmed = 0;
    $('btn-restart').classList.remove('armed'); $('btn-restart').textContent = 'RESTART';
    if (mode === 'paused') togglePause();
    startGame();
  } else {
    restartArmed = 3;
    $('btn-restart').classList.add('armed'); $('btn-restart').textContent = 'SURE?';
  }
}
$('btn-start').addEventListener('click', startGame);
$('btn-again').addEventListener('click', () => enterAttract());
$('btn-pause').addEventListener('click', () => togglePause());
$('btn-restart').addEventListener('click', () => armRestart());

// ---- the loop ----------------------------------------------------------------------------------
function handleEvents(st) {
  for (const e of st.events) {
    switch (e.type) {
      case 'fire': Sfx.fire(); break;
      case 'rockHit':
        scene.spawnRockBreak(e);
        Sfx.boom(e.size);
        if (e.points) floatText(e.x, e.y, '+' + e.points, false);
        break;
      case 'saucerHit':
        scene.spawnSaucerBreak(e);
        Sfx.sirenStop(); Sfx.saucerBoom();
        if (e.points) floatText(e.x, e.y, '+' + e.points, true);
        break;
      case 'saucer': Sfx.sirenStart(e.size); break;
      case 'saucerGone': Sfx.sirenStop(); break;
      case 'shipDie':
        scene.spawnShipDeath(e);
        Sfx.thrust(0); Sfx.die();
        break;
      case 'respawn': scene.spawnReappear(st.ship.x, st.ship.y); break;
      case 'hyper': scene.spawnHyper(e.x, e.y); Sfx.hyper(); break;
      case 'reappear': scene.spawnReappear(e.x, e.y); Sfx.reappear(); break;
      case 'extraLife': Sfx.extra(); floatText(st.W / 2, st.H * 0.3, 'EXTRA SHIP', true); break;
      case 'wave': if (e.wave > 1) { Sfx.wave(); floatText(st.W / 2, st.H * 0.3, 'WAVE ' + e.wave, true); } break;
      case 'rockOpen': scene.spawnOpen(e.x, e.y); Sfx.open(); break;
      case 'exit':
        mode = 'exiting';
        exitPending = e.which;
        scene.spawnHyper(st.ship.x, st.ship.y);
        Sfx.thrust(0); Sfx.sirenStop(); Sfx.exit();
        setTimeout(() => takeExit(e.which), EXIT_BEAT);
        break;
      case 'over': gameOver(); break;
      default: break;
    }
  }
}
const floatLayer = $('float');
const _pt = {};
function floatText(x, y, text, big) {
  if (!scene) return;
  scene.projectToScreen(x, y, _pt);
  const el = document.createElement('div');
  el.className = 'float' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = _pt.x + 'px'; el.style.top = _pt.y + 'px';
  floatLayer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function frameStep(dt) {
  if (!state) return;
  if (mode === 'attract') {
    Core.step(state, { rotate: 0, thrust: false, fire: false, hyper: false }, dt);
    state.ship.alive = false; state.ship.deadT = 0; state.lives = 1;   // never respawns, never over
    if (Core.rocksLeft(state) < 3) { state = Core.createGame(coreOpts(true)); state.ship.alive = false; }
    return;
  }
  if (mode !== 'play' && mode !== 'exiting') return;
  const input = mode === 'play' ? currentInput() : { rotate: 0, thrust: false, fire: false, hyper: false };
  Core.step(state, input, dt);
  handleEvents(state);
  // the heartbeat: quickens as the field thins
  if (mode === 'play' && state.ship.alive && !state.over) {
    const left = Core.rocksLeft(state), total = Core.waveCount(state, state.wave) * 4;
    const k = Math.max(0, Math.min(1, left / Math.max(1, total)));
    const interval = 0.34 + 0.7 * k;
    heartT += dt;
    if (heartT >= interval) { heartT = 0; Sfx.beat(heartLow); heartLow = !heartLow; }
  }
  if (restartArmed > 0) { restartArmed -= dt; if (restartArmed <= 0) { restartArmed = 0; $('btn-restart').classList.remove('armed'); $('btn-restart').textContent = 'RESTART'; } }
}

function frame(t) {
  requestAnimationFrame(frame);
  if (!scene) return;
  const dtReal = lastT ? Math.max(0, Math.min(0.1, (t - lastT) / 1000)) : 0;
  lastT = t;
  carry += dtReal;
  while (carry >= STEP) { frameStep(STEP); carry -= STEP; }
  if (state && state.ship) Sfx.thrust(mode === 'play' && state.ship.alive && !state.ship.hidden && state.ship.thrust ? 1 : 0);
  scene.render({ state, showShip: true }, dtReal);
  renderHud();
}

// ---- the console --------------------------------------------------------------------------------
const SHIP_GLYPH = '<svg viewBox="-14 -12 32 24"><path d="M16 0 L-8 10 L-12 6 L-12 -6 L-8 -10 Z"/></svg>';
let hudKey = '';
function renderHud() {
  if (!state) return;
  const st = state;
  const inGame = mode !== 'attract';
  const lives = inGame ? Math.max(0, st.lives - (st.ship.alive ? 1 : 0) + (st.ship.alive ? 0 : 0)) : play.lives;
  const shown = inGame ? Math.max(0, st.lives - 1) : play.lives - 1;   // ships in reserve, the flying one not counted
  const hyperK = st.ship.alive ? 1 - Math.min(1, st.ship.hyperCd / (st.opts.hyperCooldown || 1)) : 0;
  const key = [inGame ? st.score : 0, shown, inGame ? st.wave : 1, hyperK.toFixed(2), hi].join('|');
  if (key === hudKey) return;
  hudKey = key;
  $('score').textContent = fmt(inGame ? st.score : 0);
  $('wave').textContent = String(inGame ? st.wave : 1);
  $('hi').textContent = fmt(hi);
  let glyphs = '';
  for (let i = 0; i < Math.min(5, shown); i++) glyphs += SHIP_GLYPH;
  if (shown > 5) glyphs += '<span class="more">+' + (shown - 5) + '</span>';
  if (shown <= 0) glyphs = '<span class="more">LAST</span>';
  $('lives').innerHTML = glyphs;
  $('hyper').firstElementChild.style.transform = 'scaleX(' + hyperK.toFixed(3) + ')';
  $('p-hyper').classList.toggle('ready', hyperK >= 1);
  void lives;
}

// ---- the configuration panel ---------------------------------------------------------------------
const tuner = $('tuner');
let tunerPaused = false;
function openTuner() {
  tuner.classList.add('open');
  if (mode === 'play') { togglePause(); tunerPaused = true; }
}
function closeTuner() {
  tuner.classList.remove('open');
  if (tunerPaused && mode === 'paused') togglePause();
  tunerPaused = false;
}
$('tuner-toggle').addEventListener('click', (e) => { e.stopPropagation(); if (tuner.classList.contains('open')) closeTuner(); else openTuner(); });
document.addEventListener('pointerdown', (e) => {
  if (!tuner.classList.contains('open')) return;
  if (e.target.closest('#tuner') || e.target.closest('#tuner-toggle')) return;
  closeTuner();
});
tuner.addEventListener('keydown', (e) => e.stopPropagation());
document.querySelectorAll('#tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab-body').forEach((x) => x.classList.toggle('on', x.dataset.body === b.dataset.tab));
  });
});
function seg(id, key, parse) {
  $(id).querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => { play[key] = parse ? parse(b.dataset.v) : b.dataset.v; save(PLAY_KEY, play); syncPlayUI(); applyLiveOpts(); });
  });
}
seg('t-lives', 'lives', (v) => parseInt(v, 10));
seg('t-cap', 'shotCap', (v) => parseInt(v, 10));
seg('t-lurk', 'lurk', (v) => parseInt(v, 10));
function slider(id, key, fmtv) {
  $(id).addEventListener('input', (e) => { play[key] = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); applyLiveOpts(); });
}
slider('t-rot', 'rotRate'); slider('t-thrust', 'thrust'); slider('t-drag', 'drag'); slider('t-rep', 'fireRepeat'); slider('t-saucer', 'saucer'); slider('t-risk', 'hyperRisk');
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  const on = (id, v) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on('t-lives', play.lives); on('t-cap', play.shotCap); on('t-lurk', play.lurk);
  $('t-rot').value = play.rotRate; $('t-rot-val').textContent = (play.rotRate / (Math.PI * 2)).toFixed(2) + ' turns/s';
  $('t-thrust').value = play.thrust; $('t-thrust-val').textContent = play.thrust;
  $('t-drag').value = play.drag; $('t-drag-val').textContent = play.drag.toFixed(2);
  $('t-rep').value = play.fireRepeat; $('t-rep-val').textContent = play.fireRepeat > 0 ? play.fireRepeat.toFixed(2) + 's' : 'TAP';
  $('t-saucer').value = play.saucer; $('t-saucer-val').textContent = play.saucer + '–' + Math.round(play.saucer * 2.1) + 's';
  $('t-risk').value = play.hyperRisk; $('t-risk-val').textContent = Math.round(play.hyperRisk * 100) + '%';
  $('t-seed').value = play.seed || '';
}
// text size: the whole panel is em off one base
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
    row.innerHTML = `<div class="t-label"><span>${r.label}</span><span data-val="${key}"></span></div>
      <input type="range" data-key="${key}" min="${r.min}" max="${r.max}" step="${r.step}" />`;
    lookRows.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => {
      look[key] = parseFloat(e.target.value);
      save(LOOK_KEY, look);
      syncLookUI();
      applyLook(key === 'res');
    });
  }
}
function syncLookUI() {
  lookRows.querySelectorAll('input').forEach((inp) => {
    const k = inp.dataset.key;
    inp.value = look[k];
    lookRows.querySelector(`[data-val="${k}"]`).textContent = (+look[k]).toFixed(LOOK_RANGES[k].step < 0.1 ? 2 : 1);
  });
}
function applyLook(resized) {
  if (!scene) return;
  scene.setParams(look);
  if (resized) scene.resize();
  applyTint();
}
$('t-reset').addEventListener('click', () => { look = Object.assign({}, DEFAULT_PARAMS); save(LOOK_KEY, look); syncLookUI(); applyLook(true); });

// ---- presets (file-backed via the dev server; saving IS telling Claude) -----------------------
const presetSelect = $('preset-select');
const presetNote = $('preset-note');
const PRESET_URL = '/api/worlds/asteroids/presets';
let presets = {};
const served = location.protocol === 'http:' || location.protocol === 'https:';
function fillPresetList() {
  presetSelect.innerHTML = '<option value="">— preset —</option>';
  Object.keys(presets).sort().forEach((name) => { const o = document.createElement('option'); o.value = name; o.textContent = name; presetSelect.appendChild(o); });
}
async function loadPresets() {
  if (!served) { presetNote.textContent = 'presets need the local server'; return; }
  try {
    const r = await fetch(PRESET_URL);
    const data = await r.json();
    presets = data.presets || {};
    fillPresetList();
    if (data.default && presets[data.default]) {
      presetSelect.value = data.default;
      if (!localStorage.getItem(LOOK_KEY)) { look = Object.assign({}, DEFAULT_PARAMS, presets[data.default]); syncLookUI(); applyLook(true); }
    }
  } catch (e) { presetNote.textContent = 'presets unavailable'; }
}
async function savePresets(defaultName) {
  const r = await fetch(PRESET_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presets, default: defaultName || null }) });
  if (!r.ok) throw new Error((await r.json()).error || r.statusText);
}
presetSelect.addEventListener('change', () => {
  const p = presets[presetSelect.value];
  if (!p) return;
  look = Object.assign({}, DEFAULT_PARAMS, p);
  save(LOOK_KEY, look);
  syncLookUI(); applyLook(true);
});
$('preset-save').addEventListener('click', async () => {
  const name = (prompt('Preset name', presetSelect.value || 'look-01') || '').trim();
  if (!name) return;
  presets[name] = Object.assign({}, look);
  try { await savePresets(name); fillPresetList(); presetSelect.value = name; presetNote.textContent = 'saved "' + name + '"'; }
  catch (e) { presetNote.textContent = 'save failed: ' + e.message; }
});
$('preset-del').addEventListener('click', async () => {
  const name = presetSelect.value;
  if (!name || !presets[name]) return;
  delete presets[name];
  try { await savePresets(null); fillPresetList(); presetNote.textContent = 'deleted "' + name + '"'; }
  catch (e) { presetNote.textContent = 'delete failed: ' + e.message; }
});

// ---- go ---------------------------------------------------------------------------------------------
window.addEventListener('resize', () => {
  if (scene) scene.resize();
  if (state) Core.resizeField(state, fieldAspect());
});
buildLookRows();
syncPlayUI();
syncLookUI();
applyUi();
applyLook(false);
loadPresets();
enterAttract();
requestAnimationFrame(frame);

// the headless checker's read-only handle
globalThis.ASTEROIDS_DEBUG = {
  get state() { return state; }, get mode() { return mode; }, get scene() { return scene; },
  start: startGame, step: frameStep, Core, keys,
};
