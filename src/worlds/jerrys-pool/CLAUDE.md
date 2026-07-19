# Jerry's Pool — Claude instructions

## Denizens

- `docs/denizen-frequency-rubric.md` (repo root `docs/`) is the canonical denizen timing reference.
- Update that rubric whenever denizen spawn timing, opening appearance timing, duration, counts, or concurrency limits change.

## Rendering

- Read `docs/current-index.md` (repo root `docs/`) before changing the renderer or dot physics.
- The 330 background dots use PixiJS/WebGL shared-texture batching.
- Preserve Jerry's dot pressure, wake, side displacement, and recovery behavior. It is a core spatial effect, not expendable decoration.
- Far, middle, and near dot physics run at 15, 30, and 60 FPS respectively. Dots near Jerry are promoted to 60 FPS regardless of depth.
- Off-screen dots remain continuous in their orbits but skip rendering and Jerry-influence work outside the viewport margin.
- Seamount elements are solid underwater terrain. Keep their opacity at `1` and `mask-image: none`; create depth with blur, value, and scale.
