# The Big Dimension — expansion spec (phase spec, recorded 2026-07-23)

James's settled numbers from the 2026-07-23 riffing session. This is SPEC, not a build
plan — the build plan still gets drafted, discussed, and needs James's explicit go
before any code changes (CLAUDE.md Todo #0 discipline: DISCUSS → PLAN → go → build).

## Space

- 1,000 × 1,000 × 250 km (current: 48 × 48 × 12).
- Populations in clumps; emptiness between them is the terrain, deliberately.
- 5–6 stargates for convenient long hops. Placement leaning "at the major clumps"
  (Korrudan core gets one) but not settled. Rule inherited from World Ideas #57:
  "every gate has a road" — flying it must always be a valid alternative.
- Fuel depots on a guaranteed-find grid: nothing in the flyable volume farther than
  ~50 km from fuel (default, tunable), denser along gate-to-gate roads, sparser in
  the wilds, never absent. Worst-case dry-tank limp at impulse ≈ 3.5 min.

## Speed ladder (flat, NOT additive — max(impulse, thrust), never the sum)

| Mode      | Top speed  | Tank  | Range    | 0 → full | Fuel |
|-----------|-----------|-------|----------|----------|------|
| Impulse   | 240 m/s   | —     | infinite | (coast rules as today) | free |
| Booster   | 1,200 m/s | 240 s | 288 km   | 5 s      | H2O |
| Overdrive | 3,600 m/s | 360 s | 1,296 km | 3 s      | deuterium |

(Current build: 120 / 400 / 1,200 additive, tanks 180 s / 120 s — untouched until go.)

- Steps are 5× then 3×; each tier is a different animal. Today's overdrive speed is
  tomorrow's booster, so current 1,200 m/s fog/dust/parallax tuning transfers to the
  mid tier; only 3,600 needs new speed-reading work.
- Overdrive SLAMS (3 s, τ≈0.8, pairs with odThump), booster BUILDS (5 s, τ≈1.2 —
  current envelope shape, 3× the pull). Inertial dampeners are canonically excellent.
- Crossing times: 1,000 km = 4 min 38 s overdrive (278 s of a 360 s tank — lands with
  ~23% reserve); ~14 min booster (4 H2O tanks, depot-dependent); ~70 min impulse.
- Diagonal ≈ 1,436 km > 1,296 km range: the longest journeys are the only ones that
  FORCE a depot stop. Routine crossings are self-sufficient. Deliberate gradient.
- Refills stay flyover-to-full (generous-fuel contract survives; scale changed, not
  kindness). Depot catch at speed is an open item: 150 m flyover is a 40 ms window at
  3,600 m/s — leaning "nav lock-on + autopilot works on depots," alt: speed-scaled
  catch bubble (~2 km at overdrive).

## Engineering items (Claude owns, no James input needed beyond taste passes)

1. Camera-relative rendering — MANDATORY at this scale: float32 GPU positions jitter
   (~6 cm ulp) at 500 km from origin. Sim stays JS doubles; renderer refactor.
2. Depth/far-plane strategy — far plane does NOT scale with the map: distant things
   are smudges the NAV knows about (#57 loop); fog/fade retune.
3. Camera-local recycled dust (parallax speed reading at 3,600 m/s).
4. Clumped population seeding replacing uniform scatter; depot grid keeps the
   stationGeometry stratified-jittered-grid + sim-assert discipline.

## GOD MODE — tuner controls running tally (James's list, keep appending)

New tuner group(s) for the expansion. Same discipline as existing groups (cfg-backed,
localStorage presets, sliders) — but these are the play-with-the-universe knobs.
Started 2026-07-23; James will keep adding as he explores.

1. Top speed — per mode (impulse / booster / overdrive). Key one.
2. Tank length — per tank (H2O / deuterium), in seconds of burn. Key one.
3. Spool time — 0-to-full per mode (booster 5 s / overdrive 3 s defaults).
4. (Claude seeds, unconfirmed: depot catch radius, depot grid spacing, dust density
   at speed, fog/fade distances — strike any James doesn't want.)

CONSTRAINT (James, 2026-07-23): GOD MODE is not everything. Overall space size and the
locations of key points of interest (skull, colonies, gates, the Lantern, …) will at
some point FINALIZE and become immutable — same discipline as v38's "the space is
static" rule (sanitizeCfg() force-restores SPACE_X/Z/Y today). They may ride sliders
during the build/tuning phase, but they graduate to constants and come OFF the panel.
GOD MODE's permanent residents are the physics/feel knobs (speeds, tanks, spools, …),
not the geography.

## Open questions (for the plan discussion)

1. Gate placement final call (at clumps vs between; how many exactly).
2. Does the current 48×48×12 core (Korrudan + reef colonies + station grid +
   Vess-Karai) move intact as the capital clump?
3. Clump count and character — all reef-grade, or some grown toward Jerry's-Pool
   density (the #57 stargate-community idea)?
4. Depot catch mechanism (lock-on vs catch bubble).
5. Overdrive HUD/audio at 3,600 — what does that much speed look and sound like.
