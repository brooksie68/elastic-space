// The Reich Machine — the plain face. Wires the engine + player to controls. No look yet.
(function () {
  'use strict';
  const E = window.ReichEngine;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const STORE = 'reich-machine-state', PRESETS = 'reich-machine-presets';

  const m = E.createMachine();
  const P = window.ReichPlayer.create({ machine: m, base: './assets/voices/' });
  let armed = null;                 // { track, step } — the keyboard writes here
  let kbBase = 60;

  // ---- sound control (the shared speaker button) ---------------------------------------
  window.ElasticSoundControl && window.ElasticSoundControl.attach({
    start: () => P.resume(), stop: () => P.suspend(), setVolume: v => P.setVolume(v * +$('#volume').value),
  });

  // ---- header ------------------------------------------------------------------------
  function fillSelect(sel, items, value) { sel.innerHTML = items.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); if (value !== undefined) sel.value = value; }
  fillSelect($('#root'), E.ROOTS.map((r, i) => [i, r]));
  fillSelect($('#scale'), Object.keys(E.SCALES).map(k => [k, k]));
  fillSelect($('#chord'), Object.keys(E.CHORDS).map(k => [k, k]));

  function syncHeader() {
    $('#bpm').value = m.bpm; $('#subdiv').value = m.subdivision; $('#root').value = m.root; $('#scale').value = m.scale; $('#chord').value = m.chord;
    $('#hold').classList.toggle('on', m.hold); $('#play').classList.toggle('on', P.isPlaying()); $('#play').textContent = P.isPlaying() ? '■' : '▶';
  }
  $('#play').addEventListener('click', () => { if (P.isPlaying()) P.stop(); else P.start(); syncHeader(); });
  $('#rewind').addEventListener('click', () => { E.rewind(m); });
  $('#bpm').addEventListener('input', () => { m.bpm = Math.max(30, Math.min(260, +$('#bpm').value || 120)); renderAllDriftReadouts(); save(); });
  $('#subdiv').addEventListener('change', () => { m.subdivision = +$('#subdiv').value; renderAllDriftReadouts(); save(); });
  $('#hold').addEventListener('click', () => { m.hold = !m.hold; syncHeader(); save(); });
  const onPitch = () => { m.root = +$('#root').value; m.scale = $('#scale').value; m.chord = $('#chord').value; E.requantize(m); renderKeyboard(); renderAllGrids(); save(); };
  ['#root', '#scale', '#chord'].forEach(s => $(s).addEventListener('change', onPitch));
  $('#kbBase').addEventListener('change', () => { kbBase = +$('#kbBase').value; renderKeyboard(); renderAllGrids(); });
  $('#addTrack').addEventListener('click', () => { const t = E.addTrack(m, { voice: defaultVoice(), length: 8 }); renderTrack(t); loadVoice(t); save(); });
  $('#reset').addEventListener('click', () => { demo(); });
  $('#volume').addEventListener('input', () => P.setVolume(+$('#volume').value));
  $('#mReverb').addEventListener('input', () => P.setMasterFx({ reverb: +$('#mReverb').value }));
  $('#mComp').addEventListener('input', () => P.setMasterFx({ compressor: +$('#mComp').value }));
  $('#savePreset').addEventListener('click', () => { const name = prompt('preset name'); if (!name) return; const all = loadPresets(); all[name] = E.snapshot(m); localStorage.setItem(PRESETS, JSON.stringify(all)); fillPresets(name); });
  $('#presets').addEventListener('change', () => { const all = loadPresets(); const s = all[$('#presets').value]; if (s) { P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id)); E.restore(m, s); renderAll(); save(); } });
  function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESETS) || '{}'); } catch (e) { return {}; } }
  function fillPresets(value) { const all = loadPresets(); $('#presets').innerHTML = '<option value="">presets…</option>' + Object.keys(all).map(k => `<option>${k}</option>`).join(''); if (value) $('#presets').value = value; }

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); $('#play').click(); }
    if (e.key === 'h' || e.key === 'H') $('#hold').click();
    if (e.key === 'Escape') { armed = null; renderAllGrids(); }
  });

  // ---- the keyboard -----------------------------------------------------------------
  const BLACK = new Set([1, 3, 6, 8, 10]);
  function renderKeyboard() {
    const kb = $('#keyboard'); kb.innerHTML = '';
    const inScale = new Set(E.scaleNotes(m.root, m.scale, m.chord, kbBase, kbBase + 24));
    const whites = []; for (let n = kbBase; n <= kbBase + 24; n++) if (!BLACK.has(n % 12)) whites.push(n);
    whites.forEach(n => { const k = document.createElement('div'); k.className = 'key' + (inScale.has(n) ? '' : ' out'); k.dataset.n = n; k.textContent = n % 12 === 0 ? 'C' + (n / 12 - 1) : ''; kb.appendChild(k); });
    const w = 100 / whites.length;
    for (let n = kbBase; n <= kbBase + 24; n++) if (BLACK.has(n % 12)) { const k = document.createElement('div'); k.className = 'key black' + (inScale.has(n) ? '' : ' out'); k.dataset.n = n;
      const idx = whites.filter(x => x < n).length; k.style.left = (idx * w) + '%'; kb.appendChild(k); }
    kb.onpointerdown = e => { const k = e.target.closest('.key'); if (!k) return; const n = +k.dataset.n; k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 150); noteFromKeyboard(n); };
  }
  function noteFromKeyboard(n) {
    const t = armed ? m.tracks.find(x => x.id === armed.track) : m.tracks[0];
    if (t) P.preview(t.voice, n, 0.4, t.fx);
    if (armed && t) { t.steps[armed.step].n = t.micro ? n : E.quantize(n, m.root, m.scale, m.chord); armed.step = (armed.step + 1) % t.length; renderGrid(t); save(); }
  }

  // ---- tracks -----------------------------------------------------------------------
  const cards = {};
  function defaultVoice() { const v = P.voiceList()[0]; return v ? v.slug : 'tone'; }
  function voiceOptions() { return P.voiceList().map(v => [v.slug, v.name]); }
  async function loadVoice(t) {
    const card = cards[t.id]; const st = card && $('.vstate', card);
    if (P.voices[t.voice] && (P.voices[t.voice].synth || P.isLoaded(t.voice))) { if (st) st.textContent = ''; return; }
    if (st) st.textContent = 'loading…';
    await P.loadVoice(t.voice); if (st) st.textContent = P.isLoaded(t.voice) ? '' : 'missing';
  }
  function renderTrack(t) {
    let card = cards[t.id];
    if (!card) { card = $('#trackTpl').content.firstElementChild.cloneNode(true); cards[t.id] = card; $('#tracks').appendChild(card); wireTrack(t, card); }
    $('.num', card).textContent = m.tracks.indexOf(t) + 1;
    fillSelect($('.voice', card), voiceOptions(), t.voice);
    $('.length', card).value = t.length; $('.gate', card).value = t.gate; $('.gain', card).value = t.gain; $('.art', card).value = t.articulation;
    $('.mute', card).classList.toggle('on', t.mute); $('.micro', card).classList.toggle('on', t.micro); card.classList.toggle('micro', t.micro);
    $('.rate', card).value = ((t.rate - 1) * 100).toFixed(2); $('.pull', card).value = t.pull;
    fillSelect($('.figure', card), [['', 'fill with…']].concat(E.FIGURES.map(f => [f.name, f.name])), '');
    renderDrift(t); renderGrid(t); renderFx(t);
  }
  function wireTrack(t, card) {
    $('.voice', card).addEventListener('change', () => { t.voice = $('.voice', card).value; loadVoice(t); save(); });
    $('.length', card).addEventListener('change', () => { E.setLength(t, +$('.length', card).value); $('.length', card).value = t.length; renderGrid(t); renderDrift(t); save(); });
    $('.figure', card).addEventListener('change', () => { const f = $('.figure', card).value; if (!f) return; E.fillFigure(m, t, f, kbBase); $('.length', card).value = t.length; $('.figure', card).value = ''; renderGrid(t); renderDrift(t); save(); });
    $('.gate', card).addEventListener('input', () => { t.gate = +$('.gate', card).value; save(); });
    $('.gain', card).addEventListener('input', () => { t.gain = +$('.gain', card).value; P.refreshFx(); save(); });
    $('.art', card).addEventListener('change', () => { t.articulation = $('.art', card).value; save(); });
    $('.mute', card).addEventListener('click', () => { t.mute = !t.mute; $('.mute', card).classList.toggle('on', t.mute); P.refreshFx(); save(); });
    $('.micro', card).addEventListener('click', () => { t.micro = !t.micro; $('.micro', card).classList.toggle('on', t.micro); card.classList.toggle('micro', t.micro); renderGrid(t); save(); });
    $('.del', card).addEventListener('click', () => { E.removeTrack(m, t.id); P.dropChain(t.id); card.remove(); delete cards[t.id]; if (armed && armed.track === t.id) armed = null; m.tracks.forEach(x => { $('.num', cards[x.id]).textContent = m.tracks.indexOf(x) + 1; }); save(); });
    $('.rate', card).addEventListener('input', () => { t.rate = 1 + (+$('.rate', card).value) / 100; renderDrift(t); save(); });
    $('.rate', card).addEventListener('dblclick', () => { $('.rate', card).value = 0; t.rate = 1; renderDrift(t); save(); });
    $('.pull', card).addEventListener('input', () => { t.pull = +$('.pull', card).value; renderDrift(t); save(); });
    $('.nudgeL', card).addEventListener('click', () => { E.nudge(t, -1); });
    $('.nudgeR', card).addEventListener('click', () => { E.nudge(t, 1); });
  }
  function renderDrift(t) {
    const card = cards[t.id]; const pct = (t.rate - 1) * 100;
    $('.rateVal', card).textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + ' %';
    const cyc = E.cycleSeconds(m, t);
    $('.cycle', card).textContent = cyc === Infinity ? 'locked to the master' : 'comes around every ' + fmtTime(cyc);
    $('.pullVal', card).textContent = t.pull === 0 ? 'tape' : t.pull >= 0.99 ? 'piano phase' : t.pull.toFixed(2);
  }
  function renderAllDriftReadouts() { m.tracks.forEach(renderDrift); }
  function fmtTime(s) { if (s > 3600 * 20) return 'never'; const mm = Math.floor(s / 60), ss = Math.round(s % 60); return mm ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss} s`; }

  function gridRows(t) { return t.micro ? Array.from({ length: 25 }, (_, i) => kbBase + 24 - i) : E.scaleNotes(m.root, m.scale, m.chord, kbBase, kbBase + 24).reverse(); }
  function noteName(n) { return E.ROOTS[n % 12] + (Math.floor(n / 12) - 1); }
  function renderGrid(t) {
    const card = cards[t.id]; const g = $('.grid', card); const rows = gridRows(t);
    g.style.gridTemplateColumns = `3.2em repeat(${t.length}, minmax(14px, 1fr))`;
    let html = '';
    rows.forEach(n => {
      html += `<div class="lab${n % 12 === m.root ? ' root' : ''}">${noteName(n)}</div>`;
      for (let s = 0; s < t.length; s++) { const st = t.steps[s]; const cls = ['cell']; if (s % m.subdivision === 0) cls.push('beat'); if (st && st.n === n) cls.push('on'); if (armed && armed.track === t.id && armed.step === s) cls.push('armed'); if (n % 12 === m.root) cls.push('root');
        html += `<div class="${cls.join(' ')}" data-s="${s}" data-n="${n}"></div>`; }
    });
    g.innerHTML = html;
    // notes that fell outside the visible rows still play; show them on the nearest edge row so nothing is invisible
    t.steps.forEach((st, s) => { if (st.n === null || st.n === undefined || rows.includes(st.n)) return; const edge = st.n > rows[0] ? rows[0] : rows[rows.length - 1]; const c = $(`.cell[data-s="${s}"][data-n="${edge}"]`, g); if (c) { c.classList.add('on'); c.title = noteName(st.n) + ' (off the visible rows)'; } });
    const cents = $('.cents', card);
    if (t.micro) { cents.style.gridTemplateColumns = `3.2em repeat(${t.length}, minmax(14px, 1fr))`; cents.innerHTML = '<div class="lab">cents</div>' + t.steps.map((st, s) => `<input data-s="${s}" type="number" step="1" min="-100" max="100" value="${st.cents || 0}">`).join('');
      $$('input', cents).forEach(inp => inp.addEventListener('change', () => { t.steps[+inp.dataset.s].cents = Math.max(-100, Math.min(100, +inp.value || 0)); save(); })); }
    card.classList.toggle('armed', !!(armed && armed.track === t.id));
    g.onpointerdown = e => {
      const c = e.target.closest('.cell'); if (!c) return; const s = +c.dataset.s, n = +c.dataset.n; const st = t.steps[s];
      if (e.button === 2 || e.shiftKey) { st.n = null; }
      else if (st.n === n) { st.n = null; armed = { track: t.id, step: s }; }
      else { st.n = n; armed = { track: t.id, step: s }; P.preview(t.voice, n, 0.3, t.fx); }
      m.tracks.forEach(x => renderGrid(x)); save();
    };
    g.oncontextmenu = e => e.preventDefault();
  }
  function renderAllGrids() { m.tracks.forEach(renderGrid); }

  const FX_CONTROLS = [
    ['reverb', 'reverb', 0, 1, 0.01], ['delayMix', 'delay', 0, 1, 0.01], ['delayTime', 'delay time (s)', 0.03, 1.5, 0.005], ['delayFeedback', 'delay repeats', 0, 0.9, 0.01],
    ['harmonizerMix', 'harmonizer', 0, 1, 0.01], ['harmonizer', 'harmony interval', -24, 24, 1],
    ['compressor', 'compression', 0, 1, 0.01], ['distortion', 'distortion', 0, 1, 0.01], ['ringMod', 'ring mod', 0, 1, 0.01], ['ringHz', 'ring mod Hz', 20, 2000, 1],
    ['envFilter', 'envelope filter', 0, 1, 0.01], ['autoWah', 'auto-wah', 0, 1, 0.01], ['univibe', 'univibe', 0, 1, 0.01],
  ];
  function renderFx(t) {
    const card = cards[t.id]; const g = $('.fxgrid', card);
    g.innerHTML = FX_CONTROLS.map(([k, label, lo, hi, step]) => `<label>${label} <input data-k="${k}" type="range" min="${lo}" max="${hi}" step="${step}" value="${t.fx[k]}"></label>`).join('');
    $$('input', g).forEach(inp => inp.addEventListener('input', () => { t.fx[inp.dataset.k] = +inp.value; P.refreshFx(); save(); }));
  }

  // ---- the playhead + phase display ----------------------------------------------------
  function frame() {
    const now = P.now();
    for (const t of m.tracks) {
      const card = cards[t.id]; if (!card) continue;
      let last = null; for (let i = P.events.length - 1; i >= 0; i--) { const e = P.events[i]; if (e.track === t.id && e.time <= now) { last = e; break; } }
      $$('.cell.now', card).forEach(c => c.classList.remove('now'));
      if (last && P.isPlaying() && now - last.time < Math.max(0.12, last.dur)) $$(`.cell[data-s="${last.step}"]`, card).forEach(c => c.classList.add('now'));
      const off = E.offsetOf(m, t); $('.marker', card).style.left = (50 + off * 100) + '%';
      const d = E.driftSteps(m, t); $('.driftVal', card).textContent = P.isPlaying() ? `${d >= 0 ? '+' : ''}${d.toFixed(2)} steps` : '';
    }
    requestAnimationFrame(frame);
  }

  // ---- persistence + boot ----------------------------------------------------------------
  let saveTimer = null;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(E.snapshot(m))); } catch (e) {} }, 200); }
  function renderAll() { $('#tracks').innerHTML = ''; Object.keys(cards).forEach(k => delete cards[k]); armed = null; syncHeader(); renderKeyboard(); m.tracks.forEach(t => { renderTrack(t); loadVoice(t); }); }
  function demo() {
    P.stop(); Object.keys(P.chains).forEach(id => P.dropChain(+id));
    E.restore(m, { bpm: 120, subdivision: 2, root: 0, scale: 'major', chord: 'none (whole scale)', tracks: [] });
    const v = defaultVoice();
    const a = E.addTrack(m, { voice: v }); E.fillFigure(m, a, 'twelve (phase figure)', 60);
    const b = E.addTrack(m, { voice: v, rate: 1.01 }); E.fillFigure(m, b, 'twelve (phase figure)', 60);
    renderAll(); save();
  }
  async function boot() {
    await P.loadList();
    let snap = null; try { snap = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
    if (snap && snap.tracks && snap.tracks.length) { E.restore(m, snap); renderAll(); } else demo();
    fillPresets(); requestAnimationFrame(frame);
  }
  window.__reich = { m, P, E };   // diagnostics handle (sims, the pane)
  boot();
})();
