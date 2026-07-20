# Claude instructions

The canonical world-building contract (folder layout, required wiring, drift/sound
rules, ship checklist) is `docs/building-a-world.md` — follow it when adding or
reviewing worlds, and keep it updated when all-world rules change here. `AGENTS.md`
at the repo root is the equivalent entry point for non-Claude agents; keep the two
consistent. `npm run check-worlds` audits every world against the contract.

## Todo

1. DROPZILLA: keep filling the soundboard tabs — banks 3–10 are open (GAS and CHUCK OPINES
   are live). James supplies audio per bank; Claude wires pads, labels, and icons.
2. DROPZILLA: re-enable the drift exits (sticker, note, cable) — temporarily commented out
   in index.html on 2026-07-16; James found them distracting during the soundboard build-out.
3. ARACHNO-WARS: tank-color tuner panel (Chrome Rift tuner pattern) — two color pickers
   driving `HULL_TINT` live, localStorage-persisted. Approved 2026-07-19, build later.
4. ARACHNO-WARS: "me against the world" horde direction — James discovered rapid-fire
   free-shooting in practice mode is the fun; wants massive blasting vs many enemies, not
   1v1. Open questions posed 2026-07-19 (replace duel or third mode? enemy types? fire-rate
   governor?) — discuss before building. Prototype instinct: third menu entry, keep duel.
5. SPASTIC SPACE REVIVALS: recreate `pork.html` and `scary_corndog.html` as two new worlds,
   approved 2026-07-19. Full analysis + GIF timing data + build plan in
   `assets/spastic-space/recreation-notes.md` (read it first — timing table is exact, decoded
   from the original GIFs with `tools/gif-analyze.mjs`). CSS/JS animation instead of GIFs,
   scaled up for modern screens, hidden-link hotspots become drift exits, and each page gets
   a Chrome Rift-style tuner panel for live timing tweaks (James wants to tune by eye).
   UPDATE 2026-07-19: the Spastic Space Flash is NOT lost — 70 SWFs play via the Ruffle
   harness at `tmp/flash-test/` (gitignored — they still need a durable home, ask James).
   See the "Flash status update" section in recreation-notes.md. Embedding is parked;
   recreations proceed as planned.
   Co-build with James — plan first, his go before building.
   UPDATE 2026-07-19 (build session): the pork half is BUILT as **Relaaax**
   (`src/worlds/relaaax/`, James's rename) — tunable field renderer staged in a resizable
   frame, draft status, no drift/registry yet. Remaining: James tunes by eye; decide the
   setting (his idea: the field playing on a TV in a scene, people watching and drooling);
   then ship wiring. scary_corndog not started — read that world's CLAUDE.md first.
3. (dropped 2026-07-18: "city tile" panorama — James sealed the shop with a Meshy door
   instead; there is no outside. If one ever returns, it gets built properly.)

(SSH remotes shipped 2026-07-16: all repos push over SSH now, see memory
`chunk-large-git-pushes`; blipblops was skipped, it has no `.git` directory)

## Local preview

- Use the local dev server (`server.mjs` via `.claude/launch.json`) for previewing and verification. **Port is 4174, always** — the server defaults to it, the launcher uses it, nothing uses 4173 anymore (retired 2026-07-13). (A brief "no dev server" rule existed on 2026-07-11; James reversed it the same day.)
- Worlds should still degrade gracefully under `file://` — drift carries query-string fallback state, and world code must not rely on `fetch()` for assets (blocked on `file://`; use media elements or synthesis).

## Admin panel (root index.html)

- **Naming: James calls this the "Elastic Space admin panel" / "admin page" — never "map
  room" (deprecated 2026-07-16).**
- The repo-root `index.html` is the admin panel: server status light, the page directory, the
  dashboard-icons toggle, and the world editor (the former `/admin/` page, which now redirects
  to `/`). It is James's primary starting point while the project is in active development.
- `start-elastic-space.cmd` at the repo root is the ONE launcher (renamed from `map-room.cmd`
  2026-07-13; `serve-local.cmd` and `start-local.cmd` were deleted the same day — do not
  recreate them). Double-click: reuses a running server or starts it in its own CMD window on
  port 4174, then opens the admin panel. It can also be launched from the ai-projects ops
  dashboard's Launch button. Never make James start the server from a command line.
- The admin panel page must keep working from `file://`: it polls `http://127.0.0.1:4174/healthz`
  (the server sends `Access-Control-Allow-Origin: *`) and switches itself to the served copy when
  the server comes up; editor panels stay dormant until then.
- Every page loads `../../core/dashboard-control.js`, which renders the top-right dashboard icon
  linking back to the admin panel; the shared sound control sits directly below it. The admin
  panel's "show dashboard icons" toggle (localStorage key `elastic-dashboard-icons`) shows/hides
  these icons site-wide; sound icons are unaffected. Every new page must include
  dashboard-control.js.
- The worlds list is two sections since 2026-07-19: "In progress worlds" (Welcome pinned
  on top) and "Completed worlds", each alphabetized ignoring a leading "The". New worlds
  still get a direct link — into "In progress worlds" — as part of shipping. Gallery
  worlds also get a "curate" pill in their row (`.page-row` / `.curate-link`) linking to
  the world with `?curate=1`. Each world row ends in a kebab (⋮) menu (served copy only)
  holding "move to completed"/"move to in progress" (via `POST /api/worlds/:slug/status`,
  which rewrites index.html keeping the sort) and "archive". James never wants the
  archive action visible outside the kebab.
- `welcome.html` at the repo root is the visitor-facing front door (line-drawing Jerry on dark
  blue; clicking him enters Jerry's Pool — an intentional fixed route, no `data-drift`). At
  publish time it becomes the public site's `index.html` in place of the admin panel. Root-level
  pages load dashboard-control with `data-home="./index.html"` since the default home path
  assumes world folder depth.

## World drafts (admin panel)

- `world-drafts.json` at the repo root stores page drafts James creates in the admin panel's
  world editor tab ("new draft" dialog: title, synopsis, vibe, reference links, sound notes,
  ideas). The dev server reads and writes it via `/api/drafts`; don't hand-edit the shape.
- The dialog's "engage" button marks a draft `engaged` and inserts a line into the Todo
  section above. **Engage means discuss, never one-shot.** Picking up an engaged draft is a
  conversation in three steps, in order: (1) read it from `world-drafts.json` and ask James
  your questions; (2) present a build plan; (3) discuss the plan with him. Only after James
  gives an explicit go on the discussed plan does any building start — no world code, no
  scaffolding, no assets before that. This holds even when the draft was originally Claude's
  idea. New worlds are co-built, never unprompted. When the world ships, remove
  the todo line, mark the draft's status `built`, and update `World Ideas.md`.

## Curator mode (gallery worlds)

- `src/core/curator.js` is the reusable in-world curation module (built 2026-07-16 on
  Mandala Shop). A gallery world loads it via dynamic import when `?curate=1` is present
  and the page is served, passing an adapter: THREE + scene/camera/stage, the live layout
  object, analytic wall/floor geometry, slot add/remove/update/reset hooks, frame kit,
  protected slot ids, and input locks. See `src/worlds/mandala-shop/world.js` for the
  reference adapter.
- Server side: `GET /api/worlds/:slug/art` lists `assets/art/` images;
  `PUT /api/worlds/:slug/layout` validates and rewrites `assets/layout.js` (Blender Z-up
  coords, `globalThis.<SLUG>_LAYOUT` format), backing up the previous file to
  `tmp/<slug>/layout-backups/` first.
- Layout files are curator-owned once a world ships: never hand-edit slot data casually,
  and never let a Blender build script reseed `layout.js` unguarded (Mandala Shop's
  build.py requires `MS_WRITE_LAYOUT=1`).

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

## Per-world instructions

- **Every world has its own `src/worlds/<slug>/CLAUDE.md`.** When James says "let's work on
  <world>", the FIRST step is to read that world's CLAUDE.md (plus the docs it points to).
  Claude Code also auto-loads it when touching files in the world's folder.
- Division of documentation: anything specific to one world (rendering constraints,
  physics, timing, protected behaviors, in-progress work) is documented in that world's
  CLAUDE.md. This file (elastic-space level) holds only all-world rules and the services
  we connect to.
- New worlds get a CLAUDE.md at ship time (`src/worlds/_template/CLAUDE.md` is the starter),
  and sessions add world rules there as they surface — not here.
- Some worlds carry extra docs in their folder (e.g. `arachno-wars-2000/overhaul-roadmap.md`
  and `spider-vision.md`, `dead-letter-office/README.md`); Jerry's Pool's deep-dive docs are
  in repo-root `docs/` (`current-index.md`, `denizen-frequency-rubric.md`).

## 3D assets (Meshy)

- James has a Meshy Premium account (since 2026-07-17) and premade object libraries there —
  check his library before hand-modeling props or characters in Blender.
- The `meshy` MCP server is available in Claude Code sessions. Every generation call costs
  credits: state the cost and get James's confirmation before calling anything that spends.
- Seamless texture tiles via text-to-image are the go-to look multiplier for 3D worlds
  (Mandala Shop is the reference).
- Prompt-handoff workflow: Claude writes a prompt + context package, James tunes on the
  Meshy canvas, Claude pulls results via `meshy_list_tasks` / download. Check scale against
  viewing distance before importing.
- Gotcha: Meshy materials duplicate the texture atlas as `emissiveMap` — when swapping
  textures, swap both maps.

## Music (Suno)

- James authors full music tracks himself at suno.com — it is a manual, browser-side tool
  (no API, no CLI); Claude never generates there. Claude can help draft prompts or lyrics
  when asked.
- Integration pattern (reference: Chrome Rift's Saffron tracks): James drops finished MP3s
  into `src/worlds/<slug>/assets/audio/`, Claude wires them — playlist array in world.js,
  playback through the shared sound control like any other audio.
- Division of labor with ElevenLabs: Suno for full songs/soundtracks James curates by ear;
  ElevenLabs (`tools/eleven.mjs`) for SFX, voices, and ambience beds; Web Audio synthesis
  for continuous/parametric sound.