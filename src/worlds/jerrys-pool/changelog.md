# Changelog — Jerry's Pool

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-17 — claude-fable (Mary, Jerry's girlfriend)

- New random event, per James: a golden-pink single-celled organism two-thirds Jerry's size
  visits every few minutes (first visit 2.5–5 min, then 4–8 min after each departure; full
  timing in the rubric). Visit arc: she drifts in from the side away from Jerry → mutual
  notice (she pulses, he stops and leans his nucleus toward her) → they swim together around
  a slowly drifting anchor, circling each other → membranes press while both outer ring sets
  fade and three shared "union" orbit rings tumble around the pair, warm gold-pink bolts
  arcing between their rims → rings unmerge, glow fades → they part and swim off separately.
- All DOM built by site.js (index.html untouched); styles in a new `.gf-*` section at the end
  of site.css. Bolts reuse `spawnJerryZap`, which grew an optional stroke-palette parameter
  (existing vake-zap calls unchanged).
- Jerry's side runs through a new `cellMotion.courtship` hijack (same pattern as floorVisit /
  leviathanPanic): curiosity override, per-phase speed scale, held near-depth via a
  `holdDepth` gate on the pulse retarget, prey-chasing suppressed, and a `glow` channel that
  brightens him and blushes his glow colors toward hers during the union.
- Safety: one at a time; spawn skipped and retried while the leviathan is visible, Jerry is
  panicked/tending the seafloor, or the tab is hidden; a leviathan surfacing mid-date ends it
  early (she flees); 120 s TTL hard-cleanup in case a hidden tab freezes rAF mid-visit.
- Verified by Node simulation (200 seeded visits, scratchpad `gf-sim.mjs`): first pass caught
  the pair being dragged through each other by the free-running offset rotation (8/200 runs);
  fixed with bearing-tracked offset angle + a "press, never pass through" separation floor at
  0.7× summed radii. After the fix all 200 runs complete the full arc — union reached ~3 s
  into the touch phase, 4–13 bolts each, clean departures, no NaNs.
- Not in the tuner roster (like Jerry and the leviathan). Rubric + current-index updated.
- Rev 2 (same session): she has a name — **Mary** (James). The tuner panel header grew a
  golden-pink "Mary" button that summons a visit immediately, replacing the console-only
  `spawnGirlfriend()` hack: disabled and relabeled "Mary's here" mid-visit, refuses with a
  little shake while the leviathan is about, and a summoned visit reschedules (never stacks)
  the natural 4–8-minute chain via a tracked timer. Summoning also cancels an in-progress
  floor visit at the notice beat ("Mary outranks gardening") — which also covers the natural
  case where Jerry wandered floorward while she was still entering. Docs renamed to Mary.
- Rev 3 (same session, James: "Mary is gorgeous", tuning pass): (1) Jerry notices her 100 px
  farther out (430 px beyond contact range) and approaches during the notice beat instead of
  hanging still (notice speedScale 0.12 → 0.26). (2) His nucleus now looks right at her for
  the whole visit — a dedicated courting gaze branch in updateCell replaces the normal
  intent-following nucleus lerp (softer response than the leviathan reaction: attention, not
  alarm). Her live position feeds `cellMotion.courtship.gazeX/Y` from her frame loop.
  (3) Culmination orbs: as the rings merge, each releases six energy orbs (~640 ms apart,
  fanned across ±100° from each cell's far side) — his in the ambient blues, hers in six
  golden-pink variations (`MARY_ORB_COLORS`, deep-water luminance since the energy-ball CSS
  pushes saturation/brightness hard). `spawnEnergyBall` grew a `release` option ({x, y,
  color}: arbitrary origin, radial direction, bypasses the 5-ball ambient cap; ambient
  call sites unchanged) — so all twelve are real drift orbs that vakes can steal and worms
  can eat. Sim re-run after the notice tuning: all 200 seeded visits still pass.
- Rev 4 (same session, "they're kissing... they love each other"): Mary's nucleus is now
  alive — once she's noticed Jerry it leans toward him (~24 px) with a soft lateral bob,
  driven per-frame as `--gf-nucleus-x/y` on her orb and applied via the `translate` property
  so it composes with her ambient sway animation. During the union both nuclei press toward
  the contact point and sway on a shared sine clock (`time * 0.0024`, ~2.6 s period): hers
  reaches ~30±7 px, his gaze reach grows 74 → 80±7 px via a new `courtship.kiss` flag (set
  at ring-merge, cleared in endUnion, read in updateCell's gaze branch). Same phase on both
  sides, so they lean in and ease back together — communicating, interested, in love.
- Rev 5 (same session): three more per James. (1) Mary's nucleus now strains: on final
  approach (touch phase pre-union) it presses to ~40 px, and during the kiss 44±7 px — right
  up against the inside of her membrane (her orb's overflow clipping sells the press), matching
  Jerry's existing strain. (2) Union wave: ~0.9 s into the union (the orb-release moment),
  `radiateUnionWave` sends two expanding rings from the pair's midpoint — one in his cyan/teal,
  one in her gold/pink, 260 ms apart, front speed 0.66 px/ms (`GF_WAVE_SPEED`), band at ~66% of
  a 1100 px gradient scaled up so raster cost stays fixed. Every jerryGlowTick registry creature
  the front passes gets `entry.waveUntil` = now + 6.5–9 s → held at full glow, then the normal
  0.07 ease-down; polyps and brain corals are lit through their existing proximity datasets
  (`awakeUntil` / `glowFullUntil`), which the 180 ms checker in updateCell converts to classes.
  Leviathan exempt as always (not in the registry). (3) Leviathan halved: entrance and return
  now 4–8 minutes (was 2–4) — timer sites, tuner roster text, opening comment, and rubric all
  updated.
- Rev 6 (same session, "she's still kinda too languid"): urgency + anticipation pass.
  (1) Her nucleus seeks him from the moment she enters frame (gaze now runs in every phase
  but depart; was notice-onward). (2) Notice pulses lengthened ~2× and tripled: gf-notice is
  now 1150 ms × 6 (was 900 ms × 2), and the gf-noticing class rides into the approach instead
  of being stripped at the together transition (removed at union start). (3) Jerry answers:
  ~1.6 s after her pulses begin he fires two glow pulses of his own — |sin| humps (1150 ms
  period, 2300 ms window) via courtship.noticePulseStart/Until, added straight into his
  brightness/glow terms in updateCell so there's no ease lag. (4) Both nuclei pressed against
  facing membranes for the entire coming-together (her press reach now covers the together
  phase, not just touch; his 74 px gaze already pressed). (5) Faster close: together phase
  6–8.5 s (was 9–13), her speeds 0.105/0.095/0.08 across enter/together/touch (was
  0.09/0.075/0.06), Jerry's courtship speedScales 0.95/0.8/0.42 (was 0.72/0.6/0.34),
  separation gap closes ~45% faster, and during notice she keeps easing toward him instead
  of recoiling. Sim re-run: all 200 pass; the urgency actually tightened convergence — union
  reached avg 1.7 s into touch (was 3.3 s), worst case 3.5 s (was 12.3 s), ≥9 bolts every run.
- Rev 7 (same session, wave tuning): the union energy wave now (1) launches at 2.4 s after
  ring-merge instead of 0.9 s, so the orbs are visibly streaming out when it goes — it reads
  as the wave OF the release, not a herald of it; (2) carries a blur(10px) on the ring (the
  filter scales with the transform, so the band softens as it spreads) plus a wider, gentler
  gradient band (52–80%, was 58–76%); (3) travels at 0.3 px/ms instead of 0.66 — roughly 7.5 s
  to cross the pool, slow enough to watch each creature light up as the front passes (ring
  sweep and creature-glow arrival timeouts both derive from GF_WAVE_SPEED, so they stay in
  sync). Second ring stagger widened 260 → 420 ms; peak opacity nudged up to compensate for
  the blur.
- Where things stand: shipped and signed off — James watched several visits and tuned the
  event through seven revs in one sitting ("Mary is gorgeous"). The settled arc: she enters
  looking for him → six long pulses, he answers with two → eager approach, both nuclei pressed
  against facing membranes → union (merged rings, bolts, six orbs each, slow blurred energy
  wave that sets the whole pool aglow) → parting. Summonable any time via the tuner panel's
  Mary button. Cache tags on site.js/site.css not yet bumped (happens at wrap-up). Candidate
  follow-ups if James wants: a rare gift exchange (she leaves an orb behind for Jerry), a
  sound hook once the pool gets audio again, maybe a rare longer variant of the visit.

## 2026-07-15 — claude-fable (pool tuner panel, per James: "go!")

- New in-world control panel (⚙ bottom-left toggle, bottom sheet, all DOM built by site.js —
  index.html untouched). Follows the Chrome Rift tuner pattern: sliders + localStorage
  (`jerrys-pool-tuner-v1`), lazily built on first open.
- Full denizen roster (21 rows), each with a live thumbnail, name, attributes, movement, and
  schedule. Thumbnails reuse the real assets: class replicas for CSS creatures, the actual
  layer manifests for the Blender sprites, a scaled clone for Jerry, `leviathan-soft.png` for
  the leviathan. Jerry and leviathan rows are display-only ("not tunable").
- Per-creature frequency and population sliders, 0–5× (freq divides spawn delays, 0 idles the
  scheduler on a 4 s poll; population scales each concurrency cap, 0 blocks spawning — live
  creatures always finish their visit). Global frequency/population multipliers stack
  multiplicatively with individual ones. The shared 6/8 active-denizen ceilings scale with
  global population; creatures boosted above ×1 bypass the shared ceiling so their slider is
  always potent. Permanent denizens (polyps, shrimp, coral, plants) rebuild live on slider
  release; polyps also expose flare frequency. The alien fish pair scale their relaunch pause
  (freq) and group-appearance odds (pop).
- Dot-field controls: swirl speed and dot count, each 0.5–2×. Count works on a pre-built 660-
  node pool with an active window — no Pixi rebuild ever happens live. Speed drives a new
  accumulated orbit clock (`dotClock`) so changes are continuous instead of teleporting every
  dot; Jerry's wake physics deliberately stay on real time.
- Safety rework so panel replicas can't leak into the simulation: every runtime creature query
  (spawn caps, jelly prey search, leviathan/vake/urchin counts) is now scoped to
  `#denizen-field`; polyp/flora queries scoped to their fields. Stored tuner values are
  NaN-sanitized before they touch caps or the dot field.
- Rubric header now notes all its numbers are ×1 baselines for the tuner.
- Rev 2 (same session, James: "this is so killer"): toggle moved to bottom-right, doubled in
  size, relabeled "⚙ pool config" (panel follows, right-anchored above the button); panel got
  a ✕ close button and click-away auto-close; thumbnails grew a delayed hover zoom — rest on
  one for 250 ms and a 3× copy floats beside it (flips left when the viewport runs out,
  hides on scroll/close). Rev 3: zoom bumped to 6× with a 100 ms delay. Rev 4: panel header
  got the map room's text-size gear (⚙ → −/+ stepper, 5%/step, −1..+5, applies as panel zoom,
  persists with tuner state). Rev 5: fixed the panel refusing to close — `.pool-tuner`'s
  `display:flex` outranked the UA `[hidden]` rule, so every close path (✕, click-away, toggle)
  set `hidden` to no visual effect; added a `.pool-tuner[hidden] { display:none }` rule. Idle
  toggle restyled: words stay bright, chrome stays dim (whole-button opacity fade removed).

## 2026-07-15 — claude-fable (leviathan transparency fix, per James)

- James: during rise and descent the leviathan sometimes went partially transparent — dots
  visible straight through the body. Diagnosis: `.abyssal-predator` carried
  `filter: blur(5px) brightness(0.45) contrast(1.15) saturate(0.65)` while its 60 s WAAPI
  keyframes animate scale (0.82→1.0 rising, 1.0→0.84 descending). A filtered 115vw layer
  re-rasters every frame the scale changes, and Chromium composites not-yet-rastered tiles
  as transparency. During the mid-arc hover, scale is static, the raster is cached — which
  is why the body only ghosted "partially up / partially going down". The PNG itself is
  fully opaque (body-center alpha 254–255), so the asset was never the problem.
- Fix: the whole filter chain is baked into a new `leviathan-soft.png`
  (`tmp/jerrys-pool-denizens/bake_leviathan_filter.py`: premultiplied Gaussian σ2.32 — 5
  screen px at the 1024px→115vw display scale — then brightness/contrast/saturate in CSS
  order on sRGB). The CSS filter is gone; the scale animation now moves a plain cached
  texture on the GPU. Bonus: no more 5px blur over a giant layer every frame.
- `leviathan.png` stays as the untouched source for regeneration.

## 2026-07-15 — claude-fable (vake survival buffs, per James)

- James: "I dont want the vake to succeed every time but I also dont want jerry to succesfully
  kill every one of them." Four changes tilt the fight:
- Jerry now misses 1 zap in 5 (`VAKE_ZAP_MISS_CHANCE = 0.2`): the bolt lands visibly beside
  the vake (perpendicular offset ~50–120 px), the vake drops its hunt and flees straight away
  from Jerry for 1.8 s, and Jerry re-arms for 2.6–4 s before he can fire at it again. Each
  new shot re-rolls, so lingerers still die and runners escape.
- Zap reach trimmed 10%: 260 → 234 px from Jerry's edge (`VAKE_ZAP_RANGE`).
- New 320 px buffer zone (`VAKE_BUFFER_RANGE`): every vake, mid-hunt included, bends toward
  pure flight as it nears Jerry's reach (full flight just outside zap range) at a new sharpest
  turn rate (`maxTurnEvade` 0.009 rad/ms). Orbs drifting close to Jerry are effectively
  guarded until they float clear — momentum can still carry a committed vake into the kill zone.
- Fed exit lean strengthened: max weight 0.65 → 0.8 within the unchanged 430 px range.
- Rubric vake row rewritten; also swept the rubric rows of stale opening-wave clauses
  ("opening appearance…", "(opening spawn bypasses the limit)") missed in the seeded-opening
  pass. Cache tag `?v=vake-buff-1`.

## 2026-07-15 — claude-fable (seeded opening population, per James)

- The pool now loads already inhabited (James: creatures "would all kinda be everywhere, all
  the time" — watching it populate from empty read as artificial). `seedOpeningResidents()`
  drops six ambient residents in mid-passage at page load: two amoebas, a ray, a jellyfish,
  and a pulse urchin at 20–60% of their journeys, plus a dot school placed mid-pool
  (22–78% of viewport width) swimming toward an edge.
- Head-start mechanics: WAAPI crossers advance `animation.currentTime`; the jelly and urchin
  backdate their rAF clocks (`born` / `startedAt`). The urchin's `previousFrameAt` now starts
  at real now so the first frame's dot-current ease isn't distorted by the backdate.
- The 30-second forced-introduction wave (`introduce()`, 2026-07-12) is gone. Every recurring
  creature now runs its regular schedule from load; concurrency-cap skips apply as usual.
  Leviathan entrance (2–4 min) unchanged. Rubric opening section rewritten to match.
- Cache tag `?v=seeded-open-1`.

## 2026-07-15 — claude-fable (tuning pass, per James)

- Jerry's orb economy nudged: drop cadence 3.75–9.58 s → 3.3–8.5 s, orb travel speed away from
  him 34–58 → 38–65 px/s.
- Vake zap radius trimmed: Jerry now shocks it inside 260 px of his edge (was 300).
- Fed vakes now prefer to avoid Jerry on the way out (James: "prefer... don't make it a hairpin"):
  inside 430 px of his edge the cruise heading leans away, proximity-weighted up to ~2/3 toward
  pure flight — the turn clamp and the exit pull keep it a wide curve. Hunting approach is
  unaffected (it only avoids after it has the orb). Fed vakes also bank tighter: turn clamp
  0.004 → 0.006 rad/ms post-feed (hunting turn unchanged).
- Spore floater travel rebuilt per James ("like the anemone" = pulse urchin): straight WAAPI
  crossing replaced with `guideSporeFloater` — a loose guided ellipse (0.3–0.4 W × 0.24–0.32 H,
  0.5–0.7 net laps), 1–2 smoothstepped stall-and-reverse moments per visit, speed envelope
  breathing 40–100% of a ceiling matched to the old crossing pace (never faster), radius
  wander, urchin-verbatim dot-current sampling (210 px, ±20 px eased offset). Root transform
  stays translation-only so shed spores keep sinking straight. Fade now opacity-only keyframes;
  exit spirals out via radius inflation over the last 16%. Rubric updated. Cache tag
  `?v=wave3-5`.

## 2026-07-15 — claude-fable (solo, James's go: "build me some denizens")

- Denizen wave 3 from the backlog: **comb jelly** (#5) and **spore floater** (#7), both via the
  layered-sprite pipeline. New scene `tmp/jerrys-pool-denizens/denizens3.blend` (build_denizens3.py,
  seed 17, creatures at x=120/140) + render_layers3.py; 15 layers (~1 MB) in `comb-jelly/` and
  `spore-floater/` under the world root.
- Comb jelly: glassy rim-lit ovoid, pink pharynx glow, 5 beaded comb rows (14 rainbow plates each,
  proud on the camera hemisphere — no holdouts needed) and 2 trailing tentacles with tentilla
  fringes (holdout: body). Animation: brightness pulse travels across the rows (metachronal, in
  opacity), slow hue-rotate cycle on the row imgs (3° quantized writes), tentacle sway, gentle
  body roll + bob. Crossing 55–80 s, mid-water, max one.
- Spore floater: dandelion seed-head — amber core + three 30-filament shells (near/mid/far
  brightness tiers per the depth-legibility rule) that counter-rotate at close-but-different
  rates for a volumetric spin; rig itself only bobs so shed spores sink straight. Sheds 2–3
  glow-spores every 5.5–9.5 s from the rim (2 rendered variants, parked inside camera bounds this
  time — no separate render script needed); WAAPI sink with seed-sway, cap 6 + TTL fallback.
  Crossing 62–90 s, upper water, max one.
- Both join the 30-second opening guarantee (force spawns, 0–26 s window) and the standard
  schedulers: comb jelly every 24–38 s, spore floater every 26–42 s; both skipped at 6 active
  denizens. Rubric updated. Cache tags `?v=wave3-1`.
- Pane check: both assemble on force-spawn, all 15 imgs load (12 layers + 3 shed spores),
  no console errors; tentacles trail the travel direction correctly. Motion pending James's
  demo (frozen-timeline rule).
- Backlog now 5 unbuilt concepts (chain siphonophore, whip eel, glass skitterer, mirror mola,
  burrow lurker) in `World Ideas.md`.

## 2026-07-14 — claude-fable (with James)

- Rising bubble chains, adapted from the pelagic lantern habitat's bubbles: six seafloor vents
  release short trains (5–13 bubbles, 150–450 ms apart, then 6–24 s quiet) of tiny stroked
  bubbles with the pelagic highlight arc, drawn on the `#field` canvas right after the backdrop.
- The chains ride the pool's maelstrom: each bubble samples the clockwise orbital tangent at its
  position (same ellipse family as the dot current, centered 0.54 W / 0.52 H) and gets carried
  sideways as it rises — stronger toward the rim, gentle near the center, ~45 % of the tangent's
  vertical component so the swirl bends but never stops the climb. Left-side chains curve
  up-left then up-right in a soft S.
- Jerry shoulders through chains he crosses: a damped radial push (little sibling of the dot
  flow physics, same influence radius) scatters bubbles around his body.
- Population is self-limiting (cap 110, 12–21 s lifetimes, fade in/out); no per-frame
  allocation beyond the style strings the pelagic original also used.
- (A tilted/varied urchin orbit was added and reverted within this session — James meant a
  different creature; the urchin's original screen-aligned oval stands.)
- Barrel drifter path + velocity variety per James (the creature he actually meant): crossings
  are now diagonal — entry band widened to 0.18–0.72 H, exit offset a guaranteed ±0.08–0.42 H
  (clamped 0.12–0.85 H) with a gentle baked meander (1.5–3.5 cycles, amplitude enveloped to
  zero at the ends) — and the nose pitches along the travel slope (smoothed, ±16° clamp,
  mirror-aware sign, gulper pattern). Jet pulses are now uneven: per-pulse strength 0.45–1.55
  feeding both the baked speed integration and the live body squash (weak pulses barely stir
  the body), all riding a slow 1–2.5-cycle cruise/laze envelope so it stalls and scoots.
  Keyframe samples 96 → 128 for the curvier path. Crossing now 28–54 s (was 32–48; rubric
  updated). Exhaust puffs inherit the rotation for free (children of the rig).
- Vake frequency doubled per James (he's enjoying the orb-hunt/zap outcomes): spawn attempts
  every 8–16 s (was 15–30). Opening appearance, two-at-once cap, and hunt behavior unchanged;
  rubric updated.

## 2026-07-14 — claude-fable (with James)

- Pulse urchin no longer stutters: its guidance loop was a `setTimeout(update, 100)` (10 Hz
  repositioning against everything else's 60 FPS); now runs on `requestAnimationFrame`. The
  dot-flow drift lerp (0.08 per 100 ms step) is scaled by actual frame time so the drift feel
  is unchanged at 60 FPS.
- Urchin now spawns in one of six shades of aqua/jade/blue, picked at random per spawn via a
  `--urchin-rgb` CSS variable (site.css defaults to the original jade; site.js sets the palette
  entry inline). All urchin gradients, borders, glows, and spines follow the chosen color.
- Doubled its frequency: spawn attempts every 9–15 s (was 18–30 s), opening appearance window
  tightened to 0–15 s (was 0–26 s). Rubric updated in docs/denizen-frequency-rubric.md.
- Raised the urchin cap from one to three concurrent, so the color variety shows simultaneously.
  Still counts toward (and is skipped by) the 6-general-denizen limit.
- Vake and sulfur lantern colony caps raised from one to two concurrent each (schedules
  unchanged; vake darts are short enough that overlaps will stay occasional, colonies will
  pair up often given their 46–68 s passages).
- Barrel drifter dimmed per James — it stood out awkwardly. Depth-scaled brightness now
  0.42–0.70 (was 0.55–0.95) and crossing opacity 0.38–0.64 (was 0.55–0.90); blur and the
  nucleus pulse untouched.
- Vake hunts Jerry's energy orbs (James's idea). The baked WAAPI dart was replaced with a
  rAF steering loop (urchin pattern: `animateDenizen` keeps opacity/lifecycle, transform is
  per-frame): constant speed derived from the old 3–5 s crossing — explicitly no burst when
  hunting — turn-rate-limited banking (0.004 rad/ms), sight radius 75% of the larger window
  dimension, orb scan throttled to 120 ms. On contact the orb *pops* (scale-property burst,
  so its in-flight transform is untouched; removal on a timeout, not `animation.finished`,
  per the frozen-pane rule) and the vake wears the orb's `--energy-color` until it exits:
  new `--vake-rgb` variable + `.orb-fed` class recolor body/highlight/wake, inline filter
  brightens to 0.8–0.95 so the stolen color reads. Respects/sets `dataset.claimed`, so
  vake and polyps never eat the same orb. Chains hunts if more orbs are visible; cruising
  keeps a sine-wobble heading toward a projected exit point (600 px past the old endpoint,
  so the steering can't orbit it); 22 s TTL backstop.
- Vake hunt refined per James: one orb per visit (scanning stops after the kill), the fed
  vake now glows bright (brightness 1.05–1.25, saturate 1.25, plus a drop-shadow in the
  orb's color), and it leaves a rapidly fading trail — tail-anchored `.vake-trail` puffs
  every 30 ms in the stolen color, 650 ms scale/opacity fade, plain-timeout removal so
  hidden panes can't leak them.
- Trail bug fix (James spotted puffs streaming to the upper-left corner): the puff fade
  animated the standalone `scale` property, which composes OUTSIDE the `transform` property
  (final = translate·rotate·scale·transform), so it scaled the puff's `translate3d` position
  toward the viewport origin as it shrank. Puffs now animate full transform strings
  (`translate3d(...) scale(...)`). Same latent bug fixed in the orb pop: the ball is
  re-anchored via `--energy-x/--energy-y` to its current center, then bursts with
  `translate(-50%,-50%) scale(...)` transform strings. Lesson for this codebase: never
  WAAPI-animate bare `scale`/`translate`/`rotate` properties on elements positioned by an
  inline or animated `transform`.
- Fed-vake look revised per James: body stays black (the `.orb-fed` body/highlight recolor
  and the brightness boost are gone; base gradient back to literal navy-black). The stolen
  color now shows as an amoeba-style rim glow — two stacked `drop-shadow`s (6 px at 0.9,
  16 px at 0.5 alpha) appended after the unchanged dark spawn filter, since border/box-shadow
  would be clipped away by the vake's clip-path and drop-shadow color ignores the darkening
  filters before it. Colored wake (`::after`) and trail stay; trail puffs are lightened by
  mixing 35% white into the orb color via `color-mix(in oklab, ...)`, with slightly softer
  edge alpha (0.16, was 0.2).
- Barrel drifter grazes the signal stalks (James's idea): every third spawn picks a random
  ungrazed stalk and swaps the straight crossing for a three-leg route baked into the same
  pulsed-speed keyframes — quadratic-bezier swoop from its entry side down to the stalk tips
  (arrive at 42% of the run), a hover-and-bob feed window (42–60%), then a bezier climb out
  the top of the screen. During the feed the stalk's three red balls fade out one by one
  (staggered `transition-delay` under a new `.stalk-grazed` class) while three `.barrel-ball`
  elements pop into the rig one by one — riding the body squash, visible through the
  translucent shell — and the drifter picks up brightness(1.18) plus a red drop-shadow halo.
  It exits with the balls still aboard. The stalk regrows all three balls 15 s after the
  feed starts (1.4 s opacity/scale transition; `dataset.grazed` claim keeps two feeders off
  one plant). Phase bounds are time-based so the ball timeouts line up with arrival; the
  jet-pulse surging still drives progress within each leg. Rubric updated.
- Jerry's feeding glow backed off 25% per James: the `feedingBoost` coefficient in his
  body-brightness formula is now 0.285 (was 0.38). The 9 s window and 6 s decay are
  unchanged, as are the localized organelle flashes and swallow ripples.
- Second pass — still blowing out (the nucleus went near-white). The 25% brightness trim
  was real but feeding drives FIVE stacked channels; all now cut to subtle: brightness
  coefficient 0.285 → 0.12, saturate boost 0.3 → 0.15, contrast boost 0.16 → 0.06 (the
  multiplicative brightness×contrast stack was the nucleus killer), outer halo alphas
  +0.42/+0.5 → +0.22/+0.26, and the 4 s organelle flash brightness(2.4) saturate(1.65) →
  brightness(1.6) saturate(1.35) with drop-shadow alphas 0.98/0.78 → 0.7/0.5. Net feed
  read: a modest power-up glow, halo still clearly swelling.
- More grazing per James: signal stalks up from 3 to 5 (two extra stalk plants appended
  after the 21-plant type cycle, so the other flora counts are untouched — 23 plants
  total), and every other barrel drifter is now a feeder (was every third). Worst case
  two stalks are regrowing at once, so a feeder always has an intact plant to pick.
- Grazer pass 3 per James: TEMP forced-feeder review hook reverted (normal introduce()
  opening restored; counter parity means every second drifter still feeds). Grazing runs
  slowed again — 46–60 s total (was 38–50), so the dive reads unhurried. Approach is now a
  near-straight diagonal whose bend point randomizes per visit (control at 25–55% of the
  descent, 0.28–0.44 W back). Exit rebuilt: instead of climbing out the top, it rises
  10–25% of the viewport, flattens through a level waypoint, optionally dips back down
  (−4% to +12%, clamped to the 12–86% band), and cruises off the entry-direction side like
  a normal crossing.
- Jerry zaps vakes (James's idea — they eat the orbs meant for his worms): a throttled
  150 ms check in the vake guidance loop measures vake-center to Jerry's-edge distance;
  inside 300 px, once per vake: a jagged two-stroke SVG bolt (glow + white core, jitter
  pinched at the ends, 340 ms flicker, timeout removal) fires from Jerry's rim to the vake.
  The vake flash-whites then settles to `saturate(0) brightness(2.35)` gray (700 ms filter
  transition, keeps its depth blur, drops `.orb-fed` and the trail), stops all hunting and
  steering, and drifts upward — rise velocity eased to ~55 px/s, gentle sway, rotation
  leveling to horizontal with a ±7° wobble — until it clears the top and cleans up.
  `.jerry-zap` SVG layer sits at z-index 7 with a cyan drop-shadow.
- Graze tuned per James (herbivore, not predator): feeder runs get their own longer clock
  (38–50 s vs the normal 28–54 s) with the approach stretched to 52% of it (~20–26 s of
  leisurely descent; feed window now 52–68%), the approach control point moved a third of
  the way down the descent so it's one long diagonal glide instead of a level run that
  corners into a dive, and the hover height dropped from shell-bottom-at-ball-tips to
  body-center-at-ball-tips — the red balls now sit inside the lower membrane while it
  absorbs them.

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-12 — claude-fable (perf pass 1-4 + 30-second opening guarantee)

- Optimizations 1-4 from the session's list, all behavior-preserving:
  (1) `will-change` now only on layers a rAF loop actually animates (`.rig-anim` + puffs);
  static bodies/shells/discs no longer get compositor layers — verified counts: walker 11,
  fan 11, gulper 6, barrel 2 promoted layers. (2) Glow boost quantized to 0.02 steps with
  `String()` serialization matching the style engine, so a steady glow stops rewriting (and
  re-rasterizing the blur). (3) Glow proximity re-measured every 3rd frame per entry
  (round-robin slots) with easing still per-frame; Jerry's orb radius cached 250 ms.
  (4) Colony wave/tether, walker gait/pores, and fan spin/arm-wave loops now run at 30 fps
  (frame-skip; all phase from absolute time so motion is unchanged). Gulper (surge tail) and
  barrel (squash) stay at 60.
- Opening policy revised per James: every recurring creature appears at least once in the
  first 30 s — random moment, not scripted (fast creatures inside their normal window, slow
  ones 0-26 s), first spawns forced past the concurrency skip where supported. Leviathan
  alone keeps its 2-4 minute entrance. `introduce()` replaces the plain scheduler kickoff;
  rubric updated. Cache `?v=bossman-3` (css+js).
- Pane check: no errors, glow probe still peaks clean (two filter terms, 1.84), pumped-tick
  verification per the frozen-timeline rule.

## 2026-07-12 — claude-fable (bossman glow + unforced opening)

- Jerry glow extended to the whole cast ("he's the bossman"): the per-creature glow blocks were
  replaced by one shared registry/ticker (`registerJerryGlow` + `jerryGlowTick`). Registration is
  automatic inside `animateDenizen` (amoebas, rays, vake, urchin, colony, walker, wave-2 trio)
  plus manual hooks for jellies, dot schools, and the alien fish + their cloned companions.
  External filter rewrites (fed-amoeba saturation, alien-fish depth loop) are adopted as the new
  base so the boost rides on top. Leviathan deliberately exempt — it has its own Jerry reaction
  (panic dive) and its silhouette is too big for edge-proximity to mean anything.
- Bug found by in-pane tick-pumping (rAF is frozen in an unviewed pane, so the ticker was driven
  manually with a stubbed rAF): the style engine normalizes filter strings (1.060 → 1.06), which
  made every tick think an external rewrite happened and adopt its own boost — brightness terms
  accumulated. Fix: `lastWritten` stores the read-back serialization. Verified: probe on Jerry
  reaches `brightness(1.839)` with exactly two filter terms; element 927 px away stays untouched.
- Opening wave removed per James: `emitOpeningDenizens` deleted; every scheduler's first delay is
  now `Math.random() * (its normal max)`, so early arrivals are possible, never forced (7 denizens
  showed up naturally within 8 s on one roll). Rubric's opening table replaced with the new policy
  + a glow section. Cache `?v=bossman-2`.

## 2026-07-12 — claude-fable (Jerry proximity glow)

- Per James: the wave-2 trio now react to Jerry. New `jerryGlowFactor(el, range=260)` measures
  the gap from a denizen's silhouette to Jerry's edge (via `cellMotion` + orb radius, same data
  the amoebas steer by) → 0..1. Each rAF loop eases toward it (7%/frame) and appends up to
  +85% brightness onto the creature's base depth filter; style writes are skipped under a
  0.005 delta. Verified in-pane with mock rects: factor 1.0 on Jerry, 0.5 midway, 0 outside
  range; no console errors. Cache `?v=wave2-5`.
- Colony/walker/vake and the older cast don't glow — offered as a follow-up if James wants
  the whole pool reacting.

## 2026-07-12 — claude-fable (gulper lurk-and-surge)

- Per James: gulper confined to the lower half (band 0.5–0.82 of viewport height, base
  0.56–0.76) and given real swimming behavior. Crossing is now 121 baked keyframes: slow
  patrol speed with 2–3 gaussian glide-surges, two-component vertical meander, and the nose
  pitching along the path tangent (±14° clamp, mirror-aware sign). The rAF tail beat reads the
  same surge envelope — faster and wider mid-surge (period ~2.1 s lurking → ~0.9 s surging).
  Crossing 30–44 s (was 26–40; rubric updated). Whole-body bob trimmed. Cache `?v=wave2-4`.
  Pane check: keyframes bake y 579–705 on an 1110 px viewport, ±14° pitch, no errors.

## 2026-07-12 — claude-fable (gulper ghostlier)

- Per James: body much ghostlier, other parts staying visible. Body now true 45% alpha at the
  core → 12% at edges (verified 112/255 center in the PNG); jaw + dorsal spikes split onto their
  own firmer `gulper-flesh-mat` (~74%); eye/teeth/lure/fins untouched. Two material lessons baked
  into `translucent_body_mat`: closed meshes double their transparency (front+back surfaces →
  alpha = 1-(1-fac)^2), so backfaces are now culled in the shader and the dialed opacity is what
  renders. Crops unchanged again; cache tag `?v=wave2-3`. Pane check clean (6 layers, no errors).

## 2026-07-12 — claude-fable (gulper fixes)

- Swimming direction: gulper's mirror logic was inverted (swam tail-first); flip now matches the
  walker/barrel convention (`fromLeft ? -1 : 1`).
- Translucent flesh per James: body material is now `translucent_body_mat` in build_denizens2.py —
  shaded like before but alpha ~0.75 through the core feathering to ~0.3 at silhouette edges
  (facing-driven), eye/lure/teeth/fins unaffected. First re-render exposed a pipeline subtlety:
  a translucent holdout bakes see-through ghost pixels into the hinged-part layers (pale smudges
  that would swing with the jaw), so render_layers2.py now swaps holdout objects to an opaque
  stand-in material during part renders. Crop rects came back identical to wave2-1, so site.js
  manifests needed no changes. Cache tag `?v=wave2-2`.
- Pane check: no console errors, 6 gulper layers load, left-entering gulper carries flip −1
  (jaw leads). Visual pass on the translucency is James's.

## 2026-07-12 — claude-fable (wave-2 denizens: gulper, fan dancer, barrel drifter)

- James asked for 10 new denizen concepts and picked-by-proxy my favorite 3, built solo
  (no check-ins, per instruction): the **lure gulper** (anglerfish: hinged jaw snap every
  6–11 s, tail beat, pectoral scull, bobbing lure with pulsing halo), the **fan dancer**
  (feather-star: 10 feathered arm layers running a metachronal wave around the ring while
  the whole animal slowly rotates and drifts), and the **barrel drifter** (jet salp:
  rim-lit translucent shell squashing per contraction, amber nucleus pulse, velocity
  surges baked into 96 crossing keyframes, one cyan exhaust puff per contraction —
  capped at 6 with a TTL fallback, fading within ~a third of the body width astern).
- New Blender scene `tmp/jerrys-pool-denizens/denizens2.blend` (build_denizens2.py, seed 11,
  creatures at x=60/80/100) + generalized layer renderer render_layers2.py (per-job holdouts,
  anchor manifest); the barrel puffs needed render_barrel_puffs.py because they were parked
  outside the camera frame. 21 layers, 981 KB total, in `gulper/`, `fan-dancer/`,
  `barrel-drifter/` under the world root.
- `site.js`: shared `buildLayerRig`/`setRigPivot` helpers (the walker predates them and keeps
  its own inline versions); three spawn functions with inlined manifests, schedulers
  (25–40 s / 22–36 s / 18–32 s), and forced opening spawns at 1.2 s (barrel), 2.1 s (fan),
  4.4 s (gulper) — all inside James's requested first-5-seconds window. Rubric updated.
  Cache tags `?v=wave2-1`.
- Pane check: all three assemble in the opening wave, 20 layer imgs load, no console errors,
  exhaust puffs reaped correctly. Motion pending James's demo (frozen-timeline rule).
- The 7 unbuilt concepts (chain siphonophore, comb jelly, whip eel, spore floater, glass
  skitterer, mirror mola, burrow lurker) are logged in `Claude's Ideas.md`.

## 2026-07-12 — claude-fable (vake frequency bump)

- Per James: vake attempt cadence doubled, every 30–60 s → every 15–30 s (opening dart at 1.8 s
  unchanged, still max one, no concurrency skip). Rubric updated. Script cache tag `?v=vake-3`.
- James approved both animated denizens this session ("came out so great... really super cool") —
  colony wave and walker shamble are done pending nothing.

## 2026-07-12 — claude-fable (walker shamble pass)

- James demoed the live walker ("freaking awesome") but the legs read as barely moving. Shamble
  pass: legs rebuilt longer in `build_denizens.py` (knee `d*1.45,z+0.15` → `d*1.75,z+0.55`, foot
  `d*1.95` → `d*2.5`, slightly thinner bevel 0.09) — full deterministic scene rebuild (seed 7, so
  everything else re-rendered identical) + walker layer re-render; leg crops grew ~60% and their
  manifest entries in `site.js` updated (body/pores/puffs unchanged).
- Gait juiced: swing 6.5°→13° with a jittered second harmonic per leg (uneven strides), lift
  0.014→0.03·h, bob 0.016→0.028·h, sway 1.1°→1.9°, new per-step forward lurch (0.013·h) on the
  rig so the legs look like they're driving the body. Steps slightly quicker (gait cycle
  5.2–6.8 s → 4–5.2 s) while the crossing slowed (52–78 s → 68–92 s) — more steps per distance =
  shamble. Cache tag `?v=walker-live-3`. Rubric untouched (attempt cadence/counts unchanged;
  crossing duration isn't a rubric value).
- Pane check: no console errors, all layers load, puff cap holds (4 alive). Motion pending
  James's demo per the frozen-timeline rule.

## 2026-07-12 — claude-fable (walker live session)

- Vent walker fully live, same layered-sprite technique as the colony: re-rendered from
  `denizens.blend` as 14 layers (`vent-walker/`, ~490 KB) by
  `tmp/jerrys-pool-denizens/render_walker_layers.py` — body (plume and pores stripped), 3 legs
  (each + knee/foot glows, body rendered as a Cycles holdout so far-side legs stay occluded),
  7 pores + halos (pores 2–3 are fully body-occluded and correctly have no layer), and 3 smoke
  puff variants (the old baked plume balls). Manifest inlined in `site.js`.
- Tripod gait: each leg rotates around its hip anchor (staggered thirds, one full cycle per
  5.2–6.8 s), lifting while it sweeps forward and planted coming back; a rig wrapper bobs and
  sways the whole body in sync (WAAPI keeps only the flat crossing + fades). Pores pulse
  asynchronously — each with its own random 1.4–3.2 s period and phase.
- Live smoke, deliberately self-contained per James: puffs spawn at the vent mouth every
  0.65–1.4 s, rise/drift/swell/fade over 3–4.2 s, topping out just past the old baked plume
  height — nothing drifts on indefinitely. Capped at 7 concurrent with a timer-based removal
  fallback: puff cleanup originally hung off `animation.finished`, which never resolves while a
  tab isn't rendering (document timeline stalls), so hidden tabs accumulated orphan puffs
  (62 in ~1 min in the Browser pane). Timer clock keeps running, so the cap + TTL make it leak-proof.
- Discovered in the process: the CC Browser pane freezes `document.timeline` entirely when not
  being viewed — WAAPI/rAF motion can't be probed there; only DOM assembly and console errors.
- Crossing timing, spawn schedule, concurrency unchanged (rubric untouched). Old `vent-walker.png`
  no longer referenced (kept on disk). Cache tags `?v=walker-live-1/-2`.
- Where things stand: assembly + console verified in the pane; motion pending James's demo. Gait
  speed, swing angle (6.5°), puff cadence, and pore pulse ranges are the likely tuning knobs.

## 2026-07-12 — claude-fable (lantern wave session)

- Lantern colony now undulates for real: re-rendered from `denizens.blend` as 12 per-bulb sprite
  layers (`lantern-colony/bulb-00..11.png`, ~570 KB total; each layer = shell + core + halo + that
  bulb's filaments, auto-cropped to alpha bbox by `tmp/jerrys-pool-denizens/render_colony_layers.py`,
  placement manifest inlined in `site.js` — no fetch on `file://`). A rAF loop drives a traveling
  sine head→tail: one cycle per 6 bulbs (~2 cycles ride the body), 2.4–3.3 s period, amplitude 8%
  of body height, plus a subtle per-bulb opacity shimmer riding the same wave.
- The baked tether is gone from the sprite; `site.js` redraws it every frame as a two-stroke SVG
  path (cyan glow + core) through the wave-displaced bulb centers, with the original overhang past
  head and tail. Whole-body motion softened (9–16 px slow sway, was 22–40 px × 4.5 cycles) so the
  body wave reads instead of fighting a global bob.
- Crossing timing, spawn schedule, and concurrency unchanged (rubric untouched). Old single-sprite
  `lantern-colony.png` is no longer referenced (kept on disk for now). Cache tags bumped to
  `?v=lantern-wave-1`. James confirmed the wave looks right in preview.
- Where things stand: colony done pending James's own-browser demo at depth/blur extremes. Vent
  walker still static apart from stride bob — candidate next step: layered plume for live smoke.

## 2026-07-11 — claude-fable (Blender denizens session)

- Two new Europan denizens, modeled in Blender (headless 5.1, Cycles) and baked to transparent
  sprites: the **sulfur lantern colony** (seven-bulb glowing chain on a cyan tether, pulse baked
  head-to-tail) and the **vent walker** (dark tripod bottom-dweller with amber chemosynthetic pores
  and a rising vent plume). Sprites live at `lantern-colony.png` / `vent-walker.png` (world root,
  leviathan precedent); parametric build script + full-res renders + `denizens.blend` in repo-root
  `tmp/jerrys-pool-denizens/` (untracked) — everything regenerates via
  `blender --background --factory-startup --python build_denizens.py`.
- `site.js`: `spawnLanternColony` (mid-water head-first drift with sine bob, 46–68 s crossings) and
  `spawnVentWalker` (seafloor walk with stride bob, 52–78 s crossings), both depth-scaled/blurred,
  max one each, respecting the 6-denizen concurrency skip via `animateDenizen`. Medium-frequency
  schedulers (16–28 s / 20–34 s attempts) plus opening-wave spawns at 2.6 s and 3.6 s (forced).
  `site.css`: shared sprite rule. Rubric and current-index updated.
- Round 2 after James's demo (loved the look): colony re-rendered with 12 bulbs (was 7) and drawn
  50% smaller (120–230 px wide), sine bob made actually visible (48 keyframes, 4.5 cycles per
  crossing — was 10 keyframes / ~1 cycle, imperceptible). Walker lowered by its own leg length
  (baseline now `innerHeight - height * 0.64 - offset`, feet sit in the seafloor zone) and its
  vent plume re-rendered with a strong sideways lean; the sprite mirrors per direction so the
  smoke always trails the walk.
- Where things stand: `node --check` passes; James still to demo in his own browser. Possible next
  step (offered, not requested): layered sprite renders so the colony's pulse animates live in JS
  instead of being baked.

## 2026-07-11 — claude-fable (Hunyuan3D research session)

- No world code changed. Evaluated Tencent Hunyuan3D-2 (github.com/Tencent-Hunyuan/Hunyuan3D-2) as a
  3D asset pipeline for Elastic Space, using a Jerry's Pool denizen concept as the test case.
- Proved the loop end to end via the free Hugging Face Space's REST API (the Gradio UI at
  tencent-hunyuan3d-2.hf.space works fine in a normal browser): hand-drew a flat SVG alien
  anglerfish concept → rasterized to PNG → image-to-3D → volumetric GLB in 7.3 s (9.4 MB, 616k faces).
  Mesh kept the lure antenna, dorsal spikes, tail fins, eye socket, and turned painted spots into
  raised bumps; invented a plausible far side. Text-to-3D errors on that Space; image-to-3D is the path.
- Constraints learned: the free Space is shape-only (texture stage disabled — gray clay); textured
  output needs 3d.hunyuan.tencent.com or ≥16 GB VRAM locally (James's 4070 Laptop has 8 GB — enough
  for shape-only/mini). License: Tencent community license, outputs owned by us, fine under 1M MAU,
  not valid in EU/UK/South Korea (irrelevant here). Meshes need decimation (~10–20k faces) for web;
  the Space's export panel has built-in simplification.
- Test artifacts (input SVG + 4 mesh renders + comparison page) in repo-root `tmp/hunyuan-test/`
  (untracked, disposable). The generated GLB was NOT downloaded — it lived on HF temp storage and
  will expire; regenerate from the SVG if wanted.
- Where things stand: pipeline validated, James reviewed the comparison page. Possible follow-ups:
  a Three.js world using a generated GLB (mind the no-fetch-on-file:// rule — embed base64 or degrade),
  or bake-to-sprite renders for 2D worlds. Not yet logged in `Claude's Ideas.md`.

## 2026-07-11 — claude-fable (later session)

- Ambience audio: `assets/audio/jerry's-pool-sound-1.mp3` (supplied by James) now loops via the shared
  sound control — `ElasticSoundControl.attach({ media })`, volume 0.7, speaker button top right with
  the standard one autoplay attempt. `sound-control.js` added to `index.html`; script cache tag bumped
  to `?v=pool-audio-1` (later superseded by `?v=vake-2`).
- Fed amoebas show it: when an amoeba finishes consuming a jelly or another amoeba, its inline
  `saturate()` doubles (capped at 2.6) so it carries a richer color for its satiated departure
  until it exits the screen. The existing 700 ms filter transition makes the shift ease in.
- New denizen: the vake (born from a typo of "cake") — a dark, fast, shark-ish arrowhead with a
  forked tail, a faint wake streak, and a small pale eye dot. Pushed into the background per James:
  small (42–88 px), heavily blurred (2.5–4 px), dark and desaturated (brightness 0.35–0.5,
  saturate 0.65), faint (opacity 0.32–0.44), and `z-index: 2` alongside the leviathan.
  Darts across the pool in 3–5 s with S-shaped swoops (2 sine cycles,
  100–160 px amplitude) applied perpendicular to its travel line. The nose points along the path:
  per-keyframe tangent rotation with angle unwrapping so it never barrel-rolls (the first
  rotate-to-heading pass rolled weirdly; this replaces it). It's a rogue — 55% of crossings are
  horizontal-ish, the rest vertical, and both allow heavy diagonal drift (up to 90% of the
  cross-axis), so it can come from any edge. Final timing per James: guaranteed opening-wave dart
  at 1.8 s (so it's always seen once), then an attempt every 30–60 s, max one, no concurrency
  skip. Rubric updated; cache tags bumped
  to `?v=vake-2` (all tuning passes had shipped under `vake-1`, which risked stale caches).
- Where things stand: all three features (ambience audio, vake, fed-amoeba saturation) are live and
  syntax-checked; James reviewed the vake in his browser through several tuning rounds and approved
  ("the vake is dope"). The fed-amoeba saturation boost has not yet had a visual pass from James.
  Nothing committed this session — git handled elsewhere.

## 2026-07-11 — claude-fable

- Plankton layer: 50 of the 330 current dots are now tiny sealife — 10 species (coscinodiscus, navicula,
  triceratium, fragilaria chain, copepod, radiolarian, ceratium, volvox, asterionella, foraminifera),
  5 individuals each, ~9–17 px, fixed random orientation. Colors: species art is drawn white and each
  individual gets a fully random tint at spawn (any hue; halo matches), per James's follow-up.
- They are static models pre-rendered once to 64 px canvas textures and ride the exact same orbit +
  Jerry-influence physics as the dots (pressure/wake/side displacement untouched; population still 330).
- Within 190 px of Jerry they glow: additive color halo + full brightness + slight scale-up, held ~2.8 s
  after he leaves, ~1.1 s fade. Trigger piggybacks on the existing per-frame Jerry-distance check.
- Rendering stays batched: 10 species textures + 1 shared halo texture alongside the 2 dot textures;
  Canvas fallback path handles plankton too. Script cache tag bumped to `?v=plankton-1`.
- Also this session: repo-wide "no dev server" rule recorded in `CLAUDE.md` (James loads via `file://`);
  `docs/current-index.md` verification updated to match.
- Where things stand: syntax-checked; awaiting James's visual pass on sizes/colors/glow timing.

## 2026-07-10 — claude-fable

- Added this changelog retroactively. Entries below are reconstructed from git history, `world.json`, and `docs/`.
- Where things stand: live and featured; primary launch-season world. An uncommitted `site.css` pass is
  pending in the working tree: seamount solidity fix — all mounts moved to `opacity: 1` and `mask-image: none`,
  with blur increased roughly +5px per depth tier so distance reads through blur/value instead of transparency.
  Matches the seamount rule added to `CLAUDE.md` in the same (uncommitted) session.

## 2026-07-04 — launch (commit 97499fe, "Launch Elastic Space")

- World shipped live. Built in the week prior (manifest `createdAt` 2026-07-01).
- Scene: DOM/CSS environment, Canvas background, PixiJS/WebGL renderer dedicated to the 330-dot current
  field (shared-texture batching, local PixiJS bundle in `assets/the plasma pool — pixi_files/`, no CDN).
- Dot physics in depth tiers: far 15 FPS, middle 30 FPS, near 60 FPS; dots near Jerry promoted to 60 FPS
  regardless of depth. Off-screen dots stay continuous in orbit but skip rendering and Jerry-influence work.
- Jerry's dot pressure, wake, side displacement, and recovery behavior established as a core spatial
  effect — must survive any renderer optimization.
- Denizen system with spawn timing governed by `docs/denizen-frequency-rubric.md` (canonical; update it
  whenever timing/counts/concurrency change).
- Exits: Jerry's emitted orbs use shared random drift. No sound.

## Standing guidance

1. Read `docs/current-index.md` before touching the renderer or dot physics.
2. Seamounts are solid terrain: opacity 1, no alpha masks; depth via blur, value, scale.
3. Denizen timing changes require a rubric update.
