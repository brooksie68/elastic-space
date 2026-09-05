// Jabberwocky — sound. All Web Audio synthesis (no files): one recipe per gag, per outcome, per
// goon noise, plus the rifle's slot reel and a calliope bed that never quite keeps time.
// Routed through the shared sound control: start/stop/setVolume.
(function () {
  let ctx = null, master = null, comp = null, bedGain = null, sfxGain = null, running = false, volume = 0.8;
  let bedTimer = null, bedStep = 0, bedNext = 0, heartTimer = null;
  const TAU = Math.PI * 2;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = volume;
    sfxGain = ctx.createGain(); sfxGain.gain.value = 1;
    bedGain = ctx.createGain(); bedGain.gain.value = 0.32;
    sfxGain.connect(comp); bedGain.connect(comp); comp.connect(master); master.connect(ctx.destination);
    return true;
  }
  function start() { if (!ensure()) return; running = true; if (ctx.state === 'suspended') ctx.resume(); preflight(); startBed(); startMusic(); }
  function stop() { running = false; stopBed(); stopMusic(); if (ctx && ctx.state === 'running') ctx.suspend(); }
  function setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.03); }
  const now = () => ctx.currentTime;

  // ---- generators ------------------------------------------------------------------------------
  function env(g, t0, a, d, peak, sustain, r, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    if (sustain != null) { g.gain.linearRampToValueAtTime(sustain * peak, t0 + a + d); g.gain.setValueAtTime(sustain * peak, t0 + dur - r); }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  let noiseBuf = null;
  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25; }
    return noiseBuf;
  }
  // filtered noise burst. o: { dur, f, f2 (slide), q, type, gain, a, pan }
  function noise(o) {
    const t0 = now() + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = o.type || 'lowpass'; filt.Q.value = o.q || 0.8;
    filt.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) filt.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + o.dur);
    const g = ctx.createGain();
    env(g, t0, o.a || 0.005, o.d || o.dur * 0.3, o.gain || 0.5, o.sustain, o.r || o.dur * 0.3, o.dur);
    src.connect(filt); filt.connect(g); out(g, o.pan);
    src.start(t0); src.stop(t0 + o.dur + 0.05);
  }
  // an oscillator. o: { f, f2, dur, type, gain, a, vib, vibRate, detune, pan, delay, curve }
  function tone(o) {
    const t0 = now() + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) { if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(o.f2, t0 + o.dur); else osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur); }
    if (o.detune) osc.detune.value = o.detune;
    let lfo = null;
    if (o.vib) { lfo = ctx.createOscillator(); lfo.frequency.value = o.vibRate || 6; const lg = ctx.createGain(); lg.gain.value = o.vib; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + o.dur + 0.05); }
    const g = ctx.createGain();
    env(g, t0, o.a || 0.01, o.d || o.dur * 0.3, o.gain || 0.3, o.sustain, o.r || o.dur * 0.3, o.dur);
    let node = osc;
    if (o.filter) { const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1200; f.Q.value = o.fq || 1; osc.connect(f); node = f; }
    node.connect(g); out(g, o.pan);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }
  function out(g, pan) {
    if (pan != null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(sfxGain); }
    else g.connect(sfxGain);
  }
  // a voice: saw through two formant bandpasses. o: { f, f2, dur, formants [f1,f2], gain, vib }
  function voice(o) {
    const t0 = now() + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.dur);
    if (o.vib) { const lfo = ctx.createOscillator(); lfo.frequency.value = o.vibRate || 5.5; const lg = ctx.createGain(); lg.gain.value = o.vib; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + o.dur); }
    const g = ctx.createGain();
    env(g, t0, o.a || 0.03, 0.1, o.gain || 0.25, 0.8, o.r || 0.12, o.dur);
    const fm = o.formants || [700, 1200];
    for (const fr of fm) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 6; osc.connect(bp); bp.connect(g); }
    out(g, o.pan);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }
  function clicks(n, gap, o) {
    for (let i = 0; i < n; i++) noise({ dur: 0.03, f: (o && o.f) || 3000, type: 'bandpass', q: 3, gain: (o && o.gain) || 0.25, delay: i * gap + ((o && o.delay) || 0), pan: o && o.pan });
  }
  function seq(notes, o) {
    let t = (o && o.delay) || 0;
    for (const [f, d, gap] of notes) { tone(Object.assign({ f, dur: d, delay: t, type: (o && o.type) || 'square', gain: (o && o.gain) || 0.18, pan: o && o.pan }, (o && o.extra) || {})); t += gap != null ? gap : d; }
  }
  const boom = (o) => { noise({ dur: 0.9, f: 400, f2: 60, gain: 0.7, q: 0.5, pan: o && o.pan }); tone({ f: 90, f2: 30, dur: 0.7, type: 'sine', gain: 0.6, pan: o && o.pan }); };
  const thud = (o) => { noise({ dur: 0.25, f: 300, f2: 80, gain: 0.5, pan: o && o.pan }); tone({ f: 80, f2: 40, dur: 0.25, type: 'sine', gain: 0.5, pan: o && o.pan }); };
  const splat = (o) => { noise({ dur: 0.35, f: 1500, f2: 200, gain: 0.5, q: 1.5, pan: o && o.pan }); tone({ f: 260, f2: 80, dur: 0.3, type: 'triangle', gain: 0.25, pan: o && o.pan }); };
  const whoosh = (o) => noise({ dur: (o && o.dur) || 0.35, f: 400, f2: 3000, type: 'bandpass', q: 1.2, gain: (o && o.gain) || 0.35, a: 0.08, pan: o && o.pan });
  const scream = (o) => voice({ f: (o && o.f) || 520, f2: (o && o.f2) || 180, dur: (o && o.dur) || 0.6, formants: [800, 2400], vib: 30, vibRate: 9, gain: (o && o.gain) || 0.22, pan: o && o.pan });

  // ---- recipes: the gags ---------------------------------------------------------------------
  const R = {
    gunshot: (p) => { noise({ dur: 0.18, f: 4000, f2: 200, gain: 0.8, pan: p }); tone({ f: 120, f2: 40, dur: 0.2, type: 'square', gain: 0.4, pan: p }); },
    knives: (p) => { for (let i = 0; i < 9; i++) noise({ dur: 0.12, f: 6000, f2: 2000, type: 'highpass', gain: 0.25, delay: i * 0.03, pan: p }); },
    chainsaw: (p) => { tone({ f: 110, dur: 2.2, type: 'sawtooth', gain: 0.25, vib: 18, vibRate: 22, filter: 'lowpass', ff: 900, pan: p }); tone({ f: 55, dur: 2.2, type: 'square', gain: 0.15, vib: 5, vibRate: 30, pan: p }); },
    rocket: (p) => { noise({ dur: 1.4, f: 300, f2: 2500, type: 'bandpass', q: 0.8, gain: 0.45, a: 0.05, pan: p }); },
    baseballs: (p) => { for (let i = 0; i < 12; i++) whoosh({ dur: 0.18, gain: 0.2, pan: p }); for (let i = 0; i < 6; i++) tone({ f: 900 - i * 60, dur: 0.06, type: 'square', gain: 0.15, delay: 0.3 + i * 0.09, pan: p }); },
    splat: (p) => splat({ pan: p }),
    sand: (p) => { tone({ f: 8000, f2: 60, dur: 0.15, type: 'sine', gain: 0.3, pan: p }); setTimeout(() => { if (running) { boom({ pan: p }); tone({ f: 3000, dur: 3, type: 'sine', gain: 0.05, pan: p }); } }, 700); },
    thud: (p) => { thud({ pan: p }); whoosh({ dur: 0.2, gain: 0.3, pan: p }); },
    jello: (p) => { tone({ f: 180, f2: 90, dur: 0.6, type: 'sine', gain: 0.4, vib: 40, vibRate: 14, pan: p }); splat({ pan: p }); },
    flame: (p) => { noise({ dur: 1.2, f: 800, f2: 1200, type: 'bandpass', q: 0.6, gain: 0.5, a: 0.1, pan: p }); },
    hiss: (p) => { noise({ dur: 2.5, f: 3000, f2: 1500, type: 'highpass', gain: 0.35, a: 0.2, pan: p }); },
    screech: (p) => { for (let i = 0; i < 3; i++) tone({ f: 1800, f2: 3200, dur: 0.25, type: 'sawtooth', gain: 0.18, delay: i * 0.3, vib: 60, vibRate: 25, pan: p }); },
    hose: (p) => { noise({ dur: 1.4, f: 500, f2: 900, type: 'bandpass', q: 0.5, gain: 0.4, a: 0.1, pan: p }); tone({ f: 60, dur: 1.4, type: 'sine', gain: 0.15, vib: 8, vibRate: 40, pan: p }); },
    chomp: (p) => { for (let i = 0; i < 10; i++) { clicks(1, 0, { f: 2200, gain: 0.3, delay: i * 0.12, pan: p }); noise({ dur: 0.08, f: 900, f2: 300, gain: 0.25, delay: i * 0.12 + 0.03, pan: p }); } },
    blackhole: (p) => { tone({ f: 40, f2: 900, dur: 1.8, type: 'sine', gain: 0.4, pan: p }); noise({ dur: 1.8, f: 200, f2: 6000, type: 'bandpass', q: 2, gain: 0.25, pan: p }); tone({ f: 1200, f2: 30, dur: 0.4, type: 'square', gain: 0.3, delay: 1.7, pan: p }); },
    train: (p) => { for (const f of [220, 277, 330, 415]) tone({ f, dur: 1.4, type: 'sawtooth', gain: 0.12, a: 0.1, detune: (Math.random() - 0.5) * 20, pan: p }); noise({ dur: 2.5, f: 200, f2: 400, type: 'bandpass', q: 0.5, gain: 0.5, a: 0.3, pan: p }); for (let i = 0; i < 10; i++) thud({ pan: p }); for (let i = 0; i < 8; i++) noise({ dur: 0.1, f: 200, gain: 0.4, delay: 0.3 + i * 0.25, pan: p }); },
    lava: (p) => { noise({ dur: 1.5, f: 200, f2: 120, gain: 0.4, q: 1, pan: p }); for (let i = 0; i < 6; i++) tone({ f: 140 + Math.random() * 80, f2: 60, dur: 0.2, type: 'sine', gain: 0.2, delay: 0.2 + i * 0.2, pan: p }); },
    snap: (p) => { clicks(1, 0, { f: 1500, gain: 0.5, pan: p }); noise({ dur: 0.15, f: 3000, f2: 300, gain: 0.7, pan: p }); tone({ f: 200, f2: 60, dur: 0.2, type: 'square', gain: 0.4, delay: 0.02, pan: p }); },
    hole: (p) => { noise({ dur: 0.5, f: 800, f2: 100, gain: 0.5, pan: p }); scream({ f: 500, f2: 120, dur: 1.4, gain: 0.15, pan: p }); },
    kick: (p) => { voice({ f: 300, f2: 500, dur: 0.5, formants: [900, 1800], vib: 40, vibRate: 12, gain: 0.25, pan: p }); thud({ pan: p }); },
    tornado: (p) => { noise({ dur: 6, f: 300, f2: 500, type: 'bandpass', q: 0.4, gain: 0.35, a: 0.6, r: 2, pan: p }); },
    gravel: (p) => { for (let i = 0; i < 30; i++) noise({ dur: 0.05, f: 1500 + Math.random() * 2000, type: 'bandpass', q: 3, gain: 0.3, delay: Math.random() * 1.2, pan: p }); },
    purse: (p) => { whoosh({ dur: 0.3, gain: 0.4, pan: p }); thud({ pan: p }); voice({ f: 320, f2: 280, dur: 0.5, formants: [600, 1400], gain: 0.15, delay: 0.3, pan: p }); },
    vines: (p) => { noise({ dur: 0.8, f: 200, f2: 1500, type: 'bandpass', q: 1, gain: 0.3, pan: p }); for (let i = 0; i < 4; i++) clicks(2, 0.04, { f: 800, gain: 0.3, delay: 0.2 + i * 0.15, pan: p }); },
    clang: (p) => { whoosh({ dur: 0.4, gain: 0.3, pan: p }); for (const f of [520, 780, 1240]) tone({ f, dur: 1.2, type: 'triangle', gain: 0.2, delay: 0.5, pan: p }); noise({ dur: 0.2, f: 2000, gain: 0.5, delay: 0.5, pan: p }); },
    piano: (p) => { whoosh({ dur: 0.6, gain: 0.3, pan: p }); for (const f of [65, 82, 98, 130, 155, 196, 233, 277, 330, 415]) tone({ f, dur: 1.6, type: 'triangle', gain: 0.12, delay: 0.7 + Math.random() * 0.03, pan: p }); noise({ dur: 0.3, f: 800, f2: 100, gain: 0.6, delay: 0.7, pan: p }); },
    buzz: (p) => { tone({ f: 220, dur: 3, type: 'sawtooth', gain: 0.15, vib: 30, vibRate: 7, filter: 'bandpass', ff: 900, pan: p }); tone({ f: 233, dur: 3, type: 'square', gain: 0.08, vib: 25, vibRate: 5, pan: p }); },
    zap: (p) => { noise({ dur: 0.3, f: 6000, f2: 500, type: 'highpass', gain: 0.6, pan: p }); tone({ f: 2000, f2: 100, dur: 0.3, type: 'sawtooth', gain: 0.3, pan: p }); boom({ pan: p }); },
    moo: (p) => { voice({ f: 150, f2: 110, dur: 1.1, formants: [500, 900], vib: 6, vibRate: 4, gain: 0.3, pan: p }); },
    yowl: (p) => { voice({ f: 700, f2: 400, dur: 0.9, formants: [1000, 2600], vib: 50, vibRate: 8, gain: 0.22, pan: p }); },
    sneeze: (p) => { voice({ f: 400, f2: 700, dur: 0.35, formants: [700, 2000], gain: 0.2, pan: p }); noise({ dur: 0.3, f: 2000, f2: 400, gain: 0.7, delay: 0.35, pan: p }); voice({ f: 300, f2: 150, dur: 0.4, formants: [500, 1300], gain: 0.25, delay: 0.35, pan: p }); },
    ray: (p) => { tone({ f: 2400, f2: 200, dur: 0.9, type: 'square', gain: 0.2, vib: 200, vibRate: 30, pan: p }); },
    legos: (p) => { for (let i = 0; i < 25; i++) clicks(1, 0, { f: 2500 + Math.random() * 3000, gain: 0.3, delay: Math.random() * 0.6, pan: p }); scream({ f: 600, f2: 300, dur: 0.5, delay: 0.6, pan: p }); },
    porcupine: (p) => { noise({ dur: 0.25, f: 3000, f2: 300, gain: 0.7, pan: p }); voice({ f: 500, f2: 800, dur: 0.3, formants: [1200, 2500], gain: 0.15, pan: p }); },
    stomp: (p) => { whoosh({ dur: 0.4, gain: 0.3, pan: p }); noise({ dur: 0.5, f: 300, f2: 40, gain: 0.9, delay: 0.45, pan: p }); tone({ f: 60, f2: 25, dur: 0.6, type: 'sine', gain: 0.7, delay: 0.45, pan: p }); },
    gravy: (p) => { noise({ dur: 1.2, f: 400, f2: 150, gain: 0.5, q: 1, pan: p }); tone({ f: 120, f2: 70, dur: 0.8, type: 'sine', gain: 0.3, vib: 20, vibRate: 9, pan: p }); },
    skunk: (p) => { noise({ dur: 0.6, f: 2500, f2: 800, type: 'highpass', gain: 0.3, pan: p }); voice({ f: 200, f2: 160, dur: 0.5, formants: [600, 1800], gain: 0.12, delay: 0.5, pan: p }); },
    meteor: (p) => { noise({ dur: 0.8, f: 200, f2: 4000, type: 'bandpass', q: 1, gain: 0.4, pan: p }); setTimeout(() => running && boom({ pan: p }), 800); },
    paper: (p) => { for (let i = 0; i < 20; i++) noise({ dur: 0.08, f: 5000, type: 'highpass', gain: 0.2, delay: Math.random() * 1.2, pan: p }); },
    nitrogen: (p) => { noise({ dur: 1.2, f: 4000, f2: 6000, type: 'highpass', gain: 0.4, pan: p }); clicks(6, 0.08, { f: 4000, gain: 0.3, delay: 1.2, pan: p }); },
    honk: (p) => { for (let i = 0; i < 3; i++) voice({ f: 330, f2: 300, dur: 0.22, formants: [800, 1600], gain: 0.28, delay: i * 0.35, pan: p }); },
    catbag: (p) => { for (let i = 0; i < 4; i++) voice({ f: 600 + i * 80, f2: 400, dur: 0.6, formants: [1000, 2600], vib: 50, vibRate: 8, gain: 0.14, delay: 0.5 + i * 0.12, pan: p }); noise({ dur: 0.3, f: 800, gain: 0.3, delay: 0.5, pan: p }); },
    cannon: (p) => { boom({ pan: p }); noise({ dur: 0.3, f: 2000, f2: 200, gain: 0.5, pan: p }); },
    swat: (p) => { whoosh({ dur: 0.25, gain: 0.4, pan: p }); noise({ dur: 0.12, f: 1500, f2: 300, gain: 0.7, delay: 0.2, pan: p }); },
    slaps: (p) => { for (let i = 0; i < 40; i++) noise({ dur: 0.04, f: 1200, f2: 400, gain: 0.35, delay: i * 0.045, pan: p }); },
    sizzle: (p) => { noise({ dur: 1.5, f: 5000, f2: 3000, type: 'highpass', gain: 0.3, pan: p }); tone({ f: 700, dur: 0.3, type: 'sine', gain: 0.15, delay: 0.1, pan: p }); },
    curse: (p) => { for (let i = 0; i < 5; i++) { tone({ f: 120 - i * 10, f2: 60, dur: 0.18, type: 'sawtooth', gain: 0.3, delay: i * 0.22, filter: 'lowpass', ff: 500, pan: p }); noise({ dur: 0.15, f: 400, f2: 100, gain: 0.35, delay: i * 0.22 + 0.05, pan: p }); } },
    vending: (p) => { whoosh({ dur: 0.5, gain: 0.3, pan: p }); noise({ dur: 0.4, f: 500, f2: 60, gain: 0.8, delay: 0.55, pan: p }); for (let i = 0; i < 6; i++) clicks(1, 0, { f: 1800, gain: 0.3, delay: 0.7 + i * 0.1, pan: p }); tone({ f: 880, dur: 0.15, type: 'square', gain: 0.15, delay: 1.3, pan: p }); },
    sumo: (p) => { voice({ f: 120, f2: 90, dur: 0.8, formants: [500, 1000], gain: 0.35, pan: p }); thud({ pan: p }); },
    piledriver: (p) => { for (let i = 0; i < 4; i++) { noise({ dur: 0.2, f: 300, f2: 60, gain: 0.8, delay: i * 0.18, pan: p }); tone({ f: 70, f2: 30, dur: 0.2, type: 'square', gain: 0.4, delay: i * 0.18, pan: p }); } },
    drill: (p) => { tone({ f: 2800, dur: 1.6, type: 'sawtooth', gain: 0.15, vib: 300, vibRate: 3, pan: p }); tone({ f: 5600, dur: 1.6, type: 'square', gain: 0.05, pan: p }); },
    whine: (p) => { tone({ f: 800, dur: 2.5, type: 'sawtooth', gain: 0.08, vib: 120, vibRate: 2.5, filter: 'bandpass', ff: 1200, fq: 4, pan: p }); },
    doll: (p) => { seq([[880, 0.4, 0.5], [1047, 0.4, 0.5], [880, 0.4, 0.5], [740, 0.8, 0.9]], { type: 'sine', gain: 0.15, pan: p }); noise({ dur: 2, f: 200, f2: 100, gain: 0.1, pan: p }); },
    bus: (p) => { tone({ f: 60, dur: 2, type: 'sawtooth', gain: 0.25, filter: 'lowpass', ff: 300, pan: p }); noise({ dur: 2, f: 150, f2: 300, gain: 0.4, a: 0.3, pan: p }); for (const f of [370, 440]) tone({ f, dur: 0.6, type: 'square', gain: 0.12, delay: 0.3, pan: p }); noise({ dur: 0.6, f: 3000, f2: 2000, type: 'highpass', gain: 0.3, delay: 1.2, pan: p }); },
    cart: (p) => { for (let i = 0; i < 12; i++) noise({ dur: 0.06, f: 3000, f2: 1500, type: 'bandpass', q: 4, gain: 0.25, delay: i * 0.13, pan: p }); tone({ f: 900, f2: 1100, dur: 1.4, type: 'sine', gain: 0.05, vib: 60, vibRate: 8, pan: p }); },
    bowling: (p) => { noise({ dur: 1.4, f: 150, f2: 250, gain: 0.35, a: 0.05, pan: p }); for (let i = 0; i < 10; i++) noise({ dur: 0.1, f: 1500 + Math.random() * 1000, type: 'bandpass', q: 2, gain: 0.4, delay: 1.3 + Math.random() * 0.35, pan: p }); },
    jackbox: (p) => { seq([[523, 0.12], [587, 0.12], [659, 0.12], [523, 0.12], [659, 0.12], [784, 0.3, 0.4]], { type: 'square', gain: 0.12, pan: p }); noise({ dur: 0.2, f: 2000, f2: 400, gain: 0.5, delay: 1.0, pan: p }); scream({ f: 900, f2: 300, dur: 0.6, delay: 1.0, pan: p }); },
    frogs: (p) => { for (let i = 0; i < 12; i++) voice({ f: 150 + Math.random() * 100, f2: 120, dur: 0.15, formants: [400, 1200], gain: 0.14, delay: Math.random() * 1.4, pan: p }); },
    trombone: (p) => { seq([[196, 0.5, 0.55], [185, 0.5, 0.55], [175, 0.5, 0.55]], { type: 'sawtooth', gain: 0.18, pan: p, extra: { filter: 'lowpass', ff: 1400, vib: 6, vibRate: 5 } }); tone({ f: 165, f2: 140, dur: 1.4, type: 'sawtooth', gain: 0.18, delay: 1.65, filter: 'lowpass', ff: 1400, vib: 8, vibRate: 5, pan: p }); },
    grandma: (p) => { voice({ f: 260, f2: 380, dur: 0.5, formants: [700, 2200], vib: 12, vibRate: 6, gain: 0.18, pan: p }); voice({ f: 380, f2: 240, dur: 0.6, formants: [700, 2200], vib: 12, vibRate: 6, gain: 0.18, delay: 0.55, pan: p }); },
    tent: (p) => { noise({ dur: 1.4, f: 300, f2: 1200, type: 'bandpass', q: 0.6, gain: 0.5, a: 0.3, pan: p }); seq([[392, 0.2], [523, 0.2], [659, 0.2], [784, 0.5]], { type: 'square', gain: 0.1, delay: 0.1, pan: p }); noise({ dur: 0.6, f: 500, f2: 80, gain: 0.7, delay: 1.4, pan: p }); },
    balloon: (p) => { noise({ dur: 0.3, f: 800, f2: 1600, type: 'bandpass', q: 3, gain: 0.15, pan: p }); setTimeout(() => running && noise({ dur: 0.12, f: 3000, f2: 500, gain: 0.9, pan: p }), 1400); },
    dryer: (p) => { noise({ dur: 1.6, f: 900, f2: 1200, type: 'bandpass', q: 0.6, gain: 0.35, a: 0.2, pan: p }); tone({ f: 180, dur: 1.6, type: 'sawtooth', gain: 0.08, a: 0.2, filter: 'lowpass', ff: 700, pan: p }); },
    rose: (p) => { seq([[523, 0.3, 0.32], [659, 0.3, 0.32], [784, 0.7]], { type: 'sine', gain: 0.14, pan: p }); },
    potion: (p) => { tone({ f: 600, f2: 1500, dur: 0.5, type: 'sine', gain: 0.2, pan: p }); for (let i = 0; i < 5; i++) tone({ f: 1200 + i * 200, dur: 0.15, type: 'sine', gain: 0.1, delay: 0.5 + i * 0.1, pan: p }); },
    mirror: (p) => { tone({ f: 2200, dur: 0.6, type: 'sine', gain: 0.12, pan: p }); noise({ dur: 0.1, f: 5000, type: 'highpass', gain: 0.2, delay: 0.3, pan: p }); },
    swap: (p) => { tone({ f: 300, f2: 1800, dur: 0.25, type: 'square', gain: 0.15, pan: p }); tone({ f: 1800, f2: 300, dur: 0.25, type: 'square', gain: 0.15, delay: 0.25, pan: p }); },
    ring: (p) => { tone({ f: 2400, dur: 1.2, type: 'sine', gain: 0.15, pan: p }); tone({ f: 3600, dur: 0.8, type: 'sine', gain: 0.08, delay: 0.05, pan: p }); },
    paw: (p) => { noise({ dur: 1.2, f: 300, f2: 100, gain: 0.25, pan: p }); tone({ f: 200, f2: 150, dur: 1.2, type: 'sine', gain: 0.15, vib: 10, vibRate: 3, pan: p }); },
    audit: (p) => { noise({ dur: 0.3, f: 4000, type: 'highpass', gain: 0.2, pan: p }); for (let i = 0; i < 3; i++) clicks(4, 0.06, { f: 2500, gain: 0.2, delay: 0.5 + i * 0.5, pan: p }); },
    wetwilly: (p) => { noise({ dur: 0.25, f: 1500, f2: 3000, type: 'bandpass', q: 3, gain: 0.3, pan: p }); voice({ f: 400, f2: 800, dur: 0.3, formants: [900, 2200], gain: 0.15, delay: 0.25, pan: p }); },
    cupcake: (p) => { voice({ f: 200, f2: 180, dur: 0.25, formants: [500, 1400], gain: 0.15, pan: p }); noise({ dur: 0.15, f: 600, gain: 0.2, delay: 0.3, pan: p }); },
    karaoke: (p) => { seq([[440, 0.25], [494, 0.25], [523, 0.25], [587, 0.5], [523, 0.25], [494, 0.5]], { type: 'square', gain: 0.1, pan: p }); voice({ f: 330, f2: 350, dur: 1.6, formants: [700, 2000], vib: 15, vibRate: 5.5, gain: 0.12, delay: 0.3, pan: p }); },
    rifle: (p) => { clicks(3, 0.05, { f: 2000, gain: 0.3, pan: p }); tone({ f: 600, f2: 1200, dur: 0.3, type: 'square', gain: 0.1, pan: p }); },
    mother: (p) => { voice({ f: 220, f2: 180, dur: 1.4, formants: [600, 1800], vib: 4, vibRate: 3, gain: 0.18, pan: p }); },
    bagpipes: (p) => { tone({ f: 233, dur: 2.5, type: 'sawtooth', gain: 0.12, a: 0.3, filter: 'lowpass', ff: 2000, pan: p }); tone({ f: 116, dur: 2.5, type: 'sawtooth', gain: 0.1, a: 0.3, filter: 'lowpass', ff: 1500, pan: p }); seq([[466, 0.3], [523, 0.3], [587, 0.3], [523, 0.3], [466, 0.6]], { type: 'sawtooth', gain: 0.1, delay: 0.4, pan: p, extra: { filter: 'lowpass', ff: 2200 } }); },
    flop: (p) => { noise({ dur: 0.15, f: 600, f2: 200, gain: 0.3, delay: 0.4, pan: p }); noise({ dur: 0.12, f: 500, f2: 200, gain: 0.2, delay: 0.7, pan: p }); },
    confetti: (p) => { noise({ dur: 0.3, f: 2000, f2: 5000, type: 'highpass', gain: 0.2, pan: p }); tone({ f: 1500, dur: 0.1, type: 'square', gain: 0.1, pan: p }); },
    flag: (p) => { noise({ dur: 0.2, f: 500, f2: 2000, type: 'bandpass', q: 1, gain: 0.25, pan: p }); tone({ f: 200, dur: 0.1, type: 'square', gain: 0.1, delay: 0.2, pan: p }); },
    feather: (p) => { noise({ dur: 0.4, f: 2000, f2: 4000, type: 'bandpass', q: 3, gain: 0.08, pan: p }); },
    cookie: (p) => { clicks(2, 0.1, { f: 1500, gain: 0.3, delay: 0.7, pan: p }); noise({ dur: 0.1, f: 3000, type: 'highpass', gain: 0.2, delay: 0.9, pan: p }); },
    cough: (p) => { voice({ f: 180, f2: 120, dur: 0.2, formants: [500, 1400], gain: 0.25, pan: p }); voice({ f: 160, f2: 110, dur: 0.25, formants: [500, 1400], gain: 0.25, delay: 0.25, pan: p }); noise({ dur: 0.12, f: 400, gain: 0.2, delay: 0.55, pan: p }); },
    sorry: (p) => { voice({ f: 260, f2: 200, dur: 0.5, formants: [600, 1800], vib: 6, vibRate: 4, gain: 0.12, pan: p }); voice({ f: 220, f2: 170, dur: 0.6, formants: [600, 1800], vib: 6, vibRate: 4, gain: 0.12, delay: 0.55, pan: p }); },
    receipt: (p) => { for (let i = 0; i < 12; i++) clicks(1, 0, { f: 3500, gain: 0.2, delay: i * 0.05, pan: p }); noise({ dur: 0.5, f: 2000, f2: 4000, type: 'highpass', gain: 0.12, pan: p }); },
    glitter: (p) => { for (let i = 0; i < 8; i++) tone({ f: 2000 + Math.random() * 3000, dur: 0.2, type: 'sine', gain: 0.06, delay: Math.random() * 0.4, pan: p }); },
    click: (p) => clicks(1, 0, { f: 2500, gain: 0.35, pan: p }),
    hum: (p) => tone({ f: 220, dur: 1.2, type: 'sine', gain: 0.08, vib: 3, vibRate: 5, pan: p }),
    boomerang: (p) => { for (let i = 0; i < 12; i++) whoosh({ dur: 0.2, gain: 0.15, pan: p }); },
    hiccup: (p) => { voice({ f: 300, f2: 600, dur: 0.12, formants: [700, 2000], gain: 0.25, pan: p }); tone({ f: 800, f2: 2400, dur: 0.15, type: 'sine', gain: 0.12, delay: 0.1, pan: p }); },
    playdead: (p) => { tone({ f: 400, f2: 80, dur: 0.8, type: 'sawtooth', gain: 0.15, filter: 'lowpass', ff: 900, pan: p }); },
    spin: (p) => { tone({ f: 400, dur: 1.2, type: 'sine', gain: 0.12, vib: 300, vibRate: 4, pan: p }); },
  };

  // ---- recipes: the game -------------------------------------------------------------------------
  const K = {
    pull: () => { clicks(1, 0, { f: 1200, gain: 0.5 }); noise({ dur: 0.08, f: 400, f2: 200, gain: 0.3 }); },
    reel: (dur) => { const n = Math.floor(dur / 0.045); for (let i = 0; i < n; i++) clicks(1, 0, { f: 2400 - i * 20, gain: 0.12, delay: i * 0.045 }); },
    reveal: (tier) => { if (tier === 'dispatch') tone({ f: 660, f2: 990, dur: 0.12, type: 'square', gain: 0.1 }); else if (tier === 'dud') tone({ f: 330, f2: 220, dur: 0.25, type: 'sawtooth', gain: 0.08, filter: 'lowpass', ff: 800 }); else if (tier === 'backfire') { tone({ f: 200, f2: 90, dur: 0.3, type: 'square', gain: 0.12 }); } else tone({ f: 500, f2: 700, dur: 0.15, type: 'triangle', gain: 0.1 }); },
    notice: (p) => { const f = 500 + Math.random() * 300; for (let i = 0; i < 3; i++) voice({ f: f, f2: f * 1.2, dur: 0.12, formants: [800, 2200], gain: 0.14, delay: i * 0.14, pan: p }); },
    swing: (p) => whoosh({ dur: 0.25, gain: 0.3, pan: p }),
    hurt: () => { voice({ f: 180, f2: 120, dur: 0.3, formants: [600, 1500], gain: 0.25 }); noise({ dur: 0.15, f: 600, f2: 200, gain: 0.3 }); },
    throw: (p) => whoosh({ dur: 0.3, gain: 0.25, pan: p }),
    key: () => { seq([[1568, 0.08], [2093, 0.08], [2637, 0.25]], { type: 'sine', gain: 0.15 }); noise({ dur: 0.15, f: 6000, type: 'highpass', gain: 0.1 }); },
    door: () => { noise({ dur: 1.2, f: 200, f2: 900, type: 'bandpass', q: 3, gain: 0.25 }); tone({ f: 90, f2: 110, dur: 1.2, type: 'sawtooth', gain: 0.08, filter: 'lowpass', ff: 400 }); clicks(2, 0.15, { f: 800, gain: 0.3, delay: 1.1 }); },
    level: () => { seq([[392, 0.15], [523, 0.15], [659, 0.15], [784, 0.4]], { type: 'square', gain: 0.1 }); },
    death: () => { seq([[392, 0.4, 0.45], [370, 0.4, 0.45], [349, 0.4, 0.45]], { type: 'sawtooth', gain: 0.15, extra: { filter: 'lowpass', ff: 1400, vib: 6, vibRate: 5 } }); tone({ f: 330, f2: 200, dur: 1.6, type: 'sawtooth', gain: 0.15, delay: 1.35, filter: 'lowpass', ff: 1400, vib: 8, vibRate: 5 }); },
    win: () => { seq([[523, 0.15], [659, 0.15], [784, 0.15], [1047, 0.5, 0.6], [784, 0.15], [1047, 0.8]], { type: 'square', gain: 0.12 }); noise({ dur: 1.5, f: 3000, type: 'highpass', gain: 0.1, delay: 0.6 }); },
    cleared: () => { seq([[659, 0.12], [784, 0.12], [1047, 0.4]], { type: 'triangle', gain: 0.14 }); },
    bosswind: (p) => { tone({ f: 200, f2: 1200, dur: 0.55, type: 'sawtooth', gain: 0.15, filter: 'lowpass', ff: 2000, pan: p }); },
    bosshit: (p) => { voice({ f: 140, f2: 90, dur: 0.6, formants: [500, 1100], vib: 20, vibRate: 8, gain: 0.35, pan: p }); },
    bossdead: () => { voice({ f: 160, f2: 40, dur: 3, formants: [500, 1100], vib: 30, vibRate: 6, gain: 0.35 }); boom(); },
    fall: () => { noise({ dur: 0.7, f: 2000, f2: 200, type: 'bandpass', q: 1, gain: 0.3 }); tone({ f: 600, f2: 100, dur: 0.7, type: 'sine', gain: 0.2 }); thud(); },
    splat: (p) => splat({ pan: p }),
    bounce: (p) => tone({ f: 300, f2: 500, dur: 0.1, type: 'square', gain: 0.1, pan: p }),
    wallbreak: (p) => { noise({ dur: 0.4, f: 800, f2: 100, gain: 0.7, pan: p }); for (let i = 0; i < 5; i++) noise({ dur: 0.1, f: 1000 + Math.random() * 2000, type: 'bandpass', q: 2, gain: 0.3, delay: 0.1 + Math.random() * 0.3, pan: p }); },
    boom: (p) => boom({ pan: p }),
    pop: (p) => noise({ dur: 0.12, f: 3000, f2: 500, gain: 0.8, pan: p }),
    drift: () => { tone({ f: 200, f2: 1600, dur: 1.2, type: 'sine', gain: 0.15 }); noise({ dur: 1.2, f: 500, f2: 4000, type: 'bandpass', q: 1, gain: 0.15 }); },
    driftpush: () => { noise({ dur: 0.2, f: 200, f2: 400, type: 'bandpass', q: 3, gain: 0.15 }); },
    pacify: (p) => seq([[784, 0.1], [988, 0.1], [1175, 0.25]], { type: 'sine', gain: 0.1, pan: p }),
    heart: () => { tone({ f: 55, f2: 40, dur: 0.15, type: 'sine', gain: 0.5 }); tone({ f: 50, f2: 38, dur: 0.18, type: 'sine', gain: 0.4, delay: 0.2 }); },
    ringing: () => tone({ f: 3200, dur: 2.5, type: 'sine', gain: 0.05, a: 0.05, r: 1.5 }),
  };
  // the outcome tags: a short sting per way of going
  const O = {
    squash: (p) => { thud({ pan: p }); tone({ f: 900, f2: 300, dur: 0.15, type: 'square', gain: 0.1, pan: p }); },
    freeze: (p) => { clicks(5, 0.06, { f: 4000, gain: 0.25, pan: p }); noise({ dur: 0.3, f: 3000, f2: 1000, gain: 0.3, delay: 1.3, pan: p }); },
    glue: (p) => { noise({ dur: 0.6, f: 800, f2: 200, gain: 0.3, pan: p }); scream({ f: 400, f2: 300, dur: 0.8, gain: 0.12, pan: p }); },
    gas: (p) => { voice({ f: 300, f2: 150, dur: 0.6, formants: [700, 1900], vib: 15, vibRate: 7, gain: 0.15, pan: p }); },
    fling: (p) => { scream({ f: 600, f2: 900, dur: 0.6, gain: 0.15, pan: p }); },
    drop: (p) => { scream({ f: 500, f2: 120, dur: 1.2, gain: 0.15, pan: p }); },
    burn: (p) => { scream({ f: 700, f2: 300, dur: 0.7, gain: 0.15, pan: p }); noise({ dur: 1, f: 1200, f2: 600, type: 'bandpass', gain: 0.2, pan: p }); },
    chew: (p) => { scream({ f: 600, f2: 350, dur: 0.5, gain: 0.15, pan: p }); },
    gib: (p) => { splat({ pan: p }); noise({ dur: 0.4, f: 900, f2: 200, gain: 0.5, pan: p }); },
    vapor: (p) => { tone({ f: 1500, f2: 4000, dur: 0.3, type: 'sine', gain: 0.15, pan: p }); },
    expire: (p) => { voice({ f: 250, f2: 180, dur: 0.5, formants: [600, 1600], vib: 8, vibRate: 5, gain: 0.18, pan: p }); voice({ f: 180, f2: 100, dur: 0.9, formants: [600, 1600], gain: 0.15, delay: 0.7, pan: p }); },
    shrink: (p) => { voice({ f: 300, f2: 1400, dur: 1.4, formants: [900, 2400], gain: 0.12, pan: p }); },
    smother: (p) => { voice({ f: 250, f2: 150, dur: 0.6, formants: [400, 900], gain: 0.15, pan: p }); },
    inflate: (p) => { tone({ f: 200, f2: 700, dur: 1.8, type: 'sine', gain: 0.12, pan: p }); noise({ dur: 0.15, f: 3000, f2: 500, gain: 0.9, delay: 1.9, pan: p }); },
    pacify: (p) => K.pacify(p),
  };

  // ---- the bed: a calliope waltz that drags, over a drone ----------------------------------------
  function startBed() {
    if (bedTimer || !ctx) return;
    bedStep = 0; bedNext = ctx.currentTime + 0.1;
    // the drone
    const d = ctx.createOscillator(); d.type = 'sawtooth'; d.frequency.value = 36.7;
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 140;
    const dg = ctx.createGain(); dg.gain.value = 0.35;
    d.connect(df); df.connect(dg); dg.connect(bedGain); d.start();
    bedTimer = setInterval(scheduleBed, 120);
    bedTimer.drone = d;
  }
  function stopBed() {
    if (!bedTimer) return;
    try { bedTimer.drone.stop(); } catch (e) {}
    clearInterval(bedTimer); bedTimer = null;
  }
  // the dungeon bed: over the drone, water drips, a chain shifts somewhere, and now and then something
  // far away moans. Nothing keeps time. (The calliope that used to live here is gone for good.)
  function bedEvent(t0) {
    const r = Math.random();
    const into = (g) => { g.connect(bedGain); };
    if (r < 0.55) {
      // a drip: a short high ping with a soft body, panned somewhere
      const f = 1800 + Math.random() * 1600;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.55, t0 + 0.12);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = Math.random() * 1.6 - 0.8;
      o.connect(g); if (p) { g.connect(p); into(p); } else into(g);
      o.start(t0); o.stop(t0 + 0.25);
    } else if (r < 0.8) {
      // a chain shifting: a few metallic clicks, ringing
      for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
        const tt = t0 + i * (0.05 + Math.random() * 0.08);
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 900 + Math.random() * 1500;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.frequency.value * 2; bp.Q.value = 12;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.25, tt + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25);
        o.connect(bp); bp.connect(g); into(g); o.start(tt); o.stop(tt + 0.3);
      }
    } else if (r < 0.92) {
      // a far moan: a slow voice-ish swell, very quiet
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90 + Math.random() * 60, t0); o.frequency.linearRampToValueAtTime(70 + Math.random() * 40, t0 + 2.5);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500; f1.Q.value = 5;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
      o.connect(f1); f1.connect(g); into(g); o.start(t0); o.stop(t0 + 2.7);
    } else {
      // a low wooden thud somewhere behind a wall
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(35, t0 + 0.3);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      o.connect(g); into(g); o.start(t0); o.stop(t0 + 0.45);
    }
  }
  function scheduleBed() {
    if (!ctx || !running) return;
    while (bedNext < ctx.currentTime + 0.5) {
      bedEvent(bedNext);
      bedNext += 1.5 + Math.random() * 5;
      bedStep++;
    }
  }
  function setBedLevel(v) { if (bedGain && ctx) bedGain.gain.setTargetAtTime(v, ctx.currentTime, 0.4); }

  // ---- file-backed one-shots (ElevenLabs, made at authoring time into assets/audio/sfx/) ---------------
  // A sound id maps to a file name; a file that is missing or not yet checked falls back to the recipe above,
  // so the world is never silent and works from file:// (media elements, no fetch).
  const scriptBase = (document.currentScript && document.currentScript.src) ? new URL('./', document.currentScript.src).href : './';
  const SFX_DIR = scriptBase + 'assets/audio/sfx/';
  const FILES = {
    gunshot: 'gunshot', rocket: 'explosion', boom: 'explosion', cannon: 'explosion', meteor: 'explosion', splat: 'splat', chomp: 'chomp',
    hurt: ['hurt1', 'hurt2'], death: 'death', swing: 'swing', throw: 'throw', chainsaw: 'chainsaw', train: 'train', moo: 'moo', honk: 'honk',
    yowl: 'yowl', sneeze: 'sneeze', thud: 'thud', clang: 'clang', zap: 'zap', hiss: 'hiss', key: 'key', door: 'door', wallbreak: 'wallbreak',
    fall: 'fall', buzz: 'buzz', screech: 'screech', pop: 'pop', win: 'win', bosswind: 'bossroar', bosshit: 'bosshit', bossdead: 'bossdie',
    flame: 'burn', lava: 'burn', nitrogen: 'freeze', hose: 'glue', jello: 'glue', gravy: 'glue', crash: 'explosion', catbag: 'yowl',
  };
  const NOTICE = { ghoul: 'ghoul', brute: 'brute', ratling: 'ratling', cultist: 'cultist', stalker: 'stalker', jabberwock: 'bossroar' };
  const OUT_FILES = { gib: 'gib', squash: 'squash', freeze: 'freeze', glue: 'glue', burn: 'burn', fling: 'scream', drop: 'scream', expire: 'scream', chew: 'chomp', inflate: 'pop', smother: 'glue' };
  const available = new Set();
  let preflighted = false;
  function preflight() {
    if (preflighted) return; preflighted = true;
    const names = new Set();
    for (const v of Object.values(FILES)) (Array.isArray(v) ? v : [v]).forEach((n) => names.add(n));
    for (const v of Object.values(NOTICE)) names.add(v);
    for (const v of Object.values(OUT_FILES)) names.add(v);
    for (const n of names) {
      const a = new Audio(); a.preload = 'auto';
      a.addEventListener('canplaythrough', () => available.add(n), { once: true });
      a.src = SFX_DIR + n + '.mp3';
    }
  }
  function playFile(name, pan) {
    if (!available.has(name)) return false;
    const a = new Audio(SFX_DIR + name + '.mp3');
    try { const src = ctx.createMediaElementSource(a); const g = ctx.createGain(); g.gain.value = 0.9; src.connect(g); out(g, pan); } catch (e) { a.volume = volume; }
    a.play().catch(() => {});
    return true;
  }
  function play(id, pan, variant) {
    if (!running || !ctx) return;
    let f = id === 'notice' && variant ? NOTICE[variant] : FILES[id];
    if (Array.isArray(f)) f = f[Math.floor(Math.random() * f.length)];
    if (f && playFile(f, pan)) return;
    const fn = R[id] || K[id];
    if (fn) { try { fn(pan); } catch (e) { /* a recipe with a bad note is not a crash */ } }
  }
  function outcome(id, pan) {
    if (!running || !ctx) return;
    if (OUT_FILES[id] && playFile(OUT_FILES[id], pan)) return;
    const fn = O[id]; if (fn) { try { fn(pan); } catch (e) {} }
  }
  // ---- music: a track James drops in as assets/audio/theme.mp3 (Suno), looped under everything ------------
  let musicEl = null, musicGain = null, musicLevel = 0.22;   // low out of the box (James); the music slider on the speaker raises it
  function startMusic() {
    if (musicEl || !ctx) return;
    musicEl = new Audio(scriptBase + 'assets/audio/theme.mp3'); musicEl.loop = true; musicEl.preload = 'auto';
    musicEl.addEventListener('error', () => { musicEl = null; }, { once: true });
    try { const src = ctx.createMediaElementSource(musicEl); musicGain = ctx.createGain(); musicGain.gain.value = musicLevel; src.connect(musicGain); musicGain.connect(comp); } catch (e) { musicEl.volume = musicLevel; }
    musicEl.play().catch(() => {});
  }
  function stopMusic() { if (musicEl) { try { musicEl.pause(); } catch (e) {} } }
  function setMusicVolume(v) { musicLevel = v; if (musicGain && ctx) musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05); else if (musicEl) musicEl.volume = v; }
  function reel(dur) { if (!running || !ctx) return; K.reel(dur); }
  function reveal(tier) { if (!running || !ctx) return; K.reveal(tier); }

  globalThis.JabberwockySfx = { start, stop, setVolume, play, outcome, reel, reveal, setBedLevel, setMusicVolume, get musicLevel() { return musicLevel; }, recipes: R, game: K, outcomes: O, files: FILES, get available() { return available; }, get running() { return running; } };
})();
