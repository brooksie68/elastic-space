// Asteroids — the renderer.
//
// Pure presentation: no game rules, no DOM, no audio, no input. game.js drives
// it in the world; tmp/asteroids/lookdev.html drives it silently for look
// development (that harness is where the picture gets judged before it flies).
//
// One register, the Retro arcade's: single-weight lines, green to white,
// glowing on black. Lines MAX-blend (a crossing never stacks brighter), a
// tight glow softens the edge, and that is the whole finish — no scanlines, no
// curve, no grain, no persistence smear. The camera is fixed and frames the
// whole field: no chase, no shake, ever. The field IS the window: the core's
// torus is H = 750 tall and follows the window's aspect, so wrapping happens
// at the screen edges. Anything within its radius of an edge is drawn again
// on the far side, so nothing pops at the seam.
//
// The rocks are wireframe solids: an outline over a black fill (so a rock
// hides what is behind it and the stars) with a few interior crease lines,
// spinning in the plane. They break along their strokes. The ship is a
// drawing — dimmer than the rocks, a 2036 dart, a plume when it burns — and
// its strokes drift apart when it dies. Two star layers sit deep behind
// everything; the stars are never in front of anything.
import * as THREE from 'three';

// ---- tunables (every one is live) ------------------------------------------------------
export const DEFAULT_PARAMS = {
  hue: 0.36,          // 0.36 green, 0.5 cyan, 0.08 amber
  saturation: 0.7,    // 0 = white
  glow: 0.9,          // bloom strength
  lineWeight: 1.7,    // core width, px at 1080p
  brightness: 1.0,    // the world's lines
  shipBright: 0.8,    // the ship (dimmer than the rocks, by direction)
  rockBright: 1.0,
  crease: 0.4,        // interior facet lines, as a share of the outline
  stars: 1.0,         // star brightness
  starDepth: 1.0,     // how deep the two star layers sit (parallax scale)
  plume: 1.0,         // thrust particles
  fragments: 1.0,     // how far the pieces fly
  res: 1.0,           // render scale
};

const PIXEL_BUDGET = 2.9e6;
const FOV = 30;
const MAX_PARTICLES = 3000;
const MAX_FRAGMENTS = 400;
const Z_STARS_NEAR = -1400, Z_STARS_FAR = -3600;
const SHIP_SCALE = 1.2;   // the drawing is a touch larger than the core's hull: rocks may brush the wingtips and miss

// ---- the line batch (screen-space quads with a soft core, MAX blended) ----------------------
const LINE_VERT = `
  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec2 aCorner;
  attribute float aBright;
  uniform vec2 uRes;
  uniform float uHalf;
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
    vP = p; vS0 = s0; vS1 = s1; vBright = aBright;
    gl_Position = vec4(p / (uRes * 0.5), 0.0, 1.0);
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
  constructor(max, order) {
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
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
      uniforms: { uRes: { value: new THREE.Vector2(2, 2) }, uHalf: { value: 3 }, uWidth: { value: 2 }, uGain: { value: 1 } },
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: false,
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
  seg2(x0, y0, x1, y1, b) { this.seg(x0, y0, 0, x1, y1, 0, b); }
  loop2(pts, b, dx, dy) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      this.seg(p[0] + dx, p[1] + dy, 0, q[0] + dx, q[1] + dy, 0, b);
    }
  }
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

// Black fills: triangle fans (rocks, the ship's body, the derelict), drawn
// opaque before the lines so a solid hides what is behind it.
class FillBatch {
  constructor(maxTris, order, grey) {
    this.max = maxTris;
    this.count = 0;
    this.pos = new Float32Array(maxTris * 9);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
    const c = grey || 0;
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c, c, c), transparent: false, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
  }
  begin() { this.count = 0; }
  tri(ax, ay, bx, by, cx, cy) {
    if (this.count >= this.max) return;
    const o = this.count++ * 9;
    this.pos[o] = ax; this.pos[o + 1] = ay; this.pos[o + 2] = 0;
    this.pos[o + 3] = bx; this.pos[o + 4] = by; this.pos[o + 5] = 0;
    this.pos[o + 6] = cx; this.pos[o + 7] = cy; this.pos[o + 8] = 0;
  }
  // a fan from (cx, cy) over a closed outline (star-shaped from its centre)
  fan(pts, cx, cy, dx, dy) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      this.tri(cx + dx, cy + dy, p[0] + dx, p[1] + dy, q[0] + dx, q[1] + dy);
    }
  }
  end() {
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.position.updateRanges = [{ start: 0, count: this.count * 9 }];
    this.geo.setDrawRange(0, this.count * 3);
  }
}

// ---- drawings (local coordinates: nose along +x, y up) --------------------------------------
// The ship: a 2036 dart. Hull, canopy, two engine ports. The core's collision
// triangle is nose (16, 0) and tails (-11, ±10); the drawing lands inside it.
export const SHIP_LINES = [
  [16, 0, -8, 10, 1], [-8, 10, -12, 6, 1], [-12, 6, -12, -6, 1], [-12, -6, -8, -10, 1], [-8, -10, 16, 0, 1],
  [7, 0, -1, 2.6, 0.62], [-1, 2.6, -1, -2.6, 0.62], [-1, -2.6, 7, 0, 0.62],
  [-12, 3.6, -14.5, 3.6, 0.8], [-12, -3.6, -14.5, -3.6, 0.8],
];
export const SHIP_BODY = [[16, 0], [-8, 10], [-12, 6], [-12, -6], [-8, -10]];

function saucerLines(r, small) {
  const L = [];
  const w = r, h = r * 0.36;
  // the lens
  L.push([-w, 0, -w * 0.45, h, 1], [-w * 0.45, h, w * 0.45, h, 1], [w * 0.45, h, w, 0, 1], [w, 0, w * 0.45, -h, 1], [w * 0.45, -h, -w * 0.45, -h, 1], [-w * 0.45, -h, -w, 0, 1]);
  L.push([-w, 0, w, 0, 0.5]);
  // the dome (a drone's sensor head)
  L.push([-w * 0.3, h, -w * 0.18, h * 2.1, 0.85], [-w * 0.18, h * 2.1, w * 0.18, h * 2.1, 0.85], [w * 0.18, h * 2.1, w * 0.3, h, 0.85]);
  if (!small) L.push([-w * 0.1, h * 1.4, w * 0.1, h * 1.4, 0.6]);   // the big one has a slit of a window
  // two feet
  L.push([-w * 0.5, -h, -w * 0.6, -h * 1.8, 0.7], [w * 0.5, -h, w * 0.6, -h * 1.8, 0.7]);
  return L;
}
const SAUCER_BIG = saucerLines(26, false), SAUCER_SMALL = saucerLines(14, true);

// The derelict: a long dead station drifting across. Hull, two rings, a spine, and
// the bay — the mouth you fly into. Local frame faces +x; the core mirrors by dir.
function hulkLines(H) {
  const L = [];
  const hw = H.w / 2, hh = H.h / 2;
  L.push([-hw, -hh, hw - 22, -hh, 0.55], [hw - 22, -hh, hw, 0, 0.55], [hw, 0, hw - 22, hh, 0.55], [hw - 22, hh, -hw, hh, 0.55], [-hw, hh, -hw, -hh, 0.55]);
  L.push([-hw + 6, 0, -hw - 26, 0, 0.4], [-hw - 26, -8, -hw - 26, 8, 0.4]);   // a stub of a mast
  for (const cx of [-hw + 42, hw - 60]) {
    const n = 14, r = hh + 8;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
      L.push([cx + Math.cos(a0) * r, Math.sin(a0) * r, cx + Math.cos(a1) * r, Math.sin(a1) * r, 0.45]);
    }
  }
  // a few dead panels
  L.push([-hw + 70, -hh, -hw + 70, hh, 0.3], [hw - 110, -hh, hw - 110, hh, 0.3], [-hw + 10, -hh + 10, -hw + 30, -hh + 10, 0.3]);
  return L;
}

// ---- post shaders ------------------------------------------------------------------------------
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
    vec3 col = uTint * lum;
    col = mix(col, vec3(lum), smoothstep(0.9, 2.2, lum) * 0.75);
    col = col / (1.0 + col * 0.25);
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

// ---- the scene ---------------------------------------------------------------------------------------
export class AsteroidsScene {
  constructor(canvas, params, Core) {
    this.params = Object.assign({}, DEFAULT_PARAMS, params || {});
    this.Core = Core;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1.78, 10, 20000);
    // draw order: stars → the derelict (fill, lines) → rock fills + the ship's body → every line
    this.starBatch = new LineBatch(1400, 0);
    this.hulkFill = new FillBatch(64, 0.5);
    this.hulkBatch = new LineBatch(400, 0.7);
    this.fillBatch = new FillBatch(2400, 1);
    this.bodyFill = new FillBatch(32, 1.1, 0.07);
    this.dynBatch = new LineBatch(9000, 2);
    this.shipBatch = new LineBatch(600, 3);
    for (const m of [this.starBatch.mesh, this.hulkFill.mesh, this.hulkBatch.mesh, this.fillBatch.mesh, this.bodyFill.mesh, this.dynBatch.mesh, this.shipBatch.mesh]) this.scene.add(m);
    this.lineBatches = [this.starBatch, this.hulkBatch, this.dynBatch, this.shipBatch];
    this.HULK_LINES = hulkLines(Core.HULK);
    this.fieldW = 1333; this.fieldH = 750;
    this.stars = null;
    this.starsKey = '';
    this.fragments = [];
    this.particles = [];
    this.rings = [];
    this.time = 0;
    this.flash = 0;
    this.rngState = 8675309;
    this.w = 2; this.h = 2; this.pw = 2; this.ph = 2;
    this._poly = [];
    this._v = new THREE.Vector3();
    this._buildPost();
    this.resize();
  }

  _rand() {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  _buildPost() {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(2, 2, opts);
    this.bloomRT = [new THREE.WebGLRenderTarget(2, 2, opts), new THREE.WebGLRenderTarget(2, 2, opts)];
    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.brightMat = mk(BRIGHT_FRAG, { tSrc: { value: null } });
    this.blurMat = mk(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.compMat = mk(COMP_FRAG, { tScene: { value: null }, tB0: { value: null }, uTint: { value: new THREE.Color(0.3, 1, 0.45) }, uGlow: { value: 1 }, uFlash: { value: 0 } });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.brightMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  setParams(p) {
    const before = this.params.starDepth;
    Object.assign(this.params, p);
    if (before !== this.params.starDepth) this.starsKey = '';
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
    this.renderer.setSize(pw, ph, false);
    this.sceneRT.setSize(pw, ph);
    const bw = Math.max(2, Math.floor(pw / 2)), bh = Math.max(2, Math.floor(ph / 2));
    this.bloomRT[0].setSize(bw, bh);
    this.bloomRT[1].setSize(bw, bh);
    for (const b of this.lineBatches) b.mat.uniforms.uRes.value.set(pw, ph);
    this.camera.aspect = w / h;
    this._fitCamera();
  }

  // The field fills the window exactly: the camera sits straight above the
  // plane's centre at the distance where the field's height fills the frame.
  _fitCamera() {
    const half = this.fieldH / 2;
    const dist = half / Math.tan(FOV * Math.PI / 360);
    this.camDist = dist;
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.starsKey = '';
  }

  setField(W, H) {
    if (W === this.fieldW && H === this.fieldH) return;
    this.fieldW = W; this.fieldH = H;
    this._fitCamera();
  }

  // ---- stars: two layers deep behind the plane, sized to cover the view at their depth -------
  _buildStars() {
    const key = this.fieldW + ':' + this.params.starDepth + ':' + this.camera.aspect.toFixed(3);
    if (key === this.starsKey) return;
    this.starsKey = key;
    this.rngState = 8675309;
    const B = this.starBatch;
    B.begin();
    // short segments: at these depths they draw as dots, not dashes
    const layers = [[Z_STARS_NEAR * this.params.starDepth, 300, 0.42, 0.12], [Z_STARS_FAR * this.params.starDepth, 520, 0.22, 0.08]];
    for (const [z, n, bright, len] of layers) {
      const hh = (this.camDist - z) * Math.tan(FOV * Math.PI / 360) * 1.05;
      const hw = hh * this.camera.aspect;
      const scale = (this.camDist - z) / this.camDist;   // world units per screen unit at this depth
      for (let i = 0; i < n; i++) {
        const x = (this._rand() * 2 - 1) * hw, y = (this._rand() * 2 - 1) * hh;
        const b = bright * (0.5 + this._rand() * 0.9) * this.params.stars;
        const l = len * scale * (0.6 + this._rand() * 0.8);
        B.seg(x - l, y, z, x + l, y, z, b);
      }
    }
    B.end();
  }

  // ---- effects -----------------------------------------------------------------------------------
  // A break: the outline's edges fly apart from the centre, carrying the rock's
  // drift, spinning down and fading; plus a spray of sparks.
  spawnRockBreak(e) {
    const Core = this.Core;
    const poly = Core.rockPoly({ size: e.size, shape: e.shape, a: e.a }, []);
    const R = Core.SIZE.R[e.size];
    const kick = (55 + 40 * (2 - e.size)) * this.params.fragments;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const d = Math.hypot(mx, my) || 1;
      this._fragment(e.x + mx, e.y + my, e.vx * 0.6 + mx / d * kick * (0.7 + this._rand() * 0.6), e.vy * 0.6 + my / d * kick * (0.7 + this._rand() * 0.6),
        [[p[0] - mx, p[1] - my, q[0] - mx, q[1] - my, 1]], 0.7 + this._rand() * 0.5, 1.0 * this.params.rockBright, (this._rand() - 0.5) * 4);
    }
    const n = 6 + e.size * 6;
    for (let i = 0; i < n; i++) {
      const a = this._rand() * Math.PI * 2, sp = (60 + this._rand() * 140) * (1 + e.size * 0.4);
      this._spark(e.x, e.y, e.vx * 0.4 + Math.cos(a) * sp, e.vy * 0.4 + Math.sin(a) * sp, 0.35 + this._rand() * 0.5, 1.6);
    }
    this.rings.push({ x: e.x, y: e.y, r0: R * 0.6, r1: R * 2.2, age: 0, life: 0.45, b: 0.9 });
  }
  // The ship's strokes drift apart. Slow, quiet — the 1979 death, drawn better.
  spawnShipDeath(e) {
    const c = Math.cos(e.a), s = Math.sin(e.a);
    for (const L of SHIP_LINES) {
      const p = [(L[0] * c - L[1] * s) * SHIP_SCALE, (L[0] * s + L[1] * c) * SHIP_SCALE], q = [(L[2] * c - L[3] * s) * SHIP_SCALE, (L[2] * s + L[3] * c) * SHIP_SCALE];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const d = Math.hypot(mx, my) || 1;
      const kick = 22 * this.params.fragments;
      this._fragment(e.x + mx, e.y + my, e.vx * 0.5 + mx / d * kick + (this._rand() - 0.5) * 14, e.vy * 0.5 + my / d * kick + (this._rand() - 0.5) * 14,
        [[p[0] - mx, p[1] - my, q[0] - mx, q[1] - my, L[4]]], 1.7 + this._rand() * 0.6, this.params.shipBright, (this._rand() - 0.5) * 2.2);
    }
    for (let i = 0; i < 14; i++) {
      const a = this._rand() * Math.PI * 2, sp = 30 + this._rand() * 90;
      this._spark(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5 + this._rand() * 0.7, 1.2);
    }
    this.flash = 0.35;
  }
  spawnSaucerBreak(e) {
    const L = e.size === 'small' ? SAUCER_SMALL : SAUCER_BIG;
    const kick = 60 * this.params.fragments;
    for (const q of L) {
      const mx = (q[0] + q[2]) / 2, my = (q[1] + q[3]) / 2;
      const d = Math.hypot(mx, my) || 1;
      this._fragment(e.x + mx, e.y + my, mx / d * kick * (0.6 + this._rand()), my / d * kick * (0.6 + this._rand()),
        [[q[0] - mx, q[1] - my, q[2] - mx, q[3] - my, q[4]]], 0.8 + this._rand() * 0.5, 1.1, (this._rand() - 0.5) * 5);
    }
    for (let i = 0; i < 18; i++) {
      const a = this._rand() * Math.PI * 2, sp = 60 + this._rand() * 160;
      this._spark(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + this._rand() * 0.5, 1.7);
    }
    this.rings.push({ x: e.x, y: e.y, r0: 10, r1: 90, age: 0, life: 0.5, b: 1.1 });
  }
  spawnHyper(x, y) {
    // the ship folds into a point: a ring collapsing
    this.rings.push({ x, y, r0: 40, r1: 2, age: 0, life: 0.35, b: 1.3 });
  }
  spawnReappear(x, y) { this.rings.push({ x, y, r0: 2, r1: 46, age: 0, life: 0.4, b: 1.3 }); }
  spawnOpen(x, y) { this.rings.push({ x, y, r0: 20, r1: 110, age: 0, life: 0.7, b: 1.0 }); }
  _fragment(x, y, vx, vy, segs, life, b, spin) {
    if (this.fragments.length >= MAX_FRAGMENTS) this.fragments.shift();
    this.fragments.push({ x, y, vx, vy, a: 0, spin, segs, life, age: 0, b });
  }
  _spark(x, y, vx, vy, life, b) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({ x, y, vx, vy, life, age: 0, b });
  }
  _plume(ship, dt) {
    const rate = 90 * dt * this.params.plume;
    const n = Math.floor(rate) + (this._rand() < rate % 1 ? 1 : 0);
    const c = Math.cos(ship.a), s = Math.sin(ship.a);
    for (let i = 0; i < n; i++) {
      const spread = (this._rand() - 0.5) * 0.7;
      const sp = 120 + this._rand() * 140;
      const dx = -Math.cos(ship.a + spread), dy = -Math.sin(ship.a + spread);
      this._spark(ship.x - c * 13 * SHIP_SCALE + (this._rand() - 0.5) * 3, ship.y - s * 13 * SHIP_SCALE + (this._rand() - 0.5) * 3, ship.vx + dx * sp, ship.vy + dy * sp, 0.18 + this._rand() * 0.22, 0.9);
    }
  }
  _stepEffects(dt) {
    const W = this.fieldW, H = this.fieldH;
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.age += dt;
      if (f.age >= f.life) { this.fragments.splice(i, 1); continue; }
      f.x = this.Core.wrap(f.x + f.vx * dt, W); f.y = this.Core.wrap(f.y + f.vy * dt, H);
      f.a += f.spin * dt;
      f.vx *= Math.exp(-0.5 * dt); f.vy *= Math.exp(-0.5 * dt);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      p.x = this.Core.wrap(p.x + p.vx * dt, W); p.y = this.Core.wrap(p.y + p.vy * dt, H);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      if (r.age >= r.life) this.rings.splice(i, 1);
    }
  }

  // ---- geometry helpers ------------------------------------------------------------------------
  // core (x right, y down from the top-left) → world (centred, y up)
  wx(x) { return x - this.fieldW / 2; }
  wy(y) { return this.fieldH / 2 - y; }
  // the wrap copies an object of radius r needs so nothing pops at the seam
  _copies(x, y, r, fn) {
    const W = this.fieldW, H = this.fieldH;
    const xs = [0], ys = [0];
    if (x < r) xs.push(W); else if (x > W - r) xs.push(-W);
    if (y < r) ys.push(H); else if (y > H - r) ys.push(-H);
    for (const dx of xs) for (const dy of ys) fn(dx, -dy);
  }
  // rotate a local drawing (nose +x, y up in local) into world: core angles turn
  // clockwise on screen (y down), so world = (cos, -sin)
  _placeLines(B, lines, x, y, a, scale, bright, r) {
    const c = Math.cos(a), s = -Math.sin(a);
    const X = this.wx(x), Y = this.wy(y);
    this._copies(x, y, r, (dx, dy) => {
      for (const L of lines) {
        const x0 = L[0] * scale, y0 = L[1] * scale, x1 = L[2] * scale, y1 = L[3] * scale;
        B.seg(X + dx + x0 * c - y0 * s, Y + dy + x0 * s + y0 * c, 0, X + dx + x1 * c - y1 * s, Y + dy + x1 * s + y1 * c, 0, bright * L[4]);
      }
    });
  }
  screenToWorld(px, py, out) {
    out = out || {};
    out.x = px / this.w * this.fieldW;
    out.y = py / this.h * this.fieldH;
    return out;
  }
  projectToScreen(x, y, out) {
    out = out || {};
    out.x = x / this.fieldW * this.w;
    out.y = y / this.fieldH * this.h;
    return out;
  }

  // ---- the frame ---------------------------------------------------------------------------------
  // view: { state, showShip }
  render(view, dt) {
    dt = Math.min(0.1, Math.max(0, dt || 0));
    this.time += dt;
    const P = this.params;
    const cw = window.innerWidth || this.canvas.clientWidth || 0;
    const chh = window.innerHeight || this.canvas.clientHeight || 0;
    if (cw > 2 && chh > 2 && (cw !== this.w || chh !== this.h)) this.resize(cw, chh);
    const state = view && view.state;
    if (state) this.setField(state.W, state.H);
    this._buildStars();
    this._stepEffects(dt);
    this.flash = Math.max(0, this.flash - dt * 2.0);

    const D = this.dynBatch, F = this.fillBatch, S = this.shipBatch, HF = this.hulkFill, HB = this.hulkBatch, BF = this.bodyFill;
    D.begin(); F.begin(); S.begin(); HF.begin(); HB.begin(); BF.begin();
    if (state) {
      const Core = this.Core;
      const W = state.W, H = state.H;
      const poly = this._poly;

      // the derelict
      if (state.hulk) {
        const h = state.hulk, HK = Core.HULK;
        const X = this.wx(h.x), Y = this.wy(h.y);
        const m = h.dir;   // mirror along x for the way it faces
        // the body: a black slab under the lines
        const hw = HK.w / 2, hh = HK.h / 2;
        HF.tri(X - hw * m, Y - hh, X + hw * m, Y - hh, X + hw * m, Y + hh);
        HF.tri(X - hw * m, Y - hh, X + hw * m, Y + hh, X - hw * m, Y + hh);
        for (const L of this.HULK_LINES) HB.seg(X + L[0] * m, Y + L[1], 0, X + L[2] * m, Y + L[3], 0, L[4]);
        // the bay: the mouth, lit from inside, breathing slowly
        const bx = X + HK.bay.x * m, by = Y - HK.bay.y;
        const bw = HK.bay.w / 2, bh = HK.bay.h / 2;
        const pulse = 0.75 + 0.25 * Math.sin(this.time * 1.6);
        HB.seg(bx - bw, by - bh, 0, bx + bw, by - bh, 0, 0.9);
        HB.seg(bx + bw, by - bh, 0, bx + bw, by + bh, 0, 0.9);
        HB.seg(bx + bw, by + bh, 0, bx - bw, by + bh, 0, 0.9);
        HB.seg(bx - bw, by + bh, 0, bx - bw, by - bh, 0, 0.9);
        for (let i = 1; i <= 3; i++) {
          const k = i / 4;
          HB.seg(bx - bw * (1 - k), by - bh * (1 - k), 0, bx + bw * (1 - k), by - bh * (1 - k), 0, 0.5 * pulse * (1 - k * 0.5));
          HB.seg(bx - bw * (1 - k), by + bh * (1 - k), 0, bx + bw * (1 - k), by + bh * (1 - k), 0, 0.5 * pulse * (1 - k * 0.5));
        }
        HB.seg(bx - bw * 0.5, by, 0, bx + bw * 0.5, by, 0, 1.3 * pulse);
      }

      // rocks: black fill, outline, creases; wrap copies
      for (const r of state.rocks) {
        Core.rockPoly(r, poly);
        for (const p of poly) p[1] = -p[1];   // core y down → world y up
        const R = Core.SIZE.R[r.size];
        const X = this.wx(r.x), Y = this.wy(r.y);
        const creases = Core.SHAPES[r.shape].creases;
        const ob = P.rockBright * (r.hollow && r.open ? 0.7 : 1);
        this._copies(r.x, r.y, R, (dx, dy) => {
          F.fan(poly, X, Y, dx, dy);
          D.loop2(poly, ob, X + dx, Y + dy);
          if (!(r.hollow && r.open) && r.size > 0) {
            for (const cr of creases) D.seg(X + dx + poly[cr[0]][0], Y + dy + poly[cr[0]][1], 0, X + dx + poly[cr[1]][0], Y + dy + poly[cr[1]][1], 0, ob * P.crease);
          }
          if (r.hollow) {
            if (!r.open) {
              // a glint: a small crystal inside, pulsing
              const g = 0.35 + 0.65 * Math.max(0, Math.sin(this.time * 2.3 + r.id));
              const k = R * 0.16;
              D.seg(X + dx - k, Y + dy, 0, X + dx, Y + dy + k, 0, 1.6 * g);
              D.seg(X + dx, Y + dy + k, 0, X + dx + k, Y + dy, 0, 1.6 * g);
              D.seg(X + dx + k, Y + dy, 0, X + dx, Y + dy - k, 0, 1.6 * g);
              D.seg(X + dx, Y + dy - k, 0, X + dx - k, Y + dy, 0, 1.6 * g);
            } else {
              // the doorway: rings of light inside, brightest at the heart
              const n = 20;
              for (let ring = 1; ring <= 3; ring++) {
                const rr = R * (0.18 + 0.16 * ring), b = (1.7 - ring * 0.35) * (0.8 + 0.2 * Math.sin(this.time * 2.6 - ring));
                for (let i = 0; i < n; i++) {
                  const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
                  D.seg(X + dx + Math.cos(a0) * rr, Y + dy + Math.sin(a0) * rr, 0, X + dx + Math.cos(a1) * rr, Y + dy + Math.sin(a1) * rr, 0, b);
                }
              }
            }
          }
        });
      }

      // the saucer
      if (state.saucer) {
        const s = state.saucer;
        const L = s.size === 'small' ? SAUCER_SMALL : SAUCER_BIG;
        const bob = Math.sin(this.time * 5) * 1.5;
        const X = this.wx(s.x), Y = this.wy(s.y) + bob;
        // the saucer has no wrap in x (it crosses), but wraps in y
        const ys = [0];
        if (s.y < s.r * 2) ys.push(-H); else if (s.y > H - s.r * 2) ys.push(H);
        for (const dy of ys) {
          F.fan([[-s.r, 0], [-s.r * 0.45, s.r * 0.36], [s.r * 0.45, s.r * 0.36], [s.r, 0], [s.r * 0.45, -s.r * 0.36], [-s.r * 0.45, -s.r * 0.36]], 0, 0, X, Y + dy);
          for (const q of L) D.seg(X + q[0], Y + dy + q[1], 0, X + q[2], Y + dy + q[3], 0, q[4] * 1.05);
        }
      }

      // bullets: bright dashes with a tail
      for (const b of state.bullets) {
        const mine = b.from === 'ship';
        const len = mine ? 0.02 : 0.014;
        const X = this.wx(b.x), Y = this.wy(b.y);
        this._copies(b.x, b.y, 16, (dx, dy) => {
          D.seg(X + dx, Y + dy, 0, X + dx - b.vx * len, Y + dy + b.vy * len, 0, mine ? 1.9 : 1.4);
          D.seg(X + dx - b.vx * len, Y + dy + b.vy * len, 0, X + dx - b.vx * len * 2.2, Y + dy + b.vy * len * 2.2, 0, mine ? 0.5 : 0.35);
        });
      }

      // the ship
      const ship = state.ship;
      if (ship.alive && !ship.hidden && view.showShip !== false) {
        const sb = P.shipBright;
        // the body: a faint fill so the drawing reads as an object
        const c = Math.cos(ship.a), s = -Math.sin(ship.a);
        const X = this.wx(ship.x), Y = this.wy(ship.y);
        const SS = SHIP_SCALE;
        const body = SHIP_BODY.map((p) => [X + (p[0] * c - p[1] * s) * SS, Y + (p[0] * s + p[1] * c) * SS]);
        this._copies(ship.x, ship.y, 24, (dx, dy) => BF.fan(body, X, Y, dx, dy));
        this._placeLines(S, SHIP_LINES, ship.x, ship.y, ship.a, SS, sb, 24);
        if (ship.thrust) {
          const fl = 8 + this._rand() * 9;
          const flame = [[-13, 3, -13 - fl, 0, 1.15], [-13, -3, -13 - fl, 0, 1.15], [-13, 1.2, -13 - fl * 0.55, 0, 0.7], [-13, -1.2, -13 - fl * 0.55, 0, 0.7]];
          this._placeLines(D, flame, ship.x, ship.y, ship.a, SHIP_SCALE, 1, 40);
          this._plume(ship, dt);
        }
        // hyperspace charging: a faint dot behind the canopy grows back
        if (ship.hyperCd > 0) {
          const k = 1 - ship.hyperCd / (state.opts.hyperCooldown || 1);
          const dot = [[-6, 0, -6 + 0.01, 0, 0.5 + k * 0.8]];
          this._placeLines(D, dot, ship.x, ship.y, ship.a, SHIP_SCALE, 1, 24);
        }
      }

      // the rings (breaks, hyperspace, the doorway opening)
      for (const rg of this.rings) {
        const u = rg.age / rg.life;
        const r = rg.r0 + (rg.r1 - rg.r0) * (1 - (1 - u) * (1 - u));
        const b = rg.b * (1 - u) * (1 - u);
        const n = 26;
        const X = this.wx(rg.x), Y = this.wy(rg.y);
        for (let i = 0; i < n; i++) {
          const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
          D.seg(X + Math.cos(a0) * r, Y + Math.sin(a0) * r, 0, X + Math.cos(a1) * r, Y + Math.sin(a1) * r, 0, b);
        }
      }
      // fragments (the strokes flying apart)
      for (const f of this.fragments) {
        const fade = 1 - f.age / f.life;
        const c = Math.cos(f.a), s = Math.sin(f.a);
        const X = this.wx(f.x), Y = this.wy(f.y);
        this._copies(f.x, f.y, 40, (dx, dy) => {
          for (const q of f.segs) {
            D.seg(X + dx + q[0] * c - q[1] * s, Y + dy - (q[0] * s + q[1] * c), 0, X + dx + q[2] * c - q[3] * s, Y + dy - (q[2] * s + q[3] * c), 0, f.b * q[4] * fade);
          }
        });
      }
      // sparks
      for (const p of this.particles) {
        const fade = 1 - p.age / p.life;
        const X = this.wx(p.x), Y = this.wy(p.y);
        D.seg(X, Y, 0, X - p.vx * 0.014, Y + p.vy * 0.014, 0, p.b * fade * fade);
      }
    }
    D.end(); F.end(); S.end(); HF.end(); HB.end(); BF.end();

    const scale = this.ph / 1080;
    const width = Math.max(1.0, P.lineWeight * scale);
    const gain = P.brightness * (1 + this.flash * 0.5);
    for (const b of this.lineBatches) {
      b.mat.uniforms.uWidth.value = width;
      b.mat.uniforms.uHalf.value = width * 0.5 + width * 2.0 + 1.5;
      b.mat.uniforms.uGain.value = gain;
    }
    const sw = width * 1.05;
    this.shipBatch.mat.uniforms.uWidth.value = sw;
    this.shipBatch.mat.uniforms.uHalf.value = sw * 0.5 + sw * 2.0 + 1.5;

    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(0x000000, 1);
    r.clear(true, false, false);
    r.render(this.scene, this.camera);

    this.brightMat.uniforms.tSrc.value = this.sceneRT.texture;
    this.quad.material = this.brightMat;
    r.setRenderTarget(this.bloomRT[0]);
    r.render(this.quadScene, this.quadCam);
    const bw = this.bloomRT[0].width, bh = this.bloomRT[0].height;
    this.quad.material = this.blurMat;
    this.blurMat.uniforms.tSrc.value = this.bloomRT[0].texture;
    this.blurMat.uniforms.uDir.value.set(1 / bw, 0);
    r.setRenderTarget(this.bloomRT[1]);
    r.render(this.quadScene, this.quadCam);
    this.blurMat.uniforms.tSrc.value = this.bloomRT[1].texture;
    this.blurMat.uniforms.uDir.value.set(0, 1 / bh);
    r.setRenderTarget(this.bloomRT[0]);
    r.render(this.quadScene, this.quadCam);

    const cu = this.compMat.uniforms;
    cu.tScene.value = this.sceneRT.texture;
    cu.tB0.value = this.bloomRT[0].texture;
    cu.uGlow.value = P.glow;
    cu.uFlash.value = this.flash * 0.3;
    cu.uTint.value.setHSL(P.hue, 1, 0.5).lerp(new THREE.Color(1, 1, 1), 1 - P.saturation);
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  dispose() { this.renderer.dispose(); }
}
