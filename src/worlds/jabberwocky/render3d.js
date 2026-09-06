// Jabberwocky — the three.js renderer. Real geometry for the maze (Meshy tiles on walls, floor and
// ceiling, taller rooms, torch light baked into the vertices plus a few live lights), the creatures as
// rigged Meshy models with the fifteen death outcomes done on the mesh, gags as billboard sprites from
// draw.js, scars as floor decals, gibs with a little physics, and the rifle as a real viewmodel.
// core.js is untouched by all this: one cell = S metres, the core's y is the scene's z.
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';
import { clone as skeletonClone } from '../../lib/three/utils/SkeletonUtils.js';

export const S = 2.6;          // metres per maze cell
export const EYE = 1.65;       // camera height
const H_LOW = 3.2, H_TALL = 5.4;
const TAU = Math.PI * 2;
const D = () => globalThis.JabberwockyDraw;
const CORE = () => globalThis.JabberwockyCore;

// themes: tile names live in assets/textures/t<theme>-<slot>.jpg
// walls: which tile each of the core's four wall variants wears (A is ~62% of walls, D ~5%);
// glow: tiles that light themselves (lava, crystal, runes) with the emissive strength
const THEMES = [
  { fog: 0x0a0608, base: 0.55, torch: 0xffa040, walls: ['wall1', 'wall2', 'wall3', 'wall2'], glow: {} },
  { fog: 0x0b0806, base: 0.52, torch: 0xffb050, walls: ['wall2', 'wall1', 'wall3', 'wall1'], glow: {} },
  { fog: 0x06090a, base: 0.60, torch: 0xd0e8ff, walls: ['wall1', 'wall2', 'wall3', 'wall3'], glow: {} },
  { fog: 0x06040c, base: 0.42, torch: 0xb070ff, walls: ['wall4', 'wall1', 'wall2', 'wall3'], glow: { wall1: 0.5, wall2: 0.5, floor: 0.3, ceil: 0.35 } },
  { fog: 0x0c0403, base: 0.48, torch: 0xff6020, walls: ['wall4', 'wall2', 'wall1', 'wall3'], glow: { wall1: 0.45, wall2: 0.3, floor: 0.4, ceil: 0.2 } },
];
const MODEL_DIR = 'assets/models/';
// each creature: the rigged base and the clips we asked Meshy for; yaw = which way the model faces at rest
const CREATURES = {
  ghoul:      { clips: ['walk', 'attack', 'die', 'dance', 'hit'], yaw: 0 },
  brute:      { clips: ['walk', 'attack', 'die', 'dance', 'hit'], yaw: 0 },
  ratling:    { clips: ['walk', 'attack', 'die', 'dance', 'hit'], yaw: 0 },
  cultist:    { clips: ['walk', 'attack', 'die', 'dance', 'hit', 'throw'], yaw: 0 },
  stalker:    { clips: ['walk', 'attack', 'die', 'dance', 'hit'], yaw: 0 },
  // the Jabberwock would not take a rig (Meshy's pose estimation wants a humanoid), so he is a posed
  // statue that moves procedurally: hovers, leans in to fire, rears back when hit
  jabberwock: { clips: [], yaw: 0, unscaled: true, procedural: true },
};
const GIBS = ['intestines', 'arm', 'leg', 'skull', 'ribs'];
// PROPS: real objects instead of billboard stickers. size = metres on the long side; motion = how it moves in
// flight; stays = it rests where it lands and stands in for the floor decal. Files: assets/models/props/<name>.glb
// (Meshy, 2026-09-06); prim = built from primitives at load, no file needed.
const PROPS = {
  anvil:     { size: 0.9,  motion: 'tumble', stays: true },
  piano:     { size: 2.2,  motion: 'tumble', stays: true },
  train:     { size: 3.0,  motion: 'drive',  stays: false },
  bus:       { size: 3.2,  motion: 'drive',  stays: false },
  cow:       { size: 1.8,  motion: 'tumble', stays: true },
  vending:   { size: 1.7,  motion: 'tumble', stays: true },
  sink:      { size: 1.2,  motion: 'tumble', stays: true },
  sneaker:   { size: 1.8,  motion: 'tumble', stays: true },
  chainsaw:  { size: 0.9,  motion: 'spin',   stays: true },
  rocket:    { size: 1.0,  motion: 'fly',    stays: false },
  cart:      { size: 1.1,  motion: 'drive',  stays: true },
  ham:       { size: 0.5,  motion: 'roll',   stays: true },
  jackbox:   { size: 0.8,  motion: 'tumble', stays: true },
  mousetrap: { size: 1.1,  motion: 'none',   stays: true },
  doll:      { size: 0.9,  motion: 'walk',   stays: true },
  grandma:   { size: 1.5,  motion: 'walk',   stays: false },
  sumo:      { size: 1.8,  motion: 'walk',   stays: false },
  eagle:     { size: 1.6,  motion: 'flyhigh', stays: false },
  goose:     { size: 0.9,  motion: 'walk',   stays: false },
  skunk:     { size: 0.7,  motion: 'walk',   stays: false },
  cat:       { size: 0.6,  motion: 'walk',   stays: false },
  karaoke:   { size: 1.1,  motion: 'none',   stays: true },
  mirror:    { size: 1.4,  motion: 'tumble', stays: true },
  boomerang: { size: 0.5,  motion: 'spin',   stays: false },
  herring:   { size: 0.4,  motion: 'tumble', stays: true },
  porcupine: { size: 0.6,  motion: 'tumble', stays: true },
  cupcake:   { size: 0.35, motion: 'tumble', stays: false },
  pie:       { size: 0.5,  motion: 'spin',   stays: false },
  cannonball:{ size: 0.42, motion: 'roll',   stays: true, prim: 'ball', color: 0x2a2a30 },
  bowling:   { size: 0.4,  motion: 'roll',   stays: true, prim: 'ball', color: 0x101a5a, holes: true },
  baseball:  { size: 0.2,  motion: 'roll',   stays: true, prim: 'ball', color: 0xf4f0e8 },
  knife:     { size: 0.55, motion: 'spin',   stays: false, prim: 'knife' },
};
const BOOM_GAGS = new Set(['rocket', 'wrongway', 'meteor', 'piledriver']);   // the only splashes that are explosions
const SPLASH_COLOR = { pie: 0x6a3aa0, jello: 0x3ddc5a, gravy: 0x6b3a1a, lava: 0xff6a20, chowder: 0xf0e0c0, burrito: 0xd0a060, legos: 0xe03030, lovepotion: 0xff6ab0, monkeypaw: 0x3a2a2a, catbag: 0x8a7a6a, jack: 0xffd23a, porcupine: 0x8a6a4a, cow: 0xf0f0f0, yak: 0x6a4a2a, frogs: 0x3a9a2a, tent: 0xc8202a, sneaker: 0xf0f0f0, anvil: 0x505058, piano: 0x202020, vending: 0xd02020, sink: 0xf0f0f0 };
const SMOTHER_COLOR = { jello: 0x3ddc5a, gravy: 0x6b3a1a, frogs: 0x3a9a2a, tent: 0xc8202a, glue: 0xf0eee6, yak: 0x6b4a2a };

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.autoClear = false;
  const look = { fov: 76, fog: 34, res: 1, bob: 0, spriteScale: 1, decalScale: 1, brightness: 1, shake: 0.25, torchLight: 1, vmX: 0.26, vmY: -0.30, vmZ: -0.78, vmScale: 1 };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(look.fov, 1, 0.05, 90);
  const vmScene = new THREE.Scene();
  const vmCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();
  const base = new URL('./', import.meta.url).href;

  // ---- assets -------------------------------------------------------------------------------------
  const textures = {};
  const models = { creatures: {}, gibs: [], gibByName: {}, props: {}, rifle: null, gauntlets: null };
  let assetsReady = false, assetsFailed = 0;
  function tex(name) {
    if (textures[name]) return textures[name];
    const t = texLoader.load(base + 'assets/textures/' + name + '.jpg');
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures[name] = t;
    return t;
  }
  function loadGlb(path) {
    return new Promise((resolve) => loader.load(base + path, (g) => resolve(g), undefined, () => { assetsFailed++; resolve(null); }));
  }
  async function load(onProgress) {
    let done = 0, total = 0;
    const tick = () => { done++; if (onProgress) onProgress(done / total); };
    const jobs = [];
    for (const name of Object.keys(CREATURES)) {
      total++;
      jobs.push(loadGlb(MODEL_DIR + name + '/base.glb').then(async (g) => {
        if (!g) { tick(); return; }
        const clips = {};   // base.glb carries only the rest pose; a slow walk stands in for idle
        await Promise.all(CREATURES[name].clips.map((c) => loadGlb(MODEL_DIR + name + '/' + c + '.glb').then((a) => { if (a && a.animations && a.animations.length) clips[c] = a.animations[0]; })));
        prepModel(g.scene);
        models.creatures[name] = { scene: g.scene, clips };
        tick();
      }));
    }
    for (const gname of GIBS) { total++; jobs.push(loadGlb(MODEL_DIR + 'gibs/' + gname + '.glb').then((g) => { if (g) { prepModel(g.scene); models.gibs.push(g.scene); models.gibByName[gname] = g.scene; } tick(); })); }
    for (const name of Object.keys(PROPS)) {
      const def = PROPS[name];
      if (def.prim) { models.props[name] = primProp(name, def); continue; }
      jobs.push(new Promise((resolve) => loader.load(base + MODEL_DIR + 'props/' + name + '.glb', (g) => { prepModel(g.scene); litProp(g.scene); models.props[name] = fitProp(g.scene, def.size); resolve(); }, undefined, () => resolve())));   // a missing prop is not a failure: the sprite stands in
    }
    total += 2;
    jobs.push(loadGlb(MODEL_DIR + 'rifle.glb').then((g) => { if (g) { prepModel(g.scene); models.rifle = g.scene; } tick(); }));
    jobs.push(loadGlb(MODEL_DIR + 'gauntlets.glb').then((g) => { if (g) { prepModel(g.scene); models.gauntlets = g.scene; } tick(); }));
    await Promise.all(jobs);
    assetsReady = true;
    buildViewmodel();
    return { failed: assetsFailed };
  }
  // scale a prop to its size and centre it (centre at the origin; halfH says where the floor is)
  function fitProp(scene, size) {
    const box = new THREE.Box3().setFromObject(scene);
    const dim = box.getSize(new THREE.Vector3());
    const k = size / Math.max(0.01, dim.x, dim.y, dim.z);
    const g = new THREE.Group();
    scene.scale.setScalar(k);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(k);
    scene.position.set(-c.x, -c.y, -c.z);
    g.add(scene); g.userData.halfH = dim.y * k / 2; g.userData.halfW = Math.max(dim.x, dim.z) * k / 2;
    return g;
  }
  // props live in torchlight, not the baked vertex light the walls get: give them a little of their own glow
  function litProp(scene) {
    scene.traverse((o) => { if (o.isMesh && o.material) { const m = o.material; if (m.emissiveMap) m.emissiveIntensity = 0.45; else if (m.emissive && m.map) { m.emissiveMap = m.map; m.emissive.setHex(0xffffff); m.emissiveIntensity = 0.35; } else if (m.emissive) { m.emissive.copy(m.color); m.emissiveIntensity = 0.3; } } });
  }
  function primProp(name, def) {
    const g = new THREE.Group();
    if (def.prim === 'ball') {
      const r = def.size / 2;
      g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), new THREE.MeshStandardMaterial({ color: def.color, metalness: name === 'cannonball' ? 0.7 : 0.1, roughness: name === 'baseball' ? 0.9 : 0.35 })));
      if (def.holes) for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x050508 })); const a = -0.5 + i * 0.5; h.position.set(Math.sin(a) * r * 0.55, r * 0.85, Math.cos(a) * r * 0.55 - r * 0.3); g.add(h); }
      if (name === 'baseball') { const seam = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.03, 4, 32), new THREE.MeshBasicMaterial({ color: 0xc02020 })); seam.rotation.x = 0.8; g.add(seam); }
      g.userData.halfH = r; g.userData.halfW = r;
    } else if (def.prim === 'knife') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.62, 0.05, 0.008), new THREE.MeshStandardMaterial({ color: 0xd8dce8, metalness: 0.9, roughness: 0.25 }));
      blade.position.x = def.size * 0.19; g.add(blade);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.38, 0.065, 0.03), new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.8 }));
      handle.position.x = -def.size * 0.31; g.add(handle);
      g.userData.halfH = 0.04; g.userData.halfW = def.size / 2;
    }
    return g;
  }
  function propFor(sprite) { return PROPS[sprite] && models.props[sprite] ? models.props[sprite] : null; }
  function prepModel(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        const m = o.material;
        if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        // Meshy duplicates the atlas as emissive: keep it faint so torch light still reads
        if (m && m.emissiveMap) { m.emissiveIntensity = 0.12; }
        if (m && 'metalness' in m) { m.metalness = Math.min(m.metalness, 0.2); m.roughness = Math.max(m.roughness, 0.6); }
      }
    });
  }

  // ---- sprite textures from draw.js -------------------------------------------------------------
  const spriteTex = new Map();
  function canvasTex(key, canvas) {
    let t = spriteTex.get(key);
    if (t) return t;
    t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
    if (spriteTex.size > 400) { for (const v of spriteTex.values()) v.dispose(); spriteTex.clear(); }
    spriteTex.set(key, t);
    return t;
  }
  function gagSprite(sprite, t) { const frame = Math.floor((t || 0) * 12) % 12; return canvasTex('proj|' + sprite + '|' + frame, D().projSprite(sprite, t)); }
  function scarTex(type, seed) { const c = D().scarSprite(type, seed); return c ? canvasTex('scar|' + type + '|' + Math.round(seed * 8), c) : null; }
  function softDot() {
    return canvasTex('softdot', (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })());
  }
  function flameTex(frame) {
    // a soft additive flame: stacked radial glows leaning with the frame, a hot white core
    return canvasTex('flame|' + frame, (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 96; const g = c.getContext('2d');
      const lean = Math.sin(frame * 1.7) * 6;
      const tongues = [[32, 70, 22, 0.9, '#ff6a10'], [32 + lean, 46, 15, 0.85, '#ff9a20'], [32 - lean * 0.6, 28, 9, 0.7, '#ffd23a'], [32 + lean * 0.3, 60, 8, 1, '#fff2c0']];
      for (const [x, y, r, a, col] of tongues) {
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, col); rg.addColorStop(0.55, col.replace(')', '')); rg.addColorStop(1, 'rgba(255,120,20,0)');
        g.globalAlpha = a; g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r, r * 1.5, 0, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      return c;
    })());
  }

  // ---- the level ----------------------------------------------------------------------------------
  let levelGroup = null, levelRef = null, torches = [], doorMesh = null, doorOpenAnim = 0, driftMeshes = [];
  const torchLights = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffa040, 0, 12, 2); scene.add(l); torchLights.push(l); }
  const ambient = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambient);
  // the level carries its own baked light in vertex colours; the creatures need directional fill or they read as silhouettes
  const hemi = new THREE.HemisphereLight(0xb0a0c0, 0x2a1a20, 0.7); scene.add(hemi);
  const runeLight = new THREE.PointLight(0xff2fb8, 7, 10, 2); scene.add(runeLight);
  const muzzleLight = new THREE.PointLight(0xffc060, 0, 14, 2); scene.add(muzzleLight);
  const keyLight = new THREE.PointLight(0xffd23a, 0, 8, 2); scene.add(keyLight);

  function buildLevel(state) {
    const level = state.level;
    if (levelGroup) { scene.remove(levelGroup); disposeGroup(levelGroup); }
    clearEntities();
    levelGroup = new THREE.Group(); scene.add(levelGroup);
    levelRef = level;
    const th = THEMES[level.theme] || THEMES[0];
    scene.fog = new THREE.Fog(th.fog, 4, look.fog);
    scene.background = new THREE.Color(th.fog);
    const C = CORE().CELL;
    const { w, h, map, tall } = level;
    const at = (x, y) => y * w + x;
    const isOpen = (x, y) => x >= 0 && y >= 0 && x < w && y < h && map[at(x, y)] === C.OPEN;
    const hgt = (x, y) => (tall && tall[at(x, y)]) ? H_TALL : H_LOW;
    // torches: rooms get one per wall, corridors every so often; baked into vertex light
    torches = placeTorches(level, isOpen);
    const lightAt = (x, z) => {
      let r = th.base, g = th.base, b = th.base * 1.15;
      const tc = new THREE.Color(th.torch);
      for (const t of torches) {
        const d2 = (t.x - x) * (t.x - x) + (t.z - z) * (t.z - z);
        const k = 1.5 * look.torchLight / (1 + d2 / 9);
        r += tc.r * k; g += tc.g * k; b += tc.b * k;
      }
      return [Math.min(1.8, r), Math.min(1.8, g), Math.min(1.8, b)];
    };
    // face buckets per material
    const buckets = {};
    const bucket = (key) => buckets[key] || (buckets[key] = { pos: [], nor: [], uv: [], col: [] });
    const quad = (key, p0, p1, p2, p3, n, uvs) => {
      // two triangles, CCW as seen from the normal side; colour baked per vertex
      const B = bucket(key);
      const pts = [p0, p1, p2, p0, p2, p3], uu = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]];
      for (let i = 0; i < 6; i++) {
        const p = pts[i];
        B.pos.push(p[0], p[1], p[2]); B.nor.push(n[0], n[1], n[2]); B.uv.push(uu[i][0], uu[i][1]);
        const c = lightAt(p[0], p[2]); const hk = 1 - Math.min(0.55, p[1] / (H_TALL * 1.6));   // darker toward the ceiling
        B.col.push(c[0] * hk, c[1] * hk, c[2] * hk);
      }
    };
    const wallKey = (v) => th.walls[Math.max(0, Math.min(3, v - 1))] || 'wall1';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!isOpen(x, y)) continue;
      const hc = hgt(x, y);
      const X0 = x * S, X1 = (x + 1) * S, Z0 = y * S, Z1 = (y + 1) * S;
      // floor (normal up) and ceiling (normal down)
      quad('floor', [X0, 0, Z1], [X1, 0, Z1], [X1, 0, Z0], [X0, 0, Z0], [0, 1, 0], [[x, y + 1], [x + 1, y + 1], [x + 1, y], [x, y]]);
      quad('ceil', [X0, hc, Z0], [X1, hc, Z0], [X1, hc, Z1], [X0, hc, Z1], [0, -1, 0], [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]);
      // the four edges
      const edges = [
        { nx: x, ny: y - 1, a: [X1, Z0], b: [X0, Z0], n: [0, 0, 1] },    // north edge, faces south into the cell
        { nx: x, ny: y + 1, a: [X0, Z1], b: [X1, Z1], n: [0, 0, -1] },
        { nx: x - 1, ny: y, a: [X0, Z0], b: [X0, Z1], n: [1, 0, 0] },
        { nx: x + 1, ny: y, a: [X1, Z1], b: [X1, Z0], n: [-1, 0, 0] },
      ];
      for (const e of edges) {
        const v = (e.nx < 0 || e.ny < 0 || e.nx >= w || e.ny >= h) ? C.WALL_A : map[at(e.nx, e.ny)];
        let y0 = 0, y1 = hc, key = null;
        if (v === C.OPEN || (v === C.DOOR && false)) {
          const hn = hgt(e.nx, e.ny);
          if (hn >= hc) continue;
          y0 = hn; key = 'wall1';                                    // the step where a tall room meets a corridor
        } else if (v === C.DOOR || v === C.DRIFT) {
          continue;                                                  // doors are their own meshes
        } else key = wallKey(v);
        const u0 = 0, u1 = 1, vv0 = y0 / S, vv1 = y1 / S;
        quad(key, [e.a[0], y0, e.a[1]], [e.b[0], y0, e.b[1]], [e.b[0], y1, e.b[1]], [e.a[0], y1, e.a[1]], e.n, [[u0, vv0], [u1, vv0], [u1, vv1], [u0, vv1]]);
      }
    }
    for (const key in buckets) {
      const B = buckets[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
      const tname = 't' + level.theme + '-' + key;
      const m = new THREE.MeshLambertMaterial({ map: tex(tname), vertexColors: true, side: THREE.DoubleSide });
      if (th.glow[key]) { m.emissiveMap = tex(tname); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = th.glow[key]; }
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      levelGroup.add(mesh);
    }
    // doors: a plane on the shared edge, the cell behind it a dark box
    doorMesh = null; driftMeshes = [];
    const doorPlane = (cell, texName, emissive) => {
      const dx = cell.cx - cell.x, dy = cell.cy - cell.y;   // direction from the door cell into the maze
      const cx = (cell.x + 0.5) * S + dx * S * 0.5, cz = (cell.y + 0.5) * S + dy * S * 0.5;
      const mat = new THREE.MeshLambertMaterial({ map: tex(texName), color: 0xffffff });
      if (emissive) { mat.emissiveMap = tex(texName); mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.5; }
      const geo = new THREE.PlaneGeometry(S, H_LOW);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx - dx * 0.02, H_LOW / 2, cz - dy * 0.02);
      mesh.lookAt(cx + dx, H_LOW / 2, cz + dy);
      levelGroup.add(mesh);
      // the dark cell behind
      const box = new THREE.Mesh(new THREE.BoxGeometry(S * 0.98, H_LOW, S * 0.98), new THREE.MeshBasicMaterial({ color: 0x020103, side: THREE.BackSide }));
      box.position.set((cell.x + 0.5) * S, H_LOW / 2, (cell.y + 0.5) * S);
      levelGroup.add(box);
      const l = lightAt(cx, cz);
      mat.color.setRGB(Math.min(1.4, l[0]), Math.min(1.4, l[1]), Math.min(1.4, l[2]));
      return mesh;
    };
    if (level.door) { level.door.cx = level.door.cx != null ? level.door.cx : level.door.x; doorMesh = doorPlane(level.door, 'door', false); doorMesh.userData.baseY = H_LOW / 2; doorOpenAnim = state.doorOpen ? 1 : 0; }
    level.driftDoors.forEach((d, i) => {
      const cell = d.cx != null ? d : Object.assign({}, d, { cx: d.x === 0 ? 1 : d.x === w - 1 ? w - 2 : d.x, cy: d.y === 0 ? 1 : d.y === h - 1 ? h - 2 : d.y });
      const m = doorPlane(cell, 'drift' + (i % 3), true);
      driftMeshes.push(m);
    });
    // torch sprites + brackets
    for (const t of torches) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      spr.position.set(t.x, t.y + 0.35, t.z); spr.scale.set(0.5, 0.75, 1);
      levelGroup.add(spr); t.sprite = spr;
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), new THREE.MeshLambertMaterial({ color: 0x2a221c }));
      br.position.set(t.x, t.y - 0.1, t.z); levelGroup.add(br);
    }
    // the key: a spinning glow
    keyView = null;
    if (level.key && state.key && !state.key.held) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex('key|0', D().keySprite(0)), transparent: true, depthWrite: false }));
      spr.scale.set(1.0, 1.0, 1); spr.position.set(level.key.x * S, 1.1, level.key.y * S);
      levelGroup.add(spr); keyView = spr; keyLight.intensity = 6;
    } else keyLight.intensity = 0;
    // the pies
    healViews = [];
    for (const h of state.heals || []) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex('heal|0', D().healSprite(0)), transparent: true, depthWrite: false }));
      spr.scale.set(0.7, 0.7, 1); spr.position.set(h.x * S, 0.55, h.y * S);
      levelGroup.add(spr); healViews.push({ spr, h });
    }
  }
  function placeTorches(level, isOpen) {
    const out = [];
    const { w, h, map, tall } = level;
    const at = (x, y) => y * w + x;
    const put = (x, y, dx, dy) => { out.push({ x: (x + 0.5) * S + dx * (S / 2 - 0.16), y: 2.3, z: (y + 0.5) * S + dy * (S / 2 - 0.16) }); };
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (!isOpen(x, y)) continue;
      const room = tall && tall[at(x, y)];
      const hash = (x * 7 + y * 13 + level.n * 5) % (room ? 4 : 6);
      if (hash !== 0) continue;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !isOpen(x + dx, y + dy) && map[at(x + dx, y + dy)] !== CORE().CELL.DOOR && map[at(x + dx, y + dy)] !== CORE().CELL.DRIFT);
      if (!dirs.length) continue;
      const [dx, dy] = dirs[(x + y) % dirs.length];
      put(x, y, dx, dy);
      if (out.length > 60) return out;
    }
    return out;
  }
  function disposeGroup(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.map) o.material.dispose(); }); }

  // ---- entities -----------------------------------------------------------------------------------
  const goonViews = new Map(), shotViews = new Map(), zoneViews = new Map(), scarViews = new Map(), beamViews = new Map();
  let keyView = null;
  let healViews = [];
  const gibs = [], shards = [], extras = [];
  const entGroup = new THREE.Group(); scene.add(entGroup);
  function clearEntities() {
    for (const v of goonViews.values()) { entGroup.remove(v.root); if (v.blob) entGroup.remove(v.blob); if (v.block) entGroup.remove(v.block); }
    for (const v of shotViews.values()) entGroup.remove(v);
    for (const v of zoneViews.values()) { entGroup.remove(v.obj); if (v.shadow) entGroup.remove(v.shadow); if (v.cone) entGroup.remove(v.cone); }
    for (const v of scarViews.values()) entGroup.remove(v);
    for (const v of beamViews.values()) entGroup.remove(v);
    for (const g of gibs) entGroup.remove(g.mesh);
    for (const s of shards) entGroup.remove(s.mesh);
    for (const e of extras) entGroup.remove(e.obj);
    goonViews.clear(); shotViews.clear(); zoneViews.clear(); scarViews.clear(); beamViews.clear();
    gibs.length = 0; shards.length = 0; extras.length = 0;
    blood.reset(); embers.reset();
  }

  // creatures
  function makeGoonView(g) {
    const root = new THREE.Group();
    const asset = models.creatures[g.type];
    const view = { root, model: null, mixer: null, actions: {}, current: null, started: null, mats: [], tint: null, fx: null, blob: null, fire: null, hidden: false, opacity: 1, t: 0, lastBlink: false };
    if (asset) {
      const model = skeletonClone(asset.scene);
      model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); view.mats.push(o.material); } });
      model.rotation.y = CREATURES[g.type].yaw;
      if (CREATURES[g.type].unscaled) {
        // a raw Meshy model (~1.9 units tall): scale it to the creature's height and stand it on the floor
        const box = new THREE.Box3().setFromObject(model);
        const k = (g.def.h || 1.8) / Math.max(0.01, box.max.y - box.min.y);
        model.scale.setScalar(k); model.position.y = -box.min.y * k;
        model.position.x = -(box.min.x + box.max.x) / 2 * k; model.position.z = -(box.min.z + box.max.z) / 2 * k;
      }
      view.procedural = !!CREATURES[g.type].procedural;
      root.add(model); view.model = model;
      view.minY = new THREE.Box3().setFromObject(model).min.y;   // where the feet are in root space (Meshy rigs sit on their hips)
      view.mixer = new THREE.AnimationMixer(model);
      for (const k in asset.clips) view.actions[k] = view.mixer.clipAction(asset.clips[k]);
      if (!view.actions.idle && view.actions.walk) { /* no idle clip: hold the first frame of walk */ }
    } else {
      // no model (file:// or a failed load): a shape with eyes, never nothing
      const hgt = g.def.h || 1.8;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32 * g.def.size, hgt * 0.5, 4, 8), new THREE.MeshLambertMaterial({ color: g.isBoss ? 0x4a1a6a : 0x4a5a48 }));
      body.position.y = hgt * 0.5; root.add(body);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a })); e.position.set(s * 0.12, hgt * 0.8, 0.3 * g.def.size); root.add(e); }
      view.model = body; view.mats = [body.material];
    }
    entGroup.add(root);
    return view;
  }
  function play(view, name, opts) {
    const a = view.actions[name];
    if (!a) return false;
    if (view.current === a && !(opts && opts.restart)) return true;
    if (view.current) view.current.fadeOut(0.15);
    a.reset(); a.setLoop(opts && opts.once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = true;
    a.timeScale = (opts && opts.speed) || 1;
    a.fadeIn(0.12).play();
    view.current = a;
    return true;
  }
  function setTint(view, color, emissive, k) {
    for (const m of view.mats) {
      if (!m.userData.base) { m.userData.base = m.color.clone(); m.userData.baseE = m.emissive ? m.emissive.clone() : null; m.userData.baseEI = m.emissiveIntensity; }
      m.color.copy(m.userData.base).lerp(color, k);
      if (m.emissive && emissive) { m.emissive.copy(emissive); m.emissiveIntensity = 0.6 * k; }
    }
  }
  function setOpacity(view, o) { for (const m of view.mats) { m.transparent = o < 1; m.opacity = o; m.depthWrite = o >= 0.5; } }
  function syncGoon(g, view, dt, state) {
    const root = view.root;
    const moving = g.state === 'chase' || (g.state === 'idle' && g.target);
    if (g.state !== 'dying' && g.state !== 'dead') {
      root.position.set(g.x * S, 0, g.y * S);
      root.rotation.y = Math.PI / 2 - g.a;
      if (g.outcome !== 'shrink') root.scale.setScalar(1);
    }
    if (view.mixer) view.mixer.update(dt);
    // blink on a dud hit / boss hit
    const blink = g.blink > 0;
    if (blink !== view.lastBlink) { view.lastBlink = blink; for (const m of view.mats) { if (m.emissive) { if (blink) { m.userData.blinkE = m.emissive.clone(); m.emissive.setHex(0xffffff); m.emissiveIntensity = 0.9; } else if (m.userData.blinkE) { m.emissive.copy(m.userData.blinkE); m.emissiveIntensity = m.userData.baseEI != null ? m.userData.baseEI : 0.12; } } } }
    if (view.procedural && view.model && g.state !== 'dying' && g.state !== 'dead') {
      // the statue that moves: hover, lean in on the windup, sway on the strafe, rock when pacified
      view.t += dt;
      const m = view.model;
      const lean = g.windup > 0 || (g.cool != null && g.cool < 0.3) ? -0.28 : g.stagger > 0 ? 0.35 : 0;
      view.lean = (view.lean || 0) + (lean - (view.lean || 0)) * Math.min(1, dt * 6);
      m.rotation.x = view.lean;
      m.rotation.z = Math.sin(view.t * 1.3) * 0.05 + (g.state === 'pacified' ? Math.sin(view.t * 4) * 0.18 : 0);
      root.position.y = Math.sin(view.t * 2.1) * 0.12 + 0.12;
      if (g.state === 'pacified') heartsFor(view, g, dt);
      return;
    }
    if (g.state === 'pacified') { if (!play(view, 'dance')) play(view, 'walk', { speed: 0.4 }); heartsFor(view, g, dt); return; }
    if (g.state === 'idle' || g.state === 'chase') {
      if (g.windup > 0 || g.atkT > g.def.atk - 0.35) { if (!view.attacking) { view.attacking = true; play(view, g.def.ranged && g.state === 'chase' && Math.hypot(state.player.x - g.x, state.player.y - g.y) > 1.6 ? 'throw' : 'attack', { once: true, restart: true }); } }
      else if (moving) { view.attacking = false; play(view, 'walk', { speed: (g.state === 'chase' ? 1 : 0.45) * (g.def.speed / 1.5) }); }
      else { view.attacking = false; if (!play(view, 'idle')) { play(view, 'walk', { speed: 0.22 }); if (view.current === view.actions.walk) view.current.timeScale = 0.22; } }   // no idle clip: a slow shuffle beats a T-pose
      if (view.current && moving) { view.current.paused = false; if (view.current === view.actions.walk) view.current.timeScale = (g.state === 'chase' ? 1 : 0.45) * (g.def.speed / 1.5); }
      return;
    }
    if (g.state === 'dying' || g.state === 'dead') outcomeFx(g, view, dt, state);
  }
  function heartsFor(view, g, dt) {
    if (!view.hearts) {
      view.hearts = [];
      for (let i = 0; i < 3; i++) {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: gagSprite(g.gagId === 'karaoke' || g.gagId === 'bagpipes' ? 'karaoke' : 'rose', 0), transparent: true, depthWrite: false }));
        spr.scale.set(0.35, 0.35, 1); view.root.add(spr); view.hearts.push(spr);
      }
    }
    view.t += dt;
    view.hearts.forEach((h, i) => { const a = view.t * 1.5 + i * 2.1; h.position.set(Math.cos(a) * 0.6, (g.def.h || 1.8) * 0.9 + Math.sin(view.t * 2 + i) * 0.2, Math.sin(a) * 0.6); });
  }
  function outcomeFx(g, view, dt, state) {
    const u = g.dieDur ? Math.min(1, g.dieT / g.dieDur) : 1;
    const o = g.outcome, root = view.root, model = view.model;
    const hgt = g.def.h || 1.8;
    if (view.started !== o) {
      view.started = o;
      root.position.set(g.x * S, 0, g.y * S);
      if (view.current) view.current.paused = true;
      if (o === 'expire') { if (!play(view, g.gagId === 'audit' ? 'hit' : 'die', { once: true, restart: true })) view.fallOver = true; }
      if (o === 'gib') { hide(view); gibBurst(g.x * S, hgt * 0.5, g.y * S, g.isBoss ? 30 : 20, g.isBoss ? 2 : 1); wallSplats(state, g.x, g.y, 4); pool(g.x * S, g.y * S, 1.6); }
      if (o === 'squash') { pool(g.x * S, g.y * S, 2.2); puff(g.x * S, 0.3, g.y * S, 0x8a7a6a, 1.6); blood.burst(g.x * S, 0.3, g.y * S, 24, 2.2); setTint(view, new THREE.Color(0xff6a7a), new THREE.Color(0x802030), 0.45); }
      if (o === 'freeze') { const block = new THREE.Mesh(new THREE.BoxGeometry(0.9 * g.def.size + 0.3, hgt + 0.15, 0.7 * g.def.size + 0.3), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, emissive: 0x3a7ab0, emissiveIntensity: 0.35, transparent: true, opacity: 0.42, depthWrite: false })); block.position.set(g.x * S, (hgt + 0.15) / 2, g.y * S); block.scale.set(0.01, 0.01, 0.01); entGroup.add(block); view.block = block; }
      if (o === 'fling') { const from = state.player, ang = Math.atan2(g.y - from.y, g.x - from.x); const hit = CORE().castRay(state, g.x, g.y, ang, 5); const d = hit ? Math.max(0.3, hit.d - 0.35) : 5; view.flingTo = { x: (g.x + Math.cos(ang) * d) * S, z: (g.y + Math.sin(ang) * d) * S, d, ang, wall: !!hit && hit.d < 5, hx: hit ? hit.x : null, hy: hit ? hit.y : null }; view.flingFrom = { x: g.x * S, z: g.y * S }; }
      if (o === 'vapor') { setTint(view, new THREE.Color(0xffffff), new THREE.Color(0xffffff), 1); for (const m of view.mats) if (m.emissive) m.emissiveIntensity = 1.4; ash(g.x * S, g.y * S, 1.2); }
      if (o === 'chew') { view.bites = 0; }
      if (o === 'chew') { blood.burst(g.x * S, hgt * 0.5, g.y * S, 12, 2); }
      if (o === 'vapor') { flash(g.x * S, hgt * 0.5, g.y * S, 0xffffff, 1.6); }
      if (o === 'freeze') setTint(view, new THREE.Color(0x9fd8ff), new THREE.Color(0x2a6aa0), 0.0);
      if (o === 'smother') { const c = SMOTHER_COLOR[g.gagId] || 0x3ddc5a; const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 })); blob.position.set(g.x * S, 0.3, g.y * S); blob.scale.set(0.2, 0.15, 0.2); entGroup.add(blob); view.blob = blob; }
      if (o === 'glue') { const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshLambertMaterial({ color: 0xf0eee6 })); blob.position.set(g.x * S, 0.05, g.y * S); blob.scale.set(1.1, 0.25, 1.1); entGroup.add(blob); view.blob = blob; }
      if (o === 'burn') { const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spr.scale.set(1.2 * g.def.size, 1.9 * g.def.size, 1); spr.position.y = hgt * 0.5; root.add(spr); view.fire = spr; }
      if (o === 'drop') { /* sinks below */ }
    }
    switch (o) {
      case 'squash': { const k = Math.min(1, u * 3), sy = Math.max(0.16, 1 - 0.84 * k); root.scale.set(1 + 1.3 * k, sy, 1 + 1.3 * k); root.position.y = -(view.minY || 0) * (1 - sy); break; }
      case 'freeze': {
        setTint(view, new THREE.Color(0xdff4ff), new THREE.Color(0x3a7ab0), Math.min(1, u * 2));
        if (view.block) { const k = Math.min(1, u / 0.5); view.block.scale.set(k, k, k); }
        if (u > 0.55 && !view.hidden) { hide(view); if (view.block) { entGroup.remove(view.block); view.block = null; } iceShards(g.x * S, hgt * 0.5, g.y * S, 22, hgt); for (let i = 0; i < 6; i++) spawnGib(GIBS[i % GIBS.length], g.x * S, hgt * 0.5, g.y * S, 1, 0x9fd8ff, 1.5 + Math.random() * 2, 2 + Math.random() * 2); puff(g.x * S, hgt * 0.5, g.y * S, 0xbfe8ff, 1.2); }
        break;
      }
      case 'glue': { root.position.y = -Math.min(1.4, u * 1.6) * (hgt * 0.5); if (view.blob) view.blob.scale.set(1.1 + u * 0.3, 0.25 + u * 0.2, 1.1 + u * 0.3); break; }
      case 'gas': { setTint(view, new THREE.Color(0x60c840), new THREE.Color(0x2a6a10), Math.min(1, u * 1.5)); root.rotation.z = Math.sin(g.dieT * 9) * 0.18 * (1 - u); if (u > 0.7) root.rotation.x = -(u - 0.7) / 0.3 * Math.PI / 2; break; }
      case 'fling': {
        const F = view.flingTo, F0 = view.flingFrom;
        if (F && F0) {
          const k = Math.min(1, g.dieT / 0.55);                       // 0.55 s to the wall
          const x = F0.x + (F.x - F0.x) * k, z = F0.z + (F.z - F0.z) * k;
          const peak = 1.2 + Math.min(1.2, F.d * 0.3);
          if (k < 1) { root.position.set(x, Math.sin(k * Math.PI) * peak + 0.05, z); root.rotation.z = (g.spin || 0) + k * 6; root.rotation.x = k * 4; }
          else {
            if (!view.splatted) { view.splatted = true; root.rotation.set(0, root.rotation.y, 0); blood.burst(F.x, F.wall ? 1.3 : 0.4, F.z, 30, 1.6); if (F.wall) splatAt(F.hx, F.hy, F.ang, 1.3); pool(F.x, F.z, 1.2); }
            const slide = Math.min(1, (g.dieT - 0.55) / 0.7);          // then slide down the wall onto the floor
            const sy = Math.max(0.16, 1 - 0.84 * slide);
            root.position.set(F.x, (F.wall ? (1 - slide) * 1.1 : 0) - (view.minY || 0) * (1 - sy), F.z);
            root.scale.set(1 + 1.0 * slide, sy, 1 + 1.0 * slide);
          }
        } else { root.position.set(g.x * S, Math.sin(Math.min(1, g.dieT / 1.2) * Math.PI) * 1.4, g.y * S); root.rotation.z = (g.spin || 0); }
        break;
      }
      case 'drop': { root.position.y = -u * 3.2; break; }
      case 'burn': { setTint(view, new THREE.Color(0x0a0806), new THREE.Color(0x000000), Math.min(1, u * 1.6)); if (view.fire) { view.fire.material.map = flameTex(Math.floor(g.dieT * 10) % 4); view.fire.material.opacity = u < 0.8 ? 1 : (1 - u) * 5; } if (u > 0.85) { root.scale.set(1, 0.35, 1); } embers.emit(g.x * S, hgt * 0.4, g.y * S, 1); break; }
      case 'chew': { if (!view.hidden && u > 0.85) { hide(view); dropGibs(g.x * S, g.y * S, ['skull', 'ribs']); } if (Math.floor(g.dieT * 8) !== view.lastBite) { view.lastBite = Math.floor(g.dieT * 8); blood.burst(g.x * S, hgt * 0.5, g.y * S, 6, 1.4); if (view.lastBite % 2 === 0 && !view.hidden) { view.bites = (view.bites || 0) + 1; spawnGib(['arm', 'leg', 'intestines', 'arm', 'leg'][view.bites % 5], g.x * S, hgt * 0.5, g.y * S, 0.8, null, 1 + Math.random() * 2, 1.5 + Math.random() * 2); root.scale.setScalar(Math.max(0.55, 1 - view.bites * 0.06)); } } break; }
      case 'gib': break;
      case 'vapor': { if (u > 0.15) { setTint(view, new THREE.Color(0xffffff), new THREE.Color(0xffffff), 1); for (const m of view.mats) if (m.emissive) m.emissiveIntensity = Math.max(0, 1.4 - (u - 0.15) * 4); setOpacity(view, Math.max(0, 1 - (u - 0.15) * 1.6)); root.scale.set(1, Math.max(0.05, 1 - (u - 0.15) * 1.3), 1); } break; }
      case 'expire': { if (view.fallOver) root.rotation.x = -Math.min(1, Math.max(0, (u - 0.6) / 0.4)) * Math.PI / 2; if (g.gagId === 'audit' && u > 0.6 && !view.audited) { view.audited = true; play(view, 'die', { once: true, restart: true }); } break; }
      case 'shrink': { root.scale.setScalar(Math.max(0.02, g.scale)); break; }
      case 'smother': { const k = Math.min(1, u * 1.5); if (view.blob) view.blob.scale.set(0.2 + k * 1.3, 0.15 + k * 1.0, 0.2 + k * 1.3); root.position.y = -k * 0.5; break; }
      case 'inflate': { const s = g.scale != null ? g.scale : 1 + u; if (s < 0.05) { if (!view.hidden) { hide(view); gibBurst(g.x * S, hgt * 0.6, g.y * S, 22, 1.4); wallSplats(state, g.x, g.y, 4); pool(g.x * S, g.y * S, 1.8); } } else root.scale.setScalar(s); break; }
      default: break;
    }
    if (g.isBoss && g.state === 'dying' && !view.bossBurst && u > 0.5) { view.bossBurst = true; gibBurst(g.x * S, 2.5, g.y * S, 28, 2); wallSplats(state, g.x, g.y, 4); pool(g.x * S, g.y * S, 3); }
  }
  function hide(view) { view.hidden = true; if (view.model) view.model.visible = false; if (view.fire) view.fire.visible = false; if (view.block) { entGroup.remove(view.block); view.block = null; } }

  // gibs: real Meshy pieces with a little physics; they stay as scars (capped — the oldest settled ones go)
  const MAX_GIBS = 80;
  function spawnGib(name, x, y, z, big, tint, sp, up) {
    const src = models.gibByName[name] || models.gibs[Math.floor(Math.random() * models.gibs.length)] || null;
    const mesh = src ? src.clone() : new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0xa01020 }));
    if (tint != null) mesh.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(tint), 0.7); if (o.material.emissive) { o.material.emissive.setHex(tint); o.material.emissiveIntensity = 0.3; } } });
    const sc = (0.6 + Math.random() * 0.5) * big * 0.34;   // Meshy pieces come in at ~1.9 units on their long side
    mesh.scale.setScalar(sc);
    mesh.position.set(x, y, z);
    const a = Math.random() * TAU;
    entGroup.add(mesh);
    gibs.push({ mesh, v: new THREE.Vector3(Math.cos(a) * sp, up, Math.sin(a) * sp), av: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14), settled: false, bounces: 0 });
    if (gibs.length > MAX_GIBS) { const i = gibs.findIndex((b) => b.settled); const old = gibs.splice(i < 0 ? 0 : i, 1)[0]; entGroup.remove(old.mesh); }
  }
  function gibBurst(x, y, z, n, big) {
    blood.burst(x, y, z, 60 * big, 2.8 * big);
    mist(x, y, z, 1.4 * big);
    for (let i = 0; i < n; i++) {
      // the rib cage and the skull every time, then a few ropes of intestine, then the rest of the drawer
      const name = i === 0 ? 'ribs' : i === 1 ? 'skull' : i < 5 ? 'intestines' : GIBS[Math.floor(Math.random() * GIBS.length)];
      spawnGib(name, x, y + (Math.random() - 0.5) * 0.4, z, big * (name === 'ribs' || name === 'skull' ? 1.25 : 1), null, 2.5 + Math.random() * 5 * big, 4 + Math.random() * 5.5 * big);
    }
  }
  // a growing red cloud that thins out — every burst gets one
  function mist(x, y, z, size) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0x8a0a18, transparent: true, depthWrite: false, opacity: 0.75 }));
    spr.position.set(x, y, z); spr.scale.set(size * 0.4, size * 0.4, 1); entGroup.add(spr);
    extras.push({ obj: spr, life: 0.7, t: 0, fade: true, grow: size * 2.2 });
  }
  // dust / frost / smoke puff, any colour
  function puff(x, y, z, color, size) {
    for (let i = 0; i < 5; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, transparent: true, depthWrite: false, opacity: 0.55 }));
      spr.position.set(x + (Math.random() - 0.5) * size * 0.5, y + Math.random() * 0.2, z + (Math.random() - 0.5) * size * 0.5); spr.scale.set(size * 0.3, size * 0.3, 1); entGroup.add(spr);
      extras.push({ obj: spr, life: 0.8 + Math.random() * 0.4, t: 0, fade: true, grow: size * (1.2 + Math.random() * 0.6), rise: 0.6 });
    }
  }
  // a pool of blood that spreads on the floor and stays
  function pool(x, z, size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: scarTex('blood', Math.random()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU; m.position.set(x, 0.018, z); m.scale.setScalar(0.15); entGroup.add(m);
    extras.push({ obj: m, growTo: 1, growT: 0, growDur: 1.6 });
  }
  function ash(x, z, size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: scarTex('scorch', Math.random()), transparent: true, depthWrite: false, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU; m.position.set(x, 0.016, z); entGroup.add(m); extras.push({ obj: m });
  }
  // a blood splat on the wall a ray just hit (hx, hy = the wall cell's hit point in cells; ang = the flight direction)
  function splatAt(hx, hy, ang, y) {
    const dx = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang)) ? Math.sign(Math.cos(ang)) : 0, dy = dx ? 0 : Math.sign(Math.sin(ang));
    const geo = new THREE.PlaneGeometry(1.8, 1.8);
    const mat = new THREE.MeshBasicMaterial({ map: scarTex('blood', Math.random()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const m = new THREE.Mesh(geo, mat);
    const px = hx * S - dx * 0.03, pz = hy * S - dy * 0.03;
    m.position.set(px, y, pz); m.lookAt(px - dx, y, pz - dy); m.rotateZ(Math.random() * TAU);
    entGroup.add(m); extras.push({ obj: m });
  }
  // THE EXPLOSION KIT: fireball + smoke ring + light + a scorch — rocket, meteor, the wrong-way rocket, the pile driver
  function boomFx(x, y, z, r) {
    const R = Math.max(0.8, r) * S * 0.9;
    const cols = [0xfff2b0, 0xffa030, 0xff4a10];
    cols.forEach((c, i) => {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1 }));
      spr.position.set(x, y + 0.2 + i * 0.15, z); spr.scale.set(0.3, 0.3, 1); entGroup.add(spr);
      extras.push({ obj: spr, life: 0.38 + i * 0.12, t: 0, fade: true, grow: R * (1.6 - i * 0.3), rise: 1.2 });
    });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0x3a3030, transparent: true, depthWrite: false, opacity: 0.6 }));
      spr.position.set(x, 0.3, z); spr.scale.set(R * 0.35, R * 0.35, 1); entGroup.add(spr);
      extras.push({ obj: spr, life: 0.9, t: 0, fade: true, grow: R * 0.8, vx: Math.cos(a) * R * 1.6, vz: Math.sin(a) * R * 1.6, rise: 0.5 });
    }
    const l = new THREE.PointLight(0xffa040, 160, 14, 2); l.position.set(x, y + 0.4, z); entGroup.add(l);
    extras.push({ obj: l, life: 0.3, t: 0, light: true });
    shakeAmt = Math.max(shakeAmt, 0.9 * look.shake);
  }
  // a thing landed hard: dust ring + shake
  function impactFx(x, z, r) {
    const R = Math.max(0.6, r) * S;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0x7a6a5a, transparent: true, depthWrite: false, opacity: 0.6 }));
      spr.position.set(x, 0.2, z); spr.scale.set(R * 0.3, R * 0.3, 1); entGroup.add(spr);
      extras.push({ obj: spr, life: 0.7, t: 0, fade: true, grow: R * 0.7, vx: Math.cos(a) * R * 1.4, vz: Math.sin(a) * R * 1.4, rise: 0.3 });
    }
    shakeAmt = Math.max(shakeAmt, 0.7 * look.shake);
  }
  function dropGibs(x, z, names) {
    for (const name of names) {
      const src = models.gibByName[name] || models.gibs[0];
      if (!src) continue;
      const mesh = src.clone(); mesh.scale.setScalar(0.22); mesh.position.set(x + (Math.random() - 0.5) * 0.8, 0.3, z + (Math.random() - 0.5) * 0.8);
      entGroup.add(mesh);
      gibs.push({ mesh, v: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2), av: new THREE.Vector3(3, 3, 3), settled: false, bounces: 0 });
    }
  }
  function iceShards(x, y, z, n, hgt) {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12 + Math.random() * 0.2, 0.12 + Math.random() * 0.35, 0.08), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, emissive: 0x3a7ab0, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
      mesh.position.set(x, y + (Math.random() - 0.5) * hgt * 0.6, z);
      const a = Math.random() * TAU, sp = 1.5 + Math.random() * 3;
      entGroup.add(mesh);
      shards.push({ mesh, v: new THREE.Vector3(Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp), av: new THREE.Vector3(4, 6, 4), settled: false, bounces: 0 });
    }
  }
  function stepBodies(list, dt) {
    for (const b of list) {
      if (b.settled) continue;
      b.v.y -= 14 * dt;
      b.mesh.position.addScaledVector(b.v, dt);
      b.mesh.rotation.x += b.av.x * dt; b.mesh.rotation.y += b.av.y * dt; b.mesh.rotation.z += b.av.z * dt;
      // walls: stay inside the open cell
      if (levelRef) { const cx = b.mesh.position.x / S, cz = b.mesh.position.z / S; if (CORE().cellAt(levelRef, cx, cz) !== 0) { b.mesh.position.addScaledVector(b.v, -dt); b.v.x *= -0.4; b.v.z *= -0.4; } }
      if (b.mesh.position.y < 0.12) {
        b.mesh.position.y = 0.12; b.bounces++;
        if (b.bounces > 2 || Math.abs(b.v.y) < 1.2) { b.settled = true; b.mesh.rotation.x = Math.round(b.mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2); blood.drip(b.mesh.position.x, b.mesh.position.z); }
        else { b.v.y = -b.v.y * 0.35; b.v.x *= 0.6; b.v.z *= 0.6; b.av.multiplyScalar(0.5); }
      }
    }
  }
  // wall splats: a blood decal on the nearest walls
  function wallSplats(state, cx, cy, n) {
    const level = state.level, C = CORE().CELL;
    const x = Math.floor(cx), y = Math.floor(cy);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let placed = 0;
    for (const [dx, dy] of dirs) {
      if (placed >= n) break;
      const v = CORE().cellAt(level, x + dx, y + dy);
      if (v === C.OPEN) continue;
      const geo = new THREE.PlaneGeometry(1.6, 1.6);
      const mat = new THREE.MeshBasicMaterial({ map: scarTex('blood', Math.random()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const m = new THREE.Mesh(geo, mat);
      const px = (x + 0.5) * S + dx * (S / 2 - 0.03), pz = (y + 0.5) * S + dy * (S / 2 - 0.03);
      m.position.set(px, 1.0 + Math.random() * 0.8, pz);
      m.lookAt(px - dx, m.position.y, pz - dy);
      m.rotateZ(Math.random() * TAU);
      entGroup.add(m); extras.push({ obj: m });
      placed++;
    }
  }
  function flash(x, y, z, color, size) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    spr.position.set(x, y, z); spr.scale.set(size, size, 1); entGroup.add(spr);
    extras.push({ obj: spr, life: 0.25, t: 0, fade: true });
  }

  // particles: blood and embers as Points
  function makeParticles(color, size, gravity, max) {
    const pos = new Float32Array(max * 3), vel = new Float32Array(max * 3), life = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, map: softDot(), transparent: true, depthWrite: false, sizeAttenuation: true, blending: gravity > 0 ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
    let head = 0;
    const drips = [];
    return {
      burst(x, y, z, n, sp) { for (let i = 0; i < n; i++) { const k = head++ % max; const a = Math.random() * TAU, e = Math.random() * Math.PI; pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; vel[k * 3] = Math.cos(a) * Math.sin(e) * sp * (0.5 + Math.random()); vel[k * 3 + 1] = Math.abs(Math.cos(e)) * sp * (0.5 + Math.random()) + 1; vel[k * 3 + 2] = Math.sin(a) * Math.sin(e) * sp * (0.5 + Math.random()); life[k] = 1.2 + Math.random(); } },
      emit(x, y, z, n) { for (let i = 0; i < n; i++) { const k = head++ % max; pos[k * 3] = x + (Math.random() - 0.5) * 0.5; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z + (Math.random() - 0.5) * 0.5; vel[k * 3] = (Math.random() - 0.5); vel[k * 3 + 1] = 1 + Math.random() * 1.5; vel[k * 3 + 2] = (Math.random() - 0.5); life[k] = 0.8 + Math.random() * 0.6; } },
      drip(x, z) { if (drips.length > 90 || gravity <= 0) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ map: scarTex('blood', Math.random()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU; m.position.set(x, 0.015, z); entGroup.add(m); drips.push(m); extras.push({ obj: m }); },
      step(dt) {
        for (let k = 0; k < max; k++) {
          if (life[k] <= 0) { pos[k * 3 + 1] = -100; continue; }
          life[k] -= dt;
          vel[k * 3 + 1] -= gravity * dt;
          pos[k * 3] += vel[k * 3] * dt; pos[k * 3 + 1] += vel[k * 3 + 1] * dt; pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
          if (gravity > 0 && pos[k * 3 + 1] < 0.02) { life[k] = 0; if (Math.random() < 0.25) this.drip(pos[k * 3], pos[k * 3 + 2]); pos[k * 3 + 1] = -100; }
        }
        geo.attributes.position.needsUpdate = true;
      },
      reset() { life.fill(0); for (let k = 0; k < max; k++) pos[k * 3 + 1] = -100; drips.length = 0; geo.attributes.position.needsUpdate = true; },
    };
  }
  const blood = makeParticles(0xa80f22, 0.16, 12, 600);
  const embers = makeParticles(0xff8a20, 0.1, -0.5, 300);

  // shots, zones, scars, beams
  function syncShots(state, t) {
    const seen = new Set();
    for (const s of state.shots) {
      if (s.sprite === 'none') continue;
      seen.add(s.id);
      let spr = shotViews.get(s.id);
      if (!spr) {
        const src = propFor(s.sprite);
        if (src) { spr = src.clone(); spr.userData.prop = s.sprite; spr.userData.halfH = src.userData.halfH; spr.userData.halfW = src.userData.halfW; }
        else spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: gagSprite(s.sprite, 0), transparent: true, depthWrite: false }));
        entGroup.add(spr); shotViews.set(s.id, spr);
      }
      if (spr.userData.prop) { syncPropShot(s, spr, state); continue; }
      spr.material.map = gagSprite(s.sprite, s.t);
      let sz = 0.5;
      if (s.kind === 'train') sz = 1.4; else if (s.kind === 'melee') sz = 0.55; else if (s.kind === 'summon') sz = 0.6; else if (s.gag.count) sz = 0.3; else if (s.gag.kind === 'stream') sz = 0.22;
      if (['cow', 'yak', 'tent', 'bus'].includes(s.gag.id)) sz = 1.1;
      if (['sumo', 'grandma', 'doll'].includes(s.gag.id)) sz = 0.9;
      sz *= S * look.spriteScale;
      spr.scale.set(sz, sz, 1);
      if (s.kind === 'melee') {
        // the lunge: from a cell out to the reach and back, never a card over the lens
        const k = Math.min(1, s.t / s.life), out = 0.7 + Math.sin(k * Math.PI) * Math.max(0.4, (s.reach || 2) - 0.7);
        spr.position.set((s.x + Math.cos(s.a) * out) * S, 0.35 * S + sz * 0.15, (s.y + Math.sin(s.a) * out) * S);
        spr.material.opacity = k < 0.8 ? 1 : (1 - k) * 5;
      } else {
        spr.position.set(s.x * S, (s.z != null ? s.z : 0.3) * S + sz * 0.15, s.y * S);
        const dp = Math.hypot(s.x - state.player.x, s.y - state.player.y);
        spr.material.opacity = dp < 0.9 ? Math.max(0, (dp - 0.45) / 0.45) : 1;
      }
    }
    for (const [id, spr] of shotViews) if (!seen.has(id)) { shotViews.delete(id); if (spr.userData.prop && PROPS[spr.userData.prop].stays) restProp(spr); else entGroup.remove(spr); }
  }
  // a prop in flight: faces its way, spins / rolls / tumbles / walks by its kind
  function syncPropShot(s, obj, state) {
    const def = PROPS[obj.userData.prop], hh = obj.userData.halfH;
    const a = s.a != null ? s.a : Math.atan2(s.vy || 0, s.vx || 1);
    let y = (s.z != null ? s.z : 0.3) * S;
    if (def.motion === 'drive' || def.motion === 'walk' || def.motion === 'none') y = hh;
    if (def.motion === 'flyhigh') y = 1.3 + Math.sin(s.t * 6) * 0.15;
    if (def.motion === 'walk') y = hh + Math.abs(Math.sin(s.t * 9)) * 0.08;
    obj.position.set(s.x * S, y, s.y * S);
    obj.rotation.set(0, -a + Math.PI / 2, 0);     // Meshy props face -Z at rest; turn them to face along the flight
    if (def.motion === 'spin') obj.rotateY(s.t * 14);
    if (def.motion === 'roll') obj.rotateX(s.t * 9);
    if (def.motion === 'tumble') { obj.rotateX(s.t * 4); obj.rotateZ(s.t * 2.5); }
    if (def.motion === 'walk') obj.rotateZ(Math.sin(s.t * 9) * 0.08);
    if (def.motion === 'fly') obj.rotateX(-0.2);
    const dp = Math.hypot(s.x - state.player.x, s.y - state.player.y);
    obj.visible = dp > 0.5 && (s.kind !== 'melee' || s.t < s.life * 0.85);
  }
  // a prop that stays: settle it on the floor where it stopped and keep it for the level
  function restProp(obj) {
    obj.position.y = obj.userData.halfH * 0.9;
    obj.rotation.set(0, obj.rotation.y, (Math.random() - 0.5) * 0.3);
    if (levelRef) { const cx = obj.position.x / S, cz = obj.position.z / S; if (CORE().cellAt(levelRef, cx, cz) !== 0) { obj.position.x = (Math.floor(cx) + 0.5) * S; obj.position.z = (Math.floor(cz) + 0.5) * S; } }
    obj.visible = true;
    extras.push({ obj });
  }
  function syncZones(state, t) {
    const seen = new Set();
    for (const z of state.zones) {
      if (z.mode === 'meleehit') continue;
      seen.add(z.id);
      let v = zoneViews.get(z.id);
      if (!v) {
        const src = (z.mode === 'drop' || z.mode === 'flash') ? propFor(z.sprite) : null;
        let spr;
        if (src) { spr = src.clone(); spr.userData.prop = z.sprite; spr.userData.halfH = src.userData.halfH; spr.rotation.y = Math.random() * TAU; }
        else spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: gagSprite(z.sprite, 0), transparent: true, depthWrite: false }));
        v = { obj: spr, light: null, prop: !!src };
        if (z.mode === 'pull') { v.light = new THREE.PointLight(0xb070ff, 30, 12, 2); spr.add(v.light); }
        entGroup.add(spr); zoneViews.set(z.id, v);
      }
      const spr = v.obj;
      if (!v.prop) spr.material.map = gagSprite(z.sprite, z.t);
      if (z.mode === 'drop') {
        const u = z.done ? 1 : Math.min(1, z.t / z.dur); const sz = (z.gag.id === 'tent' ? 2.4 : 1.0) * S;
        if (v.prop) { spr.position.set(z.x * S, (1 - u) * (1 - u) * 6 + spr.userData.halfH, z.y * S); if (!z.done) spr.rotation.x = (1 - u) * 1.2; else spr.rotation.x = 0; }
        else { spr.scale.set(sz, sz, 1); spr.position.set(z.x * S, (1 - u) * 6 + sz * 0.4, z.y * S); spr.material.opacity = z.done ? Math.max(0, 1 - (z.t - z.dur + 0.5) * 2) : 1; }
        if (!v.shadow) { v.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); v.shadow.rotation.x = -Math.PI / 2; v.shadow.position.set(z.x * S, 0.02, z.y * S); entGroup.add(v.shadow); }
        const sr = (z.r || 0.8) * S * (0.2 + 0.8 * u); v.shadow.scale.set(sr, sr, 1); v.shadow.material.opacity = z.done ? 0 : 0.55;
        if (z.done && !v.landed) { v.landed = true; impactFx(z.x * S, z.y * S, z.r || 0.8); }
      }
      else if (z.mode === 'pull') { const sz = 1.5 * S; spr.scale.set(sz, sz, 1); spr.position.set(z.x * S, 1.2, z.y * S); }
      else if (z.mode === 'wander') {
        const sz = 2.4 * S; spr.scale.set(sz * 0.8, sz, 1); spr.position.set(z.x * S, sz * 0.45, z.y * S); spr.material.opacity = 0.35;
        if (!v.cone) { v.cone = new THREE.Group(); for (let i = 0; i < 7; i++) { const rr = 0.25 + i * 0.28; const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.05 + i * 0.02, 6, 24), new THREE.MeshBasicMaterial({ color: 0xb8b0a8, transparent: true, opacity: 0.5 - i * 0.04, depthWrite: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2 + i * 0.42; ring.userData.i = i; v.cone.add(ring); } entGroup.add(v.cone); }
        v.cone.position.set(z.x * S, 0, z.y * S); v.cone.children.forEach((ring) => { ring.rotation.z = t * (9 - ring.userData.i * 0.6); ring.position.x = Math.sin(t * 3 + ring.userData.i) * 0.15 * ring.userData.i / 3; });
      }
      else if (z.mode === 'flash' && v.prop) { spr.position.set(z.x * S, spr.userData.halfH, z.y * S); }
      else if (z.mode === 'flash') { const sz = 1.3 * S; spr.scale.set(sz, sz, 1); spr.position.set(z.x * S, sz * 0.4, z.y * S); spr.material.opacity = z.gag.scar ? 0 : Math.max(0, 1 - z.t / z.dur); }
    }
    for (const [id, v] of zoneViews) if (!seen.has(id)) { if (v.prop && PROPS[v.obj.userData.prop].stays) { v.obj.rotation.x = 0; extras.push({ obj: v.obj }); } else entGroup.remove(v.obj); if (v.shadow) entGroup.remove(v.shadow); if (v.cone) entGroup.remove(v.cone); zoneViews.delete(id); }
  }
  const BILLBOARD_SCARS = new Set(['gas', 'stink']);
  function syncScars(state, t) {
    const seen = new Set();
    for (const s of state.scars) {
      seen.add(s.id);
      let m = scarViews.get(s.id);
      if (!m) {
        if (s.gag && PROPS[s.gag.sprite] && PROPS[s.gag.sprite].stays && models.props[s.gag.sprite] && s.type !== 'blood' && s.type !== 'scorch') continue;   // the prop itself is the scar
        const map = scarTex(s.type, s.seed);
        if (!map) continue;
        if (BILLBOARD_SCARS.has(s.type)) {
          m = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0.8 }));
          const sz = s.r * 2 * S; m.scale.set(sz, sz * 0.8, 1); m.position.set(s.x * S, sz * 0.35, s.y * S);
        } else {
          const sz = s.r * 2 * S * look.decalScale;
          const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
          if (s.type === 'lava') { mat.color.setHex(0xffffff); }
          m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat);
          m.rotation.x = -Math.PI / 2; m.rotation.z = s.a;
          m.position.set(s.x * S, 0.012 + (s.id % 7) * 0.002, s.y * S);
          // a light for the hot ones
          if (s.type === 'lava') { const l = new THREE.PointLight(0xff5a1a, 25, 8, 2); l.position.y = 0.4; m.add(l); }
        }
        entGroup.add(m); scarViews.set(s.id, m);
      }
      if (s.life !== Infinity) m.material.opacity = Math.min(BILLBOARD_SCARS.has(s.type) ? 0.8 : 1, (s.life - s.t) / 2);
      if (BILLBOARD_SCARS.has(s.type)) { m.material.rotation = Math.sin(t * 0.7 + s.id) * 0.2; }
    }
    for (const [id, m] of scarViews) if (!seen.has(id)) { entGroup.remove(m); scarViews.delete(id); }
  }
  function syncBeams(state, muzzleWorld) {
    const seen = new Set();
    for (const b of state.beams) {
      const id = b.x0 + ':' + b.y0 + ':' + b.x1 + ':' + b.y1;
      seen.add(id);
      let m = beamViews.get(id);
      if (!m) {
        const fromMuzzle = Math.hypot(b.x0 - state.player.x, b.y0 - state.player.y) < 0.6;
        const a = fromMuzzle ? muzzleWorld.clone() : new THREE.Vector3(b.x0 * S, 1.2, b.y0 * S);
        const c = new THREE.Vector3(b.x1 * S, 1.1, b.y1 * S);
        const color = b.gag.id === 'lightning' ? 0x9fdcff : b.gag.id === 'sand' ? 0xffffff : b.gag.id === 'shrinkray' ? 0x7fff9a : b.gag.id === 'curse' ? 0x6b3a1a : 0xffe8a0;
        const len = a.distanceTo(c);
        const geo = new THREE.CylinderGeometry(b.gag.id === 'curse' ? 0.08 : 0.025, b.gag.id === 'curse' ? 0.08 : 0.025, len, 6, 1, true);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: b.gag.id === 'curse' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
        m = new THREE.Mesh(geo, mat);
        m.position.copy(a).lerp(c, 0.5); m.lookAt(c);
        if (b.gag.id === 'lightning' && b.chain) for (const q of b.chain) { const c2 = new THREE.Vector3(q.x * S, 1.1, q.y * S); const l2 = c.distanceTo(c2); const g2 = new THREE.CylinderGeometry(0.02, 0.02, l2, 5, 1, true); g2.rotateX(Math.PI / 2); const m2 = new THREE.Mesh(g2, mat); m2.position.copy(c).lerp(c2, 0.5); m2.lookAt(c2); m2.position.sub(m.position); m2.quaternion.premultiply(m.quaternion.clone().invert()); m.add(m2); }
        if (b.gag.id !== 'curse') { const l = new THREE.PointLight(color, 40, 10, 2); l.position.set(0, 0, len / 2 - 0.3); m.add(l); }
        entGroup.add(m); beamViews.set(id, m);
      }
      m.material.opacity = Math.min(1, (1 - b.t / b.life) * 1.5);
    }
    for (const [id, m] of beamViews) if (!seen.has(id)) { entGroup.remove(m); beamViews.delete(id); }
  }

  // ---- the viewmodel ------------------------------------------------------------------------------
  const RUNES = '᚛ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎᚏᚐᚑᚒᚓᚔᚕᚖᚗᚘᚙᚚ';
  const vmRoot = new THREE.Group(); vmScene.add(vmRoot);
  const vmLight = new THREE.DirectionalLight(0xfff0dc, 1.6); vmLight.position.set(-0.4, 1, 0.6); vmScene.add(vmLight);
  vmScene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const chamberLight = new THREE.PointLight(0xff2fb8, 2.5, 1.2, 2); vmRoot.add(chamberLight);
  let vmWindow = null, vmMuzzle = null, vmFlash = null;
  const vm = { recoil: 0, spin: 0, mood: 'idle', dead: 0, bob: 0, t: 0, muzzle: 0 };
  function buildViewmodel() {
    while (vmRoot.children.length > 1) vmRoot.remove(vmRoot.children[vmRoot.children.length - 1]);
    let rifle;
    if (models.rifle) { rifle = models.rifle.clone(); fitTo(rifle, 0.7); rifle.rotation.y = -Math.PI / 2; }
    else { rifle = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 12), new THREE.MeshLambertMaterial({ color: 0x2a2230 })); b.rotation.x = Math.PI / 2; b.position.z = -0.3; rifle.add(b); const ch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshLambertMaterial({ color: 0x5a2a7a, emissive: 0xff2fb8, emissiveIntensity: 0.4 })); ch.position.z = 0.05; rifle.add(ch); }
    rifle.position.set(0, 0, 0);
    vmRoot.add(rifle);
    if (models.gauntlets) { const g = models.gauntlets.clone(); fitTo(g, 0.34); g.position.set(0.0, -0.11, 0.08); g.rotation.set(1.15, 0, 0); vmRoot.add(g); }
    chamberLight.position.set(0, 0.06, 0.04); chamberLight.distance = 0.7;
    // the rune window: a small sprite that scrolls while the reel spins
    vmWindow = new THREE.Sprite(new THREE.SpriteMaterial({ map: runeTex(0), transparent: true, depthTest: false }));
    vmWindow.scale.set(0.075, 0.048, 1); vmWindow.position.set(-0.01, 0.075, 0.13); vmWindow.renderOrder = 5; vmRoot.add(vmWindow);
    vmMuzzle = new THREE.Object3D(); vmMuzzle.position.set(0, 0.02, -0.75); vmRoot.add(vmMuzzle);
    vmFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xffd080, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, opacity: 0 }));
    vmFlash.scale.set(0.5, 0.5, 1); vmMuzzle.add(vmFlash);
  }
  buildViewmodel();
  function fitTo(obj, length) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const k = length / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(k);
    const box2 = new THREE.Box3().setFromObject(obj);
    const c = box2.getCenter(new THREE.Vector3());
    obj.position.sub(c);
  }
  function runeTex(frame) {
    return canvasTex('rune|' + frame, (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d'); g.fillStyle = '#12060f'; g.beginPath(); g.roundRect(0, 0, 128, 80, 14); g.fill(); g.font = '900 34px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = frame < 0 ? '#ff2fb8' : '#ffd23a'; const i = Math.abs(frame); g.fillText(RUNES[i % RUNES.length] + ' ' + RUNES[(i * 7 + 3) % RUNES.length] + ' ' + RUNES[(i * 3 + 11) % RUNES.length], 64, 40 + (frame < 0 ? (i % 3) * 6 - 6 : 0)); return c; })());
  }
  const _muzzleWorld = new THREE.Vector3();
  function updateViewmodel(dt, p) {
    vm.t += dt;
    vm.recoil = Math.max(0, vm.recoil - dt * 4.5);
    vm.muzzle = Math.max(0, vm.muzzle - dt * 8);
    const shud = vm.mood === 'shudder' ? (Math.random() - 0.5) * 0.012 : 0;
    const bobY = Math.abs(Math.sin(vm.bob * TAU)) * look.bob * 0.02, bobX = Math.sin(vm.bob * TAU) * look.bob * 0.015;
    vmRoot.position.set(look.vmX + bobX + shud, look.vmY + bobY + shud - vm.dead * 0.25 + vm.recoil * 0.04, look.vmZ + vm.recoil * 0.12);
    vmRoot.rotation.set(-vm.recoil * 0.22 + vm.dead * 0.35, 0.06, vm.dead * 0.3);
    vmRoot.scale.setScalar(look.vmScale);
    if (vmWindow) vmWindow.material.map = vm.spin > 0 ? runeTex(-Math.floor(vm.spin * 14)) : runeTex(Math.floor(vm.t * 0.5) % RUNES.length);
    chamberLight.intensity = vm.mood === 'purr' ? 1.2 + Math.sin(vm.t * 18) * 1.0 : 0.5;
    if (vmFlash) { vmFlash.material.opacity = vm.muzzle; vmFlash.scale.setScalar(0.4 + vm.muzzle * 0.5); }
    muzzleLight.intensity = vm.muzzle * 120;
  }

  // ---- camera + frame -----------------------------------------------------------------------------
  let shakeT = 0, shakeAmt = 0;
  function shake(a) { shakeAmt = Math.max(shakeAmt, a * look.shake); }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(2, (devicePixelRatio || 1) * look.res));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = look.fov; camera.updateProjectionMatrix();
    vmCamera.aspect = w / h; vmCamera.updateProjectionMatrix();
  }
  function setLook(l) {
    Object.assign(look, l);
    camera.fov = look.fov; camera.updateProjectionMatrix();
    if (scene.fog) scene.fog.far = look.fog;
    ambient.intensity = 0.6 * look.brightness; hemi.intensity = 0.7 * look.brightness;
  }
  const _fwd = new THREE.Vector3(), _tgt = new THREE.Vector3();
  function update(state, view, dt) {
    const p = state.player;
    shakeT += dt; shakeAmt = Math.max(0, shakeAmt - dt * 2.4);
    const sx = Math.sin(shakeT * 37) * shakeAmt * 0.02, sy = Math.cos(shakeT * 29) * shakeAmt * 0.015;
    const bobY = Math.abs(Math.sin((view.bob || 0) * TAU)) * look.bob * 0.05;
    camera.position.set(p.x * S + sx, EYE + bobY + sy - (p.fx && p.fx.lump > 0 ? 0.12 : 0), p.y * S);
    _fwd.set(Math.cos(p.a), 0, Math.sin(p.a));
    _tgt.copy(camera.position).add(_fwd); _tgt.y += (view.pitch || 0);
    camera.lookAt(_tgt);
    runeLight.position.copy(camera.position).addScaledVector(_fwd, 0.6); runeLight.position.y -= 0.3;
    muzzleLight.position.copy(camera.position).addScaledVector(_fwd, 1.2); muzzleLight.position.y -= 0.2;
    // torches: the nearest four get live flicker
    if (torches.length) {
      const near = torches.map((t) => ({ t, d: (t.x - camera.position.x) ** 2 + (t.z - camera.position.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 4);
      torchLights.forEach((l, i) => { const n = near[i]; if (!n) { l.intensity = 0; return; } l.position.set(n.t.x, n.t.y + 0.3, n.t.z); l.intensity = (14 + Math.sin(shakeT * 11 + i * 2) * 3 + Math.sin(shakeT * 23 + i) * 2) * look.torchLight; l.color.setHex(THEMES[levelRef ? levelRef.theme : 0].torch); });
      const f = Math.floor(shakeT * 9);
      for (let i = 0; i < torches.length; i++) { const t = torches[i]; if (t.sprite) { t.sprite.material.map = flameTex((f + i) % 4); t.sprite.scale.set(0.5 + Math.sin(shakeT * 13 + i) * 0.05, 0.75 + Math.sin(shakeT * 17 + i * 3) * 0.08, 1); } }
    }
    // the door
    if (doorMesh) { const want = state.doorOpen ? 1 : 0; doorOpenAnim += (want - doorOpenAnim) * Math.min(1, dt * 2.5); doorMesh.position.y = doorMesh.userData.baseY + doorOpenAnim * H_LOW * 0.95; }
    if (healViews.length) { const m = canvasTex('heal|' + (Math.floor(view.t * 8) % 16), D().healSprite(view.t)); for (const v of healViews) { v.spr.visible = !v.h.taken; v.spr.material.map = m; v.spr.position.y = 0.55 + Math.sin(view.t * 2.5 + v.h.x) * 0.06; } }
    if (keyView) { keyView.material.map = canvasTex('key|' + (Math.floor(view.t * 8) % 16), D().keySprite(view.t)); keyView.position.y = 1.1 + Math.sin(view.t * 3) * 0.12; keyLight.position.copy(keyView.position); keyLight.intensity = state.key && state.key.held ? 0 : 6 + Math.sin(view.t * 5) * 2; if (state.key && state.key.held) keyView.visible = false; }
    // creatures
    const seen = new Set();
    for (const g of state.goons) {
      seen.add(g.id);
      let v = goonViews.get(g.id);
      if (!v) { v = makeGoonView(g); goonViews.set(g.id, v); }
      syncGoon(g, v, dt, state);
    }
    for (const [id, v] of goonViews) if (!seen.has(id)) { entGroup.remove(v.root); if (v.blob) entGroup.remove(v.blob); if (v.block) entGroup.remove(v.block); goonViews.delete(id); }
    syncShots(state, view.t);
    syncZones(state, view.t);
    syncScars(state, view.t);
    // muzzle in world space for beams
    _muzzleWorld.copy(camera.position).addScaledVector(_fwd, 0.9); _muzzleWorld.y -= 0.32;
    const right = new THREE.Vector3(-_fwd.z, 0, _fwd.x); _muzzleWorld.addScaledVector(right, 0.25);
    syncBeams(state, _muzzleWorld);
    stepBodies(gibs, dt); stepBodies(shards, dt);
    blood.step(dt); embers.step(dt);
    for (let i = extras.length - 1; i >= 0; i--) {
      const e = extras[i];
      if (e.growTo != null) { e.growT += dt; const k = Math.min(1, e.growT / e.growDur); e.obj.scale.setScalar(0.15 + (e.growTo - 0.15) * (1 - (1 - k) * (1 - k))); if (k >= 1) e.growTo = null; }
      if (e.life == null) continue;
      e.t += dt; const u = Math.min(1, e.t / e.life);
      if (e.grow) { const k = 0.3 + 0.7 * (1 - (1 - u) * (1 - u)); e.obj.scale.set(e.grow * k, e.grow * k, 1); }
      if (e.rise) e.obj.position.y += e.rise * dt;
      if (e.vx) { e.obj.position.x += e.vx * dt * (1 - u); e.obj.position.z += e.vz * dt * (1 - u); }
      if (e.light) e.obj.intensity = 160 * (1 - u);
      if (e.fade && e.obj.material) e.obj.material.opacity = (e.obj.material.userData.o0 != null ? e.obj.material.userData.o0 : (e.obj.material.userData.o0 = e.obj.material.opacity)) * (1 - u);
      if (e.t >= e.life) { entGroup.remove(e.obj); extras.splice(i, 1); }
    }
    // the player's rune light dims when the rifle plays dead
    runeLight.intensity = p.fx && p.fx.dead > 0 ? 1 : 6;
    updateViewmodel(dt, p);
    if (skipRender) return;   // the review captures step many frames per saved one
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(vmScene, vmCamera);
  }
  let skipRender = false;

  return { setSkipRender(v) { skipRender = !!v; }, debugGoon(id) { const v = goonViews.get(id); if (!v) return null; const r = v.root; let meshes = 0, vis = 0; r.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { meshes++; if (o.visible) vis++; } }); return { pos: r.position.toArray(), scale: r.scale.toArray(), visible: r.visible, modelVisible: v.model && v.model.visible, hidden: v.hidden, meshes, vis, inScene: !!r.parent, started: v.started }; }, boom(x, y, r, gagId) { if (BOOM_GAGS.has(gagId)) boomFx(x * S, 0.5, y * S, r || 1); else { impactFx(x * S, y * S, (r || 1) * 0.7); puff(x * S, 0.5, y * S, SPLASH_COLOR[gagId] || 0x9a8a7a, (r || 1) * 1.6); } }, strike(x, y) { blood.burst(x * S, 0.9, y * S, 12, 1.6); mist(x * S, 0.9, y * S, 0.7); }, impact(x, y, r) { impactFx(x * S, y * S, r || 0.8); },
    load, buildLevel, update, resize, setLook, shake, look, vm, scene, camera, renderer, vmRoot, models, goonViews,
    fire() { vm.recoil = 1; vm.muzzle = 1; vm.spin = 0; vm.mood = 'idle'; },
    get ready() { return assetsReady; }, get failed() { return assetsFailed; },
    gibBurst, blood, S,
  };
}
