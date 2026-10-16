# Changelog — Softly

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-10-16 — Claude (round nine)

- "unwired" tag removed from the admin row at his word.
- Volume: the slider opens at 50% (remembered in localStorage `softly-volume` once he moves it); GAIN 1.36 makes 50% play at 85% of the old default loudness.
- Plays by default: the usual autoplay attempt, plus a new shared-control option `startOnGesture: true` — if the browser blocks it, the first click or key anywhere starts the sound (not if that first touch is the speaker button).

## 2026-10-16 — Claude (round eight)

- His "add it to the drift": world.json → live, registry regenerated and the five leaked drafts (carnage, jabberwocky, lumina, snap, the-phase-lab) removed by hand, so only softly was added. The "unwired" tag on the admin row stays for him to remove.

## 2026-10-16 — Claude (round seven)

- His "three exit points as fuzzy round invisible shapes in the three corners that don't have controls": `.drift` links top-left / bottom-left / bottom-right, 34vmin soft radial blurs (his "not too small") tucked half off the corner, opacity 0, easing up to 0.22 over 2.5 s on hover. registry + drift scripts loaded; the world itself is still out of the registry (draft).

## 2026-10-16 — Claude (round six)

- His "more delay and reverb, a subtle harmonizer a fifth up at ~10% mix, atmospheric": reverb 6 s → 10 s and louder (0.7 → 1.05); delay feedback 0.42 → 0.58, level 0.35 → 0.55, plus a second tap at 1.13 s so repeats smear; dry 0.55 → 0.45. HARMONY = 0.10: every drone voice and every chime carries a sine a fifth up at 10% of its fundamental.

## 2026-10-16 — Claude (round five)

- "The gradients stopped": the fades ran on Web Animations with `playbackRate` rewritten every frame, which can stall them. Rewritten so one rAF loop advances each wash's own clock by dt × tempo × its own speed and sets the opacity by hand; same timings, same tempo.

## 2026-10-16 — Claude (round four)

- His "slowly add and remove notes… root, fourth, fifth, sixth, 9 across 2 octaves, like very slow wind chimes": THE CHIMES on top of the C2/G2/D4 bed — C4 D4 F4 G4 A4 C5 D5 F5 G5 A5, one picked at random every 2.5–8 s (up to four ringing), each a sine + faint octave, swelling in over 0.4–2.6 s and dying away over 6–15 s, panned at random, through the same filter / delay / reverb. Constants at the top of sound.js.

## 2026-10-16 — Claude (round three)

- His "a pleasant triad with root, third and 9th, reverb and delay, soft": `sound.js` — C3 / E3 / D4, sine + a quiet detuned triangle per note, each voice breathing on its own slow swell, lowpass 1.4 kHz, a 0.68 s darkening feedback delay, a 6 s generated reverb, 4 s fade in. Then "so quiet i can barely hear it": ~4× louder (oscillators 0.16 → 0.42, master no longer halved), a gentle compressor before the output so the swells never clip. Then root + third down an octave (C2, E2; the ninth stays D4), then the third dropped for the fifth (C2, G2, D4). Shared sound control (autoplay attempt as usual).

## 2026-10-16 — Claude (round two)

- His "vary the overall opacity a little, randomly speed up and slow down, chaos-y": peak opacity now 0.3–1, the hold sags to 70–100% of the peak, fade-out 0.6–1.5× the fade-in.
- THE TEMPO: one wandering speed (0.55–1.7×) drifts toward a new random target every 2–9 s, mostly gently, a lurch one time in five; it drives every live wash (each with its own ±15%) and the spawn rate.

## 2026-10-16 — Claude

- Built on James's brief: full-screen two-stop gradients (color → color or color → transparent), random hue/angle, fade in 6–12 s, hold 2–8 s, fade out, peak opacity 0.55–1, up to five overlapping, a new one tried every 1.5–5 s. Black behind.
- Draft, unwired: no drift exits, no registry entry. Awaiting his look.
