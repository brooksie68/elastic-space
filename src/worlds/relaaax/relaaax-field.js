// Relaaax — the oscillator field, as an embeddable renderer.
// Rebuilt from Spastic Space pork.html (2002). Timing decoded from the original
// GIFs — see assets/spastic-space/recreation-notes.md. Mounts into any container
// and fills it; all geometry scales off the container, so size and aspect ratio
// are the host's business.
//
//   const field = RelaaaxField.mount(containerEl, config);
//   field.setConfig({ speed: 2 });   // partial, live, no phase jumps
//   field.getConfig();
//   field.destroy();
(function () {
  "use strict";

  // Full white→black→white ramp in seconds. The GIFs step through 21 solid
  // frames at 0-delay; modern browsers clamp that to ~100ms/frame = 2.1s.
  // The 2002-fast reading lives on the speed control, not here.
  const RAMP = 2.1;

  // holdW / holdB: seconds held at the high / low end, decoded per GIF.
  const TIMING = {
    throb:  { holdW: 0,   holdB: 0   },  // bgthrob — free-running ramp
    throb2: { holdW: 0.5, holdB: 0   },  // bgthrob2
    throb3: { holdW: 1.0, holdB: 0   },  // bgthrob3
    throb4: { holdW: 1.5, holdB: 0   },  // bgthrob4
    throbX: { holdW: 0,   holdB: 0.5 },  // bgthrob325698741 — inverted-phase feel
    back:   { holdW: 5.0, holdB: 5.0 },  // bgthrobback — 10s breathing
  };

  // pork.html's composition: a breathing outer box, three nested boxes each
  // with its own field tempo, four bordered tiles per box.
  const LAYOUT = {
    outer: "back",
    boxes: [
      { bg: "throb",  tiles: ["throbX", "throb2", "throb3", "throb4"] },
      { bg: "throbX", tiles: ["throb3", "throb4", "throb2", "throb"] },
      { bg: "throb4", tiles: ["throb2", "throb3", "throb", "throbX"] },
    ],
  };

  // Original design space: 500-wide table, ~382 tall. --u is "one 2002 pixel"
  // in real pixels, chosen so the composition fits the host.
  const DESIGN_W = 540;
  const DESIGN_H = 420;

  const DEFAULTS = {
    speed: 1,        // global time multiplier (0 = frozen)
    holdScale: 1,    // multiplies every hold length
    desync: 0,       // 0 = original unison, 1 = full phase scatter
    ease: 0,         // 0 = linear GIF triangle, 1 = smoothstep ramps
    border: 1,       // tile border width in design px
    low: "#000000",
    high: "#ffffff",
    bg: "#333333",
  };

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Deterministic seed in [0,1) per instance index, so desync scatter is
  // stable across reloads instead of reshuffling every visit.
  function seedFor(i) {
    const x = Math.sin((i + 1) * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  // Value in [0,1] (0 = low color, 1 = high). t is already speed-scaled.
  // Segment order from t=0: ramp down from white, hold black, ramp up, hold white.
  function oscValue(spec, t, cfg, seed) {
    const holdW = spec.holdW * cfg.holdScale;
    const holdB = spec.holdB * cfg.holdScale;
    const period = RAMP + holdW + holdB;
    const half = RAMP / 2;
    let p = (t + seed * cfg.desync * period) % period;
    if (p < 0) p += period;
    let v;
    if (p < half) v = 1 - p / half;
    else if (p < half + holdB) v = 0;
    else if (p < RAMP + holdB) v = (p - half - holdB) / half;
    else v = 1;
    if (cfg.ease > 0 && v > 0 && v < 1) {
      const s = v * v * (3 - 2 * v);
      v += (s - v) * cfg.ease;
    }
    return v;
  }

  function mount(container, initial) {
    const cfg = Object.assign({}, DEFAULTS, initial || {});
    let lowRgb = hexToRgb(cfg.low);
    let highRgb = hexToRgb(cfg.high);

    const root = document.createElement("div");
    root.className = "rlx-field";

    const outer = document.createElement("div");
    outer.className = "rlx-outer";
    root.appendChild(outer);

    // Everything that oscillates: { el, spec, seed }.
    const oscillators = [];
    let seedIndex = 0;
    function register(el, cls) {
      oscillators.push({ el, spec: TIMING[cls], seed: seedFor(seedIndex++) });
    }

    register(outer, LAYOUT.outer);

    const tiles = [];
    LAYOUT.boxes.forEach((boxSpec) => {
      const box = document.createElement("div");
      box.className = "rlx-box";
      register(box, boxSpec.bg);
      boxSpec.tiles.forEach((tileCls) => {
        const cell = document.createElement("div");
        cell.className = "rlx-cell";
        const tile = document.createElement("div");
        tile.className = "rlx-tile";
        register(tile, tileCls);
        tiles.push(tile);
        cell.appendChild(tile);
        box.appendChild(cell);
      });
      outer.appendChild(box);
    });

    container.appendChild(root);

    function applyStatic() {
      lowRgb = hexToRgb(cfg.low);
      highRgb = hexToRgb(cfg.high);
      root.style.backgroundColor = cfg.bg;
      root.style.setProperty("--rlx-bw", String(cfg.border));
      const borderColor = `rgb(${highRgb[0]},${highRgb[1]},${highRgb[2]})`;
      tiles.forEach((tile) => { tile.style.borderColor = borderColor; });
    }
    applyStatic();

    function fit() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      const u = Math.min(w / DESIGN_W, h / DESIGN_H);
      root.style.setProperty("--u", `${u}px`);
    }
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();

    // The field clock advances by speed-scaled deltas rather than mapping
    // wall time directly, so changing speed never snaps the phase.
    let fieldTime = 0;
    let lastNow = performance.now();
    let rafId = 0;

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min((now - lastNow) / 1000, 0.25);
      lastNow = now;
      fieldTime += dt * cfg.speed;
      for (const osc of oscillators) {
        const v = oscValue(osc.spec, fieldTime, cfg, osc.seed);
        const r = (lowRgb[0] + (highRgb[0] - lowRgb[0]) * v) | 0;
        const g = (lowRgb[1] + (highRgb[1] - lowRgb[1]) * v) | 0;
        const b = (lowRgb[2] + (highRgb[2] - lowRgb[2]) * v) | 0;
        osc.el.style.backgroundColor = `rgb(${r},${g},${b})`;
      }
    }
    rafId = requestAnimationFrame(frame);

    return {
      el: root,
      getConfig() { return Object.assign({}, cfg); },
      setConfig(partial) {
        Object.assign(cfg, partial);
        applyStatic();
      },
      destroy() {
        cancelAnimationFrame(rafId);
        observer.disconnect();
        root.remove();
      },
    };
  }

  globalThis.RelaaaxField = { mount, DEFAULTS, TIMING, RAMP, oscValue, seedFor };
})();
