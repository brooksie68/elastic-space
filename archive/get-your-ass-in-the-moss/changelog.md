# Changelog — Get Your Ass in the Moss

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-16 — James

- Retired: moved from `src/worlds/` to `archive/get-your-ass-in-the-moss/` via the admin
  panel's archive control. James's call — the world was a dead end. (Entry added 2026-07-17
  during the global wrap; `World Ideas.md` #56 marked `retired`.)

## 2026-07-16 — claude-fable (moss-2)

- Removed the constant "jungle air" bed (band-passed noise at 2.4kHz) — James heard it as a
  relentless high-pitched whine. The soundscape is now the low drone bed + intermittent chirps +
  interaction sounds only; the deep-trip shimmer sine (E6, seated-only, gain ≤0.012) survives for
  now — kill it next if any high tone still bothers him.

## 2026-07-16 — claude-fable

- World born. James named it ("Get Your Ass in the Moss"), asked for a tripped-out multi-color
  green fungal tree-laden jungular psychedelic world with interactivity, and handed over
  interpretation. Built solo on his go-ahead, first pass in one session.
- Art: Cycles renders from a fully procedural Blender scene
  (`tmp/get-your-ass-in-the-moss/build_scene.py` — build + all render passes + manifest export,
  one headless run, ~45s on OPTIX). Plates: `assets/plates/set.png` (opaque master: mossy floor,
  displaced trunks with normal-Z moss shading, undergrowth mounds, glowing ground specks, hanging
  vines with emissive seed pods, teal/violet fog, magenta/cyan rim lighting), `moss-fg.png`
  (foreground moss bank, alpha). Seven interactive mushrooms rendered as individual border-cropped
  alpha sprites (`assets/sprites/shroom-N.png`) — spotted caps, emissive gill undersides, hues
  spread across magenta/cyan/violet/orange/emerald/pink/chartreuse. `assets/manifest.js` carries
  screen-space rects/anchors/palette as a global (file://-safe, no fetch).
- Page (`world.js`): cover-fit mapping of the 1920×1080 frame; two DPR-capped canvases sandwich
  the sprites. Canvas-drawn animated god rays (a film-transparent Cycles volumetric pass came out
  empty — canvas beams look better and move). Drifting spore motes with cursor attraction, moss
  cursor ripples, glow pools under each mushroom.
- Interactivity: mushrooms are buttons — poke for a squash-spring bounce, a spore burst in cap
  hue, and an E-minor-pentatonic pluck (pitch by mushroom size). THE mechanic: a sit hotspot on
  the foreground moss bank — settle in and a trip arc ramps over ~24s (scene saturation/hue-wobble
  grade, denser faster spores that orbit the cursor, aurora blobs, moss bank rises slightly,
  drone blooms with an added fifth, plucks gain echo, chirps snap to the pentatonic). Stand up
  (click again or Esc) and it eases back in ~5s.
- Audio: all Web Audio synthesis behind the shared sound control — drone bed (detuned triangles +
  sub, breathing lowpass), filtered-noise jungle air, random bird/frog/twinkle chirps, plus the
  interaction sounds above.
- Exits: three diegetic drift portals — the hero trunk's black hollow (left), the fairy ring of
  nine emissive mini-mushrooms (bottom-left), and the glowing mist gap between the right trunks.
  All pulse gently on the deep canvas and brighten on hover.
- Gotcha for the record: `ground_height()` ray-casts straight down, so any point under an
  existing tall object returns that object's top — the hollow spent two renders at z≈19 before
  being pinned to the trunk's stored base height.
- Where things stand: v1 shipped whole. Untested in a live browser this session (renders and
  static checks only) — first James pass pending. Natural next steps if he wants them: a tuner
  panel (Chrome Rift pattern), more mushroom voices, a hidden fourth exit, denizens.
