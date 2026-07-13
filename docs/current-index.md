# Current Index: Jerry's Pool

This is the canonical architecture and creative reference for `src/worlds/jerrys-pool/`. Read it before changing `index.html`, `site.css`, or `site.js`.

Jerry's Pool is one Elastic Space world, not the site's visual identity. The root `index.html` is now the intentional named directory for all worlds. The earlier panel homepage and pre-Pixi plasma pool remain historical references under `archive/`.

## Jerry

Jerry is the large translucent alien cell at the center of the ecology. He roams continuously, changes depth, breathes, tilts, deforms internally, feeds, reacts to nearby organisms, and emits clickable energy orbs.

His nucleus chooses movement first and the body follows after a hesitation. Depth is communicated through size, brightness, saturation, and limited blur. Feeding raises saturation by 30% and fades over six seconds. Three random organelles glow strongly for two seconds, then fade for two seconds.

Jerry's emitted orbs are generic random-drift exits. They use the shared world registry and do not name their destinations.

## Dot Current

The current contains 330 independent glowing dots. They do not connect to each other or react to the pointer.

Jerry's passage changes the current through four preserved behaviors:

- forward pressure
- lateral displacement around his body
- a trailing wake
- damped recovery toward the underlying orbit

This interaction is essential to making Jerry feel physically embedded in the pool. Do not simplify it away during performance work.

### Plankton

50 of the 330 current members render as tiny static sealife instead of dots: 10 diatom/plankton species
(5 each), pre-rendered once to small white canvas textures and tinted a random per-individual color
(any hue, bright enough for the dark pool), ~9–17 px, fixed random orientation. They use the identical orbit and Jerry-influence physics as dots. When one drifts within
190 px of Jerry it glows brightly (additive halo, full alpha, slight scale-up), holds ~2.8 s after he
leaves, then fades over ~1.1 s. Species selection is deterministic by node index (`planktonSpeciesFor`).

### Renderer

Dots render on `#dot-field` through PixiJS/WebGL shared-texture sprite batching. Bright and dark dots use two shared textures, producing two GPU-oriented batches instead of 330 Canvas draw calls per frame. PixiJS is loaded from the local bundle at `assets/the plasma pool — pixi_files/pixi.min.js`; no CDN is required.

### Scheduling and culling

- Far dot physics: 15 FPS
- Middle dot physics: 30 FPS
- Near dot physics: 60 FPS
- Any dot within Jerry's expanded influence area is promoted to 60 FPS.
- Pixi rendering remains at display-frame cadence for smooth interpolation.
- Dots outside an 80-pixel viewport margin are hidden from rendering.
- Off-screen orbital motion continues, but expensive Jerry-influence calculations are skipped outside a 100-pixel margin.

## Pool Layers

The scene combines:

- static, fully opaque blurred CSS seamount silhouettes
- slowly changing palette washes and atmospheric events
- a one-pixel-resolution Canvas backdrop
- the Pixi dot field
- DOM/CSS denizens and seafloor flora
- Jerry and his orbital rings
- a currently disabled filament Canvas retained in the code

The dot field changes z-depth with Jerry so particles can pass behind or in front of him. Seamount blur is intentionally strong; it is static and not the primary ongoing processor cost. Seamounts must remain opaque. Underwater depth comes from blur, darkness, overlapping scale, and lighting—not translucent rock or alpha masks.

## Denizens

The pool includes amoebas, three jellyfish forms, rays, dot schools, pulse urchins, three-diamond fish, three-tentacled ball fish, sulfur lantern colonies, vent walkers, alien shrimp, polyps, seafloor plants, brain coral, and the rare leviathan. The lantern colony and vent walker are pre-rendered Blender sprites (`lantern-colony.png`, `vent-walker.png`; sources in repo-root `tmp/jerrys-pool-denizens/`).

One of every non-leviathan type appears within five seconds of load. Exact spawn intervals, opening times, passage durations, and concurrency limits are maintained only in `docs/denizen-frequency-rubric.md`; update that rubric whenever those values change.

Important behavioral rules:

- Feeding amoebas and their prey remain position-locked until consumption completes.
- Fed amoebas lose interest in Jerry and eventually leave the viewport.
- Powered amoebas choose the closer edible target: a smaller amoeba or jelly.
- Brain coral holds full brightness for five seconds, then fades over twenty seconds.
- Pulse urchins follow a slow oval current around the viewport, wander gently, pulse in brightness on a four-second cycle, and eventually spiral off-screen.
- Worms that consume Jerry's orbs take on the orb color, glow for five seconds, then fade to their normal color over five seconds.

## Performance Contract

- Canvas and Pixi resolution remain capped at one device-independent pixel per CSS pixel.
- The dot population is 330 unless intentionally changed.
- Dot textures are generated once and reused; do not restore per-dot gradients or shadow blur during rendering.
- Preserve depth-tier physics and off-screen culling.
- Avoid per-frame temporary arrays and object allocation in animation loops.
- Jerry's many style changes are batched into one `cssText` write per frame.
- Prefer transforms and opacity for moving DOM denizens.
- Keep concurrency limits defined by the denizen rubric.
- The largest remaining optional costs are large CSS filters, multiple independent animation loops, and full-screen backdrop redraws.

## Navigation

There is no conventional menu inside the world. Jerry's orbs participate in shared random drift, which serves unseen registered worlds until a session cycle is exhausted. HTTP uses `sessionStorage`; `file://` carries fallback state in destination query strings.

## Sound

There is currently no sound. Earlier audio experiments were removed and should not be restored without a new request.

## File Map

- `src/worlds/jerrys-pool/index.html`: scene layers, Jerry's anatomy, shared drift scripts, and local Pixi bundle loading
- `src/worlds/jerrys-pool/site.css`: environment, creatures, seafloor, Jerry, and CSS animation
- `src/worlds/jerrys-pool/site.js`: ecology, motion, feeding, spawn scheduling, Pixi dot batching, and dot physics
- `docs/denizen-frequency-rubric.md`: canonical denizen timing and limits
- `assets/the plasma pool — pixi_files/pixi.min.js`: local PixiJS 8.19.0 browser bundle
- `archive/first-homepage/`: preserved first homepage
- `archive/plasma-pool-dom/`: preserved earlier DOM/Canvas plasma pool

## Verification

After renderer or physics changes:

1. Run `node --check src/worlds/jerrys-pool/site.js`.
2. Open the world via the local dev server (`http://127.0.0.1:4174/src/worlds/jerrys-pool/index.html`); direct `file://` loading also works and should stay working.
3. Confirm dots are visible, orbit smoothly, and visibly divide around Jerry.
4. Confirm the browser reports no errors or warnings.

## Creative Reading

The page should feel populated but not like an aquarium interface. Jerry is a protagonist, not a mascot or guide. Movement should remain patient, continuous, autonomous, and physically connected to the surrounding current.
