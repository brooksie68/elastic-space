(() => {
  "use strict";

  // ---------- color math: sRGB <-> OKLab / OKLCH ----------

  const linToSrgbByte = (c) => {
    c = Math.min(1, Math.max(0, c));
    const s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(s * 255);
  };

  const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  function hexToOklab(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = srgbToLin(((n >> 16) & 255) / 255);
    const g = srgbToLin(((n >> 8) & 255) / 255);
    const b = srgbToLin((n & 255) / 255);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }

  function oklabToLch([L, a, b]) {
    return { L, C: Math.hypot(a, b), H: (Math.atan2(b, a) * 180) / Math.PI };
  }

  function lchToOklab(L, C, H) {
    const h = (H * Math.PI) / 180;
    return [L, C * Math.cos(h), C * Math.sin(h)];
  }

  function oklabToRgb(L, a, b, out, i) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    out[i] = linToSrgbByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
    out[i + 1] = linToSrgbByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
    out[i + 2] = linToSrgbByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
    out[i + 3] = 255;
  }

  // ---------- palettes ----------

  const PRESETS = {
    dusk: ["#eb6145", "#20346b", "#22304a", "#5c3143", "#1a2438"],
    no61: ["#7c2f21", "#2e3a5c", "#243352", "#1d2a46", "#16213a"],
    saffron: ["#e0a32e", "#d97c1a", "#c25a10", "#a34410", "#7d330d"],
    maroon: ["#1c1416", "#3a1420", "#4a1a26", "#2a0f16", "#160a0d"],
    center: ["#d8c6a2", "#b0413e", "#3e3a63", "#8a7b57", "#2c2a49"],
    green: ["#5a7a58", "#2e4a6e", "#27405f", "#1f3550", "#182a42"],
  };

  const DEFAULTS = {
    fields: 2,
    colors: PRESETS.dusk.slice(),
    speed: "slow",
    softness: 35,
    grain: 25,
    drift: 25,
    wander: false,
  };

  const SPEED_MULT = { glacial: 0.45, slow: 1, restless: 2.6 };

  let state = JSON.parse(JSON.stringify(DEFAULTS)); // reset on load, always

  // ---------- slow oscillators ----------
  // Sum of two detuned sines: never repeats on human timescales, always in [-1, 1].

  function mkOsc(minP, maxP) {
    const p1 = minP + Math.random() * (maxP - minP);
    const p2 = minP + Math.random() * (maxP - minP);
    const f1 = (Math.PI * 2) / p1;
    const f2 = (Math.PI * 2) / p2;
    const ph1 = Math.random() * Math.PI * 2;
    const ph2 = Math.random() * Math.PI * 2;
    return (t) => (Math.sin(t * f1 + ph1) + Math.sin(t * f2 + ph2)) * 0.5;
  }

  // ---------- runtime field / seam state ----------

  let fields = [];
  let seams = [];

  function buildFields() {
    const n = state.fields;
    fields = state.colors.slice(0, n).map((hex) => ({
      base: oklabToLch(hexToOklab(hex)),
      oL: mkOsc(70, 180),
      oC: mkOsc(90, 220),
      oH: mkOsc(110, 260),
      wanderH: mkOsc(420, 900),
      wanderL: mkOsc(500, 1100),
      lab: [0, 0, 0],
    }));
    seams = [];
    for (let i = 1; i < n; i++) {
      seams.push({
        basePos: i / n,
        oPos: mkOsc(120, 320),
        oSoft: mkOsc(90, 240),
        wf1: 5 + Math.random() * 6,
        wf2: 9 + Math.random() * 9,
        ws1: 0.006 + Math.random() * 0.01,
        ws2: 0.004 + Math.random() * 0.008,
        wph1: Math.random() * Math.PI * 2,
        wph2: Math.random() * Math.PI * 2,
        pos: i / n,
        soft: 0.05,
        wav: new Float32Array(0),
      });
    }
  }

  // ---------- canvases ----------

  const painting = document.getElementById("painting");
  const pctx = painting.getContext("2d");
  const grain = document.getElementById("grain");
  const gctx = grain.getContext("2d");

  const SIM_W = 288;
  const SIM_H = 162;
  const sim = document.createElement("canvas");
  sim.width = SIM_W;
  sim.height = SIM_H;
  const sctx = sim.getContext("2d");
  const img = sctx.createImageData(SIM_W, SIM_H);

  function bakeGrain() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 192;
    const tctx = tile.getContext("2d");
    const tdata = tctx.createImageData(192, 192);
    for (let i = 0; i < tdata.data.length; i += 4) {
      const v = 96 + Math.random() * 64;
      tdata.data[i] = tdata.data[i + 1] = tdata.data[i + 2] = v;
      tdata.data[i + 3] = 255;
    }
    tctx.putImageData(tdata, 0, 0);
    gctx.fillStyle = gctx.createPattern(tile, "repeat");
    gctx.fillRect(0, 0, grain.width, grain.height);
  }

  function resize() {
    painting.width = window.innerWidth;
    painting.height = window.innerHeight;
    grain.width = window.innerWidth;
    grain.height = window.innerHeight;
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = "high";
    bakeGrain();
  }

  window.addEventListener("resize", resize);

  // ---------- render ----------

  const smoothstep = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  function render(t) {
    const n = fields.length;

    for (const f of fields) {
      let L = f.base.L + f.oL(t) * 0.03;
      let C = f.base.C * (1 + f.oC(t) * 0.12);
      let H = f.base.H + f.oH(t) * 5;
      if (state.wander) {
        H += f.wanderH(t) * 45;
        L += f.wanderL(t) * 0.05;
      }
      f.lab = lchToOklab(L, Math.max(0, C), H);
    }

    const driftAmp = 0.012 + (state.drift / 100) * 0.33;
    // The melt roll's fog veil rides on top of the seam softness; never in state.
    const baseSoft = 0.004 + Math.pow(state.softness / 100, 1.4) * 0.22 + meltVeil;

    for (const s of seams) {
      s.pos = s.basePos + s.oPos(t) * driftAmp;
      s.soft = baseSoft * (0.65 + 0.4 * (s.oSoft(t) * 0.5 + 0.5));
      const wavAmp = 0.006 + s.soft * 0.5;
      if (s.wav.length !== SIM_W) s.wav = new Float32Array(SIM_W);
      for (let x = 0; x < SIM_W; x++) {
        const u = x / SIM_W;
        s.wav[x] =
          (Math.sin(u * s.wf1 + t * s.ws1 * 60 + s.wph1) +
            Math.sin(u * s.wf2 - t * s.ws2 * 60 + s.wph2)) *
          0.5 *
          wavAmp;
      }
    }

    const data = img.data;
    let i = 0;
    for (let y = 0; y < SIM_H; y++) {
      const v = (y + 0.5) / SIM_H;
      for (let x = 0; x < SIM_W; x++, i += 4) {
        let L = fields[0].lab[0];
        let a = fields[0].lab[1];
        let b = fields[0].lab[2];
        for (let k = 0; k < n - 1; k++) {
          const s = seams[k];
          const edge = s.pos + s.wav[x];
          const m = smoothstep(edge - s.soft, edge + s.soft, v);
          if (m > 0) {
            const lab = fields[k + 1].lab;
            L += (lab[0] - L) * m;
            a += (lab[1] - a) * m;
            b += (lab[2] - b) * m;
          }
        }
        oklabToRgb(L, a, b, data, i);
      }
    }
    i = 0;
    sctx.putImageData(img, 0, 0);
    pctx.drawImage(sim, 0, 0, painting.width, painting.height);
  }

  // ---------- diegetic exits ----------

  const doorEl = document.querySelector(".portal-door");
  const windowEl = document.querySelector(".portal-window");
  const seamEl = document.querySelector(".portal-seam");
  const doorCycle = mkOsc(90, 150);
  const windowCycle = mkOsc(100, 170);

  function placeExits(t) {
    // the door and window surface and sink on their own slow schedules
    const c = doorCycle(t);
    const surfaced = Math.max(0, c) ** 3 * 0.1;
    doorEl.style.setProperty("--surface", surfaced.toFixed(4));

    const w = windowCycle(t);
    const lit = Math.max(0, w) ** 3 * 0.12;
    windowEl.style.setProperty("--surface", lit.toFixed(4));

    // the seam glint rides the first seam's current position
    if (seams.length) {
      const y = (seams[0].pos + seams[0].wav[Math.floor(SIM_W * 0.11)]) * window.innerHeight;
      seamEl.style.top = `${Math.round(y - 28)}px`;
    }
  }

  // ---------- loop ----------

  let tSim = Math.random() * 600; // start mid-breath, never at a zero crossing
  let last = performance.now();
  let acc = 1000;

  function tick(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    tSim += dt * SPEED_MULT[state.speed];
    acc += now - (tick.prev || now);
    tick.prev = now;
    if (acc >= 90 || meltRaf) {
      acc = 0;
      render(tSim);
      placeExits(tSim);
    }
    requestAnimationFrame(tick);
  }

  // ---------- the conservator's panel ----------

  const panel = document.getElementById("panel");
  const labelCard = document.getElementById("label-card");
  const swatchesEl = document.getElementById("swatches");
  const fieldsGroup = document.getElementById("ctl-fields");
  const speedGroup = document.getElementById("ctl-speed");
  const presetSel = document.getElementById("ctl-preset");
  const wanderChk = document.getElementById("ctl-wander");
  const softnessCtl = document.getElementById("ctl-softness");
  const grainCtl = document.getElementById("ctl-grain");
  const driftCtl = document.getElementById("ctl-drift");
  const resetBtn = document.getElementById("ctl-reset");

  labelCard.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    labelCard.setAttribute("aria-expanded", String(open));
  });
  // Click anywhere off the panel dismisses it (house rule 2026-07-25).
  // pointerdown, not click: a slider drag released off-panel is not "away".
  document.addEventListener("pointerdown", (e) => {
    if (panel.hidden) return;
    if (panel.contains(e.target) || labelCard.contains(e.target)) return;
    if (e.target.closest && e.target.closest(".label-die")) return; // a roll keeps the notes open
    panel.hidden = true;
    labelCard.setAttribute("aria-expanded", "false");
  });

  function setRadio(group, attr, value) {
    for (const btn of group.querySelectorAll("button")) {
      const on = btn.dataset[attr] === String(value);
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-checked", String(on));
    }
  }

  function buildSwatches() {
    swatchesEl.textContent = "";
    for (let i = 0; i < state.fields; i++) {
      const input = document.createElement("input");
      input.type = "color";
      input.value = state.colors[i];
      input.setAttribute("aria-label", `Field ${i + 1} pigment`);
      input.addEventListener("input", () => {
        state.colors[i] = input.value;
        presetSel.value = "";
        buildFields();
      });
      swatchesEl.appendChild(input);
    }
  }

  function applyGrain() {
    grain.style.opacity = ((state.grain / 100) * 0.5).toFixed(3);
  }

  function syncUI() {
    setRadio(fieldsGroup, "n", state.fields);
    setRadio(speedGroup, "v", state.speed);
    softnessCtl.value = state.softness;
    grainCtl.value = state.grain;
    driftCtl.value = state.drift;
    wanderChk.checked = state.wander;
    presetSel.value = "";
    buildSwatches();
    applyGrain();
  }

  fieldsGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-n]");
    if (!btn) return;
    state.fields = Number(btn.dataset.n);
    setRadio(fieldsGroup, "n", state.fields);
    buildSwatches();
    buildFields();
  });

  speedGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-v]");
    if (!btn) return;
    state.speed = btn.dataset.v;
    setRadio(speedGroup, "v", state.speed);
  });

  presetSel.addEventListener("change", () => {
    const preset = PRESETS[presetSel.value];
    if (!preset) return;
    state.colors = preset.slice();
    buildSwatches();
    buildFields();
  });

  wanderChk.addEventListener("change", () => {
    state.wander = wanderChk.checked;
  });

  softnessCtl.addEventListener("input", () => {
    state.softness = Number(softnessCtl.value);
  });

  driftCtl.addEventListener("input", () => {
    state.drift = Number(driftCtl.value);
  });

  grainCtl.addEventListener("input", () => {
    state.grain = Number(grainCtl.value);
    applyGrain();
  });

  resetBtn.addEventListener("click", () => {
    state = JSON.parse(JSON.stringify(DEFAULTS));
    syncUI();
    buildFields();
  });

  // ---------- the dice (2026-09-05) ----------
  // Lumina's pair, brought over on James's ask after the Chrome Rift's. The sharp
  // die snaps every control — fields, pigments, palette, tempo, seam, grain,
  // drift, wander — to a new hanging. The soft die MELTS there over two seconds:
  // the pigments glide in OKLab, the sliders ease, and a fog veil widens every
  // seam to a peak at the midpoint, where the things that cannot glide (the field
  // count, the tempo, wander) swap while the canvas is one soft gradient, then
  // the seams sharpen back in on the new hanging. A hand on any control ends a
  // melt where it stands. The panel holds both dice; the wall label carries the
  // same pair, thin and frosted, before the title.

  const MELT_MS = 2000;
  const MELT_VEIL = 0.22; // added seam softness at the peak — the whole canvas fogs

  let meltRaf = 0;
  let meltVeil = 0; // read by render()

  const PRESET_KEYS = Object.keys(PRESETS);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const scratch = [0, 0, 0, 0];
  const bytesToHex = () =>
    "#" + scratch.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");

  function lchToHex(L, C, H) {
    const [l, a, b] = lchToOklab(L, C, H);
    oklabToRgb(l, a, b, scratch, 0);
    return bytesToHex();
  }

  function lerpHexLab(hexA, hexB, t) {
    const a = hexToOklab(hexA);
    const b = hexToOklab(hexB);
    oklabToRgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, scratch, 0);
    return bytesToHex();
  }

  // Most rolls hang one of the six palettes (never the one already up); the
  // rest mix a fresh one — five close-valued pigments around one hue, muted
  // the way this room likes them, sometimes with one brighter accent across.
  function rollColors() {
    const current = JSON.stringify(state.colors);
    if (Math.random() < 0.6) {
      const pool = PRESET_KEYS.filter((k) => JSON.stringify(PRESETS[k]) !== current);
      return PRESETS[pick(pool)].slice();
    }
    const hue = rnd(0, 360);
    const spread = rnd(15, 70);
    const baseL = rnd(0.28, 0.6);
    const chroma = rnd(0.05, 0.16);
    const accent = Math.random() < 0.45 ? Math.floor(rnd(0, 5)) : -1;
    const colors = [];
    for (let i = 0; i < 5; i++) {
      let H = hue + rnd(-spread, spread);
      let L = Math.min(0.78, Math.max(0.16, baseL + rnd(-0.14, 0.14)));
      let C = chroma * rnd(0.6, 1.3);
      if (i === accent) {
        H = hue + 180 + rnd(-30, 30);
        L = Math.min(0.85, L + rnd(0.05, 0.25));
        C = Math.max(C, 0.12);
      }
      colors.push(lchToHex(L, C, H));
    }
    return colors;
  }

  function rollSettings() {
    return {
      fields: 2 + Math.floor(Math.random() * 4),
      colors: rollColors(),
      speed: pick(["glacial", "slow", "restless"]),
      softness: Math.round(rnd(0, 100)),
      grain: Math.round(rnd(0, 100)),
      drift: Math.round(rnd(0, 100)),
      wander: Math.random() < 0.3,
    };
  }

  function presetKeyFor(colors) {
    const key = JSON.stringify(colors);
    return PRESET_KEYS.find((k) => JSON.stringify(PRESETS[k]) === key) || "";
  }

  // Recolor the hung fields in place — the oscillators keep their phases, so a
  // melt never makes the seams jump.
  function retint() {
    for (let i = 0; i < fields.length; i++) {
      fields[i].base = oklabToLch(hexToOklab(state.colors[i]));
    }
  }

  function reflectSliders() {
    softnessCtl.value = state.softness;
    grainCtl.value = state.grain;
    driftCtl.value = state.drift;
    swatchesEl.querySelectorAll("input").forEach((input, i) => {
      input.value = state.colors[i];
    });
    applyGrain();
  }

  function cancelMelt() {
    if (!meltRaf) return;
    cancelAnimationFrame(meltRaf);
    meltRaf = 0;
    meltVeil = 0;
    state.softness = Math.round(state.softness);
    state.grain = Math.round(state.grain);
    state.drift = Math.round(state.drift);
  }

  function rollDice() {
    cancelMelt();
    state = rollSettings();
    syncUI();
    presetSel.value = presetKeyFor(state.colors);
    buildFields();
  }

  function meltRoll() {
    cancelMelt();
    const target = rollSettings();
    const from = JSON.parse(JSON.stringify(state));
    let swapped = false;
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    presetSel.value = "";

    const step = (now) => {
      const p = Math.min(1, (now - t0) / MELT_MS);
      const e = ease(p);
      state.softness = from.softness + (target.softness - from.softness) * e;
      state.grain = from.grain + (target.grain - from.grain) * e;
      state.drift = from.drift + (target.drift - from.drift) * e;
      state.colors = target.colors.map((c, i) => lerpHexLab(from.colors[i], c, e));
      if (!swapped && p >= 0.5) {
        // Under the fog: the count, the tempo, and wander swap; the new fields
        // are built once here (fresh oscillators, unseen), then retinted.
        swapped = true;
        state.fields = target.fields;
        state.speed = target.speed;
        state.wander = target.wander;
        buildSwatches();
        buildFields();
        setRadio(fieldsGroup, "n", state.fields);
        setRadio(speedGroup, "v", state.speed);
        wanderChk.checked = state.wander;
      }
      retint();
      reflectSliders();
      meltVeil = Math.sin(Math.PI * p) * MELT_VEIL;
      if (p < 1) {
        meltRaf = requestAnimationFrame(step);
      } else {
        meltRaf = 0;
        meltVeil = 0;
        presetSel.value = presetKeyFor(state.colors);
      }
    };
    meltRaf = requestAnimationFrame(step);
  }

  document.getElementById("ctl-dice").addEventListener("click", rollDice);
  document.getElementById("label-die").addEventListener("click", rollDice);
  document.getElementById("ctl-melt").addEventListener("click", meltRoll);
  document.getElementById("label-melt").addEventListener("click", meltRoll);

  // A hand on any control ends a melt where it stands (capture phase, so the
  // control's own handler then writes on top of the settled hanging).
  panel.addEventListener("input", cancelMelt, true);
  panel.addEventListener("change", cancelMelt, true);
  panel.addEventListener(
    "click",
    (e) => {
      if (e.target.closest(".steps button, .reset")) cancelMelt();
    },
    true,
  );

  // ---------- go ----------

  buildFields();
  syncUI();
  resize();
  requestAnimationFrame(tick);
})();
