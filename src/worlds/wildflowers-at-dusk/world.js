const canvas = document.getElementById("sky-field");
const cloudCanvas = document.getElementById("cloud-field");
let context = canvas.getContext("2d");
const screenContext = context;
const cloudScreenContext = cloudCanvas.getContext("2d");
const audioToggle = document.getElementById("audio-toggle");
let lastCloudTime = 0;
const cloudSprites = Array.from({ length: 6 }, (_, index) => {
  const image = new Image();
  image.src = `./assets/clouds/cloud-${index + 1}.png`;
  return image;
});
const cloudLayers = Array.from({ length: 7 }, (_, index) => createCloudLayer(index, true));

const rain = Array.from({ length: 230 }, (_, index) => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.82 + Math.random() * 0.5,
  length: 8 + Math.random() * 18,
  glow: 0.28 + Math.random() * 0.27,
  shape: index % 5 === 0 ? "drop" : index % 7 === 0 ? "bead" : "streak",
  size: 1.2 + Math.random() * 1.8,
}));

const streamers = Array.from({ length: 14 }, () => ({
  x: Math.random(),
  y: Math.random(),
  width: 90 + Math.random() * 220,
  hue: 180 + Math.random() * 180,
  speed: 0.0008 + Math.random() * 0.0014,
  phase: Math.random() * Math.PI * 2,
}));

const groundPalette = ["17, 52, 34", "16, 48, 49", "29, 35, 65", "34, 86, 108", "40, 59, 56", "21, 52, 55", "22, 65, 69"];
const pickGround = () => groundPalette[Math.floor(Math.random() * groundPalette.length)];
const accentFlowerColors = ["#fe8c6e", "#7d4e9a", "#3287c7"];
const pickAccent = () => (Math.random() < 0.32 ? accentFlowerColors[Math.floor(Math.random() * accentFlowerColors.length)] : null);

const flowerVarieties = [
  { name: "cosmos", petals: 8, color: "#ff9fc8", center: "#ffd45c", shape: "round" },
  { name: "cornflower", petals: 12, color: "#719dff", center: "#273d91", shape: "point" },
  { name: "poppy", petals: 4, color: "#ff5d63", center: "#311d38", shape: "wide" },
  { name: "daisy", petals: 14, color: "#fff4dc", center: "#ffc64d", shape: "slender" },
  { name: "aster", petals: 16, color: "#b49aff", center: "#f4cf58", shape: "slender" },
  { name: "buttercup", petals: 5, color: "#ffd94f", center: "#e89b2e", shape: "round" },
  { name: "chicory", petals: 10, color: "#82c8ff", center: "#436ebd", shape: "notched" },
  { name: "clover", petals: 18, color: "#e996ce", center: "#fff0d7", shape: "cluster" },
  { name: "lupine", petals: 11, color: "#9f7cf4", center: "#d7b8ff", shape: "spire" },
  { name: "foxglove", petals: 7, color: "#f38cb7", center: "#7e365c", shape: "bells" },
  { name: "marigold", petals: 13, color: "#ff9f35", center: "#c95324", shape: "ruffle" },
  { name: "forget-me-not", petals: 5, color: "#79bfff", center: "#ffe873", shape: "tiny" },
];

const flowers = Array.from({ length: 84 }, (_, index) => ({
  x: (index + Math.random() * 0.7) / 83,
  height: 42 + Math.random() * 150,
  bloom: 5 + Math.random() * 13,
  lean: -0.22 + Math.random() * 0.44,
  variety: flowerVarieties[index % flowerVarieties.length],
  depth: 0.65 + Math.random() * 0.5,
  stem: ["straight", "branching", "arching", "leafy"][index % 4],
  cluster: index % 9 === 0 ? 3 + (index % 3) : 1,
  colorOverride: pickAccent(),
}));
const flowersByDepth = [...flowers].sort((a, b) => a.depth - b.depth);

const grasses = Array.from({ length: 200 }, (_, index) => ({
  x: (index + Math.random()) / 200,
  height: 18 + Math.random() * 72,
  spread: 4 + Math.random() * 14,
  blades: 3 + Math.floor(Math.random() * 6),
  seedHead: index % 5 === 0,
  depth: 0.55 + Math.random() * 0.65,
  color: pickGround(),
}));

const ferns = Array.from({ length: 18 }, (_, index) => ({
  x: (index + 0.4 + Math.random() * 0.4) / 18,
  height: 24 + Math.random() * 48,
  spread: 18 + Math.random() * 24,
  lean: -0.35 + Math.random() * 0.7,
  color: pickGround(),
}));

const mounds = Array.from({ length: 16 }, (_, index) => ({
  x: (index + Math.random() * 0.6) / 15,
  width: 34 + Math.random() * 72,
  height: 14 + Math.random() * 28,
  kind: index % 3,
  color: pickGround(),
  bladeColor: pickGround(),
}));

const shrubs = Array.from({ length: 9 }, (_, index) => ({
  x: (index + 0.5 + Math.random() * 0.3) / 9,
  width: 42 + Math.random() * 58,
  height: 36 + Math.random() * 54,
  berries: index % 3 === 0,
  color: pickGround(),
}));

const vines = Array.from({ length: 12 }, (_, index) => ({
  x: (index + Math.random() * 0.7) / 12,
  width: 42 + Math.random() * 76,
  rise: 10 + Math.random() * 24,
  blossoms: index % 3 === 0,
  color: pickGround(),
}));

const backFlowerRows = [
  { offset: 16, scale: 0.68, blur: 0.6, brightness: 78, count: 26 },
  { offset: 36, scale: 0.52, blur: 1.2, brightness: 64, count: 22 },
  { offset: 56, scale: 0.4, blur: 1.9, brightness: 50, count: 18 },
].map((row, rowIndex) => ({
  ...row,
  flowers: Array.from({ length: row.count }, (_, index) => ({
    x: (index + Math.random() * 0.85) / row.count,
    height: (30 + Math.random() * 80) * row.scale,
    bloom: (5 + Math.random() * 11) * row.scale,
    lean: -0.2 + Math.random() * 0.4,
    variety: flowerVarieties[(index * 5 + rowIndex) % flowerVarieties.length],
    depth: 0.5 + Math.random() * 0.25,
    stem: "straight",
    cluster: 1,
    colorOverride: pickAccent(),
  })),
}));

const audioState = {
  context: null,
  started: false,
  voiceTimer: 0,
};

const poem =
  "This is thy hour O Soul, thy free flight into the wordless, away from books, away from art, the day erased, the lesson done.";

function resize() {
  [canvas, cloudCanvas].forEach((target) => {
    target.width = window.innerWidth * window.devicePixelRatio;
    target.height = window.innerHeight * window.devicePixelRatio;
    target.style.width = `${window.innerWidth}px`;
    target.style.height = `${window.innerHeight}px`;
  });
  screenContext.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  cloudScreenContext.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  renderBackFlowerRows();
  renderTreeLayer();
}

function drawSky(time) {
  const glow = context.createRadialGradient(
    window.innerWidth * 0.55,
    window.innerHeight * 0.36,
    20,
    window.innerWidth * 0.55,
    window.innerHeight * 0.36,
    window.innerWidth * 0.42,
  );
  glow.addColorStop(0, "rgba(255, 238, 182, 0.26)");
  glow.addColorStop(0.25, "rgba(255, 176, 162, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);

}

function drawCloud(x, y, scale, alpha, flip = 1, variant = 0) {
  context.save();
  context.translate(x, y);
  context.scale(scale * flip, scale);
  const shade = context.createLinearGradient(0, -65, 0, 55);
  shade.addColorStop(0, `rgba(38, 55, 125, ${alpha})`);
  shade.addColorStop(0.62, `rgba(102, 61, 137, ${alpha})`);
  shade.addColorStop(1, `rgba(235, 80, 122, ${alpha * 0.96})`);
  context.fillStyle = shade;
  context.beginPath();
  if (variant === 0) {
    context.moveTo(-160, 28);
    context.bezierCurveTo(-135, 4, -111, 8, -96, -7);
    context.bezierCurveTo(-80, -37, -48, -29, -36, -51);
    context.bezierCurveTo(-18, -83, 20, -92, 40, -59);
    context.bezierCurveTo(62, -78, 91, -58, 88, -29);
    context.bezierCurveTo(125, -43, 162, -14, 151, 22);
    context.bezierCurveTo(102, 35, 50, 27, 9, 39);
    context.bezierCurveTo(-47, 27, -105, 43, -160, 28);
  } else if (variant === 1) {
    context.moveTo(-175, 22);
    context.bezierCurveTo(-145, -4, -119, 7, -97, -12);
    context.bezierCurveTo(-71, -34, -39, -15, -12, -28);
    context.bezierCurveTo(17, -44, 46, -15, 69, -27);
    context.bezierCurveTo(102, -45, 124, -13, 151, -8);
    context.bezierCurveTo(170, -4, 183, 10, 176, 26);
    context.bezierCurveTo(117, 37, 65, 27, 13, 34);
    context.bezierCurveTo(-42, 26, -115, 40, -175, 22);
  } else if (variant === 2) {
    context.moveTo(-118, 31);
    context.bezierCurveTo(-111, 2, -88, -6, -70, 2);
    context.bezierCurveTo(-67, -32, -44, -52, -23, -40);
    context.bezierCurveTo(-22, -88, 9, -120, 34, -91);
    context.bezierCurveTo(51, -115, 76, -83, 69, -51);
    context.bezierCurveTo(98, -58, 123, -22, 113, 7);
    context.bezierCurveTo(139, 8, 145, 26, 127, 39);
    context.bezierCurveTo(72, 29, 18, 43, -28, 33);
    context.bezierCurveTo(-60, 44, -90, 35, -118, 31);
  } else {
    context.moveTo(-150, 18);
    context.bezierCurveTo(-121, 3, -99, 8, -80, -4);
    context.bezierCurveTo(-52, -20, -25, -4, -2, -13);
    context.bezierCurveTo(31, -25, 61, -5, 87, -14);
    context.bezierCurveTo(119, -23, 143, -1, 151, 18);
    context.bezierCurveTo(98, 29, 46, 22, 3, 31);
    context.bezierCurveTo(-45, 22, -98, 33, -150, 18);
  }
  context.closePath();
  context.fill();
  context.globalAlpha = alpha * 0.42;
  context.fillStyle = "#e4477d";
  context.beginPath();
  context.moveTo(-142, 20);
  context.bezierCurveTo(-91, 34, -50, 19, -12, 31);
  context.bezierCurveTo(31, 18, 77, 36, 142, 17);
  context.bezierCurveTo(96, 46, -90, 48, -142, 20);
  context.fill();
  context.globalAlpha = alpha * 0.72;
  context.strokeStyle = "#ff9a67";
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(-132, 29);
  context.bezierCurveTo(-88, 37, -65, 27, -34, 36);
  context.bezierCurveTo(7, 26, 33, 39, 70, 30);
  context.bezierCurveTo(96, 34, 118, 28, 134, 24);
  context.stroke();
  context.restore();
}

function drawClouds(time) {
  const delta = Math.min(40, lastCloudTime ? time - lastCloudTime : 16.7);
  lastCloudTime = time;
  cloudLayers.forEach((layer, index) => {
    layer.x += layer.speed * delta;
    layer.alpha += (layer.targetAlpha - layer.alpha) * Math.min(1, delta / 6000);

    if (layer.x > window.innerWidth + layer.width * 0.55) {
      Object.assign(layer, createCloudLayer(index, false));
    }

    if (!layer.baked && layer.sprite.complete && layer.sprite.naturalWidth) {
      bakeCloudLayer(layer);
    }
    if (layer.baked) {
      context.save();
      context.globalAlpha = layer.alpha;
      context.drawImage(
        layer.baked,
        layer.x - layer.width * 0.5 - layer.pad,
        layer.y - layer.pad,
        layer.width + layer.pad * 2,
        layer.height + layer.pad * 2,
      );
      context.restore();
    }
  });
}

function bakeCloudLayer(layer) {
  const bakeScale = 0.5;
  const pad = layer.blur * 2 + 8;
  const baked = document.createElement("canvas");
  baked.width = Math.max(1, Math.ceil((layer.width + pad * 2) * bakeScale));
  baked.height = Math.max(1, Math.ceil((layer.height + pad * 2) * bakeScale));
  const bakeContext = baked.getContext("2d");
  bakeContext.filter = `blur(${layer.blur * bakeScale}px) saturate(78%) contrast(88%)`;
  bakeContext.drawImage(layer.sprite, pad * bakeScale, pad * bakeScale, layer.width * bakeScale, layer.height * bakeScale);
  layer.baked = baked;
  layer.pad = pad;
}

function createCloudLayer(index, initial) {
  const depth = Math.min(1, index / 6);
  const spriteIndex = index < 2 ? index : Math.floor(Math.random() * 6);
  const scale = 0.42 + (1 - depth) * 0.48 + Math.random() * 0.12;
  const width = (300 + Math.random() * 250) * scale * 5.4;
  const height = Math.min(width * (0.34 + Math.random() * 0.1), window.innerHeight * 0.42);
  const targetAlpha = 0.25 + (1 - depth) * 0.2;
  const maxY = Math.max(window.innerHeight * 0.03, window.innerHeight * 0.52 - height);
  return {
    sprite: cloudSprites[spriteIndex],
    x: initial ? Math.random() * window.innerWidth : -width * (0.52 + Math.random() * 0.2),
    y: window.innerHeight * 0.02 + Math.random() * Math.max(1, maxY - window.innerHeight * 0.02),
    width,
    height,
    speed: 0.005 + (1 - depth) * 0.008 + Math.random() * 0.004,
    blur: 3.5 + depth * 6.5,
    alpha: initial ? targetAlpha : 0.02,
    targetAlpha,
    baked: null,
    pad: 0,
  };
}

function createCloudSprite(depth) {
  const sprite = document.createElement("canvas");
  sprite.width = 640;
  sprite.height = 300;
  const cloud = sprite.getContext("2d");
  const lobes = 7 + Math.floor(Math.random() * 7);
  const baseY = 205 + Math.random() * 20;
  const centers = [];

  for (let lobe = 0; lobe < lobes; lobe += 1) {
    const t = lobe / Math.max(1, lobes - 1);
    const edgeTaper = Math.sin(t * Math.PI);
    centers.push({
      x: 52 + t * 536 + (Math.random() - 0.5) * 34,
      y: baseY - edgeTaper * (56 + Math.random() * 75) + (Math.random() - 0.5) * 20,
      rx: 45 + Math.random() * 46 + edgeTaper * 18,
      ry: 29 + Math.random() * 38 + edgeTaper * 20,
    });
  }

  cloud.filter = `blur(${1.4 + depth * 1.5}px)`;
  const body = cloud.createLinearGradient(0, 35, 0, 255);
  body.addColorStop(0, depth > 0.55 ? "#6e568c" : "#8770a3");
  body.addColorStop(0.55, depth > 0.55 ? "#554477" : "#685081");
  body.addColorStop(1, depth > 0.55 ? "#75486f" : "#a95178");
  cloud.fillStyle = body;
  centers.forEach(({ x, y, rx, ry }) => {
    cloud.beginPath();
    cloud.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    cloud.fill();
  });
  cloud.beginPath();
  cloud.ellipse(320, baseY + 5, 285, 48, 0, 0, Math.PI * 2);
  cloud.fill();

  cloud.globalAlpha = 0.5 - depth * 0.18;
  cloud.fillStyle = "#c580a4";
  centers.filter((_, i) => i % 2 === 0).forEach(({ x, y, rx, ry }) => {
    cloud.beginPath();
    cloud.ellipse(x - rx * 0.14, y - ry * 0.22, rx * 0.68, ry * 0.52, -0.12, 0, Math.PI * 2);
    cloud.fill();
  });

  cloud.globalAlpha = 0.44 - depth * 0.12;
  cloud.fillStyle = "#ff9877";
  cloud.beginPath();
  cloud.ellipse(320, baseY + 27, 268, 18, 0, 0, Math.PI * 2);
  cloud.fill();

  cloud.globalAlpha = 0.28;
  cloud.fillStyle = "#3d3569";
  centers.filter((_, i) => i % 3 === 1).forEach(({ x, y, rx, ry }) => {
    cloud.beginPath();
    cloud.ellipse(x + rx * 0.18, y + ry * 0.25, rx * 0.62, ry * 0.42, 0.1, 0, Math.PI * 2);
    cloud.fill();
  });

  cloud.filter = "none";
  cloud.globalAlpha = 1;
  return sprite;
}

let treeLayer = null;

function renderTreeLayer() {
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, window.innerWidth);
  layer.height = Math.max(1, window.innerHeight);
  context = layer.getContext("2d");
  drawBranches(0);
  context = screenContext;
  treeLayer = layer;
}

function drawTreeLayer(time) {
  if (!treeLayer) return;
  const sway = Math.sin(time * 0.0003) * 1.6;
  context.drawImage(treeLayer, sway * 0.4, sway);
}

function drawBranches(time) {
  context.save();
  context.strokeStyle = "rgba(10, 21, 48, 0.96)";
  context.fillStyle = "rgba(11, 30, 62, 0.94)";
  context.lineCap = "round";
  [[window.innerWidth, 12, -1], [window.innerWidth, window.innerHeight * 0.27, -1], [0, -8, 1]].forEach(([originX, originY, direction], side) => {
    const sway = Math.sin(time * 0.00035 + side) * 3;
    context.lineWidth = side === 0 ? 15 : 9;
    context.beginPath();
    context.moveTo(originX, originY);
    context.bezierCurveTo(originX + direction * 55, originY + 12, originX + direction * 118, originY + 58, originX + direction * (185 - side * 15), originY + 116 + sway);
    context.stroke();
    for (let cluster = 0; cluster < 12; cluster += 1) {
      const t = (cluster + 1) / 13;
      const x = originX + direction * (28 + t * 160);
      const y = originY + 12 + t * 103 + Math.sin(cluster * 2.1) * 15;
      for (let needle = 0; needle < 9; needle += 1) {
        const angle = (needle / 9) * Math.PI * 2;
        context.save();
        context.translate(x + Math.cos(angle) * (8 + cluster % 4), y + Math.sin(angle) * 7);
        context.rotate(angle + direction * 0.25);
        context.beginPath();
        context.ellipse(8, 0, 15 - (cluster % 3), 3.8, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  });
  context.restore();
  drawCedar(time);
}

function drawCedar(time) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const sway = Math.sin(time * 0.00022) * 2;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  const bark = context.createLinearGradient(width - 145, 0, width, 0);
  bark.addColorStop(0, "rgba(18, 25, 40, 0.88)");
  bark.addColorStop(0.55, "rgba(35, 29, 43, 0.96)");
  bark.addColorStop(1, "rgba(10, 18, 34, 0.98)");
  context.strokeStyle = bark;
  context.lineWidth = 38;
  context.beginPath();
  context.moveTo(width + 25, height * 0.96);
  context.bezierCurveTo(width - 8, height * 0.7, width - 45, height * 0.42, width - 76 + sway, -35);
  context.stroke();

  const limbs = [
    { y: 0.18, reach: 245, rise: -42, thick: 15 },
    { y: 0.3, reach: 330, rise: 8, thick: 18 },
    { y: 0.43, reach: 285, rise: -18, thick: 16 },
    { y: 0.56, reach: 380, rise: 25, thick: 19 },
    { y: 0.69, reach: 270, rise: -8, thick: 17 },
    { y: 0.8, reach: 220, rise: 30, thick: 15 },
  ];

  limbs.forEach((limb, limbIndex) => {
    const baseX = width - 22 - limb.y * 58;
    const baseY = height * limb.y;
    const tipX = width - limb.reach;
    const tipY = baseY + limb.rise + sway;
    context.strokeStyle = "rgba(18, 23, 36, 0.96)";
    context.lineWidth = limb.thick;
    context.beginPath();
    context.moveTo(baseX, baseY);
    context.bezierCurveTo(baseX - limb.reach * 0.25, baseY - 20, tipX + limb.reach * 0.28, tipY + 16, tipX, tipY);
    context.stroke();

    for (let twig = 1; twig < 7; twig += 1) {
      const t = twig / 7;
      const tx = baseX + (tipX - baseX) * t;
      const ty = baseY + (tipY - baseY) * t - Math.sin(t * Math.PI) * 14;
      const side = twig % 2 ? -1 : 1;
      const twigLength = 45 + (1 - t) * 28;
      context.lineWidth = 4.5 - t * 1.8;
      context.beginPath();
      context.moveTo(tx, ty);
      context.quadraticCurveTo(tx - 18, ty + side * 8, tx - twigLength, ty + side * (26 + limbIndex % 3 * 5));
      context.stroke();

      context.fillStyle = `rgba(${12 + limbIndex * 2}, ${38 + twig * 2}, ${48 + twig * 3}, 0.94)`;
      for (let spray = 0; spray < 8; spray += 1) {
        const st = spray / 7;
        const sx = tx - twigLength * st;
        const sy = ty + side * (26 + limbIndex % 3 * 5) * st;
        context.save();
        context.translate(sx, sy);
        context.rotate(side * 0.35 + (spray - 3.5) * 0.09);
        context.beginPath();
        context.ellipse(-8, 0, 15 - st * 4, 4.2, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  });

  context.strokeStyle = "rgba(104, 69, 72, 0.26)";
  context.lineWidth = 3;
  for (let mark = 0; mark < 10; mark += 1) {
    const y = height * (0.14 + mark * 0.077);
    const x = width - 65 + mark * 3;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 24, y + 9);
    context.stroke();
  }
  context.restore();
}

function drawLandscape() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  context.save();
  context.filter = "blur(6px)";
  context.fillStyle = "rgba(38, 40, 83, 0.5)";
  context.beginPath();
  context.moveTo(0, height * 0.83);
  context.bezierCurveTo(width * 0.035, height * 0.77, width * 0.06, height * 0.69, width * 0.1, height * 0.7);
  context.bezierCurveTo(width * 0.145, height * 0.73, width * 0.18, height * 0.79, width * 0.24, height * 0.75);
  context.bezierCurveTo(width * 0.275, height * 0.68, width * 0.3, height * 0.6, width * 0.335, height * 0.58);
  context.bezierCurveTo(width * 0.37, height * 0.62, width * 0.4, height * 0.74, width * 0.455, height * 0.76);
  context.bezierCurveTo(width * 0.5, height * 0.73, width * 0.54, height * 0.64, width * 0.58, height * 0.62);
  context.bezierCurveTo(width * 0.63, height * 0.65, width * 0.67, height * 0.76, width * 0.715, height * 0.77);
  context.bezierCurveTo(width * 0.76, height * 0.72, width * 0.8, height * 0.62, width * 0.845, height * 0.6);
  context.bezierCurveTo(width * 0.9, height * 0.66, width * 0.94, height * 0.76, width, height * 0.79);
  context.lineTo(width, height * 0.91);
  context.lineTo(0, height * 0.91);
  context.closePath();
  context.fill();
  context.restore();

  drawHillLayer(height * 0.77, 20, "rgba(35, 54, 72, 0.54)", 4.2, 0.004, 0.8);
  drawHillLayer(height * 0.82, 28, "rgba(28, 62, 61, 0.64)", 2.8, 0.0065, 2.1);
  drawHillLayer(height * 0.865, 35, "rgba(24, 69, 53, 0.76)", 1.6, 0.009, 4.4);
  drawHillLayer(height * 0.9, 24, "rgba(18, 61, 43, 0.88)", 0.6, 0.013, 1.3);

  drawDistantFauna();
}

function drawHillLayer(baseY, amplitude, color, blur, frequency, phase) {
  context.save();
  context.filter = `blur(${blur}px)`;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, window.innerHeight);
  context.lineTo(0, baseY);
  for (let x = 0; x <= window.innerWidth; x += 18) {
    const y = baseY - Math.sin(x * frequency + phase) * amplitude - Math.sin(x * frequency * 0.43 + phase * 2) * amplitude * 0.55;
    context.lineTo(x, y);
  }
  context.lineTo(window.innerWidth, window.innerHeight);
  context.closePath();
  context.fill();
  context.restore();
}

function drawDistantFauna() {
  const height = window.innerHeight;
  context.save();
  context.fillStyle = "rgba(12, 31, 31, 0.72)";
  [[0.21, 0.845, 0.8], [0.64, 0.868, 1], [0.72, 0.86, 0.72]].forEach(([px, py, scale]) => {
    const x = window.innerWidth * px;
    const y = height * py;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.beginPath();
    context.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(3, -7, 2, 7);
    context.beginPath();
    context.arc(5, -8, 2.2, 0, Math.PI * 2);
    context.fill();
    context.fillRect(-4, 1, 1.2, 7);
    context.fillRect(3, 1, 1.2, 7);
    context.restore();
  });

  context.strokeStyle = "rgba(21, 32, 53, 0.48)";
  context.lineWidth = 1.1;
  [[0.38, 0.69], [0.41, 0.675], [0.76, 0.72]].forEach(([px, py]) => {
    const x = window.innerWidth * px;
    const y = height * py;
    context.beginPath();
    context.arc(x - 3, y, 4, Math.PI * 1.08, Math.PI * 1.86);
    context.arc(x + 4, y, 4, Math.PI * 1.14, Math.PI * 1.92);
    context.stroke();
  });
  context.restore();
}

function drawRain(time) {
  rain.forEach((drop, index) => {
    const x = drop.x * window.innerWidth;
    const baseY = (drop.y * window.innerHeight + time * drop.speed) % (window.innerHeight + 80);
    const y = window.innerHeight - baseY;
    const rainColor = `rgba(225, 239, 255, ${drop.glow})`;
    if (drop.shape === "drop") {
      context.fillStyle = rainColor;
      context.beginPath();
      context.moveTo(x, y - drop.size * 2.4);
      context.bezierCurveTo(x + drop.size * 1.5, y - drop.size * 0.4, x + drop.size, y + drop.size, x, y + drop.size * 1.2);
      context.bezierCurveTo(x - drop.size, y + drop.size, x - drop.size * 1.5, y - drop.size * 0.4, x, y - drop.size * 2.4);
      context.fill();
    } else if (drop.shape === "bead") {
      context.fillStyle = rainColor;
      context.beginPath();
      context.ellipse(x, y, drop.size * 0.65, drop.size * 1.2, 0.12, 0, Math.PI * 2);
      context.fill();
    } else {
      context.strokeStyle = rainColor;
      context.lineWidth = 0.9 + (index % 2) * 0.4;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 2, y - drop.length);
      context.stroke();
    }
  });
}

function drawField(time) {
  const groundY = window.innerHeight * 0.91;

  context.fillStyle = "rgba(8, 23, 24, 0.9)";
  context.beginPath();
  context.moveTo(0, window.innerHeight);
  context.lineTo(0, groundY + 28);
  for (let x = 0; x <= window.innerWidth; x += 30) {
    const y = groundY + Math.sin(x * 0.009) * 8 + Math.sin(x * 0.021 + 1.7) * 4;
    context.lineTo(x, y);
  }
  context.lineTo(
    window.innerWidth,
    groundY + Math.sin(window.innerWidth * 0.009) * 8 + Math.sin(window.innerWidth * 0.021 + 1.7) * 4,
  );
  context.lineTo(window.innerWidth, window.innerHeight);
  context.closePath();
  context.fill();

  drawShrubs(groundY, time);
  drawBackFlowers(groundY, time);
  drawFerns(groundY, time);
  drawGrasses(groundY, time, false);

  flowersByDepth.forEach((flower, index) => {
    const x = flower.x * window.innerWidth;
    const sway = Math.sin(time * 0.0016 + index * 0.7) * flower.lean;
    const topY = groundY - flower.height;
    drawFlowerStem(x, groundY, topY, sway, flower, time, index);
  });

  drawMounds(groundY, time);
  drawVines(groundY, time);
  drawGrasses(groundY, time, true);
}

function renderBackFlowerRows() {
  backFlowerRows.forEach((row, rowIndex) => {
    const rowCanvas = document.createElement("canvas");
    rowCanvas.width = Math.max(1, window.innerWidth);
    rowCanvas.height = 170;
    const baseY = rowCanvas.height - 24;
    context = rowCanvas.getContext("2d");
    row.flowers.forEach((flower, index) => {
      const x = flower.x * rowCanvas.width;
      drawFlowerStem(x, baseY, baseY - flower.height, flower.lean * 0.4, flower, 0, index + rowIndex * 31);
    });
    context = screenContext;
    row.canvas = rowCanvas;
    row.baseY = baseY;
  });
}

function drawBackFlowers(groundY, time) {
  for (let rowIndex = backFlowerRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const row = backFlowerRows[rowIndex];
    if (!row.canvas) continue;
    const swayX = Math.sin(time * 0.0004 + rowIndex * 1.7) * 2.5;
    context.save();
    context.filter = `blur(${row.blur}px) brightness(${row.brightness}%) saturate(76%)`;
    context.drawImage(row.canvas, swayX, groundY - row.offset - row.baseY);
    context.restore();
  }
}

function drawVines(groundY, time) {
  vines.forEach((vine, index) => {
    const x = vine.x * window.innerWidth;
    const sway = Math.sin(time * 0.00025 + index) * 2;
    context.strokeStyle = `rgba(${vine.color}, 0.85)`;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x - vine.width * 0.5, groundY + 3);
    context.bezierCurveTo(x - vine.width * 0.22, groundY - vine.rise, x + vine.width * 0.12, groundY + 8, x + vine.width * 0.5 + sway, groundY - vine.rise * 0.55);
    context.stroke();
    for (let leaf = 0; leaf < 7; leaf += 1) {
      const t = leaf / 6;
      const lx = x - vine.width * 0.5 + vine.width * t;
      const ly = groundY - Math.sin(t * Math.PI * 2) * vine.rise * 0.45;
      context.save();
      context.translate(lx, ly);
      context.rotate((leaf % 2 ? 1 : -1) * 0.65);
      context.fillStyle = `rgba(${vine.color}, 0.82)`;
      context.beginPath();
      context.ellipse(5, 0, 7, 2.6, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
      if (vine.blossoms && leaf % 2 === 0) {
        context.fillStyle = "rgba(104, 98, 152, 0.78)";
        context.beginPath();
        context.arc(lx, ly - 4, 2.5, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
}

function drawFlowerStem(x, groundY, topY, sway, flower, time, index) {
  const tipX = x + sway * 32;
  context.strokeStyle = `rgba(24, 60, 50, ${0.58 + flower.depth * 0.26})`;
  context.lineWidth = (flower.stem === "branching" ? 1.7 : 1.15) * flower.depth;
  context.beginPath();
  context.moveTo(x, groundY + 18);
  context.quadraticCurveTo(x + sway * 75, groundY - flower.height * 0.46, tipX, topY);
  context.stroke();

  if (flower.stem === "leafy" || flower.stem === "arching") {
    for (let leaf = 0; leaf < 3; leaf += 1) {
      const t = 0.28 + leaf * 0.18;
      const ly = groundY - flower.height * t;
      const side = leaf % 2 ? 1 : -1;
      context.save();
      context.translate(x + sway * 30 * t, ly);
      context.rotate(side * (0.55 + flower.lean));
      context.fillStyle = "rgba(33, 72, 58, 0.78)";
      context.beginPath();
      context.ellipse(side * 7, 0, 10 * flower.depth, 3.2 * flower.depth, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  if (flower.stem === "branching") {
    [-1, 1].forEach((side, branch) => {
      const by = topY + flower.height * (0.16 + branch * 0.11);
      const bx = tipX + side * (13 + flower.bloom * 0.7);
      context.beginPath();
      context.moveTo(tipX + sway * 6, by + 15);
      context.quadraticCurveTo(tipX + side * 8, by + 4, bx, by);
      context.stroke();
      const sideFlower = { ...flower, bloom: flower.bloom * 0.58, depth: flower.depth * 0.92 };
      drawBloom(bx, by, sideFlower, time, index + branch * 17);
    });
  }

  for (let bloomIndex = 0; bloomIndex < flower.cluster; bloomIndex += 1) {
    const angle = (bloomIndex / flower.cluster) * Math.PI * 2;
    const radius = bloomIndex === 0 ? 0 : flower.bloom * 0.75;
    const clustered = { ...flower, bloom: bloomIndex === 0 ? flower.bloom : flower.bloom * 0.62 };
    drawBloom(tipX + Math.cos(angle) * radius, topY + Math.sin(angle) * radius * 0.5, clustered, time, index + bloomIndex);
  }
}

function drawGrasses(groundY, time, foreground) {
  grasses.filter((grass) => (foreground ? grass.depth >= 0.92 : grass.depth < 0.92)).forEach((grass, index) => {
    const x = grass.x * window.innerWidth;
    const sway = Math.sin(time * 0.00045 + index) * grass.spread * 0.15;
    context.strokeStyle = `rgba(${grass.color}, ${foreground ? 0.9 : 0.58})`;
    context.lineWidth = foreground ? 1.35 : 0.85;
    for (let blade = 0; blade < grass.blades; blade += 1) {
      const offset = (blade - grass.blades / 2) * 2.2;
      const lean = ((blade / Math.max(1, grass.blades - 1)) - 0.5) * grass.spread + sway;
      context.beginPath();
      context.moveTo(x + offset, groundY + 16);
      context.quadraticCurveTo(x + lean * 0.4, groundY - grass.height * 0.48, x + lean, groundY - grass.height * (0.72 + blade % 3 * 0.12));
      context.stroke();
    }
    if (grass.seedHead) {
      context.fillStyle = "rgba(154, 130, 73, 0.72)";
      for (let seed = 0; seed < 5; seed += 1) {
        context.beginPath();
        context.ellipse(x + sway + (seed % 2 ? 2 : -2), groundY - grass.height + seed * 4, 2.8, 1.2, seed % 2 ? 0.6 : -0.6, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
}

function drawFerns(groundY, time) {
  ferns.forEach((fern, index) => {
    const x = fern.x * window.innerWidth;
    const lean = fern.lean * fern.spread + Math.sin(time * 0.0003 + index) * 2;
    context.strokeStyle = `rgba(${fern.color}, 0.82)`;
    context.fillStyle = `rgba(${fern.color}, 0.72)`;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(x, groundY + 10);
    context.quadraticCurveTo(x + lean * 0.25, groundY - fern.height * 0.55, x + lean, groundY - fern.height);
    context.stroke();
    for (let leaf = 2; leaf < 9; leaf += 1) {
      const t = leaf / 10;
      const cx = x + lean * t;
      const cy = groundY - fern.height * t;
      const size = fern.spread * (1 - t * 0.65);
      [-1, 1].forEach((side) => {
        context.beginPath();
        context.ellipse(cx + side * size * 0.38, cy, size * 0.42, 2.8, side * -0.25, 0, Math.PI * 2);
        context.fill();
      });
    }
  });
}

function drawMounds(groundY, time) {
  mounds.forEach((mound, index) => {
    const x = mound.x * window.innerWidth;
    const sway = Math.sin(time * 0.00035 + index) * 2;
    context.fillStyle = `rgba(${mound.color}, 0.9)`;

    const lobes = 5 + (index % 3);
    for (let lobe = 0; lobe < lobes; lobe += 1) {
      const t = lobe / (lobes - 1);
      const lx = x + (t - 0.5) * mound.width * 1.3;
      const lh = mound.height * (0.5 + Math.sin(t * Math.PI) * 0.7 + ((lobe * 7 + index * 5) % 4) * 0.14);
      context.beginPath();
      context.ellipse(lx, groundY + 6 - lh * 0.4, mound.width * 0.17, lh * 0.55, (t - 0.5) * 0.55, 0, Math.PI * 2);
      context.fill();
    }

    context.strokeStyle = `rgba(${mound.bladeColor}, 0.8)`;
    context.lineWidth = 1.15;
    for (let blade = 0; blade < 11; blade += 1) {
      const bt = blade / 10;
      const bx = x + (bt - 0.5) * mound.width * 1.2;
      const bh = mound.height * (0.9 + Math.sin(bt * Math.PI) * 0.9) + (blade % 3) * 4;
      const lean = (bt - 0.5) * mound.width * 0.32 + sway;
      context.beginPath();
      context.moveTo(bx, groundY + 8);
      context.quadraticCurveTo(bx + lean * 0.3, groundY - bh * 0.5, bx + lean, groundY - bh);
      context.stroke();
    }

    if (mound.kind === 1) {
      context.fillStyle = "rgba(68, 74, 119, 0.7)";
      for (let dot = 0; dot < 4; dot += 1) {
        const dx = ((dot * 23 + index * 13) % Math.floor(mound.width)) - mound.width * 0.5;
        context.beginPath();
        context.arc(x + dx, groundY - mound.height * (0.5 + (dot % 2) * 0.4), 1.8, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
}

function drawShrubs(groundY, time) {
  shrubs.forEach((shrub, index) => {
    const x = shrub.x * window.innerWidth;
    context.fillStyle = `rgba(${shrub.color}, 0.75)`;
    for (let lobe = 0; lobe < 7; lobe += 1) {
      const angle = (lobe / 7) * Math.PI;
      const lx = x + Math.cos(angle) * shrub.width * 0.45;
      const ly = groundY - Math.sin(angle) * shrub.height * 0.78;
      context.beginPath();
      context.ellipse(lx, ly, shrub.width * 0.28, shrub.height * 0.32, Math.sin(index + lobe) * 0.3, 0, Math.PI * 2);
      context.fill();
    }
    if (shrub.berries) {
      context.fillStyle = "rgba(217, 87, 116, 0.82)";
      for (let berry = 0; berry < 6; berry += 1) {
        context.beginPath();
        context.arc(x - shrub.width * 0.32 + berry * shrub.width * 0.13, groundY - shrub.height * (0.28 + (berry % 3) * 0.18), 2.2, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
}

function drawBloom(x, y, flower, time, index) {
  const { variety } = flower;
  const petalColor = flower.colorOverride || variety.color;
  const bloom = flower.bloom * flower.depth;
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(time * 0.0007 + index) * 0.04);

  if (variety.shape === "spire" || variety.shape === "bells") {
    const count = variety.petals;
    for (let petal = 0; petal < count; petal += 1) {
      const py = (petal - count / 2) * bloom * 0.42;
      const side = petal % 2 ? 1 : -1;
      context.fillStyle = petalColor;
      context.beginPath();
      context.ellipse(
        side * bloom * (0.18 + Math.abs(petal - count / 2) * 0.035), py,
        bloom * 0.42, bloom * 0.2, side * 0.3,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.restore();
    return;
  }

  const layers = variety.shape === "cluster" || variety.shape === "ruffle" ? 2 : 1;
  for (let layer = layers - 1; layer >= 0; layer -= 1) {
    const count = variety.petals - layer * 3;
    context.fillStyle = petalColor;
    context.globalAlpha = 0.78 + layer * 0.16;
    for (let petal = 0; petal < count; petal += 1) {
      const angle = (Math.PI * 2 * petal) / count + layer * 0.18;
      const slender = variety.shape === "slender" || variety.shape === "point";
      const wide = variety.shape === "wide" || variety.shape === "cluster";
      const radius = bloom * (wide ? 0.35 : 0.48) * (1 - layer * 0.2);
      context.beginPath();
      context.ellipse(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        bloom * (slender ? 0.55 : wide ? 0.56 : 0.48) * (1 - layer * 0.16),
        bloom * (slender ? 0.13 : 0.25) * (1 - layer * 0.16),
        angle,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  context.globalAlpha = 1;
  context.fillStyle = variety.center;
  context.beginPath();
  context.arc(0, 0, bloom * (variety.shape === "tiny" ? 0.18 : 0.24), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function animate(time) {
  context = cloudScreenContext;
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawSky(time);
  drawClouds(time);

  context = screenContext;
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawRain(time);
  drawTreeLayer(time);
  drawField(time);
  requestAnimationFrame(animate);
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

function playBell(audioContext, destination) {
  const now = audioContext.currentTime;
  const carrier = audioContext.createOscillator();
  const modulator = audioContext.createOscillator();
  const bellGain = audioContext.createGain();
  const fmGain = audioContext.createGain();

  carrier.type = "sine";
  carrier.frequency.setValueAtTime(540 + Math.random() * 220, now);
  modulator.type = "triangle";
  modulator.frequency.setValueAtTime(2.8 + Math.random() * 1.6, now);
  fmGain.gain.setValueAtTime(16, now);
  bellGain.gain.setValueAtTime(0.0001, now);
  bellGain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

  modulator.connect(fmGain);
  fmGain.connect(carrier.frequency);
  carrier.connect(bellGain);
  bellGain.connect(destination);

  carrier.start(now);
  modulator.start(now);
  carrier.stop(now + 4);
  modulator.stop(now + 4);
}

function speakWhitman() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(poem);
  utterance.rate = 0.88;
  utterance.pitch = 0.94;
  utterance.volume = 0.82;
  window.speechSynthesis.speak(utterance);
}

function startAudio() {
  if (audioState.started) {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioContext.createGain();
  master.gain.value = 0.22;
  master.connect(audioContext.destination);

  const rainNoise = createNoiseSource(audioContext);
  const rainFilter = audioContext.createBiquadFilter();
  const rainTone = audioContext.createGain();
  rainFilter.type = "bandpass";
  rainFilter.frequency.value = 1900;
  rainFilter.Q.value = 0.7;
  rainTone.gain.value = 0.08;
  rainNoise.connect(rainFilter);
  rainFilter.connect(rainTone);
  rainTone.connect(master);
  rainNoise.start();

  const lowPad = audioContext.createOscillator();
  const lowPadGain = audioContext.createGain();
  lowPad.type = "sine";
  lowPad.frequency.value = 132;
  lowPadGain.gain.value = 0.03;
  lowPad.connect(lowPadGain);
  lowPadGain.connect(master);
  lowPad.start();

  audioState.context = audioContext;
  audioState.started = true;
  audioToggle.textContent = "air opened";
  speakWhitman();
  audioState.voiceTimer = window.setInterval(speakWhitman, 26000);
  window.setInterval(() => playBell(audioContext, master), 6200);
}

audioToggle?.addEventListener("click", startAudio);

window.addEventListener("visibilitychange", () => {
  if (document.hidden && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(animate);
