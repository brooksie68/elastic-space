// Carnage — the picture. A real three.js city seen from a fixed side camera: buildings as true blocks
// with a facade shader that draws every window cell (a lit room behind the glass, curtains, an air
// conditioner; a ragged hole with rebar once it is punched), a second row and a far skyline behind,
// a street with depth in front, day and night, the collapse as debris + dust + glass, the monsters as
// rigged Meshy models with clips, and the things in the windows as canvas icons. game-core.js is
// untouched by any of this: one cell = CELL metres, the core's y (floors) is the scene's y.
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';
import { clone as skeletonClone } from '../../lib/three/utils/SkeletonUtils.js';

export const CELL = 4;                 // metres per cell (a column is one cell wide, a floor one cell tall)
const DEPTH = 5 * CELL;                // how deep a building is
const ROW2_Z = -DEPTH - 30;            // the second row of buildings
const ROW3_Z = -DEPTH - 105;           // the far skyline
const TAU = Math.PI * 2;
const Icons = () => globalThis.CarnageIcons;

export const LOOK_DEFAULTS = {
  viewCells: 26,      // how many cells wide the picture is
  pitch: 7,           // degrees the camera looks down
  camEase: 1.6,       // how quickly the camera follows (1/s)
  lookAhead: 2.5,     // cells ahead of the monster
  glow: 0.9,          // bloom
  exposure: 1.05,
  roomLight: 1,       // how bright the lit rooms are
  wear: 0.6,          // grime on the walls
  dust: 1,            // the collapse dust
  debris: 1,          // how much flies
  fogDepth: 1,        // the far rows fading
  stars: 1,
  res: 1,             // resolution cap
  night: -1,          // -1 = the city decides, 0 day, 1 night
  shiftCells: 0,      // slide the framing sideways (the lab's panel covers the right edge)
};

const FAMILY_TILE = { brick_red: 'brick_red', brick_tan: 'brick_tan', concrete: 'concrete', stucco: 'stucco', steel: 'steel', glass: 'glass' };
const FAMILY_TILE_CELLS = { brick_red: 1.7, brick_tan: 1.8, concrete: 2.2, stucco: 2.6, steel: 1.6, glass: 1.0 };
const FAMILY_INNARDS = { brick_red: [0.28, 0.12, 0.08], brick_tan: [0.3, 0.22, 0.14], concrete: [0.2, 0.2, 0.2], stucco: [0.3, 0.26, 0.2], steel: [0.14, 0.14, 0.16], glass: [0.1, 0.12, 0.14] };
const BRAND_COLOR = { george: [0.88, 0.17, 0.17, 1.0, 0.82, 0.23], lizzie: [0.18, 0.44, 0.85, 1.0, 1.0, 1.0], ralph: [0.95, 0.55, 0.16, 0.42, 0.23, 0.07] };
const BRAND_ID = { george: 1, lizzie: 2, ralph: 3 };

// ---- the facade shader ---------------------------------------------------------------------------------------
// One quad per building front. Per-cell data rides in a tiny texture: r = type (0 window 1 wall 2 neon 3 store),
// g = state (0 intact 1 cracked 2 broken), b = seed, a = flags (1 lit, 2 curtain, 4 blind, 8 ac, 16 item).
const FACADE_VS = /* glsl */`
  out vec2 vUv;
  out vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FACADE_FS = /* glsl */`
  precision highp float;
  precision highp int;
  in vec2 vUv;
  in vec3 vWorld;
  out vec4 outColor;
  uniform sampler2D uCells;
  uniform sampler2D uWall;
  uniform sampler2D uSigns;
  uniform float uCols, uFloors, uCell, uTileCells, uSeed, uTime, uNight, uWear, uRoomLight, uCollapse, uDay;
  uniform vec3 uInnards, uCamPos, uOrigin, uSky, uGround, uSunDir;
  uniform vec3 uBrandA, uBrandB;
  uniform float uBrand, uNeonC0, uNeonW, uNeonIdx, uNeonLit, uNeonHue;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { return 0.5 * noise(p) + 0.25 * noise(p * 2.1 + 3.7) + 0.125 * noise(p * 4.3 + 9.1); }
  vec3 hsv(float h, float s, float v) { vec3 k = vec3(h, h + 1.0 / 3.0, h + 2.0 / 3.0); vec3 p = abs(fract(k) * 6.0 - 3.0); return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s); }
  float box(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

  // the room behind the glass: a box of depth D behind the opening, walls shaded by a seeded style
  vec3 room(vec2 f, vec2 o0, vec2 o1, vec3 d, float seed, float lit, float wrecked) {
    float D = 0.85;
    vec3 p = vec3(f, 0.0);
    float tz = -D / min(d.z, -0.02);
    float tx = ((d.x > 0.0 ? o1.x : o0.x) - f.x) / (abs(d.x) < 1e-4 ? 1e-4 * sign(d.x + 1e-5) : d.x);
    float ty = ((d.y > 0.0 ? o1.y : o0.y) - f.y) / (abs(d.y) < 1e-4 ? 1e-4 * sign(d.y + 1e-5) : d.y);
    tx = tx < 0.0 ? 1e9 : tx; ty = ty < 0.0 ? 1e9 : ty;
    float t = min(tz, min(tx, ty));
    vec3 h = p + d * t;
    float depth = clamp(-h.z / D, 0.0, 1.0);
    int style = int(mod(floor(seed * 7.0), 7.0));
    vec3 wall = vec3(0.86, 0.80, 0.70);
    vec3 light = vec3(1.0, 0.86, 0.66);
    if (style == 1) { wall = vec3(0.9, 0.92, 0.95); light = vec3(0.85, 0.95, 1.0); }
    if (style == 2) { wall = vec3(0.55, 0.6, 0.7); light = vec3(0.6, 0.75, 1.0); }
    if (style == 3) { wall = vec3(0.75, 0.62, 0.7); light = vec3(1.0, 0.6, 0.9); }
    if (style == 4) { wall = vec3(0.82, 0.86, 0.8); light = vec3(0.8, 1.0, 0.8); }
    if (style == 5) { wall = vec3(0.35, 0.36, 0.4); light = vec3(0.4, 0.9, 1.0); }
    if (style == 6) { wall = vec3(0.9, 0.85, 0.75); light = vec3(1.0, 0.9, 0.7); }
    vec3 c;
    if (t == tz) {
      // the back wall: a feature in the middle (a picture, a screen, a poster)
      vec2 q = (h.xy - o0) / (o1 - o0);
      c = wall;
      float feat = step(abs(q.x - 0.5), 0.22) * step(abs(q.y - 0.55), 0.16);
      if (style == 2) { float fl = 0.6 + 0.4 * sin(uTime * 9.0 + seed * 40.0) * sin(uTime * 3.1); c = mix(c, vec3(0.5, 0.7, 1.0) * (1.0 + fl), feat); }
      else if (style == 1) { c = mix(c, vec3(0.3, 0.5, 0.9), feat * 0.9); }
      else if (style == 5) { c = mix(c, vec3(0.1, 0.5, 0.3) + 0.5 * step(0.7, fract(q.y * 12.0 + uTime * 0.5 + seed)), feat); }
      else { c = mix(c, hsv(seed * 3.0, 0.6, 0.7), feat * 0.8); }
      // a skirting line and a dado
      c *= 0.85 + 0.15 * step(0.08, q.y);
    } else if (t == ty) {
      c = d.y > 0.0 ? wall * 0.95 : wall * 0.55;   // ceiling / floor
      if (d.y > 0.0) { vec2 q = (h.xz); float lamp = smoothstep(0.12, 0.0, length((h.xy - (o0 + o1) * 0.5) * vec2(1.0, 0.0) + vec2(0.0, h.z + D * 0.5))); c += light * lamp * 2.0 * lit; }
      else { c *= 0.9 + 0.1 * step(0.5, fract(h.x * 6.0 + h.z * 6.0)); }
    } else {
      c = wall * 0.72;   // side walls
    }
    float outside = uDay * 0.32 + 0.03;
    vec3 shade = c * (outside * (1.0 - depth * 0.5) + light * lit * uRoomLight * (0.55 + 0.45 * (1.0 - depth)));
    shade = mix(shade, shade * vec3(0.22, 0.19, 0.17), wrecked);
    return shade;
  }

  void main() {
    vec2 cell = vec2(vUv.x * uCols, vUv.y * uFloors);
    vec2 ci = floor(cell);
    vec2 f = fract(cell);
    vec4 data = texelFetch(uCells, ivec2(int(ci.x), int(ci.y)), 0) * 255.0;
    int type = int(data.r + 0.5);
    int state = int(data.g + 0.5);
    float seed = data.b / 255.0;
    int flags = int(data.a + 0.5);
    float litF = float(flags & 1);
    float curtain = float((flags >> 1) & 1);
    float blind = float((flags >> 2) & 1);
    float ac = float((flags >> 3) & 1);
    float item = float((flags >> 4) & 1);

    // the wall everywhere, in world space so bricks run across cells
    vec2 wuv = (vWorld.xy) / (uCell * uTileCells) + uSeed * 3.0;
    vec3 wall = texture(uWall, wuv).rgb;
    float grime = smoothstep(2.5, 0.0, vWorld.y / uCell) * 0.35 + fbm(vWorld.xy * 0.35 + uSeed) * 0.25;
    float streak = smoothstep(0.35, 0.0, abs(fract(cell.x) - 0.5)) * smoothstep(0.85, 0.2, f.y) * noise(vec2(ci.x * 3.1 + uSeed * 9.0, vWorld.y * 0.7)) * 0.5;
    wall *= 1.0 - uWear * (grime + streak) * 0.9;
    wall *= 1.0 - 0.25 * step(0.5, uCollapse) * fbm(vWorld.xy * 2.0);
    vec3 col = wall;
    float emit = 0.0;

    vec3 d = normalize(vWorld - uCamPos);
    if (type == 1) {
      // a wall cell: cracked, then a hole
      if (state == 1 || uCollapse > 0.0) {
        float cr = abs(fbm(cell * 5.0 + uSeed * 7.0) - 0.5);
        float crack = 1.0 - smoothstep(0.0, 0.03 + 0.03 * uCollapse, cr);
        col *= 1.0 - crack * 0.75 * max(float(state == 1), uCollapse);
      }
      if (state == 2) {
        float r = 0.22 + 0.18 * fbm(f * 4.0 + seed * 20.0);
        float dd = length((f - 0.5) * vec2(1.0, 1.1));
        float hole = 1.0 - smoothstep(r - 0.02, r + 0.02, dd);
        vec3 innards = uInnards * (0.6 + 0.4 * noise(f * 9.0));
        float rim = smoothstep(r + 0.02, r + 0.06, dd) * (1.0 - smoothstep(r + 0.06, r + 0.12, dd));
        col = mix(col, innards * 0.35, hole);
        col = mix(col, col * 1.3, rim * 0.6);
        // rebar
        float bar = step(abs(f.x - 0.5 - 0.08), 0.012) * step(0.5, f.y) * hole + step(abs(f.x - 0.5 + 0.11), 0.012) * step(0.45, f.y) * hole;
        col = mix(col, vec3(0.25, 0.14, 0.1), bar);
      }
    } else if (type == 0 || type == 3) {
      // a window (or a storefront): the opening, the frame, the glass and the room
      vec2 o0 = type == 3 ? vec2(0.06, 0.0) : vec2(0.13, 0.15);
      vec2 o1 = type == 3 ? vec2(0.94, 0.72) : vec2(0.87, 0.9);
      float openBox = box(f - (o0 + o1) * 0.5, (o1 - o0) * 0.5);
      float broken = float(state == 2);
      // a ragged edge once it is broken
      float rag = broken * (0.04 + 0.05 * fbm(f * 7.0 + seed * 30.0));
      float inOpen = 1.0 - smoothstep(-0.005, 0.005, openBox - rag);
      float frame = (1.0 - smoothstep(0.0, 0.04, -openBox)) * (1.0 - broken * 0.85);
      vec3 frameCol = type == 3 ? vec3(0.12, 0.12, 0.13) : mix(vec3(0.16, 0.17, 0.19), vec3(0.72, 0.7, 0.66), step(0.5, fract(uSeed * 5.0)));
      float lit = (uNight > 0.5 ? litF : litF * step(0.7, seed)) * (1.0 - broken * 0.6);
      if (type == 3) lit = 1.0 - broken * 0.5;
      vec3 interior = room(f, o0, o1, d, seed + float(type) * 0.13, lit, broken);
      if (type == 3) {
        // a restaurant: a counter, a menu board glow, the brand's colour on the walls
        interior *= mix(vec3(1.0), uBrandA * 1.4, 0.35);
        float board = step(abs(f.x - 0.5), 0.3) * step(0.5, f.y) * step(f.y, 0.62);
        interior += board * uBrandB * 0.9 * (1.0 - broken);
      }
      // glass: a reflection of the sky, more at grazing angles
      vec3 n = vec3(0.0, 0.0, 1.0);
      vec3 rdir = reflect(d, n);
      vec3 refl = mix(uGround, uSky, smoothstep(-0.2, 0.6, rdir.y)) * (0.9 + 0.3 * noise(vWorld.xy * 0.2));
      float fres = mix(0.10, 0.30, uDay) + 0.5 * pow(1.0 - max(0.0, -d.z), 3.0);
      float diag = smoothstep(0.02, 0.0, abs(fract((f.x + f.y * 0.6 + uSeed) * 1.3) - 0.5) - 0.42) * 0.25;
      vec3 glass = mix(interior, refl, clamp(fres + diag, 0.0, 0.8) * (1.0 - broken));
      // curtains and a half blind
      if (curtain > 0.5 && broken < 0.5) {
        float cw = (o1.x - o0.x) * 0.42;
        float side = step(0.5, fract(seed * 13.0));
        float inCurt = side > 0.5 ? step(f.x, o0.x + cw) : step(o1.x - cw, f.x);
        vec3 ccol = hsv(fract(seed * 5.0), 0.35, 0.75) * (0.75 + 0.25 * sin(f.x * 60.0 + seed));
        glass = mix(glass, ccol * (0.35 + 0.65 * lit + uDay * 0.3), inCurt * 0.9);
      }
      if (blind > 0.5 && broken < 0.5) {
        float bh = o1.y - (o1.y - o0.y) * (0.22 + 0.33 * fract(seed * 17.0));
        float inBlind = step(bh, f.y);
        float slat = 0.72 + 0.28 * step(0.5, fract(f.y * 28.0));
        glass = mix(glass, vec3(0.62, 0.60, 0.55) * slat * (0.45 + 0.45 * lit + uDay * 0.25), inBlind * 0.92);
      }
      col = mix(col, glass, inOpen);
      col = mix(col, frameCol, frame * inOpen);
      if (ac > 0.5 && broken < 0.5 && type == 0) {
        float acb = 1.0 - smoothstep(0.0, 0.01, box(f - vec2(0.7, 0.24), vec2(0.13, 0.08)));
        float grille = 0.8 + 0.2 * step(0.5, fract(f.y * 30.0));
        col = mix(col, vec3(0.62, 0.62, 0.6) * grille, acb);
      }
      if (broken > 0.5) {
        // a punched window: a dark ragged rim of torn wall, soot fanning out, a few glass teeth on the sill,
        // a blind hanging out, rebar at the top, the room behind wrecked and dim
        float rimN = fbm(f * 9.0 + seed * 40.0);
        float edge = smoothstep(-0.01, 0.01, openBox - rag) * (1.0 - smoothstep(0.03, 0.09 + 0.05 * rimN, openBox - rag));
        col = mix(col, uInnards * (0.35 + 0.5 * rimN), edge);
        float lip = smoothstep(-0.012, 0.0, openBox - rag) * (1.0 - smoothstep(0.0, 0.012, openBox - rag));
        col = mix(col, vec3(0.05, 0.04, 0.04), lip * 0.9);
        float soot = smoothstep(0.0, 0.32, -(openBox - rag) + 0.16) * 0.55 * (0.6 + 0.4 * fbm(f * 6.0 + seed * 3.0));
        col *= 1.0 - soot * (1.0 - inOpen);
        float teeth = step(f.y, o0.y + 0.03 * abs(sin(f.x * 37.0 + seed * 9.0)) * (0.4 + 0.6 * noise(vec2(f.x * 5.0, seed)))) * step(o0.y - 0.005, f.y) * inOpen;
        col = mix(col, vec3(0.55, 0.65, 0.75), teeth * 0.7);
        float sw = sin(uTime * 1.7 + seed * 6.0) * 0.06;
        float hang = step(abs(f.x - (o0.x + 0.22 + (o1.y - f.y) * sw)), 0.12) * step(f.y, o1.y) * step(o1.y - 0.3 - 0.1 * fract(seed * 7.0), f.y) * inOpen * step(0.5, blind + curtain);
        col = mix(col, vec3(0.5, 0.48, 0.44) * (0.6 + 0.4 * step(0.5, fract(f.y * 22.0))), hang * 0.9);
        float bar = (step(abs(f.x - o0.x - 0.18), 0.008) + step(abs(f.x - o1.x + 0.24), 0.008)) * step(o1.y - 0.22 - 0.1 * fract(seed * 11.0), f.y) * step(f.y, o1.y + 0.02) * inOpen;
        col = mix(col, vec3(0.22, 0.12, 0.08), bar);
      }
      emit = lit * inOpen * (1.0 - frame) * uRoomLight * (uNight > 0.5 ? 0.55 : 0.12) * (type == 3 ? 1.6 : 1.0);
      if (type == 3) {
        // the awning band along the top, striped, with the brand's mark space in the middle
        float aw = step(0.74, f.y) * step(f.y, 0.98);
        float stripe = step(0.5, fract(f.x * 6.0 + ci.x));
        vec3 awCol = mix(uBrandA, uBrandB, stripe * 0.85);
        float scallop = step(0.74, f.y) * step(f.y, 0.78) * step(0.5, fract(f.x * 6.0 + 0.5));
        col = mix(col, awCol * (0.8 + 0.2 * f.y), aw);
        col = mix(col, uBrandB, scallop);
        float shadow = smoothstep(0.74, 0.62, f.y) * step(0.5, f.y) * 0.3;
        col *= 1.0 - shadow;
      }
    } else if (type == 2) {
      // a neon sign across its cells: the atlas glyphs, lit or dead
      float su = (cell.x - uNeonC0) / max(1.0, uNeonW);
      float sv = f.y;
      vec2 auv = vec2((mod(uNeonIdx, 4.0) + clamp(su, 0.0, 1.0)) / 4.0, 1.0 - (floor(uNeonIdx / 4.0) + (1.0 - clamp(sv * 0.9 + 0.05, 0.0, 1.0))) / 2.0);
      vec3 sign = texture(uSigns, auv).rgb;
      vec3 panel = vec3(0.07, 0.06, 0.08) * (0.8 + 0.2 * noise(f * 20.0));
      float glyph = max(sign.r, max(sign.g, sign.b));
      vec3 hue = hsv(uNeonHue, 0.85, 1.0);
      float on = uNeonLit * (1.0 - float(state == 2));
      float flick = 0.85 + 0.15 * step(0.1, fract(sin(uTime * 13.0 + uSeed) * 7.0));
      vec3 tube = mix(hue * 0.18, hue * 2.4 * flick + sign * 0.8, on);
      col = mix(panel, tube, glyph);
      // a soft halo on the panel when it is on
      float halo = on * glyph * 0.0;
      col += hue * on * 0.15 * smoothstep(0.0, 0.5, sign.r + sign.g + sign.b);
      emit = on * glyph * 1.4 + on * 0.06;
      if (state == 2) { col = panel * 0.6 + vec3(0.3, 0.32, 0.36) * step(0.9, fract(f.x * 9.0 + f.y * 7.0)) * 0.3; emit = 0.0; }
      float frame = 1.0 - smoothstep(0.0, 0.05, -box(f - 0.5, vec2(0.5, 0.5)) + 0.03);
      col = mix(col, vec3(0.2, 0.2, 0.22), frame * 0.9);
    }
    // daylight on the face: the sun's side is brighter
    float sunFace = 0.7 + 0.3 * max(0.0, uSunDir.z);
    vec3 lightCol = mix(vec3(0.30, 0.34, 0.5) * 0.45, vec3(1.08, 1.04, 0.96) * sunFace, uDay);
    vec3 shaded = col * lightCol + col * emit;
    outColor = vec4(shaded, 1.0);
  }
`;

// the far rows: instanced boxes with windows as a pattern, lit at random
const FAR_VS = /* glsl */`
  attribute vec3 aSize;
  attribute float aSeed;
  varying vec3 vLocal; varying vec3 vSize; varying float vSeed; varying vec3 vN;
  void main() {
    vLocal = position * aSize; vSize = aSize; vSeed = aSeed; vN = normal;
    vec4 w = instanceMatrix * vec4(position * aSize, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * w;
  }
`;
const FAR_FS = /* glsl */`
  varying vec3 vLocal; varying vec3 vSize; varying float vSeed; varying vec3 vN;
  uniform float uNight, uDim, uTime; uniform vec3 uTint, uFogCol; uniform float uFogA, uFogB;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = abs(vN.x) > 0.5 ? vLocal.zy : vLocal.xy;
    vec2 g = p / 4.0 + 0.5;
    vec2 c = floor(g), f = fract(g);
    float isWin = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.85);
    float lit = step(mix(0.82, 0.55, uNight), hash(c + vSeed * 7.0 + floor(vN.x * 3.0)));
    float top = step(vSize.y * 0.5 - 0.6, vLocal.y);
    vec3 wall = uTint * (0.9 + 0.2 * hash(vec2(vSeed, vN.y))) * mix(1.0, 0.16, uNight) * (abs(vN.x) > 0.5 ? 0.8 : 1.0) * (1.0 - top * 0.3);
    vec3 win = mix(wall * 0.7, vec3(1.0, 0.85, 0.6) * (0.35 + 0.65 * uNight) * 1.4, lit);
    vec3 col = mix(wall, win, isWin * (1.0 - top)) * uDim;
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fog = smoothstep(uFogA, uFogB, depth);
    gl_FragColor = vec4(mix(col, uFogCol, fog), 1.0);
  }
`;

// the sky: a dome with a gradient, the sun or the moon, stars at night
const SKY_VS = /* glsl */`varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = /* glsl */`
  varying vec3 vP; uniform vec3 uTop, uHorizon, uSunDir, uSunCol; uniform float uNight, uStars, uTime;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 dir = normalize(vP);
    float h = clamp(dir.y, -0.1, 1.0);
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.03, 0.32, h));
    float sun = smoothstep(0.9985, 0.9995, dot(dir, uSunDir));
    float halo = pow(max(0.0, dot(dir, uSunDir)), 30.0) * 0.5;
    col += uSunCol * (sun * 4.0 + halo);
    if (uNight > 0.5) {
      vec2 sp = dir.xz / max(0.05, dir.y + 0.15) * 40.0;
      vec2 c = floor(sp); vec2 f = fract(sp);
      float s = step(0.996, hash(c)) * smoothstep(0.35, 0.0, length(f - 0.5)) * uStars * smoothstep(0.02, 0.2, dir.y);
      float tw = 0.7 + 0.3 * sin(uTime * 2.0 + hash(c + 1.0) * 20.0);
      col += vec3(0.8, 0.85, 1.0) * s * tw * 1.4;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

// the post chain: bright pass, blur, composite with vignette
const QUAD_VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BRIGHT_FS = /* glsl */`varying vec2 vUv; uniform sampler2D tex; uniform float thr; void main() { vec4 c = texture2D(tex, vUv); float l = max(c.r, max(c.g, c.b)); if (!(l >= 0.0)) { gl_FragColor = vec4(0.0); return; } gl_FragColor = vec4(c.rgb * smoothstep(thr, thr + 0.6, l), 1.0); }`;
const BLUR_FS = /* glsl */`varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir; void main() { vec4 s = vec4(0.0); float w[5]; w[0] = 0.227; w[1] = 0.194; w[2] = 0.121; w[3] = 0.054; w[4] = 0.016; s += texture2D(tex, vUv) * w[0]; for (int i = 1; i < 5; i++) { s += texture2D(tex, vUv + dir * float(i)) * w[i]; s += texture2D(tex, vUv - dir * float(i)) * w[i]; } gl_FragColor = s; }`;
const COMP_FS = /* glsl */`varying vec2 vUv; uniform sampler2D tex, bloom; uniform float glow, vig, exposure;
  vec3 aces(vec3 x) { const float a = 2.51; const float b = 0.03; const float c = 2.43; const float d = 0.59; const float e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
  vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() { vec3 c = texture2D(tex, vUv).rgb + texture2D(bloom, vUv).rgb * glow; if (!(c.r >= 0.0)) c = vec3(0.0); float v = smoothstep(1.35, 0.45, length(vUv - 0.5)); c *= mix(1.0, v, vig); c = aces(c * exposure); gl_FragColor = vec4(srgb(c), 1.0); }`;

// ---------------------------------------------------------------------------------------------------------------
export function createRenderer(canvas, lookIn) {
  const look = Object.assign({}, LOOK_DEFAULTS, lookIn || {});
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;   // the composite pass tone-maps and encodes; the scene renders linear into a float target
  let exposure = look.exposure;
  renderer.autoClear = true;
  const PIXEL_BUDGET = 3.2e6;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 900);
  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();
  const base = new URL('./', import.meta.url).href;
  const clock = { t: 0 };

  // ---- assets ------------------------------------------------------------------------------------------------
  const textures = {};
  const models = { monsters: {}, teen: null, soldier: null, statics: {} };
  let assetsFailed = 0;
  const texClones = {};
  function tex(name) {
    if (textures[name]) return textures[name];
    texClones[name] = [];
    const t = texLoader.load(base + 'assets/textures/' + name + '.jpg', (loaded) => { for (const c of texClones[name]) { c.image = loaded.image; c.needsUpdate = true; } }, undefined, () => { assetsFailed++; });
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures[name] = t;
    return t;
  }
  // a copy with its own repeat that still gets the image when the file lands
  function tile(name, rx, ry) {
    const t = tex(name).clone();
    t.repeat.set(rx, ry); if (t.image && t.image.width) t.needsUpdate = true;
    texClones[name].push(t);
    return t;
  }
  function canvasTex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function loadGlb(path) { return new Promise((resolve) => loader.load(base + path, (g) => resolve(g), undefined, () => { assetsFailed++; resolve(null); })); }
  function prepModel(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) { if (m.map) m.map.colorSpace = THREE.SRGBColorSpace; if (m.map && m.emissive) { m.emissiveMap = m.map; m.emissive.setHex(0); m.emissiveIntensity = 1; } m.side = THREE.FrontSide; }
      }
    });
  }
  const MONSTER_CLIPS = ['walk', 'run', 'idle', 'punchL', 'punchR', 'climb', 'eat', 'hit', 'fall', 'jump', 'stomp'];
  const TILES = ['brick_red', 'brick_tan', 'concrete', 'stucco', 'steel', 'glass', 'asphalt', 'sidewalk', 'rubble', 'roof'];
  async function load(onProgress) {
    let done = 0, total = 0;
    const tick = () => { done++; if (onProgress) onProgress(done / total); };
    const jobs = [];
    for (const name of TILES) {
      total++;
      jobs.push(new Promise((resolve) => {
        if (textures[name] && textures[name].image && textures[name].image.width) { tick(); resolve(); return; }
        texClones[name] = texClones[name] || [];
        const t = texLoader.load(base + 'assets/textures/' + name + '.jpg', (loaded) => { for (const c of texClones[name]) { c.image = loaded.image; c.needsUpdate = true; } tick(); resolve(); }, undefined, () => { assetsFailed++; tick(); resolve(); });
        t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        textures[name] = t;
      }));
    }
    const rigged = async (dir, clipNames) => {
      const g = await loadGlb('assets/models/' + dir + '/base.glb');
      if (!g) return null;
      prepModel(g.scene);
      const clips = {};
      await Promise.all(clipNames.map((c) => loadGlb('assets/models/' + dir + '/' + c + '.glb').then((a) => { if (a && a.animations && a.animations.length) clips[c] = a.animations[0]; })));
      return { scene: g.scene, clips };
    };
    for (const slug of ['george', 'lizzie', 'ralph']) { total++; jobs.push(rigged(slug, MONSTER_CLIPS).then((a) => { models.monsters[slug] = a; tick(); })); }
    total++; jobs.push(rigged('teen', ['walk', 'tired']).then((a) => { models.teen = a; tick(); }));
    total++; jobs.push(rigged('soldier', ['walk', 'fire', 'flyup']).then((a) => { models.soldier = a; tick(); }));
    for (const name of ['swat', 'drone', 'cruiser', 'taxi', 'bot']) { total++; jobs.push(loadGlb('assets/models/' + name + '.glb').then((g) => { if (g) { prepModel(g.scene); models.statics[name] = g.scene; } tick(); })); }
    await Promise.all(jobs);
    return { failed: assetsFailed };
  }

  // ---- lights, sky, fog -------------------------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a4036, 0.9);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(60, 120, 90);
  const amb = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(hemi, sun, amb);
  const skyUniforms = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() }, uSunCol: { value: new THREE.Color(1, 0.9, 0.7) }, uNight: { value: 0 }, uStars: { value: 1 }, uTime: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -10;
  scene.add(sky);
  let night = false;
  const palette = { day: { top: 0x2f6fd0, horizon: 0xbcd3ea, ground: 0x6e6a60, fog: 0xb9cbe0, sunCol: 0xfff0d0 }, night: { top: 0x050818, horizon: 0x2a1c3a, ground: 0x15121a, fog: 0x14101e, sunCol: 0xd8e4ff } };
  function applyDayNight() {
    const p = night ? palette.night : palette.day;
    skyUniforms.uTop.value.setHex(p.top); skyUniforms.uHorizon.value.setHex(p.horizon); skyUniforms.uNight.value = night ? 1 : 0; skyUniforms.uSunCol.value.setHex(p.sunCol);
    skyUniforms.uSunDir.value.set(night ? -0.4 : 0.35, night ? 0.6 : 0.55, night ? -0.7 : -0.75).normalize();
    hemi.intensity = night ? 0.35 : 0.95; hemi.color.setHex(night ? 0x3a4a8a : 0xbfd4ff);
    sun.intensity = night ? 0.35 : 1.7; sun.color.setHex(night ? 0x9fb3ff : 0xfff2dc);
    amb.intensity = night ? 0.06 : 0.18;
    scene.fog = new THREE.Fog(p.fog, 110 * look.fogDepth, 380 * look.fogDepth);
    shardMat.color.setHex(night ? 0x5a6a7a : 0xcfe8ff); debrisMat.color.setHex(night ? 0x8a8a90 : 0xffffff);
    farUniforms.uNight.value = night ? 1 : 0; farUniforms.uFogCol.value.setHex(p.fog); farUniforms.uFogA.value = 100 * look.fogDepth; farUniforms.uFogB.value = 360 * look.fogDepth;
    for (const u of facadeUniformsAll) { u.uNight.value = night ? 1 : 0; u.uDay.value = night ? 0 : 1; u.uSky.value.setHex(p.top); u.uGround.value.setHex(p.ground); u.uSunDir.value.copy(skyUniforms.uSunDir.value); }
    exposure = look.exposure * (night ? 0.95 : 1);
  }

  // ---- the ground and the street -----------------------------------------------------------------------------------
  const ground = new THREE.Group();
  scene.add(ground);
  let streetBuilt = false;
  function buildStreet(width) {
    for (const c of ground.children.slice()) { ground.remove(c); if (c.geometry) c.geometry.dispose(); }
    const W = width * CELL + 400;
    const x0 = -200;
    const mk = (w, d, z, t, rep) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tile(t, w / rep, d / rep), roughness: 0.95, metalness: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, 0, z); return m; };
    ground.add(mk(W, 3.6, 1.8, 'sidewalk', 3.2));               // the pavement in front of the faces
    const road = mk(W, 22, 3.6 + 11, 'asphalt', 6); road.position.y = -0.04; ground.add(road);
    const near = mk(W, 30, 3.6 + 22 + 15, 'sidewalk', 3.2); ground.add(near);   // the near pavement, all the way under the camera
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, 500), new THREE.MeshStandardMaterial({ color: 0x1c1a1e, roughness: 1 }));
    back.rotation.x = -Math.PI / 2; back.position.set(x0 + W / 2, -0.08, -100); ground.add(back);
    // planters and a low fence along the near pavement, low enough to stay under the road in the frame
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.8 }), leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.9 });
    for (let x = -10; x < width * CELL + 10; x += 6) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.2), planterMat); pl.position.set(x, 0.35, 3.6 + 22 + 6); ground.add(pl);
      const lf = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.6, 1.0), leafMat); lf.position.set(x, 0.95, 3.6 + 22 + 6); ground.add(lf);
    }
    const fence = new THREE.Mesh(new THREE.BoxGeometry(W, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.5, metalness: 0.6 }));
    fence.position.set(x0 + W / 2, 0.45, 3.6 + 22 + 9.5); ground.add(fence);
    // parked cars along the near kerb: the real taxi and cruiser when they are loaded, dark blocks with wheels otherwise
    const carGeo = new THREE.BoxGeometry(4.4, 1.2, 1.9), roofGeo = new THREE.BoxGeometry(2.4, 0.65, 1.7), wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.9 });
    for (let x = 3, i = 0; x < width * CELL; x += 7 + (i * 37 % 9), i++) {
      if (i % 3 === 1) continue;
      const z = 3.6 + 22 - 1.6;
      const model = i % 5 === 0 ? models.statics.taxi : i % 5 === 3 ? models.statics.cruiser : null;
      if (model) {
        const m = model.clone(true);
        const box = new THREE.Box3().setFromObject(m); const dims = new THREE.Vector3(); box.getSize(dims);
        const k = 4.8 / Math.max(0.01, Math.max(dims.x, dims.z));
        m.scale.setScalar(k); m.position.set(x - (box.min.x + box.max.x) / 2 * k, -box.min.y * k, z - (box.min.z + box.max.z) / 2 * k);
        if (dims.z > dims.x) m.rotation.y = Math.PI / 2;
        ground.add(m);
        continue;
      }
      const hue = (i * 0.37) % 1;
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, i % 4 === 0 ? 0.04 : 0.32, 0.26), roughness: 0.3, metalness: 0.55 });
      const carB = new THREE.Mesh(carGeo, mat); carB.position.set(x, 0.9, z); ground.add(carB);
      const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.2, metalness: 0.6 })); roof.position.set(x - 0.2, 1.8, z); ground.add(roof);
      for (const dx of [-1.5, 1.5]) for (const dz of [-0.95, 0.95]) { const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.x = Math.PI / 2; w.position.set(x + dx, 0.34, z + dz); ground.add(w); }
    }
    // a kerb and the centre line
    const kerbMat = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.9 });
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.3), kerbMat);
    kerb.position.set(x0 + W / 2, 0.09, 3.6); ground.add(kerb);
    const kerb2 = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.3), kerbMat);
    kerb2.position.set(x0 + W / 2, 0.09, 3.6 + 22); ground.add(kerb2);
    const dashGeo = new THREE.PlaneGeometry(2.2, 0.16);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c86a });
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, Math.ceil(W / 5));
    const mm = new THREE.Matrix4();
    for (let i = 0; i < dashes.count; i++) { mm.makeRotationX(-Math.PI / 2); mm.setPosition(x0 + i * 5 + 1, 0.01, 3.6 + 11); dashes.setMatrixAt(i, mm); }
    ground.add(dashes);
    // street lamps every nine cells
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9, 6), armGeo = new THREE.BoxGeometry(2.2, 0.12, 0.12), headGeo = new THREE.BoxGeometry(0.9, 0.22, 0.4);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.6, metalness: 0.4 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffe3a0, emissiveIntensity: night ? 2.5 : 0.1 });
    lampMats.length = 0; lampMats.push(lampMat);
    for (let x = 6; x < width * CELL; x += 9 * CELL) {
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.set(x, 4.5, 3.2);
      const arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(x + 1.0, 8.9, 3.2);
      const head = new THREE.Mesh(headGeo, lampMat); head.position.set(x + 2.0, 8.8, 3.2);
      ground.add(pole, arm, head);
      const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffe3a0, transparent: true, opacity: night ? 0.4 : 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      glowS.scale.set(7, 4.5, 1); glowS.position.set(x + 2.0, 8.2, 3.3); glowS.userData.lamp = true; ground.add(glowS);
      // a hydrant and a bin now and then
      if ((x / CELL) % 2 < 1) { const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.5 })); hyd.position.set(x + 5, 0.5, 2.6); ground.add(hyd); }
      else { const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 1.3, 10), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.8 })); bin.position.set(x + 4, 0.65, 2.7); ground.add(bin); }
    }
    streetBuilt = true;
  }
  const lampMats = [];
  const softTex = canvasTex(Icons().soft(64));

  // ---- the far rows ------------------------------------------------------------------------------------------------
  const farUniforms = { uNight: { value: 0 }, uDim: { value: 1 }, uTime: { value: 0 }, uTint: { value: new THREE.Color(0.55, 0.55, 0.6) }, uFogCol: { value: new THREE.Color(0xc9d6e6) }, uFogA: { value: 120 }, uFogB: { value: 420 } };
  const farGroup = new THREE.Group();
  scene.add(farGroup);
  function buildFar(width, seed) {
    for (const c of farGroup.children.slice()) { farGroup.remove(c); c.geometry.dispose(); }
    let r = seed * 7919 + 17;
    const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
    const rows = [{ z: ROW2_Z, n: Math.ceil(width / 6) + 8, hMin: 5, hMax: 22, w: [14, 30], dim: 0.48, tint: [0.42, 0.44, 0.52] }, { z: ROW3_Z, n: Math.ceil(width / 5) + 14, hMin: 14, hMax: 46, w: [16, 36], dim: 0.34, tint: [0.36, 0.4, 0.5] }];
    for (const row of rows) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      geo.translate(0, 0.5, 0);
      const sizes = new Float32Array(row.n * 3), seeds = new Float32Array(row.n);
      const mat = new THREE.ShaderMaterial({ vertexShader: FAR_VS, fragmentShader: FAR_FS, uniforms: Object.assign({}, farUniforms, { uDim: { value: row.dim }, uTint: { value: new THREE.Color(...row.tint) } }) });
      const inst = new THREE.InstancedMesh(geo, mat, row.n);
      const m = new THREE.Matrix4();
      let x = -60;
      for (let i = 0; i < row.n; i++) {
        const w = row.w[0] + rnd() * (row.w[1] - row.w[0]), h = (row.hMin + rnd() * (row.hMax - row.hMin)) * CELL, d = 14 + rnd() * 16;
        sizes[i * 3] = w; sizes[i * 3 + 1] = h; sizes[i * 3 + 2] = d; seeds[i] = rnd();
        m.identity(); m.setPosition(x + w / 2, 0, row.z - rnd() * 10);
        inst.setMatrixAt(i, m);
        x += w + 2 + rnd() * 6;
      }
      geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 3));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
      inst.frustumCulled = false;
      farGroup.add(inst);
    }
    // clouds
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(Icons().cloud(i)), transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      sp.scale.set(120 + rnd() * 100, 45 + rnd() * 30, 1);
      sp.position.set(-100 + rnd() * (width * CELL + 200), 150 + rnd() * 120, -300 - rnd() * 120);
      sp.userData.cloud = true; sp.userData.drift = 0.6 + rnd() * 0.8;
      farGroup.add(sp);
    }
  }

  // ---- the buildings --------------------------------------------------------------------------------------------------
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);
  const facadeUniformsAll = [];
  const signsTex = canvasTex(Icons().signAtlas());
  const buildingViews = new Map();   // b.id → view
  let cityRef = null, stateRef = null;
  const FLAG_LIT = 1, FLAG_CURTAIN = 2, FLAG_BLIND = 4, FLAG_AC = 8, FLAG_ITEM = 16;
  function packCells(b, data, seedRnd) {
    for (let k = 0; k < b.cells.length; k++) {
      const o = k * 4;
      data[o] = b.cells[k]; data[o + 1] = b.state[k];
      if (data[o + 2] === 0 && data[o + 3] === 0) {
        const s = seedRnd();
        data[o + 2] = Math.floor(s * 255);
        let flags = 0;
        if (s < 0.62) flags |= FLAG_LIT;
        const s2 = seedRnd();
        if (s2 < 0.28) flags |= FLAG_CURTAIN; else if (s2 < 0.52) flags |= FLAG_BLIND;
        if (seedRnd() < 0.18 && b.cells[k] === 0) flags |= FLAG_AC;
        data[o + 3] = flags;
      } else {
        data[o + 3] &= ~FLAG_ITEM;
      }
    }
  }
  function buildBuilding(b, fam, seedRnd) {
    const g = new THREE.Group();
    g.position.set(b.x0 * CELL, 0, 0);
    const W = b.cols * CELL, H = b.floors * CELL;
    // the body: sides, back, roof in the family's tile
    const wallTex = tex(FAMILY_TILE[fam.id]);
    const sideMat = new THREE.MeshStandardMaterial({ map: tile(FAMILY_TILE[fam.id], DEPTH / (CELL * FAMILY_TILE_CELLS[fam.id]), H / (CELL * FAMILY_TILE_CELLS[fam.id])), roughness: 0.92, metalness: fam.id === 'steel' || fam.id === 'glass' ? 0.35 : 0.02 });
    const roofMat = new THREE.MeshStandardMaterial({ map: tile('roof', W / 10, DEPTH / 10), roughness: 1 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, DEPTH), [sideMat, sideMat, roofMat, backMat, backMat, backMat]);   // +x -x +y -y +z(front, hidden by the facade) -z
    body.position.set(W / 2, H / 2, -DEPTH / 2);
    g.add(body);
    // a parapet and rooftop kit: a water tank, an AC plant, a vent or two
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.7, DEPTH + 0.3), new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 0.9 }));
    parapet.position.set(W / 2, H + 0.3, -DEPTH / 2); g.add(parapet);
    const kitMat = new THREE.MeshStandardMaterial({ map: tile('steel', 0.5, 0.5), roughness: 0.6, metalness: 0.5 });
    const r1 = seedRnd(), r2 = seedRnd();
    if (r1 < 0.45) { const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 12), kitMat); tank.position.set(W * (0.25 + r2 * 0.5), H + 2.3, -DEPTH * 0.55); g.add(tank); const legs = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), kitMat); legs.position.set(tank.position.x, H + 0.6, tank.position.z); g.add(legs); }
    else { const ac = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 2.6), kitMat); ac.position.set(W * (0.2 + r2 * 0.6), H + 0.8, -DEPTH * 0.4); g.add(ac); }
    for (let i = 0; i < 1 + Math.floor(seedRnd() * 3); i++) { const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8), kitMat); vent.position.set(1.5 + seedRnd() * (W - 3), H + 0.7, -1.5 - seedRnd() * (DEPTH - 3)); g.add(vent); }
    if (b.floors >= 10 && seedRnd() < 0.5) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 7, 6), kitMat); mast.position.set(W * 0.5, H + 3.5, -DEPTH * 0.5); g.add(mast); const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); beacon.position.set(W * 0.5, H + 7.1, -DEPTH * 0.5); beacon.userData.beacon = true; g.add(beacon); }
    // the facade
    const data = new Uint8Array(b.cols * b.floors * 4);
    packCells(b, data, seedRnd);
    const cellsTex = new THREE.DataTexture(data, b.cols, b.floors, THREE.RGBAFormat, THREE.UnsignedByteType);
    cellsTex.magFilter = cellsTex.minFilter = THREE.NearestFilter; cellsTex.needsUpdate = true;
    const brand = b.restaurant ? BRAND_COLOR[b.restaurant] : [0.5, 0.5, 0.5, 0.8, 0.8, 0.8];
    const neonSpan = b.neon ? { c0: b.neon.cells[0] % b.cols, w: b.neon.cells.length } : { c0: 0, w: 1 };
    const uniforms = {
      uCells: { value: cellsTex }, uWall: { value: wallTex }, uSigns: { value: signsTex },
      uCols: { value: b.cols }, uFloors: { value: b.floors }, uCell: { value: CELL }, uTileCells: { value: FAMILY_TILE_CELLS[fam.id] },
      uSeed: { value: seedRnd() }, uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uDay: { value: night ? 0 : 1 }, uWear: { value: look.wear }, uRoomLight: { value: look.roomLight }, uCollapse: { value: 0 },
      uInnards: { value: new THREE.Vector3(...FAMILY_INNARDS[fam.id]) }, uCamPos: { value: new THREE.Vector3() }, uOrigin: { value: new THREE.Vector3(b.x0 * CELL, 0, 0) },
      uSky: { value: new THREE.Color(palette.day.top) }, uGround: { value: new THREE.Color(palette.day.ground) }, uSunDir: { value: skyUniforms.uSunDir.value.clone() },
      uBrandA: { value: new THREE.Vector3(brand[0], brand[1], brand[2]) }, uBrandB: { value: new THREE.Vector3(brand[3], brand[4], brand[5]) }, uBrand: { value: b.restaurant ? BRAND_ID[b.restaurant] : 0 },
      uNeonC0: { value: neonSpan.c0 }, uNeonW: { value: neonSpan.w }, uNeonIdx: { value: Math.floor(seedRnd() * 8) }, uNeonLit: { value: 0 }, uNeonHue: { value: seedRnd() },
    };
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShaderMaterial({ vertexShader: FACADE_VS, fragmentShader: FACADE_FS, uniforms, glslVersion: THREE.GLSL3 }));
    facade.position.set(W / 2, H / 2, 0.02);
    g.add(facade);
    facadeUniformsAll.push(uniforms);
    // the brand mark over the storefront
    if (b.restaurant) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: canvasTex(Icons().brandMark(b.restaurant, 256)), transparent: true }));
      mark.position.set(W / 2, CELL * 0.86, 0.12); g.add(mark);
      const marquee = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: new THREE.Color(brand[0], brand[1], brand[2]), emissive: new THREE.Color(brand[0], brand[1], brand[2]), emissiveIntensity: night ? 0.9 : 0.15, roughness: 0.5 }));
      marquee.position.set(W / 2, CELL * 0.98, 0.3); marquee.userData.marquee = true; g.add(marquee);
    }
    // the rubble for later, hidden
    const rubble = makeRubble(W, seedRnd);
    rubble.visible = false; g.add(rubble);
    cityGroup.add(g);
    const view = { g, body, facade, uniforms, data, cellsTex, rubble, parapet, W, H, collapsed: false, dropShown: 0, items: new Map(), fam };
    buildingViews.set(b.id, view);
    return view;
  }
  function makeRubble(W, seedRnd) {
    const geo = new THREE.PlaneGeometry(W + 3, DEPTH + 3, 12, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const edge = Math.min(1, Math.min(Math.abs(x) / ((W + 3) / 2), Math.abs(y) / ((DEPTH + 3) / 2)));
      pos.setZ(i, (1 - edge) * (1.2 + seedRnd() * 1.6));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tile('rubble', (W + 3) / 8, (DEPTH + 3) / 8), roughness: 1 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.position.set(W / 2, 0.05, -DEPTH / 2 + 1);
    return m;
  }
  function refreshCells(view, b) {
    const d = view.data;
    for (let k = 0; k < b.cells.length; k++) { d[k * 4] = b.cells[k]; d[k * 4 + 1] = b.state[k]; }
    view.cellsTex.needsUpdate = true;
  }
  function setItemFlag(view, k, on) {
    if (on) view.data[k * 4 + 3] |= FLAG_ITEM; else view.data[k * 4 + 3] &= ~FLAG_ITEM;
    view.cellsTex.needsUpdate = true;
  }

  // ---- the things in the windows ----------------------------------------------------------------------------------------
  const itemViews = new Map();   // item id → sprite
  const iconTex = {};
  function iconTexture(name) { if (!iconTex[name]) iconTex[name] = canvasTex(Icons().icon(name, 128)); return iconTex[name]; }
  function syncItems(state) {
    const seen = new Set();
    for (const it of state.items) {
      seen.add(it.id);
      let v = itemViews.get(it.id);
      if (!v) {
        const name = it.deal === 'fryer' ? 'fryer' : it.deal;
        const mat = new THREE.MeshBasicMaterial({ map: iconTexture(name), transparent: true, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.62, CELL * 0.62), mat);
        mesh.position.set(it.x * CELL, (it.row + 0.5) * CELL - CELL * 0.08, -CELL * 0.3);
        mesh.renderOrder = 2;
        cityGroup.add(mesh);
        v = { mesh, mat, deal: it.deal, hot: it.hot, glow: null, t: 0 };
        if (it.deal === 'streamer' || it.deal === 'battery' || it.deal === 'supplement' || it.deal === 'corridor') {
          const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: it.deal === 'battery' ? 0xff7a1a : it.deal === 'supplement' ? 0x7ed957 : it.deal === 'corridor' ? 0x9ad8ff : 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
          gl.scale.set(CELL * 1.2, CELL * 1.2, 1); gl.position.copy(mesh.position); gl.position.z += 0.2; cityGroup.add(gl); v.glow = gl;
        }
        itemViews.set(it.id, v);
        const bv = buildingViews.get(it.b); if (bv) setItemFlag(bv, it.k, true);
      }
      v.t += 0.016;
      if (it.deal === 'fryer' && !it.hot && !v.cooled) { v.cooled = true; v.mat.map = iconTexture('toast'); v.mat.needsUpdate = true; }
      if (it.deal === 'waver') v.mesh.position.y = (it.row + 0.5) * CELL - CELL * 0.08 + Math.sin(clock.t * 6) * 0.15;
      if (v.glow) {
        const k = it.deal === 'streamer' ? 0.5 + 0.5 * Math.sin(clock.t * 14) * (it.t / Math.max(0.1, state.opts.streamerT)) : it.deal === 'battery' ? 0.55 + 0.45 * Math.sin(clock.t * 25) : 0.6 + 0.2 * Math.sin(clock.t * 3);
        v.glow.material.opacity = 0.35 + 0.5 * k;
        v.glow.scale.setScalar(CELL * (1.1 + 0.3 * k)); v.glow.scale.z = 1;
      }
    }
    for (const [id, v] of itemViews) {
      if (!seen.has(id)) { cityGroup.remove(v.mesh); if (v.glow) cityGroup.remove(v.glow); v.mesh.geometry.dispose(); itemViews.delete(id); }
    }
  }

  // ---- effects: debris, dust, shards, sparks, flashes -----------------------------------------------------------------------
  const DEBRIS_N = 420, DUST_N = 360, SHARD_N = 240, SPARK_N = 200;
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: false });
  const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS_N);
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  debris.frustumCulled = false;
  const debrisColor = new Float32Array(DEBRIS_N * 3);
  debris.instanceColor = new THREE.InstancedBufferAttribute(debrisColor, 3);
  const debrisPool = [];
  for (let i = 0; i < DEBRIS_N; i++) debrisPool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 1, sx: 1, sy: 1, sz: 1, life: 0, rest: 0 });
  scene.add(debris);
  const dustMat = new THREE.SpriteMaterial({ map: softTex, color: 0xb8ad9e, transparent: true, opacity: 0.5, depthWrite: false });
  const dustPool = [];
  const dustGroup = new THREE.Group(); scene.add(dustGroup);
  for (let i = 0; i < DUST_N; i++) { const sp = new THREE.Sprite(dustMat.clone()); sp.visible = false; dustGroup.add(sp); dustPool.push({ sp, alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, grow: 1, life: 0, max: 1, a: 0.5 }); }
  const shardGeo = new THREE.PlaneGeometry(1, 1);
  const shardMat = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, SHARD_N);
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shards.frustumCulled = false;
  const shardPool = [];
  for (let i = 0; i < SHARD_N; i++) shardPool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, wx: 0, wy: 0, s: 0.3, life: 0 });
  scene.add(shards);
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(SPARK_N * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xfff3a0, size: 0.45, map: softTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; scene.add(sparks);
  const sparkPool = [];
  for (let i = 0; i < SPARK_N; i++) sparkPool.push({ alive: false, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  const flashes = [];   // { sprite, life }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  const rnd = () => Math.random();
  function spawnDebris(x, y, z, n, spread, color, big) {
    let made = 0;
    for (const d of debrisPool) {
      if (d.alive) continue;
      d.alive = true; d.life = 3.5 + rnd() * 2; d.rest = 0;
      d.x = x + (rnd() - 0.5) * spread; d.y = y + (rnd() - 0.5) * spread * 0.6; d.z = z + rnd() * 1.5;
      d.vx = (rnd() - 0.5) * 7; d.vy = 2 + rnd() * 7; d.vz = 2 + rnd() * 6;
      d.rx = rnd() * TAU; d.ry = rnd() * TAU; d.rz = rnd() * TAU; d.wx = (rnd() - 0.5) * 8; d.wy = (rnd() - 0.5) * 8; d.wz = (rnd() - 0.5) * 8;
      const sc = (big ? 0.5 : 0.22) + rnd() * (big ? 0.9 : 0.35);
      d.sx = sc * (0.6 + rnd() * 0.8); d.sy = sc * (0.4 + rnd() * 0.6); d.sz = sc * (0.6 + rnd() * 0.8);
      const k = 0.7 + rnd() * 0.5;
      debrisColor[debrisPool.indexOf(d) * 3] = color[0] * k; debrisColor[debrisPool.indexOf(d) * 3 + 1] = color[1] * k; debrisColor[debrisPool.indexOf(d) * 3 + 2] = color[2] * k;
      if (++made >= n) break;
    }
    debris.instanceColor.needsUpdate = true;
  }
  function spawnDust(x, y, z, n, size, life, vx, vy, alpha) {
    let made = 0;
    for (const d of dustPool) {
      if (d.alive) continue;
      d.alive = true; d.sp.visible = true; d.life = 0; d.max = life * (0.7 + rnd() * 0.6);
      d.x = x + (rnd() - 0.5) * 2; d.y = y + rnd() * 1.5; d.z = z + rnd() * 2;
      d.vx = (vx || 0) + (rnd() - 0.5) * 2.5; d.vy = (vy || 0) + rnd() * 1.2; d.vz = 0.5 + rnd() * 2.5;
      d.s = size * (0.6 + rnd() * 0.8); d.grow = 0.9 + rnd() * 0.8; d.a = (alpha || 0.5) * (0.7 + rnd() * 0.5);
      d.sp.material.opacity = 0; d.sp.material.color.setHex(night ? 0x3e3834 : 0xc9bda8); if (night) d.a *= 0.55;
      if (++made >= n) break;
    }
  }
  function spawnShards(x, y, z, n) {
    let made = 0;
    for (const s of shardPool) {
      if (s.alive) continue;
      s.alive = true; s.life = 1.6 + rnd();
      s.x = x + (rnd() - 0.5) * 2.5; s.y = y + (rnd() - 0.5) * 2.5; s.z = z + rnd();
      s.vx = (rnd() - 0.5) * 5; s.vy = 1 + rnd() * 5; s.vz = 3 + rnd() * 5;
      s.rx = rnd() * TAU; s.ry = rnd() * TAU; s.wx = (rnd() - 0.5) * 12; s.wy = (rnd() - 0.5) * 12; s.s = 0.25 + rnd() * 0.45;
      if (++made >= n) break;
    }
  }
  function spawnSparks(x, y, z, n, speed) {
    let made = 0;
    for (const s of sparkPool) {
      if (s.alive) continue;
      s.alive = true; s.life = 0.35 + rnd() * 0.5;
      s.x = x; s.y = y; s.z = z;
      const a = rnd() * TAU, b = (rnd() - 0.3) * Math.PI;
      s.vx = Math.cos(a) * Math.cos(b) * speed; s.vy = Math.sin(b) * speed + 2; s.vz = Math.sin(a) * Math.cos(b) * speed * 0.6 + 1;
      if (++made >= n) break;
    }
  }
  function flash(x, y, z, size, color, life, add) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color, transparent: true, opacity: 1, depthWrite: false, blending: add === false ? THREE.NormalBlending : THREE.AdditiveBlending }));
    sp.position.set(x, y, z); sp.scale.set(size, size, 1); scene.add(sp);
    flashes.push({ sp, life: 0, max: life });
  }
  let thudT = 0, thudAmt = 0;
  let screenFlash = 0;
  function stepEffects(dt) {
    const G = 24;
    for (let i = 0; i < DEBRIS_N; i++) {
      const d = debrisPool[i];
      if (!d.alive) { _m4.makeScale(0, 0, 0); debris.setMatrixAt(i, _m4); continue; }
      d.life -= dt;
      if (d.life <= 0) { d.alive = false; _m4.makeScale(0, 0, 0); debris.setMatrixAt(i, _m4); continue; }
      if (!d.rest) {
        d.vy -= G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
        const floor = d.sy * 0.5;
        if (d.y < floor) { d.y = floor; if (Math.abs(d.vy) > 4) { d.vy = -d.vy * 0.35; d.vx *= 0.6; d.vz *= 0.6; d.wx *= 0.5; d.wz *= 0.5; } else { d.rest = 1; d.vx = d.vy = d.vz = 0; d.wx = d.wy = d.wz = 0; } }
        if (d.z > 3.4 && d.y < 0.4) { d.vz *= 0.8; }
      }
      const fade = d.life < 0.6 ? d.life / 0.6 : 1;
      _e.set(d.rx, d.ry, d.rz); _q.setFromEuler(_e); _v.set(d.x, d.y, d.z); _s.set(d.sx * fade, d.sy * fade, d.sz * fade);
      _m4.compose(_v, _q, _s); debris.setMatrixAt(i, _m4);
    }
    debris.instanceMatrix.needsUpdate = true;
    for (const d of dustPool) {
      if (!d.alive) continue;
      d.life += dt;
      if (d.life >= d.max) { d.alive = false; d.sp.visible = false; continue; }
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.vx *= 1 - dt * 0.6; d.vz *= 1 - dt * 0.8; d.vy = Math.max(0.2, d.vy - dt * 0.4);
      const k = d.life / d.max;
      const sc = d.s * (1 + d.grow * k * 2.2) * look.dust;
      d.sp.scale.set(sc, sc * 0.8, 1); d.sp.position.set(d.x, d.y, d.z);
      d.sp.material.opacity = d.a * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k * 0.5);
    }
    for (let i = 0; i < SHARD_N; i++) {
      const s = shardPool[i];
      if (!s.alive) { _m4.makeScale(0, 0, 0); shards.setMatrixAt(i, _m4); continue; }
      s.life -= dt;
      if (s.life <= 0) { s.alive = false; _m4.makeScale(0, 0, 0); shards.setMatrixAt(i, _m4); continue; }
      s.vy -= G * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rx += s.wx * dt; s.ry += s.wy * dt;
      if (s.y < 0.02) { s.y = 0.02; s.vy = 0; s.vx *= 0.5; s.vz *= 0.5; s.wx = s.wy = 0; s.rx = -Math.PI / 2; }
      _e.set(s.rx, s.ry, 0); _q.setFromEuler(_e); _v.set(s.x, s.y, s.z); _s.set(s.s, s.s * 0.6, 1);
      _m4.compose(_v, _q, _s); shards.setMatrixAt(i, _m4);
    }
    shards.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < SPARK_N; i++) {
      const s = sparkPool[i];
      if (s.alive) { s.life -= dt; if (s.life <= 0) s.alive = false; else { s.vy -= 18 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; } }
      sparkPos[i * 3] = s.alive ? s.x : 0; sparkPos[i * 3 + 1] = s.alive ? s.y : -100; sparkPos[i * 3 + 2] = s.alive ? s.z : 0;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life += dt;
      const k = f.life / f.max;
      if (k >= 1) { scene.remove(f.sp); f.sp.material.dispose(); flashes.splice(i, 1); continue; }
      f.sp.material.opacity = 1 - k; f.sp.scale.multiplyScalar(1 + dt * 1.5);
    }
    if (thudT > 0) thudT -= dt;
    if (screenFlash > 0) screenFlash -= dt * 2.2;
  }

  // ---- actors -------------------------------------------------------------------------------------------------------------
  const actorGroup = new THREE.Group();
  scene.add(actorGroup);
  const monsterViews = new Map(), soldierViews = new Map(), carViews = new Map();
  let tankView = null, droneView = null, blimpView = null, subwayView = null;
  const MON_Z = 1.2, SOLDIER_Z = 2.4, CAR_Z = 9.6, TANK_Z = 8.0, DRONE_Z = 1.5, BOT_Z = 1.9;
  const FALLBACK_COLOR = { george: 0xffd23a, lizzie: 0x3f7fd8, ralph: 0xf28c28 };
  function fitModel(model, height, faceYaw) {
    // precise: Meshy rigs keep the geometry at a hundredth under the armature and the bones in centimetres —
    // only the skinned vertices tell the truth about the size
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const k = height / h;
    model.scale.setScalar(k);
    model.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
    model.rotation.y = faceYaw || 0;
    return k;
  }
  function makeRig(asset, height, fallback) {
    const root = new THREE.Group();
    const view = { root, model: null, mixer: null, actions: {}, current: null, currentName: '', mats: [], fitted: 1, inner: new THREE.Group() };
    root.add(view.inner);
    if (asset) {
      const model = skeletonClone(asset.scene);
      model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); view.mats.push(o.material); } });
      view.fitted = fitModel(model, height, 0);
      view.inner.add(model); view.model = model;
      view.mixer = new THREE.AnimationMixer(model);
      for (const k in asset.clips) view.actions[k] = view.mixer.clipAction(asset.clips[k]);
    } else {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(height * 0.16, height * 0.55, 4, 10), new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.6 }));
      body.position.y = height * 0.5; view.inner.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(height * 0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf1d0b0, roughness: 0.7 }));
      head.position.y = height * 0.88; view.inner.add(head);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(height * 0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(s * height * 0.05, height * 0.9, height * 0.12); view.inner.add(e); }
      view.model = body; view.mats = [body.material];
    }
    actorGroup.add(root);
    return view;
  }
  function play(view, name, opts) {
    const a = view.actions[name];
    if (!a) return false;
    if (view.current === a && !(opts && opts.restart)) { if (opts && opts.speed != null) a.timeScale = opts.speed; return true; }
    if (view.current) view.current.fadeOut(opts && opts.fade != null ? opts.fade : 0.14);
    a.reset(); a.setLoop(opts && opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = true;
    a.timeScale = (opts && opts.speed) || 1;
    a.fadeIn(opts && opts.fade != null ? opts.fade : 0.12).play();
    view.current = a; view.currentName = name;
    return true;
  }
  function syncMonsters(state, dt) {
    const seen = new Set();
    for (const m of state.monsters) {
      seen.add(m.id);
      let v = monsterViews.get(m.id);
      if (!v) {
        v = makeRig(models.monsters[m.slug], CELL * 1.8, FALLBACK_COLOR[m.slug]);
        v.teen = null; v.slug = m.slug; v.prevAnim = ''; v.punchSide = 0; v.shadow = makeShadow(3.2);
        v.root.add(v.shadow);
        v.smoothX = m.x * CELL; v.smoothY = m.y * CELL; v.yaw = 0; v.scaleK = 1;
        monsterViews.set(m.id, v);
      }
      const gone = m.st === 'gone' || m.st === 'dead';
      v.root.visible = !gone;
      if (gone) continue;
      // position: ease the x on a face (the core snaps to columns), follow y directly
      const tx = m.x * CELL, ty = m.y * CELL;
      const k = m.st === 'climb' ? Math.min(1, dt * 14) : 1;
      v.smoothX += (tx - v.smoothX) * k; v.smoothY = ty;
      const onFace = m.st === 'climb';
      const z = onFace ? MON_Z - 0.4 : MON_Z;
      v.root.position.set(v.smoothX, v.smoothY, m.st === 'roof' ? z - DEPTH * 0.3 : z);
      // facing: on the street, left or right; on a face, into the wall; the revert faces us
      let targetYaw = onFace ? Math.PI : (m.facing > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (m.st === 'revert') targetYaw = 0;
      if (m.st === 'walkoff') targetYaw = m.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      let dy = targetYaw - v.yaw; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
      v.yaw += dy * Math.min(1, dt * 12);
      v.inner.rotation.y = v.yaw;
      // the revert: shrink to a tired teenager
      if (m.st === 'revert') {
        const k2 = Math.min(1, m.stateT / 1.6);
        v.scaleK = 1 - 0.5 * k2 * (1 - k2 * 0.2);
        v.inner.scale.setScalar(v.scaleK);
        v.inner.rotation.z = Math.sin(m.stateT * 30) * 0.05 * (1 - k2);
      } else if (m.st === 'walkoff') {
        if (!v.teen) {
          v.inner.visible = false;
          v.teen = makeRig(models.teen, CELL * 0.85, 0x9a9aa2);
          v.root.add(v.teen.root); actorGroup.remove(v.teen.root);
          play(v.teen, models.teen && models.teen.clips.tired ? 'tired' : 'walk', { speed: 0.9 });
        }
        v.teen.root.rotation.y = m.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (v.teen.mixer) v.teen.mixer.update(dt);
        v.shadow.scale.setScalar(0.45);
        continue;
      } else {
        if (v.teen) { v.root.remove(v.teen.root); v.teen = null; v.inner.visible = true; v.shadow.scale.setScalar(1); }
        v.inner.scale.setScalar(1); v.inner.rotation.z = 0; v.scaleK = 1;
      }
      // shadow on the ground below
      v.shadow.position.y = -v.smoothY + 0.03; v.shadow.material.opacity = Math.max(0.05, 0.4 - v.smoothY * 0.008);
      // animation
      let anim = m.anim;
      if (anim === 'punch') { if (v.prevAnim !== 'punch') v.punchSide ^= 1; anim = v.punchSide ? 'punchR' : 'punchL'; }
      if (anim !== v.prevAnim || (anim === 'punchL' || anim === 'punchR')) {
        const restart = (anim === 'punchL' || anim === 'punchR') && v.prevAnim !== 'punch' && v.currentName !== anim;
        if (anim === 'idle') play(v, 'idle', { speed: 0.9 });
        else if (anim === 'walk') play(v, 'walk', { speed: 1.1 * (m.flavour ? m.flavour.run : 1) });
        else if (anim === 'climb') play(v, 'climb', { speed: 1.2 });
        else if (anim === 'hang') play(v, 'climb', { speed: 0.001 });
        else if (anim === 'punchL' || anim === 'punchR') { if (restart || v.currentName !== anim) play(v, anim, { once: true, restart: true, speed: 2.2 * (m.flavour ? m.flavour.punch : 1), fade: 0.05 }); }
        else if (anim === 'eat') play(v, 'eat', { once: true, restart: true, speed: 2.5, fade: 0.06 });
        else if (anim === 'hit') play(v, 'hit', { once: true, restart: v.prevAnim !== 'hit', speed: 1.6, fade: 0.05 });
        else if (anim === 'fall') play(v, 'fall', { speed: 1 });
        else if (anim === 'jump') play(v, 'jump', { once: true, speed: 1.3 });
        else if (anim === 'revert') play(v, 'hit', { speed: 0.5 });
        else play(v, 'idle');
        v.prevAnim = m.anim === 'punch' ? 'punch' : anim;
      }
      if (!v.actions.idle && v.model && !v.mixer) {
        // the fallback shape: bob a little
        v.inner.position.y = (anim === 'walk' || anim === 'climb') ? Math.abs(Math.sin(clock.t * 9)) * 0.3 : 0;
        v.inner.rotation.x = anim === 'punchL' || anim === 'punchR' ? -0.4 : 0;
      }
      if (v.mixer) v.mixer.update(dt);
      // hurt: a red tint that fades; the spawn shield: a flicker
      const hurt = m.hitT > 0 ? Math.min(1, m.hitT / 0.4) * (Math.floor(clock.t * 20) % 2 ? 1 : 0.4) : 0;
      const fill = night ? 0.34 : 0.1;
      for (const mat of v.mats) { if (mat.emissive) { mat.emissive.setRGB(fill + hurt * 0.45, fill * (1 - hurt * 0.5), fill * (1 - hurt * 0.5)); } }
      v.inner.visible = !(m.invulnT > 0 && Math.floor(clock.t * 14) % 2 === 0);
    }
    for (const [id, v] of monsterViews) if (!seen.has(id)) { actorGroup.remove(v.root); monsterViews.delete(id); }
  }
  function makeShadow(size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.5), new THREE.MeshBasicMaterial({ map: softTex, color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1;
    return m;
  }
  function syncSoldiers(state, dt) {
    const seen = new Set();
    for (const s of state.soldiers) {
      seen.add(s.id);
      let v = soldierViews.get(s.id);
      if (!v) { v = makeRig(models.soldier, 1.85, 0x6b6f3a); v.shadow = makeShadow(1.2); v.root.add(v.shadow); v.prev = ''; soldierViews.set(s.id, v); }
      v.root.position.set(s.x * CELL, s.y * CELL, SOLDIER_Z);
      v.inner.rotation.y = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      let anim = s.st === 'walk' ? 'walk' : s.st === 'flyup' ? 'flyup' : s.st === 'dead' ? 'dead' : 'fire';
      if (anim !== v.prev) {
        if (anim === 'walk') play(v, 'walk', { speed: 1.2 });
        else if (anim === 'fire') play(v, 'fire', { speed: 1 });
        else if (anim === 'flyup') play(v, 'flyup', { once: true, speed: 1.4 });
        else if (anim === 'dead') { v.inner.rotation.z = Math.PI / 2; v.inner.position.y = 0.4; }
        v.prev = anim;
      }
      if (s.st === 'flyup') { v.inner.rotation.z += dt * 6; v.shadow.visible = false; }
      if (v.mixer) v.mixer.update(dt);
      if (!v.mixer) { v.inner.position.y = s.st === 'walk' ? Math.abs(Math.sin(clock.t * 12)) * 0.15 : 0; if (s.st === 'kneel' || s.st === 'fire') v.inner.scale.y = 0.7; else v.inner.scale.y = 1; }
    }
    for (const [id, v] of soldierViews) if (!seen.has(id)) { actorGroup.remove(v.root); soldierViews.delete(id); }
  }
  function makeStatic(name, length, fallbackColor, fallbackSize) {
    const root = new THREE.Group();
    const inner = new THREE.Group(); root.add(inner);
    const asset = models.statics[name];
    if (asset) {
      const model = asset.clone(true);
      const box = new THREE.Box3().setFromObject(model);
      const dims = new THREE.Vector3(); box.getSize(dims);
      const longest = Math.max(dims.x, dims.z);
      const k = length / Math.max(0.01, longest);
      model.scale.setScalar(k);
      model.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
      if (dims.z > dims.x) model.rotation.y = Math.PI / 2;   // the long side along x
      inner.add(model);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(fallbackSize[0], fallbackSize[1], fallbackSize[2]), new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.5, metalness: 0.3 }));
      m.position.y = fallbackSize[1] / 2; inner.add(m);
    }
    actorGroup.add(root);
    return { root, inner, mats: [] };
  }
  function syncVehicles(state, dt) {
    // cars
    const seen = new Set();
    for (const c of state.cars) {
      seen.add(c.id);
      let v = carViews.get(c.id);
      if (!v) {
        const len = c.kind === 'bot' ? 1.3 : c.kind === 'cruiser' ? 5.2 : 4.8;
        v = makeStatic(c.kind, len, c.kind === 'taxi' ? 0xf2d24b : c.kind === 'bot' ? 0xf4f4f4 : 0xf0f0f0, c.kind === 'bot' ? [1.2, 0.9, 0.8] : [4.8, 1.5, 2]);
        v.kind = c.kind; v.shadow = makeShadow(c.kind === 'bot' ? 1.6 : 5.5); v.root.add(v.shadow); v.wrecked = false;
        if (c.kind === 'cruiser') {
          v.lights = [];
          for (const [dx, col] of [[-0.5, 0xff2020], [0.5, 0x2060ff]]) { const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: col, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); l.scale.set(2.2, 2.2, 1); l.position.set(dx, 1.75, 0); v.inner.add(l); v.lights.push(l); }
        }
        carViews.set(c.id, v);
      }
      v.root.position.set(c.x * CELL, 0, c.kind === 'bot' ? BOT_Z : CAR_Z);
      v.inner.rotation.y = c.vx > 0 ? 0 : Math.PI;
      if (c.st === 'wreck' && !v.wrecked) { v.wrecked = true; v.inner.rotation.z = (c.x * 7 % 2 < 1 ? 1 : -1) * 0.55; v.inner.position.y = 0.4; v.inner.rotation.y += 0.6; if (v.lights) v.lights.forEach((l) => { l.visible = false; }); }
      if (v.lights && !v.wrecked) { const on = Math.floor(clock.t * 6) % 2; v.lights[0].material.opacity = on ? 1 : 0.1; v.lights[1].material.opacity = on ? 0.1 : 1; }
      if (c.kind === 'bot' && c.st === 'drive') v.inner.position.y = Math.abs(Math.sin(clock.t * 8)) * 0.03;
    }
    for (const [id, v] of carViews) if (!seen.has(id)) { actorGroup.remove(v.root); carViews.delete(id); }
    // the armoured truck
    const tk = state.tank;
    if (tk) {
      if (!tankView) { tankView = makeStatic('swat', 8.2, 0x1c1c22, [8, 3, 3]); tankView.shadow = makeShadow(9); tankView.root.add(tankView.shadow); tankView.wrecked = false; tankView.smoke = 0; }
      tankView.root.position.set(tk.x * CELL, 0, TANK_Z);
      tankView.inner.rotation.y = tk.dir > 0 ? 0 : Math.PI;
      if (tk.st === 'wreck') { if (!tankView.wrecked) { tankView.wrecked = true; tankView.inner.rotation.z = 0.35; tankView.inner.position.y = 0.6; } tankView.smoke -= dt; if (tankView.smoke <= 0) { tankView.smoke = 0.12; spawnDust(tk.x * CELL, 2.5, TANK_Z, 1, 2.2, 1.8, 0, 2.5, 0.5); } }
      else if (tk.st === 'roll') tankView.inner.position.y = Math.abs(Math.sin(clock.t * 10)) * 0.05;
    } else if (tankView) { actorGroup.remove(tankView.root); tankView = null; }
    // the drone
    const d = state.drone;
    if (d) {
      if (!droneView) {
        droneView = makeStatic('drone', 4.2, 0x5a6a3a, [4, 0.8, 4]);
        droneView.rotors = [];
        const discMat = new THREE.MeshBasicMaterial({ color: 0x333338, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
        for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) { const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18), discMat); disc.rotation.x = -Math.PI / 2; disc.position.set(dx, 1.05, dz); droneView.inner.add(disc); droneView.rotors.push(disc); }
        droneView.shadow = makeShadow(4.5); droneView.root.add(droneView.shadow);
        droneView.light = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xff3030, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); droneView.light.scale.set(1.2, 1.2, 1); droneView.light.position.set(0, 0.6, 0); droneView.inner.add(droneView.light);
      }
      droneView.root.position.set(d.x * CELL, d.y * CELL, DRONE_Z);
      droneView.inner.rotation.z = d.st === 'dead' ? d.spin : Math.sin(clock.t * 2.1) * 0.08;
      droneView.inner.rotation.x = d.st === 'dead' ? d.spin * 0.7 : (d.st === 'move' ? -0.18 : 0.02);
      for (const r of droneView.rotors) r.rotation.z += dt * 40;
      droneView.shadow.position.y = -d.y * CELL + 0.03; droneView.shadow.material.opacity = Math.max(0.04, 0.3 - d.y * 0.01);
      droneView.light.material.opacity = 0.4 + 0.5 * (Math.floor(clock.t * 3) % 2);
      if (d.st === 'dead') { if (Math.random() < 0.5) spawnDust(d.x * CELL, d.y * CELL, DRONE_Z, 1, 1.8, 1.2, 0, 1.5, 0.55); if (Math.random() < 0.3) spawnSparks(d.x * CELL, d.y * CELL, DRONE_Z, 3, 4); }
    } else if (droneView) { actorGroup.remove(droneView.root); droneView = null; }
    // bullets and shells as small bright streaks
    syncBullets(state);
    // the blimp
    if (state.blimp) {
      if (!blimpView) blimpView = makeBlimp(state.day);
      blimpView.position.set(state.blimp.x * CELL, state.blimp.y * CELL, -DEPTH * 0.5);
      blimpView.rotation.z = Math.sin(clock.t * 0.5) * 0.02;
      blimpView.visible = true;
    } else if (blimpView) blimpView.visible = false;
  }
  const bulletGeo = new THREE.BufferGeometry();
  const BULLET_MAX = 200;
  const bulletPos = new Float32Array(BULLET_MAX * 6);
  bulletGeo.setAttribute('position', new THREE.BufferAttribute(bulletPos, 3));
  const bulletLines = new THREE.LineSegments(bulletGeo, new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.9 }));
  bulletLines.frustumCulled = false; scene.add(bulletLines);
  const shellGroup = new THREE.Group(); scene.add(shellGroup);
  const shellPool = [];
  function syncBullets(state) {
    let n = 0;
    for (const b of state.bullets) {
      if (n >= BULLET_MAX) break;
      const o = n * 6; const len = 0.06;
      bulletPos[o] = b.x * CELL; bulletPos[o + 1] = b.y * CELL; bulletPos[o + 2] = SOLDIER_Z;
      bulletPos[o + 3] = (b.x - b.vx * len) * CELL; bulletPos[o + 4] = (b.y - b.vy * len) * CELL; bulletPos[o + 5] = SOLDIER_Z;
      n++;
    }
    for (let i = n; i < BULLET_MAX; i++) { const o = i * 6; bulletPos[o] = bulletPos[o + 3] = 0; bulletPos[o + 1] = bulletPos[o + 4] = -100; bulletPos[o + 2] = bulletPos[o + 5] = 0; }
    bulletGeo.setDrawRange(0, n * 2); bulletGeo.attributes.position.needsUpdate = true;
    while (shellPool.length < state.shells.length) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4, metalness: 0.6 })); shellGroup.add(m); shellPool.push(m); }
    shellPool.forEach((m, i) => { const s = state.shells[i]; m.visible = !!s; if (s) { m.position.set(s.x * CELL, s.y * CELL, TANK_Z - 1); if (Math.random() < 0.6) spawnDust(s.x * CELL, s.y * CELL, TANK_Z - 1, 1, 0.9, 0.6, 0, 0, 0.35); } });
  }
  function makeBlimp(day) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.5, metalness: 0.1 }));
    body.scale.set(9, 3.2, 3.2); g.add(body);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.2), body.material); fin.position.set(-7.5, 1.2, 0); g.add(fin);
    const fin2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.6), body.material); fin2.position.set(-7.5, 0, 0); g.add(fin2);
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.6 })); gondola.position.set(0.5, -3.3, 0); g.add(gondola);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 2), new THREE.MeshBasicMaterial({ map: canvasTex(Icons().banner(day)), side: THREE.DoubleSide }));
    banner.position.set(-18, -0.5, 0); g.add(banner);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4), gondola.material); rope.rotation.z = Math.PI / 2; rope.position.set(-9.2, -0.5, 0); g.add(rope);
    scene.add(g);
    return g;
  }
  function makeSubway(x) {
    const g = new THREE.Group();
    g.position.set(x * CELL, 0, 2.2);
    const rail = new THREE.MeshStandardMaterial({ color: 0x1f6b3a, roughness: 0.5, metalness: 0.4 });
    for (const dx of [-1.6, 1.6]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 3.0), rail); r.position.set(dx, 0.55, 0); g.add(r); const top = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.0), rail); top.position.set(dx, 1.1, 0); g.add(top); }
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.0), new THREE.MeshBasicMaterial({ color: 0x06060a })); hole.rotation.x = -Math.PI / 2; hole.position.set(0, 0.06, 0); g.add(hole);
    const steps = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x55555a, roughness: 0.9 })); steps.position.set(0, -0.1, 1.2); g.add(steps);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), rail); post.position.set(2.0, 1.7, 1.4); g.add(post);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9dffb0, emissive: 0x3aff70, emissiveIntensity: 1.6 })); globe.position.set(2.0, 3.5, 1.4); g.add(globe);
    const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0x5cff8a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); glowS.scale.set(2.5, 2.5, 1); glowS.position.copy(globe.position); g.add(glowS);
    scene.add(g);
    return g;
  }

  // ---- building a city -------------------------------------------------------------------------------------------------------
  function setCity(state) {
    stateRef = state;
    const city = state.city;
    cityRef = city;
    night = look.night === -1 ? !!city.night : look.night === 1;
    for (const v of buildingViews.values()) { cityGroup.remove(v.g); v.facade.material.dispose(); v.cellsTex.dispose(); }
    buildingViews.clear(); facadeUniformsAll.length = 0;
    for (const [, v] of itemViews) { cityGroup.remove(v.mesh); if (v.glow) cityGroup.remove(v.glow); }
    itemViews.clear();
    for (const d of debrisPool) d.alive = false;
    for (const d of dustPool) { d.alive = false; d.sp.visible = false; }
    for (const s of shardPool) s.alive = false;
    for (const s of sparkPool) s.alive = false;
    if (blimpView) { scene.remove(blimpView); blimpView = null; }
    if (subwayView) { scene.remove(subwayView); subwayView = null; }
    for (const [, v] of monsterViews) { v.smoothX = 0; }
    let r = (state.day * 131 + 7) >>> 0;
    const seedRnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
    const City = globalThis.CarnageCity;
    for (const b of city.buildings) buildBuilding(b, City.FAMILIES[b.family], seedRnd);
    buildStreet(city.width);
    buildFar(city.width, state.day);
    if (city.exits && city.exits.subway != null) subwayView = makeSubway(city.exits.subway);
    applyDayNight();
    for (const m of lampMats) m.emissiveIntensity = night ? 2.5 : 0.1;
    ground.traverse((o) => { if (o.userData.lamp) o.material.opacity = night ? 0.4 : 0; });
    camX = state.monsters[0].x * CELL; camY = baseCamY();
  }

  // ---- events from the core → effects ------------------------------------------------------------------------------------------
  function event(e, state) {
    const bv = e.b != null ? buildingViews.get(e.b) : null;
    const b = e.b != null && cityRef ? cityRef.buildings[e.b] : null;
    switch (e.type) {
      case 'cellBreak': {
        if (bv && b) {
          refreshCells(bv, b);
          const inn = FAMILY_INNARDS[bv.fam.id];
          const x = e.x * CELL, y = (e.y + 0.5) * CELL;
          if (e.cellType === 1) { spawnDebris(x, y, 0.6, Math.round(10 * look.debris), 2.5, inn, false); spawnDust(x, y - 1, 1, 6, 2.2, 1.6, 0, 0.6, 0.55); }
          else { spawnShards(x, y, 0.4, Math.round(14 * look.debris)); spawnDebris(x, y, 0.6, Math.round(4 * look.debris), 2, [0.5, 0.5, 0.52], false); spawnDust(x, y - 1.2, 1, 4, 1.6, 1.2, 0, 0.4, 0.4); }
          if (e.cellType === 2) spawnSparks(x, y, 0.5, 20, 6);
        }
        break;
      }
      case 'cellCrack': if (bv && b) { refreshCells(bv, b); spawnDust(e.x * CELL, (e.y + 0.5) * CELL, 1, 3, 1.2, 0.8, 0, 0.3, 0.35); } break;
      case 'neon': if (bv) bv.uniforms.uNeonLit.value = e.on ? 1 : 0; break;
      case 'neonOut': if (bv && b) { refreshCells(bv, b); bv.uniforms.uNeonLit.value = 0; spawnSparks(e.x * CELL, (e.y + 0.5) * CELL, 0.5, 40, 7); spawnShards(e.x * CELL, (e.y + 0.5) * CELL, 0.4, 20); } break;
      case 'neonShock': spawnSparks(e.x * CELL, (e.y + 0.5) * CELL, 0.8, 30, 8); flash(e.x * CELL, (e.y + 0.6) * CELL, 1.2, 6, 0x9ad8ff, 0.25); break;
      case 'collapseStart': if (bv) { bv.collapsing = true; thudT = 0.35; thudAmt = 0.5; } break;
      case 'collapseEnd': if (bv && b) { finishCollapse(bv, b); thudT = 0.45; thudAmt = 1; } break;
      case 'punchLand': if (e.hit) spawnDust(e.x * CELL, (e.y + 1.2) * CELL, MON_Z, 2, 1.2, 0.5, 0, 0.5, 0.35); break;
      case 'eat': { const x = e.x * CELL, y = (e.y + 0.5) * CELL; spawnDebris(x, y, 0.4, 6, 1.2, [0.9, 0.7, 0.3], false); break; }
      case 'boom': spawnDebris(e.x * CELL, (e.y + 0.5) * CELL, 0.6, Math.round(30 * look.debris), 3, [0.3, 0.25, 0.2], true); spawnDust(e.x * CELL, (e.y + 0.5) * CELL, 1, 14, 3, 2.2, 0, 1.5, 0.7); flash(e.x * CELL, (e.y + 0.5) * CELL, 1.5, 14, 0xffa040, 0.35); spawnSparks(e.x * CELL, (e.y + 0.5) * CELL, 1, 40, 9); thudT = 0.2; thudAmt = 0.4; break;
      case 'flash': flash(e.x * CELL, (e.y + 0.5) * CELL, 1.2, 22, 0xffffff, 0.4); screenFlash = 1; break;
      case 'ding': flash(e.x * CELL, (e.y + 0.6) * CELL, 1, 3, 0xffe080, 0.3); break;
      case 'hazard': if (e.what === 'peloton') { spawnSparks(e.x * CELL, (e.y + 0.5) * CELL, 1, 30, 8); flash(e.x * CELL, (e.y + 0.5) * CELL, 1.2, 6, 0x9ad8ff, 0.25); } else spawnDust(e.x * CELL, (e.y + 0.5) * CELL, 1, 3, 1, 0.6, 0, 0.5, 0.4); break;
      case 'landHard': spawnDust(e.x * CELL, 0.3, MON_Z, 10, 2.4, 1.4, 0, 0.6, 0.55); thudT = 0.25; thudAmt = 0.45; break;
      case 'land': spawnDust(e.x * CELL, 0.3, MON_Z, 3, 1.4, 0.8, 0, 0.4, 0.35); break;
      case 'landed': spawnDust(e.x * CELL, 0.3, MON_Z, 8, 2.4, 1.2, 0, 0.6, 0.5); thudT = 0.2; thudAmt = 0.4; break;
      case 'tankFire': { const x = e.x * CELL + e.dir * 3.5; flash(x, 2.6, TANK_Z, 5, 0xffc060, 0.16); spawnDust(x, 2.4, TANK_Z, 4, 1.6, 0.8, e.dir * 2, 0.8, 0.5); break; }
      case 'shellBoom': flash(e.x * CELL, e.y * CELL + 0.5, TANK_Z - 1, 7, 0xffa040, 0.25); spawnDust(e.x * CELL, e.y * CELL, TANK_Z - 1, 6, 2, 1.4, 0, 1.2, 0.55); spawnDebris(e.x * CELL, e.y * CELL + 0.5, TANK_Z - 1.5, 6, 1.5, [0.3, 0.3, 0.3], false); break;
      case 'tankDie': flash(e.x * CELL, 2.5, TANK_Z, 12, 0xffa040, 0.4); spawnDebris(e.x * CELL, 2.5, TANK_Z, 20, 4, [0.15, 0.15, 0.18], true); spawnSparks(e.x * CELL, 2.5, TANK_Z, 40, 9); break;
      case 'tankHit': spawnSparks(e.x * CELL, 2.5, TANK_Z, 14, 6); break;
      case 'droneDie': flash(e.x * CELL, e.y * CELL, DRONE_Z, 9, 0xffb060, 0.3); spawnDebris(e.x * CELL, e.y * CELL, DRONE_Z, 12, 2, [0.35, 0.4, 0.25], false); spawnSparks(e.x * CELL, e.y * CELL, DRONE_Z, 30, 8); break;
      case 'droneCrash': flash(e.x * CELL, 1, DRONE_Z, 10, 0xffa040, 0.35); spawnDust(e.x * CELL, 0.5, DRONE_Z, 10, 2.4, 1.6, 0, 1, 0.55); break;
      case 'soldierDie': if (e.how === 'crushed') spawnDust(e.x * CELL, 0.5, SOLDIER_Z, 3, 1, 0.8, 0, 0.5, 0.4); else spawnDust(e.x * CELL, 0.8, SOLDIER_Z, 2, 0.9, 0.5, 0, 0.5, 0.35); break;
      case 'carWreck': flash(e.x * CELL, 1.2, e.kind === 'bot' ? BOT_Z : CAR_Z, 5, 0xffc080, 0.2); spawnShards(e.x * CELL, 1.2, e.kind === 'bot' ? BOT_Z : CAR_Z, 16); spawnSparks(e.x * CELL, 1.2, e.kind === 'bot' ? BOT_Z : CAR_Z, 16, 6); break;
      case 'bulletHit': spawnSparks(e.x * CELL, e.y * CELL, MON_Z + 0.5, 3, 3); break;
      case 'monsterHit': spawnDust(e.x * CELL, e.y * CELL, MON_Z, 3, 1.2, 0.5, 0, 0.5, 0.4); flash(e.x * CELL, e.y * CELL, MON_Z + 0.5, 3, 0xffffff, 0.12); break;
      case 'revert': flash(e.x * CELL, (e.y + 1) * CELL, MON_Z, 10, 0xffffff, 0.6, false); spawnDust(e.x * CELL, (e.y + 0.5) * CELL, MON_Z, 12, 2.2, 1.6, 0, 1, 0.5); break;
      case 'eaten': spawnDust(e.x * CELL, 1, MON_Z, 4, 1.2, 0.6, 0, 0.6, 0.4); break;
      case 'arrive': break;
      case 'exit': flash(e.x * CELL, e.y * CELL, 1, 20, 0xffffff, 1.2); screenFlash = 1.4; break;
      case 'day': break;
      default: break;
    }
  }
  function finishCollapse(bv, b) {
    bv.collapsed = true; bv.collapsing = false;
    bv.body.visible = false; bv.facade.visible = false; bv.parapet.visible = false;
    for (const c of bv.g.children) if (c !== bv.rubble && c !== bv.body && c !== bv.facade && c !== bv.parapet) c.visible = false;
    bv.rubble.visible = true;
    const cx = (b.x0 + b.cols / 2) * CELL;
    spawnDust(cx, 1, 2, 40, 5, 4.5, 0, 1.2, 0.75);
    spawnDust(b.x0 * CELL - 2, 1, 3, 12, 4, 4, -5, 0.8, 0.6);
    spawnDust((b.x0 + b.cols) * CELL + 2, 1, 3, 12, 4, 4, 5, 0.8, 0.6);
    spawnDebris(cx, 2, 1, Math.round(50 * look.debris), b.cols * CELL, FAMILY_INNARDS[bv.fam.id], true);
  }

  // ---- the camera ---------------------------------------------------------------------------------------------------------------
  let camX = 0, camY = 0, camDist = 100, viewW = 26 * CELL, viewH = 60;
  function baseCamY() { return viewH * 0.40; }
  function fitCamera() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth), h = Math.max(1, canvas.clientHeight || window.innerHeight);
    const aspect = w / h;
    camera.aspect = aspect;
    viewW = look.viewCells * CELL;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * aspect);
    camDist = (viewW / 2) / Math.tan(hfov / 2);
    viewH = viewW / aspect;
    camera.updateProjectionMatrix();
  }
  function stepCamera(state, dt) {
    const p = state.monsters[0];
    const ahead = p.facing * look.lookAhead * CELL * (p.st === 'street' ? 1 : 0.3);
    let tx = p.x * CELL + ahead;
    const minX = viewW * 0.5 - 2 * CELL, maxX = state.city.width * CELL - viewW * 0.5 + 2 * CELL;
    if (maxX > minX) tx = Math.max(minX, Math.min(maxX, tx)); else tx = state.city.width * CELL / 2;
    tx += (look.shiftCells || 0) * CELL;
    const py = p.y * CELL;
    let ty = baseCamY();
    if (py > ty + viewH * 0.2) ty = py - viewH * 0.2;
    const k = 1 - Math.exp(-dt * look.camEase);
    camX += (tx - camX) * k; camY += (ty - camY) * k;
    let thud = 0;
    if (thudT > 0) thud = Math.sin(thudT * 22) * thudAmt * 0.35 * thudT;
    camera.position.set(camX, camY + thud, camDist);
    camera.rotation.set(-THREE.MathUtils.degToRad(look.pitch), 0, 0);
  }

  // ---- post ---------------------------------------------------------------------------------------------------------------------
  const post = { rt: null, rtB1: null, rtB2: null, quadScene: new THREE.Scene(), quadCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), w: 1, h: 1 };
  const brightMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, uniforms: { tex: { value: null }, thr: { value: 0.85 } }, depthTest: false, depthWrite: false });
  const blurMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BLUR_FS, uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  const compMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: COMP_FS, uniforms: { tex: { value: null }, bloom: { value: null }, glow: { value: look.glow }, vig: { value: 0.35 }, exposure: { value: look.exposure } }, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), brightMat);
  post.quadScene.add(quad);
  function resize() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth), h = Math.max(1, canvas.clientHeight || window.innerHeight);
    let pr = Math.min(window.devicePixelRatio || 1, 2) * look.res;
    if (w * h * pr * pr > PIXEL_BUDGET) pr = Math.sqrt(PIXEL_BUDGET / (w * h));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    const pw = Math.max(1, Math.floor(w * pr)), ph = Math.max(1, Math.floor(h * pr));
    if (post.rt) { post.rt.dispose(); post.rtB1.dispose(); post.rtB2.dispose(); }
    post.rt = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
    post.rtB1 = new THREE.WebGLRenderTarget(Math.max(1, pw >> 1), Math.max(1, ph >> 1), { type: THREE.HalfFloatType });
    post.rtB2 = new THREE.WebGLRenderTarget(Math.max(1, pw >> 1), Math.max(1, ph >> 1), { type: THREE.HalfFloatType });
    post.w = pw; post.h = ph;
    fitCamera();
  }
  function render() {
    renderer.setRenderTarget(post.rt);
    renderer.render(scene, camera);
    // bloom: bright → blur x → blur y → composite
    quad.material = brightMat; brightMat.uniforms.tex.value = post.rt.texture;
    renderer.setRenderTarget(post.rtB1); renderer.render(post.quadScene, post.quadCam);
    quad.material = blurMat;
    blurMat.uniforms.tex.value = post.rtB1.texture; blurMat.uniforms.dir.value.set(1.6 / post.rtB1.width, 0); renderer.setRenderTarget(post.rtB2); renderer.render(post.quadScene, post.quadCam);
    blurMat.uniforms.tex.value = post.rtB2.texture; blurMat.uniforms.dir.value.set(0, 1.6 / post.rtB1.height); renderer.setRenderTarget(post.rtB1); renderer.render(post.quadScene, post.quadCam);
    quad.material = compMat; compMat.uniforms.tex.value = post.rt.texture; compMat.uniforms.bloom.value = post.rtB1.texture; compMat.uniforms.glow.value = look.glow;
    renderer.setRenderTarget(null); renderer.render(post.quadScene, post.quadCam);
  }

  // ---- per frame ---------------------------------------------------------------------------------------------------------------
  function update(state, dt) {
    if (!cityRef || cityRef !== state.city) setCity(state);
    clock.t += dt;
    skyUniforms.uTime.value = clock.t; farUniforms.uTime.value = clock.t;
    for (const u of facadeUniformsAll) { u.uTime.value = clock.t; u.uCamPos.value.copy(camera.position); }
    // the buildings coming down: squash toward the ground, shed debris
    for (const b of state.city.buildings) {
      const v = buildingViews.get(b.id);
      if (!v || v.collapsed) continue;
      if (b.collapsing) {
        const k = b.dropT;
        const ease = k * k;
        const sy = 1 - 0.9 * ease;
        v.g.scale.y = sy;
        v.g.position.x = b.x0 * CELL + Math.sin(clock.t * 40) * 0.25 * (1 - k);
        v.uniforms.uCollapse.value = Math.min(1, k * 1.5);
        if (k - v.dropShown > 0.08) {
          v.dropShown = k;
          const cx = (b.x0 + b.cols / 2) * CELL;
          spawnDebris(cx, b.floors * CELL * sy * 0.5, 1, Math.round(6 * look.debris), b.cols * CELL, FAMILY_INNARDS[v.fam.id], true);
          spawnDust(cx, 1, 2, 6, 3.5, 2.5, 0, 0.8, 0.55);
          spawnShards(cx, b.floors * CELL * sy * 0.4, 0.5, 8);
        }
        if (b.down) finishCollapse(v, b);
      }
    }
    syncItems(state);
    syncMonsters(state, dt);
    syncSoldiers(state, dt);
    syncVehicles(state, dt);
    stepEffects(dt);
    stepCamera(state, dt);
    for (const c of farGroup.children) if (c.userData.cloud) { c.position.x += c.userData.drift * dt; if (c.position.x > state.city.width * CELL + 200) c.position.x = -160; }
    cityGroup.traverse((o) => { if (o.userData.beacon) o.material.color.setHex(Math.floor(clock.t) % 2 ? 0xff2020 : 0x300808); if (o.userData.marquee) o.material.emissiveIntensity = night ? 0.9 : 0.15; });
    compMat.uniforms.vig.value = 0.35 + Math.max(0, screenFlash) * 0.0;
    compMat.uniforms.exposure.value = exposure * (1 + Math.max(0, screenFlash) * 2.5);
  }
  const _p = new THREE.Vector3();
  function project(x, y, out) {
    _p.set(x * CELL, y * CELL, MON_Z).project(camera);
    out = out || {};
    out.x = (_p.x * 0.5 + 0.5) * (canvas.clientWidth || window.innerWidth);
    out.y = (-_p.y * 0.5 + 0.5) * (canvas.clientHeight || window.innerHeight);
    out.visible = _p.z < 1 && Math.abs(_p.x) < 1.2;
    return out;
  }
  // a portrait of a monster's head for the HUD: rendered once into a small canvas
  function portrait(slug, size) {
    const s = size || 128;
    const asset = models.monsters[slug];
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const rt = new THREE.WebGLRenderTarget(s, s);   // no multisampling: the pixels are read straight back
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(1, 2, 3); sc.add(dl);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    if (asset) {
      const model = skeletonClone(asset.scene);
      const k = fitModel(model, 2.0, 0);
      void k;
      sc.add(model);
      cam.position.set(0.15, 1.72, 1.9); cam.lookAt(0, 1.7, 0);
    } else {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: FALLBACK_COLOR[slug] })); sc.add(head);
      cam.position.set(0, 0, 2); cam.lookAt(0, 0, 0);
    }
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    const px = new Uint8Array(s * s * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, s, s, px);
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
    const img = c.getContext('2d').createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const si = ((s - 1 - y) * s + x) * 4, di = (y * s + x) * 4; img.data[di] = px[si]; img.data[di + 1] = px[si + 1]; img.data[di + 2] = px[si + 2]; img.data[di + 3] = px[si + 3]; }
    c.getContext('2d').putImageData(img, 0, 0);
    rt.dispose();
    return c;
  }
  function setLook(l) {
    Object.assign(look, l);
    exposure = look.exposure;
    for (const u of facadeUniformsAll) { u.uWear.value = look.wear; u.uRoomLight.value = look.roomLight; }
    skyUniforms.uStars.value = look.stars;
    if (stateRef) { const wantNight = look.night === -1 ? !!stateRef.city.night : look.night === 1; if (wantNight !== night) { night = wantNight; applyDayNight(); for (const m of lampMats) m.emissiveIntensity = night ? 2.5 : 0.1; ground.traverse((o) => { if (o.userData.lamp) o.material.opacity = night ? 0.4 : 0; }); } else applyDayNight(); }
    fitCamera();
  }
  function thud(amt) { thudT = 0.3; thudAmt = amt || 0.5; }

  resize();
  return {
    scene, camera, renderer, look, models, clock,
    load, setLook, resize, setCity, update, event, render, project, portrait, thud,
    fx: { spawnDebris, spawnDust, spawnShards, spawnSparks, flash },
    debug: { post, brightMat, blurMat, compMat, quad },
    get night() { return night; },
    get buildingViews() { return buildingViews; },
  };
}
