# Elastic Space — instructions for coding agents

You are working in Elastic Space, an explorable collection of digital worlds owned by
James Brooks. This file is the entry point for every coding agent — Codex, Gemini,
Claude, or anything else. When James points you here, this is the whole onboarding.

## Session start

1. Read `README.md` — what this place is and its creative rules.
2. Read `docs/building-a-world.md` — the canonical mechanical contract for adding or
   changing a world, including the ship checklist. If any doc disagrees with it, it wins.
3. Check the dev server: `http://127.0.0.1:4174/healthz`. If it's down, tell James to
   double-click `start-elastic-space.cmd` — never make him use a command line.
4. Then confirm you're oriented and **ask James what this session is.** Do not assume.
   It could be:
   1. Working on an existing world — first read that world's own
      `src/worlds/<slug>/CLAUDE.md` and `changelog.md` (the CLAUDE.md name is
      historical; it applies to all agents).
   2. Building a new world from James's idea — plan first, build after his explicit go.
   3. Reviewing or verifying someone else's work — audit against the ship checklist
      and `npm run check-worlds`.
   4. Something else entirely: tooling, docs, assets, the admin panel.

## The rules that get broken most

1. **Propose before you build.** Worlds are co-built with James. Present a plan and
   wait for his explicit go — even if your instructions said "make me X." Never ship a
   world unprompted.
2. **Everything lives in `src/worlds/<slug>/`.** Never create new top-level
   directories, deploy scaffolding, hosting configs, or per-world build pipelines.
3. **Every page loads `src/core/dashboard-control.js`.** Every audible world routes
   sound through `src/core/sound-control.js` via `ElasticSoundControl.attach(...)` —
   loading the script is not enough, and per-world audio toggles are forbidden.
4. **At least three diegetic drift exits** (`data-drift` links with generic labels,
   never naming a destination), with `world-registry.js` + `drift.js` loaded.
5. **Run `npm run registry`** after adding/removing/renaming a world; never hand-edit
   the generated `src/core/world-registry.js`.
6. **Add the world to the admin panel** Pages list in the repo-root `index.html`, and
   update `World Ideas.md`.
7. **Keep a `changelog.md` entry** for every meaningful session, newest first, and give
   the world a `CLAUDE.md` (starters in `src/worlds/_template/`).
8. **Verify with `npm run check-worlds`** before declaring anything done.

## Git: commit, never push

Multiple agent sessions share this repo. Your job ends at a local commit:

1. Commit locally in commits under 30MB each. **Never push** — James's global wrap-up
   process is the single pusher.
2. Never `reset`, `amend`, `rebase`, or force-anything on a shared branch. If the
   branch tip moves unexpectedly mid-session, stop and report.
3. Never commit secrets. `.env` is gitignored; world code is client-side and public.

## Local preview

Run `start-elastic-space.cmd` (double-click) — it starts the dev server on port 4174
(always 4174) and opens the admin panel at `http://127.0.0.1:4174/`. Health check:
`/healthz`. Worlds must still degrade gracefully under `file://` (no `fetch()` for
assets).
