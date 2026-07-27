// Lumina — one-time localStorage migration from the world's former name.
// The world was called Relaaax until 2026-07-26; James's saved tuner state,
// field presets, reactivity presets and per-track recall all live in the
// browser under "relaaax-*" keys. This copies them across on first load so
// the rename costs him nothing.
//
// Loads FIRST on both pages (index.html and tuner.html). The old keys are
// left in place — copying is non-destructive, and a stale key is harmless.
// Safe to delete this file (and its two script tags) once James confirms
// everything came over.
(function () {
  "use strict";

  const PAIRS = [
    ["relaaax-tuner", "lumina-tuner"],
    ["relaaax-presets", "lumina-presets"],
    ["relaaax-frame", "lumina-frame"],
    ["relaaax-music", "lumina-music"],
    ["relaaax-music-presets", "lumina-music-presets"],
    ["relaaax-tuner-tab", "lumina-tuner-tab"],
  ];

  try {
    for (const [oldKey, newKey] of PAIRS) {
      if (localStorage.getItem(newKey) !== null) continue;
      const value = localStorage.getItem(oldKey);
      if (value === null) continue;
      localStorage.setItem(newKey, value);
    }
  } catch (err) {
    // Private mode / storage disabled — the world runs on defaults anyway.
  }
})();
