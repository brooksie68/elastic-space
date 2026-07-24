# The Big Dimension — expansion spec (phase spec, recorded 2026-07-23)

James's settled numbers from the 2026-07-23 riffing session.

STATUS 2026-07-23 (later that session): PHASE 1 — "the flight-feel expansion" — BUILT
as v49 with James's explicit go: space + camera-relative renderer + flat ladder +
ring colonies + doorstep fuel + camera-local dust + GOD MODE tuner. See the world
changelog. Everything NOT in that list (stargates, gulf depot grid, grown reefs, hub
society, luminous region) is still spec-only and still needs its own DISCUSS → PLAN →
go before code.

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

## Community layout (James, 2026-07-23 session 2)

- Denizen communities / hotspots lay out AROUND THE CENTER (the Korrudan core stays
  the capital at origin) as a regular polygon by count: 2 = either side, 3 = triangle,
  4 = square, 5 = pentagon, and so on. N is a parameter; the shape follows from it.
- Plus a vertical setting — communities get height placement, not just a flat ring.
- Plus distance from center — explicitly its own parameter (James): how far out the
  ring sits, independent of count and height.
- Baked-in randomization on exact location and height so it stays organic: bounded
  seeded jitter off the polygon vertices, deterministic like everything else here
  (REEF_SEED / STATION_SEED discipline — a layout seed, sim-assertable, same layout
  every visit).
- Parameters this implies (ride sliders during tuning, freeze with the geography):
  community count N, ring radius, vertical spread/offset, jitter amount, layout seed.
- Convergence note: a polygon ring around center + vertical jitter IS the galaxy-disc
  population shape from the circular-space riff — the disc emerges from the layout
  rather than needing a boundary decision.
- STARTING CONFIGURATION (James, 2026-07-23 session 2): 3 reef colonies — triangle —
  at 50% out from center (250 km radius on the 1,000 km map), in the roughly vertical
  center (mid-plane, "roughly" = the seeded height jitter does its thing). This is the
  day-one layout; more communities and the other dials come later.
- THE CORE'S IDENTITY (James): the hub of a COOPERATIVE SOCIETY of robots and beings
  of energy. (The existing pieces already lean this way: the robot fleet, Vess-Karai
  the Lantern, the glow-life — the expansion makes it explicit and builds it out.)
- THE REEFS' FATE (James): the reef colonies move OUT to the ring positions and get
  CONSIDERABLY LARGER — they become some of the primary mid-space destinations of the
  Orb Dimension. (Reading: the 3 ring colonies ARE Yth-Alune / Sorrek Bloom / Vhal-Imir,
  relocated and grown — confirm naming/identity in the plan.)

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

## Someday ideas (riffed, unsettled, not in the phase scope unless James says so)

1. THE LUMINOUS REGION (2026-07-23 session 2): somewhere in the map, a region where
   the void itself is LIT — sourceless sky-light in every direction, no gravity, no
   sun. Seen from the black as a distant glowing country; a threshold to fly into.
   Inside, local inversion: orbs go silhouette, dust reads dark, distance fades to
   glow instead of black. Reference seen and digested, NOT to be copied: the Flash
   Gordon (1980) Mongo sky (cloud tanks — latex injected at a salt/fresh water
   interface, colored gel lighting; churning liquid-light-show skies, deliberately
   anti-realist, no stars). Our version = weather with a location: bounded fog-color
   volume + slow domain-warped churn, orbs stay the stars. Possible lore hook: the
   beings of energy come from there. Keeps the cave-black as the world's default —
   this is a PLACE, not a theme.
2. Light theme as a mode (earlier riff, superseded by #1 being a place, kept for
   the record): milk-white void, orbs dark-against-bright, Korrudan bleached with
   the only red in the world. "The dimension has a day" — now folded into #1.

## Open questions (for the plan discussion)

1. Gate placement final call (at clumps vs between; how many exactly).
2. ~~Does the core move intact as the capital clump?~~ ANSWERED (session 2): the
   core stays the capital at origin and becomes the robot/energy-being cooperative
   hub; the REEFS MOVE OUT to the ring and grow considerably (see Community layout).
   To confirm: do the ring reefs keep their names (Yth-Alune / Sorrek Bloom /
   Vhal-Imir), and what exactly remains in the core (stations, Lantern, fleet?).
3. ~~Community character?~~ MOSTLY ANSWERED (session 2): the reefs become primary
   mid-space destinations, considerably larger than today. Remaining: how much
   larger in concrete terms (orb count / activity / interiors), and whether any
   reach the Jerry's-Pool density of the #57 stargate-community idea.
4. Depot catch mechanism (lock-on vs catch bubble).
5. Overdrive HUD/audio at 3,600 — what does that much speed look and sound like.
