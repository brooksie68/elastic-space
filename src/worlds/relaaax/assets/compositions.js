// Relaaax — Claude's visual DJ sets, one per Suno track. v2 2026-07-24: re-
// choreographed with the full expansion — shapes, layouts (radial/spiral/
// brick/hex), Mondrian merges, palettes + hue, waveform morphs, displacement,
// size-pulse, counter/nest layers, and the WebGL FX rack (trails, feedback
// zoom, pixelate, RGB split, warp, slit-scan, kaleidoscope, bloom, grain,
// CRT, shutter, iris). Event times are MEASURED moments from
// tmp/relaaax/track-analyze.mjs (BPM, drops, sections, quiets) — not guesses.
// Played by composition.js; toggled in the audio tab ("claude's set").
//
// Event shape: { at: seconds, label, base: {field params}, ramp: seconds,
// react: {reactivity partial, rows replaces the whole matrix} }. Numerics and
// hex colors ramp; strings/booleans snap. Each set opens with a full base so
// it plays identically no matter where James left his sliders.
(function () {
  "use strict";

  const D = globalThis.RelaaaxField.DEFAULTS;
  const full = (over) => Object.assign({}, D, over);
  const R = (src, tgt, amt) => ({ src, tgt, amt });
  const OFF = R("off", "ease", 0);

  // ==========================================================================
  // ANGULAR RITUAL — 207s, 76 BPM (bar 3.157s). Occult machinery in ember and
  // bone: drops measured at 25s / 59s / 178s, breath-holds at 18–24s and
  // 174–177s. Arc: iris-dark temple -> diamond fire rite -> circle-white
  // inversion with pixel-crunch hits -> spinning triangle tunnel -> brick CRT
  // furnace -> radial ring shrine -> square-wave consumption -> void ->
  // white shutter hammer with RGB tearing -> sine afterglow, iris out.
  // ==========================================================================
  const angularBar = 240 / 76.01;
  const ANGULAR = [
    { at: 0, label: "ember temple", base: full({
        rows: 5, cols: 5, tileSize: 18, gapX: 30, gapY: 30,
        speed: 0.5, holdScale: 1.4, desync: 0.05, ease: 0.55, border: 0.5,
        low: "#000000", high: "#3d0a08", bg: "#000000",
        pattern: "rings", spread: 0.8, blur: 10,
        fxBloom: 0.15, fxIris: 0.35, fxGrain: 0.15,
      }),
      react: { master: 0.7, attack: 0.05, release: 0.4, beatSense: 0.6, beatDecay: 0.45,
        rows: [R("bass", "fxBloom", 0.3), R("beat", "tileSize", 0.25), R("level", "speed", 0.15), R("mid", "spread", 0.2), OFF, OFF] } },
    { at: 12, label: "first pulse", ramp: 6, base: { high: "#6e120c", fxBloom: 0.25 } },
    { at: 18, label: "held breath", ramp: 3, base: { speed: 0.28, blur: 26, high: "#200404", fxIris: 0.65 } },
    { at: 25 - angularBar / 2, label: "coil", ramp: 1.4, base: { spread: 0.2, tileSize: 10, fxIris: 0.8 } },
    { at: 25, label: "drop I — the rite", base: {
        low: "#000000", high: "#ff2f10", bg: "#120202", palette: "lava",
        pattern: "x-cross", shape: "diamond", spread: 1.2, speed: 1.6, tileSize: 62,
        rows: 7, cols: 7, gapX: 26, gapY: 26, blur: 0, holdScale: 0.6, ease: 0.2,
        fill: true, border: 1.5, fxIris: 0, fxBloom: 0.3, fxGrain: 0.2,
      },
      react: { master: 1.15, attack: 0.02, release: 0.18, beatSense: 0.7, beatDecay: 0.3,
        rows: [R("beat", "tileSize", 0.7), R("beat", "fxRgb", 0.5), R("bass", "fxBloom", 0.4), R("beat", "twist", 0.5), R("high", "desync", 0.3), R("level", "speed", 0.25)] } },
    { at: 33, label: "ember shift", ramp: 5, base: { hueShift: 0.06 } },
    { at: 41, label: "grate", ramp: 10, base: { pattern: "checkerboard", shape: "cross", twist: 0.55, spread: 1.0, merge: 0.35 } },
    { at: 50, label: "winding", ramp: 7, base: { speed: 2.4, spread: 1.8, blur: 6, fxZoom: 0.25, fxZoomRot: 0.2, hueShift: 0.12 } },
    { at: 59, label: "drop II — inversion", base: {
        palette: "duo", low: "#ffffff", high: "#0a0a0a", bg: "#efe7da", hueShift: 0,
        pattern: "quarters", shape: "circle", tileSize: 92, radiusTile: 0.5,
        rows: 6, cols: 6, gapX: 40, gapY: 40, speed: 1.4, blur: 0, spread: 0.9,
        twist: 0.2, holdScale: 0.8, fill: true, merge: 0,
        fxZoom: 0, fxZoomRot: 0, fxShutter: 0.3, fxBloom: 0.2,
      },
      react: { master: 1.1, beatSense: 0.7, beatDecay: 0.28,
        rows: [R("beat", "twist", 0.8), R("beat", "fxPixel", 0.45), R("bass", "tileSize", 0.5), R("beat", "blur", 0.4), R("high", "desync", 0.25), R("level", "speed", 0.2)] } },
    { at: 73, label: "back to black", base: {
        palette: "lava", low: "#000000", high: "#d81f1f", bg: "#0a0000",
        pattern: "pinwheel", shape: "triangle", spread: 1.4, twist: 0.35,
        tileSize: 44, rows: 8, cols: 8, radiusTile: 0, fill: true, speed: 1.7,
        blur: 0, spin: 0.12, fxShutter: 0, fxZoom: 0.35, fxZoomRot: 0.3, fxBloom: 0.35, fxPixel: 0,
      } },
    { at: 88, label: "brick furnace", base: {
        layout: "brick", pattern: "tempo-rows", shape: "square", spin: 0,
        hueShift: 0.08, twist: 0.5, rows: 9, cols: 9, tileSize: 36, blur: 2,
        merge: 0.25, fxZoom: 0, fxZoomRot: 0, fxCrt: 0.45, fxGrain: 0.3,
      } },
    { at: 108, label: "chevron creed", base: {
        layout: "grid", pattern: "diagonal", shape: "chevron", spread: 1.6,
        tileSize: 54, ease: 0.4, displace: 0.12, merge: 0,
        fxCrt: 0, fxSlit: 0.25, fxGrain: 0.2,
      } },
    { at: 121, label: "ring shrine", base: {
        layout: "radial", pattern: "rings", shape: "ring", rows: 6, cols: 14,
        tileSize: 30, gapX: 18, gapY: 18, spread: 2, speed: 1.9, blur: 0,
        twist: 0, displace: 0, fxSlit: 0, fxZoom: 0.45, fxZoomRot: 0.15, fxBloom: 0.4,
      },
      react: { rows: [R("beat", "tileSize", 0.6), R("mid", "spread", 0.5), R("bass", "fxBloom", 0.4), R("beat", "fxZoomRot", 0.4), R("level", "speed", 0.3), R("high", "desync", 0.35)] } },
    { at: 134, label: "cross returns", base: {
        layout: "grid", pattern: "x-cross", shape: "cross", rows: 8, cols: 8,
        speed: 2.1, hueShift: 0.03, rotate: 0.15, fxZoom: 0, fxZoomRot: 0, fxKaleido: 0.35,
      } },
    { at: 146, label: "consumption", ramp: 45, base: {
        pattern: "quarters", shape: "square", waveform: "square", twist: 1,
        spread: 1.3, tileSize: 70, blur: 3, merge: 0.8, rotate: 0, fxKaleido: 0, fxPixel: 0.3,
      } },
    { at: 168, label: "narrowing", ramp: 7, base: { speed: 1.2, hueShift: 0.14, fxIris: 0.5 } },
    { at: 174, label: "void", ramp: 2.4, base: { blur: 55, speed: 0.3, fxIris: 0.9, fxBloom: 0 } },
    { at: 178, label: "drop III — white hammer", base: {
        palette: "duo", low: "#000000", high: "#ffffff", bg: "#000000", hueShift: 0,
        pattern: "unison", shape: "square", waveform: "square", holdScale: 0,
        speed: 3.2, blur: 0, tileSize: 130, rows: 4, cols: 4, gapX: 60, gapY: 60,
        fill: true, spread: 0, ease: 0, border: 0, merge: 0, fxPixel: 0,
        fxIris: 0, fxShutter: 0.6, fxRgb: 0.3, fxBloom: 0.5, fxGrain: 0.35,
      },
      react: { master: 1.3, attack: 0.015, release: 0.12, beatSense: 0.75, beatDecay: 0.18,
        rows: [R("beat", "fxRgb", 0.7), R("beat", "tileSize", 0.9), R("beat", "displace", 0.5), R("beat", "blur", 0.6), R("level", "speed", 0.3), R("high", "desync", 0.2)] } },
    { at: 190, label: "afterglow", ramp: 8, base: {
        palette: "lava", waveform: "sine", high: "#ff7a1a", speed: 1.0,
        holdScale: 1.2, blur: 12, fill: false, tileSize: 60, hueShift: 0.05,
        fxShutter: 0, fxRgb: 0, fxTrails: 0.45, fxBloom: 0.35, fxGrain: 0.2,
      } },
    { at: 199, label: "cooling", ramp: 7, base: { hueShift: 0.12, speed: 0.5, fxTrails: 0.6 } },
    { at: 204, label: "out", ramp: 3, base: { palette: "duo", low: "#000000", high: "#000000", blur: 30, speed: 0.25, fxIris: 0.95, fxTrails: 0.3 } },
  ];

  // ==========================================================================
  // JUNGLE MOOG RITUAL — 479s, 128 BPM (bar 1.877s). Eight minutes of broken
  // jungle on the acid palette: sine circles under an iris, a phyllotaxis
  // burst at the 15s drop, hex-packed sparkle body, an ocean-palette liquid
  // breakdown at 121s, star-shaped spiral frenzy from 149s, a kaleidoscope
  // daylight inversion at 210s, a slit-shaped moog worm, and a radial-ring
  // night ride down the long tail.
  // ==========================================================================
  const JUNGLE = [
    { at: 0, label: "under canopy", base: full({
        rows: 8, cols: 8, tileSize: 14, gapX: 40, gapY: 40,
        speed: 0.6, holdScale: 1.2, desync: 0.3, border: 0.5,
        palette: "acid", pattern: "drops", spread: 1.1, twist: 0.2, blur: 16,
        shape: "circle", waveform: "sine", nest: 1,
        fxGrain: 0.2, fxIris: 0.4,
      }),
      react: { master: 0.8, attack: 0.04, release: 0.35, beatSense: 0.6, beatDecay: 0.4,
        rows: [R("bass", "blur", 0.3), R("beat", "tileSize", 0.3), R("high", "desync", 0.3), R("level", "speed", 0.15), OFF, OFF] } },
    { at: 8, label: "eyes open", ramp: 5, base: { fxIris: 0.25, hueShift: 0.04 } },
    { at: 15, label: "drop — spore burst", base: {
        layout: "spiral", pattern: "scatter", shape: "circle", desync: 0.5,
        speed: 1.4, tileSize: 30, rows: 10, cols: 10, gapX: 26, gapY: 26,
        blur: 0, holdScale: 0.8, fill: true, sizePulse: 0.5, nest: 0,
        fxIris: 0, fxBloom: 0.3, hueShift: 0,
      },
      react: { master: 1.1, attack: 0.02, release: 0.2, beatSense: 0.7, beatDecay: 0.3,
        rows: [R("beat", "sizePulse", 0.6), R("high", "desync", 0.5), R("bass", "fxBloom", 0.4), R("mid", "spread", 0.35), R("level", "speed", 0.25), R("beat", "twist", 0.4)] } },
    { at: 34, label: "fern shadow", ramp: 2, base: { speed: 0.8, blur: 9, fxIris: 0.3 } },
    { at: 45, label: "snake in", base: {
        layout: "grid", pattern: "snake", shape: "chevron", twist: 0.4,
        speed: 1.5, blur: 0, spread: 1.2, sizePulse: 0, displace: 0.1,
        fxIris: 0, fxWarp: 0.2,
      } },
    { at: 68, label: "hex body", base: {
        layout: "hex", pattern: "sparkle", shape: "hexagon", rows: 12, cols: 12,
        tileSize: 24, gapX: 20, gapY: 20, spread: 1.2, twist: 0.3, speed: 1.6,
        displace: 0, fxWarp: 0.15, fxBloom: 0.3,
      } },
    { at: 90, label: "acid lime", ramp: 4, base: { hueShift: 0.1, desync: 0.55 } },
    { at: 105, label: "venom", ramp: 4, base: { hueShift: 0.16, speed: 1.9, fxRgb: 0.2 } },
    { at: 121, label: "liquid breakdown", ramp: 3, base: {
        palette: "ocean", pattern: "ripple", waveform: "sine", blur: 42,
        speed: 0.55, spread: 1.7, ease: 0.9, hueShift: 0,
        fxWarp: 0.5, fxTrails: 0.5, fxRgb: 0, fxBloom: 0.25, fxIris: 0.2,
      },
      react: { master: 0.9, release: 0.5,
        rows: [R("bass", "fxWarp", 0.35), R("level", "tileSize", 0.3), R("mid", "spread", 0.3), OFF, OFF, OFF] } },
    { at: 135, label: "re-entry", ramp: 2, base: {
        palette: "acid", pattern: "drops", waveform: "triangle", blur: 8,
        speed: 1.1, ease: 0.4, fxWarp: 0.2, fxTrails: 0.2, fxIris: 0,
      } },
    { at: 141, label: "the climb", ramp: 8, base: { speed: 2.1, spread: 1.9, blur: 0, twist: 0.8, fxZoom: 0.3 } },
    { at: 149, label: "star frenzy", base: {
        layout: "spiral", pattern: "scatter", shape: "star", desync: 0.7,
        holdScale: 0.5, tileSize: 34, sizePulse: 0.6, spin: 0.2,
        fxZoom: 0.2, fxZoomRot: 0.1, fxBloom: 0.4, fxGrain: 0.25, fxTrails: 0,
      },
      react: { master: 1.3, attack: 0.015, release: 0.14, beatSense: 0.75, beatDecay: 0.22,
        rows: [R("beat", "sizePulse", 0.8), R("beat", "twist", 0.7), R("bass", "fxBloom", 0.45), R("high", "desync", 0.5), R("level", "speed", 0.3), R("beat", "fxRgb", 0.5)] } },
    { at: 173, label: "hex plateau", base: {
        layout: "hex", pattern: "sparkle", shape: "triangle", rows: 14, cols: 14,
        tileSize: 20, gapX: 16, gapY: 16, spread: 1.6, speed: 1.7, twist: 0.5,
        rotate: 0.3, merge: 0.2, spin: 0, sizePulse: 0.2, fxZoom: 0, fxZoomRot: 0,
      } },
    { at: 190, label: "organism", ramp: 8, base: {
        shape: "circle", tileSize: 72, gapX: 30, gapY: 30, blur: 2,
        counter: 0.5, nest: 1, rotate: 0, merge: 0, fxBloom: 0.35,
      } },
    { at: 210, label: "drop — daylight", base: {
        palette: "duo", low: "#eaffea", high: "#063d16", bg: "#dfffdf", hueShift: 0,
        layout: "spiral", pattern: "scatter", shape: "circle", tileSize: 80,
        desync: 0.6, speed: 1.8, blur: 0, counter: 0, nest: 0,
        fxKaleido: 0.5, fxShutter: 0.25, fxBloom: 0.3,
      },
      react: { master: 1.25,
        rows: [R("beat", "fxKaleido", 0.5), R("beat", "tileSize", 0.7), R("high", "desync", 0.4), R("level", "speed", 0.25), R("mid", "spread", 0.3), R("beat", "twist", 0.5)] } },
    { at: 224, label: "dusk returns", ramp: 5, base: {
        palette: "acid", low: "#000000", high: "#35f07f", bg: "#030a05",
        tileSize: 40, hueShift: 0.05, fxKaleido: 0, fxShutter: 0, fxBloom: 0.25,
      } },
    { at: 234, label: "moog worm", ramp: 60, base: {
        layout: "grid", pattern: "snake", shape: "slit", twist: 1, rows: 12, cols: 12,
        tileSize: 30, gapX: 22, gapY: 22, spread: 1.4, speed: 1.5,
        fxSlit: 0.3, fxWarp: 0.25,
      } },
    { at: 257, label: "low tide", ramp: 5, base: { speed: 1.1, blur: 6, hueShift: 0.02 } },
    { at: 265, label: "dusk hollow", ramp: 3, base: { speed: 0.6, blur: 26, fxIris: 0.5 } },
    { at: 269, label: "night ride", base: {
        layout: "radial", pattern: "tempo-rows", shape: "ring", rows: 7, cols: 16,
        tileSize: 30, gapX: 26, gapY: 26, spread: 2, speed: 1.3, blur: 0,
        twist: 0.4, fxIris: 0, fxSlit: 0, fxWarp: 0, fxTrails: 0.35, fxBloom: 0.3, fxCrt: 0.2,
      },
      react: { master: 1.0, beatSense: 0.68, beatDecay: 0.3,
        rows: [R("beat", "tileSize", 0.5), R("bass", "fxBloom", 0.35), R("mid", "spread", 0.4), R("high", "desync", 0.35), R("level", "speed", 0.25), R("beat", "twist", 0.3)] } },
    { at: 300, label: "pinwheel haze", base: { pattern: "pinwheel", twist: 0.5, spread: 1.5, spin: 0.1, hueShift: 0.08, fxWarp: 0.2 } },
    { at: 330, label: "rings of it", base: { pattern: "rings", spread: 1.8, spin: 0, counter: 0.35, fxKaleido: 0.3 } },
    { at: 360, label: "checker pulse", base: {
        layout: "grid", pattern: "checkerboard", shape: "diamond", waveform: "square",
        twist: 0.3, tileSize: 46, speed: 1.6, merge: 0.3, counter: 0,
        fxKaleido: 0, fxCrt: 0.35,
      } },
    { at: 390, label: "scatter night", ramp: 8, base: {
        pattern: "scatter", shape: "circle", waveform: "sine", desync: 0.6,
        tileSize: 34, hueShift: 0.12, merge: 0, fxCrt: 0, fxTrails: 0.45,
      } },
    { at: 420, label: "wind-down", ramp: 25, base: { speed: 0.8, blur: 18, spread: 1.2, hueShift: 0.16, fxTrails: 0.6, fxIris: 0.35, fxWarp: 0.3 } },
    { at: 455, label: "embers", ramp: 12, base: { hueShift: 0.2, speed: 0.45, blur: 30, fxIris: 0.6, fxGrain: 0.3 } },
    { at: 473, label: "out", ramp: 5, base: { speed: 0.2, fxIris: 0.95, bg: "#000000" } },
  ];

  // ==========================================================================
  // TIMBER AT SEA — 181s, 122 BPM (bar 1.963s). Water, not machinery: sine
  // waveform and bar-slat tiles on deep blues, warp haze throughout. Squall
  // measured at 47s (ocean palette, diamond spray, beat-kicked displacement),
  // sheet-lightning inversion for one bar at 80s, bioluminescent spiral with
  // counter-interference at 95s, slit-shaped rain at 108s, storm passes at
  // 134s into trails, one last circle wave at 158s, iris shut in the harbor.
  // ==========================================================================
  const timberBar = 240 / 122.28;
  const TIMBER = [
    { at: 0, label: "black sea", base: full({
        rows: 5, cols: 9, tileSize: 40, gapX: 18, gapY: 46,
        marginTop: 60, marginRight: 60, marginBottom: 60, marginLeft: 60,
        speed: 0.5, holdScale: 1.3, desync: 0.15, ease: 1, border: 0.4,
        low: "#000407", high: "#0c2b40", bg: "#01050a",
        pattern: "bounce-x", spread: 1.3, blur: 14,
        shape: "bar", waveform: "sine",
        fxWarp: 0.15, fxGrain: 0.15, fxIris: 0.3,
      }),
      react: { master: 0.75, attack: 0.06, release: 0.5, beatSense: 0.62, beatDecay: 0.5,
        rows: [R("bass", "blur", 0.3), R("level", "tileSize", 0.25), R("mid", "spread", 0.25), R("beat", "tileSize", 0.2), OFF, OFF] } },
    { at: 8, label: "moonlight", ramp: 6, base: { high: "#17537a", fxBloom: 0.2 } },
    { at: 23, label: "current", ramp: 4, base: { pattern: "sweep-right", spread: 1.6, speed: 0.7, high: "#1e88b8", blur: 8, fxSlit: 0.2 } },
    { at: 39, label: "held breath", ramp: 5, base: { speed: 0.35, blur: 32, high: "#0a2333", spread: 2, fxIris: 0.55, fxSlit: 0 } },
    { at: 46, label: "gather", ramp: 1, base: { tileSize: 16, spread: 0.3 } },
    { at: 47, label: "squall", base: {
        palette: "ocean", pattern: "ripple", shape: "diamond", waveform: "triangle",
        spread: 1.8, twist: 0, speed: 1.7, blur: 2, tileSize: 55,
        rows: 9, cols: 9, gapX: 26, gapY: 26, holdScale: 0.7, ease: 0.6,
        fill: true, border: 0.8, displace: 0.2,
        fxIris: 0, fxWarp: 0.3, fxBloom: 0.35, fxGrain: 0.2,
      },
      react: { master: 1.15, attack: 0.02, release: 0.2, beatSense: 0.7, beatDecay: 0.32,
        rows: [R("beat", "tileSize", 0.6), R("bass", "fxWarp", 0.4), R("beat", "displace", 0.45), R("high", "desync", 0.3), R("level", "speed", 0.25), R("mid", "spread", 0.3)] } },
    { at: 65, label: "pitching deck", base: { pattern: "bounce-y", twist: 0.35, speed: 1.8, rotate: 0.2, fxSlit: 0.25 } },
    { at: 80, label: "sheet lightning", base: { palette: "duo", low: "#dfeef5", high: "#06283d", bg: "#cfe4ee", fxBloom: 0.6, fxShutter: 0.2 } },
    { at: 80 + timberBar, label: "thunder-back", base: { palette: "ocean", bg: "#04121c", fxBloom: 0.35, fxShutter: 0 } },
    { at: 95, label: "bioluminescence", ramp: 3, base: {
        layout: "spiral", pattern: "rings", shape: "circle", spread: 1.2,
        tileSize: 62, blur: 1, rotate: 0, hueShift: 0.12,
        counter: 0.4, nest: 1, fxSlit: 0, fxBloom: 0.45, fxTrails: 0.3,
      } },
    { at: 108, label: "rain", base: {
        layout: "grid", pattern: "sweep-down", shape: "slit", speed: 2.1,
        desync: 0.3, tileSize: 48, spread: 1.4, twist: 0.2, hueShift: 0,
        counter: 0, nest: 0, displace: 0.1, fxWarp: 0.2, fxTrails: 0,
      } },
    { at: 120, label: "swells", ramp: 6, base: { spread: 1.9, blur: 4, sizePulse: 0.4 } },
    { at: 134, label: "storm passes", ramp: 8, base: {
        pattern: "ripple", waveform: "sine", speed: 0.6, blur: 22, ease: 1,
        displace: 0, sizePulse: 0, fxWarp: 0.3, fxTrails: 0.45, fxIris: 0.3,
      },
      react: { master: 0.85, release: 0.5,
        rows: [R("bass", "blur", 0.35), R("level", "tileSize", 0.25), R("mid", "spread", 0.3), R("beat", "tileSize", 0.2), OFF, OFF] } },
    { at: 143, label: "unfill", base: { fill: false, rows: 5, cols: 9, tileSize: 40, gapX: 18, gapY: 46, shape: "bar" } },
    { at: 149, label: "adrift", ramp: 6, base: { pattern: "bounce-x", spread: 2, speed: 0.4, blur: 16, fxIris: 0.5, fxTrails: 0.55 } },
    { at: 156.5, label: "swell gathers", ramp: 1.2, base: { tileSize: 14, spread: 0.5 } },
    { at: 158, label: "last wave", base: {
        pattern: "ripple", shape: "circle", speed: 1.4, tileSize: 74, blur: 5,
        spread: 1.6, fill: true, rows: 7, cols: 7, sizePulse: 0.5,
        fxIris: 0, fxBloom: 0.5, fxWarp: 0.25, fxTrails: 0.2,
      },
      react: { master: 1.0,
        rows: [R("beat", "sizePulse", 0.5), R("bass", "fxBloom", 0.45), R("level", "speed", 0.2), R("mid", "spread", 0.3), R("beat", "displace", 0.4), OFF] } },
    { at: 169, label: "harbor", ramp: 6, base: { speed: 0.3, blur: 20, fill: false, tileSize: 44, sizePulse: 0, fxIris: 0.6, fxTrails: 0.4, fxBloom: 0.2 } },
    { at: 176, label: "out", ramp: 4, base: { palette: "duo", low: "#000000", high: "#000407", bg: "#000000", blur: 28, fxIris: 0.9 } },
  ];

  globalThis.RELAAAX_COMPOSITIONS = {
    "Angular Ritual.mp3": { events: ANGULAR },
    "Jungle Moog Ritual.mp3": { events: JUNGLE },
    "Timber at Sea.mp3": { events: TIMBER },
  };
})();
