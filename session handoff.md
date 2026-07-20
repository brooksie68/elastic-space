# Session Handoff

This file used to carry a snapshot of project state; it went stale and has been retired
(2026-07-18). The living sources are:

1. `AGENTS.md` — entry point for any coding agent (read order, hard rules, git rules).
2. `README.md` — creative compass.
3. `docs/building-a-world.md` — the canonical world-building contract and ship checklist.
4. `CLAUDE.md` — Claude-specific operational rules and the current Todo list.
5. `src/worlds/<slug>/CLAUDE.md` + `changelog.md` — per-world state and history.

Run `start-elastic-space.cmd` to serve on port 4174; `npm run check-worlds` to audit
every world against the contract.
