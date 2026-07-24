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

  // pork.html's exact spec placement — pattern "pork 2002" tiles this matrix,
  // so at the default 3×4 grid the composition is the original, verbatim.
  const PORK_TILES = [
    ["throbX", "throb2", "throb3", "throb4"],
    ["throb3", "throb4", "throb2", "throb"],
    ["throb2", "throb3", "throb", "throbX"],
  ];
  const PORK_ROWS = ["throb", "throbX", "throb4"];
  const TEMPO = ["throb", "throb2", "throb3", "throb4"];
  const ALL_SPECS = ["throb", "throb2", "throb3", "throb4", "throbX"];

  // Base tile edge in design px — the GRID PITCH is always built from this
  // (cell = TILE + gap), while the rendered square uses cfg.tileSize. Keeping
  // the pitch anchored is what lets growing tiles close the gaps, butt up,
  // then overlap into chaos instead of pushing the grid apart.
  const TILE = 32;

  const DEFAULTS = {
    speed: 1,        // global time multiplier (0 = frozen)
    holdScale: 1,    // multiplies every hold length
    desync: 0,       // 0 = original unison, 1 = full random phase scatter
    ease: 0,         // 0 = linear GIF triangle, 1 = smoothstep ramps
    border: 1,       // tile border width in design px
    low: "#000000",
    high: "#ffffff",
    bg: "#333333",
    rows: 3,         // tile grid — 3×4 is the original composition
    cols: 4,
    tileSize: 32,    // rendered tile edge, design px — pitch stays at 32+gap,
                     // so past the gap they overlap
    pattern: "pork-2002",
    spread: 1,       // scales the pattern's phase offsets (0 collapses to unison)
    twist: 0,        // per-pattern variant knob (each pattern reads it its own way)
    blur: 0,         // gaussian blur in design px
    marginTop: 50,   // breathing outer border, per side, design px
    marginRight: 50,
    marginBottom: 50,
    marginLeft: 50,
    gapX: 68,        // space between tiles, design px (68 → the original 100px cell)
    gapY: 40,
    inset: 10,       // row background padding beyond its tiles (the old box padding)
    radiusTile: 0,   // tile corners as a fraction of tile size (0.5 = circle)
    radiusRow: 0,    // row / outer corner radii, design px
    radiusOuter: 0,
    fill: false,     // stretch the composition to fill the container (non-uniform)
  };

  // Deterministic per-tile hash in [0,1) — scatter patterns and desync stay
  // stable across reloads instead of reshuffling every visit.
  function hash(a, b, salt) {
    const x = Math.sin(a * 127.1 + b * 311.7 + (salt || 0) * 74.7 + 13.13) * 43758.5453;
    return x - Math.floor(x);
  }

  // Unchanged from the first build so a saved desync setting scatters the
  // same way it always has.
  function seedFor(i) {
    const x = Math.sin((i + 1) * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  // --- patterns --------------------------------------------------------------
  // A pattern assigns each tile a timing spec and a phase offset (in periods of
  // its own oscillator). Phase is scaled by cfg.spread at runtime, so tweaking
  // spread never rebuilds anything. tw is cfg.twist in [0,1].
  // tile(r, c, R, C, tw) -> { spec, phase }; row(r, R, C, tw) optional.

  function norms(r, c, R, C) {
    return [C > 1 ? c / (C - 1) : 0.5, R > 1 ? r / (R - 1) : 0.5];
  }

  let spiralCache = { key: "", map: null };
  function spiralMap(R, C) {
    const key = R + "x" + C;
    if (spiralCache.key === key) return spiralCache.map;
    const m = Array.from({ length: R }, () => Array(C).fill(0));
    let top = 0, bot = R - 1, left = 0, right = C - 1, i = 0;
    const total = R * C;
    while (top <= bot && left <= right) {
      for (let c = left; c <= right; c++) m[top][c] = i++ / total;
      top++;
      for (let r = top; r <= bot; r++) m[r][right] = i++ / total;
      right--;
      if (top <= bot) { for (let c = right; c >= left; c--) m[bot][c] = i++ / total; bot--; }
      if (left <= right) { for (let r = bot; r >= top; r--) m[r][left] = i++ / total; left++; }
    }
    spiralCache = { key, map: m };
    return m;
  }

  const PATTERNS = [
    {
      id: "pork-2002", label: "pork 2002",
      hint: "the original — every tile on its decoded GIF clock; twist does nothing",
      tile: (r, c) => ({ spec: PORK_TILES[r % 3][c % 4], phase: 0 }),
      row: (r) => ({ spec: PORK_ROWS[r % 3], phase: 0 }),
    },
    {
      id: "unison", label: "unison",
      hint: "everything pulses together on the plain ramp; twist does nothing",
      tile: () => ({ spec: "throb", phase: 0 }),
    },
    {
      id: "sweep-right", label: "sweep right",
      hint: "wave travels left to right; twist shears it diagonal",
      tile: (r, c, R, C, tw) => { const [cn, rn] = norms(r, c, R, C); return { spec: "throb", phase: cn + rn * tw }; },
    },
    {
      id: "sweep-down", label: "sweep down",
      hint: "wave travels top to bottom; twist shears it diagonal",
      tile: (r, c, R, C, tw) => { const [cn, rn] = norms(r, c, R, C); return { spec: "throb", phase: rn + cn * tw }; },
    },
    {
      id: "diagonal", label: "diagonal",
      hint: "wave rolls corner to corner; twist leans it more row-wise",
      tile: (r, c, R, C, tw) => { const [cn, rn] = norms(r, c, R, C); return { spec: "throb", phase: cn * (1 - tw * 0.8) + rn * (1 + tw * 0.8) / 2 }; },
    },
    {
      id: "anti-diagonal", label: "anti-diagonal",
      hint: "the other corner-to-corner roll; twist leans it row-wise",
      tile: (r, c, R, C, tw) => { const [cn, rn] = norms(r, c, R, C); return { spec: "throb", phase: cn * (1 - tw * 0.8) + (1 - rn) * (1 + tw * 0.8) / 2 }; },
    },
    {
      id: "ripple", label: "ripple",
      hint: "rings expand from the middle; twist drags the center to a corner",
      tile: (r, c, R, C, tw) => {
        const [cn, rn] = norms(r, c, R, C);
        const cx = 0.5 - tw * 0.5, cy = 0.5 - tw * 0.5;
        const maxD = Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy)) || 1;
        return { spec: "throb", phase: Math.hypot(cn - cx, rn - cy) / maxD };
      },
    },
    {
      id: "rings", label: "rings",
      hint: "concentric square rings; twist morphs them into diamonds",
      tile: (r, c, R, C, tw) => {
        const [cn, rn] = norms(r, c, R, C);
        const dx = Math.abs(cn - 0.5), dy = Math.abs(rn - 0.5);
        const cheb = Math.max(dx, dy) * 2, manh = dx + dy;
        return { spec: "throb", phase: cheb * (1 - tw) + manh * tw };
      },
    },
    {
      id: "pinwheel", label: "pinwheel",
      hint: "phase sweeps around the center; twist swirls it into a spiral arm",
      tile: (r, c, R, C, tw) => {
        const [cn, rn] = norms(r, c, R, C);
        const ang = Math.atan2(rn - 0.5, cn - 0.5) / (Math.PI * 2) + 0.5;
        return { spec: "throb", phase: ang + Math.hypot(cn - 0.5, rn - 0.5) * tw * 2 };
      },
    },
    {
      id: "checkerboard", label: "checkerboard",
      hint: "alternate tiles counter-pulse; twist pulls the two beats closer",
      tile: (r, c, R, C, tw) => ({ spec: "throb", phase: ((r + c) % 2) * (0.5 - 0.35 * tw) }),
    },
    {
      id: "quarters", label: "quarters",
      hint: "blocks cycle four beats; twist grows the block size",
      tile: (r, c, R, C, tw) => {
        const b = 1 + Math.floor(tw * 3);
        return { spec: "throb", phase: ((Math.floor(r / b) % 2) * 2 + (Math.floor(c / b) % 2)) / 4 };
      },
    },
    {
      id: "columns-alt", label: "columns a/b",
      hint: "alternating column stripes; twist widens the stripes",
      tile: (r, c, R, C, tw) => {
        const w = 1 + Math.floor(tw * 3);
        return { spec: "throb", phase: (Math.floor(c / w) % 2) * 0.5 };
      },
    },
    {
      id: "rows-alt", label: "rows a/b",
      hint: "alternating row stripes; twist widens the stripes",
      tile: (r, c, R, C, tw) => {
        const w = 1 + Math.floor(tw * 3);
        return { spec: "throb", phase: (Math.floor(r / w) % 2) * 0.5 };
      },
    },
    {
      id: "bounce-x", label: "bounce ↔",
      hint: "phase peaks mid-row and falls to the edges; twist slides the peak",
      tile: (r, c, R, C, tw) => {
        const [cn] = norms(r, c, R, C);
        const c0 = 0.5 - 0.4 * tw;
        return { spec: "throb", phase: 1 - Math.abs(cn - c0) / Math.max(c0, 1 - c0) };
      },
    },
    {
      id: "bounce-y", label: "bounce ↕",
      hint: "phase peaks mid-column and falls to the edges; twist slides the peak",
      tile: (r, c, R, C, tw) => {
        const [, rn] = norms(r, c, R, C);
        const r0 = 0.5 - 0.4 * tw;
        return { spec: "throb", phase: 1 - Math.abs(rn - r0) / Math.max(r0, 1 - r0) };
      },
    },
    {
      id: "snake", label: "snake",
      hint: "phase runs the grid in reading-order serpentine; twist compresses the run",
      tile: (r, c, R, C, tw) => {
        const idx = r * C + (r % 2 ? C - 1 - c : c);
        return { spec: "throb", phase: (idx / (R * C)) * (1 - tw * 0.7) };
      },
    },
    {
      id: "spiral", label: "spiral",
      hint: "phase coils from the rim to the middle; twist compresses the coil",
      tile: (r, c, R, C, tw) => ({ spec: "throb", phase: spiralMap(R, C)[r][c] * (1 - tw * 0.7) }),
    },
    {
      id: "scatter", label: "scatter",
      hint: "every tile on its own random beat; twist reshuffles the deal",
      tile: (r, c, R, C, tw) => ({ spec: "throb", phase: hash(r, c, Math.floor(tw * 9)) }),
    },
    {
      id: "sparkle", label: "sparkle",
      hint: "random beats AND random tempos — shimmer; twist reshuffles",
      tile: (r, c, R, C, tw) => {
        const salt = Math.floor(tw * 9);
        return {
          spec: ALL_SPECS[Math.floor(hash(c, r, 7 + salt) * ALL_SPECS.length)],
          phase: hash(r, c, 50 + salt),
        };
      },
    },
    {
      id: "tempo-rows", label: "tempo rows",
      hint: "each row runs a different decoded tempo; twist staggers the columns",
      tile: (r, c, R, C, tw) => ({ spec: TEMPO[r % 4], phase: (C > 1 ? c / (C - 1) : 0) * tw }),
      row: (r) => ({ spec: TEMPO[r % 4], phase: 0 }),
    },
    {
      id: "tempo-cols", label: "tempo columns",
      hint: "each column runs a different decoded tempo; twist staggers the rows",
      tile: (r, c, R, C, tw) => ({ spec: TEMPO[c % 4], phase: (R > 1 ? r / (R - 1) : 0) * tw }),
    },
    {
      id: "x-cross", label: "x-cross",
      hint: "an X of early phase over late corners; twist morphs the X into a +",
      tile: (r, c, R, C, tw) => {
        const [cn, rn] = norms(r, c, R, C);
        const dDiag = Math.min(Math.abs(rn - cn), Math.abs(rn + cn - 1)) / 0.5;
        const dAxes = Math.min(Math.abs(rn - 0.5), Math.abs(cn - 0.5)) / 0.5;
        return { spec: "throb", phase: Math.min(1, dDiag * (1 - tw) + dAxes * tw) };
      },
    },
    {
      id: "drops", label: "drops",
      hint: "ripples spread from three random points; twist re-rolls the points",
      tile: (r, c, R, C, tw) => {
        const [cn, rn] = norms(r, c, R, C);
        const salt = Math.floor(tw * 9);
        let d = Infinity;
        for (let i = 0; i < 3; i++) {
          d = Math.min(d, Math.hypot(cn - hash(i, 1, salt), rn - hash(i, 2, salt)));
        }
        return { spec: "throb", phase: Math.min(1, d / 0.7) };
      },
    },
    {
      id: "edges", label: "edges in",
      hint: "the rim leads and the middle lags, frame by frame; twist does nothing",
      tile: (r, c, R, C) => {
        const ring = Math.min(r, c, R - 1 - r, C - 1 - c);
        const maxRing = Math.max(1, Math.floor((Math.min(R, C) - 1) / 2));
        return { spec: "throb", phase: Math.min(1, ring / maxRing) };
      },
    },
  ];

  const PATTERN_BY_ID = {};
  PATTERNS.forEach((p) => { PATTERN_BY_ID[p.id] = p; });

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Value in [0,1] (0 = low color, 1 = high). t is already speed-scaled.
  // Segment order from t=0: ramp down from white, hold black, ramp up, hold white.
  // rawPhase (periods) is the pattern's offset, scaled live by cfg.spread.
  function oscValue(spec, t, cfg, seed, rawPhase) {
    const holdW = spec.holdW * cfg.holdScale;
    const holdB = spec.holdB * cfg.holdScale;
    const period = RAMP + holdW + holdB;
    const half = RAMP / 2;
    const offset = ((rawPhase || 0) * (cfg.spread === undefined ? 1 : cfg.spread) + seed * cfg.desync) * period;
    let p = (t + offset) % period;
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

    // Everything that oscillates: { el, spec, seed, rawPhase }.
    let oscillators = [];
    let tiles = [];
    let boxes = [];

    function currentPattern() {
      return PATTERN_BY_ID[cfg.pattern] || PATTERNS[0];
    }

    // Reassign specs and phase offsets without touching the DOM — pattern and
    // twist changes stay cheap and never interrupt the clock.
    function applyPattern() {
      const pat = currentPattern();
      const R = cfg.rows, C = cfg.cols, tw = cfg.twist;
      const mid = Math.floor((C - 1) / 2);
      boxes.forEach((box, r) => {
        const spec = pat.row ? pat.row(r, R, C, tw) : { spec: "throb", phase: pat.tile(r, mid, R, C, tw).phase };
        box.osc.spec = TIMING[spec.spec];
        box.osc.rawPhase = spec.phase || 0;
      });
      tiles.forEach((tile) => {
        const spec = pat.tile(tile.r, tile.c, R, C, tw);
        tile.osc.spec = TIMING[spec.spec];
        tile.osc.rawPhase = spec.phase || 0;
      });
    }

    // Rebuild the grid DOM for the current rows×cols. The field clock is
    // untouched, so resizing the grid never restarts the motion.
    function build() {
      outer.textContent = "";
      oscillators = [];
      tiles = [];
      boxes = [];
      let seedIndex = 0;
      function register(el) {
        const osc = { el, spec: TIMING.throb, seed: seedFor(seedIndex++), rawPhase: 0 };
        oscillators.push(osc);
        return osc;
      }

      const outerOsc = register(outer);
      outerOsc.spec = TIMING.back;

      for (let r = 0; r < cfg.rows; r++) {
        const box = document.createElement("div");
        box.className = "rlx-box";
        boxes.push({ el: box, osc: register(box) });
        for (let c = 0; c < cfg.cols; c++) {
          const cell = document.createElement("div");
          cell.className = "rlx-cell";
          const tile = document.createElement("div");
          tile.className = "rlx-tile";
          tiles.push({ el: tile, r, c, osc: register(tile) });
          cell.appendChild(tile);
          box.appendChild(cell);
        }
        outer.appendChild(box);
      }
      applyPattern();
      applyStatic();
    }

    function applyStatic() {
      lowRgb = hexToRgb(cfg.low);
      highRgb = hexToRgb(cfg.high);
      root.style.backgroundColor = cfg.bg;
      const borderColor = `rgb(${highRgb[0]},${highRgb[1]},${highRgb[2]})`;
      tiles.forEach((tile) => { tile.el.style.borderColor = borderColor; });
    }

    // Design-space dimensions of the composition, from the current config.
    // Non-fill keeps the original slack (540×420 around a 520×376 composition)
    // so the default renders at exactly the shipped scale.
    function designSize() {
      const contentW = cfg.marginLeft + cfg.marginRight + 2 * cfg.inset + cfg.cols * (TILE + cfg.gapX);
      const contentH = cfg.marginTop + cfg.marginBottom + cfg.rows * (2 * cfg.inset + TILE + cfg.gapY);
      if (cfg.fill) return [contentW, contentH];
      return [contentW + 20, contentH + 44];
    }

    // Geometry knobs land as unitless vars on the root; world.css multiplies
    // them by --ux/--uy/--umin so everything keeps scaling off the container.
    function applyGeometry() {
      const s = root.style;
      s.setProperty("--rlx-mt", cfg.marginTop);
      s.setProperty("--rlx-mr", cfg.marginRight);
      s.setProperty("--rlx-mb", cfg.marginBottom);
      s.setProperty("--rlx-ml", cfg.marginLeft);
      s.setProperty("--rlx-inset", cfg.inset);
      s.setProperty("--rlx-cellw", TILE + cfg.gapX);
      s.setProperty("--rlx-cellh", TILE + cfg.gapY);
      s.setProperty("--rlx-tile", cfg.tileSize);
      s.setProperty("--rlx-bw", cfg.border);
      s.setProperty("--rlx-r-tile", cfg.radiusTile);
      s.setProperty("--rlx-r-row", cfg.radiusRow);
      s.setProperty("--rlx-r-outer", cfg.radiusOuter);
      outer.style.filter = cfg.blur > 0 ? `blur(calc(var(--umin, 1px) * ${cfg.blur}))` : "none";
    }

    function fit() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      const [dw, dh] = designSize();
      let ux, uy;
      if (cfg.fill) {
        ux = w / dw;
        uy = h / dh;
      } else {
        ux = uy = Math.min(w / dw, h / dh);
      }
      root.style.setProperty("--ux", `${ux}px`);
      root.style.setProperty("--uy", `${uy}px`);
      root.style.setProperty("--umin", `${Math.min(ux, uy)}px`);
    }
    const observer = new ResizeObserver(fit);
    observer.observe(container);

    build();
    applyGeometry();
    container.appendChild(root);
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
        const v = oscValue(osc.spec, fieldTime, cfg, osc.seed, osc.rawPhase);
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
        const structural =
          (partial.rows !== undefined && partial.rows !== cfg.rows) ||
          (partial.cols !== undefined && partial.cols !== cfg.cols);
        const repattern =
          (partial.pattern !== undefined && partial.pattern !== cfg.pattern) ||
          (partial.twist !== undefined && partial.twist !== cfg.twist);
        Object.assign(cfg, partial);
        cfg.rows = Math.max(1, Math.min(24, Math.round(cfg.rows)));
        cfg.cols = Math.max(1, Math.min(24, Math.round(cfg.cols)));
        if (structural) build();
        else if (repattern) applyPattern();
        applyStatic();
        applyGeometry();
        fit();
      },
      destroy() {
        cancelAnimationFrame(rafId);
        observer.disconnect();
        root.remove();
      },
    };
  }

  globalThis.RelaaaxField = { mount, DEFAULTS, TIMING, PATTERNS, RAMP, oscValue, seedFor };
})();
