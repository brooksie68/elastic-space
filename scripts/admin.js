const state = {
  activeSlug: null,
  archived: [],
  detail: null,
  drafts: [],
  mode: "idle",
  worlds: [],
};

const form = document.getElementById("world-form");
const summaryStrip = document.getElementById("summary-strip");
const refreshButton = document.getElementById("refresh-button");
const newWorldButton = document.getElementById("new-world-button");
const saveButton = document.getElementById("save-button");
const worldPicker = document.getElementById("world-picker");
const previewLink = document.getElementById("preview-link");
const editorTitle = document.getElementById("editor-title");
const editorPath = document.getElementById("editor-path");
const outboundList = document.getElementById("outbound-list");
const inboundList = document.getElementById("inbound-list");
const formStatus = document.getElementById("form-status");

const draftsStatus = document.getElementById("drafts-status");
const draftsList = document.getElementById("drafts-list");
const draftDialog = document.getElementById("draft-dialog");
const draftDialogTitle = document.getElementById("draft-dialog-title");
const draftError = document.getElementById("draft-error");
const draftCancelButton = document.getElementById("draft-cancel");
const draftSaveButton = document.getElementById("draft-save");
const draftEngageButton = document.getElementById("draft-engage");
const draftFields = {
  title: document.getElementById("draft-title"),
  synopsis: document.getElementById("draft-synopsis"),
  vibe: document.getElementById("draft-vibe"),
  links: document.getElementById("draft-links"),
  sound: document.getElementById("draft-sound"),
  ideas: document.getElementById("draft-ideas"),
};
let activeDraftId = null;

function splitList(value) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function setStatus(message, kind = "info") {
  formStatus.textContent = message;
  formStatus.className = `form-status${kind === "error" ? " error" : ""}`;
}

function getWorldBySlug(slug) {
  return state.worlds.find((world) => world.slug === slug) || null;
}

function renderSummary() {
  // "retired" counts the folders sitting in archive/ plus anything still in
  // src/worlds whose status was set to retired by hand.
  const counts = {
    total: state.worlds.length,
    live: state.worlds.filter((world) => world.status === "live").length,
    draft: state.worlds.filter((world) => world.status === "draft").length,
    retired:
      state.archived.length +
      state.worlds.filter((world) => world.status === "retired").length,
  };

  summaryStrip.replaceChildren(
    ...Object.entries(counts).map(([label, value]) => {
      const card = document.createElement("article");
      card.className = "summary-card";
      card.innerHTML = `<p class="eyebrow">${label}</p><strong>${value}</strong>`;
      return card;
    }),
  );
}

async function loadWorld(slug) {
  const response = await fetch(`/api/worlds/${slug}`);
  if (!response.ok) {
    throw new Error("Unable to load that page.");
  }

  const detail = await response.json();
  state.activeSlug = detail.slug;
  state.detail = detail;
  state.mode = "edit";
  fillForm(detail);
  renderRelationships(detail);
  if (worldPicker.value !== detail.slug) {
    worldPicker.value = detail.slug;
  }
}

function populateWorldPicker() {
  const sorted = [...state.worlds].sort((left, right) =>
    (left.title || left.slug).localeCompare(right.title || right.slug),
  );

  worldPicker.replaceChildren(
    ...sorted.map((world) => {
      const option = document.createElement("option");
      option.value = world.slug;
      option.textContent = world.title || world.slug;
      return option;
    }),
  );

  if (state.activeSlug && getWorldBySlug(state.activeSlug)) {
    worldPicker.value = state.activeSlug;
  }
}

function fillForm(detail) {
  form.elements.title.value = detail.title ?? "";
  form.elements.slug.value = detail.slug ?? "";
  form.elements.status.value = detail.status ?? "draft";
  form.elements.contentType.value = detail.contentType ?? "hybrid";
  form.elements.creators.value = formatList(detail.creators);
  form.elements.owner.value = detail.admin?.owner ?? "";
  form.elements.summary.value = detail.summary ?? "";
  form.elements.tags.value = formatList(detail.tags);
  form.elements.moods.value = formatList(detail.moods);
  form.elements.entryPoints.value = formatList(detail.entryPoints);
  form.elements.weight.value = detail.weight ?? 5;
  form.elements.rarity.value = detail.rarity ?? "common";
  form.elements.era.value = detail.era ?? "";
  form.elements.warnings.value = formatList(detail.warnings);
  form.elements.soundtrack.value = formatList(detail.soundtrack);
  form.elements.featured.checked = Boolean(detail.admin?.featured);
  form.elements.editable.checked = detail.admin?.editable !== false;
  form.elements.driftEnabled.checked = detail.admin?.driftEnabled !== false;
  form.elements.hiddenFromDirectory.checked = Boolean(detail.admin?.hiddenFromDirectory);
  form.elements.exits.value = JSON.stringify(detail.exits ?? [], null, 2);
  form.elements.notes.value = detail.admin?.notes ?? "";
  form.elements.fileIndex.value = detail.files?.["index.html"] ?? "";
  form.elements.fileCss.value = detail.files?.["world.css"] ?? "";
  form.elements.fileJs.value = detail.files?.["world.js"] ?? "";

  editorTitle.textContent = detail.title || "New page";
  editorPath.textContent = `${detail.folderPath || "src/worlds"}${detail.publicPath ? ` · ${detail.publicPath}` : ""}`;
  previewLink.href = detail.publicPath || "/";
  previewLink.classList.toggle("disabled", !detail.publicPath);
}

function renderRelationships(detail) {
  const renderChip = (target, label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "relation-chip";
    button.innerHTML = `${target.title || target.slug}<small>${label}</small>`;
    button.addEventListener("click", async () => {
      if (target.slug) {
        await loadWorld(target.slug);
      }
    });
    return button;
  };

  outboundList.replaceChildren();
  inboundList.replaceChildren();

  if ((detail.outbound ?? []).length === 0) {
    outboundList.innerHTML = '<p class="empty-state">No outbound routes.</p>';
  } else {
    detail.outbound.forEach((route) => {
      const targetWorld = getWorldBySlug(route.slug);
      outboundList.append(
        renderChip(
          {
            slug: route.slug,
            title: targetWorld?.title || route.slug,
          },
          `${route.mode}${route.reason ? ` · ${route.reason}` : ""}`,
        ),
      );
    });
  }

  if ((detail.inbound ?? []).length === 0) {
    inboundList.innerHTML = '<p class="empty-state">No inbound routes.</p>';
  } else {
    detail.inbound.forEach((route) => {
      inboundList.append(
        renderChip(
          {
            slug: route.slug,
            title: route.title || route.slug,
          },
          `${route.mode}${route.reason ? ` · ${route.reason}` : ""}`,
        ),
      );
    });
  }
}

function serializeForm() {
  let exits;

  try {
    exits = JSON.parse(form.elements.exits.value || "[]");
  } catch {
    throw new Error("Route rules JSON is malformed.");
  }

  return {
    world: {
      title: form.elements.title.value.trim(),
      slug: form.elements.slug.value.trim(),
      status: form.elements.status.value,
      contentType: form.elements.contentType.value,
      creators: splitList(form.elements.creators.value),
      summary: form.elements.summary.value.trim(),
      tags: splitList(form.elements.tags.value),
      moods: splitList(form.elements.moods.value),
      entryPoints: splitList(form.elements.entryPoints.value),
      exits,
      weight: Number(form.elements.weight.value) || 0,
      rarity: form.elements.rarity.value,
      era: form.elements.era.value.trim(),
      warnings: splitList(form.elements.warnings.value),
      soundtrack: splitList(form.elements.soundtrack.value),
      admin: {
        owner: form.elements.owner.value.trim(),
        notes: form.elements.notes.value,
        featured: form.elements.featured.checked,
        editable: form.elements.editable.checked,
        driftEnabled: form.elements.driftEnabled.checked,
        hiddenFromDirectory: form.elements.hiddenFromDirectory.checked,
      },
    },
    files: {
      "index.html": form.elements.fileIndex.value,
      "world.css": form.elements.fileCss.value,
      "world.js": form.elements.fileJs.value,
    },
  };
}

async function refresh(preferredSlug = state.activeSlug) {
  const [worldsResponse, archiveResponse, draftsResponse] = await Promise.all([
    fetch("/api/worlds"),
    fetch("/api/archive"),
    fetch("/api/drafts"),
  ]);

  if (!worldsResponse.ok) {
    throw new Error("Unable to refresh the world list.");
  }

  state.worlds = await worldsResponse.json();
  state.archived = archiveResponse.ok ? await archiveResponse.json() : [];
  state.drafts = draftsResponse.ok ? await draftsResponse.json() : [];

  renderSummary();
  populateWorldPicker();
  renderDrafts();

  if (preferredSlug && getWorldBySlug(preferredSlug)) {
    await loadWorld(preferredSlug);
    return;
  }

  if (state.worlds[0]) {
    await loadWorld(state.worlds[0].slug);
  }
}

// --- Page drafts ----------------------------------------------------------

function setDraftsStatus(message, kind = "info") {
  draftsStatus.textContent = message;
  draftsStatus.classList.toggle("error", kind === "error");
}

function renderDrafts() {
  draftsList.replaceChildren();

  if (state.drafts.length === 0) {
    draftsList.innerHTML = '<p class="empty-state">No drafts yet — "new draft" starts one.</p>';
    return;
  }

  for (const draft of state.drafts) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "draft-card";

    const title = document.createElement("strong");
    title.textContent = draft.title;
    const synopsis = document.createElement("span");
    synopsis.className = "draft-syn";
    synopsis.textContent = draft.synopsis || "";
    const chip = document.createElement("span");
    chip.className = `draft-chip${draft.status === "engaged" ? " engaged" : ""}`;
    chip.textContent = draft.status;

    card.append(title, synopsis, chip);
    card.addEventListener("click", () => {
      openDraftDialog(draft);
    });
    draftsList.append(card);
  }
}

function openDraftDialog(draft) {
  activeDraftId = draft?.id ?? null;
  draftDialogTitle.textContent = draft ? `Draft: ${draft.title}` : "New page draft";
  draftFields.title.value = draft?.title ?? "";
  draftFields.synopsis.value = draft?.synopsis ?? "";
  draftFields.vibe.value = draft?.vibe ?? "";
  draftFields.links.value = draft?.links ?? "";
  draftFields.sound.value = draft?.sound ?? "";
  draftFields.ideas.value = draft?.ideas ?? "";
  draftError.textContent = "";
  draftError.hidden = true;
  draftEngageButton.disabled = draft?.status === "engaged";
  draftEngageButton.textContent = draft?.status === "engaged" ? "engaged" : "engage";
  draftDialog.showModal();
  draftFields.title.focus();
}

async function persistDraft() {
  const payload = {
    title: draftFields.title.value.trim(),
    synopsis: draftFields.synopsis.value.trim(),
    vibe: draftFields.vibe.value.trim(),
    links: draftFields.links.value.trim(),
    sound: draftFields.sound.value.trim(),
    ideas: draftFields.ideas.value.trim(),
  };

  if (!payload.title) {
    throw new Error("A draft needs at least a title.");
  }

  const response = await fetch(activeDraftId ? `/api/drafts/${activeDraftId}` : "/api/drafts", {
    method: activeDraftId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Saving the draft failed.");
  }

  activeDraftId = result.id;
  return result;
}

function showDraftError(error) {
  draftError.textContent = error.message;
  draftError.hidden = false;
}

draftSaveButton.addEventListener("click", async () => {
  try {
    const draft = await persistDraft();
    draftDialog.close();
    await refresh();
    setDraftsStatus(`Draft "${draft.title}" saved.`);
  } catch (error) {
    showDraftError(error);
  }
});

draftEngageButton.addEventListener("click", async () => {
  try {
    const draft = await persistDraft();
    const go = window.confirm(
      `Engage "${draft.title}"? It goes on the session todo, and the next session will pick it up, ask questions or show a plan, and wait for your go.`,
    );
    if (!go) {
      return;
    }

    const response = await fetch(`/api/drafts/${draft.id}/engage`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Engage failed.");
    }

    draftDialog.close();
    await refresh();
    setDraftsStatus(`"${draft.title}" engaged — queued for the next session.`);
  } catch (error) {
    showDraftError(error);
  }
});

draftCancelButton.addEventListener("click", () => {
  draftDialog.close();
});

// --- Wiring ----------------------------------------------------------------

refreshButton.addEventListener("click", async () => {
  setStatus("Refreshing directory...");
  try {
    await refresh();
    setStatus("Directory refreshed.");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

newWorldButton.addEventListener("click", () => {
  openDraftDialog(null);
});

worldPicker.addEventListener("change", async () => {
  try {
    await loadWorld(worldPicker.value);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.activeSlug) {
    setStatus("No world loaded yet.", "error");
    return;
  }

  setStatus("Saving changes...");
  saveButton.disabled = true;

  try {
    const payload = serializeForm();
    const response = await fetch(`/api/worlds/${state.activeSlug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Save failed.");
    }

    await refresh(result.slug);
    setStatus("Page saved.");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
});

// The admin panel also opens via file:// (before the server is started); the
// editor only self-loads when the page is actually served.
if (location.protocol === "http:" || location.protocol === "https:") {
  refresh().catch((error) => {
    setStatus(error.message, "error");
  });
}
