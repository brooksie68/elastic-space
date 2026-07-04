# Jerry's Pool: Denizen Frequency Rubric

This is the canonical reference for denizen timing in `src/worlds/jerrys-pool/site.js`. Update this file whenever denizen spawn timing, opening appearances, duration, or concurrency limits change.

## Opening wave

Every denizen type except the leviathan appears within five seconds of page load.

| Denizen | Opening time |
|---|---:|
| Amoeba | 0.45 seconds |
| Dot school | 0.85 seconds |
| Moon jellyfish | 1.25 seconds |
| Nettle jellyfish | 2.20 seconds |
| Box jellyfish | 3.15 seconds |
| Ray | 4.10 seconds |
| Pulse urchin | 4.60 seconds |
| Three-diamond fish | 0.90–2.70 seconds |
| Three-tentacled ball fish | 2.60–4.40 seconds |

Permanent seafloor denizens are present immediately.

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
| Abyssal predator / leviathan | First appearance after 2–4 minutes; subsequent appearance 2–4 minutes after departure | Each passage lasts 60 seconds; only one at a time |

Spawn attempts blocked by a concurrency limit are skipped, not queued.

## Permanent denizens

| Denizen | Count | Activity timing |
|---|---:|---|
| Polyps | 28 | Each flares every 9–47 seconds for 2.8–6.4 seconds |
| Alien shrimp | 11 | Continuous movement |
| Brain coral | 3 | Activates within 260px of Jerry, holds full brightness for 5 seconds, then fades over 20 seconds |
| Seafloor plants | 21 | Continuous movement and proximity responses |
