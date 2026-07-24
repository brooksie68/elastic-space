// Relaaax — page glue: mount the field in the frame, wire the tuner.
// The renderer itself lives in relaaax-field.js and knows nothing about
// this page, the tuner, or localStorage.
(function () {
  "use strict";

  const STORE_KEY = "relaaax-tuner";
  const DEFAULTS = RelaaaxField.DEFAULTS;
  const PATTERNS = RelaaaxField.PATTERNS;
  const SPEED_MAX = 8;  // position² slider mapping: ×1 sits near a third across
  const BLUR_MAX = 300; // design px; position³ mapping keeps the low end subtle
  const TILE_MAX = 300; // design px; position² puts the stock 32 near a third across

  // marginLink is tuner UI state, not field config; it rides along in the same
  // stored JSON (the field ignores keys it doesn't know).
  let marginLink = "linked";

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      const stored = JSON.parse(raw);
      if (stored.marginLink) marginLink = stored.marginLink;
      // radiusTile changed meaning 2026-07-23 (px → fraction of tile size);
      // anything above 0.5 can only be an old px value.
      if (stored.radiusTile > 0.5) stored.radiusTile = Math.min(0.5, stored.radiusTile / 32);
      return Object.assign({}, DEFAULTS, stored);
    } catch (err) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign(field.getConfig(), { marginLink })));
    } catch (err) {
      /* storage unavailable (private mode etc.) — tuning just won't persist */
    }
  }

  const config = loadConfig();
  const frame = document.getElementById("relaaax-frame");
  const field = RelaaaxField.mount(frame, config);

  // --- staging frame size ---------------------------------------------------
  // Page-level, not field config: the frame is temporary staging, so its size
  // persists under its own key and the field just fills whatever it's given.

  const FRAME_KEY = "relaaax-frame";
  const FRAME_DEFAULTS = { w: 1024, h: 768 };
  const frameW = document.getElementById("rlx-frame-w");
  const frameH = document.getElementById("rlx-frame-h");

  function loadFrame() {
    try {
      return Object.assign({}, FRAME_DEFAULTS, JSON.parse(localStorage.getItem(FRAME_KEY)) || {});
    } catch (err) {
      return Object.assign({}, FRAME_DEFAULTS);
    }
  }

  const frameSize = loadFrame();

  function applyFrame() {
    const w = frameSize.w;
    const h = frameSize.h;
    frame.style.width = `min(${w}px, 100vw, calc(100vh * ${w} / ${h}))`;
    frame.style.aspectRatio = `${w} / ${h}`;
    frameW.value = w;
    frameH.value = h;
    try {
      localStorage.setItem(FRAME_KEY, JSON.stringify(frameSize));
    } catch (err) { /* no persistence, still applies */ }
  }
  applyFrame();

  [[frameW, "w", 160, 7680], [frameH, "h", 120, 4320]].forEach(([input, key, min, max]) => {
    input.addEventListener("change", () => {
      const n = Math.round(Number(input.value));
      if (Number.isFinite(n)) frameSize[key] = Math.min(max, Math.max(min, n));
      applyFrame();
    });
  });

  function snapFrame(w, h) {
    frameSize.w = Math.min(7680, Math.max(160, Math.round(w)));
    frameSize.h = Math.min(4320, Math.max(120, Math.round(h)));
    applyFrame();
  }

  // full width keeps the frame's current proportion; fit screen adopts the
  // window's exact size and aspect.
  document.getElementById("rlx-frame-fullw").addEventListener("click", () => {
    snapFrame(window.innerWidth, window.innerWidth * (frameSize.h / frameSize.w));
  });
  document.getElementById("rlx-frame-fit").addEventListener("click", () => {
    snapFrame(window.innerWidth, window.innerHeight);
  });

  // Console access for poking at it live.
  globalThis.relaaaxField = field;

  // --- tuner ----------------------------------------------------------------

  const toggle = document.getElementById("rlx-tuner-toggle");
  const tuner = document.getElementById("rlx-tuner");

  const pct = {
    toSlider: (v) => Math.round(v * 1000),
    fromSlider: (p) => p / 1000,
    format: (v) => `${Math.round(v * 100)}%`,
  };
  // Linear design-px mapping over [0, max] for a 0–1000 slider.
  function px(max, decimals) {
    return {
      toSlider: (v) => Math.round((v / max) * 1000),
      fromSlider: (p) => (p / 1000) * max,
      format: (v) => `${v.toFixed(decimals || 0)}px`,
    };
  }

  function control(key, id, mapping) {
    return Object.assign({
      key,
      slider: document.getElementById(id),
      readout: document.getElementById(`${id}-readout`),
    }, mapping);
  }

  const MARGIN_KEYS = ["marginTop", "marginRight", "marginBottom", "marginLeft"];

  const controls = [
    control("speed", "rlx-speed", {
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / SPEED_MAX)),
      fromSlider: (p) => SPEED_MAX * (p / 1000) * (p / 1000),
      format: (v) => (v === 0 ? "stopped" : `×${v.toFixed(2)}`),
    }),
    control("tileSize", "rlx-tilesize", {
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / TILE_MAX)),
      fromSlider: (p) => TILE_MAX * (p / 1000) * (p / 1000),
      format: (v) => `${v < 10 ? v.toFixed(1) : v.toFixed(0)}px`,
    }),
    control("blur", "rlx-blur", {
      toSlider: (v) => Math.round(1000 * Math.cbrt(v / BLUR_MAX)),
      fromSlider: (p) => BLUR_MAX * Math.pow(p / 1000, 3),
      format: (v) => (v < 0.005 ? "off" : `${v < 10 ? v.toFixed(2) : v.toFixed(0)}px`),
    }),
    control("holdScale", "rlx-holds", {
      toSlider: (v) => Math.round((v / 3) * 1000),
      fromSlider: (p) => (p / 1000) * 3,
      format: (v) => `×${v.toFixed(2)}`,
    }),
    control("desync", "rlx-desync", pct),
    control("ease", "rlx-ease", pct),
    control("border", "rlx-border", px(10, 1)),
    control("spread", "rlx-spread", {
      toSlider: (v) => Math.round((v / 2) * 1000),
      fromSlider: (p) => (p / 1000) * 2,
      format: (v) => `×${v.toFixed(2)}`,
    }),
    control("twist", "rlx-twist", pct),
    control("rows", "rlx-rows", { toSlider: (v) => v, fromSlider: (p) => p, format: String }),
    control("cols", "rlx-cols", { toSlider: (v) => v, fromSlider: (p) => p, format: String }),
    control("marginTop", "rlx-mt", px(200)),
    control("marginRight", "rlx-mr", px(200)),
    control("marginBottom", "rlx-mb", px(200)),
    control("marginLeft", "rlx-ml", px(200)),
    control("gapX", "rlx-gapx", px(200)),
    control("gapY", "rlx-gapy", px(200)),
    control("inset", "rlx-inset", px(100)),
    control("radiusTile", "rlx-rtile", {
      toSlider: (v) => Math.round((v / 0.5) * 1000),
      fromSlider: (p) => (p / 1000) * 0.5,
      format: (v) => `${Math.round(v * 100)}%`,
    }),
    control("radiusRow", "rlx-rrow", px(60)),
    control("radiusOuter", "rlx-rframe", px(120)),
  ];

  const colorLow = document.getElementById("rlx-color-low");
  const colorHigh = document.getElementById("rlx-color-high");
  const colorBg = document.getElementById("rlx-color-bg");
  const resetButton = document.getElementById("rlx-reset");
  const patternSelect = document.getElementById("rlx-pattern");
  const patternPrev = document.getElementById("rlx-pattern-prev");
  const patternNext = document.getElementById("rlx-pattern-next");
  const patternHint = document.getElementById("rlx-pattern-hint");
  const fillCheck = document.getElementById("rlx-fill");
  const marginMode = document.getElementById("rlx-margin-mode");
  const presetSelect = document.getElementById("rlx-preset");
  const presetSave = document.getElementById("rlx-preset-save");
  const presetDelete = document.getElementById("rlx-preset-delete");

  PATTERNS.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.label;
    patternSelect.appendChild(option);
  });

  // Which margins move together when one slider moves, per the link mode.
  function marginGroup(key) {
    if (marginLink === "linked") return MARGIN_KEYS;
    if (marginLink === "mirrored") {
      return key === "marginTop" || key === "marginBottom"
        ? ["marginTop", "marginBottom"]
        : ["marginLeft", "marginRight"];
    }
    return [key];
  }

  function reflect() {
    const cfg = field.getConfig();
    for (const c of controls) {
      c.slider.value = c.toSlider(cfg[c.key]);
      c.readout.textContent = c.format(cfg[c.key]);
    }
    colorLow.value = cfg.low;
    colorHigh.value = cfg.high;
    colorBg.value = cfg.bg;
    patternSelect.value = cfg.pattern;
    const pat = PATTERNS.find((p) => p.id === cfg.pattern) || PATTERNS[0];
    patternHint.textContent = pat.hint;
    fillCheck.checked = !!cfg.fill;
    marginMode.value = marginLink;
  }
  reflect();

  function apply(key, value) {
    const partial = {};
    const keys = MARGIN_KEYS.includes(key) ? marginGroup(key) : [key];
    keys.forEach((k) => { partial[k] = value; });
    field.setConfig(partial);
    presetSelect.value = ""; // any hand tweak means we're off-preset
    reflect();
    saveConfig();
  }

  for (const c of controls) {
    c.slider.addEventListener("input", () => {
      apply(c.key, c.fromSlider(Number(c.slider.value)));
    });
    // Double-click a slider to reset just that parameter.
    c.slider.addEventListener("dblclick", () => {
      apply(c.key, DEFAULTS[c.key]);
    });
  }

  [
    [colorLow, "low"],
    [colorHigh, "high"],
    [colorBg, "bg"],
  ].forEach(([input, key]) => {
    input.addEventListener("input", () => {
      apply(key, input.value);
    });
  });

  patternSelect.addEventListener("change", () => {
    apply("pattern", patternSelect.value);
  });

  [[patternPrev, -1], [patternNext, 1]].forEach(([button, dir]) => {
    button.addEventListener("click", () => {
      const i = PATTERNS.findIndex((p) => p.id === field.getConfig().pattern);
      const next = PATTERNS[(i + dir + PATTERNS.length) % PATTERNS.length];
      apply("pattern", next.id);
    });
  });

  fillCheck.addEventListener("change", () => {
    apply("fill", fillCheck.checked);
  });

  // --- presets --------------------------------------------------------------
  // Factory presets ship in presets.js (the permanent list); saved ones live
  // in localStorage until they earn a spot there.

  const PRESET_KEY = "relaaax-presets";
  const FACTORY = globalThis.RELAAAX_PRESETS || [];

  function loadUserPresets() {
    try {
      return JSON.parse(localStorage.getItem(PRESET_KEY)) || {};
    } catch (err) {
      return {};
    }
  }
  const userPresets = loadUserPresets();

  function saveUserPresets() {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(userPresets));
    } catch (err) { /* no persistence */ }
  }

  function rebuildPresetOptions(selected) {
    presetSelect.textContent = "";
    const custom = document.createElement("option");
    custom.value = "";
    custom.textContent = "— custom —";
    presetSelect.appendChild(custom);
    const factoryGroup = document.createElement("optgroup");
    factoryGroup.label = "built in";
    FACTORY.forEach((p) => {
      const option = document.createElement("option");
      option.value = `f:${p.id}`;
      option.textContent = p.label;
      factoryGroup.appendChild(option);
    });
    presetSelect.appendChild(factoryGroup);
    const names = Object.keys(userPresets).sort((a, b) => a.localeCompare(b));
    if (names.length) {
      const userGroup = document.createElement("optgroup");
      userGroup.label = "yours";
      names.forEach((name) => {
        const option = document.createElement("option");
        option.value = `u:${name}`;
        option.textContent = name;
        userGroup.appendChild(option);
      });
      presetSelect.appendChild(userGroup);
    }
    presetSelect.value = selected || "";
    presetDelete.disabled = !presetSelect.value.startsWith("u:");
  }
  rebuildPresetOptions("");

  function applyPreset(config) {
    marginLink = config.marginLink || "linked";
    field.setConfig(Object.assign({}, DEFAULTS, config));
    reflect();
    saveConfig();
  }

  presetSelect.addEventListener("change", () => {
    const v = presetSelect.value;
    presetDelete.disabled = !v.startsWith("u:");
    if (!v) return;
    if (v.startsWith("f:")) {
      const p = FACTORY.find((f) => f.id === v.slice(2));
      if (p) applyPreset(p.config);
    } else {
      const config = userPresets[v.slice(2)];
      if (config) applyPreset(config);
    }
  });

  presetSave.addEventListener("click", () => {
    const name = (prompt("Name this preset:") || "").trim();
    if (!name) return;
    if (FACTORY.some((p) => p.label.toLowerCase() === name.toLowerCase())) {
      alert("That name belongs to a built-in preset — pick another.");
      return;
    }
    userPresets[name] = Object.assign(field.getConfig(), { marginLink });
    saveUserPresets();
    rebuildPresetOptions(`u:${name}`);
  });

  presetDelete.addEventListener("click", () => {
    const v = presetSelect.value;
    if (!v.startsWith("u:")) return;
    const name = v.slice(2);
    if (!confirm(`Delete preset "${name}"?`)) return;
    delete userPresets[name];
    saveUserPresets();
    rebuildPresetOptions("");
  });

  marginMode.addEventListener("change", () => {
    marginLink = marginMode.value;
    // Linking snaps values together immediately so the mode is never lying.
    const cfg = field.getConfig();
    if (marginLink === "linked") {
      apply("marginTop", cfg.marginTop);
    } else if (marginLink === "mirrored") {
      field.setConfig({ marginBottom: cfg.marginTop, marginRight: cfg.marginLeft });
      reflect();
      saveConfig();
    } else {
      saveConfig();
    }
  });

  resetButton.addEventListener("click", () => {
    marginLink = "linked";
    field.setConfig(Object.assign({}, DEFAULTS));
    Object.assign(frameSize, FRAME_DEFAULTS);
    applyFrame();
    presetSelect.value = "";
    presetDelete.disabled = true;
    reflect();
    saveConfig();
  });

  toggle.addEventListener("click", () => {
    const open = tuner.hidden;
    tuner.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Click anywhere off the panel to close it. pointerdown, not click: a slider
  // drag released outside the panel never counts as "away", and the toggle is
  // excluded so it doesn't close-then-reopen in one press.
  document.addEventListener("pointerdown", (e) => {
    if (tuner.hidden) return;
    if (tuner.contains(e.target) || toggle.contains(e.target)) return;
    tuner.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  });
})();
