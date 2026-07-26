# Face Lab changelog

## 2026-07-26 — Claude + James (KEENTOOLS CLOUD PIPELINE LANDS — the professional head)

James's verdict on road B's socket surgery: "raw meat blinking past golf
ball eyeballs... we're just hacking. How can we make this professional?"
Answer: KeenTools Cloud API (he bought an account; key in .env as
KEENTOOLS_API_KEY; 600 free credits, ~120cr/head). Durable client:
`tools/keentools.mjs` (build/status/fetch; billing-safe polling — get-status
is free, get-3d-model bills EVERY redirect response so call it ONCE with
everything: glb + blendshapes=arkit,expression + texture).

THE CRITICAL INPUT SPEC (4 failed attempts before James found it in their
docs): photos must be FRONT + 40° LEFT + 40° RIGHT — pure 90° profiles make
reconstruction fail with unhelpful "Internal error". Stylized/painted
faces are FINE (the winning inputs were Blender renders of our painted
scan at 50mm, opaque bg, 1024x1280 JPEG — scratchpad render_40s.py).

Result (tmp/face-lab/keentools/head.glb, 45.8MB): his face on professional
topology, 30.6k verts, 55 ARKit keys — jawOpen opens a REAL mouth with
teeth, eyeBlink closes REAL eyelids, separate eye meshes, neck+shirt stub.
Renders render_kt_*.png, sheet keentools-head-sheet.png sent. Also useful:
photoreal "actor" version of the character (scan/photoreal_*.png, 9cr) —
generated for a failed hypothesis test but keepable as reference.

SAME SESSION, James's ask ("the mouth first — let's see him talking; and
the expressions in the lab"): (1) `assets/postmaster-kt.glb` (14.6MB,
wireframe-stripped) registered in the picker as "postmaster (KeenTools)" —
all 55 keys become sliders, presets/transitions/life layer work as usual.
(1b) FRAMING REWRITE (James: KT head loaded "super zoomed in"): the lab's
camera distance was hardcoded (0.52) and its centering guessed from the
bounding box — both meaningless across models (MPFB bust vs KT head differ
~10x in scale, and bboxes include arbitrary neck/shoulders). Now framing is
anchored to INTERPUPILLARY DISTANCE: eye meshes are found geometrically (a
small mirrored pair of primitives — KeenTools ships unnamed Head/EyeL/EyeR/
Teeth primitives under one node "mesh", so name matching never worked), then
radius = 9.3*IPD, target = eyeMid - 0.45*IPD, zoom clamps 4..28*IPD. Ratios
calibrated so the bust keeps its exact previous framing (computed 0.517 vs
old 0.52). Fallbacks: single both-eyes mesh (MPFB) uses width*0.62; no eyes
at all falls back to the old bbox ratio. Note: skin/eye texture pickers are
no-ops on KT (its meshes aren't named, and it carries its own baked texture).
(2) face-life.js grew RHUBARB_SHAPES_ARKIT — a second mouth vocabulary
(jawOpen/mouthFunnel/mouthPucker/mouthRoll* recipes per Rhubarb A–H
shape), auto-selected when a model has no viseme_PP. The dialog bench's
existing baked clips (DLO test-speech) now drive the KT head's real mouth
untouched. Tuning knob: the ARKIT table weights, by James's ear/eye.

WARDROBE, PIECE BY PIECE (James: "I'm dubious the cut-off-the-original stuff
will look like anything good... let's try the glasses first" — he was right):

1. CUT GLASSES: FAILED (render_mount_glasses_*.png). The original's rims are
   fused into the same polygon soup as the face — cutting yields broken arcs,
   no lens geometry, plus hat/hair shrapnel sharing the texture region. Assume
   the same for every cut piece; the dissection is reference, not assets.
   What DID work: measured mounting (eye centres + IPD from the eyeball
   primitives → scale/translate) landed the prop correctly first try.
2. GLASSES, PROCEDURAL: WORKS (build_glasses.py). Round wire spectacles from
   primitives sized in real millimetres via the head's own scale (IPD 0.588
   units = 63mm): 23mm lenses, 2.1mm wire (James doubled it), 11° pantoscopic
   tilt, temples measured to his ears. Brow intrusion fixed by MEASURING: a
   depth-map of the face surface under the upper rim arcs gives the exact
   forward push (8.8mm). Gotcha: include the bridge in that test and it
   demands 28mm because it hits the NOSE, which glasses are meant to rest on.
3. HAT, MESHY: WORKS FIRST TRY (props/hat-textured.glb, 30cr = 20 text-to-3d
   + 10 refine; text-to-3d returns an UNTEXTURED preview — refine is a
   separate billable step). Proper peaked service cap: crown folds, patent
   visor, braid band, embossed badge. Not yet mounted.
4. BEARD, GROWN FROM HIS OWN SKIN: FAILED after 3 iterations
   (build_beard.py). The idea is still sound — beard verts are copies of head
   verts so all 54 morphs inherit by index for free — but the look doesn't
   land: v1 exploded into ice spikes (bmesh REINDEXES after ops.delete, so
   per-vertex depths were garbage — carry the original index in a
   `bm.verts.layers.int` layer), v2 a smooth white blob covering half his
   face (region used a skull-width percentile ~2x too wide), v3 torn foam
   with the baked fibre texture washing out to flat white. VERDICT: stop
   hand-growing hair; generate the beard as a Meshy asset like the hat, then
   shrinkwrap-fit + kernel morph-transfer (both proven techniques).

5. HAT MOUNTED (mount_hat.py) after three tries — worth recording because
   both failures were "measure the wrong thing": (a) visor detected by
   RADIUS put the cap on backwards (the crown's rear flare reaches further
   than the visor — detect by the LOWEST-hanging tip instead); (b) seating
   by a percentile of the lower half buried the band, badge and visor
   INSIDE the skull (seat on the crown ring's true opening rim, visor
   excluded by radius). James's verdict on the generated cap itself: soft
   flat-cap read, no band at the back, badge lost under the crown overhang
   — he'll supply a visual reference for a better generation. Mounting is
   now a solved drop-in step.
6. THE BEARD LAB (tmp/face-lab/beard-lab/, James's idea: "it doesn't cost a
   dime in Blender — could you do 100 iterations and teach yourself?").
   build_variant.py builds ONE variant from a JSON spec across four
   techniques — shell / tufts / cards / hybrid — all inheriting the head's
   54 morphs by root-vertex index, then renders and self-scores it;
   sweep.mjs generates the parameter space and ranks everything.
   Automatic filters: overshoot, burial in the head, mouth blocked WITH THE
   JAW OPEN, coverage fraction, jaw-open penetration. Ranking metric is
   silhouette complexity (perimeter/sqrt(area) of the beard-only alpha mask)
   + coverage fit — foam scores low, strands score high.
   CALIBRATION LESSONS (the first metrics rejected everything): hair roots
   sit under the skin by design, so any-vertex-inside fires on every
   technique — only burial past ~5mm counts; a walrus mustache covering a
   CLOSED mouth is correct, so blockage is only measured jaw-open; a
   spread-ratio "spike" test punishes exactly what makes hair read, so
   protrusion is compared against what the variant asked for; and
   alpha-BLEND materials write no alpha to the film, so hair cards measured
   as 0% coverage until the mask pass switches them to CLIP.
   FIRST RESULT: cards 0.83 vs shell 0.15 — the score ordering matches
   Claude's eye, and the first random tufts/cards variants already beat all
   three hand-tuned shells.
   THREE ROUNDS RUN, 425 variants (~7s each, scoreboards kept as
   scoreboard-r1/r2.json + runs-r1/r2/). Each round the JUDGE improved, not
   just the knobs — that was the real work:
     r1 (120): winners all wispy stubble. Silhouette complexity alone
       rewards thin sparse strands. → added DENSITY (block-averaged mask:
       solid coverage vs mist) and gave it equal weight.
     r2 (150): denser, genuinely hair-like, but hair climbed to the eye
       bags — "unshaven drifter", not chops. Coverage-as-fraction-of-FRAME
       was camera-dependent AND its target had been anchored to r1's wispy
       winners (a metric inheriting its own bias). → coverage is now beard
       area / head-silhouette area, and a new CHEEK INTRUSION metric counts
       hair above the nose tip near the midline. Geometry fix: chops had no
       depth constraint so they spread across the front cheeks.
     r3 (150): structure now clean (no spikes/burial/cheek fuzz, mouth
       works jaw-open), best = cards 0.92, tufts 0.81, shell 0.61.
   VERDICT (sheet beard-sweep-sheet.png): the automated metrics have
   PLATEAUED. They can enforce structure but cannot judge "reads like this
   character's beard" — the results still say unshaven rather than white
   walrus + chops. The missing ingredient is a REFERENCE: score against a
   silhouette mask traced from the concept art, not scalar targets. Also
   suspected: real beards hang in gravity-following locks (length + droop +
   layering), which none of the four techniques model.
   Metric bugs worth remembering: Blender image rows start at the BOTTOM
   (an "above the line" test silently measured below it, rejecting
   everything); alpha-BLEND materials write no film alpha so cards measured
   0% coverage until the mask pass switches them to CLIP.

The repeatable character pipeline is now: concept art → de-dress
(image-to-image) → image-to-3D scan → Blender 40° renders → KeenTools →
ARKit head. Agreed stack going forward: FaceTracker for James-performed
lines (he loves doing voices; ElevenLabs speech-to-speech keeps his
cadence in other timbres), Audio2Face or Rhubarb→ARKit mapping for
unperformed NPC lines, prompt-language performance scripts (Claude
compiles stage directions to preset/gaze timelines anchored to ElevenLabs
word timestamps). NEXT: lab picker entry for the KT head + James judges
likeness/texture, then props mounting, then the viseme adapter.

## 2026-07-25/26 — Claude (night 2: scan landed, face registration 3 attempts, not converged)

Credits spent ~39 of James's approved ~50, both wins:

- **De-dressed face (2D)**: tmp/face-lab/scan/dedressed_{0,1,2}.png —
  image-to-image (nano-banana-pro, 9cr, generate_multi_view) removed
  hat/glasses/beard from the concept-art head crop. Strong likeness, James
  saw the sheet. Front/side/back consistent.
- **3D face scan**: tmp/face-lab/scan/head-scan.glb (30cr,
  multi_image_to_3d chained via input_task_id, meshy-6, no remesh, 105k
  verts + texture). Beautiful, full skin coverage, THE wrap target.
  Renders scan_{front,threequarter,side}.png.

Then the hard part — snapping the MPFB chassis head (built fresh w/ 67 face
keys, eyes/teeth/tongue, old_caucasian_male skin) onto the scan. THREE
approaches, all failed differently (renders render_wrap{2,3,4}_*.png, state
in chassis-wrapped.blend = v4, scripts wrap_chassis{,2,3,4}.py):

1. v2 dial solve (autofit port, full-coverage data): closed 0.3 of 19mm rms,
   picked a HOOK nose for a bulb-nose scan. Something structurally wrong in
   correspondence directions vs dial basis — don't trust radial pairing.
2. v3 kernel-field ICP (no dials): smooth but radial rays mispair
   vertically offset features — chassis nose tip paired with the scan's
   under-nose → droopy grim face. Alignment insight: scan is IPD-aligned so
   the mean gap is only ~3mm; the error is LOCAL feature mispairing.
3. v4 landmark RBF pre-warp + ICP: right idea (deltas read semantically:
   nose tip +12mm up, jaw +12mm wide), but band-based landmark detection
   mis-picked brow (x+13mm off-center) and noseroot (-20mm low, top of the
   scan's bulb) → crumpled scowl.

SAME NIGHT, LATER — ROAD B BREAKTHROUGH (James picked it: "the first two, I
could live with and be pretty happy" → keep the scan AS the head):
tmp/face-lab/transfer_morphs.py — the scan mesh itself learned 66 of the 67
morphs by kernel-weighted delta transfer (KR 12mm) from an iris-aligned MPFB
donor; painted eyes recessed 7.5mm (cosine falloff, applied to basis + all
keys) with the donor's real high-poly eyeballs seated in the sockets. State:
scan-morphed.blend, renders render_tm_*.png, sheet sent (morphed-head-sheet).
VERDICT BY RENDERS: neutral + smile + jaw genuinely good — it's him, moving.
Blink/brows diluted: the 12mm kernel averages thin-lid deltas with static
cheek/brow neighbors — fix with per-region kernel (~6mm near eye centers),
possibly amplitude renormalization per key (match donor max |delta| in the
region). Eyes read slightly googly-forward — recess depth/eyeball scale are
by-eye tuning items for James. Mouth slit deferred deliberately (mustache
covers it; jaw acts through the beard modules later).

v2 SAME NIGHT on James's notes (bulgy eyes, more top lid, morphs
underwhelming): transfer_morphs2.py / scan-morphed2.blend — two-tier kernel
(5mm within 34mm of eye centers, 12mm elsewhere), per-key amplitude renorm
(donor max/scan max, clamped 1.0..1.8), sockets deepened to 10mm, sculpted
upper-lid hood (rim band pushed out/down over the eyeball), eyes tucked
back 2.5mm. RESULT: blink actually closes, brows visibly lift, lid reads as
a real eyelid (sheet morphed-head-v2-sheet.png). Known wart: crease
jagginess above the lid at full blink (renorm coarseness) — polish item.

v3 + LAB EXPORT same night (James: v2 lid droopy Play-Doh, "are you just
guessing?" — yes, hand-sculpted hoods were guesses; and "when do I see it
for real?"): transfer_morphs3.py grafts the DONOR's real eyelid anatomy
(scan eye-region verts blended onto the donor lid surface, R 13→21mm
feather; eyes at native donor position, no recess/hood hack). Graft rim was
ragged → export_lab.py smooths the annulus (per-key Laplacian ×2) and
exports assets/postmaster-scan.glb (41MB, 66 morphs, real eyeballs) —
REGISTERED in the lab picker as "postmaster (scan, road B)". James can now
drive him live: sliders, transitions, auto-blink life layer.

NEXT SESSION: (1) blink-crease smoothing + eye scale/depth by James's eye;
(2) mount the cut props (hat/glasses/beard/brows from pieces/) on the
morphed head — likely retire the painted-on scan brows under the cut brow
modules; (3) morph QA sweep in the lab picker + lip-sync test. Landmark QA
loop remains the pickup IF we ever return to road A (chassis molding) — render
both meshes with landmark markers, verify by eye BEFORE warping; fix the
brow/noseroot bands; then v4's pipeline is likely sound. Fallback
architecture if registration keeps resisting: use the scan mesh itself as
the head + wrap_transfer4-style morph-delta transfer (it's bald and
unmasked — a far better transfer target than the dressed statue was), with
chassis teeth/eyes; costs = lip-seam + eye-socket surgery on the scan.
Useful hard-won facts: exterior-visibility test (ray from outside along
normal) cleanly protects mouth-bag/nostrils; eye pockets must be excluded
from correspondences but NOT frozen; iris-color detection on the scan
texture gives eye centers/IPD reliably; mask modifier must be muted before
evaluated-mesh reads (vert-count mismatch); `link.to_node is node` fails —
bpy wrappers aren't identity-stable.

## 2026-07-25 — Claude (STRATEGY PIVOT: chassis + original surfaces; night 1 dissection)

James's verdict on the dressed candidates: a "Blender-beginner imitation" —
he wants the character we already have, not a rebuild, AND the full repeatable
pipeline (movable face, separated props, lip-sync, swappable wardrobe, no
compromises; "a couple more nights doing it right"). Agreed architecture:

- MPFB chassis (morphs, mouth interior, rig) carries animation; ALL likeness
  comes from the original Meshy model: texture bake for the skin, region-cut
  pieces for props, and a WRAP (direct vertex snap, R3DS-style) for the face
  geometry — sliders only approximate, wraps copy.
- The face scan for the wrap: concept art (assets/ref/Normal.png, only
  403x499 — face ~60px) needs a high-res de-dressed regeneration:
  image-to-image (remove hat/glasses/beard, bald) then image-to-3D.
  AWAITING JAMES'S CREDIT APPROVAL (~18cr for 2 views + ~30cr textured
  image-to-3D). Future characters: generate bald + prop-less, accessories as
  separate Meshy tasks — the fused problem never exists again.

Night 1 built: tmp/face-lab/dissect.py — postmaster-v1.glb (152k verts, the
dense unrigged original) cut into tmp/face-lab/pieces/piece_{hat,glasses,
facialhair,brows,hairfringe,head,body}.glb, each keeping original textures.
Per-FACE classification (texture color + position; per-shell fails — Meshy
shards cross semantic boundaries), majority-vote smoothing over face
adjacency for speckles. Sheet sent (dissection-sheet.png). Gotchas: bpy
node-wrapper identity (`link.to_node is node`) is NOT stable — compare by
socket/type instead; Meshy glb images are unnamed — find base color via the
BSDF link, never by name. Head piece is wrap-target only (beard-texture bleed
on it is fine). NEXT (night 2): scan + wrap + texture bake + prop mounting;
night 3: morph QA, lip-sync test, lab picker entry.

## 2026-07-25 — Claude (candidate round 2: full postmaster dress)

James: bare heads aren't judgeable — "we need hair, hat, glasses, and beard
and clothing." Built tmp/face-lab/dress_candidates.py: fresh MPFB human per
candidate (sculpt.blend is helper-stripped, mhclo assets can't fit it), the
candidate's dials from candidates.json baked into the basis BEFORE assets
load so suit/hair/eyes fit the dialed head. Dress kit:

- Real MPFB assets: male_elegantsuit01 + short01 hair forced to solid silver
  (brightening the near-black hair texture is useless — override Base Color,
  keep alpha). No eyelashes (mascara lesson). No texture-card eyebrows.
- Procedural props placed from measured landmarks (eye centroids/IPD from the
  eye mesh, nose base, chin, head half-width): navy postal cap (band, flared
  crown, squashed-sphere top, visor, brass badge), round wire glasses
  (torus rims + bridge + temples), and cotton-ball facial hair — sphere-chain
  beard along the jaw arc (chin to chops), two-sphere walrus mustache,
  squashed-sphere brows. All radii scale with head width, so every candidate
  wears the same kit correctly.
- Lessons: shell-style beards (offset face duplicates) read as lumpy foam or
  a smooth bib no matter the smoothing — sphere-chain primitives are the
  storybook answer. Front fill light needed or the glasses bury the eyes.

Sheet sent (dressed-candidates-sheet.png, 4 candidates x front/threequarter).
Awaiting James's pick/reactions; per-candidate .blends saved as
dressed_<name>.blend for fast iteration.

Round 2b same session, James's notes applied: cap -10% (band half_w*1.03,
flare 1.17, lower crown), glasses red + rims 6mm farther apart, beard got a
fiber shader (world-space noise squeezed along Z -> vertical striations
driving bump + color, kills the plastic look), and the businessman's suit
swapped for the reference postal outfit — casualsuit01 shirt tinted cream
(HSV desat + brighten + warm multiply on its texture), procedural gray-blue
vest (offset shell from the EVALUATED shirt mesh; raw shirt.data gives
ragged placket slivers, body-sourced sits under the loose shirt — shirt-eval
+ boundary-vert smoothing is the recipe), brass buttons, cream chest-fill
shell behind the open collar, dark red sphere-chain tie.

## 2026-07-24 — Claude (base-face candidate round 1, same night)

After the auto-fit verdict, James browsed the MakeHuman community model
gallery via a local scrape (tmp/mh-models/scrape.mjs -> index.html, all 82
models, thumbnails + text filter; site itself is 2 pages, no search) — dud
for our need ("about sixty percent attempt to see boobies"). Fallback ran:
four dialed base-face candidates to the Carl-from-Up brief
(tmp/face-lab/candidates.json + render_candidates.py): A-carl (square
friendly), B-santa (round jolly), C-toby (jowly heavyset), D-gnome2 (approved
gnome recipe warmed). Contact sheet sent (candidates_sheet.jpg).

- Big uncanny lesson: the default dark eyelashes read as mascara on an old
  man — hidden for all male renders (hide/swap eyelashes04 in any male
  character build).
- James's verdict: "getting better, but not quite ready — keep working at
  it." No candidate picked yet; more rounds next session (noses can
  overdrive to 3.0, mix-and-match between candidates is cheap).

## 2026-07-24 — Claude (auto-fit pipeline: artwork -> character, phase 1)

James asked for automation: approved artwork to animatable character without
hours of hand-sliding. Built the auto-fit pipeline in tmp/face-lab/
(autofit.py + autofit_finish.py), validated on the Meshy postmaster:

- Measured alignment (no hand constants): glasses shells found by
  brown-texture detection give eye height AND interpupillary distance
  (scale); ear centroids give depth. Hand-me-down landmark constants from
  wrap_align were 36mm off — measurement is the law now.
- Skin masking: cap/glasses/beard/chops/back-hair excluded via geometric
  zones + a confident-skin texture test (warm r>>b and lit — a naive
  "white hair" test kept hair shadows and pale skin fooled it both ways).
  Mask dilation, outward-first raycast correspondence (v4 machinery),
  excluded-face hit rejection.
- Bounded ridge least-squares over the 140 identity-dial deltas (numpy
  coordinate descent, no scipy in Blender), column-normalized, opposing-pair
  + head-shape-family pruning, support filter (dials with no data in their
  region stay neutral).
- HONEST FINDING: on this character, geometry alone is data-starved — cap +
  glasses + beard cover ~85% of the head; clean skin = ~81 points (and ear
  rays are garbage — excluded). The working architecture is hybrid:
  geometric fit where skin is visible + Claude render-compare rounds against
  the concept art (the loop that built gnome_dials.json) where it is not.
- Ship: dials land on James's approved "postmaster-head" recipe; the
  geometric residual (smoothed, outlier-rejected) is baked into basis+keys
  of a new export so expression morphs survive — verified by smile/jaw
  renders (render_final_*.png).
- assets/postmaster-fit.glb (13.2MB, 207 morphs, Human.rig) + model picker
  entry "postmaster (auto-fit)". Flow: pick that model, apply the
  "postmaster-head" preset -> fitted head, every dial live at its value.
  Gotcha fixed on the way: export grabbed the Meshy armature (24 joints +
  walk animation) instead of Human.rig — select the modifier's armature.

Next: James's by-eye pass on the fitted head; storybook texture bake from
the Meshy model; wardrobe framework (fitted hair/beard assets, rigid props,
texture layers — plan agreed 2026-07-24).

VERDICT (James, same night): the fitted head is "very disturbing, did not
look like the character." Standing direction: Carl-from-Up friendly
exaggeration (big bulbous nose, wide chin, warmth over statue-accuracy),
accessories carry the likeness — chops/mustache/hat/glasses before more
under-face work. James is browsing the MakeHuman community model gallery
(makehumancommunity.org/models.html, http only) for a better base face.

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
