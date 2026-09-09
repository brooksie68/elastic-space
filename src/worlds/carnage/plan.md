# Carnage — one-shot plan (written 2026-09-08 as Rampage; named Carnage and the
# calls answered the same day — see "His calls" at the end)
# BUILT 2026-09-08, the same night, on the brief below. The record of what landed is changelog.md.

Reference family: the Retro arcade (Surround, Moon Battle 2075, the Asteroids
plan, this). Same architecture: pure core + sim, three.js renderer, shell with
attract gate + configuration panel + file-backed presets, silent look-dev page,
sound-stubbed smoke page. Faithful 1986 Bally Midway rules; the look is 2026.

THE ONE CONSTRAINT (what makes it Rampage): a flat side-on city, buildings as a
grid of window cells, you climb them and punch them down, and everything that
matters happens in that grid. Everything else is 2026.

## THE BRIEF, 2026-09-08 evening (James, answering the calls) — this amends everything below
1. "Variety is good" — the flavour dial is ON, with a noticeable spread (call #1 answered).
2. Companions: none / one / both on the start card (call #3 answered). There will be a small
   CAMPAIGN (details TBD, his) and a FREE MODE. FREE MODE FIRST "so we can try things".
3. IMPORTANT: "just like the other games we're not here to 100% copy Rampage. we have much
   more processing power and graphical options than when Rampage was made. keep it retro but
   put the time in for some good looking and detailed building damage and creatures and
   backgrounds. a cool HUD. a PG-13 vibe, cynical and funny."
4. A DAMAGE LAB "so we can work out and refine the things that monsters do" (the Weapon
   Lab pattern: one street, every verb on a button, the notes loop to Claude).
5. The time period is RIGHT NOW, 2026: the city, the people, the things in the windows, the
   things that shoot at you — all 2026, not 1986.
6. His words on the build: "take your time and check your own work throughout. let's see
   something worthy of Claude."
Name: CARNAGE. No Suno for now. Meshy: go, hard cap 550. Nothing saved between visits.

## Files
src/worlds/carnage/ index.html, game-core.js, city.js (pure: city deals from a
seed), render3d.js, game.js, world.json (draft), CLAUDE.md, changelog.md,
assets/presets.json, assets/models/ (Meshy), assets/tiles/ (Meshy),
assets/audio/ (ElevenLabs one-shots), assets/cities.js (the day list).
tmp/carnage/ sim.mjs, lookdev.html, make-smoke.mjs -> smoke.html, meshy/ (the
pipeline scripts, Jabberwocky's pattern). Admin row under In progress +
"unwired". Registry NOT run until ship. World Ideas #66.

## Faithful rules (core, sim-tested, deterministic seeded rng)
1. Three monsters, pick one on the start card — THE MASCOTS (James,
   2026-09-08, "love this idea"): a giant CLOWN in red and yellow, a giant
   pigtailed GIRL in a blue dress, a giant KING with the frozen plastic grin.
   Code slugs stay george / lizzie / ralph; display names are his to pick.
   Cabinet-equal stats by default; a per-monster flavour dial (the clown
   hits harder, the girl climbs faster, the king runs faster, each ~10%)
   ships ON but small.
1b. Every city street has one restaurant of each of the three. Punching a
   rival's down pays a bonus; your own pays nothing, and the companions go
   for yours first.
2. The grid: a city is a row of buildings, each C columns x F floors of cells
   (window / wall / neon sign / roof). The monster occupies one column, moves
   left/right on the street, climbs any building face, moves up/down/sideways
   on the face, jumps, and punches the cell in front (or above/below on a face).
3. Punching: a window cell breaks in one punch, a wall cell in two. Broken
   cells stay broken. A building whose broken share passes its threshold
   (bigger buildings need more, ~55-65%) COLLAPSES: it drops floor by floor,
   anyone on it falls. The day ends when every building is down; a beat, the
   tally, the map, the next day.
4. Falling: a fall from higher than two floors costs health (more per floor,
   dial). Climbing down is free. Collapse falls always hurt.
5. Health: one bar. Damage from rifle bullets (small), tank shells (medium),
   helicopter fire (small, fast), dynamite / toaster / live appliance / lit
   neon / lightning (medium-large), other monsters' punches, falls. Eating
   restores (people most, food some). At zero: THE REVERT — the monster
   shrinks to a tired teenager in the same uniform (badge, visor) who walks
   off the edge to clock out; a companion monster can eat him for points
   (the cabinet's naked-human beat, recast). That costs one life; the next
   life re-enters at full health on the same day (the flies-in beat). Three
   lives, an extra at a score gate. Score keeps across lives (his call #2,
   answered 2026-09-08: kept; the cabinet zeroed it on a continue).
6. Windows deal from a seeded table when broken: empty, a PERSON — a
   customer (grab = eat, 500; a waver builds points while you hold the
   cell), FOOD on-brand (fries, a shake, nuggets, a square patty, a paper
   crown, toast when it pops), MONEY (points), and HAZARDS — lit
   dynamite, a toaster (hurts until the toast pops, then it's food), a live
   appliance (shock), a cigarette, a cactus, poison, and the PHOTOGRAPHER (eat
   him inside ~1.5 s or the flash knocks you off the building). The deal
   weights shift by day (more hazards later).
7. Neon signs on building sides: 1000 when punched OFF, a shock when punched
   ON; they blink on a schedule.
8. Ground + air: SOLDIERS (walk in, kneel, fire; 50, punched or eaten; some
   appear IN windows and fire from there), TANKS (roll in, shell you; 200,
   punched from the street), HELICOPTERS (hover at your height and fire; 750,
   punched when adjacent — the classic swipe), POLICE CARS and TAXIS (drive
   through; punch for points), a TROLLEY on days with track, a BOAT on
   waterfront days. Spawn cadence rises with the day; a lull while a
   building collapses. The points table is transcribed from the cabinet at
   build (the ones above are confirmed; the rest are checked, not guessed).
9. The days: 128 named cities from the cabinet's list (Peoria first; the
   Plano MEGA VITAMIN day heals + bonus), then it cycles. A US map between
   days with the route drawn city to city. Day/night alternates by city.
10. Companion monsters: the other two as CPU wreckers (dial 0-2, default 1):
    they climb, punch, eat, punch YOU if you're adjacent (and you them), and
    revert like you do. Simple, honest, sim-tested; never smarter than a
    wrecker needs to be. No two-human play in this shot (his call #3).
11. High score for the session only — NOTHING SAVED between visits (James,
    2026-09-08: "there's not going to be any saving long term"). No DOM/
    timers/Math.random in the core.

## The 2026 look (renderer only)
1. A real 3-D city seen from a fixed side camera, slightly raised, slight
   lens: buildings are true blocks with depth, a second row of dimmer
   buildings behind, a lit skyline far back, a street with depth in front.
   The camera tracks the monster's column with a long ease; no shake beyond
   a short low thud on a collapse (memory: camera restraint).
2. Cells are real: windows are glass with rooms lit behind them (a warm room,
   a blue TV room, dark), curtains, air conditioners; punched cells become a
   ragged hole with rebar, sill dust, a hanging blind; Meshy seamless tiles
   for brick / concrete / glass / steel, three building families per city,
   seeded wear. NOTHING SHIPS BARE.
3. Collapse is the set piece: floors pancake with real debris chunks
   (physics, ~60 pieces, pooled), a dust cloud that rolls down the street and
   lingers, glass sheeting off, neon dying in a flicker, car alarms.
4. Monsters as Meshy rigged models with clips (idle, walk, climb, punch L/R,
   eat, hit, fall, the revert). Generated from DESCRIPTIONS (a clown, a
   pigtailed girl, a plastic-masked king — never a brand name); all bipeds,
   so Meshy's humanoid rigger is the normal path (Jabberwocky pipeline:
   Meshy -> Blender clip bake -> GLB). The uniformed teenager is a fourth,
   tiny rigged model. Three restaurant fronts as Meshy statics (~90 cr more).
5. Vehicles, helicopter, soldiers as Meshy models (soldier rigged: walk,
   kneel-fire, eaten). Helicopter rotor blur, tank turret tracks you, police
   lights. Window occupants are small lit sprites inside the room.
6. HUD: a contemporary DOM/SVG glass strip on top — the three monster
   portraits with health bars (companions included), score, day + city,
   lives as small monster glyphs. Between days: the map card, the city name
   in big type, the route line animating.
7. Sound: ElevenLabs one-shots (three VOICE SETS instead of roars — the
   clown laughs, the girl is sweet and murderous, the king never says a word
   and just stares; punch hits, glass, the crumble,
   the scream, soldier bark, heli, tank shot, the revert whimper) + synthesis
   for the continuous (rotor, dust roll, neon hum, car alarms). No Suno track
   for now (his call #4, 2026-09-08); if one comes later it plays at 0.22
   like Jabberwocky's.

## Shell
1. Attract gate: never runs alone; START card (monster pick + companions);
   game over returns to it.
2. Keys: A/D or arrows move, W/S or up/down climb, Space jump, J or click
   punch (a punch also eats when a person is in the cell — cabinet-true),
   P/Esc pause (auto-pause on blur), R restart (two-step), C configuration.
3. Configuration PLAY (collapse threshold, fall damage, deal weights, spawn
   cadence, monster flavour, companions, photographer window, life count) +
   LOOK (glow, dust, debris count, room light mix, res cap, tile wear);
   text-size control; click-away; presets via PUT /api/worlds/carnage/presets.
4. Exits (data-drift, played through, never labelled): the SUBWAY entrance
   on some streets (walk in); a window whose room is not a room — a corridor
   of light (punch it open, climb in); the blimp towing a banner across every
   few days (jump to it from a roof); a static smear on the far skyline
   (Surround's stray-star register: colour, never bright, never moves).

## Meshy spend (stated and confirmed before any call)
Three monsters (text-to-3D + refine + rig + ~6 clips) ~55 cr each; the naked
human ~30; soldier rigged ~40; tank, helicopter, police car, taxi, trolley
~30 each as statics; three restaurant fronts ~90; ~12 seamless tiles ~36.
Roughly 540 cr total. APPROVED 2026-09-08 with a HARD CAP OF 550 CREDITS:
stop and tell James before any call that would take the running total past
550 (his balance 3,100 at his count). Balance before/after in the wrap.

## Verification before hand-over
1. Sim green (grid moves, climb faces, punch / break / collapse thresholds by
   size, falls, health + every damage source, every window deal incl. the
   toaster flip + the photographer timer, neon on/off, every enemy behaviour
   + points, revert + lives, day advance + the Plano day, companions punch
   and revert, exits reachable, an autopilot that clears day 1, determinism).
2. Look-dev sheets through dev-snapshot: attract, mid-climb, a punched window
   with a room, a collapse mid-fall + dust, a helicopter swipe, the revert
   walk-off, a night city, the map card, each exit.
3. Smoke page pumped through a whole life. npm run check-worlds clean.

## His calls (answered 2026-09-08 unless marked OPEN)
1. The flavour dial — ANSWERED: "variety is good." On, default 60% of the
   spread (the clown hits harder, the girl climbs faster, the king runs
   faster), the Variety dial in configuration → PLAY.
2. Score kept across lives — KEPT. And nothing is saved between visits.
3. Companions — ANSWERED: none / one / both on the start card (ALONE · ONE
   RIVAL · BOTH RIVALS). A small campaign later (his); FREE MODE first, built.
4. Suno track — NO for now ("I'll deal with it later if we want one").
5. Meshy spend ~540 cr — GO, HARD CAP 550: stop and tell him before any
   call that would pass it.
6. The name — CARNAGE.
