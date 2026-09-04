# Snap! — world instructions

Read the elastic-space CLAUDE.md and `docs/building-a-world.md` first; this file holds
only what is specific to this world.

## START HERE

1. **Read `reimagine.md`** — the whole design record: the diagnosis of the Valence Lab
   (§1), the ten rolls and the pick (§2–3), the curriculum, guided-mode and UI briefs
   (§10–12), THE ELEVEN-STEP PLAN (§13, each step needs James's eyes before the next),
   the Design prompt (§14), and §15: THE PROSE REGISTER + the parked ideas.
2. **Where the plan stands (2026-09-04):** steps 1 (bench), 2 (table mini app), 3
   (toolbar + Molecules panel, all 24 lit + Shells panel) and 8 (Claude Design) are
   built. NEXT: step 4 — the data + the per-element tabbed card set — on his go. Then
   5–7 guided mode and the map, 9 the look onto the engine, 10 ship (part one done:
   the world folder), 10.5 the hold view, 11 tune by eye. Also his: bench editing
   (box-select, Delete, Ctrl-C/V/D, right-click menu — reliable via contextmenu
   preventDefault), THE SCOPE on the bench (the Valence Lab's visualizer over a
   molecule), the pullback. Each needs its own go.
3. Local URL: http://127.0.0.1:4174/src/worlds/snap/index.html (`?mute=1` opens muted).
   `tmp/snap/index.html` redirects here. The Design package (Claude Design's frames,
   spec README with the oklch tokens) is `tmp/snap/design/` — the look's source of truth.

## The prose register (protected — reimagine.md §15)

Every card, whisper, panel, ledger: standard American scientific prose at a tenth-grade
level. Direct, human, light, respectful. No story, no cute quotes, no coined shorthand
without the number behind it. State the rule the sentence depends on FIRST (the first
shell holds two, the next eight; an atom is stable when its outer shell is full), then
the specific case, then count the electrons out loud. James rejected the first cards as
"too precious and a bit too jargony"; the rewritten ones are the reference. Keep the
italic one-line facts on the cards (he likes those; he wants more later).

## Rules that stand

1. **Dark only.** The light theme was removed (James, 2026-09-03). Tokens in `snap.css`
   come from the Design README; oklch throughout, 2px radii, no blur.
2. **Type in the table is fit at runtime** (`fitType()` in app.js): one name size for
   all 118, the largest the widest name allows in one tile on one line, capped at
   14.5px (his 4K read: bigger "looks semibold"). Table type is Atkinson Hyperlegible
   Next (`--tiny`, banked in `fonts/`), everything else Instrument Serif / Instrument
   Sans / JetBrains Mono. Symbol and name share a baseline, centred in the tile.
3. **The table has three states and no in-between:** collapsed to the bar ("hide
   table"), the strip, the full table. Click the chevron bar. Linear ~120ms. The
   bench's bottom (`--strip-h`) follows the resting height, so collapsed = whole screen.
4. **Contrast is WCAG AA** (4.5:1) on every text tier including tinted tiles
   (`--tile-2nd`, `--tt` text tints at L 0.82). Measured, not eyeballed — see the
   Valence Lab changelog 2026-09-03 for the numbers. Keep it when adding text.
5. **Locked elements** (not on the bench: everything but the first 18 + Li/Be/B/Mg/Al/
   Si/P/S) show at opacity 60 / tint 70. Click a tile = land one atom, every click.
   Hover 600ms = the card. Drag = land at the drop point.
6. **Physics (engine.js):** shape forces may bend a molecule but never spin it — the
   angle springs' net torque is cancelled per molecule each substep and whole-body spin
   decays at ROT_DAMP 4/s (propane used to rotate forever). Labels: away from the
   molecule's centre with a 0.5R dead zone, 30° hysteresis, 10%/frame ease (the boron
   flicker). The ledger reads the outer shell against its room ("6 of 8 · wants 2").
7. **Zoom** steps through 50/75/100/125/150/175/200%; the dot matrix runs at 3/4 of the
   bench zoom (dots scale WITH zoom, cap 12% alpha) under the vignette mask.
8. **Molecules land apart:** every chord of the landing ring ≥ 1.4× the engine's
   attraction reach for that pair; repeats take the clearest of 15 placements.
   `molecules.js` is data: picture layouts (unit square), paragraphs, facts, landing
   lines. `shells.js` samples honest hydrogen-like |ψ|² for its orbital pictures.
9. **Sound** goes through the shared control (attached in app.js with `autoplay:false`;
   the rail mute and the speaker are one state). Never add a second toggle.
10. **Draft:** no drift exits, no registry entry, until ship. The registry generator
    includes drafts — restore `src/core/world-registry.js` if you regenerate.

## Files

`index.html` · `snap.css` (tokens + every panel) · `app.js` (bench, table, panels,
cards) · `engine.js` (the 2D bench: atoms, bonds, physics, labels, chords) ·
`elements.js` (118) · `facts.js` (en/melt/one-liners) · `molecules.js` (24) ·
`shells.js` (the Shells reader) · `fonts/` · `reimagine.md` · `changelog.md`.

## Relations

The Valence Lab (`src/worlds/the-valence-lab/`) stays alive: its coherence scope, the
RHF/UHF STO-3G Hartree-Fock bake, `orbitals.js`/`density.js`/`valence.js` and the sims
in `tmp/the-valence-lab/` are what the Scope-on-the-bench and the step-10.5 hold view
will reuse. Its changelog holds Snap's 2026-09-01→03 history.
