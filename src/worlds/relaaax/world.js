// Relaaax — page host: mounts the field + FX rack, owns the CLEAN tuner state
// (what the sliders say — the music layer modulates the live field on top of
// this and must never contaminate it), routes control commands, and serves
// state snapshots to the control surface (tuner.js) — embedded in this page
// or detached into tuner.html over BroadcastChannel("relaaax-ctl").
// music.js registers its own command handler + snapshot part via
// RelaaaxHost.registerMusic and then mounts the tuner.
(function () {
  "use strict";

  const STORE_KEY = "relaaax-tuner";
  const PRESET_KEY = "relaaax-presets";
  const DEFAULTS = RelaaaxField.DEFAULTS;
  const PATTERNS = RelaaaxField.PATTERNS;
  const MARGIN_KEYS = ["marginTop", "marginRight", "marginBottom", "marginLeft"];

  let marginLink = "linked";
  let presetSelected = "";

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      const stored = JSON.parse(raw);
      if (stored.marginLink) marginLink = stored.marginLink;
      // radiusTile changed meaning 2026-07-23 (px → fraction of tile size);
      // anything above 0.5 can only be an old px value.
      if (stored.radiusTile > 0.5) stored.radiusTile = Math.min(0.5, stored.radiusTile / 32);
      return Object.assign({}, DEFAULTS, stored);
    } catch (err) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign({}, state, { marginLink })));
    } catch (err) {
      /* storage unavailable (private mode etc.) — tuning just won't persist */
    }
  }

  // `state` is the authoritative CLEAN config — what the sliders say.
  let state = loadConfig();
  const frame = document.getElementById("relaaax-frame");
  const field = RelaaaxField.mount(frame, Object.assign({}, state));
  if (globalThis.RelaaaxFX) RelaaaxFX.attach(field, frame);

  // Bridge for the music layer: read the clean base, hear about tuner changes.
  const baseListeners = [];
  function notifyBase() {
    baseListeners.forEach((cb) => cb());
  }
  globalThis.relaaaxTuner = {
    getBase: () => Object.assign({}, state),
    onBaseChange: (cb) => baseListeners.push(cb),
  };

  // --- staging frame size ---------------------------------------------------

  const FRAME_KEY = "relaaax-frame";
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

  const FACTORY = globalThis.RELAAAX_PRESETS || [];

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

  function applyPreset(config) {
    marginLink = config.marginLink || "linked";
    state = Object.assign({}, DEFAULTS, config);
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

  const channel = ("BroadcastChannel" in globalThis) ? new BroadcastChannel("relaaax-ctl") : null;

  function snapshot() {
    return {
      config: Object.assign({}, state),
      marginLink,
      frame: { w: frameSize.w, h: frameSize.h },
      fieldPresets: {
        factory: FACTORY.map((p) => ({ id: p.id, label: p.label })),
        user: Object.keys(userPresets).sort((a, b) => a.localeCompare(b)),
        selected: presetSelected,
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
  globalThis.RelaaaxHost = host;

  // --- detached controller (tuner.html over BroadcastChannel) ---------------

  const toggle = document.getElementById("rlx-tuner-toggle");
  const tuner = document.getElementById("rlx-tuner");

  function setDetached(on) {
    detached = on;
    if (on) {
      tuner.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.title = "Controls are in their own window — click to bring them back here";
    } else {
      toggle.title = "Tune the field";
    }
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
  globalThis.relaaaxField = field;

  toggle.addEventListener("click", () => {
    if (detached) {
      if (channel) channel.postMessage({ t: "close" });
      setDetached(false);
      tuner.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      emit();
      return;
    }
    const open = tuner.hidden;
    tuner.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Click anywhere off the panel to close it. pointerdown, not click: a slider
  // drag released outside the panel never counts as "away", and the toggle is
  // excluded so it doesn't close-then-reopen in one press.
  document.addEventListener("pointerdown", (e) => {
    if (tuner.hidden) return;
    if (tuner.contains(e.target) || toggle.contains(e.target)) return;
    tuner.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  });
})();
