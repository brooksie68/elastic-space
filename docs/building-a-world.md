# Building a World — the contract

This is the canonical, complete recipe for adding a world to Elastic Space, written for
any coding agent (Claude, Codex, Gemini, anyone) and for humans. `README.md` is the
creative compass — read it first for the spirit of the place. This file is the mechanics.
If this file and any other doc disagree, this file wins; fix the other doc.

James Brooks owns this project. Worlds are co-built with him: **propose before you
build.** If you were asked to "make a world," your first deliverable is a short plan
(concept, files, assets, sound, exits) and you wait for an explicit go. Never ship a
world unprompted, and never "improve" other worlds as a side effect.

## 1. Where a world lives

Everything goes in one self-contained folder:

```
src/worlds/<slug>/
  index.html      entry page (required)
  world.js        world code (convention; small worlds may inline)
  world.css       world styles (convention)
  world.json      manifest (required — see §3)
  changelog.md    work log (required — see §4)
  CLAUDE.md       per-world agent instructions (required — see §5)
  assets/         everything the world loads: images, audio, models, layout.js
```

Starters for `CLAUDE.md`, `changelog.md`, `world.json`, and a wired `index.html` live in
`src/worlds/_template/`.

Hard rules:

1. No files outside the world folder except the integration points listed in §8.
2. **Never create new top-level directories** (no `sites/`, no deploy scaffolding, no
   per-world `package.json`, no build pipelines, no hosting metadata). This is a static
   site served locally by `server.mjs`; publishing is James's concern, not yours.
3. Keep assets inside the world folder unless they are intentionally shared in
   `src/core/` or repo `assets/`.
4. Do not edit unrelated worlds, and do not normalize another contributor's work to
   your taste.

## 2. Required page wiring

Every world's `index.html` loads the shared core scripts with relative paths, in this
order, before its own script:

```html
<script src="../../core/world-registry.js"></script>  <!-- if the world has drift exits -->
<script src="../../core/drift.js"></script>            <!-- if the world has drift exits -->
<script src="../../core/dashboard-control.js"></script><!-- ALWAYS, no exceptions -->
<script src="../../core/sound-control.js"></script>    <!-- if the world has any sound -->
<script src="./world.js"></script>
```

1. `dashboard-control.js` renders the top-right dashboard icon linking back to the
   admin panel. Every page gets it. (Repo-root pages pass
   `data-home="./index.html"` on the script tag; worlds at normal depth need nothing.)
2. `sound-control.js` renders the standard speaker button. If your world makes any
   sound, you MUST route it through this control — see §6. Loading the script without
   calling `ElasticSoundControl.attach(...)` does nothing; attach is mandatory.
3. Worlds must degrade gracefully under `file://`: never rely on `fetch()` for assets
   (blocked on `file://`) — use media elements, inline data, or synthesis. Drift
   carries its session state in the query string for this reason.

## 3. world.json

Minimum viable manifest (this is what the admin editor reads):

```json
{
  "slug": "<slug>",
  "title": "<Display Title>",
  "status": "live",
  "summary": "One or two sentences about what this world is."
}
```

`slug` must equal the folder name. `status` is `draft` until the world ships, then
`live`. Richer metadata (creators, tags, moods, warnings, soundtrack notes) is welcome —
see `src/worlds/chrome-rift/world.json` for a fuller example — but do not invent
machinery that reads fields nothing reads.

## 4. changelog.md

Every session that meaningfully changes a world appends an entry: date, author (name
your agent/model), what changed, and where things stand or what comes next. Newest
entries first. Never rewrite or delete earlier entries.

## 5. Per-world CLAUDE.md

Each world carries a `CLAUDE.md` (starter in `_template/`) holding that world's own
rules: rendering constraints, physics, timing, protected behaviors, in-progress work.
The name is historical — **it applies to every agent, not just Claude.** Before working
on an existing world, read its `CLAUDE.md` first. When you ship a world, write one.

## 6. Sound

All audible worlds use the shared control — never build a per-world audio toggle or an
autoplay hack.

1. Audio element: `ElasticSoundControl.attach({ media: audioElement })`.
2. Web Audio synthesis: `ElasticSoundControl.attach({ start, stop, setVolume })`.
3. Extra volume channels (e.g. music vs SFX):
   `attach({ ..., channels: [{ label, value, setVolume }] })`.

The control makes one autoplay attempt and otherwise waits for the button. If it can't
express what your world needs, the fix is extending `src/core/sound-control.js` (ask
James), not working around it.

Sourcing: ElevenLabs (`node tools/eleven.mjs`) is an authoring-time pipeline for SFX,
voices, and ambience — generate locally, commit only the audio files, never call the API
from world code. Full music tracks come from James via Suno (he authors them manually;
you wire the MP3s). Continuous or parametric sound is Web Audio synthesis.

## 7. Exits and drift

Movement between worlds is random drift by default. The rules:

1. Exits are diegetic scene elements — an object, creature, sound, word, or gesture
   that belongs to the world. Never a literal labeled link, button, or nav control.
2. A world generally offers **at least three** drift choices. Hidden bonus exits beyond
   those are welcome. Finding a way onward must never be a hard puzzle — exits
   encourage exploration, never thwart it.
3. The recipe for each drift exit:
   `<a data-drift href="../../../index.html" aria-label="Drift somewhere else">…</a>`
   — generic accessible label, never naming or choosing the destination.
4. Load `world-registry.js` then `drift.js` (§2). Drift avoids worlds already seen this
   cycle; do not build separate destination memory inside a world.
5. Direct links (no `data-drift`) are allowed only for deliberately fixed routes, such
   as an authored sequence. The root `index.html` is an intentional named directory.

## 8. Integration points outside the world folder

These are the only edits a new world makes elsewhere, and all of them are required:

1. **Registry:** run `npm run registry` after adding, removing, or renaming a world.
   Never hand-edit `src/core/world-registry.js` — it is generated.
2. **Admin panel:** add a direct link to the world in the Pages list of the repo-root
   `index.html` (the Elastic Space admin panel). Gallery worlds also get a "curate"
   pill in their row (`.page-row` with a `.curate-link` pointing at the world with
   `?curate=1` — see the Mandala Shop row for the markup).
3. **World Ideas.md** (repo root): update the idea's status when a world is selected,
   built, or shipped.
4. **Todo list:** if the world came from an engaged draft in `world-drafts.json`,
   remove its line from the Todo section of the repo-root `CLAUDE.md` and mark the
   draft's status `built`.

## 9. Extras worth knowing

1. **Control panels:** James likes in-world tuner panels — a small toggle button
   opening a bottom panel of sliders, persisted to localStorage. Chrome Rift
   (`src/worlds/chrome-rift/`) is the reference implementation. Offer one when a world
   has tunable qualities.
2. **Curator mode:** gallery worlds (worlds that hang swappable art) load
   `src/core/curator.js` via dynamic import when `?curate=1` is present and the page is
   served. Mandala Shop's `world.js` is the reference adapter. Layout files
   (`assets/layout.js`) are curator-owned once a world ships — never hand-edit slot
   data casually.
3. **Motion restraint:** cameras default wide with slow easing; James gets literal
   motion sickness. Halve any screen shake you think is right.
4. **Accessibility** and basic browser safety matter even when orientation is
   intentionally unstable.

## 10. Git rules (all agents, non-negotiable)

1. Commit locally. **Never push.** Pushing is done by James's global wrap-up process.
2. Keep each commit under 30MB; split large asset drops across commits.
3. Never `reset`, `amend`, `rebase`, or force-anything on a shared branch. If the
   branch tip moves unexpectedly, stop and report.
4. Never commit secrets; `.env` at the repo root is gitignored and stays that way.
   World code is client-side — anything it loads is public.

## 11. Ship checklist

Before calling a world done, verify every line — then run `npm run check-worlds`, which
mechanically audits most of this list for every world:

1. Folder complete: `index.html`, `world.json` (slug matches folder), `changelog.md`,
   `CLAUDE.md`, assets inside the folder.
2. `dashboard-control.js` loaded; sound (if any) attached through
   `ElasticSoundControl`; no `fetch()` for assets.
3. At least three diegetic `data-drift` exits; `world-registry.js` + `drift.js` loaded.
4. `npm run registry` run; generated registry not hand-edited.
5. Admin panel Pages entry added (plus curate pill for gallery worlds).
6. `World Ideas.md` status updated; changelog entry written.
7. No new top-level files or directories; no unrelated worlds touched.
8. `npm run check-worlds` passes with no errors for your world.
9. Work committed locally in ≤30MB commits; nothing pushed.

## 12. Reviewing someone else's world

If you arrive and a new world exists, audit it against §11 and run
`npm run check-worlds`. Read its `changelog.md` and `world.json` to learn who built it
and why. Report violations; fix them only with James's go-ahead.
