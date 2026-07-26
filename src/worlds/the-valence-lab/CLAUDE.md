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
3. **Phase C — the scale journey**: staged chapters (James chose chapters over
   continuous zoom), narrated — Claude writes scripts, James produces the voice
   audio (he wants to drive sample generation). One water molecule → hydrogen
   bonding → cluster → droplet-as-field. Temperature slider (ice ↔ steam).
4. **Phase D — showcases**: elephant toothpaste (H₂O₂ decomposition),
   polymerization (ethylene → polyethylene).

## The honesty contract (protected)

1. `orbitals.js` is the physics: hydrogen-like orbitals with Slater-rule Zeff,
   inverse-CDF radial sampling, exact cos²α angular sampling for p orbitals,
   Hund occupancy. It is pure ESM with zero imports and is shared verbatim by
   the verification sim. Never let rendering concerns leak into it, and never
   "art-direct" a distribution — display scaling lives in world.js only.
2. **Any change to the physics runs the sims before it ships:**
   `node tmp/the-valence-lab/atom-sim.mjs` (129 assertions) and
   `node tmp/the-valence-lab/molecule-sim.mjs` (324 assertions: solver vs
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

## Rendering / interaction notes

1. Draft status: no drift exits, no registry entry, no sound. These arrive at
   ship time only. Keep the world OUT of `world-registry.js` until then (the
   registry generator includes drafts — restore the registry if you regenerate).
2. Camera: slow damped orbit, wide default, idle auto-orbit after 6 s. James
   gets motion sick — never add snap moves or shake.
3. Controls: since v3 there is NO ⚙ tuner — every lever lives in the right
   panel's scope console, "controls" tab, grouped by science (the cloud /
   the shells / the scope). James's framing: "it's not a config, it's the
   scope controls." Persistence is still localStorage key
   `valence-lab-tuner-v1`; the build stamp sits at the bottom of the
   controls tab (bump it every session — it catches stale tabs). The
   "recipes" tab is the recipe book: every entry shows its TRAP-SAFE feeding
   order (`path` in valence.js, asserted in molecule-sim). PROTECTED INTENT
   (James, v3.1): recipes are for reading — visitors should build at the
   vials themselves. Auto-brew (`brewRecipe`/`brewTick`) is deliberately a
   small "run ▸" tag on each card, never the card itself and never the
   primary action; don't enlarge it.
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

## Where things stand

Phase B built 2026-07-25 (one session after James's go + three calls:
instant bonding, unmistakable refusals, ~10% ghost shells). Both sims green
(129 + 324 assertions). Awaiting James's eyes on: bond flash strength, ghost
opacity default, staged-atom spacing, refusal copy. Expect ten-percent
tuning. Phase C (narrated scale journey) and D (showcases) still need their
own planning conversations and gos. Still draft: no drift exits, no registry
entry, no sound.
