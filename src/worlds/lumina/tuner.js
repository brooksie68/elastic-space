// Lumina — the control surface, as a standalone module. Builds the whole
// two-tab panel (VISUAL | AUDIO) into any container and talks to the field
// only through a bus, so the same UI runs embedded in the world page AND in
// the detached controller window (tuner.html) over BroadcastChannel.
//
//   LuminaTuner.mount({ container, bus, embedded });
//   bus: { send(cmd), onSnapshot(cb), onBeat(cb), onMod(cb)?, requestSnapshot() }
//   onMod streams the music loop's live modulated values for the ghost dots.
//
// The tuner owns no state — every change is a command to the host
// (world.js/music.js), every render comes from a host snapshot.
(function () {
  "use strict";

  const FIELD = globalThis.LuminaField;
  const DSP = globalThis.LuminaMusicDSP;

  const SPEED_MAX = 8;
  const BLUR_MAX = 300;
  const TILE_MAX = 300;

  // Panel type size. The whole surface is sized in em off one base in
  // tuner.css, so this one multiplier scales type, pads, control heights and
  // slider tracks together. 100 = the panel as it was before 2026-07-27; keep
  // that in step with the --ui-scale fallback in tuner.css.
  // Base bumped 16px → 26px on 2026-07-31 (see tuner.css) — 100% is now
  // readable-for-humans; ~60% reproduces the old cramped look, so the floor
  // drops to 50 to keep the tiny end reachable.
  // Fresh key each time the base changes (16px → 26px → 21px, 2026-07-31):
  // percentages saved against an old base land at the wrong physical size,
  // so every window restarts at the newly calibrated 100%.
  const UI_SCALE_KEY = "lumina-ui-scale3";
  const UI_SCALE_DEFAULT = 100;
  const UI_SCALE_MIN = 50;
  const UI_SCALE_MAX = 220;

  const pct = {
    toSlider: (v) => Math.round(v * 1000),
    fromSlider: (p) => p / 1000,
    format: (v) => `${Math.round(v * 100)}%`,
  };
  function px(max, decimals) {
    return {
      toSlider: (v) => Math.round((v / max) * 1000),
      fromSlider: (p) => (p / 1000) * max,
      format: (v) => `${v.toFixed(decimals || 0)}px`,
    };
  }
  function times(max) {
    return {
      toSlider: (v) => Math.round((v / max) * 1000),
      fromSlider: (p) => (p / 1000) * max,
      format: (v) => `×${v.toFixed(2)}`,
    };
  }
  const ms = (v) => `${Math.round(v * 1000)}ms`;

  // --- control specs ---------------------------------------------------------

  const FIELD_SLIDERS = {
    speed: {
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / SPEED_MAX)),
      fromSlider: (p) => SPEED_MAX * (p / 1000) * (p / 1000),
      format: (v) => (v === 0 ? "stopped" : `×${v.toFixed(2)}`),
    },
    tileSize: {
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / TILE_MAX)),
      fromSlider: (p) => TILE_MAX * (p / 1000) * (p / 1000),
      format: (v) => `${v < 10 ? v.toFixed(1) : v.toFixed(0)}px`,
    },
    blur: {
      toSlider: (v) => Math.round(1000 * Math.cbrt(v / BLUR_MAX)),
      fromSlider: (p) => BLUR_MAX * Math.pow(p / 1000, 3),
      format: (v) => (v < 0.005 ? "off" : `${v < 10 ? v.toFixed(2) : v.toFixed(0)}px`),
    },
    holdScale: times(3),
    desync: pct,
    ease: pct,
    border: px(10, 1),
    spread: times(2),
    twist: pct,
    rows: { toSlider: (v) => v, fromSlider: (p) => p, format: String, min: 1, max: 24 },
    cols: { toSlider: (v) => v, fromSlider: (p) => p, format: String, min: 1, max: 24 },
    marginTop: px(200), marginRight: px(200), marginBottom: px(200), marginLeft: px(200),
    gapX: px(200), gapY: px(200), inset: px(100),
    radiusTile: {
      toSlider: (v) => Math.round((v / 0.5) * 1000),
      fromSlider: (p) => (p / 1000) * 0.5,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    radiusRow: px(60), radiusOuter: px(120),
    hueShift: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => `${Math.round(v * 360)}°` },
    merge: pct, rotate: pct, spin: pct, displace: pct, sizePulse: pct, counter: pct,
    nest: { toSlider: (v) => v, fromSlider: (p) => p, format: String, min: 0, max: 2 },
    fxTrails: pct, fxZoom: pct, fxZoomRot: pct, fxPixel: pct, fxRgb: pct, fxWarp: pct,
    fxSlit: pct, fxKaleido: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => (v <= 0 ? "off" : `${2 + Math.round(v * 10)} way`) },
    fxKalRing: pct,
    fxKalIter: { toSlider: (v) => Math.round(v * 2), fromSlider: (p) => p / 2, format: (v) => ["off", "double", "triple"][Math.round(v * 2)] || "off", min: 0, max: 2 },
    fxKalSpin: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => (v <= 0 ? "off" : `${Math.round(v * 28.6)}°/s`) },
    fxBloom: pct, fxGrain: pct, fxCrt: pct, fxShutter: pct, fxIris: pct,
    sceneMix: pct, sceneTiles: pct,
    sceneSpeed: times(2),
    sceneScale: pct, sceneDrive: pct, sceneWarp: pct,
    sceneHue: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => `${Math.round(v * 360)}°` },
    // 0, 1, 2, 4, 8, 16 beats per flash cycle — snapped, not continuous.
    syncBeats: {
      toSlider: (v) => [0, 1, 2, 4, 8, 16].indexOf(v) < 0 ? 0 : [0, 1, 2, 4, 8, 16].indexOf(v),
      fromSlider: (p) => [0, 1, 2, 4, 8, 16][Math.max(0, Math.min(5, Math.round(p)))],
      format: (v) => (v === 0 ? "free" : `${v} beat${v === 1 ? "" : "s"}`),
      min: 0, max: 5,
    },
  };

  const MUSIC_SLIDERS = {
    master: { toSlider: (v) => Math.round((v / 2) * 1000), fromSlider: (p) => (p / 1000) * 2, format: (v) => (v === 0 ? "off" : `×${v.toFixed(2)}`) },
    attack: { toSlider: (v) => Math.round(1000 * Math.sqrt(v / 0.3)), fromSlider: (p) => 0.3 * (p / 1000) * (p / 1000), format: ms },
    release: { toSlider: (v) => Math.round((v / 1.5) * 1000), fromSlider: (p) => (p / 1000) * 1.5, format: ms },
    beatSense: pct,
    beatDecay: { toSlider: (v) => Math.round(1000 * Math.sqrt(Math.max(0, v - 0.02) / 1.48)), fromSlider: (p) => 0.02 + 1.48 * (p / 1000) * (p / 1000), format: ms },
    accentDecay: { toSlider: (v) => Math.round(1000 * Math.sqrt(Math.max(0, v - 0.02) / 0.58)), fromSlider: (p) => 0.02 + 0.58 * (p / 1000) * (p / 1000), format: ms },
  };

  const SRC_LABELS = {
    off: "—", bass: "bass", lowmid: "low mid", mid: "mid",
    high: "high", level: "level", beat: "beat",
    // Grid-locked (no detection lag) — see music-dsp.js CLOCK_SOURCES.
    pulse: "▸ pulse", bar: "▸ bar", phrase: "▸ phrase", swing: "▸ swing",
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // --- chip drawings ---------------------------------------------------------
  // Thumbnails for the visual pickers (2026-07-31, James: "hard to know what
  // anything is gonna do"). Every drawer must survive an unknown value —
  // future layouts/shapes/scenes get the generic fallback until someone draws
  // them a chip, so extending the field never breaks the picker.
  const CHIP_W = 76;
  const CHIP_H = 48;
  const CHIP_FG = "rgba(255,255,255,0.85)";

  function chipBase(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, w, h);
  }

  function chipFallback(ctx, w, h) {
    chipBase(ctx, w, h);
    const g = ctx.createLinearGradient(0, h, w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.1)");
    g.addColorStop(1, "rgba(255,255,255,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(6, 6, w - 12, h - 12);
  }

  // Honest layout dots: the field's real layoutTiles() at postage-stamp size.
  function drawLayoutChip(ctx, value, w, h) {
    chipBase(ctx, w, h);
    const lt = FIELD.layoutTiles({ rows: 4, cols: 5, gapX: 6, gapY: 6, inset: 0, layout: value });
    const s = Math.min((w - 12) / lt.w, (h - 10) / lt.h);
    ctx.fillStyle = CHIP_FG;
    lt.tiles.forEach((t) => {
      ctx.beginPath();
      ctx.arc(w / 2 + (t.x - lt.w / 2) * s, h / 2 + (t.y - lt.h / 2) * s, 1.7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function ngonPath(ctx, cx, cy, r, n, rot) {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function drawShapeChip(ctx, value, w, h) {
    chipBase(ctx, w, h);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.34;
    ctx.fillStyle = CHIP_FG;
    ctx.beginPath();
    switch (value) {
      case "square": ctx.rect(cx - r, cy - r, 2 * r, 2 * r); break;
      case "circle": ctx.arc(cx, cy, r, 0, Math.PI * 2); break;
      case "triangle": ngonPath(ctx, cx, cy, r * 1.1, 3, -Math.PI / 2); break;
      case "diamond": ngonPath(ctx, cx, cy, r * 1.1, 4, -Math.PI / 2); break;
      case "hexagon": ngonPath(ctx, cx, cy, r * 1.05, 6, 0); break;
      case "chevron":
        ctx.moveTo(cx - r, cy - r * 0.7);
        ctx.lineTo(cx, cy + r * 0.1);
        ctx.lineTo(cx + r, cy - r * 0.7);
        ctx.lineTo(cx + r, cy - r * 0.1);
        ctx.lineTo(cx, cy + r * 0.7);
        ctx.lineTo(cx - r, cy - r * 0.1);
        ctx.closePath();
        break;
      case "star":
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const rr = i % 2 ? r * 0.45 : r * 1.1;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        break;
      case "cross":
        ctx.rect(cx - r * 0.35, cy - r, r * 0.7, 2 * r);
        ctx.rect(cx - r, cy - r * 0.35, 2 * r, r * 0.7);
        break;
      case "bar": ctx.rect(cx - r * 1.4, cy - r * 0.45, 2.8 * r, 0.9 * r); break;
      case "slit": ctx.rect(cx - r * 0.18, cy - r * 1.1, 0.36 * r, 2.2 * r); break;
      case "ring":
        ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
        ctx.lineWidth = r * 0.45;
        ctx.strokeStyle = CHIP_FG;
        ctx.stroke();
        return;
      default: ctx.rect(cx - r, cy - r, 2 * r, 2 * r); break;
    }
    ctx.fill();
  }

  function drawWaveChip(ctx, value, w, h) {
    chipBase(ctx, w, h);
    ctx.strokeStyle = CHIP_FG;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const mid = h / 2, amp = h * 0.3, x0 = 6, x1 = w - 6, N = 64;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const ph = (t * 2) % 1; // two periods across the chip
      let y;
      if (value === "sine") y = Math.sin(ph * Math.PI * 2);
      else if (value === "square") y = ph < 0.5 ? 1 : -1;
      else if (value === "saw") y = 2 * ph - 1;
      else y = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph; // triangle (and fallback)
      const x = x0 + t * (x1 - x0);
      if (i) ctx.lineTo(x, mid - y * amp); else ctx.moveTo(x, mid - y * amp);
    }
    ctx.stroke();
  }

  function drawPaletteChip(ctx, value, w, h) {
    chipBase(ctx, w, h);
    const stops = FIELD.PALETTES[value];
    const g = ctx.createLinearGradient(4, 0, w - 4, 0);
    if (stops && stops.length > 1) {
      stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    } else {
      // duo — stands in for whatever the two pickers hold.
      g.addColorStop(0, "#141414");
      g.addColorStop(1, "#ececec");
    }
    ctx.fillStyle = g;
    ctx.fillRect(4, h * 0.28, w - 8, h * 0.44);
  }

  function drawSceneChip(ctx, value, w, h) {
    chipBase(ctx, w, h);
    if (value === "none") {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.strokeRect(6.5, 6.5, w - 13, h - 13);
      return;
    }
    if (value === "ink") {
      [["#2fb7a8", 0.34, 0.55], ["#7d5cff", 0.68, 0.4]].forEach(([c, fx, fy]) => {
        const g = ctx.createRadialGradient(w * fx, h * fy, 1, w * fx, h * fy, w * 0.32);
        g.addColorStop(0, c);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    } else if (value === "ridge") {
      ctx.strokeStyle = "#59e0ff";
      ctx.lineWidth = 1.4;
      for (let l = 0; l < 4; l++) {
        ctx.beginPath();
        for (let x = 4; x <= w - 4; x += 2) {
          const y = h * (0.25 + l * 0.17) + Math.sin(x * 0.11 + l * 1.7) * 4;
          if (x === 4) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (value === "flame") {
      const g = ctx.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, h * 0.62);
      g.addColorStop(0, "#ffe95c");
      g.addColorStop(0.45, "#ff8c1a");
      g.addColorStop(1, "rgba(64,8,10,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (value === "nebula") {
      ctx.fillStyle = "#0a0a1c";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.6, h * 0.45, 2, w * 0.6, h * 0.45, w * 0.35);
      g.addColorStop(0, "rgba(200,90,220,0.75)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 14; i++) {
        // Fixed pseudo-random star field — same sky every time.
        const x = ((i * 37 + 11) % 68) + 4;
        const y = ((i * 23 + 7) % 40) + 4;
        ctx.fillRect(x, y, i % 3 === 0 ? 1.5 : 1, i % 3 === 0 ? 1.5 : 1);
      }
    } else {
      chipFallback(ctx, w, h);
    }
  }

  function mount(opts) {
    const container = opts.container;
    const bus = opts.bus;
    const embedded = !!opts.embedded;
    let snap = null;
    const reflectors = [];

    function send(cmd) { bus.send(cmd); }
    function onReflect(fn) { reflectors.push(fn); }

    // Per-window panel prefs (like text size): pinned favorites + collapsed
    // cards. The deck rebuilds controls from BUILDERS — every control factory
    // registers a rebuild recipe under "scope:key".
    const FAVS_KEY = "lumina-favs";
    const COLLAPSE_KEY = "lumina-collapsed";
    let favs = [];
    let collapsedIds = [];
    try { favs = JSON.parse(localStorage.getItem(FAVS_KEY)) || []; } catch (err) { favs = []; }
    try { collapsedIds = JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || []; } catch (err) { collapsedIds = []; }
    const BUILDERS = {};   // control id -> () => fresh control element
    const STARS = {};      // control id -> [star buttons]
    const ghostSubs = {};  // field key -> [fn(value)] — the modulation ghosts
    let deckRefresh = () => {};

    // Card registry (2026-07-31): card() registers every card here by pane;
    // the layout engine below parents them into user-arranged rows. Cards
    // never append themselves — the stored layout decides where they live.
    const CARDS = { visual: new Map(), audio: new Map() };

    function saveFavs() {
      try { localStorage.setItem(FAVS_KEY, JSON.stringify(favs)); } catch (err) { /* fine */ }
    }

    function toggleFav(id) {
      const i = favs.indexOf(id);
      if (i >= 0) favs.splice(i, 1); else favs.push(id);
      saveFavs();
      (STARS[id] || []).forEach((b) => {
        b.textContent = favs.includes(id) ? "★" : "☆";
        b.classList.toggle("on", favs.includes(id));
      });
      deckRefresh();
    }

    function starFor(id) {
      const b = el("button", "tuner-star", favs.includes(id) ? "★" : "☆");
      b.type = "button";
      b.title = "Pin to my deck — the always-visible favorites card up top";
      b.classList.toggle("on", favs.includes(id));
      b.addEventListener("click", () => toggleFav(id));
      (STARS[id] = STARS[id] || []).push(b);
      return b;
    }

    // Skip writing a control the user is actively holding.
    function safeSet(input, value) {
      if (document.activeElement === input) return;
      input.value = value;
    }

    // --- ⓘ info popovers (2026-08-03, James's brief) ------------------------
    // The surface shows short labels only; the verbose explanation + an
    // animated mini demo live behind a small ⓘ. Content: tuner-info.js.
    // The popover lives on document.body because .lum-tuner's backdrop-filter
    // makes it a containing block — position:fixed inside it would pin to the
    // panel, not the viewport. Font size is copied from the container on open
    // so the text-size control still scales it.
    const INFO_LIB = globalThis.LUMINA_INFO || { INFO: {}, DEMOS: {} };
    const pop = el("div", "tuner-infopop");
    pop.hidden = true;
    const popTitle = el("p", "tuner-infotitle");
    const popCanvas = el("canvas", "tuner-infocanvas");
    popCanvas.width = 360;
    popCanvas.height = 170;
    const popText = el("p", "tuner-infotext");
    pop.append(popTitle, popCanvas, popText);
    document.body.appendChild(pop);
    let popDraw = null, popStart = 0, popFor = null;
    (function popLoop(now) {
      requestAnimationFrame(popLoop);
      if (pop.hidden || !popDraw) return;
      popDraw(popCanvas.getContext("2d"), popCanvas.width, popCanvas.height, (now - popStart) / 1000);
    })(performance.now());
    function closeInfo() {
      pop.hidden = true;
      popDraw = null;
      popFor = null;
    }
    function openInfo(btn, id, title, fallback) {
      if (popFor === id && !pop.hidden) { closeInfo(); return; }
      const entry = INFO_LIB.INFO[id];
      popTitle.textContent = title;
      popText.textContent = (entry && entry.t) || fallback || "";
      const demoFactory = entry && entry.demo ? INFO_LIB.DEMOS[entry.demo] : null;
      popDraw = demoFactory ? demoFactory() : null;
      popCanvas.hidden = !popDraw;
      popStart = performance.now();
      popFor = id;
      pop.style.fontSize = getComputedStyle(container).fontSize;
      pop.hidden = false;
      const r = btn.getBoundingClientRect();
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      const x = Math.max(8, Math.min(r.left, window.innerWidth - pw - 10));
      let y = r.bottom + 8;
      if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 8);
      pop.style.left = `${x}px`;
      pop.style.top = `${y}px`;
    }
    // Returns null when there is nothing to say — no entry, no fallback —
    // so a content-less control simply gets no ⓘ.
    function infoBtn(id, title, fallback) {
      if (!INFO_LIB.INFO[id] && !fallback) return null;
      const b = el("button", "tuner-info", "i");
      b.type = "button";
      b.title = "What does this do?";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openInfo(b, id, title, fallback);
      });
      return b;
    }
    // House rule: dismiss on pointerdown click-away (Esc works too).
    document.addEventListener("pointerdown", (e) => {
      if (pop.hidden) return;
      if (pop.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".tuner-info")) return;
      closeInfo();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeInfo();
    });

    // --- shared builders ----------------------------------------------------

    function slider(scope, key, label, spec, opts2) {
      const o = opts2 || {};
      const id = `${scope}:${key}`;
      // Deck recipe: same control, no star/desc (the deck stays compact).
      if (!o.deck) {
        BUILDERS[id] = () => slider(scope, key, label, spec,
          Object.assign({}, o, { deck: true, desc: undefined, wide: false, extra: undefined }));
      }
      const wrap = el("div", o.wide ? "tuner-speed" : "tuner-mini");
      const lab = el("label", null, label);
      const input = el("input");
      input.type = "range";
      const minN = spec.min !== undefined ? spec.min : 0;
      const maxN = spec.max !== undefined ? spec.max : 1000;
      input.min = String(minN);
      input.max = String(maxN);
      input.step = "1";
      if (o.title) input.title = o.title + " — double-click resets";
      // The track wrapper positions the modulation ghost over the input.
      const track = el("span", "tuner-track");
      track.appendChild(input);
      if (scope === "field") {
        const ghost = el("span", "tuner-ghost");
        track.appendChild(ghost);
        let hideT = 0;
        (ghostSubs[key] = ghostSubs[key] || []).push((v) => {
          const p = Math.max(0, Math.min(1, (spec.toSlider(v) - minN) / (maxN - minN || 1)));
          ghost.style.left = `${(p * 100).toFixed(1)}%`;
          ghost.style.opacity = "1";
          clearTimeout(hideT);
          hideT = setTimeout(() => { ghost.style.opacity = "0"; }, 450);
        });
      }
      const out = el("output");
      wrap.append(lab, ...(o.extra ? [o.extra] : []), track, out);
      if (!o.deck) {
        wrap.appendChild(starFor(id));
        const ib = infoBtn(id, label, o.desc);
        if (ib) wrap.appendChild(ib);
      }
      input.addEventListener("input", () => {
        const v = spec.fromSlider(Number(input.value));
        out.textContent = spec.format(v);
        send({ scope, type: "set", key, value: v });
      });
      input.addEventListener("dblclick", () => send({ scope, type: "reset", key }));
      onReflect(() => {
        const source = scope === "field" ? snap.config : snap.music.settings;
        const v = source[key];
        if (v === undefined) return;
        safeSet(input, spec.toSlider(v));
        out.textContent = spec.format(v);
      });
      return wrap;
    }

    function select(scope, key, label, options, opts2) {
      const o = opts2 || {};
      const id = `${scope}:${key}`;
      if (!o.deck) {
        BUILDERS[id] = () => select(scope, key, label, options,
          Object.assign({}, o, { deck: true, desc: undefined }));
      }
      const wrap = el("div", "tuner-mini tuner-mini--select");
      wrap.appendChild(el("label", "tuner-label", label));
      const sel = el("select");
      options.forEach(([value, text]) => {
        const option = el("option", null, text);
        option.value = value;
        sel.appendChild(option);
      });
      if (o.title) sel.title = o.title;
      wrap.appendChild(sel);
      if (!o.deck) {
        wrap.appendChild(starFor(id));
        const ib = infoBtn(id, label, o.desc);
        if (ib) wrap.appendChild(ib);
      }
      sel.addEventListener("change", () => send({ scope, type: "set", key, value: sel.value }));
      onReflect(() => {
        const source = scope === "field" ? snap.config : snap.music.settings;
        if (source[key] !== undefined) safeSet(sel, String(source[key]));
      });
      return wrap;
    }

    // Visual picker: a strip of drawn thumbnail chips instead of a dropdown
    // of words. Same command/reflect contract as select().
    function chips(scope, key, label, items, draw, opts2) {
      const o = opts2 || {};
      const id = `${scope}:${key}`;
      if (!o.deck) {
        BUILDERS[id] = () => chips(scope, key, label, items, draw,
          Object.assign({}, o, { deck: true, desc: undefined }));
      }
      const wrap = el("div", "tuner-chipswrap");
      const head = el("div", "tuner-chipshead");
      head.appendChild(el("label", "tuner-label", label));
      if (!o.deck) {
        head.appendChild(starFor(id));
        const ib = infoBtn(id, label, o.desc);
        if (ib) head.appendChild(ib);
      }
      wrap.appendChild(head);
      const strip = el("div", "tuner-chips");
      const btns = new Map();
      items.forEach(([value, text]) => {
        const b = el("button", "tuner-chip");
        b.type = "button";
        b.title = text;
        const cv = el("canvas");
        cv.width = CHIP_W;
        cv.height = CHIP_H;
        try { draw(cv.getContext("2d"), value, CHIP_W, CHIP_H); } catch (err) { chipFallback(cv.getContext("2d"), CHIP_W, CHIP_H); }
        b.append(cv, el("span", "tuner-chip-label", text));
        b.addEventListener("click", () => send({ scope, type: "set", key, value }));
        btns.set(String(value), b);
        strip.appendChild(b);
      });
      wrap.appendChild(strip);
      onReflect(() => {
        const source = scope === "field" ? snap.config : snap.music.settings;
        const cur = String(source[key]);
        btns.forEach((b, v) => b.classList.toggle("tuner-chip--on", v === cur));
      });
      return wrap;
    }

    // Each section is a CARD: gold title, a one-sentence plain-language
    // summary of what the group does (James, 2026-07-31 — "what does this set
    // of controls do?"), then the controls. Cards live in user-arranged ROWS
    // (the layout engine below) — pane is "visual" or "audio".
    // opts.group wires the card to a LuminaRandom.GROUPS key-group: it gets
    // its own 🎲 (roll just this card) and a 🔒 (every dice roll leaves the
    // card alone — host-enforced). All cards collapse to their header (▾),
    // persisted per window like text size.
    function card(pane, title, summary, cardOpts) {
      const o = cardOpts || {};
      const c = el("div", "tuner-card");
      // Edit-mode grip: drag a card by this bar to move it between rows.
      const grip = el("div", "tuner-grip", "⠿ drag");
      grip.addEventListener("pointerdown", (e) => {
        if (editMode) startCardDrag(e, pane, o.id || title, c);
      });
      c.appendChild(grip);
      const head = el("div", "tuner-cardhead");
      head.appendChild(el("p", "tuner-section", title));
      const tools = el("div", "tuner-cardtools");
      // The card's ⓘ: the old one-sentence summary retired into the popover
      // (2026-08-03) — the summary param now seeds its fallback text.
      const cardId = o.id || title;
      {
        const ib = infoBtn(`card:${cardId}`, title, summary);
        if (ib) tools.appendChild(ib);
      }
      if (o.group) {
        const roll = el("button", "tuner-cardbtn", "🎲");
        roll.type = "button";
        roll.title = "Roll just this card — everything else stays put";
        roll.addEventListener("click", () => send({ scope: "field", type: "randomize", group: o.group }));
        const lock = el("button", "tuner-cardbtn tuner-lock", "🔓");
        lock.type = "button";
        lock.addEventListener("click", () => send({ scope: "field", type: "lockToggle", group: o.group }));
        onReflect(() => {
          const locked = !!(snap.locks && snap.locks[o.group]);
          lock.textContent = locked ? "🔒" : "🔓";
          lock.classList.toggle("on", locked);
          lock.title = locked
            ? "Unlock — let the dice touch this card again"
            : "Lock this card — every dice roll leaves its settings alone";
          roll.disabled = locked;
          c.classList.toggle("tuner-card--locked", locked);
        });
        tools.append(roll, lock);
      }
      const fold = el("button", "tuner-cardbtn tuner-fold", "▾");
      fold.type = "button";
      const setFold = (closed) => {
        c.classList.toggle("tuner-card--closed", closed);
        fold.textContent = closed ? "▸" : "▾";
        fold.title = closed ? "Expand this card" : "Collapse this card to its header";
      };
      setFold(false);
      fold.addEventListener("click", () => {
        const closed = !c.classList.contains("tuner-card--closed");
        setFold(closed);
        const i = collapsedIds.indexOf(cardId);
        if (closed && i < 0) collapsedIds.push(cardId);
        if (!closed && i >= 0) collapsedIds.splice(i, 1);
        try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedIds)); } catch (err) { /* fine */ }
      });
      tools.appendChild(fold);
      head.appendChild(tools);
      c.appendChild(head);
      if (collapsedIds.includes(cardId)) setFold(true);
      CARDS[pane].set(cardId, c);
      return c;
    }

    function minis(parent, children) {
      const row = el("div", "tuner-minis");
      children.forEach((c) => row.appendChild(c));
      parent.appendChild(row);
      return row;
    }

    function button(label, title, onClick, cls) {
      const b = el("button", cls || "tuner-btn", label);
      b.type = "button";
      if (title) b.title = title;
      b.addEventListener("click", onClick);
      return b;
    }

    // --- root + tabs --------------------------------------------------------

    container.textContent = "";
    const header = el("div", "tuner-tabs");
    const tabVisual = button("visual", "The field: structure, patterns, geometry, colors, FX rack", () => setTab("visual"), "tuner-tab");
    const tabAudio = button("audio", "The music: player, DJ sets, reactivity, mod matrix", () => setTab("audio"), "tuner-tab");
    // Right side of the tab bar: dock side, text size, then detach. Sticky
    // with the tabs, so it's reachable from either tab.
    const headRight = el("div", "tuner-headright");

    // (The dock picker died 2026-07-31 — James: "kill the dock icons. There's
    // not gonna ever be any docking. I'm only gonna ever use this as a
    // remote." The host's dock/attach machinery survives for the
    // no-BroadcastChannel in-page fallback; there's just no UI for it.)

    // Panel type size. NOT a field parameter and deliberately NOT sent over the
    // channel — the detached controller usually sits on a different screen than
    // the visualization, so each window remembers its own size.
    {
      // − / + stepper, not a slider (James, 2026-07-31: "it should just be
      // plus minus like it is everywhere else").
      const wrap = el("div", "tuner-textsize");
      wrap.appendChild(el("label", "tuner-label", "text"));
      const out = el("output");
      out.title = "Size of this panel's type and controls — double-click resets";
      let pct = UI_SCALE_DEFAULT;
      const apply = (persist) => {
        container.style.setProperty("--ui-scale", String(pct / 100));
        out.textContent = `${pct}%`;
        if (persist) {
          try { localStorage.setItem(UI_SCALE_KEY, String(pct)); } catch (err) { /* fine */ }
        }
      };
      const nudge = (d) => {
        pct = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, pct + d));
        apply(true);
      };
      try {
        const stored = Number(localStorage.getItem(UI_SCALE_KEY));
        if (Number.isFinite(stored) && stored >= UI_SCALE_MIN && stored <= UI_SCALE_MAX) pct = stored;
      } catch (err) { /* fine */ }
      apply(false);
      out.addEventListener("dblclick", () => {
        pct = UI_SCALE_DEFAULT;
        apply(true);
      });
      wrap.append(
        button("−", "Smaller panel text", () => nudge(-10), "tuner-step"),
        out,
        button("+", "Bigger panel text", () => nudge(10), "tuner-step"));
      headRight.appendChild(wrap);
    }

    // Edit-layout toggle + the gear (2026-07-31): rearrange the board, and
    // choose which cards are on it at all.
    const editBtn = button("edit layout", "Rearrange the board — drag cards by their grip bars, drag a row's bottom edge to set its height", () => {
      editMode = !editMode;
      container.classList.toggle("tuner-edit", editMode);
      editBtn.classList.toggle("tuner-tab--on", editMode);
      renderLayout();
    }, "tuner-btn");
    const gearMenu = el("div", "tuner-gearmenu");
    gearMenu.hidden = true;
    const gearBtn = button("⚙", "Show or hide cards; reset the whole layout", () => {
      gearMenu.hidden = !gearMenu.hidden;
      if (!gearMenu.hidden) buildGearMenu();
    }, "tuner-btn tuner-gearbtn");
    headRight.append(editBtn, gearBtn);
    // House rule: panels dismiss on pointerdown click-away.
    document.addEventListener("pointerdown", (e) => {
      if (gearMenu.hidden) return;
      if (gearMenu.contains(e.target) || gearBtn.contains(e.target)) return;
      gearMenu.hidden = true;
    });

    header.append(tabVisual, tabAudio, headRight);
    if (embedded) {
      headRight.appendChild(button("detach ⧉", "Pop the controls out into their own window — drag it to another screen", () => {
        window.open("./tuner.html", "lumina-tuner", "width=1060,height=920");
      }, "tuner-btn tuner-detach"));
    }

    // --- the command bar (2026-07-31, James: "I prominently need stop and
    // pause... freeze and dice and melt") — transport + the big performance
    // verbs + volume, sticky under the tabs, visible from both tabs.
    const svgIcon = (paths) =>
      `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${paths}</svg>`;
    const DIE_PATHS =
      '<rect x="1.7" y="1.7" width="12.6" height="12.6" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="5.2" cy="5.2" r="1.15"/><circle cx="10.8" cy="5.2" r="1.15"/>' +
      '<circle cx="8" cy="8" r="1.15"/>' +
      '<circle cx="5.2" cy="10.8" r="1.15"/><circle cx="10.8" cy="10.8" r="1.15"/>';
    const CMD_ICONS = {
      play: svgIcon('<path d="M4 2l10 6-10 6z"/>'),
      pause: svgIcon('<path d="M4 2h3v12H4zM10 2h3v12h-3z"/>'),
      stop: svgIcon('<path d="M3.5 3.5h9v9h-9z"/>'),
      freeze: svgIcon('<g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none">' +
        '<path d="M8 1.5v13M2.4 4.8l11.2 6.4M2.4 11.2l11.2-6.4"/></g>'),
      dice: svgIcon(DIE_PATHS),
      diceSoft: svgIcon(
        '<defs><filter id="lum-cmd-soft" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feGaussianBlur stdDeviation="0.75"/></filter></defs>' +
        `<g filter="url(#lum-cmd-soft)">${DIE_PATHS}</g>`),
    };
    const cmdbar = el("div", "tuner-cmdbar");
    const cmdBtn = (html, title, onClick) => {
      const b = el("button", "tuner-cmdbtn");
      b.type = "button";
      b.innerHTML = html;
      b.title = title;
      b.addEventListener("click", () => { onClick(); b.blur(); });
      cmdbar.appendChild(b);
      return b;
    };
    const cPlay = cmdBtn(CMD_ICONS.play, "Play", () => send({ scope: "music", type: "player", cmd: "toggle" }));
    cmdBtn(CMD_ICONS.stop, "Stop — rewind to the top; the field goes back to your sliders", () => send({ scope: "music", type: "player", cmd: "stop" }));
    cmdbar.appendChild(el("span", "tuner-cmdsep"));
    const cFreeze = cmdBtn(CMD_ICONS.freeze, "Freeze the picture — the music plays on", () => send({ scope: "field", type: "freeze" }));
    cmdBtn(CMD_ICONS.dice, "Roll the dice — a whole new look", () => send({ scope: "field", type: "randomize" }));
    cmdBtn(CMD_ICONS.diceSoft, "Melt roll — glide to a new look over two seconds", () => send({ scope: "field", type: "randomizeTween" }));
    const cBack = cmdBtn("↩", "Back — undo the last roll or preset jump", () => send({ scope: "field", type: "undo" }));
    cmdbar.appendChild(el("span", "tuner-cmdsep"));
    {
      const volWrap = el("div", "tuner-cmdvol");
      volWrap.appendChild(el("label", "tuner-label", "vol"));
      const vol = el("input");
      vol.type = "range";
      vol.min = "0";
      vol.max = "1000";
      vol.step = "1";
      vol.title = "Volume — double-click restores full";
      vol.addEventListener("input", () => send({ scope: "music", type: "player", cmd: "volume", value: Number(vol.value) / 1000 }));
      vol.addEventListener("dblclick", () => send({ scope: "music", type: "player", cmd: "volume", value: 1 }));
      volWrap.appendChild(vol);
      cmdbar.appendChild(volWrap);
      onReflect(() => {
        if (snap.music.volume !== undefined) safeSet(vol, String(Math.round(snap.music.volume * 1000)));
      });
    }
    onReflect(() => {
      const playing = !!snap.music.playing;
      cPlay.innerHTML = playing ? CMD_ICONS.pause : CMD_ICONS.play;
      cPlay.title = playing ? "Pause" : "Play";
      cPlay.classList.toggle("on", playing);
      cFreeze.classList.toggle("on", !!snap.frozen);
      cBack.disabled = !snap.fieldPresets.canUndo;
    });

    // One sticky unit: tabs row + command bar (+ the gear's dropdown).
    const headWrap = el("div", "tuner-head");
    headWrap.append(header, cmdbar, gearMenu);
    container.appendChild(headWrap);

    // My deck — pinned favorites, above the tabs' panes so it shows on BOTH.
    // Hidden until something is starred.
    const deck = el("div", "tuner-card tuner-deck");
    {
      const head = el("div", "tuner-cardhead");
      head.appendChild(el("p", "tuner-section", "my deck"));
      const tools = el("div", "tuner-cardtools");
      const ib = infoBtn("card:my deck", "my deck",
        "Your pinned controls — hit the ☆ on any control to keep a copy here, on top, on both tabs.");
      if (ib) tools.appendChild(ib);
      head.appendChild(tools);
      deck.appendChild(head);
    }
    const deckGrid = el("div", "tuner-minis");
    deck.appendChild(deckGrid);
    deck.hidden = true;
    container.appendChild(deck);
    deckRefresh = () => {
      deckGrid.textContent = "";
      deck.hidden = favs.length === 0 || layout.hidden.includes("my deck");
      favs.forEach((favId) => {
        if (BUILDERS[favId]) deckGrid.appendChild(BUILDERS[favId]());
      });
      // Fresh deck controls need current values (their reflectors registered
      // after the last snapshot landed).
      if (snap) reflectors.forEach((fn) => fn());
    };

    const panes = {
      visual: el("div", "tuner-pane"),
      audio: el("div", "tuner-pane"),
    };
    container.append(panes.visual, panes.audio);

    // --- the layout engine (2026-07-31): rows you own -----------------------
    // Each pane is a list of ROWS, 1–5 cards per row, equal shares of the
    // width; any row can pin its own height. Stored per window. Cards the
    // store has never seen (future features) get their own row at the end —
    // extending the panel needs zero migration. Unknown stored ids drop out.
    const LAYOUT_KEY = "lumina-layout";
    const MAX_PER_ROW = 5;
    // A card can live on EITHER tab (James, 2026-07-31: "the visual tab
    // should have access to the audio tab cards") — the gear's ⇄ moves it.
    // Registration pane is only the card's HOME: where it lands by default
    // and where a store that's never seen it adopts it. Reactivity starts on
    // the visual board — it shapes the picture as much as any visual card.
    const DEFAULT_LAYOUT = {
      visual: [["looks"], ["perform"], ["timeline"], ["reactivity"], ["structure", "scene"], ["pattern"],
        ["pulse", "grid", "corners"], ["margins", "canvas"], ["fx rack", "beat lock"]],
      audio: [["player"], ["mod matrix", "react presets"]],
    };
    function defaultLayout() {
      const p = {};
      for (const pn in DEFAULT_LAYOUT) p[pn] = DEFAULT_LAYOUT[pn].map((r) => ({ c: r.slice(), h: 0 }));
      return { v: 1, panes: p, hidden: [] };
    }
    let layout = defaultLayout();
    try {
      const s = JSON.parse(localStorage.getItem(LAYOUT_KEY));
      if (s && s.v === 1 && s.panes && s.panes.visual && s.panes.audio) {
        layout = { v: 1, panes: {}, hidden: Array.isArray(s.hidden) ? s.hidden.slice() : [] };
        ["visual", "audio"].forEach((pn) => {
          layout.panes[pn] = (Array.isArray(s.panes[pn]) ? s.panes[pn] : [])
            .map((r) => ({ c: Array.isArray(r.c) ? r.c.slice(0, MAX_PER_ROW) : [], h: Number(r.h) || 0 }))
            .filter((r) => r.c.length);
        });
      }
    } catch (err) { /* stock layout */ }
    function saveLayout() {
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (err) { /* fine */ }
    }

    const paneRows = { visual: el("div", "tuner-rows"), audio: el("div", "tuner-rows") };
    panes.visual.appendChild(paneRows.visual);
    panes.audio.appendChild(paneRows.audio);
    let editMode = false;

    const cardById = (id) => CARDS.visual.get(id) || CARDS.audio.get(id);

    function renderLayout() {
      // A card lives on exactly one tab — whichever the layout says. Dedupe
      // (first placement wins), drop dead ids, then adopt never-stored cards
      // onto their home tab.
      const seen = new Set();
      ["visual", "audio"].forEach((pn) => {
        layout.panes[pn].forEach((r) => {
          r.c = r.c.filter((id) => cardById(id) && !seen.has(id));
          r.c.forEach((id) => seen.add(id));
        });
        layout.panes[pn] = layout.panes[pn].filter((r) => r.c.length);
      });
      ["visual", "audio"].forEach((pn) => {
        CARDS[pn].forEach((cEl, id) => {
          if (!seen.has(id)) { layout.panes[pn].push({ c: [id], h: 0 }); seen.add(id); }
        });
      });
      ["visual", "audio"].forEach((pn) => {
        const host = paneRows[pn];
        host.textContent = "";
        layout.panes[pn].forEach((row) => {
          const visible = row.c.filter((id) => !layout.hidden.includes(id));
          if (!visible.length) return;
          const rowEl = el("div", "tuner-row");
          rowEl._model = row;
          if (row.h > 0) {
            rowEl.style.height = `${row.h}em`;
            rowEl.classList.add("tuner-row--fixed");
          }
          visible.forEach((id) => rowEl.appendChild(cardById(id)));
          if (editMode) rowEl.appendChild(rowGrip(rowEl));
          host.appendChild(rowEl);
        });
      });
      deck.hidden = favs.length === 0 || layout.hidden.includes("my deck");
      saveLayout();
    }

    // Row height grip (edit mode): drag the row's bottom edge; double-click
    // returns the row to automatic height. Heights live in em so they scale
    // with the text-size control like everything else.
    function rowGrip(rowEl) {
      const g = el("div", "tuner-rowgrip");
      g.title = "Drag to set this row's height — double-click for automatic";
      g.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try { g.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
        const emPx = parseFloat(getComputedStyle(container).fontSize) || 16;
        const startH = rowEl.getBoundingClientRect().height;
        const y0 = e.clientY;
        const move = (ev) => {
          const hpx = Math.max(4 * emPx, startH + (ev.clientY - y0));
          rowEl.style.height = `${(hpx / emPx).toFixed(2)}em`;
          rowEl.classList.add("tuner-row--fixed");
        };
        const up = () => {
          g.removeEventListener("pointermove", move);
          g.removeEventListener("pointerup", up);
          const em = parseFloat(rowEl.style.height);
          rowEl._model.h = Number.isFinite(em) ? em : 0;
          saveLayout();
        };
        g.addEventListener("pointermove", move);
        g.addEventListener("pointerup", up);
      });
      g.addEventListener("dblclick", () => {
        rowEl._model.h = 0;
        rowEl.style.height = "";
        rowEl.classList.remove("tuner-row--fixed");
        saveLayout();
      });
      return g;
    }

    // Card drag (edit mode). Drop beside a card → join that row (max 5, a red
    // line refuses); drop in the gap between rows → its own new row.
    let dropMark = null;
    function clearMark() {
      if (dropMark && dropMark.parentNode) dropMark.parentNode.removeChild(dropMark);
      dropMark = null;
    }
    function startCardDrag(e, pane, id, cardEl) {
      e.preventDefault();
      cardEl.classList.add("tuner-dragging");
      const host = paneRows[pane];
      let target = null; // {row, index} joins a row; {newAt} makes a new one
      const move = (ev) => {
        clearMark();
        target = null;
        const rows = Array.from(host.children).filter((n) => n.classList.contains("tuner-row"));
        for (let i = 0; i < rows.length; i++) {
          const rc = rows[i].getBoundingClientRect();
          if (ev.clientY < rc.top - 2) {
            target = { newAt: i };
            dropMark = el("div", "tuner-dropline");
            host.insertBefore(dropMark, rows[i]);
            return;
          }
          if (ev.clientY <= rc.bottom + 2) {
            const row = rows[i]._model;
            if (!row.c.includes(id) && row.c.length >= MAX_PER_ROW) {
              dropMark = el("div", "tuner-dropline tuner-drop--bad");
              host.insertBefore(dropMark, rows[i].nextSibling);
              return;
            }
            const kids = Array.from(rows[i].children).filter((n) => n.classList.contains("tuner-card") && n !== cardEl);
            let idx = kids.length;
            for (let k = 0; k < kids.length; k++) {
              const kr = kids[k].getBoundingClientRect();
              if (ev.clientX < kr.left + kr.width / 2) { idx = k; break; }
            }
            target = { row, index: idx };
            dropMark = el("div", "tuner-dropmark");
            if (idx >= kids.length) rows[i].insertBefore(dropMark, rows[i].querySelector(".tuner-rowgrip"));
            else rows[i].insertBefore(dropMark, kids[idx]);
            return;
          }
        }
        target = { newAt: rows.length };
        dropMark = el("div", "tuner-dropline");
        host.appendChild(dropMark);
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        cardEl.classList.remove("tuner-dragging");
        clearMark();
        if (!target) { renderLayout(); return; }
        const rowsArr = layout.panes[pane];
        const src = rowsArr.find((r) => r.c.includes(id));
        if (src) src.c.splice(src.c.indexOf(id), 1);
        if (target.row) {
          // Map the visible drop index back through any hidden ids in the row.
          const visibleIds = target.row.c.filter((cid) => !layout.hidden.includes(cid));
          const beforeId = visibleIds[target.index];
          const at = beforeId === undefined ? target.row.c.length : target.row.c.indexOf(beforeId);
          target.row.c.splice(at, 0, id);
        } else {
          const at = Math.max(0, Math.min(target.newAt, rowsArr.length));
          rowsArr.splice(at, 0, { c: [id], h: 0 });
        }
        renderLayout();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    }

    // The gear menu: every card, checkbox = on the board. Unchecked cards are
    // OFF SCREEN entirely (not collapsed); recheck and they return to where
    // they last lived. Reset restores the stock rows, heights and visibility.
    function buildGearMenu() {
      gearMenu.textContent = "";
      const homeOf = (id) =>
        (layout.panes.visual.some((r) => r.c.includes(id)) ? "visual" : "audio");
      const addRow = (id, labelText, movable) => {
        const lab = el("label", "tuner-gearrow");
        const cb = el("input");
        cb.type = "checkbox";
        cb.checked = !layout.hidden.includes(id);
        cb.addEventListener("change", () => {
          const i = layout.hidden.indexOf(id);
          if (cb.checked && i >= 0) layout.hidden.splice(i, 1);
          if (!cb.checked && i < 0) layout.hidden.push(id);
          renderLayout();
          deckRefresh();
        });
        lab.append(cb, document.createTextNode(labelText));
        if (movable) {
          // ⇄ moves the card to the OTHER tab's board (its own row at the
          // end — drag it into place from there). James, 2026-07-31: the
          // visual tab must be able to host reactivity/matrix/etc.
          const other = homeOf(id) === "visual" ? "audio" : "visual";
          const mv = el("button", "tuner-gearmove", `⇄ ${other}`);
          mv.type = "button";
          mv.title = `Move this card to the ${other} tab's board`;
          mv.addEventListener("click", (e) => {
            e.preventDefault(); // inside a <label> — don't toggle the checkbox
            layout.panes[homeOf(id)].forEach((r) => {
              const i = r.c.indexOf(id);
              if (i >= 0) r.c.splice(i, 1);
            });
            layout.panes[other].push({ c: [id], h: 0 });
            renderLayout();
            buildGearMenu();
          });
          lab.appendChild(mv);
        }
        gearMenu.appendChild(lab);
      };
      addRow("my deck", "my deck", false);
      const allIds = [...CARDS.visual.keys(), ...CARDS.audio.keys()];
      [["visual", "on the visual tab"], ["audio", "on the audio tab"]].forEach(([pn, cap]) => {
        gearMenu.appendChild(el("p", "tuner-gearcap", cap));
        allIds.filter((id) => homeOf(id) === pn).forEach((id) => addRow(id, id, true));
      });
      gearMenu.appendChild(button("reset layout", "Back to the stock board — rows, heights, tab homes, and hidden cards", () => {
        layout = defaultLayout();
        renderLayout();
        deckRefresh();
        buildGearMenu();
      }, "tuner-btn tuner-gearreset"));
    }

    function setTab(name) {
      panes.visual.hidden = name !== "visual";
      panes.audio.hidden = name !== "audio";
      tabVisual.classList.toggle("tuner-tab--on", name === "visual");
      tabAudio.classList.toggle("tuner-tab--on", name === "audio");
      try { localStorage.setItem("lumina-tuner-tab", name); } catch (err) { /* fine */ }
    }

    // ========================================================================
    // VISUAL tab
    // ========================================================================

    // Full-width top card: whole-look management + the three hero sliders.
    const cLooks = card("visual", "looks",
      "Whole looks, not single knobs: recall one, roll the dice for a new one, bank keepers — plus the three big sliders.",
      { group: "looks" });

    // Field presets.
    {
      const row = el("div", "tuner-pattern");
      row.appendChild(el("label", "tuner-label", "presets"));
      const sel = el("select");
      row.appendChild(sel);
      const save = button("save", "Save the current settings as a named preset", () => {
        const name = (prompt("Name this preset:") || "").trim();
        if (name) send({ scope: "field", type: "presetSave", name });
      });
      const del = button("delete", "Delete the selected saved preset (built-ins are protected)", () => {
        const v = sel.value;
        if (v.startsWith("u:") && confirm(`Delete preset "${v.slice(2)}"?`)) {
          send({ scope: "field", type: "presetDelete", name: v.slice(2) });
        }
      });
      del.disabled = true;
      // "set as default" (James, 2026-07-28): overwrite the reserved
      // "default launch" preset with the current look — the page opens on it.
      const setDef = button("set as default", "Save the current look as “default launch” — the page opens on it from now on", () => {
        const users = (snap && snap.fieldPresets ? snap.fieldPresets.user : []);
        const exists = users.some((n) => n.toLowerCase() === "default launch");
        if (!exists || confirm('Overwrite "default launch" with the current look?')) {
          send({ scope: "field", type: "presetSetDefault" });
        }
      });

      // The roll cluster: back ← dice → keep. Undo what the dice just did, roll
      // again, or bank what's on screen without breaking stride.
      const back = button("↩", "Back — undo the last roll or preset load. Whole-look jumps only, not slider tweaks", () => send({ scope: "field", type: "undo" }), "tuner-btn tuner-dice tuner-back");
      back.disabled = true;
      const dice = button("🎲", "Roll the dice — randomize every visual parameter at once", () => send({ scope: "field", type: "randomize" }), "tuner-btn tuner-dice");
      // A name is pre-filled so banking a look is one keystroke (Enter) when
      // the music is running and you don't want to stop and think of one.
      const keep = button("keep", "Bank the look that's on screen right now under a name", () => {
        const taken = new Set((snap && snap.fieldPresets ? snap.fieldPresets.user : []).map((n) => n.toLowerCase()));
        let suggested = "keep 1";
        for (let i = 1; i < 999; i++) {
          if (!taken.has(`keep ${i}`)) { suggested = `keep ${i}`; break; }
        }
        const name = (prompt("Name this look:", suggested) || "").trim();
        if (name) send({ scope: "field", type: "presetSave", name });
      }, "tuner-btn tuner-keep");
      row.append(save, del, setDef, back, dice, keep);
      {
        const ib = infoBtn("row:looks-presets", "presets & the dice",
          "🎲 rolls a whole new look, ↩ takes it back, keep banks what's on screen. set as default picks the look the page opens on; “last session” brings back where you left off");
        if (ib) row.appendChild(ib);
      }
      sel.addEventListener("change", () => {
        del.disabled = !sel.value.startsWith("u:");
        if (sel.value) send({ scope: "field", type: "preset", value: sel.value });
      });
      onReflect(() => { back.disabled = !snap.fieldPresets.canUndo; });
      // Options rebuild only when the preset LIST changes — snapshots stream
      // continuously during playback and a rebuild closes an open dropdown.
      let listSig = "";
      onReflect(() => {
        const sig = JSON.stringify([snap.fieldPresets.factory.map((p) => p.id), snap.fieldPresets.user, !!snap.fieldPresets.hasLast]);
        if (sig !== listSig) {
          listSig = sig;
          sel.textContent = "";
          const custom = el("option", null, "— custom —");
          custom.value = "";
          sel.appendChild(custom);
          const fg = el("optgroup");
          fg.label = "built in";
          snap.fieldPresets.factory.forEach((p) => {
            const option = el("option", null, p.label);
            option.value = `f:${p.id}`;
            fg.appendChild(option);
          });
          sel.appendChild(fg);
          if (snap.fieldPresets.user.length) {
            const ug = el("optgroup");
            ug.label = "yours";
            snap.fieldPresets.user.forEach((name) => {
              const option = el("option", null, name);
              option.value = `u:${name}`;
              ug.appendChild(option);
            });
            sel.appendChild(ug);
          }
          if (snap.fieldPresets.hasLast) {
            const lg = el("optgroup");
            lg.label = "auto";
            const option = el("option", null, "last session");
            option.value = "last";
            lg.appendChild(option);
            sel.appendChild(lg);
          }
        }
        safeSet(sel, snap.fieldPresets.selected || "");
        del.disabled = !(snap.fieldPresets.selected || "").startsWith("u:");
      });
      cLooks.appendChild(row);
    }

    cLooks.appendChild(slider("field", "speed", "speed", FIELD_SLIDERS.speed, { wide: true, title: "Global tempo, stopped to ×8" }));
    cLooks.appendChild(slider("field", "tileSize", "size", FIELD_SLIDERS.tileSize, { wide: true, title: "The little squares themselves — grid spacing stays put, so big tiles close the gaps, butt up, overlap, then chaos" }));
    cLooks.appendChild(slider("field", "blur", "blur", FIELD_SLIDERS.blur, { wide: true, title: "Gaussian blur over the whole field" }));

    // The perform strip (2026-07-31): momentary punch pads + an assignable
    // XY pad. Pads fire while held and restore clean on release — they never
    // touch the saved state.
    {
      const cPerform = card("visual", "perform",
        "Play it live: hold a pad and it fires, let go and it's gone. The XY pad drags two knobs at once.");
      const row = el("div", "tuner-perform");
      const padRow = el("div", "tuner-pads");
      const PADS = [
        ["blackout", "Lights out while held"],
        ["strobe", "Hard square-wave strobe while held"],
        ["freeze", "The picture holds still while held"],
        ["kaleido", "Kaleidoscope burst while held"],
        ["iris", "Iris down to a porthole while held"],
        ["warp", "Liquid warp while held"],
      ];
      const padHandlers = {};
      PADS.forEach(([name, tip], i) => {
        const b = el("button", "tuner-pad", name);
        b.type = "button";
        b.title = `${tip} — or hold key ${i + 1}`;
        const down = () => {
          if (b.classList.contains("on")) return;
          b.classList.add("on");
          send({ scope: "field", type: "punch", name, on: true });
        };
        const up = () => {
          if (!b.classList.contains("on")) return;
          b.classList.remove("on");
          send({ scope: "field", type: "punch", name, on: false });
        };
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); down(); });
        b.addEventListener("pointerup", up);
        b.addEventListener("pointerleave", up);
        b.addEventListener("pointercancel", up);
        padHandlers[String(i + 1)] = { down, up, btn: b };
        padRow.appendChild(b);
      });

      // The active scene's own punch verbs (2026-08-03): up to three extra
      // pads, declared in scenes.js DEFS, riding the same punch machinery.
      // They appear only while their scene is playing; a held pad is released
      // before the strip rebuilds so a scene change can't strand an override.
      const scenePadHost = el("span", "tuner-scenepads");
      padRow.appendChild(scenePadHost);
      let scenePadSig = null;
      onReflect(() => {
        if (snap.config.scene === scenePadSig) return;
        scenePadSig = snap.config.scene;
        [...scenePadHost.querySelectorAll(".tuner-pad.on")].forEach((b) => {
          send({ scope: "field", type: "punch", name: b.dataset.punch, on: false });
        });
        scenePadHost.textContent = "";
        const defs = (globalThis.LuminaScenes && globalThis.LuminaScenes.DEFS) || {};
        const d = defs[scenePadSig];
        (((d && d.punches) || []).slice(0, 3)).forEach((pv) => {
          const b = el("button", "tuner-pad tuner-pad--scene", pv.label);
          b.type = "button";
          b.dataset.punch = pv.name;
          b.title = `${pv.tip} — ${scenePadSig}'s own verb`;
          const down = () => {
            if (b.classList.contains("on")) return;
            b.classList.add("on");
            send({ scope: "field", type: "punch", name: pv.name, on: true });
          };
          const up = () => {
            if (!b.classList.contains("on")) return;
            b.classList.remove("on");
            send({ scope: "field", type: "punch", name: pv.name, on: false });
          };
          b.addEventListener("pointerdown", (e) => { e.preventDefault(); down(); });
          b.addEventListener("pointerup", up);
          b.addEventListener("pointerleave", up);
          b.addEventListener("pointercancel", up);
          scenePadHost.appendChild(b);
        });
      });
      // Keys 1–6 are the pads, hold-to-fire, whenever this panel is visible.
      window.addEventListener("keydown", (e) => {
        if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))) return;
        const p = padHandlers[e.key];
        if (p && p.btn.offsetParent) { e.preventDefault(); p.down(); }
      });
      window.addEventListener("keyup", (e) => {
        const p = padHandlers[e.key];
        if (p) p.up();
      });
      row.appendChild(padRow);

      // XY pad: drag one dot, drive two knobs.
      const xyWrap = el("div", "tuner-xy");
      const surface = el("div", "tuner-xy-pad");
      surface.title = "Drag — X drives the first knob, Y the second";
      const dot = el("span", "tuner-xy-dot");
      surface.appendChild(dot);
      const XY_KEY = "lumina-xy";
      let ax = { x: "fxWarp", y: "sceneDrive" };
      try {
        const s = JSON.parse(localStorage.getItem(XY_KEY));
        if (s && FIELD_SLIDERS[s.x] && FIELD_SLIDERS[s.y]) ax = s;
      } catch (err) { /* fine */ }
      const prettyKey = (k) => k.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^fx /, "fx: ");
      const axes = el("div", "tuner-xy-axes");
      const axisSel = (axis, labelText) => {
        const wrapA = el("div", "tuner-mini tuner-mini--select");
        wrapA.appendChild(el("label", "tuner-label", labelText));
        const sel = el("select");
        Object.keys(FIELD_SLIDERS).forEach((k) => {
          const option = el("option", null, prettyKey(k));
          option.value = k;
          sel.appendChild(option);
        });
        sel.value = ax[axis];
        sel.addEventListener("change", () => {
          ax[axis] = sel.value;
          try { localStorage.setItem(XY_KEY, JSON.stringify(ax)); } catch (err) { /* fine */ }
        });
        wrapA.appendChild(sel);
        return wrapA;
      };
      axes.append(axisSel("x", "x →"), axisSel("y", "y ↑"));
      const norm = (spec, v) => {
        const mn = spec.min !== undefined ? spec.min : 0;
        const mx = spec.max !== undefined ? spec.max : 1000;
        return Math.max(0, Math.min(1, (spec.toSlider(v) - mn) / (mx - mn || 1)));
      };
      let dragging = false;
      const sendXY = (e) => {
        const r = surface.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        const ny = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
        dot.style.left = `${(nx * 100).toFixed(1)}%`;
        dot.style.top = `${((1 - ny) * 100).toFixed(1)}%`;
        [["x", nx], ["y", ny]].forEach(([axis, n]) => {
          const spec = FIELD_SLIDERS[ax[axis]];
          const mn = spec.min !== undefined ? spec.min : 0;
          const mx = spec.max !== undefined ? spec.max : 1000;
          send({ scope: "field", type: "set", key: ax[axis], value: spec.fromSlider(mn + n * (mx - mn)) });
        });
      };
      surface.addEventListener("pointerdown", (e) => {
        dragging = true;
        surface.setPointerCapture(e.pointerId);
        sendXY(e);
      });
      surface.addEventListener("pointermove", (e) => { if (dragging) sendXY(e); });
      surface.addEventListener("pointerup", () => { dragging = false; });
      surface.addEventListener("pointercancel", () => { dragging = false; });
      onReflect(() => {
        if (dragging) return;
        const sx = FIELD_SLIDERS[ax.x], sy = FIELD_SLIDERS[ax.y];
        if (snap.config[ax.x] === undefined || snap.config[ax.y] === undefined) return;
        dot.style.left = `${(norm(sx, snap.config[ax.x]) * 100).toFixed(1)}%`;
        dot.style.top = `${((1 - norm(sy, snap.config[ax.y])) * 100).toFixed(1)}%`;
      });
      xyWrap.append(surface, axes);
      row.appendChild(xyWrap);
      cPerform.appendChild(row);
    }

    // The performance timeline (2026-07-31): James records his own set in
    // segments — arm, move, punch out, scrub back, layer another take. No
    // quantize, his explicit call: raw times only, the strip shows seconds
    // and energy, never bar claims.
    {
      const cTl = card("visual", "timeline",
        "Record your own set: hit record, make moves while the track plays, punch out. Re-record any stretch — only the controls you touch get replaced. Your timing, verbatim.");
      const strip = el("div", "tuner-tlstrip");
      const cv = el("canvas");
      cv.className = "tuner-tlcanvas";
      strip.appendChild(cv);
      cTl.appendChild(strip);

      const rowB = el("div", "tuner-pattern");
      const rec = button("● record", "Punch in — your moves start recording at the playhead. Click again to punch out and bank the take", () => send({ scope: "music", type: "timeline", cmd: "arm" }), "tuner-btn tuner-rec");
      const count = el("output", "tuner-tlcount", "empty");
      const undoTake = button("undo take", "Throw away the last banked take", () => send({ scope: "music", type: "timeline", cmd: "undoTake" }));
      undoTake.disabled = true;
      const loopClear = button("clear loop", "Drop the loop region", () => send({ scope: "music", type: "timeline", cmd: "loopClear" }));
      loopClear.disabled = true;
      const clearAll = button("clear track", "Erase this track's whole recording", () => {
        if (confirm("Erase the whole recorded timeline for this track?")) {
          send({ scope: "music", type: "timeline", cmd: "clear" });
        }
      });
      rowB.append(rec, count, undoTake, loopClear, clearAll);
      {
        const ib = infoBtn("row:timeline-strip", "the strip",
          "click the strip to jump; drag a stretch to loop it — a looping armed pass banks a take every lap. gold ticks are your moves (tall = whole-look jumps, blue = pads). switch the player to “your set” to watch it back");
        if (ib) rowB.appendChild(ib);
      }
      cTl.appendChild(rowB);

      // Strip interactions: click = seek, drag = loop region, dblclick = clear.
      const timeAt = (e) => {
        const r = cv.getBoundingClientRect();
        const dur = (snap && snap.music.duration) || 0;
        return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur;
      };
      let downX = null, downT = 0, dragT = null;
      cv.addEventListener("pointerdown", (e) => {
        cv.setPointerCapture(e.pointerId);
        downX = e.clientX;
        downT = timeAt(e);
        dragT = null;
      });
      cv.addEventListener("pointermove", (e) => {
        if (downX === null) return;
        if (Math.abs(e.clientX - downX) > 6) dragT = timeAt(e);
      });
      cv.addEventListener("pointerup", (e) => {
        if (downX === null) return;
        if (dragT !== null) {
          send({ scope: "music", type: "timeline", cmd: "loop", a: Math.min(downT, dragT), b: Math.max(downT, dragT) });
        } else {
          send({ scope: "music", type: "player", cmd: "seek", value: downT });
        }
        downX = null;
        dragT = null;
      });
      cv.addEventListener("dblclick", () => send({ scope: "music", type: "timeline", cmd: "loopClear" }));

      const draw = () => {
        if (!snap || !snap.music.timeline) return;
        const tl = snap.music.timeline;
        const dur = snap.music.duration || 1;
        const w = strip.clientWidth || 600;
        if (cv.width !== w) cv.width = w;
        const h = cv.height = 84;
        const g = cv.getContext("2d");
        g.clearRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,0.05)";
        g.fillRect(0, 0, w, h);
        // Energy silhouette — the song's own shape, no bar claims.
        if (tl.barEnergy && tl.barEnergy.length) {
          const n = tl.barEnergy.length;
          const max = Math.max(...tl.barEnergy, 0.001);
          g.fillStyle = "rgba(255,255,255,0.16)";
          for (let i = 0; i < n; i++) {
            const eh = (tl.barEnergy[i] / max) * (h - 10);
            g.fillRect((i / n) * w, h - eh, Math.max(1, w / n - 1), eh);
          }
        }
        // Loop region.
        if (tl.loop) {
          g.fillStyle = "rgba(227,185,104,0.14)";
          const x0 = (tl.loop.a / dur) * w;
          const x1 = (tl.loop.b / dur) * w;
          g.fillRect(x0, 0, x1 - x0, h);
          g.fillStyle = "rgba(227,185,104,0.7)";
          g.fillRect(x0, 0, 1.5, h);
          g.fillRect(x1 - 1.5, 0, 1.5, h);
        }
        // Recorded moves.
        (tl.events || []).forEach(([t, kind]) => {
          const x = (t / dur) * w;
          if (kind === 1) { g.fillStyle = "#e3b968"; g.fillRect(x, 4, 2, h - 8); }
          else if (kind === 2) { g.fillStyle = "#7db5e8"; g.fillRect(x, h * 0.35, 1.5, h * 0.4); }
          else { g.fillStyle = "rgba(227,185,104,0.55)"; g.fillRect(x, h * 0.25, 1, h * 0.5); }
        });
        // Playhead.
        const px = ((snap.music.time || 0) / dur) * w;
        g.fillStyle = tl.armed ? "#e05548" : "#f2f2f6";
        g.fillRect(px - 0.75, 0, 1.5, h);
      };
      onReflect(() => {
        const tl = snap.music.timeline;
        if (!tl) return;
        rec.textContent = tl.armed ? "■ punch out" : "● record";
        rec.classList.toggle("on", !!tl.armed);
        strip.classList.toggle("tuner-tlstrip--armed", !!tl.armed);
        count.textContent = tl.armed
          ? `take: ${tl.takeCount} moves`
          : (tl.count ? `${tl.count} moves` : "empty");
        undoTake.disabled = !tl.canUndo;
        loopClear.disabled = !tl.loop;
        draw();
      });
    }

    minis(card("visual", "pulse",
      "The feel of each flash — how it rests, how tiles fall out of step, how the fade curves.",
      { group: "pulse" }), [
      slider("field", "holdScale", "holds", FIELD_SLIDERS.holdScale, { desc: "how long each flash rests at full bright and full dark" }),
      slider("field", "desync", "desync", FIELD_SLIDERS.desync, { desc: "knocks tiles out of step — 0% flashes in unison like 2002" }),
      slider("field", "ease", "ease", FIELD_SLIDERS.ease, { desc: "fade feel — sharp corners to soft breathing" }),
      slider("field", "border", "border", FIELD_SLIDERS.border, { desc: "outline around each tile — 0 removes it" }),
    ]);

    const cStruct = card("visual", "structure",
      "What the tiles are: their arrangement, shape, colors, and the motion laid over them.",
      { group: "structure" });
    cStruct.appendChild(chips("field", "layout", "layout", FIELD.LAYOUTS.map((l) => [l, l]), drawLayoutChip));
    cStruct.appendChild(chips("field", "shape", "shape", FIELD.SHAPES.map((s) => [s, s]), drawShapeChip));
    cStruct.appendChild(chips("field", "waveform", "wave", FIELD.WAVEFORMS.map((w) => [w, w]), drawWaveChip,
      { desc: "the flash curve — how each tile gets from dark to bright and back" }));
    cStruct.appendChild(chips("field", "palette", "palette", Object.keys(FIELD.PALETTES).map((p) => [p, p]), drawPaletteChip,
      { desc: "duo = the two color pickers in canvas; the rest are ready-made ramps" }));
    minis(cStruct, [
      slider("field", "hueShift", "hue", FIELD_SLIDERS.hueShift, { desc: "spins every color around the wheel" }),
      slider("field", "merge", "merge", FIELD_SLIDERS.merge, { desc: "fuses some tiles into bigger blocks" }),
      slider("field", "rotate", "rotate", FIELD_SLIDERS.rotate, { desc: "tilts each tile a random amount" }),
      slider("field", "spin", "spin", FIELD_SLIDERS.spin, { desc: "every tile turns, continuously" }),
      slider("field", "displace", "displace", FIELD_SLIDERS.displace, { desc: "shakes tiles off their spots — great with a beat behind it" }),
      slider("field", "sizePulse", "pulse", FIELD_SLIDERS.sizePulse, { desc: "tiles swell and shrink in rolling waves" }),
      slider("field", "counter", "counter", FIELD_SLIDERS.counter, { desc: "a ghost twin flashing opposite — interference patterns" }),
      slider("field", "nest", "nest", FIELD_SLIDERS.nest, { desc: "smaller tiles inside the tiles, flashing opposite" }),
    ]);

    {
      const cScene = card("visual", "scene",
        "An animated backdrop painted underneath the tiles — ink, ridges, flame, or a star tunnel.",
        { group: "scene" });
      const sceneIds = (globalThis.LuminaScenes && globalThis.LuminaScenes.LIST) ||
        ["none", "ink", "ridge", "flame", "nebula"];
      const genomeNames = ((globalThis.LuminaScenes && globalThis.LuminaScenes.GENOMES) || []).map((g) => [g.name, g.name]);
      cScene.appendChild(chips("field", "scene", "scene", sceneIds.map((s) => [s, s]), drawSceneChip,
        { desc: "which backdrop plays — none is the classic plain field" }));
      minis(cScene, [
        select("field", "scenePalette", "scene palette", Object.keys(FIELD.PALETTES).concat("genome").map((p) => [p, p]), { desc: "the backdrop's colors, separate from the tiles'" }),
        slider("field", "sceneMix", "scene mix", FIELD_SLIDERS.sceneMix, { desc: "backdrop brightness — up, and the scene takes over" }),
        slider("field", "sceneTiles", "tiles over", FIELD_SLIDERS.sceneTiles, { desc: "how solid the tiles look over it — 0 hides them" }),
        slider("field", "sceneSpeed", "scene speed", FIELD_SLIDERS.sceneSpeed, { desc: "how fast the backdrop moves — separate from the tiles' tempo" }),
        slider("field", "sceneScale", "scene scale", FIELD_SLIDERS.sceneScale, { desc: "zooms the backdrop in and out" }),
        slider("field", "sceneDrive", "scene drive", FIELD_SLIDERS.sceneDrive, { desc: "energy — glow, density, agitation" }),
        slider("field", "sceneWarp", "scene warp", FIELD_SLIDERS.sceneWarp, { desc: "bends the backdrop — each scene warps its own way" }),
        slider("field", "sceneHue", "scene hue", FIELD_SLIDERS.sceneHue, { desc: "spins the backdrop's colors" }),
      ]);

      // Per-scene controls (2026-08-03, the Synesthesia two-tier model): the
      // active scene's OWN knobs, declared in scenes.js DEFS. The section
      // swaps when the scene changes — the shared scene* sliders above never
      // move. Rebuilds are sig-guarded to actual scene changes; each rebuild
      // leaves its old reflectors behind (safeSet on detached nodes is a
      // no-op), same accepted pattern as the deck.
      const KINDS = {
        pct: (p) => slider("field", p.key, p.label || p.key, pct, { desc: p.info }),
        genomes: (p) => genomeNames.length
          ? select("field", p.key, p.label || "flame genome", genomeNames, { desc: p.info })
          : null,
      };
      const localHost = el("div", "tuner-scenelocal");
      cScene.appendChild(localHost);
      let localSig = null;
      onReflect(() => {
        if (snap.config.scene === localSig) return;
        localSig = snap.config.scene;
        const defs = (globalThis.LuminaScenes && globalThis.LuminaScenes.DEFS) || {};
        const d = defs[localSig];
        localHost.textContent = "";
        const els = ((d && d.params) || [])
          .map((p) => (KINDS[p.kind] ? KINDS[p.kind](p) : null))
          .filter(Boolean);
        if (els.length) minis(localHost, els);
      });
    }

    {
      const cBeat = card("visual", "beat lock",
        "Ties the flashing to the beat of the track that's playing.",
        { group: "beat" });
      const accents = (DSP.ACCENT_NAMES || ["four"]).map((a) => [a, a]);
      minis(cBeat, [
        select("field", "accent", "accent", accents, { desc: "which beats the pulse fires on — wire pulse to a knob in the audio tab" }),
        slider("field", "syncBeats", "sync", FIELD_SLIDERS.syncBeats, { desc: "one flash cycle every 1/2/4/8 beats — free runs at its own speed" }),
      ]);
    }

    const cPattern = card("visual", "pattern",
      "The choreography — which tiles flash when, and in what order. Every chip is a live preview.",
      { group: "pattern" });
    {
      // Animated pattern chips: the REAL phase math from lumina-field.js at
      // postage-stamp size, one shared ~20 fps loop, skipped while hidden.
      const strip = el("div", "tuner-chips tuner-chips--pattern");
      const hint = el("p", "tuner-desc");
      const btns = new Map();
      const anims = [];
      const PR = 4, PC = 6;
      FIELD.PATTERNS.forEach((p) => {
        const b = el("button", "tuner-chip");
        b.type = "button";
        b.title = p.hint;
        const cv = el("canvas");
        cv.width = CHIP_W;
        cv.height = CHIP_H;
        b.append(cv, el("span", "tuner-chip-label", p.label));
        b.addEventListener("click", () => send({ scope: "field", type: "set", key: "pattern", value: p.id }));
        btns.set(p.id, b);
        strip.appendChild(b);
        const ph = [];
        for (let r = 0; r < PR; r++) {
          for (let c = 0; c < PC; c++) {
            let v = 0;
            try { v = p.tile(r, c, PR, PC, 0.35).phase || 0; } catch (err) { v = 0; }
            ph.push(v);
          }
        }
        anims.push({ ctx2: cv.getContext("2d"), ph });
      });
      cPattern.append(strip, hint);
      onReflect(() => {
        btns.forEach((b, pid) => b.classList.toggle("tuner-chip--on", pid === snap.config.pattern));
        const pat = FIELD.PATTERNS.find((p) => p.id === snap.config.pattern) || FIELD.PATTERNS[0];
        hint.textContent = pat.hint;
      });
      let lastDraw = 0;
      (function chipLoop(now) {
        requestAnimationFrame(chipLoop);
        if (now - lastDraw < 50) return;
        if (!strip.offsetParent) return; // other tab or collapsed card
        lastDraw = now;
        const t = now / 1000;
        const cw = (CHIP_W - 8) / PC;
        const chh = (CHIP_H - 8) / PR;
        anims.forEach((a) => {
          chipBase(a.ctx2, CHIP_W, CHIP_H);
          for (let r = 0; r < PR; r++) {
            for (let c = 0; c < PC; c++) {
              const v = 0.5 + 0.5 * Math.cos((t * 0.55 - a.ph[r * PC + c]) * Math.PI * 2);
              a.ctx2.fillStyle = `rgba(255,255,255,${(0.08 + v * 0.82).toFixed(3)})`;
              a.ctx2.fillRect(4 + c * cw + 0.5, 4 + r * chh + 0.5, cw - 1, chh - 1);
            }
          }
        });
      })(performance.now());
    }
    minis(cPattern, [
      slider("field", "spread", "spread", FIELD_SLIDERS.spread, { desc: "how far apart in time the tiles flash — 0 is all together" }),
      slider("field", "twist", "twist", FIELD_SLIDERS.twist, { desc: "this pattern's own twist — the note above says what it does" }),
    ]);

    {
      const cGrid = card("visual", "grid",
        "How many tiles fill the frame.", { group: "grid" });
      const fillWrap = el("label", "tuner-check");
      const fillCheck = el("input");
      fillCheck.type = "checkbox";
      fillWrap.append(fillCheck, document.createTextNode("fill"));
      fillWrap.title = "Stretch the whole composition to fill the frame edge to edge";
      fillCheck.addEventListener("change", () => send({ scope: "field", type: "set", key: "fill", value: fillCheck.checked }));
      onReflect(() => { fillCheck.checked = !!snap.config.fill; });
      minis(cGrid, [
        slider("field", "rows", "rows", FIELD_SLIDERS.rows, { desc: "tile rows — 3 is the 2002 original" }),
        slider("field", "cols", "cols", FIELD_SLIDERS.cols, { desc: "tiles per row — 4 is the 2002 original" }),
        fillWrap,
      ]);
    }

    {
      const cMargins = card("visual", "margins",
        "Breathing room — space around the field and between the tiles.",
        { group: "margins" });
      const linkWrap = el("div", "tuner-mini tuner-mini--select");
      linkWrap.appendChild(el("label", "tuner-label", "link"));
      const linkSel = el("select");
      [["linked", "linked"], ["mirrored", "mirrored"], ["free", "free"]].forEach(([v, t]) => {
        const option = el("option", null, t);
        option.value = v;
        linkSel.appendChild(option);
      });
      linkSel.title = "linked moves all four together, mirrored pairs top/bottom and left/right, free is independent";
      linkWrap.appendChild(linkSel);
      linkSel.addEventListener("change", () => send({ scope: "field", type: "marginMode", value: linkSel.value }));
      onReflect(() => safeSet(linkSel, snap.marginLink));
      minis(cMargins, [
        linkWrap,
        slider("field", "marginTop", "top", FIELD_SLIDERS.marginTop),
        slider("field", "marginRight", "right", FIELD_SLIDERS.marginRight),
        slider("field", "marginBottom", "bottom", FIELD_SLIDERS.marginBottom),
        slider("field", "marginLeft", "left", FIELD_SLIDERS.marginLeft),
        slider("field", "gapX", "gap ↔", FIELD_SLIDERS.gapX, { desc: "space between tiles, side to side" }),
        slider("field", "gapY", "gap ↕", FIELD_SLIDERS.gapY, { desc: "space between rows" }),
        slider("field", "inset", "row inset", FIELD_SLIDERS.inset, { desc: "how far each row's glow reaches past its tiles" }),
      ]);
    }

    minis(card("visual", "corners",
      "How rounded everything is — tiles, row boxes, and the outer frame.",
      { group: "corners" }), [
      slider("field", "radiusTile", "tiles", FIELD_SLIDERS.radiusTile, { desc: "0 is square, 50% makes circles" }),
      slider("field", "radiusRow", "rows", FIELD_SLIDERS.radiusRow, { desc: "rounds the row boxes" }),
      slider("field", "radiusOuter", "frame", FIELD_SLIDERS.radiusOuter, { desc: "rounds the outer frame" }),
    ]);

    minis(card("visual", "fx rack",
      "Projector tricks layered over the whole picture — a little goes a long way, and they stack.",
      { group: "fx" }), [
      slider("field", "fxTrails", "trails", FIELD_SLIDERS.fxTrails, { desc: "ghost trails — old frames linger and fade" }),
      slider("field", "fxZoom", "feedback", FIELD_SLIDERS.fxZoom, { desc: "picture-in-picture tunnel, zooming forever" }),
      slider("field", "fxZoomRot", "fb spin", FIELD_SLIDERS.fxZoomRot, { desc: "twists the tunnel into a spiral" }),
      slider("field", "fxPixel", "pixelate", FIELD_SLIDERS.fxPixel, { desc: "chunky mosaic pixels" }),
      slider("field", "fxRgb", "rgb split", FIELD_SLIDERS.fxRgb, { desc: "red, green and blue slip apart, broken-projector style" }),
      slider("field", "fxWarp", "warp", FIELD_SLIDERS.fxWarp, { desc: "the picture ripples — heat haze to liquid" }),
      slider("field", "fxSlit", "slit-scan", FIELD_SLIDERS.fxSlit, { desc: "rows lag in time — motion smears like taffy" }),
      slider("field", "fxKaleido", "kaleido", FIELD_SLIDERS.fxKaleido, { desc: "kaleidoscope mirrors" }),
      slider("field", "fxKalRing", "kal rings", FIELD_SLIDERS.fxKalRing, { desc: "folds the kaleidoscope in radius too — concentric mandala bands" }),
      slider("field", "fxKalIter", "kal fold", FIELD_SLIDERS.fxKalIter, { desc: "folds the fold again — lacier, more intricate ornament" }),
      slider("field", "fxKalSpin", "kal spin", FIELD_SLIDERS.fxKalSpin, { desc: "the whole mandala slowly rotates" }),
      slider("field", "fxBloom", "bloom", FIELD_SLIDERS.fxBloom, { desc: "bright spots glow and spill" }),
      slider("field", "fxGrain", "grain", FIELD_SLIDERS.fxGrain, { desc: "film grain" }),
      slider("field", "fxCrt", "crt", FIELD_SLIDERS.fxCrt, { desc: "old TV — scanlines, curved glass, sync tears on the beat" }),
      slider("field", "fxShutter", "shutter", FIELD_SLIDERS.fxShutter, { desc: "a strobing gate chops the picture on and off" }),
      slider("field", "fxIris", "iris", FIELD_SLIDERS.fxIris, { desc: "closes the picture down to an oval, old-film style" }),
    ]);

    // Colors + frame + reset.
    const cCanvas = card("visual", "canvas",
      "The two flash colors, the page behind them, and the size of the stage.",
      { group: "canvas" });
    {
      const row = el("div", "tuner-colors");
      row.appendChild(el("span", "tuner-label", "colors"));
      const colors = [["low", "Low end of the ramp"], ["high", "High end of the ramp"], ["bg", "Page background behind the field"]].map(([key, title]) => {
        const input = el("input");
        input.type = "color";
        input.title = title;
        input.addEventListener("input", () => send({ scope: "field", type: "set", key, value: input.value }));
        onReflect(() => safeSet(input, snap.config[key]));
        row.appendChild(input);
        return input;
      });
      void colors;
      row.appendChild(button("reset", "Reset every control to the decoded-GIF defaults", () => send({ scope: "field", type: "resetAll" }), "tuner-reset"));
      cCanvas.appendChild(row);
    }
    {
      const row = el("div", "tuner-frame");
      row.appendChild(el("span", "tuner-label", "frame"));
      const wIn = el("input");
      const hIn = el("input");
      [wIn, hIn].forEach((input) => {
        input.type = "number";
        input.step = "1";
      });
      wIn.min = "160"; wIn.max = "7680"; wIn.title = "Frame width, px";
      hIn.min = "120"; hIn.max = "4320"; hIn.title = "Frame height, px";
      const push = () => send({ scope: "frame", type: "set", w: Number(wIn.value), h: Number(hIn.value) });
      wIn.addEventListener("change", push);
      hIn.addEventListener("change", push);
      row.append(wIn, el("span", "tuner-x", "×"), hIn,
        button("full width", "Snap the frame to 100% of the window width", () => send({ scope: "frame", type: "snap", mode: "fullw" })),
        button("fit screen", "Snap the frame to the window's exact size and aspect ratio", () => send({ scope: "frame", type: "snap", mode: "fit" })));
      {
        const ib = infoBtn("row:frame", "frame",
          "the stage, in pixels — any size, any aspect; scales down to fit the window");
        if (ib) row.appendChild(ib);
      }
      onReflect(() => {
        safeSet(wIn, snap.frame.w);
        safeSet(hIn, snap.frame.h);
      });
      cCanvas.appendChild(row);
    }

    // ========================================================================
    // AUDIO tab
    // ========================================================================

    // Full-width top card, like the visual tab's "looks".
    const cPlayer = card("audio", "player",
      "What's playing, and who's driving the visuals — claude's authored set or your sliders.");
    {
      const row = el("div", "tuner-pattern");
      const play = button("play", "Play / pause — same switch as the speaker on the visual page", () => send({ scope: "music", type: "player", cmd: "toggle" }));
      const stopBtn = button("stop", "Stop — pause and rewind to the top of the track", () => send({ scope: "music", type: "player", cmd: "stop" }));
      const prev = button("◀", "Previous track", () => send({ scope: "music", type: "player", cmd: "prev" }), "tuner-step");
      const sel = el("select");
      const next = button("▶", "Next track", () => send({ scope: "music", type: "player", cmd: "next" }), "tuner-step");
      const shuffleWrap = el("label", "tuner-check");
      const shuffle = el("input");
      shuffle.type = "checkbox";
      shuffleWrap.append(shuffle, document.createTextNode("shuffle"));
      const djLabel = el("label", "tuner-label", "visual dj");
      const dj = el("select");
      [["claude", "claude's set"], ["free", "free play"], ["mine", "your set"]].forEach(([v, t]) => {
        const option = el("option", null, t);
        option.value = v;
        dj.appendChild(option);
      });
      dj.title = "claude's set plays a composed light show authored for each track; free play hands the field back to your sliders";
      row.append(play, stopBtn, prev, sel, next, shuffleWrap, djLabel, dj);
      {
        const ib = infoBtn("row:player-dj", "visual dj",
          "claude's set plays a light show composed for each track — free play hands the field back to you");
        if (ib) row.appendChild(ib);
      }
      sel.addEventListener("change", () => send({ scope: "music", type: "player", cmd: "select", index: Number(sel.value) }));
      shuffle.addEventListener("change", () => send({ scope: "music", type: "player", cmd: "shuffle", value: shuffle.checked }));
      dj.addEventListener("change", () => send({ scope: "music", type: "player", cmd: "dj", value: dj.value }));
      cPlayer.appendChild(row);
      onReflect(() => {
        if (!sel.options.length || sel.options.length !== snap.music.tracks.length) {
          sel.textContent = "";
          snap.music.tracks.forEach((label, i) => {
            const option = el("option", null, label);
            option.value = String(i);
            sel.appendChild(option);
          });
        }
        safeSet(sel, String(snap.music.trackIndex));
        play.textContent = snap.music.playing ? "pause" : "play";
        shuffle.checked = !!snap.music.shuffle;
        safeSet(dj, snap.music.dj);
      });
      // Transport: playhead scrubber, time readout, listening volume.
      const transport = el("div", "tuner-transport");
      const seek = el("input");
      seek.type = "range";
      seek.min = "0";
      seek.max = "1000";
      seek.step = "1";
      seek.title = "Scrub through the track — double-click rewinds to the top";
      const time = el("output", "tuner-time", "0:00 / 0:00");
      const volLab = el("label", "tuner-label", "vol");
      const vol = el("input", "tuner-vol");
      vol.type = "range";
      vol.min = "0";
      vol.max = "1000";
      vol.step = "1";
      vol.title = "Listening volume — same knob as the speaker's hover slider. Double-click restores full";
      transport.append(seek, time, volLab, vol);
      seek.addEventListener("input", () => {
        if (snap && snap.music.duration) {
          send({ scope: "music", type: "player", cmd: "seek", value: (Number(seek.value) / 1000) * snap.music.duration });
        }
      });
      // Release focus after a scrub so the playhead resumes following playback
      // (reflect skips whichever control is focused).
      seek.addEventListener("change", () => seek.blur());
      seek.addEventListener("dblclick", () => send({ scope: "music", type: "player", cmd: "seek", value: 0 }));
      vol.addEventListener("input", () => send({ scope: "music", type: "player", cmd: "volume", value: Number(vol.value) / 1000 }));
      vol.addEventListener("dblclick", () => send({ scope: "music", type: "player", cmd: "volume", value: 1 }));
      const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
      onReflect(() => {
        const d = snap.music.duration || 0;
        safeSet(seek, d ? String(Math.round(((snap.music.time || 0) / d) * 1000)) : "0");
        time.textContent = `${fmtTime(snap.music.time || 0)} / ${fmtTime(d)}`;
        if (snap.music.volume !== undefined) safeSet(vol, String(Math.round(snap.music.volume * 1000)));
      });
      cPlayer.appendChild(transport);
    }

    const beatDot = el("span");
    beatDot.id = "lum-m-beatdot";
    minis(card("audio", "reactivity",
      "How strongly the music grips the picture, and how quickly it reacts."), [
      slider("music", "master", "react", MUSIC_SLIDERS.master, { desc: "the master grip — every mapping below scales through this" }),
      slider("music", "attack", "attack", MUSIC_SLIDERS.attack, { desc: "how fast the picture reacts when sound hits" }),
      slider("music", "release", "release", MUSIC_SLIDERS.release, { desc: "how fast it settles after" }),
      slider("music", "beatSense", "beat sense", MUSIC_SLIDERS.beatSense, { desc: "how eager the beat detector is — the dot flashes on hits", extra: beatDot }),
      slider("music", "beatDecay", "beat decay", MUSIC_SLIDERS.beatDecay, { desc: "how long each beat thump lasts" }),
      slider("music", "accentDecay", "accent decay", MUSIC_SLIDERS.accentDecay, { desc: "how long each on-the-grid pulse lasts — flash to swell" }),
    ]);

    // Mod matrix.
    const matrixHost = el("div", "tuner-matrix");
    const fmtAmt = (v) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`);
    const matrixRows = [];
    for (let i = 0; i < 6; i++) {
      const rowEl = el("div", "tuner-modrow");
      const srcSel = el("select");
      Object.keys(SRC_LABELS).forEach((s) => {
        const option = el("option", null, SRC_LABELS[s]);
        option.value = s;
        srcSel.appendChild(option);
      });
      const arrow = el("span", "tuner-modarrow", "→");
      const tgtSel = el("select");
      Object.keys(DSP.TARGETS).forEach((t) => {
        const option = el("option", null, DSP.TARGETS[t].label);
        option.value = t;
        tgtSel.appendChild(option);
      });
      const amt = el("input");
      amt.type = "range";
      amt.min = "-1000";
      amt.max = "1000";
      amt.step = "1";
      amt.title = "How hard this source pushes this knob — negative pulls it down. Double-click zeroes";
      const out = el("output");
      rowEl.append(srcSel, arrow, tgtSel, amt, out);
      matrixHost.appendChild(rowEl);
      srcSel.addEventListener("change", () => send({ scope: "music", type: "matrix", index: i, field: "src", value: srcSel.value }));
      tgtSel.addEventListener("change", () => send({ scope: "music", type: "matrix", index: i, field: "tgt", value: tgtSel.value }));
      amt.addEventListener("input", () => {
        const v = Number(amt.value) / 1000;
        out.textContent = fmtAmt(v);
        send({ scope: "music", type: "matrix", index: i, field: "amt", value: v });
      });
      amt.addEventListener("dblclick", () => send({ scope: "music", type: "matrix", index: i, field: "amt", value: 0 }));
      matrixRows.push({ srcSel, tgtSel, amt, out });
    }
    const cMatrix = card("audio", "mod matrix",
      "Patch cables: each row listens to one thing in the music and pushes one knob with it — negative pulls the knob down instead.");
    cMatrix.appendChild(matrixHost);
    onReflect(() => {
      snap.music.settings.rows.forEach((row, i) => {
        if (!matrixRows[i]) return;
        safeSet(matrixRows[i].srcSel, row.src);
        safeSet(matrixRows[i].tgtSel, row.tgt);
        safeSet(matrixRows[i].amt, String(Math.round(row.amt * 1000)));
        matrixRows[i].out.textContent = fmtAmt(row.amt);
      });
    });

    // Reactivity presets + per-track.
    const cRPresets = card("audio", "react presets",
      "Save and recall reactivity setups — separate from the visual presets.");
    {
      const row = el("div", "tuner-pattern");
      const sel = el("select");
      row.appendChild(sel);
      const save = button("save", "Save the current reactivity settings as a named preset", () => {
        const name = (prompt("Name this reactivity preset:") || "").trim();
        if (name) send({ scope: "music", type: "presetSave", name });
      });
      const del = button("delete", "Delete the selected saved reactivity preset", () => {
        const v = sel.value;
        if (v.startsWith("u:") && confirm(`Delete reactivity preset "${v.slice(2)}"?`)) {
          send({ scope: "music", type: "presetDelete", name: v.slice(2) });
        }
      });
      del.disabled = true;
      const ptWrap = el("label", "tuner-check");
      const perTrack = el("input");
      perTrack.type = "checkbox";
      ptWrap.append(perTrack, document.createTextNode("per track"));
      ptWrap.title = "Remember these reactivity settings for the current track and recall them whenever it plays";
      row.append(save, del, ptWrap);
      row.appendChild(button("reset", "Reset the audio tab — reactivity, matrix, shuffle, per-track, DJ mode — back to stock", () => send({ scope: "music", type: "resetAll" }), "tuner-reset"));
      {
        const ib = infoBtn("row:react-pertrack", "react presets",
          "per track remembers these settings for whichever song is playing");
        if (ib) row.appendChild(ib);
      }
      sel.addEventListener("change", () => {
        del.disabled = !sel.value.startsWith("u:");
        if (sel.value) send({ scope: "music", type: "preset", value: sel.value });
      });
      perTrack.addEventListener("change", () => send({ scope: "music", type: "perTrack", value: perTrack.checked }));
      // Same rebuild guard as the field presets: only rebuild when the list
      // itself changes, so streaming snapshots can't close an open dropdown.
      let listSig = "";
      onReflect(() => {
        const sig = JSON.stringify([snap.music.presets.factory.map((p) => p.id), snap.music.presets.user]);
        if (sig !== listSig) {
          listSig = sig;
          sel.textContent = "";
          const custom = el("option", null, "— custom —");
          custom.value = "";
          sel.appendChild(custom);
          const fg = el("optgroup");
          fg.label = "built in";
          snap.music.presets.factory.forEach((p) => {
            const option = el("option", null, p.label);
            option.value = `f:${p.id}`;
            fg.appendChild(option);
          });
          sel.appendChild(fg);
          if (snap.music.presets.user.length) {
            const ug = el("optgroup");
            ug.label = "yours";
            snap.music.presets.user.forEach((name) => {
              const option = el("option", null, name);
              option.value = `u:${name}`;
              ug.appendChild(option);
            });
            sel.appendChild(ug);
          }
        }
        safeSet(sel, snap.music.presets.selected || "");
        del.disabled = !(snap.music.presets.selected || "").startsWith("u:");
        perTrack.checked = !!snap.music.perTrack;
      });
      cRPresets.appendChild(row);
    }

    // --- wiring -------------------------------------------------------------

    let beatOff = 0;
    bus.onBeat(() => {
      beatDot.classList.add("on");
      clearTimeout(beatOff);
      beatOff = setTimeout(() => beatDot.classList.remove("on"), 90);
    });

    bus.onSnapshot((s) => {
      if (!s || !s.music) return; // host not fully registered yet
      snap = s;
      reflectors.forEach((fn) => fn());
    });

    // Ghost dots: the music loop streams the values it's writing (~15 Hz);
    // each slider shows a gold dot dancing where the music is pushing it.
    // Dots hide themselves when their key goes quiet (timeout in slider()).
    if (bus.onMod) {
      bus.onMod((values) => {
        if (!values) return;
        for (const k in values) {
          (ghostSubs[k] || []).forEach((fn) => fn(values[k]));
        }
      });
    }

    renderLayout();
    deckRefresh();

    let tab = "visual";
    try { tab = localStorage.getItem("lumina-tuner-tab") || "visual"; } catch (err) { /* fine */ }
    setTab(tab === "audio" ? "audio" : "visual");
    bus.requestSnapshot();
  }

  globalThis.LuminaTuner = { mount };
})();
