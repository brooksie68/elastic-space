# Changelog — The Dead Letter Office

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-08-13 — Claude (Fable 5) + James — r25.2: walk pace corrected for the post-slow-mo world

- James's catch after the r25 dt-cap fix: the regular walk now reads "a little
  bit too fast." It is — `tune.walk` 0.6 m/s vs the clip's measured cruise of
  0.425 commands timeScale ≈ 1.41×. That 0.6 "working shift pace" was picked
  while the old dt cap was silently playing his ~12fps flights at ~0.6×, so it
  LOOKED right; r25 removed the mask and exposed the overdrive.
- Default `walk` 0.6 → 0.425 (the take's authored tempo, timeScale 1.0), with
  the usual stored-value migration (a stored 0.6 is the old default, not a
  choice — deleted on load, key stays v3). Tuner range widened 0.5–1.6 →
  0.3–1.2 step 0.025 so the authored pace and slower are reachable — the
  shift-pace pick (open since r16) is now genuinely his dial.
- gait-sim: all clips pass the foot-plant law; nav-fuzz 44/44.
- James's flight report nailed the mechanism before the code did: "normal pace
  for the first two steps, then suddenly double time" — the walk-start/walk-end
  takes played at a hard 1× (curve-driven) while only the cruise loop obeyed
  the inflated dial, so every leg of a route showed the seam. Now one `pace`
  factor (tune.walk / clipCruise) scales all three gait phases: the dial
  changes tempo, never uniformity. His left-foot back-slip at the fast pace is
  the r24.1 plant-gate degrading at high timeScale × his ~12fps frame rate —
  at 1× it should mostly vanish; if any survives, ?gait=1 measures it.
- AWAITING: his read on uniform 1.0× — if it feels too ambling, the dial goes
  up from an honest baseline this time, and stays uniform when it does.

## 2026-08-13 — Claude (Fable 5) + James — r25: the expression-tuned intro retake + the facial tail

- **`Intro-joke.fbx` supersedes `intro-address.fbx`** (same clip name in the
  pack): James's iClone retake with the Duluth audio merged onto the timeline
  so he could tune expressions against the performance — gesture on the beat,
  head turn, 20% smile into "to Duluth," bigger smile on the punchline, a
  keyed ~2s ease back toward neutral, arms behind the back for the tail.
  22.8s @60fps, walk settles 5.47s, curve-measured + pinned like the other
  locomotion takes. (His first three exports failed with iClone's bare
  "FBX Export Failed" — an iClone restart fixed it; late-session exporter
  flakiness, remember it.)
- **`duluth.fbx` re-exported from the same timeline** (Range from the audio
  clip's start through the smile fade) → visemes.js rebuilt: duluth is now
  734 frames / 12.2s with **33 morph tracks** (typical line: ~15) — the
  expression morphs ride the viseme bake. The mp3 is unchanged.
- **The line now fires at James's authored time**: `INTRO_LINE_AT = 10.133`
  (the audio clip sits at 00:10:08 on his timeline) replaces the r24
  `settle + 2.3s` guess — his gestures are keyed to the audio's true position.
- **The post-audio facial tail plays out** (voiceTick): the old code
  clearVisemes'd the instant the mp3 ended, snapping the face to neutral —
  which would have eaten the authored smile fade (audio ~9.6s, track 12.2s).
  Now `lastVisT` keeps the track playing on its own clock past audio-end
  until the baked frames run out; a new line interrupting mid-tail clears
  the old track's morphs first (33-track duluth vs 15-track lines — no
  leftover channels). Applies to every line with a baked tail, not just
  the intro.
- **r25 THE SLOW-MOTION BUG, James's catch** ("what my eyeballs and my ears
  cannot see and hear" — he stopwatched the take at 38s vs iClone's 22.8s,
  after Claude wrongly blamed iClone's preview and GPU contention): the main
  loop's dt cap (0.05s) silently plays the WHOLE world at reduced speed
  whenever the frame rate is under 20fps (~12fps during his flight → ~0.6×).
  Fixes: (1) the intro take now runs on the WALL CLOCK (a.time set from
  performance.now each frame — frame drops skip frames, never stretch time;
  console stamps report fired/done wall times), (2) dt cap raised 0.05→0.25,
  so every clip world-wide holds authored speed down to 4fps. His verdict:
  "MUCH better." COROLLARY: the world really renders ~12fps on his powerful
  machine — the optimization pass just moved up the queue; slow-mo was
  masking it as smoothness.
- **r25.1 INTRO FOOT ANCHOR** (James: slides ~a shoe length into the stop,
  then "standing on ice" — every weight shift skated his feet): the intro
  was the last path still driving position from the smoothed travel curve,
  which can't match the baked feet frame-by-frame; worse, the bake's hip
  pin (zeroing root X/Z) deletes authored weight-shift translation, turning
  it into foot skate. The intro block now uses the SAME planted-foot anchor
  as the walking block (lock hysteresis 3cm/6.5cm, slower-foot pick when
  both are down): body derived from the frozen stance foot, so weight
  shifts translate the body over planted feet — the authored motion
  restored exactly (the pin removed pure translation; re-planting the
  stance foot adds it back). Curve replay kept only as no-foot-data
  fallback. Sims re-green.
- Smile verdict IN (James): "the smile is good... not overpowering anymore,
  and it fades nicely." AWAITING: the anchored feet in-flight, and the
  frame-rate reality check now that slow-mo isn't hiding it.

## 2026-08-13 — Claude (Fable 5) — Tiny Birdies joins the broadcast

- James's new Suno track `Tiny Birdies.mp3` (upbeat vocal novelty number —
  wind-up birdies, "all lined up in a row"; the broadcast's first vocal tune)
  spliced into `RADIO_PROGRAM` as the sixth number, between Waltz With My
  Darling's break and the dj8 loop-closer (dj8's "pick it back up" read still
  lands on High Chaparral untouched).
- Four new KDLO speech pieces written + generated (voice Bill, eleven_v3,
  stability 1.0): **dj11** intro (the Dooley Sisters with Bob Sorenson
  trading verses — James's catch: the track is a man/woman duet, so the
  credit says so — "anybody who's ever lost an argument with a sparrow"),
  **dj12** sign-off (Bob drives the milk route over in Waupaca; his own tiny
  birdies in the seed sack — "don't feed anything you're not prepared to keep"),
  **ad11** (Brubaker's Seed & Feed, down by the grain elevator), **ad12**
  (Lundgren's Radio & Appliance — "you're hearing this, so somebody's radio
  works"). dj9/dj10 numbering pattern kept: intro then sign-off.
- All five clips baked through the r12 AM chain with `--clip 1`, RMS-matched
  (limiter ×1.000 across the board). Program is now 31 items, 6 songs.
- Break format preserved: song → sign-off → two ads → intro next → song.
- Not yet heard on air by James.

## 2026-08-12/13 — Claude (Fable 5) + James — r24: THE AUTHORED OPENING (intro-address)

The r23 lesson made real: James built the opening IN ICLONE (Claude coaching
click-by-click — his first motion-layer cleanup pass: clip assembly from the
walk-relaxed family + Talk Serious, Break at a pose-matched frame, IK wrist
keys walking the arm-cross out of his chest, the "keys are dots, spans need
both ends" lesson) and the world now just PLAYS it.

- `intro-address.fbx` (27.2s: walk up → stop → cross arms → hold with
  gestures) joined build_pack.py CLIPS (pinned + measured). Two new
  measurement guards, intro-address only: a stance-noise gate and a
  peak-relative walk-end cutoff — without them the 20s talk hold's
  ankle-roll/gesture creep integrated into ~20cm of phantom forward
  travel (he'd have moonwalked into the lens). walk/walk-end curves
  verified UNCHANGED (the first cutoff draft trimmed walk-end's real
  deceleration tail — gait-sim's shipped numbers restored before ship).
- world.js r24: startIntroTake() places the take straight down the
  visitor's ACTUAL spawn gaze (his note: "vector him towards the camera...
  straight towards the viewer") — stop lands INTRO_STANDOFF (2.6m) in
  front of the lens; the tick replays the take's own measured curve along
  the fixed heading; Duluth fires at settle + INTRO_LINE_DELAY (2.3s),
  visemes + his authored SMILE riding the existing speech system (he
  re-exported duluth.fbx from AccuLips with Face Key smile keys — baked
  peak 1.0 at 6.0s, flagged as possibly hot). Clicks are ignored during
  the take; museum-freeze cancels it; reducedMotion skips it. When the
  clip ends the normal shift machinery walks him to the furnace.
- ALL r23 procedural machinery DELETED from world.js (intro state machine,
  skeleton freeze, hip pin, steering special-cases, arrival-snap gate).
  headLookTick survives behind LOOK_ENABLED=false, benched.
- Sims: nav-fuzz 44/44, gait all clips pass. Pack 13.4MB shipped to
  assets/postmaster/ (the tmp build is not the live file — copy step).

JAMES'S FLIGHT VERDICT (2026-08-13, "two steps forward, one back — the best
ratio yet"): he walks at the camera ✓. The back-steps, all named:
1. Abrupt start — he's already mid-walk the instant the world loads; timing
   reads wrong. (Candidate fixes: delay the take a beat, or start it before
   the poster fade lifts.)
2. The smile: creepy at full strength (as flagged) AND snaps to dead flat in
   <0.5s when the clip ends — the iClone neutral key sits too close to the
   smile keys. Both are Face Key re-authoring in the duluth AccuLips project.
3. Talk Serious's canned hand gestures don't track the anecdote's beats at
   all. Inherent to stock clips; the real fix is authoring gestures against
   the audio (import duluth.mp3 as a guide track in the intro project), or
   the unopened AI Video Mocap minutes (film himself telling it).
4. Sliding during the walk's deceleration — the intro replay is curve-only;
   it does NOT run the foot-anchor drive (that lives in the walking branch).
   Claude-side fix available: apply the anchor lock to the intro take's
   feet data (build_pack already measures feetL/R for it).
JAMES'S DIRECTION BEFORE NEXT ROUND: he wants to stop building organically
piece-on-piece and learn the tool properly — CC5/iClone tutorials, animation
101, practice projects. No further intro iteration until then, most likely.

SAME NIGHT, r24.1 — THE PLANT-BOOP: his regular walk verdict ("much better...
still skating a little"), with one precise finding: every plant scoots back
~an inch the instant the foot lands — "boop" — alternating feet, exactly
when the foot should be most solid. Mechanism: the r21.5 weight-bearing gate
demanded a ≥35%-pace BACKWARD sweep before the anchor could lock, leaving a
few unlocked frames after each plant — right when the clip's stance pull is
fastest and the smoothed drive curve underestimates it, so the fresh plant
slipped backward before the lock caught it. (gait-sim couldn't see it: its
anchor model locks at the plant, no bearing gate — the world had drifted
from the sim.) Fix: the gate now blocks only clear FORWARD (landing) motion
(v < +0.08·belt); near-still or backward feet lock at the plant itself.
Sims green. AWAITING his eye — the residual risk is a tiny body jerk if a
foot locks during its last few mm of landing.

## 2026-08-12 — Claude (Fable 5) + James — r23: the opening sequence + camera-look

James's brief (same night as r22): when the world loads — camera in his
captured corner spawn, John off to the right at the desk — count of two,
then John turns, walks across the visitor's view, stops, LOOKS INTO THE
CAMERA, delivers Duluth, and carries on to the furnace.

- **The opening**: `introPhase` machine in pmTick ('wait' 2s → walk desk→H3
  → 'turn' 0.5s pivot to the visitor → 'line' = pmSay('duluth', force) →
  walk H3→furnace, routine resumes). Normal routine + ambient clock hold
  until it resolves; museum-freeze cancels it; reducedMotion skips it.
  H3 (4.6, 0.6) is the pause mark — squarely in the spawn camera's view.
- **Camera-look (head + eyes)**: headLookTick, post-mixer — whenever
  pmFaceCamera > 0 (the opening line AND every click answer), the head
  slerps a bounded world-space delta (body-forward → camera, clamped 1 rad)
  localized per-bone (axis-safe on the CC rig), head at 0.75 weight, eye
  bones (CC_Base_L/R_Eye) adding ~0.3 on top so the eyes lead. Recomputed
  from the clip's fresh pose every frame — nothing compounds (the
  swallowed-jaw discipline). Eases in at 5/s, out at 3/s.
- Sims: nav-fuzz 44/44, gait-sim all clips pass.
- **r23.1, James's first flight** ("walked almost all the way over to the
  furnace... very long time before he stopped"): the H3 pause mark scrapped.
  He now heads for the furnace on the real route (desk→H7 runs east along
  the north wall, toward the corner camera) and stops by WALKED DISTANCE —
  INTRO_STOP_M = 2.2m, his first ~6 steps, before the H7 corner turn. The
  stop truncates pmPath to one synthetic node a walk-end's travel ahead so
  the stopping take settles clean; after the line he re-keys pmStationKey
  to the nearest nav node and carries on to the furnace.

- **r23.2, James's second flight** ("sliding around to the right, stops and
  adjusts himself, backs up a little... vaguely towards the camera, not into
  the camera; eyeballs staring straight ahead" — his framing: blind leading
  the blind, but the standard is absolute now, not relative): THE FREEZE.
  (1) Straight-lock — 0.6m out (exit pivot done) the path becomes ONE node
  dead ahead; no corner steering, so no drift toward H3. INTRO_STOP_M back
  up to 2.6 (six real steps; shorter runs never neared the camera).
  (2) No arrival snap for the intro stop (introNoSnap) — the settle-position
  correction read as "backing up". (3) NO body turn at all: pmFaceCamera is
  out of the intro; pmFaceTarget holds his frozen yaw through the line and
  pmLookCam turns the HEAD alone. (4) headLookTick head weight 0.75 → 1.0
  (full aim — partial weight read as talking past you) and eyes 0.3 → 0.35.
  The arms-cross he half-liked is the talk take (talk-serious) riding pmSay
  — it comes free with the line. Known gap he'll tolerate for now: forearms
  sink into the chest on the cross (clip vs the Heavy body).

- **r23.3, James's third + fourth flights** ("slipping around all over the
  place like a freaking air hockey puck... floating on a pad of air"):
  DIAGNOSIS — the glide is CROSSFADE SLIDE, not group motion. Walk-end's
  clamped pose fades into pickIdle and then the talk take, each baked at its
  own hips offset/yaw, so the blend drags the visible body around while the
  group never moves. First attempt (a group-level hip counter-pin measuring
  CC_Base_Hip drift) changed nothing James could see — the drift just moved
  to the feet. Replaced with THE SKELETON FREEZE, deterministic: at the stop,
  capture every lower-body bone's LOCAL pose; hard-restore post-mixer every
  frame until the line ends. Legs/hips/spine-base physically cannot move.
  Free (live) bones: Head/Neck/Eye/Jaw/Teeth/Tongue + Clavicle/arms/fingers
  + Spine02 (FREEZE_FREE_RE) — so the camera-look, visemes, and the talk
  take's arm-cross all still play. If this proves out it likely becomes the
  GLOBAL station-blend rule, not just the intro's.

- **r23.4, James's fifth flight** ("nothing changed at all... moonwalking...
  head bent over his neck like a weird character from Skyrim... he does NOT
  look at the viewer, he just turned towards the person"; plus his honest
  read: Claude is ~50% on character animation vs 85% on UX prototypes, and
  his offer of more iClone takes): THE REAL WINDOW FOUND. His detail "all
  of it without moving his feet" proved the freeze WAS holding — the drama
  happens BEFORE pmArrived: when the stopping take overshoots the synthetic
  node, the pursuit steers at a node BEHIND him — align collapses to 0.12,
  walk-end crawls for seconds, and the yaw chase pivots him around the
  anchored foot. The freeze/pin only engaged after that dance. Fix: during
  'stopping', steering is OFF (yaw locked), align forced 1 (take at full
  rate, ends on its own clock), fallback motion goes straight along pmYaw
  (a passed node can never pull him backward), both arrival snaps gated.
  AND the look rewritten as a true LOOK-AT CHAIN: each bone's forward axis
  measured at load; per frame neck (0.35 shr, 0.4rad cap) → head (0.85,
  0.7) → eyes (1.0, 0.6) each re-aim from their OWN current forward, so
  the eyes land exactly on the lens by construction and the swing spreads
  across the neck instead of the Skyrim head-hinge.

- **r23.5, James's sixth flight — THE PROCEDURAL INTRO IS DEAD** ("still a
  bunch of uncomfortable shifting and floating... neck cranes way off to the
  left, eyes roll weirdly... You do not know how to do this. We need a new
  approach"). His read stands: six rounds of runtime synthesis, no
  convergence. INTRO_ENABLED=false and LOOK_ENABLED=false (machinery kept
  for reference; delete most of it once the authored era lands) — the world
  loads with the normal 6.5s routine again. THE NEW APPROACH, agreed
  direction: the opening becomes ONE AUTHORED ICLONE TAKE (working name
  `intro-address`): walk ~6 steps → natural stop → arms cross → authored
  head turn (~25° left, slight up) → hold ~10s (Duluth is 8.6s; visemes ride
  on top from the existing duluth bake, the body take carries NO face) →
  uncross → turn right → walk out, ending mid-stride. Exported like every
  motion (Blender preset, 60fps, Range), build_pack measures its travel,
  and the world PLACES the take so the authored head angle lands on the
  spawn camera, starts the mp3 at the stop-settle frame, and blends the
  walk-out into the loop toward the furnace. Play authored motion straight
  — the only thing in this world that has ever looked right.

STANDING LESSON (r23, hard-earned): runtime-synthesized body motion — 
steering to synthetic nodes, stance crossfades, procedural look-at — reads
as floating/sliding/craning at close range, every time. Authored takes
played straight are the house standard for anything the visitor is meant
to LOOK at. Procedural is for traversal only (the gait drive), never for
performance beats.

## 2026-08-12 — Claude (Fable 5) + James — r22: the batch-of-twenty voice drop + speak-more cadence

James asked for twenty new one-sentence ambient lines (Keillor-influenced —
dry, stoic, upper-midwestern) and said the speech frequency is too slow.
Claude wrote the twenty; James recorded SEVEN the same night (ElevenLabs +
AccuLips, the r18 recipe): passion, not-lonely-down-here, i-dont-hurry,
retired, chair-with-a-cushion, basement-weather, quiet-fair.

- build_speech.py re-run: visemes.js now holds all 20 takes (13 + 7).
- The recorded seven map in VOICE_LINES; QA_ROTATION grew 13 → 20. (The
  other thirteen from the writing batch were dropped — James: "there's just
  these and that's it" — they live only in this session's chat, not in the
  code.)
- **ONE LIST, his call**: PM_AMBIENT is now exactly the twenty recorded
  takes, and PM_CLICKED aliases it — walking around he spouts one every
  16–24s ("like, every twenty seconds"), and every click answers from the
  same twenty, force-interrupting mid-line so rapid clicking always talks.
  Each trigger keeps its own no-repeat pool cycle. The old unvoiced
  TTS-era ambient/click texts are deleted (git history has them); shift
  lines + contextual station pools remain, silent where unrecorded.
  Sigh lines remapped to the two melancholy takes (passion,
  not-lonely-down-here). Previously ~half the ambient slots were silent
  draws (speak() drops unvoiced lines) — that was the "too slow" feel.

His animation wishlist for the next pass (his words, none built): the
current gestures are "kinda wishy washy" — he wants a REAL hand gesture;
picking up an armful of letters; a hopper built on the side of the furnace
for him to drop them into; holding the mug at the coffee station; holding
a donut up to his mouth with chewing motions; and looking at the camera
sometimes. Specific speech clips paired with specific actions is the
frame. Also open: extra facial movement experiments in iClone (his seat,
Claude shotgun) and eyes tracking the camera during speech (buildable
browser-side — eye bones/morphs during pmSay). Stray empty
`speech-clips/TBD/` directory noticed, left alone — James's to keep or
delete.

## 2026-08-11 — Claude (Fable 5) + James — r21.5: limiter reverted, bearing gate

James on r21.4: "a big step (harhar) backwards... much more glidey."
Correct — the accel limiter's velocity memory read every lock-engagement
frame as "brake to zero" (target distance is zero at acquisition) and
dragged the body at each footfall. REVERTED to the hard lock. The
plant-jerk gets the principled fix instead: a foot can only become the
anchor once it is WEIGHT-BEARING — sweeping backward under the body at
≥35% of the clip's mean pace — so there's no leftover landing motion to
snatch (this also stops locks during the takes' standing lead/settle,
where the fallback correctly holds him still). Sims green.

## 2026-08-11 — Claude (Fable 5) + James — r21.4: plant-jerk + the turn verdict

James's flight report on r21.3: genuine improvement ("the foot is planting
a lot more reliably... heel-toe roll is working a lot better"), with three
findings:
- **The plant-jerk** (a quick ~1–2cm backward pull at every footfall): lock
  engagement is a velocity step. Fixed with a 4 m/s² acceleration limiter
  on the anchored body — stride surge (~2.6 m/s²) passes untouched,
  discontinuities ramp over ~3 frames.
- **"You're getting massively dinged on the turns"** — his call, correct:
  pivots have NO turn take (feet planted, body rotates — his Skyrim
  comparison), and the free foot's arc was polluting the drift stats. The
  gait meter now scores STRAIGHT and TURNING stances separately.
- **The real turn fix needs iClone**: step-turn-left/right takes (feet
  actually stepping around) — James exports them per the motion recipe when
  he's next in iClone; the phase machinery is ready for them. Furnace-area
  shuffle is the same settle-pivot problem.
- His pace verdict: honest speed = "incredibly slow... he's so lazy" (in a
  good way for now); the walk dial picks his shift pace after the last
  slides die. Left-foot-slips-more noted, unexplained yet.

## 2026-08-11 — Claude (Fable 5) + James — r21.3: the meter finds the real bug

James drove the QA loop with the gait meter (click-to-copy added at his
ask) and the numbers walked us straight down the stack:
- ~300mm/stance + lock age 0.05s → **the anchor lock was flickering**: a
  single altitude gate, and the ankle heel-rolls across it all stance.
  Fixed with hysteresis (acquire <3cm over the foot's floor, release >6.5cm).
- Age healthy (0.64s) but err 16–65mm oscillating and drift still ~350mm →
  meter's own plant gate was timing swing too (fixed self-calibrating), AND
  the deeper one: **motion-meta was measured BEFORE build_pack's pin step**,
  so the anchor's foot data described a different animation than the one
  shipping — verified by sampling the shipped GLB itself
  (tmp/dead-letter-office/iclone-motions/verify_shipped.py, KEEP): walk off
  up to 74mm-native, walk-think off by 2.1 METERS (its stage travel — the
  Miracle on Ice finally explained). Metrics now measured AFTER the pin;
  rebaked; meta-vs-shipped now 6–12mm mean / ~35mm worst (export
  quantization). Sims green. James's meter is the referee — awaiting his
  next click-copy.

## 2026-08-11 — Claude (Fable 5) — r21.2: sub-frame anchor + THE GAIT METER

James on r21.1: "noticeably better... but I can clearly see there is still
SOME gliding — can you detect it?" Two answers:
- **Sub-frame interpolation** (real bug fixed): the anchor looked feet up
  at Math.round(frame) while the renderer interpolates between keyframes —
  up to ~7mm of 60Hz sawtooth. pmFootAt() now lerps at float frame index.
- **THE GAIT METER (?gait=1)**: his dispute — "your calculation ability
  isn't better than eyes" — was correct in a specific way: gait-sim
  measures the MODEL of the drive, not the rendered man (crossfades, bone
  re-writes and interpolation live outside it). The world now measures the
  ACTUAL rendered ankle bones per frame and shows per-stance drift on
  screen (last / mean / worst mm + stance count, bottom-left). Same truth
  his eyes see, in numbers.
Known unfixable-in-code residuals for the meter to quantify: crossfade
blends (two clips, one anchor), source-take foot creep (~21mm), heel-peel
(ankle anchored, toe rolls). Sims green.

## 2026-08-10 — Claude (Fable 5) — r21.1: THE SCALE BUG — the glide's actual root

James on r21: "marginally better... still doing a lot of skating." His
pasted cross-session advice said run the basics: check double-translation
(clean — walk loop is truly in-place, 0.011 native net) and check the
speed ratio. THAT was it: **the r16 "0.324 m/s per meter of height"
constant implies a native→world scale of 1.533, but the model's real
render scale is pmHeight / raw GLB height = 1.9 / 1.795 = 1.059 — 45%
off.** Since r16, feet stepped ~45% slower than the ground moved (the
ever-present glide James kept flagging, now finally measured), and the r21
anchor over-shoved the body 45% past each planted foot. The sim couldn't
catch it: it used the same K for drive AND measurement; only the world
exposed it. Fixes: motionK() = pmHeight/pmSizeY (the actual render
scale); clipCruise() returns absolute world m/s at timeScale 1 (walk =
0.425); timeScale call sites drop the pmHeight factor; tune.walk default
0.95 → 0.6 (0.95 was calibrated against the broken feet — stored 0.95
migrated away); gait-sim K updated to the measured scale. LESSON for the
next constant: derive scale from the loaded model's bounds, never bake a
hand-measured hybrid. Sims green. AWAITING JAMES — with K true, anchor
compensation is exact for the first time.

## 2026-08-10 — Claude (Fable 5) — r21: THE FOOT ANCHOR (James's foot-plant law)

James spelled out the law: "he plants the foot... it cannot move — forward,
backward, side to side... it's a complete fail if the foot even slightly
moves" — and asked whether that's DETECTABLE in code. It is, and it's now a
harness: **tmp/dead-letter-office/gait-sim.mjs** (KEEP — run after any
motion-pack or drive-math change). build_pack.py bakes per-frame world foot
positions (feetL/feetR) into motion-meta.js; the sim replays the drive math
and scores every stance phase's world drift in mm, four modes compared.
Measured verdicts: the shipped scalar drive drifted 15mm mean on plain walk
(24mm worst), 157/237mm on the takes, 662mm on walk-think — his eye was
exactly calibrated. THE FIX: **anchor drive** — the moment a clip foot
plants (height gate + hysteresis), its world position is banked and the
BODY's position is derived from it (group = anchor − clip-foot offset,
clip plane rotated per-take heading → local +z → live yaw). Planted foot
drift on the walk loop: **0.0mm — frozen by construction**. Takes: ~21mm
worst, which is the SOURCE CLIPS' own authored foot-creep (sim caps assert
walk ≤2mm, takes ≤25mm as the documented ceiling). Turning while anchored
now pivots the body AROUND the planted foot. Arrival became a pursuit
(reach slack ~0.24m mid-path, closest-approach guard vs orbiting, no more
mid-path snapping; final node still settles exact). walk-think still
benched (135mm source creep). nav-sim 44/44, gait-sim ALL PASS.
AWAITING JAMES: the walk in-world — this is the one his lecture asked for.

## 2026-08-10 — Claude (Fable 5) — r20.3: the gait pulse (James's walking lecture)

James, watching r20.2's constant-speed walk: a human plants the forward
foot and it STAYS while the body pulls over it — "step, push forward...
there's never a time when a human being is gliding forward evenly." He's
right, and the data agrees: the measured planted-foot curve pulses 0.23 →
0.62 u/s within every stride (3× swing around the 0.40 mean). Diagnosis of
the two failed rounds: r20.1 drove the ground from the RAW foot curve
(right pulse + 60Hz measurement noise = "squishy"); r20.2 threw out the
pulse with the noise (= conveyor belt). r20.3 is the middle path: loop
ground motion is curve-driven again, from the smoothed (±3 frames, keeps
the ~1.7Hz stride) monotonic curve. timeScale stays the tempo command; the
curve owns the distance; the planted foot is nailed by construction.
walk-think stays benched. Sim 44/44. AWAITING his eye on the pulse.

## 2026-08-10 — Claude (Fable 5) — r20.2: the curve-drive retreat

James on r20.1: walk-think = "miracle on ice"; even plain walk went
"squishy... drifts back and forth... the foot just kinda slides." Root
cause: the fwd curves are per-frame ROOT-travel integrals — the hips surge
and settle within every stride (and walk-think's pondering gestures swing
them hard), so curve-driving the ground fed that oscillation straight into
his position. The retreat (complexity-retreat doctrine):
- Plain walk loop: CONSTANT-SPEED ground + per-frame timeScale lock again
  (the r19 setup he called better). Curve-drive removed from loops.
- **walk-think BENCHED** from the walking rotation — needs a smoothed
  velocity bake + look-dev pass before it returns; clip stays in the pack.
- walk-start/walk-end stay curve-driven, but curves are box-smoothed
  (±6 frames) + forced monotonic at load — travel integrals only go
  forward, backward wiggle is noise.
- Station settle pivot slowed (dt·4 → dt·2.2): planted-feet rotation can't
  not slide without a turn take; slower reads deliberate, not ice-spin.
Sim 44/44. AWAITING: whether start/end takes still read clean, and the
pivot feel.

## 2026-08-10 — Claude (Fable 5) — r20.1: James's first-flight punch list

Six calls from his r20 flight, all landed:

- **HAIR IS WHITE** ("should always be white"): the CC Classic_short hair
  albedo is genuinely dark — the r17 no-mips fix couldn't touch that. Now
  Hair/Scalp maps get a per-texel lift toward white at load (85% of the way,
  alpha untouched, canvas remap, both map+emissiveMap swapped per the
  dual-atlas rule) + material color forced white.
- **SCOTT HAMILTON FIXED**: the big one — walk-think STOPS mid-take to
  ponder, but loop translation was constant-speed, so he glided through
  every pause. Loops are now curve-driven like the takes: pmSpeed/timeScale
  is only the command, the ground follows the loop's measured foot-travel
  curve at the clip's live time (motion-meta.js now carries fwd curves for
  ALL four locomotion clips). Gait-to-gait crossfades tightened 0.25→0.15
  (long blends between different foot phases read as skating).
- **Falling letters clickable** + fallSpeed default 0.4→0.7 (his call):
  every falling letter carries an invisible 2× hit pad (opacity-0 material —
  visible:false would skip raycast), removed on settle so pile picking
  stays exact. Stored tuner fallSpeed of exactly 0.4 is migrated away (old
  default, not a choice); key stays v3.
- **Radio moved to the big table by the door** (layout.js hand-edit on his
  explicit ask — backup in tmp/dead-letter-office/layout-backups/), rotY
  faces the room; RADIO_POS follows the item automatically. The open-book
  placeable removed ("lose the brown book"). 59 items; sim 44/44.
- **Spawn updated** to his third capture (x 7.07, yaw −3.96).

## 2026-08-10 — Claude (Fable 5) — r20: all eight clips live (James: "all three")

The pack's four benched clips are wired; the walk is now a three-phase gait.

- **build_pack.py v2**: start/end takes now PINNED like the loops, and every
  locomotion clip gets measured — but from the PLANTED FOOT (min of the two
  feet's per-frame travel, integrated), because these iClone exports are
  already in-place: hip/root travel is centimeters, so root-motion sampling
  reads ~zero (first attempt did exactly that). Numbers: walk 0.4015 u/s,
  walk-think 0.265 (34% slower), start take 2.6 u over 6.65s (it's step-out
  + cruise), end take 0.93 u with a 1.3s standing settle tail. Per-frame
  forward-progress curves + lead/settle times ship as
  assets/postmaster/motion-meta.js (script-tag global, like visemes.js);
  world units convert through the proven 0.324 walk constant — ratios only,
  immune to unit mismatch. Pack rebuilt (10.6MB, r16 copy backed up at
  tmp/dead-letter-office/iclone-pack-r16-backup.glb).
- **walk-start / walk-end in world.js**: pmPhase state machine
  (start→loop→end). During start/end takes the ground position is DRIVEN
  from the take's measured curve (feet and floor mathematically locked, even
  while pivoting — align scales the take's timeScale and the curve follows);
  the loop phase keeps the r19 per-frame timeScale lock. The stopping take
  fires when the last leg's remaining distance equals its measured travel;
  legs too short for it fall back to the r19 brake. Its settle tail plays
  through as his first idle beat, then fades to a real idle.
- **walk-think**: 25% of walks are the pondering amble, at its own measured
  tempo (clipCruise per-clip constants — one constant for all clips would
  have re-introduced skating at 66% speed).
- **talk**: plays under ANY spoken line at a station (pmSay hook), back to
  an idle when the line ends; monologue path unchanged; museum-freeze and
  gestures are guarded.
- Sim 44/44; motion-meta + world syntax-checked. AWAITING JAMES'S EYES on
  step-out feel, stop feel, amble frequency, talk-under-lines.

## 2026-08-10 — Claude (Fable 5) — r19: the zero-skate walk pass

James: "still skating a bit... real walking motions where his feet do not
slide at all." The r16 timeScale math only matched foot speed to ground
speed at CRUISE — he still slid during the idle→walk fade (full speed under
a half-faded clip), waypoint pivots (translating while rotating), and
arrival (instant halt mid-stride). Now `pmSpeed` is a live eased ground
speed (accel 2.0 / decel 3.5 m/s²): he accelerates out of a stand, barely
translates while turning (cos-alignment gate, floor 0.12), brakes into the
final node (last 0.55m, floor 0.3), and `actions.walk.timeScale` is
re-locked to pmSpeed EVERY frame — foot speed equals ground speed through
every ramp by construction. Remaining slide is rotational only (pivot in
place, brief at 3.2 rad/s); the pack's unused walk-start/walk-end clips are
the next fidelity lever if James wants footfall-perfect turns. Sim 44/44.
Same session: the load-time T-pose flash fixed — the first idle used the
default 0.35 fade, which blends up from the calibration T-pose; first pose
now lands with zero fade + an immediate mixer.update(0) so bones are
written before the first rendered frame.

## 2026-08-10 — Claude (Fable 5) — mojibake purge + capture spawn

- **THE ENCODING REPAIR**: world.js (and a check of index.html) carried
  double-encoded UTF-8 on disk — 216 em-dashes, curly quotes, and ellipses
  rendering as "â€""-style garbage IN THE LETTERS THEMSELVES, plus the
  loading line James caught ("setting the roomâ€¦"). Byte-level repair
  (scratchpad fix_mojibake.py pattern: for each candidate char, replace
  utf8(cp1252(utf8(c))) with c, longest first); zero suspicious sequences
  remain; letter texts untouched apart from de-corruption (the protected
  deck reads as authored now).
- **capture spawn** (tuner head button, James's ask — he wants to start up
  in a corner seeing the whole office): banks live camera x/y/z + yaw/pitch
  into tune.spawn (localStorage, same key), copies the JSON to the clipboard
  for baking as the default, and load applies it (eye height clamped to
  [EYE, ceiling]). Reset clears it with the rest of the tuner.
- Same night: James captured his corner and it is now **SPAWN_DEFAULT**
  ({x:7.43, y:2.41, z:-4.79, yaw:2.215, pitch:-0.197} — up high, whole
  office in view); a tuner-captured spawn still overrides. **radioOn=true
  at load again** (his call; the 08-08 QA silence is over). QA_ROTATION
  clicks remain until his verdict on the 13 takes.

## 2026-08-10 — Claude (Fable 5) + James — r18: THE THIRTEEN-LINE VOICE BATCH

James recorded the batch solo — ElevenLabs mp3s + the full iClone AccuLips
pass per line, a dozen new FBXs in one evening (the r17 recipe, now written
down in tmp/dead-letter-office/iclone-speech/README.md — with his correction:
Animation → AccuLips is the window with BOTH the mp3 browse and the text box;
plain import-audio has no text field).

- 13 lines live, all viseme-baked (build_speech.py, one run): r-for-regret,
  blue-ink, addressed-to-a-lake, can-i-help-you, donuts, duluth, pot-from-79,
  forget-mothers-state, man-named-earl, urgent, no-snap-decisions,
  love-letter, on-break-since-91. 10–15 morph tracks + jaw each, 60fps.
- Four FBXs arrived under different stems than their mp3s (help-you-no,
  mothers-state, on-break, pot-from-seventy-nine) — renamed to match; the
  stem is the contract.
- Six lines were new to the script — added to PM_AMBIENT and VOICE_LINES
  (duluth, forget-mothers-state, man-named-earl, urgent, no-snap-decisions,
  love-letter). Three existing pool lines got their takes wired
  (addressed-to-a-lake, can-i-help-you, pot-from-79).
- The two r17 TTS-era monologues RETIRED (James deleted their mp3s):
  PM_MONOLOGUES is empty (tick guards on it — a missing file used to wedge
  him in 'busy' forever), texts preserved in PM_MONOLOGUE_SCRIPT for
  re-recording.
- QA_ROTATION = all 13 (FREEZE + click cycles the whole batch).
- Still open: James's QA verdict, then restore radioOn=true at load and
  return clicks to the normal pools.

## 2026-08-10 — Claude (Fable 5) — The pile settles down (James's mid-flight notes)

James flew the world with the pile grown huge ("crazy... but not bad") and
called four things; all landed:

- **CLAIMED counter 17 → 117** ("a hundred and seventeen in forty years is
  still a tiny amount. Seventeen is just sad").
- **THE EULER BUG**: every "lie flat + random spin" placement put the spin in
  the euler Y slot, which with XYZ order and x=−π/2 *tilts* the letter (up to
  fully vertical) instead of spinning it in-plane. That was both the letters
  standing on edge in the basket AND the floor strays digging diagonally into
  the cement. Spin moved to the Z slot everywhere (pile, spill callback,
  seedStrays); floor strays are now genuinely flat, pile letters lie at
  gentle paper-settle jitter (±0.07 rad) only.
- **Pile compaction** (his "they should stack a little flatter... a lot of
  empty space down the bottom"): layer height 0.045 → 0.036, per-layer cap
  ×14 instead of ×8, base radius 0.26 → 0.34, min cap 3. Same tower vibe,
  denser body.
- **Hollow-bottom fix**: the PILE_CAP recycler shifted from the BOTTOM layer
  first, so long sessions emptied the base visibly through the wire cage.
  Now recycles from the fullest buried layer.
- **Whole pile clickable**: the top-layer-only gating (setLayerClickable) is
  gone — every resident letter opens on click (openLetter reads without
  removing, so the stack never shifts). Raycast picks the nearest face, so
  you get the letter you're looking at through the cage.
- nav-fuzz sim 44/44; syntax-checked. Not yet seen by James in-world.

## 2026-08-10 — Claude (Fable 5) — Waltz With My Darling joins the broadcast

- James's new Suno track `Waltz-With-My-Darling.mp3` (instrumental waltz, 2:19,
  scribe confirms no vocals) spliced into `RADIO_PROGRAM` as the fifth number,
  between Worn Fiddle Porch's break and the dj8 loop-closer (dj8's "pick it
  back up" read still lands on High Chaparral untouched).
- Four new KDLO speech pieces written + generated (voice Bill, eleven_v3,
  stability 1.0): **dj9** intro (Eddie Sorrel and his Lamplight Orchestra —
  "if you have to explain a waltz, you're dancing with the wrong person"),
  **dj10** sign-off (Eddie's Pearl, the hose, forty-one years), **ad9**
  (Vogel's Fine Jewelry — "she already knows, son"), **ad10** (Marlowe's
  boxed chocolates). Even/odd dj numbering convention kept: even = intro,
  odd = sign-off.
- All five clips baked through the r12 AM chain with `--clip 1`, RMS-matched
  (limiter ×1.000 across the board). Program is now 25 items, 5 songs.
- Break format preserved: song → sign-off → two ads → intro next → song.
- Not yet heard on air by James. NOTE: radioOn=false at load is still the r17
  speech-QA temp state — flip it back when speech QA ends.
- Next: James is recording a ~25-line batch of postmaster voice lines with
  slug filenames (blue-ink, donuts, …); Claude will match slugs to the script
  and wire them (context lines to their triggers, rest to ambient rotation).
  Lip sync per line comes later via AccuLips batches.

## 2026-08-08 — Claude (Fable 5) + James — HE SPEAKS: the AccuLips viseme pipeline (r17)

Morning-into-afternoon session before James's wedding trip; same arc as r16.

- **The voice system is live, bubbles are DEAD** (James: "get rid of those and
  they won't be coming back") — speak() now routes ONLY to recorded audio;
  the line pools remain as the recording script for future ElevenLabs bakes.
  Six AccuLips TTS mp3s wired: 4 line-mapped (VOICE_LINES) + 2 monologues
  (proximity-triggered at stations, talk clip as body base, 4–7min cooldown).
  Distance falloff, "voice" channel on the sound control.
- **Amplitude jaw-flap REJECTED on sight** ("muhh muhh muhh... did you really
  think i was going to accept") → **the AccuLips viseme pipeline**: James
  re-runs each line's take in iClone against the existing mp3 and exports
  per-line FBX (Range brackets from the AUDIO CLIP's start; Delete Unused
  Morphs UNCHECKED; the first export was one frame — Range forgotten).
  build_speech.py (tmp/dead-letter-office/iclone-speech/) samples the moving
  viseme morph channels at 60fps + the JawRoot rotation into
  assets/speech-clips/visemes.js (script-tag loaded, file:// safe).
  applyVisemes() plays them synced to audio.currentTime; fallback flap only
  for unbaked lines. r-for-regret is the proof line; five more to export.
- **The swallowed-jaw demon**: multiplying the jaw quaternion per frame
  compounds when a near-frozen clip stops rewriting the bone (reproduced in
  the harness — 120 frames wrapped the jaw fully around). Fix: ABSOLUTE
  application — base pose captured while silent × viseme delta. Same class
  of bug as the r16 splay windmill; lesson: post-mixer bone writes must
  never be relative.
- **lipSync tuner dial** (mouth lead over audio, −0.1..1.0): James's sweet
  spot is 0.4s — his audio output chain's real latency, not a data bug (the
  viseme data starts at frame 1; envelope verified numerically).
  **lipPunch dial** (0.6–1.5 intensity multiplier) for articulation emphasis.
- **QA stand**: freeze now teleports him to open floor (wander1), natural
  idle-1 stance at STILL (the A-pose is banished — James "can't look at it"),
  click always answers (force-interrupt), QA_ROTATION currently
  ['r-for-regret'] only. **Radio starts OFF (TEMP)** — restore radioOn=true
  when the QA grind ends.
- Mouth fidelity verdict: ~60% of the CC5 stage read ("he's still mumbling...
  but six weeks ago we had a blender weird shaped muppet"). Remaining gap
  diagnosed: morph normals stripped from the GLB export (shading doesn't
  follow the lips), CC's wrinkle/SSS stack. TABLED with the optimization
  pass (his brief: profile the world, decimate the un-decimated full-fat
  glasses, tier textures — checkpoint FIRST). **Checkpoint saved**:
  tmp/dead-letter-office/checkpoint-2026-08-08/ (world files + GLBs +
  speech clips — one-step restore before any optimizing).
- Also this session: hair mip-darkening fix (generateMipmaps off on
  Hair/Scalp maps — white strands averaged black at distance), letter
  carry recentered past the fingers with arm-swing pitch, walk treadmill
  divisor corrected twice (final 0.324 m/s·m — integrated planted-foot
  method; percentile methods overestimate on asymmetric gaits).
- Bigger-picture conversation recorded: Unity ≈90% mouth fidelity
  (real-time, item-8 fork), iClone render-out = 100% but film; browser
  ceiling ~75% with morph normals. His long-term want: near-readable lips.
- NEXT: five remaining viseme FBX exports (the r-for-regret recipe), then
  restore QA_ROTATION + radioOn, bake the full line pools with ElevenLabs
  (voice pick first), the optimization pass, monologue gestures.

## 2026-08-07/08 — Claude (Fable 5) + James — THE ICLONE NIGHT: real motion, full-fat body, museum mode (r16)

Same session as r15, continuing past midnight. James: "the single most
significant night since we figured out how to use Meshy with Blender."

- **Face bugs found by James's LOOK AT HIS FACE**: corneas exported opaque
  (alpha 1.0, no wiring — grey-button eyes) and eyelashes rendered as an
  opaque black mask in three.js. Fix: corneas alpha 0.08 blended, lashes
  deleted outright (fix_eyes.py). Both fixes carried into every later bake.
- **FULL-FAT BAKE is the shipped model** (bake_full.py): native 2048 textures,
  no decimation, WebP q92 — 88MB GLB, James's call ("one high-res character in
  a low-res room"). His verdict vs the compressed 40MB: face/textures
  "genuinely look better."
- **Museum mode**: pmStill tuner toggle + big FREEZE button — stops all clips
  (bind A-pose), halts roaming, for model inspection. The windmill lesson:
  pmSplay adds rotation per-frame and compounds when the mixer stops writing
  bones — splay now gates on !pmStillOn.
- **The office panel redesigned** (James: "one of the weakest ones we have"):
  sectioned cards (his look / the room / the mail / his routine), 2× text,
  real padding, A−/A+ text size control (persisted), FREEZE + reset buttons.
- **THE ICLONE PIPELINE VALIDATED END-TO-END**: CC5 → File → Export → Send to
  iClone (NEVER FBX import — "character not compatible"); motions audition
  on the character; per-motion FBX exports (Blender preset, 60fps, Range =
  the green play-range brackets, no textures, Delete Unused Morphs) into
  tmp/dead-letter-office/iclone-motions/. James exported EIGHT: breathe-1/2,
  idle-and-smile, talk-serious, walk-and-think, walk-relaxed 1-start/2-loop/
  3-end. Plus SIX speech mp3s via AccuLips TTS into assets/speech-clips/
  (unwired — voice system is its own session).
- **build_pack.py** (durable, iclone-motions/): 8 FBX → one 10.6MB
  animations-only GLB (iclone-pack.glb). Blender 5.1 layered-action API
  (action.fcurves is GONE — all_fcurves() walks layers/strips/channelbags).
  Walk clips pinned in place (root X/Z zeroed). **Facing normalization**: every
  iClone clip carries its stage yaw (64–97° here, split across bones — zeroing
  root rotation under-corrects); the fix MEASURES the animated hips' world yaw
  at frame 0 vs rest via thigh-head lateral axis and counter-rotates all
  BoneRoot keys. World switched to the pack; real idle-1/2/3 retire the
  frozen-walk stand-in; talk/walk-think/walk-start/walk-end ride along unused.
- **pmSplay default 12 → 0** (iClone motions are animated on HIS body; knob
  kept for future imported clips). Tuner storage key bumped v2 → v3.
- **James's three in-world verdicts, all fixed same night**: (1) too small →
  pmHeight tuner dial (default 1.90, live rescale in applyTune); (2) ice
  skating → walk timeScale now derives from the clip's MEASURED treadmill
  speed (0.324 m/s per meter of height — planted-foot travel integrated over
  the loop; the gait is asymmetric and percentile methods overestimate; the
  first fix at 0.442 only closed ~⅔ of the glide). Skate-free by construction
  at any walk-slider value — the slider now purely picks his energy; (3) the
  letter "paper bracelet" → carried letters were anchored to the wrist joint;
  now lerped 70% toward CC_Base_R_Mid1 into the palm.
- His overall verdict: "semi-pro look... he looks fantastic."
- NEXT: voice system (six mp3s waiting + the spoken-six list in
  tmp/dead-letter-office/john-dough-lines.txt, talk clip ready); a real
  hand-grip pose for the carry; a faster walk option; iClone set-export
  harness idea parked (DLO as an iClone stage for authored scenes). The
  GALACTIC BAR & GRILL world idea captured in World Ideas.md as James's.

## 2026-08-07 — Claude (Fable 5) + James — John Dough v2: the do-over body ships (r15)

James's escape-velocity call: stop chasing the reference, build "the actor who's
reminiscent of the drawing," and move on from this world.

- **Rebuilt in CC5, James driving with Claude coaching**: head extracted from
  Postmaster-body-01 as a Custom → Head Morph & Skin asset ("postmaster-head" —
  the save grabs the head off the stage avatar, tree selection is only folder
  nav), applied to a fresh standard-height base (Apply Character Preset, all
  three boxes + Head Color to Body = the neck seam fix). Heavy Male preset
  (found at Actor → Body Morph → CC3+, search beats the tree) + Ultimate
  sliders; NO height-down this time — standard skeleton so stock retargets fit.
- **Beard verdict**: Beard & Brows Builder pack is 10 fixed card meshes + 34
  elements + materials, NO morphs — confirmed against the store page; the big
  marketing beard (artist showcase render) does not exist in the pack. Sculpt
  brushes just shove individual cards ("wrecking it"). Landed on the stock
  combo in white — "distinguished postal veteran." Long solid-mesh beard stays
  a future Blender-conform project.
- **Dressed from the uniforms pack**: khaki shirt + black tie + UPS-style
  trousers + belt + boots + pilot cap (black texture brightened via right-click
  → Adjust Color on the diffuse, then tinted olive [149,90,23] — multiply
  can't lighten black, Adjust Color can). Meshy glasses-split + cap attached
  to CC_Base_Head; hair under hat hidden (Face tab → **Visible Brush** row —
  the row formerly known as Visible Mesh, item 39 correction).
- **Export**: `john-dough-v2.Fbx` (120MB) + JSON sidecar; full settings
  checklist re-derived (gear icon opens the advanced panel — Mouth Open as
  Morph lives there, plus Delete Hidden Faces checked this time, which
  pre-stripped nearly all covered skin: body 42 faces, legs 0).
- **Bake rebuilt as durable scripts** (`tmp/dead-letter-office/cc5-bake/bake-v2/`
  — inventory.py, bake.py, fix scripts, pm-v2-check/zoom/splay.html harnesses):
  cut TearLine/EyeOcclusion shells, decimated glasses (35k→8k, lens 36k→2k),
  tints re-applied from the sidecar (cap/pants/frames/lens/eyes), lens alpha
  0.06, textures 1024/512 WebP → **40.6MB GLB, 176 body morphs + conforming
  beard morphs intact**, 1.70m. Render-verified (Blender EEVEE + three.js
  harness with the live walk clip).
- **The thigh-patch hunt**: mid-stride skin patches = the HANDS clipping the
  round thighs (v1 arm angles baked in the retarget; CC Pose Offset can't fix
  clips). Diagnosed by selective-hide snapshots; axis proven empirically in
  pm-v2-splay.html. **Fix: pmSplay tuner knob** (default 12°, 0–25) — outward
  local-Z rotation on both CC_Base_*_Upperarm applied AFTER mixer.update every
  frame, so it rides every current and future clip.
- `assets/postmaster/john-dough.glb` REPLACED with the v2 bake (v1 in git);
  world.js unchanged except the splay (PM_HEIGHT 1.68 normalization absorbs
  the height change; same CC_Base_* bone names, walk-pack plays as-is).
  Syntax-checked; nav sim 44/44.
- NEXT (James's mission statement for this world: baseline postmaster, a few
  animations, pathing, ~6 spoken lines, then move on): retarget more of the
  12 banked Mixamo clips on his go (real idles first — the frozen-walk
  stand-in still runs), then voice lines (ElevenLabs, behavior-weekend spec),
  then he's done here for a while. AWAITING his in-world look at v2 + walk.

## 2026-08-04 — Claude (Fable 5) — John Dough enters the world (r14, walk-only test)

James's call: before animations/voice, get the CC5 bake in-world to judge presence.

- **PM_V2 flag in world.js** (true): loads `assets/postmaster/john-dough.glb`
  (CC5 bake, 31.6MB, 177 morphs) + `walk-pack.glb` (walk retargeted from
  Mixamo via Auto-Rig Pro headless; tmp/dead-letter-office/cc5-bake/retarget/
  has the scripts + the full explicit mixamo→CC bone map — ARP's auto-mapper
  is UNRELIABLE on CC skeletons, it sent LeftArm to the forearm and a finger
  to a toe; always use the explicit map). Flip false = Meshy postmaster back.
- v2 height 1.68; head/hand bones CC_Base_Head / CC_Base_R_Hand; emissive
  trick recreated by hand (CC bake ships no emissive — pmGlow contract holds);
  idles = frozen walk subclip so no T-pose at stations. Nav sim 44/44.
- **James's verdict:** height good, fits the aesthetic, cartoony enough to
  belong. Fix list before real animations/voice: feminine hips, giant moobs
  (CC5 slider fix, his drive), tight pants, hands clip body when walking
  (3-joint arm-chain offset agreed: upperarm out / elbow out / wrist back in
  — a plain splay was rejected, "not gonna accept a pose walking around"),
  jerky in-place dance at stations, sashay walk. Scalp fix landed same night
  (hair alpha), "hair looking good".
- The other 11 banked Mixamo clips: retarget approved in principle, NOT run
  ("i didnt say start") — the batch only fires on his explicit go.
- **Beard: Meshy conform experiment parked** (complexity retreat). The
  meshy-v2 beard.glb conformed + jaw-rigged in Blender (scripts in
  cc5-bake/retarget/, beard-fit.blend) — mechanically works, mouth moves it,
  but Claude shipped it 2× too big and floating off the face; James caught
  it. He's reconsidering Reallusion Beard & Brows Builder (~$40–50, dense
  cards survive our pipeline — tonight's hair proves it) vs whitening/
  cartoonifying stock CC beards. NEW IDEAL REFERENCE: James pasted a
  higher-res ChatGPT front turnaround in chat — beard hugs the jaw, compact,
  not a mane. NOT SAVED TO DISK — get the file from him next session.

## 2026-08-03 — Claude (Fable 5) — the great furnishing expansion (r13)

James's brief: make (nearly) everything arrangeable, flip the desk, more pipes,
fix the light shafts, walk a touch faster — clean room now, new postmaster next.

- **Everything placeable.** New FURNITURE types: `chair`, `couch`, `plant-big`,
  `plant-small`, `coffee-table`, `work-table` (the donut table), `big-table`
  (door table), `bookshelf`, `parcel`, and the tabletop `svc-*` clutter
  (coffee service, donuts, lunchbox, parcel scale, twine, ledger+ink). The
  house sign is wall art now (`art-housesign`, appended to James's saved
  layout at its old spot). GLB types clone Meshy props with per-item materials
  (glbFurnSource/fillGlbFurniture); their old fixed-prop/STATIC_BOXES copies
  are gone. Fixed set that remains: desk + chair + dressing, basket, furnace,
  radio, cabinets, pigeonholes, radiator, corkboard/clock/tallies/STAIRS.
- **Surface items** (`surf: true`): no camera keep-out, carry a `y`, and in
  arrange mode they raycast onto whatever's under the cursor — tables,
  shelves, other parcels, or the floor. Arrange panel regrouped into
  furniture / tabletop / wall art with headers, panel scrolls.
- **The desk flip.** Desk faces the room (center z −4.9, rotY π), chair
  between desk and wall, John Dough works BEHIND it — new `desk` station
  (1.85, −5.42) facing the room, reached via new nav node `deskW` through the
  west gap. Desk dressing mirrored (lamp/mug/papers/RTS sign). New concept:
  `PM_LANES` — floor he may walk that the camera may not (the strip behind
  the desk); the nav sim exempts lane points in TEST 3.
- **Dynamic stations.** `coffee` anchors to the first placed `work-table`,
  `couch` to the first placed `couch` (refreshDynStations: stand-off in front
  of the item, auto-wired to the nearest clear hub). No item → routine
  retires quietly. James's current cleaned layout has neither, so those
  routines are dormant until he refurnishes.
- **Pipes**: fat 0.15 r steam main (E–W + N–S branch), return line, mid-room
  run, four risers punching the ceiling with collar flanges.
- **Light shafts**: each is now two planes crossed on the beam axis, and every
  plane's opacity fades by view angle each frame — edge-on it dissolves
  instead of reading as a floating pane of glass. Side falloff baked into the
  texture; `tune.shaft` still scales it.
- **Camera walk +10%** (2.2 → 2.42 m/s; wheel dolly matched, TOP_SPEED cap
  unchanged).
- **Sim**: restored to its canonical path `tmp/dead-letter-office/
  nav-fuzz-sim.mjs` (it had been shuffled into `_files/` where its relative
  world.js path breaks); updated for surf filtering + PM_LANES. 60/60 green
  against BOTH James's saved layout and the reseeded DLO_DEFAULT_LAYOUT
  (classic furnishing as placeables; work-table moved west of the desk — its
  old spot blocked the new desk approach).
- server.mjs `furnitureTypes` extended with all new types.
- NOT eyeballed in-world (sound world, stays out of the pane) — James flies
  it next. Open questions for his pass: RTS sign readability, lamp/mug spots
  on the flipped desk, chair-behind-desk clearance, shaft fade strength.

Round two, same session (James: "silly not to have it there" + the reset):

- **The desk set is placeable too**: `desk` (GLB), the chair stays the generic
  `chair` placeable, and the dressing became `svc-lamp` / `svc-mug` /
  `svc-papers` / `svc-rts` surface items — dressDesk() is gone; only the JOHN
  DOUGH wall sign stays fixed. The banker's-lamp PointLight anchors to the
  first placed svc-lamp (dark when none; tuner respects it).
- **The file cabinets are placeable**: `cabinet-bank` (the whole 5×2 bank as
  one item, drawer fronts on its facing side, one drawer randomly left open).
- **The radio is placeable** (it had to be — it sits on the bank): keeps its
  Meshy textures (`keepMats`), stays click-toggleable, glow mats + RADIO_POS
  follow the placed item, record.cleanup deregisters on remove.
- **Dynamic stations grew**: `desk` and `cabinets` join coffee/couch. Approach
  wiring got smarter — no own-box exemption anymore; when no straight hub walk
  is clear (the behind-the-desk case) it wires hub → side node → station so he
  walks AROUND his desk. Postmaster homes at wander1 if no desk exists.
- **"clear the room"** button in arrange mode: native confirm, removes every
  placed item (furniture, clutter, art), nothing saved until "save layout".
- STATIC_BOXES is down to pigeonholes + radiator; PM_LANES now empty (kept for
  the sim contract). Both layouts reseeded with desk set + bank + radio; both
  sim runs 52/52 green. The nav-warning + shade machinery skips
  `keepEmissive` mats (lamp glow, radio dial).

Round three, same session (James: "add the rug, the postmaster sign, and the
thing that is like shelves with reams of paper"):

- **The rug is placeable** (`rug`): surf-flagged so it has NO keep-out (you
  walk over a rug) but it sits in the furniture palette, not tabletop; its
  threadbare texture draws per-item from the seed. Old fixed rug removed.
- **The JOHN DOUGH sign is wall art** (`art-postmaster`, drawPostmasterSign)
  — the last fixed piece of the desk corner. Seeded into both layouts at its
  wall spot above where the desk stood.
- **The pigeonholes are placeable** (`pigeonholes`): same cubbies + legs +
  resident bundles, built local-space; slot positions are recorded locally
  (PIGEON_LOCAL_SLOTS) and refreshDynStations maps the FIRST placed unit's
  slots to world space. `pigeon` joined the dynamic stations; with no unit
  placed (or none reachable) the basket routine burns everything instead of
  filing — pmFileCarried also self-guards mid-walk. The old pigeonhole
  static box shrank to just the coat-rack corner.
- Sim 49/49 green against James's saved layout (rug/pigeonholes/postmaster
  sign appended at their classic spots); server allowlist grew the three
  types; arrange palette picks them up automatically.

Round four, same session: **rug two** (`rug-2`, James's brief: 1920s–30s
oriental, dark reddish-maroon + brown with gold woven in, symmetrical floral
filigree). Drawn procedurally in-engine (not a Blender bake — no asset file,
live shade, per-item wear) with strict 4-way quadrant symmetry: lobed central
medallion, corner spandrel fans, gold filigree vines, rosette-and-diamond main
border between guard bands, knotted fringe on the short ends. 4.4 × 3.06 m.
If the drawn look misses, the fallback is a Meshy tile / Blender bake swap.

Round five, same session — **the blank-canvas pass** (James: place everything
organically first, repath the postmaster after):

- **The postmaster is BENCHED**: `PM_ENABLED = false` skips his loader; every
  pm path already guards on pmModel, so he simply never exists. The loading
  poster now lifts when the last prop lands. Flip the flag + re-run the sim
  to rehire him.
- **Arrange nav warnings OFF** (`NAV_WARN = false` in arrange.js): nothing can
  block a walk that isn't happening — no red items, place anything anywhere.
  Flip back on at rehire time.
- **Coat rack, radiator, corkboard are placeables**: `coat-rack` (pole + pegs
  + mail bag), `radiator` (fins + feed pipe, long side along x), and
  `art-corkboard` (wall art; the pm corkboard routine is a dynamic station
  now, anchored to wherever the board hangs — refreshDynStations learned to
  anchor to wall-art items, no side-step fallback for art).
- **STATIC_BOXES is empty** — every camera keep-out now derives from placed
  items. PM_STATIONS lost its last furniture entry (corkboard).
- **Art seeding gated**: DLO_DEFAULT_ART seeds fresh visitors (no layout file)
  only. A SAVED empty layout stays empty — James's blank canvas is
  authoritative. His layout.js is currently `items: []` on purpose.
- Sims 46/46 green (empty layout, no static boxes). Server restarted by James
  mid-session, then allowlist grew coat-rack/radiator/art-corkboard — **needs
  one more restart before the next save layout.**
Round six, same session — arrange-mode quality of life (James's asks):

- **Per-item LOCK** ("you stay"): `lock in place` / `unlock` button; a locked
  item can't be picked up, dragged, wheeled, slid, or deleted — clicking it
  just shows its lock state (grey box helper) while the camera drags right
  past. Duplicates of a locked item start free. `locked: true` rides the
  layout JSON (server writes items verbatim — no server change, no restart).
  "clear the room" still removes locked items (it has its own confirm).
- Palette buttons alphabetized by label within each group; panel font bumped
  a point (13px base / 12px buttons).
- Also this round: `rug-2` seeded nowhere on purpose; oil-tank Meshy prompt
  handed to James (first render good, floating feed-valve to be re-rolled
  with the bottom-fittings line removed; import plan: scale to 2.05 m, rusty
  iron in-engine, `oil-tank` placeable).

Round seven, same session — **the oil tank** (James's Meshy generation, 2026-08-04
early): 10k-tri remeshed tank verified by headless-Blender render (the 31.6MB
canvas GLB stays in tmp/_files). House tile route on James's call — Meshy
text-to-image rust tile (3cr, nano-banana) → `assets/textures/rust-tile.jpg`
(1024 jpg) + `texRust` (never-black fallback, clone registry); Blender strip
pass killed the baked 4K steel maps and cube-projected UVs at 0.5m/unit →
`assets/props/oiltank.glb` (444KB). `oil-tank` placeable (gh 2.05m,
prop_oiltank rust material, repeat 0.4). KNOWN WART: the generation's floating
feed valve under the belly is baked into the mesh — James decides: delete the
disconnected island in the strip pass (artifact cleanup) or re-roll the model.
Server allowlist +oil-tank (restart still pending). Sims 46/46.

Round eight, same session — **James's Meshy prop batch + live counters**:

- The drum counters are placeable wall art: `art-tally-dead` / `art-tally-
  claimed` (WALL_ART `live:` entries — every placed copy shares the runtime
  canvas via LIVE_ART_TEX, so the count keeps ticking wherever they hang;
  unlit like the old fixed signs). Fixed addSigns removed.
- The drawn 3:11 clock is GONE (James's call) — replaced by his Meshy pendulum
  clock as `art-wallclock`, the first GLB wall-art entry (buildArtItem grew a
  glb branch: centered mesh, pushed off the wall by depth/2, faint dual-atlas
  self-light). WALL_ART glb defs: gh (hang height), depth, w (panel-only).
- Four more of his canvas props, render-verified then baked (decimate + 1024
  WebP in headless Blender; 72MB of canvas GLBs → 6.3MB in assets/props):
  `bookshelf-2` book rack (steel, floor, 63k tris), `coffee-maker` (surf),
  `mug-green` (surf), `lunchbox-2` Vault-Tec (surf). All keepMats; the
  keepMats path now damps Meshy dual-atlas emissive to 0.25 generically.
- Arrange QoL (same round, earlier): footprint-aware wall clamp (bookshelf
  back can kiss the wall; rotation re-clamps; surf clutter reaches wall-side
  desk tops) + world-click highlights the item's palette button (green/orange
  border) and scrolls it into view.
- Oil tank: James reports the redone tank has the valve attached + two end
  valves; his call is the current one is fine, no further action. (If the
  in-repo oiltank.glb still shows the floating valve in-world, re-run the
  strip pass on whichever GLB he drops next — pipeline is in this changelog.)
- Server allowlist +7 types. Sims 46/46. Server restart still pending before
  the next layout save.

Rounds nine+ (late night into 08-04, James furnishing live, features on demand):

- Arrange QoL: per-item lock grew L-key toggle + orange selected outline +
  select-while-locked; palette alphabetized + font bump; footprint-aware wall
  clamp; world-click highlights the palette button; spawn-IN-HAND (new items
  ride the cursor, click sets down, Esc cancels — no more lamps born inside
  desks); Ctrl+S saves; art drags on wall PLANES (the pendulum-clock corner-
  snap bug) and carries height in the same drag; art also mounts on vertical
  furniture faces (JOHN DOUGH sign on the desk front); shade range 0.5–2.5
  (server 0.4–2.6).
- Movement: walk 2.42→2.78, TOP_SPEED 3.5, Shift = 2× sprint, R/F eye height
  promoted from arrange-only to the live view (smooth, floor→rafters);
  ceiling fixtures ghost to 10% ONLY while the eye is inside their ~1m bubble
  (per-fixture mats — everything else stays solid).
- More placeables from James's Meshy batch: exit sign (art glb, def.glow),
  open book, wastebasket (first `wear:` user — rust composited at 15% at
  load), floor lamp with a REAL light (pool of four, anchored to the first
  four placed). Welcome mat converted. PM shelves relabeled "PM shelf: …".
- Rust tile regraded in place (45% desat, umber tint) after James's "too red,
  like old paint" — tank + wear users inherit on refresh, zero credits.
- **THE POSTMASTER IS REHIRED** (PM_ENABLED true, NAV_WARN true) against
  James's fully furnished 60-item room — sim 44/44. His window station moved
  to the south-west window (the oil tank owns the west one now) and
  approaches via H4 only, nudged to (-5.6, 4.8) to clear James's shelf by
  the strict arrange-warning rule. James's layout always wins; routes bend
  around it.
- NEXT SESSION (James, at wrap, happy — "a really good night... months
  getting here"): bring in the CC5 John Dough proper (tmp/dead-letter-office/
  cc5-bake/john-dough.glb, see item 0.5) — sizing against desk + chair, then
  animations + voice (he's picking a voice). The current Meshy postmaster
  retires with honors — AGREED (James: "we definitely should do that"): he
  gets a framed portrait as a placeable wall-art item, hung in the office
  he used to run. Render the old model for the frame before anything else
  touches him.

- REHIRE CHECKLIST for the repath session: PM_ENABLED true, NAV_WARN true,
  re-run nav sim against James's final layout, sanity-check dynamic stations
  (desk/coffee/couch/cabinets/pigeon/corkboard) against where he actually put
  things, and re-tune nav hubs if his room shape moved the walkable lanes.

## 2026-08-02/03 — Claude (Fable 5) + James — John Dough dressed, baked, web-ready

- Accessories night in CC5, James driving with Claude coaching by screenshot:
  the Meshy family hat and glasses (GLB→FBX via headless Blender) fitted and
  attached to CC_Base_Head; hair-under-hat hidden; lenses at 4% opacity;
  stock stylized eye preset fixed the too-human irises. Wardrobe stays stock
  CC content for now (uniform bundle purchase deferred, James's call).
- The export track ran end to end for the first time: CC5 FBX (Mouth Open as
  Morph) → headless-Blender bake → `tmp/dead-letter-office/cc5-bake/
  john-dough.glb` — 31.7MB, 106 bones, all 177 facial morphs including the
  16 visemes. Meshy props decimated, WebP textures, CC tints re-applied from
  the sidecar JSON (plain FBX drops them), stray hidden jeans cut.
- James's verdict: "light years ahead of where we have been."
- Open: beard reads thin post-pipeline ("older biker, not Santa pirate") —
  agreed fix is a Stylized Hair Pro solid-mesh beard ($22, awaiting his go);
  DLO world wiring is the next step (placement/behavior design conversation
  first); then animations and voice.

## 2026-07-31 — Claude (Fable 5) + James — the length strata (deck 58 → 68)

- James on the 46: content "really good... hit the mark with the vibe", but
  the uniform length reads unreal — he wants scraps through sagas ("some that
  are just a couple of words... a handful that are, like, two pages").
- **3 trims** (scarecrow, projectionist, quilt divorce) — each down to its
  best lines. **10 new**: two-word letters ("Come home. — everyone" / the
  "Yes." that missed the Harvest Dance), one-sentence divorce filing ("File
  it before he apologizes again," stamped Overtaken by Events), the milkman
  note, the glove of principle, Gene Mackey's ten-item Santa list (item 6
  cross-references Dorothy Cade's Petey — same December), and FOUR SAGAS
  (the letter panel scrolls, verified: max-height 88vh + overflow-y auto):
  the Gorczak/Piatek fence feud 1934–1969 (ends "Enclosed is one dollar"),
  the sewing-box inventory from lot 40, night watchman Brozek's final
  hourly report ("Nothing takes attendance"), and Grandma Holm's cardamom
  bread recipe with digressions. The twelve untouched; portals 4/68.
  JAMES APPROVED ALL 68 ("the cardamom bread recipe is classic... let's use
  all of these") — the whole deck is now protected text.

## 2026-07-30 — Claude (Fable 5) + James — the deck grows: 12 → 37 → 58

- **25 new letters** ("the later acquisitions"), James's ask after the KDLO
  session: wry, poignant stories-in-a-paragraph in the house voice, appended
  after the protected twelve (verbatim untouched; first envelope still
  guaranteed airmail). Among them: a KDLO listener who has noticed the
  broadcast repeats word for word and irons to it like scripture; the
  Novak/Kessler letters that crossed in March 1954 and both came back; the
  scarecrow's reference letter; Operator No. 9 and the ice-storm wrong
  number; the eleven-mile balloon answered 24 years late. James: "true to
  form... I like them very much."
- **21 more — the shelf-box strata** (his follow-up: sample what's IN the
  archive boxes): Santa ×5 (the naughty-list litigator; Alma's Korea letter —
  "the house with the dog"; the 1899 red-sled follow-up; Roger Blum's hedge —
  "a man can leave a light on without knowing who comes"; Dorothy Cade's
  skip-our-house), chain letters ×3 (incl. E. Grandy, 84, returning her luck
  unused), divorce papers ×3 (the quilt too warm to file; page four's
  three-inch reason space; the 11-years-unclaimed decree), evictions ×3 (the
  landlord's paragraph two; the courthouse swallows; FORT DEFIANCE vs the
  railroad), resignations ×2 (the dog warden whose heart changed sides; the
  fireman's boots on the third peg), confessions ×5 (the firewood angel; the
  7:22 clock; the sinkers in the bass; the statue with the tailor's face; the
  silent soprano). Deck: 58, portals still 4/58. AWAITING JAMES'S READ — any
  he cuts or rewords, edit in place.

## 2026-07-30 — Claude (Fable 5) + James — KDLO: the radio becomes a broadcast

- **Worn Fiddle Porch** (new Suno track from James) baked through the r12 house
  chain (`--hp 550 --lp 2400 --box 6 --squash 24 --drive 1.7 --static -30
  --crackle 2.5 --kbps 96 --clip 1`; RMS matched exactly, limiter ×1.000).
- **The KDLO broadcast**: Claude wrote a 1951 country-western DJ package
  (Prairie Home Companion droll — made-up bands/players per tune, KDLO station
  id) + eight 15s period ad spots (flour, Crestwood automobile, fishing rods,
  coffee, boots, hair tonic, washer, liniment). All speech is voice Bill
  (Social Media) `AGhk9wKpcIV2UvBus4CY`, model eleven_v3, stability 1.0,
  via `tools/eleven.mjs` (new `--stability` flag; also a new `stt` scribe
  command with word timestamps). James on the ads: "they're great."
- **Break format is James's spec**: song ends → DJ signs off that tune → two
  ads → DJ intros the next → song. First cut had combined sign-off+intro
  clips and put both ads before the DJ — wrong order on air. James's four
  combined reads were transcribed (scribe) to preserve his copy tweaks
  (Wilma the fiddle, the pine box, "Am I right, folks?"), then regenerated as
  EIGHT pieces: odd dj = sign-off, even dj = intro, dj8 loops the set. (A
  waveform-split approach was built and discarded the same hour —
  regeneration is cleaner.) All 16 speech clips baked through the r12 AM
  chain, RMS-matched.
- **world.js rewired sequential**: `RADIO_TRACKS` → `RADIO_PROGRAM` (20 items,
  `song:true` flags). Order is load-bearing (the DJ references), so no shuffle
  anywhere; tune-in starts on a random SONG (`RADIO_SONG_STARTS`), never
  mid-break. Dead air stays 1.8–4.4s after songs; speech cues tighter
  (0.6–1.3s).

## 2026-07-28 — Claude (Fable 5) — r12.3: desk to the wall, bigger sign

- **Desk pushed back** (James): rear edge now ~1 inch off the north wall
  (measured depth 0.78m → center z −5.585, Δ=0.585). Everything desk-bound
  moved the same Δ: chair, lamp (+lampLight), mug, ream stack, RETURN TO
  SENDER sign, the surface raycast probe, and the desk PM station (z −4.74).
  Keep-outs: desk box front follows (z1 −4.75) and extends east to x 4.0 to
  swallow the tucked chair — the moved chair CIRCLE limit-cycled against the
  pigeonhole box's west face (sim caught it, 31 trapped points), so the circle
  is gone; its east face is deliberately buried in the pigeonhole box.
  Sim 68/68.
- **Sign bigger** (0.88×0.25m at y 1.8): POSTMASTER promoted to 56px in warmer
  brass, JOHN DOUGH still clearly on top at 74px.
- **Donut-box lid removed** (James, mid-session): the propped-open cardboard
  lid behind the donuts read as a stray box balancing on its side.

## 2026-07-28 — Claude (Fable 5) — r12.2: the postmaster gets a name

Everything in r12.1 passed James's eye except the desk nameplate — his call:
off the desk, onto the north wall right above it, twice the size, and with a
name on it at last. **POSTMASTER / JOHN DOUGH** (John Doe, spelled like the
bread — James's joke, keep the spelling). Sign is 0.6×0.15m at (2.5, 1.62)
on the north wall, brass-bordered like the old plate.

## 2026-07-28 — Claude (Fable 5) — r12.1: second punch list (same day)

James's notes after the r12 report, plus new furniture. All his asks.

- **Grass fixed**: the sill blades were 2px grey "spikes" (his word) — now 1px
  curved leaning strokes in actual greens, denser.
- **Desk cleanup**: banker's lamp base sat half inside the surface (cylinder
  centered on y=0) — lifted onto it and the whole lamp moved to the desk's rear
  (z −4.68 → −4.86, light follows). POSTMASTER nameplate was merged with the
  paper reams — moved to the back edge (−4.88); the three reams were
  interpenetrating at one height — now a proper vertical stack, each ream a
  little askew. The cylinder "cup" replaced with a real Meshy mug.
- **The mug saga** (18cr total, lesson recorded in props-manifest): two direct
  text-to-3d attempts failed (fused-slab handle; then a three-handled loving
  cup — a Blender handle-ectomy + voxel remesh made it worse and was abandoned
  per the complexity-retreat doctrine). The image route landed first try:
  nano-banana product photo → image-to-3d meshy-5 untextured →
  `assets/props/mug.glb`, ceramic colored in-engine, loaded inside dressDesk
  (needs deskSurfaceY, so not in PROPS).
- **Welcome mat** at the stairwell door: drawn coir texture, worn WELCOME,
  oriented to read for whoever comes down the stairs.
- **The couch corner**: low coffee table (mkTable, 1.1×0.5×0.42 at −5.2,−4.3)
  with a small plant on it, flanked by two beat-up chairs (chair.glb reused,
  worn grey-brown tints, angled in). One new STATIC_BOXES keep-out covers the
  set (north face deliberately buried in the couch box); the couch nav edge
  reroutes wander2 → H8 (−3.0,−4.9) → couch so he walks the lane between couch
  and table. Sim 68/68.
- **Brick hearth** under the furnace corner: Meshy paver tile (3cr,
  nano-banana), rows natively periodic, horizontal wrap crossfaded 40px —
  verified tiled. 3.8×4.2m pad at the southeast corner, a hair proud of the
  slab like the rug; canvas fallback drawn in brick tones (never-black rule).

Not yet flown by James (r12 + r12.1 land together).

## 2026-07-28 — Claude (Fable 5) — r12: James's ten-item punch list

All from one brief; every item below was his direct ask.

- **Swing look is THE look**: drag always swings the view now; the grab/swing
  toggle button is gone (and this world no longer touches the shared
  `elastic-look-mode` key).
- **8 rotation stops in arrange mode**: furniture wheel-rotation snaps to 45°
  steps — 4 wall-square + 4 diagonal (`snapRot`/`ROT_STEP` in arrange.js, wheel
  delta accumulated per ~100). New spawns snap too. Existing saved rotYs are
  untouched until rotated.
- **All wall art is placeable**: new `WALL_ART` catalog in world.js (5 image
  posters + 4 drawn: lift-with-knees, zip directory, mr. delivery, LOST? cat) +
  `buildArtItem`. Art items live in the same layout file with an extra `y`
  (hang height); `DLO_DEFAULT_ART` seeds the classic placements when a saved
  layout has no art yet. In arrange mode art sticks to walls (drag slides it
  along/across walls, per-item z-fight offset), wheel raises/lowers (0.7–3.5m),
  scale/shade/duplicate/remove work. No keep-out, no nav impact. server.mjs
  validates the 9 art types + optional y (0–5). Fixtures (house sign, clock,
  tallies, corkboard, STAIRS plate) stay put on purpose.
- **Archive labels 32 → 72**: the pool is still finite/preset (one atlas tile
  per label — that's the single-material discipline), but at 72 the repeats
  thin way out. Atlas maxes at 80 tiles of the 2048px canvas (72 labels + 4
  plain + 4 taped tops).
- **Radio hears where you look**: falloff = distance × facing (dot of camera
  forward vs direction to the set, floored at 0.4 so it never vanishes).
  Throttle tightened frame%15 → frame%3 since look direction changes fast.
- **Radio tone shittier** (his ask: tinny 1955 AM): re-baked all three tracks
  `--hp 550 --lp 2400 --box 6 --squash 24 --drive 1.7 --static -30
  --crackle 2.5 --kbps 96 --clip 1`. New `--clip` flag in tools/radio-bake.mjs:
  soft-clips peaks after RMS match instead of scaling the track down — the
  narrowband bake couldn't reach source RMS without it (first attempts landed
  −5 to −7dB; with clip, RMS matches exactly and the overs distort like a small
  overdriven speaker, which is the point).
- **Painted cinderblock walls**: Meshy text-to-image (3cr, James's ask),
  sage-green institutional paint, low-rent but not peeling. Mortar grid
  measured (System.Drawing), cropped to an exact 3×3 block period so it wraps —
  verified on a 2×2 tiled render. Canvas fallback redrawn to cinderblock
  proportions. Old brick wall.png lives in git history.
- **The rug**: 3.4×2.2 → 4.4×3.2, moved from mid-floor to under the desk,
  sticking out in front with the chair fully on it.
- **Mechanical counters**: tally boards redrawn as riveted steel drum counters —
  per-digit windows, rolled-wheel shading with neighbor digits peeking at the
  edges, flap seam. DEAD LETTERS starts at 614,739 and still ticks live.
  UNCLAIMED is now **CLAIMED: 0000017** (it does not tick; 17 is the joke).
- **Sky outside the windows**: panes carry a drawn sky (overcast blue gradient,
  soft clouds, sidewalk grass silhouettes along the sill) instead of flat
  blue-grey.

Sim: 66/66 green after everything. Not yet flown by James.

## 2026-07-27 — Claude (Fable 5) — r11: arrange mode (James's furniture editor)

James's ask after flying r10: drop/move/rotate the shelves, boxes, and crates
himself — "the layout I would come up with would be much more human designed
looking." Not full curate mode; a lighter bespoke editor.

- **The layout is a file now**: `assets/layout.js`
  (`globalThis.DEAD_LETTER_OFFICE_LAYOUT`, kind "furniture") loaded by script
  tag (file:// safe), seeded from the r10 placements; `DLO_DEFAULT_LAYOUT` in
  world.js is the fallback. The r1 hardcoded crates became layout items.
- **Arrange mode** (`arrange.js`, dynamic import at `?arrange=1` on the served
  copy; "arrange" pill on the admin panel row): 8-item palette (shelf row,
  wall shelf, tall shelf, half-empty shelf, stacks of 3/2, lone box, crate),
  click an item to pick it up, drag on the floor, wheel rotates, Del removes,
  duplicate, size (0.6–1.6) + shade (0.5–1.5) sliders live per item. Save PUTs
  `/api/worlds/dead-letter-office/layout` — the server validates a new
  "furniture" layout dialect (server.mjs `validateFurnitureLayout`) and backs
  up the previous file every save.
- **Safety stays honest**: camera keep-outs derive from item footprints
  (`itemKeepOut` — rotated rect → AABB, wall-near faces extended past the
  wall) and rebuild live as he drags. Overlapping/near-touching ITEM boxes
  merge into cluster AABBs (`mergeItemBoxes`) — the sim caught two coincident
  crates burying every push face of each other; static boxes never merge (a
  blanket union would swallow the floor in front of the pigeonholes). Items
  whose footprint crosses a postmaster nav edge tint red live ("he will clip
  through it"). Every save runs a 6k-point in-browser trap fuzz and warns with
  coordinates if the layout can pinch the camera.
- **Sim updated** (nav-fuzz-sim.mjs): reads assets/layout.js (or the world.js
  default), replicates itemKeepOut + mergeItemBoxes verbatim, now prints trap
  sample coordinates on failure. Caught a real pinch: the east-corner unit's
  expanded face against the furnace keep-out circle left a sub-body gap
  (circle↔box pushes limit-cycle) — east unit and stack nudged clear.
  66/66 green. Endpoint probed live: bad type 400s, real layout round-trips.
- Deterministic seeds: every item carries a seed (mulberry32) so its exact
  boxes/labels survive reloads and rebuilds.
- Where things stand: **built + sim/endpoint-verified, awaiting James's first
  arrange session.** His eye: palette coverage, drag/rotate feel, slider
  ranges. Known conservative edge: an L of touching shelves merges into one
  blocking AABB (the notch closes to the camera) — the save warning reports
  real traps only.

## 2026-07-27 — Claude (Fable 5) — r10.1: the mail cart and sacks are gone

James flew r10: "radio good. music good. shelves good. will need better
placement later." Then his screenshot caught the r1 mail cart (bin on caster
legs) and the three sphere sacks by the south wall — crude primitives he
couldn't even identify ("a desk looking thing with a sphere on the ground").
Removed outright, plus the cart's keep-out box; the wooden crates stay (they
read as crates, and the loose archive stack leans on them — flagged to James
that they go too on his word). Sim re-run: 66/66. Open from his verdict:
a shelf-placement pass, on his direction.

## 2026-07-27 — Claude (Fable 5) — r10: the archive stacks + the AM radio plays

James's brief: the room is NOT settled — fill it like a police archive room
(steel shelving, labeled dated boxes), and put a 1945–1960 radio in the world
playing his three baked Suno tracks.

- **The archive stacks**: five steel shelving units (posts, slab shelves, X
  cross-braces) filled with bankers boxes — two freestanding double-sided rows
  mid-room forming an aisle (the spawn sightline runs straight down it), wall
  units in the north/south/east-corner gaps, plus five loose floor/cabinet-top
  stacks. 32 authored label categories on manila cards with typed titles, date
  ranges (1947–1991, respecting the MARCH 1991 calendar), and red rubber
  stamps — DIVORCE PAPERS, LETTERS TO SANTA, PATENT APPLICATIONS (REJECTED),
  DICK PICS (CONFISCATED), SÉANCE REQUESTS, THREATS (VAGUE), MESSAGES IN
  BOTTLES, and 25 more. Perf: every box face samples ONE 2048px canvas atlas
  (one material for the whole archive) and each unit's boxes merge into a
  single geometry — the entire archive is ~12 draw calls, all matrices frozen.
- **The AM radio** (Meshy, 30cr: meshy-6 preview 20 + refine 10, remeshed at
  generation to ~30k quads — 58k tris, `assets/props/radio.glb`): a 1950s
  walnut bakelite set on the file cabinet bank, angled at the room. The only
  fully textured prop; the PROP_MATERIALS swap passes it by (nothing named
  prop_radio — keep it that way). Meshy dual-atlas emissive kept ON faintly
  (the r4 pmGlow lesson) and brightens slightly while playing.
- **The radio plays**: all three baked tracks (`-radio.mp3` siblings — Moon
  Over Dry Wash's bake existed but was never logged; nothing new baked, three
  tracks confirmed). Shuffled order, 1.8–4.4s of dead air between numbers, ON
  by default when sound starts, click the set to toggle. Its own "radio"
  channel slider on the shared sound control, and volume falls off with
  distance from the cabinet corner so it reads as coming from the box.
- **Constraints**: five new camera keep-out boxes (one per unit; aisle stays
  walkable at 1.6m). The fuzz sim was scratchpad-only and lost — rebuilt
  DURABLE at `tmp/dead-letter-office/nav-fuzz-sim.mjs`: it slices ROOM/
  CIRCLES/BOXES/stations/nav straight from world.js source (no drift), then
  30k-point fuzz + grid-BFS reachability of all 14 stations + the aisle + nav
  edge clearance. 66/66 green. Nav graph untouched — no station or edge needed
  to move.
- **Look-dev**: `tmp/dead-letter-office/archive-lookdev.html` (silent, KEEP) —
  evals the live archive section sliced from world.js and renders 3 fixed
  views (?view=0/1/2); verified the atlas UVs (labels upright, dates + stamps
  legible) without ever loading the sound world in a pane.
- Where things stand: **r10 built, sim-verified, lookdev-verified, awaiting
  James's walk-through.** Judgement calls for his eye: shelf-row placement/
  height vs the spawn sightline, box label legibility at walking distance,
  radio scale/angle on the bank, radio level vs ambience, the dead-air gap.
  Postmaster does NOT interact with the archive or radio yet — that's behavior
  weekend material (an "archive browse" station sketched but not built).

## 2026-07-26/27 — Claude + James — postmaster speech clip baked; wardrobe work continues in Face Lab

`test-speech-long.mp3` (60.5s, the postmaster's soliloquy) re-baked with a dialog
transcript. `test-speech-long.txt` now sits beside the clip and
`tools/lipsync-bake.mjs` picks it up automatically on any future re-bake.

The ElevenLabs script's bracketed audio tags ([thoughtful], [chuckle], [pause])
are performance directives, NOT spoken words — strip them before Rhubarb sees the
text or it phonemises "chuckle" as dialogue and drags the alignment off. Effect
was marginal on this clip (328 → 326 cues, near-identical shape distribution)
because Rhubarb's audio-only pass already handles a slow, well-enunciated read;
the transcript version is still the one to keep.

All postmaster character work this session — new bald head, KeenTools pass, facial
hair generation and mounting — is logged in `src/labs/face-lab/changelog.md`.
Nothing else in this world changed. The postmaster is NOT ready for in-world
integration: the beard's fit is unresolved and the rest of the wardrobe (hair,
brows, cap, glasses) is not generated.

## 2026-07-25 — Claude (Fable 5) — click-away dismissal (site-wide sweep)

- New house rule from James: every control panel dismisses on click-away. Added
  the standard `pointerdown`-outside handler to the "tune the office" panel.

## 2026-07-23 — claude-fable (speech clips gain viseme bakes)

- James dropped the first voice clip into the new `assets/speech-clips/` folder
  (`test-speech.mp3`); baked its Rhubarb mouth-cue timeline
  (`test-speech.visemes.json`) with the new `tools/lipsync-bake.mjs`. The clip
  is playable with lip sync in the Face Lab dialog bench (`src/labs/face-lab/`).
  No world code touched. This feeds the future postmaster-speech decision — see
  the Face Lab CLAUDE.md for the pipeline.

## 2026-07-23 — claude-fable (radio music lands)

- First two Suno tracks for the office's future AM radio (James authored:
  High-Chapparal, Highland-Ghost-Waltz → `assets/radio-music/`), from a
  Claude-drafted prompt: old-timey pedal steel quartet, wistful-not-sad,
  1957 AM-radio production. James: "the music sounds great."
- New durable bake tool `tools/radio-bake.mjs` (audio-decode + lamejs devDeps;
  the Fifteen Sisters bake script was ephemeral and lost): mono sum, 300Hz–3.5kHz
  4th-order bandpass, +4dB box at 1.4kHz, 5:1 squash + soft clip, faint static
  bed + dust ticks, RMS-matched (~3dB under source after peak limiting). Baked
  `-radio.mp3` siblings for both tracks — those are what the radio will play.
- Second prompt drafted (bass/drums/harmonica/theremin, spooky Lydian-b7 country)
  — two more tracks coming tomorrow night. Radio prop itself not built yet.

## 2026-07-23 — claude-fable (r9: posters doubled)

- All five r8 GPT posters doubled in width (heights follow aspect): wesee 0.66→1.32,
  calendar 0.72→1.44, workrules 0.68→1.36, happiness 0.62→1.24, wanted 0.68→1.36.
  Tallest now tops out ~3.3m against the 4.1m ceiling; no wall-neighbor overlaps.

## 2026-07-22 — claude-fable (r8: James's GPT posters hung)

- Five painted posters from James (GPT-made; source PNGs archived in repo
  `assets/Dead Letter Layers/posters/`, converted to ~400KB JPGs in world
  `assets/posters/` via headless Blender — 15MB → 1.9MB):
  WE SEE/WE SORT/WE FORGET eye (north, replaces the procedural eye poster),
  the egret MARCH calendar (north, replaces procedural MARCH 1991),
  WORKSHIFTS & REMINDERS starring the postmaster himself (south, replaces
  IDLE HANDS SORT NOTHING), the happiness pin-up (east, replaces line-art
  Miss Par Avion), and WANTED BY THE FBI — correspondence-related offenses
  (west, above the door table; one of the mugshots wears a mail cap).
- Kept procedurals with no replacement: LIFT WITH YOUR KNEES, ZIP DIRECTORY,
  Mr. Special Delivery, the LOST? cat (it's the future cat's setup), corkboard.
- New `imagePoster` helper: true-aspect planes, SRGB, Lambert, staggered wall
  offsets (no z-fighting with the office sign), slight hang tilt.
- Where things stand: hung, awaiting James's eyeball on sizes/spots.

## 2026-07-22 — claude-fable (r7: taller still)

- Postmaster 1.79m → 1.89m (James: four more inches). `PM_HEIGHT`, one constant.

## 2026-07-22 — claude-fable (r6: couch, bookshelf, sad plants)

- **Couch** (Meshy preview, 5cr — the prop pipeline dresses previews in code, so no
  refine needed; total spend 129): worn olive three-seater on the north wall, aimed
  square at the basket. New `couchSit` routine gives the seated `look-around` clip a
  home at last — he walks over, delivers a couch line ("We had chairs once. Now we
  have this."), sits and watches the letters fall, sometimes dozes. Camera keep-out
  box face sits behind the cushion so his sit station clears the (strict) sim.
- **Bookshelf**: procedural, east wall between the cabinet bank and furnace. Frame +
  five boards in house wood; each shelf row is ONE canvas plane of painted spines
  (jittered widths/colors, one leaning book per row, vertical titles): manuals up top
  (POSTAL REG. VOL 7, ZIP SUPPL. 1974, FORMS 11-C), romance below (THE LONELY
  COURIER, POSTMARKED, LOVE, FIRST CLASS HEARTS, RETURN TO SENDER, AIR MAIL AFFAIR).
- **Plants**: two more instances of the existing Meshy plant with new per-spec `tint`
  support — browner, sadder, alive ("a little brown and a little sad, but okay
  generally"): one on the bookshelf top, one potted by the couch.
- Parked by James for later sessions: GPT-made posters (he supplies PNGs →
  assets/posters/, plates sized to fit), the furnace chute slot in the south wall
  (timed pile dumps — solves pile lifecycle diegetically), and the cat (revisit;
  low-poly procedural is the recommended path; the LOST? poster is its setup).
- Where things stand: **r6 committed, awaiting James's eyeball.** Watch: couch scale/
  orientation (Meshy preview normalized to 0.8m tall — width follows), the sit
  alignment (he sits ~15cm proud of the cushion front; nudge station z if it reads
  as hovering), bookshelf spine legibility at walking distance, plant tint browns.

## 2026-07-22 — claude-fable (r5: he stands a little taller)

- Postmaster height 1.70m → 1.79m (James: ~3–4 inches — he read small against the
  furniture). One constant (`PM_HEIGHT` in the load block); stations, nav, and clips
  are height-agnostic so nothing else moves.

## 2026-07-22 — claude-fable (r4: the postmaster is always visible)

- James: skip physically-correct lighting on him — "just lighten him up so I can always
  see him." The Meshy dual-atlas emissive copy (stripped in r1 for realism) is back ON at
  partial strength: he self-lights with his own colors in any corner, and the room's real
  light still layers on top. New `pmGlow` tuner slider (0 = room-lit only, 1 = fully
  bright; default 0.42) — live, persisted, zero per-frame cost.
- Where things stand: James dials pmGlow by eye; bake his number into TUNE_DEFAULTS after.

## 2026-07-22 — claude-fable (r3: the optimization pass + the z-fight)

- **Poster flicker fixed**: THE MAIL IS WATCHING overlapped the DEAD LETTER OFFICE sign at
  the same wall depth (z-fighting). Moved left/down clear of the sign and staggered the
  wall offsets (sign 0.02 / calendar 0.03 / eye 0.035).
- **The lag diagnosis** (James: slows when he's near the camera with letters falling): the
  hover raycaster was testing his actual skinned mesh every 3rd frame — CPU per-triangle
  skinning math on (then) 288k tris. He now has an invisible capsule click-proxy; the
  skinned mesh is never raycast. Hover checks throttled 3rd → 6th frame.
- **Postmaster decimated** 288k → 86k tris in headless Blender (decimate keeps vertex
  groups; all 24 pack-targeted bones verified present by name — the anim pack binds
  unchanged). GLB 19.2MB → 11MB. Original stays in tmp/dead-letter-office/meshy/.
- **Render cost trims**: dynamic-resolution caps 1.75/1.35 → 1.5/1.1 (fill rate was the
  budget on a 2560 screen); envelopes share ONE plane geometry + one cached material per
  letter (was: fresh geometry + fresh Standard material per envelope); envelopes, posters,
  parcels, paper piles, rug switched Standard → Lambert (no specular lobe × lights on
  dozens of small meshes); real point lights 9 → 8 (east bulb is now glow-only); settled
  pile letters + floor strays freeze their matrices (hundreds of static transforms no
  longer recompose per frame).
- Where things stand: **r3 committed, awaiting James's FPS verdict.** If it still drags:
  next levers are fluor light count (5 real → 3), envelope pile mesh-merging past ~layer 3,
  and a ?fps=1-style frame readout is already available from the Mandala pattern if we
  want numbers.

## 2026-07-22 — claude-fable (James's first-walk-through punch list: "more light overall")

- **Brightness pass** (the r1 room read as a castle dungeon): 7 fluorescent twin-tube
  fixtures (5 with real lights, 2 emissive-only; STEADY — the flicker veto from the 2D
  era stands), hemisphere fill nearly doubled behind a new `ambient` tuner, exposure up,
  fog down, window light up. Tuner gains `ambient` + `fluor` sliders and moves to
  localStorage key `dlo-room-tuner-v2` so stored dungeon-era values don't override the
  new defaults.
- **Floor**: dungeon pavers out, polished concrete in (new 6cr Meshy tile with coffee-ring
  stains, `assets/textures/concrete.png`; old floor.png kept on disk, unused). Roughness
  dropped so the sheen catches the fixtures.
- **Cozier walls**: two more barred windows (south pair) with light shafts; posters —
  THE MAIL IS WATCHING eye, MARCH 1991 calendar (the 11th circled), LIFT WITH YOUR
  KNEES / SORT WITH YOUR HEART, ZIP DIRECTORY (the letters' destinations), IDLE HANDS
  SORT NOTHING, and two chaste pin-ups (Miss Par Avion + Mr. Special Delivery, line-art,
  fully dressed); a corkboard with pinned notes and the little status stickers.
- **More furniture**: double-deep bank of ten green file cabinets on the east wall (one
  drawer open since '85; the lone cabinet it replaces is gone, plant moved onto the bank);
  donut table by the desk (coffee service, box of six donuts, his lunchbox); big table by
  the stairwell door (parcel scale with a stuck needle, parcels, twine, ledger, ink);
  parcels scattered wherever a surface holds still.
- **The basket fills for real**: letters land bottom-first and genuinely accumulate —
  per-layer pile that fills the tapered cage, mounds past the rim, then spills onto the
  floor around it (spill chance grows with the mound). Only the top layer + floor spill
  stay clickable; buried letters quietly recycle past 250 residents. The bulb the letters
  used to fall through is gone — replaced by the two fluorescents flanking the basket.
- **Postmaster fixes + variety**: found the stuck-treadmill bug (walking to the station he
  was already at yielded an empty path and he walked in place forever — routine picks now
  exclude the current station, and pmWalkTo arrives immediately on an empty route). New
  rounds: consults the corkboard, browses the file cabinets, pokes the fire, and takes a
  door break — walks out the stairwell door, gone 18–43s, comes back with a line
  ("Upstairs is still there. Unfortunately."). Coffee now happens at the donut table,
  sometimes with a donut instead of the mug.
- **Constraint hardening**: the fuzz sim caught two more trap classes — wall-flush box
  faces losing to the wall clamp, then adjacent-box corners ping-ponging the push. Keep-out
  boxes now precompute valid push faces (inside the walls, not buried in a neighbor);
  30k-point fuzz is clean, all 13 stations BFS-reachable.
- Where things stand: **r2 awaiting James's second walk-through.** Same soft spots as r1
  (prop scale/orientation, carry offset, walk timeScale) plus new eyes on: fluorescent
  levels vs the cozy target, pile look at high counts, spill scatter.

## 2026-07-21 — claude-fable (solo, James's "make it a lot cooler" directive)

- **Full 3D room rebuild** ("the room arc" the changelog kept promising). The 2D rendered-plate
  world is replaced by a walkable three.js basement hall, 18×12m (~2× Mandala Shop), built on
  the Mandala Shop architecture: WASD + drag-look (shared grab/swing preference), wheel dolly
  with the motion-sickness speed cap, dynamic resolution, keep-out constraint system. Eyes and
  facial expressions deliberately untouched per James — the eye-rig work stays parked in the
  tmp viewer.
- **The postmaster walks his shift.** The Meshy rig + patched 18-clip anim pack (copied from
  tmp into assets/postmaster/) drives a station-graph brain: desk work (stamp thunk), basket
  pickups (bow = the pickup; the letter rides his right hand), filing into the pigeonholes,
  feeding the furnace (scheme = striking the match, whoosh + light flare), punching the wall
  clock (ka-chunk), coffee at the filing cabinet (sigh clip finally makes sense: he's blowing
  on it), window gazing, wandering. Clicking him turns him to face you + a line + wave/bow/
  wag-no. All the authored line pools survive; new small contextual pools for furnace/coffee/
  clock/filing. Nav graph + camera constraints verified by Node sim (30k-point fuzz found and
  fixed two real trap bugs: wall-adjacent circles, then wall-flush box faces).
- **Mail falls for real**: envelopes (canvas-textured planes, airmail striping intact) drop
  from a ceiling INCOMING chute, flutter into the wire basket, land (flutter sfx, DEAD LETTERS
  wall tally ticks up), stay clickable from any angle — falling, in the basket, or floor
  strays. Letter overlay + deck logic + the four return-address drift exits unchanged; the
  stairwell door is a fifth (click = drift). E opens the nearest letter.
- **Meshy assets** (~118cr total, 18cr over the 100 pre-approval — overage is textures-only
  arithmetic, flagged to James): 3 seamless tiles (wall/floor/wood, 6cr ea) + 5 text-to-3d
  preview meshes at 20cr ea (desk — a roll-top bureau with built-in pigeonholes, captain's
  swivel chair, wire basket, potbelly furnace, potted plant). Previews are untextured: NOT
  refined (would be +50cr past the cap) — decimated 3.8M→~300k tris + cube-UV'd in headless
  Blender, textured in-engine (wood tile + tints; task ids in assets/props/props-manifest.json
  for a proper 10cr/prop refine later if James wants). Basket generated as a domed birdcage;
  bisected in Blender to an open-top cage. Plant split pot/leaf materials by height.
- **Room dressing**, all procedural: hanging cone-shade bulbs, banker's lamp (green pool),
  furnace stovepipe + ember glow, barred high window + light shaft, radiator, stairwell door
  with wire glass + STAIRS sign, punch clock (live MM:SS canvas), pigeonhole wall unit, filing
  cabinet + coffee station, coat rack + mail bag, crates/sacks/mail cart, worn rug, DEAD
  LETTER OFFICE / WE DELIVER NOWHERE sign, stopped clock at 3:11, DEAD LETTERS + UNCLAIMED
  tally boards, LOST? cat poster.
- **Sound**: ElevenLabs ambience bed (hum + pipe clanks + drips, looped) through the shared
  control, plus furnace-whoosh / punch-clock / letter-flutter / coffee-sip one-shots and the
  existing stamp-thunk, all gated by the control's state and volume.
- **Tuner**: "tune the office" panel (Chrome Rift pattern) — bulb/lamp/furnace/shaft/fog/
  mailEvery/fallSpeed/pace/walk, localStorage `dlo-room-tuner`, JSON readout + reset.
- Verified: `node --check`, nav/constraint sim green, `npm run check-worlds` (one warn: the
  4 letter exits are dynamic so the checker only counts the door — 5 real drift choices).
  NOT eyeballed in a browser (no-inline-QA rule; server was down all session). James tunes
  by eye next: prop scales/orientations, desk-item raycast placements, light levels, carry
  offset in his hand, walk timeScale vs feet-skating.
- Where things stand: **built, sim-verified, awaiting James's first walk-through.** Known
  soft spots for that pass listed above; the old 2D world is fully preserved in git history.

## 2026-07-18 — claude-fable (with James, viewer polish night)

- Viewer modes split at James's request: **idle** = truly still (calmest clip frozen at
  timeScale `STILL`=0.0001, facing forward) so the face can be inspected; **fidgets** = the
  old living behavior (idle rotation + random one-shots). Idle also eases the head back 17°
  (the still frame pitches him ~18° down). Two bugs en route, both James-caught: timeScale 0
  stops the mixer rewriting bones, so the per-frame tilt compounded into ~3 somersaults/sec;
  fixed by the near-zero timescale. Fix verified in the Node sim before shipping.
- James's clip audit at true amplitude: keepers walk/run/shrug/wave/wag-no/bow; serviceable
  sigh/scratch/stomp/alert/look-around (seated clip — needs a chair); replace one of
  headache/facepalm (duplicates) and scheme. Details in `tmp/dead-letter-office/meshy/anim-notes.md`.
- Face textures repainted from scratch (v3) after James's "skin with little dots" verdict on
  the v1 eyes — v1's sclera was flesh-pink AND its paint regions were mostly wrong (only one
  eye, splattered across neighboring UV islands). True per-eye atlas regions found by
  ray-cast + UV dump; synthetic almond paint (white sclera/iris/pupil/glint/liner); verified
  by headless Cycles portrait renders. Wide, half-lid, and blink read clearly; eyes-up is
  subtle. v1 backups in `meshy/faces/_old-v1/`.
- Face v3 (texture almands) also failed James's eyeball — too small, old eyes visible
  behind ("eyes on top of eyes"). Root truth surfaced: Meshy has NO face rig; texture
  swap was always a workaround. **Pivot: 3D eye rig**, James's call. Atlas eyes painted
  out (`faces/face-skinned.jpg`), and the viewer now builds procedural eyeballs (sphere +
  iris/pupil/glint) with rotating lid shells, attached to the Head bone at runtime — no
  GLB re-export, anim pack untouched. Expressions are lid/gaze poses (normal / wide /
  eye-roll / heavy + geometric auto-blink); gaze control comes free for future letter-
  tracking. Verified in the Node sim: eyes land on the ray-cast socket points to 0.01mm,
  12.9mm world radius, zero drift from the bone through a walk cycle.
- Eye rig v2 after James's close-up review (screenshot: tiny cross-eyed circles floating
  in the wide painterly sockets — "I look so fucking crazy"). Design principle from his
  notes: the painted sockets keep ALL the lid/lash art; geometry supplies only what moves.
  Eyeballs are now wide shallow ellipsoids (leaf-shaped whites), iris/pupil in an unscaled
  front group (stays round), convergence yaw, unlit materials (lit ones caught the orange
  bulb + green lamp → "Exorcist" demon eyes). Viewer also gained a face cam (follows the
  Head bone, wheel zoom) and an **eye tuner panel** ("tune eyes" button, per the Chrome
  Rift tuner pattern): 11 sliders (spread/height/depth/size/width/tall/bulge/iris/pupil/
  converge/lidCover), live rebuild, localStorage (`dlo-eye-tuner`), JSON readout + reset.
- Where things stand: **James tunes the eyes by eye in the panel, then reads the JSON
  back to bake as defaults.** Then clip replacements and the room arc.

## 2026-07-18 — claude-fable (with James: still mode, 3D eyes, eye tuner)

- Viewer modes split per James: **idle** now means truly still — the calmest idle clip held
  near frame 0 at timeScale `STILL` (0.0001), facing forward, face inspectable — while
  **fidgets** owns the old living-idle behavior (rotating idles + random one-shots).
  Two bugs en route: the head-lift somersault (at timeScale exactly 0 the mixer stops
  rewriting bone poses, so the per-frame tilt compounded ~2.9 rev/s — hence STILL > 0)
  and an idle head-lift (+17° eased head-back so his downcast still pose looks at you).
- Faces, attempt 1 (texture swaps) worked but looked wrong at any distance: painted-on
  eyes read tiny/creepy ("eyes on top of eyes" on eye-roll). Root causes fixed along the
  way still matter: Meshy's material carries the color atlas twice (baseColor AND emissive
  at [1,1,1]) — swap BOTH maps or nothing visibly changes.
- Pivot to **3D eyeballs** (James: "shit, let's try the 3D eyeballs"). The painted eyes are
  now skinned over in the base texture (`meshy/faces/face-skinned.jpg`); real geometry sits
  in front: almond-warped eyeball (independent inner/outer corner pinch, so the corners pull
  to points), unlit materials (lit ones caught the room lights — the demon-eyes build),
  iris/pupil/glint discs that rotate for gaze/convergence, and lids as parametric bands
  draped directly on the almond surface — their edges are arcs (arcUp/arcLow bow sliders),
  their tips terminate exactly at the eye corners, closure is 0..1 (blink = closure 1).
- **Eye tuner panel** in the viewer ("tune eyes" in the face row): 16 tight-range sliders
  (position, size, shape, pinch, arcs, iris/pupil, converge, tilt — tilt counter-rotates
  the eyes for angry-in/sad-out), values persisted in localStorage, live JSON readout,
  reset. Slider rebuilds go through a rest-pose-captured matrix — rebuilding via the live
  posed bone teleported the eyes ("pupils flew away"). Wheel-zoom mode added for close
  inspection; build stamp in the corner hint catches stale tabs.
- Admin panel: DLO row got a **testing page** pill (curate-pill style) linking to the
  Meshy viewer.
- Where things stand: **eye machinery works, art is next.** Tonight's plan: James paints
  the definitive eyes in Procreate over a zoomed screenshot — one complete layer per piece
  (sclera/iris/pupil/lids/lashes, both eyes), exported as PSD — and Claude UV-maps the
  layers onto the existing parametric pieces and fits the shape defaults to his art, so
  the sliders keep working under his paint. Open small items: one unexplained brown
  arc-shaped smudge at the top inner of each eye (suspects: leftover painted crease in
  face-skinned.jpg vs the flat-color lid band itself — James screenshot pending), and
  expressions get redefined after the art lands.

## 2026-07-17 — claude-fable (animation diagnosis session)

- James re-supplied his full end-of-last-night assessment (the previous entry undersold it:
  essentially every one-shot read tiny/mushy, and he kept returning to an unnatural pose).
  Verbatim per-clip notes preserved in `tmp/dead-letter-office/meshy/anim-notes.md`.
- Diagnosis, all headless (Node + vendored three.js AnimationMixer, no browser): the Meshy
  clips are fine — full amplitude in both the raw GLBs and the consolidated pack, identical
  skeletons, everything binds. The bug was in viewer.html: the `finished` handler nulled
  `oneshotAction` before `playBase()`, so finished one-shots (clamped at weight 1 by
  `clampWhenFinished`) were never faded out. Every gesture ever triggered stayed frozen in
  the blend; each new one was averaged against the pile. Sim reproduced James's review
  numerically (bow 40.4% head-motion → 3.8% by the time he tried it; alert → "nothing").
  Fix: `e.action.fadeOut(0.35)` on finish. Verified by re-running the sequence sim —
  full amplitude regardless of history.
- Size pop: idle-1 alone carried a constant Hips scale track of 1.1765. Neutralized by
  binary patch of the pack GLB (backup: `postmaster-anim-pack.glb.bak`). Native size is
  the default now, per James — the room gets rebuilt around him anyway.
- James auditioned at true amplitude: most clips keep (walk/run/shrug/wave/wag-no/bow strong;
  bow "probably the best gesture"). To replace/rework: headache≈facepalm duplicates, scheme
  unclear ("making bread"). Context-dependent: look-around is a seated clip (needs a chair),
  alert needs a reason, sigh wants sound. Full audit in `meshy/anim-notes.md`.
- Faces had never worked outside Blender renders. Root cause: Meshy's rigged GLB carries the
  atlas twice — baseColorTexture AND emissiveTexture at factor [1,1,1]; setFace swapped only
  `.map`, so the emissiveMap kept painting the original open eyes on top. setFace now swaps
  both. Integration note: anything touching the postmaster atlas must swap both maps.
- Where things stand: **face fix awaiting James's eyeball** (buttons + auto-blink should now
  visibly work). Then: replace the weak clips, wire faces into gestures, and the bigger arc
  (full 3D room with better Meshy-era assets, comings and goings, real letters, basket fill,
  furnace routine).

## 2026-07-17 — claude-fable (with James, Meshy postmaster night)

- First Meshy character experiment, and it landed: a full 3D postmaster generated from the
  GPT concept art (`assets/ref/Normal.png`, cursor patched out — the blocky MPFB2 model was
  deliberately NOT used as input in any form). Meshy-6 image-to-3D + PBR (30cr), rigged (5cr),
  16 library animations (48cr). ~83 credits total, balance 997. All assets in
  `tmp/dead-letter-office/meshy/`: static + rigged GLBs, walk/run, 16 animation GLBs, and a
  consolidated 1.2MB `anims/postmaster-anim-pack.glb` (all 18 clips, NLA-track export).
- Face expression system, zero credits: eyes located in two rotated UV islands of the texture
  atlas (face-up = +X in both), four hand-painted variants (blink / wide / eye-roll / half-lid)
  verified via headless Blender face renders — all first-try. `meshy/faces/*.jpg`.
- Test viewer at `tmp/dead-letter-office/meshy/viewer.html` (served): postmaster standing IN
  the layered concept art (room/basket/desk depth planes), scene-matched lighting, drag/turntable,
  idle/walk/run modes, auto-fidget mode, 13 one-shot buttons, 4 face buttons, auto-blink.
- Known issues for next session: (1) he pops ~8% bigger during idle than other clips — suspect
  stale scale/root tracks differing between clips in the pack; inspect pack JSON, likely strip
  scale tracks. (2) Most library one-shots read tiny/mushy (facepalm can't reach face, bow ~3°,
  alert nothing) — leading suspicion is Meshy's retarget collapsing big gestures onto his stocky
  proportions; verify by rendering the raw withSkin GLBs directly vs the pack, compare with
  Meshy's own previews, and hand-animate replacements in Blender where needed.
- Where things stand: experiment declared a smashing success by James. Next: fix the two anim
  issues, audition/replace weak clips one by one, then the bigger arc — 3D room/desk treatment,
  his comings and goings, real letter content, letters physically filling the basket, and a
  furnace-feeding routine for the overflow.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-12 — claude-fable (later session, "do everything" batch)

- Asset-library check: only the default (empty, nonexistent) user library is configured —
  clutter stays scripted primitives in the house style.
- Dingy pass (all headless): noise-driven grime mixes injected into dlo_wall/wall_l/floor/
  ceil/wood/rug materials (world-position noise, height-faded on walls), bulb dimmed and
  ambered, plant killed (drooped sickly leaves), poster yellowed and tilted 3°. Clutter:
  twine-tied letter bundles on two shelves, ink bottle + lid on the desk, leaning carton
  stack right of frame, four more stray floor papers, two crumpled balls (`npm3_*`).
- Basket-front occluder: cage + rim bisected at y=2.7 via bmesh bisect_plane into back
  halves (stay in the plate) and `*_front` duplicates (hidden from the plate). Front set +
  DEAD LETTERS placard rendered film_transparent → `assets/room/basket-front.png`
  (crop px 81, 720, 485x354). world.js overlays it as a fixed img at z-index 5 — above the
  mail layer (z 3) — so envelopes visibly sink into the cage. Plate has no front wires,
  so no doubling and no compositor-seam risk. Sink deepened (0.45 → 1.35 envelope
  heights past the rim) and sink fade eased (0.4 → 0.22) to use the new depth.
- Base plate + all five pose crops re-rendered under the new light (same crop rect, so
  world.js constants held).
- Envelope restyle: pixel-art hard border/offset-shadow/pixelated swapped for soft
  1px border, warm graded paper, blurred drop shadow, soft creases; far/mid depth
  rows now also get a touch of blur.
- First sound in this world: `assets/audio/stamp-thunk.mp3` (ElevenLabs sfx, authoring
  pipeline). Plays on the stamp-down pose frame, routed through the shared
  ElasticSoundControl (zero-volume probe in start() so the control only reads "on"
  when audio will actually be heard).
- Postmaster material: +6 ambient lines, +4 click lines, shift lines extended to 30/45/60
  minutes; four melancholy ambient lines now trigger the sigh pose when spoken.
- Where things stand: **full batch awaiting James's eyeball** (dinge level, occluder
  alignment, envelope look, thunk volume are the judgement calls).

## 2026-07-12 — claude-fable (later session)

- MPFB Postmaster moved to the desk, posed, and animated. All work headless
  (`blender --background` on `tmp/dead-letter-office/dlo-room.blend`); the live instance
  was never touched.
- Rig work: head props (`NPM_head_anchor`) and both eyeballs bone-parented to `head`,
  clothing anchor to `spine01` (keep-world-matrix parenting — no tail-offset surprises).
  Old primitive `pm_*` figure hidden from render everywhere (kept in the file).
- Placement: rig at (-1.7, 1.58, 0), rotated 180° (MPFB rest faces -Y), scaled 1.26 —
  the room is theatrical scale (desk top at 1.22 m) and at human 1.68 m he read as a doll.
- Pose: forearms-on-desk idle. Guessed euler angles failed (jazz hands); the fix was
  world-axis aiming helpers that measure a bone segment's current direction and rotate
  by the delta. White shirt sleeves + cuffs added as cylinders along the posed arm
  bones, bone-parented so they follow every pose.
- Portrait rig (PM_PortraitCam, PM_Key/Fill/Rim) deleted; render restored to 1920x1080.
  New base plate rendered → `assets/room/room-render.png`; blend re-copied to assets.
- Animation: five pose plates rendered from one pixel-aligned border crop
  (px 1209, 454, 206x279 of the plate): idle, sort (letter to face — letter and stamp
  props live in the blend, parented to the wrists), stamp-up, stamp-down, sigh.
  Since EEVEE is deterministic, the crops match the plate exactly outside the figure.
- world.js: pose plates load as fixed-position imgs glued to the plate's cover-fit rect
  (idle always shown, action plates paint over it); the existing 140 ms `pmStep` tick now
  drives a weighted pose scheduler in render mode (sort/stamp-thump/sigh every 7–16 s,
  respects reduced motion); clicking him triggers the sort pose alongside his line.
  Click hotspot re-measured: x 0.6439, y 0.4449, w 0.0792, h 0.208.
- Verification: `node --check` clean; browser QA blocked — the dev server died
  mid-session (blank tab), so the pose swap has not been watched live yet.
- James's live QA, two fixes: (1) fluorescent tube-flicker overlay removed outright
  (".flicker" div + CSS animation, from the original build — "makes me feel like I'm
  gonna have a seizure"); (2) flickering rectangle around the postmaster — the pose
  crops were separate <img> layers scaled by the compositor while the plate under them
  is scaled by canvas drawImage, so the crop boundary ghosted at any viewport ≠ 1:1.
  Poses now draw straight onto the room canvas with the same scaler (consecutive crops
  share one opaque rect, so each draw fully covers the last; layout re-draws via
  SCENE.plate* + drawPmPose()). No more overlay DOM at all.
- Where things stand: **posed and animated, pending James's eyeball.** Possible next:
  stamp thunk one-shot (ElevenLabs), basket-front occluder plate, envelope CSS restyle
  to match the render.

## 2026-07-12 — claude-fable

- Started the realistic 3D Postmaster to replace the primitive one (target: the GPT pixel-art
  reference — warm sturdy old fellow, walrus mustache, round specs, cap with badge). Built with
  MPFB2 (installed from extensions.blender.org; CC0 output): aged macro body, 13 face targets
  (eye bags, jowls, broad nose), MPFB v2 skin shader with bundled textures, placed eyeballs.
- Lost mid-portrait: another Claude session opened its own .blend in the shared live Blender
  instance, closing the unsaved scene. Nothing on disk was harmed.
- Full rebuild is scripted: `assets/room/build-postmaster-mpfb.py` (run inside an open
  dlo-room.blend, live or headless; never opens/saves files itself). Header documents where the
  build left off and what comes next.
- Replay succeeded once the live instance freed up (one Blender crash mid-render along the way;
  the save-after-every-call habit meant zero loss). Character now fully built and dressed in
  `tmp/dead-letter-office/dlo-room.blend`, standing at (20, 0, 0) outside the room:
  - Head: cap/badge/specs/brows/mustache/beard cloned from the primitive postmaster (`npm_*`
    objects) and refit at 0.48 scale. Mustache placement only worked after querying the `lips`
    vertex-group bounds — his lips protrude to y -0.149, further than any eyeballed guess.
  - Body: James rejected the solid vest slab ("umpire's breastplate") and box hips ("fupa like
    a cinder block"). Redesign: white shirt block is the chest, vest is two front strips + side
    + back panels (open-vest look per the GPT reference), untucked shirt hem, slim trousers.
    Body itself reshaped via targets: stomach zeroed, hips/glutes/thighs slimmed.
  - James's verdict: "still very blocky... but acceptable. He looks appropriate for the room."
- Blend saved and re-copied to `assets/room/dlo-room.blend` (3.4 MB). Portrait rig
  (`PM_PortraitCam`, `PM_Key/Fill/Rim` lights) still in the file for next session's pose work.
- Where things stand: **dressed, unposed.** Next: move to desk, hide old `pm_*` figure, desk
  pose (forearms on desk), white sleeves + cuffs on the posed arms, eyes parented to head bone
  (watch the bone-tail offset gotcha), delete portrait rig, restore render res to 1920x1080
  (currently 640x800), plate render, re-measure hotspot NDC bbox for world.js.

## 2026-07-11 — claude-fable

- Sped up the mail at James's request ("its painful"): envelope fall speed ~2.5x (base 11–24 → 28–60 px/s
  before depth scaling), basket-sink floor 55 → 90 px/s, spawn gap 3.5–9s → 1.8–4.6s so the room
  stays populated at the faster clearance rate.
- Blender-rendered room backdrop (James approved the still; GPT reference image as target).
  Fully scripted scene via Blender MCP — `assets/room/dlo-room.blend` is the editable source,
  `room-render.png` the pixelated runtime plate (4x downres, Bayer dither, green grade, vignette),
  `room-clean-source.png` the ungraded render (not loaded by the page).
- `USE_ROOM_RENDER` flag in world.js draws the plate over the painted room and retargets mail
  physics at the rendered basket; painted-canvas code intact beneath — flip the flag to revert.
  Painted basket/desk overlay canvases hidden in render mode.
- James's verdict on the pixelation pass: too grainy (Bayer dither on smooth gradients + non-integer
  scaling moiré). **Decision: ship the clean render.** Re-rendered at native 1920x1080, no post;
  `room-render.png` replaced, redundant `room-clean-source.png` dropped, .blend updated in assets.
- Render mode now sizes the canvas 1:1 with the viewport (no DETAIL-grid resample), draws cover-fit
  (odd aspects crop, not distort), `image-rendering: auto`. Basket target: cx 19%, rim 64% of the
  drawn plate. Pixel-art postmaster hidden and `speak()` muted until his 3D replacement exists.
- 3D Postmaster built and shipped (James approved the room, asked for the postmaster next).
  Chunky low-poly figure from scripted primitives: cap + brass badge, round specs, mustache over
  grey beard, slate vest, red tie, sleeves leaning on the desk. Debug lessons preserved for
  posterity: `primitive_cube_add(size=1)` is a 1m edge (half my assumed size — the "exploded
  boxes" bug), and he was invisible at first because he stood exactly behind the banker's lamp.
  Portrait camera workflow (temp cam, deleted after) was the breakthrough for iterating his face.
- He is baked into `room-render.png` (scene lighting + contact shadows for free; new
  `light_deskbulb` warms the desk corner). His old canvas is now a transparent click hotspot at
  his rendered bbox (Blender NDC-measured: x 0.630–0.737, y 0.410–0.635 of the plate);
  click-to-speak works, bubble anchored above his cap. Punch clock moved to top-left wall,
  counter-style. Pixel-art painter code all intact behind `USE_ROOM_RENDER`.
- Arms de-jacked per James ("he's like jacked"): slimmer shoulder slab, thinner arms hung more
  vertically, smaller cuffs/hands. Pose rig added while in there: `PM_shoulder_l/r` and
  `PM_head_root` pivot empties (pose = rotate a pivot, no remodeling), plus hidden props
  `pm_prop_letter` and `pm_prop_stamp` for future pose plates. One more transform lesson logged:
  re-parenting under a fresh empty needs explicit local transforms (or a depsgraph update first)
  — his head briefly migrated to the ceiling.
- Fixed-arms render deployed as `room-render.png`; blend re-copied. Basket occluder parts
  identified for next time: `basket_cage`, `basket_rim`, `basket_sign` (+`_l1/_l2` lines).
- Where things stand: **draft.** Rendered room + slim-armed postmaster live; session wrapped
  mid-pose-work at James's request. Next, in order: (1) pose plates via render-border crops
  (region x 0.56–0.82, screen-y 0.32–0.72; sort/stamp/sigh + idle base) swapped over the plate in
  `USE_ROOM_RENDER` mode; (2) transparent basket-front occluder plate (film_transparent, front
  wires + placard only, overlay img at z-index 5); (3) envelope CSS restyle to match the render.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history and `world.json`.
- Where things stand: **status `draft` — awaiting James's approval for publication.** No pending
  working-tree changes.

## 2026-07-04 — interaction expansion (commit bb868ab, "Expand Dead Letter Office interactions")

- Postmaster sprite added: idle animations plus timed commentary.
- All mail now lands in the UNSORTED basket.
- Punch clock added; tracks visit time.

## 2026-07-04 — created (claude-fable with James; manifest createdAt ~02:50Z, in launch commit 97499fe)

- World created: undeliverable mail drifts down through lamplight; opened letters can be read.
- Letters are authored, not generated. Pixel-art and typography-forward night office. No sound.
- Exits: four ink-blue return addresses use shared random drift.

## Standing guidance

1. Draft until James approves publication.
2. Letters stay authored — resist the urge to generate them.
