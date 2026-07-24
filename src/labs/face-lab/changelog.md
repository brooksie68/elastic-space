# Face Lab changelog

## 2026-07-24 — Claude (first gnome sculpt, by request)

James asked Claude to sculpt the gnome. Three dial-render-compare rounds
against the concept art (tmp/face-lab/gnome_dials.json + render_dials.py;
renders render_gnome_{front,threequarter,side}.png). Round 1 read witchy
(pointy droop nose, jowls); round 2 proved the 0..1 dial caps were the limit;
round 3 overdrives past 1.0 (nose-volume 1.6, ball-tip 1.5, skull width 1.2)
and lands the structure: doorknob nose, high apple cheeks, wide round skull.
Saved as preset "postmaster-head" (29 dials). Lab identity sliders widened to
±2 to match. Server-side preset validation still caps at 0..1 — saving
overdriven presets from the browser needs that relaxed (known, next session).
Still dressing, not dials: white brows, beard/chops, cap, glasses, storybook
texture bake.

## 2026-07-24 — Claude (identity dials: the sculpt head lands)

James's pivot after seeing the wrap-transfer's mesh problems up close: the
Meshy mesh's polygon soup is the quality ceiling, so the postmaster's head will
be REBUILT on clean MPFB2 topology, sculpted to the Rockwell/Pixar concept via
MakeHuman's modeling targets — co-driven in the browser, not in Blender.

- `tmp/face-lab/build_sculpt.py` → `assets/sculpt.glb` (13.2 MB): the clean
  bust now carrying 207 morphs — 67 expression + 140 identity dials (full
  nose/head/chin/cheek/forehead drawers, mouth+eyes majors; l-/r- pairs merged
  symmetric). Identity keys interpolate to eyes/teeth so head-scale dials keep
  the eyeballs seated (verified by render: render_gnome_test.png).
- Face Lab: model picker in the Character section (mannequin ↔ sculpt head);
  identity sliders render as -1..+1 paired dials grouped per drawer
  ("identity: nose" etc.); "neutral" now clears expressions but KEEPS identity;
  presets capture identity+expression together, so one saved preset = the
  postmaster's face recipe.
- Next: James sculpts the gnome by eye; then the recipe gets baked into a
  production build, his storybook texture baked over from the Meshy model,
  beard/chops decision, cap+glasses as rigid props, Mixamo body.

## 2026-07-24 — Claude (postmaster face transfer VALIDATED, v4)

The wrap-transfer technique works on the real postmaster. Four iterations in
`tmp/face-lab/` (wrap_align.py + wrap_transfer{,2,3,4}.py, state in
wrap-transferred.blend):

- v1: nearest-vertex delta copy — expressions read (smile/frown) but jaw weak.
- v2: amplified + wider radius — jaw motion bled into mid-face; glasses smeared.
- v3: radial raycast correspondence — exposed the real bug: verts buried inside
  the template hit its mouth-bag interior (huge jaw deltas on the nose).
- v4 (GOOD): outward-first raycast, template mouth-bag faces excluded from the
  BVH, glasses shells detected by texture color (brown near eyes) + cap shells
  rigid, amp 1.9 lower face / 1.2 upper. Result: warm smile, stern brow, mouth
  genuinely opens (side view shows the cavity), glasses/cap rigid, neutral
  pixel-identical.

Remaining for next session: small artifact shells at the nose bridge (dark
specks when animating), possibly more viseme amplitude, teeth/tongue material
check, export GLB + Face Lab postmaster character option, then in-world DLO
integration and the Mixamo body-animation pass (arms).

## 2026-07-23/24 — Claude (postmaster 2.0 decision + first full-body draft)

James chose the full MPFB2 rebuild ("3 all the way") after diagnostics proved
the Meshy anim tracks themselves hold the arms out 45–64° (not a fixable
offset; rest pose is T-pose, tracked in tmp/face-lab/diagnose_postmaster_arms.py).
First full-body draft built: `tmp/face-lab/build_postmaster2.py` (pm2.blend) —
arms pose naturally down via world-space aim on upperarm/lowerarm bones,
worksuit/shoes/newsboy cap, face pipeline loaded (68 keys). Outfit lineup
rendered (`outfit_lineup.py`, render_outfit_*.png): elegant suit is the only
postmaster-ish option in stock. Known gaps vs the concept art
(assets/ref/05_POSTMASTER.png): face reads too young, no white beard, no
glasses, no peaked postal cap (hats01+hats02 packs installed — newsboy cap is
the closest). Beard must be a fitted mhclo-style asset (has to deform with
jawOpen); glasses/cap can be rigid Meshy props on the head bone. Awaiting
James's calls on look direction. Body anims will come from Mixamo (his
browser, our retarget).

## 2026-07-23 — Claude (James's first tuning requests, same session)

James is pleased with the working lab ("quite amazing") — first change requests:

- Restored the "happy" preset he'd deleted; the six base expressions now carry
  `"builtin": true` and get no delete button (they can still be retuned by
  saving over the same name). His own saved presets keep the ×.
- "neutral — clear the face" button at the top of the presets section.
- New Character section: skin picker (9 male MakeHuman skins, baked to 2K JPEG
  in `assets/skins/` by `tmp/face-lab/bake_variants.py`) and eye-color picker
  (9 iris colors, `assets/eyes/`). Runtime diffuse-map swap (flipY=false,
  sRGB); choices persist in localStorage. GLB defaults: middleage african
  skin, brown eyes.

## 2026-07-23 — Claude (first-light fixes, same session)

James's first look found the classic MakeHuman-export trio: flat-card low-poly
eyes rendering as white billboards, teeth/tongue visible through closed lips,
and brow/lash cutouts rendering opaque. Root cause confirmed in the GLB: every
material exports as alphaMode BLEND. Fixes: bust rebuilt with the high-poly
eyes asset (real eyeball geometry), and lab.js now runs fixMaterials() after
load — skin/teeth/tongue/eyes forced opaque, eyebrows/eyelashes get
alphaTest 0.35 cutout. Any future world adapter for these characters needs the
same material pass (documented in CLAUDE.md).

## 2026-07-23 — Claude (build session)

Initial build of the whole expressive-character pipeline, per the plan James
approved earlier tonight:

- MPFB2 bust generator (`tmp/face-lab/build_bust.py`): human with eyes, teeth,
  eyebrows, eyelashes, tongue, game-engine skin; 52 ARKit + 15 viseme morphs
  loaded and interpolated to child meshes; macro morphs baked into the basis;
  helpers stripped; cut to bust; exported to `assets/bust.glb` (8.4 MB,
  verified: 67 targets on the face mesh, per-part subsets on the others).
- `src/core/face-life.js`: shared runtime (expression crossfade, auto-blink,
  saccades, Rhubarb viseme playback synced to audio, idle head motion).
  Simulation-tested in Node (`tmp/face-lab/test-face-life.mjs`, 7 test groups,
  all passing).
- Lab page (`index.html` + `lab.js`): orbit viewer, grouped morph sliders,
  preset save/apply/delete, transition bench, dialog bench, life-layer toggles.
- Server: `/api/face-lab/state` + `/api/face-lab/presets` (with backups).
- `tools/lipsync-bake.mjs`: Rhubarb wrapper, handles mp3 via Blender's ffmpeg.
  James's first DLO clip (`test-speech.mp3`) baked: 121 mouth cues / 39.5 s.
- Seeded 6 starter presets (happy, sad, angry, surprised, disgusted, skeptical)
  — deliberately rough; the whole point is James retunes them in the lab.

Where things stand: everything static-checked and simulation-tested, but the
page has not yet been opened by a human. Next: James's first look; retune the
seed presets; decide eye/iris material; then the real question — apply the
recipe to a production character (postmaster rebuild or a fresh face).
