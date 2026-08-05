# The Valence Lab — world instructions

Read the elastic-space CLAUDE.md and `docs/building-a-world.md` first; this file
holds only what is specific to this world.

## What this world is

James's brief (2026-07-24): the most realistic molecule visualizer we can build —
individual atoms, honest valences and electron counts, electron clouds with their
quantum ambiguity, molecules forming from atoms, and eventually the story of how
one water molecule becomes a drop. Framing: a stylized-literal future lab bench
with a "coherence scope" — the tech is a MacGuffin, plausible-future, deliberately
unexplained. Name is James's.

## The phases (each needs its own explicit go from James)

1. **Phase A — the atom bench** (BUILT 2026-07-24, draft):
   six vials (H, C, N, O, Ne, Ar), measurement-swarm electrons, valence readout.
2. **Phase B — bonding** (BUILT 2026-07-25, draft, awaiting James's eyes):
   vials feed the scope; the valence engine (`valence.js`, octet/duet
   accounting) stages atoms and bonds them THE INSTANT contents match a
   recipe (James's call). All nine target molecules — H₂, O₂, N₂, H₂O, CO₂,
   CH₄, NH₃, H₂O₂, C₂H₄ — carry REAL densities: an in-house restricted/
   unrestricted Hartree-Fock solver (STO-3G, `tmp/the-valence-lab/hf/`) runs
   at bake time and the SCF density matrix ships in
   `assets/molecules-data.js` (24 KB). Refusals are loud and honest (James's
   call): red flash + reason; noble gases refuse with the closed-shell truth,
   off-library mixes admit the compound may exist unbaked. Ghost shells
   (James's call: ~10% opacity, tuner `ghostOpacity`): molecule mode shows
   the ρ = 0.004 e/a₀³ isosurface of the true density (marching tets at
   runtime in `density.js`); staged atoms show analytic s-sphere/p-dumbbell
   subshell silhouettes from the same orbitals the swarm samples.
3. **Phase B.5 — the orbital viewer** (PROPOSED 2026-07-26, needs its own go).
   James, after flying v3.2: he expected to see orbitals "snapping together"
   and got an amorphous blob. He is right to be disappointed and the blob is
   not a bug — molecule mode shows the TOTAL density (sum over all occupied
   MOs), which really is smooth. The structure lives in the individual
   molecular orbitals, and we already compute them and throw them away:
   `rhf`/`uhf` return the MO coefficient matrix `C` and orbital energies
   `eps`, but `bake.mjs` only ships `D`. The plan, in two steps:
   (a) ship `C` + `eps` per molecule (small — 49 floats for water), teach
   `density.js` to sample a single MO's |ψ|² and colour by the sign of ψ, add
   an orbital picker + energy ladder to the console;
   (b) the honest "snap": re-run the SCF at a series of bond lengths and play
   the converged solutions back in order — at long range the MOs genuinely
   look like separate atomic orbitals and they genuinely merge into a σ. That
   is a quasi-static geometry scan, not an interpolation, and it must be
   labeled as such (no time-dependent claim).
4. **Phase C — the scale journey**: staged chapters (James chose chapters over
   continuous zoom), narrated — Claude writes scripts, James produces the voice
   audio (he wants to drive sample generation). One water molecule → hydrogen
   bonding → cluster → droplet-as-field. Temperature slider (ice ↔ steam).
5. **Phase D — showcases**: elephant toothpaste (H₂O₂ decomposition),
   polymerization (ethylene → polyethylene).

## The honesty contract (protected)

1. `orbitals.js` is the physics: hydrogen-like orbitals with Slater-rule Zeff,
   inverse-CDF radial sampling, exact cos²α angular sampling for p orbitals,
   Hund occupancy. It is pure ESM with zero imports and is shared verbatim by
   the verification sim. Never let rendering concerns leak into it, and never
   "art-direct" a distribution — display scaling lives in world.js only.
2. **Any change to the physics runs the sims before it ships:**
   `node tmp/the-valence-lab/atom-sim.mjs` (129 assertions) and
   `node tmp/the-valence-lab/molecule-sim.mjs` (404 assertions: solver vs
   published STO-3G anchors, bake freshness, sampler vs analytic moments,
   isosurface-on-density, valence engine). Add assertions when adding
   physics; never delete one to make a change pass.
3. Every swarm dot must remain a true sample of |ψ|². The fog view reuses the
   same samples with different sprite params — it is a rendering mode, not a
   different distribution.
4. Honest footnotes stay: the nucleus-magnification note in the readout, and
   any future scale compromises get named in-world the same way.
5. Readout legend colors and swarm colors both come from `SUBSHELL_COLORS` in
   orbitals.js — never define shell colors in two places. (Molecule mode
   colors dots by nearest atom's element — that is labeled display coloring,
   not physics.)
6. **Phase B additions.** `density.js` and `valence.js` are pure ESM with
   zero imports, shared verbatim by molecule-sim — same rules as orbitals.js.
   `assets/molecules-data.js` is GENERATED (never hand-edit): regenerate with
   `node tmp/the-valence-lab/hf/bake.mjs`, then run molecule-sim — it
   re-derives every SCF and fails if the bake is stale or doctored. The
   Metropolis sampler's equilibrium is the baked density exactly; its means
   and second moments are asserted against analytic Gaussian integrals. The
   ghost shell is an isosurface OF THAT DENSITY — changing its iso value is
   display tuning, but its shape must never be sculpted by hand. Energy
   numbers in the readout are always labeled "(R/UHF/STO-3G estimate)" —
   minimal-basis HF underbinds N₂/O₂ badly and we say so rather than fudge.
7. The solver history that matters: the SCF runs BOTH a GWH and a core-guess
   start and keeps the lower converged solution — N₂ (and O₂) otherwise land
   on a wrong-occupation saddle ~0.7 Ha high that would render N₂ unbound.
   molecule-sim asserts every molecule is bound and N₂'s π degeneracy; do not
   simplify the dual-guess logic away.
8. **Three views, always labeled (settled 2026-07-26 by measurement, not by
   textbook).** James asked whether water's "rabbit ear" lone pairs are real.
   Measured from our own RHF/STO-3G water — scripts were scratch, so the
   numbers are recorded here rather than recomputed:
   - Canonical MOs are what the SCF returns and what spectroscopy sees. The
     in-plane 3a₁ peaks 0.0° off the H–O–H bisector on the far side from the
     H's; the HOMO 1b₁ is 1.0000 pure O 2p, 100% of its coefficient norm,
     90° out of the molecular plane. Two different shapes, Koopmans 12.33 and
     10.65 eV (experiment 14.74 / 12.62 — minimal basis underbinds, ordering
     and the ~2 eV split are right).
   - The two equivalent "ears" are (3a₁ ± 1b₁)/√2: equivalent to machine
     precision, peaks 102.0° apart, each 51° out of plane. The rotation
     changes the total density matrix by 4.4e-16 — so they are a legitimate
     re-description, NOT a rival claim. But they are not eigenstates: the
     off-diagonal Fock element between them is 0.84 eV, so an ear has no
     binding energy and nothing in a spectrum corresponds to one. If the
     orbital viewer ever offers localized orbitals, that caveat ships with
     them.
   - The observable density has no ears at all. In the x = 0 plane (the plane
     ⊥ to H–H through O, exactly where the ears would live) the ρ = 0.004
     contour is a near-circle: radius 2.489–2.698 a₀, 8.4% total variation,
     maximum on the away-from-H bisector, no bump on either ear direction.
     One smooth bulge on the far side — that is what a hydrogen bond sees.

## Rendering / interaction notes

1. Draft status: no drift exits, no registry entry, no sound. These arrive at
   ship time only. Keep the world OUT of `world-registry.js` until then (the
   registry generator includes drafts — restore the registry if you regenerate).
2. Camera: slow damped orbit, wide default (dist 24.5, tuned 2026-08-03 to
   match where James was manually landing it after 3 scroll-back clicks),
   idle auto-orbit after 6 s. James gets motion sick — never add snap moves
   or shake. **Click-drag no longer moves the camera** (2026-08-03): drag
   accumulates into `molSpin`, a damped quaternion applied to
   `swarmGroup`/`ghostGroup`/`nucleusGroup` only — it spins the specimen in
   place. Camera yaw/pitch (`orbit.tYaw`/`tPitch`) now only move via wheel
   zoom (dist) and the idle auto-orbit timer; don't reintroduce drag→camera
   coupling.
3. Controls: since v3 there is NO ⚙ tuner. **v4 (2026-08-04) replaced the
   3-tab scope console with six floating glass HUD panels** (James's brief:
   "not just one little panel... glass panels that float in the air
   holographically" — museum-exhibit register, not a config screen):
   specimen, electron shells (clickable, plain-English per-shell rows),
   what is this? (overview paragraph, `content.js`), viewing modes (swarm/
   fog/shells explainer + the shell↔cloud crossfade sliders), try this (the
   recipe book), fine tuning (the detailed slider deck, collapsed by
   default). Panels are built once in world.js (`makePanel()`, appended into
   `#hud-left`/`#hud-right`/`#hud-bottom`/`#hud-corner` from index.html) and
   refreshed via `refreshSpecimenPanel()`/`refreshShellsPanel()`/
   `refreshAboutPanel()` reading live `scopeState`. `selectTab(name)` no
   longer switches tabs (there are none) — it expands panel `#panel-${name}`
   if collapsed and gives it a brief `.pulse` glow, so a fresh bond/refusal
   is still always seen. Persistence is still localStorage key
   `valence-lab-tuner-v1`; the build stamp sits at the bottom of the fine
   tuning panel. The shell↔cloud crossfade (`ghostOpacity`/`swarmOpacity`)
   now lives as two big, prominent sliders in the viewing modes panel
   (James: fade all the way to 100% and back, not a click-cycle) — the old
   3-way "show: both/swarm/shells" button is gone; `shellVisEnv`/
   `swarmVisEnv` in the frame loop ease toward the slider values every frame
   so dragging always reads as a fade. `shellS`/`shellP` checkboxes moved
   into the electron shells panel (rebuilt per-atom, re-wired each render).
   PROTECTED INTENT (James, v3.1, still in force): recipes are for reading —
   visitors should build at the vials themselves. Auto-brew (`brewRecipe`/
   `brewTick`) is deliberately a small "run ▸" tag on each card, never the
   card itself and never the primary action; don't enlarge it.
   `content.js` is copy-only (plain-English element/molecule overviews,
   shell/reactivity/view-mode text) — pure ESM, no physics, not covered by
   the sims because it asserts no numbers; if a paragraph ever states a
   number it must match what orbitals.js/valence.js actually compute.
   **v4.1 (same day): panels are draggable and remember position.**
   `makeDraggable()` distinguishes a click (toggle collapse) from a drag
   (reposition) by movement distance, same >6px threshold as the vial-click/
   camera-spin code. Position auto-saves to localStorage
   (`valence-lab-panel-pos-v1`) on drag end — no explicit save action, same
   as every tuner slider. "reset panel positions" (fine tuning panel) is a
   SEPARATE reset from "reset to defaults" — layout vs. science, don't merge
   them. Both `setPointerCapture`/`releasePointerCapture` are wrapped in
   try/catch — a capture failure must never block the click-to-collapse
   fallback (this actually happened once during testing and silently ate
   the click). `.hud-col` needs `overflow-x: hidden` explicitly — CSS forces
   BOTH axes to `auto` if one is a scrolling value and the other is
   `visible`, which is exactly how the double-scrollbar bug happened; never
   set `overflow-x: visible` next to an `overflow-y` scrolling value again.
4. Pixel ratio is capped at 2 (4K fill-rate discipline). The swarm is one
   additive Points draw; keep it that way — no per-dot meshes.
5. Raycasting hits invisible hitbox cylinders on the vials only — never
   raycast the points cloud.
6. **Phase B wiring gotchas.** `scope` is the ring HARDWARE group (Phase A
   naming); the interaction state lives in `scopeState` — do not merge them.
   Molecule orientation/fit are display-only: `MOL_ORIENT` quaternions and
   the `fitLimit` clamp keep molecules inside the ring without touching
   physics coordinates. Vial clicks route through `attemptFeed` → flyer
   animation → verdict; `flightLock` serializes feeds. The debug handle
   `window.__valenceLab.stepFlyers(nowSec)` advances flyers when rAF is
   frozen (hidden Browser pane) — that is how agent sessions QA the state
   machine headlessly. Ghost material is one shared fresnel ShaderMaterial;
   its opacity tracks tuner `ghostOpacity` every frame. Layer A/B (v2.1,
   James's ask): readout "show:" button cycles both/swarm/shells with lerped
   crossfade envelopes; `swarmOpacity` + `ghostOpacity` tuner keys are the
   per-layer 0–100% visibility sliders. Both layers are views of the same
   density — never let one become decorative.
7. **Console type scale (v3.2, moved to `.hud`/`.hud-panel` in v4).**
   Everything inside a HUD panel is sized in `em` off one base: `--ui-base`
   (12px, 10.5px under 900px wide, set on `#hud`) times `--ui-scale`, which
   `applyTextScale()` writes onto `#hud` from tuner `textScale` (default
   1.25). Never add a px font-size inside a panel; the CSS
   `var(--ui-scale, 1.25)` fallback must be kept equal to
   DEFAULTS.textScale, since it is what paints before the module runs. The
   lockup and the bottom hint are outside this and stay px.
8. **The HUD panel shell (v4).** `makePanel(column, id, title, {open})` in
   world.js creates the header-button + `.pbody` structure and returns the
   body element to fill; index.html owns the four column containers
   (`#hud-left`/`#hud-right`/`#hud-bottom`/`#hud-corner`) so world.js never
   creates layout containers, only panels. Collapse is pure CSS
   (`.hud-panel.collapsed .pbody{max-height:0}`) toggled by the header
   click — no state persisted per panel (default open/collapsed is fixed
   per panel, "fine tuning" is the only one that starts collapsed). The
   `.pulse` class (added by `selectTab`) triggers a one-shot glow via
   `::after` + `hudPulse` keyframes — never repurpose `::after` on
   `.hud-panel` for anything else. The float animation (`hudFloat`,
   staggered per-panel `animation-delay`) is a few px over several seconds —
   keep it that subtle, it's motion-restraint territory even though it's UI
   chrome, not camera.
9. **Materials (v4, 2026-08-04).** Meshy-generated seamless tiles live in
   `assets/textures/` (`metal-panel.png` brushed steel, `metal-panel-dark.png`
   dark riveted panel, `glass-frost.png` frosted etched glass — ~27 Meshy
   credits, James's standing go up to 60cr for this session). `METAL`/
   `METAL_DARK` carry the metal tiles via `tiledTexture()` (RepeatWrapping);
   the vial glass is `MeshPhysicalMaterial` with `transmission:1` (real
   glass, not a flat translucent color) plus the frost tile as a
   `roughnessMap`/`bumpMap` at low intensity. `scene.environment` is a
   procedural PMREM env map (three soft panels in a small env scene) so
   metal actually reflects something — no external HDR needed. If more
   Meshy assets are added later, keep using image tiles + RepeatWrapping on
   the existing procedural geometry; do not swap the vials/scope/bench for
   imported GLBs without a planning conversation (the hitbox cylinders,
   sprite labels, and vial click wiring are load-bearing on the current
   procedural layout).

## Where things stand

Phase B built 2026-07-25 (one session after James's go + three calls:
instant bonding, unmistakable refusals, ~10% ghost shells). Both sims green
(129 + 324 assertions). Awaiting James's eyes on: bond flash strength, ghost
opacity default, staged-atom spacing, refusal copy. Expect ten-percent
tuning. Phase C (narrated scale journey) and D (showcases) still need their
own planning conversations and gos. Still draft: no drift exits, no registry
entry, no sound.

2026-08-03/04 session: camera default pulled back to 24.5, drag rewired to
spin the specimen instead of orbiting the camera/bench, faint background lab
hint added (`labBack` group — REMOVED again same week, see below). Swarm/fog
toggle "not working" report turned out to be his own swarm-visibility slider
at 0 — no code bug, nothing to fix.

2026-08-04 session — **v4, the exhibit rebuild** (James's brain-dump brief:
too scientific, needs floating holographic glass panels not one corner box,
plain-English shell/valence/reactivity explanations for a curious
high-schooler, an easy continuous shell↔cloud crossfade, the two `labBack`
props gone, real materials, "make me go wow"). Built solo on his explicit
go ("just do something amazing... rock on") plus standing Meshy consent up
to 60cr for this session: new `content.js` (plain-English copy — element/
molecule overviews, shell-type explanations incl. the s/p/d/f spectroscopy
etymology, reactivity blurbs, swarm/fog/shells explainer); the six-panel HUD
described in the rendering notes above, replacing the 3-tab console;
`labBack` (the two equipment-rack/shelf props) deleted outright, no
replacement; real materials — vial glass is now `MeshPhysicalMaterial`
transmission glass, a procedural PMREM env map gives metal something to
reflect, and three Meshy-generated seamless tiles (~27cr) dress the metal
and glass. Both sims still green (129 + 404 — no physics touched, `content.js`
is copy-only). Verified in a live tab: no console errors, all assets 200,
DOM shows real per-element data (checked against oxygen's actual 2p⁴).
AWAITING JAMES'S EYES on the whole rebuild — panel layout/copy tone, the
crossfade feel, and the new materials are all first-pass judgment calls.
