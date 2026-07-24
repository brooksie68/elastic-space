# Face Lab — Claude instructions

The Face Lab is a **lab, not a world**: an authoring workbench for the house
expressive-character pipeline. No drift exits, no registry entry, no world.json.
It is linked from the admin panel's "Labs" section.

## What it is

A three.js viewer for `assets/bust.glb` (an MPFB2 human bust carrying 52 ARKit
face-unit morphs + 15 Meta viseme morphs) driven by the shared runtime engine
`src/core/face-life.js`. James uses it to:

1. Mix morph sliders into expressions and save them as named presets.
2. Test preset A→B transitions (duration/easing/loop) — the transition bench.
3. Play voice clips with baked Rhubarb viseme timelines — the dialog bench.
4. Toggle the life layer (auto-blink, saccades, idle head motion).

## The pipeline (all pieces, in order)

1. **Bust generation** — `tmp/face-lab/build_bust.py`, run headless:
   `blender --background --python tmp/face-lab/build_bust.py`. Idempotent;
   CONFIG dict at the top (macro values, skin, assets, bust cut height).
   Requires the MPFB2 extension plus these asset packs installed into MPFB user
   data (all CC0, from static.makehumancommunity.org): `makehuman_system_assets`
   (eyes/teeth/brows/lashes/tongue/skins), `faceunits01` (ARKit targets),
   `visemes02` (Meta viseme targets). All installed on James's machine 2026-07-23.
2. **Runtime** — `src/core/face-life.js` (expression crossfade, blink, saccades,
   viseme playback, idle head motion). Reusable by any world character whose GLB
   carries these morph names. Tested by simulation in
   `tmp/face-lab/test-face-life.mjs`.
3. **Lip-sync bake** — `node tools/lipsync-bake.mjs <clip-or-folder>` writes
   `<name>.visemes.json` next to each wav/ogg/mp3 (mp3 converts via Blender's
   bundled ffmpeg). Put the transcript in `<name>.txt` beside the clip for
   better accuracy. Rhubarb binary sits in `tools/rhubarb/` (gitignored).
4. **Server side** — `GET /api/face-lab/state` (presets + clip list),
   `PUT /api/face-lab/presets` (validates, backs up old file to
   `tmp/face-lab/preset-backups/`, writes `assets/presets.json`).
   Clip scan covers DLO `assets/speech-clips/`, DLO `assets/audio/`, and this
   lab's `assets/audio/`.

## Rules

1. `assets/presets.json` is James's tuning data once he starts saving — treat it
   like a curator-owned layout file: never hand-edit or reseed it casually.
2. The lab intentionally does NOT use ElasticSoundControl: it is an editor tool,
   all audio is click-initiated, nothing autoplays.
3. Build-critical gotchas live in the build script comments — top three:
   MPFB macro morphs are shape keys and MUST be baked into the basis before
   loading face targets (else exports bloat and un-morph bugs appear); the
   decimate modifier is incompatible with shape keys (that's why it's a bust,
   not a decimated full body); `FaceService.interpolate_targets` must run
   BEFORE helper-strip/bust-cut while vertex indices are intact.
4. **Material gotcha (bit us on first light):** the glTF exporter writes ALL
   MakeHuman materials as alphaMode BLEND — teeth show through lips, cutout
   textures go opaque. `fixMaterials()` in lab.js forces skin/teeth/tongue/eyes
   opaque and gives eyebrows/eyelashes **and the eyes** alphaTest 0.35 — the
   eyeball texture's alpha hides the outer cornea shell; force the eyes opaque
   and you get milky white balls over the iris (second first-light bug). Any world that loads one
   of these characters needs the same pass (candidate for face-life.js or a
   shared loader helper when this graduates). Also: use the `high-poly` eyes
   asset — `low-poly` is a flat alpha card, useless in real 3D. Iris color
   (`eyes/materials/*.mhmat`) is still an open tuning item.

## Status (2026-07-23)

Built this session (Phases 1–4 of the expressive-character plan). Not yet
looked at by James in a browser — first-light feedback pending. The postmaster
rebuild decision (this technique on a Meshy-style character) is still open.
