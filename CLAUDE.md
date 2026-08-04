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
   reef-sim de-flaked (seeded probes). v53.1: spawn 27km → 54km on James's
   "twice as far back" (nebula-sim TEST 9 guards the spawn + approach line
   from being swallowed by a bank). v53.2: fixed the console eating its
   bottom readouts (BNK/Z/SHD) below 1440px viewport height — type now sized
   against --readout-h; tmp/orb-dimension/console-fit.html measures it.
   All 9 sims green. AWAITING JAMES'S FLIGHT (the gas in-world for the first
   time, the new spawn distance; also still open from v52: window density).
   v54 2026-07-28 (James flew v53 — nebulae "cool if a little underwhelming...
   kinda small"; Saelyri "a good start but still very lacking"): nebScale GOD
   MODE dial (0.5–2.0, default 1.6; nebula-sim TEST 10 re-proves every
   clearance at the dial ceiling). THE BEING EDITOR `src/labs/being-editor/`
   (admin Labs section, being dropdown = roster contract, one Saelyri entry)
   supersedes the tmp saelyri lab: interior rebuilt as three layers
   (shell at d=0 / ridged-fbm filaments / shrunk-form skeleton) + v54.1
   exposure fix with James watching — his read on the first cut: loves the
   "rippling purple fire at the edges", interior was clipping pure white
   (filled-core skeleton term + emission summing past 1.0; both fixed, edge
   kept identical). r3 sheets in tmp/snapshots/ show filaments through every
   state; captures went through the server's /api/dev-snapshot because the
   pane wouldn't composite. AWAITING his eyes: nebScale in-flight, Being
   Editor r3 look (his sliders: structure / core heat / edge).
   v54.2–v55.4 2026-07-28 (James flying all night, driving by feel): stickGrab
   dial + dotted ghost grab ring; reticleCenter() — then the LENS SHIFT
   (v55.4): the optical axis now exits through the reticle X (proj[9]), so
   rolls/turns/zoom pivot on the cross (any new screen↔world math must add
   projShiftY()). THE POD CONTRACT (v55.3, his emphatic spec: "this is
   space... it turns where I turn it and stays there"): ship-frame rotations
   only, reticle tilt = COMMANDED roll (rollShown), never world attitude; the
   v55.2 horizon-locked-yaw experiment was built and REVERTED the same night
   — do not rebuild. Presets now travel (static-host fallback + first-load
   apply) + CAPTURE SPAWN in the tuner (spawnPose rides presets; H honors
   it). Distance vibe: aerial + melt dials ("the air"); the MAGNIFIER
   (wheel 1×–8×, Z reset, steering slows /zoom). All awaiting his continued
   flights; sims grew stick-sim TEST 7 (pod contract) + nine-green suite.
   2026-07-29: BEING EDITOR PERSISTENCE — James lost a tweaked look to a
   closed tab (the lab had none). Now: continuous localStorage autosave
   (reopen = exact state) + file-backed presets
   (`src/labs/being-editor/assets/presets.json`, picker/save/save-as/
   make-default; saving IS telling Claude). server.mjs presets route
   generalized to `/api/(worlds|labs)/:slug/presets` — NEEDS A SERVER
   RESTART James hasn't done yet. His lost look must be re-dialed; he
   announced "some new stuff" for Orb Dimension but never got to it.
   Presets file-backed since v49.4 (james-prefs-01 is start preset).
   2026-07-31: Being Editor PERF PASS (resolution cap ~1.5M px, one-SDF-per-
   step, 3-shape default sheet + full-bleed layout — James's "killing my
   laptop" fixed) and preset james-being-01 saved + made default.
   v56 2026-07-31 (PHASE B1 BUILT — James's go on Claude's 11-question plan,
   his overrides: 10m beings, populations 10× "a living place... a hundred at
   least"): THE SAELYRI IN-WORLD — 140 beings default (dials saelyri/
   citizens/saeNotice in GOD MODE · the societies), kind-65 raymarched orb
   actors with james-being-01 baked, mote↔body LOD (far = 2-line glow),
   closed-form orbits + bridge travelers + whim-morph schedule (rest
   humanoid, 12s melts), respond-in-place acknowledgment (face + brighten +
   one of 10 authored glyphs in random colors + per-family greeting chords),
   Cadence castes 3× (162 robots). society-sim TEST 12 (incl. skull
   clearance at dial ceiling — the probe caught beings orbiting through the
   bone), shader-check now compiles the main orb FS. All nine sims green.
   AWAITING HIS FIRST FLIGHT (crowd feel, greeting range, chord taste,
   frame rate in a crowd). NEXT, each with its own go: Phase B2 (fleet
   community routes + society sound beds — split from B1 at his call),
   Phase C resources (tritium + 2 asteroid types, harvest verbs), Phase D reef
   expansion (4× size, glyphs, new creatures). Spec:
   `src/worlds/orb-dimension/expansion-spec.md` "The cooperative societies"
   section (read it first). Still spec-only: stargates, gulf depot grid, luminous
   region. Related: World Ideas #57 (The Solar System) inherits this tech.
   2026-08-01 (same overnight session): THE RESONANCE TRADE designed + agreed
   as PHASE C'S SPINE (spec section "The resonance trade" — tritium out,
   reef-grown matched RESONANCE PEARLS back; small pair = comms, large pair =
   jump gate; gates are the future drift exits). Threats/defense (player as
   cartoony-fun defender, auto-targeting light missiles) + wider-world threads
   (singletons, tourists, more denizens) recorded in the spec, unscoped.
   v57 same night (James's close-up: "windows way too big... don't look at all
   like real buildings"): CRUST DETAIL PASS — physical window pitch (~7.4m via
   ec channel; NEVER per-face fixed grids), 3 wall patterns + dim roof hatches,
   emissive aux-3 screens/neon (ad frames + neon rails), dish clusters, sign
   pylons, rooftop kits, tank level-bands; judged in tmp/orb-dimension/
   crust-lab.html (KEEP — 3 rounds before James saw round 1). v57.1: the
   ORIGIN BUG James caught in-flight (vC = aCenter+uOrigin destroyed windows
   in-world while the zero-origin lab looked perfect) — fixed with raw vE
   varying; the lab now renders under a huge world-condition origin, never
   set it back to zero. v57.2 experiments: reticle PINNED (display-only,
   rollShown still integrates, one line to revert; his verdict rewrites or
   restores the pod contract's reticle clause) + roll °/s dial (rollMax,
   default 29 = old rate). NOTE: mid-session, four open task-tracker items
   were executed by an unidentified background worker (sims/docs burst
   23:03–23:07, task list emptied; James confirmed no other sessions) —
   work verified good and owned as v56; see memory task-queue-auto-worker.
   AWAITING JAMES: B1 first flight verdicts, crust v57 in-flight look,
   pinned-reticle + roll-dial feel.
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
   SESSION 2026-07-26/27 — REBUILT AS ONE FAMILY. James dropped the old KT head:
   mixing a head from one generation family with props from another is the fit
   problem we kept hitting. STANDING RULE (memory `no-cutting-3d-assets`): never
   cut pieces off an existing model — generate every asset individually. The
   original model is a RENDER SOURCE, never an asset source. New pipeline:
   render_plates.py → 8 plates → written brief to Meshy's AI agent → one
   generation per piece → conform + mount. LANDED: bald head → KeenTools →
   `assets/postmaster-kt2.glb` (10.7 MB, 55 keys) in the picker as "postmaster
   v2", James confirmed it looks and moves well; facial hair generated (1.49M
   verts, good shape) and measured-mounted as `postmaster-kt2-beard.glb` (static
   placement preview, no morphs yet). NOT RESOLVED: the beard's fit — mustache at
   the nostrils, hair inside the ear. Transform-hunting has hit its ceiling; the
   next attempt must CONFORM (project the inner surface onto the face) and be
   driven INTERACTIVELY in a viewport, not by numeric passes over chat. Parked:
   eyelid texture artifact (KeenTools painted an eye into the head's own texture;
   texture-only repair, diag_eyelid.py). Still to generate: hair, brows, cap,
   glasses — ask Meshy for should_remesh:true + quad + ~40k, since the meshy-6
   default is remesh OFF, which is why the beard arrived at 1.49M verts.
   SESSION 2026-07-31 (postmaster = THE POC, James's framing: he unlocks
   everything — face, beard, arms down, animations, clothing, accoutrements):
   eyelid repair rounds 4–10 landed in `assets/postmaster-kt2.glb` (head socket
   repaint + eyeball sclera scrub + baked-shadow removal; the changelog's
   method lesson: dump textures + render UNLIT before tuning thresholds).
   fix_eyelid.py has a stronger de-shadow cap (2.2) EDITED BUT NOT RUN.
   Agreed orders: beard = remesh FIRST (5cr, no go given yet) then conform-fit
   interactively; Mixamo is free (Adobe ID only); glasses regenerate from the
   drawing, procedural pair retired. Refs: DLO assets/ref/05_POSTMASTER.png.
   READ `src/labs/face-lab/changelog.md` before touching any of this.
   SESSION 2026-07-31/08-01 — THE DO-OVER NIGHT. `docs/character-pipeline.md`
   is now the canonical make-a-character recipe (prompt pack + lessons) — READ
   IT FIRST for any character work. Head purge (twice — wrong keeper on take 1;
   memory `delete-by-numbered-list`), then a whole NEW FAMILY in one night:
   ChatGPT turnaround/head/wig-v5 hair/beard/hat/glasses (sheets + crops in
   tmp/dead-letter-office/), six Meshy pieces first-try (180cr, remesh-on
   quad 40k), head→KeenTools→"postmaster v3" picker entry, James rigged the
   body at Mixamo + banked 12 clips, three Blender assembly rounds
   (tmp/dead-letter-office/meshy-v2/assembly + scripts/). ENDED IN A PIVOT,
   James's call after the art-alignment review: KT HEAD RETIRED — FaceBuilder's
   realistic template deletes stylized proportions (family mismatch with the
   gnome props). New doctrine: the Meshy mesh IS the character; the rig comes
   TO the mesh. Faceit 2.3.73 + Auto-Rig Pro installed (zips in
   ai-projects/_blender-add-ons/). NEXT with his go: gnome head + GENERATED
   eyes/inner-mouth → Faceit 52-key test → conform props → render gate →
   Unity. Approved spends: SALSA (~$40) once a morph head is in Unity;
   animation packs after retarget testing. Full verdicts: face-lab changelog.
   2026-08-01 (day): FACEIT ROUTE PARKED → **CC5 PIVOT**. Scripted eye/teeth
   installation came out uncanny; James bought Reallusion CC5 + Headshot 3 +
   iClone 8 + AccuPOSE (~$623) — head-wrapping drapes THEIR rigged topology over
   OUR mesh so the shape wins. No MCP/headless for these tools: James drives the
   GUI, Claude rides shotgun via desktop control.
   2026-08-01 (night): THE BODY QUESTION ANSWERED — **there is no short-fat-old-man
   model to buy.** Short is a typed height, chubby is morph sliders; the market
   sells the slider set, not the man. (James rejected all dwarf/gnome/fantasy
   options: he wants an ordinary older guy, "a Santa Claus body, but shorter.")
   He owns stock CC5 only — 175 embedded sliders, 10 Body Morph presets, all
   slim/fit. If the built-ins fall short: HD Ultimate Morphs $149, or ~$40 of Daz
   (Old Chap + Aging Morphs, Genesis 8) via CC5's Transformer. Claude drove CC5
   by desktop control for the first time; body swap PROVED to leave the head
   untouched, then the reset trap (Proportion → Reset All clears BONE edits only,
   NOT morph sliders — they stack invisibly) forced a restart from the clean
   project. **Baseline file: `tmp/dead-letter-office/Postmaster-CharacterCreator/
   RL_CC3_Plus.ccProject`.** STILL OPEN: the backward head tilt (rest-pose
   rotation on the head bone) and making him short + round. The CC5 click-path
   runbook (camera hotkeys, Content Manager paths, Headshot 3 alignment points,
   the blob diagnosis) is now in `docs/character-pipeline.md` — READ IT before
   touching CC5.
   2026-08-02 (overnight): **THE POSTMASTER EXISTS.** James bought HD Ultimate
   Morphs; Heavy Male morph + Ultimate sliders + height-down = the body
   ("Santa's brother who took the civil service exam"); body-first Headshot
   wrap attached clean; teeth seated (isolate mode + move tool — object
   transforms are LOCKED for base anatomy); dressed + white hair/beard +
   glasses from stock CC content. His verdict: "finally good enough to move
   out of this phase." Runbook second pass in docs/character-pipeline.md
   (items 7–13: base loads from Modify panel not Content Manager, head FBX
   imports at 1/12 scale, two selection systems, cloth Diffuse Color chip,
   the unfound hold-mouth-open toggle). Working file:
   tmp/dead-letter-office/Postmaster-CharacterCreator/Postmaster-body-01
   .ccProject (SUPERSEDES the same-named contaminated one from 08-01).
   NEXT with his go: hat + Meshy props as accessories, native beard pack
   purchase, neck/tilt profile check, skin-tone seam match, head-size
   decision, then the two export tracks (iClone speech; CC→FBX→Blender→GLB
   into DLO with Mouth Open as Morph checked).
   2026-08-02 (evening): **THE FACIAL RIG IS VERIFIED.** James ran a full
   Headshot 3 Mesh-to-Head from the raw OBJ himself — Claude COACHING by
   screenshot, not driving (his correction at the top of the session: "I'm
   not learning anything"; agreed split = Claude drives tedious mechanical
   passes, James drives judgment calls). Head attached to a CC body with a
   seamless neck; facial clip played from Animation Player → Motion →
   facial rig. His verdict: "a thousand times more successful than anything
   we've done so far... it still looks like the guy... his skin moves around
   as if there are bones underneath." THE BUG THAT ATE THE SESSION (Claude's
   instruction): Headshot uses the source prop's WORLD POSITION literally, so
   "base at world origin" mounted the head on the FLOOR between the feet with
   the neck stretched 160cm — load a base character FIRST and overlap the
   source head on its head (Z~160, Scale 1200, Rotate 0/0/0). Runbook third
   pass (items 14–25: the snapshot-stale align pane, right-drag orbits the
   pane, points 26/29/32 are on the BACK of the head, no clear-all so
   re-import the prop, re-run gen after hiding faces) is in
   docs/character-pipeline.md — READ IT before touching Headshot again.
   OPEN, his call, not made: eyes/teeth read too realistic (materials not
   resolution), teeth need widening/pushing back, and THE BODY ROUTE —
   (1) rebuild gnome proportions on CC's own body so nothing is ever fitted
   to anything and clothes/hair conform by design [Claude's rec], (2) AccuRIG
   the Meshy body, (3) Transformer. He's confident he can make beards, hair
   and clothing work in CC.
   2026-08-02 (late): TOOLING PASS, no build — see docs/character-pipeline.md
   items 26–34. BOUGHT on Superhive: EyeForge ($16.98, 30 iris types incl. a
   stylized set — the answer to "eyes read too realistic") and Lambrador3D
   Realistic Mouth ($14.99, teeth+gums+tongue+THROAT, subdiv + 2,815-tri game
   build; take Jaw_Blend + Jaw_Textures, keep all 313MB in tmp/). RECOMMENDED
   not bought: Stylized Hair Pro ($22, MIT, mesh conversion — but grab v4.2.1
   for Blender 5.1, NOT the latest). REALLUSION CART PRICED at the 26th
   Anniversary buy-2-get-50%: iClone 8 + CC5 $449 + Headshot 3 $99.50 +
   AccuPOSE Infinity $74.50 = $623 excl. tax, 40 free min of AI Video Mocap;
   iClone earns its place on AI Video Mocap (video in, animation out) and
   AccuPOSE is an iClone-only plugin. Not bought, at 50% only during the sale:
   ActorMIXER PRO ($119.40) — check CC5 Deluxe overlap first. Key Headshot 3
   findings: the mesh workflow WRAPS CC topology onto your source (your
   topology is always replaced — that IS the product), stylized is an
   explicitly supported case via extra alignment points + normal baking,
   SubD-0 keeps output realtime-light, and image-to-3D is HEADS ONLY — Meshy
   still owns props and clothing.
   2026-08-02/03 (overnight): **JOHN DOUGH DRESSED + BAKED FOR WEB.** James in
   CC5 (Claude coaching by screenshot + headless-Blender adapter work): Meshy
   hat + glasses converted GLB→FBX, imported, fitted, attached to CC_Base_Head
   (hat renamed "PM Hat"; lens material split, opacity 0.04); hair-under-hat
   hidden via Edit Mesh; stock stylized eye preset replaced the too-human
   irises (one double-click — beat Claude's planned texture surgery); teeth
   swap attempted, CC5 crashed (undo-fragile, ~5th time), James reverted to
   human teeth by choice. Wardrobe stays stock (black sweater/grey trousers/
   boots) — real uniform deferred, he won't pay per-garment prices; wants a
   bundle later. Runbook items 35–44 added (docs/character-pipeline.md).
   THEN THE EXPORT TRACK RAN: CC5 FBX export (Mouth Open as Morph) →
   headless-Blender bake → `tmp/dead-letter-office/cc5-bake/john-dough.glb`,
   31.7MB, 106 bones, ALL 177 facial morphs (visemes incl.) — Meshy props
   decimated (82k→24k verts), textures 1024/512 WebP, CC Diffuse-Color tints
   re-applied from john-dough.json (FBX drops them), tear-line/eye-occlusion
   shells cut, leftover hidden Biker_Jeans cut (A/B render proved Trouser is
   the outfit). Renders approved-quality; James: "light years ahead."
   KNOWN GAP, his call pending: the beard (CC Smart Hair cards thin out
   through the pipeline — "older biker" not "Santa pirate"); agreed fix is
   Stylized Hair Pro ($22, v4.2.1) solid-mesh beard in Blender + weight/morph
   transfer, needs his go. NEXT: DLO world wiring (placement, capsule proxy,
   idle/face behavior — design conversation first), then animations + voice.
   2026-08-03/04 (THE FURNISHING NIGHT — the stage is set for him): DLO
   arrange mode became a full room editor (locks, spawn-in-hand, Ctrl+S,
   crane, everything placeable incl. desk/cabinets/pigeonholes/oil tank +
   James's 10-prop Meshy canvas batch baked in); James furnished the whole
   room from a blank canvas (60 items, saved); old Meshy postmaster benched
   then REHIRED against the new layout (sim 44/44, window station moved for
   his oil tank). His wrap words: "a really good night... months getting
   here. Tomorrow night we get a postmaster proper." AGREED: the retiring
   Meshy postmaster gets a framed-portrait placeable (render him FIRST).
   Read src/worlds/dead-letter-office/CLAUDE.md before starting — the
   rehire flags, prop pipeline, and dynamic-station rules are all there.
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
   sequencing (H,O,O,H for peroxide). Sims: atom-sim 129 + molecule-sim 404
   assertions, all green. v3.2 2026-07-26: the scope console got a TEXT SIZE
   control and a bigger default (whole panel sized in em off one base —
   `--ui-base` × `--ui-scale`, tuner key `textScale`, default 1.25; James
   found the 12px panel too small). Read the world's CLAUDE.md first — honesty
   contract (incl. the N₂ dual-guess SCF rule and the new item 8, the three
   labeled views of a molecule) and remaining phases: **B.5 the orbital
   viewer** (PROPOSED 2026-07-26, needs a go — James expected orbitals
   snapping together and got the total-density blob; the fix is to ship the MO
   coefficients we already compute and discard, plus a bond-length scan for an
   honest formation animation), C narrated scale-journey chapters (Claude
   scripts, James produces voice), D elephant toothpaste + polymers. Each
   phase needs its own go.
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
5. **LUMINA PANEL — START THE NEXT LUMINA SESSION HERE (James, 2026-07-27 wrap).**
   He said it explicitly at wrap: next time we start on optimizing the panel. It is a
   DESIGN CONVERSATION FIRST, not a build — read the "START HERE" section at the top of
   `src/worlds/lumina/CLAUDE.md` plus NEXT UP item 4 before saying anything. Short
   version: the panel is "a big jumble of lots of different stuff", it needs regrouping
   with shorter clearer explanations (largely a COPY EDIT — every control has a long
   sentence under it), it must invite live play while the music runs so he can use it
   like a VJ rig, and the dice becomes "a whole control function" rather than one button.
   PASS 2 BUILT 2026-07-27 (James's five tactical notes, same day): `configuration`
   button in the transport bar (floating circle icon gone), DETACHED WINDOW IS THE
   DEFAULT (his second call of the day — the button opens tuner.html; the dock picker
   is the route back in-page, four edges, persisted), charcoal panel instead of black,
   2× slider thumbs, readable section headers — see the world changelog. AWAITING HIS
   EYES; the regroup/VJ design conversation is still the open work. Two loose ends
   from pass 1: ↩ back and `keep` have never been click-tested, and the grid column
   minimum (15em) wants a sweep.
   PASS 3 2026-07-27/28 (same session, James driving by eye all night): THE LITTLE
   PLAYER — two-row card (SVG logo + LUMINA wordmark over the transport), deck-order
   ◀◀ ▶ ❚❚ ■ ▶▶ with separate play/pause, then ❄ animation freeze, 🎲 dice, blurry-die
   MELT ROLL (4s dissolve: blur veil up, structural swap at peak, sharpen into the
   new look), ⛶ expand toggle, Space/Z hotkeys. House default = 2002 animation
   edge-to-edge (fill + aspect-derived rows, full-window frame). "DEFAULT LAUNCH"
   preset system (set-as-default button; page opens on it). THE BLUR SAGA — three
   passes to the real bug: stock matrix row bass→blur 0.45 whited out the whole GL
   canvas whenever music played (fixed: bass→sizePulse + stored-settings migration +
   64px canvas-blur cap + sim guard); also MAX_DIM 1600→2560 (full-window upscale
   softness) and roll smear discipline. All in the world changelog. He plans
   "another round of VJing" from his tuned default launch.
   PASSES 4+5 2026-07-31 (same session as the dice-odds cuts — blur 20%→5%,
   iris out of the rack at 8%, melt roll 4s→2s): pass 4 = his four-part brief
   (−/+ text stepper, section CARDS in CSS columns filling a maximized window,
   gold headers + one-sentence summaries, plain-language copy pass) — his
   verdict "so much better"; pass 5 = his "do them all" on Claude's five
   usability proposals: per-card 🎲/🔒 (GROUPS in presets.js, host-enforced
   locks honored by both dice), thumbnail chip pickers (layout/shape/wave/
   palette/scene + ANIMATED pattern chips), ghost dots (sliders show live
   music modulation), the perform strip (6 punch pads + XY pad, keys 1–6),
   my-deck favorites + collapsible cards. Sims 252+43 green; tuner.html
   loads clean; NOT click-tested against a live host. AWAITING HIS EYES on
   all of pass 5.
   PASSES 6–7 + THE PERFORMANCE TIMELINE 2026-07-31/08-01 (all-night session,
   James driving by eye, verdicts "so slick" / "really going great"): the panel
   became a LAYOUT ENGINE — user-owned rows (1–5 cards each, drag grips, drag
   row heights, gear show/hide + reset, cards cross tabs via gear ⇄, per-window
   `lumina-layout`), sticky command bar (transport + freeze/dice/melt/back +
   volume), dock UI killed (remote-only, his call), base type 16→26→21px (his
   eye: old 80% = new 100%, scale key bumps per base change), ember control
   labels, plain-language copy + card summaries. World: fit-screen is the living
   frame default, player bar gained volume + collapse-to-wordmark, shared
   speaker hidden + dashboard icon 50% (this world only). Dice: blur odds 20→5%,
   iris out of the rack to 8%, melt roll 4s→2s. TWO NEW TRACKS analyzed+composed
   (Spore Circuit 130BPM bio-techno; Zion Rips 155BPM — v2 on his brief: ABAB
   lull then a 29-look one-way journey, no look repeated). THE PERFORMANCE
   TIMELINE built on his ask ("record segments... build it up over time" — NO
   QUANTIZE, his law, he doesn't trust detected downbeats): timeline.js pure
   core + host command-tap recording, per-key punch-in merge, loop-cycle takes,
   latch, ghost replay, "your set" player mode, timeline card with energy strip.
   Sims 24+300+53 green. AWAITING: his first recording session, both new sets
   in flight, 21px type verdict. NEXT (needs go): file-backed timelines,
   transcribing an earned performance into compositions.js.
   2026-08-02: NEW VISUALIZATION BACKLOG, James's picks from two brainstormed
   sets of 20 (first set was too literal/narrative — objects and one-way
   accretive growth, which he explicitly ruled out for Lumina, see
   `accretive-music-world-idea` memory for the spun-off future-world thought;
   second set corrected toward abstract/fluid/dice-compatible, which he
   confirmed is the right register). Approved for a build queue, not built
   yet: Living Type, Marbling (ebru), Aurora Curtains, Radio Static Painting
   (from set 1); Kaleidoscope Fold, Plasma Field, Ghost Face, Caustics Field,
   Chromatic Aberration Bloom, Moiré Interference Weave, Feedback Loop Zoom,
   Glitch Displacement, Aurora Ribbon Swarm (from set 2, his "abstract"
   register) — full descriptions are in this session's chat, write them up
   fresh in the world changelog when building starts. Back burner: Rainbow
   Particle Swirl (#19) and The Living Mandala Engine (#20, the synthesis
   piece — kaleidoscope + liminal raymarched core + fractal-flame color +
   feedback trails). Kaleidoscope Fold / Plasma / Caustics / Chromatic
   Aberration / Moiré / Feedback Loop / Glitch are FX-rack modifiers (stack
   on anything already live, multiplicative like the dice already are);
   Living Type / Marbling / Aurora Curtains / Radio Static / Ghost Face /
   Aurora Ribbon Swarm are new GPU scenes. SAME SESSION, a second thread
   still open: TRACK STRUCTURE MAPPING — James wants a tick-lock visual
   metronome (start it whenever aligned by ear, nudge BPM/phase until ticks
   land on the kick, saves as a permanent per-track BPM_OVERRIDE + beat-1
   offset) plus a hand-tapped structure lane (record mode, typed markers —
   break/buildup/fade-pause/drop/hit — snapped to the locked beat, reusable
   like `compositions.js` but hand-authored instead of guessed). His explicit
   call on auto-detection: don't over-invest — "elements to the way music
   sounds and hits people... you actually need me in that role," so the
   tick-lock UI and hand-tapped lane are the real tools, only a light pass on
   tightening existing tempo/phase detection to get him close faster. OPEN,
   his call not made: whether a marked moment should bias the dice odds
   (Claude's rec — keeps the always-surprising feel), hard-trigger a scripted
   combo, or let him flag specific markers as scripted while the rest bias.
   His drop example (dark/blurry/muted fade, then explode into Ghost Face +
   swirling tunnel + particle explosion on the backbeat) is the reference
   feel for whichever route he picks. Neither the visualization backlog nor
   the structure mapping is built — both need his go before code.
   2026-08-03: THIRD IDEA BATCH, sourced from reference stills James dropped
   in `tmp/lumina/viz-examples-2/` (all video captures — every image is
   in motion in the source). He called out viz 8/10/11, synesthesia-6/7/8,
   and all four sphere images (sphere, sphere-explodes, sphere-inside,
   sphere-long fibers) as the ones he loves; general note: he wants that
   rainbow-palette soft-blending-gradient look "once in a while." Claude
   read 8 of the 10 and derived a fresh batch, ADDED TO THE BACKLOG (same
   not-built status as the other two sets): Fiber Urchin Burst (coiled
   fiber-sphere that explodes into a screen-filling radial burst on hits,
   re-coils between), Warp Ring Tunnel (endless concentric pulsing rings,
   camera flying through, white-hot core cooling to the rim), Woven Sphere
   (calm counterpart to the urchin — fine woven/moiré texture, breathing
   scale, thin rim-glow), Wet Chrome Cavern (organic liquid-metal cave,
   fresnel-lit bulbous walls rippling, blue→purple→pink→gold on structure
   changes), Bioluminescent Throat (the cavern constricting rhythmically
   like swallowing, color pooling at the pinch on the downbeat),
   Chrysanthemum Firework Field (many fiber-bursts at different depths,
   each on its own schedule), Solar Flare Rings (the warp tunnel with
   visible plasma/fire texture instead of clean geometry), Iridescent
   Membrane (one soft-focus undulating translucent sheet, oil-slick
   rainbow interference — the soft-gradient ask, purest form), Radial
   Bloom Zoom (warp tunnel fused with Kaleidoscope Fold from batch 2),
   Fiber Combing (the urchin's fiber material combed sideways by a
   reversing wind instead of bursting radially). James's scope call: "why
   not, blow this thing up" — not started that night. James's TIMELINE
   REFINEMENT, resolving the open bias-vs-hard-trigger question from batch
   2: his worked example (quick-switch, quick-switch, pause, fade, major
   break, six breaks every other beat) is a RHYTHM TEMPLATE, not a script
   of specific effects — "you could replace those events with any events,
   and they would look cool to the music... it's always gonna feel like
   it's going along with the music, and that's of paramount importance."
   Working design: the hand-tapped structure lane records a sequence of
   event-SLOT types with beat-locked timing (the skeleton is authored and
   fixed, so it always fits), but each slot's actual visual content is
   still dice-rolled fresh every playthrough (so it's always surprising).
   This is the emerging answer to the open question, not yet confirmed
   with James as final. NEXT LUMINA SESSION: both making new viz options
   AND the performance-tracking thread (beat lock, timeline marking, the
   rhythm-template structure) are explicitly both in scope — his words,
   "I wanna be able to dive into this both into..." Nothing in this entry
   is built.
   2026-08-03: FLAME EVOLUTION, APPROVED (his "yes," asked cross-thread in
   a Dead Letter Office session by accident, answer relayed back here —
   diagnosis and plan both stand). His complaint: the culled flame-farm
   genomes (v3 2026-07-25, 20 shapes in `flame-genomes.js`) are
   "underwhelming" live — particles crawl a fixed attractor but the shape
   itself never swirls or evolves, "a photo of particles" moving slowly
   along it, not what Electric Sheep-style flame fractals are known for.
   Root cause: each genome is fixed transform coefficients, so the
   attractor shape is constant even though particles traverse it. THE FIX,
   in order of drama, all still needed (nothing built yet): (1) continuous
   swirl — slowly rotate each transform inside the genome so the attractor
   visibly churns, kills the "static photo" feeling on its own; (2) music
   modulation — wire coefficient wobble into the mod matrix (bass twists
   one transform, phrase boundaries reseed another) so the churn is in the
   groove like everything else in Lumina; (3) genome morphing — crossfade
   between the 20 culled genomes as continuous interpolation, one shape
   liquidly becoming another instead of cutting, natural dice/melt-roll
   material. OPEN: performance — the flame scene currently assumes a
   static attractor; per-frame coefficient changes mean continuously
   re-converging the shape, needs its own look-dev harness pass before it
   flies (same discipline as the nebula/crust labs). This is its own
   Lumina session, slots naturally alongside the visualization backlog
   above.
   2026-08-03 (night, "to infinity and beyond"): **WAVE 1 BUILT** on James's
   go after the reference-still study (his 27 stills incl. Synesthesia
   captures — quality AND interface target; his i-icon brief). Delivered:
   the ⓘ info library (tuner-info.js — surface descs retired into verbose
   popovers with 44 animated mini-demos; every new control must register),
   per-scene controls + ≤3 punch verbs per scene (scenes.js DEFS, sim-
   enforced; ink surge / ridge quake / flame flare / nebula burst), and the
   fxKaleido v2 FOLD (fxKalRing/fxKalIter/fxKalSpin; judged in
   tmp/lumina/fold-lab.html — KEEP — and proven end-to-end in
   kal-probe.html; legacy fold untouched at zeros). Dice: scene odds flat
   ("nuts random"), blur stays 5%. Sims 335+53+24 green, fx-test FX-OK.
   **THE AUDIO/BEAT THREAD IS PARKED, his explicit call** — no detection or
   tempo-matching work until he reopens it; rhythm-template stays agreed
   direction. AWAITING HIS EYES on all of Wave 1; the wave queue (fiber-
   sphere lab next, then ink v2, rainbow palettes, flame swirl; wave 3
   backlog) is the START HERE section of the world CLAUDE.md. Same night,
   his ask: JUNGLE MOOG RITUAL v3 "THE REEL" (v2's call-and-response
   killed on sight — his brief: "the demo reel for the investors...
   never come back to the same thing twice... very extreme changes."
   STANDING LESSON: A/B trading is dead as a default set shape). 71
   cuts, every look exactly once, adjacent cuts maximally opposed, all
   33 punches + quiet pockets honored, the fold everywhere; sims green.
   Awaiting his flight of it. Session-end proposal AWAITING HIS GO: the
   LEARNING BENCH (solo-one-effect chip strip from a clean 2002 grid +
   silent 120BPM practice clock) — spec at the top of the world CLAUDE.md
   START HERE.
   The rest of the Lumina item is #5.5 below.
5.5. SPASTIC SPACE REVIVALS: recreate `pork.html` and `scary_corndog.html` as two new worlds,
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
   UPDATE 2026-07-19 (build session): the pork half is BUILT — named **Relaaax**
   then, **LUMINA** since 2026-07-26 (see the rename note at the end of this item)
   (`src/worlds/lumina/`) — tunable field renderer staged in a resizable
   frame, draft status, no drift/registry yet. Remaining: James tunes by eye; decide the
   setting (his idea: the field playing on a TV in a scene, people watching and drooling);
   then ship wiring. scary_corndog not started — read that world's CLAUDE.md first.
   UPDATE 2026-07-24: tuner massively expanded per James (grid, margins, corners, tile
   size/overlap, blur, 24 patterns, presets system, frame snaps — see world changelog).
   James delighted ("way beyond what I expected"). UPDATE 2026-07-24 late: music
   reactivity phase 1 BUILT (his go) — 3 Suno tracks in assets/sound-tracks/, player +
   shuffle, band/beat analysis, 6-row mod matrix with its own presets + per-track
   recall, sim passes (tmp/lumina/music-sim.mjs). SAME SESSION, James's "go nuts":
   VISUAL DJ CLAUDE built — offline track analysis (tmp/lumina/track-analyze.mjs)
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
   from his tmp/lumina/viz-examples folder), 9 scene* keys as sliders/matrix
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
   RENAMED 2026-07-26: **Relaaax → LUMINA**, James's call — the old name described
   the 2002 black-and-white GIF piece, not the full visualizer this became ("it's now
   not really appropriate or descriptive of what's going on here"). Lumina is Thomas
   Wilfred's term for light as an art form in its own right. Folder, slug, globals
   (`LuminaField`/`LuminaFX`/`LUMINA_*`), CSS prefix (`lum-`), localStorage keys,
   BroadcastChannel and `tmp/lumina/` all moved; `migrate-storage.js` carries James's
   saved tuner state and presets over from the old keys on first load (delete it once
   he confirms). Changelog entries before that date keep the old name on purpose.
   PANEL PASS 1 2026-07-27 (James's brief): Roboto (bundled — the panel had never
   declared a font and was rendering in Times New Roman), slider tracks capped
   (widest 1470px → 267px, measured; rows are grid columns now), a text-size
   control (whole panel sized in em off one base, persisted per window), and the
   ↩/🎲/keep roll cluster (back undoes whole-look jumps only; keep banks the
   current look under a pre-filled name). Sims green; back/keep not yet
   click-tested by anyone. THE REAL WORK IS STILL AHEAD and needs its own
   session — he calls the panel "a big jumble of lots of different stuff" and
   wants it regrouped with short clear explanations, built to invite live play
   while music runs, usable like a VJ rig, with the dice becoming "a whole
   control function." Design conversation BEFORE code; brief is in the world's
   CLAUDE.md NEXT UP item 4.
6. SURROUND: **SHIPPED 2026-07-28** — `src/worlds/surround/` (its CLAUDE.md holds
   all rules + hard-won lessons; full build history in its changelog and World
   Ideas #59). James's ship brief executed: two field breaches (never behind the
   HUD — `behindHud` veto + side-0 ban), the subtle rose-amber stray star, stuck
   pixel kept; six diegetic exits total, all frame-aware (ship review found three
   invisible at fixed positions — the walks in render3d.js are load-bearing).
   world.json live, registry (drafts pruned per gotcha), admin panel Completed
   list, check-worlds clean, sim 7228. James flew the ship build same day and
   cut the void service hatch (hazard striping under the glass — "distracting");
   five exits remain, tags ?v=10. Still awaiting his verdict on the second
   breach + stray star levels.
7. COMBAT: player-vs-computer recreation of Atari's Combat (1977) level one — one
   tank, one CPU, six symmetric mazes — BUILT 2026-07-25 as a draft on James's ask,
   same night as Surround (its sibling world: shared styling + architecture) —
   `src/worlds/combat/` (read its CLAUDE.md first; it has the padded-LOS and
   dodge-without-muting-guns AI lessons). Pure sim-tested core
   (`node tmp/combat/sim.mjs`, 556k assertions), 3 AI tiers, 2:16 timed matches,
   bounce-shots toggle, tuner with click-away. AWAITING JAMES'S FIRST DRIVE.
   Next: feel pass, then ship wiring. Unbuilt ideas: biplanes/jets, more of the
   27-mode matrix, touch controls (World Ideas #60).
8. UNITY CHARACTER PIPELINE (pilot BUILT 2026-07-31, James's go after the "sell me
   on Unity" conversation — his brief: real character machinery, "what we have is
   sort of a clunky puppet"): Unity 6.5 free Personal + project repo
   `C:\Users\brook\ai-projects\_unity\es-characters` (own git; READ ITS CLAUDE.md
   FIRST — MCP bridge usage, build/deploy loop, no-pointer-lock rule, prefab
   gotchas). Unity MCP relay registered with Claude Code as `unity` (user scope);
   editor must be open. Pilot live at `tmp/unity-pilot/` on 4174: graybox +
   Starter Assets third-person robot (James: feels like any polished game) + the
   GARDENER DROID (Cadence caste 6 rebuilt as 13-part FBX, es-characters
   tools/gardener_droid.py) with NavMesh wander / hover / pendulum tendrils /
   head tracking — his verdict: natural, "good physics". NOT a world, not in the
   drift. NEXT, each with its own go: (1) droid PBR pass (palette-aligned
   metallic/emission maps), (2) POSTMASTER as Humanoid + retargeted animation
   library (the big unlock — body IS rigged via Mixamo 2026-08-01, 12 clips
   banked in elastic-space tmp/dead-letter-office/meshy-v2/, blocked on the
   Faceit head rebuild, see item 0.5), (3) ship-route decision for a Unity
   world (exits, sound bridge, size budget). Memory: `unity-character-pipeline`.
9. SERVER FIX — registry draft-leak in the admin archive/status actions (James asked
   for this reminder, 2026-07-31 global wrap): `regenerateWorldRegistry()` (and
   `npm run registry`) includes draft worlds, so every kebab archive/status click
   puts drafts (currently arachno-wars-2500, lumina, the-valence-lab) into the LIVE
   drift pool until someone restores `src/core/world-registry.js`. Seen for real when
   James archived Combat. Fix: make the generator exclude unshipped worlds, then
   retire the manual-restore gotcha here and in docs/building-a-world.md. A task
   chip was left in the 07-31 wrap session; either route works.
10. ASSETS CATALOG (James, 2026-07-31): new top-level "Assets" tab on the elastic-space
    admin panel — a browsable archive of reusable 3D parts (the plant, postmaster pieces,
    gardener droid, Meshy props, etc.). Grid of cards: thumbnail, short description, and
    which worlds/projects currently use it. Grouped by project first; other sorts can come
    later. 3D assets only to start — music is mostly not reusable, leave it out. Not built;
    design pass + James's go first.
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
- Fourth tab **archived** (added 2026-07-31): lists `archive/` folders via `GET /api/archive`
  with direct links (labels derived from slugs), served copy only. Refreshes on tab click and
  after a kebab archive action. This is the only place archived worlds are listed — the
  all-projects ops dashboard deliberately has no archive section (removed same day).
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
- Worlds-list page-notes: unshipped worlds carry `<span class="page-note unwired">unwired</span>`
  ("not in the drift registry, no exits" — renamed from "(draft)" 2026-07-28; right-aligned
  next to the kebab, #ffe9d6, no pill). The note is manual: it survives status moves and is
  NEVER auto-stripped — James removes it himself when he's verified the wiring.
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
- New or edited drafts in `world-drafts.json` are always safe to commit and push at wrap
  time — they are James's own admin-panel data, never a straggler to flag (his standing
  order, 2026-07-28).
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