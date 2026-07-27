// Lumina — scene programs: full-frame GPU backdrops rendered UNDER the tile
// layer by fx.js. Each scene is a shader with the same small uniform contract,
// driven entirely by ordinary field config keys (scene*, see DEFAULTS in
// lumina-field.js) — so tuner sliders, mod-matrix rows, and composition
// events drive scenes exactly like any other knob.
//
// The four launch scenes, distilled from James's viz-examples folder:
//   ink    — curl-style inky turbulence (domain-warped fbm filaments)
//   ridge  — neon energy flow: glowing ridge lines over dark cells
//   flame  — fractal-flame point splat (IFS chaos game in the vertex shader)
//   nebula — star-tunnel fly-through: polar fbm clouds + star sparkle
//
// This file is data + pure helpers only (no DOM, no GL): fx.js compiles and
// renders, sims can lint the sources, tuner.html can list scene ids.
(function () {
  "use strict";

  const LIST = ["none", "ink", "ridge", "flame", "nebula"];

  // Shared fragment prelude: noise kit + the 6-stop palette ramp.
  const PRELUDE = `
    precision mediump float;
    varying vec2 vUv;
    uniform vec2 uRes;
    uniform float uTime, uScale, uDrive, uWarp, uBeat;
    uniform vec3 uPal[6];
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
        mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = mat2(1.6, 1.2, -1.2, 1.6) * p;
        a *= 0.5;
      }
      return v;
    }
    vec3 pal(float x) {
      float p = clamp(x, 0.0, 1.0) * 5.0;
      float s = min(4.0, floor(p));
      float k = p - s;
      vec3 c = uPal[0];
      for (int i = 0; i < 5; i++) {
        if (float(i) == s) c = mix(uPal[i], uPal[i + 1], k);
      }
      return c;
    }`;

  // INK — Quilez-style double domain warp; the warped field value picks the
  // palette, a sharpened band turns the warp shear into bright filaments.
  const FS_INK = PRELUDE + `
    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      float zoom = mix(4.5, 1.2, uScale);
      vec2 p = uv * zoom;
      float t = uTime * 0.1;
      float wp = 1.2 + uWarp * 3.0;
      vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t * 0.7),
                    fbm(p + vec2(5.2, 1.3) - t * 0.6));
      vec2 r = vec2(fbm(p + wp * q + vec2(1.7, 9.2) + t * 0.3),
                    fbm(p + wp * q + vec2(8.3, 2.8) - t * 0.4));
      float v = fbm(p + wp * r);
      // Filaments: the gradient-shear regions of the warp glow like ink edges.
      float fil = pow(clamp(1.0 - abs(v - 0.5) * 2.2, 0.0, 1.0), 3.0 + 6.0 * (1.0 - uDrive));
      float body = smoothstep(0.18, 0.85, v + length(r) * 0.18);
      vec3 col = pal(body * 0.55 + fil * 0.45 + uBeat * 0.08 * uDrive);
      col += pal(0.95) * fil * (0.35 + uDrive * 0.65 + uBeat * 0.3);
      gl_FragColor = vec4(col, 1.0);
    }`;

  // RIDGE — ridged multifractal: only the crest lines of the noise glow,
  // giving the dark-membrane / neon-energy-wall look.
  const FS_RIDGE = PRELUDE + `
    float ridge(vec2 p) {
      float v = 0.0, a = 0.55;
      for (int i = 0; i < 5; i++) {
        v += a * pow(1.0 - abs(2.0 * vnoise(p) - 1.0), 2.0);
        p = mat2(1.7, 1.1, -1.1, 1.7) * p;
        a *= 0.52;
      }
      return v;
    }
    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      float zoom = mix(5.0, 1.4, uScale);
      vec2 p = uv * zoom;
      float t = uTime * 0.12;
      p += vec2(fbm(p * 0.6 + t), fbm(p * 0.6 - t + 3.7)) * (0.6 + uWarp * 1.6);
      float v = ridge(p + vec2(t * 0.5, -t * 0.3));
      float crest = smoothstep(0.72, 1.05, v) + pow(max(v - 0.55, 0.0), 3.0) * 2.0;
      crest *= 0.75 + uDrive * 0.6 + uBeat * 0.35 * uDrive;
      vec3 col = pal(clamp(v * 0.35 - 0.08, 0.0, 1.0));   // dark cells
      col += pal(clamp(0.55 + crest * 0.45, 0.0, 1.0)) * crest;
      gl_FragColor = vec4(col, 1.0);
    }`;

  // NEBULA — polar tunnel mapping (angle, 1/radius) scrolled in depth, fbm
  // clouds shaped by the palette, plus a pin-prick star layer.
  const FS_NEBULA = PRELUDE + `
    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      float r = length(uv) + 1e-4;
      float a = atan(uv.y, uv.x);
      a += (1.0 - r) * uWarp * 2.2 + uTime * 0.02;   // swirl toward the core
      float depth = 0.28 / r + uTime * 0.45;
      vec2 p = vec2(a * 2.2, depth);
      float zoom = mix(2.6, 0.9, uScale);
      float d1 = fbm(p * zoom);
      float d2 = fbm(p * zoom * 2.3 + vec2(4.7, 9.1) + d1 * 1.4);
      float density = d1 * 0.65 + d2 * 0.5;
      density = pow(clamp(density, 0.0, 1.0), 2.2 - uDrive * 1.1);
      float fog = smoothstep(1.35, 0.25, r);          // fade the rim, hide the pole
      float core = smoothstep(0.12, 0.55, r);
      vec3 col = pal(clamp(density * (0.55 + uDrive * 0.5), 0.0, 1.0)) * fog * core;
      // Stars ride the same tunnel flow so they streak past, not twinkle in place.
      vec2 sp = vec2(a * 40.0, 6.0 / r + uTime * 2.4);
      vec2 cell = floor(sp);
      float star = step(0.982, hash21(cell));
      vec2 f = fract(sp) - 0.5;
      float glint = star * smoothstep(0.28, 0.0, length(f)) * core;
      col += (pal(0.98) * 0.7 + vec3(0.3)) * glint * (0.5 + uBeat * 0.6);
      gl_FragColor = vec4(col, 1.0);
    }`;

  // FLAME — the chaos game on the GPU, driven by REAL GENOMES bred offline by
  // the flame farm (assets/flame-genomes.js, James's cull). Every vertex
  // starts from its own seed and runs 20 rounds of the genome's IFS: pick a
  // transform by its cumulative weight, apply the affine, then the variation
  // (the 8 classic flame variations), accumulating a palette coordinate.
  // Points splat additively, so density piles up in the attractor exactly
  // like Electric Sheep's log-density renders; fx.js tone-maps on composite.
  //
  // The genome is uploaded as uniform rows (see MAX_XFORMS): uAff1/uAff2 are
  // the affine coefficients, uMeta is (cdf, variationId, colorCoord). A slow
  // per-transform wobble keeps the attractor breathing instead of frozen —
  // amplitude rides sceneWarp, so 0 warp is the genome exactly as rendered.
  const FLAME_POINTS = 120000;
  const MAX_XFORMS = 5;
  const VS_FLAME = `
    attribute vec3 aSeed;
    uniform float uTime, uScale, uDrive, uWarp, uAspect, uBeat;
    uniform vec3 uPal[6];
    uniform vec3 uAff1[${MAX_XFORMS}];
    uniform vec3 uAff2[${MAX_XFORMS}];
    uniform vec3 uMeta[${MAX_XFORMS}];
    uniform vec2 uCenter;
    uniform float uFrameScale;
    uniform int uCount;
    varying vec3 vColor;
    varying float vFade;

    vec2 variate(int v, vec2 p, float bend) {
      float r2 = dot(p, p) + 1e-9;
      float r1 = sqrt(r2);
      if (v == 1) return sin(p * (1.0 + bend));
      if (v == 2) return p / r2;
      if (v == 3) {
        float s = sin(r2), c = cos(r2);
        return vec2(p.x * s - p.y * c, p.x * c + p.y * s);
      }
      if (v == 4) return vec2((p.x - p.y) * (p.x + p.y) / r1, 2.0 * p.x * p.y / r1);
      if (v == 5) { float th = atan(p.y, p.x); return vec2(th / 3.14159265, r1 - 1.0); }
      if (v == 6) { float th = atan(p.y, p.x); return vec2(r1 * sin(th * r1), -r1 * cos(th * r1)); }
      if (v == 7) {
        float th = atan(p.y, p.x) / 3.14159265;
        return vec2(th * sin(3.14159265 * r1), th * cos(3.14159265 * r1));
      }
      return p;
    }

    void main() {
      vec2 p = aSeed.xy * 2.0 - 1.0;
      float ci = aSeed.z;
      float bend = uWarp * 0.5;
      // Chaos game. The per-iteration choice MUST be well mixed: an additive
      // sequence (seed + i * k) makes every point follow the same branch order
      // and the whole cloud collapses onto one dot — caught by genome-test.html.
      float st = fract(aSeed.z * 7.13 + aSeed.x * 3.71 + aSeed.y * 1.97);
      for (int i = 0; i < 24; i++) {
        st = fract(sin(st * 91.73 + float(i) * 13.71 + aSeed.x * 47.29) * 43758.5453);
        float sel = st;
        vec3 a1 = uAff1[0], a2 = uAff2[0], m = uMeta[0];
        for (int j = 1; j < ${MAX_XFORMS}; j++) {
          if (j < uCount && sel > uMeta[j - 1].x) { a1 = uAff1[j]; a2 = uAff2[j]; m = uMeta[j]; }
        }
        vec2 q = vec2(a1.x * p.x + a1.y * p.y + a1.z, a2.x * p.x + a2.y * p.y + a2.z);
        // Breathing: a small time rotation per transform, phased by its color.
        float ang = sin(uTime * 0.11 + m.z * 6.2831853) * 0.09 * uWarp;
        float cs = cos(ang), sn = sin(ang);
        q = vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y);
        p = variate(int(m.y + 0.5), q, bend);
        if (abs(p.x) > 1e4 || abs(p.y) > 1e4) p = aSeed.xy * 2.0 - 1.0;
        ci = (ci + m.z) * 0.5;
      }
      vec2 f = (p - uCenter) * uFrameScale * (0.72 + uScale * 0.62);
      vFade = smoothstep(3.4, 1.4, length(f));
      f.x /= uAspect;
      float pi5 = clamp(ci, 0.0, 1.0) * 5.0;
      float s = min(4.0, floor(pi5));
      float k = pi5 - s;
      vec3 c = uPal[0];
      for (int i = 0; i < 5; i++) {
        if (float(i) == s) c = mix(uPal[i], uPal[i + 1], k);
      }
      vColor = c;
      gl_Position = vec4(f, 0.0, 1.0);
      gl_PointSize = 1.0 + uDrive + uBeat;
    }`;
  const FS_FLAME = `
    precision mediump float;
    varying vec3 vColor;
    varying float vFade;
    uniform float uGain;
    void main() {
      gl_FragColor = vec4(vColor * uGain * vFade, 1.0);
    }`;

  // 6 evenly spaced stops from the field's palette LUT — scenes share the
  // exact palette pipeline (named ramps, duo pickers, hue rotation).
  // scenePalette "genome" means: use the flame genome's own colors, the ones
  // it was bred and judged with (still hue-rotatable via sceneHue).
  function paletteStops(buildLut, cfg, genome) {
    const useGenome = cfg.scenePalette === "genome" && genome && genome.stops;
    const lut = buildLut(useGenome
      ? { palette: "duo", low: genome.stops[0], high: genome.stops[5], hueShift: cfg.sceneHue || 0 }
      : { palette: cfg.scenePalette, low: cfg.low, high: cfg.high, hueShift: cfg.sceneHue || 0 });
    const stops = new Float32Array(18);
    if (useGenome) {
      // Exact genome ramp: hue-rotate each stop through the same LUT math by
      // building a tiny two-stop lut per pair would be overkill — instead take
      // the genome's stops and apply the LUT's hue rotation by sampling a
      // duo LUT built from each stop against itself.
      for (let i = 0; i < 6; i++) {
        const one = buildLut({ palette: "duo", low: genome.stops[i], high: genome.stops[i], hueShift: cfg.sceneHue || 0 });
        stops[i * 3] = one[0] / 255;
        stops[i * 3 + 1] = one[1] / 255;
        stops[i * 3 + 2] = one[2] / 255;
      }
      return stops;
    }
    for (let i = 0; i < 6; i++) {
      const j = Math.round((i / 5) * 255) * 3;
      stops[i * 3] = lut[j] / 255;
      stops[i * 3 + 1] = lut[j + 1] / 255;
      stops[i * 3 + 2] = lut[j + 2] / 255;
    }
    return stops;
  }

  // Genome rows packed for the shader uniforms. Missing slots repeat the last
  // transform so a 3-xform genome never reads uninitialized uniform memory.
  function flameUniforms(genome) {
    const aff1 = new Float32Array(MAX_XFORMS * 3);
    const aff2 = new Float32Array(MAX_XFORMS * 3);
    const meta = new Float32Array(MAX_XFORMS * 3);
    const xf = genome.xforms;
    for (let i = 0; i < MAX_XFORMS; i++) {
      const x = xf[Math.min(i, xf.length - 1)];
      aff1.set(x.aff1, i * 3);
      aff2.set(x.aff2, i * 3);
      meta.set([x.cdf, x.variation, x.color], i * 3);
    }
    return { aff1, aff2, meta, count: xf.length, frame: genome.frame };
  }

  const GENOMES = globalThis.LUMINA_FLAME_GENOMES || [];
  const genomeByName = (name) => GENOMES.find((g) => g.name === name) || GENOMES[0] || null;

  globalThis.LuminaScenes = {
    LIST,
    FRAG: { ink: FS_INK, ridge: FS_RIDGE, nebula: FS_NEBULA },
    FLAME: { vs: VS_FLAME, fs: FS_FLAME, points: FLAME_POINTS, maxXforms: MAX_XFORMS },
    GENOMES,
    genomeByName,
    flameUniforms,
    paletteStops,
  };
})();
