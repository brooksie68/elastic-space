const canvas = document.getElementById("field");
const context = canvas.getContext("2d");
const filamentCanvas = document.getElementById("filament-field");
const filamentContext = filamentCanvas.getContext("2d");
const signalText = document.getElementById("signal-text");
const credoText = document.getElementById("credo-text");
const routeList = document.getElementById("route-list");
const actionButtons = [...document.querySelectorAll(".action[data-pulse]")];
const orbital = document.querySelector(".orbital");
const orb = document.querySelector(".orb");

const pointer = { x: 0, y: 0, active: false };
const state = { pulse: "descend" };
const cellMotion = {
  drift: { x: 0, y: 0 },
  curiosity: { x: 0, y: 0 },
  lastTime: 0,
  position: { x: 0, y: 0 },
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
  sighPending: false,
  pulseStart: 0,
  pulseDuration: 9000,
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
    title: "the chrome rift",
    meta: "shifting black and white, flashes, grinding air, distant chimes",
    href: "./src/worlds/chrome-rift/index.html",
  },
  {
    title: "pelagic lantern habitat",
    meta: "alien undersea glow, friendly creatures, low thrumming",
    href: "./src/worlds/pelagic-lantern-habitat/index.html",
  },
];

let routePool = [...routeFallbacks];

function pickRoutes(count, pool = routePool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderRoutes() {
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
  }

  if (time - cellMotion.pulseStart >= cellMotion.pulseDuration) {
    cellMotion.pulseFrom = { ...cellMotion.pulse };
    const pulseBias = Math.random();
    const deepBreath = pulseBias > 0.84 && !cellMotion.sighPending;
    const sigh = cellMotion.sighPending;
    const targetScale = deepBreath
      ? 1.3 + Math.random() * 0.14
      : sigh
        ? 0.76 + Math.random() * 0.06
        : 0.88 + Math.random() * 0.34;
    cellMotion.pulseTarget = {
      scale: targetScale,
      glowA: deepBreath ? 0.52 + Math.random() * 0.18 : 0.26 + Math.random() * 0.34,
      glowB: deepBreath ? 0.62 + Math.random() * 0.18 : 0.34 + Math.random() * 0.36,
      membrane: deepBreath ? 1.1 + Math.random() * 0.06 : 0.93 + Math.random() * 0.16,
      membraneAlpha: sigh ? 0.12 + Math.random() * 0.05 : 0.14 + Math.random() * 0.14,
      tilt: -7 + Math.random() * 14,
      cytoplasmRotate:
        cellMotion.pulse.cytoplasmRotate + 45 + Math.random() * 110,
      cytoplasmScale: deepBreath ? 1.08 + Math.random() * 0.05 : 0.95 + Math.random() * 0.14,
      nucleusScale: deepBreath ? 1.06 + Math.random() * 0.07 : 0.94 + Math.random() * 0.12,
      nucleusX: -5 + Math.random() * 10,
      nucleusY: -5 + Math.random() * 10,
      filamentRotate: -24 + Math.random() * 48,
      vesicleShift: -8 + Math.random() * 16,
    };
    cellMotion.pulseStart = time;
    cellMotion.pulseDuration = deepBreath
        ? 3400 + Math.random() * 1800
        : sigh
          ? 4000 + Math.random() * 2200
          : (pulseBias > 0.68 ? 1800 : 3600) + Math.random() * 3400;
    cellMotion.sighPending = deepBreath ? true : false;
    if (sigh) {
      cellMotion.sighPending = false;
    }
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
  const desiredSpeed = 0.075 + Math.min(0.065, distanceToCuriosity / 7000);
  const desiredVelocityX =
    (toCuriosityX / distanceToCuriosity) * desiredSpeed +
    Math.sin(time * 0.00019) * 0.014;
  const desiredVelocityY =
    (toCuriosityY / distanceToCuriosity) * desiredSpeed +
    Math.cos(time * 0.00023 + 1.4) * 0.012;

  cellMotion.velocity.x = lerp(cellMotion.velocity.x, desiredVelocityX, 0.11);
  cellMotion.velocity.y = lerp(cellMotion.velocity.y, desiredVelocityY, 0.11);

  cellMotion.position.x += cellMotion.velocity.x * delta;
  cellMotion.position.y += cellMotion.velocity.y * delta;

  const orbitalSize = Math.min(
    window.innerWidth * (window.innerWidth < 900 ? 0.66 : 0.42),
    288,
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
    (time - cellMotion.pulseStart) / cellMotion.pulseDuration,
  );
  const easedPulse = easeInOut(pulseProgress);
  const pulseWave =
    Math.sin(time * 0.00033) * 0.055 + Math.sin(time * 0.00057 + 1.2) * 0.03;

  cellMotion.pulse.scale =
    lerp(cellMotion.pulseFrom.scale, cellMotion.pulseTarget.scale, easedPulse) +
    pulseWave;
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

  orbital.style.left = `${cellMotion.position.x.toFixed(2)}px`;
  orbital.style.top = `${cellMotion.position.y.toFixed(2)}px`;
  orbital.style.transform = `translate3d(calc(-50% + ${cellMotion.drift.x.toFixed(2)}px), calc(-50% + ${cellMotion.drift.y.toFixed(2)}px), 0)`;
  orb.style.transform = `scale(${cellMotion.pulse.scale.toFixed(4)}) rotate(${cellMotion.pulse.tilt.toFixed(2)}deg)`;
  orb.style.setProperty("--cell-glow-a", cellMotion.pulse.glowA.toFixed(3));
  orb.style.setProperty("--cell-glow-b", cellMotion.pulse.glowB.toFixed(3));
  orb.style.setProperty(
    "--cell-membrane-scale",
    cellMotion.pulse.membrane.toFixed(4),
  );
  orb.style.setProperty(
    "--cell-membrane-alpha",
    cellMotion.pulse.membraneAlpha.toFixed(3),
  );
  orb.style.setProperty(
    "--cell-cytoplasm-rotate",
    `${cellMotion.pulse.cytoplasmRotate.toFixed(2)}deg`,
  );
  orb.style.setProperty(
    "--cell-cytoplasm-scale",
    cellMotion.pulse.cytoplasmScale.toFixed(4),
  );
  orb.style.setProperty(
    "--cell-nucleus-scale",
    cellMotion.pulse.nucleusScale.toFixed(4),
  );
  orb.style.setProperty(
    "--cell-nucleus-x",
    `${cellMotion.pulse.nucleusX.toFixed(2)}px`,
  );
  orb.style.setProperty(
    "--cell-nucleus-y",
    `${cellMotion.pulse.nucleusY.toFixed(2)}px`,
  );
  orb.style.setProperty(
    "--cell-filament-rotate",
    `${cellMotion.pulse.filamentRotate.toFixed(2)}deg`,
  );
  orb.style.setProperty(
    "--cell-vesicle-shift",
    `${cellMotion.pulse.vesicleShift.toFixed(2)}px`,
  );
}

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  filamentCanvas.width = window.innerWidth * window.devicePixelRatio;
  filamentCanvas.height = window.innerHeight * window.devicePixelRatio;
  filamentCanvas.style.width = `${window.innerWidth}px`;
  filamentCanvas.style.height = `${window.innerHeight}px`;
  filamentContext.setTransform(
    window.devicePixelRatio,
    0,
    0,
    window.devicePixelRatio,
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

const nodes = Array.from({ length: 28 }, (_, index) => ({
  orbit: 0.18 + Math.random() * 0.82,
  radius: 1 + Math.random() * 4,
  speed: 0.1 + Math.random() * 0.5,
  theta: Math.random() * Math.PI * 2,
  wobble: 16 + Math.random() * 46,
  bias: index % 3,
}));

const filaments = Array.from({ length: 7 }, (_, clusterIndex) => ({
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
  velocity: 0.00006 + Math.random() * 0.00016,
  wavelength: 0.0018 + Math.random() * 0.0027,
}));

function colorForNode(bias, alpha) {
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
    const length = window.innerWidth * (0.26 + cluster.progress);
    const travel = time * cluster.velocity;

    drawContext.save();
    drawContext.translate(centerX, centerY);
    drawContext.rotate(cluster.angle + Math.sin(travel * 2 + cluster.phase) * 0.08);

    for (let lineIndex = 0; lineIndex < cluster.lines; lineIndex += 1) {
      const offset =
        (lineIndex - (cluster.lines - 1) / 2) * cluster.spacing;
      const points = [];
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
        points.push({ x, y });
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
      drawContext.shadowBlur = 8;
      drawContext.shadowColor = strokeByBias[cluster.colorBias];
      drawContext.stroke();
      drawContext.shadowBlur = 0;

      if (lineIndex < cluster.lines - 1 && lineIndex < cluster.bridgeIndexes.length) {
        const bridgeIndex = cluster.bridgeIndexes[lineIndex];
        const bridgePoint = points[bridgeIndex];
        const bridgeDrift = cluster.spacing * (0.7 + lineIndex * 0.08);
        drawContext.beginPath();
        drawContext.moveTo(bridgePoint.x, bridgePoint.y);
        drawContext.lineTo(
          bridgePoint.x + cluster.spacing * 0.35,
          bridgePoint.y + bridgeDrift,
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
  const positions = nodes.map((node) => {
    const theta = node.theta + time * 0.00035 * node.speed;
    const radiusX = window.innerWidth * (0.16 + node.orbit * 0.33);
    const radiusY = window.innerHeight * (0.12 + node.orbit * 0.24);
    const wobbleX = Math.cos(theta * 2.1) * node.wobble;
    const wobbleY = Math.sin(theta * 1.7) * (node.wobble * 0.65);

    let x = centerX + Math.cos(theta) * radiusX + wobbleX;
    let y = centerY + Math.sin(theta) * radiusY + wobbleY;

    if (pointer.active) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.max(80, Math.hypot(dx, dy));
      const force = 1800 / distance;
      x += (dx / distance) * force;
      y += (dy / distance) * force;
    }

    return { ...node, x, y };
  });

  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i];
      const b = positions[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 180) {
        continue;
      }
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.strokeStyle = `rgba(143, 255, 225, ${0.14 - distance / 1800})`;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  positions.forEach((node) => {
    context.beginPath();
    context.fillStyle = colorForNode(node.bias, 0.82);
    context.shadowBlur = 18;
    context.shadowColor = colorForNode(node.bias, 0.45);
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  });
}

function animate(time) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  filamentContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  updateCell(time);
  drawBackdrop(time);
  drawNetwork(time);
  drawFilaments(time, filamentContext);
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

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("resize", () => {
  resize();
  renderRoutes();
});

resize();
renderRoutes();
loadRoutes();
setInterval(renderRoutes, 7000);
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
