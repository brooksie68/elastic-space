# Changelog — Mandala Shop (storefront name: "Sanna")

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-16 — Claude (with James)

- Direction shift, James's call: art placement moves out of Blender and into a reusable
  browser-side "curator mode" — James dresses the gallery himself (pick up art from a tray
  scanned from `assets/art/`, place as wall/cord/easel/lean, resize, choose frame from a
  per-world kit, keyboard nudge, save). Framework will live in `src/core/` and be reused
  for future gallery worlds (e.g. a graffiti shop with a different frame kit).
- Architecture: room (Blender-baked GLB) + art layer (runtime, driven by `assets/layout.js`).
  Curate mode is entered ONLY via the map room's "curate" pill next to the Mandala Shop
  entry (James rejected hand-typed query params; the pill link carries the flag).
- Done this session: build.py grew MS_SKIP_RENDER / MS_EXPORT_GLB env flags; world-space
  planar UVs on patterned surfaces (floor, wainscot, counter, rug, door, table) so the web
  page can texture them procedurally; exported `assets/room.glb` (1.83 MB, 251 meshes,
  ~60k polys, art layer verified absent via clean-session reimport); `assets/layout.js`
  seed generated from the Blender arrangement (frame kit + 26 slots, Blender Z-up coords,
  convert to Three via (x, z, -y)); map room row restyled with the curate pill
  (index.html + styles/admin.css `.page-row` / `.curate-link`).
- SHIPPED the walkable page (same session): `world.js` + rebuilt `index.html`. Three.js
  0.185.1 vendored at `src/lib/three/` (three.module.js + three.core.js +
  loaders/GLTFLoader.js + utils/*, npm-installed, importmap maps bare 'three'). Room GLB +
  runtime art layer from layout.js (frames/cords/easel/lean/blank shimmer built in JS;
  triptych via texture offset slices). Drag-to-look + WASD/arrows with damped easing (no
  bob — James's motion sensitivity), click-a-piece glide-up viewer (Esc/click-away glides
  back, wheel adjusts distance), 8 warm point lights matching the Blender lanterns,
  procedural canvas textures keyed to GLB material names (floor_tile, tile_sandstone,
  rug_rose, wood_door). Collision: octagon half-plane walls (hard, iterated solve) +
  furniture circles (soft) + pinch plug near counter — caught a real wall-leak bug via the
  Node sim (`scratchpad verify-shop.mjs`): circles could shove you through the canted
  corner; fixed by circles-first/walls-last iteration. Drift exits: open door (walk out or
  click), brass bowl, shimmering blank frame (hidden data-drift anchors clicked from the
  scene); SANNA poster card stays as loading screen and file:// fallback with its own 3
  drift portals. Curate pill shows a "coming soon" toast for now. Build stamp r2 on page.
- Static verification only (house rule: no Browser-pane QA): GLB chunk parse (materials,
  door/bowl nodes, no art leakage, UV presence), collision sim probes, layout parse + art
  file existence, node --check on world.js. James is the first real walkthrough.
- Next: James walks the room and art-directs; then curator mode (tray from assets/art/,
  place/resize/frame/nudge/save via dev-server endpoints with timestamped backups); then
  extract the reusable gallery module to `src/core/` for future gallery worlds.
- James's first-walkthrough verdict: strong start, keep going. His shop wishlist: (1) a
  lighting pass (different mood than the v1 guess), (2) a proprietor character in the
  shop, (3) music. Meshy Premium (starts 2026-07-17) brings his big premade-object
  libraries — adapt via Blender or drop GLBs straight into worlds; good source for the
  proprietor and props. He has "tons of comments" queued for next session.

## 2026-07-15 — Claude (with James)

- World kicked off. Concept: a Moroccan/Ottoman tented shop pavilion ("Sanna" on the sign,
  Mandala Shop everywhere else) full of framed mandalas — James's actual artwork flown into
  the frames. Visitor stands in the shop, mouse-look + arrow keys, click a piece to glide up
  and view it full-res. Paradigm intended to be repeatable for other artists/art types.
- Two GPT-generated interior references live in `assets/reference/`. Twelve artworks (all
  square-ish) live in `assets/art/`.
- Display layout (v2, after James's "be bold" direction): every artwork placed TWICE = 24
  placements. A 2.6m peacock hero owns the back wall; a 2.1m-tall triptych (gold-star piece
  split across three panels via UV slices) plus a 1.9m ornate anchor the north wall; big
  green-glow piece, kraft trio, high pieces, and two cord-hung frames on the south wall;
  real art on all four canted corners; salon pairs flanking the door; easel piece; leaning
  blank stack + a few blanks as shop inventory.
- Wainscot reworked from glossy blue mosaic to matte 16cm sandstone/clay tiles after James
  flagged a swimming-pool vibe. Frame sizes doubled-to-tripled to use the 4m walls.
- Blender build is fully procedural: `tmp/mandala-shop/build.py` rebuilds the whole scene
  headless in ~20s and renders 4 preview cameras (~17s each, OPTIX). Scene in
  `tmp/mandala-shop/mandala-shop.blend`; renders in `tmp/mandala-shop/renders/`; frame
  layout exported to `tmp/mandala-shop/layout-manifest.json` for the future web build.
- Shipped a teaser page (`index.html`): SANNA title card + three preview renders (copies in
  `assets/preview/`) that act as drift portals. Dashboard control + drift/registry wired,
  file://-safe, no sound. Added to the map room Pages list and ran `npm run registry`
  (world #12 in the drift pool — pull it if James wants it out until the real room ships).
- Known quirk: `assets/art/20230402_012714.jpg` has a malformed JPEG header (Blender loads
  it; browsers may not) — verify/re-save before the web build.
- Next: James art-directs from the renders, then lightmap bake + glTF export + the real
  walkable Three.js page (mouse-look + arrow keys, click-to-glide art viewing) replaces the
  teaser. More art incoming from James (~12 pieces, some mandala-adjacent).
