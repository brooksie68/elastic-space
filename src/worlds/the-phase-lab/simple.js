// The Phase Lab — the simple controls (simple.html, 2026-10-16, a branch of the studio console).
// One deck over the room: a bar for the whole machine, one lane per track. Each lane is edited
// where it sits (notes are blocks: higher = higher note) and every lane scrolls under one play
// line at its own speed, so the drift is something you see. Same engine, player, room and saved
// machine as index.html (world.js) — switching pages keeps the piece.
(function () {
  'use strict';
  const E = window.PhaseEngine;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const STORE = 'the-phase-lab-state', PRESETS = 'the-phase-lab-presets';
  const MAX = 4;
  const COLORS = ['#f2a83c', '#4fd1c5', '#f0708f', '#a9d85b'];
  const HINT = 'click in a lane to add a note · drag a note up or down to change it · click a note again to remove it · the white line is where notes play';
  const VIEW_STEPS = 24;          // steps visible across a lane
  const PLAY_AT = 0.16;           // the play line, as a share of the lane width
  const MAX_PCT = 5;              // the speed slider's end, in percent
  const GUT = 34;                 // the note-name gutter at the left of every lane

  const m = E.createMachine();
  const P = window.PhasePlayer.create({ machine: m, base: './assets/voices/' });
  const lanes = {};               // track id -> { el, cv, ctx, rows, hover, drag, color }
  let bigId = null;               // the lane made big for detailed editing (⤢), or null = lanes share the space

  window.ElasticSoundControl && window.ElasticSoundControl.attach({
    start: () => P.resume(), stop: () => P.suspend(), setVolume: v => P.setVolume(v * +$('#volume').value),
  });

  // ---- helpers ---------------------------------------------------------------------------
  const mod = (a, n) => ((a % n) + n) % n;
  function fillSelect(el, items, value) { el.innerHTML = items.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); if (value !== undefined) el.value = value; }
  function noteName(n) { return E.ROOTS[n % 12] + (Math.floor(n / 12) - 1); }
  function fmtTime(s) { if (!isFinite(s) || s > 3600 * 20) return 'never'; s = Math.round(s); const mm = Math.floor(s / 60), ss = s % 60; return mm ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss} s`; }
  function defaultVoice() { const v = P.voiceList()[0]; return v ? v.slug : 'tone'; }
  function realVoices() { return P.voiceList().filter(v => !v.synth).map(v => v.slug); }
  function veil() { const v = $('#veil'); v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash'); }
  function setSeg(el, value) { $$('button', el).forEach(b => b.classList.toggle('on', b.dataset.v === String(value))); }
  function laneColor(t) { return COLORS[m.tracks.indexOf(t) % COLORS.length]; }
  function shortName(n) { return E.ROOTS[n % 12] + (n % 12 === 0 ? (Math.floor(n / 12) - 1) : ''); }   // C4 D E F# … (octave on the Cs)
  function baseFor(t) { const ns = t.steps.map(s => s.n).filter(n => n != null); return ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) - 6 : 60; }

  // ---- help line ---------------------------------------------------------------------------
  const help = $('#help'); help.textContent = HINT;
  document.addEventListener('mouseover', e => { const h = e.target.closest && e.target.closest('[data-help]'); help.textContent = h ? h.dataset.help : HINT; });

  // ---- the bar -----------------------------------------------------------------------------
  fillSelect($('#root'), E.ROOTS.map((r, i) => [i, r]));
  fillSelect($('#scale'), [['chromatic', 'chromatic (all 12 notes)']].concat(Object.keys(E.SCALES).filter(k => k !== 'chromatic').map(k => [k, k])));
  function syncBar() {
    $('#bpm').value = m.bpm; $('#root').value = m.root; $('#scale').value = m.scale;
    $('#hold').classList.toggle('on', m.hold);
    const p = P.isPlaying(); $('#play').classList.toggle('on', p); $('#play').textContent = p ? '■ stop' : '▶ play';
  }
  $('#play').addEventListener('click', () => { if (P.isPlaying()) P.stop(); else P.start(); syncBar(); });
  $('#rewind').addEventListener('click', () => { E.rewind(m); });
  $('#hold').addEventListener('click', () => { m.hold = !m.hold; syncBar(); save(); });
  function setBpm(v) { m.bpm = Math.max(30, Math.min(260, Math.round(v) || 120)); $('#bpm').value = m.bpm; save(); }
  $('#bpm').addEventListener('change', () => setBpm(+$('#bpm').value));
  $('#bpmDown').addEventListener('click', () => setBpm(m.bpm - 1)); $('#bpmUp').addEventListener('click', () => setBpm(m.bpm + 1));
  $('#clearAll').addEventListener('click', () => { m.tracks.forEach(t => t.steps.forEach(s => { s.n = null; s.cents = 0; })); save(); });
  const onKey = () => { m.root = +$('#root').value; m.scale = $('#scale').value; m.chord = 'none (whole scale)'; E.requantize(m); save(); };
  $('#root').addEventListener('change', onKey); $('#scale').addEventListener('change', onKey);
  $('#volume').addEventListener('input', () => P.setVolume(+$('#volume').value));
  $('#mReverb').addEventListener('input', () => P.setMasterFx({ reverb: +$('#mReverb').value }));
  $('#diceMachine').addEventListener('click', () => {
    P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id));
    E.rollMachine(m, { voices: realVoices(), base: 60 }); m.tracks.forEach(t => { t.pull = 0; });
    veil(); renderAll(); save();
  });
  function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESETS) || localStorage.getItem('reich-machine-presets') || '{}'); } catch (e) { return {}; } }
  function fillPresets(value) { const all = loadPresets(); $('#presets').innerHTML = '<option value="">saved…</option>' + Object.keys(all).map(k => `<option>${k}</option>`).join(''); if (value) $('#presets').value = value; }
  $('#savePreset').addEventListener('click', () => { const name = prompt('name this piece'); if (!name) return; const all = loadPresets(); all[name] = E.snapshot(m); localStorage.setItem(PRESETS, JSON.stringify(all)); fillPresets(name); });
  $('#presets').addEventListener('change', () => { const s = loadPresets()[$('#presets').value]; if (!s) return; P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id)); E.restore(m, s); renderAll(); save(); });

  // ---- lanes ---------------------------------------------------------------------------------
  async function loadVoice(t) { if (P.voices[t.voice] && (P.voices[t.voice].synth || P.isLoaded(t.voice))) return; await P.loadVoice(t.voice); }
  function renderLanes() {
    const host = $('#lanes'); host.innerHTML = ''; Object.keys(lanes).forEach(k => delete lanes[k]);
    m.tracks.forEach(t => { const el = $('#laneTpl').content.firstElementChild.cloneNode(true); host.appendChild(el); wireLane(t, el); renderLane(t); });
    if (m.tracks.length < MAX) { const b = $('#addTpl').content.firstElementChild.cloneNode(true); host.appendChild(b); b.addEventListener('click', addLane); }
    layoutLanes();
  }
  // the lanes share the height (fewer lanes = taller lanes = bigger notes); a big lane (⤢) takes most of it
  function layoutLanes() {
    if (bigId != null && !m.tracks.find(t => t.id === bigId)) bigId = null;
    const rows = m.tracks.map(t => bigId == null ? 'minmax(0, 1fr)' : t.id === bigId ? 'minmax(0, 5fr)' : 'minmax(0, 1fr)');
    $('#lanes').style.gridTemplateRows = rows.join(' ') + (m.tracks.length < MAX ? ' 40px' : '');
    m.tracks.forEach(t => { const L = lanes[t.id]; if (L) $('.big', L.el).classList.toggle('on', t.id === bigId); });
  }
  function addLane() {
    if (m.tracks.length >= MAX) return;
    const last = m.tracks[m.tracks.length - 1];
    const t = E.addTrack(m, { voice: last ? last.voice : defaultVoice(), length: 8 });
    renderLanes(); loadVoice(t); save();
  }
  function rateToX(rate) { const pct = (rate - 1) * 100; return Math.sign(pct) * Math.sqrt(Math.min(1, Math.abs(pct) / MAX_PCT)); }
  function xToRate(x) { x = Math.max(-1, Math.min(1, x)); return 1 + Math.sign(x) * x * x * MAX_PCT / 100; }
  function renderLane(t) {
    const L = lanes[t.id]; if (!L) return; const el = L.el;
    L.color = laneColor(t); el.style.setProperty('--c', L.color);
    $('.lnum', el).textContent = m.tracks.indexOf(t) + 1;
    const v = P.voices[t.voice]; $('.vname', el).textContent = v ? v.name : t.voice;
    $('.mute', el).classList.toggle('on', t.mute); $('.solo', el).classList.toggle('on', !!t.solo);
    el.classList.toggle('muted', t.mute);
    $('.len', el).textContent = t.length;
    $('.stick input', el).checked = t.pull > 0;
    renderSpeed(t);
  }
  function renderSpeed(t) {
    const L = lanes[t.id]; if (!L) return; const el = L.el;
    const pct = (t.rate - 1) * 100, x = rateToX(t.rate);
    $('.thumb', el).style.left = (50 + x * 50) + '%';
    const f = $('.fill', el); f.style.left = (50 + Math.min(0, x) * 50) + '%'; f.style.width = (Math.abs(x) * 50) + '%';
    $('.speedVal', el).textContent = Math.abs(pct) < 0.005 ? 'together' : `${Math.abs(pct).toFixed(2)} % ${pct > 0 ? 'faster' : 'slower'}`;
    $('.together', el).classList.toggle('on', Math.abs(pct) < 0.005);
    const cyc = E.cycleSeconds(m, t);
    $('.cycle', el).textContent = cyc === Infinity ? 'never drifts' : `lines up again every ${fmtTime(cyc)}`;
  }
  function setRate(t, r) { t.rate = Math.max(1 - MAX_PCT / 100, Math.min(1 + MAX_PCT / 100, Math.round(r * 100000) / 100000)); renderSpeed(t); save(); }
  function wireLane(t, el) {
    const L = lanes[t.id] = { el, cv: $('.roll', el), rows: [], hover: null, drag: null, color: laneColor(t) };
    L.ctx = L.cv.getContext('2d');
    const step = d => { const list = P.voiceList(); const i = list.findIndex(v => v.slug === t.voice); setVoice(t, list[mod(i + d, list.length)].slug); };
    $('.vPrev', el).addEventListener('click', () => step(-1)); $('.vNext', el).addEventListener('click', () => step(1));
    $('.vname', el).addEventListener('click', e => { e.stopPropagation(); openSounds(t, $('.vname', el)); });
    $('.clear', el).addEventListener('click', () => { t.steps.forEach(s => { s.n = null; s.cents = 0; }); save(); });
    $('.big', el).addEventListener('click', () => { bigId = bigId === t.id ? null : t.id; layoutLanes(); });
    $('.dice', el).addEventListener('click', () => { E.fillFigure(m, t, { steps: E.rollPhrase(0) }, baseFor(t)); veil(); renderLane(t); save(); });
    $('.mute', el).addEventListener('click', () => { t.mute = !t.mute; renderLane(t); P.refreshFx(); save(); });
    $('.solo', el).addEventListener('click', () => { t.solo = !t.solo; renderLane(t); P.refreshFx(); save(); });
    $('.lenDown', el).addEventListener('click', () => { E.setLength(t, t.length - 1); renderLane(t); save(); });
    $('.lenUp', el).addEventListener('click', () => { E.setLength(t, t.length + 1); renderLane(t); save(); });
    $('.more', el).addEventListener('click', e => { e.stopPropagation(); openMore(t); });
    $('.del', el).addEventListener('click', () => { closeMore(); E.removeTrack(m, t.id); P.dropChain(t.id); P.refreshFx(); renderLanes(); save(); });
    // the speed slider: drag, double-click = together, ‹ › = a hair
    const track = $('.track', el); let sd = false;
    const fromX = e => { const r = track.getBoundingClientRect(); setRate(t, xToRate(((e.clientX - r.left) / r.width) * 2 - 1)); };
    track.addEventListener('pointerdown', e => { sd = true; try { track.setPointerCapture(e.pointerId); } catch (x) {} fromX(e); });
    track.addEventListener('pointermove', e => { if (sd) fromX(e); });
    track.addEventListener('pointerup', () => { sd = false; }); track.addEventListener('pointercancel', () => { sd = false; });
    track.addEventListener('dblclick', () => setRate(t, 1));
    track.addEventListener('wheel', e => { e.preventDefault(); setRate(t, t.rate + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 0.001 : 0.0001)); }, { passive: false });
    $('.together', el).addEventListener('click', () => setRate(t, 1));
    $('.fineDown', el).addEventListener('click', () => setRate(t, t.rate - 0.0001));
    $('.fineUp', el).addEventListener('click', () => setRate(t, t.rate + 0.0001));
    $('.stick input', el).addEventListener('change', e => { t.pull = e.target.checked ? 1 : 0; save(); });
    $('.nudgeL', el).addEventListener('click', () => E.nudge(t, -1));
    $('.nudgeR', el).addEventListener('click', () => E.nudge(t, 1));
    wireRoll(t, L);
  }

  // ---- sounds: hear one easily -----------------------------------------------------------------
  // a sound plays as a little three-note figure in the key, around the lane's own notes
  async function hear(t, slug, vel) {
    await P.loadVoice(slug);
    const base = baseFor(t) + 3; const sc = m.scale === 'chromatic' ? 'major' : m.scale;
    [0, 2, 4].map(d => E.degreeToMidi(d, m.root, sc, 'none (whole scale)', base)).forEach((n, i) => setTimeout(() => P.preview(slug, n, 0.28, t.fx, vel || 0.8), i * 150));
  }
  function setVoice(t, slug) { t.voice = slug; renderLane(t); hear(t, slug); markSounds(); save(); }
  let soundsFor = null, soundHover = null;
  function markSounds() { if (soundsFor) $$('#soundList button').forEach(b => b.classList.toggle('cur', b.dataset.v === soundsFor.voice)); }
  function openSounds(t, anchor) {
    soundsFor = t; const box = $('#sounds'); box.style.setProperty('--c', laneColor(t));
    $('#soundsTitle').textContent = `lane ${m.tracks.indexOf(t) + 1} · sounds — hover to hear, click to use`;
    const list = $('#soundList'); list.innerHTML = '';
    P.voiceList().forEach(v => {
      const b = document.createElement('button'); b.dataset.v = v.slug; b.textContent = v.name; list.appendChild(b);
      b.addEventListener('mouseenter', () => { clearTimeout(soundHover); soundHover = setTimeout(() => hear(t, v.slug, 0.7), 180); });
      b.addEventListener('mouseleave', () => clearTimeout(soundHover));
      b.addEventListener('click', () => { clearTimeout(soundHover); setVoice(t, v.slug); });
    });
    markSounds(); box.classList.add('open');
    const r = anchor.getBoundingClientRect(); const bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.left)) + 'px'; box.style.top = Math.max(8, r.top - bh - 8) + 'px';
  }
  function closeSounds() { clearTimeout(soundHover); $('#sounds').classList.remove('open'); soundsFor = null; }
  $('#soundsClose').addEventListener('click', closeSounds);
  document.addEventListener('pointerdown', e => { if (soundsFor && !e.target.closest('#sounds') && !e.target.closest('.vname')) closeSounds(); });

  // ---- the roll: geometry ------------------------------------------------------------------
  function rowsFor(t) {
    const ns = t.steps.map(s => s.n).filter(n => n != null);
    let lo, hi;
    if (ns.length) { lo = Math.min(...ns) - 2; hi = Math.max(...ns) + 2; } else { lo = 60; hi = 72; }
    while (hi - lo < 12) { lo--; hi++; }
    const rows = t.micro ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : E.scaleNotes(m.root, m.scale, m.chord, lo, hi);
    return rows.reverse();      // top row = highest note
  }
  function geo(t, L) {
    const W = L.cv.clientWidth, H = L.cv.clientHeight; const rows = L.rows.length ? L.rows : rowsFor(t);
    return { W, H, rows, rowH: H / rows.length, px: W / VIEW_STEPS, playX: W * PLAY_AT, r: m.hold ? 1 : t.rate };
  }
  function hitAt(t, L, x, y) {
    const g = geo(t, L);
    const k = Math.floor(t.phase + (x - g.playX) * g.r / g.px);
    const idx = mod(k + t.nudged, t.length);
    const ri = Math.max(0, Math.min(g.rows.length - 1, Math.floor(y / g.rowH)));
    return { k, idx, n: g.rows[ri], ri };
  }
  function snap(t, n) { return t.micro ? n : E.quantize(n, m.root, m.scale, m.chord); }

  // ---- the roll: gestures ------------------------------------------------------------------
  function wireRoll(t, L) {
    const cv = L.cv; const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      if (pos(e)[0] < GUT) return;              // the note-name gutter is labels only
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      L.rows = rowsFor(t);                       // freeze the rows for the whole gesture
      const [x, y] = pos(e); const h = hitAt(t, L, x, y); const st = t.steps[h.idx];
      if (e.button === 2) { st.n = null; L.drag = { mode: 'erase' }; }
      else if (st.n === h.n) { L.drag = { mode: 'move', idx: h.idx, n0: st.n, moved: false }; }
      else { st.n = snap(t, h.n); P.preview(t.voice, st.n, 0.3, t.fx); L.drag = { mode: 'paint', idx: h.idx }; }
      save();
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = pos(e); L.hover = x < GUT ? null : { x, y };
      const d = L.drag; if (!d) return;
      const h = hitAt(t, L, x, y);
      if (d.mode === 'move') { const st = t.steps[d.idx]; const nn = snap(t, h.n); if (st.n !== nn) { st.n = nn; d.moved = true; P.preview(t.voice, nn, 0.22, t.fx, 0.7); save(); } }
      else if (d.mode === 'paint' && h.idx !== d.idx) { const st = t.steps[h.idx]; const nn = snap(t, h.n); if (st.n !== nn) { st.n = nn; P.preview(t.voice, nn, 0.2, t.fx, 0.6); save(); } d.idx = h.idx; }
      else if (d.mode === 'erase') { t.steps[h.idx].n = null; save(); }
    });
    const end = () => { const d = L.drag; L.drag = null; if (d && d.mode === 'move' && !d.moved) { t.steps[d.idx].n = null; save(); } L.rows = []; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { L.hover = null; });
  }

  // ---- the roll: drawing ---------------------------------------------------------------------
  function drawLane(t, L, playing) {
    const cv = L.cv, ctx = L.ctx, dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const g = geo(t, L); const { rows, rowH, px, playX, r } = g;
    ctx.fillStyle = '#0d0f13'; ctx.fillRect(0, 0, W, H);
    // rows: the key's root rows a little lighter
    rows.forEach((n, i) => { if (n % 12 === m.root) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(0, i * rowH, W, rowH); } else if (i % 2) { ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.fillRect(0, i * rowH, W, rowH); } });
    // the beat: dotted lines every beat, solid every bar — the same in every lane, so a drifting lane slides off them
    const sub = m.subdivision; const j0 = Math.floor(m.masterPhase - playX / px) - 1;
    for (let j = j0; j <= j0 + VIEW_STEPS + 2; j++) {
      if (mod(j, sub) !== 0) continue; const x = Math.round(playX + (j - m.masterPhase) * px) + 0.5;
      ctx.strokeStyle = mod(j, sub * 4) === 0 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    // the notes
    const stepW = px / r; const k0 = Math.floor(t.phase - playX * r / px) - 1, k1 = Math.ceil(t.phase + (W - playX) * r / px) + 1;
    const col = t.mute ? '#7a808c' : L.color;
    for (let k = k0; k <= k1; k++) {
      const idx = mod(k + t.nudged, t.length); const x = playX + (k - t.phase) * stepW;
      if (idx === 0) { ctx.fillStyle = col; ctx.globalAlpha = 0.5; ctx.fillRect(Math.round(x), 0, 2, H); ctx.globalAlpha = 1; }   // where the phrase starts again
      const s = t.steps[idx]; if (!s || s.n == null) continue;
      let ri = rows.indexOf(s.n); const edge = ri < 0; if (edge) ri = s.n > rows[0] ? 0 : rows.length - 1;
      const bw = Math.max(6, stepW * Math.max(0.2, t.gate) - 2), bh = Math.max(4, rowH - 2), y = ri * rowH + (rowH - bh) / 2;
      const since = (playX - x) / stepW;                // steps since this note played (0..1 = just now)
      const lit = playing && since >= 0 && since < 1;
      ctx.globalAlpha = x + bw < playX ? 0.4 : edge ? 0.6 : 0.95;
      if (lit) { ctx.globalAlpha = 1; ctx.shadowColor = col; ctx.shadowBlur = 18 * (1 - since); }
      ctx.fillStyle = lit ? '#fff' : col;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 1, y, bw, bh, Math.min(4, bh / 2)) : ctx.rect(x + 1, y, bw, bh); ctx.fill();
      if (lit) { ctx.fillStyle = col; ctx.globalAlpha = since; ctx.fill(); }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (bh >= 12 && bw >= 18 && x + bw > GUT) { ctx.font = `600 ${Math.min(13, bh - 2)}px "Segoe UI", system-ui, sans-serif`; ctx.fillStyle = '#111'; ctx.globalAlpha = x + bw < playX ? 0.6 : 0.9; ctx.textBaseline = 'middle'; ctx.fillText(shortName(s.n), x + 4, y + bh / 2 + 0.5); ctx.globalAlpha = 1; }
    }
    // the hover: a ghost of the note a click would write, with its name
    if (L.hover && !L.drag) {
      const h = hitAt(t, L, L.hover.x, L.hover.y); const x = playX + (h.k - t.phase) * stepW; const y = h.ri * rowH;
      ctx.strokeStyle = L.color; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1.5, y + 1, Math.max(6, stepW - 3), Math.max(4, rowH - 2)); ctx.lineWidth = 1;
      ctx.font = '600 13px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
      const label = noteName(snap(t, h.n)); const ly = Math.min(H - 8, Math.max(8, y + rowH / 2));
      ctx.fillText(label, x + stepW + 4, ly);
    }
    // the note names down the left edge: every row when there is room, else every other one (the key's root always)
    ctx.fillStyle = '#14171d'; ctx.fillRect(0, 0, GUT, H); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(GUT - 1, 0, 1, H);
    const fs = Math.max(9, Math.min(13, rowH - 1)); ctx.font = `${fs}px "Segoe UI", system-ui, sans-serif`; ctx.textBaseline = 'middle';
    const every = rowH >= 10 ? 1 : 2;
    rows.forEach((n, i) => { const root = n % 12 === m.root; if (!root && i % every) return; ctx.fillStyle = root ? '#fff' : 'rgba(255,255,255,.6)'; ctx.fillText(shortName(n), 5, i * rowH + rowH / 2); });
    // how far this lane sits from the beat, top right
    if (L.where) { ctx.font = '600 13px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(13,15,19,.75)'; const tw = ctx.measureText(L.where).width; ctx.fillRect(W - tw - 12, 2, tw + 10, 18); ctx.fillStyle = col; ctx.fillText(L.where, W - 7, 4); ctx.textAlign = 'left'; }
    // the play line
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, playX, H);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(Math.round(playX) - 1, 0, 2, H);
  }

  // ---- more… (one lane's extras) -----------------------------------------------------------------
  const FX = [
    ['reverb', 'echo (reverb)', 0, 1, 0.01], ['delayMix', 'repeat (delay)', 0, 1, 0.01], ['delayTime', 'repeat time (s)', 0.03, 1.5, 0.005], ['delayFeedback', 'how many repeats', 0, 0.9, 0.01],
    ['harmonizerMix', 'harmony', 0, 1, 0.01], ['harmonizer', 'harmony interval', -24, 24, 1], ['compressor', 'squash', 0, 1, 0.01], ['distortion', 'grit', 0, 1, 0.01],
    ['ringMod', 'ring mod', 0, 1, 0.01], ['ringHz', 'ring mod hz', 20, 2000, 1], ['envFilter', 'envelope filter', 0, 1, 0.01], ['autoWah', 'auto-wah', 0, 1, 0.01], ['univibe', 'univibe', 0, 1, 0.01],
  ];
  let moreFor = null, audition = null;
  function stopAudition() { if (!audition) return; audition.timers.forEach(clearTimeout); audition.btn.classList.remove('on'); audition = null; }
  function openMore(t) {
    moreFor = t; const box = $('#more'); box.style.setProperty('--c', laneColor(t));
    $('#moreTitle').textContent = `lane ${m.tracks.indexOf(t) + 1} · more`;
    const host = $('#mPhrases'); host.innerHTML = '';
    E.FIGURES.forEach(f => {
      const chip = document.createElement('span'); chip.className = 'chip';
      chip.innerHTML = `<button title="hear it">▶</button><button>${f.name}</button>`;
      const [hear, use] = $$('button', chip);
      hear.addEventListener('click', () => {
        if (audition && audition.name === f.name) { stopAudition(); return; } stopAudition();
        const stepMs = 1000 / E.stepsPerSecond(m); const timers = []; const base = baseFor(t);
        f.steps.forEach((d, i) => { if (d !== null) timers.push(setTimeout(() => P.preview(t.voice, E.degreeToMidi(d, m.root, m.scale, m.chord, base), Math.max(0.08, stepMs / 1000 * t.gate), t.fx, 0.8), i * stepMs)); });
        timers.push(setTimeout(stopAudition, f.steps.length * stepMs)); audition = { name: f.name, timers, btn: hear }; hear.classList.add('on');
      });
      use.addEventListener('click', () => { E.fillFigure(m, t, f.name, baseFor(t)); renderLane(t); save(); });
      host.appendChild(chip);
    });
    $('#mGate').value = t.gate; $('#mGain').value = t.gain; setSeg($('#mArt'), t.articulation);
    $('#mFx').innerHTML = FX.map(([k, label, lo, hi, step]) => `<label>${label}<input data-k="${k}" type="range" min="${lo}" max="${hi}" step="${step}" value="${t.fx[k]}"></label>`).join('');
    $$('#mFx input').forEach(inp => inp.addEventListener('input', () => { t.fx[inp.dataset.k] = +inp.value; P.refreshFx(); save(); }));
    box.classList.add('open');
  }
  function closeMore() { stopAudition(); $('#more').classList.remove('open'); moreFor = null; }
  $('#moreClose').addEventListener('click', closeMore);
  document.addEventListener('pointerdown', e => { if (moreFor && !e.target.closest('#more') && !e.target.closest('.more')) closeMore(); });
  $('#mGate').addEventListener('input', () => { if (moreFor) { moreFor.gate = +$('#mGate').value; save(); } });
  $('#mGain').addEventListener('input', () => { if (moreFor) { moreFor.gain = +$('#mGain').value; P.refreshFx(); save(); } });
  $('#mArt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !moreFor) return; moreFor.articulation = b.dataset.v; setSeg($('#mArt'), b.dataset.v); save(); });

  // ---- keys ------------------------------------------------------------------------------------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); $('#play').click(); }
    else if (e.key === 'h' || e.key === 'H') $('#hold').click();
    else if (e.key === 'Escape') { closeMore(); closeSounds(); }
  });

  // ---- the frame -------------------------------------------------------------------------------
  const levels = {}; let master = 0, lastT = performance.now();
  const ballistics = (cur, target, dt, up, down) => cur + (target - cur) * Math.min(1, dt * (target > cur ? up : down));
  function frame() {
    const wall = performance.now(); const dt = Math.min(0.1, (wall - lastT) / 1000); lastT = wall;
    const playing = P.isPlaying(); const lv = P.levels();
    for (const t of m.tracks) {
      const L = lanes[t.id]; if (!L) continue;
      drawLane(t, L, playing);
      // how far this lane has drifted from the beat, in steps of its own phrase
      const ahead = mod(E.driftSteps(m, t), t.length); const back = t.length - ahead;
      const txt = Math.min(ahead, back) < 0.05 ? 'lined up' : ahead <= back ? `${ahead.toFixed(1)} steps ahead` : `${back.toFixed(1)} steps behind`;
      L.where = txt;
      levels[t.id] = ballistics(levels[t.id] || 0, lv.tracks[t.id] || 0, dt, 30, 6);
    }
    master = ballistics(master, lv.master, dt, 28, 5);
    if (window.PhaseStudio) window.PhaseStudio.update({ playing, master, tracks: m.tracks.map(t => ({ rate: t.rate, level: levels[t.id] || 0, on: !t.mute })) });
    requestAnimationFrame(frame);
  }

  // ---- persistence + boot -------------------------------------------------------------------------
  let saveTimer = null;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(E.snapshot(m))); } catch (e) {} }, 200); }
  function renderAll() { closeMore(); closeSounds(); syncBar(); renderLanes(); m.tracks.forEach(loadVoice); }
  function demo() {
    E.restore(m, { bpm: 120, subdivision: 2, root: 0, scale: 'major', chord: 'none (whole scale)', tracks: [] });
    const v = defaultVoice();
    const a = E.addTrack(m, { voice: v }); E.fillFigure(m, a, 'twelve (phase figure)', 60);
    const b = E.addTrack(m, { voice: v, rate: 1.01 }); E.fillFigure(m, b, 'twelve (phase figure)', 60);
    renderAll(); save();
  }
  async function boot() {
    const v = document.createElement('div'); v.id = 'veil'; document.body.appendChild(v);
    await P.loadList();
    let snap = null; try { snap = JSON.parse(localStorage.getItem(STORE) || localStorage.getItem('reich-machine-state')); } catch (e) {}
    if (snap && snap.tracks && snap.tracks.length) { E.restore(m, snap); m.tracks.length = Math.min(m.tracks.length, MAX); renderAll(); } else demo();
    fillPresets(); requestAnimationFrame(frame);
  }
  window.__phase = { m, P, E, lanes };
  boot();
})();
