# Changelog — The Singing Plate

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

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
