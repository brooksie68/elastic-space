// The Orb Dimension
//
// An endless black volume — cave-black, not monitor-black: miles across,
// dimly lit by an ambient source nobody can find. Dozens (up to hundreds)
// of glowing glass orbs drift through it, and you can fly.
//
// Renderer: raw WebGL2, one instanced draw of billboard quads. Each orb
// samples a Blender-rendered translucent shell (assets/orbs/*.png, four
// variants in a texture array); the light is two crossfading color layers
// composited BEHIND the glass in the fragment shader, plus a halo lighting
// the air. Spheres are the one shape a billboard renders honestly, which is
// what makes flying through Blender sprites work.
//
// Flight is deliberately gentle (James): damped acceleration, smoothed look,
// A/D banking that persists (NMS-style), no shake. Orb positions are stored normalized so the
// tuner's spread sliders stretch the volume live, mid-flight.
//
// Drift exits: pale white pulsing orbs. Clicking one triggers the hidden
// data-drift anchors in index.html (which stay keyboard-focusable).

(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());

  // ---- tuner config ----------------------------------------------------------

  const STORE_KEY = "elastic-orb-dimension-tuner-v1";
  // v49 "the big dimension": the FLYABLE space is 1,000 × 1,000 × 250 km
  // (half-extents below — still static, still not tunable; James: geography
  // finalizes and freezes). The POPULATED CORE — the skull, the station
  // grid, the field, the Lantern — keeps its v38 size (CORE_*): the world
  // got vastly bigger, home didn't. The reef colonies moved OUT to a ring
  // (colonyLayout below); everything between is the gulf.
  const SPACE_X = 500000, SPACE_Z = 500000, SPACE_Y = 125000;
  const CORE_X = 24000, CORE_Z = 24000, CORE_Y = 6000;
  const DEFAULTS = {
    count: 400, // v38: denser defaults for the big static space
    dust: 2200,
    spreadX: CORE_X,
    spreadZ: CORE_Z,
    spreadY: CORE_Y,
    // v49 configuration — the physics/feel knobs (James's running tally: top
    // speed and tank length are the key ones). The flat ladder: impulse /
    // booster / overdrive each carry a TOP SPEED (never a sum), a tank in
    // seconds of burn, and a 0-to-full spool time. expansion-spec.md is
    // the contract: 240 / 1,200 (240s, 5s) / 3,600 (360s, 3s).
    impTop: 200, // v60: 240 → 200 (James)
    rcsTop: 120, // v60 attitude jets: R/F up-down, Q/E left-right (m/s, free)
    boostTop: 1200,
    overTop: 3600,
    h2oTank: 240,
    deuTank: 360,
    boostSpool: 5,
    overSpool: 3,
    // v49 the ring — colony layout dials (tunable during the shaping phase,
    // then these freeze with the geography, v38-style). Distance/height in
    // km; jitter 0..1 scatters the perfect polygon organic.
    colonyDist: 250,
    colonyVert: 0,
    colonyJitter: 0.5,
    // v50 the societies — the Cadence + the Saelyri. Satellite distance is
    // NOT a dial: it derives from colonyDist/2 (James's hexagram spec), so
    // the six-pointed star survives any ring tuning. Scale/height/jitter
    // ride sliders during the shaping phase, then freeze with the geography;
    // nodeGlow and pulseTempo are permanent feel knobs.
    commVert: 0,
    commJitter: 0.5,
    commScale: 8,
    commSat: 0.66,
    nodeGlow: 1,
    pulseTempo: 1,
    // v56 Phase B1 → v61 THE CROWDS (James after B1: "teensy and sparse";
    // his numbers: ~600 per town, 1,000 at the capital): saeCap / saeSat =
    // beings per town; saeGroup scales group sizes; saeKnot = the share of
    // the population living in groups (the rest are solos); saeStream
    // scales the river share of groups; saeTide multiplies the assemble /
    // disperse clock; saeCloud = the crowd-cloud strength (the far read).
    // citizens = Cadence per caste at the capital (satellites 2/3) — v61
    // bumped 9 → 12, robots stay at work sites, not in crowds. All
    // closed-form seeded — thousands cost trig; the GPU pays only for
    // what's near (kind 65/66 in the FS).
    saeCap: 1000,
    saeSat: 600,
    saeGroup: 1,
    saeKnot: 0.85,
    saeStream: 1,
    saeForm: 1, // v64.5 the formation share (James: rings everywhere, one formation in five minutes)
    wear: 0.8, // v66 the material pass: how battle-scarred the metal reads (0 clean … 1 full)
    saeTide: 1,
    citizens: 12,
    // acknowledgment reach in meters — beings notice the pod inside this,
    // full greeting at 37.5% of it (10m beings: 400 → greet at 150)
    saeNotice: 400,
    // v58: neon strength on the buildings' windows (hue-exact core lift + saturated halo)
    bldgGlow: 1.0,
    bldgFarBlur: 0, // v75.1: the BUILDINGS' blur — 0 = sharp, no twinkle (James: "zero for both is the best setting")
    trafSpeed: 0.65, // v72: one speed knob over every packet (struts, bridges, feeds); v75.2: James's number
    trafAmt: 0.65, // v72: how many packets — a chain keeps its spacing pattern with fewer beads; v75.2: James's number
    stnLights: 1, // v73: the station's window count (map + shader cells); towers unaffected
    stnFarBlur: 0, // v75: the STATION's blur (map halos, shader cells, packets). 0 = the look James froze 2026-09-06 — never change its default
    // v53 the nebulae — glow is the permanent feel knob; density rebuilds.
    // v54: scale too (James: "they seem kinda small for the space").
    nebGlow: 1,
    nebDensity: 1,
    nebScale: 1.6,
    homeSeed: 0, // v62: rotates which field-home roll each shell gets (0–5)
    heartOp: 0.3, // v62.1: opacity of the Saelyri heart balls (James: "reduce considerably")
    sphere: 1, // v63: 1 = real balls, 0 = the pre-v63 discs
    ballRim: 0.12, // v64.1 down from 0.25 (the water read as a button under a white ring); v63.3: how much edge a ball shows — the atlas ring + fresnel (James: dark orbs want almost none)
    homeBlur: 0.7, // v62.2: the field homes' glow pass — 0 sharp, 1 all haze
    sizeMin: 18,
    sizeMax: 70,
    shellOp: 1,
    glow: 1,
    haze: 1,
    // v55 distance vibe (James: "clear as day at 86km"): aerial = how fast
    // distance desaturates + cools structure color; melt = how eagerly
    // subpixel detail (crust windows, data dashes) dissolves into aggregate
    // glow. Both 0 = the old always-crisp look.
    aerial: 1,
    melt: 1,
    fadeSpeed: 1,
    grouping: "scatter",
    // v48 drag-stick steering: press plants a virtual joystick, offset
    // commands a turn RATE. Deadzone / reach in CSS px, rates in deg/s
    // (yaw 42 ≈ the arrows' 0.7 rad/s; pitch ~70% — kinder to the stomach),
    // curve is the response exponent between deadzone and rim.
    // v48.2 (James, after flying v48): the stick is PINNED to the center
    // reticle — hold and pull away from it; the press must start near the
    // reticle to count as a grab. "drag" (press plants the stick anywhere)
    // survives as the tuner alternative. stickModeV 0 in DEFAULTS is the
    // migration trigger — see sanitizeCfg().
    stickMode: "center",
    stickModeV: 0,
    stickDead: 14,
    stickReach: 260,
    stickYawMax: 31,  // v60: +10% (James, after trying 2×); v48.5 was 28
    stickPitchMax: 22, // stays ~70% of yaw (v60 +10%)
    rollMax: 32, // v60 +10%; v57.2 put A/D roll on a dial (29 = the old 0.51 rad/s)
    stickCurve: 1.7,
    stickPull: 2.0, // v60: hard pull — rate multiplier reached at 2× reach
    // v54.2: the grab circle is its own dial — 3× the old reach/2 (James:
    // only-inside-the-reticle made the nose hard to grab). The ghost ring
    // below marks the edge while he tunes it.
    stickGrab: 390,
    // v54.3: a captured spawn pose (TUNE → capture spawn) — null = the
    // stock station-approach spawn. { pos, f, u } in world meters; part
    // of the preset snapshot so "set as start" carries it.
    spawnPose: null,
  };
  // pool: slider adds/removes orbs incrementally — NEVER re-rolls the field
  const SLIDERS = [
    { key: "count", label: "orbs", min: 12, max: 1200, step: 1, pool: true },
    { key: "dust", label: "dust", min: 0, max: 2500, step: 50, pool: true },
    { key: "sizeMin", label: "size min", min: 5, max: 120, step: 1 },
    { key: "sizeMax", label: "size max", min: 20, max: 300, step: 1 },
    { key: "shellOp", label: "glass", min: 0.2, max: 1.5, step: 0.05 },
    { key: "glow", label: "glow", min: 0, max: 2, step: 0.05 },
    { key: "haze", label: "haze", min: 0, max: 3, step: 0.05 },
    { key: "aerial", label: "aerial haze", min: 0, max: 3, step: 0.05 },
    { key: "melt", label: "detail melt", min: 0, max: 2, step: 0.05 },
    { key: "fadeSpeed", label: "color fade", min: 0.2, max: 4, step: 0.1 },
    { key: "stickDead", label: "dead zone", min: 0, max: 60, step: 1 },
    { key: "stickReach", label: "reach", min: 80, max: 600, step: 5 },
    { key: "stickGrab", label: "grab radius", min: 60, max: 800, step: 5 },
    { key: "stickYawMax", label: "yaw °/s", min: 10, max: 120, step: 1 },
    { key: "stickPitchMax", label: "pitch °/s", min: 6, max: 120, step: 1 },
    { key: "rollMax", label: "roll °/s", min: 6, max: 120, step: 1 },
    { key: "stickCurve", label: "response", min: 1, max: 3, step: 0.05 },
    { key: "stickPull", label: "hard pull ×", min: 1, max: 4, step: 0.1 },
    // v49 configuration (drive) + the ring. layout: true = rebuilds colonies,
    // stations and actors on release (change), not per-tick (input).
    { key: "impTop", label: "impulse m/s", min: 60, max: 720, step: 10 },
    { key: "rcsTop", label: "jets m/s", min: 20, max: 480, step: 10 },
    { key: "boostTop", label: "booster m/s", min: 300, max: 3000, step: 25 },
    { key: "overTop", label: "overdrive m/s", min: 1200, max: 9000, step: 100 },
    { key: "h2oTank", label: "H2O tank s", min: 60, max: 600, step: 10 },
    { key: "deuTank", label: "DEU tank s", min: 60, max: 900, step: 10 },
    { key: "boostSpool", label: "boost spool s", min: 1, max: 15, step: 0.5 },
    { key: "overSpool", label: "over spool s", min: 0.5, max: 10, step: 0.25 },
    { key: "colonyDist", label: "ring dist km", min: 60, max: 450, step: 5, layout: true },
    { key: "colonyVert", label: "ring height km", min: -80, max: 80, step: 2, layout: true },
    { key: "colonyJitter", label: "ring jitter", min: 0, max: 1, step: 0.05, layout: true },
    { key: "commScale", label: "capital size km", min: 3, max: 14, step: 0.5, layout: true },
    { key: "commSat", label: "satellite scale", min: 0.3, max: 1, step: 0.02, layout: true },
    { key: "commVert", label: "societies height km", min: -60, max: 60, step: 2, layout: true },
    { key: "commJitter", label: "societies jitter", min: 0, max: 1, step: 0.05, layout: true },
    { key: "nodeGlow", label: "node glow", min: 0, max: 2, step: 0.05 },
    { key: "pulseTempo", label: "pulse tempo", min: 0.2, max: 3, step: 0.05 },
    // v61 the crowds — pops and group rolls rebuild the layout; tide and
    // cloud are live feel knobs. Ceilings are what society-sim proves.
    { key: "saeCap", label: "capital beings", min: 0, max: 1500, step: 50, layout: true },
    { key: "saeSat", label: "town beings", min: 0, max: 900, step: 50, layout: true },
    { key: "saeGroup", label: "group size ×", min: 0.5, max: 2.5, step: 0.1, layout: true },
    { key: "saeKnot", label: "in groups", min: 0, max: 1, step: 0.05, layout: true },
    { key: "saeStream", label: "streams ×", min: 0, max: 2, step: 0.1, layout: true },
    { key: "saeForm", label: "formations ×", min: 0, max: 3, step: 0.1, layout: true },
    { key: "saeTide", label: "tide speed ×", min: 0.25, max: 3, step: 0.05 },
    { key: "citizens", label: "citizens/caste", min: 0, max: 20, step: 1, layout: true },
    { key: "saeNotice", label: "greet range m", min: 100, max: 1500, step: 25 },
    { key: "bldgGlow", label: "building glow", min: 0, max: 3, step: 0.1 },
    { key: "bldgFarBlur", label: "far window blur", min: 0, max: 9, step: 0.5 },
    { key: "stnFarBlur", label: "far window blur station lights", min: 0, max: 9, step: 0.5 },
    { key: "trafSpeed", label: "traffic speed ×", min: 0.25, max: 3, step: 0.05 },
    { key: "trafAmt", label: "traffic amount", min: 0.1, max: 1, step: 0.05 },
    { key: "stnLights", label: "station lights", min: 0, max: 2, step: 0.1 },
    { key: "nebGlow", label: "nebula glow", min: 0, max: 2, step: 0.05 },
    // density's ceiling is 1.2 because nebula-sim bars interior overdraw at
    // the SLIDER MAX, not just the default — the tuner can't outrun the GPU
    { key: "nebDensity", label: "nebula density", min: 0.3, max: 1.2, step: 0.05, layout: true },
    // scale's ceiling is sim-derived (nebula-sim TEST 10): at 2.0 the banks
    // still clear the spawn, the approach line, and the satellite towns —
    // beyond that they merge into soup and lose their one-palette identities
    { key: "nebScale", label: "nebula size", min: 0.5, max: 2, step: 0.05, layout: true },
    // v62 the field homes: six baked rolls; the dial re-deals them across the shells
    { key: "homeSeed", label: "home roll", min: 0, max: 5, step: 1, homes: true },
    { key: "heartOp", label: "heart ball opacity", min: 0, max: 1, step: 0.05 },
    // v63: every orb is a real ball (per-pixel sphere hit, depth, key light,
    // refracted interiors); the dial fades the old camera-facing disc back in
    { key: "sphere", label: "real spheres", min: 0, max: 1, step: 0.05 },
    { key: "ballRim", label: "ball edge", min: 0, max: 1, step: 0.05 },
    { key: "homeBlur", label: "home glow blur", min: 0, max: 1, step: 0.05 },
  ];
  const cfg = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    for (const k in DEFAULTS) if (k in saved) cfg[k] = saved[k];
  } catch {}
  // saved values from older builds may be out of range (e.g. fly speed 1500)
  function sanitizeCfg() {
    for (const s of SLIDERS) {
      cfg[s.key] = clamp(Number(cfg[s.key]) || DEFAULTS[s.key], s.min, s.max);
    }
    // the space is not tunable (v38, reaffirmed v49) — saved cfgs and old
    // presets may still carry spread values; they lose. The spreads are the
    // CORE size now: the flyable SPACE_* bounds are constants, not cfg.
    cfg.spreadX = CORE_X;
    cfg.spreadZ = CORE_Z;
    cfg.spreadY = CORE_Y;
    if (!["scatter", "clusters", "strata", "river"].includes(cfg.grouping)) {
      cfg.grouping = "scatter";
    }
    if (!["drag", "center"].includes(cfg.stickMode)) cfg.stickMode = "center";
    // v54.3: the captured spawn — pos must be finite and inside the flyable
    // space, basis vectors finite; anything off falls back to stock.
    const sp = cfg.spawnPose;
    const fin3 = (a) => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
    if (sp && fin3(sp.pos) && fin3(sp.f) && fin3(sp.u)) {
      sp.pos = [
        clamp(sp.pos[0], -SPACE_X, SPACE_X),
        clamp(sp.pos[1], -SPACE_Y, SPACE_Y),
        clamp(sp.pos[2], -SPACE_Z, SPACE_Z),
      ];
    } else {
      cfg.spawnPose = null;
    }
    // stick migrations — one per feel decision James made by voice. Each
    // runs once against older saved cfgs; after any save the version is
    // persisted and his tuner choices rule from then on.
    const stickV = Number(cfg.stickModeV) || 0;
    if (stickV < 2) cfg.stickMode = "center"; // v48.2: pinned to the reticle
    if (stickV < 3) { // v48.5: "I should turn slower"
      cfg.stickYawMax = DEFAULTS.stickYawMax;
      cfg.stickPitchMax = DEFAULTS.stickPitchMax;
    }
    if (stickV < 4) { // v60: +10% turn rates
      cfg.stickYawMax = DEFAULTS.stickYawMax;
      cfg.stickPitchMax = DEFAULTS.stickPitchMax;
      cfg.rollMax = DEFAULTS.rollMax;
    }
    cfg.stickModeV = 4;
  }
  sanitizeCfg();

  // named presets, kept apart from the live cfg. One can be marked as the
  // start preset — it wins on load, so the world always opens the way James
  // set it. "copy settings" puts the live values on the clipboard for chat.
  const PRESET_KEY = "elastic-orb-dimension-presets-v1";
  let presetStore = { presets: {}, default: null };
  try {
    const raw = JSON.parse(localStorage.getItem(PRESET_KEY) || "{}");
    if (raw && raw.presets && typeof raw.presets === "object") {
      presetStore = { presets: raw.presets, default: raw.default || null };
    }
  } catch {}
  // v49.4: when served, the preset FILE is the source of truth —
  // assets/presets.json via the dev server — so saving a named preset is
  // already "telling Claude". localStorage stays as the boot cache and the
  // file:// fallback; every change mirrors to both. A change to the file's
  // start preset applies on the next reload, never mid-flight.
  const PRESET_API = "/api/worlds/orb-dimension/presets";
  let onPresetStoreReplaced = null; // the tuner hooks its picker refresh here
  let lateApplyStart = null; // the tuner hooks the late start-preset apply here (v54.3)
  function pushPresetFile() {
    // v72: resolves true when the file took the write, false when it did not
    // (file:// or server down — localStorage still has it, but the file's start
    // preset wins on the next reload, so the tuner tells James)
    return fetch(PRESET_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presetStore),
    }).then((r) => r.ok).catch(() => false);
  }
  function savePresetStore() {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(presetStore));
    } catch {}
    return pushPresetFile();
  }
  // v54.3: the API route only exists on the dev server — on a public
  // static host, fall back to the committed file itself, so a visitor
  // gets James's start preset, not factory defaults. file:// rejects
  // both fetches → localStorage rules, as before.
  fetch(PRESET_API)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .catch(() => fetch("assets/presets.json").then((r) => (r.ok ? r.json() : Promise.reject())))
    .then((file) => {
      if (!file || typeof file.presets !== "object" || file.presets === null) return;
      const fileEmpty = Object.keys(file.presets).length === 0;
      if (fileEmpty && Object.keys(presetStore.presets).length > 0) {
        pushPresetFile(); // fresh file, presets in this browser: seed it
        return;
      }
      presetStore = { presets: file.presets, default: file.default || null };
      try {
        localStorage.setItem(PRESET_KEY, JSON.stringify(presetStore));
      } catch {}
      if (onPresetStoreReplaced) onPresetStoreReplaced();
      // v54.3: a fresh browser booted on defaults before the file arrived —
      // if the file's start preset differs from what boot applied, apply it
      // now (the tuner assigns the hook; it relayouts + repaints).
      const start = presetStore.default && presetStore.presets[presetStore.default];
      if (start && JSON.stringify(start) !== bootStartSnap && lateApplyStart) {
        lateApplyStart(start);
      }
    })
    .catch(() => {}); // file:// — localStorage rules
  function cfgSnapshot() {
    const snap = { grouping: cfg.grouping, stickMode: cfg.stickMode };
    for (const s of SLIDERS) snap[s.key] = cfg[s.key];
    if (cfg.spawnPose) {
      snap.spawnPose = {
        pos: cfg.spawnPose.pos.slice(),
        f: cfg.spawnPose.f.slice(),
        u: cfg.spawnPose.u.slice(),
      };
    }
    return snap;
  }
  let bootStartSnap = null; // what boot applied — the late fetch compares against it
  if (presetStore.default && presetStore.presets[presetStore.default]) {
    bootStartSnap = JSON.stringify(presetStore.presets[presetStore.default]);
    cfg.spawnPose = null; // presets without a pose mean stock spawn
    Object.assign(cfg, presetStore.presets[presetStore.default]);
    sanitizeCfg();
  }
  function saveCfg() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
    } catch {}
  }

  // ---- DOM -------------------------------------------------------------------

  const field = document.getElementById("field");
  const canvas = document.createElement("canvas");
  canvas.id = "space";
  // inline belt-and-suspenders: even if world.css ever fails to arrive, the
  // canvas still fills the window on a dark page instead of sitting 300x150
  // in the corner of a white one
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;display:block";
  document.body.style.background = "#020305";
  document.body.insertBefore(canvas, field);

  const hint = document.createElement("p");
  hint.id = "flight-hint";
  hint.textContent =
    "W / S impulse · R / F rise / sink · Q / E slide · right-drag looks around · A / D roll · caps lock levels · shift = booster · space = overdrive · drag = stick (park it, the turn holds) · X stops · H home · CTRL on the console lists everything · v64.4";
  document.body.appendChild(hint);
  setTimeout(() => hint.classList.add("faded"), 14000);

  // a soft dot at the screen edge pointing at the heart whenever it's out of
  // view — the way back home is always indicated
  const marker = document.createElement("div");
  marker.id = "home-marker";
  document.body.appendChild(marker);

  // the viewscreen: you are INSIDE a small ship now. A dark canopy frame runs
  // all the way around the glass — top strut, side struts, angled gussets —
  // and a console of live readout panels spans the bottom. The whole rig stays
  // inside ~10% of the screen (James's budget). WEP and SHD report OFFLINE:
  // those systems are coming, the ship just doesn't have them installed yet.
  // (2026-07-17: the v18-v24 rendered-chrome / three.js cockpit experiments
  // were pulled by James — spaceship direction retired; code parked in
  // tmp/orb-dimension/parked/. This is the v15/v17 viewscreen, restored.)
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = `
    <div class="vs-strut vs-top"></div>
    <div class="vs-strut vs-left"></div>
    <div class="vs-strut vs-right"></div>
    <div class="vs-gusset tl"></div><div class="vs-gusset tr"></div>
    <div class="vs-gusset bl"></div><div class="vs-gusset br"></div>
    <div class="vs-glass">
      <div class="vs-arc left"></div>
      <div class="vs-arc right"></div>
      <svg class="vs-reticle" viewBox="-100 -100 200 200">
        <g id="vs-horizon">
          <path d="M -78 0 H -52 L -44 7" />
          <path d="M 78 0 H 52 L 44 7" />
        </g>
        <g class="ret-ring">
          <path d="M -46 -14 A 48 48 0 0 1 -14 -46" />
          <path d="M 14 -46 A 48 48 0 0 1 46 -14" />
          <path d="M 46 14 A 48 48 0 0 1 14 46" />
          <path d="M -14 46 A 48 48 0 0 1 -46 14" />
        </g>
        <path class="ret-cross" d="M 0 -11 V -4 M 0 11 V 4 M -11 0 H -4 M 11 0 H 4" />
        <circle class="ret-dot" r="1.3" />
      </svg>
    </div>
    <div class="vs-console-rig">
      <div class="vs-console">
        <div class="vs-wing left"></div>
        <section class="vs-pod pod-att">
          <h2>ATT</h2>
          <div class="vs-screen vs-rows">
            <p><span>HDG</span><b id="vs-hdg">000</b></p>
            <p><span>PIT</span><b id="vs-pit">+00</b></p>
            <p><span>BNK</span><b id="vs-bnk">+00</b></p>
          </div>
        </section>
        <section class="vs-cluster">
          <div class="vs-screen">
            <p class="vs-big"><b id="vs-spd">0</b><span> m/s</span></p>
            <div class="vs-bar"><div id="vs-thr"></div></div>
            <p class="vs-mode" id="vs-mode">IDLE</p>
          </div>
        </section>
        <section class="vs-pod pod-pos">
          <h2>POS</h2>
          <div class="vs-screen vs-rows">
            <p><span>X</span><b id="vs-px">0</b></p>
            <p><span>Y</span><b id="vs-py">0</b></p>
            <p><span>Z</span><b id="vs-pz">20000</b></p>
          </div>
        </section>
        <section class="vs-pod pod-nav">
          <h2>NAV</h2>
          <div class="vs-screen vs-rows">
            <p><span>HOME</span><b id="vs-home">1.6 km</b></p>
            <p><span>REEF</span><b id="vs-reef">— km</b></p>
            <p><span>CNT</span><b id="vs-con">0</b></p>
            <p><span>EXIT</span><b>3</b></p>
          </div>
        </section>
        <section class="vs-pod pod-sys">
          <h2>SYS</h2>
          <div class="vs-screen vs-rows">
            <p><span>ENG</span><b class="vs-ok" id="vs-eng">NOMINAL</b></p>
            <p><span>WEP</span><b class="vs-off">OFFLINE</b></p>
            <p><span>SHD</span><b class="vs-off">OFFLINE</b></p>
          </div>
        </section>
        <section class="vs-pod pod-fuel">
          <h2>FUEL</h2>
          <div class="vs-screen vs-fuel">
            <div class="vs-frow"><span>H2O</span><div class="vs-fbar fh2o" id="vs-h2o-bar"><div id="vs-h2o"></div></div></div>
            <div class="vs-frow"><span>DEU</span><div class="vs-fbar fdeu" id="vs-deu-bar"><div id="vs-deu"></div></div></div>
          </div>
        </section>
        <div class="vs-btns">
          <button type="button" id="vs-navb" aria-expanded="false" aria-controls="orb-nav">NAV [N]</button>
          <button type="button" id="vs-tune" aria-expanded="false" aria-controls="orb-tuner">TUNE [T]</button>
          <button type="button" id="vs-ctrl" aria-expanded="false" aria-controls="orb-controls">CTRL [C]</button>
          <div class="vs-bldg-row">
            <select id="vs-bldg" class="vs-bldg" aria-label="building to view"><option value="">buildings…</option></select>
            <button type="button" id="vs-view">VIEW [V]</button>
            <button type="button" id="vs-vpadd" title="save this vantage by name (shift-click: delete the selected one)">+</button>
          </div>
        </div>
        <div class="vs-wing right"></div>
      </div>
    </div>`;
  document.body.appendChild(hud);
  const $v = (id) => hud.querySelector("#" + id);
  const vsEls = {
    hdg: $v("vs-hdg"), pit: $v("vs-pit"), bnk: $v("vs-bnk"),
    spd: $v("vs-spd"), thr: $v("vs-thr"), mode: $v("vs-mode"),
    px: $v("vs-px"), py: $v("vs-py"), pz: $v("vs-pz"),
    home: $v("vs-home"), reef: $v("vs-reef"), con: $v("vs-con"), eng: $v("vs-eng"),
    h2o: $v("vs-h2o"), deu: $v("vs-deu"),
    h2oBar: $v("vs-h2o-bar"), deuBar: $v("vs-deu-bar"),
    ret: hud.querySelector(".vs-reticle"),
  };
  let hudNext = 0; // next text-readout refresh (ms); bar animates every frame

  // v54.2b (James: the ghost ring sat low): the reticle's true screen center.
  // The glass sits ABOVE the console, so the cross is not the window center —
  // everything stick-centered (grab test, anchor, ghost ring) keys off this.
  // Cached; a resize marks it stale.
  const retC = { x: window.innerWidth / 2, y: window.innerHeight / 2, stale: true };
  function reticleCenter() {
    if (retC.stale) {
      retC.stale = false;
      const r = vsEls.ret.getBoundingClientRect();
      if (r && r.width) {
        retC.x = r.left + r.width / 2;
        retC.y = r.top + r.height / 2;
      }
    }
    return retC;
  }
  window.addEventListener("resize", () => { retC.stale = true; });

  const anchors = Array.from(document.querySelectorAll(".orb.portal"));

  // ---- WebGL -----------------------------------------------------------------

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: true, // the skull is real geometry — orbs depth-test against it
  });
  if (!gl) {
    hint.textContent = "this dimension needs WebGL2 — the dark is all there is";
    return;
  }

  const VS = `#version 300 es
layout(location=0) in vec2 aQuad;
layout(location=1) in vec4 i0; // SHIP-RELATIVE pos (v49), radius
layout(location=2) in vec4 i1; // h1, h2, sat, fadeDur
layout(location=3) in vec4 i2; // fadePhase, spin, variant, halo
layout(location=4) in vec4 i3; // seed, portal, veil, quadScale
layout(location=5) in vec4 i4; // kind, p0, p1, activity (v47)
layout(location=6) in vec4 i5; // v63 key light dir (ship space), ball flag (0 disc, 1 ball, 2 ball + lit)
uniform mat4 uVP;
uniform vec3 uRight;
uniform vec3 uUp;
out vec2 vUv;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC; // seed, portal, dist, radius
flat out vec2 vMisc; // veil flag, quad scale
flat out vec4 vD; // kind, p0, p1, activity
out vec3 vWp;          // v63 the quad point in ship space — the per-pixel ray
flat out vec3 vCen;    // v63 the orb center in ship space
flat out vec4 vL;      // v63 key light dir + ball flag
void main() {
  // v49 camera-relative: i0.xyz arrives already relative to the ship
  // (float64 subtraction in JS), so distance is just its length
  float d = length(i0.xyz);
  float radius = i0.w;
  // the heart never shrinks below a star's size on screen
  if (i3.y > 1.5) radius = max(radius, d * 0.004);
  // and nothing paints a quad much larger than the screen no matter how
  // close it gets — overdraw stays bounded at any tuner setting
  radius = min(radius, d * 0.8);
  // per-instance quad size: orbs carry a wide halo margin, veils and dust use
  // tight quads — huge dim washes must not multiply full-screen blended pixels
  // v63: a ball's silhouette is wider than its radius up close (1/sqrt(1 -
  // (r/d)^2) — 1.57x at 1.3 radii); the card grows to hold it so the limb is
  // never clipped while the near-fade is still showing it
  float qs = i3.w;
  if (i5.w > 0.5) {
    float rn = radius / max(d, 1e-3);
    qs = max(qs, 1.04 / sqrt(max(1.0 - rn * rn, 0.05)));
  }
  vec3 wp = i0.xyz + (uRight * aQuad.x + uUp * aQuad.y) * radius * qs;
  vUv = aQuad * qs;
  vA = i1;
  vB = i2;
  vC = vec4(i3.x, i3.y, d, radius);
  vMisc = vec2(i3.z, qs);
  vD = i4;
  vWp = wp;
  vCen = i0.xyz;
  vL = i5;
  gl_Position = uVP * vec4(wp, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
in vec2 vUv;
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
flat in vec2 vMisc;
flat in vec4 vD; // kind, p0, p1, activity (v47)
in vec3 vWp;       // v63
flat in vec3 vCen; // v63
flat in vec4 vL;   // v63
uniform mat4 uVP;    // v63 the hit point's real depth
uniform vec3 uRight; // v63 billboard frame in the fragment stage
uniform vec3 uUp;
uniform float uSphere; // v63 the A/B dial: 0 = the old camera-facing disc, 1 = a real ball
uniform float uBallRim; // v63.3 the edge a ball shows: 0 = no ring, no fresnel; 1 = the full atlas ring
uniform mediump sampler2DArray uShells;
uniform mediump sampler2DArray uArt;   // interior paintings + planet maps
uniform sampler2D uGlyphs;             // 8x8 rune atlas, canvas-drawn
uniform float uTime;
uniform float uFog;
uniform float uGlow;
uniform float uShellOp;
uniform float uHeartOp; // v62.1: the Saelyri heart balls are force fields — dimmed so the homes read through
uniform float uFadeScale;
out vec4 frag;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  return (rgb - 0.5) * c + l;
}

// v47 helpers for the interior scenes
float h11(float n) { return fract(sin(n) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x),
             mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
// v63.4 speckle: soft dots at jittered cell points, not every cell lit, sizes
// rolled per dot — summed over three unrelated layers it has no lattice to
// read (James, magnified ×4.9 on a crowd cloud: "it looks like burlap")
float speck(vec2 p, float k) {
  vec2 ip = floor(p), fp = fract(p);
  float a = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 c = ip + o;
    float h3 = h21(c * 1.3 + k);
    if (h3 < 0.45) continue;
    float h1 = h21(c + k * 17.3), h2 = h21(c + k * 31.7 + 4.2);
    vec2 d = o + vec2(h1, h2) - fp;
    float rr = 0.10 + 0.22 * h21(c + 8.8 + k);
    a += pow(smoothstep(rr, 0.0, length(d)), 1.5) * (0.5 + 0.5 * h1);
  }
  return a;
}

// ---- v56 the Saelyri (kind 65): 3D field helpers for the being raymarch.
// The look is the Being Editor's three-layer interior (shell / filaments /
// skeleton) with James's james-being-01 preset baked as constants — the
// editor stays the place looks get developed; this is its in-world twin.
float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x),
                mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x),
                mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
float fbm3(vec3 p) {
  float a = 0.55, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * n3(p); p = p * 2.03 + 5.1; a *= 0.5; }
  return s;
}
float smin65(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float capsule65(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
// the vaguely-humanoid RESTING form (James: relatable, this is supposed to
// be fun) — the Being Editor's sdBeing verbatim
float being65(vec3 p) {
  float body = capsule65(p, vec3(0.0, -0.34, 0.0), vec3(0.0, 0.20, 0.0), 0.20);
  float head = length(p - vec3(0.0, 0.40, 0.0)) - 0.15;
  float armL = capsule65(p, vec3(-0.10, 0.16, 0.0), vec3(-0.34, -0.12, 0.06), 0.07);
  float armR = capsule65(p, vec3(0.10, 0.16, 0.0), vec3(0.34, -0.10, -0.05), 0.07);
  float legL = capsule65(p, vec3(-0.07, -0.30, 0.0), vec3(-0.13, -0.66, 0.03), 0.075);
  float legR = capsule65(p, vec3(0.07, -0.30, 0.0), vec3(0.14, -0.64, -0.02), 0.075);
  float d = smin65(body, head, 0.14);
  d = smin65(d, smin65(armL, armR, 0.10), 0.12);
  d = smin65(d, smin65(legL, legR, 0.10), 0.13);
  return d;
}
// one whim-shape of the morph wheel (1 box, 2 pyramid, 3 mandala, 4 jewel,
// 5 torus, 6 cloud); the branch is uniform-coherent — only the shape on
// screen is evaluated, the fbm cloud included (the Being Editor perf lesson)
float shape65(float k, vec3 p) {
  if (k < 1.5) {
    vec3 q = abs(p) - vec3(0.42);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  if (k < 2.5) { vec3 q = abs(p); return (q.x + q.y + q.z - 0.62) * 0.57735027; }
  if (k < 3.5) {
    float a = atan(p.z, p.x);
    float r = length(p.xz);
    float kk = 6.2831853 / 7.0;
    a = mod(a + kk * 0.5, kk) - kk * 0.5;
    vec3 q = vec3(cos(a) * r - 0.42, p.y, sin(a) * r);
    float petal = length(vec2(length(q.xz) - 0.16, q.y)) - 0.045;
    float hub = length(vec2(length(p.xz) - 0.17, p.y)) - 0.05;
    return smin65(petal, hub, 0.06);
  }
  if (k < 4.5) {
    vec3 q = abs(p);
    float d = dot(q, vec3(0.577));
    d = max(d, dot(q, vec3(0.0, 0.357, 0.934)));
    d = max(d, dot(q, vec3(0.0, -0.357, 0.934)));
    d = max(d, dot(q, vec3(0.357, 0.934, 0.0)));
    d = max(d, dot(q, vec3(-0.357, 0.934, 0.0)));
    d = max(d, dot(q, vec3(0.934, 0.0, 0.357)));
    d = max(d, dot(q, vec3(0.934, 0.0, -0.357)));
    return d - 0.52;
  }
  if (k < 5.5) return length(vec2(length(p.xz) - 0.40, p.y)) - 0.15;
  return length(p) - 0.52 + (fbm3(p * 3.4 + uTime * 0.25) - 0.5) * 0.55;
}


// ---- v64 PHASE 2: THE INTERIORS AS VOLUMES ---------------------------------
// Inside a ball the refracted ray walks the chord through the unit sphere in
// VOL_N steps; each interior kind is a 3-D recipe — what glows at this point
// in the ball right now — returning emission (rgb) and density (a). Far orbs
// keep the flat v47 picture (the march only runs when the orb covers real
// screen area); the two crossfade so nothing pops. p is in the orb's own
// axes (world axes turned by a per-orb yaw), y up, |p| <= 1.
const int VOL_N = 20; // round 2: 12 steps skipped 0.02-wide rings into dots
float volSph(vec3 p, vec3 c, float r) { return length(p - c) - r; }
float volBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float volTor(vec3 p, float R, float r) { return length(vec2(length(p.xz) - R, p.y)) - r; }
float volSeg(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float volShell(float sd, float w) { return smoothstep(w, 0.0, abs(sd)); } // a thin surface
float volSolid(float sd, float w) { return smoothstep(w, -w, sd); }        // a filled body
vec3 volRotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
vec3 volRotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 volRotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
// glowing points: at most one per cell, jittered, hashed on/off — one tap
float volPts(vec3 p, float cell, float rad, float k, float fill) {
  vec3 ip = floor(p * cell), fp = fract(p * cell);
  float h = h31(ip + k);
  if (h > fill) return 0.0;
  vec3 j = vec3(h31(ip + 1.1 + k), h31(ip + 2.2 + k), h31(ip + 3.3 + k)) * 0.6 + 0.2;
  return smoothstep(rad, 0.0, length(fp - j)) * (0.5 + 0.5 * h31(ip + 4.4 + k));
}
// a lit solid: emission from the body colour, shaded by the sun direction
vec3 volLit(vec3 p, vec3 c, vec3 col, vec3 L) { vec3 n = normalize(p - c + 1e-5); return col * (0.35 + 0.65 * max(dot(n, L), 0.0)); }

// ---- v65 THE ROLLED INTERIOR (kind 30, James: "a roll of the dice... twenty
// different things you can do, geometric shapes, patterns, textures, lighting,
// fog... believably three-dimensional"): one recipe that reads a GENOME of 16
// slots, 3 bits each, packed by JS into p0 (slots 0-7) and p1 (slots 8-15) —
// integers under 2^24, exact in float32 — so the lab can print the genome in
// words and a kept roll is just its two numbers. seed still hashes the details.
int volGene(float pk, int k) { return int(mod(floor(pk / exp2(3.0 * float(k))), 8.0)); }
vec3 volHue(vec3 c, float a) { // rotate hue (YIQ), cheap
  const vec3 w = vec3(0.299, 0.587, 0.114);
  float y = dot(c, w);
  vec3 ch = c - y;
  float ca = cos(a), sa = sin(a);
  vec3 i = vec3(0.596, -0.274, -0.322), q = vec3(0.211, -0.523, 0.312);
  float I = dot(c, i), Q = dot(c, q);
  float I2 = I * ca - Q * sa, Q2 = I * sa + Q * ca;
  return clamp(vec3(y + 0.956 * I2 + 0.621 * Q2, y - 0.272 * I2 - 0.647 * Q2, y - 1.106 * I2 + 1.703 * Q2), 0.0, 4.0);
}
float volHexEdge(vec2 uv) { // distance to the nearest honeycomb wall, cell size 1
  vec2 rr = vec2(1.0, 1.7320508);
  vec2 h = rr * 0.5;
  vec2 a = mod(uv, rr) - h, b = mod(uv - h, rr) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  vec2 g = abs(gv);
  return 0.5 - max(dot(g, normalize(vec2(1.0, 1.7320508))), g.x);
}
vec4 volRolled(vec3 p, float t, float pk0, float pk1, float seed, vec3 c1, vec3 c2, vec3 L) {
  int gLat = volGene(pk0, 0), gScl = volGene(pk0, 1), gSym = volGene(pk0, 2), gSol = volGene(pk0, 3);
  int gCnt = volGene(pk0, 4), gHol = volGene(pk0, 5), gPat = volGene(pk0, 6), gFog = volGene(pk0, 7);
  int gLit = volGene(pk1, 0), gPal = volGene(pk1, 1), gHue = volGene(pk1, 2), gMot = volGene(pk1, 3);
  int gMov = volGene(pk1, 4), gGrd = volGene(pk1, 5), gNz = volGene(pk1, 6), gCut = volGene(pk1, 7);
  float ss = seed * 3.7;
  float r = length(p);
  float env = smoothstep(1.0, 0.86, r);
  // motion (slot 12): still / spin / counter-turning layers / breathe / pulse / flow
  vec3 q = p;
  if (gMov == 1 || gMov == 2) q = volRotY(q, t * 0.12);
  else if (gMov == 3) q = volRotY(q, t * 0.14 * (fract(r * 2.5) < 0.5 ? 1.0 : -1.0));
  else if (gMov == 4) q *= 1.0 + 0.06 * sin(t * 0.7 + ss);
  else if (gMov == 6 || gMov == 7) q += 0.05 * vec3(sin(t * 0.5 + p.y * 4.0 + ss), sin(t * 0.37 + p.z * 3.0), cos(t * 0.43 + p.x * 4.0));
  float pulse = gMov == 5 ? 0.6 + 0.4 * sin(t * 2.0 + r * 6.0) : 1.0;
  // symmetry (slot 2): none ×3 / mirror / 3-fold / 4-fold / 6-fold / 8-fold
  if (gSym == 3) q = abs(q);
  else if (gSym >= 4) {
    float k = gSym == 4 ? 3.0 : gSym == 5 ? 4.0 : gSym == 6 ? 6.0 : 8.0;
    float kk = 6.2831853 / k;
    float a = atan(q.z, q.x);
    a = abs(mod(a + kk * 0.5, kk) - kk * 0.5);
    float rq = length(q.xz);
    q = vec3(cos(a) * rq, q.y, sin(a) * rq);
  }
  // noise warp (slot 14): none ×3 / gentle / strong / ridged
  if (gNz == 4 || gNz == 5) {
    float amp = gNz == 4 ? 0.1 : 0.28;
    q += (vec3(n3(q * 3.0 + ss), n3(q * 3.0 + ss + 7.0), n3(q * 3.0 + ss + 13.0)) - 0.5) * amp;
  } else if (gNz >= 6) q += abs(n3(q * 4.0 + ss) - 0.5) * 0.3;
  // the lattice (slots 0, 1): scale 2.5–11 cells across; walls never thinner
  // than the march can see (~0.045 of the ball)
  float sc = mix(2.5, 11.0, float(gScl) / 7.0);
  float thin = max(0.045 * sc, 0.07) * (gHol == 7 ? 1.6 : 1.0);
  // a roll with no lattice and almost no solids is an empty ball — round 1 of
  // the sheet had four; the roller (JS, lab + world) forbids it too
  if (gLat == 0 && gCnt <= 2) gCnt = 5;
  float lat = 0.0;
  if (gLat == 1 || gLat == 2) { // honeycomb prisms, capped in y
    float e = volHexEdge(q.xz * sc);
    float cap = smoothstep(thin * 0.5, 0.0, abs(fract(q.y * sc * 0.6) - 0.5) - 0.35);
    lat = max(smoothstep(thin, thin * 0.3, e), cap * smoothstep(thin * 1.5, 0.0, e - thin));
  } else if (gLat == 3) { // a cubic scaffold: bars along every edge
    vec3 f = abs(fract(q * sc) - 0.5);
    float e = min(min(max(f.x, f.y), max(f.y, f.z)), max(f.x, f.z));
    lat = smoothstep(thin * 0.9, thin * 0.3, e);
  } else if (gLat == 4) { // gyroid
    vec3 g = q * sc * 1.5;
    float v = sin(g.x) * cos(g.y) + sin(g.y) * cos(g.z) + sin(g.z) * cos(g.x);
    lat = smoothstep(thin * 3.0, thin * 0.3, abs(v));
  } else if (gLat == 5) { // foam: the walls between noise cells
    float v = n3(q * sc * 0.55 + ss);
    lat = smoothstep(thin * 0.7, thin * 0.3, abs(v - 0.5));
  } else if (gLat == 6) { // concentric shells
    lat = smoothstep(thin * 1.6, thin * 0.3, abs(fract(r * max(sc, 5.0) * 0.35 + 0.5) - 0.5));
  } else if (gLat == 7) { // spiral arms in a thick disc
    float a = atan(q.z, q.x);
    lat = smoothstep(thin * 1.6, 0.0, abs(fract(a / 6.2831853 * 3.0 + r * sc * 0.25 + t * 0.01) - 0.5)) * smoothstep(0.4, 0.1, abs(q.y));
  }
  // gLat 0 = no lattice
  // the solids (slots 3, 4, 5): shapes dealt into cells, hashed on by the count
  float sol = 0.0;
  float sc2 = max(sc * 0.5, 2.5); // at least ~5 cells across, or a small scale has no room for solids
  float fill = mix(0.06, 0.55, float(gCnt) / 7.0);
  {
    vec3 cp = q * sc2;
    vec3 ip = floor(cp), fp = fract(cp) - 0.5;
    float hh = h31(ip + ss);
    if (hh < fill) {
      vec3 jit = (vec3(h31(ip + ss + 1.1), h31(ip + ss + 2.2), h31(ip + ss + 3.3)) - 0.5) * 0.35;
      vec3 lp = fp - jit;
      float sz = mix(0.16, 0.34, h31(ip + ss + 4.4));
      float sd;
      if (gSol <= 1) sd = length(lp) - sz;                                        // spheres
      else if (gSol == 2) sd = max(length(lp.xz) - sz * 0.35, abs(lp.y) - 0.46); // rods
      else if (gSol == 3) sd = volBox(lp, vec3(sz, sz * 0.14, sz));              // plates
      else if (gSol == 4) sd = volTor(lp, sz, sz * 0.22);                         // rings
      else if (gSol == 5) sd = (abs(lp.x) + abs(lp.y) + abs(lp.z) - sz) * 0.577;  // octahedra
      else if (gSol == 6) sd = max((abs(lp.x) + abs(lp.z)) * 0.9 - sz * 0.5, abs(lp.y) - sz * 1.4); // crystals
      else sd = volBox(lp, vec3(sz * 0.7));                                       // cubes
      float wsm = 0.05 / sc2;
      if (gHol <= 3) sol = volSolid(sd, wsm);
      else if (gHol <= 5) sol = volShell(sd, wsm * 1.4);
      else if (gHol == 6) sol = volSolid(sd, wsm) * step(0.45, n3(q * sc * 3.0 + ss));            // lace
      else sol = volSolid(sd, wsm) * smoothstep(0.42, 0.58, n3(q * sc * 1.8 + ss + 9.0));       // holes
    }
  }
  // surface pattern on the solids (slot 6): plain ×3 / bands / traces / honeycomb / scales / stripes
  float pat = 1.0;
  if (gPat == 3) pat = 0.45 + 0.55 * step(0.5, fract(q.y * sc * 2.0));
  else if (gPat == 4) pat = 0.3 + 1.4 * step(0.82, n3(q * sc * 4.0 + ss));
  else if (gPat == 5) pat = 0.4 + 0.9 * smoothstep(0.12, 0.0, volHexEdge(q.xz * sc * 4.0));
  else if (gPat == 6) pat = 0.5 + 0.5 * smoothstep(0.3, 0.0, length(fract(q.xy * sc * 3.0) - 0.5) - 0.3);
  else if (gPat == 7) pat = 0.45 + 0.55 * step(0.5, fract((q.x + q.z) * sc * 2.0));
  // density gradient (slot 13): uniform ×2 / dense core / dense rim / equator band / two poles
  float grd = 1.0;
  // floors at 0.25–0.3: a gradient thins a roll, never empties it (round 2 lesson)
  if (gGrd == 2 || gGrd == 3) grd = 0.25 + 0.75 * smoothstep(0.95, 0.15, r);
  else if (gGrd == 4 || gGrd == 5) grd = 0.3 + 0.7 * smoothstep(0.3, 0.85, r);
  else if (gGrd == 6) grd = 0.25 + 0.75 * smoothstep(0.35, 0.05, abs(q.y));
  else if (gGrd == 7) grd = 0.25 + 0.75 * smoothstep(0.35, 0.65, abs(q.y));
  // cutaway (slot 15): none ×5 / a wedge / a half
  float cut = 1.0;
  // on the UNFOLDED p: the symmetry fold puts every q in the +x/+z sector,
  // which is exactly the wedge (round 3 bug: symmetry + cutaway = an empty ball)
  if (gCut == 5 || gCut == 6) cut = 1.0 - step(0.0, p.x) * step(0.0, p.z);
  else if (gCut == 7) cut = 1.0 - step(0.0, p.x);
  // fog (slot 7): none ×3 / uniform / strata / clumpy / a core cloud / a rim haze
  float fog = 0.0;
  if (gFog == 3) fog = 0.35;
  else if (gFog == 4) fog = 0.5 * smoothstep(0.6, 0.95, sin(q.y * 9.0 + ss));
  else if (gFog == 5) fog = 0.9 * smoothstep(0.5, 0.75, fbm3(q * 2.5 + ss + t * 0.04));
  else if (gFog == 6) fog = 1.2 * exp(-r * r * 7.0);
  else if (gFog == 7) fog = 0.5 * smoothstep(0.55, 0.95, r);
  // palette (slots 9, 10)
  float mixv = clamp(0.5 + 0.5 * sin(r * 5.0 + q.y * 3.0 + ss), 0.0, 1.0);
  vec3 col;
  if (gPal == 0) col = c1;
  else if (gPal == 1) col = mix(c1, c2, mixv);
  else if (gPal == 2) col = volHue(c1, r * 3.0 + q.y * 2.0);
  else if (gPal == 3) col = mix(vec3(0.1, 0.3, 0.95), vec3(0.45, 0.85, 1.0), mixv);   // data blues
  else if (gPal == 4) col = mix(vec3(1.0, 0.28, 0.05), vec3(1.0, 0.8, 0.3), mixv);    // ember
  else if (gPal == 5) col = mix(vec3(0.55, 0.9, 1.0), vec3(0.8, 0.7, 1.0), mixv);     // ice
  else if (gPal == 6) col = mix(vec3(0.3, 1.0, 0.25), vec3(1.0, 0.2, 0.8), mixv);     // acid
  else col = mix(vec3(1.0, 0.95, 0.85), c2, mixv) * 0.55;                              // white with an accent (dimmed: it blew out on the sheet)
  if (gPal >= 3) col = volHue(col, (float(gHue) / 7.0 - 0.5) * 1.2);
  // light (slot 8): even ×2 / a center glow / sun-lit / lit rim / from below / pulsing / flicker
  float lit = 1.0;
  if (gLit == 2) lit = 0.35 + 1.4 * exp(-r * 2.5);
  else if (gLit == 3) lit = 0.3 + 0.9 * max(dot(normalize(p + 1e-4), L), 0.0);
  else if (gLit == 4) lit = 0.25 + 0.9 * smoothstep(0.5, 0.95, r);
  else if (gLit == 5) lit = 0.3 + 0.9 * smoothstep(0.4, -0.6, p.y);
  else if (gLit == 6) lit = 0.6 + 0.5 * sin(t * 1.7 + r * 7.0 + ss);
  else if (gLit == 7) lit = 0.7 + 0.5 * step(0.7, h31(vec3(floor(t * 9.0), ss, 1.0)));
  lit *= pulse;
  // motes (slot 11): none ×3 / drifting dust / orbiting points / a swarm / falling / embers rising
  float mot = 0.0;
  vec3 mcol = col;
  if (gMot == 3) mot = volPts(q + vec3(t * 0.01, 0.0, t * 0.013), 12.0, 0.14, ss, 0.2) * 0.6;
  else if (gMot == 4) mot = volPts(volRotY(q, t * 0.4), 7.0, 0.2, ss, 0.15);
  else if (gMot == 5) mot = volPts(q + 0.07 * sin(t * 1.5 + q.yzx * 9.0 + ss), 9.0, 0.2, ss, 0.22);
  else if (gMot == 6) mot = volPts(vec3(q.x, q.y + t * 0.12, q.z), 10.0, 0.15, ss, 0.2);
  else if (gMot == 7) { mot = volPts(vec3(q.x + sin(t * 0.7 + q.y * 4.0) * 0.03, q.y - t * 0.09, q.z), 10.0, 0.15, ss, 0.18); mcol = vec3(1.0, 0.6, 0.25); }
  // assemble
  float body = (lat * 1.6 + sol * 2.2 * pat) * grd * cut * env;
  vec3 e = col * body * lit * 2.3 + col * fog * 0.18 * env + mcol * mot * 4.5 * env;
  float d = (lat * 6.0 + sol * 10.0) * grd * cut * env + fog * 0.9 * env + mot * 4.0 * env;
  return vec4(e, d);
}
vec4 volKind(int kind, vec3 p, float t, float act, vec3 c1, vec3 c2, float seed, vec3 L) {
  vec3 e = vec3(0.0); float d = 0.0;
  if (kind == 30) return volRolled(p, t, vD.y, vD.z, seed, c1, c2, L); // v65 the rolled interior
  float r = length(p);
  float rr = length(p.xz);
  float ang = atan(p.z, p.x);
  float ss = seed * 3.7;
  if (kind == 1) { // swirling lights: two ribbons of light spiralling through the ball
    // two helical tubes of light winding up through the ball, counter-turning
    // v65.1 (James: "needs more detail, more strands, many more"): ten helices,
    // two families counter-turning, each on its own radius, pitch and phase
    float env = smoothstep(1.0, 0.7, r);
    // v65.2 (James: "thinner still and a higher proportion of them"): eighteen
    // strands at the march's resolving width, three families
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float fam = fi < 6.0 ? 1.0 : fi < 12.0 ? -1.0 : 0.6;
      float ph = fi * 0.698 + ss;
      float th = fam * t * (0.6 + 0.07 * fi) + p.y * (3.0 + fi * 0.35) + ph;
      float rad = 0.12 + 0.038 * fi + 0.07 * sin(p.y * (1.5 + fi * 0.2) + t * 0.4 + ph);
      vec2 h = vec2(cos(th), sin(th)) * rad;
      float g = exp(-dot(p.xz - h, p.xz - h) / 0.0022);
      d += g * env * 3.0;
      e += mix(c1, c2, fract(fi * 0.37)) * g * env * 3.6;
    }
  } else if (kind == 2) { // water with fish: a dim blue fill, caustics, four fish, bubbles
    // v64.1 (James: "they look like buttons" — a white ring meeting a dark
    // limb): the water is FULL now (density 1.6, the chord saturates well
    // before the limb) and scatters the sun — the lit side glows, the far
    // side is deep — so the ball reads as a ball of water, not a rim.
    float dp = p.y * 0.5 + 0.5;
    float sunS = 0.55 + 0.45 * max(dot(normalize(p + 1e-5), L), 0.0);
    e = mix(vec3(0.012, 0.08, 0.16), vec3(0.05, 0.3, 0.42), dp) * 0.55 * sunS;
    float ca = sin(p.x * 9.0 + t * 1.3) * sin(p.z * 7.0 - t * 0.9) * sin(p.y * 6.0 + t * 0.7);
    e += vec3(0.06, 0.16, 0.18) * smoothstep(0.5, 1.0, ca) * 0.6 * sunS;
    d = 1.6;
    // four small fish, HEAD FIRST: the body lies along the path's own velocity
    for (int i = 0; i < 4; i++) {
      float fs = seed + float(i) * 13.7;
      float w1 = 0.11 + 0.03 * h11(fs), w2 = 0.155 + 0.025 * h11(fs + 1.0), w3 = w1 * 0.8; // v65.2 half speed (James: "slow it down")
      vec3 fp = vec3(sin(t * w1 + fs) * 0.55, sin(t * w2 + fs * 2.0) * 0.4, cos(t * w3 + fs * 1.3) * 0.5);
      vec3 fv = vec3(cos(t * w1 + fs) * 0.55 * w1, cos(t * w2 + fs * 2.0) * 0.4 * w2, -sin(t * w3 + fs * 1.3) * 0.5 * w3);
      vec3 fd = fv / max(length(fv), 1e-4);
      float body = volSeg(p, fp, fp - fd * 0.07, 0.012);
      float tail = volSeg(p, fp - fd * 0.07, fp - fd * 0.1 + vec3(0.0, 0.0, 0.0), 0.004 + 0.008 * abs(sin(t * 9.0 + fs)));
      float fish = volSolid(min(body, tail), 0.012);
      e += (vec3(0.25, 0.6, 0.65) + c1 * 0.3) * fish * 4.0;
      d += fish * 10.0;
    }
    float bub = volPts(vec3(p.x, p.y - t * 0.12, p.z), 9.0, 0.16, ss, 0.12) * clamp(act - 1.0, 0.0, 1.0);
    e += vec3(0.5, 0.8, 0.9) * bub * 2.0; d += bub * 3.0;
    // v65.1 (James): little dark dots too — silt sinking, density with no light
    float silt = volPts(vec3(p.x + sin(t * 0.3 + p.z * 5.0) * 0.02, p.y + t * 0.03, p.z), 13.0, 0.13, ss + 7.0, 0.22)
               + volPts(vec3(p.x, p.y + t * 0.02, p.z + sin(t * 0.2 + p.x * 3.0) * 0.02), 6.0, 0.3, ss + 19.0, 0.2) * 1.3; // v65.2 some bigger ones
    d += silt * 9.0;
  } else if (kind == 4) { // kaleidoscope: the ball folded into a mirrored cell, a lattice of light inside
    // v65.2 (James: "a shame it can't have some symmetry... actual
    // kaleidoscopic effects"): the ball is folded SIX-FOLD about a tilted
    // axis and mirrored across its equator, so one wedge holds a few slowly
    // drifting gems, rods and a ring, and the fold repeats them twelve times
    // — turn it and the whole pattern turns as one, the way a kaleidoscope does
    vec3 q = volRotX(volRotY(p, t * 0.08 + ss), 0.5);
    float a = atan(q.z, q.x);
    float kk = 6.2831853 / 6.0;
    a = abs(mod(a + kk * 0.5, kk) - kk * 0.5);
    float rq = length(q.xz);
    q = vec3(cos(a) * rq, abs(q.y), sin(a) * rq);
    float env = smoothstep(1.0, 0.85, r);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec3 c = vec3(0.15 + 0.2 * fi + 0.05 * sin(t * 0.3 + fi), 0.1 + 0.18 * fi * h11(fi + ss) + 0.04 * sin(t * 0.23 + fi * 2.0), 0.05 + 0.12 * fi);
      vec3 lp = q - c;
      float gem = volSolid((abs(lp.x) + abs(lp.y) + abs(lp.z) - 0.055 - 0.02 * fi) * 0.577, 0.012);
      float rod = volSolid(volSeg(q, c, c * vec3(1.0, -0.2, 1.0) + vec3(0.0, 0.05, 0.0), 0.012), 0.012);
      // v65.3 (James: "stick with all blue green colors"): a fixed sea palette
      vec3 col = i == 0 ? vec3(0.15, 0.55, 1.0) : i == 1 ? vec3(0.2, 0.95, 0.75) : i == 2 ? vec3(0.4, 0.8, 1.0) : vec3(0.1, 0.7, 0.55);
      e += col * (gem * 3.0 + rod * 1.6) * env;
      d += (gem * 10.0 + rod * 6.0) * env;
    }
    float ring = volSolid(volTor(q - vec3(0.0, 0.02, 0.0), 0.5, 0.02), 0.012) * step(a, 0.2);
    e += vec3(0.3, 0.9, 0.9) * ring * 2.5 * env; d += ring * 8.0 * env;
    float mirror = smoothstep(0.02, 0.0, abs(a - kk * 0.5)) * smoothstep(0.9, 0.3, rq) * 0.25; // the faint mirror planes
    e += vec3(0.6, 0.7, 1.0) * mirror * env; d += mirror * 0.8 * env;
  } else if (kind == 5) { // weird blobs: four metaballs oozing through each other
    float m = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i) * 1.7 + ss;
      vec3 c = vec3(sin(t * 0.31 + fi), sin(t * 0.23 + fi * 2.0), cos(t * 0.27 + fi * 0.7)) * 0.42;
      float dd = length(p - c) + fbm3(p * 4.0 + t * 0.3) * 0.12;
      m += 0.09 / (dd * dd + 0.02);
    }
    // v65.2: the v64 blobs restored exactly (James: "I kind of like them better on the first pass")
    float blob = smoothstep(0.8, 1.8, m);
    d = blob * 4.0;
    e = mix(c2, c1, smoothstep(1.0, 3.0, m)) * blob * 2.4;
  } else if (kind == 6) { // orrery: a sun, four planets on tilted rings
    float sun = volSolid(volSph(p, vec3(0.0), 0.2), 0.04);
    e = mix(c1, vec3(1.0), 0.4) * sun * 6.0 + c1 * exp(-r * r * 8.0) * 0.5; d = sun * 9.0 + exp(-r * r * 8.0) * 0.4;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float R = 0.3 + fi * 0.16;
      vec3 q = volRotX(volRotZ(p, fi * 0.35 + ss), fi * 0.5);
      float ring = volShell(volTor(q, R, 0.0), 0.035);
      float a = t * (0.45 - fi * 0.085) + fi * 2.0; // v65.2 half speed
      vec3 pc = vec3(cos(a) * R, 0.0, sin(a) * R);
      float pl = volSolid(volSph(q, pc, 0.07 + fi * 0.012), 0.03);
      e += c2 * ring * 1.2 + volLit(q, pc, mix(c2, vec3(1.0), 0.3), L) * pl * 4.0;
      d += ring * 1.2 + pl * 9.0;
    }
  } else if (kind == 7) { // reactor core: a pulsing core, two containment rings, energy rising
    float pulse = 0.8 + 0.2 * sin(t * 4.0);
    float core = volSolid(volSph(p, vec3(0.0), 0.18 * pulse), 0.06);
    float halo = exp(-r * r * 9.0) * 0.6;
    float r1 = volShell(volTor(volRotX(p, t * 0.5), 0.45, 0.0), 0.045);
    float r2 = volShell(volTor(volRotZ(volRotX(p, 1.57), t * 0.35), 0.6, 0.0), 0.045);
    float fil = smoothstep(0.6, 1.0, n3(vec3(p.x * 6.0, p.y * 3.0 - t * 1.5, p.z * 6.0) + ss)) * (1.0 - r);
    e = mix(c1, vec3(1.0), 0.5) * core * 8.0 + c1 * halo * 2.0 + c2 * (r1 + r2) * 2.0 + c1 * fil * 1.5;
    d = core * 10.0 + halo * 1.2 + (r1 + r2) * 1.5 + fil * 1.4;
  } else if (kind == 8) { // data rain: columns of glyphs falling through the ball
    vec3 q = vec3(p.x, p.y + t * 0.11, p.z); // v65.2 a third of the speed (James: "quite a bit")
    vec3 ip = floor(q * vec3(7.0, 12.0, 7.0));
    float on = step(0.72, h31(ip + ss)) * step(0.35, h31(vec3(ip.x, 0.0, ip.z) + ss + 9.0)); // some columns rain, some cells lit
    vec3 fp = fract(q * vec3(7.0, 12.0, 7.0)) - 0.5;
    float cellD = smoothstep(0.42, 0.2, max(abs(fp.x), abs(fp.z))) * smoothstep(0.45, 0.3, abs(fp.y));
    float head = step(0.93, h31(ip + ss + 3.0));
    // v65.1 (James: "looked cooler when it was green... more like the Matrix"):
    // phosphor green with a pale head, each column a trail that fades up
    // behind its head, cells flickering as they change
    float trail = pow(fract(q.y * 0.5 + h31(vec3(ip.x, 0.0, ip.z) + ss + 4.0)), 2.0);
    float flick = 0.7 + 0.3 * step(0.5, h31(ip + floor(t * 1.5) + ss));
    vec3 gcol = mix(vec3(0.15, 1.0, 0.35), c1, 0.2);
    d = on * cellD * (2.0 + trail * 2.0 + head * 4.0) * (1.0 - r * 0.4);
    e = mix(gcol, vec3(0.8, 1.0, 0.85), head) * on * cellD * (1.2 + trail * 2.5 + head * 5.0) * flick * (1.0 - r * 0.4);
  } else if (kind == 10) { // gyroscope: three nested rings, each tumbling on its own axis
    // v65.3 (James: "only three... can you have nine? more ornamentation on
    // some... more color variation"): nine nested rings, radii 0.86 down to
    // 0.3, every third one plain, the others carrying studs or a chain of
    // small beads, nine hues stepped around the orb's
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      vec3 q = volRotZ(volRotX(volRotY(p, t * (0.12 + fi * 0.04) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) + fi), t * (0.1 - fi * 0.008) + ss + fi * 0.7), fi * 0.9);
      // v65.1 (James: "more precise looking... a little pixely"): a real tube
      // (radius 0.028 — twice the march's resolving width) with a hard edge,
      // slower tumble, tick marks on every ring, a bright bearing where the
      // rings cross their axis
      float R = 0.86 - fi * 0.07;
      float ring = volSolid(volTor(q, R, 0.022), 0.012);
      float ra0 = atan(q.z, q.x);
      float orn = mod(fi, 3.0);
      float tick = 0.0;
      if (orn > 0.5 && orn < 1.5) tick = smoothstep(0.38, 0.5, abs(fract(ra0 * 2.55) - 0.5)) * volSolid(volTor(q, R, 0.045), 0.012);        // studs
      else if (orn > 1.5) tick = smoothstep(0.3, 0.45, abs(fract(ra0 * 4.5) - 0.5)) * volSolid(volTor(q, R + 0.05, 0.03), 0.012);          // a chain of beads outside
      float bearing = (volSolid(volSph(q, vec3(R, 0.0, 0.0), 0.04), 0.012) + volSolid(volSph(q, vec3(-R, 0.0, 0.0), 0.04), 0.012)) * step(orn, 0.5);
      // v65.2 (James: "all pink... more exciting lighting"): each ring its own
      // colour (c1 / c2 / the complement), a white glint racing round each
      // ring, a soft glow off the tube toward the sun
      vec3 rc = volHue(mix(c1, c2, fract(fi * 0.5)), fi * 0.7);
      float ra = ra0;
      float glint = pow(0.5 + 0.5 * cos(ra - t * (1.6 + fi * 0.5)), 24.0);
      float sun = 0.6 + 0.6 * max(dot(normalize(vec3(cos(ra), 0.0, sin(ra))), L), 0.0);
      float haze = volSolid(volTor(q, R, 0.08), 0.04) * (1.0 - ring) * 0.35;
      e += rc * (ring * 3.2 * sun + tick * 2.0 + haze * 1.2) + vec3(1.0) * (bearing * 3.0 + ring * glint * 5.0);
      d += ring * 12.0 + tick * 6.0 + bearing * 12.0 + haze * 1.5;
    }
    float hub = volSolid(volSph(p, vec3(0.0), 0.06), 0.02);
    e += vec3(1.0) * hub * 4.0; d += hub * 8.0;
  } else if (kind == 11) { // circuitry: traces on three floating boards, pulses running them
    // v65.2 (James: "can it have six... better ordered... a computer is a very
    // ordered thing... more parallelism"): three parallel DECKS and three
    // parallel UPRIGHTS crossing them at right angles — a backplane — the
    // whole block on one seeded tilt so no viewer sees it all edge-on
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec3 q = volRotX(volRotY(p, ss), 0.5);
      if (fi > 2.5) q = volRotZ(q, 1.5707963); // the uprights
      float yb = -0.4 + mod(fi, 3.0) * 0.4;
      float board = smoothstep(0.02, 0.0, abs(q.y - yb)) * smoothstep(0.85, 0.6, length(q.xz));
      // v65.1 (James: "another whack... more symmetrical"): the board is
      // mirrored in four (abs on both axes) so every trace has its twin, with
      // a ring bus around the middle and a chip pad at each corner
      vec2 g = abs(q.xz) * 7.0;
      vec2 gf = abs(fract(g) - 0.5);
      float onx = step(0.45, h21(vec2(floor(g.y), fi) + ss)), onz = step(0.45, h21(vec2(floor(g.x), fi) + ss + 5.0));
      float trace = max(smoothstep(0.12, 0.03, gf.y) * onx, smoothstep(0.12, 0.03, gf.x) * onz);
      float bus = smoothstep(0.03, 0.0, abs(length(q.xz) - 0.28)) + smoothstep(0.03, 0.0, abs(length(q.xz) - 0.5));
      float pad = smoothstep(0.08, 0.05, max(abs(abs(q.x) - 0.38), abs(abs(q.z) - 0.38)));
      trace = max(trace, max(bus, pad * 0.8));
      float pulse = smoothstep(0.8, 1.0, sin(g.x * 2.0 + g.y - t * 6.0 + fi));
      // v65.3 (James: "variations of the color"): four board families by seed —
      // copper on green, silver on blue, gold on black, cyan on violet
      float cf = floor(h11(ss + 9.0) * 4.0);
      vec3 tcol = cf < 0.5 ? vec3(0.9, 0.5, 0.2) : cf < 1.5 ? vec3(0.75, 0.85, 1.0) : cf < 2.5 ? vec3(1.0, 0.8, 0.3) : vec3(0.3, 0.95, 1.0);
      vec3 pcol = cf < 0.5 ? vec3(1.0, 0.85, 0.5) : cf < 1.5 ? vec3(0.5, 0.8, 1.0) : cf < 2.5 ? vec3(1.0, 0.95, 0.7) : vec3(1.0, 0.5, 1.0);
      vec3 bcol = cf < 0.5 ? vec3(0.05, 0.25, 0.1) : cf < 1.5 ? vec3(0.05, 0.1, 0.3) : cf < 2.5 ? vec3(0.05, 0.05, 0.05) : vec3(0.15, 0.05, 0.25);
      e += (tcol * 1.2 + pcol * pulse * 4.0) * trace * board * 3.0 + bcol * board * 0.6;
      d += (trace * (1.2 + pulse) + 0.2) * board * 3.0;
    }
  } else if (kind == 12) { // snow-globe city: towers on the floor of the ball, lit windows, snow
    float floorY = -0.35;
    vec2 cell = floor(p.xz * 6.0 + 0.5);
    vec2 cf = p.xz * 6.0 + 0.5 - cell - 0.5;
    float hgt = 0.15 + 0.5 * h21(cell + ss) * smoothstep(0.9, 0.4, length(cell / 6.0));
    float tower = volSolid(volBox(vec3(cf.x / 6.0, p.y - floorY - hgt * 0.5, cf.y / 6.0), vec3(0.055, hgt * 0.5, 0.055)), 0.012) * step(0.15, h21(cell + ss + 2.0));
    float win = step(0.6, h31(vec3(floor(cf.x * 30.0), floor((p.y - floorY) * 28.0), floor(cf.y * 30.0)) + ss)) * smoothstep(0.045, 0.05, max(abs(cf.x), abs(cf.y)) / 6.0 * 6.0);
    float ground = smoothstep(0.02, 0.0, abs(p.y - floorY)) * smoothstep(0.95, 0.5, rr);
    float snow = volPts(vec3(p.x + sin(t * 0.3 + p.y * 3.0) * 0.05, p.y + t * 0.08, p.z), 10.0, 0.14, ss, 0.2) * step(floorY, p.y);
    e = vec3(0.03, 0.035, 0.06) * tower * 2.0 + vec3(1.0, 0.85, 0.5) * win * tower * 2.2 + c1 * ground * 0.6 + vec3(0.9, 0.95, 1.0) * snow * 1.5;
    d = tower * 12.0 + ground * 1.2 + snow * 2.5;
  } else if (kind == 13) { // storm orb: a churning cloud with lightning inside it
    float cl = fbm3(p * 3.0 + vec3(t * 0.25, -t * 0.1, 0.0) + ss);
    float cloud = smoothstep(0.35, 0.75, cl) * (1.0 - r * 0.8);
    float flashT = floor(t * 1.3 + ss);
    float flash = step(0.75, h11(flashT)) * pow(1.0 - fract(t * 1.3 + ss), 4.0);
    vec3 fa = vec3(h11(flashT + 1.0) - 0.5, 0.6, h11(flashT + 2.0) - 0.5), fb = vec3(h11(flashT + 3.0) - 0.5, -0.5, h11(flashT + 4.0) - 0.5);
    float bolt = volShell(volSeg(p + (n3(p * 9.0 + flashT) - 0.5) * 0.08, fa, fb, 0.0), 0.025) * flash;
    // v65.2 (James: "variations of different colors"): four storm families by
    // seed — slate, green-violet, rust dust, deep red — each with its own bolt
    float sf = floor(h11(ss + 5.0) * 4.0);
    vec3 scol = sf < 0.5 ? vec3(0.16, 0.18, 0.24) : sf < 1.5 ? vec3(0.12, 0.22, 0.18) : sf < 2.5 ? vec3(0.3, 0.18, 0.1) : vec3(0.28, 0.08, 0.1);
    vec3 bcol = sf < 0.5 ? vec3(0.8, 0.85, 1.0) : sf < 1.5 ? vec3(0.7, 1.0, 0.8) : sf < 2.5 ? vec3(1.0, 0.85, 0.6) : vec3(1.0, 0.6, 0.6);
    e = mix(scol, c1 * 0.8, 0.3) * cloud * 1.2 + bcol * (bolt * 6.0 + cloud * flash * 1.5);
    d = cloud * 2.6 + bolt * 6.0;
  } else if (kind == 14) { // ember hive: a dark honeycombed mass with embers drifting up out of it
    // v65.1 (James: it lost "the bees effect... some holes in the center
    // piece"): the mass is a true honeycomb — hexagonal cells bored through
    // it top to bottom (the walls stay, the cells are open and glow from
    // within), and a few BIG bees crawl the cells instead of the ember dust
    float mass = volSolid(volSph(p, vec3(0.0), 0.5) + (n3(p * 7.0 + ss) - 0.5) * 0.1, 0.04);
    // cells are bored RADIALLY (hex lattice on the cylinder: twelve around, so
    // no seam) and stop short of the core — from any side you look into pockets
    float hexE = volHexEdge(vec2((ang + ss) / 6.2831853 * 12.0, p.y * 6.0));
    float cell = smoothstep(0.1, 0.22, hexE) * smoothstep(0.2, 0.32, r); // 1 inside a cell, 0 on the wall
    float hot = smoothstep(0.5, 0.15, r) * (0.7 + 0.3 * sin(t * 2.0 + r * 20.0));
    float wall = mass * (1.0 - cell * 0.9);
    float glow = mass * cell * (0.35 + hot);
    float bees = volPts(vec3(p.x + sin(t * 0.9 + p.y * 3.0 + ss) * 0.06, p.y + sin(t * 0.6 + p.x * 4.0) * 0.05, p.z + cos(t * 0.7 + ss) * 0.06), 5.0, 0.24, ss, 0.14) * smoothstep(0.3, 0.55, r) * smoothstep(0.75, 0.6, r);
    e = vec3(0.09, 0.045, 0.02) * wall + mix(c1, vec3(1.0, 0.6, 0.2), 0.5) * glow * 2.2 + vec3(1.0, 0.75, 0.3) * bees * 5.0;
    d = wall * 12.0 + glow * 1.6 + bees * 9.0;
  } else if (kind == 15) { // clockwork: three toothed gears meshing, turning
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec3 gc = vec3(cos(fi * 2.09 + ss) * 0.35, sin(fi * 2.09 + ss) * 0.3, (fi - 1.0) * 0.12);
      vec3 q = volRotZ(p - gc, t * (fi == 1.0 ? -0.9 : 0.6) + fi);
      float R = 0.26 + fi * 0.06;
      float teeth = 0.04 * step(0.0, sin(atan(q.y, q.x) * (12.0 + fi * 4.0)));
      float gear = volShell(length(q.xy) - R - teeth, 0.06) * smoothstep(0.07, 0.02, abs(q.z));
      float spoke = smoothstep(0.05, 0.0, abs(sin(atan(q.y, q.x) * 2.0)) * length(q.xy)) * step(length(q.xy), R) * smoothstep(0.07, 0.02, abs(q.z));
      e += mix(c1, vec3(0.9, 0.7, 0.35), 0.5) * (gear + spoke * 0.6) * 6.0;
      d += (gear + spoke * 0.6) * 7.0;
    }
    // v65.2 (James: "another set of three going across ways"): a second train
    // in the crossing plane, smaller, turning the other way
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec3 pp = volRotY(p, 1.5707963);
      vec3 gc = vec3(cos(fi * 2.09 + ss + 1.0) * 0.3, sin(fi * 2.09 + ss + 1.0) * 0.32, 0.0);
      vec3 q = volRotZ(pp - gc, -t * (fi == 1.0 ? -1.1 : 0.75) + fi);
      float R = 0.2 + fi * 0.05;
      float teeth = 0.035 * step(0.0, sin(atan(q.y, q.x) * (10.0 + fi * 4.0)));
      float gear = volShell(length(q.xy) - R - teeth, 0.05) * smoothstep(0.06, 0.02, abs(q.z));
      float spoke = smoothstep(0.04, 0.0, abs(sin(atan(q.y, q.x) * 2.0)) * length(q.xy)) * step(length(q.xy), R) * smoothstep(0.06, 0.02, abs(q.z));
      e += mix(c2, vec3(0.7, 0.75, 0.85), 0.5) * (gear + spoke * 0.6) * 5.0;
      d += (gear + spoke * 0.6) * 7.0;
    }
    float tick = smoothstep(0.9, 1.0, sin(t * 3.14159 * 2.0)) * volSolid(volSph(p, vec3(0.0, -0.55, 0.0), 0.06), 0.02);
    e += vec3(1.0) * tick * 3.0; d += tick * 4.0;
  } else if (kind == 16) { // galaxy: a thin spiral disc with a bright bulge, dust lanes, stars
    // v64.4 (James: "fully vertical... a vertical thing turning rather than
    // the galaxy swirling around itself"): the disc lies near the ecliptic —
    // a gentle seeded tilt (12–30°) and a small roll — and the arms turn
    // DIFFERENTIALLY about the disc's own axis, inner faster than outer, so
    // it swirls in place instead of tumbling
    vec3 q = volRotZ(volRotX(p, 0.36 + 0.16 * sin(ss)), 0.18 * cos(ss));
    float rq = length(q.xz);
    // the arm PATTERN turns rigidly (a density wave — it never winds up);
    // the dust and stars stream through it differentially, inner faster
    float th = atan(q.z, q.x) - t * 0.15;
    float thD = atan(q.z, q.x) - t * (0.15 + 0.4 / (rq + 0.3));
    float arm = smoothstep(0.1, 0.9, 0.5 + 0.5 * cos(th * 2.0 - rq * 9.0 + 1.0));
    float dust = fbm3(vec3(cos(thD) * rq * 5.0, sin(thD) * rq * 5.0, 0.0) + ss);
    float disc = exp(-q.y * q.y / (0.004 + rq * 0.03)) * smoothstep(1.0, 0.2, rq);
    float bulge = exp(-length(q * vec3(1.0, 1.6, 1.0)) * 7.0); // v65.1 rounder, and the disc twice as bright: a pill no more
    float stars = volPts(vec3(cos(thD) * rq, q.y * 4.0, sin(thD) * rq), 14.0, 0.18, ss, 0.35) * disc;
    // v65.1 (James: "a variety of colours"): four galaxy families by seed —
    // blue-white, gold, rose-with-cyan-arms, green — the arms tinted apart
    // from the disc
    float gf = floor(h11(ss + 11.0) * 4.0);
    vec3 dcol = gf < 0.5 ? vec3(0.55, 0.7, 1.0) : gf < 1.5 ? vec3(1.0, 0.8, 0.45) : gf < 2.5 ? vec3(1.0, 0.55, 0.7) : vec3(0.5, 1.0, 0.6);
    vec3 acol = gf < 0.5 ? vec3(0.8, 0.9, 1.0) : gf < 1.5 ? vec3(1.0, 0.95, 0.7) : gf < 2.5 ? vec3(0.5, 0.9, 1.0) : vec3(0.9, 1.0, 0.7);
    vec3 bcol = gf < 1.5 ? vec3(1.0, 0.95, 0.85) : gf < 2.5 ? vec3(1.0, 0.85, 0.8) : vec3(0.95, 1.0, 0.9);
    e = mix(dcol, c1, 0.25) * disc * 0.35 + acol * disc * arm * (0.6 + dust * 0.8) * 1.3 + bcol * bulge * 2.2 + vec3(1.0) * stars * 2.0;
    d = disc * (0.5 + arm * (0.8 + dust)) * 1.4 + bulge * 3.5 + stars * 3.0;
  } else if (kind == 17) { // the eye that opens: an eyeball facing out, the lid parting as you close in
    float open = 0.15 + 0.85 * smoothstep(0.2, 1.6, act) * (0.8 + 0.2 * sin(t * 0.7));
    vec3 q = volRotY(p, ss);
    float ball = volShell(volSph(q, vec3(0.0), 0.55), 0.07);
    float front = smoothstep(0.55, 0.95, q.z / max(length(q), 1e-4));
    float irisA = acos(clamp(q.z / max(length(q), 1e-4), -1.0, 1.0));
    float iris = smoothstep(0.42, 0.36, irisA) * front;
    float pupil = smoothstep(0.17, 0.12, irisA);
    float lid = smoothstep(open * 0.5, open * 0.5 - 0.06, abs(q.y) / max(length(q), 1e-4));
    float fib = 0.6 + 0.4 * sin(atan(q.y, q.x) * 24.0 + irisA * 30.0);
    vec3 col = mix(vec3(0.9, 0.9, 0.85), vec3(0.2, 0.5, 1.0) * fib * 1.6, iris) * (1.0 - pupil); // v65.1 blue (James: "red is not good")
    e = ball * (col * lid * 1.4 + vec3(0.12, 0.06, 0.05) * (1.0 - lid)) * 2.5;
    d = ball * 12.0;
  } else if (kind == 20) { // the forge: an anvil block, a molten pool glowing under it, sparks
    float anvil = volSolid(volBox(p - vec3(0.0, -0.2, 0.0), vec3(0.3, 0.09, 0.14)), 0.015);
    float pool = smoothstep(0.03, 0.0, abs(p.y + 0.42)) * smoothstep(0.55, 0.25, rr) * (0.7 + 0.3 * sin(t * 2.0 + rr * 12.0));
    float sparks = volPts(vec3(p.x + sin(t + p.y * 6.0) * 0.06, p.y - t * 0.35, p.z), 12.0, 0.12, ss + floor(t * 0.5), 0.1) * step(-0.4, p.y) * step(rr, 0.5);
    float heat = exp(-length(p - vec3(0.0, -0.4, 0.0)) * 3.5) * 0.5;
    e = vec3(0.06, 0.05, 0.05) * anvil * 2.0 + vec3(1.0, 0.45, 0.1) * (pool * 3.0 + heat) + vec3(1.0, 0.7, 0.3) * sparks * 5.0;
    d = anvil * 12.0 + pool * 3.0 + heat * 0.8 + sparks * 4.0;
  } else if (kind == 21) { // singing crystals: five shards standing at angles, each pulsing on its own note
    // v65.1 (James: "too big and bulky... a lot smaller and more detailed"):
    // a geode — fourteen slim shards growing out from a dark seed rock at
    // the centre, each a hexagonal prism with a pointed tip, faceted by a
    // banded emission along its length, each on its own note
    float rock = volSolid(volSph(p, vec3(0.0), 0.16) + (n3(p * 9.0 + ss) - 0.5) * 0.06, 0.02);
    e += vec3(0.05, 0.04, 0.06) * rock; d += rock * 12.0;
    // v65.2 (James: "still needs more... colour variations within the same
    // one... some longer ones that come almost to the very edge"): twenty
    // shards, every third one long (to 0.92), each its own hue about c1
    for (int i = 0; i < 20; i++) {
      float fi = float(i);
      float a = fi * 0.3142 + ss, b = (h11(fi + ss) - 0.5) * 2.6;
      vec3 dir = normalize(vec3(cos(a) * cos(b), sin(b), sin(a) * cos(b)));
      float len = mod(fi, 3.0) < 0.5 ? 0.7 + 0.22 * h11(fi * 3.1 + ss) : 0.26 + 0.28 * h11(fi * 3.1 + ss);
      float w = 0.028 + 0.014 * h11(fi * 5.3 + ss);
      float along = dot(p, dir);
      vec3 perp = p - dir * along;
      float hexR = max(abs(perp.x) * 0.866 + abs(perp.y) * 0.5, max(abs(perp.y), abs(perp.z) * 0.866 + abs(perp.x) * 0.5));
      float taper = w * (1.0 - smoothstep(len - 0.08, len + 0.02, along) * 1.0);
      float sd = max(hexR - taper, max(0.12 - along, along - len - 0.02));
      float body = volSolid(sd, 0.012), edge = volShell(sd, 0.012);
      float note = 0.5 + 0.5 * sin(t * (1.5 + fi * 0.37) + fi * 2.0);
      float bands = 0.6 + 0.4 * step(0.5, fract(along * 18.0 + fi));
      e += volHue(mix(c2, c1, fract(fi * 0.31)), (h11(fi * 7.7 + ss) - 0.5) * 2.4) * (body * (0.25 + note * 1.0) * bands + edge * 1.8) * 1.5;
      d += body * 7.0 + edge * 3.0;
    }
  } else if (kind == 22) { // moons around a hearth: a warm hearth, three moons lit by it
    float hearth = volSolid(volSph(p, vec3(0.0), 0.16), 0.04);
    e = vec3(1.0, 0.6, 0.3) * hearth * 6.0 + vec3(1.0, 0.5, 0.2) * exp(-r * r * 6.0) * 0.5;
    d = hearth * 9.0 + exp(-r * r * 6.0) * 0.6;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a = t * (0.45 - fi * 0.1) + fi * 2.1 + ss;
      vec3 q = volRotX(p, fi * 0.6 + ss);
      vec3 mc = vec3(cos(a), 0.0, sin(a)) * (0.4 + fi * 0.18);
      float moon = volSolid(volSph(q, mc, 0.07 + fi * 0.015), 0.02);
      vec3 n = normalize(q - mc + 1e-5);
      float lit = max(dot(n, -normalize(mc)), 0.0);
      e += mix(c2, vec3(0.8), 0.5) * moon * (0.12 + lit * 1.4) * 3.0;
      d += moon * 9.0;
    }
  } else if (kind == 23) { // signal beacon: a mast, a lamp, spherical pulses spreading out
    // v65.1 (James: "coming from the center instead of the top"): the lamp
    // sits at the heart on a three-strut cradle; three pulses spread out
    // from it as full spheres so the ball reads round from every side
    float mast = 0.0;
    for (int i = 0; i < 3; i++) { float a = float(i) * 2.094 + ss; mast += volSolid(volSeg(p, vec3(0.0), vec3(cos(a) * 0.85, -0.35, sin(a) * 0.85), 0.022), 0.012); }
    float lamp = volSolid(volSph(p, vec3(0.0), 0.09), 0.03) * (0.6 + 0.4 * sin(t * 6.0));
    float pulse = 0.0;
    for (int i = 0; i < 3; i++) { float pr = fract(t * 0.3 + float(i) * 0.333 + ss); pulse += volShell(r - pr * 0.95, 0.03) * (1.0 - pr) * (1.0 - pr); }
    e = vec3(0.2, 0.22, 0.28) * mast * 2.0 + mix(c1, vec3(1.0), 0.4) * lamp * 8.0 + c1 * pulse * 2.4;
    d = mast * 8.0 + lamp * 10.0 + pulse * 1.8;
  } else if (kind == 26) { // the library: rings of shelves around a reading lamp
    // v65.1 (James: "instead of books... data-related blues, futuristic
    // blues that all go together, rack servers, a data-centre orb"): two
    // concentric rings of rack modules — slim slabs in a family of blues,
    // each with a blinking status light — around a cool white core
    float lamp = volSolid(volSph(p, vec3(0.0), 0.07), 0.03);
    float cool = exp(-r * 2.4) * 0.3;
    e = vec3(0.7, 0.85, 1.0) * (lamp * 6.0 + cool * 0.6); d = lamp * 9.0 + cool * 0.4;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float R0 = 0.42 + fi * 0.28;
      float wall = smoothstep(R0 - 0.03, R0, rr) * smoothstep(R0 + 0.13, R0 + 0.1, rr) * step(abs(p.y), 0.72 - fi * 0.1);
      float nA = 10.0 + fi * 8.0;
      float rail = smoothstep(0.06, 0.02, abs(fract(p.y * 6.0 + 0.5) - 0.5)) * wall;
      vec3 bk = vec3(floor(ang * nA), floor(p.y * 6.0), fi);
      float on = step(0.12, h31(bk + ss));
      float hue = h31(bk + ss + 2.0);
      float unit = wall * (1.0 - rail) * on * smoothstep(0.5, 0.38, abs(fract(ang * nA) - 0.5));
      // v65.2 (James: "color variations"): four rack families by seed —
      // the blues, cyan-green, amber, magenta-violet
      float df = floor(h11(ss + 3.0) * 4.0);
      vec3 lo = df < 0.5 ? vec3(0.04, 0.16, 0.5) : df < 1.5 ? vec3(0.03, 0.3, 0.3) : df < 2.5 ? vec3(0.4, 0.2, 0.03) : vec3(0.3, 0.05, 0.4);
      vec3 hi = df < 0.5 ? vec3(0.25, 0.65, 1.0) : df < 1.5 ? vec3(0.3, 1.0, 0.8) : df < 2.5 ? vec3(1.0, 0.75, 0.3) : vec3(1.0, 0.4, 0.9);
      vec3 bcol = mix(lo, hi, hue);
      float led = smoothstep(0.12, 0.05, length(vec2(fract(ang * nA) - 0.5, fract(p.y * 6.0 + 0.5) - 0.3))) * unit * step(0.5, h31(bk + floor(t * 3.0) + ss + 5.0));
      e += vec3(0.1, 0.14, 0.22) * rail * 1.4 + bcol * unit * (0.4 + cool * 3.0) * 2.0 + vec3(0.6, 0.9, 1.0) * led * 6.0;
      d += rail * 6.0 + unit * 7.0 + led * 6.0;
    }
  }
  return vec4(e, d);
}
vec4 volMarch(int kind, vec3 e0, vec3 dd, float L, float t, float act, vec3 c1, vec3 c2, float seed, vec3 Lw) {
  float ds = L / float(VOL_N);
  vec3 acc = vec3(0.0);
  float aa = 0.0;
  float ya = seed * 2.1;
  float ca = cos(ya), sa = sin(ya);
  vec3 Lr = vec3(ca * Lw.x - sa * Lw.z, Lw.y, sa * Lw.x + ca * Lw.z);
  for (int i = 0; i < VOL_N; i++) {
    vec3 p = e0 + dd * (ds * (float(i) + 0.5));
    p = vec3(ca * p.x - sa * p.z, p.y, sa * p.x + ca * p.z);
    vec4 s = volKind(kind, p, t, act, c1, c2, seed, Lr);
    float a = clamp(s.a * ds, 0.0, 1.0);
    acc += (1.0 - aa) * s.rgb * ds * 3.0 * min(1.0, s.a + 0.35);
    aa += (1.0 - aa) * a;
    if (aa > 0.985) break;
  }
  return vec4(acc, aa);
}
void main() {
  float r = length(vUv);
  int kind = int(vD.x + 0.5);
  // glyphs are square runes — everyone else clips to the disc
  if (kind != 60 && r > vMisc.y) discard;
  float seed = vC.x;
  float portal = vC.y;
  float dist = vC.z;
  float radius = vC.w;

  // fog + near-fade live up here now (v47): the standalone kinds below need
  // them before the glass pipeline runs
  float fogF = exp(-dist * uFog);
  if (portal > 1.5) fogF = 1.0;
  else if (portal > 0.5) fogF = mix(fogF, 1.0, 0.6);
  // v49.2: veils get SCALED fog, not exemption. Their whole dim-mottling look
  // was designed under v38 fog (they rendered at 0.14-0.66 of authored
  // brightness); full exemption turned the walls into a ball pit of bright
  // spheres (James's report, confirmed on screen). The walls moved ~21x
  // farther out, so fog at 1/21 strength reproduces the v38 rendered look
  // at the same viewing angles. 0.05 ~= 1/21.
  if (vMisc.x > 0.5) fogF = exp(-dist * uFog * 0.05);
  float nearF = vMisc.x > 0.5 ? 1.0 : smoothstep(radius * 0.7, radius * 1.8, dist);

  // ---- v63 THE BALL (James, 2026-09-03: "it has to") ---------------------
  // Every orb used to be a camera-facing disc with a gradient. Now every
  // eligible one (vL.w > 0: glass orbs, hearts, worldlets, beings — never
  // dust, veils, glyphs, creatures, crowd clouds) is hit per pixel by the
  // real perspective ray: a true surface point, normal and depth. uSphere
  // crossfades the disc back in (the "real spheres" dial). The camera is
  // the origin of ship space, so the ray is just the quad point's direction.
  // gl_FragDepth is written on EVERY path (the GLSL ES rule); misses keep
  // the card's depth. The math runs in a distance-normalized frame: at
  // 100 km the plain |c|^2 - r^2 form loses the radius entirely in float32.
  gl_FragDepth = gl_FragCoord.z;
  float ballK = uSphere * step(0.5, vL.w) * (1.0 - step(0.5, vMisc.x));
  vec3 rd = normalize(vWp);
  vec3 rd0 = normalize(vCen);
  vec3 N = vec3(0.0, 0.0, 1.0); // billboard-frame normal (right, up, toward camera)
  vec3 Nw = -rd0;               // ship-space normal
  vec3 P = vCen;                // hit point, ship space
  float hitF = 0.0;
  float bnz = 1.0;              // facing term of the hit normal
  float hqn = 0.0;              // discriminant (normalized frame) — the chord for the beings
  vec2 qRef = vUv;              // where the light inside gets sampled (refracted)
  vec3 volE0 = vec3(0.0), volD = vec3(0.0, 0.0, -1.0); // v64: the refracted chord through the unit ball
  float volL = 0.0;
  if (ballK > 0.001) {
    float inv = 1.0 / max(dist, 1e-3);
    vec3 cn = vCen * inv;
    float rn = radius * inv;
    vec3 perp = cn - rd * dot(cn, rd);
    hqn = rn * rn - dot(perp, perp);
    // the silhouette on the quad plane is bigger than the radius up close
    float sil = 1.0 / sqrt(max(1.0 - rn * rn, 1e-6));
    if (hqn > 0.0) {
      float tn = dot(cn, rd) - sqrt(hqn);
      P = rd * (tn * dist);
      Nw = (P - vCen) / radius;
      // facing is measured against THIS pixel's ray, not the center
      // direction: under perspective the silhouette normal is not
      // perpendicular to the center line (at 3 radii it still faces the
      // center by 0.33), and measuring it that way never reached the
      // atlas rim and magnified everything. N is the billboard-frame
      // normal with its magnitude corrected to the true facing.
      bnz = max(dot(Nw, -rd), 0.0);
      vec2 nxy = vec2(dot(Nw, uRight), dot(Nw, uUp));
      nxy = nxy / max(length(nxy), 1e-5) * sqrt(max(1.0 - bnz * bnz, 0.0));
      N = vec3(nxy, bnz);
      hitF = 1.0;
      vec4 cp = uVP * vec4(P, 1.0);
      gl_FragDepth = mix(gl_FragCoord.z, cp.z / cp.w * 0.5 + 0.5, ballK);
      // the light inside sits on the plane through the center; the ray
      // bends at the glass, so the picture slides and bulges with the angle
      vec3 rr = refract(rd, Nw, 0.84); // a mild glass — the picture magnifies a little, not a marble
      float tp = dot(vCen - P, rd0) / max(dot(rr, rd0), 1e-4);
      vec3 Q = P + rr * tp - vCen;
      qRef = mix(vUv, vec2(dot(Q, uRight), dot(Q, uUp)) / radius, ballK);
      volE0 = (P - vCen) / radius;
      volD = rr;
      volL = max(0.0, -2.0 * dot(volE0, rr)); // exit of a unit-sphere chord from a point ON the sphere
      r = mix(r, sqrt(max(1.0 - bnz * bnz, 0.0)), ballK);
    } else {
      r = mix(r, r / sil, ballK); // halo distances measured from the true limb
    }
  }

  // the three states (v47): act 0 = a vague glowing nothing from far away,
  // act 1 = the scene stirs as you close in, act 2 = fully awake beside you.
  // JS smooths act by distance, so the states GLIDE into each other.
  float act = vD.w;
  float vis = clamp(act, 0.0, 1.0);
  float full2 = clamp(act - 1.0, 0.0, 1.0);
  float spd = 0.35 + 0.65 * min(act, 2.0);
  float t0 = uTime + seed * 7.0;

  // early hue pair — the scenes tint with the orb's own colors
  float satE = vA.z;
  vec3 ec1 = hsl2rgb(vA.x / 360.0, satE, 0.62);
  vec3 ec2 = hsl2rgb(vA.y / 360.0, satE, 0.60);

  // ---- standalone kinds: no glass, they ARE the whole sprite --------------
  if (kind == 66) { // v61 a Saelyri crowd from afar: one soft breathing cloud per group
    // vD.z = strength (tide × crowd size × distance gate, JS-driven). Torn by
    // noise so it never reads as a disc — the crowd resolves into beings as
    // the gate takes it away inside 2.5 radii.
    // round-1 lab lesson: a smooth blob read as a bigger sun. GRAIN — a
    // speckle field under a soft envelope — reads as many small lights.
    float mc = pow(smoothstep(1.0, 0.0, r), 1.5);
    // v63.4: value noise on a 34-cell grid read as a woven lattice at a
    // group's size (never right in-world); three jittered speckle layers now
    vec2 sp = vUv * 11.0 + vec2(seed * 13.1, seed * 7.7);
    float grain = speck(sp + uTime * 0.05, 0.0)
                + speck(rot2(sp, 1.1) * 1.7 + 5.3 - uTime * 0.04, 1.0) * 0.8
                + speck(rot2(sp, 2.3) * 2.9 + 9.1, 2.0) * 0.6;
    grain *= 1.6;
    float ac = mc * (0.10 + grain) * vD.z * 0.42;
    vec3 cc = mix(ec1, vec3(1.0), 0.35);
    frag = vec4(cc * ac * 1.2, ac * 0.85) * fogF;
    return;
  }
  if (kind == 65) { // a Saelyri (v56 Phase B1): light held in a shape
    // vD.y = morph blend 0..1 (resting humanoid -> whim shape), vB.y = which
    // whim shape (1..6), vD.z = acknowledgment 0..1, act = the v47 LOD glide.
    float r2 = dot(vUv, vUv);
    float ack = vD.z;
    float closeF = clamp(act - 1.0, 0.0, 1.0); // 1 = fully awake beside you
    vec3 hueA = mix(ec1, vec3(1.0), 0.12);
    vec3 hueB = ec2 * 0.30;
    // far LOD: a soft mote of family light — the vague-nothing contract.
    // Hundreds of beings cost this much and no more until you fly close.
    float mote = pow(smoothstep(1.0, 0.0, sqrt(r2)), 2.0);
    if (act < 0.2) {
      float aM = mote * 0.8;
      frag = vec4(mix(hueA, vec3(1.0), 0.3) * aM * 1.1, aM) * fogF * nearF;
      return;
    }
    // v63: with the ball on, inside = the real hit; the disc test otherwise
    if (mix(r2, hitF > 0.5 ? 0.0 : 2.0, ballK) > 1.0) discard;
    // near LOD: raymarch through the unit sphere. Orthographic by default (a
    // 10m being is effectively parallel-projected; entry and exit are
    // analytic); v63 blends to the true perspective entry point and chord
    // in the same local frame (right, up, away from the camera).
    float tz = sqrt(max(1.0 - r2, 0.0));
    const int SN = 18;
    vec3 e0 = vec3(vUv, -tz);
    vec3 dl = vec3(0.0, 0.0, 1.0);
    float chord = 2.0 * tz;
    if (hitF > 0.5 && ballK > 0.5) {
      // world axes: the being stands in the world, not on the card
      e0 = (P - vCen) / radius;
      dl = rd;
      chord = 2.0 * sqrt(hqn) * dist / radius;
    }
    float dstep = chord / float(SN);
    // being greeted turns the being: its idle sway eases to face the pod
    // v63: in world space (ball on) "facing the pod" is a yaw toward the camera
    float faceAng = mix(0.0, atan(rd0.x, rd0.z), step(0.5, hitF * ballK));
    float angY = mix(uTime * 0.22 + seed * 11.0, faceAng, smoothstep(0.15, 0.8, ack));
    float ca = cos(angY), sa = sin(angY);
    float kt = max(vB.y, 1.0);
    float ms = vD.y;
    // james-being-01 baked: edge 24, structure 55, turbulence 36, core heat
    // 71, glow 77 — re-dial in the Being Editor, then re-bake here
    float edgeK = 19.3;
    float bright = 1.0 + ack * 0.85; // the brightening of being noticed
    vec3 accB = vec3(0.0);
    float alphaB = 0.0;
    for (int i = 0; i < SN; i++) {
      vec3 p0 = e0 + dl * (dstep * (float(i) + 0.5));
      vec3 p = vec3(ca * p0.x - sa * p0.z, p0.y, sa * p0.x + ca * p0.z);
      float d = being65(p);
      if (ms > 0.001) d = mix(d, shape65(kt, p), ms);
      if (d > 0.35) continue;
      float inside = smoothstep(0.02, -0.05, d);
      float shell = exp(-abs(d) * edgeK);
      float mot = 0.62 + 0.38 * fbm3(p * 2.4 + uTime * 0.12 + seed);
      // filaments only when truly close — the structure layer is the
      // expensive one, and from a distance it reads as mottle anyway
      float veins = 0.0;
      if (closeF > 0.05 && inside > 0.003) {
        vec3 fp = p * 5.75 + vec3(0.0, uTime * 0.33, 0.0) + seed;
        float rid = 1.0 - abs(2.0 * fbm3(fp) - 1.0);
        rid = pow(rid, 4.6);
        veins = rid * inside * 1.39 * closeF;
      }
      float skel = exp(-abs(d + 0.17) * 24.0) * inside;
      float gas = inside * (0.02 + 0.06 * mot);
      float radb = length(p);
      vec3 hue = mix(hueA, hueB, clamp(radb * 1.5, 0.0, 1.0));
      vec3 col = hue * shell * 3.2 * (0.55 + 0.45 * mot)
               + hue * gas
               + mix(hue, vec3(1.0), 0.5) * veins * 0.6 * mot
               + mix(hue, vec3(1.0), 0.85) * veins * veins * 0.32
               + mix(hue, vec3(1.0), 0.52) * skel * 1.09;
      accB += col * dstep * 1.75 * (1.0 - alphaB);
      alphaB += (shell * 0.45 + gas * 3.2 + skel * 0.25) * dstep * 2.8 * (1.0 - alphaB);
    }
    alphaB = clamp(alphaB, 0.0, 1.0);
    // the far mote crossfades out as the body fades in — no pop at the seam
    float seam = smoothstep(0.2, 0.55, act);
    vec3 colOut = mix(mix(hueA, vec3(1.0), 0.3) * mote * 1.1, accB * bright, seam);
    float aOut = mix(mote * 0.8, alphaB, seam);
    frag = vec4(colOut, aOut) * fogF * nearF;
    return;
  }
  if (kind == 60) { // colony glyph: a rune sent into the dark
    vec2 guv = vUv * 0.5 + 0.5;
    float cx = mod(vD.y, 8.0);
    float cy = floor(vD.y / 8.0);
    // v56: the atlas grew two rows of Saelyri greeting glyphs — 8 wide, 10 tall
    float g = texture(uGlyphs, vec2((cx + guv.x) / 8.0, (cy + guv.y) / 10.0)).r;
    vec3 gc = mix(ec1, vec3(1.0), 0.25) * (0.75 + 0.25 * sin(t0 * 3.0));
    float ga = g * vD.z;
    frag = vec4(gc * ga, ga * 0.85) * fogF;
    return;
  }
  if (kind == 61) { // transfer mote: a hot bead of traded light
    float m = pow(smoothstep(1.0, 0.0, r), 2.0);
    vec3 mc = mix(ec1, vec3(1.0), 0.45);
    frag = vec4(mc * m * 1.3, m * 0.9) * fogF * nearF;
    return;
  }
  if (kind == 62) { // darter: a streak of living energy (p0 = screen angle)
    vec2 dq = rot2(vUv, -vD.y);
    dq.x *= 0.3;
    float dd = length(dq);
    float core = pow(smoothstep(0.85, 0.0, dd), 3.0);
    vec3 dc = mix(vec3(1.0), ec1, clamp(dd * 2.4, 0.0, 1.0));
    float da = core * vD.z;
    frag = vec4(dc * da * 1.4, da) * fogF * nearF;
    return;
  }
  if (kind == 63) { // pulse jelly: a slow bell with trailing wisps
    float ph = t0 * 1.1 + vD.y;
    vec2 jq = vUv / (0.85 + 0.15 * sin(ph));
    float bellA = smoothstep(0.62, 0.22, length(vec2(jq.x, (jq.y - 0.18) * 1.5)));
    float tent = 0.0;
    for (int i = 0; i < 4; i++) {
      float tx = (float(i) - 1.5) * 0.17;
      tent += smoothstep(0.045, 0.0, abs(jq.x - tx - sin(jq.y * 3.5 + ph * 2.0 + float(i)) * 0.07))
        * smoothstep(0.15, -0.85, jq.y);
    }
    vec3 jc = mix(ec1, ec2, jq.y * 0.5 + 0.5);
    float ja = (bellA * 0.7 + clamp(tent, 0.0, 1.0) * 0.28) * (0.55 + 0.3 * sin(ph));
    frag = vec4(jc * ja * 1.2, ja) * fogF * nearF;
    return;
  }
  if (kind == 64) { // flutter moth: a flickering wing-beat of light
    float flap = abs(sin(t0 * (6.0 + vD.z) + vD.y));
    float wingA = smoothstep(0.9, 0.1, length(vec2(vUv.x * (0.8 + 1.4 * flap), vUv.y * 2.2)));
    vec3 wc = mix(ec1, vec3(1.0), 0.3);
    float wa = wingA * (0.45 + 0.55 * flap);
    frag = vec4(wc * wa, wa * 0.85) * fogF * nearF;
    return;
  }
  if (kind >= 50) { // worldlet: a living planet in the dark (p0 = map layer)
    if (r < 1.0) {
      // v63: a worldlet is a true globe — the map lives in the globe's own
      // frame, so flying around one shows its far side; the disc form keeps
      // the old view-locked mapping under the dial
      float nz0 = sqrt(max(0.0, 1.0 - r * r));
      vec3 nb = vec3(vUv, nz0);
      vec3 n = normalize(mix(nb, N, ballK));
      // v63.8 (James: "a lot of the worlds are not sitting in the center of
      // their globes"): facing is the VIEW component — for the ball that is
      // bnz (normal · toward the eye), never N.z, which is world z
      float nz = mix(max(nb.z, 0.0), bnz, ballK);
      vec3 nbW = uRight * nb.x + uUp * nb.y - rd0 * nb.z;
      vec3 nG = normalize(mix(nbW, Nw, ballK));
      float rspd = 0.006 + 0.018 * h11(seed);
      float lon = mix(atan(n.x, nz), atan(nG.x, nG.z), ballK) / 6.28318 + uTime * rspd;
      float lat = mix(asin(clamp(n.y, -1.0, 1.0)), asin(clamp(nG.y, -1.0, 1.0)), ballK) / 3.14159 + 0.5;
      // mirror-wrapped longitude: the map never shows a seam
      float mu = abs(fract(lon) * 2.0 - 1.0);
      vec3 surf = texture(uArt, vec3(mix(0.035, 0.965, mu), mix(0.965, 0.035, lat), vD.y)).rgb;
      float la = seed * 2.4;
      vec3 L = normalize(vec3(cos(la) * 0.8, 0.45, 0.55 + 0.3 * sin(la)));
      // v63: lit by its nearest sun when the ball is on — the dot is taken in
      // WORLD axes for the ball (Nw against a world light), in view axes for the disc
      vec3 Lw = normalize(mix(uRight * L.x + uUp * L.y - rd0 * L.z, vL.xyz, ballK * clamp(vL.w - 1.0, 0.0, 1.0)));
      float dif = mix(max(dot(nb, L), 0.0), max(dot(Nw, Lw), 0.0), ballK);
      vec3 pc = surf * (0.05 + 1.05 * dif) * (0.5 + 0.5 * nz);
      // night-side city lights wake as you come close
      float night = clamp(0.25 - dif, 0.0, 0.25) * 4.0;
      float sp = step(0.985, h21(floor(vec2(mu * 90.0, lat * 60.0))));
      pc += vec3(1.0, 0.85, 0.5) * sp * night * full2 * 0.55;
      // thin atmosphere at the limb, tinted the orb's hue
      pc += ec1 * pow(1.0 - nz, 3.0) * (0.22 + 0.3 * vis);
      frag = vec4(pc, 1.0) * fogF * nearF;
    } else {
      float glowR = smoothstep(1.25, 1.0, r);
      float aA = glowR * glowR * 0.3 * (0.5 + 0.5 * vis);
      frag = vec4(ec1 * aA, aA) * fogF * nearF;
    }
    // v65.2 RINGS (James: "let's have a couple have rings"): p1 = 1 marks a
    // ringed worldlet (its quad is 2.3 radii wide). The ring is a flat band
    // 1.25–1.85 radii out in the globe's own frame, tilted by seed; this
    // pixel's ray meets that plane and the band is drawn there — behind the
    // globe it is hidden by the globe's own disc (r < 1 draws the surface),
    // in front it lays over it. Lit by the same sun, with the planet's
    // shadow across the far side.
    if (vD.z > 0.5 && ballK > 0.5) {
      float la2 = seed * 1.7;
      vec3 nR = normalize(vec3(sin(la2) * 0.55, 1.0, cos(la2) * 0.45));
      float den = dot(rd, nR);
      if (abs(den) > 1e-4) {
        float tR = dot(vCen, nR) / den;
        vec3 hp = rd * tR - vCen;
        float rr = length(hp) / radius;
        float front = step(dot(rd * tR, rd0), dist); // the ring point is nearer than the globe centre
        float show = (r >= 1.0) ? 1.0 : front * hitF; // over the globe only where the ring is in front of it
        float band = smoothstep(1.22, 1.3, rr) * smoothstep(1.9, 1.8, rr);
        float gaps = 0.55 + 0.45 * smoothstep(0.3, 0.7, n3(vec3(rr * 9.0, seed, 0.0)));
        float divis = smoothstep(0.025, 0.0, abs(rr - 1.55)) * 0.8 + smoothstep(0.02, 0.0, abs(rr - 1.7)) * 0.6;
        // fade toward the quad edge so no clipped edge ever shows up close
        float ringA = band * gaps * (1.0 - divis) * show * step(0.0, tR) * smoothstep(vMisc.y, vMisc.y * 0.72, r);
        vec3 Ls = normalize(mix(vec3(0.0, 1.0, 0.0), vL.xyz, clamp(vL.w - 1.0, 0.0, 1.0)));
        float lit = 0.25 + 0.75 * abs(dot(nR, Ls));
        // the globe's shadow: ring points behind the globe as seen from the sun
        vec3 toS = hp - Ls * dot(hp, Ls);
        float shadow = (dot(hp, Ls) < 0.0) ? smoothstep(0.9, 1.05, length(toS) / radius) : 1.0;
        vec3 rcol = mix(vec3(0.75, 0.7, 0.62), ec1, 0.35) * lit * shadow * (0.7 + 0.3 * gaps);
        float rA = ringA * 0.85 * fogF * nearF;
        frag = frag * (1.0 - rA) + vec4(rcol * rA, rA);
      }
    }
    return;
  }

  // aerial perspective: far orbs lose saturation before they lose light
  float sat = vA.z * mix(1.0, 0.55, clamp(dist / 18000.0, 0.0, 1.0));
  float l1 = 0.62, l2 = 0.60;
  if (portal > 0.5) { sat = 0.04; l1 = 0.80; l2 = 0.74; }
  // flag 3: the skull's eyes — deep saturated red, never washed out
  if (portal > 2.5) { sat = 0.92; l1 = 0.60; l2 = 0.54; }

  float k = 0.5 + 0.5 * sin(uTime * 6.28318 * uFadeScale / vA.w + vB.x);
  float lb = smoothstep(0.6, 0.0, r) * 0.13; // hot center
  vec3 c1 = hsl2rgb(vA.x / 360.0, sat, l1 + lb);
  vec3 c2 = hsl2rgb(vA.y / 360.0, sat, l2 + lb);
  float w1 = mix(0.14, 0.92, k);
  float w2 = mix(0.14, 0.92, 1.0 - k);
  if (portal > 0.5) { w1 = mix(0.30, 0.95, k); w2 = mix(0.30, 0.95, 1.0 - k); }

  // the light inside: two color layers stacked behind the glass
  float prof = pow(smoothstep(1.0, 0.05, r), 1.35);
  float a1 = prof * w1;
  float a2 = prof * w2;
  vec3 coreP = c2 * a2 + c1 * a1 * (1.0 - a2);
  float coreA = a2 + a1 * (1.0 - a2);

  // veil patches are bare washes of light on distant rock — no glass, very dim
  if (vMisc.x > 0.5) {
    coreP *= 0.18;
    coreA *= 0.18;
  }

  // ---- the interiors (v47): a scene behind each inhabited glass ----------
  // From far away every one of these is the plain two-layer glow above.
  // As act rises the scene crossfades in over it, animating faster and
  // showing its act-2-only extras when you're truly close.
  if (kind > 0 && act > 0.01) {
    vec2 q = qRef; // v63: the refracted point on the center plane
    vec3 scn = vec3(0.0);
    float sca = 0.0;
    if (kind == 1) { // swirling lights
      float ang = atan(q.y, q.x);
      float tw = t0 * spd;
      float s1 = smoothstep(0.15, 0.95, sin(ang * 3.0 + r * (6.0 + 2.0 * sin(t0 * 0.2)) - tw * 2.2));
      float s2 = smoothstep(0.3, 0.95, sin(ang * 5.0 - r * 9.0 + tw * 1.6 + 2.1));
      scn = (c1 * s1 + c2 * 0.6 * s2) * (1.2 - r);
      sca = (s1 + 0.6 * s2) * (1.0 - r * 0.7) * 0.85;
    } else if (kind == 2) { // water, with fish
      float dp = q.y * 0.5 + 0.5;
      scn = mix(vec3(0.012, 0.08, 0.16), vec3(0.05, 0.3, 0.42), dp);
      float ca = sin(q.x * 9.0 + t0 * spd * 1.3) * sin(q.y * 7.0 - t0 * spd * 0.9);
      scn += vec3(0.05, 0.13, 0.15) * smoothstep(0.55, 1.0, ca);
      sca = 0.85 * (1.0 - r * 0.35);
      for (int i = 0; i < 4; i++) {
        float fs = seed + float(i) * 13.7;
        float w1f = 0.22 + 0.06 * h11(fs);
        vec2 fp = vec2(sin(t0 * spd * w1f + fs) * 0.55,
                       sin(t0 * spd * (0.31 + 0.05 * h11(fs + 1.0)) + fs * 2.0) * 0.4);
        vec2 fd = q - fp;
        fd.x *= cos(t0 * spd * w1f + fs) > 0.0 ? 1.0 : -1.0;
        fd.y += sin(t0 * spd * 6.0 + float(i)) * 0.012;
        float body = length(vec2(fd.x * 2.4, fd.y * 7.5));
        float tail = length(vec2((fd.x + 0.1) * 4.5, fd.y * 9.0 + sin(fd.x * 40.0 + t0 * spd * 8.0) * 0.12));
        float fish = smoothstep(0.17, 0.1, min(body, tail));
        scn = mix(scn, vec3(0.02, 0.05, 0.07), fish * 0.9);
        scn += vec3(0.1, 0.22, 0.24) * fish * clamp(-fd.y, 0.0, 1.0) * 3.0;
      }
      if (act > 1.2) { // bubbles
        float bc = floor((q.x * 0.5 + 0.5) * 6.0);
        float by = fract(t0 * spd * (0.05 + 0.04 * h11(bc + seed)) + h11(bc * 3.1 + seed));
        vec2 bp = vec2((bc + 0.5) / 3.0 - 1.0 + sin(by * 8.0 + bc) * 0.04, by * 1.6 - 0.8);
        scn += vec3(0.5, 0.8, 0.9) * smoothstep(0.035, 0.014, length(q - bp)) * full2 * 0.6;
      }
    } else if (kind == 4) { // kaleidoscope patterns
      float ang = atan(q.y, q.x);
      float sec = 0.7854;
      float fa = abs(mod(ang, sec * 2.0) - sec);
      vec2 kq = vec2(cos(fa), sin(fa)) * r;
      float pet = smoothstep(0.3, 0.9, sin(kq.x * 11.0 - t0 * spd) * sin(kq.y * 11.0 + t0 * spd * 0.7));
      float ring = smoothstep(0.5, 0.95, sin(r * 14.0 - t0 * spd * 1.5));
      scn = (c1 * pet + c2 * 0.55 * ring) * (1.1 - r * 0.6);
      sca = (pet + 0.5 * ring) * 0.7 * (1.0 - r * 0.5);
    } else if (kind == 5) { // weird blobs, organic who-knows-whats
      float f = 0.0;
      for (int i = 0; i < 4; i++) {
        float bs = seed + float(i) * 7.3;
        vec2 bp = vec2(sin(t0 * spd * (0.3 + 0.15 * h11(bs)) + bs),
                       sin(t0 * spd * (0.4 + 0.1 * h11(bs + 2.0)) + bs * 1.7)) * 0.45;
        f += 0.03 / (dot(q - bp, q - bp) + 0.008);
      }
      float body = smoothstep(1.1, 1.5, f);
      float rim = smoothstep(1.1, 1.25, f) - smoothstep(1.5, 2.2, f);
      scn = c1 * body * 0.5 + c2 * rim * 0.9 + vec3(1.0) * smoothstep(3.5, 6.0, f) * 0.3;
      sca = body * 0.85;
    } else if (kind == 6) { // orrery: lights and spinning objects
      float lamp = pow(smoothstep(0.3, 0.0, r), 2.0);
      scn = mix(vec3(1.0), c1, 0.3) * lamp;
      sca = lamp;
      for (int i = 0; i < 3; i++) {
        float oi = float(i);
        float tilt = max(sin(0.35 + oi * 0.5), 0.2);
        float orad = 0.3 + oi * 0.22;
        float er = abs(length(vec2(q.x, q.y / tilt) / orad) - 1.0);
        float ring = smoothstep(0.05, 0.012, er) * 0.12;
        float ba = t0 * spd * (0.5 - oi * 0.13) + seed + oi * 2.0;
        vec2 bp = vec2(cos(ba), sin(ba) * tilt) * orad;
        float bead = pow(smoothstep(0.09, 0.0, length(q - bp)), 1.5);
        scn += c2 * ring + mix(c1, vec3(1.0), 0.5) * bead;
        sca += ring + bead;
      }
      sca = clamp(sca, 0.0, 0.95);
    } else if (kind == 7) { // reactor core
      float core = pow(smoothstep(0.35, 0.0, r), 1.6) * (0.7 + 0.3 * sin(t0 * spd * 6.0));
      float ang = atan(q.y, q.x);
      float ring1 = smoothstep(0.04, 0.015, abs(r - 0.55)) * step(0.5, fract(ang * 1.2732 + t0 * spd * 0.5));
      float ring2 = smoothstep(0.04, 0.015, abs(r - 0.78)) * step(0.5, fract(ang * 1.9099 - t0 * spd * 0.7));
      float spokes = smoothstep(0.7, 0.95, sin(ang * 6.0 + t0 * spd)) * smoothstep(0.8, 0.45, r) * step(0.3, r) * 0.35;
      scn = c1 * core * 1.3 + c2 * (ring1 + ring2) * 0.9 + c1 * spokes;
      sca = clamp(core + ring1 + ring2 + spokes, 0.0, 0.95);
      scn += vec3(1.0) * core * full2 * 0.5 * step(0.96, sin(t0 * 9.0));
    } else if (kind == 8) { // data rain
      float ci = floor((q.x * 0.5 + 0.5) * 9.0);
      float cs = h11(ci + seed);
      float fall = fract(t0 * spd * (0.15 + 0.25 * cs) + cs * 7.0);
      float yy = fract((q.y * 0.5 + 0.5) + fall);
      float trail = pow(smoothstep(0.45, 1.0, yy), 3.0);
      float cell = step(0.35, h21(vec2(ci, floor((q.y * 0.5 + 0.5) * 22.0))));
      scn = mix(vec3(0.1, 1.0, 0.55), vec3(0.4, 0.9, 1.0), cs) * trail * cell * 1.1;
      sca = trail * cell * 0.85 * (1.0 - r * 0.4);
    } else if (kind == 10) { // gyroscope rings
      for (int i = 0; i < 3; i++) {
        float gi = float(i);
        float w = t0 * spd * (0.4 + gi * 0.23) + seed * gi;
        vec2 gq = rot2(q, gi * 1.05 + sin(w * 0.7) * 0.6);
        float minor = max(abs(cos(w)), 0.12);
        float er = abs(length(vec2(gq.x, gq.y / minor) / (0.75 - gi * 0.18)) - 1.0);
        float ring = smoothstep(0.06, 0.02, er);
        scn += mix(c1, c2, gi * 0.5) * ring * (0.5 + 0.3 * gi);
        sca += ring * 0.45;
      }
      float hub = pow(smoothstep(0.12, 0.0, r), 2.0);
      scn += vec3(1.0) * hub;
      sca = clamp(sca + hub, 0.0, 0.95);
    } else if (kind == 11) { // circuitry
      vec2 cq = q * 4.5 + seed;
      vec2 cel = floor(cq);
      vec2 fr = fract(cq);
      float hx = h21(cel);
      float lines = step(0.35, hx) * smoothstep(0.06, 0.02, abs(fr.y - 0.5));
      lines = max(lines, step(0.7, hx) * smoothstep(0.06, 0.02, abs(fr.x - 0.5)));
      float pp = fract(t0 * spd * 0.3 + hx * 3.0);
      float px = smoothstep(0.12, 0.0, abs(fr.x - pp)) * step(0.35, hx) * smoothstep(0.08, 0.03, abs(fr.y - 0.5));
      float pad = smoothstep(0.12, 0.06, length(fr - 0.5)) * step(0.85, hx);
      scn = c1 * lines * 0.35 + c2 * (px * 1.2 + pad * 0.8);
      sca = (lines * 0.3 + px + pad * 0.7) * (1.0 - r * 0.55);
    } else if (kind == 12) { // snow-globe city
      float bx = floor((q.x * 0.5 + 0.5) * 14.0);
      float bh = 0.15 + 0.55 * h11(bx + seed);
      float inB = step(q.y, -0.55 + bh) * step(-0.55, q.y);
      vec2 wq = vec2(fract((q.x * 0.5 + 0.5) * 14.0), fract((q.y + 0.55) * 10.0));
      float win = step(0.25, wq.x) * step(wq.x, 0.75) * step(0.2, wq.y) * step(wq.y, 0.7);
      float lit = step(0.4, h21(vec2(bx, floor((q.y + 0.55) * 10.0)))) * (0.6 + 0.4 * sin(t0 * 0.5 + bx));
      scn = vec3(0.02, 0.03, 0.05) * inB + vec3(1.0, 0.8, 0.45) * inB * win * lit * (0.3 + 0.7 * vis);
      sca = inB * 0.8;
      float snow = step(0.995, h21(floor(q * 24.0 + vec2(0.0, -t0 * spd * 2.0))));
      scn += vec3(0.8) * snow * full2 * 0.5;
      sca += snow * full2 * 0.3;
      float moon = pow(smoothstep(0.2, 0.0, length(q - vec2(0.35, 0.55))), 1.5);
      scn += vec3(0.9, 0.95, 1.0) * moon * 0.5;
      sca += moon * 0.4;
    } else if (kind == 13) { // storm orb
      vec2 sq = rot2(q, t0 * spd * 0.15);
      float cloud = vnoise(sq * 3.0 + t0 * spd * 0.2) * 0.65 + vnoise(sq * 6.0 - t0 * spd * 0.13) * 0.35;
      scn = mix(vec3(0.05, 0.06, 0.1), vec3(0.25, 0.28, 0.38), cloud);
      scn = mix(scn, c1 * 0.4, smoothstep(0.6, 0.85, cloud) * 0.4);
      sca = 0.8 * (1.0 - r * 0.5);
      if (h11(floor(t0 * 1.7) + floor(seed)) > 0.8 - 0.15 * full2) {
        float fl = pow(fract(-t0 * 1.7), 2.0);
        scn += vec3(0.8, 0.85, 1.0) * fl * (1.2 - cloud) * (0.6 + full2);
        sca = min(sca + fl * 0.4, 0.95);
      }
    } else if (kind == 14) { // ember hive
      vec2 oq = q * 5.0;
      oq.x += mod(floor(oq.y), 2.0) * 0.5;
      vec2 fh = fract(oq) - 0.5;
      float cd = length(fh);
      float wave = 0.5 + 0.5 * sin(t0 * spd * 2.0 - length(floor(oq)) * 0.9);
      float comb = smoothstep(0.48, 0.42, cd) * smoothstep(0.3, 0.42, cd);
      float fill = smoothstep(0.35, 0.1, cd) * wave;
      scn = vec3(1.0, 0.65, 0.2) * (comb * 0.5 + fill * 0.8) * (0.35 + 0.65 * vis);
      sca = (comb * 0.4 + fill * 0.6) * (1.0 - r * 0.55);
      for (int i = 0; i < 5; i++) {
        float bs = seed + float(i) * 5.1;
        vec2 bp = vec2(sin(t0 * spd * (0.8 + 0.3 * h11(bs)) + bs * 3.0),
                       sin(t0 * spd * (1.1 + 0.2 * h11(bs + 1.0)) + bs)) * 0.55;
        float bee = pow(smoothstep(0.05, 0.0, length(q - bp)), 1.2);
        scn += vec3(1.0, 0.85, 0.3) * bee * (0.4 + 0.6 * vis);
        sca += bee * 0.7;
      }
    } else if (kind == 15) { // clockwork
      float ang = atan(q.x, q.y);
      float tick = smoothstep(0.035, 0.015, abs(fract(ang * 1.9099 + 0.5) - 0.5)) * smoothstep(0.92, 0.82, r) * step(0.7, r);
      vec2 mq = rot2(q, t0 * spd * 0.35);
      float hand = smoothstep(0.03, 0.01, abs(mq.x)) * step(0.0, mq.y) * step(mq.y, 0.62);
      vec2 hq = rot2(q, t0 * spd * 0.029);
      hand += smoothstep(0.045, 0.02, abs(hq.x)) * step(0.0, hq.y) * step(hq.y, 0.38);
      vec2 pq = rot2(q - vec2(0.0, -0.1), sin(t0 * spd * 2.4) * 0.5);
      float rod = smoothstep(0.02, 0.008, abs(pq.x)) * step(pq.y, -0.1) * step(-0.75, pq.y) * 0.4;
      float bob = pow(smoothstep(0.09, 0.0, length(pq - vec2(0.0, -0.72))), 1.4);
      scn = vec3(1.0, 0.78, 0.35) * (tick * 0.5 + hand * 0.9 + rod + bob * 1.1);
      sca = clamp(tick * 0.4 + hand * 0.8 + rod * 0.4 + bob, 0.0, 0.95);
    } else if (kind == 16) { // galaxy
      vec2 gq = rot2(q, t0 * spd * 0.06);
      float ang = atan(gq.y, gq.x);
      float armM = smoothstep(0.0, 0.9, sin(ang * 2.0 - log(max(r, 0.05)) * 4.5));
      float sh = h21(floor(gq * 40.0));
      float stars = step(0.93, sh) * (0.5 + 0.5 * sin(t0 * 3.0 + sh * 20.0));
      float coreG = pow(smoothstep(0.5, 0.0, r), 2.2);
      scn = c1 * armM * 0.3 * (1.0 - r * 0.7) + vec3(1.0, 0.95, 0.85) * coreG
        + vec3(0.9) * stars * (0.2 + armM * 0.8) * (1.0 - r * 0.6);
      sca = clamp(armM * 0.3 + coreG + stars * 0.6, 0.0, 0.95);
    } else if (kind == 17) { // the eye that opens
      float open = 0.15 + 0.85 * clamp(act * 0.55, 0.0, 1.0);
      float lid = smoothstep(open + 0.05, open - 0.05, abs(q.y));
      vec2 pc2 = full2 * vec2(sin(t0 * 0.4 + seed), sin(t0 * 0.31 + seed * 2.0)) * 0.12;
      float pr = length(q - pc2);
      float ang = atan(q.y - pc2.y, q.x - pc2.x);
      float iris = smoothstep(0.62, 0.58, pr) * smoothstep(0.16, 0.2, pr);
      float streak = 0.6 + 0.4 * sin(ang * 22.0 + h11(seed) * 40.0);
      scn = mix(c1, c2, streak) * streak * iris * 0.9 * lid;
      scn += vec3(0.9) * pow(smoothstep(0.08, 0.0, length(q - pc2 - vec2(0.1, 0.12))), 2.0) * lid;
      sca = (iris * 0.85 + smoothstep(0.2, 0.16, pr) * 0.9 + smoothstep(0.66, 0.6, pr) * 0.3) * lid;
    } else if (kind == 20) { // the forge
      float pool = smoothstep(-0.35, -0.6, q.y);
      float ripple = 0.5 + 0.5 * sin(q.x * 8.0 + t0 * spd * 2.0) * sin(-q.y * 6.0 - t0 * spd * 1.4);
      scn = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.8, 0.2), ripple * pool) * pool * 1.1;
      sca = pool * 0.9;
      float sxc = floor((q.x * 0.5 + 0.5) * 10.0);
      float ssp = h11(sxc + seed);
      float sy = fract(t0 * spd * (0.2 + 0.2 * ssp) + ssp * 5.0);
      vec2 spq = vec2((sxc + 0.5) / 5.0 - 1.0 + sin(sy * 9.0 + ssp * 7.0) * 0.06, -0.5 + sy * 1.3);
      float spark = smoothstep(0.03, 0.008, length(q - spq)) * (1.0 - sy);
      scn += vec3(1.0, 0.6, 0.15) * spark * 1.3;
      sca += spark;
      scn += vec3(0.6, 0.15, 0.02) * (0.25 + 0.15 * sin(t0 * spd * 3.0)) * smoothstep(0.4, -0.6, q.y) * 0.5;
    } else if (kind == 21) { // singing crystals
      for (int i = 0; i < 5; i++) {
        float csd = seed + float(i) * 11.3;
        vec2 cq2 = q - vec2(h11(csd) * 1.2 - 0.6, -0.65);
        float ht = 0.5 + 0.6 * h11(csd + 1.0);
        float shard = step(abs(cq2.x), (0.08 + 0.1 * h11(csd + 2.0)) * (1.0 - cq2.y / ht))
          * step(0.0, cq2.y) * step(cq2.y, ht);
        float glint = pow(0.5 + 0.5 * sin(t0 * spd * 1.5 + csd * 3.0), 6.0);
        scn += (c1 * 0.25 + c2 * glint * 0.9 + vec3(0.7) * glint * 0.4) * shard;
        sca += shard * (0.3 + glint * 0.6);
      }
      sca = clamp(sca, 0.0, 0.95);
    } else if (kind == 22) { // moons around a hearth
      float coreM = pow(smoothstep(0.3, 0.0, r), 1.8);
      scn = c1 * coreM * 1.2;
      sca = coreM;
      for (int i = 0; i < 3; i++) {
        float ms = seed + float(i) * 4.7;
        float orad = 0.42 + float(i) * 0.2;
        float ma = t0 * spd * (0.5 - float(i) * 0.12) + ms * 10.0;
        vec2 mp = vec2(cos(ma), sin(ma) * 0.55) * orad;
        float moon = smoothstep(0.07 + float(i) * 0.01, 0.01, length(q - mp));
        scn += mix(c2, vec3(0.85), 0.4) * moon * (0.3 + 0.7 * (0.5 + 0.5 * cos(ma)));
        sca += moon * 0.85;
        float trace = smoothstep(0.03, 0.012, abs(length(vec2(q.x, q.y / 0.55) / orad) - 1.0));
        scn += c2 * trace * 0.06;
        sca += trace * 0.08;
      }
    } else if (kind == 23) { // signal beacon
      float ang = atan(q.y, q.x);
      float rotb = t0 * spd * 0.5;
      float b1 = pow(abs(cos(ang - rotb)), 24.0);
      float b2 = pow(abs(cos(ang - rotb + 1.5708)), 60.0) * 0.5;
      float lens = pow(smoothstep(0.18, 0.0, r), 1.5);
      float morse = step(0.5, h11(floor(t0 * 2.5) + floor(seed * 10.0)));
      scn = c1 * (b1 + b2) * (1.0 - r * 0.55) * 0.9 + vec3(1.0) * lens * (0.5 + 0.5 * morse);
      sca = clamp((b1 + b2) * (1.0 - r * 0.4) * 0.8 + lens, 0.0, 0.95);
    } else if (kind == 26) { // the library
      float shelfY = fract((q.y + 1.0) * 1.5);
      float band = floor((q.y + 1.0) * 1.5);
      float sx = (q.x * 0.5 + 0.5) * 16.0;
      float book = floor(sx);
      float bw = h21(vec2(book, band) + floor(seed));
      float spine = step(0.15, fract(sx)) * step(fract(sx), 0.9);
      float inShelf = step(shelfY, 0.55 + 0.35 * bw) * step(0.08, shelfY);
      vec3 bcol = mix(vec3(0.05, 0.18, 0.55), vec3(0.3, 0.7, 1.0), h21(vec2(book * 3.0, band))); // v65.1 the data-centre blues
      bcol = mix(bcol, vec3(0.5, 0.4, 0.15), step(0.7, bw));
      scn = bcol * spine * inShelf * (0.35 + 0.55 * vis) * (0.7 + 0.3 * sin(q.y * 2.0 + 1.0));
      sca = spine * inShelf * 0.75;
      if (act > 1.2) { // a book left its shelf
        vec2 fb = q - vec2(sin(t0 * 0.3 + seed) * 0.4, 0.15 + sin(t0 * 0.23) * 0.2);
        float pages = smoothstep(0.2, 0.05, abs(fb.x) + abs(fb.y) * 2.5) * (0.8 + 0.2 * sin(t0 * 2.0));
        scn += vec3(1.0, 0.95, 0.8) * pages * full2;
        sca += pages * full2 * 0.8;
      }
    } else if (kind == 30) { // v65 the rolled interior, from afar: a soft cloud in its colours
      float nn = n3(vec3(q * 2.2, seed * 0.3 + t0 * 0.05));
      scn = mix(c1, c2, nn) * (0.25 + 0.6 * vis) * (0.5 + 0.5 * nn);
      sca = 0.35 + 0.3 * nn;
    } else if (kind >= 40) { // a painting lives here (p0 = art layer)
      vec2 auv = clamp(q * 0.5 * 0.98 + 0.5, 0.0, 1.0);
      vec3 tex = texture(uArt, vec3(auv.x, 1.0 - auv.y, vD.y)).rgb;
      float breathe = 0.9 + 0.1 * sin(t0 * 0.8) + 0.04 * sin(t0 * 7.3);
      scn = tex * (0.35 + 0.65 * vis) * breathe;
      float lum = max(max(scn.r, scn.g), scn.b);
      sca = clamp(lum * 1.4, 0.0, 0.92);
      float mote = step(0.997, h21(floor(q * 40.0) + floor(t0 * 2.0)));
      scn += mote * full2 * 0.25;
    }
    // v64 PHASE 2: up close the flat picture gives way to the VOLUME — the
    // refracted chord marched through the ball. Gate on screen size (radius
    // over distance: nothing under ~2° of view marches) and on the ball.
    float volK = ballK * hitF * smoothstep(0.016, 0.04, radius / max(dist, 1e-3)) * (kind < 40 ? 1.0 : 0.0);
    if (volK > 0.001 && volL > 0.0) {
      vec3 Lw = vL.w > 1.5 ? normalize(vL.xyz) : normalize(vec3(0.3, 0.8, 0.5));
      vec4 V = volMarch(kind, volE0, volD, volL, t0 * spd, act, c1, c2, seed, Lw);
      scn = mix(scn, V.rgb, volK);
      sca = mix(sca, V.a, volK);
    }
    // crossfade the scene in over the plain glow, held inside the glass
    float mixK = vis * smoothstep(1.0, 0.9, r);
    coreP = mix(coreP, scn, mixK);
    coreA = mix(coreA, clamp(sca, 0.0, 0.95), mixK);
  }

  // the glass shell over the light
  vec4 shell = vec4(0.0);
  if (r < 1.02 && vMisc.x < 0.5) {
    vec2 uv = mix(vUv, N.xy, ballK); // v63: the glass (a rendered ball) by the true normal
    // v64.2/v64.4 (James: "swirling and turning are not the same thing";
    // then "a seam in the middle... a black line"): a PATTERNED shell
    // (frosted / swirl / banded) lives on the ball in WORLD axes and turns
    // about a real tilted axis. v64.2 wrapped the render's whole disc onto
    // each hemisphere — its rim ring met itself at the equator as a black
    // line. Now the ball takes shading + rim from the CLEAN GLASS by the view
    // normal (below, like plain glass) and the pattern is laid on separately:
    // the render's flat centre sampled from three directions in the ball's
    // frame, blended by the normal — no seam anywhere.
    float patK = ballK * step(0.5, vB.z);
    vec3 nB = Nw;
    if (patK > 0.5) {
      vec3 ax = normalize(vec3(sin(seed * 1.3), 0.6 + 0.4 * cos(seed * 2.1), cos(seed * 1.7)));
      float sp = vB.y * uTime * 0.6 + seed;
      float cs = cos(sp), sn = sin(sp);
      nB = Nw * cs + cross(ax, Nw) * sn + ax * dot(ax, Nw) * (1.0 - cs);
    }
    if (ballK > 0.5) {
      // v63.1 (James, lab read: "a strange white pill... turning with the
      // world"): the atlas is a lit render with its highlight baked at
      // lower-left; on a ball it is TURNED TO FACE THE KEY LIGHT so the lit
      // side and the highlight belong to the orb's sun, and never spun —
      // glass does not visibly rotate, only its reflection would, wrongly.
      // Self-lit balls (hearts, eyes, beings) hold the highlight up.
      vec2 D = vL.w > 1.5 ? normalize(vec2(dot(vL.xyz, uRight), dot(vL.xyz, uUp)) + vec2(1e-4, 0.0)) : vec2(0.0, 1.0);
      // the baked highlight sits at -126° in atlas uv (measured on the PNGs);
      // this mat2 is a rotation by -ang, so ang = light angle - highlight angle
      float ang = atan(D.y, D.x) + 2.199;
      float ca = cos(ang), sa = sin(ang);
      uv = mat2(ca, -sa, sa, ca) * uv;
    } else if (vB.y != 0.0) {
      float ang = vB.y * uTime + seed;
      float ca = cos(ang), sa = sin(ang);
      uv = mat2(ca, -sa, sa, ca) * uv;
    }
    shell = textureGrad(uShells, vec3(0.5 + uv * 0.401, mix(vB.z + 4.0 * step(0.5, ballK), 4.0, patK)), dFdx(vUv) * 0.401, dFdy(vUv) * 0.401); // v64.3: balls sample the highlight-free copy; v64.4: a patterned ball takes its shading from the clean glass
    if (patK > 0.5) {
      // the pattern: the highlight-free render's centre (|uv| ≤ 0.55, where its
      // baked shading is flat) sampled on the three planes of the ball's frame,
      // divided by the clean glass at the same spots (so only the streaks
      // remain), blended by the normal, laid over the clean shading
      vec3 w = pow(abs(nB), vec3(4.0));
      w /= max(w.x + w.y + w.z, 1e-4);
      float Lp = vB.z + 4.0;
      vec3 pat = w.x * texture(uShells, vec3(0.5 + nB.yz * 0.22, Lp)).rgb + w.y * texture(uShells, vec3(0.5 + nB.xz * 0.22, Lp)).rgb + w.z * texture(uShells, vec3(0.5 + nB.xy * 0.22, Lp)).rgb;
      vec3 ref = w.x * texture(uShells, vec3(0.5 + nB.yz * 0.22, 4.0)).rgb + w.y * texture(uShells, vec3(0.5 + nB.xz * 0.22, 4.0)).rgb + w.z * texture(uShells, vec3(0.5 + nB.xy * 0.22, 4.0)).rgb;
      shell.rgb *= clamp(pat / max(ref, vec3(0.04)), 0.0, 2.5);
    } // v63: the disc's gradients — the limb compresses uv and would mip the rim ring away
    shell = min(shell * uShellOp, vec4(1.0));
    // v63.2 (James: "the border is way too bright... ruins the effect" on every
    // dark orb): on a ball the atlas's baked rim ring is halved — the limb
    // already reads as an edge from the shading, it does not need a white line
    shell *= 1.0 - ballK * (1.0 - uBallRim) * smoothstep(0.80, 0.97, length(uv)); // v63.3 dialed (ballRim)
  }
  vec3 outP = shell.rgb + coreP * (1.0 - shell.a);
  float outA = shell.a + coreA * (1.0 - shell.a);
  if (portal > 1.5 && portal < 2.5) { outP *= uHeartOp; outA *= uHeartOp; } // v62.1 heart balls: a veil, not a container (halo untouched — the long-range read)

  // v63 the sun on the glass: one key light per orb (its nearest heart,
  // JS-picked) — a soft lit side, a fresnel rim that brightens toward the
  // light, and one hot pin. Modest: the light inside is still the subject.
  // Hearts, eyes and beings are lights themselves (vL.w = 1: ball, unlit).
  {
    float lightK = clamp(vL.w - 1.0, 0.0, 1.0) * ballK * hitF;
    if (lightK > 0.001) {
      vec3 Ld = normalize(vL.xyz);
      float fres = pow(1.0 - bnz, 2.5);
      float ndl = max(dot(Nw, Ld), 0.0);
      vec3 Hh = normalize(Ld - rd);
      float spec = pow(max(dot(Nw, Hh), 0.0), 48.0) * (0.3 + 0.7 * ndl);
      vec3 tint = mix(c1, c2, 0.5);
      float fr = 0.16 * uBallRim; // v63.3 the fresnel edge rides the dial (0.08 at 0.5)
      vec3 lit = tint * (0.07 * ndl + fr * fres * (0.35 + 0.65 * ndl)) + vec3(1.0) * spec * 0.35;
      lit *= lightK * (0.5 + 0.5 * uShellOp);
      outP += lit;
      outA = min(1.0, outA + (0.07 * ndl + fr * fres + spec * 0.35) * lightK * 0.5);
    }
  }

  // halo: v49.1 — a LONG-RANGE effect now (James: the near-field version
  // read as ghost balls, and this is space, not the old cave — no medium to
  // scatter up close). The gate fades the halo in with distance-in-radii:
  // within ~40 radii you see only glass and light; by ~140 radii the halo is
  // fully on, doing its real job — making a far orb read as a glow at all.
  // Heart-flagged things (beacons, the Lantern sun) ride the never-shrink
  // radius, so their gate ratio is constant and they stay lit across the
  // map. Veils exempt: they ARE scattered wash on far rock. Falloff is
  // normalized to THIS instance's quad size so the glow reaches zero before
  // the card's edge, and steeper than before (pow 4) so what remains reads
  // as radiance, not a second shell.
  float haloGate = vMisc.x > 0.5 ? 1.0 : smoothstep(40.0, 140.0, dist / max(radius, 0.001));
  float breath = 0.75 + 0.25 * sin(uTime * 0.5 + seed * 7.0);
  float haloSpan = max(vMisc.y - 0.85, 0.2);
  float haloA = vB.w * uGlow * 0.32 * breath * haloGate *
    pow(clamp(1.0 - (r - 0.85) / haloSpan, 0.0, 1.0), 4.0);
  outP += mix(c1, c2, 1.0 - k) * haloA * 0.8;
  outA = min(1.0, outA + haloA * 0.55);

  // distance haze + near-fade were computed up top (v47)
  frag = vec4(outP, outA) * fogF * nearF;
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);
  const U = {};
  for (const name of ["uVP", "uRight", "uUp", "uShells", "uTime", "uFog", "uGlow", "uShellOp", "uHeartOp", "uFadeScale", "uArt", "uGlyphs", "uSphere", "uBallRim"]) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // v63 the key-light pick: an orb's sun is its nearest heart (hearts are
  // the community node suns, the colony beacons, the Lantern). Direction
  // only — unit, ship space is world-rotation-free so world dirs are fine.
  const heartIdx = [];
  let lightTick = 0;
  function pickLight(o, i) {
    const x = wp[i * 3], y = wp[i * 3 + 1], z = wp[i * 3 + 2];
    let best = -1, bd = Infinity;
    for (let h = 0; h < heartIdx.length; h++) {
      const j = heartIdx[h];
      if (j === i) continue;
      const dx = wp[j * 3] - x, dy = wp[j * 3 + 1] - y, dz = wp[j * 3 + 2] - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) { bd = d2; best = j; }
    }
    if (best < 0) { o.lx = 0.3; o.ly = 0.9; o.lz = 0.3; return; }
    const dx = wp[best * 3] - x, dy = wp[best * 3 + 1] - y, dz = wp[best * 3 + 2] - z;
    const l = Math.sqrt(bd) || 1;
    o.lx = dx / l; o.ly = dy / l; o.lz = dz / l;
  }

  // unit quad
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // instance buffer: 5 vec4 per orb (v47: i4 = kind, p0, p1, activity — the
  // interior/worldlet/creature channel)
  // v63: i5 = key light dir + ball flag (6 vec4 per orb)
  const FLOATS = 24;
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  for (let a = 1; a <= 6; a++) {
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 4, gl.FLOAT, false, FLOATS * 4, (a - 1) * 16);
    gl.vertexAttribDivisor(a, 1);
  }

  // ---- shell textures ----------------------------------------------------------

  const SHELL_NAMES = ["glass", "frosted", "swirl", "banded"];
  const TEXSIZE = 768;
  const shellTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, shellTex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 10, gl.RGBA8, TEXSIZE, TEXSIZE, 8); // v64.3: layers 4–7 = the highlight-free copies balls sample
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uShells, 0);
  // v64.3 (James, twice: "a white pill... looks like a physical object inside
  // the sphere"): the shell renders carry a baked highlight, and no amount of
  // turning it toward the light made it belong to the ball. Balls now sample a
  // HIGHLIGHT-FREE copy: the per-pixel minimum of the render across its own
  // rotations — anything that sits at one angle only (both highlights) is
  // erased, anything symmetric (the shading, the rim ring) survives. Plain
  // glass folds 4 ways (pure clean shading); patterned shells fold 2 ways so
  // half their streaks survive. The only highlight left on a ball is the one
  // the shader's own sun puts there. Discs keep the originals.
  function cleanShellCopy(source, folds) {
    const c = document.createElement("canvas");
    c.width = c.height = TEXSIZE;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(source, 0, 0, TEXSIZE, TEXSIZE);
    const img = x.getImageData(0, 0, TEXSIZE, TEXSIZE);
    const d = img.data, W = TEXSIZE, out = new Uint8ClampedArray(d.length);
    for (let y = 0; y < W; y++) for (let xx = 0; xx < W; xx++) {
      const i = (y * W + xx) * 4;
      // the same pixel after 90° / 180° / 270° turns about the center
      const i90 = ((W - 1 - xx) * W + y) * 4, i180 = ((W - 1 - y) * W + (W - 1 - xx)) * 4, i270 = (xx * W + (W - 1 - y)) * 4;
      for (let k = 0; k < 4; k++) {
        let v = Math.min(d[i + k], d[i180 + k]);
        if (folds === 4) v = Math.min(v, d[i90 + k], d[i270 + k]);
        out[i + k] = v;
      }
    }
    img.data.set(out);
    x.putImageData(img, 0, 0);
    return c;
  }


  // fallback shell drawn in canvas 2D — used when a PNG can't load or WebGL
  // refuses the upload (file:// tainting); the world degrades, not dies
  function fallbackShell(variant) {
    const c = document.createElement("canvas");
    c.width = c.height = TEXSIZE;
    const x = c.getContext("2d");
    const cx = TEXSIZE / 2;
    const R = TEXSIZE * 0.401;
    let g = x.createRadialGradient(cx, cx, 0, cx, cx, R);
    const milk = variant === 1 ? 0.32 : 0.1;
    g.addColorStop(0, "rgba(235,240,250," + milk + ")");
    g.addColorStop(0.82, "rgba(238,242,252," + (milk + 0.08) + ")");
    g.addColorStop(0.94, "rgba(250,252,255,0.75)");
    g.addColorStop(0.985, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cx, R, 0, TAU);
    x.fill();
    g = x.createRadialGradient(cx - R * 0.4, cx - R * 0.42, 0, cx - R * 0.4, cx - R * 0.42, R * 0.35);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx - R * 0.4, cx - R * 0.42, R * 0.35, 0, TAU);
    x.fill();
    return c;
  }

  function uploadShell(layer, source) {
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, shellTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    try {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, TEXSIZE, TEXSIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, TEXSIZE, TEXSIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, fallbackShell(layer));
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  let texReady = false;
  {
    let done = 0;
    SHELL_NAMES.forEach((name, layer) => {
      const img = new Image();
      const finish = (source) => {
        uploadShell(layer, source);
        try { uploadShell(layer + 4, cleanShellCopy(source, layer === 0 ? 4 : 2)); } catch { uploadShell(layer + 4, source); } // file:// taint → the original stands in
        if (++done === 4) {
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, shellTex);
          gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
          texReady = true;
        }
      };
      img.onload = () => finish(img);
      img.onerror = () => finish(fallbackShell(layer));
      img.src = "./assets/orbs/orb-" + name + ".png";
    });
  }

  // ---- interior art + planet maps (v47) --------------------------------------
  // One 1024^2 texture array on unit 3: layers 0-2 are the Meshy interior
  // paintings (the bear, the terrarium, the workshop), layers 3-7 the five
  // planetoid surface maps. Images are drawn through a canvas with a 3.5%
  // inset crop (kills letterbox borders on the generated maps); if a PNG
  // can't load or upload (file://), a procedural painted fallback goes in
  // instead — the world degrades, never dies.
  const ART_SIZE = 1024;
  const ART_FILES = [
    "interior-art/bear-reading", "interior-art/terrarium", "interior-art/workshop",
    "planetoids/planet-lava", "planetoids/planet-ice", "planetoids/planet-gas",
    "planetoids/planet-ocean", "planetoids/planet-desert",
    // v65.3 (James: "10 more planet types... at least six Earth-like"): layers 8–17
    "planetoids/planet-temperate", "planetoids/planet-archipelago", "planetoids/planet-pangaea",
    "planetoids/planet-autumn", "planetoids/planet-monsoon", "planetoids/planet-tundra",
    "planetoids/planet-rust", "planetoids/planet-swamp", "planetoids/planet-crystal",
    "planetoids/planet-pale-giant",
  ];
  const artTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, artTex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 10, gl.RGBA8, ART_SIZE, ART_SIZE, ART_FILES.length);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uArt, 3);

  // painted fallback: banded, seeded washes in a layer-specific palette —
  // close enough that worldlets still read as worlds without the files
  function fallbackArt(layer) {
    const c = document.createElement("canvas");
    c.width = c.height = ART_SIZE;
    const x = c.getContext("2d");
    const R = mulberry32(0xa27 + layer * 77);
    const hues = [[30, 20], [165, 45], [38, 30], [18, 80], [195, 45], [280, 40], [190, 60], [275, 50]][layer] || [200, 40];
    x.fillStyle = "hsl(" + hues[0] + ", " + hues[1] + "%, 6%)";
    x.fillRect(0, 0, ART_SIZE, ART_SIZE);
    for (let i = 0; i < 46; i++) {
      const y = R() * ART_SIZE;
      const h = (hues[0] + (R() - 0.5) * 40 + 360) % 360;
      x.fillStyle = "hsla(" + h + ", " + hues[1] + "%, " + (10 + R() * 30) + "%, " + (0.2 + R() * 0.5) + ")";
      x.fillRect(0, y, ART_SIZE, 8 + R() * 90);
    }
    return c;
  }

  {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = ART_SIZE;
    const cx2 = cnv.getContext("2d");
    let artDone = 0;
    const uploadArt = (layer, img) => {
      cx2.clearRect(0, 0, ART_SIZE, ART_SIZE);
      if (img) {
        const inset = 0.035;
        cx2.drawImage(img,
          img.naturalWidth * inset, img.naturalHeight * inset,
          img.naturalWidth * (1 - 2 * inset), img.naturalHeight * (1 - 2 * inset),
          0, 0, ART_SIZE, ART_SIZE);
      } else {
        cx2.drawImage(fallbackArt(layer), 0, 0);
      }
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, artTex);
      try {
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, ART_SIZE, ART_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
      } catch {
        cx2.clearRect(0, 0, ART_SIZE, ART_SIZE);
        cx2.drawImage(fallbackArt(layer), 0, 0);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, ART_SIZE, ART_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
      }
      if (++artDone === ART_FILES.length) {
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      }
      gl.activeTexture(gl.TEXTURE0);
    };
    ART_FILES.forEach((name, layer) => {
      const img = new Image();
      img.onload = () => uploadArt(layer, img);
      img.onerror = () => uploadArt(layer, null);
      img.src = "./assets/" + name + ".png";
    });
  }

  // ---- the glyph atlas (v47) --------------------------------------------------
  // 64 runes on an 8x8 canvas grid — the colony language, drawn fresh but
  // deterministically every load (seeded strokes on a 4x4 lattice). Unit 4.
  const GLYPH_N = 64; // reef runes: rows 0–7 — reef picks stay in 0..63
  // v56: rows 8–9 hold the TEN Saelyri greeting glyphs (James: "make up
  // ten"), indices SAE_GLYPH0..SAE_GLYPH0+9 — authored marks, not random
  // strokes: a people's shared script, one glyph flashed per greeting.
  const SAE_GLYPH0 = 64;
  {
    const GS = 512, CELL = GS / 8;
    const c = document.createElement("canvas");
    c.width = GS;
    c.height = GS + CELL * 2; // 8x8 runes + 2 rows of greeting glyphs
    const x = c.getContext("2d");
    const R = mulberry32(0x617c9);
    x.lineCap = "round";
    for (let g = 0; g < GLYPH_N; g++) {
      const ox = (g % 8) * CELL, oy = ((g / 8) | 0) * CELL;
      const P = () => [ox + 10 + ((R() * 4) | 0) * ((CELL - 20) / 3), oy + 10 + ((R() * 4) | 0) * ((CELL - 20) / 3)];
      // soft pass then sharp pass: a faint glow bakes right into the atlas
      for (const [w, a] of [[7, 0.35], [3, 1]]) {
        x.strokeStyle = "rgba(255,255,255," + a + ")";
        x.fillStyle = x.strokeStyle;
        x.lineWidth = w;
        const R2 = mulberry32(0x2b1d + g * 131);
        const P2 = () => [ox + 10 + ((R2() * 4) | 0) * ((CELL - 20) / 3), oy + 10 + ((R2() * 4) | 0) * ((CELL - 20) / 3)];
        const strokes = 2 + ((R2() * 4) | 0);
        for (let s = 0; s < strokes; s++) {
          const [x1, y1] = P2(), [x2, y2] = P2();
          x.beginPath();
          if (R2() < 0.3) {
            x.arc(x1, y1, 4 + R2() * 10, 0, TAU * (0.35 + R2() * 0.65));
          } else {
            x.moveTo(x1, y1);
            if (R2() < 0.35) x.quadraticCurveTo((x1 + x2) / 2 + (R2() - 0.5) * 26, (y1 + y2) / 2 + (R2() - 0.5) * 26, x2, y2);
            else x.lineTo(x2, y2);
          }
          x.stroke();
        }
        if (R2() < 0.5) {
          const [dx, dy] = P2();
          x.beginPath();
          x.arc(dx, dy, w * 0.8, 0, TAU);
          x.fill();
        }
      }
      void P;
    }
    // the ten greeting glyphs: each drawn twice (soft wide pass then sharp)
    // so the atlas glow bakes in like the runes above
    {
      const SAE_DRAWS = [
        (cx2, cy2, s) => { // 0: the spiral — "I unfold toward you"
          x.beginPath();
          for (let a = 0; a <= 4.2; a += 0.1) x.lineTo(cx2 + Math.cos(a * 1.9) * a * s * 0.135, cy2 + Math.sin(a * 1.9) * a * s * 0.135);
          x.stroke();
        },
        (cx2, cy2, s) => { // 1: ringed heart — a dot held in two circles
          for (const rr2 of [0.5, 0.28]) { x.beginPath(); x.arc(cx2, cy2, s * rr2, 0, TAU); x.stroke(); }
          x.beginPath(); x.arc(cx2, cy2, s * 0.07, 0, TAU); x.fill();
        },
        (cx2, cy2, s) => { // 2: three rising arcs — the wave of a hand
          for (let k = 0; k < 3; k++) {
            x.beginPath();
            x.arc(cx2, cy2 + s * (0.45 - k * 0.28), s * 0.42, Math.PI * 1.15, Math.PI * 1.85);
            x.stroke();
          }
        },
        (cx2, cy2, s) => { // 3: the lemniscate — "we two, one path"
          x.beginPath();
          for (let a = 0; a <= TAU + 0.1; a += 0.08) {
            const dn = 1 + Math.sin(a) * Math.sin(a);
            x.lineTo(cx2 + (Math.cos(a) / dn) * s * 0.55, cy2 + ((Math.sin(a) * Math.cos(a)) / dn) * s * 0.55);
          }
          x.stroke();
        },
        (cx2, cy2, s) => { // 4: chevron stack — steps of welcome
          for (let k = 0; k < 3; k++) {
            x.beginPath();
            x.moveTo(cx2 - s * 0.4, cy2 - s * 0.3 + k * s * 0.3);
            x.lineTo(cx2, cy2 - s * 0.05 + k * s * 0.3);
            x.lineTo(cx2 + s * 0.4, cy2 - s * 0.3 + k * s * 0.3);
            x.stroke();
          }
        },
        (cx2, cy2, s) => { // 5: orbit and moons — a visitor circling home
          x.beginPath(); x.arc(cx2, cy2, s * 0.13, 0, TAU); x.fill();
          x.beginPath(); x.ellipse(cx2, cy2, s * 0.52, s * 0.24, -0.5, 0, TAU); x.stroke();
          for (const a of [0.7, 3.6]) {
            x.beginPath();
            x.arc(cx2 + Math.cos(a) * s * 0.48, cy2 + Math.sin(a) * s * 0.2, s * 0.06, 0, TAU);
            x.fill();
          }
        },
        (cx2, cy2, s) => { // 6: the branch — one line becomes three
          x.beginPath(); x.moveTo(cx2, cy2 + s * 0.5); x.lineTo(cx2, cy2); x.stroke();
          for (const dx of [-0.35, 0, 0.35]) {
            x.beginPath(); x.moveTo(cx2, cy2);
            x.quadraticCurveTo(cx2 + dx * s * 0.6, cy2 - s * 0.2, cx2 + dx * s, cy2 - s * 0.48);
            x.stroke();
          }
        },
        (cx2, cy2, s) => { // 7: the standing wave — light speaking
          x.beginPath();
          for (let k = 0; k <= 40; k++) {
            const u = k / 40;
            x.lineTo(cx2 + (u - 0.5) * s, cy2 + Math.sin(u * TAU * 1.5) * s * 0.28);
          }
          x.stroke();
        },
        (cx2, cy2, s) => { // 8: triangle in circle — a shape held safely
          x.beginPath(); x.arc(cx2, cy2, s * 0.52, 0, TAU); x.stroke();
          x.beginPath();
          for (let k = 0; k <= 3; k++) {
            const a = -Math.PI / 2 + (k / 3) * TAU;
            x.lineTo(cx2 + Math.cos(a) * s * 0.3, cy2 + Math.sin(a) * s * 0.3);
          }
          x.stroke();
        },
        (cx2, cy2, s) => { // 9: the radiant — eight rays from a quiet center
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU;
            x.beginPath();
            x.moveTo(cx2 + Math.cos(a) * s * 0.18, cy2 + Math.sin(a) * s * 0.18);
            x.lineTo(cx2 + Math.cos(a) * s * 0.52, cy2 + Math.sin(a) * s * 0.52);
            x.stroke();
          }
          x.beginPath(); x.arc(cx2, cy2, s * 0.08, 0, TAU); x.fill();
        },
      ];
      x.lineJoin = "round";
      for (let j = 0; j < SAE_DRAWS.length; j++) {
        const cx2 = (j % 8) * CELL + CELL / 2;
        const cy2 = (8 + ((j / 8) | 0)) * CELL + CELL / 2;
        // the atlas uploads un-flipped (canvas-down = billboard-up), so
        // mirror each authored glyph about its cell center to render upright
        x.save();
        x.translate(0, cy2 * 2);
        x.scale(1, -1);
        for (const [w, a] of [[7, 0.35], [3, 1]]) {
          x.strokeStyle = "rgba(255,255,255," + a + ")";
          x.fillStyle = x.strokeStyle;
          x.lineWidth = w;
          SAE_DRAWS[j](cx2, cy2, CELL - 22);
        }
        x.restore();
      }
    }
    const gt = gl.createTexture();
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, gt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.uniform1i(U.uGlyphs, 4);
    gl.activeTexture(gl.TEXTURE0);
  }

  // ---- orbs ---------------------------------------------------------------------
  // Positions are normalized to [-1,1]^3; world = n * spread. Spread sliders
  // therefore stretch the inhabited volume live.

  const SPINNERS = [0, 0, 0.045, 0.03]; // rad/s by variant; glass+frosted fixed
  let orbs = [];
  let instData = null;
  let order = null;
  let dists = null;

  function huePair() {
    const h1 = rand(0, 360);
    const off = Math.random() < 0.7 ? rand(25, 60) : rand(150, 210);
    return [h1, (h1 + (Math.random() < 0.5 ? off : -off) + 360) % 360];
  }

  function makeWander() {
    return {
      a1: rand(0.45, 1), p1: rand(0, TAU), w1: TAU / rand(50, 190),
      a2: rand(0.25, 0.6), p2: rand(0, TAU), w2: TAU / rand(70, 240),
    };
  }
  const wander = (w, t) =>
    w.a1 * Math.sin(w.w1 * t + w.p1) + w.a2 * Math.sin(w.w2 * t + w.p2);

  function baseOrb(n, portal, dust) {
    const [h1, h2] = huePair();
    const variant = (Math.random() * 4) | 0;
    return {
      n,
      ur: portal ? 0.5 : Math.random(),
      fixedR: dust ? rand(2, 6) : 0,
      h1, h2,
      sat: rand(82, 96),
      fadeDur: dust ? rand(6, 18) : portal ? rand(4.2, 5.6) : rand(16, 44),
      fadePhase: rand(0, TAU),
      spin: portal || dust ? 0 : SPINNERS[variant] * (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 1.4),
      variant: portal || dust ? 0 : variant,
      halo: dust ? 1.7 : portal ? 1.35 : rand(0.75, 1.15),
      seed: rand(0, 100),
      portal: !!portal,
      dust: !!dust,
      // v47: the interior channel — kind selects the scene (0 = plain glow),
      // p0/p1 are its parameters, act is the smoothed 0..2 proximity state,
      // svc the robot-service boost
      kind: 0, p0: 0, p1: 1, act: 0, svc: 0,
      wx: makeWander(), wy: makeWander(), wz: makeWander(),
    };
  }

  // ---- who lives inside (v47) -----------------------------------------------
  // Roughly half the free-floating orbs carry an interior. From far away they
  // are indistinguishable from the plain ones — a vague glowing nothing — and
  // the scene only wakes as you close in. Tech is deliberately common
  // (James's spec); the bear is deliberately rare.
  const PLANET_MAPS = ART_FILES.length - 3; // every planetoid layer after the three paintings
  const TECH_KINDS = [7, 8, 10, 11, 23]; // reactor, data rain, gyro, circuit, beacon (radar cut 2026-09-04, James: "never going to make sense")
  const WONDER_KINDS = [1, 2, 4, 5, 6, 12, 13, 14, 15, 16, 17, 20, 21, 22, 26]; // metronome + jellyfish cut 2026-09-04
  function decorate(o) {
    if (o.portal || o.dust) return o;
    const roll = Math.random();
    if (roll < 0.08) {
      // a worldlet: one of the five planet maps, biased large, tight quad
      o.kind = 50;
      o.p0 = 3 + ((Math.random() * PLANET_MAPS) | 0);
      o.ur = rand(0.7, 1);
      o.p1 = Math.random() < 0.25 ? 1 : 0; // v65.2 rings (p1 = 1)
      o.quadScale = o.p1 ? 2.3 : 1.3;
      o.spin = 0;
      o.halo = 0.5;
      o.sat = rand(55, 80);
    } else if (roll < 0.1) {
      // a painting behind the glass — the bear reads in ~1 orb in 170
      o.kind = 40;
      const a = Math.random();
      o.p0 = a < 0.28 ? 0 : a < 0.62 ? 1 : 2;
      o.ur = rand(0.55, 1);
    } else if (roll < 0.33) {
      o.kind = pick(TECH_KINDS);
    } else if (roll < 0.53) {
      o.kind = pick(WONDER_KINDS);
    } else if (roll < 0.60) {
      // v65 a rolled interior: sixteen 3-bit slots packed into p0/p1 (the
      // Sphere Lab's rolls sheet is where these get culled; a kept roll is
      // its two numbers)
      o.kind = 30;
      let g0 = 0, g1 = 0;
      const gs = []; for (let i = 0; i < 16; i++) gs.push((Math.random() * 8) | 0);
      if (gs[0] === 0 && gs[4] <= 2) gs[4] = 5; // never an empty ball
      for (let i = 0; i < 8; i++) { g0 += gs[i] * 8 ** i; g1 += gs[8 + i] * 8 ** i; }
      o.p0 = g0; o.p1 = g1;
      o.ur = rand(0.6, 1);
    }
    return o;
  }

  function groupedPoint(mode, ctx) {
    switch (mode) {
      case "clusters": {
        const c = pick(ctx.centers);
        return [
          clamp(c[0] + gauss() * 0.13, -1, 1),
          clamp(c[1] + gauss() * 0.2, -1, 1),
          clamp(c[2] + gauss() * 0.13, -1, 1),
        ];
      }
      case "strata": {
        const y = pick(ctx.levels);
        return [rand(-1, 1), clamp(y + gauss() * 0.06, -1, 1), rand(-1, 1)];
      }
      case "river": {
        const t = Math.random();
        return [
          t * 2 - 1,
          clamp(0.45 * Math.sin(t * TAU * 1.3 + ctx.p1) + gauss() * 0.09, -1, 1),
          clamp(0.55 * Math.sin(t * TAU * 0.8 + ctx.p2) + gauss() * 0.12, -1, 1),
        ];
      }
      default:
        return [rand(-1, 1), rand(-1, 1), rand(-1, 1)];
    }
  }

  // The field lives in persistent pools. The count/dust sliders take a prefix
  // of a pool — scrubbing them adds or removes orbs at the far end of the list
  // and NEVER re-rolls the ones already around you. Only "regenerate" and a
  // grouping change re-roll.
  let groupCtx = null;
  let ringOrbs = [];
  let portalOrbs = [];
  // (heartOrb retired 2026-07-18 — makeHeart() below kept for the lore; the
  // skull's mouth-glow pulse in the skull shader carries the Heart's soul)

  // the skull's eyes: two bright red orbs seated in the eye sockets. Socket
  // centers measured from skull.bin (canonical 600m frame, recessed into the
  // openings) × SKULL_SCALE — v52: scale 3 → 20, all numbers × 20/3. Fixed
  // world positions (o.fix), immune to spread sliders and wander; flag 3 in
  // the instance data gives them the heart's never-smaller-than-a-star
  // clause and a red-tinted branch in the fragment shader.
  function makeEyes() {
    return [-1, 1].map((side) => {
      const o = baseOrb([0, 0, 0], false, false);
      o.eye = true;
      // (±1800, −300, 3800) put through the skull's 5° back-tilt (see loader)
      o.fix = [side * 1800, 32.7, 3811.3];
      o.fixedR = 1067;
      o.h1 = 2;
      o.h2 = 357;
      o.sat = 100;
      o.fadeDur = 3.2;
      o.halo = 2.0;
      o.spin = 0;
      o.variant = 0;
      return o;
    });
  }
  // ---- the Reef ---------------------------------------------------------------
  // v49: the colonies moved OUT — they ring the core at ~250km (colonyLayout
  // above; James's spec: 3 reefs, 50% out, roughly mid-plane, seeded jitter),
  // the primary mid-space destinations of the dimension. Originally (v34-v48)
  // a colony ~8.5km from the skull: nine branching
  // mineral growths crusted with pulsing polyps, a drifting haze of spores,
  // and one pale orb nested inside — a hidden bonus exit (the three near home
  // stay the canonical drift choices). Geometry comes from a seeded PRNG:
  // the reef is a monument, identical on every visit, and tmp/orb-dimension/
  // sim.mjs regenerates it exactly for verification. Fixed world coords like
  // the skull — spread sliders don't stretch it, wander doesn't melt it.
  // v35: the reef is a species, not a single monument — the flagship colony
  // (grown ~30%) plus two outlying patches. Every colony checked against the
  // skull buffer, sight corridor, and flight bounds by reef-sim.mjs. The
  // hidden exit lives only in the flagship. NAV's REEF row reads the nearest.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // ---- community layout (v49) -----------------------------------------------
  // The colonies ring the center as a regular polygon — count sets the shape
  // (2 opposed, 3 triangle, 4 square, ...), distance/vertical set where the
  // ring sits, jitter scatters position and height organically (James's
  // layout spec, expansion-spec.md). Seeded and DETERMINISTIC: same dials in,
  // same layout out, every visit — reef-sim extracts and asserts this block.
  // The first vertex starts off-axis so no colony can sit in the +Z spawn
  // sight corridor.
  const LAYOUT_SEED = 0xb17a5e;
  function colonyLayout(n, distKm, vertKm, jitter) {
    const R = mulberry32(LAYOUT_SEED);
    const out = [];
    const base = TAU * 0.125;
    for (let i = 0; i < n; i++) {
      const ang = base + (i / n) * TAU + (R() - 0.5) * jitter * (TAU / n) * 0.5;
      const d = distKm * 1000 * (1 + (R() - 0.5) * jitter * 0.24);
      const y = vertKm * 1000 + (R() - 0.5) * jitter * 36000;
      out.push([Math.cos(ang) * d, y, Math.sin(ang) * d]);
    }
    return out;
  }
  const REEF_COLONIES = [
    { c: null, trees: 12, len: [200, 380], rad: [140, 560], spores: 380, shell: 780 },
    { c: null, trees: 6, len: [120, 240], rad: [100, 340], spores: 160, shell: 520 },
    { c: null, trees: 5, len: [110, 220], rad: [90, 300], spores: 140, shell: 470 },
  ];
  function applyColonyLayout(distKm, vertKm, jitter) {
    const ring = colonyLayout(REEF_COLONIES.length, distKm, vertKm, jitter);
    for (let i = 0; i < REEF_COLONIES.length; i++) REEF_COLONIES[i].c = ring[i];
  }
  const REEF_SEED = 0x5eaf00d;
  // pure geometry from the seed: {p, r, kind 0 mineral | 1 polyp | 2 spore, fam}
  // (copied verbatim into sim.mjs — keep the two in sync)
  function reefGeometry() {
    const R = mulberry32(REEF_SEED);
    const rr = (a, b) => a + R() * (b - a);
    const pts = [];
    const branch = (fam, x, y, z, dx, dy, dz, len, depth) => {
      const steps = Math.max(3, Math.round(len / 7));
      for (let s = 0; s < steps; s++) {
        // gnarl: the direction wanders each step, biased gently back upward
        dx += rr(-0.16, 0.16); dz += rr(-0.16, 0.16);
        dy += rr(-0.1, 0.16) + (0.35 - dy) * 0.04;
        const il = 1 / Math.hypot(dx, dy, dz);
        dx *= il; dy *= il; dz *= il;
        x += dx * 7; y += dy * 7; z += dz * 7;
        const taper = 1 - (s / steps) * 0.55;
        pts.push({ p: [x, y, z], r: rr(2.6, 5.4) * taper * (1 - depth * 0.18), kind: 0, fam });
        if (R() < 0.16) {
          pts.push({ p: [x + rr(-4, 4), y + rr(-4, 4), z + rr(-4, 4)], r: rr(3.5, 8.5), kind: 1, fam });
        }
        if (depth < 2 && s > steps * 0.4 && R() < 0.07) {
          branch(fam, x, y, z, dx + rr(-0.9, 0.9), dy + rr(-0.3, 0.7), dz + rr(-0.9, 0.9), len * rr(0.4, 0.6), depth + 1);
        }
      }
      if (depth < 2) {
        for (let c = 0; c < 2; c++) {
          branch(fam, x, y, z, dx + rr(-1, 1), dy + rr(-0.2, 0.8), dz + rr(-1, 1), len * rr(0.45, 0.65), depth + 1);
        }
      }
    };
    for (const col of REEF_COLONIES) {
      for (let ti = 0; ti < col.trees; ti++) {
        const ang = (ti / col.trees) * TAU + rr(-0.25, 0.25);
        const rad = ti === 0 ? 0 : rr(col.rad[0], col.rad[1]);
        branch(ti % 5,
          col.c[0] + Math.cos(ang) * rad,
          col.c[1] + rr(-90, 40),
          col.c[2] + Math.sin(ang) * rad,
          rr(-0.4, 0.4), 1, rr(-0.4, 0.4), rr(col.len[0], col.len[1]), 0);
      }
      for (let i = 0; i < col.spores; i++) {
        const th = rr(0, TAU), ph = Math.asin(rr(-1, 1)), d = col.shell * Math.cbrt(R());
        pts.push({
          p: [
            col.c[0] + Math.cos(th) * Math.cos(ph) * d,
            col.c[1] + 60 + Math.sin(ph) * d * 0.55,
            col.c[2] + Math.sin(th) * Math.cos(ph) * d,
          ],
          r: rr(1.2, 2.6), kind: 2, fam: (R() * 5) | 0,
        });
      }
    }
    return pts;
  }
  // hue families: teal, magenta, amber, cyan, violet — one per growth
  const REEF_FAMS = [[168, 196], [300, 334], [36, 58], [186, 212], [262, 292]];
  // v47: each colony's polyp positions, for the exchange motes / glyph
  // spawners / creatures to live around. Filled by makeReef.
  let colonyPolyps = [[], [], []];
  const nearestColony = (p) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < REEF_COLONIES.length; i++) {
      const c = REEF_COLONIES[i].c;
      const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  function makeReef() {
    colonyPolyps = REEF_COLONIES.map(() => []);
    const pts = reefGeometry();
    const out = pts.map((pt) => {
      const o = baseOrb([0, 0, 0], false, false);
      const [h1, h2] = REEF_FAMS[pt.fam];
      o.reef = true;
      o.fix = pt.p;
      o.fixedR = pt.r;
      o.spin = 0;
      if (pt.kind === 0) {
        // mineral bone of the colony: dim, desaturated, barely lit. Tight
        // quads (no halo margin) — thousands of these must not multiply
        // blended pixels; the v6 fill-rate lesson stands.
        o.variant = 1;
        o.h1 = h1; o.h2 = h2;
        o.sat = rand(10, 22);
        o.halo = 0.3;
        o.fadeDur = rand(30, 60);
        o.quadScale = 1.35;
      } else if (pt.kind === 1) {
        // polyps: the living light in the family hues. v47: the pulses are
        // COORDINATED now — phase falls with distance from the colony's
        // heart, so waves of light roll outward through the whole growth.
        o.variant = 0;
        o.h1 = rand(h1, h2); o.h2 = rand(h1, h2);
        o.sat = rand(88, 97);
        o.halo = 1.5;
        const ci = nearestColony(pt.p);
        const cc = REEF_COLONIES[ci].c;
        o.fadeDur = 5.2 + ci * 1.3;
        o.fadePhase = -Math.hypot(pt.p[0] - cc[0], pt.p[1] - cc[1], pt.p[2] - cc[2]) / 55;
        colonyPolyps[ci].push(pt.p);
      } else {
        // spores: ember-like motes drifting through the colony
        o.dust = true;
        o.variant = 0;
        o.h1 = rand(h1, h2); o.h2 = rand(h1, h2);
        o.sat = rand(80, 94);
        o.halo = 1.6;
        o.fadeDur = rand(5, 14);
        o.fixAmp = 8; // slow local drift around the fixed seat
      }
      return o;
    });
    // the hidden exit, nested at the flagship's heart among the trunks
    const RC = REEF_COLONIES[0].c;
    const p = baseOrb([0, 0, 0], true, false);
    p.reef = true;
    p.fix = [RC[0] + 40, RC[1] + 130, RC[2] - 25];
    p.fixedR = 26;
    out.push(p);
    // v49 beacons: one heart-flagged glow per colony — fog-proof and never
    // smaller than a star, so from anywhere in the 1,000km gulf each colony
    // reads as a distant smudge of its own family color. Diegetic long-range
    // visibility; the NAV knows the rest.
    for (let ci = 0; ci < REEF_COLONIES.length; ci++) {
      const [h1, h2] = REEF_FAMS[ci % 5];
      const b = baseOrb([0, 0, 0], false, false);
      b.reef = true;
      b.heart = true;
      b.fix = [REEF_COLONIES[ci].c[0], REEF_COLONIES[ci].c[1] + 260, REEF_COLONIES[ci].c[2]];
      b.fixedR = 110;
      b.h1 = rand(h1, h2);
      b.h2 = rand(h1, h2);
      b.sat = 70;
      b.fadeDur = 8 + ci * 2.3;
      b.halo = 2.2;
      b.spin = 0;
      b.variant = 0;
      out.push(b);
    }
    return out;
  }

  // ---- the cooperative societies (v50, capital rebuilt v51): the Cadence +
  // the Saelyri. Four communities of the robot / energy-being cooperative.
  // The capital wraps KORRUDAN ITSELF (James, v51): the intelligence core is
  // built around and through the god-skull at the origin — wrap rings, bone
  // threads, machinery cocoon — with the Saelyri suns on the outer shell and
  // THREE of them feeding energy straight down into the cranium. Three
  // satellites take the OPPOSITE points of a six-pointed star against the
  // reef colonies (James's hexagram spec): colony ideal angles + 60°, at
  // HALF the ring radius, with their own seeded jitter and height. Each
  // community: a lopsided mechanical intelligence core (the Cadence) ringed
  // by 7–9 sun-like energy nodes (the Saelyri) on a jittered dodeca-face
  // shell, joined by light bridges that never cross the middle.
  // Deterministic like everything here — society-sim extracts this block
  // verbatim. Markers: `const SOCIETY_SEED` … `// society hues`.
  const SOCIETY_SEED = 0xcade05ae;
  const CAPITAL_POS = [0, 0, 0]; // v51: the capital IS Korrudan — the skull is its heart
  // v52: the skull is 12km tall (SKULL_SCALE 20). SKULL_EL is the keep
  // ellipsoid — bone extents (canonical ±200.6/±300/±278.9 × 20, 5° tilt)
  // plus crust headroom. Everything that must clear the station uses it:
  // the station grid, capital suns, orb pushes, the city hum.
  const SKULL_EL = [4600, 7100, 6700];
  const COMMUNITIES = [
    // Names are the Cadence's own — machines name themselves in the common
    // tongue, and a society that thinks in clock cycles names its settlements
    // for the degrees of its home chord. scale is filled by applyCommunityLayout.
    { name: "Tonic", c: null, scale: 1, shellR: 0, coreR: 0 },
    { name: "Mediant", c: null, scale: 0, shellR: 0, coreR: 0 },
    { name: "Dominant", c: null, scale: 0, shellR: 0, coreR: 0 },
    { name: "Subdominant", c: null, scale: 0, shellR: 0, coreR: 0 },
  ];
  function communityLayout(colonyDistKm, vertKm, jitter) {
    const R = mulberry32(SOCIETY_SEED);
    const seats = [CAPITAL_POS.slice()];
    const base = TAU * 0.125 + TAU / 6; // the colonies' ideal angles, rotated 60°
    for (let i = 0; i < 3; i++) {
      const ang = base + (i / 3) * TAU + (R() - 0.5) * jitter * (TAU / 3) * 0.5;
      const d = colonyDistKm * 500 * (1 + (R() - 0.5) * jitter * 0.24); // half the ring
      const y = vertKm * 1000 + (R() - 0.5) * jitter * 24000;
      seats.push([Math.cos(ang) * d, y, Math.sin(ang) * d]);
    }
    return seats;
  }
  function applyCommunityLayout(colonyDistKm, vertKm, jitter, satScale) {
    const seats = communityLayout(colonyDistKm, vertKm, jitter);
    for (let i = 0; i < COMMUNITIES.length; i++) {
      COMMUNITIES[i].c = seats[i];
      COMMUNITIES[i].scale = i === 0 ? 1 : satScale;
    }
  }
  // pure geometry from the seed: per community, interleaved vertex arrays for
  // the three passes (15 floats: pos3 norm3 uv2 aux4 center3; aux = kind,
  // phase, extra, fam) plus the node list for beacons/actors. Solid = metal
  // slabs, struts, hypercube frames; glass = iridescent planes, data planes,
  // node crystals; bridge = pulse ribbons between neighbor nodes.
  function communityGeometry(coreKm) {
    const R = mulberry32(SOCIETY_SEED ^ 0x51ee7);
    const rr = (a, b) => a + R() * (b - a);
    const cross3 = (a, b) => [
      a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm3 = (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    };
    const rdir = () => {
      const u = rr(-1, 1), th = rr(0, TAU), s = Math.sqrt(Math.max(0, 1 - u * u));
      return [Math.cos(th) * s, u, Math.sin(th) * s];
    };
    // the 12 face centers of a dodecahedron (= icosahedron vertices): the
    // "d12" seats James described for the node shell
    const PHI = (1 + Math.sqrt(5)) / 2;
    const D12 = [];
    for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
      D12.push(norm3([0, s1, s2 * PHI]), norm3([s1, s2 * PHI, 0]), norm3([s2 * PHI, 0, s1]));
    }
    const out = [];
    for (let ci = 0; ci < COMMUNITIES.length; ci++) {
      const com = COMMUNITIES[ci];
      const S = coreKm * 1000 * com.scale;
      const shellR = S * 1.25;
      const ex = [S * 0.55, S * 0.4, S * 0.45];
      const lop = [rr(0.55, 1), rr(0.55, 1), rr(0.55, 1)]; // squashed negative octants → lopsided
      const solid = { v: [], i: [] }, glass = { v: [], i: [] }, bridge = { v: [], i: [] };
      const vert = (m, p, n, u, v, aux, ec) => {
        m.v.push(p[0], p[1], p[2], n[0], n[1], n[2], u, v, aux[0], aux[1], aux[2], aux[3], ec[0], ec[1], ec[2]);
      };
      const quad = (m, c, eu, ev, aux, ec) => {
        const b = m.v.length / 15;
        const n = norm3(cross3(eu, ev));
        vert(m, [c[0] - eu[0] - ev[0], c[1] - eu[1] - ev[1], c[2] - eu[2] - ev[2]], n, 0, 0, aux, ec);
        vert(m, [c[0] + eu[0] - ev[0], c[1] + eu[1] - ev[1], c[2] + eu[2] - ev[2]], n, 1, 0, aux, ec);
        vert(m, [c[0] + eu[0] + ev[0], c[1] + eu[1] + ev[1], c[2] + eu[2] + ev[2]], n, 1, 1, aux, ec);
        vert(m, [c[0] - eu[0] + ev[0], c[1] - eu[1] + ev[1], c[2] - eu[2] + ev[2]], n, 0, 1, aux, ec);
        m.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
      };
      const frame3 = (d) => {
        const a = norm3(d);
        const ref = Math.abs(a[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
        const b = norm3(cross3(ref, a));
        return [a, b, cross3(a, b)];
      };
      // strut: a thin box from p to q; uv.x runs 0→1 along it (the pulse path)
      const strut = (m, p, q, w, aux) => {
        w *= 0.5; // v67.1 James: "50% as thick as they are"
        const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        // v68.6: aux.z = flag (0 / 2 station) + 4 × length in metres — the
        // shader sizes packets in METRES (James: "fifty feet long... what are they?")
        aux = [aux[0], aux[1], (aux[2] % 4) + 4 * Math.floor(Math.hypot(d[0], d[1], d[2])), aux[3]];
        const [a, b, c2] = frame3(d);
        const ec = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
        for (const [e1, e2] of [[b, c2], [c2, b]]) {
          for (const sgn of [-1, 1]) {
            const off = [e1[0] * w * sgn, e1[1] * w * sgn, e1[2] * w * sgn];
            const bI = m.v.length / 15;
            const n = sgn < 0 ? [-e1[0], -e1[1], -e1[2]] : e1;
            vert(m, [p[0] + off[0] - e2[0] * w, p[1] + off[1] - e2[1] * w, p[2] + off[2] - e2[2] * w], n, 0, 0, aux, ec);
            vert(m, [q[0] + off[0] - e2[0] * w, q[1] + off[1] - e2[1] * w, q[2] + off[2] - e2[2] * w], n, 1, 0, aux, ec);
            vert(m, [q[0] + off[0] + e2[0] * w, q[1] + off[1] + e2[1] * w, q[2] + off[2] + e2[2] * w], n, 1, 1, aux, ec);
            vert(m, [p[0] + off[0] + e2[0] * w, p[1] + off[1] + e2[1] * w, p[2] + off[2] + e2[2] * w], n, 0, 1, aux, ec);
            m.i.push(bI, bI + 1, bI + 2, bI, bI + 2, bI + 3);
          }
        }
      };
      const isCap = ci === 0;
      // v68 DOMINANT IS A STATION (James, 2026-09-05: the satellite cores are
      // "a crazy, ridiculous jumble of granite blocks... no place anybody can
      // live"; his go on the spine-and-ring kernel, built first so he can
      // judge the direction). pads = the seats the buildings take.
      const isStation = ci === 2;
      const pads = [];
      // v69: the station's big members (spine, rings, collar rims, pads) are a
      // BUILDING mesh — 8 floats (pos/400, normal, uv), drawn by the building
      // program with the 02-sphere's tile + assets/buildings/station-light.png
      // (James: "spread that texture all over this entire thing"). uv.x = metres
      // along / 3000 (the map repeats), uv.y = around, in [0.06, 0.84].
      const stn = { v: [], i: [] };
      const envPoint = (f) => {
        const p = [rr(-1, 1), rr(-1, 1), rr(-1, 1)];
        for (let a = 0; a < 3; a++) p[a] *= ex[a] * f * (p[a] < 0 ? lop[a] : 1);
        return p;
      };
      // ring: a strut band — the wrap gesture (v51). segs short struts around
      // an axis; used for core gear-bands everywhere and skull hoops at home.
      const ring = (m, c, ax, rad, segs, w, aux) => {
        const [, b, c2] = frame3(ax);
        let prev = null;
        for (let s = 0; s <= segs; s++) {
          const th = (s / segs) * TAU;
          const p = [
            c[0] + (b[0] * Math.cos(th) + c2[0] * Math.sin(th)) * rad,
            c[1] + (b[1] * Math.cos(th) + c2[1] * Math.sin(th)) * rad,
            c[2] + (b[2] * Math.cos(th) + c2[2] * Math.sin(th)) * rad];
          if (prev) strut(m, prev, p, w, aux);
          prev = p;
        }
      };
      const famHere = ci === 0 ? -1 : (ci * 2) % 5; // the capital speaks in every color
      const pickFam = () => (famHere < 0 || R() < 0.3 ? (R() * 5) | 0 : famHere);
      // -- the Cadence core: glass planes, data planes, slabs, webbing,
      // frames. v52: SATELLITES ONLY — the capital has no machine cloud
      // anymore; Korrudan itself is the capital's body and the crust pass
      // (crustGeometry below) carries its machinery. (Braces guard, inner
      // indentation deliberately untouched — the sim extracts verbatim.)
      if (!isCap && !isStation) {
      for (let i = 0; i < 78; i++) {
        const [a, b] = [rdir(), rdir()];
        const eu = norm3(cross3(a, b));
        const ev = norm3(cross3(a, eu));
        const h1 = rr(0.05, 0.22) * S, h2 = rr(0.05, 0.22) * S;
        quad(glass, envPoint(0.95), [eu[0] * h1, eu[1] * h1, eu[2] * h1],
          [ev[0] * h2, ev[1] * h2, ev[2] * h2], [0, rr(0, TAU), 0, pickFam()], [0, 0, 0]);
      }
      // v67.2: the data planes (48 upright sheets raining yellow dashes) are
      // GONE — James: "sheets of yellow... just doesn't make any sense". Loop
      // kept at zero so the sim's extraction markers stand.
      for (let i = 0; i < 0; i++) {
        const [a, , ] = frame3(rdir());
        const eu = norm3(cross3(Math.abs(a[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], a));
        const ev = cross3(a, eu); // data planes lean upright — readable rain
        const h1 = rr(0.06, 0.18) * S, h2 = rr(0.09, 0.24) * S;
        quad(glass, envPoint(0.85), [eu[0] * h1, eu[1] * h1, eu[2] * h1],
          [ev[0] * h2, ev[1] * h2, ev[2] * h2], [1, rr(0, TAU), 0, pickFam()], [0, 0, 0]);
      }
      for (let i = 0; i < 80; i++) {
        const c = envPoint(0.88);
        const ax = frame3(rdir());
        const h = [rr(0.04, 0.16) * S, rr(0.012, 0.034) * S, rr(0.04, 0.14) * S];
        const aux = [0, rr(0, TAU), 0, pickFam()];
        for (let f = 0; f < 3; f++) {
          const e = ax[f], e1 = ax[(f + 1) % 3], e2 = ax[(f + 2) % 3];
          const he = h[f], s1 = h[(f + 1) % 3], s2 = h[(f + 2) % 3];
          for (const sgn of [-1, 1]) {
            quad(solid,
              [c[0] + e[0] * he * sgn, c[1] + e[1] * he * sgn, c[2] + e[2] * he * sgn],
              [e1[0] * s1, e1[1] * s1, e1[2] * s1],
              [e2[0] * s2 * sgn, e2[1] * s2 * sgn, e2[2] * s2 * sgn],
              aux, c);
          }
        }
      }
      for (let i = 0; i < 220; i++) {
        const p = envPoint(1), q = envPoint(1);
        if (Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < S * 0.18) continue;
        strut(solid, p, q, rr(0.0022, 0.0048) * S, [1, rr(0, TAU), 0, pickFam()]);
      }
      for (let i = 0; i < 16; i++) {
        const c = envPoint(0.7);
        const [a, b, c2] = frame3(rdir());
        const h = rr(0.06, 0.17) * S;
        const aux = [1, rr(0, TAU), 0, pickFam()];
        for (const s of [1, 0.55]) {
          const corners = [];
          for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) for (const s3 of [-1, 1]) {
            corners.push([
              c[0] + (a[0] * s1 + b[0] * s2 + c2[0] * s3) * h * s,
              c[1] + (a[1] * s1 + b[1] * s2 + c2[1] * s3) * h * s,
              c[2] + (a[2] * s1 + b[2] * s2 + c2[2] * s3) * h * s]);
          }
          const E = [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5], [4, 6], [5, 7], [6, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
          for (const [ea, eb] of E) strut(solid, corners[ea], corners[eb], 0.0022 * S, aux);
        }
        // the tesseract gesture: outer corner to inner corner, four of them
        for (const k of [0, 3, 5, 6]) {
          const s1 = [(k & 1) ? 1 : -1, (k & 2) ? 1 : -1, (k & 4) ? 1 : -1];
          const pOut = [
            c[0] + (a[0] * s1[0] + b[0] * s1[1] + c2[0] * s1[2]) * h,
            c[1] + (a[1] * s1[0] + b[1] * s1[1] + c2[1] * s1[2]) * h,
            c[2] + (a[2] * s1[0] + b[2] * s1[1] + c2[2] * s1[2]) * h];
          const pIn = [
            c[0] + (a[0] * s1[0] + b[0] * s1[1] + c2[0] * s1[2]) * h * 0.55,
            c[1] + (a[1] * s1[0] + b[1] * s1[1] + c2[1] * s1[2]) * h * 0.55,
            c[2] + (a[2] * s1[0] + b[2] * s1[1] + c2[2] * s1[2]) * h * 0.55];
          strut(solid, pOut, pIn, 0.0018 * S, aux);
        }
      }
      // -- v51 mechanical complexity pass: gear-bands girdle the core,
      // conduit runs elbow through it, antenna masts bristle off it
      for (let i = 0; i < 6; i++) {
        const c = envPoint(0.35);
        ring(solid, c, rdir(), rr(0.28, 0.6) * S, 14, rr(0.0016, 0.003) * S,
          [1, rr(0, TAU), 0, pickFam()]);
      }
      for (let i = 0; i < 18; i++) {
        let p = envPoint(0.9);
        const ax = frame3(rdir());
        const aux = [1, rr(0, TAU), 0, pickFam()];
        const segs = 3 + ((R() * 3) | 0);
        for (let s = 0; s < segs; s++) {
          const e = ax[(s + ((R() * 3) | 0)) % 3];
          const L = rr(0.05, 0.16) * S * (R() < 0.5 ? -1 : 1);
          const q = [p[0] + e[0] * L, p[1] + e[1] * L, p[2] + e[2] * L];
          strut(solid, p, q, 0.0022 * S, aux);
          p = q;
        }
      }
      for (let i = 0; i < 10; i++) {
        const c = envPoint(0.85);
        const d = norm3(c[0] || c[1] || c[2] ? c : [0, 1, 0]);
        const L = rr(0.1, 0.22) * S;
        const tip = [c[0] + d[0] * L, c[1] + d[1] * L, c[2] + d[2] * L];
        const aux = [1, rr(0, TAU), 0, pickFam()];
        strut(solid, c, tip, 0.0018 * S, aux);
        const [, e1, e2] = frame3(d);
        for (const [u, e] of [[0.45, e1], [0.65, e2], [0.85, e1]]) {
          const b = [c[0] + d[0] * L * u, c[1] + d[1] * L * u, c[2] + d[2] * L * u];
          const arm = rr(0.02, 0.05) * S;
          strut(solid, [b[0] - e[0] * arm, b[1] - e[1] * arm, b[2] - e[2] * arm],
            [b[0] + e[0] * arm, b[1] + e[1] * arm, b[2] + e[2] * arm], 0.0012 * S, aux);
        }
      }
      } // end !isCap — the satellites' machine cores
      if (isStation) {
        // ---- v68 THE SPINE-AND-RING STATION ------------------------------
        // One long spine, four rings around it at stations along its length,
        // each ring joined to a hub on the spine by spokes; the rings carry
        // flat docking pads where the buildings seat (outward and inward, so
        // some hang "upside down"), diagonal bracing between rings, masts at
        // the ends. Every solid goes through the material pass (kind 0 = the
        // titanium mass, kind 1 = braced struts with traffic).
        const ax = norm3([Math.cos(rr(0, TAU)) * 0.94, rr(0.22, 0.4), Math.sin(rr(0, TAU)) * 0.94]);
        const [, sb, sc] = frame3(ax);
        const along = (t) => [ax[0] * t, ax[1] * t, ax[2] * t];
        const add3 = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
        const sc3 = (p, k) => [p[0] * k, p[1] * k, p[2] * k];
        // an n-gon tube from p to q, flat faces, ends extended by ext (for joints)
        const tube = (m, p, q, rad, sides, aux, ext, grid) => {
          let d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
          const [a, b, c2] = frame3(d);
          if (ext) { p = [p[0] - a[0] * ext, p[1] - a[1] * ext, p[2] - a[2] * ext]; q = [q[0] + a[0] * ext, q[1] + a[1] * ext, q[2] + a[2] * ext]; }
          // v68.3: grid = the lights lie on the mesh uv — aux.y carries length·1000 + face width (metres)
          if (grid) aux = [aux[0], Math.floor(Math.hypot(d[0], d[1], d[2]) + 2 * (ext || 0)) * 1000 + Math.floor(2 * rad * Math.sin(Math.PI / sides)), aux[2], aux[3]];
          const ec = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
          for (let k = 0; k < sides; k++) {
            const t0 = (k / sides) * TAU, t1 = ((k + 1) / sides) * TAU;
            const n0 = [b[0] * Math.cos(t0) + c2[0] * Math.sin(t0), b[1] * Math.cos(t0) + c2[1] * Math.sin(t0), b[2] * Math.cos(t0) + c2[2] * Math.sin(t0)];
            const n1 = [b[0] * Math.cos(t1) + c2[0] * Math.sin(t1), b[1] * Math.cos(t1) + c2[1] * Math.sin(t1), b[2] * Math.cos(t1) + c2[2] * Math.sin(t1)];
            const nf = norm3(add3(n0, n1));
            const bI = m.v.length / 15;
            vert(m, add3(p, sc3(n0, rad)), nf, 0, 0, aux, ec);
            vert(m, add3(q, sc3(n0, rad)), nf, 1, 0, aux, ec);
            vert(m, add3(q, sc3(n1, rad)), nf, 1, 1, aux, ec);
            vert(m, add3(p, sc3(n1, rad)), nf, 0, 1, aux, ec);
            m.i.push(bI, bI + 1, bI + 2, bI, bI + 2, bI + 3);
          }
        };
        // a closed box: centre, three axes, half sizes
        const slab = (m, c, e1, e2, e3, h, aux) => {
          const axes = [[e1, e2, e3], [e2, e3, e1], [e3, e1, e2]];
          for (let a = 0; a < 3; a++) {
            const [e, f1, f2] = axes[a];
            const he = h[a], s1 = h[(a + 1) % 3], s2 = h[(a + 2) % 3];
            for (const sgn of [-1, 1]) {
              quad(m, add3(c, sc3(e, he * sgn)), sc3(f1, s1), sc3(f2, s2 * sgn), aux, c);
            }
          }
        };
        const auxS = () => [0, rr(0, TAU), 0, pickFam()];      // rolled tile (pads, small slabs)
        // v68.2: the whole station wears the 02-sphere's metal (aux.z = 2 on slabs AND struts)
        const auxTi = () => [0, rr(0, TAU), 2, pickFam()];
        const auxAr = () => [0, rr(0, TAU), 2, pickFam()];
        const auxPn = () => [0, rr(0, TAU), 2, pickFam()];
        const auxT = () => [1, rr(0, TAU), 2, pickFam()];
        const SC = 400;
        const vS = (p, n, u, v) => stn.v.push(p[0] / SC, p[1] / SC, p[2] / SC, n[0], n[1], n[2], u, v);
        // an n-gon tube into the station mesh; u0 = metres already travelled (rings chain their segments)
        // v74: band = [v0, v1] of the light map this member class owns — spine
        // A 0.06–0.30, rings B 0.32–0.58, service spine + collar rims C 0.60–0.84
        const tubeS = (p, q, rad, sides, ext, u0, band = [0.06, 0.84]) => {
          const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
          const [a, b, c2] = frame3(d);
          if (ext) { p = [p[0] - a[0] * ext, p[1] - a[1] * ext, p[2] - a[2] * ext]; q = [q[0] + a[0] * ext, q[1] + a[1] * ext, q[2] + a[2] * ext]; }
          const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
          for (let k = 0; k < sides; k++) {
            const t0 = (k / sides) * TAU, t1 = ((k + 1) / sides) * TAU;
            const n0 = [b[0] * Math.cos(t0) + c2[0] * Math.sin(t0), b[1] * Math.cos(t0) + c2[1] * Math.sin(t0), b[2] * Math.cos(t0) + c2[2] * Math.sin(t0)];
            const n1 = [b[0] * Math.cos(t1) + c2[0] * Math.sin(t1), b[1] * Math.cos(t1) + c2[1] * Math.sin(t1), b[2] * Math.cos(t1) + c2[2] * Math.sin(t1)];
            const nf = norm3(add3(n0, n1));
            const v0 = band[0] + (band[1] - band[0]) * (k / sides), v1 = band[0] + (band[1] - band[0]) * ((k + 1) / sides);
            const bI = stn.v.length / 8;
            vS(add3(p, sc3(n0, rad)), nf, u0 / 3000, v0);
            vS(add3(q, sc3(n0, rad)), nf, (u0 + len) / 3000, v0);
            vS(add3(q, sc3(n1, rad)), nf, (u0 + len) / 3000, v1);
            vS(add3(p, sc3(n1, rad)), nf, u0 / 3000, v1);
            stn.i.push(bI, bI + 1, bI + 2, bI, bI + 2, bI + 3);
          }
        };
        // a closed box into the station mesh: centre, three axes, half sizes; u along e1
        const slabS = (c, e1, e2, e3, h, u0) => {
          const axes = [[e1, e2, e3, 1, 2], [e2, e3, e1, 2, 0], [e3, e1, e2, 0, 1]];
          for (let a = 0; a < 3; a++) {
            const [e, f1, f2, i1, i2] = axes[a];
            const he = h[a], s1 = h[i1], s2 = h[i2];
            for (const sgn of [-1, 1]) {
              const cc = add3(c, sc3(e, he * sgn));
              const n = sgn < 0 ? sc3(e, -1) : e;
              const eu = sc3(f1, s1), ev = sc3(f2, s2 * sgn);
              const bI = stn.v.length / 8;
              const uw = s1 * 2 / 3000, vw = Math.min(0.05, s2 * 2 / 3000);
              vS(add3(cc, add3(sc3(eu, -1), sc3(ev, -1))), n, u0 / 3000, 0.85); // v74: pads own v 0.85+
              vS(add3(cc, add3(eu, sc3(ev, -1))), n, u0 / 3000 + uw, 0.85);
              vS(add3(cc, add3(eu, ev)), n, u0 / 3000 + uw, 0.85 + vw);
              vS(add3(cc, add3(sc3(eu, -1), ev)), n, u0 / 3000, 0.85 + vw);
              stn.i.push(bI, bI + 1, bI + 2, bI, bI + 2, bI + 3);
            }
          }
        };
        const L = S * 1.15;                 // spine length
        const spineR = S * 0.056;           // ~300 m (v68.1: James, "twice as thick")
        tubeS(along(-L / 2), along(L / 2), spineR, 12, 0, 0, [0.06, 0.30]); // v74: band A, the spine
        // a second, thinner service spine runs beside the main one
        const off2 = add3(sc3(sb, spineR * 2.6), sc3(sc, spineR * 0.8));
        tubeS(add3(along(-L * 0.42), off2), add3(along(L * 0.42), off2), spineR * 0.3, 8, 0, 700, [0.60, 0.84]); // v74: band C, service
        // the rings: four stations along the spine, radii varied, the two
        // middle ones biggest
        const NR = 4;
        const ringT = [-0.36, -0.12, 0.13, 0.37];
        const ringRad = [0.30, 0.42, 0.40, 0.27].map((f) => f * S * rr(0.94, 1.06));
        const tubeR = S * 0.014;            // ~75 m ring tube (v68.2: back to v68 — "I made a mistake with the rings")
        const prevRing = [];
        for (let r = 0; r < NR; r++) {
          const cR = along(ringT[r] * L);
          const rad = ringRad[r];
          const segs = 40;
          const pt = (th) => add3(cR, add3(sc3(sb, Math.cos(th) * rad), sc3(sc, Math.sin(th) * rad)));
          const ext = tubeR * Math.tan(Math.PI / segs) * 1.05;
          const segLen = TAU * rad / segs;
          for (let k = 0; k < segs; k++) tubeS(pt((k / segs) * TAU), pt(((k + 1) / segs) * TAU), tubeR, 8, ext, r * 900 + k * segLen, [0.32, 0.58]); // v74: band B, the habitats
          // an inner rail 12% in, thinner, with traffic
          const rad2 = rad * 0.88;
          const pt2 = (th) => add3(cR, add3(sc3(sb, Math.cos(th) * rad2), sc3(sc, Math.sin(th) * rad2)));
          const railAux = auxT();
          for (let k = 0; k < segs; k++) strut(solid, pt2((k / segs) * TAU), pt2(((k + 1) / segs) * TAU), tubeR * 0.18, railAux);
          // the hub on the spine where this ring's spokes land — v68.1 a
          // TRANSLUCENT collar (glass program, kind 0 iridescent sheet) with
          // two titanium rims; the spokes land on the rims
          const hubR = spineR * 1.45, hubL = S * 0.06;
          tube(glass, add3(cR, along(-hubL)), add3(cR, along(hubL)), hubR, 24, [0, rr(0, TAU), 0, pickFam()], 0);
          for (const sg of [-1, 1]) tubeS(add3(cR, along(sg * hubL)), add3(cR, along(sg * (hubL + S * 0.008))), hubR * 1.06, 16, 0, 1500 + r * 300, [0.60, 0.84]); // v74: band C
          // spokes: eight, hub to ring, with traffic; ladder rungs between neighbours
          const NS = 8;
          const sp0 = rr(0, TAU);
          for (let k = 0; k < NS; k++) {
            const th = sp0 + (k / NS) * TAU;
            const rim = pt(th);
            const hub = add3(cR, add3(sc3(sb, Math.cos(th) * hubR), sc3(sc, Math.sin(th) * hubR)));
            strut(solid, hub, rim, tubeR * 0.36, auxT());
            // a rung between this spoke and the next at 55% out
            const th2 = sp0 + ((k + 1) / NS) * TAU;
            const a1 = add3(cR, add3(sc3(sb, Math.cos(th) * rad * 0.55), sc3(sc, Math.sin(th) * rad * 0.55)));
            const a2 = add3(cR, add3(sc3(sb, Math.cos(th2) * rad * 0.55), sc3(sc, Math.sin(th2) * rad * 0.55)));
            if (k % 2 === 0) strut(solid, a1, a2, tubeR * 0.12, auxT());
          }
          // the docking pads: twelve seats around the ring — outward faces
          // take towers, inward faces (toward the spine) hang them upside
          // down; a pad is a flat slab riding the tube
          const NP = 18;
          const p0 = rr(0, TAU);
          const padW = S * 0.03, padD = S * 0.016, padT = S * 0.004;
          for (let k = 0; k < NP; k++) {
            const th = p0 + (k / NP) * TAU;
            const radial = norm3(add3(sc3(sb, Math.cos(th)), sc3(sc, Math.sin(th))));
            const tang = norm3(cross3(ax, radial));
            const inward = k % 3 === 2;              // every third pad hangs inside
            const dir = inward ? sc3(radial, -1) : radial;
            const c = add3(pt(th), sc3(dir, tubeR + padT));
            slabS(c, tang, dir, ax, [padW, padT, padD], k * 410 + r * 130);
            const roll = R();
            pads.push({
              p: add3(c, sc3(dir, padT)), up: dir, fwd: tang, w: padW, d: padD,
              role: roll < 0.12 ? "farm" : roll < 0.2 ? "lying" : "tower",
              scale: rr(0.06, 0.115) * S, yaw: rr(0, TAU), ring: r,
            });
            // a pad post: a short strut from the pad down into the tube
            strut(solid, add3(c, sc3(tang, padW * 0.6)), add3(pt(th), sc3(tang, padW * 0.6)), tubeR * 0.12, auxT());
          }
          // v68.3 (James): pads on the ring's top and bottom faces too — buildings
          // standing parallel to the spine, up off one face, down off the other
          for (let k = 0; k < 6; k++) {
            const th = p0 + ((k + 0.5) / 6) * TAU;
            const sg = k % 2 === 0 ? 1 : -1;
            const radial = norm3(add3(sc3(sb, Math.cos(th)), sc3(sc, Math.sin(th))));
            const tang = norm3(cross3(ax, radial));
            const dir = sc3(ax, sg);
            const c = add3(pt(th), sc3(dir, tubeR + padT));
            slabS(c, tang, dir, radial, [padW, padT, padD], k * 530 + r * 170 + 2000);
            pads.push({ p: add3(c, sc3(dir, padT)), up: dir, fwd: tang, w: padW, d: padD, role: "tower", scale: rr(0.06, 0.115) * S, yaw: rr(0, TAU), ring: r });
          }
          // diagonal bracing to the previous ring (rim to rim, twisted a step)
          if (prevRing.length) {
            const prev = prevRing[prevRing.length - 1];
            const NB = 10;
            for (let k = 0; k < NB; k++) {
              const th = (k / NB) * TAU;
              strut(solid, prev.pt(th), pt(th + TAU / NB * 0.5), tubeR * 0.13, auxT());
            }
          }
          prevRing.push({ pt, rad });
        }
        // spine end caps: each end takes a big sphere (the 02 building scaled
        // up, sunk a quarter into the spine) plus a mast cluster
        for (const sg of [-1, 1]) {
          const end = along((L / 2) * sg);
          pads.push({ p: add3(end, along(-sg * S * 0.05)), up: sc3(ax, sg), fwd: sb, role: "endcap", scale: S * 0.26, yaw: rr(0, TAU), ring: -1 }); // v68.1 doubled
          // masts off the end module, ribbed
          for (let i = 0; i < 4; i++) {
            const th = rr(0, TAU);
            const d = norm3(add3(sc3(ax, sg * 0.35), add3(sc3(sb, Math.cos(th)), sc3(sc, Math.sin(th)))));
            const base = add3(end, sc3(d, S * 0.13));
            const Lm = rr(0.12, 0.22) * S;
            const tip = add3(base, sc3(d, Lm));
            const aux = auxT();
            strut(solid, base, tip, S * 0.0018, aux);
            const [, e1, e2] = frame3(d);
            for (const [u, e] of [[0.45, e1], [0.65, e2], [0.85, e1]]) {
              const b = add3(base, sc3(d, Lm * u));
              const arm = rr(0.02, 0.05) * S;
              strut(solid, add3(b, sc3(e, -arm)), add3(b, sc3(e, arm)), S * 0.0012, aux);
            }
          }
        }
        // docks: two towers lie along the spine between rings, half sunk in
        for (const t of [-0.245, 0.25]) {
          const th = rr(0, TAU);
          const radial = norm3(add3(sc3(sb, Math.cos(th)), sc3(sc, Math.sin(th))));
          pads.push({ p: add3(along(t * L), sc3(radial, spineR * 0.45)), up: radial, fwd: ax, role: "dock", scale: S * 0.09, yaw: R() < 0.5 ? 0 : Math.PI, ring: -1 });
        }
        // conduit runs elbowing along the spine (the v51 gesture, kept — they
        // read as plumbing on a spine, not noise)
        for (let i = 0; i < 10; i++) {
          let p = add3(along(rr(-0.45, 0.45) * L), add3(sc3(sb, rr(-1, 1) * spineR * 1.3), sc3(sc, rr(-1, 1) * spineR * 1.3)));
          const axes = [ax, sb, sc];
          const aux = auxT();
          const segs = 3 + ((R() * 3) | 0);
          for (let sI = 0; sI < segs; sI++) {
            const e = axes[(R() * 3) | 0];
            const Ls = rr(0.03, 0.12) * S * (R() < 0.5 ? -1 : 1);
            const q = add3(p, sc3(e, Ls));
            strut(solid, p, q, S * 0.0016, aux);
            p = q;
          }
        }
      }
      // -- v51/v52 the Korrudan wrap (capital only): hoops banding the
      // god-skull at bone-hugging radii (now 12km-bone radii), and long
      // threads that pass clean THROUGH the head — the machine grew around
      // its dead heart, then into it. Widths are absolute meters.
      if (isCap) {
        for (let i = 0; i < 10; i++) {
          const ax = norm3([rr(-1, 1), rr(-0.35, 0.35), rr(-1, 1)]); // leaning hoops, never face-on caps
          ring(solid, [0, 0, 0], ax, rr(6400, 9200), 26, rr(24, 44),
            [1, rr(0, TAU), 0, pickFam()]);
        }
        for (let i = 0; i < 26; i++) {
          const d = rdir();
          const off = [rr(-2600, 2600), rr(-2600, 2600), rr(-2600, 2600)];
          const L1 = rr(8000, 15000), L2 = rr(8000, 15000);
          strut(solid,
            [off[0] + d[0] * L1, off[1] + d[1] * L1, off[2] + d[2] * L1],
            [off[0] - d[0] * L2, off[1] - d[1] * L2, off[2] - d[2] * L2],
            rr(26, 48), [1, rr(0, TAU), 0, pickFam()]);
        }
      }
      // -- the Saelyri shell: 7–9 nodes on jittered d12 seats, flattened a
      // touch so the community reads as a place, not a cage
      const nNodes = 7 + ((R() * 3) | 0);
      const order12 = D12.map((d, i) => i);
      for (let i = order12.length - 1; i > 0; i--) {
        const j = (R() * (i + 1)) | 0;
        [order12[i], order12[j]] = [order12[j], order12[i]];
      }
      const nodes = [];
      for (let i = 0; i < nNodes; i++) {
        const d = D12[order12[i]];
        const rad = shellR * (1 + (R() - 0.5) * 0.28);
        const p = [
          d[0] * rad + (R() - 0.5) * 0.22 * shellR,
          (d[1] * rad + (R() - 0.5) * 0.22 * shellR) * 0.78,
          d[2] * rad + (R() - 0.5) * 0.22 * shellR];
        nodes.push({ p, r: shellR * rr(0.055, 0.115), fam: pickFam(), phase: rr(0, TAU) });
      }
      // v52: capital suns hold two courtesies (deterministic pushes, no RNG —
      // the assemble() skull-KEEP pattern): never sink into the station
      // (radial push out of the SKULL_EL ellipsoid, sun radius included),
      // never park between spawn and the face (sightline cylinder along +Z).
      // (The v51 Vess-Karai courtesy retired with the Lantern.)
      if (isCap) {
        for (const nd of nodes) {
          const en = Math.hypot(
            nd.p[0] / (SKULL_EL[0] + nd.r), nd.p[1] / (SKULL_EL[1] + nd.r), nd.p[2] / (SKULL_EL[2] + nd.r));
          if (en < 1.05) {
            const f = 1.05 / Math.max(en, 1e-6);
            nd.p[0] *= f;
            nd.p[1] *= f;
            nd.p[2] *= f;
          }
          const rxy = Math.hypot(nd.p[0], nd.p[1]);
          if (nd.p[2] > 0 && rxy < 2400 + nd.r) {
            const f = ((2400 + nd.r) * 1.15) / Math.max(rxy, 1);
            nd.p[0] *= f;
            nd.p[1] *= f;
          }
        }
      }
      // node crystals (v60, James's hex-home spec — replaces the 11 random
      // glass quads): FIFTEEN hexagonal plates in three orthogonal stacks of
      // five, every plate centered on the sun's own center. Per stack: one
      // full-width plate through the middle, an 87% pair at ±0.5, a 53% pair
      // at ±0.85 (a true sphere section — width = sqrt(1-h²)). Each stack
      // speaks its own family hue so the three axes read apart. The frame is
      // seeded per sun so no two homes sit identically.
      const HEX_HALF = [[0, 1], [0.5, 0.87], [0.85, 0.53]];
      const hexPlate = (m, c, ax, e1, e2, rad, aux, ec) => {
        const b = m.v.length / 15;
        for (let k = 0; k < 6; k++) {
          const th = (k / 6) * TAU;
          const cs = Math.cos(th) * rad, sn = Math.sin(th) * rad;
          vert(m, [c[0] + e1[0] * cs + e2[0] * sn, c[1] + e1[1] * cs + e2[1] * sn, c[2] + e1[2] * cs + e2[2] * sn],
            ax, 0.5 + Math.cos(th) * 0.5, 0.5 + Math.sin(th) * 0.5, aux, ec);
        }
        for (let k = 1; k < 5; k++) m.i.push(b, b + k, b + k + 1);
      };
      // v60.1: the hex plates are the file:// / not-yet-loaded fallback — once
      // the glow-home mesh arrives (assets/homes/, served only) uploadCommunities
      // cuts the glass at homeV0/homeI0 and draws the Meshy home instead.
      const homeV0 = glass.v.length, homeI0 = glass.i.length;
      for (const nd of nodes) {
        const [f0, f1, f2] = frame3(rdir());
        const axes = [[f0, f1, f2], [f1, f2, f0], [f2, f0, f1]];
        // INSIDE the ball: the sun's visible sphere is the heart orb at
        // fixedR = nd.r * 0.5 (makeCommunityOrbs) — corners stay under it.
        // One family per sun (James: the three-hue version was too many colors).
        const big = nd.r * 0.5 * 0.9;
        for (let s = 0; s < 3; s++) {
          const [ax, e1, e2] = axes[s];
          const fam = nd.fam;
          for (const [h, w] of HEX_HALF) {
            for (const sg of (h === 0 ? [1] : [1, -1])) {
              const c = [nd.p[0] + ax[0] * big * h * sg, nd.p[1] + ax[1] * big * h * sg, nd.p[2] + ax[2] * big * h * sg];
              hexPlate(glass, c, ax, e1, e2, big * w, [2, nd.phase, nd.r, fam], nd.p);
            }
          }
        }
      }
      // -- bridges: each node to its 2 nearest neighbors AROUND the shell —
      // never through the middle (James's rule; the sim asserts it)
      const edges = [];
      const hasEdge = (a, b) => edges.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
      const midClear = (a, b) => {
        // distance from the community center to the a→b segment
        const p = nodes[a].p, q = nodes[b].p;
        const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1;
        const t = Math.max(0, Math.min(1, -(p[0] * d[0] + p[1] * d[1] + p[2] * d[2]) / L2));
        return Math.hypot(p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t) > shellR * 0.45;
      };
      const byDist = (a) => nodes.map((nd, i) => i).filter((i) => i !== a).sort((i, j) => {
        const di = Math.hypot(nodes[i].p[0] - nodes[a].p[0], nodes[i].p[1] - nodes[a].p[1], nodes[i].p[2] - nodes[a].p[2]);
        const dj = Math.hypot(nodes[j].p[0] - nodes[a].p[0], nodes[j].p[1] - nodes[a].p[1], nodes[j].p[2] - nodes[a].p[2]);
        return di - dj;
      });
      for (let a = 0; a < nodes.length; a++) {
        let deg = edges.filter((e) => e[0] === a || e[1] === a).length;
        for (const b of byDist(a)) {
          if (deg >= 2) break;
          if (!hasEdge(a, b) && midClear(a, b)) { edges.push([a, b]); deg++; }
        }
      }
      // stitch any separated islands to their closest neighbor island
      const comp = nodes.map((nd, i) => i);
      const find = (x) => (comp[x] === x ? x : (comp[x] = find(comp[x])));
      for (const [a, b] of edges) comp[find(a)] = find(b);
      for (let guard = 0; guard < 12; guard++) {
        const roots = new Set(nodes.map((nd, i) => find(i)));
        if (roots.size < 2) break;
        let best = null, bd = Infinity;
        for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
          if (find(a) === find(b) || !midClear(a, b)) continue;
          const d = Math.hypot(nodes[a].p[0] - nodes[b].p[0], nodes[a].p[1] - nodes[b].p[1], nodes[a].p[2] - nodes[b].p[2]);
          if (d < bd) { bd = d; best = [a, b]; }
        }
        if (!best) break;
        edges.push(best);
        comp[find(best[0])] = find(best[1]);
      }
      // ribbons: two crossed long quads per bridge, trimmed to the node skins;
      // uv.x is the pulse path, aux carries both endpoint families
      for (const [a, b] of edges) {
        const p0 = nodes[a].p, q0 = nodes[b].p;
        const d = norm3([q0[0] - p0[0], q0[1] - p0[1], q0[2] - p0[2]]);
        const p = [p0[0] + d[0] * nodes[a].r, p0[1] + d[1] * nodes[a].r, p0[2] + d[2] * nodes[a].r];
        const q = [q0[0] - d[0] * nodes[b].r, q0[1] - d[1] * nodes[b].r, q0[2] - d[2] * nodes[b].r];
        const w = Math.max(24, Math.min(nodes[a].r, nodes[b].r) * 0.1) * 0.7; // v67.2 James: "slightly less wide" 
        const [, e1, e2] = frame3(d);
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
        const aux = [Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), nodes[b].fam, rr(0, TAU), 0]; // v68.6 aux.x = span in metres
        for (const e of [e1, e2]) {
          const bI = bridge.v.length / 15;
          const n = e === e1 ? e2 : e1;
          vert(bridge, [p[0] - e[0] * w, p[1] - e[1] * w, p[2] - e[2] * w], n, 0, 0, aux, mid);
          vert(bridge, [q[0] - e[0] * w, q[1] - e[1] * w, q[2] - e[2] * w], n, 1, 0, aux, mid);
          vert(bridge, [q[0] + e[0] * w, q[1] + e[1] * w, q[2] + e[2] * w], n, 1, 1, aux, mid);
          vert(bridge, [p[0] + e[0] * w, p[1] + e[1] * w, p[2] + e[2] * w], n, 0, 1, aux, mid);
          bridge.i.push(bI, bI + 1, bI + 2, bI, bI + 2, bI + 3);
        }
      }
      // -- v51 the feeds (capital only): THREE of the suns send energy
      // straight into the head — wide one-way ribbons from sun skin to deep
      // inside the cranium (depth test swallows the tip in the bone).
      // aux.w = 1 marks a feed; the bridge shader streams packets INWARD
      // only. Suns picked greedy-farthest-apart so the beams cage the skull.
      const feeds = [];
      if (isCap && nodes.length >= 3) {
        const pickIdx = [0];
        while (pickIdx.length < 3) {
          let best = -1, bs = -Infinity;
          for (let i = 0; i < nodes.length; i++) {
            if (pickIdx.includes(i)) continue;
            let s = Infinity;
            for (const j of pickIdx) {
              const a = norm3(nodes[i].p), b = norm3(nodes[j].p);
              const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
              s = Math.min(s, Math.acos(dot));
            }
            if (s > bs) { bs = s; best = i; }
          }
          pickIdx.push(best);
        }
        for (const ni of pickIdx) {
          const nd = nodes[ni];
          const tgt = [rr(-900, 900), rr(-400, 1600), rr(-1000, 1000)]; // in the cranium (v52 12km bone)
          const d = norm3([tgt[0] - nd.p[0], tgt[1] - nd.p[1], tgt[2] - nd.p[2]]);
          const p = [nd.p[0] + d[0] * nd.r, nd.p[1] + d[1] * nd.r, nd.p[2] + d[2] * nd.r];
          const w = Math.max(30, nd.r * 0.16) * 0.7; // v67.2 skull feeds narrower too
          const [, e1, e2] = frame3(d);
          const mid = [(p[0] + tgt[0]) / 2, (p[1] + tgt[1]) / 2, (p[2] + tgt[2]) / 2];
          const aux = [Math.hypot(tgt[0] - p[0], tgt[1] - p[1], tgt[2] - p[2]), nd.fam, rr(0, TAU), 1]; // v68.6 aux.x = span in metres
          for (const e of [e1, e2]) {
            const bI = bridge.v.length / 15;
            const n = e === e1 ? e2 : e1;
            vert(bridge, [p[0] - e[0] * w, p[1] - e[1] * w, p[2] - e[2] * w], n, 0, 0, aux, mid);
            vert(bridge, [tgt[0] - e[0] * w, tgt[1] - e[1] * w, tgt[2] - e[2] * w], n, 1, 0, aux, mid);
            vert(bridge, [tgt[0] + e[0] * w, tgt[1] + e[1] * w, tgt[2] + e[2] * w], n, 1, 1, aux, mid);
            vert(bridge, [p[0] + e[0] * w, p[1] + e[1] * w, p[2] + e[2] * w], n, 0, 1, aux, mid);
            bridge.i.push(bI, bI + 1, bI + 2, bI, bI + 2, bI + 3);
          }
          feeds.push({ node: ni, from: nd.p.slice(), to: tgt });
        }
      }
      com.shellR = shellR;
      // v52: the capital's "core" is Korrudan + crust — coreR is the crust
      // envelope radius (orbits and standoffs key off it), not the (absent)
      // machine cloud's envelope
      com.coreR = isCap ? 7400 : Math.max(ex[0], ex[1], ex[2]);
      out.push({ solid, glass, bridge, nodes, edges, feeds, shellR, coreR: com.coreR, homeV0, homeI0, pads, stn: isStation ? stn : null });
    }
    return out;
  }
  // ---- v56 Phase B1 → v61 THE CROWDS: the Saelyri themselves ----------------
  // v61 (James after flying B1 — "teensy and sparse" — and the design he
  // agreed 2026-09-01): a town's people are rolled as GROUPS, each doing one
  // of six verbs, because a crowd reads from CLUSTERING, never from the
  // count (1,000 beings spread evenly on orbits sit ~80 m apart per sun).
  //   0 CONGREGATION — a ring around a sun, morphing in unison (a chorus)
  //   1 STREAM       — a river of commuters riding one light bridge
  //   2 PAIR         — two beings circling each other on a shared orbit
  //   3 GATHERING    — a knot loitering at a landmark: the Korrudan crust at
  //                    the capital, the test towers off Mediant, a bridge-side
  //                    plaza anywhere else
  //   4 HOME TRAFFIC — beings diving into and rising out of the sun's core
  //   5 PLAY         — a chase line looping a sun
  // Congregations and gatherings are TIDAL (saeTide): the group assembles,
  // holds, disperses to private orbits, and comes back. Every pose is a pure
  // function of t (saelyriPose) — nothing integrates, so four thousand
  // beings cost trig and society-sim can prove all of them. The rest of the
  // population (1 − saeKnot) are solos on v56 orbits. At the capital every
  // pose is pushed clear of Korrudan as a last step (the v56 orbit guard,
  // generalized) — society-sim TEST 13 samples it.
  const SAE_VERBS = 7; // v63.6: + formations
  // the test towers stand off Mediant (seatTestBuildings): restated here
  // because BLDG_KINDS is declared later in the file (TDZ at init) and the
  // sim needs this block to stand alone — society-sim counts them
  const SAE_TOWERS = 5;
  const saeSmooth = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  // an orthonormal pair perpendicular to ax
  const saeFrame = (ax) => {
    const ref = Math.abs(ax[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
    let e1 = [
      ref[1] * ax[2] - ref[2] * ax[1],
      ref[2] * ax[0] - ref[0] * ax[2],
      ref[0] * ax[1] - ref[1] * ax[0]];
    const l1 = Math.hypot(e1[0], e1[1], e1[2]) || 1;
    e1 = [e1[0] / l1, e1[1] / l1, e1[2] / l1];
    const e2 = [
      ax[1] * e1[2] - ax[2] * e1[1],
      ax[2] * e1[0] - ax[0] * e1[2],
      ax[0] * e1[1] - ax[1] * e1[0]];
    return [e1, e2];
  };
  const saeEn = (p) => Math.hypot(p[0] / SKULL_EL[0], p[1] / SKULL_EL[1], p[2] / SKULL_EL[2]);
  // closest approach of an orbit circle (center c, axis ax, radius rad) to
  // the bone, in en units (1 = the surface)
  const saeOrbitEnMin = (c, ax, rad) => {
    const [e1, e2] = saeFrame(ax);
    let mn = Infinity;
    for (let s = 0; s < 48; s++) {
      const th = (s / 48) * TAU;
      const ct = Math.cos(th), st = Math.sin(th);
      mn = Math.min(mn, saeEn([
        c[0] + (e1[0] * ct + e2[0] * st) * rad,
        c[1] + (e1[1] * ct + e2[1] * st) * rad,
        c[2] + (e1[2] * ct + e2[2] * st) * rad]));
    }
    return mn;
  };

  // ---- v63.6 THE FORMATIONS (verb 6, James: "a variety of shapes... not just
  // a ring... you could be creative"): a group flies to the seats of a shape,
  // hangs there breathing and slowly turning, trades the odd seat, then breaks
  // away on the tide like a ring. Six shapes, rolled per group, sized to the
  // headcount at ~25 m spacing. Returns { pts: n seats (meters, centered), R }.
  // Pure math (the sim extracts this block).
  function saeFormation(shape, n, R) {
    const S = 25; // the seat spacing
    const pts = [];
    const PHI = (1 + Math.sqrt(5)) / 2;
    // a polyhedron's seats: its vertices, then points along its edges, subdivided
    // until there are enough; n picked by stride so a thin crowd still shows the shape
    const poly = (verts) => {
      let mn = Infinity;
      for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
        if (d < mn) mn = d;
      }
      const edges = [];
      for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
        if (d < mn * 1.02) edges.push([i, j]);
      }
      let k = 0, list = verts.slice();
      while (list.length < n && k < 6) {
        k++;
        list = verts.slice();
        for (const [i, j] of edges) for (let s = 1; s <= k; s++) {
          const u = s / (k + 1);
          list.push([
            verts[i][0] + (verts[j][0] - verts[i][0]) * u,
            verts[i][1] + (verts[j][1] - verts[i][1]) * u,
            verts[i][2] + (verts[j][2] - verts[i][2]) * u]);
        }
      }
      const scale = (S * (k + 1)) / mn; // seats S apart along an edge
      let Rm = 0;
      for (let i = 0; i < n; i++) {
        const p = list[Math.min(list.length - 1, Math.floor((i * list.length) / n))];
        const q = [p[0] * scale, p[1] * scale, p[2] * scale];
        pts.push(q);
        Rm = Math.max(Rm, Math.hypot(q[0], q[1], q[2]));
      }
      return Rm;
    };
    const evenPerms = (a, b, c) => [[a, b, c], [b, c, a], [c, a, b]];
    const signs = (v, out) => {
      for (let sx = -1; sx <= 1; sx += 2) for (let sy = -1; sy <= 1; sy += 2) for (let sz = -1; sz <= 1; sz += 2) {
        const p = [v[0] * sx, v[1] * sy, v[2] * sz];
        if (!out.some((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) + Math.abs(q[2] - p[2]) < 1e-6)) out.push(p);
      }
    };
    let Rm = 0;
    if (shape === 0) {
      // a hollow sphere on the Fibonacci spiral
      const r = Math.max(40, S * Math.sqrt(n / (4 * Math.PI)));
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = i * ga;
        pts.push([Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r]);
      }
      Rm = r;
    } else if (shape === 1) {
      // the Bucky ball (truncated icosahedron) for a big crowd, the dodecahedron
      // or icosahedron for a small one — beings on the vertices, then tracing the edges
      const verts = [];
      if (n >= 50) {
        for (const v of evenPerms(0, 1, 3 * PHI)) signs(v, verts);
        for (const v of evenPerms(1, 2 + PHI, 2 * PHI)) signs(v, verts);
        for (const v of evenPerms(PHI, 2, 2 * PHI + 1)) signs(v, verts);
      } else if (n >= 24) {
        signs([1, 1, 1], verts);
        for (const v of evenPerms(0, 1 / PHI, PHI)) signs(v, verts);
      } else {
        for (const v of evenPerms(0, 1, PHI)) signs(v, verts);
      }
      Rm = poly(verts);
    } else if (shape === 2) {
      // a cube, a pattern on each face (ring / grid / X, rolled per face)
      const q = Math.max(2, Math.ceil(n / 6));
      const side = S * Math.max(2.2, Math.sqrt(q) * 1.35);
      const h = side / 2;
      const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
        [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, -1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]];
      const face = [];
      for (let f = 0; f < 6; f++) {
        const pat = (R() * 3) | 0;
        const uv = [];
        if (pat === 0) for (let i = 0; i < q; i++) { const a = (i / q) * TAU; uv.push([Math.cos(a) * 0.36, Math.sin(a) * 0.36]); }
        else if (pat === 1) { const g = Math.ceil(Math.sqrt(q)); for (let i = 0; i < q; i++) uv.push([((i % g) / Math.max(1, g - 1) - 0.5) * 0.74, (Math.floor(i / g) / Math.max(1, g - 1) - 0.5) * 0.74]); }
        else for (let i = 0; i < q; i++) { const a = (i / q) * TAU + Math.PI / 4, rr2 = (i % 2) ? 0.34 : 0.22; uv.push([Math.cos(a) * rr2, Math.sin(a) * rr2]); } // a diamond ring
        const [nrm, e1, e2] = faces[f];
        for (const [u, v] of uv) face.push([
          nrm[0] * h + (e1[0] * u + e2[0] * v) * side, nrm[1] * h + (e1[1] * u + e2[1] * v) * side, nrm[2] * h + (e1[2] * u + e2[2] * v) * side]);
      }
      for (let i = 0; i < n; i++) pts.push(face[Math.min(face.length - 1, Math.floor((i * face.length) / n))]);
      Rm = h * Math.sqrt(3);
    } else if (shape === 3) {
      // a five-pointed star spun into three dimensions: two pentagrams in
      // perpendicular planes, beings along the lines
      // the two planes share an axis, so seats from both can land on one spot:
      // seats closer than half a spacing are dropped, and the lines are
      // subdivided finer until the headcount fits
      let star = [];
      let r = 40;
      for (let k = Math.max(1, Math.ceil(n / 10)); k < 12 && star.length < n; k++) {
        r = Math.max(40, (S * k) / 1.9);
        star = [];
        for (let plane = 0; plane < 2; plane++) {
          for (let i = 0; i < 5; i++) {
            const rot = Math.PI / 2 + plane * (Math.PI / 5);
            const a0 = (i / 5) * TAU + rot, a1 = (((i + 2) % 5) / 5) * TAU + rot;
            for (let s = 0; s < k; s++) {
              const u = s / k;
              const x = (Math.cos(a0) + (Math.cos(a1) - Math.cos(a0)) * u) * r, y = (Math.sin(a0) + (Math.sin(a1) - Math.sin(a0)) * u) * r;
              const p = plane ? [x, 0, y] : [x, y, 0];
              if (!star.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < S * 0.5)) star.push(p);
            }
          }
        }
      }
      for (let i = 0; i < n; i++) pts.push(star[Math.min(star.length - 1, Math.floor((i * star.length) / n))]);
      Rm = r;
    } else if (shape === 4) {
      // a hexagonal prism, edges traced
      const verts = [];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; verts.push([Math.cos(a), 0.5, Math.sin(a)], [Math.cos(a), -0.5, Math.sin(a)]); }
      Rm = poly(verts);
    } else {
      // the lazy cloud: a loose ball where nobody is too near or too far —
      // jittered cells inside a sphere, seeded, in a shuffled order
      const cell = S * 1.25;
      const r = cell * Math.cbrt((3 * n) / (4 * Math.PI)) * 1.25 + cell * 0.5;
      const cells = [];
      const m = Math.ceil(r / cell);
      for (let x = -m; x <= m; x++) for (let y = -m; y <= m; y++) for (let z = -m; z <= m; z++) {
        const p = [(x + 0.5 + (R() - 0.5) * 0.7) * cell, (y + 0.5 + (R() - 0.5) * 0.7) * cell, (z + 0.5 + (R() - 0.5) * 0.7) * cell];
        if (Math.hypot(p[0], p[1], p[2]) <= r) cells.push(p);
      }
      for (let i = cells.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
      for (let i = 0; i < n; i++) { const p = cells[i % cells.length]; pts.push(p); Rm = Math.max(Rm, Math.hypot(p[0], p[1], p[2])); }
    }
    return { pts, R: Rm };
  }
  function saelyriLayout(geoList, capPop, satPop, groupMul, knotFrac, streamMul, formMul) {
    if (formMul === undefined) formMul = 1;
    const R = mulberry32(SOCIETY_SEED ^ 0x5ae111);
    const rr = (a, b) => a + R() * (b - a);
    const unit = (yMax) => {
      const a = [rr(-1, 1), rr(-yMax, yMax), rr(-1, 1)];
      const l = Math.hypot(a[0], a[1], a[2]) || 1e-6;
      return [a[0] / l, a[1] / l, a[2] / l];
    };
    const mem = [], grp = [];
    for (let ci = 0; ci < COMMUNITIES.length; ci++) {
      const geo = geoList[ci];
      const list = [], groups = [];
      mem.push(list);
      grp.push(groups);
      if (!geo || !geo.nodes.length) continue;
      const isCap = ci === 0;
      const nN = geo.nodes.length;
      const pop = Math.max(0, Math.round(isCap ? capPop : satPop));
      // a bridge carries a stream only if its sagged line clears the bone —
      // a river through the skull would be the v56 orbit bug all over again
      const routes = [];
      for (let ei = 0; ei < geo.edges.length; ei++) {
        const a = geo.nodes[geo.edges[ei][0]].p, b = geo.nodes[geo.edges[ei][1]].p;
        let ok = true;
        for (let s = 0; s <= 24 && ok && isCap; s++) {
          const u = s / 24;
          if (saeEn([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * 20, a[2] + (b[2] - a[2]) * u]) < 1.03) ok = false;
        }
        if (ok) routes.push(ei);
      }
      // how big a sphere around sun ndI clears the bone (meters; Infinity
      // away from the capital) — a bound, from the ellipsoid ratio
      const clearA = (ndI) => {
        if (!isCap) return Infinity;
        const en = saeEn(geo.nodes[ndI].p);
        return Math.max(0, Math.min(SKULL_EL[0], SKULL_EL[1], SKULL_EL[2]) * (en / 1.02 - 1));
      };
      const pickSun = (need) => {
        let ndI = (R() * nN) | 0;
        for (let tries = 0; tries < 24 && clearA(ndI) < need(geo.nodes[ndI]); tries++) ndI = (R() * nN) | 0;
        return ndI;
      };
      // a private orbit around sun ndI (the v56 orbit — every being has one:
      // solos live on it, group members disperse to it at low tide)
      const privateOrbit = (ndI) => {
        const nd = geo.nodes[ndI];
        let axis = unit(0.5), rad = nd.r * rr(1.45, 2.6);
        if (isCap) {
          for (let tries = 0; tries < 24 && saeOrbitEnMin(nd.p, axis, rad) < 1.03; tries++) {
            axis = unit(0.5);
            rad = nd.r * rr(1.45, 2.6);
          }
        }
        return { axis, rad, w: TAU / rr(200, 600), ph: rr(0, TAU) };
      };
      const member = (gi, k, n, ndI) => {
        const po = privateOrbit(ndI);
        return {
          gi, k, u: n > 0 ? k / n : 0,
          ndI, fam: geo.nodes[ndI].fam,
          off: unit(1), // a personal direction: lateral slot, home radial, loiter seat
          rad2: po.rad, axis2: po.axis, w2: po.w, ph2: po.ph,
          mLen: rr(60, 180), mOff: rr(0, 1000), mMelt: 12, mHold: rr(6, 14),
          seed: rr(0, 100),
        };
      };
      // verb weights per town: the capital gathers on the crust and dives
      // into its suns; satellites live on their suns and bridges (James's
      // pick). The stream dial scales the river share.
      const W = isCap
        ? [0.20, 0.20 * streamMul, 0.11, 0.21, 0.10, 0.06, 0.28 * formMul]
        : [0.24, 0.26 * streamMul, 0.10, 0.09, 0.12, 0.06, 0.30 * formMul]; // v63.6: [6] = formations; v64.5 share 0.13 → 0.30 (≈ the rings) × the formations dial
      if (!routes.length) W[1] = 0;
      const target = pop * Math.min(1, Math.max(0, knotFrac));
      let inGroups = 0;
      let guard = 0;
      // the verb mix follows the weights EXACTLY (largest-deficit pick with a
      // seeded tie-break) — a random draw left one seed's capital with twice
      // its share of rivers; James tunes weights, so the roll must honor them
      let towerSeated = false;
      const wSum = W[0] + W[1] + W[2] + W[3] + W[4] + W[5] + W[6];
      const dealt = [0, 0, 0, 0, 0, 0, 0];
      while (target - inGroups >= 2 && guard++ < 4000) {
        let verb = 0, best = -Infinity;
        const jit = R() * 0.001;
        for (let v = 0; v < SAE_VERBS; v++) {
          if (W[v] <= 0) continue;
          const deficit = (W[v] / wSum) * (groups.length + 1) - dealt[v] + (v === 0 ? jit : 0);
          if (deficit > best) { best = deficit; verb = v; }
        }
        dealt[verb]++;
        const n0 = verb === 0 ? rr(12, 40) : verb === 1 ? rr(20, 40) : verb === 2 ? 2
          : verb === 3 ? rr(10, 40) : verb === 4 ? rr(6, 20) : verb === 6 ? rr(14, 40) : rr(3, 8);
        let n = verb === 2 ? 2 : Math.max(2, Math.round(n0 * groupMul));
        n = Math.min(n, Math.max(2, Math.round(target - inGroups)));
        const g = { verb, n, gi: groups.length, seed: rr(0, 100), period: rr(140, 320), tOff: rr(0, 1), ndI: 0, fam: 0 };
        if (verb === 0) {
          // a ring around a sun, slowly turning; the whole ring shares one
          // morph clock (the chorus). Guarded like an orbit at the capital.
          g.ndI = pickSun((nd) => nd.r * 2.3);
          const nd = geo.nodes[g.ndI];
          // the ring is TIGHT — beings ~22 m apart, a knot of light (the
          // crowd-lab round-1 lesson: a ring sized to the sun put them 300 m
          // apart and nothing read as a crowd). The ring's CENTER rides an
          // orbit around the sun; the ring itself turns in its own plane.
          g.ringR = Math.max(60, (n * 22) / TAU);
          g.axis = unit(0.5);
          g.rad = nd.r * rr(1.3, 2.2);
          if (isCap) {
            for (let tries = 0; tries < 24 && saeOrbitEnMin(nd.p, g.axis, g.rad) < 1.03 + g.ringR / SKULL_EL[0]; tries++) {
              g.axis = unit(0.5);
              g.rad = nd.r * rr(1.3, 2.2);
            }
          }
          g.w = TAU / rr(240, 700);
          g.ph = rr(0, TAU);
          g.axis2 = unit(1); // the ring's own plane
          g.w2 = TAU / rr(90, 220); // the ring turns in place
          g.mLen = rr(45, 120);
          g.mOff = rr(0, 1000);
          g.mHold = rr(6, 14);
        } else if (verb === 1) {
          // a column of commuters riding one bridge, one way; the column is
          // a fraction of the span so it reads as a river, not a picket
          g.edge = routes[(R() * routes.length) | 0];
          g.dir = R() < 0.5 ? -1 : 1;
          g.ndI = geo.edges[g.edge][g.dir > 0 ? 0 : 1];
          g.period = rr(90, 200);
          g.col = rr(0.12, 0.2); // ~30–60 m apart in the column (round-1 lab: 0.22–0.34 read as a picket)
        } else if (verb === 2) {
          // two beings on a shared private orbit, circling each other
          g.ndI = pickSun((nd) => nd.r * 2.7);
          const po = privateOrbit(g.ndI);
          g.axis = po.axis; g.rad = po.rad; g.w = po.w; g.ph = po.ph;
          g.sep = rr(9, 16);
          g.w2 = TAU / rr(14, 34);
        } else if (verb === 3) {
          // a knot at a landmark. Capital: a standoff seat on the bone,
          // never on the face (the face stays bare — the Knowhere rule).
          // Mediant: mostly the towers. Elsewhere: a plaza beside a bridge.
          let anchor;
          if (isCap) {
            let dir = unit(1);
            for (let tries = 0; tries < 24 && dir[2] > 0.45; tries++) dir = unit(1);
            const en = rr(1.08, 1.14);
            anchor = [dir[0] * SKULL_EL[0] * en, dir[1] * SKULL_EL[1] * en, dir[2] * SKULL_EL[2] * en];
            g.spread = Math.min(110, 12 * Math.sqrt(n)); // sized to the headcount (~25 m apart); ≤110 keeps the bone guard honest
          } else if (ci === 1 && (!towerSeated || R() < 0.7)) {
            towerSeated = true; // v63.6: Mediant's first gathering is always at the towers (the roll moved when formations joined the deal)
            const k = (R() * SAE_TOWERS) | 0;
            const sh = geo.shellR;
            anchor = [sh * 1.6 + k * 900 + rr(-60, 60), -200 + rr(120, 340), sh * 0.4 + rr(-60, 60)];
            g.spread = 12 * Math.sqrt(n);
          } else {
            const e = geo.edges[(R() * geo.edges.length) | 0];
            const a = geo.nodes[e[0]].p, b = geo.nodes[e[1]].p;
            const u = rr(0.35, 0.65);
            const side = unit(0.3);
            const off = geo.shellR * 0.06;
            anchor = [
              a[0] + (b[0] - a[0]) * u + side[0] * off,
              a[1] + (b[1] - a[1]) * u + side[1] * off,
              a[2] + (b[2] - a[2]) * u + side[2] * off];
            g.spread = 12 * Math.sqrt(n);
          }
          g.anchor = anchor;
          // home sun = the nearest (the dispersed pose orbits it)
          let best = 0, bd = Infinity;
          for (let i = 0; i < nN; i++) {
            const p = geo.nodes[i].p;
            const d = Math.hypot(p[0] - anchor[0], p[1] - anchor[1], p[2] - anchor[2]);
            if (d < bd) { bd = d; best = i; }
          }
          g.ndI = best;
        } else if (verb === 4) {
          // traffic into and out of the sun's core along personal radials;
          // the outer turn is bounded by what clears the bone
          g.ndI = pickSun((nd) => nd.r * 1.4);
          g.period = rr(50, 110);
          g.outer = Math.max(0.6, Math.min(1.32, clearA(g.ndI) / geo.nodes[g.ndI].r));
          // one LANE per group (round-1 lab lesson: personal radials scattered
          // the traffic over the whole ball; a shared lane reads as a column
          // of lights streaming in and out). Outward at the capital.
          g.lane = unit(1);
          if (isCap) {
            const p = geo.nodes[g.ndI].p;
            const l = Math.hypot(p[0], p[1], p[2]) || 1;
            for (let tries = 0; tries < 24 && (g.lane[0] * p[0] + g.lane[1] * p[1] + g.lane[2] * p[2]) / l < 0.25; tries++) g.lane = unit(1);
          }
        } else if (verb === 6) {
          // v63.6 a formation: the shape's seats, its center on a slow orbit
          // around a sun (guarded like a ring at the capital by the shape's
          // radius), the whole shape turning in place, a chorus morph clock,
          // and a seat-trade clock so it never freezes
          g.shape = (R() * 6) | 0;
          const fm = saeFormation(g.shape, n, R);
          g.seats = fm.pts;
          g.formR = fm.R;
          g.ndI = pickSun((nd) => nd.r * 2.3 + fm.R);
          const nd = geo.nodes[g.ndI];
          g.axis = unit(0.5);
          g.rad = nd.r * rr(1.4, 2.3);
          if (isCap) {
            for (let tries = 0; tries < 24 && saeOrbitEnMin(nd.p, g.axis, g.rad) < 1.03 + g.formR / SKULL_EL[0]; tries++) {
              g.axis = unit(0.5);
              g.rad = nd.r * rr(1.4, 2.3);
            }
          }
          g.w = TAU / rr(300, 800);
          g.ph = rr(0, TAU);
          g.axis2 = unit(1);
          g.w2 = (TAU / rr(140, 320)) * (R() < 0.5 ? -1 : 1);
          g.swapLen = rr(34, 70);
          g.mLen = rr(45, 120);
          g.mOff = rr(0, 1000);
          g.mHold = rr(6, 14);
        } else {
          // a chase line on a lissajous loop around a sun
          g.ndI = pickSun((nd) => nd.r * 2.5);
          const nd = geo.nodes[g.ndI];
          g.amp = Math.min(nd.r * rr(1.2, 2.0), Math.max(nd.r * 0.7, clearA(g.ndI)));
          const f = TAU / rr(60, 140);
          g.fa = f; g.fb = f * 1.37; g.fc = f * 0.71;
          g.lag = rr(0.5, 1.1);
        }
        g.fam = geo.nodes[g.ndI].fam;
        for (let k = 0; k < n; k++) {
          const mm = member(g.gi, k, n, g.ndI);
          if (verb === 6) mm.seat = g.seats[k];
          list.push(mm);
        }
        groups.push(g);
        inGroups += n;
      }
      // solos: the remainder on private orbits (the v56 life, minus the
      // travelers — the streams took that job)
      for (let i = inGroups; i < pop; i++) list.push(member(-1, 0, 0, pickSun((nd) => nd.r * 2.7)));
    }
    return { mem, grp };
  }
  // ---- the crowd's clocks: pure functions of t ------------------------------
  // tide: 0 = dispersed to private orbits, 1 = assembled (congregations and
  // gatherings). Assembled about half the cycle, apart about a third, easing
  // between. The saeTide dial multiplies the clock.
  function saeTide(g, t, tideMul) {
    const ph = (((t * tideMul) / g.period + g.tOff) % 1 + 1) % 1;
    return saeSmooth(ph / 0.16) * (1 - saeSmooth((ph - 0.66) / 0.18));
  }
  // the private orbit (community-local)
  function saePrivate(m, geo, t, out) {
    const nd = geo.nodes[m.ndI];
    const [e1, e2] = saeFrame(m.axis2);
    const th = t * m.w2 + m.ph2;
    const ct = Math.cos(th), st = Math.sin(th);
    out[0] = nd.p[0] + (e1[0] * ct + e2[0] * st) * m.rad2;
    out[1] = nd.p[1] + (e1[1] * ct + e2[1] * st) * m.rad2;
    out[2] = nd.p[2] + (e1[2] * ct + e2[2] * st) * m.rad2;
  }
  const saePB = [0, 0, 0];
  // where member m of group g (null = solo) is at time t, community-local.
  // Returns the assembled amount: 1 for the always-on verbs, the tide for
  // congregations and gatherings, 0 for solos. isCap pushes the pose clear
  // of Korrudan as the last step (a chord between two exterior points can
  // still cut the bone — the low-tide blend is one).
  function saelyriPose(g, m, geo, t, tideMul, out, isCap) {
    let tide = 0;
    if (!g) {
      saePrivate(m, geo, t, out);
    } else {
      const nd = geo.nodes[g.ndI];
      tide = 1;
      if (g.verb === 0) {
        tide = saeTide(g, t, tideMul);
        const [e1, e2] = saeFrame(g.axis);
        const th = t * g.w + g.ph;
        const ct = Math.cos(th), st = Math.sin(th);
        const [r1, r2] = saeFrame(g.axis2);
        const th2 = t * g.w2 + m.u * TAU;
        const c2 = Math.cos(th2) * g.ringR, s2 = Math.sin(th2) * g.ringR;
        out[0] = nd.p[0] + (e1[0] * ct + e2[0] * st) * g.rad + r1[0] * c2 + r2[0] * s2;
        out[1] = nd.p[1] + (e1[1] * ct + e2[1] * st) * g.rad + r1[1] * c2 + r2[1] * s2;
        out[2] = nd.p[2] + (e1[2] * ct + e2[2] * st) * g.rad + r1[2] * c2 + r2[2] * s2;
      } else if (g.verb === 1) {
        const [ea, eb] = geo.edges[g.edge];
        const na = geo.nodes[g.dir > 0 ? ea : eb], nb = geo.nodes[g.dir > 0 ? eb : ea];
        const a = na.p, b = nb.p;
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const L = Math.hypot(dx, dy, dz) || 1;
        // the column emerges from inside a's heart and vanishes into b's —
        // a being appears where the ball's own glow hides the seam
        const ua = (na.r * 0.45) / L, ub = 1 - (nb.r * 0.45) / L;
        const u = (((t * tideMul) / g.period + m.u * g.col + g.tOff) % 1 + 1) % 1;
        const uu = ua + u * (ub - ua);
        // lateral slot across the span, a little sag under the bridge line
        const [s1, s2] = saeFrame([dx / L, dy / L, dz / L]);
        const lat = m.off[0] * 10, lift = m.off[1] * 6 - Math.sin(uu * Math.PI) * 20;
        out[0] = a[0] + dx * uu + s1[0] * lat + s2[0] * lift;
        out[1] = a[1] + dy * uu + s1[1] * lat + s2[1] * lift;
        out[2] = a[2] + dz * uu + s1[2] * lat + s2[2] * lift;
      } else if (g.verb === 2) {
        const [e1, e2] = saeFrame(g.axis);
        const th = t * g.w + g.ph;
        const ct = Math.cos(th), st = Math.sin(th);
        const th2 = t * g.w2 + (m.k ? Math.PI : 0);
        const c2 = Math.cos(th2) * g.sep * 0.5, s2 = Math.sin(th2) * g.sep * 0.5;
        out[0] = nd.p[0] + (e1[0] * ct + e2[0] * st) * g.rad + e1[0] * c2 + e2[0] * s2;
        out[1] = nd.p[1] + (e1[1] * ct + e2[1] * st) * g.rad + e1[1] * c2 + e2[1] * s2;
        out[2] = nd.p[2] + (e1[2] * ct + e2[2] * st) * g.rad + e1[2] * c2 + e2[2] * s2;
      } else if (g.verb === 3) {
        tide = saeTide(g, t, tideMul);
        const sp = g.spread * (0.35 + 0.65 * m.u);
        out[0] = g.anchor[0] + m.off[0] * sp + Math.sin(t * 0.21 + m.seed) * 6;
        out[1] = g.anchor[1] + m.off[1] * sp * 0.6 + Math.sin(t * 0.17 + m.seed * 1.3) * 4;
        out[2] = g.anchor[2] + m.off[2] * sp + Math.cos(t * 0.19 + m.seed) * 6;
      } else if (g.verb === 4) {
        // in and out of the core: cosine, so the being dwells at both ends
        const s = (((t * tideMul) / g.period + m.u) % 1 + 1) % 1;
        const r = nd.r * (0.12 + (g.outer - 0.12) * (0.5 - 0.5 * Math.cos(TAU * s)));
        // the lane, with a personal lateral slot (off across the lane, ~18 m)
        const dl = m.off[0] * g.lane[0] + m.off[1] * g.lane[1] + m.off[2] * g.lane[2];
        out[0] = nd.p[0] + g.lane[0] * r + (m.off[0] - g.lane[0] * dl) * 18;
        out[1] = nd.p[1] + g.lane[1] * r + (m.off[1] - g.lane[1] * dl) * 18;
        out[2] = nd.p[2] + g.lane[2] * r + (m.off[2] - g.lane[2] * dl) * 18;
      } else if (g.verb === 6) {
        // v63.6 the formation: center on its orbit, the seat turned about the
        // shape's own axis, a breath, a seat trade with the partner (k ^ 1)
        // on the pair's own clock, and a slow personal drift in the lazy cloud
        tide = saeTide(g, t, tideMul);
        const [e1, e2] = saeFrame(g.axis);
        const th = t * g.w + g.ph;
        const ct = Math.cos(th), st = Math.sin(th);
        const cx = nd.p[0] + (e1[0] * ct + e2[0] * st) * g.rad;
        const cy = nd.p[1] + (e1[1] * ct + e2[1] * st) * g.rad;
        const cz = nd.p[2] + (e1[2] * ct + e2[2] * st) * g.rad;
        const j = (m.k ^ 1) < g.n ? m.k ^ 1 : m.k;
        const pairPh = (((t / g.swapLen) + (m.k >> 1) * 0.173 + g.tOff) % 1 + 1) % 1;
        const sw = saeSmooth((pairPh - 0.42) / 0.1) * (1 - saeSmooth((pairPh - 0.86) / 0.1));
        const sa = m.seat, sb = g.seats[j];
        let px = sa[0] + (sb[0] - sa[0]) * sw, py = sa[1] + (sb[1] - sa[1]) * sw, pz = sa[2] + (sb[2] - sa[2]) * sw;
        if (g.shape === 5) {
          px += Math.sin(t * 0.13 + m.seed) * 6; py += Math.sin(t * 0.11 + m.seed * 1.7) * 5; pz += Math.cos(t * 0.12 + m.seed * 0.6) * 6;
        }
        const br = 1 + 0.05 * Math.sin(t * 0.25 + g.seed);
        // turn about axis2 by a = t * w2 (Rodrigues)
        const a = t * g.w2, ca = Math.cos(a), sn = Math.sin(a);
        const ax = g.axis2;
        const d = ax[0] * px + ax[1] * py + ax[2] * pz;
        const rx = px * ca + (ax[1] * pz - ax[2] * py) * sn + ax[0] * d * (1 - ca);
        const ry = py * ca + (ax[2] * px - ax[0] * pz) * sn + ax[1] * d * (1 - ca);
        const rz = pz * ca + (ax[0] * py - ax[1] * px) * sn + ax[2] * d * (1 - ca);
        out[0] = cx + rx * br; out[1] = cy + ry * br; out[2] = cz + rz * br;
      } else {
        const tt = t * tideMul - m.k * g.lag;
        out[0] = nd.p[0] + Math.sin(g.fa * tt + g.seed) * g.amp;
        out[1] = nd.p[1] + Math.sin(g.fb * tt + g.seed * 1.7) * g.amp * 0.45;
        out[2] = nd.p[2] + Math.sin(g.fc * tt + g.seed * 0.6) * g.amp;
      }
      if (tide < 0.999) {
        // low tide: ease out to the private orbit and back
        saePrivate(m, geo, t, saePB);
        const k = 1 - tide;
        out[0] += (saePB[0] - out[0]) * k;
        out[1] += (saePB[1] - out[1]) * k;
        out[2] += (saePB[2] - out[2]) * k;
      }
    }
    if (isCap) {
      const en = saeEn(out);
      if (en < 1.04) { const k = 1.04 / Math.max(en, 1e-6); out[0] *= k; out[1] *= k; out[2] *= k; }
    }
    out[1] += Math.sin(t * 0.4 + m.seed) * 1.2; // breathing bob
    return tide;
  }
  // the whim wheel: rest as the humanoid, one melt per cycle into one of the
  // six shapes. Congregations share their group's clock (the chorus).
  // out = [blend 0..1, shape 1..6]
  function saelyriMorph(g, m, t, out) {
    const chorus = !!g && (g.verb === 0 || g.verb === 6); // rings and formations morph together
    const len = chorus ? g.mLen : m.mLen, off = chorus ? g.mOff : m.mOff;
    const hold = chorus ? g.mHold : m.mHold, seed = chorus ? g.seed : m.seed;
    const melt = m.mMelt;
    const cyc = (t + off) / len;
    const cn = Math.floor(cyc);
    const us = (cyc - cn) * len;
    const h = Math.sin(cn * 12.9898 + seed) * 43758.5453;
    const kt = 1 + (Math.floor((h - Math.floor(h)) * 6) % 6);
    const dur = melt * 2 + hold;
    let ms = 0;
    if (us < dur) {
      ms = us < melt ? us / melt : us > melt + hold ? (dur - us) / melt : 1;
      ms = ms * ms * (3 - 2 * ms);
    }
    out[0] = ms;
    out[1] = kt;
  }
  // the crowd cloud (kind 66): one soft glow per assembling group — the
  // long-range read that resolves into beings as you close. Center + radius,
  // community-local; 0 for pairs and streams (a pair is two lights, a river
  // reads as its own line of motes).
  function saeCloud(g, geo, out) {
    if (g.verb === 1 || g.verb === 2 || g.verb === 6) return 0;
    const nd = geo.nodes[g.ndI];
    if (g.verb === 3) { out[0] = g.anchor[0]; out[1] = g.anchor[1]; out[2] = g.anchor[2]; return g.spread * 2.2; }
    if (g.verb === 4) {
      // the lane's midpoint, half its length
      const mid = nd.r * (0.12 + g.outer) * 0.5;
      out[0] = nd.p[0] + g.lane[0] * mid; out[1] = nd.p[1] + g.lane[1] * mid; out[2] = nd.p[2] + g.lane[2] * mid;
      return nd.r * (g.outer - 0.12) * 0.55;
    }
    if (g.verb === 0) {
      // the ring's center at t = 0 is as good as any — the cloud is a hint
      // from kilometers away, and the ring's orbit is slow
      const [e1, e2] = saeFrame(g.axis);
      const ct = Math.cos(g.ph), st = Math.sin(g.ph);
      out[0] = nd.p[0] + (e1[0] * ct + e2[0] * st) * g.rad;
      out[1] = nd.p[1] + (e1[1] * ct + e2[1] * st) * g.rad;
      out[2] = nd.p[2] + (e1[2] * ct + e2[2] * st) * g.rad;
      return g.ringR * 2.5;
    }
    out[0] = nd.p[0]; out[1] = nd.p[1]; out[2] = nd.p[2];
    return g.amp * 1.2;
  }
  // its strength at distance d: gone inside 2.5 radii (the near-fade IS the
  // frame rate — the v53 nebula rule), full beyond 4; scaled by crowd size
  const saeCloudGate = (d, R, n) => saeSmooth((d - R * 2.5) / (R * 1.5)) * Math.min(1, Math.max(0.35, n / 24));
  // society hues: the same five families the reefs speak — one dimension, one
  // language of light. (Shared deliberately: the Saelyri and the reef life
  // are relatives; the plan's later phases lean on that.)
  const SOC_FAMS = REEF_FAMS;

  // ---- the Korrudan crust (v52): the city ON the bone -----------------------
  // James's Knowhere brief: the head is so large it is itself the station —
  // machinery knitted INTO it, grown over thousands of years, the bone
  // always dominant. tmp/orb-dimension/crust_points.mjs samples the actual
  // skull surface into assets/skull/crust.bin (canonical points + normals +
  // region/district tags); crustGeometry() grows the city from those
  // anchors: shanty stacks with lit windows (the scale ruler), gantry
  // masts, tank farms, the jaw refinery glowing warm between the teeth,
  // and a mechanical iris ring set into each eye socket. v57 (James's
  // close-up verdict: "they don't look at all like real buildings"): comm
  // dish clusters, sign pylons with ad screens, tank level-bands, rooftop
  // kits (greebles / antennae / billboards / neon trim), and physical-pitch
  // windows in three patterns. Deterministic —
  // crust-sim extracts this block verbatim, from the CRUST_SEED declaration
  // to the crust-hues comment (do not repeat those literal markers here).
  const CRUST_SEED = 0x0c1791ce;
  // the same transform the skull loader applies (SKULL_SCALE 20, 5° back
  // tilt) — restated here so the block stands alone in the sim. If the
  // loader's numbers change, change these.
  const CRUST_SCALE = 20;
  const CRUST_TILT = (-5 * Math.PI) / 180;
  function crustGeometry(points) {
    const R = mulberry32(CRUST_SEED);
    const rr = (a, b) => a + R() * (b - a);
    const ct = Math.cos(CRUST_TILT), st = Math.sin(CRUST_TILT);
    const xf = (p) => {
      const x = p[0] * CRUST_SCALE, y = p[1] * CRUST_SCALE, z = p[2] * CRUST_SCALE;
      return [x, y * ct - z * st, y * st + z * ct];
    };
    const xfn = (n) => [n[0], n[1] * ct - n[2] * st, n[1] * st + n[2] * ct];
    const m = { v: [], i: [] };
    // v57: ec rides the last three floats — for window faces it carries the
    // face HALF-SIZES in meters + the pattern (the FS derives a physical
    // window pitch from it, James's "the windows are way too big" fix);
    // plain metal and struts leave it zero.
    const vert = (p, n, u, v, aux, ec) => {
      m.v.push(p[0], p[1], p[2], n[0], n[1], n[2], u, v, aux[0], aux[1], aux[2], aux[3],
        ec ? ec[0] : 0, ec ? ec[1] : 0, ec ? ec[2] : 0);
    };
    const quad = (c, eu, ev, n, aux, ec) => {
      const b = m.v.length / 15;
      vert([c[0] - eu[0] - ev[0], c[1] - eu[1] - ev[1], c[2] - eu[2] - ev[2]], n, 0, 0, aux, ec);
      vert([c[0] + eu[0] - ev[0], c[1] + eu[1] - ev[1], c[2] + eu[2] - ev[2]], n, 1, 0, aux, ec);
      vert([c[0] + eu[0] + ev[0], c[1] + eu[1] + ev[1], c[2] + eu[2] + ev[2]], n, 1, 1, aux, ec);
      vert([c[0] - eu[0] + ev[0], c[1] - eu[1] + ev[1], c[2] - eu[2] + ev[2]], n, 0, 1, aux, ec);
      m.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    const nrm = (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    };
    const crs = (a, b) => [
      a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    // an axis-aligned-to-frame box: c center, half sizes h along frame axes.
    // style (v57) flows to each face's ec: [halfW, halfH, windowPattern].
    const box = (c, f1, f2, f3, h, aux, style) => {
      const axes = [[f1, f2, f3], [f2, f3, f1], [f3, f1, f2]];
      for (let a = 0; a < 3; a++) {
        const [e, e1, e2] = axes[a];
        const he = h[a], s1 = h[(a + 1) % 3], s2 = h[(a + 2) % 3];
        for (const sgn of [-1, 1]) {
          quad(
            [c[0] + e[0] * he * sgn, c[1] + e[1] * he * sgn, c[2] + e[2] * he * sgn],
            [e1[0] * s1, e1[1] * s1, e1[2] * s1],
            [e2[0] * s2 * sgn, e2[1] * s2 * sgn, e2[2] * s2 * sgn],
            // roofs and floors (axis 0 = the stack normal) never carry the
            // wall pattern — style -1 = sparse dim service hatches (the lab
            // sheet caught strip-style ceilings reading as monster stripes)
            sgn < 0 ? [-e[0], -e[1], -e[2]] : e, aux, [s1, s2, a === 0 ? -1 : style || 0]);
        }
      }
    };
    // v57 tech kit (James: "real buildings... communication dishes, tanks of
    // unknown origin, lighted screens, advertising, neon"):
    // an octagonal fan plate, both windings — the dish face
    const fan = (c, ax, rad, aux) => {
      const ref = Math.abs(ax[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(crs(ref, ax));
      const e2 = crs(ax, e1);
      const b = m.v.length / 15;
      vert(c, ax, 0.5, 0.5, aux);
      for (let s = 0; s < 8; s++) {
        const th = (s / 8) * TAU;
        vert([
          c[0] + (e1[0] * Math.cos(th) + e2[0] * Math.sin(th)) * rad,
          c[1] + (e1[1] * Math.cos(th) + e2[1] * Math.sin(th)) * rad,
          c[2] + (e1[2] * Math.cos(th) + e2[2] * Math.sin(th)) * rad], ax, 0.5 + Math.cos(th) / 2, 0.5 + Math.sin(th) / 2, aux);
      }
      for (let s = 0; s < 8; s++) {
        const r1 = b + 1 + s, r2 = b + 1 + ((s + 1) % 8);
        m.i.push(b, r1, r2, b, r2, r1); // both windings — no culling surprises
      }
    };
    // a free-standing screen: one double-sided emissive quad (aux kind 3)
    const screen = (c, eu, ev, n, aux) => {
      quad(c, eu, ev, n, aux);
      quad(c, [-eu[0], -eu[1], -eu[2]], ev, [-n[0], -n[1], -n[2]], aux);
    };
    // a comm dish: mount, mast, tilted plate, lit feed-tip at the focus
    const dish = (W, n, t1, t2, fam) => {
      const mh = rr(24, 60);
      const mount = [W[0] + n[0] * mh, W[1] + n[1] * mh, W[2] + n[2] * mh];
      box([W[0] + n[0] * 8, W[1] + n[1] * 8, W[2] + n[2] * 8], n, t1, t2, [8, rr(10, 16), rr(10, 16)], [0, rr(0, TAU), 0, fam]);
      strutC(W, mount, rr(3, 5), [0, 0, 0, fam]);
      const sky = nrm([n[0] + rr(-0.7, 0.7), n[1] + rr(0.1, 0.9), n[2] + rr(-0.7, 0.7)]);
      const rad = rr(22, 58);
      fan(mount, sky, rad, [0, rr(0, TAU), 0, fam]);
      const focus = [mount[0] + sky[0] * rad * 0.55, mount[1] + sky[1] * rad * 0.55, mount[2] + sky[2] * rad * 0.55];
      strutC(mount, focus, 2, [0, 0, 0, fam]);
      box(focus, sky, t1, t2, [3, 3, 3], [3, rr(0, TAU), 1, fam]); // the feed glows neon
    };
    const strutC = (p, q, w, aux) => {
      w *= 0.5; // v67.1 James: "50% as thick as they are"
      aux = [aux[0], aux[1], (aux[2] % 4) + 4 * Math.floor(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])), aux[3]]; // v68.6 length in aux.z
      const d = nrm([q[0] - p[0], q[1] - p[1], q[2] - p[2]]);
      const ref = Math.abs(d[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(crs(ref, d));
      const e2 = crs(d, e1);
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / 2;
      box(mid, d, e1, e2, [L, w, w], aux);
    };
    // build probability per region: the face stays almost bare, the jaw is
    // the industrial heart, districts read denser than the wilds
    const BUILD_P = [0.6, 0.95, 0.55, 0.6, 0.12]; // side jaw crown back face
    for (const pt of points) {
      const p = R(); // one roll per point, always — density stays decoupled
      const inDistrict = pt.cluster < 200;
      const prob = BUILD_P[pt.region] * (inDistrict ? 1 : 0.3);
      if (p > prob) continue;
      const W = xf(pt.p);
      const n = nrm(xfn(pt.n));
      const ref = Math.abs(n[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
      const t1 = nrm(crs(ref, n));
      const t2 = crs(n, t1);
      const jaw = pt.region === 1;
      const fam = (R() * 5) | 0;
      const kindRoll = R();
      if (kindRoll < 0.955 && kindRoll >= 0.9) {
        // v57 dish cluster: one big listener + a small companion
        dish(W, n, t1, t2, fam);
        if (R() < 0.5) {
          const off = rr(40, 80);
          dish([W[0] + t1[0] * off, W[1] + t1[1] * off, W[2] + t1[2] * off], n, t1, t2, (R() * 5) | 0);
        }
      } else if (kindRoll >= 0.955) {
        // v57 sign pylon: a mast holding a big double-sided ad screen —
        // the commercial presence, readable from the approach
        const h = rr(120, 300);
        const tip = [W[0] + n[0] * h, W[1] + n[1] * h, W[2] + n[2] * h];
        strutC(W, tip, rr(5, 9), [0, 0, 0, fam]);
        const sw = rr(40, 95), sh = sw * rr(0.4, 0.7);
        const face = nrm([t2[0] + rr(-0.4, 0.4) * t1[0], t2[1], t2[2] + rr(-0.4, 0.4) * t1[2]]);
        const eu = nrm(crs(face, n));
        screen(tip, [eu[0] * sw, eu[1] * sw, eu[2] * sw], [n[0] * sh, n[1] * sh, n[2] * sh],
          face, [3, rr(0, TAU), R() < 0.75 ? 0 : 1, fam]);
      } else if (kindRoll < 0.14) {
        // gantry mast: a spine standing off the bone, pulse running it
        const h = rr(260, 620) * (jaw ? 1.2 : 1);
        const tip = [W[0] + n[0] * h, W[1] + n[1] * h, W[2] + n[2] * h];
        const aux = [1, rr(0, TAU), 0, fam];
        strutC([W[0] - n[0] * 40, W[1] - n[1] * 40, W[2] - n[2] * 40], tip, rr(9, 16), aux);
        for (const u of [0.55, 0.8]) {
          const bpt = [W[0] + n[0] * h * u, W[1] + n[1] * h * u, W[2] + n[2] * h * u];
          const arm = rr(50, 130);
          strutC(
            [bpt[0] - t1[0] * arm, bpt[1] - t1[1] * arm, bpt[2] - t1[2] * arm],
            [bpt[0] + t1[0] * arm, bpt[1] + t1[1] * arm, bpt[2] + t1[2] * arm], rr(5, 9), aux);
        }
      } else if (kindRoll < 0.24) {
        // tank farm: fat vessels hugging the surface — v57: each carries a
        // thin neon LEVEL BAND partway up, glowing whatever its unknown
        // substance glows (James: "tanks of unknown origin")
        const naux = [0, rr(0, TAU), 0, fam];
        for (let k = 0, nk = 2 + ((R() * 3) | 0); k < nk; k++) {
          const off = rr(-90, 90);
          const th2 = rr(22, 44), tw = rr(34, 62), tz = rr(34, 62);
          const tc = [W[0] + t1[0] * off + n[0] * 26, W[1] + t1[1] * off + n[1] * 26, W[2] + t1[2] * off + n[2] * 26];
          box(tc, n, t1, t2, [th2, tw, tz], naux);
          const lvl = th2 * rr(-0.5, 0.6); // the fill line
          box([tc[0] + n[0] * lvl, tc[1] + n[1] * lvl, tc[2] + n[2] * lvl],
            n, t1, t2, [1.6, tw + 1.5, tz + 1.5], [3, rr(0, TAU), 1, (R() * 5) | 0]);
        }
      } else {
        // shanty stack: boxes stepping up the normal — lit windows are the
        // ruler that makes 12km read as 12km. Roots sink into the bone.
        // v57: each stack speaks ONE window pattern (grid / down-strips /
        // portholes), and the top earns a roof kit — greebles, an antenna,
        // sometimes neon trim, a rooftop screen, or a small dish.
        const nBox = 2 + ((R() * (jaw ? 4 : 3)) | 0);
        let base = -50;
        let wx = rr(70, 170) * (jaw ? 1.35 : 1);
        let wz = rr(70, 170) * (jaw ? 1.35 : 1);
        const styleRoll = R();
        const style = styleRoll < 0.55 ? 0 : styleRoll < 0.8 ? 1 : 2;
        let topC = null, topH = [0, 0, 0];
        for (let k = 0; k < nBox; k++) {
          const bh = rr(45, 110);
          const jx = rr(-26, 26), jz = rr(-26, 26);
          const c = [
            W[0] + n[0] * (base + bh) + t1[0] * jx + t2[0] * jz,
            W[1] + n[1] * (base + bh) + t1[1] * jx + t2[1] * jz,
            W[2] + n[2] * (base + bh) + t1[2] * jx + t2[2] * jz];
          // v57: upper floors light too — the old wx>55 cut sent every
          // tower top dark, which is half of why they read as dead boxes
          const lit = wx > 34 && R() < 0.85;
          // aux for windows: [2, phase, warmth, fam]. Warmth is positional,
          // not region-tagged: everything low-and-forward (the whole chin /
          // jaw underside) glows refinery-warm so the mouth reads as one
          // furnace; elsewhere it's the halfway mix of homes and works.
          const warmHere = (W[1] < -2000 && W[2] > 200) || jaw;
          const aux = lit
            ? [2, rr(0, TAU), warmHere ? 1 : (R() < 0.6 ? 1 : 0), fam]
            : [0, rr(0, TAU), 0, fam];
          box(c, n, t1, t2, [bh, wx, wz], aux, style);
          topC = c;
          topH = [bh, wx, wz];
          base += bh * 2 * rr(0.82, 0.98);
          wx *= rr(0.62, 0.85);
          wz *= rr(0.62, 0.85);
        }
        // the roof kit
        if (topC) {
          const roof = [
            topC[0] + n[0] * topH[0], topC[1] + n[1] * topH[0], topC[2] + n[2] * topH[0]];
          for (let g2 = 0, ng = 1 + ((R() * 3) | 0); g2 < ng; g2++) {
            const gx = rr(-0.55, 0.55) * topH[1], gz = rr(-0.55, 0.55) * topH[2];
            const gs = rr(3, 9);
            box([roof[0] + t1[0] * gx + t2[0] * gz + n[0] * gs,
              roof[1] + t1[1] * gx + t2[1] * gz + n[1] * gs,
              roof[2] + t1[2] * gx + t2[2] * gz + n[2] * gs],
              n, t1, t2, [gs, rr(4, 12), rr(4, 12)], [0, rr(0, TAU), 0, fam]);
          }
          if (R() < 0.6) { // antenna
            const ah = rr(30, 90);
            strutC(roof, [roof[0] + n[0] * ah, roof[1] + n[1] * ah, roof[2] + n[2] * ah], rr(1.2, 2.5), [0, 0, 0, fam]);
          }
          const roofRoll = R();
          if (roofRoll < 0.16) {
            dish(roof, n, t1, t2, fam);
          } else if (roofRoll < 0.34) {
            // rooftop billboard leaning over the street
            const sw = Math.min(topH[1], topH[2]) * rr(0.7, 1.1), sh = sw * rr(0.4, 0.65);
            const face = R() < 0.5 ? t1 : t2;
            const eu = nrm(crs(face, n));
            screen([roof[0] + n[0] * sh * 1.4, roof[1] + n[1] * sh * 1.4, roof[2] + n[2] * sh * 1.4],
              [eu[0] * sw, eu[1] * sw, eu[2] * sw], [n[0] * sh, n[1] * sh, n[2] * sh],
              face, [3, rr(0, TAU), R() < 0.7 ? 0 : 1, fam]);
          } else if (roofRoll < 0.55) {
            // neon trim: two glowing edge rails along the roof line
            for (const sgn of [-1, 1]) {
              box([roof[0] + t1[0] * topH[1] * sgn + n[0] * 1.5,
                roof[1] + t1[1] * topH[1] * sgn + n[1] * 1.5,
                roof[2] + t1[2] * topH[1] * sgn + n[2] * 1.5],
                n, t1, t2, [1.4, 1.4, topH[2] * 0.95], [3, rr(0, TAU), 1, (R() * 5) | 0]);
            }
          }
        }
      }
    }
    // the iris rings: machined into each eye socket — the Knowhere gesture.
    // Socket centers in canonical coords, ring plane facing out the socket.
    for (const side of [-1, 1]) {
      const c0 = xf([side * 90, -15, 190]);
      const ax = nrm(xfn([side * 0.18, -0.05, 1]));
      const ref = [0, 1, 0];
      const e1 = nrm(crs(ref, ax));
      const e2 = crs(ax, e1);
      for (const [rad, w] of [[880, 42], [1230, 26]]) {
        const segs = 30;
        let prev = null;
        const aux = [1, rr(0, TAU), 0, (R() * 5) | 0];
        for (let s = 0; s <= segs; s++) {
          const th = (s / segs) * TAU;
          const q = [
            c0[0] + (e1[0] * Math.cos(th) + e2[0] * Math.sin(th)) * rad,
            c0[1] + (e1[1] * Math.cos(th) + e2[1] * Math.sin(th)) * rad,
            c0[2] + (e1[2] * Math.cos(th) + e2[2] * Math.sin(th)) * rad];
          if (prev) strutC(prev, q, w, aux);
          prev = q;
        }
      }
    }
    return m;
  }
  // crust hues: the windows speak for themselves — warm homes, cool works

  // ---- the nebulae (v53): sci-fi weather for the gulf ----------------------
  // James's brief: Star Trek nebulae — glowing gas, streaks and swirls,
  // ship-scale weather, because endless blackness is boring and this is not
  // The Expanse. Look developed in tmp/orb-dimension/nebula-lab.html over 7
  // rounds with his notes (no ball-pit, no sprite somersaults, gas not
  // fibers, one palette per bank + variety across the map). Five banks:
  // one near home in the spawn sky (off the Korrudan sightline) and four in
  // the gulf band between the core and the satellite ring (55–95km — bands,
  // not checks, keep this block standalone for the sim). Deterministic —
  // nebula-sim extracts this block verbatim, from the NEBULA_SEED
  // declaration to the nebula-hues comment.
  const NEBULA_SEED = 0x9eb31a5;
  const NEB_PALETTES = [
    // name is documentation; field carries the mass, core the lit billows
    { name: "mutara", field: [0.030, 0.062, 0.200], core: [0.90, 0.22, 0.55] },
    { name: "ember", field: [0.150, 0.048, 0.028], core: [1.00, 0.52, 0.16] },
    { name: "verdant", field: [0.018, 0.105, 0.075], core: [0.34, 0.95, 0.55] },
    { name: "ice", field: [0.040, 0.100, 0.210], core: [0.46, 0.86, 1.00] },
    { name: "rose", field: [0.130, 0.055, 0.095], core: [1.00, 0.58, 0.75] },
  ];
  function nebulaGeometry(density, scale = 1) {
    const R = mulberry32(NEBULA_SEED);
    const rr = (a, b) => a + R() * (b - a);
    const nrm = (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    };
    const banks = [];
    // seats: the home bank fixed in the spawn sky; four gulf banks on
    // seeded bearings in the 52–82km band, ±22km height, min 50km apart.
    // v54: scale multiplies radii only — seats stay put, so the dial never
    // re-rolls the sky. Its ceiling is guarded by nebula-sim TEST 10
    // (spawn, approach line, satellite towns, bank identity).
    const seats = [{ c: [30000, 9000, -18000], radius: 14000 * scale }];
    const SCALE_CAP = 2; // the nebScale slider max — change them together
    let guard = 0;
    while (seats.length < 5 && guard++ < 200) {
      const ang = rr(0, TAU);
      const d = rr(52000, 82000);
      const c = [Math.cos(ang) * d, rr(-22000, 22000), Math.sin(ang) * d];
      // spawn-corridor keep-out sized for the DIAL CEILING (24km × cap), so
      // no legal scale setting can drop gas on the player's first frame or
      // the run home — nebula-sim TESTs 9/10 hold the bars
      let corridor = Infinity;
      for (let k = 0; k <= 8; k++) {
        const p = [0, 0, 54000 * (k / 8)];
        corridor = Math.min(corridor, Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]));
      }
      if (corridor < 24000 * SCALE_CAP + 6000) continue;
      if (seats.every((s) => Math.hypot(c[0] - s.c[0], c[1] - s.c[1], c[2] - s.c[2]) > 50000)) {
        seats.push({ c, radius: rr(14000, 24000) * scale });
      }
    }
    // palettes: a seeded shuffle of the deck, so the banks between them
    // speak nearly every scheme in the dimension (sim bars variety at 4/5)
    const deck = NEB_PALETTES.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (R() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    for (let bi = 0; bi < seats.length; bi++) {
      const seat = seats[bi];
      const S = seat.radius;
      const pal = deck[bi % deck.length];
      const light = nrm([rr(-1, 1), rr(-0.6, 0.6), rr(-1, 1)]);
      // flow strands: quadratic beziers in a flattened box around the seat
      const nS = 3 + ((R() * 2) | 0);
      const strands = [];
      for (let s = 0; s < nS; s++) {
        const p0 = [rr(-0.9, 0.9) * S, rr(-0.35, 0.35) * S, rr(-0.9, 0.9) * S];
        const p2 = [rr(-0.9, 0.9) * S, rr(-0.35, 0.35) * S, rr(-0.9, 0.9) * S];
        const p1 = [
          (p0[0] + p2[0]) / 2 + rr(-0.6, 0.6) * S,
          (p0[1] + p2[1]) / 2 + rr(-0.35, 0.35) * S,
          (p0[2] + p2[2]) / 2 + rr(-0.6, 0.6) * S];
        strands.push([p0, p1, p2]);
      }
      const bez = (S2, t, i) => (1 - t) * (1 - t) * S2[0][i] + 2 * t * (1 - t) * S2[1][i] + t * t * S2[2][i];
      const bezT = (S2, t, i) => 2 * (1 - t) * (S2[1][i] - S2[0][i]) + 2 * t * (S2[2][i] - S2[1][i]);
      const strandBright = strands.map(() => rr(0.5, 1.25));
      const strandHot = strands.map(() => rr(0.2, 1));
      const cnt = Math.round(220 * density);
      // size octaves as fractions of the bank radius. Smaller than the lab's
      // (which had no 4K fill-rate budget): the near-fade below dissolves a
      // wisp before it can blanket the screen, and nebula-sim TEST 6 bars
      // interior overdraw — the v33 veil bomb is not repeating here.
      const octs = [
        { n: Math.round(cnt * 0.05), size: [0.20, 0.30], jit: 0.09 },
        { n: Math.round(cnt * 0.2), size: [0.10, 0.18], jit: 0.14 },
        { n: Math.round(cnt * 0.45), size: [0.048, 0.098], jit: 0.18, wispy: true },
        { n: Math.round(cnt * 0.3), size: [0.022, 0.048], jit: 0.24, wispy: true },
      ];
      const puffs = [];
      for (const o of octs) {
        for (let i = 0; i < o.n; i++) {
          const si = (R() * strands.length) | 0;
          const S2 = strands[si];
          const t = R();
          const g = () => (R() + R() + R() - 1.5) * 0.8 * S;
          const isDust = R() < 0.18;
          const p = [
            seat.c[0] + bez(S2, t, 0) + g() * o.jit,
            seat.c[1] + bez(S2, t, 1) + g() * o.jit * 0.5,
            seat.c[2] + bez(S2, t, 2) + g() * o.jit];
          if (isDust) {
            for (let k = 0; k < 3; k++) p[k] += light[k] * rr(0.03, 0.12) * S;
          }
          const tan = nrm([bezT(S2, t, 0), bezT(S2, t, 1), bezT(S2, t, 2)]);
          const size = rr(o.size[0], o.size[1]) * S * (isDust ? 0.9 : 1);
          puffs.push({
            p, size, tan,
            stretch: (1.4 + 2.4 * rr(0.6, 1)) * (o.wispy ? 1.5 : 1),
            rot: rr(-0.4, 0.4),
            dust: isDust ? 1 : 0,
            core: Math.min(1, strandHot[si] * rr(0.5, 1.4)),
            // atlas variant: big anchors take the coarse-billow family,
            // small filler the fine rags — features ride puff size, as in
            // the lab, but baked instead of evaluated per fragment
            variant: (o.wispy ? 3 : 0) + ((R() * 3) | 0),
            bright: strandBright[si] * rr(0.75, 1.25),
          });
        }
      }
      // furnace knots: buried glints along the strands
      for (let i = 0; i < 8; i++) {
        const si = (R() * strands.length) | 0;
        const S2 = strands[si];
        const t = rr(0.2, 0.8);
        puffs.push({
          p: [seat.c[0] + bez(S2, t, 0), seat.c[1] + bez(S2, t, 1), seat.c[2] + bez(S2, t, 2)],
          size: rr(0.023, 0.043) * S,
          tan: [1, 0, 0],
          stretch: 1,
          rot: rr(0, TAU),
          dust: 0,
          core: 1,
          variant: 3 + ((R() * 3) | 0),
          bright: rr(2.4, 3.6),
        });
      }
      banks.push({ c: seat.c, radius: S, pal, light, puffs });
    }
    return banks;
  }
  // nebula hues: five schemes, one per bank — every nebula speaks one color

  // ---- fuel stations (v38) --------------------------------------------------
  // 64 water globes + 36 deuterium depots at fixed seeded positions — fuel is
  // "quite forgiving": from anywhere in the volume the nearest water is a
  // short impulse hop (sim-asserted). Deterministic like the reef; the sim
  // extracts this block verbatim. Markers: `const STATION_SEED` … `// station hues`.
  const STATION_SEED = 0xf0e15;
  function stationGeometry() {
    const R = mulberry32(STATION_SEED);
    const out = { h2o: [], deu: [] };
    // stratified, not random: one station per grid cell, jittered inside 80%
    // of it — pure random left 14km deuterium voids (sim TEST 9 caught it).
    // Cells re-roll until they clear the skull buffer and sight corridor.
    // v52: the buffer is the SKULL_EL ellipsoid (the 12km station), the
    // corridor stretches to the 27km spawn and widens for the bigger face.
    const bad = (x, y, z) =>
      Math.hypot(x / SKULL_EL[0], y / SKULL_EL[1], z / SKULL_EL[2]) < 1 ||
      (z > 0 && z < 54600 && Math.hypot(x, y) < 2300); // to the v53.1 spawn
    const place = (arr, nx, ny, nz) => {
      const XR = 21500, YR = 4600, ZR = 21500;
      const cw = [(2 * XR) / nx, (2 * YR) / ny, (2 * ZR) / nz];
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          for (let k = 0; k < nz; k++) {
            let x, y, z, tries = 0;
            do {
              x = -XR + (i + 0.1 + 0.8 * R()) * cw[0];
              y = -YR + (j + 0.1 + 0.8 * R()) * cw[1];
              z = -ZR + (k + 0.1 + 0.8 * R()) * cw[2];
            } while (++tries < 60 && bad(x, y, z));
            if (!bad(x, y, z)) arr.push([x, y, z]);
          }
        }
      }
    };
    place(out.h2o, 4, 4, 4); // 64
    place(out.deu, 3, 4, 3); // 36
    // v52: the station's own doorstep ring — the bad() ellipsoid carves a
    // 12km hole in the middle of the grid, so Korrudan supplies its own
    // fuel: six water globes and three deuterium depots seeded just off the
    // crust at varied bearings and heights. The capital's welcome is a full
    // tank. (Replaces the v50 CAPITAL_KEEP push — the ellipsoid IS the keep.)
    const doorstep = (a, f) => {
      const yy = (R() - 0.5) * 1.4;
      const cs = Math.cos(a), sn = Math.sin(a);
      const nl = Math.hypot(cs, yy, sn) || 1;
      const p = [
        (cs / nl) * SKULL_EL[0] * f, (yy / nl) * SKULL_EL[1] * f, (sn / nl) * SKULL_EL[2] * f];
      // stay out of the spawn sightline (same corridor bad() protects)
      if (p[2] > 0) {
        const rxy = Math.hypot(p[0], p[1]);
        if (rxy < 2600) {
          const g = 2600 / Math.max(rxy, 1);
          if (rxy < 1) p[0] = 2600;
          else { p[0] *= g; p[1] *= g; }
        }
      }
      return p;
    };
    for (let i = 0; i < 6; i++) out.h2o.push(doorstep((i / 6) * TAU + R() * 0.8, 1.16 + R() * 0.22));
    for (let i = 0; i < 3; i++) out.deu.push(doorstep((i / 3) * TAU + 0.7 + R() * 0.9, 1.24 + R() * 0.26));
    // v49: each ring colony gets a doorstep cluster — two water globes and a
    // deuterium depot a short hop out from its heart (outside the reef shell,
    // inside a minute of impulse). The destinations have gas; the full
    // guaranteed-find gulf grid is a later phase (expansion-spec.md).
    for (const col of REEF_COLONIES) {
      const cc = col.c;
      const a0 = R() * TAU;
      const dh = col.shell + 1600 + R() * 1400;
      out.h2o.push([cc[0] + Math.cos(a0) * dh, cc[1] + (R() - 0.5) * 900, cc[2] + Math.sin(a0) * dh]);
      out.h2o.push([cc[0] + Math.cos(a0 + Math.PI) * dh, cc[1] + (R() - 0.5) * 900, cc[2] + Math.sin(a0 + Math.PI) * dh]);
      const dd = col.shell + 2400 + R() * 1800;
      out.deu.push([cc[0] + Math.cos(a0 + Math.PI / 2) * dd, cc[1] + (R() - 0.5) * 900, cc[2] + Math.sin(a0 + Math.PI / 2) * dd]);
    }
    // v50: the satellite societies get doorstep fuel too — they sit far
    // outside the core grid, and a cooperative society's welcome is a full
    // tank. Two water + one deuterium just outside each node shell. The
    // capital skips this: it lives IN the grid already.
    for (let i = 1; i < COMMUNITIES.length; i++) {
      const cc = COMMUNITIES[i].c;
      const sh = COMMUNITIES[i].shellR || 8000;
      const a0 = R() * TAU;
      const dh = sh + 2200 + R() * 1600;
      out.h2o.push([cc[0] + Math.cos(a0) * dh, cc[1] + (R() - 0.5) * 1200, cc[2] + Math.sin(a0) * dh]);
      out.h2o.push([cc[0] + Math.cos(a0 + Math.PI) * dh, cc[1] + (R() - 0.5) * 1200, cc[2] + Math.sin(a0 + Math.PI) * dh]);
      const dd = sh + 3000 + R() * 2000;
      out.deu.push([cc[0] + Math.cos(a0 + Math.PI / 2) * dd, cc[1] + (R() - 0.5) * 1200, cc[2] + Math.sin(a0 + Math.PI / 2) * dd]);
    }
    return out;
  }
  // station hues: water blues; deuterium's hot amber-green
  applyColonyLayout(cfg.colonyDist, cfg.colonyVert, cfg.colonyJitter);
  // v50 order matters: community geometry fills each society's shellR, which
  // stationGeometry needs for the satellite doorstep clusters.
  applyCommunityLayout(cfg.colonyDist, cfg.commVert, cfg.commJitter, cfg.commSat);
  let COMM_GEO = communityGeometry(cfg.commScale);
  let STATIONS = stationGeometry();
  let NEBULAE = nebulaGeometry(cfg.nebDensity, cfg.nebScale); // v53: the five banks

  function makeStations() {
    const out = [];
    for (const c of STATIONS.h2o) {
      // a loose knot of blue glass globes — one big, four small
      for (let i = 0; i < 5; i++) {
        const o = baseOrb([0, 0, 0], false, false);
        o.station = true;
        const th = (i / 5) * TAU + rand(0, TAU / 5);
        const d = i === 0 ? 0 : rand(26, 55);
        o.fix = [c[0] + Math.cos(th) * d, c[1] + rand(-30, 30), c[2] + Math.sin(th) * d];
        o.fixAmp = 4;
        o.fixedR = i === 0 ? rand(16, 20) : rand(8, 13);
        o.variant = 0;
        o.h1 = rand(203, 214);
        o.h2 = rand(216, 228);
        o.sat = rand(88, 96);
        o.halo = 1.5;
        o.fadeDur = rand(3.5, 7);
        o.spin = 0;
        out.push(o);
      }
    }
    for (const c of STATIONS.deu) {
      // a tight hot knot pulsing fast — reads radioactive in this light language
      for (let i = 0; i < 7; i++) {
        const o = baseOrb([0, 0, 0], false, false);
        o.station = true;
        const th = (i / 7) * TAU + rand(0, TAU / 7);
        const d = i === 0 ? 0 : rand(16, 40);
        o.fix = [c[0] + Math.cos(th) * d, c[1] + rand(-22, 22), c[2] + Math.sin(th) * d];
        o.fixAmp = 3;
        o.fixedR = i === 0 ? rand(12, 15) : rand(5, 9);
        o.variant = 1;
        o.h1 = rand(68, 82);
        o.h2 = rand(88, 102);
        o.sat = rand(92, 98);
        o.halo = 1.7;
        o.fadeDur = rand(1.1, 2.2);
        o.spin = 0;
        out.push(o);
      }
    }
    return out;
  }

  // ---- Vess-Karai, the Lantern: RETIRED v52 (James, 2026-07-25) -------------
  // The glass pyramid stood at [9500, −5850, 6500] from v47 to v51. It came
  // out when Korrudan grew into the station (it would have sat against the
  // jaw). "A cool experiment — we'll bring it back in another format later":
  // assets/pyramid/ and tmp/orb-dimension/pyramid_build.py stay on disk.

  // ---- actors (v47): everything that moves on its own -----------------------
  // Colony exchange motes, glyph messages, three species of energy creature,
  // robot engine glows and cargo. All are orb instances whose o.fix arrays
  // get rewritten every frame — the renderer never knows the difference.
  function actorBase(kind, r, h1, h2) {
    const o = baseOrb([0, 0, 0], false, false);
    o.actor = true;
    o.fix = [0, 0, 0];
    o.fixedR = r;
    o.kind = kind;
    o.h1 = h1;
    o.h2 = h2;
    o.sat = 90;
    o.halo = 0.4;
    o.spin = 0;
    o.quadScale = kind === 60 ? 1.0 : kind === 62 ? 1.7 : 1.4;
    return o;
  }
  const qBez = (a, m, b, u, i) =>
    (1 - u) * (1 - u) * a[i] + 2 * u * (1 - u) * m[i] + u * u * b[i];

  let actorOrbs = [];
  const colonyLife = []; // update records, one per animated actor
  const robotFleet = { list: [], nodes: null };
  const cadenceBots = []; // v51: the citizen castes, re-seated by makeActors
  const saeBeings = []; // v56: the Saelyri — closed-form members over kind-65 orbs
  const saeGroups = []; // v61: the crowd groups — ripple/chord state + the kind-66 cloud
  const saeGlyphs = []; // v56: greeting glyph pool, shared by whoever is greeting
  let saeChordLast = -1e9; // global chord spacing — a crowd must not stack chords

  function makeActors() {
    actorOrbs = [];
    colonyLife.length = 0;
    robotFleet.list = [];
    robotFleet.nodes = null;

    // -- colony life
    for (let ci = 0; ci < REEF_COLONIES.length; ci++) {
      const col = REEF_COLONIES[ci];
      const polyps = colonyPolyps[ci].length ? colonyPolyps[ci] : [col.c];
      const [h1, h2] = REEF_FAMS[ci % 5];
      const pp = () => pick(polyps);
      // exchange motes: beads of light traded polyp to polyp
      for (let i = 0; i < 10; i++) {
        const o = actorBase(61, rand(1.8, 3.2), rand(h1, h2), rand(h1, h2));
        actorOrbs.push(o);
        colonyLife.push({ type: "mote", o, ci, a: pp(), b: pp(), u: Math.random(), dur: rand(2.5, 6) });
      }
      // glyphs: runes released into the dark around the growths
      for (let i = 0; i < 8; i++) {
        const o = actorBase(60, rand(4, 9), h1, h2);
        o.p0 = (Math.random() * GLYPH_N) | 0;
        o.p1 = 0;
        const fr = pp();
        o.fix = fr.slice(); // seat at a polyp from frame one — never at the origin
        actorOrbs.push(o);
        colonyLife.push({ type: "glyph", o, ci, from: fr, vel: [0, 0, 0], life: rand(0, 8), dur: rand(6, 11) });
      }
      // darters: streaks with a 3-echo tail (closed-form path, echoes lag it)
      for (let i = 0; i < 5; i++) {
        const os = [];
        for (let k = 0; k < 4; k++) {
          const o = actorBase(62, 3, rand(h1, h2), rand(h1, h2));
          o.p1 = [1, 0.55, 0.32, 0.16][k];
          actorOrbs.push(o);
          os.push(o);
        }
        colonyLife.push({
          type: "darter", os, ci,
          R: rand(140, 380), w1: rand(0.22, 0.45), w2: rand(0.3, 0.55), w3: rand(0.2, 0.4),
          s1: rand(0, TAU), s2: rand(0, TAU), s3: rand(0, TAU),
        });
      }
      // jellies: slow pulsing bells riding thermals
      for (let i = 0; i < 4; i++) {
        const o = actorBase(63, rand(5, 9), h1, h2);
        o.p0 = rand(0, TAU);
        actorOrbs.push(o);
        colonyLife.push({ type: "jelly", o, ci, R: rand(120, 380), w: rand(0.04, 0.09), s: rand(0, TAU), bob: rand(0.3, 0.6) });
      }
      // moths: quick figure-eights around a favorite polyp
      for (let i = 0; i < 6; i++) {
        const o = actorBase(64, 1.7, rand(h1, h2), rand(h1, h2));
        o.p0 = rand(0, TAU);
        o.p1 = rand(2, 6); // flap speed
        actorOrbs.push(o);
        colonyLife.push({ type: "moth", o, ci, anchor: pp(), A: rand(14, 30), w: rand(0.5, 1.1), s: rand(0, TAU), retarget: rand(14, 26) });
      }
    }

    // -- the service fleet: robots spawn scattered among the stations —
    // which include the colony doorstep clusters now (v49), so a few work
    // the ring communities. (The two Lantern caretakers retired with it, v52.)
    for (let i = 0; i < 14; i++) {
      const home = i % 2 ? pick(STATIONS.h2o) : pick(STATIONS.deu);
      const glow = actorBase(0, 0, 190, 200);
      glow.sat = 90;
      glow.halo = 1.8;
      glow.fadeDur = 1.3;
      actorOrbs.push(glow);
      const cargo = actorBase(0, 0, 210, 218);
      cargo.sat = 92;
      cargo.halo = 1.2;
      cargo.fadeDur = 2.5;
      actorOrbs.push(cargo);
      robotFleet.list.push({
        pos: [home[0] + rand(-40, 40), home[1] + rand(-20, 20), home[2] + rand(-40, 40)],
        vel: [0, 0, 0],
        f: [0, 0, -1], // smoothed facing
        state: "idle",
        node: null,
        serviceT: 0,
        orbit: rand(0, TAU),
        carrying: false,
        glow, cargo,
        seed: rand(0, 100),
      });
    }

    // -- the Cadence citizens (v51): six castes at work in every hybrid
    // town. Chanters hold vigil beside the suns, lattice-wrights patrol the
    // webbing, archivists circle the core reading it, ferries run the light
    // bridges, wardens walk the shell perimeter, gardeners tend the sun
    // crystals. The capital fields three of each caste, satellites two.
    cadenceBots.length = 0;
    for (let ci = 0; ci < COMMUNITIES.length; ci++) {
      const com = COMMUNITIES[ci];
      const geo = COMM_GEO[ci];
      if (!com.c || !geo || !geo.nodes.length) continue;
      // v56: population dial (James: a living place) — capital fields
      // cfg.citizens per caste, satellites two-thirds of that
      const per = Math.max(0, Math.round(cfg.citizens * (ci === 0 ? 1 : 2 / 3)));
      for (let kind = 0; kind < 6; kind++) {
        for (let n = 0; n < per; n++) {
          const ndI = (Math.random() * geo.nodes.length) | 0;
          const nd = geo.nodes[ndI];
          const glow = actorBase(0, 0, 190, 200);
          glow.sat = 88;
          glow.halo = 1.6;
          glow.fadeDur = 1.6;
          actorOrbs.push(glow);
          // (vnorm lives in the flight section — a TDZ trap at init time;
          // makeActors runs before it exists, so normalize by hand here)
          const ax = [rand(-1, 1), rand(-0.6, 0.6), rand(-1, 1)];
          const al = Math.hypot(ax[0], ax[1], ax[2]) || 1;
          const axis = [ax[0] / al, ax[1] / al, ax[2] / al];
          const bot = {
            kind, ci, ndI, glow, axis,
            pos: [com.c[0] + nd.p[0] + rand(-80, 80), com.c[1] + nd.p[1] + rand(-40, 40), com.c[2] + nd.p[2] + rand(-80, 80)],
            f: [0, 0, -1],
            vel: [0, 0, 0],
            seed: rand(0, 100),
            a0: rand(0, TAU),
            w: rand(0.5, 1.5),
            rad: 1,
            target: null,
            u: Math.random(),
            dir: Math.random() < 0.5 ? -1 : 1,
            edge: geo.edges.length ? (Math.random() * geo.edges.length) | 0 : -1,
          };
          if (kind === 0) { bot.rad = nd.r * rand(1.5, 2.2); bot.w = rand(0.04, 0.09); }
          // v52: capital archivists circle OUTSIDE the bone — coreR is the
          // crust envelope there, so the orbit sphere must clear it
          if (kind === 2) {
            bot.rad = geo.coreR * (ci === 0 ? rand(1.06, 1.3) : rand(0.55, 0.95));
            bot.w = rand(0.01, 0.022);
          }
          if (kind === 4) { bot.rad = geo.shellR * rand(1.02, 1.12); bot.w = rand(0.005, 0.01); }
          if (kind === 5) { bot.rad = nd.r * rand(1.2, 1.55); bot.w = rand(0.14, 0.28); }
          cadenceBots.push(bot);
        }
      }
    }

    // -- the Saelyri (v56 Phase B1, v61 the crowds): light-beings living in
    // groups around their suns. saelyriLayout rolls the deterministic groups
    // and members; here they become kind-65 orb actors, and every assembling
    // group gets one kind-66 crowd cloud (its long-range read). Motion is
    // closed-form in updateActors — thousands are free.
    saeBeings.length = 0;
    saeGlyphs.length = 0;
    saeGroups.length = 0;
    const sae = saelyriLayout(COMM_GEO, cfg.saeCap, cfg.saeSat, cfg.saeGroup, cfg.saeKnot, cfg.saeStream, cfg.saeForm);
    const cc = [0, 0, 0];
    for (let ci = 0; ci < COMMUNITIES.length; ci++) {
      const com = COMMUNITIES[ci];
      const geo = COMM_GEO[ci];
      if (!com.c || !geo || !geo.nodes.length) continue;
      const states = sae.grp[ci].map((g) => {
        const gs = { g, ci, dmin: Infinity, near: null, trigT: -1, seedPos: [0, 0, 0], lastChord: -1e9, cloud: null, R: 0 };
        const R = saeCloud(g, geo, cc);
        // v63.5 THE CROWD CLOUDS ARE RETIRED (James, in flight: the beings
        // already resolve from far dots to energy bodies "very well"; the
        // cloud was "fuzzy puffballs from any distance" that beings flew
        // straight through — "the whole thing just isn't working at all").
        // saeCloud/saeCloudGate stay for the sim's geometry; no cloud orb is
        // ever made, the dial is gone, saved cfgs carrying saeCloud are ignored.
        const CROWD_CLOUDS = false;
        if (CROWD_CLOUDS && R > 0) {
          const [h1, h2] = SOC_FAMS[g.fam];
          const o = actorBase(66, 1, (h1 + h2) / 2, (h1 + h2) / 2);
          o.sat = 80;
          o.halo = 0;
          o.fadeDur = rand(8, 16);
          o.fix = [com.c[0] + cc[0], com.c[1] + cc[1], com.c[2] + cc[2]]; // seated, never origin
          o.fixedR = 0.01; // the frame gate brings it up to its radius
          o.p0 = g.seed;
          o.p1 = 0;
          actorOrbs.push(o);
          gs.cloud = o;
          gs.R = R;
        }
        return gs;
      });
      for (const gs of states) saeGroups.push(gs);
      for (const m of sae.mem[ci]) {
        const [h1, h2] = SOC_FAMS[m.fam];
        const o = actorBase(65, 5, rand(h1, h2), rand(h1, h2)); // 10m beings (James: "they're not giants")
        o.quadScale = 1.35;
        o.halo = 0.6;
        o.fadeDur = rand(4, 8);
        const nd = geo.nodes[m.ndI];
        o.fix = [com.c[0] + nd.p[0] + m.rad2, com.c[1] + nd.p[1], com.c[2] + nd.p[2]]; // seated, never origin
        actorOrbs.push(o);
        saeBeings.push({ ci, o, m, gs: m.gi >= 0 ? states[m.gi] : null, ack: 0, d: 1e9, lastChord: -1e9, seed: m.seed });
      }
    }
    // the greeting glyph pool: six sprites, assigned to whoever is greeting
    for (let i = 0; i < 6; i++) {
      const o = actorBase(60, 4, 0, 0);
      o.p0 = SAE_GLYPH0;
      o.p1 = 0;
      o.fixedR = 0;
      o.fix = [0, 9e6, 0]; // parked far overhead until a greeting claims it
      actorOrbs.push(o);
      saeGlyphs.push({ o, being: null });
    }
  }

  // world position of a free orb right now (same math as the frame loop) —
  // lets a robot follow the thing it's servicing as it wanders
  function orbWorldPos(o, t) {
    if (o.fix) return [o.fix[0], o.fix[1], o.fix[2]];
    const amp = o.dust ? 30 : o.portal ? 15 : 60;
    return [
      o.n[0] * cfg.spreadX + wander(o.wx, t) * amp,
      o.n[1] * cfg.spreadY + wander(o.wy, t) * amp * 0.6,
      o.n[2] * cfg.spreadZ + wander(o.wz, t) * amp,
    ];
  }

  // pick the fleet's next stop: inhabited orbs mostly, else depots and the
  // colonies (the Lantern beat retired with the Lantern, v52)
  function robotNextNode(rb, idx) {
    // v49: robots are LOCAL workers — nothing they pick may be more than a
    // commute away (the colonies are 250km out now; a robot cruising 110 m/s
    // must never sign up for a three-day haul). Too-far picks fall through
    // to the nearest station.
    const LOCAL = 40000;
    const near = (p) => Math.hypot(p[0] - rb.pos[0], p[1] - rb.pos[1], p[2] - rb.pos[2]) < LOCAL;
    const roll = Math.random();
    if (roll < 0.45) {
      if (!robotFleet.nodes || !robotFleet.nodes.length) {
        robotFleet.nodes = orbs.filter((o) => o.kind && o.kind < 60 && !o.actor && !o.veil);
      }
      const o = pick(robotFleet.nodes);
      if (o && near(orbWorldPos(o, 0))) return { kind: "orb", o, stand: 0 };
    }
    if (roll < 0.9) {
      const col = REEF_COLONIES.find((c) => near(c.c));
      if (roll >= 0.7 && col) {
        return { kind: "point", p: [col.c[0] + rand(-200, 200), col.c[1] + rand(0, 160), col.c[2] + rand(-200, 200)], stand: 60 };
      }
      const arr = Math.random() < 0.6 ? STATIONS.h2o : STATIONS.deu;
      const local = arr.filter(near);
      if (local.length) return { kind: "point", p: pick(local), stand: 40, isStation: true };
    }
    // fallback: the nearest station of any kind — always local by definition
    let best = null, bd = Infinity;
    for (const arr of [STATIONS.h2o, STATIONS.deu]) {
      for (const c of arr) {
        const d = Math.hypot(c[0] - rb.pos[0], c[1] - rb.pos[1], c[2] - rb.pos[2]);
        if (d < bd) { bd = d; best = c; }
      }
    }
    return { kind: "point", p: best, stand: 40, isStation: true };
  }

  function updateActors(t, dt, bb) {
    // colony life
    for (const a of colonyLife) {
      if (a.type === "mote") {
        a.u += dt / a.dur;
        if (a.u >= 1) {
          a.a = a.b;
          a.b = pick(colonyPolyps[a.ci].length ? colonyPolyps[a.ci] : [REEF_COLONIES[a.ci].c]);
          a.u = 0;
          a.dur = rand(2.5, 6);
        }
        const c = REEF_COLONIES[a.ci].c;
        const mid = [
          (a.a[0] + a.b[0]) / 2 + ((a.a[0] + a.b[0]) / 2 - c[0]) * 0.25,
          (a.a[1] + a.b[1]) / 2 + 30,
          (a.a[2] + a.b[2]) / 2 + ((a.a[2] + a.b[2]) / 2 - c[2]) * 0.25,
        ];
        const e = a.u * a.u * (3 - 2 * a.u); // ease
        for (let i = 0; i < 3; i++) a.o.fix[i] = qBez(a.a, mid, a.b, e, i);
      } else if (a.type === "glyph") {
        a.life += dt;
        if (a.life >= a.dur) {
          a.life = 0;
          a.dur = rand(6, 11);
          a.from = pick(colonyPolyps[a.ci].length ? colonyPolyps[a.ci] : [REEF_COLONIES[a.ci].c]);
          const c = REEF_COLONIES[a.ci].c;
          const out = vnorm([a.from[0] - c[0], 0, a.from[2] - c[2]]);
          const sp = rand(6, 14);
          a.vel = [out[0] * sp + rand(-3, 3), rand(4, 10), out[2] * sp + rand(-3, 3)];
          a.o.p0 = (Math.random() * GLYPH_N) | 0;
          a.o.fixedR = rand(4, 9);
          a.o.fix = a.from.slice();
        }
        for (let i = 0; i < 3; i++) a.o.fix[i] += a.vel[i] * dt;
        const u = a.life / a.dur;
        a.o.p1 = Math.min(1, u / 0.12) * Math.min(1, (1 - u) / 0.3) * 0.9;
      } else if (a.type === "darter") {
        const c = REEF_COLONIES[a.ci].c;
        const P = (tt) => [
          c[0] + Math.sin(tt * a.w1 + a.s1) * a.R,
          c[1] + 40 + Math.sin(tt * a.w2 + a.s2) * a.R * 0.35,
          c[2] + Math.sin(tt * a.w3 + a.s3) * a.R,
        ];
        const now = P(t), prev = P(t - 0.06);
        const v = [now[0] - prev[0], now[1] - prev[1], now[2] - prev[2]];
        const ang = Math.atan2(vdot(v, bb.u), vdot(v, bb.r));
        for (let k = 0; k < 4; k++) {
          const p = k === 0 ? now : P(t - k * 0.07);
          a.os[k].fix[0] = p[0];
          a.os[k].fix[1] = p[1];
          a.os[k].fix[2] = p[2];
          a.os[k].p0 = ang;
        }
      } else if (a.type === "jelly") {
        const c = REEF_COLONIES[a.ci].c;
        const th = t * a.w + a.s;
        a.o.fix[0] = c[0] + Math.cos(th) * a.R;
        a.o.fix[1] = c[1] + 60 + Math.sin(t * a.bob + a.s * 2) * 45;
        a.o.fix[2] = c[2] + Math.sin(th) * a.R;
      } else if (a.type === "moth") {
        a.retarget -= dt;
        if (a.retarget <= 0) {
          a.retarget = rand(14, 26);
          a.anchor = pick(colonyPolyps[a.ci].length ? colonyPolyps[a.ci] : [REEF_COLONIES[a.ci].c]);
        }
        const th = t * a.w + a.s;
        a.o.fix[0] = a.anchor[0] + Math.sin(th) * a.A;
        a.o.fix[1] = a.anchor[1] + Math.sin(th * 2) * a.A * 0.4;
        a.o.fix[2] = a.anchor[2] + Math.cos(th) * a.A;
      }
    }

    // the Cadence citizens (v51): cheap closed-form work loops per caste —
    // only once their bodies exist (their glows stay dark on file://)
    if (cadenceMesh.ready) {
      const circle = (c, axis, rad, th) => {
        const ref = Math.abs(axis[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
        const e1 = vnorm(vcross(ref, axis));
        const e2 = vcross(axis, e1);
        return [
          c[0] + (e1[0] * Math.cos(th) + e2[0] * Math.sin(th)) * rad,
          c[1] + (e1[1] * Math.cos(th) + e2[1] * Math.sin(th)) * rad,
          c[2] + (e1[2] * Math.cos(th) + e2[2] * Math.sin(th)) * rad,
        ];
      };
      for (const rb of cadenceBots) {
        const com = COMMUNITIES[rb.ci];
        const geo = COMM_GEO[rb.ci];
        if (!com.c || !geo || !geo.nodes.length) continue;
        const nd = geo.nodes[rb.ndI % geo.nodes.length];
        const ndW = [com.c[0] + nd.p[0], com.c[1] + nd.p[1], com.c[2] + nd.p[2]];
        const prev = [rb.pos[0], rb.pos[1], rb.pos[2]];
        let look = null;
        if (rb.kind === 1) {
          // lattice-wright: servo-travels point to point through the webbing.
          // v52 at the capital: crust worker — hops between nearby points
          // just off the bone surface (near the current bearing, so the
          // straight leg never chords through the skull).
          if (!rb.target || Math.hypot(rb.target[0] - rb.pos[0], rb.target[1] - rb.pos[1], rb.target[2] - rb.pos[2]) < 60) {
            if (rb.ci === 0) {
              const cur = vnorm([rb.pos[0] || 1, rb.pos[1], rb.pos[2]]);
              const d = vnorm([
                cur[0] + rand(-0.5, 0.5), cur[1] + rand(-0.5, 0.5), cur[2] + rand(-0.5, 0.5)]);
              const f = rand(1.05, 1.22);
              rb.target = [d[0] * SKULL_EL[0] * f, d[1] * SKULL_EL[1] * f, d[2] * SKULL_EL[2] * f];
            } else {
              const d = vnorm([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
              const r = geo.coreR * rand(0.15, 0.95);
              rb.target = [com.c[0] + d[0] * r, com.c[1] + d[1] * r * 0.8, com.c[2] + d[2] * r];
            }
          }
          const dx = rb.target[0] - rb.pos[0], dy = rb.target[1] - rb.pos[1], dz = rb.target[2] - rb.pos[2];
          const d = Math.hypot(dx, dy, dz) || 1;
          const cruise = clamp(d / 8, 14, 60);
          const k = 1 - Math.exp(-dt / 1.6);
          rb.vel[0] += ((dx / d) * cruise - rb.vel[0]) * k;
          rb.vel[1] += ((dy / d) * cruise - rb.vel[1]) * k;
          rb.vel[2] += ((dz / d) * cruise - rb.vel[2]) * k;
          rb.pos[0] += rb.vel[0] * dt;
          rb.pos[1] += rb.vel[1] * dt;
          rb.pos[2] += rb.vel[2] * dt;
        } else if (rb.kind === 3 && rb.edge >= 0 && geo.edges.length) {
          // ferry: shuttles a light bridge end to end, sun skin to sun skin
          const [ea, eb] = geo.edges[rb.edge % geo.edges.length];
          const na = geo.nodes[ea], nb = geo.nodes[eb];
          const p0 = [com.c[0] + na.p[0], com.c[1] + na.p[1], com.c[2] + na.p[2]];
          const q0 = [com.c[0] + nb.p[0], com.c[1] + nb.p[1], com.c[2] + nb.p[2]];
          const dd = vnorm([q0[0] - p0[0], q0[1] - p0[1], q0[2] - p0[2]]);
          const p = [p0[0] + dd[0] * na.r, p0[1] + dd[1] * na.r, p0[2] + dd[2] * na.r];
          const q = [q0[0] - dd[0] * nb.r, q0[1] - dd[1] * nb.r, q0[2] - dd[2] * nb.r];
          const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) || 1;
          rb.u += (dt * rb.dir * (120 + rb.w * 60)) / len;
          if (rb.u >= 1) {
            rb.u = 1;
            rb.dir = -1;
            if (Math.random() < 0.35) rb.edge = (Math.random() * geo.edges.length) | 0;
          } else if (rb.u <= 0) {
            rb.u = 0;
            rb.dir = 1;
            if (Math.random() < 0.35) rb.edge = (Math.random() * geo.edges.length) | 0;
          }
          const e = rb.u * rb.u * (3 - 2 * rb.u);
          for (let i = 0; i < 3; i++) rb.pos[i] = p[i] + (q[i] - p[i]) * e;
          rb.pos[1] += Math.sin(t * 0.8 + rb.seed) * 3 - 26; // rides just under its bridge
        } else {
          // the orbital castes: chanter (its sun), archivist (the core),
          // warden (the shell), gardener (tight around its sun's crystals)
          const center = rb.kind === 0 || rb.kind === 5 ? ndW : com.c;
          const th = t * rb.w * (rb.kind === 2 || rb.kind === 4 ? rb.dir : 1) + rb.a0;
          const want = circle(center, rb.axis, rb.rad, th);
          if (rb.kind === 0) {
            want[1] += Math.sin(t * 0.5 + rb.seed) * nd.r * 0.08;
            look = ndW; // the chanter always faces the light it sings to
          }
          if (rb.kind === 5) look = ndW;
          rb.pos[0] = want[0];
          rb.pos[1] = want[1];
          rb.pos[2] = want[2];
        }
        // facing: along travel, unless the caste has something to behold
        const mv = [rb.pos[0] - prev[0], rb.pos[1] - prev[1], rb.pos[2] - prev[2]];
        const sp = Math.hypot(mv[0], mv[1], mv[2]);
        let ft = null;
        if (look) {
          ft = vnorm([look[0] - rb.pos[0], look[1] - rb.pos[1], look[2] - rb.pos[2]]);
        } else if (sp > 0.01) {
          ft = [mv[0] / sp, mv[1] / sp, mv[2] / sp];
        }
        if (ft) {
          const k2 = 1 - Math.exp(-dt * 3);
          rb.f = vnorm(vlerp(rb.f, ft, k2));
        }
        // work-light under the hull, same trick as the fleet
        rb.glow.fix[0] = rb.pos[0];
        rb.glow.fix[1] = rb.pos[1] - 3.2 + Math.sin(t * 1.2 + rb.seed) * 0.4;
        rb.glow.fix[2] = rb.pos[2];
        rb.glow.fixedR = 0.9 + Math.min(sp / Math.max(dt, 1e-3) / 120, 1) * 1.4;
      }
    }

    // -- the Saelyri (v56, v61 the crowds): closed-form poses, then
    // acknowledgment. Every position is a pure function of t (saelyriPose)
    // — nothing integrates, so a thousand beings at the capital cost a few
    // trig calls each and can never drift apart from society-sim's proofs.
    {
      const notice = cfg.saeNotice;
      const full = notice * 0.375;
      const tideMul = cfg.saeTide;
      const pa = [0, 0, 0], mm = [0, 0];
      for (const gs of saeGroups) { gs.dmin = Infinity; gs.near = null; }
      for (const sb of saeBeings) {
        const com = COMMUNITIES[sb.ci];
        const geo = COMM_GEO[sb.ci];
        if (!com.c || !geo || !geo.nodes.length) { sb.o.fixedR = 0; continue; }
        const g = sb.gs ? sb.gs.g : null;
        saelyriPose(g, sb.m, geo, t, tideMul, pa, sb.ci === 0);
        sb.o.fix[0] = com.c[0] + pa[0];
        sb.o.fix[1] = com.c[1] + pa[1];
        sb.o.fix[2] = com.c[2] + pa[2];
        saelyriMorph(g, sb.m, t, mm);
        sb.o.spin = mm[1]; // rides the spin slot — kind 65 never spins glass
        sb.o.p0 = mm[0];
        const dx = cam.pos[0] - sb.o.fix[0], dy = cam.pos[1] - sb.o.fix[1], dz = cam.pos[2] - sb.o.fix[2];
        sb.d = Math.hypot(dx, dy, dz);
        if (sb.gs && sb.d < sb.gs.dmin) { sb.gs.dmin = sb.d; sb.gs.near = sb; }
      }
      // the ripple (James's pick for a crowd): a group notices you through
      // its nearest member and the greeting spreads outward from there at
      // ~45 m/s — the nearest few greet fully, the rest brighten in a wave
      for (const gs of saeGroups) {
        if (gs.dmin < notice) {
          if (gs.trigT < 0) {
            gs.trigT = t;
            gs.seedPos[0] = gs.near.o.fix[0];
            gs.seedPos[1] = gs.near.o.fix[1];
            gs.seedPos[2] = gs.near.o.fix[2];
          }
        } else gs.trigT = -1;
      }
      for (const sb of saeBeings) {
        if (!COMMUNITIES[sb.ci].c) continue;
        // acknowledgment: notice at the dial, full greeting at 37.5% of it
        const raw = clamp((notice - sb.d) / (notice - full), 0, 1);
        let gate = 1;
        if (sb.gs) {
          if (sb.gs.trigT < 0) gate = 0;
          else {
            const sp = sb.gs.seedPos;
            const lag = Math.hypot(sb.o.fix[0] - sp[0], sb.o.fix[1] - sp[1], sb.o.fix[2] - sp[2]) / 45;
            gate = clamp((t - sb.gs.trigT - lag) / 0.8, 0, 1);
          }
        }
        sb.ack += (raw * gate - sb.ack) * (1 - Math.exp(-dt * 2.2));
        sb.o.p1 = sb.ack;
        // the chord: once per being per long while, never two at once, and
        // a knot answers as one voice (per-group spacing) — never a shop bell
        if (raw > 0.6 && sb.ack > 0.55 && t - sb.lastChord > 25 && t - saeChordLast > 1.6 &&
            (!sb.gs || t - sb.gs.lastChord > 6)) {
          sb.lastChord = t;
          saeChordLast = t;
          if (sb.gs) sb.gs.lastChord = t;
          saelyriChord(sb.m.fam, 1 - sb.d / notice);
        }
      }
      // glyph pool: the nearest greeters get the six sprites
      const greeting = saeBeings.filter((sb) => sb.ack > 0.5).sort((a, b) => a.d - b.d);
      for (let gi = 0; gi < saeGlyphs.length; gi++) {
        const gp = saeGlyphs[gi];
        const sb = gi < greeting.length ? greeting[gi] : null;
        if (gp.being !== sb) {
          gp.being = sb;
          if (sb) {
            // each fresh greeting draws a glyph and a color of its own
            // (James: ten glyphs, random colors)
            gp.o.p0 = SAE_GLYPH0 + ((Math.random() * 10) | 0);
            gp.o.h1 = rand(0, 360);
            gp.o.h2 = gp.o.h1;
            gp.o.sat = 85;
          }
        }
        if (!sb) {
          gp.o.fixedR = 0;
          gp.o.p1 = 0;
          gp.o.fix[1] = 9e6;
          continue;
        }
        // drawn in light above the being, leaned toward the pod
        const tc = [cam.pos[0] - sb.o.fix[0], cam.pos[1] - sb.o.fix[1], cam.pos[2] - sb.o.fix[2]];
        const tl = Math.hypot(tc[0], tc[1], tc[2]) || 1;
        gp.o.fix[0] = sb.o.fix[0] + (tc[0] / tl) * 4;
        gp.o.fix[1] = sb.o.fix[1] + 9 + (tc[1] / tl) * 4;
        gp.o.fix[2] = sb.o.fix[2] + (tc[2] / tl) * 4;
        gp.o.fixedR = 4;
        gp.o.p1 = clamp((sb.ack - 0.5) / 0.4, 0, 1) * (0.78 + 0.22 * Math.sin(t * 2.1 + sb.seed));
      }
      // the crowd clouds: one soft glow per assembling group, the read from
      // afar — gone inside 2.5 radii (fill-rate discipline) and scaled by
      // the tide, so a dispersed crowd shows no cloud. Below the gate the
      // quad collapses to a point: a zero-alpha quad still costs its pixels.
      for (const gs of saeGroups) {
        const o = gs.cloud;
        if (!o) continue;
        const com = COMMUNITIES[gs.ci];
        if (!com.c) { o.fixedR = 0.01; o.p1 = 0; continue; }
        const g = gs.g;
        const tide = g.verb === 0 || g.verb === 3 || g.verb === 6 ? saeTide(g, t, tideMul) : 1;
        const dx = cam.pos[0] - o.fix[0], dy = cam.pos[1] - o.fix[1], dz = cam.pos[2] - o.fix[2];
        const s = saeCloudGate(Math.hypot(dx, dy, dz), gs.R, g.n) * tide;
        o.p1 = s;
        o.fixedR = s > 0.002 ? gs.R : 0.01;
      }
    }

    // the fleet: to and fro, pick up, deliver (only once the body exists)
    if (!robotMesh.ready) return;
    for (let ri = 0; ri < robotFleet.list.length; ri++) {
      const rb = robotFleet.list[ri];
      if (!rb.node) {
        rb.node = robotNextNode(rb, ri);
        rb.state = "travel";
        // leaving a station = picking up supplies
        rb.carrying = Math.random() < 0.55;
      }
      const tp = rb.node.kind === "orb" ? orbWorldPos(rb.node.o, t) : rb.node.p;
      const stand = rb.node.kind === "orb" ? radiusOf(rb.node.o) + 16 : rb.node.stand;
      const dx = tp[0] - rb.pos[0], dy = tp[1] - rb.pos[1], dz = tp[2] - rb.pos[2];
      const d = Math.hypot(dx, dy, dz) || 1;
      if (rb.state === "travel") {
        const cruise = clamp(d / 6, 24, 110);
        const k = 1 - Math.exp(-dt / 1.4);
        rb.vel[0] += ((dx / d) * cruise - rb.vel[0]) * k;
        rb.vel[1] += ((dy / d) * cruise - rb.vel[1]) * k;
        rb.vel[2] += ((dz / d) * cruise - rb.vel[2]) * k;
        if (d < stand + 26) {
          rb.state = "service";
          rb.serviceT = rand(7, 16);
        }
      } else {
        // service: a slow patient orbit around the client
        rb.serviceT -= dt;
        rb.orbit += dt * 0.35;
        const so = stand + 10;
        const want = [
          tp[0] + Math.cos(rb.orbit) * so,
          tp[1] + Math.sin(t * 0.9 + rb.seed) * 5,
          tp[2] + Math.sin(rb.orbit) * so,
        ];
        const k = 1 - Math.exp(-dt / 0.9);
        rb.vel[0] += ((want[0] - rb.pos[0]) * 0.8 - rb.vel[0]) * k;
        rb.vel[1] += ((want[1] - rb.pos[1]) * 0.8 - rb.vel[1]) * k;
        rb.vel[2] += ((want[2] - rb.pos[2]) * 0.8 - rb.vel[2]) * k;
        if (rb.node.kind === "orb") rb.node.o.svc = 1.6; // the visit wakes the orb
        if (rb.serviceT <= 0) {
          rb.node = null; // deliveries done — next client
          rb.carrying = false;
        }
      }
      rb.pos[0] += rb.vel[0] * dt;
      rb.pos[1] += rb.vel[1] * dt;
      rb.pos[2] += rb.vel[2] * dt;
      const sp = Math.hypot(rb.vel[0], rb.vel[1], rb.vel[2]);
      if (sp > 2) {
        const k2 = 1 - Math.exp(-dt * 3);
        rb.f = vnorm(vlerp(rb.f, [rb.vel[0] / sp, rb.vel[1] / sp, rb.vel[2] / sp], k2));
      }
      // engine glow rides under the hull, brighter the harder it works
      rb.glow.fix[0] = rb.pos[0];
      rb.glow.fix[1] = rb.pos[1] - 2.6 + Math.sin(t * 1.3 + rb.seed) * 0.4;
      rb.glow.fix[2] = rb.pos[2];
      rb.glow.fixedR = 1.1 + (sp / 110) * 1.6;
      // cargo swings below on the way to a delivery
      rb.cargo.fixedR = rb.carrying ? 1.7 : 0;
      if (rb.carrying) {
        rb.cargo.fix[0] = rb.pos[0] + rb.f[0] * -1.2;
        rb.cargo.fix[1] = rb.pos[1] - 4.4;
        rb.cargo.fix[2] = rb.pos[2] + rb.f[2] * -1.2;
      }
    }
  }

  let veilOrbs = [];
  let eyeOrbs = [];
  let reefOrbs = [];
  let stationOrbs = [];
  let commOrbs = [];
  let fieldPool = [];
  let dustPool = [];
  // v50 society GPU state — filled by the program section further down;
  // uploadCommunities() no-ops until then (relayout runs once before GL init).
  const commGL = { inited: false, solid: null, glass: null, bridge: null, meshes: [] };
  // v52 the Korrudan crust: static world-fixed mesh, served-only (crust.bin);
  // rides the society solid program. On file:// the bone stands bare.
  const crustGL = { ready: false, mesh: null };

  // v50: each Saelyri node carries a heart-flagged glow — the beacon trick
  // (fog-proof, never smaller than a star), so every society reads from
  // across the 1,000 km as a small constellation in its family colors.
  function makeCommunityOrbs() {
    const out = [];
    for (let ci = 0; ci < COMMUNITIES.length; ci++) {
      const com = COMMUNITIES[ci];
      const geo = COMM_GEO[ci];
      if (!com.c || !geo) continue;
      for (const nd of geo.nodes) {
        const [h1, h2] = SOC_FAMS[nd.fam];
        const b = baseOrb([0, 0, 0], false, false);
        b.heart = true;
        b.fix = [com.c[0] + nd.p[0], com.c[1] + nd.p[1], com.c[2] + nd.p[2]];
        b.fixedR = nd.r * 0.5;
        b.h1 = rand(h1, h2);
        b.h2 = rand(h1, h2);
        b.sat = 72;
        b.fadeDur = 6 + (nd.phase / TAU) * 6; // each sun breathes its own tempo
        b.halo = 2.2;
        b.spin = 0;
        b.variant = 0;
        out.push(b);
      }
    }
    return out;
  }

  function newGroupCtx() {
    return {
      mode: cfg.grouping,
      centers: Array.from({ length: clamp(Math.round(cfg.count / 24), 3, 14) }, () => [
        rand(-0.85, 0.85), rand(-0.55, 0.55), rand(-0.85, 0.85),
      ]),
      levels: Array.from({ length: 3 + ((Math.random() * 3) | 0) }, () => rand(-0.8, 0.8)),
      p1: rand(0, TAU),
      p2: rand(0, TAU),
    };
  }

  // a welcoming committee: a dozen orbs ring the spawn at 250–1000m, evenly
  // spread in angle and on the large side, so waking up is never dark
  function makeRing() {
    const ring = [];
    for (let i = 0; i < 12; i++) {
      const d = rand(250, 1000);
      const th = (i / 12) * TAU + rand(-0.3, 0.3);
      const ph = rand(-0.35, 0.35);
      const o = baseOrb([
        clamp((Math.cos(th) * Math.cos(ph) * d) / cfg.spreadX, -1, 1),
        clamp((Math.sin(ph) * d) / cfg.spreadY, -1, 1),
        clamp((Math.sin(th) * Math.cos(ph) * d) / cfg.spreadZ, -1, 1),
      ], false);
      o.ur = rand(0.45, 1);
      decorate(o);
      // the welcoming committee guarantees a few wonders by the monument:
      // a gas-giant worldlet, a reactor, the reading bear, and the fish
      if (i === 0) { o.kind = 50; o.p0 = 5; o.ur = rand(0.8, 1); o.quadScale = 1.3; o.spin = 0; o.halo = 0.5; o.sat = 70; }
      if (i === 3) { o.kind = 7; o.p0 = 0; }
      if (i === 5) { o.kind = 40; o.p0 = 0; o.ur = rand(0.7, 1); }
      if (i === 8) { o.kind = 2; o.p0 = 0; }
      ring.push(o);
    }
    return ring;
  }

  // three pale orbs within sight of home, so the way onward is never far
  function makePortals() {
    return [
      baseOrb([-500 / cfg.spreadX, 60 / cfg.spreadY, -650 / cfg.spreadZ], true),
      baseOrb([650 / cfg.spreadX, -40 / cfg.spreadY, 250 / cfg.spreadZ], true),
      baseOrb([100 / cfg.spreadX, 120 / cfg.spreadY, 800 / cfg.spreadZ], true),
    ];
  }

  // the Heart: the mysterious ambient source, made visible. One bright slow
  // pulse at the exact center of the volume — fog-proof, never smaller than a
  // star on screen. Wherever you are, it marks home.
  function makeHeart() {
    const o = baseOrb([0, 0, 0], false, false);
    o.heart = true;
    o.fixedR = 60;
    o.fadeDur = 7;
    o.halo = 2.2;
    o.spin = 0;
    o.variant = 0;
    return o;
  }

  // veil patches: huge, very dim glowing washes parked on the cave's ceiling,
  // floor, and walls, just past the flyable bounds — the faint mottling of
  // rock surfaces miles away. A deterministic grid, so EVERY view direction
  // meets at least one; no look is ever pure black.
  // v49: the walls moved to the REAL bounds (500km out) — veils are fixed
  // world coords now (not spread-scaled; the spreads are the core), scaled
  // ~21x so the angular cover from the middle of the space matches v38.
  // They're fog-exempt in the shader: rock 600km away still reads as rock.
  function makeVeils() {
    const veils = [];
    const patch = (nx, ny, nz) => {
      const o = baseOrb([0, 0, 0], false, false);
      o.veil = true;
      o.fix = [nx * SPACE_X, ny * SPACE_Y, nz * SPACE_Z];
      o.fixedR = rand(67000, 109000);
      o.halo = 0.4;
      o.sat = rand(18, 32);
      o.fadeDur = rand(30, 70);
      o.spin = 0;
      o.variant = 0;
      return o;
    };
    const G = 6;
    for (let i = 0; i < G; i++) {
      for (let j = 0; j < G; j++) {
        const x = -1.15 + (2.3 * (i + 0.5)) / G + rand(-0.06, 0.06);
        const z = -1.15 + (2.3 * (j + 0.5)) / G + rand(-0.06, 0.06);
        veils.push(patch(x, rand(1.18, 1.3), z));   // ceiling
        veils.push(patch(x, -rand(1.18, 1.3), z));  // floor
      }
    }
    for (let i = 0; i < G; i++) {
      for (let j = 0; j < 2; j++) {
        const a = -1.15 + (2.3 * (i + 0.5)) / G + rand(-0.06, 0.06);
        const y = (j ? 0.55 : -0.55) + rand(-0.2, 0.2);
        veils.push(patch(rand(1.2, 1.3), y, a));    // +x wall
        veils.push(patch(-rand(1.2, 1.3), y, a));   // -x wall
        veils.push(patch(a, y, rand(1.2, 1.3)));    // +z wall
        veils.push(patch(a, y, -rand(1.2, 1.3)));   // -z wall
      }
    }
    return veils;
  }

  function fieldOrb(i) {
    // even structured modes keep a few strays — the cave is inhabited everywhere
    const stray = groupCtx.mode !== "scatter" && Math.random() < 0.1;
    const n = groupedPoint(stray ? "scatter" : groupCtx.mode, groupCtx);
    return decorate(baseOrb(n, (i + 1) % 60 === 0));
  }

  function assemble() {
    const ringUsed = Math.min(ringOrbs.length, cfg.count);
    const fieldNeed = Math.max(0, cfg.count - ringUsed);
    while (fieldPool.length < fieldNeed) fieldPool.push(fieldOrb(fieldPool.length));
    while (dustPool.length < cfg.dust) {
      // ember dust (v49): tiny motes in a CAMERA-LOCAL recycled box — the
      // frame loop wraps them around the ship, so flying always has parallax
      // to read speed against, anywhere in the 1,000km. o.n seeds the seat.
      dustPool.push(baseOrb([rand(-1.3, 1.3), rand(-1.3, 1.3), rand(-1.3, 1.3)], false, true));
    }
    // (the Heart orb retired 2026-07-18 — the Skull took over as home; the
    // HOME readout and edge marker still point at the origin, now its center)
    orbs = ringOrbs.slice(0, ringUsed).concat(
      fieldPool.slice(0, fieldNeed),
      portalOrbs,
      eyeOrbs,
      reefOrbs,
      stationOrbs,
      commOrbs,
      actorOrbs,
      veilOrbs,
      dustPool.slice(0, cfg.dust),
    );
    robotFleet.nodes = null; // the fleet re-learns its clients after a reshuffle

    // the monument stands alone: any orb inside the station's keep is pushed
    // radially out just beyond it. v52: the keep is the SKULL_EL ellipsoid
    // (+wander margin) — a 12km station needs an ellipsoid, not a sphere,
    // or the push either strands orbs in the bone or empties half the core.
    // Eyes exempt (they live in the sockets), dust exempt (ember
    // atmosphere), veils are outside anyway. Radial push in world space =
    // scaling the normalized coords, since world = n * spread componentwise.
    // Soft clamp keeps pushed orbs from leaving the field at extreme spreads.
    for (const o of orbs) {
      if (o.veil || o.dust || o.eye || o.fix) continue; // fixed monuments hold their ground
      const wx = o.n[0] * cfg.spreadX, wy = o.n[1] * cfg.spreadY, wz = o.n[2] * cfg.spreadZ;
      const en = Math.hypot(wx / (SKULL_EL[0] + 220), wy / (SKULL_EL[1] + 220), wz / (SKULL_EL[2] + 220));
      if (en < 1) {
        const f = (1 + Math.random() * 0.15) / Math.max(en, 0.02);
        o.n[0] = clamp(o.n[0] * f, -1.35, 1.35);
        o.n[1] = clamp(o.n[1] * f, -1.35, 1.35);
        o.n[2] = clamp(o.n[2] * f, -1.35, 1.35);
      }
      // v33: the load-in sightline stays clear — a cylinder along +Z from the
      // buffer edge to just past spawn. v52: stretched to the 27km spawn and
      // widened to 2100 for the station-sized face. Anything drifting into
      // frame between you and the face gets pushed sideways out.
      const wz2 = o.n[2] * cfg.spreadZ;
      if (wz2 > 0 && wz2 < 54600) {
        const wx2 = o.n[0] * cfg.spreadX, wy2 = o.n[1] * cfg.spreadY;
        const rr = Math.hypot(wx2, wy2);
        if (rr < 2100) {
          const f2 = (2100 * (1 + Math.random() * 0.2)) / Math.max(rr, 1);
          o.n[0] = clamp(o.n[0] * f2, -1.35, 1.35);
          o.n[1] = clamp(o.n[1] * f2, -1.35, 1.35);
        }
      }
    }
    instData = new Float32Array(orbs.length * FLOATS);
    order = new Uint16Array(orbs.length);
    dists = new Float32Array(orbs.length);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.STREAM_DRAW);
  }

  // v49: relayout re-seats the ring (colonies, their doorstep stations, the
  // actors that live around them) WITHOUT re-rolling the field pools — the
  // never-re-roll rule holds while James drags the ring sliders.
  function relayout() {
    applyColonyLayout(cfg.colonyDist, cfg.colonyVert, cfg.colonyJitter);
    applyCommunityLayout(cfg.colonyDist, cfg.commVert, cfg.commJitter, cfg.commSat);
    COMM_GEO = communityGeometry(cfg.commScale); // before stations: shellR feeds doorsteps
    uploadCommunities();
    STATIONS = stationGeometry();
    NEBULAE = nebulaGeometry(cfg.nebDensity, cfg.nebScale); // v53: layout dials
    reefOrbs = makeReef();
    stationOrbs = makeStations();
    commOrbs = makeCommunityOrbs();
    makeActors(); // after makeReef — the colony life needs the polyp lists
    assemble();
  }
  function rebuildAll() {
    groupCtx = newGroupCtx();
    fieldPool = [];
    dustPool = [];
    ringOrbs = makeRing();
    portalOrbs = makePortals();
    eyeOrbs = makeEyes();
    veilOrbs = makeVeils();
    relayout(); // colonies + stations + actors, then assemble
  }
  rebuildAll();

  // ---- camera + flight -------------------------------------------------------------

  // LOOK-ONLY BUILD: the camera is bolted in place 1600m outside the central
  // group, facing it. No translation of any kind — rotation is the only motion,
  // and it only happens when asked. Flight returns once looking works.
  // Free-flight orientation (James is a No Man's Sky pilot): the camera is an
  // orthonormal basis — f forward, r right, u up — rotated incrementally in
  // its OWN frame. Roll persists until R glides you back to the ecliptic.
  // v42: spawn aims between Korrudan's eyes — James measured the dead-on
  // pitch at −3° by eye (at the 1.8km skull). v52: the skull is 12km and the
  // eyes sit near y 0 from a 27km spawn — pitch resets to 0, James recalibrates.
  const SPAWN_PITCH = 0;
  const spawnBasis = () => ({
    f: [0, Math.sin(SPAWN_PITCH), -Math.cos(SPAWN_PITCH)],
    r: [1, 0, 0],
    u: [0, Math.cos(SPAWN_PITCH), Math.sin(SPAWN_PITCH)],
  });
  const cam = {
    // v22: 2600; v29: 3600; v30: 5600; v41: 20000; v52: 27000; v53.1: 54000 —
    // James wanted "twice as far back": the 12km station subtends ~13° from
    // here instead of 25°, so it reads as a place you fly TO. Nebula bank #1
    // hangs off to port with 13km of clearance (nebula-sim TEST 9 guards it).
    pos: [0, 0, 54000],
    ...spawnBasis(),
  };
  // v54.3: a captured spawn (TUNE → capture spawn) overrides the stock pose.
  // Pure pose-setter — orthonormalized here so a hand-edited or stale preset
  // can never ship a skewed basis. Mid-flight callers cancel the autopilot
  // themselves (autoNav is declared much later; at boot it doesn't exist yet).
  function applySpawnPose(pose) {
    if (!pose) return;
    const n3 = (v) => {
      const m = Math.hypot(v[0], v[1], v[2]);
      return m > 1e-6 ? [v[0] / m, v[1] / m, v[2] / m] : null;
    };
    const f = n3(pose.f);
    if (!f) return;
    const d = f[0] * pose.u[0] + f[1] * pose.u[1] + f[2] * pose.u[2];
    let u = n3([pose.u[0] - f[0] * d, pose.u[1] - f[1] * d, pose.u[2] - f[2] * d]);
    if (!u) {
      // stored up was parallel to forward — rebuild from world-up (or +x
      // when the nose points straight up/down)
      const w = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const dw = f[0] * w[0] + f[1] * w[1] + f[2] * w[2];
      u = n3([w[0] - f[0] * dw, w[1] - f[1] * dw, w[2] - f[2] * dw]);
    }
    cam.pos = pose.pos.slice();
    cam.f = f;
    cam.u = u;
    cam.r = [
      f[1] * u[2] - f[2] * u[1],
      f[2] * u[0] - f[0] * u[2],
      f[0] * u[1] - f[1] * u[0],
    ];
  }
  applySpawnPose(cfg.spawnPose);
  let pendingYaw = 0;   // eased look input awaiting application
  let pendingPitch = 0;
  // v47: the nose has rotational inertia now. Mouse deltas land in the
  // pending reservoir as before, but the applied rotation runs through a
  // critically-damped second-order filter — angular VELOCITY is continuous,
  // so hand jitter can't echo into rapid back-and-forth. Net rotation still
  // exactly equals the drag distance; it just arrives like a ship, not a
  // laser pointer. (James: "a space ship wouldn't fly like that.")
  let lookRateYaw = 0;   // rad/s, smoothed
  // v60 HEAD-LOOK + LOOK-INTO-THE-TURN (James: "I cannot look off to my
  // left as I go around the building"): the EYE is not the NOSE anymore.
  // head.* = right-mouse-drag swivel of the view off the boresight (target
  // returns to zero on release, both eased); lead.* = a few degrees of
  // view lean toward the direction the ship is turning, eased slowly.
  // Neither ever touches cam — flight, autopilot, the stick and every
  // rotation stay pure ship-frame; only camBasis() (what the eye/render/
  // clicks use) is composed from cam + these offsets. Movement uses cam.
  const head = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, on: false, lastX: 0, lastY: 0 };
  const lead = { yaw: 0, pitch: 0 };
  const HEAD_YAW_MAX = 100 * Math.PI / 180, HEAD_PITCH_MAX = 70 * Math.PI / 180;
  const HEAD_SENS = 0.0035;      // rad per pixel of right-drag
  const LEAD_GAIN = 0.19;        // s — turn rate (rad/s) → lean (rad): 31°/s ≈ 6°
  const LEAD_MAX = 6 * Math.PI / 180;
  let lookRatePitch = 0;
  // v48 drag-stick: where the press planted the stick center, and whether
  // the pilot's hand is "on". Beyond-deadzone pointer motion arms it;
  // autopilot engage, R-leveling, and H all disarm it, so a cursor merely
  // parked off-center can never steer the ship on its own.
  const stick = { ax: 0, ay: 0 };
  let stickLive = false;
  let rollVel = 0;      // rad/s
  // v55.3: what the reticle shows — the integral of COMMANDED roll (A/D),
  // eased home by R / goHome. Never derived from world attitude.
  let rollShown = 0;    // rad
  let leveling = false;
  let thrust = 0;       // current thruster speed, m/s
  let impulse = 0;      // impulse-drive speed, m/s — coasts on release (v44)
  let rcsU = 0, rcsR = 0; // v60 attitude jets: ship-frame up / right velocity (m/s)
  let overdrive = false;
  let allStop = false;  // X: brake to a halt (v37)
  // the tanks (v38): fractions 0..1. H2O feeds the booster, deuterium feeds
  // overdrive. Fly into a station to refill to full (chime + meter flourish).
  const fuel = { h2o: 1, deu: 1 };
  function refill(kind) {
    fuel[kind] = 1;
    fuelChime(kind);
    const bar = kind === "h2o" ? vsEls.h2oBar : vsEls.deuBar;
    bar.classList.remove("flare");
    void bar.offsetWidth; // restart the animation even on back-to-back fills
    bar.classList.add("flare");
    setTimeout(() => bar.classList.remove("flare"), 1100);
  }

  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const vnorm = (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const vlerp = (a, b, k) => [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];

  // Rodrigues rotation of v around unit axis by ang
  function vrot(v, axis, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const cr = vcross(axis, v);
    const d = vdot(axis, v) * (1 - c);
    return [
      v[0] * c + cr[0] * s + axis[0] * d,
      v[1] * c + cr[1] * s + axis[1] * d,
      v[2] * c + cr[2] * s + axis[2] * d,
    ];
  }

  function rotateCam(axis, ang) {
    cam.f = vrot(cam.f, axis, ang);
    cam.r = vrot(cam.r, axis, ang);
    cam.u = vrot(cam.u, axis, ang);
  }

  function orthonormalize() {
    cam.f = vnorm(cam.f);
    const d = vdot(cam.r, cam.f);
    cam.r = vnorm([cam.r[0] - cam.f[0] * d, cam.r[1] - cam.f[1] * d, cam.r[2] - cam.f[2] * d]);
    cam.u = vcross(cam.r, cam.f);
  }

  function goHome() {
    cam.pos = [0, 0, 54000];
    const b = spawnBasis();
    cam.f = b.f;
    cam.r = b.r;
    cam.u = b.u;
    // v54.3: home IS the captured spawn when one is set — H returns the
    // ship to the start condition, whatever James made it
    applySpawnPose(cfg.spawnPose);
    pendingYaw = 0;
    pendingPitch = 0;
    lookRateYaw = 0;
    lookRatePitch = 0;
    stickLive = false;
    rollVel = 0;
    rollShown = 0; // spawn pose = zero commanded roll (v55.3)
    leveling = false;
    thrust = 0;
    impulse = 0; rcsU = 0; rcsR = 0;
    head.yaw = head.pitch = head.tYaw = head.tPitch = 0; lead.yaw = lead.pitch = 0;
    overdrive = false;
    autoNav = null;
  }

  const keys = new Set();

  const isTyping = (e) =>
    e.target instanceof HTMLElement &&
    (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON");

  window.addEventListener("keydown", (e) => {
    if (isTyping(e)) return;
    keys.add(e.code);
    // hands ON anything = the autopilot lets go (N only toggles the panel)
    if (autoNav && e.code !== "KeyN") autoNav = null;
    if (e.code === "KeyN") setOpen("nav");
    if (e.code === "KeyT") setOpen("tune"); // v58: deck shortcuts on every button
    if (e.code === "KeyC") setOpen("ctrl");
    if (e.code === "KeyV") $v("vs-view").click();
    if (e.code === "KeyH") goHome();
    if (e.code === "KeyZ") zoomTarget = 1; // magnifier off, eased back
    if (e.code === "KeyX") {
      // all-stop (v37): cancel the drives, bleed to a halt fast
      if (overdrive) odThump(false);
      allStop = true;
      overdrive = false;
    }
    // any fresh thrust input releases the all-stop
    if (["ShiftLeft", "ShiftRight", "Space", "KeyW", "KeyS", "KeyR", "KeyF", "KeyQ", "KeyE"].includes(e.code)) allStop = false;
    if (e.code === "Space") {
      e.preventDefault();
      if (!overdrive && fuel.deu <= 0) {
        // no deuterium: the pulse drive won't light. SYS says why.
        vsEls.eng.textContent = "NO DEU";
      } else {
        overdrive = !overdrive;
        odThump(overdrive); // pulse drive ignition / wind-down (v34)
      }
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  // v55.1 the magnifier: wheel zooms toward/away, exponential so each
  // notch feels equal at any level. The frame loop eases zoom to this.
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomTarget = clamp(zoomTarget * Math.exp(-e.deltaY * 0.0015), 1, ZOOM_MAX);
  }, { passive: false });

  const drag = { on: false, downX: 0, downY: 0, downT: 0 };
  const mouse = { x: -1, y: -1 };

  canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // v60: right button is head-look
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 2) {
      // v60 head-look: hold the right button and drag — the view swivels
      // off the nose; let go and it eases back to boresight
      head.on = true; head.lastX = e.clientX; head.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    drag.on = true;
    drag.downX = e.clientX;
    drag.downY = e.clientY;
    drag.downT = performance.now();
    stick.ax = e.clientX; // v48: the press plants the stick center
    stick.ay = e.clientY;
    canvas.classList.add("dragging");
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (head.on) {
      head.tYaw = clamp(head.tYaw - (e.clientX - head.lastX) * HEAD_SENS, -HEAD_YAW_MAX, HEAD_YAW_MAX);
      head.tPitch = clamp(head.tPitch - (e.clientY - head.lastY) * HEAD_SENS, -HEAD_PITCH_MAX, HEAD_PITCH_MAX);
      head.lastX = e.clientX; head.lastY = e.clientY;
    }
    // v48 drag-stick: nothing accumulates here anymore — the frame loop
    // reads the live offset. Crossing the deadzone while holding is the
    // "hands on" signal that arms the stick and releases the autopilot /
    // leveling. Arming is per-hold (cleared on release, v48.2).
    if (!drag.on) return;
    const rc = reticleCenter();
    const ax = cfg.stickMode === "center" ? rc.x : stick.ax;
    const ay = cfg.stickMode === "center" ? rc.y : stick.ay;
    // center mode: only a hold that BEGAN near the reticle is a steering
    // grab — a drag that started out at a portal stays a drag. The grab
    // radius is its own dial since v54.2 (was reach/2 — too small to hit).
    const grabbed = cfg.stickMode !== "center" ||
      Math.hypot(drag.downX - ax, drag.downY - ay) <= cfg.stickGrab;
    if (grabbed && Math.hypot(e.clientX - ax, e.clientY - ay) > cfg.stickDead) {
      stickLive = true;
      leveling = false;
      autoNav = null; // steering by hand cancels the lock-on
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.button === 2) { head.on = false; head.tYaw = 0; head.tPitch = 0; return; }
    if (e.button !== 0) return;
    drag.on = false;
    stickLive = false; // v48.2: arming is per-hold — release always neutrals
    canvas.classList.remove("dragging");
    const moved = Math.abs(e.clientX - drag.downX) + Math.abs(e.clientY - drag.downY);
    if (moved < 6 && performance.now() - drag.downT < 400) {
      // an armed nav ring takes the click first: inside the circle = lock on
      if (navArmed && navTarget && navScreen.on &&
          Math.hypot(e.clientX - navScreen.x, e.clientY - navScreen.y) <= navScreen.r + 8) {
        autoNav = { standoff: navTarget.standoff };
        navAligned = 0;
        navArmed = false;
        stickLive = false; // v48: the parked cursor must not re-steer
        navRing.classList.remove("armed");
      } else {
        tryPortalClick(e.clientX, e.clientY);
      }
    }
  });
  // if the GPU ever drops the context (it happened once), recover honestly
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    location.reload();
  });

  const camBasis = () => {
    const y = head.yaw + lead.yaw, p = head.pitch + lead.pitch;
    if (y === 0 && p === 0) return { f: cam.f, r: cam.r, u: cam.u };
    // yaw about ship-up, then pitch about the swung right — same order as
    // the ship's own turns, so head-look reads exactly like turning would
    let f = vrot(cam.f, cam.u, y), r = vrot(cam.r, cam.u, y);
    const u = vrot(cam.u, r, p);
    f = vrot(f, r, p);
    return { f, r, u };
  };

  // ---- matrices -----------------------------------------------------------------

  const proj = new Float32Array(16);
  const view = new Float32Array(16);
  const vp = new Float32Array(16);
  const FOV = (72 * Math.PI) / 180; // v60: 60 → 72 (James: NMS cockpit width; the fisheye is the price)
  // v55.1 the magnifier (James's ask): wheel zooms the view 1×–8× by
  // narrowing the effective FOV; Z snaps back. zoom eases toward zoomTarget
  // in the frame loop (never snaps — motion restraint), and every
  // projection-adjacent tan(FOV/2) divides by it via tanF() so clicks, the
  // home marker and the nav ring stay glued to the world while zoomed.
  let zoom = 1, zoomTarget = 1;
  const ZOOM_MAX = 8;
  const tanF = () => Math.tan(FOV / 2) / zoom;
  // v55.4 LENS SHIFT (James: "press D... the reticle should stay pointed
  // exactly onto whatever I started from"): the reticle X sits at the GLASS
  // center, which is above the window center (the console eats the bottom) —
  // but the optical axis used to exit through the window center, so rolls
  // orbited the point under the X instead of holding it. The asymmetric
  // frustum moves the principal point up to the X: rolls, turns and the
  // magnifier all pivot exactly on the reticle cross. NDC shift, +up.
  const projShiftY = () => 1 - (2 * reticleCenter().y) / window.innerHeight;

  function setProj(aspect, shiftY) {
    const f = 1 / tanF();
    // v49: the far plane covers the whole big dimension (corner-to-corner
    // ~1,436km). Depth precision is spent up close where the meshes live;
    // orbs don't write depth, so far conflicts can't artifact.
    const near = 2, far = 1600000;
    proj.fill(0);
    proj[0] = f / aspect;
    proj[5] = f;
    proj[9] = -(shiftY || 0); // principal point at NDC +shiftY (the X)
    proj[10] = (far + near) / (near - far);
    proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);
  }
  function setView(b) {
    // v49 CAMERA-RELATIVE: everything renders in SHIP space. Positions are
    // subtracted against cam.pos in JS (float64) before they reach the GPU,
    // so the view matrix is rotation-only — zero translation. This is what
    // kills float32 jitter at 250km+ from the origin; do not reintroduce a
    // world-space translation here.
    view[0] = b.r[0]; view[4] = b.r[1]; view[8] = b.r[2];
    view[1] = b.u[0]; view[5] = b.u[1]; view[9] = b.u[2];
    view[2] = -b.f[0]; view[6] = -b.f[1]; view[10] = -b.f[2];
    view[3] = 0; view[7] = 0; view[11] = 0;
    view[12] = 0;
    view[13] = 0;
    view[14] = 0;
    view[15] = 1;
  }
  function mulVP() {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        vp[c * 4 + r] =
          proj[r] * view[c * 4] +
          proj[4 + r] * view[c * 4 + 1] +
          proj[8 + r] * view[c * 4 + 2] +
          proj[12 + r] * view[c * 4 + 3];
      }
    }
  }

  // ---- the Skull -----------------------------------------------------------------
  // A 600m fossil skull at the exact center of the dimension — James's Meshy
  // model ("alien god skull v2"), prepped by tmp/orb-dimension/skull_prep.py:
  // recentered on the origin, decimated 1.29M→206k tris, exported as a custom
  // binary (interleaved pos/norm/uv + u32 indices) with a 2K basecolor JPG.
  // It replaced the Heart as home: the HOME readout and edge marker point at
  // the origin, which is now the skull's center. The face looks toward +Z —
  // straight at the spawn point. The mouth is an open ring and the severed
  // underside is open too: in through the teeth, out below. No collision;
  // the walls are ghosts for now.
  // Served-only enhancement: needs fetch(), so on file:// the world simply
  // has no skull (graceful absence per house rules).
  const skull = { ready: false, count: 0, prog: null, vao: null, tex: null, U: {} };
  (async () => {
    try {
      const [buf, img, normImg] = await Promise.all([
        fetch("assets/skull/skull.bin").then((r) => {
          if (!r.ok) throw new Error("skull.bin " + r.status);
          return r.arrayBuffer();
        }),
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = "assets/skull/skull-basecolor.jpg";
        }),
        // the Meshy normal map (extracted raw from the source GLB, v34) — the
        // fine sculpted detail the decimation can't carry. Optional: if it
        // fails to load the skull just lights by vertex normals as before.
        new Promise((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => res(null);
          im.src = "assets/skull/skull-normal.jpg";
        }),
      ]);
      const dv = new DataView(buf);
      if (dv.getUint32(0, false) !== 0x534b554c) throw new Error("bad magic"); // "SKUL"
      const nv = dv.getUint32(4, true);
      const ni = dv.getUint32(8, true);
      const verts = new Float32Array(buf, 12, nv * 8);
      const idx = new Uint32Array(buf, 12 + nv * 32, ni);

      // the binary is canonical at 600m tall; the world wants a monument.
      // v28 after James's first look ("not even bigger than the orbs"): 3x.
      // v52 (James, the Knowhere brief): 20x → 12km tall — Korrudan is the
      // station now, spanning the core's full height. Everything that hangs
      // off this number (eyes, gaze, KEEP ellipsoids, spawn, crust) is
      // scaled in its own place — grep v52 before touching.
      // v32: head tilted back 5° (rotation about X; face lifts skyward).
      // The eye orbs in makeEyes() carry the same rotation baked into their
      // fixed positions — retilt them if this angle changes.
      const SKULL_SCALE = 20.0;
      const SKULL_TILT = (-5 * Math.PI) / 180;
      const ct = Math.cos(SKULL_TILT), st = Math.sin(SKULL_TILT);
      for (let i = 0; i < nv; i++) {
        const o = i * 8;
        const y = verts[o + 1] * SKULL_SCALE, z = verts[o + 2] * SKULL_SCALE;
        verts[o] *= SKULL_SCALE;
        verts[o + 1] = y * ct - z * st;
        verts[o + 2] = y * st + z * ct;
        const ny = verts[o + 4], nz = verts[o + 5];
        verts[o + 4] = ny * ct - nz * st;
        verts[o + 5] = ny * st + nz * ct;
      }

      const svs = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform vec3 uCamPos;
out vec3 vN;
out vec2 vUV;
out float vDist;
out vec3 vP;
void main() {
  vN = aNorm;
  vUV = aUV;
  vP = aPos;
  // v49 camera-relative: uVP carries rotation only; subtract the camera here.
  // The skull's own coords are small (it lives at the origin), so this
  // subtraction is exact where it matters — up close.
  vec3 rp = aPos - uCamPos;
  vDist = length(rp);
  gl_Position = uVP * vec4(rp, 1.0);
}`;
      const sfs = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uNorm;
uniform float uHasNorm;
uniform float uFog;
uniform float uTime;
in vec3 vN;
in vec2 vUV;
in float vDist;
in vec3 vP;
out vec4 oC;
${COMM_AER}

// cotangent-frame normal mapping (Schueler): the tangent basis is derived
// per-pixel from screen-space derivatives of position and UV, so no tangent
// attribute is needed and any UV flip is absorbed into B automatically.
vec3 perturb(vec3 N, vec3 P, vec2 uv) {
  vec3 dp1 = dFdx(P), dp2 = dFdy(P);
  vec2 du1 = dFdx(uv), du2 = dFdy(uv);
  vec3 dp2p = cross(dp2, N);
  vec3 dp1p = cross(N, dp1);
  vec3 T = dp2p * du1.x + dp1p * du2.x;
  vec3 B = dp2p * du1.y + dp1p * du2.y;
  float inv = inversesqrt(max(dot(T, T), dot(B, B)) + 1e-12);
  vec3 tn = texture(uNorm, uv).rgb * 2.0 - 1.0; // glTF convention: +Y up
  return normalize(mat3(T * inv, B * inv, N) * tn);
}

void main() {
  vec3 base = texture(uTex, vUV).rgb;
  vec3 N = normalize(vN);
  if (uHasNorm > 0.5) N = perturb(N, vP, vUV);
  // starlight key high-left, cool fill from the right, and the Heart's soul:
  // a warm pulse breathing up out of the open mouth from below
  float key = max(dot(N, normalize(vec3(-0.45, 0.80, 0.42))), 0.0);
  float fill = max(dot(N, normalize(vec3(0.65, -0.05, -0.60))), 0.0);
  float up = max(dot(N, normalize(vec3(0.0, -0.92, 0.38))), 0.0);
  float pulse = 0.55 + 0.45 * sin(uTime * 0.45);
  vec3 col = base * (vec3(0.10, 0.11, 0.15)
    + key * vec3(0.88, 0.95, 1.10) * 0.95
    + fill * vec3(0.30, 0.38, 0.55) * 0.22
    + up * vec3(1.00, 0.62, 0.28) * 0.55 * pulse);
  // aerial haze, same knob as the orbs — softened v52 (1.6 → 1.05): the
  // station must still read from the 27km spawn; fog owns the gulf, not home
  col *= exp(-vDist * uFog * 1.05);
  // v55: distance also quiets the bone — desaturate + cool before dark
  col = aerial(col, vDist);
  oC = vec4(col, 1.0);
}`;
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, svs));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, sfs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p));
      for (const n of ["uVP", "uCamPos", "uTex", "uNorm", "uHasNorm", "uFog", "uAer", "uTime"])
        skull.U[n] = gl.getUniformLocation(p, n);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);

      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1); // orbs own unit 0
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      if (aniso) {
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }
      // the normal map rides on unit 2 (orbs own 0, basecolor owns 1)
      let hasNorm = 0;
      if (normImg) {
        const ntex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, ntex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, normImg);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) {
          gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
            Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        }
        skull.ntex = ntex;
        hasNorm = 1;
      }
      gl.activeTexture(gl.TEXTURE0);

      gl.useProgram(p);
      gl.uniform1i(skull.U.uTex, 1);
      gl.uniform1i(skull.U.uNorm, 2);
      gl.uniform1f(skull.U.uHasNorm, hasNorm);
      gl.useProgram(prog); // hand the state back to the orb pipeline

      skull.prog = p;
      skull.vao = vao;
      skull.tex = tex;
      skull.count = ni;
      skull.ready = true;
    } catch (e) {
      // file:// or missing assets: the dimension just has no skull
    }
  })();

  // ---- generic mesh plumbing (v47): the robots + castes ride the
  // skull's binary format (magic / nv / ni / interleaved pos-norm-uv / u32
  // idx). Served-only like the skull — on file:// these simply don't exist.
  async function loadMeshBin(url, magic) {
    const buf = await fetch(url).then((r) => {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.arrayBuffer();
    });
    const dv = new DataView(buf);
    if (dv.getUint32(0, false) !== magic) throw new Error("bad magic " + url);
    const nv = dv.getUint32(4, true);
    const ni = dv.getUint32(8, true);
    const verts = new Float32Array(buf, 12, nv * 8);
    const idx = new Uint32Array(buf, 12 + nv * 32, ni);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: ni };
  }
  function makeProg(vsrc, fsrc, names) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const Us = {};
    for (const nm of names) Us[nm] = gl.getUniformLocation(p, nm);
    return { p, U: Us };
  }

  // (Vess-Karai's glass pass lived here v47–v51 — retired v52 with the
  // Lantern itself; see the note at its old seat above makeActors.)

  // ---- the societies' bodies (v50): fully procedural — no fetch, no Meshy,
  // so the Cadence stands even on file://. Three programs share one vertex
  // layout (15 floats: pos3 norm3 uv2 aux4 center3; aux = kind, phase, extra,
  // fam). Vertices are community-local; uOrigin arrives in ship space per
  // community (v49 camera-relative discipline — never world coords).
  const COMM_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
layout(location=3) in vec4 aAux;
layout(location=4) in vec3 aCenter;
uniform mat4 uVP;
uniform vec3 uOrigin;
out vec3 vP;
out vec3 vN;
out vec2 vUV;
out vec4 vAux;
out vec3 vC;
out vec3 vE; // v57: aCenter RAW — the crust packs face sizes + pattern here;
             // vC (+uOrigin) stays world-space for the glass/bridge programs
out vec3 vLoc; // v66: aPos RAW — the material pass lays its tiles on this (stable on the piece)
void main() {
  vLoc = aPos;
  vP = aPos + uOrigin;
  vN = aNorm;
  vUV = aUV;
  vAux = aAux;
  vC = aCenter + uOrigin;
  vE = aCenter;
  gl_Position = uVP * vec4(vP, 1.0);
}`;
  const COMM_HUE = `
vec3 hueCol(float h) {
  float x = h / 360.0;
  return clamp(abs(mod(x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
// v67 the packets (James: "I only like the blue... they can use only blue or
// white"): every data packet on every strut and bridge is one of three shades
// — deep blue, sky blue, white — picked per piece from r in [0,1). Never a
// family hue.
vec3 packetCol(float r) {
  return r < 0.28 ? vec3(0.18, 0.42, 1.0) : r < 0.55 ? vec3(0.30, 0.86, 0.96) : vec3(0.88, 0.94, 1.0); // v67.1: the middle one is aqua; v72: white 45%
}
// v68.13 THE TRAFFIC (James's mix, for EVERY light-carrying member — struts,
// spokes, hoops, rails, bridges, feeds): 50% the standard — evenly spaced
// medium pulses at a medium speed, one size; 15% an unbroken dense chain;
// 10% trains with gaps; 15% sparse singletons; 10% fast or dense. A second
// stream runs the other way on ~30%. Every stream RE-ROLLS its pattern every
// 40–90 s ("shouldn't stay that way all the time"). u = along 0..1, Lm =
// the member's length in metres, seedP = its centre, t = uTime·uTempo.
float th3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
// v70 traffic (James: the v68.13 mix had "too many densely packed, unbroken
// streams"; the old way — evenly spaced, medium speed, regular — is most of
// it; variety without density; dense chains almost never, and dimmer).
// mpp = metres per pixel along the member × the melt dial: a bead below ~2 px
// grows to 2 px on screen (v70.1) so the variety survives at flying distance.
float trafficAt(float u, float Lm, vec3 seedP, float phase, float t, float mpp, float amt, float blur) {
  float total = 0.0;
  for (int st = 0; st < 2; st++) {
    vec3 sd = seedP * (0.019 + float(st) * 0.007) + float(st) * 3.3;
    if (st == 1 && th3(sd + 0.5) > 0.25) break;
    float per = mix(40.0, 90.0, th3(sd + 2.2));
    float epoch = floor(t / per + th3(sd + 7.0));
    vec3 es = sd + epoch * 1.37;
    float r = th3(es + 6.3);
    float dir = (th3(es + 8.1) < 0.5 ? -1.0 : 1.0) * (st == 1 ? -1.0 : 1.0);
    float sp, N, G, spd, hw, gain = 1.0, morse = 0.0, sway = 0.0;
    if (r < 0.40) {        // regular: pulse, gap, pulse, gap — 2–5 per length, medium speed
      float k = floor(3.0 + th3(es + 1.9) * 6.0);
      sp = Lm / k; N = 1e6; G = 0.0; spd = mix(0.12, 0.26, th3(es + 3.7)); hw = max(3.0, sp * 0.03);
    } else if (r < 0.55) { // small groups with real gaps: 3–8 beads, then a long quiet
      sp = mix(8.0, 25.0, th3(es + 1.9)); N = floor(4.0 + th3(es + 4.1) * 7.0); G = mix(60.0, 300.0, th3(es + 4.4)); spd = mix(0.08, 0.3, th3(es + 3.7)); hw = 2.4;
    } else if (r < 0.67) { // Morse: an even ladder with beads dropped at random — odd and even clumps
      sp = mix(8.0, 20.0, th3(es + 1.9)); N = 1e6; G = 0.0; spd = mix(0.06, 0.2, th3(es + 3.7)); hw = 2.4; morse = 1.0;
    } else if (r < 0.78) { // back and forth: one small group sliding to and fro along the member
      sp = mix(10.0, 20.0, th3(es + 1.9)); N = floor(3.0 + th3(es + 4.1) * 4.0); G = 0.0; spd = mix(0.05, 0.15, th3(es + 3.7)); hw = 2.4; sway = 1.0;
    } else if (r < 0.90) { // a sparse singleton, slow or quick
      sp = Lm; N = 1e6; G = 0.0; spd = mix(0.08, 0.35, th3(es + 3.7)); hw = max(3.0, Lm * 0.008);
    } else if (r < 0.95) { // quick and few: 2–3 per length, fast
      float k = floor(2.0 + th3(es + 1.9) * 2.0);
      sp = Lm / k; N = 1e6; G = 0.0; spd = mix(0.3, 0.45, th3(es + 3.7)); hw = max(3.0, sp * 0.02);
    } else {               // the rare dense chain — slow, and dimmer
      sp = mix(6.0, 12.0, th3(es + 1.9)); N = 1e6; G = 0.0; spd = mix(0.04, 0.1, th3(es + 3.7)); hw = 1.6; gain = 0.45;
    }
    // v71 (the plan James re-read: the lab is the picture; the one fault is spokes so
    // full they read as lighted bars): a stream never lights more than about a quarter
    // of its length — spacing is at least four bead lengths, in every tier
    sp = max(sp, 8.0 * hw);
    float T = t * spd + phase * (1.0 + float(st));
    float xM;
    if (sway > 0.5) {
      // the group's centre wanders 30% of the length either side of the middle
      float c = 0.5 + 0.3 * sin(t * spd * 2.0 + phase * 6.0 + float(st) * 2.1);
      xM = fract(u * dir - c + 0.5) * Lm - Lm * 0.5 + N * sp * 0.5; // group centred at c
      G = Lm; // never wraps into a second copy
    } else {
      xM = fract(u * dir - T) * Lm;
    }
    float P = N * sp + G;
    float pos = N > 1e5 ? xM : mod(xM, P);
    float idx = floor(pos / sp);
    float dd = abs(fract(pos / sp) - 0.5) * sp;
    // v70.1 (James: the v70 melt made it "super, super boring... so little
    // traffic"): a bead never melts away — below ~2 px it grows to 2 px on
    // screen and keeps at least 60% of its light. Moving beads don't twinkle.
    float hwS = max(hw, (1.0 + 0.5 * blur) * mpp); // v72: "far window blur" softens far beads too
    float bead = (smoothstep(hwS + 1.6, hwS * 0.5, dd) + exp(-dd / (hwS * 2.5)) * 0.15) * max(0.6, hw / hwS);
    float keep = step(idx, N - 0.5) * step(0.0, pos);
    keep *= mix(1.0, step(0.42, th3(vec3(idx, es.x, es.y))), morse);
    // v70.3 (James: the 2 px floor turned every group into "super thick chains"):
    // beads thin out with distance so neighbours stay ≥ 6 px apart on screen —
    // dots with gaps at any range, never a solid line
    float thin = max(1.0, ceil(8.0 * mpp / sp)); // v71: 8 px apart on screen (2 px beads = a quarter lit)
    thin *= max(1.0, floor(1.0 / max(amt, 0.05) + 0.5)); // v72 "traffic amount": every k-th bead, spacing pattern kept
    keep *= step(mod(idx, thin), 0.5);
    total += bead * keep * gain;
  }
  return total;
}`;
  // v55 aerial perspective (James: everything "looks perfectly clear all the
  // time... killing the distance vibe"): distance quiets a surface before fog
  // dims it — luminance-preserving desaturation drifting toward a cool haze
  // cast. Multiplicative only, so it is safe on premultiplied-alpha outputs
  // and can never lift black space. uAer = cfg.aerial / AER_M (set with uFog).
  // Structure-only by design: orbs already desaturate, beacons/hearts stay
  // fog-proof long-range reads, the nebulae ARE the weather.
  const COMM_AER = `
uniform float uAer;
vec3 aerial(vec3 col, float dist) {
  float a = 1.0 - exp(-dist * uAer);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  return mix(col, lum * vec3(0.74, 0.82, 1.05), a);
}`;
  // v66 THE MATERIAL PASS (James, 2026-09-05: everything with a baseline
  // Blender material "looks like real cheapo plastic... not battle-scarred,
  // hundreds-of-thousands-of-years-old technology that's still chugging
  // along"): four Meshy tiles (assets/tiles/, 36 cr) laid TRIPLANAR on the
  // raw mesh position at a fixed metres-per-repeat, plus wear that no two
  // pieces share — grime pooling, scorch, one-way streaks, dead panels — and
  // the building metal's specular response. Struts and slabs, crust and
  // hoops all go through it; screens and windows keep their emission.
  const COMM_MAT = `
uniform sampler2D uHull;   // scarred hull plating
uniform sampler2D uIron;   // gantry iron
uniform sampler2D uSteel;  // v68 brushed titanium — the mass material (James: the hull tile "looks like granite")
uniform sampler2D uArmor;  // v68.2 the station's metal: the 02-sphere building's own dark tile (James: "wrap the entire station in the metal around the balls")
uniform float uWear;       // configuration: 0 clean … 1 full wear (default 0.8)
float mh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float mn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(mh(i), mh(i + vec3(1, 0, 0)), f.x), mix(mh(i + vec3(0, 1, 0)), mh(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(mh(i + vec3(0, 0, 1)), mh(i + vec3(1, 0, 1)), f.x), mix(mh(i + vec3(0, 1, 1)), mh(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
vec3 tri3(sampler2D t, vec3 q, vec3 an) {
  return texture(t, q.zy).rgb * an.x + texture(t, q.xz).rgb * an.y + texture(t, q.xy).rgb * an.z;
}
// base albedo for a piece: which tile (by kind + a per-piece roll), its scale,
// and the wear laid over it. kind 0 slab / 1 strut / 2 crust face / 3 hoop.
// seedP = the piece's centre (vE) — every piece rolls its own tint + wear.
vec3 matBase(float kind, vec3 loc, vec3 N, vec3 seedP, float along, out float wearOut) {
  vec3 an = abs(N);
  an = an / max(an.x + an.y + an.z, 1e-4);
  float ph = mh(seedP * 0.013 + 3.1);
  float ph2 = mh(seedP * 0.021 + 7.7);
  // metres per repeat: plates read as plates on a 24 m strut and on a 400 m slab
  // v68: the station's titanium members (kind -1) are km-scale — plates
  // 60 m, wear features four times bigger, or the wear reads as stone grain
  float big = kind < -0.5 ? 1.0 : 0.0;
  // overrides (v68.2): -1 titanium 60 m plates; -2 the station metal (32 m per repeat)
  float mpr = kind < -1.5 ? 32.0 : kind < -0.5 ? 60.0 : kind < 0.5 ? 26.0 : kind < 1.5 ? 11.0 : kind < 2.5 ? 16.0 : 13.0;
  float wf = mix(1.0, 0.25, big);
  vec3 q = loc / mpr + ph * 5.3;
  vec3 hull = tri3(uHull, q, an);
  vec3 iron = tri3(uIron, q * 1.15, an);
  vec3 steel = tri3(uSteel, q * 0.9, an);
  steel = mix(steel, vec3(dot(steel, vec3(0.333))), 0.5) * vec3(0.9, 0.93, 0.98) * 0.92;
  vec3 base;
  if (kind < -1.5) { base = tri3(uArmor, q, an) * vec3(0.96, 0.98, 1.02) * 1.15; kind = 0.0; }
  else if (kind < -0.5) { base = steel; kind = 0.0; }
  else
  // v68: titanium carries the mass; the scarred hull reads as stone, so it is
  // the exception now ("okay for a couple of blocks here and there")
  if (kind < 0.5) base = ph < 0.62 ? steel : ph < 0.86 ? iron : hull;          // slabs: titanium, some iron, a few stone
  else if (kind < 1.5) base = ph < 0.5 ? steel : ph < 0.82 ? iron : hull; // struts (v68.8: the ceramic tile retired — its unit went to the station metal)
  else if (kind < 2.5) base = ph < 0.8 ? hull : iron;                // crust faces: hull, some iron (Korrudan keeps its look)
  else base = ph < 0.5 ? iron : steel;                                // hoops: iron / titanium
  // per-piece tint: a cool or warm cast, a little darker or lighter
  vec3 tint = mix(vec3(0.9, 0.95, 1.08), vec3(1.05, 0.98, 0.9), ph2) * mix(0.8 + 0.4 * mh(seedP * 0.031 + 1.0), 1.0, big);
  // wear, all seeded on position so nothing repeats: grime pooling (low-freq
  // darkening), scorch spots, streaks running one way along the piece,
  // dead panels (a cell of the tile grid gone dark), edge dust
  float w = uWear;
  // v68.15: the station's members (big) carry almost no wear — the streaks,
  // scorch and dead panels ran in world axes and read as diagonal stone
  // banding on the rings and pads (James's zoom, 2026-09-05)
  float grime = 1.0 - w * mix(0.45, 0.12, big) * smoothstep(0.35, 0.8, mn(loc * 0.09 * wf + ph * 9.0));
  float scorch = w * smoothstep(0.62, 0.9, mn(loc * 0.035 * wf + ph2 * 13.0)) * mix(0.7, 0.0, big);
  float streak = w * 0.35 * smoothstep(0.7, 1.0, mn(vec3(along * 0.02, loc.yz * 0.6 * wf))) * smoothstep(0.3, 0.6, mn(loc * 0.05 * wf + 4.0)) * (1.0 - big);
  vec3 cellId = floor(q * 1.0);
  float dead = w * step(0.93, mh(cellId + ph * 3.0)) * mix(0.6, 0.0, big);
  vec3 col = base * tint * grime * (1.0 - scorch) * (1.0 - dead);
  col = mix(col, vec3(0.42, 0.22, 0.1) * dot(col, vec3(0.5)), streak); // rust-brown streaks
  wearOut = clamp(dot(base, vec3(0.333)) * 2.2, 0.0, 1.0);
  return col;
}
// the building metal's response, shared: key + a glint from behind-right,
// shininess from the tile's brightness (scuffed = polished), a fresnel rim
vec3 matLight(vec3 base, vec3 N, vec3 P, float wear) {
  vec3 Vv = normalize(-P);
  vec3 L1 = normalize(vec3(-0.4, 0.75, 0.5));
  vec3 L2 = normalize(vec3(0.6, 0.2, -0.75));
  float key = max(dot(N, L1), 0.0);
  float rim = max(dot(N, normalize(vec3(0.5, -0.1, -0.8))), 0.0);
  float shin = mix(12.0, 36.0, wear);
  float sp1 = pow(max(dot(N, normalize(L1 + Vv)), 0.0), shin) * (0.3 + 0.6 * wear);
  float sp2 = pow(max(dot(N, normalize(L2 + Vv)), 0.0), shin * 0.6) * (0.2 + 0.4 * wear);
  float fres = pow(1.0 - max(dot(N, Vv), 0.0), 4.0);
  return base * 0.85 * (vec3(0.22, 0.23, 0.27) + key * vec3(0.9, 0.95, 1.05) * 0.85 + rim * vec3(0.3, 0.4, 0.55) * 0.3)
    + (sp1 * vec3(0.85, 0.9, 1.0) + sp2 * vec3(0.7, 0.8, 1.0)) * 0.5
    + fres * vec3(0.18, 0.24, 0.34) * 0.4;
}`;
  // the Cadence's metal: gunmetal slabs and webbing, readability over realism
  // (partial self-light like the robots); struts run a data pulse end to end
  const COMM_FS_SOLID = `#version 300 es
precision highp float;
uniform vec3 uCamPos;
uniform float uFog;
uniform float uTime;
uniform float uTempo;
uniform float uTrafSpeed; // v72
uniform float uTrafAmt;
uniform float uStnLights; // v73
uniform float uFarBlur;
uniform float uFade;
uniform float uFams[5];
uniform float uMelt;
in vec3 vP;
in vec3 vN;
in vec2 vUV;
in vec4 vAux;
in vec3 vC;
in vec3 vE;
in vec3 vLoc;
out vec4 oC;
${COMM_HUE}
${COMM_AER}
${COMM_MAT}
void main() {
  vec3 N = normalize(vN);
  // v66: the material pass — kind from aux.x (0 slab, 1 strut, ≥2 crust face)
  float mk = vAux.x < 0.5 ? 0.0 : vAux.x < 1.5 ? 1.0 : 2.0;
  // v68.6: struts pack flag + 4·length(m) into aux.z; slabs carry the bare flag
  float zFlag = vAux.x > 0.5 && vAux.x < 1.5 ? mod(vAux.z, 4.0) : vAux.z;
  float strutLen = vAux.x > 0.5 && vAux.x < 1.5 ? floor(vAux.z / 4.0) : 0.0;
  if (vAux.x < 1.5 && zFlag > 0.5) mk = -floor(zFlag + 0.5); // v68: a slab or strut with flag 1/2 is titanium / the station metal, no roll
  float wear;
  vec3 base = matBase(mk, vLoc, N, vE, vUV.x * 200.0, wear);
  vec3 col = matLight(base, N, vP, wear);
  if (mk < -1.5) {
    // v68.15: the station's dark metal keeps its darkness — matLight's blue
    // fresnel + broad highlight turned the black tile into a mid grey sheen
    float keyS = max(dot(N, normalize(vec3(-0.4, 0.75, 0.5))), 0.0);
    col = base * (0.10 + 0.85 * keyS) + col * 0.22;
  }
  float dd = distance(vP, uCamPos);
  float fogF = exp(-dd * uFog * 1.2);
  if (vAux.x < 0.5 && zFlag > 1.5) {
    // v68.3: SLABS ONLY — no lights on any strut, spoke or brace (James)
    // v68.2 THE STATION LIGHTS (James: "run some of those blue lights up and
    // down and some more lights in general all over the place"): window dots
    // on a 14 m grid laid triplanar, lit by row and by cell; light RAILS
    // running the length of a member on a third of its faces (per-face roll
    // on the faceted normal), dashes streaming along them. All blue or white.
    vec3 an2 = abs(N); an2 = an2 / max(an2.x + an2.y + an2.z, 1e-4);
    vec3 q2 = vLoc / 14.0;
    vec2 uvw = an2.x >= an2.y && an2.x >= an2.z ? q2.zy : (an2.y >= an2.z ? q2.xz : q2.xy);
    // v68.3: a member with aux.y = length·1000 + faceWidth (metres) lays its
    // grid on the mesh uv — rows perfectly parallel to the member (James: the
    // spine's triplanar rows ran "on a weird twisty diagonal") — and sparse
    float lenM = floor(vAux.y / 1000.0);
    float straight = step(0.5, lenM);
    float faceW = vAux.y - lenM * 1000.0;
    uvw = mix(uvw, vec2(vUV.x * lenM, vUV.y * faceW) / 14.0, straight);
    vec2 cell = floor(uvw), f2 = fract(uvw);
    float hc = mh(vec3(cell, floor(vE.x * 0.01)));
    float hr = mh(vec3(cell.y, 3.0, floor(vE.y * 0.01)));
    float lit = step(mix(0.7, 1.0 - 0.08 * uStnLights, straight), hc) * step(mix(0.4, 0.62, straight), hr); // v73: station cells ~8% × "station lights"
    float pane = step(0.3, f2.x) * step(f2.x, 0.7) * step(0.36, f2.y) * step(f2.y, 0.64);
    vec3 wc = packetCol(mh(vec3(cell, 7.7)));
    float faceRoll = mh(floor(N * 3.0) + vE * 0.003);
    float rail = step(mix(0.62, 0.86, straight), faceRoll) * step(0.47, vUV.y) * step(vUV.y, 0.53);
    float rspd = 0.15 + 0.35 * mh(vec3(faceRoll, 1.0, 2.0));
    float rdir = mh(vec3(faceRoll, 4.0, 1.0)) < 0.5 ? -1.0 : 1.0;
    float dash = step(0.5, fract(vUV.x * 40.0 * rdir - uTime * uTempo * rspd * 8.0 + faceRoll));
    vec3 rc = packetCol(mh(vec3(faceRoll, 5.0, 1.0)));
    float pxW = 1.0 / max(max(fwidth(uvw.x), fwidth(uvw.y)), 1e-6);
    float mW = uMelt * (1.0 + 0.5 * uFarBlur * straight); // v73: the blur dial softens station cells the same way
    float crispW = uMelt < 0.001 ? 1.0 : smoothstep(2.0 * mW, 6.0 * mW, pxW);
    vec3 e = wc * lit * pane * mix(1.8, 2.2, straight) + rc * rail * (0.3 + dash * 1.4); // v72/v73: station windows a little brighter
    e = mix(wc * 0.05 * step(0.4, hr) * (1.0 - straight * 0.7) + rc * 0.04 * step(0.62, faceRoll), e, crispW);
    col += e * 2.0;
  }
  if (vAux.x > 0.5 && vAux.x < 1.5) {
    vec3 famc = packetCol(mh(vE * 0.019 + 2.2)); // v67: blue or white, per strut
    // v68.13: the shared traffic roll (COMM_HUE trafficAt) — his 50/15/10/15/10 mix
    float Lm = max(strutLen, 40.0);
    float line = smoothstep(0.34, 0.22, abs(vUV.y - 0.5));   // a line down the bar, not the whole face
    float pkS = trafficAt(vUV.x, Lm, vE, vAux.y, uTime * uTempo * uTrafSpeed, fwidth(vUV.x) * Lm * uMelt, uTrafAmt, uFarBlur);
    col += famc * (pkS * line * 2.2 + 0.03);
    // v74 (James: the station must read as a continuation of the ball — "accents of this
    // blue color that go in logical places along like edges"): the station's members
    // (station metal, zFlag 2) carry a thin blue seam along each long edge
    float edgeD = min(vUV.y, 1.0 - vUV.y);
    float edgePx = edgeD / max(fwidth(vUV.y), 1e-6);
    float barPx = 1.0 / max(fwidth(vUV.y), 1e-6);            // the bar's width on screen
    float edgeL = smoothstep(2.5, 0.8, edgePx) * step(1.5, zFlag) * smoothstep(7.0, 16.0, barPx); // only once the bar is wide enough to show an edge
    col += vec3(0.11, 0.6, 0.96) * edgeL * 0.4;
  }
  if (vAux.x > 2.5) {
    // v57 screens + neon (James: "lighted screens... advertising...
    // commercial presence, neon"): fully emissive panels. vAux.z picks the
    // program — 0 = animated ad screen (scrolling color bands + moving
    // blocks, two-tone), 1 = steady neon in the family color with a lazy
    // flicker and the occasional stutter. vAux.y is the per-panel phase.
    vec3 famc = hueCol(uFams[int(vAux.w + 0.5)]);
    vec3 e;
    if (vAux.z < 0.5) {
      // billboard, not pixel soup (lab round 2): big slow two-tone panels
      // behind a bright neon FRAME — the frame is what sells "sign" at range
      float band = fract(vUV.y * 2.0 - uTime * (0.06 + 0.05 * fract(vAux.y * 7.31)) + vAux.y);
      float blocks = step(0.5, fract(sin(dot(floor(vec2(vUV.x * 3.0, band * 2.0)), vec2(127.1, 311.7)) + vAux.y * 9.1) * 43758.5453));
      vec3 c2 = hueCol(uFams[int(mod(vAux.w + 2.0, 5.0))]);
      e = mix(famc, c2, blocks) * (0.35 + 1.0 * smoothstep(0.1, 0.45, band) * smoothstep(0.98, 0.55, band));
      float frame = 1.0 - step(0.055, vUV.x) * step(vUV.x, 0.945) * step(0.085, vUV.y) * step(vUV.y, 0.915);
      e = mix(e, famc * 1.7, frame);
      e += vec3(1.0) * step(0.972, fract(band * 2.0 + blocks * 0.37)) * 0.5; // scan sparkle
    } else {
      float fl = 0.82 + 0.18 * sin(uTime * 2.3 + vAux.y * 17.0);
      fl *= 1.0 - 0.5 * step(0.994, fract(sin(floor(uTime * 3.0) + vAux.y) * 43758.5453)); // neon stutter
      e = famc * fl * 1.4;
    }
    // screens melt like windows: below a few pixels they become their glow
    float px = 1.0 / max(max(fwidth(vUV.x), fwidth(vUV.y)), 1e-6);
    float crispS = uMelt < 0.001 ? 1.0 : smoothstep(2.0 * uMelt, 6.0 * uMelt, px);
    e = mix(famc * 0.5, e, crispS);
    oC = vec4(aerial(col * fogF * 0.3 + e * 2.2 * pow(fogF, 0.5), dd) * uFade, 1.0);
    return;
  }
  if (vAux.x > 1.5) {
    // v52 crust windows: the lit grid is the station's ruler — thousands of
    // small lights against the bone are what make 12km READ as 12km.
    // vAux.z picks warm homes vs cool works; windows resist fog harder than
    // metal so the city glow reaches the spawn approach.
    // v57 (James: "the windows are way too big... at least double or maybe
    // triple the lights"): the grid pitch is PHYSICAL now — vE.xy carries
    // the face half-sizes in meters, one window column per ~7.4m and row
    // per ~5.6m whatever the building size, so panes are ~4m house-scale
    // everywhere and big faces carry hundreds of lights, not 35. vE.z picks
    // the pattern: 0 rect grid, 1 parallel strips running down, 2 portholes,
    // -1 roof hatches. NEVER read these from vC — the VS adds uOrigin to vC
    // (world-space for glass/bridge), which silently destroyed every window
    // in-world while the zero-origin lab looked perfect (James caught it).
    float styleW = vE.z;
    vec2 face = max(vE.xy * 2.0, vec2(8.0));
    vec2 g = vUV * max(floor(face / vec2(7.4, 5.6)), vec2(1.0));
    vec2 cell = floor(g);
    float h = fract(sin(dot(cell, vec2(127.1, 311.7)) + vAux.y * 13.7) * 43758.5453);
    vec2 f = fract(g);
    float lit, pane;
    float roofDim = 1.0;
    if (styleW < -0.5) { // roof plate: a few dim round service hatches
      vec2 g3 = vUV * max(floor(face / vec2(9.0)), vec2(1.0));
      h = fract(sin(dot(floor(g3), vec2(127.1, 311.7)) + vAux.y * 13.7) * 43758.5453);
      f = fract(g3);
      g = g3;
      lit = step(h, 0.10);
      pane = smoothstep(0.26, 0.18, length(f - 0.5));
      roofDim = 0.45;
    } else if (styleW > 1.5) { // portholes: round lights on a SQUARE pitch — the
      // shared 7.4x5.6 grid stretched them into ellipses (lab sheet 1)
      vec2 g2 = vUV * max(floor(face / vec2(6.2)), vec2(1.0));
      vec2 cell2 = floor(g2);
      h = fract(sin(dot(cell2, vec2(127.1, 311.7)) + vAux.y * 13.7) * 43758.5453);
      f = fract(g2);
      g = g2;
      lit = step(h, 0.30);
      pane = smoothstep(0.30, 0.22, length(f - 0.5));
    } else if (styleW > 0.5) { // strips: unbroken light-lines running down the face
      float hc = fract(sin(cell.x * 127.1 + vAux.y * 13.7) * 43758.5453);
      lit = step(hc, 0.38);
      pane = step(0.32, f.x) * step(f.x, 0.68);
      h = hc;
    } else { // the classic grid
      lit = step(h, 0.34);
      pane = step(0.2, f.x) * step(f.x, 0.8) * step(0.24, f.y) * step(f.y, 0.76);
    }
    vec3 wcol = mix(vec3(0.45, 0.85, 1.0), vec3(1.0, 0.72, 0.38), step(0.5, vAux.z));
    float flicker = 0.85 + 0.15 * sin(uTime * (0.4 + h * 1.3) + h * 40.0);
    // v55 detail melt: when a window cell projects below a few pixels the
    // grid can't honestly resolve — crossfade the crisp panes into their
    // steady average glow (lit 0.34 × pane duty 0.31 × mean flicker ≈ 0.09).
    // uMelt scales the pixel threshold; 0 = always crisp (the old look).
    float cellPx = 1.0 / max(max(fwidth(g.x), fwidth(g.y)), 1e-6);
    float crisp = uMelt < 0.001 ? 1.0 : smoothstep(2.0 * uMelt, 6.0 * uMelt, cellPx);
    float win = mix(0.09, lit * pane * flicker, crisp) * roofDim;
    oC = vec4(aerial(col * fogF + wcol * win * 1.9 * pow(fogF, 0.55), dd) * uFade, 1.0);
    return;
  }
  oC = vec4(aerial(col * fogF, dd) * uFade, 1.0);
}`;
  // the glass: iridescent planes (thin-film shimmer riding the fresnel),
  // data planes raining bright dashes, and the node crystals — each little
  // sun glows from within, throbbing on its own phase
  const COMM_FS_GLASS = `#version 300 es
precision highp float;
uniform vec3 uCamPos;
uniform float uFog;
uniform float uTime;
uniform float uTempo;
uniform float uFade;
uniform float uGlow;
uniform float uFams[5];
uniform float uMelt;
uniform float uHomePass;  // v62.2: 1 = the glow pass — only the field homes draw
uniform float uHomeSharp; // v62.2: how much of the sharp home stays in the main pass
in vec3 vP;
in vec3 vN;
in vec2 vUV;
in vec4 vAux;
in vec3 vC;
out vec4 oC;
${COMM_HUE}
${COMM_AER}
void main() {
  if (uHomePass > 0.5 && vAux.x < 2.5) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vP);
  float fres = pow(1.0 - abs(dot(N, V)), 2.4);
  vec3 famc = hueCol(uFams[int(vAux.w + 0.5)]);
  vec3 col;
  float a;
  if (vAux.x < 0.5) {
    vec3 iri = 0.5 + 0.5 * cos(6.2832 * (fres * 3.0 + vAux.y) + vec3(0.0, 2.1, 4.2));
    col = vec3(0.45, 0.6, 0.8) * (0.05 + fres * 0.5) + iri * fres * 0.4;
    a = 0.05 + fres * 0.5;
  } else if (vAux.x < 1.5) {
    float colX = floor(vUV.x * 22.0);
    float sp = 0.3 + fract(sin(colX * 12.9898 + vAux.y) * 43758.5453) * 0.9;
    float ph = fract(sin(colX * 78.233 + vAux.y) * 12543.853);
    float yy = fract(vUV.y * 3.0 + uTime * uTempo * sp * 0.22 + ph);
    float dash = step(0.82, fract(yy * 9.0));
    // v55 detail melt: dashes below a few pixels dissolve into their duty-
    // cycle average (0.18) — a faint steady stream instead of strobing dots
    float dashPx = 1.0 / max(fwidth(vUV.y * 27.0), 1e-6);
    float crisp = uMelt < 0.001 ? 1.0 : smoothstep(2.0 * uMelt, 6.0 * uMelt, dashPx);
    dash = mix(0.18, dash, crisp);
    col = vec3(0.4, 0.55, 0.75) * (0.04 + fres * 0.35) + famc * dash * (0.5 + fres);
    a = 0.06 + fres * 0.4 + dash * 0.25;
  } else if (vAux.x < 2.5) {
    float d = distance(vP, vC) / max(vAux.z, 1.0);
    float sun = uGlow * (0.55 + 0.45 * sin(uTime * (0.5 + vAux.y * 0.13) + vAux.y)) * 1.6 / (d * d * 9.0 + 0.35);
    col = famc * (0.05 + fres * 0.5) + mix(famc, vec3(1.0), 0.35) * sun;
    a = clamp(0.10 + fres * 0.5 + sun * 0.35, 0.0, 0.9);
  } else {
    // v62 the field homes: kind 3 + class/4. vUV = (hue°, opacity). The
    // render palette (honey / teal / blues) pulled a quarter toward the
    // town's family hue so the towns still read as themselves.
    float cls = floor((vAux.x - 3.0) * 4.0 + 0.5);
    vec3 pc = mix(hueCol(vUV.x), famc, 0.25);
    float op = vUV.y;
    float d = distance(vP, vC) / max(vAux.z, 1.0);
    // v62.2: a steadier breath than the heart's — James saw the homes pulse
    // between opaque and skeletal; the structure should hold, the light breathe
    float sun = uGlow * (0.85 + 0.15 * sin(uTime * (0.5 + vAux.y * 0.13) + vAux.y)) * 0.6 / (d * d * 9.0 + 0.35);
    // v62.2 ribbon melt: a 0.8 m line under ~3 px dissolves into a faint average
    // instead of sparkling as dots (the v55 melt discipline, by fwidth of vP)
    float mpp = length(fwidth(vP));
    float crisp = smoothstep(0.4, 3.0, 0.8 / max(mpp, 1e-6));
    if (cls < 0.5) {
      // pane: fresnel-dim face at its own opacity, a slow shimmer breathing through it
      float sh = 0.7 + 0.3 * sin(dot(vP, vec3(0.011, 0.013, 0.009)) + uTime * 0.4 + vAux.y);
      col = pc * (0.08 + fres * 0.45) * (0.5 + op) * sh + pc * sun;
      a = clamp(op * (0.18 + fres * 0.5) + sun * 0.25, 0.0, 0.85);
    } else if (cls < 1.5) {
      // ribbon / filament: a hot line, melting when subpixel
      col = mix(pc, vec3(1.0), 0.3) * 1.6 * uGlow * mix(0.35, 1.0, crisp);
      a = mix(0.35, 0.95, crisp);
    } else if (cls < 2.5) {
      // blob: hot at the centre, gone at the rim
      float fc = pow(abs(dot(N, V)), 2.2);
      col = mix(pc, vec3(1.0), 0.4) * fc * 1.4 * uGlow;
      a = fc * 0.8;
    } else {
      // crystal: a denser pane, lit harder by the core
      col = pc * (0.15 + fres * 0.6) * (0.5 + op) + pc * sun * 1.5;
      a = clamp(op * (0.35 + fres * 0.5) + sun * 0.3, 0.0, 0.9);
    }
    if (uHomePass < 0.5) { col *= uHomeSharp; a *= mix(0.6, 1.0, uHomeSharp); }
  }
  float gd = distance(vP, uCamPos);
  float fogF = exp(-gd * uFog * 1.2) * uFade;
  oC = vec4(aerial(col, gd) * a * fogF, a * fogF);
}`;
  // the bridges: a hot center line between two suns, pulse packets running
  // both directions, each carrying its home node's color across the gap
  const COMM_FS_BRIDGE = `#version 300 es
precision highp float;
uniform vec3 uCamPos;
uniform float uFog;
uniform float uTime;
uniform float uTempo;
uniform float uTrafSpeed; // v72
uniform float uTrafAmt;
uniform float uStnLights; // v73
uniform float uFarBlur;
uniform float uFade;
uniform float uFams[5];
in vec3 vP;
in vec3 vN;
in vec2 vUV;
in vec4 vAux;
in vec3 vC;
in vec3 vE;
in vec3 vLoc;
uniform sampler2D uIron;
uniform sampler2D uSteel;   // v67 brushed titanium
uniform float uWear;
uniform float uBridgeFam;   // v67: -1 = roll per bridge, 0 iron / 1 steel / 2 glass (the lab forces one)
out vec4 oC;
${COMM_HUE}
${COMM_AER}
float bh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float bn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(bh(i), bh(i + vec3(1, 0, 0)), f.x), mix(bh(i + vec3(0, 1, 0)), bh(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(bh(i + vec3(0, 0, 1)), bh(i + vec3(1, 0, 1)), f.x), mix(bh(i + vec3(0, 1, 1)), bh(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
void main() {
  // v66 the conduit: the light bridge runs inside a METAL SHEATH — clamped,
  // corroded pipe cladding (the conduit tile, laid along the ribbon by
  // metres from the middle) with the energy visible through a glass slot
  // down the centre and through a ring of ports at every clamp. The old
  // hot-line bridge is the core inside it.
  float across = abs(vUV.y - 0.5) * 2.0;                // 0 centre … 1 edge
  float alongM = length(vLoc - vE);                     // metres from the bridge's middle
  float acc = exp(-14.0 * abs(vUV.y - 0.5));
  // v67: packets are blue or white only — one shade per bridge, both ends
  vec3 grad = packetCol(bh(vE * 0.023 + 4.4));
  // v68.14: the LIGHT BRIDGES keep their own traffic (James: the bridges to the
  // glow homes "were fine... can keep the logic they had before") — the v68.6
  // form: per-bridge speed on a log scale, one to three 5 m packets each way.
  float bSpd = 0.03 * exp(2.6 * bh(vE * 0.029 + 2.2));
  float bCnt = floor(bh(vE * 0.031 + 6.1) * 2.999) + 1.0;
  bCnt = max(1.0, floor(bCnt * uTrafAmt + 0.5)); // v72 "traffic amount"
  float p1 = fract(vUV.x - uTime * uTempo * uTrafSpeed * bSpd + vAux.z);
  float p2 = fract(-vUV.x - uTime * uTempo * uTrafSpeed * bSpd * 0.8 + vAux.z * 1.7);
  float pk = 0.0;
  float spanM = max(vAux.x, 100.0);                         // aux.x = the span in metres
  // v72: "far window blur" softens far bridge packets — the bead grows with metres-per-pixel
  float bw = max(1.6, fwidth(vUV.x) * spanM * (1.0 + 0.5 * uFarBlur));
  for (float k = 0.0; k < 3.0; k += 1.0) {
    if (k < bCnt) {
      float d1 = abs(fract(p1 + k * 14.0 / spanM) - 0.5) * spanM, d2 = abs(fract(p2 + k * 14.0 / spanM) - 0.5) * spanM;
      pk += (smoothstep(bw * 2.8, bw, d1) + exp(-d1 * 0.3) * 0.18 + smoothstep(bw * 2.8, bw, d2) + exp(-d2 * 0.3) * 0.18) * min(1.0, 1.6 / bw + 0.6);
    }
  }
  if (vAux.w > 0.5) {
    // a skull feed (v51): no return traffic — three packets streaming into
    // the bone, a hotter carrier line under them
    float pf = fract(vUV.x - uTime * uTempo * uTrafSpeed * 0.16 + vAux.z);
    pk = 0.0;
    for (float k = 0.0; k < 3.0; k += 1.0) {
      float df = abs(fract(pf + k * 0.333) - 0.5) * spanM;
      pk += smoothstep(6.0, 2.0, df) + exp(-df * 0.25) * 0.22;
    }
    pk = pk * 1.3 + 0.10;
  }
  float bd = distance(vP, uCamPos);
  float fogF = exp(-bd * uFog * 1.2) * uFade;
  vec4 core = vec4(aerial(grad, bd) * (0.10 + pk * 2.2) * acc * fogF, (0.05 + pk * 0.5) * acc * fogF * 0.6);
  // the sheath: opaque beyond the centre slot (across > 0.3), with a port
  // ring every 90 m that opens the sheath for a short stretch
  float slot = smoothstep(0.34, 0.26, across);
  float clampPh = fract(alongM / 90.0);
  float port = smoothstep(0.08, 0.06, abs(clampPh - 0.5)) * step(0.55, across) * step(across, 0.8);
  float open = max(slot, port);
  // the cladding: the gantry iron laid triplanar on the ribbon (10 m per
  // repeat, so a 60 m tube shows plates, never a magnified tile), collars
  // drawn procedurally every 90 m, a fake tube shade across
  vec3 Nn = normalize(vN);
  vec3 an = abs(Nn); an = an / max(an.x + an.y + an.z, 1e-4);
  vec3 tq = vLoc / 10.0 + bh(vE) * 4.0;
  vec3 sheath = texture(uIron, tq.zy).rgb * an.x + texture(uIron, tq.xz).rgb * an.y + texture(uIron, tq.xy).rgb * an.z;
  float collar = smoothstep(0.1, 0.07, abs(clampPh - 0.5));
  float collarEdge = smoothstep(0.02, 0.0, abs(abs(clampPh - 0.5) - 0.085));
  float curve = sqrt(max(1.0 - across * across, 0.0));                     // a fake tube shade
  float grime = 1.0 - uWear * 0.4 * smoothstep(0.4, 0.8, bh(floor(vec3(alongM / 15.0, 1.0, bh(vE) * 9.0))));
  vec3 Vv = normalize(-vP);
  vec3 L1 = normalize(vec3(-0.4, 0.75, 0.5));
  float key = 0.35 + 0.75 * max(dot(Nn, L1), 0.0);
  vec3 scol = sheath * grime * (0.25 + 0.75 * curve) * key * (1.0 + collar * 0.35) + vec3(0.5, 0.55, 0.6) * collarEdge * 0.4;
  // two crossed quads make the ribbon: the one turning edge-on fades out so
  // only the facing quad carries the tube (no V from the side)
  float facing = smoothstep(0.12, 0.45, abs(dot(Nn, Vv)));
  scol += grad * (0.06 + pk * 0.35) * smoothstep(0.7, 0.3, across);        // the core lights the inside of the sheath
  float sA = (1.0 - open) * fogF * facing;
  // v67 THREE CONDUIT FAMILIES (James: "I don't want the same exact one on
  // every single strut family... one more like titanium or steel... one
  // like glass"): each bridge rolls iron (the v66 sheath above), brushed
  // titanium, or glass. Collars and port rings stay on all three.
  float fam = uBridgeFam < -0.5 ? floor(bh(vE * 0.037 + 5.3) * 2.999) : uBridgeFam;
  if (fam > 0.5) {
    // brushed titanium: the steel tile desaturated and lightened, a fine
    // brush grain running the length of the tube, a hard anisotropic
    // highlight band along the crest, light wear (it does not rust)
    vec3 st = texture(uSteel, tq.zy * 0.7).rgb * an.x + texture(uSteel, tq.xz * 0.7).rgb * an.y + texture(uSteel, tq.xy * 0.7).rgb * an.z;
    st = mix(st, vec3(dot(st, vec3(0.333))), 0.6) * vec3(0.94, 0.97, 1.02);
    float brush = bn(vec3(alongM * 0.35, across * 90.0, bh(vE) * 7.0)) * 0.5 + bn(vec3(alongM * 1.3, across * 300.0, 2.0)) * 0.5;
    float crest = pow(curve, 10.0);
    float scuff = uWear * 0.25 * smoothstep(0.55, 0.85, bn(vec3(alongM * 0.06, across * 3.0, bh(vE) * 5.0)));
    vec3 tcol = st * (0.75 + 0.45 * brush) * (0.3 + 0.7 * curve) * key * (1.05 - scuff) * (1.0 + collar * 0.25)
              + vec3(0.9, 0.95, 1.0) * crest * (0.35 + 0.25 * brush) * key
              + vec3(0.6, 0.66, 0.75) * collarEdge * 0.5;
    tcol += grad * (0.05 + pk * 0.3) * smoothstep(0.7, 0.3, across);
    scol = tcol;
  }
  if (fam > 1.5) {
    // glass: a clear tube — the core shows through the whole width, the
    // wall is a fresnel rim (bright at the tube's edges, near nothing on
    // the crest) with a faint cool tint, a thin highlight streak along the
    // crest, a little dust in the wear; collars stay titanium
    float rim = pow(across, 2.5);
    float dust = uWear * 0.12 * bn(vec3(alongM * 0.2, across * 30.0, bh(vE) * 3.0));
    vec3 gcol = vec3(0.55, 0.75, 0.98) * (0.05 + 0.45 * rim) * key
              + vec3(1.0) * pow(curve, 24.0) * 0.22 * key
              + vec3(0.5, 0.6, 0.7) * dust
              + grad * (0.04 + pk * 0.25) * (1.0 - rim * 0.5);
    float gA = clamp(0.08 + 0.6 * rim + dust, 0.0, 0.9);
    vec3 ccol = scol; // the titanium collar (fam > 0.5 branch ran)
    scol = mix(gcol, ccol, collar);
    sA = mix(gA, 1.0 - open, collar) * fogF * facing;
  }
  float keep = 1.0 - sA;
  oC = vec4(core.rgb * keep + aerial(scol, bd) * sA, core.a * keep + sA);
}`;
  const COMM_US = ["uVP", "uOrigin", "uCamPos", "uFog", "uAer", "uMelt", "uTime", "uTempo", "uFade", "uGlow", "uFams[0]", "uHomePass", "uHomeSharp", "uHull", "uIron", "uSteel", "uArmor", "uWear", "uBridgeFam", "uTrafSpeed", "uTrafAmt", "uFarBlur", "uStnLights"];
  function makeCommVao(mesh) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW);
    const attr = (loc, n, off) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 60, off);
    };
    attr(0, 3, 0); attr(1, 3, 12); attr(2, 2, 24); attr(3, 4, 32); attr(4, 3, 48);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, vb, ib, count: mesh.i.length };
  }
  // v60.1 THE GLOW HOMES: James's Meshy structure (GPT concept → Meshy →
  // weld/decimate → tmp/orb-dimension/export_home.py → assets/homes/<name>.bin,
  // magic GHOM, unit-normalized, Y-up) stands inside every sun as the energy
  // beings' habitat, drawn by the glass program as a kind-2 node crystal —
  // fresnel makes the faces dim and the edges bright, the sun term glows it
  // from the core. Served only: on file:// (or before it arrives) the hex
  // plates in communityGeometry stand in. Each sun gets its own yaw.
  // v62 THE FIELD HOMES (2026-09-03, James's go): the glow-home generator
  // (tmp/orb-dimension/glowhome_fields3.py — lattice + `order` dial, three
  // size tiers, crystals at any angle, the Doctor's-lab instruments,
  // filaments, blobs) baked by export_fields.py into six rolls,
  // assets/homes/fields-01..06.bin, magic GHM2: same 8-float record as GHOM
  // but uv.x = class*1000 + hue° (0 pane / 1 ribbon+filament / 2 blob /
  // 3 crystal) and uv.y = the piece's opacity. Each shell deals itself one
  // roll (cfg.homeSeed rotates the deal) and a fully random orientation —
  // there is no gravity, no up. Drawn by the glass program as kind 3+cls/4
  // (see COMM_FS_GLASS). Served only: on file:// (or before the six land)
  // the hex plates stand in. GHOM files (the v60.1 Meshy home) still load
  // as kind 2 if named here.
  const glowHome = { meshes: [], names: ["fields-01", "fields-02", "fields-03", "fields-04", "fields-05", "fields-06"], v: 4 };
  // v62.1 James: "they should be sticking out on all sides of the ball" — the
  // heart orb (fixedR = 0.5 nd.r) is just another force field, not a container.
  // Doubled from 0.45: the structure now reaches 0.9 nd.r, well past the ball.
  // v62.3 (his: "too small... sticking out of the balls in many places and mostly
  // filling the balls"): the bake now normalizes on the structure's BULK (85th
  // percentile radius = 1), so this is where the body sits; spears run ~2× further.
  const HOME_FIT = 0.68; // bulk radius vs nd.r (the heart ball is 0.5 nd.r)
  // v62.2 THE HOME GLOW PASS (James: "a significant amount of blur on them...
  // that would really help the whole vibe"): the field homes are drawn a
  // second time, alone, into a quarter-res target (with a depth pre-pass of
  // the bone + the Cadence cores so the glow never leaks through Korrudan),
  // blurred twice, and added over the finished frame. cfg.homeBlur = how much
  // haze (and how little of the sharp draw stays).
  const homeGlow = { w: 0, h: 0, fbo: null, tex: null, depth: null, pp: [], ready: false };
  const GLOW_VS = `#version 300 es
out vec2 vT;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vT = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
  const GLOW_BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
in vec2 vT;
out vec4 oC;
void main() {
  float w[5] = float[5](0.227, 0.194, 0.121, 0.054, 0.016);
  vec4 c = texture(uTex, vT) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 o = uDir * float(i);
    c += texture(uTex, vT + o) * w[i];
    c += texture(uTex, vT - o) * w[i];
  }
  oC = c;
}`;
  const GLOW_COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uAmt;
in vec2 vT;
out vec4 oC;
void main() { oC = texture(uTex, vT) * uAmt; }`;
  homeGlow.blur = makeProg(GLOW_VS, GLOW_BLUR_FS, ["uTex", "uDir"]);
  homeGlow.comp = makeProg(GLOW_VS, GLOW_COMP_FS, ["uTex", "uAmt"]);
  function glowTex(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { tex: t, fbo: f };
  }
  function homeGlowEnsure(bw, bh) {
    const w = Math.max(64, bw >> 2), h = Math.max(64, bh >> 2);
    if (homeGlow.w === w && homeGlow.h === h) return;
    for (const pp of homeGlow.pp) { gl.deleteFramebuffer(pp.fbo); gl.deleteTexture(pp.tex); }
    if (homeGlow.fbo) { gl.deleteFramebuffer(homeGlow.fbo); gl.deleteTexture(homeGlow.tex); gl.deleteRenderbuffer(homeGlow.depth); }
    const main = glowTex(w, h);
    homeGlow.fbo = main.fbo; homeGlow.tex = main.tex;
    homeGlow.depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, homeGlow.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, homeGlow.depth);
    homeGlow.pp = [glowTex(w, h), glowTex(w, h)];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    homeGlow.w = w; homeGlow.h = h;
  }
  function blurPass(src, dst, dx, dy) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.activeTexture(gl.TEXTURE9); // its own unit — never disturb the others' bindings
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(homeGlow.blur.U.uTex, 9);
    gl.uniform2f(homeGlow.blur.U.uDir, dx, dy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function homeMesh(g, ci) {
    const list = glowHome.meshes;
    const R = mulberry32(SOCIETY_SEED ^ 0x40e5 ^ (ci * 7919));
    const picks = [];
    let totV = 0, totI = 0;
    for (let n = 0; n < g.nodes.length; n++) {
      const src = list[(Math.floor(R() * 1e6) + (cfg.homeSeed | 0)) % list.length];
      // uniform random rotation (Shoemake): three rolls → a quaternion
      const u1 = R(), u2 = R(), u3 = R();
      const q = [Math.sqrt(1 - u1) * Math.sin(TAU * u2), Math.sqrt(1 - u1) * Math.cos(TAU * u2),
        Math.sqrt(u1) * Math.sin(TAU * u3), Math.sqrt(u1) * Math.cos(TAU * u3)];
      picks.push({ src, q });
      totV += src.nv; totI += src.ni;
    }
    const v = new Float32Array(totV * 15);
    const idx = new Uint32Array(totI);
    let vo = 0, io = 0, base = 0;
    g.nodes.forEach((nd, n) => {
      const { src, q } = picks[n];
      const [x, y, z, w] = q;
      const m00 = 1 - 2 * (y * y + z * z), m01 = 2 * (x * y - z * w), m02 = 2 * (x * z + y * w);
      const m10 = 2 * (x * y + z * w), m11 = 1 - 2 * (x * x + z * z), m12 = 2 * (y * z - x * w);
      const m20 = 2 * (x * z - y * w), m21 = 2 * (y * z + x * w), m22 = 1 - 2 * (x * x + y * y);
      const s = nd.r * HOME_FIT, P = src.verts, nv = src.nv, fields = src.fields;
      for (let k = 0; k < nv; k++) {
        const o = k * 8;
        const px = P[o], py = P[o + 1], pz = P[o + 2], nx = P[o + 3], ny = P[o + 4], nz = P[o + 5];
        v[vo++] = nd.p[0] + (m00 * px + m01 * py + m02 * pz) * s;
        v[vo++] = nd.p[1] + (m10 * px + m11 * py + m12 * pz) * s;
        v[vo++] = nd.p[2] + (m20 * px + m21 * py + m22 * pz) * s;
        v[vo++] = m00 * nx + m01 * ny + m02 * nz;
        v[vo++] = m10 * nx + m11 * ny + m12 * nz;
        v[vo++] = m20 * nx + m21 * ny + m22 * nz;
        if (fields) {
          const ux = P[o + 6], cls = Math.floor(ux / 1000);
          v[vo++] = ux - cls * 1000; v[vo++] = P[o + 7]; v[vo++] = 3 + cls * 0.25;
        } else {
          v[vo++] = 0; v[vo++] = 0; v[vo++] = 2;
        }
        v[vo++] = nd.phase; v[vo++] = nd.r; v[vo++] = nd.fam;
        v[vo++] = nd.p[0]; v[vo++] = nd.p[1]; v[vo++] = nd.p[2];
      }
      for (let k = 0; k < src.ni; k++) idx[io++] = base + src.idx[k];
      base += nv;
    });
    return { v, i: idx };
  }
  function uploadCommunities() {
    if (!commGL.inited) return; // first relayout runs before GL init; init re-calls
    for (const m of commGL.meshes) {
      for (const part of [m.solid, m.glass, m.bridge]) {
        gl.deleteVertexArray(part.vao);
        gl.deleteBuffer(part.vb);
        gl.deleteBuffer(part.ib);
      }
    }
    commGL.meshes = COMM_GEO.map((g, ci) => {
      if (!glowHome.meshes.length) {
        return { solid: makeCommVao(g.solid), glass: makeCommVao(g.glass), bridge: makeCommVao(g.bridge) };
      }
      // homes in: cut the hex fallback off the glass tail, append the meshes
      const glass = { v: g.glass.v.slice(0, g.homeV0), i: g.glass.i.slice(0, g.homeI0) };
      const home = homeMesh(g, ci);
      const gv = new Float32Array(glass.v.length + home.v.length);
      gv.set(glass.v, 0); gv.set(home.v, glass.v.length);
      const gi = new Uint32Array(glass.i.length + home.i.length);
      gi.set(glass.i, 0);
      const vb = glass.v.length / 15;
      for (let k = 0; k < home.i.length; k++) gi[glass.i.length + k] = vb + home.i[k];
      return { solid: makeCommVao(g.solid), glass: makeCommVao({ v: gv, i: gi }), bridge: makeCommVao(g.bridge) };
    });
  }
  (async () => {
    try {
      const loaded = await Promise.all(glowHome.names.map(async (name) => {
        const url = "assets/homes/" + name + ".bin?v=" + glowHome.v;
        const buf = await fetch(url).then((r) => {
          if (!r.ok) throw new Error(url + " " + r.status);
          return r.arrayBuffer();
        });
        const dv = new DataView(buf);
        const magic = dv.getUint32(0, false);
        if (magic !== 0x47484f4d && magic !== 0x47484d32) throw new Error("bad magic " + url);
        const nv = dv.getUint32(4, true), ni = dv.getUint32(8, true);
        const verts = new Float32Array(buf, 12, nv * 8);
        if (magic === 0x47484d32) {
          // v63.9 (James: "most of the glow home is up and to the right...
          // almost half the globe is empty"): the bakes were centred on their
          // BOUNDING BOX, and the spears drag that box off the body — roll 04
          // sat 0.72 bulk radii off. Re-centre on the bulk (iterated 85th-
          // percentile trimmed mean) and re-normalize so the bulk radius is 1
          // about the new centre. Idempotent: a bake centred this way stays put.
          let c = [0, 0, 0];
          const d = new Float32Array(nv);
          let cut = Infinity;
          for (let it = 0; it < 4; it++) {
            for (let k = 0; k < nv; k++) d[k] = Math.hypot(verts[k * 8] - c[0], verts[k * 8 + 1] - c[1], verts[k * 8 + 2] - c[2]);
            const srt = Float32Array.from(d).sort();
            cut = srt[Math.floor(srt.length * 0.85)];
            let sx = 0, sy = 0, sz = 0, n = 0;
            for (let k = 0; k < nv; k++) if (d[k] <= cut) { sx += verts[k * 8]; sy += verts[k * 8 + 1]; sz += verts[k * 8 + 2]; n++; }
            if (n) c = [sx / n, sy / n, sz / n];
          }
          const inv = 1 / (cut || 1);
          for (let k = 0; k < nv; k++) {
            verts[k * 8] = (verts[k * 8] - c[0]) * inv;
            verts[k * 8 + 1] = (verts[k * 8 + 1] - c[1]) * inv;
            verts[k * 8 + 2] = (verts[k * 8 + 2] - c[2]) * inv;
          }
        }
        return { nv, ni, fields: magic === 0x47484d32, verts, idx: new Uint32Array(buf, 12 + nv * 32, ni) };
      }));
      glowHome.meshes = loaded;
      uploadCommunities();
    } catch (e) {
      console.warn("glow homes: hex plates stand in —", e.message);
    }
  })();
  {
    const fams = new Float32Array(SOC_FAMS.map(([a, b]) => (a + b) / 2));
    commGL.solid = makeProg(COMM_VS, COMM_FS_SOLID, COMM_US);
    commGL.glass = makeProg(COMM_VS, COMM_FS_GLASS, COMM_US);
    commGL.bridge = makeProg(COMM_VS, COMM_FS_BRIDGE, COMM_US);
    for (const pr of [commGL.solid, commGL.glass, commGL.bridge]) {
      gl.useProgram(pr.p);
      gl.uniform1fv(pr.U["uFams[0]"], fams);
      gl.uniform3fv(pr.U.uCamPos, [0, 0, 0]); // v49: ship space, forever
    }
    gl.useProgram(commGL.bridge.p);
    gl.uniform1f(commGL.bridge.U.uBridgeFam, -1); // v67: every bridge rolls its own family
    // v66 the material tiles on units 12–15 (hull / iron / ceramic / steel):
    // a flat grey 1×1 stands in until each file lands (file:// keeps a look).
    // v67: unit 15 is the brushed titanium (the v66 conduit-sheath tile was
    // never sampled — scrapped in the v66 session, file left on disk).
    {
      // v68.8: the station metal was on unit 5 — the FLEET's unit — so in-world the
      // pads sampled the robot atlas and read as stone (the lab has no fleet). Unit 14 now.
      const TILES = [["uHull", "hull-scarred", 12], ["uIron", "gantry-iron", 13], ["uArmor", "station-hull", 14], ["uSteel", "steel-brushed", 15]];
      for (const [uni, name, unit] of TILES) {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([110, 115, 125]));
        for (const pr of [commGL.solid, commGL.bridge]) { gl.useProgram(pr.p); if (pr.U[uni]) gl.uniform1i(pr.U[uni], unit); }
        const img = new Image();
        img.onload = () => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
          gl.activeTexture(gl.TEXTURE0);
        };
        img.onerror = () => console.warn("material tile missing:", name);
        img.src = "assets/tiles/" + name + ".jpg?v=1";
      }
      gl.activeTexture(gl.TEXTURE0);
    }
    gl.useProgram(prog);
    commGL.inited = true;
    uploadCommunities();
  }

  // the crust arrives like the skull does — fetched, parsed, grown once
  (async () => {
    try {
      const buf = await fetch("assets/skull/crust.bin").then((r) => {
        if (!r.ok) throw new Error("crust.bin " + r.status);
        return r.arrayBuffer();
      });
      const dv = new DataView(buf);
      if (dv.getUint32(0, false) !== 0x43525350) throw new Error("bad crust magic"); // "CRSP"
      const count = dv.getUint32(4, true);
      const f = new Float32Array(buf, 8, count * 8);
      const points = [];
      for (let i = 0; i < count; i++) {
        const o = i * 8;
        points.push({
          p: [f[o], f[o + 1], f[o + 2]],
          n: [f[o + 3], f[o + 4], f[o + 5]],
          region: f[o + 6] | 0,
          cluster: f[o + 7] | 0,
        });
      }
      crustGL.mesh = makeCommVao(crustGeometry(points));
      crustGL.ready = true;
    } catch (e) {
      // file:// or missing atlas: the bone stands bare, the towns still shine
    }
  })();

  // ---- the nebulae, GPU side (v53): the lab shader, verbatim in spirit ----
  // Camera-facing stretched wisps; the stretch axis is the strand tangent
  // projected to the screen and RELAXES TO ROUND as the projection
  // degenerates (the somersault cure — nebula-sim bounds the residual swing).
  // Fully procedural, works on file://; premultiplied like everything here.
  const NEB_VS = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 iPos;
layout(location=2) in vec4 iA; // size, stretch, rot, seed
layout(location=3) in vec4 iB; // dust, core, nk, bright
layout(location=4) in vec3 iC; // tanScreenX, tanScreenY, fade
uniform mat4 uVP;
uniform vec3 uCamR;
uniform vec3 uCamU;
out vec2 vUV;
out vec4 vA;
out vec4 vB;
out float vFade;
out vec3 vP;
void main() {
  vUV = aCorner * 0.5 + 0.5;
  vA = iA; vB = iB; vFade = iC.z;
  vec2 ts = iC.xy;
  float tl = length(ts);
  vec2 tdir = tl > 1e-4 ? ts / tl : vec2(1.0, 0.0);
  float k = smoothstep(0.25, 0.70, tl);
  float eff = mix(1.0, iA.y, k);
  vec2 axis1 = tdir, axis2 = vec2(-tdir.y, tdir.x);
  vec2 c = aCorner;
  float cr = cos(iA.z), sr = sin(iA.z);
  c = mat2(cr, -sr, sr, cr) * c;
  vec2 off2 = axis1 * c.x * iA.x * eff + axis2 * c.y * iA.x;
  vec3 wp = iPos + uCamR * off2.x + uCamU * off2.y;
  vP = wp;
  gl_Position = uVP * vec4(wp, 1.0);
}`;
  const NEB_FS = `#version 300 es
precision highp float;
uniform sampler2D uWisp; // baked atlas: A = torn alpha, RG = noise gradient
uniform float uGlow;
uniform float uFog;
uniform vec2 uLight; // bank light axis, sprite space
uniform vec3 uField; // per-bank palette: the mass
uniform vec3 uCore;  // per-bank palette: the lit billows
in vec2 vUV;
in vec4 vA;
in vec4 vB;
in float vFade;
in vec3 vP;
out vec4 oC;
void main() {
  vec2 q = vUV - 0.5;
  float r = length(q) * 2.0; // the furnace-knot heart needs it below
  // the lab evaluated 3 fbm (48 sines) PER FRAGMENT — unshippable at 4K
  // across a dozen screens of blended gas. The identical field is baked
  // once into a 6-variant atlas at init (bakeWispAtlas), so a fragment is
  // now one texture fetch. vA.w carries the variant; per-puff rotation and
  // stretch still make every wisp unique.
  vec4 t = texture(uWisp, vec2((vUV.x + vA.w) * ${(1 / 6).toFixed(8)}, vUV.y));
  float a = t.a;
  if (a < 0.004) discard;
  vec2 g = (t.rg - 0.5) * ${(1 / 3).toFixed(8)};
  float lit = clamp(0.5 - 2.1 * dot(g, uLight) - 0.4 * dot(normalize(q + 1e-5), uLight), 0.0, 1.0);
  vec3 core = mix(uCore * 0.45, uCore, vB.y);
  float coreAmt = lit * lit * vB.y;
  vec3 col = uField + core * coreAmt * 0.9;
  col += mix(uCore, vec3(1.0), 0.45) * pow(lit, 5.0) * 0.5 * vB.y;
  col *= 0.38 + 0.62 * lit;
  // the nebulae ARE weather: they take fog at 0.08 strength (the veil rule —
  // never fog-exempt) so they read across the map but still recede honestly
  float fogF = exp(-length(vP) * uFog * 0.08);
  if (vB.x > 0.5) {
    oC = vec4(vec3(0.008, 0.01, 0.03) * a * fogF, a * 0.9 * vFade * fogF);
    return;
  }
  float b = min(vB.w, 1.35); // channel-race cap (the lab's green-drift lesson)
  vec3 c2 = col * (0.85 + uGlow * 0.49) * b;
  float aa = a * 0.30;
  if (vB.w > 2.0) {
    float heart = pow(smoothstep(1.0, 0.0, r), 2.6);
    c2 = mix(uCore, vec3(1.0), 0.62);
    aa = a * heart * 0.85;
  }
  aa *= vFade * fogF;
  oC = vec4(c2 * aa, aa); // premultiplied
}`;
  // bake the wisp atlas: 6 variants (3 coarse-billow, 3 fine-rag) of the
  // lab's exact alpha field, plus its noise gradient for the directional
  // shading. Deterministic, CPU-side, ~150ms at init — no fetch, so the gas
  // still blows on file://. Grid is small on purpose: the shapes are soft.
  const NEB_TILE = 160, NEB_VARIANTS = 6;
  function bakeWispAtlas() {
    const N = NEB_TILE, V = NEB_VARIANTS;
    const hash = (x, y) => {
      const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const vnoise = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy), b = hash(ix + 1, iy);
      const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
      const top = a + (b - a) * fx, bot = c + (d - c) * fx;
      return top + (bot - top) * fy;
    };
    const fbm = (x, y) => {
      let amp = 0.55, s = 0, px = x, py = y;
      for (let i = 0; i < 4; i++) {
        s += amp * vnoise(px, py);
        const nx = px * 1.9 + 7.7, ny = py * 1.9 + 7.7;
        px = nx; py = ny;
        amp *= 0.52;
      }
      return s;
    };
    const sstep = (e0, e1, x) => {
      const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    };
    const data = new Uint8Array(N * V * N * 4);
    const nf = new Float32Array(N * N);
    for (let v = 0; v < V; v++) {
      // coarse billows for the anchors, fine rags for the filler. The coarse
      // family sits at 4.8, not the lab's 3.2: at 3.2 the radial body term
      // dominates the low-frequency noise and the sprite reads as a DISC —
      // James's ball-pit failure mode. Verified in the atlas preview.
      const K = v < 3 ? 4.8 : 8.5;
      const ox = v * 13.37, oy = v * 7.11;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          nf[y * N + x] = fbm(((x + 0.5) / N) * K + ox, ((y + 0.5) / N) * K + oy);
        }
      }
      // gradient by finite difference ON the baked field — the shader's
      // e = 0.11 in noise space is this many pixels at this frequency
      const step = Math.max(1, Math.round((0.11 / K) * N));
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const u = (x + 0.5) / N, w = (y + 0.5) / N;
          const qx = u - 0.5, qy = w - 0.5;
          const r = Math.hypot(qx, qy) * 2;
          const body = sstep(1.0, 0.2, r);
          const alpha = sstep(0.28, 0.95, nf[y * N + x] * body + body * 0.20);
          const cl = (i) => Math.min(N - 1, Math.max(0, i));
          const gx = nf[y * N + cl(x + step)] - nf[y * N + cl(x - step)];
          const gy = nf[cl(y + step) * N + x] - nf[cl(y - step) * N + x];
          const o = ((y * (N * V)) + v * N + x) * 4;
          data[o] = Math.min(255, Math.max(0, Math.round((gx * 3 + 0.5) * 255)));
          data[o + 1] = Math.min(255, Math.max(0, Math.round((gy * 3 + 0.5) * 255)));
          data[o + 2] = 0;
          data[o + 3] = Math.round(alpha * 255);
        }
      }
    }
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N * V, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    return tex;
  }
  const nebGL = { inited: false, prog: null, vao: null, inst: null, buf: null, order: [] };
  {
    const pr = makeProg(NEB_VS, NEB_FS, ["uVP", "uCamR", "uCamU", "uGlow", "uFog", "uLight", "uField", "uCore", "uWisp"]);
    bakeWispAtlas();
    gl.useProgram(pr.p);
    gl.uniform1i(pr.U.uWisp, 7);
    gl.useProgram(prog);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    const inst = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (const [loc, n, off] of [[1, 3, 0], [2, 4, 12], [3, 4, 28], [4, 3, 44]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 56, off);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    nebGL.prog = pr;
    nebGL.vao = vao;
    nebGL.inst = inst;
    nebGL.inited = true;
  }
  // one bank per draw: banks sorted far→near, puffs depth-sorted within.
  // CPU does the f64 camera-relative subtraction (v49 discipline).
  function drawNebulae(vp, bb) {
    if (!nebGL.inited || !NEBULAE.length) return;
    const pr = nebGL.prog;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.U.uVP, false, vp);
    gl.uniform3fv(pr.U.uCamR, bb.r);
    gl.uniform3fv(pr.U.uCamU, bb.u);
    gl.uniform1f(pr.U.uGlow, cfg.nebGlow);
    gl.uniform1f(pr.U.uFog, cfg.haze / 18000);
    gl.bindVertexArray(nebGL.vao);
    const visible = [];
    for (const bank of NEBULAE) {
      const dx = bank.c[0] - cam.pos[0], dy = bank.c[1] - cam.pos[1], dz = bank.c[2] - cam.pos[2];
      const d = Math.hypot(dx, dy, dz);
      if (d > 600000 + bank.radius) continue; // beyond the long read
      visible.push({ bank, d });
    }
    visible.sort((a, b) => b.d - a.d);
    for (const { bank, d } of visible) {
      const bankFade = clamp((600000 + bank.radius - d) / 120000, 0, 1);
      if (bankFade <= 0) continue;
      const P = bank.puffs;
      if (!nebGL.buf || nebGL.buf.length < P.length * 14) {
        nebGL.buf = new Float32Array(P.length * 14);
        nebGL.order = new Array(P.length);
      }
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        nebGL.order[i] = [
          (p.p[0] - cam.pos[0]) * bb.f[0] + (p.p[1] - cam.pos[1]) * bb.f[1] + (p.p[2] - cam.pos[2]) * bb.f[2], i];
      }
      nebGL.order.sort((a, b2) => b2[0] - a[0]);
      let m = 0;
      for (const [, i] of nebGL.order) {
        const p = P[i];
        const rx = p.p[0] - cam.pos[0], ry = p.p[1] - cam.pos[1], rz = p.p[2] - cam.pos[2];
        const pd = Math.hypot(rx, ry, rz);
        // NEAR-FADE — the fill-rate guard (v33's veil bomb TDR-crashed
        // James's 4K rig; this is the discipline that keeps it from
        // repeating): a wisp is GONE below 4 of its own radii and only
        // reaches full strength at 9, so no sprite ever blankets the view.
        // Flying in dissolves the near gas and reveals the finer structure
        // instead of hitting a wall. nebula-sim TEST 6 mirrors this curve
        // exactly and bars interior overdraw across the whole density
        // slider — change one, change both.
        const fade = clamp((pd - 4 * p.size) / (5 * p.size), 0, 1) * bankFade;
        if (fade <= 0.002) continue;
        const o = m * 14;
        m++;
        nebGL.buf[o] = rx; nebGL.buf[o + 1] = ry; nebGL.buf[o + 2] = rz;
        nebGL.buf[o + 3] = p.size; nebGL.buf[o + 4] = p.stretch; nebGL.buf[o + 5] = p.rot; nebGL.buf[o + 6] = p.variant;
        nebGL.buf[o + 7] = p.dust; nebGL.buf[o + 8] = p.core; nebGL.buf[o + 9] = 0; nebGL.buf[o + 10] = p.bright;
        nebGL.buf[o + 11] = p.tan[0] * bb.r[0] + p.tan[1] * bb.r[1] + p.tan[2] * bb.r[2];
        nebGL.buf[o + 12] = p.tan[0] * bb.u[0] + p.tan[1] * bb.u[1] + p.tan[2] * bb.u[2];
        nebGL.buf[o + 13] = fade;
      }
      if (!m) continue;
      const pal = NEB_PALETTES[bank.pal];
      gl.uniform3fv(pr.U.uField, pal.field);
      gl.uniform3fv(pr.U.uCore, pal.core);
      const lx = bank.light[0] * bb.r[0] + bank.light[1] * bb.r[1] + bank.light[2] * bb.r[2];
      const ly = bank.light[0] * bb.u[0] + bank.light[1] * bb.u[1] + bank.light[2] * bb.u[2];
      const ll = Math.hypot(lx, ly) || 1;
      gl.uniform2fv(pr.U.uLight, [lx / ll, ly / ll]);
      gl.bindBuffer(gl.ARRAY_BUFFER, nebGL.inst);
      gl.bufferData(gl.ARRAY_BUFFER, nebGL.buf.subarray(0, m * 14), gl.STREAM_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, m);
    }
    gl.bindVertexArray(null);
  }

  // ---- the fleet's body (v47): James's Meshy service robot, prepped by
  // tmp/orb-dimension/robot_prep.py into robot.bin + a 1K basecolor.
  // ROBOT_FACING flips the nose if the model turns out to fly backwards —
  // one-number tune, can't be judged without James's eyes.
  const ROBOT_FACING = 1;
  // one shader serves every robot body in the dimension — the Meshy fleet
  // and the Blender-built Cadence castes (v51) differ only in mesh + texture
  const ROBOT_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vN;
out vec2 vUV;
out vec3 vP;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vP = wp.xyz;
  vN = mat3(uModel) * aNorm;
  vUV = aUV;
  gl_Position = uVP * wp;
}`;
  const ROBOT_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uCamPos;
uniform float uFog;
in vec3 vN;
in vec2 vUV;
in vec3 vP;
out vec4 oC;
${COMM_AER}
void main() {
  vec3 base = texture(uTex, vUV).rgb;
  vec3 N = normalize(vN);
  float key = max(dot(N, normalize(vec3(-0.4, 0.75, 0.5))), 0.0);
  float rim = max(dot(N, normalize(vec3(0.5, -0.1, -0.8))), 0.0);
  float under = max(-N.y, 0.0); // its own engine light, from below
  vec3 col = base * (vec3(0.16, 0.17, 0.2)
    + key * vec3(0.9, 0.95, 1.05) * 0.9
    + rim * vec3(0.3, 0.4, 0.55) * 0.25
    + under * vec3(0.4, 0.9, 1.0) * 0.5);
  float rd = distance(vP, uCamPos);
  col *= exp(-rd * uFog * 1.4);
  col = aerial(col, rd); // v55: distance quiets the metal too
  oC = vec4(col, 1.0);
}`;
  const loadImg = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
  // build one robot program: its own texture parked on a dedicated unit
  function makeRobotProg(img, unit) {
    const pr = makeProg(ROBOT_VS, ROBOT_FS, ["uVP", "uModel", "uCamPos", "uFog", "uAer", "uTex"]);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(pr.p);
    gl.uniform1i(pr.U.uTex, unit);
    gl.useProgram(prog);
    return pr;
  }
  const robotMesh = { ready: false, count: 0, vao: null, prog: null };
  (async () => {
    try {
      const [mesh, img] = await Promise.all([
        loadMeshBin("assets/robot/robot.bin", 0x52424f54), // "RBOT"
        loadImg("assets/robot/robot-basecolor.jpg"),
      ]);
      robotMesh.prog = makeRobotProg(img, 5);
      robotMesh.vao = mesh.vao;
      robotMesh.count = mesh.count;
      robotMesh.ready = true;
    } catch (e) {
      // no robot mesh — the fleet stays grounded (its actors stay dark too)
    }
  })();

  // ---- the Cadence castes (v51): six citizen robot kinds, Blender-built
  // from primitives (tmp/orb-dimension/cadence_robots.py → cadence-01..06.bin
  // + one shared flat-color palette). Served-only like the fleet; on file://
  // the towns simply have no citizens out. Kinds by index:
  //   0 chanter, 1 lattice-wright, 2 archivist, 3 ferry, 4 warden, 5 gardener
  const cadenceMesh = { ready: false, meshes: [], prog: null };
  (async () => {
    try {
      const [meshes, img] = await Promise.all([
        Promise.all([1, 2, 3, 4, 5, 6].map((k) =>
          loadMeshBin(`assets/robot/cadence-0${k}.bin`, 0x43424f54))), // "CBOT"
        loadImg("assets/robot/cadence-palette.jpg"),
      ]);
      cadenceMesh.prog = makeRobotProg(img, 6);
      cadenceMesh.meshes = meshes;
      cadenceMesh.ready = true;
    } catch (e) {
      // no cadence bins — the towns stand, the citizens stay home
    }
  })();

  // ---- THE BUILDINGS (v58, first article): James's ChatGPT→Meshy tower
  // "building-01b", lit by the guided pipeline (tmp/orb-dimension/
  // guide_place2.py → export_bldg.py): a BLDG .bin (same layout as the robot
  // bins, Y-up, height-normalized to 1.0), a baked surface albedo and a
  // LIGHT MAP — both in the same cylindrical UV space; RGB = exact emissive
  // color (amber windows / 1C9BF4 trim / C810BF service), A = window presence
  // (unlit panes darken to glass). Served-only like the robots. TEST
  // PLACEMENT: one instance at Mediant, hard-coded — no placement system yet;
  // James's flight decides whether the other 29 go through the same pipe.
  const BLDG_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vN;
out vec2 vUV;
out vec3 vP;
out vec3 vO;   // object-space position (height-normalized) for triplanar surface tiles
out vec3 vON;  // object-space normal
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vP = wp.xyz;
  vN = mat3(uModel) * aNorm;
  vUV = aUV;
  vO = aPos;
  vON = aNorm;
  gl_Position = uVP * wp;
}`;
  const BLDG_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uTex2; // strut alloy for the struts/arms/conduit (v59; was pale ceramic v58)
uniform sampler2D uLight;
uniform vec3 uCamPos;
uniform float uFog;
uniform float uMelt;
uniform float uFarBlur;
uniform float uFarFollow; // v70: 1 = past the cap, follow the pixel footprint fully (the station)
uniform float uLightMul; // v73: the station's "station lights" dial; 1 for the towers
uniform float uCoreBlur; // v75: 1 = the dial blurs the pane itself (towers); 0 = halo only (the station, frozen)
uniform float uGlow;
uniform float uLidMask;
uniform float uTime;
in vec3 vN;
in vec2 vUV;
in vec3 vP;
in vec3 vO;
in vec3 vON;
out vec4 oC;
${COMM_AER}
void main() {
  // surface: TRIPLANAR tile in object space (v58 — the cylindrical bake
  // sheared on platform edges and annex faces; the tile now runs straight on
  // every face). ~28 repeats over the tower's height, like the bake did.
  vec3 an = abs(normalize(vON));
  an = an / (an.x + an.y + an.z);
  vec3 q = vO * 16.0;   // v59: ~25 m per tile on a 400 m tower — large formed sheets, not a fine grid (James)
  // struts/conduit park on light-map row V≈0.9035 (painted-space 0.0965): pale
  // ceramic, no windows ever — the guide's inscrutable alien member
  float isStrut = step(0.902, vUV.y) * (1.0 - step(0.905, vUV.y));
  vec3 base = texture(uTex, q.zy).rgb * an.x + texture(uTex, q.xz).rgb * an.y + texture(uTex, q.xy).rgb * an.z;
  vec3 base2 = texture(uTex2, q.zy).rgb * an.x + texture(uTex2, q.xz).rgb * an.y + texture(uTex2, q.xy).rgb * an.z;
  base = mix(base, base2 * 0.8, isStrut);   // v59: machined pale alloy, a notch under the ceramic's brightness
  vec4 lm = texture(uLight, vUV) * (1.0 - isStrut) * uLightMul; // v73: "station lights" (1 for towers)
  // v59: the tower BODY is cylindrically mapped, so a near-horizontal face (saucer top, cupola cap, domed lids)
  // sits at one map row and would smear it across the whole face (James's top-down "crazy whack"). Body rows are
  // vUV.y < 0.685 (painted V > 0.315); the island atlas above that (platform patches, pads) is planar and exempt.
  float bodyRow = 1.0 - step(0.685, vUV.y);
  float wall = 1.0 - smoothstep(0.40, 0.55, abs(normalize(vON).y));
  lm *= mix(1.0, wall, bodyRow * uLidMask);   // v60: uLidMask 0 for the sphere family (every face is a wall)
  vec3 N = normalize(vN);
  // v58: the spire beacon — top 1.2% of the map is red; off, then a bright
  // quick blink every 3 s (James's spec). Off = no emission at all.
  float isBeacon = step(0.988, 1.0 - vUV.y) * step(0.5, lm.r) * step(lm.g, 0.3);
  float blink = step(0.85, fract(uTime / 3.0)) * (1.0 - step(0.97, fract(uTime / 3.0)));
  lm.rgb = mix(lm.rgb, lm.rgb * blink * 1.6, isBeacon);

  vec3 L1 = normalize(vec3(-0.4, 0.75, 0.5));
  vec3 L2 = normalize(vec3(0.6, 0.2, -0.75));
  float key = max(dot(N, L1), 0.0);
  float rim = max(dot(N, normalize(vec3(0.5, -0.1, -0.8))), 0.0);
  // dark glass wherever a window exists (lit or not)
  base = mix(base, vec3(0.015, 0.02, 0.032), lm.a * 0.9);
  // v59 METAL (James: "it looks like cardboard... no reflectivity, no wear"): dark gunmetal with a real specular
  // response. Roughness follows the tile's wear (bright scuffed corners = polished = tighter/brighter highlight),
  // two highlight lights (key + a glint from behind-right), and a fresnel rim so silhouettes catch a cool sheen.
  vec3 Vv = normalize(-vP);                       // camera at the ship-space origin
  float wear = clamp(dot(base, vec3(0.333)) * 3.0, 0.0, 1.0);
  float shin = mix(14.0, 40.0, wear);
  // big flat plates (saucer tops, platforms) are faceted, so a strong highlight snaps wedge-to-wedge — keep the
  // specular modest there: scale by how vertical the face is (walls glint, lids only sheen)
  float wallness = 1.0 - smoothstep(0.35, 0.8, abs(normalize(vON).y));
  float spScale = mix(0.25, 1.0, wallness);
  float sp1 = pow(max(dot(N, normalize(L1 + Vv)), 0.0), shin) * (0.35 + 0.65 * wear) * spScale;
  float sp2 = pow(max(dot(N, normalize(L2 + Vv)), 0.0), shin * 0.6) * (0.25 + 0.45 * wear) * spScale;
  float fres = pow(1.0 - max(dot(N, Vv), 0.0), 4.0);
  vec3 col = base * 0.55 * (vec3(0.14, 0.15, 0.18)
    + key * vec3(0.9, 0.95, 1.05) * 0.55
    + rim * vec3(0.3, 0.4, 0.55) * 0.25)
    + (sp1 * vec3(0.85, 0.9, 1.0) + sp2 * vec3(0.7, 0.8, 1.0)) * 0.55 * (1.0 - lm.a * 0.7)
    + fres * vec3(0.18, 0.24, 0.34) * 0.5;
  float rd = distance(vP, uCamPos);
  col *= exp(-rd * uFog * 1.4);
  col = aerial(col, rd);
  // windows as NEON (James's spec): the pane's CENTER runs hot toward white,
  // the OUTSIDE stays fully saturated. Two terms, both hue-exact:
  //  core  — the pane itself: exact color, lifted toward white by uGlow but
  //          only where the pane is (never spills), so pink stays C810BF-
  //          shaped at its edge and whitens only in the middle
  //  halo  — a soft bleed onto the metal around the pane, gathered from
  //          the light map's neighborhood at LOWER intensity: the same hue,
  //          dimmer, which reads MORE saturated, not less. Never clips.
  // The world has no bloom pass, so both live here. v55 melt: with distance
  // the crisp pane relaxes into its halo instead of staying razor.
  float px = fwidth(vUV.x + vUV.y) * 4096.0;
  float melt = clamp(px * uMelt * 0.35, 0.0, 1.0);
  vec2 tx = vec2(1.0 / 4096.0);
  // two kernels: TIGHT for the windows (amber stays a pane), WIDE for the
  // neon strips (blue/pink glow). The wide kernel only admits accent-colored
  // texels, so it can never drag pink onto a neighboring dark face.
  vec3 halo = vec3(0.0);
  float haloA = 0.0;
  vec3 haloW = vec3(0.0);
  // v60 (three rounds with James, all "blurry"): the v59 look IS the LOD-0
  // point-sampled kernel — far windows stay individual points and twinkle as
  // the view slides (aliasing, but it "gives a feeling of realness"). It
  // stays the default. uFarBlur (configuration dial, 0 = v59) lets the taps
  // follow the pixel footprint by that many mips: smoother far read, less
  // twinkle. Tap SPACING always stays in texels — a halo is a fixed size on
  // the building (scaling it with distance smeared towers into blobs).
  float lod0 = clamp(log2(max(px * 0.7, 1.0)), 0.0, 9.0);
  // v73 (James: building lights "out of control flicker until blur nine"): the taps
  // ALWAYS sample at the pixel footprint — never a finer mip than the pixel can hold,
  // so nothing twinkles at any dial value — and the dial adds softness ON TOP (half a
  // mip per unit; 0 = sharp, 3 = the soft read he keeps). The v60 point-sample cap
  // (twinkle below the dial) is retired.
  float lodT = min(lod0 + uFarBlur * 0.5, 9.0);
  // v75 (James: the dial "no longer responding at all" on the buildings — it only ever
  // reached the halo, and amber panes carry almost none): for the towers the dial softens
  // the pane itself. Dial 0, or the station (uCoreBlur 0): lm untouched.
  lm = mix(lm, textureLod(uLight, vUV, lodT) * (1.0 - isStrut) * uLightMul, uCoreBlur * step(0.01, uFarBlur));
  for (int j = -2; j <= 2; j++)
    for (int i = -2; i <= 2; i++) {
      vec4 s = textureLod(uLight, vUV + vec2(float(i), float(j)) * tx * 1.2, lodT);
      halo += s.rgb; haloA += s.a;
      vec3 w = textureLod(uLight, vUV + vec2(float(i), float(j)) * tx * 4.0, 1.5 + lodT).rgb;
      float acc = step(w.r + 0.15, w.b + w.g * 0.5) + step(0.5, w.r) * step(0.4, w.b) * step(w.g, 0.35 * w.r);
      haloW += w * clamp(acc, 0.0, 1.0);
    }
  halo *= (1.0 / 25.0);
  haloW *= (1.0 / 25.0);
  // hot center: white lift proportional to how far INSIDE the pane we are
  // (the pane's own alpha at full mip vs its blurred alpha = "centeredness")
  float inside = clamp((lm.a - haloA * (1.0 / 25.0)) * 2.0, 0.0, 1.0) * step(0.02, dot(lm.rgb, vec3(1.0)));
  // per-family weight (James: amber windows were blurring into blobs —
  // they must stay readable as windows; the neon accents keep full halo).
  // amber = warm hue: r high, b low. weight 0.25 amber / 1.0 accents.
  float amberness = clamp((lm.r - lm.b) * 3.0, 0.0, 1.0);
  // James: windows near-crisp (tight kernel, tiny weight); blue/pink strips
  // glow (wide accent-only kernel, big weight)
  float wCore = mix(1.0, 0.10, amberness);
  vec3 core = lm.rgb + vec3(1.0) * inside * inside * uGlow * 0.55 * wCore;   // toward white ONLY in the middle
  vec3 spread = halo * uGlow * 0.06 + haloW * uGlow * 1.5;                       // pane whisper + neon bloom
  vec3 glow = mix(core, halo * (1.0 + uGlow), melt * 0.6) + spread;
  // v72 (James: building windows "don't show up until I'm relatively close"): the far mips
  // average sparse panes toward nothing — a gain rising with the mip level (×1 near, ×3 by
  // mip 4) keeps far windows reading as a glow
  glow *= 1.0 + clamp(lod0 - 2.0, 0.0, 2.0) * 0.5; // v73: ×1 to ×2, only past mip 2 (v72's ×3 fed the twinkle)
  col += glow * exp(-rd * uFog * 0.5);
  oC = vec4(col, 1.0);
}`;
  const BLDG_V = "34"; // bump on every re-export — the browser cached Thursday's light map once already
  // THE BUILDING KINDS (v59): every article that has been through the pipe.
  // id = the asset stem in assets/buildings/ (<id>.bin, <id>-light.png,
  // <id>-surf.jpg); each kind owns its VAO + surf/light textures; the pale
  // ceramic (unit 10) is shared. Add a row per export; seatTestBuildings()
  // seats one test instance per kind. `vantage` = James's DICTATED seat (his
  // coordinates) — null until he dictates one (VIEW then uses the fallback).
  // (SAE_TOWERS in the society block restates this list's length — the crowds gather at the towers)
  const BLDG_KINDS = [
    { id: "building-01b", label: "building 01b · tower", vantage: [7167, 2957, 125247] },
    { id: "building-01a-tower", label: "building 01a · tower", vantage: null },
    { id: "building-01-tower", label: "building 01 · tower", vantage: null },
    { id: "building-01c-tower", label: "building 01c · tower", vantage: null }, // v60
    { id: "building-02-sphere", label: "building 02 · sphere", vantage: null, body: "sphere" }, // v60: second family
  ];
  const bldgMesh = { ready: false, prog: null, kinds: [], list: [], seat: null };
  (async () => {
    try {
      const pr = makeProg(BLDG_VS, BLDG_FS, ["uVP", "uModel", "uCamPos", "uFog", "uAer", "uMelt", "uGlow", "uFarBlur", "uFarFollow", "uLightMul", "uCoreBlur", "uLidMask", "uTime", "uTex", "uTex2", "uLight"]);
      const mkTex = (img, alpha, nearestMag) => {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 11); // scratch unit for upload; draw binds per kind
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, alpha ? gl.RGBA8 : gl.RGB8, alpha ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        // v73 (James: ring windows "getting smeared along"): anisotropic filtering, so an
        // oblique ring keeps its windows instead of smearing them along its length
        const anisoB = gl.getExtension("EXT_texture_filter_anisotropic");
        if (anisoB) gl.texParameterf(gl.TEXTURE_2D, anisoB.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisoB.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        // crisp pane edges: NEAREST when magnified (James: "still a little blurry on the edges"), mips for distance
        if (nearestMag) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, alpha ? gl.CLAMP_TO_EDGE : gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0);
        return tex;
      };
      const ceramic = mkTex(await loadImg("assets/buildings/strut-alloy.jpg?v=" + BLDG_V), false, false);
      gl.activeTexture(gl.TEXTURE0 + 10); gl.bindTexture(gl.TEXTURE_2D, ceramic); gl.activeTexture(gl.TEXTURE0);
      // load every kind; a missing one is skipped, never fatal (partial fleets are fine mid-pipeline)
      const loaded = await Promise.all(BLDG_KINDS.map(async (k) => {
        try {
          const [mesh, surf, light] = await Promise.all([
            loadMeshBin("assets/buildings/" + k.id + ".bin?v=" + BLDG_V, 0x424c4447), // "BLDG"
            loadImg("assets/buildings/" + k.id + "-surf.jpg?v=" + BLDG_V),
            loadImg("assets/buildings/" + k.id + "-light.png?v=" + BLDG_V),
          ]);
          return { ...k, vao: mesh.vao, count: mesh.count, texSurf: mkTex(surf, false, false), texLight: mkTex(light, true, true) };
        } catch (e) { return null; }
      }));
      bldgMesh.kinds = loaded.filter(Boolean);
      // v69: the station kind — the 02-sphere's tile + the generated station
      // light map; its VAO is (re)built from COMM_GEO[2].stn by seatStationBuildings
      try {
        const [surf, light] = await Promise.all([loadImg("assets/tiles/station-hull.jpg?v=" + BLDG_V), loadImg("assets/buildings/station-light.png?v=" + BLDG_V)]);
        bldgMesh.stationKind = { id: "station", label: "Dominant station", vantage: null, body: "sphere", vao: null, count: 0, texSurf: mkTex(surf, false, false), texLight: mkTex(light, true, true), geo: null };
        bldgMesh.makeStationVao = (g) => {
          const k = bldgMesh.stationKind;
          if (k.vao) gl.deleteVertexArray(k.vao);
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          const vb = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vb);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.stn.v), gl.STATIC_DRAW);
          for (const [loc, n, off] of [[0, 3, 0], [1, 3, 12], [2, 2, 24]]) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 32, off); }
          const ib = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.stn.i), gl.STATIC_DRAW);
          gl.bindVertexArray(null);
          k.vao = vao; k.count = g.stn.i.length; k.geo = g;
        };
      } catch (e) { /* no station tile/light map: the members simply don't draw */ }
      if (!bldgMesh.kinds.length) return;
      gl.useProgram(pr.p);
      gl.uniform1i(pr.U.uTex2, 10);
      gl.uniform1i(pr.U.uTex, 8);
      gl.uniform1i(pr.U.uLight, 9);
      gl.useProgram(prog);
      bldgMesh.prog = pr;
      bldgMesh.ready = true;
    } catch (e) {
      // no building bins — the towns stand as before
    }
  })();
  // test seats: one 400 m tower per kind standing off Mediant's core, upright,
  // ~1.6 shell radii out so it reads against the town, not inside it; kinds
  // line up 900 m apart along x so each can be judged on its own
  function seatTestBuildings() {
    const com = COMMUNITIES[1];
    if (!com || !com.c) return;
    // keyed on Mediant's seat: if the ring dials move the town, the towers
    // re-seat themselves next frame (no relayout hook, no init-order coupling)
    if (bldgMesh.seat === com.c && bldgMesh.geo === COMM_GEO) return;
    bldgMesh.seat = com.c;
    bldgMesh.geo = COMM_GEO;
    const sh = com.shellR || 8000;
    bldgMesh.list = bldgMesh.kinds.map((k, i) => ({
      name: k.label, kind: k,
      pos: [com.c[0] + sh * 1.6 + i * 900, com.c[1] - 200, com.c[2] + sh * 0.4], h: 400, yaw: 0.6,
      // vantage: James dictates the viewing seat per building (his numbers,
      // 2026-08-15 for 01b) — the view button jumps here, nose on the tower's middle
      vantage: k.vantage,
    }));
    seatStationBuildings();
  }
  // v68: the station's pads take the buildings — every building at any
  // scale, any orientation, sunk or hanging (James: "get as much mileage out
  // of this work as possible"). Kinds by role: towers stand on outward pads
  // and hang from inward ones; "lying" = a tower on its side along the pad;
  // "farm" = six small spheres in a 2×3 grid; "endcap" = the sphere scaled
  // up on each spine end; "dock" = a tower lying along the spine, half sunk.
  function seatStationBuildings() {
    const com = COMMUNITIES[2];
    const g = COMM_GEO && COMM_GEO[2];
    if (!com || !com.c || !g || !g.pads || !bldgMesh.kinds.length) return;
    const R = mulberry32(SOCIETY_SEED ^ 0xb1d6);
    if (bldgMesh.stationKind && g.stn) {
      // v69: the station's own members — one instance, unit basis, 400 m per mesh unit
      if (bldgMesh.stationKind.geo !== g) bldgMesh.makeStationVao(g);
      if (!bldgMesh.kinds.includes(bldgMesh.stationKind)) bldgMesh.kinds.push(bldgMesh.stationKind);
      bldgMesh.list.push({ name: "Dominant station", kind: bldgMesh.stationKind, pos: com.c.slice(), h: 400, yaw: 0, up: [0, 1, 0], fwd: [0, 0, 1], vantage: null });
    }
    const towers = bldgMesh.kinds.filter((k) => k.body !== "sphere" && k !== bldgMesh.stationKind);
    const spheres = bldgMesh.kinds.filter((k) => k.body === "sphere" && k !== bldgMesh.stationKind);
    const anyT = towers.length ? towers : bldgMesh.kinds;
    const anyS = spheres.length ? spheres : bldgMesh.kinds;
    const pick = (arr) => arr[(R() * arr.length) | 0];
    const add = (p, q, k) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
    const world = (p) => [com.c[0] + p[0], com.c[1] + p[1], com.c[2] + p[2]];
    for (const pad of g.pads) {
      const r = pad.fwd, u = pad.up;
      const f = [u[1] * r[2] - u[2] * r[1], u[2] * r[0] - u[0] * r[2], u[0] * r[1] - u[1] * r[0]];
      if (pad.role === "tower") {
        bldgMesh.list.push({ name: "station tower", kind: pick(anyT), pos: world(pad.p), h: pad.scale, yaw: pad.yaw, up: u, fwd: f, vantage: null });
      } else if (pad.role === "lying") {
        // on its side along the pad: up = the pad's tangent, sunk a fifth
        const h = pad.scale * 1.3;
        const side = R() < 0.5 ? r : [-r[0], -r[1], -r[2]];
        bldgMesh.list.push({ name: "station dock", kind: pick(anyT), pos: world(add(add(pad.p, side, -h * 0.5), u, -h * 0.05)), h, yaw: pad.yaw, up: side, fwd: u, vantage: null });
      } else if (pad.role === "farm") {
        const hs = pad.scale * 0.32;
        for (let i = 0; i < 6; i++) {
          const gx = ((i % 3) - 1) * hs * 1.15, gz = ((i / 3 | 0) - 0.5) * hs * 1.15;
          bldgMesh.list.push({ name: "station farm", kind: pick(anyS), pos: world(add(add(pad.p, r, gx), f, gz)), h: hs, yaw: 0, up: u, fwd: f, vantage: null });
        }
      } else if (pad.role === "endcap") {
        bldgMesh.list.push({ name: "station endcap", kind: pick(anyS), pos: world(pad.p), h: pad.scale, yaw: pad.yaw, up: u, fwd: f, vantage: null });
      } else if (pad.role === "dock") {
        bldgMesh.list.push({ name: "station dock", kind: pick(anyT), pos: world(add(pad.p, u, -pad.scale * 0.45)), h: pad.scale, yaw: pad.yaw, up: u, fwd: f, vantage: null });
      }
    }
  }
  const bldgMat = new Float32Array(16);
  function bldgModel(b) {
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    if (b.up) {
      // v68: a full basis — up + forward (any orientation), yaw about up
      const u = b.up, f0 = b.fwd;
      const r0 = [u[1] * f0[2] - u[2] * f0[1], u[2] * f0[0] - u[0] * f0[2], u[0] * f0[1] - u[1] * f0[0]];
      const r = [r0[0] * c + f0[0] * s, r0[1] * c + f0[1] * s, r0[2] * c + f0[2] * s];
      const f = [f0[0] * c - r0[0] * s, f0[1] * c - r0[1] * s, f0[2] * c - r0[2] * s];
      bldgMat[0] = r[0] * b.h; bldgMat[1] = r[1] * b.h; bldgMat[2] = r[2] * b.h; bldgMat[3] = 0;
      bldgMat[4] = u[0] * b.h; bldgMat[5] = u[1] * b.h; bldgMat[6] = u[2] * b.h; bldgMat[7] = 0;
      bldgMat[8] = f[0] * b.h; bldgMat[9] = f[1] * b.h; bldgMat[10] = f[2] * b.h; bldgMat[11] = 0;
      bldgMat[12] = b.pos[0] - cam.pos[0];
      bldgMat[13] = b.pos[1] - cam.pos[1];
      bldgMat[14] = b.pos[2] - cam.pos[2];
      bldgMat[15] = 1;
      return;
    }
    bldgMat[0] = c * b.h; bldgMat[1] = 0; bldgMat[2] = -s * b.h; bldgMat[3] = 0;
    bldgMat[4] = 0; bldgMat[5] = b.h; bldgMat[6] = 0; bldgMat[7] = 0;
    bldgMat[8] = s * b.h; bldgMat[9] = 0; bldgMat[10] = c * b.h; bldgMat[11] = 0;
    // v49 camera-relative: seat in SHIP space (float64 subtraction here)
    bldgMat[12] = b.pos[0] - cam.pos[0];
    bldgMat[13] = b.pos[1] - cam.pos[1];
    bldgMat[14] = b.pos[2] - cam.pos[2];
    bldgMat[15] = 1;
  }

  // column-major model matrix for one robot: nose along its smoothed facing
  const robotMat = new Float32Array(16);
  function robotModel(rb, t) {
    let f = [rb.f[0] * ROBOT_FACING, rb.f[1] * ROBOT_FACING, rb.f[2] * ROBOT_FACING];
    let rgt = Math.abs(f[1]) > 0.98 ? [1, 0, 0] : vnorm(vcross([0, 1, 0], f));
    const up = vcross(f, rgt);
    robotMat[0] = rgt[0]; robotMat[1] = rgt[1]; robotMat[2] = rgt[2]; robotMat[3] = 0;
    robotMat[4] = up[0]; robotMat[5] = up[1]; robotMat[6] = up[2]; robotMat[7] = 0;
    robotMat[8] = f[0]; robotMat[9] = f[1]; robotMat[10] = f[2]; robotMat[11] = 0;
    // v49 camera-relative: the model matrix seats the robot in SHIP space
    // (float64 subtraction here) — its shader gets uCamPos = 0
    robotMat[12] = rb.pos[0] - cam.pos[0];
    robotMat[13] = rb.pos[1] - cam.pos[1] + Math.sin(t * 1.1 + rb.seed) * 0.5; // hover bob
    robotMat[14] = rb.pos[2] - cam.pos[2];
    robotMat[15] = 1;
  }

  // ---- portals: raycast clicks ------------------------------------------------------

  let wp = new Float32Array(0); // orb world positions, filled each frame

  function rayDir(px, py) {
    const b = camBasis();
    const t = tanF();
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const nx = (2 * px / canvas.clientWidth - 1) * t * aspect;
    // v55.4: subtract the lens shift — pixel rays must agree with the
    // shifted frustum or clicks land above their targets
    const ny = (1 - 2 * py / canvas.clientHeight - projShiftY()) * t;
    const d = [
      b.f[0] + b.r[0] * nx + b.u[0] * ny,
      b.f[1] + b.r[1] * nx + b.u[1] * ny,
      b.f[2] + b.r[2] * nx + b.u[2] * ny,
    ];
    const len = Math.hypot(d[0], d[1], d[2]);
    return [d[0] / len, d[1] / len, d[2] / len];
  }

  function portalHit(px, py) {
    const d = rayDir(px, py);
    const o = cam.pos;
    let best = -1, bestT = Infinity;
    for (let i = 0; i < orbs.length; i++) {
      if (!orbs[i].portal) continue;
      const cx = wp[i * 3] - o[0], cy = wp[i * 3 + 1] - o[1], cz = wp[i * 3 + 2] - o[2];
      const t = cx * d[0] + cy * d[1] + cz * d[2];
      if (t < 0 || t > bestT) continue;
      const r = radiusOf(orbs[i]) * 1.35;
      const dd = cx * cx + cy * cy + cz * cz - t * t;
      if (dd < r * r) { best = i; bestT = t; }
    }
    return best;
  }

  let portalCursor = false;
  function tryPortalClick(px, py) {
    const i = portalHit(px, py);
    if (i >= 0) anchors[i % anchors.length]?.click();
  }

  // ---- frame loop --------------------------------------------------------------------

  const radiusOf = (o) => {
    if (o.fixedR) return o.fixedR;
    const lo = Math.min(cfg.sizeMin, cfg.sizeMax);
    const hi = Math.max(cfg.sizeMin, cfg.sizeMax);
    return lo + o.ur * (hi - lo);
  };

  let lastNow = performance.now();
  let resScale = 1;
  let frameCost = 16;

  function frame(now) {
    const t = now / 1000;
    const rawMs = now - lastNow;
    const dt = Math.min(rawMs / 1000, 0.05);
    lastNow = now;

    // dynamic resolution: if the GPU is drowning (huge tuner settings on a
    // 4K monitor), lower internal resolution instead of stuttering or dying,
    // and creep back up when the load eases
    if (rawMs < 250) {
      frameCost = frameCost * 0.9 + rawMs * 0.1;
      if (frameCost > 24 && resScale > 0.5) resScale = Math.max(0.5, resScale - 0.05);
      else if (frameCost < 18 && resScale < 1) resScale = Math.min(1, resScale + 0.005);
    }

    // -- the thruster: hold shift to burn toward full speed; release and you
    // coast down over a few seconds. Velocity always follows the gaze, so
    // steering with the mouse curves the flight. Space toggles OVERDRIVE.
    // v49 configuration: tops, tanks and spools all live in cfg (flat ladder,
    // expansion-spec.md — defaults 240 / 1,200 / 3,600, tanks 240s / 360s,
    // spools 5s / 3s). The booster BUILDS, overdrive SLAMS.
    const VMAX = cfg.boostTop, VOVER = cfg.overTop;
    const COAST_TAU = 3.2; // release-coast time constant: booster + the jets (v37/v44)
    const IMP_COAST = 5.0; // v60: impulse alone coasts longer (James: "last longer" — impulse only)
    // the booster drinks water; overdrive burns deuterium (v38). Tanks are
    // generous and impulse is always free — a dry tank means limping (a long
    // limp, out in the gulf), never stranding.
    const burning = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && fuel.h2o > 0;
    if (burning && !overdrive) fuel.h2o = Math.max(0, fuel.h2o - dt / cfg.h2oTank);
    if (overdrive) {
      fuel.deu = Math.max(0, fuel.deu - dt / cfg.deuTank);
      if (fuel.deu === 0) {
        overdrive = false; // the pulse drive sputters out
        odThump(false);
      }
    }
    // the boosts respect the S key (per James 2026-07-17): holding S points
    // the burn backwards — shift and overdrive thrust in REVERSE while it's
    // down, swinging smoothly through zero, and swing forward again on release
    const rev = keys.has("KeyS") ? -1 : 1;
    const target = (overdrive ? VOVER : burning ? VMAX : 0) * rev;
    if (autoNav && navTarget) {
      // -- lock-on autopilot (v43): hands off — the nose eases onto the
      // course and the nav-assist thrusters cruise (no tank drain). The
      // ship hands back to the free coast exactly one coast-length short
      // of the standoff, so you arrive just as the drift dies.
      const dx = navTarget.pos[0] - cam.pos[0];
      const dy = navTarget.pos[1] - cam.pos[1];
      const dz = navTarget.pos[2] - cam.pos[2];
      const dist = Math.hypot(dx, dy, dz) || 1;
      const dir = [dx / dist, dy / dist, dz / dist];
      const ang = Math.acos(clamp(vdot(cam.f, dir), -1, 1));
      if (ang > 0.0005) {
        rotateCam(vnorm(vcross(cam.f, dir)), Math.min(ang, 0.5 * dt));
      }
      if (dist <= autoNav.standoff + (Math.abs(thrust) * COAST_TAU + Math.abs(impulse) * IMP_COAST) + 40) {
        autoNav = null; // release — the coast carries you to the doorstep
      } else {
        // v49: the autopilot cruises at up to overdrive speed for the long
        // hauls — lock a colony 250km out, go get a drink (the #57 loop).
        // Nav-assist thrust stays free; fuel is for flying it yourself.
        const cruise = clamp(dist / 8, 140, cfg.overTop);
        thrust += (cruise - thrust) * (1 - Math.exp(-dt / 1.2));
      }
    } else if (allStop) {
      // X = all-stop (v37): brake hard but smooth — no head-snap. Any new
      // thrust input releases it (handled in keydown).
      thrust *= Math.exp(-dt / 0.35);
      if (Math.abs(thrust) < 4) { thrust = 0; allStop = false; }
    } else if (target !== 0) {
      // v49 spools: 0-to-full in cfg.boostSpool / cfg.overSpool seconds
      // (exponential family — tau = spool/3.9 puts ~98% of top at the mark).
      // Overdrive's 3s is a SLAM; the dampeners are canonically excellent.
      const tau = (overdrive ? cfg.overSpool : cfg.boostSpool) / 3.9;
      thrust += (target - thrust) * (1 - Math.exp(-dt / tau));
    } else {
      // free coast (v37: 1.6 → 3.2 per James — the drift after a burn should
      // carry you a good while; X is there when you want to stop)
      thrust *= Math.exp(-dt / COAST_TAU);
      if (Math.abs(thrust) < 4) thrust = 0;
    }

    // -- IMPULSE (v38 name, was "the dolly"): hold W to glide forward along
    // your gaze, S to back out. Burns nothing.
    // v44: releasing the key COASTS (same 3.2s constant as the thruster —
    // it's space, this speed doesn't just vanish); X still brakes everything.
    const IMPULSE = cfg.impTop; // m/s (80 → 120 v38; 240 + configuration v49; 200 v60)
    const dolly = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    if (dolly !== 0) {
      impulse += (dolly * IMPULSE - impulse) * (1 - Math.exp(-dt / 0.5));
    } else if (allStop) {
      impulse *= Math.exp(-dt / 0.35);
      if (Math.abs(impulse) < 2) impulse = 0;
    } else {
      impulse *= Math.exp(-dt / IMP_COAST);
      if (Math.abs(impulse) < 2) impulse = 0;
    }
    // v49 FLAT ladder (James: "each mode should have a flat top speed.
    // easier."): the dominant drive carries the ship — never a sum. Engaging
    // a bigger drive mid-glide only ever adds speed; nothing stacks past the
    // mode's top. Continuous at the crossover (both sides equal there).
    const speed = Math.abs(thrust) >= Math.abs(impulse) ? thrust : impulse;
    if (sound.on && sound.engine) updateEngine(thrust, dolly !== 0);
    if (speed !== 0) {
      const bd = cam; // v60: the ship glides along its NOSE, not the eye
      // flight bounds are the REAL space now (v49) — the core spreads only
      // size the neighborhood, not the cage
      const bounds = [SPACE_X * 0.95, SPACE_Y * 0.95, SPACE_Z * 0.95];
      for (let i = 0; i < 3; i++) {
        cam.pos[i] = clamp(cam.pos[i] + bd.f[i] * speed * dt, -bounds[i], bounds[i]);
      }
    }
    // -- ATTITUDE JETS (v60, James: "I'm not a plane"): R/F rise and sink,
    // Q/E slide left and right — straight along the pod's OWN up and right
    // (pod contract: ship frame, never world axes). Same manners as impulse:
    // free, builds over half a second, coasts on release (3.2s), X brakes.
    // Orthogonal to the ladder, so it rides alongside forward speed rather
    // than competing with it — the ladder stays flat.
    const jetU = (keys.has("KeyR") ? 1 : 0) - (keys.has("KeyF") ? 1 : 0);
    const jetR = (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
    const jetTop = cfg.rcsTop;
    const jetK = 1 - Math.exp(-dt / 0.5);
    if (jetU !== 0) rcsU += (jetU * jetTop - rcsU) * jetK;
    else { rcsU *= Math.exp(-dt / (allStop ? 0.35 : COAST_TAU)); if (Math.abs(rcsU) < 2) rcsU = 0; }
    if (jetR !== 0) rcsR += (jetR * jetTop - rcsR) * jetK;
    else { rcsR *= Math.exp(-dt / (allStop ? 0.35 : COAST_TAU)); if (Math.abs(rcsR) < 2) rcsR = 0; }
    if (rcsU !== 0 || rcsR !== 0) {
      const bd = cam;
      const bounds = [SPACE_X * 0.95, SPACE_Y * 0.95, SPACE_Z * 0.95];
      for (let i = 0; i < 3; i++) {
        cam.pos[i] = clamp(cam.pos[i] + (bd.u[i] * rcsU + bd.r[i] * rcsR) * dt, -bounds[i], bounds[i]);
      }
    }

    // -- fuel pickup: fly within 150m of a station and that tank sweeps to
    // full — success chime, meter flourish. Stations are depots, permanent.
    for (const kind of ["h2o", "deu"]) {
      if (fuel[kind] > 0.999) continue;
      for (const c of STATIONS[kind]) {
        const dx = cam.pos[0] - c[0], dy = cam.pos[1] - c[1], dz = cam.pos[2] - c[2];
        if (dx * dx + dy * dy + dz * dz < 22500) { refill(kind); break; }
      }
    }

    // -- rotation, all in the camera's OWN frame (banked yaw curves the bank)
    //
    // v48 drag-stick: the pointer's OFFSET from where the press planted the
    // stick commands a turn RATE — a virtual joystick. Deadzone in the
    // middle, response curve between, and a saturation rim ("reach") past
    // which more distance adds nothing: park the cursor at the rim and the
    // ship holds its best turn forever. No more feeding the turn with desk
    // travel. The rate feeds pending at rate*dt exactly like the arrow keys,
    // so the v47 servo below still owns all the smoothing. Center mode
    // (default since v48.2, James's spec): the stick is PINNED to the
    // center reticle — grab near it, hold, and pull; the reticle itself
    // marks neutral, so no extra chrome on the glass. Both modes steer
    // only while the button is held.
    // v55.1 the magnifier: ease zoom toward the wheel's target — never a
    // snap (motion restraint). setProj reads zoom every frame, so nothing
    // else needs rebuilding. The ×-readout rides under the reticle.
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 6);
    if (Math.abs(zoom - zoomTarget) < 0.002) zoom = zoomTarget;
    if (magUi.z !== zoom) {
      magUi.z = zoom;
      const magOn = zoom > 1.001;
      if (magOn !== magUi.on) {
        magUi.on = magOn;
        magRead.classList.toggle("on", magOn);
      }
      if (magOn) {
        const mrc = reticleCenter();
        magRead.textContent = "MAG ×" + zoom.toFixed(1);
        magRead.style.left = mrc.x + "px";
        magRead.style.top = mrc.y + 150 + "px";
      }
    }
    const DEG = Math.PI / 180;
    const stickRc = reticleCenter();
    const stickAx = cfg.stickMode === "center" ? stickRc.x : stick.ax;
    const stickAy = cfg.stickMode === "center" ? stickRc.y : stick.ay;
    const stickHeld = stickLive && !autoNav && drag.on;
    let stickMag = 0; // 0..1 deflection after deadzone, 1 = saturated
    if (stickHeld) {
      const dx = mouse.x - stickAx, dy = mouse.y - stickAy;
      const mag = Math.hypot(dx, dy);
      if (mag > cfg.stickDead) {
        const span = Math.max(1, cfg.stickReach - cfg.stickDead);
        stickMag = Math.min(1, (mag - cfg.stickDead) / span);
        // radial curve, direction preserved — gentle near center for aim,
        // full authority at the rim. v55.1: /zoom — magnified turn rates
        // shrink to match, so the view never whips while zoomed.
        // v60 THE HARD PULL (James: "I need to be able to pull a little
        // harder"): the rim is no longer a wall. Past reach the stick keeps
        // giving — linearly up to stickPull× the max rate at TWICE the reach,
        // then it saturates. Inside the rim nothing changed.
        const over = Math.min(1, Math.max(0, mag - cfg.stickReach) / Math.max(1, cfg.stickReach));
        const pull = 1 + over * (cfg.stickPull - 1);
        const gain = Math.pow(stickMag, cfg.stickCurve) * pull / (mag * zoom);
        pendingYaw -= dx * gain * cfg.stickYawMax * DEG * dt;
        pendingPitch -= dy * gain * cfg.stickPitchMax * DEG * dt;
      }
    }
    // the stick's instruments: anchor dot + saturation rim. Shown while
    // steering, or once a press is clearly a hold (so you can see neutral
    // before committing); the rim brightens when you've hit full deflection.
    // v48.1: rim hidden — James found the circle too present on his first
    // flight ("might not be necessary"). Physics untouched; the anchor dot
    // stays as the neutral marker. Flip STICK_RIM to bring the rim back.
    const STICK_RIM = false;
    const showStick = cfg.stickMode === "center"
      ? false // the reticle IS the center marker — nothing extra (v48.2)
      : drag.on && (stickLive || performance.now() - drag.downT > 250);
    if (showStick !== stickUi.shown) {
      stickUi.shown = showStick;
      stickDot.classList.toggle("on", showStick);
      stickRim.classList.toggle("on", showStick && STICK_RIM);
    }
    if (showStick) {
      stickDot.style.left = stickAx + "px";
      stickDot.style.top = stickAy + "px";
      if (STICK_RIM) {
        stickRim.style.left = stickAx + "px";
        stickRim.style.top = stickAy + "px";
        stickRim.style.width = stickRim.style.height = cfg.stickReach * 2 + "px";
        stickRim.classList.toggle("sat", stickMag >= 1);
      }
    }
    // v54.2: the ghost grab ring — a faint dotted edge marking how far from
    // the reticle a press still grabs the nose (cfg.stickGrab). On for now
    // so James can see and tune the radius; flip GRAB_RING to retire it.
    const GRAB_RING = true;
    const grabOn = GRAB_RING && cfg.stickMode === "center";
    if (grabOn) {
      if (grabUi.d !== cfg.stickGrab * 2) {
        grabUi.d = cfg.stickGrab * 2;
        const pad = 3, side = grabUi.d + pad * 2;
        stickGrabRing.setAttribute("width", side);
        stickGrabRing.setAttribute("height", side);
        stickGrabRing.setAttribute("viewBox",
          `${-(cfg.stickGrab + pad)} ${-(cfg.stickGrab + pad)} ${side} ${side}`);
        stickGrabCirc.setAttribute("r", cfg.stickGrab);
      }
      if (grabUi.x !== stickAx || grabUi.y !== stickAy) {
        grabUi.x = stickAx;
        grabUi.y = stickAy;
        stickGrabRing.style.left = stickAx + "px";
        stickGrabRing.style.top = stickAy + "px";
      }
    }
    if (grabOn !== grabUi.on) {
      grabUi.on = grabOn;
      stickGrabRing.classList.toggle("on", grabOn);
    }

    const ROT = 0.77 / zoom; // rad/s (arrow keys; v60 +10% from 0.7; v55.1: slower while magnified)
    if (keys.has("ArrowLeft")) { pendingYaw += ROT * dt; leveling = false; }
    if (keys.has("ArrowRight")) { pendingYaw -= ROT * dt; leveling = false; }
    if (keys.has("ArrowUp")) { pendingPitch += ROT * dt; leveling = false; }
    if (keys.has("ArrowDown")) { pendingPitch -= ROT * dt; leveling = false; }
    // critically-damped servo onto the pending look (v47): rate accelerates
    // toward the remaining input and damps as it arrives — smooth start,
    // smooth stop, zero overshoot, and rapid mouse reversals blend instead
    // of snapping. LOOK_W sets the response (~0.4s to settle); the old
    // first-order ease had the same latency but a discontinuous velocity,
    // which was the jerk James felt.
    const LOOK_W = 10;
    lookRateYaw += (LOOK_W * LOOK_W * pendingYaw - 2 * LOOK_W * lookRateYaw) * dt;
    lookRatePitch += (LOOK_W * LOOK_W * pendingPitch - 2 * LOOK_W * lookRatePitch) * dt;
    const yawStep = lookRateYaw * dt;
    const pitchStep = lookRatePitch * dt;
    pendingYaw -= yawStep;
    pendingPitch -= pitchStep;
    // v55.3 THE POD CONTRACT (James: "this is space... I just point where I
    // wanna go"): every rotation is in the SHIP'S OWN FRAME, always — yaw
    // about ship-up, pitch about ship-right, roll about the boresight. No
    // world-frame axes, no attitude-dependent blending, ever (the v55.2
    // horizon-lock experiment whipped the view near 90° bank — reverted the
    // same night). The reticle tilt is COMMANDED ROLL, not world attitude —
    // that is what makes the tilt he sets robotically hold while dragging.
    if (yawStep !== 0) rotateCam(cam.u, yawStep);
    if (pitchStep !== 0) rotateCam(cam.r, pitchStep);
    // v60 the eye: head-look eases toward its drag target (and home on
    // release); the turn-lean swells slowly toward a few degrees in the
    // direction the ship is turning and settles when it stops. Both are
    // view-only — see camBasis().
    {
      const kh = 1 - Math.exp(-dt * 8);
      head.yaw += (head.tYaw - head.yaw) * kh;
      head.pitch += (head.tPitch - head.pitch) * kh;
      if (!head.on && Math.abs(head.yaw) < 1e-4 && Math.abs(head.pitch) < 1e-4) { head.yaw = 0; head.pitch = 0; }
      const kl = 1 - Math.exp(-dt * 3);
      lead.yaw += (clamp(lookRateYaw * LEAD_GAIN, -LEAD_MAX, LEAD_MAX) - lead.yaw) * kl;
      lead.pitch += (clamp(lookRatePitch * LEAD_GAIN, -LEAD_MAX, LEAD_MAX) - lead.pitch) * kl;
      if (Math.abs(lead.yaw) < 1e-4) lead.yaw = 0;
      if (Math.abs(lead.pitch) < 1e-4) lead.pitch = 0;
    }

    // -- roll: A/D bank while held and STAY banked (per James, NMS pilot —
    // moved off Q/E 2026-07-17 so he can bank + point the nose with the mouse;
    // Q/E stay unassigned for now)
    // v48.6: climbing back up in +10% steps by ear (James) — the slower
    // stick made 0.46 feel like nothing. History: 0.66 → 0.46 → 0.51.
    const ROLL_RATE = (cfg.rollMax * Math.PI) / 180; // v57.2: dialable (default 29°/s = the old 0.51)
    const rollIn = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    rollVel += (rollIn * ROLL_RATE - rollVel) * (1 - Math.exp(-dt * 6));
    if (Math.abs(rollVel) > 1e-4) {
      rotateCam(cam.f, rollVel * dt);
      rollShown += rollVel * dt; // the reticle follows the COMMAND (v55.3)
      if (rollIn !== 0) leveling = false;
    }

    // -- coordinated turn: banking IS turning (James, v26) — RETIRED v48.4.
    // James's pencil spec: "A and D shouldn't make me do anything except
    // rotate the ship around its middle axis... like a pencil coming all
    // the way straight through the middle of it." The carve dates from the
    // pre-stick era when banking was the only way to turn in flight; the
    // pinned stick owns turning now, so roll is pure orientation. Flying
    // forward + D = corkscrew barrel roll, nose glued to the target.
    // Flip BANK_CARVE to bring the v26 behavior back.
    const BANK_CARVE = false;
    const TURN_RATE = 0.5; // rad/s of heading at full bank
    const bankRad = Math.atan2(cam.r[1], cam.u[1]);
    if (BANK_CARVE && Math.abs(bankRad) > 0.02 && speed !== 0) {
      // v40: wings need airflow. The carve scales with speed and is ZERO at
      // a standstill — James's "drift while the speedo reads 0" was this
      // turn spinning the world around a parked, banked ship. Full turn
      // authority from impulse speed (120) up.
      const authority = clamp(Math.abs(speed) / 120, 0, 1);
      // v48.3: the carve YIELDS to the hand. It rotates in the WORLD frame,
      // so under a held pull it bent the ship off the mouse's line — and
      // read reversed when inverted (James: "it wants to pull the other
      // way"). Stick deflection fades it: full pull = pure mouse authority,
      // hands off = the v26 carve untouched. Never let a world-frame
      // rotation fight the pilot's pull.
      rotateCam([0, 1, 0], TURN_RATE * Math.sin(bankRad) * authority * (1 - stickMag) * dt);
    }

    // -- CAPS LOCK: glide back to the plane of the ecliptic (level roll and
    // pitch, keep heading) over about a second (was R until v60; R is a jet
    // now, James picked caps lock — a tap is enough, leveling runs to done)
    if (keys.has("CapsLock")) {
      if (!leveling) stickLive = false; // v48: leveling takes the stick until the hand moves again
      leveling = true;
    }
    if (leveling) {
      let fl = [cam.f[0], 0, cam.f[2]];
      if (Math.hypot(fl[0], fl[2]) < 0.05) fl = [cam.u[0], 0, cam.u[2]]; // was looking straight up/down
      fl = vnorm(fl);
      const k = 1 - Math.exp(-dt * 2.5);
      cam.f = vnorm(vlerp(cam.f, fl, k));
      cam.u = vnorm(vlerp(cam.u, [0, 1, 0], k));
      // v60 BUG FIX (James: "I also want to straighten out"): orthonormalize()
      // rebuilds up FROM right, and right was never touched here — so the
      // roll survived every level-off and only the pitch came home. Rebuild
      // right from the leveled pair so the roll actually levels.
      cam.r = vnorm(vcross(cam.f, cam.u));
      rollShown *= 1 - k; // the reticle glides home with the ship (v55.3)
      if (vdot(cam.f, fl) > 0.99995 && cam.u[1] > 0.99995) leveling = false;
    }
    orthonormalize();

    // -- THE GAZE (v34): near the face the dead god's eyes follow you.
    // Each eye drifts inside its socket toward your direction — clamped so it
    // stays seated (the bone rim partially occludes it at extremes), eased at
    // a deliberately slow time constant so you notice on the third visit,
    // not the first. v52 scale-up: offset clamp 48 → 320 (the v29-measured
    // 53m socket clearance scales to ~353m at ×20 — the seated rule holds),
    // engage radius 6 → 18km. Beyond that the gaze relaxes to dead ahead.
    for (const o of eyeOrbs) {
      if (!o.gaze) o.gaze = [0, 0];
      const ex = cam.pos[0] - o.fix[0], ey = cam.pos[1] - o.fix[1], ez = cam.pos[2] - o.fix[2];
      const ed = Math.hypot(ex, ey, ez) || 1;
      const w = clamp((18000 - ed) / 10000, 0, 1);
      const k = 1 - Math.exp(-dt * 0.6);
      o.gaze[0] += ((ex / ed) * 320 * w - o.gaze[0]) * k;
      o.gaze[1] += ((ey / ed) * 320 * w - o.gaze[1]) * k;
    }

    // -- the living layer (v47): colony life, the fleet, the castes
    updateActors(t, dt, camBasis());

    // -- orb world positions + depth sort (back to front)
    const n = orbs.length;
    heartIdx.length = 0; // v63: this frame's suns, for the key-light pick
    if (wp.length !== n * 3) wp = new Float32Array(n * 3);
    const sx = cfg.spreadX, sy = cfg.spreadY, sz = cfg.spreadZ;
    const actEase = 1 - Math.exp(-dt / 0.9);
    let contacts = 0; // real orbs within sensor range (2.5 km), for the console
    for (let i = 0; i < n; i++) {
      const o = orbs[i];
      // wander is absolute meters, NOT spread-scaled: "drifting slowly about"
      // means a few m/s, and near orbs must never flee the visitor
      let x, y, z;
      if (o.fix) {
        // seated in the skull or the reef: fixed world coords, no spread
        // scaling. Eyes carry the gaze offset; reef spores drift locally.
        x = o.fix[0]; y = o.fix[1]; z = o.fix[2];
        if (o.gaze) { x += o.gaze[0]; y += o.gaze[1]; }
        else if (o.fixAmp) {
          x += wander(o.wx, t) * o.fixAmp;
          y += wander(o.wy, t) * o.fixAmp * 0.6;
          z += wander(o.wz, t) * o.fixAmp;
        }
      } else if (o.dust) {
        // v49 CAMERA-LOCAL DUST: the mote field rides with the ship. Each
        // mote holds a world-fixed seat until it leaves a box around the
        // camera, then recycles to the far side — honest parallax at any
        // speed, anywhere in the 1,000km, and no direction is ever empty.
        // At 3,600 m/s the recycling is what makes speed READ at all.
        x = o.n[0] * 4000 + wander(o.wx, t) * 30;
        y = o.n[1] * 2000 + wander(o.wy, t) * 18;
        z = o.n[2] * 4000 + wander(o.wz, t) * 30;
        x = cam.pos[0] + (((x - cam.pos[0]) % 8000) + 12000) % 8000 - 4000;
        y = cam.pos[1] + (((y - cam.pos[1]) % 4000) + 6000) % 4000 - 2000;
        z = cam.pos[2] + (((z - cam.pos[2]) % 8000) + 12000) % 8000 - 4000;
      } else {
        const amp = o.heart || o.veil ? 0 : o.portal ? 15 : 60;
        x = o.n[0] * sx + wander(o.wx, t) * amp;
        y = o.n[1] * sy + wander(o.wy, t) * amp * 0.6;
        z = o.n[2] * sz + wander(o.wz, t) * amp;
      }
      wp[i * 3] = x; wp[i * 3 + 1] = y; wp[i * 3 + 2] = z;
      if (o.heart) heartIdx.push(i);
      const dx = x - cam.pos[0], dy = y - cam.pos[1], dz = z - cam.pos[2];
      dists[i] = dx * dx + dy * dy + dz * dz;
      if (!o.dust && !o.veil && !o.reef && !o.actor && dists[i] < 6250000) contacts++;
      // the three states (v47): far = vague nothing, near = stirring, very
      // near = fully awake. Thresholds scale with the orb's size (a big
      // worldlet declares itself sooner); a robot's service call also wakes
      // its client. Smoothed, so the states glide.
      // v56: kind 65 (the Saelyri) rides the same three-state glide — a 10m
      // being stirs at ~1.3km and wakes fully at ~280m, which is also the
      // raymarch gate in its shader branch
      if (o.kind && (o.kind < 60 || o.kind === 65)) {
        const orr = radiusOf(o);
        const nearD = orr * 20 + 1200, vnearD = orr * 6 + 250;
        let tgt = dists[i] < vnearD * vnearD ? 2 : dists[i] < nearD * nearD ? 1 : 0;
        if (o.svc > 0) {
          tgt = Math.max(tgt, Math.min(o.svc, 2));
          o.svc = Math.max(0, o.svc - dt / 2.5);
        }
        o.act += (tgt - o.act) * actEase;
      }
      order[i] = i;
    }
    order.sort((a, bI) => dists[bI] - dists[a]);

    // -- viewscreen: throttle bar and reticle horizon track every frame, the
    // text readouts refresh at ~8 Hz so the numbers stay legible
    vsEls.thr.style.width = Math.min(100, (Math.abs(thrust) / VOVER) * 100).toFixed(1) + "%";
    vsEls.thr.classList.toggle("rev", thrust < 0);
    vsEls.h2o.style.width = (fuel.h2o * 100).toFixed(1) + "%";
    vsEls.deu.style.width = (fuel.deu * 100).toFixed(1) + "%";
    const bankDeg = Math.atan2(cam.r[1], cam.u[1]) * 180 / Math.PI;
    // the WHOLE reticle spins through the full 360° as you roll (James, v25)
    // — but since v55.3 it shows COMMANDED roll (rollShown), never world
    // attitude: A/D move it, R glides it home, and dragging the mouse can
    // NEVER move it (world-bank drive made body-frame turns read as phantom
    // rolls — James's "it flipped over on its own"). BNK below stays honest
    // world telemetry.
    // v57.2 EXPERIMENT (James, 2026-08-01): the reticle is PINNED — wings
    // level at the screen midline always; rolling spins the universe past a
    // fixed X. rollShown still integrates underneath (stick-sim guards it)
    // so this is one line to revert if the feel doesn't stick.
    vsEls.ret.style.transform = "translate(-50%, -50%)";
    if (now >= hudNext) {
      hudNext = now + 120;
      const spd = Math.abs(speed);
      const signed = (v) =>
        (v < 0 ? "−" : "+") + String(Math.abs(Math.round(v))).padStart(2, "0");
      vsEls.spd.textContent = (speed < -1 ? "−" : "") + Math.round(spd);
      vsEls.mode.textContent = autoNav ? "AUTO" : overdrive ? "OVERDRIVE" : allStop && spd > 1 ? "BRAKE" : speed < -1 ? "REVERSE" : burning ? "BURN" : dolly !== 0 ? "IMPULSE" : spd > 1 ? "COAST" : "IDLE";
      vsEls.mode.classList.toggle("over", overdrive);
      vsEls.hdg.textContent =
        String(Math.round((Math.atan2(cam.f[0], -cam.f[2]) * 180 / Math.PI + 360) % 360)).padStart(3, "0");
      vsEls.pit.textContent = signed(Math.asin(clamp(cam.f[1], -1, 1)) * 180 / Math.PI);
      vsEls.bnk.textContent = signed(bankDeg);
      // live position: watch the numbers run while you fly (James, v34)
      const pfmt = (v) => (v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString("en-US");
      vsEls.px.textContent = pfmt(cam.pos[0]);
      vsEls.py.textContent = pfmt(cam.pos[1]);
      vsEls.pz.textContent = pfmt(cam.pos[2]);
      const kfmt = (d) => (d >= 1000 ? (d / 1000).toFixed(1) + " km" : Math.round(d) + " m");
      const hd = Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2]);
      vsEls.home.textContent = kfmt(hd);
      let reefD = Infinity; // nearest colony — the sensor doesn't play favorites
      for (const col of REEF_COLONIES) {
        reefD = Math.min(reefD, Math.hypot(
          cam.pos[0] - col.c[0], cam.pos[1] - col.c[1], cam.pos[2] - col.c[2]));
      }
      vsEls.reef.textContent = kfmt(reefD);
      vsEls.con.textContent = String(contacts);
      {
        const dry = fuel.deu <= 0 ? "NO DEU" : fuel.h2o <= 0 ? "NO H2O" : null;
        vsEls.eng.textContent = overdrive ? "OVERDRIVE" : dry || "NOMINAL";
        vsEls.eng.classList.toggle("vs-ok", !dry);
        vsEls.eng.classList.toggle("vs-off", !!dry);
        vsEls.h2oBar.classList.toggle("low", fuel.h2o < 0.25);
        vsEls.deuBar.classList.toggle("low", fuel.deu < 0.25);
      }
      // the city hums when you're close to Korrudan's crust (v52): distance
      // to the skull ellipsoid surface, roughly — thousands of small machines
      if (sound.on && sound.cityHum && sound.ctx) {
        const en = Math.hypot(cam.pos[0] / SKULL_EL[0], cam.pos[1] / SKULL_EL[1], cam.pos[2] / SKULL_EL[2]);
        const ld = Math.max(0, (en - 1) * SKULL_EL[1]); // ~meters above the bone
        sound.cityHum.gain.setTargetAtTime(clamp(1 - ld / 5200, 0, 1) * 0.1, sound.ctx.currentTime, 0.4);
      }
    }

    let m = 0;
    lightTick++;
    for (let s = 0; s < n; s++) {
      const i = order[s];
      const o = orbs[i];
      const radius = radiusOf(o);
      // inside the near-fade's zero zone the shader outputs nothing anyway —
      // skip the quad entirely instead of blending an invisible fullscreen one
      if (!o.veil && dists[i] < radius * radius * 0.49) continue;
      const off = m * FLOATS;
      m++;
      // v49 camera-relative: subtract the ship in float64 HERE — near things
      // land on the GPU at millimeter precision wherever we are in the 1,000km
      instData[off] = wp[i * 3] - cam.pos[0];
      instData[off + 1] = wp[i * 3 + 1] - cam.pos[1];
      instData[off + 2] = wp[i * 3 + 2] - cam.pos[2];
      instData[off + 3] = radius;
      instData[off + 4] = o.h1;
      instData[off + 5] = o.h2;
      instData[off + 6] = o.sat / 100;
      instData[off + 7] = o.fadeDur;
      instData[off + 8] = o.fadePhase;
      instData[off + 9] = o.spin;
      instData[off + 10] = o.variant;
      instData[off + 11] = o.halo;
      instData[off + 12] = o.seed;
      instData[off + 13] = o.eye ? 3 : o.heart ? 2 : o.portal ? 1 : 0;
      instData[off + 14] = o.veil ? 1 : 0;
      instData[off + 15] = o.quadScale || (o.veil ? 1.05 : o.dust ? 1.6 : 2.6);
      instData[off + 16] = o.kind;
      instData[off + 17] = o.p0;
      instData[off + 18] = o.p1;
      instData[off + 19] = o.act;
      // v63 the ball flag + key light: 0 = stays a disc (dust, veils, glyphs,
      // creatures, crowd clouds), 1 = a ball that is its own light (hearts,
      // eyes, beings), 2 = a ball lit by its nearest heart — re-picked every
      // 24 frames, staggered, so a fleet of thousands costs nothing per frame
      const lw = o.dust || o.veil || (o.kind >= 60 && o.kind !== 65) ? 0 : (o.heart || o.eye || o.kind === 65) ? 1 : 2;
      if (lw === 2 && (o.lx === undefined || (i + lightTick) % 24 === 0)) pickLight(o, i);
      instData[off + 20] = lw === 2 ? o.lx : 0;
      instData[off + 21] = lw === 2 ? o.ly : 1;
      instData[off + 22] = lw === 2 ? o.lz : 0;
      instData[off + 23] = lw;
    }

    // -- draw
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * resScale;
    const bw = (W * dpr) | 0, bh = (H * dpr) | 0;
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
    }
    setProj(W / H, projShiftY());
    const bb = camBasis();
    setView(bb);
    mulVP();

    gl.depthMask(true); // clear respects the mask — re-arm it every frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // v50: which societies are in range this frame (far→near for blending).
    // Beyond ~300km the detail is culled — fog has long eaten it, and the
    // node hearts carry the long-range read; uFade feathers the boundary so
    // a zero-haze tuner setting never sees a pop.
    const commDraw = [];
    if (commGL.inited) {
      for (let ci = 0; ci < COMMUNITIES.length; ci++) {
        const c = COMMUNITIES[ci].c;
        if (!c || !commGL.meshes[ci]) continue;
        const ox = c[0] - cam.pos[0], oy = c[1] - cam.pos[1], oz = c[2] - cam.pos[2];
        const d = Math.hypot(ox, oy, oz);
        const cut = 300000 + COMM_GEO[ci].shellR;
        if (d > cut) continue;
        commDraw.push({ ci, o: [ox, oy, oz], d, fade: clamp((cut - d) / 50000, 0, 1) });
      }
      commDraw.sort((a, b) => b.d - a.d);
    }

    // -- mesh passes first (v47 order): opaque bone + robots write depth,
    // then the society glass blends over them (no depth write), then the
    // orbs draw with depth TEST on but writes off — soft sprites clipped
    // behind solids, shining past their edges, glowing through the glass.
    const anyMesh = skull.ready || robotMesh.ready || cadenceMesh.ready || commDraw.length > 0;
    if (anyMesh) {
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      if (skull.ready) {
        gl.useProgram(skull.prog);
        gl.bindVertexArray(skull.vao);
        gl.uniformMatrix4fv(skull.U.uVP, false, vp);
        gl.uniform3fv(skull.U.uCamPos, cam.pos);
        gl.uniform1f(skull.U.uFog, cfg.haze / 18000);
        gl.uniform1f(skull.U.uAer, cfg.aerial / 120000);
        gl.uniform1f(skull.U.uTime, t);
        gl.drawElements(gl.TRIANGLES, skull.count, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
      }
      if (robotMesh.ready) {
        gl.useProgram(robotMesh.prog.p);
        gl.bindVertexArray(robotMesh.vao);
        gl.uniformMatrix4fv(robotMesh.prog.U.uVP, false, vp);
        gl.uniform3fv(robotMesh.prog.U.uCamPos, [0, 0, 0]); // v49: ship space
        gl.uniform1f(robotMesh.prog.U.uFog, cfg.haze / 18000);
        gl.uniform1f(robotMesh.prog.U.uAer, cfg.aerial / 120000);
        for (const rb of robotFleet.list) {
          const rdx = rb.pos[0] - cam.pos[0], rdy = rb.pos[1] - cam.pos[1], rdz = rb.pos[2] - cam.pos[2];
          if (rdx * rdx + rdy * rdy + rdz * rdz > 196000000) continue; // > 14 km: subpixel
          robotModel(rb, t);
          gl.uniformMatrix4fv(robotMesh.prog.U.uModel, false, robotMat);
          gl.drawElements(gl.TRIANGLES, robotMesh.count, gl.UNSIGNED_INT, 0);
        }
        gl.bindVertexArray(null);
      }
      if (cadenceMesh.ready && cadenceBots.length) {
        // the citizen castes (v51): same opaque pass, one VAO bind per kind
        gl.useProgram(cadenceMesh.prog.p);
        gl.uniformMatrix4fv(cadenceMesh.prog.U.uVP, false, vp);
        gl.uniform3fv(cadenceMesh.prog.U.uCamPos, [0, 0, 0]); // ship space
        gl.uniform1f(cadenceMesh.prog.U.uFog, cfg.haze / 18000);
        gl.uniform1f(cadenceMesh.prog.U.uAer, cfg.aerial / 120000);
        for (let kind = 0; kind < 6; kind++) {
          const mesh = cadenceMesh.meshes[kind];
          let bound = false;
          for (const rb of cadenceBots) {
            if (rb.kind !== kind) continue;
            const rdx = rb.pos[0] - cam.pos[0], rdy = rb.pos[1] - cam.pos[1], rdz = rb.pos[2] - cam.pos[2];
            if (rdx * rdx + rdy * rdy + rdz * rdz > 196000000) continue; // > 14 km: subpixel
            if (!bound) {
              gl.bindVertexArray(mesh.vao);
              bound = true;
            }
            robotModel(rb, t);
            gl.uniformMatrix4fv(cadenceMesh.prog.U.uModel, false, robotMat);
            gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
          }
        }
        gl.bindVertexArray(null);
      }
      if (bldgMesh.ready) seatTestBuildings(); // lazy + self-re-seating; no init-order coupling
      if (bldgMesh.ready && bldgMesh.list.length) {
        // the buildings (v58): opaque, own surface + light map, ship space
        gl.useProgram(bldgMesh.prog.p);
        gl.uniformMatrix4fv(bldgMesh.prog.U.uVP, false, vp);
        gl.uniform3fv(bldgMesh.prog.U.uCamPos, [0, 0, 0]);
        gl.uniform1f(bldgMesh.prog.U.uFog, cfg.haze / 18000);
        gl.uniform1f(bldgMesh.prog.U.uAer, cfg.aerial / 120000);
        gl.uniform1f(bldgMesh.prog.U.uMelt, cfg.melt);
        gl.uniform1f(bldgMesh.prog.U.uGlow, cfg.bldgGlow);
        gl.uniform1f(bldgMesh.prog.U.uFarBlur, cfg.bldgFarBlur);
        gl.uniform1f(bldgMesh.prog.U.uTime, t);
        // v59: one VAO + surf/light bind per KIND, then its instances
        for (const k of bldgMesh.kinds) {
          let bound = false;
          for (const b of bldgMesh.list) {
            if (b.kind !== k) continue;
            const rdx = b.pos[0] - cam.pos[0], rdy = b.pos[1] - cam.pos[1], rdz = b.pos[2] - cam.pos[2];
            const d2 = rdx * rdx + rdy * rdy + rdz * rdz;
            if (d2 > 9e10) continue; // > 300 km
            // v68.7 (James: "keep your eye on the frame rates"): 130 station instances
            // × ~45k tris each — skip any building that subtends under ~2 px
            if (b.h * b.h * 1.2e6 < d2) continue;
            if (!bound) {
              gl.bindVertexArray(k.vao);
              gl.activeTexture(gl.TEXTURE0 + 8); gl.bindTexture(gl.TEXTURE_2D, k.texSurf);
              gl.activeTexture(gl.TEXTURE0 + 9); gl.bindTexture(gl.TEXTURE_2D, k.texLight);
              gl.activeTexture(gl.TEXTURE0);
              gl.uniform1f(bldgMesh.prog.U.uLidMask, k.body === "sphere" ? 0 : 1); // v60
              // v70.2: the station shares "far window blur" (its own dial did nothing — its light
              // map is a few long lines; the twinkle was the seated towers) and follows past it
              gl.uniform1f(bldgMesh.prog.U.uFarFollow, k === bldgMesh.stationKind ? 1 : 0);
              gl.uniform1f(bldgMesh.prog.U.uLightMul, k === bldgMesh.stationKind ? cfg.stnLights : 1); // v73
              // v75: two dials — the station's (frozen at 0 by James) and the buildings'; only the
              // buildings' reaches the pane itself (uCoreBlur), the station keeps its halo-only path
              gl.uniform1f(bldgMesh.prog.U.uFarBlur, k === bldgMesh.stationKind ? cfg.stnFarBlur : cfg.bldgFarBlur);
              gl.uniform1f(bldgMesh.prog.U.uCoreBlur, k === bldgMesh.stationKind ? 0 : 1);
              bound = true;
            }
            bldgModel(b);
            gl.uniformMatrix4fv(bldgMesh.prog.U.uModel, false, bldgMat);
            gl.drawElements(gl.TRIANGLES, k.count, gl.UNSIGNED_INT, 0);
          }
        }
        gl.bindVertexArray(null);
      }
      if (commDraw.length) {
        // the Cadence cores: opaque metal + webbing write depth like the bone
        gl.useProgram(commGL.solid.p);
        gl.uniformMatrix4fv(commGL.solid.U.uVP, false, vp);
        gl.uniform1f(commGL.solid.U.uWear, cfg.wear);
        gl.uniform1f(commGL.solid.U.uFog, cfg.haze / 18000);
        gl.uniform1f(commGL.solid.U.uAer, cfg.aerial / 120000);
        gl.uniform1f(commGL.solid.U.uMelt, cfg.melt);
        gl.uniform1f(commGL.solid.U.uTime, t);
        gl.uniform1f(commGL.solid.U.uTempo, cfg.pulseTempo);
        gl.uniform1f(commGL.solid.U.uTrafSpeed, cfg.trafSpeed); // v72
        gl.uniform1f(commGL.solid.U.uTrafAmt, cfg.trafAmt);
        gl.uniform1f(commGL.solid.U.uFarBlur, cfg.stnFarBlur); // v75: the station's dial
        gl.uniform1f(commGL.solid.U.uStnLights, cfg.stnLights); // v73
        for (const cd of commDraw) {
          gl.uniform3fv(commGL.solid.U.uOrigin, cd.o);
          gl.uniform1f(commGL.solid.U.uFade, cd.fade);
          gl.bindVertexArray(commGL.meshes[cd.ci].solid.vao);
          gl.drawElements(gl.TRIANGLES, commGL.meshes[cd.ci].solid.count, gl.UNSIGNED_INT, 0);
          if (cd.ci === 0 && crustGL.ready) {
            // the Korrudan crust rides the capital's draw slot: same origin
            // (the capital IS the origin), same fade feather
            gl.bindVertexArray(crustGL.mesh.vao);
            gl.drawElements(gl.TRIANGLES, crustGL.mesh.count, gl.UNSIGNED_INT, 0);
          }
        }
        gl.bindVertexArray(null);
      }
      if (commDraw.length) {
        // society glass + bridges: blended over the metal, no depth write —
        // orbs and stars shine through the crystal
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        for (const pass of ["glass", "bridge"]) {
          const pr = commGL[pass];
          gl.useProgram(pr.p);
          gl.uniformMatrix4fv(pr.U.uVP, false, vp);
          gl.uniform1f(pr.U.uFog, cfg.haze / 18000);
          gl.uniform1f(pr.U.uAer, cfg.aerial / 120000);
          gl.uniform1f(pr.U.uMelt, cfg.melt);
          gl.uniform1f(pr.U.uTime, t);
          gl.uniform1f(pr.U.uTempo, cfg.pulseTempo);
          if (pass === "bridge") gl.uniform1f(pr.U.uWear, cfg.wear); // v67: the sheaths never got the dial in v66
          if (pass === "bridge") { gl.uniform1f(pr.U.uTrafSpeed, cfg.trafSpeed); gl.uniform1f(pr.U.uTrafAmt, cfg.trafAmt); gl.uniform1f(pr.U.uFarBlur, cfg.stnFarBlur); } // v72; v75: the station's dial
          if (pass === "glass") {
            gl.uniform1f(pr.U.uGlow, cfg.nodeGlow);
            gl.uniform1f(pr.U.uHomePass, 0);
            gl.uniform1f(pr.U.uHomeSharp, 1.0 - cfg.homeBlur * 0.75); // v62.2: the haze pass carries the rest
          }
          for (const cd of commDraw) {
            gl.uniform3fv(pr.U.uOrigin, cd.o);
            gl.uniform1f(pr.U.uFade, cd.fade);
            gl.bindVertexArray(commGL.meshes[cd.ci][pass].vao);
            gl.drawElements(gl.TRIANGLES, commGL.meshes[cd.ci][pass].count, gl.UNSIGNED_INT, 0);
          }
        }
        gl.bindVertexArray(null);
      }
      // v62.2 the home glow pass: homes alone → quarter-res → blur → (added after the orbs)
      homeGlow.ready = false;
      if (commDraw.length && glowHome.meshes.length && cfg.homeBlur > 0.001) {
        homeGlowEnsure(bw, bh);
        gl.bindFramebuffer(gl.FRAMEBUFFER, homeGlow.fbo);
        gl.viewport(0, 0, homeGlow.w, homeGlow.h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // depth only: the bone + the Cadence cores, so the haze stops at Korrudan
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.colorMask(false, false, false, false);
        if (skull.ready) {
          gl.useProgram(skull.prog);
          gl.bindVertexArray(skull.vao);
          gl.drawElements(gl.TRIANGLES, skull.count, gl.UNSIGNED_INT, 0);
        }
        gl.useProgram(commGL.solid.p);
        for (const cd of commDraw) {
          gl.uniform3fv(commGL.solid.U.uOrigin, cd.o);
          gl.uniform1f(commGL.solid.U.uFade, cd.fade);
          gl.bindVertexArray(commGL.meshes[cd.ci].solid.vao);
          gl.drawElements(gl.TRIANGLES, commGL.meshes[cd.ci].solid.count, gl.UNSIGNED_INT, 0);
        }
        gl.colorMask(true, true, true, true);
        // the homes, full strength, no depth write
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        const pr = commGL.glass;
        gl.useProgram(pr.p);
        gl.uniform1f(pr.U.uHomePass, 1);
        gl.uniform1f(pr.U.uHomeSharp, 1);
        for (const cd of commDraw) {
          gl.uniform3fv(pr.U.uOrigin, cd.o);
          gl.uniform1f(pr.U.uFade, cd.fade);
          gl.bindVertexArray(commGL.meshes[cd.ci].glass.vao);
          gl.drawElements(gl.TRIANGLES, commGL.meshes[cd.ci].glass.count, gl.UNSIGNED_INT, 0);
        }
        gl.uniform1f(pr.U.uHomePass, 0);
        gl.bindVertexArray(null);
        // blur: two separable passes, radius with the dial
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.useProgram(homeGlow.blur.p);
        const rad = 1.0 + cfg.homeBlur * 2.0;
        const src = { tex: homeGlow.tex, fbo: homeGlow.fbo };
        blurPass(src, homeGlow.pp[0], rad / homeGlow.w, 0);
        blurPass(homeGlow.pp[0], homeGlow.pp[1], 0, rad / homeGlow.h);
        blurPass(homeGlow.pp[1], homeGlow.pp[0], rad * 1.7 / homeGlow.w, 0);
        blurPass(homeGlow.pp[0], homeGlow.pp[1], 0, rad * 1.7 / homeGlow.h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, bw, bh);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        homeGlow.ready = true;
      }
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.useProgram(prog);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
    // -- the nebulae (v53): blended weather drawn behind the orb field —
    // orbs and dust render over the gas, which is what flying through a
    // luminous cloud full of drifting glass should look like
    drawNebulae(vp, bb);
    gl.useProgram(prog);
    if (texReady) {
      gl.uniformMatrix4fv(U.uVP, false, vp);
      gl.uniform3fv(U.uRight, bb.r);
      gl.uniform3fv(U.uUp, bb.u);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uFog, cfg.haze / 18000);
      gl.uniform1f(U.uGlow, cfg.glow);
      gl.uniform1f(U.uShellOp, cfg.shellOp);
      gl.uniform1f(U.uHeartOp, cfg.heartOp);
      gl.uniform1f(U.uSphere, cfg.sphere);
      gl.uniform1f(U.uBallRim, cfg.ballRim);
      gl.uniform1f(U.uFadeScale, cfg.fadeSpeed);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, m);
    }
    // v62.2 add the home haze over everything (premultiplied additive)
    if (homeGlow.ready) {
      const hadDepth = gl.isEnabled(gl.DEPTH_TEST);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(homeGlow.comp.p);
      gl.activeTexture(gl.TEXTURE9);
      gl.bindTexture(gl.TEXTURE_2D, homeGlow.pp[1].tex);
      gl.uniform1i(homeGlow.comp.U.uTex, 9);
      gl.uniform1f(homeGlow.comp.U.uAmt, 0.6 + cfg.homeBlur * 1.4); // v62.3: the 40% cut came back — with the bigger homes it read "washed out"
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (hadDepth) gl.enable(gl.DEPTH_TEST);
    }

    // home marker: when the heart is off-screen, glide a dot along the screen
    // edge in its direction
    {
      const rx = -cam.pos[0], ry = -cam.pos[1], rz = -cam.pos[2];
      const x = rx * bb.r[0] + ry * bb.r[1] + rz * bb.r[2];
      const y = rx * bb.u[0] + ry * bb.u[1] + rz * bb.u[2];
      const z = rx * bb.f[0] + ry * bb.f[1] + rz * bb.f[2];
      const tf = tanF();
      let show = false, nx = 0, ny = 0;
      if (z > 0) {
        nx = x / z / (tf * (W / H));
        ny = y / z / tf + projShiftY(); // v55.4: match the shifted frustum
        if (Math.abs(nx) > 0.92 || Math.abs(ny) > 0.92) {
          const m = 0.92 / Math.max(Math.abs(nx), Math.abs(ny));
          nx *= m;
          ny *= m;
          show = true;
        }
      } else {
        const len = Math.hypot(x, y) || 1;
        nx = (x / len) * 0.92;
        ny = (y / len) * 0.92;
        show = true;
      }
      marker.style.opacity = show ? "0.55" : "0";
      if (show) {
        marker.style.left = ((nx + 1) / 2) * W + "px";
        marker.style.top = ((1 - ny) / 2) * H + "px";
      }
    }

    // nav target (v38): the orange ring sits on the chosen item (edge-clamped
    // when off-screen, like the home dot) and the pointer arrow orbits the
    // reticle toward its bearing — swing the nose until they agree. Within
    // ~3° the ring locks solid and the arrow stands down.
    if (navTarget) {
      const rx = navTarget.pos[0] - cam.pos[0];
      const ry = navTarget.pos[1] - cam.pos[1];
      const rz = navTarget.pos[2] - cam.pos[2];
      const x = rx * bb.r[0] + ry * bb.r[1] + rz * bb.r[2];
      const y = rx * bb.u[0] + ry * bb.u[1] + rz * bb.u[2];
      const z = rx * bb.f[0] + ry * bb.f[1] + rz * bb.f[2];
      const dist = Math.hypot(x, y, z) || 1;
      const tf = tanF();
      let nx = 0, ny = 0, size = 40, on = false;
      if (z > 0) {
        nx = x / z / (tf * (W / H));
        ny = y / z / tf + projShiftY(); // v55.4: match the shifted frustum
        if (Math.abs(nx) <= 0.92 && Math.abs(ny) <= 0.92) {
          on = true;
          size = clamp(140000 / dist, 34, 120);
        }
      }
      if (!on) {
        // clamp to the screen edge in the target's direction
        const l2 = z > 0 ? Math.max(Math.abs(nx), Math.abs(ny)) : 0;
        if (z > 0 && l2 > 0) {
          const m = 0.92 / l2;
          nx *= m; ny *= m;
        } else {
          const len = Math.hypot(x, y) || 1;
          nx = (x / len) * 0.92;
          ny = (y / len) * 0.92;
        }
        size = 34;
      }
      navRing.style.width = navRing.style.height = size + "px";
      navRing.style.left = ((nx + 1) / 2) * W + "px";
      navRing.style.top = ((1 - ny) / 2) * H + "px";
      navScreen = { x: ((nx + 1) / 2) * W, y: ((1 - ny) / 2) * H, r: size / 2, on };
      const locked = z > 0 && z / dist > 0.99863; // within ~3°
      navRing.classList.toggle("locked", locked);
      navRing.classList.toggle("engaged", !!autoNav);
      navArrow.style.opacity = locked ? "0" : "1";
      // arming: hold the nose on it for 3 seconds and the ring brightens —
      // that's the window where a click inside the circle locks on
      if (locked && !autoNav) {
        if (!navAligned) navAligned = now;
        const armedNow = now - navAligned > 3000;
        if (armedNow !== navArmed) {
          navArmed = armedNow;
          navRing.classList.toggle("armed", navArmed);
        }
      } else if (!locked) {
        navAligned = 0;
        if (navArmed) {
          navArmed = false;
          navRing.classList.remove("armed");
        }
      }
      if (!locked) {
        // arrow angle: 0 = up, clockwise; ring it just outside the reticle
        const ang = Math.atan2(x, y) * 180 / Math.PI;
        const R = Math.min(Math.max(240, H * 0.32), 420) / 2 + 30;
        navArrow.style.transform =
          "translate(-50%, -50%) rotate(" + ang.toFixed(1) + "deg) translateY(" + (-R) + "px)";
      }
      if (now >= hudNext - 120) {
        navRingLabel.textContent =
          navTarget.name + " · " + (dist >= 1000 ? (dist / 1000).toFixed(1) + " km" : Math.round(dist) + " m");
      }
    }

    // hover cursor over exits
    if (!drag.on && mouse.x >= 0) {
      const hit = portalHit(mouse.x, mouse.y) >= 0;
      if (hit !== portalCursor) {
        portalCursor = hit;
        canvas.style.cursor = hit ? "pointer" : "";
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- tuner ---------------------------------------------------------------------------

  const tunerInputs = {};

  // v37: the floating "tune" pill is gone — TUNE and CTRL are ship controls
  // now, mounted on the deck (upper right of the console, per James)
  const toggle = hud.querySelector("#vs-tune");
  const ctrlBtn = hud.querySelector("#vs-ctrl");

  const panel = document.createElement("section");
  panel.id = "orb-tuner";
  panel.className = "orb-tuner";
  panel.hidden = true;
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Dimension tuning");
  // v63.7 the grab handle (James: the panel sat over what he was tuning):
  // drag the header anywhere; the position holds until the panel is closed
  // and opened again (it reopens at the right)
  const tHead = document.createElement("div");
  tHead.className = "tuner-head";
  const tGrip = document.createElement("span");
  tGrip.className = "grip";
  tGrip.textContent = "⋮⋮";
  const tTitle = document.createElement("span");
  tTitle.textContent = "configuration";
  const tHint = document.createElement("span");
  tHint.className = "hint";
  tHint.textContent = "drag here to move";
  tHead.append(tGrip, tTitle, tHint);
  panel.appendChild(tHead);
  let tDrag = null;
  tHead.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const r = panel.getBoundingClientRect();
    tDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    try { tHead.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  tHead.addEventListener("pointermove", (e) => {
    if (!tDrag) return;
    const r = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(window.innerWidth - r.width, e.clientX - tDrag.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - tDrag.dy));
    panel.style.left = x + "px";
    panel.style.top = y + "px";
    panel.style.right = "auto";
  });
  const tDrop = () => { tDrag = null; };
  tHead.addEventListener("pointerup", tDrop);
  tHead.addEventListener("pointercancel", tDrop);
  const resetPanelPos = () => { panel.style.left = ""; panel.style.top = ""; panel.style.right = ""; };

  function makeSliderEl(s) {
    const wrap = document.createElement("div");
    wrap.className = "tuner-mini";
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = s.label;
    const out = document.createElement("output");
    label.append(span, out);
    const input = document.createElement("input");
    input.type = "range";
    input.min = s.min;
    input.max = s.max;
    input.step = s.step;
    input.value = cfg[s.key];
    input.addEventListener("input", () => {
      cfg[s.key] = Number(input.value);
      out.value = String(cfg[s.key]);
      if (s.pool) assemble();
      saveCfg();
    });
    // v49 layout sliders re-seat the whole ring — heavy, so only on release
    if (s.layout) input.addEventListener("change", () => relayout());
    if (s.homes) input.addEventListener("change", () => uploadCommunities()); // v62: re-deal the homes only
    out.value = String(cfg[s.key]);
    wrap.append(label, input);
    tunerInputs[s.key] = { input, out };
    return wrap;
  }

  const groupWrap = document.createElement("div");
  groupWrap.className = "tuner-mini";
  const groupLabel = document.createElement("label");
  const groupSpan = document.createElement("span");
  groupSpan.textContent = "grouping";
  groupLabel.appendChild(groupSpan);
  const groupSel = document.createElement("select");
  for (const mode of ["scatter", "clusters", "strata", "river"]) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = mode;
    groupSel.appendChild(opt);
  }
  groupSel.value = cfg.grouping;
  groupSel.addEventListener("change", () => {
    cfg.grouping = groupSel.value;
    rebuildAll();
    saveCfg();
  });
  groupWrap.append(groupLabel, groupSel);

  // v48: stick mode select — drag-stick (press plants it) or center-stick
  // (always-on at screen center, Freelancer style)
  const stickWrap = document.createElement("div");
  stickWrap.className = "tuner-mini";
  const stickLabel = document.createElement("label");
  const stickSpan = document.createElement("span");
  stickSpan.textContent = "stick";
  stickLabel.appendChild(stickSpan);
  const stickSel = document.createElement("select");
  for (const [value, text] of [["center", "center-stick (hold + pull)"], ["drag", "drag-stick (press plants it)"]]) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    stickSel.appendChild(opt);
  }
  stickSel.value = cfg.stickMode;
  stickSel.addEventListener("change", () => {
    cfg.stickMode = stickSel.value;
    saveCfg();
  });
  stickWrap.append(stickLabel, stickSel);

  // related controls live together in labelled subpanels
  const sliderByKey = {};
  for (const s of SLIDERS) sliderByKey[s.key] = s;
  const GROUPS = [
    // ("the space" group removed v38 — the volume is static; v49 made it
    // 1,000×1,000×250km and it is STILL not a slider. Geography is law.)
    { label: "the field", keys: ["count", "dust", "grouping"] },
    { label: "the orbs", keys: ["sizeMin", "sizeMax", "shellOp", "glow"] },
    { label: "the air", keys: ["haze", "aerial", "melt", "fadeSpeed", "sphere", "ballRim"] },
    { label: "the stick", keys: ["stickMode", "stickDead", "stickReach", "stickGrab", "stickYawMax", "stickPitchMax", "rollMax", "stickCurve", "stickPull"] },
    // v49 configuration (James's tally: top speed + tank length are the key
    // ones) — physics/feel knobs, forever tunable. The ring dials freeze
    // with the geography when the layout finalizes.
    { label: "drive", keys: ["impTop", "rcsTop", "boostTop", "overTop", "h2oTank", "deuTank", "boostSpool", "overSpool"] },
    { label: "the ring", keys: ["colonyDist", "colonyVert", "colonyJitter"] },
    // v50: society dials — scale/height/jitter freeze with the geography;
    // node glow and pulse tempo are permanent feel knobs. Satellite DISTANCE
    // is deliberately absent: it derives from colonyDist/2 (the hexagram).
    { label: "the societies", keys: ["commScale", "commSat", "commVert", "commJitter", "nodeGlow", "pulseTempo", "trafSpeed", "trafAmt", "stnLights", "citizens", "bldgGlow", "bldgFarBlur", "stnFarBlur", "homeSeed", "heartOp", "homeBlur"] },
    // v61: the Saelyri crowds get their own group (James tunes these by feel)
    { label: "the crowds", keys: ["saeCap", "saeSat", "saeGroup", "saeKnot", "saeStream", "saeForm", "saeTide", "saeNotice"] },
    { label: "the nebulae", keys: ["nebGlow", "nebDensity", "nebScale"] },
  ];
  const groupsRow = document.createElement("div");
  groupsRow.className = "tuner-groups";
  panel.appendChild(groupsRow);
  for (const g of GROUPS) {
    const box = document.createElement("section");
    box.className = "tuner-group";
    const lab = document.createElement("p");
    lab.className = "tuner-group-label";
    lab.textContent = g.label;
    box.appendChild(lab);
    const grid = document.createElement("div");
    grid.className = "tuner-grid";
    box.appendChild(grid);
    for (const key of g.keys) {
      grid.appendChild(
        key === "grouping" ? groupWrap :
        key === "stickMode" ? stickWrap :
        makeSliderEl(sliderByKey[key]));
    }
    groupsRow.appendChild(box);
  }

  const actions = document.createElement("div");
  actions.className = "tuner-actions";
  const regenBtn = document.createElement("button");
  regenBtn.type = "button";
  regenBtn.textContent = "regenerate";
  regenBtn.addEventListener("click", () => rebuildAll());
  const homeBtn = document.createElement("button");
  homeBtn.type = "button";
  homeBtn.textContent = "return home";
  homeBtn.addEventListener("click", goHome);
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "reset all";
  resetBtn.addEventListener("click", () => {
    Object.assign(cfg, DEFAULTS);
    for (const k in tunerInputs) reflectTuner(k);
    groupSel.value = cfg.grouping;
    stickSel.value = cfg.stickMode;
    rebuildAll();
    goHome();
    saveCfg();
  });
  actions.append(regenBtn, homeBtn, resetBtn);
  panel.appendChild(actions);

  // ---- presets row ----
  const presetRow = document.createElement("div");
  presetRow.className = "tuner-presets";
  const presetSel = document.createElement("select");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "preset name…";
  nameInput.maxLength = 24;

  function refreshPresets() {
    presetSel.textContent = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— presets —";
    presetSel.appendChild(blank);
    for (const name of Object.keys(presetStore.presets).sort()) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = (presetStore.default === name ? "★ " : "") + name;
      presetSel.appendChild(opt);
    }
  }
  refreshPresets();

  function reflectAll() {
    for (const k in tunerInputs) reflectTuner(k);
    groupSel.value = cfg.grouping;
    stickSel.value = cfg.stickMode;
  }

  function presetButton(label, fn) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  // v63.7 the status line (James: "I don't know if it's saving or not"):
  // every preset button says what it did, and whether what was saved is
  // the preset that loads on start
  const status = document.createElement("div");
  status.className = "tuner-status";
  let statusT = 0;
  function say(msg) {
    status.textContent = msg;
    tHint.textContent = msg; // the header never scrolls out of view — the message shows there too
    clearTimeout(statusT);
    statusT = setTimeout(() => { status.textContent = ""; tHint.textContent = "drag here to move"; }, 9000);
  }
  const saveP = presetButton("save", () => {
    const name = nameInput.value.trim() || presetSel.value;
    if (!name) { say("type a name, or pick a preset to overwrite, then save"); return; }
    presetStore.presets[name] = cfgSnapshot();
    savePresetStore().then((ok) => {
      if (!ok) say(`"${name}" is saved in this browser only — the presets FILE was not written (server not reached), so a reload may load the old start preset`);
    });
    refreshPresets();
    presetSel.value = name;
    nameInput.value = "";
    saveP.textContent = "saved ✓";
    setTimeout(() => { saveP.textContent = "save"; }, 1600);
    say(presetStore.default === name
      ? `saved "${name}" — it is the start preset, so this is what loads next time`
      : `saved "${name}" — NOT the start preset${presetStore.default ? ` ("${presetStore.default}" loads next time)` : ""}; press "set as start" to load it on start`);
  });
  const applyP = presetButton("apply", () => {
    const p = presetStore.presets[presetSel.value];
    if (!p) { say("pick a preset first"); return; }
    applyPresetSnapshot(p);
    say(`applied "${presetSel.value}" — the dials show it now`);
  });
  // v54.3: one path for "apply" and the late start-preset arrival. A preset
  // without a pose means stock spawn (pre-clear, don't inherit); a preset
  // WITH one teleports there via goHome — motion zeroed, autopilot off.
  function applyPresetSnapshot(p) {
    const prevGrouping = cfg.grouping;
    cfg.spawnPose = null;
    Object.assign(cfg, p);
    sanitizeCfg();
    reflectAll();
    refreshSpawnUi();
    // v49: relayout instead of bare assemble — a preset may carry ring dials
    if (cfg.grouping !== prevGrouping) rebuildAll();
    else relayout();
    if (cfg.spawnPose) goHome();
    saveCfg();
  }
  lateApplyStart = applyPresetSnapshot;
  const startP = presetButton("set as start", () => {
    if (!presetStore.presets[presetSel.value]) { say("pick a preset first"); return; }
    presetStore.default = presetSel.value;
    savePresetStore();
    refreshPresets();
    presetSel.value = presetStore.default;
    say(`"${presetStore.default}" is the start preset now — it loads on every start`);
  });
  const deleteP = presetButton("delete", () => {
    if (!presetStore.presets[presetSel.value]) return;
    delete presetStore.presets[presetSel.value];
    if (presetStore.default === presetSel.value) presetStore.default = null;
    savePresetStore();
    refreshPresets();
  });
  const copyP = presetButton("copy settings", () => {
    navigator.clipboard?.writeText(JSON.stringify(cfgSnapshot(), null, 2)).then(() => {
      copyP.textContent = "copied ✓";
      setTimeout(() => { copyP.textContent = "copy settings"; }, 1400);
    }).catch(() => {});
  });
  onPresetStoreReplaced = refreshPresets; // presets.json arrived — repaint the picker

  presetRow.append(presetSel, nameInput, saveP, applyP, startP, deleteP, copyP);
  panel.appendChild(presetRow);
  panel.appendChild(status);

  // v54.3: the spawn row — capture the ship's position + facing as the
  // start condition. Part of the preset snapshot: capture, then save a
  // preset and set it as start. "stock spawn" clears back to the station
  // approach. H (return home) also honors the captured pose.
  const spawnRow = document.createElement("div");
  spawnRow.className = "tuner-presets tuner-spawn";
  const spawnStat = document.createElement("span");
  spawnStat.className = "spawn-stat";
  function refreshSpawnUi() {
    const sp = cfg.spawnPose;
    spawnStat.textContent = sp
      ? `spawn ${(sp.pos[0] / 1000).toFixed(1)} / ${(sp.pos[1] / 1000).toFixed(1)} / ${(sp.pos[2] / 1000).toFixed(1)} km`
      : "spawn: stock (station approach)";
  }
  const capP = presetButton("capture spawn", () => {
    cfg.spawnPose = { pos: cam.pos.slice(), f: cam.f.slice(), u: cam.u.slice() };
    saveCfg();
    refreshSpawnUi();
    capP.textContent = "captured ✓ — save a preset to keep it";
    setTimeout(() => { capP.textContent = "capture spawn"; }, 2600);
  });
  const stockP = presetButton("stock spawn", () => {
    cfg.spawnPose = null;
    saveCfg();
    refreshSpawnUi();
  });
  refreshSpawnUi();
  spawnRow.append(capP, stockP, spawnStat);
  panel.appendChild(spawnRow);

  document.body.appendChild(panel);

  // v58: VIEW BUILDING on the deck (James: "put the button directly onto the
  // control panel"). Dropdown of placed buildings + VIEW; the ship jumps to
  // the building's DICTATED vantage (his coordinates, per building), nose on
  // the tower's middle, all motion zeroed (same resets as H). The dropdown
  // remembers the last pick across reloads: reload → click → looking at it.
  const bldgSel = $v("vs-bldg");
  const viewBtn = $v("vs-view");
  const BLDG_PICK_KEY = "orb-bldg-pick";
  // v59 (James): SAVED VANTAGES — the + button saves the current pose by name into
  // its own section of the dropdown (below a rule); VIEW pops to it. localStorage
  // `orb-vantages` = [{name,pos,f,u}]. Shift-click + deletes the selected one.
  const VP_KEY = "orb-vantages";
  const VP_PFX = "vp:";
  const loadVps = () => { try { return JSON.parse(localStorage.getItem(VP_KEY) || "[]"); } catch (e) { return []; } };
  const saveVps = (v) => localStorage.setItem(VP_KEY, JSON.stringify(v));
  function refreshBldgUi() {
    // v69.1: the deck lists the five test towers + one entry for the station,
    // not every seated instance (James: "25 entries of station tower")
    const list = (bldgMesh.list || []).filter((b) => !b.name.startsWith("station ") );
    const vps = loadVps();
    const want = bldgSel.value || localStorage.getItem(BLDG_PICK_KEY) || "";
    bldgSel.innerHTML = "";
    if (!list.length && !vps.length) {
      const o = document.createElement("option");
      o.value = ""; o.textContent = "buildings…";
      bldgSel.appendChild(o);
      return;
    }
    list.forEach((b) => {
      const o = document.createElement("option");
      o.value = b.name; o.textContent = b.name;
      bldgSel.appendChild(o);
    });
    if (vps.length) {
      const sep = document.createElement("option");
      sep.disabled = true; sep.textContent = "──────────";
      bldgSel.appendChild(sep);
      vps.forEach((v) => {
        const o = document.createElement("option");
        o.value = VP_PFX + v.name; o.textContent = v.name;
        bldgSel.appendChild(o);
      });
    }
    if ([...bldgSel.options].some((o) => o.value === want)) bldgSel.value = want;
  }
  bldgSel.addEventListener("change", () => localStorage.setItem(BLDG_PICK_KEY, bldgSel.value));
  bldgSel.addEventListener("focus", refreshBldgUi);
  bldgSel.addEventListener("mousedown", refreshBldgUi);
  function stopAndPose(pos, f, u) {
    applySpawnPose({ pos, f, u });
    pendingYaw = 0; pendingPitch = 0; lookRateYaw = 0; lookRatePitch = 0;
    stickLive = false; rollVel = 0; rollShown = 0; leveling = false;
    thrust = 0; impulse = 0; rcsU = 0; rcsR = 0; overdrive = false; autoNav = null;
  }
  viewBtn.addEventListener("click", () => {
    refreshBldgUi();
    const sel = bldgSel.value;
    if (sel.startsWith(VP_PFX)) {
      const v = loadVps().find((x) => VP_PFX + x.name === sel);
      if (v) { stopAndPose(v.pos.slice(), v.f.slice(), v.u.slice()); localStorage.setItem(BLDG_PICK_KEY, sel); }
      viewBtn.blur();
      return;
    }
    const b = (bldgMesh.list || []).find((x) => x.name === sel) || (bldgMesh.list || [])[0];
    if (!b) return;
    const mid = [b.pos[0], b.pos[1] + b.h * 0.5, b.pos[2]];
    let pos;
    if (b.vantage) pos = b.vantage.slice();
    else {
      // no dictated seat yet: level with the middle, 2.6 heights back toward Korrudan
      let dir = [mid[0], 0, mid[2]]; const dl = Math.hypot(dir[0], dir[2]) || 1; dir = [dir[0] / dl, 0, dir[2] / dl];
      pos = [mid[0] - dir[0] * b.h * 2.6, mid[1], mid[2] - dir[2] * b.h * 2.6];
    }
    const f = [mid[0] - pos[0], mid[1] - pos[1], mid[2] - pos[2]];
    stopAndPose(pos, f, [0, 1, 0]);
    localStorage.setItem(BLDG_PICK_KEY, b.name);
    viewBtn.blur();
  });
  const vpAdd = $v("vs-vpadd");
  vpAdd.addEventListener("click", (ev) => {
    const vps = loadVps();
    if (ev.shiftKey) {
      const sel = bldgSel.value;
      if (!sel.startsWith(VP_PFX)) { vpAdd.blur(); return; }
      const name = sel.slice(VP_PFX.length);
      if (!confirm("delete vantage \"" + name + "\"?")) { vpAdd.blur(); return; }
      saveVps(vps.filter((x) => x.name !== name));
      bldgSel.value = ""; refreshBldgUi(); vpAdd.blur();
      return;
    }
    const name = (prompt("name this vantage", "") || "").trim();
    if (!name) { vpAdd.blur(); return; }
    const rec = { name, pos: cam.pos.slice(), f: cam.f.slice(), u: cam.u.slice() };
    const i = vps.findIndex((x) => x.name === name);
    if (i >= 0) vps[i] = rec; else vps.push(rec);
    saveVps(vps);
    refreshBldgUi();
    bldgSel.value = VP_PFX + name; localStorage.setItem(BLDG_PICK_KEY, bldgSel.value);
    vpAdd.blur();
  });
  // the list seats lazily after the mesh loads — refresh once it's there
  const bldgUiTimer = setInterval(() => {
    if (bldgMesh.list && bldgMesh.list.length) { refreshBldgUi(); clearInterval(bldgUiTimer); }
  }, 500);

  // ---- the controls card (v37) — CTRL on the deck opens the full reference
  const ctrlCard = document.createElement("section");
  ctrlCard.id = "orb-controls";
  ctrlCard.className = "orb-controls";
  ctrlCard.hidden = true;
  ctrlCard.setAttribute("role", "group");
  ctrlCard.setAttribute("aria-label", "Ship controls reference");
  ctrlCard.innerHTML = `
    <h3>flight</h3>
    <dl>
      <dt>drag / arrows</dt><dd>steer — grab near the center reticle, hold,
        and pull: the farther from center, the harder the turn, maxing out
        at "reach" px. Park the cursor to hold a turn; release to fly
        straight. TUNE → "the stick" adjusts the feel</dd>
      <dt>W / S</dt><dd>impulse — glide forward / back (200 m/s, free)</dd>
      <dt>shift</dt><dd>booster — hold to burn (1,200 m/s, drinks H2O, full in 5s)</dd>
      <dt>space</dt><dd>overdrive on / off (3,600 m/s, burns deuterium, slams in 3s — the crossing tier; TUNE → configuration retunes the whole ladder)</dd>
      <dt>S + shift</dt><dd>reverse booster</dd>
      <dt>X</dt><dd>all-stop — brake to a halt</dd>
      <dt>wheel / Z</dt><dd>magnifier — scroll to zoom the view up to 8×
        (steering slows to match, so the view never whips); Z eases back
        to 1×</dd>
      <dt>A / D</dt><dd>roll — a pure spin around the nose, like a pencil
        through the ship; it never changes where you're headed</dd>
      <dt>right-drag</dt><dd>head-look — hold the right button and drag to
        look off the nose while the ship keeps its line; let go and the
        view eases back</dd>
      <dt>R / F</dt><dd>attitude jets — rise / sink straight up or down
        along the pod's own up (120 m/s, free, coasts on release)</dd>
      <dt>Q / E</dt><dd>attitude jets — slide left / right</dd>
      <dt>caps lock</dt><dd>level off (tap it)</dd>
      <dt>H</dt><dd>return home</dd>
      <dt>N / T / C</dt><dd>nav · tune · controls panels on / off</dd>
      <dt>V</dt><dd>view building — jump to the picked building's vantage</dd>
      <dt>lock-on</dt><dd>hold your nose on the orange ring 3s until it
        brightens, then click inside it — the ship flies itself there and
        coasts in; touching any control releases it</dd>
      <dt>pale orbs</dt><dd>click one to drift onward</dd>
      <dt>the fleet</dt><dd>service robots run supplies between depots,
        inhabited orbs and the communities — what they visit, wakes</dd>
      <dt>the castes</dt><dd>six kinds of Cadence citizen work every hybrid
        town — chanters, wrights, archivists, ferries, wardens, gardeners</dd>
      <dt>the nebulae</dt><dd>five banks of glowing gas — one over home, four
        out in the gulf; fly into one, it thins around you</dd>
    </dl>
    <h3>console</h3>
    <dl>
      <dt>ATT</dt><dd>heading · pitch · bank</dd>
      <dt>POS</dt><dd>where you are, meters from the skull</dd>
      <dt>NAV</dt><dd>home · nearest reef · contacts · exits</dd>
      <dt>SYS</dt><dd>engine state (WEP / SHD not installed)</dd>
      <dt>FUEL</dt><dd>H2O + deuterium tanks — fly into blue water globes
        or hot green depots to refill</dd>
      <dt>NAV</dt><dd>places + resources — click one to ring it in orange,
        follow the arrow by the reticle</dd>
      <dt>TUNE</dt><dd>dimension tuning panel</dd>
    </dl>`;
  document.body.appendChild(ctrlCard);

  // ---- the NAV panel (v38): named places + resources, click to target ------
  // Clicking an entry rings the chosen item in orange on the glass and arms
  // the pointer arrow by the reticle; clicking it again clears. Resource rows
  // target the closest station at click time.
  const NAV_NAMES = ["Yth-Alune", "Sorrek Bloom", "Vhal-Imir"];
  const navPanel = document.createElement("section");
  navPanel.id = "orb-nav";
  navPanel.className = "orb-controls orb-nav";
  navPanel.hidden = true;
  navPanel.setAttribute("role", "group");
  navPanel.setAttribute("aria-label", "Navigation");
  navPanel.innerHTML = `
    <h3>the monument</h3>
    <button type="button" class="nav-row" data-nav="head">Korrudan <em>the Head · center of space</em></button>
    <h3>globe-thread communities · the ring</h3>
    <button type="button" class="nav-row" data-nav="c0">${NAV_NAMES[0]} <em>flagship reef · ~250 km out</em></button>
    <button type="button" class="nav-row" data-nav="c1">${NAV_NAMES[1]} <em>ring reef</em></button>
    <button type="button" class="nav-row" data-nav="c2">${NAV_NAMES[2]} <em>ring reef</em></button>
    <h3>the cooperative societies</h3>
    <button type="button" class="nav-row" data-nav="s0">${COMMUNITIES[0].name} <em>the capital · wrapped around Korrudan</em></button>
    <button type="button" class="nav-row" data-nav="s1">${COMMUNITIES[1].name} <em>satellite society · ~125 km</em></button>
    <button type="button" class="nav-row" data-nav="s2">${COMMUNITIES[2].name} <em>satellite society · ~125 km</em></button>
    <button type="button" class="nav-row" data-nav="s3">${COMMUNITIES[3].name} <em>satellite society · ~125 km</em></button>
    <h3>resources</h3>
    <button type="button" class="nav-row" data-nav="h2o">Water globes <em>nearest — refills H2O</em></button>
    <button type="button" class="nav-row" data-nav="deu">Deuterium depot <em>nearest — refills DEU</em></button>`;
  document.body.appendChild(navPanel);

  let navTarget = null; // { key, name, pos, standoff }
  // lock-on (v43): hold the nose in the ring 3s → it arms bright; click
  // inside it → the autopilot flies you there. Standoff = where the coast
  // should die: the skull's buffer edge, a colony's doorstep, or right on
  // top of a fuel station (you want the flyover).
  let navAligned = 0;      // when continuous alignment began (ms), 0 = not aligned
  let navArmed = false;    // aligned 3s+ — ring is bright, click will lock on
  let autoNav = null;      // { standoff } while the autopilot is flying
  let navScreen = { x: 0, y: 0, r: 0, on: false }; // ring in screen px, for the click test
  function navPick(key) {
    if (key === "head") return { key, name: "KORRUDAN", pos: [0, 0, 0], standoff: 8800 }; // v52: crust doorstep
    if (key[0] === "c") {
      const i = Number(key[1]);
      return { key, name: NAV_NAMES[i].toUpperCase(), pos: REEF_COLONIES[i].c, standoff: 700 };
    }
    if (key[0] === "s") {
      // park outside the node shell — the whole society in the window
      const i = Number(key[1]);
      return {
        key, name: COMMUNITIES[i].name.toUpperCase(), pos: COMMUNITIES[i].c,
        standoff: (COMM_GEO[i] ? COMM_GEO[i].shellR : 8000) * 1.35 + 1200,
      };
    }
    const arr = key === "h2o" ? STATIONS.h2o : STATIONS.deu;
    let best = arr[0], bd = Infinity;
    for (const c of arr) {
      const d = Math.hypot(c[0] - cam.pos[0], c[1] - cam.pos[1], c[2] - cam.pos[2]);
      if (d < bd) { bd = d; best = c; }
    }
    return { key, name: key === "h2o" ? "WATER GLOBE" : "DEU DEPOT", pos: best, standoff: 60 };
  }
  navPanel.addEventListener("click", (e) => {
    const row = e.target.closest(".nav-row");
    if (!row) return;
    const key = row.dataset.nav;
    navTarget = navTarget && navTarget.key === key ? null : navPick(key);
    autoNav = null;
    navAligned = 0;
    navArmed = false;
    navRing.classList.remove("armed");
    for (const r of navPanel.querySelectorAll(".nav-row")) {
      r.classList.toggle("active", !!navTarget && r.dataset.nav === navTarget.key);
    }
    navRing.style.opacity = navTarget ? "1" : "0";
    navArrow.style.opacity = navTarget ? "1" : "0";
    row.blur();
  });

  // the orange target ring + the pointer arrow by the reticle
  const navRing = document.createElement("div");
  navRing.id = "nav-ring";
  navRing.innerHTML = `<span id="nav-ring-label"></span>`;
  document.body.appendChild(navRing);
  const navRingLabel = navRing.querySelector("#nav-ring-label");
  const navArrow = document.createElement("div");
  navArrow.id = "nav-arrow";
  document.body.appendChild(navArrow);

  // v48 drag-stick instruments: the planted anchor + the saturation rim
  // (ice-blue like the reticle — the hand's color; orange stays nav's)
  const stickRim = document.createElement("div");
  stickRim.id = "stick-rim";
  const stickDot = document.createElement("div");
  stickDot.id = "stick-dot";
  // v54.2: the ghost grab ring — temporary instrumentation while James
  // tunes stickGrab; flip GRAB_RING in the frame loop to hide it. An SVG
  // circle, not a CSS border: dasharray gives real spaced dots (a 1px
  // dotted border reads as a hazy solid line — his report).
  const SVGNS = "http://www.w3.org/2000/svg";
  const stickGrabRing = document.createElementNS(SVGNS, "svg");
  stickGrabRing.id = "stick-grab";
  const stickGrabCirc = document.createElementNS(SVGNS, "circle");
  stickGrabRing.appendChild(stickGrabCirc);
  // v55.1: the magnifier readout — "MAG ×2.4" under the reticle while zoomed
  const magRead = document.createElement("div");
  magRead.id = "mag-read";
  document.body.append(stickRim, stickDot, stickGrabRing, magRead);
  const stickUi = { shown: false };
  const grabUi = { on: false, d: 0, x: 0, y: 0 };
  const magUi = { z: 1, on: false };

  // one panel at a time: NAV, TUNE and CTRL close each other
  const PANELS = {
    nav: { btn: hud.querySelector("#vs-navb"), el: navPanel },
    tune: { btn: toggle, el: panel },
    ctrl: { btn: ctrlBtn, el: ctrlCard },
  };
  function setOpen(which) {
    for (const k in PANELS) {
      const open = k === which ? PANELS[k].el.hidden : false;
      if (k === "tune" && open) resetPanelPos(); // v63.7: reopens at the right
      PANELS[k].el.hidden = !open;
      PANELS[k].btn.setAttribute("aria-expanded", String(open));
      PANELS[k].btn.classList.toggle("lit", open);
    }
  }
  for (const k in PANELS) {
    PANELS[k].btn.addEventListener("click", () => {
      setOpen(k);
      PANELS[k].btn.blur(); // focus must not eat the space bar (overdrive)
    });
  }
  // Press anywhere off an open panel dismisses it (house rule 2026-07-25).
  // pointerdown, not click: grabbing the stick/canvas drops the panel at once,
  // and a slider drag released off-panel never counts as "away". Pressing
  // another panel's button still opens that panel (its click fires after this).
  document.addEventListener("pointerdown", (e) => {
    let anyOpen = false;
    for (const k in PANELS) {
      const P = PANELS[k];
      if (P.el.hidden) continue;
      anyOpen = true;
      if (P.el.contains(e.target) || P.btn.contains(e.target)) return;
    }
    if (anyOpen) setOpen("none");
  });

  function reflectTuner(key) {
    const t = tunerInputs[key];
    if (!t) return;
    t.input.value = cfg[key];
    t.out.value = String(Math.round(cfg[key] * 100) / 100);
  }

  // ---- sound: the cave itself --------------------------------------------------------
  // Web Audio synthesis only — a sub-bass air rumble and sparse far-off tones
  // ringing against walls miles away. All through the shared sound control.

  const sound = { ctx: null, master: null, on: false, volume: 1, timer: 0 };

  function noiseBuffer(ctx, seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish
      data[i] = last * 3.5;
    }
    return buf;
  }

  function buildAudio() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    sound.ctx = ctx;
    sound.master = ctx.createGain();
    sound.master.gain.value = 0;
    sound.master.connect(ctx.destination);

    // deep rumble — air moving through a space too big to see
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = noiseBuffer(ctx, 4);
    rumbleSrc.loop = true;
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = "lowpass";
    rumbleLp.frequency.value = 90;
    rumbleLp.Q.value = 0.6;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.16;
    lfo.connect(lfoGain).connect(rumbleGain.gain);
    rumbleSrc.connect(rumbleLp).connect(rumbleGain).connect(sound.master);
    rumbleSrc.start();
    lfo.start();

    // faint mid air
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = noiseBuffer(ctx, 4);
    airSrc.loop = true;
    const airBp = ctx.createBiquadFilter();
    airBp.type = "bandpass";
    airBp.frequency.value = 340;
    airBp.Q.value = 0.8;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.02;
    airSrc.connect(airBp).connect(airGain).connect(sound.master);
    airSrc.start();

    // echo chain for the far-off tones
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.85;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const echoLp = ctx.createBiquadFilter();
    echoLp.type = "lowpass";
    echoLp.frequency.value = 1400;
    delay.connect(echoLp).connect(feedback).connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(wet).connect(sound.master);
    sound.pingBus = ctx.createGain();
    sound.pingBus.gain.value = 1;
    sound.pingBus.connect(sound.master);
    sound.pingBus.connect(delay);

    // ---- the engines (v34): three synthesized voices, all physics-driven
    // from the frame loop, on their own bus (the "engines" channel slider).
    // Thruster = cold-gas hiss (W/S dolly). Booster = a low rushing noise
    // that opens up with the shift burn. Overdrive = a different animal:
    // detuned saws pulsing at ~4.4 Hz — the pulse drive pulses. A reverse
    // burn (S) drops every pitch, so you HEAR the flip.
    const eng = { vol: 1 };
    sound.engine = eng;
    eng.bus = ctx.createGain();
    eng.bus.gain.value = (sound.engVol == null ? 1 : sound.engVol) ** 2;
    eng.bus.connect(sound.master);

    const white = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    {
      const d = white.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const loopSrc = (buf) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };

    // thruster hiss
    const thBp = ctx.createBiquadFilter();
    thBp.type = "bandpass";
    thBp.frequency.value = 620;
    thBp.Q.value = 0.9;
    eng.thGain = ctx.createGain();
    eng.thGain.gain.value = 0;
    loopSrc(white).connect(thBp).connect(eng.thGain).connect(eng.bus);

    // booster: a LOW RUSHING NOISE, nothing tonal (v36 — James: the sub saw +
    // gliding whine read as a police siren / hot-air blast). Two noise paths:
    // the rush, whose lowpass cutoff opens with the throttle, and a fixed
    // very-low bed that gives it weight without pitch.
    eng.boGroup = ctx.createGain();
    eng.boGroup.gain.value = 0;
    eng.boGroup.connect(eng.bus);
    eng.boRushLp = ctx.createBiquadFilter();
    eng.boRushLp.type = "lowpass";
    eng.boRushLp.frequency.value = 180;
    eng.boRushLp.Q.value = 0.5;
    const boNg = ctx.createGain();
    boNg.gain.value = 0.85;
    loopSrc(white).connect(eng.boRushLp).connect(boNg).connect(eng.boGroup);
    const boDeepLp = ctx.createBiquadFilter();
    boDeepLp.type = "lowpass";
    boDeepLp.frequency.value = 70;
    const boDg = ctx.createGain();
    boDg.gain.value = 0.6;
    loopSrc(white).connect(boDeepLp).connect(boDg).connect(eng.boGroup);

    // overdrive: the pulse drive — detuned saws, low-passed, breathing at 4.4 Hz
    eng.odGain = ctx.createGain();
    eng.odGain.gain.value = 0;
    eng.odGain.connect(eng.bus);
    const odCore = ctx.createGain();
    odCore.gain.value = 0.55;
    const odLp = ctx.createBiquadFilter();
    odLp.type = "lowpass";
    odLp.frequency.value = 430;
    eng.odSaw1 = ctx.createOscillator();
    eng.odSaw1.type = "sawtooth";
    eng.odSaw1.frequency.value = 66;
    eng.odSaw2 = ctx.createOscillator();
    eng.odSaw2.type = "sawtooth";
    eng.odSaw2.frequency.value = 66.5;
    eng.odSaw1.connect(odLp);
    eng.odSaw2.connect(odLp);
    odLp.connect(odCore).connect(eng.odGain);
    eng.odSaw1.start();
    eng.odSaw2.start();
    const odLfo = ctx.createOscillator();
    odLfo.frequency.value = 4.4;
    const odLfoG = ctx.createGain();
    odLfoG.gain.value = 0.4;
    odLfo.connect(odLfoG).connect(odCore.gain);
    odLfo.start();
    eng.white = white;

    // the city's hum (v47 as the Lantern's; retargeted v52): warm low sines
    // with a slow beat, silent until you drift near Korrudan's crust — gain
    // steered from the frame loop by distance to the bone
    sound.cityHum = ctx.createGain();
    sound.cityHum.gain.value = 0;
    sound.cityHum.connect(sound.master);
    for (const [f, g] of [[55, 0.45], [55.35, 0.45], [82.6, 0.25]]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(sound.cityHum);
      o.start();
    }
  }

  // colony comms (v47): within earshot of a globe-thread community, sparse
  // runs of high glassy blips ride the cave echo — the glyphs, audible
  function chatter() {
    if (!sound.on || !sound.ctx) return;
    let cd = Infinity;
    for (const col of REEF_COLONIES) {
      cd = Math.min(cd, Math.hypot(cam.pos[0] - col.c[0], cam.pos[1] - col.c[1], cam.pos[2] - col.c[2]));
    }
    if (cd < 2600 && sound.pingBus) {
      const ctx = sound.ctx;
      const t0 = ctx.currentTime;
      const prox = 1 - cd / 2600;
      const nBlips = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < nBlips; i++) {
        const f = pick([523, 659, 784, 880, 1047, 1175]) * (Math.random() < 0.25 ? 2 : 1);
        const ts = t0 + i * rand(0.07, 0.16);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, ts);
        env.gain.exponentialRampToValueAtTime(0.045 * prox + 0.006, ts + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, ts + rand(0.18, 0.35));
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(env);
        env.connect(sound.pingBus);
        o.start(ts);
        o.stop(ts + 0.5);
      }
    }
    sound.chatterTimer = window.setTimeout(chatter, rand(1400, 3800));
  }

  // physics → audio, called every frame while sound is on. All params move
  // through setTargetAtTime so the voices swell and die smoothly.
  function updateEngine(thrust, dollyActive) {
    const e = sound.engine;
    if (!e || !sound.ctx) return;
    const ct = sound.ctx.currentTime;
    const set = (p, v, tc) => p.setTargetAtTime(v, ct, tc);
    const mag = Math.abs(thrust);
    const rv = thrust < -1 ? 0.82 : 1; // reverse burn: everything detunes down
    set(e.thGain.gain, dollyActive ? 0.05 : 0, 0.12);
    // v49: the voices normalize to the configuration tops — same sound envelope
    // at full burn whatever the ladder is tuned to
    const bo = !overdrive && mag > 6 ? clamp(mag / cfg.boostTop, 0, 1) : 0;
    set(e.boGroup.gain, bo * 0.55, 0.22);
    // the rush brightens with speed but stays a rush — cutoff only, no pitch.
    // Reverse burn darkens it instead of dropping a tone.
    set(e.boRushLp.frequency, (180 + 300 * clamp(mag / cfg.boostTop, 0, 1)) * rv, 0.25);
    const od = overdrive ? clamp(mag / cfg.overTop, 0.25, 1) : 0;
    set(e.odGain.gain, od * 0.4, 0.3);
    set(e.odSaw1.frequency, (66 + 28 * clamp(mag / cfg.overTop, 0, 1)) * rv, 0.3);
    set(e.odSaw2.frequency, (66.5 + 28.2 * clamp(mag / cfg.overTop, 0, 1)) * rv, 0.3);
  }

  // v56: the greeting chord — a Saelyri that notices you answers in its
  // family's harmony: soft rolled sines through the cave echo. One chord per
  // being per long while; updateActors enforces global spacing too.
  const SAE_CHORDS = [
    [220.0, 277.18, 329.63, 493.88],  // cyan — A add9: open, bright
    [185.0, 220.0, 277.18, 415.30],   // violet — F#m11: veiled, inward
    [293.66, 369.99, 440.0, 554.37],  // rose — Dmaj7: warm lift
    [196.0, 246.94, 293.66, 329.63],  // amber — G6: settled, golden
    [164.81, 246.94, 293.66, 369.99], // green — Em9: cool, growing
  ];
  function saelyriChord(fam, prox) {
    if (!sound.on || !sound.ctx || !sound.pingBus) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const freqs = SAE_CHORDS[((fam % 5) + 5) % 5];
    freqs.forEach((f, i) => {
      const ts = t0 + i * 0.045; // a slow roll upward, never a stab
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, ts);
      env.gain.exponentialRampToValueAtTime(0.028 * prox + 0.008, ts + 0.14);
      env.gain.exponentialRampToValueAtTime(0.0001, ts + 2.6);
      for (const det of [-3, 3]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(env);
        o.start(ts);
        o.stop(ts + 2.8);
      }
      env.connect(sound.pingBus);
    });
  }

  // success chime: two quick rising notes through the cave's echo chain —
  // water sings high and glassy, deuterium lower and warmer
  function fuelChime(kind) {
    if (!sound.on || !sound.ctx || !sound.pingBus) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const freqs = kind === "h2o" ? [659, 880] : [440, 554];
    freqs.forEach((f, i) => {
      const env = ctx.createGain();
      const ts = t0 + i * 0.09;
      env.gain.setValueAtTime(0.0001, ts);
      env.gain.exponentialRampToValueAtTime(0.14, ts + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, ts + 0.7);
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(env);
        o.start(ts);
        o.stop(ts + 0.8);
      }
      env.connect(sound.pingBus);
    });
  }

  // one-shot: pulse drive ignition (a thump and a breath of noise) or
  // wind-down (a lower, softer fall) on the space-bar toggle
  function odThump(on) {
    if (!sound.on || !sound.ctx || !sound.engine) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    if (on) {
      o.frequency.setValueAtTime(130, t0);
      o.frequency.exponentialRampToValueAtTime(36, t0 + 0.35);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      const n = ctx.createBufferSource();
      n.buffer = sound.engine.white;
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.setValueAtTime(2400, t0);
      nf.frequency.exponentialRampToValueAtTime(160, t0 + 0.4);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.16, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      n.connect(nf).connect(ng).connect(sound.engine.bus);
      n.start(t0);
      n.stop(t0 + 0.5);
    } else {
      o.frequency.setValueAtTime(64, t0);
      o.frequency.exponentialRampToValueAtTime(26, t0 + 0.6);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    }
    o.connect(g).connect(sound.engine.bus);
    o.start(t0);
    o.stop(t0 + 0.8);
  }

  const PING_FREQS = [98, 110.5, 131, 147, 165, 196];

  function ping() {
    if (!sound.on || !sound.ctx) return;
    const ctx = sound.ctx;
    const t0 = ctx.currentTime;
    const f = pick(PING_FREQS) * (Math.random() < 0.3 ? 2 : 1);
    const dur = rand(3, 7);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(rand(0.05, 0.1), t0 + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(env);
      osc.start(t0);
      osc.stop(t0 + dur + 0.1);
    }
    env.connect(sound.pingBus);
    sound.timer = window.setTimeout(ping, rand(6000, 16000));
  }

  function applyVolume() {
    if (!sound.master) return;
    const v = sound.on ? sound.volume * sound.volume : 0;
    sound.master.gain.setTargetAtTime(v, sound.ctx.currentTime, 0.4);
  }

  if (window.ElasticSoundControl) {
    window.ElasticSoundControl.attach({
      start: () => {
        if (!sound.ctx) buildAudio();
        sound.on = true;
        applyVolume();
        return sound.ctx
          .resume()
          .then(() => {
            if (sound.ctx.state !== "running") throw new Error("audio blocked");
            window.clearTimeout(sound.timer);
            sound.timer = window.setTimeout(ping, rand(2000, 6000));
            window.clearTimeout(sound.chatterTimer);
            sound.chatterTimer = window.setTimeout(chatter, rand(1500, 4000));
          })
          .catch((err) => {
            sound.on = false;
            applyVolume();
            throw err;
          });
      },
      stop: () => {
        sound.on = false;
        window.clearTimeout(sound.timer);
        window.clearTimeout(sound.chatterTimer);
        applyVolume();
        if (sound.ctx) sound.ctx.suspend().catch(() => {});
      },
      setVolume: (v) => {
        sound.volume = v;
        applyVolume();
      },
      // the engines get their own slider under the main one (the arachno-wars
      // second-channel pattern) — cave ambience vs. engine roar, tuned by ear
      channels: [
        {
          label: "engines",
          value: 1,
          setVolume: (v) => {
            sound.engVol = v;
            if (sound.engine && sound.ctx) {
              sound.engine.bus.gain.setTargetAtTime(v * v, sound.ctx.currentTime, 0.1);
            }
          },
        },
      ],
    });
  }
})();
