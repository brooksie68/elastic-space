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

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const worldsDir = join(rootDir, "src", "worlds");
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
};

const reservedWorldDirs = new Set(["_template"]);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    // The map room polls /healthz from file:// before switching to the served
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

async function serveStatic(pathname, response) {
  const requestedPath = resolveStaticPath(pathname);
  const decodedPath = decodeURIComponent(requestedPath.split("?")[0]);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(rootDir, safePath);

  if (!isSafeFilePath(filePath)) {
    sendText(response, 403, "forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    await access(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": cacheControlFor(filePath),
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, "not found");
  }
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

  // The map room now lives at the root; the old /admin/ page is retired.
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
      await serveStatic(pathname, response);
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
