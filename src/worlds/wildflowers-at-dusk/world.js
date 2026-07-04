const canvas = document.getElementById("sky-field");
const context = canvas.getContext("2d");
const audioToggle = document.getElementById("audio-toggle");

const rain = Array.from({ length: 220 }, () => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.003 + Math.random() * 0.009,
  length: 20 + Math.random() * 54,
  glow: 0.24 + Math.random() * 0.45,
}));

const streamers = Array.from({ length: 14 }, () => ({
  x: Math.random(),
  y: Math.random(),
  width: 90 + Math.random() * 220,
  hue: 180 + Math.random() * 180,
  speed: 0.0008 + Math.random() * 0.0014,
  phase: Math.random() * Math.PI * 2,
}));

const flowers = Array.from({ length: 64 }, (_, index) => ({
  x: index / 63,
  height: 80 + Math.random() * 180,
  bloom: 6 + Math.random() * 14,
  lean: -0.22 + Math.random() * 0.44,
}));

const audioState = {
  context: null,
  started: false,
  voiceTimer: 0,
};

const poem =
  "This is thy hour O Soul, thy free flight into the wordless, away from books, away from art, the day erased, the lesson done.";

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function drawSky(time) {
  const gradient = context.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, "#130f2d");
  gradient.addColorStop(0.45, "#7a335e");
  gradient.addColorStop(0.82, "#f0876e");
  gradient.addColorStop(1, "#1a1c24");
  context.fillStyle = gradient;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);

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

  streamers.forEach((streamer, index) => {
    const x = streamer.x * window.innerWidth;
    const y = streamer.y * window.innerHeight;
    const drift = Math.sin(time * streamer.speed + streamer.phase) * 32;
    const arc = Math.cos(time * streamer.speed * 1.2 + index) * 54;
    const ribbon = context.createLinearGradient(x, y, x + streamer.width, y - 70);
    ribbon.addColorStop(0, `hsla(${streamer.hue}, 90%, 72%, 0)`);
    ribbon.addColorStop(0.45, `hsla(${streamer.hue}, 92%, 70%, 0.24)`);
    ribbon.addColorStop(1, `hsla(${streamer.hue + 36}, 95%, 78%, 0)`);
    context.strokeStyle = ribbon;
    context.lineWidth = 2 + (index % 3);
    context.beginPath();
    context.moveTo(x, y + drift);
    context.quadraticCurveTo(x + streamer.width * 0.45, y - 60 + arc, x + streamer.width, y - 120 + drift);
    context.stroke();
  });
}

function drawRain(time) {
  rain.forEach((drop, index) => {
    const x = drop.x * window.innerWidth;
    const baseY = (drop.y * window.innerHeight + time * drop.speed * 1000) % (window.innerHeight + 160);
    const y = window.innerHeight - baseY;
    const hue = 180 + (index % 7) * 18;
    context.strokeStyle = `hsla(${hue}, 95%, 80%, ${drop.glow})`;
    context.lineWidth = 1 + (index % 2) * 0.6;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 8, y - drop.length);
    context.stroke();
  });
}

function drawField(time) {
  const groundY = window.innerHeight * 0.74;

  context.fillStyle = "rgba(8, 23, 24, 0.9)";
  context.beginPath();
  context.moveTo(0, window.innerHeight);
  context.lineTo(0, groundY + 28);
  for (let x = 0; x <= window.innerWidth; x += 30) {
    const y = groundY + Math.sin(x * 0.01 + time * 0.0004) * 16;
    context.lineTo(x, y);
  }
  context.lineTo(window.innerWidth, window.innerHeight);
  context.closePath();
  context.fill();

  flowers.forEach((flower, index) => {
    const x = flower.x * window.innerWidth;
    const sway = Math.sin(time * 0.0016 + index * 0.7) * flower.lean;
    const topY = groundY - flower.height;
    context.strokeStyle = "rgba(22, 42, 28, 0.9)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, groundY + 20);
    context.quadraticCurveTo(x + sway * 70, groundY - flower.height * 0.45, x + sway * 32, topY);
    context.stroke();

    context.fillStyle = `hsla(${320 + (index % 5) * 12}, 82%, 74%, 0.78)`;
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (Math.PI * 2 * petal) / 5 + time * 0.0002;
      context.beginPath();
      context.ellipse(
        x + sway * 32 + Math.cos(angle) * flower.bloom * 0.5,
        topY + Math.sin(angle) * flower.bloom * 0.5,
        flower.bloom * 0.62,
        flower.bloom * 0.28,
        angle,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    context.fillStyle = "rgba(255, 225, 166, 0.9)";
    context.beginPath();
    context.arc(x + sway * 32, topY, flower.bloom * 0.22, 0, Math.PI * 2);
    context.fill();
  });
}

function animate(time) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawSky(time);
  drawRain(time);
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
