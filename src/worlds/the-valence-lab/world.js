// The Valence Lab — phase A: the atom bench.
// A coherence scope holds one atom; its electrons are a measurement swarm —
// every dot a genuine sample of |psi|^2 (see orbitals.js + the sim in
// tmp/the-valence-lab/atom-sim.mjs). Physics in a0 units; display scaling only.

import * as THREE from 'three';
import { ELEMENTS, getElement, makeAtomSampler, SUBSHELLS, SUBSHELL_COLORS } from './orbitals.js';

const BUILD = 'v1 · phase A · 2026-07-24';
console.log(`[valence-lab] ${BUILD}`);

// ---------------------------------------------------------------------------
// Tuner state

const TUNER_KEY = 'valence-lab-tuner-v1';
const DEFAULTS = {
  points: 7000,      // swarm sample count
  dotSize: 1.0,      // sprite size multiplier
  life: 1.6,         // seconds a sample lives
  brightness: 1.0,   // swarm alpha multiplier
  coreDim: 0.45,     // brightness of non-valence shells
  fogScale: 3.5,     // dot growth in fog view
  atomScale: 1.5,    // world units per Bohr radius
  timeScale: 1.0,    // swarm churn + nucleus jitter speed
  orbitSpeed: 0.05,  // idle auto-orbit rad/s
  ringGlow: 1.2,     // scope ring emissive intensity
};
let tuner = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(TUNER_KEY) || '{}');
  for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === 'number') tuner[k] = saved[k];
} catch { /* fresh defaults */ }
function saveTuner() { try { localStorage.setItem(TUNER_KEY, JSON.stringify(tuner)); } catch { /* no-op */ } }

// ---------------------------------------------------------------------------
// Renderer / scene / camera

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x04060b, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

const ATOM_CENTER = new THREE.Vector3(0, 8, 0);
const CAM_TARGET = new THREE.Vector3(0, 6.8, 0);

// Slow, damped orbit — wide by default, no snap (motion restraint).
const orbit = {
  yaw: 0.0, pitch: 0.18, dist: 20,
  tYaw: 0.0, tPitch: 0.18, tDist: 20,
  lastInput: -10,
};
function applyCamera() {
  orbit.yaw += (orbit.tYaw - orbit.yaw) * 0.06;
  orbit.pitch += (orbit.tPitch - orbit.pitch) * 0.06;
  orbit.dist += (orbit.tDist - orbit.dist) * 0.08;
  const cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
  camera.position.set(
    CAM_TARGET.x + orbit.dist * cp * Math.sin(orbit.yaw),
    CAM_TARGET.y + orbit.dist * sp,
    CAM_TARGET.z + orbit.dist * cp * Math.cos(orbit.yaw),
  );
  camera.lookAt(CAM_TARGET);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Lights
scene.add(new THREE.HemisphereLight(0x39505e, 0x0a0d12, 0.55));
const key = new THREE.DirectionalLight(0xbfd8e6, 0.85);
key.position.set(8, 18, 10);
scene.add(key);
const atomLight = new THREE.PointLight(0x66d9ff, 0.9, 40, 1.8);
atomLight.position.copy(ATOM_CENTER);
scene.add(atomLight);

// ---------------------------------------------------------------------------
// The bench

const bench = new THREE.Group();
scene.add(bench);

const METAL = new THREE.MeshStandardMaterial({ color: 0x7d868f, metalness: 0.85, roughness: 0.42 });
const METAL_DARK = new THREE.MeshStandardMaterial({ color: 0x3a4148, metalness: 0.8, roughness: 0.55 });

const top = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 12), METAL);
top.position.y = -0.5;
bench.add(top);
const skirtF = new THREE.Mesh(new THREE.BoxGeometry(30, 3.2, 0.5), METAL_DARK);
skirtF.position.set(0, -2.6, 5.75);
bench.add(skirtF);
const skirtB = skirtF.clone();
skirtB.position.z = -5.75;
bench.add(skirtB);

// Emissive service strip along the front edge.
const strip = new THREE.Mesh(
  new THREE.BoxGeometry(29.4, 0.08, 0.08),
  new THREE.MeshBasicMaterial({ color: 0x2f8fae }),
);
strip.position.set(0, 0.04, 5.9);
bench.add(strip);

// A little bench clutter — dark, minimal, non-interactive.
const tray = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 2.2), METAL_DARK);
tray.position.set(8.6, 0.1, 3.6);
tray.rotation.y = -0.22;
bench.add(tray);
for (let i = 0; i < 3; i++) {
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9 + i * 0.25, 20), METAL);
  can.position.set(11.4 + i * 0.85, (0.9 + i * 0.25) / 2, 1.6 - i * 0.5);
  bench.add(can);
}
const coil = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 10, 28), METAL_DARK);
coil.rotation.x = Math.PI / 2;
coil.position.set(7.6, 0.18, 1.2);
bench.add(coil);

// ---------------------------------------------------------------------------
// The coherence scope — a cantilevered field ring holding the atom.

const scope = new THREE.Group();
scene.add(scope);

function tubeBetween(a, b, r, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

const RING_R = 6.5;
const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.42, 18, 90), METAL);
ring.position.copy(ATOM_CENTER);
scope.add(ring);

const ringGlowMat = new THREE.MeshBasicMaterial({ color: 0x59d5f2 });
const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(RING_R - 0.5, 0.08, 10, 90), ringGlowMat);
ringGlow.position.copy(ATOM_CENTER);
scope.add(ringGlow);

// Emitter studs pointing inward.
const studGeo = new THREE.ConeGeometry(0.16, 0.5, 10);
const studMat = new THREE.MeshBasicMaterial({ color: 0x9ae8ff });
for (let i = 0; i < 8; i++) {
  const ang = (i / 8) * Math.PI * 2;
  const stud = new THREE.Mesh(studGeo, studMat);
  const px = ATOM_CENTER.x + Math.cos(ang) * (RING_R - 0.75);
  const py = ATOM_CENTER.y + Math.sin(ang) * (RING_R - 0.75);
  stud.position.set(px, py, ATOM_CENTER.z);
  stud.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(ATOM_CENTER.x - px, ATOM_CENTER.y - py, 0).normalize(),
  );
  scope.add(stud);
}

// Cantilever arm from a floor column to the ring's left edge.
const colBase = new THREE.Vector3(-11.5, 0, -2.5);
const colTop = new THREE.Vector3(-11.5, ATOM_CENTER.y, -2.5);
const ringAttach = new THREE.Vector3(ATOM_CENTER.x - RING_R, ATOM_CENTER.y, ATOM_CENTER.z);
scope.add(tubeBetween(colBase, colTop, 0.5, METAL));
scope.add(tubeBetween(colTop, ringAttach, 0.34, METAL));
const colFoot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.4, 22), METAL_DARK);
colFoot.position.set(colBase.x, 0.2, colBase.z);
scope.add(colFoot);

// ---------------------------------------------------------------------------
// Dust — a faint depth cue drifting around the room.

{
  const n = 260;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 80;
    pos[i * 3 + 1] = Math.random() * 30;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0x27414c, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  scene.add(dust);
  dust.onBeforeRender = () => { dust.rotation.y += 0.00008; };
}

// ---------------------------------------------------------------------------
// The measurement swarm

const MAX_POINTS = 24000;
const swarmGroup = new THREE.Group();
swarmGroup.position.copy(ATOM_CENTER);
scene.add(swarmGroup);

const positions = new Float32Array(MAX_POINTS * 3);
const aBirth = new Float32Array(MAX_POINTS);
const aLife = new Float32Array(MAX_POINTS);
const aShell = new Float32Array(MAX_POINTS);
const aRand = new Float32Array(MAX_POINTS);

const swarmGeo = new THREE.BufferGeometry();
swarmGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
swarmGeo.setAttribute('aBirth', new THREE.BufferAttribute(aBirth, 1));
swarmGeo.setAttribute('aLife', new THREE.BufferAttribute(aLife, 1));
swarmGeo.setAttribute('aShell', new THREE.BufferAttribute(aShell, 1));
swarmGeo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
swarmGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

const palette = SUBSHELL_COLORS.map((c) => new THREE.Color(c));
const swarmUniforms = {
  uTime: { value: 0 },
  uDotSize: { value: tuner.dotSize },
  uAlpha: { value: tuner.brightness },
  uFogMix: { value: 0 },
  uFogScale: { value: tuner.fogScale },
  uCoreDim: { value: tuner.coreDim },
  uValenceStart: { value: 0 },
  uCollapse: { value: 0 },
  uPalette: { value: palette },
  uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
};

const swarmMat = new THREE.ShaderMaterial({
  uniforms: swarmUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute float aBirth;
    attribute float aLife;
    attribute float aShell;
    attribute float aRand;
    uniform float uTime, uDotSize, uFogMix, uFogScale, uCoreDim, uValenceStart, uPixelRatio;
    uniform vec3 uPalette[5];
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      float t = clamp((uTime - aBirth) / aLife, 0.0, 1.0);
      float env = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.65, 1.0, t));
      int si = int(aShell + 0.5);
      vColor = uPalette[si];
      float dim = (aShell + 0.5 < uValenceStart) ? uCoreDim : 1.0;
      vAlpha = env * dim;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float size = uDotSize * (0.7 + 0.6 * aRand) * mix(1.0, uFogScale, uFogMix);
      gl_PointSize = size * uPixelRatio * 120.0 / -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uAlpha, uFogMix, uCollapse;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c) * 2.0;
      float disk = 1.0 - smoothstep(0.45, 1.0, d);
      float a = vAlpha * uAlpha * disk * mix(0.85, 0.22, uFogMix);
      a *= 1.0 - uCollapse * 0.96;
      if (a < 0.004) discard;
      gl_FragColor = vec4(vColor, a);
    }
  `,
});
const swarm = new THREE.Points(swarmGeo, swarmMat);
swarm.frustumCulled = false;
swarmGroup.add(swarm);

let atomSampler = null;
let orbitalShells = [];   // subshellIndex per orbital
const sampleOut = [0, 0, 0];
const rng = Math.random;
let simTime = 0; // swarm clock (scaled by timeScale)

function seedPoint(i, stagger) {
  const oi = atomSampler.samplePoint(rng, sampleOut);
  positions[i * 3] = sampleOut[0];
  positions[i * 3 + 1] = sampleOut[1];
  positions[i * 3 + 2] = sampleOut[2];
  aShell[i] = orbitalShells[oi];
  aRand[i] = Math.random();
  aLife[i] = tuner.life * (0.6 + 0.8 * Math.random());
  aBirth[i] = simTime + (stagger ? Math.random() * 1.4 : 0);
}

function reseedAll(stagger) {
  if (!atomSampler) return;
  const n = Math.min(tuner.points, MAX_POINTS);
  for (let i = 0; i < n; i++) seedPoint(i, stagger);
  swarmGeo.setDrawRange(0, n);
  for (const key of ['position', 'aBirth', 'aLife', 'aShell', 'aRand']) {
    swarmGeo.getAttribute(key === 'position' ? 'position' : key).needsUpdate = true;
  }
}

function updateSwarm(dt) {
  if (!atomSampler) return;
  simTime += dt;
  swarmUniforms.uTime.value = simTime;
  const n = Math.min(tuner.points, MAX_POINTS);
  let touched = false;
  for (let i = 0; i < n; i++) {
    if (simTime - aBirth[i] > aLife[i]) { seedPoint(i, false); touched = true; }
  }
  if (touched) {
    swarmGeo.getAttribute('position').needsUpdate = true;
    swarmGeo.getAttribute('aBirth').needsUpdate = true;
    swarmGeo.getAttribute('aLife').needsUpdate = true;
    swarmGeo.getAttribute('aShell').needsUpdate = true;
    swarmGeo.getAttribute('aRand').needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// The nucleus — correct proton/neutron counts, magnified to be visible at all.

const nucleusGroup = new THREE.Group();
nucleusGroup.position.copy(ATOM_CENTER);
scene.add(nucleusGroup);

const protonMat = new THREE.MeshStandardMaterial({
  color: 0xb35a33, emissive: 0xff7f45, emissiveIntensity: 0.55, roughness: 0.5,
});
const neutronMat = new THREE.MeshStandardMaterial({
  color: 0x8b939c, emissive: 0x3a4148, emissiveIntensity: 0.35, roughness: 0.6,
});
const nucleonGeo = new THREE.SphereGeometry(0.13, 14, 12);
let nucleus = null; // { protons, neutrons, base: Vector3[], phases: Float32Array }

function buildNucleus(element) {
  if (nucleus) {
    nucleusGroup.remove(nucleus.protons, nucleus.neutrons);
    nucleus.protons.dispose(); nucleus.neutrons.dispose();
  }
  const A = element.Z + element.neutrons;
  const ballR = Math.max(0.001, 0.22 * Math.cbrt(A) - 0.1);
  const base = [];
  for (let i = 0; i < A; i++) {
    let p = null;
    for (let tries = 0; tries < 60; tries++) {
      const cand = new THREE.Vector3(
        (Math.random() * 2 - 1), (Math.random() * 2 - 1), (Math.random() * 2 - 1),
      );
      if (cand.lengthSq() > 1) continue;
      cand.multiplyScalar(ballR);
      if (base.every((b) => b.distanceTo(cand) > 0.2)) { p = cand; break; }
    }
    base.push(p || new THREE.Vector3().randomDirection().multiplyScalar(ballR * Math.cbrt(Math.random())));
  }
  const protons = new THREE.InstancedMesh(nucleonGeo, protonMat, element.Z);
  const neutrons = new THREE.InstancedMesh(nucleonGeo, neutronMat, Math.max(1, element.neutrons));
  neutrons.visible = element.neutrons > 0;
  nucleusGroup.add(protons, neutrons);
  nucleus = { protons, neutrons, base, phases: Float32Array.from({ length: A }, () => Math.random() * 6.28), Z: element.Z, N: element.neutrons };
  updateNucleus(0);
}

const nMat4 = new THREE.Matrix4();
function updateNucleus(t) {
  if (!nucleus) return;
  const { protons, neutrons, base, phases, Z, N } = nucleus;
  for (let i = 0; i < Z + N; i++) {
    const b = base[i], ph = phases[i];
    nMat4.makeTranslation(
      b.x + Math.sin(t * 2.1 + ph) * 0.02,
      b.y + Math.sin(t * 2.7 + ph * 1.7) * 0.02,
      b.z + Math.cos(t * 2.4 + ph * 0.6) * 0.02,
    );
    if (i < Z) protons.setMatrixAt(i, nMat4);
    else neutrons.setMatrixAt(i - Z, nMat4);
  }
  protons.instanceMatrix.needsUpdate = true;
  if (N > 0) neutrons.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Specimen vials

const vialGroup = new THREE.Group();
scene.add(vialGroup);
const vials = []; // { el, group, glow, sprite, hit, baseY, selected }

function labelSprite(symbol, Z) {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(210, 240, 250, 0.95)';
  ctx.font = '600 84px Consolas, monospace';
  ctx.shadowColor = 'rgba(110, 220, 255, 0.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(symbol, 96, 106);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(120, 160, 175, 0.9)';
  ctx.font = '32px Consolas, monospace';
  ctx.fillText(String(Z), 96, 152);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(1.5);
  return sprite;
}

ELEMENTS.forEach((el, i) => {
  const g = new THREE.Group();
  g.position.set(-8.6 + i * 1.35, 0, 4.1);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 1.15, 18),
    new THREE.MeshStandardMaterial({ color: 0xbfe2ee, transparent: true, opacity: 0.22, roughness: 0.15, metalness: 0.1 }),
  );
  glass.position.y = 0.62;
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.8, 14),
    new THREE.MeshBasicMaterial({ color: el.vialColor, transparent: true, opacity: 0.55 }),
  );
  glow.position.y = 0.58;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.16, 18), METAL_DARK);
  cap.position.y = 1.26;
  const sprite = labelSprite(el.symbol, el.Z);
  sprite.position.y = 2.05;
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 2.6, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = 1.2;
  hit.userData.symbol = el.symbol;
  g.add(glass, glow, cap, sprite, hit);
  vialGroup.add(g);
  vials.push({ el, group: g, glow, sprite, hit, baseY: 0, selected: false });
});

// Shallow rack under the vials.
const rack = new THREE.Mesh(new THREE.BoxGeometry(6.75 + 1.4, 0.14, 1.3), METAL_DARK);
rack.position.set(-8.6 + (ELEMENTS.length - 1) * 1.35 / 2, 0.07, 4.1);
bench.add(rack);

// ---------------------------------------------------------------------------
// Readout panel

const readout = document.getElementById('readout');
let fogMode = false;

function pips(el) {
  let html = '';
  for (let i = 0; i < el.capacity; i++) {
    if (i < el.valence) html += '<span class="pip full"></span>';
    else html += '<span class="pip want"></span>';
  }
  return html;
}

function renderReadout(el) {
  const A = el.Z + el.neutrons;
  const inert = el.seeking === 0;
  const cfgSpans = SUBSHELLS.filter((k) => el.fill[k]).map((k, idx) => {
    const color = '#' + SUBSHELL_COLORS[SUBSHELLS.indexOf(k)].toString(16).padStart(6, '0');
    const sup = el.config.split(' ')[idx];
    return `<span class="sub" style="transition-delay:${0.25 + idx * 0.3}s">
      <span class="dot" style="background:${color};color:${color}"></span>${sup}</span>`;
  }).join('');
  readout.innerHTML = `
    <p class="scope-tag">coherence scope · mk iv</p>
    <div class="specimen"><span class="sym">${el.symbol}</span><span class="name">${el.name}</span></div>
    <p class="zna">Z ${el.Z} · N ${el.neutrons} · A ${A}</p>
    <div class="cfg">${cfgSpans}</div>
    <div class="valence-row"><span class="lbl">valence</span>${pips(el)}</div>
    <p class="status ${inert ? 'inert' : 'reactive'}">${
      inert ? 'shell complete — inert'
        : `reactive — seeking ${el.seeking} electron${el.seeking > 1 ? 's' : ''}`}</p>
    <p class="flash" id="flash"></p>
    <div class="btns">
      <button id="btn-view">${fogMode ? 'view: fog' : 'view: swarm'}</button>
      <button id="btn-measure">measure</button>
    </div>
    <p class="foot">every dot is one sample of |ψ|² — the electron is the whole dance.<br>
    nucleus magnified ~2,000× beyond the cloud; at true scale it would be invisible.</p>`;
  requestAnimationFrame(() => requestAnimationFrame(() => readout.classList.add('loaded')));
  document.getElementById('btn-view').addEventListener('click', () => {
    fogMode = !fogMode;
    document.getElementById('btn-view').textContent = fogMode ? 'view: fog' : 'view: swarm';
  });
  document.getElementById('btn-measure').addEventListener('click', measure);
}

function flashMsg(msg) {
  const f = document.getElementById('flash');
  if (!f) return;
  f.textContent = msg;
  f.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => f.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------------------
// Measurement collapse

const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 12, 10),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
marker.visible = false;
swarmGroup.add(marker);
let collapse = { active: false, t0: 0 };

function measure() {
  if (!atomSampler || collapse.active) return;
  const n = Math.min(tuner.points, MAX_POINTS);
  const i = Math.floor(Math.random() * n);
  marker.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  marker.visible = true;
  collapse = { active: true, t0: performance.now() / 1000 };
  flashMsg('position measured — superposition restored');
}

function updateCollapse() {
  if (!collapse.active) return;
  const t = performance.now() / 1000 - collapse.t0;
  let k;
  if (t < 0.15) k = t / 0.15;
  else if (t < 1.05) k = 1;
  else if (t < 1.6) k = 1 - (t - 1.05) / 0.55;
  else { k = 0; collapse.active = false; marker.visible = false; }
  swarmUniforms.uCollapse.value = k;
  marker.scale.setScalar(1 + 0.35 * Math.sin(t * 22));
}

// ---------------------------------------------------------------------------
// Element loading

let currentSymbol = null;

function loadElement(symbol) {
  if (symbol === currentSymbol) return;
  currentSymbol = symbol;
  const el = getElement(symbol);
  atomSampler = makeAtomSampler(el);
  orbitalShells = el.orbitals.map((o) => o.subshellIndex);
  const maxN = Math.max(...el.orbitals.map((o) => o.n));
  const valenceKeys = SUBSHELLS.filter((k) => +k[0] === maxN && el.fill[k]);
  swarmUniforms.uValenceStart.value = Math.min(...valenceKeys.map((k) => SUBSHELLS.indexOf(k)));
  readout.classList.remove('loaded');
  renderReadout(el);
  buildNucleus(el);
  reseedAll(true);
  atomLight.color.set(el.seeking === 0 ? 0x7df0c9 : 0x66d9ff);
  for (const v of vials) v.selected = v.el.symbol === symbol;
  document.getElementById('hint')?.classList.add('gone');
}

// ---------------------------------------------------------------------------
// Pointer input — orbit drag, vial hover/click, wheel zoom.

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let dragging = false, downXY = null, moved = 0;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true; moved = 0; downXY = [e.clientX, e.clientY];
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (dragging && downXY) {
    const dx = e.clientX - downXY[0], dy = e.clientY - downXY[1];
    moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    orbit.tYaw = orbit.yaw + dx * -0.004;
    orbit.tPitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.003, -0.05, 0.85);
    downXY = [e.clientX, e.clientY];
    orbit.yaw = orbit.tYaw - (orbit.tYaw - orbit.yaw) * 0.5;
    orbit.lastInput = performance.now() / 1000;
  } else {
    pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(vials.map((v) => v.hit), false);
    const sym = hits[0]?.object.userData.symbol ?? null;
    for (const v of vials) v.hover = v.el.symbol === sym;
    canvas.classList.toggle('hovering', !!sym);
  }
});
canvas.addEventListener('pointerup', (e) => {
  canvas.classList.remove('dragging');
  if (dragging && moved < 6) {
    pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(vials.map((v) => v.hit), false);
    if (hits[0]) loadElement(hits[0].object.userData.symbol);
  }
  dragging = false;
  orbit.lastInput = performance.now() / 1000;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  orbit.tDist = THREE.MathUtils.clamp(orbit.tDist * (1 + Math.sign(e.deltaY) * 0.07), 9, 36);
  orbit.lastInput = performance.now() / 1000;
}, { passive: false });

// ---------------------------------------------------------------------------
// Tuner panel

function buildTuner() {
  const toggle = document.createElement('button');
  toggle.className = 'tuner-toggle';
  toggle.textContent = '⚙';
  toggle.setAttribute('aria-label', 'Open the tuner panel');
  document.body.appendChild(toggle);

  const panel = document.createElement('div');
  panel.className = 'tuner';
  panel.innerHTML = `<h2>tuner</h2><p class="stamp">valence lab ${BUILD}</p>`;
  document.body.appendChild(panel);
  toggle.addEventListener('click', () => panel.classList.toggle('open'));

  const rows = [
    ['points', 'swarm samples', 500, 24000, 100],
    ['dotSize', 'dot size', 0.4, 3, 0.05],
    ['life', 'sample life (s)', 0.4, 5, 0.05],
    ['brightness', 'swarm brightness', 0.2, 2, 0.05],
    ['coreDim', 'core shell dim', 0, 1, 0.05],
    ['fogScale', 'fog dot growth', 1.5, 6, 0.1],
    ['atomScale', 'atom scale', 0.8, 2.5, 0.05],
    ['timeScale', 'time scale', 0.1, 3, 0.05],
    ['orbitSpeed', 'idle orbit speed', 0, 0.3, 0.005],
    ['ringGlow', 'ring glow', 0, 3, 0.05],
  ];
  const inputs = {};
  for (const [key, label, min, max, step] of rows) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<label>${label}<span class="val"></span></label>`;
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min, max, step, value: tuner[key] });
    row.appendChild(input);
    panel.appendChild(row);
    const val = row.querySelector('.val');
    const show = () => { val.textContent = (+tuner[key]).toFixed(key === 'points' ? 0 : 2); };
    show();
    input.addEventListener('input', () => {
      const before = tuner.points;
      tuner[key] = +input.value;
      show();
      saveTuner();
      if (key === 'points' && tuner.points !== before) reseedAll(false);
    });
    inputs[key] = { input, show };
  }
  const reset = document.createElement('button');
  reset.className = 'reset';
  reset.textContent = 'reset to defaults';
  reset.addEventListener('click', () => {
    tuner = { ...DEFAULTS };
    saveTuner();
    for (const [key] of rows) { inputs[key].input.value = tuner[key]; inputs[key].show(); }
    reseedAll(false);
  });
  panel.appendChild(reset);
}
buildTuner();

// ---------------------------------------------------------------------------
// Main loop

let lastFrame = performance.now() / 1000;

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastFrame, 0.1) * tuner.timeScale;
  lastFrame = now;

  // Idle auto-orbit after 6 quiet seconds.
  if (now - orbit.lastInput > 6 && !dragging) orbit.tYaw += tuner.orbitSpeed * dt;

  applyCamera();
  updateSwarm(dt);
  updateNucleus(simTime);
  updateCollapse();

  // Smooth fog/swarm crossfade + live tuner uniforms.
  const u = swarmUniforms;
  u.uFogMix.value += ((fogMode ? 1 : 0) - u.uFogMix.value) * 0.06;
  u.uDotSize.value = tuner.dotSize;
  u.uAlpha.value = tuner.brightness;
  u.uCoreDim.value = tuner.coreDim;
  u.uFogScale.value = tuner.fogScale;

  swarmGroup.scale.setScalar(tuner.atomScale);
  ringGlowMat.color.setHSL(0.52, 0.75, THREE.MathUtils.clamp(0.28 * tuner.ringGlow + 0.18, 0.1, 0.85));
  atomLight.intensity = 0.5 + 0.5 * tuner.ringGlow;

  // Vial hover/selection motion.
  for (const v of vials) {
    const lift = v.selected ? 0.42 + Math.sin(now * 1.6) * 0.05 : v.hover ? 0.12 : 0;
    v.group.position.y += (lift - v.group.position.y) * 0.12;
    v.glow.material.opacity += ((v.selected || v.hover ? 0.95 : 0.55) - v.glow.material.opacity) * 0.1;
    v.sprite.material.opacity = v.selected ? 1 : 0.85;
  }

  renderer.render(scene, camera);
}

loadElement('O'); // oxygen greets you — reactive, lopsided, gorgeous
frame();

// Debug handle for agent sessions (see world CLAUDE.md).
window.__valenceLab = { renderer, scene, camera, loadElement, tuner };
