// Lunar Lander — the shell: attempt flow, input, instruments, sound, tuner.
//
// Game rules live in game-core.js (pure, sim-tested). The picture lives in
// render3d.js (pure presentation). This file wires the two together and owns
// nothing else.
import { LanderScene, DEFAULT_PARAMS } from './render3d.js?v=4';

const Core = globalThis.LunarCore;

// ---- config -------------------------------------------------------------------
const PLAY_KEY = 'lunar-lander-play-v2';
const LOOK_KEY = 'lunar-lander-look-v2';
const LEDGER_KEY = 'lunar-lander-ledger-v1';
const PLAY_DEFAULTS = { fuel: 750, gravity: 1, attack: 0.35, zoom: 1, seed: '', wheelStep: 5, launchAngle: 60, launchApex: 0.75 };
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
  ringBright: { min: 0.02, max: 0.4, step: 0.01, label: 'aid ring' },
  triBright:  { min: 0.02, max: 0.6, step: 0.01, label: 'aid triangle' },
  res:        { min: 0.5, max: 1, step: 0.05, label: 'render scale' },
};
// Zoom hysteresis: in below zoomAlt, out only above zoomAlt × ZOOM_OUT_RATIO,
// and never two changes inside ZOOM_DWELL seconds. A pilot bobbing on the
// trigger line must never see the camera pump.
const ZOOM_OUT_RATIO = 1.3;    // was 1.75 — James: the camera "is not panning back soon enough"
const ZOOM_DWELL = 1.6;        // was 3.0
const ZOOM_CLIMB = 25;         // ft/s up: climbing this fast zooms out at once (see LAUNCH_WIDE)
const ZOOM_REACH = 700;        // ft sideways: only a pad this near counts for the zoom (James, 2026-09-05:
                               // "it shouldn't zoom you in when you go past the tip of a mountain")
const LAUNCH_WIDE = 220;       // ft above the launch pad: the camera goes wide here after a launch, whatever the ground below is doing
const TECH_NAMES = {};
for (const t of globalThis.LunarCore.TECH) TECH_NAMES[t.id] = t.name;
const TECH_HOW = {
  shock: 'Earned by a good or perfect landing on a 4X or 5X pad. The vertical-speed limit of every grade doubles: perfect up to 10 ft/s, hard up to 60.',
  spider: 'Earned next, the same way. The legs fan out under 60 ft and every tilt limit grows by half: a perfect allows 6°, a hard landing 27°.',
  auto: 'The last piece: only a PERFECT on a 5X pad while holding the other two. Under 100 ft, tap W or Space once and it holds a 4 ft/s descent. Any flight key hands the ship back.',
};
const TECH_BLURB = {
  shock: 'YOU CAN LAND TWICE AS HARD',
  spider: 'YOU CAN LAND HALF AGAIN AS TILTED',
  auto: 'TAP W UNDER 100 FT AND IT FLIES YOU DOWN',
};
// The ways out — hidden drift anchors the game clicks (drift.js picks the world)
const EXITS = {
  drivethru: () => $('exit-drivethru'),
  relay: () => $('exit-relay'),
  horizon: () => $('exit-horizon'),
  wreck: () => $('exit-wreck'),
};
let exitPending = null;   // which exit the result card offers
function takeExit(which) {
  const a = EXITS[which] && EXITS[which]();
  if (!a) return;
  Sfx.thrust(0);
  a.click();
}
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
    struck: ['FLEW INTO A BUILDING', 'THE STRUCTURES ARE SOLID. SO WAS THE LANDER.'],
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
// the landing tech in flight: auto-throttle engaged, shock-leg squash
let autoOn = false;
// the ring accelerator sequence after a landing: slide → tilt → fire
let launchT = -1;
const LAUNCH = { rise: 0.9, slide: 1.0, tilt: 0.8, pullMax: 2.4, untilt: 0.8, sinkT: 0.9 };   // rise out of the ground → slide → tilt → pull the camera out → fire → untilt → sink back
let launchAfter = null;        // the launcher's exit after the shot: { pad, t } while it untilts and sinks
let launchLit = 0;
let launchPadY = null;         // the pad the last launch left from (for the zoom-out rule)
let squashT = -1;            // seconds since touchdown on shock legs, -1 = none
let techDrawn = '';

// Read-only handle for headless checks and the look-dev harness.
Object.defineProperty(globalThis, 'LANDER_DEBUG', {
  get() { return { scene, state, mode, look, play, lever, trim, zoomIn, autoOn, launchT, input: currentInput(), tick: (dt) => frameStep(dt) }; },
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
  earn() { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.22, 0.12), 500 + i * 110)); },
  lose() { [440, 349].forEach((f, i) => setTimeout(() => this.env('sawtooth', f, 0.3, 0.06), 900 + i * 220)); },
  autoOn() { this.env('sine', 880, 0.08, 0.06); setTimeout(() => this.env('sine', 1320, 0.1, 0.06), 90); },
  autoOff() { this.env('sine', 660, 0.08, 0.05); },
  ring(i) { this.env('sine', 440 * Math.pow(1.25, i), 0.18, 0.09); this.env('triangle', 880 * Math.pow(1.25, i), 0.12, 0.04); },
  launch() { this.noise(0.7, 0.5, 1400); this.env('sawtooth', 120, 0.7, 0.12, 420); },
  refuel() { [392, 494, 587].forEach((f, i) => setTimeout(() => this.env('sine', f, 0.3, 0.08), 300 + i * 140)); },
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
      `<span class="${cls}">${i + 1}.</span><span class="r${cls}">${pad(e.score, 4)}</span><span class="${cls}">${e.level ? 'LEVEL ' + e.level : (e.difficulty || 'cadet').toUpperCase()} · ${e.attempts} FLIGHTS</span>`);
  });
}

// ---- flow -----------------------------------------------------------------------------------
function makeGame() {
  let seed = parseInt(play.seed, 10);
  if (!Number.isFinite(seed)) seed = (Math.random() * 0xffffffff) >>> 0;
  state = Core.createGame({ seed, level: 1, fuel: play.fuel, gravityScale: play.gravity });
  if (scene) { scene.setWorld(state); scene.clearEffects(); }
  clearFloats();
  buildPadLabels();
}
function resetThrottle() { lever = 0; trim = 0; burnHeld = false; zoomIn = false; zoomChangedAt = -1e9; autoOn = false; squashT = -1; launchAfter = null; }
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
  $('ro-select').textContent = 'LEVEL ' + state.level;
  if (!hintFadeDone) { hintFadeDone = true; $('hint').classList.add('faded'); }
}
function nextAttempt() {
  if (mode !== 'result') return;
  if (state.phase === 'over') {
    const stamp = Date.now();
    const list = readLedger();
    list.push({ score: state.score, attempts: state.attempt, level: state.level, stamp });
    list.sort((a, b) => b.score - a.score);
    writeLedger(list);
    const line = 'OUT OF FUEL — FINAL SCORE ' + pad(state.score, 4) + ' IN ' + state.attempt + ' FLIGHTS';
    state = null;
    enterAttract(line, stamp);
    return;
  }
  Core.newAttempt(state);
  scene.clearEffects();
  clearFloats();
  buildPadLabels();
  $('result-card').classList.remove('show');
  carry = 0;
  resetThrottle();
  if (state.phase === 'launch') { mode = 'launch'; launchT = 0; launchLit = 0; zoomIn = true; zoomChangedAt = -1e9; }
  else mode = 'play';
}
// The accelerator sequence: the ship slides right onto the rail, the rail
// tilts downrange, then the ship fires up through the rings, each lighting as
// it passes; the core's launchFire() hands over real physics from the last
// ring. Returns the view's launch descriptor.
function stepLaunch(dt) {
  const L = state.launch;
  if (!L) { mode = 'play'; return null; }
  const pad = L.pad;
  const base = Core.accelBase(pad);
  if (L.aimed === undefined) {
    L.aimed = Core.launchAngleFor(state, play.launchAngle, play.launchApex);   // steepened if the coast would hit ground
    const ex = Core.launchExit(state, pad, L.aimed, play.launchApex);
    L.vExit = Math.hypot(ex.vx, ex.vy);
    // The ride profile (James: "start off slow and rather quickly get up to
    // speed... by the end of the tube it's at full speed"): speed as a
    // function of distance along the rail, v(f) = v0 + (vExit − v0)·√f, so
    // the acceleration is front-loaded and the ship leaves the last ring at
    // exactly the coast speed. Integrated once into a time→distance table.
    const Lr = Core.ACCEL.railLen, v0 = L.vExit * 0.08, N = 96;
    const tOf = [0];
    for (let i = 1; i <= N; i++) {
      const f0 = (i - 1) / N, f1 = i / N;
      const va = v0 + (L.vExit - v0) * Math.sqrt(f0), vb = v0 + (L.vExit - v0) * Math.sqrt(f1);
      tOf.push(tOf[i - 1] + (Lr / N) / ((va + vb) * 0.5));
    }
    L.ride = tOf[N];
    L.distAt = (t) => {                                                       // invert the table
      if (t <= 0) return 0;
      if (t >= L.ride) return Lr;
      let lo = 0, hi = N;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tOf[m] <= t) lo = m; else hi = m; }
      const u = (t - tOf[lo]) / (tOf[hi] - tOf[lo]);
      return Lr * (lo + u) / N;
    };
  }
  const angle = L.aimed * Math.PI / 180;
  const s = state.ship;
  const startX = (pad.x0 + pad.x1) / 2;
  launchT += dt;
  let tilt = 0, lit = 0, sink = 0;
  const T1 = LAUNCH.rise, T2 = T1 + LAUNCH.slide, T3 = T2 + LAUNCH.tilt;
  if (launchT < T1) {
    // the launcher rises out of the apron beside the pad
    const u = launchT / T1, e = u * u * (3 - 2 * u);
    sink = 1 - e;
    s.x = startX; s.y = pad.y + 11; s.angle = 0;
  } else if (launchT < T2) {
    const u = (launchT - T1) / LAUNCH.slide, e = u * u * (3 - 2 * u);
    s.x = startX + (base.x - startX) * e; s.y = pad.y + 11; s.angle = 0;
  } else if (launchT < T3) {
    const u = (launchT - T2) / LAUNCH.tilt, e = u * u * (3 - 2 * u);
    tilt = (Math.PI / 2 - angle) * e;
    s.x = base.x; s.y = pad.y + 11; s.angle = tilt;
  } else if (L.fireAt === undefined) {
    // pull back: the camera goes all the way out before the shot (James);
    // fire once the zoom has settled, or after pullMax seconds regardless
    tilt = Math.PI / 2 - angle;
    s.x = base.x; s.y = pad.y + 11; s.angle = tilt;
    if (zoomIn) { zoomIn = false; zoomChangedAt = clock; }
    const pulled = launchT - T3;
    if (scene.zoom < 1.03 || pulled > LAUNCH.pullMax) L.fireAt = launchT;
  } else if (launchT < L.fireAt + L.ride) {
    // the ride: speed climbs linearly from a kick (45% of exit speed) to the
    // exit speed itself at the last ring, so the motion is continuous into
    // the coast — no snap when the physics take over
    const t = launchT - L.fireAt;
    tilt = Math.PI / 2 - angle;
    const d = L.distAt(t);
    s.x = base.x + Math.cos(angle) * d; s.y = pad.y + 11 + Math.sin(angle) * d; s.angle = tilt;
    const ringAt = (i) => 18 + (Core.ACCEL.railLen - 18) * i / (Core.ACCEL.rings - 1);
    lit = 0;
    for (let i = 0; i < Core.ACCEL.rings; i++) if (d >= ringAt(i) - 4) lit = i + 1;
    while (launchLit < lit) { launchLit++; Sfx.ring(launchLit); }
  } else {
    Core.launchFire(state, L.aimed, play.launchApex);
    launchPadY = pad.y;
    scene.spawnLaunch(base.x, base.y, angle);
    if (L.aimed !== play.launchAngle) floatLabel(s.x, s.y + 30, 'AIMED ' + L.aimed + '° TO CLEAR THE GROUND', 'fuel', 0);
    Sfx.launch();
    // the launcher stays behind: it straightens up and sinks back into the ground
    launchAfter = { pad, angle, t: 0 };
    mode = 'play';
    carry = 0;
    return null;
  }
  return { pad, tilt, lit, sink };
}
// After the shot: the launcher untilts, then sinks into the apron, then is gone.
function stepLaunchAfter(dt) {
  if (!launchAfter) return null;
  const A = launchAfter;
  A.t += dt;
  const full = Math.PI / 2 - A.angle;
  if (A.t < LAUNCH.untilt) {
    const u = A.t / LAUNCH.untilt, e = u * u * (3 - 2 * u);
    return { pad: A.pad, tilt: full * (1 - e), lit: 0, sink: 0 };
  }
  if (A.t < LAUNCH.untilt + LAUNCH.sinkT) {
    const u = (A.t - LAUNCH.untilt) / LAUNCH.sinkT, e = u * u * (3 - 2 * u);
    return { pad: A.pad, tilt: 0, lit: 0, sink: e };
  }
  launchAfter = null;
  return null;
}
function showResult(result) {
  mode = 'result';
  const isCrash = result.kind === 'crash';
  const msg = isCrash ? MESSAGES.crash[result.reason] || MESSAGES.crash.speed : MESSAGES[result.kind];
  const struckLine = result.struck ? 'YOU HIT THE ' + result.struck.name : null;
  $('r-word').textContent = isCrash ? 'CRASHED' : result.kind === 'secret' ? 'WELCOME' : 'LANDED';
  $('r-msg').textContent = struckLine || msg[0];
  $('r-detail').textContent = msg[1] + ' — ' + result.vy + ' FT/S DOWN · ' + result.vx + ' FT/S ACROSS · ' + result.tilt + '° TILT';
  let pts = '';
  if (result.kind === 'secret') pts = 'NO POINTS. NO REGRETS.';
  else if (isCrash) pts = pad(result.points, 2) + ' POINTS · FUEL −50';
  else if (result.reused) pts = 'NO POINTS — THIS PAD HAS PAID ALREADY' + (result.fuelBonus ? ' · FUEL +' + result.fuelBonus : '');
  else pts = pad(result.points, 3) + ' POINTS (' + result.pad.mult + 'X PAD)' + (result.fuelBonus ? ' · FUEL +' + result.fuelBonus : '');
  if (result.fuelPad) pts += ' · FUEL PAD +' + result.fuelPad;
  if (state.phase === 'over') pts += ' · TANK DRY';
  $('r-points').textContent = pts;
  const rt = $('r-tech');
  if (result.techEarned) { rt.textContent = 'EARNED ' + TECH_NAMES[result.techEarned] + ' — ' + TECH_BLURB[result.techEarned]; rt.className = 'line tech earned'; }
  else if (result.techLost) { rt.textContent = 'LOST ' + TECH_NAMES[result.techLost]; rt.className = 'line tech lost'; }
  else { rt.textContent = ''; rt.className = 'line tech'; }
  $('btn-next').textContent = state.phase === 'over' ? 'GAME OVER' : (!isCrash && result.pad) ? 'LAUNCH' : 'NEXT FLIGHT';
  // the ways out this card can offer
  exitPending = null;
  const ex = $('btn-exit'), exNote = $('r-exit');
  if (result.kind === 'secret') { exitPending = 'drivethru'; ex.textContent = 'WALK IN'; exNote.textContent = 'THE DOOR UNDER THE ARCHES IS OPEN'; }
  else if (!isCrash && result.pad && result.pad.relay) { exitPending = 'relay'; ex.textContent = 'ENTER THE RELAY'; exNote.textContent = 'THE TOWER LAMP HAS GONE SOLID. THE DOOR IS OPEN.'; }
  else if (state.phase === 'over') { exitPending = 'wreck'; ex.textContent = isCrash ? 'OPEN THE HATCH' : 'CLIMB OUT'; exNote.textContent = isCrash ? 'A DIM HATCH IN THE WRECK SWINGS OPEN' : 'THE TANK IS DRY. THE HATCH SWINGS OPEN.'; }
  ex.style.display = exitPending ? '' : 'none';
  exNote.textContent = exitPending ? exNote.textContent : '';
  $('result-card').classList.add('show');
}
function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'abort') Sfx.abort();
    else if (e.type === 'landed') {
      const r = e.result;
      scene.spawnTouchdown(state.ship.x, state.ship.y - 11, r.kind === 'perfect' ? 0.4 : r.kind === 'good' ? 0.8 : 1.3);
      let row = 0;
      if (r.points > 0) floatLabel(state.ship.x, state.ship.y + 34, '+' + r.points, 'pts', row++);
      if (r.techEarned) { floatLabel(state.ship.x, state.ship.y + 34, TECH_NAMES[r.techEarned], 'tech', row++); Sfx.earn(); }
      if (r.fuelPad) { floatLabel(state.ship.x, state.ship.y + 34, 'FUEL +' + r.fuelPad, 'fuel', row++); Sfx.refuel(); }
      if (r.kind === 'secret') Sfx.secret(); else Sfx.land(r.kind);
      if (Core.hasTech(state, 'shock')) squashT = 0;
      autoOn = false;
      resultTimer = r.techEarned || r.fuelPad ? 2.6 : 1.9;
      mode = 'settle';
    } else if (e.type === 'crashed') {
      scene.spawnCrash(state.ship);
      Sfx.crash();
      if (e.result.techLost) Sfx.lose();
      autoOn = false;
      slowMo = 0.18;              // the beat: the pieces hang, then time comes back
      resultTimer = 2.3;
      mode = 'settle';
    } else if (e.type === 'over') {
      setTimeout(() => Sfx.over(), 900);
    } else if (e.type === 'gate') {
      // through the horizon ring: the world lets you go
      Sfx.secret();
      scene.flash = 1.0;
      mode = 'exiting';
      setTimeout(() => takeExit('horizon'), 700);
    }
  }
}

// ---- world labels (DOM, contemporary type — no stroke lettering in the scene) ------------------
const labelLayer = $('labels');
let padLabels = [];
let labelsKey = '';
const floats = [];
function buildPadLabels() {
  labelLayer.querySelectorAll('.pad-label, .pad-fuel').forEach((el) => el.remove());
  padLabels = [];
  if (!state || !scene) return;
  labelsKey = scene.builtKey;
  const [k0, k1] = scene.chunkSpan;
  for (let k = k0; k <= k1; k++) {
    for (const p of Core.getChunk(state, k).pads) {
      const el = document.createElement('div');
      el.className = 'pad-label' + (p.fuel ? ' fuel' : '') + (p.used ? ' used' : '');
      el.innerHTML = '<span class="mult">' + p.mult + '<span class="x">×</span></span>' +
        (p.used ? '<span class="tag">USED</span>' : '');
      labelLayer.appendChild(el);
      padLabels.push({ el, x: (p.x0 + p.x1) / 2, y: p.y + 6 });
      if (p.fuel) {
        // the fuel mark: a big drop UNDER the pad (James: the little droplet was too small to see)
        const f = document.createElement('div');
        f.className = 'pad-fuel' + (p.used ? ' used' : '');
        f.innerHTML = '<svg viewBox="0 0 12 16" aria-label="fuel pad"><path d="M6 1.5C4 5 2 7.5 2 10.2a4 4 0 0 0 8 0C10 7.5 8 5 6 1.5z"/></svg>';
        labelLayer.appendChild(f);
        // the drop alone, right under the middle of the pad (James's pick)
        padLabels.push({ el: f, x: (p.x0 + p.x1) / 2, y: p.y - 3, below: true });
      }
    }
  }
}
function floatLabel(x, y, text, cls, row) {
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = text;
  labelLayer.appendChild(el);
  floats.push({ el, x, y, rise: 0, age: 0, life: 2.8, row: row || 0 });
}
function clearFloats() { for (const f of floats) f.el.remove(); floats.length = 0; }
const _pt = {};
function placeLabels(dt) {
  if (!scene || !state) return;
  for (const L of padLabels) {
    scene.projectToScreen(L.x, L.y, _pt);
    L.el.style.transform = 'translate(' + _pt.x.toFixed(1) + 'px,' + _pt.y.toFixed(1) + 'px) translate(' + (L.left ? '0%' : '-50%') + ', ' + (L.below ? '0%' : '-100%') + ')';
    L.el.style.opacity = _pt.on ? 1 : 0;
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.age += dt;
    if (f.age >= f.life) { f.el.remove(); floats.splice(i, 1); continue; }
    scene.projectToScreen(f.x, f.y, _pt);
    const rise = f.age * 26 + f.row * 24;
    const fade = f.age < 1.8 ? 1 : 1 - (f.age - 1.8) / (f.life - 1.8);
    f.el.style.transform = 'translate(' + _pt.x.toFixed(1) + 'px,' + (_pt.y - rise).toFixed(1) + 'px) translate(-50%, -100%)';
    f.el.style.opacity = fade.toFixed(3);
  }
}

// The ship HUD: altitude + thrust at the top-left of the aid ring, the two
// speeds with their arrows at the top-right — only while zoomed in (James:
// "so you don't have to keep putting your eyes up to the top of the screen").
const shudL = $('shud-l'), shudR = $('shud-r');
const _sp = {};
function placeShipHud() {
  const show = state && scene && (mode === 'play' || (mode === 'paused' && pausedFrom === 'play')) && state.phase === 'flying' && scene.zoom > 1.6;
  shudL.classList.toggle('show', !!show);
  shudR.classList.toggle('show', !!show);
  if (!show) return;
  const s = state.ship;
  const zt = scene.view ? scene.view.t : 0;
  const ds = 1.0 + 0.76 * (1 - zt);
  const R = 60 * ds;                                  // the aid ring's radius in feet
  // just inside the ring: the clusters sit either side of the ship in the
  // ring's upper half — inner edges 24 ft off the ship's centre, tops at 0.7 R
  const gap = 24 * ds, top = R * 0.7;
  scene.projectToScreen(s.x - gap, s.y + top, _sp);
  shudL.style.transform = 'translate(' + _sp.x.toFixed(1) + 'px,' + _sp.y.toFixed(1) + 'px) translate(-100%, 0)';
  scene.projectToScreen(s.x + gap, s.y + top, _sp);
  shudR.style.transform = 'translate(' + _sp.x.toFixed(1) + 'px,' + _sp.y.toFixed(1) + 'px) translate(0, 0)';
  const r = Core.readouts(state);
  const GOOD = Core.gradesFor(state)[1];
  const near = r.altitude < 220;
  $('sh-alt').textContent = r.altitude;
  $('sh-thr').textContent = Math.round(s.thrust * 100);
  $('sh-va').textContent = r.vSpeed > 0 ? '↑' : r.vSpeed < 0 ? '↓' : '';
  $('sh-v').textContent = Math.abs(r.vSpeed);
  $('sh-ha').textContent = r.hSpeed > 0 ? '→' : r.hSpeed < 0 ? '←' : '';
  $('sh-h').textContent = Math.abs(r.hSpeed);
  const vr = $('sh-vrow'), hr = $('sh-hrow');
  vr.classList.toggle('ok', near && -s.vy <= GOOD.vy); vr.classList.toggle('hot', near && -s.vy > GOOD.vy);
  hr.classList.toggle('ok', near && Math.abs(s.vx) <= GOOD.vx); hr.classList.toggle('hot', near && Math.abs(s.vx) > GOOD.vx);
}

// ---- frame ------------------------------------------------------------------------------------
function currentInput() {
  let l = shiftHeld ? 1 : lever;
  // the auto-throttle holds a gentle descent; a hand on the burn key still adds
  if (autoOn && state && state.phase === 'flying') l = Math.max(l, Core.autoLever(state));
  return { rotate: rotHeld, lever: l, abort: abortReq };
}
// Auto-throttle: one tap of the burn key under AUTO_ALT engages it (when the
// piece is held); any flight key after that hands the ship straight back.
function autoEngage() {
  if (autoOn || !state || state.phase !== 'flying' || mode !== 'play') return false;
  if (!Core.hasTech(state, 'auto') || Core.altitude(state) > Core.AUTO_ALT) return false;
  autoOn = true;
  Sfx.autoOn();
  return true;
}
function autoRelease() {
  if (!autoOn) return;
  autoOn = false;
  Sfx.autoOff();
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
  const since = clock - zoomChangedAt;
  // The zoom reads height above the nearest PAD, not the ground under the
  // ship: a mountain top passing under you is not an approach (James: the
  // mountain zoom "is disorienting and it makes it hard to see where the rest
  // of everything is"). No pad within ZOOM_REACH sideways = no zoom.
  const alt = zoomHeight();
  // climbing hard (a launch): stay close while the speed reads, then go wide
  // the moment the trigger altitude is passed — no ratio, no dwell, and no
  // zooming back in on the way up. After a launch the rule is height above
  // the PAD you left.
  const climbing = state.ship.vy > ZOOM_CLIMB;
  const overPad = launchPadY === null ? 0 : state.ship.y - launchPadY;
  if (!zoomIn && alt < look.zoomAlt && since > ZOOM_DWELL * 0.5 && !climbing) { zoomIn = true; zoomChangedAt = clock; }
  else if (zoomIn && ((alt > look.zoomAlt * ZOOM_OUT_RATIO && since > ZOOM_DWELL) || (climbing && (alt > look.zoomAlt || overPad > LAUNCH_WIDE)))) { zoomIn = false; zoomChangedAt = clock; }
  if (!climbing && state.ship.vy < 0) launchPadY = null;
}
// Height above the nearest pad within ZOOM_REACH sideways (edge to edge);
// Infinity when no pad is that near.
function zoomHeight() {
  const sx = state.ship.x, sy = state.ship.y;
  let best = Infinity;
  for (const p of Core.padsNear(state, sx, ZOOM_REACH)) {
    const dx = sx < p.x0 ? p.x0 - sx : sx > p.x1 ? sx - p.x1 : 0;
    if (dx > ZOOM_REACH) continue;
    const h = sy - p.y;
    if (h < best) best = h;
  }
  return best;
}
function frameStep(dt) {
  if (!scene) return;
  let launchView = null;
  if (mode === 'launch') {
    Sfx.thrust(0);
    launchView = stepLaunch(dt);
  } else if (mode === 'play') {
    launchView = stepLaunchAfter(dt);
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
  } else if (mode === 'exiting') {
    Sfx.thrust(0);
  } else {
    Sfx.thrust(0);
  }
  slowMo += (1 - slowMo) * (1 - Math.exp(-dt / 0.7));
  if (mode !== 'settle') slowMo = 1;
  if (squashT >= 0) { squashT += dt; if (squashT > 1.2) squashT = -1; }
  renderInstruments();
  let squash = 0;
  if (squashT >= 0) squash = Math.max(0, Math.sin(Math.min(1, squashT / 0.55) * Math.PI)) * Math.exp(-squashT * 1.2);
  let fan = 0;
  if (state && Core.hasTech(state, 'spider')) {
    const a = Core.altitude(state);
    fan = state.phase === 'flying' ? Math.max(0, Math.min(1, (Core.SPIDER_ALT - a) / 25)) : 1;
  }
  const view = state ? {
    ship: state.ship,
    thrust: state.ship.thrust,
    rotate: mode === 'play' ? rotHeld : 0,
    flying: state.phase === 'flying' && mode === 'play',
    zoomOn: zoomIn && (mode === 'play' || mode === 'settle' || mode === 'result' || mode === 'launch'),
    gravity: Core.GRAVITY * Core.FLIGHT.gravity * play.gravity,
    showShip: state.ship.alive,
    secret: state.result && state.result.kind === 'secret',
    tech: state.tech,
    fan, squash,
    autoOn: autoOn && mode === 'play',
    launch: launchView,
    relayLit: state.result && state.result.kind !== 'crash' && state.result.pad && state.result.pad.relay ? state.result.pad.id : null,
    hatch: state.phase === 'over' && state.result ? { x: state.result.x, y: Core.groundAt(state, state.result.x) } : null,
  } : null;
  scene.render(view, dt * slowMo);
  if (scene.builtKey !== labelsKey) buildPadLabels();
  placeLabels(dt * slowMo);
  placeShipHud();
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
let lastGrades = null;
function arcPath(r, a0, a1) {
  // degrees, 0 = straight up, clockwise positive; SVG y is down
  const p = (a) => [Math.sin(a * Math.PI / 180) * r, -Math.cos(a * Math.PI / 180) * r];
  const s = p(a0), e = p(a1);
  return `M${s[0].toFixed(2)} ${s[1].toFixed(2)} A${r} ${r} 0 0 1 ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
}
function setAttitudeArcs() { /* the attitude ball is gone (James) — nothing to lay out */ }
function renderTechRow() {
  const held = state ? state.tech : [];
  const key = held.join(',') + '|' + (autoOn ? 1 : 0);
  if (key === techDrawn) return;
  techDrawn = key;
  document.querySelectorAll('#tech .piece').forEach((el) => {
    const id = el.dataset.tech;
    el.classList.toggle('held', held.indexOf(id) >= 0);
    el.classList.toggle('live', id === 'auto' && autoOn);
    el.title = TECH_NAMES[id] + (held.indexOf(id) >= 0 ? ' — ' + TECH_BLURB[id] : ' — not yet earned');
  });
  document.querySelectorAll('#tech .piece').forEach((el) => { el.removeAttribute('title'); });
  const next = state ? Core.techNext(state) : Core.TECH[0];
  $('tech-note').textContent = !next ? 'ALL FIVE HELD' :
    next.id === 'auto' ? 'NEXT: A PERFECT ON A 5X' : 'NEXT: LAND CLEAN ON A 4X OR 5X';
}
// hover card for a tech piece
const techCard = $('tech-card');
document.querySelectorAll('#tech .piece').forEach((el) => {
  el.addEventListener('pointerenter', () => {
    const id = el.dataset.tech;
    const held = state && Core.hasTech(state, id);
    const lost = state && state.log.some((r) => r.techLost === id) && !held;
    $('tc-name').textContent = TECH_NAMES[id];
    $('tc-status').textContent = held ? 'HELD' : lost ? 'LOST — EARN IT AGAIN' : 'NOT YET EARNED';
    $('tc-status').className = held ? 'held' : '';
    $('tc-how').textContent = TECH_HOW[id];
    const r = el.getBoundingClientRect(), c = $('console').getBoundingClientRect();
    techCard.style.left = (r.left + r.width / 2 - c.left) + 'px';
    techCard.style.top = (r.bottom - c.top + 10) + 'px';
    techCard.classList.add('show');
  });
  el.addEventListener('pointerleave', () => techCard.classList.remove('show'));
});
function renderInstruments() {
  if (!state) return;
  const r = Core.readouts(state);
  const s = state.ship;
  const flying = state.phase === 'flying' && mode === 'play';
  const near = r.altitude < 220 && flying;
  const grades = Core.gradesFor(state);
  const GOOD = grades[1];
  if (grades !== lastGrades) { lastGrades = grades; setAttitudeArcs(grades[1], grades[2]); }
  renderTechRow();
  $('v-score').textContent = pad(r.score, 4);
  $('v-time').textContent = fmtTime(r.time);
  $('v-flight').textContent = 'FLIGHT ' + state.attempt;
  const rg = r.range;
  $('v-range').textContent = Math.abs(rg) < 500 ? 'HOME' : (rg > 0 ? '→ ' : '← ') + (Math.abs(rg) >= 10000 ? (Math.abs(rg) / 1000).toFixed(1) + 'K' : Math.abs(rg)) + ' FT';
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
  // attitude: the little lander points exactly where the real one points; it
  // and the plumb line go green inside the perfect tilt tolerance
  const deg = s.angle * 180 / Math.PI;
  $('att-ship').setAttribute('transform', 'rotate(' + deg.toFixed(2) + ')');
  // the green tints in from 5° (a hint) through 3°/2° (bright) to 0° (full)
  const tiltDeg = Core.tiltOf(s.angle) * 180 / Math.PI;
  const lv = Math.pow(Math.max(0, Math.min(1, (5 - tiltDeg) / 5)), 0.6);
  $('att-svg').style.setProperty('--lv', lv.toFixed(3));
  $('attitude').style.setProperty('--lv', lv.toFixed(3));
  $('tilt-val').textContent = Math.abs(Math.round(tiltDeg)) + '°';
}

// ---- input ---------------------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { rotHeld = -1; autoRelease(); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { rotHeld = 1; autoRelease(); e.preventDefault(); }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || (k === ' ' && mode === 'play')) {
    e.preventDefault();
    if (!e.repeat) { if (autoOn) autoRelease(); else autoEngage(); }
    burnHeld = true;
  }
  else if (k === 'x' || k === 'X') { if (mode === 'play') abortReq = true; }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { trim = 0; autoRelease(); e.preventDefault(); }
  else if (k === 'Shift') { shiftHeld = true; autoRelease(); }
  else if (k === ' ') {
    e.preventDefault();
    if (mode === 'paused') togglePause();
    else if (mode === 'result') nextAttempt();
    else if (mode === 'attract') startGame();
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
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { burnHeld = false; }
  else if (k === 'Shift') { shiftHeld = false; }
});
window.addEventListener('blur', () => { rotHeld = 0; burnHeld = false; shiftHeld = false; if (mode === 'play' || mode === 'launch') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (mode === 'play' || mode === 'launch')) togglePause(); });
// the wheel sets the hover trim anywhere over the field
window.addEventListener('wheel', (e) => {
  if (e.target.closest && e.target.closest('#tuner')) return;
  if (mode !== 'play') return;
  // the wheel works in THRUST, not lever position: each notch adds wheelStep
  // percent of full thrust (the lever curve is undone), so the bottom notches
  // do as much as the top ones
  const th = Math.pow(trim, state ? state.opts.leverCurve : Core.LEVER_CURVE);
  const th2 = clamp01(th - Math.sign(e.deltaY) * play.wheelStep / 100);
  trim = th2 <= 0 ? 0 : Math.pow(th2, 1 / (state ? state.opts.leverCurve : Core.LEVER_CURVE));
  autoRelease();
}, { passive: true });
// hold the pointer on the field to burn (touch / mouse)
canvas.addEventListener('pointerdown', (e) => { if (mode === 'play') { if (autoOn) autoRelease(); else autoEngage(); burnHeld = true; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} } });
canvas.addEventListener('pointerup', () => { burnHeld = false; });
canvas.addEventListener('pointercancel', () => { burnHeld = false; });

function togglePause() {
  if (mode === 'paused') {
    mode = pausedFrom;
    document.body.classList.remove('paused');
    lastT = 0;
  } else if (mode === 'play' || mode === 'settle' || mode === 'launch') {
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
    clearFloats();
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
$('btn-exit').addEventListener('click', () => { if (exitPending) takeExit(exitPending); });

// ---- tuner --------------------------------------------------------------------------------------
const tuner = $('tuner');
// opening the tuner pauses a live flight (James's ask); closing it resumes only
// if the tuner was what paused it
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
  const box = $(id);
  box.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      play[key] = parse ? parse(b.dataset.v) : b.dataset.v;
      save(PLAY_KEY, play);
      syncPlayUI();
    });
  });
}
seg('t-fuel', 'fuel', (v) => parseInt(v, 10));
seg('t-zoom', 'zoom', (v) => parseInt(v, 10));
$('t-grav').addEventListener('input', (e) => { play.gravity = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); if (state) state.opts.gravityScale = play.gravity; });
$('t-attack').addEventListener('input', (e) => { play.attack = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-wheel').addEventListener('input', (e) => { play.wheelStep = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-langle').addEventListener('input', (e) => { play.launchAngle = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-lapex').addEventListener('input', (e) => { play.launchApex = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  const on = (id, v) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on('t-fuel', play.fuel);
  on('t-zoom', play.zoom);
  $('t-grav').value = play.gravity; $('t-grav-val').textContent = play.gravity.toFixed(2) + '×';
  $('t-attack').value = play.attack; $('t-attack-val').textContent = play.attack.toFixed(2) + 's';
  $('t-wheel').value = play.wheelStep; $('t-wheel-val').textContent = play.wheelStep + '% per notch';
  $('t-langle').value = play.launchAngle; $('t-langle-val').textContent = play.launchAngle + '°';
  $('t-lapex').value = play.launchApex; $('t-lapex-val').textContent = Math.round(play.launchApex * 100) + '% of the way up';
  $('t-seed').value = play.seed || '';
  if (mode === 'attract') $('ro-select').textContent = 'LEVEL 1';
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
