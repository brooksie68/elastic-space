# Claude instructions

## Local preview

- Use the local dev server (`server.mjs` via `.claude/launch.json`, port 4174, or `serve-local.cmd` on 4173) for previewing and verification. (A brief "no dev server" rule existed on 2026-07-11; James reversed it the same day.)
- Worlds should still degrade gracefully under `file://` — drift carries query-string fallback state, and world code must not rely on `fetch()` for assets (blocked on `file://`; use media elements or synthesis).

## World changelogs

- Every world folder contains a `changelog.md`; `src/worlds/_template/changelog.md` is the starter.
- Append an entry whenever a session meaningfully changes a world: date, author, what changed, and where things stand or what comes next.
- Newest entries first. Never rewrite or delete earlier entries.
- World idea backlog and selection history live in `Claude's Ideas.md` at the repo root; update statuses there when a world is selected, built, or shipped.

## Audio generation (ElevenLabs)

- James's ElevenLabs API key lives in the gitignored `.env` at the repo root (`ELEVENLABS_API_KEY`). Never commit it or reference it from world code — worlds are client-side and anything they load is public.
- ElevenLabs is an authoring-time pipeline only: generate audio locally with `node tools/eleven.mjs` (voices | sfx | tts | music), save results into `src/worlds/<slug>/assets/audio/`, and commit only the audio files.
- Continuous or parametric sound (pitch glides, physics-driven audio) stays Web Audio synthesis; ElevenLabs covers one-shots, voices, ambience beds, and music.

## Blender usage

- The live Blender instance (MCP add-on) is shared across all agent sessions. Never open, switch, or create files in it without James's explicit go-ahead — `is_dirty` is not a reliable guard against destroying another session's in-memory work.
- Default to headless Blender for scripted scene work: `& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background <file.blend> --python <script.py>`. Each run is a private process that never touches the live window.
- Each world keeps its own .blend (plus build scripts and renders) under `tmp/<world-slug>/`.
- Reserve the live instance for work that needs the UI: viewport captures, MPFB2 workflows, interactive tweaks.

## World sound control

- Every world with sound uses the shared control: load `../../core/sound-control.js` and call
  `ElasticSoundControl.attach({ media })` with an audio element, or
  `ElasticSoundControl.attach({ start, stop, setVolume })` for Web Audio synthesis.
- It renders the standard speaker button top right (pulses twice on load, tooltip, on/off states,
  hover volume slider) and makes one autoplay attempt — sound starts immediately for visitors who
  have granted the site sound permission, and waits for the button otherwise.
- Do not build per-world audio toggles or autoplay hacks; extend `sound-control.js` if a world
  needs something it doesn't cover.

## Links between worlds

- Random drift is the default. Do not choose or name the destination.
- Exits encourage exploration, never thwart it: finding a way onward must not be a hard puzzle.
- Exits are diegetic scene elements — never a literal link, button, or labeled control in appearance.
- Each world generally offers at least three drift choices somewhere on the page. Hidden bonus exits may exist beyond those three.
- Make a portal with `href="../../../index.html"`, a generic accessible label, and the `data-drift` attribute.
- Load `../../core/world-registry.js` and then `../../core/drift.js` in each world that offers drift links.
- Direct links are allowed only when the user explicitly wants a fixed route, such as an authored sequence. Fixed links do not use `data-drift`.
- Drift avoids worlds already seen in the current cycle. Do not implement separate destination memory inside a world.
- After adding, removing, or renaming a world, run `npm run registry`.
- The root `index.html` is an intentional named directory and may use direct links.

## Jerry's Pool denizens

- `docs/denizen-frequency-rubric.md` is the canonical denizen timing reference.
- Update that rubric whenever denizen spawn timing, opening appearance timing, duration, counts, or concurrency limits change.

## Jerry's Pool rendering

- The live world is `src/worlds/jerrys-pool/`; read `docs/current-index.md` before changing its renderer or dot physics.
- The 330 background dots use PixiJS/WebGL shared-texture batching.
- Preserve Jerry's dot pressure, wake, side displacement, and recovery behavior. It is a core spatial effect, not expendable decoration.
- Far, middle, and near dot physics run at 15, 30, and 60 FPS respectively. Dots near Jerry are promoted to 60 FPS regardless of depth.
- Off-screen dots remain continuous in their orbits but skip rendering and Jerry-influence work outside the viewport margin.
- Seamount elements are solid underwater terrain. Keep their opacity at `1` and `mask-image: none`; create depth with blur, value, and scale.

## Wildflowers at Dusk rendering

- The live world is `src/worlds/wildflowers-at-dusk/`.
- Canvas handles rain, drifting cloud sprites, cedar framing, and foreground vegetation.
- Painted landscape plates are DOM images in `assets/landscape/`, stacked beneath the Canvas with CSS z-index and depth-specific blur.
- Runtime cloud and landscape PNGs have transparency; `*-source.png` files retain chroma green and are not loaded by the page.
- Rain renders behind clouds. Terrain and mountains are opaque.
- The scene is desktop-first; do not add mobile-specific compromises unless explicitly requested.
- The world runs a one-way timed arc (flora dissolution → giant's rise + thrum → 20s end blur);
  reload resets it. `REVIEW_SKIP_TO_GIANT` in world.js fast-forwards to the finale for tuning —
  ships `false`.
- Background vegetation ranks are offscreen canvases baked once (filters applied at bake time),
  planted along the near-ridge plate's pixel-sampled top silhouette; per-frame cost is one
  drawImage per rank. The giant lives in `assets/giant/` (runtime PNG + chroma `giant-source.png`).
- All page audio (rain bed + giant thrum) routes through the single shared sound control — any
  new sound must obey its mute/volume state.
