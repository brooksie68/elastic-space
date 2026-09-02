# The Valence Lab — changelog

Newest entries first.

## 2026-09-01 (later still) — Claude (Fable 5.1) — Snap, fully grown: the loaded-screen mock + the Design handoff

James's real riff question: what does the advanced version look like when it
loads, what features, what about the whole table and chains of molecules, how
does it stay fun. Answered in reimagine.md section 9 (anatomy in seven zones,
scaling to 118 with a third bond type + flexible metals + decay, chains via
blocks and a pour gesture, the verbs stay few). His corrections along the way:
"hands" is only a word for the reach, the tendril visual stays as it is; the
name is Snap.

1. **The mock, on his go**: "Snap, fully grown" section on the page, a 16:9
   loaded screen on the sketch's engine: full periodic table shelf (first
   eighteen spawn), chaptered recipe rail, made column of tiny live renders,
   arena pre-loaded with octane, benzene, a 4x4 salt crystal and a seven-water
   drop. Drag, hold-for-X-ray (benzene halo), heat dial. Verified headless
   through the dev-snapshot route (the pane would not composite): 76 atoms /
   75 bonds at load with sub-pixel bond error, no console errors; at full heat
   octane shatters while benzene and the crystal hold; at half heat nothing
   breaks. Snapshots: tmp/snapshots/snap-arena2.png, snap-heat2.png,
   snap-minis2.png, snap-xray.png.
2. **Engine additions**: per-scene center pull and break scale, heat kicks +
   heat-only break rule (weakest first), hydrogen-bond attraction and dotted
   tethers between waters, explicit bond order in link() for rings,
   projected-tetrahedral slot angles for four-domain atoms (the fix that made
   octane read as a chain instead of a blob), per-scene whisper target and a
   made-card hook, nine more elements (Li Be B Mg Al Si P S Ar).
3. **The Claude Design prompt updated** (page + reimagine.md) to the grown
   version: whole-table shelf, chapters, the made column as blocks, the heat
   dial, chains and rings, a seventh deliverable frame (mid-heat).
4. **Handoff agreed**: mock here for anatomy and feel, Claude Design for the
   look, then code the look onto the engine. Decay stays in the vision, out of
   the mock. AWAITING JAMES: his read of the grown mock, then his go to send
   the prompt to Design.
5. **James's first look at the mock (2026-09-02, after midnight)**: the long
   spec page confused him ("why do I have to scroll down through all that other
   crap to get to this one section"), the mock had lost the clear button, and
   something read to him as the arena obscuring the flipped cards (not
   reproduced; the columns and canvas don't overlap by measurement). Built on
   the spot: tmp/the-valence-lab/reimagine/snap.html, the mock ALONE, full
   window, clear + reload + heat + mute in one bar, same engine (extracted from
   the page by a build script in the session scratchpad; rebuild it from the
   page if the engine changes). Verified
   headless (76 atoms, no overlaps, clear/reload work, no console errors) and
   NOT YET PUBLISHED — he called it a night. NEXT: publish snap.html as its own
   artifact link, get his read, then the Design handoff go.

## 2026-09-01 (later) — Claude (Fable 5.1) — James's read + the Powers of Ten spin-off

1. James on the rethink page: "Nice presentation. Good set of considered
   options. You chose the best." Snap stands as the direction; the riff on it
   starts now (design conversation, nothing built).
2. Roll 7, Powers of Ten, is worth its own world in his view, with a twist:
   every zoom ends somewhere silly (a Wendy's, below the Planck length is the
   mall, a clown face, a cookie, a big turtle, other Elastic Space worlds).
   Added to the admin panel's page drafts through the drafts API as "Powers
   of Ten (it ends somewhere silly)"; reimagine.md roll 7 points at it.
3. Housekeeping: the published page now exists twice in the artifact gallery
   (a resumed session republished the same file). The link in reimagine.md is
   the canonical one.

## 2026-09-01 — Claude (Fable 5.1) — the rethink: "Hands" (proposal, nothing built)

James, after living with v4: "not very fun... frumpy, boring, hard to
understand... it should be cool." His brief: take a huge step back, roll the
dice ten times, reimagine it from zero for high-schoolers, scrap or keep
anything, show a spec, maybe a Claude Design prompt. Plan agreed before any
code; he asked for visuals alongside the writing.

1. **`reimagine.md` (this folder) is the proposal**: the diagnosis (an
   instrument, not a toy; the truth shown first and wasted; reading before
   doing), ten dice rolls, the pick ("Hands": Snap + Octet's anatomy + Chords'
   sound + the Foundry's display case as the hold-to-reveal X-ray where the
   real HF cloud lives), the atom in five states, the five moments (snap, grip,
   handoff, refusal, X-ray), keep/scrap ledger, five gates each with its own
   go, the paste-ready Claude Design prompt, and his seven calls.
2. **The published page with the live feel sketch**:
   `tmp/the-valence-lab/reimagine/valence-reimagined.html` (gitignored — KEEP
   it, serve via 4174) and an Elastic Space artifact (link recorded in
   reimagine.md). The sketch: 2D canvas, nine elements (H He C N O F Ne Na
   Cl), Lewis-model electrons, unpaired electrons drawn as reaching hands,
   snap with lens + chord, bond order = hands available (capped at three),
   yank to break, sodium→chlorine/fluorine electron handoff with a charge
   tether, full-shell bounce with ripple + thud, ten recipe cards, element
   pitches. Physics lessons from building it: the stiff bond spring was
   unstable at a 60 Hz step (bond lengths exploded to 10× — caught by the
   headless summary, not by eye) → sub-stepped at 240 Hz with the length
   spring split from a soft angular spring; break limits were set from
   MEASURED drag-transient stretch, scaled by how much molecule is dragged
   behind the bond; a broken bond re-snapped in the next sub-step until a
   0.9 s re-bond cooldown + separation impulse made pops real; fresh bonds
   are exempt from breaking for 0.8 s so a snap mid-drag can't pop.
3. Nothing in the world changed: physics modules, sims, honesty contract all
   untouched. AWAITING JAMES: his calls (reimagine.md §8) and his go on gate 1
   (the hands lab harness in tmp/, three.js, judged by his eye).

## 2026-08-04 (later same day) — Claude (Sonnet 5) — v4.1: draggable panels + two bugs

James's first-look feedback on v4: panels need to be movable, "try this" has
no way to collapse and sits in front of the scope, and every panel has both
scrollbars when it needs neither.

1. **Panels are now draggable by their header**, and remember where you put
   them — no separate "save" step, position is written to localStorage
   (`valence-lab-panel-pos-v1`) the instant a drag ends, same philosophy as
   every tuner slider. `makeDraggable()` tells a click from a drag by
   movement distance (>6px, the same threshold the vial-click/camera-spin
   code already uses) so the header still toggles collapse on a plain
   click. A dragged panel switches to `position:fixed` at the drop point
   (clamped on-screen) and drops out of its column's flex flow — other
   panels in that column reflow to fill the gap. "Reset panel positions"
   (fine tuning panel, separate from "reset to defaults" — one is layout,
   one is the science sliders) clears it back to the default column layout.
2. **Real bug: the double scrollbar.** `.hud-col` had `overflow-y: auto` but
   `overflow-x: visible` — per the CSS spec, mixing a scrolling value on one
   axis with `visible` on the other forces BOTH axes to compute to `auto`.
   That's why every panel showed a horizontal scrollbar it never needed.
   Fixed: `overflow-x: hidden` (we never want horizontal scroll here).
3. **Real bug found while testing the drag (not from his report): a thrown
   `releasePointerCapture` would have silently eaten the collapse-toggle
   click.** Synthetic/edge-case pointer-capture failures now `try/catch` on
   both `setPointerCapture` and `releasePointerCapture` so a capture failure
   can never block the fallback click behavior.
4. **Try this panel** now collapses correctly (it always could via the same
   header mechanism as every other panel — the real problem was #2 and #3
   above confusing the interaction, plus no way to relocate it out of the
   way, which #1 now solves) and, once dragged elsewhere, resizes from the
   bottom-strip's forced full width back to a normal 22em card
   (`.hud-panel.dragged` has to out-rank `.hud-col-bottom .hud-panel`'s
   `width:100%` — same specificity, later in the sheet wins).

Verified live: click-to-collapse and drag-to-move both isolated and
confirmed correct (drag math checked against expected deltas with a real
viewport size faked in, since the harness's undisplayed pane reports a 0×0
viewport and can't be trusted for pixel-perfect checks on its own); position
persists across reload; reset button clears it. Both sims still green
(129 + 404) — nothing physics-adjacent changed. Awaiting his hands-on pass.

## 2026-08-04 — Claude (Sonnet 5) — v4: the exhibit rebuild

James's brief, delivered as one long brain-dump: the lab reads "too
scientific" — one small panel, unexplained shorthand (`1s² 2s² 2p⁶` with no
translation), a hard click-toggle for shells vs. cloud, two background props
that didn't earn their place, and materials that "look like a generic 3D
shape made in Blender." His framing: a museum exhibit fifty years in the
future, fun and inviting to a smart high-schooler who's never taken
chemistry. Built solo on his explicit go ("just do something amazing...
rock on, buddy"), plus a standing consent to spend up to 60 Meshy credits
without asking again mid-task.

1. **New `content.js`** — plain-English copy, zero physics, zero imports.
   Per-element and per-molecule "what is this?" overview paragraphs, a
   `shellBreakdown()` helper that groups an element's raw subshell fill into
   plain shells ("first shell," "second shell — the outer shell"), s/p shape
   explanations (including the honest aside that s/p/d/f are 19th-century
   spectroscopy labels — sharp/principal/diffuse/fundamental — not shape
   descriptions), a `reactivityBlurb()` keyed off electron count/seeking,
   and swarm/fog/shells explainer text. Nothing here is asserted by the sims
   because nothing here is a number; if a paragraph ever states one it must
   match orbitals.js/valence.js.
2. **Six floating glass HUD panels**, replacing the old 3-tab scope console:
   specimen (identity + an enriched valence/reactivity paragraph, not just a
   one-line status), electron shells (clickable rows, expand to read what
   "2p" means and why), what is this? (the overview paragraph), viewing
   modes (swarm vs. fog vs. shells explained in plain terms, plus the
   swarm/fog toggle), try this (the recipe book, each molecule now carries a
   one-line friendly hook — "water — the classic, start here"), fine tuning
   (the detailed slider deck, collapsed by default). Panels are glass cards
   — blurred backdrop, thin glowing border, a slow few-px float, staggered
   per panel — built once (`makePanel()`) and refreshed from live
   `scopeState` via `refreshSpecimenPanel()`/`refreshShellsPanel()`/
   `refreshAboutPanel()`. `selectTab(name)` no longer switches tabs (there
   aren't any) — it un-collapses `#panel-name` and gives it a one-shot pulse
   glow, so a fresh bond or refusal is still always seen.
3. **The shell↔cloud crossfade is now two big sliders**, not a 3-way
   click-cycle. "Electron cloud brightness" and "fade in the shells" live
   front-and-center in the viewing modes panel; `shellVisEnv`/`swarmVisEnv`
   ease toward the slider values every frame (`* 0.1` per frame) so dragging
   always reads as a fade, never a pop — James's ask, explicitly: bring
   shells to 100% and watch them obscure the cloud, then fade back, by drag
   not by click. The `shellS`/`shellP` s-sphere/p-dumbbell checkboxes moved
   out of the old tuner and into the electron shells panel itself.
4. **`labBack` deleted outright** — the two equipment-rack/shelf props added
   the previous session didn't solve anything and James said to just drop
   them; no replacement.
5. **Real materials, no Meshy 3D swap needed.** Vial glass is now a
   `MeshPhysicalMaterial` with `transmission:1` (actual refractive glass,
   not a flat translucent color); a small procedural scene fed through
   `PMREMGenerator` gives `scene.environment` something for metal to
   reflect, free. On top of that, three Meshy-generated seamless tiles
   (~27 credits total) now dress the procedural geometry:
   `assets/textures/metal-panel.png` (brushed steel, riveted), `-dark.png`
   (dark riveted panel), `glass-frost.png` (frosted etched glass, used as a
   `roughnessMap`/`bumpMap` on the vials). `tiledTexture()` wraps
   `RepeatWrapping` + repeat counts. The vials/scope/bench stay procedural
   three.js geometry — no GLB import, so the hitbox cylinders, sprite
   labels, and vial click wiring are untouched.
6. **Verification:** both sims still green (129 + 404 assertions, nothing
   physics-touching changed). Confirmed in a live tab: zero console errors,
   every asset (scripts + new textures) 200, and the rendered DOM shows real
   per-element data (spot-checked against oxygen's actual 1s² 2s² 2p⁴, not a
   placeholder).

Build stamp `v4 · phase B · the exhibit rebuild · 2026-08-04`. Awaiting
James's eyes on the whole thing — panel copy/layout, the crossfade feel, and
the new materials are all first-pass judgment calls, ten-percent tuning
expected.

## 2026-08-03/04 — Claude (Sonnet 5) — camera default, drag spins the specimen, lab background hint

Three of James's asks, one false alarm:

1. **Camera default pulled back.** He was scrolling back 3 wheel clicks every
   load to get the front bench edge (the blue lit strip) and the "feed the
   scope from the vials" text on screen. `orbit.dist`/`tDist` default moved
   20 → 24.5 (`20 × 1.07³`, matching what 3 wheel-back clicks already
   produced) so the opening view starts where he was manually landing it.
2. **Drag now spins the specimen, not the table.** Click-drag previously
   drove `orbit.tYaw`/`tPitch` (camera orbit around the whole bench — "it
   rotates the whole table"). Rewired: drag now accumulates into a damped
   `molSpin` quaternion applied to `swarmGroup`/`ghostGroup`/`nucleusGroup`
   only (composed with `scopeState.quat`, the existing display-only molecule
   orientation); the bench, scope ring, and vials stay fixed. Wheel zoom and
   idle auto-orbit still move the camera, untouched.
3. **A hint of lab in the background.** James: "still quite faded, but a
   little too empty in the back." Added `labBack` group past the rear bench
   skirt (z < −15, off to the sides of the atom): two dark equipment racks
   with faintly pulsing status-light planes, plus a dim shelf with a few
   canisters. All dark/desaturated on purpose — depth cue, never the focus.
4. **False alarm, no code changed:** James reported the view:swarm/fog
   toggle "doesn't do anything" and show:both showing neither swarm nor fog.
   His own diagnosis was right first try — the swarm-visibility slider was
   at 0 in his session. Confirmed the shader/crossfade wiring is correct by
   direct inspection of a live tab (7000-point swarm, `uAlpha`/`uFogMix`
   uniforms wired and updating as designed).

Drag-spin sign/feel and the background dimness are first-pass guesses, not
yet confirmed by James's eye — flag for ten-percent tuning next session.

## 2026-07-26 — Claude (Opus 5) — the blob question (no code changed)

James flew v3.2 and asked why molecules look like "an amorphous blob" when he
expected to see orbitals snapping together, then followed up on whether
water's rabbit-ear lone pairs are the real shape. Answered by measurement off
our own solver, not from a textbook — full numbers are now in this world's
CLAUDE.md (honesty contract item 8), the short version:

1. Molecule mode draws the TOTAL density, the sum over all five occupied MOs,
   and that genuinely is smooth. The structure is in the individual MOs, which
   the solver computes (`C`, `eps`) and `bake.mjs` discards. Not a bug, but
   the least informative honest view we could have shipped.
2. Water's canonical lone-pair orbitals are not a matched pair: 3a₁ is one
   in-plane lobe 0.0° off the away-from-H bisector, 1b₁ is 1.0000 pure O 2p at
   90° out of plane, and they ionize ~2 eV apart (two photoelectron bands).
3. The rabbit ears are (3a₁ ± 1b₁)/√2 — equivalent to machine precision,
   102.0° apart, and they change the density matrix by 4.4e-16. Legitimate
   bookkeeping, but not eigenstates (0.84 eV off-diagonal Fock element).
4. The observable density has no ears: in the very plane where they'd live,
   the ρ = 0.004 contour varies 8.4% in radius and peaks on the bisector.

Outcome: **Phase B.5, the orbital viewer**, is written up in CLAUDE.md as a
proposal awaiting James's go — ship `C`/`eps`, per-MO sampling with phase
colour, orbital picker; then the bond-length scan for an honest formation
animation (converged solutions played in order, never an interpolation).

## 2026-07-26 — Claude (Opus 5) — v3.2: console text size

James: "add the text sizing option to the control panel and start it on a
larger size than it is now before you even add the panel. It's too small."

1. The scope console is now sized off ONE em base. `.readout` carries
   `--ui-base: 12px` and `font-size: calc(var(--ui-base) * var(--ui-scale))`;
   every descendant font-size, the panel width (22em), its padding, the
   subshell dots, the valence pips, the recipe formula column and the flash
   row's min-height are all `em`. Nothing inside the console is a hard px
   font-size any more. The `max-width: 900px` media query now just lowers
   `--ui-base` to 10.5px instead of fighting the base with its own width and
   font-size.
2. **Default is bigger, out of the box**: `textScale` defaults to **1.25** —
   base type 12 → 15px, specimen symbol 26 → 32.5px, panel 298 → 372px wide.
   The CSS `var(--ui-scale, 1.25)` fallback matches DEFAULTS.textScale so the
   first paint is already at the new size (comment in both files says so).
3. New controls group **"this console"** with a `text size` slider
   (0.9–2.0, step 0.05), persisted in the existing `valence-lab-tuner-v1`
   key and applied via `applyTextScale()` — also called on load and by
   "reset to defaults". Verified in-browser: slider → 1.70 gives a 20.4px
   base and stores; reset returns to 15px.
4. Lockup, bottom hint and the 3D scene are untouched — this is the console's
   own type only. No physics touched; both sims re-run green (129 + 404).
   Build stamp v3.2.

## 2026-07-25 — Claude (Fable 5) — v3: the scope console + the recipe book

James's reframing: the sliders aren't a config, they're the instrument
("it's sort of a science lab... it's really the scope controls"), and lay
people need to be told methane is C + 4H. Built:

1. The right panel is now a three-tab scope console: **specimen** (the old
   readout), **controls**, **recipes**. Tab row under the scope-tag header;
   a fresh bond or a refusal auto-switches to specimen so the payoff/reason
   is always seen.
2. **Controls tab**: every former tuner row, grouped by science — "the
   cloud" (samples, swarm visibility, dot size, life, brightness, core dim,
   time scale), "the shells" (shell visibility + NEW s-sphere / p-dumbbell
   checkboxes for staged atoms), "the scope" (magnification, fog growth,
   idle orbit, ring glow). The bottom-left ⚙ tuner is retired; same
   localStorage keys; build stamp now lives at the controls tab foot.
3. **Recipes tab**: all nine molecules with TRAP-SAFE feeding orders (new
   `path` field in valence.js — every path is asserted in molecule-sim to
   complete without premature bonds; sim now 404 assertions). Clicking a
   recipe flushes the scope and auto-brews it, one flyer at a time
   (brewQueue in the frame loop; manual vial clicks cancel a running brew).
   Footnote explains the O₂ trap (why peroxide feeds H first).
4. Flush is now a hard reset: it also cancels in-flight flyers and any
   running brew (a landing flyer could previously stage stale contents
   into a freshly flushed scope).

v3.1 same session, James's correction: the recipe cards must NOT be one
giant button — the expectation is people read the recipe and build it
themselves at the vials; auto-run stays but demoted to a small quiet
"run ▸" tag on each card (cards themselves are now inert divs, intro copy
says "feed the vials left to right"). Recorded as a protected intent in
the world CLAUDE.md.

## 2026-07-25 — Claude (Fable 5) — v2.1: layer A/B toggle + visibility sliders

James's first Phase B feedback ("these aren't little balls whizzing around a
planet" — he wants the shells studied on their own): new readout button
cycles show: both → swarm → shells (smooth crossfade, not a pop), and the
tuner gains independent 0–100% visibility sliders for each layer — "swarm
visibility" (new key `swarmOpacity`, default 1) and "shell visibility"
(`ghostOpacity`, range widened 0.4 → 1, default still 0.10). Buttons row is
now a 2×2 grid. Both layers remain honest views of the same density.
v2.2 same session: James couldn't find the new sliders — the tuner panel
scrolls internally and they'd been appended below the fold. They now sit at
the TOP of the panel (rule of thumb recorded in world.js: anything below the
tuner fold might as well not exist).

## 2026-07-25 — Claude (Fable 5) — Phase B: the bonding bench (v2, draft)

James's go after the Phase B planning conversation; his three calls: (1)
instant bonding the moment scope contents match a recipe, (2) refusals that
are unmistakably clear and honest, (3) swarm stays primary with a ~10%-opacity
ghost shell so the orbital shapes read. Built this session:

1. **In-house Hartree-Fock solver** (`tmp/the-valence-lab/hf/`): McMurchie-
   Davidson integrals (overlap/kinetic/nuclear/ERI/dipole/second-moment over
   contracted Gaussians), Boys function, Jacobi eigensolver, RHF + UHF with
   DIIS, STO-3G basis for H/C/N/O. Anchors hit: H₂O −74.9629 Ha, CH₄
   −39.7268, H₂ −1.11668, free H exactly −0.466582. Found and fixed the
   classic N₂ wrong-occupation saddle (core guess converges 0.73 Ha high,
   rendering N₂ unbound) — SCF now tries GWH + core guesses and keeps the
   lower solution; O₂ runs UHF as a genuine triplet (⟨S²⟩ ≈ 2.003).
2. **Bake pipeline** (`hf/bake.mjs` → `assets/molecules-data.js`, 24 KB):
   nine molecules (H₂ N₂ O₂ H₂O CO₂ CH₄ NH₃ H₂O₂ C₂H₄) at experimental
   geometries, charge-centered; ships the SCF density matrix, basis,
   energies, atomization eV, dipoles, analytic electronic centroid + second
   moments (sampler anchors). No meshes shipped — the ghost isosurface is
   carved in the browser from the same D.
3. **Runtime density module** (`density.js`, pure ESM): basis evaluation,
   ρ(r) from the baked D, Metropolis walker sampler (every emitted dot a
   true density sample), marching-tetrahedra isosurface builder.
4. **Valence engine** (`valence.js`, pure ESM): octet/duet recipes for all
   nine molecules, instant-match verdicts, honest refusal texts (noble
   closed-shell, saturated molecule, off-library "exists in nature, not
   calibrated here"), completion hints ("+H → water · +H +O → peroxide"),
   Lewis accounting lines; O₂ declares its two unpaired electrons and calls
   out where the Lewis picture lies.
5. **World integration** (world.js v2): vials now FEED the scope (flyer
   animation, one at a time); staged atoms sit side by side with their own
   swarms + analytic s/p ghost silhouettes; on match the molecule loads —
   element-colored molecular swarm, runtime ghost shell, per-atom jittering
   nuclei, energy flash (ring + brightness only, no camera moves), readout
   with bond accounting + "(STO-3G estimate)" honesty labels. Refusals: red
   flash text, red ring pulse, the flyer bounces off the field edge. Flush
   button resets. New tuner row: ghost shell opacity (default 0.10).
   Molecules are oriented/fit-clamped for display only.
6. **Verification** (`tmp/the-valence-lab/molecule-sim.mjs`, 324 assertions,
   all passing + atom-sim's 129): solver anchors/invariants, bake freshness
   (re-derives every SCF), Metropolis moments vs analytic integrals, ghost
   verts on the iso value, engine reachability for all nine + the O₂ trap
   (O+O snaps to O₂ before H₂O₂ can form — thread H,O,O,H instead).

Status: draft v2, awaiting James's eyes. Phases C/D unstarted, each needs
its own go.

## 2026-07-25 — Claude (Fable 5) — click-away dismissal (site-wide sweep)

- New house rule from James: every control panel dismisses on click-away. Added
  the standard `pointerdown`-outside handler to the tuner panel.

## 2026-07-25 — Claude (Fable 5) — v1.1: idle auto-orbit off by default

James's first-look feedback: stop the rotation by default. `orbitSpeed` default
is now 0 (the tuner slider still goes to 0.3 for anyone who wants it back), and
the tuner loader drops a stored `orbitSpeed` of exactly 0.05 — the old default —
so already-saved localStorage from the v1 build doesn't keep the camera moving.
Build stamp bumped to v1.1. No physics touched, sim not required.

## 2026-07-24 — Claude (Fable 5) — Phase A: the atom bench (v1, draft)

World created after a full planning conversation with James (his idea: "the most
realistic molecule visualizer" — atoms, valences, electron clouds and their
ambiguity, scaling from one molecule to a drop of water). Agreed phases:
A atoms → B bonding → C scale journey (chapters, narrated) → D showcases
(elephant toothpaste, polymers). Name is James's pick.

Built this session:

1. `orbitals.js` — pure physics module. Hydrogen-like radial wavefunctions
   (1s/2s/2p/3s/3p) with Slater-rule effective charges, inverse-CDF radial
   samplers, exact cos²α angular sampling for real p orbitals, Hund's-rule
   occupancy. Shared verbatim with the Node sim.
2. Verification sim `tmp/the-valence-lab/atom-sim.mjs` — 129 assertions
   (mean radii vs analytic within 2%, ⟨cos²α⟩ = 3/5 on every p orbital,
   s-orbital isotropy, the O 2s radial node actually present, Slater Zeff
   table, Hund filling, neutron counts). All pass.
3. The bench scene: brushed-metal bench, cantilevered coherence-scope ring
   (MacGuffin tech, deliberately vague future), six specimen vials
   (H, C, N, O, Ne, Ar) with CPK-glow and click-to-load.
4. The measurement swarm: GPU point cloud, every dot an honest sample of
   |ψ|², shell-colored (palette shared with the readout legend), core shells
   dimmed, staggered bloom-in on element load. Fog view toggle (same samples,
   softer/bigger dots). "Measure" button collapses the swarm to one bright
   dot for a beat, then superposition blooms back.
5. Nucleus with correct proton/neutron counts, jittering, honestly footnoted
   as magnified ~2,000× beyond the cloud.
6. Readout panel: config string with shell-colored dots, valence pips
   (missing electrons pulse amber), reactive/inert status, footnotes.
7. Tuner (house pattern, localStorage `valence-lab-tuner-v1`): swarm samples,
   dot size, sample life, brightness, core dim, fog growth, atom scale,
   time scale, idle orbit speed, ring glow. Build stamp in the panel header.

Status: DRAFT — no drift exits, no registry entry, no sound yet (those come at
ship). Awaiting James's first look. Next up (each with its own go): his eye
pass on Phase A, then Phase B bonding (drag atoms together, valence engine,
precomputed real molecular densities for H₂/O₂/N₂/H₂O/CO₂/CH₄/NH₃…).
