# Arachno-Wars 2500 — changelog

## 2026-07-24 — Claude (James's spec) — graybox b12: longer legs, longer barrel

- Per-leg length multipliers (new `len` in LEG_DEFS, solveKnee takes it): all legs +25%,
  outer pair +10% more (1.375×), second pair +5% more (1.3125×). Body ride height and
  ALL gait numbers untouched — stays squat, extra length becomes knee arch and reach.
- Barrel +30% (tip 34→42.4).

## 2026-07-24 — Claude (James's direction) — graybox b11: asymmetric gait

- James: the ripple always left one rear pair streaming way out back — "driving me
  crazy." Explicit call: sacrifice realism, front legs overreach forward and PULL, rear
  legs dig in near the body and PUSH, lifting before full extension.
- Gait is now asymmetric by motion direction (speed-scaled, symmetric at standstill,
  swaps automatically on reversal): front legs target stance + 26px overreach (often
  into liquid-metal stretch — thin probing pullers); rear legs target stance compressed
  45% + 10px forward (tips just behind the body); rear legs also force-lift at drift 42
  (vs 80 emergency for everyone else) so the power stroke ends well before full reach.

## 2026-07-24 — Claude (James's lore drop) — graybox b10: liquid-metal legs

- James: the legs are LIQUID METAL — diamond-hard or fluid; stray legs reaching across
  a gulf are "the entire point" (b9 removed cross-poly planting, reversed here). Full
  identity + future verbs (squeeze/jab/grab/tool-use) recorded in CLAUDE.md.
- Cross-gap reach restored the safe way: when a leg's perimeter stance wraps >45px from
  the straight-line ideal (a gulf), it may target a DIFFERENT polygon within 150px —
  same-poly straight probes stay banned (b8 corner-clump bug can't return).
- Legs stretch: solveKnee no longer clamps at L1+L2 — beyond it, thigh grows at 0.28×
  excess, knee→tip at 0.8× (slight overshoot keeps a knee hint), and the whole leg THINS
  by the stretch ratio when drawn (conservation of metal). Min-distance clamp unchanged.

## 2026-07-24 — Claude (James's screenshot) — graybox b9: perimeter foot targets

- James's screenshot on a slope crest: all four rear feet snapped to the SAME corner
  vertex — straight-tangent probes past a convex corner all find the vertex as nearest
  terrain, bundling the rear legs into one full-stretch clump.
- Fix: foot targets now come from P.walk — each leg walks the terrain perimeter by its
  stance arc-length (sign-corrected from body frame to edge-winding frame), so feet get
  distinct surface points that wrap AROUND corners like a grip. closestOnTerrain probing
  dropped from leg targeting entirely. Side effect: feet only ever plant on the polygon
  the tank is attached to (no cross-gap planting) — correct spider behavior anyway.

## 2026-07-24 — Claude (James's retest) — graybox b8: rear trailing, root cause #3

- Rear legs still trailed after the b6 cadence fix. Real remaining cause: the whip
  profile — a stepping foot barely moves for the first 62% of its step while its target
  was FROZEN in world space, so at speed the body ran away from every mid-step rear foot
  (stretched straight behind, IK at full extension). Front legs hide the same lag by
  folding under the body.
- Fix: step targets now refresh every frame (ride with the body), step duration shortens
  with speed (0.1s → 0.065s at full walk), re-step trigger 24→16, lead reduced to pure
  forward bias (speedAlong*0.024, cap ±10) since target motion is no longer baked in.
  Whip profile shape untouched.

## 2026-07-24 — Claude (James's retest) — graybox b6: teardrop actually fixed

- b5's lead bump didn't cure the teardrop; James confirmed on the right build. Real
  cause: fixed 0.06s wave delay → each leg re-steps every 0.24s → at WALK_SPEED 340
  every planted foot drifts ~50px rearward before its turn. Lead only moves the landing
  point; cadence is what bounds the drift.
- Fix: gait delay now speed-scaled (10/|speedAlong|, clamped 0.024–0.07s) so a full
  4-pair cycle ≈ 40px of travel; lead cap 40→46 (≈34px step-travel compensation + ~10px
  forward bias). Feet now plant slightly ahead of stance and barely drift behind it —
  probing front, tucked rear.
- b7: James — "little calmer": cycle distance 10→12 (~48px of travel per full ripple).

## 2026-07-24 — Claude (James's tweaks) — graybox b5: longer lower legs, teardrop fix

- Lower leg segment longer per James (L2 44→52, L1 28→30); stances widened to match
  (±24..±80). solveKnee gained a min-distance clamp so the near-hip inner feet can't
  fold the 2-bone IK degenerate now that L2−L1 is bigger.
- Teardrop fix: moving gait was rear-biased (planted feet drift ~25-35px rearward
  between steps at WALK_SPEED 340; old lead only offset 26). Lead raised to
  speedAlong*0.13 capped ±40 — front legs now probe ahead, rear legs tuck up behind,
  stance stays roughly even at speed.
- Flight splay widened for the longer legs.

## 2026-07-24 — Claude (James's direction + AW2000 reference art) — graybox b4: eight legs

- James's b3 verdict: looks better, cool start; LOVES the cling/climb/over-and-under, the
  fast stable landing catch, and the speed/fluidity of the leg motion — those are now
  protected behaviors. Two AW2000 renders shared as the leg reference.
- Legs 4 → 8. Hips cluster tight on the body (±2..±16); feet plant WIDE along the surface
  tangent (stance ±18..±78) — outer legs go flat/low-slung, inner knees fold high, matching
  the reference silhouette. Foot targets probe from body center + tangent offset, so the
  stance wraps around corners.
- Leg proportions per reference: lower segment longer than upper (L1=28, L2=44), rendered
  as tapered filled quads — thick at hip → knee, bulb at the knee, long taper to a needle
  tip. (Gotcha kept: L2−L1 must stay well under the inner-leg foot distance or the 2-bone
  IK flips.)
- New wave gait: legs rank front→back in the facing direction, adjacent ranks pair up,
  pairs step two-at-a-time in a ripple (window advances 0.06s after a pair fires — overlap
  = flow; idle pairs are skipped so the wave never stalls). Emergency step at dist>80 and
  landing catch-steps (now pair-staggered) bypass the wave. Whip step profile untouched.
- Sim still 27/27 (physics untouched).
- Still open from b1: wall-stall vs auto-climb, corner-cling stickiness, web swing, tuning.

## 2026-07-24 — Claude (James's feedback) — graybox b3: un-break the legs

- b2's VIS=1.5 leg scaling wrecked the whip — legs went straight up-and-down and flickered
  fast (longer segments + same physics ride height = degenerate IK; step thresholds scaled
  with it). James: the b1 motion was the cool part; all he wanted was a lighter background
  and a bit more size.
- Fix: VIS back to 1 (leg + body geometry restored to b1 verbatim; constant kept with a
  warning comment — size must never come from leg geometry). "Bigger" now comes from
  camera zoom instead: cam.scale divisor 1000→800, max clamp 1.4→1.6 (~25% larger on
  screen, zero effect on motion).
- b2's recolor (light sky, dark terrain silhouette, re-contrasted UI) kept — that part
  was right.

## 2026-07-24 — Claude (James's feedback) — graybox b2: visibility pass

- James's first-drive verdict: couldn't see the legs — dark whip-legs on a near-black
  background. Fix before any feel tuning can happen.
- Sky flipped from near-black to light overcast gradient (`#8494a8`→`#b3bfce`); terrain
  stays dark (`#2c3340`, lighter `#59647a` edge) so the tank and legs read as a dark
  silhouette everywhere. Grid/signs/HUD/web-silk/goal-text colors re-contrasted to match.
- New `VIS = 1.5` visual scale in game.js: body, legs (lengths, hip/splay offsets, step
  thresholds, probe reach, lift), leg stroke widths, rocket plume all half-again bigger.
  Physics untouched — sim still valid, no re-run needed.
- Build stamp bumped to b2 so a stale tab is obvious.
- Next: James re-drives with things actually visible; feel questions from b1 still open.

## 2026-07-24 — Claude (with James) — graybox b1: the fork and the movement prototype

- World created as the spider-vision side-scroller, forked from Arachno-Wars 2000 (which
  stays intact as the archived artillery duel). Direction agreed in chat: real-time,
  left-to-right through hostile territory, boss per level, tricks earned as you go, tech
  tree (weapons/shields/movement/specials), health = checkpoints AND armor, enemy
  pressure style left open. James: "make it so."
- Built the agreed step one — a graybox movement prototype, no enemies, no art:
  - `physics.js`: pure movement module. Polygon terrain, cling-to-any-perimeter walking
    (walls, ceilings, undersides), corner crossing, ballistic flight with sweep collision,
    fuel-metered rocket, web cast + straight reel, kill-plane respawn to last safe floor.
  - `level-graybox.js`: one gauntlet level — rolling ground, ledge staircase, floating
    C-pocket, chasm with grippable walls + web-anchor rock, cave with wavy ceiling for
    web pulls, step ledges, a G-shaped curlicue entered from below, goal pad.
  - `game.js`: renderer + input + 4 whip-legs (2-bone IK, slow-reach-then-SNAP steps,
    landing catch-steps), dead-zone camera (never rotates — motion-sickness rule), fuel
    bar, falls counter, world-space signage, debug overlay (backquote), build stamp.
- Verified by simulation before any browser look: `tmp/arachno-wars-2500/movement-sim.mjs`,
  27 assertions on the real physics module — all pass. Two sim-side fixes during
  bring-up (stair test needed diagonal input like a real player; chasm test had spawned
  inside rock).
- James's first look, same night: "I see what you're going for here, and I think it's a
  successful test. A long way to go yet, though." More tomorrow.
- Status: draft — no drift/registry/sound wiring yet.
  Feel questions listed in CLAUDE.md (wall-stall vs auto-climb, cliff-edge cling, web
  swing). Next after feel pass: tuner panel, then the first pillbox.
