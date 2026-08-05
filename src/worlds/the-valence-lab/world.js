// The Valence Lab — phase B: the bonding bench.
// The coherence scope stages atoms fed from the vials; when its contents
// match a library molecule they bond instantly into the real thing — the
// swarm re-samples the molecule's Hartree-Fock |Psi|^2 (STO-3G, solved by
// tmp/the-valence-lab/hf/, baked in assets/molecules-data.js, verified by
// tmp/the-valence-lab/molecule-sim.mjs). Physics in a0 units; display
// scaling/orientation only ever happens here in world.js.

import * as THREE from 'three';
import { ELEMENTS, getElement, makeAtomSampler, SUBSHELLS, SUBSHELL_COLORS, radialR } from './orbitals.js';
import { MOLECULES_DATA } from './assets/molecules-data.js';
import { makeMoleculeSampler, buildIsoMesh } from './density.js';
import { tryAdd, hintText, displayFormula, RECIPES } from './valence.js';
import {
  SUBSHELL_TYPE, LETTER_ORIGIN_NOTE, shellBreakdown, reactivityBlurb,
  ELEMENT_OVERVIEW, MOLECULE_OVERVIEW, MOLECULE_HOOK, VIEW_MODE_TEXT,
} from './content.js';

const BUILD = 'v4 · phase B · the exhibit rebuild · 2026-08-04';
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
  orbitSpeed: 0,     // idle auto-orbit rad/s (off by default; slider brings it back)
  ringGlow: 1.2,     // scope ring emissive intensity
  ghostOpacity: 0.10, // shell visibility 0..1 (James's default: very subtle)
  swarmOpacity: 1.0,  // swarm visibility 0..1 — A/B lever against the shells
  shellS: 1,          // staged-atom s-sphere shells on/off
  shellP: 1,          // staged-atom p-dumbbell shells on/off
  textScale: 1.25,    // console type size multiplier (world.css --ui-scale;
                      // its CSS fallback must match this — it paints first)
};
let tuner = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(TUNER_KEY) || '{}');
  if (saved.orbitSpeed === 0.05) delete saved.orbitSpeed; // pre-v1.1 default, before auto-orbit went off-by-default
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
  yaw: 0.0, pitch: 0.18, dist: 24.5,
  tYaw: 0.0, tPitch: 0.18, tDist: 24.5,
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

// Specimen spin — click-drag rotates the atom/molecule itself, not the bench.
// Damped like the camera orbit (no snap): a live target quaternion accumulates
// drag deltas, the current quaternion eases toward it every frame.
const molSpin = { q: new THREE.Quaternion(), tQ: new THREE.Quaternion() };
const MOL_SPIN_Y = new THREE.Vector3(0, 1, 0);
const MOL_SPIN_X = new THREE.Vector3(1, 0, 0);
const _spinDelta = new THREE.Quaternion();
function applyMolSpin() {
  molSpin.q.slerp(molSpin.tQ, 0.08);
  // nucleusGroup's cluster offsets already bake scopeState.quat at layout time
  // (rebuildSceneForScope), so the group itself only needs the live spin;
  // swarm/ghost quaternions are reset to scopeState.quat each rebuild, so they
  // need spin composed on top.
  swarmGroup.quaternion.multiplyQuaternions(molSpin.q, scopeState.quat);
  ghostGroup.quaternion.copy(swarmGroup.quaternion);
  nucleusGroup.quaternion.copy(molSpin.q);
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

// A soft procedural environment map — gives metal and glass something to
// actually reflect instead of flat color, without needing an external HDR.
// James's ask ("doesn't look like plastic or glass, looks like a generic
// Blender shape") — this is the free half of the fix; Meshy tile textures
// are the other half, applied further down once generated.
{
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(20, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x1c2f3a, side: THREE.BackSide }),
  ));
  const panelCool = new THREE.MeshBasicMaterial({ color: 0x8fd8ee });
  const panelWarm = new THREE.MeshBasicMaterial({ color: 0xffb36b });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), panelCool);
  p1.position.set(0, 8, -10);
  envScene.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), panelWarm);
  p2.position.set(-9, 2, 4); p2.rotation.y = Math.PI / 3;
  envScene.add(p2);
  const p3 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), panelCool);
  p3.position.set(9, 2, 4); p3.rotation.y = -Math.PI / 3;
  envScene.add(p3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.05).texture;
  pmrem.dispose();
}

// ---------------------------------------------------------------------------
// The bench

const bench = new THREE.Group();
scene.add(bench);

// Meshy-generated seamless tiles (2026-08-04, James's ask — "doesn't look
// like plastic or glass, looks like a generic Blender shape"): brushed steel
// for the bright metal, a dark riveted panel for the housing, both repeated
// via RepeatWrapping so one 1024px tile covers bench-scale geometry.
const texLoader = new THREE.TextureLoader();
function tiledTexture(path, repeatX, repeatY) {
  const tex = texLoader.load(`./assets/textures/${path}`);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const metalTex = tiledTexture('metal-panel.png', 2, 1);
const metalDarkTex = tiledTexture('metal-panel-dark.png', 3, 3);
const METAL = new THREE.MeshStandardMaterial({ color: 0xaab2b8, map: metalTex, metalness: 0.9, roughness: 0.32 });
const METAL_DARK = new THREE.MeshStandardMaterial({ color: 0x8a939a, map: metalDarkTex, metalness: 0.85, roughness: 0.42 });

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

// ---------------------------------------------------------------------------
// Scope state. 'staged' holds 1..k loose atoms (Phase A view is the 1-atom
// case); 'molecule' holds one bonded library molecule; 'empty' after a flush.

const scopeState = {
  mode: 'empty',
  contents: {},        // multiset, e.g. { H: 1, O: 1 }
  staged: [],          // { symbol, el, sampler, shells, valenceStart, offset }
  cumWeights: [],      // cumulative electron counts for staged sampling
  totalWeight: 0,
  molecule: null,      // baked record from MOLECULES_DATA
  recipe: null,        // matching valence.js recipe
  molSampler: null,
  elementSlot: {},     // symbol -> palette slot (molecule mode)
  displayScale: tuner.atomScale,
  quat: new THREE.Quaternion(),
};

// Display-only orientation per molecule (physics stays in its own frame):
// long molecules lie across the ring (z->x), polar ones stand up (z->y).
const QUAT_ZX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const QUAT_ZY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const QUAT_ID = new THREE.Quaternion();
const MOL_ORIENT = {
  H2: QUAT_ZX, N2: QUAT_ZX, O2: QUAT_ZX, CO2: QUAT_ZX, H2O2: QUAT_ZX,
  H2O: QUAT_ZY, NH3: QUAT_ZY, CH4: QUAT_ID, C2H4: QUAT_ID,
};

// Element glow colors for the bonded swarm (CPK-ish, brightened for
// additive blending). Display only — never physics.
const ELEMENT_GLOW = { H: 0xf0f4f8, C: 0xb9c4d0, N: 0x6f8dff, O: 0xff7a60 };
const REFUSAL_RED = new THREE.Color(0xff4a3c);
const FORM_WHITE = new THREE.Color(0xeafcff);

function setAtomPalette() {
  palette.forEach((c, i) => c.setHex(SUBSHELL_COLORS[i]));
}
function setMoleculePalette(rec) {
  scopeState.elementSlot = {};
  let slot = 0;
  for (const at of rec.atoms) {
    if (scopeState.elementSlot[at.symbol] === undefined) {
      scopeState.elementSlot[at.symbol] = slot;
      palette[slot].setHex(ELEMENT_GLOW[at.symbol]);
      slot++;
    }
  }
}

const sampleOut = [0, 0, 0];
const rng = Math.random;
let simTime = 0; // swarm clock (scaled by timeScale)

function pickStagedIndex() {
  const r = rng() * scopeState.totalWeight;
  let i = 0;
  while (scopeState.cumWeights[i] < r) i++;
  return i;
}

function seedPoint(i, stagger) {
  if (scopeState.mode === 'molecule') {
    const ai = scopeState.molSampler.samplePoint(sampleOut);
    positions[i * 3] = sampleOut[0];
    positions[i * 3 + 1] = sampleOut[1];
    positions[i * 3 + 2] = sampleOut[2];
    aShell[i] = scopeState.elementSlot[scopeState.molecule.atoms[ai].symbol];
  } else {
    const st = scopeState.staged[pickStagedIndex()];
    const oi = st.sampler.samplePoint(rng, sampleOut);
    positions[i * 3] = sampleOut[0] + st.offset;
    positions[i * 3 + 1] = sampleOut[1];
    positions[i * 3 + 2] = sampleOut[2];
    aShell[i] = st.shells[oi];
  }
  aRand[i] = Math.random();
  aLife[i] = tuner.life * (0.6 + 0.8 * Math.random());
  aBirth[i] = simTime + (stagger ? Math.random() * 1.4 : 0);
}

function scopeIsLive() {
  return scopeState.mode === 'molecule' ? !!scopeState.molSampler : scopeState.staged.length > 0;
}

function reseedAll(stagger) {
  if (!scopeIsLive()) { swarmGeo.setDrawRange(0, 0); return; }
  const n = Math.min(tuner.points, MAX_POINTS);
  for (let i = 0; i < n; i++) seedPoint(i, stagger);
  swarmGeo.setDrawRange(0, n);
  for (const key of ['position', 'aBirth', 'aLife', 'aShell', 'aRand']) {
    swarmGeo.getAttribute(key).needsUpdate = true;
  }
}

function updateSwarm(dt) {
  simTime += dt;
  swarmUniforms.uTime.value = simTime;
  if (!scopeIsLive()) return;
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
let nuclei = []; // clusters: { group, protons, neutrons, base, phases, Z, N }

// entries: [{ element, worldOffset: Vector3 }] — one jittering cluster each.
function buildNuclei(entries) {
  for (const c of nuclei) {
    nucleusGroup.remove(c.group);
    c.protons.dispose(); c.neutrons.dispose();
  }
  nuclei = [];
  for (const { element, worldOffset } of entries) {
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
    const group = new THREE.Group();
    group.position.copy(worldOffset);
    group.add(protons, neutrons);
    nucleusGroup.add(group);
    nuclei.push({
      group, protons, neutrons, base,
      phases: Float32Array.from({ length: A }, () => Math.random() * 6.28),
      Z: element.Z, N: element.neutrons,
    });
  }
  updateNuclei(0);
}

const nMat4 = new THREE.Matrix4();
function updateNuclei(t) {
  for (const c of nuclei) {
    const { protons, neutrons, base, phases, Z, N } = c;
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
}

// ---------------------------------------------------------------------------
// Ghost shells — James's "barely there" orbital silhouettes (default 10%
// opacity). Molecule mode: the rho = 0.004 e/a0^3 isosurface of the real HF
// density, carved at runtime by density.js from the baked D. Staged atoms:
// analytic isosurfaces of the same hydrogen-like orbitals the swarm samples
// (s spheres, p dumbbells). Display geometry only — never a distribution.

const ghostGroup = new THREE.Group();
ghostGroup.position.copy(ATOM_CENTER);
scene.add(ghostGroup);

const ghostMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uOpacity: { value: tuner.ghostOpacity },
    uColor: { value: new THREE.Color(0x9fdcff) },
  },
  vertexShader: /* glsl */`
    varying vec3 vN, vV;
    void main() {
      vN = normalMatrix * normal;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uOpacity;
    uniform vec3 uColor;
    varying vec3 vN, vV;
    void main() {
      float fres = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      float a = uOpacity * (0.25 + 0.9 * pow(fres, 2.2));
      if (a < 0.003) discard;
      gl_FragColor = vec4(uColor, a);
    }
  `,
});

const molGhostGeoCache = {};
function moleculeGhostGeometry(rec) {
  if (!molGhostGeoCache[rec.id]) {
    const mesh = buildIsoMesh(rec, { iso: MOLECULES_DATA.meta.ghostIso });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
    geo.setIndex(mesh.indices);
    geo.computeVertexNormals();
    molGhostGeoCache[rec.id] = geo;
  }
  return molGhostGeoCache[rec.id];
}

// Last radius (a0) where the radial density r^2 R^2 still holds `frac` of
// its peak — the visual edge of a subshell.
function tailRadius(n, l, zeff, frac) {
  const rmax = (14 * n + 6) / zeff;
  const steps = 900;
  const vals = new Float64Array(steps + 1);
  let peak = 0;
  for (let i = 0; i <= steps; i++) {
    const r = (i / steps) * rmax;
    const R = radialR(n, l, zeff, r);
    vals[i] = r * r * R * R;
    peak = Math.max(peak, vals[i]);
  }
  for (let i = steps; i >= 0; i--) {
    if (vals[i] >= peak * frac) return (i / steps) * rmax;
  }
  return rmax * 0.5;
}

// Lathe profile of a p-orbital density isosurface: R^2(r) cos^2(theta) = C,
// with C anchored at the lobe tip. Gives the classic dumbbell, pinched at
// the node plane.
function pLobeGeometry(n, zeff) {
  const rTip = tailRadius(n, 1, zeff, 0.12);
  const Rsq = (r) => { const R = radialR(n, 1, zeff, r); return R * R; };
  let rPk = rTip * 0.3, best = 0;
  for (let i = 1; i <= 400; i++) {
    const r = (i / 400) * rTip;
    if (Rsq(r) > best) { best = Rsq(r); rPk = r; }
  }
  const C = Rsq(rTip);
  const upper = [];
  const NSEG = 24;
  for (let s = 0; s <= NSEG; s++) {
    const th = (s / NSEG) * (Math.PI / 2 - 0.05);
    const target = C / (Math.cos(th) * Math.cos(th));
    let r = 0;
    if (Rsq(rPk) >= target) {
      let lo = rPk, hi = rTip * 1.5;
      for (let b = 0; b < 36; b++) {
        const mid = 0.5 * (lo + hi);
        if (Rsq(mid) >= target) lo = mid; else hi = mid;
      }
      r = 0.5 * (lo + hi);
    }
    upper.push(new THREE.Vector2(Math.max(0.02, r * Math.sin(th)), r * Math.cos(th)));
  }
  const pts = [new THREE.Vector2(0.02, rTip), ...upper.slice(1)];
  const lower = [...pts].reverse().map((p) => new THREE.Vector2(p.x, -p.y));
  return new THREE.LatheGeometry([...pts, ...lower], 30);
}

const atomGhostGeoCache = {};
function atomGhostParts(el) {
  if (!atomGhostGeoCache[el.symbol]) {
    const parts = [];
    const maxN = Math.max(...el.orbitals.map((o) => o.n));
    for (const o of el.orbitals) {
      if (o.n !== maxN) continue; // valence shell only — subtle, not soup
      if (o.l === 0) {
        parts.push({ geo: new THREE.SphereGeometry(tailRadius(o.n, 0, o.zeff, 0.12), 28, 20), axis: null });
      } else {
        parts.push({ geo: pLobeGeometry(o.n, o.zeff), axis: o.axis });
      }
    }
    atomGhostGeoCache[el.symbol] = parts;
  }
  return atomGhostGeoCache[el.symbol];
}

function rebuildGhosts() {
  ghostGroup.clear();
  if (scopeState.mode === 'molecule') {
    ghostGroup.add(new THREE.Mesh(moleculeGhostGeometry(scopeState.molecule), ghostMat));
  } else {
    for (const st of scopeState.staged) {
      for (const part of atomGhostParts(st.el)) {
        // Per-shape science toggles (scope controls): s spheres / p dumbbells.
        if (part.axis === null && !tuner.shellS) continue;
        if (part.axis !== null && !tuner.shellP) continue;
        const m = new THREE.Mesh(part.geo, ghostMat);
        m.position.x = st.offset;
        if (part.axis === 'x') m.rotation.z = -Math.PI / 2;
        else if (part.axis === 'z') m.rotation.x = Math.PI / 2;
        ghostGroup.add(m);
      }
    }
  }
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

// Frosted-glass tile (Meshy, 2026-08-04) — subtle etched-circuit relief and
// roughness variation on the vial glass, low intensity so the transmission
// underneath still reads clearly.
const glassFrostTex = tiledTexture('glass-frost.png', 1, 1);
const glassBumpTex = texLoader.load('./assets/textures/glass-frost.png');
glassBumpTex.wrapS = glassBumpTex.wrapT = THREE.RepeatWrapping;

ELEMENTS.forEach((el, i) => {
  const g = new THREE.Group();
  g.position.set(-8.6 + i * 1.35, 0, 4.1);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 1.15, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0xeaf6fb, metalness: 0, roughness: 0.1, roughnessMap: glassFrostTex,
      transmission: 1, thickness: 0.45,
      ior: 1.45, transparent: true, clearcoat: 0.7, clearcoatRoughness: 0.18,
      bumpMap: glassBumpTex, bumpScale: 0.006,
      attenuationColor: new THREE.Color(0xbfe2ee), attenuationDistance: 1.4,
    }),
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
// The exhibit HUD — floating glass panels around the scope, James's 2026-08-04
// brief: not one config box, but several holographic placards you read like a
// museum exhibit. Six panels, most open by default, "fine tuning" tucked away:
// specimen (identity + valence/reactivity), electron shells (clickable,
// plain-English), what is this? (overview paragraph), viewing modes (swarm/
// fog/shells explainer + the shell<->cloud crossfade sliders), try this
// (recipe book), fine tuning (the old detailed slider deck).

const hud = document.getElementById('hud');
let fogMode = false;
// Eased toward the viewing-modes sliders every frame — see frame() below.
let shellVisEnv = tuner.ghostOpacity;
let swarmVisEnv = tuner.swarmOpacity;

// Panels are draggable by their header and remember where James puts them
// (his ask, 2026-08-04: "let me move panels where I want, and record it").
// Position is auto-saved the moment a drag ends — no separate "save" step —
// same philosophy as the tuner sliders (every change persists immediately).
const PANEL_POS_KEY = 'valence-lab-panel-pos-v1';
let panelPositions = {};
try { panelPositions = JSON.parse(localStorage.getItem(PANEL_POS_KEY) || '{}'); } catch { /* fresh */ }
function savePanelPositions() {
  try { localStorage.setItem(PANEL_POS_KEY, JSON.stringify(panelPositions)); } catch { /* no-op */ }
}
function clampPanelPos(left, top, w, h) {
  return {
    left: Math.min(Math.max(left, 4), Math.max(4, window.innerWidth - w - 4)),
    top: Math.min(Math.max(top, 4), Math.max(4, window.innerHeight - Math.min(h, 48))),
  };
}
function pinPanel(panel, left, top) {
  panel.style.position = 'fixed';
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none'; // overrides hud-col-bottom's translateX centering
  panel.classList.add('dragged');
}

function makeDraggable(panel) {
  const header = panel.querySelector('.ph');
  let dragging = false, moved = 0, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  header.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = 0;
    const rect = panel.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    try { header.setPointerCapture(e.pointerId); } catch { /* no-op */ }
  });
  header.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (moved > 6) {
      const { left, top } = clampPanelPos(
        startLeft + (e.clientX - startX), startTop + (e.clientY - startY),
        panel.offsetWidth, panel.offsetHeight,
      );
      pinPanel(panel, left, top);
    }
  });
  header.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    // releasePointerCapture can throw (pointer already gone, capture never
    // granted, etc.) — never let that swallow the collapse-toggle below.
    try { header.releasePointerCapture(e.pointerId); } catch { /* no-op */ }
    if (moved > 6) {
      panelPositions[panel.id] = { left: parseFloat(panel.style.left), top: parseFloat(panel.style.top) };
      savePanelPositions();
    } else {
      panel.classList.toggle('collapsed'); // a real click, not a drag — toggle open/closed
    }
  });
}

// Clears every remembered position — panels fall back to their default
// column layout on next load. Wired into the fine-tuning panel's reset.
function resetPanelPositions() {
  panelPositions = {};
  try { localStorage.removeItem(PANEL_POS_KEY); } catch { /* no-op */ }
  for (const panel of document.querySelectorAll('.hud-panel.dragged')) {
    panel.classList.remove('dragged');
    panel.style.position = ''; panel.style.left = ''; panel.style.top = '';
    panel.style.right = ''; panel.style.bottom = ''; panel.style.transform = '';
  }
}

function makePanel(column, id, title, { open = true } = {}) {
  const panel = document.createElement('div');
  panel.className = `hud-panel${open ? '' : ' collapsed'}`;
  panel.id = id;
  panel.innerHTML = `
    <button class="ph" type="button"><span class="ph-title">${title}</span><span class="ph-chev">⌄</span></button>
    <div class="pbody"></div>`;
  document.getElementById(column).appendChild(panel);
  makeDraggable(panel);
  const saved = panelPositions[id];
  if (saved) {
    const { left, top } = clampPanelPos(saved.left, saved.top, panel.offsetWidth, panel.offsetHeight);
    pinPanel(panel, left, top);
  }
  return panel.querySelector('.pbody');
}

const pbodySpecimen = makePanel('hud-right', 'panel-specimen', 'specimen');
const pbodyShells = makePanel('hud-right', 'panel-shells', 'electron shells');
const pbodyAbout = makePanel('hud-left', 'panel-about', 'what is this?');
const pbodyViewing = makePanel('hud-left', 'panel-viewing', 'viewing modes');
const pbodyTry = makePanel('hud-bottom', 'panel-try', 'try this');
const pbodyFine = makePanel('hud-corner', 'panel-fine', 'fine tuning', { open: false });

// Click-to-expand shell rows (delegated once — the panel's innerHTML gets
// rebuilt on every atom, so per-row listeners would never survive).
pbodyShells.addEventListener('click', (e) => {
  const head = e.target.closest('.shell-sub-head');
  if (head) head.closest('.shell-sub')?.classList.toggle('expanded');
});

// A fresh bond or a refusal must always be seen wherever the visitor was
// looking — expand the specimen panel if it's collapsed and give it a brief
// attention pulse. (Replaces the old tab-switch now that panels are all
// visible at once.)
function selectTab(name) {
  const panel = document.getElementById(`panel-${name}`);
  if (!panel) return;
  panel.classList.remove('collapsed');
  panel.classList.add('pulse');
  setTimeout(() => panel.classList.remove('pulse'), 900);
}

function pips(el) {
  let html = '';
  for (let i = 0; i < el.capacity; i++) {
    if (i < el.valence) html += '<span class="pip full"></span>';
    else html += '<span class="pip want"></span>';
  }
  return html;
}

function hintsHtml() {
  const h = hintText(scopeState.contents);
  return h ? `<p class="hints">${h}</p>` : '';
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// --- specimen panel: identity + an enriched valence/reactivity readout -----

function valenceBlockHtml(el) {
  return `<div class="valence-row"><span class="lbl">outer-shell electrons</span>
      <span class="valence-count">${el.valence} of ${el.capacity}</span></div>
    <div class="valence-pips">${pips(el)}</div>
    <p class="status ${el.seeking === 0 ? 'inert' : 'reactive'}">${reactivityBlurb(el)}</p>`;
}

function specimenActionsHtml() {
  return `<div class="btns"><button id="btn-measure">measure</button><button id="btn-flush">flush the scope</button></div>`;
}

function wireSpecimenButtons() {
  requestAnimationFrame(() => requestAnimationFrame(() => hud.classList.add('loaded')));
  document.getElementById('btn-measure')?.addEventListener('click', measure);
  document.getElementById('btn-flush')?.addEventListener('click', flushScope);
}

function renderSpecimenAtom(el) {
  const A = el.Z + el.neutrons;
  pbodySpecimen.innerHTML = `
    <div class="specimen"><span class="sym">${el.symbol}</span><span class="name">${el.name}</span></div>
    <p class="zna">${el.Z} proton${el.Z === 1 ? '' : 's'} · ${el.neutrons} neutron${el.neutrons === 1 ? '' : 's'} ·
      ${A} particles in the nucleus total <i>(chemists call this the mass number)</i></p>
    ${valenceBlockHtml(el)}
    ${hintsHtml()}
    <p class="flash" id="flash"></p>
    ${specimenActionsHtml()}`;
  wireSpecimenButtons();
}

function renderSpecimenStaged() {
  const names = scopeState.staged.map((s) => s.el.name).join(' + ');
  pbodySpecimen.innerHTML = `
    <div class="specimen"><span class="sym">${displayFormula(scopeState.contents)}</span>
      <span class="name">${names} — staged, unbonded</span></div>
    <p class="status reactive">holding ${countStaged()} atoms in the field — not a molecule yet</p>
    ${hintsHtml()}
    <p class="flash" id="flash"></p>
    ${specimenActionsHtml()}`;
  wireSpecimenButtons();
}

function renderSpecimenMolecule(rec, recipe) {
  const dipoleLine = rec.dipoleD > 0.05
    ? `<p class="zna">dipole ${rec.dipoleD.toFixed(2)} D — one side of the molecule is slightly + charged,
       the other slightly −, which is what "lopsided" means here</p>` : '';
  const noteLine = recipe.note ? `<p class="status reactive">${recipe.note}</p>` : '';
  pbodySpecimen.innerHTML = `
    <div class="specimen"><span class="sym">${recipe.display}</span><span class="name">${rec.name}</span></div>
    <p class="zna">${rec.bondWord}</p>
    <p class="status inert">bonded — released ~${rec.atomizationEv.toFixed(1)} eV of energy versus the free atoms
      <i>(${rec.method} estimate)</i></p>
    ${dipoleLine}
    ${noteLine}
    <p class="flash" id="flash"></p>
    ${specimenActionsHtml()}`;
  wireSpecimenButtons();
}

function renderSpecimenEmpty() {
  pbodySpecimen.innerHTML = `
    <div class="specimen"><span class="sym">—</span><span class="name">scope empty</span></div>
    <p class="status inert">coherence field idle — feed it an atom from the vials below</p>
    <p class="flash" id="flash"></p>`;
  wireSpecimenButtons();
}

// --- electron shells panel: clickable, plain-English shell breakdown ------

function shellsHtml(el) {
  const rows = shellBreakdown(el).map((s) => {
    const full = s.total >= s.capacity;
    const subRows = s.subshells.map((sub) => {
      const t = SUBSHELL_TYPE[sub.letter];
      const color = '#' + SUBSHELL_COLORS[SUBSHELLS.indexOf(sub.key)].toString(16).padStart(6, '0');
      return `<div class="shell-sub" data-sub="${sub.key}">
          <button class="shell-sub-head" type="button">
            <span class="dot" style="background:${color};color:${color}"></span>
            <span class="shell-sub-label">${sub.key} <i>— ${t.shapeName}</i></span>
            <span class="shell-sub-count">${sub.count} e⁻</span>
            <span class="chev">⌄</span>
          </button>
          <div class="shell-sub-detail">${t.blurb}</div>
        </div>`;
    }).join('');
    return `<div class="shell-row ${s.isOuter ? 'outer' : ''}">
        <div class="shell-row-head">
          <span class="shell-name">${cap(s.ordinal)} shell${s.isOuter ? ' — the outer shell' : ''}</span>
          <span class="shell-count">${s.total} of ${s.capacity}${full ? ' · full' : ''}</span>
        </div>
        ${subRows}
      </div>`;
  }).join('');
  const shapeToggles = `<div class="shell-shapes">
      <label class="ctl-check"><input type="checkbox" id="chk-shellS" ${tuner.shellS >= 1 ? 'checked' : ''}>
        show the ball shapes (s)</label>
      <label class="ctl-check"><input type="checkbox" id="chk-shellP" ${tuner.shellP >= 1 ? 'checked' : ''}>
        show the dumbbell shapes (p)</label>
    </div>`;
  return `${rows}${shapeToggles}<p class="shell-note">${LETTER_ORIGIN_NOTE}</p>`;
}

function wireShellShapeToggles() {
  document.getElementById('chk-shellS')?.addEventListener('change', (e) => {
    tuner.shellS = e.target.checked ? 1 : 0; saveTuner(); rebuildGhosts();
  });
  document.getElementById('chk-shellP')?.addEventListener('change', (e) => {
    tuner.shellP = e.target.checked ? 1 : 0; saveTuner(); rebuildGhosts();
  });
}

function renderShellsAtom(el) {
  pbodyShells.innerHTML = shellsHtml(el);
  wireShellShapeToggles();
}

function renderShellsStaged() {
  pbodyShells.innerHTML = scopeState.staged
    .map((s) => `<p class="shell-atom-label">${s.el.name}</p>${shellsHtml(s.el)}`)
    .join('<hr class="shell-divider">');
  wireShellShapeToggles();
}

function renderShellsMolecule(rec, recipe) {
  const rows = Object.entries(recipe.lewis).map(([sym, { bonds, lonePairs }]) => {
    const total = 2 * bonds + 2 * lonePairs;
    const lone = lonePairs > 0
      ? ` + ${lonePairs} lone pair${lonePairs === 1 ? '' : 's'} it keeps entirely to itself` : '';
    return `<div class="shell-row">
        <div class="shell-row-head"><span class="shell-name">${getElement(sym).name}</span>
          <span class="shell-count">${total} outer electrons</span></div>
        <p class="shell-note">${bonds} shared pair${bonds === 1 ? '' : 's'} — each one a bond holding two
          nuclei together${lone}.</p>
      </div>`;
  }).join('');
  pbodyShells.innerHTML = `<p class="shell-note">once atoms bond, their outer electrons stop belonging to a
      single atom. some become <b>shared pairs</b> — the bonds themselves — and some stay <b>lone pairs</b>,
      kept by one atom alone. here's how ${recipe.display}'s outer electrons are spent:</p>${rows}`;
}

function renderShellsEmpty() {
  pbodyShells.innerHTML = '<p class="shell-note">feed the scope an atom to see its electron shells, one cloud at a time.</p>';
}

// --- "what is this?" panel: the plain-English overview -------------------

function renderAboutAtom(el) {
  pbodyAbout.innerHTML = `<p class="about-text">${ELEMENT_OVERVIEW[el.symbol]}</p>`;
}

function renderAboutStaged() {
  const names = scopeState.staged.map((s) => s.el.name).join(' and ');
  pbodyAbout.innerHTML = `<p class="about-text">You're holding ${names} in the field, unbonded. Feed a matching
    combination from the vials and watch them snap together the instant the outer shells line up — see
    <b>try this</b> below for the full recipe book.</p>`;
}

function renderAboutMolecule(rec) {
  pbodyAbout.innerHTML = `<p class="about-text">${MOLECULE_OVERVIEW[rec.id]}</p>`;
}

function renderAboutEmpty() {
  pbodyAbout.innerHTML = `<p class="about-text">This is the coherence scope — a window onto the atomic world
    you can never see with your own eyes. Click a vial below to feed it an atom, and its electron cloud blooms
    into view right here, in real time. Nothing you're about to see is artist's impression — it's the actual
    math, solved live on this bench.</p>`;
}

// --- refresh helpers: re-render whichever panel from the live scopeState --

function refreshSpecimenPanel() {
  if (scopeState.mode === 'molecule') renderSpecimenMolecule(scopeState.molecule, scopeState.recipe);
  else if (scopeState.staged.length > 1) renderSpecimenStaged();
  else if (scopeState.staged.length === 1) renderSpecimenAtom(scopeState.staged[0].el);
  else renderSpecimenEmpty();
}
function refreshShellsPanel() {
  if (scopeState.mode === 'molecule') renderShellsMolecule(scopeState.molecule, scopeState.recipe);
  else if (scopeState.staged.length > 1) renderShellsStaged();
  else if (scopeState.staged.length === 1) renderShellsAtom(scopeState.staged[0].el);
  else renderShellsEmpty();
}
function refreshAboutPanel() {
  if (scopeState.mode === 'molecule') renderAboutMolecule(scopeState.molecule);
  else if (scopeState.staged.length > 1) renderAboutStaged();
  else if (scopeState.staged.length === 1) renderAboutAtom(scopeState.staged[0].el);
  else renderAboutEmpty();
}

// --- viewing modes panel: swarm/fog/shells explainer + the crossfade ------

function syncViewingSliders() {
  const sw = document.getElementById('sl-swarmOpacity');
  const gh = document.getElementById('sl-ghostOpacity');
  if (sw) sw.value = tuner.swarmOpacity;
  if (gh) gh.value = tuner.ghostOpacity;
  const swv = document.getElementById('val-swarmOpacity');
  const ghv = document.getElementById('val-ghostOpacity');
  if (swv) swv.textContent = `${Math.round(tuner.swarmOpacity * 100)}%`;
  if (ghv) ghv.textContent = `${Math.round(tuner.ghostOpacity * 100)}%`;
}

function buildViewingPanel() {
  pbodyViewing.innerHTML = `
    <p class="view-note"><b>swarm</b> — ${VIEW_MODE_TEXT.swarm}</p>
    <p class="view-note"><b>fog</b> — ${VIEW_MODE_TEXT.fog}</p>
    <div class="btns"><button id="btn-view">${fogMode ? 'view: fog' : 'view: swarm'}</button></div>
    <p class="view-note"><b>shells</b> — ${VIEW_MODE_TEXT.shells}</p>
    <div class="ctl-row big"><label>electron cloud brightness<span class="val" id="val-swarmOpacity"></span></label>
      <input type="range" id="sl-swarmOpacity" min="0" max="1" step="0.01" value="${tuner.swarmOpacity}"></div>
    <div class="ctl-row big"><label>fade in the shells<span class="val" id="val-ghostOpacity"></span></label>
      <input type="range" id="sl-ghostOpacity" min="0" max="1" step="0.01" value="${tuner.ghostOpacity}"></div>
    <p class="foot">every glowing point is one real sample of |ψ|² (the electron's wavefunction) — the electron
      is the whole spread, not any single dot. nuclei are magnified ~2,000× beyond the cloud; at true scale
      they'd be invisible.</p>`;
  syncViewingSliders();
  document.getElementById('btn-view')?.addEventListener('click', () => {
    fogMode = !fogMode;
    document.getElementById('btn-view').textContent = fogMode ? 'view: fog' : 'view: swarm';
  });
  document.getElementById('sl-swarmOpacity')?.addEventListener('input', (e) => {
    tuner.swarmOpacity = +e.target.value; saveTuner(); syncViewingSliders();
  });
  document.getElementById('sl-ghostOpacity')?.addEventListener('input', (e) => {
    tuner.ghostOpacity = +e.target.value; saveTuner(); syncViewingSliders();
  });
}
buildViewingPanel();

function flashMsg(msg, bad = false) {
  const f = document.getElementById('flash');
  if (!f) return;
  f.textContent = msg;
  f.classList.toggle('bad', bad);
  f.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => f.classList.remove('show'), bad ? 4200 : 2600);
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
  if (!scopeIsLive() || collapse.active) return;
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
// Scope management — staging, bonding, refusal, flush.

const refusalFlash = { t0: -10 };
const formFlash = { t0: -10, power: 0 };

function countStaged() { return scopeState.staged.length; }

function visualRadius(el) {
  let r = 0;
  for (const o of el.orbitals) r = Math.max(r, tailRadius(o.n, o.l, o.zeff, 0.2));
  return r;
}

function layoutStaged() {
  const radii = scopeState.staged.map((s) => visualRadius(s.el));
  const xs = [0];
  for (let i = 1; i < radii.length; i++) {
    xs.push(xs[i - 1] + Math.max(3.4, (radii[i - 1] + radii[i]) * 0.8));
  }
  const mid = (xs[0] + xs[xs.length - 1]) / 2;
  scopeState.staged.forEach((s, i) => { s.offset = xs[i] - mid; });
  const width = (xs[xs.length - 1] - xs[0]) + 2 * Math.max(...radii);
  scopeState.fitLimit = width > 0.01 ? 11.4 / width : Infinity;
}

function rebuildSceneForScope() {
  scopeState.totalWeight = 0;
  scopeState.cumWeights = scopeState.staged.map((s) => (scopeState.totalWeight += s.el.electronCount));
  if (scopeState.mode === 'molecule') {
    setMoleculePalette(scopeState.molecule);
    swarmUniforms.uValenceStart.value = 0;
  } else {
    setAtomPalette();
    if (scopeState.staged.length) {
      swarmUniforms.uValenceStart.value = Math.min(...scopeState.staged.map((s) => s.valenceStart));
    }
  }
  applyMolSpin();
  scopeState.displayScale = Math.min(tuner.atomScale, scopeState.fitLimit || Infinity);
  const entries = [];
  if (scopeState.mode === 'molecule') {
    for (const at of scopeState.molecule.atoms) {
      const offsetA0 = new THREE.Vector3(at.pos[0], at.pos[1], at.pos[2]).applyQuaternion(scopeState.quat);
      entries.push({ element: getElement(at.symbol), worldOffset: offsetA0.clone().multiplyScalar(scopeState.displayScale), offsetA0 });
    }
  } else {
    for (const s of scopeState.staged) {
      const offsetA0 = new THREE.Vector3(s.offset, 0, 0);
      entries.push({ element: s.el, worldOffset: offsetA0.clone().multiplyScalar(scopeState.displayScale), offsetA0 });
    }
  }
  buildNuclei(entries);
  nuclei.forEach((c, i) => { c.offsetA0 = entries[i].offsetA0; });
  rebuildGhosts();
  reseedAll(true);
}

function syncVialSelection() {
  for (const v of vials) v.selected = !!scopeState.contents[v.el.symbol];
}

function stageAtom(symbol, contents) {
  const el = getElement(symbol);
  scopeState.mode = 'staged';
  scopeState.contents = contents;
  scopeState.molecule = null; scopeState.recipe = null; scopeState.molSampler = null;
  scopeState.quat.identity();
  const maxN = Math.max(...el.orbitals.map((o) => o.n));
  const valenceKeys = SUBSHELLS.filter((k) => +k[0] === maxN && el.fill[k]);
  scopeState.staged.push({
    symbol, el,
    sampler: makeAtomSampler(el),
    shells: el.orbitals.map((o) => o.subshellIndex),
    valenceStart: Math.min(...valenceKeys.map((k) => SUBSHELLS.indexOf(k))),
    offset: 0,
  });
  layoutStaged();
  rebuildSceneForScope();
  hud.classList.remove('loaded');
  refreshSpecimenPanel();
  refreshShellsPanel();
  refreshAboutPanel();
  atomLight.color.set(el.seeking === 0 ? 0x7df0c9 : 0x66d9ff);
  syncVialSelection();
}

function loadMolecule(recipe) {
  const rec = MOLECULES_DATA.molecules[recipe.id];
  scopeState.mode = 'molecule';
  scopeState.contents = { ...recipe.formula };
  scopeState.staged = [];
  scopeState.molecule = rec;
  scopeState.recipe = recipe;
  scopeState.quat.copy(MOL_ORIENT[rec.id] || QUAT_ID);
  scopeState.molSampler = makeMoleculeSampler(rec, { rng });
  let extent = 0;
  for (const at of rec.atoms) {
    extent = Math.max(extent, Math.hypot(at.pos[0], at.pos[1], at.pos[2]));
  }
  scopeState.fitLimit = 11.0 / (2 * (extent + 2.6));
  rebuildSceneForScope();
  hud.classList.remove('loaded');
  refreshSpecimenPanel();
  refreshShellsPanel();
  refreshAboutPanel();
  selectTab('specimen'); // a fresh bond always shows its card
  formFlash.t0 = performance.now() / 1000;
  formFlash.power = THREE.MathUtils.clamp(rec.atomizationEv / 20, 0.35, 1.1);
  flashMsg(`bonded — ${recipe.display} · ~${rec.atomizationEv.toFixed(1)} eV released`);
  atomLight.color.set(0xaef2d8);
  syncVialSelection();
}

function flushScope() {
  // Hard reset: in-flight flyers and any running brew are cancelled too —
  // a landing flyer must never stage stale contents into a fresh scope.
  for (const f of flyers) { scene.remove(f.mesh); f.mesh.material.dispose(); }
  flyers.length = 0;
  flightLock = false;
  brewQueue.length = 0;
  scopeState.mode = 'empty';
  scopeState.contents = {};
  scopeState.staged = [];
  scopeState.molecule = null; scopeState.recipe = null; scopeState.molSampler = null;
  scopeState.quat.identity();
  scopeState.fitLimit = Infinity;
  buildNuclei([]);
  ghostGroup.clear();
  swarmGeo.setDrawRange(0, 0);
  hud.classList.remove('loaded');
  refreshSpecimenPanel();
  refreshShellsPanel();
  refreshAboutPanel();
  atomLight.color.set(0x66d9ff);
  syncVialSelection();
}

// --- the feed: vial click -> flyer -> verdict --------------------------------

const flyerGeo = new THREE.SphereGeometry(0.16, 12, 10);
const flyers = [];
let flightLock = false;

// The recipe book's auto-feed: a queue of vial symbols, advanced one flyer
// at a time by brewTick() in the frame loop.
const brewQueue = [];

function brewRecipe(recipe) {
  flushScope();
  brewQueue.push(...recipe.path);
}

function brewTick() {
  if (brewQueue.length && !flightLock) attemptFeed(brewQueue.shift(), true);
}

function launchFlyer(el, accepted, onDone) {
  flightLock = true;
  const mesh = new THREE.Mesh(
    flyerGeo,
    new THREE.MeshBasicMaterial({ color: el.vialColor, transparent: true, opacity: 0.95 }),
  );
  const vial = vials.find((v) => v.el.symbol === el.symbol);
  const from = new THREE.Vector3();
  vial.group.getWorldPosition(from);
  from.y += 1.0;
  mesh.position.copy(from);
  scene.add(mesh);
  const to = ATOM_CENTER.clone();
  if (!accepted) {
    // refused matter never crosses the ring — it stalls at the field edge
    const dir = from.clone().sub(ATOM_CENTER).normalize();
    to.addScaledVector(dir, RING_R * 0.55);
  }
  flyers.push({ mesh, from, to, t0: performance.now() / 1000, dur: accepted ? 0.62 : 0.5, accepted, onDone, phase: 0 });
}

function updateFlyers(now) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    const k = Math.min(1, (now - f.t0) / f.dur);
    const e = k * k * (3 - 2 * k);
    if (f.phase === 0) {
      f.mesh.position.lerpVectors(f.from, f.to, e);
      f.mesh.position.y += Math.sin(e * Math.PI) * 2.0;
      if (k >= 1) {
        if (f.accepted) {
          scene.remove(f.mesh); f.mesh.material.dispose();
          flyers.splice(i, 1);
          flightLock = false;
          f.onDone();
        } else {
          f.phase = 1; f.t0 = now; f.dur = 0.75;
          f.onDone(); // refusal text + red ring at the bounce moment
        }
      }
    } else {
      f.mesh.position.lerpVectors(f.to, f.from, e);
      f.mesh.position.y += Math.sin(e * Math.PI) * 1.3;
      f.mesh.material.opacity = 0.95 * (1 - 0.45 * k);
      if (k >= 1) {
        scene.remove(f.mesh); f.mesh.material.dispose();
        flyers.splice(i, 1);
        flightLock = false;
      }
    }
  }
}

function attemptFeed(symbol, fromBrew = false) {
  if (flightLock) return;
  if (!fromBrew && brewQueue.length) brewQueue.length = 0; // manual click takes over
  document.getElementById('hint')?.classList.add('gone');
  const el = getElement(symbol);
  if (scopeState.mode === 'empty') {
    // The first atom always stages — nobles included, they are worth seeing.
    launchFlyer(el, true, () => stageAtom(symbol, { [symbol]: 1 }));
    return;
  }
  const nobleHeld = ['Ne', 'Ar'].find((s) => scopeState.contents[s]);
  let verdict;
  if (nobleHeld) {
    verdict = {
      ok: false, reason: 'noble',
      text: `${getElement(nobleHeld).name.toLowerCase()}'s shell is closed — it shares the scope with nothing. flush to start fresh.`,
    };
  } else {
    verdict = tryAdd(scopeState.contents, symbol);
  }
  if (!verdict.ok) {
    launchFlyer(el, false, () => {
      selectTab('specimen'); // the reason must be visible wherever you were
      flashMsg(verdict.text, true);
      refusalFlash.t0 = performance.now() / 1000;
    });
    return;
  }
  launchFlyer(el, true, () => {
    if (verdict.formed) loadMolecule(verdict.formed);
    else stageAtom(symbol, verdict.contents);
  });
}

// Debug/back-compat handle: flush, then stage a single element.
function loadElement(symbol) {
  flushScope();
  stageAtom(symbol, { [symbol]: 1 });
}

// ---------------------------------------------------------------------------
// Pointer input — drag spins the specimen (camera stays put), vial hover/click, wheel zoom.

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
    _spinDelta.setFromAxisAngle(MOL_SPIN_Y, dx * 0.006);
    molSpin.tQ.premultiply(_spinDelta);
    _spinDelta.setFromAxisAngle(MOL_SPIN_X, dy * 0.006);
    molSpin.tQ.premultiply(_spinDelta);
    downXY = [e.clientX, e.clientY];
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
    if (hits[0]) attemptFeed(hits[0].object.userData.symbol);
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
// Fine tuning panel — the detailed slider deck, collapsed by default. Shell
// visibility, swarm visibility, and the s/p shape toggles have their own
// prominent homes now (viewing modes panel, electron shells panel) — this
// panel is just what's left for anyone who wants to dig deeper.

const CONTROL_GROUPS = [
  ['the cloud', [
    ['points', 'measurement samples', 500, 24000, 100],
    ['dotSize', 'dot size', 0.4, 3, 0.05],
    ['life', 'sample life (s)', 0.4, 5, 0.05],
    ['brightness', 'swarm brightness', 0.2, 2, 0.05],
    ['coreDim', 'core shell dim', 0, 1, 0.05],
    ['timeScale', 'time scale', 0.1, 3, 0.05],
  ]],
  ['the scope', [
    ['atomScale', 'magnification', 0.8, 2.5, 0.05],
    ['fogScale', 'fog dot growth', 1.5, 6, 0.1],
    ['orbitSpeed', 'idle orbit speed', 0, 0.3, 0.005],
    ['ringGlow', 'ring glow', 0, 3, 0.05],
  ]],
  ['this console', [
    ['textScale', 'text size', 0.9, 2, 0.05],
  ]],
];

// Every panel sizes itself off one em base in world.css; --ui-scale on #hud
// scales type, panel width, pips, everything, together.
function applyTextScale() {
  hud.style.setProperty('--ui-scale', String(tuner.textScale));
}
applyTextScale();

function onControlChanged(key, before) {
  saveTuner();
  if (key === 'points' && tuner.points !== before) reseedAll(false);
  if (key === 'textScale') applyTextScale();
}

function buildControls() {
  const host = pbodyFine;
  const inputs = {};
  for (const [groupName, rows] of CONTROL_GROUPS) {
    const h = document.createElement('h3');
    h.className = 'ctl-h';
    h.textContent = groupName;
    host.appendChild(h);
    for (const [key, label, a, b, c] of rows) {
      const row = document.createElement('div');
      row.className = 'ctl-row';
      if (a === 'check') {
        const input = document.createElement('input');
        Object.assign(input, { type: 'checkbox', checked: tuner[key] >= 1 });
        const lab = document.createElement('label');
        lab.className = 'ctl-check';
        lab.append(input, document.createTextNode(' ' + label));
        row.appendChild(lab);
        input.addEventListener('change', () => {
          tuner[key] = input.checked ? 1 : 0;
          onControlChanged(key);
        });
        inputs[key] = { sync: () => { input.checked = tuner[key] >= 1; } };
      } else {
        row.innerHTML = `<label>${label}<span class="val"></span></label>`;
        const input = document.createElement('input');
        Object.assign(input, { type: 'range', min: a, max: b, step: c, value: tuner[key] });
        row.appendChild(input);
        const val = row.querySelector('.val');
        const show = () => { val.textContent = (+tuner[key]).toFixed(key === 'points' ? 0 : 2); };
        show();
        input.addEventListener('input', () => {
          const before = tuner.points;
          tuner[key] = +input.value;
          show();
          onControlChanged(key, before);
        });
        inputs[key] = { sync: () => { input.value = tuner[key]; show(); } };
      }
      host.appendChild(row);
    }
  }
  const reset = document.createElement('button');
  reset.className = 'reset';
  reset.textContent = 'reset to defaults';
  reset.addEventListener('click', () => {
    tuner = { ...DEFAULTS };
    saveTuner();
    for (const k of Object.keys(inputs)) inputs[k].sync();
    reseedAll(false);
    rebuildGhosts();
    applyTextScale();
    syncViewingSliders();
    refreshShellsPanel(); // shellS/shellP checkboxes live there now
  });
  host.appendChild(reset);
  const resetPos = document.createElement('button');
  resetPos.className = 'reset';
  resetPos.textContent = 'reset panel positions';
  resetPos.title = "puts every dragged panel back where it started — doesn't touch the sliders above";
  resetPos.addEventListener('click', resetPanelPositions);
  host.appendChild(resetPos);
  const stamp = document.createElement('p');
  stamp.className = 'stamp';
  stamp.textContent = `valence lab ${BUILD}`;
  host.appendChild(stamp);
}
buildControls();

// ---------------------------------------------------------------------------
// "Try this" panel — the nine calibrations, each with a trap-safe feeding
// order (asserted in molecule-sim), a friendly one-line hook, and a run tag.

function buildTryPanel() {
  // Recipes are for READING — the point is building at the vials yourself
  // (James, 2026-07-25). Auto-brew exists but as a small side action, never
  // the primary one: the cards are inert, only the little "run" tag brews.
  const host = pbodyTry;
  const intro = document.createElement('p');
  intro.className = 'recipe-note';
  intro.textContent = 'the scope bonds atoms the instant their outer shells line up — no glue required. '
    + 'feed the vials below, left to right, and watch:';
  host.appendChild(intro);
  for (const r of RECIPES) {
    const card = document.createElement('div');
    card.className = 'recipe';
    card.innerHTML = `<span class="rf">${r.display}</span>`
      + `<span class="rn">${r.name} <i>— ${MOLECULE_HOOK[r.id] || ''}</i></span>`
      + `<span class="ri">${r.path.join(' → ')}</span>`;
    const run = document.createElement('button');
    run.className = 'rbrew';
    run.textContent = 'run ▸';
    run.title = `auto-feed ${r.path.join(', ')} — or do it yourself at the vials`;
    run.addEventListener('click', () => brewRecipe(r));
    card.appendChild(run);
    host.appendChild(card);
  }
  const warn = document.createElement('p');
  warn.className = 'recipe-note';
  warn.textContent = 'why H before O for peroxide? two oxygens snap together into O₂ on contact, and O₂ is '
    + 'saturated — the hydrogen has to already be in the field first.';
  host.appendChild(warn);
}
buildTryPanel();

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
  applyMolSpin();
  updateSwarm(dt);
  updateNuclei(simTime);
  updateCollapse();
  updateFlyers(now);
  brewTick();

  // Smooth fog/swarm crossfade + live tuner uniforms.
  const u = swarmUniforms;
  u.uFogMix.value += ((fogMode ? 1 : 0) - u.uFogMix.value) * 0.06;
  u.uDotSize.value = tuner.dotSize;
  u.uCoreDim.value = tuner.coreDim;
  u.uFogScale.value = tuner.fogScale;

  // Shell <-> cloud crossfade (viewing modes panel sliders): both layers ease
  // toward their slider target rather than jumping, so dragging either one
  // reads as a fade, never a pop — James's ask, 2026-08-04.
  shellVisEnv += (tuner.ghostOpacity - shellVisEnv) * 0.1;
  ghostMat.uniforms.uOpacity.value = shellVisEnv;
  ghostGroup.visible = shellVisEnv > 0.004;

  // Display scale (atomScale clamped so molecules stay inside the ring).
  scopeState.displayScale = Math.min(tuner.atomScale, scopeState.fitLimit || Infinity);
  swarmGroup.scale.setScalar(scopeState.displayScale);
  ghostGroup.scale.setScalar(scopeState.displayScale);
  for (const c of nuclei) {
    if (c.offsetA0) c.group.position.copy(c.offsetA0).multiplyScalar(scopeState.displayScale);
  }

  // Ring mood: refusals tint it red, a fresh bond floods it bright.
  // Lights and brightness only — never camera moves.
  const refEnv = Math.max(0, 1 - (now - refusalFlash.t0) / 0.9);
  const formEnv = Math.max(0, 1 - (now - formFlash.t0) / 1.4);
  ringGlowMat.color.setHSL(0.52, 0.75, THREE.MathUtils.clamp(0.28 * tuner.ringGlow + 0.18, 0.1, 0.85));
  if (refEnv > 0) ringGlowMat.color.lerp(REFUSAL_RED, refEnv * 0.85);
  if (formEnv > 0) ringGlowMat.color.lerp(FORM_WHITE, formEnv * formFlash.power * 0.8);
  atomLight.intensity = 0.5 + 0.5 * tuner.ringGlow
    + 2.2 * formEnv * formFlash.power + 0.8 * refEnv;
  swarmVisEnv += (tuner.swarmOpacity - swarmVisEnv) * 0.1;
  u.uAlpha.value = tuner.brightness * swarmVisEnv * (1 + 2.2 * formEnv * formFlash.power);
  swarm.visible = swarmVisEnv > 0.004;

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

// Debug handle for agent sessions (see world CLAUDE.md). stepFlyers lets a
// headless/hidden pane advance feed animations despite frozen rAF.
window.__valenceLab = {
  renderer, scene, camera, loadElement, attemptFeed, flushScope, scopeState, tuner,
  brewRecipe, brewTick, selectTab,
  stepFlyers: (nowSec) => updateFlyers(nowSec ?? performance.now() / 1000),
};
