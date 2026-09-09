// Carnage — the 2D art that lives inside the 3D: what sits in a broken window (people, food, money, the
// hazards), the neon signs, the blimp's banner, the brand marks. All canvas-drawn at load, no files.
// The register is cartoon, quick, readable at forty pixels. Exposed as globalThis.CarnageIcons so the
// renderer and the Damage Lab share one set.
(function () {
  'use strict';

  const cache = {};
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function outline(g, w) { g.lineWidth = w; g.strokeStyle = '#1a1014'; g.lineJoin = 'round'; g.lineCap = 'round'; }

  // ---- the things in the windows (128 px, transparent) ------------------------------------------------
  // Every icon is drawn centred, feet at the bottom, and returns a canvas.
  const DRAW = {
    customer(g, s) {
      person(g, s, { shirt: '#3f7fd8', skin: '#f1c9a5', hair: '#3a2418', phone: true });
    },
    worker(g, s) {
      person(g, s, { shirt: '#c9c9d4', skin: '#e8b48c', hair: '#2b2b2b', laptop: true, headset: true });
    },
    waver(g, s) {
      person(g, s, { shirt: '#e9a13b', skin: '#f5d0b0', hair: '#7a3b1e', wave: true });
    },
    zombie(g, s) {
      person(g, s, { shirt: '#6b6b7a', skin: '#d8d2c8', hair: '#1c1c1c', phone: true, slump: true });
    },
    fries(g, s) {
      // a red carton, fries fanned
      g.fillStyle = '#f2d24b';
      for (let i = 0; i < 7; i++) { g.save(); g.translate(s * 0.5, s * 0.62); g.rotate((i - 3) * 0.16); rr(g, -s * 0.04, -s * 0.5, s * 0.08, s * 0.5, s * 0.02); g.fill(); outline(g, s * 0.02); g.stroke(); g.restore(); }
      g.fillStyle = '#e02b2b'; g.beginPath(); g.moveTo(s * 0.25, s * 0.55); g.lineTo(s * 0.75, s * 0.55); g.lineTo(s * 0.68, s * 0.95); g.lineTo(s * 0.32, s * 0.95); g.closePath(); g.fill(); outline(g, s * 0.025); g.stroke();
    },
    shake(g, s) {
      g.fillStyle = '#f7e7ee'; g.beginPath(); g.moveTo(s * 0.32, s * 0.35); g.lineTo(s * 0.68, s * 0.35); g.lineTo(s * 0.62, s * 0.95); g.lineTo(s * 0.38, s * 0.95); g.closePath(); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(s * 0.5, s * 0.32, s * 0.2, Math.PI, 0); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; rr(g, s * 0.52, s * 0.05, s * 0.05, s * 0.32, s * 0.02); g.fill(); g.stroke();
    },
    nuggets(g, s) {
      g.fillStyle = '#e02b2b'; rr(g, s * 0.2, s * 0.55, s * 0.6, s * 0.38, s * 0.05); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#e6a93c';
      for (const [x, y, r] of [[0.35, 0.5, 0.13], [0.55, 0.42, 0.14], [0.72, 0.52, 0.11]]) { g.beginPath(); g.ellipse(s * x, s * y, s * r, s * r * 0.8, 0.3, 0, Math.PI * 2); g.fill(); g.stroke(); }
    },
    patty(g, s) {
      // a square patty on a bun, corners out
      g.fillStyle = '#e6b25c'; g.beginPath(); g.ellipse(s * 0.5, s * 0.35, s * 0.34, s * 0.16, 0, Math.PI, 0); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#5a2e14'; g.save(); g.translate(s * 0.5, s * 0.52); g.rotate(-0.08); rr(g, -s * 0.36, -s * 0.09, s * 0.72, s * 0.18, s * 0.015); g.fill(); g.stroke(); g.restore();
      g.fillStyle = '#e6b25c'; rr(g, s * 0.17, s * 0.6, s * 0.66, s * 0.22, s * 0.08); g.fill(); g.stroke();
    },
    cake(g, s) {
      g.fillStyle = '#ffd1e0'; rr(g, s * 0.18, s * 0.5, s * 0.64, s * 0.36, s * 0.04); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#ffffff'; rr(g, s * 0.18, s * 0.46, s * 0.64, s * 0.1, s * 0.05); g.fill(); g.stroke();
      for (let i = 0; i < 3; i++) { g.fillStyle = ['#ff4d6d', '#4dc3ff', '#ffe14d'][i]; rr(g, s * (0.3 + i * 0.16), s * 0.22, s * 0.06, s * 0.26, s * 0.02); g.fill(); g.stroke(); g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(s * (0.33 + i * 0.16), s * 0.16, s * 0.035, s * 0.06, 0, 0, Math.PI * 2); g.fill(); }
    },
    crown(g, s) {
      g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(s * 0.15, s * 0.8); g.lineTo(s * 0.15, s * 0.35); g.lineTo(s * 0.33, s * 0.55); g.lineTo(s * 0.5, s * 0.2); g.lineTo(s * 0.67, s * 0.55); g.lineTo(s * 0.85, s * 0.35); g.lineTo(s * 0.85, s * 0.8); g.closePath(); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#e02b2b'; for (const x of [0.3, 0.5, 0.7]) { g.beginPath(); g.arc(s * x, s * 0.68, s * 0.04, 0, Math.PI * 2); g.fill(); }
    },
    cash(g, s) {
      g.fillStyle = '#6b4a2b'; rr(g, s * 0.2, s * 0.35, s * 0.6, s * 0.55, s * 0.08); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#3aa655'; rr(g, s * 0.3, s * 0.18, s * 0.4, s * 0.3, s * 0.03); g.fill(); g.stroke();
      g.fillStyle = '#f2f2f2'; g.font = 'bold ' + s * 0.28 + 'px Arial'; g.textAlign = 'center'; g.fillText('$', s * 0.5, s * 0.76);
    },
    crypto(g, s) {
      g.fillStyle = '#222b3a'; rr(g, s * 0.16, s * 0.34, s * 0.68, s * 0.5, s * 0.06); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#3a4a66'; rr(g, s * 0.38, s * 0.24, s * 0.24, s * 0.12, s * 0.03); g.fill(); g.stroke();
      g.fillStyle = '#ffb347'; g.beginPath(); g.arc(s * 0.5, s * 0.6, s * 0.14, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#222b3a'; g.font = 'bold ' + s * 0.2 + 'px Arial'; g.textAlign = 'center'; g.fillText('₿', s * 0.5, s * 0.67);
    },
    battery(g, s) {
      g.fillStyle = '#2c2c34'; rr(g, s * 0.3, s * 0.42, s * 0.4, s * 0.5, s * 0.05); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#4caf50'; rr(g, s * 0.36, s * 0.62, s * 0.28, s * 0.22, s * 0.02); g.fill();
      flames(g, s, s * 0.5, s * 0.44, 0.34);
    },
    fryer(g, s) {
      g.fillStyle = '#1e1e24'; rr(g, s * 0.22, s * 0.35, s * 0.56, s * 0.55, s * 0.1); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#3a3a44'; rr(g, s * 0.3, s * 0.42, s * 0.4, s * 0.3, s * 0.05); g.fill(); g.stroke();
      g.fillStyle = '#ff5a2b'; g.beginPath(); g.arc(s * 0.5, s * 0.8, s * 0.035, 0, Math.PI * 2); g.fill();
      // a heat shimmer
      g.strokeStyle = '#ffb347'; g.lineWidth = s * 0.025; for (const x of [0.4, 0.5, 0.6]) { g.beginPath(); g.moveTo(s * x, s * 0.3); g.quadraticCurveTo(s * (x + 0.04), s * 0.22, s * x, s * 0.14); g.stroke(); }
    },
    peloton(g, s) {
      // an exercise bike, sparking
      outline(g, s * 0.035); g.strokeStyle = '#2a2a33';
      g.beginPath(); g.arc(s * 0.3, s * 0.78, s * 0.12, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(s * 0.3, s * 0.78); g.lineTo(s * 0.5, s * 0.5); g.lineTo(s * 0.72, s * 0.5); g.lineTo(s * 0.72, s * 0.85); g.moveTo(s * 0.5, s * 0.5); g.lineTo(s * 0.45, s * 0.85); g.stroke();
      g.fillStyle = '#2a2a33'; rr(g, s * 0.62, s * 0.3, s * 0.22, s * 0.16, s * 0.02); g.fill();
      g.fillStyle = '#7fd7ff'; rr(g, s * 0.64, s * 0.32, s * 0.18, s * 0.12, s * 0.02); g.fill();
      sparks(g, s, s * 0.5, s * 0.5);
    },
    cactus(g, s) {
      g.fillStyle = '#b5651d'; rr(g, s * 0.32, s * 0.72, s * 0.36, s * 0.2, s * 0.04); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#3c9a4a'; rr(g, s * 0.43, s * 0.2, s * 0.14, s * 0.55, s * 0.07); g.fill(); g.stroke();
      rr(g, s * 0.27, s * 0.35, s * 0.1, s * 0.25, s * 0.05); g.fill(); g.stroke(); rr(g, s * 0.63, s * 0.3, s * 0.1, s * 0.25, s * 0.05); g.fill(); g.stroke();
      g.strokeStyle = '#eaf2c0'; g.lineWidth = s * 0.015; for (let i = 0; i < 12; i++) { const x = s * (0.36 + Math.random() * 0.28), y = s * (0.25 + Math.random() * 0.45); g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 0.03, y - s * 0.03); g.stroke(); }
    },
    vape(g, s) {
      g.fillStyle = '#5b4bd6'; g.save(); g.translate(s * 0.5, s * 0.6); g.rotate(-0.5); rr(g, -s * 0.28, -s * 0.05, s * 0.56, s * 0.1, s * 0.04); g.fill(); outline(g, s * 0.025); g.stroke(); g.restore();
      g.fillStyle = 'rgba(220,220,235,0.7)'; for (const [x, y, r] of [[0.72, 0.34, 0.07], [0.8, 0.24, 0.09], [0.9, 0.14, 0.06]]) { g.beginPath(); g.arc(s * x, s * y, s * r, 0, Math.PI * 2); g.fill(); }
    },
    smoothie(g, s) {
      g.fillStyle = '#7bd36b'; g.beginPath(); g.moveTo(s * 0.34, s * 0.3); g.lineTo(s * 0.66, s * 0.3); g.lineTo(s * 0.6, s * 0.92); g.lineTo(s * 0.4, s * 0.92); g.closePath(); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#2e7d32'; g.beginPath(); g.ellipse(s * 0.5, s * 0.3, s * 0.16, s * 0.05, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(s * 0.55, s * 0.32); g.lineTo(s * 0.68, s * 0.08); g.stroke();
      g.fillStyle = '#e02b2b'; g.font = 'bold ' + s * 0.16 + 'px Arial'; g.textAlign = 'center'; g.fillText('✕', s * 0.5, s * 0.66);
    },
    streamer(g, s) {
      // a person behind a ring light
      person(g, s, { shirt: '#ff5c8a', skin: '#f0c8a8', hair: '#f2e6b6', small: true });
      g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(s * 0.5, s * 0.42, s * 0.34, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ffeec2'; g.lineWidth = s * 0.02; g.beginPath(); g.arc(s * 0.5, s * 0.42, s * 0.34, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#222'; rr(g, s * 0.46, s * 0.76, s * 0.08, s * 0.2, s * 0.02); g.fill();
    },
    soldier(g, s) {
      person(g, s, { shirt: '#6b6f3a', skin: '#e0b088', hair: '#3a3f22', helmet: '#4a4f2a', rifle: true });
    },
    supplement(g, s) {
      g.fillStyle = '#fff'; rr(g, s * 0.3, s * 0.3, s * 0.4, s * 0.6, s * 0.08); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#ffb347'; rr(g, s * 0.3, s * 0.18, s * 0.4, s * 0.14, s * 0.03); g.fill(); g.stroke();
      g.fillStyle = '#7ed957'; rr(g, s * 0.36, s * 0.48, s * 0.28, s * 0.3, s * 0.03); g.fill();
      g.fillStyle = '#1a1014'; g.font = 'bold ' + s * 0.13 + 'px Arial'; g.textAlign = 'center'; g.fillText('MEGA', s * 0.5, s * 0.66);
      glow(g, s, s * 0.5, s * 0.55, '#7ed957');
    },
    corridor(g, s) {
      // not a room: a corridor of light going somewhere else
      const grd = g.createLinearGradient(0, 0, 0, s);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.5, '#c8f0ff'); grd.addColorStop(1, '#3a8ad8');
      g.fillStyle = grd; g.fillRect(s * 0.2, 0, s * 0.6, s);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(s * 0.2, s); g.lineTo(s * 0.42, s * 0.45); g.lineTo(s * 0.58, s * 0.45); g.lineTo(s * 0.8, s); g.closePath(); g.fill();
    },
    toast(g, s) {
      g.fillStyle = '#d9a35a'; rr(g, s * 0.25, s * 0.3, s * 0.5, s * 0.55, s * 0.12); g.fill(); outline(g, s * 0.025); g.stroke();
      g.fillStyle = '#f2d9a8'; rr(g, s * 0.32, s * 0.4, s * 0.36, s * 0.38, s * 0.08); g.fill();
    },
  };

  function person(g, s, o) {
    const cx = s * 0.5, small = o.small ? 0.8 : 1;
    const top = o.slump ? s * 0.3 : s * 0.22;
    g.save(); g.translate(cx, 0); g.scale(small, small); g.translate(-cx, 0);
    // legs
    g.fillStyle = '#2f3550'; rr(g, cx - s * 0.16, s * 0.62, s * 0.13, s * 0.32, s * 0.03); g.fill(); outline(g, s * 0.025); g.stroke(); rr(g, cx + s * 0.03, s * 0.62, s * 0.13, s * 0.32, s * 0.03); g.fill(); g.stroke();
    // body
    g.fillStyle = o.shirt; rr(g, cx - s * 0.2, s * 0.4, s * 0.4, s * 0.28, s * 0.05); g.fill(); g.stroke();
    // arms
    g.fillStyle = o.skin;
    if (o.wave) { g.save(); g.translate(cx + s * 0.2, s * 0.44); g.rotate(-0.9); rr(g, 0, -s * 0.05, s * 0.24, s * 0.1, s * 0.05); g.fill(); g.stroke(); g.restore(); }
    else if (o.rifle) { rr(g, cx - s * 0.05, s * 0.5, s * 0.34, s * 0.08, s * 0.04); g.fill(); g.stroke(); g.fillStyle = '#2a2a2a'; rr(g, cx - s * 0.1, s * 0.46, s * 0.5, s * 0.06, s * 0.02); g.fill(); g.stroke(); }
    else if (o.phone) { rr(g, cx + s * 0.1, s * 0.44, s * 0.1, s * 0.2, s * 0.04); g.fill(); g.stroke(); g.fillStyle = '#111'; rr(g, cx + s * 0.13, s * 0.36, s * 0.09, s * 0.14, s * 0.02); g.fill(); g.fillStyle = '#7fd7ff'; rr(g, cx + s * 0.145, s * 0.375, s * 0.06, s * 0.11, s * 0.01); g.fill(); }
    else { rr(g, cx - s * 0.3, s * 0.44, s * 0.1, s * 0.2, s * 0.04); g.fill(); g.stroke(); rr(g, cx + s * 0.2, s * 0.44, s * 0.1, s * 0.2, s * 0.04); g.fill(); g.stroke(); }
    if (o.laptop) { g.fillStyle = '#c0c0c8'; rr(g, cx - s * 0.22, s * 0.56, s * 0.44, s * 0.06, s * 0.02); g.fill(); g.stroke(); g.fillStyle = '#5ab0ff'; rr(g, cx - s * 0.2, s * 0.38, s * 0.4, s * 0.18, s * 0.02); g.fill(); g.stroke(); }
    // head
    g.fillStyle = o.skin; g.beginPath(); g.arc(cx, top + s * 0.02, s * 0.14, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = o.hair; g.beginPath(); g.arc(cx, top - s * 0.02, s * 0.145, Math.PI, 0); g.fill(); g.stroke();
    if (o.helmet) { g.fillStyle = o.helmet; g.beginPath(); g.arc(cx, top - s * 0.02, s * 0.165, Math.PI, 0); g.fill(); g.stroke(); }
    if (o.headset) { g.strokeStyle = '#333'; g.lineWidth = s * 0.02; g.beginPath(); g.arc(cx, top, s * 0.16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    // face
    g.fillStyle = '#1a1014';
    if (o.slump) { g.fillRect(cx - s * 0.06, top + s * 0.02, s * 0.03, s * 0.01); g.fillRect(cx + s * 0.03, top + s * 0.02, s * 0.03, s * 0.01); }
    else { g.beginPath(); g.arc(cx - s * 0.05, top, s * 0.015, 0, Math.PI * 2); g.arc(cx + s * 0.05, top, s * 0.015, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#1a1014'; g.lineWidth = s * 0.015; g.beginPath();
    if (o.wave || o.shirt === '#ff5c8a') g.arc(cx, top + s * 0.04, s * 0.05, 0.2, Math.PI - 0.2); else g.moveTo(cx - s * 0.04, top + s * 0.07), g.lineTo(cx + s * 0.04, top + s * 0.07);
    g.stroke();
    g.restore();
  }
  function flames(g, s, x, y, k) {
    for (const [dx, h, c] of [[-0.12, 0.9, '#ff7a1a'], [0.1, 1.1, '#ffb32b'], [0, 0.7, '#fff08a']]) {
      g.fillStyle = c; g.beginPath(); g.moveTo(x + s * (dx - 0.1) * k, y); g.quadraticCurveTo(x + s * (dx - 0.16) * k, y - s * 0.3 * k * h, x + s * dx * k, y - s * 0.55 * k * h); g.quadraticCurveTo(x + s * (dx + 0.16) * k, y - s * 0.3 * k * h, x + s * (dx + 0.1) * k, y); g.closePath(); g.fill();
    }
  }
  function sparks(g, s, x, y) {
    g.strokeStyle = '#fff36b'; g.lineWidth = s * 0.02;
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; g.beginPath(); g.moveTo(x + Math.cos(a) * s * 0.06, y + Math.sin(a) * s * 0.06); g.lineTo(x + Math.cos(a) * s * 0.16, y + Math.sin(a) * s * 0.16); g.stroke(); }
  }
  function glow(g, s, x, y, color) {
    const grd = g.createRadialGradient(x, y, 0, x, y, s * 0.45);
    grd.addColorStop(0, color + '66'); grd.addColorStop(1, color + '00');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }

  function icon(name, size) {
    const key = name + '@' + (size || 128);
    if (cache[key]) return cache[key];
    const s = size || 128;
    const c = canvas(s, s), g = c.getContext('2d');
    if (DRAW[name]) DRAW[name](g, s);
    else { g.fillStyle = '#ff2fb8'; g.fillRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4); }
    cache[key] = c;
    return c;
  }

  // ---- the neon signs: eight of them in one atlas, 4 across × 2 down, 512×128 each --------------------------
  const SIGNS = [
    ['PIZZA', '#ff3b6b'], ['VAPE', '#59f0ff'], ['OPEN 24 HRS', '#ffe14d'], ['NAILS', '#ff8ad8'],
    ['GOLD 4 CASH', '#ffc24d'], ['PSYCHIC', '#c86bff'], ['NOW HIRING', '#7dff7a'], ['TAX HELP', '#ff9a4d'],
  ];
  function signAtlas() {
    if (cache.signs) return cache.signs;
    const c = canvas(2048, 256), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 256);
    SIGNS.forEach((sg, i) => {
      const x = (i % 4) * 512, y = Math.floor(i / 4) * 128;
      g.save(); g.translate(x, y);
      g.font = 'bold 84px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round';
      // the tube: a thick dark stroke then the colour, then a thin white core
      g.lineWidth = 16; g.strokeStyle = '#111'; g.strokeText(sg[0], 256, 66);
      g.lineWidth = 9; g.strokeStyle = sg[1]; g.strokeText(sg[0], 256, 66);
      g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.strokeText(sg[0], 256, 66);
      g.restore();
    });
    cache.signs = c;
    return c;
  }

  // ---- the blimp's banner ---------------------------------------------------------------------------------
  const BANNERS = ['YOUR DATA IS SAFE WITH US', 'NOW HIRING (NOT YOU)', 'EVERYTHING MUST GO', 'THIS IS FINE', 'LIMITED TIME. ALWAYS.', 'SPONSORED BY NOBODY'];
  function banner(i) {
    const key = 'banner' + i;
    if (cache[key]) return cache[key];
    const c = canvas(1024, 128), g = c.getContext('2d');
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#c8232f'; g.fillRect(0, 0, 1024, 10); g.fillRect(0, 118, 1024, 10);
    g.fillStyle = '#1a1014'; g.font = 'bold 74px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(BANNERS[i % BANNERS.length], 512, 66);
    cache[key] = c;
    return c;
  }

  // ---- the brand marks (no logos; a star, a circle, a crown) -------------------------------------------------
  const BRAND = {
    george: { a: '#e02b2b', b: '#ffd23a', mark(g, s) { g.fillStyle = '#ffd23a'; star(g, s * 0.5, s * 0.5, s * 0.42, s * 0.18, 5); g.fill(); outline(g, s * 0.03); g.stroke(); } },
    lizzie: { a: '#2f6fd8', b: '#ffffff', mark(g, s) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.4, 0, Math.PI * 2); g.fill(); outline(g, s * 0.03); g.stroke(); g.fillStyle = '#e02b2b'; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.16, 0, Math.PI * 2); g.fill(); } },
    ralph: { a: '#f28c28', b: '#6b3a12', mark(g, s) { DRAW.crown(g, s); } },
  };
  function star(g, cx, cy, R, r, n) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n; const rr2 = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); }
    g.closePath();
  }
  function brandMark(slug, size) {
    const key = 'brand-' + slug + '@' + (size || 128);
    if (cache[key]) return cache[key];
    const s = size || 128, c = canvas(s, s), g = c.getContext('2d');
    (BRAND[slug] || BRAND.george).mark(g, s);
    cache[key] = c;
    return c;
  }

  // ---- soft round particle, a cloud, a spark -------------------------------------------------------------------
  function soft(size) {
    const key = 'soft' + size; if (cache[key]) return cache[key];
    const s = size || 64, c = canvas(s, s), g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    cache[key] = c; return c;
  }
  function cloud(seed) {
    const key = 'cloud' + seed; if (cache[key]) return cache[key];
    const s = 256, c = canvas(s, s / 2), g = c.getContext('2d');
    let r = seed * 9301 + 49297;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < 26; i++) {
      const x = s * (0.15 + rnd() * 0.7), y = s * (0.14 + rnd() * 0.24), rad = s * (0.05 + rnd() * 0.09);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s / 2);
    }
    cache[key] = c; return c;
  }

  globalThis.CarnageIcons = { icon, signAtlas, SIGNS, banner, BANNERS, brandMark, BRAND, soft, cloud, DRAW_NAMES: Object.keys(DRAW) };
})();
