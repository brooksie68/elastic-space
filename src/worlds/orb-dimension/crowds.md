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

## The six verbs

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
| Play | 0.08 | 0.08 | 3–8 | a lissajous loop at 1.2–2.0 sun radii | a chase line, each member 0.5–1.1 s behind the last | 30–60 m |

Streams at the capital only use bridges whose sagged line clears Korrudan.

## The tide

Congregations and gatherings are tidal: assembled ~50% of a 140–320 s cycle, apart
~34%, easing between (`saeTide` multiplies the clock). At low tide every member eases
out to its private orbit; at the capital the blend is pushed clear of the bone as a
last step (society-sim TEST 13 keeps that push under 5% of poses). Streams, pairs,
home traffic and play run continuously.

## The far read: crowd clouds (kind 66)

One soft grainy glow per congregation / gathering / home lane / play loop (pairs and
streams carry their own read). Radius: ring × 2.5, spread × 2.2, half the lane, loop
× 1.2. Strength = tide × crowd size (n/24, floor 0.35) × a distance gate — gone inside
2.5 radii, full beyond 4 (the near-fade is the frame rate; the v53 nebula rule).
Under the gate the quad collapses to a point: a zero-alpha quad still costs its
pixels. `saeCloud` scales the strength. society-sim TEST 14 bars worst-case cloud fill
at 6 screens (0.77 at the default).

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
