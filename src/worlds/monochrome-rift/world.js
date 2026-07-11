const canvas = document.getElementById("rift-canvas");
const context = canvas.getContext("2d");

const bands = Array.from({ length: 18 }, (_, index) => ({
  x: index / 18,
  width: 0.01 + Math.random() * 0.21,
  speed: 0.0003 + Math.random() * 0.0011,
  phase: Math.random() * Math.PI * 2,
}));

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function drawBackdrop(time) {
  context.fillStyle = "#050505";
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);

  bands.forEach((band, index) => {
    const phase = Math.sin(time * band.speed + band.phase);
    const x = (band.x + phase * 0.06) * window.innerWidth;
    const width = band.width * window.innerWidth;
    const gradient = context.createLinearGradient(x, 0, x + width, 0);
    const bright = index % 2 === 0;
    gradient.addColorStop(0, bright ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)");
    gradient.addColorStop(0.45, bright ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.1)");
    gradient.addColorStop(1, bright ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.84)");
    context.fillStyle = gradient;
    context.fillRect(x, 0, width, window.innerHeight);
  });

  for (let row = 0; row < window.innerHeight; row += 6) {
    const alpha = 0.03 + Math.sin(row * 0.11 + time * 0.003) * 0.02;
    context.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
    context.fillRect(0, row, window.innerWidth, 1);
  }

  const centerGlow = context.createRadialGradient(
    window.innerWidth * 0.62,
    window.innerHeight * 0.5,
    10,
    window.innerWidth * 0.62,
    window.innerHeight * 0.5,
    window.innerWidth * 0.32,
  );
  centerGlow.addColorStop(0, "rgba(255,255,255,0.16)");
  centerGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = centerGlow;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function animate(time) {
  drawBackdrop(time * 0.18);
  requestAnimationFrame(animate);
}

const drone = new Audio("./assets/audio/rift-drone.mp3");
drone.loop = true;
drone.volume = 0.7;
window.ElasticSoundControl.attach({ media: drone });

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(animate);
