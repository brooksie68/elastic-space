# Changelog — The Singing Plate

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-15 — claude-fable (vibrato on held V)

- Holding V is now the vibrato lever: the voice wavers ±45 cents on the existing 5.1 Hz LFO
  (a second, deeper gain off the same oscillator — `audio.vibGain`), eased in fast (~90 ms)
  and released slow (~200 ms). `strikeBowl` patches every partial's detune into the same
  gain, so still-ringing mallet taps waver under the held key too. Works while bowing with
  the mouse or the number-key manual alike.
- First attempt used the right mouse button with `contextmenu` suppression; the menu still
  opened for James and wrecked the gesture, so the pointer takeover was reverted wholesale
  (window handlers back to original). Non-primary buttons still can't land a mallet strike
  on the plate — that guard stayed.
- Bend keys moved q/e → x/c (x bends down, c bends up), making an x·c·v cluster with the
  vibrato under the left hand.
- NOTE for wrap-up: the console's bend-hint line in index.html still reads `1–= · q♭ · ♯e` —
  now actually wrong, not just incomplete. Should become `1–= · x♭ · ♯c · v〜` (or similar)
  at the next index.html touch; mid-session .html edits front the pane, so it waits.

## 2026-07-15 — claude-fable (major triad + two-octave rim)

- James: the playable range was tiny and the triad was dour — he wants do·mi·sol, and lots of it.
  Triad table is now major (`[0, 4, 7]`, was minor `[0, 3, 7]`): A–C♯–E instead of A–C–E.
- Station pitch no longer derives from the mode numbers (`44·√(m²+n²)` spanned only ~98–282 Hz,
  five quantized notes across the whole rim). New `stationFreq(i)` walks the twelve stations
  exponentially over two full octaves so on the triad the rim rings do·mi·sol·do·mi·sol·do —
  all seven rungs verified landing after quantization. Tuning is now for play, not plate
  physics (James's call); the Chladni figures still come from the honest mode pairs. Wider
  range benefits every voicing, not just the triad.
- First cut anchored the ladder at A2 (110 Hz); James heard the bottom octave as too low —
  the plate shouldn't growl. Raised to A3 → A5 (220 → 880 Hz), starting where the old rim
  mostly sang (~220–260 Hz) and only climbing from there.

## 2026-07-12 — claude-fable (with James)

- Added the shared dashboard icon (`../../core/dashboard-control.js` in index.html): a top-right
  link back to the map room, which now lives at the repo-root index.html. Visibility is controlled
  site-wide by the map room's "show dashboard icons" toggle; when visible, the shared sound
  control sits directly below it.

## 2026-07-11 — claude-fable (note tables: one octave higher)

- All scale tables now build over 5 octaves instead of 4 (top of the triad: sol ~659 Hz → adds
  do·mi·sol above, topping out ~1319 Hz). The overtone series extends from 8 to 16 partials
  (440 → 880 Hz). Mallet strikes (`bowlNote`) index across the full table, so the rim now reaches
  the new high voices; bowed pitch is unaffected (the modes only reach ~282 Hz).

## 2026-07-11 — claude-fable (USE BOW sign: bigger, lower, pulsing)

- "USE BOW" text 11 → 18 px and moved down (baseline rest.y + 34 → + 46); arrow lengthened and
  thickened to match.
- While the bow rests in its rack the sign pulses a soft brass glow (~1.8 s cycle: alpha
  0.62–0.96 plus a 4–16 px canvas shadowBlur) to remind visitors the plate is played with the
  bow. Picking the bow up stops the pulse (steady 0.78 alpha, no glow); racking it resumes.

## 2026-07-11 — claude-fable (voicing lineup reordered)

- Voicing stamps reordered to Triad · Lyd♭7 · Penta · Overtones · Hijaz · Rast, with Triad the
  default selection (`state.chord = "triad"`). Free and Harm·Min removed — the plate is now always
  quantized; the harmmin note table deleted with it. `quantize()`'s no-table fallback stays as a
  safety net.

## 2026-07-11 — claude-fable (soundscape −20%)

- James: too loud even at 50% volume — the first bowl strike winced. Master base gain 0.9 → 0.72
  (both in `initAudio` and `applyVolume`), and the room-tone bed 0.05 → 0.04 to match, since it
  bypasses the Web Audio master. Per-voice balances untouched.

## 2026-07-11 — claude-fable (mallet: bigger, strike bop)

- Mallet scale 1.5 → 1.85.
- Strike animation: on a bowl strike the mallet head dips onto the plate and springs back over
  240 ms (`sin` curve, `malletHitAt` timestamp set in the pointerup strike path). The shadow stays
  on the plate and tightens/darkens as the head descends; the head translates toward its shadow.
  Holding the pointer down rests the head at a small constant dip.

## 2026-07-11 — claude-fable (USE BOW sign; bowing vibrato)

- Small brass sign under the rack: "USE BOW" in letterspaced Georgia small-caps with a drawn
  up-arrow pointing at the stick. Rendered on the room canvas as part of `drawRack()`.
- Bowing vibrato: while the held bow's hair is in contact with the rim, the hair ribbon alone
  gets a perpendicular offset (~2–4 px, scaling with `state.intensity`) that flips sign every
  50 ms — the wooden stick stays rigid in the hand (James's refinement of the two-frame shudder
  idea). Draw-only; physics and hit-testing use the unshifted position.

## 2026-07-11 — claude-fable (room-canvas sizing bug; thumb)

- Fixed the "bow flies down-right on load and can't be grabbed" bug: `#room` had `inset: 0` but no
  width/height — a canvas is a replaced element, so it displayed at its intrinsic size (viewport ×
  devicePixelRatio) instead of stretching. At Windows 125/150% scaling everything drawn appeared
  shifted down-right by the dpr factor, while grab hit-testing used the correct logical position —
  the visible bow and the grabbable bow were in two different places. `width/height: 100%` fixes it.
- Open-hand pose: added a thumb on the left side (bulge off the heel plus a web crease line).

## 2026-07-11 — claude-fable (bow rack under the console; hand redraw)

- James: the side holder was effectively invisible ("way off to the side… can't even see it") and
  the hand looked strange. Both redone:
  - Bow now hangs horizontally in a rack directly below the console: two brass clips hang from the
    console's underside, each ending in an upward-open cradle. `restPose()` derives from the
    console rect; the bow drifts home into the clips on release.
  - Grab safety: window pointerdown ignores presses on `button/input/a/.console/.es-sound` so
    reaching for Level the Sand (right above the rack) can't snatch the bow.
  - Hand SVGs re-authored: classic pointing-hand silhouette drawn upright (index up, three knuckle
    bumps, cuff) rotated -32° via CSS with transform-origin at the fingertip; cleaner fist for the
    grip pose.

## 2026-07-11 — claude-fable (the hand, the bow as an object, layout air)

- James's redlines: prop-layer margin fought the console controls; native hand cursor over UI broke
  the fiction; bow "stuck to the edges" felt wrong. Rebuilt the interaction model:
  - **Persistent hand cursor.** Native cursor hidden everywhere (`cursor: none !important`);
    `#hand` is a fixed DOM SVG — engraving-style brass hand, open pose with fingertip at the
    pointer, closed grip pose while pressing/holding. z-above everything, pointer-events none.
  - **Bow is a room object.** New full-viewport `#room` canvas (CSS-px space, z 40). The bow
    rests on a walnut-and-brass holder to the right of the plate (clears the door portal);
    grab it by clicking within 30 px of the stick, drag it anywhere. Release → it drifts home.
  - **Free bowing.** While held, if the hair can reach the nearest rim point (grip within
    0.95 bow lengths, bow length 0.3 plate widths) the bow bridges hand→rim and the plate sings —
    contact rim point drives station/pitch, closeness drives pressure (`state.carryDepth`).
    Away from the plate (cat included) it does nothing. Bare-finger rim presses no longer bow.
  - Pointer handlers moved back from the oversized `#props` layer to `.plate` (margin conflict
    with the console gone); `#props` is draw-only now (mallet). Console dropped 3.5vmin for air.
- Watch for: hand SVG art is first-pass and may want James's redline; bow grabbing is a manual
  hit-test on window pointerdown — links/controls under a carried bow release are unaffected.

- James: mallet hits only made the figure fuzzier — grains re-settled immediately. Root cause:
  strikes raised `state.intensity`, and the field pull scales with intensity, so a hit actually
  reinforced the figure.
- New `blastGrains(u, v, power)`: radial impulse away from the hit point (R 0.7, quadratic
  falloff plus a floor so the whole plate feels it) with a chaotic tumble. Repeat hits scatter
  harder (`1 + disorder * 0.7`).
- New `state.disorder` (0..1): each strike adds 0.35 + 0.3·strike; the field pull is scaled by
  `(1 - disorder)`, so a blasted plate stays blasted — grains freeze wherever they land.
- Recovery: sustained bowing decays disorder at 0.22/s (~3–4.5 s back to full order, figure
  re-forms as the pull returns); Level the Sand zeroes it instantly.

- James: the bow illusion was broken — clipped inside the plate canvas, rotation pinned tangent to
  a circle around the plate center, whole bow floating on the plate surface. Rebuilt:
  - New oversized `#props` canvas (144% of plate, `PROP_MARGIN 0.22`, matching CSS inset) inside
    `.plate` so it inherits the 3D tilt; bow and mallet moved off the sand canvas onto it.
  - Bow now rides the perimeter: snaps to the nearest edge, drawn perpendicular to it — hair
    contacting the rim, stick/frog/hand hanging outside the plate. Rotation eases (shortest-arc,
    ~0.2 s) so it swings around corners instead of flipping 90°. Leans into the stroke; rosin
    glow at the contact point while bowing.
  - Pointer handlers moved from `.plate` to `#props`, so you can grab and bow from just outside
    the rim (signed edge distance makes the bow zone extend outward naturally). Strikes still
    require a tap inside the plate. Captured drags that wander off keep the bow alive.
  - Mallet 50% larger (canvas-scale 1.5).
- Watch for: portal hit areas vs. the enlarged prop layer (overlay is pointer-events auto over
  its 22% margin); plaque sits under the bottom margin but is decorative only.

## 2026-07-11 — claude-fable (master volume slider + shared sound control)

- Added a visible **Volume** slider to the console (first control, before Reverb), defaulting to
  50% on load — James's call: the page is loud, but the fix is user control over the ceiling, not
  backing off the synth gains. All per-effect levels are untouched.
- Wired the standard `ElasticSoundControl` (speaker button top right) as mute toggle; the world
  previously had no user-facing master at all.
- `world.js`: `sound` state + `applyVolume()` scale the Web Audio `master` gain (0.9 base) and the
  room-tone `<audio>` element (0.05 base, fade preserved) together. `setMasterVolume()` is the
  single entry point; the console slider and the control's hover slider stay in sync through it.
- `core/sound-control.js`: `attach()` now also returns `setVolume(v)` so a world with its own
  volume UI can drive the shared control's slider (backwards-compatible; other worlds unaffected).
- `index.html`: loads `../../core/sound-control.js` before `world.js`.
- Note: the plate only sounds when played, so the speaker control reads "on" at load (armed) —
  the honest state for an instrument world. Interaction-driven `initAudio()` is unchanged.

## 2026-07-11 — claude-fable (session close, pre-wrapitup)

- End-of-session capture for the session that created this world (all build rounds logged below).
  Repo-level work from this same session, recorded here because this was its home session:
  - `Claude's Ideas.md` created at repo root: 50 world pitches + 30 B-sides, method, effort tags,
    status tracking. James selected #7 (this world), #8 (MORPHOGENESIS DEPT.), #16 (The Dish) —
    the latter two are unstarted.
  - Changelog convention rolled out: `changelog.md` in every world folder + `_template`,
    documented in `CLAUDE.md` and the README's add-a-world steps.
  - Exit rules added to `CLAUDE.md` and `docs/manifesto.md` (≥3 diegetic drift exits per world,
    never a hard puzzle, never a literal button).
  - ElevenLabs pipeline built: key in gitignored `.env`, `tools/eleven.mjs` helper
    (voices | sfx | tts | music), convention in `CLAUDE.md`. This world's `assets/audio/` holds
    generated one-shots; `gong.mp3`/`gong-deep.mp3` are currently UNUSED by code (bell is
    synthesized) but kept as assets. Disposable tests remain in repo-root `tmp/`.
  - This world added to root `index.html` directory + registry (`npm run registry` → 6 worlds).
  - "No dev server" rule reversed by James at session end: `CLAUDE.md` preview section rewritten,
    `docs/current-index.md` verification step updated. Worlds must stay `file://`-tolerant
    (no `fetch()` for world assets — that bug is what silently killed the sampled gong here).
- Open items for whoever picks this up:
  1. James has NOT yet play-tested the hold-to-bow rebuild (stations, hysteresis, key manual).
     Expected tuning knobs: hysteresis width (0.6 stations) and swell rate (dt*4).
  2. The full audio mix has never been heard by the builder — oboe-reed voice, prayer-bowl gains,
     raised reverb/delay ceilings all await James's ears.
  3. Hidden worn-notch sigil exit (bonus 4th drift exit) still unbuilt.
  4. `world.json` status remains `draft`; James decides draft → live.
  5. Scrub-in-place bowing (option 3 of the playability proposal) parked by choice.
  6. Nothing committed this session — git belongs to James + Codex.

## 2026-07-11 — claude-fable (with James) — playability rebuild

- James: bowing felt haphazard — one gesture was doing two jobs (motion = volume AND position =
  pitch, so sustaining a note was impossible). Rebuilt around hold-to-bow:
  - **Hold to bow.** Pressing and holding in the rim sustains the tone (slow swell, gentle
    5.2 Hz vibrato that scales with intensity). Motion is optional: it adds brightness
    (filter cutoff) and rosin noise, never required.
  - **Twelve committed stations with hysteresis.** Rim position picks a station; switching
    needs you to move 0.6 stations past the boundary, so pitch cannot jitter. Pitch and
    figure glide to the committed station with ~110 ms portamento. Figures now fully form.
  - **Station diamonds engraved on the rim** (mirrored left/right twins, since the angle
    mapping is symmetric); the active station's diamonds glow warm. You can aim.
  - **Pressure ring:** depth into the bow band = bow pressure (inner edge louder).
  - **Number-key manual:** holding 1…9 0 - = bows stations 0–11 directly; mono, last-held
    wins; works alongside q/e bends. Console hint extended to "1–= · q♭ · ♯e".
  - Scrub-in-place (option 3 from the proposal) deliberately left out for now, per James.
- Verified: `node --check` only — the harness browser cannot open `file://` and the no-dev-server
  rule stands, so James is the playtest.
- Where things stand: awaiting James's feel test of hold-to-bow, station snap, key manual.
  Hidden sigil exit and draft→live still open.

## 2026-07-11 — claude-fable (with James) — the mandala cabinet

- Pattern engine rebuilt: the twelve rim stations now interleave true Chladni modes with a
  library of arcane figures — mandalas (spoke×ring webs at 5/6/8/12-fold symmetry), rose
  outlines (5 and 7 petals), spirals (3 and 5 arms), and pure rings. Fields still blend
  continuously while bowing; the bow position (and therefore the sound) remains the driver.
- Randomness preserved: every visit and every Level the Sand rolls fresh rotations and ring
  spacings per station, so figures never repeat exactly. Crossing into a new station flings
  the sand (kick scaled by intensity); shake/pull raised ~60% for a much more dramatic spread.
- Plaque symbols per figure: Ⅲ:Ⅴ for Chladni, ✶8 mandalas, ✿7 roses, ✺5 spirals, ◉ rings.
- Four scales added to Voicing: Lyd♭7 (lydian dominant), Harm·Min, Hijaz (maqam, augmented
  2nd), and Rast (maqam with true quarter tones — 3.5 and 10.5 semitone degrees). Console
  wraps to two rows.
- FX ceilings raised hard: reverb wet now reaches 2.2× (IR lengthened to 4.5 s), delay wet to
  1.5× with feedback that scales up to 0.85 at full slider — near-endless repeats.
- Cat rebuilt as sculpted silhouette paths (single body path + integrated profile/gaze heads)
  instead of assembled primitives; gaze now includes a blink.
- Where things stand: mandala engine verified (✶8 station bowed and settled correctly). All
  sound changes still awaiting James's ears. Hidden sigil exit and draft→live still open.

## 2026-07-11 — claude-fable (with James) — reed voice, candlelight, the cat

- Fixed for real: no drift link can be triggered inside the plate. The previous z-index fix
  had made `.stand` (a viewport-spanning flex container) swallow every portal click;
  `.stand` is now `pointer-events: none` with the plate/console opted back in, so portals
  work in the scenery and never under the instrument.
- Voice reworked from Moog-brass to reed: single sawtooth split through a tracking lowpass
  (Q 2.2) and a fixed ~1150 Hz bandpass throat formant, triangle sub at low gain, 5.1 Hz
  vibrato on the detune. Think oboe.
- Pitch bend: hold **q** for a half step down, **e** for a half step up (applies after
  voicing quantize; plaque shows ♭/♯). Hint engraved quietly at the console's right end.
- Lighting rebuilt: hanging lamp removed (a charm still hangs from its chain). Five candles —
  two wall sconces (upper right wall, beside the door), one on the upper shelf by the skull,
  two candlesticks flanking the plate on the widened table. All flames flicker harder and
  asynchronously (distinct durations + negative begin offsets, ry pulse).
- The cat: larger and detailed (haunch, chest, front legs, paws, moonlit rim), tail sways on
  a 7.3 s cycle, and every ~23 s it turns its head and looks at the viewer — green slit eyes,
  whiskers — for about three seconds.
- Where things stand: reed timbre and bend verified by state, not by ear — James listens next.
  Hidden sigil exit and draft→live still open.

## 2026-07-11 — claude-fable (with James) — the arcane pass and the console

- James's redline round: octave lower + Moog character, real bow, more/livelier sand, obvious
  reset, deeper tilt, sound console, frequency-mapped colors, strike control, deeper gong,
  much more arcane room.
- Voice rebuilt: two detuned sawtooths + square sub-oscillator through a resonant lowpass
  (Q 9, cutoff rides bow intensity, slow LFO drift) — freq mapping halved to 44·√(m²+n²)
  (~98–282 Hz). FX bus added: generated-IR convolution reverb and a feedback delay.
- Console added beneath the plaque: Reverb / Delay / Strike sliders, Voicing stamps
  (Free · Triad · Penta · Overtones — quantizes the bow's pitch to note tables over A=55 Hz;
  the sand pattern stays continuous), and a Level the Sand reset.
- Gong deepened: new `gong-deep.mp3` (ElevenLabs temple gong) layered with a synthesized
  110→36 Hz sub-thump; Strike slider scales volume, pitch, and the grain kick.
- Sand: 40k grains (was 24k), stronger shake, settled grains boil while the plate sings, hard
  bowing re-mobilizes settled lines. Grain hue follows the register: teal in the low modes to
  violet in the high ones.
- Cursor props: a drawn bow (arched stick, hair ribbon, frog, shadow) in the edge zone; a
  felt-headed mallet over the interior. Plate tilt increased 14°→26°.
- Parlor rebuilt arcane: great zodiac ritual circle painted on the wall behind the plate,
  hanging astrolabe, star chart, skull bookend, crowded spines, alembic mid-distillation
  (green, animated), three lit candles with SMIL flicker, dried herbs over the window, a cat
  on the sill watching the moon, rune-arched door lintel, hanging hexagram talisman, cobwebs,
  chalk remnants on the floorboards, patterned rug.
- Layout bug fixed: portal hotspots were `z-index` 3 (above the plate) while at 16:9 the left
  scenery sat behind the plate — an invisible drift click-trap. Portals now stack beneath the
  stand, and the whole left cluster (window, shelves, bench, chart) moved left of the plate's
  worst-case footprint (design x < ~510).
- Where things stand: verified logic + visuals via preview; **the whole mix still needs
  James's ears** (voice level, reverb tail, gong weight, room tone). Hidden sigil exit and
  draft→live still to come.

## 2026-07-10 — claude-fable (with James) — the parlor and the mechanism

- Painted parlor added (checkpoint 2.5): full-scene `parlor.svg` (1600×900, object-fit cover) —
  paneled walls, curtained night window with waning moon, shelf of books and specimen jars,
  framed Chladni tafeln, door with warm light seam, hanging lamp, and the table the plate rests
  on. The three drift portals are now invisible regions JS-aligned over the painting's window,
  door, and luminous jar.
- The mechanism built (checkpoint 3): live Chladni physics on a 160×160 blended field grid.
  Press-drag along the plate edge bows it — perimeter position glides through 12 modes
  ((1,2)→(4,5), low at top, high at bottom), sand is flung from antinodes and gathers on nodal
  lines. Grain friction model: no force below amplitude 0.18 plus grind-to-halt damping — this
  is what keeps the figures soft and sandy instead of wire-thin (tuned via three iterations).
- Audio: Web Audio synthesis — four inharmonic partials swelling under the bow, rosin-noise
  tied to bow speed, sand hiss tracking grain motion. Tap the plate interior = gong strike
  (ElevenLabs-generated `assets/audio/gong.mp3`, ±8% rate variation) and a grain kick. Quiet
  ElevenLabs room tone loops under everything. All gated behind first pointer-down.
- Plaque now live: shows `403 Hz · Ⅱ:Ⅳ` style readouts while the plate sings, `—` at rest.
- Hover ploughs the sand (cursor is a fingertip); in the bow zone the cursor becomes a bow line.
- Where things stand: playable and verified (synthetic-input tested; audio needs James's ears).
  Still to come (checkpoint 4/5): the hidden worn-notch sigil exit, audio mix pass after James
  listens, and the draft→live call.

## 2026-07-10 — claude-fable (with James)

- World created from idea #7 in `Claude's Ideas.md`. Concept approved by James: acoustician's night
  parlor with mystical geometry, slight perspective tilt on the plate, luminous sand, exits that
  invite rather than puzzle.
- Set-dressing pass built (checkpoint 2 of 5): dark parlor with lamp cone and dust motes; tilted
  brass plate with engraved geometry (tick ring, octagram, seed-of-life, planetary glyphs);
  ~26k luminous grains resting on the true nodal lines of Chladni mode (3,5) with gentle shimmer;
  engraved plaque (TAFEL · VII, frequency readout dormant); three diegetic drift exits — night
  window, door light-seam, jar of luminous sand on the shelf.
- Where things stand: static scene only. Next: checkpoint 3, the mechanism — bowing along the
  plate edge, continuous mode morphing, grain leap/settle physics, Web Audio bowed tone behind
  the tap-to-gong audio gate. The hidden worn-notch sigil exit is also still to come.
- ElevenLabs pipeline available for one-shots (test gong already generated in `tmp/`).
