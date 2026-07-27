// Lumina — Claude's visual DJ sets. v6 2026-07-26, rebuilt on James's brief:
// "more composition in the variety — one setting for 4 beats, then another,
// then the 1st one again but varied; when there's a breakdown or a big
// rhythmic shift, PUNCH it to a new look."
//
// WHAT CHANGED ARCHITECTURALLY
// ----------------------------
// Sets are no longer a flat list of hand-timed parameter blobs. Each track
// now has:
//   1. a LOOK VOCABULARY — a handful of complete, named states (A, B, C…).
//      This is the creative part: each look is a whole identity.
//   2. VARIATIONS — operators that bend a look without destroying it, so a
//      return to A reads as "A again, but different" rather than a new thing.
//   3. a SCORE in BARS, not seconds. Call-and-response phrases (A B A' B'),
//      returns with variation, and NEW looks reserved for the moments the
//      analyzer actually found: drops, break-returns, groove changes, builds.
//
// Times are computed from the measured grid (assets/track-grid.js) at load,
// so if the analyzer re-measures a track the whole set re-times itself. The
// old sets were authored in seconds against a WRONG tempo (Angular was read
// as 76 BPM when it is 115 — James caught it by ear) and every event sat off
// the beat; authoring in bars makes that class of error impossible.
//
// Beat sync: looks set `accent` (which sixteenths the grid-locked pulse fires
// on) and `syncBeats` (one flash cycle = N beats exactly), and their matrices
// wire the lag-free clock sources — pulse / bar / phrase / swing — straight
// at the visuals. See music-dsp.js CLOCK_SOURCES.
(function () {
  "use strict";

  const D = globalThis.LuminaField.DEFAULTS;
  const GRID = globalThis.LUMINA_TRACK_GRID || {};
  const R = (src, tgt, amt) => ({ src, tgt, amt });
  const OFF = R("off", "ease", 0);

  // --- variation operators ---------------------------------------------------
  // Each takes a look's config and returns a PARTIAL that bends it. They must
  // keep the look recognizable — this is "the same idea, said differently".
  const VARY = {
    none: () => ({}),
    // Flip the ramp: the same structure, inverted tonality.
    invert: (c) => ({ low: c.high, high: c.low, palette: "duo" }),
    // Rotate the colour wheel a third of the way round.
    hue: (c) => ({ hueShift: (c.hueShift + 0.33) % 1, sceneHue: (c.sceneHue + 0.28) % 1 }),
    // Same geometry, different silhouette + a static angle scatter.
    shape: (c) => ({
      shape: c.shape === "square" ? "diamond" : c.shape === "circle" ? "star" : "circle",
      rotate: c.rotate > 0.3 ? 0 : 0.55,
    }),
    // Double-time the flashing and open the mirror.
    fast: (c) => ({ syncBeats: c.syncBeats >= 2 ? c.syncBeats / 2 : 1, fxKaleido: 0.85 }),
    // Half-time, softer, wider.
    slow: (c) => ({ syncBeats: (c.syncBeats || 2) * 2, spread: Math.min(2, c.spread + 0.7), ease: 1 }),
    // Push the tiles back and let the scene carry it.
    scene: (c) => ({ sceneTiles: 0.15, sceneMix: 1, sceneDrive: Math.min(1, c.sceneDrive + 0.35), sceneWarp: Math.min(1, c.sceneWarp + 0.4) }),
    // Pull the scene back and let the lattice carry it — at slab scale.
    tiles: (c) => ({ sceneTiles: 1, sceneMix: 0.25, tileSize: Math.min(300, Math.max(200, c.tileSize * 1.8)), merge: 0.95 }),
    // Blow the geometry apart without touching colour.
    burst: (c) => ({ displace: 0.95, desync: 0.95, sizePulse: 0.85, spread: Math.min(2, c.spread + 0.6) }),
    // Everything at once — the "almost break it" operator.
    blast: (c) => ({ blur: 95, fxShutter: 0.8, counter: 0.95, merge: 0.95, speed: Math.min(8, Math.max(4.6, c.speed * 3)) }),
    // Squeeze it: tiny, tight, fast.
    tight: (c) => ({ tileSize: Math.max(6, c.tileSize * 0.35), spread: 0.25, blur: 0 }),
    // Accent swap — same look, different rhythm of flashing.
    offbeat: () => ({ accent: "offbeat" }),
    gallop: () => ({ accent: "gallop" }),
    stutter: () => ({ accent: "stutter" }),
  };

  // Build the event list for one track from a look vocabulary + a bar score.
  //   score entry: [bar, lookName, varyName?, extraPartial?, reactOverride?]
  // The first entry MUST be at bar 1 and supplies the complete base.
  function build(file, looks, score) {
    const grid = GRID[file];
    const barTime = (bar) => (grid
      ? +(grid.firstDownbeat + (bar - 1) * grid.barLen).toFixed(3)
      : (bar - 1) * 2);
    const events = [];
    for (let i = 0; i < score.length; i++) {
      const [bar, lookName, varyName, extra, reactOver] = score[i];
      const look = looks[lookName];
      if (!look) continue;
      const cfg = Object.assign({}, look.base);
      const vary = VARY[varyName || "none"] || VARY.none;
      const bent = vary(cfg);
      // The set must cover the track from the very first sample, so the
      // opening look starts at 0 even though bar 1 begins a moment later.
      const at = i === 0 ? 0 : barTime(bar);
      if (at > (grid ? grid.duration : Infinity)) continue;
      const base = i === 0
        ? Object.assign({}, D, cfg, bent, extra || {})   // opener: complete state
        : Object.assign({}, cfg, bent, extra || {});
      const react = reactOver || look.react;
      const ev = { at, label: `b${bar} ${lookName}${varyName && varyName !== "none" ? "/" + varyName : ""}`, base };
      if (react) ev.react = react;
      if (extra && extra.__ramp) {
        ev.ramp = extra.__ramp;
        delete base.__ramp;
      }
      events.push(ev);
    }
    events.sort((a, b) => a.at - b.at);
    return { events };
  }

  // Expand a call-and-response phrase: alternate looks every `every` bars from
  // `from` up to (not including) `to`, cycling the variation list so each
  // return is a variation rather than a repeat. This is the "A B A' B'" shape.
  function call(from, to, every, pairs, varies) {
    const out = [];
    let i = 0;
    for (let bar = from; bar < to; bar += every, i++) {
      const [name, extra] = pairs[i % pairs.length];
      const v = varies ? varies[Math.floor(i / pairs.length) % varies.length] : "none";
      out.push([bar, name, i < pairs.length ? "none" : v, extra]);
    }
    return out;
  }

  // ==========================================================================
  // ANGULAR RITUAL — 115 BPM (James's ear), bar 2.087s, 99 bars, phrase 8.
  // Punches: b2/b6 break-returns, b10 build, b12 drop, b37 drop, b45 drop,
  // b53 groove change, b59 break-return, b62 build, b78 break-return, b86 drop.
  // Four identities: the ember temple (A), the bone lattice (B), the flame
  // rite (C), the white room (D). A and B trade every two bars; C and D are
  // reserved for the punches.
  // ==========================================================================
  const ANGULAR_LOOKS = {
    A: { // ember temple — ridge scene breathing under a slow ring lattice
      base: {
        rows: 5, cols: 5, tileSize: 18, gapX: 30, gapY: 30,
        speed: 0.5, holdScale: 1.2, desync: 0.05, ease: 0.55, border: 0.5,
        low: "#000000", high: "#4a0d0a", bg: "#000000", palette: "duo",
        layout: "grid", shape: "square", waveform: "triangle",
        pattern: "rings", spread: 0.8, blur: 6, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0, merge: 0, counter: 0, nest: 0,
        fill: false, radiusTile: 0, fxBloom: 0.2, fxIris: 0.25, fxGrain: 0.15,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "ridge", scenePalette: "lava", sceneMix: 0.75, sceneTiles: 0.6,
        sceneSpeed: 0.45, sceneScale: 0.4, sceneDrive: 0.35, sceneWarp: 0.5,
        sceneGenome: "amber globe", accent: "four", syncBeats: 4,
      },
      react: { master: 1.0, attack: 0.02, release: 0.25, beatSense: 0.65, beatDecay: 0.3, accentDecay: 0.14,
        rows: [R("pulse", "tileSize", 0.5), R("pulse", "fxBloom", 0.35), R("bar", "sceneHue", 0.15),
          R("bass", "sceneDrive", 0.35), R("phrase", "spread", 0.3), OFF] },
    },
    B: { // bone lattice — tiles forward, hard edges, crt bite
      base: {
        rows: 9, cols: 9, tileSize: 40, gapX: 14, gapY: 14,
        speed: 1, holdScale: 0, desync: 0.15, ease: 0, border: 1,
        low: "#0a0603", high: "#e8d9b8", bg: "#050302", palette: "duo",
        layout: "brick", shape: "cross", waveform: "square",
        pattern: "checkerboard", spread: 1.1, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.3, merge: 0.3, counter: 0, nest: 0,
        fill: true, radiusTile: 0, fxBloom: 0.15, fxIris: 0, fxGrain: 0.25,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0.2, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0.45,
        scene: "none", scenePalette: "crt", sceneMix: 0.3, sceneTiles: 1,
        sceneSpeed: 0.8, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
        sceneGenome: "amber globe", accent: "backbeat", syncBeats: 2,
      },
      react: { master: 1.2, attack: 0.015, release: 0.14, beatSense: 0.75, beatDecay: 0.18, accentDecay: 0.09,
        rows: [R("pulse", "tileSize", 0.8), R("pulse", "fxRgb", 0.5), R("swing", "twist", 0.4),
          R("bar", "merge", -0.3), R("beat", "displace", 0.35), R("high", "desync", 0.3)] },
    },
    C: { // the flame rite — the scene takes the whole frame
      base: {
        rows: 7, cols: 7, tileSize: 52, gapX: 30, gapY: 30,
        speed: 1.6, holdScale: 0.4, desync: 0.2, ease: 0.2, border: 1.2,
        low: "#000000", high: "#ff2f10", bg: "#0a0101", palette: "lava",
        layout: "grid", shape: "diamond", waveform: "triangle",
        pattern: "x-cross", spread: 1.2, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.4, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0, fxBloom: 0.35, fxIris: 0, fxGrain: 0.2,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0.3, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "flame", scenePalette: "genome", sceneGenome: "gold phoenix",
        sceneMix: 1, sceneTiles: 0.3, sceneSpeed: 1, sceneScale: 0.55,
        sceneDrive: 0.75, sceneWarp: 0.4, accent: "four", syncBeats: 1,
      },
      react: { master: 1.5, attack: 0.012, release: 0.12, beatSense: 0.8, beatDecay: 0.16, accentDecay: 0.1,
        rows: [R("pulse", "sceneDrive", 0.7), R("pulse", "tileSize", 0.7), R("pulse", "fxBloom", 0.5),
          R("bar", "sceneHue", 0.25), R("bass", "sceneWarp", 0.4), R("phrase", "sceneScale", 0.3)] },
    },
    D: { // the white room — everything inverted, scene cut dead
      base: {
        rows: 6, cols: 6, tileSize: 96, gapX: 40, gapY: 40,
        speed: 1.4, holdScale: 0.5, desync: 0, ease: 0, border: 0,
        low: "#ffffff", high: "#0a0a0a", bg: "#efe7da", palette: "duo",
        layout: "grid", shape: "circle", waveform: "square",
        pattern: "quarters", spread: 0.9, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0.5, fxBloom: 0.2, fxIris: 0, fxGrain: 0,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0.35, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "none", scenePalette: "duo", sceneMix: 1, sceneTiles: 1,
        sceneSpeed: 1, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
        sceneGenome: "amber globe", accent: "downbeat", syncBeats: 1,
      },
      react: { master: 1.6, attack: 0.01, release: 0.1, beatSense: 0.85, beatDecay: 0.12, accentDecay: 0.07,
        rows: [R("pulse", "tileSize", 1), R("pulse", "blur", 0.6), R("pulse", "fxPixel", 0.5),
          R("swing", "twist", 0.5), R("bar", "spread", -0.4), R("beat", "displace", 0.5)] },
    },
  };

  const ANGULAR_SCORE = [
    [1, "A"],                                   // state the theme
    ...call(3, 12, 2, [["B"], ["A"]], ["hue", "shape", "offbeat"]),
    [12, "C"],                                  // PUNCH — measured drop
    ...call(14, 22, 2, [["A", { sceneTiles: 0.35 }], ["C"]], ["hue", "fast"]),
    [22, "B", "invert"],
    ...call(24, 37, 2, [["A"], ["B"]], ["gallop", "hue", "tight"]),
    [37, "C", "burst"],                         // PUNCH — drop
    ...call(39, 45, 2, [["B", { fxCrt: 0.7 }], ["C"]], ["stutter"]),
    [45, "D", "blast"],                         // PUNCH — drop into the white room
    [47, "D", "hue"],
    [49, "B", "tight"],
    [51, "A", "scene", { scene: "nebula", scenePalette: "neon", sceneSpeed: 1.4 }],
    [53, "C", "shape"],                         // PUNCH — groove change
    ...call(55, 59, 2, [["A"], ["B"]], ["offbeat"]),
    [59, "D", "invert"],                        // PUNCH — break returns
    [61, "B", "fast"],
    [62, "C"],                                  // PUNCH — build
    ...call(64, 78, 2, [["A", { sceneGenome: "ember cathedral" }], ["C", { sceneGenome: "violet veil" }]], ["hue", "burst", "slow"]),
    [78, "B", "burst"],                         // PUNCH — break returns
    ...call(80, 86, 2, [["A"], ["B"]], ["stutter"]),
    [86, "C", "fast"],                          // PUNCH — final drop
    [88, "D"],
    [90, "C", "scene", { sceneGenome: "firebird" }],
    [92, "A", "hue"],
    [94, "A", "slow", { __ramp: 4, fxTrails: 0.6, sceneMix: 0.4 }],
    [97, "A", "none", { __ramp: 4, speed: 0.25, blur: 60, fxIris: 0.95, sceneMix: 0, low: "#000000", high: "#000000", palette: "duo" }],
  ];

  // ==========================================================================
  // JUNGLE MOOG RITUAL — 129.1 BPM, bar 1.859s, 257 bars, phrase 12.
  // Sections A1-8 / B9-24 / C25-257. A dense punch map (33) — the set trades
  // every 4 bars and hits the big ones. Three identities plus a bare one.
  // ==========================================================================
  const JUNGLE_LOOKS = {
    A: { // undergrowth — acid ink, soft circles
      base: {
        rows: 8, cols: 8, tileSize: 16, gapX: 40, gapY: 40,
        speed: 0.6, holdScale: 1.2, desync: 0.3, ease: 0.5, border: 0.5,
        low: "#000000", high: "#35f07f", bg: "#030a05", palette: "acid",
        layout: "grid", shape: "circle", waveform: "sine",
        pattern: "drops", spread: 1.1, blur: 10, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.2, merge: 0, counter: 0, nest: 1,
        fill: false, radiusTile: 0.5, fxBloom: 0.2, fxIris: 0.3, fxGrain: 0.2,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "ink", scenePalette: "acid", sceneMix: 0.7, sceneTiles: 0.75,
        sceneSpeed: 0.5, sceneScale: 0.5, sceneDrive: 0.4, sceneWarp: 0.6,
        sceneGenome: "green triskelion", accent: "four", syncBeats: 4,
      },
      react: { master: 1.05, attack: 0.02, release: 0.24, beatSense: 0.7, beatDecay: 0.26, accentDecay: 0.13,
        rows: [R("pulse", "tileSize", 0.55), R("pulse", "sceneDrive", 0.4), R("bar", "hueShift", 0.2),
          R("bass", "blur", -0.3), R("phrase", "sceneScale", 0.3), R("high", "desync", 0.25)] },
    },
    B: { // the machine — hex lattice, square wave, hard
      base: {
        rows: 12, cols: 12, tileSize: 26, gapX: 18, gapY: 18,
        speed: 1.2, holdScale: 0, desync: 0.2, ease: 0, border: 0.6,
        low: "#02120a", high: "#c8ff1e", bg: "#000000", palette: "acid",
        layout: "hex", shape: "hexagon", waveform: "square",
        pattern: "sparkle", spread: 1.3, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0.2, spin: 0, displace: 0, sizePulse: 0.4, merge: 0.2, counter: 0, nest: 0,
        fill: true, radiusTile: 0, fxBloom: 0.25, fxIris: 0, fxGrain: 0.3,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0.15, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0.15, fxSlit: 0, fxCrt: 0.3,
        scene: "ridge", scenePalette: "acid", sceneMix: 0.5, sceneTiles: 0.9,
        sceneSpeed: 0.9, sceneScale: 0.45, sceneDrive: 0.6, sceneWarp: 0.6,
        sceneGenome: "emerald ring", accent: "eighths", syncBeats: 1,
      },
      react: { master: 1.35, attack: 0.012, release: 0.12, beatSense: 0.8, beatDecay: 0.15, accentDecay: 0.08,
        rows: [R("pulse", "tileSize", 0.8), R("pulse", "fxRgb", 0.5), R("pulse", "displace", 0.4),
          R("swing", "rotate", 0.4), R("bar", "twist", 0.4), R("high", "desync", 0.35)] },
    },
    C: { // spore burst — flame scene, spiral scatter
      base: {
        rows: 10, cols: 10, tileSize: 26, gapX: 26, gapY: 26,
        speed: 1.4, holdScale: 0.4, desync: 0.55, ease: 0.2, border: 0,
        low: "#000000", high: "#c8ff1e", bg: "#000000", palette: "acid",
        layout: "spiral", shape: "circle", waveform: "triangle",
        pattern: "scatter", spread: 1.2, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0.15, displace: 0, sizePulse: 0.7, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0.5, fxBloom: 0.35, fxIris: 0, fxGrain: 0.2,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "flame", scenePalette: "genome", sceneGenome: "lime vortex",
        sceneMix: 0.95, sceneTiles: 0.35, sceneSpeed: 1.2, sceneScale: 0.55,
        sceneDrive: 0.8, sceneWarp: 0.5, accent: "four", syncBeats: 2,
      },
      react: { master: 1.45, attack: 0.012, release: 0.13, beatSense: 0.8, beatDecay: 0.16, accentDecay: 0.09,
        rows: [R("pulse", "sceneDrive", 0.75), R("pulse", "sizePulse", 0.7), R("pulse", "fxBloom", 0.4),
          R("bar", "sceneHue", 0.3), R("phrase", "sceneScale", 0.35), R("bass", "sceneWarp", 0.35)] },
    },
    E: { // night ride — nebula tunnel, radial rings
      base: {
        rows: 7, cols: 16, tileSize: 26, gapX: 26, gapY: 26,
        speed: 1.3, holdScale: 0.6, desync: 0.3, ease: 0.6, border: 0,
        low: "#0a0014", high: "#ff9de8", bg: "#05010c", palette: "neon",
        layout: "radial", shape: "ring", waveform: "sine",
        pattern: "tempo-rows", spread: 1.8, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.3, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0, fxBloom: 0.3, fxIris: 0, fxGrain: 0.15,
        fxKaleido: 0, fxTrails: 0.35, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0.2,
        scene: "nebula", scenePalette: "neon", sceneMix: 0.9, sceneTiles: 0.5,
        sceneSpeed: 1, sceneScale: 0.55, sceneDrive: 0.6, sceneWarp: 0.4,
        sceneGenome: "violet veil", accent: "backbeat", syncBeats: 4,
      },
      react: { master: 1.15, attack: 0.02, release: 0.2, beatSense: 0.72, beatDecay: 0.22, accentDecay: 0.12,
        rows: [R("pulse", "tileSize", 0.6), R("pulse", "sceneDrive", 0.45), R("bar", "sceneHue", 0.35),
          R("phrase", "sceneSpeed", 0.3), R("swing", "spread", 0.3), R("bass", "fxBloom", 0.3)] },
    },
  };

  const JUNGLE_SCORE = [
    [1, "A"],
    [5, "B"],                                    // PUNCH — drop
    [9, "C"],                                    // PUNCH — drop
    ...call(13, 25, 4, [["A", { sceneTiles: 0.5 }], ["B"]], ["hue", "offbeat"]),
    [25, "C", "burst"],                          // PUNCH — section C
    ...call(29, 49, 4, [["B"], ["A"], ["C"]], ["hue", "shape", "gallop"]),
    [49, "B", "invert"],                         // PUNCH — groove change
    ...call(53, 62, 4, [["A"], ["C"]], ["fast", "scene"]),
    [62, "C", "shape"],                          // PUNCH — groove change
    [66, "A", "tiles"],
    [69, "B", "blast"],                          // PUNCH — drop
    [73, "C"],                                   // PUNCH — drop
    [77, "E"],                                   // PUNCH — groove change: new world
    ...call(81, 94, 4, [["E"], ["B", { fxCrt: 0.6 }]], ["hue", "stutter"]),
    [94, "C", "fast"],                           // PUNCH — drop
    ...call(98, 108, 4, [["A"], ["E"]], ["hue"]),
    [108, "B", "tight"],                         // PUNCH — groove change
    ...call(112, 118, 4, [["C"], ["A"]], ["offbeat"]),
    [118, "E", "burst"],                         // PUNCH — drop
    ...call(122, 133, 4, [["E"], ["C"]], ["hue", "slow"]),
    [133, "A", "scene"],                         // PUNCH — break returns
    ...call(137, 146, 4, [["B"], ["A"]], ["gallop"]),
    [146, "C", "blast"],                         // PUNCH — drop
    ...call(150, 160, 4, [["E"], ["C"]], ["hue"]),
    [160, "B", "fast"],                          // PUNCH — groove change
    ...call(164, 173, 4, [["A"], ["E"]], ["shape"]),
    [173, "E", "hue"],                           // PUNCH — break returns
    [177, "C", "scene", { sceneGenome: "firebird" }],
    ...call(181, 195, 4, [["E"], ["B"], ["A"]], ["hue", "offbeat"]),
    [195, "C", "burst"],                         // PUNCH — groove change
    ...call(199, 211, 4, [["E"], ["A"]], ["slow", "hue"]),
    [211, "B", "invert"],                        // PUNCH — break returns
    ...call(215, 227, 4, [["E"], ["C"]], ["hue", "scene"]),
    [227, "E", "hue"],                           // PUNCH — break returns
    ...call(231, 243, 4, [["A"], ["E"]], ["slow"]),
    [243, "E", "slow", { __ramp: 6, fxTrails: 0.6, fxIris: 0.35 }],
    [249, "E", "slow", { __ramp: 8, speed: 0.5, blur: 30, sceneMix: 0.3, fxIris: 0.6 }],
    [255, "E", "none", { __ramp: 4, speed: 0.2, sceneMix: 0, fxIris: 0.95, bg: "#000000", palette: "duo", low: "#000000", high: "#000000" }],
  ];

  // ==========================================================================
  // TIMBER AT SEA — 123.95 BPM, bar 1.936s, 92 bars, phrase 16.
  // Sections A1-12 / A13-48 / B49-68 / A69-80 / C81-92. Water, not machinery:
  // ink and nebula carry it, the lattice is bars and slits.
  // ==========================================================================
  const TIMBER_LOOKS = {
    A: { // black sea — ink under slow bars
      base: {
        rows: 5, cols: 9, tileSize: 40, gapX: 18, gapY: 46,
        marginTop: 60, marginRight: 60, marginBottom: 60, marginLeft: 60,
        speed: 0.5, holdScale: 1.3, desync: 0.15, ease: 1, border: 0.4,
        low: "#000407", high: "#1e88b8", bg: "#01050a", palette: "duo",
        layout: "grid", shape: "bar", waveform: "sine",
        pattern: "bounce-x", spread: 1.3, blur: 10, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.2, merge: 0, counter: 0, nest: 0,
        fill: false, radiusTile: 0, fxBloom: 0.2, fxIris: 0.3, fxGrain: 0.15,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0.15, fxSlit: 0, fxCrt: 0,
        scene: "ink", scenePalette: "ocean", sceneMix: 0.7, sceneTiles: 0.8,
        sceneSpeed: 0.4, sceneScale: 0.55, sceneDrive: 0.35, sceneWarp: 0.6,
        sceneGenome: "mint smoke", accent: "four", syncBeats: 8,
      },
      react: { master: 1.0, attack: 0.03, release: 0.35, beatSense: 0.68, beatDecay: 0.3, accentDecay: 0.16,
        rows: [R("pulse", "tileSize", 0.5), R("pulse", "sceneDrive", 0.35), R("bar", "spread", 0.3),
          R("bass", "blur", 0.3), R("phrase", "sceneScale", 0.3), OFF] },
    },
    B: { // the squall — ink churning, diamonds, displaced
      base: {
        rows: 9, cols: 9, tileSize: 50, gapX: 26, gapY: 26,
        speed: 1.7, holdScale: 0.5, desync: 0.35, ease: 0.6, border: 0.8,
        low: "#000913", high: "#eafcff", bg: "#01070f", palette: "ocean",
        layout: "grid", shape: "diamond", waveform: "triangle",
        pattern: "ripple", spread: 1.8, blur: 2, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0.4, sizePulse: 0.5, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0, fxBloom: 0.4, fxIris: 0, fxGrain: 0.2,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0.5, fxSlit: 0, fxCrt: 0,
        scene: "ink", scenePalette: "ocean", sceneMix: 0.95, sceneTiles: 0.5,
        sceneSpeed: 1.4, sceneScale: 0.5, sceneDrive: 0.9, sceneWarp: 1,
        sceneGenome: "mint blade", accent: "eighths", syncBeats: 2,
      },
      react: { master: 1.5, attack: 0.012, release: 0.13, beatSense: 0.8, beatDecay: 0.16, accentDecay: 0.09,
        rows: [R("pulse", "tileSize", 0.8), R("pulse", "displace", 0.6), R("pulse", "sceneDrive", 0.5),
          R("bar", "sceneWarp", 0.3), R("swing", "twist", 0.4), R("high", "desync", 0.3)] },
    },
    C: { // bioluminescence — nebula, counter-phased rings
      base: {
        rows: 8, cols: 8, tileSize: 62, gapX: 24, gapY: 24,
        speed: 1, holdScale: 0.8, desync: 0.2, ease: 0.9, border: 0,
        low: "#000913", high: "#7fd4ff", bg: "#01060d", palette: "ocean",
        layout: "spiral", shape: "circle", waveform: "sine",
        pattern: "rings", spread: 1.2, blur: 1, hueShift: 0.12, sceneHue: 0.05,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.3, merge: 0, counter: 0.7, nest: 2,
        fill: true, radiusTile: 0.5, fxBloom: 0.5, fxIris: 0, fxGrain: 0.1,
        fxKaleido: 0, fxTrails: 0.35, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "nebula", scenePalette: "ocean", sceneMix: 0.9, sceneTiles: 0.45,
        sceneSpeed: 0.6, sceneScale: 0.65, sceneDrive: 0.65, sceneWarp: 0.55,
        sceneGenome: "green orb", accent: "backbeat", syncBeats: 4,
      },
      react: { master: 1.2, attack: 0.02, release: 0.25, beatSense: 0.72, beatDecay: 0.24, accentDecay: 0.13,
        rows: [R("pulse", "counter", 0.6), R("pulse", "sceneDrive", 0.5), R("bar", "sceneHue", 0.3),
          R("phrase", "sceneScale", 0.35), R("swing", "spread", 0.3), R("bass", "fxBloom", 0.35)] },
    },
    D: { // lightning — one bar of inverted daylight
      base: {
        rows: 4, cols: 6, tileSize: 150, gapX: 40, gapY: 40,
        speed: 4.2, holdScale: 0, desync: 0, ease: 0, border: 0,
        low: "#dfeef5", high: "#06283d", bg: "#cfe4ee", palette: "duo",
        layout: "grid", shape: "square", waveform: "square",
        pattern: "unison", spread: 0.2, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0, fxBloom: 0.7, fxIris: 0, fxGrain: 0,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0.6, fxRgb: 0.25, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "none", scenePalette: "duo", sceneMix: 0.1, sceneTiles: 1,
        sceneSpeed: 1, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
        sceneGenome: "mint smoke", accent: "sixteenths", syncBeats: 1,
      },
      react: { master: 1.7, attack: 0.008, release: 0.09, beatSense: 0.88, beatDecay: 0.1, accentDecay: 0.06,
        rows: [R("pulse", "tileSize", 1), R("pulse", "fxRgb", 0.7), R("pulse", "blur", 0.5),
          R("bar", "spread", 0.4), R("beat", "displace", 0.6), OFF] },
    },
  };

  const TIMBER_SCORE = [
    [1, "A"],
    [3, "B", "tight"],                            // PUNCH — drop
    [7, "A", "hue"],                              // PUNCH — drop
    ...call(9, 20, 4, [["A"], ["C", { sceneTiles: 0.6 }]], ["shape", "offbeat"]),
    [20, "B"],                                    // PUNCH — drop
    ...call(24, 29, 4, [["A", { fxSlit: 0.3 }], ["B"]], ["hue"]),
    [29, "B", "burst"],                           // PUNCH — drop
    [33, "C"],                                    // PUNCH — drop
    [37, "D"],                                    // PUNCH — drop: lightning
    [38, "C", "hue"],
    [40, "A", "scene"],                           // PUNCH — groove change
    ...call(43, 49, 3, [["B"], ["A"]], ["gallop"]),
    [49, "C", "burst"],                           // section B — bioluminescence
    ...call(52, 60, 4, [["C"], ["A"]], ["hue", "slow"]),
    [60, "B", "fast"],                            // PUNCH — groove change
    [63, "C", "shape"],                           // PUNCH — groove change
    [65, "A", "tiles", { scene: "ridge", scenePalette: "crt", sceneMix: 0.5 }], // PUNCH — groove change
    [67, "D", "hue"],                             // PUNCH — groove change
    [69, "C"],                                    // section A' returns
    ...call(71, 79, 4, [["A"], ["C"]], ["slow", "hue"]),
    [79, "B", "burst"],                           // PUNCH — break returns
    [82, "D", "blast"],                           // PUNCH — drop
    [83, "B", "fast"],
    [85, "C", "scene"],                           // PUNCH — groove change
    [88, "A", "slow", { __ramp: 4, fxTrails: 0.5, fxIris: 0.4, sceneMix: 0.4 }],
    [91, "A", "none", { __ramp: 3, speed: 0.2, blur: 50, fxIris: 0.95, sceneMix: 0, low: "#000000", high: "#000407" }],
  ];

  globalThis.LUMINA_COMPOSITIONS = {
    "Angular Ritual.mp3": build("Angular Ritual.mp3", ANGULAR_LOOKS, ANGULAR_SCORE),
    "Jungle Moog Ritual.mp3": build("Jungle Moog Ritual.mp3", JUNGLE_LOOKS, JUNGLE_SCORE),
    "Timber at Sea.mp3": build("Timber at Sea.mp3", TIMBER_LOOKS, TIMBER_SCORE),
  };
  globalThis.LUMINA_LOOKS = {
    "Angular Ritual.mp3": ANGULAR_LOOKS,
    "Jungle Moog Ritual.mp3": JUNGLE_LOOKS,
    "Timber at Sea.mp3": TIMBER_LOOKS,
  };
})();
