const canvas = document.getElementById("rift-canvas");
const context = canvas.getContext("2d");
const flashLayer = document.querySelector(".flash");
const audioToggle = document.getElementById("audio-toggle");

const bands = Array.from({ length: 18 }, (_, index) => ({
  x: index / 18,
  width: 0.04 + Math.random() * 0.12,
  speed: 0.0003 + Math.random() * 0.0011,
  phase: Math.random() * Math.PI * 2,
}));

let flashTimeout = 0;
let audioStarted = false;

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

function maybeFlash() {
  if (flashTimeout > performance.now()) {
    return;
  }

  if (Math.random() > 0.9925) {
    flashLayer.style.opacity = String(0.24 + Math.random() * 0.52);
    flashTimeout = performance.now() + 180 + Math.random() * 260;
    window.setTimeout(() => {
      flashLayer.style.opacity = "0";
    }, 180);
  }
}

function animate(time) {
  drawBackdrop(time * 0.5);
  maybeFlash();
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

function playChime(audioContext, destination) {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(930 + Math.random() * 420, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.03, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 7.6);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 8);
}

function startAudio() {
  if (audioStarted) {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioContext.createGain();
  master.gain.value = 0.26;
  master.connect(audioContext.destination);

  const windNoise = createNoiseSource(audioContext);
  const windFilter = audioContext.createBiquadFilter();
  const windGain = audioContext.createGain();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 860;
  windFilter.Q.value = 0.8;
  windGain.gain.value = 0.09;
  windNoise.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  windNoise.start();

  const grinderA = audioContext.createOscillator();
  const grinderB = audioContext.createOscillator();
  const grinderGain = audioContext.createGain();
  const grinderFilter = audioContext.createBiquadFilter();
  grinderA.type = "sawtooth";
  grinderB.type = "triangle";
  grinderA.frequency.value = 48;
  grinderB.frequency.value = 73;
  grinderFilter.type = "lowpass";
  grinderFilter.frequency.value = 220;
  grinderGain.gain.value = 0.05;
  grinderA.connect(grinderFilter);
  grinderB.connect(grinderFilter);
  grinderFilter.connect(grinderGain);
  grinderGain.connect(master);
  grinderA.start();
  grinderB.start();

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.09;
  lfoGain.gain.value = 20;
  lfo.connect(lfoGain);
  lfoGain.connect(grinderFilter.frequency);
  lfo.start();

  window.setInterval(() => playChime(audioContext, master), 15600);

  audioStarted = true;
  audioToggle.textContent = "rift active";
}

audioToggle?.addEventListener("click", startAudio);

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(animate);
