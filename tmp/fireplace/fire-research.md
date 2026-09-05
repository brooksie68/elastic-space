# Fireplace realism research — 2026-09-05 — Codex

Research followed completion of independent flame clocks and detached tips, as James requested.
This is a recommendation for discussion, not authorization to replace the renderer.

## Recommendation

Test a true volumetric fluid fire in a separate silent comparison study. Give the gas
shared motion around the logs instead of refining individual flame cards indefinitely.
Compare against a high-quality baked simulation, keeping the current study available.
My first candidate is WebGPU, because interactivity, small camera movement, continuous
variation and eventual supernatural disturbances all benefit from an evolving volume.
This is a hypothesis about visual potential, not a measured performance promise.

## Approaches assessed

1. **Live 3D gas simulation, rendered as a volume.** NVIDIA's documented pipeline
   models movement on a grid and renders through that volume, including obstacles.
   This provides a concrete basis for connected curls and natural separation; it
   also discusses lower-resolution rendering and simulation budgets.
   [GPU Gems: 3D fluids](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids).

2. **WebGPU implementations we can study rather than invent everything.** The official
   Three.js example contains a working fluid solver and volume renderer with a
   temperature-based artistic color ramp, quality controls and bloom. Its current
   source uses a 100×100×200 grid; that is a demo configuration, not our budget.
   [Demo](https://threejs.org/examples/webgpu_volume_fire.html),
   [source](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_volume_fire.html).
   Local Three.js is 0.185.1 and includes VolumeNodeMaterial, but lacks the
   Storage3DTexture class used by today's example. It is not a drop-in copy.
   Pin a compatible local dependency for an isolated experiment; do not upgrade
   the shared library under existing worlds. Raw WebGPU/WGSL is also an option.
   WebGPU provides compute shaders for this kind of GPU work.
   [Chrome explanation](https://developer.chrome.com/docs/web-platform/webgpu/from-webgl-to-webgpu).

3. **A different browser library: luma.gl.** Its experimental VolumetricFireSimulation
   explicitly exposes temperature/fuel/velocity simulation, emitters, obstacles,
   dissipation and pressure iterations. Rendering and scheduling remain our work.
   This is a real alternative, but experimental integration adds uncertainty.
   [Official API](https://luma.gl/docs/api-reference/experimental/volumetric-fire-simulation).

4. **Baked fluid simulation, played through the browser.** Blender can simulate gas
   using a domain, emitters and obstacles, then bake the cache.
   [Blender workflow](https://docs.blender.org/manual/en/5.0/physics/fluid/introduction.html).
   Houdini's documented flipbook workflow exports rendered simulation frames and
   can include depth, relighting and interpolation passes.
   [SideFX flipbook workflow](https://www.sidefx.com/docs/houdini/nodes/out/labs--flipbook_textures-1.0.html).
   Inference for this project: several carefully rendered fire sequences could
   outperform today's procedural silhouettes visually at modest runtime cost.
   Tradeoffs are baked motion, repetition, asset size, and limited view changes
   with 2D cards. Volume sequences retain depth but cost more memory. Houdini is
   not confirmed installed or licensed; Blender is already available. No purchase
   or paid generation is required just to evaluate the Blender route.

5. **Lighter live fluid simulation.** Unity's Ignitement breakdown describes a
   2D texture-based solver, parallax rendering and simulation-driven lighting/embers.
   Inference: the principles could be implemented in our browser shaders without
   adopting Unity. This is attractive for the mostly frontal view, with less
   depth fidelity than a full 3D volume.
   [Developer breakdown](https://unity.com/blog/real-time-fluid-simulation-fire-vfx-ignitement-breakdown).

6. **Filmed fire / video textures.** A browser can upload video frames as a texture.
   [MDN example](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Animating_textures_in_WebGL).
   My assessment: excellent as a realism reference or a composited layer, but a
   single fixed recording is restrictive for camera parallax and editable fire.
   Acquiring or creating suitable footage would be a separate agreed asset task.

## Improvements within today's study

My visual assessment: flame motion improved, but slender repeated silhouettes,
smooth log profiles, regular brick geometry and red coal patches remain limiting.
Next candidates are a shared flow field, less uniform flame width, broader sheets
of flame between logs, richer bark/char relief, ash coverage, temperature/age-driven
color, and lighting derived from the actual fire. More particles alone will not
resolve those features. Heavy effects need a budget rather than being stacked blindly.

## Proposed comparison, not yet built

Use the same firebox/camera for a WebGPU volume and the current shader study.
Start with a bounded grid (for example 64×96×48), fixed simulation steps, separate
volume-render resolution and a ray-step cap. Those are trial settings, not measured
requirements. Compare curling, tip breakup, log occlusion, zoom clarity and sustained
frame time at James's actual 2560-wide Chrome view. Check memory and a long run too.
If we explore a baked version, use it as a quality comparator, not an assumed shortcut.
No claim of photorealism until James sees the result.

Current behavior verification: sims passed; no browser console errors; detached
wisps were observed and freeze under pause. In-app preview measured roughly 30–38 fps
in this session, lower than the earlier 60 fps observation. Cause is unisolated;
full-resolution Chrome performance remains open. Static shadow maps are now cached
because the light positions and shadow-casting geometry do not move.
