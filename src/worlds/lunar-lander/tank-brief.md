# Battle for the Moon 2075 — the TANK side. Brief for the tank session.

You are the second Claude session on one game. James is building **Battle for
the Moon 2075** in `src/worlds/lunar-lander/`. Another session (call it the
LANDER session) owns the flying half and is building weapons, hostiles and
structures onto it right now. You own the TANK half: the part where the pilot
climbs out of the lander and fights on the ground in a lunar tank. James will
tell you how the tank game works — this brief does not presume any of that. It
tells you what exists, how it is built, what it must look like, and how the
two of you work in the same repo at the same time without wrecking each
other's work.

Read this whole file before you say anything. Then read, in this order:

1. `src/worlds/lunar-lander/CLAUDE.md` — the world's rules. The top section
   "WHERE THIS IS GOING" is the shared plan, "Round one design" is what the
   lander session is building, "THE DIRECTION" governs the look. Read all of
   it; do not edit it.
2. `src/worlds/lunar-lander/changelog.md` — newest first; the last two days
   explain the state of things. Do not edit it.
3. `src/worlds/lunar-lander/render3d.js` — the renderer. This is the look.
4. `src/worlds/lunar-lander/game-core.js` — the pure core: the endless chunked
   moon you will drive on.
5. `src/worlds/lunar-lander/game.js` + `index.html` — the shell and the
   console; the instrument style you will match.
6. `AGENTS.md` at the repo root, sections "Git" — the commit protocol. Binding.
7. `docs/building-a-world.md` — the world contract (you will not be shipping a
   world, but the rules on sound, drift and file layout apply).

Then look at it: start the server (`.claude/launch.json`, port 4174, always)
and open `http://127.0.0.1:4174/src/worlds/lunar-lander/index.html`. **The
page has sound — do not load it in the preview pane.** The silent copy is
`tmp/lunar-lander/smoke.html` (`node tmp/lunar-lander/make-smoke.mjs` rebuilds
it), and `tmp/lunar-lander/lookdev.html` is the silent look-dev harness. Fly it
in the smoke page for a minute before you plan anything: land on a pad, launch
through the ring, watch the zoom.

## What the game is

Lunar Lander (Atari 1979) taken to 2026: an endless moon in 4,000 ft chunks
hashed from the seed, pads worth 2X–5X, fuel as the currency, landings graded
by speed / drift / tilt, a ring accelerator that launches you after every
landing, landing tech earned on clean landings. James's standing word: **this
is NOT a faithful recreation of the 1979 game.** It shipped 2026-09-04. Today
(2026-09-06) James turned it into Level 1 of a bigger game:

- The four 1979 difficulty selections are GONE (not yet removed from code —
  the lander session does that). Level 1 flies with the old "Cadet" feel and
  the physics never change between levels; enemies, weapons, targets and the
  moon's deals do.
- Levels climb to a boss (five levels, then the boss). The tank part opens
  after the boss. How the tank part plays is James's to tell you.
- Level 1, being built now by the lander session: ten line-drawn structures on
  the ground (radar tower, comm tower, habs, generator, solar farm, tank farm,
  dish array, drill, rover garage, observatory) plus SAM sites; a guided
  missile and a laser aimed by click; SAM fire at the lander with chaff; refills
  at pads. Targets are rated 1X–5X; civilians are never targetable.
- **"The things that you'll be dealing with in the tank, we'll see going by on
  the ground"** — his sentence that binds the two halves. The structures the
  lander flies over are the structures the tank fights among. Same moon, same
  chunk data, same drawings.

## How it is built (match this exactly)

Three files, one discipline:

- **A pure core** (`game-core.js`): no DOM, no timers, no `Math.random` —
  seeded rng only. Fixed 1/120 s step. Everything that is a rule lives here.
  It is loaded as a side-effect global (`globalThis.LunarCore`) so the same
  file runs in Node.
- **A sim** (`tmp/lunar-lander/sim.mjs`): loads the real core and asserts on
  it — 350k+ assertions, run with `node tmp/lunar-lander/sim.mjs`. Nothing
  ships without its sim green. James's rule, project-wide: verify worlds by
  simulation.
- **A renderer** (`render3d.js`, three.js, ES module) that only draws what a
  `view` object says, and **a shell** (`game.js`) that wires input, the
  console, sound and the attempt flow. The shell owns feel decisions (zoom
  hysteresis, throttle ramps); the core owns rules.

Do the same for the tank: `tank-core.js` (pure, side-effect global
`LunarTankCore`), `tmp/lunar-lander/tank-sim.mjs`, `tank-render.js`,
`tank.js`, `tank.html`. Build a look-dev harness before the game screen —
that is how every look here got judged (`lookdev.html` is the model).

## The look (this is the whole point of two sessions matching)

From the world CLAUDE.md "THE DIRECTION", which you must read in full:

1. Green-to-white single-line drawing on black. Nothing else. The line colour
   is `DEFAULT_PARAMS.hue` 0.36, saturation 0.7; brightness whitens toward the
   core (`COMP_FRAG`: "green to white, nothing else").
2. No CRT imitation. No scanlines, no barrel, no phosphor persistence, no
   flicker. "Make it look super cool for 2026" inside the one-line constraint.
3. Lines are max-blended, not additive (a dense drawing never blooms into a
   blob); the glow is tight (`glow` 0.9, the bright-pass/blur/composite chain
   in render3d.js). Line weight 1.8 px at 1080p, scaled with the viewport.
4. Depth is three parallax ground lines with BLACK FILLS under them (near,
   far, farther — `Z_NEAR` / `Z_FAR` / `Z_FARTHER`), stars behind everything.
   Fog fades the far lines to 25%.
5. Objects are DRAWINGS, not blobs: the LEM is a two-stage NASA-2036 shape
   built from segments (`buildLander`), breaks along its own strokes when it
   crashes. "Some jagginess here and there. It's a game."
6. Camera restraint: eased zoom (`CAM_TAU` 0.9 s), a few degrees of bank at
   most (`MAX_BANK` 0.05 rad), **no shake, ever** — James gets motion sick.
   Wide default, slow easing.
7. Instruments are DOM/SVG in ONE console, sized in em off one base:
   `index.html` `:root` (`--ink`, `--ink-dim`, `--ink-faint`, the sans
   stack), `.panel`, `.lbl`, `.num`, `.unit`. Copy that CSS block into
   `tank.html` verbatim so the two consoles are one family. Type up a step
   from your instinct — he asked for it twice.
8. Sound is Web Audio synthesis (`Sfx` in game.js): no samples, no music
   unless James brings a Suno track. Attach through the shared control
   (`../../core/sound-control.js`, `ElasticSoundControl.attach`), no autoplay
   hacks. Every page loads `../../core/dashboard-control.js`.

**How to get the same line renderer without touching my file:** copy
`LineBatch`, `GroundFill`, the `LINE_VERT` / `LINE_FRAG` / `QUAD_VERT` /
`BRIGHT_FRAG` / `BLUR_FRAG` / `COMP_FRAG` shaders, `DEFAULT_PARAMS` and the
post chain setup out of `render3d.js` into your `tank-render.js`, unchanged,
with a header comment saying they are a copy and the date. Keep every
constant identical. When both halves are stable the lander session will pull
the shared kit out into one `vector-kit.js` that both import — that is its
job, one commit, with a heads-up to you first. Until then, a copy.

**Structures:** the lander session is putting the ten structures + SAM sites
into the chunk data (`chunk.structures`, each with `kind`, `x`, `hostile`,
`mult`, hardening) and their line drawings into a new file
`src/worlds/lunar-lander/structures.js` — pure segment lists, no three.js —
so both renderers draw the same shapes. That file is the lander session's to
write and yours to import. Until it lands, build with placeholder shapes in
your own file and swap them out; do not author your own versions of those ten.
If you need a structure the lander does not have (a tank-only thing), it goes
in YOUR files, and you tell James so it can be added to the shared file later.

**The moon:** you can load `game-core.js` as a script (it sets
`globalThis.LunarCore`) and call `LunarCore.getChunk(state, k)` /
`groundAt` / `padsNear` on a state from `LunarCore.createGame({ seed })` to
drive on the exact ground the lander flew. Read-only. Never edit game-core.js.

## Ownership — who edits what

The two sessions share one working tree on James's machine. Files are owned,
never shared:

**Yours (create them; nobody else touches them):**
- `src/worlds/lunar-lander/tank/` — everything in it: `tank.html`,
  `tank.js`, `tank-core.js`, `tank-render.js`, your `CLAUDE.md`, your
  `changelog.md` (newest first, every session), any assets.
- `tmp/lunar-lander/tank-sim.mjs`, `tmp/lunar-lander/tank-lookdev.html`, and
  anything else you put in `tmp/lunar-lander/` with a `tank-` prefix.
- `src/worlds/lunar-lander/tank/NEEDS.md` — where you write what you need
  from the lander side (a structure, a field on the chunk, a shared constant).
  James relays, or the lander session reads it at its next start.

**The lander session's (read, never edit):**
- `game-core.js`, `game.js`, `render3d.js`, `index.html`, `world.json`,
  `structures.js` (coming), the world `CLAUDE.md` and `changelog.md`,
  `tmp/lunar-lander/sim.mjs`, `lookdev.html`, `smoke.html`, `make-smoke.mjs`.
- Repo-level: `CLAUDE.md`, `World Ideas.md`, `index.html` (the admin panel),
  `src/core/world-registry.js`. Do not run `npm run registry`. The tank is not
  a world of its own and does not get an admin row, a registry entry or drift
  exits — it is a part of Battle for the Moon, and the seam (climbing out of
  the lander into the tank, one page or two) is a decision James makes with
  both of you when both halves stand.

If you believe a shared file must change, do not change it: write the need in
`NEEDS.md` and tell James in one line.

## Git — the protocol (from AGENTS.md, plus the two-session rules)

1. **Stage by explicit path only.** `git add src/worlds/lunar-lander/tank/...`
   and your tmp files. Never `git add -A`, `git add .`, `git commit -a`.
2. **Take the wrap lock before staging:** create `.git/wrap.lock` with your
   session name; if it exists, another session is mid-commit — wait ~20 s and
   retry, up to 5 minutes; a lock older than 10 minutes is stale. Remove it
   after your commit. The index is shared; interleaved staging mixes commits.
3. **Commit locally, never push.** Pushing is the global wrap's job.
4. **Never `git checkout`, `git restore`, `git stash`, or `git reset` on the
   working tree.** The lander session has uncommitted edits in its files at
   any moment; those commands destroy them. If a commit went wrong, make a new
   commit.
5. **Commit message prefix:** `Battle for the Moon (tank): ...`. The lander
   session uses `Battle for the Moon (lander): ...`. End with the
   Co-Authored-By line your harness gives you.
6. **Commit your own work before your session ends, every session,** with
   your changelog entry written in the same session. `git status` will always
   show the other session's modified files — that is normal; leave them.
7. If the branch tip moves mid-session, that is the other session committing:
   commit on top and carry on.

## How James works (so you do not have to learn it the hard way)

- Plan first: a numbered plan and numbered questions, his go, then build.
  "Engage means discuss, never one-shot." Once he gives a go, build the whole
  round; he judges by eye, in ten-percent steps.
- Numbered lists always, never bullets, in anything you show him. Short,
  direct, no cheerleading, no exclamation points, no trailing "your call"
  flags after the answer.
- He is a fine-arts-trained UX architect and a Berklee musician; his eye and
  ear are calibrated. When he says something is off, it is — measure, fix,
  report numbers. Never defend the model.
- Never say a duration. Name the real gate (a sim run, his eyes).
- Build in the lab first, then hand over "open X, look at Y" — one artefact,
  say exactly where to look.
- Memory files under the project's memory directory are shared with the
  lander session (same project). Read `MEMORY.md` there; the entries on
  camera restraint, modernize-means-2026, verify-by-simulation, mute preview
  audio, never-checkout-uncommitted-work and the pane-drive-renderer note all
  apply to you.

## Your first message to James

Confirm you have read the files and flown the smoke page. Then ask him how
the tank game works — that is his to tell — and only after that show a plan.
Do not propose Battlezone mechanics before he has spoken.
