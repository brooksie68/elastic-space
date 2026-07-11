# Session Handoff

Start by reading `README.md`, `CLAUDE.md`, and the documents under `docs/`.

## Current State

Elastic Space is a collection of self-contained worlds under `src/worlds/`.

- Root `index.html` is an intentional named directory linking directly to every world.
- Shared random navigation is implemented by `src/core/world-registry.js` and `src/core/drift.js`.
- The private control panel and registry API run under the local HTTP server.
- Jerry's Pool lives at `src/worlds/jerrys-pool/`; its current contract is `docs/current-index.md`.
- Jerry's Pool uses PixiJS/WebGL batching for its 330-dot current field, with depth-tier physics and off-screen culling.
- Denizen timing is canonical in `docs/denizen-frequency-rubric.md`.
- Wildflowers at Dusk uses painted cloud sprites and four opaque painted landscape plates, combined with its Canvas rain, cedar, and foreground vegetation.

## Run Locally

1. Run `serve-local.cmd` or `npm run local:start`.
2. Open `http://127.0.0.1:4173/`.

Useful locations:

- Jerry's Pool: `http://127.0.0.1:4173/src/worlds/jerrys-pool/index.html`
- Wildflowers at Dusk: `http://127.0.0.1:4173/src/worlds/wildflowers-at-dusk/`
- Admin: `http://127.0.0.1:4173/admin/`
- Registry: `http://127.0.0.1:4173/api/worlds`
- Health: `http://127.0.0.1:4173/healthz`

Use HTTP for development. Direct `file://` loading remains useful for simple worlds and uses URL-carried drift session state, but the registry API and admin require HTTP.

## Important Decisions

- Elastic Space has no required shared aesthetic.
- Random drift is the normal world-to-world link; fixed links are allowed for deliberate sequences and the root directory.
- World links do not name random destinations.
- Per-world `world.json` manifests are the collaboration boundary.
- Generated registry artifacts must not be edited manually.
- Jerry's dot displacement is a core environmental behavior and must survive renderer optimization.
- Jerry's seamounts remain fully opaque; use blur and color for underwater depth.
- Wildflowers landscape plates remain opaque and separately stacked. Runtime files are the alpha PNGs without the `-source` suffix.
- In Wildflowers, the order is sky, rain, clouds, painted terrain, cedar/foreground vegetation.
- Sound is currently absent.

## Files to Read Before Continuing

- `README.md`
- `CLAUDE.md`
- `docs/current-index.md`
- `docs/denizen-frequency-rubric.md`
- `src/worlds/jerrys-pool/index.html`
- `src/worlds/jerrys-pool/site.css`
- `src/worlds/jerrys-pool/site.js`
- `src/worlds/wildflowers-at-dusk/index.html`
- `src/worlds/wildflowers-at-dusk/world.css`
- `src/worlds/wildflowers-at-dusk/world.js`

The user prefers concise, direct communication and iterative refinement.

## Session note — 2026-07-11 (Blender MCP setup session)

Tooling-only session; no world code touched. For the wrapitup session:

1. **Blender MCP is live.** Official Blender Lab MCP server installed (`pip install git+https://projects.blender.org/lab/blender_mcp.git#subdirectory=mcp`, exe at `C:\Users\brook\AppData\Roaming\Python\Python314\Scripts\blender-mcp.exe`) and registered with Claude Code at user scope as server name `blender`. Blender 5.1.2 add-on server auto-starts on localhost:9876. Verified end-to-end: read scene, window screenshot, executed Python (added a Suzanne to the default file — not saved anywhere).
2. **Documentation added to `_workspace/CLAUDE.md`** (uncommitted, in the `_workspace` repo): new "Global connections & tools" section above the Figma section, covering Blender MCP (live), ElevenLabs (live, key in elastic-space `.env`, `tools/eleven.mjs`), and Hunyuan 3D (proof-of-concept only — free HF Space test, artifacts in `elastic-space/tmp/hunyuan-test/`, no repeatable pipeline yet).
3. **Detours cleaned up:** an `ai-settings/` folder and an `ai-projects/CLAUDE.md` root file were created then removed at James's direction; final home for the docs is `_workspace/CLAUDE.md` only. Nothing stray remains.
4. **Nothing in this repo needs committing from this session** except this handoff note (and the untracked `tmp/hunyuan-test/` from an earlier session, if wrapitup wants to deal with it).
