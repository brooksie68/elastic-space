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
  // v49 "the big dimension": the FLYABLE space is 1,000 × 1,000 × 250 km
  // (half-extents below — still static, still not tunable; James: geography
  // finalizes and freezes). The POPULATED CORE — the skull, the station
  // grid, the field, the Lantern — keeps its v38 size (CORE_*): the world
  // got vastly bigger, home didn't. The reef colonies moved OUT to a ring
  // (colonyLayout below); everything between is the gulf.
  const SPACE_X = 500000, SPACE_Z = 500000, SPACE_Y = 125000;
  const CORE_X = 24000, CORE_Z = 24000, CORE_Y = 6000;
  const DEFAULTS = {
    count: 400, // v38: denser defaults for the big static space
    dust: 2200,
    spreadX: CORE_X,
    spreadZ: CORE_Z,
    spreadY: CORE_Y,
    // v49 GOD MODE — the physics/feel knobs (James's running tally: top
    // speed and tank length are the key ones). The flat ladder: impulse /
    // booster / overdrive each carry a TOP SPEED (never a sum), a tank in
    // seconds of burn, and a 0-to-full spool time. expansion-spec.md is
    // the contract: 240 / 1,200 (240s, 5s) / 3,600 (360s, 3s).
    impTop: 240,
    boostTop: 1200,
    overTop: 3600,
    h2oTank: 240,
    deuTank: 360,
    boostSpool: 5,
    overSpool: 3,
    // v49 the ring — colony layout dials (tunable during the shaping phase,
    // then these freeze with the geography, v38-style). Distance/height in
    // km; jitter 0..1 scatters the perfect polygon organic.
    colonyDist: 250,
    colonyVert: 0,
    colonyJitter: 0.5,
    sizeMin: 18,
    sizeMax: 70,
    shellOp: 1,
    glow: 1,
    haze: 1,
    fadeSpeed: 1,
    grouping: "scatter",
    // v48 drag-stick steering: press plants a virtual joystick, offset
    // commands a turn RATE. Deadzone / reach in CSS px, rates in deg/s
    // (yaw 42 ≈ the arrows' 0.7 rad/s; pitch ~70% — kinder to the stomach),
    // curve is the response exponent between deadzone and rim.
    // v48.2 (James, after flying v48): the stick is PINNED to the center
    // reticle — hold and pull away from it; the press must start near the
    // reticle to count as a grab. "drag" (press plants the stick anywhere)
    // survives as the tuner alternative. stickModeV 0 in DEFAULTS is the
    // migration trigger — see sanitizeCfg().
    stickMode: "center",
    stickModeV: 0,
    stickDead: 14,
    stickReach: 260,
    stickYawMax: 28,  // v48.5: down from 42 — James: "I should turn slower"
    stickPitchMax: 20, // stays ~70% of yaw
    stickCurve: 1.7,
  };
  // pool: slider adds/removes orbs incrementally — NEVER re-rolls the field
  const SLIDERS = [
    { key: "count", label: "orbs", min: 12, max: 1200, step: 1, pool: true },
    { key: "dust", label: "dust", min: 0, max: 2500, step: 50, pool: true },
    { key: "sizeMin", label: "size min", min: 5, max: 120, step: 1 },
    { key: "sizeMax", label: "size max", min: 20, max: 300, step: 1 },
    { key: "shellOp", label: "glass", min: 0.2, max: 1.5, step: 0.05 },
    { key: "glow", label: "glow", min: 0, max: 2, step: 0.05 },
    { key: "haze", label: "haze", min: 0, max: 3, step: 0.05 },
    { key: "fadeSpeed", label: "color fade", min: 0.2, max: 4, step: 0.1 },
    { key: "stickDead", label: "dead zone", min: 0, max: 60, step: 1 },
    { key: "stickReach", label: "reach", min: 80, max: 600, step: 5 },
    { key: "stickYawMax", label: "yaw °/s", min: 10, max: 120, step: 1 },
    { key: "stickPitchMax", label: "pitch °/s", min: 6, max: 120, step: 1 },
    { key: "stickCurve", label: "response", min: 1, max: 3, step: 0.05 },
    // v49 GOD MODE (drive) + the ring. layout: true = rebuilds colonies,
    // stations and actors on release (change), not per-tick (input).
    { key: "impTop", label: "impulse m/s", min: 60, max: 720, step: 10 },
    { key: "boostTop", label: "booster m/s", min: 300, max: 3000, step: 25 },
    { key: "overTop", label: "overdrive m/s", min: 1200, max: 9000, step: 100 },
    { key: "h2oTank", label: "H2O tank s", min: 60, max: 600, step: 10 },
    { key: "deuTank", label: "DEU tank s", min: 60, max: 900, step: 10 },
    { key: "boostSpool", label: "boost spool s", min: 1, max: 15, step: 0.5 },
    { key: "overSpool", label: "over spool s", min: 0.5, max: 10, step: 0.25 },
    { key: "colonyDist", label: "ring dist km", min: 60, max: 450, step: 5, layout: true },
    { key: "colonyVert", label: "ring height km", min: -80, max: 80, step: 2, layout: true },
    { key: "colonyJitter", label: "ring jitter", min: 0, max: 1, step: 0.05, layout: true },
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
    // the space is not tunable (v38, reaffirmed v49) — saved cfgs and old
    // presets may still carry spread values; they lose. The spreads are the
    // CORE size now: the flyable SPACE_* bounds are constants, not cfg.
    cfg.spreadX = CORE_X;
    cfg.spreadZ = CORE_Z;
    cfg.spreadY = CORE_Y;
    if (!["scatter", "clusters", "strata", "river"].includes(cfg.grouping)) {
      cfg.grouping = "scatter";
    }
    if (!["drag", "center"].includes(cfg.stickMode)) cfg.stickMode = "center";
    // stick migrations — one per feel decision James made by voice. Each
    // runs once against older saved cfgs; after any save the version is
    // persisted and his tuner choices rule from then on.
    const stickV = Number(cfg.stickModeV) || 0;
    if (stickV < 2) cfg.stickMode = "center"; // v48.2: pinned to the reticle
    if (stickV < 3) { // v48.5: "I should turn slower"
      cfg.stickYawMax = DEFAULTS.stickYawMax;
      cfg.stickPitchMax = DEFAULTS.stickPitchMax;
    }
    cfg.stickModeV = 3;
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
    const snap = { grouping: cfg.grouping, stickMode: cfg.stickMode };
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
    "W / S impulse · A / D roll · R levels · shift = booster · space = overdrive · drag = stick (park it, the turn holds) · X stops · H home · CTRL on the console lists everything · v49.2";
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
        <section class="vs-pod pod-pos">
          <h2>POS</h2>
          <div class="vs-screen vs-rows">
            <p><span>X</span><b id="vs-px">0</b></p>
            <p><span>Y</span><b id="vs-py">0</b></p>
            <p><span>Z</span><b id="vs-pz">20000</b></p>
          </div>
        </section>
        <section class="vs-pod pod-nav">
          <h2>NAV</h2>
          <div class="vs-screen vs-rows">
            <p><span>HOME</span><b id="vs-home">1.6 km</b></p>
            <p><span>REEF</span><b id="vs-reef">— km</b></p>
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
        <section class="vs-pod pod-fuel">
          <h2>FUEL</h2>
          <div class="vs-screen vs-fuel">
            <div class="vs-frow"><span>H2O</span><div class="vs-fbar fh2o" id="vs-h2o-bar"><div id="vs-h2o"></div></div></div>
            <div class="vs-frow"><span>DEU</span><div class="vs-fbar fdeu" id="vs-deu-bar"><div id="vs-deu"></div></div></div>
          </div>
        </section>
        <div class="vs-btns">
          <button type="button" id="vs-navb" aria-expanded="false" aria-controls="orb-nav">NAV</button>
          <button type="button" id="vs-tune" aria-expanded="false" aria-controls="orb-tuner">TUNE</button>
          <button type="button" id="vs-ctrl" aria-expanded="false" aria-controls="orb-controls">CTRL</button>
        </div>
        <div class="vs-wing right"></div>
      </div>
    </div>`;
  document.body.appendChild(hud);
  const $v = (id) => hud.querySelector("#" + id);
  const vsEls = {
    hdg: $v("vs-hdg"), pit: $v("vs-pit"), bnk: $v("vs-bnk"),
    spd: $v("vs-spd"), thr: $v("vs-thr"), mode: $v("vs-mode"),
    px: $v("vs-px"), py: $v("vs-py"), pz: $v("vs-pz"),
    home: $v("vs-home"), reef: $v("vs-reef"), con: $v("vs-con"), eng: $v("vs-eng"),
    h2o: $v("vs-h2o"), deu: $v("vs-deu"),
    h2oBar: $v("vs-h2o-bar"), deuBar: $v("vs-deu-bar"),
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
layout(location=1) in vec4 i0; // SHIP-RELATIVE pos (v49), radius
layout(location=2) in vec4 i1; // h1, h2, sat, fadeDur
layout(location=3) in vec4 i2; // fadePhase, spin, variant, halo
layout(location=4) in vec4 i3; // seed, portal, veil, quadScale
layout(location=5) in vec4 i4; // kind, p0, p1, activity (v47)
uniform mat4 uVP;
uniform vec3 uRight;
uniform vec3 uUp;
out vec2 vUv;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC; // seed, portal, dist, radius
flat out vec2 vMisc; // veil flag, quad scale
flat out vec4 vD; // kind, p0, p1, activity
void main() {
  // v49 camera-relative: i0.xyz arrives already relative to the ship
  // (float64 subtraction in JS), so distance is just its length
  float d = length(i0.xyz);
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
  vD = i4;
  gl_Position = uVP * vec4(wp, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
in vec2 vUv;
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
flat in vec2 vMisc;
flat in vec4 vD; // kind, p0, p1, activity (v47)
uniform mediump sampler2DArray uShells;
uniform mediump sampler2DArray uArt;   // interior paintings + planet maps
uniform sampler2D uGlyphs;             // 8x8 rune atlas, canvas-drawn
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

// v47 helpers for the interior scenes
float h11(float n) { return fract(sin(n) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x),
             mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  float r = length(vUv);
  int kind = int(vD.x + 0.5);
  // glyphs are square runes — everyone else clips to the disc
  if (kind != 60 && r > vMisc.y) discard;
  float seed = vC.x;
  float portal = vC.y;
  float dist = vC.z;
  float radius = vC.w;

  // fog + near-fade live up here now (v47): the standalone kinds below need
  // them before the glass pipeline runs
  float fogF = exp(-dist * uFog);
  if (portal > 1.5) fogF = 1.0;
  else if (portal > 0.5) fogF = mix(fogF, 1.0, 0.6);
  // v49.2: veils get SCALED fog, not exemption. Their whole dim-mottling look
  // was designed under v38 fog (they rendered at 0.14-0.66 of authored
  // brightness); full exemption turned the walls into a ball pit of bright
  // spheres (James's report, confirmed on screen). The walls moved ~21x
  // farther out, so fog at 1/21 strength reproduces the v38 rendered look
  // at the same viewing angles. 0.05 ~= 1/21.
  if (vMisc.x > 0.5) fogF = exp(-dist * uFog * 0.05);
  float nearF = vMisc.x > 0.5 ? 1.0 : smoothstep(radius * 0.7, radius * 1.8, dist);

  // the three states (v47): act 0 = a vague glowing nothing from far away,
  // act 1 = the scene stirs as you close in, act 2 = fully awake beside you.
  // JS smooths act by distance, so the states GLIDE into each other.
  float act = vD.w;
  float vis = clamp(act, 0.0, 1.0);
  float full2 = clamp(act - 1.0, 0.0, 1.0);
  float spd = 0.35 + 0.65 * min(act, 2.0);
  float t0 = uTime + seed * 7.0;

  // early hue pair — the scenes tint with the orb's own colors
  float satE = vA.z;
  vec3 ec1 = hsl2rgb(vA.x / 360.0, satE, 0.62);
  vec3 ec2 = hsl2rgb(vA.y / 360.0, satE, 0.60);

  // ---- standalone kinds: no glass, they ARE the whole sprite --------------
  if (kind == 60) { // colony glyph: a rune sent into the dark
    vec2 guv = vUv * 0.5 + 0.5;
    float cx = mod(vD.y, 8.0);
    float cy = floor(vD.y / 8.0);
    float g = texture(uGlyphs, vec2((cx + guv.x) / 8.0, (cy + guv.y) / 8.0)).r;
    vec3 gc = mix(ec1, vec3(1.0), 0.25) * (0.75 + 0.25 * sin(t0 * 3.0));
    float ga = g * vD.z;
    frag = vec4(gc * ga, ga * 0.85) * fogF;
    return;
  }
  if (kind == 61) { // transfer mote: a hot bead of traded light
    float m = pow(smoothstep(1.0, 0.0, r), 2.0);
    vec3 mc = mix(ec1, vec3(1.0), 0.45);
    frag = vec4(mc * m * 1.3, m * 0.9) * fogF * nearF;
    return;
  }
  if (kind == 62) { // darter: a streak of living energy (p0 = screen angle)
    vec2 dq = rot2(vUv, -vD.y);
    dq.x *= 0.3;
    float dd = length(dq);
    float core = pow(smoothstep(0.85, 0.0, dd), 3.0);
    vec3 dc = mix(vec3(1.0), ec1, clamp(dd * 2.4, 0.0, 1.0));
    float da = core * vD.z;
    frag = vec4(dc * da * 1.4, da) * fogF * nearF;
    return;
  }
  if (kind == 63) { // pulse jelly: a slow bell with trailing wisps
    float ph = t0 * 1.1 + vD.y;
    vec2 jq = vUv / (0.85 + 0.15 * sin(ph));
    float bellA = smoothstep(0.62, 0.22, length(vec2(jq.x, (jq.y - 0.18) * 1.5)));
    float tent = 0.0;
    for (int i = 0; i < 4; i++) {
      float tx = (float(i) - 1.5) * 0.17;
      tent += smoothstep(0.045, 0.0, abs(jq.x - tx - sin(jq.y * 3.5 + ph * 2.0 + float(i)) * 0.07))
        * smoothstep(0.15, -0.85, jq.y);
    }
    vec3 jc = mix(ec1, ec2, jq.y * 0.5 + 0.5);
    float ja = (bellA * 0.7 + clamp(tent, 0.0, 1.0) * 0.28) * (0.55 + 0.3 * sin(ph));
    frag = vec4(jc * ja * 1.2, ja) * fogF * nearF;
    return;
  }
  if (kind == 64) { // flutter moth: a flickering wing-beat of light
    float flap = abs(sin(t0 * (6.0 + vD.z) + vD.y));
    float wingA = smoothstep(0.9, 0.1, length(vec2(vUv.x * (0.8 + 1.4 * flap), vUv.y * 2.2)));
    vec3 wc = mix(ec1, vec3(1.0), 0.3);
    float wa = wingA * (0.45 + 0.55 * flap);
    frag = vec4(wc * wa, wa * 0.85) * fogF * nearF;
    return;
  }
  if (kind >= 50) { // worldlet: a living planet in the dark (p0 = map layer)
    if (r < 1.0) {
      float nz = sqrt(max(0.0, 1.0 - r * r));
      vec3 n = vec3(vUv, nz);
      float rspd = 0.006 + 0.018 * h11(seed);
      float lon = atan(n.x, nz) / 6.28318 + uTime * rspd;
      float lat = asin(clamp(n.y, -1.0, 1.0)) / 3.14159 + 0.5;
      // mirror-wrapped longitude: the map never shows a seam
      float mu = abs(fract(lon) * 2.0 - 1.0);
      vec3 surf = texture(uArt, vec3(mix(0.035, 0.965, mu), mix(0.965, 0.035, lat), vD.y)).rgb;
      float la = seed * 2.4;
      vec3 L = normalize(vec3(cos(la) * 0.8, 0.45, 0.55 + 0.3 * sin(la)));
      float dif = max(dot(n, L), 0.0);
      vec3 pc = surf * (0.05 + 1.05 * dif) * (0.5 + 0.5 * nz);
      // night-side city lights wake as you come close
      float night = clamp(0.25 - dif, 0.0, 0.25) * 4.0;
      float sp = step(0.985, h21(floor(vec2(mu * 90.0, lat * 60.0))));
      pc += vec3(1.0, 0.85, 0.5) * sp * night * full2 * 0.55;
      // thin atmosphere at the limb, tinted the orb's hue
      pc += ec1 * pow(1.0 - nz, 3.0) * (0.22 + 0.3 * vis);
      frag = vec4(pc, 1.0) * fogF * nearF;
    } else {
      float glowR = smoothstep(1.25, 1.0, r);
      float aA = glowR * glowR * 0.3 * (0.5 + 0.5 * vis);
      frag = vec4(ec1 * aA, aA) * fogF * nearF;
    }
    return;
  }

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

  // ---- the interiors (v47): a scene behind each inhabited glass ----------
  // From far away every one of these is the plain two-layer glow above.
  // As act rises the scene crossfades in over it, animating faster and
  // showing its act-2-only extras when you're truly close.
  if (kind > 0 && act > 0.01) {
    vec2 q = vUv;
    vec3 scn = vec3(0.0);
    float sca = 0.0;
    if (kind == 1) { // swirling lights
      float ang = atan(q.y, q.x);
      float tw = t0 * spd;
      float s1 = smoothstep(0.15, 0.95, sin(ang * 3.0 + r * (6.0 + 2.0 * sin(t0 * 0.2)) - tw * 2.2));
      float s2 = smoothstep(0.3, 0.95, sin(ang * 5.0 - r * 9.0 + tw * 1.6 + 2.1));
      scn = (c1 * s1 + c2 * 0.6 * s2) * (1.2 - r);
      sca = (s1 + 0.6 * s2) * (1.0 - r * 0.7) * 0.85;
    } else if (kind == 2) { // water, with fish
      float dp = q.y * 0.5 + 0.5;
      scn = mix(vec3(0.012, 0.08, 0.16), vec3(0.05, 0.3, 0.42), dp);
      float ca = sin(q.x * 9.0 + t0 * spd * 1.3) * sin(q.y * 7.0 - t0 * spd * 0.9);
      scn += vec3(0.05, 0.13, 0.15) * smoothstep(0.55, 1.0, ca);
      sca = 0.85 * (1.0 - r * 0.35);
      for (int i = 0; i < 4; i++) {
        float fs = seed + float(i) * 13.7;
        float w1f = 0.22 + 0.06 * h11(fs);
        vec2 fp = vec2(sin(t0 * spd * w1f + fs) * 0.55,
                       sin(t0 * spd * (0.31 + 0.05 * h11(fs + 1.0)) + fs * 2.0) * 0.4);
        vec2 fd = q - fp;
        fd.x *= cos(t0 * spd * w1f + fs) > 0.0 ? 1.0 : -1.0;
        fd.y += sin(t0 * spd * 6.0 + float(i)) * 0.012;
        float body = length(vec2(fd.x * 2.4, fd.y * 7.5));
        float tail = length(vec2((fd.x + 0.1) * 4.5, fd.y * 9.0 + sin(fd.x * 40.0 + t0 * spd * 8.0) * 0.12));
        float fish = smoothstep(0.17, 0.1, min(body, tail));
        scn = mix(scn, vec3(0.02, 0.05, 0.07), fish * 0.9);
        scn += vec3(0.1, 0.22, 0.24) * fish * clamp(-fd.y, 0.0, 1.0) * 3.0;
      }
      if (act > 1.2) { // bubbles
        float bc = floor((q.x * 0.5 + 0.5) * 6.0);
        float by = fract(t0 * spd * (0.05 + 0.04 * h11(bc + seed)) + h11(bc * 3.1 + seed));
        vec2 bp = vec2((bc + 0.5) / 3.0 - 1.0 + sin(by * 8.0 + bc) * 0.04, by * 1.6 - 0.8);
        scn += vec3(0.5, 0.8, 0.9) * smoothstep(0.035, 0.014, length(q - bp)) * full2 * 0.6;
      }
    } else if (kind == 4) { // kaleidoscope patterns
      float ang = atan(q.y, q.x);
      float sec = 0.7854;
      float fa = abs(mod(ang, sec * 2.0) - sec);
      vec2 kq = vec2(cos(fa), sin(fa)) * r;
      float pet = smoothstep(0.3, 0.9, sin(kq.x * 11.0 - t0 * spd) * sin(kq.y * 11.0 + t0 * spd * 0.7));
      float ring = smoothstep(0.5, 0.95, sin(r * 14.0 - t0 * spd * 1.5));
      scn = (c1 * pet + c2 * 0.55 * ring) * (1.1 - r * 0.6);
      sca = (pet + 0.5 * ring) * 0.7 * (1.0 - r * 0.5);
    } else if (kind == 5) { // weird blobs, organic who-knows-whats
      float f = 0.0;
      for (int i = 0; i < 4; i++) {
        float bs = seed + float(i) * 7.3;
        vec2 bp = vec2(sin(t0 * spd * (0.3 + 0.15 * h11(bs)) + bs),
                       sin(t0 * spd * (0.4 + 0.1 * h11(bs + 2.0)) + bs * 1.7)) * 0.45;
        f += 0.03 / (dot(q - bp, q - bp) + 0.008);
      }
      float body = smoothstep(1.1, 1.5, f);
      float rim = smoothstep(1.1, 1.25, f) - smoothstep(1.5, 2.2, f);
      scn = c1 * body * 0.5 + c2 * rim * 0.9 + vec3(1.0) * smoothstep(3.5, 6.0, f) * 0.3;
      sca = body * 0.85;
    } else if (kind == 6) { // orrery: lights and spinning objects
      float lamp = pow(smoothstep(0.3, 0.0, r), 2.0);
      scn = mix(vec3(1.0), c1, 0.3) * lamp;
      sca = lamp;
      for (int i = 0; i < 3; i++) {
        float oi = float(i);
        float tilt = max(sin(0.35 + oi * 0.5), 0.2);
        float orad = 0.3 + oi * 0.22;
        float er = abs(length(vec2(q.x, q.y / tilt) / orad) - 1.0);
        float ring = smoothstep(0.05, 0.012, er) * 0.12;
        float ba = t0 * spd * (0.5 - oi * 0.13) + seed + oi * 2.0;
        vec2 bp = vec2(cos(ba), sin(ba) * tilt) * orad;
        float bead = pow(smoothstep(0.09, 0.0, length(q - bp)), 1.5);
        scn += c2 * ring + mix(c1, vec3(1.0), 0.5) * bead;
        sca += ring + bead;
      }
      sca = clamp(sca, 0.0, 0.95);
    } else if (kind == 7) { // reactor core
      float core = pow(smoothstep(0.35, 0.0, r), 1.6) * (0.7 + 0.3 * sin(t0 * spd * 6.0));
      float ang = atan(q.y, q.x);
      float ring1 = smoothstep(0.04, 0.015, abs(r - 0.55)) * step(0.5, fract(ang * 1.2732 + t0 * spd * 0.5));
      float ring2 = smoothstep(0.04, 0.015, abs(r - 0.78)) * step(0.5, fract(ang * 1.9099 - t0 * spd * 0.7));
      float spokes = smoothstep(0.7, 0.95, sin(ang * 6.0 + t0 * spd)) * smoothstep(0.8, 0.45, r) * step(0.3, r) * 0.35;
      scn = c1 * core * 1.3 + c2 * (ring1 + ring2) * 0.9 + c1 * spokes;
      sca = clamp(core + ring1 + ring2 + spokes, 0.0, 0.95);
      scn += vec3(1.0) * core * full2 * 0.5 * step(0.96, sin(t0 * 9.0));
    } else if (kind == 8) { // data rain
      float ci = floor((q.x * 0.5 + 0.5) * 9.0);
      float cs = h11(ci + seed);
      float fall = fract(t0 * spd * (0.15 + 0.25 * cs) + cs * 7.0);
      float yy = fract((q.y * 0.5 + 0.5) + fall);
      float trail = pow(smoothstep(0.45, 1.0, yy), 3.0);
      float cell = step(0.35, h21(vec2(ci, floor((q.y * 0.5 + 0.5) * 22.0))));
      scn = mix(vec3(0.1, 1.0, 0.55), vec3(0.4, 0.9, 1.0), cs) * trail * cell * 1.1;
      sca = trail * cell * 0.85 * (1.0 - r * 0.4);
    } else if (kind == 9) { // radar sweep
      float ang = atan(q.y, q.x);
      float sweep = fract(ang * 0.1592 - t0 * spd * 0.22);
      float beam = pow(1.0 - sweep, 6.0);
      float grid = smoothstep(0.02, 0.008, abs(r - 0.45)) + smoothstep(0.02, 0.008, abs(r - 0.8));
      scn = c1 * (beam * 0.8 * (1.0 - r * 0.5) + grid * 0.12);
      sca = beam * 0.7 * (1.0 - r * 0.3) + grid * 0.12;
      for (int i = 0; i < 3; i++) {
        float bs = seed + float(i) * 3.3;
        vec2 bp = vec2(h11(bs) * 1.4 - 0.7, h11(bs + 1.0) * 1.4 - 0.7)
          + full2 * vec2(sin(t0 * 0.2 + bs), cos(t0 * 0.17 + bs)) * 0.15;
        float bang = fract(atan(bp.y, bp.x) * 0.1592 - t0 * spd * 0.22);
        float blip = smoothstep(0.05, 0.015, length(q - bp)) * exp(-bang * 5.0);
        scn += vec3(1.0, 0.6, 0.3) * blip;
        sca += blip;
      }
    } else if (kind == 10) { // gyroscope rings
      for (int i = 0; i < 3; i++) {
        float gi = float(i);
        float w = t0 * spd * (0.4 + gi * 0.23) + seed * gi;
        vec2 gq = rot2(q, gi * 1.05 + sin(w * 0.7) * 0.6);
        float minor = max(abs(cos(w)), 0.12);
        float er = abs(length(vec2(gq.x, gq.y / minor) / (0.75 - gi * 0.18)) - 1.0);
        float ring = smoothstep(0.06, 0.02, er);
        scn += mix(c1, c2, gi * 0.5) * ring * (0.5 + 0.3 * gi);
        sca += ring * 0.45;
      }
      float hub = pow(smoothstep(0.12, 0.0, r), 2.0);
      scn += vec3(1.0) * hub;
      sca = clamp(sca + hub, 0.0, 0.95);
    } else if (kind == 11) { // circuitry
      vec2 cq = q * 4.5 + seed;
      vec2 cel = floor(cq);
      vec2 fr = fract(cq);
      float hx = h21(cel);
      float lines = step(0.35, hx) * smoothstep(0.06, 0.02, abs(fr.y - 0.5));
      lines = max(lines, step(0.7, hx) * smoothstep(0.06, 0.02, abs(fr.x - 0.5)));
      float pp = fract(t0 * spd * 0.3 + hx * 3.0);
      float px = smoothstep(0.12, 0.0, abs(fr.x - pp)) * step(0.35, hx) * smoothstep(0.08, 0.03, abs(fr.y - 0.5));
      float pad = smoothstep(0.12, 0.06, length(fr - 0.5)) * step(0.85, hx);
      scn = c1 * lines * 0.35 + c2 * (px * 1.2 + pad * 0.8);
      sca = (lines * 0.3 + px + pad * 0.7) * (1.0 - r * 0.55);
    } else if (kind == 12) { // snow-globe city
      float bx = floor((q.x * 0.5 + 0.5) * 14.0);
      float bh = 0.15 + 0.55 * h11(bx + seed);
      float inB = step(q.y, -0.55 + bh) * step(-0.55, q.y);
      vec2 wq = vec2(fract((q.x * 0.5 + 0.5) * 14.0), fract((q.y + 0.55) * 10.0));
      float win = step(0.25, wq.x) * step(wq.x, 0.75) * step(0.2, wq.y) * step(wq.y, 0.7);
      float lit = step(0.4, h21(vec2(bx, floor((q.y + 0.55) * 10.0)))) * (0.6 + 0.4 * sin(t0 * 0.5 + bx));
      scn = vec3(0.02, 0.03, 0.05) * inB + vec3(1.0, 0.8, 0.45) * inB * win * lit * (0.3 + 0.7 * vis);
      sca = inB * 0.8;
      float snow = step(0.995, h21(floor(q * 24.0 + vec2(0.0, -t0 * spd * 2.0))));
      scn += vec3(0.8) * snow * full2 * 0.5;
      sca += snow * full2 * 0.3;
      float moon = pow(smoothstep(0.2, 0.0, length(q - vec2(0.35, 0.55))), 1.5);
      scn += vec3(0.9, 0.95, 1.0) * moon * 0.5;
      sca += moon * 0.4;
    } else if (kind == 13) { // storm orb
      vec2 sq = rot2(q, t0 * spd * 0.15);
      float cloud = vnoise(sq * 3.0 + t0 * spd * 0.2) * 0.65 + vnoise(sq * 6.0 - t0 * spd * 0.13) * 0.35;
      scn = mix(vec3(0.05, 0.06, 0.1), vec3(0.25, 0.28, 0.38), cloud);
      scn = mix(scn, c1 * 0.4, smoothstep(0.6, 0.85, cloud) * 0.4);
      sca = 0.8 * (1.0 - r * 0.5);
      if (h11(floor(t0 * 1.7) + floor(seed)) > 0.8 - 0.15 * full2) {
        float fl = pow(fract(-t0 * 1.7), 2.0);
        scn += vec3(0.8, 0.85, 1.0) * fl * (1.2 - cloud) * (0.6 + full2);
        sca = min(sca + fl * 0.4, 0.95);
      }
    } else if (kind == 14) { // ember hive
      vec2 oq = q * 5.0;
      oq.x += mod(floor(oq.y), 2.0) * 0.5;
      vec2 fh = fract(oq) - 0.5;
      float cd = length(fh);
      float wave = 0.5 + 0.5 * sin(t0 * spd * 2.0 - length(floor(oq)) * 0.9);
      float comb = smoothstep(0.48, 0.42, cd) * smoothstep(0.3, 0.42, cd);
      float fill = smoothstep(0.35, 0.1, cd) * wave;
      scn = vec3(1.0, 0.65, 0.2) * (comb * 0.5 + fill * 0.8) * (0.35 + 0.65 * vis);
      sca = (comb * 0.4 + fill * 0.6) * (1.0 - r * 0.55);
      for (int i = 0; i < 5; i++) {
        float bs = seed + float(i) * 5.1;
        vec2 bp = vec2(sin(t0 * spd * (0.8 + 0.3 * h11(bs)) + bs * 3.0),
                       sin(t0 * spd * (1.1 + 0.2 * h11(bs + 1.0)) + bs)) * 0.55;
        float bee = pow(smoothstep(0.05, 0.0, length(q - bp)), 1.2);
        scn += vec3(1.0, 0.85, 0.3) * bee * (0.4 + 0.6 * vis);
        sca += bee * 0.7;
      }
    } else if (kind == 15) { // clockwork
      float ang = atan(q.x, q.y);
      float tick = smoothstep(0.035, 0.015, abs(fract(ang * 1.9099 + 0.5) - 0.5)) * smoothstep(0.92, 0.82, r) * step(0.7, r);
      vec2 mq = rot2(q, t0 * spd * 0.35);
      float hand = smoothstep(0.03, 0.01, abs(mq.x)) * step(0.0, mq.y) * step(mq.y, 0.62);
      vec2 hq = rot2(q, t0 * spd * 0.029);
      hand += smoothstep(0.045, 0.02, abs(hq.x)) * step(0.0, hq.y) * step(hq.y, 0.38);
      vec2 pq = rot2(q - vec2(0.0, -0.1), sin(t0 * spd * 2.4) * 0.5);
      float rod = smoothstep(0.02, 0.008, abs(pq.x)) * step(pq.y, -0.1) * step(-0.75, pq.y) * 0.4;
      float bob = pow(smoothstep(0.09, 0.0, length(pq - vec2(0.0, -0.72))), 1.4);
      scn = vec3(1.0, 0.78, 0.35) * (tick * 0.5 + hand * 0.9 + rod + bob * 1.1);
      sca = clamp(tick * 0.4 + hand * 0.8 + rod * 0.4 + bob, 0.0, 0.95);
    } else if (kind == 16) { // galaxy
      vec2 gq = rot2(q, t0 * spd * 0.06);
      float ang = atan(gq.y, gq.x);
      float armM = smoothstep(0.0, 0.9, sin(ang * 2.0 - log(max(r, 0.05)) * 4.5));
      float sh = h21(floor(gq * 40.0));
      float stars = step(0.93, sh) * (0.5 + 0.5 * sin(t0 * 3.0 + sh * 20.0));
      float coreG = pow(smoothstep(0.5, 0.0, r), 2.2);
      scn = c1 * armM * 0.3 * (1.0 - r * 0.7) + vec3(1.0, 0.95, 0.85) * coreG
        + vec3(0.9) * stars * (0.2 + armM * 0.8) * (1.0 - r * 0.6);
      sca = clamp(armM * 0.3 + coreG + stars * 0.6, 0.0, 0.95);
    } else if (kind == 17) { // the eye that opens
      float open = 0.15 + 0.85 * clamp(act * 0.55, 0.0, 1.0);
      float lid = smoothstep(open + 0.05, open - 0.05, abs(q.y));
      vec2 pc2 = full2 * vec2(sin(t0 * 0.4 + seed), sin(t0 * 0.31 + seed * 2.0)) * 0.12;
      float pr = length(q - pc2);
      float ang = atan(q.y - pc2.y, q.x - pc2.x);
      float iris = smoothstep(0.62, 0.58, pr) * smoothstep(0.16, 0.2, pr);
      float streak = 0.6 + 0.4 * sin(ang * 22.0 + h11(seed) * 40.0);
      scn = mix(c1, c2, streak) * streak * iris * 0.9 * lid;
      scn += vec3(0.9) * pow(smoothstep(0.08, 0.0, length(q - pc2 - vec2(0.1, 0.12))), 2.0) * lid;
      sca = (iris * 0.85 + smoothstep(0.2, 0.16, pr) * 0.9 + smoothstep(0.66, 0.6, pr) * 0.3) * lid;
    } else if (kind == 20) { // the forge
      float pool = smoothstep(-0.35, -0.6, q.y);
      float ripple = 0.5 + 0.5 * sin(q.x * 8.0 + t0 * spd * 2.0) * sin(-q.y * 6.0 - t0 * spd * 1.4);
      scn = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.8, 0.2), ripple * pool) * pool * 1.1;
      sca = pool * 0.9;
      float sxc = floor((q.x * 0.5 + 0.5) * 10.0);
      float ssp = h11(sxc + seed);
      float sy = fract(t0 * spd * (0.2 + 0.2 * ssp) + ssp * 5.0);
      vec2 spq = vec2((sxc + 0.5) / 5.0 - 1.0 + sin(sy * 9.0 + ssp * 7.0) * 0.06, -0.5 + sy * 1.3);
      float spark = smoothstep(0.03, 0.008, length(q - spq)) * (1.0 - sy);
      scn += vec3(1.0, 0.6, 0.15) * spark * 1.3;
      sca += spark;
      scn += vec3(0.6, 0.15, 0.02) * (0.25 + 0.15 * sin(t0 * spd * 3.0)) * smoothstep(0.4, -0.6, q.y) * 0.5;
    } else if (kind == 21) { // singing crystals
      for (int i = 0; i < 5; i++) {
        float csd = seed + float(i) * 11.3;
        vec2 cq2 = q - vec2(h11(csd) * 1.2 - 0.6, -0.65);
        float ht = 0.5 + 0.6 * h11(csd + 1.0);
        float shard = step(abs(cq2.x), (0.08 + 0.1 * h11(csd + 2.0)) * (1.0 - cq2.y / ht))
          * step(0.0, cq2.y) * step(cq2.y, ht);
        float glint = pow(0.5 + 0.5 * sin(t0 * spd * 1.5 + csd * 3.0), 6.0);
        scn += (c1 * 0.25 + c2 * glint * 0.9 + vec3(0.7) * glint * 0.4) * shard;
        sca += shard * (0.3 + glint * 0.6);
      }
      sca = clamp(sca, 0.0, 0.95);
    } else if (kind == 22) { // moons around a hearth
      float coreM = pow(smoothstep(0.3, 0.0, r), 1.8);
      scn = c1 * coreM * 1.2;
      sca = coreM;
      for (int i = 0; i < 3; i++) {
        float ms = seed + float(i) * 4.7;
        float orad = 0.42 + float(i) * 0.2;
        float ma = t0 * spd * (0.5 - float(i) * 0.12) + ms * 10.0;
        vec2 mp = vec2(cos(ma), sin(ma) * 0.55) * orad;
        float moon = smoothstep(0.07 + float(i) * 0.01, 0.01, length(q - mp));
        scn += mix(c2, vec3(0.85), 0.4) * moon * (0.3 + 0.7 * (0.5 + 0.5 * cos(ma)));
        sca += moon * 0.85;
        float trace = smoothstep(0.03, 0.012, abs(length(vec2(q.x, q.y / 0.55) / orad) - 1.0));
        scn += c2 * trace * 0.06;
        sca += trace * 0.08;
      }
    } else if (kind == 23) { // signal beacon
      float ang = atan(q.y, q.x);
      float rotb = t0 * spd * 0.5;
      float b1 = pow(abs(cos(ang - rotb)), 24.0);
      float b2 = pow(abs(cos(ang - rotb + 1.5708)), 60.0) * 0.5;
      float lens = pow(smoothstep(0.18, 0.0, r), 1.5);
      float morse = step(0.5, h11(floor(t0 * 2.5) + floor(seed * 10.0)));
      scn = c1 * (b1 + b2) * (1.0 - r * 0.55) * 0.9 + vec3(1.0) * lens * (0.5 + 0.5 * morse);
      sca = clamp((b1 + b2) * (1.0 - r * 0.4) * 0.8 + lens, 0.0, 0.95);
    } else if (kind == 24) { // metronome
      vec2 pq = rot2(q - vec2(0.0, 0.6), sin(t0 * spd * 1.8 + seed) * 0.7);
      float rod = smoothstep(0.015, 0.006, abs(pq.x)) * step(-1.1, pq.y) * step(pq.y, 0.0);
      float bob = pow(smoothstep(0.13, 0.0, length(pq - vec2(0.0, -1.05))), 1.6);
      float arc = smoothstep(0.02, 0.008, abs(length(q - vec2(0.0, 0.6)) - 1.05)) * smoothstep(-0.6, -0.2, q.y) * 0.2;
      scn = c2 * rod * 0.8 + mix(c1, vec3(1.0), 0.6) * bob * 1.2 + c1 * arc;
      sca = clamp(rod * 0.6 + bob + arc * 0.5, 0.0, 0.95);
    } else if (kind == 25) { // the lone jellyfish tank
      scn = mix(vec3(0.01, 0.05, 0.09), vec3(0.03, 0.12, 0.18), q.y * 0.5 + 0.5);
      sca = 0.75;
      float ph = t0 * spd * 0.7 + seed;
      vec2 jq = (q - vec2(sin(ph * 0.3) * 0.2, sin(ph * 0.23) * 0.15)) / (0.9 + 0.1 * sin(ph));
      float bellA = smoothstep(0.55, 0.2, length(vec2(jq.x, (jq.y - 0.15) * 1.5)));
      float tent = 0.0;
      for (int i = 0; i < 4; i++) {
        float tx = (float(i) - 1.5) * 0.16;
        tent += smoothstep(0.04, 0.0, abs(jq.x - tx - sin(jq.y * 3.0 + ph * 2.0 + float(i)) * 0.07))
          * smoothstep(0.15, -0.9, jq.y);
      }
      scn += c1 * (bellA * 0.55 + clamp(tent, 0.0, 1.0) * 0.3) * (0.6 + 0.3 * sin(ph));
    } else if (kind == 26) { // the library
      float shelfY = fract((q.y + 1.0) * 1.5);
      float band = floor((q.y + 1.0) * 1.5);
      float sx = (q.x * 0.5 + 0.5) * 16.0;
      float book = floor(sx);
      float bw = h21(vec2(book, band) + floor(seed));
      float spine = step(0.15, fract(sx)) * step(fract(sx), 0.9);
      float inShelf = step(shelfY, 0.55 + 0.35 * bw) * step(0.08, shelfY);
      vec3 bcol = mix(vec3(0.45, 0.2, 0.1), vec3(0.15, 0.3, 0.4), h21(vec2(book * 3.0, band)));
      bcol = mix(bcol, vec3(0.5, 0.4, 0.15), step(0.7, bw));
      scn = bcol * spine * inShelf * (0.35 + 0.55 * vis) * (0.7 + 0.3 * sin(q.y * 2.0 + 1.0));
      sca = spine * inShelf * 0.75;
      if (act > 1.2) { // a book left its shelf
        vec2 fb = q - vec2(sin(t0 * 0.3 + seed) * 0.4, 0.15 + sin(t0 * 0.23) * 0.2);
        float pages = smoothstep(0.2, 0.05, abs(fb.x) + abs(fb.y) * 2.5) * (0.8 + 0.2 * sin(t0 * 2.0));
        scn += vec3(1.0, 0.95, 0.8) * pages * full2;
        sca += pages * full2 * 0.8;
      }
    } else if (kind >= 40) { // a painting lives here (p0 = art layer)
      vec2 auv = clamp(q * 0.5 * 0.98 + 0.5, 0.0, 1.0);
      vec3 tex = texture(uArt, vec3(auv.x, 1.0 - auv.y, vD.y)).rgb;
      float breathe = 0.9 + 0.1 * sin(t0 * 0.8) + 0.04 * sin(t0 * 7.3);
      scn = tex * (0.35 + 0.65 * vis) * breathe;
      float lum = max(max(scn.r, scn.g), scn.b);
      sca = clamp(lum * 1.4, 0.0, 0.92);
      float mote = step(0.997, h21(floor(q * 40.0) + floor(t0 * 2.0)));
      scn += mote * full2 * 0.25;
    }
    // crossfade the scene in over the plain glow, held inside the glass
    float mixK = vis * smoothstep(1.0, 0.9, r);
    coreP = mix(coreP, scn, mixK);
    coreA = mix(coreA, clamp(sca, 0.0, 0.95), mixK);
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

  // halo: v49.1 — a LONG-RANGE effect now (James: the near-field version
  // read as ghost balls, and this is space, not the old cave — no medium to
  // scatter up close). The gate fades the halo in with distance-in-radii:
  // within ~40 radii you see only glass and light; by ~140 radii the halo is
  // fully on, doing its real job — making a far orb read as a glow at all.
  // Heart-flagged things (beacons, the Lantern sun) ride the never-shrink
  // radius, so their gate ratio is constant and they stay lit across the
  // map. Veils exempt: they ARE scattered wash on far rock. Falloff is
  // normalized to THIS instance's quad size so the glow reaches zero before
  // the card's edge, and steeper than before (pow 4) so what remains reads
  // as radiance, not a second shell.
  float haloGate = vMisc.x > 0.5 ? 1.0 : smoothstep(40.0, 140.0, dist / max(radius, 0.001));
  float breath = 0.75 + 0.25 * sin(uTime * 0.5 + seed * 7.0);
  float haloSpan = max(vMisc.y - 0.85, 0.2);
  float haloA = vB.w * uGlow * 0.32 * breath * haloGate *
    pow(clamp(1.0 - (r - 0.85) / haloSpan, 0.0, 1.0), 4.0);
  outP += mix(c1, c2, 1.0 - k) * haloA * 0.8;
  outA = min(1.0, outA + haloA * 0.55);

  // distance haze + near-fade were computed up top (v47)
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
  for (const name of ["uVP", "uRight", "uUp", "uShells", "uTime", "uFog", "uGlow", "uShellOp", "uFadeScale", "uArt", "uGlyphs"]) {
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

  // instance buffer: 5 vec4 per orb (v47: i4 = kind, p0, p1, activity — the
  // interior/worldlet/creature channel)
  const FLOATS = 20;
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  for (let a = 1; a <= 5; a++) {
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

  // ---- interior art + planet maps (v47) --------------------------------------
  // One 1024^2 texture array on unit 3: layers 0-2 are the Meshy interior
  // paintings (the bear, the terrarium, the workshop), layers 3-7 the five
  // planetoid surface maps. Images are drawn through a canvas with a 3.5%
  // inset crop (kills letterbox borders on the generated maps); if a PNG
  // can't load or upload (file://), a procedural painted fallback goes in
  // instead — the world degrades, never dies.
  const ART_SIZE = 1024;
  const ART_FILES = [
    "interior-art/bear-reading", "interior-art/terrarium", "interior-art/workshop",
    "planetoids/planet-lava", "planetoids/planet-ice", "planetoids/planet-gas",
    "planetoids/planet-ocean", "planetoids/planet-desert",
  ];
  const artTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, artTex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 10, gl.RGBA8, ART_SIZE, ART_SIZE, ART_FILES.length);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uArt, 3);

  // painted fallback: banded, seeded washes in a layer-specific palette —
  // close enough that worldlets still read as worlds without the files
  function fallbackArt(layer) {
    const c = document.createElement("canvas");
    c.width = c.height = ART_SIZE;
    const x = c.getContext("2d");
    const R = mulberry32(0xa27 + layer * 77);
    const hues = [[30, 20], [165, 45], [38, 30], [18, 80], [195, 45], [280, 40], [190, 60], [275, 50]][layer] || [200, 40];
    x.fillStyle = "hsl(" + hues[0] + ", " + hues[1] + "%, 6%)";
    x.fillRect(0, 0, ART_SIZE, ART_SIZE);
    for (let i = 0; i < 46; i++) {
      const y = R() * ART_SIZE;
      const h = (hues[0] + (R() - 0.5) * 40 + 360) % 360;
      x.fillStyle = "hsla(" + h + ", " + hues[1] + "%, " + (10 + R() * 30) + "%, " + (0.2 + R() * 0.5) + ")";
      x.fillRect(0, y, ART_SIZE, 8 + R() * 90);
    }
    return c;
  }

  {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = ART_SIZE;
    const cx2 = cnv.getContext("2d");
    let artDone = 0;
    const uploadArt = (layer, img) => {
      cx2.clearRect(0, 0, ART_SIZE, ART_SIZE);
      if (img) {
        const inset = 0.035;
        cx2.drawImage(img,
          img.naturalWidth * inset, img.naturalHeight * inset,
          img.naturalWidth * (1 - 2 * inset), img.naturalHeight * (1 - 2 * inset),
          0, 0, ART_SIZE, ART_SIZE);
      } else {
        cx2.drawImage(fallbackArt(layer), 0, 0);
      }
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, artTex);
      try {
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, ART_SIZE, ART_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
      } catch {
        cx2.clearRect(0, 0, ART_SIZE, ART_SIZE);
        cx2.drawImage(fallbackArt(layer), 0, 0);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, ART_SIZE, ART_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
      }
      if (++artDone === ART_FILES.length) {
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      }
      gl.activeTexture(gl.TEXTURE0);
    };
    ART_FILES.forEach((name, layer) => {
      const img = new Image();
      img.onload = () => uploadArt(layer, img);
      img.onerror = () => uploadArt(layer, null);
      img.src = "./assets/" + name + ".png";
    });
  }

  // ---- the glyph atlas (v47) --------------------------------------------------
  // 64 runes on an 8x8 canvas grid — the colony language, drawn fresh but
  // deterministically every load (seeded strokes on a 4x4 lattice). Unit 4.
  const GLYPH_N = 64;
  {
    const GS = 512, CELL = GS / 8;
    const c = document.createElement("canvas");
    c.width = c.height = GS;
    const x = c.getContext("2d");
    const R = mulberry32(0x617c9);
    x.lineCap = "round";
    for (let g = 0; g < GLYPH_N; g++) {
      const ox = (g % 8) * CELL, oy = ((g / 8) | 0) * CELL;
      const P = () => [ox + 10 + ((R() * 4) | 0) * ((CELL - 20) / 3), oy + 10 + ((R() * 4) | 0) * ((CELL - 20) / 3)];
      // soft pass then sharp pass: a faint glow bakes right into the atlas
      for (const [w, a] of [[7, 0.35], [3, 1]]) {
        x.strokeStyle = "rgba(255,255,255," + a + ")";
        x.fillStyle = x.strokeStyle;
        x.lineWidth = w;
        const R2 = mulberry32(0x2b1d + g * 131);
        const P2 = () => [ox + 10 + ((R2() * 4) | 0) * ((CELL - 20) / 3), oy + 10 + ((R2() * 4) | 0) * ((CELL - 20) / 3)];
        const strokes = 2 + ((R2() * 4) | 0);
        for (let s = 0; s < strokes; s++) {
          const [x1, y1] = P2(), [x2, y2] = P2();
          x.beginPath();
          if (R2() < 0.3) {
            x.arc(x1, y1, 4 + R2() * 10, 0, TAU * (0.35 + R2() * 0.65));
          } else {
            x.moveTo(x1, y1);
            if (R2() < 0.35) x.quadraticCurveTo((x1 + x2) / 2 + (R2() - 0.5) * 26, (y1 + y2) / 2 + (R2() - 0.5) * 26, x2, y2);
            else x.lineTo(x2, y2);
          }
          x.stroke();
        }
        if (R2() < 0.5) {
          const [dx, dy] = P2();
          x.beginPath();
          x.arc(dx, dy, w * 0.8, 0, TAU);
          x.fill();
        }
      }
      void P;
    }
    const gt = gl.createTexture();
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, gt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.uniform1i(U.uGlyphs, 4);
    gl.activeTexture(gl.TEXTURE0);
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
      // v47: the interior channel — kind selects the scene (0 = plain glow),
      // p0/p1 are its parameters, act is the smoothed 0..2 proximity state,
      // svc the robot-service boost
      kind: 0, p0: 0, p1: 1, act: 0, svc: 0,
      wx: makeWander(), wy: makeWander(), wz: makeWander(),
    };
  }

  // ---- who lives inside (v47) -----------------------------------------------
  // Roughly half the free-floating orbs carry an interior. From far away they
  // are indistinguishable from the plain ones — a vague glowing nothing — and
  // the scene only wakes as you close in. Tech is deliberately common
  // (James's spec); the bear is deliberately rare.
  const TECH_KINDS = [7, 8, 9, 10, 11, 23]; // reactor, data rain, radar, gyro, circuit, beacon
  const WONDER_KINDS = [1, 2, 4, 5, 6, 12, 13, 14, 15, 16, 17, 20, 21, 22, 24, 25, 26];
  function decorate(o) {
    if (o.portal || o.dust) return o;
    const roll = Math.random();
    if (roll < 0.08) {
      // a worldlet: one of the five planet maps, biased large, tight quad
      o.kind = 50;
      o.p0 = 3 + ((Math.random() * 5) | 0);
      o.ur = rand(0.7, 1);
      o.quadScale = 1.3;
      o.spin = 0;
      o.halo = 0.5;
      o.sat = rand(55, 80);
    } else if (roll < 0.1) {
      // a painting behind the glass — the bear reads in ~1 orb in 170
      o.kind = 40;
      const a = Math.random();
      o.p0 = a < 0.28 ? 0 : a < 0.62 ? 1 : 2;
      o.ur = rand(0.55, 1);
    } else if (roll < 0.33) {
      o.kind = pick(TECH_KINDS);
    } else if (roll < 0.53) {
      o.kind = pick(WONDER_KINDS);
    }
    return o;
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
  // ---- the Reef ---------------------------------------------------------------
  // v49: the colonies moved OUT — they ring the core at ~250km (colonyLayout
  // above; James's spec: 3 reefs, 50% out, roughly mid-plane, seeded jitter),
  // the primary mid-space destinations of the dimension. Originally (v34-v48)
  // a colony ~8.5km from the skull: nine branching
  // mineral growths crusted with pulsing polyps, a drifting haze of spores,
  // and one pale orb nested inside — a hidden bonus exit (the three near home
  // stay the canonical drift choices). Geometry comes from a seeded PRNG:
  // the reef is a monument, identical on every visit, and tmp/orb-dimension/
  // sim.mjs regenerates it exactly for verification. Fixed world coords like
  // the skull — spread sliders don't stretch it, wander doesn't melt it.
  // v35: the reef is a species, not a single monument — the flagship colony
  // (grown ~30%) plus two outlying patches. Every colony checked against the
  // skull buffer, sight corridor, and flight bounds by reef-sim.mjs. The
  // hidden exit lives only in the flagship. NAV's REEF row reads the nearest.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // ---- community layout (v49) -----------------------------------------------
  // The colonies ring the center as a regular polygon — count sets the shape
  // (2 opposed, 3 triangle, 4 square, ...), distance/vertical set where the
  // ring sits, jitter scatters position and height organically (James's
  // layout spec, expansion-spec.md). Seeded and DETERMINISTIC: same dials in,
  // same layout out, every visit — reef-sim extracts and asserts this block.
  // The first vertex starts off-axis so no colony can sit in the +Z spawn
  // sight corridor.
  const LAYOUT_SEED = 0xb17a5e;
  function colonyLayout(n, distKm, vertKm, jitter) {
    const R = mulberry32(LAYOUT_SEED);
    const out = [];
    const base = TAU * 0.125;
    for (let i = 0; i < n; i++) {
      const ang = base + (i / n) * TAU + (R() - 0.5) * jitter * (TAU / n) * 0.5;
      const d = distKm * 1000 * (1 + (R() - 0.5) * jitter * 0.24);
      const y = vertKm * 1000 + (R() - 0.5) * jitter * 36000;
      out.push([Math.cos(ang) * d, y, Math.sin(ang) * d]);
    }
    return out;
  }
  const REEF_COLONIES = [
    { c: null, trees: 12, len: [200, 380], rad: [140, 560], spores: 380, shell: 780 },
    { c: null, trees: 6, len: [120, 240], rad: [100, 340], spores: 160, shell: 520 },
    { c: null, trees: 5, len: [110, 220], rad: [90, 300], spores: 140, shell: 470 },
  ];
  function applyColonyLayout(distKm, vertKm, jitter) {
    const ring = colonyLayout(REEF_COLONIES.length, distKm, vertKm, jitter);
    for (let i = 0; i < REEF_COLONIES.length; i++) REEF_COLONIES[i].c = ring[i];
  }
  const REEF_SEED = 0x5eaf00d;
  // pure geometry from the seed: {p, r, kind 0 mineral | 1 polyp | 2 spore, fam}
  // (copied verbatim into sim.mjs — keep the two in sync)
  function reefGeometry() {
    const R = mulberry32(REEF_SEED);
    const rr = (a, b) => a + R() * (b - a);
    const pts = [];
    const branch = (fam, x, y, z, dx, dy, dz, len, depth) => {
      const steps = Math.max(3, Math.round(len / 7));
      for (let s = 0; s < steps; s++) {
        // gnarl: the direction wanders each step, biased gently back upward
        dx += rr(-0.16, 0.16); dz += rr(-0.16, 0.16);
        dy += rr(-0.1, 0.16) + (0.35 - dy) * 0.04;
        const il = 1 / Math.hypot(dx, dy, dz);
        dx *= il; dy *= il; dz *= il;
        x += dx * 7; y += dy * 7; z += dz * 7;
        const taper = 1 - (s / steps) * 0.55;
        pts.push({ p: [x, y, z], r: rr(2.6, 5.4) * taper * (1 - depth * 0.18), kind: 0, fam });
        if (R() < 0.16) {
          pts.push({ p: [x + rr(-4, 4), y + rr(-4, 4), z + rr(-4, 4)], r: rr(3.5, 8.5), kind: 1, fam });
        }
        if (depth < 2 && s > steps * 0.4 && R() < 0.07) {
          branch(fam, x, y, z, dx + rr(-0.9, 0.9), dy + rr(-0.3, 0.7), dz + rr(-0.9, 0.9), len * rr(0.4, 0.6), depth + 1);
        }
      }
      if (depth < 2) {
        for (let c = 0; c < 2; c++) {
          branch(fam, x, y, z, dx + rr(-1, 1), dy + rr(-0.2, 0.8), dz + rr(-1, 1), len * rr(0.45, 0.65), depth + 1);
        }
      }
    };
    for (const col of REEF_COLONIES) {
      for (let ti = 0; ti < col.trees; ti++) {
        const ang = (ti / col.trees) * TAU + rr(-0.25, 0.25);
        const rad = ti === 0 ? 0 : rr(col.rad[0], col.rad[1]);
        branch(ti % 5,
          col.c[0] + Math.cos(ang) * rad,
          col.c[1] + rr(-90, 40),
          col.c[2] + Math.sin(ang) * rad,
          rr(-0.4, 0.4), 1, rr(-0.4, 0.4), rr(col.len[0], col.len[1]), 0);
      }
      for (let i = 0; i < col.spores; i++) {
        const th = rr(0, TAU), ph = Math.asin(rr(-1, 1)), d = col.shell * Math.cbrt(R());
        pts.push({
          p: [
            col.c[0] + Math.cos(th) * Math.cos(ph) * d,
            col.c[1] + 60 + Math.sin(ph) * d * 0.55,
            col.c[2] + Math.sin(th) * Math.cos(ph) * d,
          ],
          r: rr(1.2, 2.6), kind: 2, fam: (R() * 5) | 0,
        });
      }
    }
    return pts;
  }
  // hue families: teal, magenta, amber, cyan, violet — one per growth
  const REEF_FAMS = [[168, 196], [300, 334], [36, 58], [186, 212], [262, 292]];
  // v47: each colony's polyp positions, for the exchange motes / glyph
  // spawners / creatures to live around. Filled by makeReef.
  let colonyPolyps = [[], [], []];
  const nearestColony = (p) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < REEF_COLONIES.length; i++) {
      const c = REEF_COLONIES[i].c;
      const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  function makeReef() {
    colonyPolyps = REEF_COLONIES.map(() => []);
    const pts = reefGeometry();
    const out = pts.map((pt) => {
      const o = baseOrb([0, 0, 0], false, false);
      const [h1, h2] = REEF_FAMS[pt.fam];
      o.reef = true;
      o.fix = pt.p;
      o.fixedR = pt.r;
      o.spin = 0;
      if (pt.kind === 0) {
        // mineral bone of the colony: dim, desaturated, barely lit. Tight
        // quads (no halo margin) — thousands of these must not multiply
        // blended pixels; the v6 fill-rate lesson stands.
        o.variant = 1;
        o.h1 = h1; o.h2 = h2;
        o.sat = rand(10, 22);
        o.halo = 0.3;
        o.fadeDur = rand(30, 60);
        o.quadScale = 1.35;
      } else if (pt.kind === 1) {
        // polyps: the living light in the family hues. v47: the pulses are
        // COORDINATED now — phase falls with distance from the colony's
        // heart, so waves of light roll outward through the whole growth.
        o.variant = 0;
        o.h1 = rand(h1, h2); o.h2 = rand(h1, h2);
        o.sat = rand(88, 97);
        o.halo = 1.5;
        const ci = nearestColony(pt.p);
        const cc = REEF_COLONIES[ci].c;
        o.fadeDur = 5.2 + ci * 1.3;
        o.fadePhase = -Math.hypot(pt.p[0] - cc[0], pt.p[1] - cc[1], pt.p[2] - cc[2]) / 55;
        colonyPolyps[ci].push(pt.p);
      } else {
        // spores: ember-like motes drifting through the colony
        o.dust = true;
        o.variant = 0;
        o.h1 = rand(h1, h2); o.h2 = rand(h1, h2);
        o.sat = rand(80, 94);
        o.halo = 1.6;
        o.fadeDur = rand(5, 14);
        o.fixAmp = 8; // slow local drift around the fixed seat
      }
      return o;
    });
    // the hidden exit, nested at the flagship's heart among the trunks
    const RC = REEF_COLONIES[0].c;
    const p = baseOrb([0, 0, 0], true, false);
    p.reef = true;
    p.fix = [RC[0] + 40, RC[1] + 130, RC[2] - 25];
    p.fixedR = 26;
    out.push(p);
    // v49 beacons: one heart-flagged glow per colony — fog-proof and never
    // smaller than a star, so from anywhere in the 1,000km gulf each colony
    // reads as a distant smudge of its own family color. Diegetic long-range
    // visibility; the NAV knows the rest.
    for (let ci = 0; ci < REEF_COLONIES.length; ci++) {
      const [h1, h2] = REEF_FAMS[ci % 5];
      const b = baseOrb([0, 0, 0], false, false);
      b.reef = true;
      b.heart = true;
      b.fix = [REEF_COLONIES[ci].c[0], REEF_COLONIES[ci].c[1] + 260, REEF_COLONIES[ci].c[2]];
      b.fixedR = 110;
      b.h1 = rand(h1, h2);
      b.h2 = rand(h1, h2);
      b.sat = 70;
      b.fadeDur = 8 + ci * 2.3;
      b.halo = 2.2;
      b.spin = 0;
      b.variant = 0;
      out.push(b);
    }
    return out;
  }

  // ---- fuel stations (v38) --------------------------------------------------
  // 64 water globes + 36 deuterium depots at fixed seeded positions — fuel is
  // "quite forgiving": from anywhere in the volume the nearest water is a
  // short impulse hop (sim-asserted). Deterministic like the reef; the sim
  // extracts this block verbatim. Markers: `const STATION_SEED` … `// station hues`.
  const STATION_SEED = 0xf0e15;
  function stationGeometry() {
    const R = mulberry32(STATION_SEED);
    const out = { h2o: [], deu: [] };
    // stratified, not random: one station per grid cell, jittered inside 80%
    // of it — pure random left 14km deuterium voids (sim TEST 9 caught it).
    // Cells re-roll until they clear the skull buffer and sight corridor.
    const bad = (x, y, z) =>
      Math.hypot(x, y, z) < 2600 || (z > 0 && z < 20600 && Math.hypot(x, y) < 1100);
    const place = (arr, nx, ny, nz) => {
      const XR = 21500, YR = 4600, ZR = 21500;
      const cw = [(2 * XR) / nx, (2 * YR) / ny, (2 * ZR) / nz];
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          for (let k = 0; k < nz; k++) {
            let x, y, z, tries = 0;
            do {
              x = -XR + (i + 0.1 + 0.8 * R()) * cw[0];
              y = -YR + (j + 0.1 + 0.8 * R()) * cw[1];
              z = -ZR + (k + 0.1 + 0.8 * R()) * cw[2];
            } while (++tries < 60 && bad(x, y, z));
            if (!bad(x, y, z)) arr.push([x, y, z]);
          }
        }
      }
    };
    place(out.h2o, 4, 4, 4); // 64
    place(out.deu, 3, 4, 3); // 36
    // v49: each ring colony gets a doorstep cluster — two water globes and a
    // deuterium depot a short hop out from its heart (outside the reef shell,
    // inside a minute of impulse). The destinations have gas; the full
    // guaranteed-find gulf grid is a later phase (expansion-spec.md).
    for (const col of REEF_COLONIES) {
      const cc = col.c;
      const a0 = R() * TAU;
      const dh = col.shell + 1600 + R() * 1400;
      out.h2o.push([cc[0] + Math.cos(a0) * dh, cc[1] + (R() - 0.5) * 900, cc[2] + Math.sin(a0) * dh]);
      out.h2o.push([cc[0] + Math.cos(a0 + Math.PI) * dh, cc[1] + (R() - 0.5) * 900, cc[2] + Math.sin(a0 + Math.PI) * dh]);
      const dd = col.shell + 2400 + R() * 1800;
      out.deu.push([cc[0] + Math.cos(a0 + Math.PI / 2) * dd, cc[1] + (R() - 0.5) * 900, cc[2] + Math.sin(a0 + Math.PI / 2) * dd]);
    }
    return out;
  }
  // station hues: water blues; deuterium's hot amber-green
  applyColonyLayout(cfg.colonyDist, cfg.colonyVert, cfg.colonyJitter);
  let STATIONS = stationGeometry();

  function makeStations() {
    const out = [];
    for (const c of STATIONS.h2o) {
      // a loose knot of blue glass globes — one big, four small
      for (let i = 0; i < 5; i++) {
        const o = baseOrb([0, 0, 0], false, false);
        o.station = true;
        const th = (i / 5) * TAU + rand(0, TAU / 5);
        const d = i === 0 ? 0 : rand(26, 55);
        o.fix = [c[0] + Math.cos(th) * d, c[1] + rand(-30, 30), c[2] + Math.sin(th) * d];
        o.fixAmp = 4;
        o.fixedR = i === 0 ? rand(16, 20) : rand(8, 13);
        o.variant = 0;
        o.h1 = rand(203, 214);
        o.h2 = rand(216, 228);
        o.sat = rand(88, 96);
        o.halo = 1.5;
        o.fadeDur = rand(3.5, 7);
        o.spin = 0;
        out.push(o);
      }
    }
    for (const c of STATIONS.deu) {
      // a tight hot knot pulsing fast — reads radioactive in this light language
      for (let i = 0; i < 7; i++) {
        const o = baseOrb([0, 0, 0], false, false);
        o.station = true;
        const th = (i / 7) * TAU + rand(0, TAU / 7);
        const d = i === 0 ? 0 : rand(16, 40);
        o.fix = [c[0] + Math.cos(th) * d, c[1] + rand(-22, 22), c[2] + Math.sin(th) * d];
        o.fixAmp = 3;
        o.fixedR = i === 0 ? rand(12, 15) : rand(5, 9);
        o.variant = 1;
        o.h1 = rand(68, 82);
        o.h2 = rand(88, 102);
        o.sat = rand(92, 98);
        o.halo = 1.7;
        o.fadeDur = rand(1.1, 2.2);
        o.spin = 0;
        out.push(o);
      }
    }
    return out;
  }

  // ---- Vess-Karai, the Lantern (v47) ----------------------------------------
  // A kilometer of beveled glass standing on the cave floor, far out at
  // [9500, ·, 6500] — base seated at y −5850 (buried a little toward the
  // floor veils), apex at −4850, a white-gold sun pulsing inside. The mesh
  // comes from Blender (tmp/orb-dimension/pyramid_build.py → pyramid.bin);
  // the glass is a fresnel pass in this file. Fixed geometry like the skull.
  const LANTERN = {
    pos: [9500, -5850, 6500],           // base center, world coords
    light: [9500, -5450, 6500],         // the sun inside, 400m up the axis
    nav: [9500, -5300, 6500],           // NAV ring target (mid-height)
  };

  // ---- actors (v47): everything that moves on its own -----------------------
  // Colony exchange motes, glyph messages, three species of energy creature,
  // the Lantern's lights, robot engine glows and cargo. All are orb
  // instances whose o.fix arrays get rewritten every frame — the renderer
  // never knows the difference.
  function actorBase(kind, r, h1, h2) {
    const o = baseOrb([0, 0, 0], false, false);
    o.actor = true;
    o.fix = [0, 0, 0];
    o.fixedR = r;
    o.kind = kind;
    o.h1 = h1;
    o.h2 = h2;
    o.sat = 90;
    o.halo = 0.4;
    o.spin = 0;
    o.quadScale = kind === 60 ? 1.0 : kind === 62 ? 1.7 : 1.4;
    return o;
  }
  const qBez = (a, m, b, u, i) =>
    (1 - u) * (1 - u) * a[i] + 2 * u * (1 - u) * m[i] + u * u * b[i];

  let actorOrbs = [];
  const colonyLife = []; // update records, one per animated actor
  const robotFleet = { list: [], nodes: null };

  function makeActors() {
    actorOrbs = [];
    colonyLife.length = 0;
    robotFleet.list = [];
    robotFleet.nodes = null;

    // -- colony life
    for (let ci = 0; ci < REEF_COLONIES.length; ci++) {
      const col = REEF_COLONIES[ci];
      const polyps = colonyPolyps[ci].length ? colonyPolyps[ci] : [col.c];
      const [h1, h2] = REEF_FAMS[ci % 5];
      const pp = () => pick(polyps);
      // exchange motes: beads of light traded polyp to polyp
      for (let i = 0; i < 10; i++) {
        const o = actorBase(61, rand(1.8, 3.2), rand(h1, h2), rand(h1, h2));
        actorOrbs.push(o);
        colonyLife.push({ type: "mote", o, ci, a: pp(), b: pp(), u: Math.random(), dur: rand(2.5, 6) });
      }
      // glyphs: runes released into the dark around the growths
      for (let i = 0; i < 8; i++) {
        const o = actorBase(60, rand(4, 9), h1, h2);
        o.p0 = (Math.random() * GLYPH_N) | 0;
        o.p1 = 0;
        const fr = pp();
        o.fix = fr.slice(); // seat at a polyp from frame one — never at the origin
        actorOrbs.push(o);
        colonyLife.push({ type: "glyph", o, ci, from: fr, vel: [0, 0, 0], life: rand(0, 8), dur: rand(6, 11) });
      }
      // darters: streaks with a 3-echo tail (closed-form path, echoes lag it)
      for (let i = 0; i < 5; i++) {
        const os = [];
        for (let k = 0; k < 4; k++) {
          const o = actorBase(62, 3, rand(h1, h2), rand(h1, h2));
          o.p1 = [1, 0.55, 0.32, 0.16][k];
          actorOrbs.push(o);
          os.push(o);
        }
        colonyLife.push({
          type: "darter", os, ci,
          R: rand(140, 380), w1: rand(0.22, 0.45), w2: rand(0.3, 0.55), w3: rand(0.2, 0.4),
          s1: rand(0, TAU), s2: rand(0, TAU), s3: rand(0, TAU),
        });
      }
      // jellies: slow pulsing bells riding thermals
      for (let i = 0; i < 4; i++) {
        const o = actorBase(63, rand(5, 9), h1, h2);
        o.p0 = rand(0, TAU);
        actorOrbs.push(o);
        colonyLife.push({ type: "jelly", o, ci, R: rand(120, 380), w: rand(0.04, 0.09), s: rand(0, TAU), bob: rand(0.3, 0.6) });
      }
      // moths: quick figure-eights around a favorite polyp
      for (let i = 0; i < 6; i++) {
        const o = actorBase(64, 1.7, rand(h1, h2), rand(h1, h2));
        o.p0 = rand(0, TAU);
        o.p1 = rand(2, 6); // flap speed
        actorOrbs.push(o);
        colonyLife.push({ type: "moth", o, ci, anchor: pp(), A: rand(14, 30), w: rand(0.5, 1.1), s: rand(0, TAU), retarget: rand(14, 26) });
      }
    }

    // -- the Lantern's own light
    {
      const sun = actorBase(0, 90, 46, 52);
      sun.heart = true; // fog-proof, never smaller than a star — a lit window across the whole space
      sun.sat = 65;
      sun.fadeDur = 9;
      sun.halo = 2.2;
      sun.fix = LANTERN.light.slice();
      actorOrbs.push(sun);
      const washy = actorBase(0, 800, 40, 46);
      washy.veil = true;
      washy.sat = 55;
      washy.halo = 0.4;
      washy.fadeDur = 40;
      washy.quadScale = 1.05;
      washy.fix = [LANTERN.pos[0], LANTERN.pos[1] - 100, LANTERN.pos[2]];
      actorOrbs.push(washy);
      for (let i = 0; i < 6; i++) {
        const o = actorBase(0, 6, 42, 50);
        o.sat = 80;
        o.halo = 1.5;
        o.fadeDur = rand(3, 6);
        actorOrbs.push(o);
        colonyLife.push({ type: "ringlight", o, i });
      }
    }

    // -- the service fleet: robots spawn scattered among the stations —
    // which include the colony doorstep clusters now (v49), so a few work
    // the ring communities. The two Lantern caretakers spawn at their post.
    for (let i = 0; i < 14; i++) {
      const home = i < 2 ? LANTERN.nav : i % 2 ? pick(STATIONS.h2o) : pick(STATIONS.deu);
      const glow = actorBase(0, 0, 190, 200);
      glow.sat = 90;
      glow.halo = 1.8;
      glow.fadeDur = 1.3;
      actorOrbs.push(glow);
      const cargo = actorBase(0, 0, 210, 218);
      cargo.sat = 92;
      cargo.halo = 1.2;
      cargo.fadeDur = 2.5;
      actorOrbs.push(cargo);
      robotFleet.list.push({
        pos: [home[0] + rand(-40, 40), home[1] + rand(-20, 20), home[2] + rand(-40, 40)],
        vel: [0, 0, 0],
        f: [0, 0, -1], // smoothed facing
        state: "idle",
        node: null,
        serviceT: 0,
        orbit: rand(0, TAU),
        carrying: false,
        glow, cargo,
        seed: rand(0, 100),
      });
    }
  }

  // world position of a free orb right now (same math as the frame loop) —
  // lets a robot follow the thing it's servicing as it wanders
  function orbWorldPos(o, t) {
    if (o.fix) return [o.fix[0], o.fix[1], o.fix[2]];
    const amp = o.dust ? 30 : o.portal ? 15 : 60;
    return [
      o.n[0] * cfg.spreadX + wander(o.wx, t) * amp,
      o.n[1] * cfg.spreadY + wander(o.wy, t) * amp * 0.6,
      o.n[2] * cfg.spreadZ + wander(o.wz, t) * amp,
    ];
  }

  // pick the fleet's next stop: inhabited orbs mostly, else depots, the
  // colonies, and the Lantern (two robots keep it as their whole beat)
  function robotNextNode(rb, idx) {
    if (idx < 2) {
      // Lantern caretakers circle between its corners and the sun
      const a = rand(0, TAU);
      return { kind: "point", p: [LANTERN.pos[0] + Math.cos(a) * rand(120, 500), LANTERN.pos[1] + rand(150, 900), LANTERN.pos[2] + Math.sin(a) * rand(120, 500)], stand: 30 };
    }
    // v49: robots are LOCAL workers — nothing they pick may be more than a
    // commute away (the colonies are 250km out now; a robot cruising 110 m/s
    // must never sign up for a three-day haul). Too-far picks fall through
    // to the nearest station.
    const LOCAL = 40000;
    const near = (p) => Math.hypot(p[0] - rb.pos[0], p[1] - rb.pos[1], p[2] - rb.pos[2]) < LOCAL;
    const roll = Math.random();
    if (roll < 0.45) {
      if (!robotFleet.nodes || !robotFleet.nodes.length) {
        robotFleet.nodes = orbs.filter((o) => o.kind && o.kind < 60 && !o.actor && !o.veil);
      }
      const o = pick(robotFleet.nodes);
      if (o && near(orbWorldPos(o, 0))) return { kind: "orb", o, stand: 0 };
    }
    if (roll < 0.9) {
      const col = REEF_COLONIES.find((c) => near(c.c));
      if (roll >= 0.7 && col) {
        return { kind: "point", p: [col.c[0] + rand(-200, 200), col.c[1] + rand(0, 160), col.c[2] + rand(-200, 200)], stand: 60 };
      }
      const arr = Math.random() < 0.6 ? STATIONS.h2o : STATIONS.deu;
      const local = arr.filter(near);
      if (local.length) return { kind: "point", p: pick(local), stand: 40, isStation: true };
    }
    if (near(LANTERN.pos)) {
      const a = rand(0, TAU);
      return { kind: "point", p: [LANTERN.pos[0] + Math.cos(a) * rand(200, 700), LANTERN.pos[1] + rand(200, 800), LANTERN.pos[2] + Math.sin(a) * rand(200, 700)], stand: 40 };
    }
    // fallback: the nearest station of any kind — always local by definition
    let best = null, bd = Infinity;
    for (const arr of [STATIONS.h2o, STATIONS.deu]) {
      for (const c of arr) {
        const d = Math.hypot(c[0] - rb.pos[0], c[1] - rb.pos[1], c[2] - rb.pos[2]);
        if (d < bd) { bd = d; best = c; }
      }
    }
    return { kind: "point", p: best, stand: 40, isStation: true };
  }

  function updateActors(t, dt, bb) {
    // colony life + lantern ring
    for (const a of colonyLife) {
      if (a.type === "mote") {
        a.u += dt / a.dur;
        if (a.u >= 1) {
          a.a = a.b;
          a.b = pick(colonyPolyps[a.ci].length ? colonyPolyps[a.ci] : [REEF_COLONIES[a.ci].c]);
          a.u = 0;
          a.dur = rand(2.5, 6);
        }
        const c = REEF_COLONIES[a.ci].c;
        const mid = [
          (a.a[0] + a.b[0]) / 2 + ((a.a[0] + a.b[0]) / 2 - c[0]) * 0.25,
          (a.a[1] + a.b[1]) / 2 + 30,
          (a.a[2] + a.b[2]) / 2 + ((a.a[2] + a.b[2]) / 2 - c[2]) * 0.25,
        ];
        const e = a.u * a.u * (3 - 2 * a.u); // ease
        for (let i = 0; i < 3; i++) a.o.fix[i] = qBez(a.a, mid, a.b, e, i);
      } else if (a.type === "glyph") {
        a.life += dt;
        if (a.life >= a.dur) {
          a.life = 0;
          a.dur = rand(6, 11);
          a.from = pick(colonyPolyps[a.ci].length ? colonyPolyps[a.ci] : [REEF_COLONIES[a.ci].c]);
          const c = REEF_COLONIES[a.ci].c;
          const out = vnorm([a.from[0] - c[0], 0, a.from[2] - c[2]]);
          const sp = rand(6, 14);
          a.vel = [out[0] * sp + rand(-3, 3), rand(4, 10), out[2] * sp + rand(-3, 3)];
          a.o.p0 = (Math.random() * GLYPH_N) | 0;
          a.o.fixedR = rand(4, 9);
          a.o.fix = a.from.slice();
        }
        for (let i = 0; i < 3; i++) a.o.fix[i] += a.vel[i] * dt;
        const u = a.life / a.dur;
        a.o.p1 = Math.min(1, u / 0.12) * Math.min(1, (1 - u) / 0.3) * 0.9;
      } else if (a.type === "darter") {
        const c = REEF_COLONIES[a.ci].c;
        const P = (tt) => [
          c[0] + Math.sin(tt * a.w1 + a.s1) * a.R,
          c[1] + 40 + Math.sin(tt * a.w2 + a.s2) * a.R * 0.35,
          c[2] + Math.sin(tt * a.w3 + a.s3) * a.R,
        ];
        const now = P(t), prev = P(t - 0.06);
        const v = [now[0] - prev[0], now[1] - prev[1], now[2] - prev[2]];
        const ang = Math.atan2(vdot(v, bb.u), vdot(v, bb.r));
        for (let k = 0; k < 4; k++) {
          const p = k === 0 ? now : P(t - k * 0.07);
          a.os[k].fix[0] = p[0];
          a.os[k].fix[1] = p[1];
          a.os[k].fix[2] = p[2];
          a.os[k].p0 = ang;
        }
      } else if (a.type === "jelly") {
        const c = REEF_COLONIES[a.ci].c;
        const th = t * a.w + a.s;
        a.o.fix[0] = c[0] + Math.cos(th) * a.R;
        a.o.fix[1] = c[1] + 60 + Math.sin(t * a.bob + a.s * 2) * 45;
        a.o.fix[2] = c[2] + Math.sin(th) * a.R;
      } else if (a.type === "moth") {
        a.retarget -= dt;
        if (a.retarget <= 0) {
          a.retarget = rand(14, 26);
          a.anchor = pick(colonyPolyps[a.ci].length ? colonyPolyps[a.ci] : [REEF_COLONIES[a.ci].c]);
        }
        const th = t * a.w + a.s;
        a.o.fix[0] = a.anchor[0] + Math.sin(th) * a.A;
        a.o.fix[1] = a.anchor[1] + Math.sin(th * 2) * a.A * 0.4;
        a.o.fix[2] = a.anchor[2] + Math.cos(th) * a.A;
      } else if (a.type === "ringlight") {
        const th = t * 0.05 + (a.i / 6) * TAU;
        a.o.fix[0] = LANTERN.pos[0] + Math.cos(th) * 700;
        a.o.fix[1] = LANTERN.pos[1] + 120 + Math.sin(t * 0.3 + a.i) * 25;
        a.o.fix[2] = LANTERN.pos[2] + Math.sin(th) * 700;
      }
    }

    // the fleet: to and fro, pick up, deliver (only once the body exists)
    if (!robotMesh.ready) return;
    for (let ri = 0; ri < robotFleet.list.length; ri++) {
      const rb = robotFleet.list[ri];
      if (!rb.node) {
        rb.node = robotNextNode(rb, ri);
        rb.state = "travel";
        // leaving a station = picking up supplies
        rb.carrying = Math.random() < 0.55;
      }
      const tp = rb.node.kind === "orb" ? orbWorldPos(rb.node.o, t) : rb.node.p;
      const stand = rb.node.kind === "orb" ? radiusOf(rb.node.o) + 16 : rb.node.stand;
      const dx = tp[0] - rb.pos[0], dy = tp[1] - rb.pos[1], dz = tp[2] - rb.pos[2];
      const d = Math.hypot(dx, dy, dz) || 1;
      if (rb.state === "travel") {
        const cruise = clamp(d / 6, 24, 110);
        const k = 1 - Math.exp(-dt / 1.4);
        rb.vel[0] += ((dx / d) * cruise - rb.vel[0]) * k;
        rb.vel[1] += ((dy / d) * cruise - rb.vel[1]) * k;
        rb.vel[2] += ((dz / d) * cruise - rb.vel[2]) * k;
        if (d < stand + 26) {
          rb.state = "service";
          rb.serviceT = rand(7, 16);
        }
      } else {
        // service: a slow patient orbit around the client
        rb.serviceT -= dt;
        rb.orbit += dt * 0.35;
        const so = stand + 10;
        const want = [
          tp[0] + Math.cos(rb.orbit) * so,
          tp[1] + Math.sin(t * 0.9 + rb.seed) * 5,
          tp[2] + Math.sin(rb.orbit) * so,
        ];
        const k = 1 - Math.exp(-dt / 0.9);
        rb.vel[0] += ((want[0] - rb.pos[0]) * 0.8 - rb.vel[0]) * k;
        rb.vel[1] += ((want[1] - rb.pos[1]) * 0.8 - rb.vel[1]) * k;
        rb.vel[2] += ((want[2] - rb.pos[2]) * 0.8 - rb.vel[2]) * k;
        if (rb.node.kind === "orb") rb.node.o.svc = 1.6; // the visit wakes the orb
        if (rb.serviceT <= 0) {
          rb.node = null; // deliveries done — next client
          rb.carrying = false;
        }
      }
      rb.pos[0] += rb.vel[0] * dt;
      rb.pos[1] += rb.vel[1] * dt;
      rb.pos[2] += rb.vel[2] * dt;
      const sp = Math.hypot(rb.vel[0], rb.vel[1], rb.vel[2]);
      if (sp > 2) {
        const k2 = 1 - Math.exp(-dt * 3);
        rb.f = vnorm(vlerp(rb.f, [rb.vel[0] / sp, rb.vel[1] / sp, rb.vel[2] / sp], k2));
      }
      // engine glow rides under the hull, brighter the harder it works
      rb.glow.fix[0] = rb.pos[0];
      rb.glow.fix[1] = rb.pos[1] - 2.6 + Math.sin(t * 1.3 + rb.seed) * 0.4;
      rb.glow.fix[2] = rb.pos[2];
      rb.glow.fixedR = 1.1 + (sp / 110) * 1.6;
      // cargo swings below on the way to a delivery
      rb.cargo.fixedR = rb.carrying ? 1.7 : 0;
      if (rb.carrying) {
        rb.cargo.fix[0] = rb.pos[0] + rb.f[0] * -1.2;
        rb.cargo.fix[1] = rb.pos[1] - 4.4;
        rb.cargo.fix[2] = rb.pos[2] + rb.f[2] * -1.2;
      }
    }
  }

  let veilOrbs = [];
  let eyeOrbs = [];
  let reefOrbs = [];
  let stationOrbs = [];
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
      decorate(o);
      // the welcoming committee guarantees a few wonders by the monument:
      // a gas-giant worldlet, a reactor, the reading bear, and the fish
      if (i === 0) { o.kind = 50; o.p0 = 5; o.ur = rand(0.8, 1); o.quadScale = 1.3; o.spin = 0; o.halo = 0.5; o.sat = 70; }
      if (i === 3) { o.kind = 7; o.p0 = 0; }
      if (i === 5) { o.kind = 40; o.p0 = 0; o.ur = rand(0.7, 1); }
      if (i === 8) { o.kind = 2; o.p0 = 0; }
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
  // v49: the walls moved to the REAL bounds (500km out) — veils are fixed
  // world coords now (not spread-scaled; the spreads are the core), scaled
  // ~21x so the angular cover from the middle of the space matches v38.
  // They're fog-exempt in the shader: rock 600km away still reads as rock.
  function makeVeils() {
    const veils = [];
    const patch = (nx, ny, nz) => {
      const o = baseOrb([0, 0, 0], false, false);
      o.veil = true;
      o.fix = [nx * SPACE_X, ny * SPACE_Y, nz * SPACE_Z];
      o.fixedR = rand(67000, 109000);
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
    return decorate(baseOrb(n, (i + 1) % 60 === 0));
  }

  function assemble() {
    const ringUsed = Math.min(ringOrbs.length, cfg.count);
    const fieldNeed = Math.max(0, cfg.count - ringUsed);
    while (fieldPool.length < fieldNeed) fieldPool.push(fieldOrb(fieldPool.length));
    while (dustPool.length < cfg.dust) {
      // ember dust (v49): tiny motes in a CAMERA-LOCAL recycled box — the
      // frame loop wraps them around the ship, so flying always has parallax
      // to read speed against, anywhere in the 1,000km. o.n seeds the seat.
      dustPool.push(baseOrb([rand(-1.3, 1.3), rand(-1.3, 1.3), rand(-1.3, 1.3)], false, true));
    }
    // (the Heart orb retired 2026-07-18 — the Skull took over as home; the
    // HOME readout and edge marker still point at the origin, now its center)
    orbs = ringOrbs.slice(0, ringUsed).concat(
      fieldPool.slice(0, fieldNeed),
      portalOrbs,
      eyeOrbs,
      reefOrbs,
      stationOrbs,
      actorOrbs,
      veilOrbs,
      dustPool.slice(0, cfg.dust),
    );
    robotFleet.nodes = null; // the fleet re-learns its clients after a reshuffle

    // the monument stands alone: any orb inside KEEP meters of the origin is
    // pushed radially out to a shell just beyond the skull (corner radius
    // ~1370m at 3x scale, +wander margin). Eyes exempt (they live in the
    // sockets), dust exempt (ember atmosphere), veils are outside anyway.
    // Radial push in world space = scaling the normalized coords, since
    // world = n * spread componentwise. Soft clamp keeps pushed orbs from
    // leaving the field entirely at extreme tuner spreads.
    const KEEP = 2400; // v33: widened from 1560 — "give the skull a nice buffer"
    for (const o of orbs) {
      if (o.veil || o.dust || o.eye || o.fix) continue; // fixed monuments hold their ground
      const wx = o.n[0] * cfg.spreadX, wy = o.n[1] * cfg.spreadY, wz = o.n[2] * cfg.spreadZ;
      const r = Math.hypot(wx, wy, wz);
      if (r < KEEP) {
        const f = (KEEP * (1 + Math.random() * 0.18)) / Math.max(r, 1);
        o.n[0] = clamp(o.n[0] * f, -1.35, 1.35);
        o.n[1] = clamp(o.n[1] * f, -1.35, 1.35);
        o.n[2] = clamp(o.n[2] * f, -1.35, 1.35);
      }
      // v33: the load-in sightline stays clear — a cylinder along +Z from the
      // buffer edge to just past spawn (radius 950 around the view axis;
      // v41: stretched to z 20600 with the new spawn). Anything drifting
      // into frame between you and the face gets pushed sideways out.
      const wz2 = o.n[2] * cfg.spreadZ;
      if (wz2 > 0 && wz2 < 20600) {
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

  // v49: relayout re-seats the ring (colonies, their doorstep stations, the
  // actors that live around them) WITHOUT re-rolling the field pools — the
  // never-re-roll rule holds while James drags the ring sliders.
  function relayout() {
    applyColonyLayout(cfg.colonyDist, cfg.colonyVert, cfg.colonyJitter);
    STATIONS = stationGeometry();
    reefOrbs = makeReef();
    stationOrbs = makeStations();
    makeActors(); // after makeReef — the colony life needs the polyp lists
    assemble();
  }
  function rebuildAll() {
    groupCtx = newGroupCtx();
    fieldPool = [];
    dustPool = [];
    ringOrbs = makeRing();
    portalOrbs = makePortals();
    eyeOrbs = makeEyes();
    veilOrbs = makeVeils();
    relayout(); // colonies + stations + actors, then assemble
  }
  rebuildAll();

  // ---- camera + flight -------------------------------------------------------------

  // LOOK-ONLY BUILD: the camera is bolted in place 1600m outside the central
  // group, facing it. No translation of any kind — rotation is the only motion,
  // and it only happens when asked. Flight returns once looking works.
  // Free-flight orientation (James is a No Man's Sky pilot): the camera is an
  // orthonormal basis — f forward, r right, u up — rotated incrementally in
  // its OWN frame. Roll persists until R glides you back to the ecliptic.
  // v42: spawn aims between Korrudan's eyes — James measured the dead-on
  // pitch at −3° from the spawn point by eye. Position stays [0,0,20000];
  // only the nose dips. R still levels to the true horizon.
  const SPAWN_PITCH = (-3 * Math.PI) / 180;
  const spawnBasis = () => ({
    f: [0, Math.sin(SPAWN_PITCH), -Math.cos(SPAWN_PITCH)],
    r: [1, 0, 0],
    u: [0, Math.cos(SPAWN_PITCH), Math.sin(SPAWN_PITCH)],
  });
  const cam = {
    pos: [0, 0, 20000], // v22: 2600; v29: 3600; v30: 5600; v41: 20000 — a long approach across the static space
    ...spawnBasis(),
  };
  let pendingYaw = 0;   // eased look input awaiting application
  let pendingPitch = 0;
  // v47: the nose has rotational inertia now. Mouse deltas land in the
  // pending reservoir as before, but the applied rotation runs through a
  // critically-damped second-order filter — angular VELOCITY is continuous,
  // so hand jitter can't echo into rapid back-and-forth. Net rotation still
  // exactly equals the drag distance; it just arrives like a ship, not a
  // laser pointer. (James: "a space ship wouldn't fly like that.")
  let lookRateYaw = 0;   // rad/s, smoothed
  let lookRatePitch = 0;
  // v48 drag-stick: where the press planted the stick center, and whether
  // the pilot's hand is "on". Beyond-deadzone pointer motion arms it;
  // autopilot engage, R-leveling, and H all disarm it, so a cursor merely
  // parked off-center can never steer the ship on its own.
  const stick = { ax: 0, ay: 0 };
  let stickLive = false;
  let rollVel = 0;      // rad/s
  let leveling = false;
  let thrust = 0;       // current thruster speed, m/s
  let impulse = 0;      // impulse-drive speed, m/s — coasts on release (v44)
  let overdrive = false;
  let allStop = false;  // X: brake to a halt (v37)
  // the tanks (v38): fractions 0..1. H2O feeds the booster, deuterium feeds
  // overdrive. Fly into a station to refill to full (chime + meter flourish).
  const fuel = { h2o: 1, deu: 1 };
  function refill(kind) {
    fuel[kind] = 1;
    fuelChime(kind);
    const bar = kind === "h2o" ? vsEls.h2oBar : vsEls.deuBar;
    bar.classList.remove("flare");
    void bar.offsetWidth; // restart the animation even on back-to-back fills
    bar.classList.add("flare");
    setTimeout(() => bar.classList.remove("flare"), 1100);
  }

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
    cam.pos = [0, 0, 20000];
    const b = spawnBasis();
    cam.f = b.f;
    cam.r = b.r;
    cam.u = b.u;
    pendingYaw = 0;
    pendingPitch = 0;
    lookRateYaw = 0;
    lookRatePitch = 0;
    stickLive = false;
    rollVel = 0;
    leveling = false;
    thrust = 0;
    impulse = 0;
    overdrive = false;
    autoNav = null;
  }

  const keys = new Set();

  const isTyping = (e) =>
    e.target instanceof HTMLElement &&
    (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON");

  window.addEventListener("keydown", (e) => {
    if (isTyping(e)) return;
    keys.add(e.code);
    // hands ON anything = the autopilot lets go (N only toggles the panel)
    if (autoNav && e.code !== "KeyN") autoNav = null;
    if (e.code === "KeyN") setOpen("nav");
    if (e.code === "KeyH") goHome();
    if (e.code === "KeyX") {
      // all-stop (v37): cancel the drives, bleed to a halt fast
      if (overdrive) odThump(false);
      allStop = true;
      overdrive = false;
    }
    // any fresh thrust input releases the all-stop
    if (["ShiftLeft", "ShiftRight", "Space", "KeyW", "KeyS"].includes(e.code)) allStop = false;
    if (e.code === "Space") {
      e.preventDefault();
      if (!overdrive && fuel.deu <= 0) {
        // no deuterium: the pulse drive won't light. SYS says why.
        vsEls.eng.textContent = "NO DEU";
      } else {
        overdrive = !overdrive;
        odThump(overdrive); // pulse drive ignition / wind-down (v34)
      }
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  const drag = { on: false, downX: 0, downY: 0, downT: 0 };
  const mouse = { x: -1, y: -1 };

  canvas.addEventListener("pointerdown", (e) => {
    drag.on = true;
    drag.downX = e.clientX;
    drag.downY = e.clientY;
    drag.downT = performance.now();
    stick.ax = e.clientX; // v48: the press plants the stick center
    stick.ay = e.clientY;
    canvas.classList.add("dragging");
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    // v48 drag-stick: nothing accumulates here anymore — the frame loop
    // reads the live offset. Crossing the deadzone while holding is the
    // "hands on" signal that arms the stick and releases the autopilot /
    // leveling. Arming is per-hold (cleared on release, v48.2).
    if (!drag.on) return;
    const ax = cfg.stickMode === "center" ? window.innerWidth / 2 : stick.ax;
    const ay = cfg.stickMode === "center" ? window.innerHeight / 2 : stick.ay;
    // center mode: only a hold that BEGAN near the reticle (half of reach)
    // is a steering grab — a drag that started out at a portal stays a drag
    const grabbed = cfg.stickMode !== "center" ||
      Math.hypot(drag.downX - ax, drag.downY - ay) <= cfg.stickReach * 0.5;
    if (grabbed && Math.hypot(e.clientX - ax, e.clientY - ay) > cfg.stickDead) {
      stickLive = true;
      leveling = false;
      autoNav = null; // steering by hand cancels the lock-on
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    drag.on = false;
    stickLive = false; // v48.2: arming is per-hold — release always neutrals
    canvas.classList.remove("dragging");
    const moved = Math.abs(e.clientX - drag.downX) + Math.abs(e.clientY - drag.downY);
    if (moved < 6 && performance.now() - drag.downT < 400) {
      // an armed nav ring takes the click first: inside the circle = lock on
      if (navArmed && navTarget && navScreen.on &&
          Math.hypot(e.clientX - navScreen.x, e.clientY - navScreen.y) <= navScreen.r + 8) {
        autoNav = { standoff: navTarget.standoff };
        navAligned = 0;
        navArmed = false;
        stickLive = false; // v48: the parked cursor must not re-steer
        navRing.classList.remove("armed");
      } else {
        tryPortalClick(e.clientX, e.clientY);
      }
    }
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
    // v49: the far plane covers the whole big dimension (corner-to-corner
    // ~1,436km). Depth precision is spent up close where the meshes live;
    // orbs don't write depth, so far conflicts can't artifact.
    const near = 2, far = 1600000;
    proj.fill(0);
    proj[0] = f / aspect;
    proj[5] = f;
    proj[10] = (far + near) / (near - far);
    proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);
  }
  function setView(b) {
    // v49 CAMERA-RELATIVE: everything renders in SHIP space. Positions are
    // subtracted against cam.pos in JS (float64) before they reach the GPU,
    // so the view matrix is rotation-only — zero translation. This is what
    // kills float32 jitter at 250km+ from the origin; do not reintroduce a
    // world-space translation here.
    view[0] = b.r[0]; view[4] = b.r[1]; view[8] = b.r[2];
    view[1] = b.u[0]; view[5] = b.u[1]; view[9] = b.u[2];
    view[2] = -b.f[0]; view[6] = -b.f[1]; view[10] = -b.f[2];
    view[3] = 0; view[7] = 0; view[11] = 0;
    view[12] = 0;
    view[13] = 0;
    view[14] = 0;
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
      const [buf, img, normImg] = await Promise.all([
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
        // the Meshy normal map (extracted raw from the source GLB, v34) — the
        // fine sculpted detail the decimation can't carry. Optional: if it
        // fails to load the skull just lights by vertex normals as before.
        new Promise((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => res(null);
          im.src = "assets/skull/skull-normal.jpg";
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
out vec3 vP;
void main() {
  vN = aNorm;
  vUV = aUV;
  vP = aPos;
  // v49 camera-relative: uVP carries rotation only; subtract the camera here.
  // The skull's own coords are small (it lives at the origin), so this
  // subtraction is exact where it matters — up close.
  vec3 rp = aPos - uCamPos;
  vDist = length(rp);
  gl_Position = uVP * vec4(rp, 1.0);
}`;
      const sfs = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uNorm;
uniform float uHasNorm;
uniform float uFog;
uniform float uTime;
in vec3 vN;
in vec2 vUV;
in float vDist;
in vec3 vP;
out vec4 oC;

// cotangent-frame normal mapping (Schueler): the tangent basis is derived
// per-pixel from screen-space derivatives of position and UV, so no tangent
// attribute is needed and any UV flip is absorbed into B automatically.
vec3 perturb(vec3 N, vec3 P, vec2 uv) {
  vec3 dp1 = dFdx(P), dp2 = dFdy(P);
  vec2 du1 = dFdx(uv), du2 = dFdy(uv);
  vec3 dp2p = cross(dp2, N);
  vec3 dp1p = cross(N, dp1);
  vec3 T = dp2p * du1.x + dp1p * du2.x;
  vec3 B = dp2p * du1.y + dp1p * du2.y;
  float inv = inversesqrt(max(dot(T, T), dot(B, B)) + 1e-12);
  vec3 tn = texture(uNorm, uv).rgb * 2.0 - 1.0; // glTF convention: +Y up
  return normalize(mat3(T * inv, B * inv, N) * tn);
}

void main() {
  vec3 base = texture(uTex, vUV).rgb;
  vec3 N = normalize(vN);
  if (uHasNorm > 0.5) N = perturb(N, vP, vUV);
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
      for (const n of ["uVP", "uCamPos", "uTex", "uNorm", "uHasNorm", "uFog", "uTime"])
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
      // the normal map rides on unit 2 (orbs own 0, basecolor owns 1)
      let hasNorm = 0;
      if (normImg) {
        const ntex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, ntex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, normImg);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) {
          gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
            Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        }
        skull.ntex = ntex;
        hasNorm = 1;
      }
      gl.activeTexture(gl.TEXTURE0);

      gl.useProgram(p);
      gl.uniform1i(skull.U.uTex, 1);
      gl.uniform1i(skull.U.uNorm, 2);
      gl.uniform1f(skull.U.uHasNorm, hasNorm);
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

  // ---- generic mesh plumbing (v47): the Lantern + the fleet ride the
  // skull's binary format (magic / nv / ni / interleaved pos-norm-uv / u32
  // idx). Served-only like the skull — on file:// these simply don't exist.
  async function loadMeshBin(url, magic) {
    const buf = await fetch(url).then((r) => {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.arrayBuffer();
    });
    const dv = new DataView(buf);
    if (dv.getUint32(0, false) !== magic) throw new Error("bad magic " + url);
    const nv = dv.getUint32(4, true);
    const ni = dv.getUint32(8, true);
    const verts = new Float32Array(buf, 12, nv * 8);
    const idx = new Uint32Array(buf, 12 + nv * 32, ni);
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
    return { vao, count: ni };
  }
  function makeProg(vsrc, fsrc, names) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const Us = {};
    for (const nm of names) Us[nm] = gl.getUniformLocation(p, nm);
    return { p, U: Us };
  }

  // ---- Vess-Karai's glass (v47): fresnel panes over a warm inner sun.
  // Drawn blended after the opaque meshes, no depth write — orbs behind it
  // shine through the glass, which is what glass full of light should do.
  const pyr = { ready: false, count: 0, vao: null, prog: null };
  (async () => {
    try {
      const mesh = await loadMeshBin("assets/pyramid/pyramid.bin", 0x50595241); // "PYRA"
      const vs = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform vec3 uOrigin;
out vec3 vN;
out vec3 vP;
void main() {
  vP = aPos + uOrigin;
  vN = aNorm;
  gl_Position = uVP * vec4(vP, 1.0);
}`;
      const fs = `#version 300 es
precision highp float;
uniform vec3 uCamPos;
uniform vec3 uLight;
uniform float uTime;
uniform float uFog;
in vec3 vN;
in vec3 vP;
out vec4 oC;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vP);
  // faceted crystal: flat panes stay quiet, the beveled ribs catch rim light
  float fres = pow(1.0 - abs(dot(N, V)), 2.2);
  float pulse = 0.75 + 0.25 * sin(uTime * 0.7);
  // the sun inside — glass nearer the light glows warm from within
  float ld = distance(vP, uLight);
  float glow = 260000.0 / (ld * ld + 30000.0);
  vec3 glass = vec3(0.5, 0.8, 1.0) * (0.06 + fres * (0.5 + 0.3 * pulse));
  vec3 warm = vec3(1.0, 0.78, 0.42) * glow * (0.5 + 0.5 * pulse);
  float a = clamp(0.08 + fres * 0.75 + glow * 0.2, 0.0, 0.85);
  float fogF = exp(-distance(vP, uCamPos) * uFog * 1.2);
  oC = vec4((glass + warm) * a * fogF, a * fogF);
}`;
      const pr = makeProg(vs, fs, ["uVP", "uOrigin", "uCamPos", "uLight", "uTime", "uFog"]);
      pyr.prog = pr;
      pyr.vao = mesh.vao;
      pyr.count = mesh.count;
      pyr.ready = true;
    } catch (e) {
      // no pyramid on file:// — the floor keeps its dark
    }
  })();

  // ---- the fleet's body (v47): James's Meshy service robot, prepped by
  // tmp/orb-dimension/robot_prep.py into robot.bin + a 1K basecolor.
  // ROBOT_FACING flips the nose if the model turns out to fly backwards —
  // one-number tune, can't be judged without James's eyes.
  const ROBOT_FACING = 1;
  const robotMesh = { ready: false, count: 0, vao: null, prog: null };
  (async () => {
    try {
      const [mesh, img] = await Promise.all([
        loadMeshBin("assets/robot/robot.bin", 0x52424f54), // "RBOT"
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = "assets/robot/robot-basecolor.jpg";
        }),
      ]);
      const vs = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vN;
out vec2 vUV;
out vec3 vP;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vP = wp.xyz;
  vN = mat3(uModel) * aNorm;
  vUV = aUV;
  gl_Position = uVP * wp;
}`;
      const fs = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uCamPos;
uniform float uFog;
in vec3 vN;
in vec2 vUV;
in vec3 vP;
out vec4 oC;
void main() {
  vec3 base = texture(uTex, vUV).rgb;
  vec3 N = normalize(vN);
  float key = max(dot(N, normalize(vec3(-0.4, 0.75, 0.5))), 0.0);
  float rim = max(dot(N, normalize(vec3(0.5, -0.1, -0.8))), 0.0);
  float under = max(-N.y, 0.0); // its own engine light, from below
  vec3 col = base * (vec3(0.16, 0.17, 0.2)
    + key * vec3(0.9, 0.95, 1.05) * 0.9
    + rim * vec3(0.3, 0.4, 0.55) * 0.25
    + under * vec3(0.4, 0.9, 1.0) * 0.5);
  col *= exp(-distance(vP, uCamPos) * uFog * 1.4);
  oC = vec4(col, 1.0);
}`;
      const pr = makeProg(vs, fs, ["uVP", "uModel", "uCamPos", "uFog", "uTex"]);
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(pr.p);
      gl.uniform1i(pr.U.uTex, 5);
      gl.useProgram(prog);
      robotMesh.prog = pr;
      robotMesh.vao = mesh.vao;
      robotMesh.count = mesh.count;
      robotMesh.ready = true;
    } catch (e) {
      // no robot mesh — the fleet stays grounded (its actors stay dark too)
    }
  })();

  // column-major model matrix for one robot: nose along its smoothed facing
  const robotMat = new Float32Array(16);
  function robotModel(rb, t) {
    let f = [rb.f[0] * ROBOT_FACING, rb.f[1] * ROBOT_FACING, rb.f[2] * ROBOT_FACING];
    let rgt = Math.abs(f[1]) > 0.98 ? [1, 0, 0] : vnorm(vcross([0, 1, 0], f));
    const up = vcross(f, rgt);
    robotMat[0] = rgt[0]; robotMat[1] = rgt[1]; robotMat[2] = rgt[2]; robotMat[3] = 0;
    robotMat[4] = up[0]; robotMat[5] = up[1]; robotMat[6] = up[2]; robotMat[7] = 0;
    robotMat[8] = f[0]; robotMat[9] = f[1]; robotMat[10] = f[2]; robotMat[11] = 0;
    // v49 camera-relative: the model matrix seats the robot in SHIP space
    // (float64 subtraction here) — its shader gets uCamPos = 0
    robotMat[12] = rb.pos[0] - cam.pos[0];
    robotMat[13] = rb.pos[1] - cam.pos[1] + Math.sin(t * 1.1 + rb.seed) * 0.5; // hover bob
    robotMat[14] = rb.pos[2] - cam.pos[2];
    robotMat[15] = 1;
  }

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

    // -- the thruster: hold shift to burn toward full speed; release and you
    // coast down over a few seconds. Velocity always follows the gaze, so
    // steering with the mouse curves the flight. Space toggles OVERDRIVE.
    // v49 GOD MODE: tops, tanks and spools all live in cfg (flat ladder,
    // expansion-spec.md — defaults 240 / 1,200 / 3,600, tanks 240s / 360s,
    // spools 5s / 3s). The booster BUILDS, overdrive SLAMS.
    const VMAX = cfg.boostTop, VOVER = cfg.overTop;
    // the booster drinks water; overdrive burns deuterium (v38). Tanks are
    // generous and impulse is always free — a dry tank means limping (a long
    // limp, out in the gulf), never stranding.
    const burning = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && fuel.h2o > 0;
    if (burning && !overdrive) fuel.h2o = Math.max(0, fuel.h2o - dt / cfg.h2oTank);
    if (overdrive) {
      fuel.deu = Math.max(0, fuel.deu - dt / cfg.deuTank);
      if (fuel.deu === 0) {
        overdrive = false; // the pulse drive sputters out
        odThump(false);
      }
    }
    // the boosts respect the S key (per James 2026-07-17): holding S points
    // the burn backwards — shift and overdrive thrust in REVERSE while it's
    // down, swinging smoothly through zero, and swing forward again on release
    const rev = keys.has("KeyS") ? -1 : 1;
    const target = (overdrive ? VOVER : burning ? VMAX : 0) * rev;
    if (autoNav && navTarget) {
      // -- lock-on autopilot (v43): hands off — the nose eases onto the
      // course and the nav-assist thrusters cruise (no tank drain). The
      // ship hands back to the free coast exactly one coast-length short
      // of the standoff, so you arrive just as the drift dies.
      const dx = navTarget.pos[0] - cam.pos[0];
      const dy = navTarget.pos[1] - cam.pos[1];
      const dz = navTarget.pos[2] - cam.pos[2];
      const dist = Math.hypot(dx, dy, dz) || 1;
      const dir = [dx / dist, dy / dist, dz / dist];
      const ang = Math.acos(clamp(vdot(cam.f, dir), -1, 1));
      if (ang > 0.0005) {
        rotateCam(vnorm(vcross(cam.f, dir)), Math.min(ang, 0.5 * dt));
      }
      if (dist <= autoNav.standoff + (Math.abs(thrust) + Math.abs(impulse)) * 3.2 + 40) {
        autoNav = null; // release — the coast carries you to the doorstep
      } else {
        // v49: the autopilot cruises at up to overdrive speed for the long
        // hauls — lock a colony 250km out, go get a drink (the #57 loop).
        // Nav-assist thrust stays free; fuel is for flying it yourself.
        const cruise = clamp(dist / 8, 140, cfg.overTop);
        thrust += (cruise - thrust) * (1 - Math.exp(-dt / 1.2));
      }
    } else if (allStop) {
      // X = all-stop (v37): brake hard but smooth — no head-snap. Any new
      // thrust input releases it (handled in keydown).
      thrust *= Math.exp(-dt / 0.35);
      if (Math.abs(thrust) < 4) { thrust = 0; allStop = false; }
    } else if (target !== 0) {
      // v49 spools: 0-to-full in cfg.boostSpool / cfg.overSpool seconds
      // (exponential family — tau = spool/3.9 puts ~98% of top at the mark).
      // Overdrive's 3s is a SLAM; the dampeners are canonically excellent.
      const tau = (overdrive ? cfg.overSpool : cfg.boostSpool) / 3.9;
      thrust += (target - thrust) * (1 - Math.exp(-dt / tau));
    } else {
      // free coast (v37: 1.6 → 3.2 per James — the drift after a burn should
      // carry you a good while; X is there when you want to stop)
      thrust *= Math.exp(-dt / 3.2);
      if (Math.abs(thrust) < 4) thrust = 0;
    }

    // -- IMPULSE (v38 name, was "the dolly"): hold W to glide forward along
    // your gaze, S to back out. Burns nothing.
    // v44: releasing the key COASTS (same 3.2s constant as the thruster —
    // it's space, this speed doesn't just vanish); X still brakes everything.
    const IMPULSE = cfg.impTop; // m/s (80 → 120 v38; 240 + GOD MODE v49)
    const dolly = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    if (dolly !== 0) {
      impulse += (dolly * IMPULSE - impulse) * (1 - Math.exp(-dt / 0.5));
    } else if (allStop) {
      impulse *= Math.exp(-dt / 0.35);
      if (Math.abs(impulse) < 2) impulse = 0;
    } else {
      impulse *= Math.exp(-dt / 3.2);
      if (Math.abs(impulse) < 2) impulse = 0;
    }
    // v49 FLAT ladder (James: "each mode should have a flat top speed.
    // easier."): the dominant drive carries the ship — never a sum. Engaging
    // a bigger drive mid-glide only ever adds speed; nothing stacks past the
    // mode's top. Continuous at the crossover (both sides equal there).
    const speed = Math.abs(thrust) >= Math.abs(impulse) ? thrust : impulse;
    if (sound.on && sound.engine) updateEngine(thrust, dolly !== 0);
    if (speed !== 0) {
      const bd = camBasis();
      // flight bounds are the REAL space now (v49) — the core spreads only
      // size the neighborhood, not the cage
      const bounds = [SPACE_X * 0.95, SPACE_Y * 0.95, SPACE_Z * 0.95];
      for (let i = 0; i < 3; i++) {
        cam.pos[i] = clamp(cam.pos[i] + bd.f[i] * speed * dt, -bounds[i], bounds[i]);
      }
    }

    // -- fuel pickup: fly within 150m of a station and that tank sweeps to
    // full — success chime, meter flourish. Stations are depots, permanent.
    for (const kind of ["h2o", "deu"]) {
      if (fuel[kind] > 0.999) continue;
      for (const c of STATIONS[kind]) {
        const dx = cam.pos[0] - c[0], dy = cam.pos[1] - c[1], dz = cam.pos[2] - c[2];
        if (dx * dx + dy * dy + dz * dz < 22500) { refill(kind); break; }
      }
    }

    // -- rotation, all in the camera's OWN frame (banked yaw curves the bank)
    //
    // v48 drag-stick: the pointer's OFFSET from where the press planted the
    // stick commands a turn RATE — a virtual joystick. Deadzone in the
    // middle, response curve between, and a saturation rim ("reach") past
    // which more distance adds nothing: park the cursor at the rim and the
    // ship holds its best turn forever. No more feeding the turn with desk
    // travel. The rate feeds pending at rate*dt exactly like the arrow keys,
    // so the v47 servo below still owns all the smoothing. Center mode
    // (default since v48.2, James's spec): the stick is PINNED to the
    // center reticle — grab near it, hold, and pull; the reticle itself
    // marks neutral, so no extra chrome on the glass. Both modes steer
    // only while the button is held.
    const DEG = Math.PI / 180;
    const stickAx = cfg.stickMode === "center" ? window.innerWidth / 2 : stick.ax;
    const stickAy = cfg.stickMode === "center" ? window.innerHeight / 2 : stick.ay;
    const stickHeld = stickLive && !autoNav && drag.on;
    let stickMag = 0; // 0..1 deflection after deadzone, 1 = saturated
    if (stickHeld) {
      const dx = mouse.x - stickAx, dy = mouse.y - stickAy;
      const mag = Math.hypot(dx, dy);
      if (mag > cfg.stickDead) {
        const span = Math.max(1, cfg.stickReach - cfg.stickDead);
        stickMag = Math.min(1, (mag - cfg.stickDead) / span);
        // radial curve, direction preserved — gentle near center for aim,
        // full authority at the rim
        const gain = Math.pow(stickMag, cfg.stickCurve) / mag;
        pendingYaw -= dx * gain * cfg.stickYawMax * DEG * dt;
        pendingPitch -= dy * gain * cfg.stickPitchMax * DEG * dt;
      }
    }
    // the stick's instruments: anchor dot + saturation rim. Shown while
    // steering, or once a press is clearly a hold (so you can see neutral
    // before committing); the rim brightens when you've hit full deflection.
    // v48.1: rim hidden — James found the circle too present on his first
    // flight ("might not be necessary"). Physics untouched; the anchor dot
    // stays as the neutral marker. Flip STICK_RIM to bring the rim back.
    const STICK_RIM = false;
    const showStick = cfg.stickMode === "center"
      ? false // the reticle IS the center marker — nothing extra (v48.2)
      : drag.on && (stickLive || performance.now() - drag.downT > 250);
    if (showStick !== stickUi.shown) {
      stickUi.shown = showStick;
      stickDot.classList.toggle("on", showStick);
      stickRim.classList.toggle("on", showStick && STICK_RIM);
    }
    if (showStick) {
      stickDot.style.left = stickAx + "px";
      stickDot.style.top = stickAy + "px";
      if (STICK_RIM) {
        stickRim.style.left = stickAx + "px";
        stickRim.style.top = stickAy + "px";
        stickRim.style.width = stickRim.style.height = cfg.stickReach * 2 + "px";
        stickRim.classList.toggle("sat", stickMag >= 1);
      }
    }

    const ROT = 0.7; // rad/s (arrow keys)
    if (keys.has("ArrowLeft")) { pendingYaw += ROT * dt; leveling = false; }
    if (keys.has("ArrowRight")) { pendingYaw -= ROT * dt; leveling = false; }
    if (keys.has("ArrowUp")) { pendingPitch += ROT * dt; leveling = false; }
    if (keys.has("ArrowDown")) { pendingPitch -= ROT * dt; leveling = false; }
    // critically-damped servo onto the pending look (v47): rate accelerates
    // toward the remaining input and damps as it arrives — smooth start,
    // smooth stop, zero overshoot, and rapid mouse reversals blend instead
    // of snapping. LOOK_W sets the response (~0.4s to settle); the old
    // first-order ease had the same latency but a discontinuous velocity,
    // which was the jerk James felt.
    const LOOK_W = 10;
    lookRateYaw += (LOOK_W * LOOK_W * pendingYaw - 2 * LOOK_W * lookRateYaw) * dt;
    lookRatePitch += (LOOK_W * LOOK_W * pendingPitch - 2 * LOOK_W * lookRatePitch) * dt;
    const yawStep = lookRateYaw * dt;
    const pitchStep = lookRatePitch * dt;
    pendingYaw -= yawStep;
    pendingPitch -= pitchStep;
    if (yawStep !== 0) rotateCam(cam.u, yawStep);
    if (pitchStep !== 0) rotateCam(cam.r, pitchStep);

    // -- roll: A/D bank while held and STAY banked (per James, NMS pilot —
    // moved off Q/E 2026-07-17 so he can bank + point the nose with the mouse;
    // Q/E stay unassigned for now)
    // v48.6: climbing back up in +10% steps by ear (James) — the slower
    // stick made 0.46 feel like nothing. History: 0.66 → 0.46 → 0.51.
    const ROLL_RATE = 0.51; // rad/s
    const rollIn = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    rollVel += (rollIn * ROLL_RATE - rollVel) * (1 - Math.exp(-dt * 6));
    if (Math.abs(rollVel) > 1e-4) {
      rotateCam(cam.f, rollVel * dt);
      if (rollIn !== 0) leveling = false;
    }

    // -- coordinated turn: banking IS turning (James, v26) — RETIRED v48.4.
    // James's pencil spec: "A and D shouldn't make me do anything except
    // rotate the ship around its middle axis... like a pencil coming all
    // the way straight through the middle of it." The carve dates from the
    // pre-stick era when banking was the only way to turn in flight; the
    // pinned stick owns turning now, so roll is pure orientation. Flying
    // forward + D = corkscrew barrel roll, nose glued to the target.
    // Flip BANK_CARVE to bring the v26 behavior back.
    const BANK_CARVE = false;
    const TURN_RATE = 0.5; // rad/s of heading at full bank
    const bankRad = Math.atan2(cam.r[1], cam.u[1]);
    if (BANK_CARVE && Math.abs(bankRad) > 0.02 && speed !== 0) {
      // v40: wings need airflow. The carve scales with speed and is ZERO at
      // a standstill — James's "drift while the speedo reads 0" was this
      // turn spinning the world around a parked, banked ship. Full turn
      // authority from impulse speed (120) up.
      const authority = clamp(Math.abs(speed) / 120, 0, 1);
      // v48.3: the carve YIELDS to the hand. It rotates in the WORLD frame,
      // so under a held pull it bent the ship off the mouse's line — and
      // read reversed when inverted (James: "it wants to pull the other
      // way"). Stick deflection fades it: full pull = pure mouse authority,
      // hands off = the v26 carve untouched. Never let a world-frame
      // rotation fight the pilot's pull.
      rotateCam([0, 1, 0], TURN_RATE * Math.sin(bankRad) * authority * (1 - stickMag) * dt);
    }

    // -- R: glide back to the plane of the ecliptic (level roll and pitch,
    // keep heading) over about a second
    if (keys.has("KeyR")) {
      if (!leveling) stickLive = false; // v48: R takes the stick until the hand moves again
      leveling = true;
    }
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

    // -- THE GAZE (v34): within a few km the dead god's eyes follow you.
    // Each eye drifts inside its socket toward your direction — clamped so it
    // stays seated (the bone rim partially occludes it at extremes), eased at
    // a deliberately slow time constant so you notice on the third visit,
    // not the first. Beyond ~6km the gaze relaxes back to dead ahead.
    for (const o of eyeOrbs) {
      if (!o.gaze) o.gaze = [0, 0];
      const ex = cam.pos[0] - o.fix[0], ey = cam.pos[1] - o.fix[1], ez = cam.pos[2] - o.fix[2];
      const ed = Math.hypot(ex, ey, ez) || 1;
      const w = clamp((6000 - ed) / 3500, 0, 1);
      const k = 1 - Math.exp(-dt * 0.6);
      o.gaze[0] += ((ex / ed) * 48 * w - o.gaze[0]) * k;
      o.gaze[1] += ((ey / ed) * 48 * w - o.gaze[1]) * k;
    }

    // -- the living layer (v47): colony life, the Lantern's lights, the fleet
    updateActors(t, dt, camBasis());

    // -- orb world positions + depth sort (back to front)
    const n = orbs.length;
    if (wp.length !== n * 3) wp = new Float32Array(n * 3);
    const sx = cfg.spreadX, sy = cfg.spreadY, sz = cfg.spreadZ;
    const actEase = 1 - Math.exp(-dt / 0.9);
    let contacts = 0; // real orbs within sensor range (2.5 km), for the console
    for (let i = 0; i < n; i++) {
      const o = orbs[i];
      // wander is absolute meters, NOT spread-scaled: "drifting slowly about"
      // means a few m/s, and near orbs must never flee the visitor
      let x, y, z;
      if (o.fix) {
        // seated in the skull or the reef: fixed world coords, no spread
        // scaling. Eyes carry the gaze offset; reef spores drift locally.
        x = o.fix[0]; y = o.fix[1]; z = o.fix[2];
        if (o.gaze) { x += o.gaze[0]; y += o.gaze[1]; }
        else if (o.fixAmp) {
          x += wander(o.wx, t) * o.fixAmp;
          y += wander(o.wy, t) * o.fixAmp * 0.6;
          z += wander(o.wz, t) * o.fixAmp;
        }
      } else if (o.dust) {
        // v49 CAMERA-LOCAL DUST: the mote field rides with the ship. Each
        // mote holds a world-fixed seat until it leaves a box around the
        // camera, then recycles to the far side — honest parallax at any
        // speed, anywhere in the 1,000km, and no direction is ever empty.
        // At 3,600 m/s the recycling is what makes speed READ at all.
        x = o.n[0] * 4000 + wander(o.wx, t) * 30;
        y = o.n[1] * 2000 + wander(o.wy, t) * 18;
        z = o.n[2] * 4000 + wander(o.wz, t) * 30;
        x = cam.pos[0] + (((x - cam.pos[0]) % 8000) + 12000) % 8000 - 4000;
        y = cam.pos[1] + (((y - cam.pos[1]) % 4000) + 6000) % 4000 - 2000;
        z = cam.pos[2] + (((z - cam.pos[2]) % 8000) + 12000) % 8000 - 4000;
      } else {
        const amp = o.heart || o.veil ? 0 : o.portal ? 15 : 60;
        x = o.n[0] * sx + wander(o.wx, t) * amp;
        y = o.n[1] * sy + wander(o.wy, t) * amp * 0.6;
        z = o.n[2] * sz + wander(o.wz, t) * amp;
      }
      wp[i * 3] = x; wp[i * 3 + 1] = y; wp[i * 3 + 2] = z;
      const dx = x - cam.pos[0], dy = y - cam.pos[1], dz = z - cam.pos[2];
      dists[i] = dx * dx + dy * dy + dz * dz;
      if (!o.dust && !o.veil && !o.reef && !o.actor && dists[i] < 6250000) contacts++;
      // the three states (v47): far = vague nothing, near = stirring, very
      // near = fully awake. Thresholds scale with the orb's size (a big
      // worldlet declares itself sooner); a robot's service call also wakes
      // its client. Smoothed, so the states glide.
      if (o.kind && o.kind < 60) {
        const orr = radiusOf(o);
        const nearD = orr * 20 + 1200, vnearD = orr * 6 + 250;
        let tgt = dists[i] < vnearD * vnearD ? 2 : dists[i] < nearD * nearD ? 1 : 0;
        if (o.svc > 0) {
          tgt = Math.max(tgt, Math.min(o.svc, 2));
          o.svc = Math.max(0, o.svc - dt / 2.5);
        }
        o.act += (tgt - o.act) * actEase;
      }
      order[i] = i;
    }
    order.sort((a, bI) => dists[bI] - dists[a]);

    // -- viewscreen: throttle bar and reticle horizon track every frame, the
    // text readouts refresh at ~8 Hz so the numbers stay legible
    vsEls.thr.style.width = Math.min(100, (Math.abs(thrust) / VOVER) * 100).toFixed(1) + "%";
    vsEls.thr.classList.toggle("rev", thrust < 0);
    vsEls.h2o.style.width = (fuel.h2o * 100).toFixed(1) + "%";
    vsEls.deu.style.width = (fuel.deu * 100).toFixed(1) + "%";
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
      vsEls.mode.textContent = autoNav ? "AUTO" : overdrive ? "OVERDRIVE" : allStop && spd > 1 ? "BRAKE" : speed < -1 ? "REVERSE" : burning ? "BURN" : dolly !== 0 ? "IMPULSE" : spd > 1 ? "COAST" : "IDLE";
      vsEls.mode.classList.toggle("over", overdrive);
      vsEls.hdg.textContent =
        String(Math.round((Math.atan2(cam.f[0], -cam.f[2]) * 180 / Math.PI + 360) % 360)).padStart(3, "0");
      vsEls.pit.textContent = signed(Math.asin(clamp(cam.f[1], -1, 1)) * 180 / Math.PI);
      vsEls.bnk.textContent = signed(bankDeg);
      // live position: watch the numbers run while you fly (James, v34)
      const pfmt = (v) => (v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString("en-US");
      vsEls.px.textContent = pfmt(cam.pos[0]);
      vsEls.py.textContent = pfmt(cam.pos[1]);
      vsEls.pz.textContent = pfmt(cam.pos[2]);
      const kfmt = (d) => (d >= 1000 ? (d / 1000).toFixed(1) + " km" : Math.round(d) + " m");
      const hd = Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2]);
      vsEls.home.textContent = kfmt(hd);
      let reefD = Infinity; // nearest colony — the sensor doesn't play favorites
      for (const col of REEF_COLONIES) {
        reefD = Math.min(reefD, Math.hypot(
          cam.pos[0] - col.c[0], cam.pos[1] - col.c[1], cam.pos[2] - col.c[2]));
      }
      vsEls.reef.textContent = kfmt(reefD);
      vsEls.con.textContent = String(contacts);
      {
        const dry = fuel.deu <= 0 ? "NO DEU" : fuel.h2o <= 0 ? "NO H2O" : null;
        vsEls.eng.textContent = overdrive ? "OVERDRIVE" : dry || "NOMINAL";
        vsEls.eng.classList.toggle("vs-ok", !dry);
        vsEls.eng.classList.toggle("vs-off", !!dry);
        vsEls.h2oBar.classList.toggle("low", fuel.h2o < 0.25);
        vsEls.deuBar.classList.toggle("low", fuel.deu < 0.25);
      }
      // the Lantern hums when you're close to the glass (v47)
      if (sound.on && sound.lantern && sound.ctx) {
        const ld = Math.hypot(cam.pos[0] - LANTERN.light[0], cam.pos[1] - LANTERN.light[1], cam.pos[2] - LANTERN.light[2]);
        sound.lantern.gain.setTargetAtTime(clamp(1 - ld / 2000, 0, 1) * 0.1, sound.ctx.currentTime, 0.4);
      }
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
      // v49 camera-relative: subtract the ship in float64 HERE — near things
      // land on the GPU at millimeter precision wherever we are in the 1,000km
      instData[off] = wp[i * 3] - cam.pos[0];
      instData[off + 1] = wp[i * 3 + 1] - cam.pos[1];
      instData[off + 2] = wp[i * 3 + 2] - cam.pos[2];
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
      instData[off + 15] = o.quadScale || (o.veil ? 1.05 : o.dust ? 1.6 : 2.6);
      instData[off + 16] = o.kind;
      instData[off + 17] = o.p0;
      instData[off + 18] = o.p1;
      instData[off + 19] = o.act;
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

    // -- mesh passes first (v47 order): opaque bone + robots write depth,
    // then the Lantern's glass blends over them (no depth write), then the
    // orbs draw with depth TEST on but writes off — soft sprites clipped
    // behind solids, shining past their edges, glowing through the glass.
    const anyMesh = skull.ready || robotMesh.ready || pyr.ready;
    if (anyMesh) {
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      if (skull.ready) {
        gl.useProgram(skull.prog);
        gl.bindVertexArray(skull.vao);
        gl.uniformMatrix4fv(skull.U.uVP, false, vp);
        gl.uniform3fv(skull.U.uCamPos, cam.pos);
        gl.uniform1f(skull.U.uFog, cfg.haze / 18000);
        gl.uniform1f(skull.U.uTime, t);
        gl.drawElements(gl.TRIANGLES, skull.count, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
      }
      if (robotMesh.ready) {
        gl.useProgram(robotMesh.prog.p);
        gl.bindVertexArray(robotMesh.vao);
        gl.uniformMatrix4fv(robotMesh.prog.U.uVP, false, vp);
        gl.uniform3fv(robotMesh.prog.U.uCamPos, [0, 0, 0]); // v49: ship space
        gl.uniform1f(robotMesh.prog.U.uFog, cfg.haze / 18000);
        for (const rb of robotFleet.list) {
          const rdx = rb.pos[0] - cam.pos[0], rdy = rb.pos[1] - cam.pos[1], rdz = rb.pos[2] - cam.pos[2];
          if (rdx * rdx + rdy * rdy + rdz * rdz > 196000000) continue; // > 14 km: subpixel
          robotModel(rb, t);
          gl.uniformMatrix4fv(robotMesh.prog.U.uModel, false, robotMat);
          gl.drawElements(gl.TRIANGLES, robotMesh.count, gl.UNSIGNED_INT, 0);
        }
        gl.bindVertexArray(null);
      }
      if (pyr.ready) {
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        gl.useProgram(pyr.prog.p);
        gl.bindVertexArray(pyr.vao);
        gl.uniformMatrix4fv(pyr.prog.U.uVP, false, vp);
        // v49 camera-relative: the Lantern's seat and inner sun arrive in
        // ship space (float64 subtraction), uCamPos pins to the origin
        gl.uniform3fv(pyr.prog.U.uOrigin, [
          LANTERN.pos[0] - cam.pos[0], LANTERN.pos[1] - cam.pos[1], LANTERN.pos[2] - cam.pos[2]]);
        gl.uniform3fv(pyr.prog.U.uCamPos, [0, 0, 0]);
        gl.uniform3fv(pyr.prog.U.uLight, [
          LANTERN.light[0] - cam.pos[0], LANTERN.light[1] - cam.pos[1], LANTERN.light[2] - cam.pos[2]]);
        gl.uniform1f(pyr.prog.U.uTime, t);
        gl.uniform1f(pyr.prog.U.uFog, cfg.haze / 18000);
        gl.drawElements(gl.TRIANGLES, pyr.count, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
      }
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

    // nav target (v38): the orange ring sits on the chosen item (edge-clamped
    // when off-screen, like the home dot) and the pointer arrow orbits the
    // reticle toward its bearing — swing the nose until they agree. Within
    // ~3° the ring locks solid and the arrow stands down.
    if (navTarget) {
      const rx = navTarget.pos[0] - cam.pos[0];
      const ry = navTarget.pos[1] - cam.pos[1];
      const rz = navTarget.pos[2] - cam.pos[2];
      const x = rx * bb.r[0] + ry * bb.r[1] + rz * bb.r[2];
      const y = rx * bb.u[0] + ry * bb.u[1] + rz * bb.u[2];
      const z = rx * bb.f[0] + ry * bb.f[1] + rz * bb.f[2];
      const dist = Math.hypot(x, y, z) || 1;
      const tf = Math.tan(FOV / 2);
      let nx = 0, ny = 0, size = 40, on = false;
      if (z > 0) {
        nx = x / z / (tf * (W / H));
        ny = y / z / tf;
        if (Math.abs(nx) <= 0.92 && Math.abs(ny) <= 0.92) {
          on = true;
          size = clamp(140000 / dist, 34, 120);
        }
      }
      if (!on) {
        // clamp to the screen edge in the target's direction
        const l2 = z > 0 ? Math.max(Math.abs(nx), Math.abs(ny)) : 0;
        if (z > 0 && l2 > 0) {
          const m = 0.92 / l2;
          nx *= m; ny *= m;
        } else {
          const len = Math.hypot(x, y) || 1;
          nx = (x / len) * 0.92;
          ny = (y / len) * 0.92;
        }
        size = 34;
      }
      navRing.style.width = navRing.style.height = size + "px";
      navRing.style.left = ((nx + 1) / 2) * W + "px";
      navRing.style.top = ((1 - ny) / 2) * H + "px";
      navScreen = { x: ((nx + 1) / 2) * W, y: ((1 - ny) / 2) * H, r: size / 2, on };
      const locked = z > 0 && z / dist > 0.99863; // within ~3°
      navRing.classList.toggle("locked", locked);
      navRing.classList.toggle("engaged", !!autoNav);
      navArrow.style.opacity = locked ? "0" : "1";
      // arming: hold the nose on it for 3 seconds and the ring brightens —
      // that's the window where a click inside the circle locks on
      if (locked && !autoNav) {
        if (!navAligned) navAligned = now;
        const armedNow = now - navAligned > 3000;
        if (armedNow !== navArmed) {
          navArmed = armedNow;
          navRing.classList.toggle("armed", navArmed);
        }
      } else if (!locked) {
        navAligned = 0;
        if (navArmed) {
          navArmed = false;
          navRing.classList.remove("armed");
        }
      }
      if (!locked) {
        // arrow angle: 0 = up, clockwise; ring it just outside the reticle
        const ang = Math.atan2(x, y) * 180 / Math.PI;
        const R = Math.min(Math.max(240, H * 0.32), 420) / 2 + 30;
        navArrow.style.transform =
          "translate(-50%, -50%) rotate(" + ang.toFixed(1) + "deg) translateY(" + (-R) + "px)";
      }
      if (now >= hudNext - 120) {
        navRingLabel.textContent =
          navTarget.name + " · " + (dist >= 1000 ? (dist / 1000).toFixed(1) + " km" : Math.round(dist) + " m");
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

  // v37: the floating "tune" pill is gone — TUNE and CTRL are ship controls
  // now, mounted on the deck (upper right of the console, per James)
  const toggle = hud.querySelector("#vs-tune");
  const ctrlBtn = hud.querySelector("#vs-ctrl");

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
    // v49 layout sliders re-seat the whole ring — heavy, so only on release
    if (s.layout) input.addEventListener("change", () => relayout());
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

  // v48: stick mode select — drag-stick (press plants it) or center-stick
  // (always-on at screen center, Freelancer style)
  const stickWrap = document.createElement("div");
  stickWrap.className = "tuner-mini";
  const stickLabel = document.createElement("label");
  const stickSpan = document.createElement("span");
  stickSpan.textContent = "stick";
  stickLabel.appendChild(stickSpan);
  const stickSel = document.createElement("select");
  for (const [value, text] of [["center", "center-stick (hold + pull)"], ["drag", "drag-stick (press plants it)"]]) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    stickSel.appendChild(opt);
  }
  stickSel.value = cfg.stickMode;
  stickSel.addEventListener("change", () => {
    cfg.stickMode = stickSel.value;
    saveCfg();
  });
  stickWrap.append(stickLabel, stickSel);

  // related controls live together in labelled subpanels
  const sliderByKey = {};
  for (const s of SLIDERS) sliderByKey[s.key] = s;
  const GROUPS = [
    // ("the space" group removed v38 — the volume is static; v49 made it
    // 1,000×1,000×250km and it is STILL not a slider. Geography is law.)
    { label: "the field", keys: ["count", "dust", "grouping"] },
    { label: "the orbs", keys: ["sizeMin", "sizeMax", "shellOp", "glow"] },
    { label: "the air", keys: ["haze", "fadeSpeed"] },
    { label: "the stick", keys: ["stickMode", "stickDead", "stickReach", "stickYawMax", "stickPitchMax", "stickCurve"] },
    // v49 GOD MODE (James's tally: top speed + tank length are the key
    // ones) — physics/feel knobs, forever tunable. The ring dials freeze
    // with the geography when the layout finalizes.
    { label: "GOD MODE · drive", keys: ["impTop", "boostTop", "overTop", "h2oTank", "deuTank", "boostSpool", "overSpool"] },
    { label: "GOD MODE · the ring", keys: ["colonyDist", "colonyVert", "colonyJitter"] },
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
      grid.appendChild(
        key === "grouping" ? groupWrap :
        key === "stickMode" ? stickWrap :
        makeSliderEl(sliderByKey[key]));
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
    stickSel.value = cfg.stickMode;
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
    stickSel.value = cfg.stickMode;
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
    // v49: relayout instead of bare assemble — a preset may carry ring dials
    if (cfg.grouping !== prevGrouping) rebuildAll();
    else relayout();
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

  // ---- the controls card (v37) — CTRL on the deck opens the full reference
  const ctrlCard = document.createElement("section");
  ctrlCard.id = "orb-controls";
  ctrlCard.className = "orb-controls";
  ctrlCard.hidden = true;
  ctrlCard.setAttribute("role", "group");
  ctrlCard.setAttribute("aria-label", "Ship controls reference");
  ctrlCard.innerHTML = `
    <h3>flight</h3>
    <dl>
      <dt>drag / arrows</dt><dd>steer — grab near the center reticle, hold,
        and pull: the farther from center, the harder the turn, maxing out
        at "reach" px. Park the cursor to hold a turn; release to fly
        straight. TUNE → "the stick" adjusts the feel</dd>
      <dt>W / S</dt><dd>impulse — glide forward / back (240 m/s, free)</dd>
      <dt>shift</dt><dd>booster — hold to burn (1,200 m/s, drinks H2O, full in 5s)</dd>
      <dt>space</dt><dd>overdrive on / off (3,600 m/s, burns deuterium, slams in 3s — the crossing tier; TUNE → GOD MODE retunes the whole ladder)</dd>
      <dt>S + shift</dt><dd>reverse booster</dd>
      <dt>X</dt><dd>all-stop — brake to a halt</dd>
      <dt>A / D</dt><dd>roll — a pure spin around the nose, like a pencil
        through the ship; it never changes where you're headed</dd>
      <dt>R</dt><dd>level off</dd>
      <dt>H</dt><dd>return home</dd>
      <dt>N</dt><dd>nav panel on / off</dd>
      <dt>lock-on</dt><dd>hold your nose on the orange ring 3s until it
        brightens, then click inside it — the ship flies itself there and
        coasts in; touching any control releases it</dd>
      <dt>pale orbs</dt><dd>click one to drift onward</dd>
      <dt>the fleet</dt><dd>service robots run supplies between depots,
        inhabited orbs and the communities — what they visit, wakes</dd>
    </dl>
    <h3>console</h3>
    <dl>
      <dt>ATT</dt><dd>heading · pitch · bank</dd>
      <dt>POS</dt><dd>where you are, meters from the skull</dd>
      <dt>NAV</dt><dd>home · nearest reef · contacts · exits</dd>
      <dt>SYS</dt><dd>engine state (WEP / SHD not installed)</dd>
      <dt>FUEL</dt><dd>H2O + deuterium tanks — fly into blue water globes
        or hot green depots to refill</dd>
      <dt>NAV</dt><dd>places + resources — click one to ring it in orange,
        follow the arrow by the reticle</dd>
      <dt>TUNE</dt><dd>dimension tuning panel</dd>
    </dl>`;
  document.body.appendChild(ctrlCard);

  // ---- the NAV panel (v38): named places + resources, click to target ------
  // Clicking an entry rings the chosen item in orange on the glass and arms
  // the pointer arrow by the reticle; clicking it again clears. Resource rows
  // target the closest station at click time.
  const NAV_NAMES = ["Yth-Alune", "Sorrek Bloom", "Vhal-Imir"];
  const navPanel = document.createElement("section");
  navPanel.id = "orb-nav";
  navPanel.className = "orb-controls orb-nav";
  navPanel.hidden = true;
  navPanel.setAttribute("role", "group");
  navPanel.setAttribute("aria-label", "Navigation");
  navPanel.innerHTML = `
    <h3>the monument</h3>
    <button type="button" class="nav-row" data-nav="head">Korrudan <em>the Head · center of space</em></button>
    <button type="button" class="nav-row" data-nav="pyr">Vess-Karai <em>the glass lantern · on the floor</em></button>
    <h3>globe-thread communities · the ring</h3>
    <button type="button" class="nav-row" data-nav="c0">${NAV_NAMES[0]} <em>flagship reef · ~250 km out</em></button>
    <button type="button" class="nav-row" data-nav="c1">${NAV_NAMES[1]} <em>ring reef</em></button>
    <button type="button" class="nav-row" data-nav="c2">${NAV_NAMES[2]} <em>ring reef</em></button>
    <h3>resources</h3>
    <button type="button" class="nav-row" data-nav="h2o">Water globes <em>nearest — refills H2O</em></button>
    <button type="button" class="nav-row" data-nav="deu">Deuterium depot <em>nearest — refills DEU</em></button>`;
  document.body.appendChild(navPanel);

  let navTarget = null; // { key, name, pos, standoff }
  // lock-on (v43): hold the nose in the ring 3s → it arms bright; click
  // inside it → the autopilot flies you there. Standoff = where the coast
  // should die: the skull's buffer edge, a colony's doorstep, or right on
  // top of a fuel station (you want the flyover).
  let navAligned = 0;      // when continuous alignment began (ms), 0 = not aligned
  let navArmed = false;    // aligned 3s+ — ring is bright, click will lock on
  let autoNav = null;      // { standoff } while the autopilot is flying
  let navScreen = { x: 0, y: 0, r: 0, on: false }; // ring in screen px, for the click test
  function navPick(key) {
    if (key === "head") return { key, name: "KORRUDAN", pos: [0, 0, 0], standoff: 2600 };
    if (key === "pyr") return { key, name: "VESS-KARAI", pos: LANTERN.nav, standoff: 1500 };
    if (key[0] === "c") {
      const i = Number(key[1]);
      return { key, name: NAV_NAMES[i].toUpperCase(), pos: REEF_COLONIES[i].c, standoff: 700 };
    }
    const arr = key === "h2o" ? STATIONS.h2o : STATIONS.deu;
    let best = arr[0], bd = Infinity;
    for (const c of arr) {
      const d = Math.hypot(c[0] - cam.pos[0], c[1] - cam.pos[1], c[2] - cam.pos[2]);
      if (d < bd) { bd = d; best = c; }
    }
    return { key, name: key === "h2o" ? "WATER GLOBE" : "DEU DEPOT", pos: best, standoff: 60 };
  }
  navPanel.addEventListener("click", (e) => {
    const row = e.target.closest(".nav-row");
    if (!row) return;
    const key = row.dataset.nav;
    navTarget = navTarget && navTarget.key === key ? null : navPick(key);
    autoNav = null;
    navAligned = 0;
    navArmed = false;
    navRing.classList.remove("armed");
    for (const r of navPanel.querySelectorAll(".nav-row")) {
      r.classList.toggle("active", !!navTarget && r.dataset.nav === navTarget.key);
    }
    navRing.style.opacity = navTarget ? "1" : "0";
    navArrow.style.opacity = navTarget ? "1" : "0";
    row.blur();
  });

  // the orange target ring + the pointer arrow by the reticle
  const navRing = document.createElement("div");
  navRing.id = "nav-ring";
  navRing.innerHTML = `<span id="nav-ring-label"></span>`;
  document.body.appendChild(navRing);
  const navRingLabel = navRing.querySelector("#nav-ring-label");
  const navArrow = document.createElement("div");
  navArrow.id = "nav-arrow";
  document.body.appendChild(navArrow);

  // v48 drag-stick instruments: the planted anchor + the saturation rim
  // (ice-blue like the reticle — the hand's color; orange stays nav's)
  const stickRim = document.createElement("div");
  stickRim.id = "stick-rim";
  const stickDot = document.createElement("div");
  stickDot.id = "stick-dot";
  document.body.append(stickRim, stickDot);
  const stickUi = { shown: false };

  // one panel at a time: NAV, TUNE and CTRL close each other
  const PANELS = {
    nav: { btn: hud.querySelector("#vs-navb"), el: navPanel },
    tune: { btn: toggle, el: panel },
    ctrl: { btn: ctrlBtn, el: ctrlCard },
  };
  function setOpen(which) {
    for (const k in PANELS) {
      const open = k === which ? PANELS[k].el.hidden : false;
      PANELS[k].el.hidden = !open;
      PANELS[k].btn.setAttribute("aria-expanded", String(open));
      PANELS[k].btn.classList.toggle("lit", open);
    }
  }
  for (const k in PANELS) {
    PANELS[k].btn.addEventListener("click", () => {
      setOpen(k);
      PANELS[k].btn.blur(); // focus must not eat the space bar (overdrive)
    });
  }

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

    // ---- the engines (v34): three synthesized voices, all physics-driven
    // from the frame loop, on their own bus (the "engines" channel slider).
    // Thruster = cold-gas hiss (W/S dolly). Booster = a low rushing noise
    // that opens up with the shift burn. Overdrive = a different animal:
    // detuned saws pulsing at ~4.4 Hz — the pulse drive pulses. A reverse
    // burn (S) drops every pitch, so you HEAR the flip.
    const eng = { vol: 1 };
    sound.engine = eng;
    eng.bus = ctx.createGain();
    eng.bus.gain.value = (sound.engVol == null ? 1 : sound.engVol) ** 2;
    eng.bus.connect(sound.master);

    const white = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    {
      const d = white.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const loopSrc = (buf) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };

    // thruster hiss
    const thBp = ctx.createBiquadFilter();
    thBp.type = "bandpass";
    thBp.frequency.value = 620;
    thBp.Q.value = 0.9;
    eng.thGain = ctx.createGain();
    eng.thGain.gain.value = 0;
    loopSrc(white).connect(thBp).connect(eng.thGain).connect(eng.bus);

    // booster: a LOW RUSHING NOISE, nothing tonal (v36 — James: the sub saw +
    // gliding whine read as a police siren / hot-air blast). Two noise paths:
    // the rush, whose lowpass cutoff opens with the throttle, and a fixed
    // very-low bed that gives it weight without pitch.
    eng.boGroup = ctx.createGain();
    eng.boGroup.gain.value = 0;
    eng.boGroup.connect(eng.bus);
    eng.boRushLp = ctx.createBiquadFilter();
    eng.boRushLp.type = "lowpass";
    eng.boRushLp.frequency.value = 180;
    eng.boRushLp.Q.value = 0.5;
    const boNg = ctx.createGain();
    boNg.gain.value = 0.85;
    loopSrc(white).connect(eng.boRushLp).connect(boNg).connect(eng.boGroup);
    const boDeepLp = ctx.createBiquadFilter();
    boDeepLp.type = "lowpass";
    boDeepLp.frequency.value = 70;
    const boDg = ctx.createGain();
    boDg.gain.value = 0.6;
    loopSrc(white).connect(boDeepLp).connect(boDg).connect(eng.boGroup);

    // overdrive: the pulse drive — detuned saws, low-passed, breathing at 4.4 Hz
    eng.odGain = ctx.createGain();
    eng.odGain.gain.value = 0;
    eng.odGain.connect(eng.bus);
    const odCore = ctx.createGain();
    odCore.gain.value = 0.55;
    const odLp = ctx.createBiquadFilter();
    odLp.type = "lowpass";
    odLp.frequency.value = 430;
    eng.odSaw1 = ctx.createOscillator();
    eng.odSaw1.type = "sawtooth";
    eng.odSaw1.frequency.value = 66;
    eng.odSaw2 = ctx.createOscillator();
    eng.odSaw2.type = "sawtooth";
    eng.odSaw2.frequency.value = 66.5;
    eng.odSaw1.connect(odLp);
    eng.odSaw2.connect(odLp);
    odLp.connect(odCore).connect(eng.odGain);
    eng.odSaw1.start();
    eng.odSaw2.start();
    const odLfo = ctx.createOscillator();
    odLfo.frequency.value = 4.4;
    const odLfoG = ctx.createGain();
    odLfoG.gain.value = 0.4;
    odLfo.connect(odLfoG).connect(odCore.gain);
    odLfo.start();
    eng.white = white;

    // the Lantern's hum (v47): warm low sines with a slow beat, silent until
    // you drift near the glass — gain steered from the frame loop
    sound.lantern = ctx.createGain();
    sound.lantern.gain.value = 0;
    sound.lantern.connect(sound.master);
    for (const [f, g] of [[55, 0.45], [55.35, 0.45], [82.6, 0.25]]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(sound.lantern);
      o.start();
    }
  }

  // colony comms (v47): within earshot of a globe-thread community, sparse
  // runs of high glassy blips ride the cave echo — the glyphs, audible
  function chatter() {
    if (!sound.on || !sound.ctx) return;
    let cd = Infinity;
    for (const col of REEF_COLONIES) {
      cd = Math.min(cd, Math.hypot(cam.pos[0] - col.c[0], cam.pos[1] - col.c[1], cam.pos[2] - col.c[2]));
    }
    if (cd < 2600 && sound.pingBus) {
      const ctx = sound.ctx;
      const t0 = ctx.currentTime;
      const prox = 1 - cd / 2600;
      const nBlips = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < nBlips; i++) {
        const f = pick([523, 659, 784, 880, 1047, 1175]) * (Math.random() < 0.25 ? 2 : 1);
        const ts = t0 + i * rand(0.07, 0.16);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, ts);
        env.gain.exponentialRampToValueAtTime(0.045 * prox + 0.006, ts + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, ts + rand(0.18, 0.35));
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(env);
        env.connect(sound.pingBus);
        o.start(ts);
        o.stop(ts + 0.5);
      }
    }
    sound.chatterTimer = window.setTimeout(chatter, rand(1400, 3800));
  }

  // physics → audio, called every frame while sound is on. All params move
  // through setTargetAtTime so the voices swell and die smoothly.
  function updateEngine(thrust, dollyActive) {
    const e = sound.engine;
    if (!e || !sound.ctx) return;
    const ct = sound.ctx.currentTime;
    const set = (p, v, tc) => p.setTargetAtTime(v, ct, tc);
    const mag = Math.abs(thrust);
    const rv = thrust < -1 ? 0.82 : 1; // reverse burn: everything detunes down
    set(e.thGain.gain, dollyActive ? 0.05 : 0, 0.12);
    // v49: the voices normalize to the GOD MODE tops — same sound envelope
    // at full burn whatever the ladder is tuned to
    const bo = !overdrive && mag > 6 ? clamp(mag / cfg.boostTop, 0, 1) : 0;
    set(e.boGroup.gain, bo * 0.55, 0.22);
    // the rush brightens with speed but stays a rush — cutoff only, no pitch.
    // Reverse burn darkens it instead of dropping a tone.
    set(e.boRushLp.frequency, (180 + 300 * clamp(mag / cfg.boostTop, 0, 1)) * rv, 0.25);
    const od = overdrive ? clamp(mag / cfg.overTop, 0.25, 1) : 0;
    set(e.odGain.gain, od * 0.4, 0.3);
    set(e.odSaw1.frequency, (66 + 28 * clamp(mag / cfg.overTop, 0, 1)) * rv, 0.3);
    set(e.odSaw2.frequency, (66.5 + 28.2 * clamp(mag / cfg.overTop, 0, 1)) * rv, 0.3);
  }

  // success chime: two quick rising notes through the cave's echo chain —
  // water sings high and glassy, deuterium lower and warmer
  function fuelChime(kind) {
    if (!sound.on || !sound.ctx || !sound.pingBus) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const freqs = kind === "h2o" ? [659, 880] : [440, 554];
    freqs.forEach((f, i) => {
      const env = ctx.createGain();
      const ts = t0 + i * 0.09;
      env.gain.setValueAtTime(0.0001, ts);
      env.gain.exponentialRampToValueAtTime(0.14, ts + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, ts + 0.7);
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(env);
        o.start(ts);
        o.stop(ts + 0.8);
      }
      env.connect(sound.pingBus);
    });
  }

  // one-shot: pulse drive ignition (a thump and a breath of noise) or
  // wind-down (a lower, softer fall) on the space-bar toggle
  function odThump(on) {
    if (!sound.on || !sound.ctx || !sound.engine) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    if (on) {
      o.frequency.setValueAtTime(130, t0);
      o.frequency.exponentialRampToValueAtTime(36, t0 + 0.35);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      const n = ctx.createBufferSource();
      n.buffer = sound.engine.white;
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.setValueAtTime(2400, t0);
      nf.frequency.exponentialRampToValueAtTime(160, t0 + 0.4);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.16, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      n.connect(nf).connect(ng).connect(sound.engine.bus);
      n.start(t0);
      n.stop(t0 + 0.5);
    } else {
      o.frequency.setValueAtTime(64, t0);
      o.frequency.exponentialRampToValueAtTime(26, t0 + 0.6);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    }
    o.connect(g).connect(sound.engine.bus);
    o.start(t0);
    o.stop(t0 + 0.8);
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
            window.clearTimeout(sound.chatterTimer);
            sound.chatterTimer = window.setTimeout(chatter, rand(1500, 4000));
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
        window.clearTimeout(sound.chatterTimer);
        applyVolume();
        if (sound.ctx) sound.ctx.suspend().catch(() => {});
      },
      setVolume: (v) => {
        sound.volume = v;
        applyVolume();
      },
      // the engines get their own slider under the main one (the arachno-wars
      // second-channel pattern) — cave ambience vs. engine roar, tuned by ear
      channels: [
        {
          label: "engines",
          value: 1,
          setVolume: (v) => {
            sound.engVol = v;
            if (sound.engine && sound.ctx) {
              sound.engine.bus.gain.setTargetAtTime(v * v, sound.ctx.currentTime, 0.1);
            }
          },
        },
      ],
    });
  }
})();
