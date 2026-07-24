// Relaaax — the permanent preset list. Each config is a PARTIAL over
// RelaaaxField.DEFAULTS: loading a preset resets every unmentioned knob, so a
// preset fully determines the look (staging frame size excluded — that's page
// state, not field state).
//
// James's saved presets live in localStorage ("yours" group in the tuner);
// when one earns a spot on the permanent list, it gets baked in here.
globalThis.RELAAAX_PRESETS = [
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
