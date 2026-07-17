// Get Your Ass in the Moss — a psychedelic fungal grotto.
// Rendered plates + sprites come from Blender (tmp/get-your-ass-in-the-moss/build_scene.py);
// this file adds the living layer: god rays, spores, mushroom pokes, exit glows,
// the sit-in-the-moss trip arc, and a generative Web Audio jungle.

(() => {
  "use strict";

  const BUILD = "moss-2";
  console.log("Get Your Ass in the Moss —", BUILD);
  document.body.dataset.build = BUILD;

  const M = globalThis.MOSS_MANIFEST;
  if (!M) {
    console.error("manifest missing — run tmp/get-your-ass-in-the-moss/build_scene.py");
    return;
  }

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.getElementById("stage");
  const scene = document.getElementById("scene");
  const setPlate = document.querySelector(".plate-set");
  const fgPlate = document.querySelector(".plate-fg");
  const deep = document.getElementById("deep");
  const front = document.getElementById("front");
  const deepCtx = deep.getContext("2d");
  const frontCtx = front.getContext("2d");
  const whisper = document.getElementById("whisper");
  const sitBtn = document.getElementById("sit");
  const exitEls = {
    hollow: document.querySelector(".exit-hollow"),
    ring: document.querySelector(".exit-ring"),
    gap: document.querySelector(".exit-gap"),
  };

  // ---------- cover mapping: 1920x1080 frame -> viewport ----------
  const FRAME = M.frame;
  const view = { dw: 0, dh: 0, ox: 0, oy: 0 };
  const fx = (nx) => view.ox + nx * view.dw;
  const fy = (ny) => view.oy + ny * view.dh;

  // ---------- mushroom sprites ----------
  const shroomsWrap = document.getElementById("shrooms");
  const bySizeDesc = [...M.shrooms].sort((a, b) => b.size - a.size);
  const shrooms = M.shrooms.map((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shroom";
    btn.style.zIndex = String(300 + Math.round((12 - m.depth) * 20));
    btn.setAttribute("aria-label", "A giant glowing mushroom — give it a poke");
    const img = document.createElement("img");
    img.src = `./assets/sprites/shroom-${m.i}.png`;
    img.alt = "";
    img.draggable = false;
    btn.appendChild(img);
    shroomsWrap.appendChild(btn);
    const s = {
      m,
      btn,
      breathPhase: Math.random() * Math.PI * 2,
      breathFreq: 0.55 + Math.random() * 0.35, // rad/s — slow
      squash: 0,
      squashVel: 0,
      flare: 0,
      note: bySizeDesc.indexOf(m),
    };
    btn.addEventListener("click", () => poke(s));
    return s;
  });

  function placeRect(el, rect, minW = 0, minH = 0) {
    let w = rect.w * view.dw;
    let h = rect.h * view.dh;
    let x = fx(rect.x);
    let y = fy(rect.y);
    if (w < minW) { x -= (minW - w) / 2; w = minW; }
    if (h < minH) { y -= (minH - h) / 2; h = minH; }
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
  }

  let dpr = 1;
  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(vw / FRAME.w, vh / FRAME.h);
    view.dw = FRAME.w * scale;
    view.dh = FRAME.h * scale;
    view.ox = (vw - view.dw) / 2;
    view.oy = (vh - view.dh) / 2;

    for (const plate of [setPlate, fgPlate]) {
      plate.style.left = `${view.ox}px`;
      plate.style.top = `${view.oy}px`;
      plate.style.width = `${view.dw}px`;
      plate.style.height = `${view.dh}px`;
    }

    // fill-rate cap ~3.2MP per canvas
    dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(3.2e6 / (vw * vh)) || 1);
    if (dpr <= 0) dpr = 1;
    for (const c of [deep, front]) {
      c.width = Math.round(vw * dpr);
      c.height = Math.round(vh * dpr);
      c.style.left = "0";
      c.style.top = "0";
      c.style.width = `${vw}px`;
      c.style.height = `${vh}px`;
    }
    deepCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const s of shrooms) {
      placeRect(s.btn, s.m.rect);
      const oxp = ((s.m.anchor.x - s.m.rect.x) / s.m.rect.w) * 100;
      const oyp = ((s.m.anchor.y - s.m.rect.y) / s.m.rect.h) * 100;
      s.btn.style.transformOrigin = `${oxp}% ${oyp}%`;
    }

    placeRect(exitEls.hollow, M.exits.hollow, 70, 100);
    placeRect(exitEls.ring, M.exits.ring, 90, 90);
    placeRect(exitEls.gap, M.exits.gap, 80, 140);
    placeRect(sitBtn, M.sit);
  }

  // ---------- pointer ----------
  const pointer = { x: -1e4, y: -1e4, active: false };
  stage.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    maybeMossRipple(e.clientX, e.clientY);
  });
  stage.addEventListener("pointerleave", () => { pointer.active = false; });

  // ---------- glow sprites ----------
  function bakeGlow(hue, sat) {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `hsla(${hue}, ${sat}%, 88%, 1)`);
    grad.addColorStop(0.35, `hsla(${hue}, ${sat}%, 65%, 0.75)`);
    grad.addColorStop(1, `hsla(${hue}, ${sat}%, 55%, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return c;
  }
  const glowSprites = M.palette.map((h) => bakeGlow(h * 360, 95));
  const whiteGlow = bakeGlow(90, 30);

  // ---------- trip state ----------
  let seated = false;
  let trip = 0;
  let whispered = false;

  function setSeated(next) {
    if (seated === next) return;
    seated = next;
    sitBtn.setAttribute("aria-pressed", String(seated));
    sitBtn.setAttribute("aria-label", seated ? "Rise up out of the moss" : "Settle into the moss");
    if (seated) {
      hideWhisper();
      audio.sitDown();
    } else {
      audio.standUp();
    }
  }
  sitBtn.addEventListener("click", () => setSeated(!seated));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setSeated(false);
  });

  function hideWhisper() {
    whispered = true;
    whisper.classList.remove("show");
  }
  setTimeout(() => { if (!whispered) whisper.classList.add("show"); }, 1800);
  setTimeout(hideWhisper, 17000);

  // ---------- exits hover glow ----------
  const exitHover = { hollow: 0, ring: 0, gap: 0 };
  const exitHoverTarget = { hollow: 0, ring: 0, gap: 0 };
  for (const [name, el] of Object.entries(exitEls)) {
    for (const ev of ["mouseenter", "focus"]) {
      el.addEventListener(ev, () => { exitHoverTarget[name] = 1; });
    }
    for (const ev of ["mouseleave", "blur"]) {
      el.addEventListener(ev, () => { exitHoverTarget[name] = 0; });
    }
  }

  // ---------- particles ----------
  const spores = [];
  const SPORE_MAX = 150;
  for (let i = 0; i < SPORE_MAX; i++) {
    spores.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: 0, vy: 0,
      hue: (Math.random() * M.palette.length) | 0,
      phase: Math.random() * Math.PI * 2,
      size: 5 + Math.random() * 9,
    });
  }

  const bursts = [];
  const BURST_MAX = 240;
  function spawnBurst(x, y, hueIdx, n) {
    for (let i = 0; i < n; i++) {
      if (bursts.length >= BURST_MAX) bursts.shift();
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 50 + Math.random() * 130;
      bursts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        ttl: 1.2 + Math.random() * 0.7,
        hue: hueIdx,
        size: 4 + Math.random() * 8,
      });
    }
  }

  const ripples = [];
  let lastRippleAt = 0;
  function maybeMossRipple(x, y) {
    const now = performance.now();
    if (now - lastRippleAt < 140) return;
    const ny = (y - view.oy) / view.dh;
    if (ny < 0.56) return; // only on the mossy floor
    lastRippleAt = now;
    if (ripples.length > 24) ripples.shift();
    ripples.push({ x, y, r: 4, ttl: 1.1, life: 0, hue: (performance.now() / 30) % 360 });
  }
  let lastSitRipple = 0;

  // ---------- mushroom pokes ----------
  function poke(s) {
    s.squashVel -= 3.4;
    s.flare = 1;
    const capX = fx(s.m.anchor.x);
    const capY = fy(s.m.rect.y + s.m.rect.h * 0.22);
    spawnBurst(capX, capY, s.m.i, 22);
    audio.pluck(s.note, seated);
  }

  // ---------- audio ----------
  const audio = (() => {
    const PENTA = [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 392.0]; // E minor penta from E3
    let ctx = null;
    let master = null;
    let bedFilter = null;
    let bedGain = null;
    let fifth = null;
    let shimmer = null;
    let delayWet = null;
    let delayNode = null;
    let on = false;
    let volume = 0.8;
    let nextChirp = 0;

    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // drone bed
      bedGain = ctx.createGain();
      bedGain.gain.value = 0.22;
      bedFilter = ctx.createBiquadFilter();
      bedFilter.type = "lowpass";
      bedFilter.frequency.value = 350;
      bedFilter.Q.value = 0.8;
      bedGain.connect(bedFilter).connect(master);

      const mk = (type, freq, gain) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = gain;
        o.connect(g).connect(bedGain);
        o.start();
        return o;
      };
      mk("triangle", 55, 0.5);
      const oscB = mk("triangle", 82.41, 0.35);
      mk("sine", 27.5, 0.45);
      fifth = ctx.createOscillator();
      fifth.type = "triangle";
      fifth.frequency.value = 123.47;
      const fifthGain = ctx.createGain();
      fifthGain.gain.value = 0;
      fifth.connect(fifthGain).connect(bedGain);
      fifth.start();
      fifth._gain = fifthGain;

      // slow detune shimmer on oscB
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain).connect(oscB.detune);
      lfo.start();

      // filter breath
      const flfo = ctx.createOscillator();
      flfo.frequency.value = 0.06;
      const flfoGain = ctx.createGain();
      flfoGain.gain.value = 120;
      flfo.connect(flfoGain).connect(bedFilter.frequency);
      flfo.start();

      // high shimmer for deep trip
      shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = 1318.51; // E6
      const vib = ctx.createOscillator();
      vib.frequency.value = 5;
      const vibGain = ctx.createGain();
      vibGain.gain.value = 7;
      vib.connect(vibGain).connect(shimmer.detune);
      vib.start();
      const shimGain = ctx.createGain();
      shimGain.gain.value = 0;
      shimmer.connect(shimGain).connect(master);
      shimmer.start();
      shimmer._gain = shimGain;

      // echo bus for seated plucks
      delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = 0.36;
      const fb = ctx.createGain();
      fb.gain.value = 0.34;
      delayNode.connect(fb).connect(delayNode);
      delayWet = ctx.createGain();
      delayWet.gain.value = 0;
      delayNode.connect(delayWet).connect(master);
    }

    function applyVolume() {
      if (master) master.gain.linearRampToValueAtTime(on ? volume : 0, ctx.currentTime + 0.25);
    }

    function tone(type, f0, f1, dur, peak, when, pan) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, when);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, when + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      let out = g;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        out = p;
      }
      o.connect(g);
      out.connect(master);
      o.start(when);
      o.stop(when + dur + 0.05);
      return g;
    }

    return {
      get on() { return on; },
      start() {
        if (!ctx) build();
        on = true;
        return ctx.resume().then(() => {
          if (ctx.state !== "running") throw new Error("audio blocked");
          applyVolume();
        });
      },
      stop() {
        on = false;
        if (ctx) {
          applyVolume();
          setTimeout(() => { if (!on && ctx) ctx.suspend().catch(() => {}); }, 400);
        }
      },
      setVolume(v) {
        volume = v;
        applyVolume();
      },
      pluck(note, echoed) {
        if (!on || !ctx) return;
        const f = PENTA[Math.max(0, Math.min(PENTA.length - 1, note))];
        const when = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.24, when + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 1.3);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = f * 2;
        bp.Q.value = 1.4;
        o.connect(g).connect(bp);
        bp.connect(master);
        if (echoed && delayNode) bp.connect(delayNode);
        o.start(when);
        o.stop(when + 1.4);
      },
      sitDown() {
        if (!on || !ctx) return;
        const t = ctx.currentTime;
        bedFilter.frequency.linearRampToValueAtTime(900, t + 3.5);
        bedGain.gain.linearRampToValueAtTime(0.3, t + 3.5);
        fifth._gain.gain.linearRampToValueAtTime(0.18, t + 5);
        delayWet.gain.linearRampToValueAtTime(0.3, t + 2);
        // soft moss thump
        tone("sine", 95, 42, 0.35, 0.18, t, 0);
      },
      standUp() {
        if (!on || !ctx) return;
        const t = ctx.currentTime;
        bedFilter.frequency.linearRampToValueAtTime(350, t + 2.5);
        bedGain.gain.linearRampToValueAtTime(0.22, t + 2.5);
        fifth._gain.gain.linearRampToValueAtTime(0, t + 2.5);
        delayWet.gain.linearRampToValueAtTime(0, t + 1.5);
      },
      tick(tripNow) {
        if (!on || !ctx || ctx.state !== "running") return;
        if (shimmer) shimmer._gain.gain.value = 0.012 * Math.max(0, tripNow - 0.4) / 0.6;
        const now = ctx.currentTime;
        if (now >= nextChirp) {
          nextChirp = now + 3 + Math.random() * (6 - 2.5 * tripNow);
          const pan = Math.random() * 1.6 - 0.8;
          const kind = Math.random();
          if (kind < 0.45) {
            // bird gliss — snaps to the pentatonic when the trip is deep
            let f0 = 1200 + Math.random() * 900;
            let f1 = f0 * (1.5 + Math.random() * 0.8);
            if (tripNow > 0.6) {
              f0 = PENTA[(Math.random() * PENTA.length) | 0] * 8;
              f1 = PENTA[(Math.random() * PENTA.length) | 0] * 8;
            }
            tone("sine", f0, f1, 0.14, 0.05, now, pan);
            tone("sine", f1, f0 * 1.1, 0.1, 0.03, now + 0.18, pan);
          } else if (kind < 0.7) {
            // froggy croak
            tone("square", 140 + Math.random() * 60, 120, 0.16, 0.025, now, pan);
          } else {
            // twinkle
            const f = PENTA[(Math.random() * PENTA.length) | 0] * 4;
            tone("sine", f, f, 0.5, 0.035, now, pan);
          }
        }
      },
    };
  })();

  // ---------- drawing ----------
  const beams = [];
  for (let i = 0; i < 5; i++) {
    beams.push({
      nx: 0.16 + i * 0.11 + Math.random() * 0.04,
      tilt: 0.22 + Math.random() * 0.1,
      w: 34 + Math.random() * 62,
      phase: Math.random() * Math.PI * 2,
      speed: 0.05 + Math.random() * 0.05,
    });
  }

  function rectCenter(r) {
    return [fx(r.x + r.w / 2), fy(r.y + r.h / 2)];
  }

  function drawDeep(t) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    deepCtx.clearRect(0, 0, w, h);
    deepCtx.globalCompositeOperation = "lighter";

    // god rays
    const rayBoost = 1 + trip * 0.9;
    for (const b of beams) {
      const sway = REDUCED ? 0 : Math.sin(t * b.speed + b.phase) * 0.02;
      const alpha = (0.045 + 0.035 * Math.sin(t * 0.07 + b.phase * 2)) * rayBoost;
      if (alpha <= 0.008) continue;
      const x = fx(b.nx);
      deepCtx.save();
      deepCtx.translate(x, view.oy - 40);
      deepCtx.rotate(b.tilt + sway);
      const len = view.dh * 0.78;
      const grad = deepCtx.createLinearGradient(0, 0, 0, len);
      grad.addColorStop(0, `hsla(70, 60%, 75%, ${alpha})`);
      grad.addColorStop(0.55, `hsla(85, 70%, 68%, ${alpha * 0.7})`);
      grad.addColorStop(1, "hsla(85, 70%, 68%, 0)");
      deepCtx.fillStyle = grad;
      deepCtx.fillRect(-b.w / 2, 0, b.w, len);
      deepCtx.restore();
    }

    // hollow pulse (drift exit)
    {
      const [cx, cy] = rectCenter(M.exits.hollow);
      const hov = exitHover.hollow;
      const rr = view.dh * (0.055 + 0.008 * Math.sin(t * 0.9));
      const a = 0.10 + 0.05 * Math.sin(t * 0.7) + hov * 0.3;
      const hue = 160 + 60 * Math.sin(t * 0.15);
      const g = deepCtx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, `hsla(${hue}, 90%, 65%, ${a})`);
      g.addColorStop(1, `hsla(${hue}, 90%, 65%, 0)`);
      deepCtx.fillStyle = g;
      deepCtx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }

    // fairy ring twinkle (drift exit)
    {
      const hov = exitHover.ring;
      for (let i = 0; i < M.ringDots.length; i++) {
        const d = M.ringDots[i];
        const x = fx(d.x);
        const y = fy(d.y);
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 2.1));
        const size = view.dh * 0.028 * (0.7 + 0.6 * tw) * (1 + hov * 0.8);
        deepCtx.globalAlpha = (0.28 + 0.5 * tw) * (0.55 + hov * 0.45);
        deepCtx.drawImage(glowSprites[i % glowSprites.length], x - size / 2, y - size / 2, size, size);
      }
      deepCtx.globalAlpha = 1;
      if (hov > 0.02) {
        // a bright mote runs the ring when you find it
        const [cx, cy] = rectCenter(M.exits.ring);
        const a = t * 1.6;
        const rx = M.exits.ring.w * view.dw * 0.36;
        const ry = M.exits.ring.h * view.dh * 0.30;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        deepCtx.globalAlpha = hov * 0.9;
        const s = view.dh * 0.03;
        deepCtx.drawImage(whiteGlow, x - s / 2, y - s / 2, s, s);
        deepCtx.globalAlpha = 1;
      }
    }

    // misty gap shimmer (drift exit)
    {
      const r = M.exits.gap;
      const hov = exitHover.gap;
      const gx = fx(r.x);
      const gw = r.w * view.dw;
      const gy = fy(r.y);
      const gh = r.h * view.dh;
      const a = 0.05 + 0.035 * Math.sin(t * 0.5) + hov * 0.22;
      const g = deepCtx.createLinearGradient(gx, 0, gx + gw, 0);
      g.addColorStop(0, "hsla(165, 90%, 75%, 0)");
      g.addColorStop(0.5, `hsla(165, 90%, 75%, ${a})`);
      g.addColorStop(1, "hsla(165, 90%, 75%, 0)");
      deepCtx.fillStyle = g;
      deepCtx.fillRect(gx, gy, gw, gh);
      // slow rising motes in the gap
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.06 + i / 6) % 1;
        const x = gx + gw * (0.25 + 0.5 * Math.sin(i * 37.7));
        const y = gy + gh * (1 - ph);
        const s = view.dh * 0.014;
        deepCtx.globalAlpha = Math.sin(ph * Math.PI) * (0.25 + hov * 0.5);
        deepCtx.drawImage(whiteGlow, x - s / 2, y - s / 2, s, s);
      }
      deepCtx.globalAlpha = 1;
    }

    // glow pools under the mushrooms
    for (const s of shrooms) {
      const x = fx(s.m.anchor.x);
      const y = fy(s.m.anchor.y);
      const rr = view.dw * (0.028 + s.m.size * 0.014) * (1 + s.flare * 0.5);
      const a = 0.055 + 0.03 * Math.sin(t * s.breathFreq + s.breathPhase) + s.flare * 0.24;
      const g = deepCtx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `hsla(${s.m.hue * 360}, 95%, 62%, ${Math.max(0, a)})`);
      g.addColorStop(1, `hsla(${s.m.hue * 360}, 95%, 62%, 0)`);
      deepCtx.fillStyle = g;
      deepCtx.save();
      deepCtx.translate(x, y);
      deepCtx.scale(1, 0.38);
      deepCtx.fillRect(-rr, -rr, rr * 2, rr * 2);
      deepCtx.restore();
    }

    // moss ripples
    for (const rp of ripples) {
      const k = rp.life / rp.ttl;
      deepCtx.globalAlpha = (1 - k) * 0.35;
      deepCtx.strokeStyle = `hsla(${(rp.hue + t * 40) % 360}, 90%, 70%, 1)`;
      deepCtx.lineWidth = 1.6;
      deepCtx.beginPath();
      deepCtx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.38, 0, 0, Math.PI * 2);
      deepCtx.stroke();
    }
    deepCtx.globalAlpha = 1;
    deepCtx.globalCompositeOperation = "source-over";
  }

  function drawFront(t) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    frontCtx.clearRect(0, 0, w, h);
    frontCtx.globalCompositeOperation = "lighter";

    // trip aurora
    const auroraA = (REDUCED ? 0.015 : 0.025) + trip * 0.11;
    if (auroraA > 0.02) {
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.5 + 0.4 * Math.sin(t * 0.037 + i * 2.1));
        const cy = h * (0.42 + 0.3 * Math.sin(t * 0.051 + i * 4.2));
        const rr = Math.min(w, h) * (0.45 + 0.12 * Math.sin(t * 0.043 + i));
        const hue = ((t * 9 + i * 120) % 360 + 360) % 360;
        const g = frontCtx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, `hsla(${hue}, 90%, 60%, ${auroraA})`);
        g.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
        frontCtx.fillStyle = g;
        frontCtx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      }
    }

    // sitting: depression + slow ripples from the sit spot
    if (seated || trip > 0.02) {
      const [sx, sy] = rectCenter(M.sit);
      const rr = view.dw * 0.06;
      frontCtx.globalCompositeOperation = "source-over";
      const g = frontCtx.createRadialGradient(sx, sy, 0, sx, sy, rr);
      g.addColorStop(0, `rgba(2, 12, 5, ${0.22 * trip})`);
      g.addColorStop(1, "rgba(2, 12, 5, 0)");
      frontCtx.fillStyle = g;
      frontCtx.save();
      frontCtx.translate(sx, sy);
      frontCtx.scale(1, 0.4);
      frontCtx.fillRect(-rr, -rr, rr * 2, rr * 2);
      frontCtx.restore();
      frontCtx.globalCompositeOperation = "lighter";
      if (seated && t - lastSitRipple > 2.4) {
        lastSitRipple = t;
        if (ripples.length > 24) ripples.shift();
        ripples.push({ x: sx, y: sy, r: 10, ttl: 2.6, life: 0, hue: (t * 40) % 360 });
      }
    }

    // spores
    const active = Math.round(60 + 90 * trip);
    for (let i = 0; i < active && i < spores.length; i++) {
      const p = spores[i];
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.1 + p.phase));
      frontCtx.globalAlpha = 0.5 * tw;
      const spr = glowSprites[p.hue];
      frontCtx.drawImage(spr, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    // pokes
    for (const b of bursts) {
      const k = b.life / b.ttl;
      frontCtx.globalAlpha = (1 - k) * 0.85;
      const spr = glowSprites[b.hue];
      frontCtx.drawImage(spr, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
    }
    frontCtx.globalAlpha = 1;
    frontCtx.globalCompositeOperation = "source-over";
  }

  // ---------- simulation ----------
  function updateParticles(dt, t) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxSpeed = 26 + 20 * trip;
    const active = Math.round(60 + 90 * trip);
    for (let i = 0; i < active && i < spores.length; i++) {
      const p = spores[i];
      p.vx += Math.sin(t * 0.31 + p.phase) * 7 * dt;
      p.vy += (Math.cos(t * 0.23 + p.phase * 1.7) * 5 - 2.5) * dt;
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 260 * 260 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = 16 * (1 - d / 260) * dt;
          if (seated) {
            // orbit the visitor's hand while they're settled in
            p.vx += (-dy / d) * f * 3.2 + (dx / d) * f * 0.6;
            p.vy += (dx / d) * f * 3.2 + (dy / d) * f * 0.6;
          } else {
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
      }
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxSpeed) {
        p.vx = (p.vx / sp) * maxSpeed;
        p.vy = (p.vy / sp) * maxSpeed;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -20) p.x = w + 18;
      if (p.x > w + 20) p.x = -18;
      if (p.y < -20) p.y = h + 18;
      if (p.y > h + 20) p.y = -18;
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life += dt;
      if (b.life >= b.ttl) {
        bursts.splice(i, 1);
        continue;
      }
      b.vy -= 26 * dt; // spores rise
      b.vx *= 1 - 0.8 * dt;
      b.vy *= 1 - 0.5 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.life += dt;
      rp.r += 60 * dt;
      if (rp.life >= rp.ttl) ripples.splice(i, 1);
    }
  }

  let lastFilter = "";
  let lastFgTransform = "";
  function updateGrade(t) {
    const wob = REDUCED ? 0 : Math.sin(t * 0.31) * 14 * trip;
    const f = `saturate(${(1 + 0.55 * trip).toFixed(3)}) hue-rotate(${wob.toFixed(1)}deg) brightness(${(1 + 0.05 * trip).toFixed(3)})`;
    if (f !== lastFilter) {
      lastFilter = f;
      scene.style.filter = f;
    }
    const ft = `translateY(${(-10 * trip).toFixed(1)}px) scale(${(1 + 0.012 * trip).toFixed(4)})`;
    if (ft !== lastFgTransform) {
      lastFgTransform = ft;
      fgPlate.style.transformOrigin = "50% 100%";
      fgPlate.style.transform = ft;
    }
  }

  function updateShrooms(dt, t) {
    for (const s of shrooms) {
      // squash spring
      s.squashVel += (-42 * s.squash - 7 * s.squashVel) * dt;
      s.squash += s.squashVel * dt;
      if (Math.abs(s.squash) < 0.0004 && Math.abs(s.squashVel) < 0.0004) {
        s.squash = 0;
        s.squashVel = 0;
      }
      s.flare = Math.max(0, s.flare - dt / 1.2);
      const breath = REDUCED ? 0 : Math.sin(t * s.breathFreq + s.breathPhase) * (0.006 + 0.006 * trip);
      const sy = 1 + breath + s.squash * 0.16;
      const sx = 1 - (breath + s.squash * 0.16) * 0.7;
      s.btn.style.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    }
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(nowMs) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (nowMs - last) / 1000) || 0.016;
    last = nowMs;
    const t = nowMs / 1000;

    trip += (seated ? dt / 24 : -dt / 4.5);
    trip = Math.max(0, Math.min(1, trip));

    for (const k of Object.keys(exitHover)) {
      exitHover[k] += (exitHoverTarget[k] - exitHover[k]) * Math.min(1, dt * 6);
    }

    updateParticles(dt, t);
    updateShrooms(dt, t);
    updateGrade(t);
    if (!document.hidden) {
      drawDeep(t);
      drawFront(t);
    }
    audio.tick(trip);
  }

  layout();
  window.addEventListener("resize", layout);
  requestAnimationFrame(frame);

  // shared sound control (single autoplay attempt lives inside attach)
  window.ElasticSoundControl.attach({
    start: () => audio.start(),
    stop: () => audio.stop(),
    setVolume: (v) => audio.setVolume(v),
  });
})();
