// Relaaax — detached-controller boot: bridges the control surface (tuner.js)
// to the visualization page over BroadcastChannel("relaaax-ctl"). The host
// side lives in world.js. Same-origin only — both windows must come from the
// same server.
(function () {
  "use strict";

  if (!("BroadcastChannel" in globalThis)) {
    document.body.textContent = "This browser has no BroadcastChannel — the detached controller can't reach the visualization.";
    return;
  }

  const channel = new BroadcastChannel("relaaax-ctl");
  const snapCbs = [];
  const beatCbs = [];

  const bus = {
    send: (cmd) => channel.postMessage({ t: "cmd", cmd }),
    onSnapshot: (cb) => snapCbs.push(cb),
    onBeat: (cb) => beatCbs.push(cb),
    requestSnapshot: () => channel.postMessage({ t: "hello" }),
  };

  channel.onmessage = (event) => {
    const m = event.data;
    if (!m) return;
    if (m.t === "snap") snapCbs.forEach((cb) => cb(m.snap));
    else if (m.t === "beat") beatCbs.forEach((cb) => cb());
    else if (m.t === "close") window.close();
  };

  window.addEventListener("beforeunload", () => channel.postMessage({ t: "bye" }));

  RelaaaxTuner.mount({
    container: document.getElementById("rlx-tuner"),
    bus,
    embedded: false,
  });
})();
