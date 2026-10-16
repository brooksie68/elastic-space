// Softly — overlapping two-stop gradients, random color and angle, fading in and out.
// Every wash's opacity is driven by hand from one rAF loop (no Web Animations), so the
// wandering tempo can speed and slow them without ever stalling the clock.
(() => {
  const field = document.getElementById('field');
  const MAX = 5;             // most washes on screen at once
  const FADE = [6, 12];      // seconds to fade in, at tempo 1
  const HOLD = [2, 8];       // seconds at full strength, at tempo 1
  const PEAK = [0.3, 1];     // top opacity, rolled per wash
  const TEMPO = [0.55, 1.7]; // how far the wandering speed can drift
  const live = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const color = () => `hsl(${rand(0, 360)} ${rand(40, 100)}% ${rand(30, 70)}%)`;
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  // THE TEMPO: a speed that wanders on its own. Every few seconds it picks a new
  // target and drifts toward it at a random rate; sometimes it lurches.
  let tempo = 1, target = 1, pull = 0.3, nextTurn = 0;
  function wander(now, dt) {
    if (now > nextTurn) {
      target = rand(...TEMPO);
      pull = Math.random() < 0.2 ? rand(0.8, 1.6) : rand(0.08, 0.4);
      nextTurn = now + rand(2, 9) * 1000;
    }
    tempo += (target - tempo) * Math.min(1, pull * dt);
  }

  function gradient() {
    const a = color();
    // one or two stops: color to color, or color to nothing
    const b = Math.random() < 0.5 ? color() : 'transparent';
    return `linear-gradient(${rand(0, 360)}deg, ${a}, ${b})`;
  }

  function spawn() {
    if (live.length >= MAX) return;
    const el = document.createElement('div');
    el.className = 'wash';
    el.style.background = gradient();
    field.appendChild(el);
    const fade = rand(...FADE);
    live.push({
      el, t: 0, fade, hold: rand(...HOLD), out: fade * rand(0.6, 1.5),
      peak: rand(...PEAK), sag: rand(0.7, 1), own: rand(0.85, 1.15),
    });
  }

  function opacity(w) {
    if (w.t < w.fade) return w.peak * ease(w.t / w.fade);
    const h = w.t - w.fade;
    const top = w.peak * (1 - (1 - w.sag) * Math.min(1, h / w.hold));
    if (h < w.hold) return top;
    return top * (1 - ease(Math.min(1, (h - w.hold) / w.out)));
  }

  let last = performance.now(), nextSpawn = 0;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    wander(now, dt);
    for (let i = live.length - 1; i >= 0; i--) {
      const w = live[i];
      w.t += dt * tempo * w.own;
      if (w.t >= w.fade + w.hold + w.out) { w.el.remove(); live.splice(i, 1); continue; }
      w.el.style.opacity = opacity(w).toFixed(4);
    }
    if (now > nextSpawn) {
      spawn();
      nextSpawn = now + rand(1.2, 5.5) * 1000 / tempo;
    }
    requestAnimationFrame(frame);
  }
  spawn(); spawn();
  requestAnimationFrame(frame);
})();
