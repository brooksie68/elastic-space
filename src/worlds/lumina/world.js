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
  // The page's HOUSE DEFAULT (James, 2026-07-27; edge-to-edge 2026-07-28):
  // the 2002 animation scaled up — 16 flashing squares across, rows derived
  // from the window's aspect so the tiles stay near-square, and fill mode on
  // so the outer border reaches every screen edge (his call: "tile until it
  // fills the space", no letterbox gaps). The renderer's DEFAULTS stay
  // pork-2002-verbatim at 3×4 (sim contract); the original is still one
  // preset-menu click away ("pork 2002"). Presets remain partials over
  // DEFAULTS, not over START — a preset without rows/cols/fill still means
  // the original framed grid.
  function autoGrid() {
    const w = window.innerWidth || 1024;
    const h = window.innerHeight || 768;
    const cols = 16;
    const rows = Math.max(1, Math.min(24, Math.round(cols * (h / w))));
    return { cols, rows };
  }
  const START = Object.assign({}, DEFAULTS, autoGrid(), { fill: true });
  const MARGIN_KEYS = ["marginTop", "marginRight", "marginBottom", "marginLeft"];

  let marginLink = "linked";
  let presetSelected = "";
  let frozen = false; // animation freeze (the ❄ on the player) — transient

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

  // User presets load early: "default launch" decides the opening state.
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

  // "default launch" (James, 2026-07-28): an ordinary user preset with a
  // reserved name. If it exists, the page OPENS on it — his explicit
  // carve-out from the never-apply-on-load rule ("set as default" is a
  // deliberate designation, unlike the automatic last-session state).
  const DEFAULT_LAUNCH = "default launch";
  function defaultLaunchKey() {
    return Object.keys(userPresets).find((k) => k.toLowerCase() === DEFAULT_LAUNCH) || null;
  }

  // `state` is the authoritative CLEAN config — what the sliders say.
  let state;
  {
    const dl = defaultLaunchKey();
    if (dl) {
      state = Object.assign({}, DEFAULTS, userPresets[dl]);
      marginLink = userPresets[dl].marginLink || "linked";
      presetSelected = `u:${dl}`;
    } else {
      state = Object.assign({}, START);
    }
  }
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
    // Held punch-pad overrides — the music tick lays these over everything
    // else each frame (defined below with the pads).
    getPunch: () => punchOverrides(),
  };

  // --- staging frame size ---------------------------------------------------

  function fullWindow() {
    return { w: window.innerWidth || 1024, h: window.innerHeight || 768 };
  }

  // FIT SCREEN IS THE DEFAULT, always (James, 2026-07-31: "ninety plus percent
  // of the time I just want it to fit screen"). The page always opens at the
  // window's size and keeps tracking window resizes until a size is chosen by
  // hand this session — the old stored-size-wins behavior is gone, and frame
  // sizes no longer persist at all. "fit screen" in the panel hands the frame
  // back to auto.
  const frameSize = fullWindow();
  let frameAuto = true;
  // The player's expand toggle (2026-07-27): full-window ↔ the size it had
  // before expanding. Transient, like the freeze — manual sizing clears it.
  let frameExpanded = false;
  let preExpand = null;

  function applyFrame() {
    // --lum-dock-w/-h are set on body by the dock classes (world.css) while
    // the panel is open, so the frame shrinks out of the panel's way on
    // whichever edge it occupies.
    frame.style.width = `min(${frameSize.w}px, calc(100vw - var(--lum-dock-w, 0px)), calc((100vh - var(--lum-dock-h, 0px)) * ${frameSize.w} / ${frameSize.h}))`;
    frame.style.aspectRatio = `${frameSize.w} / ${frameSize.h}`;
  }
  applyFrame();

  function snapFrame(w, h) {
    frameSize.w = Math.min(7680, Math.max(160, Math.round(w)));
    frameSize.h = Math.min(4320, Math.max(120, Math.round(h)));
    applyFrame();
  }

  // --- field presets --------------------------------------------------------

  const FACTORY = globalThis.LUMINA_PRESETS || [];

  // --- card locks (2026-07-31) ----------------------------------------------
  // A locked card's keys survive every dice roll — both dice. Host-owned so
  // the embedded panel and the detached window agree.
  const LOCK_KEY = "lumina-locks";
  const GROUPS = (globalThis.LuminaRandom && globalThis.LuminaRandom.GROUPS) || {};
  const locks = {};
  try {
    const l = JSON.parse(localStorage.getItem(LOCK_KEY));
    if (l && typeof l === "object") {
      Object.keys(l).forEach((g) => { if (GROUPS[g]) locks[g] = true; });
    }
  } catch (err) { /* fine */ }
  function saveLocks() {
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(locks)); } catch (err) { /* fine */ }
  }
  // Strip locked groups' keys out of a rolled config.
  function unlockedOnly(rolled) {
    const out = Object.assign({}, rolled);
    Object.keys(locks).forEach((g) => {
      (GROUPS[g] || []).forEach((k) => { delete out[k]; });
    });
    return out;
  }

  // --- punch pads (2026-07-31, the perform strip) ---------------------------
  // Momentary overrides: a held pad's values ride ON TOP of state, like music
  // modulation; release restores clean. Never lands in `state`, never saved.
  // While music plays, its tick merges punchOverrides() last (music.js);
  // the direct write here covers the silent case.
  const PUNCHES = {
    blackout: { low: "#000000", high: "#000000", bg: "#000000", sceneMix: 0 },
    strobe: { waveform: "square", speed: 6, desync: 0, holdScale: 0 },
    kaleido: { fxKaleido: 0.75 },
    iris: { fxIris: 0.85 },
    warp: { fxWarp: 0.85 },
  };
  // Scene punch verbs (2026-08-03): each scene's own momentary pads, declared
  // in scenes.js DEFS — same machinery, "scn-" names keep them out of the
  // stock pads' way. The tuner only SHOWS the active scene's verbs, but the
  // overrides are scene-generic keys, so a stale hold can't strand anything.
  {
    const defs = (globalThis.LuminaScenes && globalThis.LuminaScenes.DEFS) || {};
    Object.keys(defs).forEach((s) => (defs[s].punches || []).forEach((p) => {
      PUNCHES[p.name] = p.over;
    }));
  }
  const activePunch = {};
  function punchOverrides() {
    const o = {};
    Object.keys(activePunch).forEach((n) => Object.assign(o, PUNCHES[n] || {}));
    return o;
  }
  let prevPunchKeys = [];
  function applyPunches() {
    const partial = {};
    prevPunchKeys.forEach((k) => { partial[k] = state[k]; }); // released → clean
    const o = punchOverrides();
    Object.assign(partial, o);
    prevPunchKeys = Object.keys(o);
    if (Object.keys(partial).length) field.setConfig(partial);
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

  // --- the melt roll (blurry dice, 2026-07-28) -------------------------------
  // Same roll as the dice, but numerics + colors EASE to the target over a few
  // seconds; strings/booleans/structural keys snap up front (a grid rebuild
  // can't lerp). One history entry — ↩ undoes the whole glide. Any other
  // config write cancels it mid-flight and leaves the look where it stands.
  let tweenRaf = 0;
  function cancelTween() {
    if (tweenRaf) {
      cancelAnimationFrame(tweenRaf);
      tweenRaf = 0;
      field.setConfig({ blur: state.blur }); // strip the veil (state is honest)
    }
  }

  function lerpHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sa, sb) => Math.round(sa + (sb - sa) * t);
    const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
    const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
    const bl = ch(pa & 255, pb & 255);
    return "#" + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0");
  }

  // The journey (v2, James: "take the one I have loaded and tween to the
  // next one" — v1 snapped structure at t=0, which read as an instant jump):
  // the CURRENT look stays up and melts soft over the first half (a blur
  // veil, sin-shaped), the unmorphable keys — grid, layout, scene, pattern —
  // swap at PEAK blur where nothing is legible, and the new look sharpens in
  // over the second half while numerics/colors finish their glide.
  const TWEEN_VEIL = 14; // design px of added blur at the midpoint swap
  function rollTween(ms) {
    cancelTween();
    const target = Object.assign({}, DEFAULTS, unlockedOnly(globalThis.LuminaRandom.roll()));
    // Locked keys hold their CURRENT values — not DEFAULTS.
    Object.keys(locks).forEach((g) => {
      (GROUPS[g] || []).forEach((k) => { if (k in state) target[k] = state[k]; });
    });
    pushHistory();
    presetSelected = "";
    const from = Object.assign({}, state);
    const SNAP = new Set(["rows", "cols", "nest", "syncBeats"]);
    const HEX = /^#[0-9a-f]{6}$/i;
    const snapVals = {};
    const lerpKeys = [];
    for (const k of Object.keys(target)) {
      const v = target[k];
      if (typeof v === "number" && !SNAP.has(k) && typeof from[k] === "number") lerpKeys.push(k);
      else if (typeof v === "string" && HEX.test(v) && HEX.test(String(from[k]))) lerpKeys.push(k);
      else snapVals[k] = v;
    }
    let swapped = false;
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = ease(p);
      const partial = {};
      for (const k of lerpKeys) {
        partial[k] = typeof target[k] === "number"
          ? from[k] + (target[k] - from[k]) * e
          : lerpHex(from[k], target[k], e);
      }
      if (!swapped && p >= 0.5) {
        swapped = true;
        Object.assign(partial, snapVals);
      }
      Object.assign(state, partial);
      // The veil rides on top of the lerped blur and never lands in `state`,
      // so a mid-flight cancel leaves the honest value behind.
      const shown = Object.assign({}, partial);
      const veil = Math.sin(Math.PI * p) * TWEEN_VEIL;
      shown.blur = Math.max(0, (typeof shown.blur === "number" ? shown.blur : state.blur) + veil);
      field.setConfig(shown);
      notifyBase();
      if (p < 1) {
        tweenRaf = requestAnimationFrame(step);
      } else {
        tweenRaf = 0;
        field.setConfig({ blur: state.blur }); // veil fully off
        saveConfig();
      }
    };
    tweenRaf = requestAnimationFrame(step);
  }

  function applyPreset(config) {
    cancelTween();
    pushHistory();
    marginLink = config.marginLink || "linked";
    state = Object.assign({}, DEFAULTS, config);
    field.setConfig(Object.assign({}, state));
    saveConfig();
    notifyBase();
  }

  function undoJump() {
    cancelTween();
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
    cancelTween();
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
  const modSubs = []; // live modulated values (music.js), for the panel's ghost dots
  let music = null; // registered by music.js: { command(cmd), snapshotPart() }
  let detached = false;

  // Which edge the open in-page panel docks to (James, 2026-07-27: any of the
  // four). Chosen from the dock buttons in the panel's tab bar, remembered.
  const DOCK_KEY = "lumina-dock";
  const DOCK_SIDES = ["left", "right", "top", "bottom"];
  let dockSide = "right";
  try {
    const d = localStorage.getItem(DOCK_KEY);
    if (DOCK_SIDES.includes(d)) dockSide = d;
  } catch (err) { /* fine */ }

  const channel = ("BroadcastChannel" in globalThis) ? new BroadcastChannel("lumina-ctl") : null;

  function snapshot() {
    return {
      config: Object.assign({}, state),
      marginLink,
      dock: dockSide,
      frozen,
      locks: Object.assign({}, locks),
      frame: { w: frameSize.w, h: frameSize.h, expanded: frameExpanded },
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
        applySet(cmd.key, START[cmd.key]);
        break;
      case "resetAll":
        cancelTween();
        marginLink = "linked";
        presetSelected = "";
        state = Object.assign({}, START);
        field.setConfig(Object.assign({}, state));
        Object.assign(frameSize, fullWindow());
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
      case "randomize": {
        const rolled = globalThis.LuminaRandom.roll();
        let partial;
        if (cmd.group && GROUPS[cmd.group]) {
          // Per-card dice: roll ONLY this card's keys. A locked card's own
          // dice is disabled in the panel; skip here too as a backstop.
          if (locks[cmd.group]) break;
          partial = {};
          GROUPS[cmd.group].forEach((k) => { if (k in rolled) partial[k] = rolled[k]; });
        } else {
          partial = unlockedOnly(rolled);
        }
        applyPreset(Object.assign({}, state, partial));
        presetSelected = "";
        break;
      }
      case "lockToggle":
        if (GROUPS[cmd.group]) {
          if (locks[cmd.group]) delete locks[cmd.group];
          else locks[cmd.group] = true;
          saveLocks();
        }
        break;
      case "punch": {
        // Momentary: on at pointerdown, off at release. "freeze" maps onto
        // the transient frozen flag; the rest are config overrides.
        if (cmd.name === "freeze") {
          frozen = !!cmd.on;
          field.setFrozen(frozen);
          break;
        }
        if (!PUNCHES[cmd.name]) break;
        if (cmd.on) activePunch[cmd.name] = true;
        else delete activePunch[cmd.name];
        applyPunches();
        break;
      }
      case "randomizeTween":
        rollTween(2000); // 4000 → 2000 on James's call, 2026-07-31
        break;
      case "freeze":
        // Toggle (or set) the animation freeze — transport state, not config:
        // never saved, never in presets, survives nothing.
        frozen = cmd.value !== undefined ? !!cmd.value : !frozen;
        field.setFrozen(frozen);
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
      case "presetSetDefault": {
        // Overwrite (or create) "default launch" with the current clean
        // state — the tuner confirms before sending when one already exists.
        const key = defaultLaunchKey() || DEFAULT_LAUNCH;
        userPresets[key] = Object.assign({}, state, { marginLink });
        saveUserPresets();
        presetSelected = `u:${key}`;
        break;
      }
    }
  }

  // Field-command tap (2026-07-31, the performance timeline): music.js
  // records James's live moves from here. Replays go through host.replay*
  // below, which deliberately bypass this tap — the ghost never re-records.
  const cmdTaps = [];

  function command(cmd) {
    if (cmd.scope === "field") {
      fieldCommand(cmd);
      if (cmdTaps.length) {
        const after = Object.assign({}, state);
        cmdTaps.forEach((cb) => cb(cmd, after, frozen));
      }
    }
    else if (cmd.scope === "frame") {
      if (cmd.type === "expandToggle") {
        // Flag flips BEFORE snapFrame so applyFrame persists the right size.
        if (frameExpanded && preExpand) {
          frameExpanded = false;
          snapFrame(preExpand.w, preExpand.h);
        } else {
          preExpand = { w: frameSize.w, h: frameSize.h };
          frameExpanded = true;
          snapFrame(window.innerWidth, window.innerHeight);
        }
      } else {
        // Any manual size or snap means you took control — expanded no more.
        frameExpanded = false;
        if (cmd.type === "set") { frameAuto = false; snapFrame(cmd.w, cmd.h); }
        else if (cmd.mode === "fullw") { frameAuto = false; snapFrame(window.innerWidth, window.innerWidth * (frameSize.h / frameSize.w)); }
        else { frameAuto = true; snapFrame(window.innerWidth, window.innerHeight); } // fit = back to auto
      }
    } else if (cmd.scope === "page") {
      if (cmd.type === "dock" && DOCK_SIDES.includes(cmd.value)) {
        dockSide = cmd.value;
        try { localStorage.setItem(DOCK_KEY, dockSide); } catch (err) { /* fine */ }
        syncDock();
      } else if (cmd.type === "attach" && DOCK_SIDES.includes(cmd.value)) {
        // From the detached window's dock picker: close the window and bring
        // the panel into the page, docked on the chosen edge.
        dockSide = cmd.value;
        try { localStorage.setItem(DOCK_KEY, dockSide); } catch (err) { /* fine */ }
        if (channel) channel.postMessage({ t: "close" });
        setDetached(false);
        tuner.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        syncDock();
      }
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
    // Streamed by music.js (~15 Hz while modulating): the values it is
    // actually writing to the field, so panel sliders can show where the
    // music is pushing them.
    mod(values) {
      modSubs.forEach((cb) => cb(values));
      if (channel && detached) channel.postMessage({ t: "mod", values });
    },
    registerMusic(handlers) {
      music = handlers;
    },
    // --- the performance timeline's hooks (2026-07-31) ---------------------
    // Recording: every live field command lands here with the state after it.
    onFieldCommand(cb) { cmdTaps.push(cb); },
    // Replays write the CLEAN state (they are James's real moves, played by
    // the ghost) but skip the tap, the undo stack, and the preset churn.
    replayBase(partial) {
      cancelTween();
      Object.assign(state, partial);
      field.setConfig(Object.assign({}, partial));
      notifyBase();
    },
    replayPunch(name, on) { fieldCommand({ type: "punch", name, on }); },
    replayFreeze(on) { fieldCommand({ type: "freeze", value: on }); },
    localBus() {
      return {
        send: command,
        onSnapshot: (cb) => subscribers.push(cb),
        onBeat: (cb) => beatSubs.push(cb),
        onMod: (cb) => modSubs.push(cb),
        requestSnapshot: () => emit(),
      };
    },
  };
  globalThis.LuminaHost = host;

  // Fit-screen is a living default: while no size has been chosen by hand,
  // the frame follows the window.
  window.addEventListener("resize", () => {
    if (frameAuto && !frameExpanded) {
      snapFrame(window.innerWidth, window.innerHeight);
      emit();
    }
  });

  // --- detached controller (tuner.html over BroadcastChannel) ---------------

  const toggle = document.getElementById("lum-tuner-toggle");
  const tuner = document.getElementById("lum-tuner");

  // Docked single-screen mode: the open panel docks to dockSide and the stage
  // cedes that edge (world.css body.lum-dock-* rules) so viz + controls share
  // one laptop screen (James, 2026-07-25; four-way 2026-07-27).
  function syncDock() {
    const open = !tuner.hidden;
    document.body.classList.toggle("lum-docked", open);
    DOCK_SIDES.forEach((s) => {
      document.body.classList.toggle(`lum-dock-${s}`, open && s === dockSide);
    });
  }

  function setDetached(on) {
    detached = on;
    if (on) {
      tuner.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.title = "Controls are open in their own tab — click to close them";
      // The player card folds to its wordmark whenever the configuration
      // panel opens (James, 2026-09-01: "closed and off to the left"). He
      // unfolds it himself if he wants it; closing the panel leaves it be.
      command({ scope: "music", type: "player", cmd: "mini", value: true });
    } else {
      toggle.title = "Open the configuration tab";
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

  // The controls live in the detached window BY DEFAULT (James, 2026-07-27):
  // the configuration button opens the window, and clicking it again — or
  // while the in-page panel is up — closes whichever form is showing. The
  // dock picker inside the window is the route back into the page.
  toggle.addEventListener("click", () => {
    toggle.blur(); // keep Space as the global play/pause key
    if (detached) {
      if (channel) channel.postMessage({ t: "close" });
      setDetached(false);
      emit();
      return;
    }
    if (!tuner.hidden) {
      tuner.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      syncDock();
      return;
    }
    if (channel) {
      // A plain browser TAB, not a popup (James, 2026-09-01: the popup
      // "doesn't appear the same as other windows and gets lost" — a tab he
      // can drag out and park wherever). The name reuses an already-open
      // tab. setDetached(true) follows on the tab's "hello" handshake.
      const w = window.open("./tuner.html", "lumina-tuner");
      if (w) w.focus();
    } else {
      // No BroadcastChannel (ancient browser) — fall back to the in-page panel.
      tuner.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      syncDock();
      emit();
    }
  });

  // Click anywhere off the panel to close it. pointerdown, not click: a slider
  // drag released outside the panel never counts as "away", and the toggle is
  // excluded so it doesn't close-then-reopen in one press.
  document.addEventListener("pointerdown", (e) => {
    if (tuner.hidden) return;
    if (tuner.contains(e.target) || toggle.contains(e.target)) return;
    if (e.target.closest && e.target.closest(".lum-player")) return;
    tuner.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    syncDock();
  });
})();
