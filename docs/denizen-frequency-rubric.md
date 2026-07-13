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
| Pulse urchin | Every 18–30 seconds | Passage lasts 50–72 seconds; maximum one; skipped when 6 general denizens are active |
| Dot schools | Every 8–12 seconds | 8–30 fish per school; maximum 3 schools; skipped when 8 general denizens are active |
| Three-diamond fish | Relaunches after each 25–46 second visit plus a 4–9 second pause | 34% chance to appear as a group of 2–5; otherwise solitary |
| Three-tentacled ball fish | Relaunches after each 30–52 second visit plus a 1–4 second pause | 34% chance to appear as a group of 2–5; otherwise solitary |
| Vake | Opening appearance at 1.8 seconds, then every 15–30 seconds | Dart lasts 3–5 seconds; only one at a time; no concurrency skip |
| Sulfur lantern colony | Every 16–28 seconds | Passage lasts 46–68 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Vent walker | Every 20–34 seconds | Passage lasts 52–78 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Lure gulper | Every 25–40 seconds | Crossing lasts 30–44 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Fan dancer | Every 22–36 seconds | Crossing lasts 58–82 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Barrel drifter | Every 18–32 seconds | Crossing lasts 32–48 seconds; maximum one; skipped when 6 general denizens are active (opening spawn bypasses the limit) |
| Abyssal predator / leviathan | First appearance after 2–4 minutes; subsequent appearance 2–4 minutes after departure | Each passage lasts 60 seconds; only one at a time |

Spawn attempts blocked by a concurrency limit are skipped, not queued.

## Permanent denizens

| Denizen | Count | Activity timing |
|---|---:|---|
| Polyps | 28 | Each flares every 9–47 seconds for 2.8–6.4 seconds |
| Alien shrimp | 11 | Continuous movement |
| Brain coral | 3 | Activates within 260px of Jerry, holds full brightness for 5 seconds, then fades over 20 seconds |
| Seafloor plants | 21 | Continuous movement and proximity responses |
