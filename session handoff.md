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

## Run Locally

1. Run `serve-local.cmd` or `npm run local:start`.
2. Open `http://127.0.0.1:4173/`.

Useful locations:

- Jerry's Pool: `http://127.0.0.1:4173/src/worlds/jerrys-pool/index.html`
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
- Sound is currently absent.

## Files to Read Before Continuing

- `README.md`
- `CLAUDE.md`
- `docs/current-index.md`
- `docs/denizen-frequency-rubric.md`
- `src/worlds/jerrys-pool/index.html`
- `src/worlds/jerrys-pool/site.css`
- `src/worlds/jerrys-pool/site.js`

The user prefers concise, direct communication and iterative refinement.
