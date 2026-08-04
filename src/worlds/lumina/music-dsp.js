// Lumina — music reactivity DSP: band energies, envelope followers, beat
// detection, and the mod-matrix math. Deliberately DOM-free (no audio nodes,
// no elements) so the exact shipping math runs in a Node sim
// (tmp/lumina/music-sim.mjs) as well as the page. music.js owns the Web
// Audio graph and feeds this raw band energies per frame.
(function () {
  "use strict";

  // Analysis band edges in Hz. "level" and "beat" are derived sources.
  const BANDS = {
    bass: [20, 150],
    lowmid: [150, 600],
    mid: [600, 2400],
    high: [2400, 12000],
  };
  const BAND_NAMES = Object.keys(BANDS);

  // Clock sources (v6, 2026-07-26). Everything above listens to the audio and
  // is therefore LATE — an envelope follower has to hear a hit before it can
  // react. These four are computed from the measured beat grid instead, so
  // they land exactly on the beat with zero detection lag:
  //   pulse  — accent impulse fired by the bar's accent pattern, fast decay
  //   bar    — 0→1 ramp across each bar (resets on the downbeat)
  //   phrase — 0→1 ramp across the phrase (8/16/32 bars)
  //   swing  — alternates 0 and 1 every bar, for call-and-response looks
  const CLOCK_SOURCES = ["pulse", "bar", "phrase", "swing"];
  const SOURCES = BAND_NAMES.concat(["level", "beat"]).concat(CLOCK_SOURCES);

  // Accent patterns over the sixteen sixteenths of a bar. Weights, not flags:
  // a strong downbeat and a light 'and' read very differently.
  const ACCENTS = {
    downbeat:   [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    four:       [1, 0, 0, 0, .7, 0, 0, 0, .85, 0, 0, 0, .7, 0, 0, 0],
    backbeat:   [.4, 0, 0, 0, 1, 0, 0, 0, .4, 0, 0, 0, 1, 0, 0, 0],
    eighths:    [1, 0, .5, 0, .7, 0, .5, 0, .85, 0, .5, 0, .7, 0, .5, 0],
    offbeat:    [0, 0, 1, 0, 0, 0, .8, 0, 0, 0, 1, 0, 0, 0, .8, 0],
    sixteenths: [1, .35, .5, .35, .7, .35, .5, .35, .85, .35, .5, .35, .7, .35, .5, .35],
    gallop:     [1, 0, 0, .6, .8, 0, 0, .6, .9, 0, 0, .6, .8, 0, 0, .6],
    clave:      [1, 0, 0, .8, 0, 0, .9, 0, 0, 0, .85, 0, 0, .8, 0, 0],
    stutter:    [1, 0, 0, 0, 0, 0, 0, 0, .6, 0, .7, 0, .8, 0, .9, 1],
    none:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const ACCENT_NAMES = Object.keys(ACCENTS);

  // Modulation span per target: how far a full-strength source at amount ±100%
  // (master ×1) can push the param from its tuner base, in the param's units.
  // Bounds mirror the field's own slider ranges. Only non-structural params —
  // rows/cols would rebuild DOM every frame and are deliberately absent.
  const TARGETS = {
    speed:     { label: "speed",  span: 5,   min: 0, max: 8 },
    tileSize:  { label: "size",   span: 180, min: 1, max: 300 },
    blur:      { label: "blur",   span: 80,  min: 0, max: 300 },
    spread:    { label: "spread", span: 1.5, min: 0, max: 2 },
    twist:     { label: "twist",  span: 1,   min: 0, max: 1 },
    desync:    { label: "desync", span: 1,   min: 0, max: 1 },
    holdScale: { label: "holds",  span: 2,   min: 0, max: 3 },
    ease:      { label: "ease",   span: 1,   min: 0, max: 1 },
    // v2 structure
    hueShift:  { label: "hue",      span: 1, min: 0, max: 1 },
    displace:  { label: "displace", span: 1, min: 0, max: 1 },
    rotate:    { label: "rotate",   span: 1, min: 0, max: 1 },
    spin:      { label: "spin",     span: 1, min: 0, max: 1 },
    sizePulse: { label: "pulse",    span: 1, min: 0, max: 1 },
    merge:     { label: "merge",    span: 1, min: 0, max: 1 },
    counter:   { label: "counter",  span: 1, min: 0, max: 1 },
    // v2 FX rack
    fxTrails:  { label: "fx trails",  span: 1,   min: 0, max: 1 },
    fxZoom:    { label: "fx zoom",    span: 1,   min: 0, max: 1 },
    fxZoomRot: { label: "fx spin",    span: 1,   min: 0, max: 1 },
    fxPixel:   { label: "fx pixel",   span: 1,   min: 0, max: 1 },
    fxRgb:     { label: "fx rgb",     span: 1,   min: 0, max: 1 },
    fxWarp:    { label: "fx warp",    span: 1,   min: 0, max: 1 },
    fxSlit:    { label: "fx slit",    span: 1,   min: 0, max: 1 },
    fxKaleido: { label: "fx kaleido", span: 0.8, min: 0, max: 1 },
    fxKalRing: { label: "fx kal rings", span: 1, min: 0, max: 1 },
    fxKalSpin: { label: "fx kal spin", span: 0.6, min: 0, max: 1 },
    fxBloom:   { label: "fx bloom",   span: 1,   min: 0, max: 1 },
    fxGrain:   { label: "fx grain",   span: 1,   min: 0, max: 1 },
    fxCrt:     { label: "fx crt",     span: 1,   min: 0, max: 1 },
    fxShutter: { label: "fx shutter", span: 1,   min: 0, max: 1 },
    fxIris:    { label: "fx iris",    span: 1,   min: 0, max: 1 },
    // v3 scene layer (scene/scenePalette are strings — not modulatable)
    sceneMix:   { label: "scene mix",   span: 1,   min: 0, max: 1 },
    sceneTiles: { label: "scene tiles", span: 1,   min: 0, max: 1 },
    sceneSpeed: { label: "scene speed", span: 1.5, min: 0, max: 2 },
    sceneScale: { label: "scene scale", span: 1,   min: 0, max: 1 },
    sceneDrive: { label: "scene drive", span: 1,   min: 0, max: 1 },
    sceneWarp:  { label: "scene warp",  span: 1,   min: 0, max: 1 },
    sceneHue:   { label: "scene hue",   span: 1,   min: 0, max: 1 },
  };

  // Auto-gain: each band normalizes against its own slow-decaying peak, so a
  // quiet mix drives the field as hard as a loud one after a few seconds.
  const PEAK_TAU = 8;      // seconds for the peak to fall to 1/e
  const PEAK_FLOOR = 0.06; // silence never divides by ~zero

  // Beat detector: a bass-band energy spike over its recent average.
  const BEAT_WINDOW = 0.6;   // seconds of history the average looks back over
  const BEAT_REFRACTORY = 0.12; // seconds between beats (fast enough for 16ths)
  const BEAT_GATE = 0.12;    // absolute energy floor — silence can't beat

  const DEFAULTS = {
    master: 1,       // scales every mapping; 0 turns reactivity off
    attack: 0.03,    // band envelope rise, seconds
    release: 0.25,   // band envelope fall, seconds
    beatSense: 0.65, // 0..1, higher fires on smaller spikes
    beatDecay: 0.35, // beat impulse fall, seconds
    accentDecay: 0.13, // grid-locked accent impulse fall, seconds
    rows: [
      { src: "beat",  tgt: "tileSize", amt: 0.55 },
      // Was bass→blur 0.45 until 2026-07-28: on the GL path blur hits the
      // WHOLE canvas scaled by design→screen (~7× at a full-window frame), so
      // any bass = total whiteout ("full blur the moment I press play").
      // mergeSettings migrates the old stored stock row to this one.
      { src: "bass",  tgt: "sizePulse", amt: 0.4 },
      { src: "beat",  tgt: "twist",    amt: 0.4 },
      { src: "mid",   tgt: "spread",   amt: 0.35 },
      { src: "high",  tgt: "desync",   amt: 0.3 },
      { src: "level", tgt: "speed",    amt: 0.25 },
    ],
  };

  // Mean byte energy (0..1) per band from an AnalyserNode spectrum.
  function bandsFromSpectrum(freqData, sampleRate, fftSize) {
    const binHz = sampleRate / fftSize;
    const out = {};
    for (const name of BAND_NAMES) {
      const [lo, hi] = BANDS[name];
      const a = Math.max(0, Math.floor(lo / binHz));
      const b = Math.min(freqData.length - 1, Math.ceil(hi / binHz));
      let sum = 0;
      for (let i = a; i <= b; i++) sum += freqData[i];
      out[name] = b >= a ? sum / ((b - a + 1) * 255) : 0;
    }
    return out;
  }

  // Stateful analyzer: feed raw band energies + dt, get source values in [0,1].
  function create() {
    const peaks = {};
    const envs = {};
    BAND_NAMES.forEach((b) => { peaks[b] = PEAK_FLOOR; envs[b] = 0; });
    let history = [];
    let time = 0;
    let lastBeat = -Infinity;
    let beatEnv = 0;

    function step(raw, dt, s) {
      time += dt;
      const norms = {};
      for (const b of BAND_NAMES) {
        const e = raw[b] || 0;
        peaks[b] = Math.max(e, peaks[b] * Math.exp(-dt / PEAK_TAU), PEAK_FLOOR);
        norms[b] = Math.min(1, e / peaks[b]);
        const tau = norms[b] > envs[b] ? s.attack : s.release;
        envs[b] += (norms[b] - envs[b]) * (1 - Math.exp(-dt / Math.max(tau, 0.005)));
      }

      // Beat detection runs on the normalized bass BEFORE the envelope —
      // the envelope smooths exactly the transients the detector needs.
      const bass = norms.bass;
      history.push({ t: time, e: bass });
      while (history.length && history[0].t < time - BEAT_WINDOW) history.shift();
      let avg = 0;
      for (const h of history) avg += h.e;
      avg /= history.length || 1;
      const thresh = 2.4 - 1.5 * s.beatSense;
      let beat = false;
      if (
        history.length >= 10 &&
        bass > BEAT_GATE &&
        bass > avg * thresh &&
        time - lastBeat > BEAT_REFRACTORY
      ) {
        beat = true;
        lastBeat = time;
        beatEnv = 1;
      } else {
        beatEnv *= Math.exp(-dt / Math.max(s.beatDecay, 0.02));
      }

      const level = (envs.bass + envs.lowmid + envs.mid + envs.high) / 4;
      return {
        sources: {
          bass: envs.bass,
          lowmid: envs.lowmid,
          mid: envs.mid,
          high: envs.high,
          level,
          beat: beatEnv,
        },
        beat,
      };
    }

    return { step };
  }

  // --- the beat clock --------------------------------------------------------
  // Pure: track time + measured grid -> musical position. No audio analysis,
  // no lag. `grid` is one entry of LUMINA_TRACK_GRID.
  function clockAt(grid, time) {
    if (!grid) return null;
    const beats = (time - grid.firstDownbeat) / grid.beatLen;
    const bars = beats / 4;
    const phraseBars = grid.phraseBars || 8;
    const barIndex = Math.floor(bars);
    const step16 = ((bars - Math.floor(bars)) * 16);
    return {
      beats,
      beat: Math.floor(beats),
      beatPhase: beats - Math.floor(beats),
      bar: barIndex + 1,               // 1-based, matching the analyzer
      barPhase: bars - Math.floor(bars),
      step: Math.floor(step16),        // which sixteenth of the bar
      stepPhase: step16 - Math.floor(step16),
      phrasePhase: ((bars % phraseBars) + phraseBars) % phraseBars / phraseBars,
      swing: ((barIndex % 2) + 2) % 2, // 0,1,0,1 … per bar
    };
  }

  // Stateful accent generator: fires an impulse whenever the clock crosses a
  // sixteenth that the pattern marks, then decays. Because the crossing is
  // computed from the grid, the flash is ON the beat, not after it.
  function createAccents() {
    let lastStepKey = null;
    let env = 0;
    let level = 0;
    function step(clock, patternName, decay, dt) {
      const pattern = ACCENTS[patternName] || ACCENTS.four;
      // Before the first downbeat there is no grid to be on — a track's
      // count-in shouldn't flash against a phantom one.
      if (clock && clock.beats >= 0) {
        const key = `${clock.bar}:${clock.step}`;
        if (key !== lastStepKey) {
          lastStepKey = key;
          const w = pattern[((clock.step % 16) + 16) % 16] || 0;
          if (w > 0) {
            env = 1;
            level = w;
          }
        }
      }
      env *= Math.exp(-dt / Math.max(decay || 0.12, 0.02));
      return env * level;
    }
    return { step };
  }

  // Pure: base config + source values + settings -> the modulated partial.
  // Every configured target appears in the result even when its sources are
  // silent — the page uses the key set to know what to restore on stop.
  function modulate(base, sources, s) {
    const acc = {};
    for (const row of s.rows) {
      if (!row || !row.amt || !TARGETS[row.tgt] || sources[row.src] === undefined) continue;
      acc[row.tgt] = (acc[row.tgt] || 0) + row.amt * sources[row.src];
    }
    const out = {};
    for (const tgt of Object.keys(acc)) {
      const t = TARGETS[tgt];
      const b = base[tgt];
      if (typeof b !== "number") continue;
      out[tgt] = Math.min(t.max, Math.max(t.min, b + acc[tgt] * t.span * s.master));
    }
    return out;
  }

  globalThis.LuminaMusicDSP = {
    create,
    modulate,
    bandsFromSpectrum,
    clockAt,
    createAccents,
    DEFAULTS,
    TARGETS,
    SOURCES,
    CLOCK_SOURCES,
    ACCENTS,
    ACCENT_NAMES,
    BANDS,
  };
})();
