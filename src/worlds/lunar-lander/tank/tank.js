// Battle for the Moon 2075 — the TANK shell: mission flow, input, instruments,
// sound, tuner. Rules live in tank-core.js (pure, sim-tested); the picture in
// tank-render.js. This file wires them and owns nothing else.
import { TankScene, DEFAULT_PARAMS, MODELS } from './tank-render.js?v=1';

const T = globalThis.LunarTankCore;
const ST = globalThis.LunarStructures;
const SILENT = /[?&]silent=1/.test(location.search);   // pane-safe: no AudioContext is ever made

// ---- config -------------------------------------------------------------------
const PLAY_KEY = 'bftm-tank-play-v1';
const LOOK_KEY = 'bftm-tank-look-v1';
const LEDGER_KEY = 'bftm-tank-ledger-v1';
const PLAY_DEFAULTS = { mission: 1, mouse: 1, turn: 1, seed: '' };
const LOOK_RANGES = {
  hue:          { min: 0, max: 1, step: 0.01, label: 'line colour' },
  saturation:   { min: 0, max: 1, step: 0.05, label: 'colour depth' },
  brightness:   { min: 0.4, max: 2, step: 0.05, label: 'world lines' },
  lineWeight:   { min: 1, max: 4, step: 0.1, label: 'line weight' },
  glow:         { min: 0, max: 2.5, step: 0.05, label: 'glow' },
  tankFov:      { min: 40, max: 80, step: 1, label: 'field of view' },
  gridBright:   { min: 0, max: 0.8, step: 0.02, label: 'ground grid' },
  gridPitch:    { min: 50, max: 300, step: 25, label: 'grid spacing' },
  traceBright:  { min: 0, max: 1.5, step: 0.05, label: 'the flight line' },
  fogNear:      { min: 100, max: 2000, step: 50, label: 'fade starts' },
  fogFar:       { min: 800, max: 6000, step: 100, label: 'fade ends' },
  skyBright:    { min: 0, max: 1.2, step: 0.02, label: 'skyline' },
  skyFarBright: { min: 0, max: 1.2, step: 0.02, label: 'far skyline' },
  civBright:    { min: 0.1, max: 1.5, step: 0.02, label: 'civilian buildings' },
  hostBright:   { min: 0.1, max: 1.8, step: 0.02, label: 'hostile buildings' },
  enemyBright:  { min: 0.2, max: 2, step: 0.02, label: 'enemy tanks' },
  gunBright:    { min: 0, max: 1.5, step: 0.02, label: 'your gun' },
  slopePitch:   { min: 0, max: 1, step: 0.05, label: 'view follows the ground' },
  stars:        { min: 0, max: 1.5, step: 0.05, label: 'stars' },
  res:          { min: 0.5, max: 1, step: 0.05, label: 'render scale' },
};
const ENEMY_NAMES = { slow: 'TANK', medium: 'FAST TANK', boss: 'SIEGE TANK' };
const DEATH_MSG = {
  shell: ['A SHELL THROUGH THE HULL', 'THE CREW NEVER HEARD IT'],
  missile: ['A MISSILE FOUND YOU', 'THE SAM SITE IS STILL OUT THERE'],
  test: ['HULL BREACHED', ''],
};

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
let mode = 'attract';         // attract | play | settle | result | paused
let pausedFrom = 'play';
let carry = 0, lastT = 0, clock = 0;
const keys = {};
let pitchIn = 0;              // -1..1 look target
let fireEdge = false, laserEdge = false;
let restartArmed = 0, resultTimer = 0, hintFadeDone = false;
let hullFlash = 0, veilT = 0, contactsSeen = new Set(), inRangeWas = false;
let shellWasReady = true;

Object.defineProperty(globalThis, 'TANK_DEBUG', {
  get() { return { scene, state, mode, look, play, input: currentInput(), tick: (dt) => frameStep(dt), setPitch: (p) => { pitchIn = p; }, fire: () => { fireEdge = true; }, laser: () => { laserEdge = true; } }; },
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
    el.insertAdjacentHTML('beforeend', `<span class="${cls}">${i + 1}.</span><span class="r${cls}">${pad(e.score, 4)}</span><span class="${cls}">MISSION ${e.mission} · ${e.kills} KILLS</span>`);
  });
}

// ---- flow -------------------------------------------------------------------------------------
function makeGame() {
  let seed = parseInt(play.seed, 10);
  if (!Number.isFinite(seed)) seed = (Math.random() * 0xffffffff) >>> 0;
  state = T.createGame({ seed, mission: clamp(play.mission | 0, 1, 6) });
  state.tank.turnScale = play.turn;
  if (scene) { scene.setWorld(state); scene.clearEffects(); }
  clearFloats();
  contactsSeen = new Set(); inRangeWas = false;
  setCracks(0);
}
function resetInput() { pitchIn = 0; fireEdge = false; laserEdge = false; for (const k of Object.keys(keys)) keys[k] = false; }
function enterAttract(resultLine, stamp) {
  mode = 'attract';
  document.body.classList.remove('paused');
  $('result-card').classList.remove('show');
  const sr = $('start-result');
  if (resultLine) { sr.textContent = resultLine; sr.style.display = 'block'; } else { sr.style.display = 'none'; }
  renderLedger(stamp);
  const m = T.MISSIONS[clamp(play.mission | 0, 1, 6)];
  $('start-mission').textContent = 'MISSION ' + play.mission + ' — ' + m.name;
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
  mode = 'play'; carry = 0; resetInput();
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
      const stamp = Date.now();
      const list = readLedger();
      list.push({ score: state.score, mission: state.mission, kills: state.kills, stamp });
      list.sort((a, b) => b.score - a.score);
      writeLedger(list);
      const line = 'THE MOON IS YOURS — ' + pad(state.score, 4) + ' · ' + state.kills + ' KILLS';
      state = null;
      enterAttract(line, stamp);
      return;
    }
    T.nextMission(state); setCracks(0); scene.clearEffects(); scene.setWorld(state); contactsSeen = new Set(); inRangeWas = false;
    play.mission = state.mission; save(PLAY_KEY, play); syncPlayUI();
  }
  $('result-card').classList.remove('show');
  mode = 'play'; carry = 0; resetInput();
}
function showResult() {
  mode = 'result';
  const ph = state.phase;
  const w = $('r-word'), msg = $('r-msg'), det = $('r-detail'), pts = $('r-points'), btn = $('btn-next');
  if (ph === 'complete') {
    const last = !T.MISSIONS[state.mission + 1];
    w.textContent = last ? 'THE MOON IS YOURS' : 'STRETCH CLEARED';
    msg.textContent = 'MISSION ' + state.mission + ' — ' + state.missionDef.name;
    det.textContent = fmtTime(state.missionTime) + ' · ' + state.kills + ' KILLS SO FAR';
    pts.textContent = 'SCORE ' + pad(state.score, 4);
    btn.textContent = last ? 'AGAIN' : 'NEXT MISSION';
  } else {
    const by = state.lastDeath || 'shell';
    const m = DEATH_MSG[by] || DEATH_MSG.shell;
    w.textContent = ph === 'over' ? 'ALL TANKS LOST' : 'HULL BREACHED';
    msg.textContent = m[0];
    det.textContent = m[1];
    pts.textContent = 'SCORE ' + pad(state.score, 4) + (ph === 'over' ? ' · MISSION ' + state.mission : ' · ' + state.lives + (state.lives === 1 ? ' TANK LEFT' : ' TANKS LEFT'));
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
      if (e.enemy) scene.spawnBreak(MODELS[e.enemy.kind] || MODELS.slow, e.enemy.x, e.enemy.y, e.enemy.z, e.enemy.heading, 1, e.enemy.kind === 'boss' ? 1.6 : 1);
      else if (e.structure) scene.spawnBreak(ST.solid(e.structure.id), e.structure.x, e.structure.y, e.structure.z, 0, 1, 1.4);
      Sfx.kill(e.kind === 'boss' || (e.structure && e.structure.mult >= 3));
      floatLabel(e.x, e.y + 24, e.z, '+' + e.points, '');
      const name = e.enemy ? ENEMY_NAMES[e.enemy.kind] : e.structure.name;
      floatLabel(e.x, e.y + 24, e.z, name + ' ' + (e.enemy ? T.ENEMY[e.enemy.kind].mult : e.structure.mult) + 'X', 'word', 1);
    } else if (e.type === 'hit') { scene.spawnBurst(e.x, e.y, e.z, 0.8); Sfx.hit(); }
    else if (e.type === 'absorbed') { scene.spawnBurst(e.x, e.y, e.z, 0.4); Sfx.absorbed(); floatLabel(e.x, e.y + 10, e.z, e.door ? 'DOOR SHUT' : 'CIVILIAN', 'word'); }
    else if (e.type === 'shellGround') scene.spawnDust(e.x, e.z, 0.7);
    else if (e.type === 'missileGround') { scene.spawnDust(e.x, e.z, 1.2); Sfx.hit(); }
    else if (e.type === 'missileDown') { scene.spawnBurst(e.x, e.y, e.z, 1.4); Sfx.missileDown(); floatLabel(e.x, e.y + 8, e.z, 'MISSILE DOWN', 'word'); }
    else if (e.type === 'enemyFire') Sfx.enemyFire(Math.hypot(e.x - t.x, e.z - t.z));
    else if (e.type === 'samLaunch') { Sfx.samLaunch(); floatLabel(e.x, e.y + 12, e.z, 'MISSILE', 'word'); }
    else if (e.type === 'hullHit') { hullFlash = 0.7; veilT = 0.09; setCracks(e.hits); Sfx.hullHit(); }
    else if (e.type === 'dead') { hullFlash = 1; veilT = 0.12; setCracks(3); state.lastDeath = e.by; Sfx.dead(); resultTimer = 2.6; mode = 'settle'; }
    else if (e.type === 'over') setTimeout(() => Sfx.over(), 1500);
    else if (e.type === 'wave') { Sfx.wave(); if (e.wave > 1) floatCentre('WAVE ' + e.wave + ' OF ' + e.of); }
    else if (e.type === 'complete') { Sfx.complete(); resultTimer = 2.2; mode = 'settle'; }
    else if (e.type === 'bump') Sfx.bump();
  }
}
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
  // the tag over the hostile you are looking at: name + X (civilians get nothing)
  const t = state.tank;
  const r = lastReadouts;
  let best = null;
  if (r) for (const c of r.contacts) if (c.kind !== 'missile' && Math.abs(c.bearing) < 0.06 && c.range < 1400 && (!best || c.range < best.range)) best = c;
  if (best) {
    if (!hostTag) { hostTag = document.createElement('div'); hostTag.className = 'tag'; labelLayer.appendChild(hostTag); }
    // NAME + X, then one word under it: the hardening (OVERHANG / RIDGE / DOOR / SHIELD), in pink when the door is shut (a refusal)
    const word = best.doorShut ? '<span class="word refuse">DOOR SHUT</span>' : best.hard ? '<span class="word">' + best.hard.toUpperCase() + '</span>' : '';
    hostTag.innerHTML = best.name + '<span class="x">' + best.mult + 'X</span>' + word;
    hoverId = best.sid || best.id || null;
    const f = T.forward(t.heading + best.bearing);
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
  if (keys['q']) pitchIn = clamp(pitchIn + 0.04, -1, 1); else if (keys['e']) pitchIn = clamp(pitchIn - 0.04, -1, 1);
  return { drive, turn, pitch: pitchIn, fire: fireEdge, laser: laserEdge };
}
let lastReadouts = null;
function frameStep(dt) {
  if (!scene) return;
  if (mode === 'play') {
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
      enemies: state.enemies, missiles: state.missiles, eshells: state.eshells, shell: state.shell, beam: state.laser.beam,
      structures: T.structuresNear(state, t.x, t.z, 2800),
      dead: state.phase === 'dead' || state.phase === 'over',
      flash: hullFlash * 0.22,
      hover: hoverId,
    };
    scene.render(view, dt);
    placeLabels(dt);
    renderInstruments();
  }
}
function frame(t) {
  const dt = lastT ? Math.max(0, Math.min(0.1, (t - lastT) / 1000)) : 0;
  lastT = t;
  if (mode !== 'paused') frameStep(dt);
  requestAnimationFrame(frame);
}

// ---- instruments ----------------------------------------------------------------------------------
const blipLayer = $('radar-blips');
let lastHullKey = '';
function renderInstruments() {
  if (!state || !lastReadouts) return;
  const r = lastReadouts;
  const t = state.tank;
  $('v-score').textContent = pad(r.score, 4);
  $('v-mission').textContent = 'MISSION ' + r.mission + (r.missionName ? ' · ' + r.missionName : '');
  $('v-time').textContent = fmtTime(r.time);
  $('v-left').textContent = r.hostilesLeft + ' LEFT' + (r.waves ? ' · WAVE ' + r.wave + '/' + r.waves : '');
  $('v-hdg').innerHTML = pad(r.headingDeg, 3) + '<span class="unit">°</span>';
  $('v-spd').innerHTML = pad(Math.abs(r.speed), 2) + '<span class="unit">FT/S</span>';
  // the gun
  const sh = $('v-shell');
  sh.textContent = r.shellReady ? 'READY' : 'IN FLIGHT';
  sh.classList.toggle('ready', r.shellReady); sh.classList.toggle('wait', !r.shellReady);
  const lf = $('laser-fill');
  lf.style.width = (r.laser * 100).toFixed(1) + '%';
  lf.classList.toggle('charging', r.laser < 1);
  // the hull
  const hk = r.hits + '|' + r.lives;
  if (hk !== lastHullKey) {
    lastHullKey = hk;
    const cells = $('hull-track').children;
    for (let i = 0; i < cells.length; i++) {
      const alive = i < r.hitsMax - r.hits;
      cells[i].classList.toggle('gone', !alive);
      cells[i].classList.toggle('last', alive && r.hitsMax - r.hits === 1);
    }
    $('v-hull').textContent = r.hits === 0 ? 'WHOLE' : r.hits === 1 ? 'HIT ONCE' : r.hits === 2 ? 'ONE MORE' : 'BREACHED';
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
  // the crosshair warms when a hostile is under it
  const under = r.contacts.some((c) => c.kind !== 'missile' && Math.abs(c.bearing) < 0.035 && c.range < 1400);
  $('cross').classList.toggle('on', under);
  $('range-word').classList.toggle('on', r.inRange && mode === 'play');
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
  else if (k === 'enter') { if (mode === 'attract') startGame(); else if (mode === 'result') nextStep(); }
  else if (k === 'p' || k === 'escape') togglePause();
  else if (k === 'r') armRestart();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { resetInput(); if (mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') togglePause(); });
// the mouse: its height on the screen is the look (no pointer lock — the cursor stays yours); left fires, right is the laser
canvas.addEventListener('pointermove', (e) => { if (play.mouse) pitchIn = clamp((0.5 - e.clientY / Math.max(1, window.innerHeight)) * 2.4, -1, 1); });
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  if (e.button === 2) laserEdge = true; else if (e.button === 0) fireEdge = true;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function togglePause() {
  if (mode === 'paused') { mode = pausedFrom; document.body.classList.remove('paused'); lastT = 0; }
  else if (mode === 'play' || mode === 'settle') { pausedFrom = mode; mode = 'paused'; document.body.classList.add('paused'); Sfx.quiet(); }
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
seg('t-mouse', 'mouse', (v) => parseInt(v, 10));
$('t-turn').addEventListener('input', (e) => { play.turn = parseFloat(e.target.value); save(PLAY_KEY, play); syncPlayUI(); });
$('t-seed').addEventListener('change', (e) => { play.seed = e.target.value.trim(); save(PLAY_KEY, play); });
$('t-seed-roll').addEventListener('click', () => { play.seed = String((Math.random() * 99999) | 0); save(PLAY_KEY, play); syncPlayUI(); });
function syncPlayUI() {
  const on = (id, v) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on('t-mission', play.mission); on('t-mouse', play.mouse);
  $('t-turn').value = play.turn; $('t-turn-val').textContent = (+play.turn).toFixed(2) + '×';
  $('t-seed').value = play.seed || '';
  if (mode === 'attract') { const m = T.MISSIONS[clamp(play.mission | 0, 1, 6)]; $('start-mission').textContent = 'MISSION ' + play.mission + ' — ' + m.name; }
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
