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
//
// v2 (2026-07-24, visual DJ expansion): tile shapes, alternate layouts
// (brick/hex/radial/spiral), Mondrian merges, per-tile rotate/spin/displace/
// size-pulse, waveform morphs, multi-stop palettes + hue shift, counter layer,
// nested tiles, and fx* config keys consumed by fx.js (the WebGL rack).
// The default config still renders pork 2002 verbatim on the original flex
// DOM path — positioned layouts and FX are strictly opt-in.
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
  const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // phyllotaxis angle

  const LAYOUTS = ["grid", "brick", "hex", "radial", "spiral"];
  const SHAPES = ["square", "circle", "triangle", "diamond", "hexagon",
    "chevron", "star", "cross", "bar", "slit", "ring"];
  const WAVEFORMS = ["triangle", "sine", "square", "saw"];

  // Multi-stop color ramps. "duo" is the original low→high pair (the pickers);
  // named palettes ignore low/high. Value 0 = first stop, 1 = last.
  const PALETTES = {
    duo: null,
    lava:    ["#000000", "#40080a", "#c81d0e", "#ff8c1a", "#ffe95c"],
    acid:    ["#02120a", "#0b5226", "#37f07f", "#c8ff1e", "#f6ffd0"],
    ocean:   ["#000913", "#082b4a", "#1e88b8", "#7fd4ff", "#eafcff"],
    neon:    ["#0a0014", "#5a08a8", "#ff2fd6", "#ff9de8", "#ffffff"],
    sunset:  ["#0c0016", "#5d1a5e", "#e0447c", "#ff9d5c", "#ffe8c2"],
    crt:     ["#001200", "#003b0a", "#0d8a20", "#4bff5e", "#d8ffd8"],
    rainbow: ["#4b0082", "#0000ff", "#00ff00", "#ffff00", "#ff7f00", "#ff0000"],
  };

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
    // --- v2 structure ---
    layout: "grid",     // grid | brick | hex | radial | spiral
    shape: "square",    // tile silhouette (clip-path/mask, see SHAPES)
    waveform: "triangle", // oscillator shape: triangle | sine | square | saw
    palette: "duo",     // duo (low/high pickers) or a named multi-stop ramp
    hueShift: 0,        // 0..1 → 0..360° palette hue rotation
    merge: 0,           // 0..1 Mondrian merges: share of tiles fused into 2×2 slabs
    rotate: 0,          // 0..1 static per-tile angle scatter (hash-directed)
    spin: 0,            // 0..1 continuous rotation, all tiles (1 ≈ half turn/sec)
    displace: 0,        // 0..1 lattice displacement (hash-directed, beat-kickable)
    sizePulse: 0,       // 0..1 tile scale rides its own oscillator value
    counter: 0,         // 0..1 opacity of a phase-inverted difference layer
    nest: 0,            // 0 | 1 | 2 nested counter-phased tiles inside each tile
    // --- v2 FX rack (consumed by fx.js; all 0 = rack bypassed, DOM renders) ---
    fxTrails: 0,   // echo/decay of previous frames
    fxZoom: 0,     // feedback zoom (the tunnel)
    fxZoomRot: 0,  // feedback rotation
    fxPixel: 0,    // mosaic downsample
    fxRgb: 0,      // chromatic aberration
    fxWarp: 0,     // turbulence displacement
    fxSlit: 0,     // slit-scan row time-shear
    fxKaleido: 0,  // 0 = off, else 2..12 mirror segments
    fxBloom: 0,    // bright glow
    fxGrain: 0,    // film grain
    fxCrt: 0,      // scanlines + barrel + sync tear
    fxShutter: 0,  // strobing frame gate
    fxIris: 0,     // breathing vignette
  };

  const FX_KEYS = ["fxTrails", "fxZoom", "fxZoomRot", "fxPixel", "fxRgb", "fxWarp",
    "fxSlit", "fxKaleido", "fxBloom", "fxGrain", "fxCrt", "fxShutter", "fxIris"];

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
  // Non-grid layouts feed synthetic (r, c): radial rings/spokes, spiral
  // radius/angle buckets — every pattern keeps meaning everywhere.

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

  // setConfig refresh scopes: which keys require re-fitting (designSize inputs
  // — note tileSize is NOT one, the pitch stays anchored to TILE), re-applying
  // geometry vars, colors, or re-placing positioned tiles. Everything else
  // (speed, spread, desync, holdScale, ease, waveform, per-frame transforms)
  // is picked up by the rAF free. This is what lets the music layer call
  // setConfig every frame.
  const FIT_KEYS = ["marginTop", "marginRight", "marginBottom", "marginLeft",
    "inset", "gapX", "gapY", "fill"];
  const GEO_KEYS = FIT_KEYS.concat(["tileSize", "border", "radiusTile",
    "radiusRow", "radiusOuter", "blur", "shape"]);
  const COLOR_KEYS = ["low", "high", "bg", "palette", "hueShift"];
  const PLACE_KEYS = FIT_KEYS.concat(["tileSize"]); // positioned layouts re-place

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Fast hue rotation (linear-RGB approximation matrix).
  function hueRotateRgb(rgb, deg) {
    if (!deg) return rgb;
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a), sin = Math.sin(a);
    const m = [
      0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
    ];
    const clamp = (v) => Math.max(0, Math.min(255, v));
    return [
      clamp(rgb[0] * m[0] + rgb[1] * m[1] + rgb[2] * m[2]),
      clamp(rgb[0] * m[3] + rgb[1] * m[4] + rgb[2] * m[5]),
      clamp(rgb[0] * m[6] + rgb[1] * m[7] + rgb[2] * m[8]),
    ];
  }

  // 256-entry palette LUT. "duo" lerps low→high (the original ramp exactly);
  // named palettes interpolate their stops. hueShift rotates the whole ramp.
  function buildLut(cfg) {
    const stops = (PALETTES[cfg.palette] || [cfg.low, cfg.high]).map(hexToRgb);
    const lut = new Uint8ClampedArray(256 * 3);
    const deg = (cfg.hueShift || 0) * 360;
    for (let i = 0; i < 256; i++) {
      const p = (i / 255) * (stops.length - 1);
      const s = Math.min(stops.length - 2, Math.floor(p));
      const k = p - s;
      let rgb = [
        stops[s][0] + (stops[s + 1][0] - stops[s][0]) * k,
        stops[s][1] + (stops[s + 1][1] - stops[s][1]) * k,
        stops[s][2] + (stops[s + 1][2] - stops[s][2]) * k,
      ];
      rgb = hueRotateRgb(rgb, deg);
      lut[i * 3] = rgb[0];
      lut[i * 3 + 1] = rgb[1];
      lut[i * 3 + 2] = rgb[2];
    }
    return lut;
  }

  // Value in [0,1] (0 = low color, 1 = high). t is already speed-scaled.
  // Segment order from t=0: ramp down from white, hold black, ramp up, hold white.
  // rawPhase (periods) is the pattern's offset, scaled live by cfg.spread.
  // Waveforms: triangle is the decoded GIF ramp (+holds); sine rounds it;
  // square gates it hard; saw rises over the whole period and snaps.
  function oscValue(spec, t, cfg, seed, rawPhase) {
    const holdW = spec.holdW * cfg.holdScale;
    const holdB = spec.holdB * cfg.holdScale;
    const period = RAMP + holdW + holdB;
    const half = RAMP / 2;
    const offset = ((rawPhase || 0) * (cfg.spread === undefined ? 1 : cfg.spread) + seed * cfg.desync) * period;
    let p = (t + offset) % period;
    if (p < 0) p += period;
    const wf = cfg.waveform;
    if (wf === "saw") return p / period;
    let v;
    if (p < half) v = 1 - p / half;
    else if (p < half + holdB) v = 0;
    else if (p < RAMP + holdB) v = (p - half - holdB) / half;
    else v = 1;
    if (wf === "sine") return 0.5 - 0.5 * Math.cos(v * Math.PI);
    if (wf === "square") return v >= 0.5 ? 1 : 0;
    if (cfg.ease > 0 && v > 0 && v < 1) {
      const s = v * v * (3 - 2 * v);
      v += (s - v) * cfg.ease;
    }
    return v;
  }

  // --- layout math (design space) --------------------------------------------
  // Positions of every tile center in 2002-design coordinates, plus the
  // design footprint. Used by the positioned DOM path AND the FX display list.
  function layoutTiles(cfg) {
    const R = cfg.rows, C = cfg.cols;
    const cellW = TILE + cfg.gapX, cellH = TILE + cfg.gapY;
    const tiles = [];
    let w, h;
    if (cfg.layout === "radial") {
      const rMin = cellH * 0.9;
      const maxRad = rMin + (R - 1) * cellH * 0.75;
      w = 2 * maxRad + cellW;
      h = 2 * maxRad + cellH;
      for (let r = 0; r < R; r++) {
        const rad = R > 1 ? rMin + r * cellH * 0.75 : rMin;
        for (let c = 0; c < C; c++) {
          const ang = (c / C) * Math.PI * 2 - Math.PI / 2 + (r % 2) * (Math.PI / C) * 0.5;
          tiles.push({ r, c, x: w / 2 + Math.cos(ang) * rad, y: h / 2 + Math.sin(ang) * rad, ang });
        }
      }
    } else if (cfg.layout === "spiral") {
      const n = R * C;
      const spacing = Math.max(10, cellW * 0.42);
      const maxRad = spacing * Math.sqrt(n);
      w = h = 2 * maxRad + cellW;
      for (let i = 0; i < n; i++) {
        const ang = i * GOLDEN;
        const rad = spacing * Math.sqrt(i + 0.5);
        // Synthetic (r, c) for patterns: radius bucket / angle bucket.
        const r = Math.min(R - 1, Math.floor((rad / maxRad) * R));
        const c = Math.min(C - 1, Math.floor(((ang / (Math.PI * 2)) % 1) * C));
        tiles.push({ r, c, x: w / 2 + Math.cos(ang) * rad, y: h / 2 + Math.sin(ang) * rad, ang });
      }
    } else { // brick | hex (grid handled by the flex path, but list it too for FX)
      const hexPitch = cfg.layout === "hex" ? 0.866 : 1;
      const rowH = (2 * cfg.inset + cellH) * hexPitch;
      const stagger = cfg.layout === "grid" ? 0 : 0.5;
      w = C * cellW + stagger * cellW;
      h = R * rowH + (1 - hexPitch) * cellH;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          tiles.push({
            r, c,
            x: c * cellW + cellW / 2 + (r % 2) * stagger * cellW,
            y: r * rowH + cfg.inset + cellH / 2,
            ang: 0,
          });
        }
      }
    }
    return { tiles, w, h };
  }

  function mount(container, initial) {
    const cfg = Object.assign({}, DEFAULTS, initial || {});
    let lut = buildLut(cfg);
    let lutKey = "";

    const root = document.createElement("div");
    root.className = "rlx-field";

    const outer = document.createElement("div");
    outer.className = "rlx-outer";
    root.appendChild(outer);

    // Everything that oscillates: { el, spec, seed, rawPhase, kind }.
    let oscillators = [];
    let tiles = [];   // { el, cell, r, c, osc, counterOsc?, nestOscs: [] , x, y, ang }
    let boxes = [];
    let positioned = false;
    let builtLayout = "";
    let builtNest = -1;
    let builtCounter = false;
    let mergeBucket = -1;
    let transformsActive = false;

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
        if (tile.counterOsc) {
          tile.counterOsc.spec = TIMING[spec.spec];
          tile.counterOsc.rawPhase = (spec.phase || 0) + 0.5;
        }
        tile.nestOscs.forEach((osc, i) => {
          osc.spec = TIMING[spec.spec];
          osc.rawPhase = (spec.phase || 0) + (i + 1) * 0.5;
        });
      });
    }

    function makeOsc(el, seedIndex, kind) {
      const osc = { el, spec: TIMING.throb, seed: seedFor(seedIndex), rawPhase: 0, kind };
      oscillators.push(osc);
      return osc;
    }

    function makeTileEl(tag) {
      const el = document.createElement("div");
      el.className = tag;
      return el;
    }

    // Attach counter / nest children to a tile element; register oscillators.
    function decorateTile(tile, seedRef) {
      if (cfg.counter > 0) {
        const counterEl = makeTileEl("rlx-tile rlx-counter");
        tile.el.parentElement.appendChild(counterEl);
        tile.counterEl = counterEl;
        tile.counterOsc = makeOsc(counterEl, seedRef.i++, "counter");
      }
      const levels = Math.round(cfg.nest);
      let parent = tile.el;
      for (let l = 0; l < levels; l++) {
        const nestEl = makeTileEl("rlx-nest");
        nestEl.style.inset = l === 0 ? "22%" : "30%";
        parent.appendChild(nestEl);
        tile.nestOscs.push(makeOsc(nestEl, seedRef.i++, "nest"));
        parent = nestEl;
      }
    }

    // Rebuild the grid DOM for the current rows×cols. The field clock is
    // untouched, so resizing the grid never restarts the motion.
    // Grid layout keeps the ORIGINAL flex DOM (pork 2002 verbatim); other
    // layouts position tiles absolutely from layoutTiles().
    function build() {
      outer.textContent = "";
      oscillators = [];
      tiles = [];
      boxes = [];
      builtLayout = cfg.layout;
      builtNest = Math.round(cfg.nest);
      builtCounter = cfg.counter > 0;
      mergeBucket = -1;
      positioned = cfg.layout !== "grid";
      root.dataset.layout = cfg.layout;
      const seedRef = { i: 0 };

      const outerOsc = makeOsc(outer, seedRef.i++, "outer");
      outerOsc.spec = TIMING.back;

      if (!positioned) {
        for (let r = 0; r < cfg.rows; r++) {
          const box = document.createElement("div");
          box.className = "rlx-box";
          boxes.push({ el: box, osc: makeOsc(box, seedRef.i++, "box") });
          for (let c = 0; c < cfg.cols; c++) {
            const cell = document.createElement("div");
            cell.className = "rlx-cell";
            const tileEl = makeTileEl("rlx-tile");
            const tile = { el: tileEl, cell, r, c, osc: null, nestOscs: [], x: 0, y: 0, ang: 0 };
            tile.osc = makeOsc(tileEl, seedRef.i++, "tile");
            tiles.push(tile);
            cell.appendChild(tileEl);
            decorateTile(tile, seedRef);
            box.appendChild(cell);
          }
          outer.appendChild(box);
        }
      } else {
        const placed = layoutTiles(cfg);
        for (const p of placed.tiles) {
          const cell = document.createElement("div");
          cell.className = "rlx-cell rlx-cell--free";
          const tileEl = makeTileEl("rlx-tile");
          const tile = { el: tileEl, cell, r: p.r, c: p.c, osc: null, nestOscs: [], x: p.x, y: p.y, ang: p.ang };
          tile.osc = makeOsc(tileEl, seedRef.i++, "tile");
          tiles.push(tile);
          cell.appendChild(tileEl);
          decorateTile(tile, seedRef);
          outer.appendChild(cell);
        }
        place();
      }
      applyPattern();
      applyStatic();
      applyMerge(true);
    }

    // Position absolute cells for non-grid layouts (design coords via u-vars).
    function place() {
      if (!positioned) return;
      const placed = layoutTiles(cfg);
      outer.style.setProperty("--rlx-lw", placed.w);
      outer.style.setProperty("--rlx-lh", placed.h);
      tiles.forEach((tile, i) => {
        const p = placed.tiles[i];
        if (!p) return;
        tile.x = p.x;
        tile.y = p.y;
        tile.ang = p.ang;
        tile.cell.style.left = `calc(var(--ux, 1px) * ${p.x.toFixed(2)})`;
        tile.cell.style.top = `calc(var(--uy, 1px) * ${p.y.toFixed(2)})`;
      });
    }

    // Mondrian merges: a hash-chosen share of tiles doubles to swallow its
    // right/lower neighbors. Quantized so per-frame modulation of cfg.merge
    // only re-scans when the bucket actually changes. Grid-family layouts only.
    function applyMerge(force) {
      const bucket = Math.round(Math.min(1, Math.max(0, cfg.merge)) * 24);
      if (!force && bucket === mergeBucket) return;
      mergeBucket = bucket;
      const gridFamily = cfg.layout === "grid" || cfg.layout === "brick" || cfg.layout === "hex";
      const R = cfg.rows, C = cfg.cols;
      const byRC = new Map();
      tiles.forEach((t) => byRC.set(t.r * 1000 + t.c, t));
      const swallowed = new Set();
      const merged = new Set();
      if (gridFamily && bucket > 0) {
        const share = (bucket / 24) * 0.4; // at full slider, 40% of anchors try
        for (const t of tiles) {
          if (t.r + 1 >= R || t.c + 1 >= C) continue;
          if (swallowed.has(t) || merged.has(t)) continue;
          if (hash(t.r, t.c, 77) >= share) continue;
          const others = [byRC.get(t.r * 1000 + t.c + 1), byRC.get((t.r + 1) * 1000 + t.c), byRC.get((t.r + 1) * 1000 + t.c + 1)];
          if (others.some((o) => !o || merged.has(o) || swallowed.has(o))) continue;
          merged.add(t);
          others.forEach((o) => swallowed.add(o));
        }
      }
      tiles.forEach((t) => {
        t.mergeScale = merged.has(t) ? 2 : 1;
        const hidden = swallowed.has(t);
        if (t.hidden !== hidden) {
          t.hidden = hidden;
          t.el.style.visibility = hidden ? "hidden" : "";
          if (t.counterEl) t.counterEl.style.visibility = hidden ? "hidden" : "";
        }
      });
    }

    function applyStatic() {
      const key = cfg.palette + "|" + cfg.low + "|" + cfg.high + "|" + cfg.hueShift;
      if (key !== lutKey) {
        lut = buildLut(cfg);
        lutKey = key;
      }
      root.style.backgroundColor = cfg.bg;
      const borderColor = `rgb(${lut[765]},${lut[766]},${lut[767]})`;
      tiles.forEach((tile) => { tile.el.style.borderColor = borderColor; });
    }

    // Design-space dimensions of the composition, from the current config.
    // Non-fill keeps the original slack (540×420 around a 520×376 composition)
    // so the default renders at exactly the shipped scale.
    function designSize() {
      if (cfg.layout !== "grid") {
        const placed = layoutTiles(cfg);
        return [
          cfg.marginLeft + cfg.marginRight + placed.w,
          cfg.marginTop + cfg.marginBottom + placed.h,
        ];
      }
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
      root.dataset.shape = cfg.shape;
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
    let frameHook = null; // fx.js registers; receives (displayList, fieldTime)
    let domHidden = false;

    function tileTransform(tile, v, t) {
      const parts = [];
      if (cfg.displace > 0) {
        const a = hash(tile.r, tile.c, 11) * Math.PI * 2;
        const m = cfg.displace * (TILE + Math.max(cfg.gapX, cfg.gapY)) * (0.4 + 0.6 * hash(tile.r, tile.c, 12));
        parts.push(`translate(calc(var(--ux,1px) * ${(Math.cos(a) * m).toFixed(1)}), calc(var(--uy,1px) * ${(Math.sin(a) * m).toFixed(1)}))`);
      }
      let ang = 0;
      if (cfg.rotate > 0) ang += cfg.rotate * (hash(tile.r, tile.c, 13) - 0.5) * 720;
      if (cfg.spin > 0) ang += cfg.spin * t * 180;
      if (ang) parts.push(`rotate(${ang.toFixed(1)}deg)`);
      let scale = tile.mergeScale || 1;
      if (cfg.sizePulse > 0) scale *= 1 + cfg.sizePulse * (v - 0.5) * 1.3;
      if (scale !== 1) parts.push(`scale(${scale.toFixed(3)})`);
      return parts.join(" ");
    }

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min((now - lastNow) / 1000, 0.25);
      lastNow = now;
      fieldTime += dt * cfg.speed;

      // hueShift under modulation: rebuild the LUT when it moved.
      const key = cfg.palette + "|" + cfg.low + "|" + cfg.high + "|" + cfg.hueShift;
      if (key !== lutKey) {
        lut = buildLut(cfg);
        lutKey = key;
      }
      applyMerge(false);

      const fxOn = FX_KEYS.some((k) => cfg[k] > 0);
      if (fxOn !== domHidden) {
        domHidden = fxOn;
        outer.style.visibility = fxOn ? "hidden" : "";
      }

      const wantTransforms = cfg.displace > 0 || cfg.rotate > 0 || cfg.spin > 0 || cfg.sizePulse > 0 || cfg.merge > 0;

      for (const osc of oscillators) {
        const v = oscValue(osc.spec, fieldTime, cfg, osc.seed, osc.rawPhase);
        osc.v = v;
        if (!fxOn) {
          const i = Math.max(0, Math.min(255, (v * 255) | 0)) * 3;
          osc.el.style.backgroundColor = `rgb(${lut[i]},${lut[i + 1]},${lut[i + 2]})`;
        }
      }
      if (!fxOn && (wantTransforms || transformsActive)) {
        for (const tile of tiles) {
          tile.el.style.transform = wantTransforms ? tileTransform(tile, tile.osc.v, fieldTime) : "";
        }
        transformsActive = wantTransforms;
      }
      if (fxOn && cfg.counter > 0) {
        // counter opacity still applies inside the FX display list
      } else if (cfg.counter > 0) {
        for (const tile of tiles) {
          if (tile.counterEl) tile.counterEl.style.opacity = cfg.counter;
        }
      }
      if (frameHook) frameHook(fxOn ? displayList() : null, fieldTime, dt);
    }
    rafId = requestAnimationFrame(frame);

    // --- FX display list -------------------------------------------------------
    // Everything fx.js needs to paint the frame on a canvas, in design coords.
    // Analytic (not read from the DOM), so it works for every layout.
    function displayList() {
      const [dw, dh] = designSize();
      const items = [];
      const color = (v) => {
        const i = Math.max(0, Math.min(255, (v * 255) | 0)) * 3;
        return `rgb(${lut[i]},${lut[i + 1]},${lut[i + 2]})`;
      };
      const outerOsc = oscillators[0];
      const cellW = TILE + cfg.gapX, cellH = TILE + cfg.gapY;

      // The composition box (the breathing outer): full design area in fill
      // mode, the original 20/44 slack centered otherwise.
      const compW = cfg.fill || positioned ? dw : dw - 20;
      const compH = cfg.fill || positioned ? dh : dh - 44;
      const ox = (dw - compW) / 2;
      const oy = (dh - compH) / 2;
      items.push({ x: ox + compW / 2, y: oy + compH / 2, w: compW, h: compH, rot: 0, color: color(outerOsc.v), shape: "square", radius: cfg.radiusOuter, alpha: 1, blend: "source-over" });

      if (!positioned) {
        const rowH = 2 * cfg.inset + cellH;
        const rowW = 2 * cfg.inset + cfg.cols * cellW;
        const gx = ox + cfg.marginLeft;
        const gy = oy + cfg.marginTop;
        boxes.forEach((box, r) => {
          items.push({ x: gx + rowW / 2, y: gy + r * rowH + rowH / 2, w: rowW, h: rowH, rot: 0, color: color(box.osc.v), shape: "square", radius: cfg.radiusRow, alpha: 1, blend: "source-over" });
        });
        tiles.forEach((tile) => {
          if (tile.hidden) return;
          pushTileItems(items, tile,
            gx + cfg.inset + tile.c * cellW + cellW / 2,
            gy + tile.r * rowH + cfg.inset + cellH / 2, color);
        });
      } else {
        tiles.forEach((tile) => {
          if (tile.hidden) return;
          pushTileItems(items, tile, ox + cfg.marginLeft + tile.x, oy + cfg.marginTop + tile.y, color);
        });
      }
      return { w: dw, h: dh, bg: cfg.bg, blur: cfg.blur, items, borderColor: `rgb(${lut[765]},${lut[766]},${lut[767]})` };
    }

    function pushTileItems(items, tile, cx, cy, color) {
      let scale = tile.mergeScale || 1;
      if (cfg.sizePulse > 0) scale *= 1 + cfg.sizePulse * (tile.osc.v - 0.5) * 1.3;
      let rot = 0;
      if (cfg.rotate > 0) rot += cfg.rotate * (hash(tile.r, tile.c, 13) - 0.5) * 720;
      if (cfg.spin > 0) rot += cfg.spin * fieldTime * 180;
      if (cfg.displace > 0) {
        const a = hash(tile.r, tile.c, 11) * Math.PI * 2;
        const m = cfg.displace * (TILE + Math.max(cfg.gapX, cfg.gapY)) * (0.4 + 0.6 * hash(tile.r, tile.c, 12));
        cx += Math.cos(a) * m;
        cy += Math.sin(a) * m;
      }
      const size = cfg.tileSize * scale;
      items.push({ x: cx, y: cy, w: size, h: size, rot, color: color(tile.osc.v), shape: cfg.shape, radius: cfg.radiusTile * size, alpha: 1, blend: "source-over", border: cfg.border });
      if (tile.counterOsc && cfg.counter > 0) {
        items.push({ x: cx, y: cy, w: size, h: size, rot: -rot, color: color(tile.counterOsc.v), shape: cfg.shape, radius: cfg.radiusTile * size, alpha: cfg.counter, blend: "difference" });
      }
      tile.nestOscs.forEach((osc, i) => {
        const ns = size * (i === 0 ? 0.56 : 0.3);
        items.push({ x: cx, y: cy, w: ns, h: ns, rot, color: color(osc.v), shape: cfg.shape, radius: cfg.radiusTile * ns, alpha: 1, blend: "source-over" });
      });
    }

    return {
      el: root,
      getConfig() { return Object.assign({}, cfg); },
      getDisplayList: displayList,
      setFrameHook(fn) { frameHook = fn; },
      getTime() { return fieldTime; },
      setConfig(partial) {
        const structural =
          (partial.rows !== undefined && partial.rows !== cfg.rows) ||
          (partial.cols !== undefined && partial.cols !== cfg.cols) ||
          (partial.layout !== undefined && partial.layout !== builtLayout) ||
          (partial.nest !== undefined && Math.round(partial.nest) !== builtNest) ||
          (partial.counter !== undefined && (partial.counter > 0) !== builtCounter);
        const repattern =
          (partial.pattern !== undefined && partial.pattern !== cfg.pattern) ||
          (partial.twist !== undefined && partial.twist !== cfg.twist);
        const touches = (keys) => keys.some((k) => partial[k] !== undefined);
        Object.assign(cfg, partial);
        cfg.rows = Math.max(1, Math.min(24, Math.round(cfg.rows)));
        cfg.cols = Math.max(1, Math.min(24, Math.round(cfg.cols)));
        if (structural) build(); // build() re-applies pattern + colors + merge
        else if (repattern) applyPattern();
        if (!structural && touches(COLOR_KEYS)) applyStatic();
        if (structural || touches(GEO_KEYS)) applyGeometry();
        if (!structural && positioned && touches(PLACE_KEYS)) place();
        if (structural || touches(FIT_KEYS) || (positioned && touches(PLACE_KEYS))) fit();
      },
      destroy() {
        cancelAnimationFrame(rafId);
        observer.disconnect();
        root.remove();
      },
    };
  }

  globalThis.RelaaaxField = {
    mount, DEFAULTS, TIMING, PATTERNS, RAMP, oscValue, seedFor,
    LAYOUTS, SHAPES, WAVEFORMS, PALETTES, FX_KEYS, layoutTiles, buildLut,
  };
})();
