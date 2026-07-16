// DROPZILLA — a shock jock's sample deck. Formerly The Toot Suite;
// the 36 farts live on as bank one. Pads route through a Web Audio FX bus
// (drive, phaser, delay, reverb) with an event-based performance looper.
(function () {
  "use strict";

  const BANK_SLOTS = 10;

  const BANKS = [
    {
      id: "toots",
      label: "TOOTS",
      accent: "#59ff7d",
      pads: [
        ["01-squeaker", "Lil' Squeaker", "🐭"],
        ["02-whisperer", "The Whisperer", "🤫"],
        ["03-bass-drop", "Bass Drop", "🔊"],
        ["04-trombone", "Sad Trombone", "🎺"],
        ["05-machine-gun", "Machine Gun", "🍿"],
        ["06-long-haul", "The Long Haul", "🚛"],
        ["07-wet-one", "Wet One", "💦"],
        ["08-swamp-monster", "Swamp Monster", "🐊"],
        ["09-balloon", "Balloon Pinch", "🎈"],
        ["10-ducky", "The Duck", "🦆"],
        ["11-question", "The Question", "❓"],
        ["12-grandpa", "Grandpa", "👴"],
        ["13-bubble-bath", "Bubble Bath", "🛁"],
        ["14-jet-engine", "Jet Engine", "✈️"],
        ["15-tiny-toot", "Tiny Toot", "🐜"],
        ["16-regret", "The Regret", "😬"],
        ["17-velcro", "Velcro", "🩹"],
        ["18-motorboat", "Motorboat", "🚤"],
        ["19-squelch", "The Squelch", "🥾"],
        ["20-foghorn", "Foghorn", "🚢"],
        ["21-popcorn", "Popcorn", "🌽"],
        ["22-slide-whistle", "Slide Whistle", "🎢"],
        ["23-thunder", "Distant Thunder", "⛈️"],
        ["24-sneak", "The Sneak", "🥷"],
        ["25-rubber-chicken", "Rubber Chicken", "🐔"],
        ["26-double-tap", "Double Tap", "✌️"],
        ["27-creaky-door", "Creaky Door", "🚪"],
        ["28-raspberry", "Raspberry", "👅"],
        ["29-espresso", "The Espresso", "☕"],
        ["30-beast", "THE BEAST", "👹"],
        ["31-whoopee", "Whoopee Classic", "🪑"],
        ["32-deflate", "The Deflate", "🛟"],
        ["33-gravel", "Gravel Road", "🪨"],
        ["34-soprano", "The Soprano", "🎭"],
        ["35-morse-code", "Morse Code", "📡"],
        ["36-grand-finale", "GRAND FINALE", "🎆"],
      ],
    },
  ];

  // MediaElementSource outputs silence for file:// media (opaque origin),
  // so pad audio only routes through the FX bus when served over http.
  const FX_MEDIA = location.protocol !== "file:";

  const device = document.getElementById("device");
  const lcdEl = document.getElementById("lcd");
  const banksEl = document.getElementById("banks");
  const padsEl = document.getElementById("pads");
  const knobsEl = document.getElementById("knobs");

  function lcd(text) {
    lcdEl.textContent = text;
  }

  // ---------- audio: context + FX bus ----------

  let ctx = null;
  const graph = {};
  let soundOn = false;
  let ctrlVolume = 1;
  let pitchRate = 1; // applied to voices at trigger time

  const playing = new Set();
  const MAX_CONCURRENT = 12;

  function makeImpulse() {
    const len = Math.floor(ctx.sampleRate * 2.4);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    return buf;
  }

  function buildGraph() {
    const g = graph;
    g.busIn = ctx.createGain();

    // DRIVE — clean/shaped crossfade
    g.driveClean = ctx.createGain();
    g.drivePre = ctx.createGain();
    g.driveShaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(3.2 * x);
    }
    g.driveShaper.curve = curve;
    g.driveShaper.oversample = "2x";
    g.drivePost = ctx.createGain();
    g.driveWet = ctx.createGain();
    g.driveOut = ctx.createGain();
    g.busIn.connect(g.driveClean);
    g.driveClean.connect(g.driveOut);
    g.busIn.connect(g.drivePre);
    g.drivePre.connect(g.driveShaper);
    g.driveShaper.connect(g.drivePost);
    g.drivePost.connect(g.driveWet);
    g.driveWet.connect(g.driveOut);

    // PHASER — four swept allpass stages, wet/dry
    g.phDry = ctx.createGain();
    g.phWet = ctx.createGain();
    g.phOut = ctx.createGain();
    g.phStages = [350, 700, 1100, 1600].map((f) => {
      const ap = ctx.createBiquadFilter();
      ap.type = "allpass";
      ap.frequency.value = f;
      ap.Q.value = 0.6;
      return ap;
    });
    g.phLfo = ctx.createOscillator();
    g.phLfo.frequency.value = 0.4;
    g.phDepth = ctx.createGain();
    g.phDepth.gain.value = 320;
    g.phLfo.connect(g.phDepth);
    g.phStages.forEach((st) => g.phDepth.connect(st.frequency));
    g.phLfo.start();
    g.driveOut.connect(g.phDry);
    g.phDry.connect(g.phOut);
    let node = g.driveOut;
    g.phStages.forEach((st) => { node.connect(st); node = st; });
    node.connect(g.phWet);
    g.phWet.connect(g.phOut);

    // master out (shared sound-control volume lives here)
    g.master = ctx.createGain();
    g.master.gain.value = ctrlVolume;
    g.phOut.connect(g.master);
    g.master.connect(ctx.destination);

    // DELAY send — filtered feedback loop
    g.dlSend = ctx.createGain();
    g.dlSend.gain.value = 0;
    g.dl = ctx.createDelay(1);
    g.dl.delayTime.value = 0.3;
    g.dlTone = ctx.createBiquadFilter();
    g.dlTone.type = "lowpass";
    g.dlTone.frequency.value = 2400;
    g.dlFb = ctx.createGain();
    g.dlFb.gain.value = 0.3;
    g.phOut.connect(g.dlSend);
    g.dlSend.connect(g.dl);
    g.dl.connect(g.dlTone);
    g.dlTone.connect(g.dlFb);
    g.dlFb.connect(g.dl);
    g.dlTone.connect(g.master);

    // REVERB send — synthesized impulse
    g.rvSend = ctx.createGain();
    g.rvSend.gain.value = 0;
    g.rv = ctx.createConvolver();
    g.rv.buffer = makeImpulse();
    g.phOut.connect(g.rvSend);
    g.rvSend.connect(g.rv);
    g.rv.connect(g.master);
  }

  function ensureCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    buildGraph();
    applyAllFx();
  }

  // ---------- FX state + knob mappings ----------

  const fx = { pitch: 0.5, drive: 0, phaser: 0, delay: 0, reverb: 0 };

  const FX_APPLY = {
    pitch(v) {
      pitchRate = Math.pow(2, (v - 0.5) * 2); // 0.5x .. 2x, center 1x
    },
    drive(v) {
      if (!ctx) return;
      graph.driveClean.gain.value = 1 - v;
      graph.drivePre.gain.value = 1 + v * 24;
      graph.drivePost.gain.value = 1 / (1 + v * 3.2);
      graph.driveWet.gain.value = v;
    },
    phaser(v) {
      if (!ctx) return;
      graph.phDry.gain.value = 1 - v * 0.5;
      graph.phWet.gain.value = v;
      graph.phLfo.frequency.value = 0.15 + v * 1.1;
    },
    delay(v) {
      if (!ctx) return;
      graph.dlSend.gain.value = v * 0.9;
      graph.dlFb.gain.value = 0.22 + v * 0.38;
    },
    reverb(v) {
      if (!ctx) return;
      graph.rvSend.gain.value = v * 1.2;
    },
  };

  const FX_READOUT = {
    pitch: () => "PITCH x" + pitchRate.toFixed(2),
    drive: () => "DRIVE " + Math.round(fx.drive * 100) + "%",
    phaser: () => "PHASER " + Math.round(fx.phaser * 100) + "%",
    delay: () => "DELAY " + Math.round(fx.delay * 100) + "%",
    reverb: () => "REVERB " + Math.round(fx.reverb * 100) + "%",
  };

  function setFx(name, v) {
    fx[name] = v;
    FX_APPLY[name](v);
    lcd(FX_READOUT[name]());
  }

  function applyAllFx() {
    Object.keys(fx).forEach((k) => FX_APPLY[k](fx[k]));
  }

  // ---------- voices ----------

  function playPad(bank, index) {
    ensureCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    if (playing.size >= MAX_CONCURRENT) {
      const oldest = playing.values().next().value;
      oldest.pause();
      playing.delete(oldest);
    }
    const audio = new Audio("./assets/audio/" + bank.id + "/" + bank.pads[index][0] + ".mp3");
    audio.preservesPitch = false; // tape-style: pitch knob is a varispeed control
    audio.playbackRate = pitchRate;
    if (FX_MEDIA && ctx) {
      const src = ctx.createMediaElementSource(audio);
      src.connect(graph.busIn);
      audio._src = src;
    } else {
      audio.volume = ctrlVolume;
    }
    playing.add(audio);
    return audio;
  }

  function killAllVoices() {
    playing.forEach((a) => a.pause());
    playing.clear();
  }

  // ---------- pads + banks ----------

  let currentBank = BANKS[0];
  let padEls = [];

  function flashPad(el) {
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }

  function triggerPad(bank, index, record) {
    if (!soundOn) {
      lcd("SOUND IS OFF — HIT THE SPEAKER, TOP RIGHT");
      return;
    }
    const audio = playPad(bank, index);
    lcd("► " + bank.pads[index][1]);
    if (record !== false) recordEvent(bank.id, index);

    let el = null;
    if (bank === currentBank && padEls[index]) {
      el = padEls[index];
      flashPad(el);
      el.dataset.lit = (Number(el.dataset.lit) || 0) + 1;
      el.classList.add("lit");
    }
    const done = () => {
      playing.delete(audio);
      if (audio._src) { audio._src.disconnect(); audio._src = null; }
      if (el) {
        const n = (Number(el.dataset.lit) || 1) - 1;
        el.dataset.lit = n;
        if (n <= 0) el.classList.remove("lit");
      }
    };
    audio.addEventListener("ended", done, { once: true });
    audio.addEventListener("pause", done, { once: true });
    audio.play().catch(done);
  }

  function renderPads(bank) {
    padsEl.textContent = "";
    padEls = bank.pads.map(([, name, emoji], i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pad";
      const icon = document.createElement("span");
      icon.className = "pad-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = emoji;
      const label = document.createElement("span");
      label.className = "pad-name";
      label.textContent = name;
      btn.append(icon, label);
      btn.addEventListener("click", () => triggerPad(bank, i));
      padsEl.appendChild(btn);
      return btn;
    });
  }

  function selectBank(bank) {
    currentBank = bank;
    device.style.setProperty("--accent", bank.accent);
    Array.from(banksEl.children).forEach((b) => {
      b.classList.toggle("active", b._bank === bank);
    });
    renderPads(bank);
    lcd("BANK: " + bank.label);
  }

  for (let i = 0; i < BANK_SLOTS; i++) {
    const bank = BANKS[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bank";
    if (bank) {
      btn.textContent = bank.label;
      btn._bank = bank;
      btn.addEventListener("click", () => selectBank(bank));
    } else {
      btn.className += " bank--empty";
      btn.disabled = true;
      btn.textContent = String(i + 1).padStart(2, "0");
    }
    banksEl.appendChild(btn);
  }

  // ---------- knobs ----------

  const KNOBS = [
    ["pitch", "Pitch"],
    ["drive", "Drive"],
    ["phaser", "Phaser"],
    ["delay", "Delay"],
    ["reverb", "Reverb"],
  ];

  function makeKnob(name, label) {
    const defaultValue = fx[name];
    const el = document.createElement("div");
    el.className = "knob";
    el.tabIndex = 0;
    el.setAttribute("role", "slider");
    el.setAttribute("aria-label", label);
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "100");
    el.innerHTML =
      '<div class="knob-ring"><div class="knob-cap"><i class="knob-dot"></i></div></div>' +
      '<span class="knob-label">' + label + "</span>";

    let v = defaultValue;
    function set(next, silent) {
      v = Math.min(1, Math.max(0, next));
      el.style.setProperty("--v", v);
      el.setAttribute("aria-valuenow", String(Math.round(v * 100)));
      if (!silent) setFx(name, v);
    }
    set(v, true);

    let dragY = null;
    let dragV = 0;
    el.addEventListener("pointerdown", (e) => {
      dragY = e.clientY;
      dragV = v;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener("pointermove", (e) => {
      if (dragY === null) return;
      set(dragV + (dragY - e.clientY) / 140);
    });
    el.addEventListener("pointerup", () => { dragY = null; });
    el.addEventListener("pointercancel", () => { dragY = null; });
    el.addEventListener("dblclick", () => set(defaultValue));
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      set(v + (e.deltaY < 0 ? 0.04 : -0.04));
    }, { passive: false });
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { set(v + 0.02); e.preventDefault(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { set(v - 0.02); e.preventDefault(); }
      else if (e.key === "Home") { set(0); e.preventDefault(); }
      else if (e.key === "End") { set(1); e.preventDefault(); }
    });
    return el;
  }

  KNOBS.forEach(([name, label]) => knobsEl.appendChild(makeKnob(name, label)));

  // ---------- looper (event-based: records pad hits, retriggers them) ----------

  const MAX_LOOP = 30000;
  const looper = {
    state: "empty", // empty | rec | loop | dub | stopped
    events: [],
    length: 0,
    recStart: 0,
    cycleStart: 0,
    timers: [],
    safety: null,
  };

  const tRec = document.getElementById("loop-rec");
  const tPlay = document.getElementById("loop-play");
  const tStop = document.getElementById("loop-stop");
  const tClear = document.getElementById("loop-clear");

  function loopRender() {
    const s = looper.state;
    tRec.classList.toggle("on", s === "rec" || s === "dub");
    tRec.classList.toggle("blink", s === "rec" || s === "dub");
    tPlay.classList.toggle("on", s === "loop" || s === "dub");
    tStop.classList.toggle("on", s === "stopped" && looper.events.length > 0);
  }

  function clearTimers() {
    looper.timers.forEach(clearTimeout);
    looper.timers = [];
  }

  function scheduleCycle() {
    looper.cycleStart = performance.now();
    looper.events.forEach((ev) => {
      looper.timers.push(setTimeout(() => {
        const bank = BANKS.find((b) => b.id === ev.bankId);
        if (bank) triggerPad(bank, ev.index, false);
      }, ev.t));
    });
    looper.timers.push(setTimeout(() => {
      if (looper.state === "loop" || looper.state === "dub") scheduleCycle();
    }, looper.length));
  }

  function recordEvent(bankId, index) {
    if (looper.state === "rec") {
      const t = performance.now() - looper.recStart;
      if (t <= MAX_LOOP) looper.events.push({ t, bankId, index });
    } else if (looper.state === "dub" && looper.length > 0) {
      const t = (performance.now() - looper.cycleStart) % looper.length;
      looper.events.push({ t, bankId, index });
    }
  }

  function startRec(msg) {
    clearTimers();
    looper.events = [];
    looper.length = 0;
    looper.recStart = performance.now();
    looper.state = "rec";
    looper.safety = setTimeout(closeRec, MAX_LOOP);
    lcd(msg);
  }

  function closeRec() {
    clearTimeout(looper.safety);
    looper.length = Math.min(Math.max(performance.now() - looper.recStart, 200), MAX_LOOP);
    if (!looper.events.length) {
      looper.state = "empty";
      lcd("NOTHING RECORDED");
    } else {
      looper.state = "loop";
      scheduleCycle();
      lcd("LOOP " + (looper.length / 1000).toFixed(1) + "S — ROLLING");
    }
    loopRender();
  }

  tRec.addEventListener("click", () => {
    const s = looper.state;
    if (s === "empty") startRec("RECORDING… HIT REC AGAIN TO LOOP");
    else if (s === "rec") { closeRec(); return; }
    else if (s === "loop") { looper.state = "dub"; lcd("OVERDUB — NEW HITS JOIN THE LOOP"); }
    else if (s === "dub") { looper.state = "loop"; lcd("LOOP " + (looper.length / 1000).toFixed(1) + "S — ROLLING"); }
    else if (s === "stopped") startRec("OLD LOOP GONE — RECORDING…");
    loopRender();
  });

  tPlay.addEventListener("click", () => {
    if (looper.state === "rec") { closeRec(); return; }
    if (looper.state === "stopped" && looper.events.length) {
      looper.state = "loop";
      scheduleCycle();
      lcd("LOOP " + (looper.length / 1000).toFixed(1) + "S — ROLLING");
    }
    loopRender();
  });

  tStop.addEventListener("click", () => {
    const s = looper.state;
    if (s === "rec") {
      clearTimeout(looper.safety);
      looper.events = [];
      looper.state = "empty";
      lcd("REC ABORTED");
    } else if (s === "loop" || s === "dub") {
      clearTimers();
      looper.state = "stopped";
      lcd("LOOP STOPPED");
    }
    loopRender();
  });

  tClear.addEventListener("click", () => {
    clearTimers();
    clearTimeout(looper.safety);
    looper.events = [];
    looper.length = 0;
    looper.state = "empty";
    lcd("LOOP CLEARED");
    loopRender();
  });

  function loopHalt() {
    const s = looper.state;
    if (s === "rec") {
      clearTimeout(looper.safety);
      looper.events = [];
      looper.state = "empty";
    } else if (s === "loop" || s === "dub") {
      clearTimers();
      looper.state = "stopped";
    }
    loopRender();
  }

  // ---------- BLEEP (hold): synthesized censor tone through the FX bus ----------

  const bleepBtn = document.getElementById("bleep");
  let bleepOsc = null;

  function bleepStart() {
    if (!soundOn) { lcd("SOUND IS OFF — HIT THE SPEAKER, TOP RIGHT"); return; }
    ensureCtx();
    if (!ctx || bleepOsc) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    bleepOsc = ctx.createOscillator();
    bleepOsc.type = "sine";
    bleepOsc.frequency.value = 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    bleepOsc.connect(g);
    g.connect(graph.busIn);
    bleepOsc._g = g;
    bleepOsc.start();
    bleepBtn.classList.add("held");
    lcd("[CENSORED]");
  }

  function bleepStop() {
    bleepBtn.classList.remove("held");
    if (!bleepOsc) return;
    const osc = bleepOsc;
    bleepOsc = null;
    osc._g.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    osc.stop(ctx.currentTime + 0.12);
  }

  bleepBtn.addEventListener("pointerdown", (e) => {
    bleepBtn.setPointerCapture(e.pointerId);
    bleepStart();
  });
  bleepBtn.addEventListener("pointerup", bleepStop);
  bleepBtn.addEventListener("pointercancel", bleepStop);
  bleepBtn.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) { bleepStart(); e.preventDefault(); }
  });
  bleepBtn.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") bleepStop();
  });

  // ---------- RANDOM ----------

  document.getElementById("random").addEventListener("click", () => {
    const i = Math.floor(Math.random() * currentBank.pads.length);
    triggerPad(currentBank, i);
  });

  // ---------- shared sound control ----------

  const control = ElasticSoundControl.attach({
    start: () => {
      ensureCtx();
      soundOn = true;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    },
    stop: () => {
      soundOn = false;
      killAllVoices();
      bleepStop();
      loopHalt();
      lcd("MUTED");
    },
    setVolume: (v) => {
      ctrlVolume = v;
      if (ctx) graph.master.gain.value = v;
      if (!FX_MEDIA || !ctx) playing.forEach((a) => { a.volume = v; });
    },
  });
  void control;

  // ---------- boot ----------

  selectBank(BANKS[0]);
  lcd(FX_MEDIA
    ? "DROPZILLA V1.0 — READY TO RUIN THE SHOW"
    : "DROPZILLA V1.0 — FILE MODE, PAD FX OFFLINE");
})();
