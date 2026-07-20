// Relaaax — page glue: mount the field in the frame, wire the tuner.
// The renderer itself lives in relaaax-field.js and knows nothing about
// this page, the tuner, or localStorage.
(function () {
  "use strict";

  const STORE_KEY = "relaaax-tuner";
  const DEFAULTS = RelaaaxField.DEFAULTS;
  const SPEED_MAX = 8; // position² slider mapping: ×1 sits near a third across

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (err) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(field.getConfig()));
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

  // Console access for poking at it live.
  globalThis.relaaaxField = field;

  // --- tuner ----------------------------------------------------------------

  const toggle = document.getElementById("rlx-tuner-toggle");
  const tuner = document.getElementById("rlx-tuner");

  const controls = {
    speed: {
      slider: document.getElementById("rlx-speed"),
      readout: document.getElementById("rlx-speed-readout"),
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / SPEED_MAX)),
      fromSlider: (p) => SPEED_MAX * (p / 1000) * (p / 1000),
      format: (v) => (v === 0 ? "stopped" : `×${v.toFixed(2)}`),
    },
    holdScale: {
      slider: document.getElementById("rlx-holds"),
      readout: document.getElementById("rlx-holds-readout"),
      toSlider: (v) => Math.round((v / 3) * 1000),
      fromSlider: (p) => (p / 1000) * 3,
      format: (v) => `×${v.toFixed(2)}`,
    },
    desync: {
      slider: document.getElementById("rlx-desync"),
      readout: document.getElementById("rlx-desync-readout"),
      toSlider: (v) => Math.round(v * 1000),
      fromSlider: (p) => p / 1000,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    ease: {
      slider: document.getElementById("rlx-ease"),
      readout: document.getElementById("rlx-ease-readout"),
      toSlider: (v) => Math.round(v * 1000),
      fromSlider: (p) => p / 1000,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    border: {
      slider: document.getElementById("rlx-border"),
      readout: document.getElementById("rlx-border-readout"),
      toSlider: (v) => Math.round(v * 100),
      fromSlider: (p) => p / 100,
      format: (v) => `${v.toFixed(1)}px`,
    },
  };

  const colorLow = document.getElementById("rlx-color-low");
  const colorHigh = document.getElementById("rlx-color-high");
  const colorBg = document.getElementById("rlx-color-bg");
  const resetButton = document.getElementById("rlx-reset");

  function reflect() {
    const cfg = field.getConfig();
    for (const [key, c] of Object.entries(controls)) {
      c.slider.value = c.toSlider(cfg[key]);
      c.readout.textContent = c.format(cfg[key]);
    }
    colorLow.value = cfg.low;
    colorHigh.value = cfg.high;
    colorBg.value = cfg.bg;
  }
  reflect();

  for (const [key, c] of Object.entries(controls)) {
    c.slider.addEventListener("input", () => {
      const value = c.fromSlider(Number(c.slider.value));
      field.setConfig({ [key]: value });
      c.readout.textContent = c.format(value);
      saveConfig();
    });
    // Double-click a slider to reset just that parameter.
    c.slider.addEventListener("dblclick", () => {
      field.setConfig({ [key]: DEFAULTS[key] });
      reflect();
      saveConfig();
    });
  }

  [
    [colorLow, "low"],
    [colorHigh, "high"],
    [colorBg, "bg"],
  ].forEach(([input, key]) => {
    input.addEventListener("input", () => {
      field.setConfig({ [key]: input.value });
      saveConfig();
    });
  });

  resetButton.addEventListener("click", () => {
    field.setConfig(Object.assign({}, DEFAULTS));
    Object.assign(frameSize, FRAME_DEFAULTS);
    applyFrame();
    reflect();
    saveConfig();
  });

  toggle.addEventListener("click", () => {
    const open = tuner.hidden;
    tuner.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });
})();
