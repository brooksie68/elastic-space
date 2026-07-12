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
