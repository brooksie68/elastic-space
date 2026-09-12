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
const H_LOW = 4.4, H_TALL = 8.0, HEIGHTS = [4.4, 8.0, 11.0];   // corridor · room · great hall, by level.tall (2026-09-11: up from 3.2 / 5.4 — James: 'bigger rooms, higher ceilings')
const TAU = Math.PI * 2;
const D = () => globalThis.JabberwockyDraw;
const CORE = () => globalThis.JabberwockyCore;

// themes: tile names live in assets/textures/t<theme>-<slot>.jpg — a bare slot name means this theme's tile, a full name
// (t1-floor) borrows another theme's. DISTRICTS (James 2026-09-11, 'different wall textures, colors, lighting'): the core
// gives every room a district and the corridors join the nearest room's (level.district); a wing wears one of these in
// turn — its own four walls (A is ~62% of walls, D ~5%), floor, ceiling and light colour (the torches and the baked light
// take it) — so "the moss wing" and "the rust wing" read as different places. landmarks: the Meshy pieces
// (assets/models/landmarks/) dealt to the room slots, the hero first (the hall's middle); hang: a piece hung from the
// ceiling over every room's slot. GLOW: tiles that light themselves (lava, crystal, runes) with the emissive strength.
const THEMES = [
  { fog: 0x0a0608, base: 0.55, torch: 0xffa040, sign: { bg: '#2a1a0c', ink: '#f0c060', font: 'bold 60px Georgia, serif', word: 'GATE' },
    districts: [
      { walls: ['wall1', 'wall2', 'wall3', 'wall2'], floor: 'floor', ceil: 'ceil', light: 0xffa040 },       // the gatehouse: stone and iron under torch amber
      { walls: ['wall2', 'wall2', 'wall1', 'wall3'], floor: 't1-floor', ceil: 'ceil', light: 0x7cff6a },    // the moss wing: green light on the moss walls
      { walls: ['wall3', 'wall1', 'wall2', 'wall1'], floor: 'floor', ceil: 't1-ceil', light: 0xffd890 },    // the iron wing: pale lamps
    ],
    landmarks: ['statue', 'well', 'brazier', 'banner'], hang: null },
  { fog: 0x0b0806, base: 0.52, torch: 0xffb050, sign: { bg: '#141018', ink: '#e8e0d0', font: 'bold 58px Trebuchet MS, sans-serif', word: 'WAY OUT', chalk: true },
    districts: [
      { walls: ['wall2', 'wall1', 'wall3', 'wall1'], floor: 'floor', ceil: 'ceil', light: 0xffb050 },       // the ossuary: candle amber on brick and bone
      { walls: ['wall3', 'wall3', 'wall1', 'wall2'], floor: 'floor', ceil: 'ceil', light: 0x6a8cff },       // the blue crypt
      { walls: ['wall1', 'wall1', 'wall2', 'wall3'], floor: 't0-floor', ceil: 'ceil', light: 0xfff0c8 },    // the bone hall: bone white
    ],
    landmarks: ['ossuary', 'sarcophagus', 'bonepillar', 'chandelier'], hang: 'chandelier' },
  { fog: 0x06090a, base: 0.60, torch: 0xd0e8ff, sign: { bg: '#0a3a14', ink: '#e0ffe8', font: 'bold 64px Arial Black, Arial, sans-serif', word: 'EXIT', box: true },
    districts: [
      { walls: ['wall1', 'wall2', 'wall3', 'wall3'], floor: 'floor', ceil: 'ceil', light: 0xd0e8ff },       // the killing floor: cold fluorescent
      { walls: ['wall2', 'wall2', 'wall2', 'wall1'], floor: 'floor', ceil: 'ceil', light: 0xff3838 },       // the boiler wing: red emergency lamps
      { walls: ['wall3', 'wall3', 'wall1', 'wall2'], floor: 'floor', ceil: 't3-ceil', light: 0xa8f4ff },    // the freezer: frost white
    ],
    landmarks: ['grinder', 'boiler', 'barrels', 'carcass'], hang: 'carcass' },
  { fog: 0x06040c, base: 0.42, torch: 0xb070ff, sign: { bg: '#0c0618', ink: '#d0a0ff', font: 'bold 60px Georgia, serif', word: 'ONWARD', glow: true },
    districts: [
      { walls: ['wall4', 'wall1', 'wall2', 'wall3'], floor: 'floor', ceil: 'ceil', light: 0xb070ff },       // the rune caverns: violet
      { walls: ['wall2', 'wall2', 'wall4', 'wall1'], floor: 'floor', ceil: 'ceil', light: 0x40e0ff },       // the crystal caves: cyan
      { walls: ['wall3', 'wall3', 'wall1', 'wall4'], floor: 't4-floor', ceil: 'ceil', light: 0xff7030 },    // the lava vents: orange
    ],
    landmarks: ['monolith', 'crystal', 'altar', 'stalagmite'], hang: null },
  { fog: 0x0c0403, base: 0.48, torch: 0xff6020, sign: { bg: '#1a0804', ink: '#ffb060', font: 'bold 60px Georgia, serif', word: 'ONWARD' },
    districts: [{ walls: ['wall4', 'wall2', 'wall1', 'wall3'], floor: 'floor', ceil: 'ceil', light: 0xff6020 }],
    landmarks: ['brazier'], hang: null },
];
const GLOW = { 't3-wall1': 0.5, 't3-wall2': 0.5, 't3-floor': 0.3, 't3-ceil': 0.35, 't4-wall1': 0.45, 't4-wall2': 0.3, 't4-floor': 0.4, 't4-ceil': 0.2 };
// the landmarks' sizes in metres (fitProp sizes by the longest side); chandelier / carcass hang from the ceiling
const LANDMARK_SIZE = { statue: 3.4, well: 2.4, brazier: 1.9, banner: 4.6, ossuary: 2.6, sarcophagus: 2.4, bonepillar: 4.4, chandelier: 3.0, grinder: 3.0, boiler: 3.2, barrels: 2.4, carcass: 2.6, monolith: 5.0, crystal: 3.0, altar: 2.6, stalagmite: 3.6 };
const MODEL_DIR = 'assets/models/';
// THE CLIP DECK (James 2026-09-11, 'get 'em, add 'em, catalog 'em, weave them into every gun response — some random and
// some obvious'): fifteen more Meshy library clips on every creature (tmp/jabberwocky/actions2.json holds the action ids).
//   deaths  dieback (189 Dying Backwards) · gutdeath (188 Fall Dead from Abdominal Injury) · electro (181 Electrocuted Fall) ·
//           shotback (183 Shot and Fall Backward) · shotfront (184 Shot and Fall Forward) · falldown (366 Falling Down) · die (8 Dead)
//   the obvious ones: DEATH_BY_GAG below; every other 'expire' deals one from DEATH_POOL by the goon's seed
//   fall3 (504 Fall 3) — the hole: they fall flailing · falldown — the gas: they keel over
//   runs    run (the rig's own) · run3 (15) · runfast5 (533) · runfast7 (535) · hellorun (110) — each goon runs its own way (seed)
//   runjump (463 Run and Jump) — some goons leap the moment they notice you · backflip (452) — some flip off a dud hit
//   dances  dance (the original) · dance1 (22 Funny Dancing 1) · dance2 (23 Funny Dancing 2) — pacified goons deal one by seed
// THE MOVES (James 2026-09-11, his eighteen names from the library; tmp/jabberwocky/actions3.json): four more deaths for
// everyone — blownback (182 Shot and Blown Back) · slowfall (185 Shot and Slow Fall Backward) · knockdown (187 Knock Down) ·
// strangled (186 Strangled and Fall Forward) — and an attack subset per creature, flavoured by what it holds (ATTACKS):
// every swing deals one at random from the creature's own list, so two of a kind fight differently.
const DECK = ['fall3', 'falldown', 'gutdeath', 'electro', 'shotback', 'shotfront', 'dieback', 'backflip', 'run3', 'runjump', 'runfast5', 'runfast7', 'hellorun', 'dance1', 'dance2'];
const DEATHS4 = ['blownback', 'slowfall', 'knockdown', 'strangled'];
const ATTACKS = {
  lizardman: ['reaping', 'thrust', 'rhslash', 'charged', 'axespin', 'kick'],   // 99 Reaping Swing · 240 Thrust Slash · 219 Right-hand Sword Slash · 242 Charged Slash · 238 Axe Spin Attack · 103 Simple Kick
  brute:     ['judgment', 'charged', 'wcombo2', 'reaping', 'elbow'],           // 102 Sword Judgment (the overhead smash) · 242 · 241 Weapon Combo 2 · 99 · 212 Elbow Strike
  ratling:   ['leftslash', 'thrust', 'flykick', 'kick'],                       // 97 Left Slash · 240 · 94 Flying Fist Kick · 103
  cultist:   ['pcombo1', 'elbow', 'highkick', 'leftslash'],                    // 200 Punch Combo 1 · 212 · 215 High Kick · 97 (a skull in hand)
  stalker:   ['lunge', 'highkick', 'flykick', 'reaping', 'elbow'],             // 208 Lunge Roundhouse Kick · 215 · 94 · 99 (a claw sweep) · 212
};
const DEATH_BY_GAG = { lightning: 'electro', bullet: 'shotback', baseballs: 'shotfront', sand: 'gutdeath', bees: 'falldown', legos: 'falldown', slapfight: 'dieback', curse: 'gutdeath', boomerang: 'shotback', audit: 'falldown', trombone: 'dieback',
  vines: 'strangled', rocket: 'blownback', sneeze: 'blownback', cart: 'knockdown', train: 'knockdown', handbag: 'knockdown', gravel: 'slowfall' };   // the obvious pairings for the four new deaths (2026-09-11)
const DEATH_POOL = ['die', 'dieback', 'gutdeath', 'shotback', 'shotfront', 'falldown', ...DEATHS4];
const RUN_POOL = ['run', 'run', 'run3', 'runfast5', 'runfast7', 'hellorun'];
const DANCE_POOL = ['dance', 'dance1', 'dance2'];
// each creature: the rigged base and the clips we asked Meshy for; yaw = which way the model faces at rest.
// The ghoul is out (James 2026-09-11) — its files stay on disk until ship; the LIZARDMAN (concept take two, tailless, rigged
// first try) took its place in every mix.
const CREATURES = {
  lizardman:  { clips: ['walk', 'run', 'attack', 'die', 'dance', 'hit', ...DECK, ...DEATHS4, ...ATTACKS.lizardman], yaw: 0 },
  brute:      { clips: ['walk', 'run', 'attack', 'die', 'dance', 'hit', ...DECK, ...DEATHS4, ...ATTACKS.brute], yaw: 0 },
  ratling:    { clips: ['walk', 'run', 'attack', 'die', 'dance', 'hit', ...DECK, ...DEATHS4, ...ATTACKS.ratling], yaw: 0 },
  cultist:    { clips: ['walk', 'run', 'attack', 'die', 'dance', 'hit', 'throw', ...DECK, ...DEATHS4, ...ATTACKS.cultist], yaw: 0 },
  stalker:    { clips: ['walk', 'run', 'attack', 'die', 'dance', 'hit', ...DECK, ...DEATHS4, ...ATTACKS.stalker], yaw: 0 },
  // the Jabberwock would not take a rig (Meshy's pose estimation wants a humanoid), so he is a posed
  // statue that moves procedurally: hovers, leans in to fire, rears back when hit
  jabberwock: { clips: [], yaw: 0, unscaled: true, procedural: true },
};
const GIBS = ['intestines', 'arm', 'leg', 'skull', 'ribs',
  'heart', 'liver', 'kidney', 'lungs', 'stomach', 'brain', 'halfbrain', 'eyeball', 'spine', 'jaw', 'hand', 'foot'];   // 2026-09-10 James: the gore drawer, twelve more (Meshy, 180 cr)
// the menu by kind — a lab note like "more giblets" or "increase the gore" picks a nice selection from here (gorePick)
const GORE = {
  organs: ['heart', 'liver', 'kidney', 'lungs', 'stomach', 'intestines'],
  brains: ['brain', 'halfbrain', 'eyeball'],
  bones: ['skull', 'ribs', 'spine', 'jaw'],
  limbs: ['arm', 'leg', 'hand', 'foot'],
};
// n pieces spread across the kinds, no kind twice running — the 'nice selection'
function gorePick(n) { const kinds = Object.keys(GORE), out = []; for (let i = 0; i < n; i++) { const k = GORE[kinds[(i + Math.floor(Math.random() * kinds.length)) % kinds.length]]; out.push(k[Math.floor(Math.random() * k.length)]); } return out; }
// PROPS: real objects instead of billboard stickers. size = metres on the long side; motion = how it moves in
// flight; stays = it rests where it lands and stands in for the floor decal. Files: assets/models/props/<name>.glb
// (Meshy, 2026-09-06); prim = built from primitives at load, no file needed.
const PROPS = {
  anvil:     { size: 2.7,  motion: 'tumble', stays: true, solid: 0x17171b },   // 2026-09-10 James: three times larger (five was too much), black iron — solid: the texture (with its glowing white rectangle) is dropped for one flat colour; blood and guts when it lands on them
  piano:     { size: 4.4,  motion: 'tumble', stays: true, dark: 0.35, pieces: ['piano-body', 'piano-legs-front', 'piano-legs-back', 'piano-lid'] },   // 2026-09-10 James: twice the original, black, piano-crash.mp3 on the landing; THE CRASH — two legs break, it tips on a diagonal, the lid flies off (pieces from split_piano.py)
  train:     { size: 6.0,  motion: 'drive',  stays: false, yaw: Math.PI / 2 },   // 2026-09-10 James: twice the size, driving away from the gun (the model lies along -X; the flying props face +Z in three.js terms)
  bus:       { size: 3.2,  motion: 'drive',  stays: false, yaw: Math.PI / 2 },
  cow:       { size: 2.9,  motion: 'side', stays: true },
  brick:     { size: 0.22, motion: 'tumble', stays: false },   // 2026-09-11 James: the legos — one Meshy brick, recoloured per piece by brickRain; never a shot   // 2026-09-11 James: flies out already on its side and lands on its side on the monster; the leg kick is retired (legs: true brings it back)   // 2026-09-11 James: 60% bigger; lands on its feet, kicks its legs, flops on its side (legs split off in split_legs.py as LegA-D, hip pivots)
  bees:      { size: 0.55, motion: 'swarm', stays: false, count: 11 },   // 2026-09-11 James: a Meshy hornet (props/bees.glb) — a swarm of eleven, each on its own orbit, replaces the bee stickers
  vending:   { size: 1.7,  motion: 'tumble', stays: true },
  sink:      { size: 1.2,  motion: 'tumble', stays: true },
  sneaker:   { size: 2.16, motion: 'tumble', stays: true },   // 2026-09-11 James: 20% larger
  chainsaw:  { size: 0.9,  motion: 'spin',   stays: true },
  rocket:    { size: 1.1,  motion: 'fly',    stays: false, prim: 'rocket' },   // 2026-09-08 James: the Meshy one stood nose-up like a kids'-book rocket; now a Quake rocket that flies nose-first with fire out the back
  cart:      { size: 1.1,  motion: 'drive',  stays: true, yaw: Math.PI / 4 },   // the model sits at 45° in its file (2026-09-10)
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
  knife:     { size: 2.0, motion: 'endover', stays: false },
  piranha:   { size: 0.5, motion: 'swim',   stays: false },
  rock:      { size: 0.11, motion: 'tumble', stays: false, variants: 6, dark: 0.5 },   // 2026-09-10 James round two: half the size, darker, half again as many
  purse:     { size: 2.2, motion: 'swing',  stays: false, arm: 'fist', armSize: 3.0, armYaw: 0, purseYaw: 0 },   // the arm is the Meshy fist (with its forearm stump): Meshy's text-to-3D made a whole old lady twice when asked for a severed arm (30 cr, benched in tmp/jabberwocky/models/)   // 2026-09-10 James: a real 3-D purse on a strap swung by an old lady's arm from the right of the gun, overly large
  fist:      { size: 3.2, motion: 'punch',   stays: false },   // James 2026-09-08: a Meshy fist, stupid big, knuckles first, lunges and comes back   // 2026-09-08 James, three notes: a Meshy knife (the code-built one read as a cigarette), twice the size, four of them, spinning fast; primProp 'knife' stands by if the file is missing
  // 2026-09-11 THE STRUCTURE: the bad guys' weapons (armGoon puts one in the right hand, dropWeapon lets it fall at the death)
  sword:     { size: 1.25, motion: 'tumble', stays: false, variants: 2 },
  axe:       { size: 1.35, motion: 'tumble', stays: false, variants: 2 },
  hammer:    { size: 1.5,  motion: 'tumble', stays: false, variants: 2 },
  shiv:      { size: 0.55, motion: 'tumble', stays: false },
  // the armor pickups: Meshy sent a whole suit for the breastplate — it stands where it lies as THE SUIT; the helm turns
  plate:     { size: 1.75, motion: 'rest',   stays: false },
  helm:      { size: 0.5,  motion: 'rest',   stays: false },
};
const BOOM_GAGS = new Set(['rocket', 'wrongway', 'meteor', 'piledriver']);   // the only splashes that are explosions
const SPLASH_COLOR = { pie: 0x6a3aa0, jello: 0x2f8a1e, gravy: 0x6b3a1a, lava: 0xff6a20, chowder: 0xf0e0c0, burrito: 0xd0a060, legos: 0xe03030, lovepotion: 0xff6ab0, monkeypaw: 0x3a2a2a, catbag: 0x8a7a6a, jack: 0xffd23a, porcupine: 0x8a6a4a, cow: 0xf0f0f0, yak: 0x6a4a2a, frogs: 0x3a9a2a, tent: 0xc8202a, sneaker: 0xf0f0f0, anvil: 0x505058, piano: 0x202020, vending: 0xd02020, sink: 0xf0f0f0 };
const SMOTHER_COLOR = { jello: 0x2f8a1e, gravy: 0x6b3a1a, frogs: 0x3a9a2a, tent: 0xc8202a, glue: 0xf0eee6, yak: 0x6b4a2a };

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.autoClear = false;
  const look = { fov: 76, fog: 70, guide: 1, res: 1, bob: 0, spriteScale: 1, decalScale: 1, brightness: 1, shake: 0.25, torchLight: 1, vmX: 0.26, vmY: -0.30, vmZ: -0.78, vmScale: 1 };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(look.fov, 1, 0.05, 220);
  const vmScene = new THREE.Scene();
  const vmCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();
  const base = new URL('./', import.meta.url).href;

  // ---- assets -------------------------------------------------------------------------------------
  const textures = {};
  const models = { creatures: {}, gibs: [], gibByName: {}, props: {}, pieces: {}, landmarks: {}, rifle: null, gauntlets: null };
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
    for (const name of Object.keys(LANDMARK_SIZE)) jobs.push(new Promise((resolve) => loader.load(base + MODEL_DIR + 'landmarks/' + name + '.glb', (g) => { prepModel(g.scene); litProp(g.scene); models.landmarks[name] = fitProp(g.scene, LANDMARK_SIZE[name]); resolve(); }, undefined, () => resolve())));   // a missing landmark is not a failure: a plinth stands in
    for (const name of Object.keys(PROPS)) {
      const def = PROPS[name];
      if (def.prim) { models.props[name] = primProp(name, def); continue; }
      if (def.pieces) for (const pc of def.pieces) jobs.push(new Promise((resolve) => loader.load(base + MODEL_DIR + 'props/' + pc + '.glb', (g) => { prepModel(g.scene); litProp(g.scene); if (def.dark) g.scene.traverse((o) => { if (o.isMesh && o.material && o.material.color) { o.material.color.multiplyScalar(def.dark); if (o.material.emissive) o.material.emissive.multiplyScalar(def.dark); } }); const grp = new THREE.Group(); g.scene.scale.setScalar(def.size); grp.add(g.scene); (models.pieces[name] = models.pieces[name] || {})[pc.slice(name.length + 1)] = grp; resolve(); }, undefined, () => resolve())));
      if (def.variants) { for (let i = 1; i <= def.variants; i++) jobs.push(new Promise((resolve) => loader.load(base + MODEL_DIR + 'props/' + name + '-' + i + '.glb', (g) => { prepModel(g.scene); litProp(g.scene); if (def.dark) g.scene.traverse((o) => { if (o.isMesh && o.material && o.material.color) o.material.color.multiplyScalar(def.dark); }); (models.props[name] = models.props[name] || []).push(fitProp(g.scene, def.size)); resolve(); }, undefined, () => resolve()))); continue; }
      jobs.push(new Promise((resolve) => loader.load(base + MODEL_DIR + 'props/' + name + '.glb', (g) => { prepModel(g.scene); litProp(g.scene); if (def.solid) g.scene.traverse((o) => { if (o.isMesh && o.material) { o.material.map = null; o.material.emissiveMap = null; if (o.material.emissive) o.material.emissive.setHex(0); o.material.color.setHex(def.solid); if ('roughness' in o.material) { o.material.roughness = 0.75; o.material.metalness = 0.35; } o.material.needsUpdate = true; } }); if (def.dark) g.scene.traverse((o) => { if (o.isMesh && o.material && o.material.color) { o.material.color.multiplyScalar(def.dark); if (o.material.emissive) o.material.emissive.multiplyScalar(def.dark); } }); models.props[name] = fitProp(g.scene, def.size); resolve(); }, undefined, () => resolve())));   // a missing prop is not a failure: the sprite stands in
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
      // a mirror-metal blade (metalness 0.9) has nothing to reflect down here and paints near black: keep it pale, part-lit
      const blade = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.62, 0.09, 0.028), new THREE.MeshStandardMaterial({ color: 0xf0f4fa, metalness: 0.2, roughness: 0.3, emissive: 0xdfe6f0, emissiveIntensity: 0.9 }));   // self-lit: reads as steel in torchlight
      blade.position.x = def.size * 0.19; g.add(blade);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.38, 0.11, 0.05), new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.8, emissive: 0x6a4020, emissiveIntensity: 0.6 }));
      handle.position.x = -def.size * 0.31; g.add(handle);
      g.userData.halfH = 0.06; g.userData.halfW = def.size / 2;
    } else if (def.prim === 'rocket') {
      // nose along +Z (the flight axis syncPropShot turns props to), exhaust at -Z
      const L = def.size, r = L * 0.085;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L * 0.62, 14), new THREE.MeshStandardMaterial({ color: 0x5a5e52, metalness: 0.3, roughness: 0.55, emissive: 0x2a2c26, emissiveIntensity: 0.6 }));
      body.rotation.x = Math.PI / 2; body.position.z = L * 0.03; g.add(body);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(r, L * 0.24, 14), new THREE.MeshStandardMaterial({ color: 0xc02020, metalness: 0.2, roughness: 0.5, emissive: 0x501010, emissiveIntensity: 0.7 }));
      nose.rotation.x = Math.PI / 2; nose.position.z = L * 0.03 + L * 0.31 + L * 0.12; g.add(nose);
      const finMat = new THREE.MeshStandardMaterial({ color: 0x3a3e36, roughness: 0.7, emissive: 0x1a1c18, emissiveIntensity: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(r * 2.4, 0.012, L * 0.2), finMat); fin.rotation.z = i * Math.PI / 2; fin.position.set(Math.cos(i * Math.PI / 2) * r * 1.1, Math.sin(i * Math.PI / 2) * r * 1.1, -L * 0.2); g.add(fin); }
      const flame = new THREE.Mesh(new THREE.ConeGeometry(r * 1.1, L * 0.55, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); flame.name = 'flame';
      flame.rotation.x = -Math.PI / 2; flame.position.z = -L * 0.28 - L * 0.27; g.add(flame);
      const core = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, L * 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); core.name = 'flamecore';
      core.rotation.x = -Math.PI / 2; core.position.z = -L * 0.28 - L * 0.15; g.add(core);
      g.userData.halfH = r * 1.4; g.userData.halfW = L / 2;
    }
    return g;
  }
  function propFor(sprite) { const m = PROPS[sprite] && models.props[sprite]; if (!m) return null; return Array.isArray(m) ? (m.length ? m[Math.floor(Math.random() * m.length)] : null) : m; }   // variants: a random one each time
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
  const BLOODS = ['blood', 'blood', 'bloodspray', 'blooddrips', 'bloodsmear', 'bloodchunks'];   // 2026-09-10 James: different kinds of splatter, in rotation
  const bloodTex = () => scarTex(BLOODS[Math.floor(Math.random() * BLOODS.length)], Math.random());
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
  let levelGroup = null, levelRef = null, torches = [], doorMesh = null, doorOpenAnim = 0, driftMeshes = [], doorSign = null;
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
    const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    const isOpen = (x, y) => inside(x, y) && map[at(x, y)] === C.OPEN;
    const isProp = (x, y) => inside(x, y) && map[at(x, y)] === C.PROP;   // a landmark's cell: floor and ceiling, no walls, the piece stands on it
    const hgt = (x, y) => HEIGHTS[Math.min(HEIGHTS.length - 1, tall ? tall[at(x, y)] : 0)];
    // the district a cell belongs to (a landmark cell borrows its room's); tileOf turns a slot name into a texture name
    const distOf = (x, y) => {
      let d = level.district && inside(x, y) ? level.district[at(x, y)] : 0;
      if (d < 0) { const lm = (level.landmarks || []).find((l) => l.x === x && l.y === y); d = lm && lm.room >= 0 ? lm.room : 0; }
      return th.districts[((d % th.districts.length) + th.districts.length) % th.districts.length];
    };
    const tileOf = (name) => name.includes('-') ? name : 't' + level.theme + '-' + name;
    // torches: rooms get one per wall, corridors every so often; baked into vertex light, in the district's colour
    torches = placeTorches(level, isOpen);
    for (const t of torches) t.color = new THREE.Color(distOf(Math.floor(t.x / S), Math.floor(t.z / S)).light);
    // the guide's lamps bake a little light along the route too (the right way is a little brighter)
    const lamps = (level.markers || []).filter((m) => m.kind === 'lamp').map((m) => ({ x: m.x * S, z: m.y * S, color: new THREE.Color(distOf(Math.floor(m.x), Math.floor(m.y)).light) }));
    const lightAt = (x, z) => {
      let r = th.base, g = th.base, b = th.base * 1.15;
      for (const t of torches) {
        const d2 = (t.x - x) * (t.x - x) + (t.z - z) * (t.z - z);
        const k = 1.5 * look.torchLight / (1 + d2 / 9);
        r += t.color.r * k; g += t.color.g * k; b += t.color.b * k;
      }
      for (const l of lamps) {
        const d2 = (l.x - x) * (l.x - x) + (l.z - z) * (l.z - z);
        const k = 0.45 * look.torchLight / (1 + d2 / 3);
        r += l.color.r * k; g += l.color.g * k; b += l.color.b * k;
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
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!isOpen(x, y) && !isProp(x, y)) continue;
      const D = distOf(x, y);
      const hc = isProp(x, y) ? Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => isOpen(x + dx, y + dy) ? hgt(x + dx, y + dy) : 0), HEIGHTS[0]) : hgt(x, y);
      const X0 = x * S, X1 = (x + 1) * S, Z0 = y * S, Z1 = (y + 1) * S;
      // floor (normal up) and ceiling (normal down)
      quad(tileOf(D.floor), [X0, 0, Z1], [X1, 0, Z1], [X1, 0, Z0], [X0, 0, Z0], [0, 1, 0], [[x, y + 1], [x + 1, y + 1], [x + 1, y], [x, y]]);
      quad(tileOf(D.ceil), [X0, hc, Z0], [X1, hc, Z0], [X1, hc, Z1], [X0, hc, Z1], [0, -1, 0], [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]);
      if (isProp(x, y)) continue;
      // the four edges
      const edges = [
        { nx: x, ny: y - 1, a: [X1, Z0], b: [X0, Z0], n: [0, 0, 1] },    // north edge, faces south into the cell
        { nx: x, ny: y + 1, a: [X0, Z1], b: [X1, Z1], n: [0, 0, -1] },
        { nx: x - 1, ny: y, a: [X0, Z0], b: [X0, Z1], n: [1, 0, 0] },
        { nx: x + 1, ny: y, a: [X1, Z1], b: [X1, Z0], n: [-1, 0, 0] },
      ];
      for (const e of edges) {
        const v = inside(e.nx, e.ny) ? map[at(e.nx, e.ny)] : C.WALL_A;
        let y0 = 0, y1 = hc, key = null;
        if (v === C.OPEN) {
          const hn = hgt(e.nx, e.ny);
          if (hn >= hc) continue;
          y0 = hn; key = tileOf(D.walls[0]);                                // the step where a tall room meets a corridor
        } else if (v === C.PROP) {
          continue;                                                         // a landmark's cell is open air
        } else if (v === C.DOOR || v === C.DRIFT) {
          if (hc <= H_LOW + 0.01) continue;                                 // doors are their own meshes …
          y0 = H_LOW; key = tileOf(D.walls[0]);                             // … with wall above them in a tall room
        } else key = tileOf(D.walls[Math.max(0, Math.min(3, v - 1))] || D.walls[0]);
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
      const m = new THREE.MeshLambertMaterial({ map: tex(key), vertexColors: true, side: THREE.DoubleSide });
      if (GLOW[key]) { m.emissiveMap = tex(key); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = GLOW[key]; }
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
    doorSign = null;
    if (level.door) {
      level.door.cx = level.door.cx != null ? level.door.cx : level.door.x; doorMesh = doorPlane(level.door, 'door', false); doorMesh.userData.baseY = H_LOW / 2; doorOpenAnim = state.doorOpen ? 1 : 0;
      // THE EXIT SIGN over the real door (James 2026-09-12): a lit box on the wall above the frame, red LOCKED until the key
      // (or the boss) opens it, then green EXIT; in a low corridor it sits on the top of the frame
      const d = level.door, dx = d.cx - d.x, dy = d.cy - d.y;
      const hc = hgt(d.cx, d.cy);
      const y = Math.min(hc - 0.4, H_LOW + 0.45);
      const sx = (d.x + 0.5) * S + dx * (S * 0.5 + 0.05), sz = (d.y + 0.5) * S + dy * (S * 0.5 + 0.05);
      doorSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), new THREE.MeshBasicMaterial({ map: exitSignTex(!!state.doorOpen), transparent: true, depthWrite: false }));
      doorSign.position.set(sx, y, sz); doorSign.lookAt(sx + dx, y, sz + dy); doorSign.userData.open = !!state.doorOpen;
      levelGroup.add(doorSign);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: guideTex(level.theme, 'lamp', 'door', false, state.doorOpen ? 0x58ff7a : 0xff3050), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
      glow.scale.set(2.6, 1.6, 1); glow.position.set(0, 0, 0.05); doorSign.add(glow); doorSign.userData.glow = glow;
    }
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
    // THE GUIDE (James 2026-09-11): the core's markers along the route — floor deltas, hanging signs, lamps — drawn per theme.
    // The key leg burns first; when the key is picked up the door leg wakes and the key leg fades (syncGuide). look.guide
    // is the loudness dial (0 hides them); a subtle marker sits at 45% of a loud one.
    guideViews = [];
    for (const m of level.markers || []) {
      const D = distOf(Math.floor(m.x), Math.floor(m.y));
      let obj = null;
      if (m.kind === 'delta') {
        obj = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.82, S * 0.44), new THREE.MeshBasicMaterial({ map: guideTex(level.theme, 'delta', m.leg, m.loud), transparent: true, depthWrite: false, opacity: 0 }));
        obj.rotation.set(-Math.PI / 2, 0, -m.a); obj.position.set(m.x * S, 0.035, m.y * S);
      } else if (m.kind === 'sign') {
        obj = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.62), new THREE.MeshBasicMaterial({ map: guideTex(level.theme, 'sign', m.leg, true), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 }));
        obj.position.set(m.x * S, 2.45, m.y * S);
        obj.lookAt(m.x * S - Math.cos(m.a), 2.45, m.y * S - Math.sin(m.a));   // faces whoever walks the route toward it
        // a chain to hang it from
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), new THREE.MeshLambertMaterial({ color: 0x2a2620 }));
        chain.position.set(0, 0.8, 0); obj.add(chain);
      } else if (m.kind === 'lamp') {
        // on the wall side of the route if there is one
        const side = [m.a + Math.PI / 2, m.a - Math.PI / 2].find((sa) => !isOpen(Math.floor(m.x + Math.cos(sa)), Math.floor(m.y + Math.sin(sa))));
        const ox = side != null ? Math.cos(side) * (S / 2 - 0.22) : 0, oz = side != null ? Math.sin(side) * (S / 2 - 0.22) : 0;
        obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: guideTex(level.theme, 'lamp', m.leg, false, D.light), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
        obj.scale.set(0.55, 0.8, 1); obj.position.set(m.x * S + ox, 1.05, m.y * S + oz);
      }
      if (!obj) continue;
      levelGroup.add(obj);
      guideViews.push({ obj, m, k: 0 });
    }
    // LANDMARKS: a Meshy piece on every room's slot (the theme's hero in the hall's middle), a hung piece over each room too
    for (const lm of level.landmarks || []) {
      const names = th.landmarks || [];
      if (!names.length) continue;
      const name = (lm.hall && lm.slot === 0) || names.length === 1 ? names[0] : names[1 + (((lm.room * 3 + lm.slot) % (names.length - 1)) + (names.length - 1)) % (names.length - 1)];
      const cx = (lm.x + 0.5) * S, cz = (lm.y + 0.5) * S;
      const hc = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => isOpen(lm.x + dx, lm.y + dy) ? hgt(lm.x + dx, lm.y + dy) : 0), HEIGHTS[0]);
      const stand = (nm, y, yaw) => {
        const src = models.landmarks[nm];
        let obj;
        if (src) { obj = src.clone(); obj.position.set(cx, y != null ? y : src.userData.halfH, cz); }
        else {   // no model (file:// or a failed load): a lit plinth, never nothing
          obj = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), new THREE.MeshLambertMaterial({ map: tex(tileOf(distOf(lm.x, lm.y).walls[0])) }));
          obj.position.set(cx, 0.8, cz);
        }
        obj.rotation.y = yaw;
        const l = lightAt(cx, cz); obj.traverse((o) => { if (o.isMesh && o.material && o.material.color && !o.userData.lit) { o.userData.lit = true; o.material = o.material.clone(); o.material.color.multiplyScalar(Math.min(1.3, 0.55 + (l[0] + l[1] + l[2]) / 3)); } });
        levelGroup.add(obj);
        return obj;
      };
      if (name !== th.hang) stand(name, null, ((lm.x * 7 + lm.y * 13) % 4) * Math.PI / 2 + (lm.hall ? 0 : 0.3));
      if (th.hang && models.landmarks[th.hang]) { const src = models.landmarks[th.hang]; stand(th.hang, hc - src.userData.halfH - 0.25, (lm.x * 5 + lm.y * 3) % 6 * 0.9); }
      else if (name === th.hang) stand(names[0], null, 0);
    }
    // ARMOR (2026-09-11): the suit and the helms, real props where they lie (a helm turns slowly, the suit stands)
    armorViews = [];
    for (const a of state.armors || []) {
      const src = propFor(a.kind);
      let obj;
      if (src) { obj = src.clone(); obj.position.set(a.x * S, a.kind === 'plate' ? src.userData.halfH : 0.75, a.y * S); }
      else { obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex('armor|' + a.kind, D().armorSprite ? D().armorSprite(a.kind) : D().healSprite(0)), transparent: true, depthWrite: false })); obj.scale.set(a.kind === 'plate' ? 1.3 : 0.7, a.kind === 'plate' ? 1.3 : 0.7, 1); obj.position.set(a.x * S, a.kind === 'plate' ? 0.9 : 0.6, a.y * S); }
      levelGroup.add(obj);
      armorViews.push({ obj, a });
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
      if (out.length > 140) return out;
    }
    return out;
  }
  function disposeGroup(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.map) o.material.dispose(); }); }

  // ---- entities -----------------------------------------------------------------------------------
  const goonViews = new Map(), shotViews = new Map(), zoneViews = new Map(), scarViews = new Map(), beamViews = new Map();
  let keyView = null;
  let healViews = [];
  const gibs = [], shards = [], extras = [], bricks = [];
  const entGroup = new THREE.Group(); scene.add(entGroup);
  function clearEntities() {
    for (const v of goonViews.values()) { entGroup.remove(v.root); if (v.blob) entGroup.remove(v.blob); if (v.block) entGroup.remove(v.block); }
    for (const v of shotViews.values()) entGroup.remove(v);
    for (const v of zoneViews.values()) { entGroup.remove(v.obj); if (v.shadow) entGroup.remove(v.shadow); if (v.cone) entGroup.remove(v.cone); if (v.cloud) entGroup.remove(v.cloud); }
    for (const v of scarViews.values()) entGroup.remove(v);
    for (const v of beamViews.values()) entGroup.remove(v);
    for (const g of gibs) entGroup.remove(g.mesh);
    for (const s of shards) entGroup.remove(s.mesh);
    for (const b of bricks) entGroup.remove(b.mesh);
    for (const e of extras) entGroup.remove(e.obj);
    goonViews.clear(); shotViews.clear(); zoneViews.clear(); scarViews.clear(); beamViews.clear();
    gibs.length = 0; shards.length = 0; extras.length = 0; bricks.length = 0;
    blood.reset(); embers.reset();
  }

  // ---- the guide's drawings (2026-09-11) ------------------------------------------------------------------
  // delta: a row of three chevrons pointing along +X (the plane is turned to the route); sign: the destination word with
  // an up-arrow (straight on), in the theme's hand; lamp: a soft flame in the district's colour. Cached by key.
  const guideCache = {};
  function guideTex(theme, kind, leg, loud, color) {
    const key = [theme, kind, leg, loud ? 1 : 0, color || 0].join('|');
    if (guideCache[key]) return guideCache[key];
    const th = THEMES[theme] || THEMES[0], sg = th.sign || THEMES[0].sign;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (kind === 'delta') {
      c.width = 256; c.height = 128;
      const ink = leg === 'key' ? '#ffd23a' : (sg.box ? '#7cff9a' : sg.ink);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 3; i++) {
        const x = 52 + i * 66, wob = theme === 1 ? 3 : 0;
        ctx.beginPath(); ctx.moveTo(x - 26, 22 + wob); ctx.lineTo(x + 18, 64); ctx.lineTo(x - 26, 106 - wob);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = loud ? 26 : 20; ctx.stroke();
        ctx.strokeStyle = ink; ctx.lineWidth = loud ? 15 : 10; ctx.globalAlpha = theme === 1 ? 0.85 : 1; ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (theme === 2) { ctx.fillStyle = ink; ctx.fillRect(0, 118, 256, 6); ctx.fillRect(0, 4, 256, 6); }   // painted lane lines
    } else if (kind === 'sign') {
      c.width = 384; c.height = 208;
      const word = leg === 'key' ? 'KEY' : sg.word;
      ctx.fillStyle = sg.bg; ctx.fillRect(0, 0, 384, 208);
      ctx.strokeStyle = sg.ink; ctx.lineWidth = sg.box ? 10 : 5; ctx.strokeRect(8, 8, 368, 192);
      if (sg.glow) { ctx.shadowColor = sg.ink; ctx.shadowBlur = 24; }
      ctx.fillStyle = sg.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = sg.font;
      let size = 60; while (ctx.measureText(word).width > 250 && size > 30) { size -= 4; ctx.font = sg.font.replace(/\d+px/, size + 'px'); }
      ctx.fillText(word, 150, 108);
      // the arrow: straight on
      ctx.beginPath(); ctx.moveTo(318, 44); ctx.lineTo(358, 96); ctx.lineTo(334, 96); ctx.lineTo(334, 166); ctx.lineTo(302, 166); ctx.lineTo(302, 96); ctx.lineTo(278, 96); ctx.closePath(); ctx.fill();
      if (sg.chalk) { ctx.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { ctx.fillStyle = '#000'; ctx.fillRect(Math.random() * 384, Math.random() * 208, 6, 2); } ctx.globalAlpha = 1; }
    } else {
      c.width = 64; c.height = 96;
      const col = new THREE.Color(color || 0xffc060);
      const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
      const rg = ctx.createRadialGradient(32, 52, 0, 32, 52, 30);
      rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(0.25, `rgba(${rgb},0.85)`); rg.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(32, 52, 30, 44, 0, 0, TAU); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    guideCache[key] = t;
    return t;
  }
  // the sign over the real exit door: a lit box, EXIT in green when the door is open, LOCKED in red while it is shut
  const exitCache = {};
  function exitSignTex(open) {
    const key = open ? 'open' : 'shut';
    if (exitCache[key]) return exitCache[key];
    const c = document.createElement('canvas'); c.width = 480; c.height = 200;
    const ctx = c.getContext('2d');
    const ink = open ? '#7cff9a' : '#ff4a5a';
    ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, 480, 200);
    ctx.strokeStyle = '#3a3f44'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 470, 190);
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.globalAlpha = 0.7; ctx.strokeRect(18, 18, 444, 164); ctx.globalAlpha = 1;
    ctx.shadowColor = ink; ctx.shadowBlur = 28;
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (open) { ctx.font = 'bold 118px Arial Black, Arial, sans-serif'; ctx.fillText('EXIT', 240, 104); }
    else { ctx.font = 'bold 92px Arial Black, Arial, sans-serif'; ctx.fillText('EXIT', 240, 78); ctx.font = 'bold 40px Arial, sans-serif'; ctx.fillText('LOCKED · FIND THE KEY', 240, 156); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    exitCache[key] = t;
    return t;
  }
  let guideViews = [], armorViews = [];
  function syncGuide(state, dt) {
    const held = !!(state.key && state.key.held);
    for (const gv of guideViews) {
      const base = gv.m.loud ? 1 : 0.45;
      const legK = gv.m.leg === 'key' ? (held ? 0.18 : 1) : (held ? 1 : 0.26);
      const want = Math.min(1, base * legK * (look.guide == null ? 1 : look.guide));
      gv.k += (want - gv.k) * Math.min(1, dt * 3);
      gv.obj.material.opacity = gv.k;
      gv.obj.visible = gv.k > 0.01;
    }
  }
  function syncArmor(state, t) {
    for (const v of armorViews) {
      v.obj.visible = !v.a.taken;
      if (v.a.kind === 'helm') { v.obj.rotation.y = t * 1.3; v.obj.position.y = 0.75 + Math.sin(t * 2.2 + v.a.x) * 0.08; }
    }
  }
  // ---- the bad guys' weapons (2026-09-11) ------------------------------------------------------------------
  // a Meshy prop in the RightHand bone: the prop's long axis runs up the hand's Y (along the fingers); swords and shivs
  // are held at their fat end (the guard), hammers and axes at their thin end (the haft). The rig lives in centimetres,
  // so the holder undoes the bone's world scale. Dropped at the death as a body that falls and settles (dropWeapon).
  const GRIP_AT_FAT = { sword: true, shiv: true, axe: false, hammer: false };
  function armGoon(view, g) {
    if (!g.weapon || !view.model) return;
    const hand = view.model.getObjectByName('RightHand');
    const src = propFor(g.weapon);
    if (!hand || !src) return;
    const w = src.clone();
    // the long axis by the vertices (a Meshy sword can lie on a diagonal), then which end is fat
    const pts = []; const tmp = new THREE.Vector3();
    w.updateMatrixWorld(true);
    w.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { const p = o.geometry.attributes.position; const step = Math.max(1, Math.floor(p.count / 400)); for (let i = 0; i < p.count; i += step) pts.push(tmp.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone()); } });
    const axis = new THREE.Vector3(0, 1, 0);
    if (pts.length > 8) {
      const mean = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
      let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
      for (const p of pts) { const dx = p.x - mean.x, dy = p.y - mean.y, dz = p.z - mean.z; xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz; }
      axis.set(1, 0.7, 0.3);
      for (let i = 0; i < 24; i++) { axis.set(xx * axis.x + xy * axis.y + xz * axis.z, xy * axis.x + yy * axis.y + yz * axis.z, xz * axis.x + yz * axis.y + zz * axis.z).normalize(); }
      // the fat end: the mean distance from the axis over the top quarter against the bottom quarter
      const ts = pts.map((p) => p.clone().sub(mean).dot(axis)); const lo = Math.min(...ts), hi = Math.max(...ts);
      let fatTop = 0, nTop = 0, fatBot = 0, nBot = 0;
      pts.forEach((p, i) => { const d = p.clone().sub(mean); const r = d.sub(axis.clone().multiplyScalar(ts[i])).length(); if (ts[i] > lo + (hi - lo) * 0.7) { fatTop += r; nTop++; } else if (ts[i] < lo + (hi - lo) * 0.3) { fatBot += r; nBot++; } });
      const topIsFat = (fatTop / Math.max(1, nTop)) > (fatBot / Math.max(1, nBot));
      const gripTop = GRIP_AT_FAT[g.weapon] ? topIsFat : !topIsFat;
      if (gripTop) axis.negate();   // the grip end goes to -Y (into the hand)
      const q = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0));
      w.quaternion.premultiply(q);
      w.position.y = (hi - lo) * 0.28;   // the hand a third of the way up from the grip end
    }
    const holder = new THREE.Group();
    holder.add(w);
    hand.updateWorldMatrix(true, false);
    const ws = new THREE.Vector3(); hand.getWorldScale(ws);
    holder.scale.setScalar(1 / (ws.x || 1));
    hand.add(holder);
    view.weapon = holder; view.weaponSrc = w;
  }
  function dropWeapon(view, g) {
    const holder = view.weapon; if (!holder) return;
    view.weapon = null;
    holder.updateWorldMatrix(true, true);
    const w = view.weaponSrc;
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    w.matrixWorld.decompose(pos, quat, scl);
    if (holder.parent) holder.parent.remove(holder);
    holder.remove(w);
    w.position.copy(pos); w.quaternion.copy(quat); w.scale.copy(scl);
    entGroup.add(w);
    const a = Math.random() * TAU;
    gibs.push({ mesh: w, v: new THREE.Vector3(Math.cos(a) * 1.5, 2.5, Math.sin(a) * 1.5), av: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8), settled: false, bounces: 0 });
  }
  function attackClip(view, g) { const pool = ['attack', ...(ATTACKS[g.type] || [])].filter((n) => view.actions[n]); return pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'attack'; }   // every swing deals a move (2026-09-11)

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
      armGoon(view, g);
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
  // deal a clip from a pool by the goon's seed (the same goon always gets the same one; a missing clip falls through to the next)
  function dealClip(view, g, pool, salt) { const have = pool.filter((n) => view.actions[n]); if (!have.length) return null; const r = Math.abs(Math.sin((g.seed || 0) * 977.7 + salt * 131.3) * 43758.5453) % 1; return have[Math.floor(r * have.length) % have.length]; }
  const chance = (g, salt, p) => (Math.abs(Math.sin((g.seed || 0) * 977.7 + salt * 131.3) * 43758.5453) % 1) < p;   // a per-goon coin, fixed for its life
  function deathClip(view, g) { const o = DEATH_BY_GAG[g.gagId]; return (o && view.actions[o]) ? o : dealClip(view, g, DEATH_POOL, 1) || 'die'; }
  const busyOnce = (view, name) => view.current && view.current === view.actions[name] && !view.current.paused;   // a one-shot still playing
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
      if (g.dropped > 0) {   // dropped alive by a tornado that ran out: fall from the top of the funnel, tumbling, and land (James 2026-09-11)
        if (!view.dropping) { view.dropping = true; view.burst = false; view.started = null; view.flingTo = null; play(view, 'hit', { once: true, restart: true }); }
        const k = g.dropped / 0.6; root.position.y = 3.4 * k * k; root.rotation.z = k * 4; root.rotation.x = Math.sin(k * 9) * 0.6;
      } else { if (view.dropping) { view.dropping = false; puff(g.x * S, 0.2, g.y * S, 0x8a7a6a, 1.0); } root.rotation.x = 0; root.rotation.z = 0; }
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
    if (g.state === 'pacified') { if (!play(view, dealClip(view, g, DANCE_POOL, 2) || 'dance')) play(view, 'walk', { speed: 0.4 }); heartsFor(view, g, dt); return; }
    if (g.state === 'idle' || g.state === 'chase') {
      if (g.blink > 0 && !view.flipT && view.actions.backflip && chance(g, 3, 0.34)) { view.flipT = g.t; play(view, 'backflip', { once: true, restart: true }); }   // a third of them flip off a dud hit (2026-09-11)
      if (g.blink <= 0 && view.flipT && g.t - view.flipT > 3) view.flipT = 0;
      if (busyOnce(view, 'backflip') || busyOnce(view, 'runjump')) { view.attacking = false; return; }   // let the stunt finish
      if (g.state === 'chase' && !view.leapt) { view.leapt = true; if (view.actions.runjump && chance(g, 4, 0.4)) { play(view, 'runjump', { once: true, restart: true }); return; } }   // some leap the moment they notice you
      if (g.state !== 'chase') view.leapt = false;
      const runClip = g.state === 'chase' ? (view.runClip || (view.runClip = dealClip(view, g, RUN_POOL, 5) || 'walk')) : 'walk';   // each goon runs its own way
      const runSpeed = g.state === 'chase' ? (runClip === 'walk' ? 1 : 0.85) * (g.def.speed / 1.5) : 0.45 * (g.def.speed / 1.5);
      if (g.windup > 0 || g.atkT > g.def.atk - 0.35) { if (!view.attacking) { view.attacking = true; play(view, g.def.ranged && g.state === 'chase' && Math.hypot(state.player.x - g.x, state.player.y - g.y) > 1.6 ? 'throw' : attackClip(view, g), { once: true, restart: true }); } }
      else if (moving) { view.attacking = false; play(view, runClip, { speed: runSpeed }); }
      else { view.attacking = false; if (!play(view, 'idle')) { play(view, 'walk', { speed: 0.22 }); if (view.current === view.actions.walk) view.current.timeScale = 0.22; } }   // no idle clip: a slow shuffle beats a T-pose
      if (view.current && moving) { view.current.paused = false; if (view.current === view.actions[runClip]) view.current.timeScale = runSpeed; }
      return;
    }
    if (g.state === 'dying' || g.state === 'dead') outcomeFx(g, view, dt, state);
    if (view.coils && (g.state === 'dead' || g.state !== 'dying')) { for (const c of view.coils) entGroup.remove(c); view.coils = null; }   // the vines' coils go with the body
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
    if (view.hole) {   // the sand hole shrinks WITH the fall: sized by how far the chest bone has dropped toward the floor (James, round five)
      const h = view.hole, k0 = h.userData.k || 0.55;
      let k = 1;
      if (h.parent && h.parent.isBone) { const wy = h.parent.getWorldPosition(_hv).y; const y0 = h.userData.y0 != null ? h.userData.y0 : (h.userData.y0 = wy); k = Math.min(1, Math.max(0, (wy - 0.3) / Math.max(0.2, y0 - 0.3))); k = k * k; }
      else k = 1 - Math.min(1, Math.max(0, (u - 0.4) / 0.3));
      if (g.dieT > (g.dieDur || 1)) k = 0;
      h.scale.set(k0 * k, k0 * k * (0.35 + 0.65 * k), 1);
      if (k <= 0.02) { if (h.parent) h.parent.remove(h); view.hole = null; }
    }
    if (view.started !== o) {
      view.started = o;
      root.position.set(g.x * S, 0, g.y * S);
      if (view.weapon) dropWeapon(view, g);   // the weapon leaves the hand (2026-09-11)
      if (view.current) view.current.paused = true;
      if (o === 'expire' && g.gagId === 'lightning') {   // the shock first (James 2026-09-10); the die clip comes at the end of it
        play(view, view.actions.electro ? 'electro' : 'hit', { once: true, restart: true });   // the electrocution clip plays through from the shock; no arms-out (James 2026-09-11)
        view.shock = { bones: [], parts: [] };
        for (const [name, y, sc] of [['skull', 0.86, 0.5], ['ribs', 0.58, 0.62], ['spine', 0.3, 0.55]]) { const src = models.gibByName[name]; if (!src) continue; const p = src.clone(); p.scale.setScalar(sc * g.def.size * 0.34); p.position.set(0, hgt * y, 0); p.traverse((q) => { if (q.isMesh) { q.material = q.material.clone(); q.material.emissive = new THREE.Color(0xfff2c0); q.material.emissiveIntensity = 0.9; } }); root.add(p); view.shock.parts.push(p); }
        setOpacity(view, 0.45);
      }
      else if (o === 'expire') { if (!play(view, g.gagId === 'audit' ? 'hit' : deathClip(view, g), { once: true, restart: true })) view.fallOver = true; if (g.gagId === 'sand') holeOn(view, g, hgt); }   // the death deal (2026-09-11)
      if (o === 'gib') { hide(view); gibBurst(g.x * S, hgt * 0.5, g.y * S, g.isBoss ? 30 : 20, g.isBoss ? 2 : 1); wallSplats(state, g.x, g.y, 4); pool(g.x * S, g.y * S, 1.6); }
      if (o === 'squash' && (g.gagId === 'anvil' || g.gagId === 'piano')) { gibBurst(g.x * S, hgt * 0.5, g.y * S, 16, 1); wallSplats(state, g.x, g.y, 3); dropGibs(g.x * S, g.y * S, ['intestines', ...gorePick(4)]); }   // the anvil: blood and guts (James 2026-09-10)
      if (o === 'squash' && g.gagId === 'sneaker') { blood.burst(g.x * S, hgt * 0.35, g.y * S, 44, 3.0); pool(g.x * S, g.y * S, 3.2); wallSplats(state, g.x, g.y, 3); dropGibs(g.x * S, g.y * S, gorePick(2)); }   // the sneaker: more blood (James 2026-09-11)
      if (o === 'squash' && g.gagId === 'cow') { blood.burst(g.x * S, hgt * 0.4, g.y * S, 40, 2.8); pool(g.x * S, g.y * S, 3.0); dropGibs(g.x * S, g.y * S, gorePick(2)); wallSplats(state, g.x, g.y, 2); }   // the cow: more blood, a couple of lesser giblets (James 2026-09-11)
      if (o === 'squash') { pool(g.x * S, g.y * S, 2.2); puff(g.x * S, 0.3, g.y * S, 0x8a7a6a, 1.6); blood.burst(g.x * S, 0.3, g.y * S, 24, 2.2); setTint(view, new THREE.Color(0xff6a7a), new THREE.Color(0x802030), 0.45); }
      if (o === 'freeze') { const block = new THREE.Mesh(new THREE.BoxGeometry(0.9 * g.def.size + 0.3, hgt + 0.15, 0.7 * g.def.size + 0.3), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, emissive: 0x3a7ab0, emissiveIntensity: 0.35, transparent: true, opacity: 0.42, depthWrite: false })); block.position.set(g.x * S, (hgt + 0.15) / 2, g.y * S); block.scale.set(0.01, 0.01, 0.01); entGroup.add(block); view.block = block; }
      if (o === 'fling') { const from = state.player, ang = Math.atan2(g.y - from.y, g.x - from.x); const hit = CORE().castRay(state, g.x, g.y, ang, 5); const d = hit ? Math.max(0.3, hit.d - 0.35) : 5; view.flingTo = { x: (g.x + Math.cos(ang) * d) * S, z: (g.y + Math.sin(ang) * d) * S, d, ang, wall: !!hit && hit.d < 5, hx: hit ? hit.x : null, hy: hit ? hit.y : null }; view.flingFrom = { x: g.x * S, z: g.y * S }; }
      if (o === 'vapor' && g.gagId !== 'blackhole') { setTint(view, new THREE.Color(0xffffff), new THREE.Color(0xffffff), 1); for (const m of view.mats) if (m.emissive) m.emissiveIntensity = 1.4; ash(g.x * S, g.y * S, 1.2); }
      if (o === 'chew') { view.bites = 0; if (g.gagId === 'piranhas' && propFor('piranha') && !view.school) { view.school = []; for (let i = 0; i < 7; i++) { const f = propFor('piranha').clone(); f.userData.ph = Math.random() * Math.PI * 2; f.userData.sp = 4 + Math.random() * 3; f.userData.h = 0.25 + Math.random() * 0.6; entGroup.add(f); view.school.push(f); } } }   // the feeding frenzy (James 2026-09-10)
      if (o === 'chew') { blood.burst(g.x * S, hgt * 0.5, g.y * S, 12, 2); }
      /* OFF (James 2026-09-11: 'two swarms') — the summon itself holds on the body now (core s.hold) */ if (false && o === 'expire' && g.gagId === 'bees' && propFor('bees') && !view.school) { view.school = []; view.hornets = true; for (let i = 0; i < 8; i++) { const f = propFor('bees').clone(); f.scale.multiplyScalar(0.75 + Math.random() * 0.5); f.userData.ph = Math.random() * TAU; f.userData.sp = 5 + Math.random() * 4; f.userData.h = 0.3 + Math.random() * 0.6; f.userData.w = (2.5 + Math.random() * 3) * (Math.random() < 0.5 ? -1 : 1); entGroup.add(f); view.school.push(f); } }   // the swarm stays on the body while it goes down (James 2026-09-11)
      if (o === 'vapor' && g.gagId !== 'blackhole') { flash(g.x * S, hgt * 0.5, g.y * S, 0xffffff, 1.6); }
      if (o === 'freeze') setTint(view, new THREE.Color(0x9fd8ff), new THREE.Color(0x2a6aa0), 0.0);
      if (o === 'smother' && g.gagId !== 'vines' && g.gagId !== 'gravy') { const c = SMOTHER_COLOR[g.gagId] || 0x3ddc5a; const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 })); blob.position.set(g.x * S, 0.3, g.y * S); blob.scale.set(0.2, 0.15, 0.2); entGroup.add(blob); view.blob = blob; }
      if (o === 'glue') { const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshLambertMaterial({ color: 0xf0eee6 })); blob.position.set(g.x * S, 0.05, g.y * S); blob.scale.set(1.1, 0.25, 1.1); entGroup.add(blob); view.blob = blob; }
      if (o === 'burn') { const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spr.scale.set(1.2 * g.def.size, 1.9 * g.def.size, 1); spr.position.y = hgt * 0.5; root.add(spr); view.fire = spr; }
      if (o === 'drop') { view.dropClip = play(view, 'fall3', { once: true, restart: true }); }   // the fall clip if the creature has it (2026-09-11); the arms-up below stands in when it does not
    }
    switch (o) {
      case 'squash': { const k = Math.min(1, u * 10) /* the crush is the last tenth or two of a second as the thing arrives (James 2026-09-11); the falling prop lands 0.15 s after the kill to match */, sy = Math.max(0.16, 1 - 0.84 * k); root.scale.set(1 + 1.3 * k, sy, 1 + 1.3 * k); root.position.y = -(view.minY || 0) * (1 - sy); break; }
      case 'freeze': {
        setTint(view, new THREE.Color(0xdff4ff), new THREE.Color(0x3a7ab0), Math.min(1, u * 2));
        if (view.block) { const k = Math.min(1, u / 0.5); view.block.scale.set(k, k, k); }
        if (u > 0.55 && !view.hidden) { hide(view); if (view.block) { entGroup.remove(view.block); view.block = null; } iceShards(g.x * S, hgt * 0.5, g.y * S, 22, hgt); for (let i = 0; i < 6; i++) spawnGib(GIBS[i % GIBS.length], g.x * S, hgt * 0.5, g.y * S, 1, 0x9fd8ff, 1.5 + Math.random() * 2, 2 + Math.random() * 2); puff(g.x * S, hgt * 0.5, g.y * S, 0xbfe8ff, 1.2); }
        break;
      }
      case 'glue': {   // in to the shoulders fast, then a struggle with the arms up and the head bobbing out of the glue, then under (James 2026-09-10)
        const sink = u < 0.2 ? u / 0.2 * 0.62 : u < 0.8 ? 0.62 + Math.sin((u - 0.2) * 40) * 0.05 : 0.62 + (u - 0.8) / 0.2 * 0.9;
        root.position.y = -sink * hgt;
        if (u >= 0.2 && u < 0.8) { play(view, 'hit'); root.rotation.y += Math.sin(u * 60) * 0.05; if (!view.glueArms) { view.glueArms = []; for (const n of ['LeftArm', 'RightArm']) { const b = view.model && view.model.getObjectByName(n); if (b) view.glueArms.push([n, b]); } } for (const [n, b] of view.glueArms) { b.rotation.set(0, 0, (n === 'LeftArm' ? -1 : 1) * 2.5 + Math.sin(u * 50 + (n === 'LeftArm' ? 0 : 2)) * 0.3); } }
        if (view.blob) view.blob.scale.set(1.1 + u * 0.3, 0.25 + u * 0.2, 1.1 + u * 0.3); break; }
      case 'gas': { setTint(view, new THREE.Color(0x60c840), new THREE.Color(0x2a6a10), Math.min(1, u * 1.5)); if (u > 0.45 && !view.gasFell) { view.gasFell = true; view.gasTilt = !play(view, 'shotfront' /* face forward, not the arms-out Falling Down (James 2026-09-11) */, { once: true, restart: true }); } if (!view.gasFell) root.rotation.z = Math.sin(g.dieT * 9) * 0.18 * (1 - u); if (view.gasTilt && u > 0.7) root.rotation.x = -(u - 0.7) / 0.3 * Math.PI / 2; break; }   // keels over with the clip (2026-09-11)
      case 'fling': {
        if (g.gagId === 'tornado') {   // up the funnel in a spiral, then apart into limbs and parts at the top (James 2026-09-10)
          const k = Math.min(1, g.dieT / 1.3), cx = g.x * S, cz = g.y * S, top = 3.4;   // g.x/g.y ride with the funnel (core)
          if (k < 1) { root.position.set(cx + Math.cos(k * 14) * 0.7 * k, k * top, cz + Math.sin(k * 14) * 0.7 * k); root.rotation.y += 0.35; root.rotation.z = k * 4; root.rotation.x = Math.sin(k * 9) * 0.6; }
          else if (g.dieT < 3.0) { const a = g.dieT * 10.8; root.position.set(cx + Math.cos(a) * 0.7, top + Math.sin(g.dieT * 7) * 0.15, cz + Math.sin(a) * 0.7); root.rotation.y += 0.35; root.rotation.z = 4 + Math.sin(g.dieT * 5) * 0.4; root.rotation.x = Math.sin(g.dieT * 9) * 0.6; }   // the ride at the top until the burst (2026-09-11)
          else if (!view.burst) { view.burst = true; hide(view); gibBurst(cx, top, cz, 12, 1.2); wallSplats(state, g.x, g.y, 3); for (const n of [...GORE.limbs, ...gorePick(5)]) spawnGib(n, cx, top + (Math.random() - 0.5) * 0.6, cz, 1.1, null, 5 + Math.random() * 6, 2 + Math.random() * 4); }
          break;
        }
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
      case 'drop': {   // arms straight up and waving as they go down (James 2026-09-11)
        root.position.y = -u * 3.2;
        if (!view.dropArms) { view.dropArms = []; for (const n of ['LeftArm', 'RightArm']) { const b = view.model && view.model.getObjectByName(n); if (b) view.dropArms.push([n, b]); } }
        const up = Math.min(1, u / 0.18);
        if (!view.dropClip) for (const [n, b] of view.dropArms) b.rotation.set(0, 0, (n === 'LeftArm' ? -1 : 1) * (2.9 * up) + Math.sin(g.dieT * 22 + (n === 'LeftArm' ? 0 : 2)) * 0.25 * up);
        break; }
      case 'burn': { setTint(view, new THREE.Color(0x0a0806), new THREE.Color(0x000000), Math.min(1, u * 1.6)); if (view.fire) { view.fire.material.map = flameTex(Math.floor(g.dieT * 10) % 4); view.fire.material.opacity = u < 0.8 ? 1 : (1 - u) * 5; } if (u > 0.85) { root.scale.set(1, 0.35, 1); } embers.emit(g.x * S, hgt * 0.4, g.y * S, 1); break; }
      case 'chew': { if (view.school) syncSchool(view, g, hgt, u); if (!view.hidden && u > 0.85) { hide(view); dropGibs(g.x * S, g.y * S, ['skull', 'ribs', ...gorePick(3)]); } if (Math.floor(g.dieT * 8) !== view.lastBite) { view.lastBite = Math.floor(g.dieT * 8); blood.burst(g.x * S, hgt * 0.5, g.y * S, 6, 1.4); if (view.lastBite % 2 === 0 && !view.hidden) { view.bites = (view.bites || 0) + 1; spawnGib(gorePick(1)[0], g.x * S, hgt * 0.5, g.y * S, 0.8, null, 1 + Math.random() * 2, 1.5 + Math.random() * 2); root.scale.setScalar(Math.max(0.55, 1 - view.bites * 0.06)); } } break; }
      case 'gib': break;
      case 'vapor': { if (g.gagId === 'blackhole') { const k = Math.min(1, u * 1.15); root.position.set(g.x * S, k * k * 1.2, g.y * S); root.rotation.y += 0.25 + k * 0.6; root.scale.set(Math.max(0.02, 1 - k * 1.05), (1 + k * 1.6) * Math.max(0.02, 1 - k * k), Math.max(0.02, 1 - k * 1.05)); if (k >= 1 && !view.hidden) hide(view); break; }   // spaghettified into the hole (James 2026-09-10)
        if (u > 0.15) { setTint(view, new THREE.Color(0xffffff), new THREE.Color(0xffffff), 1); for (const m of view.mats) if (m.emissive) m.emissiveIntensity = Math.max(0, 1.4 - (u - 0.15) * 4); setOpacity(view, Math.max(0, 1 - (u - 0.15) * 1.6)); root.scale.set(1, Math.max(0.05, 1 - (u - 0.15) * 1.3), 1); } break; }
      case 'expire': {
        if (view.hornets && view.school) syncHornets(view, g, hgt);
        if (view.shock) {
          const k = Math.min(1, u / 0.3);
          if (k < 1) {
            root.position.y = 0.15 * Math.sin(k * Math.PI) + 0.02 * Math.sin(u * 200);   // the six-inch hop, buzzing
            for (const [n, b] of view.shock.bones) { b.rotation.set(0, 0, (n === 'LeftArm' ? -1 : 1) * 1.35); b.rotation.x = Math.sin(u * 160 + (n === 'LeftArm' ? 0 : 1)) * 0.15; }   // arms straight out, jittering (after the mixer: absolute)
            const on = Math.floor(u * 90) % 2 === 0; for (const p of view.shock.parts) p.visible = on;
            setOpacity(view, on ? 0.35 : 0.6);
            if (Math.random() < 0.35) flash(g.x * S, hgt * 0.5, g.y * S, 0xfff0b0, 0.6 + Math.random() * 0.6);
          } else {
            for (const p of view.shock.parts) root.remove(p); view.shock = null; root.position.y = 0; setOpacity(view, 1);
            if (view.current !== view.actions.electro && !play(view, deathClip(view, g), { once: true, restart: true })) view.fallOver = true;   // electro is already playing from the shock
          }
          break;
        }
        if (view.fallOver) root.rotation.x = -Math.min(1, Math.max(0, (u - 0.6) / 0.4)) * Math.PI / 2; if (g.gagId === 'audit' && u > 0.6 && !view.audited) { view.audited = true; play(view, deathClip(view, g), { once: true, restart: true }); } break; }
      case 'shrink': { root.scale.setScalar(Math.max(0.02, g.scale)); break; }
      case 'smother': { if (g.gagId === 'vines') { syncCoils(view, g, hgt, u); const pull = Math.max(0, (u - 0.45) / 0.55); root.position.set(g.x * S, -pull * hgt * 0.55, g.y * S); root.scale.set(1 - pull * 0.3, 1 - pull * 0.45, 1 - pull * 0.3); root.rotation.z = Math.sin(u * 30) * 0.06 * (1 - pull); if (pull <= 0) { play(view, 'hit'); root.rotation.y += Math.sin(u * 70) * 0.09; root.position.x += Math.sin(u * 90) * 0.04; root.position.z += Math.cos(u * 75) * 0.04; }   /* the struggle: the hit clip on repeat, thrashing (James 2026-09-10) */ if (pull > 0.6 && !view.bled) { view.bled = true; blood.burst(g.x * S, hgt * 0.3, g.y * S, 14, 1.6); pool(g.x * S, g.y * S, 1.2); } break; }   // strangled: coils climb, then pulled down and crushed (James 2026-09-10)
        const k = Math.min(1, u * 1.5); if (view.blob) view.blob.scale.set(0.2 + k * 1.3, 0.15 + k * 1.0, 0.2 + k * 1.3); root.position.y = -k * 0.5; if (g.gagId === 'gravy') { setTint(view, new THREE.Color(0x9a6a28), new THREE.Color(0x3a2408), Math.min(1, u * 2)); root.position.y = -k * 0.8; root.rotation.z = Math.sin(u * 20) * 0.08 * (1 - k); } break; }   // drowned in gravy: browned, sinking under the wave (2026-09-11)
      case 'inflate': { const s = g.scale != null ? g.scale : 1 + u; if (s < 0.05) { if (!view.hidden) { hide(view); gibBurst(g.x * S, hgt * 0.6, g.y * S, 22, 1.4); wallSplats(state, g.x, g.y, 4); pool(g.x * S, g.y * S, 1.8); } } else root.scale.setScalar(s); break; }
      default: break;
    }
    if (g.isBoss && g.state === 'dying' && !view.bossBurst && u > 0.5) { view.bossBurst = true; gibBurst(g.x * S, 2.5, g.y * S, 28, 2); wallSplats(state, g.x, g.y, 4); pool(g.x * S, g.y * S, 3); }
  }
  // the hornets on a stung body: each circles at its own height and rate, dipping in and out, wings beating
  function syncHornets(view, g, hgt) {
    const t = g.dieT, cx = g.x * S, cz = g.y * S;
    for (const f of view.school) {
      const up = g.dieDur ? Math.max(0, (t / g.dieDur - 0.7) / 0.27) : 0;   // then away: up into the ceiling (James 2026-09-11)
      const d = f.userData, ang = d.ph + t * d.w, r = (0.45 + Math.sin(t * d.sp + d.ph) * 0.25) * (1 - up * 0.5);
      f.position.set(cx + Math.cos(ang) * r, hgt * d.h + Math.sin(t * 6 + d.ph) * 0.1 + up * up * 3.6, cz + Math.sin(ang) * r);
      f.rotation.set(0, -ang - Math.sign(d.w) * Math.PI / 2 + Math.PI / 2, 0); f.rotateZ(Math.sin(t * 40 + d.ph) * 0.12);
      if (!d.wings) d.wings = [f.getObjectByName('LWing'), f.getObjectByName('RWing')]; if (d.wings[0] && d.wings[1]) { const w = Math.sin(t * 70 + d.ph) * 0.5; d.wings[0].rotation.z = w; d.wings[1].rotation.z = -w; }
    }
    if (g.dieDur && t / g.dieDur >= 0.97) { for (const f of view.school) entGroup.remove(f); view.school = null; view.hornets = false; }   // off with the body
  }
  // the school at the body: each fish circles at its own height and lunges in to the bone and back out, nose at the meat
  const _sc = new THREE.Vector3();
  function syncSchool(view, g, hgt, u) {
    const t = g.dieT, cx = g.x * S, cz = g.y * S;
    for (const f of view.school) {
      const ph = f.userData.ph + t * 1.6, lunge = Math.max(0, Math.sin(t * f.userData.sp + f.userData.ph));
      const r = 0.55 - lunge * 0.4, y = hgt * f.userData.h + Math.sin(t * 5 + f.userData.ph) * 0.05;
      f.position.set(cx + Math.cos(ph) * r, y, cz + Math.sin(ph) * r);
      _sc.set(cx, y, cz); f.lookAt(_sc); f.rotateY(Math.PI + (PROPS.piranha.yaw || 0));   // lookAt points +Z at the body; the yaw squares the model's nose to it
      f.rotateZ(Math.sin(t * 14 + f.userData.ph) * 0.3);
      f.visible = u < 0.97;
    }
    if (u >= 0.97) { for (const f of view.school) entGroup.remove(f); view.school = null; }
  }
  function hide(view) { view.hidden = true; if (view.model) view.model.visible = false; if (view.fire) view.fire.visible = false; if (view.block) { entGroup.remove(view.block); view.block = null; } }

  // gibs: real Meshy pieces with a little physics; they stay as scars (capped — the oldest settled ones go)
  const MAX_GIBS = 240;   // 2026-09-08: room for the jello pile (140) beside the gibs
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
      const name = i === 0 ? 'ribs' : i === 1 ? 'skull' : i < 4 ? 'intestines' : i === 4 ? 'brain' : GIBS[Math.floor(Math.random() * GIBS.length)];   // the drawer in rotation (2026-09-10)
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: bloodTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
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
    const mat = new THREE.MeshBasicMaterial({ map: bloodTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
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
  // blueberries in every direction (the pie, James 2026-09-08): little spheres on the gib physics, they settle as litter
  // chunks(): n little pieces on the gib physics that settle as a pile — the pie's berries, the jello's blobs (James 2026-09-08)
  const CHUNK_GEOS = {};
  function chunkGeos(kind) {
    if (CHUNK_GEOS[kind]) return CHUNK_GEOS[kind];
    const gs = kind === 'blobby'
      ? [new THREE.SphereGeometry(0.06, 7, 5), new THREE.IcosahedronGeometry(0.065, 0), new THREE.DodecahedronGeometry(0.06, 0), new THREE.BoxGeometry(0.09, 0.05, 0.07), new THREE.CylinderGeometry(0.03, 0.06, 0.08, 6), new THREE.TetrahedronGeometry(0.075, 0)]
      : [new THREE.SphereGeometry(0.055, 8, 6)];
    return (CHUNK_GEOS[kind] = gs);
  }
  function chunks(x, y, z, n, opt) {
    const geos = chunkGeos(opt.shapes || 'round');
    const mat = new THREE.MeshStandardMaterial({ color: opt.color, roughness: opt.roughness != null ? opt.roughness : 0.5, emissive: opt.emissive, emissiveIntensity: 0.7, transparent: !!opt.opacity, opacity: opt.opacity || 1 });
    const spread = opt.spread || 1, up = opt.up || 1;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(geos[Math.floor(Math.random() * geos.length)], mat); mesh.scale.setScalar((0.7 + Math.random() * 0.8) * (opt.size || 1)); mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, 0);
      mesh.position.set(x, y + Math.random() * 0.2, z); entGroup.add(mesh);
      const a = Math.random() * TAU, sp = (1.5 + Math.random() * 3.5) * spread;
      gibs.push({ mesh, v: new THREE.Vector3(Math.cos(a) * sp, (1.5 + Math.random() * 3.5) * up, Math.sin(a) * sp), av: new THREE.Vector3(0, 0, 0), settled: false, bounces: 0 });
      if (gibs.length > MAX_GIBS) { const j = gibs.findIndex((b) => b.settled); const old = gibs.splice(j < 0 ? 0 : j, 1)[0]; entGroup.remove(old.mesh); }
    }
    for (let i = 0; i < 3; i++) puff(x, y, z, opt.puff || opt.color, 1.1);
  }
  // THE LEGOS (James 2026-09-11): a couple of hundred real bricks out of the ceiling, each its own colour, bouncing and
  // piling up around the target. Falls from the ceiling height over the zone's fall time (brickRain is called per frame
  // with how many to let go now); the bricks are dry bodies — no blood drips — and settle flat in a heap.
  const BRICK_COLORS = [0xe02020, 0x2050e0, 0xffd23a, 0x20b050, 0xf0f0f0, 0xff7a20, 0x202020, 0x8a30c0];
  let brickMats = null;
  function brickRain(x, z, r, n, ceil) {
    const src = propFor('brick'); if (!src) { berries(x, 0.4, z, Math.min(n, 12)); return; }
    if (!brickMats) brickMats = BRICK_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.28, metalness: 0.05, emissive: c, emissiveIntensity: 0.12 }));
    for (let i = 0; i < n; i++) {
      const mesh = src.clone(); const mat = brickMats[Math.floor(Math.random() * brickMats.length)];
      mesh.traverse((o) => { if (o.isMesh) o.material = mat; });
      mesh.scale.multiplyScalar(0.8 + Math.random() * 0.5);
      const a = Math.random() * TAU, d = Math.pow(Math.random(), 1.7) * r;   // most of them into the middle: a mound (James 2026-09-11)
      mesh.position.set(x + Math.cos(a) * d, ceil - Math.random() * 0.4, z + Math.sin(a) * d);
      mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      entGroup.add(mesh);
      bricks.push({ mesh, v: new THREE.Vector3((Math.random() - 0.5) * 1.2, -1 - Math.random() * 2, (Math.random() - 0.5) * 1.2), av: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12), settled: false, bounces: 0, dry: true, rest: 0.05 + Math.random() * 0.15 + Math.pow(1 - d / r, 2) * (0.5 + Math.random() * 0.6) });   // the rest height rises toward the middle: the heap
      if (bricks.length > 320) { const old = bricks.shift(); entGroup.remove(old.mesh); }
    }
  }
  function berries(x, y, z, n) { chunks(x, y, z, n, { color: 0x2a2e8a, emissive: 0x1a1c60, puff: 0x4a3a9a }); }
  // lime jello: darker, translucent, blobby shapes that don't make sense, a tight pile four times the berries
  function jelloPile(x, y, z) { chunks(x, y, z, 140, { color: 0x2f8a1e, emissive: 0x1a5a12, opacity: 0.78, roughness: 0.25, shapes: 'blobby', spread: 0.45, up: 0.9, size: 1.15, puff: 0x2f8a1e }); }
  // the grain of sand leaves a hole (James 2026-09-08): a black disc with a white-hot rim at chest height that sinks and
  // fades as the body drops
  let holeMap = null; const _hv = new THREE.Vector3();
  function holeTex() {
    if (holeMap) return holeMap;
    const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
    const g = x.createRadialGradient(48, 48, 0, 48, 48, 48);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,1)'); g.addColorStop(0.56, 'rgba(255,240,200,1)'); g.addColorStop(0.68, 'rgba(255,120,40,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    x.fillStyle = g; x.fillRect(0, 0, 96, 96);
    holeMap = new THREE.CanvasTexture(c); holeMap.colorSpace = THREE.SRGBColorSpace; return holeMap;
  }
  // round two (James: "the hole drifts… doesn't stay with the character"): a messy hole hung on the chest bone, so it
  // rides the die clip and the fall; drawn through the body (no depth test) so it reads as a hole from any side
  let messyMap = null;
  function messyHoleTex() {
    if (messyMap) return messyMap;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const blob = (r0, jag) => { x.beginPath(); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = r0 * (1 - jag + Math.random() * jag * 2); x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.closePath(); };
    blob(52, 0.28); x.fillStyle = 'rgba(120,10,20,0.95)'; x.fill();     // torn flesh
    blob(44, 0.22); x.fillStyle = 'rgba(255,150,60,0.9)'; x.fill();     // the cauterised rim
    blob(36, 0.25); x.fillStyle = 'rgba(0,0,0,1)'; x.fill();            // the hole
    messyMap = new THREE.CanvasTexture(c); messyMap.colorSpace = THREE.SRGBColorSpace; return messyMap;
  }
  function holeOn(view, g, hgt) {
    const x = g.x * S, y = hgt * 0.55, z = g.y * S;
    flash(x, y, z, 0xffffff, 1.2); puff(x, y, z, 0x8a8a90, 0.7); blood.burst(x, y, z, 10, 1.2);
    const bone = view.model && (view.model.getObjectByName('Spine02') || view.model.getObjectByName('Spine01') || view.model.getObjectByName('Spine'));
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: messyHoleTex(), transparent: true, depthWrite: false, depthTest: false }));
    spr.renderOrder = 5;
    if (bone) {
      bone.add(spr); const ws = bone.getWorldScale(new THREE.Vector3()); const k = 0.37 / Math.max(1e-6, ws.x); spr.scale.set(k, k, 1); spr.userData.k = k;   // a third smaller (James, round six)
    } else { spr.position.set(0, y, 0); spr.scale.set(0.37, 0.37, 1); spr.userData.k = 0.37; view.root.add(spr); }
    view.hole = spr;
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
        if (b.bounces > 2 || Math.abs(b.v.y) < 1.2) { b.settled = true; b.mesh.rotation.x = Math.round(b.mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2); if (b.dry) { b.mesh.rotation.z = Math.round(b.mesh.rotation.z / (Math.PI / 2)) * (Math.PI / 2); b.mesh.position.y = b.rest != null ? b.rest : 0.12; } else blood.drip(b.mesh.position.x, b.mesh.position.z); }
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
      const mat = new THREE.MeshBasicMaterial({ map: bloodTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
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
      drip(x, z) { if (drips.length > 90 || gravity <= 0) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ map: bloodTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU; m.position.set(x, 0.015, z); entGroup.add(m); drips.push(m); extras.push({ obj: m }); },
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
  // THE HOSE (James 2026-09-10, glue: 'this should look like a hose is shooting out of the gun'): every live drop of a
  // hose stream is a control point on one glossy white tube from the nozzle out, rebuilt each frame; the rope sags with
  // distance and only the two oldest drops still draw as blobs, splashing where the rope breaks up.
  const hoseViews = new Map();
  const HOSE_MAT = { glue: new THREE.MeshPhongMaterial({ color: 0xf0eee6, specular: 0x9a9a9a, shininess: 70 }), lava: new THREE.MeshLambertMaterial({ color: 0xa02800, emissive: 0xff6a14, emissiveIntensity: 0.9 }) };
  const lavaBits = makeParticles(0xff9a30, 0.26, 9, 400); lavaBits.drip = () => {};   // lava chunks: they land and go out, no blood drips
  function syncHoses(state) {
    const groups = new Map();
    for (const s of state.shots) if (s.gag.hose && !s.dead) { const k = s.gag.id + ':' + (s.owner === 'player' ? 'player' : s.ox + ':' + s.oy); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    const seen = new Set();
    for (const [k, list] of groups) {
      list.sort((a, b) => a.t - b.t);
      list.forEach((s, i) => { s.hoseRank = list.length - 1 - i; });   // 0 = the oldest drop, the head of the rope
      seen.add(k);
      const pts = [];
      if (k.endsWith(':player')) pts.push(_muzzleWorld.clone()); else { const s0 = list[0]; pts.push(new THREE.Vector3(s0.ox * S, 1.1, s0.oy * S)); }
      for (const s of list) {
        const u = Math.min(1, s.t / (s.life || 0.7));
        const y = (s.z != null ? s.z : 0.3) * S * (1 - u * 0.55) + 0.1;   // the sag
        const p = new THREE.Vector3(s.x * S, y, s.y * S);
        if (p.distanceTo(pts[pts.length - 1]) > 0.04) pts.push(p);
      }
      let m = hoseViews.get(k);
      if (pts.length < 2) { if (m) { m.visible = false; } continue; }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      const geo = new THREE.TubeGeometry(curve, Math.min(36, pts.length * 2), 0.08, 5, false);
      if (!m) { m = new THREE.Mesh(geo, HOSE_MAT[list[0].gag.id] || HOSE_MAT.glue); m.frustumCulled = false; entGroup.add(m); hoseViews.set(k, m); }
      else { m.geometry.dispose(); m.geometry = geo; m.visible = true; }
      if (list[0].gag.chunks) {   // the pour: chunks fly out in every direction from where the rope lands, and it glows
        const h = pts[pts.length - 1];
        lavaBits.burst(h.x, h.y, h.z, 2, 3.5);
        lavaBits.burst(h.x, h.y, h.z, 1, 3.5);   // (no light of its own: the light count must not change mid-stream)
      }
    }
    for (const [k, m] of hoseViews) if (!seen.has(k)) { entGroup.remove(m); m.geometry.dispose(); hoseViews.delete(k); }
  }
  // THE GUST (James 2026-09-10, the sneeze: "a blast of wind… very light, slightly opaque material flying away from the gun
  // in an expanding cone"): soft sprites born at the muzzle, flying down the aim with a spread that widens with distance,
  // swelling and fading as they go.
  const gusts = [];
  const _gustMat = () => new THREE.SpriteMaterial({ map: softDot(), color: 0xe4ebf2, transparent: true, opacity: 0.13, depthWrite: false });
  function puffGust(s, state, n) {
    const a = s.a != null ? s.a : state.player.a + (state.player.aim || 0);
    for (let i = 0; i < n; i++) {
      const spr = new THREE.Sprite(_gustMat());
      const yaw = a + (Math.random() - 0.5) * 0.9, pitch = (Math.random() - 0.5) * 0.5, sp = 8 + Math.random() * 6;
      spr.position.copy(_muzzleWorld).add(new THREE.Vector3(Math.cos(a) * 0.7, 0.05, Math.sin(a) * 0.7));   // born a little ahead of the lens, never over it
      const v = new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch) * sp, Math.sin(pitch) * sp, Math.sin(yaw) * Math.cos(pitch) * sp);
      spr.scale.setScalar(0.12); entGroup.add(spr);
      gusts.push({ spr, v, t: 0, life: 0.55 + Math.random() * 0.35, spin: (Math.random() - 0.5) * 3 });
    }
  }
  function stepGusts(dt) {
    for (const g of gusts) {
      g.t += dt; const k = g.t / g.life;
      g.spr.position.addScaledVector(g.v, dt); g.v.multiplyScalar(1 - dt * 1.6);   // slows as it spreads
      const sz = 0.12 + k * 1.6; g.spr.scale.set(sz, sz, 1); g.spr.material.rotation += g.spin * dt;
      g.spr.material.opacity = 0.13 * (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75);
      if (k >= 1) { entGroup.remove(g.spr); g.dead = true; }
    }
    for (let i = gusts.length - 1; i >= 0; i--) if (gusts[i].dead) gusts.splice(i, 1);
  }
  function syncShots(state, t) {
    syncHoses(state);
    const seen = new Set();
    for (const s of state.shots) {
      if (s.gag.gust && !s.hostile && s.t < s.life * 0.7) puffGust(s, state, 6);   // the sneeze: wisps while the blast lasts
      if (s.sprite === 'none') continue;
      seen.add(s.id);
      let spr = shotViews.get(s.id);
      if (!spr) {
        const src = propFor(s.sprite);
        if (src && PROPS[s.sprite].motion === 'swarm') { spr = new THREE.Group(); for (let i = 0; i < PROPS[s.sprite].count; i++) { const c = src.clone(); c.scale.multiplyScalar(0.75 + Math.random() * 0.5); c.userData.ph = Math.random() * TAU; c.userData.w = (2.2 + Math.random() * 2.5) * (Math.random() < 0.5 ? -1 : 1); c.userData.r = 0.25 + Math.random() * 0.55; c.userData.h = (Math.random() - 0.5) * 0.7; c.userData.f = 5 + Math.random() * 6; spr.add(c); } spr.userData.prop = s.sprite; spr.userData.halfH = src.userData.halfH; spr.userData.halfW = src.userData.halfW; }   // the swarm: many on their own orbits (the hornets, 2026-09-11)
        else if (src) { spr = src.clone(); spr.userData.prop = s.sprite; spr.userData.halfH = src.userData.halfH; spr.userData.halfW = src.userData.halfW; }
        else if (s.sprite === 'flame') { spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spr.userData.fire = true; }   // the flamethrower: the burning creatures' fire, as a stream (James 2026-09-08)
        else spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: gagSprite(s.sprite, 0), transparent: true, depthWrite: false }));
        entGroup.add(spr); shotViews.set(s.id, spr);
      }
      if (spr.userData.prop) { syncPropShot(s, spr, state); continue; }
      if (spr.userData.fire) {   // each tongue grows, lifts and licks as it flies, then thins out
        const k = Math.min(1, s.t / (s.life || 0.8));
        spr.material.map = flameTex(Math.floor(s.t * 14 + s.id) % 4);
        const sz = 0.55 + k * 1.4; spr.scale.set(sz * 0.85, sz * 1.3, 1);
        spr.position.set(s.x * S, (s.z != null ? s.z : 0.3) * S + 0.15 + k * 0.6, s.y * S);
        if (!s.hostile) { const m = Math.min(1, s.t / 0.32), e = 1 - (1 - m) * (1 - m); spr.position.lerp(_muzzleWorld, 1 - e); }   // born at the barrel, not the player's centre (James)
        const dp = Math.hypot(s.x - state.player.x, s.y - state.player.y);
        spr.material.opacity = Math.min(s.hostile && dp < 0.9 ? Math.max(0, (dp - 0.45) / 0.45) : 1, k < 0.55 ? 1 : (1 - k) * 2.2);
        if (Math.random() < 0.12) embers.emit(s.x * S, 0.7, s.y * S, 1);
        continue;
      }
      spr.material.map = gagSprite(s.sprite, s.t);
      if (s.gag.hose && s.hoseRank !== 0) { spr.material.opacity = 0; continue; }   // inside the rope: the tube draws it (the hose, James 2026-09-10)
      let sz = 0.5;
      if (s.kind === 'train') sz = 1.4; else if (s.kind === 'melee') sz = 0.55; else if (s.kind === 'summon') sz = 0.6; else if (s.gag.count) sz = 0.3; else if (s.gag.kind === 'stream') sz = s.gag.hose ? 0.14 : 0.22;
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
    for (const [id, spr] of shotViews) if (!seen.has(id)) { shotViews.delete(id); if (spr.userData.arm) entGroup.remove(spr.userData.arm); if (spr.userData.prop && PROPS[spr.userData.prop].motion === 'swarm') extras.push({ obj: spr, t: 0, gone: true, tick: swarmAway }); else if (spr.userData.prop && PROPS[spr.userData.prop].stays) restProp(spr); else entGroup.remove(spr); }   // a spent swarm flies off into the ceiling (James 2026-09-11)
  }
  // a prop in flight: faces its way, spins / rolls / tumbles / walks by its kind
  const _tr = new THREE.Vector3();
  function syncPropShot(s, obj, state) {
    const def = PROPS[obj.userData.prop], hh = obj.userData.halfH;
    const a = s.a != null ? s.a : Math.atan2(s.vy || 0, s.vx || 1);
    if (def.motion === 'swing') {   // the handbag: the arm swings in from the right of the gun, the purse hangs off the hand and whips outward (James 2026-09-10)
      const k = Math.min(1, s.t / s.life), w = Math.sin(k * Math.PI);
      const out = 0.5 + w * Math.max(0.5, (s.reach || 2) - 0.5);
      const phi = (Math.PI / 2) * (1 - w);   // starts at the right, swings across to straight ahead at full reach, and back
      const hx = s.x + Math.cos(a + phi) * out, hy = s.y + Math.sin(a + phi) * out;   // the hand
      const heading = a + phi - Math.PI / 2;
      let arm = obj.userData.arm;
      if (!arm && propFor(def.arm)) { arm = propFor(def.arm).clone(); arm.scale.multiplyScalar(def.armSize / PROPS[def.arm].size); entGroup.add(arm); obj.userData.arm = arm; }
      if (arm) { arm.position.set(hx * S, 1.25, hy * S); arm.rotation.set(0, -heading + Math.PI / 2 + (def.armYaw || 0), 0); arm.rotateZ(-0.4 + w * 0.5); arm.visible = s.t < s.life * 0.95; }
      // the purse: hangs below the hand, thrown outward along the swing's tangent by the lag, whipping ahead at the middle
      const lag = 0.3 + w * 0.35, drop = 0.75 - w * 0.5;
      const px = hx + Math.cos(heading) * lag * 0.6, py = hy + Math.sin(heading) * lag * 0.6;
      obj.position.set(px * S, 1.25 - drop, py * S);
      obj.rotation.set(0, -heading + Math.PI / 2 + (def.purseYaw || 0), 0); obj.rotateX(0.5 - w * 0.9);
      obj.visible = s.t < s.life * 0.95; return;
    }
    if (def.motion === 'punch') {   // a melee prop: lunge from the muzzle to the reach and back at chest height, knuckles along the swing
      const k = Math.min(1, s.t / s.life), out = (0.35 + Math.sin(k * Math.PI) * Math.max(0.4, (s.reach || 2) - 0.35)) * 0.65;   // a smaller arc that starts and ends close to the player (James, rounds five + six)
      // a roundhouse: a quarter circle around the player from the right (facing a, the right is a + 90°) swinging to
      // straight ahead at full reach, then back the same way; the fist faces along the swing (James, round three)
      const w = Math.sin(k * Math.PI), phi = (Math.PI / 2) * (1 - w);
      const px = s.x + Math.cos(a + phi) * out, py = s.y + Math.sin(a + phi) * out;
      obj.position.set(px * S, 0.95, py * S);
      const heading = a + phi - Math.PI / 2;   // the arc's tangent: straight ahead as it comes out, turning with the swing like a hook (James, round four)
      obj.rotation.set(0, -heading + Math.PI / 2, 0); obj.rotateZ(w * 0.3);
      obj.visible = s.t < s.life * 0.92; return;
    }
    if (def.motion === 'swarm') {   // the swarm rides the summon's point at head height; each hornet circles it on its own radius and rate, bobbing, nose along its circle, buzzing
      obj.position.set(s.x * S, 1.35 + Math.sin(s.t * 3) * 0.1, s.y * S);
      if (!s.hostile && s.t < 0.32) { const m = s.t / 0.32, e = 1 - (1 - m) * (1 - m); obj.position.lerp(_muzzleWorld, 1 - e); }
      for (const c of obj.children) { const d = c.userData, ang = d.ph + s.t * d.w, spread = Math.min(1, s.t / 0.5); c.position.set(Math.cos(ang) * d.r * spread, d.h * spread + Math.sin(s.t * d.f + d.ph) * 0.12, Math.sin(ang) * d.r * spread); c.rotation.set(0, -ang - Math.sign(d.w) * Math.PI / 2 + Math.PI / 2 + (def.yaw || 0), 0); c.rotateZ(Math.sin(s.t * 40 + d.ph) * 0.12); c.rotateX(Math.sin(s.t * 31 + d.ph) * 0.1); if (!d.wings) d.wings = [c.getObjectByName('LWing'), c.getObjectByName('RWing')]; if (d.wings[0] && d.wings[1]) { const f = Math.sin(s.t * 70 + d.ph) * 0.5; d.wings[0].rotation.z = f; d.wings[1].rotation.z = -f; } }   // the wings split off (split_wings.py) beat fast
      return;
    }
    let y = (s.z != null ? s.z : 0.3) * S;
    if (def.motion === 'drive' || def.motion === 'walk' || def.motion === 'none') y = hh;
    if (def.motion === 'flyhigh') {
      y = 1.3 + Math.sin(s.t * 6) * 0.15;
      // the flap: wings split off in Blender (split_wings.py) as LWing / RWing with their pivots at the root
      const lw = obj.getObjectByName('LWing'), rw = obj.getObjectByName('RWing');
      if (lw && rw) { const f = Math.sin(s.t * 11) * 0.55; lw.rotation.z = f; rw.rotation.z = -f; }
    }
    if (def.motion === 'walk') y = hh + Math.abs(Math.sin(s.t * 9)) * 0.08;
    if (def.motion === 'swim') y = (s.z != null ? s.z : 0.3) * S + Math.sin(s.t * 7 + s.id) * 0.12;   // the school: each fish on its own bob
    obj.position.set(s.x * S, y, s.y * S);
    if (s.kind === 'train' && !s.hostile && s.t < 0.7) { const m = s.t / 0.7, e = 1 - (1 - m) * (1 - m); _tr.set(_muzzleWorld.x + Math.cos(a) * obj.userData.halfW, _muzzleWorld.y + obj.userData.halfH * 0.6, _muzzleWorld.z + Math.sin(a) * obj.userData.halfW); obj.position.lerp(_tr, 1 - e); }   // out of the barrel, not the middle of the screen (James 2026-09-10, the train)
    obj.rotation.set(0, -a + Math.PI / 2 + (def.yaw || 0), 0);     // Meshy props face -Z at rest (yaw squares up the ones that don't); turn them to face along the flight
    if (def.motion === 'swim') { obj.rotateY(Math.sin(s.t * 16 + s.id) * 0.28); obj.rotateZ(Math.sin(s.t * 9 + s.id * 2) * 0.35); }   // the tail-beat wriggle and a roll
    if (def.motion === 'spin') obj.rotateY(s.t * 14);
    if (def.motion === 'endover') obj.rotateX(s.t * 16);   // end over end along the flight, fast (the knives)
    if (def.motion === 'roll') obj.rotateX(s.t * 9);
    if (def.motion === 'tumble') { obj.rotateX(s.t * 4); obj.rotateZ(s.t * 2.5); }
    if (def.motion === 'side') obj.rotateZ(Math.PI / 2 + Math.sin(s.t * 3) * 0.1);   // already on its side in the air (the cow)
    if (def.motion === 'walk') obj.rotateZ(Math.sin(s.t * 9) * 0.08);
    if (def.motion === 'fly' && !def.prim) obj.rotateX(-0.2);
    if (def.prim === 'rocket') {   // the exhaust: a flickering flame and a smoke trail out the back
      const f = obj.getObjectByName('flame'), fc = obj.getObjectByName('flamecore');
      if (f) f.scale.set(0.8 + Math.random() * 0.4, 0.7 + Math.random() * 0.6, 0.8 + Math.random() * 0.4);
      if (fc) fc.scale.set(1, 0.7 + Math.random() * 0.6, 1);
      if (!(obj.userData.lastPuff >= 0) || s.t - obj.userData.lastPuff > 0.09) {
        obj.userData.lastPuff = s.t;
        const bx = obj.position.x - Math.cos(a) * def.size * 0.5, bz = obj.position.z - Math.sin(a) * def.size * 0.5;
        puff(bx, y, bz, 0x4a4a50, 0.22);   // a thin dark trail: the white cloud hid the rocket (pane, first cut)
        const hot = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xff9a30, transparent: true, depthWrite: false, opacity: 0.7, blending: THREE.AdditiveBlending }));
        hot.position.set(bx, y, bz); hot.scale.set(0.45, 0.45, 1); entGroup.add(hot);
        extras.push({ obj: hot, life: 0.18, t: 0, fade: true, grow: 0.5 });
      }
    }
    const dp = Math.hypot(s.x - state.player.x, s.y - state.player.y);
    obj.visible = dp > 0.5 && (s.kind !== 'melee' || s.t < s.life * 0.85);
  }
  // a prop that stays: settle it on the floor where it stopped and keep it for the level
  // a landed four-legged prop (the cow): a moment on its feet with the legs kicking, two or three kicks, then it rolls
  // over on its side with a thump and lies there (James 2026-09-11: 'land on its side… move its legs a couple times before flopping')
  // a spent swarm: keeps circling as it climbs away into the ceiling, then it is gone
  function swarmAway(e, dt) {
    const o = e.obj; e.t += dt; o.position.y += (1.5 + e.t * 3) * dt;
    for (const c of o.children) { const d = c.userData, ang = d.ph + (e.t + 9) * d.w; c.position.set(Math.cos(ang) * d.r, d.h + Math.sin(e.t * d.f + d.ph) * 0.12, Math.sin(ang) * d.r); c.rotation.set(0, -ang - Math.sign(d.w) * Math.PI / 2 + Math.PI / 2, 0); if (d.wings && d.wings[0] && d.wings[1]) { const w = Math.sin(e.t * 70 + d.ph) * 0.5; d.wings[0].rotation.z = w; d.wings[1].rotation.z = -w; } }
    if (e.t > 1.6) { entGroup.remove(o); return false; }
    return true;
  }
  function legsTick(e, dt) {
    const o = e.obj; e.t += dt;
    if (!e.legs) { e.legs = ['LegA', 'LegB', 'LegC', 'LegD'].map((n) => o.getObjectByName(n)).filter(Boolean); e.side = Math.random() < 0.5 ? -1 : 1; e.y0 = o.position.y; }
    const WOBBLE = 0.35, FLOP = 0.42, KICK = 1.6;   // a wobble on its feet, over it goes, then the legs go (James 2026-09-11: 'fall over first and then some leg motions')
    if (e.t < WOBBLE) { o.rotation.z = e.side * Math.sin(e.t * 18) * 0.06; return true; }
    const u = Math.min(1, (e.t - WOBBLE) / FLOP), k = u * u;
    o.rotation.z = e.side * (Math.PI / 2) * k; o.rotation.x = 0;
    o.position.y = e.y0 * (1 - k) + e.y0 * 0.6 * k;
    if (u >= 1 && !e.thumped) { e.thumped = true; puff(o.position.x, 0.3, o.position.z, 0x8a7a6a, 1.8); }
    if (u < 1) return true;
    const kt = e.t - WOBBLE - FLOP, fade = Math.max(0, 1 - kt / KICK);   // on its side: the legs run in the air, slowing to a twitch, then still
    e.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? 0.35 : -0.25) * (1 - fade) + Math.sin(kt * 13 + i * 1.7) * 0.7 * fade; });
    o.rotation.x = Math.sin(kt * 13) * 0.02 * fade;
    return kt < KICK;
  }
  function restProp(obj) {
    if (obj.userData.keepPose) { obj.visible = true; extras.push({ obj }); return; }   // a wreck keeps the pose it crashed into (the piano)
    obj.position.y = obj.userData.halfH * 0.9;
    obj.rotation.set(0, obj.rotation.y, (Math.random() - 0.5) * 0.3);
    if (PROPS[obj.userData.prop] && PROPS[obj.userData.prop].motion === 'side') { obj.rotation.z = Math.PI / 2; obj.position.y = obj.userData.halfH * 0.55; }   // lands on its side (the cow)
    if (levelRef) { const cx = obj.position.x / S, cz = obj.position.z / S; if (CORE().cellAt(levelRef, cx, cz) !== 0) { obj.position.x = (Math.floor(cx) + 0.5) * S; obj.position.z = (Math.floor(cz) + 0.5) * S; } }
    obj.visible = true;
    if (PROPS[obj.userData.prop] && PROPS[obj.userData.prop].legs) { obj.userData.animated = true; extras.push({ obj, t: 0, tick: legsTick }); return; }   // the cow lands as a LOB shot, not a drop zone: it kicks and flops from here (James 2026-09-11, 'its not flipping over')
    extras.push({ obj });
  }
  // POISON GAS (James: grow from small, the blobs drifting / rocking / pulsing in size and opacity on their own, soft-edged):
  // eight soft green sprites, each with its own phase; the cloud grows over the first second and thins out at the end
  // The volume is the SCAR (the zone lives 0.2 s; the scar is the nine seconds of gas). Ink-like: many overlapping wisps
  // of a soft noise texture, gross yellow-green, very translucent, each drifting, turning and pulsing on its own; grows in
  // over 1.5 s from nothing, thins out over the scar's last two seconds. (James 2026-09-08, two notes.)
  let wispMaps = null;
  function wispTex(i) {
    if (!wispMaps) {
      wispMaps = [];
      for (let k = 0; k < 4; k++) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        for (let j = 0; j < 34; j++) {
          const r = 10 + Math.random() * 26, px = 64 + (Math.random() - 0.5) * 70, py = 64 + (Math.random() - 0.5) * 70;
          const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,' + (0.10 + Math.random() * 0.14) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
        }
        // keep it soft at the edge of the card
        const edge = x.createRadialGradient(64, 64, 30, 64, 64, 64); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,1)');
        x.globalCompositeOperation = 'destination-out'; x.fillStyle = edge; x.fillRect(0, 0, 128, 128);
        const m = new THREE.CanvasTexture(c); m.colorSpace = THREE.SRGBColorSpace; wispMaps.push(m);
      }
    }
    return wispMaps[i % wispMaps.length];
  }
  function makeGasVolume() {
    const g = new THREE.Group();
    for (let i = 0; i < 48; i++) {   // tripled (James: 'triple the volume')
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: wispTex(i), color: i % 4 === 0 ? 0xc8e050 : 0x9ccc36, transparent: true, depthWrite: false, opacity: 0.3 }));
      const a = Math.random() * TAU, rr = i < 8 ? Math.random() * 0.3 : 0.3 + Math.random() * 0.85;
      spr.userData = { ox: Math.cos(a) * rr, oz: Math.sin(a) * rr, oy: 0.25 + Math.random() * 1.5, ph: Math.random() * TAU, sp: 0.35 + Math.random() * 0.7, sz: 1.6 + Math.random() * 1.6, spin: (Math.random() - 0.5) * 0.5, rot: Math.random() * TAU };
      g.add(spr);
    }
    return g;
  }
  function updateGasVolume(g, s, t) {
    const grow = 1 - Math.pow(1 - Math.min(1, s.t / 1.5), 3);
    const fade = s.life === Infinity ? 1 : Math.min(1, Math.max(0, (s.life - s.t) / 2));
    const r = (s.r || 1.5) * S;
    for (const spr of g.children) {
      const d = spr.userData, w = t * d.sp + d.ph;
      spr.position.set(s.x * S + (d.ox * r + Math.sin(w) * 0.35) * grow, (d.oy + Math.sin(w * 0.6 + 1) * 0.18) * (0.3 + 0.7 * grow), s.y * S + (d.oz * r + Math.cos(w * 0.8) * 0.35) * grow);
      const k = d.sz * grow * (1 + Math.sin(w * 1.1) * 0.12); spr.scale.set(k, k * 0.85, 1);
      spr.material.rotation = d.rot + t * d.spin;
      spr.material.opacity = (0.26 + Math.sin(w * 0.9 + 2) * 0.08) * fade * (0.2 + 0.8 * grow);
    }
  }
  // THE BLACK HOLE (James 2026-09-10: a dark sphere flowing forward, then the Interstellar look — accretion disk, the lensed
  // halo — and the monsters sucked into the centre). One canvas gradient feeds the disk and the halo.
  let _diskTex = null;
  function diskTex() {
    if (_diskTex) return _diskTex;
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0.00, 'rgba(0,0,0,0)'); g.addColorStop(0.36, 'rgba(0,0,0,0)'); g.addColorStop(0.40, 'rgba(255,250,235,1)'); g.addColorStop(0.50, 'rgba(255,190,90,0.95)');
    g.addColorStop(0.68, 'rgba(230,110,30,0.55)'); g.addColorStop(0.86, 'rgba(120,30,10,0.22)'); g.addColorStop(1.00, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.globalCompositeOperation = 'multiply';   // streaks: the disk is banded, not a smooth wash
    for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(0,0,0,' + (0.25 + Math.random() * 0.35) + ')'; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); x.arc(128, 128, 48 + Math.random() * 80, 0, TAU); x.stroke(); }
    _diskTex = new THREE.CanvasTexture(c); return _diskTex;
  }
  function makeBlackHole() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    const photon = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const dm = new THREE.MeshBasicMaterial({ map: diskTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const disk = new THREE.Mesh(new THREE.RingGeometry(0.44, 1.7, 64, 1), dm);
    disk.rotation.x = -Math.PI / 2 + 0.28;   // tilted, seen a little from above
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.44, 1.25, 64, 1), dm.clone()); halo.material.opacity = 0.75;   // the lensed disk, standing over the top
    const light = new THREE.PointLight(0xffb060, 60, 14, 2);
    g.add(core, photon, disk, halo, light);
    g.userData = { core, photon, disk, halo, light };
    return g;
  }
  function syncBlackHole(v, z, t) {
    const g = z.gag, tr = z.tx != null ? g.travel : 0, obj = v.obj, U = obj.userData;
    const flying = z.t < tr, open = flying ? 0 : Math.min(1, (z.t - tr) / 0.45), left = z.dur - z.t, closing = Math.max(0, Math.min(1, 1 - left / 0.35));
    const sz = (0.85 + open * 0.55) * (1 - closing);   // small and dark out of the gun, opening at the target, collapsing at the end
    obj.position.set(z.x * S, 1.2, z.y * S); obj.scale.setScalar(Math.max(0.01, sz));
    U.disk.visible = U.halo.visible = open > 0; U.disk.material.opacity = open; U.halo.material.opacity = open * 0.75;
    U.disk.rotation.z = t * 2.4;
    U.halo.lookAt(camera.position); U.halo.rotateZ(-t * 1.6);   // the halo always faces the eye, as the lensed disk would
    U.photon.lookAt(camera.position);
    U.light.intensity = flying ? 4 : 60 * open * (1 - closing);
    U.light.color.setHex(flying ? 0x6040a0 : 0xffb060);
  }
  // THE GRAVY WAVE (James 2026-09-11: 'thick and lumpy, not that fast, low to the ground, the colour of chicken gravy, a fan
  // out from the gun at thigh height and down, wisps of steam'): seventy lumps — three noise-bumped balls, glossy gravy
  // material — each with its own angle in the fan and its own share of the run, riding out behind the core's front,
  // taller at the leading edge, wobbling, sinking away at the end; pale steam wisps rise off the front.
  let lumpGeos = null;
  function lumpGeo() {
    if (lumpGeos) return lumpGeos[Math.floor(Math.random() * lumpGeos.length)];
    lumpGeos = [];
    for (let v = 0; v < 3; v++) {
      const g = new THREE.IcosahedronGeometry(1, 2), pos = g.attributes.position, n = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { n.set(pos.getX(i), pos.getY(i), pos.getZ(i)); const bump = 1 + 0.22 * Math.sin(n.x * 3.1 + v) * Math.cos(n.z * 2.7 + v * 2) + 0.14 * Math.sin(n.y * 4.3 + n.x * 2); n.multiplyScalar(bump); pos.setXYZ(i, n.x, n.y * 0.7, n.z); }
      g.computeVertexNormals(); lumpGeos.push(g);
    }
    return lumpGeos[0];
  }
  const GRAVY_MAT = new THREE.MeshPhongMaterial({ color: 0x9a6a28, specular: 0x6a5030, shininess: 55, emissive: 0x2a1a06, emissiveIntensity: 0.35 });
  function makeGravyWave(z) {
    const grp = new THREE.Group();
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(lumpGeo(), GRAVY_MAT);
      const r = 0.18 + Math.random() * 0.3;
      m.userData = { ang: (Math.random() - 0.5) * 2 * z.gag.spread * (0.75 + Math.random() * 0.25), share: 0.15 + Math.random() * 0.85, r, ph: Math.random() * TAU, lift: Math.random() };
      m.scale.setScalar(0.01); grp.add(m);
    }
    return grp;
  }
  function syncGravyWave(v, z, t) {
    const grp = v.obj, front = (z.front || 0) * S, ox = z.x * S, oz = z.y * S, k = Math.min(1, z.t / z.dur), fade = z.t > z.dur ? Math.max(0, 1 - (z.t - z.dur) / 0.8) : 1;
    for (const m of grp.children) {
      const d = m.userData, dist = Math.min(front, d.share * z.gag.range * S) * (0.85 + 0.15 * Math.sin(t * 2 + d.ph));
      const lead = front > 0.3 ? Math.max(0, 1 - Math.abs(front - dist) / 1.2) : 0;   // how close to the leading edge
      const h = d.r * 0.55 + lead * 0.45 * d.lift + Math.sin(t * 3.5 + d.ph) * 0.05;   // low; the front stands to thigh height
      m.position.set(ox + Math.cos(z.a + d.ang) * dist, h * fade - (1 - fade) * d.r, oz + Math.sin(z.a + d.ang) * dist);
      const s = d.r * Math.min(1, z.t * 5) * (1 + lead * 0.5);
      m.scale.set(s * 1.3, s * (0.8 + lead * 0.4) * fade, s * 1.3);
      m.rotation.y = d.ph + t * 0.3; m.rotation.x = Math.sin(t * 2 + d.ph) * 0.15;
    }
    if (fade > 0.2 && Math.random() < 0.5) { const m = grp.children[Math.floor(Math.random() * grp.children.length)]; steam(m.position.x, m.position.y + 0.15, m.position.z); }
  }
  function steam(x, y, z) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xe8dcc4, transparent: true, depthWrite: false, opacity: 0.22 }));
    spr.position.set(x, y, z); spr.scale.set(0.25, 0.25, 1); entGroup.add(spr);
    extras.push({ obj: spr, life: 1.3 + Math.random() * 0.8, t: 0, fade: true, grow: 0.9 + Math.random() * 0.5, rise: 0.45, vx: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3 });
  }
  // the tornado plate: grey dust streaks spiralling round a clear eye, on a canvas once
  let _vortexTex = null;
  function vortexTex() {
    if (_vortexTex) return _vortexTex;
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.22, 'rgba(255,255,255,0.15)'); g.addColorStop(0.5, 'rgba(255,255,255,0.75)'); g.addColorStop(0.9, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.globalCompositeOperation = 'destination-out';   // spiral streaks cut out of the disc
    for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(0,0,0,' + (0.35 + Math.random() * 0.45) + ')'; x.lineWidth = 2 + Math.random() * 5; x.beginPath(); const a0 = Math.random() * TAU; for (let s = 0; s <= 1; s += 0.05) { const r = 30 + s * 100, a = a0 + s * 2.2; const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r; if (s === 0) x.moveTo(px, py); else x.lineTo(px, py); } x.stroke(); }
    _vortexTex = new THREE.CanvasTexture(c); return _vortexTex;
  }
  // THE VINES (James 2026-09-10: "come up out of the ground… darker green… leaves and berries… thinner tips… coil up and
  // around… like constrictor snakes… 6–10 of them… colour variations"). A vine is a helix that tightens as it climbs, built
  // as four tube runs of shrinking radius, with leaf cards and berry clusters along it; a patch is 6–10 of them rising out
  // of the floor at the aim point, holding, then sinking back. The caught creature gets its own three coils (syncCoils).
  const VINE_GREENS = [0x1f5a24, 0x24672a, 0x2d5a1e, 0x1a4d2e, 0x33702c, 0x275f36];
  let _leafTex = null;
  function leafTex() {
    if (_leafTex) return _leafTex;
    const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#3d8a3a'; x.beginPath(); x.moveTo(2, 16); x.quadraticCurveTo(24, -6, 62, 16); x.quadraticCurveTo(24, 38, 2, 16); x.fill();
    x.strokeStyle = '#8fd07a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(4, 16); x.lineTo(58, 16); x.stroke();
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(8 + i * 8, 16); x.lineTo(14 + i * 8, 16 - 6); x.moveTo(8 + i * 8, 16); x.lineTo(14 + i * 8, 16 + 6); x.stroke(); }
    _leafTex = new THREE.CanvasTexture(c); return _leafTex;
  }
  const _leafMat = () => new THREE.MeshLambertMaterial({ map: leafTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: 0xffffff });
  // a vine's path by shape (James 2026-09-10, round two: "variety… doubling back… forking… don't use only corkscrews"):
  //   coil   — the helix that tightens as it climbs
  //   snake  — rises with a sideways wander that reverses now and then
  //   arch   — climbs, leans over and doubles back down a way, then up again
  //   wander — a random walk in the plane while it climbs, kinks and all
  function vinePath(o) {
    const pts = [], N = 44, sh = o.shape || 'coil';
    let x = 0, z = 0, dx = Math.cos(o.phase) * 0.5, dz = Math.sin(o.phase) * 0.5, h = 0, turnT = 0;
    for (let i = 0; i <= N; i++) {
      const k = i / N;
      if (sh === 'coil') { const a = o.phase + k * o.turns * TAU, r = o.r0 + (o.r1 - o.r0) * k; pts.push(new THREE.Vector3(Math.cos(a) * r, k * o.height, Math.sin(a) * r)); continue; }
      if (sh === 'snake') { const w = Math.sin(k * 5.2 + o.phase) * (o.r0 + 0.2) * (1 - k * 0.5); pts.push(new THREE.Vector3(Math.cos(o.phase) * w, k * o.height, Math.sin(o.phase) * w)); continue; }
      if (sh === 'arch') { const y = k < 0.55 ? k / 0.55 * 0.8 : k < 0.75 ? 0.8 - (k - 0.55) / 0.2 * 0.3 : 0.5 + (k - 0.75) / 0.25 * 0.5; const out = Math.sin(k * Math.PI) * (o.r0 + 0.45); pts.push(new THREE.Vector3(Math.cos(o.phase) * out, y * o.height, Math.sin(o.phase) * out)); continue; }
      // wander
      turnT -= 1; if (turnT <= 0) { const a = Math.random() * TAU; dx = Math.cos(a) * 0.35; dz = Math.sin(a) * 0.35; turnT = 4 + Math.floor(Math.random() * 6); }
      x += dx / N * 6; z += dz / N * 6; const lim = o.r0 + 0.35; const d = Math.hypot(x, z); if (d > lim) { x *= lim / d; z *= lim / d; }
      pts.push(new THREE.Vector3(x, k * o.height, z));
    }
    return pts;
  }
  function tubeAlong(g, pts, mat, r0, runs) {
    const N = pts.length - 1;
    for (let s = 0; s < runs; s++) {
      const sub = new THREE.CatmullRomCurve3(pts.slice(Math.floor(s * N / runs), Math.floor((s + 1) * N / runs) + 1));
      const rad = r0 * (1 - s / runs) + 0.014;   // thick at the root, a thin tip
      g.add(new THREE.Mesh(new THREE.TubeGeometry(sub, 12, rad, 6, false), mat));
    }
  }
  function makeVine(o) {
    const g = new THREE.Group();
    const pts = vinePath(o);
    const curve = new THREE.CatmullRomCurve3(pts);
    const mat = new THREE.MeshLambertMaterial({ color: o.color });
    tubeAlong(g, pts, mat, 0.11, 4);
    const lm = _leafMat(); lm.color.setHex(o.color).lerp(new THREE.Color(0x9ad07a), 0.35);
    const leafAlong = (cv, n, size) => { for (let i = 0; i < n; i++) {
      const k = 0.12 + Math.random() * 0.85, p = cv.getPointAt(k), tan = cv.getTangentAt(k);
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.5), lm);
      leaf.position.copy(p); leaf.lookAt(p.clone().add(tan)); leaf.rotateY(Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1)); leaf.rotateX((Math.random() - 0.5) * 1.2); leaf.translateX(size * 0.45);
      g.add(leaf);
    } };
    leafAlong(curve, o.leaves, 0.42 + Math.random() * 0.16);
    // the forks: one to three branches off the side, each a shorter kinked run going out and up, thinner, with its own leaves
    const forks = o.forks != null ? o.forks : 1 + Math.floor(Math.random() * 3);
    for (let f = 0; f < forks; f++) {
      const k = 0.25 + Math.random() * 0.55, from = curve.getPointAt(k), a = Math.random() * TAU, len = 0.5 + Math.random() * 0.9;
      const bp = []; for (let i = 0; i <= 8; i++) { const u = i / 8; bp.push(new THREE.Vector3(from.x + Math.cos(a) * len * u + Math.sin(u * 7) * 0.08, from.y + u * len * (0.5 + Math.random() * 0.4) - u * u * 0.15, from.z + Math.sin(a) * len * u + Math.cos(u * 6) * 0.08)); }
      tubeAlong(g, bp, mat, 0.05, 2);
      leafAlong(new THREE.CatmullRomCurve3(bp), 4 + Math.floor(Math.random() * 4), 0.34);
    }
    if (o.berries) {
      const bm = new THREE.MeshLambertMaterial({ color: Math.random() < 0.5 ? 0xb01830 : 0x4a1a6a, emissive: 0x200008 });
      for (let i = 0; i < o.berries; i++) {
        const k = 0.2 + Math.random() * 0.75, p = curve.getPointAt(k);
        for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), bm); b.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.09)); g.add(b); }
      }
    }
    g.userData.curve = curve;
    return g;
  }
  const vinePatches = [];
  function spawnVinePatch(x, z, r) {
    const n = 7 + Math.floor(Math.random() * 4), root = new THREE.Group(); root.position.set(x, 0, z);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.6, d = 0.2 + Math.random() * r * 0.75;
      const v = makeVine({ shape: ['coil', 'snake', 'arch', 'wander'][i % 4], height: 2.2 + Math.random() * 1.1, turns: 2.4 + Math.random() * 2.4, r0: 0.34 + Math.random() * 0.24, r1: 0.05, color: VINE_GREENS[Math.floor(Math.random() * VINE_GREENS.length)], leaves: 16 + Math.floor(Math.random() * 10), berries: Math.random() < 0.6 ? 2 + Math.floor(Math.random() * 3) : 0, phase: Math.random() * TAU });
      v.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); v.scale.set(1, 0.01, 1); v.userData.delay = Math.random() * 0.6; v.userData.sway = Math.random() * TAU;
      root.add(v);
    }
    entGroup.add(root); vinePatches.push({ root, t: 0 });
  }
  function stepVinePatches(dt) {
    for (const p of vinePatches) {
      p.t += dt;
      for (const v of p.root.children) {
        const u = Math.max(0, p.t - v.userData.delay), w = v.userData.sway;
        let sy = u < 0.35 ? 1 - Math.pow(1 - u / 0.35, 3) : u < 6.0 ? 1 : Math.max(0.01, 1 - (u - 6.0) / 1.0);   // POP up fast, hold, sink (James 2026-09-11: 'pop up quickly and then move around')
        // the writhe: each vine swells and shrinks on its own beat, tall then squat, turning back and forth and leaning — never still
        const live = Math.min(1, u / 0.35) * (u < 6.0 ? 1 : Math.max(0, 1 - (u - 6.0)));
        const swell = 1 + live * (Math.sin(u * 2.3 + w) * 0.22 + Math.sin(u * 5.1 + w * 1.7) * 0.1);
        const tall = 1 + live * (Math.sin(u * 1.7 + w * 2.3) * 0.18 + Math.sin(u * 4.3 + w) * 0.07);
        v.scale.set(Math.min(1.6, sy * 1.5) * swell, Math.max(0.01, sy * tall), Math.min(1.6, sy * 1.5) * swell);
        v.rotation.y = Math.sin(u * 1.9 + w) * 0.9 + Math.sin(u * 4.7 + w * 3) * 0.25;
        v.rotation.z = live * (Math.sin(u * 2.9 + w) * 0.16 + Math.sin(u * 6.1 + w * 2) * 0.05);
        v.rotation.x = live * (Math.cos(u * 2.4 + w * 1.3) * 0.14);
      }
      if (p.t > 7.4) { entGroup.remove(p.root); p.dead = true; }
    }
    for (let i = vinePatches.length - 1; i >= 0; i--) if (vinePatches[i].dead) vinePatches.splice(i, 1);
  }
  // the caught creature: three coils climb it, tighten, then it is pulled down and crushed
  function syncCoils(view, g, hgt, u) {
    if (!view.coils) {
      view.coils = [];
      for (let i = 0; i < 3; i++) { const c = makeVine({ shape: 'coil', forks: 0, height: hgt * 0.95, turns: 2 + i * 0.7, r0: g.def.size * 0.5 + 0.12, r1: g.def.size * 0.5 + 0.05, color: VINE_GREENS[(i * 2) % VINE_GREENS.length], leaves: 8, berries: i === 1 ? 2 : 0, phase: i * 2.1 }); c.scale.set(1, 0.01, 1); entGroup.add(c); view.coils.push(c); }
    }
    const climb = Math.min(1, u * 2.4), pull = Math.max(0, (u - 0.45) / 0.55);
    for (const [i, c] of view.coils.entries()) { const sw = 1 + Math.sin(g.dieT * 4.5 + i * 2.1) * 0.08; c.position.set(g.x * S, -pull * hgt * 0.55, g.y * S); c.scale.set((1 - pull * 0.35) * sw, Math.max(0.01, climb * (1 - pull * 0.55)), (1 - pull * 0.35) * sw); c.rotation.y = u * (1.5 + i * 0.4) + Math.sin(g.dieT * 3.1 + i) * 0.3; }   // the coils writhe too (2026-09-11)
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
        if (z.gag.id === 'vines' && z.mode === 'flash') spawnVinePatch(z.x * S, z.y * S, z.r * S);   // the real vines rise here; the flash sprite is invisible (it has a scar)
        if (z.gag.id === 'blackhole') { spr = makeBlackHole(); v = { obj: spr, light: null, prop: true, hole: true }; entGroup.add(spr); zoneViews.set(z.id, v); syncBlackHole(v, z, t); continue; }
        if (z.mode === 'wave') { spr = makeGravyWave(z); v = { obj: spr, light: null, prop: true, hole: true, wave: true }; entGroup.add(spr); zoneViews.set(z.id, v); syncGravyWave(v, z, t); continue; }   // the gravy (2026-09-11); hole: true = torn down whole, never rested as a prop
        if (src) { spr = src.clone(); spr.userData.prop = z.sprite; spr.userData.halfH = src.userData.halfH; spr.rotation.y = Math.random() * TAU; }
        else spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: gagSprite(z.sprite, 0), transparent: true, depthWrite: false }));
        v = { obj: spr, light: null, prop: !!src };
        if (z.mode === 'pull') { v.light = new THREE.PointLight(0xb070ff, 30, 12, 2); spr.add(v.light); }
        entGroup.add(spr); zoneViews.set(z.id, v);
      }
      if (v.wave) { syncGravyWave(v, z, t); continue; }
      if (v.hole) { syncBlackHole(v, z, t); continue; }
      const spr = v.obj;
      if (!v.prop) spr.material.map = gagSprite(z.sprite, z.t);
      if (z.mode === 'drop') {
        const u = z.done ? 1 : Math.min(1, z.t / z.dur); const sz = (z.gag.id === 'tent' ? 2.4 : 1.0) * S;
        if (z.gag.id === 'legos') {   // the avalanche: ~190 bricks let go across the fall time, from the ceiling of that cell
          const ceil = (levelRef && levelRef.tall && levelRef.tall[Math.floor(z.y) * levelRef.w + Math.floor(z.x)]) ? H_TALL : H_LOW;
          const want = z.done ? 190 : Math.floor(Math.min(1, z.t / z.dur) * 190), had = v.poured || 0;
          if (want > had) { brickRain(z.x * S, z.y * S, (z.r || 1.3) * S * 0.8, want - had, ceil - 0.2); v.poured = want; }
          if (!v.prop) spr.material.opacity = 0;
        }
        if (v.prop) { const late = models.pieces[z.sprite] ? 0 : 0.15, uv = Math.min(1, z.t / ((z.gag.fallT || z.dur) + late)); const ceilH = (levelRef && levelRef.tall && levelRef.tall[Math.floor(z.y) * levelRef.w + Math.floor(z.x)]) ? H_TALL : H_LOW; spr.position.set(z.x * S, (1 - uv * uv) * (ceilH + spr.userData.halfH) + spr.userData.halfH, z.y * S); if (uv < 1) spr.rotation.x = (1 - uv) * 0.6; else spr.rotation.x = 0; }   // out of the ceiling, speeding up as it falls — gravity (James 2026-09-11, 'it should speed up as it's falling')   // the prop touches down 0.15 s after the kill: the creature is crushed under it as it lands (James 2026-09-11)
        else if (z.gag.id !== 'legos') { spr.scale.set(sz, sz, 1); spr.position.set(z.x * S, (1 - u) * 6 + sz * 0.4, z.y * S); spr.material.opacity = z.done ? Math.max(0, 1 - (z.t - z.dur + 0.5) * 2) : 1; }
        if (!v.shadow) { v.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); v.shadow.rotation.x = -Math.PI / 2; v.shadow.position.set(z.x * S, 0.02, z.y * S); entGroup.add(v.shadow); }
        const sr = (z.r || 0.8) * S * (0.2 + 0.8 * u); v.shadow.scale.set(sr, sr, 1); v.shadow.material.opacity = z.done ? 0 : 0.55;
        if (z.done && !v.landed) { v.landed = true; impactFx(z.x * S, z.y * S, z.r || 0.8); const P = models.pieces[z.sprite];
          if (v.prop && PROPS[z.sprite].legs) { spr.userData.animated = true; extras.push({ obj: spr, t: 0, tick: legsTick }); }   // the cow: on its feet, kicks, then flops on its side (James 2026-09-11)
          if (v.prop && P && P.body) {   // THE CRASH (James 2026-09-10): the front legs snap off and fly, the lid flies off, the body drops and tips on a diagonal
            const body = P.body.clone(); body.position.copy(spr.position); body.rotation.copy(spr.rotation); body.userData.halfH = spr.userData.halfH; body.userData.keepPose = true; body.userData.prop = z.sprite;
            if (P['legs-back']) body.add(P['legs-back'].clone());
            entGroup.add(body); spr.visible = false; entGroup.remove(spr); v.obj = body; v.crash = { t0: z.t, y0: body.position.y };
            const fwd = new THREE.Vector3(0, 0, 1).applyEuler(body.rotation);
            const fly = (piece, vel, av) => { if (!P[piece]) return; const m = P[piece].clone(); m.position.copy(body.position); m.rotation.copy(body.rotation); entGroup.add(m); gibs.push({ mesh: m, v: vel, av, settled: false, bounces: 0 }); };
            fly('legs-front', fwd.clone().multiplyScalar(4).add(new THREE.Vector3(0, 3.5, 0)), new THREE.Vector3(4, 2, 5));
            fly('lid', fwd.clone().multiplyScalar(-2).add(new THREE.Vector3((Math.random() - 0.5) * 3, 7, 0)), new THREE.Vector3(2, 5, 3));
            for (let i = 0; i < 7; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.12), new THREE.MeshLambertMaterial({ color: 0x0a0a0c })); sp.position.copy(body.position); entGroup.add(sp); const a = Math.random() * TAU; gibs.push({ mesh: sp, v: new THREE.Vector3(Math.cos(a) * (2 + Math.random() * 4), 3 + Math.random() * 4, Math.sin(a) * (2 + Math.random() * 4)), av: new THREE.Vector3(8, 8, 8), settled: false, bounces: 0 }); }   // splinters
            puff(z.x * S, 0.4, z.y * S, 0x3a3238, 2.4);
          }
        }
        if (v.crash) { const k = Math.min(1, (z.t - v.crash.t0) / 0.45), e = 1 - (1 - k) * (1 - k); v.obj.rotation.x = e * 0.55; v.obj.rotation.z = e * 0.18; v.obj.position.y = v.crash.y0 - e * v.obj.userData.halfH * 0.36; }   // tips toward the broken legs, drops onto them
      }
      else if (z.mode === 'pull') { const sz = 1.5 * S; spr.scale.set(sz, sz, 1); spr.position.set(z.x * S, 1.2, z.y * S); }
      else if (z.mode === 'wander') {
        spr.material.opacity = 0;   // the 2D funnel is not drawn: the plates are the tornado (James 2026-09-10, round two)
        // THE VORTEX (James 2026-09-10): a classic stack of plates — tiny at the floor, each one wider than the last, wide at the
        // ceiling — every plate a streaked disc turning at its own rate (fast low, slower high) and roiling off the axis
        if (!v.cone) { v.cone = new THREE.Group(); const N = 24, ceil = (levelRef && levelRef.tall && levelRef.tall[Math.floor(z.y) * levelRef.w + Math.floor(z.x)]) ? H_TALL : H_LOW, top = ceil + 0.35, R = z.r * S * 0.8; for (let i = 0; i < N; i++) { const k = i / (N - 1), rr = 0.1 + Math.pow(k, 1.2) * (R - 0.1); const plate = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CircleGeometry(rr, 40), new THREE.MeshBasicMaterial({ map: vortexTex(), color: 0xc8c0b6, transparent: true, opacity: 0.62 - k * 0.22, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; plate.add(disc); for (const [m, o] of [[1.05, 0.09], [1.3, 0.04]]) { const cake = new THREE.Mesh(new THREE.SphereGeometry(rr * m, 24, 12), new THREE.MeshBasicMaterial({ color: 0xb8b2aa, transparent: true, opacity: o, depthWrite: false })); cake.scale.y = 0.2 + 0.1 * (m - 1); plate.add(cake); }   /* the pancake volume: James 2026-09-10, 'they have no volume… 10–15% opacity… a pretty significant blur' */ plate.position.y = 0.04 + k * top; plate.userData.i = i; plate.userData.k = k; plate.userData.disc = disc; v.cone.add(plate); } entGroup.add(v.cone); }
        v.cone.position.set(z.x * S, 0, z.y * S);
        for (const plate of v.cone.children) { const i = plate.userData.i, k = plate.userData.k, A = 0.06 + 0.5 * k; plate.userData.disc.rotation.z = -t * (13 - k * 8) + i * 0.4; plate.position.x = Math.sin(t * 1.9 + k * 5.5) * A; plate.position.z = Math.cos(t * 1.6 + k * 5.5) * A; plate.rotation.z = Math.cos(t * 1.9 + k * 5.5) * 0.12 * k; plate.rotation.x = -Math.sin(t * 1.6 + k * 5.5) * 0.12 * k; }   // one snake: a wave travelling up the stack, the plates leaning into it
      }
      else if (z.mode === 'flash' && v.prop) { spr.position.set(z.x * S, spr.userData.halfH, z.y * S); }
      else if (z.mode === 'flash') { const sz = 1.3 * S; spr.scale.set(sz, sz, 1); spr.position.set(z.x * S, sz * 0.4, z.y * S); spr.material.opacity = z.gag.scar ? 0 : Math.max(0, 1 - z.t / z.dur); }
    }
    for (const [id, v] of zoneViews) if (!seen.has(id)) { if (v.obj.userData.animated) { /* already resting in extras with its own animation */ } else if (v.prop && !v.hole && PROPS[v.obj.userData.prop].stays) { v.obj.rotation.x = 0; extras.push({ obj: v.obj }); } else entGroup.remove(v.obj); if (v.shadow) entGroup.remove(v.shadow); if (v.cone) entGroup.remove(v.cone); if (v.cloud) entGroup.remove(v.cloud); zoneViews.delete(id); }
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
        if (s.type === 'gas') { m = makeGasVolume(); m.userData.gas = true; }
        else if (BILLBOARD_SCARS.has(s.type)) {
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
          if (s.type === 'lava' && ![...scarViews.values()].some((v) => v.userData.lit)) { const l = new THREE.PointLight(0xff5a1a, 25, 8, 2); l.position.y = 0.4; m.add(l); m.userData.lit = true; }   // one lit pool at a time: a changing light count recompiles every shader (2026-09-10)
        }
        entGroup.add(m); scarViews.set(s.id, m);
      }
      if (m.userData.gas) { updateGasVolume(m, s, t); continue; }
      if (s.life !== Infinity) m.material.opacity = Math.min(BILLBOARD_SCARS.has(s.type) ? 0.8 : 1, (s.life - s.t) / 2);
      if (BILLBOARD_SCARS.has(s.type)) { m.material.rotation = Math.sin(t * 0.7 + s.id) * 0.2; }
    }
    for (const [id, m] of scarViews) if (!seen.has(id)) { entGroup.remove(m); scarViews.delete(id); }
  }
  // THE BOLT (James 2026-09-10: "bifurcations… crooked and scraggly, squiggly… a bright white core with a bright golden
  // yellow aura"): a jagged path from a to c with perpendicular jitter, two to four branches off it, every segment a thin
  // white cylinder inside a fat additive gold one; three jitters built at once and cycled every 45 ms for the flicker.
  const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _bup = new THREE.Vector3(0, 1, 0);
  function boltPath(a, c, jitter, n) {
    const pts = [a.clone()]; _bz.subVectors(c, a); const len = _bz.length(); if (len < 0.02) return [a.clone(), c.clone()]; _bz.normalize(); _bx.crossVectors(_bz, _bup); if (_bx.lengthSq() < 1e-6) _bx.set(1, 0, 0); _bx.normalize(); _by.crossVectors(_bx, _bz).normalize();   // a zero or vertical run has no sideways: guard the NaN
    for (let i = 1; i < n; i++) { const k = i / n, w = Math.sin(k * Math.PI) * jitter * len; pts.push(a.clone().addScaledVector(_bz, k * len).addScaledVector(_bx, (Math.random() - 0.5) * 2 * w).addScaledVector(_by, (Math.random() - 0.5) * 1.2 * w)); }
    pts.push(c.clone()); return pts;
  }
  function boltSegments(group, pts, coreR, auraR, coreMat, auraMat) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], l = p.distanceTo(q); if (l < 0.01) continue;
      for (const [r, mat] of [[coreR, coreMat], [auraR, auraMat]]) { const g = new THREE.CylinderGeometry(r, r, l, 5, 1, true); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.copy(p).lerp(q, 0.5); m.lookAt(q); group.add(m); }
    }
  }
  function boltVariant(a, c, coreMat, auraMat) {
    const g = new THREE.Group(); const main = boltPath(a, c, 0.09, 14); boltSegments(g, main, 0.028, 0.13, coreMat, auraMat);
    const nb = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < nb; b++) {   // the bifurcations: off a point along the bolt, a shorter scraggly fork, thinner
      const i = 2 + Math.floor(Math.random() * (main.length - 5)), from = main[i], dir = main[i + 1].clone().sub(main[i - 1]).normalize();
      const side = new THREE.Vector3().crossVectors(dir, _bup).normalize().multiplyScalar(Math.random() < 0.5 ? 1 : -1);
      const end = from.clone().addScaledVector(dir, 0.6 + Math.random() * 1.6).addScaledVector(side, 0.5 + Math.random() * 1.1).add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.8, 0));
      boltSegments(g, boltPath(from, end, 0.14, 6), 0.016, 0.08, coreMat, auraMat);
    }
    return g;
  }
  function makeBolt(a, c) {
    const core = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    const aura = new THREE.MeshBasicMaterial({ color: 0xffc22a, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Group(); g.userData.variants = [];
    for (let v = 0; v < 3; v++) { const gv = boltVariant(a, c, core, aura); gv.visible = v === 0; g.add(gv); g.userData.variants.push(gv); }
    g.userData.core = core; g.userData.aura = aura; g.userData.isBolt = true;
    return g;
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
        if (b.gag.id === 'lightning') {   // the bolt, and the chain links as bolts too
          m = makeBolt(a, c); m.userData.t0 = performance.now();
          if (b.chain) { let from = c; for (const q of b.chain) { const c2 = new THREE.Vector3(q.x * S, 1.1, q.y * S); if (c2.distanceTo(from) < 0.05) continue; const link = makeBolt(from, c2); m.add(link); m.userData.variants.push(...link.userData.variants.map((v, i) => { v.userData.slot = i; return v; })); from = c2; } }
          const l = new THREE.PointLight(0xffd070, 60, 12, 2); l.position.copy(c); l.position.y += 0.3; m.add(l); m.userData.light = l;
          entGroup.add(m); beamViews.set(id, m); continue;
        }
        const geo = new THREE.CylinderGeometry(b.gag.id === 'curse' ? 0.08 : 0.025, b.gag.id === 'curse' ? 0.08 : 0.025, len, 6, 1, true);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: b.gag.id === 'curse' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
        m = new THREE.Mesh(geo, mat);
        m.position.copy(a).lerp(c, 0.5); m.lookAt(c);
        if (b.gag.id === 'lightning' && b.chain) for (const q of b.chain) { const c2 = new THREE.Vector3(q.x * S, 1.1, q.y * S); const l2 = c.distanceTo(c2); const g2 = new THREE.CylinderGeometry(0.02, 0.02, l2, 5, 1, true); g2.rotateX(Math.PI / 2); const m2 = new THREE.Mesh(g2, mat); m2.position.copy(c).lerp(c2, 0.5); m2.lookAt(c2); m2.position.sub(m.position); m2.quaternion.premultiply(m.quaternion.clone().invert()); m.add(m2); }
        if (b.gag.id !== 'curse') { const l = new THREE.PointLight(color, 40, 10, 2); l.position.set(0, 0, len / 2 - 0.3); m.add(l); }
        entGroup.add(m); beamViews.set(id, m);
      }
      if (m.userData.isBolt) {   // flicker between the three jitters; fade the core and the aura together
        const slot = Math.floor(performance.now() / 45) % 3, fade = Math.min(1, (1 - b.t / b.life) * 1.5);
        m.traverse((o) => { if (o.userData && o.userData.variants) o.userData.variants.forEach((v, i) => { v.visible = (i % 3) === slot; }); });
        m.userData.core.opacity = fade; m.userData.aura.opacity = 0.42 * fade; if (m.userData.light) m.userData.light.intensity = 60 * fade * (0.7 + 0.3 * Math.random());
        continue;
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
  let vmWindow = null, vmMuzzle = null, vmFlash = null, vmTip = null;
  const vm = { recoil: 0, spin: 0, mood: 'idle', dead: 0, bob: 0, t: 0, muzzle: 0, aim: 0, aimY: 0 };   // aim / aimY: cursor-aim yaw + pitch the rifle swings to (radians, eased by the host)
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
    // the actual end of the barrel (the rifle is fitTo 0.7 about its centre): beams and the flame stream are born here — the flash sits 0.4 beyond it and swung wide with the aim (James's screenshot)
    vmTip = new THREE.Object3D(); vmTip.position.set(0, 0.02, -0.36); vmRoot.add(vmTip);
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
  const _muzzleWorld = new THREE.Vector3(), _mzTmp = new THREE.Vector3();
  function updateViewmodel(dt, p) {
    vm.t += dt;
    vm.recoil = Math.max(0, vm.recoil - dt * 4.5);
    vm.muzzle = Math.max(0, vm.muzzle - dt * 8);
    const shud = vm.mood === 'shudder' ? (Math.random() - 0.5) * 0.012 : 0;
    const bobY = Math.abs(Math.sin(vm.bob * TAU)) * look.bob * 0.02, bobX = Math.sin(vm.bob * TAU) * look.bob * 0.015;
    vmRoot.position.set(look.vmX + bobX + shud, look.vmY + bobY + shud - vm.dead * 0.25 + vm.recoil * 0.04, look.vmZ + vm.recoil * 0.12);
    vmRoot.rotation.set(-vm.recoil * 0.22 + vm.dead * 0.35 + vm.aimY, 0.06 - vm.aim, vm.dead * 0.3);
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
      torchLights.forEach((l, i) => { const n = near[i]; if (!n) { l.intensity = 0; return; } l.position.set(n.t.x, n.t.y + 0.3, n.t.z); l.intensity = (14 + Math.sin(shakeT * 11 + i * 2) * 3 + Math.sin(shakeT * 23 + i) * 2) * look.torchLight; if (n.t.color) l.color.copy(n.t.color); else l.color.setHex(THEMES[levelRef ? levelRef.theme : 0].torch); });
      const f = Math.floor(shakeT * 9);
      for (let i = 0; i < torches.length; i++) { const t = torches[i]; if (t.sprite) { t.sprite.material.map = flameTex((f + i) % 4); t.sprite.scale.set(0.5 + Math.sin(shakeT * 13 + i) * 0.05, 0.75 + Math.sin(shakeT * 17 + i * 3) * 0.08, 1); } }
    }
    // the door
    if (doorMesh) { const want = state.doorOpen ? 1 : 0; doorOpenAnim += (want - doorOpenAnim) * Math.min(1, dt * 2.5); doorMesh.position.y = doorMesh.userData.baseY + doorOpenAnim * H_LOW * 0.95; }
    if (doorSign && doorSign.userData.open !== !!state.doorOpen) { doorSign.userData.open = !!state.doorOpen; doorSign.material.map = exitSignTex(!!state.doorOpen); doorSign.userData.glow.material.map = guideTex(levelRef.theme, 'lamp', 'door', false, state.doorOpen ? 0x58ff7a : 0xff3050); }
    if (doorSign) doorSign.userData.glow.material.opacity = 0.45 + Math.sin(view.t * (state.doorOpen ? 2 : 5)) * 0.12;
    if (healViews.length) { const m = canvasTex('heal|' + (Math.floor(view.t * 8) % 16), D().healSprite(view.t)); for (const v of healViews) { v.spr.visible = !v.h.taken; v.spr.material.map = m; v.spr.position.y = 0.55 + Math.sin(view.t * 2.5 + v.h.x) * 0.06; } }
    syncGuide(state, dt); syncArmor(state, view.t);
    if (keyView) { keyView.material.map = canvasTex('key|' + (Math.floor(view.t * 8) % 16), D().keySprite(view.t)); keyView.position.y = 1.1 + Math.sin(view.t * 3) * 0.12; keyLight.position.copy(keyView.position); keyLight.intensity = state.key && state.key.held ? 0 : 6 + Math.sin(view.t * 5) * 2; if (state.key && state.key.held) keyView.visible = false; }
    // creatures
    const seen = new Set();
    for (const g of state.goons) {
      seen.add(g.id);
      let v = goonViews.get(g.id);
      if (!v) { v = makeGoonView(g); goonViews.set(g.id, v); }
      syncGoon(g, v, dt, state);
    }
    for (const [id, v] of goonViews) if (!seen.has(id)) { entGroup.remove(v.root); if (v.blob) entGroup.remove(v.blob); if (v.school) for (const f of v.school) entGroup.remove(f); if (v.coils) for (const c of v.coils) entGroup.remove(c); if (v.block) entGroup.remove(v.block); goonViews.delete(id); }
    syncShots(state, view.t);
    syncZones(state, view.t);
    syncScars(state, view.t);
    // muzzle in world space for beams
    // the barrel tip, exactly where it is on screen: the viewmodel's muzzle flash projected through the viewmodel camera,
    // then unprojected through the world camera 0.9 m out (James: the beam and the flames come from the tip of the gun)
    if (vmTip) {
      camera.updateMatrixWorld(); vmCamera.updateMatrixWorld();
      vmTip.getWorldPosition(_mzTmp).project(vmCamera);
      _mzTmp.z = 0.5; _mzTmp.unproject(camera).sub(camera.position).normalize();
      _muzzleWorld.copy(camera.position).addScaledVector(_mzTmp, 0.9);
    } else {
      const th = state.player.a + (state.player.aim || 0);
      _muzzleWorld.set(camera.position.x + Math.cos(th) * 0.9 - Math.sin(th) * 0.25, camera.position.y - 0.32 + vm.aimY * 0.6, camera.position.z + Math.sin(th) * 0.9 + Math.cos(th) * 0.25);
    }
    syncBeams(state, _muzzleWorld);
    stepBodies(gibs, dt); stepBodies(shards, dt); stepBodies(bricks, dt);
    blood.step(dt); embers.step(dt); lavaBits.step(dt); stepVinePatches(dt); stepGusts(dt);
    for (let i = extras.length - 1; i >= 0; i--) {
      const e = extras[i];
      if (e.tick) { if (e.tick(e, dt) === false) { if (e.gone) extras.splice(i, 1); else e.tick = null; } continue; }   // an animated resting prop (the cow's kick and flop)
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

  return { setSkipRender(v) { skipRender = !!v; }, gorePick, GORE, get debugEnt() { return entGroup; }, get debugMuzzle() { return { muzzle: _muzzleWorld.clone(), camera, vmCamera, vmFlash, vmTip, vmRoot }; }, clipDone(id) { const v = goonViews.get(id); if (!v || !v.current) return true; const a = v.current; return a.loop !== THREE.LoopOnce || a.paused || !a.isRunning(); }, debugGoon(id) { const v = goonViews.get(id); if (!v) return null; const r = v.root; let meshes = 0, vis = 0; r.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { meshes++; if (o.visible) vis++; } }); return { pos: r.position.toArray(), scale: r.scale.toArray(), visible: r.visible, modelVisible: v.model && v.model.visible, hidden: v.hidden, meshes, vis, inScene: !!r.parent, started: v.started }; }, boom(x, y, r, gagId) { if (BOOM_GAGS.has(gagId)) boomFx(x * S, 0.5, y * S, r || 1); else { impactFx(x * S, y * S, (r || 1) * 0.7); puff(x * S, 0.5, y * S, SPLASH_COLOR[gagId] || 0x9a8a7a, (r || 1) * 1.6); if (gagId === 'pie') berries(x * S, 0.5, y * S, 36); if (gagId === 'jello') jelloPile(x * S, 0.5, y * S); } }, strike(x, y) { blood.burst(x * S, 0.9, y * S, 12, 1.6); mist(x * S, 0.9, y * S, 0.7); }, impact(x, y, r) { impactFx(x * S, y * S, r || 0.8); },
    load, buildLevel, update, resize, setLook, shake, look, vm, scene, camera, renderer, vmRoot, models, goonViews,
    themes: THEMES,   // the corner map paints each wing in its district's light colour (2026-09-12)
    fire() { vm.recoil = 1; vm.muzzle = 1; vm.spin = 0; vm.mood = 'idle'; },
    get ready() { return assetsReady; }, get failed() { return assetsFailed; },
    gibBurst, blood, S,
  };
}
