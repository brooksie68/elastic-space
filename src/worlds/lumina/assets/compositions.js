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
  // v3 THE REEL, 2026-08-03 — James killed v2's call-and-response the same
  // night ("four bars of this, four bars of that... really boring. This is
  // the demo reel for the investors. Never come back to the same thing
  // twice. Cut frequently and often and use very extreme changes.").
  // 71 cuts, every look appears EXACTLY ONCE, adjacent cuts maximally
  // opposed (blinding↔void, giant↔dust, folded↔bare, strobe↔still). All 33
  // punches hit; quiet pockets (b66-71, b143) are extreme QUIET cuts; b21
  // (2.73) = whiteout, b146 (2.61) = detonation. React archetypes are
  // shared plumbing (REACTS); the looks never repeat. Chassis: JBASE/jl.
  // Tune by bar label ("b118 lacequake").
  // ==========================================================================
  // The jungle chassis: a complete neutral state every look spreads over —
  // each event fully determines the frame, nothing bleeds between looks.
  const JBASE = {
    rows: 8, cols: 8, tileSize: 30, gapX: 20, gapY: 20,
    marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    speed: 1, holdScale: 0.3, desync: 0.15, ease: 0.35, border: 0,
    low: "#020803", high: "#b8f06a", bg: "#010301", palette: "duo",
    layout: "grid", shape: "square", waveform: "triangle",
    pattern: "unison", spread: 1, blur: 0, hueShift: 0, sceneHue: 0,
    rotate: 0, spin: 0, displace: 0, sizePulse: 0.25, merge: 0, counter: 0, nest: 0,
    fill: true, radiusTile: 0, fxBloom: 0.2, fxIris: 0, fxGrain: 0.15,
    fxKaleido: 0, fxKalRing: 0, fxKalIter: 0, fxKalSpin: 0,
    fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
    fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
    scene: "none", scenePalette: "acid", sceneMix: 0.5, sceneTiles: 1,
    sceneSpeed: 0.8, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
    sceneGenome: "green triskelion", accent: "four", syncBeats: 2,
  };
  const jl = (over, react) => ({ base: Object.assign({}, JBASE, over), react });
  const jr = (rows, over) => Object.assign({ master: 1.25, attack: 0.015, release: 0.15,
    beatSense: 0.75, beatDecay: 0.18, accentDecay: 0.1, rows }, over || {});

  // React archetypes — the rhythm plumbing is shared (grid-locked rows,
  // nothing follows lagging envelopes); the LOOKS never repeat.
  const REACTS = {
    hard: jr([R("pulse", "tileSize", 0.8), R("pulse", "displace", 0.45), R("swing", "rotate", 0.35),
      R("high", "desync", 0.35), R("bass", "sceneDrive", 0.4), R("bar", "hueShift", 0.2)],
      { master: 1.4, attack: 0.012, release: 0.12, beatSense: 0.82, beatDecay: 0.15, accentDecay: 0.08 }),
    gate: jr([R("pulse", "fxShutter", 0.4), R("pulse", "tileSize", 0.7), R("high", "desync", 0.4),
      R("swing", "spread", 0.35), R("bass", "sceneDrive", 0.4), OFF],
      { master: 1.45, attack: 0.01, release: 0.1, beatSense: 0.85, beatDecay: 0.13, accentDecay: 0.07 }),
    scenehard: jr([R("pulse", "sceneDrive", 0.75), R("pulse", "fxBloom", 0.45), R("bar", "sceneHue", 0.3),
      R("phrase", "sceneScale", 0.35), R("bass", "sceneWarp", 0.4), R("high", "desync", 0.25)],
      { master: 1.4, attack: 0.012, release: 0.13 }),
    kal: jr([R("pulse", "sceneDrive", 0.6), R("pulse", "fxBloom", 0.4), R("bass", "fxKalRing", 0.3),
      R("swing", "fxKalSpin", 0.25), R("bar", "sceneHue", 0.25), R("phrase", "sceneScale", 0.3)]),
    spin: jr([R("pulse", "sizePulse", 0.7), R("swing", "spin", 0.4), R("bar", "twist", 0.4),
      R("pulse", "fxRgb", 0.4), R("high", "desync", 0.35), R("bass", "sceneDrive", 0.4)],
      { master: 1.35, attack: 0.012, release: 0.12 }),
    lat: jr([R("pulse", "tileSize", 0.85), R("pulse", "displace", 0.5), R("swing", "spread", 0.35),
      R("bar", "hueShift", 0.2), R("high", "sizePulse", 0.3), OFF],
      { master: 1.4, attack: 0.01, release: 0.1 }),
    float: jr([R("pulse", "fxBloom", 0.3), R("bass", "sceneDrive", 0.3), R("phrase", "sceneScale", 0.3),
      R("bar", "spread", 0.25), OFF, OFF],
      { master: 1.0, attack: 0.03, release: 0.3, beatDecay: 0.24, accentDecay: 0.14 }),
    quiet: jr([R("pulse", "fxBloom", 0.2), R("bass", "sceneDrive", 0.25), R("phrase", "sceneHue", 0.2),
      OFF, OFF, OFF],
      { master: 0.8, attack: 0.04, release: 0.4, beatSense: 0.65, beatDecay: 0.3, accentDecay: 0.18 }),
  };

  // THE REEL: [bar, name, react, overrides, ramp?]. 71 cuts, none repeated.
  const JUNGLE_REEL = [
    [1, "supernova", "kal", { // out of the gate: gold fire through full rings
      tileSize: 14, gapX: 30, gapY: 30, speed: 2.4, holdScale: 0.1, ease: 0.2,
      low: "#000000", high: "#ffe9b0", bg: "#000000", shape: "circle", pattern: "drops",
      radiusTile: 0.5, fxBloom: 0.5, fxShutter: 0.25, fxKaleido: 0.65, fxKalRing: 0.9,
      fxKalIter: 0.5, fxKalSpin: 0.45, scene: "flame", scenePalette: "genome",
      sceneGenome: "gold phoenix", sceneMix: 1, sceneTiles: 0.15, sceneSpeed: 1.2,
      sceneScale: 0.55, sceneDrive: 0.85, accent: "four", syncBeats: 1 }],
    [2, "blacksnap", "quiet", { // hard cut to void: two giant dim rings
      rows: 1, cols: 2, tileSize: 220, gapX: 120, gapY: 0, speed: 0.4, holdScale: 1.6,
      ease: 0.9, low: "#050208", high: "#3a2a55", bg: "#000000", shape: "ring",
      waveform: "sine", pattern: "rows-alt", fill: false, counter: 0.5, blur: 8,
      fxIris: 0.35, accent: "downbeat", syncBeats: 4 }],
    [5, "acidwall", "lat", { // full-bleed lime hex lattice, no scene
      rows: 14, cols: 14, tileSize: 30, gapX: 10, gapY: 10, speed: 1.6, holdScale: 0,
      ease: 0, low: "#0a1400", high: "#c8ff1e", bg: "#000000", palette: "acid",
      layout: "hex", shape: "hexagon", waveform: "square", pattern: "sparkle",
      border: 0.5, fxRgb: 0.3, fxCrt: 0.4, fxGrain: 0.3, accent: "eighths", syncBeats: 1 }],
    [9, "violetfold", "kal", { // nebula through the triple refold
      tileSize: 12, gapX: 40, gapY: 40, speed: 1, low: "#0a0014", high: "#e0a2ff",
      bg: "#020008", palette: "neon", shape: "circle", pattern: "scatter", fill: false,
      radiusTile: 0.5, fxBloom: 0.4, fxKaleido: 0.8, fxKalRing: 0.35, fxKalIter: 1,
      fxKalSpin: 0.3, scene: "nebula", scenePalette: "neon", sceneGenome: "violet veil",
      sceneMix: 0.95, sceneTiles: 0.2, sceneSpeed: 0.9, sceneDrive: 0.7,
      accent: "offbeat", syncBeats: 2 }],
    [13, "dustfield", "float", { // thousand embers drifting in the dark
      rows: 20, cols: 20, tileSize: 5, gapX: 24, gapY: 24, speed: 0.8, holdScale: 0.9,
      desync: 0.8, ease: 0.7, low: "#000000", high: "#7adfc0", bg: "#000303",
      shape: "circle", waveform: "sine", pattern: "scatter", spread: 1.9, fill: false,
      radiusTile: 0.5, blur: 2, fxBloom: 0.5, fxTrails: 0.35, accent: "offbeat", syncBeats: 2 }],
    [17, "magmaslabs", "scenehard", { // huge molten slabs oozing
      rows: 4, cols: 4, tileSize: 300, gapX: 8, gapY: 8, speed: 0.5, holdScale: 1.2,
      ease: 0.8, low: "#180400", high: "#ff7a20", bg: "#050100", shape: "square",
      waveform: "sine", pattern: "unison", merge: 0.95, blur: 6, scene: "flame",
      scenePalette: "genome", sceneGenome: "ember cathedral", sceneMix: 0.7,
      sceneTiles: 0.5, sceneSpeed: 0.5, sceneDrive: 0.6, accent: "downbeat", syncBeats: 4 }],
    [21, "whiteout", "gate", { // THE drop (2.73): blinding gated strobe
      rows: 8, cols: 8, tileSize: 120, gapX: 4, gapY: 4, speed: 4.2, holdScale: 0,
      ease: 0, low: "#1a1a1a", high: "#ffffff", bg: "#000000", waveform: "square",
      pattern: "unison", spread: 0.3, fxShutter: 0.75, fxPixel: 0.25, fxGrain: 0.3,
      accent: "four", syncBeats: 1 }],
    [25, "inkstorm", "scenehard", { // section C: the ocean tears open
      rows: 6, cols: 6, tileSize: 20, gapX: 60, gapY: 60, speed: 1.2, low: "#00060c",
      high: "#3cc8f0", bg: "#000408", palette: "ocean", shape: "circle", fill: false,
      radiusTile: 0.5, pattern: "drops", scene: "ink", scenePalette: "ocean",
      sceneMix: 0.95, sceneTiles: 0.15, sceneSpeed: 1.1, sceneScale: 0.6,
      sceneDrive: 0.85, sceneWarp: 0.9, fxBloom: 0.3, accent: "four", syncBeats: 2 }],
    [29, "pinwheelrun", "spin", { // neon stars wheeling
      rows: 9, cols: 9, tileSize: 24, gapX: 26, gapY: 26, speed: 1.4, low: "#0c0014",
      high: "#ff6ad5", bg: "#030008", palette: "neon", layout: "radial", shape: "star",
      pattern: "pinwheel", spread: 1.7, spin: 0.35, sizePulse: 0.5, fxBloom: 0.3,
      fxTrails: 0.25, accent: "gallop", syncBeats: 1 }],
    [33, "barcode", "lat", { // phosphor bars, slit-scanned
      rows: 24, cols: 3, tileSize: 60, gapX: 6, gapY: 4, speed: 1.8, holdScale: 0,
      ease: 0.1, low: "#001200", high: "#42ff6a", bg: "#000000", palette: "crt",
      shape: "bar", waveform: "square", pattern: "rows-alt", fxSlit: 0.55, fxCrt: 0.6,
      fxGrain: 0.35, accent: "eighths", syncBeats: 1 }],
    [37, "emberfall", "float", { // orange checker rain over low fire
      rows: 12, cols: 16, tileSize: 16, gapX: 18, gapY: 30, speed: 1, low: "#120500",
      high: "#ffb03c", bg: "#040100", shape: "diamond", pattern: "checkerboard",
      sizePulse: 0.35, scene: "flame", scenePalette: "genome", sceneGenome: "firebird",
      sceneMix: 0.45, sceneTiles: 0.75, sceneSpeed: 0.7, sceneDrive: 0.5,
      accent: "offbeat", syncBeats: 2 }],
    [41, "xrayghost", "float", { // pale doubles sliding through themselves
      rows: 5, cols: 7, tileSize: 70, gapX: 30, gapY: 30, speed: 0.7, holdScale: 1.3,
      ease: 0.9, low: "#e8e8f4", high: "#0a0a14", bg: "#c8c8d8", shape: "circle",
      waveform: "sine", pattern: "bounce-x", fill: false, counter: 0.9, blur: 18,
      fxBloom: 0.2, accent: "downbeat", syncBeats: 4 }],
    [45, "hexcrush", "lat", { // amber hexes slamming together
      rows: 10, cols: 10, tileSize: 44, gapX: 12, gapY: 12, speed: 1.5, holdScale: 0.1,
      low: "#140a00", high: "#ffcf4a", bg: "#000000", layout: "hex", shape: "hexagon",
      waveform: "square", pattern: "tempo-rows", merge: 0.9, displace: 0.2,
      sizePulse: 0.5, fxGrain: 0.25, accent: "backbeat", syncBeats: 1 }],
    [49, "glasscut", "kal", { // ridge filaments through the double fold
      tileSize: 16, gapX: 34, gapY: 34, speed: 1.3, low: "#001014", high: "#b0f0ff",
      bg: "#000608", shape: "diamond", pattern: "scatter", fxKaleido: 0.75,
      fxKalRing: 0.25, fxKalIter: 0.5, fxKalSpin: 0.2, fxZoomRot: 0.35, fxBloom: 0.35,
      scene: "ridge", scenePalette: "ocean", sceneMix: 0.9, sceneTiles: 0.25,
      sceneSpeed: 1, sceneDrive: 0.7, accent: "four", syncBeats: 2 }],
    [53, "sinepool", "quiet", { // giant slow breaths, deep blue
      rows: 3, cols: 4, tileSize: 150, gapX: 50, gapY: 50, speed: 0.45, holdScale: 1.7,
      ease: 1, low: "#000a12", high: "#2a6a9a", bg: "#000406", shape: "circle",
      waveform: "sine", pattern: "drops", fill: false, radiusTile: 0.5, blur: 10,
      fxIris: 0.3, scene: "ink", scenePalette: "ocean", sceneMix: 0.5, sceneTiles: 0.7,
      sceneSpeed: 0.3, sceneDrive: 0.3, accent: "downbeat", syncBeats: 8 }],
    [57, "shatterfield", "hard", { // everything flung apart
      rows: 12, cols: 12, tileSize: 22, gapX: 20, gapY: 20, speed: 2, low: "#0c0c14",
      high: "#e0e6ff", bg: "#000000", shape: "star", pattern: "sparkle", displace: 0.95,
      desync: 0.9, sizePulse: 0.7, spread: 1.7, fxGrain: 0.3, accent: "stutter", syncBeats: 1 }],
    [62, "theeye", "quiet", { // one ring. watching.
      rows: 1, cols: 1, tileSize: 300, speed: 0.5, holdScale: 1.8, ease: 1,
      low: "#03000a", high: "#b09aff", bg: "#010004", shape: "ring", waveform: "sine",
      pattern: "unison", fill: false, blur: 4, fxBloom: 0.45, fxIris: 0.5,
      scene: "nebula", scenePalette: "neon", sceneGenome: "violet veil", sceneMix: 0.35,
      sceneTiles: 0.9, sceneSpeed: 0.25, sceneDrive: 0.3, accent: "downbeat", syncBeats: 4 }],
    [66, "voidhush", "quiet", { // measured quiet: almost nothing
      rows: 1, cols: 5, tileSize: 40, gapX: 70, gapY: 0, speed: 0.3, holdScale: 1.8,
      ease: 1, low: "#020204", high: "#1c2a30", bg: "#000000", shape: "bar",
      waveform: "sine", pattern: "bounce-x", fill: false, blur: 14, fxIris: 0.6,
      accent: "downbeat", syncBeats: 8 }],
    [69, "lavavent", "scenehard", { // the drop rips out of the hush
      tileSize: 10, gapX: 50, gapY: 50, speed: 1.6, low: "#000000", high: "#ff9c3c",
      bg: "#000000", shape: "circle", pattern: "drops", radiusTile: 0.5, fxBloom: 0.55,
      scene: "flame", scenePalette: "genome", sceneGenome: "firebird", sceneMix: 1,
      sceneTiles: 0.1, sceneSpeed: 1.2, sceneScale: 0.6, sceneDrive: 0.9,
      accent: "four", syncBeats: 1 }],
    [71, "deepdrift", "quiet", { // second hush: mint fog
      rows: 2, cols: 3, tileSize: 120, gapX: 60, gapY: 60, speed: 0.35, holdScale: 1.6,
      ease: 1, low: "#001008", high: "#4a9a7a", bg: "#000503", shape: "circle",
      waveform: "sine", pattern: "unison", fill: false, blur: 16, fxIris: 0.5,
      scene: "nebula", scenePalette: "ocean", sceneGenome: "mint smoke", sceneMix: 0.55,
      sceneTiles: 0.6, sceneSpeed: 0.2, sceneDrive: 0.25, accent: "downbeat", syncBeats: 8 }],
    [73, "neoncage", "hard", { // thin electric borders, nothing inside
      rows: 8, cols: 12, tileSize: 60, gapX: 14, gapY: 14, speed: 2, holdScale: 0,
      low: "#000000", high: "#20f0ff", bg: "#000000", border: 2.5, fill: false,
      waveform: "square", pattern: "checkerboard", fxRgb: 0.35, fxBloom: 0.35,
      accent: "eighths", syncBeats: 1 }],
    [77, "swarm", "hard", { // green gnats scattering on the gallop
      rows: 18, cols: 18, tileSize: 7, gapX: 26, gapY: 26, speed: 1.6, desync: 0.85,
      low: "#000000", high: "#8fff5a", bg: "#010300", palette: "acid", shape: "circle",
      pattern: "scatter", spread: 1.8, fill: false, radiusTile: 0.5, fxBloom: 0.4,
      accent: "gallop", syncBeats: 1 }],
    [81, "pistons", "lat", { // copper machine hammering
      rows: 6, cols: 10, tileSize: 70, gapX: 20, gapY: 30, speed: 1.7, holdScale: 0,
      ease: 0, low: "#160a02", high: "#e09a50", bg: "#040200", shape: "bar",
      waveform: "square", pattern: "tempo-rows", sizePulse: 0.6, fxCrt: 0.3,
      fxGrain: 0.3, accent: "backbeat", syncBeats: 1 }],
    [85, "risewall", "gate", { // the 4-bar build: a wall accelerating
      rows: 16, cols: 16, tileSize: 14, gapX: 14, gapY: 14, speed: 1.2, low: "#0a0e00",
      high: "#e8ff70", bg: "#000000", waveform: "square", pattern: "sparkle",
      spread: 0.6, desync: 0.4, fxZoom: 0.4, fxGrain: 0.35, scene: "ridge",
      scenePalette: "acid", sceneMix: 0.45, sceneTiles: 0.9, sceneSpeed: 1.1,
      sceneDrive: 0.6, accent: "gallop", syncBeats: 1 }],
    [89, "strobegate", "gate", { // last 4 bars before the drop: pure gate
      rows: 12, cols: 12, tileSize: 30, gapX: 8, gapY: 8, speed: 3.4, holdScale: 0,
      ease: 0, low: "#101400", high: "#f4ff9a", bg: "#000000", waveform: "square",
      pattern: "unison", spread: 0.25, fxShutter: 0.65, fxPixel: 0.2,
      accent: "four", syncBeats: 1 }, 4],
    [94, "goldburst", "kal", { // the drop: gold mandala detonation
      tileSize: 16, gapX: 28, gapY: 28, speed: 2.2, low: "#000000", high: "#ffd97a",
      bg: "#000000", shape: "circle", pattern: "drops", radiusTile: 0.5, fxBloom: 0.55,
      fxKaleido: 0.6, fxKalRing: 0.8, fxKalIter: 0.5, fxKalSpin: 0.5,
      scene: "flame", scenePalette: "genome", sceneGenome: "gold phoenix", sceneMix: 1,
      sceneTiles: 0.18, sceneSpeed: 1.3, sceneDrive: 0.9, accent: "four", syncBeats: 1 }],
    [98, "seaglass", "float", { // cool green smear after the fire
      rows: 8, cols: 14, tileSize: 30, gapX: 16, gapY: 24, speed: 0.9, low: "#001208",
      high: "#4cf0b0", bg: "#000503", palette: "ocean", shape: "bar",
      pattern: "bounce-x", fxSlit: 0.35, scene: "ink", scenePalette: "ocean",
      sceneMix: 0.6, sceneTiles: 0.7, sceneSpeed: 0.8, sceneDrive: 0.5,
      sceneWarp: 0.7, accent: "offbeat", syncBeats: 2 }],
    [102, "arrowrain", "spin", { // diamonds driving downfield
      rows: 12, cols: 10, tileSize: 26, gapX: 22, gapY: 22, speed: 1.6, low: "#020c14",
      high: "#7ac8ff", bg: "#000306", shape: "diamond", pattern: "checkerboard",
      rotate: 0.5, sizePulse: 0.5, spread: 1.4, fxTrails: 0.2, accent: "gallop", syncBeats: 1 }],
    [106, "nestrings", "float", { // rings inside rings inside rings
      rows: 4, cols: 6, tileSize: 90, gapX: 30, gapY: 30, speed: 0.8, holdScale: 1,
      low: "#0c0014", high: "#ff9de8", bg: "#030008", palette: "neon", shape: "ring",
      waveform: "sine", pattern: "drops", fill: false, nest: 2, blur: 3,
      fxBloom: 0.35, accent: "downbeat", syncBeats: 2 }],
    [108, "drumcircle", "lat", { // radial rings pounding the backbeat
      rows: 6, cols: 14, tileSize: 34, gapX: 24, gapY: 24, speed: 1.5, holdScale: 0.1,
      border: 0.8, low: "#120802", high: "#ffb03c", bg: "#050200", layout: "radial",
      shape: "ring", waveform: "square", pattern: "tempo-rows", spread: 1.7,
      displace: 0.12, sizePulse: 0.55, fxGrain: 0.25, accent: "backbeat", syncBeats: 1 }],
    [112, "staticwall", "gate", { // signal loss
      rows: 20, cols: 20, tileSize: 26, gapX: 4, gapY: 4, speed: 2.6, holdScale: 0,
      ease: 0, low: "#0a0a0a", high: "#d8d8d8", bg: "#000000", waveform: "square",
      pattern: "sparkle", desync: 0.7, fxPixel: 0.55, fxGrain: 0.6, fxCrt: 0.5,
      accent: "stutter", syncBeats: 1 }],
    [116, "bluevein", "scenehard", { // electric filaments, tiles gone
      rows: 4, cols: 4, tileSize: 12, gapX: 80, gapY: 80, speed: 1.1, low: "#000a14",
      high: "#30b0ff", bg: "#000205", fill: false, radiusTile: 0.5, shape: "circle",
      pattern: "drops", scene: "ridge", scenePalette: "ocean", sceneMix: 1,
      sceneTiles: 0.08, sceneSpeed: 1, sceneScale: 0.6, sceneDrive: 0.8,
      sceneWarp: 0.7, fxBloom: 0.4, accent: "four", syncBeats: 2 }],
    [118, "lacequake", "kal", { // the drop: magenta lace blown open
      rows: 10, cols: 10, tileSize: 18, gapX: 26, gapY: 26, speed: 1.8, low: "#140010",
      high: "#ff5ad0", bg: "#02000a", palette: "neon", shape: "diamond",
      pattern: "scatter", displace: 0.5, sizePulse: 0.6, fxBloom: 0.45,
      fxKaleido: 0.85, fxKalRing: 0.55, fxKalIter: 1, fxKalSpin: 0.4,
      scene: "ridge", scenePalette: "neon", sceneMix: 0.85, sceneTiles: 0.3,
      sceneSpeed: 1.1, sceneDrive: 0.75, accent: "offbeat", syncBeats: 1 }],
    [122, "slowglass", "float", { // translucent slabs drifting apart
      rows: 3, cols: 5, tileSize: 130, gapX: 24, gapY: 40, speed: 0.6, holdScale: 1.4,
      ease: 0.9, low: "#0a1018", high: "#a8c8e0", bg: "#020408", shape: "square",
      waveform: "sine", pattern: "rows-alt", merge: 0.5, blur: 12, fxBloom: 0.25,
      accent: "downbeat", syncBeats: 4 }],
    [126, "limerun", "lat", { // acid columns sprinting
      rows: 16, cols: 8, tileSize: 40, gapX: 18, gapY: 8, speed: 2.2, holdScale: 0,
      low: "#0a1400", high: "#c8ff1e", bg: "#000000", palette: "acid", shape: "bar",
      waveform: "square", pattern: "checkerboard", sizePulse: 0.4, fxGrain: 0.3,
      accent: "eighths", syncBeats: 1 }],
    [130, "torchrow", "scenehard", { // a single burning column
      rows: 12, cols: 3, tileSize: 40, gapX: 30, gapY: 12, speed: 1, low: "#100400",
      high: "#ff8a30", bg: "#030100", shape: "circle", pattern: "tempo-rows",
      radiusTile: 0.5, fill: false, scene: "flame", scenePalette: "genome",
      sceneGenome: "lime vortex", sceneMix: 0.8, sceneTiles: 0.4, sceneSpeed: 0.9,
      sceneDrive: 0.7, fxBloom: 0.4, accent: "four", syncBeats: 2 }],
    [133, "undertow", "float", { // break-return: the world inverts
      rows: 5, cols: 9, tileSize: 44, gapX: 20, gapY: 40, speed: 0.7, holdScale: 1.2,
      ease: 1, low: "#b8d8e8", high: "#04141c", bg: "#90b0c0", shape: "bar",
      waveform: "sine", pattern: "bounce-x", blur: 8, fxIris: 0.25,
      scene: "ink", scenePalette: "ocean", sceneMix: 0.4, sceneTiles: 0.85,
      sceneSpeed: 0.4, sceneDrive: 0.35, accent: "downbeat", syncBeats: 4 }],
    [137, "spiralfall", "spin", { // the whole field corkscrews
      rows: 9, cols: 9, tileSize: 20, gapX: 30, gapY: 30, speed: 1.3, low: "#041002",
      high: "#9adf3c", bg: "#010400", palette: "acid", layout: "spiral", shape: "star",
      pattern: "pinwheel", spread: 1.6, spin: 0.4, fxTrails: 0.45, fxBloom: 0.3,
      accent: "gallop", syncBeats: 2 }],
    [141, "flickerdust", "gate", { // guttering candle static
      rows: 14, cols: 14, tileSize: 10, gapX: 20, gapY: 20, speed: 2.4, desync: 0.6,
      low: "#000000", high: "#ffe9c0", bg: "#000000", shape: "circle", fill: false,
      radiusTile: 0.5, pattern: "sparkle", spread: 0.8, fxGrain: 0.4, fxShutter: 0.3,
      accent: "stutter", syncBeats: 1 }],
    [143, "heldbreath", "quiet", { // the measured silence before the monster
      rows: 1, cols: 3, tileSize: 90, gapX: 90, gapY: 0, speed: 0.25, holdScale: 1.8,
      ease: 1, low: "#020408", high: "#182838", bg: "#000000", shape: "circle",
      waveform: "sine", pattern: "unison", fill: false, blur: 20, fxIris: 0.7,
      scene: "ink", scenePalette: "ocean", sceneMix: 0.3, sceneTiles: 0.8,
      sceneSpeed: 0.12, sceneDrive: 0.2, accent: "downbeat", syncBeats: 8 }],
    [146, "detonation", "gate", { // THE late drop (2.61): everything at once
      rows: 10, cols: 10, tileSize: 36, gapX: 14, gapY: 14, speed: 4.4, holdScale: 0,
      ease: 0.1, low: "#1a0e00", high: "#fff3d0", bg: "#000000", waveform: "square",
      pattern: "unison", spread: 0.3, sizePulse: 0.6, fxBloom: 0.55, fxShutter: 0.6,
      fxKaleido: 0.65, fxKalRing: 0.92, fxKalIter: 0.5, fxKalSpin: 0.5,
      scene: "flame", scenePalette: "genome", sceneGenome: "gold phoenix", sceneMix: 1,
      sceneTiles: 0.15, sceneSpeed: 1.4, sceneScale: 0.5, sceneDrive: 0.95,
      accent: "four", syncBeats: 1 }],
    [150, "afterimage", "float", { // violet ghosts of the blast
      rows: 7, cols: 7, tileSize: 40, gapX: 34, gapY: 34, speed: 0.8, holdScale: 1.1,
      low: "#080014", high: "#9a6aff", bg: "#020008", shape: "circle", fill: false,
      radiusTile: 0.5, waveform: "sine", pattern: "drops", blur: 10, fxTrails: 0.75,
      fxBloom: 0.3, accent: "downbeat", syncBeats: 2 }],
    [154, "prismrun", "spin", { // white diamonds split into rainbows
      rows: 8, cols: 12, tileSize: 30, gapX: 24, gapY: 24, speed: 1.7, low: "#0a0a0a",
      high: "#ffffff", bg: "#000000", shape: "diamond", pattern: "tempo-rows",
      rotate: 0.4, sizePulse: 0.5, fxRgb: 0.6, fxZoomRot: 0.4, fxBloom: 0.35,
      accent: "gallop", syncBeats: 1 }],
    [158, "mudpound", "lat", { // heavy earth slabs on the one
      rows: 5, cols: 5, tileSize: 160, gapX: 12, gapY: 12, speed: 1.1, holdScale: 0.3,
      low: "#0e0800", high: "#c09a50", bg: "#030200", waveform: "square",
      pattern: "unison", merge: 0.8, sizePulse: 0.5, fxGrain: 0.35,
      accent: "downbeat", syncBeats: 2 }],
    [160, "matrixfall", "gate", { // green code cascading
      rows: 20, cols: 12, tileSize: 22, gapX: 12, gapY: 6, speed: 2.4, holdScale: 0,
      low: "#001200", high: "#42ff6a", bg: "#000000", palette: "crt", shape: "bar",
      waveform: "square", pattern: "checkerboard", desync: 0.5, fxCrt: 0.65,
      fxSlit: 0.3, fxGrain: 0.4, accent: "eighths", syncBeats: 1 }],
    [164, "lily", "quiet", { // a soft pastel bloom, out of nowhere
      rows: 3, cols: 3, tileSize: 140, gapX: 40, gapY: 40, speed: 0.5, holdScale: 1.6,
      ease: 1, low: "#141020", high: "#ffc8e8", bg: "#060410", shape: "circle",
      waveform: "sine", pattern: "drops", fill: false, radiusTile: 0.5, blur: 8,
      fxBloom: 0.5, fxKaleido: 0.35, fxKalSpin: 0.1, scene: "nebula",
      scenePalette: "neon", sceneGenome: "violet veil", sceneMix: 0.4, sceneTiles: 0.7,
      sceneSpeed: 0.3, sceneDrive: 0.3, accent: "downbeat", syncBeats: 4 }],
    [168, "razorline", "gate", { // thin white blades
      rows: 16, cols: 1, tileSize: 200, gapX: 0, gapY: 10, speed: 2, holdScale: 0,
      low: "#000000", high: "#f0f0ff", bg: "#000000", shape: "bar", waveform: "square",
      pattern: "rows-alt", fxSlit: 0.7, fxRgb: 0.2, accent: "offbeat", syncBeats: 1 }],
    [173, "twinsuns", "float", { // break-return: two amber giants
      rows: 1, cols: 2, tileSize: 260, gapX: 80, gapY: 0, speed: 0.6, holdScale: 1.5,
      ease: 0.9, low: "#180a00", high: "#ffb84a", bg: "#040100", shape: "circle",
      waveform: "sine", pattern: "rows-alt", fill: false, radiusTile: 0.5, merge: 0.5,
      blur: 6, fxBloom: 0.55, scene: "flame", scenePalette: "genome",
      sceneGenome: "amber globe", sceneMix: 0.5, sceneTiles: 0.5, sceneSpeed: 0.5,
      sceneDrive: 0.5, accent: "downbeat", syncBeats: 2 }],
    [177, "cathedral", "kal", { // break-return: ember vaults overhead
      tileSize: 14, gapX: 40, gapY: 40, speed: 0.9, low: "#000000", high: "#ff9c5a",
      bg: "#000000", shape: "circle", pattern: "drops", radiusTile: 0.5, fxBloom: 0.45,
      fxKaleido: 0.5, fxKalRing: 0.7, fxKalSpin: 0.15, scene: "flame",
      scenePalette: "genome", sceneGenome: "ember cathedral", sceneMix: 1,
      sceneTiles: 0.12, sceneSpeed: 0.7, sceneScale: 0.6, sceneDrive: 0.75,
      accent: "four", syncBeats: 2 }],
    [181, "gridquake", "lat", { // the bare grid, hammered
      rows: 8, cols: 8, tileSize: 90, gapX: 20, gapY: 20, speed: 1.8, holdScale: 0,
      low: "#0a0a0a", high: "#e8e8e8", bg: "#000000", waveform: "square",
      pattern: "unison", displace: 0.6, sizePulse: 0.7, border: 1,
      accent: "four", syncBeats: 1 }],
    [186, "fireflies", "float", { // gold sparks over black water
      rows: 16, cols: 16, tileSize: 6, gapX: 30, gapY: 30, speed: 1.1, desync: 0.85,
      low: "#000000", high: "#ffd97a", bg: "#000202", shape: "circle", fill: false,
      radiusTile: 0.5, pattern: "scatter", spread: 1.8, blur: 2, fxBloom: 0.5,
      fxTrails: 0.3, scene: "ink", scenePalette: "ocean", sceneMix: 0.3,
      sceneTiles: 0.85, sceneSpeed: 0.3, sceneDrive: 0.3, accent: "offbeat", syncBeats: 2 }],
    [190, "tidalglass", "scenehard", { // the nebula rolls through
      rows: 4, cols: 6, tileSize: 60, gapX: 40, gapY: 40, speed: 0.9, low: "#020014",
      high: "#7a9aff", bg: "#000008", shape: "square", waveform: "sine",
      pattern: "rows-alt", merge: 0.4, blur: 6, scene: "nebula", scenePalette: "neon",
      sceneGenome: "violet veil", sceneMix: 0.9, sceneTiles: 0.3, sceneSpeed: 0.8,
      sceneScale: 0.6, sceneDrive: 0.6, sceneWarp: 0.6, accent: "four", syncBeats: 2 }],
    [195, "warcry", "hard", { // acid hexes at full charge
      rows: 12, cols: 12, tileSize: 40, gapX: 10, gapY: 10, speed: 2.8, holdScale: 0,
      low: "#02120a", high: "#c8ff1e", bg: "#000000", palette: "acid", layout: "hex",
      shape: "hexagon", waveform: "square", pattern: "sparkle", merge: 0.85,
      displace: 0.4, sizePulse: 0.6, fxRgb: 0.3, fxGrain: 0.3, accent: "eighths",
      syncBeats: 1 }],
    [197, "phantomrise", "float", { // pale ghosts drifting upward
      rows: 6, cols: 8, tileSize: 50, gapX: 30, gapY: 30, speed: 0.8, holdScale: 1.2,
      ease: 0.9, low: "#101018", high: "#d0d0e8", bg: "#040408", shape: "circle",
      waveform: "sine", pattern: "checkerboard", fill: false, counter: 0.85, blur: 14,
      fxBloom: 0.25, accent: "downbeat", syncBeats: 2 }],
    [199, "arrowstorm", "spin", { // diamonds swarming on the stutter
      rows: 11, cols: 11, tileSize: 20, gapX: 22, gapY: 22, speed: 2, low: "#140004",
      high: "#ff6a5a", bg: "#030001", shape: "diamond", pattern: "pinwheel",
      spread: 1.5, rotate: 0.5, sizePulse: 0.6, fxTrails: 0.2, accent: "stutter",
      syncBeats: 1 }],
    [203, "meltdown", "scenehard", { // break-return: colors slide off
      rows: 8, cols: 8, tileSize: 60, gapX: 16, gapY: 16, speed: 1, low: "#0a0014",
      high: "#ff8ad0", bg: "#02000a", palette: "neon", shape: "square",
      waveform: "sine", pattern: "unison", merge: 0.7, blur: 10, fxWarp: 0.85,
      fxZoom: 0.3, scene: "ink", scenePalette: "acid", sceneMix: 0.7, sceneTiles: 0.5,
      sceneSpeed: 0.9, sceneDrive: 0.6, sceneWarp: 0.95, accent: "four", syncBeats: 2 }, 2],
    [207, "monolith", "quiet", { // four black-white slabs. still.
      rows: 2, cols: 2, tileSize: 300, gapX: 30, gapY: 30, speed: 0.5, holdScale: 1.4,
      ease: 0.8, low: "#000000", high: "#e8e8e8", bg: "#0a0a0a", waveform: "sine",
      pattern: "checkerboard", border: 1.5, fill: false, accent: "downbeat", syncBeats: 4 }],
    [211, "ricochet", "hard", { // break-return: bars ping-ponging
      rows: 10, cols: 14, tileSize: 30, gapX: 16, gapY: 20, speed: 2.4, holdScale: 0,
      low: "#001408", high: "#42ffb0", bg: "#000000", shape: "bar", waveform: "square",
      pattern: "bounce-x", desync: 0.6, sizePulse: 0.5, fxSlit: 0.25,
      accent: "offbeat", syncBeats: 1 }],
    [213, "kalvortex", "kal", { // break-return: the violet whirlpool
      tileSize: 14, gapX: 36, gapY: 36, speed: 1.4, low: "#06001a", high: "#c8a2ff",
      bg: "#010006", palette: "neon", shape: "circle", pattern: "scatter",
      radiusTile: 0.5, fxBloom: 0.4, fxKaleido: 0.7, fxKalRing: 0.4, fxKalIter: 0.5,
      fxKalSpin: 0.55, fxZoomRot: 0.3, scene: "nebula", scenePalette: "neon",
      sceneGenome: "violet veil", sceneMix: 0.95, sceneTiles: 0.2, sceneSpeed: 1,
      sceneDrive: 0.7, accent: "four", syncBeats: 1 }],
    [217, "sunspot", "float", { // one amber globe, breathing
      rows: 1, cols: 1, tileSize: 300, speed: 0.6, holdScale: 1.5, ease: 0.9,
      low: "#140a00", high: "#ffcf7a", bg: "#030100", shape: "circle",
      waveform: "sine", pattern: "unison", fill: false, radiusTile: 0.5, blur: 4,
      fxBloom: 0.5, scene: "flame", scenePalette: "genome", sceneGenome: "amber globe",
      sceneMix: 0.8, sceneTiles: 0.3, sceneSpeed: 0.4, sceneScale: 0.65,
      sceneDrive: 0.5, accent: "downbeat", syncBeats: 2 }],
    [221, "overdrive", "gate", { // break-return: redline everything
      rows: 12, cols: 12, tileSize: 34, gapX: 8, gapY: 8, speed: 4.6, holdScale: 0,
      ease: 0, low: "#140000", high: "#ff4a3c", bg: "#000000", waveform: "square",
      pattern: "sparkle", blur: 80, fxShutter: 0.8, counter: 0.9, merge: 0.9,
      fxGrain: 0.4, accent: "four", syncBeats: 1 }],
    [225, "coolant", "quiet", { // cyan drip after the burn
      rows: 9, cols: 5, tileSize: 40, gapX: 40, gapY: 20, speed: 0.6, holdScale: 1.3,
      ease: 1, low: "#001014", high: "#40c8e0", bg: "#000406", shape: "bar",
      waveform: "sine", pattern: "checkerboard", blur: 6, fxIris: 0.2,
      accent: "downbeat", syncBeats: 4 }],
    [227, "greenfurnace", "kal", { // break-return: lime fire in tight rings
      tileSize: 12, gapX: 44, gapY: 44, speed: 1.2, low: "#000000", high: "#a8ff50",
      bg: "#000000", palette: "acid", shape: "circle", pattern: "drops",
      radiusTile: 0.5, fxBloom: 0.45, fxKaleido: 0.45, fxKalRing: 0.8,
      fxKalSpin: 0.18, scene: "flame", scenePalette: "genome",
      sceneGenome: "lime vortex", sceneMix: 1, sceneTiles: 0.1, sceneSpeed: 0.8,
      sceneScale: 0.55, sceneDrive: 0.8, accent: "four", syncBeats: 2 }],
    [231, "cobweb", "float", { // thin spiral threads, empty centers
      rows: 10, cols: 10, tileSize: 30, gapX: 26, gapY: 26, speed: 0.7, holdScale: 1,
      low: "#0a0a12", high: "#b8c8e0", bg: "#020204", layout: "spiral", shape: "ring",
      waveform: "sine", pattern: "pinwheel", fill: false, border: 0.6, nest: 1,
      spread: 1.5, blur: 3, accent: "downbeat", syncBeats: 2 }],
    [237, "colossus", "lat", { // giant crimson slabs, slow hammer
      rows: 3, cols: 3, tileSize: 300, gapX: 16, gapY: 16, speed: 0.9, holdScale: 0.5,
      low: "#120004", high: "#c83c50", bg: "#030001", waveform: "square",
      pattern: "unison", merge: 0.95, sizePulse: 0.5, fxGrain: 0.3,
      accent: "downbeat", syncBeats: 2 }],
    [241, "goldsparks", "gate", { // tiny gold strikes in the dark
      rows: 16, cols: 16, tileSize: 8, gapX: 24, gapY: 24, speed: 2, desync: 0.7,
      low: "#000000", high: "#ffd97a", bg: "#000000", shape: "diamond",
      pattern: "sparkle", spread: 0.9, fill: false, fxBloom: 0.45, fxGrain: 0.3,
      accent: "stutter", syncBeats: 1 }],
    [243, "exhale", "quiet", { // the last measured quiet: let it out
      rows: 2, cols: 4, tileSize: 100, gapX: 60, gapY: 60, speed: 0.35, holdScale: 1.7,
      ease: 1, low: "#000a08", high: "#2a6a5a", bg: "#000302", shape: "circle",
      waveform: "sine", pattern: "drops", fill: false, blur: 14, fxIris: 0.5,
      scene: "ink", scenePalette: "ocean", sceneMix: 0.45, sceneTiles: 0.7,
      sceneSpeed: 0.2, sceneDrive: 0.25, accent: "downbeat", syncBeats: 8 }],
    [246, "lastclimb", "gate", { // three bars gathering for the peak
      rows: 12, cols: 12, tileSize: 18, gapX: 16, gapY: 16, speed: 1.4, low: "#0c0800",
      high: "#ffe9a0", bg: "#000000", waveform: "square", pattern: "sparkle",
      spread: 0.7, fxZoom: 0.45, fxGrain: 0.3, scene: "ridge", scenePalette: "acid",
      sceneMix: 0.4, sceneTiles: 0.9, sceneSpeed: 1.1, sceneDrive: 0.65,
      accent: "gallop", syncBeats: 1 }, 3],
    [249, "zenith", "kal", { // the final peak: white-gold, full fold
      tileSize: 16, gapX: 28, gapY: 28, speed: 2.6, low: "#000000", high: "#fffbe8",
      bg: "#000000", shape: "circle", pattern: "drops", radiusTile: 0.5,
      fxBloom: 0.55, fxShutter: 0.3, fxKaleido: 0.7, fxKalRing: 0.85, fxKalIter: 1,
      fxKalSpin: 0.45, scene: "flame", scenePalette: "genome",
      sceneGenome: "gold phoenix", sceneMix: 1, sceneTiles: 0.15, sceneSpeed: 1.3,
      sceneScale: 0.55, sceneDrive: 0.9, accent: "four", syncBeats: 1 }],
    [253, "eventide", "quiet", { // the reel dims to violet
      rows: 3, cols: 4, tileSize: 90, gapX: 50, gapY: 50, speed: 0.5, holdScale: 1.6,
      ease: 1, low: "#040010", high: "#6a4aa0", bg: "#010004", shape: "circle",
      waveform: "sine", pattern: "drops", fill: false, blur: 12, fxTrails: 0.5,
      fxIris: 0.5, scene: "nebula", scenePalette: "neon", sceneGenome: "violet veil",
      sceneMix: 0.5, sceneTiles: 0.6, sceneSpeed: 0.3, sceneDrive: 0.3,
      accent: "downbeat", syncBeats: 4 }, 3],
    [255, "lightsout", "quiet", { // black, three seconds to spare
      rows: 1, cols: 1, tileSize: 100, speed: 0.2, holdScale: 1.8, ease: 1,
      low: "#000000", high: "#000000", bg: "#000000", waveform: "sine",
      pattern: "unison", fill: false, blur: 30, fxIris: 0.95, scene: "none",
      sceneMix: 0, accent: "downbeat", syncBeats: 8 }, 3],
  ];

  const JUNGLE_LOOKS = {};
  const JUNGLE_SCORE = JUNGLE_REEL.map(([bar, name, react, over, ramp]) => {
    JUNGLE_LOOKS[name] = jl(over, REACTS[react]);
    return ramp ? [bar, name, "none", { __ramp: ramp }] : [bar, name];
  });

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

  // ==========================================================================
  // SPORE CIRCUIT — 130.05 BPM (lock 3.59x, the analyzer's most confident),
  // bar 1.845s, 102 bars. Sections A1-20 / B21-64 (hot, e0.59) / A'65-76 /
  // B''77-102 (hottest). Measured drop at bar 47; 17 punches, all hit.
  // Bio-techno: a culture growing in a dish, bursting its walls on the drops.
  // ==========================================================================
  const SPORE_LOOKS = {
    A: { // petri dish — phyllotaxis colonies drifting over slow ink
      base: {
        rows: 8, cols: 8, tileSize: 26, gapX: 22, gapY: 22,
        speed: 0.8, holdScale: 0.8, desync: 0.3, ease: 0.7, border: 0,
        low: "#03140a", high: "#7ef29b", bg: "#010806", palette: "duo",
        layout: "spiral", shape: "circle", waveform: "sine",
        pattern: "ripple", spread: 1.2, blur: 3, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0.12, displace: 0, sizePulse: 0.35, merge: 0, counter: 0, nest: 0,
        fill: false, radiusTile: 0.5, fxBloom: 0.25, fxIris: 0.2, fxGrain: 0.15,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0.2, fxSlit: 0, fxCrt: 0,
        scene: "ink", scenePalette: "acid", sceneMix: 0.65, sceneTiles: 0.55,
        sceneSpeed: 0.5, sceneScale: 0.45, sceneDrive: 0.4, sceneWarp: 0.55,
        sceneGenome: "violet veil", accent: "four", syncBeats: 2,
      },
      react: { master: 1.0, attack: 0.02, release: 0.2, beatSense: 0.7, beatDecay: 0.25, accentDecay: 0.12,
        rows: [R("pulse", "sizePulse", 0.5), R("bass", "sceneDrive", 0.4), R("high", "spin", 0.3),
          R("bar", "sceneHue", 0.18), R("phrase", "sceneScale", 0.25), OFF] },
    },
    B: { // mycelium lattice — hex threadwork, rings, tight and dry
      base: {
        rows: 10, cols: 11, tileSize: 34, gapX: 12, gapY: 12,
        speed: 1, holdScale: 0.2, desync: 0.12, ease: 0.25, border: 0.8,
        low: "#0a1002", high: "#d8e84a", bg: "#050801", palette: "duo",
        layout: "hex", shape: "ring", waveform: "triangle",
        pattern: "drops", spread: 1, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0.15, sizePulse: 0.3, merge: 0.2, counter: 0, nest: 1,
        fill: true, radiusTile: 0.5, fxBloom: 0.15, fxIris: 0, fxGrain: 0.2,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0.12, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0.2,
        scene: "none", scenePalette: "acid", sceneMix: 0.3, sceneTiles: 1,
        sceneSpeed: 0.8, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
        sceneGenome: "violet veil", accent: "backbeat", syncBeats: 2,
      },
      react: { master: 1.2, attack: 0.015, release: 0.15, beatSense: 0.75, beatDecay: 0.2, accentDecay: 0.1,
        rows: [R("pulse", "tileSize", 0.6), R("pulse", "displace", 0.35), R("swing", "twist", 0.4),
          R("high", "desync", 0.3), R("bar", "merge", -0.25), R("beat", "sizePulse", 0.4)] },
    },
    C: { // sporeburst — the dish cracks, flame genome takes the frame
      base: {
        rows: 6, cols: 6, tileSize: 44, gapX: 34, gapY: 34,
        speed: 1.8, holdScale: 0.3, desync: 0.25, ease: 0.15, border: 0,
        low: "#100114", high: "#e26bff", bg: "#08010c", palette: "neon",
        layout: "radial", shape: "star", waveform: "triangle",
        pattern: "rings", spread: 1.3, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0.2, displace: 0.3, sizePulse: 0.5, merge: 0, counter: 0, nest: 0,
        fill: true, radiusTile: 0.2, fxBloom: 0.4, fxIris: 0, fxGrain: 0.15,
        fxKaleido: 0.45, fxTrails: 0, fxShutter: 0, fxRgb: 0.25, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0.3, fxSlit: 0, fxCrt: 0,
        scene: "flame", scenePalette: "genome", sceneGenome: "violet veil",
        sceneMix: 1, sceneTiles: 0.35, sceneSpeed: 1.1, sceneScale: 0.5,
        sceneDrive: 0.7, sceneWarp: 0.5, accent: "eighths", syncBeats: 1,
      },
      react: { master: 1.5, attack: 0.012, release: 0.12, beatSense: 0.8, beatDecay: 0.15, accentDecay: 0.09,
        rows: [R("pulse", "sceneDrive", 0.65), R("pulse", "fxBloom", 0.5), R("pulse", "fxKaleido", 0.3),
          R("bass", "sceneWarp", 0.4), R("bar", "sceneHue", 0.3), R("phrase", "spread", 0.3)] },
    },
    D: { // culture bloom — fat merged slabs, sunset-bright, wall to wall
      base: {
        rows: 5, cols: 7, tileSize: 120, gapX: 10, gapY: 10,
        speed: 1.3, holdScale: 0.4, desync: 0.1, ease: 0.1, border: 0,
        low: "#1c0602", high: "#ffb35c", bg: "#0d0301", palette: "sunset",
        layout: "brick", shape: "square", waveform: "square",
        pattern: "quarters", spread: 0.8, blur: 0, hueShift: 0, sceneHue: 0,
        rotate: 0, spin: 0, displace: 0, sizePulse: 0.25, merge: 0.9, counter: 0, nest: 0,
        fill: true, radiusTile: 0.3, fxBloom: 0.3, fxIris: 0, fxGrain: 0.1,
        fxKaleido: 0, fxTrails: 0, fxShutter: 0.25, fxRgb: 0, fxPixel: 0,
        fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
        scene: "none", scenePalette: "sunset", sceneMix: 0.3, sceneTiles: 1,
        sceneSpeed: 0.8, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
        sceneGenome: "violet veil", accent: "four", syncBeats: 1,
      },
      react: { master: 1.4, attack: 0.012, release: 0.11, beatSense: 0.85, beatDecay: 0.13, accentDecay: 0.08,
        rows: [R("pulse", "tileSize", 0.8), R("pulse", "fxBloom", 0.4), R("bar", "hueShift", 0.2),
          R("beat", "displace", 0.4), R("swing", "spread", -0.3), R("high", "fxGrain", 0.3)] },
    },
  };

  const SPORE_SCORE = [
    [1, "A"],                                     // the culture, growing
    [3, "A", "hue"],                              // PUNCH — drop
    [7, "B", "slow"],                             // PUNCH — drop; threads preview
    [11, "A", "shape"],
    [16, "B"],                                    // PUNCH — break returns
    [19, "C", "tight"],                           // PUNCH — drop; first crack
    [21, "C"],                                    // PUNCH + section B — burst
    [25, "D"],                                    // PUNCH — break returns
    [29, "B", "fast"],                            // PUNCH — groove settles in
    [32, "A", "scene"],
    [35, "C", "hue"],                             // PUNCH — groove change
    [37, "D", "tight"],                           // PUNCH — drop
    [40, "B", "offbeat"],                         // PUNCH — break returns
    [44, "A", "invert"],                          // PUNCH — break returns
    [47, "C", "burst", { sceneGenome: "firebird" }], // the measured big drop (86s)
    [49, "C", "fast"],                            // PUNCH — build
    [53, "B", "hue"],
    [59, "D", "shape"],                           // PUNCH — groove change
    [63, "A", "tiles", { scene: "ridge", scenePalette: "acid", sceneMix: 0.5 }],
    [65, "A", "slow"],                            // section A' — the dish rests
    [69, "B", "gallop"],
    [73, "C", "scene"],                           // PUNCH — build
    [77, "D", "hue"],                             // section B'' — hottest stretch
    [78, "C", "burst"],                           // PUNCH — build
    [80, "B", "fast"],                            // PUNCH — groove change
    [84, "D", "invert"],
    [88, "C", "stutter", { sceneGenome: "gold phoenix" }],
    [92, "B", "hue"],
    [98, "D", "blast"],                           // PUNCH — final drop
    [100, "A", "slow", { __ramp: 3, fxTrails: 0.5, sceneMix: 0, fxIris: 0.95, speed: 0.3 }],
  ];

  // ==========================================================================
  // ZION RIPS v2 — 155.2 BPM, 133 bars, 16-bar phrases from bar 21.
  // James's second brief (2026-07-31): *"lull them into complacency with a
  // little A B A B. But then you're gonna rock it off into a journey to
  // infinity and beyond. Take them someplace they've never been and never
  // return."* So: bars 1–19 are a hypnotic two-look seesaw riding the
  // stutter intro. From bar 21 the set is a ONE-WAY TRIP — twenty-nine
  // looks, every one built fresh on the reset chassis (ZBASE), no look ever
  // played twice, no return to A or B. Still tight to the grid: every event
  // sits on a punch bar or 8/16 phrase mark, grooves run syncBeats 1–2 with
  // pulse/bar/swing matrices, and the b82–91 break gets its own deep-water
  // pair before the b91 supernova rips back in.
  // ==========================================================================
  // The reset chassis: a complete neutral state. Every journey look spreads
  // over this, so each event fully determines the frame — no FX or motion
  // bleeding through from the look before.
  const ZBASE = {
    rows: 8, cols: 8, tileSize: 40, gapX: 16, gapY: 16,
    speed: 1, holdScale: 0.2, desync: 0.1, ease: 0.3, border: 0,
    low: "#050505", high: "#e8e8e8", bg: "#020202", palette: "duo",
    layout: "grid", shape: "square", waveform: "triangle",
    pattern: "unison", spread: 1, blur: 0, hueShift: 0, sceneHue: 0,
    rotate: 0, spin: 0, displace: 0, sizePulse: 0.25, merge: 0, counter: 0, nest: 0,
    fill: true, radiusTile: 0, fxBloom: 0.2, fxIris: 0, fxGrain: 0.15,
    fxKaleido: 0, fxTrails: 0, fxShutter: 0, fxRgb: 0, fxPixel: 0,
    fxZoom: 0, fxZoomRot: 0, fxWarp: 0, fxSlit: 0, fxCrt: 0,
    scene: "none", scenePalette: "duo", sceneMix: 0.5, sceneTiles: 1,
    sceneSpeed: 0.8, sceneScale: 0.5, sceneDrive: 0.5, sceneWarp: 0.5,
    sceneGenome: "amber globe", accent: "four", syncBeats: 1,
  };
  const zl = (over, react) => ({ base: Object.assign({}, ZBASE, over), react });
  const zr = (rows, over) => Object.assign({ master: 1.3, attack: 0.012, release: 0.12,
    beatSense: 0.8, beatDecay: 0.16, accentDecay: 0.08, rows }, over || {});

  const ZION_LOOKS = {
    // --- the lull: two looks, traded straight, then abandoned forever ------
    A: zl({
      rows: 7, cols: 9, tileSize: 30, gapX: 18, gapY: 26, speed: 0.8,
      holdScale: 0.6, ease: 0.35, border: 1, desync: 0.05,
      low: "#030a04", high: "#8fbf62", bg: "#010301", fill: false,
      shape: "bar", pattern: "rows-alt", spread: 0.9, blur: 2,
      sizePulse: 0.2, merge: 0.15, fxIris: 0.3, fxGrain: 0.25, fxCrt: 0.5,
      scene: "ridge", scenePalette: "crt", sceneMix: 0.55, sceneTiles: 0.7,
      sceneSpeed: 0.4, sceneScale: 0.45, sceneDrive: 0.3, sceneWarp: 0.4,
      accent: "downbeat", syncBeats: 2,
    }, zr([R("pulse", "tileSize", 0.55), R("pulse", "fxBloom", 0.4), R("bar", "merge", 0.25),
      R("swing", "spread", 0.25), R("bass", "sceneDrive", 0.35), OFF],
      { master: 1.1, release: 0.16, beatDecay: 0.2, accentDecay: 0.1 })),
    B: zl({
      rows: 9, cols: 10, tileSize: 42, gapX: 10, gapY: 10,
      holdScale: 0.1, ease: 0.1, border: 0.8, desync: 0.06,
      low: "#0c0502", high: "#e8a33c", bg: "#040201",
      layout: "hex", shape: "hexagon", waveform: "square",
      pattern: "checkerboard", spread: 0.9, displace: 0.12, sizePulse: 0.35,
      merge: 0.25, radiusTile: 0.1, fxGrain: 0.2, fxRgb: 0.15, fxCrt: 0.3,
      accent: "four",
    }, zr([R("pulse", "tileSize", 0.75), R("pulse", "displace", 0.4), R("pulse", "fxRgb", 0.35),
      R("swing", "twist", 0.4), R("bar", "merge", -0.3), R("high", "desync", 0.25)])),

    // --- the journey: 29 looks, played once each, in order, never again ----
    shatter: zl({ // b21 — the engine window breaks into a 12-way rose
      rows: 5, cols: 9, tileSize: 56, layout: "radial", shape: "star",
      pattern: "rings", low: "#12041f", high: "#f2f24f", bg: "#050110",
      palette: "neon", spread: 1.3, fxKaleido: 0.9, fxBloom: 0.35, fxRgb: 0.2,
      spin: 0.15, accent: "eighths",
    }, zr([R("pulse", "fxKaleido", 0.25), R("pulse", "tileSize", 0.6), R("swing", "twist", 0.5),
      R("bar", "hueShift", 0.3), R("high", "fxRgb", 0.3), OFF])),
    barcode: zl({ // b23 — scanning lasers read the crowd
      rows: 3, cols: 20, tileSize: 90, gapX: 6, gapY: 30, shape: "slit",
      waveform: "saw", pattern: "columns-alt", low: "#020202", high: "#f2f2f2",
      bg: "#000000", fxSlit: 0.35, spread: 0.6, accent: "sixteenths",
    }, zr([R("pulse", "fxSlit", 0.4), R("pulse", "tileSize", 0.5), R("high", "desync", 0.35),
      R("swing", "spread", 0.4), R("bar", "displace", 0.25), OFF])),
    magma: zl({ // b29 — the floor is lava, cathedral flames underneath
      rows: 6, cols: 7, tileSize: 110, gapX: 8, gapY: 8, layout: "brick",
      waveform: "sine", pattern: "drops", palette: "lava", low: "#1c0300",
      high: "#ff7b24", bg: "#0a0100", merge: 0.92, ease: 0.6, holdScale: 0.6,
      speed: 0.9, scene: "flame", scenePalette: "genome",
      sceneGenome: "ember cathedral", sceneMix: 0.8, sceneTiles: 0.5,
      sceneDrive: 0.6, accent: "backbeat", syncBeats: 2,
    }, zr([R("pulse", "sceneDrive", 0.6), R("bass", "sceneWarp", 0.45), R("pulse", "merge", 0.3),
      R("bar", "sceneHue", 0.2), R("lowmid", "tileSize", 0.4), OFF])),
    reef: zl({ // b33 — phosphor rings breathing in cold water
      rows: 9, cols: 9, tileSize: 34, gapX: 24, gapY: 24, shape: "ring",
      waveform: "sine", pattern: "ripple", palette: "ocean", low: "#01131c",
      high: "#4fe8d0", bg: "#000a10", counter: 0.6, ease: 0.9, holdScale: 0.8,
      speed: 0.7, fill: false, radiusTile: 0.5, scene: "ink",
      scenePalette: "ocean", sceneMix: 0.55, sceneTiles: 0.6, sceneSpeed: 0.45,
      sceneWarp: 0.6, accent: "clave", syncBeats: 2,
    }, zr([R("pulse", "counter", 0.3), R("mid", "sceneDrive", 0.4), R("pulse", "sizePulse", 0.45),
      R("phrase", "sceneScale", 0.3), R("bar", "sceneHue", 0.15), OFF])),
    strobehall: zl({ // b38 — a white corridor slams its doors in time
      rows: 12, cols: 3, tileSize: 150, gapX: 20, gapY: 6, shape: "bar",
      waveform: "square", pattern: "snake", low: "#f4f4f4", high: "#0a0a0a",
      bg: "#101010", holdScale: 0, ease: 0, fxShutter: 0.5, fxGrain: 0.1,
      speed: 1.4, accent: "four",
    }, zr([R("pulse", "fxShutter", 0.35), R("pulse", "tileSize", 0.7), R("swing", "spread", -0.35),
      R("beat", "displace", 0.5), R("bar", "merge", 0.3), OFF],
      { master: 1.5, attack: 0.01, release: 0.09 })),
    pinwheel: zl({ // b42 — a galaxy spins up from the spiral seed
      rows: 10, cols: 10, tileSize: 22, layout: "spiral", shape: "circle",
      pattern: "pinwheel", palette: "rainbow", low: "#0a0416", high: "#c8b8ff",
      bg: "#030109", spin: 0.5, rotate: 0.3, fill: false, radiusTile: 0.5,
      scene: "nebula", scenePalette: "neon", sceneMix: 0.7, sceneTiles: 0.55,
      sceneSpeed: 1.1, blur: 1.5, accent: "offbeat", syncBeats: 2,
    }, zr([R("pulse", "spin", 0.3), R("pulse", "tileSize", 0.5), R("bar", "sceneHue", 0.35),
      R("high", "sceneDrive", 0.4), R("phrase", "sceneScale", -0.3), OFF])),
    acidmelt: zl({ // b48 — the checkerboard liquefies
      rows: 10, cols: 12, tileSize: 60, gapX: 4, gapY: 4, waveform: "sine",
      pattern: "checkerboard", palette: "acid", low: "#0c1400", high: "#c8f23c",
      bg: "#050900", fxWarp: 0.8, ease: 1, holdScale: 1, speed: 0.8,
      merge: 0.3, accent: "gallop", syncBeats: 2,
    }, zr([R("pulse", "fxWarp", 0.3), R("lowmid", "merge", 0.4), R("pulse", "sizePulse", 0.5),
      R("bar", "hueShift", 0.25), R("swing", "twist", 0.45), OFF])),
    drummachine: zl({ // b52 — four decoded tempos stacked like an 808 grid
      rows: 8, cols: 14, tileSize: 46, gapX: 8, gapY: 18, shape: "bar",
      waveform: "square", pattern: "tempo-rows", low: "#140a02", high: "#ffb838",
      bg: "#070300", border: 1.4, fxCrt: 0.6, fxGrain: 0.3, accent: "sixteenths",
    }, zr([R("pulse", "tileSize", 0.65), R("pulse", "fxRgb", 0.3), R("high", "desync", 0.4),
      R("swing", "spread", 0.5), R("beat", "sizePulse", 0.5), OFF])),
    dotmatrix: zl({ // b55 — the picture decides it's made of pixels
      rows: 18, cols: 18, tileSize: 14, gapX: 10, gapY: 10, shape: "circle",
      pattern: "sparkle", palette: "rainbow", low: "#080808", high: "#e8e8e8",
      bg: "#020202", fxPixel: 0.55, radiusTile: 0.5, desync: 0.5,
      fill: false, accent: "eighths",
    }, zr([R("pulse", "fxPixel", 0.25), R("high", "desync", 0.35), R("pulse", "tileSize", 0.6),
      R("bar", "hueShift", 0.4), R("mid", "sizePulse", 0.4), OFF])),
    temple: zl({ // b61 — hexagonal gold under sunset light
      rows: 6, cols: 8, tileSize: 88, gapX: 12, gapY: 12, layout: "hex",
      shape: "hexagon", pattern: "x-cross", palette: "sunset", low: "#170804",
      high: "#ffc06a", bg: "#090301", merge: 0.7, holdScale: 0.5, ease: 0.5,
      fxBloom: 0.4, speed: 0.9, accent: "backbeat", syncBeats: 2,
    }, zr([R("pulse", "fxBloom", 0.45), R("pulse", "merge", 0.3), R("bass", "tileSize", 0.5),
      R("bar", "sceneHue", 0.2), R("phrase", "spread", 0.35), OFF])),
    ghost: zl({ // b65 — the negative afterimage floats past
      rows: 5, cols: 5, tileSize: 70, gapX: 40, gapY: 40, shape: "circle",
      waveform: "sine", pattern: "quarters", low: "#e8e2d6", high: "#141210",
      bg: "#d9d2c4", blur: 25, fxTrails: 0.4, ease: 1, holdScale: 1.4,
      speed: 0.5, fill: false, radiusTile: 0.5, accent: "downbeat", syncBeats: 4,
    }, zr([R("pulse", "blur", -0.4), R("mid", "sizePulse", 0.4), R("bar", "spread", 0.4),
      R("phrase", "hueShift", 0.15), OFF, OFF],
      { master: 0.9, attack: 0.03, release: 0.3 })),
    lasercage: zl({ // b68 — crossed beams, nowhere to stand
      rows: 9, cols: 9, tileSize: 52, gapX: 14, gapY: 14, shape: "cross",
      waveform: "square", pattern: "edges", palette: "neon", low: "#10021c",
      high: "#ff3ad8", bg: "#06010c", fxRgb: 0.5, displace: 0.3, rotate: 0.25,
      accent: "stutter",
    }, zr([R("pulse", "displace", 0.5), R("pulse", "fxRgb", 0.35), R("pulse", "tileSize", 0.6),
      R("swing", "rotate", 0.4), R("high", "fxBloom", 0.4), OFF])),
    flock: zl({ // b73 — triangles scatter like birds off a wire
      rows: 11, cols: 13, tileSize: 26, gapX: 20, gapY: 20, shape: "triangle",
      pattern: "scatter", low: "#041206", high: "#7df29e", bg: "#010603",
      rotate: 0.7, desync: 0.55, displace: 0.25, sizePulse: 0.5, fill: false,
      accent: "gallop",
    }, zr([R("pulse", "displace", 0.45), R("high", "rotate", 0.35), R("pulse", "sizePulse", 0.5),
      R("swing", "twist", 0.5), R("bar", "hueShift", 0.2), OFF])),
    hexstorm: zl({ // b77 — the lattice shakes itself apart (build to the break)
      rows: 12, cols: 12, tileSize: 38, gapX: 8, gapY: 8, layout: "hex",
      shape: "diamond", pattern: "drops", low: "#0d0714", high: "#b89ae8",
      bg: "#040208", desync: 0.6, displace: 0.92, sizePulse: 0.6, spread: 1.5,
      fxGrain: 0.35, accent: "eighths",
    }, zr([R("pulse", "displace", 0.6), R("pulse", "desync", 0.3), R("bass", "tileSize", 0.6),
      R("swing", "spread", 0.4), R("high", "fxGrain", 0.3), OFF],
      { master: 1.5 })),
    deepsea: zl({ // b82 — THE BREAK: all the machinery sinks underwater
      rows: 6, cols: 6, tileSize: 24, gapX: 44, gapY: 44, layout: "radial",
      shape: "circle", waveform: "sine", pattern: "rings", palette: "ocean",
      low: "#01070e", high: "#3d76a8", bg: "#000409", speed: 0.45,
      holdScale: 1.2, ease: 1, desync: 0.35, spin: 0.06, fill: false,
      radiusTile: 0.5, blur: 6, fxIris: 0.4, fxTrails: 0.3, fxBloom: 0.3,
      scene: "ink", scenePalette: "ocean", sceneMix: 0.85, sceneTiles: 0.35,
      sceneSpeed: 0.3, sceneDrive: 0.3, sceneWarp: 0.6,
      accent: "downbeat", syncBeats: 8,
    }, zr([R("mid", "sceneDrive", 0.35), R("pulse", "sizePulse", 0.35), R("bar", "sceneHue", 0.12),
      R("lowmid", "blur", 0.2), R("phrase", "fxIris", 0.15), OFF],
      { master: 0.85, attack: 0.04, release: 0.4, beatDecay: 0.35, accentDecay: 0.22 })),
    horizon: zl({ // b86 — the quiet floor: light bends around a black center
      rows: 4, cols: 4, tileSize: 16, gapX: 60, gapY: 60, layout: "radial",
      shape: "ring", waveform: "sine", pattern: "rings", low: "#02020a",
      high: "#1c2a66", bg: "#010104", speed: 0.3, holdScale: 1.6, ease: 1,
      fill: false, radiusTile: 0.5, blur: 10, fxBloom: 0.45, fxTrails: 0.35,
      scene: "nebula", scenePalette: "genome", sceneGenome: "violet veil",
      sceneMix: 0.7, sceneTiles: 0.2, sceneSpeed: 0.25, sceneScale: 0.7,
      accent: "none", syncBeats: 16,
    }, zr([R("level", "sceneDrive", 0.3), R("bar", "sceneHue", 0.1), R("lowmid", "blur", 0.25),
      OFF, OFF, OFF],
      { master: 0.7, attack: 0.05, release: 0.5, beatDecay: 0.4, accentDecay: 0.3 })),
    supernova: zl({ // b91 — the drop back in: everything ignites at once
      rows: 7, cols: 7, tileSize: 96, gapX: 10, gapY: 10, layout: "radial",
      shape: "star", waveform: "square", pattern: "rings", palette: "lava",
      low: "#1a0200", high: "#ffdd30", bg: "#0c0100", speed: 1.8,
      sizePulse: 0.7, displace: 0.4, spread: 1.4, fxBloom: 0.55, fxShutter: 0.45,
      fxRgb: 0.3, scene: "flame", scenePalette: "genome", sceneGenome: "firebird",
      sceneMix: 1, sceneTiles: 0.4, sceneSpeed: 1.3, sceneDrive: 0.97,
      sceneWarp: 0.96, accent: "four",
    }, zr([R("pulse", "sceneDrive", 0.7), R("pulse", "tileSize", 0.8), R("pulse", "fxBloom", 0.5),
      R("bass", "sceneWarp", 0.5), R("swing", "displace", 0.4), R("bar", "sceneHue", 0.25)],
      { master: 1.7, attack: 0.008, release: 0.09 })),
    tunnel: zl({ // b93 — the feedback corridor opens; we fly down it
      rows: 8, cols: 8, tileSize: 44, gapX: 24, gapY: 24, shape: "square",
      pattern: "rings", palette: "rainbow", low: "#060606", high: "#f2f2f2",
      bg: "#000000", fxZoom: 0.4, fxZoomRot: 0.22, fxBloom: 0.3, fill: false,
      accent: "eighths",
    }, zr([R("pulse", "fxZoom", 0.2), R("swing", "fxZoomRot", 0.2), R("pulse", "tileSize", 0.6),
      R("bar", "hueShift", 0.35), R("high", "fxBloom", 0.35), OFF])),
    serpent: zl({ // b98 — one long rainbow body winds through the grid
      rows: 10, cols: 16, tileSize: 30, gapX: 6, gapY: 6, shape: "ring",
      pattern: "snake", palette: "rainbow", low: "#0a0a0a", high: "#e8e8e8",
      bg: "#030303", spread: 1.8, radiusTile: 0.5, desync: 0.2,
      accent: "clave", syncBeats: 2,
    }, zr([R("pulse", "spread", -0.35), R("pulse", "tileSize", 0.55), R("bar", "hueShift", 0.45),
      R("swing", "twist", 0.5), R("mid", "sizePulse", 0.45), OFF])),
    twinsuns: zl({ // b102 — two counter-phased stars eclipse each other
      rows: 2, cols: 8, tileSize: 120, gapX: 30, gapY: 80, layout: "radial",
      shape: "circle", waveform: "sine", pattern: "checkerboard",
      palette: "sunset", low: "#140500", high: "#ffcf5c", bg: "#070200",
      counter: 0.9, sizePulse: 0.5, radiusTile: 0.5, fxBloom: 0.5, fill: false,
      accent: "backbeat",
    }, zr([R("pulse", "counter", 0.25), R("pulse", "fxBloom", 0.4), R("bass", "tileSize", 0.7),
      R("bar", "hueShift", 0.2), R("phrase", "spread", 0.4), OFF])),
    graveyard: zl({ // b106 — a wall of dying televisions
      rows: 6, cols: 9, tileSize: 78, gapX: 14, gapY: 20, shape: "square",
      waveform: "square", pattern: "rows-alt", low: "#061006", high: "#9fe89a",
      bg: "#020402", border: 2, fxCrt: 0.8, fxGrain: 0.5, fxRgb: 0.2,
      holdScale: 0.4, accent: "offbeat", syncBeats: 2,
    }, zr([R("pulse", "fxRgb", 0.4), R("high", "fxGrain", 0.35), R("pulse", "tileSize", 0.5),
      R("beat", "displace", 0.4), R("swing", "spread", 0.3), OFF])),
    confetti: zl({ // b110 — the club ceiling opens, everything falls
      rows: 16, cols: 16, tileSize: 18, gapX: 14, gapY: 14, shape: "diamond",
      pattern: "scatter", palette: "rainbow", low: "#0a0a0a", high: "#f2f2f2",
      bg: "#030303", desync: 0.92, sizePulse: 0.9, rotate: 0.5, displace: 0.35,
      fill: false, accent: "sixteenths",
    }, zr([R("pulse", "sizePulse", 0.6), R("pulse", "displace", 0.5), R("high", "rotate", 0.4),
      R("bar", "hueShift", 0.5), R("swing", "desync", 0.3), OFF])),
    xray: zl({ // b112 — the drop strips everything to bones
      rows: 5, cols: 14, tileSize: 66, gapX: 8, gapY: 26, shape: "slit",
      waveform: "square", pattern: "bounce-x", low: "#dce8f2", high: "#0a1420",
      bg: "#c4d4e0", fxRgb: 0.4, fxShutter: 0.3, spread: 0.7,
      accent: "four",
    }, zr([R("pulse", "tileSize", 0.7), R("pulse", "fxShutter", 0.3), R("swing", "displace", 0.45),
      R("bar", "merge", 0.3), R("high", "fxRgb", 0.3), OFF],
      { master: 1.5, attack: 0.01 })),
    clockwork: zl({ // b119 — chevron gears at four different speeds
      rows: 9, cols: 11, tileSize: 48, gapX: 12, gapY: 12, shape: "chevron",
      pattern: "tempo-cols", low: "#120c02", high: "#d8a848", bg: "#060401",
      border: 1, nest: 2, rotate: 0.15, fxGrain: 0.25, accent: "gallop",
      syncBeats: 2,
    }, zr([R("pulse", "tileSize", 0.55), R("swing", "rotate", 0.35), R("pulse", "sizePulse", 0.45),
      R("bar", "merge", 0.25), R("lowmid", "spread", 0.35), OFF])),
    prism: zl({ // b124 — light through broken glass, bent and multiplied
      rows: 7, cols: 7, tileSize: 58, gapX: 18, gapY: 18, shape: "triangle",
      pattern: "diagonal", palette: "rainbow", low: "#0c0c14", high: "#e8e8f2",
      bg: "#040408", fxKaleido: 0.6, fxWarp: 0.4, fxBloom: 0.35, rotate: 0.4,
      accent: "eighths",
    }, zr([R("pulse", "fxKaleido", 0.3), R("pulse", "fxWarp", 0.25), R("bar", "hueShift", 0.4),
      R("high", "fxBloom", 0.4), R("swing", "rotate", 0.4), OFF])),
    whitehole: zl({ // b127 — THE final drop: a supernova in negative
      rows: 6, cols: 6, tileSize: 190, gapX: 12, gapY: 12, waveform: "square",
      pattern: "quarters", low: "#ffffff", high: "#100e0c", bg: "#f2ede2",
      merge: 0.5, sizePulse: 0.5, fxShutter: 0.75, blur: 3, fxBloom: 0.3,
      accent: "four",
    }, zr([R("pulse", "tileSize", 0.9), R("pulse", "blur", 0.5), R("pulse", "fxShutter", 0.35),
      R("swing", "spread", -0.4), R("beat", "displace", 0.55), R("bar", "merge", 0.35)],
      { master: 1.7, attack: 0.008, release: 0.08 })),
    afterimage: zl({ // b129 — neon burns fading on the retina
      rows: 12, cols: 12, tileSize: 20, gapX: 22, gapY: 22, shape: "circle",
      pattern: "sparkle", palette: "neon", low: "#060606", high: "#e8e8e8",
      bg: "#010101", fxTrails: 0.6, fxBloom: 0.45, spin: 0.25, desync: 0.5,
      fill: false, radiusTile: 0.5, accent: "offbeat",
    }, zr([R("pulse", "fxBloom", 0.5), R("pulse", "sizePulse", 0.5), R("high", "desync", 0.35),
      R("bar", "hueShift", 0.35), R("swing", "spin", 0.25), OFF])),
    ascension: zl({ // b131 — the tiles let go; only nebula light remains
      rows: 3, cols: 3, tileSize: 12, gapX: 80, gapY: 80, shape: "circle",
      waveform: "sine", pattern: "unison", low: "#040210", high: "#8a7ad8",
      bg: "#010008", speed: 0.5, ease: 1, holdScale: 1, fill: false,
      radiusTile: 0.5, fxZoom: 0.3, fxBloom: 0.4, scene: "nebula",
      scenePalette: "genome", sceneGenome: "violet veil", sceneMix: 1,
      sceneTiles: 0.1, sceneSpeed: 0.6, sceneScale: 0.6, sceneDrive: 0.6,
      accent: "downbeat", syncBeats: 4,
    }, zr([R("level", "sceneDrive", 0.4), R("pulse", "fxZoom", 0.15), R("bar", "sceneHue", 0.2),
      R("phrase", "sceneScale", 0.3), OFF, OFF],
      { master: 1.0, attack: 0.03, release: 0.35 })),
    void: zl({ // b133 — no return: the iris closes on somewhere new
      rows: 1, cols: 1, tileSize: 30, gapX: 100, gapY: 100, shape: "circle",
      waveform: "sine", pattern: "unison", low: "#010102", high: "#0a0a14",
      bg: "#000000", speed: 0.25, ease: 1, fill: false, radiusTile: 0.5,
      blur: 90, fxIris: 0.95, fxTrails: 0.5, scene: "none", sceneMix: 0,
      accent: "none", syncBeats: 0,
    }, zr([R("level", "fxBloom", 0.2), OFF, OFF, OFF, OFF, OFF],
      { master: 0.5, attack: 0.05, release: 0.5 })),
  };

  const ZION_SCORE = [
    // The lull — A B A B on the stutter intro's own punches. Last sighting.
    [1, "A"],
    [4, "B"],                                     // PUNCH — build
    [7, "A", "offbeat"],                          // PUNCH — drop
    [9, "B", "offbeat"],                          // PUNCH — build
    [12, "A", "invert"],                          // PUNCH — drop, inverted smirk
    [14, "B", "invert"],                          // PUNCH — groove
    [17, "A", "tight"],                           // PUNCH — drop
    [19, "B", "tight"],                           // PUNCH — groove
    // The journey. Nothing below repeats. Ever.
    [21, "shatter"],                              // PUNCH + PHRASE — departure
    [23, "barcode"],                              // PUNCH
    [29, "magma"],                                // 8-bar mark
    [33, "reef"],
    [38, "strobehall"],                           // PUNCH
    [42, "pinwheel"],                             // PUNCH — drop
    [48, "acidmelt"],                             // PUNCH
    [52, "drummachine"],                          // PUNCH
    [55, "dotmatrix"],                            // PUNCH
    [61, "temple"],                               // PUNCH + 8-bar mark
    [65, "ghost"],
    [68, "lasercage"],                            // PUNCH
    [73, "flock"],                                // PUNCH
    [77, "hexstorm"],                             // 8-bar mark — build to the break
    [82, "deepsea"],                              // PUNCH — THE BREAK
    [86, "horizon", "none", { __ramp: 2 }],       // PUNCH — quiet floor, glide down
    [91, "supernova"],                            // PUNCH — DROP back in
    [93, "tunnel"],                               // PUNCH + PHRASE
    [98, "serpent"],                              // PUNCH
    [102, "twinsuns"],                            // PUNCH — drop
    [106, "graveyard"],                           // PUNCH
    [110, "confetti"],                            // PUNCH
    [112, "xray"],                                // PUNCH — drop
    [119, "clockwork"],                           // PUNCH
    [124, "prism"],                               // PUNCH
    [127, "whitehole"],                           // PUNCH — THE final drop
    [129, "afterimage"],                          // PUNCH
    [131, "ascension"],                           // PUNCH
    // Bar 133 starts 2.7s before the file ends — the ramp must fit inside.
    [133, "void", "none", { __ramp: 1.5 }],       // PUNCH — gone for good
  ];

  globalThis.LUMINA_COMPOSITIONS = {
    "Angular Ritual.mp3": build("Angular Ritual.mp3", ANGULAR_LOOKS, ANGULAR_SCORE),
    "Jungle Moog Ritual.mp3": build("Jungle Moog Ritual.mp3", JUNGLE_LOOKS, JUNGLE_SCORE),
    "Timber at Sea.mp3": build("Timber at Sea.mp3", TIMBER_LOOKS, TIMBER_SCORE),
    "Spore Circuit.mp3": build("Spore Circuit.mp3", SPORE_LOOKS, SPORE_SCORE),
    "Zion Rips.mp3": build("Zion Rips.mp3", ZION_LOOKS, ZION_SCORE),
  };
  globalThis.LUMINA_LOOKS = {
    "Angular Ritual.mp3": ANGULAR_LOOKS,
    "Jungle Moog Ritual.mp3": JUNGLE_LOOKS,
    "Timber at Sea.mp3": TIMBER_LOOKS,
    "Spore Circuit.mp3": SPORE_LOOKS,
    "Zion Rips.mp3": ZION_LOOKS,
  };
})();
