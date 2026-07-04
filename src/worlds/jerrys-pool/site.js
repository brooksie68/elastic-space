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

function initializePolypColony() {
  if (!foregroundPolypField) return;
  for (let index = 0; index < 24; index += 1) {
    const polyp = document.createElement("i");
    const species = Math.floor(Math.random() * 3);
    polyp.className = `pool-polyp generated-polyp${species === 1 ? " species-b" : species === 2 ? " species-c" : ""}`;
    polyp.style.left = `${1 + Math.random() * 97}%`;
    polyp.style.height = `${24 + Math.random() * 76}px`;
    polyp.style.width = `${8 + Math.random() * 17}px`;
    foregroundPolypField.append(polyp);
  }
  poolPolyps = [...document.querySelectorAll(".pool-polyp")];
  poolPolyps.forEach((polyp) => {
    polyp.style.setProperty("--polyp-sway-duration", `${7 + Math.random() * 12}s`);
    polyp.style.setProperty("--polyp-sway-delay", `${-Math.random() * 20}s`);
    const scheduleFlare = () => {
      window.setTimeout(() => {
        polyp.classList.add("flaring");
        window.setTimeout(() => polyp.classList.remove("flaring"), 2800 + Math.random() * 3600);
        scheduleFlare();
      }, 9000 + Math.random() * 38000);
    };
    scheduleFlare();
  });
}

function initializeSeafloorFlora() {
  if (!foregroundPolypField) return;
  for (let index = 0; index < 3; index += 1) {
    const coral = document.createElement("i");
    coral.className = `brain-coral coral-${index + 1}`;
    coral.style.left = `${8 + index * 34 + Math.random() * 14}%`;
    const coralSize = 62 + Math.random() * 54;
    coral.style.setProperty("--coral-size", `${coralSize}px`);
    coral.style.setProperty("--coral-height", `${coralSize * 0.62}px`);
    foregroundPolypField.prepend(coral);
  }
  const plantTypes = ["kelp", "seaweed", "seaweed", "fern-frond", "fan-frond", "lace-frond", "signal-stalk"];
  for (let index = 0; index < 21; index += 1) {
    const plant = document.createElement("i");
    const plantType = plantTypes[index % plantTypes.length];
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

  for (let index = 0; index < 11; index += 1) {
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
        { filter: `${baseFilter}brightness(2.4) saturate(1.65) drop-shadow(0 0 7px rgba(183,255,242,.98)) drop-shadow(0 0 16px rgba(71,205,255,.78))` },
        { offset: 0.5, filter: `${baseFilter}brightness(2.4) saturate(1.65) drop-shadow(0 0 7px rgba(183,255,242,.98)) drop-shadow(0 0 16px rgba(71,205,255,.78))` },
        { filter: existingFilter },
      ],
      { duration: 4000, easing: "linear" },
    );
  });
}

function scheduleEnergyBall(delay = 3750 + Math.random() * 5830) {
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
  const speed = 34 + Math.random() * 24;
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
  if (!denizenField || document.querySelector(".abyssal-predator")) return;
  const predator = document.createElement("img");
  predator.className = "denizen abyssal-predator";
  predator.src = "./leviathan.png";
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
  document.querySelectorAll(".pool-jelly:not([data-consumed='true'])").forEach((jelly) => {
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

function spawnCrossingDenizen(type) {
  if (!denizenField || activeDenizens >= 6 || (type === "pool-amoeba" && activeAmoebas >= 5)) return;
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
    animateDenizen(element, rayKeyframes, duration * 0.84);
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
  if (type === "pool-amoeba") {
    aimAmoebaNucleus(element, movement);
    steerAmoebaFromJerry(element, movement);
  }
}

function spawnPulseUrchin(force = false) {
  if (
    !denizenField ||
    document.querySelector(".pool-urchin") ||
    (!force && activeDenizens >= 6)
  ) return;

  const urchin = document.createElement("i");
  urchin.className = "denizen pool-urchin";
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
  animateDenizen(
    urchin,
    [
      { opacity: 0 },
      { opacity: 0.72, offset: 0.12 },
      { opacity: 0.72, offset: 0.86 },
      { opacity: 0 },
    ],
    duration,
  );
  guidePulseUrchin(urchin, duration, size);
}

function guidePulseUrchin(urchin, duration, size) {
  const startedAt = performance.now();
  const direction = Math.random() > 0.5 ? 1 : -1;
  const startAngle = Math.random() * Math.PI * 2;
  const rotations = 1.35 + Math.random() * 0.35;
  const phaseX = Math.random() * Math.PI * 2;
  const phaseY = Math.random() * Math.PI * 2;
  let flowOffsetX = 0;
  let flowOffsetY = 0;

  const update = () => {
    if (!urchin.isConnected) return;
    const now = performance.now();
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
    flowOffsetX = lerp(flowOffsetX, Math.max(-20, Math.min(20, flowX * 0.1)), 0.08);
    flowOffsetY = lerp(flowOffsetY, Math.max(-20, Math.min(20, flowY * 0.1)), 0.08);
    const rotation = direction * progress * 540;
    urchin.style.transform = `translate3d(${(x - size * 0.5 + flowOffsetX).toFixed(2)}px,${(y - size * 0.5 + flowOffsetY).toFixed(2)}px,0) rotate(${rotation.toFixed(1)}deg)`;
    window.setTimeout(update, 100);
  };
  update();
}

function spawnDotSchool() {
  if (!denizenField || activeDenizens >= 8 || activeDotSchools.size >= 3) return;
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
  const startX = fromLeft ? -95 : window.innerWidth + 95;
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

function spawnJelly() {
  if (!denizenField || activeDenizens >= 6) return;
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
  const born = performance.now();
  const phaseOffset = Math.random() * Math.PI * 2;
  let lastGeometryTime = -Infinity;
  denizenField.append(jelly);
  activeDenizens += 1;

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

function scheduleDenizen(delay = 10000 + Math.random() * 6000) {
  window.setTimeout(() => {
    spawnCrossingDenizen("pool-amoeba");
    scheduleDenizen();
  }, delay);
}

function scheduleDotSchool(delay = 8000 + Math.random() * 4000) {
  window.setTimeout(() => {
    spawnDotSchool();
    scheduleDotSchool();
  }, delay);
}

function scheduleJelly(delay = 6000 + Math.random() * 10000) {
  window.setTimeout(() => {
    spawnJelly();
    scheduleJelly();
  }, delay);
}

function scheduleRay(delay = 6000 + Math.random() * 6000) {
  window.setTimeout(() => {
    spawnCrossingDenizen("pool-ray");
    scheduleRay();
  }, delay);
}

function schedulePulseUrchin(delay = 18000 + Math.random() * 12000) {
  window.setTimeout(() => {
    spawnPulseUrchin();
    schedulePulseUrchin();
  }, delay);
}

function emitOpeningDenizens() {
  window.setTimeout(() => spawnCrossingDenizen("pool-amoeba"), 450);
  window.setTimeout(() => spawnDotSchool(), 850);
  window.setTimeout(() => spawnJelly(), 1250);
  window.setTimeout(() => spawnJelly(), 2200);
  window.setTimeout(() => spawnJelly(), 3150);
  window.setTimeout(() => spawnCrossingDenizen("pool-ray"), 4100);
  window.setTimeout(() => spawnPulseUrchin(true), 4600);
}

function initializeAlienFishSchool() {
  const fish = [...document.querySelectorAll(".alien-fish")];
  if (!fish.length) return;
  const profiles = {
    "fish-tripod": { speed: [17, 39], turn: 0.32, decision: [5.2, 8.8], dwell: [30, 52], pause: [1, 4], acceleration: 2.1, sway: [5, 0.0024] },
    "fish-chain": { speed: [52, 86], turn: 0.4, decision: [4.8, 8.1], dwell: [25, 46], pause: [4, 9], acceleration: 1.8, sway: [7, 0.0042], lateral: true },
  };

  const randomBetween = ([minimum, maximum]) => minimum + Math.random() * (maximum - minimum);
  const normalizeAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

  fish.forEach((creature, index) => {
    const profileName = Object.keys(profiles).find((name) => creature.classList.contains(name));
    const profile = profiles[profileName];
    const launch = () => {
      const groupSize = Math.random() < 0.34 ? 2 + Math.floor(Math.random() * 4) : 1;
      const members = [creature];
      for (let member = 1; member < groupSize; member += 1) {
        const companion = creature.cloneNode(true);
        companion.classList.add("fish-companion");
        companion.querySelectorAll("path, circle, ellipse").forEach((part) => {
          part.style.animationDelay = `${(-Math.random() * 4).toFixed(2)}s`;
        });
        creature.parentElement.append(companion);
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
        window.setTimeout(launch, randomBetween(profile.pause) * 1000);
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
    window.setTimeout(launch, 900 + index * 1700 + Math.random() * 1800);
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
  const depthBrightness = 0.24 + depth * 0.86 + feedingBoost * 0.38 + polypGlowBoost * 0.2;
  const glowColorA = "101 212 255";
  const glowColorB = "143 255 225";
  orb.style.cssText = `transform:scale(${cellMotion.pulse.scale.toFixed(4)}) rotate(${cellMotion.pulse.tilt.toFixed(2)}deg);filter:blur(${depthBlur.toFixed(2)}px) brightness(${depthBrightness.toFixed(3)}) saturate(${(1 + feedingBoost * 0.3).toFixed(3)}) contrast(${(1 + feedingBoost * 0.16).toFixed(3)});--cell-glow-color-a:${glowColorA};--cell-glow-color-b:${glowColorB};--cell-glow-a:${(cellMotion.pulse.glowA + feedingBoost * 0.42 + polypGlowBoost * 0.28).toFixed(3)};--cell-glow-b:${(cellMotion.pulse.glowB + feedingBoost * 0.5 + polypGlowBoost * 0.34).toFixed(3)};--cell-membrane-scale:${cellMotion.pulse.membrane.toFixed(4)};--cell-membrane-alpha:${cellMotion.pulse.membraneAlpha.toFixed(3)};--cell-cytoplasm-rotate:${cellMotion.pulse.cytoplasmRotate.toFixed(2)}deg;--cell-cytoplasm-scale:${cellMotion.pulse.cytoplasmScale.toFixed(4)};--cell-nucleus-scale:${cellMotion.pulse.nucleusScale.toFixed(4)};--cell-nucleus-x:${nucleusX.toFixed(2)}px;--cell-nucleus-y:${nucleusY.toFixed(2)}px;--organelle-follow-x:${(nucleusX * 0.07).toFixed(2)}px;--organelle-follow-y:${(nucleusY * 0.05).toFixed(2)}px;--organelle-counter-x:${(nucleusX * -0.055).toFixed(2)}px;--organelle-counter-y:${(nucleusY * -0.045).toFixed(2)}px;--organelle-soft-x:${(nucleusX * 0.025).toFixed(2)}px;--organelle-soft-y:${(nucleusY * 0.025).toFixed(2)}px;--organelle-cross-x:${(nucleusX * 0.04).toFixed(2)}px;--organelle-cross-y:${(nucleusY * -0.06).toFixed(2)}px;--cell-filament-rotate:${cellMotion.pulse.filamentRotate.toFixed(2)}deg;--cell-vesicle-shift:${cellMotion.pulse.vesicleShift.toFixed(2)}px`;
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

const nodes = Array.from({ length: 330 }, (_, index) => ({
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
  dark: index >= 280 || index % 2 === 0,
  depth: index % 2 !== 0 ? "near" : index % 4 === 0 ? "far" : "middle",
}));

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

nodes.forEach((node) => {
  node.sprite = dotSpriteFor(node);
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
    const darkDots = new PIXI.Container();
    const brightDots = new PIXI.Container();
    app.stage.addChild(darkDots, brightDots);

    nodes.forEach((node) => {
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

function updateNetworkPhysics(time) {
  lastNetworkTime = time;
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
    const priorDistance = Number.isFinite(node.x)
      ? Math.hypot(node.x - cellMotion.position.x, node.y - cellMotion.position.y)
      : Infinity;
    const activeStep = priorDistance < influenceRadius + 100 ? 1000 / 60 : node.physicsStep;
    if (node.lastPhysicsTime && time - node.lastPhysicsTime < activeStep) return;
    const deltaSeconds = node.lastPhysicsTime
      ? Math.min(0.07, (time - node.lastPhysicsTime) / 1000)
      : 0.016;
    const damping = Math.exp(-2.4 * deltaSeconds);
    node.lastPhysicsTime = time;
    node.lastPhysicsStep = activeStep;
    const theta = node.theta + time * 0.000175 * node.speed;
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
    const interpolation = Math.max(0, Math.min(1, (time - node.lastPhysicsTime) / node.lastPhysicsStep));
    const x = lerp(node.previousX ?? node.x, node.x, interpolation);
    const y = lerp(node.previousY ?? node.y, node.y, interpolation);
    if (pixiDotsReady && node.pixiParticle) {
      const margin = 80;
      const visible = x > -margin && x < window.innerWidth + margin && y > -margin && y < window.innerHeight + margin;
      node.pixiParticle.x = x;
      node.pixiParticle.y = y;
      node.pixiParticle.alpha = visible ? node.pixiAlpha : 0;
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
requestAnimationFrame(animate);
emitOpeningTriad();
scheduleEnergyBall();
schedulePaletteShift();
scheduleAmbientEvent();
scheduleDenizen();
scheduleDotSchool();
scheduleJelly();
scheduleRay();
schedulePulseUrchin();
initializeAlienFishSchool();
emitOpeningDenizens();
window.setTimeout(() => spawnAbyssalPredator(), 120000 + Math.random() * 120000);
