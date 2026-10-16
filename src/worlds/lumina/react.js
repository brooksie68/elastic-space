// Lumina — react: the music-sensing core of the 2026-09-29 plan ("react
// incredibly intuitively to music"). Pure and DOM-free — music.js feeds it
// the analyser's byte spectrum and the track position every frame, the
// performance layer (perform.js) turns what it reports into moves you can
// see, and tmp/lumina/beat-lab.html + react-sim.mjs run this exact code.
//
// TIME. Three positions, all in track seconds:
//   pos     — where the audio element is (what enters the Web Audio graph)
//   heard   — pos minus the sound delay (speakers ~10–40 ms, Bluetooth
//             ~150–250 ms): the moment in the track you are hearing now
//   vis     — heard + one frame: what a frame drawn NOW should show, since
//             it reaches the screen at the next refresh
// Everything the eye sees is driven by `vis`. Detection runs on `pos` (it
// is what the analyser holds) and its results are pushed later to line up.
(function () {
  "use strict";

  const FRAME_LEAD = 0.017;
  // A hit → the frame whose spectral flux jumps: the STARTING guess. The
  // real figure is learned while a beat clock runs (createHits keeps a
  // running estimate from where kicks land against the beat) — beat-lab
  // measured ~80 ms for every band on the test track (kick 80–90, snare
  // 70–80, hat 70–90 against the grid), far more than the 43 ms window
  // alone explains, and the live analyser may differ from the offline one.
  const ANALYSIS_LAG = 0.08;
  let learnedLag = ANALYSIS_LAG; // shared across tracks for the session
  const lagSeen = []; // recent kick offsets past the beat (the median is the lag)

  // --- detectors ---------------------------------------------------------------
  // Spectral flux (how much each band got LOUDER since the last frame) against
  // its own last second and a half: a hit is a jump well above the band's
  // recent jumping. Works on dense bass where the old "bass above its
  // average" detector never fired (4 of 516 kicks, beat-lab 2026-09-29).
  const BANDS = {
    kick: [40, 130],
    snare: [1800, 6000],
    body: [150, 350],
    hat: [7000, 15000],
  };
  const JUDGE = {
    kick: { k: 1.35, floor: 2.2, refr: 0.11 },
    snare: { k: 1.6, floor: 1.6, refr: 0.1 },
    hat: { k: 1.6, floor: 1.2, refr: 0.06 },
  };
  const HIST = 90; // frames of history (~1.5 s at 60 fps)

  function createDetector(sampleRate, fftSize) {
    const binHz = sampleRate / fftSize;
    const range = {};
    Object.keys(BANDS).forEach((b) => {
      range[b] = [Math.max(1, Math.floor(BANDS[b][0] / binHz)), Math.ceil(BANDS[b][1] / binHz)];
    });
    let prev = null;
    const hist = { kick: [], snare: [], body: [], hat: [] };
    const last = { kick: -1e9, snare: -1e9, hat: -1e9 };
    let lastT = null;

    function flux(cur, r) {
      let s = 0;
      const hi = Math.min(r[1], cur.length - 1);
      for (let i = r[0]; i <= hi; i++) {
        const d = cur[i] - prev[i];
        if (d > 0) s += d;
      }
      return s / (hi - r[0] + 1);
    }
    function stats(a) {
      if (!a.length) return [0, 0];
      let m = 0;
      for (const v of a) m += v;
      m /= a.length;
      let v2 = 0;
      for (const v of a) v2 += (v - m) * (v - m);
      return [m, Math.sqrt(v2 / a.length)];
    }
    function reset() {
      prev = null;
      Object.keys(hist).forEach((k) => { hist[k].length = 0; });
      Object.keys(last).forEach((k) => { last[k] = -1e9; });
      lastT = null;
    }

    // freq: the analyser's byte spectrum. t: the track position it holds.
    function step(freq, t) {
      const out = { kick: false, snare: false, hat: false, strength: { kick: 0, snare: 0, hat: 0 } };
      // A seek (or a long stall) makes the old spectrum meaningless.
      if (lastT !== null && (t < lastT - 0.05 || t > lastT + 0.5)) reset();
      lastT = t;
      if (!prev) {
        prev = Uint8Array.from(freq);
        return out;
      }
      const f = {};
      Object.keys(range).forEach((b) => { f[b] = flux(freq, range[b]); });
      prev.set(freq);
      const judged = {};
      ["kick", "snare", "hat"].forEach((b) => {
        const j = JUDGE[b];
        const [m, sd] = stats(hist[b]);
        // Above its recent jumping by k deviations AND by a floor: steady
        // noise jitters, but never jumps by the floor.
        const thr = m + Math.max(j.k * sd, j.floor);
        judged[b] = hist[b].length >= 20 && f[b] > thr && t - last[b] > j.refr;
        if (judged[b]) out.strength[b] = Math.min(1, (f[b] - m) / Math.max(1e-3, 3 * sd + j.floor));
      });
      // A snare has a body; a hat doesn't. Noise with no body is a hat.
      if (judged.snare) {
        const [bm, bs] = stats(hist.body);
        if (!(f.body > bm + 0.4 * bs)) {
          judged.snare = false;
          const [hm, hs] = stats(hist.hat);
          if (!judged.hat && f.hat > hm + Math.max(JUDGE.hat.k * hs, JUDGE.hat.floor)) judged.hat = true;
        }
      }
      if (judged.snare) judged.hat = false;
      ["kick", "snare", "hat"].forEach((b) => {
        if (judged[b]) {
          out[b] = true;
          last[b] = t;
          if (!out.strength[b]) out.strength[b] = 0.6;
        }
      });
      Object.keys(hist).forEach((b) => {
        hist[b].push(f[b]);
        if (hist[b].length > HIST) hist[b].shift();
      });
      return out;
    }
    return { step, reset };
  }

  // --- the pattern: hits ON the beat, not after it -------------------------------
  // With a beat clock (the measured grid, or tapped), every bar is sixteen
  // steps. Each instrument keeps a running score per step: how often a
  // detection landed there lately. When the SEEN clock crosses a step that
  // scores high, the hit fires right then — predicted, zero lag, on the beat.
  // Breakdowns teach it fast: two bars without a kick and the kick goes quiet.
  // Detections that land on a step the pattern did NOT predict still fire,
  // delayed to line up with the sound (a new fill, the first kick back).
  const KINDS = ["kick", "snare", "hat"];
  const OCC_ON = 0.45;
  const OCC_RATE = 0.35;

  function createPattern() {
    const occ = {};
    const marks = {};
    const predicted = {};
    KINDS.forEach((k) => { occ[k] = new Float32Array(16); marks[k] = new Set(); predicted[k] = new Set(); });
    let lastVis = null;
    let lastClose = null;
    let lastClock = null;
    const phaseDiff = (a, b) => {
      const step = a.beatLen;
      let d = (a.firstDownbeat - b.firstDownbeat) % step;
      if (d > step / 2) d -= step;
      if (d < -step / 2) d += step;
      return d;
    };
    const mod16 = (k) => ((k % 16) + 16) % 16;
    const sOf = (clock, p) => (p - clock.firstDownbeat) / (clock.beatLen / 4);

    function reset() {
      KINDS.forEach((k) => { occ[k].fill(0); marks[k].clear(); predicted[k].clear(); });
      lastVis = null;
      lastClose = null;
    }

    // Called every frame with a clock. Returns predicted hits for the steps
    // the seen clock crossed this frame.
    function step(clock, vis, pos, lag) {
      const fired = { kick: 0, snare: 0, hat: 0, steps: { kick: [], snare: [], hat: [] } };
      // Relearn only when the clock REALLY changed: another tempo, or a
      // phase jump past a quarter of a step (the auto clock's small nudges
      // and a tap's fine correction keep what was learned).
      if (!lastClock || Math.abs(clock.beatLen - lastClock.beatLen) / lastClock.beatLen > 0.005 ||
          Math.abs(phaseDiff(clock, lastClock)) > clock.beatLen / 8) reset();
      lastClock = { firstDownbeat: clock.firstDownbeat, beatLen: clock.beatLen };
      // Close the scoring window of every step the ANALYSIS has fully passed.
      const sAna = sOf(clock, pos - lag);
      const closeTo = Math.floor(sAna - 0.5);
      if (lastClose === null || closeTo < lastClose - 1 || closeTo > lastClose + 64) lastClose = closeTo;
      for (let k = lastClose + 1; k <= closeTo; k++) {
        KINDS.forEach((kind) => {
          const hit = marks[kind].has(k) ? 1 : 0;
          const i = mod16(k);
          occ[kind][i] += (hit - occ[kind][i]) * OCC_RATE;
          marks[kind].delete(k);
          predicted[kind].delete(k - 32);
        });
      }
      lastClose = Math.max(lastClose, closeTo);
      // Fire what the seen clock crossed.
      const sVis = sOf(clock, vis);
      if (lastVis === null || sVis < lastVis - 0.5 || sVis > lastVis + 8) lastVis = sVis;
      for (let k = Math.floor(lastVis) + 1; k <= Math.floor(sVis); k++) {
        if (k < 0) continue;
        KINDS.forEach((kind) => {
          const o = occ[kind][mod16(k)];
          if (o >= OCC_ON && !predicted[kind].has(k)) {
            // Beats land hardest, eighths less, sixteenths least — so a busy
            // bass line under a four-on-the-floor still reads as the beat.
            const m = k % 4 === 0 ? 1 : k % 2 === 0 ? 0.65 : 0.45;
            fired[kind] = Math.max(fired[kind], Math.min(1, o * 1.25) * m);
            fired.steps[kind].push(k);
            predicted[kind].add(k);
          }
        });
      }
      lastVis = sVis;
      return fired;
    }

    // A detection at analysis position `pos`. Marks its step; answers whether
    // the pattern already fired (or is about to fire) that step.
    // Returns { covered, step }: covered = the pattern already fired (or is
    // about to fire) that step, so the detection must not fire again.
    function detected(kind, clock, pos, lag) {
      const s = sOf(clock, pos - lag);
      const k = Math.round(s);
      if (Math.abs(s - k) > 0.4) return { covered: false, step: null };
      marks[kind].add(k);
      if (predicted[kind].has(k)) return { covered: true, step: k };
      // Not seen yet, but the pattern will fire it when the clock gets there.
      const soon = lastVis !== null && k > Math.floor(lastVis) && occ[kind][mod16(k)] >= OCC_ON;
      return { covered: soon, step: k };
    }

    // A held detection fired this step already — the pattern must not.
    function spent(kind, k) {
      if (k !== null && k !== undefined) predicted[kind].add(k);
    }

    return { step, detected, spent, reset, occ };
  }

  // --- the hit router ------------------------------------------------------------
  // One object per track play. Per frame: detections in, hits out — predicted
  // ones on the step, the rest queued until the sound is actually heard.
  function createHits(sampleRate, fftSize) {
    const det = createDetector(sampleRate, fftSize);
    const pat = createPattern();
    const auto = createAutoTempo();
    const queue = [];
    function reset() {
      det.reset();
      pat.reset();
      auto.reset();
      queue.length = 0;
    }
    // Learn the detection lag from kicks against the beat: most kicks sit on
    // a beat, so the MEDIAN offset past the nearest beat is the lag (the odd
    // bass note between beats can't move a median).
    function learnLag(clock, pos) {
      const bl = clock.beatLen;
      let off = (pos - clock.firstDownbeat) % bl;
      if (off < 0) off += bl;
      if (off > bl * 0.6) off -= bl;
      if (off < -0.02 || off > 0.15) return;
      lagSeen.push(off);
      if (lagSeen.length > 48) lagSeen.shift();
      if (lagSeen.length >= 12) {
        const srt = lagSeen.slice().sort((x, y) => x - y);
        learnedLag = Math.max(0, srt[srt.length >> 1]);
      }
    }
    // clock may be null (no grid, no taps): then every detection is queued.
    function step(freq, pos, vis, clock) {
      const out = { kick: 0, snare: 0, hat: 0, detected: null };
      const d = det.step(freq, pos);
      out.detected = d;
      // The heard (auto) clock is right about TEMPO but only good to about
      // ±50 ms of phase on real kicks (beat-lab, 2026-09-29) — too loose to
      // fire hits ahead of the sound. On it, hits come from detection, lined
      // up with the sound; a measured grid or taps predict them exactly.
      if (clock && clock.source === "auto") clock = null;
      if (clock) {
        const p = pat.step(clock, vis, pos, learnedLag);
        KINDS.forEach((k) => {
          out[k] = Math.max(out[k], p[k]);
          // A held detection for a step the pattern just fired is spent.
          if (p.steps[k].length) {
            for (let i = queue.length - 1; i >= 0; i--) {
              if (queue[i].kind === k && queue[i].step !== null && p.steps[k].includes(queue[i].step)) queue.splice(i, 1);
            }
          }
        });
      }
      if (clock && d.kick && clock.source !== "auto") learnLag(clock, pos);
      if (d.kick) auto.add(pos - learnedLag, d.strength.kick);
      auto.step(pos);
      KINDS.forEach((k) => {
        if (!d[k]) return;
        const r = clock ? pat.detected(k, clock, pos, learnedLag) : { covered: false, step: null };
        if (!r.covered) queue.push({ kind: k, at: pos - learnedLag, s: 0.35 + 0.5 * d.strength[k], step: r.step });
      });
      // Release queued detections the eye should now see. Stale ones (a seek,
      // a paused tab) are dropped rather than burst.
      for (let i = queue.length - 1; i >= 0; i--) {
        const q = queue[i];
        if (q.at <= vis) {
          if (vis - q.at < 0.25) {
            out[q.kind] = Math.max(out[q.kind], q.s);
            pat.spent(q.kind, q.step);
          }
          queue.splice(i, 1);
        } else if (q.at > vis + 2) {
          queue.splice(i, 1);
        }
      }
      return out;
    }
    return { step, reset, pattern: pat, lag: () => learnedLag, auto: () => auto.get() };
  }

  // --- the tap clock ---------------------------------------------------------------
  // For tracks with no measured grid: tap four or more times on the beat,
  // starting on a downbeat. Taps are in HEARD time (you tap what you hear).
  function createTap() {
    let taps = [];
    let clock = null;
    function add(heard, wall) {
      if (taps.length && (wall - taps[taps.length - 1].wall > 2000 || heard < taps[taps.length - 1].heard)) taps = [];
      taps.push({ heard, wall });
      if (taps.length > 16) taps.shift();
      if (taps.length < 4) return clock;
      const iv = [];
      for (let i = 1; i < taps.length; i++) iv.push(taps[i].heard - taps[i - 1].heard);
      const sorted = iv.slice().sort((a, b) => a - b);
      const beatLen = sorted[sorted.length >> 1];
      if (!(beatLen > 0.2 && beatLen < 2)) return clock;
      if (iv.some((v) => Math.abs(v - beatLen) > beatLen * 0.2)) return clock;
      // Least-squares phase through all the taps, anchored on the first
      // (you start tapping on a downbeat).
      let ph = 0;
      taps.forEach((t, i) => { ph += t.heard - i * beatLen; });
      ph /= taps.length;
      clock = { firstDownbeat: ph, beatLen, barLen: beatLen * 4, phraseBars: 8, source: "tap" };
      return clock;
    }
    return {
      add,
      get: () => clock,
      clear() { taps = []; clock = null; },
      count: () => taps.length,
    };
  }

  // --- the auto clock ------------------------------------------------------------
  // For tracks with no measured grid and no taps: find the beat from the
  // kicks themselves. For each candidate tempo, how tightly do the recent
  // kicks line up on its eighth-note grid (the length of their mean unit
  // vector), weighted toward the usual tempos so a half- or double-time
  // reading loses. Adopted after two agreeing looks; kept through breakdowns.
  // The downbeat is a guess (the phase's first kick) — tap to fix it.
  function createAutoTempo() {
    const onsets = [];
    let clock = null;
    let cand = null;
    let lastEval = -1e9;
    function reset() { onsets.length = 0; clock = null; cand = null; lastEval = -1e9; }
    function estimate(now) {
      const recent = onsets.filter((o) => now - o.t < 12);
      if (recent.length < 12) return null;
      let wsum = 0;
      for (const o of recent) wsum += o.w;
      let pick = null;
      for (let bpm = 70; bpm <= 180; bpm += 0.25) {
        const P = 60 / bpm;
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        for (const o of recent) {
          const a = (2 * Math.PI * o.t) / P;
          // The phase leans on the STRONG hits (kicks outpunch bass notes).
          x1 += Math.cos(a) * o.w; y1 += Math.sin(a) * o.w;
          x2 += Math.cos(2 * a); y2 += Math.sin(2 * a);
        }
        // Kicks AND the bass notes between them sit on the eighth-note grid;
        // score the tempo by that, weighted toward the usual 95–150 BPM.
        const r8 = Math.hypot(x2, y2) / recent.length;
        const oct = Math.log2(bpm / 120) / 0.6;
        const score = r8 * Math.exp(-0.5 * oct * oct);
        if (!pick || score > pick.score) pick = { P, r8, score, ph: Math.atan2(y1, x1) };
      }
      if (!pick || pick.r8 < 0.5) return null;
      // Phase: the beats (not the offbeats) hold the majority of the kicks.
      let ph = (pick.ph / (2 * Math.PI)) * pick.P;
      ph += Math.floor((now - ph) / pick.P) * pick.P;
      return { beatLen: pick.P, phase: ph, r: pick.r8 };
    }
    // t: the kick's sound time (analysis pos − lag).
    function add(t, strength) {
      const w = Math.max(0.05, strength || 0.5);
      onsets.push({ t, w: w * w });
      while (onsets.length && t - onsets[0].t > 14) onsets.shift();
    }
    // How well the clock fits the recent kicks: the share within 60 ms of a
    // beat or an offbeat.
    function fit(now) {
      let n = 0;
      let good = 0;
      const half = clock.beatLen / 2;
      for (const o of onsets) {
        if (now - o.t > 8) continue;
        n++;
        let d = (o.t - clock.firstDownbeat) % half;
        if (d < 0) d += half;
        if (d < 0.06 || half - d < 0.06) good++;
      }
      return n ? good / n : 1;
    }
    // Once locked, TRACK: every half second the recent kicks say how far
    // off the beat the clock sits and whether it is drifting; the clock is
    // nudged, never replaced, unless the tempo really changed.
    let lastTrack = -1e9;
    function track(now) {
      const bl = clock.beatLen;
      const errs = [];
      for (const o of onsets) {
        if (now - o.t > 8) continue;
        let d = (o.t - clock.firstDownbeat) % bl;
        if (d < 0) d += bl;
        if (d > bl / 2) d -= bl;
        if (Math.abs(d) < 0.06) errs.push({ t: o.t, d });
      }
      if (errs.length < 6) return;
      const med = (arr) => { const x = arr.map((e) => e.d).sort((a, b) => a - b); return x[x.length >> 1]; };
      clock.firstDownbeat += clamp1(med(errs) * 0.5, 0.012);
      const early = errs.filter((e) => now - e.t > 4);
      const late = errs.filter((e) => now - e.t <= 4);
      if (early.length >= 3 && late.length >= 3) {
        const slope = (med(late) - med(early)) / 4; // seconds of drift per second
        clock.beatLen = bl * (1 + clamp1(slope * 0.5, 0.002));
        clock.barLen = clock.beatLen * 4;
      }
    }
    function clamp1(v, m) { return Math.max(-m, Math.min(m, v)); }
    function step(now) {
      if (clock && now - lastTrack > 0.5) { lastTrack = now; track(now); }
      if (now - lastEval < 2) return clock;
      lastEval = now;
      const e = estimate(now);
      if (!e) return clock;
      const agrees = cand && Math.abs(e.beatLen - cand.beatLen) / cand.beatLen < 0.01;
      cand = e;
      if (!agrees) return clock;
      if (!clock) {
        clock = { firstDownbeat: e.phase, beatLen: e.beatLen, barLen: e.beatLen * 4, phraseBars: 8, source: "auto" };
      } else if (Math.abs(e.beatLen - clock.beatLen) / clock.beatLen > 0.012 && fit(now) < 0.5) {
        // A real tempo change (or a better reading): start over from it.
        clock = { firstDownbeat: e.phase, beatLen: e.beatLen, barLen: e.beatLen * 4, phraseBars: 8, source: "auto" };
      }
      return clock;
    }
    return { add, step, reset, get: () => clock };
  }

  // Musical position from a clock at a (seen) track position.
  function clockAt(clock, p) {
    if (!clock) return null;
    const beats = (p - clock.firstDownbeat) / clock.beatLen;
    const bars = beats / 4;
    const phraseBars = clock.phraseBars || 8;
    return {
      beats,
      beat: Math.floor(beats),
      beatPhase: beats - Math.floor(beats),
      bar: Math.floor(bars) + 1,
      barPhase: bars - Math.floor(bars),
      phrase: Math.floor(Math.floor(bars) / phraseBars),
      beatLen: clock.beatLen,
      barLen: clock.beatLen * 4,
    };
  }

  // The next beat or bar boundary after track position p (for cuts that
  // land on the beat).
  function nextBoundary(clock, p, unit) {
    const len = unit === "bar" ? clock.beatLen * 4 : clock.beatLen;
    const n = Math.floor((p - clock.firstDownbeat) / len + 1e-6) + 1;
    return clock.firstDownbeat + n * len;
  }

  // --- energy ------------------------------------------------------------------------
  // How loud the song is right now against the WHOLE song — so a breakdown
  // reads calm and a drop reads big. Grid tracks: the measured per-bar energy
  // (offline), stretched between its quiet and loud ends. Other tracks: a
  // running loudness against slowly adapting quiet/loud marks. Also reports
  // DROPS (a jump from quiet to loud) for the autopilot.
  function gridEnergyTable(grid) {
    if (!grid || !Array.isArray(grid.barEnergy) || !grid.barEnergy.length) return null;
    if (grid.__energy) return grid.__energy;
    const v = grid.barEnergy.slice(0, -1).filter((x) => x > 0.02);
    const s = v.slice().sort((a, b) => a - b);
    const lo = s[Math.floor(s.length * 0.08)] || 0;
    const hi = s[Math.floor(s.length * 0.95)] || 1;
    const t = grid.barEnergy.map((x) => Math.max(0, Math.min(1, (x - lo) / Math.max(0.05, hi - lo))));
    Object.defineProperty(grid, "__energy", { value: t, enumerable: false });
    return t;
  }

  function createEnergy() {
    let lvl = null;
    let lo = null;
    let hi = null;
    let e = 0.5;
    let quietSince = -1e9;
    let lastDrop = -1e9;
    function reset() { lvl = null; lo = null; hi = null; e = 0.5; }
    // raw: {bass, lowmid, mid, high} raw band means (0..1). vis: seen time.
    function step(raw, dt, vis, grid) {
      let target;
      const table = gridEnergyTable(grid);
      if (table && grid.firstDownbeat !== undefined) {
        const b = (vis - grid.firstDownbeat) / grid.barLen;
        const i = Math.max(0, Math.min(table.length - 1, Math.floor(b)));
        const j = Math.min(table.length - 1, i + 1);
        const f = Math.max(0, Math.min(1, b - Math.floor(b)));
        // Ease into the next bar over its last quarter only — the bar's own
        // energy holds, so a drop lands ON its bar.
        const k = f > 0.75 ? (f - 0.75) * 4 : 0;
        target = b < 0 ? table[0] * 0.6 : table[i] + (table[j] - table[i]) * k;
      } else {
        const now = raw ? (raw.bass * 1.4 + raw.lowmid + raw.mid + raw.high * 0.6) / 4 : 0;
        lvl = lvl === null ? now : lvl + (now - lvl) * (1 - Math.exp(-dt / 1.2));
        if (lo === null) { lo = lvl; hi = lvl + 0.05; }
        lo = lvl < lo ? lvl : lo + (lvl - lo) * (1 - Math.exp(-dt / 30));
        hi = lvl > hi ? lvl : hi + (lvl - hi) * (1 - Math.exp(-dt / 30));
        target = (lvl - lo) / Math.max(0.06, hi - lo);
      }
      target = Math.max(0, Math.min(1, target));
      const prevE = e;
      e += (target - e) * (1 - Math.exp(-dt / (target > e ? 0.25 : 0.9)));
      let drop = false;
      if (e < 0.35) quietSince = vis;
      if (prevE < 0.6 && e >= 0.6 && vis - quietSince < 6 && vis - lastDrop > 8) {
        drop = true;
        lastDrop = vis;
      }
      return { energy: e, drop };
    }
    return { step, reset };
  }

  // --- pre-wiring: every look ships with hits that READ -------------------------
  // How much each hit drives each move, decided from the look itself. The
  // lesson from beat-lab: growing tiles that already touch shows nothing (the
  // "kickwall" reference look — 70 px tiles on a 62 px pitch — moved 0.9 of
  // 255 on the kick). Walls get zoom + flash; sparse fields get swell.
  function lum(hex) {
    const n = parseInt(String(hex || "#000000").slice(1), 16);
    return (((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722) / 255;
  }
  const ROUNDISH = { circle: 0.78, ring: 0.45, star: 0.45, diamond: 0.5, triangle: 0.45, hexagon: 0.85, chevron: 0.5, slit: 0.3, cross: 0.5 };
  function coverage(cfg) {
    const px = 32 + (cfg.gapX || 0);
    const py = 32 + (cfg.gapY || 0);
    const ts = cfg.tileSize || 32;
    let c = Math.min(1, (ts / px)) * Math.min(1, (ts / py));
    c *= ROUNDISH[cfg.shape] || 1;
    if (cfg.fill === false && cfg.layout === "grid") c *= 0.85;
    return c;
  }
  function prewire(cfg) {
    const cover = coverage(cfg);
    const scene = cfg.scene && cfg.scene !== "none" ? (cfg.sceneMix || 0) : 0;
    const wall = cover > 0.62 || (scene > 0.6 && (cfg.sceneTiles || 0) < 0.4);
    const sparse = cover < 0.3 && scene < 0.5;
    const dark = Math.max(lum(cfg.high), lum(cfg.low)) < 0.35;
    return {
      cover,
      kick: {
        zoom: wall ? 1 : sparse ? 0.45 : 0.75,
        swell: wall ? 0 : sparse ? 1.2 : 0.8,
        flash: (wall ? 0.55 : 0.3) + (dark ? 0.2 : 0),
      },
      snare: { flash: dark ? 1 : 0.8, hue: 0.6 },
      hat: { flash: 0.14, swell: wall ? 0 : 0.2 },
    };
  }

  globalThis.LuminaReact = {
    FRAME_LEAD,
    ANALYSIS_LAG,
    KINDS,
    createDetector,
    createPattern,
    createHits,
    createTap,
    createAutoTempo,
    createEnergy,
    clockAt,
    nextBoundary,
    gridEnergyTable,
    prewire,
    coverage,
  };
})();
