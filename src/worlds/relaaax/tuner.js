// Relaaax — the control surface, as a standalone module. Builds the whole
// two-tab panel (VISUAL | AUDIO) into any container and talks to the field
// only through a bus, so the same UI runs embedded in the world page AND in
// the detached controller window (tuner.html) over BroadcastChannel.
//
//   RelaaaxTuner.mount({ container, bus, embedded });
//   bus: { send(cmd), onSnapshot(cb), onBeat(cb), requestSnapshot() }
//
// The tuner owns no state — every change is a command to the host
// (world.js/music.js), every render comes from a host snapshot.
(function () {
  "use strict";

  const FIELD = globalThis.RelaaaxField;
  const DSP = globalThis.RelaaaxMusicDSP;

  const SPEED_MAX = 8;
  const BLUR_MAX = 300;
  const TILE_MAX = 300;

  const pct = {
    toSlider: (v) => Math.round(v * 1000),
    fromSlider: (p) => p / 1000,
    format: (v) => `${Math.round(v * 100)}%`,
  };
  function px(max, decimals) {
    return {
      toSlider: (v) => Math.round((v / max) * 1000),
      fromSlider: (p) => (p / 1000) * max,
      format: (v) => `${v.toFixed(decimals || 0)}px`,
    };
  }
  function times(max) {
    return {
      toSlider: (v) => Math.round((v / max) * 1000),
      fromSlider: (p) => (p / 1000) * max,
      format: (v) => `×${v.toFixed(2)}`,
    };
  }
  const ms = (v) => `${Math.round(v * 1000)}ms`;

  // --- control specs ---------------------------------------------------------

  const FIELD_SLIDERS = {
    speed: {
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / SPEED_MAX)),
      fromSlider: (p) => SPEED_MAX * (p / 1000) * (p / 1000),
      format: (v) => (v === 0 ? "stopped" : `×${v.toFixed(2)}`),
    },
    tileSize: {
      toSlider: (v) => Math.round(1000 * Math.sqrt(v / TILE_MAX)),
      fromSlider: (p) => TILE_MAX * (p / 1000) * (p / 1000),
      format: (v) => `${v < 10 ? v.toFixed(1) : v.toFixed(0)}px`,
    },
    blur: {
      toSlider: (v) => Math.round(1000 * Math.cbrt(v / BLUR_MAX)),
      fromSlider: (p) => BLUR_MAX * Math.pow(p / 1000, 3),
      format: (v) => (v < 0.005 ? "off" : `${v < 10 ? v.toFixed(2) : v.toFixed(0)}px`),
    },
    holdScale: times(3),
    desync: pct,
    ease: pct,
    border: px(10, 1),
    spread: times(2),
    twist: pct,
    rows: { toSlider: (v) => v, fromSlider: (p) => p, format: String, min: 1, max: 24 },
    cols: { toSlider: (v) => v, fromSlider: (p) => p, format: String, min: 1, max: 24 },
    marginTop: px(200), marginRight: px(200), marginBottom: px(200), marginLeft: px(200),
    gapX: px(200), gapY: px(200), inset: px(100),
    radiusTile: {
      toSlider: (v) => Math.round((v / 0.5) * 1000),
      fromSlider: (p) => (p / 1000) * 0.5,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    radiusRow: px(60), radiusOuter: px(120),
    hueShift: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => `${Math.round(v * 360)}°` },
    merge: pct, rotate: pct, spin: pct, displace: pct, sizePulse: pct, counter: pct,
    nest: { toSlider: (v) => v, fromSlider: (p) => p, format: String, min: 0, max: 2 },
    fxTrails: pct, fxZoom: pct, fxZoomRot: pct, fxPixel: pct, fxRgb: pct, fxWarp: pct,
    fxSlit: pct, fxKaleido: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => (v <= 0 ? "off" : `${2 + Math.round(v * 10)} way`) },
    fxBloom: pct, fxGrain: pct, fxCrt: pct, fxShutter: pct, fxIris: pct,
    sceneMix: pct, sceneTiles: pct,
    sceneSpeed: times(2),
    sceneScale: pct, sceneDrive: pct, sceneWarp: pct,
    sceneHue: { toSlider: (v) => Math.round(v * 1000), fromSlider: (p) => p / 1000, format: (v) => `${Math.round(v * 360)}°` },
    // 0, 1, 2, 4, 8, 16 beats per flash cycle — snapped, not continuous.
    syncBeats: {
      toSlider: (v) => [0, 1, 2, 4, 8, 16].indexOf(v) < 0 ? 0 : [0, 1, 2, 4, 8, 16].indexOf(v),
      fromSlider: (p) => [0, 1, 2, 4, 8, 16][Math.max(0, Math.min(5, Math.round(p)))],
      format: (v) => (v === 0 ? "free" : `${v} beat${v === 1 ? "" : "s"}`),
      min: 0, max: 5,
    },
  };

  const MUSIC_SLIDERS = {
    master: { toSlider: (v) => Math.round((v / 2) * 1000), fromSlider: (p) => (p / 1000) * 2, format: (v) => (v === 0 ? "off" : `×${v.toFixed(2)}`) },
    attack: { toSlider: (v) => Math.round(1000 * Math.sqrt(v / 0.3)), fromSlider: (p) => 0.3 * (p / 1000) * (p / 1000), format: ms },
    release: { toSlider: (v) => Math.round((v / 1.5) * 1000), fromSlider: (p) => (p / 1000) * 1.5, format: ms },
    beatSense: pct,
    beatDecay: { toSlider: (v) => Math.round(1000 * Math.sqrt(Math.max(0, v - 0.02) / 1.48)), fromSlider: (p) => 0.02 + 1.48 * (p / 1000) * (p / 1000), format: ms },
    accentDecay: { toSlider: (v) => Math.round(1000 * Math.sqrt(Math.max(0, v - 0.02) / 0.58)), fromSlider: (p) => 0.02 + 0.58 * (p / 1000) * (p / 1000), format: ms },
  };

  const SRC_LABELS = {
    off: "—", bass: "bass", lowmid: "low mid", mid: "mid",
    high: "high", level: "level", beat: "beat",
    // Grid-locked (no detection lag) — see music-dsp.js CLOCK_SOURCES.
    pulse: "▸ pulse", bar: "▸ bar", phrase: "▸ phrase", swing: "▸ swing",
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function mount(opts) {
    const container = opts.container;
    const bus = opts.bus;
    const embedded = !!opts.embedded;
    let snap = null;
    const reflectors = [];

    function send(cmd) { bus.send(cmd); }
    function onReflect(fn) { reflectors.push(fn); }

    // Skip writing a control the user is actively holding.
    function safeSet(input, value) {
      if (document.activeElement === input) return;
      input.value = value;
    }

    // --- shared builders ----------------------------------------------------

    function slider(scope, key, label, spec, opts2) {
      const o = opts2 || {};
      const wrap = el("div", o.wide ? "tuner-speed" : "tuner-mini");
      const lab = el("label", null, label);
      const input = el("input");
      input.type = "range";
      input.min = String(spec.min !== undefined ? spec.min : 0);
      input.max = String(spec.max !== undefined ? spec.max : 1000);
      input.step = "1";
      if (o.title) input.title = o.title + " — double-click resets";
      const out = el("output");
      wrap.append(lab, ...(o.extra ? [o.extra] : []), input, out);
      if (o.desc) wrap.appendChild(el("p", "tuner-desc", o.desc));
      input.addEventListener("input", () => {
        const v = spec.fromSlider(Number(input.value));
        out.textContent = spec.format(v);
        send({ scope, type: "set", key, value: v });
      });
      input.addEventListener("dblclick", () => send({ scope, type: "reset", key }));
      onReflect(() => {
        const source = scope === "field" ? snap.config : snap.music.settings;
        const v = source[key];
        if (v === undefined) return;
        safeSet(input, spec.toSlider(v));
        out.textContent = spec.format(v);
      });
      return wrap;
    }

    function select(scope, key, label, options, opts2) {
      const o = opts2 || {};
      const wrap = el("div", "tuner-mini tuner-mini--select");
      wrap.appendChild(el("label", "tuner-label", label));
      const sel = el("select");
      options.forEach(([value, text]) => {
        const option = el("option", null, text);
        option.value = value;
        sel.appendChild(option);
      });
      if (o.title) sel.title = o.title;
      wrap.appendChild(sel);
      if (o.desc) wrap.appendChild(el("p", "tuner-desc", o.desc));
      sel.addEventListener("change", () => send({ scope, type: "set", key, value: sel.value }));
      onReflect(() => {
        const source = scope === "field" ? snap.config : snap.music.settings;
        if (source[key] !== undefined) safeSet(sel, String(source[key]));
      });
      return wrap;
    }

    function section(parent, title) {
      parent.appendChild(el("p", "tuner-section", title));
    }

    function minis(parent, children) {
      const row = el("div", "tuner-minis");
      children.forEach((c) => row.appendChild(c));
      parent.appendChild(row);
      return row;
    }

    function button(label, title, onClick, cls) {
      const b = el("button", cls || "tuner-btn", label);
      b.type = "button";
      if (title) b.title = title;
      b.addEventListener("click", onClick);
      return b;
    }

    // --- root + tabs --------------------------------------------------------

    container.textContent = "";
    const header = el("div", "tuner-tabs");
    const tabVisual = button("visual", "The field: structure, patterns, geometry, colors, FX rack", () => setTab("visual"), "tuner-tab");
    const tabAudio = button("audio", "The music: player, DJ sets, reactivity, mod matrix", () => setTab("audio"), "tuner-tab");
    header.append(tabVisual, tabAudio);
    if (embedded) {
      header.appendChild(button("detach ⧉", "Pop the controls out into their own window — drag it to another screen", () => {
        window.open("./tuner.html", "relaaax-tuner", "width=1060,height=920");
      }, "tuner-btn tuner-detach"));
    }
    container.appendChild(header);

    const panes = {
      visual: el("div", "tuner-pane"),
      audio: el("div", "tuner-pane"),
    };
    container.append(panes.visual, panes.audio);

    function setTab(name) {
      panes.visual.hidden = name !== "visual";
      panes.audio.hidden = name !== "audio";
      tabVisual.classList.toggle("tuner-tab--on", name === "visual");
      tabAudio.classList.toggle("tuner-tab--on", name === "audio");
      try { localStorage.setItem("relaaax-tuner-tab", name); } catch (err) { /* fine */ }
    }

    // ========================================================================
    // VISUAL tab
    // ========================================================================
    const V = panes.visual;

    // Field presets.
    {
      const row = el("div", "tuner-pattern");
      row.appendChild(el("label", "tuner-label", "presets"));
      const sel = el("select");
      row.appendChild(sel);
      const save = button("save", "Save the current settings as a named preset", () => {
        const name = (prompt("Name this preset:") || "").trim();
        if (name) send({ scope: "field", type: "presetSave", name });
      });
      const del = button("delete", "Delete the selected saved preset (built-ins are protected)", () => {
        const v = sel.value;
        if (v.startsWith("u:") && confirm(`Delete preset "${v.slice(2)}"?`)) {
          send({ scope: "field", type: "presetDelete", name: v.slice(2) });
        }
      });
      del.disabled = true;
      const dice = button("🎲", "Roll the dice — randomize every visual parameter at once", () => send({ scope: "field", type: "randomize" }), "tuner-btn tuner-dice");
      row.append(save, del, dice);
      row.appendChild(el("p", "tuner-desc", "built-ins are permanent; saved ones live in this browser until one earns a spot on the permanent list. the page always opens on pork 2002 — “last session” brings back wherever the sliders were when you left. 🎲 rolls a completely random look — keep rolling, save the keepers"));
      sel.addEventListener("change", () => {
        del.disabled = !sel.value.startsWith("u:");
        if (sel.value) send({ scope: "field", type: "preset", value: sel.value });
      });
      // Options rebuild only when the preset LIST changes — snapshots stream
      // continuously during playback and a rebuild closes an open dropdown.
      let listSig = "";
      onReflect(() => {
        const sig = JSON.stringify([snap.fieldPresets.factory.map((p) => p.id), snap.fieldPresets.user, !!snap.fieldPresets.hasLast]);
        if (sig !== listSig) {
          listSig = sig;
          sel.textContent = "";
          const custom = el("option", null, "— custom —");
          custom.value = "";
          sel.appendChild(custom);
          const fg = el("optgroup");
          fg.label = "built in";
          snap.fieldPresets.factory.forEach((p) => {
            const option = el("option", null, p.label);
            option.value = `f:${p.id}`;
            fg.appendChild(option);
          });
          sel.appendChild(fg);
          if (snap.fieldPresets.user.length) {
            const ug = el("optgroup");
            ug.label = "yours";
            snap.fieldPresets.user.forEach((name) => {
              const option = el("option", null, name);
              option.value = `u:${name}`;
              ug.appendChild(option);
            });
            sel.appendChild(ug);
          }
          if (snap.fieldPresets.hasLast) {
            const lg = el("optgroup");
            lg.label = "auto";
            const option = el("option", null, "last session");
            option.value = "last";
            lg.appendChild(option);
            sel.appendChild(lg);
          }
        }
        safeSet(sel, snap.fieldPresets.selected || "");
        del.disabled = !(snap.fieldPresets.selected || "").startsWith("u:");
      });
      V.appendChild(row);
    }

    V.appendChild(slider("field", "speed", "speed", FIELD_SLIDERS.speed, { wide: true, title: "Global tempo, stopped to ×8" }));
    V.appendChild(slider("field", "tileSize", "size", FIELD_SLIDERS.tileSize, { wide: true, title: "The little squares themselves — grid spacing stays put, so big tiles close the gaps, butt up, overlap, then chaos" }));
    V.appendChild(slider("field", "blur", "blur", FIELD_SLIDERS.blur, { wide: true, title: "Gaussian blur over the whole field" }));

    minis(V, [
      slider("field", "holdScale", "holds", FIELD_SLIDERS.holdScale, { desc: "how long each pulse rests at the ends of its fade — 0 removes the rests entirely" }),
      slider("field", "desync", "desync", FIELD_SLIDERS.desync, { desc: "phase scatter between tiles — 0% pulses in unison like 2002" }),
      slider("field", "ease", "ease", FIELD_SLIDERS.ease, { desc: "fade shape — hard GIF triangle to smooth breathing (triangle waveform only)" }),
      slider("field", "border", "border", FIELD_SLIDERS.border, { desc: "tile border width, in 2002 pixels — 0 dissolves the frames" }),
    ]);

    section(V, "structure");
    minis(V, [
      select("field", "layout", "layout", FIELD.LAYOUTS.map((l) => [l, l]), { desc: "how tiles arrange: the classic grid with row boxes, brick/hex staggers, radial rings, or a phyllotaxis spiral" }),
      select("field", "shape", "shape", FIELD.SHAPES.map((s) => [s, s]), { desc: "tile silhouette — squares through stars, bars, and rings" }),
      select("field", "waveform", "wave", FIELD.WAVEFORMS.map((w) => [w, w]), { desc: "the oscillator itself: decoded GIF triangle, rounded sine, hard square strobe, or rising saw" }),
      select("field", "palette", "palette", Object.keys(FIELD.PALETTES).map((p) => [p, p]), { desc: "duo uses the two color pickers below; named palettes are multi-stop ramps" }),
    ]);
    minis(V, [
      slider("field", "hueShift", "hue", FIELD_SLIDERS.hueShift, { desc: "rotates the whole palette around the color wheel" }),
      slider("field", "merge", "merge", FIELD_SLIDERS.merge, { desc: "Mondrian merges — a share of tiles fuse into 2×2 slabs (grid, brick, hex)" }),
      slider("field", "rotate", "rotate", FIELD_SLIDERS.rotate, { desc: "static per-tile angle scatter" }),
      slider("field", "spin", "spin", FIELD_SLIDERS.spin, { desc: "continuous rotation of every tile" }),
    ]);
    minis(V, [
      slider("field", "displace", "displace", FIELD_SLIDERS.displace, { desc: "tiles drift off their lattice — beat-kick it in the matrix and the grid flinches" }),
      slider("field", "sizePulse", "pulse", FIELD_SLIDERS.sizePulse, { desc: "tile scale rides its own oscillator — growth waves roll through the field" }),
      slider("field", "counter", "counter", FIELD_SLIDERS.counter, { desc: "a phase-inverted twin layer, difference-blended — interference" }),
      slider("field", "nest", "nest", FIELD_SLIDERS.nest, { desc: "tiles inside tiles, counter-phased — 0, 1, or 2 levels deep" }),
    ]);

    section(V, "scene");
    {
      const sceneIds = (globalThis.RelaaaxScenes && globalThis.RelaaaxScenes.LIST) ||
        ["none", "ink", "ridge", "flame", "nebula"];
      const genomeNames = ((globalThis.RelaaaxScenes && globalThis.RelaaaxScenes.GENOMES) || []).map((g) => [g.name, g.name]);
      minis(V, [
        select("field", "scene", "scene", sceneIds.map((s) => [s, s]), { desc: "a GPU backdrop painted UNDER the tiles — ink turbulence, neon ridge flow, fractal flame, star tunnel. none = the classic field" }),
        select("field", "scenePalette", "scene palette", Object.keys(FIELD.PALETTES).concat("genome").map((p) => [p, p]), { desc: "the scene's own color ramp, separate from the tiles' — duo borrows the two pickers, genome uses the flame's own bred colors" }),
        slider("field", "sceneMix", "scene mix", FIELD_SLIDERS.sceneMix, { desc: "scene brightness — also fades the breathing boxes out as the scene takes over the background" }),
        slider("field", "sceneTiles", "tiles over", FIELD_SLIDERS.sceneTiles, { desc: "tile-layer opacity over the scene — 0 is scene only" }),
      ]);
      minis(V, [
        slider("field", "sceneSpeed", "scene speed", FIELD_SLIDERS.sceneSpeed, { desc: "the scene's own clock — independent of the field's tempo" }),
        slider("field", "sceneScale", "scene scale", FIELD_SLIDERS.sceneScale, { desc: "zoom / spread of the scene structure" }),
        slider("field", "sceneDrive", "scene drive", FIELD_SLIDERS.sceneDrive, { desc: "energy — glow, density, agitation; a favorite matrix target" }),
        slider("field", "sceneWarp", "scene warp", FIELD_SLIDERS.sceneWarp, { desc: "each scene's character knob: ink warp depth, ridge churn, flame genome bend, tunnel swirl" }),
      ]);
      minis(V, [
        slider("field", "sceneHue", "scene hue", FIELD_SLIDERS.sceneHue, { desc: "rotates the scene palette around the wheel" }),
      ].concat(genomeNames.length ? [
        select("field", "sceneGenome", "flame genome", genomeNames, { desc: "which bred flame the flame scene plays — your 20 picks from the farm. set scene palette to \"genome\" for the colors they were bred with" }),
      ] : []));
    }

    section(V, "beat lock");
    {
      const accents = (DSP.ACCENT_NAMES || ["four"]).map((a) => [a, a]);
      minis(V, [
        select("field", "accent", "accent", accents, { desc: "which sixteenths the grid-locked pulse fires on — wire pulse→anything in the audio tab's matrix. only active while a track with a known tempo plays" }),
        slider("field", "syncBeats", "sync", FIELD_SLIDERS.syncBeats, { desc: "lock one flash cycle to an exact number of beats — free lets the field run at its own speed, 1/2/4/8 make it breathe with the track" }),
      ]);
    }

    section(V, "pattern");
    {
      const row = el("div", "tuner-pattern");
      const prev = button("◀", "Previous pattern", () => send({ scope: "field", type: "patternStep", dir: -1 }), "tuner-step");
      const sel = el("select");
      FIELD.PATTERNS.forEach((p) => {
        const option = el("option", null, p.label);
        option.value = p.id;
        sel.appendChild(option);
      });
      const next = button("▶", "Next pattern", () => send({ scope: "field", type: "patternStep", dir: 1 }), "tuner-step");
      const hint = el("p", "tuner-desc");
      row.append(prev, sel, next, hint);
      sel.addEventListener("change", () => send({ scope: "field", type: "set", key: "pattern", value: sel.value }));
      onReflect(() => {
        safeSet(sel, snap.config.pattern);
        const pat = FIELD.PATTERNS.find((p) => p.id === snap.config.pattern) || FIELD.PATTERNS[0];
        hint.textContent = pat.hint;
      });
      V.appendChild(row);
    }
    minis(V, [
      slider("field", "spread", "spread", FIELD_SLIDERS.spread, { desc: "how far the pattern pulls tiles apart in time — 0 collapses any pattern to unison" }),
      slider("field", "twist", "twist", FIELD_SLIDERS.twist, { desc: "each pattern's own variant knob — see the pattern note above" }),
    ]);

    section(V, "grid");
    {
      const fillWrap = el("label", "tuner-check");
      const fillCheck = el("input");
      fillCheck.type = "checkbox";
      fillWrap.append(fillCheck, document.createTextNode("fill"));
      fillWrap.title = "Stretch the whole composition to fill the frame edge to edge";
      fillCheck.addEventListener("change", () => send({ scope: "field", type: "set", key: "fill", value: fillCheck.checked }));
      onReflect(() => { fillCheck.checked = !!snap.config.fill; });
      minis(V, [
        slider("field", "rows", "rows", FIELD_SLIDERS.rows, { desc: "tile rows — 3 is the 2002 composition" }),
        slider("field", "cols", "cols", FIELD_SLIDERS.cols, { desc: "tiles per row — 4 is the 2002 composition" }),
        fillWrap,
      ]);
    }

    section(V, "margins");
    {
      const linkWrap = el("div", "tuner-mini tuner-mini--select");
      linkWrap.appendChild(el("label", "tuner-label", "link"));
      const linkSel = el("select");
      [["linked", "linked"], ["mirrored", "mirrored"], ["free", "free"]].forEach(([v, t]) => {
        const option = el("option", null, t);
        option.value = v;
        linkSel.appendChild(option);
      });
      linkSel.title = "linked moves all four together, mirrored pairs top/bottom and left/right, free is independent";
      linkWrap.appendChild(linkSel);
      linkSel.addEventListener("change", () => send({ scope: "field", type: "marginMode", value: linkSel.value }));
      onReflect(() => safeSet(linkSel, snap.marginLink));
      minis(V, [
        linkWrap,
        slider("field", "marginTop", "top", FIELD_SLIDERS.marginTop),
        slider("field", "marginRight", "right", FIELD_SLIDERS.marginRight),
        slider("field", "marginBottom", "bottom", FIELD_SLIDERS.marginBottom),
        slider("field", "marginLeft", "left", FIELD_SLIDERS.marginLeft),
      ]);
      minis(V, [
        slider("field", "gapX", "gap ↔", FIELD_SLIDERS.gapX, { desc: "horizontal room between tiles" }),
        slider("field", "gapY", "gap ↕", FIELD_SLIDERS.gapY, { desc: "vertical room between tile rows" }),
        slider("field", "inset", "row inset", FIELD_SLIDERS.inset, { desc: "how far each row's flashing background reaches past its tiles" }),
      ]);
    }

    section(V, "corners");
    minis(V, [
      slider("field", "radiusTile", "tiles", FIELD_SLIDERS.radiusTile, { desc: "tile corner radius as a share of tile size — 50% makes circles" }),
      slider("field", "radiusRow", "rows", FIELD_SLIDERS.radiusRow, { desc: "row background corner radius" }),
      slider("field", "radiusOuter", "frame", FIELD_SLIDERS.radiusOuter, { desc: "outer breathing box corner radius" }),
    ]);

    section(V, "fx rack");
    minis(V, [
      slider("field", "fxTrails", "trails", FIELD_SLIDERS.fxTrails, { desc: "echo — previous frames decay under the new one" }),
      slider("field", "fxZoom", "feedback", FIELD_SLIDERS.fxZoom, { desc: "video-feedback zoom — the infinite tunnel" }),
      slider("field", "fxZoomRot", "fb spin", FIELD_SLIDERS.fxZoomRot, { desc: "rotates the feedback — the tunnel coils" }),
      slider("field", "fxPixel", "pixelate", FIELD_SLIDERS.fxPixel, { desc: "mosaic downsample — bitcrusher for the eyes" }),
    ]);
    minis(V, [
      slider("field", "fxRgb", "rgb split", FIELD_SLIDERS.fxRgb, { desc: "chromatic aberration — channels pull apart" }),
      slider("field", "fxWarp", "warp", FIELD_SLIDERS.fxWarp, { desc: "turbulence displacement — heat haze to liquid" }),
      slider("field", "fxSlit", "slit-scan", FIELD_SLIDERS.fxSlit, { desc: "rows shear in time — motion becomes taffy" }),
      slider("field", "fxKaleido", "kaleido", FIELD_SLIDERS.fxKaleido, { desc: "radial mirror — 2 to 12 segments" }),
    ]);
    minis(V, [
      slider("field", "fxBloom", "bloom", FIELD_SLIDERS.fxBloom, { desc: "bright glow — whites halo and spill" }),
      slider("field", "fxGrain", "grain", FIELD_SLIDERS.fxGrain, { desc: "film grain" }),
      slider("field", "fxCrt", "crt", FIELD_SLIDERS.fxCrt, { desc: "scanlines, barrel curve, beat-synced sync tears" }),
      slider("field", "fxShutter", "shutter", FIELD_SLIDERS.fxShutter, { desc: "strobing frame gate" }),
    ]);
    minis(V, [
      slider("field", "fxIris", "iris", FIELD_SLIDERS.fxIris, { desc: "breathing vignette — closes on breakdowns, opens on drops" }),
    ]);
    V.appendChild(el("p", "tuner-desc", "any FX above zero routes the field through the WebGL rack (tiles re-render on canvas); all knobs are matrix targets and composition params"));

    // Colors + frame + reset.
    {
      const row = el("div", "tuner-colors");
      row.appendChild(el("span", "tuner-label", "colors"));
      const colors = [["low", "Low end of the ramp"], ["high", "High end of the ramp"], ["bg", "Page background behind the field"]].map(([key, title]) => {
        const input = el("input");
        input.type = "color";
        input.title = title;
        input.addEventListener("input", () => send({ scope: "field", type: "set", key, value: input.value }));
        onReflect(() => safeSet(input, snap.config[key]));
        row.appendChild(input);
        return input;
      });
      void colors;
      row.appendChild(button("reset", "Reset every control to the decoded-GIF defaults", () => send({ scope: "field", type: "resetAll" }), "tuner-reset"));
      V.appendChild(row);
    }
    {
      const row = el("div", "tuner-frame");
      row.appendChild(el("span", "tuner-label", "frame"));
      const wIn = el("input");
      const hIn = el("input");
      [wIn, hIn].forEach((input) => {
        input.type = "number";
        input.step = "1";
      });
      wIn.min = "160"; wIn.max = "7680"; wIn.title = "Frame width, px";
      hIn.min = "120"; hIn.max = "4320"; hIn.title = "Frame height, px";
      const push = () => send({ scope: "frame", type: "set", w: Number(wIn.value), h: Number(hIn.value) });
      wIn.addEventListener("change", push);
      hIn.addEventListener("change", push);
      row.append(wIn, el("span", "tuner-x", "×"), hIn,
        button("full width", "Snap the frame to 100% of the window width", () => send({ scope: "frame", type: "snap", mode: "fullw" })),
        button("fit screen", "Snap the frame to the window's exact size and aspect ratio", () => send({ scope: "frame", type: "snap", mode: "fit" })));
      row.appendChild(el("p", "tuner-desc", "the staging frame, in pixels — any size, any aspect; scales down to fit the window"));
      onReflect(() => {
        safeSet(wIn, snap.frame.w);
        safeSet(hIn, snap.frame.h);
      });
      V.appendChild(row);
    }

    // ========================================================================
    // AUDIO tab
    // ========================================================================
    const A = panes.audio;

    section(A, "player");
    {
      const row = el("div", "tuner-pattern");
      const play = button("play", "Play / pause — same switch as the speaker on the visual page", () => send({ scope: "music", type: "player", cmd: "toggle" }));
      const stopBtn = button("stop", "Stop — pause and rewind to the top of the track", () => send({ scope: "music", type: "player", cmd: "stop" }));
      const prev = button("◀", "Previous track", () => send({ scope: "music", type: "player", cmd: "prev" }), "tuner-step");
      const sel = el("select");
      const next = button("▶", "Next track", () => send({ scope: "music", type: "player", cmd: "next" }), "tuner-step");
      const shuffleWrap = el("label", "tuner-check");
      const shuffle = el("input");
      shuffle.type = "checkbox";
      shuffleWrap.append(shuffle, document.createTextNode("shuffle"));
      const djLabel = el("label", "tuner-label", "visual dj");
      const dj = el("select");
      [["claude", "claude's set"], ["free", "free play"]].forEach(([v, t]) => {
        const option = el("option", null, t);
        option.value = v;
        dj.appendChild(option);
      });
      dj.title = "claude's set plays a composed light show authored for each track; free play hands the field back to your sliders";
      row.append(play, stopBtn, prev, sel, next, shuffleWrap, djLabel, dj);
      row.appendChild(el("p", "tuner-desc", "tracks auto-advance when one ends. claude's set drives the field AND the reactivity per track — flip to free play to take the sliders back"));
      sel.addEventListener("change", () => send({ scope: "music", type: "player", cmd: "select", index: Number(sel.value) }));
      shuffle.addEventListener("change", () => send({ scope: "music", type: "player", cmd: "shuffle", value: shuffle.checked }));
      dj.addEventListener("change", () => send({ scope: "music", type: "player", cmd: "dj", value: dj.value }));
      onReflect(() => {
        if (!sel.options.length || sel.options.length !== snap.music.tracks.length) {
          sel.textContent = "";
          snap.music.tracks.forEach((label, i) => {
            const option = el("option", null, label);
            option.value = String(i);
            sel.appendChild(option);
          });
        }
        safeSet(sel, String(snap.music.trackIndex));
        play.textContent = snap.music.playing ? "pause" : "play";
        shuffle.checked = !!snap.music.shuffle;
        safeSet(dj, snap.music.dj);
      });
      A.appendChild(row);

      // Transport: playhead scrubber, time readout, listening volume.
      const transport = el("div", "tuner-transport");
      const seek = el("input");
      seek.type = "range";
      seek.min = "0";
      seek.max = "1000";
      seek.step = "1";
      seek.title = "Scrub through the track — double-click rewinds to the top";
      const time = el("output", "tuner-time", "0:00 / 0:00");
      const volLab = el("label", "tuner-label", "vol");
      const vol = el("input", "tuner-vol");
      vol.type = "range";
      vol.min = "0";
      vol.max = "1000";
      vol.step = "1";
      vol.title = "Listening volume — same knob as the speaker's hover slider. Double-click restores full";
      transport.append(seek, time, volLab, vol);
      seek.addEventListener("input", () => {
        if (snap && snap.music.duration) {
          send({ scope: "music", type: "player", cmd: "seek", value: (Number(seek.value) / 1000) * snap.music.duration });
        }
      });
      // Release focus after a scrub so the playhead resumes following playback
      // (reflect skips whichever control is focused).
      seek.addEventListener("change", () => seek.blur());
      seek.addEventListener("dblclick", () => send({ scope: "music", type: "player", cmd: "seek", value: 0 }));
      vol.addEventListener("input", () => send({ scope: "music", type: "player", cmd: "volume", value: Number(vol.value) / 1000 }));
      vol.addEventListener("dblclick", () => send({ scope: "music", type: "player", cmd: "volume", value: 1 }));
      const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
      onReflect(() => {
        const d = snap.music.duration || 0;
        safeSet(seek, d ? String(Math.round(((snap.music.time || 0) / d) * 1000)) : "0");
        time.textContent = `${fmtTime(snap.music.time || 0)} / ${fmtTime(d)}`;
        if (snap.music.volume !== undefined) safeSet(vol, String(Math.round(snap.music.volume * 1000)));
      });
      A.appendChild(transport);
    }

    section(A, "reactivity");
    const beatDot = el("span");
    beatDot.id = "rlx-m-beatdot";
    minis(A, [
      slider("music", "master", "react", MUSIC_SLIDERS.master, { desc: "how hard the music grips the field overall — every mapping below scales through this" }),
      slider("music", "attack", "attack", MUSIC_SLIDERS.attack, { desc: "how fast the band followers rise" }),
      slider("music", "release", "release", MUSIC_SLIDERS.release, { desc: "how fast they let go" }),
      slider("music", "beatSense", "beat sense", MUSIC_SLIDERS.beatSense, { desc: "beat detector sensitivity — the dot flashes on every hit it hears", extra: beatDot }),
      slider("music", "beatDecay", "beat decay", MUSIC_SLIDERS.beatDecay, { desc: "how long each beat impulse rings" }),
      slider("music", "accentDecay", "accent decay", MUSIC_SLIDERS.accentDecay, { desc: "how long the grid-locked pulse rings — short is a flash, long is a swell" }),
    ]);

    // Mod matrix.
    const matrixHost = el("div", "tuner-matrix");
    const fmtAmt = (v) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`);
    const matrixRows = [];
    for (let i = 0; i < 6; i++) {
      const rowEl = el("div", "tuner-modrow");
      const srcSel = el("select");
      Object.keys(SRC_LABELS).forEach((s) => {
        const option = el("option", null, SRC_LABELS[s]);
        option.value = s;
        srcSel.appendChild(option);
      });
      const arrow = el("span", "tuner-modarrow", "→");
      const tgtSel = el("select");
      Object.keys(DSP.TARGETS).forEach((t) => {
        const option = el("option", null, DSP.TARGETS[t].label);
        option.value = t;
        tgtSel.appendChild(option);
      });
      const amt = el("input");
      amt.type = "range";
      amt.min = "-1000";
      amt.max = "1000";
      amt.step = "1";
      amt.title = "How hard this source pushes this knob — negative pulls it down. Double-click zeroes";
      const out = el("output");
      rowEl.append(srcSel, arrow, tgtSel, amt, out);
      matrixHost.appendChild(rowEl);
      srcSel.addEventListener("change", () => send({ scope: "music", type: "matrix", index: i, field: "src", value: srcSel.value }));
      tgtSel.addEventListener("change", () => send({ scope: "music", type: "matrix", index: i, field: "tgt", value: tgtSel.value }));
      amt.addEventListener("input", () => {
        const v = Number(amt.value) / 1000;
        out.textContent = fmtAmt(v);
        send({ scope: "music", type: "matrix", index: i, field: "amt", value: v });
      });
      amt.addEventListener("dblclick", () => send({ scope: "music", type: "matrix", index: i, field: "amt", value: 0 }));
      matrixRows.push({ srcSel, tgtSel, amt, out });
    }
    A.appendChild(matrixHost);
    A.appendChild(el("p", "tuner-desc", "the mod matrix — each row wires a listening source to a knob (field OR fx); amount is how far it pushes off the base, negative pulls the other way"));
    onReflect(() => {
      snap.music.settings.rows.forEach((row, i) => {
        if (!matrixRows[i]) return;
        safeSet(matrixRows[i].srcSel, row.src);
        safeSet(matrixRows[i].tgtSel, row.tgt);
        safeSet(matrixRows[i].amt, String(Math.round(row.amt * 1000)));
        matrixRows[i].out.textContent = fmtAmt(row.amt);
      });
    });

    // Reactivity presets + per-track.
    {
      const row = el("div", "tuner-pattern");
      row.appendChild(el("label", "tuner-label", "react presets"));
      const sel = el("select");
      row.appendChild(sel);
      const save = button("save", "Save the current reactivity settings as a named preset", () => {
        const name = (prompt("Name this reactivity preset:") || "").trim();
        if (name) send({ scope: "music", type: "presetSave", name });
      });
      const del = button("delete", "Delete the selected saved reactivity preset", () => {
        const v = sel.value;
        if (v.startsWith("u:") && confirm(`Delete reactivity preset "${v.slice(2)}"?`)) {
          send({ scope: "music", type: "presetDelete", name: v.slice(2) });
        }
      });
      del.disabled = true;
      const ptWrap = el("label", "tuner-check");
      const perTrack = el("input");
      perTrack.type = "checkbox";
      ptWrap.append(perTrack, document.createTextNode("per track"));
      ptWrap.title = "Remember these reactivity settings for the current track and recall them whenever it plays";
      row.append(save, del, ptWrap);
      row.appendChild(button("reset", "Reset the audio tab — reactivity, matrix, shuffle, per-track, DJ mode — back to stock", () => send({ scope: "music", type: "resetAll" }), "tuner-reset"));
      row.appendChild(el("p", "tuner-desc", "reactivity has its own presets, separate from the field's; per track remembers the current settings for whichever song is playing"));
      sel.addEventListener("change", () => {
        del.disabled = !sel.value.startsWith("u:");
        if (sel.value) send({ scope: "music", type: "preset", value: sel.value });
      });
      perTrack.addEventListener("change", () => send({ scope: "music", type: "perTrack", value: perTrack.checked }));
      // Same rebuild guard as the field presets: only rebuild when the list
      // itself changes, so streaming snapshots can't close an open dropdown.
      let listSig = "";
      onReflect(() => {
        const sig = JSON.stringify([snap.music.presets.factory.map((p) => p.id), snap.music.presets.user]);
        if (sig !== listSig) {
          listSig = sig;
          sel.textContent = "";
          const custom = el("option", null, "— custom —");
          custom.value = "";
          sel.appendChild(custom);
          const fg = el("optgroup");
          fg.label = "built in";
          snap.music.presets.factory.forEach((p) => {
            const option = el("option", null, p.label);
            option.value = `f:${p.id}`;
            fg.appendChild(option);
          });
          sel.appendChild(fg);
          if (snap.music.presets.user.length) {
            const ug = el("optgroup");
            ug.label = "yours";
            snap.music.presets.user.forEach((name) => {
              const option = el("option", null, name);
              option.value = `u:${name}`;
              ug.appendChild(option);
            });
            sel.appendChild(ug);
          }
        }
        safeSet(sel, snap.music.presets.selected || "");
        del.disabled = !(snap.music.presets.selected || "").startsWith("u:");
        perTrack.checked = !!snap.music.perTrack;
      });
      A.appendChild(row);
    }

    // --- wiring -------------------------------------------------------------

    let beatOff = 0;
    bus.onBeat(() => {
      beatDot.classList.add("on");
      clearTimeout(beatOff);
      beatOff = setTimeout(() => beatDot.classList.remove("on"), 90);
    });

    bus.onSnapshot((s) => {
      if (!s || !s.music) return; // host not fully registered yet
      snap = s;
      reflectors.forEach((fn) => fn());
    });

    let tab = "visual";
    try { tab = localStorage.getItem("relaaax-tuner-tab") || "visual"; } catch (err) { /* fine */ }
    setTab(tab === "audio" ? "audio" : "visual");
    bus.requestSnapshot();
  }

  globalThis.RelaaaxTuner = { mount };
})();
