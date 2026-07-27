// Lumina — composition engine: plays a Claude-authored visual DJ set against
// a track's clock. A composition is a sorted list of timed events; each event
// can set field params (snapped, or ramped over seconds — numerics
// interpolate, hex colors crossfade, strings/booleans snap) and swap the
// reactivity settings (matrix rows, envelopes, beat tuning). The engine is
// DOM-free — music.js feeds it audio.currentTime and writes the result — so
// tmp/lumina/composition-sim.mjs runs the exact shipping code.
(function () {
  "use strict";

  const HEX = /^#[0-9a-f]{6}$/i;

  // Keys that are numbers but NOT continuous — interpolating them is
  // meaningless (a 4.07-beat sync, 1.5 nest levels). These snap even inside a
  // ramp; everything else numeric interpolates as usual.
  const SNAP_KEYS = new Set(["syncBeats", "nest", "rows", "cols"]);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }
  function lerpHex(a, b, k) {
    const ra = hexToRgb(a), rb = hexToRgb(b);
    return rgbToHex(
      ra[0] + (rb[0] - ra[0]) * k,
      ra[1] + (rb[1] - ra[1]) * k,
      ra[2] + (rb[2] - ra[2]) * k
    );
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // comp: { events: [{ at, base?, ramp?, react? }] } sorted by `at`.
  // reactDefaults: the settings object react partials merge over.
  function create(comp, reactDefaults) {
    const events = comp.events.slice().sort((a, b) => a.at - b.at);
    let idx = 0;
    let lastT = -Infinity;
    let base = {};       // committed target values
    let ramps = {};      // key -> { from, to, t0, t1, color }
    let react = clone(reactDefaults);

    function reset() {
      idx = 0;
      base = {};
      ramps = {};
      react = clone(reactDefaults);
    }

    // Effective value of a key at time t, honoring an in-flight ramp.
    function valueAt(key, t) {
      const r = ramps[key];
      if (!r || t >= r.t1) return base[key];
      if (t <= r.t0) return r.from;
      const k = (t - r.t0) / (r.t1 - r.t0);
      return r.color ? lerpHex(r.from, r.to, k) : r.from + (r.to - r.from) * k;
    }

    function applyEvent(e) {
      if (e.base) {
        for (const key of Object.keys(e.base)) {
          const v = e.base[key];
          const rampable = !SNAP_KEYS.has(key) &&
            (typeof v === "number" || (typeof v === "string" && HEX.test(v) && HEX.test(String(valueAt(key, e.at) ?? ""))));
          if (e.ramp > 0 && rampable && base[key] !== undefined) {
            ramps[key] = {
              from: valueAt(key, e.at),
              to: v,
              t0: e.at,
              t1: e.at + e.ramp,
              color: typeof v === "string",
            };
          } else {
            delete ramps[key];
          }
          base[key] = v;
        }
      }
      if (e.react) {
        for (const key of Object.keys(e.react)) {
          react[key] = key === "rows" ? clone(e.react.rows) : e.react[key];
        }
      }
    }

    return {
      // Full composed state at time t: { base: {key: value}, react: settings }.
      evalAt(t) {
        if (t < lastT) reset(); // restart / seek backward: replay from the top
        lastT = t;
        while (idx < events.length && events[idx].at <= t) applyEvent(events[idx++]);
        const out = {};
        for (const key of Object.keys(base)) out[key] = valueAt(key, t);
        return { base: out, react };
      },
    };
  }

  globalThis.LuminaCompositionEngine = { create, lerpHex };
})();
