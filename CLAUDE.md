# Claude instructions

## Todo

1. **Set up SSH remotes for GitHub pushes** (added 2026-07-15, do as a guided walkthrough —
   James is not an IT guy, talk him through each step). Context: HTTPS pushes >~10MB fail
   with TLS corruption on BOTH schannel and OpenSSL backends (the 07-15 `sslBackend openssl`
   switch did NOT fix it — see memory `chunk-large-git-pushes`). SSH bypasses that code path
   entirely. Steps: generate an ed25519 key (`ssh-keygen`), add the public key to James's
   GitHub account (his part, in the browser), test with `ssh -T git@github.com`, then switch
   each repo's remote URL (elastic-space, _workspace, buzzsaw, blipblops, JBB-UX-Portfolio,
   arachno-wars-two, wifilolz, jam-terminal). Verify with a >10MB test push, then update the
   memory + BOOTSTRAP.md so restore.sh instructions stay true.

## Local preview

- Use the local dev server (`server.mjs` via `.claude/launch.json`) for previewing and verification. **Port is 4174, always** — the server defaults to it, the launcher uses it, nothing uses 4173 anymore (retired 2026-07-13). (A brief "no dev server" rule existed on 2026-07-11; James reversed it the same day.)
- Worlds should still degrade gracefully under `file://` — drift carries query-string fallback state, and world code must not rely on `fetch()` for assets (blocked on `file://`; use media elements or synthesis).

## Map room (root index.html)

- The repo-root `index.html` is the map room: server status light, the page directory, the
  dashboard-icons toggle, and the world editor (the former `/admin/` page, which now redirects
  to `/`). It is James's primary starting point while the project is in active development.
- `start-elastic-space.cmd` at the repo root is the ONE launcher (renamed from `map-room.cmd`
  2026-07-13; `serve-local.cmd` and `start-local.cmd` were deleted the same day — do not
  recreate them). Double-click: reuses a running server or starts it in its own CMD window on
  port 4174, then opens the map room. It can also be launched from the ai-projects ops
  dashboard's Launch button. Never make James start the server from a command line.
- The map room page must keep working from `file://`: it polls `http://127.0.0.1:4174/healthz`
  (the server sends `Access-Control-Allow-Origin: *`) and switches itself to the served copy when
  the server comes up; editor panels stay dormant until then.
- Every page loads `../../core/dashboard-control.js`, which renders the top-right dashboard icon
  linking back to the map room; the shared sound control sits directly below it. The map room's
  "show dashboard icons" toggle (localStorage key `elastic-dashboard-icons`) shows/hides these
  icons site-wide; sound icons are unaffected. Every new page must include dashboard-control.js.
- New worlds still get a direct link in the map room's Pages list as part of shipping.
- `welcome.html` at the repo root is the visitor-facing front door (line-drawing Jerry on dark
  blue; clicking him enters Jerry's Pool — an intentional fixed route, no `data-drift`). At
  publish time it becomes the public site's `index.html` in place of the map room. Root-level
  pages load dashboard-control with `data-home="./index.html"` since the default home path
  assumes world folder depth.

## World changelogs

- Every world folder contains a `changelog.md`; `src/worlds/_template/changelog.md` is the starter.
- Append an entry whenever a session meaningfully changes a world: date, author, what changed, and where things stand or what comes next.
- Newest entries first. Never rewrite or delete earlier entries.
- World idea backlog and selection history live in `World Ideas.md` at the repo root (sections per contributor, global idea numbering; formerly `Claude's Ideas.md`); update statuses there when a world is selected, built, or shipped.

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
- Worlds needing a second volume channel (e.g. music separate from SFX) pass
  `channels: [{ label, value, setVolume }]` to `attach()` — each renders as a labelled slider
  below the main one on hover (added 2026-07-13 for Arachno-Wars 2000's music).
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
