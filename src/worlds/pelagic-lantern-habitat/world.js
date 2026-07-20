// Pelagic Lantern Habitat — Blender-rendered station plate with a live canvas
// overlay: rising bubbles, drifting plankton, shimmering light from above,
// beacon pulse, and a few friendly jelly drifters. Sound is Web Audio
// synthesis behind the shared ElasticSoundControl.

const canvas = document.getElementById("sea-canvas");
const context = canvas.getContext("2d");

// The rendered plate's native size; every scene anchor is expressed as a
// (u, v) fraction of this image and mapped through the same cover-fit
// transform CSS applies to #plate.
const PLATE_W = 2560;
const PLATE_H = 1440;

function coverMapping() {
  const scale = Math.max(window.innerWidth / PLATE_W, window.innerHeight / PLATE_H);
  return {
    scale,
    ox: (window.innerWidth - PLATE_W * scale) / 2,
    oy: (window.innerHeight - PLATE_H * scale) / 2,
  };
}

function toScreen(u, v) {
  const m = coverMapping();
  return { x: m.ox + u * PLATE_W * m.scale, y: m.oy + v * PLATE_H * m.scale };
}

// ---- drift hotspots over diegetic scene elements (plate NDC) ----
const HOTSPOTS = {
  door: { u: 0.695, v: 0.731, r: 0.028 },   // lit airlock door on the entry dome
  beacon: { u: 0.498, v: 0.093, r: 0.024 }, // beacon atop the spire
  pod: { u: 0.307, v: 0.553, r: 0.036 },    // hanging pod module, left wing
  flora: { u: 0.907, v: 0.804, r: 0.045 },  // hidden bonus: magenta flora cluster
};

function layoutHotspots() {
  const m = coverMapping();
  document.querySelectorAll(".hotspot").forEach((el) => {
    const spot = HOTSPOTS[el.dataset.spot];
    if (!spot) return;
    const p = toScreen(spot.u, spot.v);
    const d = spot.r * PLATE_W * m.scale * 2;
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.style.width = `${d}px`;
    el.style.height = `${d}px`;
  });
}

// ---- bubbles ----
const EMITTERS = [
  { u: 0.688, v: 0.665, rate: 1.6, size: 1.0 },  // entry dome
  { u: 0.62, v: 0.402, rate: 0.9, size: 0.8 },   // mid deck rim
  { u: 0.371, v: 0.547, rate: 0.8, size: 0.8 },  // big deck, left rim
  { u: 0.307, v: 0.575, rate: 0.7, size: 0.7 },  // pod underside
  { u: 0.46, v: 0.9, rate: 0.5, size: 1.3 },     // seafloor vent
  { u: 0.555, v: 0.87, rate: 0.5, size: 1.2 },   // seafloor vent
];
const bubbles = [];

function spawnBubble(emitter) {
  const p = toScreen(emitter.u + (Math.random() - 0.5) * 0.012, emitter.v);
  const r = (1 + Math.random() * 2.4) * emitter.size;
  bubbles.push({
    x: p.x,
    y: p.y,
    r,
    rMax: r * 1.7,
    vy: 14 + Math.random() * 26,
    sway: 4 + Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    born: performance.now(),
    life: 9000 + Math.random() * 5000,
  });
}

function drawBubbles(time, dt) {
  EMITTERS.forEach((em) => {
    if (Math.random() < em.rate * dt * 0.001) spawnBubble(em);
  });
  for (let i = bubbles.length - 1; i >= 0; i -= 1) {
    const b = bubbles[i];
    const age = time - b.born;
    b.y -= b.vy * dt * 0.001;
    b.r = Math.min(b.rMax, b.r + dt * 0.0003);
    const x = b.x + Math.sin(time * 0.001 + b.phase) * b.sway;
    if (age > b.life || b.y < -20) {
      bubbles.splice(i, 1);
      continue;
    }
    const fade = Math.min(1, age / 800) * Math.max(0, 1 - age / b.life);
    context.strokeStyle = `rgba(185, 225, 255, ${0.34 * fade})`;
    context.fillStyle = `rgba(185, 225, 255, ${0.07 * fade})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(x, b.y, b.r, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = `rgba(235, 250, 255, ${0.4 * fade})`;
    context.beginPath();
    context.arc(x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, Math.PI * 0.9, Math.PI * 1.6);
    context.stroke();
  }
}

// ---- plankton motes ----
const MOTE_COLORS = [
  [150, 235, 255],
  [255, 170, 240],
  [170, 255, 190],
  [200, 190, 255],
];
const motes = Array.from({ length: 42 }, () => ({
  u: Math.random(),
  v: Math.random(),
  r: 0.6 + Math.random() * 1.8,
  du: (Math.random() - 0.5) * 0.000006,
  dv: -0.000002 - Math.random() * 0.000005,
  tw: Math.random() * Math.PI * 2,
  color: MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)],
}));

function drawMotes(time, dt) {
  motes.forEach((mote) => {
    mote.u = (mote.u + mote.du * dt + 1) % 1;
    mote.v = (mote.v + mote.dv * dt + 1) % 1;
    const p = toScreen(mote.u, mote.v);
    const twinkle = 0.5 + 0.5 * Math.sin(time * 0.0012 + mote.tw);
    const [r, g, b] = mote.color;
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.1 + 0.22 * twinkle})`;
    context.beginPath();
    context.arc(p.x, p.y, mote.r, 0, Math.PI * 2);
    context.fill();
  });
}

// ---- shimmering light from the surface ----
const SHAFTS = [
  { x: 0.13, w: 0.09, lean: 0.16, phase: 0.0 },
  { x: 0.34, w: 0.13, lean: 0.2, phase: 2.1 },
  { x: 0.72, w: 0.08, lean: 0.12, phase: 4.4 },
];

function drawShafts(time) {
  const h = window.innerHeight;
  const w = window.innerWidth;
  context.save();
  context.globalCompositeOperation = "lighter";
  SHAFTS.forEach((shaft) => {
    const breathe = 0.5 + 0.5 * Math.sin(time * 0.00013 + shaft.phase);
    const alpha = 0.014 + 0.024 * breathe;
    const sway = Math.sin(time * 0.00009 + shaft.phase * 2) * 0.03;
    const topX = (shaft.x + sway) * w;
    const botX = topX + (shaft.lean + sway * 0.5) * w;
    const grad = context.createLinearGradient(topX, 0, botX, h * 0.85);
    grad.addColorStop(0, `rgba(120, 200, 235, ${alpha})`);
    grad.addColorStop(0.55, `rgba(90, 170, 215, ${alpha * 0.45})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = grad;
    context.beginPath();
    context.moveTo(topX - shaft.w * w * 0.5, -10);
    context.lineTo(topX + shaft.w * w * 0.5, -10);
    context.lineTo(botX + shaft.w * w * 1.1, h * 0.85);
    context.lineTo(botX - shaft.w * w * 1.1, h * 0.85);
    context.closePath();
    context.fill();
  });
  context.restore();
}

// ---- beacon pulse ----
function drawBeacon(time) {
  const p = toScreen(HOTSPOTS.beacon.u, HOTSPOTS.beacon.v);
  const m = coverMapping();
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.0016);
  const radius = (0.022 + 0.012 * pulse) * PLATE_W * m.scale;
  const grad = context.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
  grad.addColorStop(0, `rgba(255, 205, 130, ${0.1 + 0.12 * pulse})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = grad;
  context.beginPath();
  context.arc(p.x, p.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// ---- friendly jelly drifters ----
const jellies = Array.from({ length: 4 }, (_, index) => ({
  u: Math.random(),
  v: 0.12 + Math.random() * 0.3,
  size: 14 + Math.random() * 14,
  speed: (0.000004 + Math.random() * 0.000004) * (index % 2 ? 1 : -1),
  bob: Math.random() * Math.PI * 2,
  hue: [185, 315, 265, 155][index],
}));

function drawJellies(time, dt) {
  jellies.forEach((jelly) => {
    jelly.u = (jelly.u + jelly.speed * dt + 1) % 1;
    const v = jelly.v + Math.sin(time * 0.0004 + jelly.bob) * 0.02;
    const p = toScreen(jelly.u, v);
    const s = jelly.size;
    const squish = 1 + Math.sin(time * 0.0022 + jelly.bob) * 0.08;

    context.save();
    context.translate(p.x, p.y);
    // bell
    context.fillStyle = `hsla(${jelly.hue}, 85%, 74%, 0.3)`;
    context.beginPath();
    context.ellipse(0, 0, s * squish, s * 0.72 / squish, 0, Math.PI, Math.PI * 2);
    context.fill();
    context.strokeStyle = `hsla(${jelly.hue}, 90%, 80%, 0.4)`;
    context.lineWidth = 1.2;
    context.stroke();
    // tentacles
    context.beginPath();
    for (let t = -2; t <= 2; t += 1) {
      const tx = t * s * 0.3;
      context.moveTo(tx, 0);
      context.quadraticCurveTo(
        tx + Math.sin(time * 0.003 + jelly.bob + t) * s * 0.24,
        s * 0.5,
        tx + Math.sin(time * 0.002 + jelly.bob + t * 2) * s * 0.36,
        s * (0.9 + (t % 2) * 0.2),
      );
    }
    context.strokeStyle = `hsla(${jelly.hue}, 85%, 78%, 0.26)`;
    context.stroke();
    context.restore();
  });
}

// ---- Jerry: 3D-rendered cell, composited from per-part Blender layers ----
// Layers rendered from tmp/pelagic-lantern-habitat/pelagic-jerry.blend
// (jerry_build.py + jerry_export.py). All PNGs share one square camera frame,
// so they stack pixel-aligned; each part animates independently.
const JERRY_DEFAULTS = {
  style: "c3d",     // "c3d" = Blender layers | "dom" = pool Jerry verbatim (A/B)
  motion: "orbit",  // "orbit" = swims around the habitat | "drift" = stays near anchor
  u: 0.45,          // anchor (drift) / orbit center (orbit), plate NDC
  v: 0.36,
  size: 0.5,        // sprite frame width as fraction of plate width
  goo: 0.92,        // cytoplasm/membrane layer opacity
  aura: 0.9,
  ringSpeed: 1,
  pulse: 1,         // organelle pulse intensity
  drift: 1,         // organelle drift amplitude
  swim: 1,          // whole-cell speed (wander and orbit)
  orbitR: 0.3,      // orbit radius, plate NDC
  orbitPeriod: 45,  // seconds per lap
  backScale: 0.32,  // size at the far side of the orbit
  backDim: 0.45,    // opacity at the far side
  organGlow: 0.35,  // DOM Jerry: latent-organelle visibility
};
const JERRY_STORE_KEY = "pelagic-jerry-tuner";
const jerryConfig = { ...JERRY_DEFAULTS };
try {
  Object.assign(jerryConfig, JSON.parse(localStorage.getItem(JERRY_STORE_KEY) || "{}"));
} catch (error) { /* fresh defaults */ }

// name, draw order back-to-front, and per-part motion:
// drift = offset amplitude (fraction of sprite), dp = drift period ms,
// pulse = scale amplitude, pp = pulse period ms, alpha = [base, wobble, period]
const JERRY_PARTS = [
  { name: "aura", pulse: 0.015, pp: 5200, alpha: [0.85, 0.15, 5200], cfgAlpha: "aura" },
  { name: "dark", drift: 0.004, dp: 17000, spin: 4, sp: 23000, alpha: [0.9, 0.1, 9000] },
  { name: "vesicle-a", drift: 0.01, dp: 8000, pulse: 0.06, pp: 5000 },
  { name: "vesicle-b", drift: 0.009, dp: 9600, pulse: 0.05, pp: 6200 },
  { name: "mito-a", drift: 0.008, dp: 9000, spin: 6, sp: 12000 },
  { name: "mito-b", drift: 0.008, dp: 11000, spin: 5, sp: 14000 },
  { name: "mito-c", drift: 0.007, dp: 7400, spin: 7, sp: 10000 },
  { name: "golgi", drift: 0.005, dp: 12000, pulse: 0.05, pp: 11000 },
  { name: "ribo", drift: 0.012, dp: 7000, alpha: [0.75, 0.25, 3000] },
  { name: "crystal", drift: 0.006, dp: 10000, spin: 10, sp: 13000, alpha: [0.85, 0.15, 4000] },
  { name: "seed", drift: 0.01, dp: 8200, pulse: 0.05, pp: 7000 },
  { name: "void", drift: 0.005, dp: 9000, alpha: [0.7, 0.3, 6000] },
  { name: "nucleus", drift: 0.005, dp: 13000, pulse: 0.04, pp: 7500 },
  { name: "goo", pulse: 0.012, pp: 6800, cfgAlpha: "goo" },
];

// rings are drawn as 1px canvas ellipses in pool geometry (site.css .ring-a/b/c),
// not rendered layers — James 2026-07-19: pool ring look is "correct", keep parity.
// [w, h] as fractions of the sprite frame, base rotation deg, spin period ms
// (negative = reverse), stroke color.
const JERRY_RINGS = [
  { w: 0.68, h: 0.68, rot: 0, spin: 20000, color: "rgba(175, 255, 235, 0.18)" },
  { w: 0.54, h: 0.86, rot: 25, spin: 16000, color: "rgba(255, 211, 132, 0.2)" },
  { w: 0.92, h: 0.92, rot: -18, spin: -32000, color: "rgba(255, 110, 168, 0.16)" },
];

function drawJerryRings(time, spriteW, poseAlpha) {
  JERRY_RINGS.forEach((ring) => {
    context.save();
    context.rotate((ring.rot * Math.PI) / 180
      + (time * jerryConfig.ringSpeed / ring.spin) * Math.PI * 2);
    context.strokeStyle = ring.color;
    context.globalAlpha = poseAlpha;
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(0, 0, (ring.w * spriteW) / 2, (ring.h * spriteW) / 2, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  });
}

// ---- nucleus interest: the little brain notices things ----
// Eases toward the cursor when it moves, otherwise the nearest jelly, otherwise
// the beacon. Travel is clamped so it reads as attention, not an eyeball.
const jerryNucleus = { ox: 0, oy: 0, tx: 0, ty: 0, nextPick: 0 };
const jerryCursor = { x: -1, y: -1, at: -Infinity };
window.addEventListener("pointermove", (event) => {
  jerryCursor.x = event.clientX;
  jerryCursor.y = event.clientY;
  jerryCursor.at = performance.now();
});

function updateJerryNucleus(time, dt, p, spriteW) {
  if (time > jerryNucleus.nextPick) {
    jerryNucleus.nextPick = time + 2400 + Math.random() * 2600;
    let target = null;
    if (time - jerryCursor.at < 4000) {
      target = { x: jerryCursor.x, y: jerryCursor.y };
    } else if (jellies.length) {
      let best = Infinity;
      jellies.forEach((jelly) => {
        const jp = toScreen(jelly.u, jelly.v);
        const d = (jp.x - p.x) ** 2 + (jp.y - p.y) ** 2;
        if (d < best) { best = d; target = jp; }
      });
    } else {
      target = toScreen(HOTSPOTS.beacon.u, HOTSPOTS.beacon.v);
    }
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const travel = spriteW * 0.05;
    jerryNucleus.tx = (dx / len) * travel;
    jerryNucleus.ty = (dy / len) * travel;
  }
  const ease = Math.min(1, dt * 0.0012);
  jerryNucleus.ox += (jerryNucleus.tx - jerryNucleus.ox) * ease;
  jerryNucleus.oy += (jerryNucleus.ty - jerryNucleus.oy) * ease;
}

const jerryLayers = new Map();
JERRY_PARTS.forEach((part, index) => {
  const img = new Image();
  img.src = `assets/jerry/${part.name}.png`;
  jerryLayers.set(part.name, img);
  part.phase = index * 1.7; // stagger every animator
});

// station cutout: the plate's own station pixels masked by the Blender-rendered
// silhouette (assets/jerry/station-mask.png), drawn over Jerry when his orbit
// takes him behind the habitat. Pixel-identical to the plate, so no seam.
const stationMask = new Image();
stationMask.src = "assets/jerry/station-mask.png";
let stationCutout = null;

function getStationCutout() {
  if (stationCutout) return stationCutout;
  const plateImg = document.getElementById("plate");
  if (!stationMask.complete || !stationMask.naturalWidth
    || !plateImg || !plateImg.complete || !plateImg.naturalWidth) return null;
  const off = document.createElement("canvas");
  off.width = stationMask.naturalWidth;
  off.height = stationMask.naturalHeight;
  const octx = off.getContext("2d");
  octx.drawImage(stationMask, 0, 0);
  octx.globalCompositeOperation = "source-in";
  octx.drawImage(plateImg, 0, 0, off.width, off.height);
  stationCutout = off;
  return stationCutout;
}

function drawStationCutout() {
  const cutout = getStationCutout();
  if (!cutout) return;
  const m = coverMapping();
  context.drawImage(cutout, m.ox, m.oy, PLATE_W * m.scale, PLATE_H * m.scale);
}

// where is Jerry right now? position, size factor, opacity, and depth
// (z: 1 = nearest, -1 = far side of the orbit)
function jerryPose(time) {
  const t = time * 0.001 * jerryConfig.swim;
  const wanderU = Math.sin(t * 0.021) * 0.018 + Math.sin(t * 0.0053) * 0.03;
  const wanderV = Math.sin(t * 0.017 + 1.3) * 0.014 + Math.cos(t * 0.0041) * 0.02;
  if (jerryConfig.motion === "drift") {
    return { u: jerryConfig.u + wanderU, v: jerryConfig.v + wanderV, k: 1, alpha: 1, z: 1 };
  }
  const angle = (t / jerryConfig.orbitPeriod) * Math.PI * 2;
  const z = Math.cos(angle);
  const depth = (z + 1) / 2;
  return {
    u: jerryConfig.u + Math.sin(angle) * jerryConfig.orbitR + wanderU * 0.4,
    v: jerryConfig.v + z * jerryConfig.orbitR * 0.18 + wanderV * 0.4,
    k: jerryConfig.backScale + (1 - jerryConfig.backScale) * depth,
    alpha: jerryConfig.backDim + (1 - jerryConfig.backDim) * depth,
    z,
  };
}

function drawJerry(time, dt) {
  const pose = jerryPose(time);
  if (jerryConfig.style === "dom") {
    updateDomJerry(time, dt, pose);
    if (pose.z < 0) drawStationCutout();
    return;
  }
  if (domJerry) domJerry.style.display = "none";
  const m = coverMapping();
  const spriteW = jerryConfig.size * PLATE_W * m.scale * pose.k;
  const p = toScreen(pose.u, pose.v);
  updateJerryNucleus(time, dt, p, spriteW);

  JERRY_PARTS.forEach((part) => {
    const img = jerryLayers.get(part.name);
    if (!img.complete || !img.naturalWidth) return;
    context.save();
    context.translate(p.x, p.y);
    if (part.name === "nucleus") {
      context.translate(jerryNucleus.ox, jerryNucleus.oy);
    }
    {
      if (part.spin) {
        context.rotate(Math.sin(time * ((Math.PI * 2) / part.sp) + part.phase)
          * (part.spin * Math.PI / 180) * jerryConfig.drift);
      }
      if (part.drift) {
        const a = part.drift * spriteW * jerryConfig.drift;
        context.translate(
          Math.sin(time * ((Math.PI * 2) / part.dp) + part.phase) * a,
          Math.cos(time * ((Math.PI * 2) / (part.dp * 1.27)) + part.phase * 2) * a,
        );
      }
      if (part.pulse) {
        const s = 1 + Math.sin(time * ((Math.PI * 2) / part.pp) + part.phase)
          * part.pulse * jerryConfig.pulse;
        context.scale(s, s);
      }
    }
    let alpha = 1;
    if (part.alpha) {
      alpha = part.alpha[0] + part.alpha[1]
        * Math.sin(time * ((Math.PI * 2) / part.alpha[2]) + part.phase) * jerryConfig.pulse;
    }
    if (part.cfgAlpha) alpha *= jerryConfig[part.cfgAlpha];
    context.globalAlpha = Math.max(0, Math.min(1, alpha * pose.alpha));
    context.drawImage(img, -spriteW / 2, -spriteW / 2, spriteW, spriteW);
    context.restore();
  });
  context.save();
  context.translate(p.x, p.y);
  drawJerryRings(time, spriteW, pose.alpha);
  context.restore();
  if (pose.z < 0) drawStationCutout();
}

// ---- DOM Jerry: pool Jerry verbatim (markup + CSS lifted from jerrys-pool) ----
let domJerry = null;

function buildDomJerry() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/jerry/dom-jerry.css";
  document.head.append(link);
  domJerry = document.createElement("div");
  domJerry.id = "jerry-dom";
  domJerry.style.display = "none";
  domJerry.innerHTML = `
    <div class="orbital">
      <div class="orb">
        <span class="organelle nucleus-core"></span>
        <span class="organelle vesicle vesicle-a"></span>
        <span class="organelle vesicle vesicle-b"></span>
        <span class="organelle filament-core"></span>
        <span class="organelle mitochondrion mitochondrion-a"></span>
        <span class="organelle mitochondrion mitochondrion-b"></span>
        <span class="organelle mitochondrion mitochondrion-c"></span>
        <span class="organelle golgi-body"></span>
        <span class="organelle ribosome-cloud"></span>
        <span class="organelle alien-crystal"></span>
        <span class="organelle alien-seed"></span>
        <span class="organelle alien-void"></span>
        <span class="organelle dark-organelle dark-organelle-a"></span>
        <span class="organelle dark-organelle dark-organelle-b"></span>
        <span class="organelle dark-organelle dark-organelle-c"></span>
        <span class="organelle dark-organelle dark-organelle-d"></span>
        <span class="organelle dark-organelle dark-organelle-e"></span>
      </div>
      <div class="ring ring-a"></div>
      <div class="ring ring-b"></div>
      <div class="ring ring-c"></div>
    </div>`;
  domJerry.style.transform = "translate(-50%, -50%)";
  // below #sea-canvas, above #plate
  const seaCanvas = document.getElementById("sea-canvas");
  seaCanvas.parentNode.insertBefore(domJerry, seaCanvas);
}

function updateDomJerry(time, dt, pose) {
  if (!domJerry) buildDomJerry();
  const m = coverMapping();
  const p = toScreen(pose.u, pose.v);
  updateJerryNucleus(time, dt, p, jerryConfig.size * PLATE_W * m.scale * pose.k);
  // DOM orb is 42% of its .orbital box (pool proportions), close to the 3D
  // membrane's share of the sprite frame, so both styles read the same size
  const w = jerryConfig.size * PLATE_W * m.scale * pose.k;
  domJerry.style.display = "block";
  domJerry.style.left = `${p.x}px`;
  domJerry.style.top = `${p.y}px`;
  domJerry.style.width = `${w}px`;
  domJerry.style.opacity = pose.alpha.toFixed(3);
  domJerry.style.setProperty("--jdom-organ-glow", jerryConfig.organGlow);
  // idle life the pool drives from JS: cytoplasm/filament slow churn,
  // vesicle shift, nucleus wander
  const t = time * 0.001;
  const orbital = domJerry.firstElementChild;
  orbital.style.setProperty("--cell-cytoplasm-rotate", `${(t * 2.1) % 360}deg`);
  orbital.style.setProperty("--cell-filament-rotate", `${(-t * 1.4) % 360}deg`);
  orbital.style.setProperty("--cell-vesicle-shift", `${Math.sin(t * 0.5) * 4}px`);
  orbital.style.setProperty("--cell-nucleus-x", `${jerryNucleus.ox.toFixed(1)}px`);
  orbital.style.setProperty("--cell-nucleus-y", `${jerryNucleus.oy.toFixed(1)}px`);
  orbital.style.setProperty("--cell-membrane-scale", (1 + Math.sin(t * 0.9) * 0.012).toFixed(4));
  orbital.style.setProperty("--cell-cytoplasm-scale", (1 + Math.sin(t * 0.7 + 2) * 0.02).toFixed(4));
}

// ---- Jerry tuner panel (Chrome Rift pattern; state in localStorage) ----
function buildJerryTuner() {
  const style = document.createElement("style");
  style.textContent = `
    #jerry-tuner-toggle { position: fixed; left: 14px; bottom: 14px; z-index: 40;
      width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(160, 225, 255, 0.4);
      background: rgba(8, 24, 40, 0.72); color: #9fdcff; font: 14px/1 "Trebuchet MS", sans-serif;
      cursor: pointer; opacity: 0.55; transition: opacity 200ms; }
    #jerry-tuner-toggle:hover { opacity: 1; }
    #jerry-tuner { position: fixed; left: 12px; bottom: 56px; z-index: 40; width: 240px;
      padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(160, 225, 255, 0.3);
      background: rgba(6, 18, 32, 0.88); color: #cfeaff;
      font: 11px/1.5 "Trebuchet MS", sans-serif; display: none; }
    #jerry-tuner.open { display: block; }
    #jerry-tuner label { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
    #jerry-tuner label span { width: 74px; flex: none; }
    #jerry-tuner input[type="range"] { flex: 1; accent-color: #6fc8ff; }
    #jerry-tuner button { margin-top: 8px; padding: 3px 10px; border-radius: 6px;
      border: 1px solid rgba(160, 225, 255, 0.35); background: none; color: #9fdcff;
      font: 11px "Trebuchet MS", sans-serif; cursor: pointer; }
  `;
  document.head.append(style);

  const toggle = document.createElement("button");
  toggle.id = "jerry-tuner-toggle";
  toggle.type = "button";
  toggle.textContent = "J";
  toggle.title = "Jerry tuner";
  const panel = document.createElement("div");
  panel.id = "jerry-tuner";

  // A/B toggles: render style and motion mode
  const TOGGLES = [
    ["style", { c3d: "3D layers", dom: "pool verbatim" }],
    ["motion", { orbit: "orbit", drift: "drift" }],
  ];
  const toggleButtons = [];
  TOGGLES.forEach(([key, labels]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const paint = () => { btn.textContent = `${key}: ${labels[jerryConfig[key]]}`; };
    paint();
    btn.addEventListener("click", () => {
      const values = Object.keys(labels);
      jerryConfig[key] = values[(values.indexOf(jerryConfig[key]) + 1) % values.length];
      localStorage.setItem(JERRY_STORE_KEY, JSON.stringify(jerryConfig));
      paint();
    });
    btn.repaint = paint;
    toggleButtons.push(btn);
    panel.append(btn);
  });

  const sliders = [
    ["u", "position x", 0, 1, 0.005],
    ["v", "position y", 0, 1, 0.005],
    ["size", "size", 0.1, 1, 0.01],
    ["goo", "goo opacity", 0, 1, 0.02],
    ["aura", "aura", 0, 1, 0.02],
    ["ringSpeed", "ring speed", 0, 3, 0.05],
    ["pulse", "pulse", 0, 2.5, 0.05],
    ["drift", "organ drift", 0, 2.5, 0.05],
    ["swim", "swim speed", 0, 3, 0.05],
    ["orbitR", "orbit radius", 0.05, 0.45, 0.005],
    ["orbitPeriod", "orbit lap s", 10, 120, 1],
    ["backScale", "far size", 0.1, 1, 0.02],
    ["backDim", "far dim", 0, 1, 0.02],
    ["organGlow", "organ glow", 0, 1, 0.02],
  ];
  sliders.forEach(([key, label, min, max, step]) => {
    const row = document.createElement("label");
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = jerryConfig[key];
    input.addEventListener("input", () => {
      jerryConfig[key] = Number(input.value);
      localStorage.setItem(JERRY_STORE_KEY, JSON.stringify(jerryConfig));
    });
    row.append(caption, input);
    panel.append(row);
  });
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "reset";
  reset.addEventListener("click", () => {
    Object.assign(jerryConfig, JERRY_DEFAULTS);
    localStorage.removeItem(JERRY_STORE_KEY);
    panel.querySelectorAll("input").forEach((input, index) => {
      input.value = jerryConfig[sliders[index][0]];
    });
    toggleButtons.forEach((btn) => btn.repaint());
  });
  panel.append(reset);
  toggle.addEventListener("click", () => panel.classList.toggle("open"));
  document.body.append(toggle, panel);
}
buildJerryTuner();

// ---- frame loop ----
let lastTime = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutHotspots();
}

function animate(time) {
  const dt = Math.min(64, time - lastTime || 16);
  lastTime = time;
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawShafts(time);
  drawMotes(time, dt);
  drawJellies(time, dt);
  drawBubbles(time, dt);
  drawJerry(time, dt);
  drawBeacon(time);
  requestAnimationFrame(animate);
}

// ---- sound: habitat thrum + subsea drift + bubble clicks ----
const sound = { ctx: null, master: null, on: false, volume: 1 };

function applyVolume() {
  if (!sound.master) return;
  const target = 0.24 * sound.volume * (sound.on ? 1 : 0);
  sound.master.gain.setTargetAtTime(target, sound.ctx.currentTime, 0.15);
}

function createNoiseSource(audioContext) {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function bubbleClick() {
  if (!sound.ctx || !sound.on || sound.ctx.state !== "running") return;
  const now = sound.ctx.currentTime;
  const osc = sound.ctx.createOscillator();
  const gain = sound.ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180 + Math.random() * 120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  osc.connect(gain);
  gain.connect(sound.master);
  osc.start(now);
  osc.stop(now + 0.5);
}

function buildAudio() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  sound.ctx = audioContext;

  const master = audioContext.createGain();
  master.gain.value = 0;
  master.connect(audioContext.destination);
  sound.master = master;

  const thrumA = audioContext.createOscillator();
  const thrumB = audioContext.createOscillator();
  const thrumGain = audioContext.createGain();
  thrumA.type = "sine";
  thrumB.type = "triangle";
  thrumA.frequency.value = 55;
  thrumB.frequency.value = 82;
  thrumGain.gain.value = 0.25;
  thrumA.connect(thrumGain);
  thrumB.connect(thrumGain);
  thrumGain.connect(master);
  thrumA.start();
  thrumB.start();

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 12;
  lfo.connect(lfoGain);
  lfoGain.connect(thrumA.frequency);
  lfo.start();

  const driftNoise = createNoiseSource(audioContext);
  const driftFilter = audioContext.createBiquadFilter();
  const driftGain = audioContext.createGain();
  driftFilter.type = "lowpass";
  driftFilter.frequency.value = 620;
  driftGain.gain.value = 0.1;
  driftNoise.connect(driftFilter);
  driftFilter.connect(driftGain);
  driftGain.connect(master);
  driftNoise.start();

  window.setInterval(bubbleClick, 3200);
}

if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({
    start: () => {
      if (!sound.ctx) buildAudio();
      sound.on = true;
      applyVolume();
      return sound.ctx.resume().then(() => {
        if (sound.ctx.state !== "running") throw new Error("audio blocked");
      });
    },
    stop: () => {
      sound.on = false;
      applyVolume();
      if (sound.ctx) sound.ctx.suspend().catch(() => {});
    },
    setVolume: (v) => {
      sound.volume = v;
      applyVolume();
    },
  });
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(animate);
