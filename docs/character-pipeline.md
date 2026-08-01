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
