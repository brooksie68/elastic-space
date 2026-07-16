// ============================================================
//  ARACHNO-WARS 2000  –  v2
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// --- Viewport ---
const W = 1280, H = 720;
canvas.width  = W;
canvas.height = H;

// --- Background: parallax biome arenas (sky / far / mid painted plates) ---
// One biome is picked at random per match. Each entry also carries the palette
// the procedural terrain, rocks, and flora are rendered with, so the diggable
// ground matches its painted backdrop. Layer PNGs live in assets/worlds/<key>/
// (GPT-generated, chroma-keyed by tmp/arachno-wars-2000/chroma-key.py).
const BIOMES = {
  twillight: {
    label: 'TWILIGHT CANYON',
    fallback: '#050112',
    grad: ['#a86336','#8a4f28','#6b3a1c','#4a2712','#2e180a'],
    strata: ['rgba(196,117,46,0.30)','rgba(84,36,16,0.45)','rgba(156,82,40,0.28)',
             'rgba(66,26,10,0.50)','rgba(122,59,30,0.32)','rgba(50,20,8,0.45)'],
    noiseLite: '196,117,46', noiseDark: '46,20,8',
    edge: '#2e1608', rim: 'rgba(216,133,59,0.7)',
    pebbleA: 'rgba(58,26,10,0.7)', pebbleB: 'rgba(140,74,34,0.55)',
    rockBase: ['#5a3018','#4a2712','#6b3a1e'], rockLite: ['#a06030','#8a5228','#b06a38'],
    flora: ['juniper','juniper','ocotillo','agave','scrub','scrub','drygrass','drygrass','web','spire'],
  },
  snowy: {
    label: 'SNOWY PASS',
    fallback: '#9fb0c2',
    grad: ['#e6edf4','#c2cedc','#8494aa','#4e5c72','#242e3e'],
    strata: ['rgba(240,246,252,0.35)','rgba(56,70,92,0.45)','rgba(180,196,214,0.30)',
             'rgba(44,56,76,0.50)','rgba(130,148,170,0.30)','rgba(36,46,64,0.45)'],
    noiseLite: '238,246,254', noiseDark: '38,50,70',
    edge: '#26303f', rim: 'rgba(255,255,255,0.85)',
    pebbleA: 'rgba(44,56,76,0.6)', pebbleB: 'rgba(215,228,240,0.6)',
    rockBase: ['#48566a','#3c4a5c','#546478'], rockLite: ['#ccd8e6','#bcc8d8','#dce8f2'],
    flora: ['juniper','juniper','juniper','drygrass','drygrass','spire','web','scrub'],
  },
  volcanic: {
    label: 'VOLCANIC WASTES',
    fallback: '#241a16',
    grad: ['#57443c','#3e302b','#2a2020','#1a1213','#0c0708'],
    strata: ['rgba(120,96,86,0.30)','rgba(255,102,32,0.30)','rgba(90,72,64,0.28)',
             'rgba(16,10,8,0.55)','rgba(230,84,26,0.22)','rgba(12,8,6,0.50)'],
    noiseLite: '150,110,90', noiseDark: '6,3,3',
    edge: '#0c0707', rim: 'rgba(255,120,48,0.5)',
    pebbleA: 'rgba(255,110,40,0.45)', pebbleB: 'rgba(70,54,48,0.65)',
    rockBase: ['#282022','#201a1b','#322829'], rockLite: ['#8a4a34','#7a3f2c','#9a563c'],
    flora: ['ocotillo','ocotillo','spire','spire','drygrass','web','boulder'],
  },
  bog: {
    label: 'THE BOG',
    fallback: '#0d1a16',
    grad: ['#7a7c44','#5c6034','#434a28','#2c331e','#161c12'],
    strata: ['rgba(150,152,86,0.28)','rgba(30,40,26,0.50)','rgba(96,116,80,0.30)',
             'rgba(22,30,20,0.50)','rgba(70,90,88,0.28)','rgba(14,20,14,0.45)'],
    noiseLite: '160,164,92', noiseDark: '18,26,16',
    edge: '#141c12', rim: 'rgba(190,200,120,0.55)',
    pebbleA: 'rgba(24,32,20,0.7)', pebbleB: 'rgba(150,158,90,0.5)',
    rockBase: ['#3c4426','#333a20','#464e2c'], rockLite: ['#96a054','#86904a','#a6b060'],
    flora: ['web','web','web','scrub','scrub','agave','drygrass','juniper'],
  },
};
let biomeKey = 'twillight';
let biome = BIOMES[biomeKey];

// Legacy single-plate fallback (the original twilight painting)
const bgImage = new Image();
bgImage.src = 'bg.png';

// Per-biome layer images, created on first use so we don't fetch four
// biomes' plates just to show the menu.
const biomeImgCache = {};
function biomeImgs(key) {
  if (!biomeImgCache[key]) {
    const set = { sky: new Image(), far: new Image(), mid: new Image() };
    for (const l of ['sky', 'far', 'mid']) set[l].src = `assets/worlds/${key}/${l}.png`;
    biomeImgCache[key] = set;
  }
  return biomeImgCache[key];
}
biomeImgs(biomeKey);   // warm the default so the menu has art immediately

function pickBiome() {
  const keys = Object.keys(BIOMES);
  let k = keys[Math.floor(Math.random() * keys.length)];
  if (k === biomeKey && keys.length > 1) {
    // Never the same arena twice in a row
    const others = keys.filter(x => x !== biomeKey);
    k = others[Math.floor(Math.random() * others.length)];
  }
  biomeKey = k;
  biome = BIOMES[k];
  biomeImgs(k);
}

// --- Typography (system stack; James picks the final face) ---
const FONT_D = '"Bahnschrift SemiBold Condensed","Bahnschrift Condensed",Impact,"Arial Narrow",sans-serif';
const FONT_U = 'Bahnschrift,"Segoe UI",Arial,sans-serif';

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width  = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================
//  PALETTE  (twilight canyon)
// ============================================================
const PAL = {
  sky0:   '#0d0520', sky1:   '#2a0f45', sky2:   '#6b1a42', sky3:   '#c44020', sky4:   '#f07830',
  mtn0:   '#1a0d30', mtn1:   '#32185a', mtn2:   '#502878', mtn3:   '#7a3a9a',
  ground: '#7a3b1e', groundMid: '#9c5228', groundLight: '#c4752e',
  rock:   '#5c3d1a', rockLight: '#8c6040',
  pine:   '#1a4a1a', pineDark: '#0d2a0d',
  p1body: '#0f8070', p1accent: '#3fe0be', p1cockpit: '#5ff0d0', p1leg: '#10151c',
  p2body: '#a05a10', p2accent: '#ffb028', p2cockpit: '#ffd060', p2leg: '#171310',
  barrel: '#505050', barrelLight: '#b0b0b0',
  hud:    'rgba(0,0,0,0.85)', hudBorder: '#ffcc00',
  white:  '#ffffff', yellow: '#ffff00', red: '#ff2222', green: '#22ff44',
  orange: '#ff8800', cyan: '#00ffff',
  explosion0: '#fff8c0', explosion1: '#ffcc00', explosion2: '#ff6600', explosion3: '#cc2200',
};

// ============================================================
//  AUDIO  —  ElevenLabs-generated assets played via media elements
// ============================================================
// Elastic Space shared sound control gates all game audio through this state.
// Standalone (no sound-control.js) the game keeps sound on by default.
// musicVolume rides on the second slider of the shared control.
// (Music: James's "Angular Ritual", replacing the 07-13 chiptune he vetoed.)
const esSound = { on: !window.ElasticSoundControl, volume: 1, musicVolume: 0.5 };

// All sounds are ElevenLabs-generated assets (authoring-time pipeline);
// media elements so everything still works from file://.
const AUDIO_DIR = 'assets/audio/';
const SFX_FILES = {
  shotShell:     'shot-shell.mp3',
  shotBomblets:  'shot-bomblets.mp3',
  shotRocket:    'shot-rocket.mp3',
  shotBeam:      'shot-beam.mp3',
  shotEggSac:    'shot-eggsac.mp3',
  shotSilk:      'shot-silk.mp3',
  explosionBig:  'explosion-big.mp3',
  explosionSmall:'explosion-small.mp3',
  bombletSplit:  'bomblet-split.mp3',
  eggBounce:     'egg-bounce.mp3',
  hatch:         'hatch.mp3',
  spiderlingPop: 'spiderling-pop.mp3',
  silkBuild:     'silk-build.mp3',
  beamBurn:      'beam-burn.mp3',
  tankHit:       'tank-hit.mp3',
  jump:          'jump.mp3',
  select:        'select.mp3',
  coinflip:      'coinflip.mp3',
  eject:         'eject.mp3',
  targetHit:     'target-hit.mp3',
  victory:       'victory.mp3',
};

// One preloaded base element per sound; play() clones so shots overlap freely.
const sfxBase = {};
for (const [name, file] of Object.entries(SFX_FILES)) {
  const el = new Audio(AUDIO_DIR + file);
  el.preload = 'auto';
  sfxBase[name] = el;
}

function playSfx(name, vol = 1) {
  if (!esSound.on) return;
  const base = sfxBase[name];
  if (!base) return;
  try {
    const a = base.cloneNode();
    a.volume = Math.min(1, Math.max(0, vol * esSound.volume));
    a.play().catch(() => {});
  } catch (e) {}
}

// The falling-shell whistle needs a stop switch, so it gets its own element.
const whistleEl = new Audio(AUDIO_DIR + 'shell-whistle.mp3');
whistleEl.preload = 'auto';
function startWhistle() {
  if (!esSound.on) return;
  try {
    whistleEl.currentTime = 0;
    whistleEl.volume = Math.min(1, 0.4 * esSound.volume);
    whistleEl.play().catch(() => {});
  } catch (e) {}
}
function stopWhistle() { try { whistleEl.pause(); } catch (e) {} }

// Looping battle music — James's "Angular Ritual" — on its own volume channel
// so players can duck the music and still hear the tanks.
const musicEl = new Audio('assets/music/Angular-Ritual.mp3');
musicEl.preload = 'auto';
musicEl.loop = true;
function applyMusicVolume() {
  musicEl.volume = Math.min(1, Math.max(0, esSound.volume * esSound.musicVolume));
}
// Returns the play() promise so the sound control's autoplay attempt only
// shows "on" when the browser actually allowed it.
function musicPlay()  { applyMusicVolume(); return musicEl.play(); }
function musicPause() { musicEl.pause(); }

const SFX = {
  move() { /* light tap — skip to keep quiet */ },
  jump()    { playSfx('jump', 0.7); },
  select()  { playSfx('select', 0.6); },
  coinflip(){ playSfx('coinflip', 0.6); },

  shoot(w) {
    if (w === 0) { playSfx('shotShell',    0.90); startWhistle(); }
    if (w === 1) { playSfx('shotBomblets', 0.85); startWhistle(); }
    if (w === 2) { playSfx('shotRocket',   0.85); startWhistle(); }
    if (w === 3) { playSfx('shotBeam',     0.90); }
    if (w === 4) { playSfx('shotEggSac',   0.85); }
    if (w === 5) { playSfx('shotSilk',     0.85); }
  },

  explode(big) {
    stopWhistle();
    playSfx(big ? 'explosionBig' : 'explosionSmall', big ? 0.95 : 0.75);
  },
  crumble()       { playSfx('explosionSmall', 0.5); },
  bombletSplit()  { playSfx('bombletSplit', 0.8); },
  eggBounce()     { playSfx('eggBounce', 0.8); },
  hatch()         { playSfx('hatch', 0.85); },
  spiderlingPop() { playSfx('spiderlingPop', 0.75); },
  silkBuild()     { playSfx('silkBuild', 0.85); },
  beamBurn()      { playSfx('beamBurn', 0.7); },
  tankHit()       { playSfx('tankHit', 0.9); },
  eject()         { playSfx('eject', 0.95); },
  targetHit()     { playSfx('targetHit', 0.95); },
  victory()       { playSfx('victory', 0.9); },
};

// ============================================================
//  TERRAIN
// ============================================================
const TERRAIN_W = W;
const terrain = new Float32Array(TERRAIN_W);
let terrainPixels = null;
let decorationList = [];  // [{type, x, baseY, size, variant}] — live objects, culled by terrain height

// Wider, flatter spawn zones so tanks never clip into walls
const PAD_ZONE = 0.18;  // 18% of width on each side is flat pad

function generateTerrain() {
  const heights = new Float32Array(TERRAIN_W);
  // Pull terrain lower so there's more sky — "zoomed out" feel
  const minH = H * 0.10, maxH = H * 0.36;
  const seed = Math.random() * 10000;

  function noise(x, freq, amp) {
    const xi = x * freq;
    const x0 = Math.floor(xi), x1 = x0 + 1;
    const t  = xi - x0;
    const h0 = seededRand(x0 + seed) * 2 - 1;
    const h1 = seededRand(x1 + seed) * 2 - 1;
    return (h0 + (h1 - h0) * smoothstep(t)) * amp;
  }
  function seededRand(n) {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  for (let x = 0; x < TERRAIN_W; x++) {
    let h = 0;
    h += noise(x / TERRAIN_W, 2,  0.40);
    h += noise(x / TERRAIN_W, 4,  0.25);
    h += noise(x / TERRAIN_W, 8,  0.18);
    h += noise(x / TERRAIN_W, 16, 0.10);
    h += noise(x / TERRAIN_W, 32, 0.07);
    if (mode === 'practice') h *= 0.35;   // practice range: gentle rolling ground
    h = (h + 1) / 2;
    heights[x] = minH + h * (maxH - minH);
  }

  // Central mountain obstacle — taller and more dramatic (none on the range)
  if (mode !== 'practice') {
    const centerStart = Math.floor(TERRAIN_W * 0.28);
    const centerEnd   = Math.floor(TERRAIN_W * 0.72);
    const peakX       = centerStart + Math.floor(Math.random() * (centerEnd - centerStart));
    const peakH       = maxH * 0.85 + Math.random() * maxH * 0.25;
    const peakWidth   = 100 + Math.random() * 160;
    for (let x = 0; x < TERRAIN_W; x++) {
      const d = Math.abs(x - peakX);
      if (d < peakWidth) {
        const bump = peakH * (1 - d / peakWidth) * (1 - d / peakWidth);
        if (bump > heights[x]) heights[x] = bump;
      }
    }
  }

  // ---- Flat landing pads — wide and guaranteed clear ----
  const padEndL = Math.floor(TERRAIN_W * PAD_ZONE);
  const padStartR = Math.floor(TERRAIN_W * (1 - PAD_ZONE));
  const padHeightL = Math.min(heights[0], maxH * 0.38);
  const padHeightR = Math.min(heights[TERRAIN_W-1], maxH * 0.38);

  for (let x = 0; x < padEndL; x++) {
    heights[x] = padHeightL;
  }
  for (let x = padStartR; x < TERRAIN_W; x++) {
    heights[x] = padHeightR;
  }
  // Smooth transitions from pad into natural terrain (10% blend zone)
  const blendW = Math.floor(TERRAIN_W * 0.06);
  for (let i = 0; i < blendW; i++) {
    const t = i / blendW;
    const xl = padEndL + i;
    const xr = padStartR - 1 - i;
    if (xl < TERRAIN_W) heights[xl] = padHeightL * (1-t) + heights[xl] * t;
    if (xr >= 0)        heights[xr] = padHeightR * (1-t) + heights[xr] * t;
  }

  for (let x = 0; x < TERRAIN_W; x++) terrain[x] = heights[x];
  spawnDecorations();  // build decoration object list
  renderTerrainCanvas();
  placeTanks();
}

// Build decoration object list from initial terrain — called once per game.
// Each decoration is {type, x, baseTerrainH, size, variant} so we can
// check live terrain height and skip ones buried by craters.
function spawnDecorations() {
  decorationList = [];
  const rng = (() => {
    let s = 12345 + Math.floor(terrain[100] * 997);
    return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
  })();

  // Place boulders
  const numBoulders = 14 + Math.floor(rng() * 10);
  for (let i = 0; i < numBoulders; i++) {
    const x = 80 + rng() * (TERRAIN_W - 160);
    decorationList.push({ type: 'boulder', x, baseTerrainH: terrain[Math.floor(x)], size: 8 + rng()*20, variant: Math.floor(rng()*3) });
  }

  // Place varied flora from the current biome's list (weighted by repetition)
  const floraTypes = biome.flora;
  const numFlora = 28 + Math.floor(rng() * 16);
  for (let i = 0; i < numFlora; i++) {
    const x = 40 + rng() * (TERRAIN_W - 80);
    const type = floraTypes[Math.floor(rng() * floraTypes.length)];
    decorationList.push({ type, x, baseTerrainH: terrain[Math.floor(x)], size: 20 + rng()*36, variant: Math.floor(rng()*3) });
  }

  // Sort back-to-front by x for a mild parallax feel
  decorationList.sort((a, b) => a.x - b.x);
}

// Redraws terrain + live decorations every deform.
// Each decoration is only drawn if its base is still within ~4px of the current terrain —
// this naturally removes flora that has been blown out by craters.
function renderTerrainCanvas() {
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const oc = off.getContext('2d');

  // ---- Terrain body in the current biome's rock palette ----
  // Gradient anchored around the typical surface line so tops read lit
  // and depth falls off into dark bedrock.
  const grad = oc.createLinearGradient(0, H * 0.5, 0, H);
  const stops = [0, 0.22, 0.5, 0.78, 1];
  stops.forEach((p, i) => grad.addColorStop(p, biome.grad[i]));
  oc.fillStyle = grad;
  oc.beginPath();
  oc.moveTo(0, H);
  for (let x = 0; x < TERRAIN_W; x++) oc.lineTo(x, H - terrain[x]);
  oc.lineTo(TERRAIN_W, H);
  oc.closePath();
  oc.fill();

  // Sedimentary strata — wavy bands at fixed depths, freshly exposed by craters
  oc.save();
  oc.beginPath();
  oc.moveTo(0, H);
  for (let x = 0; x < TERRAIN_W; x++) oc.lineTo(x, H - terrain[x]);
  oc.lineTo(TERRAIN_W, H);
  oc.closePath();
  oc.clip();
  const strataGeom = [
    { y: H * 0.60, h: 8 }, { y: H * 0.66, h: 4 }, { y: H * 0.73, h: 11 },
    { y: H * 0.80, h: 5 }, { y: H * 0.87, h: 9 }, { y: H * 0.94, h: 5 },
  ];
  const strata = strataGeom.map((s, i) => ({ ...s, col: biome.strata[i] }));
  strata.forEach((s, si) => {
    oc.fillStyle = s.col;
    oc.beginPath();
    for (let x = 0; x <= TERRAIN_W; x += 8) {
      const wob = Math.sin(x * 0.012 + si * 2.1) * 4 + seededRandG(x * 0.05 + si * 7.3) * 3;
      const yy = s.y + wob;
      x === 0 ? oc.moveTo(x, yy) : oc.lineTo(x, yy);
    }
    for (let x = TERRAIN_W; x >= 0; x -= 8) {
      const wob = Math.sin(x * 0.012 + si * 2.1) * 4 + seededRandG(x * 0.05 + si * 7.3) * 3;
      oc.lineTo(x, s.y + s.h + wob);
    }
    oc.closePath();
    oc.fill();
  });

  // Per-column colour noise — tonal variation for organic rock
  for (let x = 0; x < TERRAIN_W; x++) {
    const n1 = seededRandG(x * 0.09  + 3.7);
    const n2 = seededRandG(x * 0.031 + 11.2);
    const alpha = n1 * 0.14 + n2 * 0.08;
    const col = n1 > 0.52
      ? `rgba(${biome.noiseLite},${alpha})`   // lit
      : `rgba(${biome.noiseDark},${alpha})`;  // shadowed
    oc.fillStyle = col;
    const sy = H - terrain[x];
    oc.fillRect(x, sy, 1, H - sy);
  }
  oc.restore();

  // Surface edge — dark base line with a lit rim above it
  oc.strokeStyle = biome.edge;
  oc.lineWidth = 2.5;
  oc.beginPath();
  for (let x = 0; x < TERRAIN_W; x++) {
    if (x === 0) oc.moveTo(0, H - terrain[0]);
    else         oc.lineTo(x, H - terrain[x]);
  }
  oc.stroke();
  oc.strokeStyle = biome.rim;
  oc.lineWidth = 1;
  oc.beginPath();
  for (let x = 0; x < TERRAIN_W; x++) {
    if (x === 0) oc.moveTo(0, H - terrain[0] - 1);
    else         oc.lineTo(x, H - terrain[x] - 1);
  }
  oc.stroke();

  // Surface pebble/crack texture — dashes just below the rim
  for (let x = 2; x < TERRAIN_W - 2; x += 4 + Math.floor(seededRandG(x * 0.3) * 6)) {
    const ty = H - terrain[x] + 2;
    const len = 2 + seededRandG(x * 0.7) * 5;
    oc.fillStyle = seededRandG(x*1.3) > 0.5 ? biome.pebbleA : biome.pebbleB;
    oc.fillRect(x, ty, len, 1);
  }

  // ---- Draw live decorations — skip any buried by craters ----
  decorationList.forEach(d => {
    const xi = Math.max(0, Math.min(TERRAIN_W - 1, Math.floor(d.x)));
    const currentH = terrain[xi];
    // If terrain has been blasted below this decoration's original base by more than
    // 6px, consider it destroyed — don't draw it
    if (currentH < d.baseTerrainH - 6) return;
    const sy = H - currentH;   // current screen Y at base of decoration
    drawDecoration(oc, d, sy);
  });

  terrainPixels = off;
}

// Dispatch to the right draw function based on decoration type
function drawDecoration(oc, d, sy) {
  switch (d.type) {
    case 'boulder':  drawBoulder(oc, d.x, sy, d.size, d.variant); break;
    case 'spire':    drawSpire(oc, d.x, sy, d.size * 1.5, d.variant); break;
    case 'juniper':  drawJuniper(oc, d.x, sy, d.size, d.variant); break;
    case 'ocotillo': drawOcotillo(oc, d.x, sy, d.size, d.variant); break;
    case 'agave':    drawAgave(oc, d.x, sy, d.size * 0.7, d.variant); break;
    case 'scrub':    drawScrub(oc, d.x, sy, d.size, d.variant); break;
    case 'drygrass': drawDryGrass(oc, d.x, sy, d.size * 0.75, d.variant); break;
    case 'web':      drawWeb(oc, d.x, sy, d.size, d.variant); break;
    case 'silk':     drawSilk(oc, d.x, d.size); break;
  }
}

function drawBoulder(oc, x, y, r, variant) {
  // Main mass — biome rock, lit on the upper-left facet
  const col  = biome.rockBase[variant];
  const lite = biome.rockLite[variant];
  oc.fillStyle = col;
  oc.beginPath(); oc.ellipse(x, y - r*0.45, r, r*0.60, 0.1*variant, 0, Math.PI*2); oc.fill();
  oc.fillStyle = lite;
  oc.globalAlpha = 0.55;
  oc.beginPath(); oc.ellipse(x - r*0.25, y - r*0.72, r*0.38, r*0.22, -0.3, 0, Math.PI*2); oc.fill();
  oc.globalAlpha = 1;
  oc.fillStyle = 'rgba(20,8,2,0.3)';
  oc.beginPath(); oc.ellipse(x, y - 2, r*0.9, r*0.18, 0, 0, Math.PI*2); oc.fill();
  oc.strokeStyle = 'rgba(20,8,2,0.4)'; oc.lineWidth = 0.8;
  oc.beginPath(); oc.moveTo(x - r*0.1, y - r*0.3); oc.lineTo(x + r*0.2, y - r*0.7); oc.stroke();
}

function drawSpire(oc, x, y, h, variant) {
  // Stacked hoodoo — eroded rock slabs narrowing toward the top
  const base = biome.rockBase[variant];
  const lite = biome.rockLite[variant];
  const segs = 4 + variant;
  let w = h * 0.22, py = y;
  for (let s = 0; s < segs; s++) {
    const sh = h * (0.30 - s * 0.035);
    const off = (seededRandG(x*0.7 + s*13.1) - 0.5) * w * 0.5;
    oc.fillStyle = base;
    oc.beginPath();
    oc.moveTo(x - w + off, py);
    oc.lineTo(x + w + off, py);
    oc.lineTo(x + w*0.78 + off, py - sh);
    oc.lineTo(x - w*0.78 + off, py - sh);
    oc.closePath(); oc.fill();
    oc.fillStyle = lite;
    oc.globalAlpha = 0.4;
    oc.fillRect(x - w*0.7 + off, py - sh, w*0.55, sh);
    oc.globalAlpha = 1;
    py -= sh; w *= 0.82;
  }
  // Cap stone
  oc.fillStyle = base;
  oc.beginPath(); oc.ellipse(x, py - 2, w * 1.5, 4, 0, 0, Math.PI*2); oc.fill();
}

function drawJuniper(oc, x, y, h, variant) {
  // Gnarled desert juniper — twisted trunk, dusty olive canopy clumps
  const trunk   = ['#3a2010','#2e1a0c','#463018'][variant];
  const folDark = ['#2e3018','#282c14','#34381c'][variant];
  const folLite = ['#4a4c28','#42461f','#565a30'][variant];
  oc.strokeStyle = trunk; oc.lineWidth = 3; oc.lineCap = 'round';
  oc.beginPath();
  oc.moveTo(x, y);
  oc.quadraticCurveTo(x + h*0.12, y - h*0.3, x - h*0.06, y - h*0.52);
  oc.stroke();
  oc.lineWidth = 2;
  oc.beginPath();
  oc.moveTo(x + h*0.02, y - h*0.3);
  oc.quadraticCurveTo(x + h*0.2, y - h*0.42, x + h*0.24, y - h*0.6);
  oc.stroke();
  [[-0.10, 0.62, 0.30], [0.22, 0.66, 0.24], [0.05, 0.80, 0.20]].forEach(([dx, dy, r], i) => {
    oc.fillStyle = i === 2 ? folLite : folDark;
    oc.beginPath(); oc.ellipse(x + h*dx, y - h*dy, h*r, h*r*0.62, 0, 0, Math.PI*2); oc.fill();
  });
  // Dusk rim light on the crown
  oc.fillStyle = 'rgba(196,117,46,0.20)';
  oc.beginPath(); oc.ellipse(x + h*0.05, y - h*0.88, h*0.15, h*0.06, -0.2, 0, Math.PI*2); oc.fill();
}

function drawOcotillo(oc, x, y, h, variant) {
  // Spray of thin whippy canes with red bloom tips
  const cane = ['#3c2a16','#332412','#46311c'][variant];
  const tip  = ['#b04828','#a03c20','#c05430'][variant];
  const canes = 6 + variant;
  for (let i = 0; i < canes; i++) {
    const a = -Math.PI/2 + (i - (canes-1)/2) * 0.22 + (seededRandG(x + i*3.3) - 0.5) * 0.12;
    const len = h * (0.7 + seededRandG(x*1.3 + i) * 0.3);
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const mx = x + Math.cos(a) * len * 0.5 + (i - (canes-1)/2) * 1.5;
    const my = y + Math.sin(a) * len * 0.55;
    oc.strokeStyle = cane; oc.lineWidth = 1.4; oc.lineCap = 'round';
    oc.beginPath(); oc.moveTo(x, y); oc.quadraticCurveTo(mx, my, ex, ey); oc.stroke();
    oc.fillStyle = tip;
    oc.beginPath(); oc.arc(ex, ey, 1.6, 0, Math.PI*2); oc.fill();
  }
}

function drawAgave(oc, x, y, h, variant) {
  // Spiky rosette — alternating light/dark blades
  const dark = ['#37421f','#2e3819','#404c26'][variant];
  const lite = ['#57633a','#4c5830','#646f42'][variant];
  const blades = 7;
  for (let i = 0; i < blades; i++) {
    const a = -Math.PI/2 + (i - (blades-1)/2) * 0.32;
    const len = h * (0.55 + (i === Math.floor(blades/2) ? 0.3 : seededRandG(x + i) * 0.18));
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    oc.fillStyle = i % 2 ? dark : lite;
    oc.beginPath();
    oc.moveTo(x - 2.5, y);
    oc.quadraticCurveTo(x + Math.cos(a)*len*0.5 - 2, y + Math.sin(a)*len*0.5, ex, ey);
    oc.quadraticCurveTo(x + Math.cos(a)*len*0.5 + 2, y + Math.sin(a)*len*0.5, x + 2.5, y);
    oc.closePath(); oc.fill();
  }
}

function drawScrub(oc, x, y, h, variant) {
  // Dusty sage — low overlapping clumps in desaturated olive-browns
  const cols = [['#4a3a22','#3c4426','#54462a'],
                ['#56422a','#46502c','#5e4a30'],
                ['#3e3120','#333c22','#46381f']][variant];
  const count = 3 + variant;
  for (let i = 0; i < count; i++) {
    const bx = x + (i - count/2) * h*0.28;
    const bh = h * (0.35 + seededRandG(i*7.1+x)*0.25);
    oc.fillStyle = cols[i % cols.length];
    oc.beginPath(); oc.ellipse(bx, y - bh*0.5, h*0.22, bh*0.55, 0, 0, Math.PI*2); oc.fill();
  }
  oc.fillStyle = 'rgba(240,200,140,0.09)';
  oc.beginPath(); oc.ellipse(x, y - h*0.42, h*0.18, h*0.12, 0, 0, Math.PI*2); oc.fill();
}

function drawDryGrass(oc, x, y, h, variant) {
  // Sun-cured bunchgrass in warm tans
  const cols = [['#8a6a34','#7a5c2c','#9a7a40'],
                ['#7a5a28','#6b4e22','#8a6a34'],
                ['#95763c','#84662f','#a68648']][variant];
  const blades = 5 + variant * 2;
  for (let i = 0; i < blades; i++) {
    const bx = x + (i - blades/2) * h * 0.12;
    const ang = (i - blades/2) * 0.18;
    const bh  = h * (0.5 + seededRandG(i*3.7+x) * 0.5);
    oc.strokeStyle = cols[i % 3]; oc.lineWidth = 1.4; oc.lineCap = 'round';
    oc.beginPath();
    oc.moveTo(bx, y);
    oc.quadraticCurveTo(bx + Math.sin(ang)*bh*0.4, y - bh*0.6,
                        bx + Math.sin(ang)*bh*0.7, y - bh);
    oc.stroke();
  }
}

function drawWeb(oc, x, y, h, variant) {
  // A small web strung between two dead sticks — somebody lives here
  const r = h * 0.4;
  const cx2 = x, cy2 = y - h*0.55;
  oc.strokeStyle = '#33200f'; oc.lineWidth = 1.5; oc.lineCap = 'round';
  oc.beginPath(); oc.moveTo(x - r, y); oc.lineTo(x - r*0.8, cy2 - r*0.6); oc.stroke();
  oc.beginPath(); oc.moveTo(x + r, y); oc.lineTo(x + r*0.85, cy2 - r*0.7); oc.stroke();
  oc.strokeStyle = 'rgba(230,225,210,0.32)'; oc.lineWidth = 0.7;
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7 + 0.3;
    oc.beginPath(); oc.moveTo(cx2, cy2);
    oc.lineTo(cx2 + Math.cos(a)*r*0.75, cy2 + Math.sin(a)*r*0.75); oc.stroke();
  }
  for (let rr = r*0.25; rr < r*0.75; rr += r*0.22) {
    oc.beginPath(); oc.arc(cx2, cy2, rr, 0, Math.PI*2); oc.stroke();
  }
  oc.fillStyle = '#1a1410';
  oc.beginPath(); oc.arc(cx2 + r*0.2, cy2 + r*0.15, 1.6, 0, Math.PI*2); oc.fill();
}

function drawSilk(oc, x, span) {
  // Silk bridge strands laid along the live surface line
  const x0 = Math.max(0, Math.floor(x - span/2));
  const x1 = Math.min(TERRAIN_W - 1, Math.floor(x + span/2));
  oc.save();
  oc.strokeStyle = 'rgba(240,240,228,0.55)';
  oc.lineWidth = 1.2;
  oc.beginPath();
  for (let px = x0; px <= x1; px += 4) {
    const py = H - terrain[px] + 1;
    px === x0 ? oc.moveTo(px, py) : oc.lineTo(px, py);
  }
  oc.stroke();
  // Cross-thread stitches
  oc.strokeStyle = 'rgba(240,240,228,0.28)';
  oc.lineWidth = 0.8;
  for (let px = x0 + 4; px < x1; px += 9) {
    const py = H - terrain[px];
    oc.beginPath(); oc.moveTo(px - 3, py + 4); oc.lineTo(px + 3, py + 1); oc.stroke();
    oc.beginPath(); oc.moveTo(px - 2, py + 7); oc.lineTo(px + 4, py + 3); oc.stroke();
  }
  oc.restore();
}

function deformTerrain(cx, cy, radius, skipRender) {
  // Craters are cumulative — terrain[] is never reset between hits.
  // Wider search radius so large blasts reshape more ground.
  const searchR = radius * 1.6;
  for (let x = Math.max(0, Math.floor(cx - searchR));
           x < Math.min(TERRAIN_W, Math.ceil(cx + searchR)); x++) {
    const dist = Math.abs(x - cx);
    if (dist >= searchR) continue;
    const t = dist / searchR;            // 0 = centre, 1 = edge
    // Bowl profile: deep at centre, tapers to zero at edge
    const bowl  = Math.cos(t * Math.PI * 0.5) * radius * 1.8;
    // Raised rim just outside the bowl (adds detail)
    const rim   = t > 0.75 ? Math.sin((t - 0.75) * Math.PI * 4) * radius * 0.25 : 0;
    const delta = bowl - rim;
    if (cy < H - terrain[x] + searchR) {
      terrain[x] = Math.max(12, terrain[x] - delta);
    }
  }
  if (!skipRender) renderTerrainCanvas();
}

// ============================================================
//  CAMERA  —  dynamic zoom/pan, shake, flash, kill slow-mo
// ============================================================
const cam = { x: W/2, y: H/2, z: 1, sx: 0, sy: 0, shakeMag: 0, flash: 0 };
let slowmoT = 0;                              // real frames of kill slow-mo left
let impactFocus = { x: 0, y: 0, t: 0, big: false };

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Tuning — toned way down 2026-07-14 after James's motion-sickness feedback:
// stay wide, always frame BOTH tanks while aiming, ease gently.
const CAM_EASE_XY = 0.045;
const CAM_EASE_Z  = 0.035;

function camUpdate() {
  let tx = W/2, ty = H/2, tz = 1;

  if (state === STATES.PLAYER_TURN || state === STATES.AI_TURN) {
    // Centre on the midpoint of both tanks, biased slightly toward the
    // active one; zoom only as far as keeps both comfortably in frame.
    const a = tanks[activePlayer], b = tanks[1 - activePlayer];
    if (a && b) {
      const mid = (a.x + b.x) / 2;
      tx = mid + (a.x - mid) * 0.2;
      ty = H/2 + (Math.min(a.y, b.y) - H/2) * 0.15;
      const need = Math.abs(a.x - b.x) + 420;   // margin for barrels + strip
      tz = clamp(W / need, 1.0, 1.08);
    }
  } else if (state === STATES.FIRING) {
    // Follow the flight loosely: centroid of everything in the air
    const fl = projectiles.length ? projectiles : crawlers;
    if (fl.length) {
      let sx = 0, sy = 0;
      for (const f of fl) { sx += f.x; sy += f.y; }
      tx = sx / fl.length; ty = sy / fl.length; tz = 1.06;
    }
  } else if (state === STATES.EJECTING && ejectFx) {
    tx = ejectFx.pilot.x; ty = ejectFx.pilot.y; tz = 1.06;
  } else if (state === STATES.GAME_OVER) {
    const winner = tanks.find(t => t.alive);
    if (winner) { tx = winner.x; ty = winner.y; tz = 1.1; }
  }

  if (impactFocus.t > 0) {
    tx = impactFocus.x; ty = impactFocus.y;
    tz = impactFocus.big ? 1.16 : 1.06;
  }
  if (slowmoT > 0) tz = Math.max(tz, 1.22);

  cam.z += (tz - cam.z) * CAM_EASE_Z;
  cam.x += (tx - cam.x) * CAM_EASE_XY;
  cam.y += (ty - cam.y) * CAM_EASE_XY;

  // Never show past the world rect
  const hw = W / (2 * cam.z), hh = H / (2 * cam.z);
  cam.x = clamp(cam.x, hw, W - hw);
  cam.y = clamp(cam.y, hh, H - hh);

  // Shake + flash decay (real-time so slow-mo doesn't freeze them).
  // Shake offset is smoothed toward each new random target instead of
  // jumping every frame — reads as a rumble, not a vibration.
  cam.shakeMag *= 0.88; if (cam.shakeMag < 0.1) cam.shakeMag = 0;
  cam.sx += ((Math.random() * 2 - 1) * cam.shakeMag - cam.sx) * 0.5;
  cam.sy += ((Math.random() * 2 - 1) * cam.shakeMag - cam.sy) * 0.5;
  cam.flash *= 0.85; if (cam.flash < 0.02) cam.flash = 0;
  if (slowmoT > 0) slowmoT--;
  if (impactFocus.t > 0) impactFocus.t--;
}

function applyCamera() {
  ctx.translate(W/2, H/2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x + cam.sx / cam.z, -cam.y + cam.sy / cam.z);
}

function screenToWorld(p) {
  return { x: cam.x + (p.x - W/2) / cam.z, y: cam.y + (p.y - H/2) / cam.z };
}

function addShake(mag)  { cam.shakeMag = Math.min(7, Math.max(cam.shakeMag, mag)); }

// ============================================================
//  LIGHTS  —  explosions and muzzle flashes light the scene
// ============================================================
let lights = [];   // {x, y, r, intensity, age, maxAge, col}

function addLight(x, y, r, intensity, maxAge, col = '255,190,110') {
  lights.push({ x, y, r, intensity, age: 0, maxAge, col });
}

function drawLights() {
  if (!lights.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const k = 1 - L.age / L.maxAge;
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    g.addColorStop(0, `rgba(${L.col},${(L.intensity * k).toFixed(3)})`);
    g.addColorStop(1, `rgba(${L.col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
  }
  ctx.restore();
}

// ============================================================
//  PARALLAX BACKGROUND  —  painted biome plates behind the terrain
// ============================================================
// f = horizontal parallax factor, fy = vertical, zk = how much of the
// camera zoom the layer inherits (distance = less zoom).
const BG_LAYERS = [
  { key: 'sky', f: 0.05, fy: 0.02, zk: 0.10, anchor: 'center' },
  { key: 'far', f: 0.16, fy: 0.07, zk: 0.35, anchor: 'bottom', yOff: 6 },
  { key: 'mid', f: 0.38, fy: 0.15, zk: 0.75, anchor: 'bottom', yOff: 30 },
];

function drawParallax() {
  const panX = cam.x - W/2, panY = cam.y - H/2;
  const imgs = biomeImgs(biomeKey);
  let drewSky = false;
  for (const l of BG_LAYERS) {
    const img = imgs[l.key];
    if (!img.complete || img.naturalWidth === 0) continue;
    const zl = 1 + (cam.z - 1) * l.zk;
    const base = Math.max((W + 220) / img.naturalWidth, (H + 120) / img.naturalHeight);
    const s = base * zl;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const dx = W/2 - dw/2 - panX * l.f * cam.z + cam.sx * l.f;
    const dy = (l.anchor === 'bottom' ? H + (l.yOff || 0) * zl - dh : H/2 - dh/2)
               - panY * l.fy * cam.z + cam.sy * l.fy;
    ctx.drawImage(img, dx, dy, dw, dh);
    if (l.key === 'sky') drewSky = true;
  }
  if (!drewSky) {
    // Fallback: the old single plate only matches twilight; otherwise a
    // solid in the biome's key colour until the layers finish loading.
    if (biomeKey === 'twillight' && bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, 0, 0, W, H);
    } else {
      ctx.fillStyle = biome.fallback; ctx.fillRect(0, 0, W, H);
    }
  }
}

function seededRandG(n) { let x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }

// ============================================================
//  TANK  —  angular military body, insect legs, long thin barrel
// ============================================================
const TANK_W = 30, TANK_H = 11, MAX_MOVE = TANK_W * 4.2;
const BARREL_LEN = 54;

// Blender-rendered 2500-series part layers (tmp/arachno-wars-2000/build-tank-2500.py):
// black carbon hull with the turret ball baked in (3 damage states) plus the
// articulating barrel, per team. Legs stay procedural so they can grip terrain
// and whip. Falls back to the painted hull/barrel if any layer is missing.
//
// Alignment contract with the build script: the hull image's CENTER is the
// turret-ball center, i.e. getMountPoint(); the image spans 5.2 scene units
// across. The barrel image's root sits at BARREL_ROOT_FRAC of its width and
// the muzzle tip at BARREL_TIP_FRAC — scaled so root→tip = BARREL_LEN.
const HULL_DRAW_W = 70;
const BARREL_ROOT_FRAC = 0.0741, BARREL_TIP_FRAC = 0.9259;
const TANK_PARTS = ['teal', 'amber'].map(team => {
  const load = n => { const i = new Image(); i.src = `assets/tanks/${n}.png`; return i; };
  return { hull: [0, 1, 2].map(s => load(`hull-${team}-${s}`)), barrel: load(`barrel-${team}`) };
});

// W is JUMP only: tap = a little hop, quick double-tap = ONE bigger boost
// (an upgrade to the same launch, never two stacked hops). Flight is a
// different verb and lives on SHIFT: short-term rocket thrust burning a fuel
// meter — when the meter dies, so does the lift. Fast landings fire an
// automatic retro-burst and the legs catch the machine (spider-vision.md's
// rocket boost, both directions).
const JUMP_POWER    = -9.5;   // single-tap hop velocity
const JUMP_BOOST    = -14.2;  // double-tap upgraded launch velocity
const JUMP_BOOST_MS = 280;    // double-tap window
const JUMP_GRAVITY  = 0.42;
const FUEL_MAX        = 100;
const FUEL_BURN       = 0.9;   // per thrusting frame (~1.9s of lift)
const FUEL_REGEN      = 1.4;   // per grounded frame
const THRUST_ACC      = 0.75;  // beats gravity by ~0.33/frame
const THRUST_MAX_RISE = 5.5;   // upward speed cap while thrusting

// ============================================================
//  WHIP-LEG MOTION LANGUAGE  (roadmap #19, spider-vision.md)
// ============================================================
// Each leg is a 2-bone IK chain from a low hull hip to a needle-tipped foot
// planted in WORLD space, so feet grip real terrain on any slope and the hull
// can breathe/flinch above them. Walking runs a distance-driven alternating-
// tetrapod cycle whose swing is the signature move: a slow deliberate reach
// (with a small anticipation pull), then the tip WHIPS the rest of the way
// and stabs in. Idle re-grips, landings, and crater scrambles reuse the same
// curve at creepier speeds.
const LEG_COUNT   = 8;
const LEG_HIP_X   = [-7.0, -1.8, 3.4, 8.6];   // body-space hip x per slot — legs fan across the hull
const LEG_HIP_Y   = 3.0;                       // hips sit low on the hull flank
const LEG_STANCE  = [13, 20.6, 28.2, 35.8];    // stance foot |x| per slot (wide tarantula spread)
const LEG_FEMUR   = [15, 15.8, 16.6, 17.4];
const LEG_TIBIA   = [26, 29.2, 32.4, 35.6];
const GAIT_CYCLE_PX    = 30;    // body travel per full gait cycle
const GAIT_STANCE_FRAC = 0.55;  // fraction of the cycle a foot stays planted

function groundYAt(x) {
  const xi = Math.max(0, Math.min(TERRAIN_W - 1, Math.floor(x)));
  return H - terrain[xi];
}

// u 0..1 → {d: fraction of start→target covered, lift: 0..1}. Slow reach with
// an early anticipation dip, then the whip: accelerate hard into the plant
// with a tiny overshoot so the tip reads as stabbing in.
function whipCurve(u, whipAt) {
  if (u <= whipAt) {
    const r = u / whipAt;
    const ease = r * r * (3 - 2 * r);
    return { d: ease * 0.40 - 0.05 * Math.sin(Math.min(1, r * 3) * Math.PI),
             lift: Math.sin(Math.min(1, r * 1.3) * Math.PI / 2) };
  }
  const w = (u - whipAt) / (1 - whipAt);
  const snap = w * w * (2.2 - 1.2 * w);
  const over = 0.06 * Math.sin(Math.max(0, (w - 0.55) / 0.45) * Math.PI);
  return { d: 0.40 + 0.60 * snap + over, lift: Math.max(0, 1 - w * 1.15) };
}

// 2-bone IK: knee position for a hip→foot chain, always taking the solution
// that arches the knee HIGH (the harvestman kink above the hull line).
function legIK(hx, hy, fx, fy, L1, L2) {
  let dx = fx - hx, dy = fy - hy;
  let d = Math.hypot(dx, dy);
  const maxD = (L1 + L2) * 0.985, minD = Math.abs(L1 - L2) + 0.01;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  if (d < minD) { const f = minD / (d || 0.01); dx *= f; dy *= f; d = minD; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const mx = hx + (a / d) * dx, my = hy + (a / d) * dy;
  const px = -dy * (h / d), py = dx * (h / d);
  return py <= 0 ? { x: mx + px, y: my + py } : { x: mx - px, y: my - py };
}

// One carbon leg: femur arches to the high knee, tibia drops through a slight
// outward kink, then tapers to a needle point (Spider_Tank_2's silhouette).
function drawWhipLeg(hx, hy, fx, fy, k, col, accentCol) {
  const L1 = LEG_FEMUR[k], L2 = LEG_TIBIA[k];
  // keep the visual foot inside reach so the needle never detaches
  const dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy), maxD = (L1 + L2) * 0.985;
  if (d > maxD) { fx = hx + dx * maxD / d; fy = hy + dy * maxD / d; }
  const knee = legIK(hx, hy, fx, fy, L1, L2);
  const mx = knee.x + (fx - knee.x) * 0.42 + (fx >= hx ? 1.6 : -1.6);
  const my = knee.y + (fy - knee.y) * 0.42 - 1.2;
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(knee.x, knee.y); ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(knee.x, knee.y); ctx.lineTo(mx, my); ctx.stroke();
  const nx = fx + (mx - fx) * 0.3, ny = fy + (my - fy) * 0.3;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(nx, ny); ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx, fy); ctx.stroke();
  // joint node with the accent glint
  ctx.fillStyle = '#0c1014';
  ctx.beginPath(); ctx.arc(knee.x, knee.y, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = accentCol; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(knee.x, knee.y, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

class Tank {
  constructor(x, playerIdx) {
    this.playerIdx   = playerIdx;
    this.x           = x; this.y = 0; this.angle = 0;
    this.barrelAngle = playerIdx===0 ? Math.PI/4 : Math.PI*3/4;
    this.power=50; this.hp=500; this.maxHp=500; this.weapon=0;
    this.alive=true; this.hitFlash=0;
    // Presentation state
    this.recoilT=0; this.breathSeed=Math.random()*Math.PI*2;
    this.gaitDir=1; this.gaitMoved=0; this.wasAir=false;
    // Jump / flight state
    this.vy=0; this.inAir=false; this.fuel=FUEL_MAX;
    this.jumpAtMs=0; this.boosted=false;
    this.retroT=0; this.retroUsed=false; this.thrustFx=0;
    this.crouchT=0; this.landCrouch=0; this.landImpact=0;
    this.snapToGround();
    this.initLegs();
  }

  initLegs() {
    this.legs = [];
    for (let i = 0; i < LEG_COUNT; i++) {
      const side = i < 4 ? 1 : -1, k = i % 4;
      const leg = {
        side, k,
        // alternating tetrapods: neighbours step out of phase
        cycle: (((k + (side > 0 ? 0 : 1)) % 2) ? 0.5 : 0) + k * 0.02,
        mode: 'plant',   // plant | swing (gait) | step (explicit) | air
        foot: { x: 0, y: 0 },
        sx: 0, sy: 0, tx: 0, ty: 0, t: 0, dur: 1, whipAt: 0.72,
        regripCd: 120 + Math.random() * 320,
      };
      const st = this.stanceTarget(leg, 0);
      leg.foot.x = st.x; leg.foot.y = st.y;
      this.legs.push(leg);
    }
  }

  // Where this leg's foot "wants" to be: its stance slot, lead px ahead,
  // planted on the actual terrain surface.
  stanceTarget(leg, lead) {
    const x = this.x + leg.side * LEG_STANCE[leg.k] * Math.cos(this.angle) + lead;
    return { x, y: groundYAt(x) };
  }

  startStep(leg, tx, ty, dur, whipAt) {
    leg.mode = 'step';
    leg.sx = leg.foot.x; leg.sy = leg.foot.y;
    leg.tx = tx; leg.ty = ty;
    leg.t = 0; leg.dur = dur; leg.whipAt = whipAt;
    leg.regripCd = 200 + Math.random() * 420;
  }

  // Per-frame leg brain: gait while walking, curl in the air, staggered
  // re-grips on landing, crater scrambles, and idle single-leg re-grips.
  updateLegs() {
    if (!this.legs) return;
    this.recoilT = this.recoilT > 0.003 ? this.recoilT * 0.85 : 0;
    const moved = this.gaitMoved; this.gaitMoved = 0;

    if (this.inAir) {
      this.wasAir = true;
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      for (const leg of this.legs) {
        leg.mode = 'air';
        // legs release their grip and splay, reaching for the landing
        const bx = leg.side * LEG_STANCE[leg.k] * 0.55, by = LEG_HIP_Y + 9;
        const tx = this.x + bx * c - by * s, ty = this.y + bx * s + by * c;
        leg.foot.x += (tx - leg.foot.x) * 0.22;
        leg.foot.y += (ty - leg.foot.y) * 0.22;
      }
      return;
    }
    if (this.wasAir) {
      // touchdown: every leg re-grips in a fast stagger, whips stabbing in —
      // the harder the landing, the wider and faster the catch
      this.wasAir = false;
      const imp = Math.min(1, (this.landImpact || 0) / 12);
      this.legs.forEach((leg, i) => {
        const wide = leg.side * LEG_STANCE[leg.k] * 0.30 * imp;
        const st = this.stanceTarget(leg, wide + Math.random() * 6 - 3);
        this.startStep(leg, st.x, st.y, 6 + (i % 4) * (3 - imp * 1.5), 0.55);
      });
    }

    for (const leg of this.legs) {
      if (leg.mode === 'step') {
        leg.t++;
        const u = Math.min(1, leg.t / leg.dur);
        const { d, lift } = whipCurve(u, leg.whipAt);
        leg.foot.x = leg.sx + (leg.tx - leg.sx) * d;
        leg.foot.y = leg.sy + (leg.ty - leg.sy) * d - lift * 8;
        if (u >= 1) { leg.mode = 'plant'; leg.foot.x = leg.tx; leg.foot.y = leg.ty; }
        continue;
      }
      if (moved > 0) {
        // distance-driven gait
        leg.cycle = (leg.cycle + moved / GAIT_CYCLE_PX) % 1;
        if (leg.cycle < GAIT_STANCE_FRAC) {
          if (leg.mode === 'swing') {
            leg.mode = 'plant';
            leg.foot.y = groundYAt(leg.foot.x);   // grip exactly on the surface
          }
        } else {
          if (leg.mode !== 'swing') { leg.mode = 'swing'; leg.sx = leg.foot.x; leg.sy = leg.foot.y; }
          const u = (leg.cycle - GAIT_STANCE_FRAC) / (1 - GAIT_STANCE_FRAC);
          const st = this.stanceTarget(leg, this.gaitDir * GAIT_CYCLE_PX * 0.45);
          const { d, lift } = whipCurve(u, 0.70);
          leg.foot.x = leg.sx + (st.x - leg.sx) * d;
          leg.foot.y = leg.sy + (st.y - leg.sy) * d - lift * 6.5;
        }
        continue;
      }
      if (leg.mode === 'swing') {
        // walk stopped mid-swing: finish the step where we stand
        leg.cycle += 0.045;
        const u = Math.min(1, (leg.cycle - GAIT_STANCE_FRAC) / (1 - GAIT_STANCE_FRAC));
        const st = this.stanceTarget(leg, 0);
        const { d, lift } = whipCurve(u, 0.70);
        leg.foot.x = leg.sx + (st.x - leg.sx) * d;
        leg.foot.y = leg.sy + (st.y - leg.sy) * d - lift * 6.5;
        if (u >= 1) {
          leg.mode = 'plant'; leg.cycle = 0;
          leg.foot.x = st.x; leg.foot.y = groundYAt(st.x);
        }
        continue;
      }
      // planted: did the ground move under this foot? (crater, silk bridge)
      const gy = groundYAt(leg.foot.x);
      if (Math.abs(gy - leg.foot.y) > 5) {
        const st = this.stanceTarget(leg, Math.random() * 8 - 4);
        this.startStep(leg, st.x, st.y, 14 + Math.random() * 6, 0.68);
        continue;
      }
      // idle micro-motion: one leg at a time does the slow creepy re-grip
      leg.regripCd--;
      if (leg.regripCd <= 0 && !this.legs.some(L => L.mode === 'step')) {
        const st = this.stanceTarget(leg, Math.random() * 7 - 3.5);
        this.startStep(leg, st.x, st.y, 22 + Math.random() * 8, 0.78);
      }
    }
  }

  // Which hull damage sprite the current HP maps to (0 pristine → 2 wrecked)
  hullState() {
    const f = this.hp / this.maxHp;
    return f > 0.62 ? 0 : f > 0.28 ? 1 : 2;
  }
  get col()        { return [PAL.p1body,    PAL.p2body   ][this.playerIdx]; }
  get accentCol()  { return [PAL.p1accent,  PAL.p2accent ][this.playerIdx]; }
  get cockpitCol() { return [PAL.p1cockpit, PAL.p2cockpit][this.playerIdx]; }
  get legCol()     { return [PAL.p1leg,     PAL.p2leg    ][this.playerIdx]; }

  snapToGround() {
    const xi = Math.max(0, Math.min(TERRAIN_W-1, Math.floor(this.x)));
    this.y = H - terrain[xi] - TANK_H * 1.1;
    const dx=6, x0=Math.max(0,xi-dx), x1=Math.min(TERRAIN_W-1,xi+dx);
    this.angle = Math.atan2(-(terrain[x1]-terrain[x0]), x1-x0);
  }

  jump() {
    const now = performance.now();
    if (!this.inAir) {
      this.vy = JUMP_POWER;
      this.inAir = true;
      this.jumpAtMs = now;
      this.boosted = false;
      SFX.jump();
    } else if (!this.boosted && now - this.jumpAtMs < JUMP_BOOST_MS) {
      // double-tap: the same launch with more leg — ONE bigger boost
      this.vy = JUMP_BOOST;
      this.boosted = true;
      SFX.jump();
    }
    // any later mid-air W does nothing — flight lives on SHIFT
  }

  // SHIFT held: rocket thrust while the fuel meter lasts
  thrust() {
    if (this.fuel <= 0) return;
    this.fuel = Math.max(0, this.fuel - FUEL_BURN);
    if (!this.inAir) { this.inAir = true; this.vy = Math.min(this.vy, -1.2); }
    this.vy = Math.max(this.vy - THRUST_ACC, -THRUST_MAX_RISE);
    this.thrustFx = 3;
  }

  updatePhysics() {
    if (this.crouchT > 0) this.crouchT--;
    if (this.thrustFx > 0) this.thrustFx--;
    if (!this.inAir) {
      this.fuel = Math.min(FUEL_MAX, this.fuel + FUEL_REGEN);
      return;
    }
    this.vy += JUMP_GRAVITY;
    const xi = Math.max(0, Math.min(TERRAIN_W-1, Math.floor(this.x)));
    const groundY = H - terrain[xi] - TANK_H*0.4;
    // Coming in hot with the ground rushing up: one automatic retro-burst —
    // the machine saves itself. Threshold sits above the small hop's landing
    // speed (9.5) so plain hops land raw on the leg-catch; boosted jumps and
    // flight drops earn the flame.
    if (!this.retroUsed && this.vy > 10.5 && groundY - this.y < this.vy * 7) {
      this.retroUsed = true;
      this.retroT = 14;
    }
    if (this.retroT > 0) {
      this.retroT--;
      this.vy = Math.max(3.0, this.vy * 0.80);
      if (this.retroT % 2 === 0) addLight(this.x, this.y + 14, 46, 0.30, 3);
    }
    this.y += this.vy;
    if (this.y >= groundY) {
      const impact = this.vy;
      this.y = groundY;
      this.vy = 0;
      this.inAir = false;
      this.retroUsed = false; this.retroT = 0; this.boosted = false;
      // crouch absorb scaled by how hard we came in; the legs catch us in
      // updateLegs (wasAir → staggered whip re-grips)
      this.landImpact = impact;
      this.landCrouch = Math.min(3.4, impact * 0.30);
      this.crouchT = 14;
      this.snapToGround();
    }
  }

  move(dir, pixels) {
    const newX = this.x + dir*pixels;
    if (newX<30||newX>TERRAIN_W-30) return;
    this.x=newX;
    if (!this.inAir) this.snapToGround();
    this.gaitDir = dir;
    this.gaitMoved += pixels;
  }

  draw() {
    // The machine idles alive: the hull breathes above its planted feet, and
    // recoil flinches the body while the legs absorb it. Both are visual-only
    // offsets — fire/aim math stays on getMountPoint().
    const breath = this.inAir ? 0 : Math.sin(performance.now() * 0.0032 + this.breathSeed) * 0.55;
    const crouch = this.crouchT > 0
      ? Math.sin((1 - this.crouchT / 14) * Math.PI) * this.landCrouch : 0;
    const wa = this.getBarrelWorldAngle();
    const r  = this.recoilT;
    const ox = -Math.cos(wa) * 3.2 * r;
    const oy = -Math.sin(wa) * 3.2 * r + r * 0.9 + breath + crouch;

    this._drawExhaust(ox, oy);
    if (this.hitFlash>0) ctx.globalAlpha=0.6+0.4*Math.sin(this.hitFlash*0.8);

    // far-side legs behind the hull, near-side in front (world space, planted)
    this._drawLegSide(-1, ox, oy);
    this._drawBarrelPart(wa, ox, oy, r);

    ctx.save();
    ctx.translate(this.x + ox, this.y + oy);
    ctx.rotate(this.angle);
    ctx.scale(this.playerIdx===0?1:-1, 1);
    const hull = TANK_PARTS[this.playerIdx].hull[this.hullState()];
    if (hull.complete && hull.naturalWidth > 0) {
      const dw = HULL_DRAW_W, dh = dw * hull.naturalHeight / hull.naturalWidth;
      // image center = turret-ball center = the mount point
      ctx.drawImage(hull, -dw / 2, -TANK_H * 0.75 - dh / 2, dw, dh);
    } else {
      this._drawOutline();
      this._drawBody();
      this._drawCockpit();
    }
    ctx.restore();

    this._drawLegSide(1, ox, oy);
    ctx.globalAlpha = 1;
    if (this.hitFlash>0) this.hitFlash--;
  }

  // The red-orange exhaust from Spider_Tank_2: a flickering plume under the
  // keel while SHIFT thrusts, bigger and hotter during the landing retro-burst
  _drawExhaust(ox, oy) {
    const retro = this.retroT > 0;
    if (!retro && this.thrustFx <= 0) return;
    const len = retro ? 22 + Math.random() * 10 : 14 + Math.random() * 7;
    const w   = retro ? 7 : 5;
    ctx.save();
    ctx.translate(this.x + ox, this.y + oy + 6);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0,    'rgba(255,220,150,0.95)');
    g.addColorStop(0.45, 'rgba(255,106,34,0.80)');
    g.addColorStop(1,    'rgba(200,40,10,0)');
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, 0); ctx.lineTo(w, 0);
    ctx.lineTo(Math.random() * 3 - 1.5, len);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff2d0';
    ctx.beginPath(); ctx.ellipse(0, 2.5, w * 0.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawLegSide(side, ox, oy) {
    if (!this.legs) return;
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    for (const leg of this.legs) {
      if (leg.side !== side) continue;
      const bx = leg.side * LEG_HIP_X[leg.k], by = LEG_HIP_Y;
      const hx = this.x + ox + bx * c - by * s;
      const hy = this.y + oy + bx * s + by * c;
      drawWhipLeg(hx, hy, leg.foot.x, leg.foot.y, leg.k, this.legCol, this.accentCol);
    }
  }

  _drawOutline() {
    // Pure white 1px silhouette outline — drawn first so tank colors paint over the interior.
    // Only the outer 1px remains visible, ringing the hull and cockpit cleanly.
    const W2 = TANK_W * 0.5, H2 = TANK_H * 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    // Hull
    ctx.beginPath();
    ctx.moveTo(-W2+3, -H2); ctx.lineTo( W2-3, -H2);
    ctx.lineTo( W2,   -H2+3); ctx.lineTo( W2,    H2-2);
    ctx.lineTo( W2-3,  H2);   ctx.lineTo(-W2+3,  H2);
    ctx.lineTo(-W2,    H2-2); ctx.lineTo(-W2,   -H2+3);
    ctx.closePath(); ctx.stroke();
    // Cockpit
    const ccx = 1, ccy = -TANK_H * 0.5 - 3, ccw = 8, cch = 5;
    ctx.beginPath();
    ctx.moveTo(ccx - ccw - 1, ccy);     ctx.lineTo(ccx + ccw + 1, ccy);
    ctx.lineTo(ccx + ccw - 1, ccy-cch); ctx.lineTo(ccx - ccw + 1, ccy-cch);
    ctx.closePath(); ctx.stroke();
  }

  _drawBody() {
    // Painted hull — fallback for when the Blender part layers are missing
    const W2 = TANK_W * 0.5, H2 = TANK_H * 0.5;

    // ---- Drop shadow ----
    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.beginPath();
    ctx.moveTo(-W2+3, -H2+4); ctx.lineTo(W2-3, -H2+4);
    ctx.lineTo(W2+2, H2+4);   ctx.lineTo(-W2+2, H2+4);
    ctx.closePath(); ctx.fill();

    // ---- Main hull body with bevelled corners ----
    ctx.fillStyle = this.col;
    ctx.beginPath();
    ctx.moveTo(-W2+3, -H2);
    ctx.lineTo( W2-3, -H2);
    ctx.lineTo( W2,   -H2+3);
    ctx.lineTo( W2,    H2-2);
    ctx.lineTo( W2-3,  H2);
    ctx.lineTo(-W2+3,  H2);
    ctx.lineTo(-W2,    H2-2);
    ctx.lineTo(-W2,   -H2+3);
    ctx.closePath();
    ctx.fill();

    // ---- Subtle body bevel gradient (top lighter, bottom darker) ----
    const bodyGrad = ctx.createLinearGradient(0, -H2, 0, H2);
    bodyGrad.addColorStop(0, 'rgba(255,255,255,0.14)');
    bodyGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-W2+3, -H2); ctx.lineTo(W2-3, -H2); ctx.lineTo(W2, -H2+3);
    ctx.lineTo(W2, H2-2);   ctx.lineTo(W2-3, H2);  ctx.lineTo(-W2+3, H2);
    ctx.lineTo(-W2, H2-2);  ctx.lineTo(-W2, -H2+3); ctx.closePath();
    ctx.fill();

    // ---- Accent stripe — top band ----
    ctx.fillStyle = this.accentCol;
    ctx.fillRect(-W2+3, -H2, TANK_W-6, 3);
    // Stripe highlight
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(-W2+4, -H2, (TANK_W-8)*0.6, 1);

    // ---- Panel lines — cross dividers giving armour-plate look ----
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.8;
    // Vertical centre line
    ctx.beginPath(); ctx.moveTo(0, -H2+3); ctx.lineTo(0, H2-2); ctx.stroke();
    // Horizontal mid-body line
    ctx.beginPath(); ctx.moveTo(-W2+2, 0); ctx.lineTo(W2-2, 0); ctx.stroke();
    // Light version of same lines (offset 1px for embossed illusion)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(1, -H2+3); ctx.lineTo(1, H2-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-W2+2, 1); ctx.lineTo(W2-2, 1); ctx.stroke();

    // ---- Rivet dots — 6 total ----
    ctx.fillStyle = '#0a0a0a';
    [[-W2+5,-H2+2],[W2-5,-H2+2],[-W2+5,H2-2],[W2-5,H2-2],[-2,0],[2,0]].forEach(([rx,ry])=>{
      ctx.beginPath(); ctx.arc(rx, ry, 1.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(rx-0.4, ry-0.4, 0.6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a0a0a';
    });

    // ---- Hull outer edge highlight (top bevel) ----
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-W2, -H2+3); ctx.lineTo(-W2+3, -H2);
    ctx.lineTo(W2-3, -H2); ctx.lineTo(W2, -H2+3); ctx.stroke();
    // Dark bottom edge
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-W2, H2-2); ctx.lineTo(-W2+3, H2);
    ctx.lineTo(W2-3, H2); ctx.lineTo(W2, H2-2); ctx.stroke();

  }

  _drawCockpit() {
    // Angular turret/cockpit — forward offset, with interior glow
    const cx = 1, cy = -TANK_H * 0.5 - 3, cw = 8, ch = 5;

    // Turret base — trapezoid shape (wider at bottom)
    ctx.fillStyle = this.accentCol;
    ctx.beginPath();
    ctx.moveTo(cx - cw - 1, cy);       // bottom-left
    ctx.lineTo(cx + cw + 1, cy);       // bottom-right
    ctx.lineTo(cx + cw - 1, cy - ch);  // top-right
    ctx.lineTo(cx - cw + 1, cy - ch);  // top-left
    ctx.closePath(); ctx.fill();

    // Turret bevel gradient
    const tGrad = ctx.createLinearGradient(cx, cy-ch, cx, cy);
    tGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    tGrad.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.moveTo(cx - cw - 1, cy);    ctx.lineTo(cx + cw + 1, cy);
    ctx.lineTo(cx + cw - 1, cy-ch); ctx.lineTo(cx - cw + 1, cy-ch);
    ctx.closePath(); ctx.fill();

    // Viewport slit — glowing interior colour
    const vpGrad = ctx.createLinearGradient(cx - cw + 2, cy-ch+1, cx - cw + 2, cy-1);
    vpGrad.addColorStop(0, this.cockpitCol);
    vpGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vpGrad;
    ctx.fillRect(cx - cw + 2, cy - ch + 1, (cw - 1) * 2, ch - 2);

    // Interior scan-line effect — 1px darker stripes
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let vy2 = cy - ch + 2; vy2 < cy - 1; vy2 += 2) {
      ctx.fillRect(cx - cw + 2, vy2, (cw-1)*2, 1);
    }

    // Glare flicks
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(cx - cw + 3, cy - ch + 1, 5, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - cw + 3, cy - ch + 2, 2, 1);

    // Cockpit border
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - cw - 1, cy);    ctx.lineTo(cx + cw + 1, cy);
    ctx.lineTo(cx + cw - 1, cy-ch); ctx.lineTo(cx - cw + 1, cy-ch);
    ctx.closePath(); ctx.stroke();

    // Top-edge cockpit highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cx - cw + 1, cy-ch); ctx.lineTo(cx + cw - 1, cy-ch); ctx.stroke();

  }
  // Returns the world-space angle the barrel is pointing, accounting for
  // the tank's body tilt (this.angle) and which player it is (flip).
  // This is the single source of truth used by both draw and fire.
  getBarrelWorldAngle() {
    // barrelAngle is stored as a left-facing angle (player 0 fires rightward at π/4,
    // player 1 fires leftward). We convert to a true world angle:
    //   player 0: world = -barrelAngle          (0=right, π/2=up)
    //   player 1: world = -(π - barrelAngle)    (mirror)
    // Then we add the body tilt.
    const flip = this.playerIdx === 0 ? 1 : -1;
    const localAngle = flip === 1 ? -this.barrelAngle : -(Math.PI - this.barrelAngle);
    return localAngle + this.angle;
  }

  // World-space position of the turret ball — mounted on TOP of the mid-hull
  // (never under the body). Single source of truth for draw, fire, and the
  // aim HUD.
  getMountPoint() {
    const h = TANK_H * 0.75;
    return {
      x: this.x + Math.sin(this.angle) * h,
      y: this.y - Math.cos(this.angle) * h,
    };
  }

  // Barrel part layer, drawn in world space from the visual mount (the true
  // mount plus breath/recoil offsets). Recoil also slides the barrel back in
  // its socket. Painted fallback matches the pre-render look.
  _drawBarrelPart(worldAngle, ox, oy, recoil) {
    const mount = this.getMountPoint();
    const img = TANK_PARTS[this.playerIdx].barrel;
    ctx.save();
    ctx.translate(mount.x + ox, mount.y + oy);
    ctx.rotate(worldAngle);
    ctx.translate(-recoil * 3.5, 0);
    if (img.complete && img.naturalWidth > 0) {
      const w = BARREL_LEN / (BARREL_TIP_FRAC - BARREL_ROOT_FRAC);
      const h = w * img.naturalHeight / img.naturalWidth;
      ctx.drawImage(img, -BARREL_ROOT_FRAC * w, -h / 2, w, h);
    } else {
      const bLen = BARREL_LEN;
      // ball (normally baked into the hull layer)
      ctx.fillStyle = '#141a20';
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#141a20';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bLen * 0.35, -0.5); ctx.stroke();
      ctx.lineWidth = 1.9;
      ctx.beginPath(); ctx.moveTo(bLen * 0.35, -0.5); ctx.lineTo(bLen - 5, 0); ctx.stroke();
      ctx.fillStyle = '#141a20';
      ctx.beginPath(); ctx.ellipse(bLen - 4, 0, 2.6, 1.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0d10';
      ctx.beginPath(); ctx.arc(bLen - 1.5, 0, 1.0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ============================================================
//  PROJECTILE
// ============================================================
const GRAVITY = 0.28;
const WEAPONS = [
  { name:'Shell',       color:'#dddd00', radius:5, blastR:42, dmg:75,  trail:'#ff8800' },
  { name:'Bomblets',    color:'#ff6600', radius:4, blastR:30, dmg:50,  trail:'#ff4400' },
  { name:'Rocket',      color:'#cc44ff', radius:5, blastR:48, dmg:100, trail:'#aa22cc' },
  { name:'Beam',        color:'#ffee66', radius:3, blastR:26, dmg:85,  trail:'#ffcc33' },
  { name:'Egg Sac',     color:'#e8d8b0', radius:6, blastR:22, dmg:40,  trail:'#c8b890' },
  { name:'Silk Bridge', color:'#f0f0e8', radius:4, blastR:0,  dmg:0,   trail:'#ddddd0' },
];

class Projectile {
  constructor(x,y,vx,vy,weaponType,fromPlayer) {
    this.x=x; this.y=y; this.vx=vx; this.vy=vy;
    this.type=weaponType; this.fromPlayer=fromPlayer;
    this.alive=true; this.trail=[]; this.age=0; this.wobble=0;
    this.isBomblet=false; this.splitTimer=0; this.bounces=0;
  }
  update() {
    this.trail.push([this.x,this.y]);
    if (this.trail.length>22) this.trail.shift();
    this.vy+=GRAVITY;
    if (this.type===2) { this.wobble+=0.18; this.vx+=Math.sin(this.wobble)*0.22; }
    this.x+=this.vx; this.y+=this.vy; this.age++;
    if (this.x<-50||this.x>W+50||this.y>H+50) { this.alive=false; stopWhistle(); return 'miss'; }
    if (this.x>=0&&this.x<TERRAIN_W&&this.y>=H-terrain[Math.floor(this.x)]) {
      if (this.type===4 && this.bounces>0) {
        // Egg sac takes one squashy bounce before it commits to hatching
        this.bounces--;
        this.y = H - terrain[Math.floor(this.x)] - 2;
        this.vy = -Math.abs(this.vy) * 0.55;
        this.vx *= 0.75;
        SFX.eggBounce();
        return null;
      }
      this.alive=false; stopWhistle(); return 'terrain';
    }
    return null;
  }
  draw() {
    const w=WEAPONS[this.type];
    for (let i=0;i<this.trail.length;i++) {
      ctx.globalAlpha=(i/this.trail.length)*0.7; ctx.fillStyle=w.trail;
      ctx.beginPath(); ctx.arc(this.trail[i][0],this.trail[i][1],Math.max(1,w.radius*(i/this.trail.length)*0.7),0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.fillStyle=w.color;
    if (this.type===2) {
      ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(Math.atan2(this.vy,this.vx));
      ctx.fillRect(-10,-3,18,6); ctx.fillStyle='#ff6622';
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(14,-5); ctx.lineTo(14,5); ctx.fill();
      ctx.restore();
    } else if (this.type===4) {
      // Egg sac — pale speckled ovoid tumbling through the air
      ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.age*0.08);
      ctx.fillStyle=w.color;
      ctx.beginPath(); ctx.ellipse(0,0,7,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(120,100,60,0.6)';
      [[-2,-1],[2,1],[0,2],[3,-2]].forEach(([sx,sy])=>{
        ctx.beginPath(); ctx.arc(sx,sy,0.9,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
    } else if (this.type===5) {
      // Silk glob with a strand trailing back along its arc
      ctx.strokeStyle='rgba(240,240,230,0.5)'; ctx.lineWidth=1;
      if (this.trail.length>1) {
        ctx.beginPath(); ctx.moveTo(this.trail[0][0],this.trail[0][1]);
        this.trail.forEach(p=>ctx.lineTo(p[0],p[1]));
        ctx.lineTo(this.x,this.y); ctx.stroke();
      }
      ctx.fillStyle=w.color;
      ctx.beginPath(); ctx.arc(this.x,this.y,4.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(this.x-1,this.y-1,1.5,0,Math.PI*2); ctx.fill();
    } else { ctx.beginPath(); ctx.arc(this.x,this.y,w.radius,0,Math.PI*2); ctx.fill(); }
  }
}

// ============================================================
//  EXPLOSION
// ============================================================
class Explosion {
  constructor(x,y,radius) {
    this.x=x; this.y=y; this.maxR=radius; this.r=2; this.age=0; this.maxAge=38; this.alive=true;
    this.particles=[];
    for (let i=0;i<24;i++) {
      const a=Math.random()*Math.PI*2, spd=1.5+Math.random()*5;
      this.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:1,
        col:[PAL.explosion0,PAL.explosion1,PAL.explosion2,PAL.explosion3][Math.floor(Math.random()*4)]});
    }
  }
  update() {
    this.age++; this.r=this.maxR*Math.sin((this.age/this.maxAge)*Math.PI);
    this.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life=1-this.age/this.maxAge;});
    if (this.age>=this.maxAge) this.alive=false;
  }
  draw() {
    const t=this.age/this.maxAge, ci=Math.min(3,Math.floor(t*4));
    ctx.globalAlpha=Math.max(0,1-t*1.2);
    ctx.fillStyle=[PAL.explosion0,PAL.explosion1,PAL.explosion2,PAL.explosion3][ci];
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=PAL.explosion0;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r*0.45,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    this.particles.forEach(p=>{
      ctx.globalAlpha=p.life*0.9; ctx.fillStyle=p.col;
      ctx.fillRect(p.x-2,p.y-2,4,4);
    });
    ctx.globalAlpha=1;
  }
}

// ============================================================
//  GAME STATE
// ============================================================
const STATES={MENU:'menu',COINFLIP:'coinflip',PLAYER_TURN:'player_turn',
  AI_TURN:'ai_turn',FIRING:'firing',EXPLODING:'exploding',
  TURN_TRANSITION:'turn_transition',GAME_OVER:'game_over',EJECTING:'ejecting'};

// mode is always 'training' for now — 2-player shelved (menu shows one START).
// The pvp plumbing stays for whenever it comes back.
let state='menu', mode='training', tanks=[], activePlayer=0;
let menuStartRect = null;      // START button hitbox, set by drawMenu
let menuPracticeRect = null;   // PRACTICE button hitbox, set by drawMenu
let projectiles=[], explosions=[];
let coinFlipTimer=0, coinResult='', transitionTimer=0;
let gameOverMsg='', movePixelsLeft=0, aiThinkTimer=0;

function placeTanks() {
  // Spawn tanks firmly on the flat pad zones
  const p1x = Math.floor(TERRAIN_W * 0.09);
  const p2x = Math.floor(TERRAIN_W * 0.91);
  tanks=[new Tank(p1x, 0), new Tank(p2x, 1)];
}

// ============================================================
//  INPUT
// ============================================================
const keys={};
document.addEventListener('keydown',e=>{
  if (!keys[e.code]) { keys[e.code]=true; handleKeyDown(e.code); }
  e.preventDefault();
});
document.addEventListener('keyup',e=>{ keys[e.code]=false; });

function handleKeyDown(code) {
  // Global: Escape always goes to menu, R restarts
  if (code==='Escape') { returnToMenu(); return; }
  if (code==='KeyR' && state !== STATES.MENU) { startGame(); return; }

  if (state===STATES.MENU) {
    if (code==='Space'||code==='Enter'||code==='KeyT') { mode='training'; startGame(); }
    if (code==='KeyP') { mode='practice'; startGame(); }
    return;
  }
  if (state===STATES.GAME_OVER) { if (code==='Space'||code==='Enter') returnToMenu(); return; }
  if (state!==STATES.PLAYER_TURN) return;
  const tank=tanks[activePlayer];
  if (!tank || !tank.alive) return;
  if (code==='Digit1') { tank.weapon=0; weaponLabelT=120; SFX.select(); }
  if (code==='Digit2') { tank.weapon=1; weaponLabelT=120; SFX.select(); }
  if (code==='Digit3') { tank.weapon=2; weaponLabelT=120; SFX.select(); }
  if (code==='Digit4') { tank.weapon=3; weaponLabelT=120; SFX.select(); }
  if (code==='Digit5') { tank.weapon=4; weaponLabelT=120; SFX.select(); }
  if (code==='Digit6') { tank.weapon=5; weaponLabelT=120; SFX.select(); }
  if (code==='KeyW'||code==='Space') {
    if (code==='KeyW') { tank.jump(); return; }
    fireTank(tank);
  }
}

function handleHeldKeys() {
  if (state!==STATES.PLAYER_TURN) return;
  const tank=tanks[activePlayer], spd=1.8;
  if (!tank || !tank.alive) return;
  // Movement lives on W/A/D (A/D walk, W jump) — the arrows are all gun.
  // The practice range has no move budget: roam freely.
  const free = mode==='practice';
  if (keys['KeyA'] && (free || movePixelsLeft>0)) { tank.move(-1,spd); if(!free) movePixelsLeft-=spd; SFX.move(); }
  if (keys['KeyD'] && (free || movePixelsLeft>0)) { tank.move( 1,spd); if(!free) movePixelsLeft-=spd; SFX.move(); }
  // SHIFT held = rocket thrust while the fuel meter lasts (W stays pure jump)
  if (keys['ShiftLeft'] || keys['ShiftRight']) tank.thrust();
  // Aim on ←/→ in screen direction: ← swings the barrel tip leftward for
  // either player, → rightward (barrelAngle is mirrored for P2, hence aimDir).
  // The 2500-series ball mount has a wide range of motion but sits on TOP of
  // the hull — the barrel never sweeps below the hull plane (James's brief).
  const aimDir = tank.playerIdx === 0 ? 1 : -1;
  const prevBarrel = tank.barrelAngle;
  const prevSin = Math.sin(tank.getBarrelWorldAngle());
  if (keys['ArrowLeft'])  tank.barrelAngle += 0.012 * aimDir;
  if (keys['ArrowRight']) tank.barrelAngle -= 0.012 * aimDir;
  const newSin = Math.sin(tank.getBarrelWorldAngle());
  // Block only motion that goes further below the plane (sin > 0.14 ≈ 8°
  // under horizontal), never motion escaping it — tilt can't trap the barrel.
  if (newSin > 0.14 && newSin > prevSin) tank.barrelAngle = prevBarrel;
  // Keep angle in 0..2π range for display purposes only
  tank.barrelAngle = ((tank.barrelAngle % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
  // Power on ↑/↓ (the old -/+ and bracket keys still work)
  if (keys['ArrowDown']||keys['Minus']||keys['BracketLeft'])  tank.power=Math.max(5,  tank.power-0.35);
  if (keys['ArrowUp']||keys['Equal']||keys['BracketRight'])   tank.power=Math.min(100,tank.power+0.35);
}

// ============================================================
//  GAME FLOW
// ============================================================
function resetPresentation() {
  lights=[]; dmgTexts=[]; plateShards=[];
  slowmoT=0; stepAcc=0; impactFocus={x:0,y:0,t:0,big:false};
  cam.x=W/2; cam.y=H/2; cam.z=1; cam.shakeMag=0; cam.flash=0;
  weaponLabelT=0;
}
function startGame() {
  pickBiome();   // before generateTerrain — the terrain renders in biome colours
  generateTerrain(); projectiles=[]; explosions=[]; crawlers=[]; beams=[];
  ejectFx=null; exitTriggered=false; exitCountdown=0;
  aiLastHp = 500; aiWasHitLastTurn = false; aiTurnCount = 0;
  resetPresentation();
  if (mode==='practice') {
    // Straight onto the range: no coin toss, no turns, P1 forever
    activePlayer = 0;
    beginTurn();
    return;
  }
  state=STATES.COINFLIP; coinFlipTimer=90; SFX.coinflip();
}
function returnToMenu() {
  state=STATES.MENU; tanks=[]; projectiles=[]; explosions=[]; crawlers=[]; beams=[];
  ejectFx=null; decorationList=[]; terrainPixels=null;
  resetPresentation();
}
function doCoinFlip() {
  activePlayer=Math.random()<0.5?0:1;
  coinResult=activePlayer===0?'PLAYER 1 GOES FIRST!':(mode==='training'?'COMPUTER GOES FIRST!':'PLAYER 2 GOES FIRST!');
}
function beginTurn() {
  movePixelsLeft=MAX_MOVE;
  tanks[activePlayer].fuel = FUEL_MAX;
  weaponLabelT = 120;
  if (mode==='training'&&activePlayer===1) { state=STATES.AI_TURN; aiThinkTimer=60+Math.floor(Math.random()*60); }
  else state=STATES.PLAYER_TURN;
}
function endTurn() {
  if (mode==='practice') { state=STATES.PLAYER_TURN; return; }   // no turns on the range
  activePlayer=1-activePlayer; state=STATES.TURN_TRANSITION; transitionTimer=50;
}

// ============================================================
//  FIRING
// ============================================================
function fireTank(tank) {
  const bLen = BARREL_LEN; // match visual barrel length

  // --- AI safety: NEVER let the computer fire anything but a parabolic arc up-left ---
  if (tank.playerIdx === 1) {
    // Work in world-angle space so body tilt is always accounted for.
    // getBarrelWorldAngle() = -(π - barrelAngle) + bodyTilt
    // We want worldAngle such that sin(worldAngle) < 0 (upward in canvas) and
    // the shot has real upward velocity (not just grazing up).
    // Clamp the barrelAngle so the resulting worldAngle lands in a safe arc,
    // but derive the clamp from the world angle directly.
    const bodyTilt = tank.angle;
    // World angle we want: leftward and strictly upward.
    // Safe world-angle range: [-π*0.92, -π*0.45] (steep-left to near-vertical)
    const WA_MIN = -Math.PI * 0.92;  // almost flat left — limit
    const WA_MAX = -Math.PI * 0.45;  // steep upward-left
    // Convert desired world-angle bounds back to barrelAngle:
    //   worldAngle = -(π - barrelAngle) + bodyTilt  →  barrelAngle = π + worldAngle - bodyTilt
    const baMin = Math.PI + WA_MIN - bodyTilt;
    const baMax = Math.PI + WA_MAX - bodyTilt;
    tank.barrelAngle = Math.max(baMin, Math.min(baMax, tank.barrelAngle));
    // Hard verify: if world angle still isn't upward, force it.
    const testAngle = tank.getBarrelWorldAngle();
    if (Math.sin(testAngle) >= 0) {
      // Force world angle to -π*0.65 (steep up-left), solving for barrelAngle:
      tank.barrelAngle = Math.PI + (-Math.PI * 0.65) - bodyTilt;
      tank.power = Math.max(tank.power, 80);
    }
  }

  // Get the single source-of-truth world angle (same as draw uses)
  const worldAngle = tank.getBarrelWorldAngle();
  // Barrel tip in world space, measured from the top-of-hull turret mount
  const mount = tank.getMountPoint();
  const wx = mount.x + Math.cos(worldAngle) * bLen;
  const wy = mount.y + Math.sin(worldAngle) * bLen;
  // Velocity exactly along the barrel direction
  const speed = 4 + tank.power * 0.14;
  const vx = Math.cos(worldAngle) * speed;
  const vy = Math.sin(worldAngle) * speed;
  SFX.shoot(tank.weapon);
  // Muzzle flash lights the legs; the hull flinches back while the planted
  // legs absorb the recoil (visual only — the shot has already left)
  addLight(wx, wy, 70, 0.5, 12);
  addShake(1.0);
  tank.recoilT = 1;
  // Practice range: stay in PLAYER_TURN — keep roaming while the shot flies
  const nextState = mode==='practice' ? state : STATES.FIRING;
  if (tank.weapon===3) { fireBeam(tank, wx, wy, worldAngle); state=nextState; return; }
  const p = new Projectile(wx, wy, vx, vy, tank.weapon, tank.playerIdx);
  if (tank.weapon===1) { p.isBomblet=true; p.splitTimer=80; }
  if (tank.weapon===4) { p.bounces=1; }
  projectiles.push(p); state=nextState;
}

function spawnBomblets(x,y,vx,vy,fromPlayer) {
  // Bomblets continue along the parent shell's heading, fanned out around it,
  // inheriting most of its momentum — the burst carries forward, never backward.
  const heading = Math.atan2(vy, vx);
  const speed   = Math.max(2.5, Math.hypot(vx, vy));
  SFX.bombletSplit();
  for (let i=0;i<5;i++) {
    const a   = heading + (i-2)*0.14 + (Math.random()*0.06-0.03);
    const spd = speed * (0.7 + Math.random()*0.4);
    projectiles.push(new Projectile(x,y,Math.cos(a)*spd,Math.sin(a)*spd,1,fromPlayer));
  }
}

// Floating damage ticks + armor plate shards (visual, world-space)
let dmgTexts = [];      // {x, y, val, life}
let plateShards = [];   // {x, y, vx, vy, rot, vr, life, col}

// Shared blast application — crater, splash damage, explosion, target check.
// Splash zones: direct (< blastR+18) full, inner (×2.2) 50%, outer (×3.5) 20%.
function applyBlast(x, y, blastR, dmg) {
  deformTerrain(x, y, blastR);
  SFX.crumble();
  let anyHit = false;
  tanks.forEach(t => {
    if (!t.alive) return;
    const dist = Math.hypot(t.x - x, t.y - y);
    let dmgFraction = 0;
    if      (dist < blastR + 18)          dmgFraction = 1.0;
    else if (dist < (blastR + 18) * 2.2)  dmgFraction = 0.50;
    else if (dist < (blastR + 18) * 3.5)  dmgFraction = 0.20;
    if (dmgFraction > 0) {
      const dealt = Math.round(dmg * dmgFraction);
      t.hp -= dealt; t.hitFlash = 20; anyHit = true;
      dmgTexts.push({ x: t.x + (Math.random()*16-8), y: t.y - 44, val: dealt, life: 55 });
      if (t.hp <= 0) {
        t.hp = 0; t.alive = false;
        // The killing blow gets its moment: slow-mo + tight focus
        slowmoT = 85;
        impactFocus = { x: t.x, y: t.y, t: 85, big: true };
      }
    }
  });
  if (anyHit) SFX.tankHit();
  SFX.explode(anyHit);
  explosions.push(new Explosion(x, y, blastR * 1.2));
  // Impact presentation: shake by blast size, light the scene, flash on big ones
  addShake(blastR * 0.12);
  addLight(x, y, blastR * 4.2, 0.55, 34);
  if (blastR >= 40) cam.flash = Math.max(cam.flash, 0.35);
  if (slowmoT === 0) impactFocus = { x, y, t: 16, big: blastR >= 40 };
  checkTargetHit(x, y, blastR + 14);
  return anyHit;
}

function handleImpact(proj) {
  const w = WEAPONS[proj.type];
  applyBlast(proj.x, proj.y, w.blastR, w.dmg);
}

// ============================================================
//  BEAM — hitscan lance that burns a limited depth through rock
// ============================================================
let beams = [];
const BEAM_BURN_BUDGET = 40;   // rock steps the beam can melt through (3px each)

function fireBeam(tank, sx, sy, angle) {
  const dx = Math.cos(angle) * 3, dy = Math.sin(angle) * 3;
  let x = sx, y = sy, burn = BEAM_BURN_BUDGET, burned = false;
  for (let step = 0; step < 700 && burn > 0; step++) {
    x += dx; y += dy;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) break;
    // Enemy tank in the path
    const hit = tanks.find(t => t.alive && t.playerIdx !== tank.playerIdx &&
      Math.hypot(t.x - x, t.y - y) < 20);
    if (hit) { applyBlast(x, y, WEAPONS[3].blastR, WEAPONS[3].dmg); break; }
    // OUT target in the path
    if (checkTargetHit(x, y, 6)) break;
    // Rock: melt a narrow channel and spend burn budget
    const xi = Math.floor(x);
    if (xi >= 0 && xi < TERRAIN_W && y >= H - terrain[xi]) {
      burn--; burned = true;
      deformTerrain(x, y, 7, true);
    }
  }
  if (burned) { SFX.beamBurn(); renderTerrainCanvas(); }
  if (burn <= 0) explosions.push(new Explosion(x, y, 18));
  addLight(x, y, 120, 0.4, 22, '255,238,150');
  beams.push({ x1: sx, y1: sy, x2: x, y2: y, life: 26, maxLife: 26 });
}

function drawBeam(b) {
  ctx.save();
  ctx.globalAlpha = b.life / b.maxLife;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#ffee66'; ctx.shadowBlur = 14;
  ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  ctx.restore();
}

// ============================================================
//  EGG SAC → SPIDERLINGS
// ============================================================
let crawlers = [];

function hatchEgg(proj) {
  SFX.hatch();
  explosions.push(new Explosion(proj.x, proj.y, 14));
  for (let i = 0; i < 3; i++) {
    crawlers.push(new Spiderling(proj.x + (i - 1) * 8, proj.fromPlayer));
  }
}

class Spiderling {
  constructor(x, fromPlayer) {
    this.x = Math.max(5, Math.min(TERRAIN_W - 5, x));
    this.fromPlayer = fromPlayer;
    this.speed = 1.1 + Math.random() * 0.5;
    this.age = 0; this.life = 240 + Math.random() * 90;
    this.phase = Math.random() * 6.28;
    this.dir = 1; this.alive = true;
  }
  get y() {
    return H - terrain[Math.max(0, Math.min(TERRAIN_W - 1, Math.floor(this.x)))] - 4;
  }
  update() {
    this.age++;
    const enemy = tanks.find(t => t.alive && t.playerIdx !== this.fromPlayer);
    if (enemy) this.dir = Math.sign(enemy.x - this.x) || this.dir;
    this.x += this.dir * this.speed;
    this.x = Math.max(5, Math.min(TERRAIN_W - 5, this.x));
    if (checkTargetHit(this.x, this.y, 10)) { this.alive = false; return; }
    if (enemy && Math.hypot(enemy.x - this.x, enemy.y - this.y) < 22) { this.pop(); return; }
    if (this.age > this.life) this.pop();
  }
  pop() {
    this.alive = false;
    SFX.spiderlingPop();
    applyBlast(this.x, this.y, 16, 35);
  }
  draw() {
    // Cheap whip-scuttle (roadmap #19's little cousin): each needle leg creeps
    // slowly through its arc, then snaps back — kinked high like the parents.
    const y = this.y;
    ctx.save(); ctx.translate(this.x, y);
    ctx.strokeStyle = '#12100c'; ctx.lineCap = 'round';
    for (let l = 0; l < 8; l++) {
      const side = l < 4 ? 1 : -1, li = l % 4;
      const f = (this.phase / 6.28 + this.age * 0.055 + li * 0.27 + (side > 0 ? 0.5 : 0)) % 1;
      const sw = f < 0.72 ? -1.8 + 3.4 * (f / 0.72) : 1.6 - 3.4 * ((f - 0.72) / 0.28);
      const kx = side * (2.2 + li * 0.8) + sw * 0.4, ky = -3.2 - li * 0.3;
      const fx = side * (3.5 + li) + sw, fy = 4 - li * 0.5;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    }
    ctx.fillStyle = '#1a1210';
    ctx.beginPath(); ctx.ellipse(0, -1, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e84040';
    ctx.fillRect(this.dir * 1.5 - 0.5, -2, 1, 1);
    ctx.restore();
  }
}

// ============================================================
//  SILK BRIDGE — raises a walkable strand of terrain across a gap
// ============================================================
function buildSilkBridge(cx) {
  SFX.silkBuild();
  const HALF = 80;
  const x0 = Math.max(2, Math.floor(cx - HALF));
  const x1 = Math.min(TERRAIN_W - 3, Math.floor(cx + HALF));
  if (x1 - x0 < 8) return;
  const h0 = terrain[x0], h1 = terrain[x1];
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    // Anchored to the rims with a gentle upward camber mid-span
    const line = h0 + (h1 - h0) * t + Math.sin(t * Math.PI) * 8;
    if (terrain[x] < line) terrain[x] = terrain[x] * 0.2 + line * 0.8;
  }
  decorationList.push({ type: 'silk', x: cx, baseTerrainH: -9999, size: HALF * 2, variant: 0 });
  renderTerrainCanvas();
}

// ============================================================
//  OUT TARGETS — bullseyes behind each tank; hit one, drift out
// ============================================================
const OUT_TARGETS = [{ x: 22 }, { x: W - 22 }];
const TARGET_R = 15;
let exitCountdown = 0;     // frames until the drift once an exit fires
let exitTriggered = false;

function targetY(t) {
  const xi = Math.max(0, Math.min(TERRAIN_W - 1, Math.floor(t.x)));
  return H - terrain[xi] - 38;
}

function checkTargetHit(x, y, r) {
  if (exitTriggered || state === STATES.MENU) return false;
  for (const t of OUT_TARGETS) {
    if (Math.hypot(t.x - x, targetY(t) - y) < r + TARGET_R) {
      exitTriggered = true;
      exitCountdown = 80;
      SFX.targetHit();
      explosions.push(new Explosion(t.x, targetY(t), 30));
      return true;
    }
  }
  return false;
}

function drawTargets() {
  OUT_TARGETS.forEach(t => {
    const ty = targetY(t);
    const gy = ty + 38;
    // Post
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(t.x, gy); ctx.lineTo(t.x, ty); ctx.stroke();
    // Bullseye rings
    [[TARGET_R, '#f4ead8'], [TARGET_R * 0.72, '#c03028'],
     [TARGET_R * 0.45, '#f4ead8'], [TARGET_R * 0.2, '#c03028']].forEach(([r, c]) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(t.x, ty, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(t.x, ty, TARGET_R, 0, Math.PI * 2); ctx.stroke();
    // OUT sign above
    const sy = ty - TARGET_R - 20;
    ctx.fillStyle = '#4a2c14'; ctx.fillRect(t.x - 17, sy - 8, 34, 16);
    ctx.strokeStyle = '#2a180a'; ctx.lineWidth = 1; ctx.strokeRect(t.x - 17, sy - 8, 34, 16);
    ctx.fillStyle = '#f0e0c0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('OUT', t.x, sy + 4);
  });
}

// ============================================================
//  BLIMP — a slow dirigible crossing the sky; click it to drift on
// ============================================================
const blimp = { x: -90, y: 170, dir: 1, speed: 0.35, wait: 0 };

function updateBlimp() {
  if (blimp.wait > 0) { blimp.wait--; return; }
  blimp.x += blimp.dir * blimp.speed;
  if ((blimp.dir === 1 && blimp.x > W + 90) || (blimp.dir === -1 && blimp.x < -90)) {
    blimp.wait = 600 + Math.random() * 900;
    blimp.dir *= -1;
    blimp.y = 130 + Math.random() * 90;
  }
}

function blimpHit(px, py) {
  if (blimp.wait > 0) return false;
  const dx = (px - blimp.x) / 46, dy = (py - blimp.y) / 18;
  return dx * dx + dy * dy < 1.4;
}

function drawBlimp() {
  if (blimp.wait > 0) return;
  ctx.save();
  ctx.translate(blimp.x, blimp.y + Math.sin(Date.now() * 0.001) * 2);
  ctx.scale(blimp.dir, 1);
  // Envelope with stripes
  ctx.fillStyle = '#8a4f3a';
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 14, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#c4a06a';
  ctx.fillRect(-42, -4, 84, 4);
  ctx.fillStyle = 'rgba(240,220,180,0.35)';
  ctx.fillRect(-42, -12, 84, 4);
  ctx.restore();
  // Tail fins
  ctx.fillStyle = '#6a3a28';
  ctx.beginPath(); ctx.moveTo(-34, -6); ctx.lineTo(-52, -14); ctx.lineTo(-46, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-34, 6); ctx.lineTo(-52, 14); ctx.lineTo(-46, 0); ctx.closePath(); ctx.fill();
  // Top highlight
  ctx.fillStyle = 'rgba(255,240,210,0.25)';
  ctx.beginPath(); ctx.ellipse(-6, -6, 22, 4.5, -0.08, 0, Math.PI * 2); ctx.fill();
  // Gondola with lit windows
  ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-7, 12); ctx.lineTo(-8, 15); ctx.moveTo(7, 12); ctx.lineTo(8, 15); ctx.stroke();
  ctx.fillStyle = '#3a2818';
  ctx.beginPath(); ctx.roundRect(-9, 14, 18, 7, 2); ctx.fill();
  ctx.fillStyle = '#ffd060';
  ctx.fillRect(-6, 16, 3, 2); ctx.fillRect(0, 16, 3, 2); ctx.fillRect(5, 16, 2, 2);
  ctx.restore();
}

// ============================================================
//  EJECT — blow the canopy, launch the little guy, drift away
// ============================================================
let ejectFx = null;

function startEject(tank) {
  if (state !== STATES.PLAYER_TURN) return;
  SFX.eject();
  explosions.push(new Explosion(tank.x, tank.y - 14, 20));
  const away = tank.playerIdx === 0 ? 1 : -1;
  ejectFx = {
    timer: 85,
    canopy: { x: tank.x, y: tank.y - 16, vx: away * 1.6, vy: -5.2, rot: 0, vr: away * 0.16 },
    pilot:  { x: tank.x, y: tank.y - 16, vx: away * 0.5, vy: -7.8, flail: 0 },
  };
  state = STATES.EJECTING;
}

function updateEject() {
  const fx = ejectFx;
  if (!fx) { state = STATES.PLAYER_TURN; return; }
  const c = fx.canopy, p = fx.pilot;
  c.x += c.vx; c.y += c.vy; c.vy += 0.28; c.rot += c.vr;
  p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.flail += 0.35;
  explosions.forEach(e => e.update()); explosions = explosions.filter(e => e.alive);
  fx.timer--;
  if (fx.timer <= 0) triggerDriftExit();
}

function drawEject() {
  const fx = ejectFx; if (!fx) return;
  const c = fx.canopy, p = fx.pilot;
  // Canopy — the blown-off dome shard, tumbling
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
  ctx.fillStyle = '#20303a';
  ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, -1, 7, Math.PI * 1.15, Math.PI * 1.7); ctx.stroke();
  ctx.restore();
  // The little guy, flailing skyward
  ctx.save(); ctx.translate(p.x, p.y);
  const f = Math.sin(p.flail) * 0.7;
  ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-5, -7 + f * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(5, -7 - f * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-4, 10 - f * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(4, 10 + f * 1.5); ctx.stroke();
  ctx.fillStyle = '#f0c890';
  ctx.beginPath(); ctx.arc(0, -6, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Drift via the hidden portal anchor so drift.js handles destination + state.
function triggerDriftExit() {
  const a = document.getElementById('drift-exit');
  if (a) a.click();
  else window.location.href = '../../../index.html';
}

// ============================================================
//  MOUSE — the eject card and the blimp are clickable
// ============================================================
function toGameCoords(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}

// Screen-space HUD strip hit-testing (weapon chips + EJECT chip)
function stripHit(p) {
  if (state !== STATES.PLAYER_TURN) return null;
  for (const r of stripRects) {
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return r;
  }
  return null;
}

function overStartButton(p) {
  return state === STATES.MENU && menuStartRect &&
    p.x >= menuStartRect.x && p.x <= menuStartRect.x + menuStartRect.w &&
    p.y >= menuStartRect.y && p.y <= menuStartRect.y + menuStartRect.h;
}

function overPracticeButton(p) {
  return state === STATES.MENU && menuPracticeRect &&
    p.x >= menuPracticeRect.x && p.x <= menuPracticeRect.x + menuPracticeRect.w &&
    p.y >= menuPracticeRect.y && p.y <= menuPracticeRect.y + menuPracticeRect.h;
}

canvas.addEventListener('click', (e) => {
  const p = toGameCoords(e);
  if (state === STATES.MENU) {
    if (overStartButton(p))         { mode = 'training'; startGame(); }
    else if (overPracticeButton(p)) { mode = 'practice'; startGame(); }
    return;
  }
  const r = stripHit(p);
  if (r) {
    if (r.eject) startEject(tanks[activePlayer]);
    else { tanks[activePlayer].weapon = r.wpn; weaponLabelT = 120; SFX.select(); }
    return;
  }
  // The blimp lives in world space — convert through the camera
  const wp = screenToWorld(p);
  if (state !== STATES.MENU && blimpHit(wp.x, wp.y)) triggerDriftExit();
});

canvas.addEventListener('mousemove', (e) => {
  const p = toGameCoords(e);
  const wp = screenToWorld(p);
  const hot = overStartButton(p) || overPracticeButton(p) ||
    (state !== STATES.MENU && (!!stripHit(p) || blimpHit(wp.x, wp.y)));
  canvas.style.cursor = hot ? 'pointer' : 'default';
});

// ============================================================
//  AI
// ============================================================
let aiWasHitLastTurn = false;   // set in handleImpact when AI takes damage
let aiLastHp = 500;             // tracked to detect hits
let aiTurnCount = 0;            // firing turns taken — drives the warm-up difficulty curve

// Simulate a projectile trajectory and return true if it hits near the target
// without hitting terrain first.
function aiSimulateShot(startX, startY, vx, vy, targetX, targetY, hitRadius) {
  let x = startX, y = startY, dvx = vx, dvy = vy;
  // Grace period: skip terrain collision for first N steps so shots fired
  // from inside craters have time to arc upward and clear the rim.
  const GRACE = 30;
  for (let step = 0; step < 1200; step++) {
    dvy += GRAVITY;
    x += dvx; y += dvy;
    if (x < 0 || x >= TERRAIN_W || y > H + 50) return false;
    // Hit terrain (ignored during grace period)
    if (step >= GRACE && x >= 0 && x < TERRAIN_W && y >= H - terrain[Math.floor(x)]) return false;
    // Hit target area
    const dx = x - targetX, dy2 = y - targetY;
    if (Math.sqrt(dx*dx + dy2*dy2) < hitRadius) return true;
  }
  return false;
}

// *** ABSOLUTE RULE: AI ALWAYS fires a high parabolic arc. ***
// *** NEVER a flat shot. NEVER fire rightward. Always arc UP and LEFT. ***
//
// barrelAngle convention for player 1 (AI):
//   worldAngle = -(π - barrelAngle) + bodyTilt
//   barrelAngle ≈ 0    → worldAngle ≈ -π   → pointing LEFT (flat)
//   barrelAngle = π/2  → worldAngle ≈ -π/2 → pointing straight UP
//   barrelAngle ≈ π    → worldAngle ≈  0   → pointing RIGHT (BAD)
//
// For steep upward-left parabolic arcs:
//   barrelAngle in [π*0.08, π*0.55] gives worldAngle in [-π*0.92, -π*0.45]
//   = angles from steep-left through vertical to steep-up-left ✓
//
// Returns { angle, power } in barrelAngle convention (for player 1 / AI).
function aiSolveShot(ai, target) {
  const hitRadius = 30;
  const bLen = BARREL_LEN; // must match fireTank barrel length
  const powers = [85, 75, 65, 95, 55, 45, 100];

  // ONLY parabolic arcs that go UP and LEFT
  const MIN_ARC = Math.PI * 0.08;
  const MAX_ARC = Math.PI * 0.55;
  const STEPS = 35;

  for (let step = 0; step <= STEPS; step++) {
    const bAngle = MIN_ARC + (step / STEPS) * (MAX_ARC - MIN_ARC);
    const worldAngle = -(Math.PI - bAngle) + ai.angle;
    // Safety: skip if the world angle would fire downward or rightward.
    // sin(worldAngle) must be strictly negative (upward in canvas coords).
    if (Math.sin(worldAngle) >= 0) continue;
    if (Math.cos(worldAngle) > 0.0) continue;
    const aiMount = ai.getMountPoint();
    const startX = aiMount.x + Math.cos(worldAngle) * bLen;
    const startY = aiMount.y + Math.sin(worldAngle) * bLen;
    for (const pwr of powers) {
      const speed = 4 + pwr * 0.14;
      const vx = Math.cos(worldAngle) * speed;
      const vy = Math.sin(worldAngle) * speed;
      if (aiSimulateShot(startX, startY, vx, vy, target.x, target.y, hitRadius)) {
        const variance = (Math.random() * 0.04 - 0.02);
        const finalAngle = Math.max(MIN_ARC, Math.min(MAX_ARC, bAngle + variance));
        return { angle: finalAngle, power: pwr + (Math.random()*8-4) };
      }
    }
  }

  // No valid shot found — default to steep upward-left lob
  return { angle: Math.PI * 0.35 + (Math.random()*0.08-0.04), power: 88 + (Math.random()*12-6) };
}

function aiAct() {
  const ai=tanks[1], target=tanks[0];

  // Detect if AI was hit since its last turn
  const wasHit = ai.hp < aiLastHp;
  aiLastHp = ai.hp;

  // If hit, scramble at least 1–2 body lengths then fire a panic shot
  if (wasHit) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    // Move at least 1 body length (TANK_W), up to 2.5 body lengths
    const targetDist = TANK_W * (1.0 + Math.random() * 1.5);
    let moved = 0;
    while (moved < targetDist) {
      const step = Math.min(2, targetDist - moved);
      const prevX = ai.x;
      ai.move(dir, step);
      // If we hit a wall (move() clamped us), stop
      if (Math.abs(ai.x - prevX) < 0.01) break;
      moved += step;
    }
    movePixelsLeft = 0;
    // Panic shot — wildly inaccurate but ALWAYS a high parabolic arc upward-left
    const dist=Math.abs(target.x-ai.x);
    const power=Math.max(40,Math.min(95,dist*0.09+35));
    // Panic angle in valid range [π*0.08, π*0.55] — center around π*0.35 (steep up-left)
    const panicAngle = Math.PI * 0.35 + (Math.random() * 0.20 - 0.10);
    ai.barrelAngle = Math.max(Math.PI * 0.08, Math.min(Math.PI * 0.55, panicAngle));
    ai.power=power+(Math.random()*20-10);
    ai.weapon=[0,1,2,4][Math.floor(Math.random()*4)];
    fireTank(ai);
    return;
  }

  // Mandatory reposition: 1–2 tank lengths before every shot
  const moveDist = TANK_W * (1.0 + Math.random());
  const moveDir  = Math.random() < 0.5 ? -1 : 1;
  let moved = 0;
  while (moved < moveDist) {
    const step = Math.min(2, moveDist - moved);
    const prevX = ai.x;
    ai.move(moveDir, step);
    if (Math.abs(ai.x - prevX) < 0.01) break;
    moved += step;
  }

  // Ballistic solver — simulate trajectory to find a shot that clears terrain
  // (no beam — the solver is ballistic; no silk — the AI doesn't build)
  ai.weapon = [0,1,2,4][Math.floor(Math.random() * 4)];

  // Difficulty: the computer warms up over the match. Early turns it's
  // sloppy (fun to play against); by ~turn 8 it shoots like it used to.
  aiTurnCount++;
  const skill = Math.min(1, aiTurnCount / 8);

  if (Math.random() < 0.55 - 0.35 * skill) {
    // Deliberate near-miss: solve for a spot beside the player, not on them.
    // Craters land close enough to feel dangerous without connecting.
    const off = (60 + Math.random() * 120) * (Math.random() < 0.5 ? -1 : 1);
    const fake = { x: clamp(target.x + off, 40, TERRAIN_W - 40), y: target.y };
    const alt = aiSolveShot(ai, fake);
    ai.barrelAngle = alt.angle;
    ai.power = alt.power;
  } else {
    // Intended hit, but with hand-wobble that fades as it warms up
    const { angle: solvedAngle, power: solvedPower } = aiSolveShot(ai, target);
    const wob = 0.02 + (1 - skill) * 0.08;
    ai.barrelAngle = clamp(solvedAngle + (Math.random() * 2 - 1) * wob,
                           Math.PI * 0.08, Math.PI * 0.55);
    ai.power = solvedPower + (Math.random() * 2 - 1) * (4 + (1 - skill) * 14);
  }
  fireTank(ai);
}

// ============================================================
//  HUD  —  diegetic: the world carries the interface
// ============================================================
let stripRects = [];    // screen-space weapon strip + eject chip hit rects
let weaponLabelT = 0;   // frames the weapon name stays visible after a switch

// Weapon icons drawn as tiny pictograms (7×7 canvas space each)
const WPN_ICONS = [
  // Shell — circle with line
  (x,y) => {
    ctx.strokeStyle='#dddd00'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(x+3,y+3,2.5,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#dddd00'; ctx.fillRect(x+5,y+2,4,2);
  },
  // Bomblets — three small circles
  (x,y) => {
    ctx.fillStyle='#ff6600';
    [[x+1,y+4],[x+4,y+4],[x+2,y+2]].forEach(([bx,by])=>{
      ctx.beginPath(); ctx.arc(bx,by,1.5,0,Math.PI*2); ctx.fill();
    });
  },
  // Rocket — elongated with fins
  (x,y) => {
    ctx.fillStyle='#cc44ff';
    ctx.beginPath(); ctx.moveTo(x+8,y+3); ctx.lineTo(x+2,y+1.5); ctx.lineTo(x+2,y+4.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#8822aa';
    ctx.beginPath(); ctx.moveTo(x+2,y+1.5); ctx.lineTo(x,y+0); ctx.lineTo(x,y+3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+2,y+4.5); ctx.lineTo(x,y+6); ctx.lineTo(x,y+3); ctx.closePath(); ctx.fill();
  },
  // Beam — glowing lance
  (x,y) => {
    ctx.strokeStyle='#ffee66'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y+5.5); ctx.lineTo(x+8,y+1); ctx.stroke();
    ctx.fillStyle='#fffbe0'; ctx.fillRect(x+7,y,3,3);
  },
  // Egg sac — speckled oval
  (x,y) => {
    ctx.fillStyle='#e8d8b0';
    ctx.beginPath(); ctx.ellipse(x+4.5,y+3.5,4,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8a7648';
    ctx.fillRect(x+3,y+2,1,1); ctx.fillRect(x+6,y+4,1,1); ctx.fillRect(x+4,y+5,1,1);
  },
  // Silk bridge — sagging strand with stitches
  (x,y) => {
    ctx.strokeStyle='#f0f0e8'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(x,y+5); ctx.quadraticCurveTo(x+4.5,y+1,x+9,y+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+2.5,y+3.6); ctx.lineTo(x+2.5,y+6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+6.5,y+3.6); ctx.lineTo(x+6.5,y+6); ctx.stroke();
  },
];

// ---- World-space HUD: drawn inside the camera, lives on the battlefield ----
function drawWorldHUD() {
  tanks.forEach(t => drawTankArmor(t));
  drawPlateShards();
  drawDmgTexts();

  const t = tanks[activePlayer];
  if (!t || !t.alive) return;

  // Active-tank marker: bobbing chevron in the player's colour
  if (state === STATES.PLAYER_TURN || state === STATES.AI_TURN) {
    const bob = Math.sin(Date.now() * 0.006) * 3;
    ctx.fillStyle = t.cockpitCol;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(t.x - 7, t.y - 66 + bob);
    ctx.lineTo(t.x + 7, t.y - 66 + bob);
    ctx.lineTo(t.x, t.y - 57 + bob);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (state === STATES.AI_TURN) {
    // Thinking dots above the AI tank (replaces the old centre overlay)
    const n = 1 + Math.floor(Date.now() / 350) % 3;
    ctx.fillStyle = t.cockpitCol; ctx.font = `bold 20px ${FONT_U}`; ctx.textAlign = 'left';
    ctx.fillText('.'.repeat(n), t.x + 14, t.y - 62);
    return;
  }
  if (state !== STATES.PLAYER_TURN) return;

  const worldAngle = t.getBarrelWorldAngle();
  const mount = t.getMountPoint();
  const tipX = mount.x + Math.cos(worldAngle) * BARREL_LEN;
  const tipY = mount.y + Math.sin(worldAngle) * BARREL_LEN;

  // Power: charging ring around the hub
  const R = 30, a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(t.x, t.y - 4, R, a0, a0 + sweep); ctx.stroke();
  ctx.strokeStyle = t.accentCol; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(t.x, t.y - 4, R, a0, a0 + sweep * (t.power / 100)); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT_U}`; ctx.textAlign = 'center';
  ctx.fillText(Math.round(t.power), t.x, t.y + R + 8);

  // Aim: ghost arc — the first stretch of the trajectory, then you're on your own
  const speed = 4 + t.power * 0.14;
  if (t.weapon === 3) {
    // Beam is hitscan: a short fading guide instead
    ctx.strokeStyle = 'rgba(255,238,150,0.35)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + Math.cos(worldAngle) * 130, tipY + Math.sin(worldAngle) * 130);
    ctx.stroke(); ctx.setLineDash([]);
  } else {
    let gx = tipX, gy = tipY;
    let gvx = Math.cos(worldAngle) * speed, gvy = Math.sin(worldAngle) * speed;
    for (let i = 0; i < 26; i++) {
      gvy += GRAVITY; gx += gvx; gy += gvy;
      if (i % 2) continue;
      ctx.globalAlpha = 0.45 * (1 - i / 26);
      ctx.fillStyle = WEAPONS[t.weapon].trail;
      ctx.beginPath(); ctx.arc(gx, gy, 1.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Angle readout floats off the barrel tip
  const displayAngle = -Math.round(worldAngle * 180 / Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `11px ${FONT_U}`; ctx.textAlign = 'center';
  ctx.fillText(`${displayAngle}°`, tipX + Math.cos(worldAngle) * 16, tipY + Math.sin(worldAngle) * 16 + 4);

  // Move budget: thin track on the ground under the tank (the practice
  // range has no budget)
  if (mode !== 'practice') {
    const mv = movePixelsLeft / MAX_MOVE;
    if (mv > 0.01) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(t.x - 23, t.y + 24); ctx.lineTo(t.x + 23, t.y + 24); ctx.stroke();
      ctx.strokeStyle = '#88ff99'; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(t.x - 23, t.y + 24); ctx.lineTo(t.x - 23 + 46 * mv, t.y + 24); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Thrust fuel: slim vertical meter beside the hull; drains while SHIFT
  // burns, refills on the ground. Hidden when full.
  const fu = t.fuel / FUEL_MAX;
  if (fu < 0.995) {
    const fx = t.x - 46, fy = t.y + 8, fh = 30;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - fh); ctx.stroke();
    ctx.strokeStyle = fu < 0.25 ? '#ff5030' : t.accentCol;
    ctx.lineWidth = 2.4; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - fh * fu); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Weapon name fades in above the tank after a switch or at turn start
  if (weaponLabelT > 0) {
    ctx.globalAlpha = Math.min(1, weaponLabelT / 30) * 0.9;
    ctx.fillStyle = '#fff'; ctx.font = `bold 13px ${FONT_D}`; ctx.textAlign = 'center';
    ctx.fillText(WEAPONS[t.weapon].name.toUpperCase(), t.x, t.y - 74);
    ctx.globalAlpha = 1;
  }
}

// HP as armour: 8 chitin plate segments arched over each hull.
// Losing a segment flakes visible shards off the tank.
function drawTankArmor(t) {
  if (!t.alive) return;
  const segs = 8;
  const whole = Math.max(0, Math.ceil((t.hp / t.maxHp) * segs));
  if (t._plates === undefined) t._plates = whole;
  if (whole < t._plates) {
    for (let s = 0; s < (t._plates - whole) * 3; s++) {
      plateShards.push({
        x: t.x + (Math.random() * 30 - 15), y: t.y - 18,
        vx: Math.random() * 3 - 1.5, vy: -2 - Math.random() * 2.5,
        rot: Math.random() * 6.28, vr: Math.random() * 0.4 - 0.2,
        life: 45, col: t.accentCol,
      });
    }
    t._plates = whole;
  }
  const R = 25;
  const a0 = -Math.PI * 0.86, a1 = -Math.PI * 0.14;
  const span = (a1 - a0) / segs, gap = 0.035;
  ctx.lineCap = 'butt'; ctx.lineWidth = 4;
  for (let s = 0; s < segs; s++) {
    const filled = s < whole;
    ctx.strokeStyle = filled ? t.accentCol : 'rgba(0,0,0,0.35)';
    ctx.globalAlpha = filled ? (t.hitFlash > 0 ? 0.55 + 0.45 * Math.sin(t.hitFlash) : 0.8) : 0.35;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 2, R, a0 + s * span + gap, a0 + (s + 1) * span - gap);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDmgTexts() {
  for (const d of dmgTexts) {
    ctx.globalAlpha = Math.min(1, d.life / 20);
    ctx.fillStyle = '#ff5540';
    ctx.font = `bold 17px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.fillText(`-${d.val}`, d.x, d.y - (55 - d.life) * 0.6);
  }
  ctx.globalAlpha = 1;
}

function drawPlateShards() {
  for (const s of plateShards) {
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.globalAlpha = Math.min(1, s.life / 18);
    ctx.fillStyle = s.col;
    ctx.fillRect(-2.5, -1.5, 5, 3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---- Screen-space HUD: slim weapon strip + eject chip, bottom centre ----
function drawScreenHUD() {
  stripRects = [];
  if (state !== STATES.PLAYER_TURN) return;
  const t = tanks[activePlayer];
  if (!t) return;

  const slotW = 40, slotH = 34, gapX = 6, ejW = 56;
  const n = WEAPONS.length;
  const totalW = n * slotW + (n - 1) * gapX + 18 + ejW;
  let x = W / 2 - totalW / 2;
  const y = H - 46;

  for (let wIdx = 0; wIdx < n; wIdx++) {
    const sel = t.weapon === wIdx;
    ctx.fillStyle = sel ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, y, slotW, slotH);
    ctx.strokeStyle = sel ? t.accentCol : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = sel ? 1.5 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, slotW - 1, slotH - 1);
    WPN_ICONS[wIdx](x + slotW / 2 - 5, y + 8);
    ctx.fillStyle = sel ? '#fff' : 'rgba(255,255,255,0.45)';
    ctx.font = `10px ${FONT_U}`; ctx.textAlign = 'center';
    ctx.fillText(String(wIdx + 1), x + slotW / 2, y + slotH - 5);
    stripRects.push({ x, y, w: slotW, h: slotH, wpn: wIdx });
    x += slotW + gapX;
  }

  // Divider, then the fifth card's heir: EJECT
  x += 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + slotH - 4); ctx.stroke();
  x += 15;
  ctx.fillStyle = 'rgba(120,20,20,0.4)';
  ctx.fillRect(x, y, ejW, slotH);
  ctx.strokeStyle = 'rgba(255,85,85,0.7)';
  ctx.strokeRect(x + 0.5, y + 0.5, ejW - 1, slotH - 1);
  ctx.fillStyle = '#ff7766'; ctx.font = `bold 13px ${FONT_D}`; ctx.textAlign = 'center';
  ctx.fillText('EJECT', x + ejW / 2, y + 22);
  stripRects.push({ x, y, w: ejW, h: slotH, eject: true });

  // Corner hints, quiet
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `11px ${FONT_U}`; ctx.textAlign = 'left';
  ctx.fillText('A/D move   W jump (×2 boost)   SHIFT thrust   ←/→ aim   ↑/↓ power   SPACE fire', 14, H - 14);
  ctx.textAlign = 'right';
  ctx.fillText('ESC menu   R restart', W - 14, H - 14);
}

// Vignette overlay, built once
let vignetteCv = null;
function drawVignette() {
  if (!vignetteCv) {
    vignetteCv = document.createElement('canvas');
    vignetteCv.width = W; vignetteCv.height = H;
    const vc = vignetteCv.getContext('2d');
    const g = vc.createRadialGradient(W/2, H/2, H * 0.42, W/2, H/2, H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(5,2,12,0.42)');
    vc.fillStyle = g; vc.fillRect(0, 0, W, H);
  }
  ctx.drawImage(vignetteCv, 0, 0);
}

// ============================================================
//  MENU
// ============================================================
function drawMenu() {
  // Parallax plates are already down; just a scrim for type legibility
  ctx.fillStyle = 'rgba(5,2,12,0.38)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  // Title: heavy condensed display, offset red shadow
  ctx.fillStyle = 'rgba(200,30,30,0.85)';
  ctx.font = `bold 110px ${FONT_D}`;
  ctx.fillText('ARACHNO-WARS', W/2 + 4, H*0.34 + 4);
  ctx.fillStyle = PAL.yellow;
  ctx.fillText('ARACHNO-WARS', W/2, H*0.34);
  ctx.fillStyle = PAL.orange;
  ctx.font = `bold 34px ${FONT_D}`;
  ctx.fillText('2  0  0  0', W/2, H*0.34 + 48);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `15px ${FONT_U}`;
  ctx.fillText('MECHANICAL INSECT ARTILLERY COMBAT', W/2, H*0.34 + 82);

  // Big START button — the only way in (2-player shelved for now, James 2026-07-15)
  const bw = 280, bh = 78, bx = W/2 - bw/2, by = H*0.55;
  const pulse = 0.75 + 0.25 * Math.sin(Date.now() * 0.003);
  ctx.save();
  ctx.shadowColor = `rgba(255,204,0,${(0.55 * pulse).toFixed(3)})`;
  ctx.shadowBlur = 30 * pulse;
  ctx.fillStyle = PAL.hudBorder;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,70,0,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.stroke();
  ctx.fillStyle = '#1a1005';
  ctx.font = `bold 44px ${FONT_D}`;
  ctx.fillText('START', W/2, by + bh/2 + 15);
  menuStartRect = { x: bx, y: by, w: bw, h: bh };

  // Practice range — quiet secondary button: free roam, no turns, no stakes
  const pw = 210, ph = 44, px = W/2 - pw/2, py = by + bh + 20;
  ctx.fillStyle = 'rgba(8,20,24,0.72)';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.fill();
  ctx.strokeStyle = PAL.p1accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.p1accent;
  ctx.font = `bold 24px ${FONT_D}`;
  ctx.fillText('PRACTICE', W/2, py + ph/2 + 8);
  menuPracticeRect = { x: px, y: py, w: pw, h: ph };

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `12px ${FONT_U}`;
  ctx.fillText('A/D move   W jump (×2 boost)   SHIFT thrust   ←/→ aim   ↑/↓ power   1-6 weapon   SPACE fire   P practice   ESC menu   R restart', W/2, py + ph + 32);

  const t = Date.now()/1000;
  drawMenuTank(W/2 - 230, H*0.87, 0, t);
  drawMenuTank(W/2 + 230, H*0.87, 1, t + Math.PI);
}

function drawMenuTank(x, y, idx, phase) {
  // Game-scale part layers and leg constants, magnified for the menu. Legs
  // idle in the whip language: one leg at a time does the slow reach, then
  // the needle tip stabs back in.
  ctx.save();
  ctx.translate(x, y + 18);
  ctx.scale(idx===0 ? 1.1 : -1.1, 1.1);

  const accentCol = [PAL.p1accent, PAL.p2accent][idx];
  const legCol    = [PAL.p1leg,    PAL.p2leg   ][idx];
  const breath    = Math.sin(phase * 2.1) * 0.5;
  const mountY    = -TANK_H * 0.75 + breath;
  const GROUND    = 12.5;

  const legFoot = (i) => {
    const side = i < 4 ? 1 : -1, k = i % 4;
    const stanceX = side * LEG_STANCE[k];
    // staggered deterministic re-grips: cycle index picks each plant offset
    const raw = phase * 0.30 + i * 0.132;
    const n = Math.floor(raw), cyc = raw - n;
    const off  = (m) => Math.sin(m * 7.13 + i * 3.7) * 2.8;
    const STEP_FRAC = 0.22;
    if (cyc < STEP_FRAC) {
      const { d, lift } = whipCurve(cyc / STEP_FRAC, 0.75);
      const fx = stanceX + off(n - 1) + (off(n) - off(n - 1)) * d;
      return { fx, fy: GROUND - lift * 5 };
    }
    return { fx: stanceX + off(n), fy: GROUND };
  };
  const drawLegs = (wantSide) => {
    for (let i = 0; i < LEG_COUNT; i++) {
      const side = i < 4 ? 1 : -1, k = i % 4;
      if (side !== wantSide) continue;
      const { fx, fy } = legFoot(i);
      drawWhipLeg(side * LEG_HIP_X[k], LEG_HIP_Y + breath, fx, fy, k, legCol, accentCol);
    }
  };

  drawLegs(-1);

  // Barrel behind the hull crown, held steady, angled up (no sway — brief)
  const barrelImg = TANK_PARTS[idx].barrel;
  ctx.save();
  ctx.translate(0, mountY);
  ctx.rotate(-0.5);
  if (barrelImg.complete && barrelImg.naturalWidth > 0) {
    const w = BARREL_LEN / (BARREL_TIP_FRAC - BARREL_ROOT_FRAC);
    const h = w * barrelImg.naturalHeight / barrelImg.naturalWidth;
    ctx.drawImage(barrelImg, -BARREL_ROOT_FRAC * w, -h / 2, w, h);
  } else {
    ctx.strokeStyle = '#141a20'; ctx.lineCap = 'round';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(BARREL_LEN * 0.35, 0); ctx.stroke();
    ctx.lineWidth = 1.9;
    ctx.beginPath(); ctx.moveTo(BARREL_LEN * 0.35, 0); ctx.lineTo(BARREL_LEN - 5, 0); ctx.stroke();
    ctx.fillStyle = '#141a20';
    ctx.beginPath(); ctx.ellipse(BARREL_LEN - 4, 0, 2.6, 1.9, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Hull — low-slung and wide between the leg arches, ball baked at center
  const hullImg = TANK_PARTS[idx].hull[0];
  if (hullImg.complete && hullImg.naturalWidth > 0) {
    const dw = HULL_DRAW_W, dh = dw * hullImg.naturalHeight / hullImg.naturalWidth;
    ctx.drawImage(hullImg, -dw / 2, mountY - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = [PAL.p1body, PAL.p2body][idx];
    ctx.beginPath(); ctx.ellipse(0, breath - 2, 12, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = accentCol;
    ctx.fillRect(-10, breath - 4.2, 20, 1.5);
    ctx.fillStyle = '#141a20';
    ctx.beginPath(); ctx.arc(0, mountY, 3.2, 0, Math.PI*2); ctx.fill();
  }

  drawLegs(1);
  ctx.restore();
}

// ============================================================
//  OVERLAYS
// ============================================================
function drawCoinFlip() {
  ctx.fillStyle = 'rgba(5,2,12,0.5)';
  ctx.fillRect(0, H*0.38, W, H*0.2);
  ctx.textAlign = 'center';
  if (1 - coinFlipTimer/90 > 0.4) {
    ctx.fillStyle = PAL.yellow; ctx.font = `bold 15px ${FONT_U}`;
    ctx.fillText('COIN FLIP', W/2, H*0.44);
    ctx.fillStyle = '#fff'; ctx.font = `bold 44px ${FONT_D}`;
    ctx.fillText(coinResult, W/2, H*0.52 + 8);
  } else {
    // Arena announcement rides the toss
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `bold 22px ${FONT_D}`;
    ctx.fillText(biome.label, W/2, H*0.42);
    ctx.fillStyle = PAL.yellow; ctx.font = `bold 34px ${FONT_D}`;
    ctx.fillText('TOSSING' + '.'.repeat(1 + Math.floor(Date.now()/300) % 3), W/2, H*0.5);
  }
}

function drawTurnTransition() {
  if (transitionTimer <= 0) return;
  const T = 50, t = 1 - transitionTimer / T;   // 0 → 1 across the transition
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  let xoff = 0, bandA = 1;
  if (t < 0.3)       xoff = (1 - easeOut(t / 0.3)) * -W * 0.55;
  else if (t > 0.85) { xoff = easeOut((t - 0.85) / 0.15) * W * 0.55; bandA = 1 - (t - 0.85) / 0.15; }

  // Full-width scrim band stays put; the type slides through it
  ctx.fillStyle = `rgba(5,2,12,${(0.55 * bandA).toFixed(3)})`;
  ctx.fillRect(0, H*0.42 - 46, W, 86);

  const label = activePlayer === 0 ? 'PLAYER 1' : (mode === 'training' ? 'COMPUTER' : 'PLAYER 2');
  const sub   = activePlayer === 1 && mode === 'training' ? 'TAKES AIM' : 'YOUR TURN';
  ctx.textAlign = 'center';
  ctx.fillStyle = activePlayer === 0 ? PAL.p1cockpit : PAL.p2cockpit;
  ctx.font = `bold 64px ${FONT_D}`;
  ctx.fillText(label, W/2 + xoff, H*0.42 + 12);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `16px ${FONT_U}`;
  ctx.fillText(sub, W/2 + xoff * 1.3, H*0.42 + 38);
}

function drawGameOver() {
  const g = ctx.createLinearGradient(0, H*0.28, 0, H*0.75);
  g.addColorStop(0, 'rgba(5,2,12,0)');
  g.addColorStop(0.4, 'rgba(5,2,12,0.75)');
  g.addColorStop(1, 'rgba(5,2,12,0)');
  ctx.fillStyle = g; ctx.fillRect(0, H*0.28, W, H*0.47);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,30,30,0.85)';
  ctx.font = `bold 84px ${FONT_D}`;
  ctx.fillText(gameOverMsg.replace('!', ''), W/2 + 3, H*0.5 + 3);
  ctx.fillStyle = PAL.yellow;
  ctx.fillText(gameOverMsg.replace('!', ''), W/2, H*0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `16px ${FONT_U}`;
  ctx.fillText('SPACE — menu      R — rematch', W/2, H*0.5 + 46);
}

// ============================================================
//  UPDATE / DRAW
// ============================================================
function update() {
  handleHeldKeys();
  updateBlimp();

  // Visual bookkeeping — ages with game time, so kill slow-mo stretches it
  lights.forEach(L => L.age++); lights = lights.filter(L => L.age < L.maxAge);
  dmgTexts.forEach(d => d.life--); dmgTexts = dmgTexts.filter(d => d.life > 0);
  plateShards.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.22; s.rot += s.vr; s.life--; });
  plateShards = plateShards.filter(s => s.life > 0);
  if (weaponLabelT > 0) weaponLabelT--;

  // An exit has fired (OUT target hit) — hold the frame, let the fireworks
  // play, then drift.
  if (exitCountdown > 0) {
    exitCountdown--;
    explosions.forEach(e=>e.update()); explosions=explosions.filter(e=>e.alive);
    if (exitCountdown === 0) triggerDriftExit();
    return;
  }
  if (state===STATES.EJECTING) { updateEject(); return; }

  // Update tank jump physics + the whip-leg system every frame
  tanks.forEach(t => { if (t.alive) t.updatePhysics(); });
  tanks.forEach(t => { if (t.alive) t.updateLegs(); });

  if (state===STATES.COINFLIP) { coinFlipTimer--; if(coinFlipTimer===55)doCoinFlip(); if(coinFlipTimer<=0)beginTurn(); return; }
  if (state===STATES.TURN_TRANSITION) { transitionTimer--; if(transitionTimer<=0)beginTurn(); return; }
  if (state===STATES.AI_TURN) { aiThinkTimer--; if(aiThinkTimer<=0)aiAct(); return; }
  if (state===STATES.FIRING) {
    updateProjectiles();
    if (projectiles.length===0 && crawlers.length===0 && beams.length===0) state=STATES.EXPLODING;
  }
  if (state===STATES.EXPLODING) {
    explosions.forEach(e=>e.update()); explosions=explosions.filter(e=>e.alive);
    if (explosions.length===0) {
      const dead=tanks.find(t=>!t.alive);
      if (dead) {
        gameOverMsg=dead.playerIdx===0?(mode==='training'?'COMPUTER WINS!':'PLAYER 2 WINS!'):'PLAYER 1 WINS!';
        state=STATES.GAME_OVER;
        SFX.victory();
      }
      else endTurn();
    }
  }
  if (state===STATES.PLAYER_TURN) {
    tanks.forEach(t=>{ if(!t.inAir) t.snapToGround(); });
    if (mode==='practice') {
      // On the range everything flies while you keep control; explosions
      // resolve in place and dead machines respawn for another round.
      updateProjectiles();
      explosions.forEach(e=>e.update()); explosions=explosions.filter(e=>e.alive);
      respawnPractice();
    }
  }
}

// Shared projectile/crawler/beam step — the FIRING state and the practice
// range both run it (practice runs it inside PLAYER_TURN, so movement and
// firing stay live while shots resolve).
function updateProjectiles() {
  const toRemove=[];
  for (let i=projectiles.length-1;i>=0;i--) {
    const proj=projectiles[i];
    if (proj.isBomblet) { proj.splitTimer--; if(proj.splitTimer<=0){spawnBomblets(proj.x,proj.y,proj.vx,proj.vy,proj.fromPlayer);proj.alive=false;} }
    if (!proj.alive){toRemove.push(i);continue;}
    const result=proj.update();
    if (proj.alive) {
      // Direct hit on an OUT target ends the whole show
      if (checkTargetHit(proj.x, proj.y, WEAPONS[proj.type].radius + 2)) {
        proj.alive=false; toRemove.push(i); continue;
      }
      tanks.forEach(t=>{
        if (!t.alive||t.playerIdx===proj.fromPlayer) return;
        const dx=t.x-proj.x,dy=t.y-proj.y;
        if (Math.sqrt(dx*dx+dy*dy)<20){proj.alive=false;handleImpact(proj);}
      });
    }
    if (result==='terrain') {
      if (proj.type===5)      buildSilkBridge(proj.x);
      else if (proj.type===4) hatchEgg(proj);
      else                    handleImpact(proj);
    }
    if (!proj.alive||result==='miss') toRemove.push(i);
  }
  toRemove.sort((a,b)=>b-a).forEach(i=>projectiles.splice(i,1));
  crawlers.forEach(c=>c.update()); crawlers=crawlers.filter(c=>c.alive);
  beams.forEach(b=>b.life--); beams=beams.filter(b=>b.life>0);
  tanks.forEach(t=>{ if(!t.inAir) t.snapToGround(); });
}

// Practice range: once the fireworks settle, put the fallen machine back on
// its pad at full strength — target practice never runs out of targets.
function respawnPractice() {
  if (projectiles.length || explosions.length || beams.length || crawlers.length) return;
  tanks.forEach(t => {
    if (t.alive) return;
    t.hp = t.maxHp; t.alive = true; t.hitFlash = 0;
    t.x = Math.floor(TERRAIN_W * (t.playerIdx === 0 ? 0.09 : 0.91));
    t.inAir = false; t.vy = 0; t.fuel = FUEL_MAX;
    t.boosted = false; t.retroT = 0; t.retroUsed = false;
    t.crouchT = 0; t.thrustFx = 0;
    t.snapToGround();
    t.initLegs();
  });
}

function draw() {
  ctx.clearRect(0,0,W,H);
  drawParallax();
  if (state===STATES.MENU) { drawMenu(); return; }

  // ---- World, seen through the camera ----
  ctx.save();
  applyCamera();
  drawBlimp();
  if (terrainPixels) ctx.drawImage(terrainPixels,0,0);
  drawTargets();
  tanks.forEach(t=>{ if(t.alive) t.draw(); });
  crawlers.forEach(c=>c.draw());
  projectiles.forEach(p=>p.draw());
  beams.forEach(b=>drawBeam(b));
  explosions.forEach(e=>e.draw());
  drawLights();
  if (state===STATES.EJECTING) drawEject();
  if (state!==STATES.COINFLIP) drawWorldHUD();
  ctx.restore();

  // ---- Screen space ----
  drawVignette();
  if (cam.flash > 0) {
    ctx.fillStyle = `rgba(255,240,220,${cam.flash.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (state===STATES.COINFLIP) { drawCoinFlip(); return; }
  drawScreenHUD();
  if (state===STATES.TURN_TRANSITION) drawTurnTransition();
  if (state===STATES.GAME_OVER) drawGameOver();
}

// Kill slow-mo runs the world at 0.3× while the camera and draw stay 60fps.
let stepAcc = 0;
function loop() {
  camUpdate();
  stepAcc += (slowmoT > 0 ? 0.3 : 1);
  while (stepAcc >= 1) { update(); stepAcc -= 1; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Elastic Space shared sound control (speaker button, top right) with a
// second slider for the music channel.
if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({
    start: () => {
      // Only flip sound on if the browser actually let the music start, so
      // the speaker icon and the SFX gate never disagree.
      return musicPlay().then(
        () => { esSound.on = true; },
        (err) => { esSound.on = false; throw err; }
      );
    },
    stop: () => {
      esSound.on = false;
      stopWhistle();
      musicPause();
    },
    setVolume: (v) => { esSound.volume = v; applyMusicVolume(); },
    channels: [{
      label: 'Music',
      value: esSound.musicVolume,
      setVolume: (v) => { esSound.musicVolume = v; applyMusicVolume(); },
    }],
  });
}
