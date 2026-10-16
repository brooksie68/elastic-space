// Lumina — the PERFORM face of the controls window (2026-09-30). James: the
// performance controls are "a satellite like the granular controls… both in
// the separate window with a handy toggle to switch modes at will." This file
// only DRAWS: every value comes from the page's performance engine
// (perform.js) in the host snapshot, and every touch goes back as a
// `perform` command over the same bus the configuration face uses. Keys typed
// in this window are forwarded to the page, so the controls answer the same
// keys wherever the focus is.
//
//   LuminaPerformUI.mount({ container, bus })
(function () {
  "use strict";

  const TEXT_KEY = "lumina-pf-text";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HEX = /^#[0-9a-f]{6}$/i;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(cls, html, title) {
    const b = el("button", cls);
    b.type = "button";
    b.innerHTML = html;
    if (title) b.title = title;
    return b;
  }

  function mount(opts) {
    const root = opts.container;
    const bus = opts.bus;
    const send = (cmd) => bus.send(Object.assign({ scope: "perform" }, cmd));
    let snap = null;
    let built = false;
    let thumbs = {};
    let scenesVer = -1;
    let text = 1;
    try { text = clamp(Number(localStorage.getItem(TEXT_KEY)) || 1, 0.8, 1.6); } catch (err) { /* fine */ }

    root.textContent = "";
    const waiting = el("p", "pfw-wait", "Waiting for the Lumina page… (open it, or press configuration there)");
    root.appendChild(waiting);

    // --- the pieces, built once from the engine's own definitions ---------------------

    const wrap = el("div", "pfw");
    const faderBox = el("section", "pfw-faders");
    const right = el("section", "pfw-right");
    const padBox = el("div", "pfw-pads");
    const status = el("div", "pfw-status");
    const sceneBox = el("section", "pfw-scenes");
    const faderEls = {};
    const padEls = {};

    function build(p) {
      built = true;
      waiting.remove();
      root.appendChild(wrap);
      wrap.appendChild(faderBox);
      wrap.appendChild(right);
      right.appendChild(padBox);
      right.appendChild(status);
      wrap.appendChild(sceneBox);

      p.faderDefs.forEach((d) => {
        const col = el("div", "pfw-fader");
        col.appendChild(el("div", "pfw-flabel", d.label));
        col.appendChild(el("div", "pfw-fend", d.hi));
        const input = el("input");
        input.type = "range";
        input.min = "0";
        input.max = "1000";
        input.setAttribute("aria-label", d.label);
        input.addEventListener("input", () => send({ type: "fader", id: d.id, value: Number(input.value) / 1000 }));
        input.addEventListener("dblclick", () => send({ type: "faderReset", id: d.id }));
        input.addEventListener("change", () => input.blur());
        col.appendChild(input);
        col.appendChild(el("div", "pfw-fend", d.lo));
        const val = el("div", "pfw-fval");
        col.appendChild(val);
        col.appendChild(el("div", "pfw-fkeys", `${d.keys[0]} up · ${d.keys[1]} down`));
        col.title = `${d.label}: ${d.lo} ↔ ${d.hi}. Keys ${d.keys[0]} / ${d.keys[1]}. Double-click to reset.`;
        faderBox.appendChild(col);
        faderEls[d.id] = { input, val };
      });

      p.padDefs.forEach((d) => {
        const b = button("pfw-pad pfw-pad--" + d.id,
          `<span class="pfw-plabel">${d.label}</span><span class="pfw-pkey">${d.key}</span>`, d.tip);
        let down = false;
        b.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          try { b.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
          down = true;
          b.classList.add("on");
          send({ type: "pad", id: d.id, on: true });
        });
        const up = () => {
          if (!down) return;
          down = false;
          b.classList.remove("on");
          send({ type: "pad", id: d.id, on: false });
          b.blur();
        };
        b.addEventListener("pointerup", up);
        b.addEventListener("pointercancel", up);
        padBox.appendChild(b);
        padEls[d.id] = b;
      });

      buildStatus();
      applyText();
      send({ type: "thumbs" });
    }

    // Status: the beat, the sound delay, autopilot, meters, the window's chrome.
    let beatLine, segW, segB, delayVal, apLine, pendLine, meters, calBtn;
    function buildStatus() {
      const beatRow = el("div", "pfw-row");
      beatLine = el("span", "pfw-line");
      const tapBtn = button("pfw-small", "Tap <span class=\"pfw-pkey\">I</span>", "Tap four times on the beat, starting on a downbeat (key I)");
      tapBtn.addEventListener("click", () => { send({ type: "tap" }); tapBtn.blur(); });
      beatRow.appendChild(beatLine);
      beatRow.appendChild(tapBtn);
      status.appendChild(beatRow);

      const soundRow = el("div", "pfw-row");
      soundRow.appendChild(el("span", "pfw-cap", "Sound"));
      const seg = el("div", "pfw-seg");
      segW = button("", "Speakers", "Wired speakers or headphones");
      segB = button("", "Bluetooth", "Bluetooth speakers or headphones — they add a delay");
      segW.addEventListener("click", () => { send({ type: "delayMode", value: "wired" }); segW.blur(); });
      segB.addEventListener("click", () => { send({ type: "delayMode", value: "bt" }); segB.blur(); });
      seg.appendChild(segW);
      seg.appendChild(segB);
      soundRow.appendChild(seg);
      delayVal = el("span", "pfw-ms");
      soundRow.appendChild(delayVal);
      calBtn = button("pfw-small", "Set", "Set the sound delay: tap along to a click");
      calBtn.addEventListener("click", () => { send({ type: "cal", on: true }); calBtn.blur(); });
      soundRow.appendChild(calBtn);
      status.appendChild(soundRow);

      apLine = el("div", "pfw-line pfw-dim");
      pendLine = el("div", "pfw-line pfw-dim");
      status.appendChild(apLine);
      status.appendChild(pendLine);

      meters = el("div", "pfw-meters");
      ["kick", "snare", "hat", "energy"].forEach((k) => {
        const m = el("span", "pfw-meter");
        const bar = el("i");
        m.appendChild(bar);
        m.appendChild(el("b", null, k));
        meters.appendChild(m);
        meters[k] = bar;
      });
      status.appendChild(meters);

      const chrome = el("div", "pfw-row");
      const keysBtn = button("pfw-small", "Keys", "Every key on one sheet");
      keysBtn.addEventListener("click", () => { keysSheet.hidden = !keysSheet.hidden; keysBtn.blur(); });
      const smaller = button("pfw-small", "A−", "Smaller text");
      const larger = button("pfw-small", "A+", "Larger text");
      smaller.addEventListener("click", () => { text = clamp(text - 0.1, 0.8, 1.6); applyText(); smaller.blur(); });
      larger.addEventListener("click", () => { text = clamp(text + 0.1, 0.8, 1.6); applyText(); larger.blur(); });
      chrome.appendChild(keysBtn);
      chrome.appendChild(smaller);
      chrome.appendChild(larger);
      status.appendChild(chrome);
    }
    function applyText() {
      root.style.setProperty("--pf-scale", String(text));
      keysSheet.style.setProperty("--pf-scale", String(text));
      cal.style.setProperty("--pf-scale", String(text));
      try { localStorage.setItem(TEXT_KEY, String(text)); } catch (err) { /* fine */ }
    }

    // Scenes: a wrapping grid of thumbnails.
    function swatch(sc) {
      const a = HEX.test(sc.bg) ? sc.bg : "#000000";
      const b = HEX.test(sc.high) ? sc.high : "#ffffff";
      const m = HEX.test(sc.low) ? sc.low : "#333333";
      return `linear-gradient(135deg, ${a} 0%, ${m} 45%, ${b} 100%)`;
    }
    function renderScenes(p) {
      sceneBox.textContent = "";
      const head = el("div", "pfw-head");
      head.appendChild(el("span", null, "Scenes"));
      head.appendChild(el("span", "pfw-hint", "tap = cut · hold = morph · keys 1–0 · right-click removes"));
      sceneBox.appendChild(head);
      const grid = el("div", "pfw-grid");
      p.scenes.forEach((sc, i) => {
        const card = button("pfw-scene" + (sc.id === p.sceneActive ? " active" : ""), "", `${sc.name} — tap to cut, hold to morph, right-click to remove`);
        card.dataset.id = sc.id;
        const img = el("div", "pfw-thumb");
        img.style.backgroundImage = thumbs[sc.id] ? `url(${thumbs[sc.id]})` : swatch(sc);
        card.appendChild(img);
        if (i < 10) card.appendChild(el("span", "pfw-num", String((i + 1) % 10)));
        card.appendChild(el("span", "pfw-sname", sc.name));
        let down = false;
        card.addEventListener("pointerdown", (e) => {
          if (e.button !== 0) return;
          try { card.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
          down = true;
          send({ type: "scene", index: i, on: true });
        });
        const up = () => {
          if (!down) return;
          down = false;
          send({ type: "scene", index: i, on: false });
          card.blur();
        };
        card.addEventListener("pointerup", up);
        card.addEventListener("pointercancel", up);
        card.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          if (window.confirm(`Remove “${sc.name}” from Scenes?`)) send({ type: "sceneRemove", index: i });
        });
        grid.appendChild(card);
      });
      const add = button("pfw-scene pfw-add", "<span>+</span><span class=\"pfw-sname\">save this look</span>", "Save the look on screen to Scenes (key M)");
      add.addEventListener("click", () => { send({ type: "bank" }); add.blur(); });
      grid.appendChild(add);
      sceneBox.appendChild(grid);
    }
    function markActive(id) {
      sceneBox.querySelectorAll(".pfw-scene").forEach((c) => c.classList.toggle("active", c.dataset.id === id));
    }

    // --- the keys sheet + the sound-delay card ----------------------------------------------

    const keysSheet = el("div", "pfw-keys");
    keysSheet.hidden = true;
    document.body.appendChild(keysSheet);
    function buildKeys(p) {
      keysSheet.innerHTML =
        "<h2>Keys</h2>" +
        "<p class=\"pfw-dim\">They work in this window and on the picture.</p>" +
        "<div class=\"pfw-kcols\"><div>" +
        "<h3>Faders — hold to slide</h3>" +
        p.faderDefs.map((d) => `<p><kbd>${d.keys[0]}</kbd> <kbd>${d.keys[1]}</kbd> ${d.label} up / down</p>`).join("") +
        "<h3>Scenes</h3><p><kbd>1</kbd>…<kbd>0</kbd> tap to cut, hold to morph</p><p><kbd>M</kbd> save this look</p>" +
        "</div><div>" +
        "<h3>Pads</h3>" +
        p.padDefs.map((d) => `<p><kbd>${d.key === "⌫" ? "Backspace" : d.key}</kbd> ${d.label} — ${d.tip}</p>`).join("") +
        "</div><div>" +
        "<h3>Music</h3><p><kbd>Space</kbd> play / pause</p><p><kbd>I</kbd> tap the beat (four taps, start on a downbeat)</p>" +
        "<h3>This window</h3><p><kbd>`</kbd> switch between Perform and Configure</p><p><kbd>Esc</kbd> close this sheet</p>" +
        "<p>On the picture, <kbd>`</kbd> opens this window.</p>" +
        "</div></div>";
      const close = button("pfw-small", "Close", "Close (Esc)");
      close.addEventListener("click", () => { keysSheet.hidden = true; });
      keysSheet.appendChild(close);
    }

    const cal = el("div", "pfw-cal");
    cal.hidden = true;
    const calTitle = el("h2");
    const calMs = el("div", "pfw-calms");
    const calText = el("p", null,
      "A click plays twice a second. Tap Space (or the Tap button) on every click — after four taps the delay sets itself. " +
      "Then watch the ring on the picture: it should flash exactly on the click. Nudge with − and + until it does.");
    const calRow = el("div", "pfw-row");
    const minus = button("pfw-small", "− 5 ms");
    const plus = button("pfw-small", "+ 5 ms");
    const calTapBtn = button("pfw-small", "Tap");
    const calAuto = button("pfw-small", "Back to auto", "Use what the browser reports (Speakers only)");
    const calDone = button("pfw-small", "Done");
    minus.addEventListener("click", () => send({ type: "delayNudge", ms: -5 }));
    plus.addEventListener("click", () => send({ type: "delayNudge", ms: 5 }));
    calTapBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); bus.send({ scope: "music", type: "calTap" }); });
    calAuto.addEventListener("click", () => send({ type: "delayAuto" }));
    calDone.addEventListener("click", () => send({ type: "cal", on: false }));
    [minus, plus, calTapBtn, calAuto, calDone].forEach((b) => calRow.appendChild(b));
    cal.appendChild(calTitle);
    cal.appendChild(calMs);
    cal.appendChild(calText);
    cal.appendChild(calRow);
    document.body.appendChild(cal);

    // --- snapshots in ------------------------------------------------------------------------

    function reflect(s) {
      snap = s;
      const p = s && s.perform;
      if (!p) return;
      if (!built) { build(p); buildKeys(p); }
      p.faderDefs.forEach((d) => {
        const e = faderEls[d.id];
        if (!e) return;
        if (document.activeElement !== e.input) e.input.value = String(Math.round(p.faders[d.id] * 1000));
        e.val.textContent = p.faderText[d.id];
      });
      padEls.opposite.classList.toggle("latched", p.pads.opposite);
      padEls.break.classList.toggle("latched", p.pads.break);
      padEls.blackout.classList.toggle("latched", p.pads.blackout);
      padEls.strobe.classList.toggle("latched", p.pads.strobe);
      padEls.hold.classList.toggle("latched", !!s.frozen);
      if (p.scenesVer !== scenesVer) {
        scenesVer = p.scenesVer;
        renderScenes(p);
      } else {
        markActive(p.sceneActive);
      }
      const bc = s.music && s.music.beatClock;
      if (bc && bc.source === "grid") beatLine.textContent = `Beat: measured · ${bc.bpm} BPM`;
      else if (bc && bc.source === "tap") beatLine.textContent = `Beat: tapped · ${bc.bpm} BPM`;
      else if (bc && bc.source === "auto") beatLine.textContent = `Beat: heard · ${bc.bpm} BPM — tap I to lock it`;
      else beatLine.textContent = bc && bc.taps ? `Beat: tapping… ${bc.taps} of 4` : "Beat: unknown — tap I on the beat";
      segW.classList.toggle("on", p.delayMode === "wired");
      segB.classList.toggle("on", p.delayMode === "bt");
      delayVal.textContent = `${p.delayMs} ms${p.delayAuto ? " auto" : ""}`;
      apLine.textContent = p.autopilot;
      pendLine.textContent = p.pending;
      cal.hidden = !p.cal.open;
      calTitle.textContent = `Sound delay — ${p.delayMode === "bt" ? "Bluetooth" : "Speakers"}`;
      calMs.textContent = `${p.delayMs} ms`;
      calAuto.hidden = p.delayMode === "bt";
    }
    bus.onSnapshot(reflect);

    if (bus.onPerf) {
      bus.onPerf((m) => {
        if (!m) return;
        if (m.kind === "meters" && meters) {
          ["kick", "snare", "hat", "energy"].forEach((k) => {
            meters[k].style.transform = `scaleY(${clamp(m[k] || 0, 0, 1).toFixed(2)})`;
          });
        } else if (m.kind === "thumbs") {
          thumbs = m.thumbs || {};
          if (snap && snap.perform) renderScenes(snap.perform);
        }
      });
    }

    // --- keys typed in this window go to the page ------------------------------------------------
    // Only while the Perform face is showing (Configure has its own keys).
    const active = () => !root.hidden && root.offsetParent !== null;
    const KEY_OK = /^(Key[A-Z]|Digit\d|Backspace|Space|Escape)$/;
    window.addEventListener("keydown", (e) => {
      if (!active() || e.ctrlKey || e.altKey || e.metaKey) return;
      const tg = e.target;
      if (tg && (tg.isContentEditable || /^(SELECT|TEXTAREA)$/.test(tg.tagName) || (tg.tagName === "INPUT" && tg.type !== "range"))) return;
      if (e.code === "Escape" && !keysSheet.hidden) { keysSheet.hidden = true; return; }
      if (!KEY_OK.test(e.code)) return;
      e.preventDefault();
      if (e.code === "Space" && !(snap && snap.perform && snap.perform.cal.open)) {
        if (!e.repeat) bus.send({ scope: "music", type: "player", cmd: "toggle" });
        return;
      }
      send({ type: "key", code: e.code, down: true, repeat: e.repeat });
    });
    window.addEventListener("keyup", (e) => {
      if (!KEY_OK.test(e.code)) return;
      send({ type: "key", code: e.code, down: false });
    });
    window.addEventListener("blur", () => send({ type: "keysReleased" }));
  }

  globalThis.LuminaPerformUI = { mount };
})();
