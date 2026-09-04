// Lunar Lander — the shell: attempt flow, input, instruments, sound, tuner.
//
// Game rules live in game-core.js (pure, sim-tested). The picture lives in
// render3d.js (pure presentation). This file wires the two together and owns
// nothing else.
import { LanderScene, DEFAULT_PARAMS } from './render3d.js';

const Core = globalThis.LunarCore;

// ---- config -------------------------------------------------------------------
const PLAY_KEY = 'lunar-lander-play-v2';
const LOOK_KEY = 'lunar-lander-look-v2';
const LEDGER_KEY = 'lunar-lander-ledger-v1';
const PLAY_DEFAULTS = { difficulty: 'cadet', fuel: 750, gravity: 1, attack: 0.35, zoom: 1, seed: '' };
const LOOK_RANGES = {
  hue:        { min: 0, max: 1, step: 0.01, label: 'line colour' },
  saturation: { min: 0, max: 1, step: 0.05, label: 'colour depth' },
  brightness: { min: 0.4, max: 2, step: 0.05, label: 'world lines' },
  shipBright: { min: 0.2, max: 1.5, step: 0.05, label: 'lander lines' },
  lineWeight: { min: 1, max: 4, step: 0.1, label: 'line weight' },
  glow:       { min: 0, max: 2.5, step: 0.05, label: 'glow' },
  fov:        { min: 24, max: 60, step: 1, label: 'field of view' },
  depth:      { min: 0, max: 2, step: 0.05, label: 'parallax' },
  bank:       { min: 0, max: 2, step: 0.1, label: 'camera bank' },
  zoomNear:   { min: 1.5, max: 5, step: 0.1, label: 'approach zoom' },
  zoomAlt:    { min: 150, max: 900, step: 10, label: 'zoom altitude' },
  plume:      { min: 0, max: 2, step: 0.1, label: 'thrust plume' },
  stars:      { min: 0, max: 1.5, step: 0.05, label: 'stars' },
  res:        { min: 0.5, max: 1, step: 0.05, label: 'render scale' },
};
// Zoom hysteresis: in below zoomAlt, out only above zoomAlt × ZOOM_OUT_RATIO,
// and never two changes inside ZOOM_DWELL seconds. A pilot bobbing on the
// trigger line must never see the camera pump.
const ZOOM_OUT_RATIO = 1.75;
const ZOOM_DWELL = 3.0;
const MESSAGES = {
  perfect: ['A PERFECT LANDING', 'THE CREW DID NOT FEEL IT'],
  good: ['GOOD LANDING', 'NOT PERFECT, BUT THE CREW WILL WALK'],
  hard: ['HARD LANDING', 'THE LANDER TOOK MINOR DAMAGE'],
  secret: ['BILLIONS SERVED', 'YOU FOUND THE ONLY DRIVE-THROUGH ON THE MOON'],
  crash: {
    speed: ['TOO FAST', 'A 100 MEGABUCK LANDER, GONE'],
    tilt: ['SIDEWAYS', 'YOU CAME IN ON A LEG'],
    drift: ['SKIDDED OFF THE PAD', 'THE LANDER IS SCRAP'],
    terrain: ['MISSED THE PAD', 'THE LANDER IS A CRATER NOW'],
    body: ['INVERTED', 'MISSION CONTROL IS SPEECHLESS'],
  },
};

// ---- helpers -------------------------------------------------------------------
function load(key, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.assign({}, defaults, saved);
  } catch (e) { return Object.assign({}, defaults); }
}
function save(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
}
function pad(n, w) { return String(Math.max(0, Math.round(n))).padStart(w, '0'); }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + pad(s, 2); }
const $ = (id) => document.getElementById(id);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---- state ----------------------------------------------------------------------
let play = load(PLAY_KEY, PLAY_DEFAULTS);
let look = load(LOOK_KEY, DEFAULT_PARAMS);
let state = null;
let scene = null;
let mode = 'attract';         // attract | play | settle | result | paused
let pausedFrom = 'play';
let carry = 0;
let lastT = 0;
// the throttle: hold to burn, release to cut; the wheel sets a hover trim
let burnHeld = false;
let shiftHeld = false;
let trim = 0;
let lever = 0;
let rotHeld = 0;
let abortReq = false;
let hintFadeDone = false;
let restartArmed = 0;
let resultTimer = 0;
let slowMo = 1;
let zoomIn = false;
let zoomChangedAt = -1e9;
let clock = 0;

// Read-only handle for headless checks and the look-dev harness.
Object.defineProperty(globalThis, 'LANDER_DEBUG', {
  get() { return { scene, state, mode, look, play, lever, trim, zoomIn, input: currentInput(), tick: (dt) => frameStep(dt) }; },
});

// ---- renderer ------------------------------------------------------------------------
const canvas = $('field');
try {
  scene = new LanderScene(canvas, look);
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

// ---- sound (Web Audio synthesis, through the shared control) ----------------------------
const Sfx = {
  ctx: null, master: null, on: false, vol: 0.8,
  thrustGain: null, thrustSrc: null, thrustFilter: null,
  beepTimer: 0,
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
    this.thrustGain.gain.setTargetAtTime(level * 0.9, t, 0.03);
    this.thrustFilter.frequency.setTargetAtTime(220 + level * 900, t, 0.05);
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
  beep() { this.env('sine', 1240, 0.05, 0.05); },
  tick() { this.env('square', 180, 0.02, 0.03); },
  abort() { this.env('sawtooth', 90, 0.5, 0.18, 260); this.noise(0.5, 0.4, 700); },
  crash() { this.noise(1.1, 0.9, 900); this.env('sine', 70, 0.9, 0.5, 30); },
  land(kind) {
    const notes = kind === 'perfect' ? [659, 880, 1318] : kind === 'good' ? [523, 784] : [330, 262];
    notes.forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.25, 0.14), i * 120));
  },
  secret() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => setTimeout(() => this.env('square', f, 0.12, 0.06), i * 95)); },
  over() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.35, 0.14), i * 160)); },
};
if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({
    start: () => Sfx.start(),
    stop: () => Sfx.stop(),
    setVolume: (v) => Sfx.setVolume(v),
  });
}

// ---- the ledger -------------------------------------------------------------------------
function readLedger() {
  try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); } catch (e) { return []; }
}
function writeLedger(list) { try { localStorage.setItem(LEDGER_KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {} }
function renderLedger(highlight) {
  const el = $('ledger');
  const list = readLedger();
  el.innerHTML = '';
  list.forEach((e, i) => {
    const cls = highlight && e.stamp === highlight ? ' me' : '';
    el.insertAdjacentHTML('beforeend',
      `<span class="${cls}">${i + 1}.</span><span class="r${cls}">${pad(e.score, 4)}</span><span class="${cls}">${e.difficulty.toUpperCase()} · ${e.attempts} FLIGHTS</span>`);
  });
}

// ---- flow -----------------------------------------------------------------------------------
function makeGame() {
  let seed = parseInt(play.seed, 10);
  if (!Number.isFinite(seed)) seed = (Math.random() * 0xffffffff) >>> 0;
  state = Core.createGame({ seed, difficulty: play.difficulty, fuel: play.fuel, gravityScale: play.gravity });
  if (scene) { scene.setTerrain(state.terrain); scene.clearEffects(); }
}
function resetThrottle() { lever = 0; trim = 0; burnHeld = false; zoomIn = false; zoomChangedAt = -1e9; }
function enterAttract(resultLine, stamp) {
  mode = 'attract';
  document.body.classList.remove('paused');
  $('result-card').classList.remove('show');
  const sr = $('start-result');
  if (resultLine) { sr.textContent = resultLine; sr.style.display = 'block'; } else { sr.style.display = 'none'; }
  renderLedger(stamp);
  $('start-card').classList.add('show');
  if (!state || state.phase === 'over') makeGame();
  resetThrottle();
  renderInstruments();
}
function startGame() {
  if (mode !== 'attract') return;
  makeGame();
  $('start-card').classList.remove('show');
  mode = 'play';
  carry = 0;
  resetThrottle();
  Sfx.beepTimer = 0;
  $('ro-select').textContent = Core.DIFFICULTY[state.difficulty].label;
  if (!hintFadeDone) { hintFadeDone = true; $('hint').classList.add('faded'); }
}
function nextAttempt() {
  if (mode !== 'result') return;
  if (state.phase === 'over') {
    const stamp = Date.now();
    const list = readLedger();
    list.push({ score: state.score, attempts: state.attempt, difficulty: state.difficulty, stamp });
    list.sort((a, b) => b.score - a.score);
    writeLedger(list);
    const line = 'OUT OF FUEL — FINAL SCORE ' + pad(state.score, 4) + ' IN ' + state.attempt + ' FLIGHTS';
    state = null;
    enterAttract(line, stamp);
    return;
  }
  Core.newAttempt(state);
  scene.setTerrain(state.terrain);
  scene.clearEffects();
  $('result-card').classList.remove('show');
  mode = 'play';
  carry = 0;
  resetThrottle();
}
function showResult(result) {
  mode = 'result';
  const isCrash = result.kind === 'crash';
  const msg = isCrash ? MESSAGES.crash[result.reason] || MESSAGES.crash.speed : MESSAGES[result.kind];
  $('r-word').textContent = isCrash ? 'CRASHED' : result.kind === 'secret' ? 'WELCOME' : 'LANDED';
  $('r-msg').textContent = msg[0];
  $('r-detail').textContent = msg[1] + ' — ' + result.vy + ' FT/S DOWN · ' + result.vx + ' FT/S ACROSS · ' + result.tilt + '° TILT';
  let pts = '';
  if (result.kind === 'secret') pts = 'NO POINTS. NO REGRETS.';
  else if (isCrash) pts = pad(result.points, 2) + ' POINTS · FUEL −50';
  else pts = pad(result.points, 3) + ' POINTS (' + result.pad.mult + 'X PAD)' + (result.fuelBonus ? ' · FUEL +' + result.fuelBonus : '');
  if (state.phase === 'over') pts += ' · TANK DRY';
  $('r-points').textContent = pts;
  $('btn-next').textContent = state.phase === 'over' ? 'GAME OVER' : 'NEXT FLIGHT';
  $('result-card').classList.add('show');
}
function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'abort') Sfx.abort();
    else if (e.type === 'landed') {
      const r = e.result;
      scene.spawnTouchdown(state.ship.x, state.ship.y - 11, r.kind === 'perfect' ? 0.4 : r.kind === 'good' ? 0.8 : 1.3);
      if (r.points > 0) scene.spawnTally(state.ship.x, state.ship.y + 10, '+' + r.points);
      if (r.kind === 'secret') Sfx.secret(); else Sfx.land(r.kind);
      resultTimer = 1.9;
      mode = 'settle';
    } else if (e.type === 'crashed') {
      scene.spawnCrash(state.ship);
      Sfx.crash();
      slowMo = 0.18;              // the beat: the pieces hang, then time comes back
      resultTimer = 2.3;
      mode = 'settle';
    } else if (e.type === 'over') {
      setTimeout(() => Sfx.over(), 900);
    }
  }
}

// ---- frame ------------------------------------------------------------------------------------
function currentInput() {
  return { rotate: rotHeld, lever: shiftHeld ? 1 : lever, abort: abortReq };
}
function updateThrottle(dt) {
  // Hold to burn: the lever ramps linearly to full in `attack` seconds, so a
  // tap is a nudge and a hold is a burn. Release cuts to the trim at once.
  // Nothing here ever stops a held burn — it runs as long as the key and the
  // fuel do.
  if (burnHeld) {
    lever = clamp01(lever + dt / Math.max(0.05, play.attack));
  } else {
    lever += (trim - lever) * (1 - Math.exp(-dt / 0.045));
    if (Math.abs(lever - trim) < 0.002) lever = trim;
  }
}
function updateZoom(dt) {
  clock += dt;
  if (!play.zoom || !state || state.phase !== 'flying') return;
  const alt = Core.altitude(state);
  const since = clock - zoomChangedAt;
  if (!zoomIn && alt < look.zoomAlt && since > ZOOM_DWELL * 0.5) { zoomIn = true; zoomChangedAt = clock; }
  else if (zoomIn && alt > look.zoomAlt * ZOOM_OUT_RATIO && since > ZOOM_DWELL) { zoomIn = false; zoomChangedAt = clock; }
}
function frameStep(dt) {
  if (!scene) return;
  if (mode === 'play') {
    updateThrottle(dt);
    updateZoom(dt);
    const r = Core.advance(state, currentInput(), dt, carry);
    carry = r.carry;
    abortReq = false;
    handleEvents(r.events);
    const alt = Core.altitude(state);
    if (state.phase === 'flying' && alt < 300 && state.ship.vy < -1) {
      Sfx.beepTimer -= dt;
      if (Sfx.beepTimer <= 0) { Sfx.beep(); Sfx.beepTimer = 0.12 + (alt / 300) * 0.9; }
    }
    Sfx.thrust(state.ship.thrust);
  } else if (mode === 'settle') {
    Sfx.thrust(0);
    resultTimer -= dt;
    if (resultTimer <= 0) showResult(state.result);
  } else {
    Sfx.thrust(0);
  }
  slowMo += (1 - slowMo) * (1 - Math.exp(-dt / 0.7));
  if (mode !== 'settle') slowMo = 1;
  renderInstruments();
  const view = state ? {
    ship: state.ship,
    thrust: state.ship.thrust,
    rotate: mode === 'play' ? rotHeld : 0,
    flying: state.phase === 'flying' && mode === 'play',
    zoomOn: zoomIn && (mode === 'play' || mode === 'settle' || mode === 'result'),
    gravity: Core.GRAVITY * Core.DIFFICULTY[state.difficulty].gravity * play.gravity,
    showShip: state.ship.alive,
    secret: state.result && state.result.kind === 'secret',
  } : null;
  scene.render(view, dt * slowMo);
}
function frame(t) {
  // clamped both ways: a clock that steps backwards (a resumed tab, a
  // synthetic pump) must never feed the easing a negative dt
  const dt = lastT ? Math.max(0, Math.min(0.1, (t - lastT) / 1000)) : 0;
  lastT = t;
  if (mode !== 'paused') frameStep(dt);
  requestAnimationFrame(frame);
}

// ---- instruments ------------------------------------------------------------------------------
const GOOD = Core.GRADES[1], HARD = Core.GRADES[2];
function arcPath(r, a0, a1) {
  // degrees, 0 = straight up, clockwise positive; SVG y is down
  const p = (a) => [Math.sin(a * Math.PI / 180) * r, -Math.cos(a * Math.PI / 180) * r];
  const s = p(a0), e = p(a1);
  return `M${s[0].toFixed(2)} ${s[1].toFixed(2)} A${r} ${r} 0 0 1 ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
}
{
  const gd = GOOD.tilt * 180 / Math.PI, hd = HARD.tilt * 180 / Math.PI;
  $('att-good').setAttribute('d', arcPath(56, -gd, gd));
  $('att-hard-l').setAttribute('d', arcPath(56, -hd, -gd - 1));
  $('att-hard-r').setAttribute('d', arcPath(56, gd + 1, hd));
}
function renderInstruments() {
  if (!state) return;
  const r = Core.readouts(state);
  const s = state.ship;
  const flying = state.phase === 'flying' && mode === 'play';
  const near = r.altitude < 220 && flying;
  $('v-score').textContent = pad(r.score, 4);
  $('v-time').textContent = fmtTime(r.time);
  $('v-flight').textContent = 'FLIGHT ' + state.attempt;
  $('v-fuel').textContent = pad(r.fuel, 4);
  $('fuel-fill').style.width = (100 * Math.max(0, Math.min(1, state.fuel / Math.max(1, state.fuelStart)))).toFixed(1) + '%';
  $('fuel').classList.toggle('low', r.fuel > 0 && r.fuel < 100 && flying);
  const altEl = $('v-alt');
  altEl.innerHTML = pad(r.altitude, 4) + '<span class="unit">FT</span>';
  altEl.classList.toggle('close', near);
  $('a-h').textContent = r.hSpeed > 0 ? '→' : r.hSpeed < 0 ? '←' : '';
  $('v-h').textContent = pad(Math.abs(r.hSpeed), 2);
  $('a-v').textContent = r.vSpeed > 0 ? '↑' : r.vSpeed < 0 ? '↓' : '';
  $('v-v').textContent = pad(Math.abs(r.vSpeed), 2);
  // near the ground the speeds grade themselves: green inside a good landing, white and blinking outside
  const vs = $('vs'), hs = $('hs');
  vs.classList.toggle('ok', near && -s.vy <= GOOD.vy);
  vs.classList.toggle('hot', near && -s.vy > GOOD.vy);
  hs.classList.toggle('ok', near && Math.abs(s.vx) <= GOOD.vx);
  hs.classList.toggle('hot', near && Math.abs(s.vx) > GOOD.vx);
  // throttle
  const th = flying ? s.thrust : 0;
  $('thrust-fill').style.height = (th * 100).toFixed(1) + '%';
  $('v-thrust').textContent = Math.round(th * 100) + '%';
  const tm = $('thrust-trim');
  tm.classList.toggle('on', trim > 0.005 && flying);
  tm.style.bottom = (Math.pow(trim, state.opts.leverCurve) * 100).toFixed(1) + '%';
  // attitude
  const deg = s.angle * 180 / Math.PI;
  $('att-horizon').setAttribute('transform', 'rotate(' + (-deg).toFixed(2) + ')');
  const needle = $('att-needle');
  needle.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ')');
  needle.classList.toggle('out', Core.tiltOf(s.angle) > GOOD.tilt);
  $('tilt-val').textContent = Math.abs(Math.round(Core.tiltOf(s.angle) * 180 / Math.PI)) + '°';
}

// ---- input ---------------------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { rotHeld = -1; e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { rotHeld = 1; e.preventDefault(); }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') { burnHeld = true; e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { trim = 0; e.preventDefault(); }
  else if (k === 'Shift') { shiftHeld = true; }
  else if (k === ' ') {
    e.preventDefault();
    if (mode === 'paused') togglePause();
    else if (mode === 'play') abortReq = true;
    else if (mode === 'result') nextAttempt();
  } else if (k === 'Enter') {
    if (mode === 'attract') startGame();
    else if (mode === 'result') nextAttempt();
  } else if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); }
  else if (k === 'r' || k === 'R') { armRestart(); }
  if (!e.repeat && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd' || k === 'A' || k === 'D') && mode === 'play') Sfx.tick();
});
window.addEventListener('keyup', (e) => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (rotHeld === -1) rotHeld = 0; }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (rotHeld === 1) rotHeld = 0; }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') { burnHeld = false; }
  else if (k === 'Shift') { shiftHeld = false; }
});
window.addEventListener('blur', () => { rotHeld = 0; burnHeld = false; shiftHeld = false; if (mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') togglePause(); });
// the wheel sets the hover trim anywhere over the field
window.addEventListener('wheel', (e) => {
  if (e.target.closest && e.target.closest('#tuner')) return;
  if (mode !== 'play') return;
  trim = clamp01(trim - Math.sign(e.deltaY) * 0.02);
}, { passive: true });
// hold the pointer on the field to burn (touch / mouse)
canvas.addEventListener('pointerdown', (e) => { if (mode === 'play') { burnHeld = true; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} } });
canvas.addEventListener('pointerup', () => { burnHeld = false; });
canvas.addEventListener('pointercancel', () => { burnHeld = false; });

function togglePause() {
  if (mode === 'paused') {
    mode = pausedFrom;
    document.body.classList.remove('paused');
    lastT = 0;
  } else if (mode === 'play' || mode === 'settle') {
    pausedFrom = mode;
    mode = 'paused';
    document.body.classList.add('paused');
    Sfx.thrust(0);
  }
}
function armRestart() {
  if (mode === 'attract') return;
  const btn = $('btn-restart');
  if (restartArmed) {
    clearTimeout(restartArmed); restartArmed = 0;
    btn.classList.remove('armed'); btn.textContent = 'RESTART';
    document.body.classList.remove('paused');
    $('result-card').classList.remove('show');
    scene.clearEffects();
    Sfx.thrust(0);
    state = null;
    enterAttract('FLIGHT ABANDONED');
    return;
  }
  btn.classList.add('armed'); btn.textContent = 'SURE?';
  restartArmed = setTimeout(() => { restartArmed = 0; btn.classList.remove('armed'); btn.textContent = 'RESTART'; }, 3000);
}
$('btn-pause').addEventListener('click', togglePause);
$('btn-restart').addEventListener('click', armRestart);
$('btn-start').addEventListener('click', startGame);
$('btn-next').addEventListener('click', nextAttempt);

// ---- tuner --------------------------------------------------------------------------------------
const tuner = $('tuner');
$('tuner-toggle').addEventListener('click', (e) => { e.stopPropagation(); tuner.classList.toggle('open'); });
document.addEventListener('pointerdown', (e) => {
  if (!tuner.classList.contains('open')) return;
  if (e.target.closest('#tuner') || e.target.closest('#tuner-toggle')) return;
  tuner.classList.remove('open');
});
tuner.addEventListener('keydown', (e) => e.stopPropagation());
document.querySelectorAll('#tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab-body').forEach((x) => x.classList.toggle('on', x.dataset.body === b.dataset.tab));
  });
});
function seg(id, key, parse) {
  const box = $(id);
  box.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      play[key] = parse ? parse(b.dataset.v) : b.dataset.v;
      save(PLAY_KEY, play);
      syncPlayUI();
    });
  });
}
seg('t-diff', 'difficulty');
seg('t-fuel', 'fuel', (v) => parseInt(v, 10));
seg('t-zoom', 'zoom', (v) => parseInt(v, 10));
$('t-grav').addEventListener('input', (e) => { play.gravity = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); if (state) state.opts.gravityScale = play.gravity; });
$('t-attack').addEventListener('input', (e) => { play.attack = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  const on = (id, v) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on('t-diff', play.difficulty);
  on('t-fuel', play.fuel);
  on('t-zoom', play.zoom);
  $('t-grav').value = play.gravity; $('t-grav-val').textContent = play.gravity.toFixed(2) + '×';
  $('t-attack').value = play.attack; $('t-attack-val').textContent = play.attack.toFixed(2) + 's';
  $('t-seed').value = play.seed || '';
  if (mode === 'attract') $('ro-select').textContent = Core.DIFFICULTY[play.difficulty].label;
}

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
$('t-reset').addEventListener('click', () => {
  look = Object.assign({}, DEFAULT_PARAMS);
  save(LOOK_KEY, look);
  syncLookUI();
  applyLook(true);
});

// ---- presets (file-backed via the dev server; saving IS telling Claude) ------------------------
const presetSelect = $('preset-select');
const presetNote = $('preset-note');
const PRESET_URL = '/api/worlds/lunar-lander/presets';
let presets = {};
const served = location.protocol === 'http:' || location.protocol === 'https:';
function fillPresetList() {
  presetSelect.innerHTML = '<option value="">— preset —</option>';
  Object.keys(presets).sort().forEach((name) => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    presetSelect.appendChild(o);
  });
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
      if (!localStorage.getItem(LOOK_KEY)) {
        look = Object.assign({}, DEFAULT_PARAMS, presets[data.default]);
        syncLookUI(); applyLook(true);
      }
    }
  } catch (e) { presetNote.textContent = 'presets unavailable'; }
}
async function savePresets(defaultName) {
  const r = await fetch(PRESET_URL, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presets, default: defaultName || null }),
  });
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

// ---- go -----------------------------------------------------------------------------------------
window.addEventListener('resize', () => { if (scene) scene.resize(); });
buildLookRows();
syncPlayUI();
syncLookUI();
applyLook(false);
loadPresets();
enterAttract();
requestAnimationFrame(frame);
