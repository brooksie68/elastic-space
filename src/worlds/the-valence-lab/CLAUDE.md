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

1. **Phase A — the atom bench** (BUILT 2026-07-24, draft, awaiting James's eyes):
   six vials (H, C, N, O, Ne, Ar), measurement-swarm electrons, valence readout.
2. **Phase B — bonding**: drag atoms into the scope together; valence engine
   (octet/duet accounting) decides what forms; curated molecule library with
   REAL precomputed electron densities (offline Hartree-Fock or equivalent in
   Node at authoring time — never fake the shapes); VSEPR geometry; energy
   release flash; noble-gas refusal with the correct reason. Target set:
   H₂, O₂, N₂, H₂O, CO₂, CH₄, NH₃, H₂O₂ (+ ethylene for Phase D).
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
2. **Any change to the physics runs the sim before it ships:**
   `node tmp/the-valence-lab/atom-sim.mjs` (129 assertions). Add assertions
   when adding physics; never delete one to make a change pass.
3. Every swarm dot must remain a true sample of |ψ|². The fog view reuses the
   same samples with different sprite params — it is a rendering mode, not a
   different distribution.
4. Honest footnotes stay: the nucleus-magnification note in the readout, and
   any future scale compromises get named in-world the same way.
5. Readout legend colors and swarm colors both come from `SUBSHELL_COLORS` in
   orbitals.js — never define shell colors in two places.

## Rendering / interaction notes

1. Draft status: no drift exits, no registry entry, no sound. These arrive at
   ship time only. Keep the world OUT of `world-registry.js` until then (the
   registry generator includes drafts — restore the registry if you regenerate).
2. Camera: slow damped orbit, wide default, idle auto-orbit after 6 s. James
   gets motion sick — never add snap moves or shake.
3. Tuner: localStorage key `valence-lab-tuner-v1`; build stamp in the panel
   header (bump it every session — it catches stale tabs).
4. Pixel ratio is capped at 2 (4K fill-rate discipline). The swarm is one
   additive Points draw; keep it that way — no per-dot meshes.
5. Raycasting hits invisible hitbox cylinders on the vials only — never
   raycast the points cloud.

## Where things stand

Phase A built 2026-07-24, all sims pass, awaiting James's first look. His eye
pass will drive tuning (expect ~10% adjustments, ship-a-default-then-iterate).
Nothing in Phase B is started — the molecular-density precompute pipeline is
the first thing to design there, and it needs a planning conversation first.
