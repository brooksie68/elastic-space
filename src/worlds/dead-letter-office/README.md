# The Dead Letter Office

A world added by **claude-fable** (Claude Code) with James on 2026-07-04; rebuilt as a full
3D room on 2026-07-21 at James's direction ("make this a lot cooler").

## What it is

A walkable basement mail hall — sub-basement four — built in three.js at roughly twice the
floor area of Mandala Shop (18×12m). Grey-green painted cinderblock, stone pavers, ceiling
beams and pipe runs, three hanging bulbs, a high barred window with a cold light shaft, and
a stairwell door that is the only way out (it drifts).

The postmaster (Meshy rig + 18-clip animation pack, 2026-07-17) works an endless shift on a
station graph: sorting at his roll-top desk under the green banker's lamp, collecting letters
from the wire basket (a bow is the pickup; the letter rides his hand), filing them into the
pigeonhole wall, feeding the hopeless ones to the potbelly furnace (a hand-rub strike of the
match, then the toss and the flare), punching the wall clock, blowing on his coffee, staring
at the window. Click him and he turns to face you with a line.

Undeliverable mail falls from a ceiling chute marked INCOMING and flutters into the DEAD
LETTERS basket. Envelopes are clickable from any angle — mid-air, in the basket, or strayed
on the floor (E opens the nearest). The DEAD LETTERS wall tally ticks up with every arrival.
The punch clock counts your visit; his shift lines refer to it.

## The letters

Twelve letters, all authored (not generated), defined in the `LETTERS` array at the top of
`world.js` — unchanged since 2026-07-04. Tone: melancholy-absurd. Envelopes deal from a
shuffled deck with no repeats until all twelve have appeared.

## Where the links are

The four letters that link out arrive as **airmail envelopes** — red-and-blue edge striping
baked into their envelope texture, visible in the room before opening. Their ink-blue return
addresses are drift links. The opening minutes always include one airmail envelope. The
stairwell door is a fifth exit: clicking it drifts.

## Files

1. `world.json` — manifest.
2. `index.html` — canvas stage, loading poster (the original concept painting), letter
   overlay dialog, hidden door-drift anchor; loads the core scripts then `world.js` as an
   ES module (import map for three.js).
3. `world.css` — poster, HUD, speech bubble, tuner, and the letter overlay (carried over
   from the 2D office).
4. `world.js` — everything: room build, Meshy props, postmaster shift brain, falling mail,
   letter overlay, walk controls, tuner, sound.
5. `assets/postmaster/` — rigged GLB + consolidated anim pack (from the 2026-07-17 Meshy
   session; idle-scale patch applied).
6. `assets/props/` — decimated Meshy preview meshes + `props-manifest.json` (task ids).
7. `assets/textures/` — Meshy seamless tiles (wall / floor / wood).
8. `assets/audio/` — ElevenLabs ambience + one-shots, plus the original stamp-thunk.
9. `assets/ref/`, `assets/room/` — concept art and the retired 2D build's render artifacts.

## Behavior details

1. Walk: WASD/arrows + drag look (grab/swing modes, shared `elastic-look-mode` preference);
   wheel is a capped dolly (motion-restraint rules). Furniture is solid; so is he.
2. Sound: ambience bed + SFX through the shared sound control; nothing plays until the
   control's autoplay attempt or the speaker button.
3. `prefers-reduced-motion`: no falling mail (pre-placed pile, instant replacement), the
   postmaster stands still at his desk, no furnace flicker.
4. Tuner: "tune the office" (bottom right) — light levels, fog, mail rate, his pace.
5. Performance: dynamic resolution while the camera moves, no shadow maps (blob shadow),
   merged geometry for pipes/beams/fins, ~450k tris total.
