// The Reich Machine — the console face. Wires the engine + player to the 1970s control surface:
// the meter bridge (transport · the key · master), four channel strips, one big editor for the
// selected track, the piano on the lip, the effects drawer. The studio behind it (studio.js) gets
// a state object every frame. The plain face this replaced is kept whole as plain.html.
(function () {
  'use strict';
  const E = window.ReichEngine;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const STORE = 'reich-machine-state', PRESETS = 'reich-machine-presets';
  const MAX_TRACKS = 4;
  const DEFAULT_HINT = 'click a step, then play the piano · drag a note to move it, drag across empty steps to draw · right-click clears';

  const m = E.createMachine();
  const P = window.ReichPlayer.create({ machine: m, base: './assets/voices/' });
  let sel = null;                   // selected track id (the editor shows it)
  let armed = null;                 // { track, step } — the piano writes here
  let recording = false;
  let kbBase = 60;

  // ---- sound control (the shared speaker button) ---------------------------------------
  window.ElasticSoundControl && window.ElasticSoundControl.attach({
    start: () => P.resume(), stop: () => P.suspend(), setVolume: v => P.setVolume(v * +$('#volume').value),
  });

  // ---- helpers --------------------------------------------------------------------------
  function fillSelect(sel, items, value) { sel.innerHTML = items.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); if (value !== undefined) sel.value = value; }
  function noteName(n) { return E.ROOTS[n % 12] + (Math.floor(n / 12) - 1); }
  function fmtTime(s) { if (s > 3600 * 20) return 'never'; const mm = Math.floor(s / 60), ss = Math.round(s % 60); return mm ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss} s`; }
  function selTrack() { return m.tracks.find(t => t.id === sel) || null; }
  function defaultVoice() { const v = P.voiceList()[0]; return v ? v.slug : 'tone'; }
  function voiceOptions() { return P.voiceList().map(v => [v.slug, v.name]); }
  function realVoices() { return P.voiceList().filter(v => !v.synth).map(v => v.slug); }
  function veil() { const v = $('#veil'); v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash'); }
  function setBtnRow(rowEl, value) { $$('button', rowEl).forEach(b => b.classList.toggle('on', b.dataset.v === String(value))); }
  function nearestStep(t) { const L = t.length; return ((Math.round(t.phase + t.nudged) % L) + L) % L; }

  // ---- the scribble strip (silkscreen help) -------------------------------------------
  const scribble = $('#scribbleText');
  document.addEventListener('mouseover', e => { const h = e.target.closest && e.target.closest('[data-help]'); scribble.textContent = h ? h.dataset.help : DEFAULT_HINT; });
  document.addEventListener('mouseleave', () => { scribble.textContent = DEFAULT_HINT; });

  // ---- the meter bridge -----------------------------------------------------------------
  fillSelect($('#root'), E.ROOTS.map((r, i) => [i, r]));
  fillSelect($('#scale'), Object.keys(E.SCALES).map(k => [k, k]));
  fillSelect($('#chord'), Object.keys(E.CHORDS).map(k => [k, k]));
  function keyText() { return E.ROOTS[m.root] + ' ' + m.scale + (m.chord && m.chord !== 'none (whole scale)' ? ' · ' + m.chord : ''); }
  function syncBridge() {
    $('#bpm').value = m.bpm; setBtnRow($('#subdiv'), m.subdivision);
    $('#root').value = m.root; $('#scale').value = m.scale; $('#chord').value = m.chord; $('#keyText').textContent = keyText();
    $('#hold').classList.toggle('on', m.hold);
    $('#play').classList.toggle('on', P.isPlaying()); $('#play').textContent = P.isPlaying() ? '■' : '▶';
    $('#record').classList.toggle('on', recording);
  }
  $('#play').addEventListener('click', () => { if (P.isPlaying()) P.stop(); else P.start(); syncBridge(); });
  $('#rewind').addEventListener('click', () => { E.rewind(m); });
  $('#record').addEventListener('click', () => { recording = !recording; if (recording && !armed && selTrack()) armed = { track: sel, step: 0 }; syncBridge(); renderEditor(); });
  function setBpm(v) { m.bpm = Math.max(30, Math.min(260, Math.round(v) || 120)); $('#bpm').value = m.bpm; renderAllDrift(); save(); }
  $('#bpm').addEventListener('change', () => setBpm(+$('#bpm').value));
  $('#bpmDown').addEventListener('click', () => setBpm(m.bpm - 1)); $('#bpmUp').addEventListener('click', () => setBpm(m.bpm + 1));
  $('#subdiv').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; m.subdivision = +b.dataset.v; setBtnRow($('#subdiv'), m.subdivision); renderAllDrift(); renderEditor(); save(); });
  $('#hold').addEventListener('click', () => { m.hold = !m.hold; syncBridge(); save(); });
  const onPitch = () => { m.root = +$('#root').value; m.scale = $('#scale').value; m.chord = $('#chord').value; E.requantize(m); syncBridge(); renderKeyboard(); renderEditor(); save(); };
  ['#root', '#scale', '#chord'].forEach(s => $(s).addEventListener('change', onPitch));
  $('#volume').addEventListener('input', () => P.setVolume(+$('#volume').value));
  $('#mReverb').addEventListener('input', () => P.setMasterFx({ reverb: +$('#mReverb').value }));
  $('#mComp').addEventListener('input', () => P.setMasterFx({ compressor: +$('#mComp').value }));
  $('#savePreset').addEventListener('click', () => { const name = prompt('preset name'); if (!name) return; const all = loadPresets(); all[name] = E.snapshot(m); localStorage.setItem(PRESETS, JSON.stringify(all)); fillPresets(name); });
  $('#presets').addEventListener('change', () => { const all = loadPresets(); const s = all[$('#presets').value]; if (s) { P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id)); E.restore(m, s); renderAll(); save(); } });
  function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESETS) || '{}'); } catch (e) { return {}; } }
  function fillPresets(value) { const all = loadPresets(); $('#presets').innerHTML = '<option value="">presets…</option>' + Object.keys(all).map(k => `<option>${k}</option>`).join(''); if (value) $('#presets').value = value; }

  // the dice
  $('#dicePhrase').addEventListener('click', () => { const t = selTrack(); if (!t) return; E.fillFigure(m, t, { steps: E.rollPhrase(0) }, kbBase); veil(); renderStrip(t); renderEditor(); save(); });
  $('#diceMachine').addEventListener('click', () => {
    P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id));
    E.rollMachine(m, { voices: realVoices(), base: kbBase }); m.tracks.forEach(t => { t.pull = 0; });
    veil(); renderAll(); save();
  });

  // ---- the VU meters ------------------------------------------------------------------------
  function buildVu(svg) {
    let s = '<path class="arc" d="M14 50 A40 40 0 0 1 86 50"/><path class="red" d="M70 26 A40 40 0 0 1 86 50"/>';
    for (let i = 0; i <= 10; i++) { const a = (-45 + i * 9) * Math.PI / 180; const x1 = 50 + Math.sin(a) * 40, y1 = 62 - Math.cos(a) * 40, x2 = 50 + Math.sin(a) * (i % 5 ? 36 : 33), y2 = 62 - Math.cos(a) * (i % 5 ? 36 : 33); s += `<line class="t" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`; }
    s += '<line class="needle" x1="50" y1="62" x2="50" y2="14"/><circle class="pivot" cx="50" cy="62" r="3"/>';
    svg.innerHTML = s; return $('.needle', svg);
  }
  const vuA = buildVu($('#vuA')), vuB = buildVu($('#vuB'));
  const vuState = { a: 0, b: 0 };
  function vuAngle(level) { return -45 + 90 * Math.min(1, Math.sqrt(Math.min(1, level * 3.2))); }
  function ballistics(cur, target, dt, up, down) { return cur + (target - cur) * Math.min(1, dt * (target > cur ? up : down)); }

  // ---- the strips --------------------------------------------------------------------------
  const cards = {};
  async function loadVoice(t) {
    const card = cards[t.id]; const st = card && $('.vstate', card);
    if (P.voices[t.voice] && (P.voices[t.voice].synth || P.isLoaded(t.voice))) { if (st) st.textContent = ''; return; }
    if (st) st.textContent = '…';
    await P.loadVoice(t.voice); if (st) st.textContent = P.isLoaded(t.voice) ? '' : 'missing';
  }
  function renderStrips() {
    const host = $('#strips'); host.innerHTML = ''; Object.keys(cards).forEach(k => delete cards[k]);
    m.tracks.forEach(t => { const card = $('#stripTpl').content.firstElementChild.cloneNode(true); cards[t.id] = card; host.appendChild(card); wireStrip(t, card); renderStrip(t); });
    for (let i = m.tracks.length; i < MAX_TRACKS; i++) { const e = $('#emptyTpl').content.firstElementChild.cloneNode(true); host.appendChild(e); $('.addTrack', e).addEventListener('click', addTrack); }
  }
  function addTrack() {
    if (m.tracks.length >= MAX_TRACKS) return;
    const t = E.addTrack(m, { voice: defaultVoice(), length: 8 }); sel = t.id; armed = null; renderStrips(); renderEditor(); loadVoice(t); save();
  }
  function renderStrip(t) {
    const card = cards[t.id]; if (!card) return;
    card.classList.toggle('sel', t.id === sel);
    $('.num', card).textContent = m.tracks.indexOf(t) + 1;
    fillSelect($('.voice', card), voiceOptions(), t.voice);
    const v = P.voices[t.voice]; $('.vname', card).textContent = v ? v.name : t.voice;
    $('.gate', card).value = t.gate; $('.fader', card).value = t.gain;
    $('.mute', card).classList.toggle('on', t.mute); $('.solo', card).classList.toggle('on', !!t.solo);
    setBtnRow($('.switch.pull', card), t.pull);
    renderDrift(t);
  }
  function renderDrift(t) {
    const card = cards[t.id]; if (!card) return; const pct = (t.rate - 1) * 100;
    $('.knob.rate', card).style.setProperty('--a', (pct / 5 * 135).toFixed(1) + 'deg');
    $('.rateVal', card).textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + ' %';
    const cyc = E.cycleSeconds(m, t);
    $('.cycle', card).textContent = cyc === Infinity ? 'locked to the master' : 'comes around every ' + fmtTime(cyc);
  }
  function renderAllDrift() { m.tracks.forEach(renderDrift); }
  function setRate(t, rate) { t.rate = Math.max(0.95, Math.min(1.05, rate)); renderDrift(t); save(); }
  function wireStrip(t, card) {
    card.addEventListener('pointerdown', () => { if (sel !== t.id) { sel = t.id; armed = null; m.tracks.forEach(renderStrip); renderEditor(); } }, true);
    $('.voice', card).addEventListener('change', async () => { t.voice = $('.voice', card).value; renderStrip(t); await loadVoice(t); P.preview(t.voice, 60, 0.5, t.fx, 0.8); renderEditor(); save(); });
    let hoverT = null;
    $('.plate', card).addEventListener('mouseenter', () => { hoverT = setTimeout(() => { if (P.isLoaded(t.voice) || (P.voices[t.voice] && P.voices[t.voice].synth)) P.preview(t.voice, 60, 0.5, t.fx, 0.7); }, 260); });
    $('.plate', card).addEventListener('mouseleave', () => clearTimeout(hoverT));
    // the offset knob: drag up/down, wheel for hundredths, double-click to zero
    const knob = $('.knob.rate', card); let drag = null;
    knob.addEventListener('pointerdown', e => { drag = { y: e.clientY, rate: t.rate }; try { knob.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    knob.addEventListener('pointermove', e => { if (!drag) return; const dy = drag.y - e.clientY; setRate(t, drag.rate + dy * (e.shiftKey ? 0.00002 : 0.0002)); });
    knob.addEventListener('pointerup', () => { drag = null; }); knob.addEventListener('pointercancel', () => { drag = null; });
    knob.addEventListener('wheel', e => { e.preventDefault(); const step = (e.shiftKey ? 0.001 : 0.0001) * (e.deltaY < 0 ? 1 : -1); setRate(t, Math.round((t.rate + step) * 10000) / 10000); }, { passive: false });
    knob.addEventListener('dblclick', () => setRate(t, 1));
    $('.switch.pull', card).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; t.pull = +b.dataset.v; setBtnRow($('.switch.pull', card), t.pull); save(); });
    $('.nudgeL', card).addEventListener('click', () => { E.nudge(t, -1); });
    $('.nudgeR', card).addEventListener('click', () => { E.nudge(t, 1); });
    $('.gate', card).addEventListener('input', () => { t.gate = +$('.gate', card).value; save(); });
    $('.fader', card).addEventListener('input', () => { t.gain = +$('.fader', card).value; P.refreshFx(); save(); });
    $('.mute', card).addEventListener('click', () => { t.mute = !t.mute; $('.mute', card).classList.toggle('on', t.mute); P.refreshFx(); save(); });
    $('.solo', card).addEventListener('click', () => { t.solo = !t.solo; $('.solo', card).classList.toggle('on', t.solo); P.refreshFx(); save(); });
    $('.del', card).addEventListener('click', e => { e.stopPropagation(); E.removeTrack(m, t.id); P.dropChain(t.id); P.refreshFx(); if (sel === t.id) { sel = m.tracks[0] ? m.tracks[0].id : null; armed = null; } renderStrips(); renderEditor(); save(); });
  }

  // ---- the editor ----------------------------------------------------------------------------
  let audition = null;   // { name, timers } — a phrase playing itself
  function buildPhrases() {
    const host = $('#phrases'); host.innerHTML = '';
    E.FIGURES.forEach(f => {
      const chip = document.createElement('span'); chip.className = 'chip';
      chip.innerHTML = `<button class="play" title="hear it">▶</button><button class="name">${f.name}</button>`;
      $('.play', chip).addEventListener('click', () => auditionPhrase(f, $('.play', chip)));
      $('.name', chip).addEventListener('click', () => { const t = selTrack(); if (!t) return; E.fillFigure(m, t, f.name, kbBase); armed = null; renderStrip(t); renderEditor(); save(); });
      host.appendChild(chip);
    });
    const roll = document.createElement('span'); roll.className = 'chip roll'; roll.innerHTML = '<button class="name" data-help="roll a fresh musical phrase into this track">🎲 roll one</button>';
    $('button', roll).addEventListener('click', () => $('#dicePhrase').click()); host.appendChild(roll);
  }
  function stopAudition() { if (!audition) return; audition.timers.forEach(clearTimeout); audition.btn.classList.remove('on'); audition = null; }
  function auditionPhrase(f, btn) {
    const t = selTrack(); if (!t) return;
    if (audition && audition.name === f.name) { stopAudition(); return; }
    stopAudition();
    const stepMs = 1000 / E.stepsPerSecond(m); const timers = [];
    f.steps.forEach((d, i) => { if (d === null) return; timers.push(setTimeout(() => P.preview(t.voice, E.degreeToMidi(d, m.root, m.scale, m.chord, kbBase), Math.max(0.08, stepMs / 1000 * t.gate), t.fx, 0.8), i * stepMs)); });
    timers.push(setTimeout(stopAudition, f.steps.length * stepMs));
    audition = { name: f.name, timers, btn }; btn.classList.add('on');
  }
  function gridRows(t) { return t.micro ? Array.from({ length: 25 }, (_, i) => kbBase + 24 - i) : E.scaleNotes(m.root, m.scale, m.chord, kbBase, kbBase + 24).reverse(); }
  function renderEditor() {
    const t = selTrack();
    $('#etitle').textContent = t ? `track ${m.tracks.indexOf(t) + 1} · ${(P.voices[t.voice] || {}).name || t.voice}${recording ? ' · recording' : ''}` : 'no track — add one on the left';
    $('#screen').style.opacity = t ? 1 : 0.6;
    setBtnRow($('#lengths'), t ? t.length : ''); $('#lengthN').value = t ? t.length : '';
    setBtnRow($('#art'), t ? t.articulation : ''); setBtnRow($('#kbBase'), kbBase);
    $('#micro').classList.toggle('on', !!(t && t.micro));
    renderGrid();
    if ($('#more').classList.contains('open')) renderFx();
  }
  function renderGrid() {
    const t = selTrack(); const g = $('#grid'), cr = $('#cursorRow'), cents = $('#cents');
    if (!t) { g.innerHTML = ''; cr.innerHTML = ''; cents.classList.remove('show'); return; }
    const rows = gridRows(t); const cols = `3.2em repeat(${t.length}, minmax(12px, 1fr))`;
    g.style.gridTemplateColumns = cols; cr.style.gridTemplateColumns = cols;
    let ch = '<div></div>';
    for (let s = 0; s < t.length; s++) ch += `<div class="stepno${s % m.subdivision === 0 ? ' beat' : ''}${armed && armed.track === t.id && armed.step === s ? ' armed' : ''}" data-s="${s}">${s + 1}</div>`;
    cr.innerHTML = ch;
    let html = '';
    rows.forEach(n => {
      html += `<div class="lab${n % 12 === m.root ? ' root' : ''}">${noteName(n)}</div>`;
      for (let s = 0; s < t.length; s++) { const st = t.steps[s]; const cls = ['cell']; if (s % m.subdivision === 0) cls.push('beat'); if (st && st.n === n) cls.push('on'); if (n % 12 === m.root) cls.push('rowroot');
        html += `<div class="${cls.join(' ')}" data-s="${s}" data-n="${n}"></div>`; }
    });
    g.innerHTML = html;
    // notes outside the visible octaves still play; mark them on the nearest edge row
    t.steps.forEach((st, s) => { if (st.n === null || st.n === undefined || rows.includes(st.n)) return; const edge = st.n > rows[0] ? rows[0] : rows[rows.length - 1]; const c = $(`.cell[data-s="${s}"][data-n="${edge}"]`, g); if (c) { c.classList.add('on', 'edge'); c.title = noteName(st.n) + ' (outside these octaves)'; } });
    if (t.micro) { cents.classList.add('show'); cents.style.gridTemplateColumns = cols; cents.innerHTML = '<div class="lab">cents</div>' + t.steps.map((st, s) => `<input data-s="${s}" type="number" step="1" min="-100" max="100" value="${st.cents || 0}">`).join('');
      $$('input', cents).forEach(inp => inp.addEventListener('change', () => { t.steps[+inp.dataset.s].cents = Math.max(-100, Math.min(100, +inp.value || 0)); save(); })); }
    else cents.classList.remove('show');
  }
  // grid gestures: click writes + arms · drag a note moves it · drag across empties draws · right/shift clears
  let gdrag = null, hoverTimer = null;
  const grid = $('#grid');
  function cellAt(x, y) { const el = document.elementFromPoint(x, y); return el && el.classList.contains('cell') ? el : null; }
  grid.addEventListener('pointerdown', e => {
    const t = selTrack(); const c = e.target.closest('.cell'); if (!t || !c) return;
    clearTimeout(hoverTimer);
    const s = +c.dataset.s, n = +c.dataset.n; const st = t.steps[s];
    try { grid.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
    if (e.button === 2 || e.shiftKey) { st.n = null; gdrag = { mode: 'erase', last: c }; }
    else if (st.n === n || c.classList.contains('edge')) { gdrag = { mode: 'move', from: s, n: st.n, last: c, moved: false }; }
    else { st.n = t.micro ? n : E.quantize(n, m.root, m.scale, m.chord); armed = { track: t.id, step: s }; P.preview(t.voice, st.n, 0.3, t.fx); gdrag = { mode: 'paint', last: c }; }
    renderGrid(); save();
  });
  grid.addEventListener('pointermove', e => {
    const t = selTrack(); if (!t || !gdrag) return;
    const c = cellAt(e.clientX, e.clientY); if (!c || c === gdrag.last) return;
    const s = +c.dataset.s, n = +c.dataset.n;
    if (gdrag.mode === 'paint') { const st = t.steps[s]; const nn = t.micro ? n : E.quantize(n, m.root, m.scale, m.chord); if (st.n !== nn) { st.n = nn; P.preview(t.voice, nn, 0.2, t.fx, 0.6); } armed = { track: t.id, step: s }; renderGrid(); save(); }
    else if (gdrag.mode === 'erase') { t.steps[s].n = null; renderGrid(); save(); }
    else if (gdrag.mode === 'move') { gdrag.moved = true; $$('.cell.ghost', grid).forEach(x => x.classList.remove('ghost')); c.classList.add('ghost'); }
    gdrag.last = c;
  });
  function endDrag(e) {
    const t = selTrack(); if (!t || !gdrag) return; const d = gdrag; gdrag = null;
    if (d.mode === 'move') {
      const c = cellAt(e.clientX, e.clientY);
      if (!d.moved || !c) { t.steps[d.from].n = null; armed = { track: t.id, step: d.from }; }   // a plain click on a note clears it
      else { const s = +c.dataset.s, n = +c.dataset.n; const nn = t.micro ? n : E.quantize(n, m.root, m.scale, m.chord); t.steps[d.from].n = null; t.steps[s].n = nn; armed = { track: t.id, step: s }; P.preview(t.voice, nn, 0.3, t.fx); }
      renderGrid(); save();
    }
  }
  grid.addEventListener('pointerup', endDrag); grid.addEventListener('pointercancel', endDrag);
  grid.addEventListener('contextmenu', e => e.preventDefault());
  // hover: a soft preview of the note under the pointer, after a short rest
  grid.addEventListener('pointerover', e => {
    const t = selTrack(); const c = e.target.closest('.cell'); clearTimeout(hoverTimer); if (!t || !c || gdrag) return;
    const n = +c.dataset.n; hoverTimer = setTimeout(() => { P.preview(t.voice, t.micro ? n : E.quantize(n, m.root, m.scale, m.chord), 0.18, t.fx, 0.28); }, 220);
  });
  grid.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  $('#cursorRow').addEventListener('click', e => { const t = selTrack(); const d = e.target.closest('.stepno'); if (!t || !d) return; armed = { track: t.id, step: +d.dataset.s }; renderGrid(); });

  $('#lengths').addEventListener('click', e => { const t = selTrack(); const b = e.target.closest('button'); if (!t || !b) return; E.setLength(t, +b.dataset.v); if (armed && armed.step >= t.length) armed = null; renderStrip(t); renderEditor(); save(); });
  $('#lengthN').addEventListener('change', () => { const t = selTrack(); if (!t) return; E.setLength(t, +$('#lengthN').value); if (armed && armed.step >= t.length) armed = null; renderStrip(t); renderEditor(); save(); });
  $('#art').addEventListener('click', e => { const t = selTrack(); const b = e.target.closest('button'); if (!t || !b) return; t.articulation = b.dataset.v; setBtnRow($('#art'), t.articulation); save(); });
  $('#kbBase').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; kbBase = +b.dataset.v; setBtnRow($('#kbBase'), kbBase); renderKeyboard(); renderGrid(); });
  $('#micro').addEventListener('click', () => { const t = selTrack(); if (!t) return; t.micro = !t.micro; renderEditor(); save(); });
  $('#clear').addEventListener('click', () => { const t = selTrack(); if (!t) return; t.steps.forEach(s => { s.n = null; s.cents = 0; }); armed = { track: t.id, step: 0 }; renderGrid(); save(); });

  // the drawer: effects for the selected track
  const FX_CONTROLS = [
    ['reverb', 'reverb', 0, 1, 0.01], ['delayMix', 'delay', 0, 1, 0.01], ['delayTime', 'delay time (s)', 0.03, 1.5, 0.005], ['delayFeedback', 'delay repeats', 0, 0.9, 0.01],
    ['harmonizerMix', 'harmonizer', 0, 1, 0.01], ['harmonizer', 'harmony interval', -24, 24, 1],
    ['compressor', 'compression', 0, 1, 0.01], ['distortion', 'distortion', 0, 1, 0.01], ['ringMod', 'ring mod', 0, 1, 0.01], ['ringHz', 'ring mod hz', 20, 2000, 1],
    ['envFilter', 'envelope filter', 0, 1, 0.01], ['autoWah', 'auto-wah', 0, 1, 0.01], ['univibe', 'univibe', 0, 1, 0.01],
  ];
  function renderFx() {
    const t = selTrack(); const g = $('#fxgrid'); if (!t) { g.innerHTML = ''; return; }
    $('#moreTitle').textContent = `track ${m.tracks.indexOf(t) + 1}`;
    g.innerHTML = FX_CONTROLS.map(([k, label, lo, hi, step]) => `<label>${label} <input data-k="${k}" type="range" min="${lo}" max="${hi}" step="${step}" value="${t.fx[k]}"></label>`).join('');
    $$('input', g).forEach(inp => inp.addEventListener('input', () => { t.fx[inp.dataset.k] = +inp.value; P.refreshFx(); save(); }));
  }
  $('#moreBtn').addEventListener('click', () => { $('#more').classList.toggle('open'); renderFx(); });
  $('#moreClose').addEventListener('click', () => $('#more').classList.remove('open'));

  // ---- the piano ------------------------------------------------------------------------------
  const BLACK = new Set([1, 3, 6, 8, 10]);
  function renderKeyboard() {
    const kb = $('#keyboard'); kb.innerHTML = '';
    const inScale = new Set(E.scaleNotes(m.root, m.scale, m.chord, kbBase, kbBase + 24));
    const whites = []; for (let n = kbBase; n <= kbBase + 24; n++) if (!BLACK.has(n % 12)) whites.push(n);
    whites.forEach(n => { const k = document.createElement('div'); k.className = 'key' + (inScale.has(n) ? '' : ' out'); k.dataset.n = n; k.textContent = n % 12 === 0 ? 'C' + (n / 12 - 1) : ''; kb.appendChild(k); });
    const w = 100 / whites.length;
    for (let n = kbBase; n <= kbBase + 24; n++) if (BLACK.has(n % 12)) { const k = document.createElement('div'); k.className = 'key black' + (inScale.has(n) ? '' : ' out'); k.dataset.n = n;
      const idx = whites.filter(x => x < n).length; k.style.left = (idx * w) + '%'; kb.appendChild(k); }
    kb.onpointerdown = e => { const k = e.target.closest('.key'); if (!k) return; const n = +k.dataset.n; k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 160); noteFromKeyboard(n); };
  }
  function noteFromKeyboard(n) {
    const t = selTrack(); if (!t) return;
    P.preview(t.voice, n, 0.4, t.fx);
    const nn = t.micro ? n : E.quantize(n, m.root, m.scale, m.chord);
    if (recording && P.isPlaying()) { const s = nearestStep(t); t.steps[s].n = nn; armed = { track: t.id, step: (s + 1) % t.length }; renderGrid(); save(); return; }
    if (armed && armed.track === t.id) { t.steps[armed.step].n = nn; armed.step = (armed.step + 1) % t.length; renderGrid(); save(); }
  }

  // ---- keys ----------------------------------------------------------------------------------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); $('#play').click(); }
    else if (e.key === 'h' || e.key === 'H') $('#hold').click();
    else if (e.key === 'r' || e.key === 'R') $('#record').click();
    else if (e.key === 'Escape') { armed = null; renderGrid(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { const t = selTrack(); if (t && armed && armed.track === t.id) { t.steps[armed.step].n = null; renderGrid(); save(); } }
    else if (e.key >= '1' && e.key <= '4') { const t = m.tracks[+e.key - 1]; if (t) { sel = t.id; armed = null; m.tracks.forEach(renderStrip); renderEditor(); } }
  });

  // ---- the frame: playhead, clocks, meters, the studio ---------------------------------------
  const levels = {};   // smoothed per-track levels for the strips
  let lastT = performance.now();
  function frame() {
    const now = P.now(); const wall = performance.now(); const dt = Math.min(0.1, (wall - lastT) / 1000); lastT = wall;
    const playing = P.isPlaying(); const lv = P.levels();
    const t0 = selTrack();
    for (const t of m.tracks) {
      const card = cards[t.id]; if (!card) continue;
      let last = null; for (let i = P.events.length - 1; i >= 0; i--) { const e = P.events[i]; if (e.track === t.id && e.time <= now) { last = e; break; } }
      const lit = !!(last && playing && now - last.time < Math.max(0.1, Math.min(0.3, last.dur)));
      $('.tally', card).classList.toggle('lit', lit);
      if (t === t0) {
        $$('.stepno.now', $('#cursorRow')).forEach(c => c.classList.remove('now')); $$('.cell.now', grid).forEach(c => c.classList.remove('now'));
        if (last && playing && now - last.time < Math.max(0.12, last.dur)) { const sn = $(`.stepno[data-s="${last.step}"]`); if (sn) sn.classList.add('now'); const c = $(`.cell.on[data-s="${last.step}"]`, grid); if (c) c.classList.add('now'); }
      }
      const off = E.offsetOf(m, t); $('.clock .hand', card).style.transform = `rotate(${(off * 360).toFixed(1)}deg)`;
      const d = E.driftSteps(m, t); $('.driftVal', card).textContent = playing ? `${d >= 0 ? '+' : ''}${d.toFixed(2)} steps` : '';
      const target = (lv.tracks[t.id] || 0); levels[t.id] = ballistics(levels[t.id] || 0, target, dt, 30, 6);
    }
    vuState.a = ballistics(vuState.a, lv.master, dt, 28, 5); vuState.b = ballistics(vuState.b, lv.master, dt, 22, 7);
    vuA.style.transform = `rotate(${vuAngle(vuState.a).toFixed(1)}deg)`; vuB.style.transform = `rotate(${vuAngle(vuState.b * 0.96).toFixed(1)}deg)`;
    if (window.ReichStudio) window.ReichStudio.update({ playing, master: vuState.a, tracks: m.tracks.map(t => ({ rate: t.rate, level: levels[t.id] || 0, on: !t.mute })) });
    requestAnimationFrame(frame);
  }

  // ---- persistence + boot ------------------------------------------------------------------
  let saveTimer = null;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(E.snapshot(m))); } catch (e) {} }, 200); }
  function renderAll() {
    if (!m.tracks.find(t => t.id === sel)) sel = m.tracks[0] ? m.tracks[0].id : null; armed = null;
    syncBridge(); renderKeyboard(); renderStrips(); renderEditor(); m.tracks.forEach(loadVoice);
  }
  function demo() {
    P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id));
    E.restore(m, { bpm: 120, subdivision: 2, root: 0, scale: 'major', chord: 'none (whole scale)', tracks: [] });
    const v = defaultVoice();
    const a = E.addTrack(m, { voice: v }); E.fillFigure(m, a, 'twelve (phase figure)', 60);
    const b = E.addTrack(m, { voice: v, rate: 1.01 }); E.fillFigure(m, b, 'twelve (phase figure)', 60);
    sel = a.id; renderAll(); save();
  }
  async function boot() {
    const v = document.createElement('div'); v.id = 'veil'; document.body.appendChild(v);
    buildPhrases();
    await P.loadList();
    let snap = null; try { snap = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
    if (snap && snap.tracks && snap.tracks.length) { E.restore(m, snap); m.tracks.length = Math.min(m.tracks.length, MAX_TRACKS); renderAll(); } else demo();
    fillPresets(); requestAnimationFrame(frame);
  }
  window.__reich = { m, P, E, get sel() { return sel; }, select: id => { sel = id; renderAll(); } };   // diagnostics handle (sims, the pane)
  boot();
})();
