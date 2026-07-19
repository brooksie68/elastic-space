# Wildflowers at Dusk — Claude instructions

## Rendering

- Canvas handles rain, drifting cloud sprites, cedar framing, and foreground vegetation.
- Painted landscape plates are DOM images in `assets/landscape/`, stacked beneath the Canvas with CSS z-index and depth-specific blur.
- Runtime cloud and landscape PNGs have transparency; `*-source.png` files retain chroma green and are not loaded by the page.
- Rain renders behind clouds. Terrain and mountains are opaque.
- The scene is desktop-first; do not add mobile-specific compromises unless explicitly requested.
- The world runs a one-way timed arc (flora dissolution → giant's rise + thrum → 20s end blur);
  reload resets it. `REVIEW_SKIP_TO_GIANT` in world.js fast-forwards to the finale for tuning —
  ships `false`.
- Background vegetation ranks are offscreen canvases baked once (filters applied at bake time),
  planted along the near-ridge plate's pixel-sampled top silhouette; per-frame cost is one
  drawImage per rank. The giant lives in `assets/giant/` (runtime PNG + chroma `giant-source.png`).
- All page audio (rain bed + giant thrum) routes through the single shared sound control — any
  new sound must obey its mute/volume state.
