# Moon Battle 2075 — the tank half — changelog

Newest entries first. Never rewrite or delete earlier entries. The lander
half's changelog is one folder up.

## 2026-09-08 — Claude — the reload replaces one-in-the-air

James: "is it still doing that thing where it can only have one projectile
in the air?" Yes; his go on the fix: a 0.8 s reload (`SHELL.reload`) and any
number of shells in flight (`state.shells`), so fire can be walked onto a
target. READY / LOADING with a reload bar on the console. Sim TEST 4
rewritten (223 green). Then "double up the frequency of the grid lines, it's
still too much black": `gridPitch` 200 → 100 ft. AWAITING his next drive:
the start, the crosshair as the aim, the reload, the grid at 100.

## 2026-09-07 (later) — Claude — THE MOUSE AIMS + the look pass, items 1, 2, 6, 7

James, after the rename: the tank "is not working at all for me... where I
steer the tank is the aiming left, right, and the mouse is up and down. It's
so goofy and hard to use... the whole thing feels incredibly dated." He took
the plan (the 2026 scheme + items 1, 2, 6, 7 of the nine; "lose 8"). One
session owns both halves from here on. Built:

- THE CONTROLS: the mouse aims under pointer lock (view instant, any way
  round); the gun follows with mass (core `TURRET`, a diamond reticle
  sliding onto the crosshair); W S A D drive the hull on its own heading; a
  hull glyph on the compass tape; Z scope; a sensitivity dial. Sim TEST 11.
- THE LOOK: contours (coarse, hills only — a fine step drew stripes, because
  the lander's profile is walls along z), crater rims + rays, rock fields,
  the ticked trail; line weight + whiteness by distance in the depth shader;
  the Earth, the horizon glow, three ridge depths with real parallax (rings
  anchored at the stretch); the compass tape, the projected range, the
  scope, recoil as a glow pulse. HIS FIRST DRIVE: "W and S are reversed!" —
  driving was hull-relative; now W goes where you look (the hull swings
  onto the view while driving, S backs away from it). A 22 ft swell across the flight line in
  the core's ground. Fourteen new LOOK dials. Look-dev page rebuilt for the
  scheme. A LANDER button back to the lander page.
- HIS FIRST DRIVE, three notes, all done: (1) "why do you keep starting me
  in the freaking valley with everybody on top of me?" — the start is now the
  highest clear ground in the stretch's first 1,500 ft with no hostile
  structure within 1,300 ft, waves spawn 1,900–2,800 ft out (was 1,300–2,200),
  grace 7 s (was 4); `startSpot` in the core, sim-guarded over 120 starts.
  (2) "I can't tell what the hell's going on with the aiming" — the barrel
  drawing ("a circle with two lines") is OFF (`gunBright` 0), the gun tracks
  the crosshair in a breath (TURRET 6.5 rad/s, gain 14), and the crosshair
  is the whole story: dim while the gun catches up, solid when laid, AMBER
  with a centre dot over a hostile (fire), dashed over a civilian; the
  NAME + X tag follows the gun, not the view. (3) "massively flat and
  black... feels like nothing's there" — a faint wide grid is back under
  everything (`gridBright` 0.11 at 200 ft), contours and craters on top.
- Sim 97 green. Judged in the look-dev pane (four rounds: the haze copies
  were stripes at 28 ft lifts — now 5/11/18 ft; rocks halved; contours
  restricted to real rises, then coarsened). AWAITING JAMES: the feel of
  the mouse + the lag, the plains (black with craters and rocks — too
  empty?), the tape, the scope.

## 2026-09-07 — Claude (LANDER session, name strings only)

James renamed the game **Moon Battle 2075**. The lander session replaced the
name in `tank.html` (title, card word) and the three file headers and the
CLAUDE.md heading — nothing else in this folder was touched. The lander's
start card now opens `tank.html` under FREE MODE → TANKS; see the note at
the end of `../tank-brief.md` (a way back to the lander page is wanted).

## 2026-09-06 (his first look) — Claude (tank session) — THE DIRECTION

James looked: nostalgic ("I played Battlezone a lot"), "a good start", "a
ways to go" — and the overriding note, now at the top of CLAUDE.md: NOT a
Battlezone clone; the jumping-off point for a nostalgic feel with 2026
affordances; the first build was "the most simplest basic wireframe"; impress
him. The nine-item look pass is recorded there and is the next session's
first work, in the look-dev page before anything else. Nothing built.

## 2026-09-06 (later) — Claude (tank session) — round two matched

The lander session sent its round-two presentation values by message and
answered NEEDS.md (revolved forms for dome / tanks / core / depot are in
`solid()` now; `LunarCore.hitStructure` is the one rule for structure
damage). Matched here, nothing else touched:

1. The hostile under the crosshair draws at 1.25 (the lander's hover value),
   enemies too; the DOM tag is the lander's amber exactly (#ffb457, 0.78rem,
   700, 0.2em, the glow) — NAME + X, one word under (OVERHANG / RIDGE / DOOR /
   SHIELD), DOOR SHUT in pink #ff8fa3 as the refusal. Civilians: nothing.
   The select bracket is the lander's alone — the tank aims, it does not
   select.
2. Rubble is the lander's `_rubble` recipe stroke for stroke (same rng seed,
   same draws), keyed by sid, so a building killed from the ground looks the
   same from the air.
3. Structure damage goes through `LunarCore.hitStructure` (the tank gates
   civilians and the shut door, reads `alive` back from the lander's object,
   keeps its own score tally). `damageStructure` / `damageEnemy` exported;
   the look-dev KILL NEAREST uses them. Readout contacts carry sid / id /
   name / mult / hard / doorShut for the tag.

Sim 78 green; the game page verified silent in the pane: a SAM killed through
the shared rule flips on both sides, both tallies read 200.

## 2026-09-06 — Claude (tank session) — THE TANK, first build

James's brief: "like Battle Zone!" First person, full 3-D (turn, look up and
down, drive), NOT a CRT recreation — "the 2026 version of those graphics";
the structures the lander flew over stand here as 3-D versions of the same
wire drawings; enemy tanks built here may go by in the lander's side view.
His calls: slow tank + medium tank + SAM site for now; the arcade shell (one
in the air) plus a laser blast; a hull that absorbs two hits and dies on the
third; five missions and a boss mission. And his standing order: both halves
must feel like ONE game — this session opened a channel to the lander
session first and matched what it answered (the look constants, `solid(id)`
in structures.js as the one 3-D model both games draw, the console CSS
verbatim).

Built, on his go ("Go! weeeee"):

1. `tank-core.js` — pure, seeded, 1/120 s, reading the lander's moon through
   `LunarCore`: the ground softened for wheels (the flight profile averaged
   over ±200 ft and compressed through tanh 80, cached per chunk; hashed
   relief in z; every structure's footprint dead flat at its level, blended
   over 40 ft); the tank (62 ft/s, an eased turn, look ±0.42/−0.22 rad,
   slopes slow it, structures solid); the shell (520 ft/s, lunar gravity, one
   in the air, leaves along the look pitch); the laser (1400 ft line, one
   charge, 6 s); the hull (two hits, the third kills, three tanks); enemies
   (slow / medium / the siege tank for the boss) that approach, circle, STOP
   to aim and fire, avoid buildings, reposition when a building blocks their
   line; SAM sites and the bunker's roof SAM firing homing ground missiles
   (the bunker's door opens two seconds when it fires — the only time a
   shell hurts it; the core's shield takes two); civilians never targetable,
   absorb shots, pay nothing; scoring 100 × X; six missions as data (a chunk
   stretch + waves; complete when every hostile structure and every wave is
   dead); readouts for the console (radar contacts with bearing / range /
   dy, in range, hull, gun, heading, speed).
2. `tmp/lunar-lander/tank-sim.mjs` — 78 assertions in ten tests, all green:
   determinism + the shared moon, the ground (max grade, no steps, flats),
   driving, the shell, the laser (never a civilian, downs a missile), the
   hull + lives + respawn, enemies (they come, fire, avoid, hurt), SAM sites
   + the bunker door, missions (waves, completion, the boss; an autopilot
   that clears mission 1 on at least ten of twelve seeds (the sim's gate) — it lays the gun on the
   contact's `dy`, closes in when the ground blocks the line, flanks when a
   building absorbs its shots, detours when blocked), readouts. The sim
   found the real holes: a 50 ft wall in the lander's plot at pad edges (the
   profile cache fixed it), enemies parking behind civilians (they
   reposition now), a limit cycle in a bang-bang turn (the turn input is
   now a fraction, keys still send ±1).
3. `tank-render.js` — the lander's line kit COPIED unchanged (dated header)
   with one marked extension, `LINE_VERT_DEPTH` (near-plane clip in the
   shader + real depth), because first person occludes by depth; black
   fills write it (ground mesh at 25 ft cells, skyline strips, a box under
   every structure and hull). The ground grid every 100 ft laid EXACTLY on
   the mesh rows (the first cut sank under the mesh's chords and vanished);
   the flight line traced brighter along z = 0; two skyline rings hashed by
   bearing (the lander's far / farther recipe); stars behind. Structures
   from `LunarStructures.solid(id)` as-is, civilians 0.62 / hostiles 0.85,
   rubble when dead; three authored tank models in the shared format
   (`MODELS`: slow, medium, boss); missiles as darts with exhaust; shell
   tracers; kills break along their own strokes with sparks and a ground
   ring; the barrel is only its last six feet under the crosshair (a full
   barrel from the eye read as a giant V — cut twice by my own eye in the
   lab). Camera: heading direct, ground pitch/roll eased (τ 0.6 s, roll ≤
   0.05 rad), no shake; death sags the view forward and dims the lines.
4. `tmp/lunar-lander/tank-lookdev.html` — the silent look-dev page (real
   core + renderer, WASD / Q E / Space / L, every knob, mission buttons,
   kill / hull-hit / wave buttons, autopilot checkbox, `LAB.tick`).
5. `tank.html` + `tank.js` — the game: the console CSS verbatim from the
   lander's index.html; ONE console top centre — RADAR (SVG sweep, blips,
   the note), SHELL + LASER, HEADING + SPEED, SCORE + mission meta, and HULL
   as the big bar under everything (three cells, the last blinks; tanks
   left); crosshair that warms over a hostile; name + X tag over the
   hostile you look at; hull hits fracture the picture with SVG cracks and
   a 90 ms black veil; cards (ROLL OUT / HULL BREACHED / STRETCH CLEARED /
   ALL TANKS LOST / THE MOON IS YOURS), a five-line ledger; pause, armed
   restart; W S A D, mouse height looks (no pointer lock; PLAY dial), Q E,
   click / Space, right click / L; synthesis sound through the shared
   control (drive rumble, servo, shot, laser, hits, kills, hull hit, death,
   pings, waves, complete, over); `?silent=1` skips the sound attach.
   Tuner: PLAY (mission 1–6 / BOSS, mouse look, turn rate, seed) + LOOK
   (twenty knobs, localStorage).
6. `NEEDS.md` (revolved forms for the round kinds, the amber value when it
   exists) and this folder's `CLAUDE.md`.

Verified: sim green; the look-dev page and the game page load clean in the
pane at 1920×1080 and run headless through `LAB.tick` / `TANK_DEBUG.tick`
(a drive, a shot, a missile inbound, the console reading right). NOT yet
seen by James. Where to look first: `tmp/lunar-lander/tank-lookdev.html`,
then `src/worlds/lunar-lander/tank/tank.html`.
