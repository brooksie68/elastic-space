// Admin panel shell: server status light, file:// -> served auto-switch,
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
  const editorSections = [...document.querySelectorAll(".editor-sections")];
  const offlineNotes = [...document.querySelectorAll(".offline-note")];

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
    for (const sections of editorSections) {
      sections.classList.toggle("offline", !awake);
    }
    for (const note of offlineNotes) {
      note.hidden = awake;
    }
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
  const pagesLists = [...document.querySelectorAll(".pages-list")];
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
      pagesLists[pagesLists.length - 1].after(archiveStatusLine);
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

  // --- Status moves ------------------------------------------------------
  // The worlds panel has two lists; the kebab menu offers a move to whichever
  // one the row is not in. The server rewrites index.html to match.
  const LIST_LABELS = {
    "in-progress": "In progress worlds",
    completed: "Completed worlds",
  };

  function listFor(status) {
    return pagesLists.find(
      (list) => list.getAttribute("aria-label") === LIST_LABELS[status],
    );
  }

  function sortKeyFor(text) {
    return text.trim().replace(/^the\s+/i, "").toLowerCase();
  }

  // Insert a row alphabetically (ignoring a leading "The"); rows without a
  // world slug (Welcome) are never insertion points, so Welcome stays on top —
  // and when Welcome itself moves, it pins to the top of the target list.
  function insertRowSorted(list, row) {
    if (!worldSlugFor(row.querySelector("a"))) {
      list.prepend(row);
      return;
    }
    const key = sortKeyFor(row.querySelector("a").textContent);
    for (const entry of list.children) {
      if (entry === row) {
        continue;
      }
      const anchor = entry.matches("a") ? entry : entry.querySelector("a");
      if (!anchor || !worldSlugFor(anchor)) {
        continue;
      }
      if (key < sortKeyFor(anchor.textContent)) {
        list.insertBefore(row, entry);
        return;
      }
    }
    list.append(row);
  }

  async function moveWorldRow(slug, title, row, moveItem) {
    const inCompleted = row.closest(".pages-list") === listFor("completed");
    const target = inCompleted ? "in-progress" : "completed";

    try {
      const response = await fetch(`/api/worlds/${slug}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Move failed (${response.status}).`);
      }

      insertRowSorted(listFor(target), row);
      moveItem.textContent =
        target === "completed" ? "move to in progress" : "move to completed";
      flashArchiveStatus(`"${title}" moved to ${LIST_LABELS[target].toLowerCase()}.`);
    } catch (error) {
      flashArchiveStatus(error.message, true);
    }
  }

  // Each world row ends in a kebab (⋮) menu; destructive choices like
  // archive live inside it, out of sight until asked for.
  let openKebab = null;

  function closeKebab() {
    if (!openKebab) {
      return;
    }
    openKebab.menu.hidden = true;
    openKebab.button.setAttribute("aria-expanded", "false");
    openKebab = null;
  }

  document.addEventListener("click", (event) => {
    if (openKebab && !openKebab.wrap.contains(event.target)) {
      closeKebab();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openKebab) {
      const { button } = openKebab;
      closeKebab();
      button.focus();
    }
  });

  function injectArchiveButtons() {
    if (archiveButtonsReady || !served || pagesLists.length === 0) {
      return;
    }
    archiveButtonsReady = true;

    const anchors = pagesLists.flatMap((list) => [...list.querySelectorAll("a")]);
    for (const anchor of anchors) {
      if (anchor.classList.contains("curate-link")) {
        continue;
      }

      // Welcome is a root-level page, not a world folder: it gets the move
      // option (the server special-cases the "welcome" slug) but never archive.
      const isWelcome = (anchor.getAttribute("href") || "") === "./welcome.html";
      const slug = isWelcome ? "welcome" : worldSlugFor(anchor);
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

      const note = anchor.querySelector(".page-note");
      const title = (note ? anchor.textContent.replace(note.textContent, "") : anchor.textContent).trim();

      const wrap = document.createElement("div");
      wrap.className = "kebab-wrap";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "kebab-button";
      button.textContent = "⋮";
      button.setAttribute("aria-label", `Options for ${title}`);
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");

      const menu = document.createElement("div");
      menu.className = "kebab-menu";
      menu.setAttribute("role", "menu");
      menu.hidden = true;

      const inCompleted = anchor.closest(".pages-list") === listFor("completed");
      const moveItem = document.createElement("button");
      moveItem.type = "button";
      moveItem.className = "kebab-item";
      moveItem.setAttribute("role", "menuitem");
      moveItem.textContent = inCompleted ? "move to in progress" : "move to completed";
      moveItem.addEventListener("click", () => {
        closeKebab();
        moveWorldRow(slug, title, row, moveItem);
      });

      menu.append(moveItem);

      if (!isWelcome) {
        const archiveItem = document.createElement("button");
        archiveItem.type = "button";
        archiveItem.className = "kebab-item danger";
        archiveItem.setAttribute("role", "menuitem");
        archiveItem.textContent = "archive";
        archiveItem.addEventListener("click", () => {
          closeKebab();
          confirmArchive(slug, title, row);
        });
        menu.append(archiveItem);
      }

      button.addEventListener("click", () => {
        const isOpen = openKebab && openKebab.button === button;
        closeKebab();
        if (!isOpen) {
          menu.hidden = false;
          button.setAttribute("aria-expanded", "true");
          openKebab = { wrap, button, menu };
        }
      });

      wrap.append(button, menu);
      row.append(wrap);
    }
  }

  // Tabs: "worlds" (pages list + site chrome), "world editor" (metadata form,
  // file editors), and "drafts". Worlds is the default on every load.
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
