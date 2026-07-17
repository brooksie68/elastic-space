# Changelog — Mandala Shop (storefront name: "Sanna")

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## 2026-07-16 — Claude (with James) — session 2: CURATOR MODE SHIPPED

- Curator mode v1 built and live, triptych authoring included (James's call: "fold that
  puppy into v1"). Entered only via the admin panel curate pill (`?curate=1`, served only);
  the old "coming soon" toast is gone.
- Reusable framework as planned: `src/core/curator.js` is world-agnostic — the world hands
  it an adapter (THREE + scene, live layout, analytic wall/floor geometry, slot CRUD hooks,
  frame kit, protected ids, input locks). A future gallery world reuses it by building the
  same adapter with its own kit/geometry.
- Features: bottom art tray scanned from `assets/art/` via the new server endpoint
  (thumbnails, ×N placement badges, blank-frame tile, rescan button); pick up → ghost
  preview rides a raycast (walls snap flush + yaw from the wall, floor gives easel or
  lean); kinds wall/cord/triptych on walls (keys 1–3 or pills), easel/lean on floor;
  triptych drops three linked panels (data-driven `slice`/`group` — the hardcoded
  TRIP_SLICE in world.js is gone, layout.js trip slots migrated); click selects (gold
  outline, trio selects together), drag slides along/between walls, arrows nudge 1 cm
  (Shift 10 cm), wheel or [ ] resizes, Q/E turns floor pieces, frame swatches + wall↔cord
  switch + take-down on the HUD; Ctrl+Z undo (snapshot stack); preview toggle hides all
  chrome; explicit save (dirty dot) → PUT with timestamped backup; revert reloads last
  save. The shimmering blank is protected — it's a drift exit, delete is refused.
- world.js refactor: slot registry (add/remove/update/reset with disposal), curator gates
  on focus-glide/drift exits/door walk-out/hover cursor, arrows/wheel lockable, WALLS
  (octagon + door keep-out band) exported to the adapter. Walking + collision untouched.
- Server: `GET /api/worlds/:slug/art` (image scan) and `PUT /api/worlds/:slug/layout`
  (shape validation incl. path-traversal guard; backup to `tmp/<slug>/layout-backups/`
  before every write; rewrites `assets/layout.js` in the same globalThis + Blender Z-up
  format). `build.py` layout.js reseed now gated behind `MS_WRITE_LAYOUT=1` — the file is
  curator-owned. 4174 server restarted on the new code.
- Verified statically (house rules, no browser QA): 11-check Node suite green against a
  scratch-port server — endpoint round-trip (written layout deep-equals the PUT), backup
  byte-match, malformed/traversal rejections, door-band + yaw + inset math against the
  shipped slots. James is the first real user of the UI.
- Not done: index.html build stamp still says r2 (bump to r3 at wrap-up — no mid-session
  .html edits). The quirky-JPEG worry is dropped: James confirms the triptych renders.
- Post-walkthrough tweaks (same session, James's notes): (1) "clear all" button in the
  curator topbar — takes down every piece except the protected drifting blank, confirm
  dialog, one Ctrl+Z restores the whole hang; (2) camera speed capped — stored wheel
  impulse clamped to ±1.5 and total travel speed hard-capped at TOP_SPEED = 3.0 m/s
  (~25% of the old uncapped wheel-rush top, per James's motion-sickness call; plain
  walking at 1.7 unchanged); (3) control bar moved from top-left into a shared bottom
  dock with the tray — pinned to the tray's left edge, 10px above, rides tray width
  (selection HUD and toast bumped up to clear it). No autosave, confirmed to James:
  explicit save only, amber dot = unsaved; plain F5/tab-close does NOT warn (offered a
  beforeunload guard, not yet requested).
- Curator UI iterations with James live: dock evolved bottom-center → left rail —
  toolbar flush to the top-left corner, tray touching it below, flush left, running to
  the page bottom; single column of 140px thumbnails, 12px even padding/gaps, scrollbar
  fully hidden (scroll still works); rescan pinned at the strip top; HUD + toasts
  bottom-center.
- James caught a real bug via the triptych "mirroring on its own": wallRightDir was
  negated, so any trio move/resize swapped the outer panels (and wall-piece arrow-nudges
  ran backwards). Fixed — slice 0 verified to sit on the viewer's left against the
  shipped seed. The accident became a feature at his request: mirror toggle (HUD button
  or M) — flips a piece's art horizontally via texture transform (`flip` slot property,
  server validates it, 4174 restarted); on a triptych it flips each panel AND swaps the
  outer slices so the whole composition mirrors. Blanks refuse politely.
- Live curation pass with James (running into the small hours of 2026-07-17), curator UI
  iterated to its v1 shape:
  - Dock rebuilt as a left rail flush to the screen edges: actions bar snug in the
    top-left corner, vertical thumbnail strip touching it directly below and always
    running to the bottom of the page. 140px tiles, even 12px padding and gaps, vertical
    scrolling only with the scrollbar fully hidden, rescan button pinned in the strip
    header. HUD and toasts recentered bottom-center. Room keeps ~92% of the screen.
  - Triptych spread control: , / . keys (2cm steps, shift = 10cm) plus closer/apart HUD
    buttons and a live gap readout. Moves and drags preserve the set gap (it used to snap
    back to the formula), resize scales it proportionally, clamp 0–1.5× panel width
    within wall space. Undoable.
  - Per-slot mirror toggle (`flip` in layout.js): M key or HUD button flips a piece
    horizontally at the UV level; a mirrored triptych also swaps its outer slices so the
    composition flips whole. Blank frames decline.
- Where things stand: curator v1 is real and James spent the night hanging art with it —
  his verdict: "so cool… like a dream come true." Next: his queued wishlist (lighting
  pass, proprietor, music; Meshy Premium lands 2026-07-17 for props/characters).

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
