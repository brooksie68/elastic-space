// Lumina — detached-controller boot: bridges the control surface (tuner.js)
// to the visualization page over BroadcastChannel("lumina-ctl"). The host
// side lives in world.js. Same-origin only — both windows must come from the
// same server.
(function () {
  "use strict";

  if (!("BroadcastChannel" in globalThis)) {
    document.body.textContent = "This browser has no BroadcastChannel — the detached controller can't reach the visualization.";
    return;
  }

  const channel = new BroadcastChannel("lumina-ctl");
  const snapCbs = [];
  const beatCbs = [];
  const modCbs = [];
  const perfCbs = [];

  const bus = {
    send: (cmd) => channel.postMessage({ t: "cmd", cmd }),
    onSnapshot: (cb) => snapCbs.push(cb),
    onBeat: (cb) => beatCbs.push(cb),
    onMod: (cb) => modCbs.push(cb),
    onPerf: (cb) => perfCbs.push(cb),
    requestSnapshot: () => channel.postMessage({ t: "hello" }),
  };

  channel.onmessage = (event) => {
    const m = event.data;
    if (!m) return;
    if (m.t === "snap") snapCbs.forEach((cb) => cb(m.snap));
    else if (m.t === "beat") beatCbs.forEach((cb) => cb());
    else if (m.t === "mod") modCbs.forEach((cb) => cb(m.values));
    else if (m.t === "perf") perfCbs.forEach((cb) => cb(m.msg));
    else if (m.t === "close") window.close();
  };

  window.addEventListener("beforeunload", () => channel.postMessage({ t: "bye" }));

  // The two faces and the switch between them (James, 2026-09-30: "both in
  // the separate window with a handy toggle to switch modes at will").
  // Remembered per window; Perform first.
  const MODE_KEY = "lumina-ctl-mode";
  let mode = "perform";
  try { if (localStorage.getItem(MODE_KEY) === "configure") mode = "configure"; } catch (err) { /* fine */ }
  const bar = document.createElement("div");
  bar.className = "lum-modebar";
  const seg = document.createElement("div");
  seg.className = "pfw-seg";
  const bPerf = document.createElement("button");
  const bConf = document.createElement("button");
  bPerf.type = bConf.type = "button";
  bPerf.textContent = "Perform";
  bConf.textContent = "Configure";
  bPerf.title = "The big controls for playing live";
  bConf.title = "Every small knob";
  seg.appendChild(bPerf);
  seg.appendChild(bConf);
  const hint = document.createElement("span");
  hint.className = "pfw-hint";
  hint.textContent = "` switches";
  bar.appendChild(seg);
  bar.appendChild(hint);
  document.body.insertBefore(bar, document.body.firstChild);
  function setMode(m) {
    mode = m;
    document.body.classList.toggle("mode-perform", m === "perform");
    document.body.classList.toggle("mode-configure", m === "configure");
    bPerf.classList.toggle("on", m === "perform");
    bConf.classList.toggle("on", m === "configure");
    try { localStorage.setItem(MODE_KEY, m); } catch (err) { /* fine */ }
    window.scrollTo(0, 0);
  }
  bPerf.addEventListener("click", () => { setMode("perform"); bPerf.blur(); });
  bConf.addEventListener("click", () => { setMode("configure"); bConf.blur(); });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Backquote" || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(SELECT|TEXTAREA)$/.test(t.tagName) || (t.tagName === "INPUT" && t.type !== "range"))) return;
    e.preventDefault();
    setMode(mode === "perform" ? "configure" : "perform");
  });
  setMode(mode);

  if (globalThis.LuminaPerformUI) {
    LuminaPerformUI.mount({ container: document.getElementById("lum-perform"), bus });
  }
  LuminaTuner.mount({
    container: document.getElementById("lum-tuner"),
    bus,
    embedded: false,
  });
})();
