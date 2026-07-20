# Changelog — Arachno-Wars 2000

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-19 — Claude (with James) — HUD line-weight pass + clean practice range

Direction discovery, logged for the next session: James found that unrestricted rapid-fire
in practice mode ("strings on strings of weapons") is the fun. The game wants to be "me
against the world" — massive blasting vs many enemies, not 1v1. Open questions (replace
the duel or add a third mode? enemy types? per-weapon fire-rate governor?) are in the
repo CLAUDE.md todo — discuss before building.

- Practice range spawns no decorations (boulders/hoodoos/trees/grass) — `spawnDecorations()`
  bails in practice mode; silk-bridge structures still build since they're added at fire time.
- Armor arc and power ring stroke width 4 / 3.5 → 2 (they render heavier under camera zoom).
- Active-tank chevron shrunk (14×9 → 9×6, bob amplitude 3 → 2).
- Idle breath bob halved (0.0032 → 0.0016): the hull's glowing waist seam was shimmering
  bright/dim about every ¾ s as the 1px seam crossed pixel boundaries; James wanted it slower.
- Burst run + momentum flight: double-tap A/D sprints for ~0.6s (`RUN_TAP_MS`/`RUN_FRAMES`/
  `RUN_EXTRA`, eased in/out via `runBoost()`, re-tap to renew; costs move budget at the
  boosted rate in turn modes). Ground speed is captured as `moveVx` and handed to a new
  airborne momentum channel `vx` on any takeoff (W jump or SHIFT lift), so run + jump/
  thrust = a rocket-boosted leap; momentum bleeds at `AIR_DRAG` 0.995 and zeroes on
  landing. Sim: walk jump carries ~94px, full-run jump ~243px. W double-tap unchanged.
- Shields are now real: `shield`/`maxShield` (250) on each tank, full at spawn; damage in
  `applyBlast` drains shield before HP (damage text still shows the total). Visualized as
  an energy sphere (R=46, `drawShieldSphere`) that dims as it drains, ripples on hits, and
  vanishes at zero. The 8-segment chitin arc stays as HP. The old power ring is replaced by
  a small dashed orange line under the hull (`PWR_W`, readout beside it). Note: the AI's
  was-I-hit check reads HP only, so it won't react while its shield soaks hits.
- Flight forgiveness: fuel burn 0.9 → 0.55 (~3s of lift); the one-shot retro-burst became
  continuous auto retro-braking near the ground (re-armed every frame while descending
  fast within vy×10 px) — sim-verified: hop, boosted jump, and 190px drop all land at
  1.6–1.8 px/frame (old raw hop hit at 9.5).
- Thrust smoothing: SHIFT lift now runs through a smoothstep power envelope (`thrustT`,
  ramps in over ~0.37s, fades out over ~0.27s after release) instead of snapping to full
  accel; climb cap 5.5 → 3.2 px/frame, accel 0.75 → 0.62. Verified by Node sim: steady
  controlled climb, ~40px of coast after release, no more rocketing off the top of the
  screen. New tuning knobs THRUST_RAMP / THRUST_FADE beside the other thrust constants.
- Hull/barrel body tint: the black-carbon part sprites were swallowing the dark legs, so
  they're now screen-composited with a per-player colour at draw time (cached offscreen
  canvases, `tintedSprite()`). `HULL_TINT` next to `TANK_PARTS` is the one knob:
  player #053959 (deep blue), computer #36470F (olive). Applies in-game and on the menu
  tanks; emissive accents keep their brightness.

## 2026-07-15 — Claude (with James) — session 2: the tanks

Roadmap #10 (per-part black carbon re-render) + #19 (whip-leg motion language) shipped
together — the first two stepping stones of `spider-vision.md`.

- **2500-series part layers** (`tmp/arachno-wars-2000/build-tank-2500.py`, headless Blender →
  `assets/tanks/`): black carbon hull with the turret ball baked in — wide low lens, glowing
  waist seam, cockpit eye-slit, top deck, rear vents, hip sockets, underslung keel, antennae —
  in THREE damage states (pristine / cracked / wrecked: gouges, molten rents, bent-then-dead
  antennae, popped panel, soot), plus the barrel as its own articulating layer (root joint,
  thin tube, accent ring, muzzle bulge). Per team: teal/amber accents on black. View transform
  set to Standard so the emissive accents keep their color (AgX washed them white). Alignment
  contract: hull image center = turret-ball center = `getMountPoint()`; barrel root/tip at
  known image fractions, scaled in-game so root→tip = `BARREL_LEN`. Old `tank-body-*.png`
  lozenge sprites are no longer referenced (files left in place).
- **Whip-leg motion language** — the sinusoid gait is gone. Legs are now world-space 2-bone
  IK chains (`legIK`, `drawWhipLeg`) from low hull hips to needle-tipped feet PLANTED on the
  actual terrain, with the signature curve (`whipCurve`): slow reach with an anticipation
  dip, then the tip whips the rest of the way and stabs in, tiny overshoot included. Runs
  everywhere: distance-driven alternating-tetrapod walk gait, staggered fast re-grips on jump
  landings, slow creepy idle single-leg re-grips, and crater scrambles — blast the ground
  near a tank and its legs re-grip the new surface. Legs finish their step when walking
  stops. Femur→kinked tibia→hairline needle taper per Spider_Tank_2.png; legs darkened to
  near-black; far-side legs draw behind the hull, near-side in front.
- **Hull presentation**: idle breathing (hull bobs ~0.5px above planted feet — the IK legs
  absorb it), recoil flinch on fire (hull kicks back along the barrel line, barrel slides
  back in its socket, legs hold their grip), and HP-driven damage states (>62% pristine,
  >28% cracked, else wrecked) swapping the hull layer live.
- **Menu tanks** rebuilt on the same part layers and leg system — deterministic staggered
  idle re-grips, breathing, steady raised barrel. **Spiderlings** inherit a cheap whip-scuttle
  (slow creep, snap back, needle tips).
- Verified: `node --check` clean; renders eyeballed layer-by-layer (teal + amber, all three
  damage states, barrel). NOT yet play-tested — James should judge: leg cadence and whip
  snap (`GAIT_CYCLE_PX`, `whipCurve`, step durations), hull size (`HULL_DRAW_W = 70`), and
  the render art itself (seam/slit brightness, damage-state readability). The Blender script
  is parametric — art notes turn into quick re-renders.
- **Practice range** (same session, James's call): a PRACTICE button under START (key P).
  No game in it: gentle rolling terrain (noise flattened to 35%, no central mountain),
  no coin toss, no turns — `mode='practice'` stays in PLAYER_TURN forever. Unlimited
  move budget, fire at will — the projectile/
  crawler/beam step was factored into `updateProjectiles()` so it runs live inside
  PLAYER_TURN and movement stays hot while shots fly. The dummy tank never acts and
  respawns on its pad at full HP once the fireworks settle (so does yours, if you
  splash yourself). Move track and jump pips hidden on the range. R restarts the
  range; ESC back to menu. Side fix: tanks no longer get yanked to the ground if
  they were airborne when a shot resolves (snapToGround now respects `inAir` in the
  shared projectile step).
- **Jump / flight split** (same session, James's spec — supersedes the double-jump AND the
  practice range's jump-at-will): W is JUMP only — tap = the little hop (`JUMP_POWER`),
  quick double-tap inside 280ms = ONE bigger boost (`JUMP_BOOST` replaces the launch
  velocity — an upgrade, never two stacked hops); any later mid-air W does nothing.
  Flight is SHIFT: hold for rocket thrust (lifts off the ground too) burning a fuel
  meter — ~1.9s of lift, cuts out dry, refills on the ground (~1.2s) and each turn.
  Slim vertical fuel gauge beside the hull (accent color, red under 25%, hidden when
  full) replaces the jump pips. Coming down fast (landing speed > the small hop's, so
  raw hops stay crisp) triggers ONE automatic retro-burst — vy bled ~20%/frame to a
  3px/f float — and touchdown scales the leg-catch: wider stance splay, faster whip
  stabs, and a crouch-absorb dip on the hull, all scaled by impact speed. Thrust and
  retro draw the red-orange keel plume from Spider_Tank_2 (white-hot core, flicker) —
  spider-vision stone #3 (rocket boost) is now in the game. Thrust has no sound yet:
  it wants a Web Audio synth loop (continuous/parametric per the audio rules), next
  audio pass.
- Where things stand: climbing arenas (#18) is the next big stepping stone; #11 real
  spiderling sprites could reuse the part-layer pipeline. Thrust loop audio pending.
  James to feel out: boost window (280ms), fuel burn/regen rates, thrust accel, retro
  threshold/strength.

## 2026-07-15 — Claude (with James)

Biome arenas: James delivered GPT-generated layer sets for three new biomes; every match now
rolls a random arena. Later the same session: new music in, menu simplified to one button.

- **Vision recorded**: James's north star — intelligent carbon-metal spiders, whip-leg
  motion, side-scroller missions — written up in `spider-vision.md` from his words + his
  three Procreate drawings (`assets/reference/Spider_Tank_1/2/3.png`). New roadmap #19
  (whip-leg motion language) is the nearest stepping stone; #10/#16/#18 updated to serve it.
- **Turret rework** (James's reference screenshot + 2500-series brief): the barrel now
  articulates out of a round ball mounted on TOP of the mid-hull — in-game and on the menu —
  instead of floating at hull-centre among the legs. `Tank.getMountPoint()` is the single
  source of truth (draw, fire, beam, AI solver, aim HUD all measure from it). Barrel
  slimmed with a slight muzzle bulge. Player aim is clamped so the barrel never sweeps
  more than ~8° below the hull plane (blocks only downward motion, so body tilt can't trap
  it). Menu tanks: wider/taller leg arches, hull sits lower, turret stable (no sway).
  Full 2500 design brief + the climbing-arenas vision (overhangs, C-shaped croppings,
  height-advantage beam duels) recorded in `overhaul-roadmap.md` (#10, new #18).
- **Music restored**: James's ElevenLabs track "Angular Ritual"
  (`assets/music/Angular-Ritual.mp3`) wired in exactly where the vetoed chiptune sat —
  looping media element, its own "Music" slider on the shared sound control
  (default 0.5 after a quick listen), autoplay gated by the control's start promise.
- **Menu simplified to one big START button** (James: 2-player is pointless for now, not
  within Elastic Space anyway): pulsing gold button centred under the title, clickable with
  hover cursor; Space/Enter/T also start. Always training mode vs the computer — `mode` now
  defaults to `'training'` and the V binding is gone, but all the pvp plumbing (turn logic,
  P2 strings) stays for whenever 2-player returns.

- **Four biomes live**: Twilight Canyon, Snowy Pass, Volcanic Wastes, The Bog. `BIOMES` in
  game.js holds each arena's parallax folder plus the full palette the procedural ground is
  rendered with — terrain gradient, strata bands (volcanic gets two glowing ember seams),
  per-column noise, surface edge/rim, pebbles, boulder/spire rock colours, and a per-biome
  flora list (bog is web-heavy, volcanic is charred ocotillo and spires, snowy leans pines).
- **Random arena per match**, never the same twice in a row; the arena name rides the coin
  toss ("SNOWY PASS … TOSSING"). Layer images are cached per biome and only fetched on first
  use; missing layers fall back to a solid biome colour (twilight falls back to the old
  bg.png plate).
- **Chroma pipeline hardened**: `tmp/arachno-wars-2000/chroma-key.py` now auto-detects biome
  folders (drop a folder → rerun → done) and writes PNGs with its own encoder — bpy's
  `Image.save()` silently dropped the alpha channel on one input (bog came out 24-bit RGB),
  so the script no longer trusts it. All eight far/mid layers verified: transparent sky
  (A=0), opaque terrain, straight alpha.
- Verified numerically in the browser (screenshot capture was hanging): per-biome canvas
  pixel samples confirm painted skies and matching ground palettes render for all four; zero
  console errors. James still to eyeball the palettes in play — the four terrain palettes are
  my numbers, not his eye, and he has final say.
- Where things stand: bog flora could use bespoke swamp plants (cattails, glowing fungi) and
  snowy could take falling-snow particles — both fold into roadmap #5 (aftermath/atmosphere
  particles). Night-sky variants per biome (#4) remain open.

## 2026-07-14 — Claude (with James)

Round 1 of the contemporary overhaul (full plan in `overhaul-roadmap.md`, numbering fixed there):

- **Parallax background (#17)**: James GPT-generated a twilight-canyon biome set
  (`assets/worlds/twillight/` — sky, far, mid). Far/mid arrived on chroma green; keyed to
  transparency via headless Blender (`tmp/arachno-wars-2000/chroma-key.py`, Non-Color
  colorspace so the palette survives untouched; `*-source.png` keep the chroma, Wildflowers
  convention). Three-plane parallax with per-layer pan/zoom factors replaced the single
  `bg.png` (kept as fallback). Prompts for snowy/volcanic/alien-bog biomes are written and
  in the 2026-07-14 chat.
- **Dynamic camera (#1)**: eased pan/zoom rig — pushes toward the active tank while aiming
  (1.14×), follows the shell in flight (1.26×), punches in on impact, clamps to world bounds.
  Mouse picking converts through the camera (blimp stays clickable).
- **Impact juice (#2)**: screen shake scaled to blast radius, white flash on big blasts,
  killing blow gets 0.3× slow-mo + 1.65× zoom via a step accumulator in the main loop
  (camera and draw stay 60fps).
- **Explosion/muzzle lighting (#3)**: additive radial lights on every blast, muzzle flash,
  and beam terminus; subtle vignette overlay.
- **Diegetic HUD (#6/#7)**: the 100px monospace bar is gone. Power = charging ring at the
  hub; aim = ghost arc of the first ~26 physics steps (beam gets a dashed guide); angle
  readout floats at the barrel tip; move budget is a track under the tank; jump pips;
  HP = 8 chitin-plate segments arched over each hull that flake off as shards; floating
  damage ticks. Weapons + EJECT live in a slim translucent strip bottom-centre (click or
  keys 1-6). AI "thinking" is dots above its tank now, not a centre overlay.
- **Typography (#8)**: Bahnschrift-condensed system stack for display type (kinetic sliding
  turn banners, menu title, game-over), Bahnschrift/Segoe for UI numbers. James has final
  say on the face. Removed `image-rendering: pixelated` from the canvas.
- Verified: `node --check` clean; served run shows zero console errors; forced-frame pixel
  sampling confirms all three plates render, camera follows a full AI turn, splash damage
  ticks, plates crack (8→2 spawns 18 shards). The preview pane's frozen-rAF quirk means it
  was stepped manually — James should give it a real play in Chrome.
- **Controls rebound** (same day, James's request): movement is now all W/A/D (A/D walk,
  W jump) and the arrows are all gun — ←/→ aim, ↑/↓ power. Aim arrows work in screen
  direction for both players (← always swings the barrel tip leftward; the barrelAngle
  delta is mirrored for P2). Legacy -/+ and bracket power keys still work. On-screen hints
  in the HUD strip and menu updated to match.
- **AI difficulty warm-up curve** (same day, James: "at first it needs to be easy so its fun
  to play"): the computer now ramps from sloppy to sharp across ~8 firing turns. Early turns
  it deliberately solves for a near-miss beside the player (~51% chance turn 1, 60–180px
  offset, decaying to 20%) and its intended hits carry hand-wobble (±0.09 rad angle /
  ±16 power turn 1, fading to ±0.02 / ±4). Solver, arc-safety rules, and panic-shot
  behaviour untouched. Tunables: `skill = min(1, aiTurnCount / 8)` in `aiAct()`.
- **Camera toned way down** (same day, after James's play-test — the round-1 camera was
  literally motion-sickness-inducing): aiming now frames BOTH tanks (midpoint, 20% bias
  toward the active tank, zoom capped 1.0–1.08 and only above 1.0 when the tanks are close),
  flight-follow is the projectile centroid at 1.06× instead of chasing the last bomblet at
  1.26×, impact punch 1.16×/1.06× (was 1.55/1.34), kill slow-mo zoom 1.22× (was 1.65),
  easing roughly halved (`CAM_EASE_XY` 0.045, `CAM_EASE_Z` 0.035), shake halved and smoothed
  toward its random target so it rumbles instead of vibrating. Rule going forward: the
  player must always be able to see the enemy tank while aiming.
- **Battle music removed** (same day, James's call — the 07-13 chiptune loop was unbearable):
  `music-battle.mp3` deleted, `musicEl`/music-channel code stripped, sound control back to a
  plain SFX attach with no second slider and nothing to autoplay. James will generate a
  replacement track via ElevenLabs later; when it lands, restore the media element + the
  `channels:` music slider (the sound-control support is still there, see 07-13 entry).
- Where things stand: rounds 2+ live in `overhaul-roadmap.md` (wind, supply drops, AI
  personalities, sudden death, night arc, tank re-renders, more biomes). The 22 SFX are
  unchanged and still awaiting James's curation pass from the 07-13 session.

## 2026-07-13 — Claude (with James)

Big cleanup pass on James's direction: make v1 actually fun.

- **Bomblet bug fixed**: `spawnBomblets` ignored the parent shell's velocity and always burst
  up-left; bomblets now fan forward around the parent's heading with inherited momentum.
- **Six weapons**: Shell, Bomblets, Rocket, plus new **Beam** (hitscan lance that melts a limited
  depth of rock — `BEAM_BURN_BUDGET`), **Egg Sac** (one squashy bounce, then hatches 3 spiderlings
  that crawl at the enemy and pop), and **Silk Bridge** (raises a walkable strand across a gap,
  drawn as silk over the surface). Keys 1–6; AI uses Shell/Bomblets/Rocket/Egg Sac.
- **Audio**: all sfxr/Web Audio synthesis replaced with 23 ElevenLabs assets in `assets/audio/`
  (22 SFX + a cheeky chiptune battle-theme loop). Music rides a separate volume channel — the
  shared sound control (`src/core/sound-control.js`) gained backward-compatible `channels:`
  support rendering a labelled second slider. First-pass sounds; James curates by ear.
- **Terrain/flora**: dark purple stripy foreground replaced with warm canyon rock matching bg.png
  (surface-anchored gradient, wavy sedimentary strata exposed by craters, sunlit rim). Old
  childlike pines/cacti/mushrooms replaced with junipers, ocotillo, agave, dusty scrub, dry
  bunchgrass, rock spires, and small strung webs.
- **Tanks**: teal (P1) / amber (P2) per James's reference art. Blender-rendered striped lozenge
  bodies with dome + antennae (`assets/tanks/`, build script `tmp/arachno-wars-2000/build-tank.py`,
  headless); legs stay procedural — now 8 long harvestman legs arching above the hull. Barrel is a
  long dark leg-cannon (`BARREL_LEN`).
- **Exits** (replacing the corner cobwebs): a clickable blimp crossing the sky; an archery
  bullseye with an "OUT" sign behind each tank — hitting one with any weapon drifts onward; and a
  fifth HUD card, **EJECT** — click it, the canopy blows, the little guy flails skyward, drift.
  All route through a hidden `data-drift` anchor so drift.js picks the destination.
- Where things stand: shipped as first pass, syntax-checked but not yet play-tested by James.
  Sound set and music are ElevenLabs first drafts awaiting his ear. Tank sprite could get more
  mechanical detail (under-rig, hip hardware) in a later Blender pass. The Phaser rewrite lives
  on separately in `arachno-wars-two`.

## 2026-07-12 — Claude (with James)

- Unarchived Arachno-Wars 2000 (James's original one-session artillery game proof-of-concept,
  previously at `C:\Users\brook\ai-projects\_archive\arachno-wars`) and made it an Elastic Space
  world. Game code is untouched except for audio integration.
- Integrated the shared chrome: dashboard icon, sound control, drift. All game audio (jsfxr
  one-shots, Web Audio rumble and shell whistle) now gates through the shared speaker button's
  on/off and volume state via a small `esSound` shim in game.js.
- Added three diegetic drift exits: faint corner cobwebs (top-left, bottom-left, bottom-right —
  top-right belongs to the dashboard/sound icons). They brighten on hover.
- Registered the world (`npm run registry`) and added it to the map room's Pages list.
- The active sequel project remains `ai-projects/arachno-wars-two`; this world is the finished v1
  and is not the codebase going forward. Original design spec: the archive folder's `HANDOFF.md`.
