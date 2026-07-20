// Audits every world in src/worlds/ against the contract in docs/building-a-world.md.
// Usage: npm run check-worlds   (exit code 1 if any errors; warnings don't fail)
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const worldsDir = join(root, "src", "worlds");

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");
const count = (text, re) => (text.match(re) || []).length;

const rootIndex = await readFile(join(root, "index.html"), "utf8");
const registrySource = await readFile(join(root, "src", "core", "world-registry.js"), "utf8");

const entries = (await readdir(worldsDir, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b));

let errorCount = 0;
let warnCount = 0;

for (const slug of entries) {
  const dir = join(worldsDir, slug);
  const errors = [];
  const warnings = [];

  for (const required of ["index.html", "world.json", "changelog.md", "CLAUDE.md"]) {
    if (!existsSync(join(dir, required))) errors.push(`missing ${required}`);
  }

  if (existsSync(join(dir, "world.json"))) {
    try {
      const manifest = JSON.parse(await readFile(join(dir, "world.json"), "utf8"));
      if (manifest.slug !== slug) errors.push(`world.json slug "${manifest.slug}" != folder "${slug}"`);
      for (const field of ["title", "status", "summary"]) {
        if (!manifest[field]) errors.push(`world.json missing "${field}"`);
      }
    } catch {
      errors.push("world.json is not valid JSON");
    }
  }

  if (existsSync(join(dir, "index.html"))) {
    const html = stripComments(await readFile(join(dir, "index.html"), "utf8"));

    // World JS on disk plus inline scripts, for attach/audio checks.
    let worldCode = html;
    for (const file of await readdir(dir)) {
      if (file.endsWith(".js")) worldCode += await readFile(join(dir, file), "utf8");
    }

    if (!html.includes("core/dashboard-control.js")) {
      errors.push("does not load core/dashboard-control.js (required on every page)");
    }

    const driftExits = count(html, /data-drift/g);
    if (driftExits > 0) {
      if (!html.includes("core/world-registry.js")) errors.push("has data-drift exits but does not load core/world-registry.js");
      if (!html.includes("core/drift.js")) errors.push("has data-drift exits but does not load core/drift.js");
    }
    if (driftExits < 3) {
      warnings.push(`only ${driftExits} data-drift exit(s); the norm is at least 3 (fixed-route worlds excepted)`);
    }

    const loadsSoundControl = html.includes("core/sound-control.js");
    const attaches = /ElasticSoundControl\??\.attach/.test(worldCode);
    const makesSound = /AudioContext|new Audio\s*\(|<audio\b/.test(worldCode);
    if (loadsSoundControl && !attaches) {
      errors.push("loads core/sound-control.js but never calls ElasticSoundControl.attach");
    }
    if (!loadsSoundControl && makesSound) {
      warnings.push("appears to make sound but does not use the shared sound control");
    }
    if (/fetch\s*\(\s*["'`][^"'`]*assets\//.test(worldCode)) {
      warnings.push("appears to fetch() from assets/ — worlds must not rely on fetch for assets (file:// support)");
    }
  }

  if (!registrySource.includes(`"${slug}/index.html"`)) {
    errors.push("not in src/core/world-registry.js — run: npm run registry");
  }
  if (!rootIndex.includes(`src/worlds/${slug}/index.html`)) {
    errors.push("no link in the admin panel Pages list (root index.html)");
  }

  errorCount += errors.length;
  warnCount += warnings.length;
  if (errors.length || warnings.length) {
    console.log(`\n${slug}`);
    for (const e of errors) console.log(`  ERROR ${e}`);
    for (const w of warnings) console.log(`  warn  ${w}`);
  }
}

// Registry must not list worlds whose folders are gone.
for (const listed of registrySource.match(/"([^"]+)\/index\.html"/g) || []) {
  const slug = listed.slice(1).replace(/\/index\.html"$/, "");
  if (!entries.includes(slug)) {
    errorCount += 1;
    console.log(`\nregistry\n  ERROR lists "${slug}" but src/worlds/${slug}/ has no such world — run: npm run registry`);
  }
}

console.log(`\nChecked ${entries.length} worlds: ${errorCount} error(s), ${warnCount} warning(s).`);
process.exit(errorCount ? 1 : 0);
