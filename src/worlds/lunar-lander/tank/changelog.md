# Moon Battle 2100 — the tank half — changelog

Newest entries first. Never rewrite or delete earlier entries. The lander
half's changelog is one folder up.

<!-- TANK-ENTRY-2026-09-11 -->

## 2026-09-12 — Claude — the map treatment: the minimap, the M map's upgrade, the direction line, the controls panel

James (after the lander's sitrep brief): "go over to the tank battle side and give the map there
the upgrade treatment as well. really give some clear indicators about what is around and what
direction to go in to get the targets." Built:

1. THE MINIMAP (`#mini`, `drawMini` in tank.js): a round map top right, always on while you play,
   THE WAY YOU LOOK IS UP; 2,200 ft to the rim, rings at the radar's reach and half of it, an E at
   the rim (the road runs east). The road dashed, its waypoints numbered (done ones faint, the
   NEXT one bright with its name, boss and base amber), every enemy on the radar as an amber dot
   with its kind (TANK / FAST / HOVER / MECH / WARDEN / STRIDER / SIEGE), hostile structures as
   amber squares with their tag, missiles pink and blinking, pickups you have seen, civilians
   faint, you at the centre as a triangle pointing where the HULL points with a dashed look line.
   When the next waypoint is off the map an arrow sits at the rim toward it. Under the map: the
   chevron + name, the range, N OF M DONE, hostiles left in the stretch.
2. THE M MAP: a legend (every mark named), a 1,000 FT scale bar, an EAST compass, kind tags on
   every hostile structure and enemy, a dashed heading line from the tank the way you look, a
   dashed GO line to the next waypoint with the range on it.
3. THE DIRECTION LINE under NEXT on the console: ▲ STRAIGHT AHEAD / ◀ 35° TO THE LEFT / ▶ 35° TO
   THE RIGHT / ▼ BEHIND YOU — TURN ROUND; NEXT's type up a step.
4. THE CONTROLS PANEL (CONTROLS, bottom right; pauses the game while open): every key in readable
   type. A TEXT SIZE dial (PLAY → text size) scales the console, the minimap and the panel.
5. The core: `shellSolution` marches at the physics step (SOL_DT = DT) — see the lander changelog.
   `structures.js` kinds carry a `tag`; the two new lander shooters (laser turret, pellet gun) draw
   here too (their moving part baked at rest into `solid()`).
6. THE TANK CAMPAIGN FROM THE START SCREEN: the lander's start card offers CAMPAIGN → TANK, which
   writes a fresh handoff (seed, zero points) and opens this page with `?campaign=1` at level 1.

Sim 5,312 green. Driven in the pane (`?silent=1`): the minimap with THE PYLON LINE named and
ranged, the M map with legend / scale / EAST / tags / the GO line.

## 2026-09-09 (later) — Claude — the barrel off again

James drove it: "the barrel isn't going to work out. It's just floating in space. It looks
really weird. All the other stuff is cool, though. Leave everything else." `gunBright`
default back to 0; the drawing stays behind the LOOK dial. Everything else in the entry
below stands. Two barrels rejected now (rails-and-ring 09-07, the perspective gun 09-09).

## 2026-09-09 — Claude — the gun is honest: the arc, the landing mark, the leads, the hull box, the barrel, the tracer

James: the shell was hard to see, the reticle lit "well above the other tank" while the shots
missed, and setting the height was guesswork; he wanted the turret back, "not a circle and two
lines," and useful for aiming. Green light on all six.

The cause: the crosshair lit when the gun's STRAIGHT line touched a hostile, but the shell
flies an arc and takes 2–3 s to 1,400 ft; a moving hull is long gone, and the hit body was a
sphere twice the hull's height. (A moon fact found on the way: at 520 ft/s under 5.3 ft/s² a
shell aimed even slightly up outlives its 4.5 s in the air — ~2,300 ft — before it falls; over
level ground only near-flat shots come down. The drop over 1,400 ft is ~20 ft, hull-height.)

1. THE SOLUTION (core `shellSolution`): every frame the shell the gun would fire now is marched
   under gravity until it meets the ground, a structure, a missile, or a hull WHERE IT WILL BE
   (each enemy carried on at its speed and heading). `readouts().gunHit` / `gunRange` are its
   answer, so the crosshair's amber, the TANK / TARGET word and the range under the crosshair
   all mean "this shell lands there." `gunHit` 'none' = the shell dies in the air (HUD: MAX).
2. THE ARC: dashes from the muzzle out along the predicted flight (`arcBright`); THE LANDING
   MARK where it comes down — a diamond on the ground with a post, a box in the air on metal,
   pulsing when it is a hit; the mark keeps a screen size to any range.
3. THE LEADS: a ghost hull outline on the ground with a mast where each moving enemy will stand
   when the shell arrives (`leadBright`); the solution counts a hit on the ghost.
4. THE TRACER: a star head across the line of flight plus a three-step fading tail; a dust
   burst and flash where it lands; THE MISS CALL — when a shell lands within 420 ft of a
   hostile, a float says "N FT SHORT / OVER / WIDE" so the next round can be walked on.
5. THE BARREL (`gunBright` back on, default 1): an eight-sided tube in perspective from a
   collar at 6 ft to a slotted muzzle brake at 16 ft, range ticks on the top rail, recoil
   slides it back; its axis runs `SHELL.muzzleDown` (2.2 ft) under the eye so it rises from
   the bottom of the frame to a point under the crosshair, and the arc leaves its mouth (the
   core's muzzle moved to match: `muzzleAhead` 16, `muzzle()` / `gunDir()`).
6. THE HULL BOX: enemies are hit as their own hull box turned to their heading (`inHull` /
   `rayHull`, pad `SHELL.bodyPad` 4 ft) for shells, the laser and the solution alike.

Sim TEST 12 (249 green): the mark is where the shell ends (three elevations), the muzzle sits
under the barrel, 14 ft over a hull is a miss, the box turns with the heading, at 1,400 ft the
line says hit while the arc lands short and a higher lay puts it on the hull and the real shell
strikes it, the lead ghost stands ahead of a moving hull at the flight time. Judged in the
look-dev page (dev-snapshots tank-barrel-1/2) and the silent tank page (tank-game-2).
Three LOOK dials added: the barrel, the shell arc + landing mark, lead ghosts.

## 2026-09-09 — Claude — the wheel zooms

James: "lets add a 2x mouse wheel in/out zoom." Wheel up zooms in, wheel
down out, 1× to 2× in four clicks (`zoom` in tank.js, `ZOOM_MAX` /
`ZOOM_STEPS`), eased in the renderer the same way as the scope (`zoomShown`,
160 ms) and stacked under it (`cam.fov = tankFov × scope narrowing ÷ zoom`).
The mouse slows by the zoom factor so the aim holds at 2×. The wheel over
the configuration panel still scrolls the panel; a restart, pause or new
game resets the zoom to 1×. The hint line and the start card say WHEEL
ZOOM. The look-dev page has the same wheel (`LAB.setZoom`). Sim 223 green,
unchanged (the zoom is view-only).

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
