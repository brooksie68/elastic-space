# The Fifteen Sisters — changelog

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
