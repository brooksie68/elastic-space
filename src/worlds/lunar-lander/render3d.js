// Lunar Lander — the renderer.
//
// Pure presentation: no game rules, no DOM, no audio, no input. game.js drives
// it in the world; tmp/lunar-lander/lookdev.html drives it silently for look
// development (that harness is where the picture gets judged before it flies).
//
// One register: a line drawing, green to white, on black — drawn the 2026 way:
// lines MAX-blend (overlaps and corners never stack brighter; a CRT summed
// them and that is the blur James rejected), a tight single-level glow that
// only softens the edge, and the lander as an object (dimmed back edges,
// heavier front edges, a faint body fill under the lines).
// Ground lines in depth — farther, far, the flight line, near — each a polyline
// with solid black beneath it, drawn far to near so nothing shows through
// anything; stars only behind the farthest line. The physics live in the x-y
// plane at z = 0 (the flight line); the other lines are parallax. The moon is
// ENDLESS: the renderer holds the core's world (chunks on demand) and rebuilds
// its static lines for the chunks around the camera as it scrolls. The lander is
// a wireframe drawing in two stages (pod over descent stage) that yaws toward
// its tilt, with the landing tech it has earned drawn on. No CRT imitation: no
// scanlines, no curve, no grain, no persistence smear. Glow is the whole finish.
import * as THREE from 'three';

// ---- tunables ------------------------------------------------------------------
// Every one of these is live.
export const DEFAULT_PARAMS = {
  hue: 0.36,          // line colour: 0.36 = green, 0.5 = cyan, 0.08 = amber
  saturation: 0.7,    // 0 = white
  glow: 0.9,          // bloom strength
  lineWeight: 1.8,    // core width, px at 1080p (scales with viewport)
  brightness: 1.0,    // the world's lines
  shipBright: 0.85,   // the lander (max-blend: it no longer blooms, so it can carry more)
  fov: 36,            // vertical field of view, degrees
  depth: 1.0,         // parallax separation between the three lines
  bank: 1.0,          // camera roll with lateral speed on approach
  zoomNear: 3.3,      // magnification on final approach
  zoomAlt: 430,       // altitude (ft) where the zoom kicks in (the shell adds hysteresis)
  plume: 1.0,         // thrust particle density
  stars: 1.0,
  ringBright: 0.08,   // the direction aid ring (James's pick, 2026-09-04)
  triBright: 0.25,    // the aid's triangle (James's pick, 2026-09-04)
  res: 1.0,           // render scale
};

const PIXEL_BUDGET = 2.9e6;
const CHUNK_W = 4000;
const VIEW_W = 4000;          // the wide view's width in feet
const FILL_FLOOR = -6000;   // the black under each ground line reaches here
const CAM_TAU = 0.9;        // seconds — the zoom eases, never snaps (motion restraint)
const BANK_TAU = 1.2;
const MAX_BANK = 0.05;      // rad — a few degrees, no more
const ZOOM_MIN = 0.3;       // the furthest the wide view pulls back (a ship 3.3× the base height up still shows)
const MAX_PARTICLES = 2600;
const Z_FAR = -1600, Z_FARTHER = -3400, Z_NEAR = 420, Z_STARS = -9000;

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
export { buildTech, LANDER };
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
      uniforms: {
        uRes: { value: new THREE.Vector2(2, 2) },
        uHalf: { value: 3 },
        uWidth: { value: 2 },
        uGain: { value: 1 },
        uFogA: { value: 1e8 },
        uFogB: { value: 1e9 },
      },
      // MAX blend: a stroke crossing a stroke is one stroke's brightness, never two
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
  set(pts, z) {
    const n = pts.length;
    const pos = new Float32Array(n * 2 * 3);
    const idx = new Uint32Array((n - 1) * 6);
    let vi = 0, ii = 0;
    for (let i = 0; i < n; i++) {
      pos[vi++] = pts[i][0]; pos[vi++] = pts[i][1]; pos[vi++] = z;
      pos[vi++] = pts[i][0]; pos[vi++] = FILL_FLOOR; pos[vi++] = z;
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

// ---- the lander: NASA 2036 ----------------------------------------------------------------
// Local feet, upright, y up, z toward the camera. Feet at (±15, -11, ±15) so the
// silhouette matches the core's collision points. Two stages like the LEM: a
// crew pod on top (hex prism, window band, hatch, cap) over a boxier descent
// stage (octagonal prism) with the bell beneath, side tanks, four splayed legs
// on pads, a mast. Taller than it is wide. Few lines, so each one reads.
function ring(n, r, y, rot) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (rot || 0) + Math.PI * 2 * i / n; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
  return pts;
}
function buildLander() {
  const S = [];
  const seg = (a, b) => S.push([a[0], a[1], a[2], b[0], b[1], b[2]]);
  const loop = (pts) => { for (let i = 0; i < pts.length; i++) seg(pts[i], pts[(i + 1) % pts.length]); };
  // descent stage: octagonal prism, y -5 .. 3
  const dt = ring(8, 8.6, 3, Math.PI / 8), db = ring(8, 8.6, -5, Math.PI / 8);
  loop(dt); loop(db);
  for (let i = 0; i < 8; i += 2) seg(dt[i], db[i]);
  // crew pod: hex prism y 3.6 .. 12.4, a cap ring, a low peak
  const pb = ring(6, 5.8, 3.6, Math.PI / 6), pt = ring(6, 5.8, 12.4, Math.PI / 6);
  loop(pb); loop(pt);
  for (let i = 0; i < 6; i++) seg(pb[i], pt[i]);
  const cap = ring(6, 3.4, 14.6, Math.PI / 6);
  loop(cap);
  for (let i = 0; i < 6; i += 2) seg(pt[i], cap[i]);
  // the two windows: angled quads on the front face, canted like the LEM's
  for (const sx of [-1, 1]) {
    const z = 5.6;
    const w = [[sx * 1.3, 10.6, z], [sx * 4.2, 10.0, z - 0.6], [sx * 4.0, 7.6, z - 0.6], [sx * 1.3, 8.2, z]];
    loop(w);
  }
  // hatch on the descent stage front
  loop([[-2.2, 1.6, 8.6], [2.2, 1.6, 8.6], [2.2, -3.4, 8.6], [-2.2, -3.4, 8.6]]);
  // RCS quads at two pod corners
  for (const sx of [-1, 1]) {
    seg([sx * 6.4, 11.2, 0], [sx * 8.2, 11.2, 0]);
    seg([sx * 7.3, 10.3, 0], [sx * 7.3, 12.1, 0]);
  }
  // side tanks: small hexagons in the flight plane, on the descent stage
  for (const sx of [-1, 1]) {
    const t = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI * 2 * i / 6; t.push([sx * 11.4 + Math.cos(a) * 2.7, -1 + Math.sin(a) * 2.7, 0]); }
    loop(t);
    seg([sx * 8.6, -1, 0], [sx * 8.7, -1, 0]);
  }
  // legs: four, from the descent-stage corners out to the pads, one strut each
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = [15 * sx, -11, 15 * sz];
    seg([6.1 * sx, -5, 6.1 * sz], foot);
    seg([6.1 * sx, 1.5, 6.1 * sz], [11.5 * sx, -7.4, 11.5 * sz]);
    seg([foot[0] - 2.4 * sx, -11, foot[2] + 2.4 * sz], [foot[0] + 2.4 * sx, -11, foot[2] - 2.4 * sz]);
  }
  // engine bell
  const b1 = ring(6, 2.6, -5), b2 = ring(6, 4.6, -9.8);
  loop(b1); loop(b2);
  for (let i = 0; i < 6; i += 2) seg(b1[i], b2[i]);
  // mast + antenna
  seg([0, 14.6, 0], [0, 19, 0]); seg([-1.4, 19, 0], [1.4, 19, 0]); seg([-1.0, 19, 0], [0, 20.3, 0]); seg([0, 20.3, 0], [1.0, 19, 0]);
  return S;
}
const LANDER = buildLander();
const BODY_POINTS = [].concat(ring(8, 8.6, 3, Math.PI / 8), ring(8, 8.6, -5, Math.PI / 8), ring(6, 5.8, 3.6, Math.PI / 6), ring(6, 5.8, 12.4, Math.PI / 6), ring(6, 3.4, 14.6, Math.PI / 6));

// The landing tech, drawn on the ship. Each piece is its own little set of
// segments in lander-local feet; `fan` (0..1) is the spider legs' spread and
// `squash` (0..1) the shock legs' compression, both driven by the shell.
function buildTech(id, fan, squash) {
  const S = [];
  const seg = (a, b) => S.push([a[0], a[1], a[2], b[0], b[1], b[2]]);
  const loop = (pts) => { for (let i = 0; i < pts.length; i++) seg(pts[i], pts[(i + 1) % pts.length]); };
  if (id === 'shock') {
    // a coil on each leg strut: zigzag between the knee and the foot
    const sq = 1 - 0.45 * (squash || 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const a = [9.5 * sx, -7.4 * sq, 9.5 * sz], b = [13.2 * sx, -9.9 * sq, 13.2 * sz];
      const n = 5;
      let prev = a;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const side = (i % 2 ? 1 : -1) * (i < n ? 1.1 : 0);
        const p = [a[0] + (b[0] - a[0]) * t + side * sz * 0.7, a[1] + (b[1] - a[1]) * t + side * 0.6, a[2] + (b[2] - a[2]) * t - side * sx * 0.7];
        seg(prev, p); prev = p;
      }
    }
  } else if (id === 'spider') {
    // an outer leg beside each main strut, fanned wider as the ground nears
    const f = fan || 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const knee = [10 * sx, -6.5, 10 * sz];
      const toe = [(16.5 + 5.5 * f) * sx, -11 - 0.0 * f, (16.5 + 5.5 * f) * sz];
      seg([7.6 * sx, -3.5, 7.6 * sz], knee);
      seg(knee, toe);
      seg([toe[0] - 1.6 * sx, toe[1], toe[2] + 1.6 * sz], [toe[0] + 1.6 * sx, toe[1], toe[2] - 1.6 * sz]);
    }
  } else if (id === 'auto') {
    // a computer box beside the bell with a whip antenna
    loop([[-6.6, -5.4, 4.4], [-3.6, -5.4, 4.4], [-3.6, -8.2, 4.4], [-6.6, -8.2, 4.4]]);
    loop([[-6.6, -5.4, 4.4], [-6.6, -5.4, 1.8], [-6.6, -8.2, 1.8], [-6.6, -8.2, 4.4]]);
    seg([-5.1, -5.4, 3.1], [-5.1, -1.2, 3.1]);
  }
  return S;
}

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

// ---- the scene -------------------------------------------------------------------------------
export class LanderScene {
  constructor(canvas, params) {
    this.params = Object.assign({}, DEFAULT_PARAMS, params || {});
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.params.fov, 1.78, 10, 40000);
    // draw order: stars, farther fill/line, far fill/line, flight fill/line, near fill/line, the live things
    this.starBatch = new LineBatch(2000, 0);
    this.fartherFill = new GroundFill(1);
    this.fartherBatch = new LineBatch(1200, 2);
    this.farFill = new GroundFill(3);
    this.farBatch = new LineBatch(1600, 4);
    this.flightFill = new GroundFill(5);
    this.flightBatch = new LineBatch(5000, 6);
    this.nearFill = new GroundFill(7);
    this.nearBatch = new LineBatch(2200, 8);
    this.dynBatch = new LineBatch(9000, 9);
    // the lander as an object: a faint body fill under the lines (order 8.5), then
    // its front edges in a heavier batch (order 10) over the dimmed back edges (dyn)
    this.bodyGeo = new THREE.BufferGeometry();
    this.bodyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3 * 64), 3).setUsage(THREE.DynamicDrawUsage));
    this.bodyGeo.setDrawRange(0, 0);
    this.bodyMesh = new THREE.Mesh(this.bodyGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.075, 0.075, 0.075), transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    this.bodyMesh.frustumCulled = false;
    this.bodyMesh.renderOrder = 8.5;
    this.shipBatch = new LineBatch(1200, 10);
    for (const m of [this.starBatch.mesh, this.fartherFill.mesh, this.fartherBatch.mesh, this.farFill.mesh, this.farBatch.mesh, this.flightFill.mesh, this.flightBatch.mesh, this.nearFill.mesh, this.nearBatch.mesh, this.bodyMesh, this.dynBatch.mesh, this.shipBatch.mesh]) this.scene.add(m);
    this.worldBatches = [this.starBatch, this.fartherBatch, this.farBatch, this.flightBatch, this.nearBatch, this.dynBatch, this.shipBatch];
    this.world = null;          // the core's game state (chunks on demand)
    this.stars = [];
    this.rangeCache = {};       // per-chunk parallax ranges: key kind:k
    this.builtKey = '';         // which chunk span + world version the static batches hold
    this.chunkSpan = [0, 0];
    this.launchPadId = '';      // the pad whose accelerator is animating (its resting copy is skipped)
    this.effects = [];
    this.particles = [];
    this.zoom = 1;
    this.bankNow = 0;
    this.cx = VIEW_W / 2;
    this.cy = 0;
    this.time = 0;
    this.flash = 0;
    this.rngState = 12345;
    this.w = 2; this.h = 2; this.pw = 2; this.ph = 2;
    this.baseView = { cx: VIEW_W / 2, cy: 0, w: VIEW_W, h: VIEW_W / 1.78 };
    this.view = null;
    this.camDist = 3000;
    this.rcsTimer = 0;
    this.streak = 0;
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
    this.bloomRT = [[new THREE.WebGLRenderTarget(2, 2, opts), new THREE.WebGLRenderTarget(2, 2, opts)]];   // one level, half res
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
    const before = { depth: this.params.depth, stars: this.params.stars, brightness: this.params.brightness };
    Object.assign(this.params, p);
    if (this.world && (before.depth !== this.params.depth || before.stars !== this.params.stars || before.brightness !== this.params.brightness)) { this.builtKey = ''; this._buildStatic(); }
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
    let vw = VIEW_W, vh = VIEW_W / aspect;
    if (vh < 2000) { vh = 2000; vw = vh * aspect; }
    this.baseView = { cx: this.baseView ? this.baseView.cx : VIEW_W / 2, cy: vh / 2 - 60, w: vw, h: vh };
    this.cy = this.baseView.cy;
    this.builtKey = '';
  }

  // ---- static content: the ground lines, pads, accelerators, stars ---------------------
  // `state` is the core's game state. Stars are laid once per seed; the ground
  // lines are built for the three chunks around the camera and rebuilt when the
  // camera crosses into a new chunk or the world's version ticks (a pad used).
  setWorld(state) {
    this.world = state;
    this.rangeCache = {};
    this.rngState = (state.seed || 1) >>> 0;
    this.stars = [];
    for (let i = 0; i < 480; i++) {
      this.stars.push([-4000 + this._rand() * 12000, -600 + this._rand() * 13000, Z_STARS - this._rand() * 3000, 0.3 + this._rand() * this._rand() * 1.0]);
    }
    // the wide view opens with the ship a quarter in from the left, heading right
    const bv = this.baseView;
    const sx = state.ship ? state.ship.x : 0;
    bv.cx = sx + bv.w * 0.25;
    this.cx = bv.cx; this.cy = bv.cy;
    this.builtKey = '';
    this._buildStatic();
  }
  // A parallax range for chunk k: seam heights hashed so neighbours meet.
  _range(kind, k) {
    const key = kind + ':' + k;
    if (this.rangeCache[key]) return this.rangeCache[key];
    const C = globalThis.LunarCore;
    const spec = kind === 'farther' ? { n: 30, lo: 700, hi: 1700, sm: 0.45, salt: 11 } : kind === 'far' ? { n: 44, lo: 260, hi: 980, sm: 0.5, salt: 23 } : { n: 60, lo: -340, hi: 30, sm: 0.5, salt: 37 };
    const seed = (this.world && this.world.seed) || 1;
    const seam = (kk) => spec.lo + (C.hashSeed(seed, kk * 13 + spec.salt) / 4294967296) * (spec.hi - spec.lo);
    const rng = C.mulberry32(C.hashSeed(seed, k * 101 + spec.salt));
    const pts = [];
    let prev = seam(k);
    for (let i = 0; i <= spec.n; i++) {
      let y = spec.lo + rng() * (spec.hi - spec.lo);
      y = prev + (y - prev) * spec.sm;
      prev = y;
      pts.push([k * CHUNK_W + CHUNK_W * i / spec.n, y]);
    }
    pts[0][1] = seam(k);
    pts[spec.n][1] = seam(k + 1);
    pts[1][1] = (pts[0][1] + pts[2][1]) * 0.5;
    pts[spec.n - 1][1] = (pts[spec.n][1] + pts[spec.n - 2][1]) * 0.5;
    this.rangeCache[key] = pts;
    return pts;
  }
  // Does the static content need rebuilding for the camera at cx?
  _syncStatic() {
    if (!this.world) return;
    const C = globalThis.LunarCore;
    const kc = C.chunkIndex(this.cx);
    const half = Math.max(1, Math.ceil((this.view ? this.view.w : CHUNK_W) / CHUNK_W / 2) + 1);   // enough chunks for the current view width
    const key = kc + '|' + half + '|' + this.world.world.version + '|' + this.params.depth + '|' + this.params.stars + '|' + this.params.brightness + '|' + this.launchPadId;
    if (key === this.builtKey) return;
    this.builtKey = key;
    this.chunkSpan = [kc - half, kc + half];
    this._buildStatic();
  }
  _buildStatic() {
    const W = this.world;
    const P = this.params;
    const D = P.depth;
    const zFar = Z_FAR * D, zFarther = Z_FARTHER * D, zNear = Z_NEAR * D;
    const C = globalThis.LunarCore;
    const [k0, k1] = this.chunkSpan;
    const join = (kind) => {
      const out = [];
      for (let k = k0; k <= k1; k++) {
        const pts = this._range(kind, k);
        for (let i = out.length ? 1 : 0; i < pts.length; i++) out.push(pts[i]);
      }
      return out;
    };
    // stars
    const S = this.starBatch;
    S.begin();
    if (P.stars > 0) for (const s of this.stars) {
      // the 12,000 ft star field is tiled three times around the camera, so it
      // never runs out however far the view pulls back or scrolls
      const x = s[0] + Math.round((this.cx - s[0]) / 12000) * 12000;
      for (const dx of [-12000, 0, 12000]) S.seg(x + dx, s[1], s[2], x + dx, s[1], s[2], s[3] * P.stars * 3.2);
    }
    S.end();
    if (!W) {
      const flat = [[k0 * CHUNK_W, 0], [(k1 + 1) * CHUNK_W, 0]];
      for (const b of [this.fartherBatch, this.farBatch, this.flightBatch, this.nearBatch]) { b.begin(); b.end(); }
      this.fartherFill.set(flat, zFarther); this.farFill.set(flat, zFar); this.flightFill.set(flat, 0); this.nearFill.set([[k0 * CHUNK_W, -400], [(k1 + 1) * CHUNK_W, -400]], zNear);
      return;
    }
    // the farthest range
    const farther = join('farther');
    const FF = this.fartherBatch;
    FF.begin(); FF.poly2(farther, 0.38, 0, 0, zFarther); FF.end();
    this.fartherFill.set(farther, zFarther);
    // far line
    const far = join('far');
    const F = this.farBatch;
    F.begin(); F.poly2(far, 0.55, 0, 0, zFar); F.end();
    this.farFill.set(far, zFar);
    // the flight line, with pads (their aprons are part of the terrain) and the accelerators at rest
    const B = this.flightBatch;
    B.begin();
    const flight = [];
    for (let k = k0; k <= k1; k++) {
      const ch = C.getChunk(W, k);
      for (let i = flight.length ? 1 : 0; i < ch.pts.length; i++) flight.push(ch.pts[i]);
      for (const p of ch.pads) {
        const b = p.used ? 0.9 : 2.2, tb = p.used ? 0.6 : 1.2;
        B.seg2(p.x0, p.y, p.x1, p.y, b);
        B.seg2(p.x0, p.y, p.x0, p.y + 7, tb);
        B.seg2(p.x1, p.y, p.x1, p.y + 7, tb);
        // the multiplier and the fuel mark are DOM labels the shell places (contemporary type, not stroke lettering).
        // The accelerator is NOT drawn at rest (James: "they should just appear magically when the person finishes their landing").
        if (p.relay) this._relayTower(B, p, 0.55);
      }
      // the horizon ring far above this chunk: faint, a way out for the high flyer
      {
        const ring = C.horizonRing(k);
        const n = 48;
        for (let j = 0; j < n; j++) {
          const a0 = Math.PI * 2 * j / n, a1 = Math.PI * 2 * (j + 1) / n;
          B.seg2(ring.x + Math.cos(a0) * ring.r, ring.y + Math.sin(a0) * ring.r, ring.x + Math.cos(a1) * ring.r, ring.y + Math.sin(a1) * ring.r, 0.22);
        }
        for (let j = 0; j < 12; j++) {
          const a = Math.PI * 2 * j / 12;
          B.seg2(ring.x + Math.cos(a) * (ring.r + 8), ring.y + Math.sin(a) * (ring.r + 8), ring.x + Math.cos(a) * (ring.r + 18), ring.y + Math.sin(a) * (ring.r + 18), 0.18);
        }
      }
    }
    B.poly2(flight, 1.0, 0, 0, 0);
    B.end();
    this.flightFill.set(flight, 0);
    // the near (front) line was cut 2026-09-04 — it only ever showed when the
    // view pulled back and James found it "weird looking"; the batch stays
    // empty so the draw order is unchanged
    const N = this.nearBatch;
    N.begin(); N.end();
    this.nearFill.set([[k0 * CHUNK_W, -9000], [(k1 + 1) * CHUNK_W, -9000]], zNear);
  }
  // A derelict relay tower left of its pad: a tapered mast with a cross-braced
  // base, a dish, and one lamp at the top. The lamp blinks (drawn live); the
  // mast itself is static.
  _relayTower(batch, pad, dim) {
    const x = pad.x0 - 34, y = pad.y, h = 96;
    batch.seg2(x - 9, y, x - 3, y + h, dim); batch.seg2(x + 9, y, x + 3, y + h, dim);
    batch.seg2(x - 3, y + h, x + 3, y + h, dim);
    for (let i = 1; i <= 5; i++) { const yy = y + h * i / 6, w = 9 - 6 * i / 6; batch.seg2(x - w, yy, x + w, yy, dim * 0.7); }
    batch.seg2(x - 9, y, x + 6, y + h / 3, dim * 0.5); batch.seg2(x + 9, y, x - 6, y + h / 3, dim * 0.5);
    // the dish, hanging off the mast two thirds up, aimed away
    const dy = y + h * 0.66;
    batch.seg2(x + 3, dy, x + 12, dy + 4, dim);
    for (let j = 0; j < 8; j++) { const a0 = -Math.PI / 2 + Math.PI * j / 8, a1 = -Math.PI / 2 + Math.PI * (j + 1) / 8; batch.seg2(x + 12 + Math.cos(a0) * 7, dy + 4 + Math.sin(a0) * 7, x + 12 + Math.cos(a1) * 7, dy + 4 + Math.sin(a1) * 7, dim * 0.9); }
    // the lamp mount
    batch.seg2(x, y + h, x, y + h + 6, dim);
  }
  // The ring accelerator beside a pad — a magnetic launcher: a twin-spine
  // truss rail along the RIGHT side of the ring stack (so it lies under the
  // rings when tipped), cross-braced at every ring, each ring clamped to the
  // rail by a coil bracket; a heavy base plate with a power block and a
  // pivot. Standing upright at rest (never drawn then), tilted by `tilt`
  // radians when launching; rings 0..lit-1 are lit.
  _accelerator(batch, pad, tilt, lit, dim, sink) {
    const C = globalThis.LunarCore;
    const A = C.ACCEL;
    const base0 = C.accelBase(pad);
    // sink 0..1: the whole machine sits this far down into the ground (it rises
    // out of the apron at the start of the sequence and sinks back after);
    // everything below the pad line is clipped away
    const drop = (sink || 0) * (A.railLen + 26);
    const base = { x: base0.x, y: base0.y - drop };
    const groundY = base0.y;
    const c = Math.cos(Math.PI / 2 - tilt), s = Math.sin(Math.PI / 2 - tilt);   // rail direction
    const rx = s, ry = -c;                                                        // rightward normal
    const P = (d, n, z) => [base.x + c * d + rx * n, base.y + s * d + ry * n, z || 0];   // (along, across) → world
    const clipSeg = (x0, y0, z0, x1, y1, z1, b) => {
      if (y0 < groundY && y1 < groundY) return;
      if (y0 < groundY) { const t = (groundY - y0) / (y1 - y0); x0 += (x1 - x0) * t; z0 += (z1 - z0) * t; y0 = groundY; }
      else if (y1 < groundY) { const t = (groundY - y1) / (y0 - y1); x1 += (x0 - x1) * t; z1 += (z0 - z1) * t; y1 = groundY; }
      batch.seg(x0, y0, z0, x1, y1, z1, b);
    };
    const seg = (p, q, b) => clipSeg(p[0], p[1], p[2], q[0], q[1], q[2], b);
    const seg2 = (x0, y0, x1, y1, b) => clipSeg(x0, y0, 0, x1, y1, 0, b);
    const heavy = dim * 1.5, mid = dim * 1.1, light = dim * 0.7;
    const R = A.ringR;
    const spineA = R + 3, spineB = R + 9;     // the two spines of the truss, right of the rings
    // --- base plate: a low box under the whole footprint, upright regardless of tilt
    const bx0 = base.x - R - 6, bx1 = base.x + spineB + 10, by = base.y;
    seg2(bx0, by, bx1, by, heavy);
    seg2(bx0, by + 5, bx1, by + 5, heavy);
    seg2(bx0, by, bx0, by + 5, heavy);
    seg2(bx1, by, bx1, by + 5, heavy);
    for (let i = 1; i < 6; i++) { const x = bx0 + (bx1 - bx0) * i / 6; seg2(x, by, x, by + 5, light); }
    // --- power block: a squat cabinet on the right end of the plate, with a hatch and a vent
    const pw0 = base.x + spineB - 4, pw1 = base.x + spineB + 10;
    seg2(pw0, by + 5, pw0, by + 17, mid); seg2(pw1, by + 5, pw1, by + 17, mid); seg2(pw0, by + 17, pw1, by + 17, mid);
    seg2(pw0 + 3, by + 8, pw1 - 3, by + 8, light); seg2(pw0 + 3, by + 11, pw1 - 3, by + 11, light); seg2(pw0 + 3, by + 14, pw1 - 3, by + 14, light);
    // --- pivot: a hub on the plate where the rail turns, with the rail's feet meeting it
    const hub = [base.x + (spineA + spineB) / 2, by + 8];
    for (let i = 0; i < 8; i++) {
      const a0 = Math.PI * 2 * i / 8, a1 = Math.PI * 2 * (i + 1) / 8;
      seg2(hub[0] + Math.cos(a0) * 4, hub[1] + Math.sin(a0) * 4, hub[0] + Math.cos(a1) * 4, hub[1] + Math.sin(a1) * 4, mid);
    }
    // --- the truss rail: two spines from the hub to the top, cross-braced at every ring
    const d0 = 8, dTop = A.railLen + 6;
    seg(P(d0, spineA), P(dTop, spineA), heavy);
    seg(P(d0, spineB), P(dTop, spineB), heavy);
    seg(P(dTop, spineA), P(dTop, spineB), heavy);
    const ringAt = (i) => 18 + (A.railLen - 18) * i / (A.rings - 1);
    let prevD = d0;
    for (let i = 0; i < A.rings; i++) {
      const d = ringAt(i);
      // cross brace + diagonal between spines
      seg(P(d, spineA), P(d, spineB), mid);
      seg(P(prevD, spineA), P(d, spineB), light);
      prevD = d;
      // coil bracket: a short clamp from the rail to the ring's rim, with a coil box
      seg(P(d, spineA), P(d, R), mid);
      seg(P(d - 2.5, R - 1), P(d + 2.5, R - 1), mid);
      seg(P(d - 2.5, R - 1), P(d - 2.5, spineA), mid);
      seg(P(d + 2.5, R - 1), P(d + 2.5, spineA), mid);
      // the ring itself, perpendicular to the rail; lit rings blaze
      const bright = i < lit ? 2.4 : dim;
      const n = 20;
      const cpt = P(d, 0);
      for (let j = 0; j < n; j++) {
        const a0 = Math.PI * 2 * j / n, a1 = Math.PI * 2 * (j + 1) / n;
        clipSeg(cpt[0] + rx * Math.cos(a0) * R, cpt[1] + ry * Math.cos(a0) * R, Math.sin(a0) * R,
          cpt[0] + rx * Math.cos(a1) * R, cpt[1] + ry * Math.cos(a1) * R, Math.sin(a1) * R, bright);
      }
      // a second, inner ring on lit ones: the field
      if (i < lit) for (let j = 0; j < n; j++) {
        const a0 = Math.PI * 2 * j / n, a1 = Math.PI * 2 * (j + 1) / n, r2 = R * 0.72;
        clipSeg(cpt[0] + rx * Math.cos(a0) * r2, cpt[1] + ry * Math.cos(a0) * r2, Math.sin(a0) * r2,
          cpt[0] + rx * Math.cos(a1) * r2, cpt[1] + ry * Math.cos(a1) * r2, Math.sin(a1) * r2, 1.4);
      }
    }
    // --- a cable run from the power block up the outer spine
    seg([pw0 + 2, by + 17, 0], P(d0 + 6, spineB + 2), light);
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
  spawnLaunch(x, y, angle) {
    for (let i = 0; i < 40; i++) this._spark(x, y, 0, 60 + this._rand() * 160, 0.9, 1.2);
    this.effects.push({ kind: 'ring', x, y: y + 0.5, age: 0, life: 0.8, r0: 6, r1: 90, b: 1.3 });
    this.flash = 0.5;
    this.streak = 1.8;                 // seconds of speed trail behind the ship
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
    const rate = (80 + thrust * 560) * P.plume;
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
        if (this.world) {
          const gy = this._groundAt(e.x);
          if (e.y < gy) { e.y = gy; e.vy = -e.vy * 0.35; e.vx *= 0.7; e.vz *= 0.7; e.av *= 0.6; }
        }
      } else if (e.kind === 'dust' && !e.settled && this.world) {
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
      if (this.world) {
        const gy = this._groundAt(p.x);
        if (p.y < gy) { p.y = gy; p.vy = -p.vy * 0.2; p.vx *= 0.6; p.life = Math.min(p.life, p.age + 0.12); }
      }
      pk.push(p);
    }
    this.particles = pk;
  }
  _groundAt(x) {
    if (!this.world) return 0;
    return globalThis.LunarCore.groundAt(this.world, x);
  }

  // The faint body under the lines: convex hull (monotone chain) of the pod and
  // descent-stage rings projected into the flight plane, as a triangle fan.
  _bodyFill(tr) {
    const pts = [];
    for (const q of BODY_POINTS) { const w = tr(q[0], q[1], q[2]); pts.push([w[0], w[1]]); }
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
    const pos = this.bodyGeo.attributes.position;
    let n = 0;
    const put = (p, dx) => { pos.array[n * 3] = p[0] + dx; pos.array[n * 3 + 1] = p[1]; pos.array[n * 3 + 2] = 0.5; n++; };
    for (let i = 1; i < hull.length - 1 && n + 3 <= pos.count; i++) { put(hull[0], 0); put(hull[i], 0); put(hull[i + 1], 0); }
    pos.needsUpdate = true;
    pos.updateRanges = [{ start: 0, count: n * 3 }];
    this.bodyGeo.setDrawRange(0, n);
  }

  // ---- camera ---------------------------------------------------------------------------------
  _updateCamera(view, dt) {
    const P = this.params;
    const bv = this.baseView;
    // the wide view pulls back further still when the ship climbs past the top
    // (James: "way above the top of the screen... I couldn't see my ship") —
    // zoom drops below 1 just enough to hold the ship halfway between centre
    // and the top of the screen (clear of the console), never below ZOOM_MIN
    let wide = 1, lift = 0;
    if (view && view.ship) {
      const up = view.ship.y - bv.cy;
      if (up > bv.h * 0.25) wide = Math.max(ZOOM_MIN, (bv.h * 0.25) / up);
      // once the zoom is at its floor the camera pans UP instead, so a very
      // high ship (and the horizon ring it is aiming for) never climbs behind
      // the console (James: "they go behind the HUD... you can't see anything")
      if (wide <= ZOOM_MIN + 1e-6) lift = Math.max(0, up - (bv.h * 0.25) / ZOOM_MIN);
    }
    const target = view && view.zoomOn ? P.zoomNear : wide;
    const k = 1 - Math.exp(-dt / CAM_TAU);
    this.zoom += (target - this.zoom) * k;
    const t = Math.max(0, Math.min(1, (this.zoom - 1) / Math.max(0.001, P.zoomNear - 1)));
    const vw = bv.w / this.zoom, vh = bv.h / this.zoom;
    // the wide view scrolls with the ship: dead zone, then an ease that tightens
    // toward the screen edge (core cameraFollow, sim-proven not to pump)
    if (view && view.ship) bv.cx = globalThis.LunarCore.cameraFollow(bv.cx, view.ship.x, Math.max(bv.w, vw), dt);
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
    if (t > 0.02) this.cy += (ty - this.cy) * k;
    else { this.cx = bv.cx; this.cy += (bv.cy + lift - this.cy) * k; }
    this._syncStatic();
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
  // view: { ship, thrust, rotate, zoomOn, gravity, showShip, secret, flying, launch: { pad, tilt, lit } | null,
  //         tech: [ids], fan: 0..1 (spider spread), squash: 0..1 (shock compression),
  //         autoOn: bool,
  //         relayLit: padId | null (the tower you sit at), hatch: {x, y} | null (the wreck's door) }
  render(view, dt) {
    dt = Math.min(0.1, Math.max(0, dt || 0));
    this.time += dt;
    const P = this.params;
    const cw = window.innerWidth || this.canvas.clientWidth || 0;
    const chh = window.innerHeight || this.canvas.clientHeight || 0;
    if (cw > 2 && chh > 2 && (cw !== this.w || chh !== this.h)) this.resize(cw, chh);
    // an animating accelerator replaces its resting copy in the static lines
    const lp = view && view.launch && view.launch.pad ? view.launch.pad.id : '';
    if (lp !== this.launchPadId) { this.launchPadId = lp; this.builtKey = ''; }
    this._updateCamera(view, dt);
    this._stepEffects(dt, view && view.gravity);
    this.flash = Math.max(0, this.flash - dt * 2.4);

    const D = this.dynBatch;
    D.begin();
    this.shipBatch.begin();
    this.bodyGeo.setDrawRange(0, 0);
    const zt = this.view ? this.view.t : 0;
    // the lander is drawn larger than true: 1.76× in the wide view, 1.0× on approach (James: 20% down from round three's first cut)
    const ds = 1.0 + 0.76 * (1 - zt);
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
      const F = this.shipBatch;
      // an edge is "front" when its midpoint faces the camera after the yaw; back edges dim
      const edge = (a, b, bright, dx) => {
        const zm = (a[2] + b[2]) * 0.5;
        if (zm < -1.5 * ds) D.seg(a[0] + dx, a[1], a[2], b[0] + dx, b[1], b[2], bright * 0.38);
        else F.seg(a[0] + dx, a[1], a[2], b[0] + dx, b[1], b[2], bright);
      };
      // Feet sit ON the pad line. The legs splay in depth (z = ±15 ft) and the
      // pad is a line at z = 0, so under perspective the near feet drew a few
      // pixels below the line and the far feet above it — James read that as
      // "resting a few pixels below the line." Any vertex at foot level is
      // pulled onto the flight plane's projection (per wrap copy), so the foot
      // lands exactly where the pad is, whatever the camera is doing.
      const camD = this.camDist, camX = this.cx, camY = this.cy;
      const onLine = (p, dx) => {
        const f = (camD - p[2]) / camD;
        return [camX + (p[0] + dx - camX) * f - dx, camY + (p[1] - camY) * f, p[2]];
      };
      const FOOT = -10.9;
      const squash = Math.max(0, Math.min(1, view.squash || 0));
      const fan = Math.max(0, Math.min(1, view.fan || 0));
      const tech = view.tech || [];
      const techSegs = [];
      for (const id of tech) for (const q of buildTech(id, fan, squash)) techSegs.push(q);
      const autoGlow = view.autoOn ? 0.6 + 0.4 * Math.sin(this.time * 6) : 0;
      // the body fill: the convex hull of the two stages' rings, in the flight plane
      this._bodyFill(tr);
      for (const dx of [0]) {
        for (const q of LANDER) {
          // shock legs compress: anything at foot level rides up a little
          const y0 = q[1] <= FOOT ? q[1] + 3.2 * squash : q[1], y1 = q[4] <= FOOT ? q[4] + 3.2 * squash : q[4];
          let a = tr(q[0], y0, q[2]), b = tr(q[3], y1, q[5]);
          if (q[1] <= FOOT) a = onLine(a, dx);
          if (q[4] <= FOOT) b = onLine(b, dx);
          edge(a, b, sb, dx);
        }
        for (const q of techSegs) {
          let a = tr(q[0], q[1], q[2]), b = tr(q[3], q[4], q[5]);
          if (q[1] <= FOOT) a = onLine(a, dx);
          if (q[4] <= FOOT) b = onLine(b, dx);
          edge(a, b, sb * 0.95, dx);
        }
        if (autoGlow > 0) {
          const a = tr(-5.1, -1.2, 3.1), b = tr(-5.1, 0.2, 3.1);
          D.seg(a[0] + dx, a[1], a[2], b[0] + dx, b[1], b[2], 1.2 + autoGlow);
        }
        const th = view.thrust || 0;
        if (th > 0.01) {
          // a short bright core at the bell mouth; the particle plume is the flame
          const a = tr(0, -9.9, 0), b = tr(0, -9.9 - 3 - th * 5, 0);
          D.seg(a[0] + dx, a[1], a[2], b[0] + dx, b[1], b[2], 1.2 + th * 1.0);
        }
        // the direction indicator: a very faint circle around the ship and a
        // little triangle riding it at the velocity heading; brighter with speed
        if (view.flying) {
          // James: a visual aid, not part of the ship — far out, barely visible,
          // the triangle only ~20% brighter than the circle
          const spd = Math.hypot(s.vx, s.vy);
          const k = Math.max(0, Math.min(1, (spd - 2) / 40));
          if (k > 0) {
            const R = 60 * ds;
            const n = 48;
            const cb = P.ringBright * (0.6 + 0.4 * k);
            const tbase = P.triBright * (0.6 + 0.4 * k);
            for (let i = 0; i < n; i++) {
              const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
              D.seg(s.x + dx + Math.cos(a0) * R, s.y + Math.sin(a0) * R, 0, s.x + dx + Math.cos(a1) * R, s.y + Math.sin(a1) * R, 0, cb);
            }
            const h = Math.atan2(s.vy, s.vx);
            const tipR = R + 3.2 * ds, baseR = R - 0.8 * ds, half = 0.05;
            const tip = [s.x + dx + Math.cos(h) * tipR, s.y + Math.sin(h) * tipR];
            const l = [s.x + dx + Math.cos(h - half) * baseR, s.y + Math.sin(h - half) * baseR];
            const r = [s.x + dx + Math.cos(h + half) * baseR, s.y + Math.sin(h + half) * baseR];
            const tb = tbase;
            D.seg(tip[0], tip[1], 0, l[0], l[1], 0, tb); D.seg(l[0], l[1], 0, r[0], r[1], 0, tb); D.seg(r[0], r[1], 0, tip[0], tip[1], 0, tb);
          }
        }
      }
      if (view.flying) {
        if (this.streak > 0) {
          // the launch whoosh: a fading trail of motes streaming off the ship
          this.streak -= dt;
          let n = 260 * dt;
          while (n-- > 0 && this.particles.length < MAX_PARTICLES) {
            const j = (this._rand() - 0.5) * 14 * ds;
            this.particles.push({ x: s.x + j, y: s.y - 6 * ds + (this._rand() - 0.5) * 10 * ds, z: (this._rand() - 0.5) * 10 * ds,
              vx: s.vx * (0.2 + this._rand() * 0.3) - s.vx * 0.5, vy: s.vy * (0.2 + this._rand() * 0.3) - s.vy * 0.5, vz: 0,
              age: 0, life: 0.25 + this._rand() * 0.35, b: 0.5 + 0.6 * Math.max(0, this.streak) });
          }
        }
        if ((view.thrust || 0) > 0.01) this._plume(s, view.thrust, dt, ds);
        if (view.rotate) {
          this.rcsTimer -= dt;
          if (this.rcsTimer <= 0) { this._rcs(s, view.rotate, ds); this.rcsTimer = 0.07; }
        }
      }
    }
    if (view && view.secret && this.world && view.ship) {
      const S = globalThis.LunarCore.getChunk(this.world, globalThis.LunarCore.chunkIndex(view.ship.x)).secret;
      if (!S) { /* nothing */ } else {
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
      // the doorway under the arches, lit: the way in (a drift exit)
      const gl = 1.4 + 0.5 * Math.sin(this.time * 2.2);
      D.poly2([[bx + 36, by], [bx + 36, by + 18], [bx + 48, by + 18], [bx + 48, by]], gl);
      D.seg2(bx + 38, by + 2, bx + 46, by + 2, gl * 0.6); D.seg2(bx + 38, by + 16, bx + 46, by + 16, gl * 0.6);
      }
    }
    // relay lamps: blink once a second; solid on the tower you have landed at
    if (this.world) {
      const C = globalThis.LunarCore;
      const [k0, k1] = this.chunkSpan;
      const blink = (Math.sin(this.time * Math.PI * 2) > 0.6) ? 1 : 0;
      for (let k = k0; k <= k1; k++) for (const p of C.getChunk(this.world, k).pads) if (p.relay) {
        const lit = (view && view.relayLit === p.id) ? 1 : blink;
        if (!lit) continue;
        const x = p.x0 - 34, y = p.y + 102;
        const b = view && view.relayLit === p.id ? 2.4 : 1.6;
        for (let j = 0; j < 8; j++) { const a0 = Math.PI * 2 * j / 8, a1 = Math.PI * 2 * (j + 1) / 8; D.seg2(x + Math.cos(a0) * 3, y + Math.sin(a0) * 3, x + Math.cos(a1) * 3, y + Math.sin(a1) * 3, b); }
        if (view && view.relayLit === p.id) {
          // the door at the foot of the tower opens: a lit frame
          D.poly2([[x - 5, p.y], [x - 5, p.y + 14], [x + 5, p.y + 14], [x + 5, p.y]], 1.8);
          D.seg2(x - 3, p.y + 2, x + 3, p.y + 12, 0.9); D.seg2(x + 3, p.y + 2, x - 3, p.y + 12, 0.9);
        }
      }
    }
    // the wreck's hatch: after the last flight, a dim door in the wreckage opens
    if (view && view.hatch) {
      const hx = view.hatch.x, hy = view.hatch.y;
      const pulse = 0.9 + 0.5 * Math.sin(this.time * 3);
      D.poly2([[hx - 6, hy], [hx - 6, hy + 9], [hx + 6, hy + 9], [hx + 6, hy]], pulse);
      D.seg2(hx - 4, hy + 2, hx + 4, hy + 7, pulse * 0.6);
    }
    // the launch: the accelerator by the pad tilts and lights ring by ring
    if (view && view.launch && view.launch.pad) {
      const L = view.launch;
      // it appears as the sequence begins (rise 0→1 over the first half second)
      this._accelerator(D, L.pad, L.tilt || 0, L.lit || 0, 0.9, L.sink || 0);
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
    this.shipBatch.end();

    const scale = this.ph / 1080;
    const width = Math.max(1.0, P.lineWeight * scale);
    const gain = P.brightness * (1 + this.flash * 0.5);
    for (const b of this.worldBatches) {
      b.mat.uniforms.uWidth.value = width;
      b.mat.uniforms.uHalf.value = width * 0.5 + width * 2.0 + 1.5;
      b.mat.uniforms.uGain.value = gain;
    }
    this.dynBatch.mat.uniforms.uGain.value = 1 + this.flash * 0.5;   // the live things are authored in absolute terms
    // the ship's front edges carry a heavier stroke than the world
    const sw = width * 1.05;   // was 1.3; James: "a little bit thinner"
    this.shipBatch.mat.uniforms.uWidth.value = sw;
    this.shipBatch.mat.uniforms.uHalf.value = sw * 0.5 + sw * 2.0 + 1.5;
    this.shipBatch.mat.uniforms.uGain.value = 1 + this.flash * 0.5;

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
    cu.uGlow.value = P.glow;
    cu.uFlash.value = this.flash * 0.3;
    cu.uTint.value.setHSL(P.hue, 1, 0.5).lerp(new THREE.Color(1, 1, 1), 1 - P.saturation);
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  dispose() { this.renderer.dispose(); }
}
