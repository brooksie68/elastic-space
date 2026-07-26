# Claude instructions

The canonical world-building contract (folder layout, required wiring, drift/sound
rules, ship checklist) is `docs/building-a-world.md` — follow it when adding or
reviewing worlds, and keep it updated when all-world rules change here. `AGENTS.md`
at the repo root is the equivalent entry point for non-Claude agents; keep the two
consistent. `npm run check-worlds` audits every world against the contract.

## Todo

0. ORB DIMENSION "the big dimension": COOPERATIVE SOCIETIES PHASE A BUILT 2026-07-24
   (v50, James's go after full plan consensus) — the Saelyri + the Cadence, four
   communities (capital Tonic + Mediant/Dominant/Subdominant on the hexagram at
   ~125km), procedural cores/node-shells/light-bridges, new society-sim.
   v51 2026-07-25: capital wrapped Korrudan + SIX CADENCE CASTES (Blender citizen
   robots, tmp/orb-dimension/cadence_robots.py) in all 4 hybrid towns.
   v52 2026-07-25 (James's Knowhere brief after flying v51 — "the head should BE
   the station"): KORRUDAN STATION — skull ×20 → 12km, capital machine cloud
   deleted, city CRUST grown from the real bone surface (crust_points.mjs +
   crustGeometry: window-grid shanties, gantry masts, warm refinery jaw, eye-socket
   iris rings, face kept bare), SKULL_EL ellipsoid keeps + Korrudan doorstep fuel
   ring, spawn 27km, gaze/eyes rescaled. VESS-KARAI REMOVED (James: "another
   format later" — assets archived, hum → city hum). James flew it: "a genuine
   improvement."
   v53 2026-07-26 (James's nebula brief + his go after 7 look-dev rounds):
   THE NEBULAE — five banks of glowing gas (one over home, four in the gulf),
   five palettes, own identity, visuals only. Look developed in
   tmp/orb-dimension/nebula-lab.html (KEEP IT — that is where gas gets judged
   before it flies); noise BAKED to a 6-variant atlas at init because
   per-fragment fbm was 48 sines; near-fade + density-ceiling cap hold
   interior overdraw at 13 screens (the v33 veil-bomb discipline). New
   nebula-sim + wisp-atlas-check; shader-check caught a runtime-killer;
   reef-sim de-flaked (seeded probes). All 9 sims green twice over.
   AWAITING JAMES'S FLIGHT (the gas in-world for the first time; also still
   open from v52: scale read on approach, window density, spawn pitch).
   Presets file-backed since v49.4 (james-prefs-01 is start preset). NEXT, each
   with its own go: Phase B peoples (SDF Saelyri actors, acknowledgment, sound),
   Phase C resources (tritium + 2 asteroid types, harvest verbs), Phase D reef
   expansion (4× size, glyphs, new creatures). Spec:
   `src/worlds/orb-dimension/expansion-spec.md` "The cooperative societies"
   section (read it first). Still spec-only: stargates, gulf depot grid, luminous
   region. Related: World Ideas #57 (The Solar System) inherits this tech.
0.5. FACE LAB / expressive characters: pipeline BUILT + POSTMASTER FACE TRANSFER
   VALIDATED 2026-07-23/24 — `src/labs/face-lab/` (read its CLAUDE.md + changelog first).
   Face Lab live (James delighted; skin/eye pickers, protected presets). The house
   technique: Meshy characters keep their mesh/texture and learn the 52+15 morphs via
   wrap transfer (tmp/face-lab/wrap_transfer4.py, state in wrap-transferred.blend —
   v4 renders approved direction). MPFB2 realism REJECTED as visible character
   ("mutant serial killer") — donor machinery only. PIVOT 2026-07-24 late: Meshy mesh
   quality is the ceiling (polygon soup) — postmaster head REBUILT on clean MPFB2
   topology via identity dials: `assets/sculpt.glb` (140 MakeHuman modeling targets as
   browser sliders + 67 expression morphs) in Face Lab's model picker. Claude
   dial-sculpted the gnome skull (preset "postmaster-head", overdrive >1 needed —
   sliders ±2, server allows weights 0..3). AUTO-FIT PIPELINE BUILT 2026-07-24 late
   (James's ask: artwork→character without slider-digging): tmp/face-lab/autofit.py
   + autofit_finish.py — measured alignment (glasses shells = eye height + IPD
   scale), confident-skin masking, bounded ridge dial solve, residual bake, export.
   `assets/postmaster-fit.glb` in the lab model picker ("postmaster (auto-fit)") +
   preset "postmaster-head" = the fitted head, all dials live. Read the lab
   CLAUDE.md auto-fit section before touching. Wardrobe framework agreed (fitted
   hair/beard assets, rigid props, texture layers, morph territory) — not built.
   VERDICT 2026-07-24 late: auto-fit head REJECTED by James ("very disturbing") —
   standing direction is Carl-from-Up friendly exaggeration, accessories carry the
   likeness (memory postmaster-face-direction). MakeHuman community model gallery
   scraped to a local searchable page (tmp/mh-models/index.html, 82 models) — dud
   for our need, mostly pinups. BASE-FACE CANDIDATE ROUND 1 same night: 4 dialed
   candidates A-carl/B-santa/C-toby/D-gnome2 (tmp/face-lab/candidates.json +
   render_candidates.py, sheet sent) — James: "getting better, not quite ready,
   keep working at it." Lesson: default dark eyelashes read as mascara on male
   characters — hide/swap them. PIVOT 2026-07-25 (candidate round 2 dressed sheet
   rejected as "Blender-beginner imitation"): James wants the ORIGINAL character +
   the full repeatable pipeline, no compromises. New architecture: MPFB chassis for
   animation; ALL likeness from the original Meshy model — texture bake, region-cut
   props (DONE night 1: tmp/face-lab/pieces/, dissect.py), face geometry via WRAP
   onto a high-res scan. NIGHT 2 (2026-07-25/26, ~39cr spent of approved ~50):
   de-dressed 2D faces + the 3D face scan LANDED (tmp/face-lab/scan/head-scan.glb,
   gorgeous, James approved spend); chassis→scan registration failed 3 ways, then
   ROAD B LANDED on James's pick: the scan mesh IS the head — 66 morphs
   kernel-transferred from an MPFB donor + real eyeballs in recessed sockets
   (transfer_morphs.py, scan-morphed.blend; neutral/smile/jaw good, sheet sent).
   Read the lab changelog FIRST. Road B socket surgery then REJECTED by James as
   hacking ("raw meat + golf balls") → PROFESSIONAL PIVOT 2026-07-26: James bought
   KeenTools Cloud (key in .env, tools/keentools.mjs) — head.glb LANDED first try
   once inputs were right (front+40°L+40°R renders of the painted scan; profiles
   fail; painted style fine): his face, real opening mouth+teeth, real closing
   eyelids, 55 ARKit keys (tmp/face-lab/keentools/head.glb, sheet sent). Agreed
   stack: FaceTracker (James performs, ElevenLabs speech-to-speech re-timbres),
   Audio2Face/Rhubarb→ARKit for NPC lines, prompt-language performance scripts.
   NEXT: KT head into lab picker for James's judgment, props mounting, viseme
   adapter. Future characters: same pipeline (concept→de-dress→scan→40°
   renders→KeenTools). Then DLO integration + voice.
0.7. THE VALENCE LAB: the realistic molecule visualizer (James's brief + name,
   2026-07-24). PHASE A BUILT 2026-07-24; PHASE B (bonding bench) BUILT 2026-07-25
   on James's go + his three calls (instant bonding, loud honest refusals, ~10%
   ghost shells) — draft v3, AWAITING JAMES'S EYES. Same-night on his feedback:
   layer A/B toggle + per-layer visibility sliders, then the SCOPE CONSOLE
   (right panel tabs specimen/controls/recipes — ⚙ tuner retired, "it's not a
   config") and the click-to-brew RECIPE BOOK with sim-asserted trap-safe feed
   orders. Real physics throughout: an
   in-house RHF/UHF STO-3G Hartree-Fock solver (`tmp/the-valence-lab/hf/`) bakes
   all nine molecules' true densities into 24 KB (`assets/molecules-data.js`);
   swarm dots are Metropolis samples of that density; ghost shells are its
   runtime-carved isosurface; valence engine with completion hints + O₂-trap
   sequencing (H,O,O,H for peroxide). Sims: atom-sim 129 + molecule-sim 324
   assertions, all green. Read the world's CLAUDE.md first — honesty contract
   (incl. the N₂ dual-guess SCF rule) and remaining phases: C narrated
   scale-journey chapters (Claude scripts, James produces voice), D elephant
   toothpaste + polymers. Each phase needs its own go.
1. DROPZILLA: keep filling the soundboard tabs — banks 3–10 are open (GAS and CHUCK OPINES
   are live). James supplies audio per bank; Claude wires pads, labels, and icons.
2. DROPZILLA: re-enable the drift exits (sticker, note, cable) — temporarily commented out
   in index.html on 2026-07-16; James found them distracting during the soundboard build-out.
3. ARACHNO-WARS: tank-color tuner panel (Chrome Rift tuner pattern) — two color pickers
   driving `HULL_TINT` live, localStorage-persisted. Approved 2026-07-19, build later.
4. ARACHNO-WARS 2500: the spider-vision side-scroller, forked from AW2000 on 2026-07-24
   (James: fork, keep 2000 as the intact duel archive). Graybox movement prototype BUILT
   2026-07-24, then LEG-LOOK ITERATION b2–b12 same night with James driving by eye:
   light-sky recolor + camera-zoom sizing, 8 legs per AW2000 reference art (tapered
   segments, knee bulbs, needle tips), perimeter-walk foot targets, LIQUID-METAL leg
   identity (stretch across gulfs — core lore, see world CLAUDE.md), asymmetric gait
   (front legs pull, rear legs dig in + power-stroke, anti-realism per James), per-pair
   leg lengths, +30% barrel. All 27 sim assertions still pass
   (`node tmp/arachno-wars-2500/movement-sim.mjs`). James engaged and happy with
   direction. NEXT: more feel passes, then tuner panel → first enemy (pillbox) + firing.
   Feel questions + agreed pillars in `src/worlds/arachno-wars-2500/CLAUDE.md` (READ
   IT — it has protected behaviors + hard-won gait lessons). Draft: no
   drift/registry/sound yet.
5. SPASTIC SPACE REVIVALS: recreate `pork.html` and `scary_corndog.html` as two new worlds,
   approved 2026-07-19. Full analysis + GIF timing data + build plan in
   `assets/spastic-space/recreation-notes.md` (read it first — timing table is exact, decoded
   from the original GIFs with `tools/gif-analyze.mjs`). CSS/JS animation instead of GIFs,
   scaled up for modern screens, hidden-link hotspots become drift exits, and each page gets
   a Chrome Rift-style tuner panel for live timing tweaks (James wants to tune by eye).
   UPDATE 2026-07-19: the Spastic Space Flash is NOT lost — 70 SWFs play via the Ruffle
   harness at `tmp/flash-test/` (gitignored — they still need a durable home, ask James).
   See the "Flash status update" section in recreation-notes.md. Embedding is parked;
   recreations proceed as planned.
   Co-build with James — plan first, his go before building.
   UPDATE 2026-07-19 (build session): the pork half is BUILT as **Relaaax**
   (`src/worlds/relaaax/`, James's rename) — tunable field renderer staged in a resizable
   frame, draft status, no drift/registry yet. Remaining: James tunes by eye; decide the
   setting (his idea: the field playing on a TV in a scene, people watching and drooling);
   then ship wiring. scary_corndog not started — read that world's CLAUDE.md first.
   UPDATE 2026-07-24: tuner massively expanded per James (grid, margins, corners, tile
   size/overlap, blur, 24 patterns, presets system, frame snaps — see world changelog).
   James delighted ("way beyond what I expected"). UPDATE 2026-07-24 late: music
   reactivity phase 1 BUILT (his go) — 3 Suno tracks in assets/sound-tracks/, player +
   shuffle, band/beat analysis, 6-row mod matrix with its own presets + per-track
   recall, sim passes (tmp/relaaax/music-sim.mjs). SAME SESSION, James's "go nuts":
   VISUAL DJ CLAUDE built — offline track analysis (tmp/relaaax/track-analyze.mjs)
   + per-track authored light-show compositions (assets/compositions.js, labelled
   events on measured drops/sections) + DOM-free timeline engine (composition.js),
   "claude's set"/"free play" toggle. THEN the full expansion (James: "every single
   thing... go nuts"): 12 structure features (shapes/layouts/merges/palettes/
   waveforms/etc), 12-effect WebGL FX rack (fx.js), 20 new matrix targets, two-tab
   control surface (tuner.js) with DETACHABLE controller window (tuner.html,
   BroadcastChannel), DJ sets re-choreographed v2. Sims pass; pork-2002 default
   regression-asserted. Set tuning is conversational by event label. Architecture
   map in the world's CLAUDE.md. v3 2026-07-25 late ("push the envelope", James's
   go after recap; true-fluid-sim + 3D-venue SHELVED by him): SCENE LAYER —
   4 GPU backdrops under the tiles (ink/ridge/flame/nebula, scenes.js, distilled
   from his tmp/relaaax/viz-examples folder), 9 scene* keys as sliders/matrix
   targets/composition params; analyzer v2 (bar grid + Foote novelty →
   phrase/sectionsV2); sets re-woven phrase-aware v3; sims 76+14 green, all 6
   shader programs compile-verified; FLAME FARM overnight genome search ran
   (12k renders → James culled 20 via a checkbox gallery; they are live as
   flame-genomes.js and the flame scene plays them). v6 2026-07-26 (James
   heard that Angular is 115 BPM, not the 76 the analyzer claimed — a 2/3
   metrical error): tempo detection REWRITTEN (superflux onsets, comb
   proposes / binomial-likelihood alignment disposes, BPM_OVERRIDE for his
   ear), punch detection (drops/break-returns/groove changes/builds), a
   grid-locked BEAT CLOCK with lag-free pulse/bar/phrase/swing mod sources +
   10 accent patterns + syncBeats, and sets rebuilt as LOOK VOCABULARY +
   VARIATIONS + a bar-indexed SCORE. Manual 🎲 dice shipped (James loves it).
   Sims 123 + 42 + clock-test. VERDICT: "definitely major improvement."
   NEXT, each with its own go — see the world CLAUDE.md "NEXT UP" section:
   (1) time-varying beat detection that admits when there is NO beat (Timber's
   first minute is arrhythmic), (2) splitting audio into registers/instruments
   so different parameters follow different players, (3) per-parameter
   re-rolling locked to the grid. An auto-dice build was reverted at his
   instruction — good idea, not ready to drop in.
6. SURROUND: player-vs-computer recreation of Atari's Surround (1977), BUILT
   2026-07-25 as a draft on James's direct ask ("slick and modern looking, 2026
   appropriate") — `src/worlds/surround/` (read its CLAUDE.md first). Pure sim-tested
   core (`node tmp/surround/sim.mjs`, 7139 assertions), three AI tiers (ORACLE =
   Voronoi + separated-mode space-fill), tuner, synthesized sound via shared control.
   REBUILT IN 3D 2026-07-26 (James, before playing it: "one of the most boring
   looking things I've ever seen... spruce it up massively, 3D effects, a neat HUD,
   cool lighting"): three.js `render3d.js` — light-walls that rise behind each rider
   and cool down the tail, under-glass reflections, glass floor + void grid with
   rider light pools, BFS territory wash (`territory.js`) + HUD meter, containment
   field that brightens on approach, crash power-down wave, custom bloom/ACES post
   chain; new HUD; tuner split PLAY/LOOK with 14 live render knobs and file-backed
   presets. game-core.js untouched. Silent look-dev harness at
   `tmp/surround/lookdev.html` (KEEP IT) + `tmp/surround/smoke.html` (sound-stubbed
   twin of the real page, `node tmp/surround/make-smoke.mjs`). Same night on his
   two looks: canvas sizing fixed (a canvas is a REPLACED element — `inset: 0`
   leaves it 300x150 in the corner), PAUSE (P/Esc, auto-pause on blur, 800ms GO
   beat on resume) + two-step FORFEIT added, camera framing rewritten as a real
   corner-projection solve (was filling 56% of the frame), and the grid presets
   deepened to ~1.5:1 (34x23/44x30/58x39) because a 16:9 grid projects far wider
   than the window once tilted. James: "surprisingly cool and fun." Next: feel
   pass (speed, tilt, default AI), then ship wiring (world.json, drift exits,
   registry — mind the drafts-in-registry gotcha).
7. COMBAT: player-vs-computer recreation of Atari's Combat (1977) level one — one
   tank, one CPU, six symmetric mazes — BUILT 2026-07-25 as a draft on James's ask,
   same night as Surround (its sibling world: shared styling + architecture) —
   `src/worlds/combat/` (read its CLAUDE.md first; it has the padded-LOS and
   dodge-without-muting-guns AI lessons). Pure sim-tested core
   (`node tmp/combat/sim.mjs`, 556k assertions), 3 AI tiers, 2:16 timed matches,
   bounce-shots toggle, tuner with click-away. AWAITING JAMES'S FIRST DRIVE.
   Next: feel pass, then ship wiring. Unbuilt ideas: biplanes/jets, more of the
   27-mode matrix, touch controls (World Ideas #60).
3. (dropped 2026-07-18: "city tile" panorama — James sealed the shop with a Meshy door
   instead; there is no outside. If one ever returns, it gets built properly.)

(SSH remotes shipped 2026-07-16: all repos push over SSH now, see memory
`chunk-large-git-pushes`; blipblops was skipped, it has no `.git` directory)

## Local preview

- Use the local dev server (`server.mjs` via `.claude/launch.json`) for previewing and verification. **Port is 4174, always** — the server defaults to it, the launcher uses it, nothing uses 4173 anymore (retired 2026-07-13). (A brief "no dev server" rule existed on 2026-07-11; James reversed it the same day.)
- Worlds should still degrade gracefully under `file://` — drift carries query-string fallback state, and world code must not rely on `fetch()` for assets (blocked on `file://`; use media elements or synthesis).

## Admin panel (root index.html)

- **Naming: James calls this the "Elastic Space admin panel" / "admin page" — never "map
  room" (deprecated 2026-07-16).**
- The repo-root `index.html` is the admin panel: server status light, the page directory, the
  dashboard-icons toggle, and the world editor (the former `/admin/` page, which now redirects
  to `/`). It is James's primary starting point while the project is in active development.
- `start-elastic-space.cmd` at the repo root is the ONE launcher (`serve-local.cmd` and
  `start-local.cmd` were deleted 2026-07-13 — do not recreate them, nor any older launcher
  names). Double-click: reuses a running server or starts it in its own CMD window on
  port 4174, then opens the admin panel. It can also be launched from the ai-projects ops
  dashboard's Launch button. Never make James start the server from a command line.
- The admin panel page must keep working from `file://`: it polls `http://127.0.0.1:4174/healthz`
  (the server sends `Access-Control-Allow-Origin: *`) and switches itself to the served copy when
  the server comes up; editor panels stay dormant until then.
- Every page loads `../../core/dashboard-control.js`, which renders the top-right dashboard icon
  linking back to the admin panel; the shared sound control sits directly below it. The admin
  panel's "show dashboard icons" toggle (localStorage key `elastic-dashboard-icons`) shows/hides
  these icons site-wide; sound icons are unaffected. Every new page must include
  dashboard-control.js.
- The worlds list is two sections since 2026-07-19: "In progress worlds" (Welcome pinned
  on top) and "Completed worlds", each alphabetized ignoring a leading "The". New worlds
  still get a direct link — into "In progress worlds" — as part of shipping. Gallery
  worlds also get a "curate" pill in their row (`.page-row` / `.curate-link`) linking to
  the world with `?curate=1`. Each world row ends in a kebab (⋮) menu (served copy only)
  holding "move to completed"/"move to in progress" (via `POST /api/worlds/:slug/status`,
  which rewrites index.html keeping the sort) and "archive". James never wants the
  archive action visible outside the kebab.
- `welcome.html` at the repo root is the visitor-facing front door (line-drawing Jerry on dark
  blue; clicking him enters Jerry's Pool — an intentional fixed route, no `data-drift`). At
  publish time it becomes the public site's `index.html` in place of the admin panel. Root-level
  pages load dashboard-control with `data-home="./index.html"` since the default home path
  assumes world folder depth.

## World drafts (admin panel)

- `world-drafts.json` at the repo root stores page drafts James creates in the admin panel's
  world editor tab ("new draft" dialog: title, synopsis, vibe, reference links, sound notes,
  ideas). The dev server reads and writes it via `/api/drafts`; don't hand-edit the shape.
- The dialog's "engage" button marks a draft `engaged` and inserts a line into the Todo
  section above. **Engage means discuss, never one-shot.** Picking up an engaged draft is a
  conversation in three steps, in order: (1) read it from `world-drafts.json` and ask James
  your questions; (2) present a build plan; (3) discuss the plan with him. Only after James
  gives an explicit go on the discussed plan does any building start — no world code, no
  scaffolding, no assets before that. This holds even when the draft was originally Claude's
  idea. New worlds are co-built, never unprompted. When the world ships, remove
  the todo line, mark the draft's status `built`, and update `World Ideas.md`.

## Curator mode (gallery worlds)

- `src/core/curator.js` is the reusable in-world curation module (built 2026-07-16 on
  Mandala Shop). A gallery world loads it via dynamic import when `?curate=1` is present
  and the page is served, passing an adapter: THREE + scene/camera/stage, the live layout
  object, analytic wall/floor geometry, slot add/remove/update/reset hooks, frame kit,
  protected slot ids, and input locks. See `src/worlds/mandala-shop/world.js` for the
  reference adapter.
- Server side: `GET /api/worlds/:slug/art` lists `assets/art/` images;
  `PUT /api/worlds/:slug/layout` validates and rewrites `assets/layout.js` (Blender Z-up
  coords, `globalThis.<SLUG>_LAYOUT` format), backing up the previous file to
  `tmp/<slug>/layout-backups/` first.
- Layout files are curator-owned once a world ships: never hand-edit slot data casually,
  and never let a Blender build script reseed `layout.js` unguarded (Mandala Shop's
  build.py requires `MS_WRITE_LAYOUT=1`).

## World changelogs

- Every world folder contains a `changelog.md`; `src/worlds/_template/changelog.md` is the starter.
- Append an entry whenever a session meaningfully changes a world: date, author, what changed, and where things stand or what comes next.
- Newest entries first. Never rewrite or delete earlier entries.
- World idea backlog and selection history live in `World Ideas.md` at the repo root (sections per contributor, global idea numbering; formerly `Claude's Ideas.md`); update statuses there when a world is selected, built, or shipped.

## Audio generation (ElevenLabs)

- James's ElevenLabs API key lives in the gitignored `.env` at the repo root (`ELEVENLABS_API_KEY`). Never commit it or reference it from world code — worlds are client-side and anything they load is public.
- ElevenLabs is an authoring-time pipeline only: generate audio locally with `node tools/eleven.mjs` (voices | sfx | tts | music), save results into `src/worlds/<slug>/assets/audio/`, and commit only the audio files.
- Continuous or parametric sound (pitch glides, physics-driven audio) stays Web Audio synthesis; ElevenLabs covers one-shots, voices, ambience beds, and music.

## Blender usage

- The live Blender instance (MCP add-on) is shared across all agent sessions. Never open, switch, or create files in it without James's explicit go-ahead — `is_dirty` is not a reliable guard against destroying another session's in-memory work.
- Default to headless Blender for scripted scene work: `& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background <file.blend> --python <script.py>`. Each run is a private process that never touches the live window.
- Each world keeps its own .blend (plus build scripts and renders) under `tmp/<world-slug>/`.
- Reserve the live instance for work that needs the UI: viewport captures, MPFB2 workflows, interactive tweaks.

## World sound control

- Every world with sound uses the shared control: load `../../core/sound-control.js` and call
  `ElasticSoundControl.attach({ media })` with an audio element, or
  `ElasticSoundControl.attach({ start, stop, setVolume })` for Web Audio synthesis.
- It renders the standard speaker button top right (pulses twice on load, tooltip, on/off states,
  hover volume slider) and makes one autoplay attempt — sound starts immediately for visitors who
  have granted the site sound permission, and waits for the button otherwise.
- Worlds needing a second volume channel (e.g. music separate from SFX) pass
  `channels: [{ label, value, setVolume }]` to `attach()` — each renders as a labelled slider
  below the main one on hover (added 2026-07-13 for Arachno-Wars 2000's music).
- Do not build per-world audio toggles or autoplay hacks; extend `sound-control.js` if a world
  needs something it doesn't cover.

## Links between worlds

- Random drift is the default. Do not choose or name the destination.
- Exits encourage exploration, never thwart it: finding a way onward must not be a hard puzzle.
- Exits are diegetic scene elements — never a literal link, button, or labeled control in appearance.
- Each world generally offers at least three drift choices somewhere on the page. Hidden bonus exits may exist beyond those three.
- Make a portal with `href="../../../index.html"`, a generic accessible label, and the `data-drift` attribute.
- Load `../../core/world-registry.js` and then `../../core/drift.js` in each world that offers drift links.
- Direct links are allowed only when the user explicitly wants a fixed route, such as an authored sequence. Fixed links do not use `data-drift`.
- Drift avoids worlds already seen in the current cycle. Do not implement separate destination memory inside a world.
- After adding, removing, or renaming a world, run `npm run registry`. **Gotcha (found
  2026-07-24): the generator includes draft-status worlds.** Drafts must stay OUT of the
  drift pool until ship — if the repo has drafts, restore the registry after regenerating
  (`git checkout -- src/core/world-registry.js`) or hand-check the diff.
- The root `index.html` is an intentional named directory and may use direct links.

## Per-world instructions

- **Every world has its own `src/worlds/<slug>/CLAUDE.md`.** When James says "let's work on
  <world>", the FIRST step is to read that world's CLAUDE.md (plus the docs it points to).
  Claude Code also auto-loads it when touching files in the world's folder.
- Division of documentation: anything specific to one world (rendering constraints,
  physics, timing, protected behaviors, in-progress work) is documented in that world's
  CLAUDE.md. This file (elastic-space level) holds only all-world rules and the services
  we connect to.
- New worlds get a CLAUDE.md at ship time (`src/worlds/_template/CLAUDE.md` is the starter),
  and sessions add world rules there as they surface — not here.
- Some worlds carry extra docs in their folder (e.g. `arachno-wars-2000/overhaul-roadmap.md`
  and `spider-vision.md`, `dead-letter-office/README.md`); Jerry's Pool's deep-dive docs are
  in repo-root `docs/` (`current-index.md`, `denizen-frequency-rubric.md`).

## 3D assets (Meshy)

- James has a Meshy Premium account (since 2026-07-17) and premade object libraries there —
  check his library before hand-modeling props or characters in Blender.
- The `meshy` MCP server is available in Claude Code sessions. Every generation call costs
  credits: state the cost and get James's confirmation before calling anything that spends.
- Seamless texture tiles via text-to-image are the go-to look multiplier for 3D worlds
  (Mandala Shop is the reference).
- Prompt-handoff workflow: Claude writes a prompt + context package, James tunes on the
  Meshy canvas, Claude pulls results via `meshy_list_tasks` / download. Check scale against
  viewing distance before importing.
- Gotcha: Meshy materials duplicate the texture atlas as `emissiveMap` — when swapping
  textures, swap both maps.

## Music (Suno)

- James authors full music tracks himself at suno.com — it is a manual, browser-side tool
  (no API, no CLI); Claude never generates there. Claude can help draft prompts or lyrics
  when asked.
- Integration pattern (reference: Chrome Rift's Saffron tracks): James drops finished MP3s
  into `src/worlds/<slug>/assets/audio/`, Claude wires them — playlist array in world.js,
  playback through the shared sound control like any other audio.
- Division of labor with ElevenLabs: Suno for full songs/soundtracks James curates by ear;
  ElevenLabs (`tools/eleven.mjs`) for SFX, voices, and ambience beds; Web Audio synthesis
  for continuous/parametric sound.