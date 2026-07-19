// Sanna / Mandala Shop — walkable gallery
// Room: assets/room.glb (Blender-built, art layer stripped).
// Art layer: built at runtime from assets/layout.js (globalThis.MANDALA_SHOP_LAYOUT)
// so curator mode can eventually rewrite it. Blender coords are Z-up meters;
// three.js is Y-up: (x, y, z)_three = (x, z, -y)_blender.
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../lib/three/utils/BufferGeometryUtils.js';

const LAYOUT = globalThis.MANDALA_SHOP_LAYOUT;
const poster = document.getElementById('poster');
const posterNote = document.getElementById('poster-note');
const stage = document.getElementById('stage');

function fail(msg) {
  if (posterNote) posterNote.textContent = msg;
  console.warn('[sanna]', msg);
}

if (!LAYOUT) {
  fail('The shop layout failed to load — the pictures above still drift.');
  throw new Error('layout missing');
}

// ------------------------------------------------------------------ helpers
const b2t = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
const rad = THREE.MathUtils.degToRad;
const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Curator mode: entered only via the admin panel's curate pill (?curate=1).
// While active it owns clicks/selection; walking and drag-look stay live, but
// it can lock arrows (nudge) and wheel (resize) away from the walk controls.
const CURATE = new URLSearchParams(location.search).has('curate');
let curatorActive = false;
const inputLocks = { arrows: false, wheel: false };

// ------------------------------------------------------------------ renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: stage, antialias: true, powerPreference: 'high-performance',
  });
} catch (e) {
  fail('WebGL is unavailable here — the pictures above still drift.');
  throw e;
}
// ?px=1 (or 0.75, 1.5 …) overrides the render resolution for perf testing
const pxOverride = parseFloat(new URLSearchParams(location.search).get('px'));
// Dynamic resolution (2026-07-18, James: "the art cannot degrade ever"):
// full sharpness whenever the camera is still or focused on a piece — exactly
// when you're looking at art — and a lighter pixel load only while moving,
// where motion hides the softness. ?px=N pins a fixed ratio and disables this.
const RES_HIGH = Math.min(devicePixelRatio, 1.75);
const RES_LOW = Math.min(devicePixelRatio, 1.35);
let resCurrent = pxOverride > 0 ? pxOverride : RES_HIGH;
renderer.setPixelRatio(resCurrent);
function applyRes(target) {
  if (pxOverride > 0 || resCurrent === target) return;
  resCurrent = target;
  renderer.setPixelRatio(target);
  renderer.setSize(innerWidth, innerHeight);
}
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17100a);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 80);

// ------------------------------------------------------------------ lighting
// 0.55 pre-spotlight-experiment; 0.52 once the art spots became the lead light
scene.add(new THREE.HemisphereLight(0xffe2bb, 0x55432f, 0.52));

const sun = new THREE.DirectionalLight(0xffb877, 0.8);
sun.position.set(14, 5, -2);
sun.target.position.set(0, 1.2, 0);
scene.add(sun, sun.target);

// lantern glow points (positions match the Blender lanterns)
// Gallery-lighting experiment 2026-07-17: floor lanterns retired for art spots
// (see the block after EDGES). Pre-experiment LANTERNS list lives in the
// snapshot under tmp/mandala-shop/snapshots/2026-07-17-pre-spotlights/.
const LANTERNS = [
  [0, 5.57, 0, 5.4, 9],       // center ridge lantern (−40% again 07-18, was 9)
  [3.6, 1.22, -2.2, 9, 5],    // counter lantern
];
for (const [x, y, z, i, d] of LANTERNS) {
  const pt = new THREE.PointLight(0xffb066, i, d, 2);
  pt.position.set(x, y, z);
  scene.add(pt);
}

// ------------------------------------------- procedural surface textures
// UVs on these meshes are world-space planar (1 uv unit = 1m, done in Blender).
function canvasTex(sizePx, worldMeters, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = sizePx;
  const g = c.getContext('2d');
  draw(g, sizePx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.setScalar(1 / worldMeters);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function jitter(hex, amt) {
  const c = new THREE.Color(hex);
  const f = 1 + (Math.random() * 2 - 1) * amt;
  return `rgb(${Math.round(c.r * 255 * f)},${Math.round(c.g * 255 * f)},${Math.round(c.b * 255 * f)})`;
}

function gridTiles(g, px, n, colors, mortar, gapFrac) {
  g.fillStyle = mortar;
  g.fillRect(0, 0, px, px);
  const s = px / n, gap = Math.max(1, px * gapFrac);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = jitter(colors[Math.floor(Math.random() * colors.length)], 0.07);
      g.fillRect(i * s + gap / 2, j * s + gap / 2, s - gap, s - gap);
    }
}

// Zellige wainscot: 8-point star-and-cross tilework, mostly sand/cream with
// teal and cobalt accents echoing the trim (James 2026-07-17).
const texSandstone = canvasTex(512, 0.64, (g, px) => {
  const n = 4, s = px / n;
  g.fillStyle = '#6d5843';                       // grout, slightly dirty
  g.fillRect(0, 0, px, px);
  const glazes = ['#d9c49a', '#cdb488', '#d3bd92', '#2f6b66', '#d9c49a',
    '#cdb488', '#28497a', '#d3bd92', '#b0623a'];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s, gap = px * 0.008;
      const base = glazes[(i * 3 + j * 5 + i * j) % glazes.length];
      g.fillStyle = jitter(base, 0.05);
      g.fillRect(x + gap, y + gap, s - 2 * gap, s - 2 * gap);
      // 8-point star: two squares at 45°, contrasting glaze
      const cx = x + s / 2, cy = y + s / 2, r = s * 0.3;
      const dark = base === '#2f6b66' || base === '#28497a' || base === '#b0623a';
      g.fillStyle = jitter(dark ? '#e2d4ae' : '#2f6b66', 0.06);
      for (const rot of [0, Math.PI / 4]) {
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.fillRect(-r, -r, 2 * r, 2 * r);
        g.restore();
      }
      // center pip
      g.fillStyle = jitter(dark ? '#28497a' : '#b0623a', 0.08);
      g.beginPath();
      g.arc(cx, cy, s * 0.11, 0, Math.PI * 2);
      g.fill();
      // glaze wear: a few chips and dulled corners
      g.fillStyle = 'rgba(80,62,44,0.18)';
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.arc(x + Math.random() * s, y + Math.random() * s, s * (0.02 + Math.random() * 0.04), 0, Math.PI * 2);
        g.fill();
      }
    }
  }
});

// Floor: worn tiles — grime pass reused over the procedural fallback AND the
// Meshy clay tiles once they load.
function floorGrime(g, px) {
  for (let k = 0; k < 26; k++) {                 // dust freckles + small stains
    g.fillStyle = `rgba(60,46,32,${0.05 + Math.random() * 0.1})`;
    g.beginPath();
    g.arc(Math.random() * px, Math.random() * px,
      px * (0.006 + Math.random() * 0.03), 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 6; k++) {                  // scuff streaks
    g.strokeStyle = `rgba(52,40,28,${0.08 + Math.random() * 0.08})`;
    g.lineWidth = 1 + Math.random() * 2.5;
    const x = Math.random() * px, y = Math.random() * px, a = Math.random() * Math.PI;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * px * 0.22, y + Math.sin(a) * px * 0.22);
    g.stroke();
  }
  g.fillStyle = 'rgba(120,96,70,0.1)';           // one pale worn patch
  g.beginPath();
  g.ellipse(px * 0.3, px * 0.62, px * 0.2, px * 0.12, 0.6, 0, Math.PI * 2);
  g.fill();
}

// 3m repeat: the Meshy image holds a 10×10 tile grid → 30cm clay tiles
const texFloor = canvasTex(512, 3.0, (g, px) => {
  gridTiles(g, px, 6, ['#9e856b', '#917861'], '#6b5745', 0.006);
  floorGrime(g, px);
});

// Meshy terracotta clay tiles (assets/textures/clay-tiles.png, 2026-07-18)
// replace the flat procedural grid when they load; same grime back on top.
{
  const img = new Image();
  img.onload = () => {
    const c = texFloor.image;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    floorGrime(g, c.width);
    texFloor.needsUpdate = true;
  };
  img.src = 'assets/textures/clay-tiles.png';
}

// Plaster grime pass — reused over the canvas fallback AND the Meshy sandstone
// base once it loads. v spans z 0..4m (world UVs).
function plasterGrime(g, px) {
  const yOf = (zMeters) => px * (1 - zMeters / 4);   // v=1 at floor after flipY
  for (let k = 0; k < 120; k++) {                // scuff cloud around 0.7–1.9m
    const z = 0.7 + Math.random() * 1.2;
    g.fillStyle = `rgba(96,82,64,${0.03 + Math.random() * 0.05})`;
    g.beginPath();
    g.ellipse(Math.random() * px, yOf(z) + (Math.random() - 0.5) * 20,
      px * (0.01 + Math.random() * 0.05), px * (0.004 + Math.random() * 0.012),
      Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 14; k++) {                 // faint streaks from the eave
    const x = Math.random() * px;
    const grad = g.createLinearGradient(0, yOf(4), 0, yOf(2.4 + Math.random()));
    grad.addColorStop(0, 'rgba(105,92,74,0.12)');
    grad.addColorStop(1, 'rgba(105,92,74,0)');
    g.strokeStyle = grad;
    g.lineWidth = 2 + Math.random() * 5;
    g.beginPath();
    g.moveTo(x, yOf(4));
    g.lineTo(x + (Math.random() - 0.5) * 30, yOf(2.2));
    g.stroke();
  }
  const rise = g.createLinearGradient(0, yOf(0.62), 0, yOf(1.5)); // damp over wainscot
  rise.addColorStop(0, 'rgba(88,74,58,0.16)');
  rise.addColorStop(1, 'rgba(88,74,58,0)');
  g.fillStyle = rise;
  g.fillRect(0, yOf(1.5), px, yOf(0.62) - yOf(1.5));
}

const texPlaster = canvasTex(1024, 4.0, (g, px) => {
  g.fillStyle = '#c9c0b6';
  g.fillRect(0, 0, px, px);
  for (let k = 0; k < 900; k++) {                // fine mottling (fallback base)
    g.fillStyle = `rgba(${140 + Math.random() * 60},${130 + Math.random() * 55},${115 + Math.random() * 50},0.05)`;
    g.beginPath();
    g.arc(Math.random() * px, Math.random() * px,
      px * (0.004 + Math.random() * 0.02), 0, Math.PI * 2);
    g.fill();
  }
  plasterGrime(g, px);
});

// Meshy sandstone base (assets/textures/sandstone.png, 2026-07-17) replaces the
// flat fallback when it loads; the same grime pass goes back on top.
{
  const img = new Image();
  img.onload = () => {
    const c = texPlaster.image;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    plasterGrime(g, c.width);
    texPlaster.needsUpdate = true;
  };
  img.src = 'assets/textures/sandstone.png';
}

// Pillow mandalas: one per pillow material, each its own petal count + palette.
function pillowTex(bg, petal, accent, count) {
  return canvasTex(256, 1, (g, px) => {
    const m = px / 2;
    g.fillStyle = bg;
    g.fillRect(0, 0, px, px);
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.beginPath(); g.arc(m, m, px * 0.42, 0, Math.PI * 2); g.stroke();
    g.fillStyle = petal;
    for (let k = 0; k < count; k++) {
      const a = k * 2 * Math.PI / count;
      const ax = m + Math.cos(a) * px * 0.1, ay = m + Math.sin(a) * px * 0.1;
      const tx = m + Math.cos(a) * px * 0.38, ty = m + Math.sin(a) * px * 0.38;
      const sx = -Math.sin(a) * px * 0.07, sy = Math.cos(a) * px * 0.07;
      const mx = (ax + tx) / 2, my = (ay + ty) / 2;
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx + sx, my + sy, tx, ty);
      g.quadraticCurveTo(mx - sx, my - sy, ax, ay);
      g.fill();
    }
    g.fillStyle = accent;
    g.beginPath(); g.arc(m, m, px * 0.07, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < count; k++) {
      const a = (k + 0.5) * 2 * Math.PI / count;
      g.beginPath();
      g.arc(m + Math.cos(a) * px * 0.3, m + Math.sin(a) * px * 0.3, px * 0.018, 0, Math.PI * 2);
      g.fill();
    }
  });
}
const texPillows = {
  pillow_blue: pillowTex('#45596f', '#d9c49a', '#c9a24b', 8),
  pillow_sage: pillowTex('#849070', '#5e2a26', '#e2d4ae', 10),
  pillow_rose: pillowTex('#9c5c54', '#e2d4ae', '#2f5450', 12),
  pillow_plum: pillowTex('#664561', '#c9a24b', '#d9c49a', 6),
};

// Rug: a woven mandala — petal rings, lotus border, muted wool palette.
// 6.0m canvas for a 5.4m rug: margin keeps the border ring off the wrap seam
// (it was bleeding in from the left as a phantom tile — James 2026-07-18).
const texRug = canvasTex(1024, 6.0, (g, px) => {
  const m = px / 2, mPerPx = 6.0 / px;
  const R = (meters) => meters / mPerPx;
  g.fillStyle = '#7a3833';
  g.fillRect(0, 0, px, px);
  const ring = (r, w, color) => {
    g.strokeStyle = color;
    g.lineWidth = R(w);
    g.beginPath();
    g.arc(m, m, R(r), 0, Math.PI * 2);
    g.stroke();
  };
  const petals = (count, rIn, rOut, wid, color, phase = 0) => {
    g.fillStyle = color;
    for (let k = 0; k < count; k++) {
      const a = (k + phase) * 2 * Math.PI / count;
      const ax = m + Math.cos(a) * R(rIn), ay = m + Math.sin(a) * R(rIn);
      const tx = m + Math.cos(a) * R(rOut), ty = m + Math.sin(a) * R(rOut);
      const sx = -Math.sin(a) * R(wid), sy = Math.cos(a) * R(wid);
      const mx = (ax + tx) / 2, my = (ay + ty) / 2;
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx + sx, my + sy, tx, ty);
      g.quadraticCurveTo(mx - sx, my - sy, ax, ay);
      g.fill();
    }
  };
  // center medallion
  g.fillStyle = '#5e2a26';
  g.beginPath(); g.arc(m, m, R(0.34), 0, Math.PI * 2); g.fill();
  petals(8, 0.08, 0.32, 0.09, jitter('#c9a24b', 0.05));
  g.fillStyle = '#2f5450';
  g.beginPath(); g.arc(m, m, R(0.09), 0, Math.PI * 2); g.fill();
  // petal rings outward
  ring(0.42, 0.045, '#9e564d');
  petals(16, 0.48, 0.95, 0.1, jitter('#9e564d', 0.04));
  petals(16, 0.48, 0.88, 0.055, jitter('#d9c49a', 0.05));
  ring(1.02, 0.035, '#c9a24b');
  petals(24, 1.08, 1.52, 0.09, jitter('#2f5450', 0.05), 0.5);
  petals(24, 1.08, 1.46, 0.05, jitter('#9e564d', 0.05), 0.5);
  ring(1.6, 0.045, '#d9c49a');
  petals(32, 1.66, 2.06, 0.08, jitter('#c9a24b', 0.06));
  petals(32, 1.66, 2.0, 0.04, jitter('#5e2a26', 0.05));
  // lotus border band
  ring(2.24, 0.16, '#5e2a26');
  petals(40, 2.14, 2.34, 0.05, jitter('#d9c49a', 0.06), 0.5);
  ring(2.44, 0.05, '#c9a24b');
  ring(2.6, 0.13, '#5e2a26');
  // wear: threadbare patches and general fade
  for (let k = 0; k < 9; k++) {
    const a = Math.random() * Math.PI * 2, r = R(0.5 + Math.random() * 1.9);
    g.fillStyle = `rgba(186,158,122,${0.06 + Math.random() * 0.08})`;
    g.beginPath();
    g.ellipse(m + Math.cos(a) * r, m + Math.sin(a) * r,
      R(0.12 + Math.random() * 0.22), R(0.07 + Math.random() * 0.12),
      Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
});
// glTF export flips V (v → 1−v), which slid the pattern 1m sideways — the
// 2026-07-18 off-center rug. V offset of 1/3 = 0.5 − repeat re-centers it.
texRug.offset.set(0.5, 1 / 3);
texRug.wrapS = texRug.wrapT = THREE.ClampToEdgeWrapping;   // one mandala, no tiling

const texDoor = canvasTex(512, 1.0, (g, px) => {
  g.fillStyle = '#43280f';
  g.fillRect(0, 0, px, px);
  const plank = px * 0.17;
  for (let x = 0; x < px + plank; x += plank) {
    g.fillStyle = jitter('#4a2c14', 0.12);
    g.fillRect(x + 2, 0, plank - 3, px);
    g.strokeStyle = '#241407';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, px); g.stroke();
    g.strokeStyle = 'rgba(38,20,8,0.5)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) {
      const gx = x + 4 + Math.random() * (plank - 8);
      g.beginPath();
      g.moveTo(gx, 0);
      g.bezierCurveTo(gx + 6, px * 0.33, gx - 6, px * 0.66, gx + 3, px);
      g.stroke();
    }
  }
});

// Meshy file textures (2026-07-17): canvas weave for the tent, desert wood for
// benches + counter body, sandstone reused dark on the counter top.
function fileTex(path, worldMeters) {
  const t = new THREE.TextureLoader().load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.setScalar(1 / worldMeters);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
// Tent canvas: procedural weave base — a missing image file samples BLACK,
// which is exactly how the whole ceiling went near-black for a while. The
// Meshy canvas photo lays over it lightly once it loads.
// 1.1m tile (was 2.4): threads read ~1cm from the floor instead of thick rope
// (James 2026-07-17 — "individual threads are too large"), and a brighter base.
const texTerracotta = fileTex('assets/textures/terracotta.png', 0.9);

const texCanvasCeil = canvasTex(512, 0.8, (g, px) => {
  const n = 96, s = px / n;
  g.fillStyle = '#ece2cc';
  g.fillRect(0, 0, px, px);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const warp = (i + j) % 2 === 0;
      const l = 224 + ((i * 7 + j * 13) % 5) * 4 + (warp ? 5 : -5);
      g.fillStyle = `rgb(${l},${l - 10},${l - 28})`;
      if (warp) g.fillRect(i * s + s * 0.06, j * s, s * 0.88, s);
      else g.fillRect(i * s, j * s + s * 0.06, s, s * 0.88);
    }
  }
});
{
  const img = new Image();
  img.onload = () => {
    const c = texCanvasCeil.image;
    const g = c.getContext('2d');
    g.globalAlpha = 0.45;                    // lightly — the photo carries the dark
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalAlpha = 1;
    texCanvasCeil.needsUpdate = true;
  };
  img.src = 'assets/textures/canvas.png';
}
const texWoodDesert = fileTex('assets/textures/wood-desert.png', 1.7);
const texStoneTop = fileTex('assets/textures/sandstone.png', 1.3);

// Street ground outside the door — packed sand with speckle and drift, so the
// band between threshold and the souk painting reads as street, not void.
const texSand = canvasTex(512, 3.0, (g, px) => {
  g.fillStyle = '#b49a72';
  g.fillRect(0, 0, px, px);
  for (let k = 0; k < 24; k++) {                 // broad tonal patches first
    const l = 140 + Math.random() * 70;
    g.fillStyle = `rgba(${l},${l - 24},${l - 58},0.14)`;
    g.beginPath();
    g.ellipse(Math.random() * px, Math.random() * px,
      px * (0.08 + Math.random() * 0.18), px * (0.05 + Math.random() * 0.1),
      Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 1400; k++) {
    const l = 135 + Math.random() * 85;
    g.fillStyle = `rgba(${l},${l - 22},${l - 55},${0.14 + Math.random() * 0.16})`;
    g.beginPath();
    g.arc(Math.random() * px, Math.random() * px,
      px * (0.002 + Math.random() * 0.014), 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 8; k++) {                  // soft wind-drift streaks
    g.strokeStyle = `rgba(120,98,66,${0.05 + Math.random() * 0.06})`;
    g.lineWidth = 6 + Math.random() * 16;
    const x = Math.random() * px, y = Math.random() * px;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + 60, y + 20, x + 140, y - 20, x + 220, y + 10);
    g.stroke();
  }
});

const MATERIAL_MAPS = {
  tile_sandstone: texSandstone,
  floor_tile: texFloor,
  rug_rose: texRug,
  wood_door: texDoor,
  plaster: texPlaster,     // needs wall UVs — build.py UV_TARGETS includes Wall_
  ...texPillows,           // per-pillow mandalas (pillow_* mats, UV'd in build.py)
  tent_fabric: texCanvasCeil,
  wood_desert: texWoodDesert,
  countertop_stone: texStoneTop,
  sand: texSand,
  terracotta: texTerracotta,   // urns + plant pots (UV'd in build.py 2026-07-18)
};
// Tints multiply the map: "apply it lightly" — the tent keeps its warm fabric
// tone, the counter top keeps its dark near-black brown over the stone grain.
const MATERIAL_TINTS = { tent_fabric: 0xfaf5ea, countertop_stone: 0x4a3424 };
const MATERIAL_COLORS = {};

// ------------------------------------------------------------------ art layer
const artGroup = new THREE.Group();
scene.add(artGroup);
const texLoader = new THREE.TextureLoader();
const artCache = new Map();
const clickables = [];   // art planes

// Hover/click ray targets — rebuilt only when membership changes, not per frame.
const hoverTargets = [];
let hoverDirty = true;
function rayTargets() {
  if (hoverDirty) {
    hoverDirty = false;
    hoverTargets.length = 0;
    hoverTargets.push(...clickables, ...doorMeshes);
    if (bowlMesh) hoverTargets.push(bowlMesh);
  }
  return hoverTargets;
}
let shimmerMat = null;   // the drifting blank

function artTexture(file) {
  if (!artCache.has(file)) {
    const t = texLoader.load(LAYOUT.artDir + file, undefined, undefined,
      () => console.warn('[sanna] art failed to load:', file));
    t.colorSpace = THREE.SRGBColorSpace;
    // art gets max anisotropy — canvases stay crisp at oblique viewing angles
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    artCache.set(file, t);
  }
  return artCache.get(file);
}

const CREAM = new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.9 });
const DEPTH = 0.05;

// --- per-painting gallery fixtures (2026-07-17 lighting experiment) ---
// Every wall/cord slot grows its own thin brass arm from just above the teal
// molding with a mini halogen head aimed at it, plus an additive warm pool on
// the wall behind. Built per slot so they track James's curated layout.
const MOLDING_Y = 4.05, FIX_ARM_OUT = 0.72;
const FIX_BRASS = new THREE.MeshStandardMaterial({
  color: 0x9a7434, metalness: 0.85, roughness: 0.35,
});
const FIX_BULB = new THREE.MeshBasicMaterial({ color: 0xffe9c2 });
// Two-part wash, positioned in wall space the painting can never cover:
// a hotspot in the fixed gap above the frame, and a spill below the bottom edge.
// (One scaled texture kept hiding its bright core behind large canvases.)
function glowMaterial(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  draw(c.getContext('2d'));
  return new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(c), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
}
const HOT_MAT = glowMaterial((g2) => {
  const gr = g2.createRadialGradient(128, 150, 8, 128, 150, 130);
  gr.addColorStop(0, 'rgba(255,224,170,0.85)');
  gr.addColorStop(0.45, 'rgba(255,202,142,0.38)');
  gr.addColorStop(1, 'rgba(255,188,128,0)');
  g2.fillStyle = gr;
  g2.fillRect(0, 0, 256, 256);
});

function fixtureOwner(slot) {
  // One fixture per column: when pieces stack vertically (same wall, laterally
  // overlapping), only the TOPMOST hangs a spot — the door-left pair had two
  // arms in one place (James 2026-07-17).
  const topEdge = slot.pos[2] + slot.h / 2;
  for (const other of LAYOUT.slots) {
    if (other === slot) continue;
    if (other.kind !== 'wall' && other.kind !== 'cord') continue;
    const yawGap = Math.abs((((other.yaw - slot.yaw) % 360) + 540) % 360 - 180);
    if (yawGap > 4) continue;
    const lateral = Math.hypot(other.pos[0] - slot.pos[0], other.pos[1] - slot.pos[1]);
    if (lateral > (other.w + slot.w) / 2 * 0.8) continue;
    if (other.pos[2] + other.h / 2 > topEdge + 0.01) return false;
  }
  return true;
}

function addFixture(g, slot) {
  if (!fixtureOwner(slot)) return;
  // Local space: painting center = origin, +z into the room, molding above.
  const topY = MOLDING_Y - slot.pos[2];
  if (topY < slot.h / 2 + 0.25) return;   // painting nearly reaches the molding
  const base = new THREE.Vector3(0, topY, -0.05);
  const tip = new THREE.Vector3(0, topY + 0.05, FIX_ARM_OUT);
  const dir = tip.clone().sub(base);
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, dir.length(), 6), FIX_BRASS);
  arm.position.copy(base).addScaledVector(dir, 0.5);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const aim = new THREE.Vector3(0, 0, 0.02).sub(tip).normalize();
  // cone's wide mouth is its -y end: point that at the painting
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.052, 0.12, 12), FIX_BRASS);
  head.position.copy(tip);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), FIX_BULB);
  bulb.position.copy(tip).addScaledVector(aim, 0.062);
  bulb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim);
  // Hotspot pinned in the gap above the frame, on the wall face (z -0.06 →
  // quad at -0.04) — a fixed offset no canvas size can swallow. The below-frame
  // spill quad is gone: James read it as an unnatural rectangle (2026-07-17).
  const hot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), HOT_MAT);
  hot.scale.set(Math.min(slot.w * 1.2 + 0.3, 2.3), 0.8, 1);
  hot.position.set(0, slot.h / 2 + 0.26, -0.04);
  g.add(arm, head, bulb, hot);
}
const SHIMMER_ID = 'blank_n_hi';        // the drifting blank — protected in curator
const slotObjects = new Map();          // slot id -> { groups: [Group...], artMesh }

function buildSlot(slot) {
  const kit = LAYOUT.kit[slot.style] || LAYOUT.kit.walnut;
  const g = new THREE.Group();
  const { w, h } = slot;
  const bw = Math.max(0.045, w * 0.055) * (kit.borderScale ?? 1);

  const frameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(kit.color), metalness: kit.metal, roughness: kit.rough,
  });
  // four frame bars merged into ONE mesh (perf pass 2026-07-18: −3 draw calls
  // per slot, ~66 across the hang)
  const barGeos = [];
  const bar = (bx, by, bz, sx, sy) => {
    const geo = new THREE.BoxGeometry(sx, sy, DEPTH);
    geo.translate(bx, by, bz);
    barGeos.push(geo);
  };
  bar(0, h / 2 + bw / 2, 0, w + 2 * bw, bw);
  bar(0, -h / 2 - bw / 2, 0, w + 2 * bw, bw);
  bar(-w / 2 - bw / 2, 0, 0, bw, h);
  bar(w / 2 + bw / 2, 0, 0, bw, h);
  g.add(new THREE.Mesh(mergeGeometries(barGeos), frameMat));
  for (const geo of barGeos) geo.dispose();

  let mat = CREAM;
  if (slot.art) {
    let tex = artTexture(slot.art);
    if (slot.slice || slot.flip) {
      const [index, count] = slot.slice ?? [0, 1];
      tex = tex.clone();
      if (slot.flip) {                 // horizontal mirror, in place
        tex.repeat.set(-1 / count, 1);
        tex.offset.set((index + 1) / count, 0);
      } else {
        tex.repeat.set(1 / count, 1);
        tex.offset.set(index / count, 0);
      }
    }
    // emissive self-glow = the painting "catching" its halogen spot; real wash
    // spots only cover wall centers, so this is what lights the outer pieces
    mat = new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, roughness: 0.7,
      emissive: 0xfff1dd, emissiveIntensity: 0.34, emissiveMap: tex,
    });
  } else if (slot.id === SHIMMER_ID) {
    mat = new THREE.MeshStandardMaterial({
      color: 0xe6dcc4, roughness: 0.85,
      emissive: 0xf5e8c8, emissiveIntensity: 0.15,
    });
    shimmerMat = mat;
  }
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  art.position.z = 0.021;
  art.userData.slot = slot;
  g.add(art);
  clickables.push(art);
  hoverDirty = true;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + bw, h + bw), CREAM);
  back.position.z = -0.004;
  g.add(back);

  if (slot.kind === 'wall' || slot.kind === 'cord') addFixture(g, slot);

  g.position.copy(b2t(slot.pos));
  g.rotation.y = rad(slot.yaw);
  const record = { groups: [g], artMesh: art };

  if (slot.kind === 'cord') {
    g.rotateX(0.07);
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x736149, roughness: 0.9 });
    const railY = LAYOUT.railZ ?? 3.0;
    const len = railY - (slot.pos[2] + h / 2);
    if (len > 0.05) {
      for (const s of [-1, 1]) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, len, 6), cordMat);
        cord.position.set(s * (w / 2 + 0.02), h / 2 + len / 2, -0.01);
        g.add(cord);
      }
    }
  } else if (slot.kind === 'lean') {
    g.rotateX(-0.21);
  } else if (slot.kind === 'easel') {
    g.rotateX(-0.21);
    const root = new THREE.Group();
    root.position.set(g.position.x, 0, g.position.z);
    root.rotation.y = g.rotation.y;
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4523, roughness: 0.6 });
    const leg = (x, z, rx, rz) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.8, 8), wood);
      m.position.set(x, 0.88, z);
      m.rotation.set(rx, 0, rz);
      root.add(m);
    };
    leg(-0.32, 0.02, 0, 0.12);
    leg(0.32, 0.02, 0, -0.12);
    leg(0, 0.86, -0.3, -0.35, 0);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.07), wood);
    ledge.position.set(0, slot.pos[2] - h / 2 - 0.02, 0.1);
    root.add(ledge);
    artGroup.add(root);
    record.groups.push(root);
    // re-express the frame relative to the floor point so it rides the easel
    g.position.y = slot.pos[2];
    g.position.x = root.position.x;
    g.position.z = root.position.z;
  }
  artGroup.add(g);
  slotObjects.set(slot.id, record);
}

for (const slot of LAYOUT.slots) buildSlot(slot);

// --------------------------------------------- slot registry (curator hooks)
function disposeSlotObject(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    const m = o.material;
    if (!m || m === CREAM) return;               // CREAM is shared — never dispose
    if (m.map && ![...artCache.values()].includes(m.map)) m.map.dispose(); // slice clones
    m.dispose();
  });
}

function removeSlot(id) {
  const record = slotObjects.get(id);
  if (!record) return;
  for (const grp of record.groups) {
    artGroup.remove(grp);
    disposeSlotObject(grp);
  }
  const ci = clickables.indexOf(record.artMesh);
  if (ci !== -1) clickables.splice(ci, 1);
  hoverDirty = true;
  if (id === SHIMMER_ID) shimmerMat = null;
  const si = LAYOUT.slots.findIndex((s) => s.id === id);
  if (si !== -1) LAYOUT.slots.splice(si, 1);
  slotObjects.delete(id);
}

function addSlot(slot) {
  if (slotObjects.has(slot.id)) removeSlot(slot.id);
  if (!LAYOUT.slots.includes(slot)) LAYOUT.slots.push(slot);
  buildSlot(slot);
}

function updateSlot(slot) {
  const index = LAYOUT.slots.findIndex((s) => s.id === slot.id);
  removeSlot(slot.id);
  if (index !== -1) LAYOUT.slots.splice(index, 0, slot);
  else LAYOUT.slots.push(slot);
  buildSlot(slot);
}

function resetSlots(slots) {
  for (const id of [...slotObjects.keys()]) removeSlot(id);
  LAYOUT.slots.length = 0;
  for (const slot of slots) {
    LAYOUT.slots.push(slot);
    buildSlot(slot);
  }
}

// ------------------------------------------------------------------ room
const loader = new GLTFLoader();
let doorMeshes = new Set(), bowlMesh = null;

loader.load('assets/room.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material;
    if (!mat) return;
    if (mat.name in MATERIAL_MAPS) {
      mat.map = MATERIAL_MAPS[mat.name];
      mat.color.set(MATERIAL_TINTS[mat.name] ?? 0xffffff);
      mat.needsUpdate = true;
    }
    if (mat.name in MATERIAL_COLORS) mat.color.set(MATERIAL_COLORS[mat.name]);
    if (mat.name === 'glass_amber') {
      mat.emissiveIntensity = Math.min(mat.emissiveIntensity ?? 1, 2.6);
    }
    if (mat.name === 'wood_desert' || mat.name === 'countertop_stone' || mat.name === 'mosaic') {
      // boolean-scoop faces render inverted single-sided — you could see the
      // wainscot THROUGH the counter (James: "ghostly tiling in the cutout")
      mat.side = THREE.DoubleSide;
    }
    if (o.name === 'SignSanna') {
      // lit sign: letters glow softly, no light cast (James 2026-07-17)
      o.material = mat.clone();
      o.material.emissive = new THREE.Color(0xd9a45b);
      o.material.emissiveIntensity = 0.55;
    }
    if (o.name === 'DoorPanel' || o.name === 'DoorTop' || o.name === 'DoorRing') {
      // procedural swung-open leaf retired 2026-07-18 — the Meshy shop door
      // (assets/door/shop-door.glb) fills the arch closed instead
      o.visible = false;
      return;
    }
    if (o.name.startsWith('Door')) doorMeshes.add(o);
    if (o.name === 'UrnFloor') bowlMesh = o;   // drift exit moved bowl → floor urn 2026-07-18
    if (o.name === 'Backdrop' || o.name === 'OutsideGround') {
      // there is no outside (James 2026-07-18): the Meshy door seals the arch,
      // so the GLB's sand slab + dusk backdrop retire with the panorama
      o.visible = false;
    }
  });
  scene.add(gltf.scene);
  hoverDirty = true;   // doors + bowl just joined the ray targets
  posterFadeOut();
  addShopDoor();
}, undefined, () => {
  fail('The shop is closed just now (room failed to load) — the pictures above still drift.');
});

// Meshy shop door (James's library, 2026-07-18): closed leaf filling the arch,
// replacing the procedural swung-open DoorPanel/DoorTop. Model ships 1.19m wide
// x 2.80m tall with a bottom-center origin; the opening is 1.36m, so width
// stretches 14% — mild, and the arch surround covers the spring-line seam.
// Clicking it drifts, same as the old leaf.
function addShopDoor() {
  loader.load('assets/door/shop-door.glb', (gltf) => {
    const door = gltf.scene;
    door.rotation.y = Math.PI / 2;       // width across the arch (world z)
    door.scale.set(1.36 / 1.19, 1, 1);   // local x is width; y height stays true
    door.position.set(6.03, 0, 0);
    door.traverse((o) => { if (o.isMesh) doorMeshes.add(o); });
    scene.add(door);
    // Opaque backer sealing the arch behind the leaf: the Meshy door has
    // slivers of transparency around its edge and inside the filigree cutouts,
    // and there is no outside anymore (souk panorama retired 2026-07-18 — if
    // an outside ever returns it gets built properly). Near-black brown: the
    // honey-sampled first try still read as light leaking through the door
    // (James 2026-07-18); dark shadow sells "solid wood, nothing behind it".
    const backer = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x2b1d10, side: THREE.DoubleSide }));
    backer.position.set(6.24, 1.6, 0);
    backer.rotation.y = -Math.PI / 2;
    scene.add(backer);
    hoverDirty = true;
  }, undefined, () => console.warn('[sanna] shop door failed to load'));
}

// ---------------------------------------------------------------- plants
// Meshy-generated (2026-07-17, ~30 credits): potted palm + brass-bowl agave,
// normalized to real heights, instanced at the retired lantern spots and
// corners. Files in assets/plants/; positions mirrored in CIRCLES above.
const MESHY_SET = [
  // plants — second palm pulled off the SW canted wall (clipped, 2026-07-17)
  { file: 'assets/plants/palm.glb', height: 1.7, spots: [[-4.85, -3.35, 35], [-3.95, 3.55, 205]] },
  { file: 'assets/plants/agave.glb', height: 0.55, spots: [[5.35, -1.9, -80], [0.5, -4.1, 140]] },
  // counter props (Meshy 2026-07-18, replacing the "unrealistic" procedurals);
  // they stand on the counter top, y 1.06
  { file: 'assets/props/register.glb', height: 0.32, y: 1.06, spots: [[3.34, -1.84, 135]] },
  // tea service on the counter's RIGHT lobe (sides swapped 2026-07-18 — first
  // pass had them mirrored from what James meant); six glasses in a close
  // haphazard huddle by the carafe
  { file: 'assets/props/carafe.glb', height: 0.32, y: 1.06, spots: [[3.87, -1.46, 135]] },
  { file: 'assets/props/glass.glb', height: 0.075, y: 1.06,
    spots: [[4.07, -1.46, 0], [4.19, -1.41, 70], [4.19, -1.52, 160],
            [4.15, -1.31, 220], [4.08, -1.56, 40], [4.07, -1.33, 300]] },
  // incense out toward the front edge, clear of the register; SMOKE_TIP tracks
  { file: 'assets/props/incense.glb', height: 0.16, y: 1.06, spots: [[2.9, -1.99, -30]] },
  // desk plant on the LEFT lobe, out near the outer edge (WallPlant from
  // James's Meshy library 2026-07-18, replacing the small agave)
  { file: 'assets/plants/WallPlant.glb', height: 0.35, y: 1.06, spots: [[2.87, -2.53, 40]] },
];
for (const spec of MESHY_SET) {
  loader.load(spec.file, (gltf) => {
    const src = gltf.scene;
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = spec.height / size.y;
    for (const [x, z, yawDeg] of spec.spots) {
      const wrap = new THREE.Group();
      const inst = src.clone(true);
      inst.position.set(-center.x, -box.min.y, -center.z);   // base centered on origin
      wrap.add(inst);
      wrap.scale.setScalar(s);
      wrap.position.set(x, spec.y ?? 0, z);
      wrap.rotation.y = rad(yawDeg);
      scene.add(wrap);
    }
  }, undefined, () => console.warn('[sanna] set piece failed to load:', spec.file));
}

// ------------------------------------------------------------- incense smoke
// Ported from Fifteen Sisters (James 2026-07-18): slow soft puffs climbing a
// sinuous path from the burner on the counter, fading in and out. Sprite pool,
// one spawn every ~0.45s, ~16 alive at the natural steady state.
const SMOKE_TIP = new THREE.Vector3(2.9, 1.2, -1.99);
const smokeTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(205,205,220,1)');
  gr.addColorStop(1, 'rgba(205,205,220,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const smokePool = Array.from({ length: 18 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smokeTex, transparent: true, opacity: 0, depthWrite: false,
  }));
  s.visible = false;
  scene.add(s);
  return { sprite: s, born: -1, life: 0, seed: 0, drift: 0 };
});
let smokeAcc = 0;
function updateSmoke(t, dt) {
  smokeAcc += dt;
  if (smokeAcc > 0.45) {
    smokeAcc = 0;
    const p = smokePool.find((q) => q.born < 0);
    if (p) {
      p.born = t;
      p.life = 6 + Math.random() * 2.5;
      p.seed = Math.random() * Math.PI * 2;
      p.drift = (Math.random() - 0.5) * 0.12;
    }
  }
  for (const p of smokePool) {
    if (p.born < 0) continue;
    const age = t - p.born;
    const k = age / p.life;
    if (k >= 1) { p.born = -1; p.sprite.visible = false; continue; }
    const sway = Math.sin(age * 1.1 + p.seed) * (0.012 + age * 0.013);
    p.sprite.position.set(
      SMOKE_TIP.x + sway + p.drift * k,
      SMOKE_TIP.y + age * 0.11,
      SMOKE_TIP.z + Math.cos(age * 0.9 + p.seed) * (0.008 + age * 0.01));
    const r = 0.03 + age * 0.038;
    p.sprite.scale.set(r, r, 1);
    p.sprite.material.opacity = 0.22 * (k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82);
    p.sprite.visible = true;
  }
}

function posterFadeOut() {
  if (!poster) return;
  poster.style.transition = 'opacity 1.1s ease';
  poster.style.opacity = '0';
  setTimeout(() => { poster.style.display = 'none'; }, 1200);
}

// ------------------------------------------------------------------ walking
// Inner octagon (three.js x/z), CW; derived from the Blender footprint.
const POLY = [
  [6, -2.5], [4, -4.5], [-4, -4.5], [-6, -2.5],
  [-6, 2.5], [-4, 4.5], [4, 4.5], [6, 2.5],
].map(([x, z]) => new THREE.Vector2(x, z));
const EDGES = POLY.map((a, i) => {
  const b = POLY[(i + 1) % POLY.length];
  const n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
  if (n.dot(a) < 0) n.multiplyScalar(-1);       // outward from origin
  return { n, d: n.dot(a), door: Math.abs(n.x - 1) < 1e-3 };
});
const INSET = 0.35;
const DOOR_HALF = 0.62;

// Gallery art spots (2026-07-17 experiment): warm halogen SpotLights matching the
// ArtSpot fixtures in room.glb — one per wall section, two flanking the door wall.
// Positions mirror build.py: arm tip 0.42m inside the wall at y 3.88, aimed at the
// art band (y 1.9) on the wall face. No shadows — these are wash lights.
const washSpots = [];  // wall-wash spotlights, dimmed while a piece is in focus
{
  // raised above the molding + a foot farther out 2026-07-17 (evener wash,
  // less hot at the painting tops); intensity down since per-painting pools
  // now carry part of the look
  const SPOT_ARM = 0.72, SPOT_Y = 4.05, AIM_Y = 1.9;
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i], b = POLY[(i + 1) % POLY.length];
    const e = EDGES[i];
    // Perf pass 2026-07-18: canted corner walls lost their real spots (9 → 5
    // lights) — each holds one piece, already carried by its emissive glow +
    // hotspot quad. Long walls, hero wall, and the door flanks keep real wash.
    if (Math.abs(e.n.x) > 0.2 && Math.abs(e.n.x) < 0.95) continue;
    const along = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    for (const off of (e.door ? [-1.55, 1.55] : [0])) {
      const mx = (a.x + b.x) / 2 + along.x * off;
      const mz = (a.y + b.y) / 2 + along.y * off;
      const spot = new THREE.SpotLight(0xffd2a0, 12, 7.5, 0.62, 0.55, 1.7);
      spot.position.set(mx - e.n.x * SPOT_ARM, SPOT_Y, mz - e.n.y * SPOT_ARM);
      spot.target.position.set(mx, AIM_Y, mz);
      spot.userData.baseIntensity = spot.intensity;
      washSpots.push(spot);
      scene.add(spot, spot.target);
    }
  }
}

// furniture keep-out circles (three.js x/z)
const CIRCLES = [
  // Counter arcs hug the drum's room-facing curve (desk slid 1ft toward the
  // corner 2026-07-17; the scoop/stool sit behind it, out of walking range).
  [3.25, -1.75, 0.5], [2.93, -2.42, 0.5], [3.92, -1.43, 0.5],
  [1.55, 4.1, 0.5], [2.65, 4.1, 0.5], [2.45, -4.1, 0.5], [3.55, -4.1, 0.5],
  [-1.9, 4.2, 0.45], [-0.8, 4.2, 0.45], [-5.68, 0.75, 0.45], [-5.68, -0.35, 0.45],
  [-5.15, -2.35, 0.5], [5.1, 2.1, 0.45], [5.05, 3.3, 0.4],
  // retired floor-lantern circles dropped 2026-07-17; Meshy plants below instead
  [-4.85, -3.35, 0.42], [-3.95, 3.55, 0.42], [5.35, -1.9, 0.3], [0.5, -4.1, 0.28],
];
const BODY_R = 0.28;

function constrain(p) {
  // Furniture circles are soft; walls are hard. Circles first, walls last,
  // iterated — so the exit state always respects the walls even in pinch spots.
  // Curator mode ghosts through the furniture entirely — only walls hold.
  for (let pass = 0; pass < 3; pass++) {
    if (!curatorActive) {
      for (const [cx, cz, r] of CIRCLES) {
        const dx = p.x - cx, dz = p.z - cz;
        const rr = r + BODY_R, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          p.x = cx + dx / d * rr;
          p.z = cz + dz / d * rr;
        }
      }
    }
    for (const e of EDGES) {
      if (e.door && Math.abs(p.z) < DOOR_HALF) continue;   // doorway corridor
      const dist = e.n.x * p.x + e.n.y * p.z;
      const lim = e.d - INSET;
      if (dist > lim) {
        p.x -= e.n.x * (dist - lim);
        p.z -= e.n.y * (dist - lim);
      }
    }
  }
  // Look-only door (James 2026-07-18): walk right up to the threshold, peek
  // left and right, but no going outside until the village exists for real.
  if (p.x > 5.98) p.x = 5.98;
  return p;
}

const EYE = 1.7;   // +6in 2026-07-18 (was 1.55 — a 5'2" visitor)
// spawn right at the threshold, like you've JUST stepped in (James 2026-07-17)
const pos = new THREE.Vector3(5.55, EYE, 0);
let yaw = Math.atan2(-(-5.94 - pos.x), -(0 - pos.z));  // face the hero wall
let pitch = 0, tYaw = yaw, tPitch = 0;
const vel = new THREE.Vector3();
const keys = new Set();

addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (focusState !== 'free' && e.code !== 'Escape') exitFocus();
  if (e.code === 'Escape') exitFocus();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// drag look — two conventions, both kept (James 2026-07-17):
//   grab  — dragging moves the wall itself: drag right, the view swings left (touch-style)
//   swing — dragging swings the camera: drag right, look right (the original mouse-look)
// Shared localStorage key so other walkable worlds can adopt the same preference.
const LOOK_KEY = 'elastic-look-mode';
let lookMode = localStorage.getItem(LOOK_KEY) === 'swing' ? 'swing' : 'grab';
const lookToggle = document.createElement('button');
lookToggle.id = 'look-toggle';
lookToggle.title = 'how dragging turns the camera — click to switch';
lookToggle.style.cssText = 'position:fixed;left:0.7rem;top:0.7rem;z-index:44;' +
  'font:inherit;font-size:0.78rem;letter-spacing:0.05em;color:var(--ink);opacity:0.75;' +
  'background:rgba(23,16,10,0.6);border:1px solid #6b552f;border-radius:999px;' +
  'padding:0.25rem 0.8rem;cursor:pointer;';
// Top-left, riding just right of the curator topbar's exit button when curating
// (or the "← curating" chip in preview); plain corner when there's no curator UI.
function placeLookToggle() {
  const inPreview = document.body.classList.contains('cur-preview');
  const anchor = inPreview
    ? document.getElementById('cur-preview-chip')
    : document.getElementById('cur-topbar');
  if (anchor) {
    const r = anchor.getBoundingClientRect();
    lookToggle.style.left = `${Math.round(r.right + 12)}px`;
    lookToggle.style.top = `${Math.round(r.top + (r.height - lookToggle.offsetHeight) / 2)}px`;
  } else {
    lookToggle.style.left = '0.7rem';
    lookToggle.style.top = '0.7rem';
  }
}
lookToggle.addEventListener('mouseenter', () => {
  lookToggle.style.opacity = '1'; lookToggle.style.borderColor = '#c9a24b';
});
lookToggle.addEventListener('mouseleave', () => {
  lookToggle.style.opacity = '0.75'; lookToggle.style.borderColor = '#6b552f';
});
function renderLookToggle() {
  lookToggle.textContent = lookMode === 'grab' ? 'drag moves the wall' : 'drag swings the view';
}
lookToggle.addEventListener('click', () => {
  lookMode = lookMode === 'grab' ? 'swing' : 'grab';
  localStorage.setItem(LOOK_KEY, lookMode);
  renderLookToggle();
});
renderLookToggle();
document.body.appendChild(lookToggle);
placeLookToggle();

let dragging = false, moved = 0, lastX = 0, lastY = 0, downAt = 0;
stage.addEventListener('pointerdown', (e) => {
  dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; downAt = performance.now();
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  moved += Math.abs(dx) + Math.abs(dy);
  lastX = e.clientX; lastY = e.clientY;
  // grab mode flips both axes (drag = move the wall itself); swing is classic mouse-look
  const s = lookMode === 'swing' ? -1 : 1;
  tYaw += s * dx * 0.0014;
  tPitch = clamp(tPitch + s * dy * 0.0013, -1.05, 1.05);
});
stage.addEventListener('pointerup', (e) => {
  dragging = false;
  if (moved < 7 && performance.now() - downAt < 400) handleClick(e);
});

addEventListener('wheel', (e) => {
  // Over UI (music player, sound control, curator panels): let the control
  // have the wheel, but still block pinch/ctrl-wheel BROWSER zoom.
  if (e.target.closest?.('#shop-music, #shop-music-toggle, .es-sound, .cur-ui')) {
    if (e.ctrlKey) e.preventDefault();
    return;
  }
  // non-passive + preventDefault: trackpad pinch and ctrl+wheel were zooming
  // the whole PAGE, shrinking the UI (James 2026-07-18). All zoom gestures
  // now drive the in-world dolly instead.
  e.preventDefault();
  if (inputLocks.wheel) return;        // curator is resizing with the wheel
  if (focusState === 'focused') {
    focusDist = clamp(focusDist + Math.sign(e.deltaY) * 0.22, 0.42, 3.4);
  } else if (focusState === 'free') {
    // clamp the stored impulse so wheel-spinning can't stack a rocket ride
    dollyImpulse = clamp(dollyImpulse + Math.sign(e.deltaY) * -0.55, -1.5, 1.5);
  }
}, { passive: false });
let dollyImpulse = 0;
// Hard ceiling on camera travel speed — ~25% of the old uncapped wheel-rush
// top speed (James's motion-sickness cap, 2026-07-16). Plain walking (1.7) is
// unaffected; only stacked wheel dollies used to blow past this.
const TOP_SPEED = 3.0;

// ------------------------------------------------------------------ focus glide
let focusState = 'free';   // free | gliding | focused | returning
let glideT = 0, glideDur = 1.4;
const glideFrom = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const glideTo = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const savedPose = { p: new THREE.Vector3(), yaw: 0, pitch: 0 };
let focusArt = null, focusDist = 1, focusCenter = new THREE.Vector3(), focusNormal = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function poseToward(pFrom, target) {
  const m = new THREE.Matrix4().lookAt(pFrom, target, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

function enterFocus(artMesh) {
  const slot = artMesh.userData.slot;
  focusArt = artMesh;
  artMesh.getWorldPosition(focusCenter);
  focusNormal.set(0, 0, 1).applyQuaternion(artMesh.getWorldQuaternion(new THREE.Quaternion()));
  // 1.12 (was 0.95): stop short of filling the frame — a breath of wall above
  // and below the piece (James 2026-07-17, "don't zoom quite so much")
  focusDist = clamp(1.12 * Math.max(slot.w, slot.h), 0.62, 3.2);
  savedPose.p.copy(pos); savedPose.yaw = tYaw; savedPose.pitch = tPitch;
  glideFrom.p.copy(camera.position); glideFrom.q.copy(camera.quaternion);
  glideTo.p.copy(focusCenter).addScaledVector(focusNormal, focusDist);
  glideTo.q.copy(poseToward(glideTo.p, focusCenter));
  glideT = 0; glideDur = reducedMotion ? 0.01 : 1.4;
  focusState = 'gliding';
}

function exitFocus() {
  if (focusState !== 'focused' && focusState !== 'gliding') return;
  glideFrom.p.copy(camera.position); glideFrom.q.copy(camera.quaternion);
  glideTo.p.copy(savedPose.p);
  const e = new THREE.Euler(savedPose.pitch, savedPose.yaw, 0, 'YXZ');
  glideTo.q.setFromEuler(e);
  glideT = 0; glideDur = reducedMotion ? 0.01 : 1.1;
  focusState = 'returning';
  focusArt = null;
}

// ------------------------------------------------------------------ drift exits
let drifted = false;
function triggerDrift(id) {
  if (drifted) return;
  drifted = true;
  document.getElementById(id)?.click();
}

function handleClick(e) {
  if (curatorActive) return;           // curator owns clicks (select, not focus)
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(rayTargets(), false);
  if (!hits.length) { exitFocus(); return; }
  const obj = hits[0].object;
  if (doorMeshes.has(obj)) return triggerDrift('drift-door');
  if (obj === bowlMesh) return triggerDrift('drift-bowl');
  if (obj.userData.slot) {
    if (obj.userData.slot.id === 'blank_n_hi') return triggerDrift('drift-blank');
    if (focusArt === obj) return exitFocus();
    enterFocus(obj);
  }
}

// ------------------------------------------------------------------ main loop
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
let frame = 0;
let resStillAt = 0;   // last time the camera was in motion (dynamic resolution)

// ?fps=1 — frame-time readout for tuning (avg fps + worst frame per half second)
const fpsEl = new URLSearchParams(location.search).has('fps')
  ? document.body.appendChild(Object.assign(document.createElement('div'), {
      style: 'position:fixed;right:3.2rem;bottom:0.85rem;z-index:60;font-size:0.78rem;' +
        'letter-spacing:0.05em;opacity:0.8;color:#ffd77e;pointer-events:none;' +
        'font-family:Consolas,monospace;',
    }))
  : null;
let ftAcc = 0, ftWorst = 0, ftN = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  frame++;

  if (fpsEl) {
    ftAcc += dt; ftN++; ftWorst = Math.max(ftWorst, dt);
    if (ftAcc >= 0.5) {
      fpsEl.textContent =
        `${Math.round(ftN / ftAcc)} fps · worst ${(ftWorst * 1000).toFixed(1)}ms`;
      ftAcc = 0; ftN = 0; ftWorst = 0;
    }
  }

  if (shimmerMat) shimmerMat.emissiveIntensity = 0.15 + 0.11 * Math.sin(t * 1.3);
  updateSmoke(t, dt);

  // ease the wall-wash spots down while a piece is in focus, so the close-up
  // isn't washed hot (James 2026-07-18); ease back on return
  const washLevel = (focusState === 'focused' || focusState === 'gliding') ? 0.3 : 1;
  for (const s of washSpots) {
    s.intensity = damp(s.intensity, s.userData.baseIntensity * washLevel, 5, dt);
  }

  if (focusState === 'gliding' || focusState === 'returning') {
    glideT = Math.min(glideT + dt / glideDur, 1);
    const s = glideT * glideT * (3 - 2 * glideT);
    camera.position.lerpVectors(glideFrom.p, glideTo.p, s);
    camera.quaternion.slerpQuaternions(glideFrom.q, glideTo.q, s);
    if (glideT >= 1) {
      if (focusState === 'gliding') focusState = 'focused';
      else {
        focusState = 'free';
        pos.copy(savedPose.p); yaw = tYaw = savedPose.yaw; pitch = tPitch = savedPose.pitch;
      }
    }
  } else if (focusState === 'focused') {
    const want = focusCenter.clone().addScaledVector(focusNormal, focusDist);
    camera.position.x = damp(camera.position.x, want.x, 6, dt);
    camera.position.y = damp(camera.position.y, want.y, 6, dt);
    camera.position.z = damp(camera.position.z, want.z, 6, dt);
    camera.quaternion.copy(poseToward(camera.position, focusCenter));
  } else {
    // tight look: barely-there smoothing so drags track the hand with no
    // wind-up or coast (James 2026-07-17; was 10, which felt "a bit wild")
    yaw = damp(yaw, tYaw, 22, dt);
    pitch = damp(pitch, tPitch, 22, dt);

    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(-fwd.z, 0, fwd.x);
    wish.set(0, 0, 0);
    const arrowsOk = !inputLocks.arrows;   // curator borrows arrows for nudging
    if (keys.has('KeyW') || (arrowsOk && keys.has('ArrowUp'))) wish.add(fwd);
    if (keys.has('KeyS') || (arrowsOk && keys.has('ArrowDown'))) wish.sub(fwd);
    if (keys.has('KeyA') || (arrowsOk && keys.has('ArrowLeft'))) wish.sub(right);
    if (keys.has('KeyD') || (arrowsOk && keys.has('ArrowRight'))) wish.add(right);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(2.2);
    if (Math.abs(dollyImpulse) > 0.01) {
      wish.addScaledVector(fwd, dollyImpulse * 2.2);
      dollyImpulse *= Math.pow(0.0025, dt);
    }
    if (wish.length() > TOP_SPEED) wish.setLength(TOP_SPEED);
    vel.x = damp(vel.x, wish.x, 6, dt);
    vel.z = damp(vel.z, wish.z, 6, dt);
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    constrain(pos);

    // walk-out drift removed 2026-07-17 (James: "for now") — you can stroll out
    // onto the sand; clicking the door still drifts. constrain() stops the walk
    // short of the street billboard.

    camera.position.copy(pos);
    lookEuler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(lookEuler);
  }

  // dynamic resolution: drop while the camera moves, restore full sharpness
  // a quarter-second after it settles (or any time a piece is in focus)
  const camMoving = dragging || vel.lengthSq() > 0.02 || Math.abs(dollyImpulse) > 0.05
    || Math.abs(yaw - tYaw) > 0.002 || Math.abs(pitch - tPitch) > 0.002
    || focusState === 'gliding' || focusState === 'returning';
  if (camMoving) resStillAt = t;
  applyRes(t - resStillAt > 0.25 ? RES_HIGH : RES_LOW);

  if (frame % 30 === 0) placeLookToggle();   // follows the curator bar / preview chip

  // hover cursor (throttled; curator styles its own cursor)
  if (!curatorActive && frame % 3 === 0 && focusState === 'free' && !dragging) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(rayTargets(), false);
    stage.style.cursor = hits.length ? 'pointer' : 'grab';
  }

  renderer.render(scene, camera);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ------------------------------------------------------------------ music
// Tiny playlist player (pattern from Chrome Rift). One Audio element plays
// TRACKS in order, wrapping at the end. The shared sound control owns mute
// and master volume — it reads the element's 25% default at attach and makes
// the one allowed autoplay attempt.
const TRACKS = [
  { title: 'oasis mandala 01', file: 'oasis-mandala-01.mp3' },
  { title: 'oasis mandala 02', file: 'oasis-mandala-02.mp3' },
];
let trackIndex = 0;
const music = new Audio(`assets/music/${TRACKS[0].file}`);
music.volume = 0.08;   // barely-there by default (James 2026-07-17)

// 20-second hush before the music debuts (James 2026-07-17). Custom adapter:
// the control's one autoplay attempt probes permission silently and arms the
// timer; manual clicks always play immediately; stopping cancels the debut.
let debutTimer = 0, probed = false;
const soundCtl = window.ElasticSoundControl?.attach({
  start: () => {
    if (probed) return music.play();
    probed = true;
    const v = music.volume;
    music.volume = 0;
    return music.play().then(() => {
      music.pause();
      music.currentTime = 0;
      music.volume = v;
      debutTimer = setTimeout(() => music.play().catch(() => {}), 20000);
    }).catch((err) => { music.volume = v; throw err; });
  },
  stop: () => { clearTimeout(debutTimer); music.pause(); },
  setVolume: (v) => { music.volume = v; },
});
soundCtl?.setVolume(0.08);   // adapter form defaults the slider to 1 otherwise
// adapter form has no media listeners — keep the speaker icon honest ourselves
music.addEventListener('play', () => soundCtl?.setOn(true));
music.addEventListener('pause', () => soundCtl?.setOn(false));

function playTrack(index) {
  if (index !== trackIndex) {
    trackIndex = index;
    music.src = `assets/music/${TRACKS[index].file}`;
    seekSlider.value = 0;
  }
  music.play().catch(() => {});
}
music.addEventListener('ended', () => playTrack((trackIndex + 1) % TRACKS.length));

const musicToggle = document.getElementById('shop-music-toggle');
const musicPanel = document.getElementById('shop-music');
const trackHolder = document.getElementById('shop-tracks');

const trackRows = TRACKS.map((track, index) => {
  const row = document.createElement('li');
  row.className = 'music-track';
  row.innerHTML = `
    <button type="button" class="music-play">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path class="music-glyph-play" d="M8 5.5v13l10.5-6.5z"></path>
        <g class="music-glyph-pause">
          <rect x="7" y="5.5" width="3.4" height="13" rx="1"></rect>
          <rect x="13.6" y="5.5" width="3.4" height="13" rx="1"></rect>
        </g>
      </svg>
    </button>
    <span class="music-title">${track.title}</span>
  `;
  row.querySelector('.music-play').addEventListener('click', () => {
    if (index === trackIndex && !music.paused) music.pause();
    else playTrack(index);
  });
  trackHolder.appendChild(row);
  return row;
});

function reflectTracks() {
  trackRows.forEach((row, index) => {
    const playing = index === trackIndex && !music.paused;
    row.classList.toggle('is-playing', playing);
    const button = row.querySelector('.music-play');
    const label = `${playing ? 'Stop' : 'Play'} ${TRACKS[index].title}`;
    button.setAttribute('aria-label', label);
    button.title = label;
  });
}
music.addEventListener('play', reflectTracks);
music.addEventListener('pause', reflectTracks);
reflectTracks();

// Seek slider — scrubs the playing track; while the pointer holds the thumb,
// timeupdate stops writing back so the drag never fights the playhead.
const seekSlider = document.getElementById('shop-seek');
let scrubbing = false;
seekSlider.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  e.stopPropagation();     // keep the drag-look out of the scrub
});
addEventListener('pointerup', () => { scrubbing = false; });
seekSlider.addEventListener('input', () => {
  if (music.duration) music.currentTime = (Number(seekSlider.value) / 1000) * music.duration;
});
music.addEventListener('timeupdate', () => {
  if (scrubbing || !music.duration) return;
  seekSlider.value = Math.round((music.currentTime / music.duration) * 1000);
});

musicToggle.addEventListener('click', () => {
  const open = musicPanel.hidden;
  musicPanel.hidden = !open;
  musicToggle.setAttribute('aria-expanded', String(open));
});

// ------------------------------------------------------------------ curator
// Placement surfaces for the curator: the eight wall planes (art hangs at
// wallInset inside them) and the floor. The doorway wall carries a keep-out
// band so nothing gets hung across the arch (door is centered on z = 0).
const WALLS = EDGES.map((e, i) => {
  const a = POLY[i], b = POLY[(i + 1) % POLY.length];
  const wall = { a: [a.x, a.y], b: [b.x, b.y], n: [e.n.x, e.n.y], d: e.d };
  if (e.door) {
    const sAt = (z) => (z - a.y) / (b.y - a.y);
    const span = [sAt(0.75), sAt(-0.75)].sort((p, q) => p - q);
    wall.door = { s0: span[0], s1: span[1], top: 2.85 };
  }
  return wall;
});

function curatorNote(text) {
  const note = document.createElement('div');
  note.textContent = text;
  note.style.cssText =
    'position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);' +
    'background:rgba(23,16,10,0.92);color:#e8d9bf;border:1px solid #c9a24b;' +
    'padding:0.7rem 1.2rem;border-radius:4px;font-family:Palatino,serif;z-index:40;';
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 6000);
}

if (CURATE) {
  if (location.protocol === 'file:') {
    curatorNote('Curator mode needs the shop server — start it and enter through the admin panel pill.');
  } else {
    import('../../core/curator.js').then(({ initCurator }) => {
      curatorActive = true;
      initCurator({
        THREE, scene, camera, renderer, stage,
        slug: 'mandala-shop',
        layout: LAYOUT,
        railY: LAYOUT.railZ ?? 3.0,
        walls: WALLS,
        wallInset: 0.06,
        floorY: 0,
        protectedIds: [SHIMMER_ID],
        clickables,
        slots: { add: addSlot, remove: removeSlot, update: updateSlot, reset: resetSlots },
        meshFor: (id) => slotObjects.get(id)?.artMesh,
        getTexture: artTexture,
        toThree: b2t,
        toBlender: (v) => [v.x, -v.z, v.y],
        setInputLocks: (locks) => Object.assign(inputLocks, locks),
      });
    }).catch((err) => {
      console.warn('[sanna] curator failed to load', err);
      curatorNote('Curator mode failed to load — the shop still works; see the console.');
    });
  }
}
