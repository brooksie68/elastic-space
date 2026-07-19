import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(siteDir, "../../src/worlds/grand-theft-auto-7");
const outputDir = join(siteDir, "dist/server");

const [rawHtml, css, javascript] = await Promise.all([
  readFile(join(sourceDir, "index.html"), "utf8"),
  readFile(join(sourceDir, "world.css"), "utf8"),
  readFile(join(sourceDir, "world.js"), "utf8"),
]);

const html = rawHtml
  .replace(/\s*<script src="\.\.\/\.\.\/core\/[^"]+"><\/script>/g, "")
  .replace('href="../../../index.html"', 'href="/"')
  .replace('href="../../../index.html"', 'href="/"');

const worker = `const files = {
  "/": { body: ${JSON.stringify(html)}, type: "text/html; charset=utf-8" },
  "/index.html": { body: ${JSON.stringify(html)}, type: "text/html; charset=utf-8" },
  "/world.css": { body: ${JSON.stringify(css)}, type: "text/css; charset=utf-8" },
  "/world.js": { body: ${JSON.stringify(javascript)}, type: "text/javascript; charset=utf-8" },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const file = files[url.pathname];
    if (!file) {
      return Response.redirect(new URL("/", url), 302);
    }
    return new Response(request.method === "HEAD" ? null : file.body, {
      headers: {
        "content-type": file.type,
        "cache-control": url.pathname === "/" || url.pathname === "/index.html"
          ? "public, max-age=0, must-revalidate"
          : "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  },
};
`;

await rm(join(siteDir, "dist"), { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, "index.js"), worker, "utf8");

console.log(`Built Vice State worker (${Buffer.byteLength(worker)} bytes).`);
