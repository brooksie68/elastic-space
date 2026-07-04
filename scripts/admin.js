const state = {
  activeSlug: null,
  detail: null,
  mode: "idle",
  tree: null,
  worlds: [],
};

const form = document.getElementById("world-form");
const summaryStrip = document.getElementById("summary-strip");
const treeRoot = document.getElementById("tree-root");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const refreshButton = document.getElementById("refresh-button");
const newWorldButton = document.getElementById("new-world-button");
const saveButton = document.getElementById("save-button");
const deleteButton = document.getElementById("delete-button");
const previewLink = document.getElementById("preview-link");
const editorTitle = document.getElementById("editor-title");
const editorPath = document.getElementById("editor-path");
const outboundList = document.getElementById("outbound-list");
const inboundList = document.getElementById("inbound-list");
const formStatus = document.getElementById("form-status");

function splitList(value) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function createEmptyDetail() {
  return {
    slug: "",
    title: "",
    creators: ["unknown signal"],
    status: "draft",
    summary: "",
    tags: [],
    moods: [],
    contentType: "hybrid",
    entryPoints: ["direct"],
    exits: [],
    weight: 5,
    rarity: "common",
    era: "first-wave",
    warnings: [],
    soundtrack: [],
    admin: {
      owner: "unknown signal",
      notes: "",
      featured: false,
      editable: true,
      driftEnabled: true,
      hiddenFromDirectory: false,
    },
    files: {
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New World</title>
    <link rel="stylesheet" href="./world.css" />
  </head>
  <body>
    <main class="world-shell">
      <section class="world-copy">
        <p class="label">new world</p>
        <h1>New World</h1>
        <p>Replace this starter atmosphere with the real page.</p>
      </section>
      <nav class="portals" aria-label="world routes">
        <a class="portal" href="/">home</a>
      </nav>
    </main>
    <script src="./world.js" defer></script>
  </body>
</html>
`,
      "world.css": `:root {
  color-scheme: dark;
  --bg: #041116;
  --panel: rgba(10, 28, 34, 0.74);
  --line: rgba(160, 255, 236, 0.28);
  --text: #ecfff8;
  --muted: rgba(236, 255, 248, 0.74);
  --accent: #8fffe1;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at 20% 20%, rgba(143, 255, 225, 0.18), transparent 24%),
    radial-gradient(circle at 80% 30%, rgba(101, 212, 255, 0.16), transparent 26%),
    linear-gradient(180deg, #02070d, var(--bg));
  color: var(--text);
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
}

body {
  display: grid;
  place-items: center;
  padding: 2rem;
}

.world-shell {
  width: min(72rem, 100%);
  display: grid;
  gap: 1.5rem;
}

.world-copy,
.portals {
  backdrop-filter: blur(18px);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 1.5rem;
  padding: 1.5rem;
}

.label {
  color: var(--accent);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  margin: 0 0 1rem;
  text-transform: uppercase;
}

h1 {
  font-family: "Palatino Linotype", "Book Antiqua", serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 400;
  margin: 0 0 1rem;
}

p {
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.portals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.portal {
  border: 1px solid rgba(160, 255, 236, 0.3);
  border-radius: 999px;
  color: var(--text);
  padding: 0.8rem 1rem;
  text-decoration: none;
}
`,
      "world.js": `document.documentElement.dataset.world = "new-world";
`,
    },
    inbound: [],
    outbound: [],
    publicPath: "",
    folderPath: "src/worlds",
  };
}

function setStatus(message, kind = "info") {
  formStatus.textContent = message;
  formStatus.className = `form-status${kind === "error" ? " error" : ""}`;
}

function getWorldBySlug(slug) {
  return state.worlds.find((world) => world.slug === slug) || null;
}

function worldMatchesFilters(world) {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filterStatus = statusFilter.value;

  if (filterStatus !== "all" && world.status !== filterStatus) {
    return false;
  }

  if (!searchTerm) {
    return true;
  }

  const haystack = [
    world.title,
    world.slug,
    world.summary,
    ...(world.creators ?? []),
    ...(world.tags ?? []),
    ...(world.moods ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm);
}

function renderSummary() {
  const counts = {
    total: state.worlds.length,
    live: state.worlds.filter((world) => world.status === "live").length,
    draft: state.worlds.filter((world) => world.status === "draft").length,
    hidden: state.worlds.filter((world) => world.status === "hidden").length,
    retired: state.worlds.filter((world) => world.status === "retired").length,
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

function filteredSlugSet() {
  return new Set(state.worlds.filter(worldMatchesFilters).map((world) => world.slug));
}

function nodeHasVisibleWorld(node, visibleSlugs) {
  if (node.slug && visibleSlugs.has(node.slug)) {
    return true;
  }

  if (!node.children) {
    return false;
  }

  return node.children.some((child) => nodeHasVisibleWorld(child, visibleSlugs));
}

function openFileEditor(fileName) {
  const editor = document.querySelector(`[data-file="${fileName}"]`);
  if (!editor) {
    return;
  }

  editor.scrollIntoView({ behavior: "smooth", block: "center" });
  editor.focus();
}

async function loadWorld(slug, focusFile = "") {
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
  renderTree();
  if (focusFile) {
    openFileEditor(focusFile);
  }
}

function createTreeNode(node, visibleSlugs) {
  if (!nodeHasVisibleWorld(node, visibleSlugs) && node.path !== "src/worlds") {
    return null;
  }

  if (node.kind === "file") {
    const fileButton = document.createElement("button");
    fileButton.className = `tree-file${node.slug === state.activeSlug ? " active" : ""}`;
    fileButton.type = "button";
    fileButton.innerHTML = `<span class="tree-label"><span>${node.name}</span></span>`;
    fileButton.addEventListener("click", async () => {
      if (!node.slug) {
        return;
      }
      await loadWorld(node.slug, node.name);
    });
    return fileButton;
  }

  const branch = document.createElement("div");
  branch.className = "tree-branch";

  const world = node.slug ? getWorldBySlug(node.slug) : null;
  if (world) {
    const button = document.createElement("button");
    button.className = `tree-folder${world.slug === state.activeSlug ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="tree-label">
        <strong>${node.name}</strong>
        <span class="tree-meta">${world.title}</span>
      </span>
      <span class="tree-status">${world.status}</span>
    `;
    button.addEventListener("click", async () => {
      await loadWorld(world.slug);
    });
    branch.append(button);
  } else {
    const label = document.createElement("p");
    label.className = "tree-meta";
    label.textContent = node.name;
    branch.append(label);
  }

  if (node.children?.length) {
    node.children.forEach((child) => {
      const childNode = createTreeNode(child, visibleSlugs);
      if (childNode) {
        branch.append(childNode);
      }
    });
  }

  return branch;
}

function renderTree() {
  treeRoot.replaceChildren();

  if (!state.tree) {
    treeRoot.innerHTML = '<p class="empty-state">No folder tree loaded yet.</p>';
    return;
  }

  const visibleSlugs = filteredSlugSet();
  const tree = createTreeNode(state.tree, visibleSlugs);

  if (!tree || visibleSlugs.size === 0) {
    treeRoot.innerHTML = '<p class="empty-state">No worlds match the current filter.</p>';
    return;
  }

  treeRoot.append(tree);
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
  deleteButton.disabled = state.mode !== "edit";
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
  const [worldsResponse, treeResponse] = await Promise.all([
    fetch("/api/worlds"),
    fetch("/api/worlds/tree"),
  ]);

  if (!worldsResponse.ok || !treeResponse.ok) {
    throw new Error("Unable to refresh the map room.");
  }

  state.worlds = await worldsResponse.json();
  state.tree = await treeResponse.json();

  renderSummary();
  renderTree();

  if (preferredSlug && getWorldBySlug(preferredSlug)) {
    await loadWorld(preferredSlug);
    return;
  }

  if (state.mode !== "create" && state.worlds[0]) {
    await loadWorld(state.worlds[0].slug);
  }
}

function beginCreate() {
  state.mode = "create";
  state.activeSlug = null;
  state.detail = createEmptyDetail();
  fillForm(state.detail);
  renderRelationships(state.detail);
  renderTree();
  setStatus("Drafting a new page. Save to create its folder and files.");
}

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
  beginCreate();
});

searchInput.addEventListener("input", () => {
  renderTree();
});

statusFilter.addEventListener("change", () => {
  renderTree();
});

deleteButton.addEventListener("click", async () => {
  if (!state.activeSlug || state.mode !== "edit") {
    return;
  }

  if (!window.confirm(`Delete "${state.activeSlug}" and its folder?`)) {
    return;
  }

  setStatus("Deleting page...");

  try {
    const response = await fetch(`/api/worlds/${state.activeSlug}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Delete failed.");
    }

    state.activeSlug = null;
    state.detail = null;
    await refresh();
    setStatus("Page deleted.");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving changes...");
  saveButton.disabled = true;

  try {
    const payload = serializeForm();
    const isCreate = state.mode === "create" || !state.activeSlug;
    const response = await fetch(isCreate ? "/api/worlds" : `/api/worlds/${state.activeSlug}`, {
      method: isCreate ? "POST" : "PUT",
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

refresh().catch((error) => {
  setStatus(error.message, "error");
});
