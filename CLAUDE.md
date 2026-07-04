# Claude instructions

## Links between worlds

- Random drift is the default. Do not choose or name the destination.
- Make a portal with `href="../../../index.html"`, a generic accessible label, and the `data-drift` attribute.
- Load `../../core/world-registry.js` and then `../../core/drift.js` in each world that offers drift links.
- Direct links are allowed only when the user explicitly wants a fixed route, such as an authored sequence. Fixed links do not use `data-drift`.
- Drift avoids worlds already seen in the current cycle. Do not implement separate destination memory inside a world.
- After adding, removing, or renaming a world, run `npm run registry`.
- The root `index.html` is an intentional named directory and may use direct links.

## Jerry's Pool denizens

- `docs/denizen-frequency-rubric.md` is the canonical denizen timing reference.
- Update that rubric whenever denizen spawn timing, opening appearance timing, duration, counts, or concurrency limits change.

## Jerry's Pool rendering

- The live world is `src/worlds/jerrys-pool/`; read `docs/current-index.md` before changing its renderer or dot physics.
- The 330 background dots use PixiJS/WebGL shared-texture batching.
- Preserve Jerry's dot pressure, wake, side displacement, and recovery behavior. It is a core spatial effect, not expendable decoration.
- Far, middle, and near dot physics run at 15, 30, and 60 FPS respectively. Dots near Jerry are promoted to 60 FPS regardless of depth.
- Off-screen dots remain continuous in their orbits but skip rendering and Jerry-influence work outside the viewport margin.
