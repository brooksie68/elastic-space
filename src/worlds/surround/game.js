// Surround — the shell: match flow, input, HUD, sound, tuner.
//
// Game rules live in game-core.js (pure, sim-tested). The picture lives in
// render3d.js (pure presentation). This file wires the three together and owns
// nothing else.
import { Arena3D, DEFAULT_PARAMS } from './render3d.js';
import { computeClaim } from './territory.js';

const Core = globalThis.SurroundCore;

// ---- config -------------------------------------------------------------------
const PLAY_KEY = 'surround-tuner-v1';
const LOOK_KEY = 'surround-look-v1';
const PLAY_DEFAULTS = { speed: 1, grid: 'medium', ai: 2, target: 10, hudTerr: 1, assist: 120 };
// The specials — each a SPECIALS-tab toggle. Round-structure ones (gaps, zone,
// overtime, gauntlet, blackout) apply from the next round; the two player
// verbs (boost, phase) gate their keys live.
const SPECIAL_DEFAULTS = { gaps: 0, boost: 1, phase: 1, overtime: 1, zone: 0, gauntlet: 1, blackout: 1 };
Object.assign(PLAY_DEFAULTS, SPECIAL_DEFAULTS);
const BOOST_DRAIN = 0.9;    // fuel/s while boosting (full tank ≈ 1.1s)
const BOOST_REGEN = 0.22;   // fuel/s recharge
const GAUNTLET_EVERY = 5;   // every nth round is 2-v-1, worth 2 pips
const BLACKOUT_EVERY = 4;   // every nth round goes dark
// Deeper than they look. These were sized for a flat 2D field at 16:9; seen at
// a tilt the depth axis foreshortens, so a 16:9 grid projects far wider than
// the window and leaves bands of dead space top and bottom. ~1.5:1 grids
// project as ~16:9 and fill the frame.
const GRIDS = {
  small: { w: 34, h: 23 },
  medium: { w: 44, h: 30 },
  large: { w: 58, h: 39 },
};
const AI_NAMES = { 1: 'DRIFTER', 2: 'HUNTER', 3: 'ORACLE' };

// Rider colour pairs — [you, cpu] body colours; hot rails and cold tails are
// derived in the renderer, the HUD tints itself off --p1/--p2 via color-mix.
// All bright enough to survive bloom on the dark floor, hue-separated within
// each pair, rolled fresh every match.
const COLOR_PAIRS = [
  ['#2ed9ff', '#ff4fd8'],   // the classic: cyan / magenta
  ['#ffb32e', '#4f8dff'],   // amber / azure
  ['#3dffa0', '#b44dff'],   // mint / violet
  ['#ff5c3d', '#2ee6c8'],   // vermilion / teal
  ['#ffe93c', '#e04fff'],   // lemon / orchid
  ['#a8ff35', '#3a6bff'],   // lime / blue
  ['#ff8a2e', '#6fe0ff'],   // orange / ice
  ['#ff4f6e', '#ffd23c'],   // rose / gold
  ['#e8f4ff', '#ff3d5e'],   // white / crimson
  ['#b8ff2e', '#ff2ea8'],   // chartreuse / pink
  ['#5c7dff', '#ffce2e'],   // blue / gold
  ['#35f2d5', '#ff7a5c'],   // aqua / coral
  ['#a06bff', '#52ff7a'],   // violet / spring green
  ['#ffa35c', '#6a5cff'],   // apricot / indigo
  ['#ff4436', '#57c8ff'],   // red / sky
  ['#3dff5c', '#ff44c8'],   // green / magenta
  ['#ffc82e', '#8a5cff'],   // gold / violet
  ['#ff7ac8', '#52ffc8'],   // pink / mint
  ['#2ef2ff', '#ff9435'],   // cyan / orange
  ['#c89aff', '#c8ff3d'],   // lavender / lime
  ['#b3ecff', '#ff5c8a'],   // ice / rose
  ['#f2ff5c', '#4f6aff'],   // canary / cobalt
  ['#ff35f2', '#b8ff52'],   // magenta / lime
  ['#35e2c8', '#c84fff'],   // teal / purple
];
const PAIR_KEY = 'surround-pair-v1';

function rollColors() {
  let last = -1;
  try { last = parseInt(localStorage.getItem(PAIR_KEY) || '-1', 10); } catch (e) {}
  let i = Math.floor(Math.random() * COLOR_PAIRS.length);
  if (i === last) i = (i + 1 + Math.floor(Math.random() * (COLOR_PAIRS.length - 1))) % COLOR_PAIRS.length;
  try { localStorage.setItem(PAIR_KEY, String(i)); } catch (e) {}
  const pair = COLOR_PAIRS[i];
  document.documentElement.style.setProperty('--p1', pair[0]);
  document.documentElement.style.setProperty('--p2', pair[1]);
  if (arena) arena.setPalette(pair);
}

// Every look knob the tuner exposes, with its range.
const LOOK_RANGES = {
  tilt: [0, 1, 0.01, 'Camera tilt'],
  zoom: [0.7, 1.5, 0.01, 'Zoom'],
  drift: [0, 1, 0.01, 'Camera drift'],
  bloom: [0, 2.5, 0.05, 'Bloom'],
  glow: [0, 2, 0.05, 'Neon'],
  wallHeight: [0.3, 3, 0.05, 'Wall height'],
  reflect: [0, 1, 0.02, 'Reflections'],
  grid: [0, 2, 0.05, 'Floor grid'],
  territory: [0, 1.5, 0.05, 'Territory wash'],
  field: [0, 2, 0.05, 'Containment field'],
  dust: [0, 2, 0.05, 'Dust'],
  retro: [0, 1, 0.02, 'Film grain'],
  cool: [0.2, 3, 0.05, 'Tail cooling'],
  res: [0.5, 1.5, 0.05, 'Render scale'],
};

function loadCfg(key, defaults) {
  const cfg = Object.assign({}, defaults);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    for (const k in defaults) if (saved[k] !== undefined) cfg[k] = saved[k];
  } catch (e) { /* fresh defaults */ }
  return cfg;
}
let cfg = loadCfg(PLAY_KEY, PLAY_DEFAULTS);
if (!GRIDS[cfg.grid]) cfg.grid = PLAY_DEFAULTS.grid;
let look = loadCfg(LOOK_KEY, DEFAULT_PARAMS);
const save = (key, obj) => {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
};

// ---- renderer ---------------------------------------------------------------------
const canvas = document.getElementById('field');
let state = Core.createGame(GRIDS[cfg.grid]);
let arena = null;
try {
  arena = new Arena3D(canvas, { w: state.w, h: state.h, params: look });
} catch (e) {
  document.body.classList.add('nogl');
  console.error('Surround: WebGL unavailable —', e);
}

// ---- match state ---------------------------------------------------------------------
let score = [0, 0];
let round = 1;
let mode = 'countdown';      // countdown | play | roundend | matchend
let modeT = 0;
let roundT = 0;
let tickAcc = 0;
let lastFrame = performance.now();
let countdownStage = -1;
let inputQueue = [];
let roundWinner = -2;
let matchWinner = -1;
let lastResult = '';
let hintFadeDone = false;
let lastHumPitch = 1;
let prevPos = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
let grace = null;           // pending savable player crash: { t }
let roundIsGauntlet = false;
let roundIsBlackout = false;
let blackoutMix = 0;        // eased 0..1 toward the blackout look
let boostHeld = false;
let boostFuel = 1;
let lastShrink = 0;
let claim = new Float32Array(state.w * state.h * 2);
let occ = new Uint8Array(state.w * state.h);
let balance = 0;

function ticksPerSec() {
  const ramp = 1 + Math.min(0.9, (roundT / 1000) * 0.035);
  return 8 * cfg.speed * ramp;
}
function setMode(m) {
  mode = m;
  modeT = 0;
  document.body.classList.toggle('counting', m === 'countdown');
}

function reallocFields() {
  claim = new Float32Array(state.w * state.h * 2);
  occ = new Uint8Array(state.w * state.h);
}

// Reset the board and park the riders at their spawns — no countdown, no
// motion. Attract mode shows this; startRound races from it. Round modifiers
// (gauntlet, blackout, rules) are decided here, so the state is rebuilt fresh
// each round.
// The breach span in cell coords — must mirror render3d's _placeBreach
// mapping so the hole you see is the hole that lets you out.
function breachSpan(side, t, w, h) {
  const along = side === 0 || side === 2 ? w : h;
  const half = along / 2;
  const c = Math.round((t * 2 - 1) * half * 0.75 + half - 0.5);
  return { side, lo: Math.max(0, c - 2), hi: Math.min(along - 1, c + 2) };
}

function stageRound(idle) {
  roundIsGauntlet = !idle && !!cfg.gauntlet && round % GAUNTLET_EVERY === 0;
  roundIsBlackout = !idle && !!cfg.blackout && round % BLACKOUT_EVERY === 0;
  // The way out tears open somewhere new every round.
  const breachSide = Math.floor(Math.random() * 4);
  const breachT = 0.2 + Math.random() * 0.6;
  const grid = GRIDS[cfg.grid];
  state = Core.createGame(Object.assign({}, grid, {
    players: roundIsGauntlet ? 3 : 2,
    rules: {
      gapEvery: cfg.gaps ? 4 : 0,
      zone: !!cfg.zone,
      overtime: cfg.overtime ? { start: 220, every: 14 } : null,
      breach: breachSpan(breachSide, breachT, grid.w, grid.h),
    },
  }));
  reallocFields();
  if (arena) {
    arena.reset();
    arena.setBreach(breachSide, breachT);
    state.players.forEach((p, i) => arena.spawn(i, p.x, p.y, p.dir, 0));
  }
  prevPos = state.players.map((p) => ({ x: p.x, y: p.y }));
  inputQueue = [];
  grace = null;
  boostFuel = 1;
  lastShrink = 0;
  roundT = 0;
  tickAcc = 0;
  roundWinner = -2;
  roundTag.textContent = [
    roundIsGauntlet ? 'GAUNTLET — 2 v 1, DOUBLE PIP' : '',
    roundIsBlackout ? 'BLACKOUT' : '',
  ].filter(Boolean).join(' · ');
  refreshClaim();
  renderHud();
}

function startRound() {
  stageRound();
  setMode('countdown');
  countdownStage = -1;
  syncControls();
}

// The start gate: nothing ever runs until the button is clicked. Match end and
// forfeit both land back here.
function enterAttract(resultText) {
  paused = false;
  resumeT = 0;
  forfeitArmed = 0;
  restartArmed = 0;
  document.body.classList.remove('paused');
  hideBanner();
  Sfx.humsOff();
  stageRound(true);
  setMode('attract');
  startResult.textContent = resultText || '';
  startResult.style.display = resultText ? '' : 'none';
  document.body.classList.add('attract');
  syncControls();
}

function startMatch() {
  score = [0, 0];
  round = 1;
  matchWinner = -1;
  paused = false;
  resumeT = 0;
  forfeitArmed = 0;
  restartArmed = 0;
  document.body.classList.remove('paused');
  document.body.classList.remove('attract');
  hideBanner();
  rollColors();   // fresh pair every match
  startRound();
}

function refreshClaim() {
  balance = computeClaim(Core, state, claim, occ);
  if (arena) arena.setClaim(claim, occ);
  if (cfg.hudTerr) {
    const you = (balance + 1) / 2;
    terrYou.style.width = (you * 100).toFixed(1) + '%';
    terrCpu.style.width = ((1 - you) * 100).toFixed(1) + '%';
  }
}

// ---- HUD -------------------------------------------------------------------------------
const hud = document.getElementById('hud');
const pipsYou = document.getElementById('pips-you');
const pipsCpu = document.getElementById('pips-cpu');
const scoreYou = document.getElementById('score-you');
const scoreCpu = document.getElementById('score-cpu');
const roundLabel = document.getElementById('round-label');
const speedLabel = document.getElementById('speed-label');
const opponentLabel = document.getElementById('opponent');
const terrYou = document.getElementById('terr-you');
const terrCpu = document.getElementById('terr-cpu');
const countdownEl = document.getElementById('countdown');
const ringEl = document.getElementById('ring');
const bannerEl = document.getElementById('banner');
const hintEl = document.getElementById('hint');
const btnPause = document.getElementById('btn-pause');
const btnRestart = document.getElementById('btn-restart');
const btnForfeit = document.getElementById('btn-forfeit');
const btnStart = document.getElementById('btn-start');
const startResult = document.getElementById('start-result');
const roundTag = document.getElementById('round-tag');
const boostWrap = document.getElementById('boost-wrap');
const boostBar = document.getElementById('boost-bar');
const phasePip = document.getElementById('phase-pip');

function renderHud() {
  scoreYou.textContent = score[0];
  scoreCpu.textContent = score[1];
  roundLabel.textContent = 'ROUND ' + round;
  opponentLabel.textContent = AI_NAMES[cfg.ai] || '';
  hud.classList.toggle('no-terr', !cfg.hudTerr);
  const build = (el, cls, n, mirror) => {
    // Only redraw when the pip count changes — this runs every round.
    if (el.childElementCount !== cfg.target) {
      el.innerHTML = '';
      for (let i = 0; i < cfg.target; i++) el.appendChild(document.createElement('div'));
    }
    for (let i = 0; i < cfg.target; i++) {
      const idx = mirror ? cfg.target - 1 - i : i;
      el.children[i].className = 'pip' + (idx < n ? ' lit ' + cls : '');
    }
  };
  build(pipsYou, 'you', score[0], false);
  build(pipsCpu, 'cpu', score[1], true);
}

function bumpScore(side) {
  renderHud();
  const el = side === 0 ? scoreYou : scoreCpu;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 260);
}

function showBanner(html, cls) {
  bannerEl.innerHTML = html;
  bannerEl.className = 'show ' + cls;
}
function hideBanner() { bannerEl.className = ''; }

// ---- pause / forfeit -----------------------------------------------------------------
let paused = false;
let resumeT = 0;        // ms left on the count back in
let forfeitArmed = 0;   // ms left on the "sure?" confirmation
let restartArmed = 0;   // ms left on restart's own "sure?"

function canPause() {
  return mode === 'countdown' || mode === 'play' || mode === 'roundend';
}

function syncControls() {
  // The in-match buttons only exist mid-match; attract's START is the sole way in.
  const idle = mode === 'attract' || mode === 'matchend';
  btnPause.style.display = idle ? 'none' : '';
  btnPause.textContent = paused ? 'RESUME' : 'PAUSE';
  btnRestart.style.display = idle ? 'none' : '';
  btnRestart.textContent = restartArmed > 0 ? 'SURE?' : 'RESTART';
  btnRestart.classList.toggle('armed', restartArmed > 0 && !idle);
  btnForfeit.style.display = idle ? 'none' : '';
  btnForfeit.textContent = forfeitArmed > 0 ? 'SURE?' : 'FORFEIT';
  btnForfeit.classList.toggle('armed', forfeitArmed > 0 && !idle);
}

function flashGo() {
  countdownEl.textContent = 'GO';
  countdownEl.classList.remove('tick');
  ringEl.classList.remove('tick');
  void countdownEl.offsetWidth;   // restart the animation
  countdownEl.classList.add('tick');
  ringEl.classList.add('tick');
  Sfx.tickTock(true);
}

function pauseGame() {
  if (paused || !canPause()) return;
  paused = true;
  resumeT = 0;
  Sfx.humsOff();
  document.body.classList.add('paused');
  syncControls();
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  document.body.classList.remove('paused');
  // A beat back in, so pausing mid-corner is not an instant death on resume.
  resumeT = mode === 'play' ? 800 : 0;
  if (resumeT > 0) flashGo();
  else if (mode === 'play') Sfx.humsOn();
  syncControls();
}

function togglePause() { if (paused) resumeGame(); else pauseGame(); }

function endMatch(winner, forfeited) {
  matchWinner = winner;
  setMode('matchend');
  Sfx.fanfare(winner === 0);
  const head = forfeited ? 'FORFEIT' : (winner === 0 ? 'YOU WIN' : 'THE MACHINE WINS');
  showBanner(head, winner === 0 ? 'you' : 'cpu');
  lastResult = head + ' ' + score[0] + '–' + score[1];
  syncControls();
}

function forfeit() {
  if (mode === 'matchend' || mode === 'attract') return;
  if (paused) {
    paused = false;
    document.body.classList.remove('paused');
  }
  resumeT = 0;
  // Concede visibly: the player's wall powers down like any other crash.
  const me = state.players[0];
  if (arena && me.alive) {
    arena.crash(0, me.x, me.y, me.x, me.y);
    Sfx.crash();
  }
  me.alive = false;
  Sfx.humsOff();
  setMode('forfeit');
  syncControls();
}

function armForfeit() {
  if (mode === 'matchend' || mode === 'attract') return;
  if (forfeitArmed > 0) { forfeitArmed = 0; forfeit(); }
  else forfeitArmed = 3000;
  syncControls();
}

// Restart wipes the score without conceding — for the "this sucks, start over"
// moment. Same two-step arm as forfeit so one stray R can't eat a match.
function armRestart() {
  if (mode === 'matchend' || mode === 'attract') return;
  if (restartArmed > 0) { restartArmed = 0; startMatch(); }
  else restartArmed = 3000;
  syncControls();
}

// ---- sound -------------------------------------------------------------------------------
// Web Audio synthesis through the shared control (no audio files in this world).
const Sfx = {
  ctx: null, master: null, running: false, volume: 0.8, hums: null, pan: null,
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
  },
  start() {
    this.ensure();
    if (!this.ctx) return;
    this.running = true;
    const p = this.ctx.resume();
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    if (mode === 'play') this.humsOn();
    return p;
  },
  stop() {
    this.running = false;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.humsOff();
  },
  setVolume(v) {
    this.volume = v;
    if (this.ctx && this.running) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  },
  humsOn() {
    if (!this.ctx || !this.running || this.hums) return;
    const ctx = this.ctx;
    // One panner for the pair so the engine note tracks the player across the arena.
    let dest = this.master;
    if (ctx.createStereoPanner) {
      this.pan = ctx.createStereoPanner();
      this.pan.connect(this.master);
      dest = this.pan;
    }
    const mk = (freq, type, level) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 540;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(lp); lp.connect(gain); gain.connect(dest);
      osc.start();
      gain.gain.setTargetAtTime(level, ctx.currentTime, 0.25);
      return { osc, gain, base: freq };
    };
    this.hums = [mk(98, 'sawtooth', 0.035), mk(123.5, 'square', 0.02)];
  },
  humsOff() {
    if (!this.hums) return;
    const ctx = this.ctx;
    this.hums.forEach((h) => {
      h.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      h.osc.stop(ctx.currentTime + 0.5);
    });
    this.hums = null;
    this.pan = null;
  },
  humPitch(mult) {
    if (!this.hums) return;
    const ctx = this.ctx;
    this.hums.forEach((h) => h.osc.frequency.setTargetAtTime(h.base * mult, ctx.currentTime, 0.2));
  },
  humPan(x) {
    if (!this.pan) return;
    this.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, x)), this.ctx.currentTime, 0.12);
  },
  env(type, freq, dur, level, slideTo) {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  },
  blip(who) { this.env('square', who === 0 ? 880 : 660, 0.05, 0.05); },
  graze() { this.env('sine', 1560, 0.035, 0.028); },
  tickTock(go) { this.env('sine', go ? 940 : 620, go ? 0.35 : 0.12, 0.12); },
  // James's produced hit samples (assets/cycle-hits). Media elements, not
  // fetch+decode — the world must keep working from file://.
  hitSamples: null,
  loadHits() {
    const mk = (f) => {
      const a = new Audio('assets/cycle-hits/' + f);
      a.preload = 'auto';
      return a;
    };
    this.hitSamples = { trail: mk('light-trail-hit.mp3'), wall: mk('wall-hit.mp3') };
  },
  // Play the produced sample for this kind of death; returns false when it
  // can't (sound off, file missing) so the caller can fall back to synthesis.
  hit(kind) {
    if (!this.running || !this.hitSamples || !this.hitSamples[kind]) return false;
    const a = this.hitSamples[kind].cloneNode();
    a.volume = Math.min(1, this.volume);
    const p = a.play();
    if (p) p.catch(() => {});
    return true;
  },
  crash(kind) {
    if (!this.ctx || !this.running) return;
    if (kind && this.hit(kind)) {
      // The sample carries the character; keep just the low power-down drop
      // underneath for weight.
      this.env('sine', 220, 0.5, 0.16, 55);
      return;
    }
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.45);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.45);
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(lp); lp.connect(gain); gain.connect(this.master);
    src.start(t);
    this.env('sine', 220, 0.5, 0.25, 55);
  },
  point(who) {
    this.env('sine', who === 0 ? 660 : 440, 0.14, 0.14);
    setTimeout(() => this.env('sine', who === 0 ? 990 : 330, 0.22, 0.14), 110);
  },
  fanfare(won) {
    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63, 196];
    notes.forEach((f, i) => setTimeout(() => this.env('triangle', f, 0.35, 0.16), i * 130));
  },
};

Sfx.loadHits();
if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({
    start: () => Sfx.start(),
    stop: () => Sfx.stop(),
    setVolume: (v) => Sfx.setVolume(v),
  });
}

// ---- input ---------------------------------------------------------------------------------
const KEYMAP = {
  ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
  w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3,
};
function queueDir(dir) {
  if (mode !== 'play' && mode !== 'countdown') return;
  const last = inputQueue.length ? inputQueue[inputQueue.length - 1] : state.players[0].pendingDir;
  if (dir === last || dir === Core.OPPOSITE[last]) return;
  if (inputQueue.length < 2) inputQueue.push(dir);
  if (!hintFadeDone) {
    hintFadeDone = true;
    hintEl.classList.add('faded');
  }
}
function tryPhase() {
  if (!cfg.phase || mode !== 'play' || paused || grace) return;
  if (Core.armPhase(state, 0)) Sfx.env('sine', 320, 0.28, 0.09, 1200);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') { boostHeld = true; return; }
  if (e.key === 'x' || e.key === 'X') {
    e.preventDefault();
    tryPhase();
    return;
  }
  if (e.key in KEYMAP) {
    e.preventDefault();
    queueDir(KEYMAP[e.key]);
    return;
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    e.preventDefault();
    togglePause();
    return;
  }
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    armForfeit();
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    armRestart();
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    if (paused) { e.preventDefault(); resumeGame(); return; }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') boostHeld = false;
});

// Losing the window mid-round should not cost a rider.
window.addEventListener('blur', () => { boostHeld = false; pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

btnPause.addEventListener('click', togglePause);
btnRestart.addEventListener('click', armRestart);
btnForfeit.addEventListener('click', armForfeit);
btnStart.addEventListener('click', () => {
  if (mode !== 'attract') return;
  startMatch();
});

let touchStart = null;
window.addEventListener('touchstart', (e) => {
  if (e.target.closest('#tuner') || e.target.closest('#tuner-toggle')) return;
  if (e.target.closest('#controls')) return;
  if (e.target.closest('#start-card')) return;
  if (paused) { resumeGame(); return; }
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (!touchStart) return;
  const dx = e.touches[0].clientX - touchStart.x;
  const dy = e.touches[0].clientY - touchStart.y;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  queueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
window.addEventListener('touchend', () => { touchStart = null; }, { passive: true });

// ---- tick ------------------------------------------------------------------------------------
// What did this rider actually die on? Drives which hit sample plays.
// Out of bounds or the overtime field = the wall; anything else (a trail,
// another rider) = a light trail. A crashInto equal to the rider's own cell
// means the closing field consumed them where they stood.
function hitKind(p) {
  const c = p.crashInto;
  if (!c) return 'wall';
  if (!Core.inBounds(state, c.x, c.y)) return 'wall';
  if (c.x === p.x && c.y === p.y) return 'wall';
  return state.cells[c.y * state.w + c.x] === Core.FIELD ? 'wall' : 'trail';
}

function boostActive() {
  return !!cfg.boost && boostHeld && boostFuel > 0.03;
}

function gameTick() {
  if (inputQueue.length) Core.setDirection(state, 0, inputQueue.shift());
  for (let i = 1; i < state.players.length; i++) {
    if (!state.players[i].alive) continue;
    // The gauntlet's second hunter is always a DRIFTER — a pack, not a hive mind.
    const level = i === 1 ? cfg.ai : 1;
    Core.setDirection(state, i, Core.aiChoose(state, i, level, Math.random));
  }
  const before = state.players.map((p) => ({ x: p.x, y: p.y, dir: p.dir }));
  const boosting = boostActive();
  const crashed = Core.step(state, boosting ? { boost: [true] } : undefined);

  state.players.forEach((p, i) => {
    prevPos[i] = { x: before[i].x, y: before[i].y };
    if (!p.alive) return;
    if (arena) {
      // A skipped cell (gap, interference, phase) breaks the wall instead of
      // extending it.
      if (p.lastLaid) arena.advance(i, p.x, p.y, state.tick);
      else arena.gap(i);
    }
    if (p.dir !== before[i].dir) {
      if (arena) arena.turn(i);
      if (i === 0) Sfx.blip(0);
    }
  });

  // Near miss: the player's shoulder brushing a wall throws sparks.
  const me = state.players[0];
  if (me.alive && arena) {
    const left = (me.dir + 3) % 4;
    const right = (me.dir + 1) % 4;
    let brushed = false;
    for (const d of [left, right]) {
      const nx = me.x + Core.DIRS[d].x;
      const ny = me.y + Core.DIRS[d].y;
      if (!Core.cellFree(state, nx, ny)) brushed = true;
    }
    if (brushed && state.tick % 2 === 0) {
      arena.graze(0, arena.cx(me.x), arena.cz(me.y));
      Sfx.graze();
    }
  }

  // Overtime: each consumed ring gets its punctuation.
  if (state.shrink !== lastShrink) {
    lastShrink = state.shrink;
    if (arena) arena.pulse(0.45);
    Sfx.tickTock(false);
  }

  if (crashed.length > 0) {
    // CPU crashes present immediately — in the gauntlet the round can go on
    // over a hunter's wreckage.
    const cpuCrashed = crashed.filter((i) => i !== 0);
    cpuCrashed.forEach((i) => {
      const p = state.players[i];
      const into = p.crashInto || { x: p.x, y: p.y };
      if (arena) arena.crash(i, p.x, p.y, into.x, into.y);
    });
    if (cpuCrashed.length) Sfx.crash(hitKind(state.players[cpuCrashed[0]]));

    if (crashed.includes(0)) {
      // Turn assist: a player crash that a perpendicular turn could still
      // dodge gets a short grace window before the sparks fly. The whole game
      // holds its breath (no ticks) while the window runs — see update().
      const me = state.players[0];
      const savable = cfg.assist > 0 &&
        [(me.dir + 1) % 4, (me.dir + 3) % 4].some((d) =>
          Core.cellFree(state, me.x + Core.DIRS[d].x, me.y + Core.DIRS[d].y));
      if (savable) grace = { t: cfg.assist };
      else resolveRound();
    }
  }
  // Riding out through the breach IS the drift — leave the world mid-match.
  if (state.players[0].escaped) {
    escapeThroughBreach();
    return;
  }
  // Round over? Covers crashes AND hunters that fled through the tear.
  if (mode === 'play' && !grace && !state.players.some((p, i) => i > 0 && p.alive)) {
    resolveRound();
  }
  refreshClaim();
}

function escapeThroughBreach() {
  Sfx.humsOff();
  // The breach's own anchor carries the drift state — ride it out.
  const el = document.getElementById('exit-breach');
  if (el) el.click();
}

// The round is over — read the survivors and score it. The gauntlet pays
// double for beating two hunters.
function resolveRound() {
  const me = state.players[0];
  if (!me.alive && arena) {
    const into = me.crashInto || { x: me.x, y: me.y };
    arena.crash(0, me.x, me.y, into.x, into.y);
  }
  Sfx.humsOff();
  // The player's own death sounds here; a round won on a CPU crash already
  // made its noise in gameTick.
  if (!me.alive) Sfx.crash(hitKind(me));
  const cpusAlive = state.players.some((p, i) => i > 0 && p.alive);
  roundWinner = !me.alive && !cpusAlive ? -1 : (me.alive ? 0 : 1);
  if (roundWinner >= 0) {
    score[roundWinner] += roundWinner === 0 && roundIsGauntlet ? 2 : 1;
    setTimeout(() => Sfx.point(roundWinner), 350);
    bumpScore(roundWinner);
  }
  setMode('roundend');
}

// ---- mode driver -----------------------------------------------------------------------------
function update(dt) {
  if (paused) return;
  if (resumeT > 0) {
    resumeT -= dt;
    if (resumeT > 0) return;
    if (mode === 'play') Sfx.humsOn();
  }
  modeT += dt;
  if (mode === 'countdown') {
    const stage = Math.floor(modeT / 620);
    if (stage !== countdownStage && stage <= 3) {
      countdownStage = stage;
      countdownEl.textContent = stage < 3 ? String(3 - stage) : 'GO';
      countdownEl.classList.remove('tick');
      ringEl.classList.remove('tick');
      void countdownEl.offsetWidth;   // restart the animation
      countdownEl.classList.add('tick');
      ringEl.classList.add('tick');
      Sfx.tickTock(stage === 3);
      if (arena && stage === 3) {
        arena.pulse(0.5);
        state.players.forEach((p) => arena.ring(p.x, p.y, 0.7));
      }
    }
    if (modeT >= 3 * 620 + 300) {
      setMode('play');
      Sfx.humsOn();
    }
  } else if (mode === 'play') {
    if (grace) {
      grace.t -= dt;
      while (inputQueue.length) {
        const dir = inputQueue.shift();
        if (Core.reviveAfterCrash(state, 0, dir)) {
          // Saved. The head juke reads on its own; a full beat before the
          // next step keeps the recovery from feeling like a teleport.
          grace = null;
          tickAcc = 0;
          if (arena) arena.turn(0);
          Sfx.blip(0);
          // If the hunters all died on the same tick, the save wins it.
          if (!state.players.some((p, i) => i > 0 && p.alive)) resolveRound();
          break;
        }
      }
      if (grace) {
        if (grace.t <= 0) { grace = null; resolveRound(); }
        return;
      }
      if (mode !== 'play') return;   // the revive ended the round
    }
    roundT += dt;
    // Boost fuel breathes with the throttle.
    boostFuel = boostActive()
      ? Math.max(0, boostFuel - dt / 1000 * BOOST_DRAIN)
      : Math.min(1, boostFuel + dt / 1000 * BOOST_REGEN);
    const ramp = ticksPerSec() / (8 * cfg.speed);
    const pitch = ramp * (boostActive() ? 1.14 : 1);
    if (Math.abs(pitch - lastHumPitch) > 0.02) {
      lastHumPitch = pitch;
      Sfx.humPitch(pitch);
      speedLabel.textContent = ramp.toFixed(2) + '×';
    }
    Sfx.humPan((state.players[0].x / state.w - 0.5) * 1.4);
    tickAcc += dt;
    const interval = 1000 / ticksPerSec();
    let guard = 0;
    while (tickAcc >= interval && mode === 'play' && !grace && guard < 6) {
      tickAcc -= interval;
      gameTick();
      guard++;
    }
  } else if (mode === 'roundend') {
    if (modeT > 1700) {
      if (score[0] >= cfg.target || score[1] >= cfg.target) {
        endMatch(score[0] >= cfg.target ? 0 : 1, false);
      } else {
        round++;
        startRound();
      }
    }
  } else if (mode === 'forfeit') {
    if (modeT > 700) endMatch(1, true);
  } else if (mode === 'matchend') {
    // The result banner gets its beat, then it's back to the start gate —
    // nothing runs again until the button is clicked.
    if (modeT > 2400) enterAttract(lastResult);
  }
}

// ---- main loop ---------------------------------------------------------------------------------
function frame(now) {
  // Clamped at zero: a clock that steps backwards (harness pumps, suspend
  // wake) must never run the timers in reverse.
  const dt = Math.max(0, Math.min(50, now - lastFrame));
  lastFrame = now;
  if (forfeitArmed > 0) {
    forfeitArmed -= dt;
    if (forfeitArmed <= 0) { forfeitArmed = 0; syncControls(); }
  }
  if (restartArmed > 0) {
    restartArmed -= dt;
    if (restartArmed <= 0) { restartArmed = 0; syncControls(); }
  }
  update(dt);

  if (arena) {
    const interval = 1000 / ticksPerSec();
    let fx = 0;
    if (mode === 'play') fx = Math.min(1, tickAcc / interval);
    else if (mode === 'roundend') fx = Math.min(1, modeT / interval);   // ride the crash in
    state.players.forEach((p, i) => {
      const dead = !p.alive;
      // A dead rider noses into the wall it hit rather than stopping short.
      const into = dead && p.crashInto ? p.crashInto : { x: p.x, y: p.y };
      const from = dead ? { x: p.x, y: p.y } : prevPos[i];
      const to = dead ? into : { x: p.x, y: p.y };
      const t = dead ? Math.min(0.45, fx * 0.45) : fx;
      arena.setHead(i, from.x, from.y, to.x, to.y, t, p.dir, p.alive);
    });
    const visTick = state.tick + (mode === 'play' ? fx : Math.min(2, modeT / interval));

    // Blackout rounds ease the lights down instead of snapping.
    const blackoutOn = roundIsBlackout && (mode === 'countdown' || mode === 'play' || mode === 'roundend');
    blackoutMix += ((blackoutOn ? 1 : 0) - blackoutMix) * Math.min(1, dt / 450);
    const bm = blackoutMix;
    Object.assign(effLook, look);
    if (bm > 0.003) {
      effLook.grid = look.grid * (1 - bm) + 0.04 * bm;
      effLook.territory = look.territory * (1 - bm);
      effLook.dust = look.dust * (1 - bm * 0.8);
      effLook.field = look.field * (1 - bm * 0.45);
      effLook.glow = look.glow * (1 - bm * 0.12);
    }
    arena.setParams(effLook);

    // Specials feeds: the drifting interference zone, the closing field, the
    // ghosted phase rider.
    if (state.rules.zone) {
      const z = Core.zoneAt(state);
      arena.setZone(z.x, z.y, z.r, 1);
    }
    arena.setShrink(state.shrink);
    arena.setPhasing(0, !!state.players[0].phasing);

    arena.render(dt, visTick, balance);
    positionExits();
  }
  updateMeters();
  requestAnimationFrame(frame);
}

// ---- specials HUD meters ------------------------------------------------------------
const effLook = {};
function updateMeters() {
  const inMatch = mode === 'countdown' || mode === 'play' || mode === 'roundend';
  boostWrap.style.display = cfg.boost && inMatch ? '' : 'none';
  phasePip.style.display = cfg.phase && inMatch ? '' : 'none';
  if (cfg.boost) boostBar.style.width = (boostFuel * 100).toFixed(0) + '%';
  if (cfg.phase) {
    const me = state.players[0];
    phasePip.classList.toggle('spent', !me || me.phaseCharges <= 0);
    phasePip.classList.toggle('hot', !!me && (me.phaseArmed || me.phasing));
  }
}

// ---- the ways out --------------------------------------------------------------------
// Three exits live in the 3D scene; their DOM anchors chase the projected
// points every frame. The fourth is a stuck pixel in the "CRT" itself.
const exitEls = {
  breach: document.getElementById('exit-breach'),
  hatch: document.getElementById('exit-hatch'),
  farWall: document.getElementById('exit-farwall'),
};
const _proj = {};
function positionExits() {
  for (const key in exitEls) {
    const el = exitEls[key];
    if (!el) continue;
    const a = arena.exitAnchors[key];
    arena.projectToScreen(a.x, a.y, a.z, _proj);
    const on = _proj.front && _proj.x > -60 && _proj.x < innerWidth + 60 &&
      _proj.y > -60 && _proj.y < innerHeight + 60;
    el.style.display = on ? '' : 'none';
    if (on) {
      el.style.left = _proj.x + 'px';
      el.style.top = _proj.y + 'px';
    }
  }
}

// ---- tuner --------------------------------------------------------------------------------------
const tuner = document.getElementById('tuner');
document.getElementById('tuner-toggle').addEventListener('click', () => tuner.classList.toggle('open'));
// Click anywhere off the panel dismisses it (house rule 2026-07-25).
// pointerdown, not click: a slider drag released off-panel is not "away".
document.addEventListener('pointerdown', (e) => {
  if (!tuner.classList.contains('open')) return;
  if (tuner.contains(e.target) || e.target.closest('#tuner-toggle')) return;
  tuner.classList.remove('open');
});
document.querySelectorAll('#tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab-body').forEach((x) => {
      x.classList.toggle('on', x.dataset.body === b.dataset.tab);
    });
  });
});

const speedSlider = document.getElementById('t-speed');
const speedVal = document.getElementById('t-speed-val');
const assistSlider = document.getElementById('t-assist');
const assistVal = document.getElementById('t-assist-val');
function syncSeg(id, value) {
  document.querySelectorAll('#' + id + ' button').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === String(value));
  });
}
function syncPlayUI() {
  speedSlider.value = cfg.speed;
  speedVal.textContent = parseFloat(Number(cfg.speed).toFixed(2)) + '×';
  assistSlider.value = cfg.assist;
  assistVal.textContent = cfg.assist > 0 ? cfg.assist + 'ms' : 'OFF';
  syncSeg('t-grid', cfg.grid);
  syncSeg('t-ai', cfg.ai);
  syncSeg('t-target', cfg.target);
  syncSeg('t-hud', cfg.hudTerr);
  for (const key of Object.keys(SPECIAL_DEFAULTS)) syncSeg('t-' + key, cfg[key]);
}
speedSlider.addEventListener('input', () => {
  cfg.speed = parseFloat(speedSlider.value);
  save(PLAY_KEY, cfg); syncPlayUI();
});
assistSlider.addEventListener('input', () => {
  cfg.assist = parseInt(assistSlider.value, 10);
  save(PLAY_KEY, cfg); syncPlayUI();
});
function segHandler(id, key, parse, restart) {
  document.querySelectorAll('#' + id + ' button').forEach((b) => {
    b.addEventListener('click', () => {
      const v = parse ? parse(b.dataset.v) : b.dataset.v;
      if (cfg[key] === v) return;
      cfg[key] = v;
      save(PLAY_KEY, cfg); syncPlayUI();
      if (restart) {
        state = Core.createGame(GRIDS[cfg.grid]);
        reallocFields();
        if (arena) arena.setArena(state.w, state.h);
        // From the start gate, re-stage under the card — never auto-start.
        if (mode === 'attract') enterAttract();
        else startMatch();
      } else {
        renderHud();
      }
    });
  });
}
const int = (v) => parseInt(v, 10);
segHandler('t-grid', 'grid', null, true);
segHandler('t-ai', 'ai', int, true);
segHandler('t-target', 'target', int, true);
segHandler('t-hud', 'hudTerr', int, false);
// Specials: no restart — round-structure ones take hold at the next stageRound.
for (const key of Object.keys(SPECIAL_DEFAULTS)) segHandler('t-' + key, key, int, false);

// look sliders
const lookRows = document.getElementById('look-rows');
const lookInputs = {};
for (const [key, [min, max, step, label]] of Object.entries(LOOK_RANGES)) {
  const row = document.createElement('div');
  row.className = 't-row';
  row.innerHTML = `<div class="t-label"><span>${label}</span><span></span></div>
    <input type="range" min="${min}" max="${max}" step="${step}">`;
  lookRows.appendChild(row);
  const input = row.querySelector('input');
  const val = row.querySelector('.t-label span:last-child');
  lookInputs[key] = { input, val };
  input.addEventListener('input', () => {
    look[key] = parseFloat(input.value);
    val.textContent = look[key].toFixed(2);
    save(LOOK_KEY, look);
    // Render scale resizes the buffers rather than feeding a uniform.
    if (key === 'res' && arena) { arena.setParams(look); arena.resize(); }
  });
}
function syncLookUI() {
  for (const key of Object.keys(LOOK_RANGES)) {
    const { input, val } = lookInputs[key];
    input.value = look[key];
    val.textContent = Number(look[key]).toFixed(2);
  }
}
document.getElementById('t-reset').addEventListener('click', () => {
  look = Object.assign({}, DEFAULT_PARAMS);
  save(LOOK_KEY, look);
  syncLookUI();
  if (arena) { arena.setParams(look); arena.resize(); }
});

// ---- presets (file-backed via the dev server; saving IS telling Claude) -------------------------
const presetSelect = document.getElementById('preset-select');
const presetNote = document.getElementById('preset-note');
const PRESET_URL = '/api/worlds/surround/presets';
let presets = {};
const served = location.protocol === 'http:' || location.protocol === 'https:';

function fillPresetList() {
  presetSelect.innerHTML = '<option value="">— preset —</option>';
  Object.keys(presets).sort().forEach((name) => {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
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
    if (data.default && presets[data.default]) presetSelect.value = data.default;
  } catch (e) {
    presetNote.textContent = 'presets unavailable';
  }
}
async function savePresets(defaultName) {
  const r = await fetch(PRESET_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presets, default: defaultName || null }),
  });
  if (!r.ok) throw new Error((await r.json()).error || r.statusText);
}
presetSelect.addEventListener('change', () => {
  const p = presets[presetSelect.value];
  if (!p) return;
  look = Object.assign({}, DEFAULT_PARAMS, p);
  save(LOOK_KEY, look);
  syncLookUI();
  if (arena) { arena.setParams(look); arena.resize(); }
});
document.getElementById('preset-save').addEventListener('click', async () => {
  const name = (prompt('Preset name', presetSelect.value || 'look-01') || '').trim();
  if (!name) return;
  presets[name] = Object.assign({}, look);
  try {
    await savePresets(name);
    fillPresetList();
    presetSelect.value = name;
    presetNote.textContent = 'saved "' + name + '"';
  } catch (e) {
    presetNote.textContent = 'save failed: ' + e.message;
  }
});
document.getElementById('preset-del').addEventListener('click', async () => {
  const name = presetSelect.value;
  if (!name || !presets[name]) return;
  delete presets[name];
  try {
    await savePresets(null);
    fillPresetList();
    presetNote.textContent = 'deleted "' + name + '"';
  } catch (e) {
    presetNote.textContent = 'delete failed: ' + e.message;
  }
});

// ---- go ---------------------------------------------------------------------------------------
window.addEventListener('resize', () => { if (arena) arena.resize(); });
syncPlayUI();
syncLookUI();
loadPresets();
rollColors();
renderHud();
enterAttract();
requestAnimationFrame(frame);

setTimeout(() => document.getElementById('title').classList.add('faded'), 12000);
