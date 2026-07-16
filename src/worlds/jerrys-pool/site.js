const canvas = document.getElementById("field");
const context = canvas.getContext("2d");
const dotCanvas = document.getElementById("dot-field");
// Rollback switch: false restores the preserved Canvas dot renderer.
const USE_PIXI_DOTS = true;
let pixiDotsReady = false;
let pixiDotApp = null;
const filamentCanvas = document.getElementById("filament-field");
const filamentContext = filamentCanvas.getContext("2d");
const filamentsEnabled = false;
const signalText = document.getElementById("signal-text");
const credoText = document.getElementById("credo-text");
const routeList = document.getElementById("route-list");
const actionButtons = [...document.querySelectorAll(".action[data-pulse]")];
const orbital = document.querySelector(".orbital");
const orb = document.querySelector(".orb");
const energyField = document.getElementById("energy-field");
const ambientWash = document.getElementById("ambient-wash");
const ambientBlooms = document.getElementById("ambient-blooms");
const ambientShapes = document.getElementById("ambient-shapes");
const distantShadow = document.getElementById("distant-shadow");
const denizenField = document.getElementById("denizen-field");
const foregroundPolypField = document.getElementById("foreground-polyps");
let poolPolyps = [...document.querySelectorAll(".pool-polyp")];
let signalStalks = [];
let seafloorPlants = [];
let brainCorals = [];

// --- Pool tuner: state -------------------------------------------------------
// Multipliers for creature spawn frequency and population caps (0–5×) plus the
// dot field's swirl speed and dot count (0.5–2×). The panel UI lives at the
// bottom of this file; state loads here — before anything spawns — so stored
// settings shape the whole session. Jerry and the leviathan are not tunable.
const TUNER_STORE_KEY = "jerrys-pool-tuner-v1";
const tunerState = {
  global: { freq: 1, pop: 1 },
  dots: { speed: 1, count: 1 },
  creatures: {},
};
try {
  const storedTuner = JSON.parse(localStorage.getItem(TUNER_STORE_KEY) || "{}");
  if (storedTuner.global) Object.assign(tunerState.global, storedTuner.global);
  if (storedTuner.dots) Object.assign(tunerState.dots, storedTuner.dots);
  if (storedTuner.creatures) Object.assign(tunerState.creatures, storedTuner.creatures);
} catch { /* corrupted store: run on defaults */ }
// sanitize whatever came out of storage — a NaN multiplier must never leak
// into caps or the dot field (0 is a legal value, so no || fallbacks)
const tunerNumber = (value, fallback = 1) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
tunerState.global.freq = tunerNumber(tunerState.global.freq);
tunerState.global.pop = tunerNumber(tunerState.global.pop);
tunerState.dots.speed = tunerNumber(tunerState.dots.speed);
tunerState.dots.count = tunerNumber(tunerState.dots.count);

function tunerSave() {
  try { localStorage.setItem(TUNER_STORE_KEY, JSON.stringify(tunerState)); } catch { /* storage unavailable */ }
}
const tunerClamp = (value, low, high) => Math.min(high, Math.max(low, value));
function tunerCreature(key) {
  if (!tunerState.creatures[key]) tunerState.creatures[key] = { freq: 1, pop: 1 };
  const config = tunerState.creatures[key];
  config.freq = tunerNumber(config.freq);
  config.pop = tunerNumber(config.pop);
  return config;
}
function tunerFreq(key) {
  return tunerClamp(tunerCreature(key).freq * tunerState.global.freq, 0, 5);
}
function tunerPop(key) {
  return tunerClamp(tunerCreature(key).pop * tunerState.global.pop, 0, 5);
}
// per-creature concurrency caps scale with that creature's own multiplier
function tunerCap(key, base) {
  return Math.round(base * tunerPop(key));
}
// the shared active-denizen ceilings (6 general / 8 for schools) scale with
// the global population multiplier; a creature boosted above 1× ignores the
// shared ceiling (its own cap still governs) so its slider is always potent
function tunerSharedCapBlocked(key, active, base) {
  if (tunerPop(key) > 1) return false;
  return active >= Math.round(base * tunerClamp(tunerState.global.pop, 0, 5));
}
// spawn-attempt delay: frequency divides the wait; at 0 the schedule idles on
// a 4 s poll so raising the slider revives it without a reload
function tunerDelay(key, delay) {
  const f = tunerFreq(key);
  return f > 0 ? delay / f : 4000;
}
function tunerEnabled(key) {
  return tunerFreq(key) > 0 && tunerPop(key) > 0;
}

// Both initializers are re-runnable: the tuner calls them again with new
// multipliers, so they tear down what they generated before rebuilding.
function initializePolypColony() {
  if (!foregroundPolypField) return;
  foregroundPolypField.querySelectorAll(".generated-polyp").forEach((polyp) => polyp.remove());
  const staticPolyps = [...document.querySelectorAll("#denizen-field .pool-polyp")];
  const polypTarget = Math.round(28 * tunerPop("polyp"));
  staticPolyps.forEach((polyp, index) => {
    polyp.style.display = index < polypTarget ? "" : "none";
  });
  for (let index = staticPolyps.length; index < polypTarget; index += 1) {
    const polyp = document.createElement("i");
    const species = Math.floor(Math.random() * 3);
    polyp.className = `pool-polyp generated-polyp${species === 1 ? " species-b" : species === 2 ? " species-c" : ""}`;
    polyp.style.left = `${1 + Math.random() * 97}%`;
    polyp.style.height = `${24 + Math.random() * 76}px`;
    polyp.style.width = `${8 + Math.random() * 17}px`;
    foregroundPolypField.append(polyp);
  }
  poolPolyps = [...document.querySelectorAll("#denizen-field .pool-polyp, #foreground-polyps .pool-polyp")]
    .filter((polyp) => polyp.style.display !== "none");
  poolPolyps.forEach((polyp) => {
    if (polyp.dataset.flareWired === "true") return;
    polyp.dataset.flareWired = "true";
    polyp.style.setProperty("--polyp-sway-duration", `${7 + Math.random() * 12}s`);
    polyp.style.setProperty("--polyp-sway-delay", `${-Math.random() * 20}s`);
    const scheduleFlare = () => {
      window.setTimeout(() => {
        if (!polyp.isConnected) return; // removed by a rebuild — end the loop
        if (tunerFreq("polyp") > 0 && polyp.style.display !== "none") {
          polyp.classList.add("flaring");
          window.setTimeout(() => polyp.classList.remove("flaring"), 2800 + Math.random() * 3600);
        }
        scheduleFlare();
      }, tunerDelay("polyp", 9000 + Math.random() * 38000));
    };
    scheduleFlare();
  });
}

function initializeSeafloorFlora() {
  if (!foregroundPolypField) return;
  foregroundPolypField.querySelectorAll(".brain-coral, .seafloor-plant, .alien-shrimp").forEach((el) => el.remove());
  const coralTarget = Math.round(3 * tunerPop("coral"));
  for (let index = 0; index < coralTarget; index += 1) {
    const coral = document.createElement("i");
    coral.className = `brain-coral coral-${(index % 3) + 1}`;
    coral.style.left = `${8 + (index % 3) * 34 + Math.random() * 14}%`;
    const coralSize = 62 + Math.random() * 54;
    coral.style.setProperty("--coral-size", `${coralSize}px`);
    coral.style.setProperty("--coral-height", `${coralSize * 0.62}px`);
    foregroundPolypField.prepend(coral);
  }
  const plantTypes = ["kelp", "seaweed", "seaweed", "fern-frond", "fan-frond", "lace-frond", "signal-stalk"];
  // at the default 23 plants the 21-cycle yields 3 signal stalks and the last
  // 2 are forced stalks, giving 5 (they feed the barrel drifters, so keep
  // them plentiful); scaled counts keep the same shape
  const plantTarget = Math.round(23 * tunerPop("plant"));
  for (let index = 0; index < plantTarget; index += 1) {
    const plant = document.createElement("i");
    const plantType = plantTarget >= 3 && index >= plantTarget - 2
      ? "signal-stalk"
      : plantTypes[index % plantTypes.length];
    plant.className = `seafloor-plant ${plantType}`;
    plant.style.left = `${2 + Math.random() * 96}%`;
    const plantHeight = plantType === "signal-stalk"
      ? 135 + Math.random() * 95
      : 48 + Math.random() * 105;
    plant.style.setProperty("--plant-height", `${plantHeight}px`);
    plant.style.setProperty("--plant-delay", `${-Math.random() * 12}s`);
    plant.innerHTML = "<b></b><b></b><b></b>";
    foregroundPolypField.prepend(plant);
  }
  signalStalks = [...foregroundPolypField.querySelectorAll(".signal-stalk")];
  seafloorPlants = [...foregroundPolypField.querySelectorAll(".seafloor-plant")];
  brainCorals = [...foregroundPolypField.querySelectorAll(".brain-coral")];

  const shrimpTarget = Math.round(11 * tunerPop("shrimp"));
  for (let index = 0; index < shrimpTarget; index += 1) {
    const shrimp = document.createElement("i");
    shrimp.className = "alien-shrimp";
    shrimp.style.left = `${3 + Math.random() * 94}%`;
    shrimp.style.bottom = `${2 + Math.random() * 20}px`;
    shrimp.style.width = `${19 + Math.random() * 16}px`;
    shrimp.style.height = `${8 + Math.random() * 6}px`;
    shrimp.style.setProperty("--shrimp-delay", `${-Math.random() * 12}s`);
    const shrimpDistance = 8 + Math.random() * 19;
    shrimp.style.setProperty("--shrimp-distance", `${shrimpDistance}px`);
    shrimp.style.setProperty("--shrimp-mid", `${(shrimpDistance * 0.38).toFixed(1)}px`);
    shrimp.style.setProperty("--shrimp-back", `${(shrimpDistance * -0.35).toFixed(1)}px`);
    shrimp.innerHTML = "<b></b><b></b><b></b>";
    foregroundPolypField.prepend(shrimp);
  }
}

function rebuildPermanentDenizens() {
  initializePolypColony();
  initializeSeafloorFlora();
}

initializePolypColony();
initializeSeafloorFlora();

const state = { pulse: "descend" };
const cellMotion = {
  drift: { x: 0, y: 0 },
  curiosity: { x: 0, y: 0 },
  lastTime: 0,
  position: { x: 0, y: 0 },
  bodyHeading: { x: 0.7, y: -0.36 },
  bodySteerDelayUntil: 0,
  dotsInFront: false,
  behindDenizens: false,
  nearPolyps: false,
  polypWarmth: 0,
  polypWarmthTarget: 0,
  nucleusTravel: { x: 0, y: 0 },
  nucleusFlex: { current: 12, target: 12, nextChange: 0 },
  lockedPrey: null,
  preySpeedBoostUntil: 0,
  leviathanPanic: {
    active: false,
    start: 0,
    releaseAt: Infinity,
    escapeAt: 0,
    jerkCount: 3,
    hideX: 0,
    hideY: 0,
    threatX: 0,
    threatY: 1,
  },
  roamingReady: false,
  steerStart: 0,
  steerDuration: 4200,
  velocity: { x: 0.7, y: -0.36 },
  floorVisit: {
    active: false,
    start: 0,
    duration: 26000,
    fromLeft: true,
    nextAt: 35000 + Math.random() * 40000,
  },
  pulse: {
    scale: 1,
    glowA: 0.28,
    glowB: 0.36,
    membrane: 1,
    membraneAlpha: 0.18,
    tilt: 0,
    cytoplasmRotate: 0,
    cytoplasmScale: 1,
    nucleusScale: 1,
    nucleusX: 0,
    nucleusY: 0,
    filamentRotate: 0,
    vesicleShift: 0,
  },
  pulseFrom: {},
  pulseTarget: {},
  pulseStart: 0,
  pulseDuration: 9000,
  pulseTravelDuration: 9000,
};

const signalPhrases = {
  descend: "descending through translucent circuitry and patient moss",
  bloom: "bioluminescent thought flowering inside a glass engine",
  fracture: "parallel lines splitting open into prismatic awareness",
};

const credoPhrases = [
  "build something that glows like deep water and thinks like tangled roots",
  "let the machine dream in seafoam and graphite without apologizing for it",
  "make the route feel alive enough that people suspect it is listening back",
  "treat consciousness, circuitry, vines, and glass as neighboring materials",
];

let activeEnergyBalls = 0;
let activeDenizens = 0;
let activeAmoebas = 0;
let activeLargeShapes = 0;
let lastPolypCheck = 0;
let lastCreatureGlowCheck = 0;
const activeDotSchools = new Set();
const activeTripodPrey = new Set();
let feedingGlowUntil = 0;
let nextJellyModel = 0;
const activeEnergyElements = new Set();
let lastPolypOrbCheck = 0;

const energyColors = [
  "0 73 169",
  "0 135 169",
  "11 55 113",
  "13 42 103",
  "20 60 76",
  "14 56 92",
  "0 98 151",
];

function triggerFeedingResponse() {
  if (!orb) return;
  feedingGlowUntil = performance.now() + 9000;
  orb.classList.remove("feeding-response");
  void orb.offsetWidth;
  orb.classList.add("feeding-response");
  window.setTimeout(() => orb.classList.remove("feeding-response"), 1900);

  const baseTransform = orb.style.transform || "scale(1)";
  orb.animate([
    { transform: baseTransform, offset: 0 },
    { transform: `${baseTransform} scale(0.94, 1.025) rotate(-0.6deg)`, offset: 0.12 },
    { transform: `${baseTransform} scale(0.965, 0.985) rotate(0.35deg)`, offset: 0.3 },
    { transform: `${baseTransform} scale(0.982, 1.008)`, offset: 0.58 },
    { transform: `${baseTransform} scale(0.994, 1.003)`, offset: 0.8 },
    { transform: baseTransform, offset: 1 },
  ], { duration: 1750, easing: "cubic-bezier(.22,.62,.3,1)" });

  orb.querySelectorAll(".organelle").forEach((organelle, index) => {
    const direction = index % 2 ? -1 : 1;
    organelle.animate([
      { translate: "0 0" },
      { translate: `${direction * (2.5 + (index % 4) * 0.5)}px ${(-3 + index % 7) * 0.5}px`, offset: 0.18 },
      { translate: `${-direction * 1.5}px ${(2 - index % 5) * 0.5}px`, offset: 0.48 },
      { translate: "0 0" },
    ], { duration: 1150 + (index % 5) * 55, delay: 70 + index * 12, easing: "ease-out" });
  });

  const glowingOrganelles = [...orb.querySelectorAll(".organelle")]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  glowingOrganelles.forEach((organelle) => {
    const existingFilter = getComputedStyle(organelle).filter;
    const baseFilter = existingFilter === "none" ? "" : `${existingFilter} `;
    organelle.animate(
      [
        { filter: `${baseFilter}brightness(1.6) saturate(1.35) drop-shadow(0 0 6px rgba(183,255,242,.7)) drop-shadow(0 0 13px rgba(71,205,255,.5))` },
        { offset: 0.5, filter: `${baseFilter}brightness(1.6) saturate(1.35) drop-shadow(0 0 6px rgba(183,255,242,.7)) drop-shadow(0 0 13px rgba(71,205,255,.5))` },
        { filter: existingFilter },
      ],
      { duration: 4000, easing: "linear" },
    );
  });
}

function scheduleEnergyBall(delay = 3300 + Math.random() * 5200) {
  window.setTimeout(() => {
    spawnEnergyBall();
    scheduleEnergyBall();
  }, delay);
}

function spawnEnergyBall(angleOverride = null) {
  if (!energyField || activeEnergyBalls >= 5 || !cellMotion.roamingReady) {
    return;
  }

  const startX = cellMotion.position.x;
  const startY = cellMotion.position.y;
  const margin = 80;
  if (
    startX < -margin ||
    startX > window.innerWidth + margin ||
    startY < -margin ||
    startY > window.innerHeight + margin
  ) {
    return;
  }

  const directionX = angleOverride === null
    ? -0.85 + Math.random() * 1.7
    : Math.max(-0.85, Math.min(0.85, Math.cos(angleOverride) * 0.85));
  const directionY = 0.68 + Math.random() * 0.32;
  const distances = [];
  if (directionX > 0) distances.push((window.innerWidth - startX + margin) / directionX);
  if (directionX < 0) distances.push((-margin - startX) / directionX);
  if (directionY > 0) distances.push((window.innerHeight - startY + margin) / directionY);
  if (directionY < 0) distances.push((-margin - startY) / directionY);
  const travelDistance = Math.min(...distances.filter((value) => value > 0));
  const endX = directionX * travelDistance;
  const endY = directionY * travelDistance;
  const bendX = -90 + Math.random() * 180;
  const bendY = 15 + Math.random() * 45;
  const size = 24 + Math.random() * 30;
  const speed = 38 + Math.random() * 27;
  const duration = Math.max(9000, (travelDistance / speed) * 1000);
  const orbOpacity = 0.72 + Math.random() * 0.24;
  const approachingViewer = Math.random() < 0.5;
  const startScale = approachingViewer ? 0.52 + Math.random() * 0.24 : 1;
  const middleScale = approachingViewer
    ? 1.05 + Math.random() * 0.45
    : 0.52 + Math.random() * 0.22;
  const endScale = approachingViewer
    ? 1.9 + Math.random() * 1.5
    : 0.16 + Math.random() * 0.2;
  const ball = document.createElement("a");
  ball.className = "energy-ball";
  ball.href = "../../../index.html";
  ball.dataset.drift = "";
  ball.setAttribute("aria-label", "Drift somewhere else");
  ball.style.setProperty("--energy-x", `${startX}px`);
  ball.style.setProperty("--energy-y", `${startY}px`);
  ball.style.setProperty("--energy-size", `${size}px`);
  ball.style.setProperty(
    "--energy-color",
    energyColors[Math.floor(Math.random() * energyColors.length)],
  );
  energyField.append(ball);
  activeEnergyBalls += 1;
  activeEnergyElements.add(ball);

  const animation = ball.animate(
    [
      { opacity: 0, transform: `translate(-50%, -50%) scale(${startScale * 0.55})` },
      { opacity: orbOpacity, offset: 0.08, transform: `translate(-50%, -50%) scale(${startScale})` },
      { opacity: approachingViewer ? orbOpacity : orbOpacity * 0.56, offset: 0.52, transform: `translate(calc(-50% + ${endX * 0.5 + bendX}px), calc(-50% + ${endY * 0.5 + bendY}px)) scale(${middleScale})` },
      { opacity: approachingViewer ? orbOpacity * 0.92 : 0.04, transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(${endScale})` },
    ],
    { duration, easing: "linear", fill: "forwards" },
  );

  const cleanup = () => {
    if (ball.dataset.finished === "true") return;
    ball.dataset.finished = "true";
    ball.remove();
    activeEnergyElements.delete(ball);
    activeEnergyBalls = Math.max(0, activeEnergyBalls - 1);
  };
  ball.energyAnimation = animation;
  ball.energyCleanup = cleanup;
  animation.finished.then(cleanup, cleanup);
}

function emitOpeningTriad() {
  const openingAngles = [-Math.PI / 2, Math.PI * 0.76, Math.PI * 0.24];
  const openingDelays = [420, 1420, 2480];
  openingAngles.forEach((angle, index) => {
    window.setTimeout(() => spawnEnergyBall(angle), openingDelays[index]);
  });
}

function updatePolypOrbFeeding(time) {
  if (time - lastPolypOrbCheck < 140 || activeEnergyElements.size === 0) return;
  lastPolypOrbCheck = time;
  for (const ball of activeEnergyElements) {
    if (ball.dataset.claimed === "true") continue;
    const ballRect = ball.getBoundingClientRect();
    const ballX = ballRect.left + ballRect.width * 0.5;
    const ballY = ballRect.top + ballRect.height * 0.5;
    if (ballY < window.innerHeight - 190) continue;

    let nearestPolyp = null;
    let nearestDistance = Infinity;
    poolPolyps.forEach((polyp) => {
      const crownX = polyp.offsetLeft + polyp.offsetWidth * 0.5;
      const crownY = window.innerHeight - polyp.offsetHeight + 12;
      const distance = Math.hypot(ballX - crownX, ballY - crownY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPolyp = polyp;
      }
    });

    if (!nearestPolyp || nearestDistance > 145) continue;
    ball.dataset.claimed = "true";
    const crownX = nearestPolyp.offsetLeft + nearestPolyp.offsetWidth * 0.5;
    const verticalReach = Math.max(1, window.innerHeight - ballY);
    const stretch = Math.min(3.4, Math.max(1.25, verticalReach / nearestPolyp.offsetHeight));
    const lean = Math.max(-42, Math.min(42, (ballX - crownX) * 0.32));
    const orbColor = ball.style.getPropertyValue("--energy-color").trim();
    const targetX = crownX + lean;
    const targetY = window.innerHeight - nearestPolyp.offsetHeight * stretch + 8;
    nearestPolyp.classList.add("grabbing", "flaring");
    nearestPolyp.style.transform = `translateX(${lean.toFixed(1)}px) scaleY(${stretch.toFixed(2)})`;
    ball.energyAnimation?.pause();
    const caughtOrb = ball.cloneNode(false);
    caughtOrb.removeAttribute("href");
    caughtOrb.removeAttribute("aria-label");
    caughtOrb.style.setProperty("--energy-x", `${ballX}px`);
    caughtOrb.style.setProperty("--energy-y", `${ballY}px`);
    caughtOrb.style.setProperty("--energy-size", `${Math.max(8, ballRect.width)}px`);
    caughtOrb.style.opacity = "1";
    caughtOrb.style.pointerEvents = "none";
    energyField.append(caughtOrb);
    ball.energyCleanup?.();
    ball.energyAnimation?.cancel();

    window.setTimeout(() => {
      const travelX = targetX - ballX;
      const travelY = targetY - ballY;
      caughtOrb.animate(
        [
          { opacity: 1, filter: "brightness(1.5)", transform: "translate(-50%, -50%) scale(1)" },
          { opacity: 0.7, offset: 0.72, filter: "brightness(1.8)", transform: `translate(calc(-50% + ${travelX.toFixed(1)}px), calc(-50% + ${travelY.toFixed(1)}px)) scale(0.34)` },
          { opacity: 0, filter: "brightness(0.15)", transform: `translate(calc(-50% + ${travelX.toFixed(1)}px), calc(-50% + ${travelY.toFixed(1)}px)) scale(0.04)` },
        ],
        { duration: 620, easing: "cubic-bezier(0.35, 0, 0.8, 0.35)", fill: "forwards" },
      ).finished.then(() => caughtOrb.remove());
      nearestPolyp.classList.add("consuming");
      nearestPolyp.querySelector(".orb-afterglow")?.remove();
      const afterglow = document.createElement("i");
      afterglow.className = "orb-afterglow";
      afterglow.style.setProperty("--consumed-orb-color", orbColor);
      nearestPolyp.append(afterglow);
      afterglow.addEventListener("animationend", () => afterglow.remove(), { once: true });
    }, 420);

    window.setTimeout(() => {
      nearestPolyp.classList.remove("grabbing", "consuming", "flaring");
      nearestPolyp.style.transform = "";
    }, 1900);
  }
}

const ambientPalettes = [
  ["166 75% 34%", "214 76% 29%"],
  ["190 82% 31%", "246 58% 25%"],
  ["145 62% 29%", "185 72% 24%"],
  ["205 78% 34%", "164 64% 25%"],
  ["178 55% 25%", "226 72% 31%"],
];

function schedulePaletteShift(delay = 30000 + Math.random() * 50000) {
  window.setTimeout(() => {
    if (ambientWash) {
      ambientWash.style.setProperty("--wash-opacity", "0.12");
      window.setTimeout(() => {
        const palette = ambientPalettes[Math.floor(Math.random() * ambientPalettes.length)];
        ambientWash.style.setProperty("--wash-a", palette[0]);
        ambientWash.style.setProperty("--wash-b", palette[1]);
        ambientWash.style.setProperty("--wash-x", `${10 + Math.random() * 80}%`);
        ambientWash.style.setProperty("--wash-y", `${10 + Math.random() * 80}%`);
        ambientWash.style.setProperty("--wash-angle", `${Math.floor(Math.random() * 360)}deg`);
        ambientWash.style.setProperty("--wash-opacity", `${0.35 + Math.random() * 0.35}`);
      }, 6000);
    }
    schedulePaletteShift();
  }, delay);
}

function spawnAmbientBloom() {
  if (!ambientBlooms || ambientBlooms.childElementCount >= 3) return;
  const bloom = document.createElement("i");
  bloom.className = "ambient-bloom";
  bloom.style.setProperty("--bloom-color", energyColors[Math.floor(Math.random() * energyColors.length)]);
  bloom.style.setProperty("--bloom-size", `${220 + Math.random() * 420}px`);
  bloom.style.setProperty("--bloom-x", `${Math.random() * 100}%`);
  bloom.style.setProperty("--bloom-y", `${Math.random() * 100}%`);
  ambientBlooms.append(bloom);
  const duration = 11000 + Math.random() * 9000;
  bloom.animate(
    [
      { opacity: 0, transform: "translate(-50%, -50%) scale(0.72)" },
      { opacity: 0.56, offset: 0.42, transform: "translate(-50%, -50%) scale(1)" },
      { opacity: 0, transform: "translate(-50%, -50%) scale(1.18)" },
    ],
    { duration, easing: "ease-in-out" },
  ).finished.finally(() => bloom.remove());
}

function spawnAmbientShape() {
  if (!ambientShapes || ambientShapes.childElementCount >= 4) return;
  const shape = document.createElement("i");
  shape.className = "ambient-shape";
  shape.style.setProperty("--shape-x", `${Math.random() * 92}%`);
  shape.style.setProperty("--shape-y", `${Math.random() * 88}%`);
  shape.style.setProperty("--shape-w", `${40 + Math.random() * 180}px`);
  shape.style.setProperty("--shape-h", `${20 + Math.random() * 110}px`);
  shape.style.setProperty("--shape-radius", Math.random() > 0.5 ? "50%" : "12% 68% 24% 55%");
  shape.style.setProperty("--shape-rotate", `${Math.random() * 180}deg`);
  ambientShapes.append(shape);
  shape.animate([{ opacity: 0 }, { opacity: 0.5, offset: 0.35 }, { opacity: 0.38, offset: 0.75 }, { opacity: 0 }], {
    duration: 18000 + Math.random() * 18000,
    easing: "ease-in-out",
  }).finished.finally(() => shape.remove());
}

function triggerDistantShadow() {
  if (!distantShadow || distantShadow.classList.contains("passing")) return;
  const shapes = ["shadow-long", "shadow-round", "shadow-triangle", "shadow-column"];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  distantShadow.classList.add("passing", shape);
  window.setTimeout(() => distantShadow.classList.remove("passing", shape), 15500);
}

function spawnAbyssalPredator(immediate = false) {
  if (!denizenField || document.querySelector("#denizen-field .abyssal-predator")) return;
  const predator = document.createElement("img");
  predator.className = "denizen abyssal-predator";
  // leviathan-soft.png has the old CSS filter chain (blur 5px @display scale,
  // brightness .45, contrast 1.15, saturate .65) baked in — a runtime blur on
  // a 115vw layer re-rasters every frame while scale animates, and unfinished
  // raster tiles composited as a see-through body. Regenerate from
  // leviathan.png with tmp/jerrys-pool-denizens/bake_leviathan_filter.py.
  predator.src = "./leviathan-soft.png";
  predator.alt = "";
  denizenField.append(predator);
  const initialDrift = -2.3 + Math.random() * 4.6;
  const firstDriftDirection = Math.random() < 0.5 ? -1 : 1;
  const firstDriftStep = 0.25 + Math.random() * 0.3;
  const secondDriftStep = 0.25 + Math.random() * 0.3;
  const driftTargets = [
    initialDrift,
    initialDrift + firstDriftDirection * firstDriftStep,
    initialDrift + firstDriftDirection * firstDriftStep - firstDriftDirection * secondDriftStep,
  ].map((drift) => (-50 + drift).toFixed(2));
  const driftX = [
    driftTargets[0], driftTargets[0],
    driftTargets[1], driftTargets[1], driftTargets[1],
    driftTargets[2], driftTargets[2], driftTargets[2],
  ];
  const predatorAnimation = predator.animate(
    [
      { opacity: 1, transform: `translate3d(${driftX[0]}%, -4%, 0) rotate(-2deg) scale(0.82)`, easing: "ease-out" },
      { opacity: 1, offset: 0.008, transform: `translate3d(${driftX[1]}%, -7%, 0) rotate(-1.8deg) scale(0.83)`, easing: "ease-out" },
      { opacity: 1, offset: 0.3, transform: `translate3d(${driftX[2]}%, -35%, 0) rotate(0.3deg) scale(1)`, easing: "ease-in-out" },
      { opacity: 1, offset: 0.34, transform: `translate3d(${driftX[3]}%, -35.3%, 0) rotate(-0.12deg) scale(1.001)`, easing: "ease-in-out" },
      { opacity: 1, offset: 0.38, transform: `translate3d(${driftX[4]}%, -34.7%, 0) rotate(0.14deg) scale(0.999)`, easing: "ease-in-out" },
      { opacity: 1, offset: 0.42, transform: `translate3d(${driftX[5]}%, -35.3%, 0) rotate(-0.15deg) scale(1.001)`, easing: "ease-in-out" },
      { opacity: 1, offset: 0.46, transform: `translate3d(${driftX[6]}%, -34.7%, 0) rotate(0.08deg) scale(1)`, easing: "ease-in" },
      { opacity: 1, transform: `translate3d(${driftX[7]}%, 66%, 0) rotate(2deg) scale(0.84)` },
    ],
    { duration: 60000, easing: "linear" },
  );
  let panicTriggered = false;
  const triggerJerryPanic = () => {
    if (panicTriggered || !predator.isConnected) return;
    panicTriggered = true;
    const now = performance.now();
    cellMotion.leviathanPanic.active = true;
    cellMotion.leviathanPanic.start = now;
    cellMotion.leviathanPanic.releaseAt = Infinity;
    cellMotion.leviathanPanic.jerkCount = 3 + Math.floor(Math.random() * 2);
    cellMotion.leviathanPanic.escapeAt = now + cellMotion.leviathanPanic.jerkCount * 260 + 400;
    cellMotion.leviathanPanic.hideX = cellMotion.position.x < window.innerWidth * 0.5 ? -140 : window.innerWidth + 140;
    cellMotion.leviathanPanic.hideY = -140;
    const threatX = window.innerWidth * 0.5 - cellMotion.position.x;
    const threatY = window.innerHeight - cellMotion.position.y;
    const threatDistance = Math.max(1, Math.hypot(threatX, threatY));
    cellMotion.leviathanPanic.threatX = threatX / threatDistance;
    cellMotion.leviathanPanic.threatY = threatY / threatDistance;
    cellMotion.floorVisit.active = false;
    cellMotion.lockedPrey = null;
    foregroundPolypField?.classList.remove("jerry-tending");
  };
  const predatorStartedAt = performance.now();
  const watchPredatorVisibility = () => {
    if (!predator.isConnected) return;
    const now = performance.now();
    const bounds = predator.getBoundingClientRect();
    const creatureTop = bounds.top + bounds.height * 0.24;
    const creatureBottom = bounds.top + bounds.height * 0.72;
    const creatureHeight = Math.max(1, creatureBottom - creatureTop);
    const visibleHeight = Math.max(0, Math.min(window.innerHeight, creatureBottom) - Math.max(0, creatureTop));
    const visibleFraction = visibleHeight / creatureHeight;

    if (!panicTriggered) {
      const jerryVerticalPosition = cellMotion.position.y / Math.max(1, window.innerHeight);
      const noticeThreshold = jerryVerticalPosition >= 0.67
        ? 0.09
        : jerryVerticalPosition >= 0.33 ? 0.15 : 0.2;
      if (visibleFraction >= noticeThreshold) triggerJerryPanic();
    }

    if (panicTriggered && cellMotion.leviathanPanic.releaseAt === Infinity && now - predatorStartedAt >= 27600) {
      if (creatureTop >= window.innerHeight) {
        cellMotion.leviathanPanic.releaseAt = performance.now() + 3000;
        return;
      }
    }
    requestAnimationFrame(watchPredatorVisibility);
  };
  requestAnimationFrame(watchPredatorVisibility);
  predatorAnimation.finished.finally(() => {
    predator.remove();
    if (panicTriggered && cellMotion.leviathanPanic.releaseAt === Infinity) {
      cellMotion.leviathanPanic.releaseAt = performance.now() + 3000;
    }
    window.setTimeout(() => spawnAbyssalPredator(), 120000 + Math.random() * 120000);
  });
}

function triggerAtmosphericPulse() {
  if (!ambientWash) return;
  const bright = Math.random() > 0.5;
  ambientWash.animate(
    [
      { filter: "brightness(1) saturate(1)", opacity: 0.5 },
      {
        filter: bright
          ? "brightness(1.8) saturate(1.5) hue-rotate(24deg)"
          : "brightness(0.35) saturate(0.65) hue-rotate(-18deg)",
        opacity: bright ? 0.82 : 0.24,
        offset: 0.5,
      },
      { filter: "brightness(1) saturate(1)", opacity: 0.5 },
    ],
    { duration: 5000 + Math.random() * 5000, easing: "ease-in-out" },
  );
}

function scheduleAmbientEvent(delay = 8000 + Math.random() * 14000) {
  window.setTimeout(() => {
    const roll = Math.random();
    if (roll < 0.42) spawnAmbientBloom();
    else if (roll < 0.72) spawnAmbientShape();
    else if (roll < 0.9) triggerDistantShadow();
    else triggerAtmosphericPulse();
    scheduleAmbientEvent();
  }, delay);
}

function animateDenizen(element, keyframes, duration) {
  denizenField.append(element);
  activeDenizens += 1;
  registerJerryGlow(element);
  const isAmoeba = element.classList.contains("pool-amoeba");
  if (isAmoeba) activeAmoebas += 1;
  let removed = false;
  const removeElement = () => {
    if (removed) return;
    removed = true;
    element.remove();
    activeDenizens = Math.max(0, activeDenizens - 1);
    if (isAmoeba) activeAmoebas = Math.max(0, activeAmoebas - 1);
    if (element.dataset.largeShape === "true") activeLargeShapes = Math.max(0, activeLargeShapes - 1);
  };
  element.denizenCleanup = removeElement;
  const animation = element.animate(keyframes, { duration, easing: "linear", fill: isAmoeba ? "forwards" : "none" });
  element.denizenAnimation = animation;
  animation.finished.finally(() => {
    if (!isAmoeba) {
      removeElement();
      return;
    }
    element.dataset.routeFinished = "true";
    const removeAfterExit = () => {
      if (!element.isConnected) return;
      const bounds = element.getBoundingClientRect();
      const offscreen = bounds.right < -12 || bounds.left > window.innerWidth + 12 || bounds.bottom < -12 || bounds.top > window.innerHeight + 12;
      if (offscreen) removeElement();
      else requestAnimationFrame(removeAfterExit);
    };
    requestAnimationFrame(removeAfterExit);
  });
  return animation;
}

function nearestVisibleJelly(x, y) {
  let nearest = null;
  let nearestDistance = Infinity;
  document.querySelectorAll("#denizen-field .pool-jelly:not([data-consumed='true'])").forEach((jelly) => {
    const bell = jelly.querySelector(".jelly-bell");
    const bounds = (bell || jelly).getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight || bounds.right < 0 || bounds.left > window.innerWidth) return;
    const jellyX = bounds.left + bounds.width * 0.5;
    const jellyY = bounds.top + bounds.height * 0.5;
    const distance = Math.hypot(jellyX - x, jellyY - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { jelly, bounds, x: jellyX, y: jellyY, distance };
    }
  });
  return nearest;
}

function jellyTargetInfo(jelly, x, y) {
  if (!jelly?.isConnected || jelly.dataset.consumed === "true") return null;
  const bell = jelly.querySelector(".jelly-bell");
  const bounds = (bell || jelly).getBoundingClientRect();
  if (bounds.bottom < 0 || bounds.top > window.innerHeight || bounds.right < 0 || bounds.left > window.innerWidth) return null;
  const jellyX = bounds.left + bounds.width * 0.5;
  const jellyY = bounds.top + bounds.height * 0.5;
  return { jelly, bounds, x: jellyX, y: jellyY, distance: Math.hypot(jellyX - x, jellyY - y) };
}

function amoebaTargetInfo(prey, hunter, x, y) {
  if (
    !prey?.isConnected ||
    prey === hunter ||
    prey.dataset.consumed === "true" ||
    prey.dataset.feeding === "true" ||
    prey.dataset.satiated === "true"
  ) return null;
  const hunterBounds = hunter.getBoundingClientRect();
  const bounds = prey.getBoundingClientRect();
  if (bounds.bottom < 0 || bounds.top > window.innerHeight || bounds.right < 0 || bounds.left > window.innerWidth) return null;
  const hunterArea = hunterBounds.width * hunterBounds.height;
  const preyArea = bounds.width * bounds.height;
  if (preyArea >= hunterArea * 0.92) return null;
  const preyX = bounds.left + bounds.width * 0.5;
  const preyY = bounds.top + bounds.height * 0.5;
  return { kind: "amoeba", prey, bounds, x: preyX, y: preyY, distance: Math.hypot(preyX - x, preyY - y) };
}

function nearestVisibleMeal(hunter, x, y) {
  const jelly = nearestVisibleJelly(x, y);
  let nearest = jelly
    ? { kind: "jelly", prey: jelly.jelly, bounds: jelly.bounds, x: jelly.x, y: jelly.y, distance: jelly.distance }
    : null;

  document.querySelectorAll("#denizen-field .pool-amoeba").forEach((prey) => {
    const candidate = amoebaTargetInfo(prey, hunter, x, y);
    if (candidate && (!nearest || candidate.distance < nearest.distance)) nearest = candidate;
  });
  return nearest;
}

function freezeFeedingAmoeba(amoeba) {
  const animations = amoeba.getAnimations({ subtree: true });
  animations.forEach((animation) => animation.pause());
  return animations;
}

function releaseFeedingAmoeba(animations) {
  animations.forEach((animation) => {
    if (animation.playState === "paused") animation.play();
  });
}

function amoebaConsumeJelly(amoeba, jelly) {
  if (jelly.dataset.consumed === "true" || amoeba.dataset.energized !== "true") return;
  jelly.dataset.consumed = "true";
  amoeba.dataset.feeding = "true";
  amoeba.classList.add("amoeba-feeding");
  const frozenAnimations = freezeFeedingAmoeba(amoeba);

  const amoebaBounds = amoeba.getBoundingClientRect();
  const jellyBell = jelly.querySelector(".jelly-bell");
  const jellyBounds = (jellyBell || jelly).getBoundingClientRect();
  const jellyCenterX = jellyBounds.left + jellyBounds.width * 0.5;
  const jellyCenterY = jellyBounds.top + jellyBounds.height * 0.5;
  const amoebaCenterX = amoebaBounds.left + amoebaBounds.width * 0.5;
  const amoebaCenterY = amoebaBounds.top + amoebaBounds.height * 0.5;
  const facing = Number(amoeba.dataset.facing) || 1;
  const screenIntakeLeft = Math.max(9, Math.min(91, 50 + ((jellyCenterX - amoebaCenterX) / amoebaBounds.width) * 46));
  const intakeLeft = facing < 0 ? 100 - screenIntakeLeft : screenIntakeLeft;
  const intakeTop = Math.max(10, Math.min(90, 50 + ((jellyCenterY - amoebaCenterY) / amoebaBounds.height) * 46));
  const intake = document.createElement("span");
  intake.className = "amoeba-absorption-site";
  intake.style.left = `${intakeLeft.toFixed(1)}%`;
  intake.style.top = `${intakeTop.toFixed(1)}%`;
  amoeba.append(intake);

  const intakeScreenX = amoebaBounds.left + amoebaBounds.width * (screenIntakeLeft / 100);
  const intakeScreenY = amoebaBounds.top + amoebaBounds.height * (intakeTop / 100);
  const pullX = intakeScreenX - jellyCenterX;
  const pullY = intakeScreenY - jellyCenterY;
  const jellyRect = jelly.getBoundingClientRect();
  const jellyCopy = jelly.cloneNode(true);
  jellyCopy.classList.add("jelly-absorption-copy");
  jellyCopy.removeAttribute("data-consumed");
  jellyCopy.style.left = `${jellyRect.left.toFixed(1)}px`;
  jellyCopy.style.top = `${jellyRect.top.toFixed(1)}px`;
  jellyCopy.style.width = `${jellyRect.width.toFixed(1)}px`;
  jellyCopy.style.height = `${jellyRect.height.toFixed(1)}px`;
  jellyCopy.style.opacity = getComputedStyle(jelly).opacity;
  document.body.append(jellyCopy);
  jelly.style.visibility = "hidden";

  jellyCopy.animate(
    [
      {
        opacity: Number(jellyCopy.style.opacity) || 0.65,
        transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(1,1)`,
        filter: "brightness(1) blur(0px)",
      },
      {
        offset: 0.16,
        opacity: 0.8,
        transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.98,1.03)`,
        filter: "brightness(1.06) blur(0px)",
      },
      {
        offset: 0.52,
        opacity: 0.72,
        transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.8,0.94)`,
        filter: "brightness(1.13) blur(0.3px)",
      },
      {
        offset: 0.78,
        opacity: 0.58,
        transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.46,0.64)`,
        filter: "brightness(1.26) blur(0.8px)",
      },
      {
        opacity: 0.06,
        transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.06,0.1)`,
        filter: "brightness(1.6) blur(2px)",
      },
    ],
    { duration: 1750, easing: "cubic-bezier(.42,.02,.25,1)", fill: "forwards" },
  ).finished.finally(() => {
    jellyCopy.remove();
    jelly.remove();
    activeDenizens = Math.max(0, activeDenizens - 1);
    if (amoeba.isConnected) {
      intake.remove();
      amoeba.dataset.energized = "false";
      amoeba.dataset.feeding = "false";
      amoeba.dataset.satiated = "true";
      amoeba.dataset.departureAt = String(performance.now() + 1400);
      amoeba.classList.remove("energized");
      amoeba.style.filter = amoeba.style.filter.replace(
        /saturate\(([\d.]+)\)/,
        (match, value) => `saturate(${Math.min(2.6, Number(value) * 2).toFixed(2)})`,
      );
      releaseFeedingAmoeba(frozenAnimations);
    }
  });
  window.setTimeout(() => amoeba.classList.remove("amoeba-feeding"), 1900);
}

function amoebaConsumeAmoeba(hunter, prey) {
  if (
    prey.dataset.consumed === "true" ||
    hunter.dataset.energized !== "true" ||
    !amoebaTargetInfo(prey, hunter, 0, 0)
  ) return;
  prey.dataset.consumed = "true";
  hunter.dataset.feeding = "true";
  hunter.classList.add("amoeba-feeding");
  const frozenAnimations = freezeFeedingAmoeba(hunter);

  const hunterBounds = hunter.getBoundingClientRect();
  const preyBounds = prey.getBoundingClientRect();
  const preyX = preyBounds.left + preyBounds.width * 0.5;
  const preyY = preyBounds.top + preyBounds.height * 0.5;
  const hunterX = hunterBounds.left + hunterBounds.width * 0.5;
  const hunterY = hunterBounds.top + hunterBounds.height * 0.5;
  const facing = Number(hunter.dataset.facing) || 1;
  const screenIntakeLeft = Math.max(9, Math.min(91, 50 + ((preyX - hunterX) / hunterBounds.width) * 46));
  const intakeLeft = facing < 0 ? 100 - screenIntakeLeft : screenIntakeLeft;
  const intakeTop = Math.max(10, Math.min(90, 50 + ((preyY - hunterY) / hunterBounds.height) * 46));
  const intake = document.createElement("span");
  intake.className = "amoeba-absorption-site";
  intake.style.left = `${intakeLeft.toFixed(1)}%`;
  intake.style.top = `${intakeTop.toFixed(1)}%`;
  hunter.append(intake);

  const intakeX = hunterBounds.left + hunterBounds.width * (screenIntakeLeft / 100);
  const intakeY = hunterBounds.top + hunterBounds.height * (intakeTop / 100);
  const pullX = intakeX - preyX;
  const pullY = intakeY - preyY;
  const copy = prey.cloneNode(true);
  copy.classList.add("jelly-absorption-copy");
  copy.removeAttribute("data-consumed");
  copy.style.left = `${preyBounds.left.toFixed(1)}px`;
  copy.style.top = `${preyBounds.top.toFixed(1)}px`;
  copy.style.width = `${preyBounds.width.toFixed(1)}px`;
  copy.style.height = `${preyBounds.height.toFixed(1)}px`;
  copy.style.opacity = getComputedStyle(prey).opacity;
  document.body.append(copy);
  prey.style.visibility = "hidden";

  copy.animate(
    [
      { opacity: Number(copy.style.opacity) || 0.7, transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(1)`, filter: "brightness(1) blur(0px)" },
      { offset: 0.16, opacity: 0.76, transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.96,1.02)`, filter: "brightness(1.08) blur(0px)" },
      { offset: 0.68, opacity: 0.58, transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.52,0.68)`, filter: "brightness(1.22) blur(0.6px)" },
      { opacity: 0.04, transform: `translate3d(${pullX.toFixed(1)}px,${pullY.toFixed(1)}px,0) scale(0.06,0.09)`, filter: "brightness(1.55) blur(2px)" },
    ],
    { duration: 1550, easing: "cubic-bezier(.42,.02,.25,1)", fill: "forwards" },
  ).finished.finally(() => {
    copy.remove();
    prey.denizenCleanup?.();
    if (hunter.isConnected) {
      intake.remove();
      hunter.dataset.energized = "false";
      hunter.dataset.feeding = "false";
      hunter.dataset.satiated = "true";
      hunter.dataset.departureAt = String(performance.now() + 1400);
      hunter.classList.remove("energized");
      hunter.style.filter = hunter.style.filter.replace(
        /saturate\(([\d.]+)\)/,
        (match, value) => `saturate(${Math.min(2.6, Number(value) * 2).toFixed(2)})`,
      );
      releaseFeedingAmoeba(frozenAnimations);
    }
  });
  window.setTimeout(() => hunter.classList.remove("amoeba-feeding"), 1700);
}

function steerAmoebaFromJerry(amoeba, animation) {
  let offsetX = 0;
  let offsetY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let huntedMeal = null;
  let detourSide = 0;
  let lastUpdate = performance.now();
  const update = () => {
    if (!amoeba.isConnected) return;
    const now = performance.now();
    const delta = Math.min(0.08, (now - lastUpdate) / 1000);
    lastUpdate = now;
    const bounds = amoeba.getBoundingClientRect();
    const amoebaX = bounds.left + bounds.width / 2;
    const amoebaY = bounds.top + bounds.height / 2;
    const jerryX = cellMotion.position.x + cellMotion.drift.x;
    const jerryY = cellMotion.position.y + cellMotion.drift.y;
    const differenceX = amoebaX - jerryX;
    const differenceY = amoebaY - jerryY;
    const distance = Math.hypot(differenceX, differenceY) || 1;
    const jerryRadius = (orb?.getBoundingClientRect().width || 180) / 2;
    const energized = amoeba.dataset.energized === "true";
    const satiated = amoeba.dataset.satiated === "true";
    const contactDistance = jerryRadius + Math.max(bounds.width, bounds.height) * 0.18;
    if (amoeba.dataset.feeding === "true") {
      velocityX = 0;
      velocityY = 0;
    } else if (satiated) {
      if (now >= Number(amoeba.dataset.departureAt || 0)) {
        const exitDirection = amoebaX < window.innerWidth * 0.5 ? -1 : 1;
        velocityX = lerp(velocityX, exitDirection * 96, Math.min(0.18, delta * 2.4));
        velocityY = lerp(velocityY, Math.sin(now * 0.0007) * 18, Math.min(0.08, delta));
      }
    } else if (!energized && distance < 650) {
      const attraction = 120 + (1 - distance / 650) * 220;
      velocityX -= (differenceX / distance) * attraction * delta;
      velocityY -= (differenceY / distance) * attraction * delta;
      const pursuitSpeed = 105 + (1 - distance / 650) * 70;
      velocityX = lerp(velocityX, -(differenceX / distance) * pursuitSpeed, Math.min(0.42, delta * 5.4));
      velocityY = lerp(velocityY, -(differenceY / distance) * pursuitSpeed, Math.min(0.42, delta * 5.4));
      if (distance < contactDistance) {
        amoeba.dataset.energized = "true";
        amoeba.dataset.huntBoostUntil = String(now + 4000);
        amoeba.classList.add("energized");
        velocityX = (differenceX / distance) * 128;
        velocityY = (differenceY / distance) * 128;
      }
    } else if (energized) {
      let target = null;
      if (amoeba.dataset.feeding !== "true") {
        target = nearestVisibleMeal(amoeba, amoebaX, amoebaY);
        const nextMeal = target ? { kind: target.kind, prey: target.prey } : null;
        if (nextMeal?.prey !== huntedMeal?.prey) detourSide = 0;
        huntedMeal = nextMeal;
      }
      if (target) {
        const targetX = target.x - amoebaX;
        const targetY = target.y - amoebaY;
        const targetDistance = Math.max(1, Math.hypot(targetX, targetY));
        let steeringX = targetX;
        let steeringY = targetY;
        let steeringDistance = targetDistance;
        let routingAroundJerry = false;
        const segmentLengthSquared = targetX * targetX + targetY * targetY;
        const amoebaToJerryX = jerryX - amoebaX;
        const amoebaToJerryY = jerryY - amoebaY;
        const projection = segmentLengthSquared > 0
          ? (amoebaToJerryX * targetX + amoebaToJerryY * targetY) / segmentLengthSquared
          : 0;
        const closestX = amoebaX + targetX * Math.max(0, Math.min(1, projection));
        const closestY = amoebaY + targetY * Math.max(0, Math.min(1, projection));
        const routeClearance = jerryRadius + Math.max(bounds.width, bounds.height) * 0.38 + 28;
        const routeDistance = Math.hypot(closestX - jerryX, closestY - jerryY);

        if (projection > 0.04 && projection < 0.96 && routeDistance < routeClearance) {
          routingAroundJerry = true;
          const radialX = (amoebaX - jerryX) / distance;
          const radialY = (amoebaY - jerryY) / distance;
          if (!detourSide) {
            const towardTargetX = target.x - jerryX;
            const towardTargetY = target.y - jerryY;
            const leftAdvance = -radialY * towardTargetX + radialX * towardTargetY;
            detourSide = leftAdvance >= 0 ? 1 : -1;
          }
          const tangentX = -radialY * detourSide;
          const tangentY = radialX * detourSide;
          const outwardPressure = Math.max(0.38, Math.min(1.15, (routeClearance - distance) / routeClearance + 0.52));
          steeringX = tangentX + radialX * outwardPressure;
          steeringY = tangentY + radialY * outwardPressure;
          steeringDistance = Math.max(1, Math.hypot(steeringX, steeringY));
          if (distance < routeClearance * 1.18) {
            const repulsion = (1 - distance / (routeClearance * 1.18)) * 260;
            velocityX += radialX * repulsion * delta;
            velocityY += radialY * repulsion * delta;
          }
        } else {
          detourSide = 0;
        }
        const huntBoost = now < Number(amoeba.dataset.huntBoostUntil || 0) ? 1.3 : 1;
        const huntForce = (150 + Math.min(150, targetDistance * 0.24)) * huntBoost;
        velocityX += (steeringX / steeringDistance) * huntForce * delta;
        velocityY += (steeringY / steeringDistance) * huntForce * delta;
        const closeRange = !routingAroundJerry && targetDistance < 130;
        const huntSpeed = closeRange
          ? Math.max(34, targetDistance * 1.15) * huntBoost
          : (125 + Math.min(55, targetDistance * 0.08)) * huntBoost;
        const turnResponse = Math.min(closeRange ? 0.72 : huntBoost > 1 ? 0.58 : 0.38, delta * (closeRange ? 12 : huntBoost > 1 ? 8.4 : 5.2));
        velocityX = lerp(velocityX, (steeringX / steeringDistance) * huntSpeed, turnResponse);
        velocityY = lerp(velocityY, (steeringY / steeringDistance) * huntSpeed, turnResponse);
        if (targetDistance < 85) {
          const closingResponse = Math.min(0.24, delta * 3.8);
          offsetX += targetX * closingResponse;
          offsetY += targetY * closingResponse;
        }
        const consumeDistance = Math.max(30, Math.min(bounds.width, bounds.height) * 0.28 + Math.min(target.bounds.width, target.bounds.height) * 0.3);
        if (targetDistance < consumeDistance) {
          if (target.kind === "amoeba") amoebaConsumeAmoeba(amoeba, target.prey);
          else amoebaConsumeJelly(amoeba, target.prey);
        }
      } else if (distance < 650) {
        const departureForce = 55 + (1 - distance / 650) * 95;
        velocityX += (differenceX / distance) * departureForce * delta;
        velocityY += (differenceY / distance) * departureForce * delta;
      }
    }
    if (amoeba.dataset.routeFinished === "true" && amoeba.dataset.feeding !== "true") {
      const exitDirection = amoebaX < window.innerWidth * 0.5 ? -1 : 1;
      velocityX = lerp(velocityX, exitDirection * 58, 0.075);
      velocityY += Math.sin(now * 0.0017) * 2.4 * delta;
    }
    const speed = Math.hypot(velocityX, velocityY);
    const speedLimit = now < Number(amoeba.dataset.huntBoostUntil || 0) ? 240.5 : 185;
    if (speed > speedLimit) {
      velocityX *= speedLimit / speed;
      velocityY *= speedLimit / speed;
    }
    const drag = Math.pow(0.87, delta * 20);
    velocityX *= drag;
    velocityY *= drag;
    offsetX += velocityX * delta;
    offsetY += velocityY * delta;
    amoeba.style.setProperty("--avoid-x", `${offsetX.toFixed(2)}px`);
    amoeba.style.setProperty("--avoid-y", `${offsetY.toFixed(2)}px`);
    window.setTimeout(update, 50);
  };
  update();
}

function aimAmoebaNucleus(amoeba, animation) {
  const nucleus = amoeba.querySelector(".blob-nucleus");
  if (!nucleus) return;
  let randomTargetAt = 0;
  let randomLeft = 50;
  let randomTop = 50;
  const update = () => {
    if (!amoeba.isConnected) return;
    const now = performance.now();
    const bounds = amoeba.getBoundingClientRect();
    const amoebaX = bounds.left + bounds.width / 2;
    const amoebaY = bounds.top + bounds.height / 2;
    const jerryX = cellMotion.position.x + cellMotion.drift.x;
    const jerryY = cellMotion.position.y + cellMotion.drift.y;
    const distance = Math.hypot(jerryX - amoebaX, jerryY - amoebaY) || 1;
    const facing = Number(amoeba.dataset.facing) || 1;
    const mealTarget = amoeba.dataset.energized === "true" ? nearestVisibleMeal(amoeba, amoebaX, amoebaY) : null;
    if (mealTarget) {
      const mealDistance = Math.max(1, mealTarget.distance);
      nucleus.style.left = `${50 + ((mealTarget.x - amoebaX) / mealDistance) * 19 * facing}%`;
      nucleus.style.top = `${50 + ((mealTarget.y - amoebaY) / mealDistance) * 17}%`;
    } else if (distance < 650 && amoeba.dataset.energized !== "true" && amoeba.dataset.satiated !== "true") {
      nucleus.style.left = `${50 + ((jerryX - amoebaX) / distance) * 19 * facing}%`;
      nucleus.style.top = `${50 + ((jerryY - amoebaY) / distance) * 17}%`;
    } else {
      if (now >= randomTargetAt) {
        randomLeft = 30 + Math.random() * 40;
        randomTop = 30 + Math.random() * 40;
        randomTargetAt = now + 1500 + Math.random() * 3000;
      }
      nucleus.style.left = `${randomLeft}%`;
      nucleus.style.top = `${randomTop}%`;
    }
    window.setTimeout(update, 140);
  };
  update();
}

function spawnCrossingDenizen(type, headStart = 0) {
  const tunerKey = type === "pool-amoeba" ? "amoeba" : "ray";
  if (!denizenField || tunerPop(tunerKey) <= 0 || tunerSharedCapBlocked(tunerKey, activeDenizens, 6)) return;
  if (type === "pool-amoeba" && activeAmoebas >= tunerCap("amoeba", 5)) return;
  const element = document.createElement("i");
  element.className = `denizen ${type}`;
  let durationScale = 1;
  let crossingOpacity = 0.62;
  if (type === "pool-amoeba") {
    const wantsLarge = Math.random() < 0.68 && activeLargeShapes === 0;
    const jerryDiameter = orb?.getBoundingClientRect().width || Math.min(window.innerWidth * 0.3528, 242);
    const maxWidth = Math.max(12, jerryDiameter * 0.75 / 1.16);
    const minWidth = Math.min(18, maxWidth * 0.4);
    const width = wantsLarge
      ? maxWidth * (0.62 + Math.random() * 0.38)
      : minWidth + Math.pow(Math.random(), 1.7) * (maxWidth - minWidth);
    const sizeProgress = Math.min(1, width / window.innerWidth);
    const forms = [
      { name: "blob-form-a", ratio: [0.68, 0.96] },
      { name: "blob-form-b", ratio: [0.62, 0.9] },
      { name: "blob-form-c", ratio: [0.66, 0.94] },
      { name: "blob-form-long", ratio: [0.3, 0.48] },
      { name: "blob-form-wedge", ratio: [0.5, 0.72] },
      { name: "blob-form-star", ratio: [0.76, 1.02] },
      { name: "blob-form-drop", ratio: [0.82, 1.12] },
    ];
    const form = forms[Math.floor(Math.random() * forms.length)];
    const heightRatio = form.ratio[0] + Math.random() * (form.ratio[1] - form.ratio[0]);
    const height = Math.min(width * heightRatio, jerryDiameter * 0.75 / 1.12);
    element.className += ` ${form.name}`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    const nucleus = document.createElement("b");
    nucleus.className = "blob-nucleus";
    nucleus.style.left = "50%";
    nucleus.style.top = "50%";
    nucleus.style.width = `${24 + Math.random() * 24}%`;
    nucleus.style.height = `${24 + Math.random() * 28}%`;
    nucleus.style.setProperty("--nucleus-drift", `${-Math.random() * 8}s`);
    element.append(nucleus);
    const hueShift = -34 + Math.random() * 112;
    const saturation = 0.72 + Math.random() * 0.72;
    crossingOpacity = Math.random() < 0.12
      ? 0.42 + Math.random() * 0.2
      : 0.78 + Math.random() * 0.18;
    durationScale = 0.62 + Math.random() * 1.28;
    element.style.filter = `blur(${(0.4 + sizeProgress * 24).toFixed(1)}px) hue-rotate(${hueShift.toFixed(0)}deg) saturate(${saturation.toFixed(2)})`;
    if (wantsLarge) {
      element.dataset.largeShape = "true";
      activeLargeShapes += 1;
    }
  } else if (type === "pool-ray") {
    const depth = Math.random();
    const width = 62 + Math.pow(depth, 1.35) * 159;
    const height = width * (0.285 + Math.random() * 0.09);
    element.style.width = `${width.toFixed(0)}px`;
    element.style.height = `${height.toFixed(0)}px`;
    element.style.filter = `blur(${((1 - depth) * 4.8).toFixed(1)}px) brightness(${(0.31 + depth * 0.29).toFixed(2)}) saturate(${(0.7 + depth * 0.55).toFixed(2)})`;
    crossingOpacity = 0.2 + depth * 0.56;
    durationScale = 0.52 + Math.random() * 1.55;
  }
  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -280 : window.innerWidth + 280;
  const endX = fromLeft ? window.innerWidth + 280 : -280;
  const startY = 50 + Math.random() * Math.max(80, window.innerHeight - 180);
  const endY = Math.max(20, Math.min(window.innerHeight - 100, startY + (-130 + Math.random() * 260)));
  const facing = fromLeft ? 1 : -1;
  element.dataset.facing = String(facing);
  const duration = (24000 + Math.random() * 26000) * durationScale;
  if (type === "pool-ray") {
    const pulseFrames = [{ offset: 0, progress: 0, stretch: 0.94, thickness: 1.08, opacity: 0 }];
    for (let cycle = 0; cycle < 8; cycle += 1) {
      pulseFrames.push({
        offset: (cycle + 0.28) / 8,
        progress: (cycle + 0.4) / 8,
        stretch: 1.36 + (cycle % 2) * 0.05,
        thickness: 0.69 - (cycle % 2) * 0.03,
        opacity: crossingOpacity,
      });
      pulseFrames.push({
        offset: (cycle + 1) / 8,
        progress: (cycle + 1) / 8,
        stretch: 0.9,
        thickness: 1.18,
        opacity: cycle === 7 ? 0 : crossingOpacity,
      });
    }
    const rayKeyframes = pulseFrames.map((frame) => {
      const x = startX + (endX - startX) * frame.progress;
      const y = startY + (endY - startY) * frame.progress + Math.sin(frame.progress * Math.PI * 2) * 18;
      return {
        offset: frame.offset,
        opacity: frame.opacity,
        easing: "linear",
        transform: `translate3d(${x}px,${y}px,0) scaleX(${(facing * frame.stretch).toFixed(3)}) scaleY(${frame.thickness})`,
      };
    });
    const rayMovement = animateDenizen(element, rayKeyframes, duration * 0.84);
    if (headStart) rayMovement.currentTime = duration * 0.84 * headStart;
    return;
  }
  const movement = animateDenizen(
    element,
    [
      { opacity: 0, transform: `translate3d(calc(${startX}px + var(--avoid-x, 0px)),calc(${startY}px + var(--avoid-y, 0px)),0) scaleX(${facing})` },
      { opacity: crossingOpacity, offset: 0.12 },
      { opacity: crossingOpacity, offset: 0.84 },
      { opacity: type === "pool-amoeba" ? crossingOpacity : 0, transform: `translate3d(calc(${endX}px + var(--avoid-x, 0px)),calc(${endY}px + var(--avoid-y, 0px)),0) scaleX(${facing})` },
    ],
    duration,
  );
  if (headStart) movement.currentTime = duration * headStart;
  if (type === "pool-amoeba") {
    aimAmoebaNucleus(element, movement);
    steerAmoebaFromJerry(element, movement);
  }
}

function spawnVake() {
  if (!denizenField || tunerPop("vake") <= 0) return;
  if (document.querySelectorAll("#denizen-field .pool-vake").length >= tunerCap("vake", 2)) return;
  const vake = document.createElement("i");
  vake.className = "denizen pool-vake";
  const depth = Math.random();
  const width = 42 + depth * 46;
  const blurPart = `blur(${(2.5 + (1 - depth) * 1.5).toFixed(1)}px)`;
  vake.style.width = `${width.toFixed(0)}px`;
  vake.style.height = `${(width * 0.32).toFixed(0)}px`;
  vake.style.filter = `${blurPart} brightness(${(0.35 + depth * 0.15).toFixed(2)}) saturate(0.65)`;
  let startX;
  let startY;
  let endX;
  let endY;
  if (Math.random() < 0.55) {
    const fromLeft = Math.random() > 0.5;
    startX = fromLeft ? -220 : window.innerWidth + 220;
    endX = fromLeft ? window.innerWidth + 220 : -220;
    startY = 60 + Math.random() * Math.max(80, window.innerHeight - 220);
    endY = Math.max(40, Math.min(
      window.innerHeight - 80,
      startY + (Math.random() - 0.5) * window.innerHeight * 0.9,
    ));
  } else {
    const fromTop = Math.random() > 0.5;
    startY = fromTop ? -220 : window.innerHeight + 220;
    endY = fromTop ? window.innerHeight + 220 : -220;
    startX = 60 + Math.random() * Math.max(80, window.innerWidth - 220);
    endX = Math.max(40, Math.min(
      window.innerWidth - 80,
      startX + (Math.random() - 0.5) * window.innerWidth * 0.9,
    ));
  }
  const travelX = endX - startX;
  const travelY = endY - startY;
  const travelLength = Math.hypot(travelX, travelY) || 1;
  const opacity = 0.32 + depth * 0.12;
  // same pace as the old baked dart: whole crossing in 3-5 s, hunts included
  const speed = travelLength / (3000 + Math.random() * 2000);
  // exit target pushed well past the old endpoint so the offscreen check
  // fires before the steering loop can reach (and start orbiting) it
  const exitX = endX + (travelX / travelLength) * 600;
  const exitY = endY + (travelY / travelLength) * 600;
  vake.style.transform = `translate3d(${startX.toFixed(1)}px,${startY.toFixed(1)}px,0)`;
  const maxLifetime = 22000;
  animateDenizen(
    vake,
    [
      { opacity: 0 },
      { opacity, offset: 0.02 },
      { opacity, offset: 0.97 },
      { opacity: 0 },
    ],
    maxLifetime,
  );
  guideVake(vake, {
    startX,
    startY,
    exitX,
    exitY,
    speed,
    width,
    // same values as the spawn filter: the body stays black when fed, the
    // glow comes from drop-shadows appended at pop time
    fedFilter: `${blurPart} brightness(${(0.35 + depth * 0.15).toFixed(2)}) saturate(0.65)`,
    // post-zap look: desaturated and lifted to a medium-light gray
    stunFilter: `${blurPart} saturate(0) brightness(2.35)`,
  });
}

function spawnJerryZap(fromX, fromY, toX, toY) {
  if (!denizenField) return;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "jerry-zap");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  const segments = 7;
  let points = `${fromX.toFixed(1)},${fromY.toFixed(1)}`;
  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    // jitter biggest mid-bolt, pinched at both ends
    const jitter = (Math.random() - 0.5) * 34 * Math.sin(t * Math.PI);
    points += ` ${(fromX + dx * t + perpX * jitter).toFixed(1)},${(fromY + dy * t + perpY * jitter).toFixed(1)}`;
  }
  points += ` ${toX.toFixed(1)},${toY.toFixed(1)}`;
  [
    { stroke: "rgba(118, 220, 255, 0.55)", width: "4.5" },
    { stroke: "rgba(238, 251, 255, 0.95)", width: "1.6" },
  ].forEach(({ stroke, width: strokeWidth }) => {
    const line = document.createElementNS(svgNS, "polyline");
    line.setAttribute("points", points);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", strokeWidth);
    line.setAttribute("stroke-linejoin", "round");
    svg.append(line);
  });
  denizenField.append(svg);
  svg.animate(
    [
      { opacity: 1 },
      { opacity: 0.35, offset: 0.4 },
      { opacity: 0.9, offset: 0.55 },
      { opacity: 0 },
    ],
    { duration: 340, easing: "ease-out", fill: "forwards" },
  );
  window.setTimeout(() => svg.remove(), 400);
}

const VAKE_SIGHT_FRACTION = 0.75;
const VAKE_FED_AVOID_RANGE = 430; // px from Jerry's edge; fed vakes lean away inside this
const VAKE_ZAP_RANGE = 234; // px from Jerry's edge (was 260; James trimmed Jerry's reach 10%)
const VAKE_ZAP_MISS_CHANCE = 0.2; // 1 in 5 bolts go wide
const VAKE_ZAP_REARM_MS = [2600, 4000]; // pause before Jerry can fire again after a miss
const VAKE_BUFFER_RANGE = 320; // px; every vake bends toward pure flight as it nears the zap range

function popOrbForVake(ball, vake, fedFilter) {
  if (ball.dataset.claimed === "true" || ball.dataset.finished === "true") return null;
  ball.dataset.claimed = "true";
  const color = ball.style.getPropertyValue("--energy-color").trim();
  if (color) {
    vake.style.setProperty("--vake-rgb", color);
    vake.classList.add("orb-fed");
    // amoeba-style rim glow — as drop-shadows because box-shadow/border would
    // be clipped away by the vake's clip-path; shadow color is unaffected by
    // the darkening filters before it in the chain
    vake.style.filter = `${fedFilter} drop-shadow(0 0 6px rgb(${color} / 0.9)) drop-shadow(0 0 16px rgb(${color} / 0.5))`;
  }
  // the *pop*: re-anchor left/top to where the flight animation has carried
  // the ball, then burst via full transform strings — the standalone `scale`
  // property multiplies the translation too, sliding things toward the origin
  const rect = ball.getBoundingClientRect();
  ball.style.setProperty("--energy-x", `${(rect.left + rect.width * 0.5).toFixed(1)}px`);
  ball.style.setProperty("--energy-y", `${(rect.top + rect.height * 0.5).toFixed(1)}px`);
  ball.animate(
    [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
      { transform: "translate(-50%, -50%) scale(1.7)", opacity: 0.85, offset: 0.4 },
      { transform: "translate(-50%, -50%) scale(2.4)", opacity: 0 },
    ],
    { duration: 240, easing: "ease-out", fill: "forwards" },
  );
  // removal on a plain timeout — animation.finished never resolves in a hidden pane
  window.setTimeout(() => ball.energyCleanup?.(), 260);
  return color || null;
}

function spawnVakeTrail(x, y, heading, width, color) {
  const puff = document.createElement("i");
  puff.className = "vake-trail";
  const size = width * (0.3 + Math.random() * 0.25);
  puff.style.width = `${size.toFixed(1)}px`;
  puff.style.height = `${size.toFixed(1)}px`;
  puff.style.setProperty("--trail-rgb", color);
  // drop the puff at the tail: the vake rotates about its center, so the tail
  // sits a half-length back along the heading
  const centerX = x + width * 0.5;
  const centerY = y + width * 0.16;
  const puffX = centerX - Math.cos(heading) * width * 0.45 + (Math.random() - 0.5) * 5 - size * 0.5;
  const puffY = centerY - Math.sin(heading) * width * 0.45 + (Math.random() - 0.5) * 5 - size * 0.5;
  const base = `translate3d(${puffX.toFixed(1)}px,${puffY.toFixed(1)}px,0)`;
  puff.style.transform = base;
  denizenField.append(puff);
  // full transform strings: animating the bare `scale` property would scale
  // the translation with it and slide the puff toward the viewport origin
  puff.animate(
    [
      { opacity: 0.85, transform: `${base} scale(1)` },
      { opacity: 0, transform: `${base} scale(0.5)` },
    ],
    { duration: 650, easing: "ease-out", fill: "forwards" },
  );
  // plain-timeout removal — frozen-pane safe
  window.setTimeout(() => puff.remove(), 700);
}

function guideVake(vake, route) {
  let x = route.startX;
  let y = route.startY;
  let heading = Math.atan2(route.exitY - route.startY, route.exitX - route.startX);
  const swingPhase = Math.random() * Math.PI * 2;
  const swingRate = 0.0022 + Math.random() * 0.0008;
  const maxTurn = 0.004; // rad/ms — banks hard, never speeds up
  const maxTurnFed = 0.006; // fed: tighter turning radius, sells the caution
  const maxTurnEvade = 0.009; // inside the buffer or spooked by a near miss: hardest banking
  let target = null;
  let lastScanAt = 0;
  let hasEnteredView = false;
  let previousFrameAt = performance.now();
  let trailColor = null; // set once it feeds; one orb per visit
  let lastTrailAt = 0;
  let zapped = false;
  let zappedRotation = 0;
  let riseVelocity = 0;
  let zapCooldownUntil = 0;
  let spookedUntil = 0;
  let lastJerryCheckAt = 0;
  let jerryDx = 0;
  let jerryDy = 0;
  let jerryGap = Infinity;

  const update = () => {
    if (!vake.isConnected) return;
    const now = performance.now();
    const dt = Math.min(64, now - previousFrameAt);
    previousFrameAt = now;

    // Jerry doesn't like the vake — it eats the orbs meant for his worms.
    // Inside VAKE_ZAP_RANGE of his edge he fires, but 1 bolt in 5 goes wide:
    // the vake spooks straight away and Jerry needs a moment to re-arm.
    if (!zapped && now - lastJerryCheckAt > 150 && cellMotion?.position) {
      lastJerryCheckAt = now;
      const jerryRadius = (orb?.getBoundingClientRect().width || 180) / 2;
      const vakeCenterX = x + route.width * 0.5;
      const vakeCenterY = y + route.width * 0.16;
      const dx = vakeCenterX - cellMotion.position.x;
      const dy = vakeCenterY - cellMotion.position.y;
      const gap = Math.hypot(dx, dy) - jerryRadius;
      jerryDx = dx;
      jerryDy = dy;
      jerryGap = gap;
      if (gap < VAKE_ZAP_RANGE && now >= zapCooldownUntil) {
        // bolt starts at Jerry's rim, not his center
        const reach = Math.max(1, Math.hypot(dx, dy));
        const edgeScale = jerryRadius / reach;
        const boltFromX = cellMotion.position.x + dx * edgeScale;
        const boltFromY = cellMotion.position.y + dy * edgeScale;
        if (Math.random() < VAKE_ZAP_MISS_CHANCE) {
          // the miss is visible: the bolt lands beside the vake, perpendicular
          // to the firing line, and the vake drops everything to flee
          const missBy = (30 + route.width * 0.6 + Math.random() * 36) * (Math.random() > 0.5 ? 1 : -1);
          spawnJerryZap(
            boltFromX,
            boltFromY,
            vakeCenterX + (-dy / reach) * missBy,
            vakeCenterY + (dx / reach) * missBy,
          );
          zapCooldownUntil = now + VAKE_ZAP_REARM_MS[0] + Math.random() * (VAKE_ZAP_REARM_MS[1] - VAKE_ZAP_REARM_MS[0]);
          spookedUntil = now + 1800;
          target = null;
        } else {
          zapped = true;
          target = null;
          trailColor = null;
          spawnJerryZap(boltFromX, boltFromY, vakeCenterX, vakeCenterY);
          let normalized = ((heading * 180) / Math.PI) % 360;
          if (normalized > 180) normalized -= 360;
          if (normalized < -180) normalized += 360;
          zappedRotation = normalized;
          vake.classList.remove("orb-fed");
          vake.style.transition = "filter 700ms ease";
          vake.style.filter = `${route.stunFilter} brightness(2.6)`; // strike flash
          window.setTimeout(() => {
            if (vake.isConnected) vake.style.filter = route.stunFilter;
          }, 140);
        }
      }
    }

    if (zapped) {
      // stunned: no more swimming — it levels off and rises with the flow
      riseVelocity = lerp(riseVelocity, -0.055, 1 - Math.pow(0.94, dt / 16));
      x += Math.sin(now * 0.0012 + swingPhase) * 0.014 * dt;
      y += riseVelocity * dt;
      zappedRotation = lerp(zappedRotation, 0, 1 - Math.pow(0.995, dt));
      const wobble = Math.sin(now * 0.002 + swingPhase) * 7;
      if (y < -route.width - 160) {
        vake.denizenCleanup?.();
        return;
      }
      vake.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(zappedRotation + wobble).toFixed(1)}deg)`;
      requestAnimationFrame(update);
      return;
    }

    if (target && (!target.isConnected || target.dataset.claimed === "true" || target.dataset.finished === "true")) {
      target = null;
    }
    if (!target && trailColor === null && now - lastScanAt > 120) {
      lastScanAt = now;
      const sight = VAKE_SIGHT_FRACTION * Math.max(window.innerWidth, window.innerHeight);
      let nearest = Infinity;
      for (const ball of activeEnergyElements) {
        if (ball.dataset.claimed === "true" || ball.dataset.finished === "true") continue;
        const rect = ball.getBoundingClientRect();
        const distance = Math.hypot(rect.left + rect.width * 0.5 - x, rect.top + rect.height * 0.5 - y);
        if (distance < sight && distance < nearest) {
          nearest = distance;
          target = ball;
        }
      }
    }

    let desired;
    const spooked = now < spookedUntil;
    if (spooked) {
      // near-miss adrenaline: nothing matters but getting away from Jerry
      desired = Math.atan2(jerryDy, jerryDx);
    } else if (target) {
      const rect = target.getBoundingClientRect();
      const targetX = rect.left + rect.width * 0.5;
      const targetY = rect.top + rect.height * 0.5;
      desired = Math.atan2(targetY - y, targetX - x);
      const reach = Math.max(18, rect.width * 0.5 + route.width * 0.3);
      if (Math.hypot(targetX - x, targetY - y) < reach) {
        trailColor = popOrbForVake(target, vake, route.fedFilter);
        target = null;
        desired = heading;
      }
    } else {
      // cruising: head for the exit with the old swooping wobble
      desired = Math.atan2(route.exitY - y, route.exitX - x) + Math.sin(now * swingRate + swingPhase) * 0.5;
      // once fed it prefers to keep clear of Jerry on the way out: a
      // proximity-weighted lean away (at most ~4/5 of the way toward pure
      // flight), so it curves wide around him — the turn-rate clamp and the
      // exit pull keep it from ever reading as a hairpin
      if (trailColor !== null && jerryGap < VAKE_FED_AVOID_RANGE) {
        const away = Math.atan2(jerryDy, jerryDx);
        const w = (1 - Math.max(0, jerryGap) / VAKE_FED_AVOID_RANGE) * 0.8;
        let bend = away - desired;
        while (bend > Math.PI) bend -= Math.PI * 2;
        while (bend < -Math.PI) bend += Math.PI * 2;
        desired += bend * w;
      }
    }

    // buffer zone: every vake — mid-hunt included — bends toward pure flight
    // as it closes on Jerry's reach, hitting full flight just outside the zap
    // range. Most skirt the kill zone; momentum can still carry one in.
    if (!spooked && jerryGap < VAKE_BUFFER_RANGE) {
      const away = Math.atan2(jerryDy, jerryDx);
      const w = Math.min(1, Math.max(0, 1 - (jerryGap - VAKE_ZAP_RANGE - 16) / (VAKE_BUFFER_RANGE - VAKE_ZAP_RANGE - 16)));
      let bend = away - desired;
      while (bend > Math.PI) bend -= Math.PI * 2;
      while (bend < -Math.PI) bend += Math.PI * 2;
      desired += bend * w;
    }

    let delta = desired - heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const evading = spooked || jerryGap < VAKE_BUFFER_RANGE;
    const turn = (evading ? maxTurnEvade : trailColor !== null ? maxTurnFed : maxTurn) * dt;
    heading += Math.max(-turn, Math.min(turn, delta));

    x += Math.cos(heading) * route.speed * dt;
    y += Math.sin(heading) * route.speed * dt;

    if (x > -40 && x < window.innerWidth + 40 && y > -40 && y < window.innerHeight + 40) {
      hasEnteredView = true;
    }
    const margin = 240;
    if (
      hasEnteredView &&
      (x < -margin || x > window.innerWidth + margin || y < -margin || y > window.innerHeight + margin)
    ) {
      vake.denizenCleanup?.();
      return;
    }

    vake.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${((heading * 180) / Math.PI).toFixed(1)}deg)`;

    if (trailColor !== null && hasEnteredView && now - lastTrailAt > 30) {
      lastTrailAt = now;
      spawnVakeTrail(x, y, heading, route.width, trailColor);
    }
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const URCHIN_PALETTE = [
  "0, 140, 107",
  "62, 178, 142",
  "0, 172, 168",
  "32, 154, 184",
  "52, 122, 196",
  "14, 104, 148",
];

function spawnPulseUrchin(force = false, headStart = 0) {
  if (
    !denizenField ||
    tunerPop("urchin") <= 0 ||
    document.querySelectorAll("#denizen-field .pool-urchin").length >= tunerCap("urchin", 3) ||
    (!force && tunerSharedCapBlocked("urchin", activeDenizens, 6))
  ) return;

  const urchin = document.createElement("i");
  urchin.className = "denizen pool-urchin";
  urchin.style.setProperty("--urchin-rgb", URCHIN_PALETTE[Math.floor(Math.random() * URCHIN_PALETTE.length)]);
  const size = 54 + Math.random() * 38;
  urchin.style.width = `${size.toFixed(0)}px`;
  urchin.style.height = `${size.toFixed(0)}px`;
  for (let index = 0; index < 16; index += 1) {
    const spine = document.createElement("b");
    spine.style.setProperty("--spine-angle", `${index * 22.5}deg`);
    spine.style.setProperty("--spine-length", `${44 + Math.random() * 20}%`);
    spine.style.setProperty("--spine-delay", `${(index % 4) * 45}ms`);
    urchin.append(spine);
  }

  const duration = 50000 + Math.random() * 22000;
  const headStartMs = duration * headStart;
  const fade = animateDenizen(
    urchin,
    [
      { opacity: 0 },
      { opacity: 0.72, offset: 0.12 },
      { opacity: 0.72, offset: 0.86 },
      { opacity: 0 },
    ],
    duration,
  );
  if (headStartMs) fade.currentTime = headStartMs;
  guidePulseUrchin(urchin, duration, size, headStartMs);
}

function guidePulseUrchin(urchin, duration, size, headStartMs = 0) {
  const startedAt = performance.now() - headStartMs;
  const direction = Math.random() > 0.5 ? 1 : -1;
  const startAngle = Math.random() * Math.PI * 2;
  const rotations = 1.35 + Math.random() * 0.35;
  const phaseX = Math.random() * Math.PI * 2;
  const phaseY = Math.random() * Math.PI * 2;
  let flowOffsetX = 0;
  let flowOffsetY = 0;
  let previousFrameAt = performance.now();

  const update = () => {
    if (!urchin.isConnected) return;
    const now = performance.now();
    const frameDelta = now - previousFrameAt;
    previousFrameAt = now;
    const progress = Math.min(1, (now - startedAt) / duration);
    const angle = startAngle + direction * progress * Math.PI * 2 * rotations;
    const exitProgress = Math.max(0, (progress - 0.82) / 0.18);
    const radiusScale = 1 + exitProgress * exitProgress * 1.45;
    const radiusX = window.innerWidth * 0.4 * radiusScale;
    const radiusY = window.innerHeight * 0.31 * radiusScale;
    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight * 0.5;
    const wanderX = Math.sin(progress * Math.PI * 7 + phaseX) * 24;
    const wanderY = Math.sin(progress * Math.PI * 9 + phaseY) * 18;
    const x = centerX + Math.cos(angle) * radiusX + wanderX;
    const y = centerY + Math.sin(angle) * radiusY + wanderY;
    let flowX = 0;
    let flowY = 0;
    let flowWeight = 0;

    nodes.forEach((node) => {
      if (!node.active) return; // inactive dots hold stale positions
      if (!Number.isFinite(node.previousX) || !Number.isFinite(node.previousY)) return;
      const distance = Math.hypot(node.x - x, node.y - y);
      if (distance > 210) return;
      const weight = Math.pow(1 - distance / 210, 2);
      flowX += ((node.x - node.previousX) / (NETWORK_PHYSICS_STEP / 1000)) * weight;
      flowY += ((node.y - node.previousY) / (NETWORK_PHYSICS_STEP / 1000)) * weight;
      flowWeight += weight;
    });

    if (flowWeight > 0) {
      flowX /= flowWeight;
      flowY /= flowWeight;
    }
    // 0.08 per 100ms step, scaled to actual frame time so drift feel matches the old cadence
    const flowEase = 1 - Math.pow(0.92, frameDelta / 100);
    flowOffsetX = lerp(flowOffsetX, Math.max(-20, Math.min(20, flowX * 0.1)), flowEase);
    flowOffsetY = lerp(flowOffsetY, Math.max(-20, Math.min(20, flowY * 0.1)), flowEase);
    const rotation = direction * progress * 540;
    urchin.style.transform = `translate3d(${(x - size * 0.5 + flowOffsetX).toFixed(2)}px,${(y - size * 0.5 + flowOffsetY).toFixed(2)}px,0) rotate(${rotation.toFixed(1)}deg)`;
    requestAnimationFrame(update);
  };
  update();
}

function spawnDotSchool(midPool = false) {
  if (!denizenField || tunerPop("school") <= 0 || tunerSharedCapBlocked("school", activeDenizens, 8)) return;
  if (activeDotSchools.size >= tunerCap("school", 3)) return;
  const school = document.createElement("i");
  school.className = "denizen dot-school";
  school.style.setProperty("--flock-color", energyColors[Math.floor(Math.random() * energyColors.length)]);
  const sizeRoll = Math.random();
  const fishCount = sizeRoll < 0.55
    ? 8 + Math.floor(Math.random() * 10)
    : sizeRoll < 0.85
      ? 18 + Math.floor(Math.random() * 10)
      : 28 + Math.floor(Math.random() * 3);
  const fromLeft = Math.random() > 0.5;
  const startX = midPool
    ? window.innerWidth * (0.22 + Math.random() * 0.56)
    : fromLeft ? -95 : window.innerWidth + 95;
  const startY = 100 + Math.random() * Math.max(100, window.innerHeight - 260);
  const travelAngle = fromLeft ? -0.18 + Math.random() * 0.36 : Math.PI + (-0.18 + Math.random() * 0.36);
  const currentSpeed = 22 + Math.random() * 14;
  const agents = [];
  for (let index = 0; index < fishCount; index += 1) {
    const fish = document.createElement("b");
    school.appendChild(fish);
    const theta = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());
    agents.push({
      element: fish,
      x: startX + Math.cos(theta) * radius * (34 + Math.random() * 26),
      y: startY + Math.sin(theta) * radius * (18 + Math.random() * 22),
      velocityX: Math.cos(travelAngle) * currentSpeed + (-7 + Math.random() * 14),
      velocityY: Math.sin(travelAngle) * currentSpeed + (-7 + Math.random() * 14),
      accelerationX: 0,
      accelerationY: 0,
      phase: Math.random() * Math.PI * 2,
      wiggleAmplitude: 1.8 + Math.random() * 3.4,
      wiggleRate: 0.004 + Math.random() * 0.005,
      turnAt: Infinity,
      neighborIndexes: new Int16Array(7),
      neighborDistances: new Float32Array(7),
    });
  }

  const started = performance.now();
  const state = {
    element: school,
    x: startX,
    y: startY,
    agents,
    started,
    lastTime: started,
    heading: travelAngle,
    turnAt: started + 1800 + Math.random() * 4200,
    turnHeading: travelAngle,
    regroupFrom: 0,
    regroupUntil: 0,
    forcedTurnHeading: null,
    forcedInitiatorIndex: -1,
    evadeCooldownUntil: 0,
    absorbed: false,
  };
  school.dotSchoolState = state;
  activeDotSchools.add(state);
  activeDenizens += 1;
  denizenField.appendChild(school);
  registerJerryGlow(school);

  function finish(absorbed = false) {
    if (state.absorbed) return;
    state.absorbed = true;
    if (absorbed) {
      school.classList.add("absorbed");
      triggerFeedingResponse();
    }
    window.setTimeout(() => school.remove(), absorbed ? 420 : 0);
    activeDenizens = Math.max(0, activeDenizens - 1);
    activeDotSchools.delete(state);
  }

  state.absorb = () => finish(true);
  function swim(now) {
    if (state.absorbed) return;
    const delta = Math.min(0.045, (now - state.lastTime) / 1000);
    state.lastTime = now;

    let centroidX = 0;
    let centroidY = 0;
    agents.forEach((agent) => {
      centroidX += agent.x;
      centroidY += agent.y;
    });
    centroidX /= agents.length;
    centroidY /= agents.length;
    state.x = centroidX;
    state.y = centroidY;

    const jerryX = cellMotion.position.x + cellMotion.drift.x;
    const jerryY = cellMotion.position.y + cellMotion.drift.y;
    const jerryDistance = Math.hypot(centroidX - jerryX, centroidY - jerryY);
    if (jerryDistance < 300 && now >= state.evadeCooldownUntil) {
      state.forcedTurnHeading = Math.atan2(centroidY - jerryY, centroidX - jerryX) + (-0.18 + Math.random() * 0.36);
      let nearestDistance = Infinity;
      agents.forEach((agent, index) => {
        const distance = Math.hypot(agent.x - jerryX, agent.y - jerryY);
        if (distance >= nearestDistance) return;
        nearestDistance = distance;
        state.forcedInitiatorIndex = index;
      });
      state.turnAt = now;
      state.evadeCooldownUntil = now + 2800 + Math.random() * 2200;
    }

    const neighborCellSize = 36;
    const neighborGrid = new Map();
    agents.forEach((agent, agentIndex) => {
      const cellX = Math.floor(agent.x / neighborCellSize);
      const cellY = Math.floor(agent.y / neighborCellSize);
      const key = `${cellX},${cellY}`;
      const bucket = neighborGrid.get(key);
      if (bucket) bucket.push(agentIndex);
      else neighborGrid.set(key, [agentIndex]);
    });

    agents.forEach((agent, agentIndex) => {
      agent.neighborIndexes.fill(-1);
      agent.neighborDistances.fill(Infinity);
      const cellX = Math.floor(agent.x / neighborCellSize);
      const cellY = Math.floor(agent.y / neighborCellSize);
      let foundNeighbors = 0;

      for (let ring = 0; ring <= 2 && foundNeighbors < 7; ring += 1) {
        for (let offsetY = -ring; offsetY <= ring; offsetY += 1) {
          for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
            if (ring > 0 && Math.abs(offsetX) !== ring && Math.abs(offsetY) !== ring) continue;
            const bucket = neighborGrid.get(`${cellX + offsetX},${cellY + offsetY}`);
            if (!bucket) continue;
            bucket.forEach((otherIndex) => {
              if (agentIndex === otherIndex) return;
              const other = agents[otherIndex];
              const dx = other.x - agent.x;
              const dy = other.y - agent.y;
              const distanceSquared = dx * dx + dy * dy;
              if (distanceSquared >= agent.neighborDistances[6]) return;
              let slot = 6;
              while (slot > 0 && distanceSquared < agent.neighborDistances[slot - 1]) {
                agent.neighborDistances[slot] = agent.neighborDistances[slot - 1];
                agent.neighborIndexes[slot] = agent.neighborIndexes[slot - 1];
                slot -= 1;
              }
              agent.neighborDistances[slot] = distanceSquared;
              agent.neighborIndexes[slot] = otherIndex;
            });
          }
        }
        foundNeighbors = agent.neighborIndexes.reduce((count, index) => count + (index >= 0 ? 1 : 0), 0);
      }
    });

    if (now >= state.turnAt) {
      const initiatorIndex = state.forcedInitiatorIndex >= 0
        ? state.forcedInitiatorIndex
        : Math.floor(Math.random() * agents.length);
      const turnDirection = Math.random() < 0.5 ? -1 : 1;
      const turnAmount = 0.65 + Math.random() * 1.55;
      state.turnHeading = state.forcedTurnHeading ?? state.heading + turnDirection * turnAmount;
      state.forcedTurnHeading = null;
      state.forcedInitiatorIndex = -1;
      const hopDelay = 220 + Math.random() * 180;
      const hops = new Int16Array(agents.length);
      hops.fill(-1);
      hops[initiatorIndex] = 0;
      const queue = [initiatorIndex];
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const sourceIndex = queue[cursor];
        const source = agents[sourceIndex];
        for (let slot = 0; slot < 3; slot += 1) {
          const neighborIndex = source.neighborIndexes[slot];
          if (neighborIndex < 0 || hops[neighborIndex] >= 0) continue;
          hops[neighborIndex] = hops[sourceIndex] + 1;
          queue.push(neighborIndex);
        }
        agents.forEach((candidate, candidateIndex) => {
          if (hops[candidateIndex] >= 0 || !candidate.neighborIndexes.slice(0, 3).includes(sourceIndex)) return;
          hops[candidateIndex] = hops[sourceIndex] + 1;
          queue.push(candidateIndex);
        });
      }
      const lastHop = Math.max(...hops);
      let latestTurnAt = now;
      agents.forEach((agent, index) => {
        const hop = hops[index] < 0 ? lastHop + 1 : hops[index];
        agent.turnAt = now + hop * hopDelay + Math.random() * hopDelay * 0.2;
        latestTurnAt = Math.max(latestTurnAt, agent.turnAt);
      });
      state.heading = state.turnHeading;
      state.regroupFrom = latestTurnAt;
      state.regroupUntil = latestTurnAt + 4500 + Math.random() * 2000;
      const intervalRoll = Math.random();
      const calmInterval = intervalRoll < 0.18
        ? 1200 + Math.random() * 1800
        : intervalRoll < 0.82
          ? 4000 + Math.random() * 6000
          : 10000 + Math.random() * 8000;
      state.turnAt = latestTurnAt + calmInterval;
    }

    agents.forEach((agent) => {
      let averageX = 0;
      let averageY = 0;
      let averageVelocityX = 0;
      let averageVelocityY = 0;
      let separationX = 0;
      let separationY = 0;
      let neighborCount = 0;
      for (let slot = 0; slot < 7; slot += 1) {
        const neighborIndex = agent.neighborIndexes[slot];
        if (neighborIndex < 0) continue;
        const neighbor = agents[neighborIndex];
        averageX += neighbor.x;
        averageY += neighbor.y;
        averageVelocityX += neighbor.velocityX;
        averageVelocityY += neighbor.velocityY;
        neighborCount += 1;
        const distanceSquared = agent.neighborDistances[slot];
        if (distanceSquared < 196) {
          const force = (196 - distanceSquared) / 196;
          separationX += (agent.x - neighbor.x) * force;
          separationY += (agent.y - neighbor.y) * force;
        }
      }
      if (neighborCount > 0) {
        averageX /= neighborCount;
        averageY /= neighborCount;
        averageVelocityX /= neighborCount;
        averageVelocityY /= neighborCount;
      } else {
        averageX = agent.x;
        averageY = agent.y;
        averageVelocityX = agent.velocityX;
        averageVelocityY = agent.velocityY;
      }

      const currentAngle = state.heading + Math.sin(now * 0.00034) * 0.12;
      const hasAdoptedTurn = now >= agent.turnAt;
      const intendedVelocityX = Math.cos(state.turnHeading) * 44;
      const intendedVelocityY = Math.sin(state.turnHeading) * 44;
      const swirlDirection = Math.sin(now * 0.0011 + agent.phase);
      const regroupProgress = Math.max(0, Math.min(1, (now - state.regroupFrom) / Math.max(1, state.regroupUntil - state.regroupFrom)));
      const regrouping = now < state.regroupFrom || now >= state.regroupUntil
        ? 0
        : Math.sin(regroupProgress * Math.PI);
      agent.accelerationX =
        (averageVelocityX - agent.velocityX) * (2.45 + regrouping * 1.5) +
        (averageX - agent.x) * (0.19 + regrouping * 0.36) +
        (centroidX - agent.x) * (0.035 + regrouping * 0.1) +
        separationX * (1.7 + regrouping * 2.2) +
        Math.cos(currentAngle) * 1.2 +
        (hasAdoptedTurn ? (intendedVelocityX - agent.velocityX) * 12 : 0) +
        -(agent.y - centroidY) * swirlDirection * 0.018;
      agent.accelerationY =
        (averageVelocityY - agent.velocityY) * (2.45 + regrouping * 1.5) +
        (averageY - agent.y) * (0.19 + regrouping * 0.36) +
        (centroidY - agent.y) * (0.035 + regrouping * 0.1) +
        separationY * (1.7 + regrouping * 2.2) +
        Math.sin(currentAngle) * 1.2 +
        (hasAdoptedTurn ? (intendedVelocityY - agent.velocityY) * 12 : 0) +
        (agent.x - centroidX) * swirlDirection * 0.018;
    });

    agents.forEach((agent) => {
      agent.velocityX += agent.accelerationX * delta;
      agent.velocityY += agent.accelerationY * delta;
      const speed = Math.hypot(agent.velocityX, agent.velocityY);
      const minimumSpeed = 15;
      const maximumSpeed = 54;
      if (speed > maximumSpeed) {
        agent.velocityX *= maximumSpeed / speed;
        agent.velocityY *= maximumSpeed / speed;
      } else if (speed < minimumSpeed) {
        agent.velocityX *= minimumSpeed / Math.max(0.1, speed);
        agent.velocityY *= minimumSpeed / Math.max(0.1, speed);
      }
      agent.x += agent.velocityX * delta;
      agent.y += agent.velocityY * delta;
      const angle = Math.atan2(agent.velocityY, agent.velocityX) * 180 / Math.PI;
      const displaySpeed = Math.max(1, Math.hypot(agent.velocityX, agent.velocityY));
      const wave = Math.sin(now * agent.wiggleRate + agent.phase) * agent.wiggleAmplitude;
      const displayX = agent.x - (agent.velocityY / displaySpeed) * wave;
      const displayY = agent.y + (agent.velocityX / displaySpeed) * wave;
      agent.element.style.transform = `translate3d(${displayX.toFixed(1)}px,${displayY.toFixed(1)}px,0) rotate(${angle.toFixed(1)}deg)`;
    });

    school.style.opacity = "0.72";
    if (centroidX < -180 || centroidX > window.innerWidth + 180 || centroidY < -150 || centroidY > window.innerHeight + 150) {
      finish();
      return;
    }
    requestAnimationFrame(swim);
  }
  requestAnimationFrame(swim);
}

function spawnJelly(headStart = 0) {
  if (!denizenField || tunerPop("jelly") <= 0 || tunerSharedCapBlocked("jelly", activeDenizens, 6)) return;
  const NS = "http://www.w3.org/2000/svg";
  const models = [
    { name: "moon", bell: "moon", width: 118, height: 225, bellY: 48, bellW: 90, bellH: 38, tentacles: 8, length: 104, amplitude: 7, cycles: 1.55, period: 4.8, contraction: 0.405, arms: 4 },
    { name: "nettle", bell: "dome", width: 104, height: 280, bellY: 55, bellW: 70, bellH: 58, tentacles: 6, length: 174, amplitude: 10, cycles: 2.1, period: 3.7, contraction: 0.51, arms: 4 },
    { name: "box", bell: "box", width: 112, height: 250, bellY: 54, bellW: 62, bellH: 65, tentacles: 4, length: 148, amplitude: 8, cycles: 1.8, period: 3.1, contraction: 0.45, arms: 0 },
  ];
  const model = models[nextJellyModel % models.length];
  nextJellyModel += 1;
  const jelly = document.createElementNS(NS, "svg");
  const scale = 0.55 + Math.random() * 0.9;
  jelly.classList.add("denizen", "pool-jelly", `jelly-${model.name}`);
  jelly.setAttribute("viewBox", `0 0 ${model.width} ${model.height}`);
  jelly.setAttribute("width", model.width * scale);
  jelly.setAttribute("height", model.height * scale);

  const bell = document.createElementNS(NS, "path");
  bell.classList.add("jelly-bell");
  bell.setAttribute("stroke-width", "1.25");
  jelly.append(bell);

  const detail = document.createElementNS(NS, "path");
  detail.classList.add("jelly-detail");
  detail.setAttribute("stroke-width", "1");
  jelly.append(detail);

  const tentacles = [];
  for (let index = 0; index < model.tentacles; index += 1) {
    const path = document.createElementNS(NS, "path");
    path.classList.add("jelly-tentacle");
    path.setAttribute("stroke-width", model.name === "box" ? "1.25" : index % 2 ? "0.75" : "1.05");
    jelly.append(path);
    tentacles.push(path);
  }

  const arms = [];
  for (let index = 0; index < model.arms; index += 1) {
    const path = document.createElementNS(NS, "path");
    path.classList.add("jelly-oral-arm");
    path.setAttribute("stroke-width", model.name === "moon" ? "3.4" : "2.4");
    jelly.append(path);
    arms.push(path);
  }

  const center = model.width / 2;
  const startX = 20 + Math.random() * Math.max(20, window.innerWidth - model.width * scale - 40);
  const drift = -65 + Math.random() * 130;
  const startY = window.innerHeight + model.height * scale * 0.35;
  const travel = window.innerHeight + model.height * scale + 180;
  const duration = 32000 + Math.random() * 16000;
  const opacity = 0.42 + Math.random() * 0.34;
  const born = performance.now() - duration * headStart;
  const phaseOffset = Math.random() * Math.PI * 2;
  let lastGeometryTime = -Infinity;
  denizenField.append(jelly);
  activeDenizens += 1;
  registerJerryGlow(jelly);

  function pulseAt(time) {
    const phase = ((time / (model.period * 1000)) + phaseOffset / (Math.PI * 2)) % 1;
    if (phase < 0.18) return Math.sin((phase / 0.18) * Math.PI * 0.5);
    if (phase < 0.78) return Math.cos(((phase - 0.18) / 0.6) * Math.PI * 0.5);
    return 0;
  }

  function bellPath(pulse) {
    const half = model.bellW * (0.5 - pulse * model.contraction * 0.24);
    const top = model.bellY - model.bellH * (0.58 + pulse * model.contraction * 0.38);
    const rim = model.bellY + model.bellH * (0.34 - pulse * model.contraction * 0.22);
    if (model.bell === "box") {
      const shoulder = half * (0.92 - pulse * 0.12);
      return `M ${center - half} ${rim} Q ${center - shoulder} ${top + 8} ${center - half * 0.58} ${top} Q ${center} ${top - 5} ${center + half * 0.58} ${top} Q ${center + shoulder} ${top + 8} ${center + half} ${rim} Q ${center + half * 0.5} ${rim + 8} ${center} ${rim + 4} Q ${center - half * 0.5} ${rim + 8} ${center - half} ${rim} Z`;
    }
    const crown = model.bell === "moon" ? top + model.bellH * 0.2 : top;
    const rimDip = rim + (model.bell === "moon" ? 7 : 4);
    return `M ${center - half} ${rim} C ${center - half * 0.94} ${crown + 8}, ${center - half * 0.55} ${crown}, ${center} ${crown} C ${center + half * 0.55} ${crown}, ${center + half * 0.94} ${crown + 8}, ${center + half} ${rim} Q ${center + half * 0.5} ${rimDip}, ${center} ${rim + 1} Q ${center - half * 0.5} ${rimDip}, ${center - half} ${rim} Z`;
  }

  function strandPath(rootX, rootY, length, amplitude, cycles, wavePhase, pulse, bias = 0) {
    let pathData = "";
    const segments = 18;
    for (let step = 0; step <= segments; step += 1) {
      const s = step / segments;
      const lag = s * cycles * Math.PI * 2;
      const envelope = Math.pow(s, 0.78);
      const recoil = pulse * (1 - s) * 5;
      const x = rootX + bias * s + Math.sin(wavePhase - lag) * amplitude * envelope;
      const y = rootY + length * s - recoil + Math.sin(wavePhase * 0.43 - lag * 0.34) * amplitude * 0.16 * envelope;
      pathData += `${step ? " L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return pathData;
  }

  function draw(now) {
    if (jelly.dataset.consumed === "true") return;
    const elapsed = now - born;
    const progress = elapsed / duration;
    if (progress >= 1) {
      jelly.remove();
      activeDenizens = Math.max(0, activeDenizens - 1);
      return;
    }
    const pulse = pulseAt(now);
    if (now - lastGeometryTime >= 1000 / 30) {
      lastGeometryTime = now;
      const bellBottom = model.bellY + model.bellH * (0.34 - pulse * model.contraction * 0.22);
      const wavePhase = now * 0.0032;
      bell.setAttribute("d", bellPath(pulse));
      detail.setAttribute("d", `M ${center - model.bellW * 0.24} ${bellBottom - 2} Q ${center} ${model.bellY - model.bellH * 0.42} ${center + model.bellW * 0.24} ${bellBottom - 2}`);

      tentacles.forEach((path, index) => {
        const spread = model.bellW * (model.name === "box" ? 0.34 : 0.42);
        const rootX = model.tentacles === 1 ? center : center - spread + (spread * 2 * index) / (model.tentacles - 1);
        const individualPhase = wavePhase + index * 0.71;
        const length = model.length * (0.82 + (index % 3) * 0.09);
        const bias = Math.sin(index * 2.1 + phaseOffset) * 6;
        path.setAttribute("d", strandPath(rootX, bellBottom + 2, length, model.amplitude * (0.82 + (index % 2) * 0.22), model.cycles, individualPhase, pulse, bias));
      });
      arms.forEach((path, index) => {
        const rootX = center + (index - (model.arms - 1) / 2) * (model.bellW * 0.13);
        path.setAttribute("d", strandPath(rootX, bellBottom + 1, model.length * 0.55, model.amplitude * 0.58, model.cycles * 0.68, wavePhase * 0.82 + index * 1.17, pulse, (index - 1.5) * 2));
      });
    }

    const contractionKick = pulse * 13 * scale;
    const y = startY - travel * progress - contractionKick;
    const x = startX + drift * progress + Math.sin(progress * Math.PI * 3 + phaseOffset) * 13;
    const fade = Math.min(1, progress / 0.1, (1 - progress) / 0.12);
    const tilt = Math.sin(progress * Math.PI * 2 + phaseOffset) * 4;
    jelly.style.opacity = `${opacity * fade}`;
    jelly.style.transform = `translate3d(${x}px,${y}px,0) rotate(${tilt}deg)`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// Lantern colony layer manifest — inlined from tmp/jerrys-pool-denizens/renders/layers/manifest.json
// (regenerated by render_colony_layers.py; inline because worlds can't fetch() on file://).
// Each bulb layer is a crop of the shared 1600x760 colony frame; x/y/w/h place the crop inside
// the colony box, cx/cy is the bulb's center (frame fractions, top-left origin) for the tether.
const LANTERN_FRAME_W = 1600;
const LANTERN_FRAME_H = 760;
const LANTERN_BULB_LAYERS = [
  { x: 0.0525, y: 0.2658, w: 0.1381, h: 0.4947, cx: 0.1304, cy: 0.3938 },
  { x: 0.1106, y: 0.2289, w: 0.1444, h: 0.4697, cx: 0.1976, cy: 0.3508 },
  { x: 0.2106, y: 0.2118, w: 0.1088, h: 0.4816, cx: 0.2648, cy: 0.3273 },
  { x: 0.2481, y: 0.2197, w: 0.1356, h: 0.4605, cx: 0.332, cy: 0.3288 },
  { x: 0.3312, y: 0.2526, w: 0.1275, h: 0.375, cx: 0.3992, cy: 0.3556 },
  { x: 0.3838, y: 0.3066, w: 0.1281, h: 0.3711, cx: 0.4664, cy: 0.4029 },
  { x: 0.4912, y: 0.3711, w: 0.085, h: 0.3566, cx: 0.5336, cy: 0.4615 },
  { x: 0.5612, y: 0.4368, w: 0.0881, h: 0.3539, cx: 0.6008, cy: 0.5202 },
  { x: 0.6056, y: 0.4895, w: 0.1169, h: 0.3118, cx: 0.668, cy: 0.5674 },
  { x: 0.6625, y: 0.5237, w: 0.1088, h: 0.3132, cx: 0.7352, cy: 0.5942 },
  { x: 0.7719, y: 0.5303, w: 0.1013, h: 0.2789, cx: 0.8024, cy: 0.5957 },
  { x: 0.8419, y: 0.5132, w: 0.0881, h: 0.2776, cx: 0.8696, cy: 0.5722 },
];
const LANTERN_TETHER_ENDS = {
  head: { dx: -0.0815, dy: -0.0229 },
  tail: { dx: 0.0598, dy: 0.0275 },
};

function spawnLanternColony(force = false) {
  if (!denizenField || tunerPop("colony") <= 0) return;
  if (document.querySelectorAll("#denizen-field .lantern-colony").length >= tunerCap("colony", 2)) return;
  if (!force && tunerSharedCapBlocked("colony", activeDenizens, 6)) return;
  const colony = document.createElement("div");
  colony.className = "denizen lantern-colony";
  const depth = Math.random();
  const width = 120 + depth * 110;
  const height = width * (LANTERN_FRAME_H / LANTERN_FRAME_W);
  colony.style.width = `${width.toFixed(1)}px`;
  colony.style.height = `${height.toFixed(1)}px`;
  colony.style.filter = `blur(${((1 - depth) * 2.6).toFixed(1)}px) brightness(${(0.6 + depth * 0.4).toFixed(2)}) saturate(${(0.78 + depth * 0.3).toFixed(2)})`;

  // live tether: SVG path redrawn each frame through the bulbs' wave-displaced centers
  const svgNS = "http://www.w3.org/2000/svg";
  const tether = document.createElementNS(svgNS, "svg");
  tether.setAttribute("class", "lantern-tether");
  tether.setAttribute("viewBox", `0 0 ${LANTERN_FRAME_W} ${LANTERN_FRAME_H}`);
  tether.setAttribute("preserveAspectRatio", "none");
  const tetherGlow = document.createElementNS(svgNS, "path");
  tetherGlow.setAttribute("fill", "none");
  tetherGlow.setAttribute("stroke", "rgba(64, 230, 217, 0.24)");
  tetherGlow.setAttribute("stroke-width", "13");
  tetherGlow.setAttribute("stroke-linecap", "round");
  const tetherCore = document.createElementNS(svgNS, "path");
  tetherCore.setAttribute("fill", "none");
  tetherCore.setAttribute("stroke", "rgba(64, 230, 217, 0.72)");
  tetherCore.setAttribute("stroke-width", "4.5");
  tetherCore.setAttribute("stroke-linecap", "round");
  tether.append(tetherGlow, tetherCore);
  colony.append(tether);

  const bulbs = LANTERN_BULB_LAYERS.map((layer, i) => {
    const img = document.createElement("img");
    img.className = "lantern-bulb";
    img.src = `./lantern-colony/bulb-${String(i).padStart(2, "0")}.png`;
    img.alt = "";
    img.style.left = `${(layer.x * 100).toFixed(2)}%`;
    img.style.top = `${(layer.y * 100).toFixed(2)}%`;
    img.style.width = `${(layer.w * 100).toFixed(2)}%`;
    colony.append(img);
    return img;
  });

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -width - 80 : window.innerWidth + 80;
  const endX = fromLeft ? window.innerWidth + 80 : -width - 80;
  const baseY = window.innerHeight * (0.06 + Math.random() * 0.44);
  const swayPhase = Math.random() * Math.PI * 2;
  const swayAmplitude = 9 + depth * 7; // gentle whole-body drift; the real motion is the bulb wave
  const flip = fromLeft ? -1 : 1; // head bulb is on the sprite's left; drift head-first
  const opacity = 0.68 + depth * 0.28;
  const steps = 48;
  const frames = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = startX + (endX - startX) * t;
    const y = baseY + Math.sin(t * Math.PI * 3 + swayPhase) * swayAmplitude;
    const tilt = Math.sin(t * Math.PI * 3 + swayPhase - Math.PI * 0.5) * 1.6 * flip;
    frames.push({
      offset: t,
      opacity: step === 0 || step === steps ? 0 : opacity,
      transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${tilt.toFixed(2)}deg) scaleX(${flip})`,
    });
  }
  animateDenizen(colony, frames, 46000 + Math.random() * 22000);

  // traveling wave head -> tail: one full sine cycle per 6 bulbs, so ~2 cycles ride the body;
  // each bulb lags the one ahead of it and the tether follows.
  const wavePeriod = 2400 + Math.random() * 900;
  const waveStartPhase = Math.random() * Math.PI * 2;
  const waveAmp = height * 0.08;
  const phaseStep = (Math.PI * 2) / 6;
  const frameYPerPx = LANTERN_FRAME_H / height;
  const points = new Array(LANTERN_BULB_LAYERS.length + 2);
  let waveSkip = false;
  const drawWave = (now) => {
    if (!colony.isConnected) return;
    // 30 fps is invisible on a 2.4-3.3 s wave and halves the tether rebuilds
    waveSkip = !waveSkip;
    if (waveSkip) {
      window.requestAnimationFrame(drawWave);
      return;
    }
    const phase = waveStartPhase + (now / wavePeriod) * Math.PI * 2;
    for (let i = 0; i < bulbs.length; i += 1) {
      const wave = Math.sin(phase - i * phaseStep);
      const dy = wave * waveAmp;
      bulbs[i].style.transform = `translate3d(0,${dy.toFixed(2)}px,0)`;
      bulbs[i].style.opacity = (0.9 + wave * 0.1).toFixed(3);
      const layer = LANTERN_BULB_LAYERS[i];
      points[i + 1] = [layer.cx * LANTERN_FRAME_W, layer.cy * LANTERN_FRAME_H + dy * frameYPerPx];
    }
    const head = points[1];
    const tail = points[points.length - 2];
    points[0] = [head[0] + LANTERN_TETHER_ENDS.head.dx * LANTERN_FRAME_W, head[1] + LANTERN_TETHER_ENDS.head.dy * LANTERN_FRAME_H];
    points[points.length - 1] = [tail[0] + LANTERN_TETHER_ENDS.tail.dx * LANTERN_FRAME_W, tail[1] + LANTERN_TETHER_ENDS.tail.dy * LANTERN_FRAME_H];
    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i += 1) {
      const midX = (points[i][0] + points[i + 1][0]) / 2;
      const midY = (points[i][1] + points[i + 1][1]) / 2;
      d += ` Q ${points[i][0].toFixed(1)} ${points[i][1].toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
    tetherGlow.setAttribute("d", d);
    tetherCore.setAttribute("d", d);
    window.requestAnimationFrame(drawWave);
  };
  window.requestAnimationFrame(drawWave);
}

// Vent walker layer manifest — inlined from tmp/jerrys-pool-denizens/renders/walker-layers/manifest.json
// (regenerated by render_walker_layers.py; inline because worlds can't fetch() on file://).
// Crops of the shared 1100x1300 walker frame, fractions with top-left origin. Legs carry their hip
// anchor (rotation pivot); pores 2-3 are fully occluded by the body holdout and have no layer.
// vent = smoke mouth. The baked plume is gone from body.png — site.js spawns live puffs instead.
const WALKER_FRAME_W = 1100;
const WALKER_FRAME_H = 1300;
const WALKER_VENT = { x: 0.4907, y: 0.265 };
const WALKER_BODY_LAYER = { x: 0.26, y: 0.2208, w: 0.45, h: 0.3846 };
const WALKER_LEG_LAYERS = [
  { src: "leg-1", x: 0.0, y: 0.3308, w: 0.2873, h: 0.4308, hip: { x: 0.3753, y: 0.5157 } },
  { src: "leg-2", x: 0.4645, y: 0.3308, w: 0.0491, h: 0.4308, hip: { x: 0.4907, y: 0.5157 } },
  { src: "leg-0", x: 0.6855, y: 0.3308, w: 0.3018, h: 0.4308, hip: { x: 0.6062, y: 0.5157 } },
];
const WALKER_PORE_LAYERS = [
  { src: "pore-0", x: 0.6855, y: 0.4277, w: 0.0691, h: 0.09 },
  { src: "pore-1", x: 0.6591, y: 0.4869, w: 0.05, h: 0.0631 },
  { src: "pore-4", x: 0.2564, y: 0.4885, w: 0.0682, h: 0.0646 },
  { src: "pore-5", x: 0.2545, y: 0.49, w: 0.0882, h: 0.0738 },
  { src: "pore-6", x: 0.3327, y: 0.4346, w: 0.1045, h: 0.09 },
  { src: "pore-7", x: 0.5055, y: 0.4792, w: 0.0864, h: 0.0723 },
  { src: "pore-8", x: 0.6009, y: 0.4315, w: 0.1009, h: 0.0954 },
];
const WALKER_PUFF_LAYERS = [
  { src: "puff-0", w: 0.0827, h: 0.0708 },
  { src: "puff-1", w: 0.1327, h: 0.1154 },
  { src: "puff-2", w: 0.1873, h: 0.1462 },
];

function spawnVentWalker(force = false) {
  if (!denizenField || tunerPop("walker") <= 0) return;
  if (document.querySelectorAll("#denizen-field .vent-walker").length >= tunerCap("walker", 1)) return;
  if (!force && tunerSharedCapBlocked("walker", activeDenizens, 6)) return;
  const walker = document.createElement("div");
  walker.className = "denizen vent-walker";
  const depth = Math.random();
  const height = 120 + depth * 105;
  const width = height * (WALKER_FRAME_W / WALKER_FRAME_H);
  walker.style.height = `${height.toFixed(1)}px`;
  walker.style.width = `${width.toFixed(1)}px`;
  walker.style.filter = `blur(${((1 - depth) * 3).toFixed(1)}px) brightness(${(0.5 + depth * 0.5).toFixed(2)}) saturate(${(0.74 + depth * 0.34).toFixed(2)})`;

  // rig wraps every layer; rAF bobs/sways it in sync with the gait while WAAPI owns the crossing
  const rig = document.createElement("div");
  rig.className = "walker-layer rig-anim";
  rig.style.left = "0";
  rig.style.top = "0";
  rig.style.width = "100%";
  rig.style.height = "100%";
  walker.append(rig);

  const addLayer = (layer) => {
    const img = document.createElement("img");
    img.className = "walker-layer";
    img.src = `./vent-walker/${layer.src || "body"}.png`;
    img.alt = "";
    img.style.left = `${(layer.x * 100).toFixed(2)}%`;
    img.style.top = `${(layer.y * 100).toFixed(2)}%`;
    img.style.width = `${(layer.w * 100).toFixed(2)}%`;
    rig.append(img);
    return img;
  };

  // legs first (body holdout already cut their hidden parts), then body, then pores on top
  const legs = WALKER_LEG_LAYERS.map((layer) => {
    const img = addLayer(layer);
    img.classList.add("rig-anim");
    const ox = ((layer.hip.x - layer.x) / layer.w) * 100;
    const oy = ((layer.hip.y - layer.y) / layer.h) * 100;
    img.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
    return img;
  });
  addLayer(WALKER_BODY_LAYER);
  const pores = WALKER_PORE_LAYERS.map((layer) => {
    const img = addLayer(layer);
    img.classList.add("rig-anim");
    return { img, period: 1400 + Math.random() * 1800, phase: Math.random() * Math.PI * 2 };
  });

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -width - 60 : window.innerWidth + 60;
  const endX = fromLeft ? window.innerWidth + 60 : -width - 60;
  const footY = window.innerHeight - height * 0.64 - (10 + (1 - depth) * 46);
  const flip = fromLeft ? -1 : 1; // sprite's smoke trails right; mirror so it trails the walk
  const opacity = 0.62 + depth * 0.34;
  const duration = 68000 + Math.random() * 24000;
  const frames = [
    { offset: 0, opacity: 0, transform: `translate3d(${startX.toFixed(1)}px,${footY.toFixed(1)}px,0) scaleX(${flip})` },
    { offset: 0.04, opacity, transform: `translate3d(${(startX + (endX - startX) * 0.04).toFixed(1)}px,${footY.toFixed(1)}px,0) scaleX(${flip})` },
    { offset: 0.96, opacity, transform: `translate3d(${(startX + (endX - startX) * 0.96).toFixed(1)}px,${footY.toFixed(1)}px,0) scaleX(${flip})` },
    { offset: 1, opacity: 0, transform: `translate3d(${endX.toFixed(1)}px,${footY.toFixed(1)}px,0) scaleX(${flip})` },
  ];
  animateDenizen(walker, frames, duration);

  // shambling tripod gait: legs step in staggered thirds with a bold hip swing, lifting on the
  // forward sweep. A second harmonic with per-leg jitter keeps the strides uneven, and the rig
  // lurches forward and rolls with each step so the legs read as driving the body.
  const gaitStart = performance.now();
  const gaitPeriod = 4000 + Math.random() * 1200;
  const swingDeg = 13;
  const liftPx = height * 0.03;
  const bobPx = height * 0.028;
  const lurchPx = height * 0.013;
  const legJitter = legs.map(() => Math.random() * Math.PI * 2);
  let gaitSkip = false;
  const drawGait = (now) => {
    if (!walker.isConnected) return;
    // 30 fps is invisible on a multi-second gait and pore shimmer
    gaitSkip = !gaitSkip;
    if (gaitSkip) {
      window.requestAnimationFrame(drawGait);
      return;
    }
    const ph = ((now - gaitStart) / gaitPeriod) * Math.PI * 2;
    for (let i = 0; i < legs.length; i += 1) {
      const legPh = ph - (i * Math.PI * 2) / 3;
      const shamble = 0.72 * Math.sin(legPh) + 0.28 * Math.sin(legPh * 2 + legJitter[i]);
      const swing = shamble * swingDeg;
      const lift = Math.max(0, Math.cos(legPh)) * liftPx;
      legs[i].style.transform = `translate3d(0,${(-lift).toFixed(2)}px,0) rotate(${swing.toFixed(2)}deg)`;
    }
    const bob = Math.abs(Math.sin(ph * 1.5)) * bobPx;
    const sway = Math.sin(ph * 1.5) * 1.9;
    const lurch = Math.sin(ph * 3) * -lurchPx; // sprite -x is forward; surge with each step
    rig.style.transform = `translate3d(${lurch.toFixed(2)}px,${(-bob).toFixed(2)}px,0) rotate(${sway.toFixed(2)}deg)`;
    for (const pore of pores) {
      pore.img.style.opacity = (0.6 + 0.4 * Math.sin((now / pore.period) * Math.PI * 2 + pore.phase)).toFixed(3);
    }
    window.requestAnimationFrame(drawGait);
  };
  window.requestAnimationFrame(drawGait);

  // vent smoke: short-lived puffs born at the mouth; they rise a little past where the baked
  // plume used to top out, drift toward the trailing side, swell, and are gone — self-contained.
  const spawnPuff = () => {
    if (!walker.isConnected) return;
    // spawn runs on the timer clock but puff animations run on the document timeline, which
    // stalls in hidden tabs — cap concurrency and add a timer-based removal fallback so puffs
    // can never pile up while the page isn't rendering.
    if (rig.querySelectorAll(".walker-puff").length < 7) {
      const variant = WALKER_PUFF_LAYERS[Math.floor(Math.random() * WALKER_PUFF_LAYERS.length)];
      const scale = 0.75 + Math.random() * 0.5;
      const puff = document.createElement("img");
      puff.className = "walker-puff";
      puff.src = `./vent-walker/${variant.src}.png`;
      puff.alt = "";
      puff.style.width = `${(variant.w * scale * 100).toFixed(2)}%`;
      puff.style.left = `${((WALKER_VENT.x - (variant.w * scale) / 2) * 100).toFixed(2)}%`;
      puff.style.top = `${((WALKER_VENT.y - (variant.h * scale) / 2) * 100).toFixed(2)}%`;
      rig.append(puff);
      const rise = height * (0.27 + Math.random() * 0.07);
      const drift = width * (0.06 + Math.random() * 0.08); // sprite +x = trailing side
      const life = 3000 + Math.random() * 1200;
      const puffAnim = puff.animate(
        [
          { transform: "translate3d(0,0,0) scale(0.5)", opacity: 0 },
          { opacity: 0.85, offset: 0.22 },
          { transform: `translate3d(${(drift * 0.55).toFixed(1)}px,${(-rise * 0.62).toFixed(1)}px,0) scale(0.9)`, opacity: 0.55, offset: 0.62 },
          { transform: `translate3d(${drift.toFixed(1)}px,${(-rise).toFixed(1)}px,0) scale(1.18)`, opacity: 0 },
        ],
        { duration: life, easing: "ease-out" },
      );
      const puffTtl = window.setTimeout(() => puff.remove(), life + 800);
      puffAnim.finished.finally(() => {
        window.clearTimeout(puffTtl);
        puff.remove();
      });
    }
    window.setTimeout(spawnPuff, 650 + Math.random() * 750);
  };
  window.setTimeout(spawnPuff, 400 + Math.random() * 400);
}

// ---------------------------------------------------------------------------
// Wave-2 layered denizens: lure gulper, fan dancer, barrel drifter.
// Sprites live in ./gulper/, ./fan-dancer/, ./barrel-drifter/ (Blender layer
// renders from tmp/jerrys-pool-denizens/denizens2.blend). Manifests are inlined
// because worlds can't fetch() on file://. All fractions are of the creature's
// render frame, top-left origin; anchors are rotation pivots.

function buildLayerRig(container) {
  const rig = document.createElement("div");
  rig.className = "rig-layer rig-anim";
  rig.style.left = "0";
  rig.style.top = "0";
  rig.style.width = "100%";
  rig.style.height = "100%";
  container.append(rig);
  const addLayer = (folder, name, layer) => {
    const img = document.createElement("img");
    img.className = "rig-layer";
    img.src = `./${folder}/${name}.png`;
    img.alt = "";
    img.style.left = `${(layer.x * 100).toFixed(2)}%`;
    img.style.top = `${(layer.y * 100).toFixed(2)}%`;
    img.style.width = `${(layer.w * 100).toFixed(2)}%`;
    rig.append(img);
    return img;
  };
  return { rig, addLayer };
}

function setRigPivot(img, layer, anchor) {
  const ox = ((anchor.x - layer.x) / layer.w) * 100;
  const oy = ((anchor.y - layer.y) / layer.h) * 100;
  img.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
}

// Jerry proximity glow: registered denizens ease up to +85% brightness as
// Jerry nears (0 beyond GLOW_RANGE px from his edge, max at contact, measured
// silhouette to silhouette). One shared rAF ticker drives every glower; when
// other code rewrites an element's filter (fed amoebas, alien fish), the new
// value is adopted as the base and the boost rides on top of it.
const GLOW_RANGE = 260;
const GLOW_BOOST = 0.85;
const jerryGlowEntries = new Set();
let jerryGlowTicking = false;
let jerryGlowFrame = 0;
let jerryGlowSlot = 0;
let jerryRadiusCache = 90;
let jerryRadiusCachedAt = -Infinity;

function registerJerryGlow(el) {
  jerryGlowEntries.add({
    el,
    glow: 0,
    target: 0,
    slot: (jerryGlowSlot += 1) % 3,
    base: el.style.filter,
    lastWritten: el.style.filter,
  });
  if (!jerryGlowTicking) {
    jerryGlowTicking = true;
    window.requestAnimationFrame(jerryGlowTick);
  }
}

function jerryGlowTick() {
  if (!jerryGlowEntries.size) {
    jerryGlowTicking = false;
    return;
  }
  jerryGlowFrame += 1;
  const jerryReady = typeof cellMotion !== "undefined" && cellMotion;
  const jx = jerryReady ? cellMotion.position.x + cellMotion.drift.x : 0;
  const jy = jerryReady ? cellMotion.position.y + cellMotion.drift.y : 0;
  const now = performance.now();
  if (now - jerryRadiusCachedAt > 250) {
    jerryRadiusCache = (orb?.getBoundingClientRect().width || 180) / 2;
    jerryRadiusCachedAt = now;
  }
  for (const entry of jerryGlowEntries) {
    const el = entry.el;
    if (!el.isConnected) {
      jerryGlowEntries.delete(entry);
      continue;
    }
    const current = el.style.filter;
    if (current !== entry.lastWritten) entry.base = current;
    // proximity re-measured every third frame per entry (layout query is the
    // expensive part); easing still advances every frame
    if (jerryGlowFrame % 3 === entry.slot) {
      entry.target = 0;
      if (jerryReady) {
        const b = el.getBoundingClientRect();
        if (b.width) {
          const gap = Math.hypot(b.left + b.width / 2 - jx, b.top + b.height / 2 - jy)
            - jerryRadiusCache - Math.max(b.width, b.height) / 2;
          if (gap < GLOW_RANGE) entry.target = 1 - Math.max(0, gap) / GLOW_RANGE;
        }
      }
    }
    entry.glow += (entry.target - entry.glow) * 0.07;
    // boost quantized to 0.02 steps so a near-steady glow stops rewriting the
    // filter (each write re-rasterizes the element's blur); String() matches
    // the style engine's minimal number serialization, unlike toFixed
    const boost = Math.round((1 + GLOW_BOOST * entry.glow) * 50) / 50;
    const next = entry.glow > 0.01 && boost > 1
      ? `${entry.base} brightness(${String(boost)})`.trim()
      : entry.base;
    if (next !== current) el.style.filter = next;
    // store the browser's serialization, not our string — the style engine
    // normalizes numbers and a mismatch would make the next tick adopt our
    // own boosted value as the new base
    entry.lastWritten = el.style.filter;
  }
  window.requestAnimationFrame(jerryGlowTick);
}

// ----------------------------------------------------------- lure gulper
const GULPER_LAYERS = {
  body: { x: 0.188, y: 0.3311, w: 0.584, h: 0.4933 },
  jaw: { x: 0.096, y: 0.6233, w: 0.181, h: 0.1311 },
  finPect: { x: 0.541, y: 0.74, w: 0.145, h: 0.1456 },
  finTail: { x: 0.741, y: 0.4256, w: 0.159, h: 0.3256 },
  lure: { x: 0.209, y: 0.1767, w: 0.239, h: 0.1933 },
  lureHalo: { x: 0.17, y: 0.1322, w: 0.138, h: 0.1544 },
};
const GULPER_ANCHORS = {
  jawHinge: { x: 0.3295, y: 0.7146 },
  lureBase: { x: 0.4545, y: 0.3864 },
  finPectRoot: { x: 0.5795, y: 0.7702 },
  finTailRoot: { x: 0.75, y: 0.5884 },
};

function spawnGulper(force = false) {
  if (!denizenField || tunerPop("gulper") <= 0) return;
  if (document.querySelectorAll("#denizen-field .pool-gulper").length >= tunerCap("gulper", 1)) return;
  if (!force && tunerSharedCapBlocked("gulper", activeDenizens, 6)) return;
  const fish = document.createElement("div");
  fish.className = "denizen pool-gulper";
  const depth = Math.random();
  const height = 90 + depth * 80;
  const width = height * (1000 / 900);
  fish.style.height = `${height.toFixed(1)}px`;
  fish.style.width = `${width.toFixed(1)}px`;
  fish.style.filter = `blur(${((1 - depth) * 2.6).toFixed(1)}px) brightness(${(0.55 + depth * 0.45).toFixed(2)}) saturate(${(0.78 + depth * 0.3).toFixed(2)})`;

  const { rig, addLayer } = buildLayerRig(fish);
  const finTail = addLayer("gulper", "fin-tail", GULPER_LAYERS.finTail);
  setRigPivot(finTail, GULPER_LAYERS.finTail, GULPER_ANCHORS.finTailRoot);
  const finPect = addLayer("gulper", "fin-pect", GULPER_LAYERS.finPect);
  setRigPivot(finPect, GULPER_LAYERS.finPect, GULPER_ANCHORS.finPectRoot);
  const jaw = addLayer("gulper", "jaw", GULPER_LAYERS.jaw);
  setRigPivot(jaw, GULPER_LAYERS.jaw, GULPER_ANCHORS.jawHinge);
  const lure = addLayer("gulper", "lure", GULPER_LAYERS.lure);
  setRigPivot(lure, GULPER_LAYERS.lure, GULPER_ANCHORS.lureBase);
  addLayer("gulper", "body", GULPER_LAYERS.body);
  const lureHalo = addLayer("gulper", "lure-halo", GULPER_LAYERS.lureHalo);
  setRigPivot(lureHalo, GULPER_LAYERS.lureHalo, GULPER_ANCHORS.lureBase);
  [finTail, finPect, jaw, lure, lureHalo].forEach((img) => img.classList.add("rig-anim"));

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -width - 60 : window.innerWidth + 60;
  const endX = fromLeft ? window.innerWidth + 60 : -width - 60;
  const flip = fromLeft ? -1 : 1; // sprite faces -x (left); mirror so the jaw leads when swimming right
  const opacity = 0.6 + depth * 0.36;
  const duration = 30000 + Math.random() * 14000;

  // lurk-and-surge patrol of the lower pool: mostly slow drift broken by two
  // or three glide bursts, meandering vertically, nose pitched along the path.
  const surges = [];
  const surgeCount = 2 + Math.floor(Math.random() * 2);
  for (let s = 0; s < surgeCount; s += 1) {
    surges.push({ c: 0.15 + Math.random() * 0.7, w: 0.05 + Math.random() * 0.05 });
  }
  const surgeEnv = (frac) => {
    let e = 0;
    for (const s of surges) e += Math.exp(-(((frac - s.c) / s.w) ** 2));
    return Math.min(e, 1.2);
  };
  const yBase = window.innerHeight * (0.56 + Math.random() * 0.2);
  const meander = [
    { amp: window.innerHeight * (0.03 + Math.random() * 0.04), cyc: 1.5 + Math.random(), ph: Math.random() * Math.PI * 2 },
    { amp: window.innerHeight * (0.015 + Math.random() * 0.02), cyc: 3 + Math.random() * 2, ph: Math.random() * Math.PI * 2 },
  ];
  const yAt = (frac) => {
    let yy = yBase;
    for (const m of meander) yy += m.amp * Math.sin(frac * Math.PI * 2 * m.cyc + m.ph);
    return Math.min(Math.max(yy, window.innerHeight * 0.5), window.innerHeight * 0.82);
  };
  const samples = 120;
  const speeds = [];
  let total = 0;
  for (let k = 0; k <= samples; k += 1) {
    speeds.push(0.22 + 1.1 * surgeEnv(k / samples));
    total += speeds[k];
  }
  const frames = [];
  let cum = 0;
  for (let k = 0; k <= samples; k += 1) {
    const frac = k / samples;
    const x = startX + (endX - startX) * (cum / total);
    cum += speeds[k];
    const stepDx = Math.abs(endX - startX) * (speeds[k] / total);
    const stepDy = yAt(Math.min(frac + 1 / samples, 1)) - yAt(frac);
    const pitch = Math.max(-14, Math.min(14, Math.atan2(stepDy, stepDx) * (180 / Math.PI) * 0.6));
    const rot = -flip * pitch; // flip mirrors rotation direction; nose follows the slope either way
    let alpha = opacity;
    if (frac < 0.05) alpha = opacity * (frac / 0.05);
    if (frac > 0.95) alpha = opacity * ((1 - frac) / 0.05);
    frames.push({
      offset: frac,
      opacity: alpha,
      transform: `translate3d(${x.toFixed(1)}px,${yAt(frac).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scaleX(${flip})`,
    });
  }
  animateDenizen(fish, frames, duration);

  // tail beat (harder and faster mid-surge), pectoral scull, bobbing lure with
  // pulsing halo, and an occasional quick jaw snap; gentle bob on the rig.
  const t0 = performance.now();
  let nextSnap = t0 + 3500 + Math.random() * 5000;
  let snapStart = -1;
  let tailPhase = 0;
  let prevTick = t0;
  const draw = (now) => {
    if (!fish.isConnected) return;
    const t = (now - t0) / 1000;
    const env = Math.min(surgeEnv(Math.min((now - t0) / duration, 1)), 1);
    tailPhase += ((now - prevTick) / 1000) * ((Math.PI * 2) / 1.6) * (0.75 + 1.6 * env);
    prevTick = now;
    finTail.style.transform = `rotate(${(Math.sin(tailPhase) * (9 + 8 * env)).toFixed(2)}deg)`;
    finPect.style.transform = `rotate(${(Math.sin(t * (Math.PI * 2) / 2.7 + 1.1) * 13).toFixed(2)}deg)`;
    const lureRot = Math.sin(t * (Math.PI * 2) / 3.8) * 7;
    lure.style.transform = `rotate(${lureRot.toFixed(2)}deg)`;
    lureHalo.style.transform = `rotate(${lureRot.toFixed(2)}deg)`;
    lureHalo.style.opacity = (0.55 + 0.45 * Math.sin(t * (Math.PI * 2) / 2.1)).toFixed(3);
    if (snapStart < 0 && now >= nextSnap) snapStart = now;
    let jawDeg = 0;
    if (snapStart >= 0) {
      const s = now - snapStart;
      if (s < 260) jawDeg = -15 * (s / 260);
      else if (s < 500) jawDeg = -15;
      else if (s < 920) jawDeg = -15 * (1 - (s - 500) / 420);
      else {
        snapStart = -1;
        nextSnap = now + 6000 + Math.random() * 5000;
      }
    }
    jaw.style.transform = `rotate(${jawDeg.toFixed(2)}deg)`;
    rig.style.transform = `translate3d(0,${(Math.sin(t * (Math.PI * 2) / 5.2) * height * 0.03).toFixed(2)}px,0)`;
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);
}

// ----------------------------------------------------------- fan dancer
const FAN_DISC = { x: 0.427, y: 0.429, w: 0.145, h: 0.142 };
const FAN_ARMS = [
  { x: 0.556, y: 0.424, w: 0.354, h: 0.119 },
  { x: 0.534, y: 0.201, w: 0.263, h: 0.278 },
  { x: 0.489, y: 0.088, w: 0.092, h: 0.367 },
  { x: 0.305, y: 0.127, w: 0.195, h: 0.33 },
  { x: 0.129, y: 0.302, w: 0.337, h: 0.178 },
  { x: 0.091, y: 0.46, w: 0.353, h: 0.121 },
  { x: 0.192, y: 0.52, w: 0.273, h: 0.268 },
  { x: 0.409, y: 0.544, w: 0.096, h: 0.366 },
  { x: 0.501, y: 0.543, w: 0.199, h: 0.327 },
  { x: 0.536, y: 0.519, w: 0.34, h: 0.169 },
];
const FAN_CENTER = { x: 0.5, y: 0.5 };

function spawnFanDancer(force = false) {
  if (!denizenField || tunerPop("fandancer") <= 0) return;
  if (document.querySelectorAll("#denizen-field .pool-fan-dancer").length >= tunerCap("fandancer", 1)) return;
  if (!force && tunerSharedCapBlocked("fandancer", activeDenizens, 6)) return;
  const star = document.createElement("div");
  star.className = "denizen pool-fan-dancer";
  const depth = Math.random();
  const size = 110 + depth * 85;
  star.style.height = `${size.toFixed(1)}px`;
  star.style.width = `${size.toFixed(1)}px`;
  star.style.filter = `blur(${((1 - depth) * 2.8).toFixed(1)}px) brightness(${(0.5 + depth * 0.42).toFixed(2)}) saturate(${(0.72 + depth * 0.3).toFixed(2)})`;

  const { rig, addLayer } = buildLayerRig(star);
  const arms = FAN_ARMS.map((layer, i) => {
    const img = addLayer("fan-dancer", `arm-${i}`, layer);
    img.classList.add("rig-anim");
    setRigPivot(img, layer, FAN_CENTER);
    return img;
  });
  addLayer("fan-dancer", "disc", FAN_DISC);

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -size - 60 : window.innerWidth + 60;
  const endX = fromLeft ? window.innerWidth + 60 : -size - 60;
  const startY = window.innerHeight * (0.12 + Math.random() * 0.3);
  const endY = startY + window.innerHeight * (Math.random() * 0.3 - 0.1);
  const opacity = 0.55 + depth * 0.38;
  const duration = 58000 + Math.random() * 24000;
  animateDenizen(star, [
    { offset: 0, opacity: 0, transform: `translate3d(${startX.toFixed(1)}px,${startY.toFixed(1)}px,0)` },
    { offset: 0.05, opacity, transform: `translate3d(${(startX + (endX - startX) * 0.05).toFixed(1)}px,${(startY + (endY - startY) * 0.05).toFixed(1)}px,0)` },
    { offset: 0.95, opacity, transform: `translate3d(${(startX + (endX - startX) * 0.95).toFixed(1)}px,${(startY + (endY - startY) * 0.95).toFixed(1)}px,0)` },
    { offset: 1, opacity: 0, transform: `translate3d(${endX.toFixed(1)}px,${endY.toFixed(1)}px,0)` },
  ], duration);

  // metachronal wave: each arm leads its neighbor by a tenth of a cycle, so a
  // ripple circles the ring while the whole animal slowly rotates.
  const t0 = performance.now();
  const spinPeriod = (60 + Math.random() * 25) * 1000 * (Math.random() > 0.5 ? 1 : -1);
  const wavePeriod = 3200 + Math.random() * 900;
  let fanSkip = false;
  const draw = (now) => {
    if (!star.isConnected) return;
    // 30 fps is invisible on the slow spin + 3.4 s arm wave
    fanSkip = !fanSkip;
    if (fanSkip) {
      window.requestAnimationFrame(draw);
      return;
    }
    const spin = ((now - t0) / Math.abs(spinPeriod)) * 360 * Math.sign(spinPeriod);
    rig.style.transform = `rotate(${spin.toFixed(2)}deg)`;
    const ph = ((now - t0) / wavePeriod) * Math.PI * 2;
    for (let i = 0; i < arms.length; i += 1) {
      arms[i].style.transform = `rotate(${(Math.sin(ph - (i * Math.PI * 2) / arms.length) * 10).toFixed(2)}deg)`;
    }
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);
}

// ----------------------------------------------------------- barrel drifter
const BARREL_LAYERS = {
  nucleus: { x: 0.298, y: 0.3686, w: 0.21, h: 0.3014 },
  shell: { x: 0.146, y: 0.2514, w: 0.708, h: 0.4971 },
};
const BARREL_SIPHON = { x: 0.8194, y: 0.5 };
const BARREL_PUFFS = [
  { src: "puff-0", w: 0.1, h: 0.1457 },
  { src: "puff-1", w: 0.156, h: 0.2229 },
];

let barrelSpawnCount = 0;

function pickSignalStalk() {
  const candidates = signalStalks.filter(
    (stalk) => stalk.isConnected && stalk.dataset.grazed !== "true",
  );
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function spawnBarrelDrifter(force = false) {
  if (!denizenField || tunerPop("barrel") <= 0) return;
  if (document.querySelectorAll("#denizen-field .pool-barrel-drifter").length >= tunerCap("barrel", 1)) return;
  if (!force && tunerSharedCapBlocked("barrel", activeDenizens, 6)) return;
  barrelSpawnCount += 1;
  // every other drifter detours down to graze a signal stalk
  const feedStalk = barrelSpawnCount % 2 === 0 ? pickSignalStalk() : null;
  const salp = document.createElement("div");
  salp.className = "denizen pool-barrel-drifter";
  const depth = Math.random();
  const width = 80 + depth * 70;
  const height = width * (700 / 1000);
  salp.style.width = `${width.toFixed(1)}px`;
  salp.style.height = `${height.toFixed(1)}px`;
  salp.style.filter = `blur(${((1 - depth) * 2.4).toFixed(1)}px) brightness(${(0.42 + depth * 0.28).toFixed(2)})`;

  const { rig, addLayer } = buildLayerRig(salp);
  const nucleus = addLayer("barrel-drifter", "nucleus", BARREL_LAYERS.nucleus);
  nucleus.classList.add("rig-anim");
  addLayer("barrel-drifter", "shell", BARREL_LAYERS.shell);

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -width - 60 : window.innerWidth + 60;
  const endX = fromLeft ? window.innerWidth + 60 : -width - 60;
  // diagonal crossings: always at least a lean, sometimes a real dive or
  // climb, with a gentle meander baked along the line
  const startY = window.innerHeight * (0.18 + Math.random() * 0.54);
  const endY = Math.min(
    window.innerHeight * 0.85,
    Math.max(
      window.innerHeight * 0.12,
      startY +
        window.innerHeight * (0.08 + Math.random() * 0.34) * (Math.random() < 0.5 ? -1 : 1),
    ),
  );
  const meanderAmp = window.innerHeight * (0.015 + Math.random() * 0.035);
  const meanderCycles = 1.5 + Math.random() * 2;
  const meanderPhase = Math.random() * Math.PI * 2;
  const flip = fromLeft ? -1 : 1; // sprite faces -x; exhaust (+x) must trail the travel
  const opacity = 0.38 + depth * 0.26;
  // grazers get a longer clock: it's a herbivore ambling to a plant, not a
  // predator pouncing on one
  const duration = feedStalk ? 46000 + Math.random() * 14000 : 28000 + Math.random() * 26000;
  const pulsePeriod = 2200 + Math.random() * 500;

  // jet locomotion: velocity surges with each contraction, so the crossing is
  // baked as many keyframes of the integrated pulsed speed, not a linear
  // glide. Pulses are uneven (some contractions strong, some feeble) and ride
  // a slow cruise/laze envelope, so it stalls and scoots instead of
  // metronoming across.
  const contraction = (ms) => Math.max(0, Math.sin((ms / pulsePeriod) * Math.PI * 2)) ** 3;
  const pulseStrengths = Array.from(
    { length: Math.ceil(duration / pulsePeriod) + 2 },
    () => 0.45 + Math.random() * 1.1,
  );
  const pulseStrength = (ms) =>
    pulseStrengths[
      Math.min(pulseStrengths.length - 1, Math.max(0, Math.floor(ms / pulsePeriod)))
    ];
  const cruiseCycles = 1 + Math.random() * 1.5;
  const cruisePhase = Math.random() * Math.PI * 2;
  const cruise = (ms) =>
    1 + 0.45 * Math.sin((ms / duration) * Math.PI * 2 * cruiseCycles + cruisePhase);
  const samples = 128;
  const speeds = [];
  const cums = [];
  let total = 0;
  for (let k = 0; k <= samples; k += 1) {
    const ms = (k / samples) * duration;
    const v = (0.26 + 1.55 * pulseStrength(ms) * contraction(ms)) * cruise(ms);
    speeds.push(v);
    cums.push(total);
    total += v;
  }
  const yAt = (frac) =>
    startY +
    (endY - startY) * frac +
    Math.sin(frac * Math.PI * 2 * meanderCycles + meanderPhase) *
      meanderAmp *
      Math.sin(frac * Math.PI);

  // grazing route: swoop down to the stalk tips, hover through the feed
  // window, then climb out the top of the screen. Time-based phase bounds so
  // the ball-transfer timeouts line up with arrival; jet-pulse surging still
  // drives progress inside each leg.
  const FEED_START = 0.52;
  const FEED_END = 0.68;
  let grazePoint = null;
  if (feedStalk) {
    const stalkCenterX = feedStalk.offsetLeft + feedStalk.offsetWidth * 0.5;
    // body low enough that the ball tips sit inside the lower membrane —
    // it absorbs them through the body wall, no mouth involved
    const feed = {
      x: stalkCenterX - width * 0.5,
      y: window.innerHeight - feedStalk.offsetHeight - height * 0.5,
    };
    const entry = { x: startX, y: startY };
    const direction = fromLeft ? 1 : -1;
    // near-straight diagonal glide down to the plant; the bend point varies
    // per visit so no two dives repeat the same angle
    const approachControl = {
      x: feed.x - direction * window.innerWidth * (0.28 + Math.random() * 0.16),
      y: startY + (feed.y - startY) * (0.25 + Math.random() * 0.3),
    };
    // after feeding: rise a little, flatten out, sometimes settle back down,
    // and cruise off the side like a normal crossing — no more top exit
    const rise = window.innerHeight * (0.1 + Math.random() * 0.15);
    const dip = window.innerHeight * (-0.04 + Math.random() * 0.16);
    const level = {
      x: feed.x + direction * window.innerWidth * 0.28,
      y: Math.max(window.innerHeight * 0.14, feed.y - rise),
    };
    const levelControl = { x: feed.x + direction * window.innerWidth * 0.07, y: feed.y - rise * 0.95 };
    const sideExit = {
      x: fromLeft ? window.innerWidth + width + 60 : -width - 60,
      y: Math.min(window.innerHeight * 0.86, Math.max(window.innerHeight * 0.12, level.y + dip)),
    };
    const sideExitControl = { x: (level.x + sideExit.x) * 0.5, y: level.y + dip * 1.1 };
    const quad = (p0, control, p1, u) => ({
      x: (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * control.x + u * u * p1.x,
      y: (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * control.y + u * u * p1.y,
    });
    const cumAt = (frac) => cums[Math.min(samples, Math.round(frac * samples))];
    grazePoint = (frac, k) => {
      if (frac < FEED_START) {
        const u = Math.min(1, cums[k] / Math.max(1, cumAt(FEED_START)));
        return quad(entry, approachControl, feed, u);
      }
      if (frac < FEED_END) {
        return { x: feed.x, y: feed.y + Math.sin(frac * Math.PI * 24) * 2.5 };
      }
      const u = Math.min(1, (cums[k] - cumAt(FEED_END)) / Math.max(1, total - cumAt(FEED_END)));
      if (u < 0.42) return quad(feed, levelControl, level, u / 0.42);
      return quad(level, sideExitControl, sideExit, (u - 0.42) / 0.58);
    };
  }

  const frames = [];
  let cum = 0;
  let previousX = startX;
  let previousY = yAt(0);
  let pitch = 0;
  for (let k = 0; k <= samples; k += 1) {
    const frac = k / samples;
    const point = grazePoint ? grazePoint(frac, k) : null;
    const x = point ? point.x : startX + (endX - startX) * (cum / total);
    const y = point ? point.y : yAt(frac);
    cum += speeds[k];
    // nose follows the travel slope (smoothed, clamped so stalls don't read
    // as dives); flip mirrors the rotation direction like the gulper
    const rawPitch =
      k === 0
        ? 0
        : Math.max(
            -16,
            Math.min(16, (Math.atan2(y - previousY, Math.abs(x - previousX)) * 180) / Math.PI),
          );
    pitch = pitch * 0.65 + rawPitch * 0.35;
    previousX = x;
    previousY = y;
    const rot = -flip * pitch;
    let alpha = opacity;
    if (frac < 0.05) alpha = opacity * (frac / 0.05);
    if (frac > 0.95) alpha = opacity * ((1 - frac) / 0.05);
    frames.push({
      offset: frac,
      opacity: alpha,
      transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scaleX(${flip})`,
    });
  }
  animateDenizen(salp, frames, duration);

  if (feedStalk) {
    // claim now so an overlapping feeder can't pick the same plant
    feedStalk.dataset.grazed = "true";
    const baseFilter = salp.style.filter;
    const feedStartMs = duration * FEED_START;
    window.setTimeout(() => {
      if (feedStalk.isConnected) feedStalk.classList.add("stalk-grazed");
      if (!salp.isConnected) return;
      // a little more glow: modest brightness bump plus a red halo
      salp.style.filter = `${baseFilter} brightness(1.18) drop-shadow(0 0 9px rgba(219, 30, 50, 0.5))`;
      // the three swallowed balls settle into the translucent body one by one
      [[38, 44], [50, 53], [61, 45]].forEach(([ballX, ballY], index) => {
        window.setTimeout(() => {
          if (!salp.isConnected) return;
          const swallowed = document.createElement("i");
          swallowed.className = "barrel-ball";
          swallowed.style.left = `${ballX}%`;
          swallowed.style.top = `${ballY}%`;
          rig.append(swallowed);
        }, 500 + index * 650);
      });
    }, feedStartMs);
    // the plant grows its three balls back ~15 s after they were eaten
    window.setTimeout(() => {
      feedStalk.classList.remove("stalk-grazed");
      delete feedStalk.dataset.grazed;
    }, feedStartMs + 15000);
  }

  const t0 = performance.now();
  const draw = (now) => {
    if (!salp.isConnected) return;
    const ms = now - t0;
    // squash tracks each pulse's strength so weak pulses barely stir the body
    const e = contraction(ms) * Math.min(1.25, pulseStrength(ms));
    rig.style.transform = `scale(${(1 - 0.09 * e).toFixed(3)},${(1 + 0.06 * e).toFixed(3)})`;
    nucleus.style.opacity = Math.min(1, 0.7 + 0.3 * e).toFixed(3);
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);

  // one exhaust puff per contraction, born at the siphon, drifting astern and
  // fading fast — self-contained, capped, with a TTL fallback for hidden tabs.
  const spawnExhaust = () => {
    if (!salp.isConnected) return;
    if (rig.querySelectorAll(".rig-puff").length <= 5) {
      const variant = BARREL_PUFFS[Math.random() < 0.6 ? 0 : 1];
      const puff = document.createElement("img");
      puff.className = "rig-puff";
      puff.src = `./barrel-drifter/${variant.src}.png`;
      puff.alt = "";
      puff.style.width = `${(variant.w * 100).toFixed(2)}%`;
      puff.style.left = `${((BARREL_SIPHON.x - variant.w / 2) * 100).toFixed(2)}%`;
      puff.style.top = `${((BARREL_SIPHON.y - variant.h / 2) * 100).toFixed(2)}%`;
      rig.append(puff);
      const drift = width * (0.26 + Math.random() * 0.12);
      const dz = (Math.random() - 0.5) * 10;
      const life = 1300 + Math.random() * 500;
      puff.animate([
        { transform: "translate3d(0,0,0) scale(0.7)", opacity: 0 },
        { opacity: 0.75, offset: 0.2 },
        { transform: `translate3d(${drift.toFixed(1)}px,${dz.toFixed(1)}px,0) scale(1.35)`, opacity: 0 },
      ], { duration: life, easing: "ease-out" }).finished.finally(() => puff.remove());
      window.setTimeout(() => puff.remove(), life + 400);
    }
    window.setTimeout(spawnExhaust, pulsePeriod);
  };
  window.setTimeout(spawnExhaust, pulsePeriod * 0.55);
}

// ---------------------------------------------------------------------------
// Wave-3 layered denizens: comb jelly + spore floater. Sprites live in
// ./comb-jelly/ and ./spore-floater/ (Blender layer renders from
// tmp/jerrys-pool-denizens/denizens3.blend). Manifests inlined as usual.

// ----------------------------------------------------------- comb jelly
const COMB_LAYERS = {
  body: { x: 0.08, y: 0.2177, w: 0.427, h: 0.529 },
  rows: [
    { x: 0.084, y: 0.5419, w: 0.419, h: 0.1935 },
    { x: 0.084, y: 0.5081, w: 0.418, h: 0.1339 },
    { x: 0.084, y: 0.4548, w: 0.418, h: 0.0548 },
    { x: 0.085, y: 0.3242, w: 0.417, h: 0.1339 },
    { x: 0.085, y: 0.2306, w: 0.417, h: 0.1919 },
  ],
  tent0: { x: 0.486, y: 0.4339, w: 0.463, h: 0.2226 },
  tent1: { x: 0.475, y: 0.5274, w: 0.4, h: 0.25 },
};
const COMB_ANCHORS = {
  tent0Root: { x: 0.463, y: 0.4895 },
  tent1Root: { x: 0.4543, y: 0.5245 },
};

function spawnCombJelly(force = false) {
  if (!denizenField || tunerPop("combjelly") <= 0) return;
  if (document.querySelectorAll("#denizen-field .pool-comb-jelly").length >= tunerCap("combjelly", 1)) return;
  if (!force && tunerSharedCapBlocked("combjelly", activeDenizens, 6)) return;
  const cteno = document.createElement("div");
  cteno.className = "denizen pool-comb-jelly";
  const depth = Math.random();
  const width = 210 + depth * 150;
  const height = width * (620 / 1000);
  cteno.style.width = `${width.toFixed(1)}px`;
  cteno.style.height = `${height.toFixed(1)}px`;
  cteno.style.filter = `blur(${((1 - depth) * 2.6).toFixed(1)}px) brightness(${(0.5 + depth * 0.42).toFixed(2)}) saturate(${(0.8 + depth * 0.3).toFixed(2)})`;

  const { rig, addLayer } = buildLayerRig(cteno);
  const tent0 = addLayer("comb-jelly", "tent-0", COMB_LAYERS.tent0);
  setRigPivot(tent0, COMB_LAYERS.tent0, COMB_ANCHORS.tent0Root);
  const tent1 = addLayer("comb-jelly", "tent-1", COMB_LAYERS.tent1);
  setRigPivot(tent1, COMB_LAYERS.tent1, COMB_ANCHORS.tent1Root);
  addLayer("comb-jelly", "body", COMB_LAYERS.body);
  const rows = COMB_LAYERS.rows.map((layer, i) => addLayer("comb-jelly", `row-${i}`, layer));
  [tent0, tent1, ...rows].forEach((img) => img.classList.add("rig-anim"));

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -width - 60 : window.innerWidth + 60;
  const endX = fromLeft ? window.innerWidth + 60 : -width - 60;
  const flip = fromLeft ? -1 : 1; // sprite faces -x; tentacles must trail the travel
  const startY = window.innerHeight * (0.14 + Math.random() * 0.36);
  const endY = Math.min(
    window.innerHeight * 0.8,
    Math.max(window.innerHeight * 0.1, startY + window.innerHeight * (Math.random() * 0.44 - 0.22)),
  );
  const opacity = 0.52 + depth * 0.4;
  const duration = 55000 + Math.random() * 25000;
  animateDenizen(cteno, [
    { offset: 0, opacity: 0, transform: `translate3d(${startX.toFixed(1)}px,${startY.toFixed(1)}px,0) scaleX(${flip})` },
    { offset: 0.05, opacity, transform: `translate3d(${(startX + (endX - startX) * 0.05).toFixed(1)}px,${(startY + (endY - startY) * 0.05).toFixed(1)}px,0) scaleX(${flip})` },
    { offset: 0.95, opacity, transform: `translate3d(${(startX + (endX - startX) * 0.95).toFixed(1)}px,${(startY + (endY - startY) * 0.95).toFixed(1)}px,0) scaleX(${flip})` },
    { offset: 1, opacity: 0, transform: `translate3d(${endX.toFixed(1)}px,${endY.toFixed(1)}px,0) scaleX(${flip})` },
  ], duration);

  // comb-row shimmer: a brightness pulse travels across the five rows
  // (metachronal, like the fan dancer's arms but in opacity), the whole set
  // slowly cycling hue; tentacles undulate, the body rolls gently. Hue writes
  // are quantized to 3-degree steps so near-static frames skip the raster.
  const t0 = performance.now();
  const wavePeriod = 2600 + Math.random() * 700;
  const huePeriod = (13 + Math.random() * 6) * 1000 * (Math.random() > 0.5 ? 1 : -1);
  const hue0 = Math.random() * 360;
  let lastHue = null;
  let combSkip = false;
  const draw = (now) => {
    if (!cteno.isConnected) return;
    combSkip = !combSkip; // 30 fps is plenty for a slow shimmer
    if (combSkip) {
      window.requestAnimationFrame(draw);
      return;
    }
    const t = (now - t0) / 1000;
    const ph = ((now - t0) / wavePeriod) * Math.PI * 2;
    for (let i = 0; i < rows.length; i += 1) {
      const pulse = Math.max(0, Math.sin(ph - i * 0.85)) ** 1.5;
      rows[i].style.opacity = (0.5 + 0.5 * pulse).toFixed(3);
    }
    const hue = Math.round(((hue0 + ((now - t0) / Math.abs(huePeriod)) * 360 * Math.sign(huePeriod)) % 360) / 3) * 3;
    if (hue !== lastHue) {
      lastHue = hue;
      for (const row of rows) row.style.filter = `hue-rotate(${hue}deg)`;
    }
    tent0.style.transform = `rotate(${(Math.sin(t * (Math.PI * 2) / 4.6) * 5.5).toFixed(2)}deg)`;
    tent1.style.transform = `rotate(${(Math.sin(t * (Math.PI * 2) / 5.3 + 1.7) * 6.5).toFixed(2)}deg)`;
    rig.style.transform = `rotate(${(Math.sin(t * (Math.PI * 2) / 6.8) * 3).toFixed(2)}deg) translate3d(0,${(Math.sin(t * (Math.PI * 2) / 5.1) * height * 0.03).toFixed(2)}px,0)`;
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);
}

// ----------------------------------------------------------- spore floater
const FLOATER_LAYERS = {
  core: { x: 0.3789, y: 0.3789, w: 0.2422, h: 0.2422 },
  shellNear: { x: 0.1922, y: 0.2011, w: 0.6311, h: 0.5544 },
  shellMid: { x: 0.1744, y: 0.2033, w: 0.6433, h: 0.6467 },
  shellFar: { x: 0.2378, y: 0.2133, w: 0.62, h: 0.5822 },
};
const FLOATER_CENTER = { x: 0.5, y: 0.5 };
const FLOATER_SPORES = [
  { src: "spore-0", w: 0.0533, h: 0.0656 },
  { src: "spore-1", w: 0.0767, h: 0.0878 },
];

function spawnSporeFloater(force = false) {
  if (!denizenField || tunerPop("sporefloater") <= 0) return;
  if (document.querySelectorAll("#denizen-field .pool-spore-floater").length >= tunerCap("sporefloater", 1)) return;
  if (!force && tunerSharedCapBlocked("sporefloater", activeDenizens, 6)) return;
  const seedhead = document.createElement("div");
  seedhead.className = "denizen pool-spore-floater";
  const depth = Math.random();
  const size = 120 + depth * 95;
  seedhead.style.width = `${size.toFixed(1)}px`;
  seedhead.style.height = `${size.toFixed(1)}px`;
  seedhead.style.filter = `blur(${((1 - depth) * 2.4).toFixed(1)}px) brightness(${(0.52 + depth * 0.4).toFixed(2)}) saturate(${(0.78 + depth * 0.28).toFixed(2)})`;

  const { rig, addLayer } = buildLayerRig(seedhead);
  const shellFar = addLayer("spore-floater", "shell-far", FLOATER_LAYERS.shellFar);
  setRigPivot(shellFar, FLOATER_LAYERS.shellFar, FLOATER_CENTER);
  addLayer("spore-floater", "core", FLOATER_LAYERS.core);
  const shellMid = addLayer("spore-floater", "shell-mid", FLOATER_LAYERS.shellMid);
  setRigPivot(shellMid, FLOATER_LAYERS.shellMid, FLOATER_CENTER);
  const shellNear = addLayer("spore-floater", "shell-near", FLOATER_LAYERS.shellNear);
  setRigPivot(shellNear, FLOATER_LAYERS.shellNear, FLOATER_CENTER);
  [shellFar, shellMid, shellNear].forEach((img) => img.classList.add("rig-anim"));

  const opacity = 0.52 + depth * 0.38;
  const duration = 62000 + Math.random() * 28000;
  animateDenizen(seedhead, [
    { opacity: 0 },
    { opacity, offset: 0.07 },
    { opacity, offset: 0.88 },
    { opacity: 0 },
  ], duration);
  guideSporeFloater(seedhead, duration, size);

  // volumetric spin: the three filament shells counter-rotate at close-but-
  // different rates, so the ball reads as turning in space rather than as a
  // flat sticker. The rig itself only bobs (spores must sink straight down).
  const t0 = performance.now();
  const spinNear = (44 + Math.random() * 14) * 1000;
  const spinMid = -(58 + Math.random() * 16) * 1000;
  const spinFar = (78 + Math.random() * 20) * 1000;
  let floaterSkip = false;
  const draw = (now) => {
    if (!seedhead.isConnected) return;
    floaterSkip = !floaterSkip; // 30 fps for a sub-1-rpm spin
    if (floaterSkip) {
      window.requestAnimationFrame(draw);
      return;
    }
    const dt = now - t0;
    shellNear.style.transform = `rotate(${((dt / spinNear) * 360).toFixed(2)}deg)`;
    shellMid.style.transform = `rotate(${((dt / spinMid) * 360).toFixed(2)}deg)`;
    shellFar.style.transform = `rotate(${((dt / spinFar) * 360).toFixed(2)}deg)`;
    rig.style.transform = `translate3d(0,${(Math.sin(dt / 1000 * (Math.PI * 2) / 6.1) * size * 0.025).toFixed(2)}px,0)`;
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);

  // spore shedding: every so often 2-3 glow-spores detach from the rim and
  // sink, swaying like falling seeds — capped, with a TTL fallback so hidden
  // tabs can't accumulate them.
  const shedCluster = () => {
    if (!seedhead.isConnected) return;
    const count = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let s = 0; s < count; s += 1) {
      window.setTimeout(() => {
        if (!seedhead.isConnected) return;
        if (rig.querySelectorAll(".rig-spore").length > 5) return;
        const variant = FLOATER_SPORES[Math.random() < 0.6 ? 0 : 1];
        const angle = Math.random() * Math.PI * 2;
        const rim = 0.29 + Math.random() * 0.05;
        const spore = document.createElement("img");
        spore.className = "rig-spore";
        spore.src = `./spore-floater/${variant.src}.png`;
        spore.alt = "";
        spore.style.width = `${(variant.w * 100).toFixed(2)}%`;
        spore.style.left = `${((0.5 + Math.cos(angle) * rim - variant.w / 2) * 100).toFixed(2)}%`;
        spore.style.top = `${((0.5 + Math.sin(angle) * rim - variant.h / 2) * 100).toFixed(2)}%`;
        rig.append(spore);
        const sink = size * (0.55 + Math.random() * 0.5);
        const sway = size * (0.1 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1);
        const life = 5500 + Math.random() * 3000;
        const sporeAnim = spore.animate([
          { transform: "translate3d(0,0,0) scale(0.85)", opacity: 0 },
          { opacity: 0.85, offset: 0.12 },
          { transform: `translate3d(${(sway * 0.7).toFixed(1)}px,${(sink * 0.38).toFixed(1)}px,0) scale(1)`, opacity: 0.65, offset: 0.45 },
          { transform: `translate3d(${(-sway * 0.35).toFixed(1)}px,${(sink * 0.74).toFixed(1)}px,0) scale(1.05)`, opacity: 0.4, offset: 0.75 },
          { transform: `translate3d(${(sway * 0.15).toFixed(1)}px,${sink.toFixed(1)}px,0) scale(1.1)`, opacity: 0 },
        ], { duration: life, easing: "ease-in-out" });
        const sporeTtl = window.setTimeout(() => spore.remove(), life + 600);
        sporeAnim.finished.finally(() => {
          window.clearTimeout(sporeTtl);
          spore.remove();
        });
      }, s * (180 + Math.random() * 260));
    }
    window.setTimeout(shedCluster, 5500 + Math.random() * 4000);
  };
  window.setTimeout(shedCluster, 2500 + Math.random() * 2000);
}

// Urchin-style guided passage for the spore floater: a loose ellipse around
// the pool that stalls and reverses once or twice, breathes its speed (dips
// toward ~40% of the ceiling, never above it), wanders its radius, and rides
// the dot current exactly the way the pulse urchin does. Root transform stays
// translation-only — shed spores must keep sinking straight down.
function guideSporeFloater(seedhead, duration, size) {
  const startedAt = performance.now();
  const direction = Math.random() > 0.5 ? 1 : -1;
  const startAngle = Math.random() * Math.PI * 2;
  const rotations = 0.5 + Math.random() * 0.2; // net laps stay dreamier than the urchin's
  const baseOmega = (Math.PI * 2 * rotations) / duration; // rad/ms — the speed ceiling
  // one or two stall-and-reverse moments, smoothstepped through zero so each
  // turn reads as a slow stall, never a snap
  const flipCount = 1 + (Math.random() < 0.45 ? 1 : 0);
  const flips = [];
  for (let i = 0; i < flipCount; i += 1) {
    flips.push(0.18 + (i + Math.random() * 0.7) * (0.64 / flipCount));
  }
  const FLIP_SPAN = 0.07;
  const envCycles = 1.5 + Math.random() * 2;
  const envPhase = Math.random() * Math.PI * 2;
  const radiusXBase = window.innerWidth * (0.3 + Math.random() * 0.1);
  const radiusYBase = window.innerHeight * (0.24 + Math.random() * 0.08);
  const radiusCycles = 1 + Math.random() * 1.5;
  const radiusPhase = Math.random() * Math.PI * 2;
  const phaseX = Math.random() * Math.PI * 2;
  const phaseY = Math.random() * Math.PI * 2;
  let angle = startAngle;
  let flowOffsetX = 0;
  let flowOffsetY = 0;
  let previousFrameAt = startedAt;

  const update = () => {
    if (!seedhead.isConnected) return;
    const now = performance.now();
    const frameDelta = Math.min(64, now - previousFrameAt);
    previousFrameAt = now;
    const progress = Math.min(1, (now - startedAt) / duration);
    let dir = direction;
    for (const flip of flips) {
      if (progress >= flip + FLIP_SPAN) {
        dir = -dir;
      } else if (progress > flip) {
        const s = (progress - flip) / FLIP_SPAN;
        dir *= 1 - 2 * (s * s * (3 - 2 * s));
      }
    }
    const env = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 2 * envCycles + envPhase));
    angle += baseOmega * dir * env * frameDelta;
    const exitProgress = Math.max(0, (progress - 0.84) / 0.16);
    const radiusScale = (1 + 0.1 * Math.sin(progress * Math.PI * 2 * radiusCycles + radiusPhase))
      * (1 + exitProgress * exitProgress * 1.5);
    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight * 0.5;
    const wanderX = Math.sin(progress * Math.PI * 5 + phaseX) * 26;
    const wanderY = Math.sin(progress * Math.PI * 7 + phaseY) * 20;
    const x = centerX + Math.cos(angle) * radiusXBase * radiusScale + wanderX;
    const y = centerY + Math.sin(angle) * radiusYBase * radiusScale + wanderY;
    let flowX = 0;
    let flowY = 0;
    let flowWeight = 0;

    nodes.forEach((node) => {
      if (!node.active) return; // inactive dots hold stale positions
      if (!Number.isFinite(node.previousX) || !Number.isFinite(node.previousY)) return;
      const distance = Math.hypot(node.x - x, node.y - y);
      if (distance > 210) return;
      const weight = Math.pow(1 - distance / 210, 2);
      flowX += ((node.x - node.previousX) / (NETWORK_PHYSICS_STEP / 1000)) * weight;
      flowY += ((node.y - node.previousY) / (NETWORK_PHYSICS_STEP / 1000)) * weight;
      flowWeight += weight;
    });

    if (flowWeight > 0) {
      flowX /= flowWeight;
      flowY /= flowWeight;
    }
    // same drift feel as the urchin: 0.08 per 100ms step, frame-time scaled
    const flowEase = 1 - Math.pow(0.92, frameDelta / 100);
    flowOffsetX = lerp(flowOffsetX, Math.max(-20, Math.min(20, flowX * 0.1)), flowEase);
    flowOffsetY = lerp(flowOffsetY, Math.max(-20, Math.min(20, flowY * 0.1)), flowEase);
    seedhead.style.transform = `translate3d(${(x - size * 0.5 + flowOffsetX).toFixed(2)}px,${(y - size * 0.5 + flowOffsetY).toFixed(2)}px,0)`;
    requestAnimationFrame(update);
  };
  update();
}

// Every scheduler runs through the tuner: frequency divides the wait (0 idles
// on a short poll so the schedule revives when the slider comes back up).
function scheduleDenizen(delay = 10000 + Math.random() * 6000) {
  window.setTimeout(() => {
    if (tunerEnabled("amoeba")) spawnCrossingDenizen("pool-amoeba");
    scheduleDenizen();
  }, tunerDelay("amoeba", delay));
}

function scheduleDotSchool(delay = 8000 + Math.random() * 4000) {
  window.setTimeout(() => {
    if (tunerEnabled("school")) spawnDotSchool();
    scheduleDotSchool();
  }, tunerDelay("school", delay));
}

function scheduleJelly(delay = 6000 + Math.random() * 10000) {
  window.setTimeout(() => {
    if (tunerEnabled("jelly")) spawnJelly();
    scheduleJelly();
  }, tunerDelay("jelly", delay));
}

function scheduleRay(delay = 6000 + Math.random() * 6000) {
  window.setTimeout(() => {
    if (tunerEnabled("ray")) spawnCrossingDenizen("pool-ray");
    scheduleRay();
  }, tunerDelay("ray", delay));
}

function schedulePulseUrchin(delay = 9000 + Math.random() * 6000) {
  window.setTimeout(() => {
    if (tunerEnabled("urchin")) spawnPulseUrchin();
    schedulePulseUrchin();
  }, tunerDelay("urchin", delay));
}

function scheduleVake(delay = 8000 + Math.random() * 8000) {
  window.setTimeout(() => {
    if (tunerEnabled("vake")) spawnVake();
    scheduleVake();
  }, tunerDelay("vake", delay));
}

function scheduleGulper(delay = 25000 + Math.random() * 15000) {
  window.setTimeout(() => {
    if (tunerEnabled("gulper")) spawnGulper();
    scheduleGulper();
  }, tunerDelay("gulper", delay));
}

function scheduleFanDancer(delay = 22000 + Math.random() * 14000) {
  window.setTimeout(() => {
    if (tunerEnabled("fandancer")) spawnFanDancer();
    scheduleFanDancer();
  }, tunerDelay("fandancer", delay));
}

function scheduleBarrelDrifter(delay = 18000 + Math.random() * 14000) {
  window.setTimeout(() => {
    if (tunerEnabled("barrel")) spawnBarrelDrifter();
    scheduleBarrelDrifter();
  }, tunerDelay("barrel", delay));
}

function scheduleCombJelly(delay = 24000 + Math.random() * 14000) {
  window.setTimeout(() => {
    if (tunerEnabled("combjelly")) spawnCombJelly();
    scheduleCombJelly();
  }, tunerDelay("combjelly", delay));
}

function scheduleSporeFloater(delay = 26000 + Math.random() * 16000) {
  window.setTimeout(() => {
    if (tunerEnabled("sporefloater")) spawnSporeFloater();
    scheduleSporeFloater();
  }, tunerDelay("sporefloater", delay));
}

function scheduleLanternColony(delay = 16000 + Math.random() * 12000) {
  window.setTimeout(() => {
    if (tunerEnabled("colony")) spawnLanternColony();
    scheduleLanternColony();
  }, tunerDelay("colony", delay));
}

function scheduleVentWalker(delay = 20000 + Math.random() * 14000) {
  window.setTimeout(() => {
    if (tunerEnabled("walker")) spawnVentWalker();
    scheduleVentWalker();
  }, tunerDelay("walker", delay));
}

function seedOpeningResidents() {
  // The pool loads already inhabited: ambient residents dropped in
  // mid-passage, as if the scene had been running for minutes.
  const headStart = () => 0.2 + Math.random() * 0.4;
  spawnCrossingDenizen("pool-amoeba", headStart());
  spawnCrossingDenizen("pool-amoeba", headStart());
  spawnCrossingDenizen("pool-ray", headStart());
  spawnJelly(headStart());
  spawnPulseUrchin(true, headStart());
  spawnDotSchool(true);
}

function initializeAlienFishSchool() {
  const fish = [...document.querySelectorAll(".alien-fish")];
  if (!fish.length) return;
  fish.forEach((member) => registerJerryGlow(member));
  const profiles = {
    "fish-tripod": { speed: [17, 39], turn: 0.32, decision: [5.2, 8.8], dwell: [30, 52], pause: [1, 4], acceleration: 2.1, sway: [5, 0.0024] },
    "fish-chain": { speed: [52, 86], turn: 0.4, decision: [4.8, 8.1], dwell: [25, 46], pause: [4, 9], acceleration: 1.8, sway: [7, 0.0042], lateral: true },
  };

  const randomBetween = ([minimum, maximum]) => minimum + Math.random() * (maximum - minimum);
  const normalizeAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

  fish.forEach((creature, index) => {
    const profileName = Object.keys(profiles).find((name) => creature.classList.contains(name));
    const profile = profiles[profileName];
    const tunerKey = profileName === "fish-chain" ? "chainfish" : "tripodfish";
    // tuner gate: while the creature is disabled the relaunch idles on a poll;
    // frequency divides the pause between visits
    const scheduleRelaunch = (pause) => {
      window.setTimeout(() => {
        if (tunerEnabled(tunerKey)) launch();
        else scheduleRelaunch(4000);
      }, pause);
    };
    const launch = () => {
      // population raises the group-appearance odds (0.34 at ×1)
      const groupSize = Math.random() < Math.min(0.95, 0.34 * tunerPop(tunerKey)) ? 2 + Math.floor(Math.random() * 4) : 1;
      const members = [creature];
      for (let member = 1; member < groupSize; member += 1) {
        const companion = creature.cloneNode(true);
        companion.classList.add("fish-companion");
        companion.querySelectorAll("path, circle, ellipse").forEach((part) => {
          part.style.animationDelay = `${(-Math.random() * 4).toFixed(2)}s`;
        });
        creature.parentElement.append(companion);
        registerJerryGlow(companion);
        members.push(companion);
      }

      const edge = profile.lateral && Math.random() < 0.85
        ? Math.floor(Math.random() * 2)
        : Math.floor(Math.random() * 4);
      const margin = 90;
      const start = edge === 0 ? { x: -margin, y: Math.random() * window.innerHeight }
        : edge === 1 ? { x: window.innerWidth + margin, y: Math.random() * window.innerHeight }
          : edge === 2 ? { x: Math.random() * window.innerWidth, y: -margin }
            : { x: Math.random() * window.innerWidth, y: window.innerHeight + margin };
      const firstTarget = {
        x: window.innerWidth * (0.18 + Math.random() * 0.64),
        y: profile.lateral
          ? Math.max(45, Math.min(window.innerHeight - 65, start.y + (-0.12 + Math.random() * 0.24) * window.innerHeight))
          : window.innerHeight * (0.14 + Math.random() * 0.68),
        z: -0.75 + Math.random() * 1.5,
      };
      const now = performance.now();
      const state = {
        x: start.x,
        y: start.y,
        z: -0.7 + Math.random() * 1.4,
        velocityZ: -0.08 + Math.random() * 0.16,
        heading: Math.atan2(firstTarget.y - start.y, firstTarget.x - start.x),
        speed: profile.speed[0] * 0.6,
        targetSpeed: randomBetween(profile.speed),
        target: firstTarget,
        decisionAt: now + randomBetween(profile.decision) * 1000,
        exitAt: now + randomBetween(profile.dwell) * 1000,
        lastTime: now,
        born: now,
        exiting: false,
        lastDecisionWasReversal: false,
        finished: false,
      };
      if (profileName === "fish-tripod") activeTripodPrey.add(state);

      function chooseTarget(time) {
        if (time >= state.exitAt) {
          const exitEdge = profile.lateral && Math.random() < 0.85
            ? Math.floor(Math.random() * 2)
            : Math.floor(Math.random() * 4);
          state.target = exitEdge === 0 ? { x: -margin * 1.5, y: Math.random() * window.innerHeight }
            : exitEdge === 1 ? { x: window.innerWidth + margin * 1.5, y: Math.random() * window.innerHeight }
              : exitEdge === 2 ? { x: Math.random() * window.innerWidth, y: -margin * 1.5 }
                : { x: Math.random() * window.innerWidth, y: window.innerHeight + margin * 1.5 };
          state.target.z = -0.8 + Math.random() * 1.6;
          state.exiting = true;
          state.targetSpeed = profile.speed[1] * (0.82 + Math.random() * 0.18);
          return;
        }
        const travelScale = Math.min(window.innerWidth, window.innerHeight);
        if (profile.lateral) {
          const direction = Math.cos(state.heading) < 0 ? -1 : 1;
          const reversing = Math.random() < 0.22;
          const lateralDirection = reversing ? -direction : direction;
          state.target = {
            x: lateralDirection < 0 ? window.innerWidth * (0.08 + Math.random() * 0.24) : window.innerWidth * (0.68 + Math.random() * 0.24),
            y: Math.max(45, Math.min(window.innerHeight - 65, state.y + (-0.1 + Math.random() * 0.2) * window.innerHeight)),
            z: -0.8 + Math.random() * 1.6,
          };
          state.lastDecisionWasReversal = reversing;
          state.targetSpeed = randomBetween(profile.speed);
          state.decisionAt = time + randomBetween(profile.decision) * 1000;
          return;
        }
        if (!state.lastDecisionWasReversal && Math.random() < 0.3) {
          const reversalHeading = state.heading + Math.PI + (-0.35 + Math.random() * 0.7);
          const reversalDistance = travelScale * (0.58 + Math.random() * 0.34);
          state.target = {
            x: Math.max(45, Math.min(window.innerWidth - 70, state.x + Math.cos(reversalHeading) * reversalDistance)),
            y: Math.max(40, Math.min(window.innerHeight - 65, state.y + Math.sin(reversalHeading) * reversalDistance)),
            z: Math.max(-0.85, Math.min(0.85, state.z + (-0.9 + Math.random() * 1.8))),
          };
          state.lastDecisionWasReversal = true;
        } else {
          const nextHeading = state.heading + (-1.2 + Math.random() * 2.4);
          const nextDistance = travelScale * (0.45 + Math.random() * 0.38);
          state.target = {
            x: Math.max(45, Math.min(window.innerWidth - 70, state.x + Math.cos(nextHeading) * nextDistance)),
            y: Math.max(40, Math.min(window.innerHeight - 65, state.y + Math.sin(nextHeading) * nextDistance)),
            z: -0.8 + Math.random() * 1.6,
          };
          state.lastDecisionWasReversal = false;
        }
        if (Math.hypot(state.target.x - state.x, state.target.y - state.y) < travelScale * 0.34) {
          state.target.x = state.x < window.innerWidth / 2 ? window.innerWidth * 0.82 : window.innerWidth * 0.18;
          state.target.y = state.y < window.innerHeight / 2 ? window.innerHeight * 0.76 : window.innerHeight * 0.24;
        }
        state.targetSpeed = randomBetween(profile.speed);
        state.decisionAt = time + randomBetween(profile.decision) * 1000;
      }

      const memberStates = members.map((member, memberIndex) => ({
        x: state.x + (-12 + Math.random() * 24) * memberIndex,
        y: state.y + (-12 + Math.random() * 24) * memberIndex,
        z: Math.max(-0.9, Math.min(0.9, state.z + (-0.16 + Math.random() * 0.32) * memberIndex)),
        velocityX: Math.cos(state.heading) * state.speed * (0.88 + Math.random() * 0.2),
        velocityY: Math.sin(state.heading) * state.speed * (0.88 + Math.random() * 0.2),
        velocityZ: state.velocityZ + (-0.04 + Math.random() * 0.08),
        phase: Math.random() * Math.PI * 2,
      }));

      function finish(absorbed = false) {
        if (state.finished) return;
        state.finished = true;
        activeTripodPrey.delete(state);
        if (absorbed) {
          members.forEach((member) => member.classList.add("absorbed"));
          triggerFeedingResponse();
        }
        creature.style.opacity = "0";
        window.setTimeout(() => {
          creature.classList.remove("absorbed");
          members.slice(1).forEach((member) => member.remove());
        }, absorbed ? 420 : 0);
        scheduleRelaunch(tunerDelay(tunerKey, randomBetween(profile.pause) * 1000));
      }
      state.absorb = () => finish(true);

      function swim(time) {
        if (state.finished) return;
        const delta = Math.min(0.05, (time - state.lastTime) / 1000);
        state.lastTime = time;
        const targetDistance = Math.hypot(state.target.x - state.x, state.target.y - state.y);
        if (!state.exiting && (time >= state.decisionAt || targetDistance < 55)) chooseTarget(time);
        const desiredHeading = Math.atan2(state.target.y - state.y, state.target.x - state.x);
        const headingDifference = normalizeAngle(desiredHeading - state.heading);
        const turnStep = Math.max(-profile.turn * delta, Math.min(profile.turn * delta, headingDifference));
        state.heading = normalizeAngle(state.heading + turnStep);
        state.speed += (state.targetSpeed - state.speed) * Math.min(1, profile.acceleration * delta);
        state.x += Math.cos(state.heading) * state.speed * delta;
        state.y += Math.sin(state.heading) * state.speed * delta;
        state.velocityZ += ((state.target.z - state.z) * 0.34 - state.velocityZ * 0.7) * delta;
        state.velocityZ = Math.max(-0.22, Math.min(0.22, state.velocityZ));
        state.z = Math.max(-0.95, Math.min(0.95, state.z + state.velocityZ * delta));

        const fadeIn = Math.min(1, (time - state.born) / 1200);
        members.forEach((member, memberIndex) => {
          const fishState = memberStates[memberIndex];
          if (memberIndex === 0) {
            fishState.x = state.x;
            fishState.y = state.y;
            fishState.z = state.z;
            fishState.velocityX = Math.cos(state.heading) * state.speed;
            fishState.velocityY = Math.sin(state.heading) * state.speed;
            fishState.velocityZ = state.velocityZ;
          } else {
            let separationX = 0;
            let separationY = 0;
            let separationZ = 0;
            memberStates.forEach((neighbor, neighborIndex) => {
              if (neighborIndex === memberIndex) return;
              const dx = fishState.x - neighbor.x;
              const dy = fishState.y - neighbor.y;
              const dz = (fishState.z - neighbor.z) * 90;
              const distanceSquared = dx * dx + dy * dy + dz * dz;
              if (distanceSquared > 0 && distanceSquared < 2500) {
                separationX += dx / distanceSquared;
                separationY += dy / distanceSquared;
                separationZ += dz / distanceSquared;
              }
            });
            const noise = Math.sin(time * 0.0017 + fishState.phase);
            fishState.velocityX += ((state.x - fishState.x) * 0.18 + (Math.cos(state.heading) * state.speed - fishState.velocityX) * 0.42 + separationX * 1900 + noise * 7) * delta;
            fishState.velocityY += ((state.y - fishState.y) * 0.18 + (Math.sin(state.heading) * state.speed - fishState.velocityY) * 0.42 + separationY * 1900 + Math.cos(time * 0.0013 + fishState.phase) * 7) * delta;
            fishState.velocityZ += ((state.z - fishState.z) * 0.35 + (state.velocityZ - fishState.velocityZ) * 0.4 + separationZ * 11) * delta;
            const memberSpeed = Math.hypot(fishState.velocityX, fishState.velocityY);
            const speedLimit = profile.speed[1] * 1.08;
            if (memberSpeed > speedLimit) {
              fishState.velocityX *= speedLimit / memberSpeed;
              fishState.velocityY *= speedLimit / memberSpeed;
            }
            fishState.x += fishState.velocityX * delta;
            fishState.y += fishState.velocityY * delta;
            fishState.z = Math.max(-0.95, Math.min(0.95, fishState.z + fishState.velocityZ * delta));
          }

          const perspective = 1 + fishState.z * 0.34;
          const x = window.innerWidth / 2 + (fishState.x - window.innerWidth / 2) * perspective;
          const y = window.innerHeight / 2 + (fishState.y - window.innerHeight / 2) * perspective;
          const screenSpeed = Math.hypot(fishState.velocityX, fishState.velocityY);
          const spatialSpeed = Math.hypot(fishState.velocityX, fishState.velocityY, fishState.velocityZ * 320);
          const foreshortening = Math.max(0.2, Math.min(1, screenSpeed / Math.max(1, spatialSpeed)));
          const depthScale = 0.7 + (fishState.z + 0.95) * 0.31;
          const angle = Math.atan2(fishState.velocityY, fishState.velocityX) * 180 / Math.PI - 180;
          const depthOpacity = 0.58 + (fishState.z + 0.95) * 0.12;
          member.style.opacity = `${depthOpacity * fadeIn}`;
          member.style.filter = `blur(${((0.95 - fishState.z) * 0.7).toFixed(2)}px) drop-shadow(0 0 8px rgba(97, 229, 218, 0.2))`;
          member.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${angle.toFixed(1)}deg) scale(${(depthScale * foreshortening).toFixed(3)},${depthScale.toFixed(3)})`;
        });

        if (state.exiting && (state.x < -margin || state.x > window.innerWidth + margin || state.y < -margin || state.y > window.innerHeight + margin)) {
          finish();
          return;
        }
        requestAnimationFrame(swim);
      }
      requestAnimationFrame(swim);
    };
    scheduleRelaunch(900 + index * 1700 + Math.random() * 1800);
  });
}

function pickRoutes(count, pool = routePool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderRoutes() {
  if (!routeList) {
    return;
  }

  routeList.replaceChildren(
    ...pickRoutes(window.innerWidth < 700 ? 3 : 6).map((route) => {
      const article = document.createElement(route.href ? "a" : "article");
      article.className = `route${route.href ? " route-link" : ""}`;
      if (route.href) {
        article.href = route.href;
      }

      const title = document.createElement("strong");
      title.className = "route-title";
      title.textContent = route.title;

      const meta = document.createElement("p");
      meta.className = "route-meta";
      meta.textContent = route.meta;

      article.append(title, meta);
      return article;
    }),
  );
}

async function loadRoutes() {
  try {
    const response = await fetch("/api/worlds");
    if (!response.ok) {
      throw new Error("world list unavailable");
    }

    const worlds = await response.json();
    const liveWorlds = worlds
      .filter((world) => world.status === "live" && !world.admin?.hiddenFromDirectory)
      .map((world) => ({
        title: world.title,
        meta: [world.summary, ...(world.moods ?? [])].filter(Boolean).join(" · "),
        href: world.publicPath,
      }));

    if (liveWorlds.length > 0) {
      routePool = liveWorlds;
    }
  } catch {
    routePool = [...routeFallbacks];
  }

  renderRoutes();
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeInOut(amount) {
  return amount < 0.5
    ? 4 * amount * amount * amount
    : 1 - Math.pow(-2 * amount + 2, 3) / 2;
}

function maybeRetargetCell(time) {
  if (!orbital || !orb) {
    return;
  }

  if (time - cellMotion.steerStart >= cellMotion.steerDuration) {
      const sideMargin = 70;
      cellMotion.curiosity = {
        x: -sideMargin + Math.random() * (window.innerWidth + sideMargin * 2),
        y: -sideMargin + Math.random() * (window.innerHeight - 10 + sideMargin),
      };
      cellMotion.steerStart = time;
      cellMotion.steerDuration = 2200 + Math.random() * 4200;
      cellMotion.bodySteerDelayUntil = time + 900 + Math.random() * 1400;
  }

  if (time - cellMotion.pulseStart >= cellMotion.pulseDuration) {
    cellMotion.pulseFrom = { ...cellMotion.pulse };
    const goingFar = Math.random() < 0.14;
    const targetScale = goingFar
      ? 0.62 + Math.random() * 0.2
      : 0.9 + Math.random() * 0.1875;
    const nearness = (targetScale - 0.62) / 0.4675;
    cellMotion.pulseTarget = {
      scale: targetScale,
      glowA: 0.16 + nearness * 0.5,
      glowB: 0.2 + nearness * 0.58,
      membrane: 0.96 + nearness * 0.12,
      membraneAlpha: 0.11 + nearness * 0.16,
      tilt: -7 + Math.random() * 14,
      cytoplasmRotate:
        cellMotion.pulse.cytoplasmRotate + 45 + Math.random() * 110,
      cytoplasmScale: 0.96 + Math.random() * 0.14,
      nucleusScale: 0.94 + Math.random() * 0.14,
      nucleusX: -5 + Math.random() * 10,
      nucleusY: -5 + Math.random() * 10,
      filamentRotate: -24 + Math.random() * 48,
      vesicleShift: -8 + Math.random() * 16,
    };
    cellMotion.pulseStart = time;
    cellMotion.pulseTravelDuration = goingFar
      ? 9000 + Math.random() * 6000
      : 7000 + Math.random() * 7000;
    const depthHoldDuration = goingFar
      ? 2500 + Math.random() * 4500
      : 12000 + Math.random() * 18000;
    cellMotion.pulseDuration =
      cellMotion.pulseTravelDuration + depthHoldDuration;
  }
}

function updateCell(time) {
  if (!orbital || !orb) {
    return;
  }

  if (!cellMotion.roamingReady) {
    const initialOrbitalSize = Math.min(
      window.innerWidth * (window.innerWidth < 900 ? 1.32 : 0.84),
      576,
    );
    const bodyLength = initialOrbitalSize * 0.42;
    const startAngle = Math.random() * Math.PI * 2;
    const startDistance = bodyLength * (0.22 + Math.random() * 0.72);
    cellMotion.position.x = window.innerWidth * 0.5 + Math.cos(startAngle) * startDistance;
    cellMotion.position.y = window.innerHeight * 0.5 + Math.sin(startAngle) * startDistance;
    cellMotion.roamingReady = true;
  }

  maybeRetargetCell(time);

  if (cellMotion.leviathanPanic.active && time >= cellMotion.leviathanPanic.releaseAt) {
    cellMotion.leviathanPanic.active = false;
    cellMotion.steerStart = 0;
  }
  const leviathanPanic = cellMotion.leviathanPanic.active;
  const panicEscaping = leviathanPanic && time >= cellMotion.leviathanPanic.escapeAt;

  if (!leviathanPanic && !cellMotion.floorVisit.active && time >= cellMotion.floorVisit.nextAt) {
    cellMotion.floorVisit.active = true;
    cellMotion.floorVisit.start = time;
    cellMotion.floorVisit.fromLeft = Math.random() > 0.5;
    cellMotion.floorVisit.duration = 24000 + Math.random() * 5000;
    cellMotion.floorVisit.nextAt = time + 60000 + Math.random() * 30000;
    seafloorPlants.forEach((plant) => plant.classList.remove("jerry-touched"));
    foregroundPolypField?.classList.add("jerry-tending");
  }

  let tendingMinions = !leviathanPanic && cellMotion.floorVisit.active;
  if (tendingMinions) {
    const visitProgress = (time - cellMotion.floorVisit.start) / cellMotion.floorVisit.duration;
    if (visitProgress >= 1) {
      cellMotion.floorVisit.active = false;
      tendingMinions = false;
      foregroundPolypField?.classList.remove("jerry-tending");
      window.setTimeout(() => {
        seafloorPlants.forEach((plant) => plant.classList.remove("jerry-touched"));
      }, 6000);
      cellMotion.steerStart = 0;
    } else {
      const entryX = cellMotion.floorVisit.fromLeft ? window.innerWidth * 0.12 : window.innerWidth * 0.88;
      const exitX = cellMotion.floorVisit.fromLeft ? window.innerWidth * 0.88 : window.innerWidth * 0.12;
      cellMotion.curiosity.x = visitProgress < 0.24 ? entryX : exitX;
      cellMotion.curiosity.y = window.innerHeight - 88;
      cellMotion.bodySteerDelayUntil = 0;
      seafloorPlants.forEach((plant) => {
        const plantX = plant.offsetLeft + plant.offsetWidth * 0.5;
        if (Math.abs(cellMotion.position.x - plantX) < 145 && cellMotion.position.y > window.innerHeight - 245) {
          plant.classList.add("jerry-touched");
        }
      });
    }
  }

  if (leviathanPanic) {
    cellMotion.curiosity.x = panicEscaping ? cellMotion.leviathanPanic.hideX : cellMotion.position.x;
    cellMotion.curiosity.y = panicEscaping ? cellMotion.leviathanPanic.hideY : cellMotion.position.y;
    cellMotion.bodySteerDelayUntil = 0;
  }

  let chasingSchool = false;
  const activePrey = [...activeDotSchools, ...activeTripodPrey]
    .filter((prey) => !prey.absorbed && !prey.finished)
    .sort((a, b) => (
      Math.hypot(a.x - cellMotion.position.x, a.y - cellMotion.position.y)
      - Math.hypot(b.x - cellMotion.position.x, b.y - cellMotion.position.y)
    ))[0];
  if (!leviathanPanic && !tendingMinions && activePrey && !activePrey.absorbed && !activePrey.finished) {
    const preyDistance = Math.hypot(
      activePrey.x - cellMotion.position.x,
      activePrey.y - cellMotion.position.y,
    );
    if (preyDistance < 535) {
      chasingSchool = true;
      if (cellMotion.lockedPrey !== activePrey) {
        cellMotion.lockedPrey = activePrey;
        cellMotion.preySpeedBoostUntil = time + 3000;
      }
      cellMotion.curiosity.x = activePrey.x;
      cellMotion.curiosity.y = activePrey.y;
      cellMotion.nucleusFlex.target = 82;
      cellMotion.nucleusFlex.nextChange = time + 120;
      if (preyDistance < 24 * cellMotion.pulse.scale) {
        activePrey.absorb();
      }
    }
  }
  if (!chasingSchool) cellMotion.lockedPrey = null;

  const delta = cellMotion.lastTime
    ? Math.min(40, Math.max(16, time - cellMotion.lastTime))
    : 16;
  cellMotion.lastTime = time;

  const toCuriosityX = cellMotion.curiosity.x - cellMotion.position.x;
  const toCuriosityY = cellMotion.curiosity.y - cellMotion.position.y;
  const distanceToCuriosity = Math.max(1, Math.hypot(toCuriosityX, toCuriosityY));
  const intentX = toCuriosityX / distanceToCuriosity;
  const intentY = toCuriosityY / distanceToCuriosity;
  const chaseSpeedScale = chasingSchool
    ? Math.max(0.85, Math.min(1.8, 0.42 + distanceToCuriosity / 230))
    : leviathanPanic ? (panicEscaping ? 1.2 : 0)
    : tendingMinions ? 0.56
    : 1;
  const desiredSpeed =
    (0.075 + Math.min(0.065, distanceToCuriosity / 7000)) *
    chaseSpeedScale *
    (time < cellMotion.preySpeedBoostUntil ? 1.2 : 1);
  if (leviathanPanic || chasingSchool || tendingMinions || time >= cellMotion.bodySteerDelayUntil) {
    const headingResponse = leviathanPanic ? 0.085 : chasingSchool ? 0.055 : tendingMinions ? 0.04 : 0.025;
    cellMotion.bodyHeading.x = lerp(cellMotion.bodyHeading.x, intentX, headingResponse);
    cellMotion.bodyHeading.y = lerp(cellMotion.bodyHeading.y, intentY, headingResponse);
    if (chasingSchool) {
      const headingLength = Math.hypot(cellMotion.bodyHeading.x, cellMotion.bodyHeading.y) || 1;
      cellMotion.bodyHeading.x /= headingLength;
      cellMotion.bodyHeading.y /= headingLength;
    }
  }
  const desiredVelocityX =
    cellMotion.bodyHeading.x * desiredSpeed +
    Math.sin(time * 0.00019) * 0.014;
  const desiredVelocityY =
    cellMotion.bodyHeading.y * desiredSpeed +
    Math.cos(time * 0.00023 + 1.4) * 0.012;

  const currentVelocitySpeed = Math.hypot(cellMotion.velocity.x, cellMotion.velocity.y);
  const desiredVelocitySpeed = Math.hypot(desiredVelocityX, desiredVelocityY);
  const velocityResponse = leviathanPanic
    ? (desiredVelocitySpeed < currentVelocitySpeed ? 0.24 : 0.16)
    : chasingSchool
    ? (desiredVelocitySpeed < currentVelocitySpeed ? 0.24 : 0.16)
    : tendingMinions ? (desiredVelocitySpeed < currentVelocitySpeed ? 0.18 : 0.12)
    : 0.11;
  cellMotion.velocity.x = lerp(cellMotion.velocity.x, desiredVelocityX, velocityResponse);
  cellMotion.velocity.y = lerp(cellMotion.velocity.y, desiredVelocityY, velocityResponse);

  if (time >= cellMotion.nucleusFlex.nextChange) {
    cellMotion.nucleusFlex.target =
      Math.random() < 0.36
        ? 4 + Math.random() * 13
        : 24 + Math.random() * 44;
    cellMotion.nucleusFlex.nextChange = time + 5000 + Math.random() * 10000;
  }
  cellMotion.nucleusFlex.current = lerp(
    cellMotion.nucleusFlex.current,
    cellMotion.nucleusFlex.target,
    chasingSchool ? 0.045 : 0.008,
  );
  cellMotion.nucleusTravel.x = lerp(
    cellMotion.nucleusTravel.x,
    intentX * cellMotion.nucleusFlex.current,
    chasingSchool ? 0.24 : 0.045,
  );
  cellMotion.nucleusTravel.y = lerp(
    cellMotion.nucleusTravel.y,
    intentY * cellMotion.nucleusFlex.current,
    chasingSchool ? 0.24 : 0.045,
  );
  if (leviathanPanic) {
    const panicAge = time - cellMotion.leviathanPanic.start;
    const jerkDuration = cellMotion.leviathanPanic.jerkCount * 260;
    const inJerkSequence = panicAge < jerkDuration;
    const waitingToEscape = !inJerkSequence && !panicEscaping;
    const jerkStep = Math.floor(panicAge / 260);
    const betweenJerks = panicAge % 260 >= 110;
    const lateralJerk = betweenJerks ? 0 : jerkStep % 2 === 0 ? 6 : -6;
    const nucleusTargetX = inJerkSequence
      ? cellMotion.leviathanPanic.threatX * 82 - cellMotion.leviathanPanic.threatY * lateralJerk
      : waitingToEscape ? cellMotion.leviathanPanic.threatX * 82 : intentX * 82;
    const nucleusTargetY = inJerkSequence
      ? cellMotion.leviathanPanic.threatY * 82 + cellMotion.leviathanPanic.threatX * lateralJerk
      : waitingToEscape ? cellMotion.leviathanPanic.threatY * 82 : intentY * 82;
    const nucleusResponse = inJerkSequence ? 0.48 : panicEscaping ? 0.32 : 0.18;
    cellMotion.nucleusTravel.x = lerp(cellMotion.nucleusTravel.x, nucleusTargetX, nucleusResponse);
    cellMotion.nucleusTravel.y = lerp(cellMotion.nucleusTravel.y, nucleusTargetY, nucleusResponse);
  }

  cellMotion.position.x += cellMotion.velocity.x * delta;
  cellMotion.position.y += cellMotion.velocity.y * delta;

  if (time - lastPolypCheck > 180) {
    let nearAnyPolyp = false;
    let nearestPolypDistance = Infinity;
    poolPolyps.forEach((polyp) => {
      const polypX = polyp.offsetLeft + polyp.offsetWidth * 0.5;
      const distance = Math.hypot(
        cellMotion.position.x - polypX,
        cellMotion.position.y - (window.innerHeight - 25),
      );
      const isNear = distance < 240;
      if (isNear) {
        polyp.dataset.awakeUntil = `${time + 3500}`;
        const horizontalOffset = cellMotion.position.x - polypX;
        const proximity = 1 - distance / 240;
        polyp.style.setProperty("--jerry-reach-x", `${Math.max(-32, Math.min(32, horizontalOffset * 0.14)).toFixed(1)}px`);
        polyp.style.setProperty("--jerry-lean", `${Math.max(-14, Math.min(14, horizontalOffset * 0.075)).toFixed(1)}deg`);
        polyp.style.setProperty("--jerry-stretch", `${(1.65 + proximity * 0.72).toFixed(2)}`);
      }
      const remainsAwake = isNear || time < Number(polyp.dataset.awakeUntil || 0);
      polyp.classList.toggle("awake", remainsAwake);
      nearAnyPolyp ||= isNear;
      nearestPolypDistance = Math.min(nearestPolypDistance, distance);
    });
    signalStalks.forEach((plant) => {
      const plantX = plant.offsetLeft + plant.offsetWidth * 0.5;
      const plantY = window.innerHeight - plant.offsetHeight * 0.82;
      const distance = Math.hypot(
        cellMotion.position.x - plantX,
        cellMotion.position.y - plantY,
      );
      plant.classList.toggle("jerry-near", distance < 220);
    });
    brainCorals.forEach((coral) => {
      const bounds = coral.getBoundingClientRect();
      const coralX = bounds.left + bounds.width * 0.5;
      const coralY = bounds.top + bounds.height * 0.45;
      const distance = Math.hypot(
        cellMotion.position.x - coralX,
        cellMotion.position.y - coralY,
      );
      const isNear = distance < 260;
      if (isNear) coral.dataset.glowFullUntil = String(time + 5000);
      coral.classList.toggle("jerry-near", isNear || time < Number(coral.dataset.glowFullUntil || 0));
    });
    cellMotion.nearPolyps = nearAnyPolyp;
    cellMotion.polypWarmthTarget = Math.max(
      0,
      Math.min(1, (330 - nearestPolypDistance) / 240),
    );
    lastPolypCheck = time;
  }
  cellMotion.polypWarmth = lerp(
    cellMotion.polypWarmth,
    cellMotion.polypWarmthTarget,
    0.025,
  );

  const orbitalSize = Math.min(
    window.innerWidth * (window.innerWidth < 900 ? 1.32 : 0.84),
    576,
  );
  const cellRadius = orbitalSize * 0.21 * cellMotion.pulse.scale;
  const partialEdge = Math.min(60, cellRadius * 0.35);
  cellMotion.position.x = Math.max(
    leviathanPanic ? -cellRadius * 0.88 : -partialEdge,
    Math.min(leviathanPanic ? window.innerWidth + cellRadius * 0.88 : window.innerWidth + partialEdge, cellMotion.position.x),
  );
  cellMotion.position.y = Math.max(
    leviathanPanic ? -cellRadius * 0.88 : -partialEdge,
    Math.min(leviathanPanic ? window.innerHeight + cellRadius * 0.88 : window.innerHeight - cellRadius - 16, cellMotion.position.y),
  );

  const pulseProgress = Math.min(
    1,
    (time - cellMotion.pulseStart) / cellMotion.pulseTravelDuration,
  );
  const easedPulse = easeInOut(pulseProgress);
  cellMotion.pulse.scale =
    lerp(cellMotion.pulseFrom.scale, cellMotion.pulseTarget.scale, easedPulse);
  cellMotion.pulse.glowA = lerp(
    cellMotion.pulseFrom.glowA,
    cellMotion.pulseTarget.glowA,
    easedPulse,
  );
  cellMotion.pulse.glowB = lerp(
    cellMotion.pulseFrom.glowB,
    cellMotion.pulseTarget.glowB,
    easedPulse,
  );
  cellMotion.pulse.membrane = lerp(
    cellMotion.pulseFrom.membrane,
    cellMotion.pulseTarget.membrane,
    easedPulse,
  );
  cellMotion.pulse.membraneAlpha = lerp(
    cellMotion.pulseFrom.membraneAlpha,
    cellMotion.pulseTarget.membraneAlpha,
    easedPulse,
  );
  cellMotion.pulse.tilt = lerp(
    cellMotion.pulseFrom.tilt,
    cellMotion.pulseTarget.tilt,
    easedPulse,
  );
  cellMotion.pulse.cytoplasmRotate = lerp(
    cellMotion.pulseFrom.cytoplasmRotate,
    cellMotion.pulseTarget.cytoplasmRotate,
    easedPulse,
  );
  cellMotion.pulse.cytoplasmScale = lerp(
    cellMotion.pulseFrom.cytoplasmScale,
    cellMotion.pulseTarget.cytoplasmScale,
    easedPulse,
  );
  cellMotion.pulse.nucleusScale = lerp(
    cellMotion.pulseFrom.nucleusScale,
    cellMotion.pulseTarget.nucleusScale,
    easedPulse,
  );
  cellMotion.pulse.nucleusX = lerp(
    cellMotion.pulseFrom.nucleusX,
    cellMotion.pulseTarget.nucleusX,
    easedPulse,
  );
  cellMotion.pulse.nucleusY = lerp(
    cellMotion.pulseFrom.nucleusY,
    cellMotion.pulseTarget.nucleusY,
    easedPulse,
  );
  cellMotion.pulse.filamentRotate = lerp(
    cellMotion.pulseFrom.filamentRotate,
    cellMotion.pulseTarget.filamentRotate,
    easedPulse,
  );
  cellMotion.pulse.vesicleShift = lerp(
    cellMotion.pulseFrom.vesicleShift,
    cellMotion.pulseTarget.vesicleShift,
    easedPulse,
  );

  cellMotion.drift.x =
    Math.sin(time * 0.00039 + 0.8) * 26 + Math.sin(time * 0.00017) * 14;
  cellMotion.drift.y =
    Math.cos(time * 0.00033 + 1.4) * 22 + Math.sin(time * 0.00021) * 12;

  const depth = Math.max(0, Math.min(1, (cellMotion.pulse.scale - 0.62) / 0.4675));
  if (!cellMotion.behindDenizens && depth < 0.24) cellMotion.behindDenizens = true;
  else if (cellMotion.behindDenizens && depth > 0.3) cellMotion.behindDenizens = false;
  orbital.style.cssText = `left:${cellMotion.position.x.toFixed(2)}px;top:${cellMotion.position.y.toFixed(2)}px;transform:translate3d(calc(-50% + ${cellMotion.drift.x.toFixed(2)}px),calc(-50% + ${cellMotion.drift.y.toFixed(2)}px),0);z-index:${cellMotion.behindDenizens ? 2 : 5};--ring-depth-scale:${cellMotion.pulse.scale.toFixed(4)}`;
  const nucleusX = cellMotion.pulse.nucleusX + cellMotion.nucleusTravel.x;
  const nucleusY = cellMotion.pulse.nucleusY + cellMotion.nucleusTravel.y;
  const dotsShouldBeInFront = depth < 0.34;
  if (dotsShouldBeInFront !== cellMotion.dotsInFront) {
    canvas.style.zIndex = dotsShouldBeInFront ? "6" : "2";
    if (dotCanvas) dotCanvas.style.zIndex = dotsShouldBeInFront ? "6" : "2";
    cellMotion.dotsInFront = dotsShouldBeInFront;
  }
  const depthBlur = Math.max(0, (0.34 - depth) / 0.34) * 3.2;
  const feedingBoost = Math.max(0, Math.min(1, (feedingGlowUntil - time) / 6000));
  const polypGlowBoost = cellMotion.polypWarmth;
  const depthBrightness = 0.24 + depth * 0.86 + feedingBoost * 0.12 + polypGlowBoost * 0.2;
  const glowColorA = "101 212 255";
  const glowColorB = "143 255 225";
  orb.style.cssText = `transform:scale(${cellMotion.pulse.scale.toFixed(4)}) rotate(${cellMotion.pulse.tilt.toFixed(2)}deg);filter:blur(${depthBlur.toFixed(2)}px) brightness(${depthBrightness.toFixed(3)}) saturate(${(1 + feedingBoost * 0.15).toFixed(3)}) contrast(${(1 + feedingBoost * 0.06).toFixed(3)});--cell-glow-color-a:${glowColorA};--cell-glow-color-b:${glowColorB};--cell-glow-a:${(cellMotion.pulse.glowA + feedingBoost * 0.22 + polypGlowBoost * 0.28).toFixed(3)};--cell-glow-b:${(cellMotion.pulse.glowB + feedingBoost * 0.26 + polypGlowBoost * 0.34).toFixed(3)};--cell-membrane-scale:${cellMotion.pulse.membrane.toFixed(4)};--cell-membrane-alpha:${cellMotion.pulse.membraneAlpha.toFixed(3)};--cell-cytoplasm-rotate:${cellMotion.pulse.cytoplasmRotate.toFixed(2)}deg;--cell-cytoplasm-scale:${cellMotion.pulse.cytoplasmScale.toFixed(4)};--cell-nucleus-scale:${cellMotion.pulse.nucleusScale.toFixed(4)};--cell-nucleus-x:${nucleusX.toFixed(2)}px;--cell-nucleus-y:${nucleusY.toFixed(2)}px;--organelle-follow-x:${(nucleusX * 0.07).toFixed(2)}px;--organelle-follow-y:${(nucleusY * 0.05).toFixed(2)}px;--organelle-counter-x:${(nucleusX * -0.055).toFixed(2)}px;--organelle-counter-y:${(nucleusY * -0.045).toFixed(2)}px;--organelle-soft-x:${(nucleusX * 0.025).toFixed(2)}px;--organelle-soft-y:${(nucleusY * 0.025).toFixed(2)}px;--organelle-cross-x:${(nucleusX * 0.04).toFixed(2)}px;--organelle-cross-y:${(nucleusY * -0.06).toFixed(2)}px;--cell-filament-rotate:${cellMotion.pulse.filamentRotate.toFixed(2)}deg;--cell-vesicle-shift:${cellMotion.pulse.vesicleShift.toFixed(2)}px`;
}

function resize() {
  const pixelRatio = 1;
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (dotCanvas && !pixiDotsReady) {
    dotCanvas.width = window.innerWidth;
    dotCanvas.height = window.innerHeight;
    dotCanvas.style.width = `${window.innerWidth}px`;
    dotCanvas.style.height = `${window.innerHeight}px`;
  }
  filamentCanvas.width = window.innerWidth * pixelRatio;
  filamentCanvas.height = window.innerHeight * pixelRatio;
  filamentCanvas.style.width = `${window.innerWidth}px`;
  filamentCanvas.style.height = `${window.innerHeight}px`;
  filamentContext.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    0,
    0,
  );

  if (!cellMotion.roamingReady) {
    cellMotion.position.x = window.innerWidth * 0.67;
    cellMotion.position.y = window.innerHeight * 0.34;
  } else {
    cellMotion.position.x = Math.min(
      window.innerWidth + 120,
      Math.max(-120, cellMotion.position.x),
    );
    cellMotion.position.y = Math.min(
      window.innerHeight + 120,
      Math.max(-120, cellMotion.position.y),
    );
  }
  cellMotion.curiosity.x = window.innerWidth * 0.64;
  cellMotion.curiosity.y = window.innerHeight * 0.3;
}

// The full 2× dot pool is built up front; the tuner's count slider (0.5–2×)
// just moves the active window, so no Pixi rebuild ever happens live.
const DOT_BASE_COUNT = 330;
const DOT_MAX_COUNT = DOT_BASE_COUNT * 2;
let activeDotCount = Math.round(DOT_BASE_COUNT * tunerClamp(tunerState.dots.count, 0.5, 2));
const nodes = Array.from({ length: DOT_MAX_COUNT }, (_, index) => ({
  active: index < activeDotCount,
  orbit: 0.02 + Math.pow(Math.random(), 0.72) * 1.48,
  radius: 1 + Math.random() * 4,
  speed: 0.1 + Math.random() * 0.5,
  theta: Math.random() * Math.PI * 2,
  wobble: 16 + Math.random() * 46,
  flowX: 0,
  flowY: 0,
  flowVelocityX: 0,
  flowVelocityY: 0,
  bias: index % 3,
  dark: (index >= 280 && index < DOT_BASE_COUNT) || index % 2 === 0,
  depth: index % 2 !== 0 ? "near" : index % 4 === 0 ? "far" : "middle",
}));

function setActiveDotCount(multiplier) {
  activeDotCount = Math.round(DOT_BASE_COUNT * tunerClamp(multiplier, 0.5, 2));
  nodes.forEach((node, index) => {
    node.active = index < activeDotCount;
  });
}

const filaments = Array.from({ length: 4 }, (_, clusterIndex) => ({
  angle: -0.6 + Math.random() * 1.2,
  bridgeIndexes: Array.from({ length: 4 }, () => 6 + Math.floor(Math.random() * 16)),
  centerX: 0.14 + Math.random() * 0.72,
  centerY: 0.16 + Math.random() * 0.66,
  colorBias: clusterIndex % 4,
  lines: 5 + Math.floor(Math.random() * 5),
  phase: Math.random() * Math.PI * 2,
  progress: 0.16 + Math.random() * 0.38,
  spacing: 8 + Math.random() * 8,
  sway: 8 + Math.random() * 18,
  thickness: 0.8 + Math.random() * 0.75,
  velocity: 0.00003 + Math.random() * 0.00008,
  wavelength: 0.0018 + Math.random() * 0.0027,
}));

function colorForNode(bias, alpha, dark = false) {
  if (dark) {
    if (bias === 0) return `rgba(24, 88, 82, ${alpha})`;
    if (bias === 1) return `rgba(20, 62, 104, ${alpha})`;
    return `rgba(48, 76, 74, ${alpha})`;
  }

  if (bias === 0) {
    return `rgba(143, 255, 225, ${alpha})`;
  }

  if (bias === 1) {
    return `rgba(101, 212, 255, ${alpha})`;
  }

  return `rgba(255, 211, 132, ${alpha})`;
}

// --- Plankton: 10 diatom/plankton species replace 50 of the 330 current dots (5 each). ---
// They ride the same orbit + Jerry-influence physics as dots; only rendering differs.
const PLANKTON_GLOW_RADIUS = 190;
const PLANKTON_GLOW_HOLD = 2800;
const PLANKTON_GLOW_RISE = 320;
const PLANKTON_GLOW_FALL = 1100;

// Textures are drawn in white; each individual gets a random tint at spawn.
const PLANKTON_SPECIES = [
  { name: "coscinodiscus", worldSize: 11 },
  { name: "navicula", worldSize: 14 },
  { name: "triceratium", worldSize: 11 },
  { name: "fragilaria", worldSize: 15 },
  { name: "copepod", worldSize: 14 },
  { name: "radiolarian", worldSize: 12 },
  { name: "ceratium", worldSize: 14 },
  { name: "volvox", worldSize: 12 },
  { name: "asterionella", worldSize: 13 },
  { name: "foraminifera", worldSize: 11 },
];

// Any hue, kept bright enough to read against the dark pool.
function randomPlanktonTint() {
  const h = Math.random() * 360;
  const s = 0.4 + Math.random() * 0.6;
  const l = 0.55 + Math.random() * 0.3;
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255);
  };
  return (channel(0) << 16) | (channel(8) << 8) | channel(4);
}

// Ten blocks of 33 nodes; the first 5 of each block are plankton, so every
// species gets exactly 5 members with a mix of depth tiers and dark/bright.
function planktonSpeciesFor(index) {
  const position = index % 33;
  if (position >= 5) return -1;
  return Math.floor(index / 33) < 5 ? position * 2 : position * 2 + 1;
}

function planktonRgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

const PLANKTON_CELL = 64;

function drawPlanktonSpecies(speciesIndex) {
  const sprite = document.createElement("canvas");
  sprite.width = PLANKTON_CELL;
  sprite.height = PLANKTON_CELL;
  const c = sprite.getContext("2d");
  const mid = PLANKTON_CELL / 2;
  const hex = "#ffffff";
  const line = planktonRgba(hex, 0.95);
  const dim = planktonRgba(hex, 0.5);
  const fill = planktonRgba(hex, 0.16);
  c.translate(mid, mid);
  c.lineCap = "round";
  c.lineJoin = "round";
  c.shadowBlur = 5;
  c.shadowColor = planktonRgba(hex, 0.55);
  c.strokeStyle = line;
  c.fillStyle = fill;
  c.lineWidth = 3;

  if (speciesIndex === 0) {
    // Coscinodiscus: round pillbox diatom, rim + radial spokes + pore ring.
    c.beginPath();
    c.arc(0, 0, 24, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = dim;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
      c.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 0, 7, 0, Math.PI * 2);
    c.strokeStyle = line;
    c.stroke();
  } else if (speciesIndex === 1) {
    // Navicula: boat-shaped pennate diatom with raphe and cross ribs.
    c.rotate(-0.5);
    c.beginPath();
    c.moveTo(-26, 0);
    c.quadraticCurveTo(0, -13, 26, 0);
    c.quadraticCurveTo(0, 13, -26, 0);
    c.closePath();
    c.fill();
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-22, 0);
    c.lineTo(22, 0);
    c.stroke();
    c.strokeStyle = dim;
    for (let i = -2; i <= 2; i += 1) {
      const x = i * 8;
      const h = 9 - Math.abs(i) * 1.6;
      c.beginPath();
      c.moveTo(x, -h);
      c.lineTo(x, h);
      c.stroke();
    }
  } else if (speciesIndex === 2) {
    // Triceratium: rounded triangular diatom with corner pores.
    const corners = [];
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      corners.push([Math.cos(a) * 23, Math.sin(a) * 23]);
    }
    c.beginPath();
    c.moveTo((corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2);
    for (let i = 0; i < 3; i += 1) {
      const next = corners[(i + 1) % 3];
      const after = corners[(i + 2) % 3];
      c.quadraticCurveTo(next[0], next[1], (next[0] + after[0]) / 2, (next[1] + after[1]) / 2);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = dim;
    corners.forEach(([x, y]) => {
      c.beginPath();
      c.arc(x * 0.68, y * 0.68, 3.4, 0, Math.PI * 2);
      c.fill();
    });
  } else if (speciesIndex === 3) {
    // Fragilaria: ribbon chain of five linked cells.
    c.rotate(0.35);
    for (let i = -2; i <= 2; i += 1) {
      const x = i * 10.4;
      c.beginPath();
      c.rect(x - 4.4, -12, 8.8, 24);
      c.fill();
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = dim;
      c.beginPath();
      c.moveTo(x, -7);
      c.lineTo(x, 7);
      c.stroke();
      c.lineWidth = 3;
      c.strokeStyle = line;
    }
  } else if (speciesIndex === 4) {
    // Copepod: teardrop body, long antennae, forked tail, eye spot.
    c.rotate(0.8);
    c.beginPath();
    c.moveTo(0, -18);
    c.quadraticCurveTo(13, -6, 8, 10);
    c.quadraticCurveTo(0, 18, -8, 10);
    c.quadraticCurveTo(-13, -6, 0, -18);
    c.closePath();
    c.fill();
    c.stroke();
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(-4, -14);
    c.quadraticCurveTo(-22, -18, -27, -6);
    c.moveTo(4, -14);
    c.quadraticCurveTo(22, -18, 27, -6);
    c.stroke();
    c.beginPath();
    c.moveTo(-3, 16);
    c.lineTo(-7, 26);
    c.moveTo(3, 16);
    c.lineTo(7, 26);
    c.stroke();
    c.fillStyle = line;
    c.beginPath();
    c.arc(0, -10, 2.6, 0, Math.PI * 2);
    c.fill();
  } else if (speciesIndex === 5) {
    // Radiolarian: silica sphere with radiating spines.
    c.lineWidth = 2.4;
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      c.lineTo(Math.cos(a) * 27, Math.sin(a) * 27);
      c.stroke();
    }
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, 11, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = dim;
    c.beginPath();
    c.arc(0, 0, 18, 0, Math.PI * 2);
    c.stroke();
  } else if (speciesIndex === 6) {
    // Ceratium: dinoflagellate with one long horn and two curved horns.
    c.beginPath();
    c.arc(0, 2, 11, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(0, -8);
    c.quadraticCurveTo(2, -20, -2, -29);
    c.moveTo(-9, 9);
    c.quadraticCurveTo(-18, 18, -14, 27);
    c.moveTo(9, 9);
    c.quadraticCurveTo(18, 18, 14, 27);
    c.stroke();
  } else if (speciesIndex === 7) {
    // Volvox: colony sphere holding daughter colonies.
    c.beginPath();
    c.arc(0, 0, 24, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = dim;
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + 0.9;
      c.beginPath();
      c.arc(Math.cos(a) * 14, Math.sin(a) * 14, 3.6, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = line;
    c.beginPath();
    c.arc(2, -2, 4.4, 0, Math.PI * 2);
    c.fill();
  } else if (speciesIndex === 8) {
    // Asterionella: star colony of thin rods with tipped ends.
    c.lineWidth = 2.6;
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      const tipX = Math.cos(a) * 25;
      const tipY = Math.sin(a) * 25;
      c.beginPath();
      c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      c.lineTo(tipX, tipY);
      c.stroke();
      c.fillStyle = line;
      c.beginPath();
      c.arc(tipX, tipY, 2.8, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.arc(0, 0, 4.6, 0, Math.PI * 2);
    c.fillStyle = dim;
    c.fill();
    c.stroke();
  } else {
    // Foraminifera: spiral of growing chambers.
    c.rotate(-0.4);
    let radius = 3.2;
    let a = 0;
    let px = 6;
    let py = 0;
    for (let i = 0; i < 6; i += 1) {
      c.beginPath();
      c.arc(px, py, radius, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      a += 1.9 - i * 0.12;
      radius *= 1.32;
      const reach = 6 + i * 3.4;
      px = Math.cos(a) * reach;
      py = Math.sin(a) * reach;
    }
  }
  return sprite;
}

const planktonCanvases = PLANKTON_SPECIES.map((_, index) => drawPlanktonSpecies(index));
const planktonHaloCanvasCache = new Map();

function planktonHaloCanvas(hex = "#ffffff") {
  if (planktonHaloCanvasCache.has(hex)) return planktonHaloCanvasCache.get(hex);
  const halo = document.createElement("canvas");
  halo.width = 96;
  halo.height = 96;
  const haloContext = halo.getContext("2d");
  const gradient = haloContext.createRadialGradient(48, 48, 2, 48, 48, 46);
  gradient.addColorStop(0, planktonRgba(hex, 0.85));
  gradient.addColorStop(0.4, planktonRgba(hex, 0.32));
  gradient.addColorStop(1, planktonRgba(hex, 0));
  haloContext.fillStyle = gradient;
  haloContext.fillRect(0, 0, 96, 96);
  planktonHaloCanvasCache.set(hex, halo);
  return halo;
}

// Canvas-fallback only: white species art multiplied by the node's tint.
const planktonTintCache = new Map();

function planktonTintedCanvas(node) {
  const key = `${node.species}:${node.tintHex}`;
  if (planktonTintCache.has(key)) return planktonTintCache.get(key);
  const tinted = document.createElement("canvas");
  tinted.width = PLANKTON_CELL;
  tinted.height = PLANKTON_CELL;
  const tintContext = tinted.getContext("2d");
  tintContext.drawImage(planktonCanvases[node.species], 0, 0);
  tintContext.globalCompositeOperation = "multiply";
  tintContext.fillStyle = node.tintHex;
  tintContext.fillRect(0, 0, PLANKTON_CELL, PLANKTON_CELL);
  tintContext.globalCompositeOperation = "destination-in";
  tintContext.drawImage(planktonCanvases[node.species], 0, 0);
  planktonTintCache.set(key, tinted);
  return tinted;
}

function planktonGlowLevel(node, time) {
  const rise = Math.min(1, (time - node.glowStart) / PLANKTON_GLOW_RISE);
  if (rise <= 0) return 0;
  const fall = time <= node.glowUntil
    ? 1
    : Math.max(0, 1 - (time - node.glowUntil) / PLANKTON_GLOW_FALL);
  return rise * fall;
}

const dotSpriteCache = new Map();

function dotSpriteFor(node) {
  const radius = Math.round(node.radius * 2) / 2;
  const key = `${node.bias}:${node.dark ? 1 : 0}:${radius}`;
  if (dotSpriteCache.has(key)) return dotSpriteCache.get(key);

  const blur = node.dark ? 4 : 9;
  const padding = Math.ceil(blur * 2.5 + radius);
  const size = padding * 2;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const spriteContext = sprite.getContext("2d");
  spriteContext.beginPath();
  spriteContext.fillStyle = colorForNode(node.bias, node.dark ? 0.68 : 0.82, node.dark);
  spriteContext.shadowBlur = blur;
  spriteContext.shadowColor = colorForNode(node.bias, node.dark ? 0.2 : 0.38, node.dark);
  spriteContext.arc(padding, padding, radius, 0, Math.PI * 2);
  spriteContext.fill();
  dotSpriteCache.set(key, sprite);
  return sprite;
}

const PLANKTON_DRAW_EXTENT = 54;

nodes.forEach((node, index) => {
  node.species = planktonSpeciesFor(index);
  if (node.species >= 0) {
    node.worldSize = PLANKTON_SPECIES[node.species].worldSize * (0.85 + Math.random() * 0.3);
    node.tintColor = randomPlanktonTint();
    node.tintHex = `#${node.tintColor.toString(16).padStart(6, "0")}`;
    node.spinAngle = Math.random() * Math.PI * 2;
    node.glowStart = -1e9;
    node.glowUntil = -1e9;
    node.baseAlpha = node.dark ? 0.62 : 0.8;
    node.planktonScale = node.worldSize / PLANKTON_DRAW_EXTENT;
    node.sprite = planktonCanvases[node.species];
  } else {
    node.sprite = dotSpriteFor(node);
  }
  node.physicsStep = node.depth === "far" ? 1000 / 15 : node.depth === "middle" ? 1000 / 30 : 1000 / 60;
  node.lastPhysicsTime = 0;
  node.lastPhysicsStep = node.physicsStep;
});

function createPixiDotTexture(blur) {
  const textureCanvas = document.createElement("canvas");
  const size = 64;
  const center = size / 2;
  textureCanvas.width = size;
  textureCanvas.height = size;
  const textureContext = textureCanvas.getContext("2d");
  textureContext.beginPath();
  textureContext.fillStyle = "#fff";
  textureContext.shadowBlur = blur;
  textureContext.shadowColor = "rgba(255,255,255,.55)";
  textureContext.arc(center, center, 4, 0, Math.PI * 2);
  textureContext.fill();
  return PIXI.Texture.from(textureCanvas);
}

function pixiColorForNode(node) {
  if (node.dark) return [0x185852, 0x143e68, 0x304c4a][node.bias];
  return [0x8fffe1, 0x65d4ff, 0xffd384][node.bias];
}

async function initializePixiDots() {
  if (!USE_PIXI_DOTS || !dotCanvas || !window.PIXI) return;
  try {
    const app = new PIXI.Application();
    await app.init({
      canvas: dotCanvas,
      resizeTo: window,
      resolution: 1,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: false,
      autoStart: false,
      preference: "webgl",
    });
    const brightTexture = createPixiDotTexture(9);
    const darkTexture = createPixiDotTexture(4);
    const planktonTextures = planktonCanvases.map((planktonCanvas) => PIXI.Texture.from(planktonCanvas));
    const haloTexture = PIXI.Texture.from(planktonHaloCanvas());
    const darkDots = new PIXI.Container();
    const brightDots = new PIXI.Container();
    const planktonHalos = new PIXI.Container();
    const planktonLayer = new PIXI.Container();
    app.stage.addChild(darkDots, brightDots, planktonHalos, planktonLayer);

    nodes.forEach((node) => {
      if (node.species >= 0) {
        const creature = new PIXI.Sprite(planktonTextures[node.species]);
        creature.anchor.set(0.5);
        creature.scale.set(node.planktonScale);
        creature.rotation = node.spinAngle;
        creature.alpha = node.baseAlpha;
        creature.tint = node.tintColor;
        const halo = new PIXI.Sprite(haloTexture);
        halo.anchor.set(0.5);
        halo.tint = node.tintColor;
        halo.scale.set((node.worldSize * 3.2) / 96);
        halo.alpha = 0;
        halo.blendMode = "add";
        node.pixiParticle = creature;
        node.pixiHalo = halo;
        node.pixiAlpha = node.baseAlpha;
        planktonHalos.addChild(halo);
        planktonLayer.addChild(creature);
        return;
      }
      const texture = node.dark ? darkTexture : brightTexture;
      const particle = new PIXI.Sprite(texture);
      particle.anchor.set(0.5);
      particle.scale.set(node.radius / 4);
      particle.tint = pixiColorForNode(node);
      particle.alpha = node.dark ? 0.68 : 0.82;
      node.pixiParticle = particle;
      node.pixiAlpha = node.dark ? 0.68 : 0.82;
      (node.dark ? darkDots : brightDots).addChild(particle);
    });
    pixiDotApp = app;
    pixiDotsReady = true;
  } catch (error) {
    console.warn("Pixi dot renderer unavailable; using Canvas fallback.", error);
    dotCanvas.style.display = "none";
  }
}

initializePixiDots();

function drawBackdrop(time) {
  const gradient = context.createRadialGradient(
    window.innerWidth * 0.28,
    window.innerHeight * 0.22,
    20,
    window.innerWidth * 0.5,
    window.innerHeight * 0.55,
    window.innerWidth * 0.75,
  );
  gradient.addColorStop(0, "rgba(102, 255, 223, 0.1)");
  gradient.addColorStop(0.35, "rgba(29, 93, 255, 0.08)");
  gradient.addColorStop(0.7, "rgba(255, 110, 168, 0.04)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

// ---- rising bubble chains (adapted from the pelagic lantern habitat) ----
// Seafloor vents release short trains of tiny bubbles. Buoyancy carries them
// up, but the same clockwise orbital current the dots ride carries them
// sideways as they climb — a gentle lean near the center of the pool, a real
// shove out at the rim — and Jerry shoulders through any chain he crosses.
const bubbleEmitters = [
  { u: 0.13, size: 0.8, nextAt: 1400, trainLeft: 7 },
  { u: 0.31, size: 1.0, nextAt: 6000, trainLeft: 0 },
  { u: 0.46, size: 0.7, nextAt: 11000, trainLeft: 0 },
  { u: 0.6, size: 1.15, nextAt: 2600, trainLeft: 9 },
  { u: 0.78, size: 0.9, nextAt: 9000, trainLeft: 0 },
  { u: 0.91, size: 0.75, nextAt: 16000, trainLeft: 0 },
];
const poolBubbles = [];
let lastBubbleTime = 0;

function spawnPoolBubble(emitter, time) {
  if (poolBubbles.length > 110) return;
  const r = (0.8 + Math.random() * 2.1) * emitter.size;
  poolBubbles.push({
    x: window.innerWidth * emitter.u + (Math.random() - 0.5) * 9,
    y: window.innerHeight + 4,
    r,
    rMax: r * 1.7,
    rise: 24 + Math.random() * 22,
    sway: 3 + Math.random() * 5,
    phase: Math.random() * Math.PI * 2,
    swirlBias: 0.55 + Math.random() * 0.5,
    flowVX: 0,
    flowVY: 0,
    born: time,
    life: 12000 + Math.random() * 9000,
  });
}

function drawPoolBubbles(time) {
  const dt = lastBubbleTime ? Math.min(64, time - lastBubbleTime) : 16;
  lastBubbleTime = time;
  const ds = dt * 0.001;

  for (let i = 0; i < bubbleEmitters.length; i += 1) {
    const emitter = bubbleEmitters[i];
    if (time < emitter.nextAt) continue;
    if (emitter.trainLeft <= 0) emitter.trainLeft = 5 + Math.floor(Math.random() * 9);
    spawnPoolBubble(emitter, time);
    emitter.trainLeft -= 1;
    emitter.nextAt = emitter.trainLeft > 0
      ? time + 150 + Math.random() * 300
      : time + 6000 + Math.random() * 18000;
  }

  // reference ellipse matching the midrange dot orbit (rx 0.46W, ry 0.375H)
  const swirlCenterX = window.innerWidth * 0.54;
  const swirlCenterY = window.innerHeight * 0.52;
  const swirlRX = Math.max(1, window.innerWidth * 0.46);
  const swirlRY = Math.max(1, window.innerHeight * 0.375);
  const jerryX = cellMotion.position.x + cellMotion.drift.x;
  const jerryY = cellMotion.position.y + cellMotion.drift.y;
  const influenceRadius = 115 + cellMotion.pulse.scale * 70;
  const flowDamping = Math.exp(-1.6 * ds);

  for (let i = poolBubbles.length - 1; i >= 0; i -= 1) {
    const b = poolBubbles[i];
    const age = time - b.born;
    if (age > b.life || b.y < -20) {
      poolBubbles.splice(i, 1);
      continue;
    }

    b.y -= b.rise * ds;
    b.r = Math.min(b.rMax, b.r + dt * 0.0003);

    // clockwise tangent of the orbit ellipse passing through the bubble;
    // deflection scales with normalized distance from the swirl center
    const normX = (b.x - swirlCenterX) / swirlRX;
    const normY = (b.y - swirlCenterY) / swirlRY;
    const phi = Math.atan2(normY, normX);
    const tangentX = -Math.sin(phi) * swirlRX;
    const tangentY = Math.cos(phi) * swirlRY;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const swirlSpeed =
      20 * Math.min(1.4, Math.hypot(normX, normY)) * b.swirlBias;
    b.x += (tangentX / tangentLength) * swirlSpeed * ds;
    b.y += (tangentY / tangentLength) * swirlSpeed * 0.45 * ds;

    // Jerry's passage: damped radial push, little sibling of the dot flow
    const relX = b.x - jerryX;
    const relY = b.y - jerryY;
    const dist = Math.max(1, Math.hypot(relX, relY));
    if (dist < influenceRadius) {
      const proximity = 1 - dist / influenceRadius;
      const push = 130 * proximity * proximity * ds;
      b.flowVX += (relX / dist) * push;
      b.flowVY += (relY / dist) * push;
    }
    b.flowVX *= flowDamping;
    b.flowVY *= flowDamping;
    b.x += b.flowVX * ds;
    b.y += b.flowVY * ds;

    const drawX = b.x + Math.sin(time * 0.001 + b.phase) * b.sway;
    const fade = Math.min(1, age / 800) * Math.max(0, 1 - age / b.life);
    context.strokeStyle = `rgba(160, 225, 255, ${(0.32 * fade).toFixed(3)})`;
    context.fillStyle = `rgba(160, 225, 255, ${(0.06 * fade).toFixed(3)})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(drawX, b.y, b.r, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = `rgba(224, 248, 255, ${(0.38 * fade).toFixed(3)})`;
    context.beginPath();
    context.arc(drawX - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, Math.PI * 0.9, Math.PI * 1.6);
    context.stroke();
  }
}

function drawFilaments(time, drawContext) {
  drawContext.save();
  drawContext.lineCap = "round";
  drawContext.lineJoin = "round";

  filaments.forEach((cluster) => {
    const centerX = window.innerWidth * cluster.centerX;
    const centerY = window.innerHeight * cluster.centerY;
    const travel = time * cluster.velocity;
    const currentAngle =
      cluster.angle + Math.sin(travel * 2 + cluster.phase) * 0.08;
    const directionX = Math.cos(currentAngle);
    const directionY = Math.sin(currentAngle);

    const distanceToEdge = (stepX, stepY) => {
      const distances = [];
      if (stepX > 0) distances.push((window.innerWidth - centerX) / stepX);
      if (stepX < 0) distances.push(-centerX / stepX);
      if (stepY > 0) distances.push((window.innerHeight - centerY) / stepY);
      if (stepY < 0) distances.push(-centerY / stepY);
      return Math.min(...distances);
    };

    const forwardReach = distanceToEdge(directionX, directionY);
    const backwardReach = distanceToEdge(-directionX, -directionY);
    const length =
      (Math.max(forwardReach, backwardReach) + cluster.sway * 2 + 80) * 2;

    drawContext.save();
    drawContext.translate(centerX, centerY);
    drawContext.rotate(currentAngle);

    for (let lineIndex = 0; lineIndex < cluster.lines; lineIndex += 1) {
      const offset =
        (lineIndex - (cluster.lines - 1) / 2) * cluster.spacing;
      const bridgeIndex = cluster.bridgeIndexes[lineIndex];
      let bridgeX = 0;
      let bridgeY = 0;
      const lineAlpha = 0.055 + lineIndex * 0.006;
      drawContext.beginPath();

      for (let step = 0; step <= 30; step += 1) {
        const t = step / 30;
        const x = -length * 0.5 + length * t;
        const waveA =
          Math.sin(x * cluster.wavelength + travel * 9 + cluster.phase) *
          cluster.sway;
        const waveB =
          Math.cos(x * cluster.wavelength * 0.42 - travel * 5 + lineIndex) *
          cluster.sway *
          0.7;
        const y = offset + waveA + waveB;
        if (step === bridgeIndex) {
          bridgeX = x;
          bridgeY = y;
        }
        if (step === 0) {
          drawContext.moveTo(x, y);
        } else {
          drawContext.lineTo(x, y);
        }
      }

      const strokeByBias = [
        `rgba(143, 255, 225, ${lineAlpha})`,
        `rgba(101, 212, 255, ${lineAlpha * 0.98})`,
        `rgba(240, 211, 132, ${lineAlpha * 0.88})`,
        `rgba(255, 110, 168, ${lineAlpha * 0.66})`,
      ];

      drawContext.strokeStyle = strokeByBias[cluster.colorBias];
      drawContext.lineWidth = cluster.thickness + lineIndex * 0.06;
      drawContext.stroke();

      if (lineIndex < cluster.lines - 1 && lineIndex < cluster.bridgeIndexes.length) {
        const bridgeDrift = cluster.spacing * (0.7 + lineIndex * 0.08);
        drawContext.beginPath();
        drawContext.moveTo(bridgeX, bridgeY);
        drawContext.lineTo(
          bridgeX + cluster.spacing * 0.35,
          bridgeY + bridgeDrift,
        );
        drawContext.strokeStyle = `rgba(143, 255, 225, ${lineAlpha * 0.55})`;
        drawContext.lineWidth = 0.7;
        drawContext.stroke();
      }
    }

    drawContext.restore();
  });

  drawContext.restore();
}

const NETWORK_PHYSICS_STEP = 1000 / 30;
let lastNetworkTime = 0;

// Accumulated orbit clock: the tuner's swirl-speed multiplier scales how fast
// this advances, so speed changes are continuous (orbits derive phase from
// this clock, not from wall time — a raw multiplier on `time` would teleport
// every dot). Jerry's wake physics stay on real time by design.
let dotClock = 0;
let dotClockLast = null;

function updateNetworkPhysics(time) {
  lastNetworkTime = time;
  if (dotClockLast === null) dotClock = time;
  else dotClock += (time - dotClockLast) * tunerClamp(tunerState.dots.speed, 0.5, 2);
  dotClockLast = time;
  const centerX = window.innerWidth * 0.54;
  const centerY = window.innerHeight * 0.52;
  const headingLength = Math.max(
    0.001,
    Math.hypot(cellMotion.bodyHeading.x, cellMotion.bodyHeading.y),
  );
  const headingX = cellMotion.bodyHeading.x / headingLength;
  const headingY = cellMotion.bodyHeading.y / headingLength;
  const influenceRadius = 115 + cellMotion.pulse.scale * 70;

  nodes.forEach((node) => {
    if (!node.active) return;
    const priorDistance = Number.isFinite(node.x)
      ? Math.hypot(node.x - cellMotion.position.x, node.y - cellMotion.position.y)
      : Infinity;
    if (node.species >= 0 && priorDistance < PLANKTON_GLOW_RADIUS) {
      node.glowStart = time - planktonGlowLevel(node, time) * PLANKTON_GLOW_RISE;
      node.glowUntil = time + PLANKTON_GLOW_HOLD;
    }
    const activeStep = priorDistance < influenceRadius + 100 ? 1000 / 60 : node.physicsStep;
    if (node.lastPhysicsTime && time - node.lastPhysicsTime < activeStep) return;
    const deltaSeconds = node.lastPhysicsTime
      ? Math.min(0.07, (time - node.lastPhysicsTime) / 1000)
      : 0.016;
    const damping = Math.exp(-2.4 * deltaSeconds);
    node.lastPhysicsTime = time;
    node.lastPhysicsStep = activeStep;
    const theta = node.theta + dotClock * 0.000175 * node.speed;
    const radiusX = window.innerWidth * (0.03 + node.orbit * 0.43);
    const radiusY = window.innerHeight * (0.025 + node.orbit * 0.35);
    const wobbleX = Math.cos(theta * 2.1) * node.wobble;
    const wobbleY = Math.sin(theta * 1.7) * (node.wobble * 0.65);
    const baseX = centerX + Math.cos(theta) * radiusX + wobbleX;
    const baseY = centerY + Math.sin(theta) * radiusY + wobbleY;
    const relativeX = baseX + node.flowX - cellMotion.position.x;
    const relativeY = baseY + node.flowY - cellMotion.position.y;
    const distance = Math.max(1, Math.hypot(relativeX, relativeY));

    const offscreen = baseX < -100 || baseX > window.innerWidth + 100 || baseY < -100 || baseY > window.innerHeight + 100;
    if (!offscreen && distance < influenceRadius) {
      const proximity = 1 - distance / influenceRadius;
      const radialX = relativeX / distance;
      const radialY = relativeY / distance;
      const forward = radialX * headingX + radialY * headingY;
      const side = radialX * -headingY + radialY * headingX;
      const frontPressure = Math.max(0, forward) * proximity;
      const wake = Math.max(0, -forward) * proximity;
      const sideDirection = side < 0 ? -1 : 1;
      const flowStrength = proximity * proximity;

      node.flowVelocityX +=
        (radialX * (23.805 * flowStrength + 55.545 * frontPressure) +
          -headingY * sideDirection * 42.32 * frontPressure +
          -radialY * 23.805 * wake) *
        deltaSeconds;
      node.flowVelocityY +=
        (radialY * (23.805 * flowStrength + 55.545 * frontPressure) +
          headingX * sideDirection * 42.32 * frontPressure +
          radialX * 23.805 * wake) *
        deltaSeconds;
    }

    node.flowVelocityX += -node.flowX * 0.42 * deltaSeconds;
    node.flowVelocityY += -node.flowY * 0.42 * deltaSeconds;
    node.flowVelocityX *= damping;
    node.flowVelocityY *= damping;
    node.flowX += node.flowVelocityX * deltaSeconds;
    node.flowY += node.flowVelocityY * deltaSeconds;
    const nextX = baseX + node.flowX;
    const nextY = baseY + node.flowY;
    node.previousX = Number.isFinite(node.x) ? node.x : nextX;
    node.previousY = Number.isFinite(node.y) ? node.y : nextY;
    node.x = nextX;
    node.y = nextY;
  });
}

function drawNetwork(time) {
  updateNetworkPhysics(time);
  nodes.forEach((node) => {
    if (!node.active) {
      if (node.pixiParticle) node.pixiParticle.alpha = 0;
      if (node.pixiHalo) node.pixiHalo.alpha = 0;
      return;
    }
    const interpolation = Math.max(0, Math.min(1, (time - node.lastPhysicsTime) / node.lastPhysicsStep));
    const x = lerp(node.previousX ?? node.x, node.x, interpolation);
    const y = lerp(node.previousY ?? node.y, node.y, interpolation);
    if (pixiDotsReady && node.pixiParticle) {
      const margin = 80;
      const visible = x > -margin && x < window.innerWidth + margin && y > -margin && y < window.innerHeight + margin;
      node.pixiParticle.x = x;
      node.pixiParticle.y = y;
      if (node.species >= 0) {
        const glow = visible ? planktonGlowLevel(node, time) : 0;
        node.pixiParticle.alpha = visible ? node.baseAlpha + (1 - node.baseAlpha) * glow : 0;
        node.pixiParticle.scale.set(node.planktonScale * (1 + 0.28 * glow));
        node.pixiHalo.x = x;
        node.pixiHalo.y = y;
        node.pixiHalo.alpha = glow * 0.9;
        return;
      }
      node.pixiParticle.alpha = visible ? node.pixiAlpha : 0;
      return;
    }
    if (node.species >= 0) {
      const size = node.worldSize * (PLANKTON_CELL / PLANKTON_DRAW_EXTENT);
      const glow = planktonGlowLevel(node, time);
      if (glow > 0) {
        const haloSize = node.worldSize * 3.2;
        context.globalAlpha = glow * 0.9;
        context.drawImage(
          planktonHaloCanvas(node.tintHex),
          x - haloSize * 0.5,
          y - haloSize * 0.5,
          haloSize,
          haloSize,
        );
        context.globalAlpha = 1;
      }
      context.drawImage(planktonTintedCanvas(node), x - size * 0.5, y - size * 0.5, size, size);
      return;
    }
    context.drawImage(
      node.sprite,
      x - node.sprite.width * 0.5,
      y - node.sprite.height * 0.5,
    );
  });
  if (pixiDotsReady && pixiDotApp) pixiDotApp.render();
}

let drawFilamentsThisFrame = false;

function animate(time) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  updateCell(time);
  if (time - lastCreatureGlowCheck > 120) {
    const jerryX = cellMotion.position.x + cellMotion.drift.x;
    const jerryY = cellMotion.position.y + cellMotion.drift.y;
    const creatures = document.querySelectorAll(
      "#denizen-field .denizen:not(.abyssal-predator), #fish-model-gallery .alien-fish, #foreground-polyps .alien-shrimp, #foreground-polyps .pool-polyp",
    );
    creatures.forEach((creature) => {
      let creatureX;
      let creatureY;
      let creatureRadius = 0;
      if (creature.classList.contains("dot-school") && creature.dotSchoolState) {
        creatureX = creature.dotSchoolState.x;
        creatureY = creature.dotSchoolState.y;
        creatureRadius = 45;
      } else {
        const bounds = creature.getBoundingClientRect();
        creatureX = bounds.left + bounds.width / 2;
        creatureY = bounds.top + bounds.height / 2;
        creatureRadius = Math.min(90, Math.max(bounds.width, bounds.height) * 0.18);
      }
      const distance = Math.hypot(jerryX - creatureX, jerryY - creatureY);
      const isNearJerry = distance < 220 + creatureRadius;
      if (creature.classList.contains("pool-jelly")) {
        if (isNearJerry) creature.dataset.glowFullUntil = String(time + 10000);
        const glowFullUntil = Number(creature.dataset.glowFullUntil) || 0;
        const glowEndsAt = glowFullUntil + 5000;
        creature.classList.toggle("jerry-near", time < glowFullUntil);
        creature.classList.toggle("jelly-fading", time >= glowFullUntil && time < glowEndsAt);
      } else {
        creature.classList.toggle("jerry-near", isNearJerry);
      }
    });
    lastCreatureGlowCheck = time;
  }
  updatePolypOrbFeeding(time);
  drawBackdrop(time);
  drawPoolBubbles(time);
  drawNetwork(time);
  drawFilamentsThisFrame = !drawFilamentsThisFrame;
  if (filamentsEnabled && drawFilamentsThisFrame) {
    filamentContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawFilaments(time, filamentContext);
  }
  requestAnimationFrame(animate);
}

actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.pulse = button.dataset.pulse;
    signalText.textContent = signalPhrases[state.pulse];
    credoText.textContent =
      credoPhrases[Math.floor(Math.random() * credoPhrases.length)];
    renderRoutes();
  });
});

window.addEventListener("resize", () => {
  resize();
  if (routeList) {
    renderRoutes();
  }
});

resize();
if (routeList) {
  renderRoutes();
  setInterval(renderRoutes, 7000);
}
cellMotion.pulseFrom = { ...cellMotion.pulse };
cellMotion.pulseTarget = {
  scale: 1.06,
  glowA: 0.36,
  glowB: 0.44,
  membrane: 1.04,
  membraneAlpha: 0.2,
  tilt: 2.2,
  cytoplasmRotate: 36,
  cytoplasmScale: 1.05,
  nucleusScale: 1.03,
  nucleusX: 0,
  nucleusY: 0,
  filamentRotate: 8,
  vesicleShift: 2,
};
cellMotion.curiosity = { x: window.innerWidth * 0.45, y: window.innerHeight * 0.5 };
cellMotion.steerStart = -9999;
cellMotion.pulseStart = -9999;
const poolAmbience = new Audio("./assets/audio/jerry's-pool-sound-1.mp3");
poolAmbience.loop = true;
poolAmbience.volume = 0.7;
window.ElasticSoundControl.attach({ media: poolAmbience });

requestAnimationFrame(animate);
emitOpeningTriad();
scheduleEnergyBall();
schedulePaletteShift();
scheduleAmbientEvent();
// --- Pool tuner: panel -------------------------------------------------------
// Toggle button bottom-left; bottom sheet lists every denizen with thumbnail,
// notes, and (except Jerry and the leviathan) frequency + population sliders,
// plus global multipliers and the dot-field controls. Built lazily on first
// open. All DOM is created here — index.html stays untouched.

const TUNER_ROSTER = [
  { key: "jerry", name: "Jerry", locked: true,
    attributes: "The pool's radiant cell — drops energy orbs, zaps vakes, tends the floor",
    movement: "Free swim with curiosity pulls; panic dive when the leviathan rises",
    schedule: "Always present" },
  { key: "leviathan", name: "Leviathan", locked: true,
    attributes: "Abyssal silhouette at whole-pool scale",
    movement: "Vertical rise, hover drift, slow descent",
    schedule: "First rise 2–4 min, returns 2–4 min after leaving; 60 s passages" },
  { key: "amoeba", name: "Amoebas",
    attributes: "Translucent blobs, seven forms, drifting nuclei",
    movement: "Slow crossings, steer shy of Jerry",
    schedule: "Every 10–16 s, max 5" },
  { key: "jelly", name: "Jellyfish",
    attributes: "Moon, nettle, and box models, cycling in order",
    movement: "Rises from the floor, pulsing bell, tentacle sway",
    schedule: "Every 6–16 s" },
  { key: "ray", name: "Rays",
    attributes: "Depth-scaled silhouettes",
    movement: "Eight-beat undulating crossing",
    schedule: "Every 6–12 s" },
  { key: "urchin", name: "Pulse urchin",
    attributes: "Sixteen glowing spines",
    movement: "Guided ellipse riding the dot current",
    schedule: "Every 9–15 s, max 3, 50–72 s visits" },
  { key: "school", name: "Dot schools",
    attributes: "8–30 fish; Jerry can absorb a school",
    movement: "Flocking with turns, regroups, and evasion",
    schedule: "Every 8–12 s, max 3 schools" },
  { key: "chainfish", name: "Three-diamond fish",
    attributes: "Three linked diamonds; 34% chance of a 2–5 group",
    movement: "Fast lateral dashes with reversals",
    schedule: "Relaunches 4–9 s after each 25–46 s visit" },
  { key: "tripodfish", name: "Three-tentacled ball fish",
    attributes: "Ball body trailing three tentacles; Jerry prey",
    movement: "Slow wander with depth bobbing",
    schedule: "Relaunches 1–4 s after each 30–52 s visit" },
  { key: "vake", name: "Vake",
    attributes: "Orb thief; zapped inside 234 px of Jerry (1-in-5 miss)",
    movement: "3–5 s dart pace, orb hunts, banks around Jerry's buffer",
    schedule: "Every 8–16 s, max 2" },
  { key: "colony", name: "Sulfur lantern colony",
    attributes: "Twelve lanterns on a tether",
    movement: "Mid-water head-first drift with sine bob",
    schedule: "Every 16–28 s, max 2, 46–68 s visits" },
  { key: "walker", name: "Vent walker",
    attributes: "Tripod strider venting smoke",
    movement: "Slow seafloor walk",
    schedule: "Every 20–34 s, max 1, 52–78 s visits" },
  { key: "gulper", name: "Lure gulper",
    attributes: "Anglerfish — jaw snap every 6–11 s, bobbing lure",
    movement: "Cruising crossing with tail beat",
    schedule: "Every 25–40 s, max 1, 30–44 s visits" },
  { key: "fandancer", name: "Fan dancer",
    attributes: "Feather-star with ten feathered arms",
    movement: "Metachronal arm wave, slow spin and drift",
    schedule: "Every 22–36 s, max 1, 58–82 s visits" },
  { key: "combjelly", name: "Comb jelly",
    attributes: "Iridescent comb rows",
    movement: "Slow drifting crossing",
    schedule: "Every 24–38 s, max 1, 55–80 s visits" },
  { key: "sporefloater", name: "Spore floater",
    attributes: "Sheds sinking glow-spores (max 6 aloft)",
    movement: "Loose ellipse, stall-and-reverse, rides the current",
    schedule: "Every 26–42 s, max 1, 62–90 s visits" },
  { key: "barrel", name: "Barrel drifter",
    attributes: "Jet salp; every other one grazes a signal stalk",
    movement: "Contraction surges with cyan exhaust",
    schedule: "Every 18–32 s, max 1, 28–54 s crossings" },
  { key: "polyp", name: "Polyps", permanent: true,
    attributes: "Three species anchored to the floor",
    movement: "Sway in place",
    schedule: "28 permanent; each flares every 9–47 s" },
  { key: "shrimp", name: "Alien shrimp", permanent: true, noFreq: true,
    attributes: "Floor skitterers",
    movement: "Continuous scuttling",
    schedule: "11 permanent" },
  { key: "coral", name: "Brain coral", permanent: true, noFreq: true,
    attributes: "Brightens within 260 px of Jerry, 5 s hold, 20 s fade",
    movement: "Stationary",
    schedule: "3 permanent" },
  { key: "plant", name: "Seafloor plants", permanent: true, noFreq: true,
    attributes: "Includes 5 signal stalks that feed barrel drifters",
    movement: "Current sway",
    schedule: "23 permanent" },
];

function tunerThumbFor(key) {
  const box = document.createElement("span");
  box.className = "tuner-thumb";
  const make = (tag, className, cssText) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (cssText) el.style.cssText = cssText;
    box.append(el);
    return el;
  };
  const img = (src, cssText) => {
    const el = make("img", "tuner-thumb-img", cssText);
    el.src = src;
    el.alt = "";
    return el;
  };
  // mini layer rig: same fractional placement the live rigs use
  const rig = (folder, defs) => {
    const frame = make("span", "tuner-thumb-rig");
    defs.forEach(([name, def]) => {
      const layer = document.createElement("img");
      layer.src = `./${folder}/${name}.png`;
      layer.alt = "";
      layer.style.cssText = `position:absolute;left:${(def.x * 100).toFixed(1)}%;top:${(def.y * 100).toFixed(1)}%;width:${(def.w * 100).toFixed(1)}%;`;
      frame.append(layer);
    });
    return frame;
  };
  switch (key) {
    case "jerry": {
      const source = document.getElementById("jerry");
      if (!source) break;
      const clone = source.cloneNode(true);
      clone.removeAttribute("id");
      // .orb's CSS width is 42% of the orbital wrapper, so inside the thumb
      // it collapses — give the clone an explicit box and drop the live
      // depth filter and pulse transform so he reads crisp and glowing
      clone.style.position = "relative";
      clone.style.left = "auto";
      clone.style.top = "auto";
      clone.style.width = "42px";
      clone.style.height = "42px";
      clone.style.transform = "none";
      clone.style.filter = "none";
      box.append(clone);
      break;
    }
    case "leviathan":
      img("./leviathan-soft.png", "filter:brightness(2.4);");
      break;
    case "amoeba": {
      const blob = make("i", "denizen pool-amoeba blob-form-b", "width:34px;height:26px;");
      const nucleus = document.createElement("b");
      nucleus.className = "blob-nucleus";
      nucleus.style.cssText = "left:50%;top:50%;width:32%;height:34%;";
      blob.append(nucleus);
      break;
    }
    case "jelly": {
      // static moon-jelly frame (bell at rest + six tentacles)
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "pool-jelly jelly-moon");
      svg.setAttribute("viewBox", "0 0 118 225");
      svg.setAttribute("width", "23");
      svg.setAttribute("height", "44");
      const bell = document.createElementNS(NS, "path");
      bell.setAttribute("class", "jelly-bell");
      bell.setAttribute("stroke-width", "1.25");
      bell.setAttribute("d", "M 14 60.9 C 16.7 41.6, 34.3 33.6, 59 33.6 C 83.8 33.6, 101.3 41.6, 104 60.9 Q 81.5 67.9, 59 61.9 Q 36.5 67.9, 14 60.9 Z");
      svg.append(bell);
      for (let index = 0; index < 6; index += 1) {
        const tentacle = document.createElementNS(NS, "path");
        tentacle.setAttribute("class", "jelly-tentacle");
        tentacle.setAttribute("stroke-width", index % 2 ? "0.75" : "1.05");
        const rootX = 26 + index * 13;
        const bow = index % 2 ? 7 : -6;
        tentacle.setAttribute("d", `M ${rootX} 63 q ${bow} 45 ${bow * 0.4} 88`);
        svg.append(tentacle);
      }
      box.append(svg);
      break;
    }
    case "ray":
      make("i", "denizen pool-ray", "width:44px;height:14px;");
      break;
    case "urchin": {
      const urchin = make("i", "denizen pool-urchin", "width:30px;height:30px;--urchin-rgb:0, 172, 168;");
      for (let index = 0; index < 16; index += 1) {
        const spine = document.createElement("b");
        spine.style.setProperty("--spine-angle", `${index * 22.5}deg`);
        spine.style.setProperty("--spine-length", `${44 + (index % 3) * 9}%`);
        spine.style.setProperty("--spine-delay", `${(index % 4) * 45}ms`);
        urchin.append(spine);
      }
      break;
    }
    case "school": {
      // --flock-color must be a space-separated RGB triplet — the fish CSS
      // wraps it in rgb(); a hex value renders nothing
      const school = make("span", "dot-school", "width:44px;height:28px;--flock-color:143 255 225;");
      for (let index = 0; index < 12; index += 1) {
        const fish = document.createElement("b");
        fish.style.transform = `translate3d(${4 + Math.random() * 36}px,${3 + Math.random() * 21}px,0) rotate(${-20 + Math.random() * 40}deg)`;
        school.append(fish);
      }
      break;
    }
    case "chainfish":
    case "tripodfish": {
      const source = document.querySelector(key === "chainfish" ? ".fish-chain" : ".fish-tripod");
      if (!source) break;
      const clone = source.cloneNode(true);
      clone.removeAttribute("style");
      clone.querySelectorAll("[style]").forEach((part) => part.removeAttribute("style"));
      clone.setAttribute("width", "44");
      clone.setAttribute("height", "30");
      clone.style.cssText = "position:relative;opacity:1;";
      box.append(clone);
      break;
    }
    case "vake":
      make("i", "denizen pool-vake", "width:44px;height:14px;filter:brightness(1.8);");
      break;
    case "colony":
      img("./lantern-colony.png");
      break;
    case "walker":
      img("./vent-walker.png");
      break;
    case "gulper":
      rig("gulper", [
        ["fin-tail", GULPER_LAYERS.finTail],
        ["fin-pect", GULPER_LAYERS.finPect],
        ["jaw", GULPER_LAYERS.jaw],
        ["lure", GULPER_LAYERS.lure],
        ["body", GULPER_LAYERS.body],
      ]);
      break;
    case "fandancer":
      rig("fan-dancer", FAN_ARMS.map((def, index) => [`arm-${index}`, def]).concat([["disc", FAN_DISC]]));
      break;
    case "combjelly":
      rig("comb-jelly", [
        ["tent-0", COMB_LAYERS.tent0],
        ["tent-1", COMB_LAYERS.tent1],
        ["body", COMB_LAYERS.body],
        ...COMB_LAYERS.rows.map((def, index) => [`row-${index}`, def]),
      ]);
      break;
    case "sporefloater":
      rig("spore-floater", [
        ["shell-far", FLOATER_LAYERS.shellFar],
        ["core", FLOATER_LAYERS.core],
        ["shell-mid", FLOATER_LAYERS.shellMid],
        ["shell-near", FLOATER_LAYERS.shellNear],
      ]);
      break;
    case "barrel":
      rig("barrel-drifter", [
        ["nucleus", BARREL_LAYERS.nucleus],
        ["shell", BARREL_LAYERS.shell],
      ]);
      break;
    case "polyp":
      make("i", "pool-polyp species-b", "width:11px;height:38px;");
      break;
    case "shrimp": {
      const shrimp = make("i", "alien-shrimp", "width:26px;height:11px;--shrimp-delay:0s;--shrimp-distance:0px;--shrimp-mid:0px;--shrimp-back:0px;");
      shrimp.innerHTML = "<b></b><b></b><b></b>";
      break;
    }
    case "coral":
      make("i", "brain-coral coral-1", "--coral-size:34px;--coral-height:21px;");
      break;
    case "plant": {
      const plant = make("i", "seafloor-plant kelp", "--plant-height:40px;--plant-delay:0s;");
      plant.innerHTML = "<b></b><b></b><b></b>";
      break;
    }
    default:
      break;
  }
  return box;
}

// Delayed hover zoom: rest on a thumbnail for 100 ms and a 6× copy floats
// beside it (flips to the left edge when the viewport runs out of room).
let tunerZoomEl = null;
let tunerZoomTimer = 0;

function hideTunerZoom() {
  window.clearTimeout(tunerZoomTimer);
  tunerZoomTimer = 0;
  if (tunerZoomEl) {
    tunerZoomEl.remove();
    tunerZoomEl = null;
  }
}

function attachTunerZoom(thumb, key) {
  thumb.addEventListener("mouseenter", () => {
    window.clearTimeout(tunerZoomTimer);
    tunerZoomTimer = window.setTimeout(() => {
      if (tunerZoomEl) tunerZoomEl.remove();
      const zoom = document.createElement("div");
      zoom.className = "tuner-thumb-zoom";
      zoom.append(tunerThumbFor(key));
      const rect = thumb.getBoundingClientRect();
      const zoomWidth = 336;
      const zoomHeight = 264;
      let left = rect.right + 12;
      if (left + zoomWidth > window.innerWidth - 8) left = rect.left - zoomWidth - 12;
      const top = Math.max(8, Math.min(window.innerHeight - zoomHeight - 8, rect.top + rect.height / 2 - zoomHeight / 2));
      zoom.style.left = `${left.toFixed(0)}px`;
      zoom.style.top = `${top.toFixed(0)}px`;
      document.body.append(zoom);
      tunerZoomEl = zoom;
    }, 100);
  });
  thumb.addEventListener("mouseleave", hideTunerZoom);
}

function tunerSliderCell({ label, min, max, step, value, onInput, onCommit }) {
  const cell = document.createElement("label");
  cell.className = "tuner-slider";
  const name = document.createElement("span");
  name.className = "tuner-slider-label";
  name.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const readout = document.createElement("output");
  readout.textContent = `×${Number(value).toFixed(2)}`;
  input.addEventListener("input", () => {
    const next = Number(input.value);
    readout.textContent = `×${next.toFixed(2)}`;
    onInput(next);
    tunerSave();
  });
  if (onCommit) input.addEventListener("change", () => onCommit(Number(input.value)));
  cell.append(name, input, readout);
  cell.tunerInput = input;
  cell.tunerReadout = readout;
  return cell;
}

let tunerPanel = null;

function buildTunerPanel() {
  if (tunerPanel) return tunerPanel;
  tunerPanel = document.createElement("section");
  tunerPanel.className = "pool-tuner";
  tunerPanel.hidden = true;
  tunerPanel.setAttribute("aria-label", "Jerry's Pool tuner");

  const header = document.createElement("header");
  header.className = "tuner-header";
  const title = document.createElement("strong");
  title.textContent = "Pool tuner";
  const note = document.createElement("span");
  note.className = "tuner-note";
  note.textContent = "Changes hit new spawns; creatures already on screen finish their visit. Settings persist in this browser.";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "tuner-button";
  resetButton.textContent = "Reset all";

  // text-size gear — the map room's stepper mechanic (scripts/text-size.js):
  // ⚙ opens a −/+ popover, 5% per step, range −1..+5, remembered with the
  // rest of the tuner state; applies as zoom on the whole panel
  if (!tunerState.ui) tunerState.ui = { size: 0 };
  tunerState.ui.size = tunerNumber(tunerState.ui.size, 0);
  const sizeWrap = document.createElement("span");
  sizeWrap.className = "tuner-sizewrap";
  const sizeGear = document.createElement("button");
  sizeGear.type = "button";
  sizeGear.className = "tuner-button tuner-size-gear";
  sizeGear.textContent = "⚙";
  sizeGear.title = "text size";
  const sizePop = document.createElement("span");
  sizePop.className = "tuner-sizepop";
  const sizeDown = document.createElement("button");
  sizeDown.type = "button";
  sizeDown.className = "tuner-button";
  sizeDown.textContent = "−";
  sizeDown.title = "smaller";
  const sizeValue = document.createElement("span");
  sizeValue.className = "tuner-sizeval";
  const sizeUp = document.createElement("button");
  sizeUp.type = "button";
  sizeUp.className = "tuner-button";
  sizeUp.textContent = "+";
  sizeUp.title = "bigger";
  sizePop.append(sizeDown, sizeValue, sizeUp);
  sizeWrap.append(sizeGear, sizePop);
  const applyPanelSize = () => {
    const step = Math.round(tunerClamp(tunerState.ui.size, -1, 5));
    tunerState.ui.size = step;
    tunerPanel.style.zoom = 1 + step * 0.05;
    sizeValue.textContent = (step > 0 ? "+" : "") + step;
    sizeDown.disabled = step <= -1;
    sizeUp.disabled = step >= 5;
  };
  sizeGear.addEventListener("click", () => sizePop.classList.toggle("show"));
  sizeDown.addEventListener("click", () => { tunerState.ui.size -= 1; applyPanelSize(); tunerSave(); });
  sizeUp.addEventListener("click", () => { tunerState.ui.size += 1; applyPanelSize(); tunerSave(); });
  document.addEventListener("click", (event) => {
    if (sizePop.classList.contains("show") && !sizeWrap.contains(event.target)) sizePop.classList.remove("show");
  });
  applyPanelSize();

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "tuner-close";
  closeButton.textContent = "✕";
  closeButton.setAttribute("aria-label", "Close pool config");
  closeButton.addEventListener("click", () => setTunerPanelOpen(false));
  header.append(title, note, sizeWrap, resetButton, closeButton);

  const globals = document.createElement("div");
  globals.className = "tuner-globals";
  const globalCells = {
    freq: tunerSliderCell({
      label: "Global frequency", min: 0, max: 5, step: 0.05, value: tunerState.global.freq,
      onInput: (value) => { tunerState.global.freq = value; },
    }),
    pop: tunerSliderCell({
      label: "Global population", min: 0, max: 5, step: 0.05, value: tunerState.global.pop,
      onInput: (value) => { tunerState.global.pop = value; },
      onCommit: () => rebuildPermanentDenizens(),
    }),
    speed: tunerSliderCell({
      label: "Pool swirl speed", min: 0.5, max: 2, step: 0.05, value: tunerState.dots.speed,
      onInput: (value) => { tunerState.dots.speed = value; },
    }),
    count: tunerSliderCell({
      label: "Pool dot count", min: 0.5, max: 2, step: 0.05, value: tunerState.dots.count,
      onInput: (value) => { tunerState.dots.count = value; setActiveDotCount(value); },
    }),
  };
  globals.append(globalCells.freq, globalCells.pop, globalCells.speed, globalCells.count);

  const rows = document.createElement("div");
  rows.className = "tuner-rows";
  const rowCells = [];
  TUNER_ROSTER.forEach((entry) => {
    const row = document.createElement("div");
    row.className = `tuner-row${entry.locked ? " tuner-row-locked" : ""}`;
    const thumb = tunerThumbFor(entry.key);
    attachTunerZoom(thumb, entry.key);
    row.append(thumb);

    const info = document.createElement("div");
    info.className = "tuner-info";
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const schedule = document.createElement("span");
    schedule.className = "tuner-schedule";
    schedule.textContent = entry.schedule;
    const meta = document.createElement("span");
    meta.className = "tuner-meta";
    meta.textContent = `${entry.attributes}. ${entry.movement}.`;
    info.append(name, schedule, meta);
    row.append(info);

    const controls = document.createElement("div");
    controls.className = "tuner-controls";
    if (entry.locked) {
      const badge = document.createElement("span");
      badge.className = "tuner-locked-badge";
      badge.textContent = "not tunable";
      controls.append(badge);
    } else {
      const config = tunerCreature(entry.key);
      if (!entry.noFreq) {
        const freqCell = tunerSliderCell({
          label: "frequency", min: 0, max: 5, step: 0.05, value: config.freq,
          onInput: (value) => { config.freq = value; },
        });
        controls.append(freqCell);
        rowCells.push({ key: entry.key, field: "freq", cell: freqCell });
      }
      const popCell = tunerSliderCell({
        label: "population", min: 0, max: 5, step: 0.05, value: config.pop,
        onInput: (value) => { config.pop = value; },
        onCommit: entry.permanent ? () => rebuildPermanentDenizens() : undefined,
      });
      controls.append(popCell);
      rowCells.push({ key: entry.key, field: "pop", cell: popCell });
    }
    row.append(controls);
    rows.append(row);
  });

  resetButton.addEventListener("click", () => {
    tunerState.global.freq = 1;
    tunerState.global.pop = 1;
    tunerState.dots.speed = 1;
    tunerState.dots.count = 1;
    Object.values(tunerState.creatures).forEach((config) => {
      config.freq = 1;
      config.pop = 1;
    });
    Object.values(globalCells).forEach((cell) => {
      cell.tunerInput.value = "1";
      cell.tunerReadout.textContent = "×1.00";
    });
    rowCells.forEach(({ cell }) => {
      cell.tunerInput.value = "1";
      cell.tunerReadout.textContent = "×1.00";
    });
    setActiveDotCount(1);
    rebuildPermanentDenizens();
    tunerSave();
  });

  rows.addEventListener("scroll", hideTunerZoom);
  tunerPanel.append(header, globals, rows);
  document.body.append(tunerPanel);
  return tunerPanel;
}

function setTunerPanelOpen(open) {
  const panel = buildTunerPanel();
  panel.hidden = !open;
  tunerToggle.setAttribute("aria-expanded", String(open));
  if (!open) hideTunerZoom();
}

const tunerToggle = document.createElement("button");
tunerToggle.type = "button";
tunerToggle.className = "pool-tuner-toggle";
tunerToggle.textContent = "⚙ pool config";
tunerToggle.setAttribute("aria-expanded", "false");
tunerToggle.addEventListener("click", () => {
  setTunerPanelOpen(tunerPanel ? tunerPanel.hidden : true);
});
document.body.append(tunerToggle);

// click-away closes the panel (the toggle handles its own clicks)
document.addEventListener("pointerdown", (event) => {
  if (!tunerPanel || tunerPanel.hidden) return;
  if (tunerPanel.contains(event.target) || tunerToggle.contains(event.target)) return;
  setTunerPanelOpen(false);
});

// Opening policy: the pool loads already inhabited — seedOpeningResidents
// places a handful of the ambient cast mid-passage at load. No forced first
// appearances beyond that; every creature runs its regular schedule from the
// start, and the leviathan keeps its 2–4 minute entrance.
seedOpeningResidents();
scheduleDenizen();
scheduleDotSchool();
scheduleJelly();
scheduleRay();
schedulePulseUrchin();
scheduleVake();
scheduleLanternColony();
scheduleVentWalker();
scheduleGulper();
scheduleFanDancer();
scheduleBarrelDrifter();
scheduleCombJelly();
scheduleSporeFloater();
initializeAlienFishSchool();
window.setTimeout(() => spawnAbyssalPredator(), 120000 + Math.random() * 120000);
