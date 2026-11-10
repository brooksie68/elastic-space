// Softly — overlapping two-stop gradients, random color and angle, fading in and out.
// Every wash's opacity is driven by hand from one rAF loop (no Web Animations), so the
// wandering tempo can speed and slow them without ever stalling the clock.
// Since 2026-10-16 (round eleven) the washes are drawn in ONE WebGL fragment shader:
// the same CSS linear-gradient math per pixel, blended as floats, with a hair of noise
// dither before output so the 8-bit screen shows no bands. Without WebGL the washes
// fall back to the old stacked divs.
(() => {
  const field = document.getElementById('field');
  const MAX = 5;             // most washes on screen at once
  const FADE = [6, 12];      // seconds to fade in, at tempo 1
  const HOLD = [2, 8];       // seconds at full strength, at tempo 1
  const PEAK = [0.3, 1];     // top opacity, rolled per wash
  const TEMPO = [0.55, 1.7]; // how far the wandering speed can drift
  const DITHER = 1.0;        // noise amplitude in 1/255 steps (0 = off)
  const live = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  // a colour as CSS hsl() AND as rgb 0–1, so both renderers agree
  function hsl2rgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)];
  }
  function color() {
    const h = rand(0, 360), s = rand(40, 100), l = rand(30, 70);
    return { css: `hsl(${h} ${s}% ${l}%)`, rgb: hsl2rgb(h, s, l) };
  }

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

  // one or two stops: colour to colour, or colour to nothing
  function gradient() {
    const a = color();
    const toNothing = Math.random() < 0.5;
    const b = toNothing ? { css: 'transparent', rgb: a.rgb } : color();
    return { angle: rand(0, 360), a, b, bAlpha: toNothing ? 0 : 1 };
  }

  function spawn() {
    if (live.length >= MAX) return;
    const fade = rand(...FADE);
    const w = {
      g: gradient(), t: 0, fade, hold: rand(...HOLD), out: fade * rand(0.6, 1.5),
      peak: rand(...PEAK), sag: rand(0.7, 1), own: rand(0.85, 1.15), op: 0,
    };
    renderer.add(w);
    live.push(w);
  }

  function opacity(w) {
    if (w.t < w.fade) return w.peak * ease(w.t / w.fade);
    const h = w.t - w.fade;
    const top = w.peak * (1 - (1 - w.sag) * Math.min(1, h / w.hold));
    if (h < w.hold) return top;
    return top * (1 - ease(Math.min(1, (h - w.hold) / w.out)));
  }

  // ---- THE SHADER: every wash as a CSS linear-gradient, composited in floats ----
  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FS = `
    precision highp float;
    uniform vec2 res;
    uniform float time;
    uniform float dither;
    uniform int count;
    uniform float angle[${MAX}];   // CSS degrees: 0 = to top, 90 = to right
    uniform vec3 colA[${MAX}];
    uniform vec3 colB[${MAX}];
    uniform float alphaB[${MAX}];  // 0 = the second stop is transparent
    uniform float op[${MAX}];
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = gl_FragCoord.xy / res;         // 0..1, y up
      vec2 px = (uv - 0.5) * res;              // centred, in pixels
      vec3 out3 = vec3(0.0);
      for (int i = 0; i < ${MAX}; i++) {
        if (i >= count) break;
        float a = radians(angle[i]);
        vec2 dir = vec2(sin(a), cos(a));
        // CSS gradient line: the corners sit exactly on 0 and 1
        float halfLen = 0.5 * (abs(res.x * dir.x) + abs(res.y * dir.y));
        float t = clamp(dot(px, dir) / halfLen * 0.5 + 0.5, 0.0, 1.0);
        // CSS interpolates in premultiplied space: colour -> transparent keeps the hue
        float alpha = mix(1.0, alphaB[i], t);
        vec3 col = (alphaB[i] < 0.5) ? colA[i] : mix(colA[i], colB[i], t);
        float k = op[i] * alpha;
        out3 = out3 * (1.0 - k) + col * k;
      }
      // dither: a hair of per-pixel, per-frame noise so 8-bit output shows no bands
      float n = (hash(gl_FragCoord.xy + fract(time) * 977.0) - 0.5) * dither / 255.0;
      gl_FragColor = vec4(out3 + n, 1.0);
    }`;

  function glRenderer() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['res', 'time', 'dither', 'count', 'angle', 'colA', 'colB', 'alphaB', 'op']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    field.appendChild(canvas);

    const angle = new Float32Array(MAX), colA = new Float32Array(MAX * 3), colB = new Float32Array(MAX * 3);
    const alphaB = new Float32Array(MAX), op = new Float32Array(MAX);
    let w = 0, h = 0;
    function size() {
      // gradients need no extra pixels: one device pixel per CSS pixel, capped
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const nw = Math.round(canvas.clientWidth * dpr), nh = Math.round(canvas.clientHeight * dpr);
      if (nw === w && nh === h) return;
      w = canvas.width = nw; h = canvas.height = nh;
      gl.viewport(0, 0, w, h);
    }
    return {
      add() {}, remove() {},
      draw(now) {
        size();
        for (let i = 0; i < live.length; i++) {
          const g = live[i].g;
          angle[i] = g.angle; alphaB[i] = g.bAlpha; op[i] = live[i].op;
          colA.set(g.a.rgb, i * 3); colB.set(g.b.rgb, i * 3);
        }
        gl.uniform2f(U.res, w, h); gl.uniform1f(U.time, now / 1000); gl.uniform1f(U.dither, DITHER);
        gl.uniform1i(U.count, live.length);
        gl.uniform1fv(U.angle, angle); gl.uniform3fv(U.colA, colA); gl.uniform3fv(U.colB, colB);
        gl.uniform1fv(U.alphaB, alphaB); gl.uniform1fv(U.op, op);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  // ---- THE FALLBACK: a stacked div per wash, as before WebGL ----
  function domRenderer() {
    return {
      add(w) {
        const el = document.createElement('div');
        el.className = 'wash';
        el.style.background = `linear-gradient(${w.g.angle}deg, ${w.g.a.css}, ${w.g.b.css})`;
        field.appendChild(el); w.el = el;
      },
      remove(w) { w.el.remove(); },
      draw() { for (const w of live) w.el.style.opacity = w.op.toFixed(3); },
    };
  }

  let renderer = null;
  try { renderer = glRenderer(); } catch (e) { renderer = null; }
  if (!renderer) renderer = domRenderer();
  window.SOFTLY_DEBUG = { get renderer() { return renderer; }, get live() { return live; } };

  let last = performance.now(), nextSpawn = 0;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    wander(now, dt);
    for (let i = live.length - 1; i >= 0; i--) {
      const w = live[i];
      w.t += dt * tempo * w.own;
      if (w.t >= w.fade + w.hold + w.out) { renderer.remove(w); live.splice(i, 1); continue; }
      w.op = opacity(w);
    }
    if (now > nextSpawn) {
      spawn();
      nextSpawn = now + rand(1.2, 5.5) * 1000 / tempo;
    }
    renderer.draw(now);
    requestAnimationFrame(frame);
  }
  spawn(); spawn();
  requestAnimationFrame(frame);
})();
