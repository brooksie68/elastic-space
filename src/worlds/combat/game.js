// Combat — renderer, input, sound, match flow. All game rules live in
// game-core.js (pure, sim-tested); this file only presents it.
(function () {
  const Core = globalThis.CombatCore;

  // ---- tuner config --------------------------------------------------------
  const TUNER_KEY = "combat-tuner-v1";
  const DEFAULTS = { speed: 1, glow: 1, maze: "rnd", ai: 2, match: 136, bounce: false };
  let cfg = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(TUNER_KEY) || "{}");
    for (const k in DEFAULTS) if (saved[k] !== undefined) cfg[k] = saved[k];
  } catch (e) { /* fresh defaults */ }
  function saveCfg() {
    try { localStorage.setItem(TUNER_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  // ---- colors ---------------------------------------------------------------
  const COLORS = [
    { core: "#eafeff", body: "#40f2ff", glow: "rgba(64, 242, 255, 0.55)", soft: "rgba(64, 242, 255, 0.12)", dark: "#1a6f78" },
    { core: "#ffeafa", body: "#ff4fd8", glow: "rgba(255, 79, 216, 0.55)", soft: "rgba(255, 79, 216, 0.12)", dark: "#7c2a68" },
  ];
  const WALL_FILL = "#111527";
  const WALL_EDGE = "rgba(130, 160, 255, 0.5)";
  const WALL_SOFT = "rgba(130, 160, 255, 0.08)";

  // ---- canvas ----------------------------------------------------------------
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let u = 4, fieldX = 0, fieldY = 0, fieldW = 0, fieldH = 0;

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
    u = Math.max(2, Math.min((W - padX * 2) / Core.W, (H - padTop - padBot) / Core.H));
    fieldW = u * Core.W;
    fieldH = u * Core.H;
    fieldX = (W - fieldW) / 2;
    fieldY = padTop + (H - padTop - padBot - fieldH) / 2;
  }
  window.addEventListener("resize", resize);

  // ---- match state --------------------------------------------------------------
  const DT = 1 / 60;
  function pickMaze() {
    return cfg.maze === "rnd" ? Math.floor(Math.random() * Core.MAZES.length) : cfg.maze | 0;
  }
  let state = Core.createGame({ maze: pickMaze(), speed: cfg.speed, bounce: cfg.bounce });
  let score = [0, 0];
  let mode = "countdown";        // countdown | play | matchend
  let modeT = 0;
  let playLeft = cfg.match;
  let tickAcc = 0;
  let lastFrame = performance.now();
  let countdownStage = -1;
  let particles = [];
  let flash = 0;
  let aiInput = {};
  let hintFadeDone = false;
  let resetIn = 0; // ms until tanks return to their corners after a point

  function setMode(m) { mode = m; modeT = 0; }

  function startMatch() {
    state = Core.createGame({ maze: pickMaze(), speed: cfg.speed, bounce: cfg.bounce });
    score = [0, 0];
    playLeft = cfg.match;
    particles = [];
    flash = 0;
    tickAcc = 0;
    countdownStage = -1;
    aiInput = {};
    resetIn = 0;
    renderScores();
    hideBanner();
    syncMazeName();
    setMode("countdown");
  }

  // ---- HUD ---------------------------------------------------------------------------
  const scoreYouEl = document.getElementById("score-you");
  const scoreCpuEl = document.getElementById("score-cpu");
  const clockEl = document.getElementById("clock");
  const countdownEl = document.getElementById("countdown");
  const bannerEl = document.getElementById("banner");
  const hintEl = document.getElementById("hint");

  function renderScores() {
    scoreYouEl.textContent = String(score[0]);
    scoreCpuEl.textContent = String(score[1]);
  }
  function popScore(side) {
    renderScores();
    const el = side === 0 ? scoreYouEl : scoreCpuEl;
    el.classList.add("pop");
    setTimeout(function () { el.classList.remove("pop"); }, 220);
  }
  function renderClock() {
    const s = Math.max(0, Math.ceil(playLeft));
    const m = Math.floor(s / 60);
    clockEl.textContent = m + ":" + String(s % 60).padStart(2, "0");
    clockEl.classList.toggle("late", playLeft < 15 && mode === "play");
  }
  function showBanner(html, cls) {
    bannerEl.innerHTML = html;
    bannerEl.className = "show " + cls;
  }
  function hideBanner() { bannerEl.className = ""; }

  // ---- particles -----------------------------------------------------------------------
  function burst(px, py, colorIdx, n, speedMul) {
    const c = COLORS[colorIdx];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random() * 1.4) * 26 * (speedMul || 1);
      particles.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.9 + Math.random() * 1.4,
        r: 0.35 + Math.random() * 0.7,
        color: i % 4 === 0 ? "#ffffff" : c.body,
      });
    }
  }
  function sparks(px, py, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random() * 0.8) * 18;
      particles.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.7, decay: 2.2,
        r: 0.22 + Math.random() * 0.3,
        color: "#9fb6ff",
      });
    }
  }

  // ---- sound ------------------------------------------------------------------------------
  const Sfx = {
    ctx: null, master: null, running: false, volume: 0.8, engines: null,
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
      if (mode === "play") this.enginesOn();
      return p;
    },
    stop: function () {
      this.running = false;
      if (!this.ctx) return;
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.enginesOff();
    },
    setVolume: function (v) {
      this.volume = v;
      if (this.ctx && this.running) {
        this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
      }
    },
    enginesOn: function () {
      if (!this.ctx || !this.running || this.engines) return;
      const mk = function (ctx, master, freq, type, level) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 420;
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(lp); lp.connect(gain); gain.connect(master);
        osc.start();
        gain.gain.setTargetAtTime(level, ctx.currentTime, 0.3);
        return { osc: osc, gain: gain, base: freq, cur: freq };
      };
      this.engines = [
        mk(this.ctx, this.master, 72, "sawtooth", 0.045),
        mk(this.ctx, this.master, 91, "sawtooth", 0.028),
      ];
    },
    enginesOff: function () {
      if (!this.engines) return;
      const ctx = this.ctx;
      this.engines.forEach(function (e) {
        e.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        e.osc.stop(ctx.currentTime + 0.6);
      });
      this.engines = null;
    },
    engineThrottle: function (i, thrusting) {
      if (!this.engines) return;
      const e = this.engines[i];
      const want = e.base * (thrusting ? 1.55 : 1);
      if (Math.abs(want - e.cur) > 1) {
        e.cur = want;
        e.osc.frequency.setTargetAtTime(want, this.ctx.currentTime, 0.12);
      }
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
    noise: function (dur, level, fFrom, fTo) {
      if (!this.ctx || !this.running) return;
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(fFrom, t);
      lp.frequency.exponentialRampToValueAtTime(fTo, t + dur);
      const gain = this.ctx.createGain();
      gain.gain.value = level;
      src.connect(lp); lp.connect(gain); gain.connect(this.master);
      src.start(t);
    },
    fire: function (who) { this.noise(0.14, 0.3, 2600, 500); this.env("square", who === 0 ? 300 : 240, 0.09, 0.07, 120); },
    wallThud: function () { this.noise(0.08, 0.1, 900, 250); },
    bouncePing: function () { this.env("triangle", 1150, 0.07, 0.06, 800); },
    hit: function () {
      this.noise(0.55, 0.55, 3400, 140);
      this.env("sine", 200, 0.6, 0.28, 48);
    },
    point: function (who) {
      this.env("sine", who === 0 ? 660 : 440, 0.14, 0.14);
      const self = this;
      setTimeout(function () { self.env("sine", who === 0 ? 990 : 330, 0.22, 0.14); }, 110);
    },
    tickTock: function (go) { this.env("sine", go ? 940 : 620, go ? 0.35 : 0.12, 0.12); },
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

  // ---- input -----------------------------------------------------------------------------
  const held = { up: false, left: false, right: false, fire: false };
  const KEYMAP = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    " ": "fire",
  };
  window.addEventListener("keydown", function (e) {
    const k = KEYMAP[e.key];
    if (k) {
      e.preventDefault();
      if (e.key === " " && mode === "matchend" && modeT > 600) { startMatch(); return; }
      held[k] = true;
      if (!hintFadeDone && (k === "up" || k === "left" || k === "right")) {
        hintFadeDone = true;
        hintEl.classList.add("faded");
      }
      return;
    }
    if (e.key === "Enter" && mode === "matchend" && modeT > 600) startMatch();
  });
  window.addEventListener("keyup", function (e) {
    const k = KEYMAP[e.key];
    if (k) held[k] = false;
  });
  window.addEventListener("blur", function () {
    held.up = held.left = held.right = held.fire = false;
  });
  window.addEventListener("touchstart", function (e) {
    if (e.target.closest("#tuner") || e.target.closest("#tuner-toggle")) return;
    if (mode === "matchend" && modeT > 600) startMatch();
  }, { passive: true });

  function playerInput() {
    return {
      thrust: held.up,
      turn: (held.right ? 1 : 0) - (held.left ? 1 : 0),
      fire: held.fire,
    };
  }

  // ---- tick ---------------------------------------------------------------------------------
  function gameTick() {
    const p0 = playerInput();
    aiInput = Core.aiThink(state, 1, cfg.ai, Math.random, DT);
    const events = Core.step(state, DT, [p0, aiInput]);
    for (const e of events) {
      if (e.type === "fire") {
        const t = state.tanks[e.who];
        particles.push({
          x: t.x + Math.cos(t.a) * Core.MUZZLE, y: t.y + Math.sin(t.a) * Core.MUZZLE,
          vx: 0, vy: 0, life: 0.5, decay: 4, r: 1.6, color: COLORS[e.who].core,
        });
        Sfx.fire(e.who);
      } else if (e.type === "wallHit") {
        sparks(e.x, e.y, 7);
        Sfx.wallThud();
      } else if (e.type === "bounce") {
        sparks(e.x, e.y, 5);
        Sfx.bouncePing();
      } else if (e.type === "hit") {
        burst(e.x, e.y, e.victim, 52, 1.2);
        flash = 1;
        score[e.shooter]++;
        popScore(e.shooter);
        Sfx.hit();
        setTimeout(function () { Sfx.point(e.shooter); }, 380);
        resetIn = Core.SPIN_TIME * 1000 + 250; // let the spin play out first
      }
    }
    Sfx.engineThrottle(0, !!p0.thrust && state.tanks[0].spin <= 0);
    Sfx.engineThrottle(1, !!aiInput.thrust && state.tanks[1].spin <= 0);
  }

  // ---- mode driver ----------------------------------------------------------------------------
  function update(dt) {
    modeT += dt;
    if (mode === "countdown") {
      const stage = Math.floor(modeT / 620);
      if (stage !== countdownStage && stage <= 3) {
        countdownStage = stage;
        countdownEl.textContent = stage < 3 ? String(3 - stage) : "GO";
        countdownEl.classList.remove("tick");
        void countdownEl.offsetWidth;
        countdownEl.classList.add("tick");
        Sfx.tickTock(stage === 3);
      }
      if (modeT >= 3 * 620 + 300) {
        setMode("play");
        Sfx.enginesOn();
      }
    } else if (mode === "play") {
      state.speed = cfg.speed;
      state.bounce = cfg.bounce;
      playLeft -= dt / 1000;
      renderClock();
      if (resetIn > 0) {
        resetIn -= dt;
        if (resetIn <= 0) {
          Core.resetPositions(state);
          for (let i = 0; i < 2; i++) {
            burst(state.tanks[i].x, state.tanks[i].y, i, 10, 0.4); // arrival shimmer
          }
        }
      }
      tickAcc += dt;
      let guard = 0;
      while (tickAcc >= DT * 1000 && mode === "play" && guard < 6) {
        tickAcc -= DT * 1000;
        gameTick();
        guard++;
      }
      if (playLeft <= 0) {
        playLeft = 0;
        renderClock();
        setMode("matchend");
        Sfx.enginesOff();
        const winner = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
        Sfx.fanfare(winner === 0);
        showBanner(
          (winner === 0 ? "YOU WIN" : winner === 1 ? "THE MACHINE WINS" : "DRAW") +
          '<span class="sub">SPACE OR TAP TO GO AGAIN</span>',
          winner === 0 ? "you" : winner === 1 ? "cpu" : "draw"
        );
      }
    }
    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vx *= 0.985;
      p.vy *= 0.985;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (flash > 0) flash = Math.max(0, flash - dt / 380);
  }

  // ---- draw -------------------------------------------------------------------------------------
  function roundRectPath(x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }

  function drawWalls() {
    const glow = cfg.glow;
    for (let i = 4; i < state.walls.length; i++) {
      const w = state.walls[i];
      const x = w[0] * u, y = w[1] * u, ww = w[2] * u, hh = w[3] * u;
      if (glow > 0.05) {
        ctx.save();
        ctx.shadowColor = "rgba(130, 160, 255, 0.8)";
        ctx.shadowBlur = 10 * glow;
        ctx.fillStyle = WALL_SOFT;
        roundRectPath(x - 2, y - 2, ww + 4, hh + 4, 5);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = WALL_FILL;
      roundRectPath(x, y, ww, hh, 4);
      ctx.fill();
      ctx.strokeStyle = WALL_EDGE;
      ctx.lineWidth = 1.2;
      roundRectPath(x + 0.6, y + 0.6, ww - 1.2, hh - 1.2, 4);
      ctx.stroke();
    }
  }

  function drawTank(idx) {
    const t = state.tanks[idx];
    const c = COLORS[idx];
    const spinning = t.spin > 0;
    ctx.save();
    ctx.translate(t.x * u, t.y * u);
    ctx.rotate(t.a);
    ctx.scale(u, u);
    ctx.globalAlpha = spinning ? 0.55 + 0.45 * Math.sin(performance.now() / 28) : 1;
    if (cfg.glow > 0.05) {
      ctx.shadowColor = c.body;
      ctx.shadowBlur = 9 * cfg.glow * u * 0.25;
    }
    // treads
    ctx.fillStyle = c.dark;
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(-4.4, -4.1, 8.8, 1.8, 0.7); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-4.4, 2.3, 8.8, 1.8, 0.7); ctx.fill();
    } else {
      ctx.fillRect(-4.4, -4.1, 8.8, 1.8);
      ctx.fillRect(-4.4, 2.3, 8.8, 1.8);
    }
    // hull
    ctx.fillStyle = c.body;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-3.5, -2.5, 6.6, 5, 1); ctx.fill(); }
    else ctx.fillRect(-3.5, -2.5, 6.6, 5);
    // barrel
    ctx.fillStyle = c.core;
    ctx.fillRect(0.8, -0.55, 5.6, 1.1);
    // turret
    ctx.beginPath();
    ctx.arc(-0.2, 0, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-0.2, 0, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = c.core;
    ctx.fill();
    ctx.restore();
  }

  function drawShells() {
    for (const s of state.shells) {
      const c = COLORS[s.owner];
      const x = s.x * u, y = s.y * u;
      const tx = x - s.vx * 0.055 * u, ty = y - s.vy * 0.055 * u;
      ctx.save();
      if (cfg.glow > 0.05) {
        ctx.shadowColor = c.body;
        ctx.shadowBlur = 8 * cfg.glow;
      }
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, c.body);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.6, u * 0.5);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = c.core;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.4, u * 0.42), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    roundRectPath(0, 0, fieldW, fieldH, 12);
    ctx.fill();

    // grid
    ctx.strokeStyle = "rgba(140, 170, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gs = 10 * u;
    for (let x = gs; x < fieldW; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, fieldH); }
    for (let y = gs; y < fieldH; y += gs) { ctx.moveTo(0, y); ctx.lineTo(fieldW, y); }
    ctx.stroke();

    // arena edge
    ctx.strokeStyle = "rgba(150, 190, 255, " + (0.10 + flash * 0.5) + ")";
    ctx.lineWidth = 1.5;
    roundRectPath(0.75, 0.75, fieldW - 1.5, fieldH - 1.5, 12);
    ctx.stroke();

    drawWalls();
    drawShells();
    drawTank(0);
    drawTank(1);

    // particles (world units)
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * u, p.y * u, p.r * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    if (flash > 0.01) {
      ctx.fillStyle = "rgba(255, 255, 255, " + flash * 0.05 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- main loop -----------------------------------------------------------------------------------
  function frame(now) {
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---- tuner wiring -----------------------------------------------------------------------------------
  const tuner = document.getElementById("tuner");
  const tunerToggle = document.getElementById("tuner-toggle");
  tunerToggle.addEventListener("click", function () {
    tuner.classList.toggle("open");
  });
  // Click anywhere off the panel dismisses it (house rule 2026-07-25).
  // pointerdown, not click: a slider drag released off-panel is not "away".
  document.addEventListener("pointerdown", function (e) {
    if (!tuner.classList.contains("open")) return;
    if (tuner.contains(e.target) || tunerToggle.contains(e.target)) return;
    tuner.classList.remove("open");
  });

  const speedSlider = document.getElementById("t-speed");
  const speedVal = document.getElementById("t-speed-val");
  const glowSlider = document.getElementById("t-glow");
  const glowVal = document.getElementById("t-glow-val");
  const mazeNameEl = document.getElementById("t-maze-name");
  function syncSeg(id, value) {
    document.querySelectorAll("#" + id + " button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.v === String(value));
    });
  }
  function syncMazeName() {
    mazeNameEl.textContent = Core.MAZES[state.maze].name;
  }
  function syncTunerUI() {
    speedSlider.value = cfg.speed;
    speedVal.textContent = parseFloat(Number(cfg.speed).toFixed(2)) + "×";
    glowSlider.value = cfg.glow;
    glowVal.textContent = Number(cfg.glow).toFixed(1);
    syncSeg("t-maze", cfg.maze);
    syncSeg("t-ai", cfg.ai);
    syncSeg("t-match", cfg.match);
    syncSeg("t-bounce", cfg.bounce ? "on" : "off");
  }
  speedSlider.addEventListener("input", function () {
    cfg.speed = parseFloat(speedSlider.value);
    saveCfg(); syncTunerUI();
  });
  glowSlider.addEventListener("input", function () {
    cfg.glow = parseFloat(glowSlider.value);
    saveCfg(); syncTunerUI();
  });
  document.querySelectorAll("#t-maze button").forEach(function (b) {
    b.addEventListener("click", function () {
      const v = b.dataset.v === "rnd" ? "rnd" : parseInt(b.dataset.v, 10);
      if (cfg.maze === v) return;
      cfg.maze = v;
      saveCfg(); syncTunerUI();
      startMatch();
    });
  });
  document.querySelectorAll("#t-ai button").forEach(function (b) {
    b.addEventListener("click", function () {
      const v = parseInt(b.dataset.v, 10);
      if (cfg.ai === v) return;
      cfg.ai = v;
      saveCfg(); syncTunerUI();
      startMatch();
    });
  });
  document.querySelectorAll("#t-match button").forEach(function (b) {
    b.addEventListener("click", function () {
      const v = parseInt(b.dataset.v, 10);
      if (cfg.match === v) return;
      cfg.match = v;
      saveCfg(); syncTunerUI();
      startMatch();
    });
  });
  document.querySelectorAll("#t-bounce button").forEach(function (b) {
    b.addEventListener("click", function () {
      cfg.bounce = b.dataset.v === "on";
      saveCfg(); syncTunerUI(); // live — only new shells are affected
    });
  });
  document.getElementById("t-reset").addEventListener("click", function () {
    cfg = Object.assign({}, DEFAULTS);
    saveCfg(); syncTunerUI();
    startMatch();
  });

  // ---- go ---------------------------------------------------------------------------------------------------
  syncTunerUI();
  resize();
  renderScores();
  renderClock();
  syncMazeName();
  requestAnimationFrame(frame);

  setTimeout(function () { document.getElementById("title").classList.add("faded"); }, 12000);
})();
