// The Orb Dimension
//
// An endless black volume — cave-black, not monitor-black: miles across,
// dimly lit by an ambient source nobody can find. Dozens (up to hundreds)
// of glowing glass orbs drift through it, and you can fly.
//
// Renderer: raw WebGL2, one instanced draw of billboard quads. Each orb
// samples a Blender-rendered translucent shell (assets/orbs/*.png, four
// variants in a texture array); the light is two crossfading color layers
// composited BEHIND the glass in the fragment shader, plus a halo lighting
// the air. Spheres are the one shape a billboard renders honestly, which is
// what makes flying through Blender sprites work.
//
// Flight is deliberately gentle (James): damped acceleration, smoothed look,
// A/D banking that persists (NMS-style), no shake. Orb positions are stored normalized so the
// tuner's spread sliders stretch the volume live, mid-flight.
//
// Drift exits: pale white pulsing orbs. Clicking one triggers the hidden
// data-drift anchors in index.html (which stay keyboard-focusable).

(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());

  // ---- tuner config ----------------------------------------------------------

  const STORE_KEY = "elastic-orb-dimension-tuner-v1";
  const DEFAULTS = {
    count: 140,
    dust: 1400,
    spreadX: 12000,
    spreadZ: 12000,
    spreadY: 2400,
    sizeMin: 18,
    sizeMax: 70,
    shellOp: 1,
    glow: 1,
    haze: 1,
    fadeSpeed: 1,
    grouping: "scatter",
  };
  // pool: slider adds/removes orbs incrementally — NEVER re-rolls the field
  const SLIDERS = [
    { key: "count", label: "orbs", min: 12, max: 1200, step: 1, pool: true },
    { key: "dust", label: "dust", min: 0, max: 2500, step: 50, pool: true },
    { key: "spreadX", label: "width m", min: 1000, max: 24000, step: 100 },
    { key: "spreadZ", label: "depth m", min: 1000, max: 24000, step: 100 },
    { key: "spreadY", label: "height m", min: 200, max: 6000, step: 50 },
    { key: "sizeMin", label: "size min", min: 5, max: 120, step: 1 },
    { key: "sizeMax", label: "size max", min: 20, max: 300, step: 1 },
    { key: "shellOp", label: "glass", min: 0.2, max: 1.5, step: 0.05 },
    { key: "glow", label: "glow", min: 0, max: 2, step: 0.05 },
    { key: "haze", label: "haze", min: 0, max: 3, step: 0.05 },
    { key: "fadeSpeed", label: "color fade", min: 0.2, max: 4, step: 0.1 },
  ];
  const cfg = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    for (const k in DEFAULTS) if (k in saved) cfg[k] = saved[k];
  } catch {}
  // saved values from older builds may be out of range (e.g. fly speed 1500)
  function sanitizeCfg() {
    for (const s of SLIDERS) {
      cfg[s.key] = clamp(Number(cfg[s.key]) || DEFAULTS[s.key], s.min, s.max);
    }
    if (!["scatter", "clusters", "strata", "river"].includes(cfg.grouping)) {
      cfg.grouping = "scatter";
    }
  }
  sanitizeCfg();

  // named presets, kept apart from the live cfg. One can be marked as the
  // start preset — it wins on load, so the world always opens the way James
  // set it. "copy settings" puts the live values on the clipboard for chat.
  const PRESET_KEY = "elastic-orb-dimension-presets-v1";
  let presetStore = { presets: {}, default: null };
  try {
    const raw = JSON.parse(localStorage.getItem(PRESET_KEY) || "{}");
    if (raw && raw.presets && typeof raw.presets === "object") {
      presetStore = { presets: raw.presets, default: raw.default || null };
    }
  } catch {}
  function savePresetStore() {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(presetStore));
    } catch {}
  }
  function cfgSnapshot() {
    const snap = { grouping: cfg.grouping };
    for (const s of SLIDERS) snap[s.key] = cfg[s.key];
    return snap;
  }
  if (presetStore.default && presetStore.presets[presetStore.default]) {
    Object.assign(cfg, presetStore.presets[presetStore.default]);
    sanitizeCfg();
  }
  function saveCfg() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
    } catch {}
  }

  // ---- DOM -------------------------------------------------------------------

  const field = document.getElementById("field");
  const canvas = document.createElement("canvas");
  canvas.id = "space";
  // inline belt-and-suspenders: even if world.css ever fails to arrive, the
  // canvas still fills the window on a dark page instead of sitting 300x150
  // in the corner of a white one
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;display:block";
  document.body.style.background = "#020305";
  document.body.insertBefore(canvas, field);

  const hint = document.createElement("p");
  hint.id = "flight-hint";
  hint.textContent =
    "W / S · A / D roll · R levels · shift = thruster · space = overdrive · drag to steer · H home · v33";
  document.body.appendChild(hint);
  setTimeout(() => hint.classList.add("faded"), 14000);

  // a soft dot at the screen edge pointing at the heart whenever it's out of
  // view — the way back home is always indicated
  const marker = document.createElement("div");
  marker.id = "home-marker";
  document.body.appendChild(marker);

  // the viewscreen: you are INSIDE a small ship now. A dark canopy frame runs
  // all the way around the glass — top strut, side struts, angled gussets —
  // and a console of live readout panels spans the bottom. The whole rig stays
  // inside ~10% of the screen (James's budget). WEP and SHD report OFFLINE:
  // those systems are coming, the ship just doesn't have them installed yet.
  // (2026-07-17: the v18-v24 rendered-chrome / three.js cockpit experiments
  // were pulled by James — spaceship direction retired; code parked in
  // tmp/orb-dimension/parked/. This is the v15/v17 viewscreen, restored.)
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = `
    <div class="vs-strut vs-top"></div>
    <div class="vs-strut vs-left"></div>
    <div class="vs-strut vs-right"></div>
    <div class="vs-gusset tl"></div><div class="vs-gusset tr"></div>
    <div class="vs-gusset bl"></div><div class="vs-gusset br"></div>
    <div class="vs-glass">
      <div class="vs-arc left"></div>
      <div class="vs-arc right"></div>
      <svg class="vs-reticle" viewBox="-100 -100 200 200">
        <g id="vs-horizon">
          <path d="M -78 0 H -52 L -44 7" />
          <path d="M 78 0 H 52 L 44 7" />
        </g>
        <g class="ret-ring">
          <path d="M -46 -14 A 48 48 0 0 1 -14 -46" />
          <path d="M 14 -46 A 48 48 0 0 1 46 -14" />
          <path d="M 46 14 A 48 48 0 0 1 14 46" />
          <path d="M -14 46 A 48 48 0 0 1 -46 14" />
        </g>
        <path class="ret-cross" d="M 0 -11 V -4 M 0 11 V 4 M -11 0 H -4 M 11 0 H 4" />
        <circle class="ret-dot" r="1.3" />
      </svg>
    </div>
    <div class="vs-console-rig">
      <div class="vs-console">
        <div class="vs-wing left"></div>
        <section class="vs-pod pod-att">
          <h2>ATT</h2>
          <div class="vs-screen vs-rows">
            <p><span>HDG</span><b id="vs-hdg">000</b></p>
            <p><span>PIT</span><b id="vs-pit">+00</b></p>
            <p><span>BNK</span><b id="vs-bnk">+00</b></p>
          </div>
        </section>
        <section class="vs-cluster">
          <div class="vs-screen">
            <p class="vs-big"><b id="vs-spd">0</b><span> m/s</span></p>
            <div class="vs-bar"><div id="vs-thr"></div></div>
            <p class="vs-mode" id="vs-mode">IDLE</p>
          </div>
        </section>
        <section class="vs-pod pod-nav">
          <h2>NAV</h2>
          <div class="vs-screen vs-rows">
            <p><span>HOME</span><b id="vs-home">1.6 km</b></p>
            <p><span>CNT</span><b id="vs-con">0</b></p>
            <p><span>EXIT</span><b>3</b></p>
          </div>
        </section>
        <section class="vs-pod pod-sys">
          <h2>SYS</h2>
          <div class="vs-screen vs-rows">
            <p><span>ENG</span><b class="vs-ok" id="vs-eng">NOMINAL</b></p>
            <p><span>WEP</span><b class="vs-off">OFFLINE</b></p>
            <p><span>SHD</span><b class="vs-off">OFFLINE</b></p>
          </div>
        </section>
        <div class="vs-wing right"></div>
      </div>
    </div>`;
  document.body.appendChild(hud);
  const $v = (id) => hud.querySelector("#" + id);
  const vsEls = {
    hdg: $v("vs-hdg"), pit: $v("vs-pit"), bnk: $v("vs-bnk"),
    spd: $v("vs-spd"), thr: $v("vs-thr"), mode: $v("vs-mode"),
    home: $v("vs-home"), con: $v("vs-con"), eng: $v("vs-eng"),
    ret: hud.querySelector(".vs-reticle"),
  };
  let hudNext = 0; // next text-readout refresh (ms); bar animates every frame

  const anchors = Array.from(document.querySelectorAll(".orb.portal"));

  // ---- WebGL -----------------------------------------------------------------

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: true, // the skull is real geometry — orbs depth-test against it
  });
  if (!gl) {
    hint.textContent = "this dimension needs WebGL2 — the dark is all there is";
    return;
  }

  const VS = `#version 300 es
layout(location=0) in vec2 aQuad;
layout(location=1) in vec4 i0; // world pos, radius
layout(location=2) in vec4 i1; // h1, h2, sat, fadeDur
layout(location=3) in vec4 i2; // fadePhase, spin, variant, halo
layout(location=4) in vec4 i3; // seed, portal, veil, quadScale
uniform mat4 uVP;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uCamPos;
out vec2 vUv;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC; // seed, portal, dist, radius
flat out vec2 vMisc; // veil flag, quad scale
void main() {
  float d = distance(i0.xyz, uCamPos);
  float radius = i0.w;
  // the heart never shrinks below a star's size on screen
  if (i3.y > 1.5) radius = max(radius, d * 0.004);
  // and nothing paints a quad much larger than the screen no matter how
  // close it gets — overdraw stays bounded at any tuner setting
  radius = min(radius, d * 0.8);
  // per-instance quad size: orbs carry a wide halo margin, veils and dust use
  // tight quads — huge dim washes must not multiply full-screen blended pixels
  vec3 wp = i0.xyz + (uRight * aQuad.x + uUp * aQuad.y) * radius * i3.w;
  vUv = aQuad * i3.w;
  vA = i1;
  vB = i2;
  vC = vec4(i3.x, i3.y, d, radius);
  vMisc = vec2(i3.z, i3.w);
  gl_Position = uVP * vec4(wp, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
in vec2 vUv;
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
flat in vec2 vMisc;
uniform mediump sampler2DArray uShells;
uniform float uTime;
uniform float uFog;
uniform float uGlow;
uniform float uShellOp;
uniform float uFadeScale;
out vec4 frag;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  return (rgb - 0.5) * c + l;
}

void main() {
  float r = length(vUv);
  if (r > vMisc.y) discard;
  float seed = vC.x;
  float portal = vC.y;
  float dist = vC.z;
  float radius = vC.w;

  // aerial perspective: far orbs lose saturation before they lose light
  float sat = vA.z * mix(1.0, 0.55, clamp(dist / 18000.0, 0.0, 1.0));
  float l1 = 0.62, l2 = 0.60;
  if (portal > 0.5) { sat = 0.04; l1 = 0.80; l2 = 0.74; }
  // flag 3: the skull's eyes — deep saturated red, never washed out
  if (portal > 2.5) { sat = 0.92; l1 = 0.60; l2 = 0.54; }

  float k = 0.5 + 0.5 * sin(uTime * 6.28318 * uFadeScale / vA.w + vB.x);
  float lb = smoothstep(0.6, 0.0, r) * 0.13; // hot center
  vec3 c1 = hsl2rgb(vA.x / 360.0, sat, l1 + lb);
  vec3 c2 = hsl2rgb(vA.y / 360.0, sat, l2 + lb);
  float w1 = mix(0.14, 0.92, k);
  float w2 = mix(0.14, 0.92, 1.0 - k);
  if (portal > 0.5) { w1 = mix(0.30, 0.95, k); w2 = mix(0.30, 0.95, 1.0 - k); }

  // the light inside: two color layers stacked behind the glass
  float prof = pow(smoothstep(1.0, 0.05, r), 1.35);
  float a1 = prof * w1;
  float a2 = prof * w2;
  vec3 coreP = c2 * a2 + c1 * a1 * (1.0 - a2);
  float coreA = a2 + a1 * (1.0 - a2);

  // veil patches are bare washes of light on distant rock — no glass, very dim
  if (vMisc.x > 0.5) {
    coreP *= 0.18;
    coreA *= 0.18;
  }

  // the glass shell over the light
  vec4 shell = vec4(0.0);
  if (r < 1.02 && vMisc.x < 0.5) {
    vec2 uv = vUv;
    if (vB.y != 0.0) {
      float ang = vB.y * uTime + seed;
      float ca = cos(ang), sa = sin(ang);
      uv = mat2(ca, -sa, sa, ca) * uv;
    }
    shell = texture(uShells, vec3(0.5 + uv * 0.401, vB.z));
    shell = min(shell * uShellOp, vec4(1.0));
  }
  vec3 outP = shell.rgb + coreP * (1.0 - shell.a);
  float outA = shell.a + coreA * (1.0 - shell.a);

  // halo: the orb lighting the air around it. Falloff is normalized to THIS
  // instance's quad size so the glow reaches zero before the card's edge —
  // otherwise the billboard shows as a hard-edged translucent square
  float breath = 0.75 + 0.25 * sin(uTime * 0.5 + seed * 7.0);
  float haloSpan = max(vMisc.y - 0.85, 0.2);
  float haloA = vB.w * uGlow * 0.32 * breath *
    pow(clamp(1.0 - (r - 0.85) / haloSpan, 0.0, 1.0), 2.2);
  outP += mix(c1, c2, 1.0 - k) * haloA * 0.8;
  outA = min(1.0, outA + haloA * 0.55);

  // distance haze; fade out gently when flying straight through one.
  // pale exit orbs resist the fog; the heart ignores it entirely
  float fogF = exp(-dist * uFog);
  if (portal > 1.5) fogF = 1.0;
  else if (portal > 0.5) fogF = mix(fogF, 1.0, 0.6);
  float nearF = vMisc.x > 0.5 ? 1.0 : smoothstep(radius * 0.7, radius * 1.8, dist);
  frag = vec4(outP, outA) * fogF * nearF;
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);
  const U = {};
  for (const name of ["uVP", "uRight", "uUp", "uCamPos", "uShells", "uTime", "uFog", "uGlow", "uShellOp", "uFadeScale"]) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // unit quad
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // instance buffer: 4 vec4 per orb
  const FLOATS = 16;
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  for (let a = 1; a <= 4; a++) {
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 4, gl.FLOAT, false, FLOATS * 4, (a - 1) * 16);
    gl.vertexAttribDivisor(a, 1);
  }

  // ---- shell textures ----------------------------------------------------------

  const SHELL_NAMES = ["glass", "frosted", "swirl", "banded"];
  const TEXSIZE = 768;
  const shellTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, shellTex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 10, gl.RGBA8, TEXSIZE, TEXSIZE, 4);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uShells, 0);

  // fallback shell drawn in canvas 2D — used when a PNG can't load or WebGL
  // refuses the upload (file:// tainting); the world degrades, not dies
  function fallbackShell(variant) {
    const c = document.createElement("canvas");
    c.width = c.height = TEXSIZE;
    const x = c.getContext("2d");
    const cx = TEXSIZE / 2;
    const R = TEXSIZE * 0.401;
    let g = x.createRadialGradient(cx, cx, 0, cx, cx, R);
    const milk = variant === 1 ? 0.32 : 0.1;
    g.addColorStop(0, "rgba(235,240,250," + milk + ")");
    g.addColorStop(0.82, "rgba(238,242,252," + (milk + 0.08) + ")");
    g.addColorStop(0.94, "rgba(250,252,255,0.75)");
    g.addColorStop(0.985, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cx, R, 0, TAU);
    x.fill();
    g = x.createRadialGradient(cx - R * 0.4, cx - R * 0.42, 0, cx - R * 0.4, cx - R * 0.42, R * 0.35);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx - R * 0.4, cx - R * 0.42, R * 0.35, 0, TAU);
    x.fill();
    return c;
  }

  function uploadShell(layer, source) {
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, shellTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    try {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, TEXSIZE, TEXSIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, TEXSIZE, TEXSIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, fallbackShell(layer));
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  let texReady = false;
  {
    let done = 0;
    SHELL_NAMES.forEach((name, layer) => {
      const img = new Image();
      const finish = (source) => {
        uploadShell(layer, source);
        if (++done === 4) {
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, shellTex);
          gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
          texReady = true;
        }
      };
      img.onload = () => finish(img);
      img.onerror = () => finish(fallbackShell(layer));
      img.src = "./assets/orbs/orb-" + name + ".png";
    });
  }

  // ---- orbs ---------------------------------------------------------------------
  // Positions are normalized to [-1,1]^3; world = n * spread. Spread sliders
  // therefore stretch the inhabited volume live.

  const SPINNERS = [0, 0, 0.045, 0.03]; // rad/s by variant; glass+frosted fixed
  let orbs = [];
  let instData = null;
  let order = null;
  let dists = null;

  function huePair() {
    const h1 = rand(0, 360);
    const off = Math.random() < 0.7 ? rand(25, 60) : rand(150, 210);
    return [h1, (h1 + (Math.random() < 0.5 ? off : -off) + 360) % 360];
  }

  function makeWander() {
    return {
      a1: rand(0.45, 1), p1: rand(0, TAU), w1: TAU / rand(50, 190),
      a2: rand(0.25, 0.6), p2: rand(0, TAU), w2: TAU / rand(70, 240),
    };
  }
  const wander = (w, t) =>
    w.a1 * Math.sin(w.w1 * t + w.p1) + w.a2 * Math.sin(w.w2 * t + w.p2);

  function baseOrb(n, portal, dust) {
    const [h1, h2] = huePair();
    const variant = (Math.random() * 4) | 0;
    return {
      n,
      ur: portal ? 0.5 : Math.random(),
      fixedR: dust ? rand(2, 6) : 0,
      h1, h2,
      sat: rand(82, 96),
      fadeDur: dust ? rand(6, 18) : portal ? rand(4.2, 5.6) : rand(16, 44),
      fadePhase: rand(0, TAU),
      spin: portal || dust ? 0 : SPINNERS[variant] * (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 1.4),
      variant: portal || dust ? 0 : variant,
      halo: dust ? 1.7 : portal ? 1.35 : rand(0.75, 1.15),
      seed: rand(0, 100),
      portal: !!portal,
      dust: !!dust,
      wx: makeWander(), wy: makeWander(), wz: makeWander(),
    };
  }

  function groupedPoint(mode, ctx) {
    switch (mode) {
      case "clusters": {
        const c = pick(ctx.centers);
        return [
          clamp(c[0] + gauss() * 0.13, -1, 1),
          clamp(c[1] + gauss() * 0.2, -1, 1),
          clamp(c[2] + gauss() * 0.13, -1, 1),
        ];
      }
      case "strata": {
        const y = pick(ctx.levels);
        return [rand(-1, 1), clamp(y + gauss() * 0.06, -1, 1), rand(-1, 1)];
      }
      case "river": {
        const t = Math.random();
        return [
          t * 2 - 1,
          clamp(0.45 * Math.sin(t * TAU * 1.3 + ctx.p1) + gauss() * 0.09, -1, 1),
          clamp(0.55 * Math.sin(t * TAU * 0.8 + ctx.p2) + gauss() * 0.12, -1, 1),
        ];
      }
      default:
        return [rand(-1, 1), rand(-1, 1), rand(-1, 1)];
    }
  }

  // The field lives in persistent pools. The count/dust sliders take a prefix
  // of a pool — scrubbing them adds or removes orbs at the far end of the list
  // and NEVER re-rolls the ones already around you. Only "regenerate" and a
  // grouping change re-roll.
  let groupCtx = null;
  let ringOrbs = [];
  let portalOrbs = [];
  // (heartOrb retired 2026-07-18 — makeHeart() below kept for the lore; the
  // skull's mouth-glow pulse in the skull shader carries the Heart's soul)

  // the skull's eyes: two bright red orbs seated in the eye sockets. Socket
  // centers measured from skull.bin (canonical 600m frame: x ±60, y −15,
  // z +190 — recessed into the openings) × SKULL_SCALE 3. Fixed world
  // positions (o.fix), immune to spread sliders and wander; flag 3 in the
  // instance data gives them the heart's never-smaller-than-a-star clause
  // and a red-tinted branch in the fragment shader.
  function makeEyes() {
    return [-1, 1].map((side) => {
      const o = baseOrb([0, 0, 0], false, false);
      o.eye = true;
      // (±270, −45, 570) put through the skull's 5° back-tilt (see loader)
      o.fix = [side * 270, 4.9, 571.7];
      o.fixedR = 160;
      o.h1 = 2;
      o.h2 = 357;
      o.sat = 100;
      o.fadeDur = 3.2;
      o.halo = 2.0;
      o.spin = 0;
      o.variant = 0;
      return o;
    });
  }
  let veilOrbs = [];
  let eyeOrbs = [];
  let fieldPool = [];
  let dustPool = [];

  function newGroupCtx() {
    return {
      mode: cfg.grouping,
      centers: Array.from({ length: clamp(Math.round(cfg.count / 24), 3, 14) }, () => [
        rand(-0.85, 0.85), rand(-0.55, 0.55), rand(-0.85, 0.85),
      ]),
      levels: Array.from({ length: 3 + ((Math.random() * 3) | 0) }, () => rand(-0.8, 0.8)),
      p1: rand(0, TAU),
      p2: rand(0, TAU),
    };
  }

  // a welcoming committee: a dozen orbs ring the spawn at 250–1000m, evenly
  // spread in angle and on the large side, so waking up is never dark
  function makeRing() {
    const ring = [];
    for (let i = 0; i < 12; i++) {
      const d = rand(250, 1000);
      const th = (i / 12) * TAU + rand(-0.3, 0.3);
      const ph = rand(-0.35, 0.35);
      const o = baseOrb([
        clamp((Math.cos(th) * Math.cos(ph) * d) / cfg.spreadX, -1, 1),
        clamp((Math.sin(ph) * d) / cfg.spreadY, -1, 1),
        clamp((Math.sin(th) * Math.cos(ph) * d) / cfg.spreadZ, -1, 1),
      ], false);
      o.ur = rand(0.45, 1);
      ring.push(o);
    }
    return ring;
  }

  // three pale orbs within sight of home, so the way onward is never far
  function makePortals() {
    return [
      baseOrb([-500 / cfg.spreadX, 60 / cfg.spreadY, -650 / cfg.spreadZ], true),
      baseOrb([650 / cfg.spreadX, -40 / cfg.spreadY, 250 / cfg.spreadZ], true),
      baseOrb([100 / cfg.spreadX, 120 / cfg.spreadY, 800 / cfg.spreadZ], true),
    ];
  }

  // the Heart: the mysterious ambient source, made visible. One bright slow
  // pulse at the exact center of the volume — fog-proof, never smaller than a
  // star on screen. Wherever you are, it marks home.
  function makeHeart() {
    const o = baseOrb([0, 0, 0], false, false);
    o.heart = true;
    o.fixedR = 60;
    o.fadeDur = 7;
    o.halo = 2.2;
    o.spin = 0;
    o.variant = 0;
    return o;
  }

  // veil patches: huge, very dim glowing washes parked on the cave's ceiling,
  // floor, and walls, just past the flyable bounds — the faint mottling of
  // rock surfaces miles away. A deterministic grid, so EVERY view direction
  // meets at least one; no look is ever pure black.
  function makeVeils() {
    const veils = [];
    const patch = (nx, ny, nz) => {
      const o = baseOrb([nx, ny, nz], false, false);
      o.veil = true;
      o.fixedR = rand(1600, 2600);
      o.halo = 0.4;
      o.sat = rand(18, 32);
      o.fadeDur = rand(30, 70);
      o.spin = 0;
      o.variant = 0;
      return o;
    };
    const G = 6;
    for (let i = 0; i < G; i++) {
      for (let j = 0; j < G; j++) {
        const x = -1.15 + (2.3 * (i + 0.5)) / G + rand(-0.06, 0.06);
        const z = -1.15 + (2.3 * (j + 0.5)) / G + rand(-0.06, 0.06);
        veils.push(patch(x, rand(1.18, 1.3), z));   // ceiling
        veils.push(patch(x, -rand(1.18, 1.3), z));  // floor
      }
    }
    for (let i = 0; i < G; i++) {
      for (let j = 0; j < 2; j++) {
        const a = -1.15 + (2.3 * (i + 0.5)) / G + rand(-0.06, 0.06);
        const y = (j ? 0.55 : -0.55) + rand(-0.2, 0.2);
        veils.push(patch(rand(1.2, 1.3), y, a));    // +x wall
        veils.push(patch(-rand(1.2, 1.3), y, a));   // -x wall
        veils.push(patch(a, y, rand(1.2, 1.3)));    // +z wall
        veils.push(patch(a, y, -rand(1.2, 1.3)));   // -z wall
      }
    }
    return veils;
  }

  function fieldOrb(i) {
    // even structured modes keep a few strays — the cave is inhabited everywhere
    const stray = groupCtx.mode !== "scatter" && Math.random() < 0.1;
    const n = groupedPoint(stray ? "scatter" : groupCtx.mode, groupCtx);
    return baseOrb(n, (i + 1) % 60 === 0);
  }

  function assemble() {
    const ringUsed = Math.min(ringOrbs.length, cfg.count);
    const fieldNeed = Math.max(0, cfg.count - ringUsed);
    while (fieldPool.length < fieldNeed) fieldPool.push(fieldOrb(fieldPool.length));
    while (dustPool.length < cfg.dust) {
      // ember dust: tiny motes filling the volume AND spilling 30% past the
      // flyable bounds, so no direction — even looking out from the edge — is
      // ever truly empty, and flying always has parallax to read speed against
      dustPool.push(baseOrb([rand(-1.3, 1.3), rand(-1.3, 1.3), rand(-1.3, 1.3)], false, true));
    }
    // (the Heart orb retired 2026-07-18 — the Skull took over as home; the
    // HOME readout and edge marker still point at the origin, now its center)
    orbs = ringOrbs.slice(0, ringUsed).concat(
      fieldPool.slice(0, fieldNeed),
      portalOrbs,
      eyeOrbs,
      veilOrbs,
      dustPool.slice(0, cfg.dust),
    );

    // the monument stands alone: any orb inside KEEP meters of the origin is
    // pushed radially out to a shell just beyond the skull (corner radius
    // ~1370m at 3x scale, +wander margin). Eyes exempt (they live in the
    // sockets), dust exempt (ember atmosphere), veils are outside anyway.
    // Radial push in world space = scaling the normalized coords, since
    // world = n * spread componentwise. Soft clamp keeps pushed orbs from
    // leaving the field entirely at extreme tuner spreads.
    const KEEP = 2400; // v33: widened from 1560 — "give the skull a nice buffer"
    for (const o of orbs) {
      if (o.veil || o.dust || o.eye) continue;
      const wx = o.n[0] * cfg.spreadX, wy = o.n[1] * cfg.spreadY, wz = o.n[2] * cfg.spreadZ;
      const r = Math.hypot(wx, wy, wz);
      if (r < KEEP) {
        const f = (KEEP * (1 + Math.random() * 0.18)) / Math.max(r, 1);
        o.n[0] = clamp(o.n[0] * f, -1.35, 1.35);
        o.n[1] = clamp(o.n[1] * f, -1.35, 1.35);
        o.n[2] = clamp(o.n[2] * f, -1.35, 1.35);
      }
      // v33: the load-in sightline stays clear — a cylinder along +Z from the
      // buffer edge to just past spawn (z 0..6200, radius 950 around the view
      // axis). Anything drifting into frame between you and the face gets
      // pushed sideways out of the corridor.
      const wz2 = o.n[2] * cfg.spreadZ;
      if (wz2 > 0 && wz2 < 6200) {
        const wx2 = o.n[0] * cfg.spreadX, wy2 = o.n[1] * cfg.spreadY;
        const rr = Math.hypot(wx2, wy2);
        if (rr < 950) {
          const f2 = (950 * (1 + Math.random() * 0.2)) / Math.max(rr, 1);
          o.n[0] = clamp(o.n[0] * f2, -1.35, 1.35);
          o.n[1] = clamp(o.n[1] * f2, -1.35, 1.35);
        }
      }
    }
    instData = new Float32Array(orbs.length * FLOATS);
    order = new Uint16Array(orbs.length);
    dists = new Float32Array(orbs.length);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.STREAM_DRAW);
  }

  function rebuildAll() {
    groupCtx = newGroupCtx();
    fieldPool = [];
    dustPool = [];
    ringOrbs = makeRing();
    portalOrbs = makePortals();
    eyeOrbs = makeEyes();
    veilOrbs = makeVeils();
    assemble();
  }
  rebuildAll();

  // ---- camera + flight -------------------------------------------------------------

  // LOOK-ONLY BUILD: the camera is bolted in place 1600m outside the central
  // group, facing it. No translation of any kind — rotation is the only motion,
  // and it only happens when asked. Flight returns once looking works.
  // Free-flight orientation (James is a No Man's Sky pilot): the camera is an
  // orthonormal basis — f forward, r right, u up — rotated incrementally in
  // its OWN frame. Roll persists until R glides you back to the ecliptic.
  const cam = {
    pos: [0, 0, 5600], // v22: 2600; v29: 3600; v30: 5600 (James keeps backing up — the skull deserves it)
    f: [0, 0, -1],
    r: [1, 0, 0],
    u: [0, 1, 0],
  };
  let pendingYaw = 0;   // eased look input awaiting application
  let pendingPitch = 0;
  let rollVel = 0;      // rad/s
  let leveling = false;
  let thrust = 0;       // current thruster speed, m/s
  let overdrive = false;

  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const vnorm = (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const vlerp = (a, b, k) => [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];

  // Rodrigues rotation of v around unit axis by ang
  function vrot(v, axis, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const cr = vcross(axis, v);
    const d = vdot(axis, v) * (1 - c);
    return [
      v[0] * c + cr[0] * s + axis[0] * d,
      v[1] * c + cr[1] * s + axis[1] * d,
      v[2] * c + cr[2] * s + axis[2] * d,
    ];
  }

  function rotateCam(axis, ang) {
    cam.f = vrot(cam.f, axis, ang);
    cam.r = vrot(cam.r, axis, ang);
    cam.u = vrot(cam.u, axis, ang);
  }

  function orthonormalize() {
    cam.f = vnorm(cam.f);
    const d = vdot(cam.r, cam.f);
    cam.r = vnorm([cam.r[0] - cam.f[0] * d, cam.r[1] - cam.f[1] * d, cam.r[2] - cam.f[2] * d]);
    cam.u = vcross(cam.r, cam.f);
  }

  function goHome() {
    cam.pos = [0, 0, 5600];
    cam.f = [0, 0, -1];
    cam.r = [1, 0, 0];
    cam.u = [0, 1, 0];
    pendingYaw = 0;
    pendingPitch = 0;
    rollVel = 0;
    leveling = false;
    thrust = 0;
    overdrive = false;
  }

  const keys = new Set();

  const isTyping = (e) =>
    e.target instanceof HTMLElement &&
    (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON");

  window.addEventListener("keydown", (e) => {
    if (isTyping(e)) return;
    keys.add(e.code);
    if (e.code === "KeyH") goHome();
    if (e.code === "Space") {
      e.preventDefault();
      overdrive = !overdrive;
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  const drag = { on: false, x: 0, y: 0, downX: 0, downY: 0, downT: 0 };
  const mouse = { x: -1, y: -1 };

  canvas.addEventListener("pointerdown", (e) => {
    drag.on = true;
    drag.x = drag.downX = e.clientX;
    drag.y = drag.downY = e.clientY;
    drag.downT = performance.now();
    canvas.classList.add("dragging");
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!drag.on) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    pendingYaw -= dx * 0.0013;
    pendingPitch -= dy * 0.0013;
    leveling = false;
  });
  canvas.addEventListener("pointerup", (e) => {
    drag.on = false;
    canvas.classList.remove("dragging");
    const moved = Math.abs(e.clientX - drag.downX) + Math.abs(e.clientY - drag.downY);
    if (moved < 6 && performance.now() - drag.downT < 400) tryPortalClick(e.clientX, e.clientY);
  });
  // if the GPU ever drops the context (it happened once), recover honestly
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    location.reload();
  });

  const camBasis = () => ({ f: cam.f, r: cam.r, u: cam.u });

  // ---- matrices -----------------------------------------------------------------

  const proj = new Float32Array(16);
  const view = new Float32Array(16);
  const vp = new Float32Array(16);
  const FOV = (60 * Math.PI) / 180;

  function setProj(aspect) {
    const f = 1 / Math.tan(FOV / 2);
    const near = 2, far = 80000;
    proj.fill(0);
    proj[0] = f / aspect;
    proj[5] = f;
    proj[10] = (far + near) / (near - far);
    proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);
  }
  function setView(b) {
    const p = cam.pos;
    view[0] = b.r[0]; view[4] = b.r[1]; view[8] = b.r[2];
    view[1] = b.u[0]; view[5] = b.u[1]; view[9] = b.u[2];
    view[2] = -b.f[0]; view[6] = -b.f[1]; view[10] = -b.f[2];
    view[3] = 0; view[7] = 0; view[11] = 0;
    view[12] = -(b.r[0] * p[0] + b.r[1] * p[1] + b.r[2] * p[2]);
    view[13] = -(b.u[0] * p[0] + b.u[1] * p[1] + b.u[2] * p[2]);
    view[14] = b.f[0] * p[0] + b.f[1] * p[1] + b.f[2] * p[2];
    view[15] = 1;
  }
  function mulVP() {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        vp[c * 4 + r] =
          proj[r] * view[c * 4] +
          proj[4 + r] * view[c * 4 + 1] +
          proj[8 + r] * view[c * 4 + 2] +
          proj[12 + r] * view[c * 4 + 3];
      }
    }
  }

  // ---- the Skull -----------------------------------------------------------------
  // A 600m fossil skull at the exact center of the dimension — James's Meshy
  // model ("alien god skull v2"), prepped by tmp/orb-dimension/skull_prep.py:
  // recentered on the origin, decimated 1.29M→206k tris, exported as a custom
  // binary (interleaved pos/norm/uv + u32 indices) with a 2K basecolor JPG.
  // It replaced the Heart as home: the HOME readout and edge marker point at
  // the origin, which is now the skull's center. The face looks toward +Z —
  // straight at the spawn point. The mouth is an open ring and the severed
  // underside is open too: in through the teeth, out below. No collision;
  // the walls are ghosts for now.
  // Served-only enhancement: needs fetch(), so on file:// the world simply
  // has no skull (graceful absence per house rules).
  const skull = { ready: false, count: 0, prog: null, vao: null, tex: null, U: {} };
  (async () => {
    try {
      const [buf, img] = await Promise.all([
        fetch("assets/skull/skull.bin").then((r) => {
          if (!r.ok) throw new Error("skull.bin " + r.status);
          return r.arrayBuffer();
        }),
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = "assets/skull/skull-basecolor.jpg";
        }),
      ]);
      const dv = new DataView(buf);
      if (dv.getUint32(0, false) !== 0x534b554c) throw new Error("bad magic"); // "SKUL"
      const nv = dv.getUint32(4, true);
      const ni = dv.getUint32(8, true);
      const verts = new Float32Array(buf, 12, nv * 8);
      const idx = new Uint32Array(buf, 12 + nv * 32, ni);

      // the binary is canonical at 600m tall; the world wants a monument.
      // v28 after James's first look ("not even bigger than the orbs"):
      // 3x → 1800m tall, subtending ~38° from spawn. Tune here.
      // v32: head tilted back 5° (rotation about X; face lifts skyward).
      // The eye orbs in makeEyes() carry the same rotation baked into their
      // fixed positions — retilt them if this angle changes.
      const SKULL_SCALE = 3.0;
      const SKULL_TILT = (-5 * Math.PI) / 180;
      const ct = Math.cos(SKULL_TILT), st = Math.sin(SKULL_TILT);
      for (let i = 0; i < nv; i++) {
        const o = i * 8;
        const y = verts[o + 1] * SKULL_SCALE, z = verts[o + 2] * SKULL_SCALE;
        verts[o] *= SKULL_SCALE;
        verts[o + 1] = y * ct - z * st;
        verts[o + 2] = y * st + z * ct;
        const ny = verts[o + 4], nz = verts[o + 5];
        verts[o + 4] = ny * ct - nz * st;
        verts[o + 5] = ny * st + nz * ct;
      }

      const svs = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform vec3 uCamPos;
out vec3 vN;
out vec2 vUV;
out float vDist;
void main() {
  vN = aNorm;
  vUV = aUV;
  vDist = distance(aPos, uCamPos);
  gl_Position = uVP * vec4(aPos, 1.0);
}`;
      const sfs = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uFog;
uniform float uTime;
in vec3 vN;
in vec2 vUV;
in float vDist;
out vec4 oC;
void main() {
  vec3 base = texture(uTex, vUV).rgb;
  vec3 N = normalize(vN);
  // starlight key high-left, cool fill from the right, and the Heart's soul:
  // a warm pulse breathing up out of the open mouth from below
  float key = max(dot(N, normalize(vec3(-0.45, 0.80, 0.42))), 0.0);
  float fill = max(dot(N, normalize(vec3(0.65, -0.05, -0.60))), 0.0);
  float up = max(dot(N, normalize(vec3(0.0, -0.92, 0.38))), 0.0);
  float pulse = 0.55 + 0.45 * sin(uTime * 0.45);
  vec3 col = base * (vec3(0.10, 0.11, 0.15)
    + key * vec3(0.88, 0.95, 1.10) * 0.95
    + fill * vec3(0.30, 0.38, 0.55) * 0.22
    + up * vec3(1.00, 0.62, 0.28) * 0.55 * pulse);
  // aerial haze, same knob as the orbs
  col *= exp(-vDist * uFog * 1.6);
  oC = vec4(col, 1.0);
}`;
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, svs));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, sfs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p));
      for (const n of ["uVP", "uCamPos", "uTex", "uFog", "uTime"])
        skull.U[n] = gl.getUniformLocation(p, n);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);

      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1); // orbs own unit 0
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      if (aniso) {
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }
      gl.activeTexture(gl.TEXTURE0);

      gl.useProgram(p);
      gl.uniform1i(skull.U.uTex, 1);
      gl.useProgram(prog); // hand the state back to the orb pipeline

      skull.prog = p;
      skull.vao = vao;
      skull.tex = tex;
      skull.count = ni;
      skull.ready = true;
    } catch (e) {
      // file:// or missing assets: the dimension just has no skull
    }
  })();

  // ---- portals: raycast clicks ------------------------------------------------------

  let wp = new Float32Array(0); // orb world positions, filled each frame

  function rayDir(px, py) {
    const b = camBasis();
    const t = Math.tan(FOV / 2);
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const nx = (2 * px / canvas.clientWidth - 1) * t * aspect;
    const ny = (1 - 2 * py / canvas.clientHeight) * t;
    const d = [
      b.f[0] + b.r[0] * nx + b.u[0] * ny,
      b.f[1] + b.r[1] * nx + b.u[1] * ny,
      b.f[2] + b.r[2] * nx + b.u[2] * ny,
    ];
    const len = Math.hypot(d[0], d[1], d[2]);
    return [d[0] / len, d[1] / len, d[2] / len];
  }

  function portalHit(px, py) {
    const d = rayDir(px, py);
    const o = cam.pos;
    let best = -1, bestT = Infinity;
    for (let i = 0; i < orbs.length; i++) {
      if (!orbs[i].portal) continue;
      const cx = wp[i * 3] - o[0], cy = wp[i * 3 + 1] - o[1], cz = wp[i * 3 + 2] - o[2];
      const t = cx * d[0] + cy * d[1] + cz * d[2];
      if (t < 0 || t > bestT) continue;
      const r = radiusOf(orbs[i]) * 1.35;
      const dd = cx * cx + cy * cy + cz * cz - t * t;
      if (dd < r * r) { best = i; bestT = t; }
    }
    return best;
  }

  let portalCursor = false;
  function tryPortalClick(px, py) {
    const i = portalHit(px, py);
    if (i >= 0) anchors[i % anchors.length]?.click();
  }

  // ---- frame loop --------------------------------------------------------------------

  const radiusOf = (o) => {
    if (o.fixedR) return o.fixedR;
    const lo = Math.min(cfg.sizeMin, cfg.sizeMax);
    const hi = Math.max(cfg.sizeMin, cfg.sizeMax);
    return lo + o.ur * (hi - lo);
  };

  let lastNow = performance.now();
  let resScale = 1;
  let frameCost = 16;

  function frame(now) {
    const t = now / 1000;
    const rawMs = now - lastNow;
    const dt = Math.min(rawMs / 1000, 0.05);
    lastNow = now;

    // dynamic resolution: if the GPU is drowning (huge tuner settings on a
    // 4K monitor), lower internal resolution instead of stuttering or dying,
    // and creep back up when the load eases
    if (rawMs < 250) {
      frameCost = frameCost * 0.9 + rawMs * 0.1;
      if (frameCost > 24 && resScale > 0.5) resScale = Math.max(0.5, resScale - 0.05);
      else if (frameCost < 18 && resScale < 1) resScale = Math.min(1, resScale + 0.005);
    }

    // -- the thruster: hold shift to burn toward full speed over a few
    // seconds; release and you coast down to a stop over a few more. Velocity
    // always follows the gaze, so steering with the mouse curves the flight.
    // Space toggles OVERDRIVE: ramp to 800 and hold there until tapped again.
    const VMAX = 400, VOVER = 800; // m/s
    const burning = keys.has("ShiftLeft") || keys.has("ShiftRight");
    // the boosts respect the S key (per James 2026-07-17): holding S points
    // the burn backwards — shift and overdrive thrust in REVERSE while it's
    // down, swinging smoothly through zero, and swing forward again on release
    const rev = keys.has("KeyS") ? -1 : 1;
    const target = (overdrive ? VOVER : burning ? VMAX : 0) * rev;
    if (target !== 0) {
      thrust += (target - thrust) * (1 - Math.exp(-dt / 1.2));
    } else {
      thrust *= Math.exp(-dt / 1.6);
      if (Math.abs(thrust) < 4) thrust = 0;
    }

    // -- the dolly: hold W to glide forward along your gaze, S to back out.
    // Constant gentle speed, instant stop on release. Composes with the
    // thruster (S acts as a soft brake while coasting).
    const DOLLY = 80; // m/s
    const dolly = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const speed = dolly * DOLLY + thrust;
    if (speed !== 0) {
      const bd = camBasis();
      const bounds = [cfg.spreadX * 0.95, cfg.spreadY * 0.95, cfg.spreadZ * 0.95];
      for (let i = 0; i < 3; i++) {
        cam.pos[i] = clamp(cam.pos[i] + bd.f[i] * speed * dt, -bounds[i], bounds[i]);
      }
    }

    // -- rotation, all in the camera's OWN frame (banked yaw curves the bank)
    const ROT = 0.7; // rad/s
    if (keys.has("ArrowLeft")) { pendingYaw += ROT * dt; leveling = false; }
    if (keys.has("ArrowRight")) { pendingYaw -= ROT * dt; leveling = false; }
    if (keys.has("ArrowUp")) { pendingPitch += ROT * dt; leveling = false; }
    if (keys.has("ArrowDown")) { pendingPitch -= ROT * dt; leveling = false; }
    const lookEase = 1 - Math.exp(-dt * 8);
    const yawStep = pendingYaw * lookEase;
    const pitchStep = pendingPitch * lookEase;
    pendingYaw -= yawStep;
    pendingPitch -= pitchStep;
    if (yawStep !== 0) rotateCam(cam.u, yawStep);
    if (pitchStep !== 0) rotateCam(cam.r, pitchStep);

    // -- roll: A/D bank while held and STAY banked (per James, NMS pilot —
    // moved off Q/E 2026-07-17 so he can bank + point the nose with the mouse;
    // Q/E stay unassigned for now)
    const ROLL_RATE = 0.46; // rad/s (0.66 backed off a further 30% per James)
    const rollIn = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    rollVel += (rollIn * ROLL_RATE - rollVel) * (1 - Math.exp(-dt * 6));
    if (Math.abs(rollVel) > 1e-4) {
      rotateCam(cam.f, rollVel * dt);
      if (rollIn !== 0) leveling = false;
    }

    // -- coordinated turn: banking IS turning (James, v26). While banked the
    // ship carves continuously around the world-vertical — hold a bank and
    // you sweep a full circle back to your starting view; level out (or R)
    // and the turn stops. Rate peaks at TURN_RATE on a 90° knife-edge.
    const TURN_RATE = 0.5; // rad/s of heading at full bank
    const bankRad = Math.atan2(cam.r[1], cam.u[1]);
    if (Math.abs(bankRad) > 0.02) {
      rotateCam([0, 1, 0], TURN_RATE * Math.sin(bankRad) * dt);
    }

    // -- R: glide back to the plane of the ecliptic (level roll and pitch,
    // keep heading) over about a second
    if (keys.has("KeyR")) leveling = true;
    if (leveling) {
      let fl = [cam.f[0], 0, cam.f[2]];
      if (Math.hypot(fl[0], fl[2]) < 0.05) fl = [cam.u[0], 0, cam.u[2]]; // was looking straight up/down
      fl = vnorm(fl);
      const k = 1 - Math.exp(-dt * 2.5);
      cam.f = vnorm(vlerp(cam.f, fl, k));
      cam.u = vnorm(vlerp(cam.u, [0, 1, 0], k));
      if (vdot(cam.f, fl) > 0.99995 && cam.u[1] > 0.99995) leveling = false;
    }
    orthonormalize();

    // -- orb world positions + depth sort (back to front)
    const n = orbs.length;
    if (wp.length !== n * 3) wp = new Float32Array(n * 3);
    const sx = cfg.spreadX, sy = cfg.spreadY, sz = cfg.spreadZ;
    let contacts = 0; // real orbs within sensor range (2.5 km), for the console
    for (let i = 0; i < n; i++) {
      const o = orbs[i];
      // wander is absolute meters, NOT spread-scaled: "drifting slowly about"
      // means a few m/s, and near orbs must never flee the visitor
      let x, y, z;
      if (o.fix) {
        // seated in the skull: fixed world coords, no spread scaling, no wander
        x = o.fix[0]; y = o.fix[1]; z = o.fix[2];
      } else {
        const amp = o.heart || o.veil ? 0 : o.dust ? 30 : o.portal ? 15 : 60;
        x = o.n[0] * sx + wander(o.wx, t) * amp;
        y = o.n[1] * sy + wander(o.wy, t) * amp * 0.6;
        z = o.n[2] * sz + wander(o.wz, t) * amp;
      }
      wp[i * 3] = x; wp[i * 3 + 1] = y; wp[i * 3 + 2] = z;
      const dx = x - cam.pos[0], dy = y - cam.pos[1], dz = z - cam.pos[2];
      dists[i] = dx * dx + dy * dy + dz * dz;
      if (!o.dust && !o.veil && dists[i] < 6250000) contacts++;
      order[i] = i;
    }
    order.sort((a, bI) => dists[bI] - dists[a]);

    // -- viewscreen: throttle bar and reticle horizon track every frame, the
    // text readouts refresh at ~8 Hz so the numbers stay legible
    vsEls.thr.style.width = Math.min(100, (Math.abs(thrust) / VOVER) * 100).toFixed(1) + "%";
    vsEls.thr.classList.toggle("rev", thrust < 0);
    const bankDeg = Math.atan2(cam.r[1], cam.u[1]) * 180 / Math.PI;
    // the WHOLE reticle is the attitude instrument (James, v25): it counter-
    // rotates through the full 360° as you roll, so a barrel roll spins it
    // all the way around while the canopy frame stays put
    vsEls.ret.style.transform =
      "translate(-50%, -50%) rotate(" + (-bankDeg).toFixed(1) + "deg)";
    if (now >= hudNext) {
      hudNext = now + 120;
      const spd = Math.abs(speed);
      const signed = (v) =>
        (v < 0 ? "−" : "+") + String(Math.abs(Math.round(v))).padStart(2, "0");
      vsEls.spd.textContent = (speed < -1 ? "−" : "") + Math.round(spd);
      vsEls.mode.textContent = overdrive ? "OVERDRIVE" : speed < -1 ? "REVERSE" : burning ? "BURN" : spd > 1 ? "COAST" : "IDLE";
      vsEls.mode.classList.toggle("over", overdrive);
      vsEls.hdg.textContent =
        String(Math.round((Math.atan2(cam.f[0], -cam.f[2]) * 180 / Math.PI + 360) % 360)).padStart(3, "0");
      vsEls.pit.textContent = signed(Math.asin(clamp(cam.f[1], -1, 1)) * 180 / Math.PI);
      vsEls.bnk.textContent = signed(bankDeg);
      const hd = Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2]);
      vsEls.home.textContent = hd >= 1000 ? (hd / 1000).toFixed(1) + " km" : Math.round(hd) + " m";
      vsEls.con.textContent = String(contacts);
      vsEls.eng.textContent = overdrive ? "OVERDRIVE" : "NOMINAL";
    }

    let m = 0;
    for (let s = 0; s < n; s++) {
      const i = order[s];
      const o = orbs[i];
      const radius = radiusOf(o);
      // inside the near-fade's zero zone the shader outputs nothing anyway —
      // skip the quad entirely instead of blending an invisible fullscreen one
      if (!o.veil && dists[i] < radius * radius * 0.49) continue;
      const off = m * FLOATS;
      m++;
      instData[off] = wp[i * 3];
      instData[off + 1] = wp[i * 3 + 1];
      instData[off + 2] = wp[i * 3 + 2];
      instData[off + 3] = radius;
      instData[off + 4] = o.h1;
      instData[off + 5] = o.h2;
      instData[off + 6] = o.sat / 100;
      instData[off + 7] = o.fadeDur;
      instData[off + 8] = o.fadePhase;
      instData[off + 9] = o.spin;
      instData[off + 10] = o.variant;
      instData[off + 11] = o.halo;
      instData[off + 12] = o.seed;
      instData[off + 13] = o.eye ? 3 : o.heart ? 2 : o.portal ? 1 : 0;
      instData[off + 14] = o.veil ? 1 : 0;
      instData[off + 15] = o.veil ? 1.05 : o.dust ? 1.6 : 2.6;
    }

    // -- draw
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * resScale;
    const bw = (W * dpr) | 0, bh = (H * dpr) | 0;
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
    }
    setProj(W / H);
    const bb = camBasis();
    setView(bb);
    mulVP();

    gl.depthMask(true); // clear respects the mask — re-arm it every frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // -- the skull draws first: opaque, depth-written. The orbs then draw
    // with depth TEST on but writes off — soft sprites clipped correctly
    // behind bone, shining past its edges, visible through the mouth.
    if (skull.ready) {
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.useProgram(skull.prog);
      gl.bindVertexArray(skull.vao);
      gl.uniformMatrix4fv(skull.U.uVP, false, vp);
      gl.uniform3fv(skull.U.uCamPos, cam.pos);
      gl.uniform1f(skull.U.uFog, cfg.haze / 18000);
      gl.uniform1f(skull.U.uTime, t);
      gl.drawElements(gl.TRIANGLES, skull.count, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.useProgram(prog);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
    if (texReady) {
      gl.uniformMatrix4fv(U.uVP, false, vp);
      gl.uniform3fv(U.uRight, bb.r);
      gl.uniform3fv(U.uUp, bb.u);
      gl.uniform3fv(U.uCamPos, cam.pos);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uFog, cfg.haze / 18000);
      gl.uniform1f(U.uGlow, cfg.glow);
      gl.uniform1f(U.uShellOp, cfg.shellOp);
      gl.uniform1f(U.uFadeScale, cfg.fadeSpeed);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, m);
    }

    // home marker: when the heart is off-screen, glide a dot along the screen
    // edge in its direction
    {
      const rx = -cam.pos[0], ry = -cam.pos[1], rz = -cam.pos[2];
      const x = rx * bb.r[0] + ry * bb.r[1] + rz * bb.r[2];
      const y = rx * bb.u[0] + ry * bb.u[1] + rz * bb.u[2];
      const z = rx * bb.f[0] + ry * bb.f[1] + rz * bb.f[2];
      const tf = Math.tan(FOV / 2);
      let show = false, nx = 0, ny = 0;
      if (z > 0) {
        nx = x / z / (tf * (W / H));
        ny = y / z / tf;
        if (Math.abs(nx) > 0.92 || Math.abs(ny) > 0.92) {
          const m = 0.92 / Math.max(Math.abs(nx), Math.abs(ny));
          nx *= m;
          ny *= m;
          show = true;
        }
      } else {
        const len = Math.hypot(x, y) || 1;
        nx = (x / len) * 0.92;
        ny = (y / len) * 0.92;
        show = true;
      }
      marker.style.opacity = show ? "0.55" : "0";
      if (show) {
        marker.style.left = ((nx + 1) / 2) * W + "px";
        marker.style.top = ((1 - ny) / 2) * H + "px";
      }
    }

    // hover cursor over exits
    if (!drag.on && mouse.x >= 0) {
      const hit = portalHit(mouse.x, mouse.y) >= 0;
      if (hit !== portalCursor) {
        portalCursor = hit;
        canvas.style.cursor = hit ? "pointer" : "";
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- tuner ---------------------------------------------------------------------------

  const tunerInputs = {};

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "orb-tuner-toggle";
  toggle.textContent = "tune";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "orb-tuner");
  document.body.appendChild(toggle);

  const panel = document.createElement("section");
  panel.id = "orb-tuner";
  panel.className = "orb-tuner";
  panel.hidden = true;
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Dimension tuning");

  function makeSliderEl(s) {
    const wrap = document.createElement("div");
    wrap.className = "tuner-mini";
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = s.label;
    const out = document.createElement("output");
    label.append(span, out);
    const input = document.createElement("input");
    input.type = "range";
    input.min = s.min;
    input.max = s.max;
    input.step = s.step;
    input.value = cfg[s.key];
    input.addEventListener("input", () => {
      cfg[s.key] = Number(input.value);
      out.value = String(cfg[s.key]);
      if (s.pool) assemble();
      saveCfg();
    });
    out.value = String(cfg[s.key]);
    wrap.append(label, input);
    tunerInputs[s.key] = { input, out };
    return wrap;
  }

  const groupWrap = document.createElement("div");
  groupWrap.className = "tuner-mini";
  const groupLabel = document.createElement("label");
  const groupSpan = document.createElement("span");
  groupSpan.textContent = "grouping";
  groupLabel.appendChild(groupSpan);
  const groupSel = document.createElement("select");
  for (const mode of ["scatter", "clusters", "strata", "river"]) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = mode;
    groupSel.appendChild(opt);
  }
  groupSel.value = cfg.grouping;
  groupSel.addEventListener("change", () => {
    cfg.grouping = groupSel.value;
    rebuildAll();
    saveCfg();
  });
  groupWrap.append(groupLabel, groupSel);

  // related controls live together in labelled subpanels
  const sliderByKey = {};
  for (const s of SLIDERS) sliderByKey[s.key] = s;
  const GROUPS = [
    { label: "the field", keys: ["count", "dust", "grouping"] },
    { label: "the space", keys: ["spreadX", "spreadZ", "spreadY"] },
    { label: "the orbs", keys: ["sizeMin", "sizeMax", "shellOp", "glow"] },
    { label: "the air", keys: ["haze", "fadeSpeed"] },
  ];
  const groupsRow = document.createElement("div");
  groupsRow.className = "tuner-groups";
  panel.appendChild(groupsRow);
  for (const g of GROUPS) {
    const box = document.createElement("section");
    box.className = "tuner-group";
    const lab = document.createElement("p");
    lab.className = "tuner-group-label";
    lab.textContent = g.label;
    box.appendChild(lab);
    const grid = document.createElement("div");
    grid.className = "tuner-grid";
    box.appendChild(grid);
    for (const key of g.keys) {
      grid.appendChild(key === "grouping" ? groupWrap : makeSliderEl(sliderByKey[key]));
    }
    groupsRow.appendChild(box);
  }

  const actions = document.createElement("div");
  actions.className = "tuner-actions";
  const regenBtn = document.createElement("button");
  regenBtn.type = "button";
  regenBtn.textContent = "regenerate";
  regenBtn.addEventListener("click", () => rebuildAll());
  const homeBtn = document.createElement("button");
  homeBtn.type = "button";
  homeBtn.textContent = "return home";
  homeBtn.addEventListener("click", goHome);
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "reset all";
  resetBtn.addEventListener("click", () => {
    Object.assign(cfg, DEFAULTS);
    for (const k in tunerInputs) reflectTuner(k);
    groupSel.value = cfg.grouping;
    rebuildAll();
    goHome();
    saveCfg();
  });
  actions.append(regenBtn, homeBtn, resetBtn);
  panel.appendChild(actions);

  // ---- presets row ----
  const presetRow = document.createElement("div");
  presetRow.className = "tuner-presets";
  const presetSel = document.createElement("select");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "preset name…";
  nameInput.maxLength = 24;

  function refreshPresets() {
    presetSel.textContent = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— presets —";
    presetSel.appendChild(blank);
    for (const name of Object.keys(presetStore.presets).sort()) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = (presetStore.default === name ? "★ " : "") + name;
      presetSel.appendChild(opt);
    }
  }
  refreshPresets();

  function reflectAll() {
    for (const k in tunerInputs) reflectTuner(k);
    groupSel.value = cfg.grouping;
  }

  function presetButton(label, fn) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  const saveP = presetButton("save", () => {
    const name = nameInput.value.trim() || presetSel.value;
    if (!name) return;
    presetStore.presets[name] = cfgSnapshot();
    savePresetStore();
    refreshPresets();
    presetSel.value = name;
    nameInput.value = "";
  });
  const applyP = presetButton("apply", () => {
    const p = presetStore.presets[presetSel.value];
    if (!p) return;
    const prevGrouping = cfg.grouping;
    Object.assign(cfg, p);
    sanitizeCfg();
    reflectAll();
    if (cfg.grouping !== prevGrouping) rebuildAll();
    else assemble();
    saveCfg();
  });
  const startP = presetButton("set as start", () => {
    if (!presetStore.presets[presetSel.value]) return;
    presetStore.default = presetSel.value;
    savePresetStore();
    refreshPresets();
    presetSel.value = presetStore.default;
  });
  const deleteP = presetButton("delete", () => {
    if (!presetStore.presets[presetSel.value]) return;
    delete presetStore.presets[presetSel.value];
    if (presetStore.default === presetSel.value) presetStore.default = null;
    savePresetStore();
    refreshPresets();
  });
  const copyP = presetButton("copy settings", () => {
    navigator.clipboard?.writeText(JSON.stringify(cfgSnapshot(), null, 2)).then(() => {
      copyP.textContent = "copied ✓";
      setTimeout(() => { copyP.textContent = "copy settings"; }, 1400);
    }).catch(() => {});
  });

  presetRow.append(presetSel, nameInput, saveP, applyP, startP, deleteP, copyP);
  panel.appendChild(presetRow);
  document.body.appendChild(panel);

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });

  function reflectTuner(key) {
    const t = tunerInputs[key];
    if (!t) return;
    t.input.value = cfg[key];
    t.out.value = String(Math.round(cfg[key] * 100) / 100);
  }

  // ---- sound: the cave itself --------------------------------------------------------
  // Web Audio synthesis only — a sub-bass air rumble and sparse far-off tones
  // ringing against walls miles away. All through the shared sound control.

  const sound = { ctx: null, master: null, on: false, volume: 1, timer: 0 };

  function noiseBuffer(ctx, seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish
      data[i] = last * 3.5;
    }
    return buf;
  }

  function buildAudio() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    sound.ctx = ctx;
    sound.master = ctx.createGain();
    sound.master.gain.value = 0;
    sound.master.connect(ctx.destination);

    // deep rumble — air moving through a space too big to see
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = noiseBuffer(ctx, 4);
    rumbleSrc.loop = true;
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = "lowpass";
    rumbleLp.frequency.value = 90;
    rumbleLp.Q.value = 0.6;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.16;
    lfo.connect(lfoGain).connect(rumbleGain.gain);
    rumbleSrc.connect(rumbleLp).connect(rumbleGain).connect(sound.master);
    rumbleSrc.start();
    lfo.start();

    // faint mid air
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = noiseBuffer(ctx, 4);
    airSrc.loop = true;
    const airBp = ctx.createBiquadFilter();
    airBp.type = "bandpass";
    airBp.frequency.value = 340;
    airBp.Q.value = 0.8;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.02;
    airSrc.connect(airBp).connect(airGain).connect(sound.master);
    airSrc.start();

    // echo chain for the far-off tones
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.85;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const echoLp = ctx.createBiquadFilter();
    echoLp.type = "lowpass";
    echoLp.frequency.value = 1400;
    delay.connect(echoLp).connect(feedback).connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(wet).connect(sound.master);
    sound.pingBus = ctx.createGain();
    sound.pingBus.gain.value = 1;
    sound.pingBus.connect(sound.master);
    sound.pingBus.connect(delay);
  }

  const PING_FREQS = [98, 110.5, 131, 147, 165, 196];

  function ping() {
    if (!sound.on || !sound.ctx) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const f = pick(PING_FREQS) * (Math.random() < 0.3 ? 2 : 1);
    const dur = rand(3, 7);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(rand(0.05, 0.1), t0 + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(env);
      osc.start(t0);
      osc.stop(t0 + dur + 0.1);
    }
    env.connect(sound.pingBus);
    sound.timer = window.setTimeout(ping, rand(6000, 16000));
  }

  function applyVolume() {
    if (!sound.master) return;
    const v = sound.on ? sound.volume * sound.volume : 0;
    sound.master.gain.setTargetAtTime(v, sound.ctx.currentTime, 0.4);
  }

  if (window.ElasticSoundControl) {
    window.ElasticSoundControl.attach({
      start: () => {
        if (!sound.ctx) buildAudio();
        sound.on = true;
        applyVolume();
        return sound.ctx
          .resume()
          .then(() => {
            if (sound.ctx.state !== "running") throw new Error("audio blocked");
            window.clearTimeout(sound.timer);
            sound.timer = window.setTimeout(ping, rand(2000, 6000));
          })
          .catch((err) => {
            sound.on = false;
            applyVolume();
            throw err;
          });
      },
      stop: () => {
        sound.on = false;
        window.clearTimeout(sound.timer);
        applyVolume();
        if (sound.ctx) sound.ctx.suspend().catch(() => {});
      },
      setVolume: (v) => {
        sound.volume = v;
        applyVolume();
      },
    });
  }
})();
