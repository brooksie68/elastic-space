// Sanna / Mandala Shop — walkable gallery
// Room: assets/room.glb (Blender-built, art layer stripped).
// Art layer: built at runtime from assets/layout.js (globalThis.MANDALA_SHOP_LAYOUT)
// so curator mode can eventually rewrite it. Blender coords are Z-up meters;
// three.js is Y-up: (x, y, z)_three = (x, z, -y)_blender.
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';

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

// ------------------------------------------------------------------ renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: stage, antialias: true });
} catch (e) {
  fail('WebGL is unavailable here — the pictures above still drift.');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17100a);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 80);

// ------------------------------------------------------------------ lighting
scene.add(new THREE.HemisphereLight(0xffe2bb, 0x55432f, 0.55));

const sun = new THREE.DirectionalLight(0xffb877, 0.8);
sun.position.set(14, 5, -2);
sun.target.position.set(0, 1.2, 0);
scene.add(sun, sun.target);

// lantern glow points (positions match the Blender lanterns)
const LANTERNS = [
  [-3, 5.57, 0, 16, 9], [0, 5.57, 0, 16, 9], [3, 5.57, 0, 16, 9],   // ridge
  [4.95, 0.60, 3.35, 18, 7], [-4.95, 0.60, -3.35, 18, 7],           // big floor
  [-5.5, 0.43, -1.0, 8, 5], [2.6, 0.43, -3.85, 8, 5],               // small floor
  [0.35, 0.63, -0.3, 5, 4],                                          // table
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

const texSandstone = canvasTex(512, 0.64, (g, px) =>
  gridTiles(g, px, 4, ['#ad8b66', '#8c6947', '#a07d58'], '#705943', 0.011));

const texFloor = canvasTex(512, 1.0, (g, px) =>
  gridTiles(g, px, 2, ['#9e856b', '#917861'], '#6b5745', 0.006));

const texRug = canvasTex(1024, 5.4, (g, px) => {
  const m = px / 2, mPerPx = 5.4 / px;
  g.fillStyle = '#7a3833';
  g.fillRect(0, 0, px, px);
  for (let r = 0.30; r < 2.7; r += 0.35) {
    g.strokeStyle = jitter(r % 0.7 < 0.35 ? '#9e564d' : '#5e2a26', 0.04);
    g.lineWidth = (r > 2.3 ? 0.11 : 0.05) / mPerPx;
    g.beginPath();
    g.arc(m, m, r / mPerPx, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = 'rgba(94,42,38,0.55)';
  g.lineWidth = 0.018 / mPerPx;
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8;
    g.beginPath();
    g.moveTo(m + Math.cos(a) * 0.35 / mPerPx, m + Math.sin(a) * 0.35 / mPerPx);
    g.lineTo(m + Math.cos(a) * 2.55 / mPerPx, m + Math.sin(a) * 2.55 / mPerPx);
    g.stroke();
  }
});
texRug.offset.set(0.5, 0.5);

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

const MATERIAL_MAPS = {
  tile_sandstone: texSandstone,
  floor_tile: texFloor,
  rug_rose: texRug,
  wood_door: texDoor,
};
const MATERIAL_COLORS = { plaster: 0xc9c0b6, tent_fabric: 0xded2b8 };

// ------------------------------------------------------------------ art layer
const artGroup = new THREE.Group();
scene.add(artGroup);
const texLoader = new THREE.TextureLoader();
const artCache = new Map();
const clickables = [];   // art planes
let shimmerMat = null;   // the drifting blank

function artTexture(file) {
  if (!artCache.has(file)) {
    const t = texLoader.load(LAYOUT.artDir + file, undefined, undefined,
      () => console.warn('[sanna] art failed to load:', file));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    artCache.set(file, t);
  }
  return artCache.get(file);
}

const TRIP_SLICE = { trip_a: 0, trip_b: 1, trip_c: 2 };
const CREAM = new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.9 });
const DEPTH = 0.05;

function buildSlot(slot) {
  const kit = LAYOUT.kit[slot.style] || LAYOUT.kit.walnut;
  const g = new THREE.Group();
  const { w, h } = slot;
  const bw = Math.max(0.045, w * 0.055) * (kit.borderScale ?? 1);

  const frameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(kit.color), metalness: kit.metal, roughness: kit.rough,
  });
  const bar = (bx, by, bz, sx, sy) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, DEPTH), frameMat);
    m.position.set(bx, by, bz);
    g.add(m);
  };
  bar(0, h / 2 + bw / 2, 0, w + 2 * bw, bw);
  bar(0, -h / 2 - bw / 2, 0, w + 2 * bw, bw);
  bar(-w / 2 - bw / 2, 0, 0, bw, h);
  bar(w / 2 + bw / 2, 0, 0, bw, h);

  let mat = CREAM;
  if (slot.art) {
    let tex = artTexture(slot.art);
    if (slot.id in TRIP_SLICE) {
      tex = tex.clone();
      tex.repeat.set(1 / 3, 1);
      tex.offset.set(TRIP_SLICE[slot.id] / 3, 0);
    }
    mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.7 });
  } else if (slot.id === 'blank_n_hi') {
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

  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + bw, h + bw), CREAM);
  back.position.z = -0.004;
  g.add(back);

  g.position.copy(b2t(slot.pos));
  g.rotation.y = rad(slot.yaw);

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
    // re-express the frame relative to the floor point so it rides the easel
    g.position.y = slot.pos[2];
    g.position.x = root.position.x;
    g.position.z = root.position.z;
  }
  artGroup.add(g);
}

for (const slot of LAYOUT.slots) buildSlot(slot);

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
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }
    if (mat.name in MATERIAL_COLORS) mat.color.set(MATERIAL_COLORS[mat.name]);
    if (mat.name === 'glass_amber') {
      mat.emissiveIntensity = Math.min(mat.emissiveIntensity ?? 1, 2.6);
    }
    if (o.name.startsWith('Door')) doorMeshes.add(o);
    if (o.name === 'BrassBowl') bowlMesh = o;
  });
  scene.add(gltf.scene);
  posterFadeOut();
}, undefined, () => {
  fail('The shop is closed just now (room failed to load) — the pictures above still drift.');
});

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

// furniture keep-out circles (three.js x/z)
const CIRCLES = [
  [0, 0, 2.2], [4.05, -2.55, 1.55], [4.55, -3.15, 0.35],
  [1.55, 4.1, 0.5], [2.65, 4.1, 0.5], [2.45, -4.1, 0.5], [3.55, -4.1, 0.5],
  [-1.9, 4.2, 0.45], [-0.8, 4.2, 0.45], [-5.68, 0.75, 0.45], [-5.68, -0.35, 0.45],
  [3.5, 2.7, 0.6], [-5.15, -2.35, 0.5], [5.1, 2.1, 0.45], [5.05, 3.3, 0.4],
  [4.95, 3.35, 0.45], [-4.95, -3.35, 0.45], [-5.5, -1.0, 0.3], [2.6, -3.85, 0.3],
  [5.5, -3.2, 0.8],   // plug the pinch between counter and the canted corner
];
const BODY_R = 0.28;

function constrain(p) {
  // Furniture circles are soft; walls are hard. Circles first, walls last,
  // iterated — so the exit state always respects the walls even in pinch spots.
  for (let pass = 0; pass < 3; pass++) {
    for (const [cx, cz, r] of CIRCLES) {
      const dx = p.x - cx, dz = p.z - cz;
      const rr = r + BODY_R, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x = cx + dx / d * rr;
        p.z = cz + dz / d * rr;
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
  return p;
}

const EYE = 1.55;
const pos = new THREE.Vector3(2.6, EYE, -0.6);
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

// drag look
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
  tYaw -= dx * 0.0031;
  tPitch = clamp(tPitch - dy * 0.0027, -1.05, 1.05);
});
stage.addEventListener('pointerup', (e) => {
  dragging = false;
  if (moved < 7 && performance.now() - downAt < 400) handleClick(e);
});

addEventListener('wheel', (e) => {
  if (focusState === 'focused') {
    focusDist = clamp(focusDist + Math.sign(e.deltaY) * 0.22, 0.42, 3.4);
  } else if (focusState === 'free') {
    dollyImpulse += Math.sign(e.deltaY) * -0.55;
  }
}, { passive: true });
let dollyImpulse = 0;

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
  focusDist = clamp(0.95 * Math.max(slot.w, slot.h), 0.55, 3.2);
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
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects([...clickables, ...doorMeshes, ...(bowlMesh ? [bowlMesh] : [])], false);
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
let frame = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  frame++;

  if (shimmerMat) shimmerMat.emissiveIntensity = 0.15 + 0.11 * Math.sin(t * 1.3);

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
    yaw = damp(yaw, tYaw, 10, dt);
    pitch = damp(pitch, tPitch, 10, dt);

    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(-fwd.z, 0, fwd.x);
    wish.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(fwd);
    if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(fwd);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
    if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(1.7);
    if (Math.abs(dollyImpulse) > 0.01) {
      wish.addScaledVector(fwd, dollyImpulse * 2.2);
      dollyImpulse *= Math.pow(0.0025, dt);
    }
    vel.x = damp(vel.x, wish.x, 6, dt);
    vel.z = damp(vel.z, wish.z, 6, dt);
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    constrain(pos);

    if (pos.x > 6.02 && Math.abs(pos.z) < DOOR_HALF + 0.1) triggerDrift('drift-door');

    camera.position.copy(pos);
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  }

  // hover cursor (throttled)
  if (frame % 3 === 0 && focusState === 'free' && !dragging) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([...clickables, ...doorMeshes, ...(bowlMesh ? [bowlMesh] : [])], false);
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

// ------------------------------------------------------------------ curate flag
if (new URLSearchParams(location.search).has('curate')) {
  const toast = document.createElement('div');
  toast.textContent = 'Curator mode is on the workbench — this door will open soon.';
  toast.style.cssText =
    'position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);' +
    'background:rgba(23,16,10,0.92);color:#e8d9bf;border:1px solid #c9a24b;' +
    'padding:0.7rem 1.2rem;border-radius:4px;font-family:Palatino,serif;z-index:40;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}
