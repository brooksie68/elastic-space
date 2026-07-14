// Coach 9 — a window seat on a train that never arrives.
// The landscape is one long procedural loop (LOOP near-layer units) drawn on a
// canvas that sits behind the SVG interior; the canvas adopts the SVG's
// xMidYMid-slice transform so everything is authored in 1920x1080 viewBox units.
(() => {
  "use strict";

  const canvas = document.getElementById("landscape");
  const ctx = canvas.getContext("2d");

  const VB_W = 1920;
  const VB_H = 1080;
  const HOLE = { x: 150, y: 110, w: 1620, h: 630, r: 46 };
  const HORIZON = HOLE.y + HOLE.h * 0.47;
  const HOLE_BOTTOM = HOLE.y + HOLE.h;

  const LOOP = 64000;      // near-layer viewBox units per loop (~3 min + stop)
  const CRUISE = 340;      // near-layer units/s at full speed

  // ------------------------------------------------------------------ helpers
  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function smooth(u) { return u * u * (3 - 2 * u); }

  function parseHex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mixHex(a, b, u) {
    const ca = parseHex(a), cb = parseHex(b);
    return "rgb(" + Math.round(lerp(ca[0], cb[0], u)) + "," +
      Math.round(lerp(ca[1], cb[1], u)) + "," + Math.round(lerp(ca[2], cb[2], u)) + ")";
  }
  function shade(c, u) { return mixHex(c, u > 0 ? "#ffffff" : "#1e1828", Math.abs(u)); }

  // looping value noise on a layer's scroll space
  function vnoise(x, span, step, seed) {
    const cells = Math.max(4, Math.round(span / step));
    const cellW = span / cells;
    const u = ((x % span) + span) % span / cellW;
    const i = Math.floor(u);
    const f = smooth(u - i);
    const a = hash((i % cells) + seed);
    const b = hash(((i + 1) % cells) + seed);
    return lerp(a, b, f);
  }

  // ------------------------------------------------------------- view fitting
  let viewScale = 1, viewOX = 0, viewOY = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    viewScale = Math.max(innerWidth / VB_W, innerHeight / VB_H) * dpr;
    viewOX = (canvas.width - VB_W * viewScale) / 2;
    viewOY = (canvas.height - VB_H * viewScale) / 2;
  }
  addEventListener("resize", resize);
  resize();

  // ------------------------------------------------------------- the palette
  // keyframes across the loop; t must start at 0 and end at 1 with equal colors
  const KEYS = [
    { t: 0.00, sky: ["#f2b57e", "#fbdcae", "#fff0d2"], sun: 0.85, far: "#dc9f92", hill: "#e2bd88", f1: "#c3d49b", f2: "#e5d9a2", near: "#a9c98b", line: "#8a6b52", cloud: "#fff0dd", water: "#f6d9b0" },
    { t: 0.24, sky: ["#eec9a2", "#f8e3c0", "#fdf0d8"], sun: 0.6, far: "#cfa49b", hill: "#d8bd90", f1: "#bccf9d", f2: "#ddd5a4", near: "#a3c48d", line: "#84685a", cloud: "#fdf0e2", water: "#e8d8bc" },
    { t: 0.40, sky: ["#a8cbe0", "#cfe3e8", "#f0ead8"], sun: 0.25, far: "#93aec2", hill: "#a8c2a4", f1: "#a9c8a4", f2: "#cdd6ac", near: "#95bd94", line: "#6e7a68", cloud: "#f4f6f0", water: "#cfe6e4" },
    { t: 0.56, sky: ["#9fc6df", "#cfe3e6", "#eef0dc"], sun: 0.35, far: "#9db8c8", hill: "#afc7a6", f1: "#aecaa2", f2: "#d3d9ab", near: "#9cc294", line: "#71806b", cloud: "#f6f8f2", water: "#c8e2e2" },
    { t: 0.70, sky: ["#c2c8de", "#e3d9e0", "#f7e8d6"], sun: 0.3, far: "#a8a6bd", hill: "#bdbd9d", f1: "#b5c79c", f2: "#dcd3a8", near: "#a3bf8e", line: "#7b7264", cloud: "#f6ece4", water: "#d4dce0" },
    { t: 0.86, sky: ["#c9aed3", "#e9c9ce", "#fbe3c6"], sun: 0.55, far: "#b193a8", hill: "#cfae90", f1: "#bcc898", f2: "#e0d19e", near: "#a6c188", line: "#7f6a5c", cloud: "#f9e6da", water: "#e6d2c6" },
    { t: 1.00, sky: ["#f2b57e", "#fbdcae", "#fff0d2"], sun: 0.85, far: "#dc9f92", hill: "#e2bd88", f1: "#c3d49b", f2: "#e5d9a2", near: "#a9c98b", line: "#8a6b52", cloud: "#fff0dd", water: "#f6d9b0" },
  ];

  function palette(t) {
    let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
    }
    const u = smooth(clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1));
    const out = { sky: [], sun: lerp(a.sun, b.sun, u) };
    for (let i = 0; i < 3; i++) out.sky[i] = mixHex(a.sky[i], b.sky[i], u);
    for (const k of ["far", "hill", "f1", "f2", "near", "line", "cloud", "water"]) {
      out[k] = mixHex(a[k], b[k], u);
    }
    return out;
  }

  // ------------------------------------------------------------------ layers
  const F_CLOUD = 0.045, F_FAR = 0.07, F_HILL = 0.16, F_MID = 0.38, F_NEAR = 1.0, F_POLE = 1.35, F_TRACK = 1.55;

  function makeItems(f, spacing, seed, keepChance) {
    const span = LOOP * f;
    const n = Math.max(2, Math.round(span / spacing));
    const items = [];
    for (let i = 0; i < n; i++) {
      if (hash(i * 7.13 + seed) > keepChance) continue;
      items.push({
        x: (i + 0.5) * (span / n) + (hash(i + seed) - 0.5) * spacing * 0.8,
        r1: hash(i * 3.7 + seed + 50),
        r2: hash(i * 5.1 + seed + 90),
      });
    }
    return items;
  }

  const clouds = makeItems(F_CLOUD, 460, 11, 0.8);
  const midTrees = makeItems(F_MID, 560, 23, 0.55);
  const midHouses = makeItems(F_MID, 2900, 37, 0.55);
  const nearFlowers = makeItems(F_NEAR, 46, 41, 0.75);
  const trackBushes = makeItems(F_TRACK, 1500, 53, 0.7);

  // patchwork field boundaries over the mid layer
  const patches = [];
  (() => {
    const span = LOOP * F_MID;
    let x = 0, k = 0;
    while (x < span) {
      const w = Math.min(380 + 640 * hash(k * 2.3 + 71), span - x);
      patches.push({ x0: x, x1: x + w, v: hash(k * 4.7 + 113) });
      x += w; k++;
    }
  })();

  // ------------------------------------------------------------- set pieces
  const TUNNEL0 = 0.30 * LOOP, TUNNEL1 = 0.36 * LOOP;
  const STATION_T = 0.68;
  const stationX = STATION_T * LOOP;          // near-layer, sign position

  const SYLL = ["va", "le", "mi", "ra", "so", "len", "nu", "vel", "ari", "sen", "ola", "tir", "au", "ne"];
  function simName(seed) {
    const pick = (n) => SYLL[Math.floor(hash(seed + n) * SYLL.length)];
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    return cap(pick(1) + pick(2)) + " " + cap(pick(3) + pick(4));
  }
  const stationName = simName(Math.floor(Math.random() * 1000));

  // pieces the child points at: near-layer trigger positions + a draw hook
  const setPieces = [
    { t: 0.115, f: F_MID, seen: -1 },   // pastel cows
    { t: 0.205, f: F_MID, seen: -1 },   // pond and rowboat
    { t: 0.50, f: F_FAR, seen: -1 },    // the giant, far off
  ];

  // --------------------------------------------------------------- the train
  let pos = 0.02 * LOOP;
  let mult = 1;
  let state = "CRUISE";
  let stopTimer = 0, accelT = 0;
  let loopCount = 0;

  function wrapNear(x) {
    let d = (x - pos) % LOOP;
    if (d < -LOOP / 2) d += LOOP;
    if (d > LOOP / 2) d -= LOOP;
    return d;
  }

  function stepTrain(dt) {
    const stopAt = stationX - HOLE.w / 2; // sign lands mid-window
    const rem = ((stopAt - pos) % LOOP + LOOP) % LOOP;
    if (state === "CRUISE" && rem < 2600) state = "DECEL";
    if (state === "DECEL") {
      mult = Math.max(0.02, Math.sqrt(rem / 2600));
      if (rem < 4) { state = "STOPPED"; stopTimer = 9; mult = 0; }
    } else if (state === "STOPPED") {
      mult = 0;
      stopTimer -= dt;
      if (stopTimer <= 0) { state = "ACCEL"; accelT = 0; }
    } else if (state === "ACCEL") {
      accelT += dt / 8;
      mult = smooth(clamp(accelT, 0, 1));
      if (accelT >= 1) state = "CRUISE";
    }
    const prev = pos;
    pos = (pos + CRUISE * mult * dt) % LOOP;
    if (pos < prev) loopCount++;
  }

  // ------------------------------------------------------------ scene pieces
  function drawCow(x, y, sc, tint) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(26, -10, 11, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(tint, -0.25);
    ctx.beginPath(); ctx.ellipse(-8, -4, 9, 6, 0.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, 6, 7, 5, -0.3, 0, 7); ctx.fill();
    ctx.fillRect(-18, 14, 5, 10); ctx.fillRect(12, 14, 5, 10);
    ctx.restore();
  }

  function drawBoat(x, y, sc) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = "#d98a74";
    ctx.beginPath();
    ctx.moveTo(-34, 0); ctx.quadraticCurveTo(0, 18, 34, 0);
    ctx.lineTo(26, -8); ctx.lineTo(-26, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a5a48"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -34); ctx.stroke();
    ctx.fillStyle = "#fbf3e0";
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(22, -14); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawGiant(x, baseY, pal) {
    // a familiar silhouette, very far away, minding its own business
    const c = shade(pal.far, -0.18);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, baseY, 95, 105, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.18 + i * 0.16);
      const px = x + Math.cos(a) * 92, py = baseY - 8 + Math.sin(a) * 96;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * 34, py + Math.sin(a) * 34);
    }
    ctx.strokeStyle = c; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawHouse(x, y, sc, r) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.fillStyle = r > 0.5 ? "#f3ded1" : "#e8d3c8";
    ctx.fillRect(-22, -18, 44, 22);
    ctx.fillStyle = "#c98d80";
    ctx.beginPath(); ctx.moveTo(-27, -18); ctx.lineTo(0, -36); ctx.lineTo(27, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8a6b52"; ctx.fillRect(-4, -10, 9, 14);
    ctx.restore();
  }

  function drawTree(x, y, sc, r, pal) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.strokeStyle = "#8a6b52"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
    ctx.fillStyle = shade(pal.near, r * 0.3 - 0.25);
    ctx.beginPath(); ctx.arc(0, -38, 20 + r * 8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-13, -28, 12 + r * 5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -28, 12 + r * 5, 0, 7); ctx.fill();
    ctx.restore();
  }

  // items wrap around their layer's loop; cb receives viewBox x inside the hole
  function eachWrapped(worldX, f, margin, cb) {
    const span = LOOP * f;
    let x = ((worldX - pos * f) % span + span) % span;
    if (x < HOLE.w + margin) cb(HOLE.x + x);
    if (x - span > -margin) cb(HOLE.x + x - span);
  }

  // --------------------------------------------------------------- the frame
  const svgCoach = document.getElementById("coach");
  const reflection = document.getElementById("reflection");
  const childEl = document.getElementById("child");
  const womanEl = document.getElementById("woman");
  const bookEl = document.getElementById("book");
  const eyesDown = document.getElementById("eyes-down");
  const eyesUp = document.getElementById("eyes-up");

  let bumpY = 0, bumpV = 0, nextBump = 6;
  let pointT = 0, pageT = 14, pageAnim = 0;
  let smoothDark = 0;

  function stepInterior(dt, now) {
    // sway + occasional joint bump
    nextBump -= dt * mult;
    if (nextBump <= 0) { bumpV += 26 + Math.random() * 22; nextBump = 8 + Math.random() * 9; }
    bumpV += (-60 * bumpY - 7 * bumpV) * dt;
    bumpY += bumpV * dt;
    const sway = (Math.sin(now * 0.9) * 2.1 + Math.sin(now * 2.33) * 0.9) * mult + bumpY * 0.12;
    svgCoach.setAttribute("transform", "translate(0 " + sway.toFixed(2) + ")");

    // the child spots things
    if (pointT > 0) {
      pointT -= dt;
      if (pointT <= 0) {
        childEl.classList.remove("pointing");
        womanEl.classList.remove("looking");
        eyesUp.style.display = "none";
        eyesDown.style.display = "";
      }
    }

    // page turns
    pageT -= dt;
    if (pageT <= 0) { bookEl.classList.add("turning"); pageAnim = 0.6; pageT = 16 + Math.random() * 14; }
    if (pageAnim > 0) { pageAnim -= dt; if (pageAnim <= 0) bookEl.classList.remove("turning"); }
  }

  function spot() {
    if (pointT > 0) return;
    pointT = 4.5;
    childEl.classList.add("pointing");
    womanEl.classList.add("looking");
    eyesDown.style.display = "none";
    eyesUp.style.display = "";
  }

  // ------------------------------------------------------------------- audio
  let actx = null, masterGain, tunnelFilter, rumbleGain, hissGain, noiseBuf;
  let masterOn = false, masterVol = 0.8, nextClack = 0;
  let wantMusic = true, musicBroken = false;
  const music = new Audio("./assets/audio/coach-9-music-1.mp3");
  music.loop = true;
  music.addEventListener("error", () => { musicBroken = true; refreshCassette(); });

  function ensureAudio() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = new AC();
    masterGain = actx.createGain(); masterGain.gain.value = masterVol;
    tunnelFilter = actx.createBiquadFilter();
    tunnelFilter.type = "lowpass"; tunnelFilter.frequency.value = 18000;
    tunnelFilter.connect(masterGain); masterGain.connect(actx.destination);

    noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    const mkLoop = (filterType, freq, q) => {
      const src = actx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const flt = actx.createBiquadFilter();
      flt.type = filterType; flt.frequency.value = freq; flt.Q.value = q;
      const g = actx.createGain(); g.gain.value = 0;
      src.connect(flt); flt.connect(g); g.connect(tunnelFilter);
      src.start();
      return g;
    };
    rumbleGain = mkLoop("lowpass", 95, 0.4);
    hissGain = mkLoop("bandpass", 1500, 0.5);
  }

  function thump(at, strong) {
    const osc = actx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(strong ? 64 : 52, at);
    osc.frequency.exponentialRampToValueAtTime(34, at + 0.1);
    const g = actx.createGain();
    g.gain.setValueAtTime(strong ? 0.5 : 0.32, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    osc.connect(g); g.connect(tunnelFilter);
    osc.start(at); osc.stop(at + 0.14);

    const n = actx.createBufferSource(); n.buffer = noiseBuf;
    const bf = actx.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = 750; bf.Q.value = 1.2;
    const ng = actx.createGain();
    ng.gain.setValueAtTime(strong ? 0.16 : 0.1, at);
    ng.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
    n.connect(bf); bf.connect(ng); ng.connect(tunnelFilter);
    n.start(at); n.stop(at + 0.08);
  }

  function stepAudio() {
    if (!actx || !masterOn) return;
    const t = actx.currentTime;
    rumbleGain.gain.setTargetAtTime(0.30 * (0.2 + 0.8 * mult), t, 0.3);
    hissGain.gain.setTargetAtTime(0.045 * mult, t, 0.3);
    tunnelFilter.frequency.setTargetAtTime(lerp(18000, 300, smoothDark), t, 0.25);

    if (mult < 0.06) { nextClack = t + 0.25; return; }
    const period = clamp(1.62 / mult, 0.6, 26);
    if (nextClack < t) nextClack = t + 0.1;
    while (nextClack < t + 0.15) {
      thump(nextClack, true);
      thump(nextClack + 0.13, false);
      nextClack += period * (0.94 + Math.random() * 0.12);
    }
  }

  // cassette
  const cassette = document.getElementById("cassette");
  function refreshCassette() {
    const playing = masterOn && wantMusic && !musicBroken && !music.paused;
    cassette.classList.toggle("playing", playing);
    cassette.style.opacity = musicBroken ? 0.6 : 1;
  }
  function toggleMusic() {
    if (musicBroken) return;
    wantMusic = !wantMusic;
    if (wantMusic && masterOn) music.play().catch(() => {});
    else music.pause();
    refreshCassette();
  }
  cassette.addEventListener("click", toggleMusic);
  cassette.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMusic(); }
  });

  ElasticSoundControl.attach({
    start() {
      ensureAudio();
      const gate = wantMusic && !musicBroken
        ? music.play()
        : actx.resume().then(() => {
            if (actx.state !== "running") return Promise.reject(new Error("blocked"));
          });
      return Promise.resolve(gate).then(() => {
        actx.resume();
        masterOn = true;
        refreshCassette();
      });
    },
    stop() {
      masterOn = false;
      music.pause();
      if (actx) actx.suspend();
      refreshCassette();
    },
    setVolume(v) {
      masterVol = v;
      if (masterGain) masterGain.gain.value = v;
      music.volume = clamp(v * 0.65, 0, 1);
    },
  });
  music.volume = clamp(masterVol * 0.65, 0, 1);

  // ------------------------------------------------------------------ render
  function roundedHole() {
    const { x, y, w, h, r } = HOLE;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function terrainPath(f, seed, base, amp, step) {
    const span = LOOP * f;
    ctx.beginPath();
    ctx.moveTo(HOLE.x - 4, HOLE_BOTTOM + 4);
    for (let px = -4; px <= HOLE.w + 26; px += 24) {
      const wx = pos * f + px;
      const n = vnoise(wx, span, step, seed);
      ctx.lineTo(HOLE.x + px, base - amp * n);
    }
    ctx.lineTo(HOLE.x + HOLE.w + 4, HOLE_BOTTOM + 4);
    ctx.closePath();
  }

  function draw(now) {
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOX, viewOY);
    ctx.clearRect(-viewOX / viewScale, -viewOY / viewScale, canvas.width / viewScale, canvas.height / viewScale);
    ctx.save();
    roundedHole();
    ctx.clip();

    const t = pos / LOOP;
    const pal = palette(t);

    // sky
    const sky = ctx.createLinearGradient(0, HOLE.y, 0, HORIZON + 40);
    sky.addColorStop(0, pal.sky[0]);
    sky.addColorStop(0.6, pal.sky[1]);
    sky.addColorStop(1, pal.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(HOLE.x, HOLE.y, HOLE.w, HOLE.h);

    // sun
    if (pal.sun > 0.05) {
      ctx.globalAlpha = pal.sun * 0.8;
      ctx.fillStyle = "#fff6df";
      ctx.beginPath(); ctx.arc(HOLE.x + HOLE.w * 0.68, HOLE.y + 130, 52, 0, 7); ctx.fill();
      ctx.globalAlpha = pal.sun * 0.25;
      ctx.beginPath(); ctx.arc(HOLE.x + HOLE.w * 0.68, HOLE.y + 130, 92, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // clouds
    ctx.fillStyle = pal.cloud;
    for (const c of clouds) {
      eachWrapped(c.x, F_CLOUD, 260, (x) => {
        const y = HOLE.y + 70 + c.r1 * 200;
        const sc = 0.7 + c.r2 * 0.9;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.ellipse(x, y, 90 * sc, 26 * sc, 0, 0, 7);
        ctx.ellipse(x - 50 * sc, y + 8 * sc, 48 * sc, 18 * sc, 0, 0, 7);
        ctx.ellipse(x + 55 * sc, y + 6 * sc, 55 * sc, 20 * sc, 0, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    // far mountains + the giant
    ctx.fillStyle = pal.far;
    terrainPath(F_FAR, 601, HORIZON + 6, 175, 340);
    ctx.fill();
    for (const p of setPieces) {
      if (p.f !== F_FAR) continue;
      eachWrapped(p.t * LOOP * F_FAR, F_FAR, 240, (x) => drawGiant(x, HORIZON - 52, pal));
    }
    const haze = ctx.createLinearGradient(0, HORIZON - 60, 0, HORIZON + 8);
    haze.addColorStop(0, "rgba(255,244,224,0)");
    haze.addColorStop(1, "rgba(255,244,224,0.5)");
    ctx.fillStyle = haze;
    ctx.fillRect(HOLE.x, HORIZON - 60, HOLE.w, 70);

    // hills
    ctx.fillStyle = pal.hill;
    terrainPath(F_HILL, 907, HORIZON + 14, 74, 210);
    ctx.fill();

    // mid patchwork band
    const midTop = HORIZON + 8;
    const midBottom = HOLE.y + 560;
    for (const p of patches) {
      eachWrappedRange(p.x0, p.x1, F_MID, (x0, x1) => {
        ctx.fillStyle = mixHex(pal.f1, pal.f2, p.v);
        ctx.fillRect(x0, midTop, x1 - x0, midBottom - midTop);
        ctx.fillStyle = shade(pal.f1, -0.22);
        ctx.fillRect(x1 - 4, midTop + 6, 4, midBottom - midTop - 6);
      });
    }

    for (const h of midHouses) {
      eachWrapped(h.x, F_MID, 120, (x) => drawHouse(x, midTop + 40 + h.r1 * 60, 0.8 + h.r2 * 0.5, h.r1));
    }
    for (const tr of midTrees) {
      eachWrapped(tr.x, F_MID, 120, (x) => drawTree(x, midTop + 46 + tr.r1 * 80, 0.7 + tr.r2 * 0.7, tr.r1, pal));
    }

    // mid set pieces
    for (const p of setPieces) {
      if (p.f !== F_MID) continue;
      const wx = p.t * LOOP * F_MID;
      if (p.t < 0.15) {
        // pastel cows
        eachWrapped(wx, F_MID, 260, (x) => {
          drawCow(x - 90, midTop + 96, 1.0, "#f4c1d0");
          drawCow(x + 20, midTop + 120, 1.15, "#b8e0c8");
          drawCow(x + 130, midTop + 88, 0.85, "#cfc0ec");
          drawCow(x + 210, midTop + 128, 1.05, "#f4c1d0");
        });
      } else {
        // pond with a rowboat
        eachWrapped(wx, F_MID, 460, (x) => {
          ctx.fillStyle = pal.water;
          ctx.beginPath(); ctx.ellipse(x, midTop + 120, 340, 44, 0, 0, 7); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath(); ctx.ellipse(x - 80, midTop + 112, 120, 12, 0, 0, 7); ctx.fill();
          drawBoat(x + 60, midTop + 118, 1.0);
        });
      }
    }

    // near meadow band
    ctx.fillStyle = pal.near;
    terrainPath(F_NEAR, 509, HOLE.y + 470, 26, 300);
    ctx.fill();
    // flowers
    for (const fl of nearFlowers) {
      eachWrapped(fl.x, F_NEAR, 40, (x) => {
        const y = HOLE.y + 496 + fl.r1 * 200;
        if (y > HOLE_BOTTOM - 8) return;
        ctx.fillStyle = ["#f6b8c8", "#f9dc9e", "#ffffff", "#cdb9ec"][Math.floor(fl.r2 * 4)];
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(x, y, 3 + fl.r2 * 2.5, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    // fence
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 5; ctx.lineCap = "round";
    const fenceY = HOLE.y + 520;
    const fenceSpan = LOOP * F_NEAR, fenceN = Math.round(fenceSpan / 120);
    for (let i = 0; i < 30; i++) {
      const idx = Math.floor(pos / 120) - 2 + i;
      const wx = ((idx % fenceN) + fenceN) % fenceN * (fenceSpan / fenceN);
      let x = ((wx - pos) % fenceSpan + fenceSpan) % fenceSpan;
      if (x > HOLE.w + 60) x -= fenceSpan;
      if (x < -60 || x > HOLE.w + 60) continue;
      const sx = HOLE.x + x;
      ctx.beginPath(); ctx.moveTo(sx, fenceY); ctx.lineTo(sx, fenceY + 44); ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(HOLE.x, fenceY + 14); ctx.lineTo(HOLE.x + HOLE.w, fenceY + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HOLE.x, fenceY + 30); ctx.lineTo(HOLE.x + HOLE.w, fenceY + 30); ctx.stroke();
    ctx.globalAlpha = 1;

    // station platform (near layer)
    drawStation(pal);

    // catenary poles
    ctx.strokeStyle = shade(pal.line, -0.3);
    for (let i = 0; i < 6; i++) {
      const span = LOOP * F_POLE;
      const n = Math.round(span / 1100);
      const idx = Math.floor(pos * F_POLE / 1100) - 1 + i;
      const wx = ((idx % n) + n) % n * (span / n);
      let x = ((wx - pos * F_POLE) % span + span) % span;
      if (x > HOLE.w + 120) x -= span;
      if (x < -120 || x > HOLE.w + 120) continue;
      const sx = HOLE.x + x;
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(sx, HOLE.y - 4); ctx.lineTo(sx, HOLE.y + 560); ctx.stroke();
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(sx - 46, HOLE.y + 56); ctx.lineTo(sx + 46, HOLE.y + 56); ctx.stroke();
    }

    // trackside gravel + blur bushes
    ctx.fillStyle = shade(pal.near, -0.35);
    ctx.fillRect(HOLE.x, HOLE_BOTTOM - 42, HOLE.w, 42);
    for (const b of trackBushes) {
      eachWrapped(b.x, F_TRACK, 400, (x) => {
        ctx.fillStyle = shade(pal.near, -0.3);
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(x, HOLE_BOTTOM - 60 - b.r1 * 60, 150 + 190 * mult, 46 + b.r2 * 30, 0, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    // tunnel
    drawTunnel();

    ctx.restore();

    // spot triggers for the child
    for (const p of setPieces) {
      const span = LOOP * p.f;
      let x = ((p.t * span - pos * p.f) % span + span) % span;
      if (x > HOLE.w * 0.55 && x < HOLE.w * 0.95 && p.seen !== loopCount) {
        p.seen = loopCount;
        spot();
      }
    }
  }

  // draw a range [x0,x1] on a wrapping layer; cb gets clipped screen-space ends
  function eachWrappedRange(x0, x1, f, cb) {
    const span = LOOP * f;
    let a = ((x0 - pos * f) % span + span) % span;
    const w = x1 - x0;
    for (const base of [a, a - span]) {
      const s0 = Math.max(base, -20), s1 = Math.min(base + w, HOLE.w + 20);
      if (s1 > s0) cb(HOLE.x + s0, HOLE.x + s1);
    }
  }

  function drawStation(pal) {
    const d0 = wrapNear(stationX - 1400), d1 = wrapNear(stationX + 1400);
    if (d1 < -200 || d0 > HOLE.w + 200) return;
    const x0 = HOLE.x + Math.max(d0, -60), x1 = HOLE.x + Math.min(d1, HOLE.w + 60);
    if (x1 <= x0) return;

    // platform slab
    const platY = HOLE.y + 486;
    ctx.fillStyle = "#ddd2c2";
    ctx.fillRect(x0, platY, x1 - x0, HOLE_BOTTOM - platY);
    ctx.fillStyle = "#f2e7d2";
    ctx.fillRect(x0, platY, x1 - x0, 12);
    ctx.fillStyle = "#c9bca8";
    ctx.fillRect(x0, platY + 12, x1 - x0, 6);

    // canopy
    ctx.fillStyle = "#7ea9a1";
    ctx.fillRect(x0, HOLE.y + 26, x1 - x0, 34);
    ctx.fillStyle = "#5f8a84";
    ctx.fillRect(x0, HOLE.y + 56, x1 - x0, 8);

    // columns + benches
    for (let k = -3; k <= 3; k++) {
      const cd = wrapNear(stationX + k * 420);
      if (cd < -80 || cd > HOLE.w + 80) continue;
      const cx = HOLE.x + cd;
      ctx.fillStyle = "#6f9992";
      ctx.fillRect(cx - 9, HOLE.y + 60, 18, platY - HOLE.y - 60);
      if (k % 2 !== 0) {
        ctx.fillStyle = "#b98d5e";
        ctx.fillRect(cx - 60, platY - 40, 120, 12);
        ctx.fillRect(cx - 54, platY - 28, 10, 28);
        ctx.fillRect(cx + 44, platY - 28, 10, 28);
      }
    }

    // hanging sign
    const sd = wrapNear(stationX);
    if (sd > -260 && sd < HOLE.w + 260) {
      const sx = HOLE.x + sd;
      ctx.strokeStyle = "#5f8a84"; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx - 88, HOLE.y + 60); ctx.lineTo(sx - 88, HOLE.y + 96);
      ctx.moveTo(sx + 88, HOLE.y + 60); ctx.lineTo(sx + 88, HOLE.y + 96);
      ctx.stroke();
      ctx.fillStyle = "#fbf1de";
      ctx.strokeStyle = "#8a6b52"; ctx.lineWidth = 4;
      const r = 14;
      ctx.beginPath();
      ctx.roundRect(sx - 150, HOLE.y + 96, 300, 64, r);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4a5568";
      ctx.font = "600 30px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(stationName, sx, HOLE.y + 138);
    }
  }

  function drawTunnel() {
    const d0 = wrapNear(TUNNEL0), d1 = wrapNear(TUNNEL1);
    const x0 = Math.max(d0, 0), x1 = Math.min(d1, HOLE.w);
    const covered = Math.max(0, x1 - x0);
    const frac = covered / HOLE.w;
    smoothDark += (frac - smoothDark) * 0.08;
    reflection.setAttribute("opacity", (smoothDark * 0.9).toFixed(3));
    if (covered <= 0) return;

    ctx.fillStyle = "#241c2b";
    ctx.fillRect(HOLE.x + x0, HOLE.y, covered, HOLE.h);

    // stone face at the mouth
    if (d0 > -80 && d0 < HOLE.w + 80) {
      ctx.fillStyle = "#3a2f42";
      ctx.fillRect(HOLE.x + d0, HOLE.y, 46, HOLE.h);
      ctx.fillStyle = "#57485e";
      ctx.fillRect(HOLE.x + d0, HOLE.y, 14, HOLE.h);
    }
    if (d1 > -80 && d1 < HOLE.w + 80) {
      ctx.fillStyle = "#3a2f42";
      ctx.fillRect(HOLE.x + d1 - 46, HOLE.y, 46, HOLE.h);
    }

    // passing lamps
    for (let k = 0; k < 12; k++) {
      const wx = TUNNEL0 + 300 + k * 480;
      const d = wrapNear(wx);
      if (d < 0 || d > HOLE.w) continue;
      const lx = HOLE.x + d;
      const ly = HOLE.y + 190;
      const grd = ctx.createRadialGradient(lx, ly, 4, lx, ly, 90);
      grd.addColorStop(0, "rgba(255,196,120,0.85)");
      grd.addColorStop(1, "rgba(255,196,120,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(lx - 90, ly - 90, 180, 180);
    }
  }

  // -------------------------------------------------------------------- loop
  let last = performance.now();
  function frame(nowMs) {
    const now = nowMs / 1000;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;

    stepTrain(dt);
    stepInterior(dt, now);
    stepAudio();
    draw(now);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
