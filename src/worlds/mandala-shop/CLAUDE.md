# Mandala Shop — Claude instructions

Sanna's mandala shop — a 3D gallery interior (THREE.js) and the reference world for curator mode and the Meshy texture pipeline.

## Docs

- `changelog.md` — session history, newest first.
- Blender build lives in `tmp/mandala-shop/` (repo root `tmp/`).

## World-specific rules

- `assets/layout.js` is curator-owned: never hand-edit slot data casually. Edit via curator
  mode (`?curate=1`, served) or the layout API.
- `build.py` must not reseed `layout.js` unless `MS_WRITE_LAYOUT=1` is set — keep that guard.
- world.js is the reference curator adapter (see root CLAUDE.md, "Curator mode").
- Textures are Meshy seamless tiles; Meshy materials duplicate the atlas as `emissiveMap` —
  when swapping textures, swap both maps.
- There is NO outside (2026-07-18): the Meshy shop door seals the arch closed, with an
  opaque honey backer plane behind it (the door GLB has transparent slivers in its
  filigree). The souk panorama/matte-painting era is over — if an outside ever returns,
  build it properly from scratch.
