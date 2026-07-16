// The Singing Plate — the mechanism, second movement.
// Chladni physics on a blended mode field; a Moog-ish bowed voice an octave
// down; reverb/delay/strike console; sand color follows the frequency.

(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  // Twelve stations around the rim: frequency rises with the station, and each
  // station owns a figure — honest Chladni physics interleaved with mandalas,
  // roses, spirals, and rings. The sound stays the driver; the plate has taste.
  const MODES = [
    [1, 2], [1, 3], [2, 3], [1, 4], [2, 4], [3, 4],
    [1, 5], [2, 5], [3, 5], [1, 6], [2, 6], [4, 5],
  ];
  const PATTERNS = [
    { kind: "chladni", m: 1, n: 2, label: "Ⅰ:Ⅱ" },
    { kind: "mandala", k: 5, rings: 2, label: "✶5" },
    { kind: "chladni", m: 2, n: 3, label: "Ⅱ:Ⅲ" },
    { kind: "spiral", k: 3, twist: 6, label: "✺3" },
    { kind: "mandala", k: 8, rings: 3, label: "✶8" },
    { kind: "rose", k: 7, label: "✿7" },
    { kind: "mandala", k: 6, rings: 4, label: "✶6" },
    { kind: "spiral", k: 5, twist: 9, label: "✺5" },
    { kind: "chladni", m: 3, n: 5, label: "Ⅲ:Ⅴ" },
    { kind: "rose", k: 5, label: "✿5" },
    { kind: "rings", w: 7, label: "◉" },
    { kind: "mandala", k: 12, rings: 5, label: "✶12" },
  ];
  const ROMAN = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
  // Station pitch walks two full octaves (A3 → A5), tuned for play rather than
  // plate physics — on the triad the rim rings do–mi–sol–do–mi–sol–do, and it
  // never dips below the register the plate sings in. The figures still come
  // from the honest mode pairs above.
  const stationFreq = (i) => 220 * Math.pow(2, (i * 2) / (MODES.length - 1));

  // Every visit — and every Level the Sand — rolls fresh rotations and ring
  // spacings, so the same station never draws exactly the same figure twice.
  function rollVariations() {
    return PATTERNS.map(() => ({
      phi: Math.random() * Math.PI * 2,
      jig: 0.85 + Math.random() * 0.4,
    }));
  }
  let variations = rollVariations();

  function evalPattern(p, vr, x, y) {
    if (p.kind === "chladni") {
      return (
        Math.cos(p.n * Math.PI * x) * Math.cos(p.m * Math.PI * y) -
        Math.cos(p.m * Math.PI * x) * Math.cos(p.n * Math.PI * y)
      );
    }
    const dx = x - 0.5, dy = y - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const th = Math.atan2(dy, dx);
    switch (p.kind) {
      case "mandala":
        return 2 * Math.cos(p.k * (th + vr.phi)) * Math.cos(p.rings * Math.PI * r * vr.jig);
      case "rose":
        return 2.4 * (r - (0.18 + 0.62 * Math.abs(Math.cos(p.k * 0.5 * (th + vr.phi)))));
      case "spiral":
        return 2 * Math.cos(p.k * (th + vr.phi) + p.twist * r * vr.jig);
      case "rings":
        return 2 * Math.cos(p.w * Math.PI * r * vr.jig + vr.phi);
      default:
        return 0;
    }
  }

  const GRID = 160;
  const GRAIN_COUNT = 40000;
  const INSET = 0.03;
  const BOW_ZONE = 0.16;
  const BUCKETS = 4;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- engraving

  function engrave() {
    const svg = document.querySelector(".engraving");
    const stroke = "rgba(201, 165, 90, 0.16)";
    const strokeBright = "rgba(201, 165, 90, 0.26)";
    const C = 500;
    const el = (name, attrs) => {
      const node = document.createElementNS(SVG_NS, name);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      svg.appendChild(node);
      return node;
    };
    for (let deg = 0; deg < 360; deg += 5) {
      const major = deg % 15 === 0;
      const a = (deg * Math.PI) / 180;
      const r1 = major ? 462 : 470;
      el("line", {
        x1: C + r1 * Math.cos(a), y1: C + r1 * Math.sin(a),
        x2: C + 480 * Math.cos(a), y2: C + 480 * Math.sin(a),
        stroke: major ? strokeBright : stroke, "stroke-width": major ? 1.6 : 1,
      });
    }
    for (const r of [452, 396, 300]) {
      el("circle", { cx: C, cy: C, r, fill: "none", stroke, "stroke-width": 1 });
    }
    const sq = (rot) => {
      const pts = [];
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        pts.push(`${C + 396 * Math.cos(a)},${C + 396 * Math.sin(a)}`);
      }
      el("polygon", { points: pts.join(" "), fill: "none", stroke, "stroke-width": 1 });
    };
    sq(Math.PI / 4);
    sq(0);
    el("circle", { cx: C, cy: C, r: 84, fill: "none", stroke, "stroke-width": 1 });
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      el("circle", {
        cx: C + 84 * Math.cos(a), cy: C + 84 * Math.sin(a), r: 84,
        fill: "none", stroke, "stroke-width": 1,
      });
    }
    const glyphs = ["☉", "☽", "☿", "♀", "♂", "♃", "♄", "⛢"];
    glyphs.forEach((g, i) => {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const t = el("text", {
        x: C + 426 * Math.cos(a), y: C + 426 * Math.sin(a),
        fill: strokeBright, "font-size": 30,
        "text-anchor": "middle", "dominant-baseline": "central",
      });
      t.textContent = g;
    });

    // twelve station diamonds where the rim actually plays; the mapping is
    // mirrored left/right, so every station except top and bottom gets a twin
    stationMarks.length = 0;
    for (let i = 0; i < PATTERNS.length; i++) {
      const theta = Math.acos(1 - (2 * i) / (PATTERNS.length - 1));
      const sides = theta < 0.01 || theta > Math.PI - 0.01 ? [theta] : [theta, -theta];
      const pair = [];
      for (const th of sides) {
        const x = C + 436 * Math.sin(th);
        const y = C - 436 * Math.cos(th);
        pair.push(
          el("path", {
            d: `M ${x} ${y - 9} L ${x + 6.5} ${y} L ${x} ${y + 9} L ${x - 6.5} ${y} Z`,
            fill: "rgba(201,165,90,0.28)",
          })
        );
      }
      stationMarks.push(pair);
    }
  }

  const stationMarks = [];

  function updateStationGlow() {
    stationMarks.forEach((pair, i) => {
      const on = i === state.station;
      for (const m of pair) {
        m.setAttribute("fill", on ? "rgba(255,214,150,0.95)" : "rgba(201,165,90,0.28)");
        if (on) m.setAttribute("style", "filter: drop-shadow(0 0 6px rgba(255,214,150,0.7))");
        else m.removeAttribute("style");
      }
    });
  }

  // ------------------------------------------------------------- field grid

  const fieldF = new Float32Array(GRID * GRID);
  const fieldGX = new Float32Array(GRID * GRID);
  const fieldGY = new Float32Array(GRID * GRID);
  let computedModeFloat = -1;

  function recomputeField(modeFloat) {
    const i0 = Math.max(0, Math.min(PATTERNS.length - 1, Math.floor(modeFloat)));
    const i1 = Math.min(PATTERNS.length - 1, i0 + 1);
    const t = Math.min(1, Math.max(0, modeFloat - i0));
    const p0 = PATTERNS[i0], v0 = variations[i0];
    const p1 = PATTERNS[i1], v1 = variations[i1];
    const inv = 1 / (GRID - 1);
    for (let y = 0; y < GRID; y++) {
      const row = y * GRID;
      const vy = y * inv;
      for (let x = 0; x < GRID; x++) {
        const vx = x * inv;
        const a = evalPattern(p0, v0, vx, vy);
        const b = t > 0 ? evalPattern(p1, v1, vx, vy) : 0;
        fieldF[row + x] = (1 - t) * a + t * b;
      }
    }
    for (let y = 0; y < GRID; y++) {
      const row = y * GRID;
      for (let x = 0; x < GRID; x++) {
        const xm = x > 0 ? x - 1 : x, xp = x < GRID - 1 ? x + 1 : x;
        const ym = y > 0 ? y - 1 : y, yp = y < GRID - 1 ? y + 1 : y;
        fieldGX[row + x] = (fieldF[row + xp] - fieldF[row + xm]) * 0.5 * GRID;
        fieldGY[row + x] = (fieldF[yp * GRID + x] - fieldF[ym * GRID + x]) * 0.5 * GRID;
      }
    }
    computedModeFloat = modeFloat;
  }

  const sample = { f: 0, gx: 0, gy: 0 };

  function sampleField(u, v, out) {
    const fx = Math.min(GRID - 1.001, Math.max(0, u * (GRID - 1)));
    const fy = Math.min(GRID - 1.001, Math.max(0, v * (GRID - 1)));
    const x0 = fx | 0, y0 = fy | 0;
    const tx = fx - x0, ty = fy - y0;
    const i00 = y0 * GRID + x0, i10 = i00 + 1, i01 = i00 + GRID, i11 = i01 + 1;
    const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
    out.f = fieldF[i00] * w00 + fieldF[i10] * w10 + fieldF[i01] * w01 + fieldF[i11] * w11;
    out.gx = fieldGX[i00] * w00 + fieldGX[i10] * w10 + fieldGX[i01] * w01 + fieldGX[i11] * w11;
    out.gy = fieldGY[i00] * w00 + fieldGY[i10] * w10 + fieldGY[i01] * w01 + fieldGY[i11] * w11;
  }

  // ------------------------------------------------------------------ grains

  const gX = new Float32Array(GRAIN_COUNT);
  const gY = new Float32Array(GRAIN_COUNT);
  const gVX = new Float32Array(GRAIN_COUNT);
  const gVY = new Float32Array(GRAIN_COUNT);

  function seedGrains(modeIndex) {
    recomputeField(modeIndex);
    let placed = 0;
    let guard = GRAIN_COUNT * 80;
    while (placed < GRAIN_COUNT && guard-- > 0) {
      const u = Math.random();
      const v = Math.random();
      sampleField(u, v, sample);
      if (Math.abs(sample.f) < 0.16 * Math.random() || Math.random() < 0.0015) {
        gX[placed] = u;
        gY[placed] = v;
        placed++;
      }
    }
  }

  function kickGrains(mag) {
    for (let i = 0; i < GRAIN_COUNT; i++) {
      gVX[i] += (Math.random() - 0.5) * mag;
      gVY[i] += (Math.random() - 0.5) * mag;
    }
  }

  // A mallet blast: grains fly radially away from the hit with a chaotic
  // tumble, hardest near the impact but nobody is spared. Repeat hits land
  // on an already-disordered plate and scatter even harder.
  function blastGrains(u, v, power) {
    const R = 0.7;
    const base =
      (reducedMotion ? 0.6 : 1) *
      (0.028 + 0.06 * power) *
      (1 + state.disorder * 0.7);
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const dx = gX[i] - u, dy = gY[i] - v;
      const r = Math.sqrt(dx * dx + dy * dy) || 1e-4;
      const fall = Math.max(0, 1 - r / R);
      const imp = base * (0.12 + fall * fall * 1.4);
      gVX[i] += (dx / r) * imp + (Math.random() - 0.5) * imp;
      gVY[i] += (dy / r) * imp + (Math.random() - 0.5) * imp;
    }
  }

  function levelSand() {
    state.disorder = 0;
    for (let i = 0; i < GRAIN_COUNT; i++) {
      gX[i] = 0.02 + Math.random() * 0.96;
      gY[i] = 0.02 + Math.random() * 0.96;
      gVX[i] = (Math.random() - 0.5) * 0.004;
      gVY[i] = (Math.random() - 0.5) * 0.004;
    }
    state.avgGrainSpeed = 0.002; // let the hiss say "fresh sand"
    variations = rollVariations(); // fresh sand, fresh figures
    computedModeFloat = -1;
    recomputeField(state.modeFloat);
  }

  // ------------------------------------------------------------------- state

  const state = {
    modeFloat: 8,
    intensity: 0,
    bowing: false,
    bowSpeed: 0,
    pointerOver: false,
    pointerDown: false,
    downAt: 0,
    downU: 0, downV: 0,
    u: 0.5, v: 0.5,
    moveDX: 0, moveDY: 0,
    cursorSpeed: 0,
    avgGrainSpeed: 0,
    chord: "triad",
    reverb: 0.3,
    delay: 0.12,
    strike: 0.6,
    bend: 0, // -1 half step (x) … +1 half step (c)
    vibratoHeld: false, // v key held — the vibrato lever
    station: 8,        // the committed rim station (pitch + figure)
    keyStation: null,  // station held via the number-key manual
    bowLevel: 0,       // sustained bow pressure, 0..1
    bowingActive: false,
    disorder: 0,       // mallet chaos, 0..1 — kills the field pull until bowed back
    carryDepth: null,  // bow pressure while the carried bow works the rim
  };

  // ------------------------------------------------------------------- audio

  const audio = {
    ctx: null, master: null, bus: null,
    saws: [], sub: null, voiceFilter: null, voiceGain: null,
    bowNoiseGain: null, bowFilter: null, hissGain: null,
    revGain: null, delayWet: null, vibGain: null,
    ready: false,
  };

  // Master level, owned by the shared sound control. The plate only sounds
  // when played, so "on" means armed rather than audible.
  const sound = { on: true, volume: 0.5, room: null, roomLevel: 0, control: null };

  function applyVolume() {
    const v = sound.on ? sound.volume : 0;
    if (audio.master) {
      audio.master.gain.setTargetAtTime(0.72 * v, audio.ctx.currentTime, 0.05);
    }
    if (sound.room) sound.room.volume = sound.roomLevel * v;
  }

  // Single entry point for master volume — the console slider and the shared
  // control's hover slider both land here, and each keeps the other's UI honest.
  function setMasterVolume(v) {
    sound.volume = Math.min(1, Math.max(0, v));
    applyVolume();
    const el = document.getElementById("ctl-volume");
    if (el && Number(el.value) !== Math.round(sound.volume * 100)) {
      el.value = Math.round(sound.volume * 100);
    }
  }

  // chord tables for the quantized voicings, built over A = 55 Hz
  const NOTE_TABLES = (() => {
    const build = (semis) => {
      const notes = [];
      for (let oct = 0; oct < 5; oct++) {
        for (const s of semis) notes.push(55 * Math.pow(2, oct + s / 12));
      }
      return notes.sort((a, b) => a - b);
    };
    return {
      triad: build([0, 4, 7]),
      penta: build([0, 3, 5, 7, 10]),
      overtone: Array.from({ length: 16 }, (_, i) => 55 * (i + 1)),
      lydb7: build([0, 2, 4, 6, 7, 9, 10]),      // lydian dominant
      hijaz: build([0, 1, 4, 5, 7, 8, 10]),      // maqam hijaz — that augmented second
      rast: build([0, 2, 3.5, 5, 7, 9, 10.5]),   // maqam rast — true quarter tones
    };
  })();

  function quantize(f) {
    const table = NOTE_TABLES[state.chord];
    if (!table) return f;
    let best = table[0];
    for (const n of table) if (Math.abs(n - f) < Math.abs(best - f)) best = n;
    return best;
  }

  function noiseBuffer(ctx, seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function impulseResponse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  async function initAudio() {
    if (audio.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio.ctx = ctx;
    try { await ctx.resume(); } catch {}

    const master = ctx.createGain();
    master.gain.value = 0.72 * (sound.on ? sound.volume : 0);
    master.connect(ctx.destination);
    audio.master = master;

    // shared bus feeding dry + reverb + delay
    const bus = ctx.createGain();
    bus.connect(master);
    audio.bus = bus;

    const convolver = ctx.createConvolver();
    convolver.buffer = impulseResponse(ctx, 4.5, 2.2);
    const revGain = ctx.createGain();
    revGain.gain.value = state.reverb * 2.2;
    bus.connect(convolver);
    convolver.connect(revGain);
    revGain.connect(master);
    audio.revGain = revGain;

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.46;
    const fb = ctx.createGain();
    fb.gain.value = 0.3 + state.delay * 0.55;
    const fbLp = ctx.createBiquadFilter();
    fbLp.type = "lowpass";
    fbLp.frequency.value = 2200;
    const delayWet = ctx.createGain();
    delayWet.gain.value = state.delay * 1.5;
    audio.fb = fb;
    bus.connect(delay);
    delay.connect(fb);
    fb.connect(fbLp);
    fbLp.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(master);
    audio.delayWet = delayWet;

    // The voice: a reed. One sawtooth split through a tracking lowpass and a
    // fixed throat formant — the nasal band that says oboe — with a whisper
    // of sub for chest and a slow vibrato on the detune.
    const voiceMix = ctx.createGain();
    voiceMix.gain.value = 0.6;
    const reed = ctx.createOscillator();
    reed.type = "sawtooth";
    reed.connect(voiceMix);
    reed.start();
    audio.saws.push(reed);
    const sub = ctx.createOscillator();
    sub.type = "triangle";
    const subGain = ctx.createGain();
    subGain.gain.value = 0.14;
    sub.connect(subGain);
    subGain.connect(voiceMix);
    sub.start();
    audio.sub = sub;

    const voiceFilter = ctx.createBiquadFilter();
    voiceFilter.type = "lowpass";
    voiceFilter.Q.value = 2.2;
    voiceFilter.frequency.value = 600;
    const lpGain = ctx.createGain();
    lpGain.gain.value = 0.6;
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.frequency.value = 1150;
    formant.Q.value = 5;
    const formantGain = ctx.createGain();
    formantGain.gain.value = 1.1;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    voiceMix.connect(voiceFilter);
    voiceFilter.connect(lpGain);
    lpGain.connect(voiceGain);
    voiceMix.connect(formant);
    formant.connect(formantGain);
    formantGain.connect(voiceGain);
    voiceGain.connect(bus);
    audio.voiceFilter = voiceFilter;
    audio.formant = formant;
    audio.voiceGain = voiceGain;

    // vibrato: gentle, on the detune of both oscillators
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5.5; // cents
    lfo.connect(lfoGain);
    lfoGain.connect(reed.detune);
    lfoGain.connect(sub.detune);
    lfo.start();

    // held-V vibrato: the same slow hand, pressed much deeper. The keyboard
    // handlers steer this gain between 0 and VIB_CENTS, and strikeBowl
    // patches its partials in so ringing taps waver too.
    const vibGain = ctx.createGain();
    vibGain.gain.value = state.vibratoHeld ? VIB_CENTS : 0;
    lfo.connect(vibGain);
    vibGain.connect(reed.detune);
    vibGain.connect(sub.detune);
    audio.vibGain = vibGain;

    // rosin
    const bowNoise = ctx.createBufferSource();
    bowNoise.buffer = noiseBuffer(ctx, 2);
    bowNoise.loop = true;
    const bowFilter = ctx.createBiquadFilter();
    bowFilter.type = "bandpass";
    bowFilter.Q.value = 6;
    bowFilter.frequency.value = 600;
    const bowNoiseGain = ctx.createGain();
    bowNoiseGain.gain.value = 0;
    bowNoise.connect(bowFilter);
    bowFilter.connect(bowNoiseGain);
    bowNoiseGain.connect(bus);
    bowNoise.start();
    audio.bowFilter = bowFilter;
    audio.bowNoiseGain = bowNoiseGain;

    // sand
    const hissNoise = ctx.createBufferSource();
    hissNoise.buffer = noiseBuffer(ctx, 2);
    hissNoise.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 4600;
    hissFilter.Q.value = 0.7;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0;
    hissNoise.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(bus);
    hissNoise.start();
    audio.hissGain = hissGain;

    audio.ready = true;

    // Room tone rides an <audio> element: fetch() is blocked on file:// pages,
    // media elements are not. The bell is fully synthesized for the same reason.
    const room = new Audio("./assets/audio/room-tone.mp3");
    room.loop = true;
    room.volume = 0;
    sound.room = room;
    room
      .play()
      .then(() => {
        const fade = setInterval(() => {
          sound.roomLevel = Math.min(0.04, sound.roomLevel + 0.003);
          applyVolume();
          if (sound.roomLevel >= 0.04) clearInterval(fade);
        }, 120);
      })
      .catch(() => {});
  }

  // Holding V is the vibrato lever: ±VIB_CENTS at the voice LFO's 5.1 Hz,
  // eased in fast and released slow, like a hand settling.
  const VIB_CENTS = 45;
  function setVibrato(on) {
    if (state.vibratoHeld === on) return;
    state.vibratoHeld = on;
    if (audio.vibGain) {
      audio.vibGain.gain.setTargetAtTime(on ? VIB_CENTS : 0, audio.ctx.currentTime, on ? 0.09 : 0.2);
    }
  }

  function currentFreq() {
    const i0 = Math.max(0, Math.min(MODES.length - 1, Math.floor(state.modeFloat)));
    const i1 = Math.min(MODES.length - 1, i0 + 1);
    const t = Math.min(1, Math.max(0, state.modeFloat - i0));
    const f0 = stationFreq(i0);
    const f1 = stationFreq(i1);
    return f0 * (1 - t) + f1 * t;
  }

  function audioFrame() {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    const vibrato = state.bowingActive
      ? 1 + 0.005 * state.intensity * Math.sin(now * Math.PI * 2 * 5.2)
      : 1;
    const f = quantize(currentFreq()) * Math.pow(2, state.bend / 12) * vibrato;

    for (const osc of audio.saws) osc.frequency.setTargetAtTime(f, now, 0.05);
    audio.sub.frequency.setTargetAtTime(f * 0.5, now, 0.05);
    const cutoff = f * 4 + state.intensity * f * 3 + 120 + Math.min(700, state.bowSpeed * 500);
    audio.voiceFilter.frequency.setTargetAtTime(Math.min(5200, cutoff), now, 0.07);
    audio.formant.frequency.setTargetAtTime(1100 + state.intensity * 250, now, 0.1);
    audio.bowFilter.frequency.setTargetAtTime(f * 3, now, 0.08);

    const voiceTarget = state.bowingActive ? Math.min(0.55, 0.1 + 0.5 * state.bowLevel) : 0;
    audio.voiceGain.gain.setTargetAtTime(voiceTarget, now, state.bowingActive ? 0.18 : 1.4);
    const rosinTarget = state.bowingActive ? Math.min(0.08, 0.015 + state.bowSpeed * 0.3) : 0;
    audio.bowNoiseGain.gain.setTargetAtTime(rosinTarget, now, state.bowingActive ? 0.05 : 0.3);
    audio.hissGain.gain.setTargetAtTime(Math.min(0.18, state.avgGrainSpeed * 6), now, 0.12);
  }

  // Where you tap chooses a note: the angle around the plate's center walks the
  // degrees of the loaded scale, sounded an octave below the plate's register.
  function bowlNote(u, v) {
    const table = NOTE_TABLES[state.chord] || NOTE_TABLES.penta;
    const center = quantize(currentFreq()) / 2;
    const lo = center * 0.66;
    const hi = center * 1.4;
    let notes = table.filter((n) => n >= lo && n <= hi);
    if (!notes.length) notes = [center];
    const ang = Math.atan2(u - 0.5, -(v - 0.5));
    const t = (ang / (Math.PI * 2) + 1) % 1;
    return notes[Math.min(notes.length - 1, Math.floor(t * notes.length))];
  }

  // A large prayer bowl, fully synthesized: beating sine pairs on bowl-mode
  // ratios, a felt whisper at contact, and a very long soft ring.
  function strikeBowl(f) {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    const power = state.strike;

    const out = ctx.createGain();
    out.gain.value = 0.5 + power * 0.6;
    out.connect(audio.bus);

    const partials = [
      { ratio: 1, gain: 0.3, decay: 9 },
      { ratio: 2.93, gain: 0.13, decay: 5.5 },
      { ratio: 5.4, gain: 0.06, decay: 3.5 },
      { ratio: 8.6, gain: 0.024, decay: 2 },
    ];
    const ringScale = 0.55 + power * 0.7;
    for (const p of partials) {
      for (const beat of [-0.7, 0.7]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f * p.ratio + beat;
        if (audio.vibGain) audio.vibGain.connect(osc.detune);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(p.gain, now + 0.03);
        g.gain.setTargetAtTime(0, now + 0.06, (p.decay * ringScale) / 3);
        osc.connect(g);
        g.connect(out);
        osc.start(now);
        osc.stop(now + p.decay * 2 + 1);
      }
    }

    const thup = ctx.createBufferSource();
    thup.buffer = noiseBuffer(ctx, 0.2);
    const tf = ctx.createBiquadFilter();
    tf.type = "bandpass";
    tf.frequency.value = f * 3;
    tf.Q.value = 1.2;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.1 + power * 0.08, now);
    tg.gain.setTargetAtTime(0, now + 0.01, 0.05);
    thup.connect(tf);
    tf.connect(tg);
    tg.connect(out);
    thup.start(now);
  }

  // ------------------------------------------------------------------ render

  const canvas = document.getElementById("sand");
  const ctx2d = canvas.getContext("2d");
  const plate = document.querySelector(".plate");
  const freqEl = document.getElementById("freq");
  let plaqueSinging = false;

  // The prop layer extends past the plate on every side so the bow can hang
  // over the rim. Must match the #props inset in world.css.
  const PROP_MARGIN = 0.22;
  const props = document.getElementById("props");
  const pctx = props.getContext("2d");

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = plate.clientWidth;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    props.width = Math.round(size * (1 + PROP_MARGIN * 2) * dpr);
    props.height = props.width;
    fitRoom();
  }

  // ------------------------------------------------------- the hand, the bow

  // Room-space layer: full-viewport canvas in CSS pixels for the bow, its
  // rest, and the rosin glow. The hand itself is a DOM element (#hand).
  const roomCanvas = document.getElementById("room");
  const rctx = roomCanvas.getContext("2d");
  const handEl = document.getElementById("hand");

  function fitRoom() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    roomCanvas.width = Math.round(window.innerWidth * dpr);
    roomCanvas.height = Math.round(window.innerHeight * dpr);
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const hand = { x: -200, y: -200, down: false };

  // The bow lives in the room now: it rests on a holder beside the plate,
  // and only sounds while its hair is reaching the rim. x/y is the frog —
  // the grip point, which is the pointer while held.
  const bowObj = {
    held: false,
    x: -200, y: -200,
    angle: -1.25,
    len: 200,
    inContact: false,
    contactX: 0, contactY: 0,
  };
  const CARRY_ANGLE = -0.9; // relaxed diagonal while carried away from the plate
  const consoleEl = document.querySelector(".console");

  // The bow hangs horizontally in two clips just below the console.
  function restPose() {
    const c = consoleEl.getBoundingClientRect();
    const len = plate.getBoundingClientRect().width * 0.3;
    return {
      x: c.left + (c.width - len) / 2, // frog end
      y: c.bottom + 26,
      angle: 0,
      len,
      rackBottom: c.bottom,
    };
  }

  function distToBow(x, y) {
    // distance to the stick segment frog→tip
    const tx = bowObj.x + Math.cos(bowObj.angle) * bowObj.len;
    const ty = bowObj.y + Math.sin(bowObj.angle) * bowObj.len;
    const dx = tx - bowObj.x, dy = ty - bowObj.y;
    const t = Math.min(1, Math.max(0,
      ((x - bowObj.x) * dx + (y - bowObj.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (bowObj.x + dx * t), y - (bowObj.y + dy * t));
  }

  function stopBowing() {
    state.bowing = false;
    state.pointerDown = false;
    state.carryDepth = null;
    bowObj.inContact = false;
  }

  // Carried-bow physics: find the nearest rim point; if the hair can reach
  // it, the bow bridges hand→rim and the plate sings from that contact.
  function updateCarried(dt) {
    const r = plate.getBoundingClientRect();
    bowObj.x = hand.x;
    bowObj.y = hand.y;
    bowObj.len = r.width * 0.3;

    const u = (hand.x - r.left) / r.width;
    const v = (hand.y - r.top) / r.height;
    let nu = Math.min(1, Math.max(0, u));
    let nv = Math.min(1, Math.max(0, v));
    if (u > 0 && u < 1 && v > 0 && v < 1) {
      // grip is over the plate: project to the nearest edge
      const d = [v, 1 - u, 1 - v, u]; // top right bottom left
      let e = 0;
      for (let i = 1; i < 4; i++) if (d[i] < d[e]) e = i;
      if (e === 0) nv = 0;
      else if (e === 1) nu = 1;
      else if (e === 2) nv = 1;
      else nu = 0;
    }
    const cx = r.left + nu * r.width;
    const cy = r.top + nv * r.height;
    const dist = Math.hypot(cx - hand.x, cy - hand.y);
    const reach = bowObj.len * 0.95;
    const inContact = dist < reach;

    let targetAngle = inContact && dist > 4
      ? Math.atan2(cy - hand.y, cx - hand.x)
      : (inContact ? bowObj.angle : CARRY_ANGLE);
    let dA = targetAngle - bowObj.angle;
    while (dA > Math.PI) dA -= Math.PI * 2;
    while (dA < -Math.PI) dA += Math.PI * 2;
    bowObj.angle += dA * Math.min(1, dt * 12);

    if (inContact) {
      state.moveDX += nu - state.u;
      state.moveDY += nv - state.v;
      state.u = nu;
      state.v = nv;
      state.carryDepth = Math.min(1, Math.max(0, 1 - dist / reach));
      state.bowing = true;
      state.pointerDown = true;
      state.pointerOver = false; // no plough or mallet under a carried bow
      bowObj.contactX = cx;
      bowObj.contactY = cy;
      bowObj.inContact = true;
    } else if (bowObj.inContact) {
      stopBowing();
    }
  }

  function grabBow(e) {
    bowObj.held = true;
    initAudio();
    e.preventDefault();
  }

  function releaseBow() {
    bowObj.held = false;
    stopBowing();
  }

  window.addEventListener("pointermove", (e) => {
    hand.x = e.clientX;
    hand.y = e.clientY;
  });
  window.addEventListener("pointerdown", (e) => {
    hand.x = e.clientX;
    hand.y = e.clientY;
    hand.down = true;
    handEl.classList.add("grab");
    // never steal presses meant for real controls (console sits right above the rack)
    const onControl = e.target.closest &&
      e.target.closest("button, input, a, .console, .es-sound");
    if (!bowObj.held && !onControl && distToBow(e.clientX, e.clientY) < 30) grabBow(e);
  });
  window.addEventListener("pointerup", () => {
    hand.down = false;
    handEl.classList.remove("grab");
    if (bowObj.held) releaseBow();
  });
  window.addEventListener("pointercancel", () => {
    hand.down = false;
    handEl.classList.remove("grab");
    if (bowObj.held) releaseBow();
  });

  function bucketColors() {
    const t = state.modeFloat / (MODES.length - 1);
    const hue = 155 + t * 120; // teal at the bottom of the register, violet at the top
    const light = [68, 74, 80, 62];
    const off = [-10, -4, 4, 10];
    const colors = [];
    for (let b = 0; b < BUCKETS; b++) {
      colors.push(`hsla(${(hue + off[b]).toFixed(0)},85%,${light[b]}%,0.42)`);
    }
    return colors;
  }

  // The bow, drawn in room space: frog at (x, y) — the grip — with the stick
  // running along `angle` to the tip.
  function drawBow(x, y, angle, alpha, hairVib) {
    const L = bowObj.len / 2;
    rctx.save();
    rctx.translate(x, y);
    rctx.rotate(angle);
    rctx.translate(L, 0); // art spans -L (frog) to +L (tip)
    rctx.globalAlpha = alpha;

    // hair ribbon — the only part that vibrates; the stick stays in the hand
    rctx.fillStyle = "rgba(233,225,198,0.55)";
    rctx.fillRect(-L, 1.5 + (hairVib || 0), L * 2, 3);

    // arched stick, lit from the lamp
    const grad = rctx.createLinearGradient(-L, 0, L, 0);
    grad.addColorStop(0, "#7a5426");
    grad.addColorStop(0.5, "#8a6230");
    grad.addColorStop(1, "#4a3212");
    rctx.strokeStyle = grad;
    rctx.lineWidth = 4.5;
    rctx.lineCap = "round";
    rctx.beginPath();
    rctx.moveTo(-L, -2);
    rctx.quadraticCurveTo(0, -11, L, -3);
    rctx.stroke();
    rctx.strokeStyle = "rgba(255,214,150,0.5)";
    rctx.lineWidth = 1.4;
    rctx.beginPath();
    rctx.moveTo(-L, -3.5);
    rctx.quadraticCurveTo(0, -12.5, L, -4.5);
    rctx.stroke();

    // frog and winding at the grip
    rctx.fillStyle = "#1c1208";
    rctx.fillRect(-L - 9, -7, 12, 12);
    rctx.fillStyle = "#c9a55a";
    rctx.beginPath();
    rctx.arc(-L - 3, -1, 1.8, 0, Math.PI * 2);
    rctx.fill();
    // tip taper
    rctx.fillStyle = "#3a2812";
    rctx.beginPath();
    rctx.moveTo(L, -6);
    rctx.lineTo(L + 7, -1);
    rctx.lineTo(L, 3);
    rctx.closePath();
    rctx.fill();

    rctx.globalAlpha = 1;
    rctx.restore();
  }

  // The rack: two brass clips hanging from the underside of the console,
  // each ending in an upward-open cradle the stick lies in.
  function drawRack(rest) {
    rctx.save();
    rctx.lineCap = "round";
    for (const t of [0.24, 0.76]) {
      const x = rest.x + rest.len * t;
      // strap down from the console
      rctx.strokeStyle = "#8a6f3c";
      rctx.lineWidth = 3;
      rctx.beginPath();
      rctx.moveTo(x, rest.rackBottom - 2);
      rctx.lineTo(x, rest.y - 5);
      rctx.stroke();
      // cradle
      rctx.strokeStyle = "#c9a55a";
      rctx.lineWidth = 2.4;
      rctx.beginPath();
      rctx.arc(x, rest.y - 4, 7, Math.PI * 0.08, Math.PI * 0.92);
      rctx.stroke();
    }

    // the sign: USE BOW, with an arrow up at the bow. While the bow rests it
    // pulses a soft brass glow to catch the eye; picking the bow up stops it.
    const cx = rest.x + rest.len / 2;
    let alpha = 0.78;
    if (!bowObj.held) {
      const pulse = (Math.sin(performance.now() / 900 * Math.PI) + 1) / 2; // ~1.8 s cycle
      alpha = 0.62 + pulse * 0.34;
      rctx.shadowColor = "rgba(255, 214, 140, 0.85)";
      rctx.shadowBlur = 4 + pulse * 12;
    }
    rctx.fillStyle = `rgba(201, 165, 90, ${alpha})`;
    rctx.strokeStyle = `rgba(201, 165, 90, ${alpha})`;
    rctx.font = "600 18px Georgia, 'Times New Roman', serif";
    rctx.textAlign = "center";
    rctx.textBaseline = "alphabetic";
    const label = "U S E   B O W";
    rctx.fillText(label, cx + 12, rest.y + 46);
    // arrow, left of the label, pointing up at the stick
    const ax = cx - rctx.measureText(label).width / 2 - 2;
    rctx.lineWidth = 2;
    rctx.lineCap = "round";
    rctx.beginPath();
    rctx.moveTo(ax, rest.y + 46);
    rctx.lineTo(ax, rest.y + 14);
    rctx.moveTo(ax - 5, rest.y + 20);
    rctx.lineTo(ax, rest.y + 14);
    rctx.lineTo(ax + 5, rest.y + 20);
    rctx.stroke();
    rctx.restore();
  }

  function renderRoom(dt) {
    rctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const rest = restPose();
    drawRack(rest);

    if (!bowObj.held) {
      // the bow drifts home to its rack
      const k = Math.min(1, dt * 7);
      bowObj.x += (rest.x - bowObj.x) * k;
      bowObj.y += (rest.y - bowObj.y) * k;
      let dA = rest.angle - bowObj.angle;
      while (dA > Math.PI) dA -= Math.PI * 2;
      while (dA < -Math.PI) dA += Math.PI * 2;
      bowObj.angle += dA * k;
      bowObj.len = rest.len;
    }

    // vibrato: while the hair works the rim it flutters against the rigid
    // stick, flipping sign every 50 ms
    let hairVib = 0;
    if (bowObj.held && bowObj.inContact) {
      hairVib = (1.8 + state.intensity * 2.4) *
        ((Math.floor(performance.now() / 50) & 1) * 2 - 1);
    }
    drawBow(bowObj.x, bowObj.y, bowObj.angle, bowObj.held ? 1 : 0.92, hairVib);

    // rosin dust where the hair works the rim
    if (bowObj.held && bowObj.inContact) {
      const glow = rctx.createRadialGradient(
        bowObj.contactX, bowObj.contactY, 0,
        bowObj.contactX, bowObj.contactY, 16);
      glow.addColorStop(0, "rgba(255,230,170,0.55)");
      glow.addColorStop(1, "rgba(255,230,170,0)");
      rctx.fillStyle = glow;
      rctx.beginPath();
      rctx.arc(bowObj.contactX, bowObj.contactY, 16, 0, Math.PI * 2);
      rctx.fill();
    }

    handEl.style.transform = `translate3d(${hand.x}px, ${hand.y}px, 0)`;
  }

  let malletHitAt = -1e9;

  function drawMallet(px, py, pressed) {
    pctx.save();
    pctx.translate(px, py);
    pctx.scale(1.85, 1.85);
    pctx.globalAlpha = pressed ? 1 : 0.75;

    // strike bop: down onto the plate and back up over 240 ms
    const t = (performance.now() - malletHitAt) / 240;
    const dip = t >= 0 && t < 1 ? Math.sin(t * Math.PI) * 9 : (pressed ? 3 : 0);

    // shadow stays on the plate; it tightens as the head comes down
    pctx.fillStyle = `rgba(0,0,0,${0.3 + dip * 0.02})`;
    pctx.beginPath();
    pctx.ellipse(3, 12, 14 - dip * 0.5, 5 - dip * 0.15, 0, 0, Math.PI * 2);
    pctx.fill();

    // the mallet itself descends toward its shadow
    pctx.translate(dip * 0.3, dip);

    // shaft running away to the lower right
    const grad = pctx.createLinearGradient(8, 8, 52, 52);
    grad.addColorStop(0, "#6a4622");
    grad.addColorStop(1, "#2c1a0a");
    pctx.strokeStyle = grad;
    pctx.lineWidth = 5;
    pctx.lineCap = "round";
    pctx.beginPath();
    pctx.moveTo(7, 7);
    pctx.lineTo(50, 50);
    pctx.stroke();

    // felt head
    const head = pctx.createRadialGradient(-3, -4, 2, 0, 0, 12);
    head.addColorStop(0, "#e9dcc2");
    head.addColorStop(0.7, "#a8977a");
    head.addColorStop(1, "#6a5c48");
    pctx.fillStyle = head;
    pctx.beginPath();
    pctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.strokeStyle = "rgba(0,0,0,0.35)";
    pctx.lineWidth = 1;
    pctx.stroke();

    pctx.globalAlpha = 1;
    pctx.restore();
  }

  function render() {
    const w = canvas.width, h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.globalCompositeOperation = "lighter";
    const span = 1 - INSET * 2;
    const speedThr = 0.00002;
    const colors = bucketColors();
    const per = Math.ceil(GRAIN_COUNT / BUCKETS);

    for (let b = 0; b < BUCKETS; b++) {
      ctx2d.fillStyle = colors[b];
      const end = Math.min(GRAIN_COUNT, per * (b + 1));
      for (let i = per * b; i < end; i++) {
        const px = (INSET + gX[i] * span) * w;
        const py = (INSET + gY[i] * span) * h;
        const moving = gVX[i] * gVX[i] + gVY[i] * gVY[i] > speedThr;
        const s = moving ? 2.2 : 1.25;
        ctx2d.fillRect(px - s * 0.5, py - s * 0.5, s, s);
      }
    }

    ctx2d.globalCompositeOperation = "source-over";
  }

  function renderProps() {
    const pw = props.width;
    pctx.clearRect(0, 0, pw, pw);
    if (!state.pointerOver || bowObj.held) return;
    const s = canvas.width; // plate size in device px
    const off = (pw - s) / 2;
    const edge = Math.min(state.u, 1 - state.u, state.v, 1 - state.v);
    if (edge >= BOW_ZONE &&
        state.u >= 0 && state.u <= 1 && state.v >= 0 && state.v <= 1) {
      drawMallet(off + state.u * s, off + state.v * s, state.pointerDown);
    }
  }

  // --------------------------------------------------------------- simulate

  function simulate(dt) {
    const I = state.intensity;
    const shake = (reducedMotion ? 0.5 : 1) * 0.0058 * I;
    const boil = (reducedMotion ? 0.5 : 1) * 0.0017 * I;
    // disorder unhooks the grains from the figure — a blasted plate stays
    // blasted until the bow (or Level the Sand) brings the field back
    const pull = 0.019 * Math.max(I, 0.06) * (1 - state.disorder);
    const FRICTION = 0.18 - 0.08 * I; // hard bowing re-mobilizes settled grains
    const damp = Math.pow(0.0025, dt);

    const ploughR = 0.045;
    const ploughR2 = ploughR * ploughR;
    const ploughPush = Math.min(0.004, state.cursorSpeed * 0.03);
    const ploughActive = state.pointerOver && ploughPush > 0.00003;

    let speedSum = 0;
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const u = gX[i], v = gY[i];
      sampleField(u, v, sample);
      const a = Math.abs(sample.f);
      if (a > FRICTION) {
        gVX[i] += (-sample.f * sample.gx * pull * dt) + (Math.random() - 0.5) * a * shake;
        gVY[i] += (-sample.f * sample.gy * pull * dt) + (Math.random() - 0.5) * a * shake;
      } else {
        // settled grains still tremble while the plate sings, then grind to a halt
        if (I > 0.25) {
          gVX[i] += (Math.random() - 0.5) * boil;
          gVY[i] += (Math.random() - 0.5) * boil;
        }
        gVX[i] *= 0.72;
        gVY[i] *= 0.72;
      }

      if (ploughActive) {
        const dx = u - state.u, dy = v - state.v;
        const r2 = dx * dx + dy * dy;
        if (r2 < ploughR2 && r2 > 1e-8) {
          const r = Math.sqrt(r2);
          const push = (1 - r / ploughR) * ploughPush;
          gVX[i] += (dx / r) * push;
          gVY[i] += (dy / r) * push;
        }
      }

      gVX[i] *= damp;
      gVY[i] *= damp;
      let nx = u + gVX[i] * dt * 60;
      let ny = v + gVY[i] * dt * 60;
      if (nx < 0.004) { nx = 0.004; gVX[i] *= -0.3; }
      else if (nx > 0.996) { nx = 0.996; gVX[i] *= -0.3; }
      if (ny < 0.004) { ny = 0.004; gVY[i] *= -0.3; }
      else if (ny > 0.996) { ny = 0.996; gVY[i] *= -0.3; }
      gX[i] = nx;
      gY[i] = ny;
      if ((i & 15) === 0) speedSum += Math.abs(gVX[i]) + Math.abs(gVY[i]);
    }
    state.avgGrainSpeed = state.avgGrainSpeed * 0.9 + (speedSum / (GRAIN_COUNT / 16)) * 0.1;
  }

  // ------------------------------------------------------------ interaction

  function plateUV(e) {
    const r = plate.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  let lastSlot = 8;

  // Hold-to-bow: WHERE you hold picks the station; holding sustains the tone.
  // Station changes need you to move well past the boundary (hysteresis), so
  // the pitch can't jitter. Depth into the ring adds pressure; motion adds a
  // little urgency but is never required.
  function updateBow(dt) {
    const ang = Math.atan2(state.u - 0.5, -(state.v - 0.5));
    const raw = ((1 - Math.cos(ang)) / 2) * (MODES.length - 1);
    while (raw > state.station + 0.6 && state.station < MODES.length - 1) state.station++;
    while (raw < state.station - 0.6 && state.station > 0) state.station--;

    const edge = Math.min(state.u, 1 - state.u, state.v, 1 - state.v);
    const depth = state.carryDepth !== null
      ? state.carryDepth
      : Math.min(1, Math.max(0, edge / BOW_ZONE));
    const speed = Math.hypot(state.moveDX, state.moveDY) / Math.max(dt, 0.008);
    state.moveDX = 0;
    state.moveDY = 0;
    state.bowSpeed = state.bowSpeed * 0.8 + speed * 0.2;
    state.bowLevel = 0.5 + 0.35 * depth + Math.min(0.2, state.bowSpeed * 0.25);
  }

  plate.addEventListener("pointerdown", (e) => {
    if (bowObj.held) return;
    if (e.button !== 0) return; // right button is the vibrato, never a strike
    initAudio();
    plate.setPointerCapture(e.pointerId);
    const [u, v] = plateUV(e);
    state.pointerDown = true;
    state.downAt = performance.now();
    state.downU = u;
    state.downV = v;
    state.u = u;
    state.v = v;
    state.moveDX = 0;
    state.moveDY = 0;
    // bowing needs the bow in hand now — bare fingers only plough and strike
  });

  plate.addEventListener("pointermove", (e) => {
    if (bowObj.held) return;
    const [u, v] = plateUV(e);
    state.pointerOver = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    const du = u - state.u, dv = v - state.v;
    state.moveDX += du;
    state.moveDY += dv;
    state.u = u;
    state.v = v;
    state.cursorSpeed = state.cursorSpeed * 0.8 + Math.sqrt(du * du + dv * dv) * 0.2;
  });

  // x bends down a half step, c bends up, held v is the vibrato lever — a
  // little x·c·v cluster under the left hand; the number row is a twelve-key
  // manual — hold to bow a station directly. The console hints, quietly.
  const bendKeys = { down: false, up: false };
  const KEY_STATIONS = {
    "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5,
    "7": 6, "8": 7, "9": 8, "0": 9, "-": 10, "=": 11,
  };
  const heldStations = [];
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.target.tagName === "INPUT") return;
    if (e.key === "x" || e.key === "X") bendKeys.down = true;
    else if (e.key === "c" || e.key === "C") bendKeys.up = true;
    else if (e.key === "v" || e.key === "V") {
      initAudio();
      setVibrato(true);
      return;
    } else if (KEY_STATIONS[e.key] !== undefined) {
      initAudio();
      heldStations.push(e.key);
      state.keyStation = KEY_STATIONS[e.key];
      return;
    } else return;
    state.bend = (bendKeys.up ? 1 : 0) - (bendKeys.down ? 1 : 0);
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "x" || e.key === "X") bendKeys.down = false;
    else if (e.key === "c" || e.key === "C") bendKeys.up = false;
    else if (e.key === "v" || e.key === "V") {
      setVibrato(false);
      return;
    } else if (KEY_STATIONS[e.key] !== undefined) {
      const i = heldStations.indexOf(e.key);
      if (i !== -1) heldStations.splice(i, 1);
      state.keyStation = heldStations.length
        ? KEY_STATIONS[heldStations[heldStations.length - 1]]
        : null;
      return;
    } else return;
    state.bend = (bendKeys.up ? 1 : 0) - (bendKeys.down ? 1 : 0);
  });

  plate.addEventListener("pointerenter", () => {
    if (!bowObj.held) state.pointerOver = true;
  });
  plate.addEventListener("pointerleave", () => {
    if (bowObj.held) return;
    state.pointerOver = false;
    state.cursorSpeed = 0;
  });

  plate.addEventListener("pointerup", (e) => {
    if (bowObj.held) return;
    const [u, v] = plateUV(e);
    const held = performance.now() - state.downAt;
    const moved = Math.hypot(u - state.downU, v - state.downV);
    const edge = Math.min(u, 1 - u, v, 1 - v);
    if (e.button === 0 && held < 280 && moved < 0.02 && edge >= BOW_ZONE) {
      // wait out the audio gate so the very first tap already rings
      initAudio().then(() => strikeBowl(bowlNote(u, v)));
      malletHitAt = performance.now();
      blastGrains(u, v, state.strike);
      state.disorder = Math.min(1, state.disorder + 0.35 + 0.3 * state.strike);
      state.intensity = Math.max(state.intensity, 0.3 + state.strike * 0.3);
    }
    state.pointerDown = false;
    state.bowing = false;
    state.bowSpeed = 0;
  });

  // ----------------------------------------------------------------- console

  function bindConsole() {
    const reverb = document.getElementById("ctl-reverb");
    const delay = document.getElementById("ctl-delay");
    const strike = document.getElementById("ctl-strike");
    const volume = document.getElementById("ctl-volume");
    volume.addEventListener("input", () => {
      const v = volume.value / 100;
      if (sound.control) sound.control.setVolume(v);
      else setMasterVolume(v);
    });
    reverb.addEventListener("input", () => {
      state.reverb = reverb.value / 100;
      if (audio.revGain) audio.revGain.gain.setTargetAtTime(state.reverb * 2.2, audio.ctx.currentTime, 0.1);
    });
    delay.addEventListener("input", () => {
      state.delay = delay.value / 100;
      if (audio.delayWet) {
        audio.delayWet.gain.setTargetAtTime(state.delay * 1.5, audio.ctx.currentTime, 0.1);
        audio.fb.gain.setTargetAtTime(0.3 + state.delay * 0.55, audio.ctx.currentTime, 0.1);
      }
    });
    strike.addEventListener("input", () => {
      state.strike = strike.value / 100;
    });
    document.querySelectorAll(".stamp").forEach((btn) => {
      btn.addEventListener("click", () => {
        initAudio();
        state.chord = btn.dataset.chord;
        document.querySelectorAll(".stamp").forEach((b) => {
          const on = b === btn;
          b.classList.toggle("on", on);
          b.setAttribute("aria-checked", on ? "true" : "false");
        });
      });
    });
    document.getElementById("ctl-reset").addEventListener("click", () => {
      initAudio();
      levelSand();
    });
  }

  // ---------------------------------------------------------------- plaque

  function plaqueFrame() {
    const audible = state.bowingActive || state.intensity > 0.04;
    if (audible) {
      const i = Math.max(0, Math.min(PATTERNS.length - 1, Math.round(state.modeFloat)));
      const bent = quantize(currentFreq()) * Math.pow(2, state.bend / 12);
      const mark = state.bend < 0 ? " ♭" : state.bend > 0 ? " ♯" : "";
      freqEl.textContent = `${Math.round(bent)} Hz · ${PATTERNS[i].label}${mark}`;
      if (!plaqueSinging) {
        freqEl.classList.add("singing");
        plaqueSinging = true;
      }
    } else if (plaqueSinging) {
      freqEl.textContent = "—";
      freqEl.classList.remove("singing");
      plaqueSinging = false;
    }
  }

  // ---------------------------------------------- portals over the painting

  const PORTAL_RECTS = [
    [".portal-window", 74, 106, 304, 462],
    [".portal-door", 1290, 160, 220, 585],
    [".portal-jar", 386, 376, 62, 88],
  ];

  function layoutPortals() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.max(vw / 1600, vh / 900);
    const ox = (vw - 1600 * s) / 2;
    const oy = (vh - 900 * s) / 2;
    for (const [sel, x, y, w, h] of PORTAL_RECTS) {
      const el = document.querySelector(sel);
      el.style.left = `${ox + x * s}px`;
      el.style.top = `${oy + y * s}px`;
      el.style.width = `${w * s}px`;
      el.style.height = `${h * s}px`;
    }
  }

  // ------------------------------------------------------------------- loop

  let lastT = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (bowObj.held) updateCarried(dt);
    const pointerBowing = state.bowing && state.pointerDown;
    if (pointerBowing) {
      updateBow(dt);
    } else if (state.keyStation !== null) {
      state.station = state.keyStation;
      state.bowLevel = 0.85;
    }
    state.bowingActive = pointerBowing || state.keyStation !== null;

    // portamento: pitch and figure glide to the committed station
    state.modeFloat += (state.station - state.modeFloat) * Math.min(1, dt * 9);
    if (Math.abs(state.modeFloat - computedModeFloat) > 0.02) {
      recomputeField(state.modeFloat);
    }
    if (state.station !== lastSlot) {
      lastSlot = state.station;
      updateStationGlow();
      // arriving at a new figure flings the sand — the drama is the point
      kickGrains((reducedMotion ? 0.5 : 1) * 0.005 * (0.4 + state.intensity));
    }

    if (state.bowingActive) {
      const target = Math.min(1, state.bowLevel);
      state.intensity += (target - state.intensity) * Math.min(1, dt * 4);
      // sustained bowing coaxes the sand back into order over a few seconds
      state.disorder = Math.max(0, state.disorder - dt * 0.22);
    } else {
      state.intensity *= Math.pow(0.35, dt);
      state.bowSpeed *= Math.pow(0.1, dt);
    }
    state.cursorSpeed *= Math.pow(0.05, dt);

    const busy =
      state.intensity > 0.004 ||
      state.avgGrainSpeed > 0.00004 ||
      (state.pointerOver && state.cursorSpeed > 0.0001);

    if (busy) simulate(dt);
    render();
    renderProps();
    renderRoom(dt);
    audioFrame();
    plaqueFrame();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------- boot

  engrave();
  updateStationGlow();
  seedGrains(8);
  fit();
  layoutPortals();
  bindConsole();
  requestAnimationFrame(frame);

  if (window.ElasticSoundControl) {
    sound.control = ElasticSoundControl.attach({
      start: () => {
        sound.on = true;
        if (audio.ctx) audio.ctx.resume().catch(() => {});
        if (sound.room && sound.room.paused) sound.room.play().catch(() => {});
        applyVolume();
      },
      stop: () => {
        sound.on = false;
        applyVolume();
      },
      setVolume: setMasterVolume,
    });
    sound.control.setVolume(sound.volume);
  }

  window.addEventListener("resize", () => {
    fit();
    layoutPortals();
  });

  window.__singingPlate = { state, MODES, recomputeField, currentFreq, levelSand };
})();
