// Lumina — the PERFORMANCE ENGINE (2026-09-29, James: "the key element is
// fun. futzing around with 50 little knobs isn't fun in real time"). A dozen
// big controls that each move many small ones, every one on a key, plus the
// hit moves that make the picture land on the music (react.js does the
// hearing; this file does the showing).
//
// THE CONTROLS LIVE IN THE CONTROLS WINDOW, not on the picture (James,
// 2026-09-30: "a satellite like the granular controls… both in the separate
// window with a handy toggle"). This file is the page side: state, the
// per-frame moves, the keys (on the page AND forwarded from the window), and
// the host plumbing — snapshot part + `perform` commands + fast "perf"
// messages (meters, thumbnails). `perform-ui.js` draws the controls in
// tuner.html from that data.
//
//   faders  Energy · Action · Saturation · Variety · Morph · Beat lock · Autopilot
//   pads    Dice (+ Color / Shape / Motion / Effects) · Back · Save · Opposite
//           · Break · Hold · Blackout · Strobe · Tap
//   scenes  saved looks as thumbnails: tap = cut, hold = morph
//   sound   the delay to your ears, Speakers or Bluetooth, set by tapping along
//
// Layers: the faders write the field's performance multipliers (setPerf —
// never config, never saved into looks); hits, flash, zoom, colour and the
// holds are an overlay + a CSS filter/transform on the frame, so they read on
// every look, DOM or GL. Looks (dice, scenes, opposite) go through the host
// like any other look change, so ↩ Back undoes them.
(function () {
  "use strict";

  const host = globalThis.LuminaHost;
  const field = globalThis.luminaField;
  const R = globalThis.LuminaReact;
  const F = globalThis.LuminaField;
  const frame = document.getElementById("lumina-frame");
  if (!host || !field || !R || !F || !frame) return;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();

  // --- settings ---------------------------------------------------------------------

  const STORE_KEY = "lumina-perform";
  const FADERS = [
    { id: "energy", label: "Energy", lo: "calm", hi: "wild", keys: ["Q", "A"], def: 0.5 },
    { id: "action", label: "Action", lo: "none", hi: "hard", keys: ["W", "S"], def: 0.6 },
    { id: "saturation", label: "Saturation", lo: "gray", hi: "neon", keys: ["E", "D"], def: 0.5 },
    { id: "variety", label: "Variety", lo: "nudge", hi: "new world", keys: ["R", "F"], def: 0.5 },
    { id: "morph", label: "Morph", lo: "cut", hi: "8 bars", keys: ["T", "G"], def: 0.25 },
    { id: "lock", label: "Beat lock", lo: "wander", hi: "snapped", keys: ["Y", "H"], def: 0.8 },
    { id: "autopilot", label: "Autopilot", lo: "you", hi: "it plays", keys: ["U", "J"], def: 0 },
  ];
  const st = {
    f: {},
    delayMode: "wired",
    delayWired: null, // null = what the browser reports
    delayBT: 0.2,
  };
  FADERS.forEach((d) => { st.f[d.id] = d.def; });
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && typeof s === "object") {
      if (s.f) FADERS.forEach((d) => { if (typeof s.f[d.id] === "number") st.f[d.id] = clamp(s.f[d.id], 0, 1); });
      if (s.delayMode === "bt" || s.delayMode === "wired") st.delayMode = s.delayMode;
      if (typeof s.delayWired === "number") st.delayWired = s.delayWired;
      if (typeof s.delayBT === "number") st.delayBT = s.delayBT;
    }
  } catch (err) { /* fine */ }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (err) { /* fine */ }
    }, 250);
  }

  // --- the sound delay ----------------------------------------------------------------

  let autoLat = 0.03;
  function delaySec(auto) {
    if (typeof auto === "number") autoLat = auto;
    if (st.delayMode === "bt") return st.delayBT;
    return st.delayWired !== null ? st.delayWired : autoLat;
  }
  function setDelay(v) {
    v = clamp(v, 0, 0.6);
    if (st.delayMode === "bt") st.delayBT = v;
    else st.delayWired = v;
    save();
    changed();
  }

  // --- what the music layer tells us, every frame it plays --------------------------------

  let fd = null;
  let fdAt = -1e9;
  let fdFresh = false;
  function playing() { return fd && now() - fdAt < 150; }
  function feed(o) {
    fd = o;
    fdAt = now();
    fdFresh = true;
    if (!o.calibrating) autopilotEvents(o);
  }

  // --- overlay ------------------------------------------------------------------------

  function div(cls, parent) {
    const d = document.createElement("div");
    d.className = cls;
    (parent || frame).appendChild(d);
    return d;
  }
  const flashEl = div("lum-pf-flash");
  const darkEl = div("lum-pf-dark");
  const strobeEl = div("lum-pf-strobe");
  const ringEl = div("lum-pf-ring");

  // --- look helpers -------------------------------------------------------------------

  const HEX = /^#[0-9a-f]{6}$/i;
  function lum(hex) {
    const n = parseInt(String(hex || "#000000").slice(1), 16);
    return (((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722) / 255;
  }
  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sa, sb) => Math.round(sa + (sb - sa) * t);
    const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
    const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
    const bl = ch(pa & 255, pb & 255);
    return "#" + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0");
  }
  function invertHex(a) {
    const n = parseInt(a.slice(1), 16);
    return "#" + ((~n) & 0xffffff).toString(16).padStart(6, "0");
  }
  const cleanState = () => globalThis.luminaTuner.getBase();

  // Hit wiring + flash colour, re-read when the look changes.
  let wiring = R.prewire(field.getConfig());
  let flashColor = "#ffffff";
  let wireSig = "";
  let wireCheck = 0;
  function rewire(t) {
    if (t - wireCheck < 250) return;
    wireCheck = t;
    const c = field.getConfig();
    const sig = [c.tileSize, c.gapX, c.gapY, c.shape, c.fill, c.layout, c.scene, c.sceneMix, c.sceneTiles, c.high, c.low].join("|");
    if (sig === wireSig) return;
    wireSig = sig;
    wiring = R.prewire(c);
    const hi = lum(c.high) >= lum(c.low) ? c.high : c.low;
    flashColor = HEX.test(hi) ? mixHex(hi, "#ffffff", lum(hi) < 0.4 ? 0.75 : 0.45) : "#ffffff";
    flashEl.style.backgroundColor = flashColor;
  }

  // --- the moves ------------------------------------------------------------------------

  const env = { kick: 0, snare: 0, hat: 0 };
  const TAU = { kick: 0.13, snare: 0.11, hat: 0.05 };
  let hueAcc = 0;
  let cycleMul = 1;
  // Break: hold builds tension, release explodes on the next beat.
  let breakStart = -1;
  let boomAt = -1e9;
  // Momentary holds.
  let blackout = false;
  let blackoutLevel = 0;
  let strobe = false;
  let strobePhase = 0;

  function energyNow() {
    if (!playing() || fd.calibrating) return st.f.energy;
    return clamp(fd.energy + (st.f.energy - 0.5) * 1.4, 0, 1);
  }
  const speedCurve = (e) => (e < 0.5 ? 0.35 + 1.3 * e : 1 + 1.8 * (e - 0.5));
  const satCurve = (s) => (s < 0.5 ? s * 2 : 1 + (s - 0.5) * 2.4);
  const actionMul = () => st.f.action / 0.6;

  // --- the scheduler: things that land on the beat -------------------------------------------

  const pending = [];
  function when(unit, fn, label) {
    const lock = st.f.lock;
    if (playing() && fd.clock && lock >= 0.25 && !fd.calibrating) {
      const u = unit === "auto" ? (lock >= 0.6 ? "bar" : "beat") : unit;
      const at = R.nextBoundary(fd.clock, fd.vis, u);
      pending.push({ at, fn, label });
      changed();
    } else {
      fn();
    }
  }
  function runPending() {
    if (!pending.length) return;
    const live = playing() && fd.clock;
    let ran = false;
    for (let i = 0; i < pending.length; i++) {
      const p = pending[i];
      if (!live || fd.vis >= p.at - 0.004 || p.at - fd.vis > 30) {
        pending.splice(i--, 1);
        p.fn();
        ran = true;
      }
    }
    if (ran) changed();
  }

  // How long a morph takes (the Morph fader), in ms. 0 = a cut.
  function morphMs(minBars) {
    const m = st.f.morph;
    let bars = m < 0.04 ? 0 : 0.5 * Math.pow(2, 4 * m);
    if (minBars && bars < minBars) bars = minBars;
    if (!bars) return 0;
    const barSec = playing() && fd.clock ? fd.clock.beatLen * 4 : 2;
    return bars * barSec * 1000;
  }
  function morphLabel() {
    const m = st.f.morph;
    if (m < 0.04) return "cut";
    const bars = 0.5 * Math.pow(2, 4 * m);
    return bars < 0.95 ? "½ bar" : `${bars < 1.5 ? 1 : Math.round(bars)} bar${bars >= 1.5 ? "s" : ""}`;
  }

  function showLook(config, ms) {
    host.command({ scope: "field", type: "look", config, ms: ms || 0 });
    sceneActive = null;
  }

  // --- the dice (smart) ---------------------------------------------------------------------

  const CATS = {
    color: ["low", "high", "bg", "palette", "hueShift", "scenePalette", "sceneGenome", "sceneHue"],
    shape: ["layout", "shape", "rows", "cols", "fill", "nest", "merge", "counter", "pattern", "spread",
      "twist", "tileSize", "gapX", "gapY", "inset", "radiusTile", "radiusRow", "radiusOuter", "border",
      "marginTop", "marginRight", "marginBottom", "marginLeft"],
    motion: ["speed", "holdScale", "desync", "ease", "waveform", "rotate", "spin", "displace",
      "sizePulse", "syncBeats", "accent"],
    effects: F.FX_KEYS.concat(["scene", "sceneMix", "sceneTiles", "sceneSpeed", "sceneScale",
      "sceneDrive", "sceneWarp", "blur"]),
  };
  const INT_KEYS = new Set(["rows", "cols", "nest", "syncBeats"]);
  // Rough spans for the "have we seen this lately" distance.
  const SPAN = { speed: 6, holdScale: 3, tileSize: 220, gapX: 130, gapY: 130, rows: 16, cols: 16, blur: 22,
    marginTop: 90, marginRight: 90, marginBottom: 90, marginLeft: 90, inset: 60, radiusRow: 40,
    radiusOuter: 80, border: 4, syncBeats: 16, nest: 2, spread: 2 };
  const recent = [];

  function lookDistance(a, b, keys) {
    let d = 0;
    let n = 0;
    for (const k of keys) {
      const va = a[k];
      const vb = b[k];
      if (va === undefined || vb === undefined) continue;
      n++;
      if (typeof va === "number" && typeof vb === "number") d += Math.min(1, Math.abs(va - vb) / (SPAN[k] || 1));
      else if (HEX.test(String(va)) && HEX.test(String(vb))) d += Math.abs(lum(va) - lum(vb)) + (va === vb ? 0 : 0.15);
      else d += va === vb ? 0 : 1;
    }
    return n ? d / n : 0;
  }

  function rollLook(cats, variety) {
    const cur = cleanState();
    const keys = [].concat(...cats.map((c) => CATS[c]));
    const v = 0.2 + 0.8 * variety;
    const pSwitch = 0.15 + 0.85 * variety;
    const need = 0.03 + 0.12 * variety;
    let best = null;
    let bestD = -1;
    for (let attempt = 0; attempt < 8; attempt++) {
      const r = globalThis.LuminaRandom.roll();
      const t = Object.assign({}, cur);
      let changed = 0;
      for (const k of keys) {
        if (!(k in r)) continue;
        const a = cur[k];
        const b = r[k];
        if (typeof a === "number" && typeof b === "number") {
          let x = a + (b - a) * v;
          if (INT_KEYS.has(k)) x = Math.round(x);
          t[k] = x;
        } else if (HEX.test(String(a)) && HEX.test(String(b))) {
          t[k] = mixHex(a, b, v);
        } else if (Math.random() < pSwitch) {
          t[k] = b;
        }
        if (t[k] !== a) changed++;
      }
      if (!changed) continue;
      // Beat lock wants a flash cycle it can lock.
      if (st.f.lock >= 0.5 && keys.includes("syncBeats") && !(t.syncBeats > 0)) t.syncBeats = [1, 2, 2, 4][Math.floor(Math.random() * 4)];
      // A roll must show something: tiles against their background.
      if ((!t.scene || t.scene === "none") && Math.abs(lum(t.high) - lum(t.bg)) < 0.15 && Math.abs(lum(t.low) - lum(t.bg)) < 0.15) {
        t.high = lum(t.bg) < 0.5 ? "#ffffff" : "#000000";
      }
      let d = 1;
      for (const old of recent) d = Math.min(d, lookDistance(t, old, keys));
      if (d > bestD) { best = t; bestD = d; }
      if (d >= need) break;
    }
    if (!best) return null;
    recent.push(best);
    if (recent.length > 12) recent.shift();
    return best;
  }

  function dice(cats, opts) {
    const o = opts || {};
    const variety = o.variety !== undefined ? o.variety : st.f.variety;
    when(o.unit || "auto", () => {
      const t = rollLook(cats, variety);
      if (t) showLook(t, o.ms !== undefined ? o.ms : morphMs());
    });
  }

  // --- opposite ---------------------------------------------------------------------------------

  function oppositeOf(c) {
    const o = {};
    if (HEX.test(c.low) && HEX.test(c.high)) { o.low = c.high; o.high = c.low; }
    if (HEX.test(c.bg)) o.bg = invertHex(c.bg);
    o.hueShift = ((c.hueShift || 0) + 0.5) % 1;
    o.sceneHue = ((c.sceneHue || 0) + 0.5) % 1;
    o.speed = clamp(0.9 / Math.max(0.15, c.speed || 1), 0.15, 6);
    o.desync = 1 - (c.desync || 0);
    o.holdScale = clamp(2.4 - (c.holdScale || 0), 0, 3);
    o.displace = (c.displace || 0) > 0.1 ? 0 : 0.5;
    o.rotate = (c.rotate || 0) > 0.1 ? 0 : 0.5;
    o.spin = (c.spin || 0) > 0.1 ? 0 : 0.35;
    o.sceneSpeed = clamp(2.2 - (c.sceneSpeed || 1), 0.1, 2);
    if (c.syncBeats > 0) o.syncBeats = c.syncBeats <= 1 ? 4 : 1;
    return o;
  }
  let oppDownAt = -1;
  let oppFrom = null; // the look before a latched opposite
  function oppositeDown() {
    if (oppDownAt >= 0) return;
    oppDownAt = now();
    host.command({ scope: "field", type: "punchDyn", name: "opposite", over: oppositeOf(cleanState()), on: true });
    manual();
  }
  function oppositeUp() {
    if (oppDownAt < 0) return;
    const held = now() - oppDownAt;
    oppDownAt = -1;
    host.command({ scope: "field", type: "punchDyn", name: "opposite", on: false });
    if (held < 300) {
      // A tap latches: flip for good (tap again to flip back).
      if (oppFrom) {
        showLook(oppFrom, 0);
        oppFrom = null;
      } else {
        const cur = cleanState();
        oppFrom = cur;
        showLook(Object.assign({}, cur, oppositeOf(cur)), 0);
      }
      changed();
    }
  }

  // --- break ---------------------------------------------------------------------------------------

  function breakDown() {
    if (breakStart >= 0) return;
    breakStart = now();
    manual();
    changed();
  }
  function breakUp() {
    if (breakStart < 0) return;
    when("beat", () => {
      breakStart = -1;
      boom();
      changed();
    });
  }
  function boom() {
    boomAt = now();
    const t = rollLook(["color", "shape", "motion", "effects"], Math.max(st.f.variety, 0.65));
    if (t) showLook(t, 0);
  }

  // --- scenes ---------------------------------------------------------------------------------------

  const SCENES_KEY = "lumina-scenes";
  let scenes = [];
  let sceneActive = null;
  function loadScenes() {
    try {
      const s = JSON.parse(localStorage.getItem(SCENES_KEY));
      if (Array.isArray(s) && s.length) return s;
    } catch (err) { /* fine */ }
    // First run: the opening look, the factory looks, then your saved presets.
    const out = [{ id: "open", name: "opening look", config: cleanState() }];
    (globalThis.LUMINA_PRESETS || []).forEach((p) => {
      out.push({ id: "f:" + p.id, name: p.label, config: Object.assign({}, F.DEFAULTS, p.config) });
    });
    try {
      const u = JSON.parse(localStorage.getItem("lumina-presets")) || {};
      Object.keys(u).forEach((k) => {
        const c = Object.assign({}, F.DEFAULTS, u[k]);
        delete c.marginLink;
        out.push({ id: "u:" + k, name: k, config: c });
      });
    } catch (err) { /* fine */ }
    return out;
  }
  scenes = loadScenes();
  function saveScenes() {
    try {
      localStorage.setItem(SCENES_KEY, JSON.stringify(scenes));
    } catch (err) {
      // Full storage: drop the oldest thumbnails and try once more.
      scenes.slice(0, Math.ceil(scenes.length / 2)).forEach((s) => { delete s.thumb; });
      try { localStorage.setItem(SCENES_KEY, JSON.stringify(scenes)); } catch (e2) { /* give up quietly */ }
    }
  }
  function captureThumb(scene, delay) {
    setTimeout(() => {
      if (sceneActive !== scene.id || !globalThis.LuminaFX || !LuminaFX.thumb) return;
      LuminaFX.thumb(192, 108).then((url) => {
        if (!url || sceneActive !== scene.id) return;
        scene.thumb = url;
        saveScenes();
        sendThumbs();
      });
    }, delay);
  }
  function playScene(i, morph) {
    const s = scenes[i];
    if (!s) return;
    manual();
    const ms = morph ? morphMs(2) : 0;
    when(morph ? "beat" : "auto", () => {
      host.command({ scope: "field", type: "look", config: s.config, ms });
      sceneActive = s.id;
      oppFrom = null;
      scenesChanged();
      if (!s.thumb) captureThumb(s, ms + 900);
    });
  }
  function bankScene() {
    manual();
    const id = "b:" + Date.now().toString(36);
    let n = 1;
    while (scenes.some((s) => s.name === `look ${n}`)) n++;
    const s = { id, name: `look ${n}`, config: cleanState() };
    scenes.push(s);
    sceneActive = id;
    saveScenes();
    scenesChanged();
    captureThumb(s, 30);
    flashNote(`Saved to Scenes as “${s.name}”`);
  }
  function removeScene(i) {
    const s = scenes[i];
    if (!s) return;
    scenes.splice(i, 1);
    saveScenes();
    scenesChanged();
  }

  // --- autopilot ---------------------------------------------------------------------------------

  let lastManual = -1e9;
  let apBars = 0;
  let apLastBeatless = 0;
  function manual() { lastManual = now(); }
  function autopilotOn() {
    return st.f.autopilot > 0.02 && now() - lastManual > 15000;
  }
  function autopilotEvents(o) {
    // No clock: time stands in for bars and phrases.
    let bar = o.bar;
    let phrase = o.phrase;
    if (!o.clock) {
      const t = now();
      if (t - apLastBeatless > 4000) {
        apLastBeatless = t;
        bar = true;
        apBars++;
        phrase = apBars % 4 === 0;
      }
    } else if (bar) {
      apBars++;
    }
    if (!autopilotOn()) return;
    const a = st.f.autopilot;
    if (o.drop) {
      if (Math.random() < Math.min(1, a * 1.5)) {
        boomAt = now();
        const t = rollLook(["color", "shape", "motion", "effects"], Math.max(st.f.variety, 0.6));
        if (t) showLook(t, 0);
      }
      return;
    }
    if (phrase && Math.random() < a) {
      const r = Math.random();
      if (r < 0.45 && scenes.length > 1) {
        let i = Math.floor(Math.random() * scenes.length);
        if (scenes[i].id === sceneActive) i = (i + 1) % scenes.length;
        const s = scenes[i];
        const ms = energyNow() < 0.5 ? morphMs(2) : 0;
        host.command({ scope: "field", type: "look", config: s.config, ms });
        sceneActive = s.id;
        scenesChanged();
      } else if (r < 0.85) {
        const all = ["color", "shape", "motion", "effects"];
        const n = 1 + Math.floor(Math.random() * 2);
        const pick = all.sort(() => Math.random() - 0.5).slice(0, n);
        const t = rollLook(pick, st.f.variety);
        if (t) showLook(t, morphMs());
      } else {
        // A one-bar flip to the opposite and back.
        host.command({ scope: "field", type: "punchDyn", name: "opposite", over: oppositeOf(cleanState()), on: true });
        const barMs = o.clock ? o.clock.beatLen * 4000 : 2000;
        setTimeout(() => host.command({ scope: "field", type: "punchDyn", name: "opposite", on: false }), barMs);
      }
      return;
    }
    if (bar && apBars % 4 === 0 && Math.random() < a * 0.35) {
      const all = ["color", "motion", "effects"];
      const t = rollLook([all[Math.floor(Math.random() * all.length)]], st.f.variety * 0.6);
      if (t) showLook(t, morphMs(1));
    }
  }

  // --- per-frame: write the moves -------------------------------------------------------------

  let lastFrame = now();
  let lastFilter = "";
  let lastTransform = "";
  function update(t) {
    const dt = Math.min(0.1, Math.max(0, (t - lastFrame) / 1000));
    lastFrame = t;
    heldFaders(dt);
    rewire(t);
    runPending();

    const live = playing();
    const E = energyNow();
    // Break tension: 0 → 1 over eight beats (or four seconds).
    const breakDur = live && fd.clock ? fd.clock.beatLen * 8 : 4;
    const bt = breakStart >= 0 ? clamp((t - breakStart) / 1000 / breakDur, 0, 1) : 0;
    const sinceBoom = (t - boomAt) / 1000;
    const boomK = sinceBoom < 3 ? 1 : 0;

    // Hits.
    const got = live && fdFresh ? fd.hits : null;
    fdFresh = false;
    for (const k of R.KINDS) {
      env[k] *= Math.exp(-dt / TAU[k]);
      if (got && got[k] > env[k]) env[k] = got[k];
    }
    const A = actionMul();
    if (got && got.snare > 0) hueAcc += 24 * wiring.snare.hue * A * got.snare;
    hueAcc *= Math.exp(-dt / 6);

    // Energy halves or doubles a locked flash cycle — at bar lines only.
    if (!live || fd.bar || !fd.clock) {
      const want = E > 0.78 ? 0.5 : E < 0.22 ? 2 : 1;
      if (want !== cycleMul) cycleMul = want;
    }

    const w = wiring;
    const zoom = A * 0.045 * w.kick.zoom * env.kick + 0.05 * bt +
      (boomK ? 0.12 * Math.exp(-sinceBoom / 0.3) : 0);
    const swell = A * (0.28 * w.kick.swell * env.kick + 0.12 * w.hat.swell * env.hat) - 0.25 * bt +
      (boomK ? 0.35 * Math.exp(-sinceBoom / 0.35) : 0);
    let flash = A * (0.3 * w.kick.flash * env.kick + 0.45 * w.snare.flash * env.snare + 0.12 * w.hat.flash * env.hat) +
      (boomK ? Math.exp(-sinceBoom / 0.35) : 0);
    if (live && fd.calibrating) flash = Math.max(flash, 0.5 * env.kick);

    field.setPerf({
      speedMul: speedCurve(E) * (1 + 1.6 * bt),
      busyMul: 0.3 + 1.4 * E,
      cycleMul,
      lock: st.f.lock,
      swell: Math.abs(swell) < 0.002 ? 0 : swell,
    });

    // Colour: saturation, energy brightness, the snare's hue walk.
    const sat = satCurve(st.f.saturation) * (1 - 0.5 * bt);
    const bright = 0.8 + 0.4 * E;
    const parts = [];
    if (Math.abs(sat - 1) > 0.01) parts.push(`saturate(${sat.toFixed(3)})`);
    if (Math.abs(bright - 1) > 0.01) parts.push(`brightness(${bright.toFixed(3)})`);
    if (Math.abs(hueAcc) > 0.5) parts.push(`hue-rotate(${hueAcc.toFixed(1)}deg)`);
    const filter = parts.join(" ");
    if (filter !== lastFilter) {
      lastFilter = filter;
      frame.style.filter = filter;
    }
    const transform = zoom > 0.0008 ? `scale(${(1 + zoom).toFixed(4)})` : "";
    if (transform !== lastTransform) {
      lastTransform = transform;
      frame.style.transform = transform;
    }
    flashEl.style.opacity = clamp(flash, 0, 0.92).toFixed(3);

    // Blackout (eased 60 ms) and the break's darkening.
    blackoutLevel += ((blackout ? 1 : 0) - blackoutLevel) * Math.min(1, dt / 0.06);
    darkEl.style.opacity = Math.max(blackoutLevel, 0.55 * bt).toFixed(3);

    // Strobe: on the sixteenths when the beat is known, 10 Hz otherwise.
    if (strobe) {
      let on;
      if (live && fd.rc) {
        const s16 = fd.rc.beats * 4;
        on = s16 - Math.floor(s16) < 0.4;
      } else {
        strobePhase = (strobePhase + dt * 10) % 1;
        on = strobePhase < 0.4;
      }
      strobeEl.style.opacity = on ? "0.9" : "0";
    } else if (strobeEl.style.opacity !== "0") {
      strobeEl.style.opacity = "0";
    }

    ringEl.style.opacity = calOpen ? clamp(env.kick * 1.4, 0, 1).toFixed(3) : "0";
    if (t - meterAt > 66) sendMeters(t, E, live);
  }
  field.addPreFrame(update);

  // --- telling the controls window ------------------------------------------------------------
  // Snapshots ride the host's emit (the whole host state goes out together);
  // they are throttled here so a fader held on a key doesn't flood the channel.
  let emitTimer = 0;
  function changed() {
    if (emitTimer) return;
    emitTimer = setTimeout(() => { emitTimer = 0; host.emit(); }, 80);
  }
  let scenesVer = 1;
  function scenesChanged() {
    scenesVer++;
    changed();
  }
  let note = "";
  let noteTimer = 0;
  function flashNote(text) {
    note = text;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { note = ""; changed(); }, 2500);
    changed();
  }
  // Meters (~15 Hz while playing, one zero when it stops) and thumbnails go
  // as "perf" messages — too fast / too heavy for the snapshot.
  let meterAt = 0;
  let meterLive = false;
  function sendMeters(t, E, live) {
    meterAt = t;
    if (!live && !meterLive && env.kick < 0.01 && env.snare < 0.01) return;
    meterLive = live;
    host.perf({ kind: "meters", kick: env.kick, snare: env.snare, hat: env.hat, energy: E });
  }
  function sendThumbs() {
    const thumbs = {};
    scenes.forEach((s) => { if (s.thumb) thumbs[s.id] = s.thumb; });
    host.perf({ kind: "thumbs", thumbs });
  }

  const PADS = [
    { id: "dice", label: "Dice", key: "Z", tip: "A new look — how new is Variety" },
    { id: "color", label: "Color", key: "X", tip: "Roll the colours only" },
    { id: "shape", label: "Shape", key: "C", tip: "Roll the shapes and the grid only" },
    { id: "motion", label: "Motion", key: "V", tip: "Roll the motion only" },
    { id: "effects", label: "Effects", key: "N", tip: "Roll the effects and the scene backdrop only" },
    { id: "back", label: "Back", key: "⌫", tip: "Back to the look before (Backspace)" },
    { id: "save", label: "Save", key: "M", tip: "Save this look to Scenes" },
    { id: "opposite", label: "Opposite", key: "O", tip: "Tap: flip to the opposite look (tap again to flip back). Hold: only while held.", hold: true },
    { id: "break", label: "Break", key: "B", tip: "Hold: the picture tightens, darkens, speeds up. Let go: it explodes on the next beat.", hold: true },
    { id: "hold", label: "Hold", key: "P", tip: "Freeze the picture; the music plays on. Press again to let go." },
    { id: "blackout", label: "Blackout", key: "K", tip: "Black while held", hold: true },
    { id: "strobe", label: "Strobe", key: "L", tip: "Strobe while held", hold: true },
  ];
  const PAD_ACT = {
    dice: () => { manual(); dice(["color", "shape", "motion", "effects"]); },
    color: () => { manual(); dice(["color"]); },
    shape: () => { manual(); dice(["shape"]); },
    motion: () => { manual(); dice(["motion"]); },
    effects: () => { manual(); dice(["effects"]); },
    back: () => { manual(); pending.length = 0; host.command({ scope: "field", type: "undo" }); },
    save: () => bankScene(),
    hold: () => { manual(); host.command({ scope: "field", type: "freeze" }); },
  };
  const PAD_HOLD = {
    opposite: [oppositeDown, oppositeUp],
    break: [breakDown, breakUp],
    blackout: [() => { manual(); blackout = true; changed(); }, () => { blackout = false; changed(); }],
    strobe: [() => { manual(); strobe = true; changed(); }, () => { strobe = false; changed(); }],
  };
  const padHeld = new Set();
  function padDown(id) {
    if (PAD_HOLD[id]) {
      if (padHeld.has(id)) return;
      padHeld.add(id);
      PAD_HOLD[id][0]();
    } else if (PAD_ACT[id]) {
      PAD_ACT[id]();
    }
    changed();
  }
  function padUp(id) {
    if (!PAD_HOLD[id] || !padHeld.has(id)) return;
    padHeld.delete(id);
    PAD_HOLD[id][1]();
    changed();
  }

  // Scenes: tap = cut, hold (350 ms) = morph — the timer lives here, so a
  // pad in the window and a number key on either page behave the same.
  const sceneDownAt = new Map(); // index -> { timer, fired }
  function sceneDown(i) {
    if (sceneDownAt.has(i)) return;
    const rec = { fired: false, timer: 0 };
    rec.timer = setTimeout(() => { rec.fired = true; playScene(i, true); }, 350);
    sceneDownAt.set(i, rec);
  }
  function sceneUp(i) {
    const rec = sceneDownAt.get(i);
    if (!rec) return;
    sceneDownAt.delete(i);
    clearTimeout(rec.timer);
    if (!rec.fired) playScene(i, false);
  }

  function setFader(id, v) {
    if (!(id in st.f)) return;
    st.f[id] = clamp(Number(v) || 0, 0, 1);
    save();
    changed();
  }
  // Keys held on a fader glide it (half its travel per second).
  const heldKeys = new Map(); // code -> [id, dir]
  const FADER_KEYS = {};
  FADERS.forEach((d) => {
    FADER_KEYS["Key" + d.keys[0]] = [d.id, 1];
    FADER_KEYS["Key" + d.keys[1]] = [d.id, -1];
  });
  function heldFaders(dt) {
    if (!heldKeys.size) return;
    heldKeys.forEach(([id, dir]) => { st.f[id] = clamp(st.f[id] + dir * dt * 0.5, 0, 1); });
    save();
    changed();
  }

  function faderText(id) {
    const v = st.f[id];
    if (id === "morph") return morphLabel();
    if (id === "autopilot") return v <= 0.02 ? "off" : `${Math.round(v * 100)}`;
    if (id === "energy") return Math.abs(v - 0.5) < 0.02 ? "song" : `${v > 0.5 ? "+" : "−"}${Math.round(Math.abs(v - 0.5) * 200)}`;
    return `${Math.round(v * 100)}`;
  }

  // --- the sound-delay card (drawn in the window; the ring flashes here) ------------------------

  let calOpen = false;
  const calTaps = [];
  function openCal() {
    calOpen = true;
    calTaps.length = 0;
    host.command({ scope: "music", type: "metronome", on: true });
    changed();
  }
  function closeCal() {
    calOpen = false;
    host.command({ scope: "music", type: "metronome", on: false });
    changed();
  }
  function calTapResult(d) {
    calTaps.push(d);
    if (calTaps.length > 8) calTaps.shift();
    if (calTaps.length >= 4) {
      const srt = calTaps.slice().sort((a, b) => a - b);
      setDelay(srt[srt.length >> 1]);
    }
    changed();
  }

  // --- tap tempo -------------------------------------------------------------------------------

  function doTap() {
    manual();
    if (!playing()) {
      flashNote("Press play first, then tap on the beat");
      return;
    }
    host.command({ scope: "music", type: "tap" });
    changed();
  }

  // --- keys: on the picture's page, or forwarded from the controls window -------------------------

  const PAD_KEYS = { KeyZ: "dice", KeyX: "color", KeyC: "shape", KeyV: "motion", KeyN: "effects",
    Backspace: "back", KeyM: "save", KeyO: "opposite", KeyB: "break", KeyP: "hold", KeyK: "blackout", KeyL: "strobe" };
  // Returns true when the key was ours (the caller then stops the browser's default).
  function keyDown(code, repeat) {
    if (calOpen) {
      if (code === "Space") { if (!repeat) host.command({ scope: "music", type: "calTap" }); return true; }
      if (code === "Escape") { closeCal(); return true; }
      return false;
    }
    if (FADER_KEYS[code]) {
      if (!heldKeys.has(code)) { heldKeys.set(code, FADER_KEYS[code]); manual(); }
      return true;
    }
    if (repeat) return !!(PAD_KEYS[code] || /^Digit\d$/.test(code) || code === "KeyI");
    if (code === "KeyI") { doTap(); return true; }
    if (PAD_KEYS[code]) { padDown(PAD_KEYS[code]); return true; }
    const m = /^Digit(\d)$/.exec(code);
    if (m) { sceneDown((Number(m[1]) + 9) % 10); return true; }
    return false;
  }
  function keyUp(code) {
    heldKeys.delete(code);
    if (PAD_KEYS[code]) padUp(PAD_KEYS[code]);
    const m = /^Digit(\d)$/.exec(code);
    if (m) sceneUp((Number(m[1]) + 9) % 10);
  }
  function releaseAll() {
    heldKeys.clear();
    Array.from(padHeld).forEach(padUp);
    Array.from(sceneDownAt.keys()).forEach((i) => { const r = sceneDownAt.get(i); clearTimeout(r.timer); sceneDownAt.delete(i); });
  }
  const tunerOpen = () => {
    const t = document.getElementById("lum-tuner");
    return t && !t.hidden;
  };
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) && tg.type !== "range") return;
    // ` on the picture opens the controls window (it opens on the last mode).
    if (e.code === "Backquote") {
      if (!e.repeat) {
        const b = document.getElementById("lum-tuner-toggle");
        if (b) b.click();
      }
      return;
    }
    if (tunerOpen() && !calOpen) return; // the in-page configuration fallback owns the keys
    if (keyDown(e.code, e.repeat)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => keyUp(e.code));
  // A lost focus must not leave a fader sliding or a hold stuck on.
  window.addEventListener("blur", releaseAll);

  // --- the host plumbing ---------------------------------------------------------------------------

  host.registerPerform({
    snapshotPart() {
      return {
        faderDefs: FADERS,
        padDefs: PADS,
        faders: Object.assign({}, st.f),
        faderText: FADERS.reduce((o, d) => { o[d.id] = faderText(d.id); return o; }, {}),
        pads: {
          opposite: !!oppFrom,
          break: breakStart >= 0,
          blackout,
          strobe,
          held: Array.from(padHeld),
        },
        scenesVer,
        scenes: scenes.map((sc) => ({ id: sc.id, name: sc.name, low: sc.config.low, high: sc.config.high, bg: sc.config.bg })),
        sceneActive,
        delayMode: st.delayMode,
        delayMs: Math.round(delaySec() * 1000),
        delayAuto: st.delayMode === "wired" && st.delayWired === null,
        autopilot: st.f.autopilot <= 0.02 ? "Autopilot off"
          : now() - lastManual < 15000 ? "Autopilot waits — you're driving" : "Autopilot on",
        pending: note || (pending.length ? `Waiting for the ${st.f.lock >= 0.6 ? "next bar" : "next beat"}…` : ""),
        cal: { open: calOpen, taps: calTaps.length },
        playing: !!playing(),
      };
    },
    command(cmd) {
      switch (cmd.type) {
        case "fader": setFader(cmd.id, cmd.value); manual(); break;
        case "faderReset": { const d = FADERS.find((x) => x.id === cmd.id); if (d) setFader(d.id, d.def); break; }
        case "pad": if (cmd.on) padDown(cmd.id); else padUp(cmd.id); break;
        case "scene": if (cmd.on) sceneDown(cmd.index); else sceneUp(cmd.index); break;
        case "sceneRemove": removeScene(cmd.index); break;
        case "bank": bankScene(); break;
        case "tap": doTap(); break;
        case "delayMode": if (cmd.value === "bt" || cmd.value === "wired") { st.delayMode = cmd.value; save(); changed(); } break;
        case "delayNudge": setDelay(delaySec() + (Number(cmd.ms) || 0) / 1000); break;
        case "delayAuto": st.delayWired = null; save(); changed(); break;
        case "cal": if (cmd.on) openCal(); else closeCal(); break;
        case "key": if (cmd.down) keyDown(cmd.code, !!cmd.repeat); else keyUp(cmd.code); break;
        case "keysReleased": releaseAll(); break;
        case "thumbs": sendThumbs(); break;
      }
    },
  });

  globalThis.LuminaPerform = {
    feed,
    delaySec,
    calibrating: () => calOpen,
    calTapResult,
    // The Action fader also scales the mod matrix (music.js).
    matrixMul: () => actionMul(),
    // For labs: the current fader values and the hit wiring.
    faders: () => Object.assign({}, st.f),
    wiring: () => wiring,
  };
})();
