// Surround — the 3D arena renderer.
//
// Pure presentation: no game rules, no DOM, no audio, no input. game.js drives
// it in the world; tmp/surround/lookdev.html drives it silently for look
// development (that harness is where the gas gets judged before it flies).
//
// Everything the eye sees is here: the glass floor and its containment field,
// the light-walls that rise behind each rider, the mirrored underworld, the
// territory wash, and the bloom/tone-map chain that ties it together.
import * as THREE from 'three';

// ---- tunables ---------------------------------------------------------------
// Every one of these is live except `arena`, which rebuilds geometry.
export const DEFAULT_PARAMS = {
  tilt: 0.62,        // 0 = straight down, 1 = low and dramatic
  zoom: 1.0,
  drift: 0.35,       // idle camera breathing (James gets motion sick — keep low)
  bloom: 1.0,
  wallHeight: 1.15,  // in cells
  reflect: 0.55,
  glow: 1.0,
  grid: 1.0,
  territory: 0.5,
  field: 0.9,        // containment wall brightness
  dust: 0.7,
  retro: 0.3,        // grain + aberration + scanlines
  cool: 1.0,         // how fast the tail cools behind the head
  res: 1.0,          // render scale — trade sharpness for framerate by eye
};

// Fill-rate discipline: the bloom chain runs ~8 full-screen passes, so a 4K
// panel would otherwise ask for 18M pixels a frame. Cap the scene buffer and
// let the browser upscale — neon with bloom hides the softness.
const PIXEL_BUDGET = 2.9e6;

const MAX_RINGS = 4;
const MAX_SPARKS = 900;

// How much of the frame the arena is allowed to claim, in NDC. Just shy of the
// edges: the HUD floats over the top and the title over the bottom.
const FIT_X = 0.99;
const FIT_Y = 0.94;

// ---- shared shader pieces -----------------------------------------------------
const COMMON = `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
`;

// ---- the light-wall ------------------------------------------------------------
// One geometry per rider, drawn three ways: the vertical ribbon, the hot rail
// capping it, and the soft bleed where it meets the floor. uMode picks which.
const TRAIL_VERT = `
  attribute float aV;      // 0 = floor edge, 1 = top edge
  attribute float aSide;   // -1 / +1 across a strip
  attribute vec2  aOff;    // unit miter perpendicular, in cells
  attribute float aAge;    // tick index this point was laid at

  uniform float uNow;      // fractional tick index
  uniform float uHeight;
  uniform float uWidth;
  uniform float uLift;
  uniform float uBirth;
  uniform float uMode;     // 0 wall, 1 rail, 2 floor bleed
  uniform float uMirror;

  varying float vAge;
  varying float vV;
  varying float vSide;

  void main() {
    float age = max(0.0, uNow - aAge);
    float grow = clamp(age / uBirth, 0.0, 1.0);
    grow = grow * grow * (3.0 - 2.0 * grow);

    vec3 p = position;
    float h = 0.0;
    if (uMode < 0.5)      h = aV * uHeight * grow;   // ribbon
    else if (uMode < 1.5) h = uHeight * grow;        // rail rides the top
    else                  h = 0.0;                   // bleed lies on the floor

    p.y = h + uLift;
    if (uMode > 0.5) p.xz += aOff * uWidth * aSide;

    vAge = age;
    vV = (uMode < 0.5) ? aV : 1.0;
    vSide = aSide;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const TRAIL_FRAG = `
  precision highp float;
  ${COMMON}
  uniform vec3  uBody;
  uniform vec3  uHot;
  uniform vec3  uCold;
  uniform float uTime;
  uniform float uGlow;
  uniform float uCool;
  uniform float uMode;
  uniform float uMirror;
  uniform float uReflect;
  uniform float uDeathFront;   // sweeps 0 -> maxAge on death, -999 while alive

  varying float vAge;
  varying float vV;
  varying float vSide;

  void main() {
    // Fresh wall runs white-hot right behind the rider and cools into the
    // player colour over the next couple of seconds.
    float fresh = exp(-vAge * 0.09 * uCool);
    vec3 col = mix(uBody, uHot, clamp(fresh * 0.9, 0.0, 1.0));

    float a;
    if (uMode < 0.5) {
      // vertical profile: hot rail at the top, contact bloom at the floor,
      // translucent in between so the arena stays readable through the walls.
      float top = smoothstep(0.70, 1.0, vV);
      float base = smoothstep(0.30, 0.0, vV);
      a = 0.22 + 0.42 * base + 0.55 * top;
      float scan = 0.5 + 0.5 * sin(vAge * 0.5 - uTime * 2.6 + vV * 2.2);
      a *= 0.86 + 0.26 * scan * (1.0 - top);
      col += uHot * top * 0.35;
    } else {
      // Clamped: pow() with a negative base is undefined and the NaN it
      // produces spreads across the whole frame once bloom blurs it.
      float e = max(0.0, 1.0 - abs(vSide));   // triangular cross-section
      if (uMode < 1.5) {
        a = pow(e, 0.6) * 0.95;            // rail: tight and bright
        col = mix(col, uHot, 0.45);
      } else {
        a = pow(e, 1.8) * 0.5;             // floor bleed: wide and soft
      }
      a *= 0.55 + 0.45 * exp(-vAge * 0.05 * uCool);
    }

    // Power-down: a white front runs back along the wall, leaving it cold.
    float w = uDeathFront - vAge;
    float flash = exp(-abs(w) * 0.7);
    col = mix(col, vec3(1.6), clamp(flash, 0.0, 1.0) * 0.85);
    col = mix(col, uCold, smoothstep(0.0, 8.0, w) * 0.65);
    a *= mix(1.0, 0.28, smoothstep(0.0, 4.0, w));

    a *= uReflect;
    if (uMirror > 0.5) a *= mix(0.9, 0.05, vV);   // the reflection dies with depth

    gl_FragColor = vec4(col * uGlow, a);
  }
`;

// ---- the floor -------------------------------------------------------------------
const FLOOR_VERT = `
  varying vec2 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FLOOR_FRAG = `
  precision highp float;
  ${COMMON}
  uniform vec2  uSize;         // arena size in cells
  uniform float uTime;
  uniform float uGrid;
  uniform float uTerritory;
  uniform float uFlash;
  uniform vec3  uC0;
  uniform vec3  uC1;
  uniform vec4  uHead0;        // xz, alive, angle
  uniform vec4  uHead1;
  uniform vec4  uRings[${MAX_RINGS}];   // xz, age(s), strength
  uniform sampler2D uClaim;
  uniform float uGlow;

  varying vec2 vWorld;

  float gridLayer(vec2 p, float scale, float w) {
    vec2 g = abs(fract(p / scale - 0.5) - 0.5) / (fwidth(p / scale) + 1e-5);
    float l = min(g.x, g.y);
    return 1.0 - smoothstep(0.0, w, l);
  }

  float pool(vec2 p, vec4 head, float r) {
    if (head.z < 0.5) return 0.0;
    float d = length(p - head.xy);
    return exp(-d * d / r);
  }

  float beam(vec2 p, vec4 head, float reach) {
    if (head.z < 0.5) return 0.0;
    vec2 dir = vec2(sin(head.w), cos(head.w));
    vec2 rel = p - head.xy;
    float along = dot(rel, dir);
    if (along < 0.0) return 0.0;
    float side = abs(dot(rel, vec2(dir.y, -dir.x)));
    float spread = 0.35 + along * 0.22;
    float f = exp(-(side * side) / (spread * spread));
    return f * exp(-along / reach) * step(along, reach * 2.5);
  }

  void main() {
    vec2 p = vWorld;
    vec2 hs = uSize * 0.5;
    vec2 q = abs(p) - hs;
    float inside = (q.x < 0.0 && q.y < 0.0) ? 1.0 : 0.0;
    float outDist = length(max(q, 0.0));

    // Void grid beyond the arena: the same lattice, fading into the dark.
    float far = exp(-outDist * 0.055);
    vec3 col = vec3(0.004, 0.006, 0.013);

    float minor = gridLayer(p, 1.0, 1.4);
    float major = gridLayer(p, 5.0, 1.6);
    float gridAmt = (minor * 0.055 + major * 0.16) * uGrid;
    gridAmt *= mix(far * 0.75, 1.0, inside);
    col += vec3(0.30, 0.52, 0.95) * gridAmt;

    if (inside > 0.5) {
      col += vec3(0.012, 0.018, 0.038);

      // Territory: who reaches this cell first. Claim texture is eased in JS so
      // the wash slides rather than snapping every tick.
      vec2 uv = (p + hs) / uSize;
      vec4 claim = texture2D(uClaim, uv);
      float bal = claim.r - claim.g;
      vec3 tCol = bal > 0.0 ? uC0 : uC1;
      col += tCol * abs(bal) * 0.16 * uTerritory;
      col += vec3(0.02, 0.03, 0.06) * claim.b;   // scorch under laid wall

      // Perimeter band — the arena reads as a lit table, not a cutout.
      float edge = 1.0 - smoothstep(0.0, 2.2, min(-q.x, -q.y));
      col += vec3(0.24, 0.44, 0.85) * edge * (0.10 + uFlash * 0.75);
    }

    // Light pools and headlights under the riders.
    col += uC0 * pool(p, uHead0, 5.5) * 0.34;
    col += uC1 * pool(p, uHead1, 5.5) * 0.34;
    col += uC0 * beam(p, uHead0, 7.0) * 0.16;
    col += uC1 * beam(p, uHead1, 7.0) * 0.16;

    // Crash shockwaves.
    for (int i = 0; i < ${MAX_RINGS}; i++) {
      vec4 r = uRings[i];
      if (r.w <= 0.001) continue;
      float d = length(p - r.xy);
      float radius = r.z * 26.0;
      float dr = d - radius;
      float ring = exp(-dr * dr * 1.6);
      col += vec3(0.8, 0.9, 1.0) * ring * r.w * exp(-r.z * 1.6);
    }

    col += vec3(0.35, 0.55, 1.0) * uFlash * 0.05;
    gl_FragColor = vec4(col * uGlow, mix(0.55, 0.90, inside));
  }
`;

// ---- containment field ------------------------------------------------------------
const FIELD_VERT = `
  varying vec2 vUvF;
  varying vec3 vWorldPos;
  void main() {
    vUvF = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FIELD_FRAG = `
  precision highp float;
  ${COMMON}
  uniform float uTime;
  uniform float uAmt;
  uniform float uFlash;
  uniform vec3  uC0;
  uniform vec3  uC1;
  uniform vec4  uHead0;
  uniform vec4  uHead1;
  uniform float uGlow;
  varying vec2 vUvF;
  varying vec3 vWorldPos;

  void main() {
    float h = vUvF.y;
    // Bright where it meets the floor, bright along the top rail, glass between.
    float base = smoothstep(0.35, 0.0, h);
    float top = smoothstep(0.86, 1.0, h);
    float body = 0.05 + base * 0.30 + top * 0.75;

    // Hex-ish weave drifting upward.
    vec2 gp = vec2(vUvF.x * 46.0, h * 9.0 - uTime * 0.35);
    float weave = smoothstep(0.86, 1.0, max(
      abs(sin(gp.x + gp.y * 0.5)),
      abs(sin(gp.x - gp.y * 0.5))
    ));
    body += weave * 0.06;

    // The field lights up where a rider comes near it.
    float d0 = length(vWorldPos.xz - uHead0.xy) * (uHead0.z > 0.5 ? 1.0 : 99.0);
    float d1 = length(vWorldPos.xz - uHead1.xy) * (uHead1.z > 0.5 ? 1.0 : 99.0);
    vec3 near = uC0 * exp(-d0 * d0 * 0.03) + uC1 * exp(-d1 * d1 * 0.03);

    vec3 col = vec3(0.20, 0.38, 0.78) * body + near * (0.55 + base * 0.6);
    col += vec3(0.7, 0.85, 1.0) * uFlash * 0.5;

    float a = (body * 0.85 + length(near) * 0.5 + uFlash * 0.35) * uAmt;
    gl_FragColor = vec4(col * uGlow, clamp(a, 0.0, 1.0));
  }
`;

// ---- sparks + dust ------------------------------------------------------------------
const SPARK_VERT = `
  attribute float aSize;
  attribute float aLife;
  attribute vec3  aCol;
  uniform float uScale;
  varying float vLife;
  varying vec3  vCol;
  void main() {
    vLife = aLife;
    vCol = aCol;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.6, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const SPARK_FRAG = `
  precision highp float;
  varying float vLife;
  varying vec3  vCol;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float f = exp(-r * 12.0);
    gl_FragColor = vec4(vCol * f * (0.4 + vLife), f * clamp(vLife, 0.0, 1.0));
  }
`;

const DUST_VERT = `
  attribute float aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vF;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.11 + aSeed * 6.28) * 1.6;
    p.z += cos(uTime * 0.09 + aSeed * 4.71) * 1.6;
    p.y += sin(uTime * 0.07 + aSeed * 9.42) * 0.9;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vF = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.8 + aSeed * 12.0));
    gl_PointSize = (1.0 + aSeed * 2.0) * uScale / max(0.6, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = `
  precision highp float;
  uniform float uAmt;
  varying float vF;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float f = exp(-r * 10.0);
    gl_FragColor = vec4(vec3(0.55, 0.72, 1.0) * f * vF, f * vF * 0.30 * uAmt);
  }
`;

// ---- head shaft ----------------------------------------------------------------------
const SHAFT_VERT = `
  varying vec2 vUvS;
  void main() {
    vUvS = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHAFT_FRAG = `
  precision highp float;
  uniform vec3  uCol;
  uniform float uAmt;
  varying vec2 vUvS;
  void main() {
    float x = max(0.0, 1.0 - abs(vUvS.x - 0.5) * 2.0);
    float y = pow(max(0.0, 1.0 - vUvS.y), 2.2);
    float f = pow(x, 2.5) * y;
    gl_FragColor = vec4(uCol * f, f * 0.5 * uAmt);
  }
`;

// ---- post chain -----------------------------------------------------------------------
const FS_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = `
  precision highp float;
  uniform sampler2D tSrc;
  uniform float uThresh;
  uniform float uKnee;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb;
    // A single NaN pixel would smear across the entire frame once the blur
    // runs. NaN fails every comparison, so this filters it out; the clamp
    // tames any runaway additive pile-up at the same time.
    c = vec3(c.r >= 0.0 ? c.r : 0.0, c.g >= 0.0 ? c.g : 0.0, c.b >= 0.0 ? c.b : 0.0);
    c = min(c, vec3(64.0));
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(uThresh, uThresh + uKnee, l);
    gl_FragColor = vec4(c * k, 1.0);
  }
`;

const BLUR_FRAG = `
  precision highp float;
  uniform sampler2D tSrc;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 s = texture2D(tSrc, vUv).rgb * 0.227027;
    s += texture2D(tSrc, vUv + uDir * 1.3846).rgb * 0.316216;
    s += texture2D(tSrc, vUv - uDir * 1.3846).rgb * 0.316216;
    s += texture2D(tSrc, vUv + uDir * 3.2308).rgb * 0.070270;
    s += texture2D(tSrc, vUv - uDir * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(s, 1.0);
  }
`;

const COMPOSITE_FRAG = `
  precision highp float;
  ${COMMON}
  uniform sampler2D tScene;
  uniform sampler2D tB0;
  uniform sampler2D tB1;
  uniform sampler2D tB2;
  uniform float uBloom;
  uniform float uTime;
  uniform float uRetro;
  uniform vec3  uTint;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 off = uv - 0.5;
    float r2 = dot(off, off);

    // Lens: the colour fringing only bites in the corners.
    float ab = 0.0016 * uRetro * r2 * 4.0;
    vec3 scene;
    scene.r = texture2D(tScene, uv + off * ab).r;
    scene.g = texture2D(tScene, uv).g;
    scene.b = texture2D(tScene, uv - off * ab).b;
    scene = vec3(scene.r >= 0.0 ? scene.r : 0.0,
                 scene.g >= 0.0 ? scene.g : 0.0,
                 scene.b >= 0.0 ? scene.b : 0.0);

    vec3 bloom = texture2D(tB0, uv).rgb * 1.0
               + texture2D(tB1, uv).rgb * 0.72
               + texture2D(tB2, uv).rgb * 0.48;

    vec3 col = scene + bloom * uBloom * 0.55;
    col += uTint * (0.035 + r2 * 0.16);              // the void takes the leader's colour
    col = aces(col * 1.06);
    col *= 1.0 - smoothstep(0.15, 0.78, r2) * 0.55;  // vignette

    float grain = (hash21(uv * 900.0 + fract(uTime) * 77.0) - 0.5) * 0.035 * uRetro;
    col += grain;
    col *= 1.0 - 0.020 * uRetro * (0.5 + 0.5 * sin(uv.y * 1400.0));

    gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
  }
`;

// ---- helpers -------------------------------------------------------------------------------
function fsQuad(material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0, 3, -1, 0, -1, 3, 0,
  ]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  return new THREE.Mesh(geo, material);
}

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---- one rider's wall ---------------------------------------------------------------------
class Trail {
  constructor(maxPoints, colors, glowUniforms) {
    this.max = maxPoints;
    this.n = 0;
    this.pts = new Float32Array(maxPoints * 2);
    this.dirs = new Float32Array(maxPoints * 2);

    const v = maxPoints * 2;
    const pos = new Float32Array(v * 3);
    const aV = new Float32Array(v);
    const aSide = new Float32Array(v);
    const aOff = new Float32Array(v * 2);
    const aAge = new Float32Array(v);
    for (let i = 0; i < maxPoints; i++) {
      aV[i * 2] = 0; aV[i * 2 + 1] = 1;
      aSide[i * 2] = -1; aSide[i * 2 + 1] = 1;
    }
    const idx = new Uint32Array(Math.max(0, maxPoints - 1) * 6);
    for (let i = 0; i < maxPoints - 1; i++) {
      const a = i * 2;
      idx.set([a, a + 1, a + 3, a, a + 3, a + 2], i * 6);
    }

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(pos, 3);
    this.offAttr = new THREE.BufferAttribute(aOff, 2);
    this.ageAttr = new THREE.BufferAttribute(aAge, 1);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.offAttr.setUsage(THREE.DynamicDrawUsage);
    this.ageAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aV', new THREE.BufferAttribute(aV, 1));
    geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    geo.setAttribute('aOff', this.offAttr);
    geo.setAttribute('aAge', this.ageAttr);
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.geo = geo;

    // wall / rail / bleed, then the same three mirrored under the glass
    const mk = (mode, blending, depthWrite, lift, width, mirror) => new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      transparent: true,
      depthWrite,
      blending,
      side: THREE.DoubleSide,
      uniforms: Object.assign({
        uNow: { value: 0 },
        uHeight: { value: DEFAULT_PARAMS.wallHeight },
        uWidth: { value: width },
        uLift: { value: lift },
        uBirth: { value: 1.7 },
        uMode: { value: mode },
        uMirror: { value: mirror },
        uTime: { value: 0 },
        uGlow: { value: 1 },
        uCool: { value: 1 },
        uReflect: { value: 1 },
        uDeathFront: { value: -999 },
        uBody: { value: colors.body },
        uHot: { value: colors.hot },
        uCold: { value: colors.cold },
      }, glowUniforms),
    });

    this.matWall = mk(0, THREE.NormalBlending, true, 0.004, 0, 0);
    this.matRail = mk(1, THREE.AdditiveBlending, false, 0.0, 0.09, 0);
    this.matBleed = mk(2, THREE.AdditiveBlending, false, 0.02, 0.55, 0);
    this.matWallM = mk(0, THREE.AdditiveBlending, false, 0.004, 0, 1);
    this.matRailM = mk(1, THREE.AdditiveBlending, false, 0.0, 0.09, 1);
    this.matBleedM = mk(2, THREE.AdditiveBlending, false, 0.02, 0.55, 1);

    this.group = new THREE.Group();
    this.mirror = new THREE.Group();
    this.mirror.scale.y = -1;

    const add = (parent, mat, order) => {
      const m = new THREE.Mesh(geo, mat);
      m.frustumCulled = false;
      m.renderOrder = order;
      parent.add(m);
      return m;
    };
    add(this.mirror, this.matWallM, 1);
    add(this.mirror, this.matBleedM, 1);
    add(this.mirror, this.matRailM, 2);
    add(this.group, this.matBleed, 6);
    add(this.group, this.matWall, 7);
    add(this.group, this.matRail, 8);

    this.materials = [
      this.matWall, this.matRail, this.matBleed,
      this.matWallM, this.matRailM, this.matBleedM,
    ];
  }

  clear() {
    this.n = 0;
    this.geo.setDrawRange(0, 0);
    // Without this the next round's fresh wall inherits the old power-down
    // sweep and renders dead on arrival.
    this.dying = false;
    this.deathT = 0;
    this.setDeathFront(-999);
  }

  // Writes the two verts for point i from its stored centre + miter offset.
  _writeVert(i) {
    const x = this.pts[i * 2];
    const z = this.pts[i * 2 + 1];
    const ox = this.dirs[i * 2];
    const oz = this.dirs[i * 2 + 1];
    const p = this.posAttr.array;
    const o = this.offAttr.array;
    p[i * 6] = x; p[i * 6 + 1] = 0; p[i * 6 + 2] = z;
    p[i * 6 + 3] = x; p[i * 6 + 4] = 0; p[i * 6 + 5] = z;
    o[i * 4] = ox; o[i * 4 + 1] = oz;
    o[i * 4 + 2] = ox; o[i * 4 + 3] = oz;
  }

  // Perpendicular for point i, mitred between the incoming and outgoing legs so
  // corners keep a constant width.
  _miter(i) {
    const x = this.pts[i * 2], z = this.pts[i * 2 + 1];
    let inx = 0, inz = 0, outx = 0, outz = 0;
    if (i > 0) { inx = x - this.pts[(i - 1) * 2]; inz = z - this.pts[(i - 1) * 2 + 1]; }
    if (i < this.n - 1) { outx = this.pts[(i + 1) * 2] - x; outz = this.pts[(i + 1) * 2 + 1] - z; }
    if (inx === 0 && inz === 0) { inx = outx; inz = outz; }
    if (outx === 0 && outz === 0) { outx = inx; outz = inz; }
    const nl = Math.hypot(inx, inz) || 1;
    const ol = Math.hypot(outx, outz) || 1;
    inx /= nl; inz /= nl; outx /= ol; outz /= ol;
    // perpendiculars, then the mitre bisector
    let mx = -inz - outz;
    let mz = inx + outx;
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-4) { mx = -inz; mz = inx; }
    else { mx /= ml; mz /= ml; }
    const scale = Math.min(2, 1 / Math.max(0.5, mx * -inz + mz * inx));
    this.dirs[i * 2] = mx * scale;
    this.dirs[i * 2 + 1] = mz * scale;
  }

  push(x, z, tick) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pts[i * 2] = x;
    this.pts[i * 2 + 1] = z;
    this.ageAttr.array[i * 2] = tick;
    this.ageAttr.array[i * 2 + 1] = tick;
    this._miter(i);
    this._writeVert(i);
    if (i > 0) { this._miter(i - 1); this._writeVert(i - 1); }
    this.geo.setDrawRange(0, Math.max(0, (this.n - 1) * 6));
    this.posAttr.needsUpdate = true;
    this.offAttr.needsUpdate = true;
    this.ageAttr.needsUpdate = true;
  }

  // The last point rides with the interpolated head so the wall extends
  // continuously instead of popping a cell at a time.
  setHead(x, z) {
    if (this.n === 0) return;
    const i = this.n - 1;
    this.pts[i * 2] = x;
    this.pts[i * 2 + 1] = z;
    this._writeVert(i);
    this.posAttr.needsUpdate = true;
  }

  setDeathFront(v) {
    for (const m of this.materials) m.uniforms.uDeathFront.value = v;
  }

  setUniform(name, value) {
    for (const m of this.materials) {
      if (m.uniforms[name]) m.uniforms[name].value = value;
    }
  }

  setReflect(v) {
    this.matWallM.uniforms.uReflect.value = v;
    this.matRailM.uniforms.uReflect.value = v * 0.8;
    this.matBleedM.uniforms.uReflect.value = v * 0.6;
  }

  dispose() {
    this.geo.dispose();
    for (const m of this.materials) m.dispose();
  }
}

// ---- the arena ---------------------------------------------------------------------------------
export class Arena3D {
  constructor(canvas, opts = {}) {
    this.params = Object.assign({}, DEFAULT_PARAMS, opts.params || {});
    this.palette = opts.palette || [
      { body: '#26d9ff', hot: '#eaffff', cold: '#0d4a63' },
      { body: '#ff4fd8', hot: '#ffeafa', cold: '#5c1147' },
    ];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // composite encodes
    this.renderer.setClearColor(0x02030a, 1);
    this.maxDpr = opts.maxDpr || 1.75;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
    this.time = 0;
    this.tickNow = 0;
    this.flash = 0;
    this.tint = new THREE.Color(0, 0, 0);
    this.rings = [];
    this.camIntro = 0;
    this.pullBack = 0;
    this._target = new THREE.Vector3();
    this._fitPts = Array.from({ length: 8 }, () => new THREE.Vector3());

    this.colors = this.palette.map((p) => ({
      body: new THREE.Color(p.body),
      hot: new THREE.Color(p.hot),
      cold: new THREE.Color(p.cold),
    }));

    this._buildStatic();
    this._buildPost();
    this.setArena(opts.w || 44, opts.h || 24);
    this.resize();
  }

  // ---- static scene furniture -------------------------------------------------------------
  _buildStatic() {
    const shared = {};
    this.shared = shared;

    // floor + void
    this.floorMat = new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      transparent: true,
      depthWrite: true,
      uniforms: {
        uSize: { value: new THREE.Vector2(44, 24) },
        uTime: { value: 0 },
        uGrid: { value: 1 },
        uTerritory: { value: 1 },
        uFlash: { value: 0 },
        uGlow: { value: 1 },
        uC0: { value: this.colors[0].body },
        uC1: { value: this.colors[1].body },
        uHead0: { value: new THREE.Vector4(0, 0, 0, 0) },
        uHead1: { value: new THREE.Vector4(0, 0, 0, 0) },
        uRings: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Vector4()) },
        uClaim: { value: null },
      },
    });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.renderOrder = 4;
    this.floor.frustumCulled = false;
    this.scene.add(this.floor);

    // containment field
    this.fieldMat = new THREE.ShaderMaterial({
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uAmt: { value: 1 },
        uFlash: { value: 0 },
        uGlow: { value: 1 },
        uC0: { value: this.colors[0].body },
        uC1: { value: this.colors[1].body },
        uHead0: this.floorMat.uniforms.uHead0,
        uHead1: this.floorMat.uniforms.uHead1,
      },
    });
    this.fieldGroup = new THREE.Group();
    this.fieldGroup.renderOrder = 9;
    this.scene.add(this.fieldGroup);

    // sparks
    const sPos = new Float32Array(MAX_SPARKS * 3);
    const sCol = new Float32Array(MAX_SPARKS * 3);
    const sSize = new Float32Array(MAX_SPARKS);
    const sLife = new Float32Array(MAX_SPARKS);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute('aCol', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute('aLife', new THREE.BufferAttribute(sLife, 1).setUsage(THREE.DynamicDrawUsage));
    sGeo.setDrawRange(0, 0);
    sGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.sparkGeo = sGeo;
    this.sparks = [];
    this.sparkMesh = new THREE.Points(sGeo, new THREE.ShaderMaterial({
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 400 } },
    }));
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.renderOrder = 12;
    this.scene.add(this.sparkMesh);

    // heads: a dart, a halo, a light shaft
    const cone = new THREE.ConeGeometry(0.3, 0.92, 4);
    cone.rotateX(Math.PI / 2);
    this.heads = this.colors.map((c) => {
      const g = new THREE.Group();
      const dart = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({
        color: c.hot, transparent: true, opacity: 0.95,
      }));
      dart.position.y = 0.26;
      dart.renderOrder = 10;
      g.add(dart);

      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6),
        new THREE.ShaderMaterial({
          vertexShader: SHAFT_VERT,
          fragmentShader: `
            precision highp float;
            uniform vec3 uCol; uniform float uAmt;
            varying vec2 vUvS;
            void main() {
              float d = length(vUvS - 0.5) * 2.0;
              float f = exp(-d * d * 5.0);
              gl_FragColor = vec4(uCol * f, f * 0.85 * uAmt);
            }
          `,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { uCol: { value: c.body }, uAmt: { value: 1 } },
        })
      );
      halo.position.y = 0.26;
      halo.renderOrder = 11;
      g.add(halo);

      const shaft = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 5.5),
        new THREE.ShaderMaterial({
          vertexShader: SHAFT_VERT,
          fragmentShader: SHAFT_FRAG,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { uCol: { value: c.body }, uAmt: { value: 1 } },
        })
      );
      shaft.position.y = 2.75;
      shaft.renderOrder = 11;
      g.add(shaft);

      this.scene.add(g);
      return { group: g, dart, halo, shaft, angle: 0, bank: 0, alive: true };
    });

    // dust
    this.dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 300 }, uAmt: { value: 1 } },
    });
    this.dust = null;
  }

  // ---- render targets + post ----------------------------------------------------------------
  _buildPost() {
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(2, 2, Object.assign({ samples: 2 }, rtOpts));
    this.bloomRT = [];
    for (let i = 0; i < 3; i++) {
      this.bloomRT.push([
        new THREE.WebGLRenderTarget(2, 2, rtOpts),
        new THREE.WebGLRenderTarget(2, 2, rtOpts),
      ]);
    }
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: BRIGHT_FRAG,
      uniforms: { tSrc: { value: null }, uThresh: { value: 0.22 }, uKnee: { value: 0.35 } },
      depthTest: false, depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: BLUR_FRAG,
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null },
        uBloom: { value: 1 }, uTime: { value: 0 }, uRetro: { value: 0.3 },
        uTint: { value: new THREE.Color(0, 0, 0) },
      },
      depthTest: false, depthWrite: false,
    });
    this.quad = fsQuad(this.brightMat);
    this.quad.frustumCulled = false;
    this.postScene.add(this.quad);
  }

  // ---- arena geometry ---------------------------------------------------------------------------
  setArena(w, h) {
    this.w = w;
    this.h = h;
    const P = this.params;

    this.floor.scale.set(w * 7, h * 7, 1);
    this.floorMat.uniforms.uSize.value.set(w, h);

    // claim field (territory), eased in JS then uploaded as a small texture
    this.claimData = new Uint8Array(w * h * 4);
    this.claimField = new Float32Array(w * h * 2);
    this.claimTex = new THREE.DataTexture(this.claimData, w, h, THREE.RGBAFormat);
    this.claimTex.minFilter = THREE.LinearFilter;
    this.claimTex.magFilter = THREE.LinearFilter;
    this.claimTex.wrapS = this.claimTex.wrapT = THREE.ClampToEdgeWrapping;
    this.claimTex.needsUpdate = true;
    this.floorMat.uniforms.uClaim.value = this.claimTex;

    // Containment field: four panels on the perimeter, built one unit tall and
    // scaled each frame so the field tracks the wall-height slider.
    this.fieldGroup.clear();
    const panels = [
      { w, x: 0, z: -h / 2, r: 0 },
      { w, x: 0, z: h / 2, r: Math.PI },
      { w: h, x: -w / 2, z: 0, r: Math.PI / 2 },
      { w: h, x: w / 2, z: 0, r: -Math.PI / 2 },
    ];
    for (const p of panels) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, 1), this.fieldMat);
      m.position.set(p.x, 0.5, p.z);
      m.rotation.y = p.r;
      m.renderOrder = 9;
      this.fieldGroup.add(m);
    }

    // trails
    if (this.trails) for (const t of this.trails) {
      this.scene.remove(t.group); this.scene.remove(t.mirror); t.dispose();
    }
    this.trails = this.colors.map((c) => {
      const t = new Trail(w * h + 8, c, {});
      this.scene.add(t.group);
      this.scene.add(t.mirror);
      return t;
    });

    // dust volume
    if (this.dust) { this.scene.remove(this.dust); this.dust.geometry.dispose(); }
    const count = 420;
    const dPos = new Float32Array(count * 3);
    const dSeed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * w * 1.25;
      dPos[i * 3 + 1] = Math.random() * 9 + 0.4;
      dPos[i * 3 + 2] = (Math.random() - 0.5) * h * 1.25;
      dSeed[i] = Math.random();
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
    dGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.dust = new THREE.Points(dGeo, this.dustMat);
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 3;
    this.scene.add(this.dust);

    this.reset();
    this.resize();
  }

  // grid cell -> world
  cx(x) { return x - this.w / 2 + 0.5; }
  cz(y) { return y - this.h / 2 + 0.5; }

  _fieldHeight() { return Math.max(1.6, this.params.wallHeight * 1.9); }

  reset() {
    for (const t of this.trails) t.clear();
    this.sparks.length = 0;
    this.rings.length = 0;
    this.flash = 0;
    this.tickNow = 0;
    this.camIntro = 1;
    this.pullBack = 0;
    if (this.claimField) this.claimField.fill(0);
    for (const hd of this.heads) { hd.alive = true; hd.bank = 0; }
  }

  // ---- the game talks to these ----------------------------------------------------------------
  spawn(i, x, y, dir, tick) {
    const t = this.trails[i];
    t.clear();
    t.push(this.cx(x), this.cz(y), tick);
    t.push(this.cx(x), this.cz(y), tick);
    const hd = this.heads[i];
    hd.alive = true;
    hd.angle = Math.atan2(DIR_DX[dir], DIR_DZ[dir]);
    hd.bank = 0;
    hd.group.position.set(this.cx(x), 0, this.cz(y));
  }

  advance(i, x, y, tick) {
    this.trails[i].push(this.cx(x), this.cz(y), tick);
  }

  // fx is the fractional progress of the current tick (0..1)
  setHead(i, fromX, fromY, toX, toY, fx, dir, alive) {
    const hd = this.heads[i];
    const x = this.cx(fromX) + (this.cx(toX) - this.cx(fromX)) * fx;
    const z = this.cz(fromY) + (this.cz(toY) - this.cz(fromY)) * fx;
    hd.group.position.set(x, 0, z);
    hd.alive = alive;
    if (alive) this.trails[i].setHead(x, z);
    const target = Math.atan2(DIR_DX[dir], DIR_DZ[dir]);
    const d = shortestAngle(hd.angle, target);
    hd.bank += (d - hd.bank * 0.0) * 0.0;   // bank is driven by turn(), not here
    hd.angle += d * 0.35;
    return { x, z };
  }

  turn(i) {
    this.heads[i].bank = (Math.random() < 0.5 ? -1 : 1) * 0.45;
  }

  crash(i, x, y, intoX, intoY) {
    const hd = this.heads[i];
    hd.alive = false;
    const cxx = this.cx(intoX === undefined ? x : intoX);
    const czz = this.cz(intoY === undefined ? y : intoY);
    this.burst(cxx, czz, this.colors[i].body, 190);
    this.rings.push({ x: cxx, z: czz, t: 0, s: 1 });
    if (this.rings.length > MAX_RINGS) this.rings.shift();
    this.flash = 1;
    this.trails[i].deathT = 0;
    this.trails[i].dying = true;
    this.pullBack = 1;
  }

  burst(x, z, color, count) {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= MAX_SPARKS) break;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const sp = 2.5 + Math.random() * 9;
      const white = i % 5 === 0;
      this.sparks.push({
        x, y: 0.25 + Math.random() * 0.5, z,
        vx: Math.cos(a) * sp * (1 - up * 0.5),
        vy: up * sp * 0.75,
        vz: Math.sin(a) * sp * (1 - up * 0.5),
        life: 1, decay: 0.5 + Math.random() * 1.1,
        size: 2 + Math.random() * 5,
        r: white ? 1.6 : color.r * 1.5,
        g: white ? 1.7 : color.g * 1.5,
        b: white ? 1.9 : color.b * 1.5,
      });
    }
  }

  // Near-miss sparkle at the head — small, cheap, adds juice.
  graze(i, x, z) {
    const c = this.colors[i].body;
    for (let k = 0; k < 5; k++) {
      if (this.sparks.length >= MAX_SPARKS) break;
      this.sparks.push({
        x: x + (Math.random() - 0.5) * 0.4, y: 0.2 + Math.random() * 0.4,
        z: z + (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 2.2, vy: Math.random() * 2.4, vz: (Math.random() - 0.5) * 2.2,
        life: 1, decay: 2.2 + Math.random(), size: 1.5 + Math.random() * 2,
        r: c.r * 1.6, g: c.g * 1.6, b: c.b * 1.6,
      });
    }
  }

  pulse(strength = 0.6) { this.flash = Math.max(this.flash, strength); }

  ring(x, y, strength = 0.8) {
    this.rings.push({ x: this.cx(x), z: this.cz(y), t: 0, s: strength });
    if (this.rings.length > MAX_RINGS) this.rings.shift();
  }

  // claim: Float32 pairs per cell in 0..1 (p0, p1) — eased toward each frame.
  setClaim(target, occupied) {
    this.claimTarget = target;
    this.claimOccupied = occupied;
  }

  setParams(p) { Object.assign(this.params, p); }

  // ---- per-frame -------------------------------------------------------------------------------
  resize() {
    // Size from the window, not clientWidth: this world is always full-bleed,
    // and a canvas reports its intrinsic 300x150 until something sizes it.
    // Clamped: a zero-size window (hidden tab, collapsed frame) would put NaN
    // through the camera aspect and take the whole render loop down with it.
    const w = Math.max(1, window.innerWidth || 1280);
    const h = Math.max(1, window.innerHeight || 720);
    const budgetDpr = Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h));
    const dpr = Math.max(0.6, Math.min(
      (window.devicePixelRatio || 1) * (this.params.res || 1),
      this.maxDpr,
      budgetDpr
    ));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, true);   // let three write the CSS size too
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const pw = Math.max(2, Math.floor(w * dpr));
    const ph = Math.max(2, Math.floor(h * dpr));
    this.sceneRT.setSize(pw, ph);
    for (let i = 0; i < this.bloomRT.length; i++) {
      const d = 2 << i;   // half, quarter, eighth
      this.bloomRT[i][0].setSize(Math.max(2, Math.floor(pw / d)), Math.max(2, Math.floor(ph / d)));
      this.bloomRT[i][1].setSize(Math.max(2, Math.floor(pw / d)), Math.max(2, Math.floor(ph / d)));
    }
    this.viewW = w;
    this.viewH = h;
  }

  _placeCamera(dist, pitch, yaw) {
    const y = Math.sin(pitch) * dist;
    const r = Math.cos(pitch) * dist;
    this._target.set(0, this.params.wallHeight * 0.35, 0);
    this.camera.position.set(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
    this.camera.lookAt(this._target);
    this.camera.updateMatrixWorld();
  }

  // Solve for the closest distance that still keeps the whole arena — floor
  // corners and the tops of the containment field — inside the frame. Projecting
  // the real corners and scaling by the overshoot converges in a few passes;
  // the old closed-form guess was leaving the arena at 56% of the screen.
  _fitDistance(pitch, yaw) {
    const fh = this._fieldHeight();
    const hw = this.w / 2;
    const hh = this.h / 2;
    const pts = this._fitPts;
    let k = 0;
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        pts[k++].set(sx * hw, 0, sz * hh);
        pts[k++].set(sx * hw, fh, sz * hh);
      }
    }
    const floor = Math.hypot(hw, hh) * 0.6;   // never dive inside the arena
    let dist = Math.max(this.w, this.h);
    for (let i = 0; i < 6; i++) {
      this._placeCamera(dist, pitch, yaw);
      let mx = 0;
      let my = 0;
      for (const p of pts) {
        _v3.copy(p).project(this.camera);
        mx = Math.max(mx, Math.abs(_v3.x));
        my = Math.max(my, Math.abs(_v3.y));
      }
      const scale = Math.max(mx / FIT_X, my / FIT_Y);
      if (!isFinite(scale) || scale <= 0) break;
      dist = Math.max(floor, dist * scale);
      if (Math.abs(scale - 1) < 0.002) break;
    }
    return dist;
  }

  _updateCamera(dt) {
    const P = this.params;
    // The camera frames the whole arena and never chases a rider — house rule.
    const pitch0 = THREE.MathUtils.lerp(Math.PI * 0.49, Math.PI * 0.20, P.tilt);

    this.camIntro = Math.max(0, this.camIntro - dt * 0.9);
    this.pullBack = Math.max(0, this.pullBack - dt * 0.55);

    const t = this.time;
    const dr = P.drift * 0.02;
    const yaw = Math.sin(t * 0.11) * dr + Math.sin(t * 0.047) * dr * 0.6;
    const pitch = pitch0 + Math.sin(t * 0.083) * dr * 0.5;

    const fit = this._fitDistance(pitch, yaw);
    const ease = this.camIntro * this.camIntro;
    const dist = fit * (1 + ease * 0.14 + this.pullBack * 0.05) / Math.max(0.2, P.zoom);
    this._placeCamera(dist, pitch, yaw);
  }

  _updateClaim(dt) {
    if (!this.claimTarget || !this.claimField) return;
    const f = this.claimField;
    const d = this.claimData;
    const tgt = this.claimTarget;
    const occ = this.claimOccupied;
    const k = Math.min(1, dt * 6);
    const n = this.w * this.h;
    for (let i = 0; i < n; i++) {
      f[i * 2] += (tgt[i * 2] - f[i * 2]) * k;
      f[i * 2 + 1] += (tgt[i * 2 + 1] - f[i * 2 + 1]) * k;
      d[i * 4] = f[i * 2] * 255;
      d[i * 4 + 1] = f[i * 2 + 1] * 255;
      d[i * 4 + 2] = occ ? occ[i] * 90 : 0;
      d[i * 4 + 3] = 255;
    }
    this.claimTex.needsUpdate = true;
  }

  _updateSparks(dt) {
    const g = this.sparkGeo;
    const pos = g.attributes.position.array;
    const col = g.attributes.aCol.array;
    const size = g.attributes.aSize.array;
    const life = g.attributes.aLife.array;
    let n = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= s.decay * dt;
      if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
      s.vy -= 9.0 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y < 0.05) { s.y = 0.05; s.vy = Math.abs(s.vy) * 0.42; s.vx *= 0.7; s.vz *= 0.7; }
      s.vx *= 1 - 1.1 * dt; s.vz *= 1 - 1.1 * dt;
    }
    for (const s of this.sparks) {
      pos[n * 3] = s.x; pos[n * 3 + 1] = s.y; pos[n * 3 + 2] = s.z;
      col[n * 3] = s.r; col[n * 3 + 1] = s.g; col[n * 3 + 2] = s.b;
      size[n] = s.size; life[n] = s.life;
      n++;
    }
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = true;
    g.attributes.aCol.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aLife.needsUpdate = true;
  }

  // tickFloat: state.tick + fraction of the way to the next tick.
  render(dtMs, tickFloat, leaderBalance = 0) {
    const dt = Math.min(0.05, dtMs / 1000);
    const P = this.params;
    this.time += dt;
    this.tickNow = tickFloat;

    this.flash = Math.max(0, this.flash - dt * 2.6);

    // trails
    for (let i = 0; i < this.trails.length; i++) {
      const t = this.trails[i];
      t.setUniform('uNow', tickFloat);
      t.setUniform('uTime', this.time);
      t.setUniform('uHeight', P.wallHeight);
      t.setUniform('uGlow', P.glow);
      t.setUniform('uCool', P.cool);
      t.setReflect(P.reflect);
      if (t.dying) {
        t.deathT += dt;
        t.setDeathFront(t.deathT * 90);
        if (t.deathT > 14) t.dying = false;
      }
    }

    // heads
    for (let i = 0; i < this.heads.length; i++) {
      const hd = this.heads[i];
      hd.bank *= 1 - Math.min(1, dt * 7);
      hd.group.rotation.y = hd.angle;
      hd.dart.rotation.z = hd.bank;
      hd.group.visible = hd.alive;
      hd.shaft.lookAt(this.camera.position.x, hd.shaft.getWorldPosition(_v3).y, this.camera.position.z);
      hd.halo.quaternion.copy(this.camera.quaternion);
      const amt = P.glow * (0.85 + 0.15 * Math.sin(this.time * 7 + i));
      hd.halo.material.uniforms.uAmt.value = amt;
      hd.shaft.material.uniforms.uAmt.value = amt * 0.55;
      const hu = i === 0 ? this.floorMat.uniforms.uHead0 : this.floorMat.uniforms.uHead1;
      hu.value.set(hd.group.position.x, hd.group.position.z, hd.alive ? 1 : 0, hd.angle);
    }

    // floor + field
    const fu = this.floorMat.uniforms;
    fu.uTime.value = this.time;
    fu.uGrid.value = P.grid;
    fu.uTerritory.value = P.territory;
    fu.uFlash.value = this.flash;
    fu.uGlow.value = P.glow;
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = this.rings[i];
      const v = fu.uRings.value[i];
      if (r) { v.set(r.x, r.z, r.t, r.s); } else v.set(0, 0, 0, 0);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].t += dt;
      if (this.rings[i].t > 2.6) this.rings.splice(i, 1);
    }
    this.fieldGroup.scale.y = this._fieldHeight();
    this.fieldMat.uniforms.uTime.value = this.time;
    this.fieldMat.uniforms.uAmt.value = P.field;
    this.fieldMat.uniforms.uFlash.value = this.flash;
    this.fieldMat.uniforms.uGlow.value = P.glow;

    this.dustMat.uniforms.uTime.value = this.time;
    this.dustMat.uniforms.uAmt.value = P.dust;
    this.dustMat.uniforms.uScale.value = this.viewH * 0.55;
    this.sparkMesh.material.uniforms.uScale.value = this.viewH * 0.8;

    this._updateClaim(dt);
    this._updateSparks(dt);
    this._updateCamera(dt);

    // ---- draw ------------------------------------------------------------------------
    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(this.scene, this.camera);

    // bloom chain
    this.quad.material = this.brightMat;
    this.brightMat.uniforms.tSrc.value = this.sceneRT.texture;
    r.setRenderTarget(this.bloomRT[0][0]);
    r.render(this.postScene, this.postCam);

    for (let i = 0; i < this.bloomRT.length; i++) {
      if (i > 0) {
        this.quad.material = this.blurMat;
        this.blurMat.uniforms.tSrc.value = this.bloomRT[i - 1][0].texture;
        this.blurMat.uniforms.uDir.value.set(0, 0);
        r.setRenderTarget(this.bloomRT[i][0]);
        r.render(this.postScene, this.postCam);
      }
      const rt = this.bloomRT[i];
      const w = rt[0].width, h = rt[0].height;
      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tSrc.value = rt[0].texture;
      this.blurMat.uniforms.uDir.value.set(1 / w, 0);
      r.setRenderTarget(rt[1]);
      r.render(this.postScene, this.postCam);

      this.blurMat.uniforms.tSrc.value = rt[1].texture;
      this.blurMat.uniforms.uDir.value.set(0, 1 / h);
      r.setRenderTarget(rt[0]);
      r.render(this.postScene, this.postCam);
    }

    // composite
    const tint = this.tint;
    const a = this.colors[0].body, b = this.colors[1].body;
    const bal = THREE.MathUtils.clamp(leaderBalance, -1, 1);
    tint.setRGB(
      THREE.MathUtils.lerp(b.r, a.r, (bal + 1) / 2),
      THREE.MathUtils.lerp(b.g, a.g, (bal + 1) / 2),
      THREE.MathUtils.lerp(b.b, a.b, (bal + 1) / 2)
    );
    const cu = this.compMat.uniforms;
    cu.tScene.value = this.sceneRT.texture;
    cu.tB0.value = this.bloomRT[0][0].texture;
    cu.tB1.value = this.bloomRT[1][0].texture;
    cu.tB2.value = this.bloomRT[2][0].texture;
    cu.uBloom.value = P.bloom * (1 + this.flash * 0.8);
    cu.uTime.value = this.time;
    cu.uRetro.value = P.retro;
    cu.uTint.value.copy(tint).multiplyScalar(0.5 + Math.abs(bal) * 0.5);
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}

const _v3 = new THREE.Vector3();
// grid dir 0 up, 1 right, 2 down, 3 left → world
const DIR_DX = [0, 1, 0, -1];
const DIR_DZ = [-1, 0, 1, 0];
