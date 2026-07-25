# The Valence Lab — changelog

Newest entries first.

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
