// The Reich Machine — engine core. Pure: no DOM, no audio, no timers. Runs in Node for the
// sim and in the browser for the player. Everything the machine IS lives here: tracks, the
// step grid, the master clock, per-track rate (the drift), pull-to-grid, hold, nudge, the
// scale/chord quantizer, the microtonal line.
//
// Time model: master time advances in seconds. Each track carries a phase in STEPS
// (fractional). Its rate is a multiplier on the master step rate; a rate of 1.01 gains one
// step on the master every hundred steps. Every time the phase crosses an integer the track
// fires that step. Two tracks with different rates drift past each other and that is the
// whole piece.
(function (root) {
  'use strict';

  // ---- pitch material -------------------------------------------------------------------
  const SCALES = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'natural minor': [0, 2, 3, 5, 7, 8, 10],
    'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
    'melodic minor': [0, 2, 3, 5, 7, 9, 11],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'locrian': [0, 1, 3, 5, 6, 8, 10],
    'major pentatonic': [0, 2, 4, 7, 9],
    'minor pentatonic': [0, 3, 5, 7, 10],
    'blues': [0, 3, 5, 6, 7, 10],
    'whole tone': [0, 2, 4, 6, 8, 10],
    'octatonic (half-whole)': [0, 1, 3, 4, 6, 7, 9, 10],
    'octatonic (whole-half)': [0, 2, 3, 5, 6, 8, 9, 11],
    'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'hirajoshi': [0, 2, 3, 7, 8],
    'in sen': [0, 1, 5, 7, 10],
    'iwato': [0, 1, 5, 6, 10],
    'pelog (approx.)': [0, 1, 3, 7, 8],
    'hungarian minor': [0, 2, 3, 6, 7, 8, 11],
    'double harmonic': [0, 1, 4, 5, 7, 8, 11],
    'phrygian dominant': [0, 1, 4, 5, 7, 8, 10],
    'lydian dominant': [0, 2, 4, 6, 7, 9, 10],
    'bebop dominant': [0, 2, 4, 5, 7, 9, 10, 11],
    'prometheus': [0, 2, 4, 6, 9, 10],
    'enigmatic': [0, 1, 4, 6, 8, 10, 11],
  };
  // chords as intervals from the root; "chord mode" restricts the grid rows to chord tones
  const CHORDS = {
    'none (whole scale)': null,
    'major triad': [0, 4, 7],
    'minor triad': [0, 3, 7],
    'diminished': [0, 3, 6],
    'augmented': [0, 4, 8],
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
    'major 7': [0, 4, 7, 11],
    'dominant 7': [0, 4, 7, 10],
    'minor 7': [0, 3, 7, 10],
    'minor major 7': [0, 3, 7, 11],
    'half-diminished': [0, 3, 6, 10],
    'diminished 7': [0, 3, 6, 9],
    'major 6': [0, 4, 7, 9],
    'minor 6': [0, 3, 7, 9],
    'add 9': [0, 2, 4, 7],
    'minor add 9': [0, 2, 3, 7],
    'major 9': [0, 2, 4, 7, 11],
    'dominant 9': [0, 2, 4, 7, 10],
    'minor 9': [0, 2, 3, 7, 10],
    'major 11 (lydian)': [0, 2, 4, 6, 7, 11],
    'dominant 13': [0, 2, 4, 7, 9, 10],
    'power (root + 5th)': [0, 7],
    'quartal': [0, 5, 10],
    'cluster (0 1 2)': [0, 1, 2],
  };
  const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Original figures in scale DEGREES (0 = root of the chosen scale, 7 = an octave up for a
  // seven-note scale — degrees wrap by scale length). null = rest. Written fresh for this
  // machine; nothing quoted.
  const FIGURES = [
    { name: 'rise and settle', steps: [0, 2, 4, 5, 4, 2, 1, 3, 6, 7, 6, 4, 2, 0, null, null] },
    { name: 'skipping', steps: [4, 7, 6, 4, 5, null, 3, 1, 2, null, 0, 2, 4, 6, 5, 3] },
    { name: 'falling', steps: [7, null, 5, 6, 4, null, 2, 3, 1, null, 0, 2, 4, 6, 5, 4] },
    { name: 'twelve (phase figure)', steps: [2, 3, 6, 1, 7, 3, 6, 2, 0, 5, 4, 1] },
    { name: 'five against', steps: [0, 4, 2, 7, 5] },
    { name: 'seven up', steps: [0, 1, 2, 3, 4, 5, 6] },
    { name: 'pendulum', steps: [0, 7, 1, 6, 2, 5, 3, 4] },
    { name: 'stutter', steps: [0, 0, null, 4, 4, null, 2, null] },
    { name: 'thirds', steps: [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7] },
    { name: 'low pulse', steps: [0, null, null, 0, null, null, 0, null] },
  ];

  function scaleNotes(rootPc, scaleName, chordName, lo, hi) {
    // every MIDI note in [lo, hi] that belongs to the scale (or the chord, when chosen)
    const scale = SCALES[scaleName] || SCALES.major;
    const chord = CHORDS[chordName] || null;
    const allowed = new Set((chord || scale).map(i => (i + rootPc) % 12));
    const out = [];
    for (let n = lo; n <= hi; n++) if (allowed.has(n % 12)) out.push(n);
    return out;
  }
  function degreeToMidi(degree, rootPc, scaleName, chordName, baseMidi) {
    // degree 0 = the first scale/chord tone at or above baseMidi; wraps by the set's length
    const set = (CHORDS[chordName] || SCALES[scaleName] || SCALES.major);
    const L = set.length;
    const oct = Math.floor(degree / L), idx = ((degree % L) + L) % L;
    const base = baseMidi + ((rootPc - baseMidi) % 12 + 12) % 12;  // the root at or above baseMidi
    return base + set[idx] + 12 * oct;
  }
  function quantize(midi, rootPc, scaleName, chordName) {
    const set = (CHORDS[chordName] || SCALES[scaleName] || SCALES.major);
    let best = midi, bd = 99;
    for (let d = -6; d <= 6; d++) {
      const n = midi + d;
      if (set.includes((((n - rootPc) % 12) + 12) % 12) && Math.abs(d) < bd) { best = n; bd = Math.abs(d); }
    }
    return best;
  }

  // ---- the machine ----------------------------------------------------------------------
  const DEFAULT_FX = () => ({
    reverb: 0, delayMix: 0, delayTime: 0.375, delayFeedback: 0.35, harmonizer: 0, harmonizerMix: 0,
    compressor: 0, distortion: 0, ringMod: 0, ringHz: 220, envFilter: 0, autoWah: 0, univibe: 0,
  });
  let nextId = 1;

  function makeTrack(opts) {
    const t = {
      id: nextId++,
      voice: 'dx-ep',
      length: 8,                 // steps
      steps: [],                 // [{ n: midi|null, cents: 0, vel: 1 }]
      rate: 1.0,                 // tempo multiplier — THE knob. 1.01 = one percent fast
      pull: 0,                   // 0 = pure tape drift, 1 = Piano Phase (lingers at lock points)
      phase: 0,                  // fractional step position
      nudged: 0,                 // whole steps added by nudge
      gate: 0.6,                 // note length as a fraction of the (effective) step
      gain: 0.8,
      mute: false,
      articulation: 'auto',      // auto | hit | hold
      micro: false,              // the microtonal line: every step carries free cents
      fx: DEFAULT_FX(),
    };
    Object.assign(t, opts || {});
    if (!t.steps.length) t.steps = Array.from({ length: t.length }, () => ({ n: null, cents: 0, vel: 1 }));
    return t;
  }

  function createMachine(init) {
    const m = {
      bpm: 120,
      subdivision: 2,            // steps per beat
      root: 0,                   // pitch class
      scale: 'major',
      chord: 'none (whole scale)',
      hold: false,               // freeze: every track runs at the master rate
      tracks: [],
      time: 0,                   // master seconds since play
      masterPhase: 0,            // master steps (a rate-1 reference)
      playing: false,
    };
    Object.assign(m, init || {});
    return m;
  }

  function stepsPerSecond(m) { return m.bpm / 60 * m.subdivision; }

  // The pull-to-grid law. offset = fractional distance of the track from the master grid
  // (0 = locked). A track with pull > 0 slows its DEVIATION from the master near lock
  // points, so it lingers there, then speeds away through the half-way region. Capped so a
  // track never freezes for good: at pull 1 it still creeps through at 3% of its deviation.
  function effectiveRate(m, t) {
    if (m.hold) return 1;
    const dev = t.rate - 1;
    if (t.pull <= 0 || dev === 0) return t.rate;
    const frac = ((t.phase - m.masterPhase) % 1 + 1) % 1;       // 0..1
    const near = Math.pow(Math.cos(Math.PI * frac), 2);         // 1 at lock, 0 half-way
    const w = Math.min(0.97, t.pull * near);
    return 1 + dev * (1 - w);
  }

  // Advance the machine by dt seconds. Returns the note events that fire inside the
  // window, each with `at` (seconds from the start of the window) and `dur` (seconds).
  function advance(m, dt) {
    const events = [];
    if (!m.playing || dt <= 0) return events;
    const sps = stepsPerSecond(m);
    for (const t of m.tracks) {
      const rate = effectiveRate(m, t);
      const stepDur = 1 / (sps * rate);
      const p0 = t.phase, p1 = p0 + sps * rate * dt;
      for (let k = Math.ceil(p0 - 1e-9); k < p1 - 1e-9; k++) {
        if (k < p0 - 1e-9) continue;
        const at = (k - p0) / (sps * rate);
        const idx = (((k + t.nudged) % t.length) + t.length) % t.length;
        const s = t.steps[idx];
        if (!s || s.n === null || s.n === undefined || t.mute) continue;
        events.push({ track: t.id, step: idx, n: s.n, cents: t.micro ? (s.cents || 0) : 0, vel: s.vel == null ? 1 : s.vel,
          at, dur: Math.max(0.03, stepDur * t.gate), stepDur, voice: t.voice, articulation: t.articulation, gain: t.gain });
      }
      t.phase = p1;
    }
    m.masterPhase += sps * dt;
    m.time += dt;
    events.sort((a, b) => a.at - b.at);
    return events;
  }

  function play(m) { m.playing = true; }
  function stop(m) { m.playing = false; }
  function rewind(m) { m.time = 0; m.masterPhase = 0; for (const t of m.tracks) { t.phase = 0; t.nudged = 0; } }
  function nudge(t, steps) { t.nudged += steps; }
  // the fractional offset of a track from the master grid, in steps, -0.5..0.5
  function offsetOf(m, t) { const f = ((t.phase + t.nudged - m.masterPhase) % 1 + 1) % 1; return f > 0.5 ? f - 1 : f; }
  // whole-step displacement (how many steps ahead of the master the track has drifted)
  function driftSteps(m, t) { return (t.phase + t.nudged - m.masterPhase); }
  // seconds for a track's drift to come full circle (one whole pattern length)
  function cycleSeconds(m, t) { const dev = Math.abs(t.rate - 1); return dev === 0 ? Infinity : t.length / (stepsPerSecond(m) * dev); }

  function setLength(t, L) {
    L = Math.max(1, Math.min(64, Math.round(L)));
    while (t.steps.length < L) t.steps.push({ n: null, cents: 0, vel: 1 });
    t.steps.length = L; t.length = L;
  }
  function fillFigure(m, t, figure, baseMidi) {
    const f = typeof figure === 'string' ? FIGURES.find(x => x.name === figure) : figure;
    if (!f) return;
    setLength(t, f.steps.length);
    t.steps = f.steps.map(d => ({ n: d === null ? null : degreeToMidi(d, m.root, m.scale, m.chord, baseMidi == null ? 60 : baseMidi), cents: 0, vel: 1 }));
  }
  // re-snap every note in every track after a scale/chord change
  function requantize(m) {
    for (const t of m.tracks) for (const s of t.steps) if (s.n != null && !t.micro) s.n = quantize(s.n, m.root, m.scale, m.chord);
  }
  function addTrack(m, opts) { const t = makeTrack(opts); m.tracks.push(t); return t; }
  function removeTrack(m, id) { m.tracks = m.tracks.filter(t => t.id !== id); }

  // serialization for presets / localStorage
  function snapshot(m) {
    return JSON.parse(JSON.stringify({ bpm: m.bpm, subdivision: m.subdivision, root: m.root, scale: m.scale, chord: m.chord,
      tracks: m.tracks.map(t => ({ voice: t.voice, length: t.length, steps: t.steps, rate: t.rate, pull: t.pull, gate: t.gate, gain: t.gain,
        mute: t.mute, articulation: t.articulation, micro: t.micro, fx: t.fx })) }));
  }
  function restore(m, snap) {
    if (!snap) return;
    for (const k of ['bpm', 'subdivision', 'root', 'scale', 'chord']) if (snap[k] !== undefined) m[k] = snap[k];
    m.tracks = (snap.tracks || []).map(t => makeTrack(Object.assign({}, t, { fx: Object.assign(DEFAULT_FX(), t.fx || {}) })));
    rewind(m);
  }

  const api = { SCALES, CHORDS, ROOTS, FIGURES, DEFAULT_FX, scaleNotes, degreeToMidi, quantize, createMachine, makeTrack, addTrack,
    removeTrack, advance, play, stop, rewind, nudge, offsetOf, driftSteps, cycleSeconds, effectiveRate, setLength, fillFigure,
    requantize, snapshot, restore, stepsPerSecond };
  root.ReichEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
