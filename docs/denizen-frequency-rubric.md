# Jerry's Pool: Denizen Frequency Rubric

This is the canonical reference for denizen timing in `src/worlds/jerrys-pool/site.js`. Update this file whenever denizen spawn timing, opening appearances, duration, or concurrency limits change.

## Opening (2026-07-12: scripted wave replaced by a 30-second guarantee)

Every recurring creature appears at least once within the first 30 seconds — at a uniformly
random moment, not a scripted one (fast creatures roll within their normal window, slower ones
within 0–26 s). First spawns bypass the concurrency skip where the spawn supports forcing
(urchin, colony, walker, gulper, fan dancer, barrel drifter); the vake has no skip to bypass.
The leviathan is the sole exception and keeps its 2–4 minute entrance. The three-diamond and
three-tentacled ball fish keep their own launch cycles.

Permanent seafloor denizens are present immediately.

## Jerry proximity glow

All scheduled denizens (plus jellies, dot schools, and the alien fish) brighten as Jerry
approaches: up to +85% brightness at contact, fading linearly to nothing 260 px from his edge,
eased at 7% per frame. The leviathan is exempt — it keeps its own Jerry reaction (the panic
dive) and its silhouette is too large for edge-proximity to mean anything.

## Recurring denizens

| Denizen | Spawn attempt frequency | Limits and behavior |
|---|---:|---|
| Amoebas | Every 10–16 seconds | Maximum 5 amoebas; skipped when 6 general denizens are active |
| Jellyfish | Every 6–16 seconds | Moon, nettle, and box cycle in order; skipped when 6 general denizens are active |
| Rays | Every 6–12 seconds | Skipped when 6 general denizens are active |
| Pulse urchin | Every 9–15 seconds | Passage lasts 50–72 seconds; maximum three at once; skipped when 6 general denizens are active; opening appearance within 0–15 seconds |
| Dot schools | Every 8–12 seconds | 8–30 fish per school; maximum 3 schools; skipped when 8 general denizens are active |
| Three-diamond fish | Relaunches after each 25–46 second visit plus a 4–9 second pause | 34% chance to appear as a group of 2–5; otherwise solitary |
| Three-tentacled ball fish | Relaunches after each 30–52 second visit plus a 1–4 second pause | 34% chance to appear as a group of 2–5; otherwise solitary |
| Vake | Opening appearance at 1.8 seconds, then every 8–16 seconds | Crossing paced at the old 3–5 second dart speed; hunts Jerry's energy orbs within a 75%-of-window sight radius — one orb per visit, then glows and trails its stolen color to the exit (detours extend the visit, hard TTL 22 seconds); once fed it prefers to keep clear of Jerry — a proximity-weighted lean away within 430 px of his edge (at most ~2/3 toward pure flight, turn-rate capped, so it curves wide rather than hairpinning); if it strays within 260 px of Jerry's edge he zaps it — it stops, grays out, and drifts up off the screen; maximum two at once; no concurrency skip |
| Sulfur lantern colony | Every 16–28 seconds | Passage lasts 46–68 seconds; maximum two at once; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Vent walker | Every 20–34 seconds | Passage lasts 52–78 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Lure gulper | Every 25–40 seconds | Crossing lasts 30–44 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Fan dancer | Every 22–36 seconds | Crossing lasts 58–82 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Comb jelly | Every 24–38 seconds | Crossing lasts 55–80 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Spore floater | Every 26–42 seconds | Passage lasts 62–90 seconds: a loose ellipse around the pool (urchin-style guided drift) that stalls and reverses direction once or twice per visit, speed breathing between ~40–100% of its ceiling, radius wandering, riding the dot current like the pulse urchin; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit); sheds 2–3 sinking glow-spores every 5.5–9.5 seconds (maximum 6 aloft, 5.5–8.5 second lifetimes) |
| Barrel drifter | Every 18–32 seconds | Crossing lasts 28–54 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit). Every other drifter grazes a signal stalk instead of crossing (grazing runs last 46–60 seconds): a slow diagonal glide down to the stalk (angle varies per visit), feed window at 52–68% of the run, then it rises a little, flattens out — sometimes settling back down — and cruises off the side like a normal crossing, red balls visible in its body with extra glow; the stalk regrows its balls ~15 seconds after they were eaten |
| Abyssal predator / leviathan | First appearance after 2–4 minutes; subsequent appearance 2–4 minutes after departure | Each passage lasts 60 seconds; only one at a time |

Spawn attempts blocked by a concurrency limit are skipped, not queued.

## Permanent denizens

| Denizen | Count | Activity timing |
|---|---:|---|
| Polyps | 28 | Each flares every 9–47 seconds for 2.8–6.4 seconds |
| Alien shrimp | 11 | Continuous movement |
| Brain coral | 3 | Activates within 260px of Jerry, holds full brightness for 5 seconds, then fades over 20 seconds |
| Seafloor plants | 23 (5 signal stalks) | Continuous movement and proximity responses |
