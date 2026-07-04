const canvas = document.getElementById("field");
const context = canvas.getContext("2d");
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
const poolPolyps = [...document.querySelectorAll(".pool-polyp")];

const state = { pulse: "descend" };
const cellMotion = {
  drift: { x: 0, y: 0 },
  curiosity: { x: 0, y: 0 },
  lastTime: 0,
  position: { x: 0, y: 0 },
  bodyHeading: { x: 0.7, y: -0.36 },
  bodySteerDelayUntil: 0,
  dotsInFront: false,
  nucleusTravel: { x: 0, y: 0 },
  nucleusFlex: { current: 12, target: 12, nextChange: 0 },
  roamingReady: false,
  steerStart: 0,
  steerDuration: 4200,
  velocity: { x: 0.7, y: -0.36 },
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

const routeFallbacks = [
  {
    title: "wildflowers at dusk",
    meta: "upward rain, streamers of light, Whitman in the storm",
    href: "./src/worlds/wildflowers-at-dusk/index.html",
  },
  {
    title: "the monochrome rift",
    meta: "shifting black and white, flashes, grinding air, distant chimes",
    href: "./src/worlds/monochrome-rift/index.html",
  },
  {
    title: "pelagic lantern habitat",
    meta: "alien undersea glow, friendly creatures, low thrumming",
    href: "./src/worlds/pelagic-lantern-habitat/index.html",
  },
];

let routePool = [...routeFallbacks];
let activeEnergyBalls = 0;
let activeDenizens = 0;
let activeLargeShapes = 0;
let lastPolypCheck = 0;

const energyColors = [
  "0 73 169",
  "0 135 169",
  "11 55 113",
  "13 42 103",
  "20 60 76",
  "14 56 92",
  "0 98 151",
];

function scheduleEnergyBall(delay = 4500 + Math.random() * 7000) {
  window.setTimeout(() => {
    spawnEnergyBall();
    scheduleEnergyBall();
  }, delay);
}

function spawnEnergyBall() {
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

  const angle = Math.random() * Math.PI * 2;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const distances = [];
  if (directionX > 0) distances.push((window.innerWidth - startX + margin) / directionX);
  if (directionX < 0) distances.push((-margin - startX) / directionX);
  if (directionY > 0) distances.push((window.innerHeight - startY + margin) / directionY);
  if (directionY < 0) distances.push((-margin - startY) / directionY);
  const travelDistance = Math.min(...distances.filter((value) => value > 0));
  const endX = directionX * travelDistance;
  const endY = directionY * travelDistance;
  const bendX = -directionY * (30 + Math.random() * 70);
  const bendY = directionX * (30 + Math.random() * 70);
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
  const destination = routePool[Math.floor(Math.random() * routePool.length)];

  const ball = document.createElement("a");
  ball.className = "energy-ball";
  ball.href = destination.href;
  ball.setAttribute("aria-label", `passage to ${destination.title}`);
  ball.style.setProperty("--energy-x", `${startX}px`);
  ball.style.setProperty("--energy-y", `${startY}px`);
  ball.style.setProperty("--energy-size", `${size}px`);
  ball.style.setProperty(
    "--energy-color",
    energyColors[Math.floor(Math.random() * energyColors.length)],
  );
  energyField.append(ball);
  activeEnergyBalls += 1;

  const animation = ball.animate(
    [
      { opacity: 0, transform: `translate(-50%, -50%) scale(${startScale * 0.55})` },
      { opacity: orbOpacity, offset: 0.08, transform: `translate(-50%, -50%) scale(${startScale})` },
      { opacity: approachingViewer ? orbOpacity : orbOpacity * 0.56, offset: 0.52, transform: `translate(calc(-50% + ${endX * 0.5 + bendX}px), calc(-50% + ${endY * 0.5 + bendY}px)) scale(${middleScale})` },
      { opacity: approachingViewer ? orbOpacity * 0.92 : 0.04, transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(${endScale})` },
    ],
    { duration, easing: "linear", fill: "forwards" },
  );

  animation.finished.finally(() => {
    ball.remove();
    activeEnergyBalls -= 1;
  });
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
  distantShadow.classList.add("passing");
  window.setTimeout(() => distantShadow.classList.remove("passing"), 15500);
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
  element.animate(keyframes, { duration, easing: "linear" }).finished.finally(() => {
    element.remove();
    activeDenizens -= 1;
    if (element.dataset.largeShape === "true") activeLargeShapes -= 1;
  });
}

function spawnCrossingDenizen(type) {
  if (!denizenField || activeDenizens >= 6) return;
  const element = document.createElement("i");
  element.className = `denizen ${type}`;
  if (type === "pool-amoeba") {
    const wantsLarge = Math.random() < 0.68 && activeLargeShapes === 0;
    const sizeProgress = wantsLarge
      ? 0.58 + Math.random() * 0.42
      : Math.pow(Math.random(), 2.2) * 0.48;
    const width = 48 + sizeProgress * (window.innerWidth * 0.75 - 48);
    const height = width * (0.68 + Math.random() * 0.28);
    const form = ["", " blob-form-b", " blob-form-c"][Math.floor(Math.random() * 3)];
    element.className += form;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.filter = `blur(${(0.4 + sizeProgress * 24).toFixed(1)}px)`;
    if (wantsLarge) {
      element.dataset.largeShape = "true";
      activeLargeShapes += 1;
    }

    const anatomy = Math.floor(Math.random() * 4);
    if (anatomy !== 3) {
      element.insertAdjacentHTML("beforeend", '<b class="blob-eye blob-eye-a"></b><b class="blob-eye blob-eye-b"></b>');
    }
    if (anatomy === 0 || anatomy === 2) {
      element.insertAdjacentHTML("beforeend", '<b class="blob-mouth"></b>');
    }
    if (anatomy === 1) {
      element.insertAdjacentHTML("beforeend", '<b class="blob-fin blob-fin-a"></b><b class="blob-fin blob-fin-b"></b>');
    }
    if (anatomy === 2 || anatomy === 3) {
      element.insertAdjacentHTML("beforeend", '<b class="blob-tentacles"></b>');
    }
  }
  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -280 : window.innerWidth + 280;
  const endX = fromLeft ? window.innerWidth + 280 : -280;
  const startY = 50 + Math.random() * Math.max(80, window.innerHeight - 180);
  const endY = Math.max(20, Math.min(window.innerHeight - 100, startY + (-130 + Math.random() * 260)));
  const facing = fromLeft ? 1 : -1;
  const duration = 24000 + Math.random() * 26000;
  animateDenizen(
    element,
    [
      { opacity: 0, transform: `translate3d(${startX}px,${startY}px,0) scaleX(${facing})` },
      { opacity: 0.62, offset: 0.12 },
      { opacity: 0.62, offset: 0.84 },
      { opacity: 0, transform: `translate3d(${endX}px,${endY}px,0) scaleX(${facing})` },
    ],
    duration,
  );
}

function spawnJelly() {
  if (!denizenField || activeDenizens >= 6) return;
  const jelly = document.createElement("i");
  jelly.className = "denizen pool-jelly";
  const jellyWidth = 38 + Math.random() * 112;
  const jellyOpacity = 0.2 + Math.random() * 0.48;
  jelly.style.width = `${jellyWidth}px`;
  jelly.style.height = `${jellyWidth * (0.78 + Math.random() * 0.2)}px`;
  jelly.style.animationDuration = `${2.8 + Math.random() * 4.8}s`;
  const x = 40 + Math.random() * (window.innerWidth - 120);
  const drift = -80 + Math.random() * 160;
  animateDenizen(jelly, [
    { opacity: 0, transform: `translate3d(${x}px,${window.innerHeight + 100}px,0)` },
    { opacity: jellyOpacity, offset: 0.15, transform: `translate3d(${x + drift * 0.15}px,${window.innerHeight * 0.78}px,0)` },
    { opacity: jellyOpacity * 0.82, offset: 0.48, transform: `translate3d(${x - drift * 0.35}px,${window.innerHeight * 0.48}px,0)` },
    { opacity: jellyOpacity, offset: 0.82, transform: `translate3d(${x + drift}px,40px,0)` },
    { opacity: 0, transform: `translate3d(${x + drift * 1.2}px,-150px,0)` },
  ], 30000 + Math.random() * 22000);
}

function scheduleDenizen(delay = 3000 + Math.random() * 5300) {
  window.setTimeout(() => {
    const kinds = ["pool-ray", "dot-school", "ribbon-creature", "pool-amoeba", "pool-amoeba", "pool-amoeba", "pool-jelly"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === "pool-jelly") spawnJelly();
    else spawnCrossingDenizen(kind);
    scheduleDenizen();
  }, delay);
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
      const margin = 220;
      cellMotion.curiosity = {
        x: -margin + Math.random() * (window.innerWidth + margin * 2),
        y: -margin + Math.random() * (window.innerHeight + margin * 2),
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
      : 1.08 + Math.random() * 0.37;
    const nearness = (targetScale - 0.62) / 0.83;
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
    cellMotion.position.x = window.innerWidth * 0.67;
    cellMotion.position.y = window.innerHeight * 0.34;
    cellMotion.roamingReady = true;
  }

  maybeRetargetCell(time);

  const delta = cellMotion.lastTime
    ? Math.min(40, Math.max(16, time - cellMotion.lastTime))
    : 16;
  cellMotion.lastTime = time;

  const toCuriosityX = cellMotion.curiosity.x - cellMotion.position.x;
  const toCuriosityY = cellMotion.curiosity.y - cellMotion.position.y;
  const distanceToCuriosity = Math.max(1, Math.hypot(toCuriosityX, toCuriosityY));
  const intentX = toCuriosityX / distanceToCuriosity;
  const intentY = toCuriosityY / distanceToCuriosity;
  const desiredSpeed = 0.075 + Math.min(0.065, distanceToCuriosity / 7000);
  if (time >= cellMotion.bodySteerDelayUntil) {
    cellMotion.bodyHeading.x = lerp(cellMotion.bodyHeading.x, intentX, 0.025);
    cellMotion.bodyHeading.y = lerp(cellMotion.bodyHeading.y, intentY, 0.025);
  }
  const desiredVelocityX =
    cellMotion.bodyHeading.x * desiredSpeed +
    Math.sin(time * 0.00019) * 0.014;
  const desiredVelocityY =
    cellMotion.bodyHeading.y * desiredSpeed +
    Math.cos(time * 0.00023 + 1.4) * 0.012;

  cellMotion.velocity.x = lerp(cellMotion.velocity.x, desiredVelocityX, 0.11);
  cellMotion.velocity.y = lerp(cellMotion.velocity.y, desiredVelocityY, 0.11);

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
    0.008,
  );
  cellMotion.nucleusTravel.x = lerp(
    cellMotion.nucleusTravel.x,
    intentX * cellMotion.nucleusFlex.current,
    0.045,
  );
  cellMotion.nucleusTravel.y = lerp(
    cellMotion.nucleusTravel.y,
    intentY * cellMotion.nucleusFlex.current,
    0.045,
  );

  cellMotion.position.x += cellMotion.velocity.x * delta;
  cellMotion.position.y += cellMotion.velocity.y * delta;

  if (time - lastPolypCheck > 180) {
    const polypPositions = [0.11, 0.37, 0.69, 0.88];
    poolPolyps.forEach((polyp, index) => {
      const distance = Math.hypot(
        cellMotion.position.x - window.innerWidth * polypPositions[index],
        cellMotion.position.y - (window.innerHeight - 25),
      );
      polyp.classList.toggle("awake", distance < 240);
    });
    lastPolypCheck = time;
  }

  const orbitalSize = Math.min(
    window.innerWidth * (window.innerWidth < 900 ? 1.32 : 0.84),
    576,
  );
  const wrapMargin = orbitalSize * 0.58;

  if (cellMotion.position.x < -wrapMargin) {
    cellMotion.position.x = window.innerWidth + wrapMargin;
  } else if (cellMotion.position.x > window.innerWidth + wrapMargin) {
    cellMotion.position.x = -wrapMargin;
  }

  if (cellMotion.position.y < -wrapMargin) {
    cellMotion.position.y = window.innerHeight + wrapMargin;
  } else if (cellMotion.position.y > window.innerHeight + wrapMargin) {
    cellMotion.position.y = -wrapMargin;
  }

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

  orbital.style.cssText = `left:${cellMotion.position.x.toFixed(2)}px;top:${cellMotion.position.y.toFixed(2)}px;transform:translate3d(calc(-50% + ${cellMotion.drift.x.toFixed(2)}px),calc(-50% + ${cellMotion.drift.y.toFixed(2)}px),0)`;
  const nucleusX = cellMotion.pulse.nucleusX + cellMotion.nucleusTravel.x;
  const nucleusY = cellMotion.pulse.nucleusY + cellMotion.nucleusTravel.y;
  const depth = Math.max(0, Math.min(1, (cellMotion.pulse.scale - 0.62) / 0.83));
  const dotsShouldBeInFront = depth < 0.34;
  if (dotsShouldBeInFront !== cellMotion.dotsInFront) {
    canvas.style.zIndex = dotsShouldBeInFront ? "6" : "2";
    cellMotion.dotsInFront = dotsShouldBeInFront;
  }
  const depthBlur = Math.max(0, (0.34 - depth) / 0.34) * 3.2;
  const depthBrightness = 0.24 + depth * 0.86;
  orb.style.cssText = `transform:scale(${cellMotion.pulse.scale.toFixed(4)}) rotate(${cellMotion.pulse.tilt.toFixed(2)}deg);filter:blur(${depthBlur.toFixed(2)}px) brightness(${depthBrightness.toFixed(3)});--cell-glow-a:${cellMotion.pulse.glowA.toFixed(3)};--cell-glow-b:${cellMotion.pulse.glowB.toFixed(3)};--cell-membrane-scale:${cellMotion.pulse.membrane.toFixed(4)};--cell-membrane-alpha:${cellMotion.pulse.membraneAlpha.toFixed(3)};--cell-cytoplasm-rotate:${cellMotion.pulse.cytoplasmRotate.toFixed(2)}deg;--cell-cytoplasm-scale:${cellMotion.pulse.cytoplasmScale.toFixed(4)};--cell-nucleus-scale:${cellMotion.pulse.nucleusScale.toFixed(4)};--cell-nucleus-x:${nucleusX.toFixed(2)}px;--cell-nucleus-y:${nucleusY.toFixed(2)}px;--cell-filament-rotate:${cellMotion.pulse.filamentRotate.toFixed(2)}deg;--cell-vesicle-shift:${cellMotion.pulse.vesicleShift.toFixed(2)}px`;
}

function resize() {
  const pixelRatio = 1;
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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

const nodes = Array.from({ length: 140 }, (_, index) => ({
  orbit: 0.18 + Math.random() * 0.82,
  radius: 1 + Math.random() * 4,
  speed: 0.1 + Math.random() * 0.5,
  theta: Math.random() * Math.PI * 2,
  wobble: 16 + Math.random() * 46,
  bias: index % 3,
  dark: index % 2 === 0,
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

function drawNetwork(time) {
  const centerX = window.innerWidth * 0.54;
  const centerY = window.innerHeight * 0.52;
  nodes.forEach((node) => {
    const theta = node.theta + time * 0.00035 * node.speed;
    const radiusX = window.innerWidth * (0.16 + node.orbit * 0.33);
    const radiusY = window.innerHeight * (0.12 + node.orbit * 0.24);
    const wobbleX = Math.cos(theta * 2.1) * node.wobble;
    const wobbleY = Math.sin(theta * 1.7) * (node.wobble * 0.65);

    node.x = centerX + Math.cos(theta) * radiusX + wobbleX;
    node.y = centerY + Math.sin(theta) * radiusY + wobbleY;
  });

  nodes.forEach((node) => {
    context.beginPath();
    context.fillStyle = colorForNode(node.bias, node.dark ? 0.68 : 0.82, node.dark);
    context.shadowBlur = node.dark ? 4 : 9;
    context.shadowColor = colorForNode(node.bias, node.dark ? 0.2 : 0.38, node.dark);
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  });
}

let drawFilamentsThisFrame = false;

function animate(time) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  updateCell(time);
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
loadRoutes();
cellMotion.pulseFrom = { ...cellMotion.pulse };
cellMotion.pulseTarget = {
  scale: 1.14,
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
scheduleEnergyBall();
schedulePaletteShift();
scheduleAmbientEvent();
scheduleDenizen();
