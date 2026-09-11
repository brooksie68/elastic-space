// Moon Battle 2075 — the TANK renderer.
//
// First person out of the tank's slit, drawn in the lander's register: one
// green-to-white line drawing on black, max-blended, tightly glowed, no CRT
// imitation. Pure presentation: no rules, no DOM, no audio, no input — tank.js
// drives it in the game, tmp/lunar-lander/tank-lookdev.html drives it silently.
//
// THE KIT BELOW IS A COPY of render3d.js (the lander's renderer), taken
// 2026-09-06 unchanged: DEFAULT_PARAMS, PIXEL_BUDGET, LINE_VERT / LINE_FRAG /
// QUAD_VERT / BRIGHT_FRAG / BLUR_FRAG / COMP_FRAG, LineBatch, GroundFill and
// the post chain in _buildPost / the end of render(). When the lander session
// pulls the kit out into vector-kit.js both halves import it; until then this
// copy keeps every constant identical. ONE EXTENSION, marked, not a change:
// LINE_VERT_DEPTH — the same quad expansion, but the segment is clipped to the
// near plane in the shader and writes real depth, because a first-person world
// occludes by depth (a tank behind a building), where the side view occludes
// by draw order. LineBatch takes { depth: true } to use it; the lander's
// batches are untouched by default. SECOND EXTENSION (2026-09-07, the look
// pass, item 2): LINE WEIGHT BY DISTANCE — the depth shader carries a per-
// vertex width and a near brightness lift (uNearA/uNearB/uWNear/uWFar/uBNear),
// so near lines are heavy and whiten, far lines are hairlines and green. The
// no-depth shader (the gun) keeps the flat width.
import * as THREE from 'three';

// ---- tunables (COPY: render3d.js DEFAULT_PARAMS, plus the tank's own at the end) ----
export const DEFAULT_PARAMS = {
  hue: 0.36,          // line colour: 0.36 = green, 0.5 = cyan, 0.08 = amber
  saturation: 0.7,    // 0 = white
  glow: 0.9,          // bloom strength
  lineWeight: 1.8,    // core width, px at 1080p (scales with viewport)
  brightness: 1.0,    // the world's lines
  shipBright: 0.85,   // the lander (max-blend: it no longer blooms, so it can carry more)
  fov: 36,            // vertical field of view, degrees (the lander's; the tank uses tankFov)
  depth: 1.0,         // parallax separation between the three lines
  bank: 1.0,          // camera roll with lateral speed on approach
  zoomNear: 3.3,      // magnification on final approach
  zoomAlt: 430,       // altitude (ft) where the zoom kicks in (the shell adds hysteresis)
  plume: 1.0,         // thrust particle density
  stars: 1.0,
  ringBright: 0.08,   // the direction aid ring (James's pick, 2026-09-04)
  triBright: 0.25,    // the aid's triangle (James's pick, 2026-09-04)
  res: 1.0,           // render scale
  // ---- the tank's own (not in the lander's file) ----
  tankFov: 56,        // vertical field of view out of the slit, degrees
  gridBright: 0.11,   // a faint wide grid under everything (James, 2026-09-07: "massively flat and black... feels like nothing's there")
  gridPitch: 100,     // ft between grid lines (James, 2026-09-08: "double up... still too much black")
  traceBright: 0.55,  // the flight line: the path the lander flew, a ticked trail on the ground
  contourBright: 0.34,// the contour lines (every contourStep ft of height; every fifth heavier)
  contourStep: 28,    // ft between contours: the lander's profile is walls along z, so a fine step drew stripes; coarse = one crest line per wall, a few per hill
  craterBright: 0.5,  // crater rims + their rays
  rockBright: 0.55,   // rock fields
  weightNear: 1.45,   // line weight ×, right at the tank (item 2: near heavy + white)
  weightFar: 0.62,    // line weight ×, past weightRange (far hairline + green)
  weightRange: 1100,  // ft over which the weight falls from near to far
  nearWhite: 1.3,     // brightness × at the tank (whitens through the composite)
  fogNear: 500,       // ft: ground lines start fading here
  fogFar: 2600,       // ft: ...and are at 25% here
  ridgeBright: 0.7,   // the NEAR ridges (two lines along the flight line, 3,000 ft out)
  skyBright: 0.55,    // the mid skyline (a ring 6,500 ft out, anchored at the stretch)
  skyFarBright: 0.38, // the far skyline (11,000 ft)
  hazeBright: 0.6,    // the horizon glow along the far crest
  earthBright: 1.0,   // the Earth in the sky
  civBright: 0.62,    // civilian structures (the lander's flight-line value)
  hostBright: 0.85,   // hostile structures (the lander's flight-line value)
  enemyBright: 0.95,  // enemy tanks
  gunBright: 0,       // the barrel — OFF (2026-09-09, James, on the perspective gun: "just floating in space. It looks really weird"; the 2026-09-07 rails-and-ring before it: "a circle with two lines"). The drawing stays behind the dial; the arc + landing mark are the aim.
  arcBright: 1,       // the shell's arc (dashes) and landing mark; 0 hides them
  leadBright: 0.7,    // the lead ghosts (where a moving hull will be when the shell arrives)
  slopePitch: 0.6,    // how much of the ground's pitch the view takes (eased)
};

const PIXEL_BUDGET = 2.9e6;
const MAX_PARTICLES = 2600;
const CHUNK_W = 4000;
const SKY_R = 7000, SKY_FAR_R = 11000, STAR_R = 14000, SKY_FLOOR = -4000;
const GROUND_HALF = 2400;   // ft: the ground mesh + contours extend this far around the tank
const RIDGE_Z = 3000;       // ft: the near ridges stand this far either side of the flight line
const RIDGE_STEP = 120;     // ft between ridge samples
const CRATER_CELL = 520;    // ft: one crater roll per cell
const ROCK_CELL = 260;      // ft: one rock-field roll per cell
const SKY_MID_R = 6500;     // ft: the mid ring, anchored at the stretch's start
const GROUND_CELL = 25;     // ft: mesh cell — the grid lines ride the mesh's own rows, so they never sink under it
const GROUND_REBUILD = 320; // ft: the tank moves this far before the ground is re-laid
const PITCH_TAU = 0.6;      // s: the view eases onto the ground's pitch
const MAX_ROLL = 0.05;      // rad — a few degrees, no more (the lander's MAX_BANK)

// ---- the line batch (COPY) --------------------------------------------------------------
const LINE_VERT = `
  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec2 aCorner;   // x: -1 at p0 end, +1 at p1 end; y: side
  attribute float aBright;
  uniform vec2 uRes;
  uniform float uHalf;      // half width + feather, px
  uniform float uWidth;
  uniform float uFogA;
  uniform float uFogB;
  varying vec2 vP;
  varying vec2 vS0;
  varying vec2 vS1;
  varying float vBright;
  varying float vWidth;
  void main() {
    vWidth = uWidth;
    vec4 c0 = projectionMatrix * modelViewMatrix * vec4(aP0, 1.0);
    vec4 c1 = projectionMatrix * modelViewMatrix * vec4(aP1, 1.0);
    float w0 = max(c0.w, 1e-3), w1 = max(c1.w, 1e-3);
    vec2 s0 = c0.xy / w0 * uRes * 0.5;
    vec2 s1 = c1.xy / w1 * uRes * 0.5;
    vec2 d = s1 - s0;
    float len = length(d);
    d = len > 1e-4 ? d / len : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);
    vec2 base = aCorner.x < 0.0 ? s0 : s1;
    vec2 p = base + d * aCorner.x * uHalf + n * aCorner.y * uHalf;
    float depth = aCorner.x < 0.0 ? w0 : w1;
    float fog = 1.0 - smoothstep(uFogA, uFogB, depth);
    vP = p; vS0 = s0; vS1 = s1; vBright = aBright * mix(0.25, 1.0, fog);
    gl_Position = vec4(p / (uRes * 0.5), 0.0, 1.0);
  }
`;
// EXTENSION (tank only): the same expansion with the segment clipped to the
// near plane in view space and a real depth written from the base endpoint.
const LINE_VERT_DEPTH = `
  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec2 aCorner;
  attribute float aBright;
  uniform vec2 uRes;
  uniform float uHalf;
  uniform float uWidth;
  uniform float uFogA;
  uniform float uFogB;
  uniform float uNear;
  uniform float uNearA;     // EXTENSION 2: weight by distance
  uniform float uNearB;
  uniform float uWNear;
  uniform float uWFar;
  uniform float uBNear;
  varying vec2 vP;
  varying vec2 vS0;
  varying vec2 vS1;
  varying float vBright;
  varying float vWidth;
  void main() {
    vec4 v0 = modelViewMatrix * vec4(aP0, 1.0);
    vec4 v1 = modelViewMatrix * vec4(aP1, 1.0);
    float zn = -uNear;
    if (v0.z > zn && v1.z > zn) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vBright = 0.0; vWidth = 1.0; vP = vec2(0.0); vS0 = vec2(0.0); vS1 = vec2(1.0, 0.0); return; }
    if (v0.z > zn) { float t = (zn - v0.z) / (v1.z - v0.z); v0 = mix(v0, v1, t); }
    else if (v1.z > zn) { float t = (zn - v1.z) / (v0.z - v1.z); v1 = mix(v1, v0, t); }
    vec4 c0 = projectionMatrix * v0;
    vec4 c1 = projectionMatrix * v1;
    float w0 = max(c0.w, 1e-3), w1 = max(c1.w, 1e-3);
    vec2 s0 = c0.xy / w0 * uRes * 0.5;
    vec2 s1 = c1.xy / w1 * uRes * 0.5;
    vec2 d = s1 - s0;
    float len = length(d);
    d = len > 1e-4 ? d / len : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);
    vec2 base = aCorner.x < 0.0 ? s0 : s1;
    vec4 cb = aCorner.x < 0.0 ? c0 : c1;
    vec2 p = base + d * aCorner.x * uHalf + n * aCorner.y * uHalf;
    float depth = aCorner.x < 0.0 ? w0 : w1;
    float fog = 1.0 - smoothstep(uFogA, uFogB, depth);
    float nf = 1.0 - smoothstep(uNearA, uNearB, depth);
    vWidth = uWidth * mix(uWFar, uWNear, nf);
    vP = p; vS0 = s0; vS1 = s1; vBright = aBright * mix(0.25, 1.0, fog) * mix(1.0, uBNear, nf);
    gl_Position = vec4(p / (uRes * 0.5) * cb.w, cb.z, cb.w);
  }
`;
const LINE_FRAG = `
  precision highp float;
  varying vec2 vP;
  varying vec2 vS0;
  varying vec2 vS1;
  varying float vBright;
  varying float vWidth;
  uniform float uGain;
  void main() {
    vec2 ab = vS1 - vS0;
    float l2 = dot(ab, ab);
    float t = l2 > 1e-6 ? clamp(dot(vP - vS0, ab) / l2, 0.0, 1.0) : 0.0;
    float d = length(vP - (vS0 + ab * t));
    float core = 1.0 - smoothstep(vWidth * 0.5 - 0.9, vWidth * 0.5 + 0.9, d);
    float halo = exp(-d / (vWidth * 0.9)) * 0.05;
    float v = (core + halo) * vBright * uGain;
    gl_FragColor = vec4(v, v, v, 1.0);
  }
`;

class LineBatch {
  constructor(max, order, opts) {
    opts = opts || {};
    this.max = max;
    this.count = 0;
    const g = new THREE.BufferGeometry();
    this.p0 = new Float32Array(max * 4 * 3);
    this.p1 = new Float32Array(max * 4 * 3);
    this.bright = new Float32Array(max * 4);
    const corner = new Float32Array(max * 4 * 2);
    const idx = new Uint32Array(max * 6);
    for (let i = 0; i < max; i++) {
      const v = i * 4;
      corner.set([-1, -1, -1, 1, 1, 1, 1, -1], v * 2);
      idx.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6);
    }
    g.setAttribute('aP0', new THREE.BufferAttribute(this.p0, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aP1', new THREE.BufferAttribute(this.p1, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    g.setAttribute('aBright', new THREE.BufferAttribute(this.bright, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 4 * 3), 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: opts.depth ? LINE_VERT_DEPTH : LINE_VERT,
      fragmentShader: LINE_FRAG,
      uniforms: {
        uRes: { value: new THREE.Vector2(2, 2) },
        uHalf: { value: 3 },
        uWidth: { value: 2 },
        uGain: { value: 1 },
        uFogA: { value: 1e8 },
        uFogB: { value: 1e9 },
        uNear: { value: 1 },
        uNearA: { value: 40 }, uNearB: { value: 1100 }, uWNear: { value: 1 }, uWFar: { value: 1 }, uBNear: { value: 1 },
      },
      // MAX blend: a stroke crossing a stroke is one stroke's brightness, never two
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: !!opts.depth,
      depthWrite: false,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
  }
  begin() { this.count = 0; }
  seg(x0, y0, z0, x1, y1, z1, b) {
    if (this.count >= this.max) return;
    const i = this.count++;
    const v = i * 4;
    for (let k = 0; k < 4; k++) {
      const o = (v + k) * 3;
      this.p0[o] = x0; this.p0[o + 1] = y0; this.p0[o + 2] = z0;
      this.p1[o] = x1; this.p1[o + 1] = y1; this.p1[o + 2] = z1;
      this.bright[v + k] = b;
    }
  }
  seg2(x0, y0, x1, y1, b, z) { this.seg(x0, y0, z || 0, x1, y1, z || 0, b); }
  poly2(pts, b, dx, dy, z) {
    dx = dx || 0; dy = dy || 0; z = z || 0;
    for (let i = 1; i < pts.length; i++) {
      this.seg(pts[i - 1][0] + dx, pts[i - 1][1] + dy, z, pts[i][0] + dx, pts[i][1] + dy, z, b);
    }
  }
  text(segs) { for (const s of segs) this.seg(s[0], s[1], 0, s[2], s[3], 0, s[4]); }
  end() {
    const g = this.geo;
    g.attributes.aP0.needsUpdate = true;
    g.attributes.aP1.needsUpdate = true;
    g.attributes.aBright.needsUpdate = true;
    g.attributes.aP0.updateRanges = [{ start: 0, count: this.count * 12 }];
    g.attributes.aP1.updateRanges = [{ start: 0, count: this.count * 12 }];
    g.attributes.aBright.updateRanges = [{ start: 0, count: this.count * 4 }];
    g.setDrawRange(0, this.count * 6);
  }
}

// The black beneath a ground line (COPY): a strip from the polyline down to
// the floor. Here it hangs the skyline rings' black under the mountains.
class GroundFill {
  constructor(order, floor, depth) {
    this.floor = floor === undefined ? -6000 : floor;
    this.geo = new THREE.BufferGeometry();
    this.mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1, depthTest: !!depth, depthWrite: !!depth, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
  }
  // pts: [[x, y, z], ...] — the strip drops to the floor under each point
  set3(pts) {
    const n = pts.length;
    const pos = new Float32Array(n * 2 * 3);
    const idx = new Uint32Array((n - 1) * 6);
    let vi = 0, ii = 0;
    for (let i = 0; i < n; i++) {
      pos[vi++] = pts[i][0]; pos[vi++] = pts[i][1]; pos[vi++] = pts[i][2];
      pos[vi++] = pts[i][0]; pos[vi++] = this.floor; pos[vi++] = pts[i][2];
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx[ii++] = a; idx[ii++] = a + 1; idx[ii++] = a + 2;
      idx[ii++] = a + 1; idx[ii++] = a + 3; idx[ii++] = a + 2;
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo.computeBoundingSphere();
  }
}

// ---- post shaders (COPY) --------------------------------------------------------------------
const QUAD_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const BRIGHT_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tSrc;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb;
    c = clamp(c, 0.0, 64.0);
    c = max(c - 0.6, 0.0);
    gl_FragColor = vec4(c, 1.0);
  }
`;
const BLUR_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tSrc;
  uniform vec2 uDir;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
    c += texture2D(tSrc, vUv + uDir * 1.384615).rgb * 0.316216;
    c += texture2D(tSrc, vUv - uDir * 1.384615).rgb * 0.316216;
    c += texture2D(tSrc, vUv + uDir * 3.230769).rgb * 0.070270;
    c += texture2D(tSrc, vUv - uDir * 3.230769).rgb * 0.070270;
    gl_FragColor = vec4(c, 1.0);
  }
`;
const COMP_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tScene;
  uniform sampler2D tB0;
  uniform vec3 uTint;
  uniform float uGlow;
  uniform float uFlash;
  void main() {
    vec3 s = clamp(texture2D(tScene, vUv).rgb, 0.0, 64.0);
    vec3 bloom = texture2D(tB0, vUv).rgb;
    float lum = s.g + bloom.g * uGlow * 0.4 + uFlash;
    // tinted body, whitening toward the core: green to white, nothing else
    vec3 col = uTint * lum;
    col = mix(col, vec3(lum), smoothstep(0.9, 2.2, lum) * 0.75);
    col = col / (1.0 + col * 0.25);
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

// ---- the tank models: 3-D segment lists, local feet ----------------------------------------
// Model space: x right, y up, z BACK (forward is -z, the way the core's
// heading 0 points). Origin at the ground under the hull's centre. Authored
// in the same format as the shared structures' solid(): [x0,y0,z0,x1,y1,z1].
function seg(S, a, b) { S.push([a[0], a[1], a[2], b[0], b[1], b[2]]); }
function loop(S, pts) { for (let i = 0; i < pts.length; i++) seg(S, pts[i], pts[(i + 1) % pts.length]); }
function boxWire(S, x0, y0, z0, x1, y1, z1) {
  const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  loop(S, [c[0], c[1], c[2], c[3]]); loop(S, [c[4], c[5], c[6], c[7]]);
  for (let i = 0; i < 4; i++) seg(S, c[i], c[i + 4]);
}
function wheel(S, x, y, z, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n; pts.push([x, y + Math.sin(a) * r, z + Math.cos(a) * r]); }
  loop(S, pts);
}
// The slow tank: a wide low hull with a raked glacis, six big wheels on
// outriggers, a squat turret, a long gun. A 2075 lunar vehicle, not a Sherman.
function buildTankSlow() {
  const S = [];
  const L = 24, W = 15, H = 8;
  const hz = L / 2, hw = W / 2;
  // hull: a hexagonal prism seen from the side — flat deck, raked front and back
  const deckY = H, beltY = H * 0.55, floorY = 2.2;
  for (const sx of [-1, 1]) {
    const x = sx * hw;
    loop(S, [[x, floorY, hz * 0.8], [x, beltY, hz], [x, deckY, hz * 0.55], [x, deckY, -hz * 0.6], [x, beltY, -hz], [x, floorY, -hz * 0.8]]);
  }
  for (const z of [[floorY, hz * 0.8], [beltY, hz], [deckY, hz * 0.55], [deckY, -hz * 0.6], [beltY, -hz], [floorY, -hz * 0.8]]) seg(S, [-hw, z[0], z[1]], [hw, z[0], z[1]]);
  // wheels: three a side on outriggers, slightly outboard
  for (const sx of [-1, 1]) for (const z of [-7.5, 0, 7.5]) {
    wheel(S, sx * (hw + 1.6), 2.6, z, 2.6, 8);
    seg(S, [sx * hw, 3.2, z], [sx * (hw + 1.6), 3.2, z]);
  }
  // turret: an octagonal drum on the deck, offset back a little
  const tr = 4.6, ty0 = deckY, ty1 = deckY + 3.4, tz = 1.5;
  const ring = (y) => { const p = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + Math.PI * 2 * i / 8; p.push([Math.cos(a) * tr, y, tz + Math.sin(a) * tr]); } return p; };
  const r0 = ring(ty0), r1 = ring(ty1);
  loop(S, r0); loop(S, r1);
  for (let i = 0; i < 8; i += 2) seg(S, r0[i], r1[i]);
  // the gun: a tube forward from the turret face
  const gy = ty0 + 2.0;
  seg(S, [-0.8, gy, tz - tr + 0.5], [-0.6, gy, -hz - 9]); seg(S, [0.8, gy, tz - tr + 0.5], [0.6, gy, -hz - 9]);
  seg(S, [-0.6, gy, -hz - 9], [0.6, gy, -hz - 9]);
  seg(S, [-1.2, gy + 0.9, tz - tr - 1.5], [1.2, gy + 0.9, tz - tr - 1.5]);   // the mantlet lip
  // a sensor mast and a hatch
  seg(S, [tr - 1, ty1, tz + 1], [tr - 1, ty1 + 4, tz + 1]); seg(S, [tr - 2, ty1 + 4, tz + 1], [tr, ty1 + 4, tz + 1]);
  loop(S, [[-2, ty1, tz + 1.5], [0.5, ty1, tz + 1.5], [0.5, ty1, tz + 3.5], [-2, ty1, tz + 3.5]]);
  return S;
}
// The fast tank: lower, narrower, four wheels, a wedge hull, the gun on a
// pintle rather than a turret.
function buildTankMedium() {
  const S = [];
  const L = 21, W = 13, H = 6;
  const hz = L / 2, hw = W / 2;
  const deckY = H, floorY = 2.0;
  for (const sx of [-1, 1]) {
    const x = sx * hw;
    loop(S, [[x, floorY, hz], [x, deckY, hz * 0.7], [x, deckY, -hz * 0.15], [x, floorY + 1.2, -hz]]);
  }
  for (const z of [[floorY, hz], [deckY, hz * 0.7], [deckY, -hz * 0.15], [floorY + 1.2, -hz]]) seg(S, [-hw, z[0], z[1]], [hw, z[0], z[1]]);
  seg(S, [-hw * 0.5, deckY, -hz * 0.15], [-hw * 0.3, floorY + 1.2, -hz]); seg(S, [hw * 0.5, deckY, -hz * 0.15], [hw * 0.3, floorY + 1.2, -hz]);   // glacis ribs
  for (const sx of [-1, 1]) for (const z of [-6, 6]) { wheel(S, sx * (hw + 1.2), 2.3, z, 2.3, 8); seg(S, [sx * hw, 2.8, z], [sx * (hw + 1.2), 2.8, z]); }
  // pintle gun: a post, a cradle, the tube
  seg(S, [0, deckY, 2], [0, deckY + 2.6, 2]);
  loop(S, [[-1.6, deckY + 2.6, 0.5], [1.6, deckY + 2.6, 0.5], [1.6, deckY + 2.6, 3.5], [-1.6, deckY + 2.6, 3.5]]);
  seg(S, [-0.6, deckY + 3.2, 0.5], [-0.45, deckY + 3.2, -hz - 7]); seg(S, [0.6, deckY + 3.2, 0.5], [0.45, deckY + 3.2, -hz - 7]);
  seg(S, [-0.45, deckY + 3.2, -hz - 7], [0.45, deckY + 3.2, -hz - 7]);
  // a low canopy
  loop(S, [[-2.4, deckY, 4], [2.4, deckY, 4], [1.8, deckY + 1.8, 5.5], [-1.8, deckY + 1.8, 5.5]]);
  seg(S, [-2.4, deckY, 4], [-1.8, deckY + 1.8, 5.5]); seg(S, [2.4, deckY, 4], [1.8, deckY + 1.8, 5.5]);
  return S;
}
// The siege tank: the slow tank's language at twice the size with a second gun.
function buildTankBoss() {
  const base = buildTankSlow();
  const S = base.map((q) => [q[0] * 1.85, q[1] * 1.75, q[2] * 1.85, q[3] * 1.85, q[4] * 1.75, q[5] * 1.85]);
  const gy = 8 * 1.75 + 3.5, hz = 24 * 1.85 / 2;
  for (const sx of [-1, 1]) { seg(S, [sx * 3.2 - 0.7, gy, -2], [sx * 3.2 - 0.5, gy, -hz - 14]); seg(S, [sx * 3.2 + 0.7, gy, -2], [sx * 3.2 + 0.5, gy, -hz - 14]); }
  return S;
}
export const MODELS = { slow: buildTankSlow(), medium: buildTankMedium(), boss: buildTankBoss() };
// the ground missile: a dart with three fins, nose at -z
const MISSILE = (() => {
  const S = [];
  seg(S, [0, 0, -4], [0.8, 0, 0]); seg(S, [0, 0, -4], [-0.8, 0, 0]); seg(S, [0, 0, -4], [0, 0.8, 0]); seg(S, [0, 0, -4], [0, -0.8, 0]);
  seg(S, [0.8, 0, 0], [0.8, 0, 3]); seg(S, [-0.8, 0, 0], [-0.8, 0, 3]); seg(S, [0, 0.8, 0], [0, 0.8, 3]); seg(S, [0, -0.8, 0], [0, -0.8, 3]);
  for (const a of [0, 2.094, 4.188]) seg(S, [Math.cos(a) * 0.8, Math.sin(a) * 0.8, 3], [Math.cos(a) * 2.2, Math.sin(a) * 2.2, 4]);
  return S;
})();

// ---- the scene -------------------------------------------------------------------------------
export class TankScene {
  constructor(canvas, params) {
    this.params = Object.assign({}, DEFAULT_PARAMS, params || {});
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.params.tankFov, 1.78, 1.5, 40000);
    this.camera.rotation.order = 'YXZ';
    // depth is the occlusion model here: black fills write depth (ground,
    // skyline, structure and hull boxes); line batches test it. Draw order
    // only matters for the no-depth foreground (your gun, the beam flash).
    this.starBatch = new LineBatch(2600, 0, { depth: true });     // stars + the Earth
    this.skyFarFill = new GroundFill(1, SKY_FLOOR, true);
    this.skyFarBatch = new LineBatch(900, 2, { depth: true });     // the far ring + the horizon glow copies
    this.skyFill = new GroundFill(3, SKY_FLOOR, true);
    this.skyBatch = new LineBatch(400, 4, { depth: true });        // the mid ring
    this.ridgeFill = new GroundFill(4.2, SKY_FLOOR, true);
    this.ridgeBatch = new LineBatch(600, 4.4, { depth: true });    // the two near ridges
    this.groundMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    this.groundMesh.frustumCulled = false; this.groundMesh.renderOrder = 5;
    this.groundBatch = new LineBatch(90000, 6, { depth: true });   // contours + craters + rocks + the trail
    this.boxMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    this.boxMesh.frustumCulled = false; this.boxMesh.renderOrder = 7;
    this.structBatch = new LineBatch(12000, 8, { depth: true });
    this.dynBatch = new LineBatch(9000, 9, { depth: true });
    this.gunBatch = new LineBatch(600, 10);   // no depth: always in front
    for (const m of [this.starBatch.mesh, this.skyFarFill.mesh, this.skyFarBatch.mesh, this.skyFill.mesh, this.skyBatch.mesh, this.ridgeFill.mesh, this.ridgeBatch.mesh, this.groundMesh, this.groundBatch.mesh, this.boxMesh, this.structBatch.mesh, this.dynBatch.mesh, this.gunBatch.mesh]) this.scene.add(m);
    this.worldBatches = [this.starBatch, this.skyFarBatch, this.skyBatch, this.ridgeBatch, this.groundBatch, this.structBatch, this.dynBatch, this.gunBatch];
    this.world = null;
    this.stars = [];
    this.skyPts = null; this.skyFarPts = null;
    this.groundCentre = null;
    this.ringsLaid = false; this.anchor = [0, 0];
    this.scopeShown = 0;
    this.zoomShown = 1;
    this.boxKey = '';
    this.effects = [];
    this.particles = [];
    this.time = 0;
    this.flash = 0;
    this.pitchShown = 0; this.rollShown = 0; this.deathT = 0;
    this.rngState = 12345;
    this.w = 2; this.h = 2; this.pw = 2; this.ph = 2;
    this.rubble = {};
    this._v = new THREE.Vector3();
    this._buildPost();
    this.resize();
  }
  _rand() {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }
  // (COPY) the post chain: one half-res bloom level, bright pass, blur, composite
  _buildPost() {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(2, 2, Object.assign({}, opts, { depthBuffer: true }));   // the tank's scene needs depth
    this.bloomRT = [[new THREE.WebGLRenderTarget(2, 2, opts), new THREE.WebGLRenderTarget(2, 2, opts)]];
    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.brightMat = mk(BRIGHT_FRAG, { tSrc: { value: null } });
    this.blurMat = mk(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.compMat = mk(COMP_FRAG, {
      tScene: { value: null }, tB0: { value: null },
      uTint: { value: new THREE.Color(0.3, 1, 0.45) }, uGlow: { value: 1 }, uFlash: { value: 0 },
    });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.brightMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }
  setParams(p) {
    const before = {};
    for (const k of ['stars', 'gridPitch', 'gridBright', 'traceBright', 'contourBright', 'contourStep', 'craterBright', 'rockBright', 'ridgeBright', 'skyBright', 'skyFarBright', 'hazeBright', 'earthBright']) before[k] = this.params[k];
    Object.assign(this.params, p);
    for (const k of Object.keys(before)) if (before[k] !== this.params[k]) { this.groundCentre = null; this.skyPts = null; this.ringsLaid = false; }
  }
  resize(w, h) {
    w = Math.max(2, Math.floor(w || window.innerWidth || this.canvas.clientWidth || 2));
    h = Math.max(2, Math.floor(h || window.innerHeight || this.canvas.clientHeight || 2));
    this.w = w; this.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.params.res;
    let pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
    const budget = Math.sqrt(PIXEL_BUDGET / Math.max(1, pw * ph));
    if (budget < 1) { pw = Math.floor(pw * budget); ph = Math.floor(ph * budget); }
    pw = Math.max(2, pw); ph = Math.max(2, ph);
    this.pw = pw; this.ph = ph;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(pw, ph, false);   // CSS owns the canvas's on-screen size
    this.sceneRT.setSize(pw, ph);
    for (let i = 0; i < this.bloomRT.length; i++) {
      const d = Math.pow(2, i + 1);
      const bw = Math.max(2, Math.floor(pw / d)), bh = Math.max(2, Math.floor(ph / d));
      this.bloomRT[i][0].setSize(bw, bh);
      this.bloomRT[i][1].setSize(bw, bh);
    }
    for (const b of this.worldBatches) b.mat.uniforms.uRes.value.set(pw, ph);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- the world ------------------------------------------------------------------------------
  setWorld(state) {
    this.world = state;
    this.rngState = (state.seed || 1) >>> 0;
    this.stars = [];
    for (let i = 0; i < 700; i++) {
      const a = this._rand() * Math.PI * 2, e = Math.asin(this._rand() * 0.98 + 0.02);
      this.stars.push([Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e), 0.3 + this._rand() * this._rand() * 1.0]);
    }
    this.groundCentre = null; this.skyPts = null; this.boxKey = '';
    this.ringsLaid = false;
    this.anchor = state.tank ? [state.tank.x, 0] : [0, 0];   // the rings stand here; driving through them is the parallax
    this.effects.length = 0; this.particles.length = 0;
    this.rubble = {};
    // the Earth: a fixed place in this moon's sky
    const C = globalThis.LunarCore;
    const r = C.mulberry32(C.hashSeed(this.rngState, 77));
    this.earth = { az: r() * Math.PI * 2, el: 0.32 + r() * 0.22, rad: 0.052, phase: 0.25 + r() * 0.5, tilt: (r() - 0.5) * 0.8, seed: (r() * 1e6) | 0 };
  }
  _core() { return globalThis.LunarTankCore; }
  _groundAt(x, z) { return this.world ? this._core().groundAt(this.world, x, z) : 0; }
  // The skylines: two rings of mountains around the tank, heights hashed by
  // absolute bearing (so turning never moves them), the same lo/hi recipe as
  // the lander's far / farther ranges, black to the floor beneath each.
  _buildSky() {
    const C = globalThis.LunarCore;
    const seed = (this.world && this.world.seed) || 1;
    const mk = (n, lo, hi, salt, sm) => {
      const pts = [];
      const rng = C.mulberry32(C.hashSeed(seed, salt));
      let prev = lo + rng() * (hi - lo);
      const hs = [];
      for (let i = 0; i < n; i++) { let y = lo + rng() * (hi - lo); y = prev + (y - prev) * sm; prev = y; hs.push(y); }
      hs[n - 1] = (hs[0] + hs[n - 2]) * 0.5;
      return hs;
    };
    this.skyH = mk(120, 380, 980, 23, 0.5);
    this.skyFarH = mk(96, 700, 1700, 11, 0.45);
  }
  // The rings (mid + far) are laid ONCE per world around the anchor — the
  // stretch's start — so driving moves you through them and the three depths
  // slide past each other (item 6: parallax). The far crest carries the
  // horizon glow: two dimmer copies just above it widen the bloom into a rim
  // of light along the horizon. Black to the floor beneath each.
  _layRings(baseY) {
    if (!this.skyH) this._buildSky();
    const P = this.params;
    const ax = this.anchor[0], az = this.anchor[1];
    const lay = (hs, R, batch, fill, bright, haze) => {
      const pts = [];
      const n = hs.length;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 2 * i / n;
        pts.push([ax + Math.cos(a) * R, baseY + hs[i % n], az + Math.sin(a) * R]);
      }
      batch.begin();
      for (let i = 1; i < pts.length; i++) batch.seg(pts[i - 1][0], pts[i - 1][1], pts[i - 1][2], pts[i][0], pts[i][1], pts[i][2], bright);
      if (haze > 0) for (const [lift, b] of [[5, haze * 0.5], [11, haze * 0.28], [18, haze * 0.14]]) {   // a few ft apart at 11,000 ft: under a pixel each, so they fuse into a rim of light
        for (let i = 1; i < pts.length; i++) batch.seg(pts[i - 1][0], pts[i - 1][1] + lift, pts[i - 1][2], pts[i][0], pts[i][1] + lift, pts[i][2], b);
      }
      batch.end();
      fill.set3(pts);
    };
    lay(this.skyH, SKY_MID_R, this.skyBatch, this.skyFill, P.skyBright, 0);
    lay(this.skyFarH, SKY_FAR_R, this.skyFarBatch, this.skyFarFill, P.skyFarBright + P.hazeBright * 0.9, P.hazeBright);
    this.ringsLaid = true;
  }
  // the near ridges: two crests along the flight line, RIDGE_Z either side,
  // heights hashed by x (so they never move), re-laid with the ground
  _ridgeH(x, side) {
    const C = globalThis.LunarCore;
    const seed = (this.world && this.world.seed) || 1;
    const i = Math.floor(x / RIDGE_STEP), t = x / RIDGE_STEP - i;
    const h = (k) => { const r = C.hashSeed(seed ^ (side > 0 ? 0x51 : 0x77), k) / 4294967296; return 160 + r * r * 620; };
    const a = h(i), b = h(i + 1);
    const e = t * t * (3 - 2 * t);
    return a + (b - a) * e;
  }
  _layRidges(cx, baseY) {
    const P = this.params;
    const B = this.ridgeBatch;
    B.begin();
    const x0 = Math.floor((cx - 5000) / RIDGE_STEP) * RIDGE_STEP;
    const n = Math.round(10000 / RIDGE_STEP) + 1;
    const all = [];
    for (const side of [-1, 1]) {
      const z = side * RIDGE_Z;
      const pts = [];
      for (let i = 0; i < n; i++) { const x = x0 + i * RIDGE_STEP; pts.push([x, baseY + this._ridgeH(x, side) * 0.55, z]); }
      for (let i = 1; i < n; i++) B.seg(pts[i - 1][0], pts[i - 1][1], pts[i - 1][2], pts[i][0], pts[i][1], pts[i][2], P.ridgeBright);
      all.push(pts);
    }
    B.end();
    // one fill for both: the strip drops to the floor under each crest; join the two by a hidden pass under the floor
    const joined = all[0].concat([[all[0][all[0].length - 1][0], SKY_FLOOR, all[0][all[0].length - 1][2]], [all[1][0][0], SKY_FLOOR, all[1][0][2]]], all[1]);
    this.ridgeFill.set3(joined);
  }
  // the stars and the Earth ride with the tank (infinitely far): re-laid every 200 ft
  _laySky(cx, cz, baseY) {
    const P = this.params;
    const S = this.starBatch;
    S.begin();
    if (P.stars > 0) for (const s of this.stars) {
      const x = cx + s[0] * STAR_R, y = baseY + s[1] * STAR_R, z = cz + s[2] * STAR_R;
      S.seg(x, y, z, x, y, z, s[3] * P.stars * 3.2);
    }
    if (P.earthBright > 0 && this.earth) this._layEarth(S, cx, cz, baseY);
    S.end();
    this.skyPts = [cx, cz];
  }
  // The Earth: a disc on the star sphere — the lit limb bright, the dark limb
  // faint, the terminator an ellipse of the phase, a few latitude arcs and
  // three hashed continents on the lit side. Lines only, like everything.
  _layEarth(S, cx, cz, baseY) {
    const E = this.earth, P = this.params;
    const R = STAR_R * 0.96;
    const ca = Math.cos(E.az), sa = Math.sin(E.az), ce = Math.cos(E.el), se = Math.sin(E.el);
    // basis: centre direction d, right r (horizontal), up u
    const d = [ca * ce, se, sa * ce];
    const r0 = [-sa, 0, ca];
    const u0 = [-ca * se, ce, -sa * se];
    const ct = Math.cos(E.tilt), st = Math.sin(E.tilt);
    const r = [r0[0] * ct + u0[0] * st, r0[1] * ct + u0[1] * st, r0[2] * ct + u0[2] * st];
    const u = [-r0[0] * st + u0[0] * ct, -r0[1] * st + u0[1] * ct, -r0[2] * st + u0[2] * ct];
    const rad = E.rad;
    const pt = (px, py) => [cx + (d[0] + r[0] * px * rad + u[0] * py * rad) * R, baseY + (d[1] + r[1] * px * rad + u[1] * py * rad) * R, cz + (d[2] + r[2] * px * rad + u[2] * py * rad) * R];
    const b = P.earthBright;
    const lit = (px) => px * (E.phase > 0.5 ? 1 : -1) > 0;   // which side the sun is on
    // the limb
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
      const p0 = pt(Math.cos(a0), Math.sin(a0)), p1 = pt(Math.cos(a1), Math.sin(a1));
      S.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], lit(Math.cos(a0)) ? 1.5 * b : 0.28 * b);
    }
    // the terminator: an ellipse whose width is the phase
    const k = Math.cos(E.phase * Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
      const p0 = pt(Math.cos(a0) * k, Math.sin(a0)), p1 = pt(Math.cos(a1) * k, Math.sin(a1));
      S.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.7 * b);
    }
    // latitude arcs on the lit side
    for (const ly of [-0.62, -0.3, 0, 0.3, 0.62]) {
      const w = Math.sqrt(1 - ly * ly);
      const m = 10;
      for (let i = 0; i < m; i++) {
        const t0 = i / m, t1 = (i + 1) / m;
        const x0 = -w + 2 * w * t0, x1 = -w + 2 * w * t1;
        if (!lit(x0) && !lit(x1)) continue;
        const p0 = pt(x0, ly), p1 = pt(x1, ly);
        S.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.32 * b);
      }
    }
    // continents: three wobbly loops, hashed
    const C = globalThis.LunarCore;
    const rng = C.mulberry32(E.seed);
    for (let c = 0; c < 3; c++) {
      const ox = (rng() - 0.5) * 1.1, oy = (rng() - 0.5) * 1.1, sz = 0.18 + rng() * 0.22;
      const m = 14, ptsC = [];
      for (let i = 0; i < m; i++) { const a = Math.PI * 2 * i / m; const rr = sz * (0.6 + rng() * 0.7); ptsC.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr * 0.8]); }
      for (let i = 0; i < m; i++) {
        const a = ptsC[i], bb = ptsC[(i + 1) % m];
        if (a[0] * a[0] + a[1] * a[1] > 0.9 || bb[0] * bb[0] + bb[1] * bb[1] > 0.9) continue;
        const p0 = pt(a[0], a[1]), p1 = pt(bb[0], bb[1]);
        S.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], (lit(a[0]) ? 0.9 : 0.2) * b);
      }
    }
  }
  // The ground around the tank: a black mesh that writes depth, a grid of
  // lines that follow the relief, and the flight line — the path the lander
  // flew — traced brighter along z = 0. Re-laid when the tank has moved.
  _layGround(cx, cz) {
    const P = this.params;
    const H = GROUND_HALF, cell = GROUND_CELL;
    const x0 = Math.floor((cx - H) / cell) * cell, z0 = Math.floor((cz - H) / cell) * cell;
    const n = Math.round(2 * H / cell) + 1;
    const pos = new Float32Array(n * n * 3);
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let vi = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i * cell, z = z0 + j * cell;
      pos[vi++] = x; pos[vi++] = this._groundAt(x, z) - 0.5; pos[vi++] = z;
    }
    let ii = 0;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx[ii++] = a; idx[ii++] = c; idx[ii++] = b; idx[ii++] = b; idx[ii++] = c; idx[ii++] = d;
    }
    const g = this.groundMesh.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const B = this.groundBatch;
    B.begin();
    const pitch = Math.max(cell, Math.round(P.gridPitch / cell) * cell);
    const gb = P.gridBright;
    const yAt = (i, j) => pos[(j * n + i) * 3 + 1] + 1.1;
    // ---- the moon (item 1): CONTOURS — marching squares over the mesh's own
    // samples, every contourStep ft, every fifth heavier; a topographic moon
    // instead of a grid. Cells under a structure are flat and draw nothing.
    if (P.contourBright > 0 && P.contourStep > 0) {
      const step = P.contourStep;
      const lift = 0.9;
      const hv = (i, j) => pos[(j * n + i) * 3 + 1] + 0.5;   // the true height (the mesh sits 0.5 under)
      const cross = (L, ha, hb, xa, za, xb, zb) => { const t = (L - ha) / (hb - ha); return [xa + (xb - xa) * t, za + (zb - za) * t]; };
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
        const x = x0 + i * cell, z = z0 + j * cell;
        const a = hv(i, j), b = hv(i + 1, j), c = hv(i + 1, j + 1), d = hv(i, j + 1);
        const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
        if (hi - lo < 0.05) continue;
        // the slope sets the weight: the plains draw nothing (craters and rocks are their texture), a rise draws faint, a hill draws
        const sl = (hi - lo) / cell;
        if (sl < 0.11) continue;                       // a grade is not a hill: the plains stay black
        const su = Math.min(1, (sl - 0.11) / 0.25);
        const slopeW = 0.35 + 0.65 * su * su * (3 - 2 * su);
        for (let L = Math.ceil(lo / step) * step; L < hi; L += step) {
          const pts = [];
          if ((a < L) !== (b < L)) pts.push(cross(L, a, b, x, z, x + cell, z));
          if ((b < L) !== (c < L)) pts.push(cross(L, b, c, x + cell, z, x + cell, z + cell));
          if ((c < L) !== (d < L)) pts.push(cross(L, c, d, x + cell, z + cell, x, z + cell));
          if ((d < L) !== (a < L)) pts.push(cross(L, d, a, x, z + cell, x, z));
          const heavy = Math.round(L / step) % 5 === 0;
          const br = P.contourBright * (heavy ? 1.45 : 1) * slopeW;
          const y = L + lift;
          if (pts.length === 2) B.seg(pts[0][0], y, pts[0][1], pts[1][0], y, pts[1][1], br);
          else if (pts.length === 4) { B.seg(pts[0][0], y, pts[0][1], pts[1][0], y, pts[1][1], br); B.seg(pts[2][0], y, pts[2][1], pts[3][0], y, pts[3][1], br); }
        }
      }
    }
    // ---- CRATER RIMS: one roll per CRATER_CELL, a rim ring following the
    // ground, an inner ring, a few rays out of the rim. ROCK FIELDS: one roll
    // per ROCK_CELL, a cluster of small tetrahedra. Both hashed, so they never
    // move. (Visual: the physics ground is the lander's, untouched.)
    if (this.world && (P.craterBright > 0 || P.rockBright > 0)) {
      const C = globalThis.LunarCore;
      const seed = this.world.seed;
      const T = this._core();
      const inStruct = (x, z) => { for (const o of T.structuresNear(this.world, x, z, 60)) if (T.boxDist(o, x, z) < 50) return true; return false; };
      const gAt = (x, z) => this._groundAt(x, z);
      if (P.craterBright > 0) {
        const H = GROUND_HALF - 40;
        for (let gz = Math.floor((cz - H) / CRATER_CELL); gz <= Math.floor((cz + H) / CRATER_CELL); gz++) for (let gx = Math.floor((cx - H) / CRATER_CELL); gx <= Math.floor((cx + H) / CRATER_CELL); gx++) {
          const rng = C.mulberry32(C.hashSeed(seed ^ 0xc4a7e4, gx * 7919 + gz * 104729));
          if (rng() > 0.42) continue;
          const x = (gx + 0.15 + rng() * 0.7) * CRATER_CELL, z = (gz + 0.15 + rng() * 0.7) * CRATER_CELL;
          if (Math.abs(z) < 60) continue;                        // never on the flight line
          const rr = 28 + rng() * rng() * 190;
          if (inStruct(x, z)) continue;
          const m = rr > 120 ? 40 : 28;
          const br = P.craterBright * (0.8 + rng() * 0.4);
          const ring = (radius, b, wob) => {
            let px = null, py = 0, pz = 0;
            for (let i = 0; i <= m; i++) {
              const a = Math.PI * 2 * i / m;
              const w = 1 + (wob ? (Math.sin(a * 3 + rng() * 0.2) * 0.05 + Math.sin(a * 7) * 0.03) : 0);
              const qx = x + Math.cos(a) * radius * w, qz = z + Math.sin(a) * radius * w;
              const qy = gAt(qx, qz) + 1.0;
              if (px !== null) B.seg(px, py, pz, qx, qy, qz, b);
              px = qx; py = qy; pz = qz;
            }
          };
          ring(rr, br, true);
          ring(rr * 0.58, br * 0.5, false);
          const rays = 4 + Math.floor(rng() * 6);
          for (let k = 0; k < rays; k++) {
            const a = rng() * Math.PI * 2, l0 = rr * (1.05 + rng() * 0.1), l1 = rr * (1.3 + rng() * 0.6);
            const ax = x + Math.cos(a) * l0, az = z + Math.sin(a) * l0, bx = x + Math.cos(a) * l1, bz = z + Math.sin(a) * l1;
            B.seg(ax, gAt(ax, az) + 0.9, az, bx, gAt(bx, bz) + 0.9, bz, br * 0.45);
          }
        }
      }
      if (P.rockBright > 0) {
        const H = GROUND_HALF - 20;
        for (let gz = Math.floor((cz - H) / ROCK_CELL); gz <= Math.floor((cz + H) / ROCK_CELL); gz++) for (let gx = Math.floor((cx - H) / ROCK_CELL); gx <= Math.floor((cx + H) / ROCK_CELL); gx++) {
          const rng = C.mulberry32(C.hashSeed(seed ^ 0x90c7, gx * 3571 + gz * 65537));
          if (rng() > 0.3) continue;
          const fx = (gx + rng()) * ROCK_CELL, fz = (gz + rng()) * ROCK_CELL;
          if (Math.abs(fz) < 40 || inStruct(fx, fz)) continue;
          const count = 3 + Math.floor(rng() * 7), spread = 25 + rng() * 60;
          const br = P.rockBright;
          for (let k = 0; k < count; k++) {
            const x = fx + (rng() - 0.5) * spread, z = fz + (rng() - 0.5) * spread;
            const sz = 1.0 + rng() * rng() * 2.6, h = sz * (0.5 + rng() * 0.7);
            const base = gAt(x, z) + 0.3;
            const a0 = rng() * Math.PI * 2;
            const p = [];
            for (let q = 0; q < 3; q++) { const a = a0 + Math.PI * 2 * q / 3; p.push([x + Math.cos(a) * sz, base, z + Math.sin(a) * sz]); }
            const ap = [x + (rng() - 0.5) * sz * 0.6, base + h, z + (rng() - 0.5) * sz * 0.6];
            for (let q = 0; q < 3; q++) { const a = p[q], b = p[(q + 1) % 3]; B.seg(a[0], a[1], a[2], b[0], b[1], b[2], br * 0.8); B.seg(a[0], a[1], a[2], ap[0], ap[1], ap[2], br); }
          }
        }
      }
    }
    // the old grid stays a dial (default off)
    if (gb > 0) {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * cell;
        if (x % pitch !== 0) continue;
        for (let j = 1; j < n; j++) B.seg(x, yAt(i, j - 1), z0 + (j - 1) * cell, x, yAt(i, j), z0 + j * cell, gb);
      }
      for (let j = 0; j < n; j++) {
        const z = z0 + j * cell;
        if (z % pitch !== 0) continue;
        for (let i = 1; i < n; i++) B.seg(x0 + (i - 1) * cell, yAt(i - 1, j), z, x0 + i * cell, yAt(i, j), z, gb);
      }
    }
    // the flight line: the path the lander flew, along z = 0 (a mesh row) —
    // a TICKED TRAIL: dashes with a cross-tick every 200 ft, so distance reads
    if (P.traceBright > 0 && z0 <= 0 && z0 + (n - 1) * cell >= 0) {
      const j = Math.round(-z0 / cell);
      const yTrail = (x) => { const u = (x - x0) / cell; const i = Math.min(n - 2, Math.max(0, Math.floor(u))); const t = Math.min(1, Math.max(0, u - i)); return yAt(i, j) + (yAt(i + 1, j) - yAt(i, j)) * t + 0.3; };
      const xs = Math.ceil(x0 / 50) * 50, xe = x0 + (n - 1) * cell;
      for (let x = xs; x < xe; x += 50) {
        const x1 = Math.min(xe, x + 30);
        B.seg(x, yTrail(x), 0, x1, yTrail(x1), 0, P.traceBright);
        if (x % 200 === 0) { const y = yTrail(x); B.seg(x, y, -7, x, y, 7, P.traceBright * 1.3); }
      }
    }
    B.end();
    this.groundCentre = [cx, cz];
  }
  // Black boxes under every live structure and enemy hull, so lines behind
  // them hide. Structures rebuild when the set changes; enemies every frame
  // (appended after the structures' vertices).
  _layBoxes(structs, enemies) {
    const boxes = [];
    for (const s of structs) if (s.alive) boxes.push([s.x0 + 0.6, s.y - 2, s.z0 + 0.6, s.x1 - 0.6, s.y + s.h - 0.6, s.z1 - 0.6]);
    const E = this._core().ENEMY;
    for (const e of enemies) {
      if (!e.alive) continue;
      const k = E[e.kind];
      const hl = k.length / 2 - 0.8, hw = k.width / 2 - 0.8, c = Math.cos(e.heading), s = Math.sin(e.heading);
      // an oriented box: eight corners rotated by the heading
      const corners = [];
      for (const lz of [-hl, hl]) for (const lx of [-hw, hw]) corners.push([e.x + lx * c - lz * s, e.z + lx * s + lz * c]);
      boxes.push({ o: true, c: corners, y0: e.y + 1.2, y1: e.y + k.hullH - 0.6 });
    }
    const pos = new Float32Array(boxes.length * 36 * 3);
    let v = 0;
    const put = (p) => { pos[v++] = p[0]; pos[v++] = p[1]; pos[v++] = p[2]; };
    const quad = (a, b, c, d) => { put(a); put(b); put(c); put(a); put(c); put(d); };
    for (const b of boxes) {
      let c;
      if (b.o) c = [[b.c[0][0], b.y0, b.c[0][1]], [b.c[1][0], b.y0, b.c[1][1]], [b.c[3][0], b.y0, b.c[3][1]], [b.c[2][0], b.y0, b.c[2][1]], [b.c[0][0], b.y1, b.c[0][1]], [b.c[1][0], b.y1, b.c[1][1]], [b.c[3][0], b.y1, b.c[3][1]], [b.c[2][0], b.y1, b.c[2][1]]];
      else c = [[b[0], b[1], b[2]], [b[3], b[1], b[2]], [b[3], b[1], b[5]], [b[0], b[1], b[5]], [b[0], b[4], b[2]], [b[3], b[4], b[2]], [b[3], b[4], b[5]], [b[0], b[4], b[5]]];
      quad(c[0], c[1], c[2], c[3]); quad(c[4], c[5], c[6], c[7]);
      quad(c[0], c[1], c[5], c[4]); quad(c[1], c[2], c[6], c[5]); quad(c[2], c[3], c[7], c[6]); quad(c[3], c[0], c[4], c[7]);
    }
    const g = this.boxMesh.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setDrawRange(0, boxes.length * 36);
    g.computeBoundingSphere();
  }
  // Rubble: THE LANDER'S RECIPE (render3d.js _rubble, 2026-09-06) so a
  // destroyed building looks the same from the air and from the ground —
  // same rng seed, same draws, same strokes; local to the footprint centre.
  _rubbleFor(s) {
    if (this.rubble[s.sid]) return this.rubble[s.sid];
    const C = globalThis.LunarCore;
    const rng = C.mulberry32(C.hashSeed(s.k * 131 + 7, s.x0 | 0));
    const w = s.x1 - s.x0;
    const n = 4 + Math.floor(rng() * 3);
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = (rng() - 0.5) * w * 0.9, z = (rng() - 0.5) * 30;
      const h = 3 + rng() * Math.min(14, s.h * 0.35), dx = (rng() - 0.5) * 16;
      out.push([x, 0, z, x + dx, h, z, 0.42]);
    }
    out.push([-w / 2 + 4, 0.5, 0, w / 2 - 4, 0.5, 0, 0.3]);
    this.rubble[s.sid] = out;
    return out;
  }

  // ---- effects ---------------------------------------------------------------------------------
  // A model breaks along its own strokes: every segment becomes a piece that
  // flies, tumbles, falls under lunar gravity and settles on the ground.
  spawnBreak(segs, x, y, z, heading, scale, kick) {
    const c = Math.cos(heading || 0), s = Math.sin(heading || 0);
    const sc = scale || 1;
    for (const q of segs) {
      const mx = (q[0] + q[3]) / 2 * sc, my = (q[1] + q[4]) / 2 * sc, mz = (q[2] + q[5]) / 2 * sc;
      const wx = x + mx * c - mz * s, wy = y + my, wz = z + mx * s + mz * c;
      const ang = this._rand() * Math.PI * 2;
      const sp = (18 + this._rand() * 50) * (kick || 1);
      this.effects.push({
        kind: 'debris', x: wx, y: wy, z: wz, vx: Math.cos(ang) * sp, vy: 22 + this._rand() * 40 * (kick || 1), vz: Math.sin(ang) * sp,
        ang: heading || 0, av: (this._rand() - 0.5) * 6, seg: [(q[0] * sc - mx), (q[1] * sc - my), (q[2] * sc - mz), (q[3] * sc - mx), (q[4] * sc - my), (q[5] * sc - mz)],
        age: 0, life: 3.2 + this._rand() * 2, b: 0.9,
      });
    }
    for (let i = 0; i < 60; i++) this._spark(x, y + 3, z, 40 + this._rand() * 140, 1.4, 1.3);
    this.effects.push({ kind: 'ring', x, y: this._groundAt(x, z) + 0.8, z, age: 0, life: 1.3, r0: 4, r1: 120, b: 1.5 });
    this.effects.push({ kind: 'ring', x, y: this._groundAt(x, z) + 0.8, z, age: -0.15, life: 1.5, r0: 4, r1: 190, b: 0.9 });
    this.flash = Math.max(this.flash, 0.5);
  }
  spawnBurst(x, y, z, size) {
    const n = Math.round(14 + (size || 1) * 24);
    for (let i = 0; i < n; i++) this._spark(x, y, z, 25 + this._rand() * 70 * (size || 1), 0.8, 1.1);
    this.effects.push({ kind: 'ring', x, y: this._groundAt(x, z) + 0.6, z, age: 0, life: 0.8, r0: 3, r1: 30 + 40 * (size || 1), b: 1.0 });
  }
  spawnDust(x, z, strength) {
    const gy = this._groundAt(x, z);
    const n = Math.round(16 + strength * 30);
    for (let i = 0; i < n; i++) {
      const a = this._rand() * Math.PI * 2, sp = (10 + this._rand() * 30) * (0.5 + strength);
      this.effects.push({ kind: 'dust', x: x + Math.cos(a) * 4, y: gy + 1, z: z + Math.sin(a) * 4, vx: Math.cos(a) * sp, vy: 6 + this._rand() * 14 * strength, vz: Math.sin(a) * sp, age: 0, life: 1.4 + this._rand() * 1.2, len: 2 + this._rand() * 4, settled: false });
    }
    this.effects.push({ kind: 'ring', x, y: gy + 0.5, z, age: 0, life: 0.9, r0: 4, r1: 40 + strength * 50, b: 0.8 + strength * 0.4 });
  }
  _spark(x, y, z, sp, life, bright) {
    const a = this._rand() * Math.PI * 2, e = (this._rand() - 0.2) * Math.PI;
    this.effects.push({ kind: 'spark', x, y, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp, age: 0, life: life * (0.6 + this._rand() * 0.8), bright: bright || 1 });
  }
  clearEffects() { this.effects.length = 0; this.particles.length = 0; }
  _stepEffects(dt) {
    const g = 5.3;
    const keep = [];
    for (const e of this.effects) {
      e.age += dt;
      if (e.age >= e.life) continue;
      if (e.kind === 'ring') { keep.push(e); continue; }
      if (!(e.kind === 'dust' && e.settled)) {
        e.vy -= g * dt * (e.kind === 'dust' ? 0.7 : 1);
        e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
      }
      if (e.kind === 'debris') {
        e.ang += e.av * dt;
        const gy = this._groundAt(e.x, e.z);
        if (e.y < gy + 0.5) { e.y = gy + 0.5; e.vy = -e.vy * 0.3; e.vx *= 0.6; e.vz *= 0.6; e.av *= 0.5; }
      } else if (e.kind === 'dust' && !e.settled) {
        const gy = this._groundAt(e.x, e.z);
        if (e.y < gy + 0.5 && e.vy < 0) { e.y = gy + 0.5; e.settled = true; }
      } else if (e.kind === 'spark') {
        const gy = this._groundAt(e.x, e.z);
        if (e.y < gy) { e.y = gy; e.vy = -e.vy * 0.2; e.vx *= 0.5; e.vz *= 0.5; e.life = Math.min(e.life, e.age + 0.15); }
      }
      keep.push(e);
    }
    this.effects = keep;
    const pk = [];
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      pk.push(p);
    }
    this.particles = pk;
  }

  // ---- the frame ---------------------------------------------------------------------------------
  // view: { tank: {x,y,z,heading,look,pitch,turret,gunPitch,recoil,alive}, enemies, missiles, eshells, shells, beam,
  //         structures: [placed structures near the tank], dead: bool, flash, scope: bool, zoom: 1..2,
  //         hover: the sid (structure) or id (enemy) under the crosshair, drawn at 1.25 }
  render(view, dt) {
    dt = Math.min(0.1, Math.max(0, dt || 0));
    this.time += dt;
    const P = this.params;
    const cw = window.innerWidth || this.canvas.clientWidth || 0;
    const chh = window.innerHeight || this.canvas.clientHeight || 0;
    if (cw > 2 && chh > 2 && (cw !== this.w || chh !== this.h)) this.resize(cw, chh);
    this._stepEffects(dt);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    const T = this._core();
    const t = view && view.tank;
    const cam = this.camera;
    if (t) {
      // ---- the camera: the commander's eye; heading direct (the core eases the
      // turn), the look pitch direct (rate-limited in the core), the ground's
      // pitch and side-roll eased in, a few degrees at most. No shake, ever.
      const eye = t.y + T.TANK.eye;
      const look = t.look === undefined ? t.heading : t.look;   // the VIEW is the mouse's (2026-09-07); the hull is elsewhere
      let gp = 0, gr = 0;
      if (this.world) {
        gp = -Math.atan(T.slopeAlong(this.world, t.x, t.z, look)) * P.slopePitch;
        gr = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, Math.atan(T.slopeAlong(this.world, t.x, t.z, look + Math.PI / 2)) * 0.5));
      }
      const k = 1 - Math.exp(-dt / PITCH_TAU);
      this.pitchShown += (gp - this.pitchShown) * k;
      this.rollShown += (gr - this.rollShown) * k;
      // the scope (item 7): the field of view narrows, eased — never a cut
      const scopeWant = view.scope ? 1 : 0;
      this.scopeShown += (scopeWant - this.scopeShown) * (1 - Math.exp(-dt / 0.16));
      // death: the view sags forward and down, slowly
      let dead = 0;
      if (view.dead) { this.deathT += dt; dead = 1 - Math.exp(-this.deathT / 1.1); } else this.deathT = 0;
      cam.position.set(t.x, eye - dead * 4, t.z);
      cam.rotation.set(t.pitch + this.pitchShown - dead * 0.32, -look, this.rollShown + dead * 0.06, 'YXZ');
      // the wheel zoom (2026-09-09): eased the same way, stacked under the scope
      const zoomWant = Math.max(1, view.zoom || 1);
      this.zoomShown += (zoomWant - this.zoomShown) * (1 - Math.exp(-dt / 0.16));
      cam.fov = P.tankFov * (1 - this.scopeShown * 0.7) / this.zoomShown;
      cam.near = 1.5; cam.far = 40000;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      // ---- the static layers follow the tank in big steps; the rings stand at the anchor
      const baseY = this.world ? T.baseAt(this.world, t.x) : 0;
      if (!this.ringsLaid) this._layRings(this.world ? T.baseAt(this.world, this.anchor[0]) : 0);
      if (!this.groundCentre || Math.hypot(t.x - this.groundCentre[0], t.z - this.groundCentre[1]) > GROUND_REBUILD) { this._layGround(t.x, t.z); this._layRidges(t.x, baseY); }
      if (!this.skyPts || Math.hypot(t.x - this.skyPts[0], t.z - this.skyPts[1]) > 200) this._laySky(t.x, t.z, baseY);
    }
    const structs = (view && view.structures) || [];
    const enemies = (view && view.enemies) || [];
    // ---- the structures: the shared solid() model, civilians dim, hostiles bright, rubble when dead
    const SB = this.structBatch;
    SB.begin();
    const ST = globalThis.LunarStructures;
    let boxKey = '';
    for (const s of structs) {
      boxKey += s.sid + (s.alive ? '+' : '-');
      const segs = s.alive ? ST.solid(s.id) : this._rubbleFor(s);
      if (!segs) continue;
      // the lander's values: civilians 0.62, hostiles 0.85, the hostile under the
      // crosshair 1.25 (its "hover"); rubble carries its own brightness per stroke
      const hov = view && view.hover && view.hover === s.sid;
      const b = s.alive ? (hov ? 1.25 : s.cls === 'civ' ? P.civBright : P.hostBright) : 0;
      for (const q of segs) SB.seg(s.x + q[0], s.y + q[1], s.z + q[2], s.x + q[3], s.y + q[4], s.z + q[5], s.alive ? b : q[6]);
      if (s.alive && s.hard === 'door' && s.door > 0) {
        const gl = 1.6 + 0.5 * Math.sin(this.time * 14);
        const hz = s.d / 2;
        for (const zz of [-hz, hz]) { SB.seg(s.x - 10, s.y, s.z + zz, s.x - 10, s.y + 14, s.z + zz, gl); SB.seg(s.x + 10, s.y, s.z + zz, s.x + 10, s.y + 14, s.z + zz, gl); SB.seg(s.x - 10, s.y + 14, s.z + zz, s.x + 10, s.y + 14, s.z + zz, gl); }
      }
    }
    SB.end();
    // the black under them (structures keyed; enemies every frame)
    this._layBoxes(structs, enemies);
    // ---- the live things
    const D = this.dynBatch;
    D.begin();
    for (const e of enemies) {
      if (!e.alive) continue;
      const M = MODELS[e.kind] || MODELS.slow;
      const c = Math.cos(e.heading), s = Math.sin(e.heading);
      const eb = view && view.hover && view.hover === e.id ? 1.25 : P.enemyBright;
      for (const q of M) D.seg(e.x + q[0] * c - q[2] * s, e.y + q[1], e.z + q[0] * s + q[2] * c, e.x + q[3] * c - q[5] * s, e.y + q[4], e.z + q[3] * s + q[5] * c, eb);
    }
    for (const m of (view && view.missiles) || []) {
      if (!m.alive) continue;
      const c = Math.cos(m.heading), s = Math.sin(m.heading), cp = Math.cos(m.pitch), sp = Math.sin(m.pitch);
      // model forward is -z; tilt by pitch about x, then yaw
      for (const q of MISSILE) {
        const a = [q[0], q[1] * cp - q[2] * sp, q[1] * sp + q[2] * cp], b = [q[3], q[4] * cp - q[5] * sp, q[4] * sp + q[5] * cp];
        D.seg(m.x + a[0] * c - a[2] * s, m.y + a[1], m.z + a[0] * s + a[2] * c, m.x + b[0] * c - b[2] * s, m.y + b[1], m.z + b[0] * s + b[2] * c, 1.4);
      }
      // exhaust: a flicker behind it
      const f = T.forward(m.heading);
      const fl = 3 + this._rand() * 5;
      D.seg(m.x - f[0] * cp * 3, m.y - sp * 3, m.z - f[1] * cp * 3, m.x - f[0] * cp * (3 + fl), m.y - sp * (3 + fl), m.z - f[1] * cp * (3 + fl), 1.2 + this._rand() * 0.8);
    }
    // the tracer (2026-09-09, James: "a bit easier to see"): a bright head — a small star
    // across the line of flight — and a tail in three fading steps, 0.12 s long
    const tracer = (sh, b) => {
      const vl = Math.hypot(sh.vx, sh.vy, sh.vz) || 1;
      const ux = sh.vx / vl, uy = sh.vy / vl, uz = sh.vz / vl;
      // two directions across the flight line
      let ax = -uz, ay = 0, az = ux; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
      const bx = uy * az - uz * ay, by = uz * ax - ux * az, bz = ux * ay - uy * ax;
      const r = 2.6;
      D.seg(sh.x - ax * r, sh.y - ay * r, sh.z - az * r, sh.x + ax * r, sh.y + ay * r, sh.z + az * r, b * 1.5);
      D.seg(sh.x - bx * r, sh.y - by * r, sh.z - bz * r, sh.x + bx * r, sh.y + by * r, sh.z + bz * r, b * 1.5);
      D.seg(sh.x, sh.y, sh.z, sh.x - sh.vx * 0.03, sh.y - sh.vy * 0.03, sh.z - sh.vz * 0.03, b * 1.3);
      D.seg(sh.x - sh.vx * 0.03, sh.y - sh.vy * 0.03, sh.z - sh.vz * 0.03, sh.x - sh.vx * 0.07, sh.y - sh.vy * 0.07, sh.z - sh.vz * 0.07, b * 0.7);
      D.seg(sh.x - sh.vx * 0.07, sh.y - sh.vy * 0.07, sh.z - sh.vz * 0.07, sh.x - sh.vx * 0.12, sh.y - sh.vy * 0.12, sh.z - sh.vz * 0.12, b * 0.3);
    };
    for (const sh of (view && view.shells) || []) tracer(sh, 2.4);
    if (view && view.shell) tracer(view.shell, 2.4);   // (the old single-shell view still draws)
    for (const sh of (view && view.eshells) || []) tracer(sh, 1.7);
    // THE SOLUTION (2026-09-09): the arc the shell would fly, as dashes from the muzzle out,
    // the landing mark where it comes down (a diamond flat on the ground, a post through it,
    // a box in the air when it meets metal), and a ghost outline where each moving hull
    // will stand when the shell gets there — the amber on the crosshair is the same answer
    const sol = view && view.solution;
    if (sol && P.arcBright > 0 && !view.dead) {
      const A = sol.arc, n = A.length;
      for (let i = 1; i < n - 1; i++) {
        const a = A[i], c = A[i + 1];
        const f = 1 - i / n;
        D.seg(a[0], a[1], a[2], a[0] + (c[0] - a[0]) * 0.55, a[1] + (c[1] - a[1]) * 0.55, a[2] + (c[2] - a[2]) * 0.55, P.arcBright * (0.7 + 0.9 * f));
      }
      const im = sol.impact;
      if (im && im.what !== 'none') {
        const hot = im.what === 'enemy' || im.what === 'structure' || im.what === 'missile';
        const pulse = hot ? 1.6 + 0.5 * Math.sin(this.time * 9) : 1.1;
        const b = P.arcBright * pulse;
        const rr = Math.max(7, im.range * 0.012);   // the mark keeps a size on screen out to any range
        if (im.what === 'ground') {
          const gy = im.y + 0.6, r = rr;
          D.seg(im.x - r, gy, im.z, im.x, gy, im.z - r, b); D.seg(im.x, gy, im.z - r, im.x + r, gy, im.z, b);
          D.seg(im.x + r, gy, im.z, im.x, gy, im.z + r, b); D.seg(im.x, gy, im.z + r, im.x - r, gy, im.z, b);
          D.seg(im.x, gy, im.z, im.x, gy + rr * 0.8, im.z, b * 0.8);
        } else {
          const r = Math.max(4, rr * 0.6);
          for (const [dx, dz] of [[-r, -r], [r, -r], [r, r], [-r, r]]) D.seg(im.x + dx, im.y - r, im.z + dz, im.x + dx, im.y + r, im.z + dz, b);
          for (const y of [im.y - r, im.y + r]) { D.seg(im.x - r, y, im.z - r, im.x + r, y, im.z - r, b); D.seg(im.x + r, y, im.z - r, im.x + r, y, im.z + r, b); D.seg(im.x + r, y, im.z + r, im.x - r, y, im.z + r, b); D.seg(im.x - r, y, im.z + r, im.x - r, y, im.z - r, b); }
        }
      } else if (im) {
        // the shell dies in the air out here: a faint bar at the end of the arc
        D.seg(im.x - 6, im.y, im.z, im.x + 6, im.y, im.z, P.arcBright * 0.4);
      }
      if (P.leadBright > 0) for (const ld of sol.leads || []) {
        if (!ld.moving) continue;
        const ch = Math.cos(ld.heading), sh = Math.sin(ld.heading);
        const hw = ld.width / 2, hl = ld.length / 2, gy = ld.y + 0.5;
        const c = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([x, z]) => [ld.x + x * ch + z * sh, ld.z + x * sh - z * ch]);
        const b = P.leadBright;
        for (let i = 0; i < 4; i++) { const a = c[i], d = c[(i + 1) % 4]; D.seg(a[0], gy, a[1], d[0], gy, d[1], b); }
        D.seg(ld.x, gy, ld.z, ld.x, gy + ld.hullH, ld.z, b * 0.8);
        D.seg(ld.x - 3, gy + ld.hullH, ld.z, ld.x + 3, gy + ld.hullH, ld.z, b * 0.8);
      }
    }
    // effects
    for (const e of this.effects) {
      const fade = 1 - e.age / e.life;
      if (e.kind === 'debris') {
        const c = Math.cos(e.ang), sn = Math.sin(e.ang), q = e.seg;
        D.seg(e.x + q[0] * c - q[2] * sn, e.y + q[1], e.z + q[0] * sn + q[2] * c, e.x + q[3] * c - q[5] * sn, e.y + q[4], e.z + q[3] * sn + q[5] * c, 0.3 + fade * 0.7);
      } else if (e.kind === 'dust') {
        if (e.settled) { D.seg(e.x, e.y, e.z, e.x + 1.2, e.y, e.z, 0.45 * fade); continue; }
        const l = Math.hypot(e.vx, e.vy, e.vz) || 1;
        D.seg(e.x, e.y, e.z, e.x + e.vx / l * e.len, e.y + e.vy / l * e.len, e.z + e.vz / l * e.len, 0.8 * fade);
      } else if (e.kind === 'ring') {
        if (e.age < 0) continue;
        const u = e.age / e.life;
        const r = e.r0 + (e.r1 - e.r0) * (1 - Math.pow(1 - u, 2.2));
        const b = e.b * (1 - u) * (1 - u);
        const n = 32;
        for (let i = 0; i < n; i++) {
          const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
          D.seg(e.x + Math.cos(a0) * r, e.y, e.z + Math.sin(a0) * r, e.x + Math.cos(a1) * r, e.y, e.z + Math.sin(a1) * r, b);
        }
      } else {
        D.seg(e.x, e.y, e.z, e.x - e.vx * 0.03, e.y - e.vy * 0.03, e.z - e.vz * 0.03, e.bright * fade);
      }
    }
    for (const p of this.particles) {
      const fade = 1 - p.age / p.life;
      D.seg(p.x, p.y, p.z, p.x - p.vx * 0.012, p.y - p.vy * 0.012, p.z - p.vz * 0.012, p.b * fade * fade);
    }
    D.end();
    // ---- the foreground: your own gun out of the slit, and the beam
    const G = this.gunBatch;
    G.begin();
    if (t && !view.dead && this.scopeShown < 0.6) {
      // the gun's own frame (x right, y up, -z along the GUN): the barrel points
      // where the turret points, not where the eye looks, so the muzzle drifts
      // across the view while the turret catches up (the lag you can see)
      const gy = t.turret === undefined ? t.heading : t.turret, gpch = t.gunPitch === undefined ? t.pitch : t.gunPitch;
      this._gunM = this._gunM || new THREE.Matrix4();
      this._gunE = this._gunE || new THREE.Euler(0, 0, 0, 'YXZ');
      this._gunE.set(gpch, -gy, 0, 'YXZ');
      this._gunM.makeRotationFromEuler(this._gunE).setPosition(t.x, t.y + T.TANK.eye, t.z);
      const m = this._gunM;
      const cs = (x, y, z) => { const v = this._v.set(x, y, z).applyMatrix4(m); return [v.x, v.y, v.z]; };
      const rc = (t.recoil || 0) * 1.2;
      const gb = P.gunBright * (1 - this.scopeShown / 0.6);
      // THE BARREL (2026-09-09): a real gun in perspective — the barrel axis runs
      // muzzleDown under the eye and parallel to the gun line, from a mantlet block at
      // 4 ft (just below the frame) to the muzzle brake at muzzleAhead, so it rises from
      // the bottom of the screen to a point under the crosshair and the arc leaves its
      // mouth. Eight-sided tube, tapering; rings at the joints; range ticks on the top
      // rail; slotted brake. Recoil slides the whole gun back.
      const T2 = this._core();
      const yA = -T2.SHELL.muzzleDown, ZM = T2.SHELL.muzzleAhead;
      const ringAt = (z, r) => { const out = []; for (let i = 0; i < 8; i++) { const a = Math.PI * 2 * i / 8 + Math.PI / 8; out.push(cs(Math.cos(a) * r, yA + Math.sin(a) * r, -(z - rc))); } return out; };
      const drawRing = (R, b) => { for (let i = 0; i < 8; i++) { const a = R[i], c = R[(i + 1) % 8]; G.seg(a[0], a[1], a[2], c[0], c[1], c[2], b); } };
      const joinRings = (R0, R1, b, every) => { for (let i = 0; i < 8; i += every || 1) { const a = R0[i], c = R1[i]; G.seg(a[0], a[1], a[2], c[0], c[1], c[2], b); } };
      // the collar: a double ring where the tube leaves the turret, low in the frame
      const C0 = ringAt(6.2, 0.34), C1 = ringAt(6.7, 0.34);
      drawRing(C0, gb * 0.9); drawRing(C1, gb * 1.0); joinRings(C0, C1, gb * 0.8);
      // the tube: sections 6.7 → 9.5 → 12.5 → 14.9, thinning
      const R0 = ringAt(6.7, 0.3), R1 = ringAt(9.5, 0.29), R2 = ringAt(12.5, 0.28), R3 = ringAt(14.9, 0.27);
      drawRing(R0, gb * 1.0); drawRing(R1, gb * 0.9); drawRing(R2, gb * 0.9); drawRing(R3, gb * 1.0);
      joinRings(C1, R0, gb * 0.7, 2); joinRings(R0, R1, gb * 0.85); joinRings(R1, R2, gb * 0.8); joinRings(R2, R3, gb * 0.8);
      // the brake: a fatter sleeve at the mouth with a slot either side
      const B0 = ringAt(14.9, 0.34), B1 = ringAt(ZM, 0.34), B2 = ringAt(ZM, 0.24);
      drawRing(B0, gb * 1.2); drawRing(B1, gb * 1.3); drawRing(B2, gb * 1.3); joinRings(B0, B1, gb * 1.0, 2);
      for (const sx of [-1, 1]) for (const z of [15.25, 15.65]) { const a = cs(sx * 0.34, yA + 0.12, -(z - rc)), c = cs(sx * 0.34, yA - 0.12, -(z - rc)); G.seg(a[0], a[1], a[2], c[0], c[1], c[2], gb * 1.2); }
      // range ticks along the top rail
      for (const z of [8, 9.5, 11, 12.5, 14]) { const r = z <= 9.5 ? 0.3 : z <= 12.5 ? 0.29 : 0.28; const a = cs(0, yA + r, -(z - rc)), c = cs(0, yA + r + (z === 11 ? 0.3 : 0.16), -(z - rc)); G.seg(a[0], a[1], a[2], c[0], c[1], c[2], gb * 1.1); }
    }
    if (view && view.beam) {
      const b = view.beam;
      const fade = 1 - b.age / T.LASER.beamLife;
      G.seg(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, 2.6 * fade + 0.4);
      // a lick of sparks at the far end
      if (b.age < 0.03) for (let i = 0; i < 12; i++) this._spark(b.x1, b.y1, b.z1, 20 + this._rand() * 40, 0.5, 1.2);
    }
    G.end();

    // ---- uniforms (COPY of the lander's sizing) and the chain
    const scale = this.ph / 1080;
    const width = Math.max(1.0, P.lineWeight * scale);
    const gain = P.brightness * (1 + this.flash * 0.5) * (view && view.dead ? Math.max(0.35, 1 - this.deathT * 0.5) : 1);
    const wNear = Math.max(0.3, P.weightNear), wFar = Math.max(0.2, P.weightFar);
    for (const b of this.worldBatches) {
      const u = b.mat.uniforms;
      u.uWidth.value = width;
      u.uHalf.value = width * Math.max(1, wNear) * 0.5 + width * 2.0 + 1.5;
      u.uGain.value = gain;
      u.uNear.value = cam.near + 0.05;
      u.uFogA.value = P.fogNear; u.uFogB.value = P.fogFar;
      u.uNearA.value = 40; u.uNearB.value = Math.max(80, P.weightRange);
      u.uWNear.value = wNear; u.uWFar.value = wFar; u.uBNear.value = Math.max(0.5, P.nearWhite);
    }
    // the skylines, stars and ridges keep a flat weight (they are the far); the gun is near
    for (const b of [this.skyBatch, this.skyFarBatch, this.starBatch, this.ridgeBatch]) { b.mat.uniforms.uWNear.value = wFar; b.mat.uniforms.uWFar.value = wFar; b.mat.uniforms.uBNear.value = 1; }
    // the skylines and stars sit past the fog: no fade (their brightness is authored)
    for (const b of [this.skyBatch, this.skyFarBatch, this.starBatch]) { b.mat.uniforms.uFogA.value = 1e8; b.mat.uniforms.uFogB.value = 1e9; }
    this.dynBatch.mat.uniforms.uGain.value = 1 + this.flash * 0.5;
    this.gunBatch.mat.uniforms.uGain.value = 1 + this.flash * 0.5;
    this.gunBatch.mat.uniforms.uFogA.value = 1e8; this.gunBatch.mat.uniforms.uFogB.value = 1e9;

    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(this.scene, this.camera);

    this.brightMat.uniforms.tSrc.value = this.sceneRT.texture;
    this.quad.material = this.brightMat;
    r.setRenderTarget(this.bloomRT[0][0]);
    r.render(this.quadScene, this.quadCam);
    for (let i = 0; i < this.bloomRT.length; i++) {
      const rt = this.bloomRT[i];
      if (i > 0) {
        this.blurMat.uniforms.tSrc.value = this.bloomRT[i - 1][0].texture;
        this.blurMat.uniforms.uDir.value.set(0, 0);
        this.quad.material = this.blurMat;
        r.setRenderTarget(rt[0]);
        r.render(this.quadScene, this.quadCam);
      }
      const bw = rt[0].width, bh = rt[0].height;
      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tSrc.value = rt[0].texture;
      this.blurMat.uniforms.uDir.value.set(1 / bw, 0);
      r.setRenderTarget(rt[1]);
      r.render(this.quadScene, this.quadCam);
      this.blurMat.uniforms.tSrc.value = rt[1].texture;
      this.blurMat.uniforms.uDir.value.set(0, 1 / bh);
      r.setRenderTarget(rt[0]);
      r.render(this.quadScene, this.quadCam);
    }
    const cu = this.compMat.uniforms;
    cu.tScene.value = this.sceneRT.texture;
    cu.tB0.value = this.bloomRT[0][0].texture;
    cu.uGlow.value = P.glow;
    // the recoil is a pulse in the glow, never a camera move (item 7)
    cu.uFlash.value = this.flash * 0.3 + ((view && view.flash) || 0) + (t && t.recoil ? t.recoil * 0.09 : 0);
    cu.uTint.value.setHSL(P.hue, 1, 0.5).lerp(new THREE.Color(1, 1, 1), 1 - P.saturation);
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  // where the gun points, on screen (the lagging reticle): a point 1,000 ft down the barrel
  gunReticle(t, out) {
    const T = this._core();
    const gy = t.turret === undefined ? t.heading : t.turret, gpch = t.gunPitch === undefined ? t.pitch : t.gunPitch;
    const f = T.forward(gy), cp = Math.cos(gpch), sp = Math.sin(gpch);
    return this.projectToScreen(t.x + f[0] * cp * 1000, t.y + T.TANK.eye + sp * 1000, t.z + f[1] * cp * 1000, out);
  }
  // world → screen, for DOM tags
  projectToScreen(x, y, z, out) {
    const v = this._v.set(x, y, z).project(this.camera);
    out = out || {};
    out.x = (v.x * 0.5 + 0.5) * this.w;
    out.y = (1 - (v.y * 0.5 + 0.5)) * this.h;
    out.on = v.z < 1 && v.z > -1 && out.x >= 0 && out.x <= this.w && out.y >= 0 && out.y <= this.h;
    return out;
  }
  dispose() { this.renderer.dispose(); }
}
