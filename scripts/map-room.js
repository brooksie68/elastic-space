// Map room page logic: server status light, file:// -> served auto-switch,
// dashboard-icons toggle, and waking the editor panels when the server is up.
// The world editor itself lives in admin.js.

(function () {
  const PORT = 4174;
  const BASE = `http://127.0.0.1:${PORT}`;
  const LAUNCHER_PATH = "C:\\Users\\brook\\ai-projects\\elastic-space\\start-elastic-space.cmd";
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
      hintText.textContent = BASE;
      hintText.removeAttribute("title");
    } else {
      stateText.textContent = "Server offline";
      hintText.textContent = "double-click start-elastic-space.cmd";
      hintText.title = LAUNCHER_PATH;
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
    if (up && served) {
      injectArchiveButtons();
    }
    setTimeout(poll, up ? 5000 : 2000);
  }

  // --- Archive buttons ---------------------------------------------------
  // Archiving moves src/worlds/<slug> into archive/ through the server API,
  // so the buttons only appear on the served copy once the server is up.
  const pagesList = document.querySelector(".pages-list");
  let archiveButtonsReady = false;
  let archiveDialog = null;
  let archivePending = null;
  let archiveStatusLine = null;
  let archiveStatusTimer = 0;

  function worldSlugFor(anchor) {
    const match = (anchor.getAttribute("href") || "").match(
      /src\/worlds\/([a-z0-9-]+)\/index\.html$/,
    );
    return match ? match[1] : null;
  }

  function flashArchiveStatus(message, isError) {
    if (!archiveStatusLine) {
      archiveStatusLine = document.createElement("p");
      archiveStatusLine.className = "small archive-status";
      pagesList.after(archiveStatusLine);
    }
    archiveStatusLine.textContent = message;
    archiveStatusLine.classList.toggle("error", Boolean(isError));
    clearTimeout(archiveStatusTimer);
    archiveStatusTimer = setTimeout(() => {
      archiveStatusLine.textContent = "";
    }, 8000);
  }

  function ensureArchiveDialog() {
    if (archiveDialog) {
      return archiveDialog;
    }

    archiveDialog = document.createElement("dialog");
    archiveDialog.className = "archive-dialog";
    archiveDialog.innerHTML =
      '<h3 class="archive-heading"></h3>' +
      '<p class="archive-copy">This moves it out of Elastic Space into the archive: ' +
      "it disappears from drift, from this panel, and from the worlds directory. " +
      'The folder lands in <code></code> if you ever want it back.</p>' +
      '<p class="archive-error" hidden></p>' +
      '<div class="archive-actions">' +
      '<button type="button" class="button ghost" data-act="cancel">cancel</button>' +
      '<button type="button" class="button danger" data-act="archive">archive</button>' +
      "</div>";
    document.body.append(archiveDialog);

    archiveDialog.querySelector('[data-act="cancel"]').addEventListener("click", () => {
      archiveDialog.close();
    });
    archiveDialog.querySelector('[data-act="archive"]').addEventListener("click", performArchive);
    return archiveDialog;
  }

  function confirmArchive(slug, title, row) {
    const dialogElement = ensureArchiveDialog();
    archivePending = { slug, title, row };
    dialogElement.querySelector(".archive-heading").textContent = `Archive "${title}"?`;
    dialogElement.querySelector(".archive-copy code").textContent = `archive/${slug}`;
    const errorLine = dialogElement.querySelector(".archive-error");
    errorLine.textContent = "";
    errorLine.hidden = true;
    dialogElement.showModal();
  }

  async function performArchive() {
    if (!archivePending) {
      return;
    }

    const { slug, title, row } = archivePending;
    const archiveButton = archiveDialog.querySelector('[data-act="archive"]');
    const cancelButton = archiveDialog.querySelector('[data-act="cancel"]');
    const errorLine = archiveDialog.querySelector(".archive-error");

    archiveButton.disabled = true;
    cancelButton.disabled = true;
    archiveButton.textContent = "archiving…";
    errorLine.hidden = true;

    try {
      const response = await fetch(`/api/worlds/${slug}/archive`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Archive failed (${response.status}).`);
      }

      archivePending = null;
      archiveDialog.close();
      row.remove();
      flashArchiveStatus(
        `"${title}" moved to archive/${slug}.${result.warning ? ` ${result.warning}` : ""}`,
        Boolean(result.warning),
      );
    } catch (error) {
      errorLine.textContent = error.message;
      errorLine.hidden = false;
    } finally {
      archiveButton.disabled = false;
      cancelButton.disabled = false;
      archiveButton.textContent = "archive";
    }
  }

  function injectArchiveButtons() {
    if (archiveButtonsReady || !served || !pagesList) {
      return;
    }
    archiveButtonsReady = true;

    for (const anchor of [...pagesList.querySelectorAll("a")]) {
      if (anchor.classList.contains("curate-link")) {
        continue;
      }

      const slug = worldSlugFor(anchor);
      if (!slug) {
        continue;
      }

      let row = anchor.closest(".page-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "page-row";
        anchor.before(row);
        row.append(anchor);
      }

      const title = anchor.textContent.trim();
      const button = document.createElement("button");
      button.type = "button";
      button.className = "archive-button";
      button.textContent = "archive";
      button.setAttribute("aria-label", `Archive ${title}`);
      button.addEventListener("click", () => {
        confirmArchive(slug, title, row);
      });
      row.append(button);
    }
  }

  // Tabs: "worlds" (pages list + site chrome) and "world editor" (directory
  // tree, metadata form, file editors). Worlds is the default on every load.
  const tabButtons = [...document.querySelectorAll('.tab-bar [role="tab"]')];

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      for (const other of tabButtons) {
        const selected = other === button;
        other.classList.toggle("active", selected);
        other.setAttribute("aria-selected", String(selected));
        const panel = document.getElementById(other.getAttribute("aria-controls"));
        if (panel) {
          panel.hidden = !selected;
        }
      }
    });
  });

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
