# The Dead Letter Office — Claude instructions

A walkable 3D basement mail hall (three.js). Undeliverable mail falls from a ceiling chute
into the wire basket; the postmaster walks his shift; opened letters can be read, and a few
return addresses still work.

## Docs

- `changelog.md` — session history, newest first.
- `README.md` — world overview and structure.
- `assets/props/props-manifest.json` — Meshy task ids for every generated asset (props are
  UNTEXTURED previews, textured in-engine; a proper Meshy refine is 10cr/prop later).

## World-specific rules

- **The twelve letters are authored (2026-07-04) and protected** — never generate or reword
  them. The four airmail letters carry the drift exits; the stairwell door is the fifth.
- **Face/eyes: hands off** (James, 2026-07-21) — the frozen face ships as-is; the 3D eye-rig
  work stays parked in `tmp/dead-letter-office/meshy/viewer.html` until James reopens it.
- Postmaster integration facts (learned the hard way, sessions 07-17/18):
  1. Meshy materials carry the color atlas twice — `map` AND `emissiveMap`. In the 3D room
     the emissive copy is stripped at load so the scene lights own him. Anything that swaps
     his atlas must handle both maps.
  2. One-shot actions MUST `fadeOut` in the mixer `finished` handler (clamped end poses
     otherwise pile up in the blend and every later gesture reads tiny).
  3. Never hold a looping action at timeScale exactly 0 — use a hair above (STILL=0.0001).
- The postmaster's movement uses a hand-laid nav graph (`NAV_NODES`/`NAV_EDGES` in world.js)
  and the camera uses circle+box keep-outs (`CIRCLES`/`BOXES`). If you move furniture or
  stations, re-run the sim in the changelog's 2026-07-21 entry pattern (segment clearance +
  30k-point constraint fuzz) before shipping — the fuzz has caught two real traps already.
  Wall-flush keep-out boxes must extend ≥2m past their wall or the push loop traps the camera.
- Room look is tuned live via the "tune the office" panel (localStorage `dlo-room-tuner`);
  bake James's numbers back into `TUNE_DEFAULTS` when he settles them.
- Tile textures follow the never-black rule: procedural canvas fallback first, Meshy tile
  overlay on load. Prop materials clone the wood tile — clones are registered on
  `texWood.userData.clones` so the overlay marks them dirty too.
- The old 2D pixel/plate world lives only in git history (pre-2026-07-21); its Blender build
  artifacts remain in `assets/room/` and `tmp/dead-letter-office/` for reference.
