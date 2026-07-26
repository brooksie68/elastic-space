// Surround — renderer, input, sound, match flow. All game logic lives in
// game-core.js (pure, sim-tested); this file only presents it.
(function () {
  const Core = globalThis.SurroundCore;
  const DIRS = Core.DIRS;

  // ---- tuner config --------------------------------------------------------
  const TUNER_KEY = "surround-tuner-v1";
  const DEFAULTS = { speed: 1, glow: 1, grid: "medium", ai: 2, target: 10 };
  const GRIDS = {
    small: { w: 34, h: 19 },
    medium: { w: 44, h: 24 },
    large: { w: 58, h: 32 },
  };
  let cfg = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(TUNER_KEY) || "{}");
    for (const k in DEFAULTS) if (saved[k] !== undefined) cfg[k] = saved[k];
    if (!GRIDS[cfg.grid]) cfg.grid = DEFAULTS.grid;
  } catch (e) { /* fresh defaults */ }
  function saveCfg() {
    try { localStorage.setItem(TUNER_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  // ---- colors ---------------------------------------------------------------
  const COLORS = [
    { core: "#eafeff", body: "#40f2ff", glow: "rgba(64, 242, 255, 0.55)", soft: "rgba(64, 242, 255, 0.10)" },
    { core: "#ffeafa", body: "#ff4fd8", glow: "rgba(255, 79, 216, 0.55)", soft: "rgba(255, 79, 216, 0.10)" },
  ];

  // ---- canvas ----------------------------------------------------------------
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let cell = 10, fieldX = 0, fieldY = 0, fieldW = 0, fieldH = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    layout();
  }
  function layout() {
    const padX = Math.max(24, W * 0.04);
    const padTop = 88, padBot = 78;
    cell = Math.max(4, Math.min((W - padX * 2) / state.w, (H - padTop - padBot) / state.h));
    fieldW = cell * state.w;
    fieldH = cell * state.h;
    fieldX = (W - fieldW) / 2;
    fieldY = padTop + (H - padTop - padBot - fieldH) / 2;
  }
  window.addEventListener("resize", resize);

  // ---- game state --------------------------------------------------------------
  let state = Core.createGame(GRIDS[cfg.grid]);
  let paths = [[], []];          // arrays of {x, y} cell centers (field space, px)
  let score = [0, 0];
  let mode = "countdown";        // countdown | play | roundend | matchend
  let modeT = 0;                 // ms elapsed in current mode
  let roundT = 0;                // ms elapsed in current round (drives speed ramp)
  let tickAcc = 0;
  let lastFrame = performance.now();
  let countdownStage = -1;
  let particles = [];
  let flash = 0;                 // crash flash 0..1
  let inputQueue = [];
  let roundWinner = -2;          // -1 draw, 0/1 winner of last round
  let lastHumPitch = 1;
  let matchWinner = -1;
  let hintFadeDone = false;

  function cellCenter(cx, cy) {
    return { x: cx * cell + cell / 2, y: cy * cell + cell / 2 };
  }

  function startRound() {
    Core.resetRound(state);
    paths = state.players.map(function (p) { return [cellCenter(p.x, p.y)]; });
    inputQueue = [];
    particles = [];
    flash = 0;
    roundT = 0;
    tickAcc = 0;
    roundWinner = -2;
    setMode("countdown");
    countdownStage = -1;
  }

  function startMatch() {
    score = [0, 0];
    matchWinner = -1;
    renderPips();
    hideBanner();
    startRound();
  }

  function setMode(m) { mode = m; modeT = 0; }

  // ---- speed ramp -----------------------------------------------------------------
  function ticksPerSec() {
    const ramp = 1 + Math.min(0.9, (roundT / 1000) * 0.035);
    return 8 * cfg.speed * ramp;
  }

  // ---- HUD ---------------------------------------------------------------------------
  const pipsYou = document.getElementById("pips-you");
  const pipsCpu = document.getElementById("pips-cpu");
  function renderPips() {
    const build = function (el, cls, n, mirror) {
      el.innerHTML = "";
      for (let i = 0; i < cfg.target; i++) {
        const idx = mirror ? cfg.target - 1 - i : i;
        const pip = document.createElement("div");
        pip.className = "pip" + (idx < n ? " lit " + cls : "");
        el.appendChild(pip);
      }
    };
    build(pipsYou, "you", score[0], false);
    build(pipsCpu, "cpu", score[1], true);
  }
  function popPip(side) {
    renderPips();
    const el = side === 0 ? pipsYou : pipsCpu;
    const lit = el.querySelectorAll(".pip.lit");
    const target = side === 0 ? lit[lit.length - 1] : lit[0];
    if (target) {
      target.classList.add("just-lit");
      setTimeout(function () { target.classList.remove("just-lit"); }, 350);
    }
  }

  const countdownEl = document.getElementById("countdown");
  const bannerEl = document.getElementById("banner");
  const hintEl = document.getElementById("hint");

  function showBanner(html, cls) {
    bannerEl.innerHTML = html;
    bannerEl.className = "show " + cls;
  }
  function hideBanner() { bannerEl.className = ""; }

  // ---- particles -----------------------------------------------------------------------
  function burst(px, py, colorIdx) {
    const c = COLORS[colorIdx];
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random() * 1.4) * cell * 0.55;
      particles.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.9 + Math.random() * 1.3,
        r: cell * (0.06 + Math.random() * 0.12),
        color: i % 4 === 0 ? "#ffffff" : c.body,
      });
    }
  }

  // ---- sound ------------------------------------------------------------------------------
  const Sfx = {
    ctx: null, master: null, running: false, volume: 0.8,
    hums: null,
    ensure: function () {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    },
    start: function () {
      this.ensure();
      if (!this.ctx) return;
      this.running = true;
      const p = this.ctx.resume();
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
      if (mode === "play") this.humsOn();
      return p;
    },
    stop: function () {
      this.running = false;
      if (!this.ctx) return;
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.humsOff();
    },
    setVolume: function (v) {
      this.volume = v;
      if (this.ctx && this.running) {
        this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
      }
    },
    humsOn: function () {
      if (!this.ctx || !this.running || this.hums) return;
      const mk = function (ctx, master, freq, type, level) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 540;
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(lp); lp.connect(gain); gain.connect(master);
        osc.start();
        gain.gain.setTargetAtTime(level, ctx.currentTime, 0.25);
        return { osc: osc, gain: gain, base: freq };
      };
      this.hums = [
        mk(this.ctx, this.master, 98, "sawtooth", 0.035),
        mk(this.ctx, this.master, 123.5, "square", 0.02),
      ];
    },
    humsOff: function () {
      if (!this.hums) return;
      const ctx = this.ctx;
      this.hums.forEach(function (h) {
        h.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        h.osc.stop(ctx.currentTime + 0.5);
      });
      this.hums = null;
    },
    humPitch: function (mult) {
      if (!this.hums) return;
      const ctx = this.ctx;
      this.hums.forEach(function (h) {
        h.osc.frequency.setTargetAtTime(h.base * mult, ctx.currentTime, 0.2);
      });
    },
    env: function (type, freq, dur, level, slideTo) {
      if (!this.ctx || !this.running) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(level, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    },
    blip: function (who) { this.env("square", who === 0 ? 880 : 660, 0.05, 0.05); },
    tickTock: function (go) { this.env("sine", go ? 940 : 620, go ? 0.35 : 0.12, 0.12); },
    crash: function () {
      if (!this.ctx || !this.running) return;
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.45);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + 0.45);
      const gain = this.ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(lp); lp.connect(gain); gain.connect(this.master);
      src.start(t);
      this.env("sine", 220, 0.5, 0.25, 55);
    },
    point: function (who) {
      this.env("sine", who === 0 ? 660 : 440, 0.14, 0.14);
      const self = this;
      setTimeout(function () { self.env("sine", who === 0 ? 990 : 330, 0.22, 0.14); }, 110);
    },
    fanfare: function (won) {
      const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63, 196];
      const self = this;
      notes.forEach(function (f, i) {
        setTimeout(function () { self.env("triangle", f, 0.35, 0.16); }, i * 130);
      });
    },
  };

  if (window.ElasticSoundControl) {
    ElasticSoundControl.attach({
      start: function () { return Sfx.start(); },
      stop: function () { Sfx.stop(); },
      setVolume: function (v) { Sfx.setVolume(v); },
    });
  }

  // ---- input -----------------------------------------------------------------------------------
  const KEYMAP = {
    ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
    w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3,
  };
  function queueDir(dir) {
    if (mode !== "play" && mode !== "countdown") return;
    const last = inputQueue.length ? inputQueue[inputQueue.length - 1] : state.players[0].pendingDir;
    if (dir === last || dir === Core.OPPOSITE[last]) return;
    if (inputQueue.length < 2) inputQueue.push(dir);
    if (!hintFadeDone) {
      hintFadeDone = true;
      hintEl.classList.add("faded");
    }
  }
  window.addEventListener("keydown", function (e) {
    if (e.key in KEYMAP) {
      e.preventDefault();
      queueDir(KEYMAP[e.key]);
      return;
    }
    if ((e.key === " " || e.key === "Enter") && mode === "matchend" && modeT > 600) {
      startMatch();
    }
  });

  let touchStart = null;
  window.addEventListener("touchstart", function (e) {
    if (e.target.closest("#tuner") || e.target.closest("#tuner-toggle")) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (mode === "matchend" && modeT > 600) startMatch();
  }, { passive: true });
  window.addEventListener("touchmove", function (e) {
    if (!touchStart) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    queueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener("touchend", function () { touchStart = null; }, { passive: true });

  // ---- tick ---------------------------------------------------------------------------------------
  function gameTick() {
    if (inputQueue.length) Core.setDirection(state, 0, inputQueue.shift());
    if (state.players[1].alive) {
      Core.setDirection(state, 1, Core.aiChoose(state, 1, cfg.ai, Math.random));
    }
    const prevDirs = state.players.map(function (p) { return p.dir; });
    const crashed = Core.step(state);
    state.players.forEach(function (p, i) {
      if (p.alive) {
        paths[i].push(cellCenter(p.x, p.y));
        if (p.dir !== prevDirs[i] && i === 0) Sfx.blip(0);
      }
    });
    if (crashed.length > 0) {
      crashed.forEach(function (i) {
        const p = state.players[i];
        const at = p.crashInto ? cellCenter(p.crashInto.x, p.crashInto.y) : cellCenter(p.x, p.y);
        burst(at.x, at.y, i);
      });
      flash = 1;
      Sfx.humsOff();
      Sfx.crash();
      roundWinner = crashed.length === 2 ? -1 : 1 - crashed[0];
      if (roundWinner >= 0) {
        score[roundWinner]++;
        setTimeout(function () { Sfx.point(roundWinner); }, 350);
        popPip(roundWinner);
      }
      setMode("roundend");
    }
  }

  // ---- mode driver ----------------------------------------------------------------------------------
  function update(dt) {
    modeT += dt;
    if (mode === "countdown") {
      const stage = Math.floor(modeT / 620);
      if (stage !== countdownStage && stage <= 3) {
        countdownStage = stage;
        const label = stage < 3 ? String(3 - stage) : "GO";
        countdownEl.textContent = label;
        countdownEl.classList.remove("tick");
        void countdownEl.offsetWidth; // restart the animation
        countdownEl.classList.add("tick");
        Sfx.tickTock(stage === 3);
      }
      if (modeT >= 3 * 620 + 300) {
        setMode("play");
        Sfx.humsOn();
      }
    } else if (mode === "play") {
      roundT += dt;
      const pitch = ticksPerSec() / (8 * cfg.speed);
      if (Math.abs(pitch - lastHumPitch) > 0.02) {
        lastHumPitch = pitch;
        Sfx.humPitch(pitch);
      }
      tickAcc += dt;
      const interval = 1000 / ticksPerSec();
      let guard = 0;
      while (tickAcc >= interval && mode === "play" && guard < 6) {
        tickAcc -= interval;
        gameTick();
        guard++;
      }
    } else if (mode === "roundend") {
      if (modeT > 1500) {
        if (score[0] >= cfg.target || score[1] >= cfg.target) {
          matchWinner = score[0] >= cfg.target ? 0 : 1;
          setMode("matchend");
          Sfx.fanfare(matchWinner === 0);
          showBanner(
            (matchWinner === 0 ? "YOU WIN" : "THE MACHINE WINS") +
            '<span class="sub">SPACE OR TAP TO GO AGAIN</span>',
            matchWinner === 0 ? "you" : "cpu"
          );
        } else {
          startRound();
        }
      }
    }
    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay * (dt / 1000);
      p.x += p.vx * (dt / 1000) * 12;
      p.y += p.vy * (dt / 1000) * 12;
      p.vx *= 0.985;
      p.vy *= 0.985;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (flash > 0) flash = Math.max(0, flash - dt / 380);
  }

  // ---- draw -------------------------------------------------------------------------------------------
  function drawTrail(idx, headT) {
    const path = paths[idx];
    if (path.length === 0) return;
    const c = COLORS[idx];
    const p = state.players[idx];
    const alive = p.alive;
    const dim = alive ? 1 : 0.32;
    const glow = cfg.glow;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // build the polyline with an interpolated head
    const pts = path;
    const n = pts.length;
    let hx = pts[n - 1].x, hy = pts[n - 1].y;
    if (alive && n >= 2 && mode === "play") {
      const a = pts[n - 2], b = pts[n - 1];
      hx = a.x + (b.x - a.x) * headT;
      hy = a.y + (b.y - a.y) * headT;
    }
    const trace = function () {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < n - 1; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (n >= 2) ctx.lineTo(hx, hy);
    };

    // pass 1: wide soft halo
    if (glow > 0.05) {
      trace();
      ctx.strokeStyle = c.soft;
      ctx.globalAlpha = dim * Math.min(1, glow);
      ctx.lineWidth = cell * (0.9 + glow * 0.5);
      ctx.stroke();
      // pass 2: tighter glow
      trace();
      ctx.strokeStyle = c.glow;
      ctx.globalAlpha = dim * 0.4 * Math.min(1, glow);
      ctx.lineWidth = cell * 0.62;
      ctx.stroke();
    }
    // pass 3: core line
    trace();
    ctx.strokeStyle = c.body;
    ctx.globalAlpha = dim;
    ctx.lineWidth = cell * 0.34;
    if (glow > 0.05) {
      ctx.shadowColor = c.body;
      ctx.shadowBlur = cell * 0.7 * glow;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // head orb
    if (alive) {
      const pulse = 1 + 0.12 * Math.sin(performance.now() / 140);
      const r = cell * 0.30 * pulse;
      if (glow > 0.05) {
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 3.2);
        grad.addColorStop(0, c.glow);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = Math.min(1, glow);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.core;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // background
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(fieldX, fieldY);

    // arena plate
    const grad = ctx.createRadialGradient(
      fieldW / 2, fieldH / 2, 0,
      fieldW / 2, fieldH / 2, Math.max(fieldW, fieldH) * 0.7
    );
    grad.addColorStop(0, "#0a0d18");
    grad.addColorStop(1, "#060810");
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, fieldW, fieldH, 12); else ctx.rect(0, 0, fieldW, fieldH);
    ctx.fill();

    // grid
    ctx.strokeStyle = "rgba(140, 170, 255, 0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < state.w; x++) {
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, fieldH);
    }
    for (let y = 1; y < state.h; y++) {
      ctx.moveTo(0, y * cell);
      ctx.lineTo(fieldW, y * cell);
    }
    ctx.stroke();

    // arena edge
    ctx.strokeStyle = "rgba(150, 190, 255, " + (0.10 + flash * 0.5) + ")";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0.75, 0.75, fieldW - 1.5, fieldH - 1.5, 12); else ctx.rect(0.75, 0.75, fieldW - 1.5, fieldH - 1.5);
    ctx.stroke();

    // trails
    const interval = 1000 / ticksPerSec();
    const headT = Math.min(1, tickAcc / interval);
    drawTrail(0, headT);
    drawTrail(1, headT);

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // crash flash
    if (flash > 0.01) {
      ctx.fillStyle = "rgba(255, 255, 255, " + flash * 0.05 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- main loop -----------------------------------------------------------------------------------------
  function frame(now) {
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---- tuner wiring -----------------------------------------------------------------------------------------
  const tuner = document.getElementById("tuner");
  document.getElementById("tuner-toggle").addEventListener("click", function () {
    tuner.classList.toggle("open");
  });
  // Click anywhere off the panel dismisses it (house rule 2026-07-25).
  // pointerdown, not click: a slider drag released off-panel is not "away".
  document.addEventListener("pointerdown", function (e) {
    if (!tuner.classList.contains("open")) return;
    if (tuner.contains(e.target) || e.target.closest("#tuner-toggle")) return;
    tuner.classList.remove("open");
  });
  const speedSlider = document.getElementById("t-speed");
  const speedVal = document.getElementById("t-speed-val");
  const glowSlider = document.getElementById("t-glow");
  const glowVal = document.getElementById("t-glow-val");
  function syncSeg(id, value) {
    document.querySelectorAll("#" + id + " button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.v === String(value));
    });
  }
  function syncTunerUI() {
    speedSlider.value = cfg.speed;
    speedVal.textContent = parseFloat(Number(cfg.speed).toFixed(2)) + "×";
    glowSlider.value = cfg.glow;
    glowVal.textContent = Number(cfg.glow).toFixed(1);
    syncSeg("t-grid", cfg.grid);
    syncSeg("t-ai", cfg.ai);
    syncSeg("t-target", cfg.target);
  }
  speedSlider.addEventListener("input", function () {
    cfg.speed = parseFloat(speedSlider.value);
    saveCfg(); syncTunerUI();
  });
  glowSlider.addEventListener("input", function () {
    cfg.glow = parseFloat(glowSlider.value);
    saveCfg(); syncTunerUI();
  });
  function segHandler(id, key, parse, restart) {
    document.querySelectorAll("#" + id + " button").forEach(function (b) {
      b.addEventListener("click", function () {
        const v = parse ? parse(b.dataset.v) : b.dataset.v;
        if (cfg[key] === v) return;
        cfg[key] = v;
        saveCfg(); syncTunerUI();
        if (restart) {
          state = Core.createGame(GRIDS[cfg.grid]);
          layout();
          startMatch();
        }
      });
    });
  }
  segHandler("t-grid", "grid", null, true);
  segHandler("t-ai", "ai", function (v) { return parseInt(v, 10); }, true);
  segHandler("t-target", "target", function (v) { return parseInt(v, 10); }, true);
  document.getElementById("t-reset").addEventListener("click", function () {
    cfg = Object.assign({}, DEFAULTS);
    saveCfg(); syncTunerUI();
    state = Core.createGame(GRIDS[cfg.grid]);
    layout();
    startMatch();
  });

  // ---- go ---------------------------------------------------------------------------------------------------
  syncTunerUI();
  resize();
  renderPips();
  startRound();
  requestAnimationFrame(frame);

  // fade the title after a while
  setTimeout(function () { document.getElementById("title").classList.add("faded"); }, 12000);
})();
