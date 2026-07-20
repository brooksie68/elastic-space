# Changelog — The Orb Dimension

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-19 — claude-fable (v46 — mouth globe removed)

- James pulled the v45 mouth globe after seeing it ("that's my fault, just
  take that out") — makeMouth() and its wiring removed clean. The eyes and
  the mouth's warm shader pulse (v27) are untouched. Stamp v46.

## 2026-07-19 — claude-fable (v45 — the red globe in Korrudan's mouth)

- Per James: a red globe up inside the roof of the mouth. Palate located by
  probing skull.bin for downward-facing normals in the mouth region
  (canonical centroid 0,−117,155); the globe (r=100, flag-3 red like the
  eyes) seats at world (0,−361.6,513.5) — nested up into the bone by the
  depth test, glowing down into the mouth, pulsing on the old Heart's 7s
  beat. Visible from spawn as a red star inside the open jaw (flag 3 carries
  the star-size floor). It does not gaze-track; only the eyes do. Stamp v45.

## 2026-07-19 — claude-fable (v44 — impulse coasts)

- James: releasing W at 120 m/s in space should not be a wall. Impulse now
  has its own velocity state: quick ramp while held (τ 0.5s), and on release
  it coasts on the same 3.2s constant as the thruster — forward and reverse
  alike. X (all-stop) bleeds it fast like everything else; H zeroes it; the
  autopilot's release point accounts for impulse + thrust coast distance.
  The instant stop is gone. Stamp v44.

## 2026-07-19 — claude-fable (v43 — N toggles NAV, lock-on autopilot)

- N toggles the NAV panel from the keyboard (any other key hands control
  back — see below).
- LOCK-ON, per James's spec: with a target ringed, hold the nose on the ring
  (the existing ~3° lock) for 3 continuous seconds → the ring ARMS (bright,
  breathing). Click inside the armed circle → autopilot: the nose eases onto
  the course (0.5 rad/s cap), nav-assist thrusters cruise at up to 900 m/s
  (distance/8, floor 140 — no tank drain), mode line reads AUTO, ring shows
  a steady double border. Release point = standoff + |thrust|·3.2s (the
  coast time constant), so the ship cuts power one coast-length out and
  drifts to a stop at the doorstep: 2600m off Korrudan (the buffer edge),
  700m off a colony, dead on top of a fuel station (the flyover refuels).
- ANY control input cancels: keys (except N), mouse steering, H, X. Panel
  retarget also resets the arm/lock state.
- Controls card: N row + a lock-on explainer. Stamp v43.

## 2026-07-19 — claude-fable (v42 — spawn aims between the eyes)

- James: dead-on at the skull needs pitch −3 from spawn. Baked it: the spawn
  basis (and H-home) now loads with the nose dipped 3° — position unchanged
  at [0,0,20000], ATT honestly reads PIT −03, R levels to the true horizon
  as always. spawnBasis() is the one source of the starting orientation.
  Stamp v42.

## 2026-07-19 — claude-fable (v41 — spawn at z 20,000)

- Start position and H-home moved to [0, 0, 20000] — a proper long approach
  to Korrudan across the static space (face ~19.4km out; ~16s of overdrive).
- The load-in sight corridor stretched with it (z 0..20600, both the orb
  exclusion and station placement) so nothing parks in the view on the way
  in. Sim re-run: all 9 PASS (stations re-jittered around the longer
  corridor, forgiveness bars unchanged). POS Z placeholder updated.
  Stamp v41.

## 2026-07-19 — claude-fable (v40 — the parked-bank drift, solved)

- James pinned the "side-to-side coasting": bank the ship (A/D), stand still,
  and the view slides sideways forever at 0 m/s. That was the v26 coordinated
  turn carving heading at ANY speed — pure rotation, so the speedo was right.
- Fix: turn authority now scales with speed (|speed| / 120, capped at 1) and
  is zero at a standstill — wings need airflow. Held banks still sweep full
  circles the moment you're moving at impulse speed or better; a parked
  banked ship just sits there, tilted and patient. Stamp v40.

## 2026-07-19 — claude-fable (v39 — slimmer bays, button stack past the fuel gauge)

- All dash bays slimmed another notch per James (pods 11% → 9.5%, SYS 8.5%,
  FUEL 11.5%, cluster 22% → 19% / min 210px).
- NAV / TUNE / CTRL now stack vertically in the bay row itself, just past the
  fuel gauge — no longer floating at the console's absolute top right. Same
  instrument glass, tighter padding. Stamp v39.

## 2026-07-19 — claude-fable (v38 — impulse, fuel, NAV, and the space goes static)

Big approved batch (plan discussed, James: "love all suggestions", tanks doubled).

- FLIGHT: W/S renamed IMPULSE, 80 → 120 m/s, burns nothing, mode line shows
  IMPULSE. Overdrive 800 → 1200 m/s (engine drone rescaled to match). The
  controls card now says "reverse booster" for S + shift.
- THE SPACE IS STATIC: 48 × 48 × 12 km — the old slider maximums, now
  SPACE_X/Z/Y constants. Spread sliders and "the space" tuner group removed;
  sanitizeCfg() overrides stale saved presets. Defaults densified for the
  bigger volume (orbs 140 → 400, dust 1400 → 2200) and the veil patches
  doubled (r 3200–5200) to keep the same angular wall cover. sim.mjs updated
  to the new cfg: all 6 legacy tests still PASS.
- FUEL (forgiving by design): H2O tank feeds the booster (180s of continuous
  burn), deuterium feeds overdrive (120s). Dry tank = that drive refuses
  (ENG reads NO H2O / NO DEU; overdrive sputters out with the wind-down);
  impulse is always free — limp, never stranded. 64 water globes (knots of
  blue glass) + 36 deuterium depots (tight hot amber-green pulses) at seeded
  STRATIFIED positions — pure-random left 14km voids, the jittered grid
  caps the worst H2O gap at 9.7km (TEST 9). 150m flyover refills to full:
  two-note chime through the cave echo (water high/glassy, deuterium lower)
  + the meter sweeps up with a glow flourish. New FUEL bay (same glass) with
  H2O and DEU bars; they breathe amber below 25%.
- NAV: third deck button. Panel lists Korrudan (the Head), the globe-thread
  communities by name — Yth-Alune, Sorrek Bloom, Vhal-Imir — and
  water/deuterium (nearest at click). Click to target: orange ring on the
  item (edge-clamped off-screen, name + live distance beneath), pointer
  arrow orbiting the reticle toward its bearing; within ~3° the ring locks
  solid and the arrow stands down. Click again to clear.
- reef-sim.mjs grew TESTS 7–9 (station determinism/exclusions/forgiveness);
  extraction-marker gotcha: the markers also appear in doc comments — the
  sim anchors on `const STATION_SEED =` with an offset search. ALL PASS ×9.
  Stamp v38.

## 2026-07-19 — claude-fable (v37 — longer coast, X all-stop, deck buttons + controls card)

Three James asks in one pass (his fourth item — side-to-side coasting should
be shorter — is PENDING a numbered-question answer: there is no lateral
velocity in this flight model, so it's either the bank-turn carving during a
coast or the mouse-look ease; waiting on which before touching either).

- Coast: free-coast time constant 1.6s → 3.2s — releasing a burn now carries
  you roughly twice as long. The all-stop exists precisely so the long drift
  never becomes a nuisance.
- X = ALL-STOP: the clear "stop in space" control. Cancels overdrive (with
  the wind-down thump), bleeds thrust at τ 0.35s — fast but no head-snap —
  console reads BRAKE while it's working. Any fresh thrust input (shift,
  space, W, S) releases it.
- TUNE + CTRL are ship controls now: two buttons seated on the deck's flat
  run, upper right of the console, styled as small panes of the same blue
  instrument glass (same gradient, whitish outline, top sheen — per James,
  "just like all the other panels look, but these are just buttons"). The
  floating "tune" pill is gone. TUNE opens the tuner; CTRL opens a new
  controls card (right side, above the console): every flight control plus a
  legend of the console bays. One panel at a time — each closes the other;
  buttons blur after click so the space bar keeps toggling overdrive, and
  engaged buttons light like active instruments.
- Hint line now mentions X and CTRL. Stamp v37.

## 2026-07-19 — claude-fable (v36 — booster de-sirened)

- James: the shift booster sounded like a police siren / blowing hot air. Guilty
  parties: the 620→1500 Hz gliding sine "turbine whine" (that WAS a siren) and
  the sawtooth sub growl. Both gone. The booster is now a pure low rushing
  noise — white noise through a lowpass whose cutoff opens 180→480 Hz with the
  throttle, over a fixed 70 Hz noise bed for weight. Nothing tonal, no pitch
  glides; the reverse burn darkens the rush instead of dropping a tone.
  Overdrive's pulsing saws are untouched (different drive, different animal).
  Stamp v36.

## 2026-07-19 — claude-fable (v35 — compact console rows, the reef spreads)

James's pass on v34 (a couple minutes' look): panel rows fall too wide — labels
and values shouldn't be justified across the bay — and the reef earns more.

- Console rows compacted: no more space-between justify. Labels sit tight
  against their values (fixed 4.6ch label column so values still align down
  the glass), bays slimmed 14% → 11% (SYS 9.5%), the cluster capped at 22%,
  and the whole instrument group packs toward the center with the wings
  pinned at the ends — the bare deck between is deliberate open real estate
  for future systems ("we can use that space for other things later").
- THE REEF SPREADS: one colony → a species. REEF_COLONIES table: the flagship
  at [6600,−900,−5200] grown ~30% (12 trees, longer branches, 380 spores) plus
  two outlying patches at [−8200,600,3400] and [−2600,−1500,−8600]. Hidden
  exit stays flagship-only; NAV's REEF row now reads the NEAREST colony.
- reef-sim.mjs updated for multi-colony (extraction marker is now
  `const REEF_COLONIES`): 5905 points, deterministic, nearest-to-origin
  7723m, 0 corridor hits, max spread 893m, worst overdraw 2.6 screens, gaze
  clamp holds. ALL PASS. Stamp v35.

## 2026-07-19 — claude-fable (v34 — skull detail, engine sound, HUD readability, THE REEF, the gaze)

James's session brief: skull needs its detail back, engines need voices, HUD text
was unreadably tiny (plus he wants live position), and from the pitch list he
picked the Reef and the Gaze to build.

- SKULL NORMAL MAP: the Meshy source GLB carried a 4K normal map we'd been
  throwing away. Extracted raw from the GLB (Node, zero re-encode —
  `assets/skull/skull-normal.jpg`, 15.7MB) and sampled in the skull shader via
  a screen-space cotangent frame (no tangent attribute needed; UV flips absorb
  into B automatically). Fine sculpted detail returns at zero triangle cost;
  decimation stays 0.45. Optional load — missing file = v33 lighting. glTF +Y
  convention assumed: if bumps read as dents to James's eye, flip the green
  channel sign in perturb(). If he still wants more, next lever is decimate
  0.45 → 0.75 (~28MB bin).
- ENGINE SOUND: three synthesized voices on a new "engines" bus with its own
  channel slider (arachno-wars pattern). Thruster = cold-gas hiss (W/S).
  Booster = throaty sub-saw + noise + turbine whine climbing with the shift
  burn (and carrying the wind-down as thrust decays). Overdrive = detuned saws
  pulsing at 4.4Hz — a genuinely different animal — with an ignition thump +
  noise breath on engage and a low wind-down on disengage. Reverse burn (S)
  detunes everything to 0.82x so the flip is audible. All params move through
  setTargetAtTime from the frame loop.
- HUD READABILITY REDESIGN: same footprint philosophy (console cap 118 → 150px,
  ~7% of a 4K screen) but the type roughly DOUBLED: rows clamp to 20px, the
  speed number to 46px, everything gets a faint phosphor glow. Screens went
  glassy — gradient glass faces, top-edge sheen, cyan inner glow, rounded
  bezels. New POS bay (live X/Y/Z in meters, running as you fly) between the
  cluster and NAV; NAV gains a REEF range row. Wings slimmed to make room.
- THE REEF: a bioluminescent orb colony at [6600, −900, −5200] (~8.5km out) —
  nine seeded branching mineral growths (dim, desaturated nodes every 7m,
  tight 1.35x quads) crusted with 272 fast-pulsing polyps in five hue
  families, 300 drifting spores, and a pale exit orb nested at its heart (a
  hidden BONUS exit — the three near home stay canonical). Fixed world coords
  like the skull; spread sliders and wander can't touch it. Geometry is a pure
  function of REEF_SEED — identical every visit.
- THE GAZE: within ~6km the skull's red eyes track the ship — each eye drifts
  inside its socket toward you (48m clamp < the 53m measured bone clearance,
  slow 1/0.6s ease). Beyond range they relax to dead ahead. Cheapest possible
  haunting.
- Verification: `tmp/orb-dimension/reef-sim.mjs` extracts reefGeometry()
  VERBATIM from world.js and asserts: deterministic (2 runs identical, 2223
  pts), population budget, clears the KEEP-2400 buffer (nearest 7886m) and the
  sight corridor (0 hits), inside default flight bounds, worst in-colony
  overdraw 1.7 screens, gaze clamp ≤ 48m over 40k poses. ALL PASS. Stamp v34.
- Untested by James's eye yet: normal-map light direction, engine mix levels,
  HUD type scale, reef look from inside. All four are one-number tweaks.

## 2026-07-18 — claude-fable (v33 — bigger buffer + a clear sightline at load-in)

- Monument buffer widened: KEEP 1560 → 2400m (skull corner ~1370, so ~1km of empty dark
  around the bone in every direction).
- New corridor exclusion: a 950m-radius cylinder along the view axis from the buffer edge
  to just past spawn (z 0..6200) — orbs can no longer sit between the load-in camera and
  the face. Both zones sphere+cylinder sim-verified together, 40k trials, 0 violations.
  Dust motes still drift everywhere (atmosphere). Stamp v33.

## 2026-07-18 — claude-fable (v32 — eyes to 2x, head tilted back 5°)

- Eyes: radius 240 ("Yikes!") → 160 (double the original 80), same wide ±270 seats.
- The skull now tilts back 5°: rotation about X baked into the loader (positions AND
  normals, after the 3x scale), face lifted skyward. The eye fixed positions carry the
  same rotation ((±270,−45,570) → (±270,4.9,571.7)) — retilt them if the angle changes.
  Stamp v32.

## 2026-07-18 — claude-fable (v31 — eyes tripled and un-crossed)

- James: the red orbs read cross-eyed, hugging the nose. Radius 80 → 240, x ±180 → ±270
  (world m). Same y/depth. Update the comment's canonical socket numbers if re-measuring —
  the wider seat matches the outer halves of the measured socket holes. Stamp v31.

## 2026-07-18 — claude-fable (v30 — spawn to [0,0,5600])

- Another 2000m back per James (2600 → 3600 → 5600 over three requests; the skull's face
  is now ~4.76km from spawn, still well inside the 11.4km flight bound). H-home matches.
  Stamp v30.

## 2026-07-18 — claude-fable (v29 — spawn back again, monument clearance, red eyes)

- Spawn + H-home moved another 1000m back: [0,0,3600] (skull face now ~2.76km ahead).
- Monument clearance: assemble() pushes any orb within 1560m of the origin radially out to
  a shell just past the skull (corner radius ~1370m at 3x + wander margin) — the welcome
  ring (250–1000m) and near portals now form the inner shell around the monument. Dust
  motes stay as ember atmosphere (one-line change if James wants them out too); veils
  unaffected. Sim: worst post-push radius 1572m over 20k trials.
- THE EYES: two fixed red orbs (r=80, hues 2/357, sat 92%, slow 3.2s pulse) seated in the
  measured socket centers (skull.bin hole-map: canonical ±60,−15,190 → world ±180,−45,570).
  New instance flag 3 = eye: red-tinted shader branch + the heart's never-smaller-than-a-
  star clause, so the red gaze is visible all the way from spawn. o.fix positions are
  spread-slider-proof and wander-proof; socket bone partially occludes the glow (depth
  test) so they read as nested, not floating. Sim-verified seating (53–55m to bone).
  Stamp v29.

## 2026-07-18 — claude-fable (v28 — skull scale + quality fix, per James's drive-by review)

- James's two notes before leaving for a movie, both valid: (1) 600m at 2600m viewing
  distance subtends ~13° — reads like a nearby orb, not a monument; (2) decimation to 16%
  visibly faceted the bone up close ("looks like junk").
- Fixes: re-exported at decimate 0.45 → 579k tris (was 206k) with the full 4K basecolor
  (was 2K) — 22MB served total, fine locally; and the loader now scales positions 3x at
  parse (SKULL_SCALE const in world.js) → the skull stands 1800m tall, ~38° from spawn,
  face ~1760m away. Anisotropic filtering (x8) added for grazing-angle sharpness. Binary
  re-validated by the Node sim (579k tris, y ±300 canonical). Stamp v28.
- Untested by James yet (he's at the movies) — next session: judge scale and surface
  quality in-world; if 3x still reads small, it's a one-number change.

## 2026-07-18 — claude-fable (v27 — THE SKULL: a 600m fossil god at the center of the world)

- James's Meshy skull ("alien god skull v2", tuned by him on the canvas, 600m tall,
  exported to `assets/ref/`) now floats at the exact center, face toward spawn. Weathered
  bone, bronze-green metal veins, hanging jaw. It dwarfs everything, as ordered.
- Probes confirmed no surgery needed: the mouth is an open ring and the severed underside
  is open — fly in through the teeth, exit below. No collision (walls are ghosts, v1).
- Pipeline (`tmp/orb-dimension/skull_prep.py`, headless Blender): recenter on origin,
  decimate 1.29M→206k tris, export custom binary (SKUL magic, interleaved pos/norm/uv +
  u32 indices, Y-up world coords) + 2K basecolor JPG — 7.4MB total, down from 70MB.
  Node sim validates the binary exactly as world.js parses it (bbox/normals/uvs/indices).
- Rendering: new skull pass inside the world's own WebGL2 pipeline (NOT an overlay canvas
  — that lesson is learned). Context now has a depth buffer; skull draws first (opaque,
  depth-written), orbs then depth-TEST with writes off, so sprites clip behind bone and
  shine through the eye sockets. Shader: basecolor × (cool starlight key + faint fill +
  warm pulse breathing up into the mouth from below — the Heart's soul lives on) with the
  orbs' haze knob. Skull texture on unit 1; orb state handed back after each pass.
- The Heart orb itself is retired (assemble() no longer includes it; makeHeart() kept for
  lore). HOME readout + edge marker already pointed at the origin = the skull's center.
- Served-only enhancement: skull.bin needs fetch(), so on file:// the world simply has no
  skull. Known quirk: portal clicks ignore skull occlusion (can click an orb through bone).
  Stamp v27 (v26 was taken by the coordinated-turn build below).
- Next: James flies it — judge scale from spawn, lighting/pulse, whether mouth-transit
  wants collision or interior detail later. `assets/ref/` (70MB) stays gitignored?  — decide
  at wrap-up whether to commit the source GLB or just the prepped assets.

## 2026-07-18 — claude-fable (v26 — coordinated turn: banking is turning)

- James: no way to HOLD a turn — mouse steering runs out of desk, bank alone didn't
  change heading, so a full banked circle back to the start was impossible.
- Added the aircraft rule after the roll block: while banked, the ship carves around the
  world-vertical at TURN_RATE(0.5 rad/s) x sin(bank) — hold a bank, sweep a continuous
  circle; level (or R) and the turn stops. Node-sim verified: 45° held bank closes a full
  360° circle in ~18s with zero bank drift; left banks left, right banks right. Arrow keys
  still steer directly; mouse unchanged. Stamp v26.

## 2026-07-18 — claude-fable (v25 — REDIRECTION: spaceship retired, v17 viewscreen restored)

- James's call after flying the whole arc: no flying/shooting game here — too much work for
  the reward, and that road is all hard design decisions best made deliberately on paper,
  not prompted through. The original vision stands: a giant black space full of orbs to fly
  through, to be populated with Meshy-made wonders (doorways, big floating things, things
  on the ground below).
- Restored the v15/v17 viewscreen HUD character-for-character (dark canopy frame + gussets,
  canted machined deck, wings, stencil labels, inset screens): version archaeology via the
  earlier session's transcript confirmed v13=corner brackets (in git), v14=the "Claude
  Design" cards, v15=the hybrid deck James approved, v16/17=flight-only. All v18-v24
  cockpit work is OUT of the world: no three.js overlay, no C/V keys, no plate chrome.
- One upgrade kept, per James: the boresight reticle is now the full attitude instrument —
  the WHOLE reticle counter-rotates through 360° with bank (was: horizon bars only), so a
  barrel roll spins it all the way around inside the fixed canopy.
- Kept: spawn/H-home at [0,0,2600] (James: definitely better), v16/17 S-reverse flight,
  patched shared three loaders, `assets/ship/crescent-wishbone.glb` (beloved model, future
  set-dressing candidate?). Parked in `tmp/orb-dimension/parked/`: cockpit3d.js + the
  extracted chrome plates. Concepts stay in `tmp/orb-dimension/concepts/`. Stamp v25.
- Meshy round-trip pipeline (concept → James art-directs in Meshy → API pull → world) is
  proven and stays — that's the tool for populating the space going forward.

## 2026-07-17 — claude-fable (exterior view PARKED; interior is the focus)

- James's call: the exterior/ship direction is getting too complicated for a two-person
  team right now. The interior view — load in, fly around the orbs from inside a cockpit —
  is the original vision and is close. Exterior stays functional behind V (ship, plumes,
  lazy GLB load all keep working) but gets no further investment for now; leaving V now
  ALWAYS restores the interior cockpit even if it had been toggled off.
- Keep from this arc either way: the Meshy account→API→repo model pipeline, the GLB
  inspection/preview headless-Blender recipe, `assets/ship/crescent-wishbone.glb`, and the
  patched shared three.js loaders. Interior work continues from the v19 extracted chrome +
  v21 hard-lock doctrine.

## 2026-07-17 — claude-fable (v24 — ship orientation fixed: nose forward)

- James's v23 report: ship rendered in profile facing screen-left, plumes floating where
  the tail would be if it faced away. Root cause: the model's LENGTH runs along its X axis
  (nose −X, tail +X, pods ±Z) — v23 assumed nose −Z and never rotated it, and the nozzle
  scan hunted max-Z with a stale matrixWorld (pre-add, unbaked transforms).
- Fix: nozzles now scanned in ship-local coords (updateMatrixWorld before scale/rotate,
  tail = max X, cluster per z-sign); ship rotated −90° about Y so nose points −Z; plumes
  placed via the explicit local→rig map (x,y,z)→(−z·S, y·S, x·S), aft = rig +Z. Nose sign
  confirmed two independent ways (James's report; which Blender preview azimuth caught the
  thruster glow). Stamp v24.
- Still open from James's look: hull reads more silver than white (env/material tune),
  ship is rigid in camera space by design — consider a few degrees of input-driven lean.

## 2026-07-17 — claude-fable (v23 — exterior ship view: the Crescent Wishbone flies)

- James designed his ship in Meshy ("Crescent Wishbone Spaceship", image-to-3d) — pulled via
  the Meshy API straight into `assets/ship/crescent-wishbone.glb` (36MB, 294k tris, 4K PBR
  set + loose texture copies alongside). Headless Blender previews in `tmp/orb-dimension/`;
  hull reads dark there only because bare metal needs an environment to reflect.
- V toggles the exterior view: the ship rides 13.5m ahead / 3.4m below the camera, nose
  forward, rigid in camera space — the world canvas supplies all motion cues, so the chase
  cam needed zero changes to the world renderer. C still toggles the interior placeholder;
  GLB lazy-loads on first V press only.
- Engine plumes: nozzle positions found by scanning the mesh for rearmost vertex clusters
  per side at load; each gets an additive glow sprite + cone that scale with thrust (idle
  wisp → W → shift burn → overdrive 2.4x), light flicker, plus a point light so the hull
  catches its own engine glow. Pearlescent hull lit by a PMREM synthetic environment
  (space sphere + two light cards).
- Shared-lib note: vendored `src/lib/three/` loaders/utils had bare `'three'` import
  specifiers (mandala-shop resolved them via its index.html importmap). Patched all three
  files to relative `'../three.module.js'` so orb-dimension works without an importmap —
  same URL/instance either way, mandala-shop unaffected. Orb's index.html untouched.
  Stamp v23.
- Next: James flies it; tune ship offset/scale, plume look, maybe input-driven ship lean
  (into turns, never lagging); texture downsize before public ship.

## 2026-07-17 — claude-fable (v22 — spawn pulled back 1000m)

- Start point and H-home reset moved from [0,0,1600] to [0,0,2600], same heading (facing
  the heart down −Z). More approach room for the new cockpit. Stamp v22.

## 2026-07-17 — claude-fable (v21 — cockpit hard-locked to camera, lag removed)

- James flew v20: the camera-lag lean fought the arrow-key steering ("extreme odds against
  the wasd keys") and let the cockpit drift off the reticle. His spec, now law: the cockpit
  horizon stays LOCKED to the reticle at all times; a full barrel roll shows the world
  rolling around a rock-steady canopy, cockpit glued to the view.
- cockpit3d.js: all smoothing/delta/clamp code deleted; frame() just renders. The cockpit is
  rigid in camera space — the world canvas underneath supplies all motion cues. The 3D rig's
  continuing value: perspective depth now, ship GLB + exterior chase view next. Stamp v21.

## 2026-07-17 — claude-fable (v20 — 3D cockpit proof: transparent three.js overlay + camera lag)

- James called the flat plates' limit: a cockpit that stays screen-fixed through banks kills
  the illusion. New tactic agreed: real 3D cockpit, camera inside, eventually an exterior
  view too. This build proves the rig with a placeholder before any ship modeling.
- `cockpit3d.js` (new): transparent three.js canvas (vendored `src/lib/three/`) at z5 under
  the HUD, DPR capped 1.5. Placeholder cube-built cockpit matching the concept layout: two
  swept side struts, carbon console slab with five glowing frosted sockets, rear bulkhead
  ring so looking back shows cabin. Loaded via dynamic import from world.js — on file:// the
  module can't load and the flat v19 chrome simply stays (graceful degradation).
- Motion: the cockpit is rigid in camera space; the illusion comes from LAG. A smoothed
  basis (τ=0.15s) trails the live flight basis; the cockpit rotates by the delta, hard-
  clamped at 7° (motion-sickness restraint). Node sim with real three.js verifies: lean
  rises into a bank, saturates at 7.00°, decays to 0 within ~0.5s of leveling. C toggles
  3D cockpit vs flat plates (mode-3d class hides .ck-*/.vs-console-rig). Stamp v20.
- Next: James picks/draws the ship design; then Meshy image-to-3D exterior + interior
  (Blender fallback for the interior), GLB replaces the cube frame, exterior chase view.

## 2026-07-17 — claude-fable (v19 — chrome extracted from the chosen concept, supersedes v18)

- James rejected the v18 plates: the green-screen image-to-image pass had REGENERATED the
  design (fat beige struts, rope-like carbon weave, hallucinated grab handles) instead of
  converting it. Lesson recorded: every Meshy image-to-image pass is a redraw, not an edit —
  never use one to "convert" approved art.
- v19 extracts the chrome pixel-for-pixel from the approved concept
  (`tmp/orb-dimension/concepts/cockpit-concept-3-open-glass.png`) via flood-fill background
  keying (scipy label from frame edges, star despeckle, 0.8px edge soften) — `extract_v2.py`
  + `slice_v3.py`. Thin swooping struts, molded console, glowing sockets all survive intact.
- Slices: band crop y765 (the arch tops out ~y770), caps split at the socket gaps (x267/x772),
  strut feet masked so no band artwork rides along; struts now render ABOVE the band and
  overlap ~28px so the foot plants onto the console face. Verified by PIL-composited
  simulations at 1600x900, 2560x900, 900x1100 (`v3-assembled-*.png`). Stamp v19.
- Instruments: ATT / cluster / NAV mapped to the three middle sockets by native
  x-fractions; SYS absolutely positioned into the right cap's socket.

## 2026-07-17 — claude-fable (v18 — rendered cockpit chrome, Meshy pipeline)

- The dashboard-style dark canopy (flat struts, gussets, machined deck) is replaced with
  rendered art: pearlescent white metal struts + carbon-trimmed frosted-glass console band,
  concepted via Meshy (nano-banana-pro), chroma-keyed and sliced with PIL. Concepts and
  scripts live in `tmp/orb-dimension/concepts/`; production plates in `assets/cockpit/`.
- Resize scheme: struts anchor to the side edges and scale with viewport height (wider
  window = more open glass between them, no stretching); the console band is a 3-slice —
  sculpted caps at native aspect, middle slice stretches. Struts tuck ~46px under the band
  so the joint never seams. Chrome is ~80% open center per James's brief.
- Existing readouts (ATT / speed cluster / NAV / SYS) now sit as dark glass insets over the
  frosted band middle — alignment with the drawn sockets is approximate, instrument
  restyling (alien typography, weapons/shields panels) is the next pass. Old .vs-wing DOM
  kept but display:none. Stamp v18.
- Next: tune band height / socket alignment with James's eye, restore the pearlescent glow
  (CSS or a re-render), higher-res plates if 1024px source shows soft on big screens.

## 2026-07-17 — claude-fable (v17 — S reverses the boosts, supersedes v16)

- James corrected v16: "not brake, reverse." S now flips the burn direction while held —
  shift and overdrive thrust backwards at full strength (−400/−800), swinging smoothly
  through zero, and swing forward again on release. Overdrive stays toggled throughout.
  Console: speed shows a − sign, mode reads REVERSE, throttle bar turns amber on a
  reverse burn. Stamp v17.

## 2026-07-17 — claude-fable (v16 — S brakes the boosts)

- S now outranks shift/space (per James): holding it kicks the overdrive toggle off,
  blocks the shift burn from building, and bleeds thrust at a 0.5s time constant
  (vs 1.6s free coast). Console mode line shows BRAKE while it's doing that. Stamp v16.

## 2026-07-17 — claude-fable (v15 — cockpit redesign: hybrid deck + glass)

- James's verdict on the v14 console: "looks like Claude Design" — four identical rounded
  cards read as a SaaS dashboard, not a ship. Redesigned in the hybrid direction he chose
  (canted physical console + sparse glass projections):
  - Console is now ONE machined deck, perspective-tilted toward the pilot
    (rotateX 13° in a 640px perspective rig; deck spans -2%..102% so the top-edge
    convergence never gaps against the side struts). No border-radius cards, no gaps —
    instrument screens are inset into the metal (dark faces, inner shadow, scanlines
    on the screens only), stencil paint labels (ATT/NAV/SYS) on the deck itself.
  - Asymmetry: unequal wings of inert structure (vent slats + four bolt heads each,
    7% left / 4.5% right), pods 15/15/12.5%, central velocity cluster rises out of
    the deck with a clipped-corner silhouette and an amber hazard-stripe lip.
  - Glass layer: boresight reticle dead center (four arc segments, cross ticks, dot)
    whose horizon bars counter-rotate with bank every frame — the first live
    instrument on the canopy, and the anchor point for weapons later. Faint bracket
    arcs mid-screen left/right.
- Flight untouched this pass (James: A/D roll "definite improvement"; more tuning later).
  Stamp v15.

## 2026-07-17 — claude-fable (v14 — ship viewscreen + A/D roll)

- HUD rebuilt as a proper ship viewscreen (James: "feel like you are in a ship", ≤10% of
  the screen): canopy frame all the way around — top strut with heading-tape ticks, side
  struts, angled corner gussets, faint interior glass glow — and a bottom console of four
  readout panels: ATTITUDE (HDG/PIT/BNK), VELOCITY (big m/s number, live throttle bar,
  IDLE/COAST/BURN/OVERDRIVE mode line), NAV (HOME distance, CONTACTS within 2.5 km,
  EXITS), SYSTEMS (ENG NOMINAL; WEP and SHD report OFFLINE — weapons, shields, and
  enemies to blow up are the planned next phase). Console text refreshes at ~8 Hz;
  throttle bar every frame. CRT scanlines over the console. Old hairline corners/edges
  and the floating speed readout are gone (speed lives in the console now).
- Roll moved Q/E → A/D at James's request (NMS-style: bank with keys, point the nose
  with the mouse) and slowed 30% (0.66 → 0.46 rad/s). Strafe removed; Q/E deliberately
  unassigned for now. Hint text updated, stamp v14.
- Flight hint, tuner toggle/panel, and the portal focus anchor all sit above the console
  (CSS vars --console-h / --vs-side).
- Next: weapons, shields, enemies — the SYSTEMS panel is waiting to flip WEP/SHD online.
  James is also going to study No Man's Sky's flight feel for further tuning.

## 2026-07-16 — claude-fable (session close — committed at v13)

- First commit of the world: `src/worlds/orb-dimension/` plus its map-room link, drift
  registry entry, and World Ideas #55 (status `live`). Blender build scripts, the .blend,
  lit previews, and the verification sim live in `tmp/orb-dimension/` — gitignored by
  repo policy, local only.
- Where things stand: flyable, tunable, stable — James is happily doing barrel rolls.
  Controls: W/S dolly, A/D strafe, Q/E persistent roll, R levels, shift thruster (400),
  space toggles overdrive (800), drag steers in the local frame, H hard-resets home.
  Rescue/orientation net: the fog-proof Heart star + edge marker + veils (no view
  direction is ever black — sim-verified).
- Next, per James: default-preset values he'll paste from "copy settings"; Blender cave
  room (floor/ceiling/walls at honest scale); space stations and dimensional doors as
  the real exits; POI map; Procreate → image-to-3D → Blender model pipeline for props;
  possibly secret worlds outside the drift.

## 2026-07-16 — claude-fable (v13 — tuner presets)

- Presets row at the bottom of the tuner: name field + save / apply / set as start /
  delete, stored in localStorage (`elastic-orb-dimension-presets-v1`). "Set as start"
  (★) makes that preset win on every load — James's chosen default load-in. "copy
  settings" puts the live values on the clipboard as JSON so he can paste them in chat
  for me to bake into the shipped DEFAULTS.
- Applying a preset re-rolls the field only if the grouping changed; otherwise the
  existing orbs just retune in place. Stamp v13.
- Also incoming from James: Procreate drawings → image-to-3D → Blender → world models
  (the validated Hunyuan3D pipeline is exactly this; see memory `hunyuan3d-pipeline`),
  plus interest in another 3D generator. Models for stations/doors will likely arrive
  by that road.

## 2026-07-16 — claude-fable (v12 — overdrive + ghost HUD)

- Roll rate backed off 40% per James (1.1 → 0.66 rad/s).
- Space = OVERDRIVE toggle: ramps to 800 m/s and HOLDS until tapped again, then coasts
  down (or settles to 400 if shift still held). H clears it.
- First pass of the minimal HUD ("invisible jet" brief: a humanoid species 10,000 years
  ahead, exotic-matter ship): hairline corner brackets, 6px frosted-glass slivers on all
  four window edges (backdrop blur), speed readout reworked into thin letterspaced glass
  type — brightens with a hairline underline while overdrive is engaged. Shows for any
  motion now (dolly/strafe included). Stamp v12.
- James's roadmap for this world, logged: space stations; doors leading to other
  dimensions (probably the real exits); a map with points of interest; possibly SECRET
  WORLDS hidden outside the drift system entirely. "Now THAT is elastic space, baby."

## 2026-07-16 — claude-fable (v11 — free flight: persistent roll + banking)

- James (a No Man's Sky pilot, thousands of hours) wants real 3D flight: Q/E roll while
  held and STAY rolled, R glides back to the plane of the ecliptic, banking into turns.
- Camera rebuilt from horizon-locked yaw/pitch to a free orthonormal basis (f/r/u) rotated
  incrementally in its own frame (Rodrigues + per-frame re-orthonormalization). Mouse and
  arrows now yaw/pitch in the LOCAL frame, so a banked yaw curves the bank; pitch is
  unclamped (loops possible). Q/E roll at ~63°/s with eased start/stop, persistent. R
  levels roll+pitch keeping heading (~1s glide, cancelled by any look/roll input). Strafe
  slides along the banked wing plane. H hard-resets orientation, position, thruster.
  All downstream math (billboards, view matrix, raycast, home marker) was already
  basis-driven, so it inherited free flight unchanged. Stamp v11.

## 2026-07-15 — claude-fable (v10 — A/D strafe)

- v9 thruster confirmed working well. Q/E barrel-roll idea discussed and parked (tap-to-
  roll recommended if revisited); James chose A/D strafe first. A/D slide left/right at
  dolly speed (80 m/s, horizon-locked, instant stop), composing with dolly + thruster;
  mouse look unchanged. Strafe + drag-to-look is the orbit-an-orb combo. Stamp v10.

## 2026-07-15 — claude-fable (v9 — the thruster)

- James confirmed v8 flight feels smooth (dollied, steered mid-flight with the mouse,
  orbited an orb and looked back at himself) and spec'd motion step two himself: shift
  fires a thruster that takes a few seconds to reach full velocity, then coasts to a stop
  over a few seconds after release.
- Implemented exactly that: hold shift → speed ramps toward 400 m/s (≈95% in ~3.5s);
  release → exponential coast (~6s to standstill), zeroed below 4 m/s. Velocity direction
  always follows the gaze — steering curves the flight rather than diverging from it.
  W/S dolly (80 m/s, instant stop) composes on top, so S is a soft brake while coasting.
  H / "return home" also kills the thruster. Small m/s readout shows while thrusting or
  coasting. Bounds and all v6–v8 GPU guards unchanged. Stamp v9.
- Next candidates when James asks: a speed/VMAX knob in the tuner ("the flight" group),
  vertical or strafe drift, sound reacting to speed, and the Blender cave room.

## 2026-07-15 — claude-fable (v8 — the dolly + grouped tuner)

- James signed off on the look ("this is starting to look amazing") and asked for the
  dolly. Motion step one: hold W to glide forward along the gaze at a constant gentle
  80 m/s, S to back out, release = instant dead stop. No momentum, no strafing, no speed
  control. Bounds clamp to 0.95x spread. H (and the tuner button, now "return home")
  restores position AND view.
- Tuner controls grouped into labelled subpanels per James: "the field" (orbs, dust,
  grouping), "the space" (width/depth/height), "the orbs" (sizes, glass, glow), "the air"
  (haze, color fade). Actions row unchanged.
- Sim TEST 3 back to random positions across the whole dolly-reachable volume: still
  zero blind poses in 2000. All six tests PASS.
- Next steps when James asks: strafe or vertical drift as motion step two; then maybe
  gentle speed control; the Blender cave room remains the big build on deck.

## 2026-07-15 — claude-fable (v7 — square glow fix)

- FIRST CONFIRMED WORKING VIEW: James sees the orbs (in pirate voice). One visual bug in
  his report: glows rendering as translucent rectangles/squares — the v6 fill-rate fix
  shrank dust quads to 1.6x and veils to 1.05x, but the halo falloff still assumed a 2.6x
  quad, so the gradient was cut mid-fade at the card edge. Halo falloff (and the discard
  radius) is now normalized per instance to its own quad size — every glow reaches zero
  before its card's edge. Stamp bumped to v7.

## 2026-07-15 — claude-fable (seventh pass, same session — v6 stamp + resilience)

- James reported the page loading quarter-size top-left then "zooming" to fill, then
  FLIGHT — which is impossible in the look-only build. Verified: server hash == disk hash
  (current build served), no external edits, world folder untracked/unmodified. Strong
  suspicion: a stale tab still running pass-5 JS (the crashed tab restored). To end the
  ambiguity forever, the hint line now ends with a build stamp ("· v6") — if the stamp is
  missing, it's an old copy.
- Hardening from the report anyway: canvas gets inline fullscreen styles + dark body
  fallback (a failed stylesheet can never leave a 300x150 canvas on a white page); vertex
  shader caps billboard radius at 0.8x distance; CPU skips quads inside the near-fade's
  zero zone (draws only the culled count); DYNAMIC RESOLUTION — frame-time EMA scales
  internal render res down to 0.5x when the GPU drowns (James is on 3840x2160) and creeps
  back up when load eases. webglcontextlost still auto-reloads.
- Sim suite now 6 tests, all PASS: group in view at spawn (27 orbs); wander ≤ ~10 m/s;
  zero blind orientations /2000; home always indicated; overdraw 4.3 screens (defaults);
  maxed-tuner abuse 150.8 raw screens → 37.7 at the dynamic-res floor (affordable).
- Rendering answer for James: the canvas renders at the monitor's native resolution
  (device-pixel-ratio aware, no upscale-zoom anywhere in the code).

## 2026-07-15 — claude-fable (sixth pass, same session — LOOK-ONLY build)

- James's session ended in a GPU context loss (white screen + sad-face square, audio still
  playing): the fifth pass's veil patches were a fill-rate bomb — near the walls, dozens of
  screen-covering translucent quads per frame → frame rate collapse (his "gray blur" and
  the un-stoppable slow cruise: at 2 FPS the velocity damping takes ~10 real seconds) →
  Windows TDR killed the context. Fixed with per-instance quad sizes (veils 1.05x radius,
  dust 1.6x, orbs 2.6x); sim TEST 5 now asserts worst-case overdraw (5.0 screens, was 50+).
  webglcontextlost handler reloads the page if it ever happens again.
- Per James, flight is REMOVED for now — figure it out bit by bit. The camera is bolted
  1600m outside the central group, facing it. Drag or arrow keys rotate the view; H or the
  tuner's "recenter view" resets it; nothing else moves, ever. No momentum anywhere.
  Fly-speed slider and wheel-speed gone. Flight returns once looking works for James.
- Sim updated for the look-only build, all PASS: 27 group orbs squarely in view at spawn;
  zero blind orientations in 2000; wander ≤ 9 m/s; home always indicated; overdraw ≤ 5.
- Next: James verifies he can just LOOK — group ahead, swing away, swing back, orbs still
  there. Then reintroduce motion one small piece at a time (probably slow dolly first).

## 2026-07-15 — claude-fable (fifth pass, same session — verified in simulation)

- James lost the field a third time, so this pass was verified headlessly before handover:
  `tmp/orb-dimension/sim.mjs` replicates the world's math (population, wander, camera
  physics, projection, fog) and asserts. Results: camera drift over 120s with no input =
  exactly 0m; max wander speed 9.4 m/s; ZERO blind poses out of 2000 random positions +
  orientations (worst case sees 8 glows, mean 61); home always indicated.
- Found: tuner sliders re-rolled the ENTIRE field on every input tick (scrubbing "orbs"
  teleported everything — reads as "they zoomed by and vanished"). Orbs now live in
  persistent pools; count/dust sliders add/remove at the list's far end and never touch
  what's around you. Only "regenerate" and grouping changes re-roll.
- The Heart: one bright fog-proof pulsing white star at the exact center (the mysterious
  ambient source, made visible). Never renders below star-size on screen — visible from
  anywhere. You spawn 900m from it, facing it; H flies you back to it.
- Home marker: when the heart is off-screen, a soft dot glides along the screen edge in
  its direction. You can always point yourself home.
- Veil patches: ~120 huge, very dim glowing washes parked on the cave's ceiling, floor,
  and walls (deterministic grid, just past the flyable bounds) — faint mottling of rock
  miles away. Every possible view direction meets at least one; doubles as the interim
  answer to "some texture back there" until the Blender room is built.
- Flyable bounds pulled strictly inside the inhabited volume (0.95x spread); dust spills
  to 1.3x and got bigger (2–6m) and denser (default 1400), so looking out from the edge
  still shows embers. Speed cap halved to 600 m/s, default 150, gentler wheel; saved
  tuner values are clamped to current ranges on load.

## 2026-07-15 — claude-fable (fourth pass, same session)

- Root cause of James getting lost found: orb wander amplitude was scaled to the volume
  size (±480m at default spread), so the near orbs drifted their entire distance-to-viewer
  sideways within seconds — the field visibly fled the camera on load, twice. Wander is now
  absolute meters (60m orbs / 30m dust / 15m portals, a few m/s — "drifting slowly about").
- Ember dust layer: ~900 tiny motes (1.5–4.5m, halo-dominant, twinkling) fill the whole
  volume so no viewing direction is ever pure black and flying always has parallax to read
  speed against. "dust" slider in the tuner (0–2500).
- Welcoming ring tightened: 12 orbs at 250–1000m, evenly spread in angle, biased large.
- Pale exit orbs now resist fog 60% — they read as lighthouses from far off.
- Drag-look sensitivity nearly halved (0.0022 → 0.0013 rad/px).

## 2026-07-15 — claude-fable (third pass, same session)

- James got lost on first load: spawn was at the field's edge looking across it, so one
  drag swept every orb out of view with nothing nearby to reorient by. Now you wake DEAD
  CENTER in the volume, perfectly stationary (idle bob removed entirely — the camera never
  moves unbidden). A "welcoming committee" of a dozen orbs always rings the spawn at
  350–1600m regardless of grouping, and the three pale exit orbs sit within sight of home.
- Added H = fly home (also the tuner's "fly home" button); hint mentions it.

## 2026-07-15 — claude-fable (second pass, same session)

- Camera flight, per James: rebuilt the renderer from DOM-sprite parallax to raw WebGL2 —
  one instanced draw of billboard quads (a sphere is the one shape a billboard renders
  honestly, which is why the Blender sprites survive a flythrough). The four shell PNGs
  live in a texture array; each orb's two crossfading color layers + halo are composited
  behind the glass in the fragment shader. Depth-sorted back-to-front, premultiplied alpha
  over the CSS cave background.
- Flight: drag to look, WASD + E/Q (or Space) to fly, scroll sets cruise speed, shift ×3.
  Deliberately gentle — damped acceleration, smoothed look, pitch clamp, no roll (James's
  motion sensitivity). Gentle idle bob until first input; off under prefers-reduced-motion.
- Tuner panel (Chrome Rift pattern: toggle button + bottom panel, localStorage):
  orb count, width/depth/height spreads, size range, glass opacity, glow, haze, color-fade
  speed, fly speed, grouping select (scatter / clusters / strata / river), regenerate /
  fly home / reset. Positions are stored normalized, so spread sliders stretch the volume
  LIVE mid-flight — that's the "stretch them way out" experiment James asked for.
- Exits: pale pulsing orbs — three near the flight start plus one per ~60 orbs scattered.
  Click = raycast → triggers the hidden data-drift anchors (still keyboard-focusable).
- index.html deliberately untouched (canvas/tuner/hint injected from world.js).
- Where things stand: flyable and tunable. Next: the cave itself — Blender-rendered
  floor/ceiling/wall geometry or baked shells mounted around this volume (renderer is now
  true 3D, so mounting real surfaces is straightforward); orb-lit ground pools; sound
  experiments (speed-reactive wind, orb proximity chimes).

## 2026-07-15 — claude-fable

- First build, from James's pitch: an endless black volume — cave-black, not monitor-black,
  ten miles across and two miles high, dimly lit by an unfindable ambient source, with dozens
  of glowing colored balls drifting through it.
- Orb sprites rendered in headless Blender (Cycles, transparent film): four translucent glass
  shell variants (`glass`, `frosted`, `swirl`, `banded`) in `assets/orbs/`. The shells are
  neutral grays with real alpha — all hue comes from layered color gradients the page stacks
  BEHIND each shell (two crossfading hue layers + an outer halo). Build script + .blend +
  lit previews live in `tmp/orb-dimension/`.
- The space is code: world-coordinate volume with perspective projection (scale, dimming,
  depth blur by z), 46 drifting orbs in four depth bands plus one out-of-focus near wanderer,
  sum-of-sines wander, very slow camera drift + gentle pointer parallax (both off under
  prefers-reduced-motion).
- Three pale white pulsing orbs are the drift exits (`data-drift`, clamped on-screen).
- Sound: Web Audio synthesis through the shared sound control — sub-bass air rumble plus
  sparse far-off tones through an echo chain.
- Where things stand: first pass complete and registered. Untuned by James's eye yet — likely
  knobs: orb count/size mix, drift and crossfade speeds, how dim the ambient light sits,
  halo strength, ping frequency/loudness.
