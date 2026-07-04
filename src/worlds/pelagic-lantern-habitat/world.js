const canvas = document.getElementById("sea-canvas");
const context = canvas.getContext("2d");
const audioToggle = document.getElementById("audio-toggle");

const particles = Array.from({ length: 140 }, () => ({
  x: Math.random(),
  y: Math.random(),
  radius: 1 + Math.random() * 4,
  speed: 0.0004 + Math.random() * 0.001,
}));

const creatures = Array.from({ length: 8 }, (_, index) => ({
  orbit: 0.16 + Math.random() * 0.36,
  size: 18 + Math.random() * 20,
  speed: 0.00016 + Math.random() * 0.00024,
  phase: (Math.PI * 2 * index) / 8,
  hue: 160 + Math.random() * 60,
}));

let audioStarted = false;

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function drawWater() {
  const gradient = context.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, "#03121d");
  gradient.addColorStop(0.42, "#06263d");
  gradient.addColorStop(1, "#061722");
  context.fillStyle = gradient;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const caustic = context.createRadialGradient(
    window.innerWidth * 0.5,
    window.innerHeight * 0.16,
    10,
    window.innerWidth * 0.5,
    window.innerHeight * 0.16,
    window.innerWidth * 0.5,
  );
  caustic.addColorStop(0, "rgba(140, 255, 238, 0.2)");
  caustic.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = caustic;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawParticles(time) {
  particles.forEach((particle, index) => {
    const x = particle.x * window.innerWidth + Math.sin(time * 0.0003 + index) * 18;
    const y = (particle.y * window.innerHeight - time * particle.speed * 1000 + window.innerHeight) % window.innerHeight;
    context.fillStyle = `rgba(195, 255, 247, ${0.16 + (index % 5) * 0.05})`;
    context.beginPath();
    context.arc(x, y, particle.radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawHabitat(time) {
  const domeX = window.innerWidth * 0.52;
  const domeY = window.innerHeight * 0.68;
  const domeRadius = Math.min(window.innerWidth, window.innerHeight) * 0.18;

  const glow = context.createRadialGradient(domeX, domeY, 10, domeX, domeY, domeRadius * 1.6);
  glow.addColorStop(0, "rgba(127, 255, 226, 0.32)");
  glow.addColorStop(0.5, "rgba(92, 154, 255, 0.2)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(domeX, domeY, domeRadius * 1.6, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(3, 18, 29, 0.82)";
  context.beginPath();
  context.arc(domeX, domeY, domeRadius, Math.PI, Math.PI * 2);
  context.lineTo(domeX + domeRadius, window.innerHeight);
  context.lineTo(domeX - domeRadius, window.innerHeight);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(150, 255, 241, 0.7)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(domeX, domeY, domeRadius, Math.PI, Math.PI * 2);
  context.stroke();

  for (let index = -3; index <= 3; index += 1) {
    const offset = index * domeRadius * 0.22;
    const pulse = Math.sin(time * 0.0014 + index) * 10;
    context.fillStyle = `rgba(127, 255, 226, ${0.28 + index * 0.02})`;
    context.fillRect(domeX + offset - 10, domeY - domeRadius * 0.42 + pulse, 20, 44);
  }

  context.fillStyle = "rgba(7, 25, 35, 0.92)";
  context.beginPath();
  context.moveTo(0, window.innerHeight);
  context.lineTo(0, domeY + 50);
  for (let x = 0; x <= window.innerWidth; x += 28) {
    const y = domeY + 58 + Math.sin(x * 0.012 + time * 0.0006) * 18;
    context.lineTo(x, y);
  }
  context.lineTo(window.innerWidth, window.innerHeight);
  context.closePath();
  context.fill();
}

function drawCreature(x, y, size, hue) {
  context.save();
  context.translate(x, y);
  context.fillStyle = `hsla(${hue}, 90%, 72%, 0.85)`;
  context.beginPath();
  context.ellipse(0, 0, size, size * 0.56, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.beginPath();
  context.arc(-size * 0.18, -size * 0.08, size * 0.08, 0, Math.PI * 2);
  context.arc(size * 0.18, -size * 0.08, size * 0.08, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.8)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, size * 0.02, size * 0.22, 0.1, Math.PI - 0.1);
  context.stroke();

  context.restore();
}

function drawCreatures(time) {
  const centerX = window.innerWidth * 0.52;
  const centerY = window.innerHeight * 0.47;

  creatures.forEach((creature, index) => {
    const angle = time * creature.speed + creature.phase;
    const radiusX = window.innerWidth * (0.1 + creature.orbit);
    const radiusY = window.innerHeight * (0.05 + creature.orbit * 0.26);
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle * 1.4) * radiusY;
    drawCreature(x, y, creature.size, creature.hue + index * 6);
  });
}

function animate(time) {
  drawWater();
  drawParticles(time);
  drawHabitat(time);
  drawCreatures(time);
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

function bubbleClick(audioContext, destination) {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180 + Math.random() * 120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.028, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

function startAudio() {
  if (audioStarted) {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioContext.createGain();
  master.gain.value = 0.24;
  master.connect(audioContext.destination);

  const thrumbA = audioContext.createOscillator();
  const thrumbB = audioContext.createOscillator();
  const thrumbGain = audioContext.createGain();
  thrumbA.type = "sine";
  thrumbB.type = "triangle";
  thrumbA.frequency.value = 55;
  thrumbB.frequency.value = 82;
  thrumbGain.gain.value = 0.06;
  thrumbA.connect(thrumbGain);
  thrumbB.connect(thrumbGain);
  thrumbGain.connect(master);
  thrumbA.start();
  thrumbB.start();

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 12;
  lfo.connect(lfoGain);
  lfoGain.connect(thrumbA.frequency);
  lfo.start();

  const driftNoise = createNoiseSource(audioContext);
  const driftFilter = audioContext.createBiquadFilter();
  const driftGain = audioContext.createGain();
  driftFilter.type = "lowpass";
  driftFilter.frequency.value = 620;
  driftGain.gain.value = 0.025;
  driftNoise.connect(driftFilter);
  driftFilter.connect(driftGain);
  driftGain.connect(master);
  driftNoise.start();

  window.setInterval(() => bubbleClick(audioContext, master), 3200);

  audioStarted = true;
  audioToggle.textContent = "habitat awake";
}

audioToggle?.addEventListener("click", startAudio);

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(animate);
