// Relaaax — music: track player + reactivity engine. Owns the Web Audio graph
// (element -> analyser -> gain -> out; the analyser taps BEFORE the volume
// gain so reactivity never depends on how loud James is listening), runs the
// DSP from music-dsp.js each frame, plays Claude's composed sets
// (composition.js + assets/compositions.js), and writes the modulated params
// over the tuner's clean base. No UI here — it registers command handlers +
// a snapshot part with RelaaaxHost and mounts the control surface (tuner.js).
(function () {
  "use strict";

  const DSP = globalThis.RelaaaxMusicDSP;
  const bridge = globalThis.relaaaxTuner;
  const host = globalThis.RelaaaxHost;
  if (!DSP || !bridge || !host || !globalThis.relaaaxField) return;

  // James's Suno tracks — new MP3s dropped into assets/sound-tracks/ get a
  // line here (no fetch/directory listing: file:// must keep working).
  const DIR = "./assets/sound-tracks/";
  const TRACKS = [
    { file: "Angular Ritual.mp3", label: "Angular Ritual" },
    { file: "Jungle Moog Ritual.mp3", label: "Jungle Moog Ritual" },
    { file: "Timber at Sea.mp3", label: "Timber at Sea" },
  ];

  const STORE_KEY = "relaaax-music";
  const PRESET_KEY = "relaaax-music-presets";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // Merge stored settings over defaults, keeping the rows array well-formed.
  function mergeSettings(over) {
    const s = Object.assign(clone(DSP.DEFAULTS), over || {});
    const rows = Array.isArray(s.rows) ? s.rows : [];
    s.rows = DSP.DEFAULTS.rows.map((d, i) => {
      const r = rows[i] || {};
      return {
        src: DSP.SOURCES.includes(r.src) || r.src === "off" ? r.src : d.src,
        tgt: DSP.TARGETS[r.tgt] ? r.tgt : d.tgt,
        amt: typeof r.amt === "number" ? Math.max(-1, Math.min(1, r.amt)) : d.amt,
      };
    });
    return s;
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }
  const store = loadStore();
  store.pertrack = store.pertrack || {};
  if (store.dj !== "free" && store.dj !== "claude") store.dj = "claude";
  let settings = mergeSettings(store.settings);
  let presetSelected = "";

  function saveStore() {
    store.settings = settings;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (err) { /* no persistence */ }
  }

  // --- visual DJ (Claude's composed sets) -----------------------------------

  const ENGINE = globalThis.RelaaaxCompositionEngine;
  const COMPS = globalThis.RELAAAX_COMPOSITIONS || {};

  let djEngine = null;
  let lastComp = {};    // comp base keys written to the field last frame
  let prevTouched = []; // matrix targets written last frame
  let base = bridge.getBase();
  bridge.onBaseChange(() => { base = bridge.getBase(); });

  // Put every music-written key back to the tuner's clean base.
  function restoreBase() {
    const keys = new Set(prevTouched.concat(Object.keys(lastComp)));
    if (!keys.size) return;
    const partial = {};
    keys.forEach((k) => { partial[k] = base[k]; });
    globalThis.relaaaxField.setConfig(partial);
    prevTouched = [];
    lastComp = {};
  }

  // --- audio graph ----------------------------------------------------------

  const audio = new Audio();
  audio.preload = "metadata";
  let ctx = null;
  let analyser = null;
  let gainNode = null;
  let freqData = null;
  let volume = 1;

  function ensureGraph() {
    if (ctx) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    ctx = new AC();
    const source = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0; // DSP does its own envelopes
    gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(ctx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  function start() {
    ensureGraph();
    return audio.play().then(() => ctx.resume());
  }
  function stop() {
    audio.pause();
  }

  // --- track player ---------------------------------------------------------

  let trackIndex = Math.max(0, TRACKS.findIndex((t) => t.file === store.track));

  function resetComposition() {
    const comp = store.dj === "claude" ? COMPS[TRACKS[trackIndex].file] : null;
    djEngine = comp && ENGINE ? ENGINE.create(comp, DSP.DEFAULTS) : null;
    restoreBase();
  }

  function recallPerTrack() {
    const saved = store.pertrack[TRACKS[trackIndex].file];
    if (saved) {
      settings = mergeSettings(saved);
      presetSelected = "";
    }
  }

  function loadTrack(i, andPlay) {
    trackIndex = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    audio.src = DIR + encodeURIComponent(TRACKS[trackIndex].file);
    store.track = TRACKS[trackIndex].file;
    if (store.perTrack) recallPerTrack();
    resetComposition();
    saveStore();
    if (andPlay) start().catch(() => {});
  }

  function pickNext() {
    if (store.shuffle && TRACKS.length > 1) {
      let n = trackIndex;
      while (n === trackIndex) n = Math.floor(Math.random() * TRACKS.length);
      return n;
    }
    return trackIndex + 1;
  }

  audio.addEventListener("ended", () => {
    loadTrack(pickNext(), true);
    host.emit();
  });

  // --- reactivity presets ---------------------------------------------------

  const FACTORY = [{ id: "stock", label: "stock aggressive", settings: clone(DSP.DEFAULTS) }];

  function loadUserPresets() {
    try {
      return JSON.parse(localStorage.getItem(PRESET_KEY)) || {};
    } catch (err) {
      return {};
    }
  }
  const userPresets = loadUserPresets();

  function saveUserPresets() {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(userPresets));
    } catch (err) { /* no persistence */ }
  }

  function settingsChanged() {
    presetSelected = "";
    if (store.perTrack) store.pertrack[TRACKS[trackIndex].file] = clone(settings);
    saveStore();
  }

  function applyMusicPreset(s) {
    settings = mergeSettings(s);
    if (store.perTrack) store.pertrack[TRACKS[trackIndex].file] = clone(settings);
    saveStore();
  }

  // --- host registration ----------------------------------------------------

  host.registerMusic({
    snapshotPart() {
      return {
        settings: clone(settings),
        shuffle: !!store.shuffle,
        perTrack: !!store.perTrack,
        dj: store.dj,
        trackIndex,
        playing: !audio.paused,
        tracks: TRACKS.map((t) => t.label),
        presets: {
          factory: FACTORY.map((p) => ({ id: p.id, label: p.label })),
          user: Object.keys(userPresets).sort((a, b) => a.localeCompare(b)),
          selected: presetSelected,
        },
      };
    },
    command(cmd) {
      switch (cmd.type) {
        case "set":
          if (cmd.key in DSP.DEFAULTS && cmd.key !== "rows") {
            settings[cmd.key] = cmd.value;
            settingsChanged();
          }
          break;
        case "reset":
          if (cmd.key in DSP.DEFAULTS && cmd.key !== "rows") {
            settings[cmd.key] = DSP.DEFAULTS[cmd.key];
            settingsChanged();
          }
          break;
        case "matrix": {
          const row = settings.rows[cmd.index];
          if (!row) break;
          if (cmd.field === "amt") row.amt = Math.max(-1, Math.min(1, Number(cmd.value) || 0));
          else if (cmd.field === "src" && (cmd.value === "off" || DSP.SOURCES.includes(cmd.value))) row.src = cmd.value;
          else if (cmd.field === "tgt" && DSP.TARGETS[cmd.value]) row.tgt = cmd.value;
          settingsChanged();
          break;
        }
        case "player":
          switch (cmd.cmd) {
            case "toggle":
              if (audio.paused) start().catch(() => {});
              else stop();
              break;
            case "prev":
              loadTrack(trackIndex - 1, !audio.paused);
              break;
            case "next":
              loadTrack(pickNext(), !audio.paused);
              break;
            case "select":
              loadTrack(cmd.index, !audio.paused);
              break;
            case "shuffle":
              store.shuffle = !!cmd.value;
              saveStore();
              break;
            case "dj":
              store.dj = cmd.value === "free" ? "free" : "claude";
              saveStore();
              resetComposition();
              break;
          }
          break;
        case "preset": {
          const v = cmd.value;
          if (v.startsWith("f:")) {
            const p = FACTORY.find((f) => f.id === v.slice(2));
            if (p) { applyMusicPreset(p.settings); presetSelected = v; }
          } else if (v.startsWith("u:") && userPresets[v.slice(2)]) {
            applyMusicPreset(userPresets[v.slice(2)]);
            presetSelected = v;
          }
          break;
        }
        case "presetSave":
          if (FACTORY.some((p) => p.label.toLowerCase() === cmd.name.toLowerCase())) break;
          userPresets[cmd.name] = clone(settings);
          saveUserPresets();
          presetSelected = `u:${cmd.name}`;
          break;
        case "presetDelete":
          delete userPresets[cmd.name];
          saveUserPresets();
          presetSelected = "";
          break;
        case "perTrack":
          store.perTrack = !!cmd.value;
          if (store.perTrack) store.pertrack[TRACKS[trackIndex].file] = clone(settings);
          saveStore();
          break;
      }
    },
  });

  // Set the src BEFORE attaching the sound control — its one autoplay attempt
  // calls start(), which needs a loaded track to succeed for visitors who've
  // granted the site sound permission.
  loadTrack(trackIndex, false);

  const soundUI = ElasticSoundControl.attach({
    start,
    stop,
    setVolume: (v) => {
      volume = v;
      if (gainNode) gainNode.gain.value = v;
    },
  });
  audio.addEventListener("play", () => {
    soundUI.setOn(true);
    host.emit();
  });
  audio.addEventListener("pause", () => {
    soundUI.setOn(false);
    host.emit();
  });

  // --- the reactive loop ----------------------------------------------------

  const engine = DSP.create();
  let lastNow = performance.now();

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;
    if (!analyser || audio.paused || (!djEngine && settings.master === 0)) {
      restoreBase();
      return;
    }
    analyser.getByteFrequencyData(freqData);
    const raw = DSP.bandsFromSpectrum(freqData, ctx.sampleRate, analyser.fftSize);

    // With the DJ on, the composed set supplies the field base AND the
    // reactivity settings; free play uses the tuner base + James's settings.
    const djState = djEngine ? djEngine.evalAt(audio.currentTime) : null;
    const effBase = djState ? Object.assign({}, base, djState.base) : base;
    const effSettings = djState ? djState.react : settings;

    const { sources, beat } = engine.step(raw, dt, effSettings);
    if (beat) {
      host.beat();
      if (globalThis.RelaaaxFX) RelaaaxFX.beat();
    }
    const mods = DSP.modulate(effBase, sources, effSettings);
    const touched = Object.keys(mods);

    const partial = {};
    if (djState) {
      // Comp keys write only when they changed (ramps change every frame,
      // holds don't) and when modulation isn't already writing that key.
      for (const k of Object.keys(djState.base)) {
        if (djState.base[k] !== lastComp[k] && !(k in mods)) partial[k] = djState.base[k];
      }
      lastComp = djState.base;
    }
    Object.assign(partial, mods);
    // Targets that just left the matrix snap back to their effective base.
    prevTouched.forEach((k) => {
      if (!(k in partial)) partial[k] = effBase[k];
    });
    globalThis.relaaaxField.setConfig(partial);
    prevTouched = touched;
  }
  requestAnimationFrame(tick);

  // --- control surface ------------------------------------------------------
  // Mounted last: the host now has both field and music registered.

  if (globalThis.RelaaaxTuner) {
    RelaaaxTuner.mount({
      container: document.getElementById("rlx-tuner"),
      bus: host.localBus(),
      embedded: true,
    });
  }
})();
