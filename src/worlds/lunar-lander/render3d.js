// Lunar Lander — the renderer.
//
// Pure presentation: no game rules, no DOM, no audio, no input. game.js drives
// it in the world; tmp/lunar-lander/lookdev.html drives it silently for look
// development (that harness is where the picture gets judged before it flies).
//
// One register: a single-weight line drawing, green to white, glowing on black.
// Three ground lines in depth — near, the flight line, far — each a polyline
// with solid black beneath it, drawn far to near so nothing shows through
// anything; stars only behind the far line. The physics live in the x-y plane
// at z = 0 (the flight line); the other two lines are parallax. The lander is
// a wireframe solid that yaws toward its tilt. No CRT imitation: no scanlines,
// no curve, no grain, no persistence smear. Glow is the whole finish.
import * as THREE from 'three';

// ---- tunables ------------------------------------------------------------------
// Every one of these is live.
export const DEFAULT_PARAMS = {
  hue: 0.36,          // line colour: 0.36 = green, 0.5 = cyan, 0.08 = amber
  saturation: 0.7,    // 0 = white
  glow: 0.9,          // bloom strength
  lineWeight: 1.8,    // core width, px at 1080p (scales with viewport)
  brightness: 1.0,    // the world's lines
  shipBright: 0.7,    // the lander, kept dimmer than the world so its drawing reads
  fov: 36,            // vertical field of view, degrees
  depth: 1.0,         // parallax separation between the three lines
  bank: 1.0,          // camera roll with lateral speed on approach
  zoomNear: 3.3,      // magnification on final approach
  zoomAlt: 430,       // altitude (ft) where the zoom kicks in (the shell adds hysteresis)
  plume: 1.0,         // thrust particle density
  stars: 1.0,
  res: 1.0,           // render scale
};

const PIXEL_BUDGET = 2.9e6;
const WORLD_W = 4000;
const FILL_FLOOR = -6000;   // the black under each ground line reaches here
const CAM_TAU = 0.9;        // seconds — the zoom eases, never snaps (motion restraint)
const BANK_TAU = 1.2;
const MAX_BANK = 0.05;      // rad — a few degrees, no more
const MAX_PARTICLES = 2600;
const Z_FAR = -1600, Z_NEAR = 420, Z_STARS = -9000;

// ---- vector font (4x6 grid, strokes) ---------------------------------------------
const FONT = {
  '0': [[[0,0],[4,0],[4,6],[0,6],[0,0]]],
  '1': [[[1,5],[2,6],[2,0]]],
  '2': [[[0,6],[4,6],[4,3],[0,3],[0,0],[4,0]]],
  '3': [[[0,6],[4,6],[4,0],[0,0]], [[1,3],[4,3]]],
  '4': [[[0,6],[0,3],[4,3]], [[4,6],[4,0]]],
  '5': [[[4,6],[0,6],[0,3],[4,3],[4,0],[0,0]]],
  '6': [[[4,6],[0,6],[0,0],[4,0],[4,3],[0,3]]],
  '7': [[[0,6],[4,6],[1,0]]],
  '8': [[[0,0],[4,0],[4,6],[0,6],[0,0]], [[0,3],[4,3]]],
  '9': [[[0,0],[4,0],[4,6],[0,6],[0,3],[4,3]]],
  'A': [[[0,0],[0,4],[2,6],[4,4],[4,0]], [[0,3],[4,3]]],
  'B': [[[0,0],[0,6],[3,6],[4,5],[4,4],[3,3],[0,3]], [[3,3],[4,2],[4,1],[3,0],[0,0]]],
  'C': [[[4,5],[3,6],[1,6],[0,5],[0,1],[1,0],[3,0],[4,1]]],
  'D': [[[0,0],[0,6],[3,6],[4,5],[4,1],[3,0],[0,0]]],
  'E': [[[4,0],[0,0],[0,6],[4,6]], [[0,3],[3,3]]],
  'F': [[[0,0],[0,6],[4,6]], [[0,3],[3,3]]],
  'G': [[[4,5],[3,6],[1,6],[0,5],[0,1],[1,0],[3,0],[4,1],[4,3],[2,3]]],
  'H': [[[0,0],[0,6]], [[4,0],[4,6]], [[0,3],[4,3]]],
  'I': [[[2,0],[2,6]]],
  'J': [[[4,6],[4,1],[3,0],[1,0],[0,1]]],
  'K': [[[0,0],[0,6]], [[4,6],[0,3],[4,0]]],
  'L': [[[0,6],[0,0],[4,0]]],
  'M': [[[0,0],[0,6],[2,4],[4,6],[4,0]]],
  'N': [[[0,0],[0,6],[4,0],[4,6]]],
  'O': [[[0,1],[0,5],[1,6],[3,6],[4,5],[4,1],[3,0],[1,0],[0,1]]],
  'P': [[[0,0],[0,6],[3,6],[4,5],[4,4],[3,3],[0,3]]],
  'Q': [[[0,1],[0,5],[1,6],[3,6],[4,5],[4,1],[3,0],[1,0],[0,1]], [[2,2],[4,0]]],
  'R': [[[0,0],[0,6],[3,6],[4,5],[4,4],[3,3],[0,3]], [[2,3],[4,0]]],
  'S': [[[4,5],[3,6],[1,6],[0,5],[0,4],[1,3],[3,3],[4,2],[4,1],[3,0],[1,0],[0,1]]],
  'T': [[[0,6],[4,6]], [[2,6],[2,0]]],
  'U': [[[0,6],[0,1],[1,0],[3,0],[4,1],[4,6]]],
  'V': [[[0,6],[2,0],[4,6]]],
  'W': [[[0,6],[0,0],[2,2],[4,0],[4,6]]],
  'X': [[[0,0],[4,6]], [[0,6],[4,0]]],
  'Y': [[[0,6],[2,3],[4,6]], [[2,3],[2,0]]],
  'Z': [[[0,6],[4,6],[0,0],[4,0]]],
  '+': [[[2,1],[2,5]], [[0,3],[4,3]]],
  '-': [[[1,3],[3,3]]],
  '.': [[[2,0],[2,0.6]]],
  ' ': [],
};

// Emit `text` as segments [x0,y0,x1,y1,b]; h = cap height; anchor 0 = left, 0.5 = centre.
export function textSegments(out, text, x, y, h, bright, anchor) {
  const cw = h * (5 / 6);
  const sc = h / 6;
  const total = text.length * cw - h / 6;
  let cx = x - total * (anchor || 0);
  for (const ch of text.toUpperCase()) {
    const strokes = FONT[ch];
    if (strokes) {
      for (const st of strokes) {
        for (let i = 1; i < st.length; i++) {
          out.push([cx + st[i - 1][0] * sc, y + st[i - 1][1] * sc, cx + st[i][0] * sc, y + st[i][1] * sc, bright]);
        }
      }
    }
    cx += cw;
  }
}

// ---- the line batch ------------------------------------------------------------------
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
    float core = 1.0 - smoothstep(uWidth * 0.5 - 0.7, uWidth * 0.5 + 0.7, d);
    float halo = exp(-d / (uWidth * 1.0)) * 0.14;
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
      uniforms: {
        uRes: { value: new THREE.Vector2(2, 2) },
        uHalf: { value: 3 },
        uWidth: { value: 2 },
        uGain: { value: 1 },
        uFogA: { value: 1e8 },
        uFogB: { value: 1e9 },
      },
      blending: THREE.AdditiveBlending,
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

// The black beneath a ground line: a strip from the polyline down to the floor,
// drawn opaque in the same ordered pass as the lines so nearer ground hides
// farther ground and the stars.
class GroundFill {
  constructor(order) {
    this.geo = new THREE.BufferGeometry();
    this.mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
  }
  set(pts, z, copies) {
    const n = pts.length;
    const pos = new Float32Array(copies.length * n * 2 * 3);
    const idx = new Uint32Array(copies.length * (n - 1) * 6);
    let vi = 0, ii = 0;
    for (const dx of copies) {
      const base = vi / 3;
      for (let i = 0; i < n; i++) {
        pos[vi++] = pts[i][0] + dx; pos[vi++] = pts[i][1]; pos[vi++] = z;
        pos[vi++] = pts[i][0] + dx; pos[vi++] = FILL_FLOOR; pos[vi++] = z;
      }
      for (let i = 0; i < n - 1; i++) {
        const a = base + i * 2;
        idx[ii++] = a; idx[ii++] = a + 1; idx[ii++] = a + 2;
        idx[ii++] = a + 1; idx[ii++] = a + 3; idx[ii++] = a + 2;
      }
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo.computeBoundingSphere();
  }
}

// ---- the lander: NASA 2036 ----------------------------------------------------------------
// Local feet, upright, y up, z toward the camera. Feet at (±15, -11, ±15) so the
// silhouette matches the core's collision points. A wide hexagonal deck, a low
// crew dome with a window band, two side tanks, four splayed legs on pads, a
// bell, a mast. Few lines, so each one reads.
function buildLander() {
  const S = [];
  const seg = (a, b) => S.push([a[0], a[1], a[2], b[0], b[1], b[2]]);
  const ring = (n, r, y, rot) => {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (rot || 0) + Math.PI * 2 * i / n; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
    return pts;
  };
  const loop = (pts) => { for (let i = 0; i < pts.length; i++) seg(pts[i], pts[(i + 1) % pts.length]); };
  // deck: hexagonal prism, wide and flat
  const dt = ring(6, 11.5, -1, Math.PI / 6), db = ring(6, 11.5, -4.2, Math.PI / 6);
  loop(dt); loop(db);
  for (let i = 0; i < 6; i++) seg(dt[i], db[i]);
  // crew dome: front silhouette arc + a mid ring + the window band
  const arc = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; arc.push([Math.cos(a) * 8.5, -1 + Math.sin(a) * 9.5, 0]); }
  for (let i = 1; i < arc.length; i++) seg(arc[i - 1], arc[i]);
  const side = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; side.push([0, -1 + Math.sin(a) * 9.5, Math.cos(a) * 8.5]); }
  for (let i = 1; i < side.length; i++) seg(side[i - 1], side[i]);
  loop(ring(10, 7.6, 3.2));
  // window band: a short arc on the front, slightly above the ring
  const win = [];
  for (let i = 0; i <= 4; i++) { const a = Math.PI * 0.3 + Math.PI * 0.4 * i / 4; win.push([Math.cos(a) * 6.9, 4.4 + Math.sin(a) * 1.2, Math.sqrt(Math.max(0, 6.9 * 6.9 - (Math.cos(a) * 6.9) ** 2)) * 0.98]); }
  for (let i = 1; i < win.length; i++) seg(win[i - 1], win[i]);
  // side tanks: small hexagons in the flight plane, either side of the deck
  for (const sx of [-1, 1]) {
    const t = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI * 2 * i / 6; t.push([sx * 13.5 + Math.cos(a) * 3.2, 1.2 + Math.sin(a) * 3.2, 0]); }
    loop(t);
    seg([sx * 11.5, -1, 0], [sx * 12, -1.6, 0]);
  }
  // legs: four, splayed from the deck corners to pads, with a strut
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = [15 * sx, -11, 15 * sz];
    seg([9 * sx, -4.2, 9 * sz], foot);
    seg([10.5 * sx, -1, 10.5 * sz], [12.5 * sx, -8, 12.5 * sz]);
    seg([foot[0] - 2.5 * sx, -11, foot[2] + 2.5 * sz], [foot[0] + 2.5 * sx, -11, foot[2] - 2.5 * sz]);
  }
  // engine bell
  const b1 = ring(6, 3, -4.2), b2 = ring(6, 5.2, -9.2);
  loop(b1); loop(b2);
  for (let i = 0; i < 6; i += 2) seg(b1[i], b2[i]);
  // mast + dish
  seg([0, 8.5, 0], [0, 13.5, 0]); seg([-1.6, 13.5, 0], [1.6, 13.5, 0]); seg([-1.2, 13.5, 0], [0, 15, 0]); seg([0, 15, 0], [1.2, 13.5, 0]);
  return S;
}
const LANDER = buildLander();

// ---- post shaders ------------------------------------------------------------------------
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
    c = max(c - 0.18, 0.0);
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
  uniform sampler2D tB1;
  uniform sampler2D tB2;
  uniform vec3 uTint;
  uniform float uGlow;
  uniform float uFlash;
  void main() {
    vec3 s = clamp(texture2D(tScene, vUv).rgb, 0.0, 64.0);
    vec3 bloom = texture2D(tB0, vUv).rgb * 0.9 + texture2D(tB1, vUv).rgb * 0.8 + texture2D(tB2, vUv).rgb * 0.9;
    float lum = s.g + bloom.g * uGlow * 0.5 + uFlash;
    // tinted body, whitening toward the core: green to white, nothing else
    vec3 col = uTint * lum;
    col = mix(col, vec3(lum), smoothstep(0.9, 2.2, lum) * 0.75);
    col = col / (1.0 + col * 0.25);
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

// ---- the scene -------------------------------------------------------------------------------
export class LanderScene {
  constructor(canvas, params) {
    this.params = Object.assign({}, DEFAULT_PARAMS, params || {});
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.params.fov, 1.78, 10, 40000);
    // draw order: stars, far fill, far line, flight fill, flight line, near fill, near line, the live things
    this.starBatch = new LineBatch(600, 0);
    this.farFill = new GroundFill(1);
    this.farBatch = new LineBatch(400, 2);
    this.flightFill = new GroundFill(3);
    this.flightBatch = new LineBatch(1400, 4);
    this.nearFill = new GroundFill(5);
    this.nearBatch = new LineBatch(400, 6);
    this.dynBatch = new LineBatch(9000, 7);
    for (const m of [this.starBatch.mesh, this.farFill.mesh, this.farBatch.mesh, this.flightFill.mesh, this.flightBatch.mesh, this.nearFill.mesh, this.nearBatch.mesh, this.dynBatch.mesh]) this.scene.add(m);
    this.worldBatches = [this.starBatch, this.farBatch, this.flightBatch, this.nearBatch, this.dynBatch];
    this.terrain = null;
    this.stars = [];
    this.ranges = null;
    this.effects = [];
    this.particles = [];
    this.zoom = 1;
    this.bankNow = 0;
    this.cx = WORLD_W / 2;
    this.cy = 0;
    this.time = 0;
    this.flash = 0;
    this.rngState = 12345;
    this.w = 2; this.h = 2; this.pw = 2; this.ph = 2;
    this.baseView = { cx: WORLD_W / 2, cy: 0, w: WORLD_W, h: WORLD_W / 1.78 };
    this.view = null;
    this.camDist = 3000;
    this.rcsTimer = 0;
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
    this.bloomRT = [];
    for (let i = 0; i < 3; i++) this.bloomRT.push([new THREE.WebGLRenderTarget(2, 2, opts), new THREE.WebGLRenderTarget(2, 2, opts)]);
    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.brightMat = mk(BRIGHT_FRAG, { tSrc: { value: null } });
    this.blurMat = mk(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.compMat = mk(COMP_FRAG, {
      tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null },
      uTint: { value: new THREE.Color(0.3, 1, 0.45) }, uGlow: { value: 1 }, uFlash: { value: 0 },
    });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.brightMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  setParams(p) {
    const before = { depth: this.params.depth, stars: this.params.stars, brightness: this.params.brightness };
    Object.assign(this.params, p);
    if (this.terrain && (before.depth !== this.params.depth || before.stars !== this.params.stars || before.brightness !== this.params.brightness)) this._buildStatic();
  }

  resize(w, h) {
    // The window first: a canvas measured before layout reports nothing useful.
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
    const aspect = w / h;
    let vw = WORLD_W, vh = WORLD_W / aspect;
    if (vh < 2000) { vh = 2000; vw = vh * aspect; }
    this.baseView = { cx: WORLD_W / 2, cy: vh / 2 - 60, w: vw, h: vh };
    this.cx = this.baseView.cx; this.cy = this.baseView.cy;
  }

  // ---- static content: three lines, pads, labels, stars ----------------------------------
  setTerrain(terrain) {
    this.terrain = terrain;
    this.rngState = (terrain.seed || 1) >>> 0;
    this.stars = [];
    for (let i = 0; i < 480; i++) {
      this.stars.push([-4000 + this._rand() * 12000, -600 + this._rand() * 8000, Z_STARS - this._rand() * 3000, 0.3 + this._rand() * this._rand() * 1.0]);
    }
    const mk = (n, lo, hi, smooth) => {
      const pts = [];
      let prev = lo + this._rand() * (hi - lo);
      for (let i = 0; i <= n; i++) {
        let y = lo + this._rand() * (hi - lo);
        y = prev + (y - prev) * smooth;
        prev = y;
        pts.push([WORLD_W * i / n, y]);
      }
      pts[n][1] = pts[0][1];
      return pts;
    };
    this.ranges = { far: mk(44, 260, 980, 0.5), near: mk(60, -340, 30, 0.5) };
    this._buildStatic();
  }

  _buildStatic() {
    const T = this.terrain;
    const P = this.params;
    const D = P.depth;
    const copies = [-WORLD_W, 0, WORLD_W];
    const zFar = Z_FAR * D, zNear = Z_NEAR * D;
    // stars
    const S = this.starBatch;
    S.begin();
    if (P.stars > 0) for (const s of this.stars) S.seg(s[0], s[1], s[2], s[0], s[1], s[2], s[3] * P.stars * 3.2);
    S.end();
    // far line
    const F = this.farBatch;
    F.begin();
    if (T) for (const dx of copies) F.poly2(this.ranges.far, 0.55, dx, 0, zFar);
    F.end();
    this.farFill.set(T ? this.ranges.far : [[0, 0], [WORLD_W, 0]], zFar, copies);
    // the flight line, with pads
    const B = this.flightBatch;
    B.begin();
    if (T) {
      for (const dx of copies) {
        B.poly2(T.pts, 1.0, dx, 0, 0);
        for (const p of T.pads) {
          B.seg2(p.x0 + dx, p.y, p.x1 + dx, p.y, 2.2);
          B.seg2(p.x0 + dx, p.y, p.x0 + dx, p.y + 7, 1.2);
          B.seg2(p.x1 + dx, p.y, p.x1 + dx, p.y + 7, 1.2);
          const segs = [];
          textSegments(segs, p.mult + 'X', (p.x0 + p.x1) / 2 + dx, p.y + 20, 24, 1.1, 0.5);
          B.text(segs);
        }
      }
    }
    B.end();
    this.flightFill.set(T ? T.pts : [[0, 0], [WORLD_W, 0]], 0, copies);
    // near line
    const N = this.nearBatch;
    N.begin();
    if (T) for (const dx of copies) N.poly2(this.ranges.near, 0.5, dx, 0, zNear);
    N.end();
    this.nearFill.set(T ? this.ranges.near : [[0, -400], [WORLD_W, -400]], zNear, copies);
  }

  // ---- effects --------------------------------------------------------------------------------
  spawnCrash(ship) {
    const c = Math.cos(ship.angle), s = Math.sin(ship.angle);
    for (const q of LANDER) {
      const mx = (q[0] + q[3]) / 2, my = (q[1] + q[4]) / 2, mz = (q[2] + q[5]) / 2;
      const wx = ship.x + mx * c + my * s, wy = ship.y - mx * s + my * c;
      const ang = this._rand() * Math.PI * 2;
      const sp = 25 + this._rand() * 70;
      this.effects.push({
        kind: 'debris',
        x: wx, y: wy, z: mz, vx: Math.cos(ang) * sp + ship.vx * 0.3, vy: Math.abs(Math.sin(ang)) * sp + 20, vz: (this._rand() - 0.5) * 60,
        ang: ship.angle, av: (this._rand() - 0.5) * 8,
        seg: [q[0] - mx, q[1] - my, q[2] - mz, q[3] - mx, q[4] - my, q[5] - mz],
        age: 0, life: 2.8 + this._rand() * 1.6,
      });
    }
    for (let i = 0; i < 70; i++) this._spark(ship.x, ship.y - 8, 0, 40 + this._rand() * 160, 1.6, 1.2);
    this.effects.push({ kind: 'ring', x: ship.x, y: this._groundAt(ship.x) + 1, age: 0, life: 1.4, r0: 4, r1: 160, b: 1.6 });
    this.flash = 1.2;
  }
  spawnTouchdown(x, y, strength) {
    const n = Math.round(24 + strength * 40);
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      const sp = (14 + this._rand() * 42) * (0.6 + strength);
      this.effects.push({
        kind: 'dust',
        x: x + dir * (12 + this._rand() * 8), y: y + 1, z: (this._rand() - 0.5) * 40,
        vx: dir * sp, vy: 5 + this._rand() * 16 * strength, vz: (this._rand() - 0.5) * 24 * strength,
        age: 0, life: 1.6 + this._rand() * 1.4, len: 3 + this._rand() * 5, settled: false,
      });
    }
    this.effects.push({ kind: 'ring', x, y: y + 0.5, age: 0, life: 0.9, r0: 8, r1: 60 + strength * 70, b: 0.9 + strength * 0.5 });
    this.effects.push({ kind: 'ring', x, y: y + 0.5, age: -0.18, life: 1.1, r0: 8, r1: 90 + strength * 90, b: 0.6 + strength * 0.4 });
  }
  spawnTally(x, y, text) {
    this.effects.push({ kind: 'tally', x, y: y + 34, text, age: 0, life: 2.8 });
  }
  _spark(x, y, z, sp, life, bright) {
    const ang = this._rand() * Math.PI * 2;
    this.effects.push({
      kind: 'spark', x, y, z: z || 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: (this._rand() - 0.5) * sp * 0.5,
      age: 0, life: life * (0.6 + this._rand() * 0.8), bright: bright || 1,
    });
  }
  _plume(ship, thrust, dt, ds) {
    const P = this.params;
    const rate = (60 + thrust * 420) * P.plume;
    let n = rate * dt + this._rand();
    const c = Math.cos(ship.angle), s = Math.sin(ship.angle);
    while (n >= 1 && this.particles.length < MAX_PARTICLES) {
      n -= 1;
      const spread = (this._rand() - 0.5) * 0.5;
      const lx = Math.sin(spread), ly = -Math.cos(spread);
      const sp = (55 + thrust * 120) * (0.7 + this._rand() * 0.6);
      const ox = (this._rand() - 0.5) * 4 * ds, oy = -9.5 * ds;
      this.particles.push({
        x: ship.x + ox * c + oy * s, y: ship.y - ox * s + oy * c, z: (this._rand() - 0.5) * 4 * ds,
        vx: ship.vx + (lx * c + ly * s) * sp, vy: ship.vy + (-lx * s + ly * c) * sp, vz: (this._rand() - 0.5) * 30,
        age: 0, life: 0.22 + this._rand() * 0.3 + thrust * 0.15, b: 0.45 + thrust * 0.8,
      });
    }
  }
  _rcs(ship, rotate, ds) {
    const c = Math.cos(ship.angle), s = Math.sin(ship.angle);
    const sx = rotate > 0 ? -1 : 1;
    for (let i = 0; i < 3; i++) {
      const lx = 12 * sx * ds, ly = 1 * ds;
      const dxl = sx, dyl = 0.35 * (this._rand() - 0.5);
      const sp = 40 + this._rand() * 30;
      this.particles.push({
        x: ship.x + lx * c + ly * s, y: ship.y - lx * s + ly * c, z: (this._rand() - 0.5) * 12 * ds,
        vx: ship.vx + (dxl * c + dyl * s) * sp, vy: ship.vy + (-dxl * s + dyl * c) * sp, vz: (this._rand() - 0.5) * 20,
        age: 0, life: 0.18 + this._rand() * 0.12, b: 0.7,
      });
    }
  }
  clearEffects() { this.effects.length = 0; this.particles.length = 0; }

  _stepEffects(dt, gravity) {
    const g = gravity || 5.3;
    const keep = [];
    for (const e of this.effects) {
      e.age += dt;
      if (e.age >= e.life) continue;
      if (e.kind === 'ring' || e.kind === 'tally') {
        if (e.kind === 'tally') e.y += 22 * dt;
        keep.push(e);
        continue;
      }
      if (!(e.kind === 'dust' && e.settled)) {
        e.vy -= g * dt * (e.kind === 'dust' ? 0.7 : 1);
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z = (e.z || 0) + (e.vz || 0) * dt;
      }
      if (e.kind === 'debris') {
        e.ang += e.av * dt;
        if (this.terrain) {
          const gy = this._groundAt(e.x);
          if (e.y < gy) { e.y = gy; e.vy = -e.vy * 0.35; e.vx *= 0.7; e.vz *= 0.7; e.av *= 0.6; }
        }
      } else if (e.kind === 'dust' && !e.settled && this.terrain) {
        const gy = this._groundAt(e.x);
        if (e.y < gy + 0.5 && e.vy < 0) { e.y = gy + 0.5; e.settled = true; }
      }
      keep.push(e);
    }
    this.effects = keep;
    const pk = [];
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= g * dt * 0.5;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (this.terrain) {
        const gy = this._groundAt(p.x);
        if (p.y < gy) { p.y = gy; p.vy = -p.vy * 0.2; p.vx *= 0.6; p.life = Math.min(p.life, p.age + 0.12); }
      }
      pk.push(p);
    }
    this.particles = pk;
  }
  _groundAt(x) {
    const T = this.terrain;
    if (!T) return 0;
    x = ((x % WORLD_W) + WORLD_W) % WORLD_W;
    const pts = T.pts;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= x) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], span = b[0] - a[0];
    return span <= 0 ? a[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / span;
  }

  // ---- camera ---------------------------------------------------------------------------------
  _updateCamera(view, dt) {
    const P = this.params;
    const target = view && view.zoomOn ? P.zoomNear : 1;
    const k = 1 - Math.exp(-dt / CAM_TAU);
    this.zoom += (target - this.zoom) * k;
    const t = Math.max(0, Math.min(1, (this.zoom - 1) / Math.max(0.001, P.zoomNear - 1)));
    const bv = this.baseView;
    const vw = bv.w / this.zoom, vh = bv.h / this.zoom;
    let tx = bv.cx, ty = bv.cy;
    let bankT = 0;
    if (view && view.ship) {
      const s = view.ship;
      const gy = this._groundAt(s.x);
      const zy = Math.max(gy + vh * 0.28, s.y - vh * 0.12);
      tx = bv.cx + (s.x - bv.cx) * t;
      ty = bv.cy + (zy - bv.cy) * t;
      bankT = Math.max(-MAX_BANK, Math.min(MAX_BANK, -s.vx * 0.001)) * t * P.bank;
    }
    this.cx += (tx - this.cx) * (t > 0.02 ? k : 1);
    this.cy += (ty - this.cy) * (t > 0.02 ? k : 1);
    if (t <= 0.02) { this.cx = bv.cx; this.cy = bv.cy; }
    this.bankNow += (bankT - this.bankNow) * (1 - Math.exp(-dt / BANK_TAU));
    const cam = this.camera;
    cam.fov = P.fov;
    const D = (vh / 2) / Math.tan(P.fov * Math.PI / 360);
    this.camDist = D;
    cam.position.set(this.cx, this.cy, D);
    cam.up.set(Math.sin(this.bankNow), Math.cos(this.bankNow), 0);
    cam.lookAt(this.cx, this.cy, 0);
    cam.near = Math.max(1, D * 0.05);
    cam.far = D + 20000;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.view = { cx: this.cx, cy: this.cy, w: vw, h: vh, t };
    const fogA = D * 1.0, fogB = D + 4200 * Math.max(0.2, P.depth);
    for (const b of this.worldBatches) { b.mat.uniforms.uFogA.value = fogA; b.mat.uniforms.uFogB.value = fogB; }
  }

  projectToScreen(x, y, out) {
    const v = this._v.set(x, y, 0).project(this.camera);
    out = out || {};
    out.x = (v.x * 0.5 + 0.5) * this.w;
    out.y = (1 - (v.y * 0.5 + 0.5)) * this.h;
    out.on = v.z < 1 && out.x >= 0 && out.x <= this.w && out.y >= 0 && out.y <= this.h;
    return out;
  }

  // ---- the frame ------------------------------------------------------------------------------
  // view: { ship, thrust, rotate, zoomOn, gravity, showShip, secret, flying }
  render(view, dt) {
    dt = Math.min(0.1, Math.max(0, dt || 0));
    this.time += dt;
    const P = this.params;
    const cw = window.innerWidth || this.canvas.clientWidth || 0;
    const chh = window.innerHeight || this.canvas.clientHeight || 0;
    if (cw > 2 && chh > 2 && (cw !== this.w || chh !== this.h)) this.resize(cw, chh);
    this._updateCamera(view, dt);
    this._stepEffects(dt, view && view.gravity);
    this.flash = Math.max(0, this.flash - dt * 2.4);

    const D = this.dynBatch;
    D.begin();
    const zt = this.view ? this.view.t : 0;
    // the lander is drawn larger than true: 2.2× in the wide view, 1.25× on approach
    const ds = 1.25 + 0.95 * (1 - zt);
    if (view && view.ship && view.showShip !== false) {
      const s = view.ship;
      const c = Math.cos(s.angle), sn = Math.sin(s.angle);
      const yaw = Math.max(-0.9, Math.min(0.9, s.angle * 0.7));
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const tr = (lx, ly, lz) => {
        const x1 = lx * cy + lz * sy, z1 = -lx * sy + lz * cy;
        const x2 = (x1 * c + ly * sn) * ds, y2 = (-x1 * sn + ly * c) * ds;
        return [s.x + x2, s.y + y2, z1 * ds];
      };
      const sb = P.shipBright;
      for (const dx of [-WORLD_W, 0, WORLD_W]) {
        for (const q of LANDER) {
          const a = tr(q[0], q[1], q[2]), b = tr(q[3], q[4], q[5]);
          D.seg(a[0] + dx, a[1], a[2], b[0] + dx, b[1], b[2], sb);
        }
        const th = view.thrust || 0;
        if (th > 0.01) {
          const flick = 0.8 + 0.2 * Math.sin(this.time * 61.7) * Math.sin(this.time * 23.3 + 1.7);
          const L = (5 + th * 24) * flick;
          const a = tr(-3.4, -9.4, 0), b = tr(0, -9.4 - L, 0), e = tr(3.4, -9.4, 0);
          D.seg(a[0] + dx, a[1], a[2], b[0] + dx, b[1], b[2], 0.9 + th * 0.8);
          D.seg(b[0] + dx, b[1], b[2], e[0] + dx, e[1], e[2], 0.9 + th * 0.8);
        }
      }
      if (view.flying) {
        if ((view.thrust || 0) > 0.01) this._plume(s, view.thrust, dt, ds);
        if (view.rotate) {
          this.rcsTimer -= dt;
          if (this.rcsTimer <= 0) { this._rcs(s, view.rotate, ds); this.rcsTimer = 0.07; }
        }
      }
    }
    if (view && view.secret && this.terrain && this.terrain.secret) {
      const S = this.terrain.secret;
      const bx = (S.x0 + S.x1) / 2 + 60, by = S.y;
      D.poly2([[bx - 28, by], [bx - 28, by + 22], [bx + 28, by + 22], [bx + 28, by]], 0.9);
      D.poly2([[bx - 32, by + 22], [bx + 32, by + 22], [bx + 32, by + 26], [bx - 32, by + 26], [bx - 32, by + 22]], 0.9);
      D.poly2([[bx - 6, by], [bx - 6, by + 14], [bx + 6, by + 14], [bx + 6, by]], 0.7);
      D.seg2(bx + 42, by, bx + 42, by + 48, 0.8);
      const arch = (cx0) => {
        const pts = [];
        for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10; pts.push([cx0 + Math.cos(a) * 9, by + 48 + Math.sin(a) * 16]); }
        D.poly2(pts, 1.6);
      };
      arch(bx + 33); arch(bx + 51);
      const segs = [];
      textSegments(segs, 'BILLIONS SERVED', bx, by + 34, 8, 0.7, 0.5);
      D.text(segs);
    }
    for (const e of this.effects) {
      const fade = 1 - e.age / e.life;
      if (e.kind === 'debris') {
        const c = Math.cos(e.ang), sn = Math.sin(e.ang);
        const q = e.seg;
        D.seg(e.x + q[0] * c + q[1] * sn, e.y - q[0] * sn + q[1] * c, e.z + q[2], e.x + q[3] * c + q[4] * sn, e.y - q[3] * sn + q[4] * c, e.z + q[5], 0.3 + fade * 0.6);
      } else if (e.kind === 'dust') {
        if (e.settled) { D.seg(e.x, e.y, e.z, e.x + 1.5, e.y, e.z, 0.5 * fade); continue; }
        const l = Math.hypot(e.vx, e.vy) || 1;
        D.seg(e.x, e.y, e.z, e.x + e.vx / l * e.len, e.y + e.vy / l * e.len, e.z, 0.9 * fade);
      } else if (e.kind === 'ring') {
        if (e.age < 0) continue;
        const u = e.age / e.life;
        const r = e.r0 + (e.r1 - e.r0) * (1 - Math.pow(1 - u, 2.2));
        const b = e.b * (1 - u) * (1 - u);
        const n = 28;
        for (let i = 0; i < n; i++) {
          const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
          D.seg(e.x + Math.cos(a0) * r, e.y, Math.sin(a0) * r * 0.55, e.x + Math.cos(a1) * r, e.y, Math.sin(a1) * r * 0.55, b);
        }
      } else if (e.kind === 'tally') {
        const b = e.age < 1.6 ? 1.5 : 1.5 * (1 - (e.age - 1.6) / (e.life - 1.6));
        const segs = [];
        textSegments(segs, e.text, e.x, e.y, 20, b, 0.5);
        D.text(segs);
      } else {
        D.seg(e.x, e.y, e.z, e.x - e.vx * 0.03, e.y - e.vy * 0.03, e.z, e.bright * fade);
      }
    }
    for (const p of this.particles) {
      const fade = 1 - p.age / p.life;
      D.seg(p.x, p.y, p.z, p.x - p.vx * 0.012, p.y - p.vy * 0.012, p.z, p.b * fade * fade);
    }
    D.end();

    const scale = this.ph / 1080;
    const width = Math.max(1.0, P.lineWeight * scale);
    const gain = P.brightness * (1 + this.flash * 0.5);
    for (const b of this.worldBatches) {
      b.mat.uniforms.uWidth.value = width;
      b.mat.uniforms.uHalf.value = width * 0.5 + width * 2.0 + 1.5;
      b.mat.uniforms.uGain.value = gain;
    }
    this.dynBatch.mat.uniforms.uGain.value = 1 + this.flash * 0.5;   // the live things are authored in absolute terms

    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(0x000000, 1);
    r.clear(true, false, false);
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
    cu.tB1.value = this.bloomRT[1][0].texture;
    cu.tB2.value = this.bloomRT[2][0].texture;
    cu.uGlow.value = P.glow;
    cu.uFlash.value = this.flash * 0.3;
    cu.uTint.value.setHSL(P.hue, 1, 0.5).lerp(new THREE.Color(1, 1, 1), 1 - P.saturation);
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  dispose() { this.renderer.dispose(); }
}
