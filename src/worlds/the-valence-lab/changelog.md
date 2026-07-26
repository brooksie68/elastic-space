# The Valence Lab — changelog

Newest entries first.

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
