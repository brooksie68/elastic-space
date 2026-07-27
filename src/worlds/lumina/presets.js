// Lumina — the permanent preset list. Each config is a PARTIAL over
// LuminaField.DEFAULTS: loading a preset resets every unmentioned knob, so a
// preset fully determines the look (staging frame size excluded — that's page
// state, not field state).
//
// James's saved presets live in localStorage ("yours" group in the tuner);
// when one earns a spot on the permanent list, it gets baked in here.
//
// This file also holds the DICE (LuminaRandom.roll) at the bottom — it lives
// here rather than in world.js so the sim can roll it thousands of times and
// check every result is a legal, non-blank field state.
globalThis.LUMINA_PRESETS = [
  {
    id: "pork-2002",
    label: "pork 2002",
    config: {}, // the decoded original — pure DEFAULTS
  },
  {
    id: "lava-lamp",
    label: "lava lamp",
    config: {
      pattern: "ripple", ease: 1, holdScale: 0, speed: 0.5, spread: 1.2,
      desync: 0.15, blur: 6, rows: 6, cols: 6, tileSize: 72,
      gapX: 20, gapY: 20, inset: 0, border: 0, radiusTile: 0.5,
      marginTop: 20, marginRight: 20, marginBottom: 20, marginLeft: 20,
      fill: true, low: "#1a0505", high: "#ff6a00", bg: "#0d0203",
    },
  },
  {
    id: "wave-wall",
    label: "wave wall",
    config: {
      pattern: "sweep-right", rows: 16, cols: 16, tileSize: 32,
      gapX: 0, gapY: 0, inset: 0, border: 0,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      fill: true, ease: 1, holdScale: 0, speed: 2, spread: 1,
      low: "#001a00", high: "#2bff5d", bg: "#000000",
    },
  },
  {
    id: "checker-strobe",
    label: "checker strobe",
    config: {
      pattern: "checkerboard", rows: 8, cols: 8, tileSize: 32,
      gapX: 0, gapY: 0, inset: 0, border: 0,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      fill: true, speed: 4, ease: 0, holdScale: 0, spread: 1,
      low: "#000000", high: "#ffffff", bg: "#000000",
    },
  },
  {
    id: "orbs",
    label: "orbs",
    config: {
      pattern: "pinwheel", twist: 0.4, rows: 5, cols: 7, tileSize: 130,
      radiusTile: 0.5, border: 0, gapX: 20, gapY: 20, inset: 0,
      marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10,
      fill: true, ease: 1, holdScale: 0, speed: 0.8, spread: 1,
      desync: 0.1, blur: 2, low: "#03102e", high: "#7fd0ff", bg: "#020814",
    },
  },
  {
    id: "chaos-engine",
    label: "chaos engine",
    config: {
      pattern: "sparkle", twist: 0.7, rows: 10, cols: 12, tileSize: 210,
      gapX: 0, gapY: 0, inset: 0, border: 2, radiusTile: 0.15,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      fill: true, speed: 2.5, desync: 0.5, spread: 1.6, ease: 0,
      low: "#12002b", high: "#ff2bd6", bg: "#000000",
    },
  },
  {
    id: "hypno-rings",
    label: "hypno rings",
    config: {
      pattern: "rings", rows: 15, cols: 15, tileSize: 34,
      gapX: 2, gapY: 2, inset: 0, border: 0, radiusTile: 0.5,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      fill: true, ease: 1, holdScale: 0, speed: 1.2, spread: 2,
      low: "#000000", high: "#ffffff", bg: "#000000",
    },
  },
  {
    id: "inkwell",
    label: "inkwell",
    config: {
      scene: "ink", scenePalette: "ocean", sceneMix: 1, sceneTiles: 0.35,
      sceneSpeed: 0.8, sceneScale: 0.55, sceneDrive: 0.6, sceneWarp: 0.65,
      pattern: "ripple", rows: 4, cols: 5, tileSize: 26, border: 0,
      radiusTile: 0.5, gapX: 60, gapY: 46, inset: 0, ease: 1, holdScale: 0,
      speed: 0.6, spread: 1.2, fill: true,
      marginTop: 30, marginRight: 30, marginBottom: 30, marginLeft: 30,
      low: "#02131f", high: "#9fe8ff", bg: "#010912",
    },
  },
  {
    id: "flame-shrine",
    label: "flame shrine",
    config: {
      scene: "flame", scenePalette: "genome", sceneGenome: "gold phoenix",
      sceneMix: 1, sceneTiles: 0,
      sceneSpeed: 0.7, sceneScale: 0.5, sceneDrive: 0.6, sceneWarp: 0.35,
      fxBloom: 0.3, fxGrain: 0.12, bg: "#000000", fill: true,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    },
  },
  {
    id: "amber-globe",
    label: "amber globe (bred)",
    config: {
      scene: "flame", scenePalette: "genome", sceneGenome: "amber globe",
      sceneMix: 1, sceneTiles: 0, sceneSpeed: 0.5, sceneScale: 0.55,
      sceneDrive: 0.55, sceneWarp: 0.3,
      fxBloom: 0.25, bg: "#000000", fill: true,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    },
  },
  {
    id: "violet-veil",
    label: "violet veil (bred)",
    config: {
      scene: "flame", scenePalette: "genome", sceneGenome: "violet veil",
      sceneMix: 1, sceneTiles: 0, sceneSpeed: 0.6, sceneScale: 0.5,
      sceneDrive: 0.6, sceneWarp: 0.4,
      fxBloom: 0.3, fxGrain: 0.1, bg: "#000000", fill: true,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    },
  },
  {
    id: "green-triskelion",
    label: "green triskelion (bred)",
    config: {
      scene: "flame", scenePalette: "genome", sceneGenome: "green triskelion",
      sceneMix: 1, sceneTiles: 0, sceneSpeed: 0.55, sceneScale: 0.5,
      sceneDrive: 0.55, sceneWarp: 0.3,
      fxBloom: 0.28, bg: "#000000", fill: true,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    },
  },
  {
    id: "star-tunnel",
    label: "star tunnel",
    config: {
      scene: "nebula", scenePalette: "neon", sceneMix: 1, sceneTiles: 0.25,
      sceneSpeed: 1, sceneScale: 0.5, sceneDrive: 0.55, sceneWarp: 0.4,
      pattern: "pinwheel", rows: 3, cols: 8, layout: "radial", tileSize: 16,
      radiusTile: 0.5, border: 0, ease: 1, holdScale: 0, speed: 0.9,
      spread: 1.4, fill: true, fxBloom: 0.2,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      low: "#1a0430", high: "#ff9de8", bg: "#05010c",
    },
  },
  {
    id: "neon-membrane",
    label: "neon membrane",
    config: {
      scene: "ridge", scenePalette: "acid", sceneMix: 1, sceneTiles: 0,
      sceneSpeed: 0.9, sceneScale: 0.45, sceneDrive: 0.65, sceneWarp: 0.55,
      bg: "#000000", fill: true, fxBloom: 0.25,
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
    },
  },
  {
    id: "lounge",
    label: "lounge",
    config: {
      pattern: "tempo-rows", rows: 4, cols: 6, tileSize: 60,
      gapX: 40, gapY: 30, inset: 14, border: 1,
      radiusTile: 0.3, radiusRow: 20, radiusOuter: 30, blur: 0.8,
      marginTop: 40, marginRight: 40, marginBottom: 40, marginLeft: 40,
      ease: 0.5, speed: 1, spread: 1,
      low: "#102030", high: "#ffd9a0", bg: "#1a1a24",
    },
  },
];

// --- the dice (James, 2026-07-26) -------------------------------------------
// A completely random visual state: layout, shape, pattern, waveform, palette,
// colors, geometry, the scene layer, and a random handful of FX. The ONLY
// guard is against a dead frame — if nothing would be visible at all, the
// roll is nudged until something is. Everything else ugly is fair game.
globalThis.LuminaRandom = (function () {
  "use strict";

  function roll(rand) {
    const R = rand || Math.random;
    const F = globalThis.LuminaField;
    const S = globalThis.LuminaScenes;
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const rnd = (a, b) => a + R() * (b - a);
    const odds = (p) => R() < p;
    const hex = () => `#${[0, 0, 0].map(() => Math.floor(R() * 256).toString(16).padStart(2, "0")).join("")}`;
    const genomes = (S && S.GENOMES) || [];
    const palettes = Object.keys(F.PALETTES);

    const cfg = {
      speed: rnd(0.15, 6), holdScale: rnd(0, 2.4), desync: R(),
      ease: R(), border: odds(0.5) ? rnd(0, 4) : 0,
      low: hex(), high: hex(), bg: odds(0.6) ? "#000000" : hex(),
      rows: 1 + Math.floor(R() * 16),
      cols: 1 + Math.floor(R() * 16),
      tileSize: rnd(6, 220),
      pattern: pick(F.PATTERNS).id, spread: rnd(0, 2), twist: R(),
      blur: odds(0.35) ? rnd(0, 70) : 0,
      marginTop: rnd(0, 90), marginRight: rnd(0, 90),
      marginBottom: rnd(0, 90), marginLeft: rnd(0, 90),
      gapX: rnd(0, 130), gapY: rnd(0, 130), inset: rnd(0, 60),
      radiusTile: R() * 0.5, radiusRow: rnd(0, 40), radiusOuter: rnd(0, 80),
      fill: odds(0.6),
      layout: pick(F.LAYOUTS), shape: pick(F.SHAPES), waveform: pick(F.WAVEFORMS),
      palette: pick(palettes), hueShift: R(),
      merge: odds(0.4) ? R() : 0,
      rotate: odds(0.5) ? R() : 0,
      spin: odds(0.4) ? R() : 0,
      displace: odds(0.4) ? R() : 0,
      sizePulse: odds(0.5) ? R() : 0,
      counter: odds(0.35) ? R() : 0,
      nest: Math.floor(R() * 3),
      scene: pick(S ? S.LIST : ["none"]),
      scenePalette: odds(0.4) && genomes.length ? "genome" : pick(palettes),
      sceneGenome: genomes.length ? pick(genomes).name : F.DEFAULTS.sceneGenome,
      sceneMix: rnd(0.35, 1), sceneTiles: R(), sceneSpeed: rnd(0.2, 2),
      sceneScale: R(), sceneDrive: R(), sceneWarp: R(), sceneHue: R(),
      accent: pick((globalThis.LuminaMusicDSP && globalThis.LuminaMusicDSP.ACCENT_NAMES) || ["four"]),
      syncBeats: pick([0, 0, 1, 2, 2, 4, 4, 8, 16]),
    };

    // Every FX off, then switch a random two-to-four of them on.
    F.FX_KEYS.forEach((k) => { cfg[k] = 0; });
    const rack = F.FX_KEYS.slice();
    for (let i = rack.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [rack[i], rack[j]] = [rack[j], rack[i]];
    }
    rack.slice(0, 2 + Math.floor(R() * 3)).forEach((k) => { cfg[k] = rnd(0.15, 0.9); });

    // Anti-blackout. A roll must always show SOMETHING.
    if (cfg.scene === "none") {
      cfg.sceneTiles = 1;
      if (cfg.tileSize < 10) cfg.tileSize = rnd(20, 90);
      if (cfg.blur > 45) cfg.blur = 12;
      if (cfg.fxIris > 0.85) cfg.fxIris = 0.5;
      if (cfg.fxShutter > 0.9) cfg.fxShutter = 0.5;
      // A duo ramp of two near-blacks on a black background is an empty frame.
      const lum = (h) => {
        const n = parseInt(h.slice(1), 16);
        return (((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722) / 255;
      };
      if (cfg.palette === "duo" && lum(cfg.low) < 0.12 && lum(cfg.high) < 0.12) {
        cfg.high = "#ffffff";
      }
    } else if (cfg.sceneMix < 0.45 && cfg.sceneTiles < 0.25) {
      cfg.sceneTiles = 0.8;
    }
    return cfg;
  }

  return { roll };
})();
