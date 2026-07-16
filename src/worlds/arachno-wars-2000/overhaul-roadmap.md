# Arachno-Wars 2000 — Overhaul Roadmap

The "killer Claude overhaul" backlog, agreed 2026-07-14. Numbering matches the original pitch
so James can say "do 12 next." Status: `shipped` / `in progress` / `backlog`.

## Camera

1. **Dynamic camera** — zoom toward active tank while aiming, follow the shell in flight,
   punch-in on impact, ease back out. — `shipped 2026-07-14 (round 1)`
2. **Impact juice** — screen shake scaled to blast radius, white flash frames, slow-mo +
   zoom drift on the killing blow. — `shipped 2026-07-14 (round 1)`

## Light and atmosphere

3. **Explosions as light sources** — radial flashes tint terrain and rim-light tanks;
   muzzle flash lights the legs. — `shipped 2026-07-14 (round 1)`
4. **Live sky / day-night arc** — dusk slides to night over ~15 turns; starfield sky variant,
   cockpit glow + headlight cones. Needs a night sky plate per biome (GPT prompt exists —
   ask for a night variant of the biome's sky). — `backlog`
5. **Lingering aftermath** — crater smoke columns, drifting embers, dirt clods with real
   arcs/bounces, heat shimmer over fresh craters. — `backlog`

## HUD

6. **Diegetic HUD** — kill the 100px bar: power ring at the muzzle, ghost-arc for the first
   ~20% of trajectory, move budget on the ground, sky freed up. — `shipped 2026-07-14 (round 1)`
7. **HP as armor** — segmented chitin plates on the hulls that crack and flake off; floating
   damage ticks instead of a numeric readout. — `in progress (round 1, plates as arc segments;
   true per-hull plate art waits for #10)`
8. **Typography** — heavy condensed display face for kinetic turn banners, clean UI face for
   numbers. Round 1 ships a Bahnschrift/Arial-Narrow system stack; James picks the final face. —
   `shipped 2026-07-14 (round 1)`
9. **Radial weapon wheel** — Q/right-click wheel with weapon art and flavor text; keys 1-6
   stay. — `backlog`

## Models

10. **Per-part tank re-render** — Blender layers (hull / dome / barrel), leg IK so feet plant
    on slopes, recoil kick, idle breathing, 3 damage-state hull textures. Layered-sprite
    pipeline already validated on the pool denizens.
    **James's design brief (2026-07-15):** circa-2500 autonomous war machine — low-slung and
    WIDE, like a tarantula; evil-looking; black. Hull hangs low between tall leg arches,
    never above the knees. Barrel: long and thin with a slight bulge at the muzzle end,
    mounted in a round ball on top of the mid-hull — wide range of motion, never below the
    hull plane. Small on screen but detail-dense: "very deadly machines seen from a distance
    back, but you still have good detail." Reference: his in-game beam screenshot,
    2026-07-15 chat. — `shipped 2026-07-15 (build-tank-2500.py: black carbon hull+ball /
    barrel layers, 3 damage states, per-team accent glow; recoil flinch, idle breathing,
    world-space leg IK — awaiting James's art pass on the renders)`
11. **Real spiderling sprites** — rendered scuttle-cycle sheets replacing the stick-figure
    draw. — `backlog`

## Gameplay

12. **Visible wind** — drifting dust motes + thermal columns that alter trajectories;
    weather as depth. — `backlog`
13. **Blimp supply drops** — crate every few turns (rare ammo / HP / shield); shooting the
    crate mid-air claims it. — `backlog`
14. **AI personalities** — Sniper / Broodmother / Engineer: portraits, ElevenLabs voice
    lines, weapon-weight tactics on the existing solver. — `backlog`
15. **Sudden death** — venom mist rises from the canyon floor after ~20 turns. — `backlog`
16. **Two new weapons** — web net (skips enemy move phase) and grapple silk (swing your own
    tank across a gap). — `backlog`

## Background

17. **Parallax biome layers** — sky/far/mid painted plates behind the procedural terrain.
    Twilight canyon set delivered by James (GPT-generated) 2026-07-14 and wired in round 1.
    Chroma pipeline: `assets/worlds/<biome>/{sky,far-source,mid-source}.png` →
    `tmp/arachno-wars-2000/chroma-key.py` (headless Blender) → runtime `far.png`/`mid.png`.
    2026-07-15: all four biomes in (snowy pass, volcanic wastes, the bog + twilight),
    random arena per match (never twice in a row), per-biome terrain/rock/flora palettes
    (`BIOMES` in game.js), arena name announced on the coin toss. Adding a biome = drop a
    layer folder, rerun chroma-key.py, add a `BIOMES` entry. — `shipped 2026-07-15`

18a. *(See also `spider-vision.md` — James's full north-star vision, 2026-07-15, with his
    three Procreate references in `assets/reference/`. Items #10, #16, #18, #19 are its
    stepping stones.)*

18. **Climbing arenas ("in a perfect world")** — James, 2026-07-15: levels with overhangs,
    C-shaped rock croppings, crevices, and cliffs at the top; tanks climb up, down, and
    around the formations and duel with beam weapons for height advantage.
    **Mockup (James, 2026-07-15 chat, second image):** a giant C-shaped rock pocket in
    dark maroon stone, open to bright sky on the right. One tank fully INVERTED on the
    ceiling, one clinging vertically to the inner wall — orientation is free, legs grip
    any surface normal. Both fire level hitscan beams: beams are the climbing-duel weapon
    (ballistics go strange when inverted; hitscan makes grip position the tactic). Tanks
    small against the arena scale. Drift exits could live out the sky opening.
    Requires replacing the heightfield terrain (one height per x-column — can't express
    an overhang) with polygon/marching-squares terrain plus a climbing gait + surface-
    normal orientation for the legs. Big lift: design doc first, then its own round.
    Pairs naturally with #10 (leg IK) and #16 (grapple silk). — `backlog`

19. **Whip-leg motion language** — the highest-leverage stepping stone toward
    `spider-vision.md`, buildable in this game now, pure presentation. Replace the
    sinusoid gait with the carbon-metal motion from Spider_Tank_2.png: each leg moves
    slowly through its reach arc, then the tip WHIPS out and stabs in; needle-pointed
    tips; slight anticipation curl before the whip. Applies to walk gait, landing after
    jumps, and idle micro-motion (occasional single-leg re-grips). Spiderlings inherit a
    cheap version. — `shipped 2026-07-15 (world-space 2-bone IK legs, terrain-planted
    feet, whipCurve reach→snap on walk/landing/idle/crater re-grips; menu tanks and
    spiderlings included — tuning values await James's play-test)`

## Explicitly out of scope

Multiplayer netcode, engine swap (that's arachno-wars-two's territory), mobile controls.
