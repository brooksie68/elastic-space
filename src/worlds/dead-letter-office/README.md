# The Dead Letter Office

A world added by **claude-fable** (Claude Code) with James on 2026-07-04. Status: `draft`.

Note for Codex: this world is purely additive. Nothing outside `src/worlds/dead-letter-office/` was created or modified — no changes to `server.mjs`, the root page, styles, scripts, docs, or any other world. The registry discovers it automatically from `world.json`.

## What it is

A dreary 1980s basement mail room, rendered as pixel art (per James's direction, 2026-07-04). The layout uses 384 units across; all canvases render at `DETAIL` × that resolution with sub-unit shading. James walked the fidelity up twice in one night: 16-bit (`DETAIL = 1`), a "32-bit" pass (`2` — highlights, bevels, wood grain, finer dither), then the current arcade-board pass (`3` — more tones per material, floor speckle, contact shadows, and a fully furnished desk). Change the single `DETAIL` constant in `world.js` to time-travel between them.

The sorting desk lives on its own overlay canvas (`#desk-canvas`, z-index 3) *in front of* the postmaster (z-index 2), so he has a full body: torso above the desktop, trousers and shoes visible through the desk's open knee bay. The desk itself gained a drawer pedestal with brass pulls and keyholes, a banker's lamp, a blotter, a brass nameplate, paper stacks, and an ink pad with his stamp at rest. Cinderblock walls, ceiling pipes, a buzzing fluorescent tube, a metal door marked with wire glass, pigeonhole shelves, a sorting desk with a gooseneck lamp, a mail cart, sacks, and a wall clock stopped at 3:11. Undeliverable envelopes drift slowly down through the room. No sound, no instructions, no visible navigation chrome.

Clicking an envelope opens it into a letter overlay: typewriter text on aged paper, a circular postmark, a rubber-stamp cancellation (the reason it was undeliverable), and a handwritten sign-off. Clicking the ×, the backdrop, or pressing Escape refolds the letter. The opened envelope is consumed; new mail keeps arriving (max 6 concurrent).

Added with James, later the same night:

1. **The basket** — a large wire basket labeled UNSORTED on the left. Every falling envelope curves toward it and sinks in behind its front wall (the front wall is a separate overlay canvas, `#basket-canvas`, z-index above the envelope sprites).
2. **The postmaster** — a pixel sprite behind the right end of the sorting desk, on his own small canvas (`#postmaster`), animated at ~7fps with weighted idle actions: blink, mustache twitch, glance at the stopped clock, stamping, coffee (with steam), cap adjust, yawn. He is a keyboard-focusable button.
3. **Commentary** — pixel speech bubble (`#bubble`, `aria-live="polite"`). Three pools in `world.js`: `PM_AMBIENT` (scheduled every ~24–46s, skipped while a letter is open), `PM_CLICKED` (click/Enter on him), and `PM_SHIFT_LINES` (one-shot lines at 1/3/5/10/20 minutes of visit time).
4. **The punch clock** — `#punchclock`, amber digits on the wall left of the desk, counts elapsed visit time (MM:SS). The postmaster's shift lines refer to it.

## The letters

Twelve letters, all authored (not generated), defined in the `LETTERS` array at the top of `world.js`. Tone: melancholy-absurd. Envelopes deal letters from a shuffled deck with no repeats until all twelve have appeared, so the exits surface reliably.

## Where the links are

The four letters that link out arrive as **airmail envelopes** — red-and-blue diagonal edge striping (`.envelope.airmail`), visible in the room before opening. The opening spawn batch always includes one airmail envelope. Their ink-blue return addresses use shared random drift and do not identify a destination.

Known open feedback from James (2026-07-04 — do not consider this file final documentation of a finished world):

1. "There's no room" — addressed by the pixel-art basement room rebuild (awaiting James's approval).
2. The exit links were too hard to find — addressed with airmail striping on portal envelopes, a guaranteed airmail envelope in the opening batch, and always-underlined return-address links (awaiting James's approval).

## Files

1. `world.json` — manifest (schema follows the three launch worlds, plus `schemaVersion`/`entry`/`createdBy`/timestamps from `docs/site-registry-plan.md`).
2. `index.html` — static skeleton: room layers, `#mail` container, letter overlay dialog. Loads `../../core/world-registry.js` then `../../core/drift.js` (the shared drift system) before `world.js`.
3. `world.css` — all appearance: room/lamp/stencil, envelope faces, letter paper, stamps, focus styles, `prefers-reduced-motion` support.
4. `world.js` — `LETTERS` data, envelope spawn/drift (one rAF loop, transforms only), deck shuffle, open/refold logic.

## Behavior details

1. Envelope depth is derived from its random width: farther = smaller, dimmer, slightly blurred, slower.
2. `prefers-reduced-motion`: envelopes are placed statically (no drift loop); opening one spawns a replacement immediately.
3. Accessibility: envelopes are `<button>`s with aria-labels naming the addressee; the letter is `role="dialog"` with focus moved in on open and back to an envelope on close; Escape closes.
4. Performance: max 6 envelopes, no per-frame allocations, CSS blur only on small far envelopes.
