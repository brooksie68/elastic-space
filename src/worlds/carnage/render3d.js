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
const ALLEY_Z = -DEPTH - 14;           // the back street's front faces (an alley 14 m wide behind the front row)
const STREET2_Z = -DEPTH - 14 - 34 - 26; // the second row's front faces: past the first row's depth and a 26 m street
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
  mound: 1,           // how high the rubble mound piles after a collapse
  moundStay: 1,       // how long the mound holds before it slumps
  fogDepth: 1,        // the far rows fading
  stars: 1,
  res: 1,             // resolution cap
  night: -1,          // -1 = the city decides, 0 day, 1 night
  shiftCells: 0,      // slide the framing sideways (the lab's panel covers the right edge)
};

const FAMILY_TILE = { brick_red: 'brick_red', brick_tan: 'brick_tan', concrete: 'concrete', stucco: 'stucco', steel: 'steel', glass: 'glass' };
const FAMILY_TILE_CELLS = { brick_red: 1.7, brick_tan: 1.8, concrete: 2.2, stucco: 2.6, steel: 1.6, glass: 1.0 };
// the 16-bit palettes: a saturated wall colour and a trim colour per family (the tile only gives the value)
// real-city colours (James, 2026-09-21: the candy palette "looks like it was designed for little kids"): brick red-brown,
// limestone tan, weathered concrete, cream stucco, slate steel, gray-teal glass; trims in stone, cream and iron
const FAMILY_TINT = { brick_red: [0.36, 0.18, 0.15], brick_tan: [0.23, 0.16, 0.13], concrete: [0.46, 0.46, 0.44], stucco: [0.44, 0.42, 0.40], steel: [0.26, 0.28, 0.33], glass: [0.16, 0.19, 0.23] };
const FAMILY_TRIM = { brick_red: [0.70, 0.66, 0.58], brick_tan: [0.62, 0.58, 0.52], concrete: [0.62, 0.61, 0.58], stucco: [0.72, 0.70, 0.66], steel: [0.18, 0.19, 0.22], glass: [0.14, 0.15, 0.18] };
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
  uniform sampler2D uShops;
  uniform sampler2D uShopTex;
  uniform sampler2D uShopTex2;
  uniform float uCols, uFloors, uCell, uTileCells, uSeed, uTime, uNight, uWear, uRoomLight, uCollapse, uDay;
  uniform vec3 uInnards, uCamPos, uOrigin, uSky, uGround, uSunDir;
  uniform vec3 uBrandA, uBrandB, uTint, uTrim;
  uniform float uBrand, uNeonC0, uNeonW, uNeonIdx, uNeonLit, uNeonHue, uShop, uPeople, uDoor, uShopKind, uSplit, uDoor2, uShopKind2;
  uniform vec3 uBrandA2, uBrandB2;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { return 0.5 * noise(p) + 0.25 * noise(p * 2.1 + 3.7) + 0.125 * noise(p * 4.3 + 9.1); }
  vec3 hsv(float h, float s, float v) { vec3 k = vec3(h, h + 1.0 / 3.0, h + 2.0 / 3.0); vec3 p = abs(fract(k) * 6.0 - 3.0); return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s); }
  float box(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float rbox(vec2 p, vec2 b, float r) { return box(p, b - r) - r; }
  float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  // THE FIST: a palm with four knuckles, the shape every hole takes (mirrored for a left hand by the seed)
  float fist(vec2 f, float seed) {
    vec2 p = f - vec2(0.5, 0.47);
    p.x *= mix(1.0, -1.0, step(0.5, fract(seed * 3.0)));
    float d = rbox(p - vec2(0.0, -0.02), vec2(0.2, 0.15), 0.06);
    for (int i = 0; i < 4; i++) { float x = -0.165 + 0.11 * float(i); d = min(d, length(p - vec2(x, 0.155)) - 0.072); }
    d = min(d, rbox(p - vec2(-0.2, -0.1), vec2(0.075, 0.09), 0.05));   // the thumb
    return d;
  }
  // a person behind the glass: a silhouette doing something, keyed by the seed
  vec3 person(vec3 c, vec2 q, float seed, float lit, vec3 light) {
    int kind = int(mod(floor(seed * 37.0), 6.0));
    if (kind == 5) return c;   // an empty lit room now and then
    float sway = sin(uTime * (0.7 + seed) + seed * 20.0) * 0.012;
    vec3 dark = c * 0.22;
    if (kind == 0) {
      // typing: head, shoulders, a laptop glow at the desk
      vec2 h = q - vec2(0.5 + sway, 0.56);
      float head = smoothstep(0.085, 0.075, length(h * vec2(1.0, 1.1)));
      float body = 1.0 - smoothstep(0.0, 0.01, rbox(q - vec2(0.5 + sway, 0.36), vec2(0.17, 0.11), 0.08));
      float desk = step(abs(q.x - 0.5), 0.34) * step(abs(q.y - 0.26), 0.02);
      float lap = step(abs(q.x - 0.5), 0.1) * step(0.27, q.y) * step(q.y, 0.36);
      c = mix(c, dark, max(head, body)); c = mix(c, dark * 0.8, desk);
      c = mix(c, vec3(0.6, 0.8, 1.0) * (1.4 + 0.3 * sin(uTime * 7.0 + seed * 9.0)), lap * lit);
    } else if (kind == 1) {
      // on the couch, watching the screen: a head from behind, low
      vec2 h = q - vec2(0.42 + sway, 0.38);
      float head = smoothstep(0.08, 0.07, length(h * vec2(1.0, 1.1)));
      float body = 1.0 - smoothstep(0.0, 0.01, rbox(q - vec2(0.42 + sway, 0.2), vec2(0.15, 0.12), 0.08));
      c = mix(c, dark, max(head, body));
    } else if (kind == 2) {
      // cooking: a figure at the side, a pot, steam
      vec2 h = q - vec2(0.72 + sway, 0.6);
      float head = smoothstep(0.08, 0.07, length(h * vec2(1.0, 1.1)));
      float body = 1.0 - smoothstep(0.0, 0.01, rbox(q - vec2(0.72 + sway, 0.38), vec2(0.13, 0.15), 0.08));
      float pot = 1.0 - smoothstep(0.0, 0.01, rbox(q - vec2(0.42, 0.3), vec2(0.1, 0.06), 0.02));
      float steam = smoothstep(0.06, 0.0, abs(q.x - 0.42 - 0.03 * sin(q.y * 20.0 + uTime * 2.0))) * step(0.37, q.y) * step(q.y, 0.6) * 0.35;
      c = mix(c, dark, max(head, body)); c = mix(c, vec3(0.12, 0.12, 0.14), pot); c += steam * light * 0.4;
    } else if (kind == 3) {
      // a couple
      for (int i = 0; i < 2; i++) {
        float x = 0.36 + 0.26 * float(i) + sway * (float(i) * 2.0 - 1.0);
        vec2 h = q - vec2(x, 0.56 - 0.03 * float(i));
        float head = smoothstep(0.08, 0.07, length(h * vec2(1.0, 1.1)));
        float body = 1.0 - smoothstep(0.0, 0.01, rbox(q - vec2(x, 0.34), vec2(0.14, 0.13), 0.08));
        c = mix(c, dark, max(head, body));
      }
    } else {
      // a cat on the sill
      vec2 h = q - vec2(0.7, 0.1);
      float body = 1.0 - smoothstep(0.0, 0.01, rbox(h - vec2(0.0, 0.0), vec2(0.13, 0.05), 0.04));
      float head = smoothstep(0.05, 0.04, length((h - vec2(0.13, 0.06)) * vec2(1.0, 1.1)));
      float ears = step(abs(h.x - 0.11), 0.012) * step(0.08, h.y) * step(h.y, 0.13) + step(abs(h.x - 0.15), 0.012) * step(0.08, h.y) * step(h.y, 0.13);
      float tail = smoothstep(0.012, 0.0, abs(h.y - 0.02 - 0.05 * sin(h.x * 12.0 + uTime * 3.0))) * step(-0.28, h.x) * step(h.x, -0.13);
      c = mix(c, vec3(0.06, 0.05, 0.05), max(max(body, head), max(ears, tail)));
      c += vec3(0.5, 0.9, 0.3) * (smoothstep(0.012, 0.0, length(h - vec2(0.115, 0.065))) + smoothstep(0.012, 0.0, length(h - vec2(0.145, 0.065)))) * lit;
    }
    return c;
  }

  // the room behind the glass: a box of depth D behind the opening, walls shaded by a seeded style
  vec3 room(vec2 f, vec2 o0, vec2 o1, vec3 d, float seed, float lit, float wrecked, float people) {
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
    // painted rooms: wallpaper, a picture, a lamp, a bed, a bar — five looks and two plain ones
    vec3 wall = vec3(0.86, 0.80, 0.70);
    vec3 light = vec3(1.0, 0.86, 0.66);
    if (style == 1) { wall = vec3(0.72, 0.80, 0.90); light = vec3(0.85, 0.95, 1.0); }
    if (style == 2) { wall = vec3(0.45, 0.5, 0.62); light = vec3(0.6, 0.75, 1.0); }
    if (style == 3) { wall = vec3(0.88, 0.66, 0.70); light = vec3(1.0, 0.7, 0.85); }
    if (style == 4) { wall = vec3(0.70, 0.84, 0.72); light = vec3(0.8, 1.0, 0.8); }
    if (style == 5) { wall = vec3(0.40, 0.30, 0.28); light = vec3(1.0, 0.7, 0.4); }
    if (style == 6) { wall = vec3(0.92, 0.88, 0.70); light = vec3(1.0, 0.9, 0.7); }
    vec3 c;
    vec2 q = (h.xy - o0) / (o1 - o0);
    if (t == tz) {
      c = wall;
      // wallpaper: stripes or a diamond pattern on some
      if (style == 3) c *= 0.92 + 0.08 * step(0.5, fract(q.x * 7.0));
      if (style == 6) c *= 0.94 + 0.06 * step(0.5, fract(q.x * 5.0 + q.y * 5.0));
      if (style == 0) c *= 0.93 + 0.07 * step(0.5, fract(q.y * 6.0));
      float feat = step(abs(q.x - 0.5), 0.2) * step(abs(q.y - 0.6), 0.14);
      if (style == 2) { float fl = 0.6 + 0.4 * sin(uTime * 9.0 + seed * 40.0) * sin(uTime * 3.1); c = mix(c, vec3(0.5, 0.7, 1.0) * (1.0 + fl), feat); c = mix(c, vec3(0.08), step(abs(q.x - 0.5), 0.22) * step(abs(q.y - 0.6), 0.16) * (1.0 - feat)); }
      else if (style == 1) { c = mix(c, vec3(0.16, 0.14, 0.1), step(abs(q.x - 0.5), 0.2) * step(abs(q.y - 0.6), 0.14)); c = mix(c, hsv(seed * 5.0, 0.6, 0.8), step(abs(q.x - 0.5), 0.17) * step(abs(q.y - 0.6), 0.11)); }
      else if (style == 5) { float shelf = step(0.35, q.y) * step(q.y, 0.75) * step(0.5, fract(q.y * 6.0)); c = mix(c, vec3(0.2, 0.12, 0.08), shelf); float bottles = shelf * step(0.6, fract(q.x * 14.0)); c = mix(c, hsv(fract(q.x * 3.0 + seed), 0.7, 0.9), bottles); }
      else if (style == 4) { c = mix(c, vec3(0.55, 0.35, 0.2), step(abs(q.x - 0.5), 0.36) * step(q.y, 0.42)); c = mix(c, vec3(0.95, 0.95, 1.0), step(abs(q.x - 0.5), 0.34) * step(0.25, q.y) * step(q.y, 0.4)); c = mix(c, hsv(seed * 7.0, 0.5, 0.9), step(abs(q.x - 0.5), 0.34) * step(0.1, q.y) * step(q.y, 0.25)); }
      else { c = mix(c, vec3(0.3, 0.2, 0.12), step(abs(q.x - 0.5), 0.17) * step(abs(q.y - 0.62), 0.12)); c = mix(c, hsv(seed * 3.0, 0.6, 0.7), step(abs(q.x - 0.5), 0.15) * step(abs(q.y - 0.62), 0.1)); }
      // a lamp on the side table
      if (style == 0 || style == 3 || style == 6) { float shade = 1.0 - smoothstep(0.0, 0.01, rbox(q - vec2(0.15, 0.32), vec2(0.06, 0.05), 0.02)); c = mix(c, light * 1.6 * lit + vec3(0.2), shade); c = mix(c, vec3(0.2, 0.15, 0.1), step(abs(q.x - 0.15), 0.008) * step(0.14, q.y) * step(q.y, 0.27)); }
      c *= 0.85 + 0.15 * step(0.08, q.y);
      if (people > 0.5) c = person(c, q, seed, lit, light);
    } else if (t == ty) {
      c = d.y > 0.0 ? wall * 0.95 : wall * 0.55;   // ceiling / floor
      if (d.y > 0.0) { float lamp = smoothstep(0.12, 0.0, length((h.xy - (o0 + o1) * 0.5) * vec2(1.0, 0.0) + vec2(0.0, h.z + D * 0.5))); c += light * lamp * 2.0 * lit; }
      else { c = (style == 5 ? vec3(0.3, 0.18, 0.1) : wall * 0.5) * (0.9 + 0.1 * step(0.5, fract(h.x * 6.0 + h.z * 6.0))); }
    } else {
      c = wall * 0.72;   // side walls
    }
    float outside = uDay * 0.32 + 0.03;
    vec3 shade = c * (outside * (1.0 - depth * 0.5) + light * lit * uRoomLight * (0.55 + 0.45 * (1.0 - depth)));
    shade = mix(shade, shade * vec3(0.22, 0.19, 0.17), wrecked);
    return shade;
  }

  // THE SHOP INTERIORS (round two, storefront pass): eight businesses and the burger counter (kind 8), drawn on the
  // back wall of the display window in q-space (0..1 across the glass, 0..1 up it) and on the floor
  vec3 shopInterior(vec2 f, vec2 g0, vec2 g1, vec3 d, float kind, float seed, float lit, float wrecked, vec3 brandA, vec3 brandB) {
    float D = 0.9;
    vec3 p = vec3(f, 0.0);
    float tz = -D / min(d.z, -0.02);
    float tx = ((d.x > 0.0 ? g1.x : g0.x) - f.x) / (abs(d.x) < 1e-4 ? 1e-4 * sign(d.x + 1e-5) : d.x);
    float ty = ((d.y > 0.0 ? g1.y : g0.y) - f.y) / (abs(d.y) < 1e-4 ? 1e-4 * sign(d.y + 1e-5) : d.y);
    tx = tx < 0.0 ? 1e9 : tx; ty = ty < 0.0 ? 1e9 : ty;
    float t = min(tz, min(tx, ty));
    vec3 h = p + d * t;
    float depth = clamp(-h.z / D, 0.0, 1.0);
    int k = int(kind + 0.5);
    vec2 q = (h.xy - g0) / (g1 - g0);
    vec3 wall = vec3(0.86, 0.84, 0.78), light = vec3(1.0, 0.92, 0.78), floorC = vec3(0.35, 0.32, 0.3);
    if (k == 0) { wall = vec3(0.92, 0.88, 0.76); light = vec3(1.0, 0.9, 0.7); floorC = vec3(0.2, 0.2, 0.22); }
    if (k == 1) { wall = vec3(0.80, 0.78, 0.66); floorC = vec3(0.4, 0.36, 0.3); }
    if (k == 2) { wall = vec3(0.78, 0.86, 0.88); light = vec3(0.9, 0.98, 1.0); floorC = vec3(0.55, 0.56, 0.58); }
    if (k == 3) { wall = vec3(0.55, 0.42, 0.3); light = vec3(1.0, 0.85, 0.6); floorC = vec3(0.3, 0.24, 0.18); }
    if (k == 4) { wall = vec3(0.90, 0.86, 0.74); light = vec3(1.0, 0.8, 0.55); floorC = vec3(0.4, 0.26, 0.18); }
    if (k == 5) { wall = vec3(0.16, 0.15, 0.17); light = vec3(1.0, 0.6, 0.7); floorC = vec3(0.12, 0.12, 0.13); }
    if (k == 6) { wall = vec3(0.96, 0.96, 0.97); light = vec3(0.92, 0.96, 1.0); floorC = vec3(0.75, 0.75, 0.78); }
    if (k == 7) { wall = vec3(0.94, 0.80, 0.86); light = vec3(1.0, 0.85, 0.95); floorC = vec3(0.6, 0.5, 0.55); }
    if (k == 8) { wall = vec3(0.90, 0.88, 0.84); floorC = vec3(0.45, 0.42, 0.4); }
    vec3 c;
    if (t == tz) {
      c = wall;
      if (k == 0) {
        // the diner: a menu board up top, a pie case and a counter with stools
        float board = step(0.7, q.y) * step(q.y, 0.93) * step(0.08, q.x) * step(q.x, 0.92);
        c = mix(c, vec3(0.08), board);
        c = mix(c, vec3(0.9, 0.85, 0.6), board * step(0.55, fract(q.y * 18.0)) * step(0.5, fract(q.x * 9.0 + seed)));
        float counter = step(0.22, q.y) * step(q.y, 0.42);
        c = mix(c, vec3(0.7, 0.12, 0.14), counter);
        c = mix(c, vec3(0.85, 0.85, 0.88), step(0.40, q.y) * step(q.y, 0.44));
        float pie = step(0.62, q.x) * step(q.x, 0.9) * step(0.44, q.y) * step(q.y, 0.66);
        c = mix(c, light * 1.3, pie);
        c = mix(c, vec3(0.5, 0.3, 0.15), pie * step(0.45, fract(q.x * 8.0)) * step(0.5, fract(q.y * 12.0)));
        for (int i = 0; i < 4; i++) { float sx = 0.14 + float(i) * 0.14; c = mix(c, vec3(0.75, 0.75, 0.8), smoothstep(0.035, 0.025, length((q - vec2(sx, 0.16)) * vec2(1.0, 1.6)))); c = mix(c, vec3(0.3), step(abs(q.x - sx), 0.008) * step(0.04, q.y) * step(q.y, 0.15)); }
      } else if (k == 1) {
        // the bodega: shelves of goods, crates of fruit, a lotto sign
        float shelf = step(0.28, q.y) * step(q.y, 0.9) * step(0.5, fract(q.y * 6.0));
        c = mix(c, vec3(0.3, 0.22, 0.14), shelf * 0.9);
        float goods = shelf * step(0.5, fract(q.x * 12.0 + seed));
        c = mix(c, hsv(fract(q.x * 3.0 + seed * 3.0 + floor(q.y * 6.0) * 0.3), 0.45, 0.75), goods);
        float crate = step(q.y, 0.26) * step(0.06, q.x) * step(q.x, 0.62);
        c = mix(c, vec3(0.55, 0.4, 0.22), crate);
        c = mix(c, mix(vec3(0.9, 0.5, 0.1), vec3(0.3, 0.6, 0.2), step(0.5, fract(q.x * 5.0))), crate * step(0.14, q.y) * smoothstep(0.5, 0.2, length(fract(q * vec2(14.0, 8.0)) - 0.5)));
        float lotto = step(0.7, q.x) * step(q.x, 0.95) * step(0.05, q.y) * step(q.y, 0.24);
        c = mix(c, vec3(1.0, 0.85, 0.2), lotto); c = mix(c, vec3(0.8, 0.1, 0.1), lotto * step(0.4, fract(q.y * 6.0)) * step(0.5, fract(q.x * 20.0)));
      } else if (k == 2) {
        // the laundromat: two rows of washers with round doors
        vec2 cellq = vec2(fract(q.x * 5.0), fract((q.y - 0.05) * 2.2));
        float inRow = step(0.05, q.y) * step(q.y, 0.95);
        float box2 = step(0.06, cellq.x) * step(cellq.x, 0.94) * step(0.05, cellq.y) * step(cellq.y, 0.95) * inRow;
        c = mix(c, vec3(0.86, 0.87, 0.88), box2);
        float door = smoothstep(0.3, 0.27, length((cellq - vec2(0.5, 0.42)) * vec2(1.0, 1.3))) * inRow;
        c = mix(c, vec3(0.2, 0.25, 0.3), door);
        c = mix(c, vec3(0.5, 0.7, 0.9), smoothstep(0.2, 0.17, length((cellq - vec2(0.5, 0.42)) * vec2(1.0, 1.3))) * inRow * (0.5 + 0.5 * sin(uTime * 3.0 + q.x * 20.0)));
        c = mix(c, vec3(0.2, 0.8, 0.3), step(abs(cellq.x - 0.5), 0.15) * step(0.8, cellq.y) * step(cellq.y, 0.88) * inRow);
      } else if (k == 3) {
        // the pawn shop: things on the wall, a glass counter
        for (int i = 0; i < 5; i++) { float sx = 0.12 + float(i) * 0.19; float body = smoothstep(0.075, 0.065, length((q - vec2(sx, 0.62)) * vec2(1.0, 1.4))); float neck = step(abs(q.x - sx), 0.014) * step(0.68, q.y) * step(q.y, 0.9); c = mix(c, hsv(0.05 + float(i) * 0.13, 0.6, 0.55), max(body, neck)); }
        float counter = step(0.12, q.y) * step(q.y, 0.42) * step(0.05, q.x) * step(q.x, 0.95);
        c = mix(c, vec3(0.75, 0.82, 0.9), counter * 0.7);
        c = mix(c, vec3(1.0, 0.95, 0.6), counter * step(0.96, hash(floor(q * 40.0) + seed)) * 1.5);
        c = mix(c, vec3(0.2, 0.15, 0.1), step(0.42, q.y) * step(q.y, 0.45));
      } else if (k == 4) {
        // the pizza place: an oven with a glow, a counter, a menu board, a red and white check band
        float oven = step(0.62, q.x) * step(q.x, 0.95) * step(0.25, q.y) * step(q.y, 0.75);
        c = mix(c, vec3(0.5, 0.36, 0.28) * (0.8 + 0.2 * step(0.5, fract(q.y * 14.0 + step(0.5, fract(q.x * 8.0)) * 0.5))), oven);
        float mouth = smoothstep(0.14, 0.12, length((q - vec2(0.785, 0.42)) * vec2(1.0, 2.0))) * step(0.42, q.y + 0.2);
        c = mix(c, vec3(1.0, 0.55, 0.15) * (1.3 + 0.4 * sin(uTime * 9.0 + seed * 3.0)), mouth * oven);
        float board = step(0.72, q.y) * step(q.y, 0.94) * step(0.05, q.x) * step(q.x, 0.58);
        c = mix(c, vec3(0.1), board); c = mix(c, vec3(0.95, 0.9, 0.7), board * step(0.55, fract(q.y * 16.0)) * step(0.5, fract(q.x * 10.0 + seed)));
        float counter = step(0.2, q.y) * step(q.y, 0.4) * step(q.x, 0.58);
        c = mix(c, mix(vec3(0.85, 0.15, 0.15), vec3(0.95), step(0.5, fract(q.x * 8.0)) * step(0.5, fract(q.y * 8.0)) + step(0.5, fract(q.x * 8.0 + 0.5)) * step(0.5, fract(q.y * 8.0 + 0.5))), counter);
        c = mix(c, vec3(0.9, 0.75, 0.3), counter * smoothstep(0.07, 0.05, length(q - vec2(0.25, 0.44))));
      } else if (k == 5) {
        // the tattoo parlour: a wall of flash sheets, a chair
        vec2 sq = vec2(fract(q.x * 6.0), fract((q.y - 0.3) * 3.0));
        float sheet = step(0.1, sq.x) * step(sq.x, 0.9) * step(0.1, sq.y) * step(sq.y, 0.9) * step(0.3, q.y) * step(q.y, 0.96);
        c = mix(c, vec3(0.94, 0.9, 0.8), sheet);
        float ink = sheet * smoothstep(0.32, 0.28, length(sq - 0.5)) * step(0.5, hash(floor(vec2(q.x * 6.0, (q.y - 0.3) * 3.0)) + seed));
        c = mix(c, hsv(hash(floor(vec2(q.x * 6.0, q.y * 3.0)) * 3.0 + seed), 0.7, 0.6), ink);
        float chair = step(0.15, q.x) * step(q.x, 0.55) * step(0.08, q.y) * step(q.y, 0.24) + step(0.15, q.x) * step(q.x, 0.25) * step(0.08, q.y) * step(q.y, 0.4);
        c = mix(c, vec3(0.08, 0.08, 0.09), clamp(chair, 0.0, 1.0));
      } else if (k == 6) {
        // the phone shop: a bright wall of phones on a shelf, a counter
        vec2 pq = vec2(fract(q.x * 7.0), fract((q.y - 0.4) * 3.5));
        float phone = step(0.3, pq.x) * step(pq.x, 0.7) * step(0.15, pq.y) * step(pq.y, 0.85) * step(0.4, q.y) * step(q.y, 0.97);
        c = mix(c, vec3(0.05), phone);
        c = mix(c, hsv(hash(floor(vec2(q.x * 7.0, q.y * 3.5)) + seed), 0.5, 1.0), phone * step(0.36, pq.x) * step(pq.x, 0.64) * step(0.22, pq.y) * step(pq.y, 0.8));
        c = mix(c, vec3(0.9), step(0.36, q.y) * step(q.y, 0.4));
        c = mix(c, vec3(0.2, 0.2, 0.22), step(0.1, q.y) * step(q.y, 0.3));
      } else if (k == 7) {
        // the nail salon: pink, a row of little tables with lamps, bottles on a shelf
        float shelf = step(0.72, q.y) * step(q.y, 0.9);
        c = mix(c, vec3(0.98), shelf);
        c = mix(c, hsv(hash(vec2(floor(q.x * 24.0), seed * 7.0)), 0.65, 0.9), shelf * step(0.3, fract(q.x * 24.0)) * step(fract(q.x * 24.0), 0.7) * step(0.74, q.y) * step(q.y, 0.86));
        for (int i = 0; i < 3; i++) { float sx = 0.2 + float(i) * 0.3; c = mix(c, vec3(0.95), step(abs(q.x - sx), 0.1) * step(0.24, q.y) * step(q.y, 0.29)); c = mix(c, vec3(0.6), step(abs(q.x - sx), 0.01) * step(0.05, q.y) * step(q.y, 0.24)); c = mix(c, light * 1.6, smoothstep(0.05, 0.03, length((q - vec2(sx + 0.06, 0.4)) * vec2(1.0, 1.6)))); }
      } else {
        // the burger place: a counter, a three-panel lit menu board, the fryer glow, the brand colour on the wall
        c = mix(c, brandA, step(0.62, q.y) * step(q.y, 0.66) + step(0.92, q.y) * 0.9);
        float board = step(0.68, q.y) * step(q.y, 0.9) * step(0.06, q.x) * step(q.x, 0.94) * step(0.08, fract(q.x * 3.4 + 0.03));
        c = mix(c, vec3(1.0, 0.97, 0.9) * 1.2, board);
        c = mix(c, brandA * 0.8, board * step(0.6, fract(q.y * 14.0)) * step(0.5, fract(q.x * 12.0 + seed)));
        float counter = step(0.2, q.y) * step(q.y, 0.42);
        c = mix(c, vec3(0.45, 0.45, 0.48), counter);
        c = mix(c, brandB, counter * step(0.38, q.y));
        c = mix(c, vec3(1.0, 0.7, 0.3) * (1.2 + 0.3 * sin(uTime * 7.0 + seed)), step(0.78, q.x) * step(q.x, 0.95) * step(0.42, q.y) * step(q.y, 0.6));
      }
    } else if (t == ty) {
      c = d.y > 0.0 ? wall * 0.9 : floorC * (0.85 + 0.15 * step(0.5, fract(h.x * 8.0 + h.z * 8.0)));
      if (d.y > 0.0) { float lamp = smoothstep(0.2, 0.0, abs(h.z + D * 0.5)) * (0.5 + 0.5 * step(0.5, fract(h.x * 3.0))); c += light * lamp * 1.6 * lit; }
    } else {
      c = wall * 0.7;
    }
    float outside = uDay * 0.35 + 0.03;
    vec3 shade = c * (outside * (1.0 - depth * 0.45) + light * lit * uRoomLight * (0.7 + 0.3 * (1.0 - depth)));
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

    // the wall everywhere, in world space so bricks run across cells: the tile's value under the family's colour
    vec2 wuv = (vWorld.xy - uOrigin.xy) / uCell;   // one tile per cell, anchored at the building's corner: the grid lands on every edge
    vec3 wall = texture(uWall, wuv).rgb;
    float grime = smoothstep(2.5, 0.0, vWorld.y / uCell) * 0.35 + fbm(vWorld.xy * 0.35 + uSeed) * 0.25;
    float streak = smoothstep(0.35, 0.0, abs(fract(cell.x) - 0.5)) * smoothstep(0.85, 0.2, f.y) * noise(vec2(ci.x * 3.1 + uSeed * 9.0, vWorld.y * 0.7)) * 0.5;
    wall *= 1.0 - uWear * (grime + streak) * 0.7;
    wall *= 1.0 - 0.25 * step(0.5, uCollapse) * fbm(vWorld.xy * 2.0);
    vec3 col = wall;
    float emit = 0.0;
    vec3 d = normalize(vWorld - uCamPos);

    // cracks that run toward a broken neighbour
    float nbCrack = 0.0;
    if (state != 2 && type != 2) {
      for (int i = 0; i < 4; i++) {
        vec2 off = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0) : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
        vec2 nc = ci + off;
        if (nc.x < 0.0 || nc.y < 0.0 || nc.x >= uCols || nc.y >= uFloors) continue;
        float ns = texelFetch(uCells, ivec2(int(nc.x), int(nc.y)), 0).g * 255.0;
        if (ns < 1.5) continue;
        vec2 a = vec2(0.5) + off * 0.5, b = vec2(0.5) + off * 0.12 + vec2(hash(ci + off * 3.0 + uSeed) - 0.5, hash(ci * 2.0 + off + uSeed) - 0.5) * 0.3;
        float wob = (noise(f * 14.0 + ci * 5.0 + uSeed * 4.0) - 0.5) * 0.04;
        nbCrack = max(nbCrack, 1.0 - smoothstep(0.0, 0.014, seg(f, a, b) + wob));
      }
    }
    col *= 1.0 - nbCrack * 0.7;

    if (type == 1) {
      // a wall cell: the fist print, then the hole with the room behind it
      float fd = fist(f, seed);
      if (state == 1 || uCollapse > 0.0) {
        float cr = abs(fbm(cell * 5.0 + uSeed * 7.0) - 0.5);
        float crack = 1.0 - smoothstep(0.0, 0.03 + 0.03 * uCollapse, cr);
        float near = state == 1 ? smoothstep(0.42, 0.05, fd) : 1.0;
        col *= 1.0 - crack * 0.75 * max(float(state == 1) * near, uCollapse);
      }
      if (state == 1) {
        // the dent: the fist sunk into the wall, a light lip on the upper left, a dark shadow inside
        float dent = 1.0 - smoothstep(-0.005, 0.01, fd);
        float lip = smoothstep(0.03, 0.0, fd) * (1.0 - dent);
        float inner = smoothstep(0.0, -0.08, fd);
        col = mix(col, col * 0.55, dent);
        col = mix(col, col * (0.35 + 0.25 * noise(f * 20.0)), inner * 0.8);
        col = mix(col, col * 1.35, lip * 0.6);
        col = mix(col, col * 0.8, smoothstep(0.02, -0.02, fd) * step(f.y, 0.47) * 0.5);   // deeper below the knuckles
      }
      if (state == 2) {
        float rag = 0.06 * fbm(f * 9.0 + seed * 30.0);
        float hd = fd - 0.07 - rag;
        float hole = 1.0 - smoothstep(-0.005, 0.005, hd);
        vec3 inside = room(f, vec2(0.08, 0.06), vec2(0.92, 0.94), d, seed + 0.31, 0.18, 0.7, 0.0) * 0.55;
        float rimN = fbm(f * 12.0 + seed * 40.0);
        float rim = smoothstep(0.0, 0.05 + 0.04 * rimN, hd) * (1.0 - smoothstep(0.05, 0.12, hd));
        col = mix(col, inside, hole);
        col = mix(col, mix(uInnards * 0.6, uTint * 0.5, 0.5) * (0.6 + 0.6 * rimN), rim * 0.85);
        float lip = smoothstep(-0.012, 0.0, hd) * (1.0 - smoothstep(0.0, 0.012, hd));
        col = mix(col, vec3(0.04, 0.03, 0.03), lip * 0.8);
        // rebar and a chunk still hanging
        float bar = step(abs(f.x - 0.5 - 0.08), 0.012) * step(0.45, f.y) * hole + step(abs(f.x - 0.5 + 0.11), 0.012) * step(0.4, f.y) * hole;
        col = mix(col, vec3(0.28, 0.16, 0.1), bar);
        float dust = smoothstep(0.0, 0.25, -hd + 0.12) * (1.0 - hole) * step(f.y, 0.4) * 0.35 * (0.6 + 0.4 * fbm(f * 6.0 + seed * 3.0));
        col *= 1.0 - dust;
      }
    } else if (type == 0) {
      // a window (or a storefront): the opening, the frame, the sill, the glass and the room
      // a residential window is 1.36 m wide and 1.7 m tall with its sill at 0.9 m, centred in the 4 m cell (the shopfront still fills its cell)
      vec2 o0 = type == 3 ? vec2(0.06, 0.0) : vec2(0.33, 0.225);
      vec2 o1 = type == 3 ? vec2(0.94, 0.72) : vec2(0.67, 0.65);
      float openBox = box(f - (o0 + o1) * 0.5, (o1 - o0) * 0.5);
      float broken = float(state == 2);
      float rag = broken * (0.04 + 0.05 * fbm(f * 7.0 + seed * 30.0));
      float inOpen = 1.0 - smoothstep(-0.005, 0.005, openBox - rag);
      float frame = (1.0 - smoothstep(0.0, 0.045, -openBox)) * (1.0 - broken * 0.85);
      vec3 frameCol = type == 3 ? vec3(0.12, 0.12, 0.13) : uTrim;
      float lit = (uNight > 0.5 ? litF : litF * step(0.7, seed)) * (1.0 - broken * 0.6);
      if (type == 3) lit = 1.0 - broken * 0.5;
      float people = uPeople * step(0.5, lit) * (1.0 - broken) * (1.0 - curtain) * float(type == 0);
      vec3 interior = room(f, o0, o1, d, seed + float(type) * 0.13, lit, broken, people);
      if (type == 3) {
        if (uBrand > 0.5) {
          interior *= mix(vec3(1.0), uBrandA * 1.4, 0.35);
          float board = step(abs(f.x - 0.5), 0.3) * step(0.5, f.y) * step(f.y, 0.62);
          interior += board * uBrandB * 0.9 * (1.0 - broken);
        } else {
          // a plain shop: shelves of goods behind the glass
          float shelf = step(0.15, f.y) * step(f.y, 0.62) * step(0.5, fract(f.y * 7.0));
          interior = mix(interior, vec3(0.32, 0.24, 0.16), shelf * 0.8);
          float goods = shelf * step(0.55, fract(f.x * 11.0 + seed));
          interior = mix(interior, hsv(fract(f.x * 2.0 + seed * 3.0), 0.35, 0.7), goods * 0.9);
        }
      }
      vec3 n = vec3(0.0, 0.0, 1.0);
      vec3 rdir = reflect(d, n);
      vec3 refl = mix(uGround, uSky, smoothstep(-0.2, 0.6, rdir.y)) * (0.9 + 0.3 * noise(vWorld.xy * 0.2));
      float fres = mix(0.10, 0.30, uDay) + 0.5 * pow(1.0 - max(0.0, -d.z), 3.0);
      float diag = smoothstep(0.02, 0.0, abs(fract((f.x + f.y * 0.6 + uSeed) * 1.3) - 0.5) - 0.42) * 0.25;
      vec3 glass = mix(interior, refl, clamp(fres + diag, 0.0, 0.8) * (1.0 - broken));
      if (curtain > 0.5 && broken < 0.5) {
        float cw = (o1.x - o0.x) * 0.42;
        float side = step(0.5, fract(seed * 13.0));
        float inCurt = side > 0.5 ? step(f.x, o0.x + cw) : step(o1.x - cw, f.x);
        // curtains are muted: linens, creams, grays, a dusty blue or rose now and then
        float ch = fract(seed * 5.0);
        vec3 ccol = mix(vec3(0.78, 0.74, 0.66), hsv(ch, 0.22, 0.72), step(0.6, fract(seed * 9.0))) * (0.8 + 0.2 * sin(f.x * 60.0 + seed));
        glass = mix(glass, ccol * (0.35 + 0.65 * lit + uDay * 0.3), inCurt * 0.9);
      }
      if (blind > 0.5 && broken < 0.5) {
        float bh = o1.y - (o1.y - o0.y) * (0.22 + 0.33 * fract(seed * 17.0));
        float inBlind = step(bh, f.y);
        float slat = 0.72 + 0.28 * step(0.5, fract(f.y * 28.0));
        glass = mix(glass, vec3(0.92, 0.88, 0.78) * slat * (0.45 + 0.45 * lit + uDay * 0.25), inBlind * 0.92);
      }
      // the shop's door in the middle column: a dark glass door with a bar handle and a step
      if (type == 3 && uDoor >= 0.0 && abs(ci.x - uDoor) < 0.5) {
        float doorBox = box(f - vec2(0.5, 0.36), vec2(0.2, 0.36));
        float inDoor = 1.0 - smoothstep(-0.005, 0.005, doorBox);
        vec3 doorCol = mix(vec3(0.10, 0.11, 0.13), refl * 0.5, 0.35 * (1.0 - broken));
        float handle = step(abs(f.x - 0.63), 0.012) * step(0.3, f.y) * step(f.y, 0.46);
        float doorFrame = (1.0 - smoothstep(0.0, 0.03, -doorBox)) * inDoor;
        glass = mix(glass, doorCol, inDoor * (1.0 - broken * 0.7));
        glass = mix(glass, vec3(0.75, 0.72, 0.65), handle * inDoor);
        glass = mix(glass, vec3(0.16, 0.16, 0.18), doorFrame * 0.8);
        float stepStone = step(f.y, 0.03) * step(abs(f.x - 0.5), 0.26);
        col = mix(col, vec3(0.55, 0.53, 0.5), stepStone);
      }
      col = mix(col, glass, inOpen);
      col = mix(col, frameCol, frame * inOpen);
      // a mullion: the cross bar in the glass
      if (type == 0 && broken < 0.5) { float mull = step(abs(f.x - 0.5), 0.012) + step(abs(f.y - (o0.y + o1.y) * 0.55), 0.01); col = mix(col, frameCol * 0.9, clamp(mull, 0.0, 1.0) * inOpen * (1.0 - frame)); }
      // the sill below and the lintel above, in the trim colour
      if (type == 0) {
        float sill = step(o0.x - 0.05, f.x) * step(f.x, o1.x + 0.05) * step(o0.y - 0.07, f.y) * step(f.y, o0.y);
        float sillShade = step(o0.x - 0.05, f.x) * step(f.x, o1.x + 0.05) * step(o0.y - 0.1, f.y) * step(f.y, o0.y - 0.07);
        float lintel = step(o0.x - 0.03, f.x) * step(f.x, o1.x + 0.03) * step(o1.y, f.y) * step(f.y, o1.y + 0.045);
        col = mix(col, uTrim * 0.95, sill * (1.0 - broken * 0.5));
        col = mix(col, col * 0.6, sillShade);
        col = mix(col, uTrim * 0.8, lintel);
      }
      if (ac > 0.5 && broken < 0.5 && type == 0) {
        float acb = 1.0 - smoothstep(0.0, 0.01, box(f - vec2(0.59, 0.27), vec2(0.08, 0.05)));
        float grille = 0.8 + 0.2 * step(0.5, fract(f.y * 30.0));
        col = mix(col, vec3(0.72, 0.72, 0.7) * grille, acb);
      }
      if (broken > 0.5) {
        float rimN = fbm(f * 9.0 + seed * 40.0);
        float edge = smoothstep(-0.01, 0.01, openBox - rag) * (1.0 - smoothstep(0.03, 0.09 + 0.05 * rimN, openBox - rag));
        col = mix(col, uInnards * (0.35 + 0.5 * rimN), edge);
        float lip = smoothstep(-0.012, 0.0, openBox - rag) * (1.0 - smoothstep(0.0, 0.012, openBox - rag));
        col = mix(col, vec3(0.05, 0.04, 0.04), lip * 0.9);
        float soot = smoothstep(0.0, 0.32, -(openBox - rag) + 0.16) * 0.55 * (0.6 + 0.4 * fbm(f * 6.0 + seed * 3.0));
        col *= 1.0 - soot * (1.0 - inOpen);
        // glass teeth on the sill and round the edge
        float teeth = step(f.y, o0.y + 0.05 * abs(sin(f.x * 37.0 + seed * 9.0)) * (0.4 + 0.6 * noise(vec2(f.x * 5.0, seed)))) * step(o0.y - 0.005, f.y) * inOpen;
        float teethTop = step(o1.y - 0.04 * abs(sin(f.x * 29.0 + seed * 4.0)), f.y) * step(f.y, o1.y + 0.005) * inOpen;
        col = mix(col, vec3(0.75, 0.88, 1.0), max(teeth, teethTop) * 0.8);
        float sw = sin(uTime * 1.7 + seed * 6.0) * 0.06;
        float hang = step(abs(f.x - (o0.x + 0.22 + (o1.y - f.y) * sw)), 0.12) * step(f.y, o1.y) * step(o1.y - 0.3 - 0.1 * fract(seed * 7.0), f.y) * inOpen * step(0.5, blind + curtain);
        col = mix(col, vec3(0.5, 0.48, 0.44) * (0.6 + 0.4 * step(0.5, fract(f.y * 22.0))), hang * 0.9);
      }
      emit = lit * inOpen * (1.0 - frame) * uRoomLight * (uNight > 0.5 ? 0.55 : 0.12) * (type == 3 ? 1.6 : 1.0);
      if (type == 3) {
        float aw = step(0.74, f.y) * step(f.y, 0.98);
        float stripe = step(0.5, fract(f.x * 6.0 + ci.x));
        vec3 awCol = mix(uBrandA, uBrandB, stripe * 0.85);
        float scallop = step(0.74, f.y) * step(f.y, 0.78) * step(0.5, fract(f.x * 6.0 + 0.5)) * uBrand;
        if (uBrand < 0.5) awCol = uBrandA * (0.55 + 0.2 * stripe);
        col = mix(col, awCol * (0.8 + 0.2 * f.y), aw);
        col = mix(col, uBrandB, scallop);
        float shadow = smoothstep(0.74, 0.62, f.y) * step(0.5, f.y) * 0.3;
        col *= 1.0 - shadow;
      }
    } else if (type == 3) {
      // THE STOREFRONT (round two, storefront pass): a dark bulkhead, plate glass with the shop inside, a transom, a
      // recessed door with an OPEN sign, the name lettered on the glass, and the fascia sign INSIDE the ground floor
      float bulk = 0.15, glassTop = 0.66, transTop = 0.74, fasciaTop = 0.97;
      float broken = float(state == 2);
      // which business this column belongs to: the second shop takes the columns from uSplit on
      float second = (uSplit > 0.0 && ci.x >= uSplit - 0.5) ? 1.0 : 0.0;
      float shopKind = mix(uShopKind, uShopKind2, second);
      vec3 brandA = mix(uBrandA, uBrandA2, second), brandB = mix(uBrandB, uBrandB2, second);
      float cs0 = second > 0.5 ? uSplit : 0.0, cs1 = (second > 0.5 || uSplit <= 0.0) ? uCols : uSplit;
      float doorCol = second > 0.5 ? uDoor2 : uDoor;
      float isDoor = (doorCol >= 0.0 && abs(ci.x - doorCol) < 0.5) ? 1.0 : 0.0;
      vec3 fr = vec3(0.10, 0.10, 0.11);
      vec3 tile = vec3(0.16, 0.15, 0.15) * (0.75 + 0.25 * step(0.5, fract(f.x * 8.0)) * step(0.5, fract(f.y * 30.0)));
      col = mix(col, tile, step(f.y, bulk));
      col = mix(col, fr, step(bulk - 0.02, f.y) * step(f.y, bulk));
      vec2 g0 = vec2(0.04, bulk), g1 = vec2(0.96, glassTop);
      float gb = box(f - (g0 + g1) * 0.5, (g1 - g0) * 0.5);
      float rag = broken * (0.04 + 0.05 * fbm(f * 7.0 + seed * 30.0));
      float inGlass = 1.0 - smoothstep(-0.004, 0.004, gb - rag);
      float lit = 1.0 - broken * 0.5;
      vec3 interior = shopInterior(f, g0, g1, d, shopKind, seed, lit, broken, brandA, brandB);
      vec3 n = vec3(0.0, 0.0, 1.0); vec3 rdir = reflect(d, n);
      vec3 refl = mix(uGround, uSky, smoothstep(-0.2, 0.6, rdir.y)) * (0.9 + 0.3 * noise(vWorld.xy * 0.2));
      float fres = mix(0.05, 0.12, uDay) + 0.25 * pow(1.0 - max(0.0, -d.z), 3.0);
      vec3 glass = mix(interior, refl, clamp(fres, 0.0, 0.5) * (1.0 - broken));
      // the name lettered on the glass, small and white, on every other window
      if (isDoor < 0.5 && mod(ci.x, 2.0) < 0.5 && broken < 0.5) {
        vec2 lu = vec2((f.x - 0.14) / 0.72, (f.y - 0.43) / 0.11);
        if (lu.x > 0.0 && lu.x < 1.0 && lu.y > 0.0 && lu.y < 1.0) { vec4 sg = second > 0.5 ? textureLod(uShopTex2, lu, 0.0) : textureLod(uShopTex, lu, 0.0); float isText = step(0.3, distance(sg.rgb, brandA)); glass = mix(glass, vec3(0.97), isText * 0.85); }
      }
      if (isDoor > 0.5) {
        float doorBox = box(f - vec2(0.5, 0.36), vec2(0.22, 0.36));
        float inDoor = 1.0 - smoothstep(-0.005, 0.005, doorBox);
        vec3 doorCol = mix(vec3(0.08, 0.09, 0.11), refl * 0.4, 0.3 * (1.0 - broken));
        glass = mix(glass, doorCol, inDoor * (1.0 - broken * 0.7));
        glass = mix(glass, vec3(0.75, 0.72, 0.65), step(abs(f.x - 0.64), 0.012) * step(0.3, f.y) * step(f.y, 0.46) * inDoor);
        glass = mix(glass, vec3(0.16, 0.16, 0.18), (1.0 - smoothstep(0.0, 0.03, -doorBox)) * inDoor * 0.9);
        float openSign = step(abs(f.x - 0.5), 0.1) * step(0.5, f.y) * step(f.y, 0.56) * inDoor;
        glass = mix(glass, vec3(1.0, 0.15, 0.1) * 1.4, openSign * (1.0 - broken));
        col = mix(col, vec3(0.55, 0.53, 0.5), step(f.y, bulk) * step(abs(f.x - 0.5), 0.28));
        emit += openSign * 0.8 * (1.0 - broken);
      }
      col = mix(col, glass, inGlass);
      float mull = step(abs(f.x - 0.5), 0.008) * (1.0 - isDoor);
      col = mix(col, fr, mull * inGlass);
      col = mix(col, fr, (1.0 - smoothstep(0.0, 0.03, -gb)) * inGlass * (1.0 - broken * 0.8));
      // the transom: small panes over the glass
      float trans = step(glassTop + 0.01, f.y) * step(f.y, transTop);
      col = mix(col, mix(vec3(0.85, 0.9, 0.95), interior * 0.6, 0.5) * (0.8 + 0.6 * lit * uNight), trans);
      col = mix(col, fr, trans * clamp(step(fract(f.x * 3.0), 0.05) + step(f.y, glassTop + 0.02) + step(transTop - 0.01, f.y), 0.0, 1.0));
      // THE FASCIA: the sign band inside the ground floor (never the second floor), the name centred over up to three cells
      float fas = step(transTop, f.y) * step(f.y, fasciaTop);
      float span = min(cs1 - cs0, 3.0), c0 = cs0 + (cs1 - cs0 - span) * 0.5;
      float su = (cell.x - c0) / span;
      vec3 fasCol = brandA * 0.7 * (0.9 + 0.1 * noise(f * 25.0));
      if (su >= 0.0 && su <= 1.0) { vec2 fu = vec2(su, (f.y - transTop) / (fasciaTop - transTop)); vec4 sg = second > 0.5 ? textureLod(uShopTex2, fu, 0.0) : textureLod(uShopTex, fu, 0.0); fasCol = sg.rgb; }
      // a party wall line between the two businesses
      if (uSplit > 0.0 && abs(cell.x - uSplit) < 0.02) col = mix(col, vec3(0.1), 0.9);
      col = mix(col, fasCol, fas);
      col = mix(col, col * 0.55, step(fasciaTop, f.y) * step(f.y, fasciaTop + 0.02));
      col = mix(col, fr, step(transTop, f.y) * step(f.y, transTop + 0.012));
      emit += fas * uNight * 0.45 + lit * inGlass * uRoomLight * (uNight > 0.5 ? 0.6 : 0.1);
      if (broken > 0.5) {
        float lip = smoothstep(-0.012, 0.0, gb - rag) * (1.0 - smoothstep(0.0, 0.012, gb - rag));
        col = mix(col, vec3(0.05, 0.04, 0.04), lip * 0.9 * inGlass);
        float teeth = step(f.y, g0.y + 0.05 * abs(sin(f.x * 37.0 + seed * 9.0))) * step(g0.y - 0.005, f.y) * inGlass;
        col = mix(col, vec3(0.75, 0.88, 1.0), teeth * 0.8);
      }
    } else if (type == 2) {
      float su = (cell.x - uNeonC0) / max(1.0, uNeonW);
      float sv = f.y;
      vec2 auv = vec2((mod(uNeonIdx, 4.0) + clamp(su, 0.0, 1.0)) / 4.0, 1.0 - (floor(uNeonIdx / 4.0) + (1.0 - clamp(sv * 0.9 + 0.05, 0.0, 1.0))) / 2.0);
      vec3 sign = texture(uSigns, auv).rgb;
      vec3 panel = vec3(0.07, 0.06, 0.08) * (0.8 + 0.2 * noise(f * 20.0));
      float glyph = max(sign.r, max(sign.g, sign.b));
      vec3 hue = hsv(uNeonHue, 0.85, 1.0);
      float on = uNeonLit * (1.0 - float(state == 2));
      float flick = 0.85 + 0.15 * step(0.1, fract(sin(uTime * 13.0 + uSeed) * 7.0));
      vec3 offTube = vec3(0.62, 0.63, 0.66) * (0.8 + 0.2 * sign.r);
      vec3 onTube = mix(hue, vec3(1.0), 0.35) * 1.25 * flick;
      vec3 tube = mix(offTube, onTube, on);
      panel = vec3(0.12, 0.11, 0.13) * (0.85 + 0.15 * noise(f * 20.0));
      col = mix(panel, tube, glyph);
      col += hue * on * 0.45 * max(textureLod(uSigns, auv, 3.0).r, max(textureLod(uSigns, auv, 3.0).g, textureLod(uSigns, auv, 3.0).b)) * (1.0 - glyph);
      emit = on * glyph * 0.75;
      if (state == 2) { col = panel * 0.6 + vec3(0.3, 0.32, 0.36) * step(0.9, fract(f.x * 9.0 + f.y * 7.0)) * 0.3; emit = 0.0; }
      float frame = 1.0 - smoothstep(0.0, 0.05, -box(f - 0.5, vec2(0.5, 0.5)) + 0.03);
      col = mix(col, vec3(0.2, 0.2, 0.22), frame * 0.9);
    }
    // the painted shop sign over the ground floor (buildings that are not one of the three)
    if (uShop >= 0.0 && ci.y < 0.5 && f.y > 0.79 && f.y < 0.97 && type != 2) {
      vec2 suv = vec2((mod(uShop, 4.0) + clamp(vUv.x, 0.0, 1.0)) / 4.0, 1.0 - (floor(uShop / 4.0) + (1.0 - (f.y - 0.79) / 0.18)) / 2.0);
      vec3 signCol = texture(uShops, suv).rgb;
      col = signCol * (0.85 + 0.15 * noise(f * 30.0));
      emit = uNight * 0.35;
      col *= 1.0 - step(0.955, f.y) * 0.4;   // the board's top shadow
    }
    // the cornice along the top and the base course at the bottom
    float topBand = step(1.0 - 0.12 / uFloors, vUv.y);
    float topLip = step(1.0 - 0.04 / uFloors, vUv.y);
    float topShadow = step(1.0 - 0.16 / uFloors, vUv.y) * (1.0 - topBand);
    if (type != 2 && ci.y >= uFloors - 1.0) {
      col = mix(col, uTrim * (0.7 + 0.15 * step(0.5, fract(vUv.x * uCols * 3.0))), topBand);
      col = mix(col, uTrim * 1.1, topLip);
      col = mix(col, col * 0.7, topShadow);
      emit *= 1.0 - topBand;
    }
    if (ci.y < 0.5 && f.y < 0.05 && type != 3) col = mix(col, uTint * 0.45, 0.9);
    // daylight on the face: the sun's side is brighter
    float sunFace = 0.7 + 0.3 * max(0.0, uSunDir.z);
    float occl = 1.0 - 0.22 * smoothstep(0.35, 0.0, vWorld.y / uCell) - 0.18 * smoothstep(1.0 - 0.35 / uFloors, 1.0, vUv.y);   // the street and the cornice shade the face
    vec3 lightCol = mix(vec3(0.30, 0.34, 0.5) * 0.45, vec3(1.12, 1.07, 0.98) * sunFace, uDay) * occl;
    vec3 shaded = col * lightCol + col * emit;
    outColor = vec4(shaded, 1.0);
  }
`;

// the far rows: instanced boxes with windows as a pattern, lit at random
const FAR_VS = /* glsl */`
  attribute vec3 aSize;
  attribute float aSeed;
  attribute vec3 aTint;
  varying vec3 vLocal; varying vec3 vSize; varying float vSeed; varying vec3 vN; varying vec3 vTint;
  void main() {
    vLocal = position * aSize; vSize = aSize; vSeed = aSeed; vN = normal; vTint = aTint;
    vec4 w = instanceMatrix * vec4(position * aSize, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * w;
  }
`;
const FAR_FS = /* glsl */`
  varying vec3 vLocal; varying vec3 vSize; varying float vSeed; varying vec3 vN; varying vec3 vTint;
  uniform float uNight, uDim, uTime; uniform vec3 uTint, uFogCol; uniform float uFogA, uFogB;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    // local y runs 0 .. height (the box stands on the ground); floors are 4 m, the ground floor is a blank band
    vec2 p = abs(vN.x) > 0.5 ? vLocal.zy : vLocal.xy;
    vec2 g = vec2(p.x / 4.0 + 0.5, p.y / 4.0);
    vec2 c = floor(g), f = fract(g);
    float isWin = step(0.33, f.x) * step(f.x, 0.67) * step(0.225, f.y) * step(f.y, 0.65);
    float frame = isWin * (1.0 - step(0.36, f.x) * step(f.x, 0.64) * step(0.255, f.y) * step(f.y, 0.62));
    float lit = step(mix(0.82, 0.5, uNight), hash(c + vSeed * 7.0 + floor(vN.x * 3.0)));
    float top = step(vSize.y - 0.6, vLocal.y);
    float cornice = step(vSize.y - 1.2, vLocal.y) * (1.0 - top);
    float base = step(vLocal.y, 4.0);
    vec3 wall = vTint * (0.9 + 0.2 * hash(vec2(vSeed, vN.y))) * mix(1.0, 0.18, uNight) * (abs(vN.x) > 0.5 ? 0.78 : 1.0) * (1.0 - top * 0.3) * (1.0 - cornice * 0.35) * (1.0 - base * 0.25);
    vec3 glass = mix(vec3(0.32, 0.36, 0.42) * mix(1.0, 0.25, uNight), vec3(1.0, 0.85, 0.6) * (0.35 + 0.65 * uNight) * 1.3, lit);
    vec3 win = mix(glass, vTint * 1.1 * mix(1.0, 0.2, uNight), frame);
    vec3 col = mix(wall, win, isWin * (1.0 - top) * (1.0 - base)) * uDim;
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
    // the 16-bit sky: the gradient in painted bands with a little dither, a big sun with a ring
    float k = smoothstep(-0.03, 0.45, h);
    float bands = 8.0;
    float dith = (hash(floor(dir.xz * 900.0)) - 0.5) * 0.9;
    k = floor(k * bands + 0.5 + dith) / bands;
    vec3 col = mix(uHorizon, uTop, k);
    float sd = dot(dir, uSunDir);
    float sun = smoothstep(0.9962, 0.9972, sd);
    float ring = smoothstep(0.9938, 0.9944, sd) * (1.0 - smoothstep(0.9952, 0.9958, sd));
    float halo = pow(max(0.0, sd), 24.0) * 0.45;
    col += uSunCol * (sun * 3.5 + ring * 0.9 + halo);
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
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // simple drop shadows (James, 2026-09-21)
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
  const models = { monsters: {}, teen: null, soldier: null, statics: {}, people: {} };
  const PEOPLE_CLIPS = { screamer: 'help', customer: 'phone', worker: 'talk', zombie: 'phone', streamer: 'cheer', waver: 'wave' };
  const THING_MODELS = { fryer: 0.3, peloton: 0.42, battery: 0.24, cash: 0.22, cake: 0.24, cactus: 0.4 };   // longest side, in cells
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
        o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) { if (m.map) m.map.colorSpace = THREE.SRGBColorSpace; if (m.map && m.emissive) { m.emissiveMap = m.map; m.emissive.setHex(0); m.emissiveIntensity = 1; } m.side = THREE.FrontSide; }
      }
    });
  }
  const MONSTER_CLIPS = ['walk', 'run', 'idle', 'punchL', 'punchR', 'climb', 'eat', 'hit', 'fall', 'jump', 'stomp', 'hookL', 'upperR', 'slam', 'ladder', 'bothFists'];
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
      // scale tracks are dropped: the idle clip scaled the hips by 1.176, so every action looked like a shrink (James, 2026-09-21)
      await Promise.all(clipNames.map((c) => loadGlb('assets/models/' + dir + '/' + c + '.glb').then((a) => { if (a && a.animations && a.animations.length) { const clip = a.animations[0]; clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.scale')); clips[c] = clip; } })));
      return { scene: g.scene, clips };
    };
    for (const slug of ['george', 'lizzie', 'ralph']) { total++; jobs.push(rigged(slug, MONSTER_CLIPS).then((a) => { models.monsters[slug] = a; tick(); })); }
    total++; jobs.push(rigged('teen', ['walk', 'tired']).then((a) => { models.teen = a; tick(); }));
    total++; jobs.push(rigged('soldier', ['walk', 'fire', 'flyup']).then((a) => { models.soldier = a; tick(); }));
    for (const name of ['swat', 'drone', 'cruiser', 'taxi', 'bot', 'hatch', 'suv', 'fryer', 'peloton', 'battery', 'cash', 'cake', 'cactus']) { total++; jobs.push(loadGlb('assets/models/' + name + '.glb').then((g) => { if (g) { prepModel(g.scene); models.statics[name] = g.scene; } tick(); })); }
    // THE WINDOW PEOPLE (round two): rigged Meshy models with one clip each; the sprites stay as the fallback
    for (const [name, clip] of Object.entries(PEOPLE_CLIPS)) { total++; jobs.push(rigged(name, [clip]).then((a) => { models.people[name] = a; tick(); })); }
    await Promise.all(jobs);
    return { failed: assetsFailed };
  }

  // ---- lights, sky, fog -------------------------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a4036, 0.75);
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
  sun.position.set(60, 120, 90);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05;
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 90, bottom: -30, near: 10, far: 420 }); sun.shadow.camera.updateProjectionMatrix();
  const amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(hemi, sun, sun.target, amb);
  const skyUniforms = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() }, uSunCol: { value: new THREE.Color(1, 0.9, 0.7) }, uNight: { value: 0 }, uStars: { value: 1 }, uTime: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -10;
  scene.add(sky);
  let night = false;
  const palette = { day: { top: 0x2a68c8, horizon: 0xdde6ec, ground: 0x6e6a60, fog: 0xc9ccd2, sunCol: 0xfff0c0 }, night: { top: 0x070a24, horizon: 0x3a2a4a, ground: 0x15121a, fog: 0x1c1830, sunCol: 0xd8e4ff } };
  function applyDayNight() {
    const p = night ? palette.night : palette.day;
    skyUniforms.uTop.value.setHex(p.top); skyUniforms.uHorizon.value.setHex(p.horizon); skyUniforms.uNight.value = night ? 1 : 0; skyUniforms.uSunCol.value.setHex(p.sunCol);
    skyUniforms.uSunDir.value.set(night ? -0.4 : 0.35, night ? 0.6 : 0.55, night ? -0.7 : -0.75).normalize();
    hemi.intensity = night ? 0.35 : 0.75; hemi.color.setHex(night ? 0x3a4a8a : 0xbfd4ff);
    sun.intensity = night ? 0.4 : 2.0; sun.color.setHex(night ? 0x9fb3ff : 0xfff2dc);
    amb.intensity = night ? 0.06 : 0.18;
    scene.fog = new THREE.Fog(p.fog, 110 * look.fogDepth, 380 * look.fogDepth);
    shardMat.color.setHex(night ? 0x5a6a7a : 0xcfe8ff); debrisMat.color.setHex(night ? 0x8a8a90 : 0xffffff);
    if (skylinePlanes.length) paintSkyline();
    farUniforms.uNight.value = night ? 1 : 0; farUniforms.uFogCol.value.setHex(p.fog); farUniforms.uFogA.value = 100 * look.fogDepth; farUniforms.uFogB.value = 360 * look.fogDepth;
    for (const u of facadeUniformsAll) { u.uNight.value = night ? 1 : 0; u.uDay.value = night ? 0 : 1; u.uSky.value.setHex(p.top); u.uGround.value.setHex(p.ground); u.uSunDir.value.copy(skyUniforms.uSunDir.value); }
    exposure = look.exposure * (night ? 0.95 : 1);
  }

  // ---- the ground and the street -----------------------------------------------------------------------------------
  const ground = new THREE.Group();
  scene.add(ground);
  let streetBuilt = false;
  function billboard(canvasEl, w, h, x, y, z) {
    const t = canvasTex(canvasEl); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.45, roughness: 1, side: THREE.DoubleSide }));
    m.position.set(x, y + h / 2, z); m.frustumCulled = false; return m;
  }
  function buildStreet(width, city) {
    for (const c of ground.children.slice()) { ground.remove(c); if (c.geometry) c.geometry.dispose(); }
    const W = width * CELL + 400;
    const x0 = -200;
    const mk = (w, d, z, t, rep) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tile(t, w / rep, d / rep), roughness: 0.95, metalness: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, 0, z); m.receiveShadow = true; return m; };
    ground.add(mk(W, SW, SW / 2, 'sidewalk', 3.2));             // the pavement in front of the faces, deep enough for a giant
    const road = mk(W, ROAD, SW + ROAD / 2, 'asphalt', 6); road.position.y = -0.04; ground.add(road);
    const near = mk(W, 8.5, SW + ROAD + 4.25, 'sidewalk', 3.2); ground.add(near);   // the near pavement: one sidewalk, the planters on it, a railing at its back
    // behind the faces: the lots under the front row (seen through the gaps), the alley, the back row's lots, the second
    // street with its kerbs, and gravel to the fog — in segments along x so the surface changes every few buildings
    const Wb = width * CELL + 1400, xb0 = -700;
    const backBase = new THREE.Mesh(new THREE.PlaneGeometry(Wb, 700), new THREE.MeshStandardMaterial({ color: 0x3c3a3e, roughness: 1 }));
    backBase.rotation.x = -Math.PI / 2; backBase.position.set(xb0 + Wb / 2, -0.12, -300); backBase.receiveShadow = true; ground.add(backBase);
    const LOT_TINTS = [0x8a8378, 0x6e6a62, 0x7a6a58, 0x5e5c5a, 0x8c8a86, 0x6a6058];
    let seg = 0;
    for (let x = xb0; x < xb0 + Wb; x += 34 + (seg * 13 % 20), seg++) {
      const sw = Math.min(34 + (seg * 13 % 20), xb0 + Wb - x);
      const mkLot = (z0, z1, tint, t) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, z0 - z1), new THREE.MeshStandardMaterial({ map: tile(t || 'rubble', sw / 9, (z0 - z1) / 9), color: tint, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x + sw / 2, -0.06, (z0 + z1) / 2); m.receiveShadow = true; ground.add(m); };
      mkLot(0, -DEPTH, LOT_TINTS[seg % LOT_TINTS.length], seg % 4 === 2 ? 'concrete' : 'rubble');            // under the front row
      mkLot(ALLEY_Z, ALLEY_Z - 34, LOT_TINTS[(seg * 5 + 2) % LOT_TINTS.length], seg % 3 === 1 ? 'asphalt' : 'rubble');   // under the back row
      mkLot(STREET2_Z, STREET2_Z - 40, LOT_TINTS[(seg * 7 + 4) % LOT_TINTS.length]);   // under the second row
    }
    const alley = mk(Wb, 14, -DEPTH - 7, 'asphalt', 6); alley.position.x = xb0 + Wb / 2; alley.position.y = -0.04; alley.material.color.setHex(0x8a8a8a); ground.add(alley);
    const street2 = mk(Wb, 26, STREET2_Z + 13, 'asphalt', 6); street2.position.x = xb0 + Wb / 2; street2.position.y = -0.04; ground.add(street2);
    for (const z of [STREET2_Z + 26, STREET2_Z]) { const k2 = new THREE.Mesh(new THREE.BoxGeometry(Wb, 0.18, 0.3), new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.9 })); k2.position.set(xb0 + Wb / 2, 0.09, z); ground.add(k2); }
    const walk2 = mk(Wb, 3.5, STREET2_Z + 26 + 1.75, 'sidewalk', 3.2); walk2.position.x = xb0 + Wb / 2; ground.add(walk2);
    // planters and a low fence along the near pavement, low enough to stay under the road in the frame
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.8 }), leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.9 });
    const southern = city && city.lat < 33.5;
    let ti = 0;
    for (let x = -10; x < width * CELL + 10; x += 6, ti++) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.2), planterMat); pl.position.set(x, 0.35, SW + ROAD + 5.2); ground.add(pl);
      const kind = ti % 3 === 1 ? 'flowers' : 'bush';
      if (city.test) continue;   // TEST MODE: the planters stay empty, no trees
      ground.add(billboard(Icons().tree(kind, ti * 7 + 3), 3.4, kind === 'bush' ? 2.4 : 1.6, x, 0.6, SW + ROAD + 5.3));
      if (ti % 5 === 2) ground.add(billboard(Icons().tree(southern ? 'palm' : (ti % 2 ? 'round' : 'tall'), ti * 13 + 1), 6.5, 7.5, x + 2.5, 0, SW + ROAD + 7.2));
    }
    void leafMat;
    // trees in the gaps between the buildings, on the front pavement
    if (city) {
      const bs = city.buildings;
      for (let i = 1; i < bs.length; i++) {
        const a = bs[i - 1], b = bs[i];
        const gap = b.x0 - (a.x0 + a.cols);
        if (gap < 1) continue;
        const gx = ((a.x0 + a.cols + b.x0) / 2) * CELL;
        if (city.exits && city.exits.subway != null && Math.abs(city.exits.subway * CELL - gx) < 3) continue;
        const kind = southern ? 'palm' : ((i * 31) % 3 === 0 ? 'tall' : 'round');
        const h = 4.5 + ((i * 17) % 3);
        ground.add(billboard(Icons().tree(kind, i * 19 + city.day), h * 0.8, h, gx, 0, 3.0));
      }
    }
    const fence = new THREE.Mesh(new THREE.BoxGeometry(W, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.5, metalness: 0.6 }));
    fence.position.set(x0 + W / 2, 0.45, SW + ROAD + 8.3); ground.add(fence);
    // parked cars along the near kerb: the real taxi and cruiser when they are loaded, dark blocks with wheels otherwise
    const carGeo = new THREE.BoxGeometry(4.4, 1.2, 1.9), roofGeo = new THREE.BoxGeometry(2.4, 0.65, 1.7), wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.9 });
    for (let x = 3, i = 0; x < width * CELL && !city.test; x += 7 + (i * 37 % 9), i++) {   // TEST MODE: no parked cars (a cruiser is a cop)
      if (i % 3 === 1 || i % 7 === 4) continue;
      const z = SW + ROAD - 1.6;
      // only the real models park here (the block cars are gone — James, 2026-09-21): taxis mostly, a cruiser now and then
      const pick = i % 5 === 3 ? 'cruiser' : i % 5 === 1 ? 'hatch' : i % 5 === 4 ? 'suv' : 'taxi';
      const model = models.statics[pick] || models.statics.taxi;
      if (!model) continue;
      if (model) {
        const m = model.clone(true);
        const box = new THREE.Box3().setFromObject(m); const dims = new THREE.Vector3(); box.getSize(dims);
        const k = 4.8 / Math.max(0.01, Math.max(dims.x, dims.z));
        m.scale.setScalar(k); m.position.set(x - (box.min.x + box.max.x) / 2 * k, -box.min.y * k, z - (box.min.z + box.max.z) / 2 * k);
        if (dims.z > dims.x) m.rotation.y = Math.PI / 2;
        if (pick === 'hatch' || pick === 'suv') tintCar(m, CAR_TINTS[(i * 5 + 2) % CAR_TINTS.length]);
        m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
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
    kerb.position.set(x0 + W / 2, 0.09, SW); ground.add(kerb);
    const kerb2 = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.3), kerbMat);
    kerb2.position.set(x0 + W / 2, 0.09, SW + ROAD); ground.add(kerb2);
    const dashGeo = new THREE.PlaneGeometry(2.2, 0.16);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c86a });
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, Math.ceil(W / 5));
    const mm = new THREE.Matrix4();
    for (let i = 0; i < dashes.count; i++) { mm.makeRotationX(-Math.PI / 2); mm.setPosition(x0 + i * 5 + 1, 0.01, SW + ROAD / 2); dashes.setMatrixAt(i, mm); }
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
  // THE SKYLINE (round two): four painted layers of silhouettes behind the street, parallax from the camera itself
  const SKY_LAYERS = [{ z: -170, h: 90 }, { z: -260, h: 140 }, { z: -400, h: 200 }, { z: -600, h: 280 }];
  let skylinePlanes = [], skylineSeed = 1;
  function layerColour(i) {
    const p = night ? palette.night : palette.day;
    const base = night ? new THREE.Color(0x10102a) : new THREE.Color(0x56607a);
    const hor = new THREE.Color(p.horizon);
    const k = night ? [0.12, 0.28, 0.45, 0.6][i] : [0.22, 0.42, 0.62, 0.78][i];
    return '#' + base.lerp(hor, k).getHexString();
  }
  function paintSkyline() {
    for (const pl of skylinePlanes) { const i = pl.userData.layer; const hpx = [256, 256, 384, 512][i]; const wpx = Math.min(8192, Math.round(hpx * pl.userData.w / SKY_LAYERS[i].h)); const t = canvasTex(Icons().skyline(i, skylineSeed, night, layerColour(i), wpx, hpx)); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; if (pl.material.map) pl.material.map.dispose(); pl.material.map = t; pl.material.needsUpdate = true; }
  }
  function buildSkyline(width, seed) {
    for (const pl of skylinePlanes) { farGroup.remove(pl); pl.geometry.dispose(); }
    skylinePlanes = []; skylineSeed = seed;
    const Wl = width * CELL + 1600;
    SKY_LAYERS.forEach((L, i) => {
      const geo = new THREE.PlaneGeometry(Wl, L.h);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, fog: false, depthWrite: true });
      const pl = new THREE.Mesh(geo, mat);
      pl.position.set(width * CELL / 2, L.h / 2 - 0.5, L.z);
      pl.userData.layer = i; pl.userData.w = Wl; pl.renderOrder = -5 + i; pl.frustumCulled = false;
      farGroup.add(pl); skylinePlanes.push(pl);
    });
    paintSkyline();
  }
  function buildFar(width, seed) {
    for (const c of farGroup.children.slice()) { if (c.userData.layer != null) continue; farGroup.remove(c); if (c.geometry) c.geometry.dispose(); }
    buildSkyline(width, seed);
    let r = seed * 7919 + 17;
    const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
    // THE BACK STREETS (James, 2026-09-21): an alley behind the front row, a row of blocks, a second street, a taller row —
    // then the painted skyline. Front faces at ALLEY_Z and STREET2_Z; the x range runs well past both ends.
    const rows = [{ z: ALLEY_Z, n: Math.ceil(width / 4) + 40, hMin: 3, hMax: 9, w: [10, 26], d: [14, 30], dim: 0.92 }, { z: STREET2_Z, n: Math.ceil(width / 4) + 40, hMin: 5, hMax: 16, w: [14, 32], d: [16, 34], dim: 0.8 }];
    const tints = Object.values(FAMILY_TINT).map((t) => t.map((c) => Math.min(1, c * 1.25)));
    for (const row of rows) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      geo.translate(0, 0.5, 0);
      const sizes = new Float32Array(row.n * 3), seeds = new Float32Array(row.n), tintA = new Float32Array(row.n * 3);
      const mat = new THREE.ShaderMaterial({ vertexShader: FAR_VS, fragmentShader: FAR_FS, uniforms: Object.assign({}, farUniforms, { uDim: { value: row.dim }, uTint: { value: new THREE.Color(0.5, 0.5, 0.5) } }) });
      const inst = new THREE.InstancedMesh(geo, mat, row.n);
      const m = new THREE.Matrix4();
      let x = -520;
      for (let i = 0; i < row.n; i++) {
        const w = row.w[0] + rnd() * (row.w[1] - row.w[0]), h = Math.round(row.hMin + rnd() * (row.hMax - row.hMin)) * CELL, d = row.d[0] + rnd() * (row.d[1] - row.d[0]);
        sizes[i * 3] = w; sizes[i * 3 + 1] = h; sizes[i * 3 + 2] = d; seeds[i] = rnd();
        const t = tints[Math.floor(rnd() * tints.length)], k = 0.85 + 0.3 * rnd();
        tintA[i * 3] = Math.min(1, t[0] * k); tintA[i * 3 + 1] = Math.min(1, t[1] * k); tintA[i * 3 + 2] = Math.min(1, t[2] * k);
        m.identity(); m.setPosition(x + w / 2, 0, row.z - d / 2 - rnd() * 3);   // the front face on the row's line
        inst.setMatrixAt(i, m);
        x += w + 1.5 + rnd() * 5;
        if (x > width * CELL + 520) { inst.count = i + 1; break; }
      }
      geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 3));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
      geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tintA, 3));
      inst.frustumCulled = false; inst.castShadow = true; inst.receiveShadow = true;
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
  const shopsTex = canvasTex(Icons().shopAtlas());
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
    // THE WALL: a crisp tile exactly one cell square (bricks / stone / slate / cement / dark glass), the same canvas on
    // the face and the sides, repeated once per cell so the grid meets itself at the corners
    const wallCanvas = Icons().wallTile(fam.id, Math.floor(seedRnd() * 6));
    const wallTex = canvasTex(wallCanvas); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.anisotropy = 8; wallTex.minFilter = THREE.LinearMipmapLinearFilter; wallTex.generateMipmaps = true;
    const sideTex = wallTex.clone(); sideTex.repeat.set(DEPTH / CELL, H / CELL); sideTex.needsUpdate = true;
    const roll = () => 0.92 + 0.16 * seedRnd();
    const tint = FAMILY_TINT[fam.id].map((c) => Math.min(1, c * roll())), trim = FAMILY_TRIM[fam.id].map((c) => Math.min(1, c * (0.95 + 0.1 * seedRnd())));
    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, color: 0xd8d8d8, emissive: 0x161616, roughness: 0.92, metalness: fam.id === 'steel' || fam.id === 'glass' ? 0.3 : 0.02 });
    const roofMat = new THREE.MeshStandardMaterial({ map: tile('roof', W / 10, DEPTH / 10), roughness: 1 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, DEPTH), [sideMat, sideMat, roofMat, backMat, backMat, backMat]);   // +x -x +y -y +z(front, hidden by the facade) -z
    body.position.set(W / 2, H / 2, -DEPTH / 2); body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    // a parapet and rooftop kit: a water tank, an AC plant, a vent or two
    // THE CORNICE: a trim-coloured cap that overhangs the face, with a darker underside
    const trimCol = new THREE.Color(trim[0], trim[1], trim[2]);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.9, 0.9, DEPTH + 0.6), new THREE.MeshStandardMaterial({ color: trimCol, roughness: 0.85 }));
    parapet.position.set(W / 2, H + 0.42, -DEPTH / 2 + 0.3); parapet.castShadow = true; g.add(parapet);
    const under = new THREE.Mesh(new THREE.BoxGeometry(W + 0.9, 0.16, DEPTH + 0.6), new THREE.MeshStandardMaterial({ color: trimCol.clone().multiplyScalar(0.55), roughness: 0.9 }));
    under.position.set(W / 2, H - 0.1, -DEPTH / 2 + 0.3); g.add(under);
    const kitMat = new THREE.MeshStandardMaterial({ map: tile('steel', 0.5, 0.5), color: 0xd8d2c4, roughness: 0.6, metalness: 0.4 });
    const rustMat = new THREE.MeshStandardMaterial({ map: tile('steel', 0.5, 0.5), color: 0xb85a3a, roughness: 0.8, metalness: 0.3 });
    // a fire escape down two columns of the face, on some buildings
    if (b.cols >= 3 && b.floors >= 4 && !b.neon && seedRnd() < 0.45) {
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.5, metalness: 0.6 });
      const c0 = Math.floor(seedRnd() * (b.cols - 1));
      const fx = (c0 + 1) * CELL;
      for (let r = 1; r < b.floors; r++) {
        const landing = new THREE.Mesh(new THREE.BoxGeometry(CELL * 1.9, 0.09, 1.1), ironMat); landing.position.set(fx, r * CELL + 0.05, 0.6); g.add(landing);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(CELL * 1.9, 0.05, 0.05), ironMat); rail.position.set(fx, r * CELL + 0.75, 1.12); g.add(rail);
        for (let i = -3; i <= 3; i++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), ironMat); post.position.set(fx + i * CELL * 0.3, r * CELL + 0.4, 1.12); g.add(post); }
        if (r < b.floors - 1) { const stair = new THREE.Mesh(new THREE.BoxGeometry(CELL * 1.25, 0.08, 0.7), ironMat); stair.position.set(fx + (r % 2 ? 0.35 : -0.35) * CELL, r * CELL + CELL * 0.5, 0.62); stair.rotation.z = (r % 2 ? 1 : -1) * 0.72; g.add(stair); }
      }
      const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.5, CELL * 0.9, 0.06), ironMat); ladder.position.set(fx - CELL * 0.6, CELL * 0.6, 0.9); g.add(ladder);
    }
    // a drainpipe down one edge
    { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, H - 0.6, 8), new THREE.MeshStandardMaterial({ color: trimCol.clone().multiplyScalar(0.6), roughness: 0.6, metalness: 0.4 })); pipe.position.set(seedRnd() < 0.5 ? 0.28 : W - 0.28, H / 2 - 0.3, 0.16); g.add(pipe); }
    const r1 = seedRnd(), r2 = seedRnd();
    if (r1 < 0.45) { const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 12), rustMat); tank.position.set(W * (0.25 + r2 * 0.5), H + 2.3, -DEPTH * 0.55); g.add(tank); const legs = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), kitMat); legs.position.set(tank.position.x, H + 0.6, tank.position.z); g.add(legs); }
    else { const ac = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 2.6), kitMat); ac.position.set(W * (0.2 + r2 * 0.6), H + 0.8, -DEPTH * 0.4); g.add(ac); }
    for (let i = 0; i < 1 + Math.floor(seedRnd() * 3); i++) { const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8), kitMat); vent.position.set(1.5 + seedRnd() * (W - 3), H + 0.7, -1.5 - seedRnd() * (DEPTH - 3)); g.add(vent); }
    if (b.floors >= 10 && seedRnd() < 0.5) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 7, 6), kitMat); mast.position.set(W * 0.5, H + 3.5, -DEPTH * 0.5); g.add(mast); const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); beacon.position.set(W * 0.5, H + 7.1, -DEPTH * 0.5); beacon.userData.beacon = true; g.add(beacon); }
    // the facade
    const data = new Uint8Array(b.cols * b.floors * 4);
    packCells(b, data, seedRnd);
    const cellsTex = new THREE.DataTexture(data, b.cols, b.floors, THREE.RGBAFormat, THREE.UnsignedByteType);
    cellsTex.magFilter = cellsTex.minFilter = THREE.NearestFilter; cellsTex.needsUpdate = true;
    const shopDef = Icons().SHOPS[(b.shop || 0) % 8];
    const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
    const brand = b.restaurant ? BRAND_COLOR[b.restaurant] : hex(shopDef[1]).concat(hex(shopDef[2]));
    const split = b.split > 0 ? b.split : -1;
    const shop2Def = Icons().SHOPS[(b.shop2 >= 0 ? b.shop2 : 0) % 8];
    const brand2 = hex(shop2Def[1]).concat(hex(shop2Def[2]));
    const doorCol = Math.floor((split > 0 ? split : b.cols) / 2), doorCol2 = split > 0 ? split + Math.floor((b.cols - split) / 2) : -1;
    const neonSpan = b.neon ? { c0: b.neon.cells[0] % b.cols, w: b.neon.cells.length } : { c0: 0, w: 1 };
    const uniforms = {
      uCells: { value: cellsTex }, uWall: { value: wallTex }, uSigns: { value: signsTex }, uShops: { value: shopsTex },
      uTint: { value: new THREE.Vector3(...tint) }, uTrim: { value: new THREE.Vector3(...trim) }, uShop: { value: -1 }, uDoor: { value: doorCol }, uPeople: { value: 1 },
      uShopTex: { value: canvasTex(b.restaurant ? Icons().brandSign(b.restaurant, 1024, 96) : Icons().shopSign(b.shop || 0, 1024, 96, false)) }, uShopKind: { value: b.restaurant ? 8 : (b.shop || 0) % 8 },
      uSplit: { value: split }, uDoor2: { value: doorCol2 }, uShopTex2: { value: canvasTex(Icons().shopSign(b.shop2 >= 0 ? b.shop2 : 0, 1024, 96, false)) }, uShopKind2: { value: (b.shop2 >= 0 ? b.shop2 : 0) % 8 },
      uBrandA2: { value: new THREE.Vector3(brand2[0], brand2[1], brand2[2]) }, uBrandB2: { value: new THREE.Vector3(brand2[3], brand2[4], brand2[5]) },
      uCols: { value: b.cols }, uFloors: { value: b.floors }, uCell: { value: CELL }, uTileCells: { value: 1 },
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
      // the brand mark on the fascia, left of the name
      const cs1 = split > 0 ? split : b.cols, span = Math.min(cs1, 3), c0 = (cs1 - span) / 2;
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: canvasTex(Icons().brandMark(b.restaurant, 256)), transparent: true }));
      mark.position.set(c0 * CELL + 0.55, CELL * 0.855, 0.06); g.add(mark);
    }
    // THE AWNING: a real sloped canopy with a valance over the glass, on every restaurant and some shops
    const shops = [{ c0: 0, c1: split > 0 ? split : b.cols, brand, rest: !!b.restaurant }];
    if (split > 0) shops.push({ c0: split, c1: b.cols, brand: brand2, rest: false });
    for (const sh of shops) {
      if (!(sh.rest || seedRnd() < 0.45)) continue;
      const striped = sh.rest || seedRnd() < 0.5;
      const awTex = canvasTex(Icons().awning(sh.brand, striped));
      const awMat = new THREE.MeshStandardMaterial({ map: awTex, roughness: 0.85, side: THREE.DoubleSide });
      const aw = (sh.c1 - sh.c0) * CELL - 0.5, cx = (sh.c0 + sh.c1) / 2 * CELL, drop = 0.55, out = 1.5;
      const slope = new THREE.Mesh(new THREE.PlaneGeometry(aw, Math.hypot(out, drop)), awMat);
      slope.rotation.x = Math.PI / 2 - Math.atan2(drop, out);   // sloping down and out from the wall
      slope.position.set(cx, CELL * 0.69 - drop / 2, out / 2); slope.castShadow = true; g.add(slope);
      const valance = new THREE.Mesh(new THREE.PlaneGeometry(aw, 0.32), awMat);
      valance.position.set(cx, CELL * 0.69 - drop - 0.16, out); g.add(valance);
      for (const dx of [-aw / 2 + 0.2, aw / 2 - 0.2]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, out), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.5 })); arm.position.set(cx + dx, CELL * 0.69 - drop, out / 2); g.add(arm); }
    }
    // the rubble for later, hidden
    const rubble = makeRubble(W, seedRnd);
    rubble.visible = false; g.add(rubble);
    cityGroup.add(g);
    const view = { g, body, facade, uniforms, data, cellsTex, rubble, parapet, W, H, collapsed: false, dropShown: 0, moundT: 0, moundH: 0, items: new Map(), fam, tint, trim };
    buildingViews.set(b.id, view);
    return view;
  }
  // THE MOUND (James, 2026-09-22: "a whole building just fell down — leave a big mound for a bit, let it crush down and then
  // sink down and eventually disappear"): a lumpy dome the size of the lot, unit height, scaled up while the building comes
  // down floor by floor, held, then slumped to a low pile. The chunks rest on its surface and sink with it (moundHeightAt).
  const MOUND_W = 3, MOUND_D = 3;   // metres of spill past the lot on each side
  function moundProfile(W, seed, x, z) {
    // x from the lot's left edge, z from its front face (negative into the lot); 0..1
    const hw = W / 2 + MOUND_W, hd = DEPTH / 2 + MOUND_D;
    const u = (x - W / 2) / hw, v = (z + DEPTH / 2 - 1) / hd;
    const r = Math.min(1, Math.sqrt(u * u + v * v));
    const dome = Math.pow(Math.cos(r * Math.PI / 2), 0.75);
    const lump = 0.82 + 0.18 * Math.sin(x * 1.7 + seed * 9.0) * Math.cos(z * 1.3 + seed * 4.0) + 0.1 * Math.sin(x * 4.1 + z * 3.7 + seed * 20.0);
    return dome * lump;
  }
  function makeRubble(W, seedRnd) {
    const seed = seedRnd();
    const geo = new THREE.PlaneGeometry(W + MOUND_W * 2, DEPTH + MOUND_D * 2, 18, 9);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + W / 2, z = -pos.getY(i) - DEPTH / 2 + 1;   // plane coords → lot coords (the plane is laid flat, its y runs into the lot)
      pos.setZ(i, moundProfile(W, seed, x, z));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tile('rubble', (W + 6) / 6, (DEPTH + 6) / 6), roughness: 1 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.position.set(W / 2, 0.02, -DEPTH / 2 + 1);
    m.scale.z = 0.001;   // scale.z is height once the plane is laid flat
    m.castShadow = true; m.receiveShadow = true;
    m.userData.seed = seed; m.userData.W = W;
    return m;
  }
  function moundHeightAt(view, wx, wz) {
    const m = view.rubble; if (!m || !m.visible) return 0;
    const x = wx - view.g.position.x;   // the building group sits at x0 * CELL
    return m.scale.z * moundProfile(m.userData.W, m.userData.seed, x, wz);
  }
  function moundTarget(b) { return Math.min(9, Math.max(3, b.floors * CELL * 0.3)) * look.mound; }
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
  const screamerTex = [];
  function screamerFrame(i) { if (!screamerTex[i]) screamerTex[i] = canvasTex(Icons().screamer(i, 160)); return screamerTex[i]; }
  function syncItems(state) {
    const seen = new Set();
    for (const it of state.items) {
      seen.add(it.id);
      let v = itemViews.get(it.id);
      if (!v && models.people[it.deal] && models.people[it.deal].scene) {
        // a person: a rigged model standing on the sill, the clip looping, facing the street
        const rig = makeRig(models.people[it.deal], CELL * (it.deal === 'screamer' ? 0.5 : 0.46), 0x9a9aa2);   // a person is shorter than the shop door (0.72 of a cell): edible, obviously
        actorGroup.remove(rig.root); cityGroup.add(rig.root);
        rig.root.position.set(it.x * CELL, (it.row + (it.row > 0 ? 0.06 : 0.16)) * CELL, 0.32);
        rig.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 2; } });
        play(rig, PEOPLE_CLIPS[it.deal], { speed: it.deal === 'screamer' ? 1.3 : 1 });
        v = { mesh: rig.root, mat: null, rig, deal: it.deal, hot: it.hot, glow: null, t: 0, model: true };
        itemViews.set(it.id, v);
        const bv = buildingViews.get(it.b); if (bv) setItemFlag(bv, it.k, true);
      } else if (!v && models.statics[it.deal] && THING_MODELS[it.deal]) {
        // a thing: the real model on the sill
        const st2 = makeStatic(it.deal, CELL * THING_MODELS[it.deal], 0x888888, [1, 1, 1]);
        actorGroup.remove(st2.root); cityGroup.add(st2.root);
        st2.root.position.set(it.x * CELL, (it.row + (it.row > 0 ? 0.06 : 0.16)) * CELL, 0.3);
        st2.inner.rotation.y = -0.35;
        st2.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 2; } });
        v = { mesh: st2.root, mat: null, deal: it.deal, hot: it.hot, glow: null, t: 0, model: true, statik: st2 };
        itemViews.set(it.id, v);
        const bv = buildingViews.get(it.b); if (bv) setItemFlag(bv, it.k, true);
      }
      if (!v) {
        const name = it.deal === 'fryer' ? 'fryer' : it.deal;
        const mat = new THREE.MeshBasicMaterial({ map: it.deal === 'screamer' ? screamerFrame(0) : iconTexture(name), transparent: true, depthWrite: false });
        const big = it.deal === 'screamer' ? 0.5 : 0.46;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL * big, CELL * big), mat);
        mesh.position.set(it.x * CELL, (it.row + 0.5) * CELL - CELL * 0.06, 0.14);   // just in front of the wall, inside the opening
        mesh.renderOrder = 2;
        cityGroup.add(mesh);
        v = { mesh, mat, deal: it.deal, hot: it.hot, glow: null, t: 0 };
        if (false) {
          const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: it.deal === 'battery' ? 0xff7a1a : it.deal === 'supplement' ? 0x7ed957 : it.deal === 'corridor' ? 0x9ad8ff : 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
          gl.scale.set(CELL * 1.2, CELL * 1.2, 1); gl.position.copy(mesh.position); gl.position.z += 0.2; cityGroup.add(gl); v.glow = gl;
        }
        itemViews.set(it.id, v);
        const bv = buildingViews.get(it.b); if (bv) setItemFlag(bv, it.k, true);
      }
      if (!v.glow && (it.deal === 'streamer' || it.deal === 'battery' || it.deal === 'supplement' || it.deal === 'corridor')) {
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: it.deal === 'battery' ? 0xff7a1a : it.deal === 'supplement' ? 0x7ed957 : it.deal === 'corridor' ? 0x9ad8ff : 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
        gl.scale.set(CELL * 1.2, CELL * 1.2, 1); gl.position.set(it.x * CELL, (it.row + 0.5) * CELL, 0.4); cityGroup.add(gl); v.glow = gl;
      }
      v.t += 0.016;
      if (v.rig && v.rig.mixer) v.rig.mixer.update(1 / 60);
      if (v.model) { if (it.deal === 'fryer' && !it.hot && !v.cooled) { v.cooled = true; cityGroup.remove(v.mesh); const mat = new THREE.MeshBasicMaterial({ map: iconTexture('toast'), transparent: true, depthWrite: false }); v.mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.5, CELL * 0.5), mat); v.mesh.position.set(it.x * CELL, (it.row + 0.45) * CELL, 0.14); v.mesh.renderOrder = 2; v.mat = mat; cityGroup.add(v.mesh); v.model = false; } continue; }
      if (it.deal === 'fryer' && !it.hot && !v.cooled) { v.cooled = true; v.mat.map = iconTexture('toast'); v.mat.needsUpdate = true; }
      if (it.deal === 'waver') v.mesh.position.y = (it.row + 0.5) * CELL - CELL * 0.06 + Math.sin(clock.t * 6) * 0.15;
      if (it.deal === 'screamer') { const fr = Math.floor(clock.t * 9 + it.id) % 4; if (fr !== v.frame) { v.frame = fr; v.mat.map = screamerFrame(fr); v.mat.needsUpdate = true; } v.mesh.position.y = (it.row + 0.5) * CELL - CELL * 0.06 + Math.abs(Math.sin(clock.t * 9)) * 0.12; }
      if (it.deal === 'customer' || it.deal === 'worker' || it.deal === 'zombie' || it.deal === 'streamer') v.mesh.rotation.z = Math.sin(clock.t * 2.4 + it.id) * 0.05;
      if (v.glow) {
        const k = it.deal === 'streamer' ? 0.5 + 0.5 * Math.sin(clock.t * 14) * (it.t / Math.max(0.1, state.opts.streamerT)) : it.deal === 'battery' ? 0.55 + 0.45 * Math.sin(clock.t * 25) : 0.6 + 0.2 * Math.sin(clock.t * 3);
        v.glow.material.opacity = 0.35 + 0.5 * k;
        v.glow.scale.setScalar(CELL * (1.1 + 0.3 * k)); v.glow.scale.z = 1;
      }
    }
    for (const [id, v] of itemViews) {
      if (!seen.has(id)) { cityGroup.remove(v.mesh); if (v.glow) cityGroup.remove(v.glow); if (v.mesh.geometry) v.mesh.geometry.dispose(); itemViews.delete(id); }
    }
  }

  // ---- effects: debris, dust, shards, sparks, flashes -----------------------------------------------------------------------
  const DEBRIS_N = 900, DUST_N = 360, SHARD_N = 240, SPARK_N = 200;
  // a chunk is a jittered low-poly rock, not a cube (James: "crumbling rock")
  const debrisGeo = new THREE.IcosahedronGeometry(0.62, 0);
  { const pos = debrisGeo.attributes.position, seen = new Map(); for (let i = 0; i < pos.count; i++) { const key = pos.getX(i).toFixed(3) + ',' + pos.getY(i).toFixed(3) + ',' + pos.getZ(i).toFixed(3); let j = seen.get(key); if (j == null) { j = 0.72 + Math.random() * 0.5; seen.set(key, j); } pos.setXYZ(i, pos.getX(i) * j, pos.getY(i) * j * 0.8, pos.getZ(i) * j); } debrisGeo.computeVertexNormals(); }
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: false });
  const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS_N);
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  debris.frustumCulled = false;
  const debrisColor = new Float32Array(DEBRIS_N * 3);
  debris.instanceColor = new THREE.InstancedBufferAttribute(debrisColor, 3);
  const debrisPool = [];
  for (let i = 0; i < DEBRIS_N; i++) debrisPool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 1, sx: 1, sy: 1, sz: 1, life: 0, rest: 0, mv: null });
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
  function spawnDebris(x, y, z, n, spread, color, big, mv, huge) {
    let made = 0;
    for (const d of debrisPool) {
      if (d.alive) continue;
      d.alive = true; d.life = mv ? 14 + rnd() * 10 : 3.5 + rnd() * 2; d.rest = 0; d.mv = mv || null;
      d.x = x + (rnd() - 0.5) * spread; d.y = y + (rnd() - 0.5) * (mv ? 1.5 : spread * 0.6); d.z = z + rnd() * 1.5;
      if (mv) { d.z = z - rnd() * (DEPTH * 0.8); }   // collapse chunks land all over the lot, not just at the front
      d.vx = (rnd() - 0.5) * (mv ? 5 : 7); d.vy = mv ? -1 - rnd() * 3 : 2 + rnd() * 7; d.vz = mv ? (rnd() - 0.5) * 4 + 1.5 : 2 + rnd() * 6;
      d.rx = rnd() * TAU; d.ry = rnd() * TAU; d.rz = rnd() * TAU; d.wx = (rnd() - 0.5) * 8; d.wy = (rnd() - 0.5) * 8; d.wz = (rnd() - 0.5) * 8;
      const sc = huge ? 1.1 + rnd() * 1.6 : (big ? 0.5 : 0.22) + rnd() * (big ? 0.9 : 0.35);
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
      d.vx = (vx || 0) + (rnd() - 0.5) * 2.5; d.vy = (vy || 0) + rnd() * 1.2; d.vz = (z < 0.5 ? 0.15 : 0.5) + rnd() * (z < 0.5 ? 0.6 : 2.5);   // dust born at the wall stays near it
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
      const ground = d.mv ? moundHeightAt(d.mv, d.x, d.z) : 0;
      if (!d.rest) {
        d.vy -= G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
        const floor = ground + d.sy * 0.5;
        if (d.y < floor) { d.y = floor; if (Math.abs(d.vy) > 4) { d.vy = -d.vy * 0.35; d.vx *= 0.6; d.vz *= 0.6; d.wx *= 0.5; d.wz *= 0.5; } else { d.rest = 1; d.vx = d.vy = d.vz = 0; d.wx = d.wy = d.wz = 0; } }
        if (d.z > 3.4 && d.y < 0.4) { d.vz *= 0.8; }
      } else if (d.mv) { d.y = ground + d.sy * 0.5; }   // resting on the mound: sink with it
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
  const SW = 5.4, ROAD = 22;   // the front pavement and the road, in metres from the faces
  const MON_Z = 1.2, SOLDIER_Z = 2.4, CAR_Z = SW + 4.4, TANK_Z = SW + 3.0, DRONE_Z = 3.2, BOT_Z = 1.9;
  const ROAD_LANE_Z = SW + 7.4;   // how far out the road lane stands (the cars pass just behind the shins)
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
    fitModel.last = { w: (box.max.x - box.min.x) * k, h: h * k, d: (box.max.z - box.min.z) * k };
    return k;
  }
  function makeRig(asset, height, fallback) {
    const root = new THREE.Group();
    const view = { root, model: null, mixer: null, actions: {}, current: null, currentName: '', mats: [], fitted: 1, inner: new THREE.Group(), size: { w: height * 0.4, h: height, d: height * 0.4 } };
    root.add(view.inner);
    if (asset) {
      const model = skeletonClone(asset.scene);
      model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); view.mats.push(o.material); } });
      view.fitted = fitModel(model, height, 0);
      view.size = fitModel.last;
      view.inner.add(model); view.model = model;
      view.mixer = new THREE.AnimationMixer(model);
      for (const k in asset.clips) view.actions[k] = view.mixer.clipAction(asset.clips[k]);
      // the arm chains for the strike-and-reach layer (Meshy's rigs use the Mixamo names)
      view.bones = {};
      for (const side of ['Left', 'Right']) {
        const arm = model.getObjectByName(side + 'Arm'), fore = model.getObjectByName(side + 'ForeArm'), hand = model.getObjectByName(side + 'Hand');
        if (arm && fore && hand) view.bones[side] = { arm, fore, hand };
      }
      for (const side of ['Left', 'Right']) {
        const up = model.getObjectByName(side + 'UpLeg'), leg = model.getObjectByName(side + 'Leg'), foot = model.getObjectByName(side + 'Foot');
        if (up && leg && foot) view.bones[side + 'Leg'] = { arm: up, fore: leg, hand: foot };
      }
      view.spine = model.getObjectByName('Spine02') || model.getObjectByName('Spine01') || null;
      // the hips' own forward axis, measured at rest (the model faces +z at yaw 0): the face-lock below uses it
      view.hips = model.getObjectByName('Hips') || null;
      if (view.hips) { model.updateMatrixWorld(true); const q = new THREE.Quaternion(); view.hips.getWorldQuaternion(q); view.hipsFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q.invert()); }
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
  // ---- the strike-and-reach layer ---------------------------------------------------------------------------------
  // The 1986 read: a punch is a wind-up and a full arm strike that ends INSIDE the cell; a climb is hand over hand,
  // the free hand reaching the next sill first. The clips are the base; this runs after the mixer and turns the
  // arm bones in world space so the fist arrives where the hole appears. `w` is the blend (0 = the clip alone).
  const _qA = new THREE.Quaternion(), _qB = new THREE.Quaternion(), _qI = new THREE.Quaternion(), _pA = new THREE.Vector3(), _pF = new THREE.Vector3(), _pH = new THREE.Vector3(), _d0 = new THREE.Vector3(), _d1 = new THREE.Vector3();
  function rotateBoneWorld(bone, q, w) {
    // rotate a bone by the world-space quaternion q, blended by w
    bone.parent.getWorldQuaternion(_qA);
    _qB.copy(_qA).invert().multiply(q).multiply(_qA);
    _qI.identity().slerp(_qB, w);
    bone.quaternion.premultiply(_qI);
    bone.updateWorldMatrix(false, true);
  }
  function aimArm(chain, target, w, straighten) {
    if (!chain || w <= 0.001) return;
    chain.arm.updateWorldMatrix(true, true);
    if (straighten > 0) {
      chain.arm.getWorldPosition(_pA); chain.fore.getWorldPosition(_pF); chain.hand.getWorldPosition(_pH);
      _d0.subVectors(_pH, _pF).normalize(); _d1.subVectors(_pF, _pA).normalize();
      _qA.setFromUnitVectors(_d0, _d1);
      rotateBoneWorld(chain.fore, _qA.clone(), w * straighten);
    }
    chain.arm.getWorldPosition(_pA); chain.hand.getWorldPosition(_pH);
    _d0.subVectors(_pH, _pA).normalize(); _d1.subVectors(target, _pA).normalize();
    _qA.setFromUnitVectors(_d0, _d1);
    rotateBoneWorld(chain.arm, _qA.clone(), w);
  }
  const _tgt = new THREE.Vector3();
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  // two-bone reach with an elbow: the upper arm turns so the elbow lands on the pole side, the forearm turns so the
  // wrist lands on the target (or as close as the arm's length allows). `pole` is a world direction for the elbow.
  const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _H = new THREE.Vector3(), _u = new THREE.Vector3(), _pn = new THREE.Vector3(), _q2 = new THREE.Quaternion();
  function ik2(chain, target, pole, w) {
    if (!chain || w <= 0.001) return;
    chain.arm.updateWorldMatrix(true, true);
    chain.arm.getWorldPosition(_S); chain.fore.getWorldPosition(_E); chain.hand.getWorldPosition(_H);
    const L1 = _E.distanceTo(_S), L2 = _H.distanceTo(_E), L = L1 + L2;
    _u.subVectors(target, _S); const dRaw = _u.length(); if (dRaw < 1e-4) return; _u.divideScalar(dRaw);
    const d = Math.max(0.25 * L, Math.min(0.995 * L, dRaw));
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    _pn.copy(pole).addScaledVector(_u, -pole.dot(_u)); if (_pn.lengthSq() < 1e-6) _pn.set(0, -1, 0).addScaledVector(_u, _u.y); _pn.normalize();
    const elbow = _pA.copy(_S).addScaledVector(_u, a).addScaledVector(_pn, h);
    _d0.subVectors(_E, _S).normalize(); _d1.subVectors(elbow, _S).normalize();
    _q2.setFromUnitVectors(_d0, _d1); rotateBoneWorld(chain.arm, _q2.clone(), w);
    chain.fore.getWorldPosition(_E); chain.hand.getWorldPosition(_H);
    const wrist = _pF.copy(_S).addScaledVector(_u, d);
    _d0.subVectors(_H, _E).normalize(); _d1.subVectors(wrist, _E).normalize();
    _q2.setFromUnitVectors(_d0, _d1); rotateBoneWorld(chain.fore, _q2.clone(), w);
  }
  // the glove closes into a fist: shorter along the fingers, a little thicker across the knuckles
  function fist(v, side, k, big) {
    const ch = v.bones && v.bones[side]; if (!ch) return;
    const g = 1 + (big || 0);   // the cartoon fist: it swells on the hit so the punch reads at game distance
    ch.hand.scale.set((1 - 0.1 * k) * g, (1 - 0.62 * k) * g, (1 + 0.25 * k) * g);
    ch.hand.updateWorldMatrix(false, true);
  }
  // THE PUNCH (James, 2026-09-22: "the hand clapping is lame" — a punch that reads as a punch, up, left, right, down).
  // Built from the bones over a still base: the chest turns away and the fist cocks back by the shoulder (the tell),
  // then the chest whips round, the body lunges and the arm fires out to the cell the rules hit, accelerating into
  // the contact at the moment the core resolves the hit (0.42 of the punch), holds, and comes home. Up is an uppercut
  // from the hip, down is a hammer from over the shoulder, left / right on a face are hooks, straight on the street is
  // a cross. The off hand keeps its grip on a face and comes up to guard the chin on the street.
  const _F = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0), _out = new THREE.Vector3(), _C = new THREE.Vector3(), _W = new THREE.Vector3(), _P = new THREE.Vector3(), _pole = new THREE.Vector3(), _dir = new THREE.Vector3(), _G = new THREE.Vector3();
  // THE PUNCH'S OWN CLOCK (James, 2026-10-01: "there's no punch animation"): the core's punch is 0.29 s and the picture
  // was tied to it — five frames of wind-up, gone before it read. The picture now runs its own half second from the
  // punch event: the fist still lands on the core's hit (0.12 s in), then HOLDS out there and comes home.
  const PUNCH_VIS = 0.5;
  const P_WIND = 0.16, P_HIT = 0.25, P_HOLD = 0.68;
  function strikePose(v, m, kk, state) {
    const side = v.punchSide || 'Right', offSide = side === 'Right' ? 'Left' : 'Right';
    const chain = v.bones[side], off = v.bones[offSide];
    const d = m.punchDir, onFace = m.st === 'climb';
    const T = _tgt.copy(v.punchTarget);
    if (v.punchNew) v.punchNew = false;
    // the envelope: wind (0 → cocked), strike (cocked → target, accelerating), hold, home
    const windK = kk < P_WIND ? ease(kk / P_WIND) : 1;
    const strikeK = kk < P_WIND ? 0 : kk < P_HIT ? Math.pow((kk - P_WIND) / (P_HIT - P_WIND), 2) : 1;
    const homeK = kk < P_HOLD ? 0 : ease((kk - P_HOLD) / (1 - P_HOLD));
    const env = windK * (1 - homeK);
    // start from the base pose each frame
    v.inner.position.set(0, 0, 0); v.inner.rotation.x = 0; v.inner.updateWorldMatrix(true, true);
    _F.set(onFace ? 0 : m.facing, 0, onFace ? -1 : 0);
    v.inner.getWorldPosition(_C); _C.y += CELL * (state.opts.monsterH || 2.7) * 0.62;
    chain.arm.getWorldPosition(_S);
    _out.subVectors(_S, _C); _out.y = 0; _out.addScaledVector(_F, -_out.dot(_F)); if (_out.lengthSq() < 1e-6) _out.set(1, 0, 0); _out.normalize();
    // 1. the chest: turned away on the wind, whipped round through the strike
    if (v.spine) {
      const turn = (-0.38 * windK * (1 - strikeK) + 0.42 * strikeK) * (1 - homeK) * (onFace ? 0.45 : 1);   // a back to the camera turns less or the far shoulder swings out at us
      const sgn = Math.sign(_d0.crossVectors(_UP, _out).dot(_F)) || 1;
      _qA.setFromAxisAngle(_UP, turn * sgn); rotateBoneWorld(v.spine, _qA.clone(), 1);
      // an uppercut rises out of a crouch; a hammer comes over the top
      if (d.dy) { _d1.crossVectors(_F, _UP).normalize(); _qA.setFromAxisAngle(_d1, (d.dy > 0 ? -0.22 : 0.26) * (strikeK - 0.6 * windK * (1 - strikeK)) * (1 - homeK)); rotateBoneWorld(v.spine, _qA.clone(), 1); }
    }
    chain.arm.updateWorldMatrix(true, true);
    chain.arm.getWorldPosition(_S);
    chain.fore.getWorldPosition(_E); chain.hand.getWorldPosition(_H);
    const L = _E.distanceTo(_S) + _H.distanceTo(_E);
    // on a face a punch straight up / in / down lands on the cell behind the body: the fist goes to the cell's edge
    // on the striking side (still inside the cell), so it is seen, beside the head or the shoulder
    if (onFace && v.punchTarget.faceCol) { _G.subVectors(_S, _C); T.x += Math.sign(_G.x || 1) * (d.dy < 0 ? 0.48 : 0.4) * CELL; T.y += (d.dy > 0 ? 0.2 : d.dy < 0 ? 0.3 : 0) * CELL; }
    // 2. the lunge: the body goes after whatever the arm can't reach; a small pull back on the wind
    _dir.subVectors(T, _S); const far = _dir.length();
    if (onFace) { _dir.z = 0; _dir.y *= 0.35; } else { _dir.y = 0; _dir.z *= 0.3; }
    if (_dir.lengthSq() > 1e-6) _dir.normalize();
    const lungeMax = (onFace ? 0.28 : 0.55) * CELL;
    const lunge = Math.min(lungeMax, Math.max(0, far - 0.9 * L)) * strikeK * (1 - homeK) - 0.07 * CELL * windK * (1 - strikeK);
    v.inner.position.copy(_dir).multiplyScalar(lunge);
    v.inner.updateWorldMatrix(false, true);
    chain.arm.getWorldPosition(_S);
    // 3. the cocked fist and the elbow, by kind of punch
    if (d.dy > 0) { _W.copy(_S).addScaledVector(_F, 0.12 * L).addScaledVector(_UP, -0.72 * L).addScaledVector(_out, 0.12 * L); _pole.copy(_F).multiplyScalar(-0.3).addScaledVector(_out, 0.6).addScaledVector(_UP, -0.6); }
    else if (d.dy < 0) { _W.copy(_S).addScaledVector(_UP, 0.5 * L).addScaledVector(_F, -0.1 * L).addScaledVector(_out, 0.18 * L); _pole.copy(_out).addScaledVector(_UP, 0.6).addScaledVector(_F, -0.3); }
    else { _W.copy(_S).addScaledVector(_F, -0.42 * L).addScaledVector(_UP, -0.22 * L).addScaledVector(_out, -0.08 * L); _pole.copy(_out).multiplyScalar(0.6).addScaledVector(_UP, -0.8).addScaledVector(_F, -0.3); }
    _pole.normalize();
    if (kk < P_WIND) _P.copy(_W);
    else if (kk < P_HIT) _P.copy(_W).lerp(T, strikeK);
    else { _P.copy(T); if (kk < P_HOLD) _P.addScaledVector(_dir, -0.05 * L * Math.sin(Math.PI * (kk - P_HIT) / (P_HOLD - P_HIT))); }
    // through the strike the elbow swings from behind-and-down to out to the side (a hook's line, a cross's snap)
    if (kk >= P_WIND) _pole.lerp(_G.copy(_out).addScaledVector(_UP, d.dy < 0 ? 0.4 : -0.5).normalize(), strikeK).normalize();
    ik2(chain, _P, _pole, env);
    v.fistSide = side; v.fistK = env; fist(v, side, env, 0.7 * strikeK * (1 - homeK));
    // THE IMPACT: the moment the fist lands — a flash and a puff at the knuckles, hit or miss
    if (kk >= P_HIT && !v.impactDone) {
      v.impactDone = true;
      chain.hand.getWorldPosition(_G);
      flash(_G.x, _G.y, _G.z + 0.3, 3.2, 0xfff0d0, 0.1);
      spawnDust(_G.x, _G.y, _G.z + 0.2, 5, 1.1, 0.45, 0, 0.6, 0.45);
    }
    // 4. the off hand: on a face it grips the wall up and out to its side; on the street it guards the chin
    if (onFace && off) {
      off.arm.getWorldPosition(_G);
      _W.subVectors(_G, _C); _W.y = 0; _W.z = 0; _W.normalize();
      _G.addScaledVector(_W, 0.3 * L).addScaledVector(_UP, 0.6 * L); _G.z = -0.05 * CELL;
      _pole.copy(_W).addScaledVector(_UP, -0.6).add(_F.clone().multiplyScalar(-0.4)).normalize();
      ik2(off, _G, _pole, windK > 0 ? Math.min(1, windK * 1.5) * (1 - homeK) : 0);
    }
    if (!onFace && off) {
      off.arm.getWorldPosition(_G);
      _G.addScaledVector(_F, 0.34 * L).addScaledVector(_UP, 0.1 * L);
      _G.addScaledVector(_out, 0.25 * L);   // toward the middle of the chest
      _pole.copy(_UP).multiplyScalar(-1).addScaledVector(_F, -0.2).normalize();
      ik2(off, _G, _pole, env * 0.85);
      fist(v, offSide, env * 0.8);
    }
  }
  function syncMonsters(state, dt) {
    const seen = new Set();
    for (const m of state.monsters) {
      seen.add(m.id);
      let v = monsterViews.get(m.id);
      const mh = state.opts.monsterH || 2.7;
      if (v && v.height !== mh) { actorGroup.remove(v.root); monsterViews.delete(m.id); v = null; }   // the size dial moved
      if (!v) {
        v = makeRig(models.monsters[m.slug], CELL * mh, FALLBACK_COLOR[m.slug]);
        v.height = mh; v.teen = null; v.slug = m.slug; v.prevAnim = ''; v.punchSide = 0; v.shadow = makeShadow(CELL * mh * 0.45);
        v.kickT = 0; v.kickDir = -1; v.slamHold = 0; v.punchN = 0; v.lastPunchK = 1; v.punchNew = false; v.punchTarget = null; v.punchWind = null; v.climbSpeed = 1.2;
        v.root.add(v.shadow);
        v.smoothX = m.x * CELL; v.smoothY = m.y * CELL; v.yaw = 0; v.scaleK = 1;
        monsterViews.set(m.id, v);
      }
      const gone = m.st === 'gone' || m.st === 'dead';
      v.root.visible = !gone;
      if (gone) continue;
      // position: ease the x on a face (the core snaps to columns), follow y directly
      const tx = m.x * CELL, ty = m.y * CELL;
      const k = m.st === 'climb' ? Math.min(1, dt * 18) : 1;
      v.smoothX += (tx - v.smoothX) * k; v.smoothY = ty;
      // the grip kick: a small dip as each hop lands, the cabinet's re-grip
      if (v.kickT > 0) { v.kickT -= dt; v.smoothY += Math.sin(Math.PI * Math.max(0, v.kickT) / 0.14) * 0.09 * CELL * (v.kickDir || 1); }
      const onFace = m.st === 'climb';
      const laneZ = (m.st === 'street' || m.st === 'jump' || m.st === 'fall') ? m.laneK || 0 : 0;   // 0 = at the faces, 1 = the road
      const z = (onFace ? 0.25 : 0.5) + v.size.d * 0.5 + laneZ * ROAD_LANE_Z;   // the model's own thickness keeps it in front of the wall
      v.root.position.set(v.smoothX, v.smoothY, m.st === 'roof' ? Math.min(z, DEPTH * 0.5) - DEPTH * 0.5 : z);
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
      // animation: the clip is the base, the strike-and-reach layer below puts the fists where the rules put them
      let anim = m.anim;
      const punchK = m.punchT > 0 && m.punchFull > 0 ? 1 - m.punchT / m.punchFull : 1;   // 0 at the start of a punch, 1 at its end
      if (anim === 'punch') {
        // a new punch starts when the core's timer resets (punchK drops back near zero)
        if (v.prevAnim !== 'punch' || punchK < v.lastPunchK - 0.3) { v.punchN = (v.punchN || 0) + 1; v.punchNew = true; }
        v.lastPunchK = punchK;
        const d = m.punchDir;
        const stomp = m.st === 'street' && d.dy < 0;
        // THE STOMP is a foot (James, 2026-09-21): the ground-stomp clip. Every other punch is built from the bones
        // (the strike layer below) over a still base: the hang on a face, the idle on the street and the roof —
        // the boxing clips fought the aim and read as a clap (James, 2026-09-22)
        if (stomp) anim = v.actions.stomp ? 'stomp' : 'idle';
        else anim = m.st === 'climb' ? 'hang' : 'idle';
      } else v.lastPunchK = 1;
      const punchAnim = anim === 'stomp';
      if (anim !== v.prevAnim || (punchAnim && v.punchNew)) {
        const ps = (m.flavour ? m.flavour.punch : 1);
        if (anim === 'idle') play(v, 'idle', { speed: 0.9 });
        else if (anim === 'walk') play(v, 'walk', { speed: 1.1 * (m.flavour ? m.flavour.run : 1) });
        else if (anim === 'run') play(v, v.actions.run ? 'run' : 'walk', { speed: 1.5, fade: 0.06 });
        else if (anim === 'cross') play(v, 'walk', { speed: 0.9, fade: 0.08 });
        else if (anim === 'climb') { const clip = v.actions.ladder ? 'ladder' : 'climb'; play(v, clip, { speed: v.climbSpeed || 1.2, fade: 0.06 }); }
        else if (anim === 'hang') { const clip = v.actions.ladder ? 'ladder' : 'climb'; play(v, clip, { speed: 0.001, fade: 0.1 }); }
        else if (punchAnim) { v.punchNew = false; play(v, anim, { once: true, restart: true, speed: (anim === 'bothFists' ? 2.4 : anim === 'stomp' ? 2.6 : 2.0) * ps, fade: 0.04 }); }
        else if (anim === 'eat') play(v, 'eat', { once: true, restart: true, speed: 2.5, fade: 0.06 });
        else if (anim === 'hit') play(v, 'hit', { once: true, restart: v.prevAnim !== 'hit', speed: 1.6, fade: 0.05 });
        else if (anim === 'fall') play(v, 'fall', { speed: 1 });
        else if (anim === 'smash') play(v, v.actions.slam ? 'slam' : 'fall', { once: true, restart: true, speed: 1.6, fade: 0.05 });
        else if (anim === 'jump') play(v, 'jump', { once: true, speed: 1.3 });
        else if (anim === 'revert') play(v, 'hit', { speed: 0.5 });
        else play(v, 'idle');
        v.prevAnim = m.anim === 'punch' ? 'punch' : anim;
      }
      // the ladder clip runs at the hop's pace: one cycle every two hops
      if (anim === 'climb' && v.current && v.currentName === 'ladder' && m.hopDur > 0) { const dur = v.current.getClip().duration || 1; v.climbSpeed = Math.max(0.6, Math.min(4, (dur / 2) / m.hopDur)); v.current.timeScale = v.climbSpeed; }
      if (!v.actions.idle && v.model && !v.mixer) {
        // the fallback shape: bob a little
        v.inner.position.y = (anim === 'walk' || anim === 'climb') ? Math.abs(Math.sin(clock.t * 9)) * 0.3 : 0;
        v.inner.rotation.x = punchAnim ? -0.4 : 0;
      }
      if (v.mixer) v.mixer.update(dt);
      // on a face the body stays square to the wall: the boxing clips twist the hips toward the camera (James, 2026-09-21)
      if (v.hips && v.hipsFwd && m.st === 'climb') {
        v.hips.getWorldQuaternion(_qA);
        _d0.copy(v.hipsFwd).applyQuaternion(_qA);            // the hips' forward, in world
        v.inner.getWorldQuaternion(_qB);
        _d1.copy(_d0).applyQuaternion(_qB.invert());          // ... in the body's frame, where forward should be +z
        const err = Math.atan2(_d1.x, _d1.z);
        if (Math.abs(err) > 0.02) { _qA.setFromAxisAngle(_d1.set(0, 1, 0), -err); rotateBoneWorld(v.hips, _qA.clone(), 1); }
      }
      // THE STRIKE: wind up, strike, hold, recover — the fist ends in the cell the rules hit
      let lean = 0, lunge = 0;
      const stomping = m.anim === 'punch' && m.st === 'street' && m.punchDir.dy < 0;
      if (stomping) {
        // THE STOMP is a foot: the leg kicks up ahead, then slams the foot into the ground on the beat; the body drops
        const kk = punchK, dx = m.punchDir.dx || m.facing;
        const legSide = dx > 0 ? 'Right' : 'Left';   // facing +x the model's right leg is nearer the camera
        const chain = v.bones && v.bones[legSide + 'Leg'];
        const hipY = v.smoothY + CELL * (state.opts.monsterH || 2.7) * 0.5;
        const rz = v.root.position.z;
        let w, dropK = 0;
        if (kk < 0.38) { w = ease(kk / 0.38); _tgt.set(v.smoothX + dx * 0.55 * CELL, hipY * 0.95, rz + 0.3); }
        else if (kk < 0.5) { const q = ease((kk - 0.38) / 0.12); w = 1; _tgt.set(v.smoothX + dx * (0.55 + 0.35 * q) * CELL, hipY * 0.95 * (1 - q), rz + 0.3); dropK = q; }
        else if (kk < 0.78) { w = 1; _tgt.set(v.smoothX + dx * 0.9 * CELL, 0, rz + 0.3); dropK = 1; }
        else { const q = ease((kk - 0.78) / 0.22); w = 1 - q; _tgt.set(v.smoothX + dx * 0.9 * CELL, 0, rz + 0.3); dropK = 1 - q; }
        if (chain) aimArm(chain, _tgt, w * 0.95, 0.9);
        lunge = 0.12 * CELL * dropK * (m.punchDir.dx ? 1 : 0.4); lean = 0.12 * dropK;
        v.inner.position.y = -0.1 * CELL * dropK;
      } else if (v.mixer) v.inner.position.y += (0 - v.inner.position.y) * Math.min(1, dt * 20);
      // (the body-drop reset above used to swallow the whole strike chain in its else — the rigged monsters never got the
      // strike layer at all, only the raw library clip, which is why the punch read as a shrug / a clap)
      let lungeSet = false;
      if (v.punchClock != null) { v.punchClock += dt; if (v.punchClock >= PUNCH_VIS || m.st === 'fall' || m.st === 'jump' || m.st === 'revert' || m.st === 'walkoff' || m.st === 'gone' || m.st === 'dead') v.punchClock = null; }
      if (!stomping && v.bones && v.bones.Left && v.bones.Right && v.punchClock != null && v.punchTarget) {
        strikePose(v, m, v.punchClock / PUNCH_VIS, state);
        lungeSet = true;
      } else if (v.bones && m.st === 'climb' && m.hop) {
        // THE REACH: the free hand goes to the next sill first
        const kk = Math.min(1, m.hopT / Math.max(1e-3, m.hopDur));
        const w = Math.sin(Math.PI * kk);
        const side = m.hopHand ? 'Left' : 'Right';
        const sx = (side === 'Left' ? 1 : -1) * 0.3 * CELL;   // facing the wall, the model's left is world +x
        _tgt.set(m.x * CELL + sx, (m.hopTo + (state.opts.monsterH || 2.7) * 0.55 + 0.55) * CELL, -0.12 * CELL);
        aimArm(v.bones[side], _tgt, w * 0.95, 0.7);
        lean = 0.05 * w;
      } else if (v.bones && m.st === 'fall' && m.smashing) {
        // both fists up over the head, ready to come down
        _tgt.set(v.smoothX, v.smoothY + CELL * (state.opts.monsterH || 2.7) * 1.15, v.root.position.z + 1);
        aimArm(v.bones.Right, _tgt, 0.8, 0.6); aimArm(v.bones.Left, _tgt, 0.8, 0.6);
      } else if (v.bones && v.slamHold > 0) {
        v.slamHold -= dt;
        _tgt.set(v.smoothX + m.facing * CELL * 0.5, 0.2, v.root.position.z + 1.5);
        _pF.copy(_tgt); _pF.x += 0.32 * CELL; aimArm(v.bones.Right, _pF, 0.9, 0.9); _pH.copy(_tgt); _pH.x -= 0.32 * CELL; aimArm(v.bones.Left, _pH, 0.9, 0.9);
        lean = 0.35;
      }
      if (!lungeSet) {
        v.inner.rotation.x += (-lean - v.inner.rotation.x) * Math.min(1, dt * 20);
        v.inner.position.x += (lunge * (m.st === 'climb' ? 0 : m.facing) - v.inner.position.x) * Math.min(1, dt * 20);
        v.inner.position.z += ((m.st === 'climb' ? -lunge : 0) - v.inner.position.z) * Math.min(1, dt * 20);
        if (v.fistK) { v.fistK = Math.max(0, v.fistK - dt * 6); fist(v, 'Left', v.fistK); fist(v, 'Right', v.fistK); }
      }
      // the run burst kicks up dust behind the feet; the skid too
      if (m.burstT > 0 && Math.random() < 0.45) spawnDust(v.smoothX - m.facing * 0.8, 0.3, v.root.position.z, 1, 1.0, 0.5, -m.facing * 2, 0.4, 0.35);
      if (m.skidT > 0 && Math.random() < 0.7) spawnDust(v.smoothX - m.facing * 0.5, 0.25, v.root.position.z, 1, 1.4, 0.6, -m.facing * 3, 0.6, 0.45);
      // hurt: a red tint that fades; the spawn shield: a flicker
      const hurt = m.hitT > 0 ? Math.min(1, m.hitT / 0.4) * (Math.floor(clock.t * 20) % 2 ? 1 : 0.4) : m.flashT > 0 ? 0.6 : 0;
      const fill = night ? 0.34 : 0.1;
      for (const mat of v.mats) { if (mat.emissive) { mat.emissive.setRGB(fill + hurt * 0.45, fill * (1 - hurt * 0.5), fill * (1 - hurt * 0.5)); } }
      v.inner.visible = !(m.invulnT > 0 && Math.floor(clock.t * 14) % 2 === 0);
    }
    for (const [id, v] of monsterViews) if (!seen.has(id)) { actorGroup.remove(v.root); monsterViews.delete(id); }
  }
  function makeShadow(size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.5), new THREE.MeshBasicMaterial({ map: softTex, color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1;
    return m;
  }
  function syncSoldiers(state, dt) {
    const seen = new Set();
    for (const s of state.soldiers) {
      seen.add(s.id);
      let v = soldierViews.get(s.id);
      if (!v) { v = makeRig(models.soldier, 2.7, 0x6b6f3a); v.shadow = makeShadow(1.7); v.root.add(v.shadow); v.prev = ''; soldierViews.set(s.id, v); }
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
      { const fill = night ? 0.3 : 0.14; for (const mat of v.mats) if (mat.emissive) mat.emissive.setRGB(fill, fill, fill); }
      if (!v.mixer) { v.inner.position.y = s.st === 'walk' ? Math.abs(Math.sin(clock.t * 12)) * 0.15 : 0; if (s.st === 'kneel' || s.st === 'fire') v.inner.scale.y = 0.7; else v.inner.scale.y = 1; }
    }
    for (const [id, v] of soldierViews) if (!seen.has(id)) { actorGroup.remove(v.root); soldierViews.delete(id); }
  }
  // the plain cars come in colours: the models are painted light, so a tint on the body reads as the paint
  const CAR_TINTS = [0xc83c2c, 0x2f5fb8, 0x3a7a46, 0xb8b8bc, 0x2a2a30, 0xd9c05a, 0x8a4a9a, 0xe8e8ea, 0x7a5a3a];
  function tintCar(inner, hex) { inner.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(hex); o.material.emissiveIntensity = 0.35; } }); }
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
        const len = c.kind === 'bot' ? 1.3 : c.kind === 'cruiser' ? 5.2 : c.kind === 'suv' ? 5.1 : c.kind === 'hatch' ? 4.4 : 4.8;
        v = makeStatic(c.kind, len, c.kind === 'taxi' ? 0xf2d24b : c.kind === 'bot' ? 0xf4f4f4 : 0xf0f0f0, c.kind === 'bot' ? [1.2, 0.9, 0.8] : [4.8, 1.5, 2]);
        if (c.kind === 'hatch' || c.kind === 'suv') tintCar(v.inner, CAR_TINTS[(c.id * 7) % CAR_TINTS.length]);
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
    buildStreet(city.width, city);
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
          const tintCol = bv.tint ? [bv.tint[0] * 0.8, bv.tint[1] * 0.8, bv.tint[2] * 0.8] : inn;
          if (e.cellType === 1) { spawnDebris(x, y, 0.6, Math.round(8 * look.debris), 2.5, inn, false); spawnDebris(x, y, 0.6, Math.round(7 * look.debris), 2.2, tintCol, true); spawnDust(x, y - 1, 0.2, 6, 1.3, 1.4, 0, 0.5, 0.45); }
          else { spawnShards(x, y, 0.4, Math.round(26 * look.debris)); spawnDebris(x, y, 0.6, Math.round(4 * look.debris), 2, [0.5, 0.5, 0.52], false); spawnDust(x, y - 1.2, 0.2, 3, 0.9, 1.0, 0, 0.35, 0.3); }
          if (e.cellType === 2) spawnSparks(x, y, 0.5, 20, 6);
        }
        break;
      }
      case 'cellCrack': if (bv && b) { refreshCells(bv, b); spawnDust(e.x * CELL, (e.y + 0.5) * CELL, 1, 4, 1.2, 0.8, 0, 0.3, 0.4); spawnDebris(e.x * CELL, (e.y + 0.5) * CELL, 0.5, Math.round(5 * look.debris), 1.5, bv.tint ? bv.tint.map((c) => c * 0.8) : FAMILY_INNARDS[bv.fam.id], false); } break;
      case 'neon': if (bv) bv.uniforms.uNeonLit.value = e.on ? 1 : 0; break;
      case 'neonOut': if (bv && b) { refreshCells(bv, b); bv.uniforms.uNeonLit.value = 0; spawnSparks(e.x * CELL, (e.y + 0.5) * CELL, 0.5, 40, 7); spawnShards(e.x * CELL, (e.y + 0.5) * CELL, 0.4, 20); } break;
      case 'neonShock': spawnSparks(e.x * CELL, (e.y + 0.5) * CELL, 0.8, 30, 8); flash(e.x * CELL, (e.y + 0.6) * CELL, 1.2, 6, 0x9ad8ff, 0.25); break;
      case 'collapseStart': if (bv) { bv.collapsing = true; bv.moundT = 0; bv.moundH = moundTarget(b); bv.rubble.visible = true; bv.rubble.scale.z = 0.05; thudT = 0.35; thudAmt = 0.5; } break;
      case 'collapseJolt': if (bv && b) {
        // one floor crushed out: chunks burst from the base line, dust rolls out along it, the ground thumps
        const cx = (b.x0 + b.cols / 2) * CELL, base = bv.rubble.scale.z;
        spawnDebris(cx, base + 1.5, 0.5, Math.round(Math.min(40, 6 + b.cols * 3) * look.debris), b.cols * CELL, FAMILY_INNARDS[bv.fam.id], true, bv, false);
        spawnDebris(cx, base + 1, 0.5, Math.round(Math.min(14, 2 + b.cols) * look.debris), b.cols * CELL, bv.tint ? bv.tint.map((c) => c * 0.85) : FAMILY_INNARDS[bv.fam.id], true, bv, true);
        spawnDust(cx, base + 0.5, 1.5, Math.round(6 + b.cols * 1.5), 3.5, 2.2, 0, 0.6, 0.5);
        spawnDust(b.x0 * CELL - 1, base + 0.5, 2, 4, 3, 2, -4, 0.4, 0.4); spawnDust((b.x0 + b.cols) * CELL + 1, base + 0.5, 2, 4, 3, 2, 4, 0.4, 0.4);
        thudT = 0.25; thudAmt = 0.55;
      } break;
      case 'collapseEnd': if (bv && b) { finishCollapse(bv, b); thudT = 0.45; thudAmt = 1; } break;
      case 'punchLand': if (e.hit) spawnDust(e.x * CELL, (e.y + 1.2) * CELL, 0.2, 2, 0.8, 0.45, 0, 0.5, 0.3); break;
      case 'punch': {
        // where this punch lands, for the strike layer: the cell the rules will hit
        const m = state.monsters.find((mm) => mm.id === e.who), v = m && monsterViews.get(m.id);
        if (!m || !v) break;
        const mh = state.opts.monsterH || 2.7, hand = mh * 0.55, reach = mh * 0.7;
        const rootZ = v.root.position.z;
        if (!v.punchTarget) { v.punchTarget = new THREE.Vector3(); v.punchWind = new THREE.Vector3(); }
        const t = v.punchTarget;
        t.faceCol = false;
        v.punchClock = e.st === 'street' && e.dy < 0 ? null : 0; v.impactDone = false;   // the stomp keeps its clip
        if (e.st === 'climb') {
          const bb = state.city.buildings[m.b];
          const row = Math.floor(m.y + hand) + e.dy, col = (bb ? bb.x0 : 0) + m.col + e.dx;
          t.set((col + 0.5) * CELL, (row + 0.5) * CELL, -0.15 * CELL);
          t.faceCol = e.dx === 0;   // straight up / in / down: the cell is behind the monster — the fist goes to its striking-side edge (placed in strikePose)
        } else if (e.st === 'street' && e.dy < 0) {
          t.set(m.x * CELL + (e.dx ? e.dx * 1.1 : m.facing * 0.5) * CELL, 0.25, rootZ + 0.6 * CELL);
        } else if (e.st === 'street' && m.lane === 0) {
          // the face beside you: the cell the rules hit, the fist ends on the wall
          const row = Math.floor(m.y + hand) + (e.dy > 0 ? 1 : 0);
          t.set(m.x * CELL + m.facing * 1.25 * CELL, (row + 0.5) * CELL, rootZ - 0.12 * CELL);   // out to the side, in the picture's plane: aimed into the wall it was foreshortened to nothing
        } else {
          // the road lane and the roof: straight out ahead at the fist's height (up = a head higher)
          t.set(m.x * CELL + m.facing * reach * 0.6 * CELL, (m.y + hand * 0.85 + (e.dy > 0 ? 0.7 : 0)) * CELL, rootZ);
        }
        // which fist: toward the side of the punch on a face; otherwise they take turns (a jab, a cross)
        v.punchN = (v.punchN || 0);
        if (v.bones && v.bones.Left && v.bones.Right) {
          v.bones.Left.arm.getWorldPosition(_pA); v.bones.Right.arm.getWorldPosition(_pH);
          const leftIsLow = _pA.x < _pH.x;   // which shoulder sits at the smaller x on screen
          const toward = e.st === 'climb' ? e.dx : 0;
          if (toward) v.punchSide = (toward < 0) === leftIsLow ? 'Left' : 'Right';
          else v.punchSide = v.punchSide === 'Right' ? 'Left' : 'Right';
        }
        break;
      }
      case 'hopEnd': { const v = monsterViews.get(e.who); if (v) { v.kickT = 0.14; v.kickDir = -1; } spawnDust(e.x * CELL, (e.y + 0.9) * CELL, 0.3, 1, 0.5, 0.35, 0, 0.2, 0.25); break; }
      case 'smash': break;
      case 'smashLand': {
        const v = monsterViews.get(e.who); if (v) v.slamHold = 0.32;
        const z = v ? v.root.position.z : MON_Z;
        const n = e.big ? 22 : 12;
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU; spawnDust(e.x * CELL + Math.cos(a) * 1.2, 0.3, z + Math.sin(a) * 1.2, 1, e.big ? 2.6 : 1.8, 1.3, Math.cos(a) * 6, 0.6, 0.55); }
        spawnDebris(e.x * CELL, 0.4, z, Math.round((e.big ? 14 : 6) * look.debris), 3, [0.45, 0.42, 0.38], false);
        thudT = e.big ? 0.4 : 0.25; thudAmt = e.big ? 0.8 : 0.45;
        flash(e.x * CELL, 0.6, z + 0.5, e.big ? 6 : 3.5, 0xffe0b0, 0.14);
        break;
      }
      case 'burst': { const v = monsterViews.get(e.who); spawnDust(e.x * CELL - e.dir * 0.8, 0.3, v ? v.root.position.z : MON_Z, 4, 1.4, 0.7, -e.dir * 4, 0.6, 0.45); break; }
      case 'skid': { const v = monsterViews.get(e.who); spawnDust(e.x * CELL - e.dir * 0.4, 0.3, v ? v.root.position.z : MON_Z, 6, 1.6, 0.8, -e.dir * 3, 0.8, 0.5); break; }
      case 'lane': { const v = monsterViews.get(e.who); spawnDust(e.x * CELL, 0.3, v ? v.root.position.z : MON_Z, 2, 1.2, 0.6, 0, 0.4, 0.35); break; }
      case 'rammed': { const v = monsterViews.get(e.who); const z = v ? v.root.position.z : CAR_Z; spawnSparks(e.x * CELL, 1.2, z, 12, 5); spawnDust(e.x * CELL, 0.8, z, 4, 1.4, 0.7, e.dir * 2, 0.5, 0.45); break; }
      case 'sniper': spawnShards(e.x * CELL, (e.y + 0.5) * CELL, 0.4, 10); break;
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
    bv.collapsed = true; bv.collapsing = false; bv.moundT = 0;
    bv.body.visible = false; bv.facade.visible = false; bv.parapet.visible = false;
    for (const c of bv.g.children) if (c !== bv.rubble && c !== bv.body && c !== bv.facade && c !== bv.parapet) c.visible = false;
    bv.g.position.y = 0; bv.g.position.x = b.x0 * CELL; bv.g.scale.y = 1;
    bv.rubble.visible = true; bv.rubble.position.y = 0.02; bv.rubble.scale.z = Math.max(0.05, bv.moundH);
    const cx = (b.x0 + b.cols / 2) * CELL, top = bv.moundH;
    spawnDust(cx, top * 0.5, 2, 40, 5.5, 4.5, 0, 1.2, 0.75);
    spawnDust(cx, top * 0.8, -DEPTH * 0.4, 20, 6, 5, 0, 1.0, 0.6);
    spawnDust(b.x0 * CELL - 2, 1, 3, 12, 4, 4, -5, 0.8, 0.6);
    spawnDust((b.x0 + b.cols) * CELL + 2, 1, 3, 12, 4, 4, 5, 0.8, 0.6);
    spawnDebris(cx, top + 2, 1, Math.round(Math.min(90, 30 + b.cols * 6) * look.debris), b.cols * CELL, FAMILY_INNARDS[bv.fam.id], true, bv, false);
    spawnDebris(cx, top + 1, 1, Math.round(Math.min(30, 8 + b.cols * 2) * look.debris), b.cols * CELL, bv.tint ? bv.tint.map((c) => c * 0.85) : FAMILY_INNARDS[bv.fam.id], true, bv, true);
  }

  // ---- the camera ---------------------------------------------------------------------------------------------------------------
  let camX = 0, camY = 0, camDist = 100, viewW = 26 * CELL, viewH = 60;
  function baseCamY() { return viewH * 0.49; }   // a little higher: the frame ends just past the near planters, not a second sidewalk
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
    camera.position.set(camX, camY, camDist);
    camera.rotation.set(-THREE.MathUtils.degToRad(look.pitch), 0, 0);
    camera.updateMatrixWorld();
    // never out of view (James, 2026-09-21): the head stays under the top edge and the feet above the bottom, whatever
    // the ease is doing — a climb, a roof, a jump. Two passes of a projected clamp.
    const mh = (state.opts.monsterH || 2.7) * CELL;
    for (let pass = 0; pass < 2; pass++) {
      _p.set(p.x * CELL, py + mh * 1.08, MON_Z).project(camera);
      const over = _p.y - 0.86;
      _p.set(p.x * CELL, py - 0.5, MON_Z).project(camera);
      const under = -0.9 - _p.y;
      if (over > 0) camY += over * viewH * 0.5; else if (under > 0) camY -= under * viewH * 0.5;
      camera.position.y = camY; camera.updateMatrixWorld();
    }
    let thud = 0;
    if (thudT > 0) thud = Math.sin(thudT * 22) * thudAmt * 0.35 * thudT;
    camera.position.set(camX, camY + thud, camDist);
    sun.position.set(camX + 55, 130, 95); sun.target.position.set(camX, 0, 0); sun.target.updateMatrixWorld();
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
        // THE CRUMBLE (James, 2026-09-22 — the squash "looks very rubbery"): the building stays rigid and drops one floor at a
        // time, each floor accelerating into a hard landing; the crushed floors vanish under the sidewalk and the mound
        // rises to meet the ones still standing. The core's collapseJolt marks each landing.
        const k = b.dropT;
        const fl = Math.min(b.floors - 1, Math.floor(k * b.floors)), p = Math.min(1, k * b.floors - fl);
        const gone = fl + p * p;
        v.g.scale.y = 1;
        v.g.position.y = -gone * CELL;
        v.g.position.x = b.x0 * CELL + Math.sin(clock.t * 48) * 0.18 * (0.3 + p);
        v.uniforms.uCollapse.value = Math.min(1, 0.3 + k);
        v.rubble.position.y = 0.02 + gone * CELL;   // the mound stays at ground level (the group moves under it)
        v.rubble.scale.z = Math.max(0.05, v.moundH * Math.min(1, gone / Math.max(1, b.floors - 1)));
        if (k - v.dropShown > 0.05) {
          v.dropShown = k;
          const cx = (b.x0 + b.cols / 2) * CELL;
          spawnDebris(cx, (b.floors - gone) * CELL * (0.5 + rnd() * 0.5), 1, Math.round(5 * look.debris), b.cols * CELL, FAMILY_INNARDS[v.fam.id], true, v, false);   // shed from the face on the way down
          spawnShards(cx, (b.floors - gone) * CELL * 0.4, 0.5, 8);
        }
        if (b.down) finishCollapse(v, b);
      } else if (v.collapsed && v.rubble.visible) {
        // the mound: hold, slump to a pile, sink to a low spread that stays for the day
        v.moundT += dt;
        const hold = 3 * look.moundStay, slump = 9 * look.moundStay, sink = 22 * look.moundStay;
        let h;
        if (v.moundT < hold) h = 1;
        else if (v.moundT < hold + slump) { const q = (v.moundT - hold) / slump; h = 1 - 0.72 * (1 - Math.pow(1 - q, 2)); }
        else if (v.moundT < hold + slump + sink) { const q = (v.moundT - hold - slump) / sink; h = 0.28 - 0.22 * q; }
        else h = 0.06;
        v.rubble.scale.z = Math.max(0.05, v.moundH * h);
      }
    }
    syncItems(state);
    syncMonsters(state, dt);
    syncSoldiers(state, dt);
    syncVehicles(state, dt);
    stepEffects(dt);
    stepCamera(state, dt);
    for (const c of farGroup.children) if (c.userData.cloud) { c.position.x += c.userData.drift * dt; if (c.position.x > state.city.width * CELL + 200) c.position.x = -160; }
    cityGroup.traverse((o) => { if (o.userData.beacon) o.material.color.setHex(Math.floor(clock.t) % 2 ? 0xff2020 : 0x300808); });
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
