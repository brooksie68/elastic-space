// Battle for the Moon 2075 — the TANK renderer.
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
// batches are untouched by default.
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
  gridBright: 0.28,   // the ground grid
  gridPitch: 100,     // ft between grid lines
  traceBright: 0.5,   // the flight line: the path the lander flew, drawn on the ground
  fogNear: 500,       // ft: ground lines start fading here
  fogFar: 2600,       // ft: ...and are at 25% here
  skyBright: 0.55,    // the far skyline
  skyFarBright: 0.38, // the farther skyline
  civBright: 0.62,    // civilian structures (the lander's flight-line value)
  hostBright: 0.85,   // hostile structures (the lander's flight-line value)
  enemyBright: 0.95,  // enemy tanks
  gunBright: 0.5,     // your own gun in the foreground
  slopePitch: 0.6,    // how much of the ground's pitch the view takes (eased)
};

const PIXEL_BUDGET = 2.9e6;
const MAX_PARTICLES = 2600;
const CHUNK_W = 4000;
const SKY_R = 7000, SKY_FAR_R = 11000, STAR_R = 14000, SKY_FLOOR = -4000;
const GROUND_HALF = 2400;   // ft: the ground mesh + grid extend this far around the tank
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
  uniform float uFogA;
  uniform float uFogB;
  varying vec2 vP;
  varying vec2 vS0;
  varying vec2 vS1;
  varying float vBright;
  void main() {
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
  uniform float uFogA;
  uniform float uFogB;
  uniform float uNear;
  varying vec2 vP;
  varying vec2 vS0;
  varying vec2 vS1;
  varying float vBright;
  void main() {
    vec4 v0 = modelViewMatrix * vec4(aP0, 1.0);
    vec4 v1 = modelViewMatrix * vec4(aP1, 1.0);
    float zn = -uNear;
    if (v0.z > zn && v1.z > zn) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vBright = 0.0; vP = vec2(0.0); vS0 = vec2(0.0); vS1 = vec2(1.0, 0.0); return; }
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
    vP = p; vS0 = s0; vS1 = s1; vBright = aBright * mix(0.25, 1.0, fog);
    gl_Position = vec4(p / (uRes * 0.5) * cb.w, cb.z, cb.w);
  }
`;
const LINE_FRAG = `
  precision highp float;
  varying vec2 vP;
  varying vec2 vS0;
  varying vec2 vS1;
  varying float vBright;
  uniform float uWidth;
  uniform float uGain;
  void main() {
    vec2 ab = vS1 - vS0;
    float l2 = dot(ab, ab);
    float t = l2 > 1e-6 ? clamp(dot(vP - vS0, ab) / l2, 0.0, 1.0) : 0.0;
    float d = length(vP - (vS0 + ab * t));
    float core = 1.0 - smoothstep(uWidth * 0.5 - 0.9, uWidth * 0.5 + 0.9, d);
    float halo = exp(-d / (uWidth * 0.9)) * 0.05;
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
    this.starBatch = new LineBatch(1400, 0, { depth: true });
    this.skyFarFill = new GroundFill(1, SKY_FLOOR, true);
    this.skyFarBatch = new LineBatch(400, 2, { depth: true });
    this.skyFill = new GroundFill(3, SKY_FLOOR, true);
    this.skyBatch = new LineBatch(400, 4, { depth: true });
    this.groundMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    this.groundMesh.frustumCulled = false; this.groundMesh.renderOrder = 5;
    this.groundBatch = new LineBatch(26000, 6, { depth: true });
    this.boxMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    this.boxMesh.frustumCulled = false; this.boxMesh.renderOrder = 7;
    this.structBatch = new LineBatch(12000, 8, { depth: true });
    this.dynBatch = new LineBatch(9000, 9, { depth: true });
    this.gunBatch = new LineBatch(600, 10);   // no depth: always in front
    for (const m of [this.starBatch.mesh, this.skyFarFill.mesh, this.skyFarBatch.mesh, this.skyFill.mesh, this.skyBatch.mesh, this.groundMesh, this.groundBatch.mesh, this.boxMesh, this.structBatch.mesh, this.dynBatch.mesh, this.gunBatch.mesh]) this.scene.add(m);
    this.worldBatches = [this.starBatch, this.skyFarBatch, this.skyBatch, this.groundBatch, this.structBatch, this.dynBatch, this.gunBatch];
    this.world = null;
    this.stars = [];
    this.skyPts = null; this.skyFarPts = null;
    this.groundCentre = null;
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
    const before = { stars: this.params.stars, gridPitch: this.params.gridPitch, gridBright: this.params.gridBright, traceBright: this.params.traceBright, skyBright: this.params.skyBright, skyFarBright: this.params.skyFarBright };
    Object.assign(this.params, p);
    for (const k of Object.keys(before)) if (before[k] !== this.params[k]) { this.groundCentre = null; this.skyPts = null; }
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
    this.effects.length = 0; this.particles.length = 0;
    this.rubble = {};
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
  _laySky(cx, cz, baseY) {
    if (!this.skyH) this._buildSky();
    const P = this.params;
    const lay = (hs, R, batch, fill, bright) => {
      const pts = [];
      const n = hs.length;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 2 * i / n;
        pts.push([cx + Math.cos(a) * R, baseY + hs[i % n], cz + Math.sin(a) * R]);
      }
      batch.begin();
      for (let i = 1; i < pts.length; i++) batch.seg(pts[i - 1][0], pts[i - 1][1], pts[i - 1][2], pts[i][0], pts[i][1], pts[i][2], bright);
      batch.end();
      fill.set3(pts);
    };
    lay(this.skyH, SKY_R, this.skyBatch, this.skyFill, P.skyBright);
    lay(this.skyFarH, SKY_FAR_R, this.skyFarBatch, this.skyFarFill, P.skyFarBright);
    const S = this.starBatch;
    S.begin();
    if (P.stars > 0) for (const s of this.stars) {
      const x = cx + s[0] * STAR_R, y = baseY + s[1] * STAR_R, z = cz + s[2] * STAR_R;
      S.seg(x, y, z, x, y, z, s[3] * P.stars * 3.2);
    }
    S.end();
    this.skyPts = [cx, cz];
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
    // the grid: lines every gridPitch ft both ways, laid exactly along the
    // mesh's own rows and columns (same samples), lifted 0.6 ft, so a line
    // is always on its surface — never under a chord of it
    const B = this.groundBatch;
    B.begin();
    const pitch = Math.max(cell, Math.round(P.gridPitch / cell) * cell);
    const gb = P.gridBright;
    const yAt = (i, j) => pos[(j * n + i) * 3 + 1] + 1.1;
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
    // the flight line: the path the lander flew, along z = 0 (a mesh row)
    if (P.traceBright > 0 && z0 <= 0 && z0 + (n - 1) * cell >= 0) {
      const j = Math.round(-z0 / cell);
      for (let i = 1; i < n; i++) B.seg(x0 + (i - 1) * cell, yAt(i - 1, j) + 0.2, 0, x0 + i * cell, yAt(i, j) + 0.2, 0, P.traceBright);
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
  _rubbleFor(id) {
    if (this.rubble[id]) return this.rubble[id];
    const segs = globalThis.LunarStructures.solid(id) || [];
    const out = [];
    let i = 0;
    for (const q of segs) {
      if ((i++ % 3) !== 0) continue;
      const j = () => (this._rand() - 0.5) * 6;
      out.push([q[0] + j(), q[1] * 0.12 + 1, q[2] + j(), q[3] + j(), q[4] * 0.12 + 1, q[5] + j()]);
    }
    this.rubble[id] = out;
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
  // view: { tank: {x,y,z,heading,pitch,recoil,alive}, enemies, missiles, eshells, shell, beam,
  //         structures: [placed structures near the tank], dead: bool, deadT: s, flash }
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
      let gp = 0, gr = 0;
      if (this.world) {
        gp = -Math.atan(T.slopeAlong(this.world, t.x, t.z, t.heading)) * P.slopePitch;
        gr = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, Math.atan(T.slopeAlong(this.world, t.x, t.z, t.heading + Math.PI / 2)) * 0.5));
      }
      const k = 1 - Math.exp(-dt / PITCH_TAU);
      this.pitchShown += (gp - this.pitchShown) * k;
      this.rollShown += (gr - this.rollShown) * k;
      // death: the view sags forward and down, slowly
      let dead = 0;
      if (view.dead) { this.deathT += dt; dead = 1 - Math.exp(-this.deathT / 1.1); } else this.deathT = 0;
      cam.position.set(t.x, eye - dead * 4, t.z);
      cam.rotation.set(t.pitch + this.pitchShown - dead * 0.32, -t.heading, this.rollShown + dead * 0.06, 'YXZ');
      cam.fov = P.tankFov;
      cam.near = 1.5; cam.far = 40000;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      // ---- the static layers follow the tank in big steps
      if (!this.groundCentre || Math.hypot(t.x - this.groundCentre[0], t.z - this.groundCentre[1]) > GROUND_REBUILD) this._layGround(t.x, t.z);
      if (!this.skyPts || Math.hypot(t.x - this.skyPts[0], t.z - this.skyPts[1]) > 200) this._laySky(t.x, t.z, this.world ? T.baseAt(this.world, t.x) : 0);
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
      const segs = s.alive ? ST.solid(s.id) : this._rubbleFor(s.id);
      if (!segs) continue;
      let b = s.alive ? (s.cls === 'civ' ? P.civBright : P.hostBright) : 0.32;
      // a hostile that has just been hit flickers; a bunker's open door shows as a lit frame
      for (const q of segs) SB.seg(s.x + q[0], s.y + q[1], s.z + q[2], s.x + q[3], s.y + q[4], s.z + q[5], b);
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
      const eb = P.enemyBright * (e.hitT > 0 ? 1.8 : 1);
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
    const tracer = (sh, b, len) => D.seg(sh.x, sh.y, sh.z, sh.x - sh.vx * len, sh.y - sh.vy * len, sh.z - sh.vz * len, b);
    if (view && view.shell) tracer(view.shell, 2.2, 0.035);
    for (const sh of (view && view.eshells) || []) tracer(sh, 1.7, 0.03);
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
    if (t && !view.dead) {
      // camera space (x right, y up, -z forward) → world through the camera matrix
      const m = cam.matrixWorld;
      const cs = (x, y, z) => { const v = this._v.set(x, y, z).applyMatrix4(m); return [v.x, v.y, v.z]; };
      const rc = (t.recoil || 0) * 1.2;
      const gb = P.gunBright;
      // only the last stretch of the barrel shows out of the slit: two rails
      // from 9 ft out to a small muzzle ring at 15, low under the crosshair.
      // (A full barrel from the eye read as a giant V — the eye is too close.)
      const L = 15 - rc, y0 = -1.72, y1 = -1.55;
      const p = [cs(-0.3, y0, -9 + rc), cs(-0.26, y1, -L), cs(0.3, y0, -9 + rc), cs(0.26, y1, -L)];
      G.seg(p[0][0], p[0][1], p[0][2], p[1][0], p[1][1], p[1][2], gb);
      G.seg(p[2][0], p[2][1], p[2][2], p[3][0], p[3][1], p[3][2], gb);
      const ring = [];
      for (let i = 0; i < 10; i++) { const a = Math.PI * 2 * i / 10; ring.push(cs(Math.cos(a) * 0.3, y1 + Math.sin(a) * 0.3, -L)); }
      for (let i = 0; i < 10; i++) { const a = ring[i], b = ring[(i + 1) % 10]; G.seg(a[0], a[1], a[2], b[0], b[1], b[2], gb * 1.15); }
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
    for (const b of this.worldBatches) {
      b.mat.uniforms.uWidth.value = width;
      b.mat.uniforms.uHalf.value = width * 0.5 + width * 2.0 + 1.5;
      b.mat.uniforms.uGain.value = gain;
      b.mat.uniforms.uNear.value = cam.near + 0.05;
      b.mat.uniforms.uFogA.value = P.fogNear; b.mat.uniforms.uFogB.value = P.fogFar;
    }
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
    cu.uFlash.value = this.flash * 0.3 + ((view && view.flash) || 0);
    cu.uTint.value.setHSL(P.hue, 1, 0.5).lerp(new THREE.Color(1, 1, 1), 1 - P.saturation);
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
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
