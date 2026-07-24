// Face Lab — expression & lip-sync workbench.
// Loads the MPFB2 bust GLB, drives it through src/core/face-life.js, and gives
// James sliders, savable presets, an A→B transition bench, and a dialog bench
// that plays voice clips with baked Rhubarb viseme timelines.

import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';
import { createFaceLife } from '../../core/face-life.js';

const BUILD_STAMP = 'face-lab build 2026-07-23a';

const $ = (id) => document.getElementById(id);
const status = (msg, err = false) => {
  const el = $('status');
  el.textContent = msg;
  el.className = err ? 'err' : '';
};
$('build-stamp').textContent = BUILD_STAMP;

// ---------------------------------------------------------------- three scene
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1e27);

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);

scene.add(new THREE.HemisphereLight(0xbfc8e8, 0x2a2620, 1.1));
const key = new THREE.DirectionalLight(0xfff1dd, 2.2);
key.position.set(0.6, 1.2, 1.0);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fa3d8, 0.8);
fill.position.set(-0.9, 0.4, 0.6);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.2);
rim.position.set(0.2, 0.8, -1.0);
scene.add(rim);

function resize() {
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------- orbit controls
const orbit = { yaw: 0.18, pitch: 0.02, radius: 0.52, target: new THREE.Vector3(0, 1.55, 0) };
function applyOrbit() {
  const cp = Math.cos(orbit.pitch);
  camera.position.set(
    orbit.target.x + Math.sin(orbit.yaw) * cp * orbit.radius,
    orbit.target.y + Math.sin(orbit.pitch) * orbit.radius,
    orbit.target.z + Math.cos(orbit.yaw) * cp * orbit.radius,
  );
  camera.lookAt(orbit.target);
}
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  orbit.yaw -= (e.clientX - lastX) * 0.006;
  orbit.pitch = Math.min(0.9, Math.max(-0.6, orbit.pitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
  applyOrbit();
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  orbit.radius = Math.min(1.6, Math.max(0.22, orbit.radius * (1 + Math.sign(e.deltaY) * 0.09)));
  applyOrbit();
}, { passive: false });

// ---------------------------------------------------------------- state
let life = null;
let currentWeights = {};    // the expression layer as shown in the sliders
let presets = [];
let clips = [];
let served = false;
const sliderEls = new Map();   // morph name -> {range, val} (plain 0..1 sliders)
const pairEls = new Map();     // base name -> {range, val, pos, neg} (-1..1 sliders)

// Identity morphs (MakeHuman modeling targets) have dash-names like
// "nose-hump-incr"; expression morphs never contain a dash.
const isIdentity = (n) => n.includes('-');
const PAIR_SUFFIXES = [
  ['incr', 'decr'], ['up', 'down'], ['out', 'in'],
  ['convex', 'concave'], ['uncompress', 'compress'], ['forward', 'backward'],
];

const MODELS = [
  { id: 'bust', label: 'mannequin', file: 'assets/bust.glb' },
  { id: 'sculpt', label: 'sculpt head (identity dials)', file: 'assets/sculpt.glb' },
];
const activeModel = MODELS.find((m) => m.id === localStorage.getItem('face-lab-model')) || MODELS[0];

// ---------------------------------------------------------------- load bust
// MakeHuman materials come through glTF with blend-mode transparency on
// everything, which lets teeth/tongue show through the closed lips and turns
// the brow/lash cutout textures into opaque patches. Force sane modes by part.
function fixMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    const name = (node.name || '').toLowerCase();
    // Eyes are cutout too: the eyeball texture's alpha hides the outer cornea
    // shell — forced-opaque it becomes a milky white ball over the iris.
    const isCutout = name.includes('eyebrow') || name.includes('eyelash') ||
      name.includes('high-poly') || name.includes('eyes');
    for (const m of mats) {
      if (!m) continue;
      if (isCutout) {
        m.transparent = true;
        m.alphaTest = 0.35;
        m.depthWrite = true;
      } else {
        m.transparent = false;
        m.opacity = 1;
        m.alphaTest = 0;
        m.depthWrite = true;
      }
      m.needsUpdate = true;
    }
  });
}

new GLTFLoader().load(activeModel.file, (gltf) => {
  const root = gltf.scene;
  scene.add(root);
  fixMaterials(root);

  const morphMeshes = [];
  let headBone = null;
  root.traverse((node) => {
    if (node.isMesh) {
      node.frustumCulled = false;
      if (node.morphTargetDictionary) morphMeshes.push(node);
      const n = (node.name || '').toLowerCase();
      if (n === 'human' || n.endsWith('.body') || n === 'base') bodyMesh = node;
      if (n.includes('high-poly') || n.includes('eyes')) eyesMesh = node;
    }
    if (node.isBone && node.name === 'head') headBone = node;
  });

  // frame the head
  const box = new THREE.Box3().setFromObject(root);
  const eyeY = box.max.y - (box.max.y - box.min.y) * 0.27;
  orbit.target.set(0, eyeY, 0);
  applyOrbit();

  life = createFaceLife({ meshes: morphMeshes, headBone });
  buildSliders(life.morphNames);
  status(`bust loaded — ${morphMeshes.length} meshes, ${life.morphNames.length} morphs`);
}, undefined, (err) => {
  status('failed to load assets/bust.glb — ' + err.message, true);
});

// ---------------------------------------------------------------- slider UI
const GROUPS = [
  ['visemes', (n) => n.startsWith('viseme_')],
  ['brow', (n) => n.startsWith('brow')],
  ['eye', (n) => n.startsWith('eye')],
  ['cheek', (n) => n.startsWith('cheek')],
  ['jaw', (n) => n.startsWith('jaw')],
  ['mouth', (n) => n.startsWith('mouth')],
  ['nose', (n) => n.startsWith('nose')],
  ['tongue', (n) => n.startsWith('tongue')],
  ['other', () => true],
];

function addGroup(host, label, open) {
  const title = document.createElement('div');
  title.className = 'group-title' + (open ? ' open' : '');
  const body = document.createElement('div');
  body.className = 'group-body' + (open ? ' open' : '');
  title.addEventListener('click', () => {
    title.classList.toggle('open');
    body.classList.toggle('open');
  });
  host.append(title, body);
  return { title, body };
}

function buildIdentitySliders(host, names) {
  // pair "-incr"/"-decr" style keys into one -1..1 slider; group by drawer
  const pairs = new Map();   // base -> {pos, neg}
  const singles = [];
  const claimed = new Set();
  for (const n of names) {
    if (claimed.has(n)) continue;
    let placed = false;
    for (const [ps, ns] of PAIR_SUFFIXES) {
      if (n.endsWith('-' + ps)) {
        const base = n.slice(0, -(ps.length + 1));
        const other = base + '-' + ns;
        if (names.includes(other)) {
          pairs.set(base, { pos: n, neg: other });
          claimed.add(n);
          claimed.add(other);
          placed = true;
        }
        break;
      }
      if (n.endsWith('-' + ns)) {
        const base = n.slice(0, -(ns.length + 1));
        const other = base + '-' + ps;
        if (names.includes(other)) {
          pairs.set(base, { pos: other, neg: n });
          claimed.add(n);
          claimed.add(other);
          placed = true;
        }
        break;
      }
    }
    if (!placed && !claimed.has(n)) singles.push(n);
  }

  const drawers = new Map(); // drawer -> [{kind, ...}]
  const drawerOf = (n) => n.split('-')[0].replace(/^eyes?$/, 'eye');
  for (const [base, pk] of pairs) {
    const d = drawerOf(base);
    if (!drawers.has(d)) drawers.set(d, []);
    drawers.get(d).push({ kind: 'pair', base, ...pk });
  }
  for (const n of singles) {
    const d = drawerOf(n);
    if (!drawers.has(d)) drawers.set(d, []);
    drawers.get(d).push({ kind: 'single', name: n });
  }

  for (const [drawer, items] of [...drawers.entries()].sort()) {
    const { body } = addGroup(host, `identity: ${drawer} (${items.length})`,
      drawer === 'nose' || drawer === 'head');
    items.sort((a, b) => (a.base || a.name).localeCompare(b.base || b.name));
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'sl';
      const lab = document.createElement('label');
      const range = document.createElement('input');
      range.type = 'range';
      range.step = '0.02';
      const val = document.createElement('span');
      val.className = 'v';
      val.textContent = '0';
      if (item.kind === 'pair') {
        lab.textContent = item.base;
        lab.title = item.base;
        range.min = '-2';   // MakeHuman targets can overdrive past 1 for caricature
        range.max = '2';
        range.value = '0';
        range.addEventListener('input', () => {
          const v = parseFloat(range.value);
          val.textContent = v.toFixed(2);
          if (v > 0) { currentWeights[item.pos] = v; delete currentWeights[item.neg]; }
          else if (v < 0) { currentWeights[item.neg] = -v; delete currentWeights[item.pos]; }
          else { delete currentWeights[item.pos]; delete currentWeights[item.neg]; }
          if (life) life.setExpression(currentWeights, { duration: 0 });
        });
        pairEls.set(item.base, { range, val, pos: item.pos, neg: item.neg });
      } else {
        lab.textContent = item.name;
        lab.title = item.name;
        range.min = '0';
        range.max = '2';   // overdrive allowed on singles too
        range.value = '0';
        range.addEventListener('input', () => {
          const v = parseFloat(range.value);
          val.textContent = v.toFixed(2);
          if (v === 0) delete currentWeights[item.name];
          else currentWeights[item.name] = v;
          if (life) life.setExpression(currentWeights, { duration: 0 });
        });
        sliderEls.set(item.name, { range, val });
      }
      row.append(lab, range, val);
      body.appendChild(row);
    }
  }
}

function buildSliders(names) {
  const host = $('slider-groups');
  host.textContent = '';
  const identityNames = names.filter(isIdentity);
  if (identityNames.length) buildIdentitySliders(host, identityNames);
  names = names.filter((n) => !isIdentity(n));
  const used = new Set();
  for (const [label, match] of GROUPS) {
    const members = names.filter((n) => !used.has(n) && match(n)).sort();
    members.forEach((n) => used.add(n));
    if (!members.length) continue;
    const title = document.createElement('div');
    title.className = 'group-title' + (label === 'mouth' || label === 'brow' ? ' open' : '');
    title.textContent = `${label} (${members.length})`;
    const body = document.createElement('div');
    body.className = 'group-body' + (title.className.includes('open') ? ' open' : '');
    title.addEventListener('click', () => {
      title.classList.toggle('open');
      body.classList.toggle('open');
    });
    for (const name of members) {
      const row = document.createElement('div');
      row.className = 'sl';
      const lab = document.createElement('label');
      lab.textContent = name;
      lab.title = name;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '1';
      range.step = '0.01';
      range.value = '0';
      const val = document.createElement('span');
      val.className = 'v';
      val.textContent = '0';
      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        val.textContent = v.toFixed(2);
        if (v === 0) delete currentWeights[name];
        else currentWeights[name] = v;
        if (life) life.setExpression(currentWeights, { duration: 0 });
      });
      row.append(lab, range, val);
      body.appendChild(row);
      sliderEls.set(name, { range, val });
    }
    host.append(title, body);
  }
}

function setSliders(weights) {
  currentWeights = { ...weights };
  for (const [name, els] of sliderEls) {
    const v = weights[name] || 0;
    els.range.value = String(v);
    els.val.textContent = v ? v.toFixed(2) : '0';
  }
  for (const [, els] of pairEls) {
    const v = (weights[els.pos] || 0) - (weights[els.neg] || 0);
    els.range.value = String(v);
    els.val.textContent = v ? v.toFixed(2) : '0';
  }
}

// keep the identity dials, drop only the expression morphs
function identityOnly(weights) {
  const out = {};
  for (const [k, v] of Object.entries(weights)) {
    if (isIdentity(k)) out[k] = v;
  }
  return out;
}

$('sliders-zero').addEventListener('click', () => {
  setSliders({});
  if (life) life.setExpression({}, { duration: 0.3 });
});

// ---------------------------------------------------------------- life toggles
$('ck-blink').addEventListener('change', (e) => { if (life) life.autoBlink = e.target.checked; });
$('ck-saccades').addEventListener('change', (e) => { if (life) life.saccadesOn = e.target.checked; });
$('ck-idle').addEventListener('change', (e) => { if (life) life.idleMotionOn = e.target.checked; });

// ---------------------------------------------------------------- presets
function renderPresets() {
  const host = $('preset-list');
  host.textContent = '';
  for (const p of presets) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.name;
    const apply = document.createElement('button');
    apply.textContent = 'apply';
    apply.addEventListener('click', () => {
      const dur = parseFloat($('tr-dur').value) || 0.45;
      if (life) life.setExpression(p.weights, { duration: dur, easing: $('tr-ease').value });
      setSlidersSoon(p.weights, dur);
    });
    row.append(name, apply);
    if (!p.builtin) {
      // Only James's own presets are deletable — the six base expressions stay.
      const del = document.createElement('button');
      del.textContent = '×';
      del.title = 'delete preset';
      del.addEventListener('click', () => {
        presets = presets.filter((x) => x !== p);
        renderPresets();
        savePresets();
      });
      row.append(del);
    }
    host.appendChild(row);
  }
  const opts = presets.map((p) => `<option value="${p.name}">${p.name}</option>`).join('');
  $('tr-a').innerHTML = opts;
  $('tr-b').innerHTML = opts;
  if (presets.length > 1) $('tr-b').selectedIndex = 1;
}

let sliderTimer = 0;
function setSlidersSoon(weights, dur) {
  clearTimeout(sliderTimer);
  sliderTimer = setTimeout(() => setSliders(weights), dur * 1000 + 20);
}

$('preset-neutral').addEventListener('click', () => {
  const kept = identityOnly(currentWeights);
  setSliders(kept);
  if (life) life.setExpression(kept, { duration: 0.35 });
});

$('preset-save').addEventListener('click', () => {
  const name = $('preset-name').value.trim();
  if (!name) { status('give the preset a name first', true); return; }
  const weights = { ...currentWeights };
  const existing = presets.find((p) => p.name === name);
  if (existing) existing.weights = weights; // builtins keep their flag; retuning them is the point
  else presets.push({ name, weights });
  $('preset-name').value = '';
  renderPresets();
  savePresets();
});

async function savePresets() {
  localStorage.setItem('face-lab-presets', JSON.stringify(presets));
  if (!served) { status('saved to this browser (server offline)'); return; }
  try {
    const res = await fetch('/api/face-lab/presets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    status('presets saved');
  } catch (err) {
    status('preset save failed: ' + err.message, true);
  }
}

// ---------------------------------------------------------------- transition bench
let loopTimer = 0;
function playTransition() {
  const a = presets.find((p) => p.name === $('tr-a').value);
  const b = presets.find((p) => p.name === $('tr-b').value);
  if (!a || !b || !life) return;
  const dur = parseFloat($('tr-dur').value) || 0.45;
  const ease = $('tr-ease').value;
  life.setExpression(a.weights, { duration: 0 });
  setSliders(a.weights);
  setTimeout(() => {
    life.setExpression(b.weights, { duration: dur, easing: ease });
    setSlidersSoon(b.weights, dur);
    if ($('tr-loop').checked) {
      loopTimer = setTimeout(playTransition, (dur + 0.9) * 1000);
    }
  }, 350);
}
$('tr-play').addEventListener('click', () => {
  clearTimeout(loopTimer);
  playTransition();
});
$('tr-loop').addEventListener('change', (e) => {
  if (!e.target.checked) clearTimeout(loopTimer);
});

// ---------------------------------------------------------------- dialog bench
let clipAudio = null;

function renderClips() {
  const sel = $('clip-select');
  sel.innerHTML = clips.length
    ? clips.map((c, i) => `<option value="${i}">${c.name}${c.visemes ? '' : ' (no viseme bake)'}</option>`).join('')
    : '<option value="">— no clips found —</option>';
  updateClipButtons();
}

function updateClipButtons() {
  const clip = clips[parseInt($('clip-select').value, 10)];
  $('clip-play').disabled = !clip;
  $('clip-stop').disabled = !clip;
  $('clip-info').textContent = clip ? (clip.visemes ? 'viseme bake found' : 'audio only — run tools/lipsync-bake.mjs') : '';
}
$('clip-select').addEventListener('change', updateClipButtons);

$('clip-play').addEventListener('click', async () => {
  const clip = clips[parseInt($('clip-select').value, 10)];
  if (!clip || !life) return;
  stopClip();
  clipAudio = new Audio(clip.url);
  clipAudio.loop = false;
  let cues = [];
  if (clip.visemes) {
    try {
      const data = await (await fetch(clip.visemes)).json();
      cues = data.mouthCues || [];
    } catch {
      status('could not load viseme JSON for ' + clip.name, true);
    }
  }
  if (cues.length) {
    life.speak({
      audio: clipAudio,
      cues,
      onEnd: () => { if ($('clip-loop').checked) $('clip-play').click(); },
    });
  } else {
    clipAudio.play();
  }
  status('playing ' + clip.name);
});

function stopClip() {
  if (life) life.stopSpeaking();
  if (clipAudio) { clipAudio.pause(); clipAudio = null; }
}
$('clip-stop').addEventListener('click', () => { $('clip-loop').checked = false; stopClip(); });

// ---------------------------------------------------------------- character variants
const texLoader = new THREE.TextureLoader();
let bodyMesh = null;
let eyesMesh = null;

function swapMap(mesh, url) {
  if (!mesh) return;
  texLoader.load(url, (tex) => {
    tex.flipY = false; // glTF UV convention
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m.map) m.map.dispose();
      m.map = tex;
      m.needsUpdate = true;
    }
  });
}

async function initVariants() {
  let variants;
  try {
    variants = await (await fetch('assets/variants.json')).json();
  } catch {
    return; // no variants baked — selects stay empty
  }
  const fill = (sel, list, storeKey, mesh, glbDefault) => {
    const el = $(sel);
    el.innerHTML = list.map((v) => `<option value="${v.file}">${v.label}</option>`).join('');
    // With no remembered choice, show what the GLB actually ships (no swap needed).
    if (list.some((v) => v.file === glbDefault)) el.value = glbDefault;
    const remembered = localStorage.getItem(storeKey);
    if (remembered && list.some((v) => v.file === remembered)) el.value = remembered;
    el.addEventListener('change', () => {
      localStorage.setItem(storeKey, el.value);
      swapMap(mesh(), 'assets/' + el.value);
    });
    // apply remembered choice once the mesh exists
    if (remembered && remembered !== glbDefault && list.some((v) => v.file === remembered)) {
      const wait = setInterval(() => {
        if (mesh()) { clearInterval(wait); swapMap(mesh(), 'assets/' + remembered); }
      }, 200);
      setTimeout(() => clearInterval(wait), 10000);
    }
  };
  fill('skin-select', variants.skins, 'face-lab-skin', () => bodyMesh,
    activeModel.id === 'sculpt' ? 'skins/old_caucasian_male.jpg' : 'skins/middleage_african_male.jpg');
  fill('eye-select', variants.eyes, 'face-lab-eyes', () => eyesMesh, 'eyes/brown.png');
}
initVariants();

// ---------------------------------------------------------------- model picker
{
  const sel = $('model-select');
  sel.innerHTML = MODELS.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
  sel.value = activeModel.id;
  sel.addEventListener('change', () => {
    localStorage.setItem('face-lab-model', sel.value);
    location.reload();
  });
}

// ---------------------------------------------------------------- server state
async function loadState() {
  try {
    const res = await fetch('/api/face-lab/state');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    presets = data.presets || [];
    clips = data.clips || [];
    served = true;
    status('connected to dev server');
  } catch {
    served = false;
    try {
      const local = JSON.parse(localStorage.getItem('face-lab-presets') || 'null');
      if (local) presets = local;
    } catch { /* ignore */ }
    if (!presets.length) {
      try {
        const res = await fetch('assets/presets.json');
        presets = (await res.json()).presets || [];
      } catch { presets = []; }
    }
    status('server offline — presets save to this browser only');
  }
  renderPresets();
  renderClips();
}
loadState();

// ---------------------------------------------------------------- main loop
let last = performance.now();
function tick(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (life) life.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
resize();
applyOrbit();
requestAnimationFrame(tick);
