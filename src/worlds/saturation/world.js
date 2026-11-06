// Saturation — a 20 × 16 wall of pictures. Every cell swaps to a random picture from
// the pool at its own random moment, one to three seconds after its last swap, forever.
// The pool comes from any folder on disk through the dev server (/api/images); with no
// folder set, or under file://, the cells are flat colour swatches so the grid still reads.
(() => {
  const KEY = 'saturation-config-1';
  const DEFAULTS = { dir: '', cols: 20, rows: 16, min: 1, max: 3, rate: 0.5, gap: 0, fit: 'cover', sweeps: true, sweepMin: 8, sweepMax: 15, sweepLen: 1.2 };
  // rate: the speed slider's position 0 … 1. 0 is a full stop (only the sweeps move); above that
  // the multiplier is 10^((rate − 0.5) × 6): 1/1000× at the left, 1× in the middle, 1000× at the
  // right. Past ~60× every cell wants to swap more than once a frame, so the screen is simply
  // every cell every frame — the slider's top end is beyond what any browser can show.
  const cfg = Object.assign({}, DEFAULTS);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };

  const grid = document.getElementById('grid');
  const root = document.documentElement;
  const served = location.protocol.startsWith('http');
  const apiBase = served ? '' : 'http://127.0.0.1:4174';

  let pool = [];          // source image URLs (full size, on the server)
  let ready = [];         // small copies as blob URLs — the only thing a cell ever shows
  let cells = [];         // { el, img, next }
  let gen = 0;            // bumps on every folder load so a stale warm-up stops

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = () => ready[(Math.random() * ready.length) | 0];

  function applyLayout() {
    root.style.setProperty('--cols', cfg.cols);
    root.style.setProperty('--rows', cfg.rows);
    root.style.setProperty('--gap', cfg.gap + 'px');
    root.style.setProperty('--fit', cfg.fit);
  }

  function buildCells() {
    grid.textContent = '';
    cells = [];
    const n = cfg.cols * cfg.rows;
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'cell';
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      el.appendChild(img);
      grid.appendChild(el);
      const c = { el, img, next: now + rand(0, cfg.max * 1000) };
      cells.push(c);
      swap(c);
    }
  }

  function swap(c) {
    if (ready.length) {
      c.el.classList.remove('swatch');
      c.img.src = pick();
    } else {
      c.el.classList.add('swatch');
      c.el.style.setProperty('--h', (Math.random() * 360) | 0);
    }
  }

  const multiplier = () => (cfg.rate <= 0 ? 0 : Math.pow(10, (cfg.rate - 0.5) * 6));

  // pause: the clocks stop; on resume every cell's next swap is pushed by the time paused
  let paused = false, pausedAt = 0;
  function setPaused(on) {
    if (on === paused) return;
    paused = on;
    const now = performance.now();
    if (on) pausedAt = now; else { const d = now - pausedAt; for (const c of cells) c.next += d; nextSweep += d; }
    const b = document.getElementById('cfg-pause');
    b.textContent = on ? 'resume' : 'pause';
    b.classList.toggle('on', on);
  }

  // THE SWEEPS (sweeps.js): every sweepMin–sweepMax seconds one pattern hands every cell a
  // moment within the next sweepLen seconds; the cell swaps then and falls back to random.
  let nextSweep = performance.now() + rand(cfg.sweepMin, cfg.sweepMax) * 1000;
  let lastSweep = '';
  function seeded(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  function runSweep(which) {
    const list = window.SATURATION_SWEEPS || [];
    if (!list.length) return;
    const sw = which != null ? list[which % list.length] : list[(Math.random() * list.length) | 0];
    const rnd = seeded((Math.random() * 1e9) | 0);
    const C = cfg.cols, R = cfg.rows, len = cfg.sweepLen * 1000;
    const st = sw.setup ? sw.setup(C, R, rnd) : null;
    const now = performance.now();
    for (let i = 0; i < cells.length; i++) {
      const c = i % C, r = (i / C) | 0;
      const t = Math.max(0, Math.min(1, sw.at(c, r, C, R, rnd, st)));
      cells[i].next = now + t * len;
    }
    lastSweep = sw.name;
    const el = document.getElementById('cfg-last');
    if (el) el.textContent = 'last sweep: ' + sw.name;
  }

  function tick(now) {
    if (paused) { requestAnimationFrame(tick); return; }
    if (cfg.sweeps && now >= nextSweep) {
      runSweep();
      nextSweep = now + cfg.sweepLen * 1000 + rand(Math.min(cfg.sweepMin, cfg.sweepMax), Math.max(cfg.sweepMin, cfg.sweepMax)) * 1000;
    }
    const m = multiplier();
    const k = m > 0 ? 1000 / m : Infinity;
    const lo = Math.min(cfg.min, cfg.max) * k, hi = Math.max(cfg.min, cfg.max) * k;
    for (const c of cells) {
      if (now >= c.next) { swap(c); c.next = m > 0 ? now + rand(lo, hi) : Infinity; }
    }
    requestAnimationFrame(tick);
  }

  // THE THUMBNAILS. A cell is ~100 px wide; decoding a 4,000 px photo for it 160 times a
  // second is what sent his laptop fan wild. So every picture is fetched once, shrunk to the
  // cell's size on a canvas, and kept as a tiny JPEG blob; the cells only ever swap those.
  // Done in the background a few at a time; the cells fill in as they arrive.
  function thumbSize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (window.innerWidth / cfg.cols) * dpr, h = (window.innerHeight / cfg.rows) * dpr;
    return Math.min(360, Math.ceil(Math.max(w, h) * 1.15));
  }
  async function makeThumb(url, size) {
    // no-store: the original is read once and shrunk; it must not pile up in the browser's disk cache
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.statusText);
    const blob = await r.blob();
    let bmp;
    try { bmp = await createImageBitmap(blob, { resizeWidth: size, resizeQuality: 'medium' }); }
    catch { bmp = await createImageBitmap(blob); }
    const sc = Math.min(1, size / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(bmp.width * sc));
    cv.height = Math.max(1, Math.round(bmp.height * sc));
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    bmp.close();
    const out = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.82));
    return URL.createObjectURL(out);
  }
  async function warmUp(myGen) {
    const status = document.getElementById('cfg-status');
    const size = thumbSize();
    const queue = pool.slice();
    // shuffle so the first pictures on screen come from all over the folder
    for (let i = queue.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [queue[i], queue[j]] = [queue[j], queue[i]]; }
    let i = 0, failed = 0;
    const worker = async () => {
      while (i < queue.length && myGen === gen) {
        const url = queue[i++];
        try { const t = await makeThumb(url, size); if (myGen === gen) ready.push(t); else URL.revokeObjectURL(t); }
        catch { failed++; }
        if ((ready.length + failed) % 25 === 0 || ready.length + failed === queue.length) {
          status.textContent = `${ready.length} of ${queue.length} pictures ready${failed ? ` (${failed} unreadable)` : ''}`;
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  function clearReady() { for (const u of ready) URL.revokeObjectURL(u); ready = []; }

  async function loadFolder(dir) {
    const status = document.getElementById('cfg-status');
    if (!dir) { pool = []; gen++; clearReady(); status.textContent = 'no folder yet — showing colour tiles'; return; }
    status.textContent = 'reading folder…';
    try {
      const r = await fetch(`${apiBase}/api/images?dir=${encodeURIComponent(dir)}`);
      if (r.status === 404) throw new Error('the server is an older one — restart it, then try again');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      pool = data.files.map((f) => `${apiBase}/api/image-file?path=${encodeURIComponent(f)}`);
      gen++; clearReady();
      status.textContent = `0 of ${data.count} pictures ready`;
      warmUp(gen);
    } catch (e) {
      pool = []; gen++; clearReady();
      status.textContent = served ? `could not read it: ${e.message}` : 'needs the dev server (4174) to read a folder';
    }
  }

  // configuration panel
  const panel = document.getElementById('cfg');
  const btn = document.getElementById('cfg-btn');
  const $ = (id) => document.getElementById(id);
  const fields = { dir: $('cfg-dir'), cols: $('cfg-cols'), rows: $('cfg-rows'), min: $('cfg-min'), max: $('cfg-max'), rate: $('cfg-speed'), sweepMin: $('cfg-sweep-min'), sweepMax: $('cfg-sweep-max'), sweepLen: $('cfg-sweep-len'), gap: $('cfg-gap'), fit: $('cfg-fit') };
  const fmt = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  const speedLabel = () => { const m = multiplier(); $('cfg-speed-val').textContent = m === 0 ? 'stopped' : m >= 1 ? fmt(m) + '×' : '1/' + fmt(1 / m) + '×'; };
  function fill() { for (const k in fields) fields[k].value = cfg[k]; $('cfg-sweeps').checked = !!cfg.sweeps; speedLabel(); }
  function readFields() {
    cfg.dir = fields.dir.value.trim();
    cfg.cols = Math.max(1, Math.min(60, +fields.cols.value || DEFAULTS.cols));
    cfg.rows = Math.max(1, Math.min(60, +fields.rows.value || DEFAULTS.rows));
    cfg.min = Math.max(0.05, +fields.min.value || DEFAULTS.min);
    cfg.max = Math.max(0.05, +fields.max.value || DEFAULTS.max);
    cfg.rate = Math.max(0, Math.min(1, +fields.rate.value || 0));
    // a change of pace takes hold at once: re-deal every cell's next moment
    { const m = multiplier(); const k = m > 0 ? 1000 / m : Infinity; const now = performance.now(); for (const c of cells) if (c.next !== Infinity || m > 0) c.next = m > 0 ? Math.min(c.next, now + rand(Math.min(cfg.min, cfg.max) * k, Math.max(cfg.min, cfg.max) * k)) : Infinity; }
    cfg.gap = Math.max(0, +fields.gap.value || 0);
    cfg.sweeps = $('cfg-sweeps').checked;
    cfg.sweepMin = Math.max(1, +fields.sweepMin.value || DEFAULTS.sweepMin);
    cfg.sweepMax = Math.max(1, +fields.sweepMax.value || DEFAULTS.sweepMax);
    cfg.sweepLen = Math.max(0.1, +fields.sweepLen.value || DEFAULTS.sweepLen);
    cfg.fit = fields.fit.value;
    save();
  }
  for (const k of ['cols', 'rows', 'gap', 'fit']) fields[k].addEventListener('change', () => { readFields(); applyLayout(); buildCells(); });
  for (const k of ['min', 'max', 'sweepMin', 'sweepMax', 'sweepLen']) fields[k].addEventListener('change', readFields);
  $('cfg-sweeps').addEventListener('change', () => { readFields(); nextSweep = performance.now() + rand(cfg.sweepMin, cfg.sweepMax) * 1000; });
  $('cfg-sweep-now').addEventListener('click', () => { readFields(); runSweep(); nextSweep = performance.now() + cfg.sweepLen * 1000 + rand(cfg.sweepMin, cfg.sweepMax) * 1000; });
  fields.rate.addEventListener('input', () => { readFields(); speedLabel(); });
  fields.rate.addEventListener('dblclick', () => { fields.rate.value = 0.5; readFields(); speedLabel(); });
  $('cfg-pause').addEventListener('click', () => setPaused(!paused));
  $('cfg-browse').addEventListener('click', async () => {
    const status = $('cfg-status');
    status.textContent = 'the folder window is open on your desktop…';
    try {
      const r = await fetch(`${apiBase}/api/pick-folder?start=${encodeURIComponent(fields.dir.value.trim())}`);
      if (r.status === 404) { status.textContent = 'the server is an older one — restart it, then try again'; return; }
      const data = await r.json();
      if (data.path) { fields.dir.value = data.path; readFields(); loadFolder(cfg.dir); }
      else status.textContent = pool.length ? `${pool.length} pictures` : 'no folder yet — showing colour tiles';
    } catch { status.textContent = 'needs the dev server (4174) to browse'; }
  });
  $('cfg-load').addEventListener('click', () => { readFields(); if (cfg.dir) loadFolder(cfg.dir); else $('cfg-browse').click(); });
  fields.dir.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('cfg-load').click(); });
  $('cfg-reset').addEventListener('click', () => { Object.assign(cfg, DEFAULTS, { dir: cfg.dir }); save(); fill(); applyLayout(); buildCells(); });
  const toggle = () => { panel.hidden = !panel.hidden; };
  btn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT') toggle();
    if (e.key === 'Escape') panel.hidden = true;
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT') $('cfg-sweep-now').click();
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') { e.preventDefault(); setPaused(!paused); }
  });
  // click-away closes the panel
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) panel.hidden = true; });

  fill();
  applyLayout();
  buildCells();
  requestAnimationFrame(tick);
  if (cfg.dir) loadFolder(cfg.dir);
})();
