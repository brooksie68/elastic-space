// Map room page logic: server status light, file:// -> served auto-switch,
// dashboard-icons toggle, and waking the editor panels when the server is up.
// The world editor itself lives in admin.js.

(function () {
  const PORT = 4174;
  const BASE = `http://127.0.0.1:${PORT}`;
  const LAUNCHER_PATH = "C:\\Users\\brook\\ai-projects\\elastic-space\\map-room.cmd";
  const served = location.protocol === "http:" || location.protocol === "https:";

  const light = document.getElementById("server-light");
  const stateText = document.getElementById("server-state");
  const hintText = document.getElementById("server-hint");
  const editorSections = document.getElementById("editor-sections");
  const offlineNote = document.getElementById("offline-note");

  async function serverUp() {
    try {
      const response = await fetch(served ? "/healthz" : `${BASE}/healthz`, {
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  function render(up) {
    light.className = `server-light ${up ? "on" : "off"}`;
    if (up) {
      stateText.textContent = "Server running";
      hintText.textContent = `${BASE} — close the "elastic-space server" CMD window to stop it.`;
    } else {
      stateText.textContent = "Server offline";
      hintText.textContent = `Double-click ${LAUNCHER_PATH} to start it. This page will go green on its own.`;
    }
  }

  function setEditorAwake(awake) {
    editorSections.classList.toggle("offline", !awake);
    offlineNote.hidden = awake;
  }

  async function poll() {
    const up = await serverUp();
    render(up);

    if (up && !served) {
      // Opened via file:// and the server just came up: switch to the served
      // copy so the directory, metrics, and editor all load.
      location.replace(`${BASE}/`);
      return;
    }

    setEditorAwake(up && served);
    setTimeout(poll, up ? 5000 : 2000);
  }

  // Dashboard icons toggle — read by src/core/dashboard-control.js on every page.
  const KEY = "elastic-dashboard-icons";
  const toggle = document.getElementById("dash-icons-toggle");

  try {
    toggle.checked = localStorage.getItem(KEY) !== "off";
  } catch {
    toggle.checked = true;
  }

  toggle.addEventListener("change", () => {
    try {
      localStorage.setItem(KEY, toggle.checked ? "on" : "off");
    } catch {
      // localStorage unavailable; the icons simply stay at their default.
    }
  });

  setEditorAwake(false);
  poll();
})();
