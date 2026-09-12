// Moon Battle 2100 — the TANK shell: mission flow, input, instruments,
// sound, tuner. Rules live in tank-core.js (pure, sim-tested); the picture in
// tank-render.js. This file wires them and owns nothing else.
import { TankScene, DEFAULT_PARAMS, MODELS, MECH_SCALE } from './tank-render.js?v=4';

const T = globalThis.LunarTankCore;
const ST = globalThis.LunarStructures;
const SILENT = /[?&]silent=1/.test(location.search);   // pane-safe: no AudioContext is ever made

// ---- config -------------------------------------------------------------------
const PLAY_KEY = 'bftm-tank-play-v1';
const LOOK_KEY = 'bftm-tank-look-v1';
const LEDGER_KEY = 'bftm-tank-ledger-v1';
const CAMPAIGN_KEY = 'lunar-lander-campaign-v1';   // shared with the lander: { seed, level, score, tank: true, bonus } while the tank half is under way
const HANDOFF_KEY = 'lunar-lander-handoff-v1';     // what the lander wrote at CLIMB OUT: { seed, score }
const LANDER_PAGE = '../index.html';
const CAMPAIGN = /[?&]campaign=1/.test(location.search);   // opened by CLIMB OUT (or CONTINUE): the campaign's seed and score come along
const PLAY_DEFAULTS = { mission: 1, sens: 1, turn: 1, seed: '' };
const LEVELS_MAX = 3;
const SENS = 0.0021;          // rad per mouse pixel at sens 1 (the mouse aims: 2026-09-07)
const LOOK_RANGES = {
  hue:          { min: 0, max: 1, step: 0.01, label: 'line colour' },
  saturation:   { min: 0, max: 1, step: 0.05, label: 'colour depth' },
  brightness:   { min: 0.4, max: 2, step: 0.05, label: 'world lines' },
  lineWeight:   { min: 1, max: 4, step: 0.1, label: 'line weight' },
  glow:         { min: 0, max: 2.5, step: 0.05, label: 'glow' },
  tankFov:      { min: 40, max: 80, step: 1, label: 'field of view' },
  gunBright:    { min: 0, max: 2, step: 0.05, label: 'the barrel' },
  arcBright:    { min: 0, max: 2, step: 0.05, label: 'the shell arc + landing mark' },
  leadBright:   { min: 0, max: 1.5, step: 0.05, label: 'lead ghosts' },
  weightNear:   { min: 0.6, max: 2.5, step: 0.05, label: 'line weight up close' },
  weightFar:    { min: 0.2, max: 1.2, step: 0.02, label: 'line weight far off' },
  weightRange:  { min: 200, max: 3000, step: 50, label: 'weight falls over (ft)' },
  nearWhite:    { min: 0.6, max: 2, step: 0.05, label: 'near lines whiten' },
  contourBright:{ min: 0, max: 1, step: 0.02, label: 'contour lines' },
  contourStep:  { min: 4, max: 40, step: 1, label: 'contour spacing (ft)' },
  craterBright: { min: 0, max: 1.2, step: 0.02, label: 'craters' },
  rockBright:   { min: 0, max: 1.2, step: 0.02, label: 'rock fields' },
  traceBright:  { min: 0, max: 1.5, step: 0.05, label: 'the flight line' },
  gridBright:   { min: 0, max: 0.8, step: 0.02, label: 'the old grid' },
  gridPitch:    { min: 40, max: 300, step: 20, label: 'grid spacing' },
  fogNear:      { min: 100, max: 2000, step: 50, label: 'fade starts' },
  fogFar:       { min: 800, max: 6000, step: 100, label: 'fade ends' },
  ridgeBright:  { min: 0, max: 1.2, step: 0.02, label: 'near ridges' },
  skyBright:    { min: 0, max: 1.2, step: 0.02, label: 'mid skyline' },
  skyFarBright: { min: 0, max: 1.2, step: 0.02, label: 'far skyline' },
  hazeBright:   { min: 0, max: 1.5, step: 0.02, label: 'horizon glow' },
  earthBright:  { min: 0, max: 2, step: 0.05, label: 'the earth' },
  civBright:    { min: 0.1, max: 1.5, step: 0.02, label: 'civilian buildings' },
  hostBright:   { min: 0.1, max: 1.8, step: 0.02, label: 'hostile buildings' },
  enemyBright:  { min: 0.2, max: 2, step: 0.02, label: 'enemy tanks' },
  gunBright:    { min: 0, max: 1.5, step: 0.02, label: 'your gun' },
  slopePitch:   { min: 0, max: 1, step: 0.05, label: 'view follows the ground' },
  stars:        { min: 0, max: 1.5, step: 0.05, label: 'stars' },
  res:          { min: 0.5, max: 1, step: 0.05, label: 'render scale' },
};
const ENEMY_NAMES = { slow: 'TANK', medium: 'FAST TANK', boss: 'SIEGE TANK', hover: 'HOVER', mech: 'MECH WALKER', warden: 'THE WARDEN', strider: 'THE STRIDER' };
const DEATH_MSG = {
  shell: ['A SHELL THROUGH THE HULL', 'THE CREW NEVER HEARD IT'],
  missile: ['A MISSILE FOUND YOU', 'THE SAM SITE IS STILL OUT THERE'],
  beam: ['CUT DOWN BY A BEAM', 'THE WALKERS ARE WEAK. THEY ARE ALSO PATIENT.'],
  hover: ['STUNG TO DEATH', 'THE HOVERS NEVER STOP. NEITHER SHOULD YOU.'],
  gun: ['A SHELL FROM THE TOWERS', 'THE GUNS ON THE GROUND HAVE THE RANGE'],
  test: ['HULL BREACHED', ''],
};
const PICKUP_WORDS = { armor: 'ARMOR', speed: 'SPEED', shell: 'SHELL SPEED', armormax: 'ARMOR PLATE' };

// ---- helpers -------------------------------------------------------------------
function load(key, defaults) { try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) { return Object.assign({}, defaults); } }
function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }
function pad(n, w) { return String(Math.max(0, Math.round(n))).padStart(w, '0'); }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + pad(s, 2); }
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- state ----------------------------------------------------------------------
let play = load(PLAY_KEY, PLAY_DEFAULTS);
let look = load(LOOK_KEY, DEFAULT_PARAMS);
let state = null;
let scene = null;
let mode = 'attract';         // attract | play | settle | result | paused | map
let pausedFrom = 'play';
let carry = 0, lastT = 0, clock = 0;
const keys = {};
let lookYaw = 0, lookPitch = 0;   // the view, radians: the mouse writes these (pointer lock), the core reads them
let lookFor = null;               // the tank object the look was last synced to
let scope = false;                // Z: the scope
let zoom = 1;                     // the wheel: 1× to ZOOM_MAX, in ZOOM_STEPS clicks (2026-09-09)
const ZOOM_MAX = 2, ZOOM_STEPS = 4;
let fireEdge = false, laserEdge = false;
let restartArmed = 0, resultTimer = 0, hintFadeDone = false;
let hullFlash = 0, veilT = 0, contactsSeen = new Set(), inRangeWas = false;
let shellWasReady = true;

Object.defineProperty(globalThis, 'TANK_DEBUG', {
  get() { return { scene, state, mode, look, play, input: currentInput(), tick: (dt) => frameStep(dt), setLook: (yaw, pitch) => { lookYaw = yaw; lookPitch = pitch; }, setScope: (v) => { scope = !!v; }, setZoom: (v) => { zoom = clamp(+v || 1, 1, ZOOM_MAX); }, fire: () => { fireEdge = true; }, laser: () => { laserEdge = true; } }; },
});

// ---- renderer ------------------------------------------------------------------------
const canvas = $('field');
try { scene = new TankScene(canvas, look); } catch (e) { document.body.classList.add('nogl'); console.error(e); }
function applyTint() {
  const h = look.hue * 360, s = 100 * Math.min(1, look.saturation);
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
  engGain: null, engFilter: null, engSrc: null, turnOsc: null, turnGain: null,
  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
    // the drive: a low rumble of filtered noise that opens with speed
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
    this.engSrc = this.ctx.createBufferSource(); this.engSrc.buffer = buf; this.engSrc.loop = true;
    this.engFilter = this.ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 120; this.engFilter.Q.value = 0.8;
    this.engGain = this.ctx.createGain(); this.engGain.gain.value = 0;
    this.engSrc.connect(this.engFilter).connect(this.engGain).connect(this.master);
    this.engSrc.start();
    // the turn: a thin servo whine
    this.turnOsc = this.ctx.createOscillator(); this.turnOsc.type = 'triangle'; this.turnOsc.frequency.value = 140;
    this.turnGain = this.ctx.createGain(); this.turnGain.gain.value = 0;
    this.turnOsc.connect(this.turnGain).connect(this.master); this.turnOsc.start();
    return true;
  },
  start() { if (!this.ensure()) return; this.on = true; if (this.ctx.state === 'suspended') this.ctx.resume(); this.master.gain.setTargetAtTime(this.vol, this.ctx.currentTime, 0.05); },
  stop() { this.on = false; if (this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); },
  setVolume(v) { this.vol = v; if (this.on && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
  drive(speedFrac, turning) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.setTargetAtTime(0.12 + Math.abs(speedFrac) * 0.5, t, 0.08);
    this.engFilter.frequency.setTargetAtTime(90 + Math.abs(speedFrac) * 260, t, 0.1);
    this.turnGain.gain.setTargetAtTime(turning ? 0.025 : 0, t, 0.05);
    this.turnOsc.frequency.setTargetAtTime(130 + Math.abs(speedFrac) * 60, t, 0.1);
  },
  quiet() { if (!this.ctx) return; const t = this.ctx.currentTime; this.engGain.gain.setTargetAtTime(0, t, 0.1); this.turnGain.gain.setTargetAtTime(0, t, 0.05); },
  env(type, f, dur, vol, f2, delay) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, fc, delay) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + (delay || 0);
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master); s.start(t);
  },
  fire() { this.noise(0.35, 0.7, 900); this.env('sine', 95, 0.35, 0.4, 40); },
  laser() { this.env('sawtooth', 1800, 0.28, 0.12, 300); this.env('sine', 2400, 0.12, 0.08, 1200); },
  hit() { this.noise(0.25, 0.4, 2200); this.env('square', 220, 0.12, 0.06, 110); },
  kill(big) { this.noise(big ? 1.4 : 0.9, big ? 0.9 : 0.7, 700); this.env('sine', 70, big ? 1.2 : 0.8, 0.5, 28); if (big) this.noise(0.6, 0.5, 300, 0.25); },
  absorbed() { this.env('triangle', 300, 0.1, 0.05, 200); this.noise(0.12, 0.15, 1500); },
  hullHit() { this.noise(0.5, 0.9, 500); this.env('sine', 55, 0.6, 0.6, 30); this.noise(0.3, 0.35, 4000, 0.05); },
  dead() { this.noise(1.6, 0.9, 400); this.env('sawtooth', 160, 1.6, 0.25, 30); [660, 520, 400, 260].forEach((f, i) => this.env('triangle', f, 0.4, 0.12, undefined, 0.9 + i * 0.25)); },
  enemyFire(dist) { const v = Math.max(0.05, 0.35 - dist / 4000); this.noise(0.3, v, 500); },
  samLaunch() { this.noise(0.8, 0.35, 1400); this.env('sawtooth', 200, 0.8, 0.08, 900); },
  missileDown() { this.noise(0.5, 0.5, 1800); this.env('sine', 300, 0.3, 0.15, 60); },
  ping() { this.env('sine', 1320, 0.09, 0.07); this.env('sine', 1320, 0.09, 0.05, undefined, 0.16); },
  wave() { [523, 659].forEach((f, i) => this.env('triangle', f, 0.22, 0.1, undefined, i * 0.14)); },
  complete() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.env('triangle', f, 0.3, 0.14, undefined, i * 0.13)); },
  over() { [392, 330, 262, 196].forEach((f, i) => this.env('triangle', f, 0.35, 0.14, undefined, i * 0.16)); },
  bump() { this.noise(0.2, 0.3, 300); },
  beam(dist) { const v = Math.max(0.03, 0.16 - dist / 6000); this.env('sawtooth', 640, 0.14, v, 380); this.env('sine', 1900, 0.08, v * 0.5, 900); },
  nibble() { this.noise(0.08, 0.25, 2600); this.env('square', 180, 0.06, 0.04, 120); },
  pickup(kind) { const notes = kind === 'armor' ? [523, 784] : [659, 880, 1175]; notes.forEach((f, i) => this.env('triangle', f, 0.18, 0.1, undefined, i * 0.09)); },
};
if (!SILENT && window.ElasticSoundControl) {
  ElasticSoundControl.attach({ start: () => Sfx.start(), stop: () => Sfx.stop(), setVolume: (v) => Sfx.setVolume(v) });
}

// ---- the ledger ---------------------------------------------------------------------------
function readLedger() { try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); } catch (e) { return []; } }
function writeLedger(list) { try { localStorage.setItem(LEDGER_KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {} }
function renderLedger(highlight) {
  const el = $('ledger'); const list = readLedger(); el.innerHTML = '';
  list.forEach((e, i) => {
    const cls = highlight && e.stamp === highlight ? ' me' : '';
    el.insertAdjacentHTML('beforeend', `<span class="${cls}">${i + 1}.</span><span class="r${cls}">${pad(e.score, 4)}</span><span class="${cls}">LEVEL ${e.mission} · ${e.kills} KILLS</span>`);
  });
}

// ---- the campaign (2026-09-11): the lander hands over its seed and score at CLIMB OUT; the tank
// half writes its own position under the same key so the lander's start card can CONTINUE here.
function readHandoff() { try { return JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null'); } catch (e) { return null; } }
function readCampaign() { try { const c = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || 'null'); return c && c.tank ? c : null; } catch (e) { return null; } }
function writeCampaign(c) { try { if (c) localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(c)); else localStorage.removeItem(CAMPAIGN_KEY); } catch (e) {} }
function campaignStart() {
  // a saved tank position wins; else the lander's handoff (level 1); else nothing
  const saved = readCampaign();
  if (saved && Number.isFinite(saved.seed)) return { seed: saved.seed >>> 0, mission: clamp(saved.level | 0, 1, LEVELS_MAX), score: saved.score | 0, bonus: saved.bonus || null };
  const h = readHandoff();
  if (h && Number.isFinite(h.seed)) return { seed: h.seed >>> 0, mission: 1, score: h.score | 0, bonus: null };
  return null;
}
// ---- flow -------------------------------------------------------------------------------------
function makeGame() {
  let seed = parseInt(play.seed, 10);
  if (!Number.isFinite(seed)) seed = (Math.random() * 0xffffffff) >>> 0;
  const cs = CAMPAIGN ? campaignStart() : null;
  if (cs) {
    state = T.createGame({ seed: cs.seed, mission: cs.mission, campaign: true, score: cs.score });
    if (cs.bonus) { state.bonus = Object.assign({ speed: 0, shell: 0, armor: 0 }, cs.bonus); state.tank.armor = T.armorMax(state); }
  } else state = T.createGame({ seed, mission: clamp(play.mission | 0, 1, LEVELS_MAX) });
  state.tank.turnScale = play.turn;
  if (scene) { scene.setWorld(state); scene.clearEffects(); }
  clearFloats();
  contactsSeen = new Set(); inRangeWas = false;
  setCracks(0);
}
function resetInput() { fireEdge = false; laserEdge = false; scope = false; zoom = 1; lookFor = null; for (const k of Object.keys(keys)) keys[k] = false; }
// the view follows the core's tank when a new one appears (start, respawn, the next mission)
function syncLook() { if (state && state.tank !== lookFor) { lookFor = state.tank; lookYaw = state.tank.look; lookPitch = state.tank.pitch; } }
// pointer lock: the mouse aims while you play; Esc lets go and pauses
function lockPointer() { if (SILENT) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function unlockPointer() { try { if (document.pointerLockElement === canvas) document.exitPointerLock(); } catch (e) {} }
function enterAttract(resultLine, stamp) {
  mode = 'attract';
  document.body.classList.remove('paused');
  $('result-card').classList.remove('show');
  const sr = $('start-result');
  if (resultLine) { sr.textContent = resultLine; sr.style.display = 'block'; } else { sr.style.display = 'none'; }
  renderLedger(stamp);
  const cs = CAMPAIGN ? campaignStart() : null;
  const lv = cs ? cs.mission : clamp(play.mission | 0, 1, LEVELS_MAX);
  const m = T.MISSIONS[lv];
  $('start-mission').textContent = (cs ? 'THE CAMPAIGN — ' : '') + 'LEVEL ' + lv + ' — ' + m.name + (cs && cs.score ? ' — ' + pad(cs.score, 4) + ' POINTS SO FAR' : '');
  $('btn-start').textContent = cs ? 'CLIMB IN' : 'ROLL OUT';
  $('start-card').classList.add('show');
  if (!state || state.phase === 'over') makeGame();
  resetInput();
  Sfx.quiet();
  renderInstruments();
}
function startGame() {
  if (mode !== 'attract') return;
  makeGame();
  $('start-card').classList.remove('show');
  mode = 'play'; carry = 0; resetInput(); syncLook(); lockPointer();
  if (!hintFadeDone) { hintFadeDone = true; $('hint').classList.add('faded'); }
}
function nextStep() {
  if (mode !== 'result') return;
  if (state.phase === 'over') {
    const stamp = Date.now();
    const list = readLedger();
    list.push({ score: state.score, mission: state.mission, kills: state.kills, stamp });
    list.sort((a, b) => b.score - a.score);
    writeLedger(list);
    const line = 'ALL TANKS LOST — FINAL SCORE ' + pad(state.score, 4) + ' · MISSION ' + state.mission;
    state = null;
    enterAttract(line, stamp);
    return;
  }
  if (state.phase === 'dead') { T.respawn(state); setCracks(0); scene.clearEffects(); }
  else if (state.phase === 'complete') {
    if (!T.MISSIONS[state.mission + 1]) {
      // THE END: the base has fallen — the campaign is out
      const stamp = Date.now();
      const list = readLedger();
      list.push({ score: state.score, mission: state.mission, kills: state.kills, stamp });
      list.sort((a, b) => b.score - a.score);
      writeLedger(list);
      const line = 'THE MOON IS YOURS — ' + pad(state.score, 4) + ' · ' + state.kills + ' KILLS';
      if (state.campaign) { writeCampaign(null); try { localStorage.removeItem(HANDOFF_KEY); } catch (e) {} window.location.href = LANDER_PAGE; return; }
      state = null;
      enterAttract(line, stamp);
      return;
    }
    T.nextMission(state); setCracks(0); scene.clearEffects(); scene.setWorld(state); contactsSeen = new Set(); inRangeWas = false;
    play.mission = state.mission; save(PLAY_KEY, play); syncPlayUI();
    if (state.campaign) writeCampaign({ seed: state.seed, level: state.mission, score: state.score, tank: true, bonus: state.bonus });
  }
  $('result-card').classList.remove('show');
  mode = 'play'; carry = 0; resetInput(); syncLook(); lockPointer();
}
function showResult() {
  mode = 'result';
  unlockPointer();
  const ph = state.phase;
  const w = $('r-word'), msg = $('r-msg'), det = $('r-detail'), pts = $('r-points'), btn = $('btn-next');
  if (ph === 'complete') {
    const last = !T.MISSIONS[state.mission + 1];
    w.textContent = last ? 'THE MOON IS YOURS' : 'LEVEL ' + state.mission + ' CLEAR';
    msg.textContent = last ? 'THE BASE HAS FALLEN. 3 AND 3 AND OUT.' : 'LEVEL ' + state.mission + ' — ' + state.missionDef.name + ' · NEXT: ' + T.MISSIONS[state.mission + 1].name;
    det.textContent = fmtTime(state.missionTime) + ' · ' + state.kills + ' KILLS SO FAR';
    pts.textContent = (last ? 'FINAL SCORE ' : 'SCORE ') + pad(state.score, 4);
    btn.textContent = last ? (state.campaign ? 'BACK TO THE START' : 'AGAIN') : 'NEXT LEVEL';
  } else {
    const by = state.lastDeath || 'shell';
    const m = DEATH_MSG[by] || DEATH_MSG.shell;
    w.textContent = ph === 'over' ? 'ALL TANKS LOST' : 'HULL BREACHED';
    msg.textContent = m[0];
    det.textContent = m[1];
    pts.textContent = 'SCORE ' + pad(state.score, 4) + (ph === 'over' ? ' · LEVEL ' + state.mission : ' · ' + state.lives + (state.lives === 1 ? ' TANK LEFT' : ' TANKS LEFT'));
    btn.textContent = ph === 'over' ? 'GAME OVER' : 'NEXT TANK';
  }
  $('result-card').classList.add('show');
}
function handleEvents(events) {
  const t = state.tank;
  for (const e of events) {
    if (e.type === 'fire') Sfx.fire();
    else if (e.type === 'laser') Sfx.laser();
    else if (e.type === 'kill') {
      if (e.enemy) scene.spawnBreak(MODELS[e.enemy.kind] || MODELS.slow, e.enemy.x, e.enemy.y, e.enemy.z, e.enemy.heading, 1, T.ENEMY[e.enemy.kind] && T.ENEMY[e.enemy.kind].boss ? 1.6 : 1);
      else if (e.structure) scene.spawnBreak(ST.solid(e.structure.id), e.structure.x, e.structure.y, e.structure.z, 0, 1, 1.4);
      Sfx.kill((T.ENEMY[e.kind] && T.ENEMY[e.kind].boss) || (e.structure && e.structure.mult >= 3));
      floatLabel(e.x, e.y + 24, e.z, '+' + e.points, '');
      const name = e.enemy ? ENEMY_NAMES[e.enemy.kind] : e.structure.name;
      floatLabel(e.x, e.y + 24, e.z, name + ' ' + (e.enemy ? T.ENEMY[e.enemy.kind].mult : e.structure.mult) + 'X', 'word', 1);
    } else if (e.type === 'hit') { scene.spawnBurst(e.x, e.y, e.z, 0.8); Sfx.hit(); }
    else if (e.type === 'absorbed') { scene.spawnBurst(e.x, e.y, e.z, 0.4); Sfx.absorbed(); floatLabel(e.x, e.y + 10, e.z, e.door ? 'DOOR SHUT' : 'CIVILIAN', 'word'); }
    else if (e.type === 'shellGround') { scene.spawnDust(e.x, e.z, 0.9); scene.spawnBurst(e.x, e.y + 1, e.z, 0.35); callMiss(e); }
    else if (e.type === 'missileGround') { scene.spawnDust(e.x, e.z, 1.2); Sfx.hit(); }
    else if (e.type === 'missileDown') { scene.spawnBurst(e.x, e.y, e.z, 1.4); Sfx.missileDown(); floatLabel(e.x, e.y + 8, e.z, 'MISSILE DOWN', 'word'); }
    else if (e.type === 'enemyFire') Sfx.enemyFire(Math.hypot(e.x - t.x, e.z - t.z));
    else if (e.type === 'samLaunch') { Sfx.samLaunch(); floatLabel(e.x, e.y + 12, e.z, 'MISSILE', 'word'); }
    else if (e.type === 'gunFire') { scene.spawnBurst(e.x, e.y, e.z, 0.5); Sfx.enemyFire(Math.hypot(e.x - t.x, e.z - t.z)); }
    else if (e.type === 'beamFire') { if (!e.blocked) { hullFlash = Math.max(hullFlash, 0.25); } Sfx.beam(Math.hypot(e.x - t.x, e.z - t.z)); }
    else if (e.type === 'pickup') { Sfx.pickup(e.kind); floatLabel(e.x, e.y + 10, e.z, e.text, ''); }
    else if (e.type === 'encounter') { floatCentre(e.boss ? e.name + ' — ' + bossName(e) : 'CONTACT — ' + e.name); if (e.boss) Sfx.wave(); }
    else if (e.type === 'waypoint') { Sfx.ping(); }
    else if (e.type === 'waypointDone') { Sfx.wave(); if (!e.last) floatCentre('WAYPOINT ' + (e.wp + 1) + ' OF ' + state.route.length + ' — THE ROAD GOES ON'); }
    else if (e.type === 'hangar') { Sfx.wave(); floatCentre('THE HANGAR OPENS — ' + e.wave + ' OF ' + e.of); }
    else if (e.type === 'hullHit') { const big = e.dmg >= 20; hullFlash = big ? 0.7 : 0.3; veilT = big ? 0.09 : 0; setCracks(e.hits); if (big) Sfx.hullHit(); else Sfx.nibble(); }
    else if (e.type === 'dead') { hullFlash = 1; veilT = 0.12; setCracks(3); state.lastDeath = e.by; Sfx.dead(); resultTimer = 2.6; mode = 'settle'; }
    else if (e.type === 'over') setTimeout(() => Sfx.over(), 1500);
    else if (e.type === 'wave') { Sfx.wave(); if (e.wave > 1) floatCentre('WAVE ' + e.wave + ' OF ' + e.of); }
    else if (e.type === 'complete') { Sfx.complete(); resultTimer = 2.2; mode = 'settle'; }
    else if (e.type === 'bump') Sfx.bump();
  }
}
function bossName(e) { const wp = state.route[e.wp]; if (!wp || !wp.encounter) return ''; for (const k of Object.keys(wp.encounter)) if (T.ENEMY[k] && T.ENEMY[k].boss) return ENEMY_NAMES[k]; return ''; }
function setCracks(hits) {
  $('crack-1').classList.toggle('on', hits >= 1); $('crack-1b').classList.toggle('on', hits >= 1);
  $('crack-2').classList.toggle('on', hits >= 2); $('crack-2b').classList.toggle('on', hits >= 2);
}

// ---- world labels (DOM, contemporary type) --------------------------------------------------------
const labelLayer = $('labels');
const floats = [];
let hostTag = null;
function floatLabel(x, y, z, text, cls, row) {
  const el = document.createElement('div');
  el.className = 'float ' + (cls || '');
  el.textContent = text;
  labelLayer.appendChild(el);
  floats.push({ el, x, y, z, age: 0, life: 2.6, row: row || 0 });
}
// THE MISS CALL (2026-09-09): when a shell lands near a hostile, say how it missed so the
// next round can be walked on — SHORT / OVER along the line to it, WIDE across it
function callMiss(e) {
  const t = state.tank;
  let best = null, bestD = 420;
  for (const en of state.enemies) { if (!en.alive) continue; const d = Math.hypot(en.x - e.x, en.z - e.z); if (d < bestD) { bestD = d; best = en; } }
  if (!best) return;
  const dx = best.x - t.x, dz = best.z - t.z, L = Math.hypot(dx, dz) || 1;
  const ux = dx / L, uz = dz / L;
  const ix = e.x - t.x, iz = e.z - t.z;
  const along = ix * ux + iz * uz - L, across = ix * uz - iz * ux;
  const text = Math.abs(across) > Math.abs(along) ? Math.round(Math.abs(across)) + ' FT WIDE' : Math.round(Math.abs(along)) + ' FT ' + (along < 0 ? 'SHORT' : 'OVER');
  floatLabel(e.x, e.y + 6, e.z, text, 'word');
}
function floatCentre(text) {
  const t = state.tank;
  const f = T.forward(t.heading);
  floatLabel(t.x + f[0] * 120, t.y + T.TANK.eye + 6, t.z + f[1] * 120, text, 'word', 0);
}
function clearFloats() { for (const f of floats) f.el.remove(); floats.length = 0; if (hostTag) { hostTag.remove(); hostTag = null; } }
const _pt = {};
function placeLabels(dt) {
  if (!scene || !state) return;
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.age += dt;
    if (f.age >= f.life) { f.el.remove(); floats.splice(i, 1); continue; }
    scene.projectToScreen(f.x, f.y, f.z, _pt);
    const rise = f.age * 22 + f.row * 20;
    const fade = f.age < 1.6 ? 1 : 1 - (f.age - 1.6) / (f.life - 1.6);
    f.el.style.transform = 'translate(' + _pt.x.toFixed(1) + 'px,' + (_pt.y - rise).toFixed(1) + 'px) translate(-50%, -100%)';
    f.el.style.opacity = _pt.on ? fade.toFixed(3) : 0;
  }
  // the tag over the hostile the GUN is on (or nearly): name + X (civilians get nothing)
  const t = state.tank;
  const r = lastReadouts;
  let best = null;
  if (r) for (const c of r.contacts) if (c.kind !== 'missile' && Math.abs(c.gunBearing) < 0.06 && c.range < 1400 && (!best || c.range < best.range)) best = c;
  if (best) {
    if (!hostTag) { hostTag = document.createElement('div'); hostTag.className = 'tag'; labelLayer.appendChild(hostTag); }
    // NAME + X, then one word under it: the hardening (OVERHANG / RIDGE / DOOR / SHIELD), in pink when the door is shut (a refusal)
    const word = best.doorShut ? '<span class="word refuse">DOOR SHUT</span>' : best.hard ? '<span class="word">' + best.hard.toUpperCase() + '</span>' : '';
    hostTag.innerHTML = best.name + '<span class="x">' + best.mult + 'X</span>' + word;
    hoverId = best.sid || best.id || null;
    const f = T.forward(t.turret + best.gunBearing);
    scene.projectToScreen(t.x + f[0] * best.range, t.y + T.TANK.eye + best.dy + 16, t.z + f[1] * best.range, _pt);
    hostTag.style.transform = 'translate(' + _pt.x.toFixed(1) + 'px,' + _pt.y.toFixed(1) + 'px) translate(-50%, -100%)';
    hostTag.style.opacity = _pt.on ? 1 : 0;
  } else { if (hostTag) hostTag.style.opacity = 0; hoverId = null; }
}
let hoverId = null;

// ---- frame ---------------------------------------------------------------------------------------
function currentInput() {
  const drive = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
  const turn = ((keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0)) * (play.turn || 1);
  // Q / E still tilt the view for a mouseless hand; the mouse owns it otherwise
  if (keys['q']) lookPitch = clamp(lookPitch + 0.012, T.TANK.pitchMin, T.TANK.pitchMax); else if (keys['e']) lookPitch = clamp(lookPitch - 0.012, T.TANK.pitchMin, T.TANK.pitchMax);
  return { drive, turn, look: lookYaw, tilt: lookPitch, fire: fireEdge, laser: laserEdge };
}
let lastReadouts = null;
function frameStep(dt) {
  if (!scene) return;
  if (mode === 'play') {
    syncLook();
    const inp = currentInput();
    fireEdge = false; laserEdge = false;
    const r = T.advance(state, inp, dt, carry);
    carry = r.carry;
    handleEvents(r.events);
    const t = state.tank;
    Sfx.drive(t.speed / T.TANK.topSpeed, Math.abs(t.turnV) > 0.05);
  } else if (mode === 'settle') {
    Sfx.quiet();
    resultTimer -= dt;
    if (resultTimer <= 0) showResult();
  } else Sfx.quiet();
  hullFlash = Math.max(0, hullFlash - dt * 1.4);
  veilT = Math.max(0, veilT - dt);
  $('veil').style.opacity = veilT > 0 ? '0.85' : '0';
  clock += dt;
  if (state) {
    const t = state.tank;
    lastReadouts = T.readouts(state);
    const view = {
      tank: t,
      enemies: state.enemies, missiles: state.missiles, eshells: state.eshells, shells: state.shells, beam: state.laser.beam,
      structures: T.structuresNear(state, t.x, t.z, 2800),
      beams: state.beams, pickups: state.pickups, route: state.route, start: state.start,
      dead: state.phase === 'dead' || state.phase === 'over',
      flash: hullFlash * 0.22,
      hover: hoverId,
      scope: scope && mode === 'play',
      zoom: mode === 'play' ? zoom : 1,
      solution: mode === 'play' && lastReadouts ? lastReadouts.solution : null,
    };
    scene.render(view, dt);
    placeLabels(dt);
    placeReticle();
    renderInstruments();
  }
}
function frame(t) {
  const dt = lastT ? Math.max(0, Math.min(0.1, (t - lastT) / 1000)) : 0;
  lastT = t;
  if (mode !== 'paused') frameStep(dt);
  requestAnimationFrame(frame);
}

// ---- the gun's reticle: where the barrel points, lagging the crosshair until it arrives ------------
const _gr = {};
function placeReticle() {
  const el = $('gunret');
  if (!state || !scene || mode !== 'play') { el.style.opacity = 0; return; }
  const r = lastReadouts;
  scene.gunReticle(state.tank, _gr);
  el.style.transform = 'translate(' + _gr.x.toFixed(1) + 'px,' + _gr.y.toFixed(1) + 'px) translate(-50%, -50%)';
  el.style.opacity = _gr.on && r && !r.gunOnView ? 0.9 : 0;
  $('cross').classList.toggle('laid', !!(r && r.gunOnView));
  document.body.classList.toggle('scoped', scope);
}

// ---- instruments ----------------------------------------------------------------------------------
const blipLayer = $('radar-blips');
let lastHullKey = '';
function renderInstruments() {
  if (!state || !lastReadouts) return;
  const r = lastReadouts;
  const t = state.tank;
  $('v-score').textContent = pad(r.score, 4);
  $('v-mission').textContent = 'LEVEL ' + r.mission + (r.missionName ? ' · ' + r.missionName : '');
  $('v-time').textContent = fmtTime(r.time);
  $('v-left').textContent = 'WP ' + r.routeDone + '/' + r.routeTotal + ' · ' + r.hostilesLeft + ' HOSTILE' + (r.hostilesLeft === 1 ? '' : 'S');
  // the bonuses (the pickups): only what is held
  const bb = [];
  if (r.bonus.speed) bb.push('SPEED +' + Math.round(T.PICKUP.bonusStep * 100 * r.bonus.speed) + '%');
  if (r.bonus.shell) bb.push('SHELL +' + Math.round(T.PICKUP.bonusStep * 100 * r.bonus.shell) + '%');
  if (r.bonus.armor) bb.push('ARMOR ' + r.armorMax);
  $('v-bonus').textContent = bb.join(' · ');
  // the next waypoint: name + range, amber for a boss or the base
  const wpEl = $('v-wp');
  if (r.waypoint) wpEl.innerHTML = '<span class="' + (r.waypoint.boss || r.waypoint.base ? 'boss' : '') + '">' + r.waypoint.name + '</span><span class="rng">' + (r.waypoint.range >= 10000 ? (r.waypoint.range / 1000).toFixed(1) + 'K' : r.waypoint.range) + ' FT</span>';
  else wpEl.textContent = 'THE ROAD IS DONE';
  renderTape(r);
  $('v-spd').innerHTML = pad(Math.abs(r.speed), 2) + '<span class="unit">' + (r.speed < -0.5 ? 'REV' : 'FT/S') + '</span>';
  // the projected range: what the gun's line meets, and how far
  const gr = $('gun-range');
  if (mode === 'play' && r.gunRange !== null) {
    const what = r.gunHit === 'enemy' ? 'TANK' : r.gunHit === 'structure' ? 'TARGET' : r.gunHit === 'civilian' ? 'CIVILIAN' : r.gunHit === 'missile' ? 'MISSILE' : r.gunHit === 'none' ? 'MAX' : 'GROUND';
    gr.innerHTML = pad(r.gunRange, 4) + '<span class="unit">FT</span><span class="what' + (r.gunHit === 'enemy' || r.gunHit === 'structure' ? ' hot' : '') + '">' + what + '</span>';
    gr.classList.add('on');
  } else gr.classList.remove('on');
  // the gun
  const sh = $('v-shell');
  sh.textContent = r.shellReady ? 'READY' : 'LOADING';
  sh.classList.toggle('ready', r.shellReady); sh.classList.toggle('wait', !r.shellReady);
  const rf = $('reload-fill');
  rf.style.width = (r.reload * 100).toFixed(1) + '%';
  rf.classList.toggle('charging', !r.shellReady);
  const lf = $('laser-fill');
  lf.style.width = (r.laser * 100).toFixed(1) + '%';
  lf.classList.toggle('charging', r.laser < 1);
  // the hull: a pool — the bar is what is left, the number the armor points
  const hk = r.armor + '|' + r.armorMax + '|' + r.lives;
  if (hk !== lastHullKey) {
    lastHullKey = hk;
    const fill = $('hull-fill');
    fill.style.width = (100 * Math.max(0, Math.min(1, r.armor / Math.max(1, r.armorMax)))).toFixed(1) + '%';
    fill.classList.toggle('low', r.armor > 0 && r.armor <= r.armorMax / 3);
    $('v-hull').textContent = r.armor <= 0 ? 'BREACHED' : r.armor + ' / ' + r.armorMax;
    const lv = $('lives').children;
    for (let i = 0; i < lv.length; i++) lv[i].classList.toggle('gone', i >= r.lives);
  }
  // the radar: the sweep turns twice a second; contacts as blips relative to the heading
  const ang = (clock * 180) % 360;
  $('radar-sweep').setAttribute('transform', 'rotate(' + ang.toFixed(1) + ')');
  let html = '';
  for (const c of r.contacts) {
    const rr = 50 * Math.min(1, c.range / T.RADAR_RANGE);
    const x = Math.sin(c.bearing) * rr, y = -Math.cos(c.bearing) * rr;
    const site = !ENEMY_NAMES[c.kind] && c.kind !== 'missile';
    html += site ? `<rect class="blip site" x="${(x - 2.2).toFixed(1)}" y="${(y - 2.2).toFixed(1)}" width="4.4" height="4.4" />`
      : `<circle class="blip ${c.kind === 'missile' ? 'missile' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${c.kind === 'boss' ? 3.2 : 2.1}" />`;
    // a new contact pings once
    const key = c.kind + Math.round(c.range / 400);
    if (!contactsSeen.has(c.kind) && mode === 'play') { contactsSeen.add(c.kind); Sfx.ping(); }
  }
  blipLayer.innerHTML = html;
  const note = $('radar-note');
  const incoming = r.contacts.some((c) => c.kind === 'missile');
  note.textContent = incoming ? 'MISSILE INBOUND' : r.inRange ? 'ENEMY IN RANGE' : r.contacts.length ? r.contacts.length + (r.contacts.length === 1 ? ' CONTACT' : ' CONTACTS') : 'NO CONTACT';
  note.classList.toggle('hot', incoming || r.inRange);
  if (r.inRange && !inRangeWas && mode === 'play') Sfx.ping();
  inRangeWas = r.inRange;
  // the crosshair: amber when the GUN is on a hostile, dashed over a civilian, dim while catching up
  const cr = $('cross');
  cr.classList.toggle('on', r.gunHit === 'enemy' || r.gunHit === 'structure' || r.gunHit === 'missile');
  cr.classList.toggle('civ', r.gunHit === 'civilian');
  $('range-word').classList.toggle('on', r.inRange && mode === 'play');
}

// ---- the compass tape (item 7): a window of ±55° around the view; the lubber line is where you
// look, the HULL marker where W will take you, the caret where the gun is, blips at every contact
const tape = $('tape');
const TAPE_HALF = 55, TAPE_W = 100;   // degrees shown either side; SVG half-width
let tapeKey = '';
function renderTape(r) {
  const deg = (rad) => rad * 180 / Math.PI;
  const px = (relDeg) => relDeg / TAPE_HALF * TAPE_W;
  const key = r.lookDeg + '|' + Math.round(deg(r.hullBearing)) + '|' + Math.round(deg(r.gunBearing) * 2) + '|' + (r.waypoint ? Math.round(deg(r.waypoint.bearing)) : '-') + '|' + r.contacts.map((c) => c.kind[0] + Math.round(deg(c.bearing))).join(',');
  if (key === tapeKey) return;
  tapeKey = key;
  let h = '';
  // ticks every 10°, a number every 30°
  const start = Math.floor((r.lookDeg - TAPE_HALF) / 10) * 10;
  for (let d = start; d <= r.lookDeg + TAPE_HALF; d += 10) {
    const rel = d - r.lookDeg;
    if (Math.abs(rel) > TAPE_HALF) continue;
    const x = px(rel), big = ((d % 30) + 30) % 30 === 0;
    const fade = 1 - Math.pow(Math.abs(rel) / TAPE_HALF, 3);
    h += '<line class="tk' + (big ? ' big' : '') + '" x1="' + x.toFixed(1) + '" y1="' + (big ? -3 : 0) + '" x2="' + x.toFixed(1) + '" y2="' + (big ? 6 : 4) + '" opacity="' + fade.toFixed(2) + '" />';
    if (big) h += '<text class="tn" x="' + x.toFixed(1) + '" y="-6" opacity="' + fade.toFixed(2) + '">' + pad(((d % 360) + 360) % 360, 3) + '</text>';
  }
  // contacts
  for (const c of r.contacts) {
    const rel = deg(c.bearing);
    if (Math.abs(rel) > TAPE_HALF) continue;
    const x = px(rel);
    if (c.kind === 'missile') h += '<circle class="ct missile" cx="' + x.toFixed(1) + '" cy="2" r="2.2" />';
    else if (ENEMY_NAMES[c.kind]) h += '<circle class="ct" cx="' + x.toFixed(1) + '" cy="2" r="1.9" />';
    else h += '<rect class="ct site" x="' + (x - 1.8).toFixed(1) + '" y="0.2" width="3.6" height="3.6" />';
  }
  // the hull: a small tank glyph where the keys will take you; an arrow at the edge when it is off the tape
  const hb = deg(r.hullBearing);
  if (Math.abs(hb) <= TAPE_HALF) h += '<g class="hull" transform="translate(' + px(hb).toFixed(1) + ',10)"><path d="M-5 2h10l-1.5 2.5h-7z M-3 -1h6l1 3h-8z M0 -3.5v2.5" /></g>';
  else h += '<path class="hull off" d="' + (hb > 0 ? 'M' + (TAPE_W - 6) + ' 9 l6 3 l-6 3' : 'M' + (-TAPE_W + 6) + ' 9 l-6 3 l6 3') + '" />';
  // the next waypoint: a diamond above the tape at its bearing, a filled one at the edge when it is off the tape
  if (r.waypoint) {
    const wb = deg(r.waypoint.bearing);
    if (Math.abs(wb) <= TAPE_HALF) h += '<path class="wp" d="M' + px(wb).toFixed(1) + ' -13 l3 3 l-3 3 l-3 -3z" />';
    else h += '<path class="wp off" d="' + (wb > 0 ? 'M' + (TAPE_W - 4) + ' -13 l4 3 l-4 3z' : 'M' + (-TAPE_W + 4) + ' -13 l-4 3 l4 3z') + '" />';
  }
  // the gun: a caret under the tape, sliding toward the lubber line
  const gb = deg(r.gunBearing);
  if (Math.abs(gb) <= TAPE_HALF) h += '<path class="gun" d="M' + px(gb).toFixed(1) + ' 7 l-2.5 4 h5z" />';
  // the lubber line: where you look
  h += '<line class="lub" x1="0" y1="-5" x2="0" y2="7" />';
  tape.innerHTML = h;
  $('v-look').textContent = pad(r.lookDeg, 3);
}

// ---- input ------------------------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys[k] = true; e.preventDefault(); }
  else if (k === ' ') {
    e.preventDefault();
    if (mode === 'play') { if (!e.repeat) fireEdge = true; }
    else if (mode === 'paused') togglePause();
    else if (mode === 'result') nextStep();
    else if (mode === 'attract') startGame();
  } else if (k === 'l') { if (mode === 'play' && !e.repeat) laserEdge = true; }
  else if (k === 'z') { if (mode === 'play' && !e.repeat) scope = !scope; }
  else if (k === 'm') { if (!e.repeat) toggleMap(); }
  else if (k === 'enter') { if (mode === 'attract') startGame(); else if (mode === 'result') nextStep(); }
  else if (k === 'p') togglePause();
  else if (k === 'escape') { if (mode === 'map') toggleMap(); else if (mode === 'play') togglePause(); }   // Esc also drops the pointer lock (the browser's own)
  else if (k === 'r') armRestart();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { const sc = scope; resetInput(); scope = sc; if (mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') togglePause(); });
// THE MOUSE AIMS (2026-09-07, James: turning the hull to aim was "so goofy and hard to use"):
// pointer lock while you play, so the view turns with the mouse any way round, up and down;
// the gun follows the view with mass (the core's TURRET); left fires, right is the laser.
// The first click after the lock is lost only takes the lock back — it never fires.
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || mode !== 'play') return;
  const k = SENS * (play.sens || 1) * (scope ? 0.45 : 1) / zoom;
  lookYaw = T.wrapAngle(lookYaw + e.movementX * k);
  lookPitch = clamp(lookPitch - e.movementY * k, T.TANK.pitchMin, T.TANK.pitchMax);
});
// THE WHEEL ZOOMS (2026-09-09, his ask): up = in, down = out, 1× to 2× in four clicks, eased in the
// renderer like the scope and stacking with it; the mouse slows by the same factor so the aim holds.
window.addEventListener('wheel', (e) => {
  if (mode !== 'play' || (e.target && e.target.closest && e.target.closest('#tuner'))) return;
  e.preventDefault();
  const step = (ZOOM_MAX - 1) / ZOOM_STEPS;
  zoom = clamp(Math.round((zoom - Math.sign(e.deltaY) * step) / step) * step, 1, ZOOM_MAX);
}, { passive: false });
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  if (document.pointerLockElement !== canvas && !SILENT) { lockPointer(); return; }
  if (e.button === 2) laserEdge = true; else if (e.button === 0) fireEdge = true;
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && mode === 'play') togglePause();
});
// THE MAP (James, 2026-09-11: "a map view that can be brought up to see the goals along the way"):
// the level from above in the line register — the road, the waypoints numbered and named, the
// landmarks, the boss and the base, your tank, contacts on the radar, pickups you have seen.
// The game waits under it; M or Esc closes it.
const seenPickups = new Set();
function toggleMap() {
  if (mode === 'map') { mode = pausedFrom; document.body.classList.remove('mapped'); lastT = 0; if (mode === 'play') lockPointer(); return; }
  if (mode !== 'play' && mode !== 'paused' && mode !== 'settle') return;
  pausedFrom = mode === 'paused' ? 'play' : mode;
  document.body.classList.remove('paused');
  mode = 'map';
  document.body.classList.add('mapped');
  Sfx.quiet(); unlockPointer();
  buildMap();
}
function buildMap() {
  if (!state) return;
  const def = state.missionDef, R = state.route, t = state.tank;
  const W = 1600, H = 900, pad = 90;
  const x0 = Math.min(state.start ? state.start[0] : t.x, R.length ? R[0].x : t.x, def.chunks[0] * T.CHUNK_W + 200) - 300;
  const x1 = (def.chunks[1] + 1) * T.CHUNK_W;
  const sx = (x) => pad + (x - x0) / (x1 - x0) * (W - pad * 2);
  const sz = (z) => H / 2 + z / 1400 * (H - pad * 2);
  let h = '';
  // the flight line (the lander's road) and the chunk seams, faint
  h += '<line class="line" x1="' + pad + '" y1="' + sz(0) + '" x2="' + (W - pad) + '" y2="' + sz(0) + '" />';
  for (let k = def.chunks[0]; k <= def.chunks[1] + 1; k++) { const x = sx(k * T.CHUNK_W); if (x > pad && x < W - pad) h += '<line class="line" x1="' + x + '" y1="' + (H - 40) + '" x2="' + x + '" y2="' + (H - 20) + '" />'; }
  // the buildings: hostiles as small amber squares, civilians faint
  for (let k = def.chunks[0]; k <= def.chunks[1]; k++) for (const o of T.chunkStructures(state, k)) {
    if (!o.alive || o.landmark) continue;
    const x = sx(o.x), z = sz(o.z);
    if (o.cls === 'civ') h += '<rect class="civ" x="' + (x - 4) + '" y="' + (z - 4) + '" width="8" height="8" />';
    else if (o.id === 'base') h += '<rect class="base" x="' + (x - 22) + '" y="' + (z - 12) + '" width="44" height="24" /><text class="lbl" x="' + x + '" y="' + (z - 18) + '">THE BASE</text>';
    else h += '<rect class="contact site" x="' + (x - 5) + '" y="' + (z - 5) + '" width="10" height="10" />';
  }
  // the road
  let prev = state.start ? { x: state.start[0], z: state.start[1], done: true } : null;
  for (const w of R) {
    if (prev) h += '<line class="road' + (w.done ? ' done' : '') + '" x1="' + sx(prev.x) + '" y1="' + sz(prev.z) + '" x2="' + sx(w.x) + '" y2="' + sz(w.z) + '" />';
    prev = w;
  }
  // the pickups seen (within radar range at some point)
  for (const pk of state.pickups) { if (pk.taken) continue; if (Math.hypot(pk.x - t.x, pk.z - t.z) < T.RADAR_RANGE) seenPickups.add(pk.id); if (!seenPickups.has(pk.id)) continue; const x = sx(pk.x), z = sz(pk.z); h += '<path class="pick" d="M' + x + ' ' + (z - 6) + ' l6 6 l-6 6 l-6 -6z" />'; }
  // the waypoints: numbered, named, the next lit, the boss and the base amber
  const next = T.nextWaypoint(state);
  R.forEach((w, i) => {
    const x = sx(w.x), z = sz(w.z);
    const cls = 'wp' + (w.done ? ' done' : '') + (w === next ? ' next' : '') + (w.boss || w.base ? ' boss' : '');
    h += '<circle class="' + cls + '" cx="' + x + '" cy="' + z + '" r="' + (w.boss || w.base ? 18 : 14) + '" />';
    h += '<text class="wpn' + (w.done ? ' done' : '') + '" x="' + x + '" y="' + (z + 5) + '">' + (w.base ? 'B' : w.boss ? '★' : (i + 1)) + '</text>';
    const name = w.base ? '' : w.boss ? 'THE ' + (bossNameOf(w) || 'BOSS') : (w.landmark ? w.landmark.name : '');
    if (name) h += '<text class="lm" x="' + x + '" y="' + (z + (i % 2 ? 36 : -24)) + '">' + name + '</text>';
  });
  // contacts on the radar now
  for (const e of state.enemies) { if (!e.alive || Math.hypot(e.x - t.x, e.z - t.z) > T.RADAR_RANGE) continue; h += '<circle class="contact" cx="' + sx(e.x) + '" cy="' + sz(e.z) + '" r="' + (T.ENEMY[e.kind].boss ? 6 : 4) + '" />'; }
  // the tank: a triangle at its heading
  const hx = sx(t.x), hz = sz(t.z), a = t.heading;
  const tri = [[0, -16], [10, 12], [-10, 12]].map(([px, py]) => [hx + px * Math.cos(a) - py * Math.sin(a), hz + px * Math.sin(a) + py * Math.cos(a)]);
  h += '<polygon class="me" points="' + tri.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + '" />';
  $('map-svg').innerHTML = h;
  $('map-title').textContent = 'LEVEL ' + state.mission + ' — ' + def.name;
  const r = lastReadouts;
  $('map-sub').textContent = (r ? r.routeDone + ' OF ' + r.routeTotal + ' WAYPOINTS' : '') + (next ? ' · NEXT: ' + next.name : ' · THE ROAD IS DONE');
}
function bossNameOf(w) { if (!w.encounter) return ''; for (const k of Object.keys(w.encounter)) if (T.ENEMY[k] && T.ENEMY[k].boss) return ENEMY_NAMES[k].replace(/^THE /, ''); return ''; }
$('btn-map').addEventListener('click', (e) => { e.stopPropagation(); toggleMap(); });
$('map').addEventListener('pointerdown', (e) => { if (e.target === $('map') || e.target === $('map-foot')) toggleMap(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// the console's weapon rows are buttons too (the lander's console got the same on James's ask)
$('wpn-shell').addEventListener('pointerdown', (e) => { e.stopPropagation(); if (mode === 'play') fireEdge = true; });
$('wpn-laser').addEventListener('pointerdown', (e) => { e.stopPropagation(); if (mode === 'play') laserEdge = true; });

function togglePause() {
  if (mode === 'map') return;
  if (mode === 'paused') { mode = pausedFrom; document.body.classList.remove('paused'); lastT = 0; if (mode === 'play') lockPointer(); }
  else if (mode === 'play' || mode === 'settle') { pausedFrom = mode; mode = 'paused'; document.body.classList.add('paused'); Sfx.quiet(); unlockPointer(); }
}
function armRestart() {
  if (mode === 'attract') return;
  const btn = $('btn-restart');
  if (restartArmed) {
    clearTimeout(restartArmed); restartArmed = 0;
    btn.classList.remove('armed'); btn.textContent = 'RESTART';
    document.body.classList.remove('paused');
    $('result-card').classList.remove('show');
    scene.clearEffects(); clearFloats(); Sfx.quiet();
    state = null;
    enterAttract('MISSION ABANDONED');
    return;
  }
  btn.classList.add('armed'); btn.textContent = 'SURE?';
  restartArmed = setTimeout(() => { restartArmed = 0; btn.classList.remove('armed'); btn.textContent = 'RESTART'; }, 3000);
}
$('btn-pause').addEventListener('click', togglePause);
$('btn-restart').addEventListener('click', armRestart);
$('btn-start').addEventListener('click', startGame);
$('btn-next').addEventListener('click', nextStep);

// ---- tuner ---------------------------------------------------------------------------------------------
const tuner = $('tuner');
let tunerPaused = false;
function openTuner() { tuner.classList.add('open'); if (mode === 'play') { togglePause(); tunerPaused = true; } }
function closeTuner() { tuner.classList.remove('open'); if (tunerPaused && mode === 'paused') togglePause(); tunerPaused = false; }
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
  $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { play[key] = parse ? parse(b.dataset.v) : b.dataset.v; save(PLAY_KEY, play); syncPlayUI(); }));
}
seg('t-mission', 'mission', (v) => parseInt(v, 10));
$('t-sens').addEventListener('input', (e) => { play.sens = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-turn').addEventListener('input', (e) => { play.turn = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  const on = (id, v) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on('t-mission', play.mission);
  $('t-sens').value = play.sens; $('t-sens-val').textContent = (+play.sens).toFixed(2) + '×';
  $('t-turn').value = play.turn; $('t-turn-val').textContent = (+play.turn).toFixed(2) + '×';
  $('t-seed').value = play.seed || '';
  if (mode === 'attract' && !(CAMPAIGN && campaignStart())) { const m = T.MISSIONS[clamp(play.mission | 0, 1, LEVELS_MAX)]; $('start-mission').textContent = 'LEVEL ' + clamp(play.mission | 0, 1, LEVELS_MAX) + ' — ' + m.name; }
}
const lookRows = $('look-rows');
function buildLookRows() {
  lookRows.innerHTML = '';
  for (const key of Object.keys(LOOK_RANGES)) {
    const r = LOOK_RANGES[key];
    const row = document.createElement('div');
    row.className = 't-row';
    row.innerHTML = `<div class="t-label"><span>${r.label}</span><span data-val="${key}"></span></div><input type="range" data-key="${key}" min="${r.min}" max="${r.max}" step="${r.step}" />`;
    lookRows.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => { look[key] = parseFloat(e.target.value); save(LOOK_KEY, look); syncLookUI(); applyLook(key === 'res'); });
  }
}
function syncLookUI() {
  lookRows.querySelectorAll('input').forEach((inp) => {
    const k = inp.dataset.key; inp.value = look[k];
    lookRows.querySelector(`[data-val="${k}"]`).textContent = (+look[k]).toFixed(LOOK_RANGES[k].step < 0.1 ? 2 : LOOK_RANGES[k].step < 1 ? 1 : 0);
  });
}
function applyLook(resized) { if (!scene) return; scene.setParams(look); if (resized) scene.resize(); applyTint(); }
$('t-reset').addEventListener('click', () => { look = Object.assign({}, DEFAULT_PARAMS); save(LOOK_KEY, look); syncLookUI(); applyLook(true); });

// ---- go -------------------------------------------------------------------------------------------------
window.addEventListener('resize', () => { if (scene) scene.resize(); });
buildLookRows(); syncPlayUI(); syncLookUI(); applyLook(false);
enterAttract();
requestAnimationFrame(frame);
