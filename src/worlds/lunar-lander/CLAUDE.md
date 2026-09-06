# Lunar Lander — Claude instructions

## WHERE THIS IS GOING (James, 2026-09-06 — recorded, nothing built)

Lunar Lander is the seed of a bigger game: **Battle for the Moon 2075**. His
words: it "is going to include the Battle Zone mode... some battling from the
lander as well. We'll have more buildings on the ground. And we'll give the
lander some weapons and some more goals. And eventually we get to a place where
the user gets out of the lander and gets into the tank, a lunar tank. The things
that you'll be dealing with in the tank, we'll see going by on the ground. Lots
more to come on this down the road." So, in his order:

1. Buildings on the ground (the lander flies over what the tank will fight in).
2. Weapons on the lander and more goals than pads.
3. The Battlezone mode — a lunar tank, first person, the vector sibling.
4. Egress: land, climb out, get in the tank; the two halves share one moon.

Every step is a design conversation and his go first. Until then the world is
Lunar Lander as shipped; the endless chunked moon and its deals are the ground
both halves will stand on — keep new ground features in the core's chunk data.

### Round one design — WEAPONS, HOSTILES, STRUCTURES (James's riff 2026-09-06, agreed so far, NOT built)

His brief: two weapons from the start — a guided missile and a laser beam.
Activate the weapon, click the target (ground or air), click again to fire,
right-click to disengage; "a cool little animation for each"; about 85%
accurate (a small chance to miss, never impossible). Hostile fire = surface-to-
air missiles only, slow enough to outfly, a warning on launch, a missile icon on
the direction circle pointing at it with the range counting down in a small
pink number, a couple percent chance per tick that the SAM corrects course,
otherwise a straight shot. CHAFF drops shreds below the lander, stops a SAM 80%
of the time. Missiles / laser charge refill at pads like fuel does — randomly
mixed so you can always get some but may have to choose fuel or weapons this
landing. Plus ten more man-made greebles on the ground.

The plan (three rounds, his eyes between each):
1. Structures — BUILT 2026-09-06 (changelog "round one"): `structures.js`
   (18 drawings), `chunk.structures`, solid, the four selections gone.
   AWAITING HIS EYES.
2. Weapons + refills — BUILT 2026-09-06 (changelog "round two"): `fire` /
   `targetable` / `stepShots` / pad supplies in the core; 1 / 2 / C / right-
   click in the shell; the tag, the bracket, the dart, the beam, the break.
   AWAITING HIS EYES.
3. Hostile fire — SAM sites, warning + icon + pink range, chaff.
Everything in the pure core with sim tests; animations in the renderer.

THE TARGET SYSTEM (agreed):
- Three classes. Hostile in the open (SAM site, gun pit, radar tower, jammer):
  targetable from anywhere, 1X–2X. Hostile hardened: targetable only from the
  right place or moment, 3X–5X. Civilian (habs, solar, observatory, garage,
  drill, dome, tanks — lots of them): NEVER targetable, the cursor does nothing.
- Hardening kinds: UNDER AN OVERHANG (shots from above hit rock; come in low
  from the open side; laser and missile both need the line); BEHIND A RIDGE
  (missile only, arcing from the far side); DOOR SHUT (a bunker's blast door
  opens two seconds when its own SAM fires — bait it); SHIELDED (two hits, any
  mix).
- The rating is ONE number: a multiplier 1X–5X on the pad scale; value and
  difficulty are the same number. Points = base × X; a miss pays nothing and
  spends the ammo. Chunks deal hostiles like pads: most have one or two open
  targets, a hardened one every few chunks, a jackpot chunk holds a 5X.
- The cursor: over a hostile its strokes warm to amber and a small tag shows
  name + X; a hardened one adds one word — OVERHANG / RIDGE / DOOR / SHIELD.
  Selected = bracket + the ammo counter blinks; second click fires; right-click
  clears. Over civilians: nothing.
- A MISSILE MISS (small chance) can damage a civilian building and takes
  points away — his call. The laser never harms civilians (line, not blast).

HIS ANSWERS 2026-09-06: a SAM hit is a crash (same as the ground); the radar
tower doubles SAM range in its chunk (kill it first); loadout 4 missiles /
3 laser shots / 3 chaff; keys 1 missile, 2 laser, C chaff, right-click clears;
structures are solid (a comm tower is a crash).

**THE LEVELS (James, 2026-09-06): "I don't want those levels at all."** The
four 1979 selections (Training / Cadet / Prime / Command) GO. Instead: a set
of LEVELS with harder enemies and better weapons, then a BOSS. Everything
above is LEVEL 1. The tank battle is its own part of the same game. Nothing
built; the level structure (what completes a level, what escalates, the boss)
is the next design conversation. Claude's picks to open it: level 1 flies
with the Cadet feel (gravity ×1.0, hand-on-key rotation, 4-pad standard deal)
and the physics never change between levels — only enemies, weapons, targets
and the moon's deals do. **HIS YES TO ALL THREE (2026-09-06):** level 1 flies
with the Cadet feel and the physics never change; level 1 is complete when
every hostile in the first eight chunks is destroyed — then the relay tower
lights and landing on it ends the level; five levels, then the boss, then the
tank part opens.

### TWO SESSIONS, ONE GAME (2026-09-06)

James runs a second Claude session for the TANK half. Its brief is
`tank-brief.md` in this folder (keep it current when the split changes). The
split: the tank session owns `tank/` (its own html/js/core/render/CLAUDE.md/
changelog) and `tmp/lunar-lander/tank-*`; it writes needs into
`tank/NEEDS.md` — READ THAT FILE at every session start and act on it. This
session owns everything else here plus the repo-level files. Coming from this
side, promised to the tank: `chunk.structures` in the core and
`structures.js` (pure segment lists for the ten structures + SAM site) so both
renderers draw the same shapes; later, `vector-kit.js` (LineBatch + post
chain + DEFAULT_PARAMS pulled out of render3d.js) with a heads-up to the tank
session first. Commit prefix here: `Battle for the Moon (lander):`.

## START HERE (next session)

**SHIPPED 2026-09-04** — James flew rounds three and four the same night, said
"I really like this. It's fun," and asked for egress: four ways out are in and
the world is wired (changelog "SHIPPED"). Missions are the next round, his go.
Read the changelog's round-four entry first. The shape of the game now:

1. The moon is endless both ways: 4,000 ft chunks hashed from the seed, made on
   demand, kept for the whole life. One game = one world. Pads you have landed
   on stay landed on: they refuel you but pay nothing twice (his accepted call).
2. Every chunk rolls a DEAL (standard / sparse / rich / dry / jackpot) — "each
   tile... some cool randomness... sometimes the really cool bonus is far off to
   the right... other times right below you." Chunk 0 is always fair.
3. After a landing the next flight is the RING ACCELERATOR beside the pad:
   it APPEARS only then (never drawn at rest — his rule), slide → tilt → fire
   through five rings with a whoosh, coasting to ~75% of flying height with
   no fuel spent. The rail runs along the rings' right side so it lies under
   them when tipped (his rule). Angle is a PLAY dial (default 60°; he said "we might
   want 60... be prepared to adjust"). After a crash you drop in above the
   wreck. There is no wrap and no fixed spawn after flight one.
4. The wide camera scrolls with you (dead zone, then an ease that tightens
   toward the edge — `cameraFollow` in the core, sim-proven not to pump).
5. Missions are the door this opens — NOT built, needs its own conversation.

Round three (the ship, the aid ring, fuel pads, landing tech, the zoned
moonscape) and the 2026 look pass 1–3 stand underneath; his verdicts on those
are still pending too. His pre-flight notes are in the changelog ("first
notes", "feel notes", "the console"). **Standing rule: this is NOT a faithful
1979 recreation** — when in doubt, the contemporary choice wins; no stroke
lettering in the scene except the drive-through sign.

His flight decides: the launch angle and the accelerator's look, the scroll
feel, the deals' variety, plus everything from round three. Then the 2026 look
items 4–5 (palette, motion) and the feature round (see the end of this file).

Atari's Lunar Lander (1979), the physics kept and the look taken to 2026. Built
2026-09-04 as a draft on James's go; rebuilt the same day on his direction
reset (below). Sibling of Surround — same architecture: pure core + sim,
three.js renderer, shell with a tuner and file-backed presets, a silent
look-dev harness, a sound-stubbed smoke page.

## THE DIRECTION (James, 2026-09-04, round two — this governs the look)

"Make it look super cool for 2026... you're still basically using green to
white, a single line drawing. But within that constraint, do whatever you
want." Not baroque, no doodads, no imitation of 1979 tech ("you don't have to
make it look scratchy and like old school tech"). So:

- **One register**: single-weight lines, green to white, glowing on black. No
  scanlines, glass curve, vignette, grain, ripple or persistence smear — all
  removed, not zeroed. Glow is the whole finish.
- **Three lines, no more**: near, the flight line, far. Each is a polyline
  with solid black beneath it, drawn far to near, so nothing shows through
  anything and the stars sit only behind the far line. His words: "It should
  just be three lines... the stars cannot be in front of any of the lines."
  No ridge rows, cross ties, pad platforms or spitting peak — "crazy town with
  all these lines going everywhere."
- **The lander reads as a drawing**: dimmer than the world (`shipBright`),
  few lines, a 2036 shape (wide hex deck, low crew dome with a window band,
  side tanks, four splayed legs, bell, mast). It was "so bright it has zero
  detail" — never let the ship bloom into a blob.
- **No velocity arrow.** He didn't like it.
- **Instruments are contemporary DOM/SVG**, not in-scene vector text: thin
  numerals, small caps labels, an SVG attitude indicator, a fuel bar, a thrust
  meter (a reading, not a control). Speeds grade themselves green inside a
  good landing near the ground and blink white outside it.
  **Since 2026-09-04 they live in ONE CONSOLE, top centre, in glass panels**
  (James: the corner HUD was "way too small and all far apart"); labels are
  bright (ink 85%), and FUEL is its own large bar under everything with a
  hash-mark scale (eighths / quarters / half) — "the most critical piece."
  Never scatter instruments back to the corners; never shrink the labels.

## THE THROTTLE (James, round two: "make the thrust very responsive and effective")

Hold to burn. W/↑ held ramps the lever linearly to full in `attack` seconds
(default 0.35, PLAY tab), release cuts to the trim at once. Thrust =
lever^1.7 (core `leverCurve`), so a tap is a nudge and a hold is a burn.
The wheel sets a hover trim (2% steps; S/↓ kills it), SHIFT is momentary full.
**Nothing may ever interrupt a held burn** — his round-one complaint was the
thrust "cutting out every couple seconds"; the throttle now reads the key
state every frame and has no timers, no ramp phases, no positional lever.
Holding the pointer on the field burns too (touch).

## THE ZOOM (James, round two: the pump warning)

"Be careful not to zoom in and out, in, out... as the person is bobbing along
right at the altitude in which you are triggering the zoom." The shell owns
the decision with hysteresis: in below `zoomAlt`, out only above `zoomAlt ×
1.75`, and never two changes inside 3 s (`ZOOM_OUT_RATIO`, `ZOOM_DWELL` in
game.js). Verified headless: a ship bobbing 430↔570 ft across a 480 ft trigger
stays zoomed throughout. The renderer only eases (`CAM_TAU` 0.9 s). Keep the
zoom — "cool, effective, and necessary" — and keep it from pumping.

**The zoom reads height above the nearest PAD, not the ground** (2026-09-05,
James: a mountain top passing under the ship zoomed him in far from any pad —
"disorienting... hard to see where the rest of everything is"). `zoomHeight()`
in game.js: the smallest ship-minus-pad height over pads within `ZOOM_REACH`
(700 ft sideways, edge to edge); no pad that near = Infinity = no zoom. Both
the in and the out rule use it. `Core.altitude` (ground under the ship) stays
for the instruments and the auto-throttle.

## Docs

- `changelog.md` — session history, newest first.

## Files

- `game-core.js` — ALL game rules (gravity, lever curve, fuel, rotation, the
  endless chunked moon and its deals, pads/aprons/used pads, grading, scoring,
  landing tech, the launch, the camera follow, the secret flat), pure: no DOM,
  no timers, no Math.random (seeded rng). Shared verbatim with the sim; keep
  it pure or the sim lies. Exposes `globalThis.LunarCore`.
- `render3d.js` — the whole picture, nothing else: the 3-D line batch
  (segments → screen-space quads with a soft core, fogged by view distance),
  the ground fills, the vector font (pad labels, the tally), the lander solid,
  the effects (debris / dust that settles / touchdown rings / tally / plume /
  RCS puffs), the perspective camera with the eased zoom and a few degrees of
  bank, bloom + tint.
- `game.js` — the shell: attempt flow, the throttle, the zoom gate, input,
  instruments, sound synthesis, tuner, presets, the ledger.
- Sim: `node tmp/lunar-lander/sim.mjs` — 330,028 assertions on the real core
  (chunks/seams/aprons, determinism, gravity, fuel through the lever curve,
  abort, rotation/inertia, the endless moon both ways, every grade threshold,
  an autopilot that lands all four selections, advance(), a full multi-flight
  life through launches, the zoned moonscape, deals + fuel pads, the whole
  tech ladder, persistence + used pads, the launch, the camera follow). RUN IT
  after touching game-core.js.

## The look-dev harness — use it

`tmp/lunar-lander/lookdev.html` (served: `http://127.0.0.1:4174/tmp/lunar-lander/lookdev.html`)
is a **silent** page driving `render3d.js` with the sim's autopilot flying real
approaches and live sliders for every look parameter, plus CRASH / LAND / NEW
MOON / ZOOM buttons. It is where the picture gets judged before it flies. Keep it.
It surfaces every error on the page and exposes `globalThis.LAB = { scene, state,
tick, ... }` so a checker can drive frames when rAF is frozen (`LAB.tick(dt)`).

`tmp/lunar-lander/smoke.html` is generated by `node tmp/lunar-lander/make-smoke.mjs`:
the real world page with the shared sound control swapped for a no-op stub, so
the full shell can be loaded in the pane without ever creating an AudioContext
(house rule: never load a sound world in the preview pane). `SMOKE.pump(frames,
dtMs)` steps the real loop; `LANDER_DEBUG` is the shell's read-only handle.
**Regenerate it after editing index.html.** Pane screenshots of the smoke page
time out while the loop runs — pause it first (`keydown p`), hide `#pause-card`,
`LANDER_DEBUG.tick(1/60)`, then screenshot. The canvas alone can be captured
any time through `/api/dev-snapshot` (`toDataURL` right after a tick).

## World-specific rules

- **SHIPPED 2026-09-04** (James: "I'm ready to publish it"): in the drift
  registry, four diegetic exits (the drive-through door, the relay tower's
  door, the horizon ring, the wreck's hatch — hidden `data-drift` anchors the
  game clicks via `takeExit`), admin row under Completed. The "unwired" note
  was removed on his word the same night. Exits are found by playing: never draw an
  arrow to one, never add a literal link.
- **The physics are the cabinet's**: gravity 5.3 ft/s² × selection (Training
  0.55 / Cadet 1.0 / Prime 1.35 / Command 1.7), full lever 16.5 ft/s² and 8.5
  fuel/s, Command rotation carries momentum, abort = 1.1 s forced full burn at
  double fuel cost. Grades: perfect ≤5 ft/s down · ≤3 across · ≤4° (50×pad +50
  fuel), good ≤15 · ≤6 · ≤10° (50×pad), hard ≤30 · ≤12 · ≤18° (15×pad), else a
  crash (5 points, −50 fuel). Both feet must be on the pad; touching anything
  else is a crash however gentle. The game ends when the tank is dry. Tune by
  feel through the tuner scales (gravity / attack), not by editing these.
  **Landing tech bends these** (`gradesFor(state)`): shock legs double every
  vy limit, spider legs grow every tilt limit by half — the HUD and the
  attitude wedges must read the effective grades, never `GRADES` directly.
- **Landing tech is a core rule, not a shell flourish**: `state.tech` (ids in
  the order earned), `TECH` ladder — THREE pieces: shock, spider, auto
  (the GYRO STABILIZER was cut 2026-09-05, James: "harder to fly rather than
  helping"; the LANDING RADAR was cut 2026-09-06, "makes the experience and
  flying worse"; never bring either back), `techEarnedBy` (good/perfect on ≥4X; the
  last piece a perfect on a 5X), crash pops the newest. The renderer only
  draws what `view.tech` says (`buildTech`); the shell owns engagement of the
  auto-throttle (`autoOn`: one tap of W under `AUTO_ALT`, any flight key
  releases) and the shock-leg squash spring. `autoLever()` is pure and
  sim-tested — put new tech physics in the core.
- **Fuel pads** are a flag on a pad (`pad.fuel`); the refill lives in
  `resolveContact` (`FUEL_PAD_REFILL` / `FUEL_PAD_PERFECT`) and the result
  carries `fuelPad`.
- **The structures** (`structures.js`, global `LunarStructures`, loaded
  BEFORE the core): pure segment lists in feet, origin at the ground centre;
  `w`×`h` is the solid footprint; `cls` civ / open / hard; `mult` 0–5;
  `hard` overhang / ridge / door / shield; `d` is the depth and `solid(id)`
  the extruded 3-D wire model ([x0,y0,z0,x1,y1,z1], cached) for the TANK
  side; THIS side draws the flat profile only (James, 2026-09-06: the
  foreshortened back face looked "weird and blurry" — keep them 2-D here). The core seats them in
  `makeChunk` (hostiles first, then civilians; chunk 0 civilian only; each
  footprint flattens the ground; clear of pads, aprons, the 130 ft launch
  lane past every apron, and mountains) as `chunk.structures`
  ({id, name, cls, mult, hard, x0, x1, y, h, k, sid, alive}). SOLID: `step`
  crashes the ship on any point inside a live footprint (`reason` 'struck',
  `result.struck`). Both renderers draw from this file — the tank session
  imports it; never author a building anywhere else. The renderer also
  scatters hashed civilian silhouettes on the far line (decoration only).
- **The weapons are core rules** (round two, 2026-09-06): `LOADOUT` /
  `AMMO_MAX` / `PAD_SUPPLY`, `targetable(state, st, weapon)` → { ok, why }
  (the why IS the tag's word), `fire(state, weapon, sid)` → { ok, why,
  events } (the laser resolves in the call; a missile flies in `state.shots`
  via `stepShots` every step), `dropChaff`, `damage` (shield hp then dead,
  `world.version++` so the static lines rebuild), the level goal
  (`hostilesLeft` over chunks 1..`LEVEL_CHUNKS`, `levelClear`, the relay
  promised at `createGame`, `result.levelDone`). Rolls come from
  `rollW(state)` — hashed seed + counter, never Math.random. Pad supplies
  ride the same carry as fuel (`chunk.wdrought`). The shell only arms,
  hovers, selects and calls fire; never put a rule in it.
- **One feel, levels not selections** (`FLIGHT`, 2026-09-06): there is no
  `DIFFICULTY` any more; `state.level` starts at 1; physics never change
  between levels.
- **The moon is endless and chunked** (`makeChunk`, `getChunk`,
  `chunksBetween`, `padsNear`; `CHUNK_W` 4000): chunks hash from the seed
  and index, meet at hashed seam levels, and live in `state.world.chunks`
  for the whole life. Never reintroduce wrap; never regenerate a chunk the
  player has seen. Anything that needs ground or pads asks the STATE
  (`groundAt(state, x)`), not a terrain object.
- **Each chunk is zoned** (`chunk.zones`): maria, plateaus, hills, mountains
  (1–2, never adjacent, rising from the higher neighbour, capped at 1250 ft),
  rough (rationed by selection). Pads go on flats first, then hills, never a
  mountain; every pad has a flat 150 ft APRON to its right for the
  accelerator. The sim's TEST 10 guards the shape.
- **Deals** (`chunk.deal`): standard / sparse / rich / dry / jackpot, rolled
  per chunk; chunk 0 always standard. The deal picks the PADS only. Which
  carry fuel is **the fuel drought** (2026-09-05): pads walked in flight
  order across seams, each rolling fuel at `FUEL_ODDS[run of dry pads so
  far]` (0.15 → 1.0 at four; dry deal halves, rich ×1.25, jackpot promises a
  5X). `chunk.drought` carries the count to the next chunk via `getChunk`,
  which builds k−1 first — never generate a chunk without its carry. Tune the
  `FUEL_ODDS` ladder, then re-read TEST 11's drought line (share ~38%, no run
  of five).
- **A pad pays once per life** (`pad.used`, `result.reused`): no points, no
  tech, refuel still. `world.version` ticks on use — the renderer and the
  labels key their rebuilds on it.
- **The launch** (`newAttempt` → phase `launch` → shell sequence →
  `launchFire(state, angleDeg, apexFrac)`): the shell owns the timing
  (slide/tilt/fire) and the drawing (`view.launch`); the core owns the exit
  velocity (coasts to apexFrac × `LAUNCH_HEIGHT` above the pad, no fuel).
  Angle and apex are PLAY dials. **The launch aims clear**: `launchAngleFor`
  steepens the pilot's angle in 5° steps until `launchClear` says the coast
  misses the ground over the top — the shell must tilt to the aimed angle,
  never the dial's. A crash or the drive-through drops in above where the
  flight ended (`RESPAWN_ABOVE`).
- **The wide camera follows the ship** through the core's `cameraFollow`
  (dead zone ±20% of the view, ease tightening toward the edge). It is pure
  and sim-tested for one-way motion — keep any follow change in the core.
- **The flight line is the truth**: physics stay in the x-y plane at z = 0;
  the near and far lines and the lander's yaw never move a collision point.
  The flight line is the brightest ground line; pads brighter still.
- **The lander is drawn larger than true** — 1.76× in the wide view, 1.0× on
  approach (`ds` in render3d.js; James cut it 20% before his round-three flight) — so it is never a smudge; collision points
  never change. Feet still land inside the narrowest pad at 1.25×.
- **The lander's outline is James's**: two stages (pod over descent stage),
  taller than wide, a drawing not a solid. He rejected flattening it. Change
  the outline only on his word; never change flying behaviour for a look.
- **The direction indicator is a faint circle + triangle**, far out (60 ft ×
  ds), barely visible (`ringBright`), the triangle only 1.2× the ring — "a
  visual aid, not part of the ship." Never an arrow (rejected twice).
- **Ground lines: three** (farther / far / flight). James asked for the third
  back layer explicitly; the front (near) line was CUT 2026-09-04 when the
  pulled-back view exposed it ("weird looking") — its empty batch keeps the
  draw order. Stars tile three times around the camera; the wide view zooms
  below 1× (to 0.3) to keep a high ship on screen.
- **Space burns like W**; the abort is X. Nothing else may claim Space in play.
- **The start gate** (house rule from Surround): boot lands in attract with the
  card; only START begins a game; result cards gate every next flight; the
  game never runs on its own.
- **Camera restraint**: eased zoom, ≤3° bank, no shake ever (James gets motion
  sick). The crash has a slow-motion beat (0.18× easing back over ~0.7 s).
- The secret flat (35% of attempts, a 64 ft strip that is not a pad): landing on
  it gently is its own outcome, no points, and the drive-through appears. Keep
  it a secret — no marker, no mention on the card until it is found.
- Sound is Web Audio synthesis only: the engine is filtered looping noise
  opened by the thrust, the altimeter beeps quicken under 300 ft, crash /
  landing / abort / secret are envelopes. No samples.
- Tuner has two tabs. PLAY (selection, fuel, gravity scale, throttle attack,
  zoom on/off, moonscape seed) — selection / fuel / seed take hold at the next
  START. LOOK (14 render knobs) is live and file-backed: presets go to
  `assets/presets.json` through `PUT /api/worlds/lunar-lander/presets`, so
  **saving a preset is telling Claude**. The DOM chrome tints itself from the
  look's hue/saturation (`--ph` on the root).

## Renderer notes (hard-won)

- **Lines MAX-blend, never add** (`MaxEquation` on every LineBatch). Additive
  was the 1979 tell James rejected: overlaps and corners stacked into blur
  and dots. If a new pass needs stacking, it is wrong for this world.
- **Glow is an edge softener, not the finish**: one half-res bloom level,
  threshold 0.6. Do not bring back the three-level summed halo.
- **The ship is an object**: back edges dimmed (0.38) in the dyn batch, front
  edges heavier (1.3×) in `shipBatch`, body hull fill under the lines. New
  ship geometry must go through `edge()` so it classifies.
- **The 2026 look list** (James's ask, 2026-09-04): 1 max-blend, 2 tight
  glow, 3 ship as object — BUILT; 4 palette off phosphor green, 5 motion +
  feedback register — awaiting his look and go.

- **Line quads wind either way** depending on the segment's direction — the
  line material must stay `DoubleSide` or every rightward segment is culled.
- **The canvas measures 0 in a hidden pane** at construction, so `render()`
  re-measures every frame (window first, then the canvas) and resizes when the
  size changes. Never write the canvas's CSS width/height from JS — a 2 px
  first measurement got pinned that way and the page stayed 2 px forever.
- **Draw order is the occlusion model**: every mesh is `transparent: true`
  with an explicit `renderOrder` (stars 0 → farther fill/line 1–2 → far
  fill/line 3–4 → flight fill/line 5–6 → near fill/line 7–8 → body fill 8.5
  → live things 9 → ship front edges 10). The
  fills are opaque black `MeshBasicMaterial` strips down to `FILL_FLOOR`. An
  opaque material would leave the transparent queue and break the order.
- Fog fades by view distance (`uFogA`/`uFogB`); the stars sit past the fog
  floor and are brightened to compensate.
- **The frame clock is clamped both ways** — a negative dt (a resumed tab, a
  synthetic pump) blew the throttle easing up to 1e41 once. `frame()` clamps
  dt to [0, 0.1].
- The renderer holds the core's state (`setWorld`) and builds its static
  lines for the three chunks around the camera (`_syncStatic` keys on chunk
  + world version + look params + the launching pad). Parallax ranges are
  per-chunk with hashed seams (`_range`). Stars re-lay around the camera.
  There are no wrap copies any more — a `dx` loop over `[0]` is a leftover
  of that era, not a bug.
- Fill-rate: the chain is ~8 full-screen passes; the buffer is capped at
  `PIXEL_BUDGET` (2.9M px) with a `res` slider. Don't remove the cap.

## Not built yet (the feature round, James's picks)

Candidates named in the plan: multi-stage descents, a moving pad, meteor
showers, fuel crates, a co-op tow mode, terrain sets (crater field, lava plain);
surface dressing (craters / wreck / flag / beacons), Earth in the sky, meteors,
a drone bed + radio chatter; touch controls; an attract-mode demo flight (the
sim's autopilot is ready for it); drift exits + ship wiring.
