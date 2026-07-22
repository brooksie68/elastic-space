import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { basename, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const worldsDir = join(rootDir, "src", "worlds");
const archiveDir = join(rootDir, "archive");
const host = process.env.ELASTIC_SPACE_HOST || "127.0.0.1";
const port = Number(process.env.ELASTIC_SPACE_PORT || "4174");

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ts": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const reservedWorldDirs = new Set(["_template"]);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    // The admin panel polls /healthz from file:// before switching to the served
    // copy; a cross-origin allow is required for that first probe to succeed.
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, status, text) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(text);
}

function cacheControlFor() {
  // Local dev server: never let the browser hold a stale file. Every request
  // revalidates, so edits show up on a plain refresh.
  return "no-store";
}

function toArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function cloneObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isValidSlug(input) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(input ?? ""));
}

function sortByName(items) {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { numeric: true }),
  );
}

function defaultWorld(slug, title = "Untitled World") {
  return {
    slug,
    title,
    creators: ["unknown signal"],
    status: "draft",
    summary: "A new corridor waiting for an atmosphere.",
    tags: ["art", "interactive"],
    moods: ["strange"],
    contentType: "hybrid",
    entryPoints: ["direct"],
    exits: [],
    weight: 5,
    rarity: "common",
    era: "first-wave",
    warnings: [],
    soundtrack: [],
    behavior: {
      autoplayAudio: false,
      hideChrome: true,
      injectDriftLinks: false,
      allowComments: false,
      allowRemixRoutes: false,
    },
    admin: {
      owner: "unknown signal",
      notes: "",
      featured: false,
      directoryOrder: 0,
      editable: true,
      driftEnabled: true,
      hiddenFromDirectory: false,
      contentPath: `src/worlds/${slug}`,
      assetPaths: [`src/worlds/${slug}`],
    },
  };
}

function normalizeWorld(rawWorld, fallbackSlug) {
  const raw = cloneObject(rawWorld);
  const slug = slugify(raw.slug || fallbackSlug);
  const base = defaultWorld(slug, raw.title ? String(raw.title) : undefined);

  return {
    ...base,
    ...raw,
    slug,
    title: raw.title ? String(raw.title).trim() : base.title,
    creators: toArray(raw.creators).length ? toArray(raw.creators) : base.creators,
    summary: raw.summary ? String(raw.summary).trim() : base.summary,
    tags: toArray(raw.tags),
    moods: toArray(raw.moods),
    entryPoints: toArray(raw.entryPoints),
    exits: Array.isArray(raw.exits)
      ? raw.exits
          .map((exitRule) => {
            const exitObject = cloneObject(exitRule);
            const targetSlug = slugify(exitObject.targetSlug);
            if (!targetSlug) {
              return null;
            }

            return {
              targetSlug,
              mode: ["fixed", "weighted", "conditional", "secret"].includes(exitObject.mode)
                ? exitObject.mode
                : "fixed",
              weight:
                exitObject.weight === undefined || exitObject.weight === null
                  ? undefined
                  : Number(exitObject.weight) || 0,
              conditions: toArray(exitObject.conditions),
              reason: exitObject.reason ? String(exitObject.reason).trim() : "",
            };
          })
          .filter(Boolean)
      : base.exits,
    weight: Number(raw.weight) || base.weight,
    rarity: raw.rarity ? String(raw.rarity) : base.rarity,
    era: raw.era ? String(raw.era).trim() : base.era,
    warnings: toArray(raw.warnings),
    soundtrack: toArray(raw.soundtrack),
    behavior: {
      ...base.behavior,
      ...cloneObject(raw.behavior),
    },
    admin: {
      ...base.admin,
      ...cloneObject(raw.admin),
      contentPath: `src/worlds/${slug}`,
      assetPaths:
        toArray(cloneObject(raw.admin).assetPaths).length > 0
          ? toArray(cloneObject(raw.admin).assetPaths)
          : [`src/worlds/${slug}`],
    },
  };
}

function defaultWorldFiles(world) {
  const title = world.title || "Untitled World";
  const summary = world.summary || "A new corridor waiting for an atmosphere.";
  const navigation = [
    { label: "home", href: "/" },
    ...world.exits.slice(0, 3).map((exitRule) => ({
      label: exitRule.targetSlug,
      href: `/worlds/${exitRule.targetSlug}/`,
    })),
  ];

  const navLinks = navigation
    .map(
      (item) =>
        `          <a class="portal" href="${item.href}">${item.label.replace(/-/g, " ")}</a>`,
    )
    .join("\n");

  return {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="./world.css" />
  </head>
  <body>
    <main class="world-shell">
      <section class="world-copy">
        <p class="label">new world</p>
        <h1>${title}</h1>
        <p>${summary}</p>
      </section>
      <nav class="portals" aria-label="world routes">
${navLinks}
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
  max-width: 54ch;
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
    "world.js": `document.documentElement.dataset.world = "${world.slug}";
`,
  };
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Malformed JSON request body.");
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function worldFolderNames() {
  const entries = await readdir(worldsDir, { withFileTypes: true });
  const folders = entries.filter(
    (entry) => entry.isDirectory() && !reservedWorldDirs.has(entry.name),
  );
  const results = [];

  for (const folder of sortByName(folders)) {
    const metadataPath = join(worldsDir, folder.name, "world.json");
    if (await pathExists(metadataPath)) {
      results.push(folder.name);
    }
  }

  return results;
}

async function readWorldRecord(slug) {
  const safeSlug = slugify(slug);
  if (!isValidSlug(safeSlug)) {
    throw new Error("Invalid world slug.");
  }

  const folderPath = join(worldsDir, safeSlug);
  const metadataPath = join(folderPath, "world.json");
  const [metadataText, htmlText, cssText, jsText] = await Promise.all([
    readFile(metadataPath, "utf8"),
    readFile(join(folderPath, "index.html"), "utf8").catch(() => ""),
    readFile(join(folderPath, "world.css"), "utf8").catch(() => ""),
    readFile(join(folderPath, "world.js"), "utf8").catch(() => ""),
  ]);

  const world = normalizeWorld(JSON.parse(metadataText), safeSlug);

  return {
    world,
    files: {
      "index.html": htmlText,
      "world.css": cssText,
      "world.js": jsText,
    },
    folderPath: `src/worlds/${safeSlug}`,
    publicPath: `/worlds/${safeSlug}/`,
  };
}

async function listWorldsDetailed() {
  const slugs = await worldFolderNames();
  const records = await Promise.all(slugs.map((slug) => readWorldRecord(slug)));
  const inboundMap = new Map();

  records.forEach((record) => {
    inboundMap.set(record.world.slug, []);
  });

  records.forEach((record) => {
    record.world.exits.forEach((exitRule) => {
      const inbound = inboundMap.get(exitRule.targetSlug);
      if (!inbound) {
        return;
      }

      inbound.push({
        slug: record.world.slug,
        title: record.world.title,
        mode: exitRule.mode,
        reason: exitRule.reason || "",
      });
    });
  });

  return records.map((record) => ({
    ...record,
    inbound: inboundMap.get(record.world.slug) ?? [],
    outbound: record.world.exits.map((exitRule) => ({
      slug: exitRule.targetSlug,
      mode: exitRule.mode,
      reason: exitRule.reason || "",
    })),
  }));
}

function summarizeWorld(record) {
  return {
    slug: record.world.slug,
    title: record.world.title,
    creators: record.world.creators,
    status: record.world.status,
    summary: record.world.summary,
    tags: record.world.tags,
    moods: record.world.moods,
    contentType: record.world.contentType,
    entryPoints: record.world.entryPoints,
    exits: record.world.exits,
    weight: record.world.weight,
    rarity: record.world.rarity,
    era: record.world.era,
    warnings: record.world.warnings,
    soundtrack: record.world.soundtrack,
    behavior: record.world.behavior,
    admin: record.world.admin,
    folderPath: record.folderPath,
    publicPath: record.publicPath,
    inbound: record.inbound,
    outbound: record.outbound,
  };
}

async function buildTree(currentDir, relativePath = "src/worlds") {
  const entries = sortByName(
    await readdir(currentDir, {
      withFileTypes: true,
    }),
  ).filter((entry) => !entry.name.startsWith("."));

  const children = [];

  for (const entry of entries) {
    if (reservedWorldDirs.has(entry.name)) {
      continue;
    }

    const nextRelativePath = `${relativePath}/${entry.name}`;
    const slug = nextRelativePath.split("/")[2] || null;

    if (entry.isDirectory()) {
      children.push(await buildTree(join(currentDir, entry.name), nextRelativePath));
      continue;
    }

    children.push({
      name: entry.name,
      kind: "file",
      path: nextRelativePath,
      slug,
    });
  }

  return {
    name: basename(currentDir),
    kind: "folder",
    path: relativePath,
    slug: relativePath.split("/")[2] || null,
    children,
  };
}

async function writeWorldRecord(targetSlug, payload) {
  const requestedSlug = slugify(payload?.world?.slug || targetSlug);
  const nextSlug = requestedSlug || slugify(targetSlug);

  if (!isValidSlug(nextSlug)) {
    throw new Error("World slugs must use lowercase letters, numbers, and dashes.");
  }

  const world = normalizeWorld(payload.world, nextSlug);
  const files = {
    ...defaultWorldFiles(world),
    ...cloneObject(payload.files),
  };
  const currentDir = join(worldsDir, slugify(targetSlug));
  const nextDir = join(worldsDir, nextSlug);

  if (targetSlug && slugify(targetSlug) !== nextSlug && (await pathExists(nextDir))) {
    throw new Error("A world with that slug already exists.");
  }

  if (targetSlug && slugify(targetSlug) !== nextSlug && (await pathExists(currentDir))) {
    await rename(currentDir, nextDir);
  } else {
    await mkdir(nextDir, { recursive: true });
  }

  const finalWorld = {
    ...world,
    admin: {
      ...world.admin,
      contentPath: `src/worlds/${nextSlug}`,
      assetPaths:
        toArray(world.admin?.assetPaths).length > 0
          ? toArray(world.admin.assetPaths)
          : [`src/worlds/${nextSlug}`],
    },
  };

  await Promise.all([
    writeFile(join(nextDir, "world.json"), `${JSON.stringify(finalWorld, null, 2)}\n`),
    writeFile(join(nextDir, "index.html"), String(files["index.html"] ?? ""), "utf8"),
    writeFile(join(nextDir, "world.css"), String(files["world.css"] ?? ""), "utf8"),
    writeFile(join(nextDir, "world.js"), String(files["world.js"] ?? ""), "utf8"),
  ]);

  return nextSlug;
}

const draftsPath = join(rootDir, "world-drafts.json");

async function readDrafts() {
  try {
    const parsed = JSON.parse(await readFile(draftsPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeDrafts(drafts) {
  await writeFile(draftsPath, `${JSON.stringify(drafts, null, 2)}\n`, "utf8");
}

function draftFromPayload(payload, existing = {}) {
  const clean = (value) => (typeof value === "string" ? value.trim() : "");
  return {
    ...existing,
    title: clean(payload.title),
    synopsis: clean(payload.synopsis),
    vibe: clean(payload.vibe),
    links: clean(payload.links),
    sound: clean(payload.sound),
    ideas: clean(payload.ideas),
    updated: new Date().toISOString(),
  };
}

// Queue an engaged draft in CLAUDE.md's Todo section so the next session
// sees it on load.
async function addClaudeTodo(line) {
  const claudePath = join(rootDir, "CLAUDE.md");
  const text = await readFile(claudePath, "utf8");
  const lines = text.split("\n");
  const headingAt = lines.findIndex((item) => item.trim() === "## Todo");
  if (headingAt === -1) {
    return false;
  }

  lines.splice(headingAt + 1, 0, "", `- ${line}`);
  await writeFile(claudePath, lines.join("\n"), "utf8");
  return true;
}

async function regenerateWorldRegistry() {
  await execFileAsync(process.execPath, [join(rootDir, "scripts", "generate-world-registry.mjs")], {
    cwd: rootDir,
  });
}

// Locate a world's row in the admin panel's static worlds lists. Rows are
// either a single <a> line or a .page-row <div> wrapping the world link plus
// utility pills (e.g. curate); the file is one element per line. The pseudo-slug
// "welcome" maps to the root-level front door row, which moves between lists
// like any world but pins to the top (its sort key is empty).
function findWorldRowRange(lines, slug) {
  const needle =
    slug === "welcome"
      ? 'href="./welcome.html"'
      : `href="./src/worlds/${slug}/index.html"`;
  const anchorAt = lines.findIndex((line) => line.includes(needle));

  if (anchorAt === -1) {
    return null;
  }

  let start = anchorAt;
  let end = anchorAt;
  let probe = anchorAt - 1;
  while (probe >= 0 && lines[probe].trim().startsWith("<a")) {
    probe -= 1;
  }

  if (probe >= 0 && lines[probe].includes('class="page-row"')) {
    start = probe;
    while (end < lines.length && !lines[end].trim().startsWith("</div>")) {
      end += 1;
    }
    if (end === lines.length) {
      return null;
    }
  }

  return { start, end };
}

// Drop an archived world's row from the admin panel's static worlds lists.
async function removeWorldFromAdminIndex(slug) {
  const indexPath = join(rootDir, "index.html");
  const lines = (await readFile(indexPath, "utf8")).split("\n");
  const range = findWorldRowRange(lines, slug);

  if (!range) {
    return false;
  }

  lines.splice(range.start, range.end - range.start + 1);
  await writeFile(indexPath, lines.join("\n"), "utf8");
  return true;
}

// The lists alphabetize ignoring a leading "The"; non-world rows (Welcome)
// return an empty key and are never used as insertion points.
function worldRowSortKey(rowLines) {
  for (const line of rowLines) {
    const match = line.match(/href="\.\/src\/worlds\/[a-z0-9-]+\/index\.html"[^>]*>([^<]+)</);
    if (match) {
      return match[1].trim().replace(/^the\s+/i, "").toLowerCase();
    }
  }
  return "";
}

// Move a world's row between the admin panel's "In progress worlds" and
// "Completed worlds" lists, preserving alphabetical order.
async function moveWorldRowInAdminIndex(slug, status) {
  const indexPath = join(rootDir, "index.html");
  const lines = (await readFile(indexPath, "utf8")).split("\n");
  const range = findWorldRowRange(lines, slug);

  if (!range) {
    return false;
  }

  const rowLines = lines.splice(range.start, range.end - range.start + 1);
  const navLabel = status === "completed" ? "Completed worlds" : "In progress worlds";
  const navAt = lines.findIndex((line) =>
    line.includes(`<nav class="pages-list" aria-label="${navLabel}"`),
  );

  if (navAt === -1) {
    return false;
  }

  let navEnd = navAt + 1;
  while (navEnd < lines.length && !lines[navEnd].trim().startsWith("</nav>")) {
    navEnd += 1;
  }
  if (navEnd === lines.length) {
    return false;
  }

  const key = worldRowSortKey(rowLines);
  let insertAt = navEnd;
  let cursor = navAt + 1;
  while (cursor < navEnd) {
    const trimmed = lines[cursor].trim();
    let entryEnd = cursor;
    if (trimmed.startsWith('<div class="page-row"')) {
      while (entryEnd < navEnd && !lines[entryEnd].trim().startsWith("</div>")) {
        entryEnd += 1;
      }
    } else if (!trimmed.startsWith("<a")) {
      cursor += 1;
      continue;
    }

    const entryKey = worldRowSortKey(lines.slice(cursor, entryEnd + 1));
    if (entryKey && key < entryKey) {
      insertAt = cursor;
      break;
    }
    cursor = entryEnd + 1;
  }

  lines.splice(insertAt, 0, ...rowLines);
  await writeFile(indexPath, lines.join("\n"), "utf8");
  return true;
}

function resolveStaticPath(pathname) {
  if (pathname === "/") {
    return "/index.html";
  }

  const worldMatch = pathname.match(/^\/worlds\/([a-z0-9-]+)(\/.*)?$/i);
  if (worldMatch) {
    const [, slug, remainder] = worldMatch;
    return remainder && remainder !== "/"
      ? `/src/worlds/${slugify(slug)}${remainder}`
      : `/src/worlds/${slugify(slug)}/index.html`;
  }

  return pathname;
}

function isSafeFilePath(targetPath) {
  const relativePath = relative(rootDir, targetPath);
  return relativePath && !relativePath.startsWith("..") && !normalize(relativePath).startsWith("..");
}

async function serveStatic(request, pathname, response) {
  const requestedPath = resolveStaticPath(pathname);
  const decodedPath = decodeURIComponent(requestedPath.split("?")[0]);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(rootDir, safePath);

  if (!isSafeFilePath(filePath)) {
    sendText(response, 403, "forbidden");
    return;
  }

  try {
    let fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileStat = await stat(filePath);
    }

    const headers = {
      "Content-Type": types[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": cacheControlFor(filePath),
      "Accept-Ranges": "bytes",
    };

    // Byte-range support: media seeking needs 206 partial responses — without
    // them (and with no-store caching) Chrome cannot seek outside buffered
    // audio and restarts the stream from byte zero instead.
    const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? "");
    if (rangeMatch && (rangeMatch[1] || rangeMatch[2])) {
      const size = fileStat.size;
      const start = rangeMatch[1] ? Number(rangeMatch[1]) : Math.max(0, size - Number(rangeMatch[2]));
      const end = rangeMatch[1] && rangeMatch[2] ? Math.min(Number(rangeMatch[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        response.writeHead(416, { "Content-Range": `bytes */${size}` });
        response.end();
        return;
      }
      response.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, { ...headers, "Content-Length": fileStat.size });
    createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, "not found");
  }
}

const artFileExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const layoutSlotKinds = new Set(["wall", "cord", "easel", "lean"]);

// Shape check for a curator-mode layout save. Returns a problem string or null.
// Geometry stays in Blender Z-up meters — the same shape assets/layout.js ships with.
function validateLayout(layout) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    return "Layout must be an object.";
  }
  if (typeof layout.artDir !== "string" || !layout.artDir) {
    return "layout.artDir must be a non-empty string.";
  }
  if (layout.kit && (typeof layout.kit !== "object" || Array.isArray(layout.kit))) {
    return "layout.kit must be an object.";
  }
  if (!Array.isArray(layout.slots)) {
    return "layout.slots must be an array.";
  }

  const seenIds = new Set();
  for (const slot of layout.slots) {
    if (!slot || typeof slot !== "object" || Array.isArray(slot)) {
      return "Every slot must be an object.";
    }
    const label = typeof slot.id === "string" && slot.id ? slot.id : "?";
    if (label === "?") {
      return "Every slot needs a non-empty string id.";
    }
    if (seenIds.has(slot.id)) {
      return `Duplicate slot id "${label}".`;
    }
    seenIds.add(slot.id);

    if (slot.art !== null && typeof slot.art !== "string") {
      return `Slot "${label}": art must be a filename or null.`;
    }
    if (slot.art && /[\\/]|\.\./.test(slot.art)) {
      return `Slot "${label}": art must be a bare filename.`;
    }
    if (!layoutSlotKinds.has(slot.kind)) {
      return `Slot "${label}": unknown kind "${slot.kind}".`;
    }
    if (
      !Array.isArray(slot.pos) ||
      slot.pos.length !== 3 ||
      slot.pos.some((v) => typeof v !== "number" || !Number.isFinite(v))
    ) {
      return `Slot "${label}": pos must be three finite numbers.`;
    }
    for (const key of ["yaw", "w", "h"]) {
      if (typeof slot[key] !== "number" || !Number.isFinite(slot[key])) {
        return `Slot "${label}": ${key} must be a finite number.`;
      }
    }
    if (slot.w <= 0 || slot.h <= 0) {
      return `Slot "${label}": w and h must be positive.`;
    }
    if (typeof slot.style !== "string" || !slot.style) {
      return `Slot "${label}": style must be a non-empty string.`;
    }
    if (slot.slice !== undefined) {
      const ok =
        Array.isArray(slot.slice) &&
        slot.slice.length === 2 &&
        slot.slice.every((v) => Number.isInteger(v)) &&
        slot.slice[1] >= 2 &&
        slot.slice[0] >= 0 &&
        slot.slice[0] < slot.slice[1];
      if (!ok) {
        return `Slot "${label}": slice must be [panelIndex, panelCount].`;
      }
    }
    if (slot.group !== undefined && typeof slot.group !== "string") {
      return `Slot "${label}": group must be a string.`;
    }
    if (slot.flip !== undefined && typeof slot.flip !== "boolean") {
      return `Slot "${label}": flip must be a boolean.`;
    }
  }
  return null;
}

function layoutGlobalName(slug) {
  return `${slug.toUpperCase().replace(/-/g, "_")}_LAYOUT`;
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/worlds" && request.method === "GET") {
    const worlds = await listWorldsDetailed();
    sendJson(response, 200, worlds.map(summarizeWorld));
    return true;
  }

  if (pathname === "/api/worlds/tree" && request.method === "GET") {
    sendJson(response, 200, await buildTree(worldsDir));
    return true;
  }

  if (pathname === "/api/drafts" && request.method === "GET") {
    sendJson(response, 200, await readDrafts());
    return true;
  }

  if (pathname === "/api/drafts" && request.method === "POST") {
    const payload = await readBody(request);
    const draft = draftFromPayload(payload);
    if (!draft.title) {
      sendJson(response, 400, { error: "A draft needs at least a title." });
      return true;
    }

    const drafts = await readDrafts();
    const baseId = slugify(draft.title) || "draft";
    let id = baseId;
    let suffix = 2;
    while (drafts.some((item) => item.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const created = {
      id,
      ...draft,
      status: "draft",
      created: new Date().toISOString(),
    };
    drafts.unshift(created);
    await writeDrafts(drafts);
    sendJson(response, 201, created);
    return true;
  }

  const draftEngageMatch = pathname.match(/^\/api\/drafts\/([a-z0-9-]+)\/engage$/i);
  if (draftEngageMatch && request.method === "POST") {
    const drafts = await readDrafts();
    const draft = drafts.find((item) => item.id === slugify(draftEngageMatch[1]));
    if (!draft) {
      sendJson(response, 404, { error: "Draft not found." });
      return true;
    }

    draft.status = "engaged";
    draft.engaged = new Date().toISOString();
    await writeDrafts(drafts);
    const todoAdded = await addClaudeTodo(
      `Engaged world draft "${draft.title}" — read it in world-drafts.json (id: ${draft.id}). ` +
        "Engage means DISCUSS, not build: ask James your questions, then present a build plan, " +
        "then talk it through with him. Do NOT write any world code — not even a scaffold — " +
        "until he gives an explicit go on the discussed plan. This applies even if the idea " +
        "was originally Claude's.",
    );
    sendJson(response, 200, { ...draft, todoAdded });
    return true;
  }

  const draftMatch = pathname.match(/^\/api\/drafts\/([a-z0-9-]+)$/i);
  if (draftMatch) {
    if (request.method !== "PUT") {
      sendJson(response, 405, { error: "Method not allowed." });
      return true;
    }

    const drafts = await readDrafts();
    const index = drafts.findIndex((item) => item.id === slugify(draftMatch[1]));
    if (index === -1) {
      sendJson(response, 404, { error: "Draft not found." });
      return true;
    }

    const payload = await readBody(request);
    const updated = draftFromPayload(payload, drafts[index]);
    if (!updated.title) {
      sendJson(response, 400, { error: "A draft needs at least a title." });
      return true;
    }

    drafts[index] = updated;
    await writeDrafts(drafts);
    sendJson(response, 200, updated);
    return true;
  }

  if (pathname === "/api/archive" && request.method === "GET") {
    let names = [];
    try {
      const entries = await readdir(archiveDir, { withFileTypes: true });
      names = sortByName(entries.filter((entry) => entry.isDirectory())).map(
        (entry) => entry.name,
      );
    } catch {
      // No archive folder yet — an empty list is the right answer.
    }
    sendJson(response, 200, names);
    return true;
  }

  if (pathname === "/api/worlds" && request.method === "POST") {
    const payload = await readBody(request);
    const requestedSlug = slugify(payload?.world?.slug || payload?.world?.title || "");

    if (!isValidSlug(requestedSlug)) {
      sendJson(response, 400, {
        error: "Provide a title or slug that can be converted into a valid folder name.",
      });
      return true;
    }

    const targetDir = join(worldsDir, requestedSlug);
    if (await pathExists(targetDir)) {
      sendJson(response, 409, { error: "That world slug already exists." });
      return true;
    }

    const slug = await writeWorldRecord(requestedSlug, payload);
    sendJson(response, 201, await readWorldDetail(slug));
    return true;
  }

  const archiveMatch = pathname.match(/^\/api\/worlds\/([a-z0-9-]+)\/archive$/i);
  if (archiveMatch) {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return true;
    }

    const archiveSlug = slugify(archiveMatch[1]);
    if (!isValidSlug(archiveSlug)) {
      sendJson(response, 400, { error: "Invalid world slug." });
      return true;
    }

    const sourceDir = join(worldsDir, archiveSlug);
    if (!(await pathExists(sourceDir))) {
      sendJson(response, 404, { error: "World not found." });
      return true;
    }

    const targetDir = join(archiveDir, archiveSlug);
    if (await pathExists(targetDir)) {
      sendJson(response, 409, {
        error: `archive/${archiveSlug} already exists — move or rename it first.`,
      });
      return true;
    }

    await mkdir(archiveDir, { recursive: true });
    await rename(sourceDir, targetDir);
    const rowRemoved = await removeWorldFromAdminIndex(archiveSlug);
    await regenerateWorldRegistry();

    const result = {
      archived: true,
      slug: archiveSlug,
      archivedTo: `archive/${archiveSlug}`,
    };
    if (!rowRemoved) {
      result.warning = "No matching row found in the admin panel's Pages list; remove it by hand.";
    }
    sendJson(response, 200, result);
    return true;
  }

  const statusMatch = pathname.match(/^\/api\/worlds\/([a-z0-9-]+)\/status$/i);
  if (statusMatch) {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return true;
    }

    const statusSlug = slugify(statusMatch[1]);
    if (!isValidSlug(statusSlug)) {
      sendJson(response, 400, { error: "Invalid world slug." });
      return true;
    }

    const payload = await readBody(request);
    const status = payload?.status;
    if (status !== "in-progress" && status !== "completed") {
      sendJson(response, 400, {
        error: 'status must be "in-progress" or "completed".',
      });
      return true;
    }

    const moved = await moveWorldRowInAdminIndex(statusSlug, status);
    if (!moved) {
      sendJson(response, 404, {
        error: "No matching row found in the admin panel's worlds lists.",
      });
      return true;
    }

    sendJson(response, 200, { slug: statusSlug, status });
    return true;
  }

  const artMatch = pathname.match(/^\/api\/worlds\/([a-z0-9-]+)\/art$/i);
  if (artMatch) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed." });
      return true;
    }

    const artSlug = slugify(artMatch[1]);
    if (!isValidSlug(artSlug)) {
      sendJson(response, 400, { error: "Invalid world slug." });
      return true;
    }

    const artDir = join(worldsDir, artSlug, "assets", "art");
    if (!(await pathExists(artDir))) {
      sendJson(response, 404, { error: "That world has no assets/art folder." });
      return true;
    }

    const entries = await readdir(artDir, { withFileTypes: true });
    const files = sortByName(
      entries.filter(
        (entry) =>
          entry.isFile() && artFileExtensions.has(extname(entry.name).toLowerCase()),
      ),
    ).map((entry) => entry.name);
    sendJson(response, 200, { files });
    return true;
  }

  const layoutMatch = pathname.match(/^\/api\/worlds\/([a-z0-9-]+)\/layout$/i);
  if (layoutMatch) {
    if (request.method !== "PUT") {
      sendJson(response, 405, { error: "Method not allowed." });
      return true;
    }

    const layoutSlug = slugify(layoutMatch[1]);
    if (!isValidSlug(layoutSlug)) {
      sendJson(response, 400, { error: "Invalid world slug." });
      return true;
    }

    const layoutPath = join(worldsDir, layoutSlug, "assets", "layout.js");
    if (!(await pathExists(layoutPath))) {
      sendJson(response, 404, { error: "That world has no assets/layout.js to update." });
      return true;
    }

    const payload = await readBody(request);
    const problem = validateLayout(payload);
    if (problem) {
      sendJson(response, 400, { error: problem });
      return true;
    }

    // Timestamped backup of the current file before every save; tmp/ is gitignored.
    const backupDir = join(rootDir, "tmp", layoutSlug, "layout-backups");
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const backupName = `layout-${stamp}.js`;
    await writeFile(join(backupDir, backupName), await readFile(layoutPath));

    const banner =
      "// Seeded by tmp/" +
      layoutSlug +
      "/build.py; maintained by curator mode (src/core/curator.js).\n" +
      "// Coordinates are Blender Z-up meters; convert to Three.js with " +
      "(x, y, z)_three = (x, z, -y)_blender. yaw in degrees.\n";
    await writeFile(
      layoutPath,
      `${banner}globalThis.${layoutGlobalName(layoutSlug)} = ${JSON.stringify(payload, null, 1)};\n`,
      "utf8",
    );
    sendJson(response, 200, {
      saved: true,
      slug: layoutSlug,
      slots: payload.slots.length,
      backup: `tmp/${layoutSlug}/layout-backups/${backupName}`,
    });
    return true;
  }

  const detailMatch = pathname.match(/^\/api\/worlds\/([a-z0-9-]+)$/i);
  if (!detailMatch) {
    return false;
  }

  const slug = slugify(detailMatch[1]);
  if (!isValidSlug(slug)) {
    sendJson(response, 400, { error: "Invalid world slug." });
    return true;
  }

  if (request.method === "GET") {
    try {
      sendJson(response, 200, await readWorldDetail(slug));
    } catch {
      sendJson(response, 404, { error: "World not found." });
    }
    return true;
  }

  if (request.method === "PUT") {
    const payload = await readBody(request);
    const nextSlug = await writeWorldRecord(slug, payload);
    sendJson(response, 200, await readWorldDetail(nextSlug));
    return true;
  }

  if (request.method === "DELETE") {
    await rm(join(worldsDir, slug), { recursive: true, force: true });
    sendJson(response, 200, { deleted: true, slug });
    return true;
  }

  sendJson(response, 405, { error: "Method not allowed." });
  return true;
}

async function readWorldDetail(slug) {
  const records = await listWorldsDetailed();
  const record = records.find((item) => item.world.slug === slugify(slug));

  if (!record) {
    throw new Error("World not found.");
  }

  return {
    ...summarizeWorld(record),
    files: record.files,
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  const pathname = url.pathname;

  if (pathname === "/healthz") {
    sendJson(response, 200, {
      ok: true,
      host,
      port,
    });
    return;
  }

  // The admin panel now lives at the root; the old /admin/ page is retired.
  if (pathname === "/admin" || pathname === "/admin/" || pathname === "/admin/index.html") {
    response.writeHead(302, { Location: "/" });
    response.end();
    return;
  }

  if (/^\/worlds\/[a-z0-9-]+$/i.test(pathname)) {
    response.writeHead(302, { Location: `${pathname}/` });
    response.end();
    return;
  }

  try {
    const handledApi = pathname.startsWith("/api/")
      ? await handleApi(request, response, pathname)
      : false;

    if (!handledApi) {
      await serveStatic(request, pathname, response);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    sendJson(response, 500, { error: message });
  }
});

server.keepAliveTimeout = 5000;
server.requestTimeout = 120000;
server.headersTimeout = 121000;

server.listen(port, host, () => {
  console.log(`elastic space listening at http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`received ${signal}, closing server`);
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
