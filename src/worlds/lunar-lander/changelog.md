# Lunar Lander — changelog

Newest entries first. Never rewrite or delete earlier entries.

## 2026-09-06 (Battle for the Moon, round one: the structures) — Claude

Built on James's go after the level-1 design was agreed (world CLAUDE.md top).
Three things:

1. THE FOUR 1979 SELECTIONS ARE GONE. `FLIGHT` in the core is the one feel
   (the old Cadet: gravity ×1.0, rotation 1.6 rad/s, no inertia, four-pad
   standard deal, rough rationed at 2 / 75). `createGame` takes `level`
   (default 1); `state.level`; the console's meta reads LEVEL 1; the PLAY
   tab lost its Selection row; the ledger stores `level` (old entries with
   `difficulty` still print). `makeChunk(seed, k, opts, carry)`.
2. STRUCTURES.JS — a new pure file, side-effect global `LunarStructures`:
   eighteen line drawings as segment lists in feet, origin at the ground
   centre, with a footprint (`w` × `h`), a class and a multiplier. Ten
   civilians (hab modules, comm tower, power generator, solar farm, tank
   farm, dish array, mining drill, rover garage, observatory, greenhouse),
   four open hostiles (SAM site 2X, gun pit 1X, radar tower 1X, jammer mast
   2X), four hardened (data centre under an overhang 4X, ammo depot behind a
   ridge 3X, bunker with a shut door 3X, shielded power core 5X). Loaded
   BEFORE game-core.js (index.html, the sim, lookdev, the smoke builder).
   The tank session draws from the same file.
3. IN THE CORE: `chunk.structures` — hostiles seated first (one or two open
   per chunk past home, a hardened one on ~26% of chunks from k=2, the power
   core on every jackpot chunk, none on chunk 0), then 3–6 civilians. Placed
   on level-ish ground clear of pads, aprons, the launch lane (130 ft past
   every apron) and mountains; each footprint FLATTENS the ground under it
   like a pad. SOLID: any ship point inside a footprint is a crash —
   `result.reason` 'struck', `result.struck` {id, name, cls}; the card says
   "YOU HIT THE COMM TOWER". `structuresNear(state, x, reach)`.
   Renderer: structures on the flight line (civilians 0.62, hostiles 0.85)
   and two or three hashed civilian silhouettes per chunk on the far line
   for depth (decoration, never solid).

Measured: hostiles seat on 99.5% of chunks past home; 4.6 structures per
chunk on average; chunk 0 is crowded by its four pads and often holds one.
THE SOLID (same day, on the tank session's request, James's rule "use the
same wire model and build it into a 3-D shape"): each kind has a depth `d`
and `LunarStructures.solid(id)` returns the profile extruded through it as
[x0,y0,z0,x1,y1,z1] — one cached 3-D model both games draw; the lander's
side view draws it foreshortened (back face + depth edges ×0.55). The tank
session was answered by cross-session message (format, chunk fields, look
constants unchanged, the four drawings it needs are in). Sim TEST 13
(drawings, the solid, placement, flat ground, clearances, the crash that
names the building); 202,793 assertions green (fewer than before because
every loop ran four selections and now runs one). Tags: structures v1,
game-core v8, game v7, render3d v3; smoke page rebuilt. NOT built yet:
hover/targeting (round two), hostile fire (round three).

## 2026-09-06 (the direction: Battle for the Moon 2075) — Claude

Recorded, nothing built. James: Lunar Lander will grow into "Battle for the
Moon 2075" — the Battlezone mode inside it, battling from the lander, more
buildings on the ground, weapons and more goals for the lander, and
eventually getting out of the lander into a lunar tank whose targets you
already saw going by from the air. "Lots more to come on this down the
road." The world CLAUDE.md opens with it now.

## 2026-09-06 (the radar is gone) — Claude

James: "remove the landing radar from the game - it makes the experience and
flying worse." Removed for good: the TECH ladder is three pieces — shock
legs, spider legs, auto-throttle (a perfect on a 5X holding the other two).
`predictTouchdown()` deleted from the core with its sim tests (nothing else
used it); the dashed beam + pad brackets, the dish on the ship, the HUD
piece, hover card and blurb are gone; the look-dev page lost its gyro and
radar boxes. Sim TEST 12 asserts the three-piece ladder. Tags: game-core v7,
game v6; smoke page rebuilt.

## 2026-09-05 (the gyro is gone) — Claude

James: the gyro stabilizer "is annoying. it makes it harder to fly rather
than helping. I want to remove it from the game." Removed for good: the
TECH ladder is four pieces — shock legs, spider legs, landing radar,
auto-throttle (a perfect on a 5X holding the other three). Core rotation no
longer self-levels; the gimbal drawing, HUD piece, hover card and blurb are
gone; sim TEST 12 asserts the four-piece ladder and that a tilt stays with
every piece held. Tags: game-core v6, game v5; smoke page rebuilt.

## 2026-09-05 (the fuel drought) — Claude

James: "I went by like eight pads before there were suddenly two in a row and I
died... it needs to be considerably more common. It should still be challenging
at times, but right now it's like impossible." No every-other / every-third rule.

Measured over 400 cadet games × 12 chunks: fuel sat on 30% of pads and nothing
stopped a dry deal landing beside a standard chunk whose only fuel pad was its
last — dry runs of 8+ pads about once every five games, worst seen 13.

The rule now (`game-core.js`): the per-deal fuel counts are gone. Pads are
walked in flight order, across chunk seams, and each rolls for fuel with odds
that climb with the run of fuel-less pads before it — `FUEL_ODDS`
[0.30, 0.45, 0.65, 0.85, 1.0]. A dry deal halves the early odds, rich lifts
them ×1.25, a jackpot still promises fuel on one of its 5X pads, chunk 0 always
carries one. Each chunk records its trailing `drought`; `getChunk` builds
chunk k−1 first to carry it over, so a chunk is still the same every time it
is reached (sim-asserted). Result: fuel on 45% of pads, three dry in a row
still happens, four is ~2%, five never. Sim TEST 11 rewritten around the
drought; 354,014 green. Tune: the `FUEL_ODDS` ladder is the whole dial.

Same day, his reload: "seven pads showing in view and five of them have fuel...
did we go too much in the other direction?" The first rung was 30% right
after a fuel pad, so fuel came twice running a third of the time. Ladder now
[0.15, 0.35, 0.60, 0.85, 1.0]: share 38%, back-to-back fuel 17% (was 31%),
the usual gap is one or two dry pads, four still ~2%, five never.

## 2026-09-05 (the zoom reads the pad, not the mountain) — Claude

James: passing the tip of a mountain zoomed the camera in while the pad was
still far off — "disorienting... it makes it hard to see where the rest of
everything is... it should only zoom when you're actually physically close
to the pad in terms of the height to it." The gate used `Core.altitude`
(ground under the ship). Now `zoomHeight()` in game.js: height above the
nearest pad within `ZOOM_REACH` 700 ft sideways; no pad that near means no
zoom at all. The hysteresis, dwell and launch rules are unchanged, just fed
the new height. Checked headless over 535 mountain tops across 60 seeds with
the ship 150 ft over the peak and no pad in reach: none would zoom. game.js
tag v4, smoke page rebuilt.

## 2026-09-04 (shipped, the ring behind the HUD) — Claude

James: the horizon rings "are obscured by the HUD... right when you think
you're going to fly into them, they go behind the HUD." At the zoom floor
(0.3×) a ship at ring height sat ~130 px from the top, under the console.
Fix: once the wide zoom is at its floor the camera PANS UP instead (`lift`
in `_updateCamera`, eased), holding the ship at the same mid-upper line.
Smoke at ring height: camera cy 1836, ship y 275, ring y 243, console bottom
193 — both clear. (The earlier smoke run of the gate actually drifted the pane
to The Orb Dimension: the exit works end to end.)

## 2026-09-04 (SHIPPED) — Claude — four ways out, and the wiring

James: "I really like this. It's fun. I think I'm ready to publish it... the
only problem is it doesn't have any egress points." He approved all four:

1. **The drive-through.** Landing on the secret flat now lights a doorway
   under the arches and the card offers WALK IN.
2. **The derelict relay tower.** Some chunks two or more from home give one
   pad to a relay (`pad.relay`, 30% of far chunks, never near home): a tapered
   mast with a dish and a lamp that blinks once a second. Land on its pad and
   the lamp goes solid, a door at the foot lights, and the card offers ENTER
   THE RELAY.
3. **The horizon.** A faint ring (`HORIZON` 3,900 ft, r 140) hangs over every
   chunk's centre, visible from the pulled-back view. Fly through it and the
   core fires `gate` once per life; the shell flashes and drifts.
4. **The wreck.** When the tank runs dry, the GAME OVER card offers OPEN THE
   HATCH (or CLIMB OUT after a landing) and a dim hatch pulses on the wreck.

All four are hidden `data-drift` anchors the game clicks; `world-registry.js`
+ `drift.js` load; world.json is `live` with a new summary; the registry was
regenerated (draft worlds stripped per the generator gotcha); the admin row
moved to Completed with its "unwired" note left for James to remove; World
Ideas #63 → live. Sim TEST 14 (relays far only, ≤1 per chunk, the result
carries it; the gate fires once) — 336,287 assertions green.

## 2026-09-04 (round four, the attitude lander tuned) — Claude

James: "a little too tall and skinny... match it better to the actual ship";
and the green should "begin at 5 degrees... relatively bright by 3 and 2 and
full-on by 0." The glyph is redrawn at 2 svg units per ship-foot from the real
proportions (17-wide stage, 11.6-wide pod, side tanks, legs out to ±30, mast)
so it is nearly square like the ship. The level tint is continuous: `--lv` =
((5° − tilt)/5)^0.6, set each frame, mixed into the strokes, the glow and the
degree readout via color-mix — 0 at 5°+, 0.58 at 3°, 0.74 at 2°, 1 at 0°.

## 2026-09-04 (round four, the attitude panel) — Claude — the horizon ball becomes a little lander

James: the attitude ball is "hard to read for people who don't fly planes...
just have that be a stylized model of the lander... pointing in the exact
same direction... highlight green with a line in the middle when [level] is
reached." The panel is now a stylized lander silhouette (pod, stage, bell,
legs, mast, windows) rotated by the ship's angle over a dashed plumb line
and a top mark; inside the perfect tilt tolerance (4°, 6° on spider legs)
the lander, plumb and degree readout go green with a soft glow. Ring,
horizon, ladder and wedges gone (`setAttitudeArcs` is a no-op). Smoke: 17°
→ not level, 1.7° → level.

## 2026-09-04 (round four, stars and the front line) — Claude

James: the front parallax line looked "a little bit weird" once the view
pulled back (it had always been there, mostly below the screen at 1×) — cut;
its batch stays in the draw order, empty. The stars "just end at a certain
point" — the 12,000 ft field is now tiled three times around the camera and
runs to 12,400 ft up, so the fully pulled-back view is starred to its corners.

## 2026-09-04 (round four, the high view) — Claude — the wide camera pulls back past 1× to keep a high ship in frame

James: "I flew up above the top of the screen... I couldn't see my ship. If
I start to go up above the top of the screen, can we pull the camera back
more so that it always stays in view?" — and he wants the distance view for
far-off things later. Built in the renderer: when the ship rises past a
quarter of the base view height above centre, the wide zoom target drops
below 1 (to `ZOOM_MIN` 0.3 at most) so the ship holds halfway between centre
and the top of the screen, clear of the console; the static chunk span grows
with the view width (`half` chunks each side) and the line batches were
enlarged for it (flight 5000, far 1600, farther 1200, near 2200 segments);
the camera follow's dead zone uses the widened view. Smoke: a ship at
2,900 ft eased the zoom to 0.51 with the ship on screen; five chunks built.

## 2026-09-04 (round four, the ride) — Claude — the ship is visibly accelerated up the tube

James: "The ship goes the same speed the entire way up... It needs to start
off slow and rather quickly get up to speed... by the time it's reaching the
end of the tube, it's at the full speed." The ride's speed is now a function
of distance along the rail, v(f) = v0 + (vExit − v0)·√f with v0 = 8% of the
exit speed — front-loaded acceleration, exit at exactly the coast speed —
integrated once per launch into a time→distance table (`L.distAt`). The
ride takes ~3.1 s for the 196 ft rail. Smoke trace every tenth of a second:
11, 18, 21, 24, 26, 30, 34, 38, 42, 47, 52, 56, 60, 64, 74, 78, 86, 98 →
coast 90–98. Look-dev mirrors it.

## 2026-09-04 (round four, out of the ground) — Claude — the launcher rises, launches, straightens and sinks

James: "What if the launcher came up out of the ground right at the beginning
of the animation... After the ship leaves, it doesn't explode and disappear.
It goes back to straight and goes back down into the ground." Built: the
sequence is now RISE (0.9 s, the machine climbs out of the apron, everything
below the pad line clipped — `sink` 1→0 in `_accelerator`) → slide → tilt →
pull back → fire → and, with the ship already flying, UNTILT (0.8 s) → SINK
(0.9 s) → gone (`launchAfter`, `stepLaunchAfter`, drawn through the same
`view.launch`). Smoke trace: the dyn segment count grows through the rise,
holds through the shot, and returns to baseline ~1.7 s after the ship
leaves. Snapshot mid-rise: tmp/snapshots/ll-accel-rising.jpg — four rings
up, the rest still underground, a clean cut at the pad line.

## 2026-09-04 (round four, the launcher proper) — Claude — slide, tilt, PULL BACK, fire; eight rings; a technical launcher

James: "have the ship go over to the accelerator, have the accelerator turn
to the diagonal, then pull the camera all the way out, then shoot it up...
three rings taller... make it look a little bit beefier, more realistic and
technical, like an actual magnetic accelerator." Built:

1. The sequence is slide (1.0 s) → tilt (0.8 s) → PULL BACK (the zoom
   releases and the camera eases all the way out; fires when the zoom has
   settled or after 2.4 s at most) → the ride → the coast. `L.fireAt` marks
   the shot; the ride still leaves the rings at exactly the coast speed.
   The launch mode now keeps the zoom in until the pullback (zoomOn covers
   'launch'), so the pull is a deliberate beat, not a leak from the start.
2. `ACCEL.rings` 5 → 8, `railLen` 120 → 196 ft (same 25.4 ft ring pitch).
   The clearance check and the sim's launch tests adapt (1,838 launches
   still clear; 278 steepened).
3. The launcher redrawn as a machine: a low base plate across the footprint
   with ribs, a squat power block with vents on the right end, an eight-sided
   pivot hub, a twin-spine truss rail up the right side cross-braced and
   diagonalled at every ring, a coil bracket clamping each ring to the rail,
   a cable run from the block up the outer spine; lit rings gain an inner
   field ring. Snapshots: tmp/snapshots/ll-accel-upright.jpg / -tilt.jpg.

## 2026-09-04 (round four, the ship HUD) — Claude — readouts beside the ship in the zoomed view

James: "I could really use to see the horizontal and vertical number and
arrow and also the thrust amount and also the altitude" right by the ship,
only when zoomed in — "so you don't have to keep putting your eyes up to the
top of the screen and then back down." Built: two small DOM clusters
(`.ship-hud`, game.js `placeShipHud`) pinned to the aid ring's upper
corners each frame via `projectToScreen` — top-left: altitude (FT) and
thrust (%); top-right: vertical and horizontal speed with their arrows —
shown only while flying with the camera zoomed past 1.6×, faded in/out over
260 ms. Type is small and dim (ink-dim numerals, faint units) so it never
competes with the ship; the two speeds grade green/blink white under 220 ft
exactly like the console. He expects to tune this a lot.

## 2026-09-04 (round four, the mountaintop) — Claude — zoom out by height over the pad

James: after a launch "the camera still does not pull back soon enough...
zoomed way in on me, all the way up over this big mountaintop." Cause: the
zoom rule reads altitude above the ground UNDER the ship, and over a
mountain that stays small while you are hundreds of feet over the pad. Fix:
after a launch the camera goes wide when the ship is `LAUNCH_WIDE` (220 ft)
above the pad it left, whatever the ground below is doing (`launchPadY`,
cleared once the ship is descending). Smoke trace: wide at 234 ft over the
pad, about a second off the rail.

## 2026-09-04 (round four, the stall) — Claude — continuous launch speed, stay close off the pad

James: the ship "immediately slows down to this ridiculously pokey speed" as
it leaves the rings; it must come out fast and lose speed naturally to the
top. The physics were already that (exit ~108–118 ft/s, gravity eats it to
the apex); two things faked a stall: the ride through the rings peaked at
~4× the exit speed on its last frame and snapped down, and the new
climb-zooms-out rule went wide the instant it left, so 108 ft/s read as a
crawl. Fixed: (1) the ride's speed ramps from a 45% kick to EXACTLY the exit
speed at the last ring (`L.vExit`, `L.ride` = rail / mean ramp speed, ~1.4 s),
so the coast continues the motion — smoke trace 31→98 ft/s on the rail, then
97, 96, 95… off it, no step; (2) the launch starts zoomed in and stays close
until the ship passes the zoom altitude, then goes wide at once (no ratio,
no dwell while climbing); (3) the speed trail runs 1.8 s. The fuel mark is
the drop alone, centred under the pad (his pick). Sim 335,557 green.

## 2026-09-04 (round four, the mountainside) — Claude — the accelerator aims clear

James: "The accelerator just launched me into the side of a mountain and
destroyed me." Fix in the core: `launchExit` (where and how fast the ship
leaves the rail), `launchClear` (coast the exit under gravity, every
collision point ≥ 40 ft above ground, checked all the way over the top and
40% back down), `launchAngleFor` (the pilot's angle if clear, else steepened
in 5° steps toward 88°). The shell asks for the aimed angle at the start of
the sequence and tilts to THAT, fires with it, and floats "AIMED 70° TO
CLEAR THE GROUND" when it differs; `state.lastLaunch = { angle, asked }`.
Sim: 1,838 launches from every pad of chunks 0–1 on 60 moons × 4 selections
— 287 needed steepening, none touches ground before the check's floor, all
reach their apex; a built wall steepens the angle; 88° is always accepted.
335,557 assertions green. Also this pass: the fuel mark is the word FUEL
then a half-size drop, under the pad and just right of its edge (his
correction: the big drop "went too far in the other direction").

## 2026-09-04 (round four, first notes) — Claude — accelerators appear on landing, rail to the right, the whoosh, sooner zoom-out, big fuel mark

James's notes on round four:

1. "I don't want to see the accelerators until it's time for the animation" —
   the resting towers are gone from the static lines; the accelerator draws
   only from `view.launch`, rising from dark over the first half second of
   the sequence (`rise`).
2. "The pole can't be in the middle of the rings... to the right side so that
   when it tips over it's below" — the rail spine now runs along the rings'
   right edge (offset `ringR + 2` along the rail's rightward normal) with a
   footing and a strut; tilted downrange it lies beneath the rings.
3. "An initial burst of speed... whoosh, and then it slows" — the fire phase
   is 0.32 s (was 0.55), and `spawnLaunch` fires sparks + a ground ring +
   a flash at the base and a 0.9 s speed-trail of motes off the ship
   (`streak`). The coast itself is real physics, slowing to the apex.
4. "The camera is not panning back soon enough" — zoom-out hysteresis 1.75 →
   1.3 × zoomAlt, dwell 3.0 → 1.6 s, and a climbing ship (vy > 25 ft/s)
   above zoomAlt zooms out at once and never zooms in. Smoke-verified: after
   a launch the view stays wide all the way up.
5. The fuel-pad mark was "a tiny little green droplet that I can barely see"
   — it is now a large filled drop with the word FUEL, placed UNDER the pad
   (`.pad-fuel`, its own label element), dimmed on a used pad. The multiplier
   stays above.

Sim unchanged (330,028 green). Snapshot tmp/snapshots/ll-launch-tilt.jpg
shows the tilted stack with the rail below the rings and no other towers.

## 2026-09-04 (round four) — Claude — THE ENDLESS MOON: chunks, one world per life, deals, used pads, the ring accelerator, the scrolling camera

James: "I would rather have the world scroll infinitely to either side than
have it tile around... you should be able to fly as far as you have the fuel
for. This opens the door to missions." Then: the world must remember what you
have seen "in that session of that life"; the prize is sometimes under you and
sometimes far off; and the next flight after a landing launches from a RING
ACCELERATOR beside the pad ("tilts over... shoots the ship up... each ring
lights up in succession... about three quarters of the way up before you have
to start using fuel"). His calls: launch angle to be dialled ("maybe 60"), a
used pad refuels but pays nothing twice (Claude's pick, accepted). Built on
his go, core first:

1. **Chunks** (`makeChunk(seed, k, difficulty, opts)`): 4,000 ft each, hashed
   from the game seed and the chunk index, generated on demand in either
   direction and kept for the life (`state.world.chunks`). Every chunk starts
   and ends in a mare at a level hashed from the SEAM index, so neighbours
   meet exactly. No wrap anywhere: ship x runs free, `groundAt`/`padUnder`
   take the game state, `chunksBetween`/`padsNear` serve the renderer and
   the pilot. `readouts().range` = ft downrange of the spawn; `farthest`.
2. **Deals**: each chunk rolls standard / sparse (a 5X + one) / rich (five
   pads) / dry (no fuel) / jackpot (two 5X, one fuel); chunk 0 is always a
   fair standard with fuel. Pads carry `id`, `k`, `used`, `apron`.
3. **The apron**: 150 ft of flat ground right of every pad, part of the
   terrain splice — the accelerator's footing and a clear first climb. Pads
   go on flats first, then hills, never on a mountain.
4. **A pad pays once per life**: landing on a used pad scores 0, earns no
   tech, still refuels (`result.reused`); the pad dims and its label says
   USED. `world.version` ticks so the renderer rebuilds.
5. **The next flight**: after a landing on a pad, `newAttempt` leaves the
   ship on it in phase `launch`; the shell plays slide (1.0 s) → tilt (0.8 s)
   → fire (0.55 s, rings light as the ship passes, a rising tone each), then
   `launchFire(state, angle, apexFrac)` hands over physics from the rail's
   end with exactly the speed that coasts to apexFrac × 1450 ft above the
   pad (default 60° and 0.75, PLAY sliders "Launch angle" 40–80 and "how
   high it coasts"). Burns nothing. After a crash (or the drive-through) the
   ship drops in above where it ended, classic entry speed.
6. **The camera scrolls**: `cameraFollow(cx, shipX, viewW, dt)` (pure, in
   the core): a ±20% dead zone, then an ease that tightens toward the
   screen edge; sim-proven one-way, never past the edge, never dragged back
   by a bobbing ship. The wide view opens with the ship a quarter in from
   the left. The approach zoom is unchanged.
7. **Renderer**: `setWorld(state)` replaces `setTerrain`; static lines are
   built for the three chunks around the camera and rebuilt when the camera
   crosses a chunk or the world version ticks (`_syncStatic`, `builtKey`);
   parallax ranges are per-chunk with hashed seams (`_range`); stars re-lay
   around the camera; the wrap copies are gone everywhere. Accelerators
   drawn at rest beside every pad (dim ring tower, rings edge-on to the
   rail, 5 rings on a 120 ft rail) and animated from `view.launch = { pad,
   tilt, lit }` while the resting copy is hidden. Used pads draw dimmer.
8. **Shell**: pad labels for the loaded chunks (rebuilt on chunk change),
   USED tag, result card says LAUNCH after a landing and "NO POINTS — THIS
   PAD HAS PAID ALREADY" on a reuse, RANGE readout in the score panel
   (HOME under 500 ft, then → 1.6K FT), launch sounds, pause covers the
   launch. Look-dev mirrors the launch sequence and the chunked labels.
9. **Sim rewritten** for the endless world: chunk spans/seams/aprons,
   determinism across far chunks, flying past chunk 3 both ways, deals
   histogram (all five occur, standard the commonest, fuel count varies
   0–2), persistence + used pads, launch at 50/60/75° on all four
   selections coasting to 75% (±3 ft) and apexFrac honoured, respawn above
   the wreck, camera follow. Pilot updated (`padsNear`, skips used pads).
   **330,028 assertions green.** Snapshots of the tilt and the firing in
   tmp/snapshots/ll-launch-*.jpg; smoke page driven land → LAUNCH card →
   sequence → flying downrange, RANGE ticking, no console errors.

AWAITING JAMES: the launch angle (60 default, "be prepared to adjust"), the
accelerator's look, the camera's scroll feel, the deals' variety. Missions
are the next round.

## 2026-09-04 (round three, feel notes) — Claude — feet on the line, tune pauses, wheel in thrust, aid values

James's notes while flying the console build:

1. **Feet were drawing a few pixels below the pad on a landing** (his screenshot;
   "seems suspect"). Cause: the legs splay in depth (z = ±15 ft) while the pad
   is a line at z = 0, so under perspective the near feet projected ~4 px
   below the line and the far feet above it. Fix in render3d.js: every vertex
   at foot level (local y ≤ −10.9, incl. spider toes and shock coils) is pulled
   onto the flight plane's projection per wrap copy (`onLine`), so a foot lands
   exactly on the pad line whatever the camera does. Body keeps its perspective.
   Verified in the harness at 9×: feet on the line.
2. **Opening TUNE pauses a live flight**; closing it resumes only if the
   tuner did the pausing (`openTuner` / `closeTuner`).
3. **Wheel trim in thrust, not lever**: each notch adds `wheelStep` percent of
   full thrust (default 5, PLAY slider 1–20, "Wheel trim — thrust per notch");
   the lever curve is undone so the bottom notches do as much as the top.
   Before, three notches gave ~1% thrust. Smoke-verified 5/10/15/20/15.
4. Aid values by his eye: ring 0.05 → 0.08, triangle 0.10 → 0.18 → 0.25.
5. **Type up one step everywhere** (his ask): every font size in the page ×1.15
   except the LUNAR LANDER word on the start card, the altitude number, the
   score and the fuel count (scripted over the CSS, 28 declarations).
6. **Hover cards on the tech icons** (his ask): pointer over a piece in the
   console shows a card under it — name, HELD / NOT YET EARNED / LOST — EARN
   IT AGAIN, and a plain sentence on how it is earned and what it does
   (`TECH_HOW`). The console is pointer-transparent except the icons, so it
   never blocks the field. Native titles removed.

## 2026-09-04 (round three, the console) — Claude — instruments into one centred console, fuel as the big bar

James: "all the HUD stuff is way too small and all far apart. Bring it all up
into the center of the screen, put it into some type of panels, and make all
of the labels considerably brighter... in primary importance... the fuel.
That's got to be like its own separate large bar, below everything else...
give it some little hash marks." Built:

1. `#console` — one fixed strip, top centre (`min(1180px, 94vw)`), two rows.
   Row one is five glass panels: flight (altitude + vertical + horizontal),
   attitude (dial + tilt), thrust (vertical meter + %), landing tech (five
   drawings + NEXT line), score + selection/time/flight. The old four
   corner-and-edge HUD blocks are gone (ids kept, game.js untouched).
2. Labels: 0.58rem faint → 0.74rem at ink 85%; numbers up a size across the
   board; attitude strokes heavier; tech drawings 1.9rem.
3. FUEL: its own full-width panel under the row — label at 0.9rem, a 1.15rem
   tall bar filling from the left with a lit gradient and glow, a scale of
   hash marks (eighths short, quarters taller, half full height) with 0 / ¼ /
   ½ / ¾ / FULL under it, the number large at the right. Low-fuel blink kept.

4. James: "looks fantastic but its a touch large" → the console is sized in
   em off one base (`#console { font-size: 0.8rem }`, width 944px), so the
   whole thing scaled down 20% together; units and the meta line pinned so
   they don't grow or wrap.

Smoke page regenerated and paused for a look: the console reads at 1920,
labels legible, the bar and scale clear. Ship at spawn (x=320) clears the
console's left edge; on approach the zoom centres the ship below it.

## 2026-09-04 (round three, the 2026 look pass 1–3) — Claude — max-blend lines, tight glow, the ship as an object

James on the first cut: the lander was "a blur of white green" with "little
dots where the vector turns happen" — "I feel like you're still slavishly
stuck imitating this 1970s display technology. Can you please stop doing
that?" Diagnosis: additive blending stacked brightness wherever strokes
overlapped or met (the CRT sum). He asked for five concrete 2026 moves and
took 1–3 now, 4–5 after he looks:

1. **MAX blend** for every line batch (`CustomBlending` + `MaxEquation`): a
   stroke over a stroke is one stroke's brightness. Corners no longer dot,
   the ship no longer blooms. Line AA feather 0.7 → 0.9 px, halo 0.14 → 0.05.
2. **Glow retired as the finish**: one half-res blur level (was three summed),
   bright threshold 0.18 → 0.6 (only pads / white cores glow), comp weight
   0.5 → 0.4. `glow` knob kept.
3. **The ship as an object**: edges whose midpoint faces away after the yaw
   go to the dyn batch at 0.38 brightness (dimmed back edges); front edges
   draw in a new `shipBatch` at 1.3× stroke weight; a faint body fill
   (convex hull of the two stages' rings, `_bodyFill`, 0.075 gray → dark
   green after tint, order 8.5) sits under the lines. `shipBright` 0.7 →
   0.85 since it can carry it now.

Judged in the harness: clean ship at 8× and at the approach zoom, no dots,
three back ranges intact, radar/aid unaffected. Sim 75,718 green; smoke
regenerated. NEXT, his go after looking: 4 (palette off phosphor green —
sky gradient, cooler mid-green terrain, white flight line, ground tone,
depth fade) and 5 (motion/feedback register — soft particles, eased
look-ahead camera, shockwave easing, debris dimming).

## 2026-09-04 (round three, first notes) — Claude — smaller ship, third range, Space burns, the aid barely there, fewer 1979 tells

James, before flying: the lander shape is good but 20% too big; "pull back
more from faking the early CRT vector tech... this is NOT a faithful
recreation of the 1979 atari game"; the third parallax layer in the back is
missing; Space must work like W; the circle must be farther out and much
fainter, the triangle only ~20% brighter than the circle — "a visual aid and
not something that's part of the ship." Done:

1. Ship draw scale ×0.8 (`ds` = 1.0 + 0.76·(1−zoom)); collision unchanged.
2. A third back range (`ranges.farther`, z −3400·depth, dimmer, taller) with
   its own black fill; draw order is now stars → farther → far → flight →
   near → live things. Three lines in the back, the flight line, the near.
3. Space = a second burn key (engages/releases the auto-throttle like W); the
   abort moved to X. Space still starts a game and advances the result card.
4. The direction aid: radius 30 → 60 ft (×ds), brightness a new look knob
   `ringBright` (default 0.05, "direction aid" in LOOK), triangle = ring
   × 1.2 and smaller. Both fade in with speed.
5. Fewer period tells: pad multipliers and the fuel mark are DOM labels now
   (thin numerals + a small drop icon, placed each frame via
   `projectToScreen`, wrap-aware), the rising tallies are DOM too ("+200",
   the tech name, "FUEL +150", stacked); the flickering flame triangle is
   gone (a short steady core at the bell + a denser particle plume). The
   stroke font remains only for the drive-through sign. Look-dev places the
   same labels.

Sim unchanged (75,718 green); smoke page regenerated and driven: Space burns
and releases, four pad labels with one fuel mark, no console errors.

## 2026-09-04 (round three) — Claude — the two-stage ship, the ring, fuel pads, the zoned moonscape, LANDING TECH

James's picks from the twelve: 1, 2, 4, 5 and 7 (auto-throttle, "this one is
hardest to get"). Two corrections to the plan before the go: the ship is NOT
to be flattened — "the opposite, but not too much... a little too squat and
wide... a pod on top and an engine part on the bottom... NASA 2036"; and the
moonscape may keep "some jagginess here and there. its a game." He approved
the plan with two Claude calls folded in: auto-throttle needs a perfect on a
5X, and a crash costs only the newest piece. Built in one pass:

1. **The ship** (`buildLander`): two stages like the LEM — a hex crew pod
   with two canted windows, a cap and a low peak, over an octagonal descent
   stage with a hatch, RCS quads at the pod corners, side tanks, four legs
   from the descent-stage corners, the bell, a mast. Taller than it is wide.
   Collision points unchanged except `SHIP.top` 15 → 19 for the taller pod.
   The yaw-toward-tilt drawing behaviour is untouched (his instruction: no
   flying changes, only the outline).
2. **Direction indicator**: a very faint circle (radius 30 ft × ds) around
   the ship and a small triangle riding it at the velocity heading; the
   triangle's brightness scales with speed (nothing below 2 ft/s, full at
   57), gone the moment the flight ends. No arrow.
3. **The zoned moonscape** (`makeTerrain` rewritten): the world is a run of
   zones — maria (flat, ±2.5 ft), plateaus (flat, +120–310 ft), rolling
   hills (sine + jitter), one or two mountains (broad triangles rising
   350–620 ft from the higher of their neighbours, a shoulder on one flank,
   never back to back, never above 1250 ft), and rationed rough stretches
   (1/2/3 by selection, sometimes a sharp rim). Zone boundaries soften into
   3-sample slopes. Pads are placed on maria/plateaus first (98% land there;
   the old anywhere-placement is the fallback so pad counts never drop).
   `terrain.zones` is exposed for sims and harnesses. The sim's autopilot
   now holds above the ridge line between it and its pad (it was clipping
   the new mountains).
4. **Fuel pads**: `pad.fuel` on one pad per moonscape, a second on ~34%.
   Landing there adds +150 (+200 for a perfect) on top of the grade's own
   refund (`result.fuelPad`). Drawn as a small drum with a filler neck
   beside the multiplier. Result card: "FUEL PAD +150"; a rising tally.
5. **Landing tech** (core `TECH`, `state.tech`): earned in order by a good
   or perfect landing on a 4X/5X pad — shock legs (all vy limits ×2), spider
   legs (all tilt limits ×1.5; the outer legs fan out under 60 ft, drawing
   only), gyro (hands off, the ship eases upright at 2.4/s; on Command it
   also kills the spin), landing radar (`predictTouchdown()` — a coast
   prediction every 50 ms; dashed beam to the touchdown, pad brackets and
   edges brighten when both feet fit), auto-throttle (earned ONLY by a
   perfect on a 5X while holding the other four; `autoLever()` holds −4
   ft/s; one tap of W under 100 ft engages it, ANY flight key, the wheel or
   a pointer press hands the ship straight back; a held W still adds on
   top, so the no-interruption rule is intact). A crash pops the newest
   piece. Each piece is drawn on the ship (`buildTech`); shock legs
   compress on touchdown (`squash`, a 0.55 s spring). HUD: five small
   drawings under the fuel bar, dim until held, the auto one pulses while
   engaged, a NEXT: line under them; the attitude wedges widen with spider
   legs (`gradesFor`). Result card names the piece earned or lost with a
   one-line blurb; earned = a chord + tally, lost = two low notes.
6. **Proving it**: sim TESTS 10–12 (zones tile the world, 1–2 mountains
   with real height and flanks, rough rationed, flat fraction > 0.35, pads
   on flats > 0.9; fuel-pad counts and refills; the whole ladder incl. the
   5X-perfect gate and nothing-beyond-five, loss on crash, every rule
   effect, gyro on both rotation models, prediction within 6 ft / 80 ms of
   the real coast, auto-throttle lands a perfect from 100 ft on all four
   selections). Autopilot now 48 seeds. **75,718 assertions green.**
   Look-dev: per-piece checkboxes + ALL, HOLD (freezes the ship for
   judging), spider-fan and shock-squash sliders. Smoke page regenerated;
   the shell was driven headless through engage → gyro level → perfect,
   earn on a 4X, lose on a crash — all as designed, no console errors.

AWAITING JAMES'S FLIGHT: the ship outline, the ring, the new moonscape's
read, the fuel glyph, and whether each piece is worth earning.

## 2026-09-04 (session end) — Claude — round two flown, round three agreed

James flew round two: "nice work. this looks cool and makes me feel
nostalgic." His notes became the round-three plan (recorded in full at the top
of the world CLAUDE.md): the ship is too 3-D ("samurai hat"), a faint circle +
triangle for direction instead of an arrow, fuel pads (one or two per
moonscape), earned landing TECH on a 4X/5X landing (not a score bonus; the
parachute is out; a dozen ideas delivered, his six-pick pending), and a more
realistic, flatter moonscape with plateaus and fewer pointy peaks. Nothing
built for round three yet.

## 2026-09-04 (later still) — Claude — ROUND TWO: the direction reset

James's verdict on round one, in full: the thrust control "sucks"; the ship
"so bright it has zero detail"; the velocity arrow — no; the parallax
"dramatically overcomplicated... should just be three lines"; stars showing
through the back mountains — "crazy town with all these lines going
everywhere"; and the real correction: don't imitate a CRT or 1979 at all —
"make it look super cool for 2026... still basically using green to white, a
single line drawing. But within that constraint, do whatever you want. You can
make the ship look like it's from 2030. NASA 2036." Plus: the thruster must
tap-goose AND go to full fast AND hold as long as there is fuel (round one's
burn was "cutting out every couple seconds — that was goofy"); every readout
and instrument "completely contemporary"; and the zoom must never pump when a
pilot bobs across the trigger altitude. Built the same night:

1. **Renderer rebuilt** (`render3d.js`): three ground lines only — near,
   flight, far — each a polyline with an opaque black fill beneath it, drawn
   far to near in an explicit renderOrder chain, stars only behind the far
   line. Ridge rows, cross ties, pad platforms, the spitting peak, the in-scene
   HUD batch, the velocity arrow: gone. The whole CRT post chain removed
   (persistence, scanlines, curve, vignette, grain, ripple); what remains is
   bloom + a green-to-white tint. New lander: wide hex deck, low crew dome with
   a window band, side tanks, four splayed legs, bell, mast — few lines, drawn
   at `shipBright` 0.7 under the world so it reads as a drawing. Drawn 2.2×
   true in the wide view and 1.25× on approach.
2. **The throttle** (`game.js`): hold to burn, linear attack to full in
   `attack` s (0.35 default, PLAY tab), instant cut on release, wheel = hover
   trim, S kills the trim, SHIFT = momentary full, pointer-hold on the field
   burns. No timers, no ramp phases — nothing can interrupt a held burn.
   Verified headless: held 5 s = thrust 1.00 throughout.
3. **The zoom gate** with hysteresis (in below `zoomAlt`, out above 1.75×,
   3 s dwell between changes). Verified headless: bobbing 430↔570 ft across
   a 480 ft trigger held the zoom the whole time. Zoom eases at 0.9 s.
4. **Contemporary instruments** (`index.html`, DOM/SVG): altitude large and
   thin, vertical/horizontal speeds that turn green inside a good landing and
   blink white outside it near the ground, score, fuel with a bar, an SVG
   attitude indicator with the good/hard tolerance arcs and a needle, a thrust
   meter with the trim mark. Glass cards in the Surround register.
5. Bug found on the way: a negative frame dt (the smoke pump's clock ran
   behind the real one) blew the throttle easing to 1e41; `frame()` now clamps
   dt to [0, 0.1].

Sim: 66,900 assertions green. Look-dev + smoke pages updated (smoke pane
screenshots need the game paused first — noted in the world CLAUDE.md).
AWAITING JAMES'S FLIGHT: the throttle feel, the three-line look, the ship, the
instruments, the zoom gate.

## 2026-09-04 (later) — Claude — ROUND ONE: the lever, and the modernization proper

James flew the draft: "fun. lots to come. you didn't modernize it!?" Fair — the
draft modernized the monitor and left the composition at 1979. He picked depth,
the ship, feedback and the vector HUD (1, 2, 5, 6 of the eight offered) and
asked for a much more responsive thruster ("awkwardly quantized... the smallest
amount is too much"). Plan nodded, built:

- **The lever.** Thrust now follows a response curve (thrust = lever^1.7,
  `leverCurve` in the core defaults — fine at the bottom, a punch at the top);
  keys ramp at a quarter rate for the first 0.35 s (a tap is a whisper) then
  accelerate while held; the wheel steps 2% (was 8%) and the knob/wheel set a
  target the lever eases to over 60 ms. Sim retuned to the curve (the pilot
  thinks in thrust and inverts the curve), 66,900 green.
- **Depth.** Perspective camera (fov 38°, placed so the flight plane fills the
  frame exactly as the ortho view did); the ridge is a wireframe strip of four
  rows (z −260/−130/0/+130 with per-moonscape jitter, cross ties every third
  sample, the z = 0 flight line brightest); pads are platforms across the rows
  with corner posts; a far range at z −1400, a farther one at −2700, a near
  foreground range at +520, all fogged by view distance (stars pushed past the
  fog floor and compensated); the camera banks up to 3° with lateral speed on
  approach, eased over 1.1 s. First cut had the far ranges too tall and jagged
  and the fog eating the stars — retuned by eye in the harness.
- **The ship.** A real wireframe LEM: octagonal cabin prism with a window,
  descent-stage box, two-ring nozzle, four legs with struts and cross pads, an
  antenna with a dish, RCS quads. It yaws toward its tilt (0.7× the angle) so it
  shows its side as it leans. Thrust plume of particles out of the nozzle (rate
  and speed by thrust, gravity-bent, dying on the ground) plus the short core
  flame; RCS puffs from the cabin corner opposite the turn while a rotate key is
  held. The crash now breaks every 3-D stroke apart in 3-D.
- **Feedback.** Touchdown: two shockwave rings on the ground plane (elliptical
  in perspective) and dust that flies, lands and settles as specks; a slow-motion
  beat on a crash (time scale 0.18 easing back over 0.7 s — the pieces hang);
  the points tally rises from the pad in vector digits ("+150") and fades.
- **The vector HUD.** In-scene instruments through an ortho pixel camera:
  attitude ball at bottom centre (rotating horizon + pitch ladder + ground
  hatching, fixed ship chevron, the good ±10° / hard ±18° tolerance wedges at the
  top with the tilt needle pointing into them), fuel bar along the left edge
  (three fill lines, quarter ticks, blinks under 15% in flight), and the velocity
  vector arrow off the ship in the world (length by speed). DOM readouts stay as
  the small print. LOOK tab gained fov / depth / ridge rows / camera bank /
  thrust plume / instruments.
- Renderer lesson: `resize()` had written the canvas's CSS size from a 2 px
  first measurement and pinned it there — CSS owns the on-screen size now and
  the window is measured first.

**Where things stand**: AWAITING JAMES'S FLIGHT of round one (the lever feel
first, then the depth, the ship, the feedback, the instruments). Not built from
the eight: the surface dressing (craters, wreck, flag, beacons), Earth + meteors,
the two-colour phosphor, the drone bed and radio chatter.

## 2026-09-04 — Claude — BUILT AS A DRAFT (James's go on the ten-item plan)

James asked for the Surround treatment: the 1979 cabinet, modernized with bells
and whistles, retro vibe intact, then a feature round once it flies. Plan agreed
(faithful core → vector look → the lever → synthesis sound → whistles → tuner →
start gate → look-dev harness → sim → draft), his "go", built in one session.

- **The core** (`game-core.js`, pure): lunar gravity × four selections (Training
  / Cadet / Prime / Command — Command's rotation carries momentum), a
  proportional lever burning fuel, the abort burst (1.1 s forced full burn at
  double cost), horizontal wrap, seeded midpoint terrain with pads spliced in as
  exact flats (one per tier, 150/105/72/50 ft → 2×/3×/4×/5×, count by
  selection), a 64 ft secret flat on 35% of attempts, landing graded by
  vertical speed / drift / tilt (perfect / good / hard, both feet on the pad or
  it's a crash), the cabinet's scoring (50×pad, 15×pad, crash 5), fuel as
  currency (+50 on a perfect, −50 on a crash, game over when dry), a per-game
  log of every attempt.
- **The sim** (`tmp/lunar-lander/sim.mjs`, 66,899 assertions): terrain
  invariants across 480 moonscapes (flat pads, no overlap, seamless wrap, under
  the spawn), determinism, gravity integration, burn rates, the dry event, the
  abort once-per-burst rule, rotation modes, wrap, every grade threshold and
  crash reason, the secret outcome, a PD autopilot that lands 23–24 of 24 on
  every selection with fuel cost rising Training → Command (185 / 220 / 255 /
  295), advance() accumulation, a full multi-attempt game to a dry tank.
- **The picture** (`render3d.js`): a line batch that turns segments into
  screen-space quads with a soft core and halo (additive, DoubleSide — the
  first render was black because rightward quads wind clockwise and got
  culled), a 4×6 stroke font (pad multipliers in-world), the LEM in twelve
  strokes with a flickering thrust flame sized by the lever, the ship coming
  apart along its own strokes on a crash (pieces bounce on the terrain),
  touchdown dust, the spitting peak (the highest point throws sparks now and
  then), 260 stars per moonscape, the drive-through with two arches once the
  secret is found. Camera: orthographic, whole world wide, an eased 3× zoom on
  final approach (0.55 s time constant, no shake — motion restraint), the LEM
  drawn up to 2.2× in the wide view. Post: phosphor persistence (frame-rate
  independent), three-level bloom, phosphor tint with a whitening core,
  scanlines, barrel curve, vignette, grain, a supply-ripple flicker.
- **The shell** (`game.js` + `index.html`): the cabinet's readouts as DOM
  (SCORE / TIME / FUEL and ALTITUDE / HORIZONTAL SPEED / VERTICAL SPEED with
  arrows, fuel blinks under 100, a fast sink blinks under 150 ft), the thrust
  lever gauge (W/S ramp, wheel steps, knob drags, SHIFT momentary full), arrows
  rotate, SPACE aborts, P pauses, R restarts (armed → confirm), the attract card
  with the ledger (top five, localStorage), result cards in the cabinet's words
  ("YOU JUST DESTROYED A 100 MEGABUCK LANDER", "AUUGH! YOU CAME IN SIDEWAYS"),
  Web Audio synthesis (filtered-noise engine opened by the lever, altimeter
  beeps under 300 ft, crash / landing / abort / secret / game-over cues) through
  the shared sound control, a two-tab tuner (PLAY + LOOK with file-backed
  presets, click-away dismiss), the DOM chrome tinted from the look's hue.
- **Harnesses**: `tmp/lunar-lander/lookdev.html` (silent, the sim's autopilot
  flying real approaches, every knob live, CRASH / LAND / NEW MOON / ZOOM) and
  `tmp/lunar-lander/smoke.html` (`make-smoke.mjs`, sound stubbed, `SMOKE.pump`).
  Verified in the pane: attract, START, lever, rotation, the zoomed LEM, the
  crash debris. No console errors.
- Draft status: `world.json` draft, admin panel row under In progress worlds
  (unwired), not in the registry, no exits.

**Where things stand**: AWAITING JAMES'S FIRST FLIGHT (the feel of the lever,
the zoom, the grading, the look). Then the feature round, his picks: multi-stage
descents, a moving pad, meteor showers, fuel crates, a co-op tow mode, terrain
sets; then drift exits and ship wiring. James paused the session here.
