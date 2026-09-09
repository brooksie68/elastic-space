// Carnage — the sounds. File-backed one-shots (ElevenLabs, made at authoring time into assets/audio/sfx/)
// with a synthesis recipe behind every one of them, so nothing is ever silent and it works from file://.
// Three voice sets: the clown laughs, the girl says sweet murderous things, the king never says a word.
// The continuous things (traffic, the drone's rotor, the cruiser's siren, the dust roll, the neon hum at
// night) are synthesis. No music unless James drops a track in as assets/audio/theme.mp3 (0.22, low).
// Everything goes through the shared sound control (game.js attaches it).
globalThis.CarnageSfx = (function () {
  'use strict';
  let ctx = null, master = null, comp = null, sfxGain = null, bedGain = null, running = false, volume = 0.8;
  let pinkBuf = null;
  const scriptBase = (document.currentScript && document.currentScript.src) ? new URL('./', document.currentScript.src).href : './';
  const SFX_DIR = scriptBase + 'assets/audio/sfx/';

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9;
    bedGain = ctx.createGain(); bedGain.gain.value = 0.5;
    sfxGain.connect(comp); bedGain.connect(comp); comp.connect(master); master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25; }
    pinkBuf = b;
    return true;
  }
  function start() { if (!ensure()) return; running = true; if (ctx.state === 'suspended') ctx.resume(); master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); preflight(); startBeds(); startMusic(); }
  function stop() { running = false; if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); stopBeds(); stopMusic(); }
  function setVolume(v) { volume = v; if (running && master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }

  // ---- the synthesis kit --------------------------------------------------------------------------------------
  function out(node, pan) {
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); p.connect(sfxGain); }
    else node.connect(sfxGain);
  }
  function tone(o) {
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain || 0.2, t + (o.a || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.filter) { const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 800; f.Q.value = o.q || 1; osc.connect(f); node = f; }
    if (o.vib) { const l = ctx.createOscillator(); l.frequency.value = o.vibRate || 6; const lg = ctx.createGain(); lg.gain.value = o.vib; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
    node.connect(g); out(g, o.pan); osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function noise(o) {
    const t = ctx.currentTime + (o.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = pinkBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1200, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur); f.Q.value = o.q || 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain || 0.5, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); out(g, o.pan); s.start(t, Math.random() * 1.5); s.stop(t + o.dur + 0.05);
  }
  function voice(o) {
    // a vowel: a buzzy source through two formant peaks
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(o.f, t); osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2 || o.f), t + o.dur);
    if (o.vib) { const l = ctx.createOscillator(); l.frequency.value = o.vibRate || 6; const lg = ctx.createGain(); lg.gain.value = o.vib; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain || 0.15, t + (o.a || 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    const mix = ctx.createGain();
    for (const ff of (o.formants || [700, 1200])) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff; f.Q.value = 6; osc.connect(f); f.connect(mix); }
    mix.connect(g); out(g, o.pan); osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  const thud = (p, k) => { tone({ f: 90 * (k || 1), f2: 38, dur: 0.22, type: 'sine', gain: 0.5, pan: p }); noise({ dur: 0.12, f: 300, gain: 0.35, pan: p }); };
  const tinkle = (p, n, delay) => { for (let i = 0; i < (n || 6); i++) tone({ f: 2200 + Math.random() * 3200, dur: 0.12 + Math.random() * 0.2, type: 'sine', gain: 0.05, delay: (delay || 0) + Math.random() * 0.4, pan: p }); };
  const chord = (p, freqs, dur, type, gap) => freqs.forEach((f, i) => tone({ f, dur: dur || 0.3, type: type || 'triangle', gain: 0.09, delay: i * (gap || 0.09), pan: p }));

  // ---- the recipes: one behind every id --------------------------------------------------------------------------
  const R = {
    swing: (p) => noise({ dur: 0.18, f: 600, f2: 2400, type: 'bandpass', q: 0.7, gain: 0.25, pan: p }),
    hit: (p) => thud(p, 1.2),
    glass: (p) => { noise({ dur: 0.25, f: 3500, type: 'highpass', gain: 0.45, pan: p }); tinkle(p, 8, 0.05); },
    wallBreak: (p) => { noise({ dur: 0.45, f: 700, f2: 120, gain: 0.7, pan: p }); thud(p, 0.8); for (let i = 0; i < 5; i++) noise({ dur: 0.08, f: 1000 + Math.random() * 1500, type: 'bandpass', q: 3, gain: 0.3, delay: 0.1 + Math.random() * 0.4, pan: p }); },
    crack: (p) => { noise({ dur: 0.15, f: 900, f2: 300, gain: 0.4, pan: p }); for (let i = 0; i < 3; i++) noise({ dur: 0.04, f: 2500, type: 'bandpass', q: 4, gain: 0.25, delay: 0.05 + i * 0.05, pan: p }); },
    neonBreak: (p) => { tone({ f: 1800, f2: 200, dur: 0.3, type: 'square', gain: 0.1, pan: p }); noise({ dur: 0.2, f: 3000, type: 'highpass', gain: 0.35, pan: p }); tinkle(p, 6, 0.05); },
    reveal: (p) => tone({ f: 520, f2: 780, dur: 0.12, type: 'sine', gain: 0.08, pan: p }),
    chomp: (p) => { for (let i = 0; i < 2; i++) { noise({ dur: 0.12, f: 400, f2: 150, gain: 0.5, delay: i * 0.16, pan: p }); tone({ f: 160, f2: 80, dur: 0.1, type: 'square', gain: 0.08, delay: i * 0.16, pan: p }); } },
    munch: (p) => { for (let i = 0; i < 3; i++) noise({ dur: 0.07, f: 900, f2: 300, gain: 0.3, delay: i * 0.1, pan: p }); },
    cash: (p) => { chord(p, [1568, 2093], 0.5, 'sine', 0.06); noise({ dur: 0.08, f: 4000, type: 'highpass', gain: 0.15, pan: p }); },
    power: (p) => chord(p, [523, 659, 784, 1046, 1318], 0.35, 'triangle', 0.07),
    zap: (p) => { tone({ f: 120, dur: 0.35, type: 'sawtooth', gain: 0.18, vib: 60, vibRate: 40, pan: p }); noise({ dur: 0.3, f: 3000, type: 'highpass', gain: 0.25, pan: p }); },
    sizzle: (p) => noise({ dur: 0.7, f: 5000, type: 'highpass', gain: 0.3, pan: p }),
    cough: (p) => { voice({ f: 220, f2: 140, dur: 0.14, formants: [500, 1500], gain: 0.2, pan: p }); voice({ f: 200, f2: 120, dur: 0.16, formants: [500, 1500], gain: 0.18, delay: 0.2, pan: p }); },
    ouch: (p) => voice({ f: 260, f2: 160, dur: 0.3, formants: [600, 1700], gain: 0.2, pan: p }),
    boom: (p) => { noise({ dur: 0.9, f: 900, f2: 60, gain: 0.9, pan: p }); tone({ f: 70, f2: 28, dur: 0.8, type: 'sine', gain: 0.6, pan: p }); },
    ding: (p) => tone({ f: 2093, dur: 0.6, type: 'sine', gain: 0.12, pan: p }),
    flash: (p) => { noise({ dur: 0.06, f: 5000, type: 'highpass', gain: 0.4, pan: p }); tone({ f: 3000, f2: 1500, dur: 0.25, type: 'sine', gain: 0.1, delay: 0.03, pan: p }); },
    neonOut: (p) => { tone({ f: 120, f2: 40, dur: 0.6, type: 'sawtooth', gain: 0.12, filter: 'lowpass', ff: 600, pan: p }); tinkle(p, 5, 0.1); },
    rumble: (p) => { noise({ dur: 2.2, f: 120, f2: 60, gain: 0.7, a: 0.3, pan: p }); tone({ f: 40, f2: 30, dur: 2.2, type: 'sine', gain: 0.35, a: 0.3, pan: p }); },
    crash: (p) => { noise({ dur: 1.6, f: 500, f2: 50, gain: 1.0, pan: p }); tone({ f: 60, f2: 24, dur: 1.4, type: 'sine', gain: 0.7, pan: p }); for (let i = 0; i < 12; i++) noise({ dur: 0.1, f: 800 + Math.random() * 2500, type: 'bandpass', q: 2, gain: 0.35, delay: 0.2 + Math.random() * 1.2, pan: p }); },
    thud: (p) => thud(p, 1),
    step: (p) => thud(p, 0.6),
    jump: (p) => noise({ dur: 0.25, f: 300, f2: 1600, type: 'bandpass', q: 0.8, gain: 0.2, pan: p }),
    grab: (p) => noise({ dur: 0.2, f: 500, f2: 200, gain: 0.35, pan: p }),
    revert: (p) => { voice({ f: 420, f2: 110, dur: 1.4, formants: [700, 1900], vib: 12, vibRate: 5, gain: 0.18, pan: p }); tone({ f: 600, f2: 120, dur: 1.4, type: 'sine', gain: 0.08, pan: p }); },
    walkoff: (p) => chord(p, [330, 311, 294, 262], 0.5, 'sawtooth', 0.32),
    arrive: (p) => { tone({ f: 1800, f2: 300, dur: 0.9, type: 'sine', gain: 0.1, pan: p }); noise({ dur: 0.9, f: 800, f2: 200, gain: 0.25, pan: p }); },
    bark: (p) => { voice({ f: 180, f2: 150, dur: 0.12, formants: [800, 2200], gain: 0.16, pan: p }); voice({ f: 200, f2: 150, dur: 0.16, formants: [700, 1900], gain: 0.16, delay: 0.16, pan: p }); },
    shot: (p) => { noise({ dur: 0.08, f: 2500, f2: 400, gain: 0.5, pan: p }); tone({ f: 200, f2: 60, dur: 0.1, type: 'square', gain: 0.1, pan: p }); },
    droneShot: (p) => { tone({ f: 1400, f2: 300, dur: 0.09, type: 'square', gain: 0.07, pan: p }); noise({ dur: 0.06, f: 3000, gain: 0.25, pan: p }); },
    squish: (p) => { noise({ dur: 0.3, f: 500, f2: 120, gain: 0.5, pan: p }); tone({ f: 300, f2: 90, dur: 0.2, type: 'sine', gain: 0.15, pan: p }); },
    yelp: (p) => voice({ f: 400, f2: 700, dur: 0.35, formants: [900, 2400], gain: 0.16, pan: p }),
    engine: (p) => { tone({ f: 48, dur: 1.6, type: 'sawtooth', gain: 0.18, vib: 6, vibRate: 22, filter: 'lowpass', ff: 300, pan: p }); noise({ dur: 1.6, f: 300, gain: 0.2, a: 0.2, pan: p }); },
    cannon: (p) => { noise({ dur: 0.5, f: 1200, f2: 100, gain: 0.7, pan: p }); tone({ f: 90, f2: 35, dur: 0.45, type: 'sine', gain: 0.45, pan: p }); },
    shell: (p) => { noise({ dur: 0.6, f: 900, f2: 80, gain: 0.7, pan: p }); tone({ f: 80, f2: 30, dur: 0.5, type: 'sine', gain: 0.4, pan: p }); },
    clang: (p) => { tone({ f: 620, f2: 400, dur: 0.6, type: 'square', gain: 0.1, filter: 'bandpass', ff: 1200, q: 6, pan: p }); noise({ dur: 0.12, f: 2000, gain: 0.3, pan: p }); },
    droneDie: (p) => { tone({ f: 900, f2: 60, dur: 1.2, type: 'sawtooth', gain: 0.12, vib: 80, vibRate: 30, pan: p }); noise({ dur: 0.4, f: 3000, type: 'highpass', gain: 0.3, pan: p }); },
    horn: (p) => chord(p, [415, 523], 0.35, 'square', 0.0),
    wreck: (p) => { noise({ dur: 0.5, f: 1500, f2: 200, gain: 0.7, pan: p }); thud(p, 0.9); tinkle(p, 8, 0.05); },
    extra: (p) => chord(p, [659, 880, 1046, 1318, 1046, 1318], 0.2, 'triangle', 0.09),
    start: (p) => chord(p, [262, 392, 523], 0.35, 'triangle', 0.11),
    over: (p) => chord(p, [392, 330, 262, 196], 0.45, 'triangle', 0.18),
    dayEnd: (p) => chord(p, [523, 659, 784, 1046], 0.4, 'triangle', 0.1),
    exit: (p) => chord(p, [262, 392, 523, 784, 1046], 0.5, 'sine', 0.09),
    ui: (p) => tone({ f: 900, dur: 0.05, type: 'sine', gain: 0.06, pan: p }),
    // the voices, synthesised: a laugh, a sing-song, a plastic creak
    laugh: (p) => { for (let i = 0; i < 5; i++) voice({ f: 200 + i * 12, f2: 170, dur: 0.16, formants: [700, 1200], gain: 0.16, delay: i * 0.19, pan: p }); },
    sweet: (p) => { for (const [i, f] of [392, 494, 587, 440].entries()) voice({ f: f * 0.5, f2: f * 0.5, dur: 0.22, formants: [800, 2600], vib: 4, vibRate: 6, gain: 0.12, delay: i * 0.24, pan: p }); },
    creak: (p) => { noise({ dur: 0.35, f: 900, f2: 1600, type: 'bandpass', q: 8, gain: 0.18, pan: p }); tone({ f: 140, f2: 210, dur: 0.35, type: 'sawtooth', gain: 0.05, filter: 'bandpass', ff: 1200, q: 8, pan: p }); },
  };

  // ---- file-backed one-shots: an id maps to a file; missing files fall back to the recipe --------------------------
  const FILES = {
    swing: 'swing', hit: 'hit', glass: 'glass', wallBreak: 'wallbreak', crack: 'crack', neonBreak: 'neonbreak', chomp: 'chomp', munch: 'munch', cash: 'cash', power: 'power',
    zap: 'zap', sizzle: 'sizzle', cough: 'cough', ouch: ['ouch1', 'ouch2'], boom: 'boom', ding: 'ding', flash: 'flash', neonOut: 'neonout', rumble: 'rumble', crash: 'crash',
    thud: 'thud', jump: 'jump', grab: 'grab', revert: 'revert', walkoff: 'walkoff', arrive: 'arrive', bark: ['bark1', 'bark2'], shot: 'shot', droneShot: 'droneshot', squish: 'squish',
    yelp: 'yelp', engine: 'engine', cannon: 'cannon', shell: 'shell', clang: 'clang', droneDie: 'dronedie', horn: 'horn', wreck: 'wreck', extra: 'extra', start: 'start', over: 'over', dayEnd: 'dayend', exit: 'exit',
  };
  const VOICES = {
    george: { start: ['george1', 'george2'], pick: ['george1'], eat: ['george2', 'george3'], building: ['george3'], revert: ['george-revert'], recipe: 'laugh' },
    lizzie: { start: ['lizzie-start'], pick: ['lizzie-start'], eat: ['lizzie-eat'], building: ['lizzie-building'], revert: ['lizzie-revert'], recipe: 'sweet' },
    ralph: { start: ['ralph-creak'], pick: ['ralph-creak'], eat: [], building: ['ralph-creak'], revert: ['ralph-creak'], recipe: 'creak' },
  };
  const available = new Set();
  let preflighted = false;
  function preflight() {
    if (preflighted) return; preflighted = true;
    const names = new Set();
    for (const v of Object.values(FILES)) (Array.isArray(v) ? v : [v]).forEach((n) => names.add(n));
    for (const v of Object.values(VOICES)) for (const k of ['start', 'pick', 'eat', 'building', 'revert']) v[k].forEach((n) => names.add(n));
    for (const n of names) {
      const a = new Audio(); a.preload = 'auto';
      a.addEventListener('canplaythrough', () => available.add(n), { once: true });
      a.src = SFX_DIR + n + '.mp3';
    }
  }
  const live = new Set();
  function playFile(name, pan, gain) {
    const a = new Audio(SFX_DIR + name + '.mp3');
    a.volume = 1;
    try {
      const src = ctx.createMediaElementSource(a);
      const g = ctx.createGain(); g.gain.value = gain == null ? 0.9 : gain;
      src.connect(g); out(g, pan);
    } catch (e) { /* a second source on the same element is not allowed; fine, it plays dry */ }
    live.add(a);
    a.addEventListener('ended', () => live.delete(a), { once: true });
    a.play().catch(() => {});
  }
  let lastPlay = {};
  function play(id, pan, gain) {
    if (!running || !ctx) return;
    const now = ctx.currentTime;
    if (lastPlay[id] && now - lastPlay[id] < 0.04) return;   // the same sound twice in a frame is one sound
    lastPlay[id] = now;
    let f = FILES[id];
    if (Array.isArray(f)) f = f[Math.floor(Math.random() * f.length)];
    if (f && available.has(f)) { playFile(f, pan, gain); return; }
    if (R[id]) R[id](pan || 0);
  }
  let lastVoice = 0;
  function voiceLine(slug, cue) {
    if (!running || !ctx) return;
    const now = ctx.currentTime;
    if (now - lastVoice < 2.5 && cue !== 'revert') return;   // the monsters do not talk over themselves
    lastVoice = now;
    const v = VOICES[slug]; if (!v) return;
    const list = v[cue] || [];
    const f = list[Math.floor(Math.random() * list.length)];
    if (f && available.has(f)) { playFile(f, 0, 0.8); return; }
    if (slug === 'ralph' && cue === 'eat') return;   // the king never says a word
    if (R[v.recipe]) R[v.recipe](0);
  }

  // ---- the beds ----------------------------------------------------------------------------------------------------
  let beds = null;
  function startBeds() {
    if (beds || !ctx) return;
    const traffic = ctx.createBufferSource(); traffic.buffer = pinkBuf; traffic.loop = true;
    const tf = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 220;
    const tg = ctx.createGain(); tg.gain.value = 0.22;
    traffic.connect(tf); tf.connect(tg); tg.connect(bedGain); traffic.start();
    // the drone's rotor: a chopped low saw, off until a drone is up
    const rotor = ctx.createOscillator(); rotor.type = 'sawtooth'; rotor.frequency.value = 58;
    const chop = ctx.createOscillator(); chop.type = 'square'; chop.frequency.value = 27;
    const chopG = ctx.createGain(); chopG.gain.value = 0.5;
    const rotorAm = ctx.createGain(); rotorAm.gain.value = 0.5;
    chop.connect(chopG); chopG.connect(rotorAm.gain);
    const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 500;
    const rg = ctx.createGain(); rg.gain.value = 0;
    rotor.connect(rotorAm); rotorAm.connect(rf); rf.connect(rg); rg.connect(bedGain); rotor.start(); chop.start();
    // the siren: two tones traded
    const sir = ctx.createOscillator(); sir.type = 'square'; sir.frequency.value = 700;
    const sirL = ctx.createOscillator(); sirL.type = 'square'; sirL.frequency.value = 1.6;
    const sirLg = ctx.createGain(); sirLg.gain.value = 120;
    sirL.connect(sirLg); sirLg.connect(sir.frequency);
    const sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 1800;
    const sg = ctx.createGain(); sg.gain.value = 0;
    sir.connect(sf); sf.connect(sg); sg.connect(bedGain); sir.start(); sirL.start();
    // the dust roll: brown noise that swells and decays
    const dust = ctx.createBufferSource(); dust.buffer = pinkBuf; dust.loop = true;
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 140;
    const dg = ctx.createGain(); dg.gain.value = 0;
    dust.connect(df); df.connect(dg); dg.connect(bedGain); dust.start(0, 0.7);
    // the neon hum at night: very quiet, very low
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 180;
    const hg = ctx.createGain(); hg.gain.value = 0;
    hum.connect(hf); hf.connect(hg); hg.connect(bedGain); hum.start();
    beds = { traffic, tg, rotor, chop, rg, sir, sirL, sg, dust, dg, hum, hg };
  }
  function stopBeds() {
    if (!beds) return;
    for (const n of [beds.traffic, beds.rotor, beds.chop, beds.sir, beds.sirL, beds.dust, beds.hum]) { try { n.stop(); } catch (e) {} }
    beds = null;
  }
  function setDrone(on) { if (beds) beds.rg.gain.setTargetAtTime(on ? 0.16 : 0, ctx.currentTime, on ? 0.6 : 0.4); }
  function setSiren(on) { if (beds) beds.sg.gain.setTargetAtTime(on ? 0.035 : 0, ctx.currentTime, 0.3); }
  function setDust(level) { if (beds) { beds.dg.gain.setTargetAtTime(Math.min(1, level) * 0.5, ctx.currentTime, 0.15); beds.dg.gain.setTargetAtTime(0, ctx.currentTime + 1.2, 1.4); } }
  let nightNow = false;
  function setNight(n) { if (n === nightNow || !beds) { nightNow = n; return; } nightNow = n; beds.hg.gain.setTargetAtTime(n ? 0.03 : 0, ctx.currentTime, 1); beds.tg.gain.setTargetAtTime(n ? 0.12 : 0.22, ctx.currentTime, 1); }

  // ---- music: a track James drops in as assets/audio/theme.mp3, looped low ------------------------------------------
  let musicEl = null, musicOn = true, musicVol = 0.22;
  function startMusic() {
    if (!musicOn) return;
    if (!musicEl) { musicEl = new Audio(scriptBase + 'assets/audio/theme.mp3'); musicEl.loop = true; musicEl.volume = musicVol; musicEl.addEventListener('error', () => { musicEl = null; musicOn = false; }, { once: true }); }
    musicEl.play().catch(() => {});
  }
  function stopMusic() { if (musicEl) { try { musicEl.pause(); } catch (e) {} } }
  function setMusic(on) { musicOn = !!on; if (!on) stopMusic(); else if (running) startMusic(); }

  return { start, stop, setVolume, play, voice: voiceLine, setDrone, setSiren, setDust, setNight, setMusic, R, FILES, VOICES, available };
})();
