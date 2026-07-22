/*
 * The Dead Letter Office — full 3D room rebuild, 2026-07-21 (claude-fable).
 * A walkable basement mail hall (three.js), twice the floor area of Mandala Shop.
 * The Meshy postmaster (rig + 18-clip anim pack, 2026-07-17) walks his shift:
 * desk work, basket pickups, filing, feeding the furnace, punching the clock,
 * coffee. Undeliverable mail falls from a ceiling chute into the wire basket and
 * can be read from any angle. The twelve letters are authored (2026-07-04) and
 * unchanged; the four airmail letters still carry the drift exits, and the
 * stairwell door is a fifth.
 *
 * Hard-won integration facts honored here:
 *  - Meshy materials carry the color atlas twice (map + emissiveMap): the
 *    postmaster's emissive layer is stripped so the room's lights own him.
 *  - One-shot actions MUST fade out in the mixer 'finished' handler or their
 *    clamped end poses pile up in the blend forever (the tiny-gestures bug).
 *  - Never hold a looping action at timeScale exactly 0 (bone-write stall).
 *  - Tile textures follow the never-black rule: procedural canvas base first,
 *    Meshy tile drawn over it on load.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../lib/three/utils/BufferGeometryUtils.js';

/* ================= the twelve letters (authored, protected) ================= */

const LETTERS = [
  {
    to: "The Occupant\n14 Milk Street\nAshfield",
    from: "M. Doyle\nRoom 6, The Excelsior",
    stamp: "No Such Street",
    postmark: ["Dead Letter", "Office", "Apr 1991"],
    body: [
      "I am returning your umbrella. I borrowed it on the 3rd of April, 1951, outside the cinema, meaning to give it back the following week. The week did not behave as expected.",
      "It has kept me dry through four cities and two marriages, and I am ashamed of how well it has worked.",
      "Please find it enclosed. (I could not fold it into the envelope. I have enclosed the idea of it instead.)",
    ],
    sign: "Apologetically, M.",
  },
  {
    to: "The Bureau of Forgotten Weather\nSub-basement 4\nThe Records Annex",
    from: "D. Okafor\nApt. 3, rear",
    stamp: "Addressee Unknown",
    postmark: ["Dead Letter", "Office", "Jun 1987"],
    body: [
      "I would like to request one (1) afternoon of light rain from June 1987 — the one that hit the tin roof of my grandmother's porch between roughly two and five o'clock.",
      "I have completed the enclosed forms as best I could. Where the form asked for coordinates I have written “the porch.”",
      "I understand there may be a waiting period.",
    ],
    sign: "Respectfully, D. Okafor",
  },
  {
    to: "The Keeper\nThe Old Light\nPoint Perpetua",
    from: "(no return address)",
    stamp: "Delivery Refused",
    postmark: ["Dead Letter", "Office", "Nov 1968"],
    body: [
      "Your light comes through my window every nine seconds and drags its white sleeve across my dreams. Last night it swept away a staircase I had almost finished climbing.",
      "I am not asking you to stop. I am asking what is at the top.",
    ],
    sign: "— A neighbor",
  },
  {
    to: "Cpl. T. Havel\nGeneral Delivery\nWherever the army keeps you now",
    from: "R.\nThe kitchen table",
    stamp: "Moved — Left No Address",
    postmark: ["Dead Letter", "Office", "Feb 1994"],
    body: [
      "Knight to f3.",
      "It has been your move for thirty-one years. I have kept the board set up on the kitchen table, and I dust the pieces on Sundays. The cat knocked over your queen in the autumn of '09 but I put her back exactly.",
      "Take your time. I only wanted you to know the game is still on.",
    ],
    sign: "Your friend, R.",
  },
  {
    to: "The Sea\n(all of it)",
    from: "Adm. B. Whitlock (ret.)\nThe Esplanade",
    stamp: "Unclaimed",
    postmark: ["Dead Letter", "Office", "Aug 1975"],
    body: [
      "On the 14th inst., at approximately noon, your representative — a wave of medium size — removed my hat from my head without provocation. It was a good hat.",
      "I demand its return, or a hat of equal value, or an explanation of what the sea is doing with all of them.",
    ],
    sign: "Cordially furious, Adm. B. Whitlock (ret.)",
  },
  {
    to: "The person I was at nineteen\nThe blue house on Delancey\n(they will know)",
    from: "You, later",
    stamp: "Postage Due: One Memory",
    postmark: ["Dead Letter", "Office", "Undated"],
    body: [
      "You were right about almost nothing, and I miss you terribly.",
      "Do not take the job. Take the trip. Learn the names of trees earlier than I did. The girl at the bakery is going to break your heart and it is worth it.",
      "P.S. We still cannot whistle.",
    ],
    sign: "— You, later",
  },
  {
    to: "The Department of Echoes\nCanyon District",
    from: "(name withheld, twice)",
    stamp: "Return to Sender",
    postmark: ["Dead Letter", "Office", "May 1982"],
    body: [
      "I write to complain that everything I say to your canyon has been coming back to me. I have said things to that canyon I only ever intended to send one way.",
      "Kindly filter what is returned. Some of it I have heard twice now and cannot stop hearing.",
    ],
    sign: "— (name withheld, twice)",
  },
  {
    to: "Miss E. Farrow\nSeat 14C, the 5:52 evening train\n(northbound)",
    from: "The passenger in 14D",
    stamp: "Undeliverable as Addressed",
    postmark: ["Dead Letter", "Office", "Oct 1959"],
    body: [
      "Things seen from the window between Halloway and the tunnel, as promised: one heron, standing in a flooded field like a nail. Three dogs, unrelated. A man painting a fence at dusk, badly. Forty-one telegraph poles. Your reflection, for the length of the tunnel.",
      "That last one is the reason I am writing.",
    ],
    sign: "— The passenger in 14D",
  },
  {
    to: "The Storm\nlast seen over the dusk field",
    from: "A return address\nwritten in blue ink",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Return to Sender",
    postmark: ["Dead Letter", "Office", "At Dusk"],
    body: [
      "We regret to report that your rain has been sent back the way it came. It fell upward all evening, and the flowers were not sure what to make of it.",
      "If you want to see it happen, you will have to stand in the field yourself.",
    ],
    sign: "— The undersigned wildflowers",
  },
  {
    to: "Whoever maintains the streetlight\nat the end of Vane Street",
    from: "A return address\nwith no known station",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Do Not Bend",
    postmark: ["Dead Letter", "Office", "3:11 AM"],
    body: [
      "Your streetlight has been flickering in a pattern. I wrote the pattern down. It is not random. It spells the same word over and over, and I have begun to see the word in other lights. The elevator. The exit sign. My telephone.",
      "If you want to know where the flicker comes from, the return address is real.",
    ],
    sign: "— Wide awake on Vane St.",
  },
  {
    to: "The Tender of Lanterns\nPelagic Habitat\nbelow the shelf",
    from: "A water-damaged\nreturn address",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Received Wet",
    postmark: ["Dead Letter", "Office", "High Tide"],
    body: [
      "Your shipment of light arrived damaged. Several lumens had leaked out of the crate and were found swimming in the harbor, where they have since been adopted by the fish. The fish glow now.",
      "We consider the matter resolved, but you may want to look in on your lanterns yourself.",
    ],
    sign: "— Harbormaster, night shift",
  },
  {
    to: "THE CURRENT OCCUPANT\nOF THIS PAGE",
    from: "No fixed address",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Final Notice",
    postmark: ["Dead Letter", "Office", "Now"],
    body: [
      "You have been in the sorting room a while now. That is allowed. The mail is patient, and so is the dark.",
      "But when you are ready: something bioluminescent has been asking after you. It does not use the postal system. It says you know the way, and if you don't, the return address does.",
    ],
    sign: "— The Office",
  },
];

/* ================= the postmaster's lines (authored) ================= */

const PM_AMBIENT = [
  "Third shift is the only shift.",
  "That clock is right twice a day. This is one of them.",
  "We don't lose mail. We keep it differently.",
  "Everything down here is addressed to someone.",
  "The blue ones? Couldn't say where they go. Nobody's come back to complain.",
  "The basket is never full. We checked.",
  "Some of these are for buildings that burned down before I was born.",
  "You can read them. They stopped minding years ago.",
  "ZIP stands for something. I've forgotten what.",
  "The pigeonholes are alphabetical by regret.",
  "I stamped one twice, once. Nothing happened.",
  "The pipes only drip when you listen.",
  "Mail for the sea gets heavy. We double-bag it.",
  "Somebody upstairs keeps writing to the weather.",
  "The plant died in '78. We kept it on. Seniority.",
  "Requisitioned a new bulb in the spring. Some spring.",
  "The radiator speaks a little Morse. Mostly complaints.",
  "Every one of these was somebody's best try.",
  "The ink bottle is for signatures. Nobody signs.",
  "Dust is just mail that gave up.",
];

/* saying one of these earns him the sigh */
const PM_SIGH_LINES = new Set([
  "Some of these are for buildings that burned down before I was born.",
  "Every one of these was somebody's best try.",
  "Dust is just mail that gave up.",
  "Somebody upstairs keeps writing to the weather.",
]);

const PM_CLICKED = [
  "Yes?",
  "Can I help you? No. But ask anyway.",
  "Don't lean on the desk.",
  "I'm on break. I've been on break since '91.",
  "Mind the basket.",
  "If it's about a package: no.",
  "You want the blue ink. Everyone wants the blue ink.",
  "I sort. I don't deliver. Delivery is a rumor.",
  "Poking the postmaster. Bold.",
  "This one's addressed to a lake. See my problem?",
  "Forms are in the drawer. The drawer is a lie.",
  "I'd offer you coffee, but the mug is load-bearing.",
];

const PM_SHIFT_LINES = [
  { at: 60, line: "One minute in. That's normal. That's fine." },
  { at: 180, line: "Three minutes. The mail appreciates the company." },
  { at: 300, line: "Five minutes. Most people have followed the blue ink out by now." },
  { at: 600, line: "Ten minutes. I could find you a chair. We had chairs once." },
  { at: 1200, line: "Twenty minutes. You work here now. That's how it happened to me." },
  { at: 1800, line: "Half an hour. I'll put you down for the pension. It's a drawer of stamps." },
  { at: 2700, line: "Forty-five minutes. The clock and I have stopped keeping score." },
  { at: 3600, line: "An hour. The office is yours at midnight. Don't feed the basket." },
];

/* new contextual pools for the walking shift (2026-07-21) */
const PM_FURNACE_LINES = [
  "Past saving. The furnace has opinions about what saving means.",
  "Regulation twelve: overflow becomes heat.",
  "These ones warm the place twice.",
];
const PM_COFFEE_LINES = [
  "The pot is from '79. Possibly the coffee too.",
  "Black. Like the outgoing tray.",
];
const PM_CLOCK_LINES = [
  "Still on the clock. The clock and I punch each other.",
  "Punched in during the Ford administration.",
];
const PM_FILE_LINES = [
  "Filed under eventually.",
  "This one goes under R, for regret.",
];
const PM_BASKET_EMPTY_LINES = [
  "Basket's quiet. It's saving up.",
  "Nothing to sort. Suspicious.",
];

/* ================= DOM, renderer, scene ================= */

const stage = document.getElementById('stage');
const poster = document.getElementById('poster');
const posterNote = document.getElementById('poster-note');
const bubbleEl = document.getElementById('bubble');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail(msg) {
  if (posterNote) posterNote.textContent = msg;
  console.warn('[dlo]', msg);
}
const SERVE_HINT = 'The office needs the local server — one double-click on start-elastic-space.cmd.';

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: stage, antialias: true, powerPreference: 'high-performance',
  });
} catch (e) {
  fail('WebGL is unavailable here — the letters wait all the same.');
  throw e;
}
// Dynamic resolution (Mandala Shop pattern): full sharpness at rest, lighter
// pixel load while the camera moves. ?px=N pins a ratio for perf testing.
const pxOverride = parseFloat(new URLSearchParams(location.search).get('px'));
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
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d100f);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 60);

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

/* ================= room dimensions ================= */

const ROOM = { x0: -9, x1: 9, z0: -6, z1: 6, h: 4.1 };   // ~2x Mandala Shop's floor

/* ================= tuner (loaded early — lights read it) ================= */

const TUNE_DEFAULTS = {
  bulb: 1.5,      // hanging-bulb intensity multiplier
  lamp: 1.8,      // banker's lamp glow
  furnace: 1.1,   // furnace ember glow
  shaft: 0.16,    // window light-shaft opacity
  fog: 0.026,     // basement murk density
  mailEvery: 6,   // seconds between falling letters
  fallSpeed: 0.4, // m/s base descent
  pace: 1.0,      // postmaster activity gap multiplier (higher = lazier)
  walk: 0.95,     // postmaster walk speed m/s
};
let tune = { ...TUNE_DEFAULTS };
try { Object.assign(tune, JSON.parse(localStorage.getItem('dlo-room-tuner') || '{}')); } catch (e) { /* fresh */ }

scene.fog = new THREE.FogExp2(0x0c0e0d, tune.fog);

/* ================= lighting ================= */

scene.add(new THREE.HemisphereLight(0x8a9a90, 0x2a2620, 0.5));

// three hanging bulbs on cords: over the basket, mid-room, and the east side
const BULBS = [
  [-4.5, 3.05, -1.5],
  [0.6, 3.1, 0.6],
  [5.6, 3.05, 1.6],
];
const bulbLights = [];
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
const shadeMat = new THREE.MeshStandardMaterial({ color: 0x243026, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
const cordMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.9 });
for (const [x, y, z] of BULBS) {
  const pt = new THREE.PointLight(0xffc87a, 1.5, 13, 1.6);
  pt.position.set(x, y - 0.09, z);
  bulbLights.push(pt);
  scene.add(pt);
  const cordLen = ROOM.h - y - 0.18;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, cordLen + 0.36, 5), cordMat);
  cord.position.set(x, y + 0.18 + cordLen / 2, z);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.13, 18, 1, true), shadeMat);
  shade.position.set(x, y + 0.1, z);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bulbMat);
  glass.position.set(x, y, z);
  scene.add(cord, shade, glass);
}

// banker's lamp pool of green at the desk (fixture built with the desk below)
const lampLight = new THREE.PointLight(0x9adb6e, 1.8, 5, 1.8);
lampLight.position.set(2.12, 1.1, -4.68);
scene.add(lampLight);

// furnace embers — flickers in the loop; flares when a letter goes in
const furnaceLight = new THREE.PointLight(0xff7a2e, 1.1, 7, 1.8);
furnaceLight.position.set(6.4, 0.8, 3.3);
scene.add(furnaceLight);
let furnaceFlare = 0;

// high window: cool spill from the world upstairs
const windowLight = new THREE.DirectionalLight(0x9db8cc, 0.32);
windowLight.position.set(-8.6, 3.1, -2.0);
windowLight.target.position.set(-3.5, 0, -0.5);
scene.add(windowLight, windowLight.target);

/* ================= texture kit ================= */

const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function canvasBase(sizePx, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = sizePx;
  draw(c.getContext('2d'), sizePx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

// Never-black rule: procedural base first, Meshy tile drawn over it on load.
// Clones (props reuse the wood at another repeat) share the canvas, so the
// onload marks every registered clone dirty too.
function tileTex(file, fallbackDraw) {
  const t = canvasBase(512, fallbackDraw);
  t.userData.clones = [];
  const img = new Image();
  img.onload = () => {
    const c = t.image;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    t.needsUpdate = true;
    for (const cl of t.userData.clones) cl.needsUpdate = true;
  };
  img.src = file;
  return t;
}

function jitter(hex, amt) {
  const c = new THREE.Color(hex);
  const f = 1 + (Math.random() * 2 - 1) * amt;
  return `rgb(${Math.round(c.r * 255 * f)},${Math.round(c.g * 255 * f)},${Math.round(c.b * 255 * f)})`;
}

const texWall = tileTex('assets/textures/wall.png', (g, px) => {
  g.fillStyle = '#5a635c'; g.fillRect(0, 0, px, px);
  const bw = px / 4, bh = px / 8;
  for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) {
    const off = (r % 2) * bw / 2;
    g.fillStyle = jitter('#68726a', 0.08);
    g.fillRect(i * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
  }
});
const texFloor = tileTex('assets/textures/floor.png', (g, px) => {
  g.fillStyle = '#4a443c'; g.fillRect(0, 0, px, px);
  const s = px / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = jitter('#575046', 0.1);
    g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
  }
});
const texWood = tileTex('assets/textures/wood.png', (g, px) => {
  g.fillStyle = '#4a331d'; g.fillRect(0, 0, px, px);
  const plank = px / 6;
  for (let x = 0; x < px; x += plank) {
    g.fillStyle = jitter('#57371c', 0.12);
    g.fillRect(x + 1, 0, plank - 2, px);
  }
});

// per-surface UV scaling: one shared texture, geometry carries the repeat
function uvScale(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geo;
}

const WALL_TILE = 2.2, FLOOR_TILE = 3.0, WOOD_TILE = 1.7;
const matWall = new THREE.MeshStandardMaterial({ map: texWall, roughness: 0.94 });
const matFloor = new THREE.MeshStandardMaterial({ map: texFloor, roughness: 0.9 });
const matWood = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.8 });
const matWoodDark = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.85, color: 0x8a7a66 });
const matIron = new THREE.MeshStandardMaterial({ color: 0x2b2b2d, roughness: 0.55, metalness: 0.7 });
const matPipe = new THREE.MeshStandardMaterial({ color: 0x3a3d3c, roughness: 0.5, metalness: 0.75 });
const matPaper = new THREE.MeshStandardMaterial({ color: 0xd8cdae, roughness: 0.95 });

/* ================= room shell ================= */

{
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0;
  const floor = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(W, D), W / FLOOR_TILE, D / FLOOR_TILE), matFloor);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: 0x211f1c, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM.h;
  scene.add(ceil);

  const mkWall = (w, x, z, ry) => {
    const m = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(w, ROOM.h), w / WALL_TILE, ROOM.h / WALL_TILE), matWall);
    m.position.set(x, ROOM.h / 2, z);
    m.rotation.y = ry;
    scene.add(m);
  };
  mkWall(W, 0, ROOM.z0, 0);            // north
  mkWall(W, 0, ROOM.z1, Math.PI);      // south
  mkWall(D, ROOM.x0, 0, Math.PI / 2);  // west
  mkWall(D, ROOM.x1, 0, -Math.PI / 2); // east

  // ceiling beams + pipe runs, merged into two meshes
  const beamGeos = [];
  for (let z = -4.5; z <= 4.5; z += 3) {
    const g = new THREE.BoxGeometry(W, 0.22, 0.24);
    g.translate(0, ROOM.h - 0.11, z);
    beamGeos.push(uvScale(g, W / WOOD_TILE, 0.3));
  }
  scene.add(new THREE.Mesh(mergeGeometries(beamGeos), matWoodDark));

  const pipeGeos = [];
  const pipe = (r, len, x, y, z, rx, rz) => {
    const g = new THREE.CylinderGeometry(r, r, len, 10);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    pipeGeos.push(g);
  };
  pipe(0.07, 12, -6.6, ROOM.h - 0.34, 0, Math.PI / 2, 0);          // north-south run, west
  pipe(0.05, 12, -6.25, ROOM.h - 0.5, 0, Math.PI / 2, 0);
  pipe(0.07, 18, 0, ROOM.h - 0.4, 4.6, 0, Math.PI / 2);            // east-west run, south
  pipe(0.055, 18, 0, ROOM.h - 0.62, 4.85, 0, Math.PI / 2);
  pipe(0.07, ROOM.h, -8.6, ROOM.h / 2, -4.6, 0, 0);                // corner downpipe
  pipe(0.045, ROOM.h, 8.55, ROOM.h / 2, -4.9, 0, 0);
  scene.add(new THREE.Mesh(mergeGeometries(pipeGeos), matPipe));
}

/* ================= canvas signage ================= */

function signTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function addSign(tex, w, h, x, y, z, ry, { lit = false } = {}) {
  const mat = lit
    ? new THREE.MeshBasicMaterial({ map: tex })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

// DEAD LETTER OFFICE — the house sign, north wall
addSign(signTexture(1024, 512, (g, w, h) => {
  g.fillStyle = '#1c262b'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#5a6a66'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#c9b483';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 118px "Arial Narrow", Impact, sans-serif';
  g.fillText('DEAD', w / 2, 118);
  g.fillText('LETTER', w / 2, 238);
  g.fillText('OFFICE', w / 2, 358);
  g.font = '700 44px "Arial Narrow", Impact, sans-serif';
  g.fillStyle = '#8a9a90';
  g.fillText('WE  DELIVER  NOWHERE', w / 2, 452);
}), 2.4, 1.2, -0.8, 2.55, ROOM.z0 + 0.02, 0);

// stopped wall clock — 3:11, forever
addSign(signTexture(256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = '#d8cdae';
  g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#26221c'; g.lineWidth = 12;
  g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#26221c';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.save(); g.translate(128, 128); g.rotate(a);
    g.fillRect(-4, -104, 8, 22);
    g.restore();
  }
  const hand = (a, len, wdt) => {
    g.save(); g.translate(128, 128); g.rotate(a);
    g.fillRect(-wdt / 2, -len, wdt, len + 12);
    g.restore();
  };
  hand((3 + 11 / 60) / 12 * Math.PI * 2, 58, 10);  // hour: 3:11
  hand(11 / 60 * Math.PI * 2, 92, 6);              // minute
  g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
}), 0.66, 0.66, 2.6, 2.9, ROOM.z0 + 0.02, 0);

// tally boards, amber and patient (dead letters count ticks up live)
let deadLettersTotal = 1427;
const tallyCtx = {};
function tallyTexture(key, label, value) {
  return signTexture(512, 200, (g, w, h) => {
    tallyCtx[key] = { g, w, h, label };
    drawTally(g, w, h, label, value);
  });
}
function drawTally(g, w, h, label, value) {
  g.fillStyle = '#141210'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#4a4436'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#8a7a56';
  g.font = '700 46px "Courier New", monospace';
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(label, 34, 58);
  g.fillStyle = '#d8a54a';
  g.font = '700 84px "Courier New", monospace';
  g.fillText(value, 34, 140);
}
const texTallyDead = tallyTexture('dead', 'DEAD LETTERS', String(deadLettersTotal).padStart(7, '0'));
const texTallyUnclaimed = tallyTexture('unclaimed', 'UNCLAIMED', '0000115');
addSign(texTallyDead, 1.35, 0.53, -6.9, 3.15, ROOM.z0 + 0.02, 0, { lit: true });
addSign(texTallyUnclaimed, 1.35, 0.53, -6.9, 2.5, ROOM.z0 + 0.02, 0, { lit: true });
function bumpDeadLetters() {
  deadLettersTotal += 1;
  const t = tallyCtx.dead;
  drawTally(t.g, t.w, t.h, t.label, String(deadLettersTotal).padStart(7, '0'));
  texTallyDead.needsUpdate = true;
}

// LOST? — a poster of a cat nobody is looking for
addSign(signTexture(256, 340, (g, w, h) => {
  g.fillStyle = '#cfc2a0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#8a7d60'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#3a3226';
  g.textAlign = 'center';
  g.font = '700 52px "Courier New", monospace';
  g.fillText('LOST?', w / 2, 64);
  g.strokeStyle = '#3a3226'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2, 170, 52, 0, Math.PI * 2); g.stroke();     // head
  g.beginPath(); g.moveTo(w / 2 - 44, 140); g.lineTo(w / 2 - 24, 108); g.lineTo(w / 2 - 8, 132); g.stroke();  // ear
  g.beginPath(); g.moveTo(w / 2 + 44, 140); g.lineTo(w / 2 + 24, 108); g.lineTo(w / 2 + 8, 132); g.stroke();
  g.fillRect(w / 2 - 22, 160, 8, 8); g.fillRect(w / 2 + 14, 160, 8, 8); // eyes
  g.beginPath(); g.moveTo(w / 2, 178); g.lineTo(w / 2 - 6, 188); g.lineTo(w / 2 + 6, 188); g.closePath(); g.fill();
  g.font = '400 26px "Courier New", monospace';
  g.fillText('answers to nothing', w / 2, 268);
  g.fillText('reward: none', w / 2, 300);
}), 0.5, 0.66, -3.6, 1.9, ROOM.z0 + 0.02, 0);

/* ================= west wall: window, radiator, door, punch clock ============ */

// high barred window with a cool light shaft
{
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 1.7), matIron);
  frame.position.set(ROOM.x0 + 0.04, 3.0, -2.0);
  scene.add(frame);
  const panes = new THREE.Mesh(
    new THREE.PlaneGeometry(1.56, 0.92),
    new THREE.MeshBasicMaterial({ color: 0x4a6070 }));
  panes.position.set(ROOM.x0 + 0.1, 3.0, -2.0);
  panes.rotation.y = Math.PI / 2;
  scene.add(panes);
  const barGeos = [];
  for (let i = -2; i <= 2; i++) {
    const g = new THREE.CylinderGeometry(0.018, 0.018, 0.98, 6);
    g.translate(0, 0, 0);
    g.rotateX(0);
    g.translate(0, 0, i * 0.3);
    barGeos.push(g);
  }
  const hbar = new THREE.CylinderGeometry(0.016, 0.016, 1.6, 6);
  hbar.rotateX(Math.PI / 2);
  barGeos.push(hbar);
  const bars = new THREE.Mesh(mergeGeometries(barGeos), matIron);
  bars.position.set(ROOM.x0 + 0.14, 3.0, -2.0);
  scene.add(bars);
}
// the shaft itself: an additive gradient quad angling to the floor
const shaftMat = (() => {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(157,184,204,0.9)');
  gr.addColorStop(1, 'rgba(157,184,204,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  return new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity: tune.shaft,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
})();
{
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 4.6), shaftMat);
  shaft.position.set(ROOM.x0 + 1.65, 1.85, -1.6);
  shaft.rotation.set(0, Math.PI / 2, 0.62);
  scene.add(shaft);
}

// radiator under the window — its fins speak a little Morse
{
  const fins = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.CylinderGeometry(0.05, 0.05, 0.78, 8);
    g.translate(0, 0, i * 0.115 - 0.46);
    fins.push(g);
  }
  const top = new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8);
  top.rotateX(Math.PI / 2);
  top.translate(0, 0.36, 0);
  fins.push(top);
  const rad = new THREE.Mesh(mergeGeometries(fins),
    new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.6, metalness: 0.5 }));
  rad.position.set(ROOM.x0 + 0.32, 0.42, -2.0);
  scene.add(rad);
}

// the stairwell door — a drift exit. Metal, wire glass, somewhere above: stairs.
const doorMeshes = new Set();
{
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.25, 1.12),
    new THREE.MeshStandardMaterial({ color: 0x39443e, roughness: 0.6, metalness: 0.45 }));
  door.position.set(ROOM.x0 + 0.06, 1.125, 2.6);
  scene.add(door);
  doorMeshes.add(door);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46),
    new THREE.MeshBasicMaterial({ color: 0x6a7d54 }));
  glass.position.set(ROOM.x0 + 0.115, 1.7, 2.6);
  glass.rotation.y = Math.PI / 2;
  scene.add(glass);
  doorMeshes.add(glass);
  // wire grid over the glass
  const wires = [];
  for (let i = -3; i <= 3; i++) {
    const gv = new THREE.CylinderGeometry(0.004, 0.004, 0.46, 4);
    gv.translate(0, 0, i * 0.048);
    wires.push(gv);
    const gh = new THREE.CylinderGeometry(0.004, 0.004, 0.34, 4);
    gh.rotateX(Math.PI / 2);
    gh.translate(0, i * 0.062, 0);
    wires.push(gh);
  }
  const wireMesh = new THREE.Mesh(mergeGeometries(wires), matIron);
  wireMesh.position.set(ROOM.x0 + 0.12, 1.7, 2.6);
  scene.add(wireMesh);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a8a5a, roughness: 0.35, metalness: 0.9 }));
  knob.position.set(ROOM.x0 + 0.13, 1.05, 2.18);
  scene.add(knob);
  doorMeshes.add(knob);
  addSign(signTexture(256, 96, (g, w, h) => {
    g.fillStyle = '#8a8064'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26221c';
    g.font = '700 54px "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STAIRS ↗', w / 2, h / 2 + 2);
  }), 0.56, 0.21, ROOM.x0 + 0.03, 2.62, 2.6, Math.PI / 2);
}

// punch clock beside the door, amber and counting your shift
const punchCtx = {};
const texPunch = signTexture(256, 128, (g, w, h) => {
  punchCtx.g = g; punchCtx.w = w; punchCtx.h = h;
  drawPunch('0:00');
});
function drawPunch(text) {
  const { g, w, h } = punchCtx;
  g.fillStyle = '#141210'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#4a4436'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#d8a54a';
  g.font = '700 64px "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
}
const punchClockMeshes = new Set();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.42), matIron);
  body.position.set(ROOM.x0 + 0.1, 1.62, 1.15);
  scene.add(body);
  punchClockMeshes.add(body);
  const face = addSign(texPunch, 0.34, 0.17, ROOM.x0 + 0.185, 1.74, 1.15, Math.PI / 2, { lit: true });
  punchClockMeshes.add(face);
  // card rack with three timecards, one forever half-punched
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.34), matWoodDark);
  rack.position.set(ROOM.x0 + 0.06, 1.02, 1.15);
  scene.add(rack);
  for (let i = 0; i < 3; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.16), matPaper);
    card.position.set(ROOM.x0 + 0.1, 1.14, 1.02 + i * 0.13);
    card.rotation.set(0, Math.PI / 2, (i - 1) * 0.06);
    scene.add(card);
  }
}

/* ================= north wall: pigeonholes ================= */

const pigeonholeSlots = [];   // world positions envelopes fly into
{
  const unit = new THREE.Group();
  const COLS = 6, ROWS = 4, CW = 0.5, CH = 0.42, DEEP = 0.4;
  const W = COLS * CW + 0.08, H = ROWS * CH + 0.08;
  const back = new THREE.Mesh(uvScale(new THREE.BoxGeometry(W, H, 0.04), W / WOOD_TILE, H / WOOD_TILE), matWood);
  back.position.set(0, H / 2, -DEEP / 2);
  unit.add(back);
  const shelfGeos = [];
  for (let r = 0; r <= ROWS; r++) {
    const g = new THREE.BoxGeometry(W, 0.035, DEEP);
    g.translate(0, r * CH + 0.02, 0);
    shelfGeos.push(g);
  }
  for (let cIdx = 0; cIdx <= COLS; cIdx++) {
    const g = new THREE.BoxGeometry(0.035, H, DEEP);
    g.translate(cIdx * CW - W / 2 + 0.04, H / 2, 0);
    shelfGeos.push(g);
  }
  unit.add(new THREE.Mesh(uvScale(mergeGeometries(shelfGeos), 2, 2), matWood));
  // a few resident bundles
  for (let k = 0; k < 7; k++) {
    const cIdx = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1 + Math.random() * 0.14, 0.24), matPaper);
    b.position.set(cIdx * CW - W / 2 + CW / 2 + 0.04, r * CH + 0.12, 0.02);
    b.rotation.y = (Math.random() - 0.5) * 0.3;
    unit.add(b);
  }
  unit.position.set(6.25, 0.86, ROOM.z0 + 0.26);
  scene.add(unit);
  // stout legs
  for (const lx of [-W / 2 + 0.1, W / 2 - 0.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.86, 0.3), matWood);
    leg.position.set(6.25 + lx, 0.43, ROOM.z0 + 0.26);
    scene.add(leg);
  }
  for (let cIdx = 0; cIdx < COLS; cIdx++) {
    for (let r = 0; r < ROWS; r++) {
      pigeonholeSlots.push(new THREE.Vector3(
        6.25 + cIdx * CW - W / 2 + CW / 2 + 0.04,
        0.86 + r * CH + 0.2,
        ROOM.z0 + 0.42));
    }
  }
}

/* ================= east wall: filing cabinet, coffee, coat rack ============== */

let cabinetTopY = 1.32;
{
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.32, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x4e5a54, roughness: 0.55, metalness: 0.5 }));
  cab.position.set(8.35, 0.66, -0.6);
  scene.add(cab);
  for (let i = 0; i < 4; i++) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.86), matIron);
    drawer.position.set(8.02, 0.24 + i * 0.31, -0.6);
    scene.add(drawer);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x9a8a5a, metalness: 0.8, roughness: 0.4 }));
    handle.position.set(7.99, 0.3 + i * 0.31, -0.6);
    scene.add(handle);
  }
  // hotplate + glass pot + a mug: the coffee station
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 14), matIron);
  plate.position.set(8.3, cabinetTopY + 0.025, -0.32);
  scene.add(plate);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.2, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85 }));
  pot.position.set(8.3, cabinetTopY + 0.15, -0.32);
  scene.add(pot);
  const potHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), matIron);
  potHandle.position.set(8.17, cabinetTopY + 0.16, -0.32);
  potHandle.rotation.set(0, 0, -Math.PI / 2);
  scene.add(potHandle);
}

// coat rack with the postmaster's off-duty coat and mail bag (he is never off duty)
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.9, 8), matWood);
  pole.position.set(8.4, 0.95, -5.35);
  scene.add(pole);
  for (let i = 0; i < 3; i++) {
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), matWood);
    peg.position.set(8.4, 1.72 - i * 0.06, -5.35);
    peg.rotation.z = Math.PI / 2 - 0.4;
    peg.rotation.y = i * 2.1;
    scene.add(peg);
  }
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x7a6a4c, roughness: 0.95 }));
  bag.position.set(8.28, 1.28, -5.18);
  bag.scale.set(1, 1, 0.6);
  scene.add(bag);
}

/* ================= south side clutter: crates, mail cart, sacks ============== */

{
  const crate = (x, z, w, h, d, ry) => {
    const m = new THREE.Mesh(uvScale(new THREE.BoxGeometry(w, h, d), w / WOOD_TILE, h / WOOD_TILE), matWood);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    scene.add(m);
  };
  crate(-2.0, 5.25, 0.9, 0.62, 0.7, 0.12);
  crate(-2.05, 5.3, 0.8, 0.55, 0.62, -0.2);   // stacked pair
  const top = new THREE.Mesh(uvScale(new THREE.BoxGeometry(0.8, 0.55, 0.62), 0.5, 0.35), matWood);
  top.position.set(-2.05, 0.62 + 0.28, 5.3);
  top.rotation.y = -0.2;
  scene.add(top);
  crate(-3.3, 5.4, 0.72, 0.5, 0.6, 0.35);
  const sackMat = new THREE.MeshStandardMaterial({ color: 0x6e604a, roughness: 0.98 });
  for (const [sx, sz, s] of [[-4.2, 5.2, 1], [-4.55, 4.7, 0.85], [3.1, 5.35, 0.9]]) {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), sackMat);
    sack.position.set(sx, 0.3 * s, sz);
    sack.scale.set(s, 0.85 * s, s);
    scene.add(sack);
  }
  // the mail cart — canvas bin on casters
  const cart = new THREE.Group();
  const bin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x8a7c5e, roughness: 0.97 }));
  bin.position.y = 0.62;
  cart.add(bin);
  const frameMat2 = new THREE.MeshStandardMaterial({ color: 0x33393a, metalness: 0.7, roughness: 0.45 });
  for (const [cx, cz] of [[-0.46, -0.28], [0.46, -0.28], [-0.46, 0.28], [0.46, 0.28]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), frameMat2);
    leg.position.set(cx, 0.16, cz);
    cart.add(leg);
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), frameMat2);
    wheel.position.set(cx, 0.05, cz);
    cart.add(wheel);
  }
  const pileGeo = new THREE.BoxGeometry(0.9, 0.1, 0.5);
  const pile = new THREE.Mesh(pileGeo, matPaper);
  pile.position.set(0, 0.9, 0);
  pile.rotation.z = 0.05;
  cart.add(pile);
  cart.position.set(4.0, 0, 4.95);
  cart.rotation.y = -0.35;
  scene.add(cart);
}

/* ================= the rug ================= */

{
  const texRug = signTexture(512, 340, (g, w, h) => {
    g.fillStyle = '#5e2f28'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a5a3a'; g.lineWidth = 14; g.strokeRect(18, 18, w - 36, h - 36);
    g.strokeStyle = '#3a5a50'; g.lineWidth = 6; g.strokeRect(38, 38, w - 76, h - 76);
    g.fillStyle = '#8a5a3a';
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
    g.fillRect(-60, -60, 120, 120);
    g.restore();
    g.fillStyle = '#3a5a50';
    g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 40; k++) {   // threadbare wear
      g.fillStyle = `rgba(200,180,150,${0.04 + Math.random() * 0.05})`;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 14 + Math.random() * 30, 6 + Math.random() * 14,
        Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2),
    new THREE.MeshStandardMaterial({ map: texRug, roughness: 0.98 }));
  rug.rotation.x = -Math.PI / 2;
  rug.rotation.z = 0.03;
  rug.position.set(2.4, 0.006, -3.0);
  scene.add(rug);
}

/* ================= ceiling chute over the basket ================= */

{
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.62), matPipe);
  mouth.position.set(-4.5, ROOM.h - 0.15, -1.5);
  scene.add(mouth);
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.52),
    new THREE.MeshBasicMaterial({ color: 0x050505 }));
  dark.rotation.x = Math.PI / 2;
  dark.position.set(-4.5, ROOM.h - 0.31, -1.5);
  scene.add(dark);
  addSign(signTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#6e6452'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#211d16';
    g.font = '700 34px "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('INCOMING', w / 2, h / 2 + 1);
  }), 0.5, 0.125, -4.5, ROOM.h - 0.36, -1.18, 0);
}

/* ================= Meshy props ================= */

const loader = new GLTFLoader();
const propTex = (worldMeters, extra = {}) => {
  // prop UVs are cube-projected at 0.5m per UV unit (Blender pass)
  const t = texWood.clone();
  t.needsUpdate = true;
  t.repeat.setScalar(0.5 / worldMeters);
  texWood.userData.clones.push(t);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, ...extra });
};

const PROP_MATERIALS = {
  prop_desk: () => propTex(WOOD_TILE, { color: 0xb59a78 }),
  prop_chair: () => propTex(WOOD_TILE, { color: 0xa88a68 }),
  prop_basket: () => new THREE.MeshStandardMaterial({ color: 0x5a5c58, roughness: 0.45, metalness: 0.8 }),
  prop_furnace: () => new THREE.MeshStandardMaterial({ color: 0x232120, roughness: 0.6, metalness: 0.55 }),
  prop_plant_leaf: () => new THREE.MeshStandardMaterial({ color: 0x5a6b3a, roughness: 0.9 }),
  prop_plant_pot: () => new THREE.MeshStandardMaterial({ color: 0x9a5a38, roughness: 0.85 }),
};

let basketRimY = 1.1;           // refined from the basket bbox on load
let deskSurfaceY = 0.76;        // refined by raycast on load
const raycaster = new THREE.Raycaster();

const PROPS = [
  {
    file: 'assets/props/desk.glb', height: 1.42, pos: [2.5, 0, -5.0], rotY: 0,
    then(wrap) {
      // find the writing surface by dropping a ray at the front-left of the top
      wrap.updateMatrixWorld(true);
      raycaster.set(new THREE.Vector3(2.15, 2.4, -4.68), new THREE.Vector3(0, -1, 0));
      const hit = raycaster.intersectObject(wrap, true)[0];
      if (hit) deskSurfaceY = hit.point.y;
      dressDesk();
    },
  },
  { file: 'assets/props/chair.glb', height: 0.98, pos: [3.6, 0, -4.25], rotY: 2.7 },
  {
    file: 'assets/props/basket.glb', height: 1.12, pos: [-4.5, 0, -1.5], rotY: 0,
    then(wrap) {
      const box = new THREE.Box3().setFromObject(wrap);
      basketRimY = box.max.y;
      const placard = addSign(signTexture(256, 96, (g, w, h) => {
        g.fillStyle = '#b0a684'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#4a4436'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
        g.fillStyle = '#26221c';
        g.font = '700 40px "Courier New", monospace';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('DEAD', w / 2, 32);
        g.fillText('LETTERS', w / 2, 68);
      }), 0.44, 0.17, -4.5, 0.62, -0.82, 0);
      placard.rotation.x = -0.08;
    },
  },
  {
    file: 'assets/props/furnace.glb', height: 1.38, pos: [6.8, 0, 3.5], rotY: -2.05,
    then() {
      // stovepipe up through the ceiling + ember glow in the mouth
      const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, ROOM.h - 1.25, 10), matPipe);
      pipeMesh.position.set(6.8, 1.25 + (ROOM.h - 1.25) / 2, 3.5);
      scene.add(pipeMesh);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.1, 10), matPipe);
      collar.position.set(6.8, 1.3, 3.5);
      scene.add(collar);
      const ember = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12),
        new THREE.MeshBasicMaterial({ color: 0xff8a30 }));
      const fdir = new THREE.Vector3(Math.sin(-2.05), 0, Math.cos(-2.05));
      ember.position.set(6.8 + fdir.x * 0.52, 0.52, 3.5 + fdir.z * 0.52);
      ember.lookAt(ember.position.clone().add(fdir));
      scene.add(ember);
    },
  },
  { file: 'assets/props/plant.glb', height: 0.62, pos: [8.3, cabinetTopY, -0.95], rotY: 0.6 },
];

const furnaceMouth = new THREE.Vector3(6.8 + Math.sin(-2.05) * 0.55, 0.62, 3.5 + Math.cos(-2.05) * 0.55);
const propClickables = { furnace: new Set() };

let propsLoaded = 0;
for (const spec of PROPS) {
  loader.load(spec.file, (gltf) => {
    const src = gltf.scene;
    src.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const name = o.material.name || '';
      for (const key of Object.keys(PROP_MATERIALS)) {
        if (name.startsWith(key)) { o.material = PROP_MATERIALS[key](); return; }
      }
      // unnamed fallback: pick by file
      const stem = spec.file.match(/props\/(\w+)\.glb/)[1];
      const key = stem === 'plant' ? 'prop_plant_leaf' : 'prop_' + stem;
      if (PROP_MATERIALS[key]) o.material = PROP_MATERIALS[key]();
    });
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = spec.height / size.y;
    const wrap = new THREE.Group();
    const inst = src;
    inst.position.set(-center.x, -box.min.y, -center.z);
    wrap.add(inst);
    wrap.scale.setScalar(s);
    wrap.position.set(...spec.pos);
    wrap.rotation.y = spec.rotY;
    scene.add(wrap);
    if (spec.file.includes('furnace')) {
      inst.traverse((o) => { if (o.isMesh) propClickables.furnace.add(o); });
      hoverDirty = true;
    }
    if (spec.then) spec.then(wrap);
    propsLoaded += 1;
    if (posterNote) posterNote.textContent = `setting the room… ${propsLoaded}/${PROPS.length + 1}`;
  }, undefined, () => console.warn('[dlo] prop failed to load:', spec.file));
}

// desk dressing: banker's lamp, mug, nameplate, papers — placed on the surface
// found by raycast, so nothing floats or sinks
function dressDesk() {
  const y = deskSurfaceY;
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8446, roughness: 0.3, metalness: 0.9 });
  const lamp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12), brass);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), brass);
  stem.position.y = 0.16;
  stem.rotation.z = 0.28;
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x1d4a2a, roughness: 0.3, metalness: 0.2,
      emissive: 0x2a6b30, emissiveIntensity: 0.7, side: THREE.DoubleSide,
    }));
  shade.position.set(-0.06, 0.31, 0);
  shade.scale.set(1, 0.72, 0.62);
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12),
    new THREE.MeshBasicMaterial({ color: 0xd8ffb0 }));
  glowDisc.rotation.x = Math.PI / 2;
  glowDisc.position.set(-0.06, 0.29, 0);
  lamp.add(base, stem, shade, glowDisc);
  lamp.position.set(2.12, y, -4.68);
  lamp.rotation.y = 0.5;
  scene.add(lamp);
  lampLight.position.set(2.09, y + 0.28, -4.68);

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.7 }));
  mug.position.set(2.92, y + 0.05, -4.6);
  scene.add(mug);

  const namePlate = addSign(signTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#211d16'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9a8446'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#c9b483';
    g.font = '700 34px "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('POSTMASTER', w / 2, h / 2 + 1);
  }), 0.3, 0.075, 2.5, y + 0.05, -4.56, 0);
  namePlate.rotation.x = -0.18;

  for (let i = 0; i < 3; i++) {
    const papers = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012 + Math.random() * 0.03, 0.32), matPaper);
    papers.position.set(2.62 + i * 0.14 - 0.2, y + 0.02, -4.78 + (i % 2) * 0.12);
    papers.rotation.y = (Math.random() - 0.5) * 0.5;
    scene.add(papers);
  }
  // RETURN TO SENDER TO NOWHERE — paper sign pinned to the desk's room side
  const rts = addSign(signTexture(256, 300, (g, w, h) => {
    g.fillStyle = '#cfc2a0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3226';
    g.font = '700 44px "Courier New", monospace';
    g.textAlign = 'center';
    ['RETURN', 'TO', 'SENDER', 'TO', 'NOWHERE'].forEach((t, i) => g.fillText(t, w / 2, 56 + i * 52));
  }), 0.3, 0.36, 2.86, 0.62, -4.585, Math.PI);
  rts.rotation.z = 0.04;
}

/* ================= the postmaster ================= */

const IDLES = ['idle-1', 'idle-2', 'idle-3'];
const STILL = 0.0001;   // never exactly 0 — the mixer stops rewriting bones

const pmGroup = new THREE.Group();
scene.add(pmGroup);
let pmModel = null, mixer = null, headBone = null, handBone = null;
const actions = {};
let baseAction = null, oneshotAction = null, oneshotDone = null;

function blobShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.55),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

function nameOf(action) { return action.getClip().name; }
function pickIdle() { return IDLES[Math.floor(Math.random() * IDLES.length)]; }

function playBase(name, fade = 0.35, timeScale = 1) {
  const next = actions[name];
  if (!next) return;
  next.timeScale = timeScale;
  if (oneshotAction) { oneshotAction.fadeOut(fade); oneshotAction = null; oneshotDone = null; }
  if (baseAction === next) return;
  if (baseAction) baseAction.fadeOut(fade);
  next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
  baseAction = next;
}

function playOneshot(name, done, fade = 0.3) {
  const next = actions[name];
  if (!next || next === oneshotAction) { if (done) done(); return; }
  if (oneshotAction) oneshotAction.fadeOut(fade);
  if (baseAction) baseAction.fadeOut(fade);
  next.reset().setLoop(THREE.LoopOnce, 1).fadeIn(fade).play();
  next.clampWhenFinished = true;
  oneshotAction = next;
  oneshotDone = done || null;
}

Promise.all([
  loader.loadAsync('assets/postmaster/postmaster.glb'),
  loader.loadAsync('assets/postmaster/anim-pack.glb'),
]).then(([modelGltf, packGltf]) => {
  pmModel = modelGltf.scene;
  const bbox = new THREE.Box3().setFromObject(pmModel);
  const size = bbox.getSize(new THREE.Vector3());
  const scale = 1.7 / size.y;
  pmModel.scale.setScalar(scale);
  pmModel.position.y = -bbox.min.y * scale;
  pmModel.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    // Meshy dual atlas: strip the emissive copy so the room's light owns him
    o.material.emissiveMap = null;
    if (o.material.emissive) o.material.emissive.set(0x000000);
    o.material.roughness = 0.85;
    o.material.needsUpdate = true;
    o.frustumCulled = false;   // skinned mesh: bind-pose bounds lie once he walks
  });
  pmGroup.add(pmModel);
  pmGroup.add(blobShadow());
  headBone = pmModel.getObjectByName('Head');
  handBone = pmModel.getObjectByName('RightHand');

  mixer = new THREE.AnimationMixer(pmModel);
  for (const clip of packGltf.animations) {
    if (clip.name.includes('|')) continue;   // stray unnamed export
    actions[clip.name] = mixer.clipAction(clip);
  }
  mixer.addEventListener('finished', (e) => {
    if (e.action !== oneshotAction) return;
    oneshotAction = null;
    // release the clamped end pose or every later clip shrinks (2026-07-17 bug)
    e.action.fadeOut(0.35);
    const done = oneshotDone;
    oneshotDone = null;
    if (!baseAction || baseAction.getEffectiveWeight() < 0.5) {
      const name = baseAction ? nameOf(baseAction) : pickIdle();
      baseAction = null;
      playBase(name);
    }
    if (done) done();
  });

  pmGroup.position.set(PM_STATIONS.desk.x, 0, PM_STATIONS.desk.z);
  pmYaw = PM_STATIONS.desk.face;
  pmGroup.rotation.y = pmYaw;
  hoverDirty = true;   // he just joined the click targets
  if (reducedMotion) {
    playBase('idle-2', 0.35, STILL);
  } else {
    playBase(pickIdle());
    pmScheduleNext(6);
  }
  propsLoaded += 1;
  posterFadeOut();
}).catch(() => fail('Could not load the postmaster. ' + SERVE_HINT));

function posterFadeOut() {
  if (!poster) return;
  poster.style.transition = 'opacity 1.1s ease';
  poster.style.opacity = '0';
  setTimeout(() => { poster.style.display = 'none'; }, 1200);
}

/* ================= navigation graph (verified in tools sim) ================= */

const PM_STATIONS = {
  desk:    { x: 2.5, z: -4.15, face: Math.PI },     // works at the desk, back to the room
  basket:  { x: -3.3, z: -0.6, face: -2.21 },
  furnace: { x: 5.7, z: 2.6, face: 0.885 },
  clock:   { x: -7.9, z: 1.2, face: -Math.PI / 2 },
  coffee:  { x: 7.3, z: -0.6, face: Math.PI / 2 },
  window:  { x: -7.8, z: -2.9, face: -0.93 },
  pigeon:  { x: 5.6, z: -4.5, face: Math.PI },
  wander1: { x: 0, z: 1.5, face: 0 },
  wander2: { x: -1.5, z: -2.5, face: Math.PI },
  wander3: { x: 3.5, z: 1.8, face: 0.4 },
};

const NAV_NODES = {
  H1: { x: 0, z: 0.8 },
  H2: { x: -4.0, z: 1.2 },
  H3: { x: 4.6, z: 0.6 },
  H4: { x: -6.8, z: 2.2 },
  H5: { x: 4.9, z: 3.4 },
  H7: { x: 4.35, z: -3.6 },
  ...PM_STATIONS,
};
const NAV_EDGES = [
  ['desk', 'H7'], ['H7', 'H3'], ['H7', 'pigeon'],
  ['H3', 'H1'], ['H3', 'H5'], ['H3', 'furnace'], ['H3', 'coffee'], ['H3', 'wander3'],
  ['H5', 'furnace'],
  ['H1', 'H2'], ['H1', 'wander1'], ['H1', 'wander2'], ['H1', 'basket'],
  ['H2', 'basket'], ['H2', 'H4'], ['H2', 'window'],
  ['H4', 'clock'], ['H4', 'window'],
];
const NAV_ADJ = {};
for (const [a, b] of NAV_EDGES) {
  (NAV_ADJ[a] = NAV_ADJ[a] || []).push(b);
  (NAV_ADJ[b] = NAV_ADJ[b] || []).push(a);
}

function navRoute(fromKey, toKey) {
  if (fromKey === toKey) return [toKey];
  const prev = { [fromKey]: null };
  const q = [fromKey];
  while (q.length) {
    const n = q.shift();
    for (const m of NAV_ADJ[n] || []) {
      if (m in prev) continue;
      prev[m] = n;
      if (m === toKey) {
        const path = [m];
        let p = n;
        while (p) { path.unshift(p); p = prev[p]; }
        return path;
      }
      q.push(m);
    }
  }
  return [fromKey, toKey];   // fallback: straight line (graph is connected; belt+braces)
}

/* ================= postmaster shift brain ================= */

let pmYaw = Math.PI;
let pmState = 'station';        // station | walking | busy
let pmStationKey = 'desk';
let pmPath = [];                // remaining [x,z] waypoints
let pmNextAt = Infinity;        // when to pick the next routine (perf.now ms)
let pmCarried = null;           // envelope mesh being carried
let pmFaceCamera = 0;           // >0: seconds left of facing the visitor

function pmScheduleNext(seconds) {
  pmNextAt = performance.now() + seconds * 1000 * tune.pace;
}

function pmWalkTo(stationKey, arrived) {
  const route = navRoute(pmStationKey, stationKey);
  pmPath = route.slice(1).map((k) => NAV_NODES[k]);
  pmStationKey = stationKey;
  pmState = 'walking';
  pmArrived = arrived || null;
  playBase('walk', 0.3, tune.walk / 0.9);
}
let pmArrived = null;

function pmSpeakFrom(pool) {
  if (Math.random() < 0.55) speak(pool[Math.floor(Math.random() * pool.length)]);
}

// one envelope mesh rides the right hand while he carries a letter
function makeCarriedEnvelope() {
  const group = envelopeMesh(Math.floor(Math.random() * LETTERS.length), false);
  group.scale.setScalar(0.9);
  scene.add(group);
  return group;
}

function pmRoutine() {
  const roll = Math.random();
  if (roll < 0.24) {                       // desk work
    if (pmStationKey !== 'desk') {
      pmWalkTo('desk', () => { playBase(pickIdle()); pmScheduleNext(10 + Math.random() * 10); });
    } else {
      pmState = 'busy';
      const g = Math.random();
      const clip = g < 0.4 ? 'scheme' : g < 0.6 ? 'shrug' : g < 0.8 ? 'wag-no' : 'sigh';
      if (clip === 'scheme') setTimeout(() => playThunk(), 1400);
      playOneshot(clip, () => { pmState = 'station'; pmScheduleNext(8 + Math.random() * 12); });
    }
  } else if (roll < 0.46) {                // basket run: pick up, then file or burn
    pmWalkTo('basket', () => {
      const source = takeBasketEnvelope();
      if (!source) {
        pmSpeakFrom(PM_BASKET_EMPTY_LINES);
        pmState = 'busy';
        playOneshot('shrug', () => { pmState = 'station'; pmScheduleNext(9 + Math.random() * 8); });
        return;
      }
      pmState = 'busy';
      playOneshot('bow', () => {
        pmCarried = makeCarriedEnvelope();
        const burn = Math.random() < 0.45;
        pmWalkTo(burn ? 'furnace' : 'pigeon', burn ? pmBurnCarried : pmFileCarried);
      });
    });
  } else if (roll < 0.58) {                // coffee
    pmWalkTo('coffee', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_COFFEE_LINES);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.09, 10),
        new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.7 }));
      scene.add(mug);
      pmCarried = mug;
      playOneshot('sigh', () => {           // long breath: blowing on it
        playSfx(sfxSip, 0.7);
        scene.remove(mug);
        pmCarried = null;
        pmState = 'station';
        pmScheduleNext(10 + Math.random() * 10);
      });
    });
  } else if (roll < 0.68) {                // punch the clock
    pmWalkTo('clock', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_CLOCK_LINES);
      playOneshot('alert', () => {
        playSfx(sfxPunch, 0.8);
        punchFlash = 1.2;
        pmState = 'station';
        pmScheduleNext(9 + Math.random() * 9);
      });
    });
  } else if (roll < 0.78) {                // the window
    pmWalkTo('window', () => {
      pmState = 'busy';
      playOneshot('sigh', () => { pmState = 'station'; pmScheduleNext(10 + Math.random() * 10); });
    });
  } else if (roll < 0.9) {                 // wander
    const w = ['wander1', 'wander2', 'wander3'][Math.floor(Math.random() * 3)];
    pmWalkTo(w, () => { playBase(pickIdle()); pmScheduleNext(6 + Math.random() * 8); });
  } else {                                 // a gesture wherever he stands
    pmState = 'busy';
    const clip = ['scratch', 'look-around', 'doze', 'stomp'][Math.floor(Math.random() * 4)];
    playOneshot(clip, () => { pmState = 'station'; pmScheduleNext(9 + Math.random() * 10); });
  }
}

function pmBurnCarried() {
  pmState = 'busy';
  pmSpeakFrom(PM_FURNACE_LINES);
  playOneshot('scheme', () => {            // striking the match
    if (pmCarried) tossEnvelope(pmCarried, furnaceMouth.clone(), () => {
      furnaceFlare = 1;
      playSfx(sfxWhoosh, 0.9);
    });
    pmCarried = null;
    playOneshot('wave', () => {            // the toss itself
      pmState = 'station';
      pmScheduleNext(10 + Math.random() * 12);
    });
  });
}

function pmFileCarried() {
  pmState = 'busy';
  pmSpeakFrom(PM_FILE_LINES);
  const slot = pigeonholeSlots[Math.floor(Math.random() * pigeonholeSlots.length)];
  setTimeout(() => {
    if (pmCarried) tossEnvelope(pmCarried, slot.clone(), () => playSfx(sfxFlutter, 0.5));
    pmCarried = null;
  }, 700);
  playOneshot('shrug', () => {
    pmState = 'station';
    pmScheduleNext(9 + Math.random() * 10);
  });
}

// flying envelope: hand -> target along a little arc, then gone
const flights = [];
function tossEnvelope(mesh, target, onLand) {
  const from = mesh.position.clone();
  flights.push({ mesh, from, target, t: 0, dur: 0.7, onLand });
}

function pmTick(dt, now) {
  if (!pmModel || reducedMotion) return;

  if (pmState === 'walking' && pmPath.length) {
    const next = pmPath[0];
    const dx = next.x - pmGroup.position.x;
    const dz = next.z - pmGroup.position.z;
    const dist = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(dx, dz);
    let dYaw = targetYaw - pmYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    pmYaw += clamp(dYaw, -3.2 * dt, 3.2 * dt);
    const step = tune.walk * dt;
    if (dist <= step * 1.5) {
      pmGroup.position.set(next.x, 0, next.z);
      pmPath.shift();
      if (!pmPath.length) {
        pmState = 'station';
        const st = PM_STATIONS[pmStationKey];
        if (st) pmFaceTarget = st.face;
        playBase(pickIdle());
        const cb = pmArrived;
        pmArrived = null;
        if (cb) cb();
      }
    } else {
      pmGroup.position.x += (dx / dist) * step;
      pmGroup.position.z += (dz / dist) * step;
    }
  } else if (pmState !== 'walking') {
    // settle toward the station's facing (or the visitor, briefly, when poked)
    let want = pmFaceTarget;
    if (pmFaceCamera > 0) {
      pmFaceCamera -= dt;
      want = Math.atan2(camera.position.x - pmGroup.position.x, camera.position.z - pmGroup.position.z);
    }
    let dYaw = want - pmYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    pmYaw += dYaw * Math.min(1, dt * 4);
  }
  pmGroup.rotation.y = pmYaw;

  if (pmState === 'station' && now >= pmNextAt) {
    pmNextAt = Infinity;
    pmRoutine();
  }

  // carried things ride the right hand
  if (pmCarried && handBone) {
    handBone.getWorldPosition(pmCarried.position);
    pmCarried.position.y += 0.02;
    pmCarried.rotation.set(-0.4, pmYaw, 0.2);
  }

  // envelope flights
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i];
    f.t += dt / f.dur;
    if (f.t >= 1) {
      scene.remove(f.mesh);
      flights.splice(i, 1);
      if (f.onLand) f.onLand();
      continue;
    }
    const e = f.t * f.t * (3 - 2 * f.t);
    f.mesh.position.lerpVectors(f.from, f.target, e);
    f.mesh.position.y += Math.sin(f.t * Math.PI) * 0.35;
    f.mesh.rotation.x += dt * 6;
  }
}
let pmFaceTarget = Math.PI;

/* ================= speech ================= */

const shiftStart = Date.now();
let ambientPool = [];
let clickPool = [];
let bubbleTimer = 0;
let nextAmbientAt = performance.now() + 9000 + Math.random() * 6000;
let bubbleUntil = 0;

function drawLine(pool, source) {
  if (pool.length === 0) {
    pool.push(...source);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return pool.pop();
}

function speak(line) {
  window.clearTimeout(bubbleTimer);
  bubbleEl.textContent = line;
  bubbleEl.hidden = false;
  bubbleUntil = performance.now() + Math.max(3800, line.length * 70);
  bubbleTimer = window.setTimeout(() => { bubbleEl.hidden = true; }, Math.max(3800, line.length * 70));
}

const bubbleV = new THREE.Vector3();
function bubbleTick() {
  if (bubbleEl.hidden || !headBone) return;
  headBone.getWorldPosition(bubbleV);
  bubbleV.y += 0.34;
  bubbleV.project(camera);
  if (bubbleV.z > 1 || bubbleV.z < -1) { bubbleEl.style.opacity = '0'; return; }
  bubbleEl.style.opacity = '1';
  const sx = (bubbleV.x * 0.5 + 0.5) * innerWidth;
  const sy = (-bubbleV.y * 0.5 + 0.5) * innerHeight;
  bubbleEl.style.left = `${clamp(sx, 150, innerWidth - 60)}px`;
  bubbleEl.style.top = `${clamp(sy, 90, innerHeight - 40)}px`;
}

function ambientTick(now) {
  if (now < nextAmbientAt) return;
  if (letterOpen) { nextAmbientAt = now + 8000; return; }
  const line = drawLine(ambientPool, PM_AMBIENT);
  speak(line);
  if (PM_SIGH_LINES.has(line) && pmState === 'station' && !reducedMotion) {
    pmState = 'busy';
    playOneshot('sigh', () => { pmState = 'station'; });
  }
  nextAmbientAt = now + 24000 + Math.random() * 22000;
}

let punchFlash = 0;
function shiftTick() {
  const elapsed = Math.floor((Date.now() - shiftStart) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  drawPunch(`${minutes}:${seconds}`);
  texPunch.needsUpdate = true;

  const due = PM_SHIFT_LINES.find((entry) => !entry.said && elapsed >= entry.at);
  if (due && !letterOpen) {
    due.said = true;
    speak(due.line);
    nextAmbientAt = performance.now() + 26000;
  }
}

function postmasterClicked() {
  speak(drawLine(clickPool, PM_CLICKED));
  nextAmbientAt = performance.now() + 26000;
  pmFaceCamera = 5;
  if (pmState === 'station' && !reducedMotion) {
    pmState = 'busy';
    const clip = ['wave', 'bow', 'wag-no'][Math.floor(Math.random() * 3)];
    playOneshot(clip, () => { pmState = 'station'; });
  }
}

/* ================= the mail ================= */

const MAX_FALLING = 4;
const MAX_IN_BASKET = 9;
const BASKET_POS = new THREE.Vector3(-4.5, 0, -1.5);
const CHUTE_Y = ROOM.h - 0.35;

let deck = [];
function drawFromDeck() {
  if (deck.length === 0) {
    deck = LETTERS.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  return deck.pop();
}

// envelope face drawn per letter, cached
const envelopeTexCache = new Map();
function envelopeTexture(letterIndex) {
  if (envelopeTexCache.has(letterIndex)) return envelopeTexCache.get(letterIndex);
  const letter = LETTERS[letterIndex];
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 30, 160);
  grad.addColorStop(0, '#ded4b4');
  grad.addColorStop(0.55, '#cfc5a4');
  grad.addColorStop(1, '#b4aa8a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = 'rgba(30,26,18,0.55)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 158);
  // flap creases
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 74); g.lineTo(256, 0); g.stroke();
  // addressee
  g.fillStyle = '#2a2419';
  g.font = '700 15px "Courier New", monospace';
  const lines = letter.to.split('\n');
  lines.slice(0, 3).forEach((ln, i) => g.fillText(ln.slice(0, 26), 24, 92 + i * 20));
  // stamp + cancellation
  g.fillStyle = '#75987f';
  g.fillRect(206, 12, 34, 40);
  g.strokeStyle = 'rgba(244,240,226,0.55)'; g.lineWidth = 3;
  g.strokeRect(209, 15, 28, 34);
  g.strokeStyle = 'rgba(158,58,44,0.4)'; g.lineWidth = 2;
  g.beginPath(); g.arc(198, 32, 22, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(160, 24 + i * 8); g.lineTo(216, 24 + i * 8); g.stroke();
  }
  if (letter.portal) {
    // airmail edge striping: this envelope goes somewhere
    for (const y of [0, 152]) {
      for (let x = 0; x < 256; x += 16) {
        g.fillStyle = '#a03c2e'; g.fillRect(x, y, 8, 8);
        g.fillStyle = '#2b4a86'; g.fillRect(x + 8, y, 8, 8);
      }
    }
    // the return address, in blue ink
    g.fillStyle = '#2b4a86';
    g.font = '700 11px "Courier New", monospace';
    letter.from.split('\n').slice(0, 2).forEach((ln, i) => g.fillText(ln.slice(0, 28), 14, 18 + i * 13));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  envelopeTexCache.set(letterIndex, t);
  return t;
}

const ENV_W = 0.34, ENV_H = 0.2125;
function envelopeMesh(letterIndex, registerClick = true) {
  const group = new THREE.Group();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(ENV_W, ENV_H),
    new THREE.MeshStandardMaterial({ map: envelopeTexture(letterIndex), roughness: 0.9 }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ENV_W, ENV_H),
    new THREE.MeshStandardMaterial({ color: 0xcfc5a4, roughness: 0.9 }));
  back.rotation.y = Math.PI;
  back.position.z = -0.002;
  group.add(front, back);
  group.userData.letterIndex = letterIndex;
  if (registerClick) {
    envClickables.push(front, back);
    front.userData.envelope = group;
    back.userData.envelope = group;
    hoverDirty = true;
  }
  return group;
}

const falling = [];        // { group, vy, sway, phase, target }
const basketPile = [];     // resting envelope groups in the basket
const floorStrays = [];    // resting envelope groups on the floor
const envClickables = [];
let nextSpawnAt = 0;
let guaranteedAirmail = true;

function spawnEnvelope(startMidAir) {
  if (falling.length >= MAX_FALLING) return;
  let idx;
  if (guaranteedAirmail) {
    guaranteedAirmail = false;
    const portals = LETTERS.flatMap((l, i) => (l.portal ? [i] : []));
    idx = portals[Math.floor(Math.random() * portals.length)];
    deck = deck.filter((d) => d !== idx);
  } else {
    idx = drawFromDeck();
  }
  const group = envelopeMesh(idx);
  const y = startMidAir ? 1.4 + Math.random() * 2.2 : CHUTE_Y;
  group.position.set(
    BASKET_POS.x + (Math.random() - 0.5) * 0.7,
    y,
    BASKET_POS.z + (Math.random() - 0.5) * 0.5);
  group.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, 0);
  scene.add(group);
  falling.push({
    group,
    sway: 0.5 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    speed: 0.75 + Math.random() * 0.5,
    target: new THREE.Vector3(
      BASKET_POS.x + (Math.random() - 0.5) * 0.6,
      basketRimY - 0.16 - Math.min(basketPile.length, 5) * 0.02,
      BASKET_POS.z + (Math.random() - 0.5) * 0.45),
  });
}

function settleIntoBasket(f) {
  const i = falling.indexOf(f);
  if (i !== -1) falling.splice(i, 1);
  f.group.position.copy(f.target);
  f.group.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, 0);
  basketPile.push(f.group);
  bumpDeadLetters();
  playSfx(sfxFlutter, 0.35);
  while (basketPile.length > MAX_IN_BASKET) {
    const old = basketPile.shift();
    removeEnvelopeGroup(old);
  }
}

function removeEnvelopeGroup(group) {
  scene.remove(group);
  for (const child of group.children) {
    const ei = envClickables.indexOf(child);
    if (ei !== -1) envClickables.splice(ei, 1);
  }
  hoverDirty = true;
  for (const list of [basketPile, floorStrays]) {
    const i = list.indexOf(group);
    if (i !== -1) list.splice(i, 1);
  }
  const fi = falling.findIndex((f) => f.group === group);
  if (fi !== -1) falling.splice(fi, 1);
}

// the postmaster takes one from the pile (or a floor stray) for his rounds
function takeBasketEnvelope() {
  const source = floorStrays.length ? floorStrays : basketPile;
  if (!source.length) return null;
  const group = source[source.length - 1];
  removeEnvelopeGroup(group);
  return group;
}

function mailTick(dt, now) {
  if (now >= nextSpawnAt && !reducedMotion) {
    nextSpawnAt = now + (tune.mailEvery * 1000) * (0.7 + Math.random() * 0.6);
    spawnEnvelope(false);
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    const g = f.group;
    const fallY = tune.fallSpeed * f.speed * dt;
    g.position.y -= fallY;
    f.phase += dt * f.sway * 2.2;
    g.position.x += Math.sin(f.phase) * dt * 0.12;
    g.rotation.z = Math.sin(f.phase) * 0.35;
    g.rotation.y += dt * 0.4;
    // ease toward the basket as it nears the rim
    const kx = clamp(1.6 - (g.position.y - f.target.y) / 2.2, 0.05, 1.4);
    g.position.x += (f.target.x - g.position.x) * kx * dt;
    g.position.z += (f.target.z - g.position.z) * kx * dt;
    if (g.position.y <= f.target.y) settleIntoBasket(f);
  }
}

// two floor strays at open, like the chute missed
function seedStrays() {
  for (let k = 0; k < 2; k++) {
    const group = envelopeMesh(drawFromDeck());
    group.position.set(
      BASKET_POS.x + 0.9 + Math.random() * 0.8,
      0.015,
      BASKET_POS.z + 0.5 + Math.random() * 0.9);
    group.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
    scene.add(group);
    floorStrays.push(group);
  }
}

/* ================= the opened letter (DOM overlay) ================= */

const overlay = document.getElementById('overlay');
const letterEl = document.getElementById('letter');
const returnSlot = document.getElementById('return-slot');
const postmarkEl = document.getElementById('postmark');
const cancelEl = document.getElementById('cancel-stamp');
const toEl = document.getElementById('letter-to');
const bodyEl = document.getElementById('letter-body');
const signEl = document.getElementById('letter-sign');
const refoldBtn = document.getElementById('refold');
let letterOpen = false;

function openLetter(group) {
  const letter = LETTERS[group.userData.letterIndex];

  if (letter.portal) {
    const link = document.createElement('a');
    link.className = 'return-portal';
    link.href = '../../../index.html';
    link.dataset.drift = '';
    link.setAttribute('aria-label', letter.portal.label);
    link.textContent = letter.from;
    returnSlot.replaceChildren(link);
  } else {
    returnSlot.textContent = letter.from;
  }

  postmarkEl.replaceChildren(
    ...letter.postmark.map((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      return span;
    }),
  );
  cancelEl.textContent = letter.stamp;
  toEl.textContent = letter.to;
  bodyEl.replaceChildren(
    ...letter.body.map((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      return p;
    }),
  );
  signEl.textContent = letter.sign;
  letterEl.classList.toggle('airmail', Boolean(letter.portal));

  removeEnvelopeGroup(group);
  if (reducedMotion) {
    // static placement: replace it instantly so the room never empties
    const fresh = envelopeMesh(drawFromDeck());
    fresh.position.set(
      BASKET_POS.x + (Math.random() - 0.5) * 0.5,
      basketRimY - 0.18,
      BASKET_POS.z + (Math.random() - 0.5) * 0.4);
    fresh.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
    scene.add(fresh);
    basketPile.push(fresh);
  }

  overlay.hidden = false;
  letterOpen = true;
  letterEl.focus();
}

function refold() {
  if (!letterOpen) return;
  overlay.hidden = true;
  letterOpen = false;
  stage.focus?.();
}

refoldBtn.addEventListener('click', refold);
overlay.addEventListener('click', (event) => {
  if (event.target === overlay) refold();
});

/* ================= sound ================= */

const ambience = new Audio('assets/audio/ambience.mp3');
ambience.loop = true;
ambience.preload = 'auto';
const sfxThunk = new Audio('assets/audio/stamp-thunk.mp3');
const sfxWhoosh = new Audio('assets/audio/furnace-whoosh.mp3');
const sfxPunch = new Audio('assets/audio/punch-clock.mp3');
const sfxFlutter = new Audio('assets/audio/letter-flutter.mp3');
const sfxSip = new Audio('assets/audio/coffee-sip.mp3');
for (const a of [sfxThunk, sfxWhoosh, sfxPunch, sfxFlutter, sfxSip]) a.preload = 'auto';

let soundOn = false;
let soundVol = 0.8;
const AMBIENCE_LEVEL = 0.4;

if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({
    start: () => {
      soundOn = true;
      ambience.volume = 0;
      return ambience.play().then(() => {
        ambience.volume = soundVol * AMBIENCE_LEVEL;
      }).catch((err) => {
        soundOn = false;
        throw err;
      });
    },
    stop: () => {
      soundOn = false;
      ambience.pause();
    },
    setVolume: (v) => {
      soundVol = v;
      ambience.volume = v * AMBIENCE_LEVEL;
    },
  });
}

function playSfx(audio, level) {
  if (!soundOn) return;
  audio.volume = clamp(soundVol * level, 0, 1);
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function playThunk() { playSfx(sfxThunk, 0.8); }

/* ================= walking controls (Mandala Shop pattern) ================= */

const EYE = 1.7;
const INSET = 0.42;
const BODY_R = 0.28;

// Free-standing furniture = keep-out circles; wall-adjacent furniture = boxes
// resolved by least-penetration push (a circle overlapping a wall can trap the
// camera between circle push and wall clamp — the fuzz sim caught it).
const CIRCLES = [
  [3.6, -4.25, 0.4],                       // chair
  [-4.5, -1.5, 0.95],                      // basket
  [6.8, 3.5, 1.0],                         // furnace
];
// Wall-side faces extend ≥2m past the wall so the least-penetration push always
// resolves into the room (a face just past the wall loses to the wall clamp and
// traps the camera — the fuzz sim caught it).
const BOXES = [
  [1.35, 3.65, -8.0, -4.5],                // desk (no walkable band behind it)
  [4.45, 9.5, -8.0, -5.05],                // pigeonholes + coat-rack corner
  [7.7, 11.5, -1.35, 0.15],                // filing cabinet
  [-11.5, -8.05, -2.8, -1.2],              // radiator
  [-5.1, -1.35, 4.6, 8.0],                 // crates + sacks
  [3.25, 4.75, 4.3, 8.0],                  // mail cart
];

function constrain(p) {
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
    for (const [x0, x1, z0, z1] of BOXES) {
      const l = x0 - BODY_R, rgt = x1 + BODY_R, n = z0 - BODY_R, s = z1 + BODY_R;
      if (p.x > l && p.x < rgt && p.z > n && p.z < s) {
        const pushes = [
          [p.x - l, () => { p.x = l; }],
          [rgt - p.x, () => { p.x = rgt; }],
          [p.z - n, () => { p.z = n; }],
          [s - p.z, () => { p.z = s; }],
        ].sort((a, b) => a[0] - b[0]);
        pushes[0][1]();
      }
    }
    if (pmModel) {   // he is solid too, gently
      const dx = p.x - pmGroup.position.x, dz = p.z - pmGroup.position.z;
      const rr = 0.55, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x = pmGroup.position.x + dx / d * rr;
        p.z = pmGroup.position.z + dz / d * rr;
      }
    }
    p.x = clamp(p.x, ROOM.x0 + INSET, ROOM.x1 - INSET);
    p.z = clamp(p.z, ROOM.z0 + INSET, ROOM.z1 - INSET);
  }
  return p;
}

const pos = new THREE.Vector3(0, EYE, 4.9);
let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0;   // yaw 0 faces -z: the office
const vel = new THREE.Vector3();
const keys = new Set();

addEventListener('keydown', (e) => {
  if (letterOpen) {
    if (e.key === 'Escape') refold();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyE') openNearestEnvelope();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// drag look — grab/swing modes, shared preference with the other walkable worlds
const LOOK_KEY = 'elastic-look-mode';
let lookMode = localStorage.getItem(LOOK_KEY) === 'swing' ? 'swing' : 'grab';
const lookToggle = document.createElement('button');
lookToggle.id = 'look-toggle';
lookToggle.title = 'how dragging turns the camera — click to switch';
lookToggle.style.cssText = 'position:fixed;left:0.7rem;top:0.7rem;z-index:24;' +
  'font:inherit;font-size:0.72rem;letter-spacing:0.05em;color:#cfd6c8;opacity:0.6;' +
  'background:rgba(16,19,18,0.65);border:1px solid #3a453f;border-radius:999px;' +
  'padding:0.25rem 0.8rem;cursor:pointer;';
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

const mouse = new THREE.Vector2();
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
  const s = lookMode === 'swing' ? -1 : 1;
  tYaw += s * dx * 0.0014;
  tPitch = clamp(tPitch + s * dy * 0.0013, -1.05, 1.05);
});
stage.addEventListener('pointerup', (e) => {
  dragging = false;
  if (moved < 7 && performance.now() - downAt < 400) handleClick(e);
});

let dollyImpulse = 0;
const TOP_SPEED = 3.0;   // motion-sickness cap: stacked wheel dollies obey it too
addEventListener('wheel', (e) => {
  if (e.target.closest?.('.es-sound, #tuner, #tuner-btn')) {
    if (e.ctrlKey) e.preventDefault();
    return;
  }
  e.preventDefault();
  dollyImpulse = clamp(dollyImpulse + Math.sign(e.deltaY) * -0.55, -1.5, 1.5);
}, { passive: false });

/* ================= clicking ================= */

let hoverDirty = true;
const hoverTargets = [];
function rayTargets() {
  if (hoverDirty) {
    hoverDirty = false;
    hoverTargets.length = 0;
    hoverTargets.push(...envClickables, ...doorMeshes, ...punchClockMeshes, ...propClickables.furnace);
    if (pmModel) pmModel.traverse((o) => { if (o.isMesh) hoverTargets.push(o); });
  }
  return hoverTargets;
}

let drifted = false;
function triggerDrift(id) {
  if (drifted) return;
  drifted = true;
  document.getElementById(id)?.click();
}

function handleClick(e) {
  if (letterOpen) return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(rayTargets(), false);
  if (!hits.length) return;
  const obj = hits[0].object;
  if (obj.userData.envelope) return openLetter(obj.userData.envelope);
  if (doorMeshes.has(obj)) return triggerDrift('drift-door');
  if (punchClockMeshes.has(obj)) {
    playSfx(sfxPunch, 0.8);
    punchFlash = 1.2;
    return;
  }
  if (propClickables.furnace.has(obj)) {
    furnaceFlare = Math.max(furnaceFlare, 0.5);
    playSfx(sfxWhoosh, 0.5);
    return;
  }
  // anything else that isn't scenery is him
  postmasterClicked();
}

function openNearestEnvelope() {
  if (letterOpen) return;
  let best = null, bestD = 36;
  const all = [...falling.map((f) => f.group), ...basketPile, ...floorStrays];
  for (const g of all) {
    const d = g.position.distanceToSquared(pos);
    if (d < bestD) { bestD = d; best = g; }
  }
  if (best) openLetter(best);
}

/* ================= tuner panel ================= */

const TUNER_SPEC = [
  ['bulb', 0.4, 3.0, 0.05], ['lamp', 0.0, 4.0, 0.05],
  ['furnace', 0.0, 3.0, 0.05], ['shaft', 0.0, 0.5, 0.01],
  ['fog', 0.0, 0.08, 0.002], ['mailEvery', 2, 15, 0.5],
  ['fallSpeed', 0.15, 1.2, 0.05], ['pace', 0.4, 2.5, 0.05],
  ['walk', 0.5, 1.6, 0.05],
];
for (const [key, min, max] of TUNER_SPEC) {
  if (!(tune[key] >= min && tune[key] <= max)) tune[key] = TUNE_DEFAULTS[key];
}
{
  const btn = document.createElement('button');
  btn.id = 'tuner-btn';
  btn.textContent = 'tune the office';
  document.body.appendChild(btn);
  const panel = document.createElement('div');
  panel.id = 'tuner';
  panel.innerHTML = '<div class="grid"></div>' +
    '<div class="foot"><span>values:</span><input readonly><button type="button">reset</button></div>';
  document.body.appendChild(panel);
  const grid = panel.querySelector('.grid');
  const jsonOut = panel.querySelector('.foot input');
  const resetBtn = panel.querySelector('.foot button');
  const vals = {};
  const refresh = () => {
    for (const [key] of TUNER_SPEC) {
      vals[key].range.value = tune[key];
      vals[key].out.textContent = String(+(+tune[key]).toFixed(3));
    }
    jsonOut.value = JSON.stringify(tune);
    applyTune();
  };
  for (const [key, min, max, step] of TUNER_SPEC) {
    const row = document.createElement('div');
    row.className = 'ctl';
    const label = document.createElement('label');
    label.textContent = key;
    const range = document.createElement('input');
    range.type = 'range'; range.min = min; range.max = max; range.step = step;
    const out = document.createElement('span');
    out.className = 'val';
    range.addEventListener('input', () => {
      tune[key] = parseFloat(range.value);
      localStorage.setItem('dlo-room-tuner', JSON.stringify(tune));
      refresh();
    });
    row.append(label, range, out);
    grid.appendChild(row);
    vals[key] = { range, out };
  }
  resetBtn.addEventListener('click', () => {
    tune = { ...TUNE_DEFAULTS };
    localStorage.removeItem('dlo-room-tuner');
    refresh();
  });
  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    btn.classList.toggle('open', panel.classList.contains('open'));
  });
  refresh();
}

function applyTune() {
  scene.fog.density = tune.fog;
  shaftMat.opacity = tune.shaft;
  lampLight.intensity = tune.lamp;
  for (const l of bulbLights) l.intensity = tune.bulb;
}

/* ================= main loop ================= */

const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
let frame = 0;
let resStillAt = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();
  frame++;

  if (mixer) mixer.update(dt);
  pmTick(dt, now);
  mailTick(dt, now);
  bubbleTick();

  // furnace flicker + flare decay
  if (!reducedMotion) {
    const flick = Math.sin(t * 11.3) * 0.12 + Math.sin(t * 23.7) * 0.08;
    furnaceFlare = Math.max(0, furnaceFlare - dt * 0.8);
    furnaceLight.intensity = tune.furnace * (1 + flick) + furnaceFlare * 5.5;
    if (punchFlash > 0) punchFlash -= dt;
  }

  // walk + look
  yaw = damp(yaw, tYaw, 22, dt);
  pitch = damp(pitch, tPitch, 22, dt);
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(-fwd.z, 0, fwd.x);
  wish.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(fwd);
  if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(fwd);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
  if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
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
  camera.position.copy(pos);
  lookEuler.set(pitch, yaw, 0);
  camera.quaternion.setFromEuler(lookEuler);

  // dynamic resolution
  const camMoving = dragging || vel.lengthSq() > 0.02 || Math.abs(dollyImpulse) > 0.05
    || Math.abs(yaw - tYaw) > 0.002 || Math.abs(pitch - tPitch) > 0.002;
  if (camMoving) resStillAt = t;
  applyRes(t - resStillAt > 0.25 ? RES_HIGH : RES_LOW);

  // hover cursor, throttled
  if (frame % 3 === 0 && !dragging && !letterOpen) {
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

/* ================= start ================= */

applyTune();
seedStrays();
guaranteedAirmail = true;
if (reducedMotion) {
  // pre-place a small pile, no falling
  for (let k = 0; k < 3; k++) {
    const group = envelopeMesh(k === 0
      ? LETTERS.findIndex((l) => l.portal)
      : drawFromDeck());
    group.position.set(
      BASKET_POS.x + (Math.random() - 0.5) * 0.5,
      basketRimY - 0.18 - k * 0.02,
      BASKET_POS.z + (Math.random() - 0.5) * 0.4);
    group.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
    scene.add(group);
    basketPile.push(group);
  }
} else {
  spawnEnvelope(true);
  spawnEnvelope(true);
  nextSpawnAt = performance.now() + 2500;
}

window.setInterval(() => {
  shiftTick();
  if (!document.hidden) ambientTick(performance.now());
}, 1000);
shiftTick();
