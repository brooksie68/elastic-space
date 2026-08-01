// Lumina — music: track player + reactivity engine. Owns the Web Audio graph
// (element -> analyser -> gain -> out; the analyser taps BEFORE the volume
// gain so reactivity never depends on how loud James is listening), runs the
// DSP from music-dsp.js each frame, plays Claude's composed sets
// (composition.js + assets/compositions.js), and writes the modulated params
// over the tuner's clean base. No UI here — it registers command handlers +
// a snapshot part with LuminaHost and mounts the control surface (tuner.js).
(function () {
  "use strict";

  const DSP = globalThis.LuminaMusicDSP;
  const bridge = globalThis.luminaTuner;
  const host = globalThis.LuminaHost;
  if (!DSP || !bridge || !host || !globalThis.luminaField) return;
  const GRID = globalThis.LUMINA_TRACK_GRID || {};
  const RAMP = globalThis.LuminaField.RAMP;

  // James's Suno tracks. This baked list is the file:// fallback and the set
  // with measured grids + composed sets; when the page is SERVED, any other
  // MP3 dropped into assets/sound-tracks/ is auto-discovered on load (below)
  // and appended — it plays with full band reactivity, but the beat clock and
  // claude's set need the offline analyze/compose pass, so tell Claude when a
  // keeper lands and it gets measured, composed, and baked in here.
  const DIR = "./assets/sound-tracks/";
  const TRACKS = [
    { file: "Angular Ritual.mp3", label: "Angular Ritual" },
    { file: "Jungle Moog Ritual.mp3", label: "Jungle Moog Ritual" },
    { file: "Timber at Sea.mp3", label: "Timber at Sea" },
    { file: "Spore Circuit.mp3", label: "Spore Circuit" },
    { file: "Zion Rips.mp3", label: "Zion Rips" },
  ];

  // Served only — file:// keeps the baked list. Discovered tracks join the
  // rotation (player dropdown, shuffle, prev/next) as soon as the list lands.
  const served = location.protocol === "http:" || location.protocol === "https:";
  if (served) {
    fetch("/api/worlds/lumina/tracks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.files)) return;
        let added = 0;
        for (const file of data.files) {
          if (TRACKS.some((t) => t.file === file)) continue;
          TRACKS.push({ file, label: file.replace(/\.[a-z0-9]+$/i, "") });
          added++;
        }
        if (added && globalThis.LuminaHost) globalThis.LuminaHost.emit();
      })
      .catch(() => { /* server down — baked list only */ });
  }

  const STORE_KEY = "lumina-music";
  const PRESET_KEY = "lumina-music-presets";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // Merge stored settings over defaults, keeping the rows array well-formed.
  function mergeSettings(over) {
    const s = Object.assign(clone(DSP.DEFAULTS), over || {});
    const rows = Array.isArray(s.rows) ? s.rows : [];
    s.rows = DSP.DEFAULTS.rows.map((d, i) => {
      const r = rows[i] || {};
      // Migrate the pre-2026-07-28 stock row bass→blur 0.45 (whole-canvas
      // whiteout on the GL path) to the current stock row. Exact match only —
      // a hand-tuned blur row is a choice and survives.
      if (r.src === "bass" && r.tgt === "blur" && r.amt === 0.45) return Object.assign({}, d);
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
  // Free play is the DEFAULT (James, 2026-07-25): entering the world never
  // hands the field to a composed set — claude's set is an explicit opt-in.
  if (store.dj !== "free" && store.dj !== "claude" && store.dj !== "mine") store.dj = "free";
  let settings = mergeSettings(store.settings);
  let presetSelected = "";

  function saveStore() {
    store.settings = settings;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (err) { /* no persistence */ }
  }

  // --- visual DJ (Claude's composed sets) -----------------------------------

  const ENGINE = globalThis.LuminaCompositionEngine;
  const COMPS = globalThis.LUMINA_COMPOSITIONS || {};

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
    globalThis.luminaField.setConfig(partial);
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
    // Timelines are per track: drop any in-flight take, loop, and session
    // undo, and point the ghost at the new track's recording.
    tlArmed = false;
    tlTake = [];
    tlLoop = null;
    tlUndo = [];
    tlRebuildPlayer(0);
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

  // --- the performance timeline (2026-07-31) --------------------------------
  // James records his own set in SEGMENTS: punch in over a region, make some
  // moves, punch out, scrub back, try again. NO QUANTIZE — his call: every
  // move is stored at the raw audio time he made it; the beat grid never
  // touches this data. Merge rules + replay cursor live in timeline.js (pure,
  // sim-tested); this block is the wiring: capture from the host's command
  // tap, replay through host.replay* (which bypass the tap — the ghost never
  // re-records), per-track persistence, loop-region cycling.
  const TL = globalThis.LuminaTimeline;
  const TL_KEY = "lumina-timeline";
  function loadTimelines() {
    try { return JSON.parse(localStorage.getItem(TL_KEY)) || {}; } catch (err) { return {}; }
  }
  const timelines = loadTimelines();
  function saveTimelines() {
    try { localStorage.setItem(TL_KEY, JSON.stringify(timelines)); } catch (err) { /* fine */ }
  }
  const tlEvents = () => timelines[TRACKS[trackIndex].file] || [];

  let tlArmed = false;
  let tlTake = [];            // moves captured since punch-in
  let tlIn = 0;               // punch-in time (audio seconds)
  let tlTouched = new Set();  // keys touched this take — latch-mutes the ghost
  let tlUndo = [];            // pre-merge timelines, newest last (session only)
  let tlLoop = null;          // {a, b} or null
  let tlPlayer = null;
  let tlLastT = 0;

  const tlActive = () => store.dj === "mine" || tlArmed;

  function tlRebuildPlayer(seekT) {
    tlPlayer = TL && tlEvents().length ? TL.makePlayer(tlEvents()) : null;
    if (seekT !== undefined) tlSeek(seekT);
  }

  // Put the world where the timeline says it should be at t (fold), so
  // scrubbing into the middle of a performance looks right.
  function tlSeek(t) {
    tlLastT = t;
    if (!tlPlayer || !tlActive()) return;
    const { partial, freeze } = tlPlayer.seek(t);
    const b = Object.assign({}, partial);
    if (tlArmed) tlTouched.forEach((k) => { delete b[k]; });
    if (Object.keys(b).length) host.replayBase(b);
    if (freeze !== null) host.replayFreeze(freeze);
  }

  function tlCommit(tOut) {
    tlUndo.push(clone(tlEvents()));
    if (tlUndo.length > 20) tlUndo.shift();
    timelines[TRACKS[trackIndex].file] = TL.mergeTake(tlEvents(), tlTake, tlIn, tOut);
    saveTimelines();
    tlTake = [];
    tlTouched = new Set();
    tlRebuildPlayer(audio.currentTime);
  }

  // Capture: every live field command while armed and the track is rolling.
  host.onFieldCommand((cmd, after, frozenNow) => {
    if (!tlArmed || audio.paused) return;
    const t = +audio.currentTime.toFixed(3);
    if (cmd.type === "set") {
      // Linked margins move as a group — record what actually changed.
      if (/^margin/.test(cmd.key)) {
        ["marginTop", "marginRight", "marginBottom", "marginLeft"].forEach((k) => {
          tlTake.push({ t, k, v: after[k] });
          tlTouched.add(k);
        });
      } else {
        tlTake.push({ t, k: cmd.key, v: cmd.value });
        tlTouched.add(cmd.key);
      }
    } else if (["preset", "randomize", "randomizeTween", "resetAll", "patternStep", "undo"].includes(cmd.type)) {
      // Whole-look jumps record their LANDING state (a melt roll records
      // where it lands, not the two-second glide).
      tlTake.push({ t, base: Object.assign({}, after) });
      tlTouched = new Set(Object.keys(after));
    } else if (cmd.type === "punch") {
      tlTake.push({ t, punch: cmd.name, on: !!cmd.on });
    } else if (cmd.type === "freeze") {
      tlTake.push({ t, freeze: true, on: !!frozenNow });
    }
  });

  // --- host registration ----------------------------------------------------

  host.registerMusic({
    snapshotPart() {
      return {
        settings: clone(settings),
        shuffle: !!store.shuffle,
        perTrack: !!store.perTrack,
        dj: store.dj,
        timeline: {
          armed: tlArmed,
          count: tlEvents().length,
          takeCount: tlTake.length,
          loop: tlLoop,
          canUndo: tlUndo.length > 0,
          // Compact strip data: [t, kind] with 0 = control move, 1 = whole
          // look, 2 = pad/freeze; plus the track's energy silhouette.
          events: tlEvents().map((e) => [Math.round(e.t * 100) / 100, e.base ? 1 : e.k ? 0 : 2]),
          barEnergy: (GRID[TRACKS[trackIndex].file] || {}).barEnergy || null,
        },
        trackIndex,
        playing: !audio.paused,
        time: audio.currentTime || 0,
        duration: (isFinite(audio.duration) && audio.duration) || 0,
        volume,
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
            // Discrete forms for the transport bar's separate buttons
            // (2026-07-27); "toggle" stays for the tuner + speaker.
            case "play":
              if (audio.paused) start().catch(() => {});
              break;
            case "pause":
              if (!audio.paused) stop();
              break;
            case "stop":
              stop();
              audio.currentTime = 0;
              break;
            case "seek": {
              const dur = (isFinite(audio.duration) && audio.duration) || 0;
              audio.currentTime = Math.max(0, Math.min(Number(cmd.value) || 0, dur));
              break;
            }
            case "volume":
              soundUI.setVolume(Math.max(0, Math.min(1, Number(cmd.value) || 0)));
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
              store.dj = ["free", "claude", "mine"].includes(cmd.value) ? cmd.value : "free";
              saveStore();
              resetComposition();
              tlRebuildPlayer(audio.currentTime);
              break;
          }
          break;
        case "timeline":
          switch (cmd.cmd) {
            case "arm":
              if (tlArmed) {
                // Punch OUT: merge the take into the track's timeline.
                tlArmed = false;
                tlCommit(audio.currentTime);
              } else {
                // Punch IN. Claude's set can't be driving while you record
                // your own — recording flips to free play. Prior takes still
                // replay under you (that's the overdub), minus any key you
                // touch from here on.
                if (store.dj === "claude") { store.dj = "free"; saveStore(); resetComposition(); }
                tlArmed = true;
                tlTake = [];
                tlTouched = new Set();
                tlIn = audio.currentTime;
                tlRebuildPlayer(audio.currentTime);
                if (audio.paused) start().catch(() => {});
              }
              break;
            case "loop":
              tlLoop = (typeof cmd.a === "number" && typeof cmd.b === "number" && cmd.b - cmd.a > 0.5)
                ? { a: cmd.a, b: cmd.b } : null;
              break;
            case "loopClear":
              tlLoop = null;
              break;
            case "undoTake":
              if (tlUndo.length) {
                timelines[TRACKS[trackIndex].file] = tlUndo.pop();
                saveTimelines();
                tlRebuildPlayer(audio.currentTime);
              }
              break;
            case "clear":
              if (tlEvents().length) {
                tlUndo.push(clone(tlEvents()));
                timelines[TRACKS[trackIndex].file] = [];
                saveTimelines();
                tlRebuildPlayer();
              }
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
        case "resetAll":
          // The audio tab's reset: reactivity + matrix back to stock, player
          // toggles back to defaults. Playback and volume are left alone.
          settings = mergeSettings(null);
          presetSelected = "";
          store.shuffle = false;
          store.perTrack = false;
          store.dj = "free";
          saveStore();
          resetComposition();
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
      host.emit(); // keep the tuner's volume slider in step with the speaker's
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
  // Drives the tuner's playhead + time readout (~4 Hz while playing).
  audio.addEventListener("timeupdate", () => host.emit());
  audio.addEventListener("loadedmetadata", () => host.emit());

  // --- the reactive loop ----------------------------------------------------

  const engine = DSP.create();
  const accents = DSP.createAccents();
  let lastNow = performance.now();
  let lastBeatFired = -1;
  let lastModEmit = 0;
  let modEmitted = false;

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;

    // --- the timeline ghost: fire recorded moves at their exact times ------
    if (!audio.paused) {
      const t = audio.currentTime;
      if (tlActive() && tlPlayer) {
        // A scrub in either direction re-folds instead of burst-firing.
        if (t < tlLastT - 0.05 || t > tlLastT + 1) tlSeek(t);
        tlPlayer.step(t, (e) => {
          if (e.k) {
            // Latch: once you touch a key during a take, the ghost lets go
            // of that key for the rest of the take.
            if (!(tlArmed && tlTouched.has(e.k))) host.replayBase({ [e.k]: e.v });
          } else if (e.base) {
            const b = Object.assign({}, e.base);
            if (tlArmed) tlTouched.forEach((k) => { delete b[k]; });
            host.replayBase(b);
          } else if (e.punch) {
            host.replayPunch(e.punch, e.on);
          } else if (e.freeze !== undefined) {
            host.replayFreeze(e.on);
          }
        });
        tlLastT = t;
      }
      // Loop region: wrap at the end; an armed pass commits and stays armed,
      // so cycling a section stacks takes without touching the transport.
      if (tlLoop && t >= tlLoop.b) {
        if (tlArmed) {
          tlCommit(Math.min(t, tlLoop.b));
          tlIn = tlLoop.a;
        }
        audio.currentTime = tlLoop.a;
        tlSeek(tlLoop.a);
        host.emit();
      }
    }
    if (!analyser || audio.paused || (!djEngine && settings.master === 0)) {
      restoreBase();
      if (modEmitted) { modEmitted = false; host.mod({}); } // clear ghost dots
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

    // --- the beat clock: musical position straight from the measured grid ---
    const grid = GRID[TRACKS[trackIndex].file];
    const clock = DSP.clockAt(grid, audio.currentTime);
    if (clock) {
      sources.pulse = accents.step(clock, effBase.accent, effSettings.accentDecay, dt);
      sources.bar = clock.barPhase;
      sources.phrase = clock.phrasePhase;
      sources.swing = clock.swing;
      // Tempo-locked flashing: one full oscillator cycle = N beats exactly, so
      // the field breathes WITH the track instead of drifting against it.
      if (effBase.syncBeats > 0) {
        effBase.speed = RAMP / (effBase.syncBeats * grid.beatLen);
      }
      // The beat indicator follows the grid, not the detector, while a set
      // with a known tempo is playing.
      if (clock.beat !== lastBeatFired && clock.beatPhase < 0.5) {
        lastBeatFired = clock.beat;
        host.beat();
        if (globalThis.LuminaFX) LuminaFX.beat();
      }
    } else {
      sources.pulse = 0;
      sources.bar = 0;
      sources.phrase = 0;
      sources.swing = 0;
      if (beat) {
        host.beat();
        if (globalThis.LuminaFX) LuminaFX.beat();
      }
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
    // Held punch pads (world.js) ride last — over base, comp, and modulation.
    const punch = bridge.getPunch ? bridge.getPunch() : null;
    if (punch) Object.assign(partial, punch);
    globalThis.luminaField.setConfig(partial);
    prevTouched = touched;
    // Ghost dots (2026-07-31): stream the matrix-modulated values ~15 Hz so
    // the panel's sliders can show where the music is pushing them.
    if (now - lastModEmit > 66) {
      lastModEmit = now;
      host.mod(mods);
      modEmitted = Object.keys(mods).length > 0;
    }
  }
  requestAnimationFrame(tick);

  // --- control surface ------------------------------------------------------
  // Mounted last: the host now has both field and music registered.

  if (globalThis.LuminaTuner) {
    LuminaTuner.mount({
      container: document.getElementById("lum-tuner"),
      bus: host.localBus(),
      embedded: true,
    });
  }

  // --- the little player (always visible, bottom left) ----------------------
  // James (2026-07-25, laptop-only sessions): player control must be present
  // without opening the tuner. 2026-07-27: rebuilt as a two-row unit — a brand
  // row (logo + LUMINA) over the transport row, standard deck order with
  // SEPARATE play and pause (◀◀ ▶ ❚❚ ■ ▶▶), then track, mode, configuration,
  // and the animation-freeze button.
  {
    // Inline SVG icons — text glyphs like ⏪ go color-emoji on Windows.
    const icon = (paths, vb) =>
      `<svg viewBox="${vb || "0 0 16 16"}" fill="currentColor" aria-hidden="true">${paths}</svg>`;
    const ICONS = {
      prev: icon('<path d="M10 2 3 8l7 6zM17 2l-7 6 7 6z"/>', "0 0 18 16"),
      play: icon('<path d="M4 2l10 6-10 6z"/>'),
      pause: icon('<path d="M4 2h3v12H4zM10 2h3v12h-3z"/>'),
      stop: icon('<path d="M3.5 3.5h9v9h-9z"/>'),
      next: icon('<path d="M1 2l7 6-7 6zM8 2l7 6-7 6z"/>', "0 0 18 16"),
      // The freeze flake: six spokes — the picture holds still.
      freeze: icon(
        '<g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none">' +
        '<path d="M8 1.5v13M2.4 4.8l11.2 6.4M2.4 11.2l11.2-6.4"/></g>'),
      // The die: five pips — the same roll as the panel's 🎲.
      dice: icon(
        '<rect x="1.7" y="1.7" width="12.6" height="12.6" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="5.2" cy="5.2" r="1.15"/><circle cx="10.8" cy="5.2" r="1.15"/>' +
        '<circle cx="8" cy="8" r="1.15"/>' +
        '<circle cx="5.2" cy="10.8" r="1.15"/><circle cx="10.8" cy="10.8" r="1.15"/>'),
      // The soft die: the same five pips under a gaussian blur — the melt
      // roll, tweening to a new random look instead of snapping.
      diceSoft: icon(
        '<defs><filter id="lum-dice-soft" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feGaussianBlur stdDeviation="0.75"/></filter></defs>' +
        '<g filter="url(#lum-dice-soft)">' +
        '<rect x="1.7" y="1.7" width="12.6" height="12.6" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="5.2" cy="5.2" r="1.15"/><circle cx="10.8" cy="5.2" r="1.15"/>' +
        '<circle cx="8" cy="8" r="1.15"/>' +
        '<circle cx="5.2" cy="10.8" r="1.15"/><circle cx="10.8" cy="10.8" r="1.15"/></g>'),
      // Frame expand/shrink: arrows out to the corners, or back in.
      expand: icon(
        '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9.6 2.4h4v4M13.6 2.4 9.4 6.6M6.4 13.6h-4v-4M2.4 13.6l4.2-4.2"/></g>'),
      shrink: icon(
        '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M13.6 6.4h-4v-4M9.6 6.4l4.2-4.2M2.4 9.6h4v4M6.4 9.6l-4.2 4.2"/></g>'),
    };
    // The wordmark's glint: a four-point light star, warm to cool.
    const LOGO =
      '<svg class="lum-player-logo" viewBox="0 0 24 24" aria-hidden="true">' +
      '<defs><linearGradient id="lum-logo-g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffd479"/><stop offset="1" stop-color="#a58bff"/>' +
      '</linearGradient></defs>' +
      '<path fill="url(#lum-logo-g)" d="M12 1.5C13 8 16 11 22.5 12 16 13 13 16 12 22.5 11 16 8 13 1.5 12 8 11 11 8 12 1.5Z"/>' +
      '<circle cx="12" cy="12" r="1.6" fill="#fff" opacity="0.9"/></svg>';

    const playerEl = document.createElement("div");
    playerEl.className = "lum-player";

    const brandEl = document.createElement("div");
    brandEl.className = "lum-player-brand";
    brandEl.innerHTML = LOGO + '<span class="lum-player-name">lumina</span>';
    playerEl.appendChild(brandEl);

    // Collapse to just the wordmark (James, 2026-07-31): ▾ folds the whole
    // transport away, leaving logo + LUMINA + ▴ to bring it back. Persisted.
    const MINI_KEY = "lumina-player-mini";
    const foldBtn = document.createElement("button");
    foldBtn.type = "button";
    foldBtn.className = "lum-player-fold";
    const setMini = (mini) => {
      playerEl.classList.toggle("lum-player--mini", mini);
      foldBtn.textContent = mini ? "▴" : "▾";
      foldBtn.title = mini ? "Expand the player" : "Collapse the player down to the wordmark";
      try { localStorage.setItem(MINI_KEY, mini ? "1" : "0"); } catch (err) { /* fine */ }
    };
    foldBtn.addEventListener("click", () => {
      setMini(!playerEl.classList.contains("lum-player--mini"));
      foldBtn.blur();
    });
    brandEl.appendChild(foldBtn);
    let startMini = false;
    try { startMini = localStorage.getItem(MINI_KEY) === "1"; } catch (err) { /* fine */ }
    setMini(startMini);

    const barEl = document.createElement("div");
    barEl.className = "lum-transport-bar";
    playerEl.appendChild(barEl);

    const btn = (ic, title, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = ICONS[ic];
      b.title = title;
      // Blur after click so Space stays the play/pause key instead of
      // re-firing whichever bar button was pressed last.
      b.addEventListener("click", (e) => { onClick(e); b.blur(); });
      barEl.appendChild(b);
      return b;
    };
    const player = (cmd) => () => host.command({ scope: "music", type: "player", cmd });

    btn("prev", "Previous track", player("prev"));
    const playBtn = btn("play", "Play", player("play"));
    const pauseBtn = btn("pause", "Pause — the field keeps whatever it's doing", player("pause"));
    btn("stop", "Stop — rewind to the top; the field goes back to your sliders", player("stop"));
    btn("next", "Next track", player("next"));

    // The track readout is a dropdown (James, 2026-07-28): switch straight to
    // any loaded track from the player.
    const trackEl = document.createElement("select");
    trackEl.className = "lum-transport-track";
    trackEl.title = "Track — pick any loaded one";
    trackEl.addEventListener("change", () =>
      host.command({ scope: "music", type: "player", cmd: "select", index: Number(trackEl.value) }));
    barEl.appendChild(trackEl);
    let trackSig = "";
    const mode = document.createElement("select");
    mode.title = "free play = the field obeys your sliders (+reactivity); claude's set = the composed light show for this track";
    [["free", "free play"], ["claude", "claude's set"], ["mine", "your set"]].forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      mode.appendChild(o);
    });
    mode.addEventListener("change", () => host.command({ scope: "music", type: "player", cmd: "dj", value: mode.value }));
    barEl.appendChild(mode);
    // Volume (James, 2026-07-31): the shared top-right speaker is hidden in
    // this world — this slider and the panel's command bar ARE the volume.
    // Both drive the shared gain through the host, so they stay in step.
    const volEl = document.createElement("input");
    volEl.type = "range";
    volEl.className = "lum-transport-vol";
    volEl.min = "0";
    volEl.max = "1000";
    volEl.step = "1";
    volEl.title = "Volume — double-click restores full";
    volEl.addEventListener("input", () =>
      host.command({ scope: "music", type: "player", cmd: "volume", value: Number(volEl.value) / 1000 }));
    volEl.addEventListener("dblclick", () =>
      host.command({ scope: "music", type: "player", cmd: "volume", value: 1 }));
    barEl.appendChild(volEl);
    // The configuration button rides after the mode switch (James,
    // 2026-07-27) — a labelled button, not a floating icon. world.js owns its
    // click behavior; we only seat it here.
    const cfg = document.getElementById("lum-tuner-toggle");
    if (cfg) barEl.appendChild(cfg);
    // Animation freeze — pauses the PICTURE, not the music (field clock stops,
    // rendering continues). Lives last, past configuration.
    const freezeBtn = btn("freeze", "Freeze the animation — the picture holds still, the music plays on", () =>
      host.command({ scope: "field", type: "freeze" }));
    // The dice, last (James, 2026-07-27): blast to a completely new look
    // without opening the config. Same roll as the panel's 🎲 — and the
    // panel's ↩ back undoes it, same as any roll.
    btn("dice", "Roll the dice — a completely new random look", () =>
      host.command({ scope: "field", type: "randomize" }));
    btn("diceSoft", "Melt roll — glide to a new random look over four seconds", () =>
      host.command({ scope: "field", type: "randomizeTween" }));
    // Expand toggle: visualization to full window, arrows flip inward, click
    // again to shrink back to the size it had before.
    const sizeBtn = btn("expand", "Expand the visualization to fill the window", () =>
      host.command({ scope: "frame", type: "expandToggle" }));
    let sizeState = false;
    document.body.appendChild(playerEl);

    host.subscribe((snap) => {
      if (!snap || !snap.music) return;
      playBtn.classList.toggle("on", !!snap.music.playing);
      pauseBtn.classList.toggle("on", !snap.music.playing && (snap.music.time || 0) > 0);
      // Sig-guarded rebuild: snapshots stream ~4 Hz while playing, and
      // rebuilding an open select's options snaps it shut (house lesson).
      const sig = snap.music.tracks.join(" ");
      if (sig !== trackSig && document.activeElement !== trackEl) {
        trackSig = sig;
        trackEl.innerHTML = "";
        snap.music.tracks.forEach((label, i) => {
          const o = document.createElement("option");
          o.value = String(i);
          o.textContent = label;
          trackEl.appendChild(o);
        });
      }
      if (document.activeElement !== trackEl) trackEl.value = String(snap.music.trackIndex);
      if (document.activeElement !== mode) mode.value = snap.music.dj;
      if (document.activeElement !== volEl && snap.music.volume !== undefined) {
        volEl.value = String(Math.round(snap.music.volume * 1000));
      }
      freezeBtn.classList.toggle("on", !!snap.frozen);
      freezeBtn.title = snap.frozen
        ? "Resume the animation"
        : "Freeze the animation — the picture holds still, the music plays on";
      const expanded = !!(snap.frame && snap.frame.expanded);
      if (expanded !== sizeState) {
        sizeState = expanded;
        sizeBtn.innerHTML = ICONS[expanded ? "shrink" : "expand"];
        sizeBtn.title = expanded
          ? "Shrink the visualization back to the size it was"
          : "Expand the visualization to fill the window";
        sizeBtn.classList.toggle("on", expanded);
      }
    });
    host.emit();

    // Keyboard (James, 2026-07-27): Space = play/pause, Z = roll the dice.
    // Skipped while a form control has focus — Space must keep activating
    // whatever button/slider/select was last clicked or tabbed to.
    window.addEventListener("keydown", (e) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(t.tagName))) return;
      if (e.code === "Space") {
        e.preventDefault(); // no page scroll
        host.command({ scope: "music", type: "player", cmd: "toggle" });
      } else if (e.code === "KeyZ") {
        host.command({ scope: "field", type: "randomize" });
      }
    });
  }
})();
