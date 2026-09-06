# Fireplace study — KEEP

## 2026-09-05 — Codex — Thinner volume iteration

James green-lit iteration to reduce the yellow blanket and expose logs. Narrowed
bed depth .43→.30 and upper source .14→.09; more intermittent, finer source noise.
Raised cooling slightly, cut optical density 2.5→1.7 and emitted radiance by roughly
30%. Yellow-white now requires hotter gas (threshold 1.25→1.9). Sharpened temperature
edge and added upward-moving erosion/coordinate curl for gaps and irregular edges.
These are shader changes; existing brightness slider remains 1, range .2–2, and
other saved controls retain their values. Grid, 48 ray steps, and 65% fire buffer
unchanged; curl adds a few trigonometric operations per ray sample, no extra passes.

Visual check: logs substantially clearer and fire more separated; still soft/puffy,
not yet a finished realistic flame. Initial overly sparse attempt was retuned.
JS syntax and existing Node sim pass. Browser shader compiled and rendered; hidden
preview reported 1 fps, so this turn cannot establish real foreground performance.
World audit run with existing errors outside this scratch lab. Agent: Codex.

## 2026-09-05 — Codex — Volume comparison and startup recovery

James authorized a true volume beside the current fire, then reported the unfinished
comparison stuck on Loading geometry. Both sides now verified rendering after reload.
compare.html presents the unchanged flame approach beside a 40×56×24 heated-gas
field: semi-Lagrangian advection, buoyancy, curl stirring, six pressure iterations,
cooling, approximate log obstacles, and depth-clipped 48-step ray marching.
Fire-only composite runs at 65% resolution; geometry remains full resolution.
Simulation fixed at 1/45 second, capped at two steps/frame. Under load it slows
rather than doing unlimited catch-up. Volume has separate saved settings.
This is a softer, fuller experimental fire, not a complete combustion simulation
or a claim of finished realism. No replacement of the existing world renderer.

Startup now catches failed imports/construction, shader failures and context loss;
a 30-second loading timeout gives a visible error. First render runs immediately,
including in hidden previews. Original fire only imports the volume when requested.
Existing pure-Node motion/zoom simulation and JS syntax checks passed. Browser
reload rendered both sides at approximately 37 fps at 1280×720. Full-size Chrome
performance remains to be judged; no claim of a passed final performance gate.
check-worlds run: this scratch lab is outside the world audit; existing audit errors
remain. No paid calls, room work, sound, registry edits, or push. Agent: Codex.

## 2026-09-05 — Codex — Independent motion, detached tips, then research

Completed the two behavior changes before beginning web research, per James.
Each flame has an independent smoothly changing local clock; Speed variation
0–1.5 (default 1) retains the master Movement speed. Tip wisps 0–2 (default 1)
controls irregular detachments: parent tip shortens, a pooled fragment rises,
curls, shrinks and fades over 0.65–1.3 seconds. Pool capped at 24 fragments.
Hidden flames do not emit; zero count clears fragments; pause freezes all fire time.
Static shadow maps cached because shadow-casting geometry and lights stay fixed.
Simulation passed 81 independent clocks, 474 detachments over two minutes, pause,
disabled emitters, lifetime bounds, plus existing light/zoom assertions. Browser
checked controls and live fragments with no console errors. Preview 30–38 fps;
full-resolution Chrome gate remains open. check-worlds run; lab outside its scope.
Research findings and sources: fire-research.md. Recommendation for discussion:
separate WebGPU volumetric comparison; no renderer replacement authorized or built.
No paid assets, no room work, no push. Agent: Codex.

## 2026-09-05 — Codex — Flame count control

James called the initial study a pretty good start and requested more/less fire.
Added Flame count: 0–81, integer steps, default 27 (the previous fixed count).
Flame layers are pooled; the control shows/hides them without rebuilding geometry.
Sparse counts are distributed across the existing anchors; the original 27-flame
layout and spark seed are preserved. Saved settings without count default to 27.
At maximum this triples the flame-plane draw/overdraw cost; hidden planes do not draw.
No room or other adjacent work. Agent: Codex.

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
