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
const PLAY_DEFAULTS = { speed: 1, grid: 'medium', ai: 2, target: 10, hudTerr: 1 };
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
let hintFadeDone = false;
let lastHumPitch = 1;
let prevPos = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
let claim = new Float32Array(state.w * state.h * 2);
let occ = new Uint8Array(state.w * state.h);
let balance = 0;

function ticksPerSec() {
  const ramp = 1 + Math.min(0.9, (roundT / 1000) * 0.035);
  return 8 * cfg.speed * ramp;
}
function setMode(m) { mode = m; modeT = 0; }

function reallocFields() {
  claim = new Float32Array(state.w * state.h * 2);
  occ = new Uint8Array(state.w * state.h);
}

function startRound() {
  Core.resetRound(state);
  if (arena) {
    arena.reset();
    state.players.forEach((p, i) => arena.spawn(i, p.x, p.y, p.dir, 0));
  }
  state.players.forEach((p, i) => { prevPos[i] = { x: p.x, y: p.y }; });
  inputQueue = [];
  roundT = 0;
  tickAcc = 0;
  roundWinner = -2;
  refreshClaim();
  setMode('countdown');
  countdownStage = -1;
  renderHud();
  syncControls();
}

function startMatch() {
  score = [0, 0];
  round = 1;
  matchWinner = -1;
  paused = false;
  resumeT = 0;
  forfeitArmed = 0;
  document.body.classList.remove('paused');
  hideBanner();
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
const btnForfeit = document.getElementById('btn-forfeit');

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

function canPause() {
  return mode === 'countdown' || mode === 'play' || mode === 'roundend';
}

function syncControls() {
  const over = mode === 'matchend';
  btnPause.style.display = over ? 'none' : '';
  btnPause.textContent = paused ? 'RESUME' : 'PAUSE';
  btnForfeit.textContent = over ? 'NEW MATCH' : (forfeitArmed > 0 ? 'SURE?' : 'FORFEIT');
  btnForfeit.classList.toggle('armed', forfeitArmed > 0 && !over);
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
  showBanner(head + '<span class="sub">SPACE OR TAP TO GO AGAIN</span>',
    winner === 0 ? 'you' : 'cpu');
  syncControls();
}

function forfeit() {
  if (mode === 'matchend') { startMatch(); return; }
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
  if (mode === 'matchend') { startMatch(); return; }
  if (forfeitArmed > 0) { forfeitArmed = 0; forfeit(); }
  else forfeitArmed = 3000;
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
  crash() {
    if (!this.ctx || !this.running) return;
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
window.addEventListener('keydown', (e) => {
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
  if (e.key === ' ' || e.key === 'Enter') {
    if (paused) { e.preventDefault(); resumeGame(); return; }
    if (mode === 'matchend' && modeT > 600) startMatch();
  }
});

// Losing the window mid-round should not cost a rider.
window.addEventListener('blur', pauseGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

btnPause.addEventListener('click', togglePause);
btnForfeit.addEventListener('click', armForfeit);

let touchStart = null;
window.addEventListener('touchstart', (e) => {
  if (e.target.closest('#tuner') || e.target.closest('#tuner-toggle')) return;
  if (e.target.closest('#controls')) return;
  if (paused) { resumeGame(); return; }
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (mode === 'matchend' && modeT > 600) startMatch();
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
function gameTick() {
  if (inputQueue.length) Core.setDirection(state, 0, inputQueue.shift());
  if (state.players[1].alive) {
    Core.setDirection(state, 1, Core.aiChoose(state, 1, cfg.ai, Math.random));
  }
  const before = state.players.map((p) => ({ x: p.x, y: p.y, dir: p.dir }));
  const crashed = Core.step(state);

  state.players.forEach((p, i) => {
    prevPos[i] = { x: before[i].x, y: before[i].y };
    if (!p.alive) return;
    if (arena) arena.advance(i, p.x, p.y, state.tick);
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

  if (crashed.length > 0) {
    crashed.forEach((i) => {
      const p = state.players[i];
      const into = p.crashInto || { x: p.x, y: p.y };
      if (arena) arena.crash(i, p.x, p.y, into.x, into.y);
    });
    Sfx.humsOff();
    Sfx.crash();
    roundWinner = crashed.length === 2 ? -1 : 1 - crashed[0];
    if (roundWinner >= 0) {
      score[roundWinner]++;
      setTimeout(() => Sfx.point(roundWinner), 350);
      bumpScore(roundWinner);
    }
    setMode('roundend');
  }
  refreshClaim();
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
    roundT += dt;
    const pitch = ticksPerSec() / (8 * cfg.speed);
    if (Math.abs(pitch - lastHumPitch) > 0.02) {
      lastHumPitch = pitch;
      Sfx.humPitch(pitch);
      speedLabel.textContent = pitch.toFixed(2) + '×';
    }
    Sfx.humPan((state.players[0].x / state.w - 0.5) * 1.4);
    tickAcc += dt;
    const interval = 1000 / ticksPerSec();
    let guard = 0;
    while (tickAcc >= interval && mode === 'play' && guard < 6) {
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
  }
}

// ---- main loop ---------------------------------------------------------------------------------
function frame(now) {
  const dt = Math.min(50, now - lastFrame);
  lastFrame = now;
  if (forfeitArmed > 0) {
    forfeitArmed -= dt;
    if (forfeitArmed <= 0) { forfeitArmed = 0; syncControls(); }
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
    arena.setParams(look);
    arena.render(dt, visTick, balance);
  }
  requestAnimationFrame(frame);
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
function syncSeg(id, value) {
  document.querySelectorAll('#' + id + ' button').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === String(value));
  });
}
function syncPlayUI() {
  speedSlider.value = cfg.speed;
  speedVal.textContent = parseFloat(Number(cfg.speed).toFixed(2)) + '×';
  syncSeg('t-grid', cfg.grid);
  syncSeg('t-ai', cfg.ai);
  syncSeg('t-target', cfg.target);
  syncSeg('t-hud', cfg.hudTerr);
}
speedSlider.addEventListener('input', () => {
  cfg.speed = parseFloat(speedSlider.value);
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
        startMatch();
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
renderHud();
syncControls();
startRound();
requestAnimationFrame(frame);

setTimeout(() => document.getElementById('title').classList.add('faded'), 12000);
