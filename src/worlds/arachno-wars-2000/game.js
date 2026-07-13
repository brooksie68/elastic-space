// ============================================================
//  ARACHNO-WARS 2000  –  v2
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// --- Viewport ---
const W = 1280, H = 720;
canvas.width  = W;
canvas.height = H;

// --- Background image ---
const bgImage = new Image();
bgImage.src = 'bg.png';

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
  p1body: '#0f8070', p1accent: '#3fe0be', p1cockpit: '#5ff0d0', p1leg: '#1c2530',
  p2body: '#a05a10', p2accent: '#ffb028', p2cockpit: '#ffd060', p2leg: '#2a2018',
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
const esSound = { on: !window.ElasticSoundControl, volume: 1, musicVolume: 0.55 };

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

// Looping battle music on its own volume channel so players can mute the
// music and still hear the tanks.
const musicEl = new Audio(AUDIO_DIR + 'music-battle.mp3');
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
    h = (h + 1) / 2;
    heights[x] = minH + h * (maxH - minH);
  }

  // Central mountain obstacle — taller and more dramatic
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

  // Place varied canyon flora — junipers, ocotillo, agave, scrub, dry grass,
  // rock spires, and the occasional strung web
  const floraTypes = ['juniper','juniper','ocotillo','agave','scrub','scrub','drygrass','drygrass','web','spire'];
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

  // ---- Terrain body: warm canyon rock matching the painted background ----
  // Gradient anchored around the typical surface line so tops read sunlit
  // and depth falls off into dark bedrock.
  const grad = oc.createLinearGradient(0, H * 0.5, 0, H);
  grad.addColorStop(0,    '#a86336');  // sunlit surface rock
  grad.addColorStop(0.22, '#8a4f28');
  grad.addColorStop(0.5,  '#6b3a1c');
  grad.addColorStop(0.78, '#4a2712');
  grad.addColorStop(1,    '#2e180a');  // deep bedrock
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
  const strata = [
    { y: H * 0.60, h: 8,  col: 'rgba(196,117,46,0.30)' },
    { y: H * 0.66, h: 4,  col: 'rgba(84,36,16,0.45)'   },
    { y: H * 0.73, h: 11, col: 'rgba(156,82,40,0.28)'  },
    { y: H * 0.80, h: 5,  col: 'rgba(66,26,10,0.50)'   },
    { y: H * 0.87, h: 9,  col: 'rgba(122,59,30,0.32)'  },
    { y: H * 0.94, h: 5,  col: 'rgba(50,20,8,0.45)'    },
  ];
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

  // Per-column colour noise — warm variation for organic rock
  for (let x = 0; x < TERRAIN_W; x++) {
    const n1 = seededRandG(x * 0.09  + 3.7);
    const n2 = seededRandG(x * 0.031 + 11.2);
    const alpha = n1 * 0.14 + n2 * 0.08;
    const col = n1 > 0.52
      ? `rgba(196,117,46,${alpha})`   // sunlit ochre
      : `rgba(46,20,8,${alpha})`;     // shadowed umber
    oc.fillStyle = col;
    const sy = H - terrain[x];
    oc.fillRect(x, sy, 1, H - sy);
  }
  oc.restore();

  // Surface edge — dark base line with a sunlit rim above it
  oc.strokeStyle = '#2e1608';
  oc.lineWidth = 2.5;
  oc.beginPath();
  for (let x = 0; x < TERRAIN_W; x++) {
    if (x === 0) oc.moveTo(0, H - terrain[0]);
    else         oc.lineTo(x, H - terrain[x]);
  }
  oc.stroke();
  oc.strokeStyle = 'rgba(216,133,59,0.7)';
  oc.lineWidth = 1;
  oc.beginPath();
  for (let x = 0; x < TERRAIN_W; x++) {
    if (x === 0) oc.moveTo(0, H - terrain[0] - 1);
    else         oc.lineTo(x, H - terrain[x] - 1);
  }
  oc.stroke();

  // Surface pebble/crack texture — warm dashes just below the rim
  for (let x = 2; x < TERRAIN_W - 2; x += 4 + Math.floor(seededRandG(x * 0.3) * 6)) {
    const ty = H - terrain[x] + 2;
    const len = 2 + seededRandG(x * 0.7) * 5;
    oc.fillStyle = seededRandG(x*1.3) > 0.5 ? 'rgba(58,26,10,0.7)' : 'rgba(140,74,34,0.55)';
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
  // Main mass — canyon rock, sunlit on the upper-left facet
  const col  = ['#5a3018','#4a2712','#6b3a1e'][variant];
  const lite = ['#a06030','#8a5228','#b06a38'][variant];
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
  const base = ['#6b3a1c','#5c3016','#7a4322'][variant];
  const lite = ['#a06030','#8f5228','#b06a38'][variant];
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
//  PARALLAX BACKGROUND  —  32-bit quality sky & mountains
// ============================================================
function drawBackground() {
  // ---- Background image (fills full canvas, terrain draws on top) ----
  if (bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.drawImage(bgImage, 0, 0, W, H);
  } else {
    // Fallback solid colour while image loads
    ctx.fillStyle = '#050112';
    ctx.fillRect(0, 0, W, H);
    return;
  }

}


function seededRandG(n) { let x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }

// ============================================================
//  TANK  —  angular military body, insect legs, long thin barrel
// ============================================================
const TANK_W = 30, TANK_H = 11, MAX_MOVE = TANK_W * 4.2;
const BARREL_LEN = 54;

// Blender-rendered body sprites (teal P1, amber P2). Legs stay procedural so
// they can track terrain and gait; falls back to a painted hull if missing.
const TANK_SPRITES = [new Image(), new Image()];
TANK_SPRITES[0].src = 'assets/tanks/tank-body-teal.png';
TANK_SPRITES[1].src = 'assets/tanks/tank-body-amber.png';

const JUMP_POWER    = -9.5;   // initial upward velocity
const JUMP_GRAVITY  = 0.42;
const MAX_JUMPS     = 2;       // double-jump allowed

class Tank {
  constructor(x, playerIdx) {
    this.playerIdx   = playerIdx;
    this.x           = x; this.y = 0; this.angle = 0;
    this.barrelAngle = playerIdx===0 ? Math.PI/4 : Math.PI*3/4;
    this.power=50; this.hp=500; this.maxHp=500; this.weapon=0;
    this.alive=true; this.legPhase=0; this.hitFlash=0;
    // Jump state
    this.vy=0; this.inAir=false; this.jumpsLeft=MAX_JUMPS;
    this.snapToGround();
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
    if (this.jumpsLeft <= 0) return;
    this.vy = JUMP_POWER;
    this.inAir = true;
    this.jumpsLeft--;
    SFX.jump();
  }

  updatePhysics() {
    if (!this.inAir) return;
    this.vy += JUMP_GRAVITY;
    this.y  += this.vy;
    const xi = Math.max(0, Math.min(TERRAIN_W-1, Math.floor(this.x)));
    const groundY = H - terrain[xi] - TANK_H*0.4;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.inAir = false;
      this.jumpsLeft = MAX_JUMPS;
      this.snapToGround();
    }
  }

  move(dir, pixels) {
    const newX = this.x + dir*pixels;
    if (newX<30||newX>TERRAIN_W-30) return;
    this.x=newX;
    if (!this.inAir) this.snapToGround();
    this.legPhase+=pixels*0.18;
  }

  draw() {
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
    ctx.scale(this.playerIdx===0?1:-1, 1);
    if (this.hitFlash>0) ctx.globalAlpha=0.6+0.4*Math.sin(this.hitFlash*0.8);
    const spr = TANK_SPRITES[this.playerIdx];
    const hasSprite = spr.complete && spr.naturalWidth > 0;
    this._drawLegs();
    this._drawBarrel();
    if (!hasSprite) this._drawOutline();
    this._drawBody();
    if (!hasSprite) this._drawCockpit();
    ctx.restore();
    if (this.hitFlash>0) this.hitFlash--;
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
    // Blender-rendered body when available; painted hull as the fallback
    const spr = TANK_SPRITES[this.playerIdx];
    if (spr.complete && spr.naturalWidth > 0) {
      const dw = TANK_W * 2.0;
      const dh = dw * spr.naturalHeight / spr.naturalWidth;
      ctx.drawImage(spr, -dw / 2, -TANK_H * 0.5 - dh * 0.66, dw, dh);
      return;
    }

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

  _drawBarrel() {
    ctx.save();
    // Undo the ctx.rotate(this.angle) and ctx.scale(flip,1) that wrap this call,
    // then rotate to the true world barrel angle so draw matches fire exactly.
    const worldAngle = this.getBarrelWorldAngle();
    const flip = this.playerIdx === 0 ? 1 : -1;
    ctx.scale(flip, 1);          // undo the scale applied by draw()
    ctx.rotate(-this.angle);     // undo the body tilt
    ctx.rotate(worldAngle);      // apply the true world angle
    const bLen = BARREL_LEN;
    // Long tapered leg-cannon — reads as one more limb, pointed at you
    ctx.strokeStyle = '#141a20';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bLen * 0.35, -1); ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(bLen * 0.35, -1); ctx.lineTo(bLen - 6, 0); ctx.stroke();
    // Muzzle collar
    ctx.strokeStyle = '#2c3640'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(bLen - 8, 0); ctx.lineTo(bLen - 3, 0); ctx.stroke();
    // Muzzle tip
    ctx.fillStyle = '#0a0d10';
    ctx.beginPath(); ctx.arc(bLen - 2, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    // Top highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, -1.6); ctx.lineTo(bLen * 0.6, -2); ctx.stroke();
    ctx.restore();
  }
  _drawLegs() {
    const phase = this.legPhase;
    // 4 legs per side — long thin limbs that arch above the hull line
    // before dropping to the ground, harvestman-style (per the reference art)
    const hipY = -TANK_H * 0.25;
    const attachXs = [-TANK_W*0.32, -TANK_W*0.11, TANK_W*0.11, TANK_W*0.32];

    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? 1 : -1;
      const idx  = i % 4;
      const ax   = attachXs[idx];

      // Alternating gait
      const gp    = (idx % 2 === 0) ? phase : phase + Math.PI;
      const lift  = Math.max(0, Math.sin(gp)) * 4;
      const swing = Math.sin(gp + idx * 0.7) * 4;

      // Knee rises above the hull; foot reaches well out to the side
      const kneeX = ax + side * (TANK_W * 0.34 + swing * 0.6);
      const kneeY = -TANK_H * 1.45 - lift - idx * 0.6;
      const footX = ax + side * (TANK_W * 0.72 + swing);
      const footY = TANK_H * 1.35 - lift * 0.25;

      ctx.strokeStyle = this.legCol;
      ctx.lineCap = 'round';
      // Femur — up and out over the shell
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(ax, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
      // Tibia — long taper down to the foot
      ctx.lineWidth = 1.9;
      ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
      // Tarsus tip
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(footX, footY); ctx.lineTo(footX + side * 3.5, footY + 1.5); ctx.stroke();

      // Knee node with a faint accent glint
      ctx.fillStyle = '#0c1014';
      ctx.beginPath(); ctx.arc(kneeX, kneeY, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = this.accentCol;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(kneeX, kneeY, 0.9, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
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

let state='menu', mode='pvp', tanks=[], activePlayer=0;
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
    if (code==='KeyV') { mode='pvp';      startGame(); }
    if (code==='KeyT') { mode='training'; startGame(); }
    return;
  }
  if (state===STATES.GAME_OVER) { if (code==='Space'||code==='Enter') returnToMenu(); return; }
  if (state!==STATES.PLAYER_TURN) return;
  const tank=tanks[activePlayer];
  if (code==='Digit1') { tank.weapon=0; SFX.select(); }
  if (code==='Digit2') { tank.weapon=1; SFX.select(); }
  if (code==='Digit3') { tank.weapon=2; SFX.select(); }
  if (code==='Digit4') { tank.weapon=3; SFX.select(); }
  if (code==='Digit5') { tank.weapon=4; SFX.select(); }
  if (code==='Digit6') { tank.weapon=5; SFX.select(); }
  if (code==='KeyW'||code==='Space') {
    if (code==='KeyW') { tank.jump(); return; }
    fireTank(tank);
  }
}

function handleHeldKeys() {
  if (state!==STATES.PLAYER_TURN) return;
  const tank=tanks[activePlayer], spd=1.8;
  if ((keys['KeyA']||keys['ArrowLeft'])  &&movePixelsLeft>0) { tank.move(-1,spd); movePixelsLeft-=spd; SFX.move(); }
  if ((keys['KeyD']||keys['ArrowRight']) &&movePixelsLeft>0) { tank.move( 1,spd); movePixelsLeft-=spd; SFX.move(); }
  // Full 360° barrel rotation — ArrowUp = barrel up (toward sky), ArrowDown = barrel down
  if (keys['ArrowUp'])   tank.barrelAngle += 0.012;
  if (keys['ArrowDown']) tank.barrelAngle -= 0.012;
  // Keep angle in 0..2π range for display purposes only
  tank.barrelAngle = ((tank.barrelAngle % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
  if (keys['Minus']||keys['BracketLeft'])  tank.power=Math.max(5,  tank.power-0.35);
  if (keys['Equal']||keys['BracketRight']) tank.power=Math.min(100,tank.power+0.35);
}

// ============================================================
//  GAME FLOW
// ============================================================
function startGame() {
  generateTerrain(); projectiles=[]; explosions=[]; crawlers=[]; beams=[];
  ejectFx=null; exitTriggered=false; exitCountdown=0;
  aiLastHp = 500; aiWasHitLastTurn = false;
  state=STATES.COINFLIP; coinFlipTimer=90; SFX.coinflip();
}
function returnToMenu() {
  state=STATES.MENU; tanks=[]; projectiles=[]; explosions=[]; crawlers=[]; beams=[];
  ejectFx=null; decorationList=[]; terrainPixels=null;
}
function doCoinFlip() {
  activePlayer=Math.random()<0.5?0:1;
  coinResult=activePlayer===0?'PLAYER 1 GOES FIRST!':(mode==='training'?'COMPUTER GOES FIRST!':'PLAYER 2 GOES FIRST!');
}
function beginTurn() {
  movePixelsLeft=MAX_MOVE; tanks[activePlayer].legPhase=0;
  tanks[activePlayer].jumpsLeft = MAX_JUMPS;
  if (mode==='training'&&activePlayer===1) { state=STATES.AI_TURN; aiThinkTimer=60+Math.floor(Math.random()*60); }
  else state=STATES.PLAYER_TURN;
}
function endTurn() { activePlayer=1-activePlayer; state=STATES.TURN_TRANSITION; transitionTimer=50; }

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
  // Barrel tip in world space
  const wx = tank.x + Math.cos(worldAngle) * bLen;
  const wy = tank.y + Math.sin(worldAngle) * bLen;
  // Velocity exactly along the barrel direction
  const speed = 4 + tank.power * 0.14;
  const vx = Math.cos(worldAngle) * speed;
  const vy = Math.sin(worldAngle) * speed;
  SFX.shoot(tank.weapon);
  if (tank.weapon===3) { fireBeam(tank, wx, wy, worldAngle); state=STATES.FIRING; return; }
  const p = new Projectile(wx, wy, vx, vy, tank.weapon, tank.playerIdx);
  if (tank.weapon===1) { p.isBomblet=true; p.splitTimer=80; }
  if (tank.weapon===4) { p.bounces=1; }
  projectiles.push(p); state=STATES.FIRING;
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
      t.hp -= Math.round(dmg * dmgFraction); t.hitFlash = 20; anyHit = true;
      if (t.hp <= 0) { t.hp = 0; t.alive = false; }
    }
  });
  if (anyHit) SFX.tankHit();
  SFX.explode(anyHit);
  explosions.push(new Explosion(x, y, blastR * 1.2));
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
    const y = this.y;
    ctx.save(); ctx.translate(this.x, y);
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let l = 0; l < 8; l++) {
      const side = l < 4 ? 1 : -1, li = l % 4;
      const sway = Math.sin(this.phase + this.age * 0.45 + li * 1.5) * 1.6;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(side * (3 + li) + sway * side, 4 - li * 0.6);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a1c14';
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
let ejectCardRect = null;

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

function overEjectCard(p) {
  return state === STATES.PLAYER_TURN && ejectCardRect &&
    p.x >= ejectCardRect.x && p.x <= ejectCardRect.x + ejectCardRect.w &&
    p.y >= ejectCardRect.y && p.y <= ejectCardRect.y + ejectCardRect.h;
}

canvas.addEventListener('click', (e) => {
  const p = toGameCoords(e);
  if (overEjectCard(p)) { startEject(tanks[activePlayer]); return; }
  if (state !== STATES.MENU && blimpHit(p.x, p.y)) triggerDriftExit();
});

canvas.addEventListener('mousemove', (e) => {
  const p = toGameCoords(e);
  const hot = overEjectCard(p) || (state !== STATES.MENU && blimpHit(p.x, p.y));
  canvas.style.cursor = hot ? 'pointer' : 'default';
});

// ============================================================
//  AI
// ============================================================
let aiWasHitLastTurn = false;   // set in handleImpact when AI takes damage
let aiLastHp = 500;             // tracked to detect hits

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
    const startX = ai.x + Math.cos(worldAngle) * bLen;
    const startY = ai.y + Math.sin(worldAngle) * bLen;
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
  const { angle: solvedAngle, power: solvedPower } = aiSolveShot(ai, target);
  ai.barrelAngle = solvedAngle;
  ai.power = solvedPower;
  fireTank(ai);
}

// ============================================================
//  HUD  —  32-bit clarity: bordered stat boxes, weapon icons, rich layout
// ============================================================
const HUD_H = 100;

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

function drawStatBox(x, y, w, h, label, value, col, active) {
  // Box background
  ctx.fillStyle = active ? 'rgba(255,204,0,0.08)' : 'rgba(255,255,255,0.04)';
  ctx.fillRect(x, y, w, h);
  // Box border
  ctx.strokeStyle = active ? 'rgba(255,204,0,0.5)' : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
  // Label
  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w/2, y + 15);
  // Value
  ctx.fillStyle = col || PAL.white;
  ctx.font = `bold 22px monospace`;
  ctx.fillText(value, x + w/2, y + 38);
}

function drawHUD() {
  const pad = 12;

  // ---- HUD background with gradient depth ----
  const hudGrad = ctx.createLinearGradient(0, 0, 0, HUD_H);
  hudGrad.addColorStop(0, 'rgba(10,6,22,0.96)');
  hudGrad.addColorStop(1, 'rgba(4,2,10,0.98)');
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, 0, W, HUD_H);

  // Bottom border — gold line with inner shadow
  ctx.strokeStyle = PAL.hudBorder;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(W, HUD_H); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,204,0,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HUD_H-2); ctx.lineTo(W, HUD_H-2); ctx.stroke();

  // Vertical centre separator
  ctx.strokeStyle = 'rgba(255,204,0,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2, 4); ctx.lineTo(W/2, HUD_H-4); ctx.stroke();

  // ---- LEFT: P1 block ----
  drawPlayerBlock(pad, 0, HUD_H, tanks[0], 'P1', activePlayer===0 && state===STATES.PLAYER_TURN);

  // ---- RIGHT: P2/CPU block ----
  const p2Label = mode==='training' ? 'CPU' : 'P2';
  drawPlayerBlock(W - pad - 268, 0, HUD_H, tanks[1], p2Label, activePlayer===1 && state===STATES.PLAYER_TURN, true);

  // ---- CENTER: stat boxes or title ----
  drawHUDCenter();

  // ---- Bottom-right: version/controls hint ----
  ctx.fillStyle = '#383838';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ESC:Menu  R:Restart  v2', W - pad, HUD_H - 8);
}

function drawPlayerBlock(x, y, h, tank, label, isActive, rightAlign=false) {
  const barW = 190, barH = 10, blockW = 268;
  const bx = x;

  // Active player glow background
  if (isActive) {
    const glowGrad = ctx.createLinearGradient(
      rightAlign ? bx+blockW : bx, 0,
      rightAlign ? bx : bx+blockW, 0
    );
    glowGrad.addColorStop(0, 'rgba(255,204,0,0.10)');
    glowGrad.addColorStop(1, 'rgba(255,204,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(bx, y, blockW, h);
    // Gold border frame
    ctx.strokeStyle = 'rgba(255,204,0,0.60)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx+0.75, y+0.75, blockW-1.5, h-1.5);
  }

  const labelX = rightAlign ? bx + blockW - 10 : bx + 10;
  const align   = rightAlign ? 'right' : 'left';
  const nameCol = tank.playerIdx===0 ? PAL.p1cockpit : PAL.p2cockpit;

  // ---- Player label ----
  ctx.textAlign = align;
  ctx.fillStyle = isActive ? nameCol : '#666';
  ctx.font = `bold 26px monospace`;
  const arrow = isActive ? (rightAlign ? '◀ ' : '▶ ') : '';
  const arrowR = isActive ? (rightAlign ? '' : ' ▶') : '';
  ctx.fillText((rightAlign ? arrow : '') + label + (rightAlign ? '' : (isActive?' ▶':'')), labelX, y + 28);

  // Active indicator dot
  if (isActive) {
    ctx.fillStyle = nameCol;
    const dotX = rightAlign ? bx+blockW-10-ctx.measureText(label+(isActive?' ▶':'')).width-8 : bx+10;
    // Pulsing dot
    const pulse = 0.6 + 0.4*Math.sin(Date.now()*0.006);
    ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.arc(rightAlign ? bx+blockW-5 : bx+5, y+22, 4, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ---- HP bar ----
  const barX = rightAlign ? bx + blockW - 10 - barW : bx + 10;
  const barY = y + 36;
  const pct = Math.max(0, tank.hp / tank.maxHp);
  const barCol = pct > 0.5 ? '#28e850' : pct > 0.25 ? '#f08020' : '#e82020';

  // Bar track (recessed look)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(barX-1, barY-1, barW+2, barH+2);
  ctx.fillStyle = '#181818';
  ctx.fillRect(barX, barY, barW, barH);

  // HP fill with segment ticks
  if (pct > 0) {
    // Glow under fill
    ctx.fillStyle = barCol.replace(')', ',0.3)').replace('rgb','rgba');
    ctx.fillRect(barX, barY, barW*pct, barH);
    // Main fill
    ctx.fillStyle = barCol;
    ctx.fillRect(barX, barY, barW*pct, barH);
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(barX, barY, barW*pct, Math.ceil(barH*0.38));
    // Segment ticks every 10% of max HP
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let seg=1; seg<10; seg++) {
      const tx = barX + barW*(seg/10);
      if (tx < barX + barW*pct) ctx.fillRect(tx, barY, 1, barH);
    }
  }

  // Bar border
  ctx.strokeStyle = isActive ? 'rgba(255,204,0,0.7)' : 'rgba(100,100,100,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // HP numeric text — below the bar
  ctx.fillStyle = pct > 0.2 ? PAL.white : '#ff8888';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${tank.hp} / ${tank.maxHp}`, barX + barW/2, barY + barH + 16);

  // ---- Weapon icon + name ----
  ctx.textAlign = align;
  ctx.fillStyle = '#777';
  ctx.font = '8px monospace';
  const wpnY = y + h - 10;
  const iconX = rightAlign ? barX + barW - 9 : barX;
  // Draw weapon pictogram
  ctx.save();
  WPN_ICONS[tank.weapon](iconX, wpnY - 6);
  ctx.restore();
  const wpnNameX = rightAlign ? iconX - 2 : iconX + 11;
  ctx.textAlign = rightAlign ? 'right' : 'left';
  ctx.fillStyle = '#999';
  ctx.font = '16px monospace';
  ctx.fillText(WEAPONS[tank.weapon].name.toUpperCase(), wpnNameX, wpnY);
}

function drawHUDCenter() {
  ctx.textAlign = 'center';
  const cx = W / 2;

  if (state === STATES.PLAYER_TURN || state === STATES.FIRING) {
    const at = tanks[activePlayer];
    const worldAngle = at.getBarrelWorldAngle();
    const displayAngle = -Math.round(worldAngle * 180 / Math.PI);
    const nameCol = activePlayer===0 ? PAL.p1cockpit : PAL.p2cockpit;

    // Turn label
    ctx.fillStyle = nameCol;
    ctx.font = 'bold 22px monospace';
    const turnLabel = activePlayer===0 ? 'PLAYER 1' : (mode==='training'?'COMPUTER':'PLAYER 2');
    ctx.fillText(turnLabel + ' TURN', cx, 20);

    // Five stat boxes: AIM | PWR | MOVE | JUMP | EJECT
    const boxW = 72, boxH = 48, boxGap = 6;
    const totalW = boxW*5 + boxGap*4;
    let bx = cx - totalW/2;
    const by = 26;
    const isP = state === STATES.PLAYER_TURN;

    drawStatBox(bx,                    by, boxW, boxH, 'AIM',   `${displayAngle}°`,                         '#aaddff', isP);
    drawStatBox(bx+boxW+boxGap,        by, boxW, boxH, 'POWER', `${Math.round(at.power)}%`,                 '#ffdd88', isP);
    drawStatBox(bx+(boxW+boxGap)*2,    by, boxW, boxH, 'MOVE',  `${Math.round(movePixelsLeft/MAX_MOVE*100)}%`, '#88ff99', isP);
    drawStatBox(bx+(boxW+boxGap)*3,    by, boxW, boxH, 'JUMP',  `×${at.jumpsLeft}`,                         '#ff88cc', isP);
    // The fifth card. Click it and leave the war behind.
    const ejX = bx+(boxW+boxGap)*4;
    drawStatBox(ejX,                   by, boxW, boxH, 'EJECT', '▲',                                        '#ff5555', isP);
    ejectCardRect = isP ? { x: ejX, y: by, w: boxW, h: boxH } : null;

    // Controls hint
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText('A/D Move  ↑↓ Aim  -/+ Power  W Jump  1-6 Wpn  SPACE Fire', cx, HUD_H - 8);

  } else {
    // Title treatment when idle
    ctx.fillStyle = PAL.yellow;
    ctx.font = 'bold 28px monospace';
    ctx.fillText('ARACHNO-WARS 2000', cx, 30);
    ctx.fillStyle = '#4a3a60';
    ctx.font = '16px monospace';
    ctx.fillText('MECHANICAL INSECT ARTILLERY COMBAT', cx, 54);
    ctx.fillStyle = '#555';
    ctx.font = '14px monospace';
    ctx.fillText('V: 2-Player   T: vs Computer', cx, 80);
  }
}

// ============================================================
//  MENU
// ============================================================
function drawMenu() {
  drawBackground();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(W/2-320,H/2-160,640,320);
  ctx.strokeStyle=PAL.hudBorder; ctx.lineWidth=3; ctx.strokeRect(W/2-320,H/2-160,640,320);
  ctx.textAlign='center';
  ctx.fillStyle=PAL.red; ctx.font='bold 52px monospace'; ctx.fillText('ARACHNO-WARS',W/2+2,H/2-88);
  ctx.fillStyle=PAL.yellow; ctx.fillText('ARACHNO-WARS',W/2,H/2-90);
  ctx.fillStyle=PAL.orange; ctx.font='bold 28px monospace'; ctx.fillText('2 0 0 0',W/2,H/2-52);
  ctx.fillStyle='#aaa'; ctx.font='13px monospace'; ctx.fillText('MECHANICAL INSECT ARTILLERY COMBAT',W/2,H/2-22);
  ctx.fillStyle=PAL.p1cockpit; ctx.font='bold 20px monospace'; ctx.fillText('[ V ]  2-PLAYER LOCAL',W/2,H/2+28);
  ctx.fillStyle=PAL.p2cockpit; ctx.fillText('[ T ]  TRAINING vs COMPUTER',W/2,H/2+64);
  ctx.fillStyle='#777'; ctx.font='10px monospace';
  ctx.fillText('A/D Move  ↑↓ Aim  -/+ Power  W Jump  SPACE Fire  1-6 Weapon',W/2,H/2+100);
  ctx.fillStyle='#555'; ctx.font='9px monospace';
  ctx.fillText('ESC: Quit to Menu   R: Restart', W/2, H/2+124);
  const t=Date.now()/1000;
  drawMenuTank(W/2-190,H/2+168,0,t); drawMenuTank(W/2+190,H/2+168,1,t+Math.PI);
}

function drawMenuTank(x, y, idx, phase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(idx===0 ? 2.2 : -2.2, 2.2);

  const accentCol = [PAL.p1accent, PAL.p2accent][idx];
  const legCol    = [PAL.p1leg,    PAL.p2leg   ][idx];

  // Legs — long arcs with an idle sway
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? 1 : -1, li = i % 4;
    const ax = [-9.5, -3.2, 3.2, 9.5][li];
    const sway = Math.sin(phase * 0.8 + li * 1.3) * 1.2;
    const kx = ax + side * (10 + sway), ky = -16 - li * 0.5;
    const fx = ax + side * (21 + sway), fy = 14;
    ctx.strokeStyle = legCol; ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ax, -2); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = '#0c1014';
    ctx.beginPath(); ctx.arc(kx, ky, 1.7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = accentCol; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(kx, ky, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Barrel — slow aiming sway
  ctx.save();
  ctx.rotate(Math.sin(phase*0.5)*0.2 - 0.55);
  ctx.strokeStyle = '#141a20'; ctx.lineCap='round'; ctx.lineWidth=2.6;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(26,0); ctx.stroke();
  ctx.fillStyle = '#0a0d10';
  ctx.beginPath(); ctx.arc(27,0,1.6,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Body — sprite when loaded, painted lozenge otherwise
  const spr = TANK_SPRITES[idx];
  if (spr.complete && spr.naturalWidth > 0) {
    const dw = 30, dh = dw * spr.naturalHeight / spr.naturalWidth;
    ctx.drawImage(spr, -dw/2, -5.5 - dh*0.66, dw, dh);
  } else {
    ctx.fillStyle = [PAL.p1body, PAL.p2body][idx];
    ctx.beginPath(); ctx.ellipse(0, -3, 10, 4.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = accentCol;
    ctx.fillRect(-9, -5.5, 18, 1.6);
    ctx.fillStyle = '#10161c';
    ctx.beginPath(); ctx.arc(0, -7, 3, Math.PI, 0); ctx.fill();
  }

  ctx.restore();
}

// ============================================================
//  OVERLAYS
// ============================================================
function drawCoinFlip() {
  if (1-coinFlipTimer/90>0.4) {
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(W/2-260,H/2-60,520,120);
    ctx.strokeStyle=PAL.hudBorder; ctx.lineWidth=2; ctx.strokeRect(W/2-260,H/2-60,520,120);
    ctx.fillStyle=PAL.yellow; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.fillText('COIN FLIP!',W/2,H/2-22);
    ctx.fillStyle=PAL.white; ctx.font='bold 22px monospace'; ctx.fillText(coinResult,W/2,H/2+16);
    ctx.fillStyle='#aaa'; ctx.font='12px monospace'; ctx.fillText('Get ready...',W/2,H/2+48);
  } else {
    ctx.fillStyle=PAL.yellow; ctx.font='bold 28px monospace'; ctx.textAlign='center'; ctx.fillText('TOSSING...',W/2,H/2);
  }
}

function drawTurnTransition() {
  if (transitionTimer<=0) return;
  ctx.globalAlpha=Math.min(1,transitionTimer/20);
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(W/2-200,H/2-36,400,72);
  ctx.strokeStyle=PAL.hudBorder; ctx.lineWidth=2; ctx.strokeRect(W/2-200,H/2-36,400,72);
  ctx.fillStyle=activePlayer===0?PAL.p1cockpit:PAL.p2cockpit;
  ctx.font='bold 20px monospace'; ctx.textAlign='center';
  ctx.fillText(activePlayer===0?'PLAYER 1 TURN':(mode==='training'?'COMPUTER TURN':'PLAYER 2 TURN'),W/2,H/2+8);
  ctx.globalAlpha=1;
}

function drawGameOver() {
  ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(W/2-300,H/2-110,600,220);
  ctx.strokeStyle=PAL.hudBorder; ctx.lineWidth=3; ctx.strokeRect(W/2-300,H/2-110,600,220);
  ctx.textAlign='center';
  ctx.fillStyle=PAL.red;    ctx.font='bold 38px monospace'; ctx.fillText('GAME OVER', W/2+2, H/2-48);
  ctx.fillStyle=PAL.yellow; ctx.font='bold 38px monospace'; ctx.fillText('GAME OVER', W/2,   H/2-50);
  ctx.fillStyle=PAL.white;  ctx.font='bold 24px monospace'; ctx.fillText(gameOverMsg, W/2, H/2+8);
  ctx.fillStyle='#aaa';     ctx.font='13px monospace';
  ctx.fillText('SPACE / ENTER  →  Main Menu', W/2, H/2+56);
  ctx.fillStyle='#555';     ctx.font='10px monospace';
  ctx.fillText('R  →  Quick Restart', W/2, H/2+80);
}

// ============================================================
//  UPDATE / DRAW
// ============================================================
function update() {
  handleHeldKeys();
  updateBlimp();

  // An exit has fired (OUT target hit) — hold the frame, let the fireworks
  // play, then drift.
  if (exitCountdown > 0) {
    exitCountdown--;
    explosions.forEach(e=>e.update()); explosions=explosions.filter(e=>e.alive);
    if (exitCountdown === 0) triggerDriftExit();
    return;
  }
  if (state===STATES.EJECTING) { updateEject(); return; }

  // Update tank jump physics every frame
  tanks.forEach(t => { if (t.alive) t.updatePhysics(); });

  if (state===STATES.COINFLIP) { coinFlipTimer--; if(coinFlipTimer===55)doCoinFlip(); if(coinFlipTimer<=0)beginTurn(); return; }
  if (state===STATES.TURN_TRANSITION) { transitionTimer--; if(transitionTimer<=0)beginTurn(); return; }
  if (state===STATES.AI_TURN) { aiThinkTimer--; if(aiThinkTimer<=0)aiAct(); return; }
  if (state===STATES.FIRING) {
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
    tanks.forEach(t=>t.snapToGround());
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
  if (state===STATES.PLAYER_TURN) tanks.forEach(t=>{ if(!t.inAir) t.snapToGround(); });
}

function draw() {
  ctx.clearRect(0,0,W,H);
  if (state===STATES.MENU) { drawMenu(); return; }
  drawBackground();
  drawBlimp();
  if (terrainPixels) ctx.drawImage(terrainPixels,0,0);
  drawTargets();
  if (state===STATES.COINFLIP) { drawCoinFlip(); return; }
  tanks.forEach(t=>{ if(t.alive) t.draw(); });
  crawlers.forEach(c=>c.draw());
  projectiles.forEach(p=>p.draw());
  beams.forEach(b=>drawBeam(b));
  explosions.forEach(e=>e.draw());
  if (state===STATES.EJECTING) drawEject();
  drawHUD();
  if (state===STATES.TURN_TRANSITION) drawTurnTransition();
  if (state===STATES.GAME_OVER) drawGameOver();
  if (state===STATES.AI_TURN) {
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(W/2-170,H/2-30,340,60);
    ctx.fillStyle=PAL.p2cockpit; ctx.font='bold 16px monospace'; ctx.textAlign='center';
    ctx.fillText('COMPUTER THINKING'+'.'.repeat(1+Math.floor(Date.now()/400)%3),W/2,H/2+6);
  }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
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
