# Elastic Space — instructions for coding agents

You are working in Elastic Space, an explorable collection of digital worlds owned by
James Brooks. This file is the entry point for every coding agent — Codex, Gemini,
Claude, or anything else. When James points you here, this is the whole onboarding.

## Session start

1. Read `README.md` — what this place is and its creative rules.
2. Read `docs/building-a-world.md` — the canonical mechanical contract for adding or
   changing a world, including the ship checklist. If any doc disagrees with it, it wins.
3. Skim the repo-root `CLAUDE.md`. Despite the name it is the project's operating
   manual for every agent: all-world rules (admin panel, drafts, sound control, drift,
   Meshy, ElevenLabs, Suno, Blender) and the live `## Todo`, which is where the current
   state of every world is written down. It is long — read the sections and the Todo
   entry for whatever you are about to touch, not the whole file.
4. Check the dev server: `http://127.0.0.1:4174/healthz`. If it's down, tell James to
   double-click `start-elastic-space.cmd` — never make him use a command line, and never
   nag about the server being down; he starts it when he wants it.
5. Then confirm you're oriented and **ask James what this session is.** Do not assume.
   It could be:
   1. Working on an existing world — first read that world's own
      `src/worlds/<slug>/CLAUDE.md` and `changelog.md` (the CLAUDE.md name is
      historical; it applies to all agents).
   2. Building a new world from James's idea — plan first, build after his explicit go.
      Ideas he has already written up live in `world-drafts.json` (admin-panel data;
      never hand-edit its shape). An "engaged" draft means discuss, never one-shot:
      read it, ask your questions, present a plan, discuss, then wait for his go.
   3. Reviewing or verifying someone else's work — audit against the ship checklist
      and `npm run check-worlds`.
   4. Something else entirely: tooling, docs, assets, the admin panel.

## What this place is made of

1. **Target: the browser, no build step.** Every world is static HTML + CSS + vanilla
   JavaScript served as-is by `server.mjs` (a zero-dependency Node server) or opened
   from `file://`. No bundler, no framework, no TypeScript, no transpile, no CDN. The
   two libraries in `node_modules` (`three` and `pixi.js`) are loaded by path from a
   world's `index.html`; Jerry's Pool keeps its own preserved PixiJS bundle. Everything
   else is Canvas 2D, WebGL (raw or through three.js), Web Audio, DOM/CSS, and SVG.
2. **Who it runs on.** James's machine is a high-spec gaming laptop with a big external
   screen (2560 wide); Chrome. That laptop is the one frame-rate gate — if it drops
   frames there, it's too heavy, and there is no lower target to design for. His CSS
   viewport for panels is roughly 1080–1440 tall; measure layout in an iframe harness
   rather than eyeballing it.
3. **Performance is a design constraint, not a polish step.** Heavy worlds keep a
   budget (overdraw caps, resolution caps, LOD, baked lookups instead of per-fragment
   math) and the world's `CLAUDE.md` records it. If you add cost, say what it costs.
   Camera motion is restrained by house rule: wide defaults, slow easing, halve any
   screen shake you think is right — motion sickness has sent worlds back to the shop.
4. **Verification is by simulation, then by his eyes.** Anything with logic gets a
   pure-Node sim under `tmp/<slug>/` (`sim.mjs`, assertions, seeded randomness) that
   exercises the core without a browser; shaders get a compile check where one exists.
   Look work is developed in a standalone silent harness page first
   (`tmp/<slug>/*-lab.html` or a lab under `src/labs/`), then moved into the world.
   Keep the harness; the docs mark them KEEP. Existing sims are the regression suite —
   run the ones for the world you touched before you say done.
5. **Shared core, `src/core/`:** `dashboard-control.js` (the top-right icon back to the
   admin panel, required on every page), `sound-control.js` (the one speaker button and
   volume, required for any sound), `drift.js` + `world-registry.js` (random exits),
   `curator.js` (in-world art curation for gallery worlds, loaded on `?curate=1`),
   `face-life.js` (character face behavior). `scripts/text-size.js` is the shared
   text-size stepper for panels. Extend these when a world needs more; never fork them
   into a world.
6. **The configuration panel** is the house pattern for tuning a world by eye: a panel
   of sliders and pickers the world reads live, with file-backed presets saved through
   the server (`/api/worlds/<slug>/presets`), a click-away dismiss, and a dice that
   randomizes. `src/worlds/chrome-rift/` is the reference implementation. James tunes
   in roughly ten-percent steps and asks for numbers: when you change a feel, tell him
   the new value, the old one, the range, and which slider.
7. **Labs** (`src/labs/`: being-editor, face-lab, material-lab, sphere-lab) are admin-only
   tool pages, not worlds; they don't need exits or registry entries. They are listed
   on the admin panel under Labs.

## The paper trail — where things are written down

The project's memory is files, not conversations. A new session (yours or anyone's)
should be able to pick up any world from these alone, and it is your job to leave them
that way when you finish.

1. **`CLAUDE.md` (repo root) — `## Todo`.** One numbered entry per active thread, in
   James's and Claude's words, updated at the end of every session: what was built, what
   he said about it, what is awaiting his eyes, what comes next. This is how sessions
   hand off. Read the entry for your world before you start; update it before you stop
   (mark done, add new items, remove resolved ones). Do not rewrite other entries.
2. **`src/worlds/<slug>/CLAUDE.md`** — the world's own rules and usually a START HERE
   block at the top naming the open items. Read it first, keep it current.
3. **`src/worlds/<slug>/changelog.md`** — dated, newest first, signed. Every session
   that changes the world appends an entry: what changed, what he said, where it stands.
   Never edit or delete old entries. This is what the nightly wrap reads to decide
   whether uncommitted work is documented.
4. **`CHANGELOG.md` (repo root)** — one short dated entry per session at project level;
   the ops dashboard reads it. The per-world changelog is the detailed record.
5. **`World Ideas.md`** — the shared idea backlog, globally numbered so any pitch is
   "idea #N", with a section per contributor and a status on each (idea / selected /
   built / shipped). Update the status when a world is picked, built, or shipped; add
   new pitches there rather than re-pitching in chat.
6. **`world-drafts.json`** — James's own drafts written in the admin panel's world
   editor (title, synopsis, vibe, references, sound notes). Read via `GET /api/drafts`;
   never hand-edit the shape. A draft marked `engaged` has a Todo line and is a
   conversation to have, not a build to start. Always safe to commit.
7. **`docs/`** — `building-a-world.md` (the contract), `character-pipeline.md`,
   `architecture.md`, `admin.md`, `site-registry-plan.md`, `contributions.md`,
   `manifesto.md`, plus Jerry's Pool's `current-index.md` and
   `denizen-frequency-rubric.md`. `session handoff.md` at the root is retired and only
   points here.
8. **`archive/`** — retired worlds, kept whole (Combat, The Valence Lab, Coach 9, and
   others). Listed on the admin panel's archived tab via `GET /api/archive`. Nothing in
   there is in the drift. Never revive or delete one on your own.
9. **`tmp/`** — gitignored, per-world scratch: `.blend` files, build scripts, renders,
   sims, look-dev harnesses, snapshot output. Much of it is irreplaceable working
   material that lives only on this machine. Add freely under `tmp/<slug>/`; delete
   nothing.
10. **The admin panel** (`index.html` at the root, served at `http://127.0.0.1:4174/`)
    is James's home base: server light, the worlds list (In progress / Completed), the
    world editor with drafts, the archived tab, and Labs. The server behind it exposes
    `/healthz`, `/api/worlds`, `/api/worlds/tree`, `/api/drafts`, `/api/archive`,
    `/api/dev-snapshot` (a page POSTs a canvas, it lands in `tmp/snapshots/` — the way
    to capture a render headlessly), and per-world preset routes. `welcome.html` is the
    public front door and becomes the public site's index at publish time.

## The rules that get broken most

1. **Propose before you build.** Worlds are co-built with James. Present a plan and
   wait for his explicit go — even if your instructions said "make me X." Never ship a
   world unprompted. (This has happened here once; the world was deleted.)
2. **Everything lives in `src/worlds/<slug>/`.** Never create new top-level
   directories, deploy scaffolding, hosting configs, or per-world build pipelines.
   `tmp/` is gitignored scratch, but many folders in it are labs and harnesses marked
   KEEP in the docs — never delete anything under `tmp/`.
3. **Every page loads `src/core/dashboard-control.js`.** Every audible world routes
   sound through `src/core/sound-control.js` via `ElasticSoundControl.attach(...)` —
   loading the script is not enough, and per-world audio toggles are forbidden.
4. **At least three diegetic drift exits** (`data-drift` links with generic labels,
   never naming a destination), with `world-registry.js` + `drift.js` loaded.
5. **`npm run registry` only at ship time, on James's word.** Never hand-edit the
   generated `src/core/world-registry.js`. Known gotcha: the generator currently
   includes unshipped draft worlds, and drafts must stay out of the live drift pool.
   After regenerating, read the diff; if draft worlds appeared, discard the regenerated
   file and tell James instead of committing it.
6. **Add the world to the admin panel** (repo-root `index.html`, James calls it the
   "admin panel" or "admin page"). The worlds list has two sections, "In progress
   worlds" and "Completed worlds", each alphabetized ignoring a leading "The". New
   worlds go under In progress with the `unwired` page-note; only James removes that
   note. Update `World Ideas.md` too.
7. **Keep a `changelog.md` entry** for every meaningful session, newest first, signed
   with your agent name, and give the world a `CLAUDE.md` (starters in
   `src/worlds/_template/`).
8. **Verify with `npm run check-worlds`** before declaring anything done. The audit
   currently reports errors for worlds that are drafts on purpose (not in the registry,
   no exits) — only the lines for the world you touched are yours to clear.
9. **Anything that spends money or credits needs James's yes first.** Meshy generations
   and ElevenLabs calls both cost; state the cost and wait. API keys live in the
   gitignored `.env`; never reference them from world code, which is client-side and
   public.
10. **The in-world tuner is the "configuration panel"** — never "GOD MODE" or "tuner
    panel" in copy or docs. Presets are file-backed per world.

## Working alongside other agents (read this before touching git)

Several Claude Code sessions are usually live in this repo at the same time as you,
each mid-work in a different world. Their uncommitted files sit in the working tree
next to yours. The whole end-of-night system depends on every agent following this:

1. **A modified file you did not touch belongs to another session.** Never stage it,
   revert it, stash it, `checkout --` it, `restore` it, `clean` it, or "tidy" it. Do not
   mention it, analyze it, or guess whose it is. Leave it exactly as it is.
2. **Stage by explicit path only.** Never `git add -A`, `git add .`, or `git commit -a`.
   Reconstruct the list of files you touched from your own session and stage those.
3. **Take the wrap lock before staging.** Create `.git/wrap.lock` containing your agent
   name and world (atomic — fail if it already exists). If it exists, another session is
   mid-commit: wait ~20 seconds and retry, up to 5 minutes. A lock older than 10 minutes
   is stale from a dead session: say so, then remove it. Delete your lock right after
   your commit. The staging index is shared; interleaved staging is how commits get mixed.
4. **Commit your own work before your session ends, every session**, with the world's
   `changelog.md` entry written in the same session. The nightly wrap-up only commits
   leftover work whose changelog explains it; anything undocumented gets flagged to
   James as a problem instead.
5. **Identify yourself** in the changelog entry and the commit message (for example a
   trailer line `Agent: Codex`), so the nightly pass can tell whose work is whose.
6. **If a file you are editing changes under you** (an edit fails because the text
   moved), stop, diff, and re-read before editing again — the tree changed.
7. **Do not run or imitate any wrap-up ritual.** `/wrapitup` and `/wrapitup-global` are
   Claude-side skills James triggers himself; the global one is the single pusher for
   every repo. Your equivalent is items 3–5 above and a short report.

## Git: commit, never push

1. Commit locally in commits under 30MB each; split heavy asset drops so no commit
   exceeds that. **Never push** — not even if your tool configuration lets you push
   without asking. James's global wrap-up process is the single pusher.
2. Never `reset`, `amend`, `rebase`, or force-anything on a shared branch. If the
   branch tip moves unexpectedly mid-session, that is another session committing —
   commit on top and carry on; stop and report only if your own commit is missing.
3. Never commit secrets. `.env` is gitignored; world code is client-side and public.
   `world-drafts.json` changes are always safe to commit.

## Local preview

Run `start-elastic-space.cmd` (double-click) — it starts the dev server on port 4174
(always 4174) and opens the admin panel at `http://127.0.0.1:4174/`. Health check:
`/healthz`. Worlds must still degrade gracefully under `file://` (no `fetch()` for
assets).

**Never leave a world open in a browser tab or preview pane when you finish a turn.**
Almost every world plays sound from load, a hidden tab keeps playing, and James ends up
hunting for it. Look, verify, close.

## Shared tools you may use once James agrees

None of these is carte blanche. Each spends money, credits, or a shared machine, so the
pattern is always the same: say what you want to make, name the tool and the cost, and
wait for his yes. Once he agrees, everything below is yours to run.

**Secrets:** every API key lives in one file, `C:\Users\brook\ai-projects\elastic-space\.env`
(gitignored, `KEY=value` lines). Read it from Node with `process.env` after loading it, or
open it and copy the value into your shell for one command. Keys present:
`ELEVENLABS_API_KEY`, `MESHY_API_KEY`, `KEENTOOLS_API_KEY`. That file is the ONLY
place a key value lives. Never copy a value into your own tool config, an MCP server
entry, a rules file, a script, or a second .env; read it from the file at run time. Never
print a key into a reply, a commit, a changelog, or any file under `src/`. World code is client-side and
public; assets are generated at authoring time and committed as plain files.

### 1. ElevenLabs — SFX, voices, speech, ambience, short music cues

1. What it is: hosted audio generation, REST API at `https://api.elevenlabs.io/v1`
   (docs: `https://elevenlabs.io/docs`). James's account; no local install needed.
2. How you connect: the repo's own CLI, `tools/eleven.mjs`, which reads
   `ELEVENLABS_API_KEY` from `.env`. Run from the repo root:
   ```
   node tools/eleven.mjs voices [search]                      list voices (id + name)
   node tools/eleven.mjs sfx "prompt" out.mp3 [--seconds N]   sound effect
   node tools/eleven.mjs tts "text" out.mp3 --voice <id or name> [--model <id>] [--stability N]
   node tools/eleven.mjs music "prompt" out.mp3 [--ms N]      experimental
   node tools/eleven.mjs stt in.mp3 [--words]                 transcription (--words = timestamps)
   ```
3. Where output goes: `src/worlds/<slug>/assets/audio/`. Commit only the audio files.
4. Scope: one-shots, voice lines, ambience beds, stingers. Continuous or parametric
   sound (pitch glides, physics-driven audio, engine hums that track speed) is Web Audio
   synthesis in world code, never samples.
5. Cost: character/second quota on James's plan. State roughly what you intend to
   generate (how many clips, how long) before running a batch.
6. Never call the API from world code and never reference the key from anything under
   `src/`. Playback goes through the shared sound control like any other audio.
7. Related local tools, no keys needed: `tools/radio-bake.mjs` (squash an MP3 into an
   AM-radio version; no ffmpeg on this machine, pure JS), `tools/lipsync-bake.mjs`
   (Rhubarb viseme timelines for voice clips; the Rhubarb binary is downloaded into
   `tools/rhubarb/`, gitignored — the script prints fetch instructions if missing),
   `tools/gif-analyze.mjs` (frame/delay dump of a GIF).

### 2. Meshy — 3-D models, rigging, animation, texture tiles, images

1. What it is: `https://www.meshy.ai` — text/image → 3-D mesh, retexture, remesh, rig,
   animate, and text-to-image (used here mostly for seamless texture tiles and planet
   maps). James has a Premium account with credits and premade object libraries; log-in
   is his, on the website.
2. How you connect, three routes:
   1. **MCP server** (what Claude Code uses; registered there at user scope). It is the
      npm package `@meshy-ai/meshy-mcp-server`, launched as
      `cmd /c npx -y @meshy-ai/meshy-mcp-server` with `MESHY_API_KEY` in its
      environment. If your tool supports MCP, ask James before adding it to your own
      config; the key value comes from `.env`. Tools it exposes: text_to_3d (+refine),
      image_to_3d / multi_image_to_3d, retexture, remesh, rig, animate, text_to_image,
      image_to_image, list_tasks, get_task_status, download_model, check_balance.
   2. **REST API** directly: `https://api.meshy.ai` with header
      `Authorization: Bearer $MESHY_API_KEY` (docs: `https://docs.meshy.ai`). Poll the
      task, then download the GLB/FBX/textures.
   3. **The canvas handoff** (works with no tooling at all): you write a prompt package
      (prompt, negative prompt, style, target size and use), James runs it on the Meshy
      canvas, you pull the result from his library via the API's list-tasks or he saves
      the download into the world's `assets/`.
3. Cost, per call, in credits — state it and wait for his yes every time:
   text_to_3d 5–20 (meshy-5 is 5, meshy-6/latest 20) · refine 10 · image_to_3d 5–35
   depending on model and texture stage · retexture 10 · remesh 5 · rig 5 · animate 3 ·
   text_to_image 3–9 (nano-banana 3, nano-banana-pro 9, gpt-image 9–12). Check the
   balance first when you can.
4. Where output goes: `src/worlds/<slug>/assets/` (models, textures, tiles). Verify the
   GLB by rendering it (headless Blender, below) before wiring it in; check scale against
   the viewing distance.
5. House rules: check his libraries before modeling anything by hand; seamless texture
   tiles are the standard look multiplier and bare untextured geometry never ships; the
   rigger is humanoid-only (tails, wings, quadrupeds fail — use a posed statue plus
   procedural motion); no words in concept images; Meshy duplicates the texture atlas as
   `emissiveMap`, so when you swap a texture swap both maps.

### 3. Suno — full music tracks

1. What it is: `https://suno.com`, song generation. James's account, browser-only, no
   API, no CLI. He authors and curates tracks by ear.
2. How you connect: you don't. He drops finished MP3s into
   `src/worlds/<slug>/assets/audio/` (some worlds use `assets/sound-tracks/`) and tells
   you. You wire them: a playlist array in the world's JS, playback through the shared
   sound control, and the track name in the changelog.
3. What you may do: draft a Suno prompt or lyrics when he asks. Prompt craft that
   works there: state "no vocals" three different ways if instrumental, translate
   artist references into production terms (tempo, instruments, texture), blunt
   declaratives.

### 4. Blender 5.1 — geometry, renders, GLB export, plates

1. What it is: `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`. Add-ons
   installed: MPFB2 (human generator), Faceit, Auto-Rig Pro, Reallusion CC/iC Tools,
   EyeForge, and the Blender Lab MCP add-on. Zips are kept at
   `C:\Users\brook\ai-projects\_blender-add-ons\`.
2. **Headless is the default** and needs no permission beyond the task itself. Each run
   is a private process:
   ```
   & "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background <file.blend> --python <script.py>
   ```
   Each world keeps its .blend, build scripts, and renders under `tmp/<slug>/` (gitignored;
   the pattern is `tmp/<slug>/build.py` + `tmp/<slug>/renders/`). Export GLB into the
   world's `assets/`. Do not delete anything already under `tmp/`.
3. **The live Blender window is shared** by every agent session on this machine. Never
   open, switch, or create files in it, and never rely on `is_dirty` as a guard, without
   James's explicit go. Reserve it for work that needs the UI: viewport captures,
   MPFB2 workflows, interactive tweaks with him watching.
4. Live-window access, if he grants it: the Blender Lab MCP add-on auto-starts a server
   on `localhost:9876` whenever Blender is open. The MCP client is
   `C:\Users\brook\AppData\Roaming\Python\Python314\Scripts\blender-mcp.exe` (stdio, no
   key; source `https://projects.blender.org/lab/blender_mcp`). Claude Code has it
   registered as server `blender`; ask before adding it to your own config. Cautions:
   it executes arbitrary Python in the live session, so use throwaway .blend files; add
   only, never destroy his scene state; save after every call.
5. Local reference docs for `bpy`: the MCP package bundles the API and manual as RST
   under its `data/api/` and `data/manual/` folders; grep them rather than guessing
   operator signatures.

### 5. Character work — Reallusion, KeenTools, Mixamo, Rhubarb

1. The recipe is `docs/character-pipeline.md`. Read all of it before touching a
   character; it holds the proven order (Meshy pieces → Reallusion CC5 wrap → FBX →
   headless Blender bake → GLB) and the dead ends.
2. Reallusion Character Creator 5, iClone 8, Headshot 3, AccuPOSE: desktop GUI apps,
   James drives them himself. You coach from screenshots; you do not automate them.
3. KeenTools Cloud (photos → rigged head): `tools/keentools.mjs`, key
   `KEENTOOLS_API_KEY` in `.env`, docs `https://cloud.keentools.io/docs`.
   ```
   node tools/keentools.mjs build <out-dir> <focal-mm> <photo1> [photo2 ...]
   node tools/keentools.mjs status <avatar-id>
   node tools/keentools.mjs fetch <avatar-id> <out-dir>     BILLED once per call — ask first
   ```
4. Mixamo (`https://www.mixamo.com`, free with an Adobe ID) for body rigs and clips;
   James uploads and downloads there himself. Retargeting onto CC rigs is done in
   headless Blender with Auto-Rig Pro and an explicit bone map (auto-map is garbage on
   CC rigs).

### 6. Unity (pilot only, not a world)

Unity 6.5 project at `C:\Users\brook\ai-projects\_unity\es-characters` (own repo, own
CLAUDE.md — read it first). Claude Code reaches it through an MCP relay at
`C:\Users\brook\.unity\relay\relay_win.exe --mcp`, which needs the editor open. Nothing
in Elastic Space ships through Unity yet; treat it as read-only context unless James
opens it.

## Talking to James

1. Short, direct answers. Numbered lists for questions, options, and todo items — never
   bullets. Absolute `C:\` paths when naming files.
2. After a discrete step, stop and let him react. Do not chain into adjacent work
   (refactors, extra tooling, "while I'm here" fixes) uninvited.
