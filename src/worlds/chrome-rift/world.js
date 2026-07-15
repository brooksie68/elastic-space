const canvas = document.getElementById("rift-canvas");
const context = canvas.getContext("2d");

// Fixed pool of band personalities; the "bands" tuner draws the first N, so
// sliding the count down and back up returns the same bands.
const BAND_POOL_SIZE = 60;
const bandPool = Array.from({ length: BAND_POOL_SIZE }, () => ({
  width: 0.01 + Math.random() * 0.21,
  speed: 0.0003 + Math.random() * 0.0011,
  phase: Math.random() * Math.PI * 2,
}));

// --- tuning ---------------------------------------------------------------

const BASE_TIME_SCALE = 0.18; // the shipped 2026-07-11 animation rate = speed ×1
const SPEED_MAX = 800; // slider's right edge — bands smear into gray blur
const SPEED_CURVE = 4; // slider position^curve keeps the low end subtle
const WANDER_MAX = 1; // full-viewport roam at the slider's right edge
const GLOW_HOME = { x: 0.62, y: 0.5 };
const STORAGE_KEY = "chrome-rift-config";

const PRESETS = [
  { name: "Monochrome", colors: ["#ffffff", "#000000"] },
  { name: "Old Glory", colors: ["#b22234", "#ffffff", "#3c3b6e"] },
  { name: "Roots Reggae", colors: ["#009b3a", "#fed100", "#ce1126"] },
  { name: "The Simpsons", colors: ["#ffd90f", "#107dc0", "#ffffff"] },
  { name: "Batman", colors: ["#ffdf00", "#14141c", "#4e4e5a"] },
  { name: "The Matrix", colors: ["#00ff41", "#003b00", "#000000"] },
  { name: "Miami Vice", colors: ["#ff6ec7", "#00e5e8", "#1b1b3a"] },
  { name: "Halloween", colors: ["#ff7518", "#000000", "#7b1fa2"] },
  { name: "Christmas", colors: ["#c8102e", "#ffffff", "#146b3a"] },
  { name: "Mardi Gras", colors: ["#5f2da2", "#ffd700", "#1e8449"] },
  { name: "Pac-Man", colors: ["#ffe300", "#2121de", "#0a0a1a"] },
  { name: "Molten Core", colors: ["#ffd23f", "#ff5400", "#3b0a02"] },
  { name: "The Abyss", colors: ["#7fdbff", "#003a70", "#001428"] },
];

const DEFAULTS = {
  speed: 1,
  bands: 18,
  wander: 0.06,
  breathe: 0.5,
  pull: 0.5,
  edges: 0.5, // 0 = fog, 0.5 = the shipped gradient softness, 1 = razor slabs
};

const config = {
  ...DEFAULTS,
  palette: PRESETS[0].colors.slice(),
};

function clamp(value, lo, hi) {
  return Math.min(Math.max(value, lo), hi);
}

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (typeof saved.speed === "number" && Number.isFinite(saved.speed)) {
      config.speed = clamp(saved.speed, 0, SPEED_MAX);
    }
    if (typeof saved.bands === "number" && Number.isFinite(saved.bands)) {
      config.bands = clamp(Math.round(saved.bands), 3, BAND_POOL_SIZE);
    }
    if (typeof saved.wander === "number" && Number.isFinite(saved.wander)) {
      config.wander = clamp(saved.wander, 0, WANDER_MAX);
    }
    if (typeof saved.breathe === "number" && Number.isFinite(saved.breathe)) {
      config.breathe = clamp(saved.breathe, 0, 1);
    }
    if (typeof saved.pull === "number" && Number.isFinite(saved.pull)) {
      config.pull = clamp(saved.pull, 0, 1);
    }
    if (typeof saved.edges === "number" && Number.isFinite(saved.edges)) {
      config.edges = clamp(saved.edges, 0, 1);
    }
    if (
      Array.isArray(saved.palette) &&
      saved.palette.length >= 2 &&
      saved.palette.every((color) => /^#[0-9a-f]{6}$/i.test(color))
    ) {
      config.palette = saved.palette;
    }
  } catch {
    // First visit, or storage unavailable under file:// — defaults stand.
  }
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable — the session still works, settings just won't stick.
  }
}

// --- palette --------------------------------------------------------------

let paletteRgb = [];
let backdropFill = "#050505";

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function applyPalette() {
  paletteRgb = config.palette.map(hexToRgb);
  const deep = paletteRgb[paletteRgb.length - 1];
  backdropFill = rgba(deep.map((v) => Math.round(v * 0.12 + 5)), 1);
}

// Bands walk consecutive palette pairs; a two-color palette keeps every band
// on the same start/end pair, which is exactly the original monochrome look.
function bandPair(index) {
  const pairIndex = index % (paletteRgb.length - 1);
  return [paletteRgb[pairIndex], paletteRgb[pairIndex + 1]];
}

// --- audio breathing --------------------------------------------------------
// RMS from an analyser on the drone, auto-ranged against its own rolling
// min/max so even a steady raga drone yields a usable 0..1 breath signal.

let audioContext = null;
let analyser = null;
let analyserData = null;
let audioLevel = 0;
let rmsLo = Infinity;
let rmsHi = 0;

function wireAnalyser() {
  // Routing the media element into a suspended context would silence it, so
  // this only runs once the context is confirmed running.
  const source = audioContext.createMediaElementSource(drone);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyserData = new Float32Array(analyser.fftSize);
}

function tryInitAnalyser() {
  if (analyser) return;
  // Under file:// the drone counts as cross-origin: routing it through a
  // WebAudio graph outputs silence and would mute the world. Breathing is
  // served-only; the drone itself keeps playing either way.
  if (window.location.protocol === "file:") return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    if (!audioContext) audioContext = new Ctor();
    if (audioContext.state === "running") {
      wireAnalyser();
    } else {
      audioContext
        .resume()
        .then(() => {
          if (!analyser && audioContext.state === "running") wireAnalyser();
        })
        .catch(() => {});
    }
  } catch {
    analyser = null; // Blocked (e.g. file://) — breathing quietly does nothing.
  }
}

function sampleAudioLevel(dt) {
  if (!analyser) {
    audioLevel = Math.max(0, audioLevel - dt * 0.001);
    return;
  }
  analyser.getFloatTimeDomainData(analyserData);
  let sum = 0;
  for (let i = 0; i < analyserData.length; i += 1) {
    sum += analyserData[i] * analyserData[i];
  }
  const rms = Math.sqrt(sum / analyserData.length);
  rmsLo = Math.min(rms, rmsLo + (rms - rmsLo) * 0.001);
  rmsHi = Math.max(rms, rmsHi + (rms - rmsHi) * 0.001);
  const span = rmsHi - rmsLo;
  const target = span > 0.002 ? clamp((rms - rmsLo) / span, 0, 1) : 0;
  audioLevel += (target - audioLevel) * (1 - Math.exp(-dt / 400));
}

// --- cursor-pulled glow -------------------------------------------------------

const glowPos = { x: GLOW_HOME.x, y: GLOW_HOME.y };
let cursor = null;

window.addEventListener("pointermove", (event) => {
  cursor = { x: event.clientX / viewWidth, y: event.clientY / viewHeight };
});
document.documentElement.addEventListener("mouseleave", () => {
  cursor = null;
});
window.addEventListener("blur", () => {
  cursor = null;
});

function easeGlow(dt) {
  const target = cursor
    ? {
        x: GLOW_HOME.x + (cursor.x - GLOW_HOME.x) * config.pull,
        y: GLOW_HOME.y + (cursor.y - GLOW_HOME.y) * config.pull,
      }
    : GLOW_HOME;
  const k = 1 - Math.exp(-dt / 900);
  glowPos.x += (target.x - glowPos.x) * k;
  glowPos.y += (target.y - glowPos.y) * k;
}

// --- rendering ------------------------------------------------------------
// The band field only varies horizontally and the scanlines only vertically,
// so each renders into a 1px strip and stretches onto the main canvas. That
// keeps per-frame cost flat even when high speeds draw dozens of blur samples.

const bandStrip = document.createElement("canvas");
const bandContext = bandStrip.getContext("2d");
const scanStrip = document.createElement("canvas");
const scanContext = scanStrip.getContext("2d");

let viewWidth = 0;
let viewHeight = 0;

function resize() {
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  canvas.width = viewWidth * window.devicePixelRatio;
  canvas.height = viewHeight * window.devicePixelRatio;
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  bandStrip.width = Math.max(1, viewWidth);
  bandStrip.height = 1;
  scanStrip.width = 1;
  scanStrip.height = Math.max(1, viewHeight);
}

function drawBands(time, alpha) {
  bandContext.globalAlpha = alpha;
  // Width scales down as bands multiply so total coverage stays in character:
  // three huge slabs at the low end, dense slivers at the high end.
  const widthScale = Math.sqrt(DEFAULTS.bands / config.bands);
  // Edge clarity, sharp half: compress each color transition toward a step.
  // The shipped gradient has stops at 0 / 0.45 / 1; sharpness pinches the
  // blends around their midpoints (0.225 and 0.725) until they turn hard.
  const sharp = Math.max(0, config.edges - 0.5) * 2;
  const h01 = 0.225 * (1 - sharp);
  const h12 = 0.275 * (1 - sharp);
  for (let index = 0; index < config.bands; index += 1) {
    const band = bandPool[index];
    const [colorA, colorB] = bandPair(index);
    const phase = Math.sin(time * band.speed + band.phase);
    const x = (index / config.bands + phase * config.wander) * viewWidth;
    const width = band.width * widthScale * viewWidth;
    const gradient = bandContext.createLinearGradient(x, 0, x + width, 0);
    const bright = index % 2 === 0;
    const stop0 = bright ? rgba(colorA, 0.02) : rgba(colorA, 0.7);
    const stop1 = bright ? rgba(colorA, 0.9) : rgba(colorB, 0.1);
    const stop2 = bright ? rgba(colorB, 0.16) : rgba(colorA, 0.84);
    gradient.addColorStop(0, stop0);
    gradient.addColorStop(0.225 - h01, stop0);
    gradient.addColorStop(0.225 + h01, stop1);
    gradient.addColorStop(0.725 - h12, stop1);
    gradient.addColorStop(0.725 + h12, stop2);
    gradient.addColorStop(1, stop2);
    bandContext.fillStyle = gradient;
    bandContext.fillRect(x, 0, width, 1);
  }
}

function drawScanlines(time) {
  scanContext.clearRect(0, 0, 1, viewHeight);
  const tint = paletteRgb[0];
  for (let row = 0; row < viewHeight; row += 6) {
    const alpha = 0.03 + Math.sin(row * 0.11 + time * 0.003) * 0.02;
    if (alpha <= 0) continue;
    scanContext.fillStyle = rgba(tint, alpha);
    scanContext.fillRect(0, row, 1, 1);
  }
}

function drawGlow() {
  const swell = audioLevel * config.breathe;
  const gx = glowPos.x * viewWidth;
  const gy = glowPos.y * viewHeight;
  const glow = context.createRadialGradient(
    gx,
    gy,
    10,
    gx,
    gy,
    viewWidth * 0.32 * (1 + swell * 0.4),
  );
  glow.addColorStop(0, rgba(paletteRgb[0], Math.min(0.16 * (1 + swell * 0.75), 0.3)));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, viewWidth, viewHeight);
}

let worldTime = 0;
let lastFrame = null;

function frame(now) {
  if (lastFrame === null) lastFrame = now;
  const dt = Math.min(now - lastFrame, 100);
  lastFrame = now;

  sampleAudioLevel(dt);
  easeGlow(dt);

  const breatheBoost = 1 + audioLevel * config.breathe * 0.9;
  const step = dt * BASE_TIME_SCALE * config.speed * breatheBoost;

  bandContext.globalAlpha = 1;
  bandContext.fillStyle = backdropFill;
  bandContext.fillRect(0, 0, viewWidth, 1);

  // Temporal supersampling: high speeds average many sub-frame instants into
  // a genuine motion blur instead of strobing (photosensitivity guard —
  // this world must never flash). Sample budget shrinks as bands multiply
  // so the per-frame fill cost stays flat.
  const samples = Math.min(
    1 + Math.ceil(config.speed / 12),
    48,
    Math.max(8, Math.ceil(2200 / config.bands)),
  );
  for (let s = 0; s < samples; s += 1) {
    // Alpha 1/(s+1) over the running composite keeps every sample equally weighted.
    drawBands(worldTime + (step * s) / samples, 1 / (s + 1));
  }
  bandContext.globalAlpha = 1;

  context.fillStyle = backdropFill;
  context.fillRect(0, 0, viewWidth, viewHeight);
  // Edge clarity, fog half: one horizontal blur pass on the stretched band
  // field. (Vertical blur is a no-op on a 1px strip, and the extreme left and
  // right columns fading toward the backdrop reads as fog rolling off.)
  const soft = Math.max(0, 0.5 - config.edges) * 2;
  if (soft > 0) context.filter = `blur(${(soft * soft * 48).toFixed(1)}px)`;
  context.drawImage(bandStrip, 0, 0, viewWidth, viewHeight);
  context.filter = "none";
  drawScanlines(worldTime);
  context.drawImage(scanStrip, 0, 0, viewWidth, viewHeight);
  drawGlow();

  worldTime += step;
  requestAnimationFrame(frame);
}

// --- tuner panel ------------------------------------------------------------

const tunerToggle = document.getElementById("rift-tuner-toggle");
const tuner = document.getElementById("rift-tuner");
const speedSlider = document.getElementById("rift-speed");
const speedReadout = document.getElementById("rift-speed-readout");
const bandsSlider = document.getElementById("rift-bands");
const bandsReadout = document.getElementById("rift-bands-readout");
const wanderSlider = document.getElementById("rift-wander");
const wanderReadout = document.getElementById("rift-wander-readout");
const breatheSlider = document.getElementById("rift-breathe");
const breatheReadout = document.getElementById("rift-breathe-readout");
const pullSlider = document.getElementById("rift-pull");
const pullReadout = document.getElementById("rift-pull-readout");
const edgesSlider = document.getElementById("rift-edges");
const edgesReadout = document.getElementById("rift-edges-readout");
const colorStart = document.getElementById("rift-color-start");
const colorEnd = document.getElementById("rift-color-end");
const presetHolder = document.getElementById("rift-presets");

function speedToSlider(speed) {
  return Math.round(1000 * Math.pow(speed / SPEED_MAX, 1 / SPEED_CURVE));
}

function sliderToSpeed(value) {
  return SPEED_MAX * Math.pow(value / 1000, SPEED_CURVE);
}

function formatSpeed(speed) {
  if (speed === 0) return "stopped";
  if (speed < 10) return `×${speed.toFixed(2)}`;
  return `×${Math.round(speed)}`;
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function reflectControls() {
  speedSlider.value = speedToSlider(config.speed);
  speedReadout.textContent = formatSpeed(config.speed);
  bandsSlider.value = config.bands;
  bandsReadout.textContent = String(config.bands);
  wanderSlider.value = Math.round(1000 * Math.sqrt(config.wander / WANDER_MAX));
  wanderReadout.textContent = percent(config.wander / WANDER_MAX);
  breatheSlider.value = Math.round(config.breathe * 1000);
  breatheReadout.textContent = percent(config.breathe);
  pullSlider.value = Math.round(config.pull * 1000);
  pullReadout.textContent = percent(config.pull);
  edgesSlider.value = Math.round(config.edges * 1000);
  edgesReadout.textContent = percent(config.edges);
}

function reflectPalette() {
  colorStart.value = config.palette[0];
  colorEnd.value = config.palette[config.palette.length - 1];
  const key = JSON.stringify(config.palette);
  presetHolder.querySelectorAll(".tuner-chip").forEach((chip, i) => {
    chip.classList.toggle("is-active", JSON.stringify(PRESETS[i].colors) === key);
  });
}

speedSlider.addEventListener("input", () => {
  config.speed = sliderToSpeed(Number(speedSlider.value));
  speedReadout.textContent = formatSpeed(config.speed);
  saveConfig();
});

bandsSlider.addEventListener("input", () => {
  config.bands = clamp(Math.round(Number(bandsSlider.value)), 3, BAND_POOL_SIZE);
  bandsReadout.textContent = String(config.bands);
  saveConfig();
});

wanderSlider.addEventListener("input", () => {
  // position² mapping — subtle roam on the left, full-screen sweep on the right
  const position = Number(wanderSlider.value) / 1000;
  config.wander = WANDER_MAX * position * position;
  wanderReadout.textContent = percent(config.wander / WANDER_MAX);
  saveConfig();
});

breatheSlider.addEventListener("input", () => {
  config.breathe = Number(breatheSlider.value) / 1000;
  breatheReadout.textContent = percent(config.breathe);
  saveConfig();
});

pullSlider.addEventListener("input", () => {
  config.pull = Number(pullSlider.value) / 1000;
  pullReadout.textContent = percent(config.pull);
  saveConfig();
});

edgesSlider.addEventListener("input", () => {
  config.edges = Number(edgesSlider.value) / 1000;
  edgesReadout.textContent = percent(config.edges);
  saveConfig();
});

// Double-click any slider to reset just that parameter.
[
  [speedSlider, "speed"],
  [bandsSlider, "bands"],
  [wanderSlider, "wander"],
  [breatheSlider, "breathe"],
  [pullSlider, "pull"],
  [edgesSlider, "edges"],
].forEach(([slider, key]) => {
  slider.addEventListener("dblclick", () => {
    config[key] = DEFAULTS[key];
    reflectControls();
    saveConfig();
  });
});

colorStart.addEventListener("input", () => {
  config.palette[0] = colorStart.value;
  applyPalette();
  reflectPalette();
  saveConfig();
});

colorEnd.addEventListener("input", () => {
  config.palette[config.palette.length - 1] = colorEnd.value;
  applyPalette();
  reflectPalette();
  saveConfig();
});

PRESETS.forEach((preset) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "tuner-chip";
  chip.title = preset.name;
  chip.setAttribute("aria-label", `${preset.name} colors`);
  chip.style.background = `linear-gradient(135deg, ${preset.colors.join(", ")})`;
  chip.addEventListener("click", () => {
    config.palette = preset.colors.slice();
    applyPalette();
    reflectPalette();
    saveConfig();
  });
  presetHolder.appendChild(chip);
});

tunerToggle.addEventListener("click", () => {
  const open = tuner.hidden;
  tuner.hidden = !open;
  tunerToggle.setAttribute("aria-expanded", String(open));
  positionGuide();
});

// The guide opens non-modally: no backdrop, no focus trap — the scene keeps
// running and every tuner control stays live so you can try things while reading.
const guide = document.getElementById("rift-guide");

// Dock the guide 10px above the tuner panel (panel height varies with wrap).
function positionGuide() {
  if (!guide.open) return;
  let bottom = 26; // panel's 1rem offset + the 10px gap, if the panel is hidden
  if (!tuner.hidden) {
    bottom = window.innerHeight - tuner.getBoundingClientRect().top + 10;
  }
  guide.style.bottom = `${bottom}px`;
  guide.style.maxHeight = `${window.innerHeight - bottom - 16}px`;
}

document.getElementById("rift-info").addEventListener("click", () => {
  if (guide.open) {
    guide.close();
  } else {
    guide.show();
    positionGuide();
  }
});
window.addEventListener("resize", positionGuide);
document.getElementById("rift-guide-close").addEventListener("click", () => guide.close());
window.addEventListener("keydown", (event) => {
  // Non-modal dialogs don't get the native Esc-to-close.
  if (guide.open && event.key === "Escape") guide.close();
});

document.getElementById("rift-reset").addEventListener("click", () => {
  Object.assign(config, DEFAULTS);
  config.palette = PRESETS[0].colors.slice();
  applyPalette();
  reflectControls();
  reflectPalette();
  saveConfig();
});

// --- sound ------------------------------------------------------------------

const drone = new Audio("./assets/audio/rift-drone.mp3");
drone.loop = true;
drone.volume = 0.7;
window.ElasticSoundControl.attach({ media: drone });

drone.addEventListener("play", tryInitAnalyser);
window.addEventListener("pointerdown", tryInitAnalyser);
window.addEventListener("keydown", tryInitAnalyser);

// --- boot -------------------------------------------------------------------

loadConfig();
applyPalette();
reflectControls();
reflectPalette();
window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
