# Elastic Space — Changelog

Newest entries first. One entry per meaningful session or release — add at session
wrap-up (`/wrapitup`). Created 2026-07-11 for the ops dashboard; entries below seeded
from git history.
Last push to origin as of 2026-07-11: **2026-07-11**.

Per-world changelogs in `src/worlds/<slug>/changelog.md` remain the canonical detail;
this file tracks project-level activity.

## 2026-09-05 — Codex — Fireplace flame count

- Added a live Flame count slider to the silent study: 0–81, default 27,
  with saved settings and no geometry rebuild. Agent: Codex.

## 2026-09-05 — Codex — Fireplace fire study

- Built the authorized silent logs/fire/bricks study at `tmp/fireplace/fire-lab.html`,
  with headless Blender geometry, procedural flames, configuration controls and
  exact 100–120% camera zoom. Visual review pending; no room or world integration.
  Details: `tmp/fireplace/changelog.md`. Agent: Codex.

## 2026-09-05

- Chrome Rift: THE DICE — Lumina's pair (sharp snap + two-second melt under a fog veil) at the
  head of the preset strip and in the bottom-right corner; every control + the gradient rolls.
  Silent lab `tmp/chrome-rift/dice-check.html`. (James: "actually pretty dope.")
- Colors, Meeting: the same pair in the conservator's panel's top-right corner and, thin and
  frosted, on the wall label before the title; pigments mixed in OKLCH, melt fogs the seams.

## 2026-09-04 (Orb Dimension: THE BALL v63 → Phase 2 volumes v64, the day by James's eye)

- Orb Dimension v63 THE BALL: every eligible orb a per-pixel sphere impostor (real depth
  test, key light from its nearest sun, worldlets as true globes, beings in world axes);
  "real spheres" + "ball edge" dials; new sphere-sim; Sphere Lab promoted to src/labs.
- v63.1–v63.9 by his flights: highlight/rim passes, crowd clouds RETIRED and the
  FORMATIONS built in their place, field homes re-centred on their bulk (bbox bug),
  worldlet facing fix, configuration panel opens right + grab handle + save feedback,
  cache tags on world.js/css.
- v64 Phase 2: all 23 procedural interiors are volumes (chord march, a recipe per kind);
  v64.1–v64.4 on his sheet reads (water, patterned shells, the baked highlight erased,
  galaxy on the ecliptic). Next: his read of the interiors sheet.

## 2026-09-03/04 (Snap!: steps 2–3 built and read, prose register, the world folder)

- Snap! step 2 (the table mini app) built and reworked through James's reads: one-line fit tiles in Atkinson Hyperlegible, chevron-bar click toggle (drag gone), a fully collapsed state, WCAG-AA contrast pass, seven zoom stops, locked tiles, click-to-land.
- Step 3: Molecules panel with all 24 lit (pictures, cards, spaced landing) and the Shells panel (a five-section reader: ladder, Li→Ne ramp, honest orbital clouds, the electron three ways, the table's shape).
- THE PROSE REGISTER (his brief after "too precious and too jargony"): direct tenth-grade science prose, the rule first, count out loud — every card rewritten; recorded in reimagine.md §15 + memory.
- Engine: propane's endless rotation fixed (angle-spring torque cancelled per molecule + spin damping); label flicker fixed; dot matrix re-based.
- Snap! became a DRAFT WORLD: `src/worlds/snap/` (dashboard + shared sound control wired), admin row in In progress worlds. The Valence Lab stays (his Scope-on-the-bench idea, recorded, unscoped).
- Retired the "dev server is down" session-start reminder (his ask): memory deleted, CLAUDE.md line rewritten.

## 2026-09-03/04 (Orb Dimension: the glow homes — generator v2/v3, in-world as the field homes)

- Glow-home generator v2 (lattice + `order` dial, three size tiers) and v3 (James's material +
  shape pass, crystals at any angle, the Doctor's-lab instruments, filaments, blues) —
  `tmp/orb-dimension/glowhome_fields3.py`, judged on three-seed sheets; "structurally, I love them."
- v62: six rolls baked (`export_fields.py`, GHM2, ~45k tris each) into every Saelyri shell with a
  random orientation, glass-program classes, "home roll" dial; v62.1–62.6 five rounds by his eye:
  doubled + bulk-normalized size, heart-ball opacity dial, the home glow pass (quarter-res blur +
  haze, `homeBlur`), steadier breath, ribbon melt; two brightness overshoots reverted exactly.
  Wrap verdict: "they look great right now."
- RECORDED, not built (root todo 0 (f)): every sphere in the world becomes a real 3-D shape —
  every orb is a camera-facing disc today; two-phase plan (impostors, then volumetric interiors).
- Nine Orb sims + shader-check green throughout.

## 2026-09-04 (Lunar Lander: the 1979 vector cabinet, built as a draft)

- **Round one, then the direction reset, then round two — all the same day.** James flew the draft ("fun. lots to come. you didn't modernize it!?"), picked depth / ship / feedback / vector HUD; then flew that and reset the direction: no CRT imitation, "make it look super cool for 2026" inside green-to-white single-line drawing, three ground lines only, the ship a drawing not a blob, no velocity arrow, hold-to-burn throttle that never cuts out, contemporary DOM/SVG instruments, a zoom gate that never pumps. Round two built and flown: "this looks cool and makes me feel nostalgic." Round three planned (ship flatter, circle + triangle direction, fuel pads, earned landing tech with a dozen ideas awaiting his six-pick, a flatter NASA-plausible moonscape) — START HERE at the top of `src/worlds/lunar-lander/CLAUDE.md`. Sim 66,900 green.
- **Lunar Lander built** on James's go after a ten-item plan ("the same treatment as Surround"): pure sim-tested core (66,899 assertions, an autopilot lands all four selections), vector-monitor renderer (persistence, bloom, phosphor tint, scanlines, barrel, eased approach zoom, the LEM breaking along its strokes, the spitting peak, the drive-through secret), positional thrust lever, cabinet readouts and messages, synthesis sound, PLAY + LOOK tuner with file-backed presets, look-dev + smoke harnesses. Draft: admin row under In progress (unwired), no exits. Awaiting his first flight, then the feature round. Detail: `src/worlds/lunar-lander/changelog.md`.

## 2026-09-02/03 (The Valence Lab → Snap!: the curriculum brief, the Claude Design experiment, step 1 built)

- **Snap! is the plan.** James's briefs recorded whole in `src/worlds/the-valence-lab/reimagine.md` §10–12 (curriculum, guided mode with the happy arrow and table badges, the UI: toolbar, 24-molecule panel, pull-up table, hover cards, wheel zoom), the twelve-chapter outline (§11), and the eleven-step plan (§13) with his eyes gating every step.
- **The Claude Design experiment (step 8, run first at his call).** Prompt §14 — open runway, Smithsonian + NPR exhibit, flat 2D bench, dark primary; his correction: draft one dictated the Claude house look he was steering away from. Pass two accepted: sharp corners, warm gray, the dot matrix (stays, subtle), the navbar layout ("crucial"), Instrument Serif / Instrument Sans / JetBrains Mono, the table and panels. Package in `tmp/snap/design/` with a complete token + geometry spec.
- **Step 1 built: the bench, bare** (`tmp/snap/`, gitignored, local only): the 2a screen live on the mock's engine reskinned to the tokens, all 118 named tiles, drag-to-land, wheel zoom, hold for X-ray. Dark only (light theme dropped, his executive decision). Next: step 2, the table mini app, on his go; the hold-view electron cloud parked as step 10.5.

## 2026-09-01/02 (The Fifteen Sisters: the "church bell" was the Tibetan bowl — gone for good)

- **The Fifteen Sisters — the sour bell found and removed.** James, third complaint since July: a church bell "rings occasionally... a tiny bit off from one of the notes in the actual sisters... sour." The distant-bell mp3 had been silent since 07-20 and deleted since 07-28, so FFT forensics on the three remaining files (`tmp/the-fifteen-sisters/bell-hunt.mjs`) convicted the ElevenLabs Tibetan bowl: 538 Hz, C5 + 48 cents, a quarter-tone sharp of sister #11, second partial 25 cents sharp of sister #7, struck every 2.7 s by the longest sister in the default Blend voice and blooming 0.62 s late. Removed outright: the mp3, the audio element, the Voices cabinet group, `playBowl()`, the voices state and the strike branch — every sister is a glass sine now, in every tuning and register.
- Proof by offline A/B render (`chime-render.mjs`, the chime graph sample-exact with and without the bowl): new build 342/342 pentatonic and 622/622 chromatic sustained tones on the sisters' grid, zero off; old build 90 and 135 off-grid, every one the bowl. World rule added: no sampled bells or bowls, ever. James after a fresh load (he had been refreshing the GitHub-hosted copy): "so pleasant to listen to now... it's been driving me crazy for literally months."

## 2026-09-01/02 (Orb Dimension v61: the Saelyri crowds; the glow-home plane-stack session)

- **Orb Dimension v61 — THE CROWDS** (James's go after the eight-question design, all recs taken): 1,000 beings at the capital / 600 per town rolled as GROUPS doing six verbs (congregation, stream, pair, gathering, home traffic, play), sized to headcount at 15–40 m spacing, tidal assemble/disperse, kind-66 crowd clouds as the far read, ripple greeting, "the crowds" dial group; every pose closed-form and sim-proved (society-sim TESTS 12–15, 33k capital poses vs Korrudan). `crowds.md` rubric; `tmp/orb-dimension/crowd-lab.html` harness (two self-critique rounds). James flew it: "it looks dope!"
- Tuner renamed **configuration** everywhere but old changelog entries ("GOD MODE" retired, James's call).
- **Glow homes — live Blender plane-stack session** (~20 renders, his word each step): landed a seeded generator of ~95 zero-thickness force-field polygons with real boundary ribbons, rendered on black — "actually pretty cool... good progress," held at `tmp/orb-dimension/glowhome-fields-v1.blend` + `glowhome_fields.py`. His corrections now standing: the balls are SHELLS not suns (dark inside), fields have no thickness, fine detail kills km scale.

## 2026-09-01/02 (The Valence Lab: the rethink, Snap, the grown mock; Powers of Ten draft)

- James on v4: "frumpy, boring, hard to understand." His brief: step way back, roll the
  dice ten times, reimagine from zero for high-schoolers, show a spec and a Claude Design
  prompt. Delivered as `src/worlds/the-valence-lab/reimagine.md` + a published page with a
  live feel sketch: ten rolls, the pick (Snap: unpaired electrons as reaching tendrils,
  a snap with lens + chord, the ionic handoff, the refusal, hold-for-X-ray where the real
  HF cloud lives), keep/scrap ledger, five gates, the prompt. His read: "you chose the best."
- The grown version on his riff question (loaded screen, seven zones, scaling to 118 via a
  third bond type + flexible metals + decay, chains via blocks + pour) and a MOCK of it on
  the sketch's engine: full-table shelf, chaptered rail, made column, octane + benzene +
  salt crystal + water drop pre-loaded, heat dial (weakest bonds go first). Then, on his
  first look, the mock alone on its own page (`tmp/.../snap.html`, unpublished tonight).
- Handoff agreed: mock here for feel, Claude Design for the look, code the look onto the
  engine. Nothing in the world folder changed; sims untouched.
- Powers of Ten spun off as its own world draft (every zoom ends somewhere silly);
  World Ideas #62; `world-drafts.json` via the drafts API.

## 2026-09-01 (Lumina: the direction reset, the test track, the panel orders)

- James's verdict on Lumina as an instrument: live play is "Dance Dance Revolution",
  recording "is not fun", the music sensing "flails". Agreed direction, nothing built:
  a curated Synesthesia-style instrument — harvest looks by dice, per-look macros (his eye
  picks; Claude only finds dead knobs), onset audio, a play-mode surface.
- His Suno test bed `Viz Test Track 01.mp3` (skeletal 130 BPM) analyzed (130 exact, lock
  4.1×) and composed as the 36-cut "beat-lock showcase" set with an A/B block (live
  detector vs band-only vs grid). His flight verdict: "terrible... not on the beat. Not
  even slightly." Diagnosis parked at his request — he wants a plain-words manual first.
- Panel orders, all built: Lumina NEVER autoplays (shared sound control gained
  `autoplay: false`); the transport contract (◀◀ = top, then previous track; ▶▶ = next;
  all load stopped; full ◀◀ ▶ ❚❚ ■ ▶▶ deck at the top of the panel); the audio tab
  deleted — one board, scrubber in the sticky head; configuration opens as a browser
  tab, not a popup; the player card folds when the panel opens.
- `src/worlds/lumina/manual.md` started — mod matrix section, Hemingway register, every
  claim checked against the code. Next sections one at a time on his say-so.
- Sims: composition 359, music 58, timeline 24 — green.

## 2026-08-17 (Arachno Wars moves out, and gets named)

- Both Arachno Wars worlds removed from Elastic Space at James's call — one level up, not
  archived: `arachno-wars-2000` (the playable artillery duel) → `C:\Users\brook\ai-projects\
  arachno-wars\one` ("Arachno Wars One"); `arachno-wars-2500` draft (spider-vision side-scroller)
  → `...\arachno-wars\infinite` ("Arachno Wars Infinite"); the existing `arachno-wars\two` repo
  is retitled "Arachno Wars Two". One's drift/registry/dashboard scripts stripped (in-game exits
  now reload the match), sound-control copied locally; Infinite's movement sim moved with it
  (27/27). Registry hand-edited (generator draft-leak), admin rows removed, todo items 3+4
  retired, World Ideas #52 updated. tmp/ working files moved along. Pre-move history stays
  here. All three live in one family folder C:\Users\brook\ai-projects\arachno-wars\ (James: "one folder").

## 2026-08-17 (Dropzilla moves out)

- DROPZILLA removed from Elastic Space at James's call ("not a good fit… I don't wanna see
  it in here anymore"; not archived, still active). Now its own project at
  `C:\Users\brook\ai-projects\dropzilla` (own repo) heading for an Android mobile UI. World
  folder deleted, admin-panel row and registry entry removed, CLAUDE.md todo + World Ideas
  updated. Pre-move history remains in this repo's log.

## 2026-08-01 (Lumina: panel becomes a board, the performance timeline)

- Panel passes 6–7: user-owned row layout engine (1–5 cards/row, drag + row
  heights, gear show/hide, cards cross tabs), sticky command bar with transport,
  dock UI removed, base type dialed to 21px by James's eye, ember labels
- World chrome: fit-screen frame default, player-bar volume + collapse, shared
  speaker hidden in-world; dice tamed (blur 5%, iris 8%, melt 2s)
- Two new Suno tracks measured + composed (Spore Circuit, Zion Rips); Zion
  re-cut as a 29-look one-way journey on James's "never return" brief
- THE PERFORMANCE TIMELINE: record-your-own-set in segments, no quantize
  (James's law), per-key punch-in merge, loop takes, ghost replay, "your set"
  mode; new timeline.js + timeline-sim (24), all suites green (24/300/53)

## 2026-08-01 (Admin panel: archived tab)

- Fourth admin tab "archived": lists `archive/` folders via GET /api/archive with direct links (slug-derived labels, `archive/<slug>` path notes); refreshes on tab click and after a kebab archive; archive-dialog copy points at the tab
- This tab is now the only place archived worlds are listed — the all-projects ops dashboard's Archive section was removed the same night at James's call

## 2026-08-01 (Orb Dimension: Saelyri home, crust grows up, trade designed)

- Being Editor perf pass (pixel cap, one-SDF-per-step, 3-shape default) + full-bleed + narrow-pane fov fit; james-being-01 saved and made default
- Orb Dimension v56 PHASE B1: 140 Saelyri in-world (kind-65 raymarch, mote↔body LOD, closed-form orbits/travelers/morphs, acknowledgment + glyphs + family chords), Cadence castes 3×, new dials
- The resonance trade designed + specced as Phase C's spine (tritium out, matched pearls back, pearls power comms + jump gates); threats/defense + wider-world threads recorded
- v57 crust detail pass (physical window pitch, 3 patterns, screens/neon/dishes/pylons/rooftop kits/tank bands) via new crust-lab; v57.1 origin bug James caught, fixed + lab hardened
- v57.2 experiments: pinned reticle, roll °/s dial
- Mid-session anomaly: an unidentified background worker executed 4 open task-tracker items (verified good, owned as v56); forensics in session, memory written

## 2026-08-01 (Postmaster do-over night: new family, Faceit pivot)

- `docs/character-pipeline.md` created — canonical make-a-character recipe
  (ChatGPT prompt pack, Meshy settings, per-step lessons).
- Face Lab picker purged to James's numbered picks (take two; take one kept the
  wrong head and was fully rolled back — three commits, net honest).
- Whole new postmaster family in one night: turnaround, bald head, wig-v5 hair,
  beard, hat, glasses → six Meshy pieces first-try (180cr) → KeenTools head
  ("postmaster v3" in the lab) → James rigged the body at Mixamo, 12 clips.
- Three Blender assembly rounds (scripts preserved in
  tmp/dead-letter-office/meshy-v2/scripts/): feature-band mounting, UV
  re-transfer, despeckle, arms-down render rig.
- PIVOT at wrap: KT head retired (realistic template vs gnome props); Faceit +
  Auto-Rig Pro installed; next session tests Faceit 52 keys on the gnome head.

## 2026-07-31 (Dead Letter Office: the KDLO broadcast + the letter deck)

- The office radio is now a sequential 1951 broadcast (r13): James's fourth Suno
  track baked in, Claude's DJ copy + 8 period ad spots all voiced via ElevenLabs
  (Bill Social Media, eleven_v3) and baked through the AM chain. Break format per
  James: song → sign-off → two ads → intro; dj8 loops the set. `tools/eleven.mjs`
  grew `--stability` and an `stt` scribe command (used to preserve his copy tweaks
  when the combined DJ reads were re-cut into eight pieces).
- The letter deck grew 12 → 68, all Claude-written in the house voice on James's
  asks: 25 "later acquisitions," 21 "shelf-box strata" (Santa/chains/divorce/
  evictions/resignations/confessions), then a length-variety pass (micro letters
  to four sagas incl. the fence feud and the cardamom bread recipe). James
  approved all 68; the whole deck is protected text now. He named the mode:
  DLO is "a Claude flavored world" — he art-directs, the content voice is Claude's.

## 2026-07-31 (Unity character pipeline: pilot night)

- Unity 6.5 adopted on James's go after the "sell me on Unity" conversation —
  new sibling repo `_unity/es-characters` (own git; see its CLAUDE.md).
  Unity MCP relay registered with Claude Code; Unity_RunCommand drives the
  editor like the Blender bridge.
- Pilot proven end-to-end the same night: WebGL build served at
  `tmp/unity-pilot/` (13MB engine base, ~25MB with content), Starter Assets
  third-person robot in a graybox (James: "controls feel like any polished
  game"), pointer lock ripped out for web-friendly drag-look.
- The Gardener droid: Cadence caste 6 rebuilt as a 13-part FBX (visor head,
  antennae, claw arm, six tendrils) with a CadenceDrone brain — NavMesh
  wander, hover bob, banking, pendulum tendrils, head tracking. James's
  verdict: motion reads natural, "good physics".
- Next (each with a go): droid PBR pass, postmaster as Humanoid with
  retargeted animations, ship-route decision. Todo item 8.

## 2026-07-28 (Orb Dimension v54.2–v55.4: flight-feel night)

- James flew all night, driving by feel: stickGrab dial + dotted ghost grab
  ring; presets travel to static hosts (fallback + first-load apply);
  CAPTURE SPAWN tuner row (spawnPose rides presets, H honors it); aerial +
  detail-melt distance dials; wheel MAGNIFIER (1×–8×, Z reset).
- THE POD CONTRACT (v55.3): ship-frame rotations only, reticle tilt =
  commanded roll — the v55.2 horizon-locked-yaw experiment reverted same
  night on his emphatic call ("this is space").
- LENS SHIFT (v55.4): the optical axis exits through the reticle X — rolls,
  turns and zoom pivot on the cross; clicks/marker/nav ring taught the shift.
- Suite grew stick-sim TEST 7 (pod contract); all nine sims + shader-check
  green. Detail in the world changelog.

## 2026-07-28 (admin panel: "unwired" page-notes)

- Worlds-list "(draft)" note renamed to **unwired** on James's call — it marks
  "not in the drift registry, no exits", not draft-ness (the whole In-progress
  section is drafts). Applied to Combat, Lumina, AW-2500 (replacing
  "(graybox)"); Surround's was removed by James when he completed it.
- Styling per his spec: right-aligned flush to the kebab, warm-white #ffe9d6,
  no pill (`.page-note.unwired` in styles/admin.css).
- The note is manual and travels with row moves by design — never auto-strip
  (memory `draft-note-is-manual`). Mandala Shop's "curate" pill relabeled
  "arrange" (same ?curate=1 link).

## 2026-07-28 (Surround shipped)

- Surround SHIPPED: second field breach (never behind the HUD — `behindHud`
  projection veto + side-0 ban), the stray rose-amber star exit, stuck pixel
  kept; core multi-breach rules sim-tested (7228 green).
- Ship wiring: world.json (live), registry regenerated with drafts pruned,
  admin panel Completed move, check-worlds clean.
- Same-day flight note from James: void service hatch cut (hazard striping
  read as distracting) — five exits remain. Tags ?v=10.

## 2026-07-28 (Orb Dimension v54: nebula scale + the Being Editor)

- Orb Dimension v54 on James's v53 flight notes: `nebScale` GOD MODE dial
  (0.5–2.0, default 1.6) — bank radii only, seats fixed; nebula-sim TEST 10
  re-proves spawn/corridor/satellite clearances at the dial ceiling.
- THE BEING EDITOR (`src/labs/being-editor/`, admin Labs section): Saelyri
  look-dev lab promoted from tmp, being dropdown for future peoples. Interior
  rebuilt as three layers (shell / filaments / skeleton); v54.1 exposure fix
  live with James (his call: edge fire good, middle pure white — filled-core
  term + >1.0 emission, both fixed). r3 sheets via /api/dev-snapshot.

## 2026-07-28 (Surround feel pass + specials; Lumina track dropdown)

- Surround, four James briefs across the day: feel pass 1 (extent-fit re-centred
  camera, turn-assist grace + `reviveAfterCrash`, 24 colour pairs per match,
  two-step RESTART), the start gate (attract mode, nothing runs until START),
  then his "do every single one": seven specials (boost/phase/gaps/overtime/
  zone/gauntlet-2v1/blackout — core generalized to N riders, sim 7220) and four
  diegetic drift exits. His produced crash samples wired by hit kind. Breach
  iterated three times on his eye: static ghostly tear, re-rolled per round,
  and riding through it now genuinely drifts out (core rule, corridor survives
  overtime). Still draft; awaiting his next flight.
- Lumina: player track readout is a dropdown; new `GET /api/worlds/:slug/tracks`
  lists assets/sound-tracks/, served pages auto-discover dropped-in audio
  (server restart needed to activate the route). Panel-redesign session still
  queued.

## 2026-07-27 (Lumina panel pass 1)

- Lumina's control panel: **Roboto** (bundled locally, 43 KB latin subset — the panel
  had never declared a font and had been rendering in Times New Roman), **capped slider
  tracks** (widest 1470px → 267px, measured A/B; control rows are grid columns now, not
  `flex: 1`), and a **text-size control** built to the standing pattern — whole panel
  sized in `em` off one `--ui-base` × `--ui-scale`, persisted per window.
- New **roll cluster** by the dice: ↩ back (undoes the last whole-look jump, 30 deep,
  never slider drags) and **keep** (banks the current look under a pre-filled name).
- The text-size rule is now in the world-building contract (`docs/building-a-world.md`
  §9.1) alongside click-away dismissal — James restated it as applying to *any* panel.
- Still to do, and the actual point: regrouping the panel for live VJ use. James's brief
  is recorded in the world's CLAUDE.md as NEXT UP item 4. Design conversation first.

## 2026-07-26 (Relaaax is now LUMINA)

- James renamed the world: *"it's now not really appropriate or descriptive of what's
  going on here."* Relaaax named the 2002 black-and-white GIF piece; the world is now a
  full music-reactive visualizer. **Lumina** is Thomas Wilfred's term for light as an
  art form in its own right.
- Full rename, not a label swap: folder, `lumina-field.js`, `tmp/lumina/`, every global
  (`LuminaField`, `LUMINA_TRACK_GRID`, …), the `lum-` CSS prefix, localStorage keys,
  BroadcastChannel, world.json (slug/title/summary), admin panel link, `server.mjs`
  flame-picks path, and doc references across `docs/building-a-world.md`,
  `assets/spastic-space/recreation-notes.md` and arachno-wars-2500's CLAUDE.md.
- New `migrate-storage.js` copies James's saved tuner state and presets from the old
  keys on first load, so the rename costs him nothing. Delete once confirmed.
- All green: sims 123 + 42, `fx-test.html` FX-OK (six shader programs), `clock-test.html`
  CLOCK-OK (20 assertions), and the detached controller mounts its 115 controls clean.
- Pre-rename changelog entries keep the old name deliberately.

## 2026-07-26 (Valence Lab v3.2: console text size, and what a molecule's shape really is)

- The scope console is now sized in `em` off a single base, so one "text size" control
  scales its type, width, pips and dots together. Default raised to 1.25 (base 12 → 15px)
  because James found the panel too small; slider 0.9–2.0 in the new "this console" group,
  persisted with the rest of the tuner. No physics touched; both sims green (129 + 404).
- James asked why bonded molecules render as "an amorphous blob" instead of orbitals
  snapping together. Answer: molecule mode draws the total electron density, which really
  is smooth — the structure lives in the individual molecular orbitals, which our solver
  computes and the bake discards.
- Follow-up settled by measuring our own water rather than quoting a textbook: the "rabbit
  ear" lone pairs are a legitimate rotation of the canonical pair (density matrix changes
  by 4.4e-16) but are not eigenstates, and the observable density has no ear structure at
  all — 8.4% radius variation in the very plane where they'd appear. Numbers recorded in
  the world's CLAUDE.md so they never need recomputing.
- Phase B.5, the orbital viewer, written up as a proposal awaiting James's go.

## 2026-07-26 (Face Lab: the postmaster gets a real face — KeenTools pipeline)

- James rejected the dressed MPFB candidates as "an imitation... made in Blender by
  someone who just learned Blender" and asked for the full repeatable pipeline
  instead of another shortcut: movable face, separated props, lip-sync, wardrobe.
- Night 1: the original Meshy postmaster dissected into separate pieces
  (`tmp/face-lab/dissect.py`). Verdict: useful as reference/rendering source, NOT as
  assets — the accessories are fused into the same polygon soup as the face.
- Night 2: de-dressed 2D face + 3D face scan generated (Meshy, ~39cr). Three
  chassis→scan registration attempts failed; James picked "road B" (the scan mesh IS
  the head) and 66 morphs were transferred onto it — then rejected the socket surgery
  as hacking ("raw meat + golf balls").
- **The pivot that worked:** James bought KeenTools Cloud; `tools/keentools.mjs` is the
  durable client. His face on professional topology with a real opening mouth, teeth,
  working eyelids and 55 ARKit blendshapes — first try once the input spec was right
  (front + 40° left + 40° right; profiles fail). Live in the Face Lab picker.
- `src/core/face-life.js` gained an ARKit mouth vocabulary so existing Rhubarb-baked
  voice clips drive the new head; lab framing rewritten to anchor on interpupillary
  distance so any model scale frames correctly.
- Procedural wire spectacles built and fitted by measurement; postal cap generated in
  Meshy (30cr) and mounted; beard remains unsolved.
- **The beard lab** (James's idea): `tmp/face-lab/beard-lab/` — a self-scoring sweep
  harness, 425 variants over three rounds across four techniques. Each round improved
  the judge, not the knobs. Conclusion: procedural facial hair was the wrong problem;
  next pass feeds KeenTools the *bearded* views instead.

## 2026-07-26 (Surround rebuilt in 3D)

- James, before ever playing the 2D draft: "one of the most boring looking things
  I've ever seen... spruce it up massively, 3D effects, a neat HUD, cool lighting."
- Surround's renderer replaced with a three.js arena (`src/worlds/surround/render3d.js`):
  light-walls that rise behind each rider and cool down the tail, under-glass
  reflections, glass floor + void grid with rider light pools and headlight cones,
  a containment field that brightens on approach, crash shockwaves and a wall
  power-down wave, custom bright-pass/bloom/ACES post chain, ambient dust.
- New `territory.js` — BFS ownership of every empty cell, driving a floor colour
  wash and a HUD meter. `game-core.js` untouched; sim still green (7139 assertions).
- New HUD (scores, pips, round, live speed, opponent, territory), two-tab tuner
  (PLAY + 14 live LOOK knobs) with file-backed presets.
- Pause (P/Esc, auto-pause on window blur, GO beat on resume) and a two-step
  forfeit, both on James's ask.
- Fixes worth remembering: `half` is a reserved GLSL word; `pow()` with a negative
  base returns NaN and the bloom blur smears it over the whole frame; a `<canvas>`
  is a replaced element so `inset: 0` leaves it at 300x150 in the corner; a
  zero-size window put NaN through the camera aspect and killed the render loop.
- Camera framing rewritten as a real corner-projection solve (was filling 56% of
  the frame), and the grid presets deepened to ~1.5:1 so a tilted view fills a
  16:9 window.
- Two harnesses kept in `tmp/surround/`: `lookdev.html` (silent AI-vs-AI look dev)
  and `smoke.html` (sound-stubbed twin of the real page, via `make-smoke.mjs`).
- Status: still a draft — awaiting a feel pass, then ship wiring.

## 2026-07-26 (Relaaax: the scene layer, bred flames, and getting on the beat)

- **Scene layer** — four GPU backdrops under the tile field (`scenes.js`): ink
  turbulence, ridged neon flow, a real fractal-flame chaos game, and a star
  tunnel. Nine new `scene*` knobs, all tuner sliders / mod targets / set params.
- **Flame farm** — an overnight evolutionary genome search (12,000 renders,
  7,307 keepers). James culled 20 through a new checkbox gallery that saves via
  `POST /api/flame-picks`; those genomes are live in the flame scene, which is
  now genome-driven rather than hardcoded.
- **The clock was wrong, and it was the root cause.** James heard that Angular
  Ritual is 115 BPM; the analyzer had it at 76 — exactly two-thirds, a
  metrical-level error, so every event in every set sat off the beat. Tempo
  detection rewritten: superflux onsets, comb filter proposes candidates,
  binomial-likelihood 8th-grid alignment disposes, plus a BPM override so his
  ear always wins. All three tracks now lock to ~16ms.
- **Beat lock** — a grid-derived clock replaces envelope-chasing for anything
  that should land on the beat: `pulse`/`bar`/`phrase`/`swing` mod sources, ten
  accent patterns, and `syncBeats` to lock a flash cycle to N beats.
- **Structure detection** — drops, break-returns, builds, and groove changes
  (the rhythm fingerprint changing even when the level doesn't).
- **Sets rebuilt as composition** — per-track look vocabularies, variation
  operators, and scores written in BARS, so re-measuring a track re-times the
  whole set. New looks are reserved for measured punches.
- **Laptop UX** — always-visible transport bar with a real stop, free play as
  the default (composed sets are opt-in), and a docked panel so one screen fits
  the visuals and the controls.
- **🎲 dice** — one click randomizes every visual parameter. James's favourite
  thing in the build.
- Sims: composition 123, music 42, plus new clock and genome test harnesses.
- Server: `/api/flame-picks`, `/api/dev-snapshot` (test pages hand back what
  they drew, since the agent browser pane can't screenshot), CORS preflight.

## 2026-07-25 (The Valence Lab phase B: real molecules on the bench)

- THE VALENCE LAB PHASE B built on James's go — the bonding bench, draft v3.1.
  Wrote an in-house Hartree-Fock solver for the world (tmp/the-valence-lab/hf/:
  McMurchie-Davidson integrals, Boys function, Jacobi eigensolver, RHF + UHF with
  DIIS, STO-3G): hits published anchors (H₂O −74.9629 Ha, CH₄ −39.7268) and
  catches the N₂ wrong-occupation saddle that would render the triple bond
  unbound (fixed with a dual GWH/core guess). Nine molecules baked to 24 KB.
- Runtime: swarm dots are Metropolis samples of the baked density; ghost shells
  are its isosurface carved by marching tets in the browser; valence engine with
  honest refusals, completion hints and the O₂ trap. 404-assertion molecule sim
  (+ atom-sim's 129) covering solver anchors, bake freshness, sampler moments vs
  analytic integrals, isosurface-on-density, and every recipe path.
- Same night on James's feedback: auto-orbit off by default (v1.1), layer A/B
  toggle + per-layer visibility sliders (v2.1), sliders moved above the fold
  (v2.2), then the SCOPE CONSOLE — ⚙ tuner retired, all controls into the right
  panel as specimen/controls/recipes tabs, "it's not a config, it's the scope
  controls" — plus the recipe book (v3), demoted to read-first with a small
  "run ▸" tag per card (v3.1).

## 2026-07-25 (Surround + Combat drafts, click-away rule site-wide)

- SURROUND built as a draft (James's ask after an effort chat on early console
  recreations): neon player-vs-CPU Atari 1977 recreation, pure sim-tested core,
  three AI tiers (ORACLE = Voronoi territory + separated-mode space-fill),
  synthesized sound, tuner. 7139 sim assertions.
- COMBAT built as a draft the same night: tank duel level one, one CPU opponent,
  six symmetric mazes — mazes 1-2 decoded from the actual Combat ROM disassembly's
  playfield bitmaps (kept at tmp/combat/combat-disassembly.asm); three AI tiers
  with BFS hunting, padded-LOS aiming, shell dodging; point resets to corners
  (James's call); bounce-shots toggle; 546k sim assertions.
- New house rule from James: EVERY control panel dismisses on pointerdown
  click-away. Retrofitted Chrome Rift, Valence Lab, Pelagic, DLO, Colors Meeting,
  Orb Dimension (all three HUD panels), Surround, Combat; rule written into
  docs/building-a-world.md §9.1 (Relaaax, Jerry's Pool, admin kebab already
  conformed).

## 2026-07-24 (Face Lab: auto-fit pipeline + base-face candidates)

- Auto-fit artwork→character pipeline built (tmp/face-lab/autofit.py +
  autofit_finish.py): measured alignment from the Meshy postmaster's own
  accessories (glasses = eye height + IPD scale, ears = depth), confident-skin
  masking, bounded ridge least-squares over all 140 identity dials, smoothed
  residual baked into basis+keys so expression morphs survive.
- src/labs/face-lab/assets/postmaster-fit.glb shipped + "postmaster (auto-fit)"
  model picker entry; pairs with the existing "postmaster-head" preset, every
  dial live for fine-tuning.
- Honest finding: accessory-heavy characters starve geometry (~81 clean skin
  points) — pipeline is hybrid: geometric fit + Claude render-compare rounds.
- James rejected the fitted head ("disturbing"); standing direction is
  Carl-from-Up friendly exaggeration, accessories carry likeness.
- MakeHuman community model gallery scraped to a local searchable page
  (tmp/mh-models/, 82 models) — nothing usable for the postmaster.
- Base-face candidate round 1 (4 dialed candidates, contact sheet sent):
  closer, not landed; eyelashes-read-as-mascara lesson captured.

## 2026-07-24 (Orb Dimension v50: the cooperative societies, phase A)

- The Saelyri (light-beings) + the Cadence (machines) — four communities: capital
  Tonic in the Korrudan core, satellites Mediant/Dominant/Subdominant on the
  anti-colony hexagram points at ~125 km (derived from colonyDist/2, not a dial).
- Fully procedural community anatomy: lopsided Cadence cores (iridescent/data
  glass, slabs, pulse webbing, tesseract frames), 7–9 Saelyri mini-sun nodes on
  jittered d12 seats, light bridges with two-way pulses (never through the middle).
- Node hearts ride the beacon system (constellations across the map); satellites
  got doorstep fuel (stations now 76/42); NAV + GOD MODE grew society sections.
- New `tmp/orb-dimension/society-sim.mjs` (10 tests) + reef-sim updated — all five
  sims pass; the four new shaders compile/link-verified. Stamp v50, James approved
  the first look. Phases B (peoples) / C (resources) / D (reef expansion) each
  await their own go.
- Also this session (v49.3→v49.4): tuner presets became file-backed —
  `assets/presets.json` via generic `GET/PUT /api/worlds/:slug/presets`
  (server.mjs), localStorage demoted to boot cache / file:// fallback; saving a
  named preset IS telling Claude. james-prefs-01 set as the start preset.

## 2026-07-24 (The Valence Lab: new world, phase A — the atom bench)

- New draft world `src/worlds/the-valence-lab/` (James's brief + name): the most
  realistic molecule visualizer — planned as four gated phases (atoms → bonding →
  narrated scale-journey chapters → showcase reactions).
- Phase A built: future lab bench + coherence-scope ring, six specimen vials
  (H C N O Ne Ar), measurement-swarm electrons where every dot is a true sample of
  |ψ|² (hydrogen-like orbitals, Slater Zeff, Hund occupancy), fog view, measure
  collapse, nucleus with honest magnification footnote, valence readout, 10-slider
  tuner.
- Physics verified: `node tmp/the-valence-lab/atom-sim.mjs` — 129 assertions
  (mean radii vs analytic, ⟨cos²α⟩ = 3/5, 2s radial node, isotropy) all pass;
  in-browser render checked (shaders compile, frame pixel-sampled).
- Integration: admin panel row (In progress), World Ideas #58, repo todo 0.7.
  Draft status — no drift/registry/sound until ship. Awaiting James's eyes.

## 2026-07-24 (Relaaax: music reactivity + Visual DJ Claude + the full expansion)

- Music reactivity: 3 Suno tracks (assets/sound-tracks/), Web Audio analyser ahead
  of the volume gain, band envelope followers + auto-gain + bass-flux beat detector
  (music-dsp.js, DOM-free), 6-row mod matrix, reactivity presets + per-track recall,
  shared sound control wiring.
- Visual DJ Claude: offline track analysis in Node (BPM/beat grid/sections/drops via
  tmp/relaaax/track-analyze.mjs), per-track authored light-show compositions with
  labelled events on measured moments (assets/compositions.js), DOM-free timeline
  engine with ramps + color crossfades (composition.js), claude's set / free play.
- The full expansion (James: "every single thing… go nuts"): 12 structure features
  (11 tile shapes, brick/hex/radial/spiral layouts, Mondrian merges, rotate/spin/
  displace/size-pulse, waveform morphs, 8 palettes + hue, counter layer, nests) +
  12-effect WebGL FX rack (fx.js: trails, feedback zoom, pixelate, RGB split, warp,
  slit-scan, kaleidoscope, bloom, grain, CRT, shutter, iris) + 20 new matrix targets.
- Control surface rebuilt (tuner.js): two tabs (visual | audio), detachable into its
  own window (tuner.html, BroadcastChannel) for big-screen + laptop-controller use.
  world.js became the state host; music.js the audio engine; DJ sets re-choreographed.
- Verified: 58 + 14 sim assertions pass, shaders compiled/linked in-browser,
  pork-2002 default regression-asserted. Next: James's first rave, tune by event
  label; five "hard direction" ideas parked in the world CLAUDE.md.

## 2026-07-24 (Relaaax: tuner mega-expansion — patterns, presets, chaos)

- Field renderer generalized from the fixed pork layout to an N×M grid (1–24 each)
  with a 24-pattern engine (sweeps, ripple, rings, pinwheel, checkerboard, spiral,
  scatter, sparkle, tempo rows/cols…), spread/twist tweak sliders; "pork 2002"
  still reproduces the 2002 composition verbatim (Node-sim verified).
- New controls: per-side margins with link modes, gaps, row inset, corner radii
  (tiles/rows/frame), long-range gaussian blur, fill-the-frame toggle, and tile
  size decoupled from grid pitch — tiles close gaps, butt up, overlap, into chaos.
- Preset system: permanent built-in list in `presets.js` (8 seeded, deliberately
  distinct) + James's saves in localStorage; frame snap buttons (full width /
  fit screen); click-away closes the tuner panel.
- James: "way beyond what I expected." Next session: music reactivity (5–6 imported
  tracks, track player, rhythm-driven field, many sliders) — spec in the world's
  CLAUDE.md.

## 2026-07-24 (Face Lab: expressive-character pipeline, postmaster head rebuild begins)

- New lab `src/labs/face-lab/` (admin panel gets a "Labs" section): three.js workbench
  with morph sliders, savable expression presets, A→B transition bench, dialog bench
  playing voice clips with baked lip sync. James: "exactly what I was hoping for."
- `src/core/face-life.js` — shared runtime: expression crossfade, auto-blink, saccades,
  Rhubarb viseme playback, idle head motion. Simulation-tested in Node.
- `tools/lipsync-bake.mjs` — Rhubarb Lip Sync wrapper (binary gitignored under
  tools/rhubarb/); handles mp3 via Blender's bundled ffmpeg. First DLO speech clip baked.
- MPFB2 asset packs installed (system assets, faceunits01, visemes02 — all CC0):
  bust generator with 52 ARKit + 15 viseme morphs; skin/eye-color variant pickers.
- Postmaster: Meshy anim arms-out diagnosed (tracks, not fixable offset) → James chose
  full rebuild; MPFB2 realism rejected on sight → pivot to identity dials: `sculpt.glb`
  carries 140 MakeHuman modeling targets as browser sliders; Claude dial-sculpted the
  gnome skull (3 render rounds, overdrive past 1.0) → preset "postmaster-head".
- Wrap-transfer R&D validated then superseded for the head (kept as texture-bake
  machinery): tmp/face-lab/wrap_transfer4.py — raycast delta transfer onto the Meshy
  mesh with rigid glasses/cap detection.
- Next: James tunes the gnome by eye; storybook texture bake; brows/beard/cap/glasses;
  Mixamo body re-animation; then DLO integration and his voice.

## 2026-07-24 (Arachno-Wars 2500: fork + graybox movement prototype)

- New world `src/worlds/arachno-wars-2500/` — the spider-vision side-scroller, forked from
  AW2000 (which stays intact as the artillery duel archive). James's go after direction
  discussion; verdict on first look: "successful test. A long way to go yet."
- Graybox b1: polygon terrain with cling-anywhere walking (walls/ceilings/undersides),
  web-pull, fuel rocket, whip-leg IK, dead-zone never-rotating camera, gauntlet level.
- Physics is a pure shared module; 27-assertion Node sim (tmp/arachno-wars-2500/) passes.
- Gotcha found: `npm run registry` includes draft worlds — registry reverted so drafts
  stay out of the drift pool until ship (rule added to CLAUDE.md).

## 2026-07-24 (Orb Dimension: THE BIG DIMENSION built — v49/.1/.2)

- Phase 1 of the expansion built with James's go, same night as the spec:
  1,000×1,000×250 km space (core keeps its 48×48×12 neighborhood), camera-relative
  renderer (rotation-only view matrix, float64 subtraction at upload — the 250km
  float32-jitter fix), flat speed ladder 240 / 1,200 (240s, 5s) / 3,600 (360s, 3s),
  reef colonies ringed at 250km (seeded triangle layout, beacons, doorstep fuel),
  camera-local recycled dust, GOD MODE tuner groups (drive + ring).
- v49.1: orb halos gated to long range (the cave-era "ghost ball" envelope now fades
  out within ~40 radii). v49.2: the REAL ghost-ball fix — veils (wall mottling) got
  scaled fog restored; v49 had fog-exempted them into a "McDonald's ball pit" (James).
  Confirmed by browser screenshot — James explicitly invited pane use for visual QA.
- Sims: reef-sim rebuilt for the new layout block + v49 bounds/counts/doorstep tests
  + ring determinism; NEW ladder-sim.mjs (flat-ladder source guards + spec math);
  all four sims pass. James on v49.2: "looks way better. amazing progress tonight."
- Spec status updated in expansion-spec.md; expansion remainder (stargates, gulf depot
  grid, grown reefs, hub society, luminous region) still spec-only, each needs its own
  discussion. Awaiting full flight-feel verdicts (distance, dust, beacons, the slam).

## 2026-07-23 (Orb Dimension: expansion spec recorded — planning only, no code)

- "The big dimension" phase spec settled with James and recorded in
  `src/worlds/orb-dimension/expansion-spec.md`: 1,000×1,000×250 km, flat non-additive
  speed ladder (impulse 240 free · booster 1,200 / 240s tank / 5s spool · overdrive
  3,600 / 360s tank / 3s spool → 1,296 km range), 5–6 stargates, guaranteed-find depot
  grid (~50 km default).
- GOD MODE tuner-controls running tally started in the spec (top speed + tank length
  are the key knobs); constraint recorded: size and key POI locations eventually
  finalize and become immutable — feel stays tunable, the map becomes law.
- Open riff, unsettled: circular/spherical space vs galaxy-disc population shape.
- Todo #0 updated (spec done, now at PLAN); world changelog entry appended. world.js
  untouched.

## 2026-07-22 (Dead Letter Office: the 3D room, r1–r8)

- DLO rebuilt as a walkable 3D basement hall (Mandala-Shop-style walk/look controls):
  Meshy-rigged postmaster walks a nav-graph shift (desk, basket pickups via bow, filing,
  furnace burns, punch clock, coffee/donuts, corkboard, cabinets, fire-poking, couch
  sits, door breaks), mail falls from a ceiling chute and genuinely piles up in the
  basket bottom-first, mounding past the rim and spilling to the floor. All 12 authored
  letters + airmail drift exits preserved; stairwell door is a fifth exit.
- James's punch-list rounds: fluorescent brightness pass, polished-concrete Meshy floor,
  extra windows, file-cabinet bank, tables, parcels; optimization pass (skinned-mesh
  raycast proxy, 288k→86k decimation, Lambert paper, frozen pile matrices); pmGlow
  always-visible self-light; height to 1.89m; couch/bookshelf/sad plants; James's five
  GPT posters hung. Meshy spend ~129cr total. Room tuner (v2 key) + strict fuzz sim.
- Parked in the world CLAUDE.md: behavior weekend (needs-based routines, furnace chute
  slot, telephone), ElevenLabs voice for his lines, letters-lore expansion (threads +
  the June desk correspondence — two open questions await James), the cat, Jerry visit.

## 2026-07-19 (Admin panel: worlds list overhaul)

- Worlds list split into "In progress worlds" and "Completed worlds" sections, both
  alphabetized ignoring a leading "The", Welcome pinned on top; "pages" eyebrow dropped.
- Kebab (⋮) menu on every world row replaces the inline archive button: "move to
  completed" / "move to in progress" (always the opposite of the row's section) plus
  archive underneath. New `POST /api/worlds/:slug/status` endpoint rewrites the static
  lists in index.html, alphabetical insert included (sim-verified).
- Color pass: one `--highlight` azure wash for all hovers/active states (links, tabs,
  kebab, draft cards) replacing the muddy amber-soft; section titles and "Server
  running" in the gold accent; masthead status/chrome cards equal height.

## 2026-07-19 (Arachno-Wars: feel + systems session)

- Arachno-Wars 2000, one long tuning session with James: clean practice range (no
  decorations), thinner HUD rings, smaller chevron, slower waist-seam pulse, per-player
  hull tints (`HULL_TINT`, screen-composite tinting), real shield stat + energy-sphere /
  HP-arc / orange power-line indicator re-map, smoothed thrust envelope, ~3s fuel,
  always-on retro-braking (sim-verified soft landings), double-tap A/D burst run with
  momentum-carrying rocket leaps. Detail in the world changelog.
- Direction discovery: rapid-fire horde combat ("me against the world") is the fun —
  logged as a todo, discussion pending.

## 2026-07-19 (Relaaax: pork field built)

- New draft world **Relaaax** (`src/worlds/relaaax/`) — the Spastic Space pork.html
  recreation, renamed by James pre-build. Standalone renderer `relaaax-field.js`: rAF
  oscillators with the decoded GIF timing (2.1s ramp + per-class holds), color-lerped,
  geometry scaled off any container (`--u` = one 2002 px), phase-continuous live tuning.
- Chrome Rift-style tuner: speed/holds/desync/ease/border sliders with description lines,
  low/high/bg color pickers, frame width×height text inputs (staging frame, default
  1024×768), reset; localStorage `relaaax-tuner` + `relaaax-frame`.
- Caption cut by James; math verified by Node sim against the GIF table; added to admin
  panel In progress list. Unregistered, no drift exits — setting TBD (in-scene TV idea).

## 2026-07-19 (Pelagic: 3D Jerry cameo)

- Pelagic Lantern Habitat: 3D Jerry shipped — Blender-built cell (headless, scripted:
  jerry_build.py) at beach-ball scale, exported as per-part transparent layers composited
  by a new canvas rig in world.js; orbit path behind the station via a masked-plate cutout;
  DOM pool-Jerry ported verbatim as an A/B alternate; "J" tuner panel (localStorage).
- Look co-directed over ~13 lookdev renders; washout root-caused numerically (70W inner
  lamp clipping layers to white + gradients running along the depth axis) — fixed with
  sub-clip emissions, Standard view transform, face-plane diagonal gradients, violet
  cytoplasm. Nucleus "interest" system eases toward cursor/jellies/beacon.
- Open at close: true-3D rotation fork (pseudo-3D layer rig vs three.js GLB) undecided;
  James questioning the world's purpose — may precede further polish with that conversation.

## 2026-07-18 (Orb Dimension: skull era)

- Orb dimension v14–v33 (two nights): NMS-style flight matured (persistent banking,
  coordinated turns, S-reverse), spaceship/cockpit arc explored end-to-end and retired by
  James (parked in tmp/orb-dimension/parked/, v17 viewscreen restored + full-spin reticle).
- THE SKULL shipped: James's Meshy "alien god skull" at world center — 1800m, tilted back
  5°, rendered inside the world's own WebGL2 pipeline (depth-tested against orbs), red orb
  eyes seated in measured sockets, 2.4km orb-free buffer, cleared load-in sightline,
  spawn at 5.6km. Skull replaced the Heart as home.
- Shared lib: vendored three.js loaders/utils bare 'three' specifiers patched to relative
  imports (documented in orb + mandala changelogs; mandala unaffected functionally).
- Meshy prompt-handoff workflow validated (Claude authors prompt package, James tunes on
  canvas, Claude pulls via API) — ship + skull both produced this way.

## 2026-07-18 (Fifteen Sisters polish session)

- Fifteen Sisters: citysounds bed baked with Dropzilla-style convolution reverb (30%,
  RMS-matched, loop-safe) so the city sits outside in the distance; bed cut to 0.49×,
  world volume starts at 80%.
- Fifteen Sisters: salon walls re-rendered with the mandala shop's sandstone (0.8
  overlay, gentle); default evening now Candlelight, evening chips reordered.

## 2026-07-18 (Mandala Shop marathon session)

- Mandala Shop transformed — "fifty times better" (James): Meshy texture pipeline
  validated as the look multiplier (sandstone walls, canvas tent, desert wood,
  zellige→clay-tile floor, terracotta pottery, ~90cr); Meshy props (register, tea
  service ×6 glasses, incense burner) replace procedurals; animated FS-style incense
  smoke; music player (oasis tracks, 8% start, 20s hush); gallery lighting overhaul
  (per-painting fixtures, focus dimming); counter rebuilt with real crescent scoop
  (boolean-parenting bug found); room decluttered, doorway framed, souk street on a
  wrapped panorama cylinder (city-tile image plan pending); curator multi-select +
  align tools, 10-frame palette, select-on-place; drag-look grab/swing toggle; perf
  passes (dynamic resolution, lights 13→7, draw-call merges) + browser-zoom fix.
- Full detail in src/worlds/mandala-shop/changelog.md (rounds 1–13 + session close).

## 2026-07-17 (global wrap — 07-16/17 sessions committed)

- Dropzilla: GAS bank (replaces TOOTS) and CHUCK OPINES bank live — 2 of 10 banks filled;
  drift exits temporarily disabled during the soundboard build-out.
- Curator mode shipped: reusable `src/core/curator.js` (Mandala Shop is the reference
  adapter) + server endpoints for art listing and layout writes.
- Admin panel: world editor tab with drafts API (`world-drafts.json`), world archive control.
- Jerry's Pool: Mary (Jerry's girlfriend) random visit event, rubric updated.
- Dead Letter Office: Meshy postmaster experiment landed (ref art committed; working
  assets in `tmp/`).
- Get Your Ass in the Moss retired to `archive/` (James's call — dead end).

## 2026-07-13 (launcher cleanup)

- ONE launcher: `start-elastic-space.cmd` (renamed from `map-room.cmd`) — idempotent,
  reuses a running server, opens the map room. Deleted `serve-local.cmd` and
  `start-local.cmd`. Port locked to **4174** everywhere (server default changed from
  4173; all docs updated; 4173 retired). Launchable from the ai-projects ops dashboard's
  new per-project Launch button.
- Map room header reworked: worlds open in new tabs; final header is white
  "Elastic Space Admin" (smaller) with an orange "← all projects" eyebrow link to the
  ops dashboard (localhost:4400) — now a standing rule for every panel we build.

## 2026-07-13 (Coach 9 session)

- NEW WORLD: Coach 9 (idea #37) — window seat on a train that never arrives; style-first pass.
  Inline-SVG interior (woman reading, child who points at set pieces), canvas parallax loop
  (~3 min: meadow → tunnel → highland → station stop → dusk), pastel palette keyframes
- Set pieces: pastel cows, pond rowboat, Wildflowers giant on the far ridge; tunnel mirrors
  the interior and muffles audio; station stops under a generated sim-language name
- Web Audio rail rhythm via shared sound control; one ElevenLabs music track behind a
  cassette-player toggle (music prompts can't name studios/artists — ToS reject)
- Verdict: James lukewarm ("very meh") — on the fence whether the world continues; if it does,
  the art pipeline changes (Blender toon plates or supplied artwork), not more canvas tuning

## 2026-07-13 (Arachno-Wars session)

- NEW WORLD: Arachno-Wars 2000 (idea #52) — James's original one-session artillery game
  unarchived from `_archive/arachno-wars` and shipped as a world, then overhauled: bomblet
  split-direction bug fixed; six weapons (added Beam that lases through limited rock, Egg Sac
  that hatches homing spiderlings, Silk Bridge that builds walkable terrain)
- All audio replaced with 23 ElevenLabs assets incl. a chiptune battle-theme loop; shared
  sound-control gained backward-compatible `channels:` support (separate music volume slider)
- Terrain retextured to warm canyon strata matching the painted bg; childlike flora replaced
  with junipers/ocotillo/agave/spires/webs; tanks rebuilt to James's reference art — Blender
  striped-lozenge bodies (teal/amber) on 8 long procedural harvestman legs
- Three game-mechanic drift exits: clickable blimp, OUT bullseye targets behind each tank
  (hit with any weapon), and an EJECT card that blows the canopy and drifts

## 2026-07-13 (overnight session)

- NEW WORLD: The Fifteen Sisters (idea #6) — pendulum wave in a salon at dusk; 15 rainbow glass
  pendulums on a shared wave clock (sister i swings 22+i times per cycle; unison returns exactly
  once per cycle at any tempo), drifting through snakes/braids/chaos back to unison
- Blender-rendered salon plate with TRANSPARENT windows (film_transparent + RGBA): James's
  GPT city painting composites raw behind the plate — pixel-exact, no tonemap/haze/filter ever
- Furnished salon: patterned rugs, zellij pier bands, chair, palm, bottle table, fruit, incense,
  gilt paintings — all procedural in the committed build script; plate render is the shipped asset
- Three vantages (Front / 45° / 90° buttons) off one physics core, eased camera swings between
- Keeper's cabinet: glass palette, form, evening light, tempo, momentum/friction, chime toggle,
  tuning (penta/major/chromatic/dom7/harmonic-major), voices (glass/bowls/blend), release
  patterns (together/cascade/mirror/by-hand) + gather/release; "drop the sisters" opening ritual
- Audio: Web Audio chimes w/ equal-loudness lift, ElevenLabs crickets + distant bell + Tibetan
  bowl (pitch-shifted via audio-element playbackRate into a full tuned scale), James's
  citysounds bed at 0.7x; all through the shared sound control
- Three diegetic drift exits (door ajar, exit star over the city, wandering moth); registered in
  drift + map room Pages list; World Ideas.md #6 marked built

## 2026-07-12 (late session)

- Wildflowers at Dusk: full dissolution arc — flora ascends piece by piece on an accelerating
  schedule (~3.5 min: lone petals → torrent), ground strip fades, 20s end blur washes the scene
- Field rebuilt: baseline lowered to 20px above viewport bottom; five graduated ranks behind the
  foreground (offsets 40–200px, brightness 98–72%) planted along the near-ridge plate's
  pixel-sampled top silhouette; all ranks baked offscreen (flat frame cost)
- The Giant: chroma-keyed marble bust (James's asset) rises from the hidden valley over 65s at the
  finale, cresting past the top of frame as the blur takes hold; power-thrum track fades in/out
  with his rise; one master sound control now rules all page audio (rain + thrum)
- Soundtrack: gentlerain.mp3 looping via shared ElasticSoundControl
- Session lesson: "invisible" back layers were a brightness/scale problem, not caching — the
  mid-sky duplicate A/B trick (render the field against plain sky) diagnosed it

## 2026-07-12

- Pelagic Lantern Habitat: complete rebuild around a Blender-rendered plate — 2350-era
  three-tier disk station (lit rim bands, porthole rows, halo ring, beacon, pod module,
  seafloor entry dome) over fluorescent flora; canvas overlay adds bubbles, plankton,
  light shafts, beacon pulse, friendly jellies; diegetic drift hotspots + shared sound control
- All Blender work ran headless (`blender.exe --background`) after a live-instance collision
  destroyed another session's in-progress DLO portrait work; new "Blender usage" rules in
  CLAUDE.md (live instance is shared/ask-first, headless default, .blend per world in tmp/)
- Blender sources committed: `pelagic-lantern-habitat/assets/blender/` (.blend + build scripts)
- server.mjs: removed the 5-minute CSS/JS cache — everything is `no-store` now (James's call,
  after it masked a bubble-growth fix during debugging)

## 2026-07-11 (late session)

- Dead Letter Office: letter fall speed ~2.5x + faster spawn cadence (was painfully slow)
- Dead Letter Office: Blender-rendered room backdrop (scripted via Blender MCP, GPT reference
  as target); clean 1920×1080 plate, `USE_ROOM_RENDER` flag, painted room intact underneath
- Dead Letter Office: 3D low-poly Postmaster baked into the plate; transparent click hotspot,
  speech bubble, punch clock top-left; arms slimmed on request; pose rig + props staged
- New assets: `dead-letter-office/assets/room/` (render plate + editable .blend)

## 2026-07-11

- Assets: Wildflowers at Dusk runtime cloud sprites
- Assets: Wildflowers at Dusk cloud sprite sources
- Assets: Wildflowers at Dusk landscape plates
- Assets: Dead Letter Office layers, landscape references
- Assets: world audio (Jerry's Pool, Monochrome Rift, Singing Plate)
- Session work: shared sound control, Rift overhaul, changelogs, tools

## 2026-07-04

- Expand Dead Letter Office interactions
- Launch Elastic Space
