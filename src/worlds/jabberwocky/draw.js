// Jabberwocky — the 2D art that survives in the 3D build: the hundred gag sprites, the fifty floor scars
// and the key, drawn in code in one chunky cutout style and cached as canvases. render3d.js turns them
// into sprite textures and floor decals. (The creatures, walls and rifle are Meshy models now.)
(function () {
  const TAU = Math.PI * 2;
  const cache = new Map();
  const MAX_CACHE = 500;
  function cached(key, w, h, fn, k) {
    let c = cache.get(key);
    if (c) return c;
    if (cache.size > MAX_CACHE) cache.clear();
    k = k || 1;
    c = document.createElement('canvas');
    c.width = w * k; c.height = h * k;
    const ctx = c.getContext('2d');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.scale(k, k);
    fn(ctx, w, h);
    cache.set(key, c);
    return c;
  }
  const INK = '#120a12';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  // seeded jitter for textures/scars
  function rng(seed) { let a = (seed * 1e9) | 0 || 7; return () => { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---- primitives (all in pixels of the target canvas) ------------------------------------
  function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = w; }
  function blob(ctx, x, y, rx, ry, fill, lw, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fillStyle = fill; ctx.fill();
    if (lw) { ink(ctx, lw); ctx.stroke(); }
    ctx.restore();
  }
  function box(ctx, x, y, w, h, fill, lw, r) {
    ctx.beginPath();
    if (r) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fill();
    if (lw) { ink(ctx, lw); ctx.stroke(); }
  }
  function poly(ctx, pts, fill, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ink(ctx, lw); ctx.stroke(); }
  }
  function line(ctx, x0, y0, x1, y1, color, lw) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke(); }
  function shine(ctx, x, y, r) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, -0.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); }
  function eyes(ctx, x, y, gap, r, look, dead, color) {
    for (const s of [-1, 1]) {
      blob(ctx, x + s * gap, y, r, r * 1.1, color || '#fff', r * 0.35);
      if (dead) { ink(ctx, r * 0.4); ctx.beginPath(); ctx.moveTo(x + s * gap - r * 0.5, y - r * 0.5); ctx.lineTo(x + s * gap + r * 0.5, y + r * 0.5); ctx.moveTo(x + s * gap + r * 0.5, y - r * 0.5); ctx.lineTo(x + s * gap - r * 0.5, y + r * 0.5); ctx.stroke(); }
      else blob(ctx, x + s * gap + (look || 0) * r * 0.4, y + r * 0.1, r * 0.42, r * 0.5, INK, 0);
    }
  }
  function grin(ctx, x, y, w, h, open, teeth) {
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + h * (open ? 2.2 : 1.4), x + w, y); ctx.quadraticCurveTo(x, y + h * 0.3, x - w, y);
    ctx.fillStyle = open ? '#3a0a14' : '#fff'; ctx.fill(); ink(ctx, w * 0.12); ctx.stroke();
    if (teeth) { ctx.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.32 - w * 0.12, y + h * 0.15); ctx.lineTo(x + i * w * 0.32 + w * 0.12, y + h * 0.15); ctx.lineTo(x + i * w * 0.32, y + h * 0.75); ctx.closePath(); ctx.fill(); } }
  }
  function star(ctx, x, y, r, n, fill, lw) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r * 0.45 : r; const a = -Math.PI / 2 + i * Math.PI / n; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (lw) { ink(ctx, lw); ctx.stroke(); }
  }
  function spikes(ctx, x, y, r, n, len, fill, lw) {
    for (let i = 0; i < n; i++) { const a = i / n * TAU; poly(ctx, [[x + Math.cos(a - 0.2) * r, y + Math.sin(a - 0.2) * r], [x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len)], [x + Math.cos(a + 0.2) * r, y + Math.sin(a + 0.2) * r]], fill, lw); }
  }
  function splat(ctx, x, y, r, fill, seed, lw) {
    const R = rng(seed || 1);
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU; const rr = r * (0.7 + R() * 0.5); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (lw) { ink(ctx, lw); ctx.stroke(); }
    for (let i = 0; i < 5; i++) blob(ctx, x + (R() - 0.5) * r * 3, y + (R() - 0.5) * r * 2, r * 0.18 * (0.5 + R()), r * 0.12 * (0.5 + R()), fill, lw ? lw * 0.6 : 0);
  }
  function fire(ctx, x, y, r, t, seed) {
    const R = rng(seed || 3);
    for (let i = 0; i < 5; i++) {
      const ph = t * 6 + i;
      const h = r * (1.1 + Math.sin(ph) * 0.3 + R() * 0.3);
      const ox = (R() - 0.5) * r * 1.2;
      poly(ctx, [[x + ox - r * 0.45, y], [x + ox, y - h], [x + ox + r * 0.45, y]], i % 2 ? '#ff7a1a' : '#ffd23a', i === 0 ? 3 : 0);
    }
    blob(ctx, x, y - r * 0.25, r * 0.4, r * 0.3, '#fff6c8', 0);
  }
  function cloud(ctx, x, y, r, fill, seed, lw) {
    const R = rng(seed || 5);
    for (let i = 0; i < 7; i++) blob(ctx, x + (R() - 0.5) * r * 1.6, y + (R() - 0.5) * r * 0.9, r * (0.35 + R() * 0.35), r * (0.3 + R() * 0.3), fill, lw || 0);
  }
  function text(ctx, s, x, y, size, fill, weight) {
    ctx.font = `${weight || 900} ${size}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.18; ctx.strokeStyle = INK; ctx.strokeText(s, x, y);
    ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }

  const S = 96;   // scar canvas size (drawn at 1.5×)
  // the little rifle the "smaller Jabberwocky rifle" gag throws
  function rifleSmall(ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    box(ctx, -18, -3, 36, 6, '#3a2a30', 2.5, 3); blob(ctx, -6, 0, 8, 7, '#c2189c', 2.5); box(ctx, 12, -2, 12, 4, '#e8c860', 2, 2);
    ctx.restore();
  }

  // ---- projectile sprites ----------------------------------------------------------------------
  const P = 64;
  const PROJ = {
    none: () => {},
    knife: (c, t) => { c.translate(32, 32); c.rotate(-0.6); poly(c, [[-26, 0], [10, -6], [26, 0], [10, 6]], '#d8dce8', 2.5); box(c, -26, -4, 12, 8, '#4a2a14', 2.5, 2); },
    chainsaw: (c, t) => { c.translate(32, 34); c.rotate(t * 2); box(c, -8, -6, 34, 12, '#e8b020', 2.5, 3); box(c, -26, -4, 20, 8, '#e02020', 2.5, 3); for (let i = 0; i < 9; i++) { const x = -6 + i * 4; poly(c, [[x, -6], [x + 2, -11 + ((i + Math.round(t * 30)) % 2) * 3], [x + 4, -6]], '#333', 0); poly(c, [[x, 6], [x + 2, 11 - ((i + Math.round(t * 30)) % 2) * 3], [x + 4, 6]], '#333', 0); } },
    rocket: (c, t) => { c.translate(32, 32); box(c, -14, -6, 30, 12, '#d8dce8', 2.5, 5); poly(c, [[16, -6], [26, 0], [16, 6]], '#e02020', 2.5); poly(c, [[-14, -6], [-22, -12], [-14, 0]], '#e02020', 2.5); poly(c, [[-14, 6], [-22, 12], [-14, 0]], '#e02020', 2.5); fire(c, -22, 0, 8, t, 2); },
    baseball: (c) => { blob(c, 32, 32, 12, 12, '#fff', 2.5); c.strokeStyle = '#e02020'; c.lineWidth = 2; c.beginPath(); c.arc(22, 32, 12, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(42, 32, 12, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); },
    pie: (c) => { blob(c, 32, 36, 24, 8, '#c8863a', 2.5); blob(c, 32, 32, 22, 8, '#5a2a8a', 2.5); blob(c, 32, 30, 8, 3, '#b0e0ff', 0); shine(c, 26, 29, 4); },
    fist: (c) => { blob(c, 32, 36, 22, 20, '#f2c8a0', 3); for (let i = 0; i < 4; i++) blob(c, 16 + i * 10, 24, 5, 6, '#f2c8a0', 2.5); blob(c, 12, 40, 6, 8, '#f2c8a0', 2.5); },
    jello: (c, t) => { blob(c, 32, 36, 24 + Math.sin(t * 12) * 2, 20 - Math.sin(t * 12) * 2, '#3ddc5a', 3); shine(c, 24, 28, 6); },
    flame: (c, t) => { fire(c, 32, 56, 18, t, 4); },
    gascloud: (c, t) => { cloud(c, 32, 34, 26, 'rgba(90,220,60,0.75)', 5, 2); },
    eagle: (c, t) => { const f = Math.sin(t * 20); poly(c, [[32, 30], [4, 24 - f * 10], [10, 34], [32, 36]], '#5a3a2a', 2.5); poly(c, [[32, 30], [60, 24 - f * 10], [54, 34], [32, 36]], '#5a3a2a', 2.5); blob(c, 32, 34, 10, 9, '#8a6a4a', 2.5); blob(c, 32, 22, 8, 8, '#f2e6d8', 2.5); poly(c, [[32, 24], [44, 26], [32, 30]], '#ffd23a', 2); blob(c, 30, 21, 2, 2, '#e02020', 0); },
    glueblob: (c) => { blob(c, 32, 32, 12, 10, '#f0eee6', 2.5); },
    piranha: (c, t) => { blob(c, 32, 32, 18, 11, '#3a8aa0', 2.5); poly(c, [[14, 32], [2, 22 + Math.sin(t * 25) * 6], [2, 42]], '#3a8aa0', 2.5); blob(c, 42, 28, 3, 3, '#fff', 1.5); blob(c, 43, 28, 1.5, 1.5, INK, 0); c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) poly(c, [[38 + i * 3, 36], [40 + i * 3, 36], [39 + i * 3, 41]], '#fff', 0); },
    blackhole: (c, t) => { c.translate(32, 32); c.rotate(t * 4); const g = c.createRadialGradient(0, 0, 4, 0, 0, 30); g.addColorStop(0, '#000'); g.addColorStop(0.5, '#1a0a30'); g.addColorStop(0.7, 'rgba(160,80,255,0.6)'); g.addColorStop(1, 'rgba(160,80,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill(); c.strokeStyle = '#d8b0ff'; c.lineWidth = 2; c.beginPath(); for (let a = 0; a < 12; a += 0.2) c.lineTo(Math.cos(a) * a * 2.2, Math.sin(a) * a * 2.2); c.stroke(); },
    train: (c, t) => { box(c, 4, 20, 56, 30, '#2a2a30', 3, 4); box(c, 40, 8, 20, 16, '#2a2a30', 3, 3); blob(c, 50, 4, 5, 5, '#3a3a40', 2.5); box(c, 8, 26, 12, 10, '#ffd23a', 2, 2); for (let i = 0; i < 3; i++) blob(c, 14 + i * 18, 52, 7, 7, '#555', 2.5); cloud(c, 52, -4 + 8, 12, 'rgba(200,200,210,0.7)', 5 + Math.round(t * 4), 0); },
    lavablob: (c, t) => { blob(c, 32, 36, 22, 16, '#ff5a1a', 3); blob(c, 30, 34, 10, 6, '#ffd23a', 0); },
    mousetrap: (c) => { box(c, 6, 30, 52, 30, '#c8a060', 3, 3); c.strokeStyle = '#888'; c.lineWidth = 4; c.beginPath(); c.moveTo(12, 34); c.lineTo(12, 8); c.lineTo(52, 8); c.lineTo(52, 34); c.stroke(); blob(c, 34, 44, 7, 6, '#ffd23a', 2.5); },
    hole: (c) => { blob(c, 32, 34, 28, 18, '#050308', 3); blob(c, 32, 30, 22, 10, '#000', 0); },
    hoof: (c) => { poly(c, [[10, 14], [46, 8], [58, 40], [24, 56]], '#4a3a2a', 3); poly(c, [[20, 50], [56, 36], [60, 46], [26, 60]], '#222', 2.5); },
    tornado: (c, t) => { for (let i = 0; i < 6; i++) { const y = 8 + i * 9, w = 6 + i * 4.5; blob(c, 32 + Math.sin(t * 9 + i) * 3, y, w, 4, i % 2 ? '#a8a8b8' : '#c8c8d8', 2); } },
    rock: (c) => { poly(c, [[16, 24], [30, 12], [48, 18], [52, 38], [36, 50], [18, 42]], '#7a7a82', 2.5); },
    purse: (c, t) => { c.translate(32, 40); c.rotate(Math.sin(t * 10) * 0.5); box(c, -18, -6, 36, 26, '#a02040', 3, 6); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(0, -10, 12, Math.PI, 0); c.stroke(); blob(c, 0, -2, 4, 4, '#ffd23a', 2); line(c, -12, -30, -14, -50, '#f2c8a0', 8); },
    vines: (c, t) => { c.strokeStyle = '#2a8a3a'; c.lineWidth = 5; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(12 + i * 13, 62); c.quadraticCurveTo(12 + i * 13 + Math.sin(t * 6 + i) * 14, 30, 20 + i * 10, 6); c.stroke(); } c.fillStyle = '#3ac850'; for (let i = 0; i < 5; i++) blob(c, 14 + i * 9, 20 + (i % 2) * 18, 6, 3, '#3ac850', 1.5, 0.6); },
    anvil: (c) => { poly(c, [[6, 20], [58, 20], [50, 34], [42, 34], [42, 46], [22, 46], [22, 34], [12, 34]], '#3a3a44', 3); box(c, 14, 46, 36, 8, '#2a2a30', 2.5, 2); shine(c, 20, 24, 5); },
    piano: (c) => { box(c, 6, 14, 52, 36, '#111', 3, 4); box(c, 10, 40, 44, 8, '#f2e6d8', 2, 1); c.fillStyle = '#111'; for (let i = 0; i < 8; i++) c.fillRect(13 + i * 5.5, 40, 3, 5); line(c, 10, 50, 10, 60, INK, 4); line(c, 54, 50, 54, 60, INK, 4); },
    bees: (c, t) => { const R = rng(4); for (let i = 0; i < 9; i++) { const x = 12 + R() * 40 + Math.sin(t * 25 + i) * 4, y = 12 + R() * 40 + Math.cos(t * 20 + i) * 3; blob(c, x, y, 4, 3, '#ffd23a', 1.5); c.fillStyle = INK; c.fillRect(x - 1, y - 3, 1.5, 6); blob(c, x, y - 4, 3, 1.5, 'rgba(255,255,255,0.7)', 0); } },
    cow: (c) => { blob(c, 32, 36, 24, 15, '#fff', 3); blob(c, 22, 32, 8, 6, '#222', 0); blob(c, 40, 40, 7, 5, '#222', 0); blob(c, 52, 26, 9, 8, '#fff', 2.5); blob(c, 55, 30, 5, 3.5, '#f2b6c8', 1.5); eyes(c, 51, 23, 3, 1.6, 0, false); for (let i = 0; i < 4; i++) line(c, 16 + i * 10, 48, 16 + i * 10, 58, INK, 4); },
    cat: (c, t) => { blob(c, 32, 38, 18, 12, '#6a6a78', 3); blob(c, 44, 28, 10, 9, '#6a6a78', 2.5); poly(c, [[38, 22], [40, 12], [45, 21]], '#6a6a78', 2); poly(c, [[48, 21], [52, 12], [52, 22]], '#6a6a78', 2); eyes(c, 45, 27, 3.5, 2, 0, false, '#ffd23a'); line(c, 14, 36, 4, 24 + Math.sin(t * 12) * 6, INK, 4); c.strokeStyle = '#7fbfff'; c.lineWidth = 2; for (let i = 0; i < 5; i++) line(c, 20 + i * 6, 50, 18 + i * 6, 58, '#7fbfff', 2); },
    snotblast: (c, t) => { cloud(c, 32, 34, 22, 'rgba(120,200,60,0.8)', 8, 2); blob(c, 40, 42, 6, 8, '#8ad040', 2); },
    legos: (c) => { const cols = ['#e02020', '#2050e0', '#ffd23a', '#20b050']; const R = rng(6); for (let i = 0; i < 8; i++) { const x = 8 + R() * 44, y = 10 + R() * 40; box(c, x, y, 12, 8, cols[i % 4], 2, 1); blob(c, x + 4, y - 1, 2, 1.5, cols[i % 4], 1); blob(c, x + 9, y - 1, 2, 1.5, cols[i % 4], 1); } },
    porcupine: (c) => { spikes(c, 32, 36, 14, 16, 12, '#4a3a2a', 1.5); blob(c, 32, 36, 16, 12, '#6a4a3a', 2.5); blob(c, 44, 36, 8, 7, '#6a4a3a', 2.5); eyes(c, 45, 34, 2.5, 1.5, 0, false); },
    sneaker: (c) => { poly(c, [[6, 44], [10, 26], [30, 20], [46, 18], [58, 36], [58, 48], [6, 48]], '#fff', 3); box(c, 4, 46, 56, 10, '#e02020', 2.5, 3); c.strokeStyle = INK; c.lineWidth = 2; for (let i = 0; i < 4; i++) line(c, 22 + i * 6, 26 + i * 1.5, 30 + i * 6, 34 + i * 1.5, INK, 2); blob(c, 24, 36, 10, 5, '#e02020', 2, -0.4); },
    gravy: (c, t) => { blob(c, 32, 40, 28, 14 + Math.sin(t * 8) * 2, '#6b3a1a', 3); shine(c, 22, 34, 6); },
    skunk: (c, t) => { blob(c, 30, 40, 18, 11, '#111', 3); blob(c, 30, 34, 14, 4, '#fff', 0); blob(c, 44, 34, 8, 7, '#111', 2.5); blob(c, 44, 31, 5, 2, '#fff', 0); poly(c, [[14, 36], [4, 12 + Math.sin(t * 6) * 4], [18, 26]], '#111', 2.5); poly(c, [[12, 30], [6, 16], [16, 26]], '#fff', 0); eyes(c, 45, 34, 2.5, 1.5, 0, false); },
    meteor: (c, t) => { fire(c, 32, 60, 22, t, 8); poly(c, [[14, 30], [26, 14], [46, 16], [54, 36], [40, 50], [20, 46]], '#5a4a48', 3); blob(c, 30, 30, 4, 3, '#3a2a28', 0); blob(c, 42, 36, 3, 2.5, '#3a2a28', 0); },
    paper: (c, t) => { c.translate(32, 32); c.rotate(t * 5); box(c, -10, -13, 20, 26, '#fff', 2, 1); c.fillStyle = '#aaa'; for (let i = 0; i < 4; i++) c.fillRect(-7, -8 + i * 6, 14, 1.5); },
    frost: (c) => { star(c, 32, 32, 14, 6, '#bfe8ff', 1.5); blob(c, 32, 32, 6, 6, '#fff', 0); },
    goose: (c, t) => { blob(c, 28, 40, 18, 11, '#fff', 3); line(c, 40, 34, 46, 12, INK, 8); line(c, 40, 34, 46, 12, '#fff', 5); blob(c, 47, 10, 7, 6, '#fff', 2.5); poly(c, [[52, 10], [62, 12], [52, 15]], '#ff9a20', 2); blob(c, 47, 9, 1.5, 1.5, INK, 0); poly(c, [[22, 36], [8, 22 + Math.sin(t * 20) * 8], [30, 32]], '#fff', 2.5); line(c, 26, 50, 24, 58, '#ff9a20', 3); line(c, 34, 50, 36, 58, '#ff9a20', 3); },
    bag: (c, t) => { blob(c, 32, 38, 18 + Math.sin(t * 15) * 3, 20, '#c8a060', 3); box(c, 24, 12, 16, 8, '#c8a060', 2.5, 2); blob(c, 26, 32, 3, 3, INK, 0); blob(c, 40, 30, 3, 3, INK, 0); poly(c, [[20, 26], [22, 18], [26, 26]], '#6a6a78', 1.5); },
    cannonball: (c) => { blob(c, 32, 32, 16, 16, '#222', 3); shine(c, 25, 25, 5); },
    swatter: (c) => { box(c, 8, 8, 34, 40, '#e02020', 3, 6); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; for (let i = 1; i < 5; i++) { line(c, 8 + i * 7, 8, 8 + i * 7, 48, 'rgba(0,0,0,0.4)', 1.5); line(c, 8, 8 + i * 8, 42, 8 + i * 8, 'rgba(0,0,0,0.4)', 1.5); } line(c, 42, 28, 62, 34, INK, 6); line(c, 42, 28, 62, 34, '#ffd23a', 3.5); },
    slaphands: (c, t) => { for (const s of [-1, 1]) { blob(c, 32 + s * 14 + Math.sin(t * 40) * s * 6, 32, 10, 13, '#f2c8a0', 2.5, s * 0.3); for (let i = 0; i < 4; i++) blob(c, 32 + s * 14 + s * 4 + Math.sin(t * 40) * s * 6, 18 + i * 3, 3, 6, '#f2c8a0', 1.5); } },
    burrito: (c, t) => { blob(c, 32, 32, 22, 10, '#e8c890', 3, 0.3); c.fillStyle = 'rgba(255,90,20,0.5)'; c.beginPath(); c.arc(32, 32, 8 + Math.sin(t * 20) * 2, 0, TAU); c.fill(); for (let i = 0; i < 3; i++) line(c, 22 + i * 10, 20, 24 + i * 10, 8 - Math.sin(t * 8 + i) * 3, 'rgba(255,255,255,0.5)', 2); },
    vending: (c) => { box(c, 12, 4, 40, 56, '#c8202a', 3, 3); box(c, 16, 8, 22, 30, '#1a2a3a', 2, 2); box(c, 40, 8, 8, 20, '#ffd23a', 2, 1); c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c.fillRect(19 + j * 6, 12 + i * 8, 4, 5); box(c, 16, 44, 32, 10, '#2a2a30', 2, 2); },
    sumo: (c, t) => { blob(c, 32, 40, 24, 22, '#f2c8a0', 3); blob(c, 32, 46, 20, 8, '#fff', 2.5); blob(c, 32, 14, 10, 9, '#f2c8a0', 2.5); box(c, 28, 4, 8, 6, INK, 0, 2); eyes(c, 32, 13, 4, 1.8, 0, false); for (const s of [-1, 1]) { line(c, 32 + s * 22, 30, 32 + s * 30, 36 + Math.sin(t * 10) * s * 4, INK, 7); blob(c, 32 + s * 30, 36 + Math.sin(t * 10) * s * 4, 5, 5, '#f2c8a0', 2); } },
    piledriver: (c) => { box(c, 24, 0, 16, 40, '#ffd23a', 3, 2); c.fillStyle = INK; for (let i = 0; i < 4; i++) c.fillRect(24, 4 + i * 10, 16, 4); box(c, 14, 40, 36, 16, '#444', 3, 2); },
    drill: (c, t) => { c.translate(32, 32); c.rotate(t * 40); poly(c, [[-20, -4], [12, -4], [22, 0], [12, 4], [-20, 4]], '#d8dce8', 2.5); box(c, -26, -8, 10, 16, '#888', 2, 2); },
    mosquitoes: (c, t) => { const R = rng(2); for (let i = 0; i < 12; i++) { const x = 8 + R() * 48 + Math.sin(t * 30 + i * 2) * 3, y = 8 + R() * 48 + Math.cos(t * 26 + i) * 3; blob(c, x, y, 2.2, 1.6, INK, 0); line(c, x + 2, y, x + 7, y, INK, 1); } },
    doll: (c, t) => { blob(c, 32, 50, 12, 14, '#f2b6d8', 2.5); blob(c, 32, 24, 13, 13, '#f7e2d0', 2.5); blob(c, 32, 14, 14, 6, '#e8c860', 2); eyes(c, 32, 22, 5, 3, 0, false); blob(c, 27, 22, 1.5, 1.5, '#000', 0); blob(c, 37, 22, 1.5, 1.5, '#000', 0); line(c, 26, 32, 38, 32, '#a02040', 1.5); line(c, 30, 28, 34, 36, 'rgba(0,0,0,0.5)', 1); },
    bus: (c) => { box(c, 4, 14, 56, 34, '#ffd23a', 3, 4); c.fillStyle = '#1a2a3a'; for (let i = 0; i < 4; i++) c.fillRect(8 + i * 13, 18, 10, 10); box(c, 6, 32, 52, 4, '#111', 0, 0); blob(c, 16, 50, 7, 7, '#222', 2.5); blob(c, 48, 50, 7, 7, '#222', 2.5); box(c, 20, 6, 24, 8, '#fff', 2, 1); },
    cart: (c, t) => { c.strokeStyle = '#aaa'; c.lineWidth = 2.5; for (let i = 0; i < 5; i++) line(c, 12 + i * 9, 14, 12 + i * 9, 44, '#aaa', 2.5); for (let i = 0; i < 4; i++) line(c, 12, 14 + i * 10, 48, 14 + i * 10, '#aaa', 2.5); line(c, 48, 14, 60, 8, INK, 4); line(c, 48, 14, 60, 8, '#e02020', 2); blob(c, 18, 52, 5, 5, '#222', 2); blob(c, 44, 52 + Math.sin(t * 30) * 2, 5, 5, '#222', 2); },
    bowling: (c, t) => { c.translate(32, 32); c.rotate(t * 10); blob(c, 0, 0, 18, 18, '#1a1a4a', 3); blob(c, -4, -6, 2.5, 2.5, '#000', 0); blob(c, 4, -6, 2.5, 2.5, '#000', 0); blob(c, 0, 2, 2.5, 2.5, '#000', 0); shine(c, -8, -8, 4); },
    chowder: (c, t) => { blob(c, 32, 40, 24, 10, '#e8e0c8', 3); blob(c, 32, 36, 20, 6, '#f6f0dc', 2); blob(c, 26, 36, 4, 2.5, '#c8a060', 0); blob(c, 38, 35, 3, 2, '#c8a060', 0); for (let i = 0; i < 3; i++) line(c, 22 + i * 10, 26, 24 + i * 10, 12 - Math.sin(t * 8 + i) * 3, 'rgba(255,255,255,0.5)', 2); },
    jackbox: (c, t) => { box(c, 12, 30, 40, 30, '#c2189c', 3, 3); c.fillStyle = '#ffd23a'; c.fillRect(14, 32, 36, 4); const up = Math.abs(Math.sin(t * 6)) * 20; c.strokeStyle = '#888'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 5; i++) c.lineTo(32 + (i % 2 ? 6 : -6), 30 - up * i / 4); c.stroke(); blob(c, 32, 26 - up, 9, 9, '#f7f2ea', 2.5); blob(c, 32, 28 - up, 3, 3, '#e02020', 1.5); eyes(c, 32, 24 - up, 4, 2, 0, false); },
    frogs: (c, t) => { const R = rng(3); for (let i = 0; i < 5; i++) { const x = 12 + R() * 40, y = 16 + R() * 36 + Math.abs(Math.sin(t * 8 + i)) * -6; blob(c, x, y, 8, 5, '#3a9a2a', 2); blob(c, x - 3, y - 4, 2.5, 2.5, '#fff', 1.2); blob(c, x + 3, y - 4, 2.5, 2.5, '#fff', 1.2); } },
    sink: (c) => { box(c, 8, 22, 48, 26, '#e8e8f0', 3, 4); box(c, 14, 26, 36, 14, '#c8c8d8', 2, 2); line(c, 32, 22, 32, 8, '#888', 4); line(c, 32, 8, 44, 8, '#888', 4); blob(c, 44, 12, 2, 4, '#7fbfff', 0); },
    yak: (c) => { blob(c, 30, 36, 24, 16, '#6b4a2a', 3); c.strokeStyle = '#4a3a2a'; c.lineWidth = 2; for (let i = 0; i < 6; i++) line(c, 10 + i * 8, 46, 8 + i * 8, 56, '#4a3a2a', 2); blob(c, 10, 30, 9, 8, '#6b4a2a', 2.5); poly(c, [[6, 24], [-2 + 4, 12], [12, 22]], '#e9e2cc', 2); eyes(c, 10, 28, 3, 1.6, 0, false); blob(c, 52, 34, 6, 3, '#4a3a2a', 0); },
    ham: (c) => { blob(c, 32, 34, 22, 16, '#e0708a', 3); blob(c, 32, 34, 14, 9, '#f2a0b0', 0); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.beginPath(); c.arc(32, 34, 8, 0, TAU); c.stroke(); box(c, 48, 30, 12, 8, '#f2e6d8', 2, 2); blob(c, 26, 26, 4, 4, '#ffd23a', 1.5); },
    trombone: (c, t) => { line(c, 8, 34, 48, 34, '#e8c860', 6); line(c, 8, 26, 48, 26, '#e8c860', 4); line(c, 8, 26, 8, 34, '#e8c860', 4); blob(c, 54, 30, 9, 12, '#ffd23a', 2.5); text(c, ['WAH', 'WAH', 'WAAAH'][Math.floor(t * 3) % 3], 32, 52, 12, '#fff'); },
    grandma: (c, t) => { blob(c, 32, 48, 16, 20, '#7a4aa0', 3); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.beginPath(), c.arc(22 + (i % 3) * 10, 40 + Math.floor(i / 3) * 12, 2, 0, TAU), c.fill(); blob(c, 32, 20, 12, 12, '#f2d8c0', 2.5); blob(c, 32, 10, 12, 6, '#d8d8e0', 2); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(24, 16, 7, 6); c.strokeRect(33, 16, 7, 6); line(c, 26, 28, 38, 28, '#a02040', 1.5); line(c, 48, 40, 60, 30 + Math.sin(t * 8) * 6, INK, 5); blob(c, 60, 30 + Math.sin(t * 8) * 6, 4, 4, '#f2d8c0', 2); },
    tent: (c) => { poly(c, [[4, 56], [32, 6], [60, 56]], '#c8202a', 3); c.fillStyle = '#f2e6d8'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(32, 6); c.lineTo(8 + i * 14, 56); c.lineTo(15 + i * 14, 56); c.fill(); } line(c, 32, 6, 32, 0, INK, 2); poly(c, [[32, 0], [42, 2], [32, 5]], '#ffd23a', 1.5); },
    balloon: (c, t) => { blob(c, 32, 24, 16, 20, '#e02020', 3); shine(c, 26, 16, 5); poly(c, [[30, 44], [34, 44], [32, 48]], '#e02020', 1.5); line(c, 32, 48, 30 + Math.sin(t * 4) * 4, 62, INK, 1.5); },
    hairdryer: (c, t) => { box(c, 8, 22, 34, 18, '#f2b6d8', 3, 8); box(c, 20, 40, 12, 18, '#f2b6d8', 3, 3); box(c, 42, 26, 10, 10, '#333', 2, 2); for (let i = 0; i < 3; i++) line(c, 54, 27 + i * 4, 62 + Math.sin(t * 20 + i) * 2, 24 + i * 6, 'rgba(255,255,255,0.6)', 2); },
    rose: (c) => { line(c, 32, 30, 28, 60, '#2a8a3a', 3); blob(c, 22, 44, 6, 3, '#3ac850', 1.5, 0.8); blob(c, 32, 26, 12, 11, '#c8102a', 2.5); blob(c, 32, 24, 7, 6, '#e83050', 1.5); blob(c, 32, 22, 3, 3, '#8a0818', 0); },
    potion: (c) => { poly(c, [[24, 10], [40, 10], [40, 26], [52, 50], [12, 50], [24, 26]], 'rgba(200,230,255,0.6)', 2.5); poly(c, [[16, 44], [48, 44], [52, 50], [12, 50]], '#ff5a8a', 0); box(c, 26, 4, 12, 8, '#4a2a14', 2, 2); blob(c, 30, 36, 3, 3, '#ff5a8a', 1); blob(c, 36, 34, 3, 3, '#ff5a8a', 1); },
    mirror: (c) => { c.save(); c.beginPath(); c.ellipse(32, 32, 16, 24, 0, 0, TAU); c.clip(); const g = c.createLinearGradient(16, 8, 48, 56); g.addColorStop(0, '#b0c0d0'); g.addColorStop(0.5, '#f0f6ff'); g.addColorStop(1, '#8090a0'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.restore(); blob(c, 32, 32, 16, 24, 'rgba(0,0,0,0)', 3); c.strokeStyle = '#c9a23a'; c.lineWidth = 4; c.beginPath(); c.ellipse(32, 32, 18, 26, 0, 0, TAU); c.stroke(); },
    ring: (c, t) => { c.translate(32, 32); c.rotate(t * 6); blob(c, 0, 4, 12, 12, 'rgba(0,0,0,0)', 5); c.strokeStyle = '#ffd23a'; c.lineWidth = 3; c.beginPath(); c.arc(0, 4, 12, 0, TAU); c.stroke(); star(c, 0, -10, 6, 4, '#bfe8ff', 1.5); },
    paw: (c, t) => { blob(c, 32, 40, 12, 12, '#5a3a2a', 3); for (let i = 0; i < 3; i++) line(c, 22 + i * 10, 30, 20 + i * 10, 14 + Math.sin(t * 3 + i) * 3, '#5a3a2a', 7); line(c, 44, 36, 54, 30, '#5a3a2a', 7); },
    envelope: (c) => { box(c, 8, 18, 48, 30, '#f2e6d8', 3, 2); poly(c, [[8, 18], [32, 36], [56, 18]], '#e0d0b8', 2.5); box(c, 14, 40, 20, 3, '#c8202a', 0, 0); text(c, 'IRS', 44, 42, 8, '#c8202a'); },
    finger: (c, t) => { blob(c, 32, 40, 12, 22, '#f2c8a0', 3, 0.3); blob(c, 38, 20, 6, 8, '#f2c8a0', 2.5); blob(c, 40, 16, 3, 3, '#7fbfff', 0); blob(c, 42, 24 + Math.sin(t * 6) * 4, 2, 3, '#7fbfff', 0); },
    cupcake: (c) => { poly(c, [[16, 36], [48, 36], [44, 58], [20, 58]], '#c8863a', 3); blob(c, 32, 30, 18, 12, '#f2b6d8', 3); blob(c, 32, 22, 10, 8, '#f2b6d8', 2); blob(c, 32, 16, 4, 4, '#e02020', 1.5); c.fillStyle = '#7fbfff'; for (let i = 0; i < 6; i++) c.fillRect(20 + i * 5, 26 + (i % 2) * 6, 3, 1.5); },
    karaoke: (c, t) => { box(c, 10, 16, 44, 40, '#2a2a30', 3, 4); box(c, 14, 20, 36, 16, '#1a4a8a', 2, 2); text(c, '♪♪', 32, 28, 12, '#ffd23a'); blob(c, 22, 46, 6, 6, '#444', 2); blob(c, 42, 46, 6, 6, '#444', 2); line(c, 54, 20, 60, 6, INK, 3); blob(c, 60, 5, 4, 4, '#888', 2); },
    rifle: (c, t) => { c.translate(32, 32); c.rotate(t * 4); rifleSmall(c, 0, 0, 0); },
    mother: (c) => { blob(c, 32, 52, 16, 20, '#4a6a8a', 3); blob(c, 32, 22, 12, 13, '#f2d8c0', 2.5); blob(c, 32, 11, 13, 7, '#5a3a2a', 2); eyes(c, 32, 21, 5, 2.4, 0, false); line(c, 27, 30, 37, 30, INK, 2); line(c, 24, 16, 30, 17, INK, 2); line(c, 34, 17, 40, 16, INK, 2); for (const s of [-1, 1]) line(c, 32 + s * 16, 42, 32 + s * 10, 52, INK, 6); },
    bagpipes: (c, t) => { blob(c, 32, 40, 18, 14, '#2a5a3a', 3); c.fillStyle = '#c8202a'; for (let i = 0; i < 4; i++) c.fillRect(16 + i * 8, 30, 3, 20); for (let i = 0; i < 3; i++) line(c, 24 + i * 8, 28, 20 + i * 12, 4, '#4a2a14', 5); line(c, 48, 36, 62, 30, '#4a2a14', 4); text(c, ['♪', '♫', '♬'][Math.floor(t * 4) % 3], 54, 14, 12, '#ffd23a'); },
    herring: (c, t) => { blob(c, 30, 32, 18, 8, '#8aa8c8', 2.5); poly(c, [[12, 32], [2, 24], [2, 40]], '#8aa8c8', 2.5); blob(c, 40, 30, 2.5, 2.5, '#fff', 1); blob(c, 41, 30, 1.2, 1.2, INK, 0); line(c, 20, 26, 36, 24, 'rgba(255,255,255,0.4)', 2); },
    confetti: (c, t) => { const R = rng(12); const cols = ['#e02020', '#ffd23a', '#20b050', '#2050e0', '#c2189c']; for (let i = 0; i < 18; i++) { c.save(); c.translate(6 + R() * 52, 6 + R() * 52); c.rotate(R() * TAU + t); c.fillStyle = cols[i % 5]; c.fillRect(-3, -1.5, 6, 3); c.restore(); } },
    flag: (c) => { line(c, 12, 60, 12, 6, INK, 3); poly(c, [[12, 8], [58, 14], [12, 34]], '#e02020', 2.5); text(c, 'BANG', 32, 20, 10, '#fff'); },
    feather: (c, t) => { c.translate(32, 32); c.rotate(Math.sin(t * 2) * 0.5); blob(c, 0, 0, 5, 22, '#f2e6d8', 2, 0.3); line(c, 0, -22, 0, 26, '#c8c8c8', 1.5); },
    cookie: (c) => { poly(c, [[14, 40], [26, 18], [40, 18], [52, 40], [40, 46], [26, 46]], '#e8c890', 3); box(c, 28, 34, 10, 4, '#fff', 1, 0); },
    hairball: (c) => { const R = rng(8); blob(c, 32, 36, 12, 9, '#6a5a4a', 2.5); c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.2; for (let i = 0; i < 20; i++) { c.beginPath(); c.moveTo(22 + R() * 20, 28 + R() * 16); c.lineTo(20 + R() * 24, 26 + R() * 20); c.stroke(); } },
    receipt: (c) => { box(c, 20, 4, 24, 56, '#fff', 2.5, 1); c.fillStyle = '#888'; for (let i = 0; i < 9; i++) c.fillRect(24, 10 + i * 5, 10 + (i % 3) * 3, 1.5); poly(c, [[20, 60], [24, 56], [28, 60], [32, 56], [36, 60], [40, 56], [44, 60]], '#fff', 0); },
    glitter: (c, t) => { const R = rng(21); for (let i = 0; i < 24; i++) { const x = 6 + R() * 52, y = 6 + R() * 52; star(c, x, y, 2.5 + Math.sin(t * 10 + i) * 1, 4, ['#ffd23a', '#fff', '#7fd7ff'][i % 3], 0); } },
    skull: (c, t) => { fire(c, 32, 44, 16, t, 6); blob(c, 32, 30, 14, 13, '#e9e2cc', 2.5); blob(c, 26, 28, 4, 4.5, '#1a0a0a', 0); blob(c, 38, 28, 4, 4.5, '#1a0a0a', 0); blob(c, 26, 28, 2, 2, '#ff7a1a', 0); blob(c, 38, 28, 2, 2, '#ff7a1a', 0); poly(c, [[30, 34], [34, 34], [32, 38]], '#1a0a0a', 0); c.fillStyle = '#e9e2cc'; for (let i = 0; i < 5; i++) c.fillRect(25 + i * 3.2, 40, 2.2, 4); },
    boomerang: (c, t) => { c.translate(32, 32); c.rotate(t * 12); poly(c, [[-22, 6], [-4, -6], [4, -6], [22, 6], [16, 12], [0, 2], [-16, 12]], '#c8863a', 3); },
  };
  function projSprite(key, t) {
    const fn = PROJ[key] || PROJ.none;
    const frame = Math.floor((t || 0) * 12) % 12;
    return cached(`proj|${key}|${frame}`, P, P, (ctx) => { ctx.save(); fn(ctx, frame / 12); ctx.restore(); }, 2);
  }

  // ---- scars (drawn flat; render squashes them onto the floor) -----------------------------
  const SCAR = {
    knives: (c, R) => { for (let i = 0; i < 5; i++) { c.save(); c.translate(20 + R() * 56, 30 + R() * 40); c.rotate(R() * TAU); poly(c, [[-14, 0], [4, -3], [14, 0], [4, 3]], '#d8dce8', 2); box(c, -14, -2.5, 7, 5, '#4a2a14', 2, 1); c.restore(); } },
    blood: (c, R) => splat(c, 48, 50, 30, '#8a1020', R() * 100, 2),
    scorch: (c, R) => { splat(c, 48, 50, 34, 'rgba(20,12,10,0.85)', R() * 100, 0); splat(c, 48, 50, 18, 'rgba(60,30,20,0.6)', R() * 100, 0); },
    balls: (c, R) => { for (let i = 0; i < 7; i++) PROJ_at(c, 'baseball', 14 + R() * 68, 22 + R() * 50, 0.4); },
    pie: (c, R) => { splat(c, 48, 50, 30, '#5a2a8a', R() * 100, 2.5); blob(c, 46, 46, 14, 6, '#c8863a', 2); },
    jello: (c, R) => { blob(c, 48, 52, 42, 26, 'rgba(61,220,90,0.85)', 3); shine(c, 34, 42, 10); },
    gas: (c, R) => { cloud(c, 48, 48, 42, 'rgba(90,220,60,0.45)', R() * 100, 0); cloud(c, 48, 50, 28, 'rgba(120,240,80,0.35)', R() * 100, 0); },
    feathers: (c, R) => { for (let i = 0; i < 7; i++) { c.save(); c.translate(14 + R() * 68, 22 + R() * 50); c.rotate(R() * TAU); blob(c, 0, 0, 3, 11, i % 2 ? '#f2e6d8' : '#5a3a2a', 1.5); c.restore(); } },
    glue: (c, R) => { splat(c, 48, 50, 38, '#f0eee6', R() * 100, 2.5); shine(c, 36, 42, 8); },
    fish: (c, R) => { for (let i = 0; i < 5; i++) PROJ_at(c, 'piranha', 16 + R() * 64, 24 + R() * 48, 0.5, R() * TAU); },
    rails: (c) => { c.fillStyle = '#4a3a2a'; for (let i = 0; i < 5; i++) c.fillRect(8, 20 + i * 14, 80, 6); line(c, 30, 12, 30, 90, '#8a8a96', 5); line(c, 66, 12, 66, 90, '#8a8a96', 5); },
    lava: (c, R) => { splat(c, 48, 50, 40, '#ff5a1a', R() * 100, 3); splat(c, 46, 48, 22, '#ffd23a', R() * 100, 0); },
    trap: (c) => { box(c, 12, 30, 72, 40, '#c8a060', 3, 3); c.strokeStyle = '#888'; c.lineWidth = 5; c.beginPath(); c.moveTo(20, 34); c.lineTo(20, 48); c.lineTo(76, 48); c.lineTo(76, 34); c.stroke(); },
    hole: (c) => { blob(c, 48, 50, 40, 26, '#050308', 3); blob(c, 48, 46, 30, 16, '#000', 0); },
    gravel: (c, R) => { for (let i = 0; i < 16; i++) poly(c, [[20 + R() * 56, 26 + R() * 44], [24 + R() * 56, 26 + R() * 44], [22 + R() * 56, 30 + R() * 44]], '#7a7a82', 1.5); },
    purse: (c) => { PROJ_at(c, 'purse', 48, 52, 1.2, 0.8); },
    vines: (c, R) => { c.strokeStyle = '#2a8a3a'; c.lineWidth = 5; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(48, 50); c.quadraticCurveTo(48 + (R() - 0.5) * 60, 50 + (R() - 0.5) * 60, 48 + (R() - 0.5) * 90, 50 + (R() - 0.5) * 70); c.stroke(); } },
    anvil: (c) => PROJ_at(c, 'anvil', 48, 50, 1.3),
    piano: (c, R) => { PROJ_at(c, 'piano', 48, 46, 1.4, 0.15); for (let i = 0; i < 6; i++) box(c, 10 + R() * 76, 60 + R() * 30, 6, 12, i % 2 ? '#111' : '#f2e6d8', 1.5, 1); },
    cow: (c) => { c.save(); c.translate(48, 50); c.rotate(Math.PI); c.scale(1.4, 1.4); c.translate(-32, -32); PROJ.cow(c, 0); c.restore(); },
    cat: (c) => PROJ_at(c, 'cat', 48, 50, 1.2, 0),
    snot: (c, R) => splat(c, 48, 50, 36, 'rgba(120,200,60,0.8)', R() * 100, 2),
    legos: (c, R) => { c.save(); c.translate(48, 50); c.scale(1.5, 1.5); c.translate(-32, -32); PROJ.legos(c, 0); c.restore(); },
    quills: (c, R) => { for (let i = 0; i < 12; i++) { c.save(); c.translate(14 + R() * 68, 22 + R() * 50); c.rotate(R() * TAU); line(c, -8, 0, 8, 0, '#4a3a2a', 2.5); c.restore(); } },
    footprint: (c) => { blob(c, 48, 60, 30, 18, 'rgba(0,0,0,0.55)', 0); blob(c, 48, 30, 26, 14, 'rgba(0,0,0,0.55)', 0); c.fillStyle = 'rgba(0,0,0,0.55)'; for (let i = 0; i < 5; i++) c.fillRect(22 + i * 12, 12, 8, 6); },
    gravy: (c, R) => splat(c, 48, 50, 40, '#6b3a1a', R() * 100, 2.5),
    stink: (c, R) => { cloud(c, 48, 48, 40, 'rgba(160,200,60,0.4)', R() * 100, 0); for (let i = 0; i < 3; i++) line(c, 30 + i * 18, 60, 34 + i * 18, 30, 'rgba(180,220,80,0.5)', 3); },
    crater: (c, R) => { splat(c, 48, 50, 40, '#2a1a18', R() * 100, 3); blob(c, 48, 50, 22, 14, '#0a0608', 0); for (let i = 0; i < 5; i++) blob(c, 20 + R() * 56, 24 + R() * 52, 4, 3, '#ff5a1a', 0); },
    paper: (c, R) => { for (let i = 0; i < 10; i++) { c.save(); c.translate(14 + R() * 68, 22 + R() * 50); c.rotate(R() * TAU); box(c, -6, -8, 12, 16, '#fff', 1.5, 1); c.restore(); } },
    frost: (c, R) => { splat(c, 48, 50, 38, 'rgba(191,232,255,0.8)', R() * 100, 2); star(c, 48, 50, 14, 6, '#fff', 1); },
    cannonball: (c) => PROJ_at(c, 'cannonball', 48, 50, 1),
    burrito: (c, R) => { splat(c, 48, 50, 26, '#e8c890', R() * 100, 2); blob(c, 48, 50, 10, 6, '#c8863a', 1.5); },
    puddle: (c, R) => splat(c, 48, 50, 30, '#5a3a1a', R() * 100, 2),
    machine: (c) => PROJ_at(c, 'vending', 48, 52, 1.3, 0.3),
    teeth: (c, R) => { for (let i = 0; i < 9; i++) poly(c, [[20 + R() * 56, 26 + R() * 44], [26 + R() * 56, 26 + R() * 44], [23 + R() * 56, 34 + R() * 44]], '#fff', 1.5); },
    frogs: (c) => { c.save(); c.translate(48, 50); c.scale(1.5, 1.5); c.translate(-32, -32); PROJ.frogs(c, 0); c.restore(); },
    sink: (c) => PROJ_at(c, 'sink', 48, 50, 1.2, 0.1),
    chowder: (c, R) => { splat(c, 48, 50, 32, '#f6f0dc', R() * 100, 2); for (let i = 0; i < 5; i++) blob(c, 24 + R() * 48, 30 + R() * 40, 4, 3, '#c8a060', 0); },
    herring: (c) => PROJ_at(c, 'herring', 48, 50, 1.2, 0.3),
    confetti: (c) => { c.save(); c.translate(48, 50); c.scale(1.5, 1.5); c.translate(-32, -32); PROJ.confetti(c, 0); c.restore(); },
    hairball: (c) => PROJ_at(c, 'hairball', 48, 50, 1),
    receipt: (c) => { c.save(); c.translate(48, 50); c.rotate(1.3); c.scale(1.4, 1.4); c.translate(-32, -32); PROJ.receipt(c, 0); c.restore(); },
    glitter: (c) => { c.save(); c.translate(48, 50); c.scale(1.5, 1.5); c.translate(-32, -32); PROJ.glitter(c, 0); c.restore(); },
    pins: (c, R) => { for (let i = 0; i < 6; i++) { c.save(); c.translate(16 + R() * 64, 24 + R() * 48); c.rotate(R() * TAU); blob(c, 0, 0, 5, 12, '#fff', 2); c.fillStyle = '#e02020'; c.fillRect(-5, -5, 10, 2.5); c.restore(); } },
    rose: (c) => PROJ_at(c, 'rose', 48, 50, 1.1, 1.2),
    ring: (c) => PROJ_at(c, 'ring', 48, 50, 0.8),
    cookie: (c) => { PROJ_at(c, 'cookie', 40, 50, 1); box(c, 50, 42, 30, 8, '#fff', 1.5, 1); },
    flag: (c) => PROJ_at(c, 'flag', 48, 50, 1.2, 1.4),
    doll: (c) => PROJ_at(c, 'doll', 48, 50, 1.2, 1.5),
    tent: (c) => { blob(c, 48, 50, 44, 30, '#c8202a', 3); c.fillStyle = '#f2e6d8'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(48, 50); c.lineTo(8 + i * 22, 30); c.lineTo(18 + i * 22, 28); c.fill(); } },
  };
  function PROJ_at(c, key, x, y, s, rot) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s, s); c.translate(-32, -32); PROJ[key](c, 0); c.restore();
  }
  function scarSprite(type, seed) {
    const fn = SCAR[type];
    if (!fn) return null;
    return cached(`scar|${type}|${Math.round(seed * 8)}`, S, S, (ctx) => { const R = rng(seed * 10 + 1); ctx.save(); fn(ctx, R); ctx.restore(); }, 1.5);
  }

  // ---- the key ---------------------------------------------------------------------------------
  function keySprite(t) {
    const frame = Math.floor(t * 8) % 16;
    return cached(`key|${frame}`, P, P, (ctx) => {
      const sq = Math.cos(frame / 16 * TAU);
      ctx.translate(32, 32); ctx.scale(Math.max(0.15, Math.abs(sq)), 1); ctx.translate(-32, -32);
      ctx.shadowColor = '#ffd23a'; ctx.shadowBlur = 12;
      blob(ctx, 20, 24, 12, 12, '#ffd23a', 3); blob(ctx, 20, 24, 5, 5, '#1a1208', 0);
      box(ctx, 30, 20, 26, 7, '#ffd23a', 3, 2); box(ctx, 46, 26, 5, 8, '#ffd23a', 2.5, 1); box(ctx, 38, 26, 5, 6, '#ffd23a', 2.5, 1);
    });
  }

  // the pie: a crusted meat pie with a wobbling red filling, a couple of flies, and a glow so you spot it down a hall
  function healSprite(t) {
    const frame = Math.floor(t * 8) % 16;
    return cached(`heal|${frame}`, P, P, (ctx) => {
      const ph = frame / 16 * TAU;
      ctx.shadowColor = '#ff4a3a'; ctx.shadowBlur = 10;
      // plate
      blob(ctx, 32, 46, 27, 8, '#8a8f9a', 2.5);
      // crust
      blob(ctx, 32, 36, 22, 12, '#c98a3e', 3);
      blob(ctx, 32, 33, 20, 9, '#e0a552', 0);
      // the filling, breathing through the vent
      const w = 6 + Math.sin(ph) * 1.5;
      blob(ctx, 32, 33, w, w * 0.6, '#c81a1a', 2.5);
      blob(ctx, 32, 33, w * 0.5, w * 0.3, '#ff5a3a', 0);
      // crimped edge
      ctx.shadowBlur = 0;
      for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; blob(ctx, 32 + Math.cos(a) * 21, 38 + Math.sin(a) * 9, 3, 3, '#a86a2a', 0); }
      // a steam curl and two flies
      ctx.globalAlpha = 0.5; line(ctx, 30, 22, 28, 17 - Math.sin(ph) * 2, '#ffffff', 2); line(ctx, 28, 17 - Math.sin(ph) * 2, 32, 13, '#ffffff', 2); ctx.globalAlpha = 1;
      blob(ctx, 20 + Math.sin(ph * 2) * 4, 18 + Math.cos(ph * 3) * 3, 1.6, 1.6, '#120a12', 0);
      blob(ctx, 44 + Math.cos(ph * 2) * 4, 20 + Math.sin(ph * 2.5) * 3, 1.6, 1.6, '#120a12', 0);
    });
  }

  globalThis.JabberwockyDraw = { S, projSprite, scarSprite, keySprite, healSprite, PROJ, SCAR, cache, primitives: { blob, box, poly, line, text, star, fire, cloud, splat } };
})();
