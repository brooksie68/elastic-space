// The Fifteen Sisters — an evening.
// Fifteen glass pendulums, each a hair shorter than the last, released together.
// Sister i completes (22 + i) swings per grand cycle, so the row drifts through
// snakes, braids and chaos and snaps back into unison exactly once per cycle.
//
// All motion runs off one shared wave clock (waveU = fraction of a grand cycle),
// which makes tempo changes phase-continuous for free.

(() => {
  "use strict";

  // ------------------------------------------------------------- plate map
  // NDC hotspots exported by tmp/the-fifteen-sisters/build-salon.py (y down).
  const PLATE = { w: 1920, h: 1080 };
  const MAP = {
    doorTop: { x: 0.1228, y: 0.4793 },
    doorBottom: { x: 0.1228, y: 0.7914 },
    doorHalfW: 0.036,
    flame: { x: 0.8758, y: 0.5733 },
    incense: { x: 0.0507, y: 0.6759 },
    star: { x: 0.7736, y: 0.3004 },
    // window wall bbox is x 0.1677..0.8297, y 0.1445..0.7181; the city image
    // spans it with a hair of padding so no edge ever peeks into a window
    city: { x: 0.163, y: 0.095, w: 0.672 },
  };

  function coverTransform() {
    const W = innerWidth;
    const H = innerHeight;
    const s = Math.max(W / PLATE.w, H / PLATE.h);
    return { s, ox: (W - PLATE.w * s) / 2, oy: (H - PLATE.h * s) / 2 };
  }

  function plateXY(p) {
    const t = coverTransform();
    return { x: t.ox + p.x * PLATE.w * t.s, y: t.oy + p.y * PLATE.h * t.s };
  }

  // --------------------------------------------------------------- sisters
  const N = 15;
  const OSC_BASE = 22;         // swings per grand cycle for the longest sister
  const AMP = 0.42;            // angular amplitude, radians
  const TILT = 0.30;           // how much toward-viewer swing reads as screen drop
  const CASCADE_GAP = 0.45;    // seconds between cascade releases

  // rotated vantages: sisters recede along the rail; perspective with focal f = 1.
  // 45° quarter view: far sister scales to 0.42; 90° end-on view compresses harder, to 0.36.
  const DEPTH_GAP = 1.381 / (N - 1);
  const T_MAX = 1.381 / 2.381;
  const DEPTH_GAP_90 = 1.778 / (N - 1);
  const T_MAX_90 = 1.778 / 2.778;
  const perspOf = (i, gap) => 1 / (1 + i * gap);
  const fracOf = (i, gap, tmax) => (i * gap / (i * gap + 1)) / tmax;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (k) => k * k * (3 - 2 * k);

  let cycleT = 60;             // grand cycle, seconds
  let waveU = 0;               // grand-cycle fraction; the one true clock
  let vantage = 1;             // 0 = front, 1 = 45° quarter, 2 = 90° down the rail
  let viewPos = 1;             // continuous camera position, eases toward vantage
  let friction = false;        // Fading momentum: swings decay to stillness
  let chimesOn = true;         // whether the sisters speak at all
  let voices = "blend";        // glass (synth) | bowls (pitched bowl scale) | blend
  const FRICTION_TAU = 40;     // seconds for amplitude to fall to 1/e
  let pattern = "together";
  let releaseKind = null;      // last full-row release ("together" rings the bell)
  let bellBaseU = 0;           // wave clock at the together-release; bell rings each full cycle after
  let pendingAfterGather = null;
  let cascadeQueue = [];       // [{ index, atU }]

  const sisters = [];
  for (let i = 0; i < N; i++) {
    sisters.push({
      n: OSC_BASE + i,
      mode: "held",            // held | gather | swing
      amp: 1,                  // amplitude factor; friction wears it down
      theta: AMP,
      phase0: 0,
      target: AMP,
      gatherFrom: AMP,
      gatherStart: 0,
      gatherDur: 1.6,
      prevTheta: AMP,
    });
  }

  function sisterTheta(s, nowS) {
    if (s.mode === "swing") return AMP * s.amp * Math.cos(2 * Math.PI * s.n * waveU + s.phase0);
    if (s.mode === "gather") {
      const k = Math.min(1, (nowS - s.gatherStart) / s.gatherDur);
      const e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) {
        s.mode = "held";
        s.theta = s.target;
        return s.theta;
      }
      return s.gatherFrom + (s.target - s.gatherFrom) * e;
    }
    return s.theta;
  }

  function releaseSister(i) {
    const s = sisters[i];
    const startPhase = s.target < 0 ? Math.PI : 0;
    s.phase0 = startPhase - 2 * Math.PI * s.n * waveU;
    s.amp = 1; // a fresh release always starts with full swing
    s.mode = "swing";
  }

  function targetFor(i) {
    return pattern === "mirror" && i % 2 === 1 ? -AMP : AMP;
  }

  function gatherAll(nowS) {
    cascadeQueue = [];
    for (let i = 0; i < N; i++) {
      const s = sisters[i];
      s.target = targetFor(i);
      if (s.mode === "held" && Math.abs(s.theta - s.target) < 1e-4) continue;
      s.gatherFrom = sisterTheta(s, nowS);
      s.gatherStart = nowS;
      s.mode = "gather";
    }
  }

  function allHeld() {
    return sisters.every((s) => s.mode === "held");
  }

  function doRelease(nowS) {
    hideDropCall();
    cascadeQueue = [];
    if (pattern === "cascade") {
      releaseKind = "cascade";
      for (let i = 0; i < N; i++) {
        cascadeQueue.push({ index: i, atU: waveU + (CASCADE_GAP * i) / cycleT });
      }
    } else if (pattern === "byhand") {
      releaseKind = "byhand"; // sisters wait for clicks; Release lets the rest go
      for (let i = 0; i < N; i++) if (sisters[i].mode === "held") releaseSister(i);
    } else {
      releaseKind = pattern; // together | mirror
      bellBaseU = waveU;
      for (let i = 0; i < N; i++) releaseSister(i);
    }
  }

  // ------------------------------------------------------------------ dom
  const canvas = document.getElementById("scene");
  const ctx2d = canvas.getContext("2d");
  const ambience = document.getElementById("ambience");
  const citybed = document.getElementById("citybed");
  const bell = document.getElementById("bell");
  const bowl = document.getElementById("bowl");
  const doorExit = document.querySelector(".exit-door");
  const starExit = document.querySelector(".exit-star");
  const mothExit = document.querySelector(".exit-moth");
  const pull = document.querySelector(".cabinet-pull");
  const cabinet = document.getElementById("cabinet");
  const note = document.getElementById("cabinet-note");
  const dropCall = document.querySelector(".drop-call");

  function hideDropCall() {
    document.querySelector(".action-bar").classList.add("shown");
    if (dropCall.classList.contains("gone")) return;
    dropCall.classList.add("gone");
    setTimeout(() => { dropCall.hidden = true; }, 1000);
  }

  dropCall.addEventListener("click", () => doRelease(nowSeconds()));

  let W = 0;
  let H = 0;
  let dpr = 1;
  const birdCanvas = document.getElementById("birds");
  const bctx = birdCanvas.getContext("2d");
  let cityRect = { w: 0, h: 0 };

  function layoutHotspots() {
    const top = plateXY(MAP.doorTop);
    const bottom = plateXY(MAP.doorBottom);
    const t = coverTransform();
    const halfW = MAP.doorHalfW * PLATE.w * t.s;
    doorExit.style.left = `${top.x - halfW}px`;
    doorExit.style.top = `${top.y}px`;
    doorExit.style.width = `${halfW * 2}px`;
    doorExit.style.height = `${bottom.y - top.y}px`;

    const star = plateXY(MAP.star);
    starExit.style.left = `${star.x}px`;
    starExit.style.top = `${star.y}px`;

    // the invitation sits centred in the bench's rectangle — under the fruit,
    // above the rug — and scales with the plate. 34 plate-px fits the bench.
    const call = plateXY({ x: 0.5, y: 0.7765 }); // 0.795 - 20 plate-px
    dropCall.style.left = `${call.x}px`;
    dropCall.style.top = `${call.y}px`;
    dropCall.style.fontSize = `${34 * t.s}px`;

    // the city image rides the same cover transform as the plate (16:9 both,
    // so height fraction equals width fraction)
    const cityImg = document.querySelector(".city");
    const c0 = plateXY({ x: MAP.city.x, y: MAP.city.y });
    const cw = MAP.city.w * PLATE.w * t.s;
    const ch = (cw * 9) / 16;
    cityImg.style.left = `${c0.x}px`;
    cityImg.style.top = `${c0.y}px`;
    cityImg.style.width = `${cw}px`;
    cityImg.style.height = `${ch}px`;

    // the bird canvas rides the same rect
    birdCanvas.style.left = `${c0.x}px`;
    birdCanvas.style.top = `${c0.y}px`;
    birdCanvas.style.width = `${cw}px`;
    birdCanvas.style.height = `${ch}px`;
    cityRect = { w: cw, h: ch };
    birdCanvas.width = Math.round(cw * dpr);
    birdCanvas.height = Math.round(ch * dpr);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutHotspots();
  }
  addEventListener("resize", resize);

  // ------------------------------------------------------------- palettes
  const PALETTES = {
    rainbow: (i) => `hsl(${(i / (N - 1)) * 285}, 80%, 55%)`,
    moonlight: (i) => `hsl(${205 + (i / (N - 1)) * 50}, 32%, ${62 + (i / (N - 1)) * 14}%)`,
    ember: (i) => `hsl(${52 - (i / (N - 1)) * 48}, 88%, ${54 - (i / (N - 1)) * 10}%)`,
    seaglass: (i) => `hsl(${142 + (i / (N - 1)) * 46}, 48%, ${60 + (i / (N - 1)) * 10}%)`,
  };
  let palette = "rainbow";
  let form = "orb";
  let evening = "midnight";

  // One city painting per evening. Midnight and Candlelight share the night
  // plate — the interiors differ, the city outside doesn't.
  const CITY_SRCS = {
    dusk: "./assets/city/fifteen-sisters-city-sunset.png",
    midnight: "./assets/city/fifteen-sisters-city-midnight.png",
    candlelight: "./assets/city/fifteen-sisters-city-midnight.png",
  };

  function applyCitySrc() {
    const img = document.querySelector(".city");
    const want = CITY_SRCS[evening] || CITY_SRCS.dusk;
    if (!img.src.endsWith(want.replace("./", "/"))) img.src = want;
  }

  function parseHsl(str) {
    const m = /hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/.exec(str);
    return { h: +m[1], s: +m[2], l: +m[3] };
  }
  const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

  // Glass sprite bake: one offscreen canvas per sister, 4x supersampled.
  const SPRITE = 384; // px, ball drawn with radius SPRITE * 0.3
  let sprites = [];
  let glowColors = [];

  function formPath(g, cx, cy, R) {
    g.beginPath();
    if (form === "drop") {
      // teardrop: round belly, pointed crown toward the string
      g.moveTo(cx, cy - R * 1.28);
      g.bezierCurveTo(cx + R * 0.72, cy - R * 0.62, cx + R, cy - R * 0.1, cx + R, cy + R * 0.18);
      g.arc(cx, cy + R * 0.18, R, 0, Math.PI);
      g.bezierCurveTo(cx - R, cy - R * 0.1, cx - R * 0.72, cy - R * 0.62, cx, cy - R * 1.28);
    } else if (form === "lantern") {
      // faceted gem: octagonal lantern
      const pts = 8;
      for (let k = 0; k < pts; k++) {
        const a = (k / pts) * Math.PI * 2 - Math.PI / 8;
        const rr = R * (k % 2 === 0 ? 1.02 : 0.88);
        const x = cx + rr * Math.cos(a);
        const y = cy + rr * Math.sin(a);
        k === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath();
    } else {
      g.arc(cx, cy, R, 0, Math.PI * 2);
    }
  }

  function bakeSprites() {
    const warm = evening === "candlelight" ? 1.35 : evening === "midnight" ? 0.6 : 1.0;
    const rim = evening === "midnight" ? 1.3 : 1.0;
    sprites = [];
    glowColors = [];
    for (let i = 0; i < N; i++) {
      const c = parseHsl(PALETTES[palette](i));
      glowColors.push(c);
      const cv = document.createElement("canvas");
      cv.width = cv.height = SPRITE;
      const g = cv.getContext("2d");
      const cx = SPRITE / 2;
      const cy = SPRITE / 2;
      const R = SPRITE * 0.3;

      // soft colored halo behind the glass (windows shining through it)
      const halo = g.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.62);
      halo.addColorStop(0, hsl(c.h, c.s, Math.min(72, c.l + 12), 0.34));
      halo.addColorStop(1, hsl(c.h, c.s, c.l, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, SPRITE, SPRITE);

      g.save();
      formPath(g, cx, cy, R);
      g.clip();

      // glass body: luminous core falling to a deep saturated edge
      const body = g.createRadialGradient(cx - R * 0.1, cy - R * 0.28, R * 0.08, cx, cy, R * 1.18);
      body.addColorStop(0, hsl(c.h, c.s * 0.8, Math.min(86, c.l + 26), 0.95));
      body.addColorStop(0.5, hsl(c.h, c.s, c.l, 0.88));
      body.addColorStop(1, hsl(c.h, Math.min(100, c.s * 1.1), Math.max(10, c.l - 34), 0.96));
      g.fillStyle = body;
      g.fillRect(0, 0, SPRITE, SPRITE);

      // light gathered at the bottom of the glass
      const caustic = g.createRadialGradient(cx, cy + R * 0.62, R * 0.05, cx, cy + R * 0.62, R * 0.55);
      caustic.addColorStop(0, hsl(c.h, c.s * 0.55, Math.min(92, c.l + 34), 0.6));
      caustic.addColorStop(1, hsl(c.h, c.s, c.l, 0));
      g.fillStyle = caustic;
      g.fillRect(0, 0, SPRITE, SPRITE);

      if (form === "lantern") {
        // brighter heart for the faceted form
        const heart = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
        heart.addColorStop(0, hsl(c.h, c.s * 0.5, Math.min(94, c.l + 38), 0.75));
        heart.addColorStop(1, hsl(c.h, c.s, c.l, 0));
        g.fillStyle = heart;
        g.fillRect(0, 0, SPRITE, SPRITE);
        // facet lines
        g.strokeStyle = hsl(c.h, c.s * 0.4, Math.min(90, c.l + 30), 0.28);
        g.lineWidth = 1.4;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 - Math.PI / 8;
          g.beginPath();
          g.moveTo(cx, cy);
          g.lineTo(cx + R * 1.02 * Math.cos(a), cy + R * 1.02 * Math.sin(a));
          g.stroke();
        }
      }

      // rim from the sky behind — sunset rose, or cool blue after midnight
      const rimC = evening === "midnight" ? "190, 205, 255" : "255, 210, 185";
      const rimC2 = evening === "midnight" ? "215, 226, 255" : "255, 228, 205";
      const ring = g.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.02);
      ring.addColorStop(0, `rgba(${rimC}, 0)`);
      ring.addColorStop(0.86, `rgba(${rimC}, ${0.16 * rim})`);
      ring.addColorStop(0.97, `rgba(${rimC2}, ${0.4 * rim})`);
      ring.addColorStop(1, `rgba(${rimC}, 0)`);
      g.fillStyle = ring;
      g.fillRect(0, 0, SPRITE, SPRITE);

      // warm key from the candles (screen right)
      g.fillStyle = `rgba(255, 214, 150, ${0.85 * Math.min(1, warm)})`;
      g.beginPath();
      g.ellipse(cx + R * 0.42, cy - R * 0.42, R * 0.13, R * 0.09, -0.6, 0, Math.PI * 2);
      g.fill();
      // faint cool counter-spark
      g.fillStyle = "rgba(205, 220, 255, 0.4)";
      g.beginPath();
      g.ellipse(cx - R * 0.4, cy - R * 0.3, R * 0.07, R * 0.05, 0.5, 0, Math.PI * 2);
      g.fill();

      g.restore();
      sprites.push(cv);
    }
  }

  // --------------------------------------------------------------- chimes
  let actx = null;
  let chimeGain = null;
  let masterVol = 1;
  let soundOn = false;

  const SCALES = {
    penta: [0, 2, 4, 7, 9],                       // wind chimes
    major: [0, 2, 4, 5, 7, 9, 11],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    dom7: [0, 4, 7, 10],                          // arpeggiated dominant seventh
    harmonic: [0, 2, 4, 5, 7, 8, 11],             // harmonic major
  };
  let scaleName = "penta";
  let register = 0; // semitones; Deep drops every tuning a full octave (-12)
  function semisFor(i) {
    // longest sister (i = 0) = lowest note, rising up the chosen scale
    const s = SCALES[scaleName];
    return s[i % s.length] + 12 * Math.floor(i / s.length);
  }
  function freqFor(i) {
    return 130.81 * Math.pow(2, (semisFor(i) + register) / 12);
  }

  function ensureAudio() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.ratio.value = 8;
    comp.connect(actx.destination);
    chimeGain = actx.createGain();
    chimeGain.gain.value = masterVol;
    chimeGain.connect(comp);
    // a breath of air on the chimes
    const delay = actx.createDelay(1.0);
    delay.delayTime.value = 0.29;
    const fb = actx.createGain();
    fb.gain.value = 0.3;
    const wet = actx.createGain();
    wet.gain.value = 0.16;
    chimeGain.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(comp);
  }

  function playChime(i, vel) {
    if (!soundOn || !actx || actx.state !== "running") return;
    const t = actx.currentTime;
    const f = freqFor(i);
    const g = actx.createGain();
    // low sine tones read far quieter to the ear (equal-loudness): lift them,
    // or an all-low scale like chromatic all but disappears
    const loud = Math.min(2.6, Math.max(1, Math.pow(400 / f, 0.6)));
    const peak = 0.045 * (0.35 + 0.65 * vel) * loud;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
    const lp = actx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    g.connect(lp);
    lp.connect(chimeGain);

    const o1 = actx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = f;
    o1.connect(g);
    const g2 = actx.createGain();
    // more second-partial body on low notes so they carry
    g2.gain.value = 0.22 + Math.max(0, (300 - f) / 300) * 0.5;
    g2.connect(g);
    const o2 = actx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f * 2.004;
    o2.connect(g2);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 2.2);
    o2.stop(t + 2.2);
  }

  function playBowl(vel, semis = 0) {
    if (!soundOn) return;
    try {
      const strike = bowl.cloneNode();
      if (semis !== 0) {
        // pitch the one bowl sample along the scale (down too, for Deep register)
        strike.preservesPitch = false;
        strike.webkitPreservesPitch = false;
        strike.playbackRate = Math.pow(2, semis / 12);
      }
      const shrill = 1 / (1 + Math.max(0, semis) / 24); // upper strikes come in softer
      strike.volume = Math.min(1, 0.4 * masterVol * (0.5 + 0.5 * vel) * shrill);
      strike.play().catch(() => {});
    } catch (e) { /* the bowl rests */ }
  }

  function ringBell() {
    if (!soundOn) return;
    try {
      bell.currentTime = 0;
      bell.volume = 0.26 * masterVol;
      bell.play().catch(() => {});
    } catch (e) { /* bell is a luxury */ }
  }

  function applyVolume() {
    ambience.volume = 0.55 * masterVol;
    citybed.volume = 0.7 * masterVol; // happy medium per James (0.3 too shy, 1.0 too loud)
    if (chimeGain) chimeGain.gain.value = masterVol;
  }

  ElasticSoundControl.attach({
    start: () => {
      ensureAudio();
      applyVolume();
      const p = ambience.play();
      citybed.play().catch(() => {});
      if (actx && actx.state === "suspended") actx.resume();
      return Promise.resolve(p).then(() => { soundOn = true; });
    },
    stop: () => {
      soundOn = false;
      ambience.pause();
      citybed.pause();
      if (actx && actx.state === "running") actx.suspend();
    },
    setVolume: (v) => {
      masterVol = v;
      applyVolume();
    },
  });

  // ------------------------------------------------------------- controls
  pull.addEventListener("click", () => {
    const open = cabinet.hidden;
    cabinet.hidden = !open;
    pull.setAttribute("aria-expanded", String(open));
  });

  const vantageButtons = document.querySelectorAll(".vantage-bar button");
  vantageButtons.forEach((b) => {
    b.addEventListener("click", () => {
      vantage = Number(b.dataset.view);
      vantageButtons.forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
    });
  });

  const NOTES = {
    together: "Gather the sisters, then let them go as one.",
    cascade: "They will let go one after another.",
    mirror: "Odd sisters from the far side, even from the near.",
    byhand: "Gather them, then touch a sister to release her.",
  };

  document.querySelectorAll(".ctl-row").forEach((row) => {
    row.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".chip");
      if (!btn) return;
      row.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("on", c === btn);
        c.setAttribute("aria-checked", String(c === btn));
      });
      const setting = row.dataset.setting;
      const value = btn.dataset.value;
      if (setting === "palette") { palette = value; bakeSprites(); }
      if (setting === "form") { form = value; bakeSprites(); }
      if (setting === "evening") {
        evening = value;
        document.body.dataset.evening = value;
        applyCitySrc();
        bakeSprites();
      }
      if (setting === "cycle") cycleT = Number(value); // waveU keeps phase continuity
      if (setting === "friction") friction = value === "fading";
      if (setting === "chimes") chimesOn = value === "singing";
      if (setting === "voices") voices = value;
      if (setting === "scale") scaleName = value;
      if (setting === "register") register = value === "deep" ? -12 : 0;
      if (setting === "pattern") {
        pattern = value;
        document.body.dataset.byhand = value === "byhand" ? "1" : "";
        note.textContent = NOTES[value];
      }
    });
  });

  document.getElementById("btn-gather").addEventListener("click", () => {
    pendingAfterGather = null;
    gatherAll(nowSeconds());
  });

  document.getElementById("btn-release").addEventListener("click", () => {
    const t = nowSeconds();
    if (allHeld()) {
      doRelease(t);
    } else {
      gatherAll(t);
      pendingAfterGather = "release";
    }
  });

  // bottom-centre clones defer to the cabinet pair
  document.getElementById("btn-gather-2").addEventListener("click", () =>
    document.getElementById("btn-gather").click());
  document.getElementById("btn-release-2").addEventListener("click", () =>
    document.getElementById("btn-release").click());

  // by-hand touch: release the sister under the pointer
  canvas.style.pointerEvents = "none"; // exits/cabinet live above; we listen on window
  addEventListener("pointerdown", (ev) => {
    if (pattern !== "byhand") return;
    if (ev.target.closest(".cabinet, .cabinet-pull, .exit, .es-sound, .action-bar, .vantage-bar")) return;
    const hit = sisterAt(ev.clientX, ev.clientY);
    if (hit >= 0 && sisters[hit].mode === "held") releaseSister(hit);
  });

  addEventListener("pointermove", (ev) => {
    if (pattern !== "byhand") { document.body.classList.remove("over-sister"); return; }
    const hit = sisterAt(ev.clientX, ev.clientY);
    document.body.classList.toggle("over-sister", hit >= 0 && sisters[hit].mode === "held");
  });

  // ------------------------------------------------------------ rendering
  let ballCenters = []; // filled each frame for hit tests

  function metrics() {
    const beamY = H * 0.135;
    const left = W * 0.14;
    const right = W * 0.86;
    const Lmax = H * 0.63;
    const r = Math.max(18, Math.min(40, W * 0.022));
    // 45°: the rail recedes from near-left toward the centre arch
    const near = { x: W * 0.30, y: H * 0.075 };
    const far = { x: W * 0.64, y: H * 0.295 };
    // 90°: straight down the rail, vanishing at the centre arch (hair of x drift
    // so the nested sisters stay legible)
    const near90 = { x: W * 0.5, y: H * 0.05 };
    const far90 = { x: W * 0.508, y: H * 0.345 };
    return { beamY, left, right, Lmax, r, near, far, near90, far90 };
  }

  function sisterAt(px, py) {
    for (let i = 0; i < ballCenters.length; i++) {
      const b = ballCenters[i];
      if (!b) continue;
      const dx = px - b.x;
      const dy = py - b.y;
      if (dx * dx + dy * dy < b.r * b.r * 2.6) return i;
    }
    return -1;
  }

  // a rope from the (off-screen) ceiling down to the rail — just hanging there
  function drawRope(x, yBot, w, alpha) {
    if (alpha <= 0.01 || w < 0.8) return;
    ctx2d.globalAlpha = alpha;
    const grad = ctx2d.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, "#231a0e");
    grad.addColorStop(0.45, "#5c4726");
    grad.addColorStop(1, "#1a120a");
    ctx2d.strokeStyle = grad;
    ctx2d.lineWidth = w;
    ctx2d.lineCap = "round";
    ctx2d.beginPath();
    ctx2d.moveTo(x, -4);
    // a hair of slack so it hangs rather than stands
    ctx2d.quadraticCurveTo(x + w * 0.5, yBot * 0.5, x, yBot);
    ctx2d.stroke();
    // twist shading up the strand
    ctx2d.strokeStyle = "rgba(0, 0, 0, 0.32)";
    ctx2d.lineWidth = Math.max(0.6, w * 0.18);
    for (let y = 6; y < yBot - 4; y += w * 1.7) {
      const sag = Math.sin((y / yBot) * Math.PI) * w * 0.5;
      ctx2d.beginPath();
      ctx2d.moveTo(x + sag - w * 0.4, y);
      ctx2d.lineTo(x + sag + w * 0.4, y + w * 0.8);
      ctx2d.stroke();
    }
    // lashing where the rope takes the rail
    ctx2d.strokeStyle = "#3a2c15";
    ctx2d.lineWidth = Math.max(1, w * 0.5);
    for (let k = 0; k < 3; k++) {
      ctx2d.beginPath();
      ctx2d.moveTo(x - w * 0.9, yBot - w * (1.1 + k * 0.75));
      ctx2d.lineTo(x + w * 0.9, yBot - w * (0.8 + k * 0.75));
      ctx2d.stroke();
    }
    ctx2d.globalAlpha = 1;
  }

  function drawBeamFront(m, alpha) {
    if (alpha <= 0.01) return;
    ctx2d.globalAlpha = alpha;
    const h = Math.max(12, H * 0.015);
    const y = m.beamY - h / 2;
    const x0 = W * 0.055;
    const x1 = W * 0.945;
    // ropes first, so the rail sits over their lashings
    for (const f of [0.035, 0.5, 0.965]) {
      drawRope(lerp(x0, x1, f), y + h * 0.55, Math.max(3, h * 0.32), alpha);
    }
    const grad = ctx2d.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#2a2013");
    grad.addColorStop(0.28, "#6b5327");
    grad.addColorStop(0.55, "#3a2c15");
    grad.addColorStop(1, "#171008");
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(x0, y, x1 - x0, h);
    ctx2d.fillStyle = "rgba(255, 226, 160, 0.16)";
    ctx2d.fillRect(x0, y + h * 0.18, x1 - x0, 1);
    // end plates
    ctx2d.fillStyle = "#241a0d";
    ctx2d.fillRect(x0 - 4, y - h * 0.45, 8, h * 1.9);
    ctx2d.fillRect(x1 - 4, y - h * 0.45, 8, h * 1.9);
    ctx2d.globalAlpha = 1;
  }

  function drawBeamPersp(m, alpha, nearPt, farPt, farScale, nearH) {
    if (alpha <= 0.01) return;
    ctx2d.globalAlpha = alpha;
    const hN = Math.max(14, H * nearH);
    const hF = hN * farScale;
    // overshoot slightly past the first and last sister so the rail reads solid
    const nx = lerp(nearPt.x, farPt.x, -0.06);
    const ny = lerp(nearPt.y, farPt.y, -0.06);
    const fx = lerp(nearPt.x, farPt.x, 1.05);
    const fy = lerp(nearPt.y, farPt.y, 1.05);
    // ropes recede with the rail
    for (const u of [0.03, 0.5, 0.97]) {
      const hU = lerp(hN, hF, u);
      drawRope(lerp(nx, fx, u), lerp(ny, fy, u) + hU * 0.55, Math.max(1.2, hU * 0.32), alpha);
    }
    const grad = ctx2d.createLinearGradient(nx, ny, nx, ny + hN);
    grad.addColorStop(0, "#2a2013");
    grad.addColorStop(0.28, "#6b5327");
    grad.addColorStop(0.55, "#3a2c15");
    grad.addColorStop(1, "#171008");
    ctx2d.fillStyle = grad;
    ctx2d.beginPath();
    ctx2d.moveTo(nx, ny - hN / 2);
    ctx2d.lineTo(fx, fy - hF / 2);
    ctx2d.lineTo(fx, fy + hF / 2);
    ctx2d.lineTo(nx, ny + hN / 2);
    ctx2d.closePath();
    ctx2d.fill();
    // highlight along the top edge
    ctx2d.strokeStyle = "rgba(255, 226, 160, 0.16)";
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(nx, ny - hN * 0.3);
    ctx2d.lineTo(fx, fy - hF * 0.3);
    ctx2d.stroke();
    // near end plate
    ctx2d.fillStyle = "#241a0d";
    ctx2d.fillRect(nx - 4, ny - hN * 0.95, 8, hN * 1.9);
    ctx2d.globalAlpha = 1;
  }

  function draw(nowS, pos) {
    ctx2d.clearRect(0, 0, W, H);
    const m = metrics();
    // piecewise camera: pos 0..1 blends front->45°, pos 1..2 blends 45°->90°
    const mixA = smooth(Math.min(1, Math.max(0, pos)));       // front -> quarter
    const mixB = smooth(Math.min(1, Math.max(0, pos - 1)));   // quarter -> end-on
    drawBeamFront(m, 1 - mixA);
    drawBeamPersp(m, mixA * (1 - mixB), m.near, m.far, 0.42, 0.022);
    drawBeamPersp(m, mixB, m.near90, m.far90, 0.36, 0.034);

    const order = [];
    ballCenters = new Array(N);
    for (let i = 0; i < N; i++) {
      const s = sisters[i];
      s.prevTheta = s.theta;
      const th = sisterTheta(s, nowS);
      s.theta = th;
      const L = m.Lmax * Math.pow(OSC_BASE / s.n, 2);

      // front projection: row across the screen, swing toward the viewer
      const axF = m.left + ((m.right - m.left) * i) / (N - 1);
      const zF = L * Math.sin(th);
      const xF = axF;
      const yF = m.beamY + L * Math.cos(th) + zF * TILT;
      const rF = m.r * (1 + zF / (2.4 * H));

      // 45° quarter view: rail recedes toward the centre arch
      const psA = perspOf(i, DEPTH_GAP);
      const uA = fracOf(i, DEPTH_GAP, T_MAX);
      const axA = lerp(m.near.x, m.far.x, uA);
      const ayA = lerp(m.near.y, m.far.y, uA);
      const xA = axA + L * Math.sin(th) * psA;
      const yA = ayA + L * Math.cos(th) * psA;
      const rA = m.r * 1.5 * psA;
      const poolYA = lerp(H * 0.93, H * 0.47, uA);

      // 90° end-on view: sisters nested straight down the rail
      const psB = perspOf(i, DEPTH_GAP_90);
      const uB = fracOf(i, DEPTH_GAP_90, T_MAX_90);
      const axB = lerp(m.near90.x, m.far90.x, uB);
      const ayB = lerp(m.near90.y, m.far90.y, uB);
      const xB = axB + L * Math.sin(th) * psB;
      const yB = ayB + L * Math.cos(th) * psB;
      const rB = m.r * 1.7 * psB;
      const poolYB = lerp(H * 0.945, H * 0.44, uB);

      // blend front -> quarter, then quarter -> end-on
      const x = lerp(lerp(xF, xA, mixA), xB, mixB);
      const y = lerp(lerp(yF, yA, mixA), yB, mixB);
      const r = lerp(lerp(rF, rA, mixA), rB, mixB);
      const anchorX = lerp(lerp(axF, axA, mixA), axB, mixB);
      const anchorY = lerp(lerp(m.beamY, ayA, mixA), ayB, mixB);
      const poolY = lerp(lerp(H * 0.905, poolYA, mixA), poolYB, mixB);
      const poolK = lerp(lerp(1, 1.6 * psA, mixA), 1.7 * psB, mixB);
      // draw order: front sorts by swing depth, rotated views far-to-near
      const key = lerp(lerp(zF / L, -i * 0.2, mixA), -i * 0.2, mixB);
      order.push({ i, x, y, r, anchorX, anchorY, poolY, poolK, key, zF });
    }
    order.sort((a, b) => a.key - b.key);

    // colour pools on the stone floor
    ctx2d.globalCompositeOperation = "lighter";
    for (const o of order) {
      const c = glowColors[o.i];
      const near = (o.zF / (m.Lmax * Math.sin(AMP)) + 1) / 2; // 0 far .. 1 near
      const rx = m.r * (2.5 + near * 1.75) * o.poolK; // halved with the 2x sisters so pools stay calm
      const rot = Math.max(mixA, mixB);
      const a = (0.028 + near * 0.05) * lerp(1, 0.55 + (o.r / m.r) * 0.45, rot);
      const gr = ctx2d.createRadialGradient(o.x, o.poolY, 0, o.x, o.poolY, rx);
      gr.addColorStop(0, hsl(c.h, c.s, c.l, a));
      gr.addColorStop(1, hsl(c.h, c.s, c.l, 0));
      ctx2d.fillStyle = gr;
      ctx2d.beginPath();
      ctx2d.ellipse(o.x, o.poolY, rx, rx * 0.3, 0, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalCompositeOperation = "source-over";

    // threads, far to near — gossamer, as they were
    for (const o of order) {
      const k = o.r / m.r; // perspective factor of this sister
      ctx2d.strokeStyle = `rgba(226, 224, 238, ${0.16 + 0.08 * k})`;
      ctx2d.lineWidth = Math.max(0.6, k);
      ctx2d.beginPath();
      ctx2d.moveTo(o.anchorX, o.anchorY);
      ctx2d.lineTo(o.x, o.y);
      ctx2d.stroke();
      // collar ring on the rail
      ctx2d.fillStyle = "#8a6a35";
      ctx2d.fillRect(o.anchorX - 1.5 * k, o.anchorY - 2 * k, 3 * k, 4 * k);
    }

    // the sisters themselves
    for (const o of order) {
      const size = o.r * 2 * (SPRITE / (SPRITE * 0.6)); // sprite radius is 0.3 * SPRITE
      const half = size / 2;
      ctx2d.drawImage(sprites[o.i], o.x - half, o.y - half, size, size);
      ballCenters[o.i] = { x: o.x, y: o.y, r: o.r };
    }
  }

  // ---------------------------------------------------------- incense smoke
  // A slow wisp climbing from the incense table by the door. Puffs ride a
  // sinuous path that widens and thins as they rise.
  let smoke = [];
  let smokeAcc = 0;

  function updateSmoke(nowS, dt) {
    const t = coverTransform();
    const tip = plateXY(MAP.incense);
    smokeAcc += dt;
    while (smokeAcc > 0.4) {
      smokeAcc -= 0.4;
      smoke.push({
        born: nowS,
        life: 6 + Math.random() * 2.5,
        seed: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 14,
      });
    }
    if (smoke.length > 40) smoke = smoke.slice(-40);
    const rise = 46 * t.s; // px/s, scaled with the plate
    let alive = false;
    for (const p of smoke) {
      const age = nowS - p.born;
      const k = age / p.life;
      if (k >= 1) continue;
      alive = true;
      const sway = Math.sin(age * 1.1 + p.seed) * (4 + age * 5) * t.s;
      const x = tip.x + sway + p.drift * k * t.s;
      const y = tip.y - age * rise;
      const r = (2.2 + age * 2.6) * t.s;
      const a = 0.085 * (k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82);
      const g = ctx2d.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(205, 205, 220, ${a})`);
      g.addColorStop(1, "rgba(205, 205, 220, 0)");
      ctx2d.fillStyle = g;
      ctx2d.beginPath();
      ctx2d.arc(x, y, r, 0, Math.PI * 2);
      ctx2d.fill();
    }
    if (!alive) smoke = [];
  }

  // ---------------------------------------------------------- distant birds
  // Little black V's opening and closing, drifting past far over the city.
  // Positions are in city-canvas space (fractions of cityRect), so a resize
  // never scatters a flock.
  let flock = [];
  let nextFlockIn = 6 + Math.random() * 14;

  function spawnFlock() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const count = 3 + Math.floor(Math.random() * 5);
    const baseY = 0.28 + Math.random() * 0.24; // upper city — sky and spire tops
    const speed = (0.016 + Math.random() * 0.012) * dir; // city-widths per second
    for (let k = 0; k < count; k++) {
      flock.push({
        x: (dir > 0 ? -0.03 : 1.03) - dir * k * (0.012 + Math.random() * 0.02),
        y: baseY + (Math.random() - 0.5) * 0.08,
        vx: speed * (0.92 + Math.random() * 0.16),
        size: 0.0035 + Math.random() * 0.004, // wingspan as a fraction of city width
        flap: Math.random() * Math.PI * 2,
        flapRate: 4.5 + Math.random() * 3,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  function updateBirds(nowS, dt) {
    const { w: cw, h: ch } = cityRect;
    if (!cw) return;
    nextFlockIn -= dt;
    if (nextFlockIn <= 0 && flock.length === 0) {
      spawnFlock();
      nextFlockIn = 24 + Math.random() * 36;
    }
    bctx.clearRect(0, 0, cw, ch);
    if (!flock.length) return;
    bctx.strokeStyle = "rgba(12, 10, 18, 0.62)"; // distance haze, not pure black
    bctx.lineCap = "round";
    for (const b of flock) {
      b.x += b.vx * dt;
      b.flap += b.flapRate * dt;
      const x = b.x * cw;
      const y = (b.y + Math.sin(nowS * 0.5 + b.bob) * 0.006) * ch;
      const span = Math.max(2.5, b.size * cw);
      // the V opens and closes: wingtips ride the flap
      const lift = Math.sin(b.flap) * span * 0.75;
      bctx.lineWidth = Math.max(0.7, span * 0.16);
      bctx.beginPath();
      bctx.moveTo(x - span, y - lift);
      bctx.quadraticCurveTo(x - span * 0.3, y + span * 0.18, x, y);
      bctx.quadraticCurveTo(x + span * 0.3, y + span * 0.18, x + span, y - lift);
      bctx.stroke();
    }
    flock = flock.filter((b) => b.x > -0.08 && b.x < 1.08);
  }

  // ------------------------------------------------------------- the moth
  let mothSeed = Math.random() * 100;
  let mothResting = false;
  let mothRestTimer = 6 + Math.random() * 8;

  function updateMoth(nowS, dt) {
    const anchor = plateXY(MAP.flame);
    mothRestTimer -= dt;
    if (mothRestTimer <= 0) {
      mothResting = !mothResting;
      mothExit.classList.toggle("resting", mothResting);
      mothRestTimer = mothResting ? 3 + Math.random() * 5 : 7 + Math.random() * 9;
    }
    if (!mothResting) mothSeed += dt;
    const t = mothSeed;
    const rx = W * 0.045;
    const ry = H * 0.075;
    const x = anchor.x + Math.sin(t * 0.7) * rx + Math.sin(t * 1.9 + 1.3) * rx * 0.35;
    const y = anchor.y - H * 0.1 + Math.sin(t * 1.1 + 0.7) * ry + Math.sin(t * 2.7) * ry * 0.2;
    const rot = Math.sin(t * 1.3) * 14;
    mothExit.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
  }

  // ----------------------------------------------------------------- loop
  const t0ms = performance.now();
  const nowSeconds = () => (performance.now() - t0ms) / 1000;
  let lastS = 0;

  function frame() {
    if (W !== innerWidth || H !== innerHeight) resize();
    const nowS = nowSeconds();
    const dt = Math.min(0.1, nowS - lastS);
    lastS = nowS;

    const prevU = waveU;
    waveU += dt / cycleT;

    // cascade schedule
    while (cascadeQueue.length && waveU >= cascadeQueue[0].atU) {
      releaseSister(cascadeQueue.shift().index);
    }

    // gather-then-release
    if (pendingAfterGather === "release" && allHeld()) {
      pendingAfterGather = null;
      doRelease(nowS);
    }

    // friction wears the swings down to stillness
    if (friction) {
      const decay = Math.exp(-dt / FRICTION_TAU);
      for (const s of sisters) if (s.mode === "swing") s.amp *= decay;
    }

    // the hour strikes when the sisters come home to unison (not over stillness)
    if (releaseKind === "together" &&
        Math.floor(waveU - bellBaseU) > Math.floor(prevU - bellBaseU) &&
        sisters.some((s) => s.amp > 0.2)) {
      ringBell();
    }

    // camera swing between vantages (returning from 90° passes back through 45°)
    if (viewPos !== vantage) {
      const step = dt / 0.85;
      viewPos = viewPos < vantage
        ? Math.min(vantage, viewPos + step)
        : Math.max(vantage, viewPos - step);
    }

    draw(nowS, viewPos);

    // chimes: a sister hums as she passes centre, swinging away from us.
    // The longest sister strikes the low Tibetan bowl instead of her sine.
    if (chimesOn) {
      for (let i = 0; i < N; i++) {
        const s = sisters[i];
        if (s.mode !== "swing") continue;
        if (s.prevTheta > 0 && s.theta <= 0) {
          const vel = Math.min(1, Math.abs(s.theta - s.prevTheta) /
            (AMP * 2 * Math.PI * s.n * (dt / cycleT) + 1e-9));
          if (vel > 0.3) {
            if (voices === "bowls") playBowl(vel, semisFor(i) + register);
            else if (voices === "blend" && i === 0) playBowl(vel, register);
            else playChime(i, vel);
          }
        }
      }
    }

    updateSmoke(nowS, dt);
    updateBirds(nowS, dt);
    updateMoth(nowS, dt);
    requestAnimationFrame(frame);
  }

  document.body.dataset.evening = evening;
  applyCitySrc();
  resize();
  bakeSprites();
  requestAnimationFrame(frame);
})();
