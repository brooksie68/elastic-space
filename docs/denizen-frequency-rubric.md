# Jerry's Pool: Denizen Frequency Rubric

This is the canonical reference for denizen timing in `src/worlds/jerrys-pool/site.js`. Update this file whenever denizen spawn timing, opening appearances, duration, or concurrency limits change.

Every frequency and cap below is the ×1 baseline. The in-world tuner panel (bottom-left ⚙,
added 2026-07-15) scales each creature's spawn frequency and population 0–5×, with matching
global multipliers, and scales the background dot field's swirl speed and dot count 0.5–2×.
Jerry, the leviathan, and Mary are not tunable, though the tuner header's
"Mary" button summons her for an immediate visit. Tuner settings live in localStorage
(`jerrys-pool-tuner-v1`) and are per-browser; this document always describes ×1.

## Opening (2026-07-15: seeded population replaced the 30-second guarantee)

The pool loads already inhabited. `seedOpeningResidents()` places six ambient residents
mid-passage at page load: two amoebas, a ray, a jellyfish, and a pulse urchin, each dropped
20–60% of the way through its journey (WAAPI crossers via `animation.currentTime`, rAF
creatures via a backdated clock), plus a dot school placed mid-pool swimming toward an edge.
Nobody else gets a forced first appearance: every recurring creature runs its regular spawn
schedule from load, with attempts blocked by the concurrency cap skipped as usual. The
leviathan keeps its own rare entrance (4–8 minutes). The three-diamond and three-tentacled ball fish
keep their own launch cycles.

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
| Pulse urchin | Every 9–15 seconds | Passage lasts 50–72 seconds; maximum three at once; skipped when 6 general denizens are active |
| Dot schools | Every 8–12 seconds | 8–30 fish per school; maximum 3 schools; skipped when 8 general denizens are active |
| Three-diamond fish | Relaunches after each 25–46 second visit plus a 4–9 second pause | 34% chance to appear as a group of 2–5; otherwise solitary |
| Three-tentacled ball fish | Relaunches after each 30–52 second visit plus a 1–4 second pause | 34% chance to appear as a group of 2–5; otherwise solitary |
| Vake | Every 8–16 seconds | Crossing paced at the old 3–5 second dart speed; hunts Jerry's energy orbs within a 75%-of-window sight radius — one orb per visit, then glows and trails its stolen color to the exit (detours extend the visit, hard TTL 22 seconds); every vake — mid-hunt included — banks away inside a 320 px buffer around Jerry's edge, blending to pure flight just outside his reach at the sharpest turn rate (0.009 rad/ms vs 0.006 fed / 0.004 base); once fed it also leans away within 430 px (up to ~4/5 toward pure flight, so it curves wide rather than hairpinning); if it still strays within 234 px of Jerry's edge he fires — 1 bolt in 5 goes wide, landing beside the vake, which spooks straight away from Jerry for ~1.8 s while Jerry re-arms for 2.6–4 s; a hit stops it, grays it out, and it drifts up off the screen; maximum two at once; no concurrency skip |
| Sulfur lantern colony | Every 16–28 seconds | Passage lasts 46–68 seconds; maximum two at once; skipped when 6 general denizens are active |
| Vent walker | Every 20–34 seconds | Passage lasts 52–78 seconds; maximum one; skipped when 6 general denizens are active |
| Lure gulper | Every 25–40 seconds | Crossing lasts 30–44 seconds; maximum one; skipped when 6 general denizens are active |
| Fan dancer | Every 22–36 seconds | Crossing lasts 58–82 seconds; maximum one; skipped when 6 general denizens are active |
| Comb jelly | Every 24–38 seconds | Crossing lasts 55–80 seconds; maximum one; skipped when 6 general denizens are active |
| Spore floater | Every 26–42 seconds | Passage lasts 62–90 seconds: a loose ellipse around the pool (urchin-style guided drift) that stalls and reverses direction once or twice per visit, speed breathing between ~40–100% of its ceiling, radius wandering, riding the dot current like the pulse urchin; maximum one; skipped when 6 general denizens are active; sheds 2–3 sinking glow-spores every 5.5–9.5 seconds (maximum 6 aloft, 5.5–8.5 second lifetimes) |
| Barrel drifter | Every 18–32 seconds | Crossing lasts 28–54 seconds; maximum one; skipped when 6 general denizens are active. Every other drifter grazes a signal stalk instead of crossing (grazing runs last 46–60 seconds): a slow diagonal glide down to the stalk (angle varies per visit), feed window at 52–68% of the run, then it rises a little, flattens out — sometimes settling back down — and cruises off the side like a normal crossing, red balls visible in its body with extra glow; the stalk regrows its balls ~15 seconds after they were eaten |
| Abyssal predator / leviathan | First appearance after 4–8 minutes; subsequent appearance 4–8 minutes after departure (halved from 2–4 on 2026-07-16 — more rare) | Each passage lasts 60 seconds; only one at a time |
| Mary (Jerry's girlfriend) | First visit 2.5–5 minutes after load; next visit 4–8 minutes after she departs; the tuner header's "Mary" button summons a visit immediately (rescheduling, never stacking, the natural chain; the button is disabled mid-visit and refuses with a shake while the leviathan is about) | Golden-pink cell two-thirds Jerry's size, one visit at a time (~40–60 seconds): enters from the side away from Jerry with her nucleus already seeking him (she's there to see him — it leans his way from her first moments in frame), mutual notice ~430 px outside contact range (~1.7-second beat: she runs six ~1.15-second pulses that carry into the approach, Jerry answers ~1.6 seconds in with two glow pulses of his own and starts drifting toward her), eager paired swim 6–8.5 seconds around a drifting shared anchor — both nuclei pressed against their facing membranes for the entire coming-together — then membrane touch for 7–9 seconds (both outer ring sets dim and merge into three shared orbit rings around the pair, warm gold-pink bolts arc between their rims every 0.5–0.9 seconds, both nuclei press toward the contact point and sway together on a shared ~2.6-second clock, both glow up and Jerry's glow blushes golden-pink, and each releases six energy orbs fanned from their far sides — his in the ambient blues, hers in golden-pink variations; all twelve are real drift orbs that vakes and worms treat normally. The release also sends two expanding energy rings — one his colors, one hers — sweeping outward from the pair at ~0.66 px/ms; every glow-registry creature the front passes holds full brightness for 6.5–9 seconds before easing back, and polyps and brain corals wake through their usual Jerry-proximity mechanisms), ~2.6-second parting, then she exits the nearest side edge. Spawn attempts are skipped and retried every 45–90 seconds while the leviathan is visible, Jerry is panicking or tending the seafloor, or the tab is hidden; a leviathan surfacing mid-visit ends the date early. Jerry holds near depth for the visit and ignores prey. Not tuner-scaled |

Spawn attempts blocked by a concurrency limit are skipped, not queued.

## Permanent denizens

| Denizen | Count | Activity timing |
|---|---:|---|
| Polyps | 28 | Each flares every 9–47 seconds for 2.8–6.4 seconds |
| Alien shrimp | 11 | Continuous movement |
| Brain coral | 3 | Activates within 260px of Jerry, holds full brightness for 5 seconds, then fades over 20 seconds |
| Seafloor plants | 23 (5 signal stalks) | Continuous movement and proximity responses |
