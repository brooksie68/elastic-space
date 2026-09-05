# Fireplace study — KEEP

## 2026-09-05 — Codex — First silent fire study

James approved only the fire, logs, inner bricks, grate, and front hearth study.
No room, mantel, audio, events, drift integration, or published world was authorized.
Preview: http://127.0.0.1:4174/tmp/fireplace/fire-lab.html

Built five irregular split-log meshes in an isolated headless Blender 5.1.2 process;
exported 17,340 log triangles to logs.js. The retained logs.blend is local scratch.
Three.js renders textured brick/stone, charred log surfaces with irregular emissive
cracks, scattered coals, 27 animated procedural flame planes, and restrained sparks.
First appearance is a technique study, visibly less realistic than the image target;
James's visual verdict is pending. Flame shapes still tend toward separate tongues,
and the log/coal surfaces need further art direction based on that verdict.

Configuration: height, speed, brightness, ember glow, firelight, 100–120% zoom,
text size, pause, reset, logs-only. Click-away dismissal verified. Settings persist
locally for this lab only; file-backed world presets are not built yet.
Camera magnification is calculated from the field-of-view tangent, exactly 1.20x
at maximum, with subtle eased pointer movement. No sound or external network calls.

Verification: Blender export succeeded; sim.mjs passed one-hour light bounds,
invalid-input sanitization and precise zoom-ratio assertions. Browser rendered
at roughly 60 fps at 1280x720 in the in-app preview, with no console errors;
pause/resume, logs-only, panel opening and click-away checked. This is not yet
James's full-resolution Chrome performance gate. npm run check-worlds was run;
it reports existing world errors, and this tmp-only lab is outside that audit.

Source lab files are explicitly tracked for the required local session commit;
the rest of tmp remains ignored, including the .blend and obsolete model.mjs.
No registry/admin changes, paid generations, shared Blender UI access, or pushes.

Creative context retained: maintained wealthy-family 1950s New England house,
close fireplace framing; eventual mild camera movement and zoom. Room changes
should come and go, not progress linearly toward evil. Tone is PG-13, sometimes
funny and sometimes genuinely sinister (including Satan's face), not cutesy.
James iterates by looking and reacting; no adjacent work until he approves it.
