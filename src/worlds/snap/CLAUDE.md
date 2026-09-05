# Snap! — world instructions

Read the elastic-space CLAUDE.md and `docs/building-a-world.md` first; this file holds
only what is specific to this world.

## START HERE

1. **Read `reimagine.md`** — the whole design record: the diagnosis of the Valence Lab
   (§1), the ten rolls and the pick (§2–3), the curriculum, guided-mode and UI briefs
   (§10–12), THE ELEVEN-STEP PLAN (§13, each step needs James's eyes before the next),
   the Design prompt (§14), and §15: THE PROSE REGISTER + the parked ideas.
2. **Where the plan stands (2026-09-04, night):** steps 1–6, 8 and 9 are built and
   judged (bench, table mini app, toolbar + Molecules + Shells panels, the element card
   set for all 118, guided mode's twelve chapters, buttonified tiles, the Design look).
   Step 7 is covered by the FREE | GUIDED toggle + contents panel (Collection and Map
   tabs dropped). AWAITING his read: chapters 7–12, right-click ions, copper. BENCH EDITING
   (rule 15) and 10.5 THE HOLD VIEW (rule 16) BUILT 2026-09-04 — HIS READ 2026-09-05: editing
   "all of that works"; hold view "looks cool... we'll need to add it everywhere"; chapters
   7–12 "totally fine for now" (a long tuning + copywriting thread is coming — he finds the
   AI register obtuse; "the quality of the whole framework is great"). THE SHIP LIST (his
   order: not one step, seven items, each its own go — (1) DRIFT EXITS DEFERRED 2026-09-05, "plenty of stuff to work on before we worry about that"), (2) registry entry
   (restore the other drafts), (3) sound check — silent open, chords after first click,
   (4) the file:// pass, (5) `npm run check-worlds`, (6) changelog + CLAUDE.md ship entries,
   (7) he moves the admin row to Completed and removes "unwired". THE SCOPE BUILT 2026-09-05
   (rule 17), awaiting his eyes; the Valence Lab archived on his word. ALSO QUEUED: THE HOLD VIEW
   EVERYWHERE — run the Valence Lab's HF solver (tmp/the-valence-lab/hf/) on the rest of the
   24 molecules and the single atoms, in batches, and extend assets/molecules-data.js;
   trophies on the Molecules panel; THE SCOPE on the bench; the pullback; the copy + tuning
   thread. Tuning by eye is not a step, it is how every step is done.
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
   flicker). The ledger is two lines and names every shell: "SHELL 1 FULL · SHELL 2: 6 OF
   8" then "WANTS 2" (James, 2026-09-04: "2 · 1 of 8" was too obscure — the point is that
   the reader keeps seeing which shell is the outer one).
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
11. **Buttonified tiles (James, 2026-09-04, approved "looks great"):** every tile is two
    buttons. The symbol button is ONE fixed width for all 118 (`--sw2`, the widest
    two-letter symbol at the current type size + 6px each side, set in `fitType()`);
    the divider is the tint at oklch L 0.40 (`--td`) with a 1px L 0.08 shadow line to
    its right (`--td2`) — darker than the border, never brighter. Hover lights each half
    on its own (inset ring `--th`); the outer border does NOT go white. Hover anywhere on
    the tile = the card after 600ms. Symbol click = `openElement`, name click = land,
    drag from either half = land at the drop.
12. **The element panel** (`.panel.elem`, step 4): four tabs. All 118 have hand-written
    content in `content.js` (register §15): the 18 bench elements get Overview + In the
    world + three lines + numbers; the other 100 get In the world + one line + numbers
    (Overview and Shells generated). Numbers rows without data are absent, never dashes. Three one-liners per element go to Overview / Shells / In the world. The
    Shells tab shares `SnapShells.buildLadderInto` / `lightLadder` with the Shells panel.
13. **Guided mode** (`guide.js`, step 5): chapters are DATA — text, `show` (a SNAP_MINI
    pic drawn as the close-up), `light` (tiles), `hand` (atoms landed apart, below the
    close-up; `row:true` = landRow), `wait` (`made:KEY`, `made:KEY×N`, `refuse`,
    `break`, or none) + `hint` (the arrow's caption while waiting). The engine reports
    through `sc.onMade` / `sc.onRefuse` / `sc.onBreak`. A chapter starts on a cleared
    bench and ends by badging its `tiles`. State persists in localStorage `snap-guide`.
    Waits also: `ion:SYM` (right-click made that ion) and `metal:N` (a copper block of N).
    RIGHT-CLICK on a lone atom = `E.ionize` (givers/H/Cu/C lose an electron, N–Cl gain;
    again = neutral). COPPER is kind `metal`: no hands, bonds only to copper (≤6 each),
    metallic bonds draw the electron sea, break under heat like singles. Benzene IS a
    hands-on target since the bonding rework (rule 14).
    Copy register: calm, brief, rule first — James: "don't get too cutesy." Every engine
    whisper is in the same register now; never bring back the mock's hands-and-rings
    voice. MODES: the rail toggle GUIDED | FREE is the one switch (no other way in or
    out); the chip beside it shows the position and opens the CONTENTS panel — a table of
    contents, NOT a gate: every step is a click away, reached steps (`state.reached`) are
    highlighted, `goTo` lands the chapter's earlier hands first. Every step has an
    address `#chN-M`; a link opens straight into the guide there. Progress is
    localStorage only (`snap-guide`); no server, no accounts — never build one here. The rail's mode
    note is hidden (`.mode{display:none}`) until James decides about notes.

14. **Bonds by hand (2026-09-04, James's nod):** first contact is always a SINGLE bond; drag one
    atom onto its bonded partner — the cursor has to back off half a radius from its closest
    approach and come inside 0.9 R (a reversal; one continuous shove that overshoots the contact
    never counts) — and they share another pair. Never a double on contact. While dragging, the rest of the
    molecule holds still in proportion to bond distance (`K_HOLD`), so chains bend. Slots re-pick
    every 0.2 s for every atom; chain atoms zigzag at 120° and heavy neighbours take the wide
    slots counter-clockwise. No three- or four-rings (atoms under five bonds apart along a
    molecule ignore each other); atoms within three bonds pass through one another. Five- and
    six-rings are first-class: `findRings` + a regular-polygon shape spring (`K_RING`). Any change
    here runs `node tmp/snap/bond-sim.mjs` (KEEP) — 36 assertions incl. six seeded ring closures.
15. **Bench editing (2026-09-04):** drag on empty bench = box-select (Shift adds), Shift-click
    toggles one atom, click on empty bench clears; Delete/Backspace, Ctrl-C/V/D, Ctrl-A, Escape;
    right-click = the menu (`#menu`, `showMenu` in app.js) — the ion line first on an atom, then
    copy/duplicate/delete (for the selection if you clicked inside it), paste / select all / clear
    on empty bench. Right-click never ionizes directly any more; chapter 7 says "choose lose an
    electron". Camera pan is Shift-drag or middle-drag. Copies go through `E.snapshot` /
    `E.restore` (bonds re-linked at their order; ionic pairs re-hand the electron), placed by
    `clearSpot` (50px from everything, below the guide strip). Selection ring + marquee are drawn
    by the engine (`drawSelection`).
16. **The hold view (2026-09-04, step 10.5):** holding = veil (bg at 88%) + the electron cloud.
    `cloud.js` draws the REAL Hartree-Fock density for the nine baked molecules
    (`assets/molecules-data.js`, a copy of the Valence Lab's bake — regenerate there, copy here):
    column density in the molecule's own plane, log ramp, halo + sharp pass with added light,
    fitted onto the held atoms by the best similarity transform over symbol-consistent pairings;
    everything else gets the mock's five-disc layered glow. The ramp lives in cloud.js constants
    (K0/CMAX/AMAX/TW/GA/HALO/HALOA) and is judged in `tmp/snap/hold-lab.html` (KEEP) — change it
    there first, then copy the numbers. Images cache in localStorage (`snap-cloud-v3`; bump the
    key when the grid or ramp changes). Under file:// the import fails quietly → fallback glow.
17. **The Scope (2026-09-05, his five calls):** `scope.js`, an ES module imported on demand
    (three.js from `lib/three/`); opens from the rail tab SCOPE on the selection's molecule and
    from the right-click menu on that atom; refuses by name what it cannot read (elements past
    argon, molecules not in the bake). Physics modules `orbitals.js` (all eighteen) and
    `density.js` are Snap's own copies of the lab's — never reshape a distribution. Dials
    cloud / shells / nucleus persist in `snap-scope`. Escape / close / veil click closes.
    The Valence Lab is ARCHIVED (`archive/the-valence-lab/`); its solver + sims live on in
    `tmp/the-valence-lab/` for the hold-view-everywhere batch.

## Files

`index.html` · `snap.css` (tokens + every panel) · `app.js` (bench, table, panels,
cards) · `engine.js` (the 2D bench: atoms, bonds, physics, labels, chords) ·
`elements.js` (118) · `facts.js` (en/melt/one-liners) · `content.js` (all 118 element
cards) · `molecules.js` (24) ·
`shells.js` (the Shells reader) · `guide.js` (guided mode: the chapters as data + the
guide) · `cloud.js` (the hold view's real density) · `scope.js` (the Scope lens, 3-D) ·
`orbitals.js` + `density.js` (the physics, from the lab) · `assets/molecules-data.js` (the HF
bake) · `fonts/` · `reimagine.md` · `changelog.md`.

## Relations

The Valence Lab was ARCHIVED 2026-09-05 (`archive/the-valence-lab/`) once its scope came
to the bench (rule 17). Its RHF/UHF STO-3G Hartree-Fock solver and sims stay in
`tmp/the-valence-lab/` (the sims import from the old world path — repoint before use).
Its changelog holds Snap's 2026-09-01→03 history.
