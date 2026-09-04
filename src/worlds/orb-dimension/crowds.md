# The Saelyri crowds — rubric (v61, 2026-09-01)

The canonical reference for how the Saelyri populate their towns. Update it whenever
a verb's share, size, spacing, clock, or the LOD/greeting numbers change. Everything
below is the ×1 default; the **configuration panel → the crowds** group scales it.
The Jerry's Pool denizen rubric is the model for this document.

James's brief (after flying B1, 2026-08-14/15): "teensy and sparse" → ~600 beings per
satellite town, ~1,000 at the capital, purposeful crowd behavior — groups doing
things, pairs, streams, tuned by feel. Design agreed 2026-09-01 (all eight recs).

## The one rule

A crowd reads from CLUSTERING, never from the count. The capital shell is ~20 km
across, its suns ~1 km, a being 10 m: 1,000 beings spread evenly on orbits sit ~80 m
apart per sun and read as nothing. Every group below is sized to its HEADCOUNT at
15–40 m spacing (crowd-lab round 1 proved it: rings sized to the sun put beings 300 m
apart and nothing read).

## Populations

| Town | Beings | In groups | Solos |
|---|---:|---:|---:|
| Tonic (capital) | 1,000 | 85% | 15% |
| Mediant / Dominant / Subdominant | 600 each | 85% | 15% |

Dials: `saeCap` (0–1,500), `saeSat` (0–900), `saeKnot` (share in groups). Solos live
on v56 private orbits (1.45–2.6 sun radii, 200–600 s per lap). Every group member
also owns a private orbit — it is where they go at low tide.

## The seven verbs

The verb mix follows the weights EXACTLY (largest-deficit deal, seeded tie-break), so
a weight change is a predictable change. `saeStream` multiplies the stream weight;
`saeGroup` multiplies every size.

| Verb | Capital weight | Satellite weight | Size | Where | Motion | Spacing |
|---|---:|---:|---:|---|---|---|
| Congregation | 0.22 | 0.28 | 12–40 | a ring whose center orbits a sun at 1.3–2.2 radii | ring radius = n × 22 m / 2π (min 60 m); the ring turns in its own plane (90–220 s), its center laps the sun in 240–700 s; all members morph on ONE clock (the chorus) | ~22 m |
| Stream | 0.20 | 0.28 | 20–40 | one light bridge, one way | a column 12–20% of the span long crossing in 90–200 s; emerges from inside one sun's heart, vanishes into the other's; ±10 m lateral slots, 20 m sag | 30–60 m |
| Pair | 0.13 | 0.12 | 2 | a shared private orbit | the two circle each other 9–16 m apart every 14–34 s | 9–16 m |
| Gathering | 0.25 | 0.10 | 10–40 | capital: the bone at 1.08–1.14 × the skull ellipsoid, never the face cap (+Z); Mediant: 70% at the test towers; elsewhere: a plaza beside a bridge | a loitering knot, spread = 12 m × √n (≤110 m at the capital), small personal wander | ~25 m |
| Home traffic | 0.12 | 0.14 | 6–20 | one LANE per group from 0.12 to 1.32 sun radii (outward-facing at the capital) | in and out of the core on a cosine (dwell at both ends), 50–110 s per round trip, ±18 m lateral slots | 30–90 m |
| Play | 0.06 | 0.06 | 3–8 | a lissajous loop at 1.2–2.0 sun radii | a chase line, each member 0.5–1.1 s behind the last | 30–60 m |
| Formation (v63.6) | 0.12 | 0.13 | 14–40 | a shape whose center orbits a sun at 1.4–2.3 radii (capital: guarded by the shape's radius) | one of six shapes rolled per group — hollow sphere (Fibonacci), Bucky ball / dodecahedron / icosahedron by headcount (vertices, then the edges traced), cube with a pattern per face (ring / grid / diamond), a five-pointed star in two perpendicular planes, a hexagonal prism, the lazy cloud (jittered cells in a ball, slow personal drift); the shape turns in place (140–320 s, either way), breathes ±5%, partners (k, k^1) trade seats on a 34–70 s clock, morph on ONE clock (the chorus), tidal like a ring | ~25 m along an edge (sim bars 8–95 m nearest seat) |

(The other weights moved to make room: capital 0.20/0.20/0.11/0.21/0.10/0.06/0.12, satellites
0.24/0.26/0.10/0.09/0.12/0.06/0.13. Mediant's first gathering is always at the towers.)

Streams at the capital only use bridges whose sagged line clears Korrudan.

## The tide

Congregations, gatherings and formations are tidal: assembled ~50% of a 140–320 s cycle, apart
~34%, easing between (`saeTide` multiplies the clock). At low tide every member eases
out to its private orbit; at the capital the blend is pushed clear of the bone as a
last step (society-sim TEST 13 keeps that push under 5% of poses). Streams, pairs,
home traffic and play run continuously.

## The far read: crowd clouds (kind 66) — RETIRED v63.5

Retired 2026-09-04 on James's flight: the beings themselves read from far dots to
bodies "very well"; the cloud stand-in read as "fuzzy puffballs from any distance" that
beings flew straight through. No cloud orb is made (`CROWD_CLOUDS = false`), the dial is
gone. The kind-66 shader and `saeCloud`/`saeCloudGate` stay only so society-sim TEST 14
(the sim's geometry contract) still runs. Never bring back a far-LOD proxy for a crowd;
if far towns read empty, make the far motes brighter. The formations (above) are what
groups do instead of dissolving into a blob.

## Beings up close (unchanged from v56)

A 10 m being stirs at ~1.3 km (mote → raymarched shape), wakes fully at ~280 m
(filaments). The look is the Being Editor preset james-being-01 baked into the orb
FS; change it in the editor, then re-bake.

## Greeting in a crowd

Notice range `saeNotice` (400 m), full greeting at 37.5% of it. A GROUP notices you
through its nearest member; the acknowledgment ripples outward from there at ~45 m/s
(0.8 s rise per being), so the nearest few greet fully and the rest brighten in a wave.
The six greeting glyphs go to the six nearest greeters. Chords: 25 s per being, 1.6 s
global spacing, and 6 s per group — a knot answers as one voice, never a shop bell.

## The Cadence

Citizens 9 → 12 per caste at the capital (satellites 2/3): 216 robots, at work sites,
not in crowds.

## Where it gets judged

`tmp/orb-dimension/crowd-lab.html` (served): six vantages through the real orb
shader and the real group roll, sheet to `tmp/snapshots/crowd-lab-sheet.png`. T
toggles forced high tide / natural. Judge every crowd look change there first.
Sims: society-sim TESTS 12–15 (the roll, 33k sampled capital poses vs the bone,
cloud overdraw, the tower count), init-smoke, v47-sim kind coverage (65 + 66),
shader-check (the kind-66 branch compiles in the main orb FS).
