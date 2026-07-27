// Lumina — page host: mounts the field + FX rack, owns the CLEAN tuner state
// (what the sliders say — the music layer modulates the live field on top of
// this and must never contaminate it), routes control commands, and serves
// state snapshots to the control surface (tuner.js) — embedded in this page
// or detached into tuner.html over BroadcastChannel("lumina-ctl").
// music.js registers its own command handler + snapshot part via
// LuminaHost.registerMusic and then mounts the tuner.
(function () {
  "use strict";

  const STORE_KEY = "lumina-tuner";
  const PRESET_KEY = "lumina-presets";
  const DEFAULTS = LuminaField.DEFAULTS;
  const PATTERNS = LuminaField.PATTERNS;
  const MARGIN_KEYS = ["marginTop", "marginRight", "marginBottom", "marginLeft"];

  let marginLink = "linked";
  let presetSelected = "";

  // The page always OPENS on pure DEFAULTS — the basic 2002 animation (James,
  // 2026-07-25). Tuning still writes to localStorage on every change, but the
  // stored state is only reachable as the "last session" entry in the preset
  // menu — never applied silently on load.
  function loadLast() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!stored) return null;
      // radiusTile changed meaning 2026-07-23 (px → fraction of tile size);
      // anything above 0.5 can only be an old px value.
      if (stored.radiusTile > 0.5) stored.radiusTile = Math.min(0.5, stored.radiusTile / 32);
      return stored;
    } catch (err) {
      return null;
    }
  }
  let hasLast = !!loadLast();

  function saveConfig() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign({}, state, { marginLink })));
      hasLast = true;
    } catch (err) {
      /* storage unavailable (private mode etc.) — tuning just won't persist */
    }
  }

  // `state` is the authoritative CLEAN config — what the sliders say.
  let state = Object.assign({}, DEFAULTS);
  const frame = document.getElementById("lumina-frame");
  const field = LuminaField.mount(frame, Object.assign({}, state));
  if (globalThis.LuminaFX) LuminaFX.attach(field, frame);

  // Bridge for the music layer: read the clean base, hear about tuner changes.
  const baseListeners = [];
  function notifyBase() {
    baseListeners.forEach((cb) => cb());
  }
  globalThis.luminaTuner = {
    getBase: () => Object.assign({}, state),
    onBaseChange: (cb) => baseListeners.push(cb),
  };

  // --- staging frame size ---------------------------------------------------

  const FRAME_KEY = "lumina-frame";
  const FRAME_DEFAULTS = { w: 1024, h: 768 };

  function loadFrame() {
    try {
      return Object.assign({}, FRAME_DEFAULTS, JSON.parse(localStorage.getItem(FRAME_KEY)) || {});
    } catch (err) {
      return Object.assign({}, FRAME_DEFAULTS);
    }
  }
  const frameSize = loadFrame();

  function applyFrame() {
    frame.style.width = `min(${frameSize.w}px, 100vw, calc(100vh * ${frameSize.w} / ${frameSize.h}))`;
    frame.style.aspectRatio = `${frameSize.w} / ${frameSize.h}`;
    try {
      localStorage.setItem(FRAME_KEY, JSON.stringify(frameSize));
    } catch (err) { /* no persistence, still applies */ }
  }
  applyFrame();

  function snapFrame(w, h) {
    frameSize.w = Math.min(7680, Math.max(160, Math.round(w)));
    frameSize.h = Math.min(4320, Math.max(120, Math.round(h)));
    applyFrame();
  }

  // --- field presets --------------------------------------------------------

  const FACTORY = globalThis.LUMINA_PRESETS || [];

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

  // --- jump history (the back button next to the dice) ------------------------
  // Only WHOLE-LOOK jumps are recorded — a dice roll or a preset load. Slider
  // drags are not: during live play the stack would fill with a hundred
  // micro-steps and "back" would stop meaning "undo that roll", which is the
  // one thing it's for.
  const HISTORY_MAX = 30;
  const history = [];

  function pushHistory() {
    history.push({ state: Object.assign({}, state), marginLink, presetSelected });
    if (history.length > HISTORY_MAX) history.shift();
  }

  function applyPreset(config) {
    pushHistory();
    marginLink = config.marginLink || "linked";
    state = Object.assign({}, DEFAULTS, config);
    field.setConfig(Object.assign({}, state));
    saveConfig();
    notifyBase();
  }

  function undoJump() {
    const prev = history.pop();
    if (!prev) return;
    marginLink = prev.marginLink;
    state = Object.assign({}, prev.state);
    presetSelected = prev.presetSelected;
    field.setConfig(Object.assign({}, state));
    saveConfig();
    notifyBase();
  }

  // Which margins move together when one slider moves, per the link mode.
  function marginGroup(key) {
    if (marginLink === "linked") return MARGIN_KEYS;
    if (marginLink === "mirrored") {
      return key === "marginTop" || key === "marginBottom"
        ? ["marginTop", "marginBottom"]
        : ["marginLeft", "marginRight"];
    }
    return [key];
  }

  function applySet(key, value) {
    const partial = {};
    const keys = MARGIN_KEYS.includes(key) ? marginGroup(key) : [key];
    keys.forEach((k) => { partial[k] = value; });
    Object.assign(state, partial);
    field.setConfig(partial);
    presetSelected = ""; // any hand tweak means we're off-preset
    saveConfig();
    notifyBase();
  }

  // --- the host -------------------------------------------------------------

  const subscribers = [];
  const beatSubs = [];
  let music = null; // registered by music.js: { command(cmd), snapshotPart() }
  let detached = false;

  const channel = ("BroadcastChannel" in globalThis) ? new BroadcastChannel("lumina-ctl") : null;

  function snapshot() {
    return {
      config: Object.assign({}, state),
      marginLink,
      frame: { w: frameSize.w, h: frameSize.h },
      fieldPresets: {
        factory: FACTORY.map((p) => ({ id: p.id, label: p.label })),
        user: Object.keys(userPresets).sort((a, b) => a.localeCompare(b)),
        selected: presetSelected,
        hasLast,
        canUndo: history.length > 0,
      },
      music: music ? music.snapshotPart() : null,
    };
  }

  function emit() {
    const snap = snapshot();
    subscribers.forEach((cb) => cb(snap));
    if (channel && detached) channel.postMessage({ t: "snap", snap });
  }

  function fieldCommand(cmd) {
    switch (cmd.type) {
      case "set":
        applySet(cmd.key, cmd.value);
        break;
      case "reset":
        applySet(cmd.key, DEFAULTS[cmd.key]);
        break;
      case "resetAll":
        marginLink = "linked";
        presetSelected = "";
        state = Object.assign({}, DEFAULTS);
        field.setConfig(Object.assign({}, state));
        Object.assign(frameSize, FRAME_DEFAULTS);
        applyFrame();
        saveConfig();
        notifyBase();
        break;
      case "marginMode": {
        marginLink = cmd.value;
        // Linking snaps values together immediately so the mode is never lying.
        if (marginLink === "linked") {
          applySet("marginTop", state.marginTop);
        } else if (marginLink === "mirrored") {
          const partial = { marginBottom: state.marginTop, marginRight: state.marginLeft };
          Object.assign(state, partial);
          field.setConfig(partial);
          saveConfig();
          notifyBase();
        } else {
          saveConfig();
        }
        break;
      }
      case "randomize":
        applyPreset(globalThis.LuminaRandom.roll());
        presetSelected = "";
        break;
      case "undo":
        undoJump();
        break;
      case "patternStep": {
        const i = PATTERNS.findIndex((p) => p.id === state.pattern);
        const next = PATTERNS[(i + cmd.dir + PATTERNS.length) % PATTERNS.length];
        applySet("pattern", next.id);
        break;
      }
      case "preset": {
        const v = cmd.value;
        if (v.startsWith("f:")) {
          const p = FACTORY.find((f) => f.id === v.slice(2));
          if (p) { applyPreset(p.config); presetSelected = v; }
        } else if (v.startsWith("u:") && userPresets[v.slice(2)]) {
          applyPreset(userPresets[v.slice(2)]);
          presetSelected = v;
        } else if (v === "last") {
          const stored = loadLast();
          if (stored) { applyPreset(stored); presetSelected = "last"; }
        }
        break;
      }
      case "presetSave": {
        if (FACTORY.some((p) => p.label.toLowerCase() === cmd.name.toLowerCase())) break;
        userPresets[cmd.name] = Object.assign({}, state, { marginLink });
        saveUserPresets();
        presetSelected = `u:${cmd.name}`;
        break;
      }
      case "presetDelete":
        delete userPresets[cmd.name];
        saveUserPresets();
        presetSelected = "";
        break;
    }
  }

  function command(cmd) {
    if (cmd.scope === "field") fieldCommand(cmd);
    else if (cmd.scope === "frame") {
      if (cmd.type === "set") snapFrame(cmd.w, cmd.h);
      else if (cmd.mode === "fullw") snapFrame(window.innerWidth, window.innerWidth * (frameSize.h / frameSize.w));
      else snapFrame(window.innerWidth, window.innerHeight);
    } else if (cmd.scope === "music" && music) {
      music.command(cmd);
    }
    emit();
  }

  const host = {
    command,
    snapshot,
    subscribe: (cb) => subscribers.push(cb),
    beatSubscribe: (cb) => beatSubs.push(cb),
    emit,
    beat() {
      beatSubs.forEach((cb) => cb());
      if (channel && detached) channel.postMessage({ t: "beat" });
    },
    registerMusic(handlers) {
      music = handlers;
    },
    localBus() {
      return {
        send: command,
        onSnapshot: (cb) => subscribers.push(cb),
        onBeat: (cb) => beatSubs.push(cb),
        requestSnapshot: () => emit(),
      };
    },
  };
  globalThis.LuminaHost = host;

  // --- detached controller (tuner.html over BroadcastChannel) ---------------

  const toggle = document.getElementById("lum-tuner-toggle");
  const tuner = document.getElementById("lum-tuner");

  // Docked single-screen mode: the open panel docks right and the stage
  // shifts left (world.css body.lum-docked rules) so viz + controls share
  // one laptop screen (James, 2026-07-25).
  function syncDock() {
    document.body.classList.toggle("lum-docked", !tuner.hidden);
  }

  function setDetached(on) {
    detached = on;
    if (on) {
      tuner.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.title = "Controls are in their own window — click to bring them back here";
    } else {
      toggle.title = "Tune the field";
    }
    syncDock();
  }

  if (channel) {
    channel.onmessage = (event) => {
      const m = event.data;
      if (!m) return;
      if (m.t === "hello") {
        setDetached(true);
        channel.postMessage({ t: "snap", snap: snapshot() });
      } else if (m.t === "cmd") {
        command(m.cmd);
      } else if (m.t === "bye") {
        setDetached(false);
      }
    };
  }

  // Console access for poking at it live.
  globalThis.luminaField = field;

  toggle.addEventListener("click", () => {
    if (detached) {
      if (channel) channel.postMessage({ t: "close" });
      setDetached(false);
      tuner.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      syncDock();
      emit();
      return;
    }
    const open = tuner.hidden;
    tuner.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    syncDock();
  });

  // Click anywhere off the panel to close it. pointerdown, not click: a slider
  // drag released outside the panel never counts as "away", and the toggle is
  // excluded so it doesn't close-then-reopen in one press.
  document.addEventListener("pointerdown", (e) => {
    if (tuner.hidden) return;
    if (tuner.contains(e.target) || toggle.contains(e.target)) return;
    if (e.target.closest && e.target.closest(".lum-transport-bar")) return;
    tuner.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    syncDock();
  });
})();
