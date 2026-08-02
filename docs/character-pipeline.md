# The character pipeline — prompt pack + build chain

The house process for turning concept art into an expressive, animated 3D
character. Instance #1: **the Postmaster** (Dead Letter Office). Future
characters copy this file's skeleton and swap the bible + references.

Ground rules (hard-won, see face-lab changelog):

1. **One family.** Every asset is generated in the same run of prompts from the
   same references. Never mix pieces across generation families; never cut
   pieces off an existing model (memory `no-cutting-3d-assets`).
2. **Tune, then run.** Each prompt's output gets James's judgment before the
   next prompt runs. Later prompts take the *approved output* of earlier ones
   as their attached reference, not the original art.
3. **Prompts stay minimal** — concept + hard specs only. The image model is
   the artist.
4. Every Meshy generation states its credit cost and waits for a go.

---

## The aesthetic anchor (James, 2026-07-31)

Canonical references, both in `src/worlds/dead-letter-office/assets/ref/`:

1. `05_POSTMASTER.png` — the character. Attach to every character prompt.
2. `Dead-Letter-Office.png` / `01_ROOM.png` — the room, palette, and mood.
3. `Normal.png`, `Exasperated.png`, `Surprised.png` — expression references.

James's directive: these are lower-res than our target, **but the vibe is the
ideal — stick to this aesthetic.** Higher resolution, same soul.

### Character bible — paste VERBATIM into every prompt

> The Postmaster: a short, stocky elderly man with friendly exaggerated
> proportions — large head, large hands, big round nose. Thick white hair
> around the back and sides of his head and over his ears, showing below a
> navy postal cap with a round gold badge. Full white beard with a thick
> white mustache. Round gold wire-rim glasses. Cream shirt with sleeves rolled to
> the elbows, dark navy vest with brass buttons, dark brown tie, small gold
> wing pin on the vest. Worn olive-brown trousers, black work shoes. Warm
> muted palette. Kindly but tired. Match the attached reference exactly.

### House style line — paste VERBATIM into every prompt

> Rendered as a warm painted storybook illustration at high resolution,
> keeping the reference's palette and character (the reference is pixel art;
> the output is not).

---

## Phase 1 — image prompts (ChatGPT; James runs, both judge)

**P1 — canonical turnaround** (attach `05_POSTMASTER.png`)

> [bible] [style line]
> One character turnaround sheet: the same figure in front view, left side
> view, and back view, all at identical scale, standing straight with arms
> relaxed at his sides. Fully dressed: cap, glasses, beard, full uniform.
> Plain light-gray background, even flat lighting, no cast shadows, full
> figure in frame in every view.

**P2 — head under everything** (attach approved P1)

> [bible] [style line]
> The same man's bare head only: completely bald and clean-shaven — no cap,
> no glasses, no beard, and no hair, because the hair and beard are separate
> pieces that mount onto this head. This is the face underneath the beard,
> so the jaw, chin, and cheeks are narrower than the bearded silhouette. The
> big round nose is unchanged.

(NOTE: bald here is the generation state of the head ASSET, never a fact
about the character — he has thick white hair round the back and over the
ears, which is its own asset, P3b. Getting this backwards is the recorded
"false conclusion" mistake.)
> Three views at identical scale: straight front, 40 degrees left, 40
> degrees right. Neutral expression, mouth closed, eyes open. Plain
> light-gray background, even flat lighting, no cast shadows.

(The three views are the KeenTools input angles — front + 40°L + 40°R.
Profiles fail; painted style is fine.)

**P3 — beard** (attach approved P1 + approved P2)

> [bible] [style line]
> The character's beard and mustache as one hollow piece, as if worn by an
> invisible face: full white beard, thick white mustache, real sideburns
> reaching up to where the ears would be. The mouth gap is a plain open hole
> and nothing more — no lips, no teeth, no skin, no anatomy of any kind;
> only the flat gray background shows through it. The underside of the beard
> hangs open and loose — nothing curls under or closes into a solid bottom.
> Three views at identical scale, side by side, camera at eye level for
> every view — never from above: 1. Front view, straight on. 2. Left side
> view, straight on. 3. Three-quarter view.
> Plain light-gray background, even flat lighting.
> (Carries the P3b hair lessons preemptively: gaps are plain holes with
> anatomy banned, undersides hang open, camera pinned to eye level.)

**P3b — hair** (attach approved P1 + approved P2)

> [bible] [style line]
> A wig of the character's hair: thick wavy white hair in a horseshoe shape
> wrapping the back and sides of the head, bald-open on top, with plain
> openings where the ears would poke through. No ears, no skin, no head, no
> face — just the hollow wig.
> Three views at identical scale, side by side, camera at eye level for every
> view — never from above. The wig hangs upright in all three with the hair
> falling downward, and the hollow interior and top opening are not visible
> in any view: 1. Front view, straight on. 2. Left side view, straight on.
> 3. Back view, straight on from directly behind — a wall of hair only.
> Plain light-gray background, even flat lighting.
>
> (v1–v4 lessons: "over the ears" sculpts ears INTO the hair — describe ear
> gaps as plain oval holes, ban anatomy explicitly. Camera must be pinned to
> eye level or the back view goes overhead. THE BOWL DIAGNOSIS, James's:
> the bowl read comes from the BOTTOM curling under into a closed round
> base, not from the top opening — the bottom must be an open hem at the
> nape where a neck visibly comes out ("never curls under"; "as if worn by
> an invisible head"). The top gap is fine when framed as space for the cap.
> Faint ear hints are tolerable — conform-fit absorbs them; view
> INCONSISTENCY is what's worth rerolling.)

**P4 — glasses** (attach approved P1)

> [style line]
> Only the round gold wire-rim glasses from the reference, floating on a
> plain light-gray background: three views at identical scale — front, left
> side showing the full temple arms, and three-quarter. No face, no other
> objects. Even flat lighting.

**P5 — cap** (attach approved P1)

> [style line]
> Only the navy postal cap with its round gold badge from the reference,
> floating on a plain light-gray background: three views at identical
> scale — front, left side, and back. No head, no other objects. Even flat
> lighting.

**P6 — rigging body** (attach approved P1 + approved P2)

> [bible] [style line]
> The same man, full body, prepared for 3D rigging. He is a squat, gnome-like
> fellow: short, only about four and a half heads tall, with a big head, a
> wide barrel torso, a round belly, short thick legs, short arms, and large
> hands. He is compressed and stocky, not a standard adult figure — match the
> proportions of the first reference exactly. Bald plain head matching the
> attached bare head (no cap, no glasses, no beard, no hair), fully dressed
> in his uniform, standing in a relaxed A-pose — arms straight, lifted about
> 40 degrees from his sides so there is clear open space between his arms and
> his body, palms toward his legs, fingers slightly spread, feet
> shoulder-width apart. Three views at identical scale: front, left side,
> back. Plain light-gray background, even flat lighting, no cast shadows,
> full figure in frame in every view.
>
> (v1 lesson: "prepared for 3D rigging" drags proportions toward standard
> adult anatomy — the character came back taller and thinner. Counter it with
> a head-count spec ("four and a half heads tall") and an explicit
> do-not-idealize order; head-count is the strongest proportion lever.)

---

## Phase 2 — Meshy (one generation per asset)

**James drives the Meshy canvas/AI himself** (his call 2026-07-31 — eyeballs on
every result; no API generation calls from Claude this round). Claude's job:
write the per-piece brief, then pull finished models from the library via
`meshy_list_tasks` / download.

Settings that MUST survive into every generation — say them to the Meshy AI
explicitly, it defaults remesh OFF (that's how the old beard arrived at 1.49M
verts): **remesh ON, quad topology, ~40,000 target polycount, export GLB + FBX.**

Order, using multi-image-to-3D with the approved view sheets:

1. Body (P6 views) — 5–30cr
2. Head (P2 views) — 5–30cr
3. Beard (P3 views) — 5–30cr
4. Hair (P3b views) — 5–30cr
5. Cap (P5 views) — 5–30cr
6. Glasses (P4 views) — 5–30cr

Judge each result against viewing distance before the next spend.

---

## Phase 3 — the mechanical tail

1. **Head → Faceit** (RETIRED 2026-08-01: KeenTools — its FaceBuilder fits a
   realistic-human template and structurally deletes stylized proportions;
   the v3 postmaster head came back a bald heavyset stranger. Doctrine now:
   the Meshy mesh IS the character; the rig comes TO the mesh.) Route: Meshy
   head into Blender, GENERATE eyeballs + inner-mouth geometry, Faceit
   2.3.73 landmark pass → 52 ARKit keys on the mesh's own topology.
   Escalation: Polywink (€299/character, 24h). Body: Auto-Rig Pro available
   alongside Mixamo. Add-on zips: `ai-projects/_blender-add-ons/`.
2. **Body → Mixamo** (free Adobe ID): auto-rig, pull test clips (walk, idle,
   carry). Standard skeleton = Unity Humanoid.
3. **Assemble in Blender** (headless; per-world .blend under `tmp/`): head
   onto the head bone, beard conformed to the face — interactively in a
   viewport, never by numeric passes over chat — cap and glasses mounted
   rigid to the head bone. Export ONE FBX with blendshapes.
4. **Unity** (`_unity/es-characters`, read its CLAUDE.md): import, extract
   textures, mark Humanoid, retarget animations, NavMesh behaviors.
5. **Face in Unity**: buy SALSA LipSync Suite (~$40, James approved
   2026-07-31) once the morph-carrying head is in-engine — it drives lipsync
   from audio plus blink/eyes, replacing homemade face code. Paid animation
   packs come after Mixamo testing proves retargeting (James approved
   spending; libraries reuse across all future Humanoid characters).

---

## Status

- 2026-07-31: pack drafted, aesthetic locked to the pixel-art references
  (higher res, same vibe).
- 2026-07-31 late: P1 (turnaround) and P2 (bald head) generated fresh by
  ChatGPT from prompt text alone, both approved — sheets + per-view crops in
  `tmp/dead-letter-office/` (`postmaster-v2-*`, `postmaster_head-v2-*`).
  P3b hair approved on v5 after the bowl saga (lessons inline above).
- 2026-07-31 latest: **PHASE 1 COMPLETE.** All seven sheets approved + cropped
  in `tmp/dead-letter-office/`: turnaround, A-pose body (v2 after the
  squatness fix), head, beard, hair (v5), glasses, hat.
- 2026-08-01: **PHASES 2–3 RUN.** All six Meshy pieces generated first-try via
  API (James's go, 180cr, `tmp/dead-letter-office/meshy-v2/`); head through
  KeenTools (54 morphs) → Face Lab picker as "postmaster v3 (new family)";
  James rigged the body at Mixamo himself + downloaded 12 clips. Blender
  assembly iterating in `meshy-v2/assembly/` (assemble_v3/assemble_b scripts in
  session scratchpad — COPY INTO tmp NEXT SESSION, scratchpads die): rigged
  body + UV re-transfer (Mixamo rebuilds UVs!) + KT head seated (4.0
  heads-tall scale; ear-span sizing is a trap — use feature bands) + all four
  accessories mounted parametrically. Round 3 sheet: good face/beard/glasses;
  REMAINING: collar seam (black gap + bare neck column — cut interplay),
  hair too far back/sparse from front, cap could sit lower.
- 2026-08-01 (global wrap): **KT HEAD RETIRED — James's decision after the
  art-alignment review** (family mismatch: realistic KT head vs gnome props;
  see face-lab changelog for the full verdict). Faceit 2.3.73 + Auto-Rig Pro
  installed and verified in Blender 5.1. Next session: gnome head + generated
  eyeballs/inner-mouth → Faceit landmark pass → judge the 52 keys. The
  assembly machinery (feature bands, UV transfer, despeckle) carries over;
  only the head changes. James's render gate remains unpassed.
- 2026-08-01 (day): **anatomy retrofit REJECTED, CC5 PIVOT** — the Faceit
  route's install-eyes-and-teeth step, done headless (EyeForge + Lambrador
  jaw, auto-landmarks, parametric seating, lid/lip cuts), came out uncanny
  (shredded lids, jaw scar) and James parked it: scripted vertex surgery over
  chat hit its ceiling again. New plan: Reallusion **Character Creator 5 +
  Headshot 3** head-wrap (their rigged topology + full anatomy conforms to
  OUR mesh shape; stylized is a first-class CC market) + iClone 8/AccuPOSE
  for AI video mocap. Clean head exported for it:
  `tmp/dead-letter-office/meshy-v2/cc5/`. Phase 3 step 1 will be rewritten
  once the wrap verdict is in; Faceit stays as fallback/non-humanoid route.
  Full detail: face-lab changelog 2026-08-01 (day).
- 2026-08-01 (night): **THE BODY QUESTION ANSWERED — nothing to buy.** James
  asked for a mesh matching the postmaster's build (short, rotund, ordinary old
  man — explicitly NOT a dwarf/gnome/fantasy figure: "a Santa Claus body, but
  shorter"). There is no such product: short is a typed height, chubby is morph
  sliders, and the market sells the slider set, not the man. He owns stock CC5
  only (175 embedded sliders, 10 Body Morph presets, all slim/fit). Upgrade
  routes if the built-ins fall short: HD Ultimate Morphs $149 (potbelly / beer
  belly / love handles / aging sliders) or ~$40 of Daz (Old Chap + Aging Morphs
  for Genesis 8) through CC5's Transformer, which supports Genesis 3/8/8.1/9.
  Claude drove CC5 by desktop control for the first time — body swap verified to
  leave the head untouched, then a reset trap (below) forced a full restart from
  the clean project. Head tilt and shortness both still open.

  **CC5 house runbook (first pass — the click-path facts that cost us time):**
  1. `Modify → Proportion → Reset All` resets BONE edits ONLY. Morph slider
     values are a separate layer that survives it and stacks invisibly on top of
     any Body Morph preset. There is no reset-everything button — reopen a clean
     `.ccProject` instead. Proportion and Adjust Bones are different tools.
  2. The scroll wheel does NOT zoom the viewport. `F` front, `S` right, `A` left,
     `D` back, `J` face, `Home` reset. `K` ("All") frames the whole scene incl.
     lights and loses the character; `J` is the way back.
  3. Content Manager = `Window → Content Manager` (F4). Body-only morphs at
     Template → Actor → **Body Morph** (toggle Pack→Item for individual entries).
  4. Headshot 3 mesh alignment uses 24/32/35 **alignment points** with auto-detect
     for the essential 24, source and target in separate synced-camera views —
     never hand-position one head over the other. After auto-detect, drag spline
     nodes OUT to the concept silhouette or the fit pulls toward normal anatomy.
     Never scale head size with viewport transforms. Export sculpts to Blender
     **as a morph**, never as a full avatar, or the rig and 54 keys are lost.
  5. Baseline project file: `tmp/dead-letter-office/Postmaster-CharacterCreator/
     RL_CC3_Plus.ccProject` (rigged head + 54 morphs on the neutral body).
     `Postmaster.ccProject` is the pre-wrap raw Meshy head; `Postmaster-body-01`
     is contaminated, don't use it.
  6. The back-of-skull blob is inherited, not a wrap failure: the head was
     generated from front + 40°L + 40°R only, so Meshy invented the occiput.
     Hair and cap cover the whole region — dress him before sculpting it.

- 2026-08-02 (overnight): **THE CHARACTER LANDED.** Heavy Male body morph +
  HD Ultimate Morphs sliders + shortened height = the postmaster's body;
  body-first Headshot wrap attached clean; dressed, white hair/beard, glasses.
  Full session detail: face-lab changelog 2026-08-02.

  **CC5 house runbook, second pass (this session's click-path facts):**
  7. Load a base from Modify panel → Character section (Load CC3+ Neutral
     Base), NOT the Content Manager — avatar presets error without a standard
     CC character on stage. Body Morph presets (Heavy Male etc.) live at
     Content Manager → Actor → Morph → Body Morph → CC3+ and need that
     character loaded first.
  8. The head FBX imports at 1/12 scale (units) — type ~1200% into the prop's
     Transform Scale, then position it OVERLAPPING the base head, eyes aligned
     in front (F) + side (S) views. Nose through the base face = correct.
  9. Two selection systems that don't talk: Scene-tree selection drives the
     Attribute panel; tool modes (Proportion/Edit Mesh) own the canvas. If the
     canvas ignores the Scene panel, you're in a mode. Selection corners draw
     at object size — invisible on a tooth-sized object unless zoomed in (J).
  10. Base anatomy (teeth/eyes) can't be object-transformed — move/rotate/
     scale stay grayed. Working routes: isolate mode + move tool (proven), or
     Edit Mesh entered FROM the teeth (scopes to teeth only), or the Morphs
     tab teeth sliders (search "teeth": Top Teeth Length, Scale Back, Gap...).
  11. Color: hair/beard via Material tab → Smart Hair shader (root/end
     swatches); cloth via Material tab → Material Settings → Diffuse Color
     chip — multiplies the texture, so it tints and darkens but cannot
     lighten past the map. Store beards arrive as PIECE SETS (sideburns/
     chinstrap/mustache/soul patch), one material each.
  12. UNRESOLVED: a checkbox that HOLDS the mouth open during teeth work
     exists (James used it once, two hours of searching never refound it).
     Best lead: Facial Profile Editor expression-row preview toggle.
  13. Handoff doctrine: CC5 owns the character (.ccProject master); iClone =
     speech/performance; Unity via Reallusion Auto Setup FBX; Blender =
     adapter only (props in, FBX→GLB out for DLO — tick "Mouth Open as
     Morph" in FBX advanced settings). Never edit the character downstream.

- 2026-08-02 (evening): **THE FACIAL RIG IS VERIFIED.** James ran a complete
  Mesh-to-Head from the raw OBJ himself (Claude coaching by screenshot, not
  driving — his correction, see face-lab changelog), attached to a CC body with
  a seamless neck, and played a facial-expression clip: the face moves, and it
  still reads as the postmaster. Open: eyes/teeth too realistic (materials, not
  resolution), teeth too narrow and clipping the upper lip, and the body route
  decision (rebuild gnome proportions on CC's body vs AccuRIG the Meshy body).

  **CC5 house runbook, third pass (the Mesh-to-Head click-path, start to end):**
  14. **POSITION IS EVERYTHING — this cost two hours.** Headshot uses the source
     prop's WORLD POSITION literally. Headshot's own "place the base at world
     origin (0,0,0)" guidance produces a character with the head mounted on the
     FLOOR between the feet and the neck stretched ~160cm down to reach it (the
     "cellophane pulling into infinity"). No stage-3 checkbox is ever the cause.
     Correct order: **load a base character first**, then set the source head to
     roughly `Move Z 160, Scale 1200, Rotate 0/0/0` so it OVERLAPS the base
     character's head, then start Head Generation.
  15. OBJ import already converts Y-up→Z-up. `Rotate 0/0/0` is correct; do not
     add the X=90 a Blender instinct suggests. The mesh arrives ~1.9cm tall, so
     Scale 1200 ≈ a life-size 23cm head. It looks tiny only because CC's camera
     has a minimum approach distance — that's not a reason to scale to 12000.
  16. The alignment pane is a **snapshot taken when Start Head Generation runs**.
     It never live-updates. Change the prop transform → close the Mesh to Head
     window → relaunch, or you will be aligning against a stale image. The pane
     also ignores your viewport camera entirely (it renders from world axes), so
     it — not the viewport — is the authority on whether the head faces front.
  17. In the alignment panes: **left-click places a point, right-drag orbits,
     middle-drag pans, wheel zooms.** The panel's pan/orbit/zoom buttons drive
     the MAIN viewport, not the panes, which is why no button ever changes that
     cursor. Points are matched by INDEX, so place them in the base head's
     numbering order.
  18. In the 32-point set, **26, 29 and 32 are not missing — they're on the back
     of the head** (behind each ear, plus the occiput). Orbit to reach them.
  19. There is NO clear-all for alignment points, and orphaned points survive
     closing the file and relaunching Headshot. The only reliable reset is to
     delete the prop and re-import the OBJ.
  20. Stage 2's "hide unnecessary faces" (e.g. the source's flared open neck)
     only takes effect if you **re-run generation** — the small round icon on
     the HEAD GEN tab. Re-running discards any stage-3 sculpting.
  21. Stage 3: **Keep Neck Shape + Keep Head Size** on; the Smooth brush cleans
     the little spikes at the neck edge (shrink Radius first — RMB+drag). Fix
     spikes here, on the CC mesh; hiding SOURCE faces cannot remove them.
  22. While the Mesh to Head panel is open, the rest of CC's panels are inert on
     the character. Close it before expecting Morphs/Material to respond.
  23. Face smoke-test without iClone: Animation Player (bottom) → **Motion**
     dropdown → facial rig → a range-of-expressions clip → Play. **Remove**
     clears the clip back to neutral.
  24. Edit Mesh must be entered with the part already selected in the Morphs
     parts tree, otherwise the Vertex/Face/Element/Sculpt tabs don't appear.
     **Element mode selects one tooth at a time** (each tooth is its own
     element) — for whole-arch moves use Vertex + select-all. Edit Mesh holds
     the jaw open deliberately while you work; exiting closes it.
  25. Eyes/teeth reading too realistic is a MATERIAL problem, not resolution:
     Digital Human shaders bring SSS, wet speculars and layered iris depth.
     Cheapest stylization levers, in order: flatten the material, swap the iris
     for a flat two-tone texture, enlarge iris relative to sclera.

- 2026-08-02 (late): **TOOLING PASS — Superhive shopping + the Reallusion stack.**
  No build work; a purchasing session. What the money is for, in each case, is the
  gap between "CC5 makes a great head" and "the head is stylized and ships to web".

  **Bought (Superhive):**
  26. **EyeForge** ($16.98, PixelicaCG) — 30 iris textures split 10 realistic /
     10 stylized / 10 anime, plus pupil shape, iris/sclera/vein dials and
     toggleable fake reflections. Blender 4.0–5.2, GPL, 4.0★/7. This is the
     direct answer to runbook item 25 (eyes reading too realistic): the fix is a
     flat stylized iris map, and this is a library of them. 4K image maps on a
     clean sphere, so it bakes down to plain mesh + texture for glTF.
  27. **Realistic Mouth (Jaw) & Teeth** ($14.99, Lambrador3D) — teeth, gums,
     tongue **and a throat**, which is the deciding feature: without it jawOpen
     shows daylight through a hollow head. Ships a subdiv build (32,652 tris,
     separate tooth mesh) and a game build (2,815 tris) on the same UVs, plus
     OBJ/FBX and 4K PBR sets. Blender 3.6, Royalty Free.
     **Grab `Jaw_Blend.zip` + `Jaw_Textures.zip`**; skip FBX/OBJ (they exist for
     non-Blender users). Textures loose, not packed — they get repainted toward
     the painted look. All 313MB stays in `tmp/`; only the downsized bake ships,
     at 1K or 512 on the low-poly build.

  **Recommended, not yet bought:** Stylized Hair Pro ($22, Dean Zarkov, MIT,
  5.0★/22) — geometry-nodes stylized locks with Mesh Conversion + Bake Hair
  Geometry, so it collapses to exportable mesh. Its default output is chunky
  storybook locks rather than realistic strands, which is the right family for
  the gnome; beard, brows and hair all come off one tool.
  **Version trap: the listing says 4.5–5.0, but you need v4.2.1 from Version
  History for Blender 5.1** — v4.3.1 is 5.2-only and will look like a broken
  add-on.

  **Reallusion cart priced (26th Anniversary, buy-2-get-50%, all lines took the
  full 50%):** iClone 8 + CC5 $449, Headshot 3 $99.50, AccuPOSE Infinity $74.50
  = **$623 excl. tax** (~$662 in MA), plus 40 free minutes of AI Video Mocap.
  AccuPOSE is an **iClone 8** plugin, so it only earns its place because iClone
  is in the cart. The argument for iClone over the cheaper $249 CC5+Headshot3
  bundle is AI Video Mocap — video in, character animation out, which is the
  "animation routines" goal without a mocap suit. Left behind at this price:
  ActorMIXER PRO ($119.40), the character-variety engine — but check first
  whether CC5 Deluxe's built-in ActorMIXER generator overlaps it.

  **Headshot 3 facts worth knowing before the next Mesh-to-Head run:**
  28. The mesh workflow is a **wrap**: CC topology is projected onto your source
     and your texture is baked onto it. Your topology is always replaced — the
     output is a CC head on a CC body. That replacement is what buys the rig,
     the ARKit set, the clothing system and the body, so it is the product, not
     a side effect.
  29. Stylized is a **supported** case, not a tolerated one — Reallusion's mesh
     workflow page has a "Bring in Stylized Characters" section covering cubic
     styles, sharp lines, exaggerated eye sockets and "extreme head & neck
     shapes... for stylized creatures with a bold design." The technique is to
     **add alignment points** over the exaggerated areas (ears, neck) beyond the
     preset 24/32/35, and to let **normal baking** carry the sharp detail the
     wrap can't hold as geometry. Their own copy still warns a creatively
     designed head "can present challenges and potentially yield unintended
     results."
  30. **SubD-0 to SubD-2 output** — wrap to a chosen subdivision level and keep
     the mesh lightweight for realtime. CC characters do not have to arrive
     heavy; it's a setting.
  31. **"No Mask"** preserves bust models that carry their own hair or coverings
     without distorting the texture; eyelash and lip masks fix the small
     artifacts that show when blinking or parting the lips.
  32. The Headshot **3 vs 2 comparison chart shows the Mesh Workflow row
     identical in both columns** — the v3 money went into the image side (new
     AI model, text-to-image, image enhancement, spline reshaper, 58 preset
     morphs, body matching). Relevant new capability for us: **Body Matching**
     generates a base body from the source image, and the **Spline-Based
     Reshaper supports profile views**, which is precisely what defeated the
     KeenTools attempts.
  33. Headshot's AI image generation runs on Google Nano Banana and **burns AI
     points per generation** — meter it like Meshy credits, it is not a bundled
     feature.
  34. Scope correction: Headshot's image-to-3D makes **heads only**, by fitting
     CC topology to a photo — it does not invent geometry. Meshy still owns
     props, clothing and anything that isn't a head. Buy the Reallusion stack on
     the head/rig/animation chain, not as a Meshy replacement.
