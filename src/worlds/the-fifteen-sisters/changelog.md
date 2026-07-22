# The Fifteen Sisters — changelog

## 2026-07-20 — claude-fable (bell removed, city quieter)

- Removed the unison hour-bell (distant-bell.mp3): James found it clashing with
  the sisters' chimes. `ringBell()`, the release-kind/bell-clock bookkeeping,
  and the strike check in `frame()` are gone from world.js. The `<audio
  id="bell">` element and the mp3 are still in place — pull them at a wrap-up
  pass (html edits are deferred mid-session), they're harmless dead weight.
- City bed volume cut 25%: 0.49 → 0.37 of master in `applyVolume()`.
- Coming next: chromatic C3–C5 sample bank rendered from Surge XT (real synth
  notes, no pitch-shifting) once James picks a patch — see repo tmp/synth-test
  for the DawDreamer pipeline.

## 2026-07-18 — claude-fable (walls: mandala-shop sandstone, gently)

- The salon plate re-rendered with the Meshy sandstone from the mandala shop
  (`src/worlds/mandala-shop/assets/textures/sandstone.png`) folded into
  `plaster_material()` in build-salon.py: box-projected in world space (~2.9 m
  repeat), OVERLAY mix at 0.45 so the dark evening value holds, plus a 0.12 bump
  so the candlelight catches the strata. Deliberately gentler than the mandala
  shop, where the same file is the full-strength wall albedo.
- Verified by A/B crop against the previous plate: mottling/strata visible in the
  candle-lit piers, overall tone unchanged. build-salon.py synced to
  tmp/the-fifteen-sisters/, salon.blend saved there by the build.
- Round 2 same day: 0.45/0.12 was too timid for James ("can barely tell it's
  there") — overlay now 0.80, bump 0.20, re-rendered. Walls read clearly as warm
  stone under the candles now.
- Default evening is now Candlelight (was Midnight), and the cabinet's Evening
  chips reordered: Candlelight, Dusk, Midnight.

## 2026-07-18 — claude-fable (citysounds round 2: 30% reverb, quieter bed, 80% start)

- Reverb re-baked at 30% of the Dropzilla knob (wet 0.36), again from the dry original.
  The mix is now RMS-matched to the dry file (−0.07 dB trim) so baking reverb never
  raises the file's own loudness — round 1 skipped this and James heard the bed get
  louder.
- `citybed` gain in `applyVolume()` cut 0.7 → 0.49 (30% down): the bed was too loud
  against the sisters' bells/bowls. Still rides `masterVol`, so the shared control
  scales everything together.
- World master volume now starts at 0.8; the hover slider is synced via the attach()
  return handle (`soundUI.setVolume`).

## 2026-07-18 — claude-fable (citysounds bed: distance reverb baked in)

- `assets/audio/citysounds.mp3` re-rendered with Dropzilla's exact reverb baked in at
  20% of its knob (James's call: same reverb, 20% of the slider) so the city reads as
  coming from outside, in the distance. Replicated offline in Node: Dropzilla's 2.4s
  synthesized noise impulse ((1-t)^2.6 decay), WebAudio ConvolverNode normalization,
  wet send 0.24 over full dry. Reverb tail wraps circularly to the file start so the
  loop point stays seamless. No ffmpeg on the machine — decode/convolve/re-encode done
  with audio-decode + fft.js + @breezystack/lamejs (192k mp3, 48kHz stereo preserved).
- Dry original recoverable from git history (this is the only edit to the file).

## 2026-07-15 — claude-fable (front view swings for real, the name on the wall)

- Front-view projection rebuilt. The old drop+scale tilt cancelled the pendulum arc's
  rise and only breathed size ±7%, so the sisters read as bobbing on strings (James's
  call). Now the camera eye sits level with each sister's rest point, FRONT_CAM = 1.9
  rail-lengths back: she climbs her arc at both ends of the swing — a touch higher when
  near — and perspective swells her toward you (+27%) and shrinks her away (−18%) for
  the longest sister; shorter sisters travel less depth, so they breathe less, which is
  physical. ARC_LIFT = 1.35 exaggerates the climb slightly for legibility. The 45° and
  90° projections (which James called fantastic) are untouched.
- The world's name — "the fifteen sisters" — now arcs over the centre arch like an old
  inscription painted on the plaster: an SVG textPath in plate coordinates riding the
  cover transform, aged gold at low alpha with a hair of dark understroke, sitting
  beneath the evening tint so it grades with the wall. The face is Aref Ruqaa (OFL),
  whose latin glyphs are drawn in ruqaa calligraphic style; the latin woff2 (14.6 KB)
  is bundled at assets/fonts/ so file:// keeps working. Note: the sisters' rail and
  the middle rope hang in front of the inscription at the flanks — physically correct,
  easy to retune if it reads cluttered.

## 2026-07-13 — claude-fable (lived-in salon, birds, ropes, deep register)

- James's midnight city painting landed (`assets/city/fifteen-sisters-city-midnight.png`);
  Midnight and Candlelight evenings now show it (Dusk keeps sunset). The GPT generation's
  content sits a few px higher than sunset's — James called it close enough, no correction.
- The invitation ("drop the sisters") moved up 12px, doubled in size, went warm golden, and
  its breathe now pulses actual brightness.
- "The Keeper's Cabinet" renamed to "Configure the Sisters"; pull label + brass icon doubled.
  Front / 45° / 90° buttons doubled. Cabinet panel raised to clear the taller pull.
- New Register group in the cabinet: Bright / Deep — Deep drops every tuning a full octave
  (sines and bowls both; bowl sample now pitches down as well as up).
- Three ropes now hold the sisters' rail from the ceiling in all three vantages — slight
  slack, twist shading, lashings under the rail. Nothing crazy; it just hangs there.
- Distant birds: little black V's opening and closing drift past over the city every half
  minute or so, on a new canvas between the city painting and the salon plate so the piers
  crop them naturally.
- Salon plate re-rendered lived-in: plaster got fine grain bump, damp mottling, scum and
  scuffs climbing from the floor, faint water streaks; floor roughness now wanders tile to
  tile; all the woodwork got grain. Incense moved off the bench onto a new small table at
  the far left by the door (bench keeps the fruit); its tip exports as the "incense" hotspot
  and the page now animates a live smoke wisp rising from it (baked smoke blobs deleted).

## 2026-07-13 — claude-fable (major scale, chromatic loudness, plate rescue)

- Tuning gained a plain Major chip (Pentatonic stays the default; Harmonic is harmonic major).
- Chromatic was near-inaudible: twelve notes per octave keeps all fifteen sisters at 130–290 Hz,
  where sine tones read far quieter to the ear. Added equal-loudness lift for low notes
  (up to ~2.6x below 400 Hz) plus stronger second partial under 300 Hz — benefits the bottom
  of every scale.
- Discovered the furnished-salon FINAL render never shipped (session died mid-render after the
  preview); the world had been showing the unfurnished plate. Re-rendered and copied — rugs,
  zellij, chair, palm, table, fruit, incense and the big paintings are now actually visible.

## 2026-07-13 — claude-fable (the invitation)

- The evening no longer starts itself. The sisters load held at full amplitude and the words
  "drop the sisters" breathe over the lower scene — clicking them makes the first release
  (whatever pattern is set). Any release from the cabinet also dismisses the invitation.
  Replaces the 1.6 s auto-release and the old fading whisper line.

## 2026-07-13 — claude-fable (tunings)

- New cabinet group Tuning, feeding both the glass sines and the pitched bowls: Pentatonic
  (the wind-chime default), Chromatic, Seventh (arpeggiated dominant 7th — 4 notes per octave,
  so fifteen sisters span nearly four octaves), Harmonic (harmonic major, major with a b6).
  Longest sister is always the root; the scale climbs as they shorten.

## 2026-07-13 — claude-fable (voices)

- New cabinet group Voices: Glass (all synth sines) / Bowls (the full pentatonic played on the
  one ElevenLabs bowl sample, pitch-shifted per sister via cloned audio elements with
  preservesPitch off — the "bell scale" test without needing fifteen generations) / Blend
  (default: bowl on the longest sister, glass above). Upper bowl strikes come in softer.
- Fixed an inverted pitch mapping: the longest sister had been playing the HIGHEST sine.
  Longest now = lowest, rising pentatonic as the sisters shorten, matching physics.
- Seam for city variants per evening: CITY_SRCS map in world.js (all three entries point at
  the sunset plate until James generates Midnight / Candlelight paintings — 1920x1080, same
  framing, drop into assets/city/ and update two paths).

## 2026-07-13 — claude-fable (2x sisters, view buttons, furnished salon)

- Sisters doubled in size (r 9–20 → 18–40 px, sprite bake up to 384 px); floor pools kept at
  their old absolute size; all three rails beefed up, the 90° rail most (it was near-invisible).
- The swivel arrow replaced by three labelled buttons bottom-left: Front / 45° / 90°.
  Same eased camera swing; 90° ↔ Front still passes through 45°.
- "The Keeper's Cabinet" label now sits left of the brass pull.
- citysounds bed settled at 0.7 × master (1.0 was too loud, 0.3 too shy).
- The salon got furnished (all procedural in build-salon.py): two patterned rugs (crimson
  grand rug with gold medallion + navy border under the sisters; teal runner by the door),
  zellij mosaic bands on every pier below the wainscot, a wooden chair with crimson cushion,
  a potted palm at the right edge, a round table with green/amber bottles and two glasses
  (real transmission glass), a wicker basket of oranges/pomegranates/lemons and a smoking
  incense stick on the bench, and the two paintings went big and colourful in gilt frames.
  Decor stays mid-value — the sisters remain the feature.

## 2026-07-12 — claude-fable (momentum, chime toggle, low bowl, city bed)

- Cabinet grew two groups: Momentum (Endless / Fading — friction with a 40 s time constant;
  swings decay to stillness, chimes fade with them via the velocity gate; any Gather + Release
  restores full swing) and Chimes (Singing / Silent).
- New low voice: an ElevenLabs Tibetan-bowl strike (`assets/audio/tibetan-bowl.mp3`, soft felt
  mallet, long decay). The longest sister now strikes the bowl at centre instead of her sine —
  first test of sampled bells against the synth glitter; easy to revert if it conflicts.
  James may try a full ElevenLabs bell scale later.
- James's `citysounds.mp3` added as a second ambience loop under everything (0.3 × master,
  through the shared sound control like the rest).
- Unison church bell now skips ringing when friction has stilled the sisters.

## 2026-07-12 — claude-fable (the city outside)

- James supplied a sunset city painting (ChatGPT-generated, `assets/city/`); the salon now looks
  out over it from five-or-six stories up. Implemented as an emissive 16:9 billboard sized to
  the camera frustum in the Blender scene (shifted down 2.4 m so the windows favour spire tops
  and sky), so the arches crop it naturally and the floor reflects it.
- Interior re-lit to match: window light and fill went from cool dusk-blue to sunset rose,
  volumetric haze warmed. Moon, star dome and hills retired — the city brings its own sky.
  Exit star re-hung in front of the city through the right arch (NDC re-exported).
- Glass rim-light in the ball sprites now follows the evening: sunset rose by default, cool
  blue only at Midnight.
- Second pass at James's request: billboard zoomed out (1.12 → 0.85 scale) and raised so the
  windows take in the water, the lit city carpet and the painting's foreground rooftops (wind
  tower left, patterned dome right). 90° rail also re-centred on the arch (0.47 → 0.50 W).
- Third pass — James saw the render pipeline degrading the painting (AgX tonemap + interior
  haze acting as a second distance filter). Rebuilt: the plate now renders with TRANSPARENT
  windows (film_transparent, RGBA) and the page composites the original PNG raw behind it —
  zero filtering, pixel-exact, sized so the painting's full width spans the window wall with
  a hair of padding behind the piers. Volumetric haze deleted; billboard deleted; exit star
  bakes onto the transparent sky so its flare rides over the live image. The .city element
  must never receive a CSS filter.

## 2026-07-12 — claude-fable (later that evening)

James's review: front view + setting approved; asked for a side vantage (where the snake/braid
math really shows) without losing the front view, and heftier strings.

- Added rotated vantages (James asked for 45 and 90): the quarter view recedes toward the
  centre arch (far sister at 0.42 scale), and the end-on 90° view nests all fifteen straight
  down the rail (0.36 far scale, hair of x-drift for legibility) — the aligned-fan view where
  the groupings really show. Same physics — each view is just a projection off the shared wave
  clock, so switching never disturbs the motion.
- Brass swivel button bottom-left cycles front → 45° → 90° → front, ~0.85 s eased swing per
  step; returning from 90° passes back through the quarter view like a real camera move. The
  arrow glyph turns 90° per stage. Room plate intentionally stays front-on.
- Strings tried as heavier two-tone cords, then reverted to the original gossamer threads at
  James's call (thin pale stroke, perspective-scaled).
- Colour pools follow the receding floor line in side view.

## 2026-07-12 — claude-fable

First build, from World Ideas.md idea #6 (selected by James this session).

- Blender-rendered salon plate (`tmp/the-fifteen-sisters/build-salon.py` → `assets/room/salon.png`):
  three arched openings on a dusk gradient, moon, stars, two candles, a door ajar far left,
  stone floor with soft reflections, EEVEE + AgX + fog-glow glare. NDC hotspots exported to
  `tmp/the-fifteen-sisters/salon-map.json` and inlined into `world.js`.
- Pendulum-wave engine on a single shared wave clock (`waveU`): sister i completes 22+i swings
  per grand cycle, so the row realigns exactly once per cycle; tempo changes stay
  phase-continuous. Weak-perspective projection (swing toward the viewer reads as drop + scale).
- Fifteen glass balls as pre-baked canvas sprites: rainbow default plus Moonlight / Ember /
  Sea-glass palettes; Orb / Drop / Lantern forms; colour pools cast on the floor.
- The keeper's cabinet (brass pull, bottom right; beckons with a slow glow): Glass, Form,
  Evening (Dusk / Midnight / Candlelight re-grade), The Hour (36 / 60 / 90 s), The Release
  (Together / Cascade / Mirror / By hand) plus Gather & Release. By-hand: gathered sisters
  release on click.
- Sound through the shared control: Web Audio pentatonic chimes as each sister passes centre
  (velocity-gated, compressed, echo), ElevenLabs cricket ambience loop, and a distant bell
  when a together-release comes home to unison.
- Three diegetic drift exits: the door ajar, a twinkling star through the right arch, a moth
  fluttering near the candle (rests occasionally).

Where things stand: world complete and registered; draft status pending James's review.
Possible next: hidden fourth exit, per-sister damping toggle for a slow-death mode.
