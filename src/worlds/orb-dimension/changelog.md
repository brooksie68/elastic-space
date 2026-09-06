# Changelog — The Orb Dimension

Working log for this world. Newest entry first. Every session that meaningfully changes this world
appends an entry: date, author, what changed, and where things stand. Never rewrite or delete old entries.

## v75.1 — 2026-09-06 (James: "zero for both is the best setting")

- "far window blur" defaults to 0 (DEFAULTS + james-prefs-01); the station dial was already 0.
  Both frozen. Cache tags ?v=761.

## v75 — 2026-09-06 (Claude, James: the station at blur 0 is PERFECT — "freeze that and never change it again")

- **"far window blur station lights"** (new key `stnFarBlur`, default 0): the station's map
  halos, its shader window cells and every packet now take THIS dial. At 0 the station renders
  through the same shader paths with the same values it had at his dial 0 — the look he froze.
  Its default is never to change (memory `station-lights-frozen`).
- **"far window blur"** is the buildings' dial only, and it finally reaches the pane itself
  (`uCoreBlur` 1 for towers): the old code only blurred the halo, which amber tower windows
  barely carry, so the dial "did nothing" on buildings. Dial 0 = unchanged.
- Lab: station 0, towers 3. Cache tags ?v=760; sims + shader-check green.

## v74.1 — 2026-09-06 (Claude, James: "definitely an improvement" — two notes)

- The spine's band of the map: three amber crew decks (was one) and ~4× the small panes
  (BLDG_V 34). The "station lights" dial scales all of it.
- Building lights "don't have much definition": that is the far window blur dial at 3 under
  its v73 meaning (0 = sharp, no flicker; each step adds softness). Told him to try ~1; no
  code change. Cache tags ?v=750.

## v74 — 2026-09-06 (Claude, item 4: the station as a continuation of the ball — round one)

James: "look at the ball and think about what the station is... have a reason why you're
making a line." The 02-sphere's map is the language: blue meridian seams, an equator band of
amber windows (where people live), blue lines bracketing it, sparse panes, an orange ring.
- **Each member class owns a v BAND of the station light map** (builder: `tubeS` takes a
  band; pads moved to v 0.85+): A the spine (power seams along the core, one amber crew deck
  row, blue deck lines every 1,500 m, orange collar rings), B the rings (the habitats — the
  amber equator band on the outer face bracketed by blue edge conduits, hoop seams, small
  panes), C the service spine + collar rims (three bright conduit seams + orange service
  rings, no windows), pads a dim outline. Map re-authored in `gen_station_light.mjs` (KEEP,
  the logic is in its header); BLDG_V 33.
- **Spokes, braces, masts** (station metal, zFlag 2) carry a thin blue seam along each long
  edge — gated by the bar's on-screen width (a thin far bar stays dark; the first cut lit
  every bar solid blue) — packets unchanged.
- Cache tags ?v=740; sims + shader-check green; sheets tmp/snapshots/station-v74b-ball.png /
  -2500.png. AWAITING JAMES: the lab with the ball in frame, then a flight; rounds expected.
  STILL OPEN: his traffic speed / amount numbers for the defaults.

## v73 — 2026-09-06 (Claude, round one of James's v72 notes: flicker, smear, grains of sand)

His read of v72: building lights "out of control flicker until blur nine"; station lights "a
billion tiny grains of sand" and the ring windows "smeared along"; the three light types answer
the blur dial differently; the traffic dials "incredibly effective". Round one (items 1/2/5 of
the plan; item 4 — the station as a continuation of the ball — is its own round next):
- **No twinkle at any dial value.** The building taps always sample at the pixel footprint
  (lodT = lod0 + dial/2, never finer) — the v60 point-sample cap is retired; the dial is now
  softness on top, one meaning for all three light types (packets already pixel-based; the
  station's shader cells now soften with it too). Far gain ×1→×2 only past mip 2 (v72's ×3
  fed the twinkle).
- **Anisotropic filtering ×8** on every building surface + light map (mkTex) — the smear
  along oblique rings is gone.
- **"station lights" dial** (the societies, 0–2, default 1): scales the station map
  (uLightMul, towers stay 1) and the shader cells (~8% at 1). Interim map back to 2,500
  panes (BLDG_V 32); cells 2.2× (was 2.6×).
- Cache tags ?v=730; sims + shader-check green; sheet tmp/snapshots/station-v73-6000.png.
  OPEN: his traffic speed/amount numbers → DEFAULTS + james-prefs-01 (the file has none).

## v72 — 2026-09-06 (Claude, James's v71 flight notes, plan approved)

His read of v71: the conduits "a pretty high rank," a little tuning left; the windows are two
systems (building light map vs. the metal shader's cells) behaving differently; "far window
blur" never remembered 3. Built, in his order:
1. **Far window blur defaults to 3** (DEFAULTS + james-prefs-01). Cause of the forgetting:
   the start preset overwrote the saved slider at every boot, and a panel save only reaches
   the presets file when the dev server is up — the save button now says plainly when the
   file was NOT written.
2. **Building windows show earlier**: BLDG_FS far gain ×(1 + min(lod,4)·0.5) on the pane
   glow, so far mips no longer average sparse panes to nothing. (The flicker he saw was blur 0.)
3. **Station windows, more + brighter**: `station-light.png` regenerated by
   `tmp/orb-dimension/gen_station_light.mjs` (KEEP — 7,000 panes vs ~2,300, brighter, the
   six blue lines kept; BLDG_V 31), and the metal shader's window cells on the station's
   straight members 6% → 14% of cells at 2.6× (was 1.8×). Crust + towers untouched.
4. **More white packets**: `packetCol` white share a third → 45%.
5. **Two dials, the societies**: "traffic speed ×" (0.25–3) multiplies time in `trafficAt`,
   the bridges and the skull feeds; "traffic amount" (0.1–1) keeps every k-th bead so a
   chain keeps its spacing pattern with fewer packets (bridges drop packets the same way).
6. **Packets respect far window blur**: bead radius grows with the dial
   (`hwS = max(hw, (1 + 0.5·blur)·mpp)`, light conserved) on struts and bridges — at 3 a far
   packet is a soft blob, not a hard 2 px dot. `uTrafSpeed/uTrafAmt/uFarBlur` in COMM_US.
Cache tags ?v=720; init-smoke / society-sim / v47-sim / shader-check green; lab sheets
tmp/snapshots/station-v72-{2500,6000,16000}.png (the spine and rings read as lit hulls now).
AWAITING JAMES: reload — blur reads 3 and stays; buildings' windows earlier + steady; the
station's windows; the two dials by feel. NEXT (its own go): traffic step 2, the three tube
types.

## v71 — 2026-09-06 (Claude, step 1 of the traffic plan on James's "let's execute")

- **A stream never lights more than about a quarter of its length**: in `trafficAt`, spacing
  is at least four bead lengths (`sp = max(sp, 8·hw)`) in every tier — the dense tier keeps
  its small close packets but always shows dark between them; on screen the thinning keeps
  neighbours ≥ 8 px apart (2 px beads = a quarter lit). Ring rails, bridges, shares, the 2 px
  floor: untouched. Cache tags ?v=710.
- Lab sheets tmp/snapshots/station-v71-{2500,6000,16000}.png; sims + shader-check green.
  AWAITING JAMES: fly Dominant and compare to the lab at the same distance (read resScale).

## 2026-09-06 — the traffic plan (Claude, James at 03:00: "I like your plan... review it again tomorrow. Don't lose it.")

Nothing built after v70.3. After tonight's circles James put the session in plan mode and
gave the brief; the plan below is the copy of record (also at
`C:/Users/brook/.claude/plans/stop-rushing-forward-iterative-zebra.md`). His nod is given; the build waits for his re-read next session.

    ## Context

    Tonight's rounds (v70–v70.3) went in circles because each change was judged against the
    wrong picture. James has now set the picture: **the Station Lab as it stands is the target**
    (`src/labs/station-lab/index.html`, drawing the live world.js). His words: windows and
    packets "look awesome in the station lab from every distance... not much glinting... teeny
    little lights moving." The ring inner rails (white/blue, different directions, lots of
    groupings) he loves. The one fault: some spokes carry so many packets with so little space
    between them that they read as a lighted bar from a distance. Dense small streams are fine
    when there is still visible space between packets.

    His brief for where this goes (recorded for the next step, not this one): traffic is data,
    information, manufacturing flows, people in transit cars, cargo — three tube thicknesses
    (transport = current, manufacturing = middle, data = thinner), manufacturing the most regular,
    data the most varied (binary-traffic patterns, back and forth, colour/group/speed variety,
    occasional quick flashers), transport/cargo bunched on loose timers. Faked with lights and
    timers, no simulation. Colours stay blue / green / white.

    ## Step 1 — the lighted bars (this step, one small change)

    Where: `trafficAt` in `src/worlds/orb-dimension/world.js` (~line 6376). Nothing else.

    1. A packet stream may never fill more than about a quarter of its length with light.
       Rule: spacing is at least four bead lengths, in every tier. The dense tier keeps its
       small close packets but always shows dark between them.
    2. The on-screen rule from v70.3 stays: beads never vanish (2 px floor) and thin out with
       distance so neighbours stay at least 6 px apart.
    3. The ring inner rails are untouched. The light bridges are untouched. Shares untouched.

    Expected effect: the few spokes that read as solid bars break into visible packets; every
    other member looks exactly as it does in the lab now.

    ## Why the pod looked worse than the lab (to verify, not assume)

    Same code, same melt (1), same tempo (1). Two known differences:
    1. `chains.png` (02:07) was taken under v70.1/v70.2 — the 2 px floor without the thinning
       rule — so beads 8–25 m apart merged into bars. v70.3 (02:09) added the thinning. James has
       not judged v70.3 in flight against the lab yet.
    2. The world drops its render resolution under load (`resScale`, world.js ~8040, down to
       0.5); the lab always renders full. A lower render scale doubles the metres per pixel.
       Check the world's resScale during his next flight before touching anything for it.

    ## Step 2 (its own go, after step 1 flies) — the three tube types

    Thickness per member role, and a traffic character per type as in the brief. Plan it with
    him after step 1 is judged in flight.

    ## Verification for step 1

    1. `node --check world.js`, `tmp/orb-dimension/init-smoke.mjs`, `society-sim.mjs`,
       `shader-check.html` (silent).
    2. Station Lab by eye at 2.5 / 6 / 16 km via `LAB.set` + `LAB.capture` → tmp/snapshots;
       the ring rails must look identical to now, the bar-like spokes must show gaps.
    3. Local checkpoint commit. James flies Dominant and compares to the lab at the same
       distance; resScale read during the flight.

## v70.3 — 2026-09-06 (Claude, James at Dominant: "almost all super thick chains of packets... what the hell happened?")

The v70.1 two-pixel floor did it: from the pod a pixel is several metres, so beads 8–25 m
apart grew until they touched and every group / Morse ladder read as a solid chain in both
directions. Now beads THIN with distance — every k-th bead kept so neighbours stay ≥ 6 px
apart on screen (dots with gaps at any range, never a line). Second stream back to 25% of
members; the quick tier capped at 0.45. Shares unchanged (40% regular). Cache tags ?v=703.

## v70.2 — 2026-09-06 (Claude, James: "station far blur doesn't seem to be doing anything")

Right — the station's light map is six long blue lines and a few windows; there was nothing for
the dial to blur. The twinkle was the 130 seated towers, which obey "far window blur" (he keeps
it at 3). The station dial is gone; the station shares the tower dial and keeps following the
footprint past it. Cache tags ?v=702.

## v70.1 — 2026-09-06 (Claude, James: "a hard fail... super, super boring again... so little traffic")

The v70 melt was the fail: the variety streams use 1.8 m beads, under a pixel from the pod, and
the melt dissolved them into near-nothing — only the big regular pulses survived, so the mix
read as one boring pattern with almost no traffic. Now a bead NEVER melts away: below ~2 px it
grows to 2 px on screen and keeps at least 60% of its light (moving beads do not twinkle).
More of it too: regular 3–8 pulses per length (was 2–5), groups 4–10, sliding groups 3–6,
variety beads 2.4 m, the second stream on 45% of members (was 30%). Shares unchanged.
Sheet: tmp/snapshots/station-v70-1-6km.png. Cache tags ?v=701; sims + shader-check green.

## v70 — 2026-09-06 (Claude, James at 6.3 km: "a billion tiny lights... every one of those lights is twinkling")

His read of Dominant from the pod: the whole station shimmered when the ship moved, and every
bar had packets running. Diagnosis: the v69 station draws through the building program, whose
far look is the v60 point-sampled light map (a few twinkling points on a tower = every texel
of a 4096 map fighting for a pixel on a 6 km hull); the packets (1.6–3 m beads, under half a
pixel at 6 km) had no melt rule at all; and v68.13 put a stream on 100% of members with too
many dense unbroken chains (his word: the chains "should probably almost never happen").
He set "far window blur" to 3 by hand and the windows were solved. Built on his go:
- **"station far blur"** (the societies), default 3, the station's own dial; the towers keep
  "far window blur" and the v60 look. Past the cap the station's taps FOLLOW the pixel
  footprint (`uFarFollow`), so at 20 km the hull is one even glow, never point soup.
- **Packets melt**: `trafficAt` takes metres-per-pixel × the melt dial; a bead under ~3 px
  crossfades into its faint duty-cycle average instead of strobing.
- **THE TRAFFIC MIX, his numbers**: 40% the old regular way (2–5 evenly spaced pulses,
  medium speed) / 15% small groups of 3–8 with long gaps / 12% Morse (an even ladder with
  beads dropped at random — odd and even clumps) / 11% one small group sliding back and forth
  / 12% a lone packet / 5% quick and few / **5% the dense chain, slow and at 0.45
  brightness**. Nothing in the variety is densely packed. Second stream on 30%, patterns
  re-roll every 40–90 s as before. The light bridges keep their own v68.14 traffic.
- Station Lab draws the station with blur 3 + follow. Sheets: tmp/snapshots/station-v70-near
  .png / -far.png. Cache tags ?v=700; init-smoke / society-sim / shader-check green.
  AWAITING JAMES: a flight to Dominant at 6 and 20 km.

## v68.14 — 2026-09-05 (Claude, James: "the entire space station looks pretty awesome")

- The light bridges to the Saelyri glow homes are back on their own v68.6 traffic (per-bridge
  speed, one to three 5 m packets each way; feeds inward-only) — his call: the station's
  traffic mix is for the station's members, the bridges "were fine". Cache tags ?v=6892.

## v68.13 — 2026-09-05 (Claude, James's traffic reset: "it looks like an amusement park ride")

His brief, for EVERY light-carrying member (struts, spokes, hoops, rails, light bridges,
feeds — "I'm sick of saying the names"): 50% the old standard (evenly spaced pulses of one
size at a medium speed, pulse-gap-pulse-gap), ~15% unbroken chains, more variety in the
rest, only a very few fast or dense, and the pattern must change up every so often.
- **One shared roll**, `trafficAt()` in COMM_HUE, used by the solid AND bridge programs:
  50% standard (2–5 evenly spaced pulses per length, speed 0.12–0.26) / 15% unbroken dense
  chain (slow–medium) / 10% trains with gaps / 15% a sparse singleton / 10% fast or dense.
  A second stream runs the other way on ~30%. Every stream re-rolls its pattern on its own
  40–90 s clock (a hard cut, no crossfade — cheap and the packets are small).
- The v68.11 per-strut train roll and the bridge's separate packet code are gone; feeds keep
  their hotter carrier line. Cost: two streams, no inner loop, ~40 ALU per fragment.
- Cache tags ?v=6891; init-smoke + shader-check green; lab checked by eye.

## v68.12 — 2026-09-05 (Claude, James: the pads still read as "diagonally wrapped stone-looking quartz")

- The Station Lab shows the pads in the dark tile (checked at 700 m), so the in-flight
  read could not be reproduced here; taken on his word. The pads now carry their own flag
  (aux.z = 3 → kind −3): the same dark tile sampled at 90 m per repeat so no mottle can
  read as grain, at 0.7 brightness. Lights unchanged. Cache tags ?v=6890; init-smoke /
  society-sim / shader-check green. If they still read as stone in flight, the next step is
  a screenshot from the pod so the difference between lab and world can be measured.

## v69 — 2026-09-05 (Claude, the station in the buildings' own metal — and THE LOSS + REBUILD)

James's read: the end spheres show the right thing — "that black metal with the blue lines"
— and the rings/pads did not. Same tile, different renderer: the spheres go through the
BUILDING program (surface tile + light map + its lighting), the members went through the
town-structure program with the wear pass. Now the station's big members ARE a building:
- `stn` in communityGeometry (Dominant only): spine, service spine, rings, collar rims and
  pads written as an 8-float building mesh (pos/400, normal, uv — u = metres along / 3000,
  v = around in [0.06, 0.84]); struts, spokes, braces, masts stay in the solid mesh.
- `bldgMesh.stationKind`: the 02-sphere's tile (`assets/tiles/station-hull.jpg`) + a
  generated light map `assets/buildings/station-light.png` (6 rows of blue lines in long
  dashes with end ticks, sparse windows; 84 KB) — one instance at the town seat, 400 m per
  unit, rebuilt from COMM_GEO when the geometry re-rolls. BLDG_V 30. Cost: ~4k tris, one
  draw call; Dominant's solid mesh dropped to 3.1k tris.
- Station Lab draws it the same way (6 kinds loaded, "station tris" in the bar).
- **THE LOSS.** Mid-patch, Claude ran `git checkout -- world.js` to clear a half-applied
  edit; world.js was uncommitted since v66 and the whole day (v67 → v68.15) was wiped. No
  copy existed anywhere (the dev server sends no-store; the lab's fetched text was garbage-
  collected). REBUILT from the session's patch scripts + inline edits in order (v67, 67.1,
  67.2, 68, 68.1, 68.2, 68.3, 68.6, 68.13, 68.14, 68.7, 68.8, 68.15, 69); the superseded
  rounds (67.1's traffic, 68.4 Morse, 68.11 trains) were not re-applied since 68.13
  replaced them. Every sim + shader-check green; lab checked by eye. Committed locally as a
  checkpoint the moment it passed. Lesson in memory `never-checkout-uncommitted-work`.
  Cache tags ?v=690.

## v68.9–v68.11 — 2026-09-05 (Claude, James's lab-feel notes + the trains brief)

- **Station Lab** (v68.9/10): still by default (space turns it), the spine axis is the
  lab's up so orbiting never rolls it over, H stands it upright dead ahead, drag right
  turns it right / drag up tips the top away (flipped twice by his hand).
- **THE TRAINS** (v68.11; James: the v68.6 roll was "a bunch of singletons everywhere...
  sparse and kind of lame" — he wants beads on a necklace, trains of 8–12 with gaps,
  dense-and-slow or spaced-and-fast, singletons only occasionally, both directions):
  every strut rolls one or two STREAMS (the second runs the other way, on ~55%); a stream
  is a periodic train — N beads (1 on 12%, 3–6 on 18%, 6–20 on 70%) at 6–40 m spacing
  (dense weighted), a 20–260 m gap, speed on a log scale (0.02–0.73 lengths/s), a few
  ping-pong, a few stuttering. Beads ~3 m, a line down the bar. Cost: two streams, no
  loop — cheaper than the v68.4 eight-slot Morse loop it replaces (Morse retired).
- Cache tags ?v=689; init-smoke + shader-check green; station-lab checked by eye.

## v68.8 — 2026-09-05 (Claude, James: the pads "still appear to be the previous texture... stone rather than metal")

- The station tile sat on texture unit 5 — the ROBOT FLEET's unit — so in the world every
  station slab sampled the fleet atlas (the Station Lab has no fleet, so it looked right
  there). The tile is on unit 14 now; the aged-ceramic tile retired to free it (it dressed
  a few percent of struts and slabs; those roll iron/hull now). Everything the station wears
  — spine, rings, pads, collars' rims — reads as the dark metal in flight.
- Rule for the world CLAUDE.md: units 0–4 orbs/skull, 5 fleet, 6 castes, 7 wisp atlas,
  8–11 buildings, 12–15 tiles. Nothing new goes on 5–7. Cache tags ?v=688; init-smoke +
  shader-check green. His verdict on v68.6: "really better than I was hoping for."

## v68.7 — 2026-09-05 (Claude, James: "keep your eye on the frame rates... let's not break the bank")

- The cost that matters at the station is the buildings: 130 instances × ~45k tris each,
  all drawn out to 300 km. Now any instance that would subtend under ~2 px is skipped
  (h² × 1.2e6 < distance²) — the farm spheres and hanging towers drop out first as you
  pull away. The traffic loop is eight cheap iterations per strut fragment; the lights are
  one hash grid. Cache tags ?v=687. Budget rule recorded in memory + the world CLAUDE.md.

## v68.6 — 2026-09-05 (Claude, James's packet scale note: "bigger than my ship... fifty feet long. What are they?")

- **Packets are sized in METRES now.** Struts pack flag + 4·length into aux.z (both strut
  builders), bridges carry their span in aux.x (the family index there was dead since v67).
  Dots 4 m, dashes 12 m, gaps 6 m, bridge packets 5 m — a few pixels at flying distance —
  and a packet is a thin line down the middle of the bar, not a block across its face.
- **Half the traffic is standard again** (mode 0: one plain runner at the old speed, no
  stutter); the Morse / group / ping-pong modes share the other half.
- **The station's between-ring members are skinnier** (spokes 0.36×, braces 0.13×, rungs
  0.12×, inner rail 0.18× of the ring tube).
- Cache tags ?v=686; init-smoke / society-sim / crust-sim / v47-sim / shader-check green;
  station-lab-near sheet captured. AWAITING JAMES.

## v68.5 — 2026-09-05 (Claude, James: the station's struts "are all dark... no lights whatsoever")

- v68.3 read his "no lights on any strut" as packets too and cut the station struts' traffic;
  he meant windows and rails. The packet pulse runs on every strut again, station included.
  Cache tags ?v=685.

## v68.4 — 2026-09-05 (Claude, James's traffic brief: "a lot more variety... and they all need to be smaller")

- **The traffic roll on every strut** (all kind-1 struts, towns and Korrudan alike): a MODE
  per strut — a lone runner / a Morse train (eight slots of off, dot, dash rolled per
  strut) / a pair or triplet / a ping-pong runner that reverses at the ends — plus speed
  on a log scale (0.03–0.9, a 30× spread), direction, and a stutter gate on a third.
- **Packets are small**: dots ~0.6% of the strut, dashes ~2.4%, a faint bleed (was a
  blob a tenth of the strut long).
- **Bridges** the same discipline: per-bridge speed on a log scale, one to three packets
  each way, packet width ~1% of the span; skull feeds' three packets small too.
- Cache tags ?v=684; init-smoke + shader-check green; Material Lab row 1 shows the new
  strut packets. AWAITING JAMES: a flight along Korrudan's hoops and the station.

## v68.3 — 2026-09-05 (Claude, James's light-wrapping pass: "that's really pretty cool, actually")

- **Pads in the station metal, with lights** (they rolled the ordinary tiles before).
- **Spine lights straight and sparse**: a member built with `grid` carries length·1000 +
  face width in aux.y and lays its window grid on the mesh uv, rows parallel to the member
  (the triplanar grid ran diagonal on the leaning spine — his "weird twisty diagonal");
  spine windows at a 6% deal, rails on one face in seven. Rings unchanged ("great").
- **No lights on any strut, spoke or brace** — the lights block is slabs-only, and station
  struts (aux.z = 2) carry no traffic pulse either.
- **Up/down pads**: six per ring on the ring's two flat faces, buildings standing parallel
  to the spine, alternating up and down. 100 pads, 130 buildings.
- Cache tags ?v=683; init-smoke / society-sim (Dominant 7.8k tris) green. AWAITING JAMES.

## v68.2 — 2026-09-05 (Claude, James: "wrap the entire station in the metal around the balls... run some of those blue lights up and down")

- **One metal for the whole station**: the 02-sphere building's own dark tile
  (`assets/tiles/station-hull.jpg`, a copy of its surf map) on every station slab AND
  strut (`aux.z = 2` now overrides struts too); the v68.1 armor/panel tiles are gone.
- **Rings back to v68 thickness** (his "I made a mistake with the rings"); the spine stays
  doubled, the collars stay sized to it, the end spheres stay doubled.
- **THE STATION LIGHTS**: window dots on a 14 m triplanar grid (lit by row and by cell) and
  light RAILS along a third of every member's faces (per-face roll on the faceted normal)
  with dashes streaming along them, speed and direction rolled per rail — all blue or white
  via `packetCol`, melting to an average glow at distance like the crust windows.
- Cache tags ?v=682; init-smoke / society-sim green; sheets in tmp/snapshots/
  (station-lab-far / -near). AWAITING JAMES: the lab, then a flight.

## v68.1 — 2026-09-05 (Claude, James's read of the station: "a solid B plus / A minus... a great starting point")

His orders, all done: the spine twice as thick (~300 m) and the collars grown to fit; the
ring tubes doubled (~150 m; the ring radii stand — doubling those would swallow the suns);
the end spheres doubled (~1.4 km); a darker, more realistic metal, different per part.
- **Three station materials** (COMM_MAT overrides via `aux.z`: 1 titanium / 2 armor / 3 panel
  steel): the spine in near-black armored plating (`assets/tiles/dark-armor.jpg`, the v59
  library tile, no credits), the rings in a darkened steel panel grid (`panel-steel.jpg`,
  panel-grid-a at 62%), the service spine and collar rims in titanium. Units 5 + 6.
- **The collars are translucent** — each hub is now an iridescent glass sleeve (the glass
  program's kind-0 sheet) between two titanium rims; the spokes land on the rims.
- Station Lab draws the glass mesh too. Cache tags ?v=681; init-smoke / society-sim (TEST 9
  glass overdraw 1.0 screens) / v47-sim green. AWAITING JAMES: the lab again, then a flight.
  His notes for later, not built: buildings above and below the rings, not only outward
  ("we need a lot more assets"); the light bridges look random (they are the sun-to-sun
  bridges — the kernel does not move the suns yet).

## v68 — 2026-09-05 (Claude, DOMINANT IS A STATION — the first township kernel, James's go)

James's screenshot verdict on the satellite cores: "a crazy, ridiculous jumble of granite
blocks... no place anybody can live... not a meaningful structure of any sort." His plan
nod: three kernels, one per town (asteroid / spine-and-ring station / stacked platform),
build one first with the five finished buildings, judge the direction, then the rest.
- **Dominant (ci 2) is a spine-and-ring station** (`isStation` in communityGeometry; the
  old box-and-strut jumble no longer runs there): one 6 km spine (12-sided tube) plus a
  service spine, four rings (40-segment 8-sided tubes, joints extended so they close) at
  stations along it, each with a hub on the spine, eight spokes with traffic, rungs, an
  inner rail with traffic, diagonal bracing to the previous ring, eighteen docking pads
  per ring (every third one facing inward), masts at both ends, conduit runs along the
  spine. ~6.7k tris, society-sim TEST 6 green.
- **The pads seat the buildings** (`pads` on the geometry; `seatStationBuildings()`):
  towers stand on outward pads and hang from inward ones (any orientation — `bldgModel`
  takes an up + forward basis now), "lying" pads take a tower on its side, "farm" pads a
  2×3 grid of small spheres, the spine ends a big sphere sunk a quarter in, two towers lie
  half-sunk along the spine as docks. 106 buildings from the five kinds, each rolled by seed.
- **Titanium is the mass material** (COMM_MAT: slabs 62% titanium / iron / a little
  stone; struts titanium-led; hoops iron or titanium). The station's spine, hubs and rings
  are FORCED titanium (`aux.z = 1` on a slab → kind −1) with 60 m plates and wear
  features four times bigger — at 30 m the wear read as stone grain (lab round 2).
- **Station Lab** `src/labs/station-lab/index.html` (admin Labs): the kernel drawn by the
  world's own shaders, tiles, bins and seating code, orbit + zoom, C saves a sheet.
  Sheets: tmp/snapshots/station-lab-far.png / -near.png.
- Mediant and Subdominant keep the old core until their kernels come. Cache tags ?v=680;
  init-smoke / v47-sim / society-sim / crust-sim / sphere-sim / shader-check green.
  AWAITING JAMES: the lab, then a flight to Dominant. NEXT on his verdict: Mediant's
  asteroid, Subdominant's stack; more buildings through the pipe as concepts arrive.

## v67.2 — 2026-09-05 (Claude, James's township screenshot)

- **Light bridges 30% narrower** (town bridges and skull feeds) — his "slightly less wide,
  don't dramatically change them; I like very much the glass".
- **The data planes are gone** — the 48 upright glass sheets raining family-coloured dashes
  through every satellite core ("sheets of yellow... just doesn't make any sense"). Loop at zero.
- His verdicts recorded for the township redesign (item (d) in the repo Todo): the hull tile
  reads as "pixely granite", fine for a few blocks, not for the mass; the cores are "a crazy,
  ridiculous jumble of granite blocks... no place anybody can live"; he wants each township to
  read as a specific large space station with seats for the buildings. Suggestions delivered in
  chat; his picks next. Cache tags ?v=672; sims green.

## v67.1 — 2026-09-05 (Claude, James's read of v67: bridges "really good", struts "not so great")

- **Struts half as thick** (both builders — the core webbing + hoops, and the crust struts).
- **Every strut rolls its own traffic.** Face-on at Korrudan he counted seven struts all
  running the same way at the same speed ("all going around counterclockwise... not cool
  looking anymore"). Each strut now rolls direction, speed (0.06–0.42), one to three packets
  and packet width from its centre, so neighbours never agree.
- **The middle blue is aqua** (his correction: toward green, not purple).
- Cache tags ?v=671; sims + shader-check green. AWAITING JAMES: a Korrudan face-on look.

## v67 — 2026-09-05 (Claude, THREE CONDUIT FAMILIES + BLUE PACKETS, James's read of v66)

James liked the material pass, with two orders. (1) "I don't want the same exact one on every
single strut family" — the iron sheath reads "pixely, almost like camouflage"; he wants three
kinds of energy conduit: the current one, one "more like titanium or steel", one "like glass".
(2) The packets: "I only like the blue... I don't like the pink and I don't like the yellow. They
look really super goofy and I've hated them for weeks... switch them all to blue" — three shades,
blue or white only, everywhere packets run.
- **Packets are blue or white only.** `packetCol(r)` in COMM_HUE: deep blue / sky blue / white,
  one shade rolled per piece (from vE). The bridge core, the skull feeds and every webbing
  strut's data pulse use it; family hues no longer touch a packet anywhere. Screens, neon and
  windows keep their family colours (not packets).
- **Three conduit families**, rolled per bridge in the bridge FS (`uBridgeFam` = -1 rolls;
  the lab forces 0/1/2): 0 the v66 gantry-iron sheath; 1 BRUSHED TITANIUM — the v59 library's
  `brushed-metal` tile (no new credits; seam-blended to `assets/tiles/steel-brushed.jpg`,
  unit 15, replacing the never-sampled conduit-sheath slot) desaturated and lightened, a brush
  grain along the tube, a hard anisotropic crest highlight, light scuffing, no rust; 2 GLASS — a
  clear tube: the core shows through the whole width, a fresnel rim bright at the tube's edges,
  a thin crest streak, a little dust with wear, titanium collars and port rings.
- v66 slip fixed: the bridge pass never set `uWear` (sheaths drew clean); it takes the dial now.
- Material Lab: rows 5–7 are Conduit · iron / titanium / glass; a missing tile no longer kills
  the page (grey stand-in like the world).
- Cache tags ?v=670; init-smoke / v47-sim / society-sim / crust-sim / shader-check green; lab
  sheet captured (tmp/snapshots/material-lab-sheet.png). NOT eye-verified in-world (sound world).
  AWAITING JAMES: the lab rows, then a flight along the bridges. NEXT: the township kernels.

## v66 — 2026-09-05 (Claude, THE MATERIAL PASS on James's go)

James, after the interiors pass: everything with a baseline Blender material — the struts and
energy conduits around Korrudan, the town cores — "looks like real cheapo plastic... not
battle-scarred, hundreds-of-thousands-of-years-old technology that's still chugging along...
everything that is basic Blender shape output has to have textures." His standing word:
nothing ships bare; the township kernels get crust and wear from day one.
- **Four Meshy tiles** (nano-banana-pro, 36 cr; `assets/tiles/`, seam-blended to .jpg):
  scarred hull plating, corroded conduit sheath, aged ceramic armor, gantry iron.
- **`COMM_MAT`** — a shared snippet in the solid program: tiles laid TRIPLANAR on the raw mesh
  position (`vLoc`, new VS varying) at fixed metres-per-repeat (slab 26 / strut 11 / crust
  face 16 / hoop 13); the tile per piece rolled from the piece's centre (slabs hull with a few
  ceramic, struts iron / hull / a little ceramic, crust hull with some iron, hoops iron); a
  per-piece tint; wear seeded on position — grime pooling, scorch, one-way rust streaks, dead
  panels; the building metal's specular response (key + glint, shininess from the tile,
  fresnel rim). Screens, windows and the pulse keep their emission over it.
- **The conduits**: each light bridge runs inside a metal SHEATH — gantry iron triplanar (10 m
  per repeat), collars every 90 m with a bright edge, a fake tube shade, a glass slot down the
  centre and port rings at the collars where the hot core shows; the two crossed quads fade as
  they turn edge-on so only the facing one carries the tube. The old hot line is the core.
  (First cut sampled the conduit tile along the ribbon — magnified thirty times on a 60 m
  tube, it was a painting; scrapped for the iron.)
- **"metal wear"** dial (the air, 0–1, default 0.8), the solid + bridge programs; tiles on
  texture units 12–15 with a flat grey 1×1 standing in until each file lands (file:// keeps a
  look). shader-check substitutes `${COMM_MAT}`.
- **Material Lab** `src/labs/material-lab/index.html` (admin Labs): strut / slab / hoop /
  crust face / conduit, real size, the world's shaders and tiles, at 120 / 500 / 2,500 m, a
  wear slider, click-to-solo, C captures. Three self-critique rounds before handing over.
- Cache tags ?v=650; init-smoke / crust-sim / society-sim / sphere-sim / v47-sim / shader-check
  green. NOT eye-verified in-world (sound world, no pane). AWAITING JAMES: the lab, then a
  flight to a town and around Korrudan's hoops. NEXT: the township kernels (his calls 1–2
  standing on Claude's picks: Mediant + Dominant asteroids, Subdominant a metal core, ~2.5 km,
  crust + this material from day one).

## v65.3 — 2026-09-05 (Claude, TEN MORE PLANETS + James's third read)

- **Ten new planet maps** (his ask: "10 more planet types... at least six Earth-like... you
  don't even need to show them to me"; his tier call: "whichever gives the best visual
  result" → Meshy nano-banana-pro, 90 credits): temperate, archipelago, pangaea, autumn,
  monsoon, tundra (the six Earth-likes), rust (Mars-like), swamp, crystal, pale giant.
  `assets/planetoids/planet-*.png`, 1024², art layers 8–17; four arrived with a letterbox
  frame and were cropped to content before resizing. The deal reads the count, so the ten are
  live in the world at once (worldlets pick from fifteen maps). Lab interiors sheet rows
  27–36 are the ten, 37–38 the ringed ocean and ringed pale giant. Prompt shape that worked:
  "Flat top-down planet surface texture map, square, edge to edge, no horizon, no sphere, no
  border. <world> Satellite-photo realism, painterly detail, rich saturated color."
- His third read: Kaleidoscope on a fixed blue-green sea palette ("I don't like that pink");
  Gyroscope NINE nested rings (0.86 down to 0.3), every third plain, the others with studs or
  an outer chain of beads, nine hues stepped round the orb's, alternating spin; Circuitry four
  colour families by seed (copper on green, silver on blue, gold on black, cyan on violet).
- Cache tags ?v=649; sphere-sim / init-smoke / v47-sim / shader-check green.
- **James's verdict on the whole interiors sheet, same day: "100% pass status... I am psyched."**
  Everything above is live in the world (the lab reads world.js) — his next flight is the first
  in-world look at the rolls, the fifteen planets, the rings and the colour families together.
- Lab: the sheet remembers its scroll position across a solo view (his ask).

## v65.2 — 2026-09-05 (Claude, James's second read of the interiors sheet)

His verdicts, in his order, all built:
- 1 Swirling lights: eighteen strands in three families at the march's resolving width.
- 2 Water: fish at half speed; a second, coarser silt (bigger dark dots).
- 3 Kaleidoscope: REAL symmetry — six-fold about a tilted axis, mirrored across the equator;
  one wedge holds four drifting gems, rods and a ring arc, the fold repeats them twelve times,
  faint mirror planes between ("actual kaleidoscopic effects").
- 4 Weird blobs: the v64 recipe restored exactly ("liked them better on the first pass").
- 6 Orrery half speed; 7 Data rain a third of the speed.
- 8 Gyroscope: a colour per ring (c1 / c2 / the complement), a white glint racing each ring,
  sun-facing shading, a soft haze off the tube ("all pink... more exciting lighting").
- 9 Circuitry: SIX boards, ordered — three parallel decks and three parallel uprights crossing
  them at right angles, one seeded tilt for the block ("a computer is a very ordered thing").
- 11 Storm orb: four families by seed — slate, green-violet, rust dust, deep red — each with
  its own bolt colour.
- 13 Clockwork: a second train of three smaller gears in the crossing plane, turning the
  other way.
- 17 Singing crystals: twenty shards, every third one long (to 0.92 of the ball), each its own
  hue about the orb's.
- 20 The data centre: four rack families — blues, cyan-green, amber, magenta-violet.
- 5, 10, 12, 14, 15, 16, 18, 19: fine as they are (14 and 15 already vary by seed in the world).
- **RINGS** (his "let's have a couple have rings"): p1 = 1 marks a ringed worldlet (a quarter of
  the deal, quad 2.3 radii). The ring is a flat band 1.25–1.85 radii out in the globe's own
  frame, tilted by seed; each pixel's ray meets the plane, the band is drawn there, hidden
  behind the globe and laid over it in front, lit by the sun with the globe's shadow across
  the far side, gaps and two divisions by seed, and a fade toward the quad edge so no clipped
  edge shows up close (the first cut at 2.3 radii loomed over the lab's close camera and
  clipped flat — the geometry was right, the ring was just too wide for the quad). Lab rows
  27–28 are ringed ocean and gas giant.
- The deal reads the planet count from the art list (`PLANET_MAPS`), ready for the ten new
  maps James asked for (six Earth-like) — those are Meshy text-to-image, awaiting his word on
  the credits. Cache tags ?v=648; sphere-sim / init-smoke / v47-sim / shader-check green.

## Sphere Lab perf — 2026-09-04 (Claude, James: "putting a hurting on my computer... 25 seconds")

- The orb FS now compiles through KHR_parallel_shader_compile — the driver compiles on its
  own threads and the page polls, so nothing is on hold while it happens (the bar says
  "compiling the world's orb shader (in the background)"). Every `link` is awaited.
- The sheet draws only the rows on screen (it is up to 26 rows × 4 raymarched cells, and it
  was drawing all of them every frame), at 20 fps; the solo view keeps the full rate; a
  capture (C, or the load-time snapshot) still draws every row.

## v65.1 — 2026-09-04 (Claude, James's 24 interior verdicts, read row by row)

Built on his "go ahead and act on that now" — every verdict from his read of the interiors
sheet, in his order:
- 1 Swirling lights: ten helices in two counter-turning families ("many more strands").
- 2 Water: sinking silt — dark dots (density, no light) beside the bright bubbles.
- 4 Weird blobs: a firm skin with a bright edge line, darker core, less noise ("more definition").
- 7 Data rain: phosphor green with pale heads, trails fading up behind each head, flickering cells.
- 8 Radar sweep, 21 Metronome, 22 Lone jellyfish: CUT — volume + flat branches gone, out of the
  deal (TECH/WONDER_KINDS), the lab and both sims.
- 9 Gyroscope: real tubes (radius 0.028, twice the march's resolving width) instead of
  zero-radius shells, slower tumble, tick marks, bright bearings ("more precise... pixely").
- 10 Circuitry: every board mirrored in four, a ring bus, corner pads ("more symmetrical").
- 13 Ember hive: a true honeycomb — hexagonal cells bored RADIALLY (twelve around the cylinder,
  no seam), stopping short of the core, glowing from within; a few big bees crawl the cells.
  The first cut bored them top-to-bottom and read as stripes from the side.
- 15 Galaxy: four colour families by seed (blue-white / gold / rose with cyan arms / green),
  the bulge rounder. A brightness overshoot (the disc went white) pulled back the same round.
  The lab shows one seed so one family; the world deals all four.
- 16 The eye: blue iris ("red is not good").
- 18 Singing crystals: a geode — fourteen slim hexagonal shards growing out of a dark seed rock,
  banded and pointed ("too big and bulky").
- 20 Signal beacon: the lamp at the heart on a three-strut cradle, three spherical pulses
  spreading from the centre ("from the center instead of the top").
- 23 The library → THE DATA CENTRE: two rings of rack modules in a family of blues, each with
  a blinking status light, around a cool white core; the far picture in the same blues.
- 3, 5, 6, 11, 12, 14, 17, 19: pass, untouched. 24 the bear stays flat.
- Sheet renumbered 1–26 (three cut, five planets). sphere-sim + v47-sim kind lists updated,
  shader-check green, cache tags ?v=647. AWAITING HIS READ of the rerendered rows.

## v65 — 2026-09-04 (Claude, THE ROLLED INTERIOR on James's "do that shit")

- **Kind 30, the rolled interior.** James, after reading the interiors sheet: the ones that
  fill the ball with structure at depth (Forge, Ember Hive, Circuitry, Reactor, Library) are
  what a worldlet needs; instead of naming things, roll them — "twenty different things you
  can do, geometric shapes, patterns, textures, lighting, fog... a roll of the dice." One
  recipe (`volRolled` in the orb FS) reads a SIXTEEN-SLOT GENOME, 3 bits each, packed by JS
  into p0 (slots 0–7) and p1 (slots 8–15): lattice (honeycomb prisms / cubic scaffold /
  gyroid / foam walls / concentric shells / spiral arms / none), scale, symmetry (mirror,
  3/4/6/8-fold), solids (spheres / rods / plates / rings / octahedra / crystals / cubes) dealt
  into cells by count, hollowing (solid / shell / lace / holes), surface pattern, fog (uniform
  / strata / clumpy / core cloud / rim haze), light (center glow / sun-lit / lit rim / from
  below / pulsing / flicker), palette (one hue / two / hue ramp / data blues / ember / ice /
  acid / white + accent) + hue shift, motes (dust / orbiting / swarm / falling / embers),
  motion (spin / counter-turning / breathe / pulse / flow), density gradient, noise warp,
  cutaway (wedge / half). Far away it is a soft two-tone cloud. In the world it takes 7% of
  the deal (roll 0.53–0.60, genome rolled per orb).
- **The rolls sheet** in the Sphere Lab (`?sheet=rolls&roll=N`, the third sheet button):
  twenty rolls per roll number from a seeded generator, the genome written in words under
  each row plus its two numbers in brackets — naming a row is enough to keep it; "roll
  twenty more" steps the number. Four self-critique rounds before handing over: empty balls
  (no lattice + few solids) forbidden in the roller and the shader; sharper walls; fog
  quieter; gradient floors 0.25–0.3 so a gradient thins but never empties; solid cells never
  fewer than ~5 across; and the real bug — the cutaway was applied AFTER the symmetry fold,
  and the fold puts every point in the +x/+z sector the wedge removes, so symmetry + cutaway
  was an empty ball. Cutaway now uses the unfolded point.
- Also: the interiors sheet gained the five planets (kind 50, maps lava/ice/gas/ocean/desert)
  as rows 25–29; click an orb in the Ball · 0° column to solo a row (no more number keys),
  the solo view fits the viewport; the lab header has the sheet buttons; the admin Labs
  list links the interiors sheet. sphere-sim TEST 1 counts kind 30. Cache tags ?v=646.
  shader-check green. James's 25-item interiors verdict list (this session) is NEXT.

## v64.5 — 2026-09-04 (Claude, James flying the formations)

- **More formations.** James flew five minutes around three glow homes: rings everywhere,
  streams flying off in a line, one amorphous grouping. The formation share of the deal was
  0.13 at satellites / 0.12 at the capital; it is now 0.30 / 0.28 (about the rings' share)
  and the deal normalizes, so the other verbs shrink in proportion. New dial in
  configuration → the crowds → **formations ×** (0–3, default 1, `saeForm`; a layout
  rebuild like streams ×). society-sim TEST 16 now proves the pose only against members
  idle on their seat-trade clock (the reroll changed which group it inspects and pair 0's
  clock alone no longer stood for the rest). Rubric `crowds.md` updated. Cache tags v645.
  Formations still keep the tide (assembled about half a 140–320 s cycle) — to find one fast
  turn tide speed × up. **James's verdict on the formations, same day: "its good."**

## v64.4 — 2026-09-04 (Claude, James on the swirl orb and the galaxy)

- **The swirl seam.** v64.2 wrapped the render's whole disc onto each hemisphere, so its rim
  ring met itself at the spin equator as a black line with a dark band beside it. Now a
  patterned ball takes shading + rim from the CLEAN GLASS by the view normal (like plain
  glass) and the pattern is laid on separately: the highlight-free render's flat centre
  (|uv| ≤ 0.55) sampled on the three planes of the ball's frame, divided by the clean glass
  at the same spots so only the streaks remain, blended by the normal. No seam anywhere.
- **The galaxy.** James: "fully vertical... a vertical thing turning rather than the galaxy
  swirling around itself." The lost-stretch recipe had tilted it 66° and rolled it. Now a
  gentle seeded ecliptic tilt (12–30°) and a small roll; the ARM PATTERN turns rigidly (a
  density wave that never winds up — the first cut with differential arms wound them into
  rings within a minute) while the dust and stars stream through it differentially, inner
  faster. Sheet: two-arm spiral face-on, an inclined disc at 45°, a streak near its plane.
- Build stamp v64.4, cache tag ?v=644; sphere-sim, init-smoke, shader-check green.

## v64.2–v64.3 — 2026-09-04 (Claude, James reading the ball sheet row by row)

His reads: rows 1, 2 pass; row 3 (water) "looks like a button" — fixed as v64.1 (full water,
sun-lit scatter, small head-first fish; ballRim default 0.25 → 0.12; the retired crowd-cloud
row left the lab). Then: "why is the lava world the only one that turns correctly? ... swirling
and turning are not the same thing" and, on the galaxy in the solo view, "a white pill... it
looks like a physical object inside the sphere."

- **v64.2 patterned shells live on the ball.** The glass atlas was sampled by the VIEW normal,
  so a pattern stayed facing the eye as the camera orbited and the spin was a flat twist — a
  polar cap turning under him. Frosted / swirl / banded shells now sample by the WORLD normal
  turned about a seeded tilted axis (mirrored onto the far hemisphere like the worldlet maps):
  orbit one and you see its side; the spin is a real rotation. Plain glass keeps facing the sun.
- **v64.3 the baked highlight leaves the ball for good.** Every fix so far only moved it. Now
  each shell render gets a HIGHLIGHT-FREE copy at load — the per-pixel minimum across its own
  rotations (4-fold for plain glass, 2-fold for patterned shells so half their streaks survive);
  anything that sits at one angle only is erased, the symmetric shading and rim ring survive.
  Layers 4–7 of the shell array; balls sample them, discs keep the originals; the file://
  taint case falls back to the original. The only highlight on a ball is the shader's own sun.
  Verified on the sheet: no pill on glass, swirl or galaxy from any angle. Cache tag ?v=643,
  build stamp v64.3; sphere-sim guards the copy, init-smoke + shader-check green.
- Also this round: the Sphere Lab page typeset (header in flow, gridded column heads, structured
  row labels, one-line status) on his "organize this page, typographically."

## v64 — 2026-09-04 (Claude, PHASE 2 built unjudged on James's "open this thing up and look at the balls")

**THE INTERIORS AS VOLUMES.** Every procedural interior (23 kinds; the paintings stay flat
pictures) is a 3-D scene inside the ball now. One shared renderer: the refracted ray walks
the chord through the unit sphere in 20 steps (`volMarch`), and each kind is a recipe
(`volKind`) saying what glows at a point in the ball right now — emission + density. Far
orbs keep the flat v47 picture; the march runs only when the orb covers real screen area
(radius/distance above ~2°) and crossfades in over the picture. Scenes live in the orb's own
axes (world axes turned by a per-orb yaw), so flying around one shows its far side.

- Recipes, in the family plan's words: swirling lights = two counter-turning helical tubes;
  water = a see-through fill with caustics, four fish as lit capsules, bubbles up close;
  kaleidoscope = the ball folded into a mirrored cell; weird blobs = four metaballs;
  orrery = a sun and four planets on tilted rings (lit from the world's key light); reactor =
  pulsing core, two turning containment rings, rising filaments; data rain = falling glyph
  columns; radar = a tilted thin disc with range rings, sweep and blip; gyroscope = three
  tumbling rings; circuitry = three tilted boards with hashed traces and running pulses;
  snow-globe city = hashed towers on a floor with lit windows and falling snow; storm =
  churning fbm cloud with hashed lightning bolts; ember hive = a porous dark mass with
  embers drifting up; clockwork = three toothed gears meshing; galaxy = a tilted thin spiral
  disc, bulge, dust, stars; the eye = a solid eyeball with iris/pupil whose lid opens with
  proximity; forge = anvil block, molten pool, sparks; singing crystals = five shards pulsing
  on their own notes; moons around a hearth = three moons lit by the hearth; signal beacon =
  mast, lamp, spreading spherical pulses; metronome = a swinging pendulum with the tick
  flash; jellyfish = a pulsing bell with six tentacles; library = rings of shelves and
  hashed book spines around a lamp.
- Three self-critique rounds in the Sphere Lab's new `?sheet=interiors` (24 rows × disc /
  ball 0° / 45° / 90°): round 1 — 12 steps skipped 0.02-wide rings into dots, the water was
  an opaque blue ball, the swirl read as a plume; round 2 — 20 steps, thicker thin things,
  see-through water, helical ribbons, scale-ups; round 3 — radar / circuitry boards /
  galaxy tilted so they never sit edge-on to a viewer, gears brighter.
- Guards: sphere-sim TEST 1 now checks the march, its gate, and a recipe for every one of
  the 23 kinds; init-smoke + v47-sim green; shader-check green. Cache tag ?v=640, stamp v64.
- NOT eye-judged in the world (sound world). James's call: look, then tell me. Open: the
  frame rate with many near interiors marching at once (20 steps × the covered pixels;
  the gate keeps far orbs flat).

## 2026-09-04 (later) — the sphere lab is a Lab (Claude, James: "add it to the labs")

`tmp/orb-dimension/sphere-lab.html` → `src/labs/sphere-lab/index.html` (the tmp file now
redirects), linked from the admin panel's Labs section as "Sphere Lab". Same page: it pulls
the orb shaders live out of world.js, so it is always the world's current look. This is
where Phase 2 (the interiors as volumes) gets judged, kind by kind. James on the homes at
wrap of this stretch: "really happy with the glow homes. They look very nice."

## v63.9 — 2026-09-04 (Claude, James in flight: the glow homes "not centered inside the sphere")

James, two angles of one home near Korrudan: most of the structure up and to the right,
almost half the ball empty, a lot of it outside. Measured on the six bakes: the export
centred each roll on its BOUNDING BOX, and the spears drag that box off the body — bulk
centres sat 0.22 / 0.46 / 0.41 / 0.72 / 0.22 / 0.47 bulk radii off the origin (roll 04 the
worst, the one he was looking at). Fix in two places: the loader re-centres every GHM2
roll on its bulk (iterated 85th-percentile trimmed mean) and re-normalizes the bulk radius
to 1 about that centre, so the six existing bakes are right without re-baking (verified:
residual offset 0.000, bulk radius 1.000 on all six); `export_fields.py` centres on the
bulk the same way for every future roll (idempotent with the loader). The home look is
untouched — his verdict stands: "the home itself looks fantastic." Cache tag ?v=639, build
stamp v63.9; init-smoke (HOMES line) green.

## v63.8 — 2026-09-04 (Claude, James in flight: "a lot of the worlds are not sitting in the center of their globes")

A worldlet showed as a lit patch on ~40% of one side of its ball, the rest dark, "sticking
off into space." Cause, in the v63 globe branch: "facing the camera" was `N.z` — the
normal's WORLD z — and the sun dot mixed a view-frame light against a world-frame normal.
Both are only right when the camera looks down world z, which is exactly the lab's 0°
column, so the lab sheet looked fine and the 45°/90° columns were quietly half-dark.
Now: facing = `bnz` (normal · toward the eye) for the ball, view z for the disc; the
light dot is Nw against a world light (the nearest sun, or the fixed key light rotated
into world axes). Sheet re-shot: all four angles a full centred globe. sphere-sim guards
both lines. Cache tag ?v=638, build stamp v63.8.

## v63.7 — 2026-09-04 (Claude, James's panel brief)

James: the configuration panel "keeps being in the way of the thing I'm trying to tune";
he wants it opening at the right, a grab handle to put it anywhere, holding there until
closed and reopened — and he could not tell whether "save" saved anything, or to what.

- **Position:** opens top-right (20 px in, 64 px down), 700 wide instead of 1080 centred
  over the reticle. A header — "⋮⋮ configuration · drag here to move" — is the grab handle
  (pointer capture, clamped to the window). The position holds until the panel is closed;
  opening it again resets to the right.
- **Save feedback:** a status line under the preset row. "save" now says exactly what
  happened: `saved "name" — it is the start preset, so this is what loads next time`, or
  `saved "name" — NOT the start preset ("x" loads next time); press "set as start"`. The
  button flashes "saved ✓". "apply" and "set as start" report too; an empty name says so
  instead of silently doing nothing.
- **Addendum, same hour:** James pressed "set as start" on v63.7 and saw nothing. Two
  causes fixed: index.html loaded world.js/world.css with NO cache tag (a normal reload
  could serve the old file) — both now carry `?v=637`, bump it with every build stamp; and
  the status line sat at the bottom of a scrolling panel — every message now also shows in
  the header hint, which never scrolls away.
- Rule kept (memory name-the-panel-section): every dial pointer from Claude is
  "section → dial"; ship defaults, not more sliders. Build stamp v63.7; init-smoke green.

## v63.6 — 2026-09-04 (Claude, James's go: "just do what you just said, and it'll be cool")

**THE FORMATIONS** — a seventh crowd verb, in place of the retired cloud. James's riff:
groups come together into a variety of shapes, not just a ring — a 3-D pentagram, a
hexagon, a Bucky ball, a cube with patterns on its faces, or just an amorphous floaty
cloud where they settle in and hang out.

- `saeFormation(shape, n, R)` (inside the society block, pure math): six seat generators
  at ~25 m spacing — (0) hollow sphere on the Fibonacci spiral; (1) polyhedron by
  headcount: icosahedron < 24, dodecahedron < 50, Bucky ball (truncated icosahedron)
  from 50 — vertices first, then the edges traced with as many subdivisions as the crowd
  needs, seats picked by stride so a thin crowd still shows the shape; (2) cube, a
  pattern per face rolled from ring / grid / diamond; (3) five-pointed star in two
  perpendicular planes, the second turned 36°, seats at the plane crossings deduplicated;
  (4) hexagonal prism, edges traced; (5) the lazy cloud — jittered cells inside a ball,
  seeded shuffle, plus a slow personal drift in the pose.
- The group: verb 6, 14–40 beings, center on a slow orbit around a sun (1.4–2.3 radii,
  capital guarded by the shape's radius like a ring), the shape turning about its own
  axis (Rodrigues, 140–320 s either way), a ±5% breath, partners (k, k^1) trading seats
  on a 34–70 s clock staggered per pair, the chorus morph clock, tidal assembly and
  break-away like a congregation. Weights: capital 0.12, satellites 0.13 (the others
  moved to make room; Mediant's first gathering is now always at the towers because the
  deal's RNG order moved and TEST 12 caught the towers going dark).
- society-sim TEST 16: 22 formation groups across the default + ceiling rolls, seats =
  headcount, nearest-seat spacing 12.8–56.7 m (bars 8/95; the star's crossings were the
  2.2 m offender before the dedupe), all six shapes rolled, radii 30–420 m, and the pose
  reproduces the seat geometry at full tide. All nine sims green. Not judged by eye —
  James's call ("this time I don't think I need to judge it"). Build stamp v63.6.
- `crowds.md`: the verb table has seven rows; the cloud section reads RETIRED.

## v63.5 — 2026-09-04 (Claude, James in flight: "the whole thing just isn't working at all")

**THE CROWD CLOUDS ARE RETIRED.** James's read after v63.4: the individual beings already
work — tiny dots from far away that "naturally turn into these amorphous glowing cloud
energy beings" up close, rings and lines, glyphs, the break-away — "no complaints." The
cloud stand-in was "fuzzy puffballs from any distance," a repeating texture, bright only
in the middle, that turned with him, faded as he neared, and that beings flew straight
through on their missions. No stand-in can beat the real thing here, so none is drawn:
no kind-66 orb is ever made (`CROWD_CLOUDS = false` at the group roll), the "crowd glow"
dial is gone from the panel, saved cfgs carrying `saeCloud` are ignored. The kind-66
shader, `saeCloud()`/`saeCloudGate()` and society-sim TEST 14 stay (the sim's geometry
contract; sphere-lab row 9 still shows the retired look). Build stamp v63.5; society-sim,
init-smoke, v47-sim, sphere-sim green.

## v63.4 — 2026-09-04 (Claude, James in flight: "it looks like burlap. See for yourself.")

James flew v63.3 and found "faded pieces of fabric... tiling" floating in space around
every sun in the town's colour, parallaxing, fading to nothing up close, and at MAG ×4.9
a plain woven lattice of plus-shaped blobs. Claude first read it as the v61 crowd clouds
(kind 66) and it was — but his point stands: they were never right at a group's size.
The grain was value noise on a 34-cell grid; blown up to a 300 m group it IS a weave.

- **The speckle.** New `speck()` in the orb FS: soft dots at jittered cell points, not
  every cell lit (55%), size rolled per dot, summed over three layers at unrelated pitches
  and rotations — no lattice survives. Cloud = `0.10 + 1.6 × speckle`, envelope and gate
  unchanged. Judged at real size in sphere-lab (new row 9, a crowd cloud in the close
  sheet; crop tmp/snapshots/cloud-crop.png): many small lights of uneven size, no weave.
- **The crowd lab** was still on the 20-float stride from before v63 (it would have
  bound nothing to i5 and drawn every cloud as a self-lit ball): FLOATS 24, attribute 6,
  beings flag 1 / clouds flag 0, uSphere + uBallRim set. Sheet re-captured.
- Kill switch stays: "crowd glow" in "the crowds" group. Build stamp v63.4; shader-check,
  sphere-sim, init-smoke green.

## v63.3 — 2026-09-04 (Claude, James's third lab read: "much improved")

- **"ball edge" dial** (`ballRim`, 0–1, default 0.25, "the air" group): how much edge a
  ball shows — the atlas ring past |uv| 0.80 keeps only `ballRim` of itself and the
  fresnel term is 0.16 × ballRim. 0 = no ring, no fresnel; 1 = the full atlas ring.
  James: the blue, red and purple orbs "are not reacting well" to any bright outline;
  the lava globe is different (a glowing world). Discs never touched by it.
- **The lab**, his readability brief: cells 600 wide with a 420 px label gutter (nothing
  zoomed — the vertical FOV is fixed, so the balls stay the same size), 22 px labels, the
  bar 19 px, row names wrapping inside the gutter (an absolutely positioned label inside
  a zero-width layer wraps after every word — the layer now has the canvas width).
- Build stamp v63.3; sphere-sim (dial in the contract), init-smoke, shader-check green.

## v63.2 — 2026-09-04 (Claude, James's second lab read)

- **The highlight, for real.** v63.1 turned the atlas by the wrong sign (the shader's
  mat2 is a rotation by −ang) and guessed the baked highlight at −135°; measured on the
  PNGs it sits at −126° in atlas uv. Now `ang = atan(D) + 2.199` — the close sheet shows
  the highlight on the lit side (upper-right, the lab's fixed light) at every camera
  angle. Column 1 is the OLD DISC, whose highlight still spins with the spin dial — that
  is the pre-v63 world, kept as the reference, not a bug.
- **The rim** (James: "way too bright... ruins the effect" on every dark orb): on a ball
  the atlas's baked white ring is halved past |uv| 0.86, the fresnel term 0.24→0.08,
  the diffuse 0.10→0.07, the pin 0.45→0.35. Discs untouched.
- **The lab:** 1:1 device pixels (no stretch to the window; scroll), column and row
  labels drawn over the sheet. Build stamp v63.2; sphere-sim green.

## v63.1 — 2026-09-04 (Claude, while James flew v63; his lab read)

James read the sheet: the four columns were unexplained (disc / ball with the beam at 0° /
45° / 90°); "a strange white cloud, oval pill-shaped thing in the bottom left" on every
ball, turning with the world on the spinning swirl orb; the water ball reads well, the
galaxy and the bear still read 2D, the lava worldlet is the most effective, the heart
ball "neutral gray", the Saelyri fine — "about sixty percent effective."

- **The pill was the atlas.** The four glass shells are Blender renders with a big
  highlight baked at lower-left (upper-left of the PNG), and a ball sampled the atlas by
  its true normal, so the highlight sat at a fixed screen place on every ball and spun
  with the spin dial. Now on a ball the atlas is TURNED TO FACE THE KEY LIGHT (the
  baked highlight direction rotated onto the light's screen direction) and never spun;
  self-lit balls (hearts, eyes, beings) hold it up. Discs keep the old look exactly.
  sphere-sim TEST 1 guards both lines. Sheet re-shot: the highlight sits on the lit
  side in all three angles, the swirl orb's holds still.
- **The gray heart is the lab, not the world:** a heart ball is a near-white veil at
  uHeartOp 0.3 by design (v62.1) and its white-hot read in-world comes from the field
  home glowing inside it; the lab puts nothing inside. Left as is.
- **Galaxy + bear flat:** correct — every interior is still a 2D picture behind curved
  glass; Phase 2 starts with the galaxy and the swirl. His new thread, recorded as a
  placeholder in the world CLAUDE.md START HERE: real MESHY MODELS inside the glass for
  interiors not worth doing in-shader (the bear first). Not now.
- Build stamp v63.1. Shader-check, sphere-sim, init-smoke, v47-sim green.

## v63 — 2026-09-04 (Claude, solo on James's "you choose... make it all the way through") — THE BALL, PHASE 1

Every orb is a real three-dimensional shape now. James's 2026-09-03 verdict ("circular TV
screens facing you... it has to") had a two-phase plan; he sent Phase 1 off unattended with
two choices left to me (dust/veils/crowd clouds stay discs; one key light per orb from its
nearest sun) and one gate kept: his flight.

- **THE BALL.** The orb fragment shader hits a real sphere per pixel with the true
  perspective ray (the camera is the origin of ship space, so the ray is the quad point's
  direction — lens shift, zoom and aspect come for free). A hit gives a surface point, a
  normal, and `gl_FragDepth` at the real surface; misses keep the card's depth. Orbs still
  never WRITE depth (they are glass), but they now test per pixel against the geometry:
  a field home's spears stand in front of the shell where they pierce it and behind it
  where they don't — the "weird and suss" heart balls are fixed at the root. The math runs
  in a distance-normalized frame: the plain `|c|² − r²` form loses a 30 m radius
  entirely at 200 km in float32 (sphere-sim TEST 3 proves it).
- **Eligibility** (`i5.w`, a sixth instance vec4 — FLOATS 24, attribute 6): 0 = stays a
  disc (dust, veils, glyphs, creatures 61–64, crowd clouds), 1 = a ball that is its own
  light (hearts, eyes, the Saelyri), 2 = a ball lit by its nearest heart. The JS picks each
  lit orb's nearest heart every 24 frames, staggered — the whole field costs ~10k distance
  checks a frame.
- **The glass** samples the same rendered-ball atlas by the true normal, with the disc's
  own screen gradients (`textureGrad`) so the thin rim ring survives the limb's uv
  compression. The atlas is a rendered ball with baked reflections, so it stays
  view-locked on purpose (reflections do not rotate with a ball); its spin is unchanged.
- **The sun on the glass:** a soft lit side, a fresnel rim that brightens toward the light,
  one hot pin (pow 48). Modest — the light inside stays the subject.
- **Interiors** (all 26 + the paintings) are still 2D scenes, sampled at the point where
  the refracted ray (eta 0.84) crosses the center plane: they bulge and magnify a little
  and slide with the angle. Phase 2 makes them volumes.
- **Worldlets are true globes:** the map lives in the globe's own frame (fly around one
  and see its far side), lit by its nearest sun.
- **The Saelyri** raymarch in world axes with the ball on: a being has a real front and
  back; "facing the pod" is a world-space yaw toward the camera. The far mote LOD is
  untouched.
- **The card grows to hold the silhouette** up close (a ball's outline is wider than its
  radius under perspective — 1.57× at 1.3 radii); untouched beyond a few radii, so the
  overdraw discipline at distance is exactly v62's.
- **The dial:** `sphere` ("real spheres", 0–1) in "the air" — 1 by default; 0 is the
  pre-v63 disc per pixel, so a screenshot A/B in flight is one slider.
- **Lab:** `tmp/orb-dimension/sphere-lab.html` (KEEP — where the ball gets judged): eight
  families × (disc 0° / ball 0° / 45° / 90°) with a real depth-writing beam through the
  glass, plus a close sheet at real size. Three self-critique rounds: (1) the sheet
  worked first try except the rim; (2) beings put in world axes; (3) THE FIX — facing was
  measured against the center line, not the pixel's ray, so at 3 radii the silhouette
  still "faced" by 0.33 and the atlas rim (0.94–0.985) was never reached — everything read
  magnified and rimless (sphere-sim TEST 4 keeps it). Sheets in tmp/snapshots/
  sphere-lab-sheet.png + sphere-lab-close.png.
- **Guards:** new `sphere-sim` (6 tests: source contract, hit exactness 2e-14, the
  float32 case, the rim, card coverage from 0.7 radii out, the key-light pick); v47-sim
  TEST 4 restated to the 24-float stride; init-smoke, the other eight sims and
  shader-check green. Build stamp v63.
- NOT IN-WORLD-VERIFIED BY EYE: the world has sound, so no pane pass (house rule); the lab
  and the guards stand in. AWAITING JAMES'S FLIGHT: heart balls with homes inside, a
  worldlet flyaround, a Saelyri up close, frame rate (one sqrt per covered pixel plus the
  refract; `gl_FragDepth` costs early-z on the orb pass), and the "real spheres" A/B.
  NEXT (his go, kind by kind): Phase 2, the interiors as volumes.

## v62 — 2026-09-03 (Claude, James's go after the lab round: "nice. these look great. go for the next step") — THE FIELD HOMES IN-WORLD

The generator's rolls now stand inside every Saelyri shell.

- **Bake:** `tmp/orb-dimension/export_fields.py <NN> <seed> [order]` runs `glowhome_fields3.py`
  in its `--export` mode (leaner: 4-sided filaments, half-segment rings, 2-segment bevels and
  none on the small tier, no small-tier ribbons, no motes, fewer connectors/spikes) and writes
  `assets/homes/fields-NN.bin`, magic **GHM2** — the GHOM 8-float record, but uv.x =
  class×1000 + hue° (0 pane / 1 ribbon+filament / 2 blob / 3 crystal) and uv.y = the piece's
  opacity; vertices shared per polygon, flat normals. Six rolls baked (seeds 31/32/33/41/42/43,
  orders 0.3/0.5/0.7/0.4/0.6/0.35): 40–51k tris, 2.9–3.8 MB each, 22 MB total. The first bake
  was 157k tris / 16 MB — bevels and 48-segment rings on the small tier — hence the export mode.
- **World:** `glowHome` is a name list; all six fetch in parallel (GHOM files still load as
  kind 2). `homeMesh` deals each shell one roll (`cfg.homeSeed` rotates the deal, dial "home
  roll" 0–5 in configuration · the societies, its own change handler → `uploadCommunities()`
  only) and a uniformly random orientation — no gravity, no up. Glass program kind 3 + class/4:
  panes fresnel-dim at their own opacity with a slow shimmer, ribbons/filaments hot lines, blobs
  hot-centre/clear-rim, crystals denser and core-lit; colour = render palette (hue) pulled a
  quarter toward the family hue. HOME_FIT unchanged (0.45 × nd.r). Tag `glowHome.v` = 3.
- Nine sims green (init-smoke's HOMES line now exercises all six), shader-check ALL PASS.
- **RECORDED, NOT BUILT — every sphere becomes real 3-D (James, same night, after
  asking straight out whether the balls are spheres):** the honest answer is no — every orb
  is a camera-facing disc with a gradient, and with real geometry inside a heart ball it
  shows ("they act really weird and suss"; the interiors "look like circular TV screens
  facing you"). His order: every sphere in the world becomes a real three-dimensional
  shape, not just the homes — "it has to." Plan agreed in outline, awaiting his go and his
  timing: PHASE 1 sphere impostors for every orb (per-pixel ray-sphere, real normal + depth
  write, rim + specular, wrapped shell texture, refraction parallax, worldlets as true
  globes); PHASE 2 the 26 procedural interiors rebuilt as volumes kind by kind (paintings
  may stay flat pictures in a ball). Root todo item 0 (f).
- **v62.6 — REVERTED to the screenshot state.** His read of v62.5: "all weirdly
  translucent... go back to exactly what it looked like." v62.4's aerial/fog exemption, the
  ribbon-floor change and v62.5's far-sharp ramp all removed; the shader is the v62.3 code
  with the v62.2 light numbers again — exactly the three-screenshot state. The far "pale
  peach" read from that state stands as an open item for a calmer session, measured first.
- **v62.5 — I misread the three shots.** His verdict: the near shot that clips to white "is
  the whole thing... that's the best any of these glow homes have looked"; the FAR shot is
  the problem (peachy, washed out) and he wants far = "bright like that but a smaller point."
  Knee removed, pane/crystal sun back to 0.6 / 1.5. Far fix kept (no aerial, 1/3 fog) plus:
  beyond ~3 shell radii the sharp draw ramps to full strength (12 radii = all sharp), so a
  far home is a hot compact point instead of a fixed-radius blur diluting a small object.
- **v62.4 (three screenshots: far / mid / near — "pale peach... washed out" far, white-hot
  and structureless near):** far = the glass program's aerial desaturation + full fog on the
  homes (they are light, not structure) → homes now skip aerial and take 1/3 fog, like the
  hearts' read; near = the haze add clipping to white in all channels → the composite gets a
  soft knee by max channel (saturates toward the warm colour instead of white); pane sun
  0.6→0.5, crystal sun 1.5→1.2, melted-ribbon floor 0.35→0.5 so far lines keep definition.
- **v62.3 (his third look — "BY FAR the best these have looked... thumbs up", but "a bit
  too bright" and "too small... sticking out of the balls in many places and mostly filling
  the balls"):** the bake now normalizes on the BULK (85th-percentile vertex radius = 1)
  instead of the longest spear — the lattice body sits at HOME_FIT 0.68 nd.r (the heart
  ball is 0.5) and the spears run 2–3.4× further; all six re-baked, `glowHome.v` 4. Light
  cut ~40%: pane/crystal sun terms, ribbon and blob strengths, and the haze add
  (0.35 + 0.75·homeBlur, was 0.6 + 1.4·). "The color of the light is great. Very sun-like.
  Warm and inviting" — palette untouched. HIS READ: "pale peach really washed out. No
  definition. Lost all of its warm sun color" — the enlargement alone spread the light over
  ~3× the area, and the cut stacked on it. Light restored to the v62.2 numbers, size kept.
- **v62.2 (his second look, with two screenshots):** structurally "still look pretty cool...
  there's definitely three-dimensionality"; colours drifted orange/peach + an unexpected
  purple ("I could probably live with it"); the homes PULSED between opaque and skeletal;
  and the ribbons sparkled as "all the little dots" at distance — his ask: "a significant
  amount of blur on them... would really help the whole vibe." Built: (1) THE HOME GLOW
  PASS — the homes drawn a second time alone into a quarter-res target (a depth pre-pass
  of the skull + Cadence cores keeps the haze off the bone), two separable gaussian blurs,
  added over the finished frame on its own texture unit (9); dial `homeBlur` ("home glow
  blur", default 0.7) trades the sharp draw for haze; (2) the home breath steadied
  (0.85 + 0.15 sin, was 0.55 + 0.45 — that was the opaque↔skeletal pulse); (3) ribbon melt
  — a 0.8 m line under ~3 px dissolves to a faint average by fwidth(vP), the v55 discipline.
  Nine sims + shader-check green. AWAITING his look at the haze level and the colour drift.
- **v62.1 (his first look):** "too small inside the balls... they should be sticking out
  on all sides" and the heart ball "is just another force field" — HOME_FIT 0.45 → 0.9
  (doubled, past the ball), and the orb shader gained `uHeartOp` (cfg `heartOp`, default
  0.3, dial "heart ball opacity" in the societies group) that dims the heart-flagged shell +
  core glow only (halo untouched — the long-range read). The v60.1 "homes must stay inside
  the heart orb" correction is retired.
- AWAITING JAMES'S FLIGHT: how the homes read through the shell at approach, the class
  brightnesses (ribbons may be hot), frame rate with ~50k tris × every shell, and the deal dial.

## 2026-09-03 — Claude with James (headless rolls, his eye each round) — THE GLOW HOMES: generator v2/v3

James's read of the held v1 (`glowhome-roll-s31-2d-b.png`): "too far apart... no coherency in the
middle... solid pieces floating together more than a space home made out of force fields." Rebuilt
headless, three seeds per sheet, his verdict between rounds. All in `tmp/orb-dimension/`.

- **v2 `glowhome_fields2.py` — the structure.** A dense lattice of decks and walls crossing at the
  axis that every other piece passes THROUGH (overlap, never spacing; density falls off with
  distance); shards still fly in from any angle. His correction on my first plan: not
  structure-in-the-middle / chaos-outside — ONE `order` dial rolled per seed in **0.3–0.7**, every
  piece snaps to the lattice or goes free against it, so some seeds are tidy and some are storms,
  all with a spine. Three size tiers so it reads as technology: macro plates, mid containers
  (20–80 m), small connectors (3–15 m) clustered around them. Verdict: "structurally, I love them.
  They're fantastic... I can completely live with them as they are." Colour (honey + a little
  teal) right.
- **v3 `glowhome_fields3.py` — his material + shape pass, in order:** (1) per-piece opacity
  0.4–0.6 driving tint AND emission, a slow ~80 m shimmer in the glow, compositor bloom (the
  blend's `glow-comp` group, retuned), light motes through the core, amorphous plasma blobs —
  the first cut was a firework that whited the centre out, pulled back ~3×; (2) cubes cut to
  rare, roster = hex/pent/oct/decagon prisms, dodecahedra, icosahedra, pyramids, 6- and 10-point
  stars, ovals, rounded triangles, blobs; (3) bezier corner rounding on ~1/3 of flat shapes;
  (4) 4-segment bevels on 1/2 of the solids (ribbons skip bevel strips); (5) core density +30%
  and THICK CRYSTAL COLUMNS from the r2 look (hero obelisk + 4–16 faceted columns with pointed
  caps + spike clusters) — then his no-gravity reminder: columns point along any lattice axis or
  anywhere at all, thickness 4–40 m; (6) THE LAB — eight instrument recipes built as ordered
  assemblies in their own frame (cyclotron, viewing tank, spectrum analyzer, scope, radiation
  etcher, Asgardian spire array, dish, reactor torus; 6–10 per seed, ~72% near-but-off-axis, the
  rest out in the arms), ~100 filaments strung instrument↔instrument, container↔container and out
  to the decks, and five blues (cobalt/sky/indigo/ice/azure) beside the teal.
- Sheet tooling: `gh_sheet.py` stacks renders (Blender python + numpy). Renders:
  `glowhome-roll3-s31-o30 / s32-o50 / s33-o70.png` + `glowhome-roll3-sheet.png` (v2 set as
  `glowhome-roll2-*`). ~25–60 s a render at 64 samples.
- Open: the cores run hot where columns stack (honey pushes toward pink under AgX) — crystal glow
  was cut once, would go further on his word. NEXT with his go: the export route — the generator's
  fields as GHOM into every shell via the home pipe (`weld_bldg.mjs` / `export_home.py`), seeds +
  order as dials. The lab pieces mean the in-world glass program needs the per-object opacity and
  the filament/blob materials before it matches the render.

## 2026-09-01/02 — Claude with James in the live Blender window — THE GLOW HOMES: the plane-stack session

Live co-drive (his format, one step and his word each time). Where it landed and
what it taught, in order — James's verdicts in quotes:

- Step 1–3 slabs of glass on a stage floor: "plastic," "frosted." Glass reads through
  reflections; on black there is nothing to reflect. The MCP render shortcut skips the
  compositor (a "bloom" render was the plain image) — render through
  `bpy.ops.render.render(write_still=True)`.
- Real scale matters ("large sheets of glass look different"): the scene went to world
  size — homes are 330–900 m across (0.45 × shell radius, Mediant to capital). Beings
  10 m are the scale reference.
- "It's not supposed to be inside a sun. They're SHELLS" — the glowing balls are shells,
  not suns, and the inside is dark. Render on black.
- THE GENERATOR (his brief: hundreds of pieces, Fortress of Solitude 50 / Frank Lloyd
  Wright 30 / Claude 20, lots of randomness): seeded roll — four repeated-with-variation
  terrace arms, giant diagonal cantilevers, crossing fins, three shard clusters with
  jagged multi-point tips, rings, dials with spokes, a core beam. Roll 1 "a messy
  carpenter's backyard" (uniform lumber, daylight); roll 2 better (dark, hierarchy);
  roll 3–4 "sheets of marble" (my rim term painted every face — Blender's Layer Weight
  Facing spreads unless raised to a high power; four rounds went by before I read the
  node values back instead of guessing).
- Circuit traces on the faces (parallel runs, 45°/90° turns, 10% jagged — drawn as a
  tileable PNG, `tmp/orb-dimension/gh-traces.png`): "kills the scale" — fine detail says
  small object. Traces off.
- "Force fields have no thickness" — every piece became a single 2D face; boundary glow
  as REAL 0.8 m emissive ribbons inset along each outline (the Wireframe node draws the
  triangulation seams). Faces: transparent + fresnel glossy skin + faint tint, hue by
  object color, 10% teal. Transparent bounces 128 so twenty layers stay see-through.
  Verdict on the result: "actually pretty cool... good progress. I'd like to hold here."
- FILES (all in `tmp/orb-dimension/`, outside git like every world .blend):
  `glowhome-fields-v1.blend` (the held state, 190 objects, seed 31),
  `glowhome-stack.blend` (the working file), renders `glowhome-roll-*.png`
  (`-s31-2d-b.png` is the held look). Reference target from GPT: James has it in chat;
  asked him to save it as `building models/renders/glowhome-02-GPT.png`.
- NEXT (his go): thin/dim the core beam (it splits the frame), honey not tan, then the
  export route — the generator's fields as GHOM into every shell via the home pipe (the
  world's glass program already does transparent faces + hot edges), new seeds as a dial.
  The generator code lives only in this session's Blender history — write it to
  `tmp/orb-dimension/glowhome_fields.py` before rolling again.

## v61 — 2026-09-01 (Claude, James's go: "great plan. let it rip!") — THE CROWDS

James's verdict after flying B1 (2026-08-14/15): the Saelyri were "teensy and
sparse" — he wants ~600 per town, 1,000 at the capital, and purposeful crowd
behavior. Design conversation 2026-09-01: eight questions, he took every rec
(spec: `expansion-spec.md` "The Saelyri crowds"). Built solo the same session.
Rubric: `crowds.md` (READ IT before touching any number below).

- **The one rule that shaped everything:** a crowd reads from CLUSTERING, never
  from the count — the capital shell is ~20 km across and a being is 10 m, so
  1,000 spread evenly sit ~80 m apart per sun. Every group is now sized to its
  headcount at 15–40 m spacing.
- **The group roll** (`saelyriLayout` → `{ mem, grp }`, inside the society-sim
  extraction markers): 85% of each population dealt into groups doing one of six
  verbs — CONGREGATION (a tight ring, n × 22 m / 2π, whose center orbits a sun;
  the ring morphs on ONE clock, the chorus), STREAM (a column of commuters riding
  one bridge, emerging from one sun's heart and vanishing into the other's),
  PAIR (two circling each other), GATHERING (a knot at a landmark — the bone at
  1.08–1.14 × the skull ellipsoid and never the face cap at the capital, the
  test towers off Mediant, a bridge-side plaza elsewhere), HOME TRAFFIC (one
  lane per group in and out of the sun's core), PLAY (a chase line on a
  lissajous loop). The verb mix follows the weights exactly (largest-deficit
  deal — a random draw gave one seed's capital twice its share of rivers).
  Solos keep the v56 private orbit; every member owns one too.
- **Tidal:** congregations and gatherings assemble ~50% of a 140–320 s cycle,
  disperse to private orbits, and come back (`saeTide`). Every pose is a pure
  function of t (`saelyriPose`, `saelyriMorph` — also in the markers), so 4,000
  beings cost trig and the sim can prove all of them.
- **Korrudan discipline, generalized:** capital rings/orbits re-roll until clear
  of the bone (v56 guard + ring radius), stream routes reject bridges that cut
  the ellipsoid, home lanes face outward, play/lane reach is bounded by the sun's
  clearance, and EVERY capital pose is pushed to en ≥ 1.04 as a last step (a
  low-tide blend between two exterior points can still chord through the bone).
  society-sim TEST 13 samples 33k capital poses: min en 1.040, pushed share 1.3%.
- **Crowd clouds (kind 66):** one grainy glow per assembling group, the far read
  that resolves into beings as you close — gone inside 2.5 radii (the near-fade
  IS the frame rate), full beyond 4, scaled by tide and headcount; under the gate
  the quad collapses to a point. TEST 14 bars cloud fill at 6 screens (0.77).
- **Greeting in a crowd (James's pick):** a group notices you through its nearest
  member; acknowledgment ripples outward at ~45 m/s; the six glyphs go to the
  six nearest greeters; chords add a 6 s per-group spacing (a knot answers as
  one voice).
- **Dials:** the tuner's new "the crowds" group — capital beings 0–1,500 (1,000),
  town beings 0–900 (600), group size ×, in groups, streams ×, tide speed ×,
  crowd glow, greet range. `saelyri` (0–120) retired; `citizens` 9 → 12.
- **THE LAB — `tmp/orb-dimension/crowd-lab.html`** (KEEP): the real orb VS/FS +
  the real roll, six vantages, sheet via /api/dev-snapshot. Two self-critique
  rounds before James sees anything: round 1 — clouds read as bigger suns
  (smooth blobs) and "inside a congregation" was 300 m gaps (rings sized to the
  sun); round 2 — rings/knots sized to headcount, one lane per home group,
  denser stream columns, grainy speckle clouds → knots read as crowds, streams
  as roads of light, clouds as faint grain.
- Sims: society-sim TESTS 12–15 rewritten/added (the roll, the poses, cloud
  overdraw, the tower count restated — `SAE_TOWERS` must equal BLDG_KINDS),
  v47-sim kind coverage grew 65 + 66; the nine-sim suite green; shader-check
  ALL SHADERS PASS (kind 66 lives in the main orb FS).
- Same session: the tuner is the **configuration panel** — "GOD MODE" retired
  everywhere but old changelog entries (James: "that's goofy... it's my fault").
- JAMES FLEW IT the same day: "it looks dope!"
- Still open from that flight: crowd feel at the capital and Mediant, the ripple
  greeting inside a knot, whether clouds read honest from the approach, frame
  rate at 2,800 beings (his gaming laptop is the gate), and his dial picks.
  Not built, by design: approach behavior (a later personality pass).

## v60.1 — 2026-08-17 (Claude, James's spec) — hex homes: the Saelyri sun interiors

- **The 11 random node-crystal quads inside every Saelyri sun are gone; in their place
  the HEX HOME** — James's dictated structure after a long round of failing to get GPT
  to draw it: FIFTEEN hexagonal plates in three mutually perpendicular stacks of five,
  every plate centered on the sun's own center. Per stack: full-width plate through the
  middle, an 87 % pair at ±0.5, a 53 % pair at ±0.85 (a true sphere section — width =
  √(1−h²); 100/60/40 was rejected on a Blender A/B, it reads boxy). Largest plate =
  0.95 × sun radius. Same glass shader, aux kind 2 (the throbbing sun glow), so it is
  the same energy material the suns always had. **Each stack speaks its own family hue**
  (fam, fam+2, fam+4 mod 5) so the three axes read apart — James's ask for the
  reference render; easy to collapse to one family if he wants it quieter in-world.
  Frame is seeded per sun (`frame3(rdir())`) so no two homes sit identically.
  `hexPlate()` = 6-vertex fan in the glass buffer.
- society-sim TEST 9 (glass overdraw) now walks TRIANGLES via the index buffer instead
  of assuming 4-vertex quads at stride 60 (hex fans broke it: NaN). 12/12 green;
  reef-sim all pass. Shader untouched.
- Look-dev artefacts: `tmp/orb-dimension/hex-sphere/hex_sphere.py` (headless Blender,
  three colored stacks, near-frontal camera raised 14° / offset 7°) + its PNGs.
- **v60.1 postscript, 2026-08-18 early — THE LOOK-DEV GRIND AND ITS VERDICT.**
  On James's "do it all right this minute, three judged rounds minimum," a
  Blender look-dev harness went 13 rounds against `glowhome-01.png`:
  `tmp/orb-dimension/glowhome_look2.py` (full-res welded mesh, planar dissolve,
  teal by planar PANEL not island — the weld makes one island; alpha-glass
  material; core-falloff + Facing-edge emission; own edge RIBBONS on crease/
  boundary edges tiered by panel size — Freestyle cannot run headless in 5.1,
  linestyle reads None at render even on a cube; bmesh column/heart; Bloom via
  the Glare node's "Type" input socket; compositor is `scene.compositing_node_
  group` in 5.x) + `glowhome_compare.py` (side-by-side sheet + contrast /
  darkface / edges / teal / core / hot metrics; every round has a `-vs.png`).
  Bugs found the hard way: Layer Weight FRESNEL returns 1.0 on backfacing normals
  (the soup's winding lit whole plates cream — use Facing); hashed alpha needs
  emission INSIDE the mix pre-divided by alpha, blended needs it OUTSIDE; blended
  emission is additive across ~20 stacked surfaces, so per-face body glow must
  be tiny and edges carry the read. Metrics converged (darkface 0.51 vs 0.50,
  hot 0.017 vs 0.021) but the LOOK plateaued. JAMES'S VERDICT: aesthetic peak
  was r2 ("beautiful colors and a nice glow"), none of the later rounds worked,
  and the model sat rotated ~45° wrong the whole time. His diagnosis is the
  right one: the Meshy mesh is marching-cubes soup, not sheets of glass — the
  Bryce approach (clean glass planes, copy/rotate/shrink/stack, a center light)
  is what to build, and he wants it done in the LIVE Blender window with him
  watching and stopping me step by step. Next session starts there (his go
  given). World state unchanged tonight: Meshy homes in the suns, hex fallback.
- **v60.1 same night — THE GLOW HOMES (James's Meshy route).** He took a GPT concept
  of the habitat to Meshy (`building models/renders/glowhome-01-highres.glb`, 1.9M
  tris; `glowhome-01.png` is the 2D target — dim amber glass, bright edges, hot
  core, a few teal panels) and theorised: keep Meshy's structure, throw away its
  material, re-light it as glass from inside. Proven in Blender first
  (`tmp/orb-dimension/glowhome_look.py` → `glowhome-01-look.png`: emission×fresnel
  + Freestyle amber edges — reads like the PNG). Then in-world: weld_bldg +
  decimate_bldg by name (45k) → NEW `tmp/orb-dimension/export_home.py` → 14k-tri
  `assets/homes/glowhome-01.bin` (magic GHOM, big-endian like the others,
  unit-normalized, Y-up, flat split normals) → world.js `glowHome` loader +
  `homeMesh()`: every sun gets the structure at 0.45 × nd.r (inside the heart orb),
  own yaw, drawn by the GLASS program as kind-2 crystal (fresnel = dim faces/bright
  edges, the sun term glows it from the core, family hue). Served only — the hex
  plates stay as the file:// / not-loaded fallback (`homeV0/homeI0` mark the glass
  tail; uploadCommunities cuts there and appends the homes). init-smoke now serves
  the .bin through its fetch stub and asserts the mesh path ran (HOMES line);
  society-sim 12/12. AWAITING JAMES'S FLIGHT: fit inside the ball, opacity/edge
  read at flight distance, whether 14k tris × ~32 suns costs frame rate (drop the
  export TARGET if so), and the teal-accent question (single family hue for now).
- James flew it: "pretty cool" — but too many colors, and the plates stuck out of the
  balls (they always were supposed to be inside; the old random crystals did too and
  never got called). Fix same session: plates sized to the VISIBLE ball (heart orb
  fixedR = nd.r × 0.5) → largest plate 0.45 × nd.r; ONE family per sun (nd.fam for
  all three stacks). society-sim still 12/12. Open: plate opacity face-on (the glass
  fresnel goes dim head-on; a floor alpha would make it a "uniform force field").

## v60 — 2026-08-17 (Claude, James flying) — attitude jets, head-look, wider eye, building-01c

- **Turn rates +10 %** (yaw 28→31, pitch 20→22, roll 29→32 °/s, arrows 0.7→0.77 rad/s) —
  James tried 2× first ("turn much faster"), then "put it back and boost it by 10 %".
  DEFAULTS + james-prefs-01 + a stickModeV<4 migration.
- **ATTITUDE JETS** ("I'm not a plane"): R/F rise/sink along the pod's OWN up, Q/E slide
  left/right — free, builds 0.5 s, coasts 3.2 s, X brakes; `rcsTop` 120 m/s (GOD MODE · drive,
  "jets m/s"). Level-off moved R → **Caps Lock** (his pick). Impulse 240→200 m/s and its
  coast 3.2→5 s (IMP_COAST — impulse ONLY, he clarified; booster + jets keep 3.2).
- **THE EYE IS NOT THE NOSE**: `camBasis()` now composes cam + `head` (right-mouse-drag
  head-look, ±100°/±70°, eases home on release) + `lead` (look-into-the-turn, ≤6° toward the
  turn, slow ease). Flight/autopilot/stick/rotation all still read `cam` (pod contract intact);
  movement uses `cam` explicitly. FOV 60→72°. His brief: circling a building felt blind ("my
  camera has always frozen straight ahead"); NMS-style lock-on ("super goofy") refused; he
  picked head-look + lean + wider FOV. Note: `locked` on the nav ring is judged in eye space —
  fine while lead ≤6°, revisit if head-look ever arms lock-on by accident.
- **building-01c-tower** in-world (BLDG_V 27; kinds row, vantage null): six thin discs down a
  pipe-bundle shaft — placer v3.2 (see buildings.md): whole-height disc detection off the radius
  profile + roundness, rim rows sized from the guide's amber extent, dense rims, cyan under-disc
  trims, collar gated. Camera 0/8 (near-symmetric; Meshy skipped the guide's drum cluster).
  01/01a/01b re-proved unchanged.

## 2026-08-16 — claude-fable (v59 — THREE TOWERS, ONE PIPE: 01, 01a, 01b; placer v3; metal; James: "hella good")

The night in one line: James came to run "the resources" (the buildings)
through the pipe one at a time; the pipe turned out to be hard-wired to 01b
(his fair call-out: "you promised one or two minutes"), got made repeatable,
then rebuilt once more into placer v3 after his second call-out ("a nerdy
sixth grader could look at this and go, there should be windows here, and
none on that strut") — and ended with three towers standing off Mediant that
he prefers to the GPT references. Full recipe/contract: `buildings.md`
(rewritten tonight; READ IT). Working order stays alphabetical: 02-sphere
next (new family — expect classifier work).

- **renders/ purge** ("I can't stand it"): 120 iteration files deleted;
  seven kinds of file per building, `<name>-GPT/-back-GPT/-highres/-welded/
  -local/-guide(-back)/-proof(-back)/-compare`. 01b's `example.png` etc.
  renamed; scripts repointed. Both nights James saved the raw Meshy GLB as
  `-local` — Claude renames to `-highres`; watch for it.
- **The pipe is name-driven**: `weld_bldg.mjs <name>` (the Node weld,
  finally a script), `decimate_bldg.py -- <name>`, `guide_extract2.py` /
  `guide_place3.py` / `export_bldg.py` all read `BLDG` (+ `BLDG_SIDE=back`,
  `BLDG_AZ/EL`, `BLDG_AZ_BACK/EL_BACK`, `BLDG_TILE`), `rot_sheet.py` for the
  camera pick. Export writes the surface TILE (the 2048 bake was dead
  weight, gone). Timings: weld 2 s, decimate 25 s, extract 5 s, place+proof
  5 s, export 7 s.
- **Back guides**: James shoots the Meshy model from behind, five-word GPT
  prompt in the same thread — first try, both 01a and 01. (Claude's Blender
  clay plate for that purpose was "a joke"; dropped.) The extractor takes a
  side; the placer raycasts the back from its own camera and invents
  nothing about the back when a guide exists.
- **PLACER v3 (`guide_place3.py`)** — the structural change of the night,
  built through three self-critique rounds on 01a with no James in the loop
  (his ask: "criticize your own output and tune it... without me spending
  forty-five minutes on every building"): the light map is an ISLAND ATLAS
  — off-shaft volumes (platforms, drum annexes, pods) get their own patches
  and are painted in their own space (they had NO light-map real estate in
  v58; the drum physically couldn't take a window); struts/arms/zig-zag
  members are STRUCTURE by an inward-thickness test (7% of height) and any
  guide light on them is rejected; trims are 2 px, edge trims run the whole
  edge on thin rim patches; curved walls (the drum) are merged from their
  slim facets and unwrapped around their own axis; structures straddling
  shaft+drum are SPLIT per surface (were majority-voted); dense sampling
  along a structure's long axis (3×3 cut shared columns to stubs); the
  extractor's stacked-merge gap 200→40 px (it was gluing drum columns to
  shaft columns above them); a disc vs a drum is decided by angular
  coverage at that height, not a fixed 0.10–0.78 band (01's drum sits
  high). Fair proof (key light rides each camera) + `<name>-compare.png`
  is the judged artefact; `DBG=1` for per-island counts.
- **In-world bugs James caught from the seat, all fixed**: top-down
  "crazy whack" (flat lids at one height sampled one map row and smeared it
  — lids now dead-mapped AND the shader masks near-horizontal body faces);
  everything turned WHITE (my dead row sat inside the strut band the shader
  paints ceramic — moved to 0.0915); pad frames "too thick by far, kills
  the sense of size" (6→2 px); pie-wedge highlight on the faceted saucer
  top (specular scaled down on lids); the mottling on the wear tile read
  as clouds on flat tops (0.30→0.10).
- **METAL** ("looks like cardboard... Grid Placeholder texture 001... like
  upholstery for a rectory"): shader got specular (key + glint light,
  shininess from tile wear, fresnel sheen), base ×0.55 darker (his read
  after: "dark gunmetal, not black" — fine), triplanar repeat 28→16
  (~25 m tiles — "large sheets, not a grid of little panels with rivets").
  Four Meshy tiles (27 cr, his GPT material brief as the source — "dark
  architectural metal": blackened steel / gunmetal / carbon alloy, panel-
  to-panel value variation, restrained aging, no rust): `armor-sheet-a`,
  `armor-sheet-b-seamless`, `armor-sheet-b-weathered` (B + wear lifted off
  a worn variant; DEFAULT), `strut-alloy` (replaced pale ceramic on
  struts). Meshy tiles need a wrap-blend to tile. 01b wears A, 01a/01
  weathered-B for his comparison — verdict pending.
- **world.js**: `BLDG_KINDS` table (per-kind VAO + textures, missing kinds
  skipped), three kinds seated 900 m apart off Mediant; **saved vantages**
  (his ask: **+** right of VIEW, name prompt, own section under a rule in
  the dropdown, shift-click deletes; localStorage `orb-vantages`); shader
  wall mask + metal; BLDG_V 13→26. Nine sims + shader-check + console-fit
  green throughout.
- **Verdicts**: 01a first pass "so so very far off... heavy sigh" →
  after v3 + metal + tiles: "this looks better", "it's a keeper" (the
  metal); 01 (the tallest, arm + drum + four platforms, both guides): "That
  actually looks hella good. I'm pleased... I prefer yours to the GPT
  versions."
- Lessons banked: state what the pipeline IS ("windows where the guide has
  windows", never pixel-faithful) before he squints at a proof; tell him
  WHERE to look (in-world, which building) — "one minute I'm looking at
  buildings in space, next you're talking about some sheet"; no jargon.

AWAITING JAMES: sheet-A vs weathered-B (01b vs 01a/01), his vantage
numbers per building (or he saves his own now), then 02-sphere.

## 2026-08-14/15 — claude-fable (v58 — THE BUILDINGS: building-01b, the reference article)

James's flight verdicts (2026-08-14): the Saelyri are "teensy" (wants 600
per town, 1,000 at the capital — parked behind the look), and the whole
station "looks like featureless Blender shapes... everything is getting
skinned." His plan, executed over two nights: real building/tech meshes
(ChatGPT concept → Meshy), lit the way a GPT reference paints them, dressed
in a seamless-tile library. Full recipe + contract + dead ends:
`buildings.md` (READ IT). Highlights:

- 33 concept images (13 iconic incl. four 01 towers, 7 generic, 10 tech,
  turret ×2 views); 14-tile Meshy texture library (42 cr, contact sheet).
- INTAKE: Meshy raw GLB (5.9 M verts) → Node hash weld (1 s; Blender's
  welds hung 25 min twice) → Blender dissolve+collapse → 45k tris. Meshy's
  own remesher melts edges at any count — never use it.
- LIGHTING: the GPT lit image is a GUIDE, not a texture. guide_extract2
  groups panes into ~150 structures; guide_place2 raycasts them onto the
  mesh and paints an authored cylindrical light map (own window primitives
  with unlit panes + life variants; recesses → a column per flute; disc rims
  → two rows each; annex grids mirrored; cupola rows + blue + pink ring; red
  spire beacon blinking every 3 s; pink conduits capped below the saucers;
  landing-pad blue frames on planar pad islands; struts/conduit dead-mapped
  → pale ceramic, no windows). Colors exact: 1C9BF4 / C810BF / FF2020.
  Verified pixel-exact. Twenty-three passes with James driving by eye.
- WORLD: BLDG .bin (robot-bin layout, Y-up, height=1) + light map 4096 +
  triplanar tile surface; BLDG_VS/FS; neon shading (hot center, saturated
  outside; tight amber kernel, wide accent-only kernel); `bldgGlow` dial;
  one instance seated off Mediant at 400 m with a DICTATED vantage
  (7167/2957/125247); VIEW picker on the deck (dropdown + VIEW [V],
  persisted), deck shortcuts N/T/C/V with bracket labels, four equal rows.
  All sims + init-smoke + shader-check + console-fit green.
- LESSONS (all in buildings.md): the light map was upside-down for two
  rounds (Blender bottom-up vs browser top-down — export flips V; verify with
  check_export.py); cache-bust `BLDG_V` on every export; camera matching by
  silhouette IoU is useless on a round tower; halo KERNEL width smears,
  WEIGHT dims — don't confuse them; magenta rows adjacent to dead rows bleed
  through the halo kernel (lip row retired).
- James, 2026-08-15: "I think we're green. Go. Go. Go on this building."
  NEXT: run the other 29 through the same pipe (his GPT lit guides per
  building), then placement system, conduit spurs, flashers, ad atlas +
  alien script; Saelyri population/crowd design after the look overhaul.

## 2026-08-01 — claude-fable (v57 — the crust grows up: real buildings)

James's close-up verdict on the v52 crust ("the windows are way too big...
just a bunch of half-hearted rectangles with little lighted rectangles on
top of them"): windows read as hundred-footers, no variety, no technology.
Also the standing v52 open question (window density) — answered.

- PHYSICAL WINDOW PITCH: ec (the spare 3 floats per vertex) now carries
  each face's half-sizes in meters + a pattern id; the FS derives one
  window column per ~7.4m / row per ~5.6m whatever the building size. Big
  faces went from 35 potential lights to hundreds of ~4m panes — the lab
  sheets show genuine city-block walls now.
- THREE WALL PATTERNS per stack (seeded 55/25/20): the classic grid,
  parallel light-strips running down the face, round portholes (square
  6.2m pitch — the shared anisotropic grid stretched them into ellipses,
  lab round 1). ROOFS AND FLOORS never carry the wall pattern (style -1 =
  sparse dim service hatches; strip-style ceilings read as monster
  stripes, lab round 2). Upper floors light too (wx>34, was wx>55 — dark
  tower tops were half the "dead boxes" read).
- THE TECH KIT: comm dish clusters (mast + octagonal plate aimed skyward
  + neon feed-tip at the focus), sign pylons with big double-sided ad
  screens, rooftop kits on every shanty stack (greebles, antennae, and a
  roll among rooftop billboard / neon edge-rails / small dish), tank
  farms now wear a thin neon LEVEL BAND at their fill line (James: "tanks
  of unknown origin containing whatever substance").
- SCREENS + NEON are a new emissive aux kind 3 in COMM_FS_SOLID: ad
  program (slow two-tone panel blocks + sweep + bright neon frame — the
  frame is what sells "sign" at range, lab round 2) and neon program
  (family color, lazy flicker, occasional stutter). Both melt to their
  average glow below a few pixels like windows.
- THE LAB: tmp/orb-dimension/crust-lab.html (KEEP IT) — extracts the real
  crustGeometry + COMM solid shader, renders six vantage points (jaw
  street to 3.2km approach), auto-captures a sheet to tmp/snapshots/ via
  /api/dev-snapshot. Three rounds ran before James saw anything.
- Sims: crust-sim ALL PASS every round (window verts 18.6k → 27.3k, tris
  34.2k of the 60k band, face still bare, jaw still warm); init-smoke,
  society/reef/v47/nebula green; shader-check ALL SHADERS PASS.

v57.1 — THE ORIGIN BUG (James flew it: "I don't see many windows at all"):
the window pitch data rode vC, but COMM_VS adds uOrigin to vC (it is a
world-space channel for the glass/bridge programs) — so in-world every
face size read as tens of kilometers, the grid went subpixel, and melt
erased the windows. The zero-origin lab could never see it. Fix: new vE
varying carries aCenter RAW; the lab now renders with an 83km uOrigin
(world condition, camera moved to match) so origin-contamination bugs can
never look clean again — the sheet under that origin is identical to
round 3. shader-check ALL PASS (glass/bridge ignore the extra varying).

v57.2 — RETICLE PIN EXPERIMENT (James: "I want that orientation to be
frozen... they should stay pinned to the viewport as the ship rolls and
the space spins by outside"): the reticle graphic no longer rotates — the
wings hold the screen midline always; barrel rolls spin the universe past
a fixed X. Display-only: rolling, steering, and rollShown's integration
are untouched (stick-sim TEST 1 guard updated to the pinned transform
line, TEST 7 unchanged), so the v55.3 commanded-roll display is one line
away if the feel doesn't stick. His verdict decides whether the pod
contract's reticle clause gets rewritten or restored. Same exchange: the
A/D roll rate moved onto a dial — `rollMax` ("roll °/s", the stick group,
6–120, default 29 = the old hardcoded 0.51 rad/s). Arrow-key turn rate is
the last hardcoded rotation, offered, not yet asked for.

AWAITING JAMES: the sheet + an in-world flight over the crust.

## 2026-07-31 — claude-fable (v56 — PHASE B1: the Saelyri are home)

James's go, same session as the Being Editor perf pass — his brief on top of
the agreed 11-point plan: "I wanna see a lot of things flying around... like
a living place." Populations 10× the proposal. Everything closed-form.

- THE SAELYRI IN-WORLD: kind-65 orb actors — 140 beings at the default dial
  (capital 50, satellites 30 each; `saelyri` GOD MODE dial 0–120 capital).
  10m tall (James: "they're not giants"). The FS grew the Being Editor's
  three-layer interior (shell / filaments / skeleton) with james-being-01
  BAKED as constants (edge 24, structure 55, turb 36, heat 71, glow 77) —
  re-dial in the editor, re-bake here. Orthographic raymarch through the
  unit sphere, 18 steps, family hues from SOC_FAMS via the instance's own
  h1/h2.
- THE LOD IS THE POPULATION TRICK: below act 0.2 a being is a 2-line soft
  mote (the vague-nothing contract); the raymarch only runs near, filaments
  only when fully awake (act>1), and the act glide (kind 65 joined the v47
  smoothing) crossfades mote→body with no pop. Hundreds are free — CPU cost
  is a few trig calls per being (pure functions of t, sim-provable).
- MOTION: saelyriLayout (deterministic, SOCIETY_SEED ^ 0x5ae111, lives
  inside the society-sim extraction markers) — loose orbits around each
  being's home sun (1.45–2.6 radii, clear of the crystal planes), laps in
  200–600s; ~30% are TRAVELERS ping-ponging one light bridge with long
  dwells (76% of cycle) and a sagging crossing. Capital orbits get
  deterministic re-rolls until the whole circle clears Korrudan (the probe
  found beings swinging THROUGH the bone at pop 120 — sim TEST 12 now bars
  it, worst en 1.036).
- MORPH LIFE: resting humanoid (James: "more relatable, this is supposed to
  be fun"), one whim excursion per 60–180s cycle — 12s melt out to one of
  the six wheel shapes (box/pyramid/mandala/jewel/torus/cloud, seeded per
  cycle), 6–14s hold, 12s melt home. Blend + target ride p0 + the spin slot.
- ACKNOWLEDGMENT (respond in place; approaching is a later personality
  pass): `saeNotice` dial (default 400m; full greeting at 37.5% = 150m —
  rescaled from the plan's 2km/800m which were calibrated for 30–60m
  giants). The being eases around to FACE the pod, brightens ×1.85, and one
  of TEN authored greeting glyphs (atlas rows 8–9, indices 64–73; spiral /
  ringed heart / rising arcs / lemniscate / chevrons / orbit-and-moons /
  branch / standing wave / triangle-in-circle / radiant) draws in light
  above it in a random color (James's call), via a 6-sprite shared pool.
  Glyph atlas is 8×10 now — the kind-60 shader divides y by 10.
- THE GREETING CHORD: per-family voicings through the cave echo (cyan
  A add9, violet F#m11, rose Dmaj7, amber G6, green Em9), rolled sines,
  25s per-being cooldown + 1.6s global spacing so a crowd never stacks.
- CITIZENS DIAL: Cadence castes now `citizens` per caste at the capital
  (default 9, was 3), satellites 2/3 — 162 robots at default. Same closed-
  form loops, one draw per bot, 14km cull holds the visible set to one town.
- Sims: society-sim TEST 12 (determinism, populations, crystal clearance,
  traveler edges, morph spec, flight bounds, skull clearance at dial
  ceiling); shader-check now also compiles the MAIN ORB VS/FS (it never did
  — and that is where kind 65 lives). Suite of nine: ALL PASS.

NOT YET FLOWN. First-flight checklist for James: crowd feel at the capital
vs satellites (dials: saelyri / citizens / saeNotice), the greeting at 150m,
chord taste, glyph legibility, and frame rate parked beside a crowd.
Phase B2 (fleet community routes + society sound beds) parked per his call.

## 2026-07-31 — claude-fable (Being Editor: performance pass)

James: the lab was "killing my laptop" — everything slowed while it was
loaded, sliders felt like they fought a re-render. Diagnosis: the sliders
were innocent; the GPU was simply pinned. Three compounding costs, all cut:

- RESOLUTION CAP: the canvas rendered at full devicePixelRatio × client
  size. Raymarch cost scales with pixels and the soft glow upscales
  invisibly, so resize() now budgets ~1.5M rendered pixels (the perf line
  shows the actual render resolution).
- ONE SDF PER STEP: shapeAt() evaluated ALL SEVEN wheel shapes (including
  the fbm cloud) every raymarch step, then mixed two. New shapeK(k) branch
  evaluates only the shape(s) on screen; whole-state panes (fract≈0) skip
  the second SDF entirely. The filament fbm is also skipped outside the
  form (veins were multiplied to ~0 there anyway).
- THREE SHAPES DEFAULT (James: "maybe three is enough"): the beings sheet
  opens with humanoid / mandala / cloud (wheel stations 0/3/6, seeds
  preserved so looks match the old sheet); a "show all seven" button
  restores the full wheel for judgment days.

Same session, James's next call: FULL-BLEED — the 1600px admin-panel width
cap removed (a look-dev stage is not a dashboard), and the pane cameras now
fit BOTH dimensions (persp fov is vertical-only; in a narrower-than-tall
pane the horizontal frustum shrank and limbs/petals clipped at the pane
edges — "cut off at either ends". Narrow panes now widen the fov:
asp < 1 → fov = 2·atan(tan(0.45)/asp)).

Verified: shader compiles + links clean on the served page, script runs
end-to-end. Not yet flown by James on the laptop that hurt.

## 2026-07-29 — claude-fable (Being Editor: persistence)

James tweaked the Being Editor to a look he liked, closed the tab, and the
look was gone — the lab had zero persistence. Fixed two ways:

- FILE-BACKED PRESETS: server.mjs presets route generalized to
  `/api/(worlds|labs)/:slug/presets` (labs resolve under src/labs/, backups
  in tmp/labs-<slug>/preset-backups/). The editor grew a presets section
  (picker / save / save as / make default) writing
  `src/labs/being-editor/assets/presets.json` — saving IS telling Claude,
  same contract as the world tuners. localStorage is the boot cache and
  file:// fallback; an empty file gets seeded from the browser store.
- CONTINUOUS AUTOSAVE: every slider input snapshots to localStorage
  (`elastic-being-editor-state`) and reopening the tab restores it —
  last-touched state beats the default preset on load, by design.

Snapshot keys: glow/turb/cplx/cor/heat/edge/fam. Needs a server restart to
serve the new labs route. His lost look still needs re-tweaking, sadly.

## 2026-07-28 — claude-fable (v55.4 — lens shift: the X IS the axis)

James, flying: "press D... the reticle should stay pointed exactly onto
whatever I started from — it's going around in a larger circle." Right
again: the reticle X sits at the GLASS center (the console pushes the
glass up), but the optical axis exited through the WINDOW center — so a
pure roll orbited the point under the X around the true screen center.

- ASYMMETRIC FRUSTUM (`projShiftY()` = the reticle's NDC height,
  proj[9] = −shift): the principal point now passes through the reticle
  cross. Rolls pivot exactly on the X, turns pivot on the X, and the
  magnifier zooms into the X. This finishes the v54.2b thread (the stick
  anchor moved to the glass center then; now the projection itself has).
- The three CPU-side projections follow the shift: rayDir (clicks land
  where the eye says), home marker, nav ring. Everything GPU-side rides
  proj automatically. Verified numerically: axis point renders at the
  reticle pixel, ray at the reticle pixel is exactly cam.f, overlay of a
  dead-ahead target lands on the reticle pixel.

Full suite green. Awaiting James's barrel roll.

## 2026-07-28 — claude-fable (v55.3 — THE POD CONTRACT; v55.2 reverted)

James flew v55.2 and killed it, with a clear spec: "I don't want this ship
to act like a plane. This is space... I just point where I wanna go...
It turns where I turn it, and it stays there while I drag the mouse
around." At 90° bank the horizon-lock blend whipped the view ("I just did
a barrel roll") — the blend zone near knife-edge was real motion, not
display.

- v55.2's world-axis yaw blend REVERTED: yaw is plain `rotateCam(cam.u,
  yawStep)` again. Pod contract: ship-frame rotations only, forever.
- THE REAL ORIGINAL BUG FOUND: the WHOLE reticle (v25) counter-rotated
  with WORLD bank — so honest body-frame turns visibly spun his
  instrument ("phantom D key"). The reticle now shows COMMANDED roll
  (`rollShown` = A/D integral; R and leveling glide it home; goHome
  zeroes it). Dragging the mouse cannot move it, by construction. BNK in
  the console keeps honest world bank.
- stick-sim TEST 7 replaced: knife-edge + two full dragged circles →
  ship-up invariant to 0.0, commanded-roll display unchanged; new guards
  pin the yaw/pitch application lines and the rollShown reticle drive.

Full suite green. Awaiting James: set any tilt, drag anywhere — the
reticle must never move on its own.

## 2026-07-28 — claude-fable (v55.2 — horizon-locked yaw: the bank stays put)

James, flying: banked left with A, held a left turn — and partway around
the bank read as if D were pressed, the turn switching sides on its own.
"I wanna back into a turn and hold that bank indefinitely... fifty circles
in a row."

Diagnosis: yaw rotated about SHIP-up. Rotating about a tilted axis
corkscrews the orientation against the horizon — 180° into a banked turn
the bank reads reversed. Geometry, not an input bug.

- Yaw now rotates about the HORIZON vertical, which preserves every basis
  vector's angle to the horizon: the bank he set — and the reticle tilt —
  stay mathematically pinned through any number of circles. Sign-corrected
  by u[1] so inverted flight still follows the hand (the v48.3 lesson);
  smoothly blends back to ship-up yaw near vertical pitch (world yaw there
  reads as roll) and near knife-edge bank (sign flicker). A/D remain pure
  pencil roll; pitch remains ship-frame.
- stick-sim TEST 7: two full 45°-banked circles → bank drift 0.0 (exact);
  contrast leg proves the old axis drifted 0.79 rad in a quarter turn.
  New guard lines on the axis blend.

Full suite green. Awaiting James's circles.

## 2026-07-28 — claude-fable (v55.1 — the magnifier)

James's ask (his pick between site-wide and in-ship): a ship zoom.

- WHEEL zooms the view 1×–8× (exponential notches, eased in the frame
  loop — never a snap, motion restraint); Z eases back to 1×. Implemented
  as effective-FOV narrowing: `zoom`/`zoomTarget` next to the matrices,
  `tanF() = tan(FOV/2)/zoom`, and every projection-adjacent tan site
  (setProj, rayDir clicks, home marker, nav ring) reads it — clicks and
  HUD overlays stay glued to the world at any magnification.
- STEERING SLOWS TO MATCH (÷zoom): the stick gain line (stick-sim guard
  updated to the new verbatim form — at zoom 1 it is the identical
  formula) and the arrow ROT. On-screen angular speed stays constant, so
  the view can't whip while magnified.
- "MAG ×2.4" readout under the reticle (instrument-faint, hidden at 1×),
  CTRL card documents wheel/Z.

Full suite green + shaders compile. Awaiting James's eye.

## 2026-07-28 — claude-fable (v55 — the distance vibe: aerial + detail melt)

James, flying: "Korrudan is 86km away and it looks as clear as day... teeny
little high res lights... killing the distance vibe." Diagnosis: not missing
blur — impossible detail (subpixel window grids rendered razor-crisp at any
range). His pick of the offered routes: dissolve-at-source + aerial pass,
both on dials; true post-DOF held in reserve (it taxes exactly the frames
that already dip).

- AERIAL PERSPECTIVE (`aerial` dial, "the air", 0–3, default 1): shared
  `COMM_AER` GLSL snippet — luminance-preserving desaturation drifting
  toward a cool haze cast (lum × [0.74,0.82,1.05]), 1−exp(−d·uAer),
  uAer = cfg.aerial/120000 (~50% quieted at 86km). Multiplicative only, so
  it can never lift black space and is premultiplied-alpha safe. Applied to
  STRUCTURE only: skull, comm solid/glass/bridge, robots + castes. Orbs
  already desaturate (v47 line kept), beacons/hearts stay fog-proof
  long-range reads, nebulae ARE the weather — all untouched.
- DETAIL MELT (`melt` dial, "the air", 0–2, default 1): fwidth()-measured
  projected size — crust window cells below ~6px (×melt) crossfade into
  their steady average glow (lit 0.34 × duty 0.31 × mean flicker ≈ 0.09,
  no flicker at range), glass data-dashes dissolve into their 0.18 duty
  average. Kills the "teeny lights" shimmer too. 0 = the old crisp look.
- shader-check.html learned the COMM_AER substitution (all comm shaders +
  ROBOT_FS interpolate it now).

Full suite green + all shaders compile. Awaiting James's flight: both
dials default 1, tune the vibe by eye (aerial = how fast color quiets,
melt = how eagerly detail dissolves).

## 2026-07-28 — claude-fable (v54.3 — presets travel + capture spawn)

James asked: "if I set a start preset and we push, does a visitor get
exactly what I set?" Honest answer was no — two gaps, both fixed:

- STATIC-HOST FALLBACK: the preset boot fetch now falls back from the
  dev-server API route to the committed `assets/presets.json` itself, so
  a public host (GitHub Pages / elastic-space.net) serves his start
  preset instead of factory defaults. file:// still degrades to
  localStorage/defaults as before.
- FIRST-LOAD APPLY: a fresh browser used to boot on defaults even when
  the file loaded (it only seeded the cache for the NEXT load). The boot
  path now records what it applied (`bootStartSnap`); when the file
  arrives with a different start preset, `lateApplyStart` (= the same
  `applyPresetSnapshot` the apply button uses) applies it live.
- CAPTURE SPAWN (his ask, same breath): new tuner spawn row — "capture
  spawn" stores the ship's position + facing (`cfg.spawnPose`, {pos,f,u},
  meters) with a live readout in km; "stock spawn" clears it. It rides
  the preset snapshot, so capture → save preset → set as start = the
  world opens exactly there, aimed exactly that way. sanitizeCfg clamps
  the pos into SPACE bounds and null's any malformed pose;
  `applySpawnPose` orthonormalizes the basis (parallel-up fallback).
  Applying a preset that carries a pose teleports via goHome (motion
  zeroed, autopilot off); presets without one mean stock (pre-cleared,
  never inherited). H (return home) honors the captured pose too.

Full suite green + shader-check pass. Awaiting James: capture a spot,
star it, and reload — and eventually a fresh-browser test of the
visitor path.

## 2026-07-28 — claude-fable (v54.2 — the grab circle gets its own dial)

James, flying: the steering grab zone felt like it was only the reticle
circle itself — too small to hit reliably. His spec: ~3× the radius, same
center, reticle untouched, plus a temporary faint dotted ring at the new
edge so he can see and tune it.

- `stickGrab` (px, default 390 = 3× the old reach/2 = 130) is a new cfg
  key + slider in "the stick" tuner group (60–800). The center-mode grab
  test in pointermove now uses it directly; stickReach and all deflection
  math are untouched (stick-sim still guards those lines verbatim).
- GHOST GRAB RING: `#stick-grab`, a 1px dotted rgba(150,205,255,0.16)
  circle pinned to the reticle center, diameter = stickGrab×2, live-follows
  the slider. Temporary instrumentation — flip GRAB_RING (frame loop) to
  false to retire it once the radius lands.
- Full suite green (init-smoke + 8 extraction sims) + shader-check pass.

v54.2b, same session (James flew it: ring not dotted, not centered, more
of it below the reticle than above):

- THE CROSS IS NOT THE WINDOW CENTER — the glass sits above the console,
  so window/2 rides low. New `reticleCenter()` (vsEls.ret rect, cached,
  resize-stale) now feeds ALL of center-mode: the grab test, the stick
  anchor, and the ghost ring. Steering neutral finally sits on the actual
  cross, not a point below it.
- The ring is an SVG circle now (dasharray 0.5/10, round caps = real
  spaced ghost dots at 0.28 alpha) — a 1px dotted CSS border renders as a
  hazy solid line at that alpha.
- init-smoke's document stub learned `createElementNS` (returns the same
  element stub as createElement).

Where it stands: awaiting James's flight — he tunes the radius by eye,
then we either keep the ring, dim it, or flip GRAB_RING off.

## 2026-07-28 — claude-fable (v54 — the nebula size dial + the Being Editor)

James flew v53: "the nebulas are cool if a little bit underwhelming. They seem
kinda small for the space." He floated 5×; the honest ceiling is 2× (beyond
that the banks merge and lose their one-palette identities).

- NEBULA SCALE DIAL: `nebScale` (0.5–2, default 1.6, layout dial) in
  GOD MODE · the nebulae. Scale multiplies bank RADII only — seats stay put,
  so the dial never re-rolls the sky. Default ships at 1.6 (his complaint was
  "too small"; the dial is there for his 10% passes either way).
- SEAT RESEED (one-time): gulf seats now reject the spawn corridor at the
  DIAL CEILING (24km × SCALE_CAP + 6km margin, 9 samples along spawn→origin),
  so no legal dial setting can drop gas on the player's first frame or the
  run home. Old bank #1 sat 2km off the spawn at 1.6 — that's why. SCALE_CAP
  (2) in nebulaGeometry restates the slider max — change them together.
- SIM: TEST 2's blanket "nobody past 110km" satellite check replaced with
  real satellite-town clearance (communityLayout seats, verbatim cut, +8km);
  new TEST 10 re-proves spawn/approach/satellite/sightline/identity bars AT
  the ceiling, reading SCALE_DEFAULT and SCALE_MAX out of world.js so the
  sim can't drift from the sliders. All 10 pass; full suite + shader-check
  green.
- BEING EDITOR (`src/labs/being-editor/`): the saelyri lab promoted to a real
  lab page (face-lab styling, admin panel Labs link, dashboard icon), with a
  being dropdown (single entry today — the roster is the contract that more
  peoples arrive here). The v54 shader round answers "add in the internal
  structure": turbulence moved OFF the distance field (silhouette holds now),
  interior split into three layers — luminous shell at d=0 (new `edge`
  slider), ridged-fbm energy filaments (structure slider drives frequency +
  count, white-hot at crossings), and a shrunk-form skeleton riding core
  heat. Veins deliberately don't feed alpha — light inside the glass, not
  fog. tmp/orb-dimension/saelyri-lab.html is superseded (banner added).
- v54.1 SAME SESSION, with James looking: his verdict on the first cut —
  loves the "rippling purple fire at the edges", interior "pure white all
  the way through". Two real bugs found by capture (via the server's
  /api/dev-snapshot — the pane wouldn't composite for screenshots all
  night): (1) the skeleton term used max(d+0.16,0) = 1.0 across the WHOLE
  interior — a filled core, not an inner surface; abs() made it a band.
  (2) exposure: interior terms summed past 1.0 over ~25 march steps, so
  everything clipped white. Emission now ~3x dimmer with the shell
  coefficient raised to keep the edge fire exactly as bright; alpha got its
  own weight (aw) so occlusion didn't dim with it; veins' white component
  0.5 → 0.32 so knots read hot against purple, not white against white.
  Sheets r3 (tmp/snapshots/being-editor-*-r3.png): filament networks read
  through every state, homes are shell-less plasma. AWAITING HIS VERDICT.

## 2026-07-25 — Claude (Fable 5) — click-away dismissal (site-wide sweep)

- New house rule from James: every control panel dismisses on click-away. One
  `pointerdown`-outside handler now closes whichever of NAV/TUNE/CTRL is open
  (via `setOpen("none")`); presses inside the open panel or on its own button
  are exempt, and pressing another panel's button still opens that panel.
  Grabbing the stick/canvas drops the panel immediately — that's the intent.

## 2026-07-26 — claude-fable (v53.2 — the console was eating its bottom rows)

James: "Some of the controls are going off the bottom of the screen... I can't
read the z position. I can't read the bank rate. I can't read the bottom
system parameter." Real bug, and it had been there a while — not a v53
regression.

- CAUSE: `.vs-rows p` sized its type at `clamp(13px, 1.75vh, 20px)` — a 13px
  FLOOR — while the console box is `clamp(80px, 9.5vh, 150px)`. Below ~1440px
  of viewport height the box keeps shrinking and the type doesn't, so the rows
  outgrow the glass and `.vs-screen{overflow:hidden}` silently eats the last
  one. Exactly the three readouts he named: BNK, Z, SHD.
- MEASURED, not guessed: `tmp/orb-dimension/console-fit.html` renders the
  console markup against the real world.css inside iframes at seven viewport
  heights (each iframe is its own viewport, which is what makes vh testable)
  and reports overflow per pod. Before: clipped at every height below 1440
  (worst 24px, NAV at 1080 — 4K at 200% Windows scaling, James's likely case).
  After: 0px at all seven.
- FIX: new `--readout-h` custom property = the actual usable height inside a
  screen (console height minus pod padding, stencil label, screen padding and
  border). Row type is now `min(old clamp, --readout-h / 3.75)` at 1.22
  line-height, so it can never exceed what the glass holds. NAV, which carries
  four rows to everyone else's three, gets `/4.6` at 1.1 leading — the extra
  row costs size instead of legibility.
- Nothing changes at 1440px and above: still 20px / 17px, pixel-identical to
  before. At 1080 the rows land at 16.3px and NAV at 13.3px — smaller than the
  old nominal, but visible, which they were not.

## 2026-07-26 — claude-fable (v53.1 — spawn moved twice as far back)

James: "I think I need to be, like, twice as far back." Spawn 27km → 54km
(pitch stays 0°, still dead on the face). The 12km station now subtends
~13° instead of ~25° — it reads as a place you fly TO rather than one you
are already parked at.

- The spawn now sits IN the nebulae's gulf band (52–82km), so the move
  needed a clearance check before it was safe: nearest bank #1 clears the
  spawn by 13km and the whole approach line by 12.3km. nebula-sim TEST 9
  now guards both — a reseed can never drop gas on the player's first frame
  or on the run home.
- Sight-corridor bounds extended 27600 → 54600 in the orb-field push and
  the station-grid bad() (plus the sims that mirror them). No station or
  orb actually changes — both populations bottom out around 24km, well
  inside the old bound — so the fuel grid does not re-roll; the constant is
  updated to keep the invariant honest for whatever expands next.
- All 9 sims green.

## 2026-07-26 — claude-fable (v53 — THE NEBULAE: gas in the gulf)

James's brief ("the word I was looking for is nebula") → 7 look-dev rounds in
`tmp/orb-dimension/nebula-lab.html` with his notes each round → his go to
move it in. Five banks of glowing gas: one over home in the spawn sky, four
in the gulf band (52–82km), each speaking ONE palette from a five-scheme
deck (mutara / ember / verdant / ice / rose — his call: nebulae get their
own identity, not the reef hue families). Visuals only, no sensor fuzz.

- THE LOOK, from the lab: strands of stretched wisps in 4 size octaves,
  torn alpha (no radial discs), directional shading off the noise gradient,
  dark dust lanes drifting to the lit side, buried furnace knots. Rounds
  fixed: cotton-candy pink → deep field + lit cores; quilted noise →
  features ride puff size; GREEN DRIFT under heavy overlap (premultiplied
  alpha over low coverage races the channels to the 8-bit ceiling — cured
  by keeping color near alpha scale, and the same discipline is now in the
  world shader); fibers → gas (4 gentle octaves, wider shading taps).
- THE SOMERSAULT (James, r7): wisps pirouetted when a strand pointed at the
  camera — its screen projection collapses and the axis direction swings.
  Cure: the stretch RELAXES TO ROUND as the projection degenerates, so a
  degenerate axis has nothing to swing. Quantified, not eyeballed —
  nebula-sim TEST 7 bounds the worst visible axis swing per orbit step
  (6.3° at bar 6.5; the lab's validated build measured 4.8°).
- THE FILL-RATE GUARD (the part that isn't visible): the lab shader
  evaluated 3 fbm — 48 sines — PER FRAGMENT, across ~13 screens of blended
  gas. At 4K that is unshippable, and v33's veil bomb already TDR-crashed
  James's rig once. Two fixes: (1) the identical alpha+gradient field is
  BAKED ONCE at init into a 6-variant atlas (`bakeWispAtlas`, 51ms, no
  fetch — the gas still blows on file://), so a fragment is now one texture
  fetch; (2) an aggressive near-fade (a wisp is gone below 4 of its own
  radii, full at 9) plus smaller size octaves. nebula-sim TEST 6 bars
  interior overdraw at 13.0 screens AT THE DENSITY SLIDER'S CEILING, not
  just the default — the tuner cannot outrun the GPU (slider max capped
  1.2 for exactly this reason).
- Atlas coarse family re-tuned 3.2 → 4.8 after eyeballing the bake: at 3.2
  the radial body term dominates and big wisps read as DISCS — James's
  ball-pit failure mode, caught by the preview before it ever flew.
- Fog: nebulae take haze at 0.08 strength — the veil rule, never
  fog-exempt. Drawn blended after the meshes, before the orb field, depth
  tested (a bank behind Korrudan stays behind it), no depth write.
- GOD MODE group "the nebulae": nebGlow (permanent feel), nebDensity
  (layout — rebuilds on change).
- NEW SIMS: `nebula-sim.mjs` (8 tests: determinism, placement, home-bank
  clearances, puff integrity, palette variety, overdraw, somersault bound,
  flight bounds) and `wisp-atlas-check.mjs` (runs the SHIPPED bake against
  a stubbed GL: cost, upload wiring, per-variant gas statistics, border
  vanishing for mipmap bleed, gradient signal — plus a PNG preview at
  `tmp/orb-dimension/wisp-atlas.png`).
- shader-check.html now compiles NEB_VS/FS too — and immediately earned it:
  it caught an undeclared `r` left behind when the fbm block was swapped
  for the texture fetch, which would have silently killed the entire
  nebula pass at runtime.
- reef-sim TEST 9 DE-FLAKED: it sampled 20k fuel probes with unseeded
  Math.random against bars close to the real distribution, so it failed on
  unlucky rolls (caught in a full-suite run). Probes are seeded now — same
  coverage, same numbers every run. A guard sim that cries wolf gets
  ignored.
- All 9 sims + init-smoke + shader check green, twice over. Build stamp v53.
- AWAITING JAMES'S FLIGHT: the look in-world (this is the first time the
  gas has been seen anywhere but the lab), bank placement, glow/density by
  eye, and whether the interior thins too much on entry — the near-fade is
  the knob, and it's the one holding the frame rate, so we tune it against
  TEST 6 rather than freely.

## 2026-07-25 — claude-fable (v52 — KORRUDAN STATION: the Knowhere pass)

James's brief after flying v51: the head read 20× his ship, not 2000×, and
the v51 machine cloud obscured it. Reference study: Knowhere (GotG) — bone
dominant, machinery in crusted districts, scale sold by thousands of tiny
lights. His calls: 12km skull, keep the Meshy mesh, halfway window glow,
REMOVE Vess-Karai ("cool experiment, another format later").

- VESS-KARAI RETIRED: pyramid loader/draw/nav row/caretaker beat/courtesies
  all removed; assets/pyramid/ + pyramid_build.py archived on disk. Its hum
  synth survives as the CITY HUM — gain now steered by distance to the
  crust (sound.cityHum). v47-sim TEST 1 now asserts the retirement is clean.
- SKULL ×20 (SKULL_SCALE 3 → 20): 12km tall, spanning the core's full
  height. Everything re-derived: eyes (fix ±1800/32.7/3811.3, r 1067), gaze
  (clamp 48→320, engage 6→18km — seated rule holds, clearance scales to
  ~353m), spawn [0,0,27000] with SPAWN_PITCH reset to 0 (James recalibrates
  by eye), skull fog softened 1.6→1.05 so the monument reads at 27km.
- SKULL_EL [4600,7100,6700]: the station keep is an ELLIPSOID now (a 12km
  head is not a sphere). Used by: station-grid bad(), the orb-field push
  (assemble), capital sun push, the city hum. Sight corridor stretched to
  z 27600, radius 2100–2300.
- CAPITAL DE-CLOUDED: Tonic's machine core is GONE — Korrudan is the body.
  Satellites keep their full v51 cores. Capital keeps: suns (pushed outside
  the ellipsoid), bridges, 3 cranium feeds (targets rescaled), 10 orbital
  hoops (6.4–9.2km) and 26 through-the-bone threads at station scale.
  capital coreR = 7400 (crust envelope) for orbits/standoffs.
- THE CRUST — the city ON the bone: tmp/orb-dimension/crust_points.mjs
  samples the real skull surface (area-weighted, interior/mouth/socket
  filtered, region-tagged jaw/crown/side/back/face, 22 districts) into
  assets/skull/crust.bin; crustGeometry() in world.js (CRUST_SEED marked
  block) grows shanty stacks with LIT WINDOW GRIDS (the scale ruler — new
  aux-kind-2 branch in the solid shader, windows resist fog pow 0.55),
  gantry masts, tank farms, a warm refinery jaw (positional warmth — the
  whole chin is one furnace), and a two-ring mechanical IRIS in each eye
  socket (the red eyes stay). Face region ~bare (sim-asserted <35% of jaw
  density). ~19k tris, drawn in the capital's commDraw slot, served-only.
- FUEL: the ellipsoid carves the grid's center, so Korrudan seeds its own
  doorstep ring (6 H2O + 3 DEU just off the crust, sightline-guarded).
  Forgiveness bars hold (p95 6.7/8.2km, max 10.3/13.0km — reef-sim TEST 9).
- Capital castes rework: archivists orbit OUTSIDE the bone (1.06–1.3 ×
  coreR), wrights hop crust-point to crust-point near their bearing (no
  chords through the skull). NAV: KORRUDAN standoff 2600→8800.
- NEW SIM crust-sim.mjs (7 tests: atlas sanity, determinism, anchorage,
  face-readability, budget, iris rings, warm jaw). All sims + init-smoke +
  shader check green. reef-sim gaze/station/corridor tests updated to v52
  numbers; society-sim TESTs 3/8/11 rewritten for the ellipsoid contract.
- AWAITING JAMES'S FLIGHT: the 27km approach (scale read!), window-glow
  density (halfway setting), hoop presence, refinery warmth, spawn pitch.

## 2026-07-25 — claude-fable (v51.1 — hotfix: world would not load)

James's report: only the ship chrome loaded. Cause: the v51 caste-spawn code
called `vnorm` inside makeActors — but `vnorm` is a flight-section const
declared AFTER the init-time rebuildAll() call. TDZ ReferenceError at init;
the IIFE died before the renderer started. The extraction sims can never see
this class of bug (they only evaluate the society block). Fixes:
- spawn normalizes by hand (no flight-section helpers at init time).
- NEW SIM: `tmp/orb-dimension/init-smoke.mjs` — runs the whole world.js IIFE
  in Node under a stubbed DOM/WebGL2 (init + two rAF ticks). Verified it
  fails on the exact v51 bug and passes on the fix. Run it after ANY world.js
  change, alongside the extraction sims.

## 2026-07-25 — claude-fable (v51 — THE CAPITAL WRAPS KORRUDAN + the Cadence castes)

James's directives, built same session: the capital moves ONTO the skull,
robotic complexity doubles, and six new Blender-built robot kinds populate
all four hybrid towns.

- CAPITAL_POS → [0, 0, 0]: Tonic is now built around and through the
  god-skull itself. New capital-only geometry: 8 wrap hoops banding the bone
  at 950–2450m (leaning axes — never a face-on cap), 26 long threads passing
  clean THROUGH the head (depth test hides the middles inside the bone).
  Element-center discipline (`faceClear`): big planes/slabs resample off a
  face cylinder (z 700–4800, r 1250) and out of the bone (r 1500) — the red
  eyes stay readable from spawn; only thin webbing crosses the view.
- THE SKULL FEEDS: three capital suns — picked greedy-farthest-apart —
  drive wide ribbons from sun skin to deep inside the cranium. Bridge shader
  aux.w=1 marks a feed: three packets streaming INWARD only over a hotter
  carrier (no return traffic; the god gets fed, it does not answer). Stored
  in `GEO[0].feeds`; society-sim TEST 11 asserts 3 feeds, distinct suns,
  termination inside the cranium, satellites feed-free.
- CAPITAL SUN COURTESIES (deterministic pushes, no RNG): suns clear the
  spawn sightline cylinder and keep 3.2km off Vess-Karai (literal Lantern
  coords inside the block — it must stand alone in the sim).
- ROBOTIC ELEMENTS DOUBLED (all four towns): data planes 24→48, slabs
  40→80, webbing struts 110→220, tesseract frames 8→16. New mechanical
  kinds: 6 gear-band rings girdling each core, 18 elbowed conduit runs,
  10 antenna masts with cross-arms. ~8.3–9.6k tris per community (bars
  20k/60k hold); glass overdraw worst probe 7.9 screens (bar 15).
- THE CADENCE CASTES: six citizen robot kinds, built from primitives in
  headless Blender (`tmp/orb-dimension/cadence_robots.py` →
  `assets/robot/cadence-01..06.bin`, magic CBOT, same layout as robot.bin,
  + shared 256px flat-color `cadence-palette.jpg`, UVs pinned to swatch
  centers — the Jerry's Pool denizen spirit in 3D). Kinds: chanter
  (tuning-fork monk, sings to its sun), lattice-wright (open cube frame +
  tool arms, works the webbing), archivist (gyro sphere, circles the core),
  ferry (cargo barge, shuttles the light bridges sun-skin to sun-skin),
  warden (broad sentinel, walks the shell perimeter), gardener (hanging-arm
  pod, tends sun crystals). Spawn: 3 of each at the capital, 2 at each
  satellite (54 total), each with an under-hull work glow (fleet trick).
  Served-only like the fleet; file:// towns just have no citizens out.
  Shared ROBOT_VS/ROBOT_FS hoisted (fleet + castes, one shader; palette on
  its own texture unit); one VAO bind per kind per frame, 14km cull.
- Society-sim rewritten where the contract flipped: TEST 3 now asserts the
  capital IS seated on Korrudan (plus sun clearances), TEST 11 added for
  feeds. All 11 pass; reef/v47/ladder/stick sims green; all shaders
  (incl. new bridge feed branch + hoisted robot pair) compile-verified.
- Nav row: "the capital · wrapped around Korrudan". Help panel documents
  the castes. Build stamp v51.
- Preview sheet for James: `tmp/orb-dimension/cadence-preview.png`.
- AWAITING JAMES'S EYES: the wrapped capital from spawn, feed read,
  element density, caste silhouettes/scales (all tunable by eye next pass).

## 2026-07-24 — claude-fable (v50 — THE COOPERATIVE SOCIETIES, Phase A: the bones)

James's go after full plan consensus (names, procedural-vs-Meshy, scale,
hexagram placement, satellite sizing). The peoples: the SAELYRI (beings of
light) and the CADENCE (the machine society — it named itself in the common
tongue, for its own heartbeat). Four communities: the capital TONIC in the
Korrudan core precinct at [-15000, 2600, -12000], satellites MEDIANT /
DOMINANT / SUBDOMINANT on the opposite points of a six-pointed star against
the reef colonies — colony ideal angles +60°, at HALF the ring radius
(~125 km), own seeded jitter/height. Chord-degree settlement names: flag for
James's veto.

- COMMUNITY GENERATOR (`communityLayout` / `communityGeometry`, SOCIETY_SEED,
  sim-extracted markers `const SOCIETY_SEED =` … `// society hues`): per
  community a lopsided Cadence core (iridescent glass planes, data-rain
  planes, gunmetal slabs, strut webbing with racing data pulses, nested
  tesseract frames) and 7–9 Saelyri nodes — mini-suns with internal crystal
  planes — on jittered dodeca-face seats, flattened 0.78, joined by
  light bridges (nearest neighbors AROUND the shell, never through the
  middle) carrying two-way pulse packets in the endpoint node colors.
- FULLY PROCEDURAL (the consensus call): three new GL programs (solid /
  glass / bridge) on one 15-float vertex layout, community-local verts +
  ship-space uOrigin (v49 camera-relative discipline). Works on file://.
  ~3.6k tris per community. Detail culls at 300km with a 50km fade feather
  (fog owns it long before); node HEARTS (beacon trick) carry the
  long-range read — every society is a small constellation across the map.
- STATIONS: capital airspace via radial push (assemble()'s skull-KEEP
  pattern, no RNG consumed — the v38/v49 forgiving-fuel numbers survive
  exactly); satellites get doorstep clusters (2 H2O + 1 DEU outside the
  shell). Counts now 76 water / 42 deuterium.
- NAV: "the cooperative societies" section (Tonic/Mediant/Dominant/
  Subdominant), standoff parks outside the node shell. GOD MODE group
  "the societies": commScale / commSat (0.66 default, James-approved) /
  commVert / commJitter (freeze with geography) + nodeGlow / pulseTempo
  (permanent). Satellite DISTANCE is deliberately not a dial — derives from
  colonyDist/2 so the hexagram survives ring tuning.
- VERIFIED: new `tmp/orb-dimension/society-sim.mjs` (10 tests: determinism,
  hexagram, precinct clearances, shells, bridge graph, mesh sanity,
  separations, station respect, glass overdraw 5.0 screens vs bar 15,
  bounds). reef-sim updated (station chain now evaluates the society block;
  counts 76/42) — all 10 pass with the ORIGINAL fuel distribution. ladder,
  stick, v47 sims pass. All four community shaders compile+link verified in
  a no-audio harness (tmp/orb-dimension/shader-check.html). Stamp v50.

Where things stand: Phase A bones await James's eyes (his preset james-prefs-01
is the start preset — file-backed as of v49.4). Phases agreed and pending, each
with its own checkpoint: B = the peoples (Saelyri SDF light-forms with the
geometric morph set, fleet community routes, acknowledgment), C = resources +
harvest verbs (crystalline tritium / oxygen + lithium asteroids), D = the reef
expansion (quadruple size, 3 new creatures, gestaltic glyphs, neuronal bodies,
titanium filaments). Sound for the societies: deferred to B deliberately.

## 2026-07-24 — claude-fable (v49.4 — presets become a file: saving IS telling Claude)

James's better idea, minutes after v49.3: don't add a send step — make saving
a named preset just write a file. Done; the "→ claude" button lived one
version.

- Preset store is now `assets/presets.json` (committed, sessions read AND
  write it). Server: `GET/PUT /api/worlds/:slug/presets` (generic, any world;
  shape-validated, timestamped backups to tmp/<slug>/preset-backups/).
- World: every preset save/delete/set-as-start PUTs the whole store; on boot
  (served) the file is fetched and wins — picker repaints via the
  onPresetStoreReplaced hook. localStorage stays as boot cache + file://
  fallback. First served load with browser presets and an empty/absent file
  SEEDS the file (so james-prefs-01 migrates itself on next reload).
- A start-preset change made in the file applies on next reload, never
  mid-flight. Smoke-tested GET/PUT round trip + validation rejection; all
  four sims pass; stamp v49.4.

Where things stand: still awaiting the first big-dimension flight verdicts.
James reloads → his presets appear in assets/presets.json → any session just
reads the file. Claude edits to the file show up in the picker on his next
reload.

## 2026-07-24 — claude-fable (v49.3 — "→ claude": tuner presets get a channel to the session)

James saved a preset (james-prefs-01) and asked how to "tell" Claude his
settings — localStorage is browser-side, invisible to the session. Built the
channel he asked for:

- New tuner button "→ claude" in the presets row: prompts for a one-line note,
  then POSTs the live cfg snapshot + ALL named presets (+ which is default) to
  the dev server. Served-only; under file:// it reports "no server ✗".
- New server endpoint `POST /api/worlds/:slug/prefs` (generic, any world):
  writes a timestamped JSON dump to `tmp/<slug>/prefs/prefs-<stamp>.json`
  with { saved, world, note, cfg, presets, default }. tmp/ is gitignored —
  it's a message to the session, not shipped data.
- Flow: James clicks → types a note → tells Claude "sent" → Claude reads the
  newest file in tmp/orb-dimension/prefs/. Endpoint smoke-tested; all four
  sims pass; stamp v49.3.

Where things stand: still awaiting the first big-dimension flight verdicts.
When James sends a dump he wants kept, bake those values into cfg defaults
(or the presets story of a later phase) — the dump file itself is ephemeral.

## 2026-07-24 — claude-fable (v49.2 — the ball pit was the veils: scaled fog restored)

The ghost balls survived v49.1 ("a ball pit at the McDonald's" — James). He
invited a browser look ("if you wanna load a browser and take a look, you
should") and one screenshot settled it: the halos were innocent this round —
the VEILS were the balls. v49 had moved them to the 500km walls and made them
fog-EXEMPT; their entire dim-mottling character had only ever existed under
v38 fog (they rendered at 0.14–0.66 of authored brightness), so exemption
lit 84 giant spheres at full alpha.

- Fix: veils get fog at 0.05 strength (walls moved ~21x out, so 1/21 fog
  reproduces the v38 rendered brightness at the same viewing angles) instead
  of exemption. One shader line. James: "looks way better."
- Halo long-range gate (v49.1) stands — the two layers were separate crimes.
- Stamp v49.2; all four sims pass.

Where things stand: James has SEEN the big dimension (looks right now);
full flight-feel verdicts (250km distance, dust density, beacon brightness,
overdrive slam) still to come. Tune points if the walls read wrong: the 0.05
veil-fog scale in the FS, or delete the veil layer if space should have no
walls at all.

## 2026-07-23 — claude-fable (v49.1 — the halo becomes long-range only)

James finally asked what the "ghost balls" were: the halo layer — the cave-era
scattered-light envelope around every orb, controlled by the glow slider. His
read was right: up close it's just a second translucent ball, and the world is
space now, not a cave. Fix (his go, "give 'er a whirl"):

- DISTANCE GATE: halo fades in from 40 to 140 radii of distance — within ~40
  radii you see only glass and light; far away the halo still does its real
  job (a distant orb reads as a glow at all). Heart-flagged beacons/sun keep a
  constant gate ratio via the never-shrink radius — still lit across the map.
  Veils exempt (they are scattered wash on far rock, the one place the cave
  logic still holds).
- TIGHTENED: falloff pow 2.2 → 4.0 — what remains at range reads as radiance,
  not a shell with an edge. The breathing pulse survives (distant twinkle).
- Glow slider now means "long-range luminance." Stamp v49.1; all four sims pass.

Where things stand: still awaiting James's first big-dimension flight — now
without the ghost balls. If the far-field reads too dim with halos gated, the
40/140 radii thresholds are the tune points (in the FS halo block).

## 2026-07-23 — claude-fable (v49 — THE BIG DIMENSION, phase 1: the flight-feel expansion)

James's go, same session as the spec. Scope was deliberately "prove the bones":
size, ladder, ring — nothing decorative.

- SPACE: flight bounds are 1,000 × 1,000 × 250 km (SPACE_X/Z/Y half-extents
  500k/500k/125k). The populated core keeps the old 48×48×12 as CORE_X/Z/Y —
  field, station grid, skull, Lantern all exactly where they were. Far plane
  80km → 1,600km. Veils moved to the REAL walls (fixed coords at ±SPACE, ~21×
  radius, fog-exempt in the shader — rock 600km away still reads).
- CAMERA-RELATIVE RENDERING: the whole scene renders in ship space. Orb
  instances subtract cam.pos in float64 at upload; the view matrix is
  rotation-only; skull subtracts uCamPos in its VS; robots seat their model
  matrix relative; the Lantern gets relative origin/light uniforms. This is
  the float32-jitter fix that makes 250km colonies renderable up close.
- FLAT SPEED LADDER (never a sum — max-magnitude of impulse vs thrust):
  impulse 240 free · booster 1,200, 240s H2O, full in 5s · overdrive 3,600,
  360s DEU, slams in 3s. All cfg-driven (GOD MODE). Engine audio and HUD
  normalize to the cfg tops. Autopilot cruises up to overdrive speed for the
  long hauls (the "grab a drink" loop).
- THE RING (James's layout spec): the three reef colonies moved out to a
  jittered triangle ~250km from center, mid-plane — colonyLayout(LAYOUT_SEED),
  dials colonyDist/Vert/Jitter in the tuner, applyColonyLayout() → relayout()
  re-seats colonies/stations/actors without re-rolling the field. Names kept
  (Yth-Alune flagship + hidden exit, Sorrek Bloom, Vhal-Imir). Each colony:
  a heart-flagged BEACON (fog-proof family-color smudge visible across the
  map) and a doorstep cluster (2 water + 1 deuterium, outside the shell).
- CAMERA-LOCAL DUST: motes recycle through a ±4km/±2km box around the ship
  (wrap in the frame loop) — honest parallax at 3,600 m/s anywhere in the gulf.
- GOD MODE tuner groups: "drive" (3 tops, 2 tanks, 2 spools) + "the ring"
  (3 layout dials, rebuild-on-release). Tuner panel got a max-height scroll.
- Robots became explicitly LOCAL workers (40km leash, nearest-station
  fallback) so nobody signs up for a three-day haul; Lantern caretakers spawn
  at their post; colony-doorstep stations mean some robots work the ring.
- VERIFIED: reef-sim updated (new extraction incl. layout block, v49 bounds,
  station counts 70/39, colony-doorstep forgiveness, new TEST 10 ring
  determinism/spec) + NEW ladder-sim.mjs (source-guards the flat-speed and
  camera-relative lines; asserts spec math: 1,000km = 77% of a DEU tank,
  diagonal 1,436km > 1,296km range, spools hit 98% on the mark) + v47-sim
  (floor const) — all four sims PASS. Build stamp v49.

Where things stand: awaiting James's first flight — this whole phase exists so
he can feel the size before anything else gets built. Everything else in
expansion-spec.md (stargates, depot grid, grown reefs, hub society, luminous
region) remains spec-only. Watch for: dust density at rest (box is ±4km,
tunable), beacon brightness, whether 3,600 needs more speed-reading than dust
alone, HUD POS pod width at 6-figure coords.

## 2026-07-23 — claude-fable (expansion spec recorded — no code changes)

Planning session for "the big dimension." James riffed the numbers live and settled a
phase spec, recorded in `expansion-spec.md`: 1,000×1,000×250 km space, flat non-additive
speed ladder (impulse 240 free · booster 1,200, 240s tank, 5s spool · overdrive 3,600,
360s tank, 3s spool → 1,296 km per tank, so a 1,000 km crossing lands with ~23% reserve
and only the diagonal forces a depot stop), 5–6 stargates, guaranteed-find fuel-depot
grid (~50 km default). Key design rules that emerged: tank-as-ruler shaping (one tank ≈
one map plus reserve), overdrive slams while booster builds, "every gate has a road."

Also in the spec: a GOD MODE tuner-controls running tally (James's list, keeps growing —
top speed and tank length are the key knobs) with the constraint that geography is NOT
god mode: overall size and key POI locations eventually finalize and freeze, v38-style.
Feel is forever tunable, the map is eventually law. Late riff, unsettled: circular or
spherical space — Claude's read is boundary shape is nearly free and nearly imperceptible;
the real lever is population shape (galaxy-disc distribution inside any boundary), noting
a 1,000 km disc/sphere kills the tank-out-ranging diagonal.

Where things stand: SPEC ONLY. world.js untouched — current build still flies
120/400/1200 additive. Next step is a build plan drafted from the spec's open-questions
list (gate placement, core relocation, clump character, depot catch, 3,600 m/s
readability), discussed with James, explicit go before any code.

## 2026-07-22 — claude-fable (v48 — the drag-stick: deflection steering with a saturation rim)

James named the problem precisely: with relative-drag steering he had to keep
moving the mouse "farther and farther" to hold a turn — he'd independently
invented the saturation radius every mouse-flight game uses. Discussed first
(his call: build my recommendation, tune by feel), then built:

- DRAG-STICK: pressing plants a virtual joystick where you clicked; the
  pointer's offset from that anchor commands a turn RATE. Deadzone (14px),
  response curve (^1.7 — gentle near center for aim), and a saturation rim
  (260px) past which more distance adds nothing: park the cursor at the rim
  and the ship holds its best turn forever. Nothing accumulates in pointermove
  anymore — the frame loop reads the live offset and feeds pending at rate*dt,
  exactly like the arrow keys, so the v47 critically-damped servo still owns
  all smoothing. Pitch max 30°/s vs yaw 42°/s (~70% — kinder to the stomach).
- INSTRUMENTS: a faint ice-blue anchor dot + dashed saturation rim (reticle's
  palette — orange stays nav's), shown while steering or once a press is
  clearly a hold; the rim brightens at full deflection so "farther adds
  nothing" is visible. z-index 5, under the nav ring.
- HANDS-ON DISCIPLINE: crossing the deadzone is the "hands on" signal — it
  arms the stick and releases autopilot/leveling. AutoNav engage, R, and H
  all DISARM it (stickLive=false), so a cursor merely parked off-center can
  never steer; the hand must move again to reclaim the ship.
- TUNER: new "the stick" group — mode select (drag-stick / center-stick,
  the latter always-on at screen center, Freelancer style), dead zone, reach,
  yaw °/s, pitch °/s, response. Presets carry stickMode like grouping.
- VERIFIED: new `tmp/orb-dimension/stick-sim.mjs` (source-guard on the
  shipped formulas + 6 tests: deadzone, saturation, signs, monotonic curve,
  servo settles on command with zero overshoot and dies on release). v47-sim's
  stamp check now accepts any v>=47. All three sims pass.

Where things stand: James hasn't flown it yet — defaults are educated guesses
awaiting his hands. Center-stick mode is built but untried. If the drag-stick
feels wrong, the old feel is NOT a tuner setting — it was replaced; the
changelog history (v9–v47) has the full flight-model account.

v48.1 (same day, after James's first flight): "definitely an improvement" —
but the rim circle was too present, maybe unnecessary. Hidden via STICK_RIM
flag in the stick block (physics and anchor dot untouched, rim DOM/CSS kept);
flip the flag to bring it back. Stamp bumped to v48.1 so a stale tab is
detectable.

v48.2 (same day, James's spec, verbally precise): the stick is PINNED to the
center reticle — "don't follow the mouse click around... pin it to the
middle." Center mode is now hold + pull: grab must BEGIN within reach/2 of
the reticle (a drag started out at a portal stays a drag), pull away =
increasing turn pressure through the same deadzone/curve/saturation, release
or return = neutral. Arming is per-hold (pointerup always disarms). No dot,
no rim in center mode — the reticle itself marks neutral; the always-on
no-button center variant from v48 is gone. Drag-stick survives as the tuner
alternative. One-time migration (stickModeV) forces saved v48 cfgs onto
center once; after that the tuner choice rules. Same deflection math —
stick-sim still passes untouched.

v48.3 (same day): James felt roll fighting the pull ("upside down, it wants
to pull the other way") — correctly diagnosed: the v26 coordinated bank-carve
rotates around WORLD-vertical while the stick pulls in SCREEN space; at steep
bank it bends the ship off the mouse line, inverted it reads reversed. Fix:
the carve yields to the hand — scaled by (1 − stickMag), so full pull = pure
mouse authority, hands-off banked flight keeps the v26 carve exactly. The
carve line is now source-guarded in stick-sim.

v48.4 (same day): the yield wasn't enough — James's pencil spec retired the
v26 carve outright: "A and D shouldn't make me do anything except rotate the
ship around its middle axis... like a pencil coming all the way straight
through the middle." His test case: flying at the skull + D should corkscrew
with the nose glued to the skull, not careen right. The carve was the
pre-stick era's only way to turn in flight; the stick owns turning now.
BANK_CARVE flag (default false) keeps the v26 code one flip from returning.
Roll still banks-and-stays; R still levels.

v48.5 (same day): "this feels better... I should turn slower" — max turn
rate defaults dropped 42→28°/s yaw, 30→20°/s pitch (ratio kept). Stick
migrations restructured into a versioned ladder (stickModeV, now 3) — each
voice-made feel decision force-applies once over older saved cfgs, then the
tuner rules. The rates remain live sliders (TUNE → "the stick") for James's
by-eye pass.

v48.6 (same day): with the stick slowed, roll stopped keeping up with the
nose ("time for the rolling to keep up with the nose pull"). ROLL_RATE
0.46→0.51 rad/s — James's protocol: +10% per step, iterate by ear until it
sits. History of this const: 0.66 → 0.46 → 0.51.

## 2026-07-21 — claude-fable (v47 — THE DIMENSION WAKES UP: interiors, worldlets, Vess-Karai, colony life, the fleet)

James's six-item brief ("surprise the shit out of me", 100 Meshy credits authorized —
81 spent), all built:

- SMOOTH STEERING: the mouse-look ease is now a critically-damped second-order
  servo (LOOK_W 10) — angular velocity is continuous, so hand jitter can't echo
  into rapid back-and-forth. Net rotation still equals drag distance. Verified by
  sim: 3.4x less 8Hz jitter in output velocity, half the peak jerk, same latency.
- VESS-KARAI, THE LANTERN: a 1km beveled glass pyramid (Blender headless →
  `assets/pyramid/pyramid.bin`, magic PYRA, 284 flat-shaded tris) standing on the
  cave floor at [9500, −5850, 6500] — apex 850m above the flight floor, provably
  outside the station grid and sight corridor. Fresnel glass pass (facets quiet,
  beveled ribs catch rim light), a white-gold fog-proof sun pulsing inside, a warm
  wash pooling beneath, six ember lights circling the base, a low 55Hz beat-hum
  within 2km. On the NAV panel under the monument section (standoff 1500).
- ORB INTERIORS: instance data grew 16→20 floats (i4 = kind, p0, p1, activity).
  ~52% of field orbs now carry an interior; every one is a vague glowing nothing
  from afar, stirs as you approach, and is fully awake beside you (act 0/1/2,
  distance-driven, smoothed, thresholds scale with orb size). 23 procedural scenes
  in the fragment shader — James's list (swirl lights, water+fish w/ bubbles,
  kaleidoscope, metaball blobs, orrery, tech×6: reactor/data-rain/radar/gyro/
  circuit/beacon — tech deliberately common) plus inventions: snow-globe city,
  storm orb w/ lightning, ember hive, clockwork, galaxy, the eye that opens when
  you get close, forge, singing crystals, moons, metronome, jellyfish tank,
  library w/ a book that leaves its shelf. Three Meshy paintings live behind
  glass as rare finds: THE BEAR READING (moss-green, spectacles, tea — ~1 in
  170 orbs), a bioluminescent terrarium, an inventor's workshop.
- WORLDLETS: five Meshy planet maps (lava, ice, gas giant, ocean, desert) on a
  1024² texture array; ~8% of field orbs render as rotating lit planets —
  seed-keyed light direction, limb darkening, hue-tinted atmosphere, night-side
  city lights that only sparkle at act 2. Longitude samples mirror-wrapped, so
  the maps never show a seam. Welcoming ring guarantees: gas worldlet, reactor,
  the bear, and the fish near the skull.
- COLONY LIFE: polyp pulses are COORDINATED now — phase falls with distance from
  each colony's heart, waves of light rolling outward (fadePhase math in
  makeReef; the extracted reefGeometry block untouched — all 9 sim tests PASS).
  Per colony: 10 exchange motes arcing polyp-to-polyp on eased Béziers, 8 rune
  glyphs (64-rune seeded canvas atlas, unit 4) drifting out into the dark, and
  three energy species — 5 darters (closed-form lissajous streaks with 3-echo
  tails, screen-space elongation), 4 pulse jellies, 6 flutter moths on figure-8s
  around favorite polyps. Colony comms chatter (sparse glassy blips through the
  cave echo) within 2.6km.
- THE FLEET: 14 service robots — James's Meshy bot (meshy-6 text-to-3d + refine,
  the credits' centerpiece: cyclops eye, teal panels, hazard-striped hover skirt)
  prepped headless to `assets/robot/robot.bin` (RBOT, 9k tris, 6m tall) + 1K
  basecolor. Own mesh pass, per-robot matrix, engine-light-from-below in the
  shader, hover bob. Job loop: travel (eased, ~110 m/s max) → service (patient
  orbit) → next client; clients weighted to inhabited orbs, then depots,
  colonies, and the Lantern (robots 0–1 are its dedicated caretakers). Cargo orb
  swings below on supply runs; cyan engine glow brightens with speed. A robot's
  visit WAKES its client orb (svc boost → act). Fleet is served-only (mesh
  fetch) and stays fully dark on file://.
- Draw order: skull + robots (opaque, depth-written) → Lantern glass (blended,
  no depth write) → orbs (depth-tested, no writes). Orbs behind the glass shine
  through it, as glass full of light should.
- Verification: `tmp/orb-dimension/v47-sim.mjs` (6 tests: binary formats, robot
  height, Lantern placement invariants, instance-stride wiring, shader kind
  coverage, asset presence — ALL PASS) + reef-sim 9/9 + all 8 GLSL shaders parsed
  clean (@shaderfrog/glsl-parser) + node --check. Stamp v47.
- UNTESTED BY JAMES'S EYE (all one-number tunes): interior brightness/scale per
  scene, worldlet rotation speeds, glass alpha + inner-glow strength, creature
  sizes, act distance thresholds, chatter/hum levels, and ROBOT_FACING (flip to
  −1 in world.js if the fleet flies backwards).

## 2026-07-19 — claude-fable (v46 — mouth globe removed)

- James pulled the v45 mouth globe after seeing it ("that's my fault, just
  take that out") — makeMouth() and its wiring removed clean. The eyes and
  the mouth's warm shader pulse (v27) are untouched. Stamp v46.

## 2026-07-19 — claude-fable (v45 — the red globe in Korrudan's mouth)

- Per James: a red globe up inside the roof of the mouth. Palate located by
  probing skull.bin for downward-facing normals in the mouth region
  (canonical centroid 0,−117,155); the globe (r=100, flag-3 red like the
  eyes) seats at world (0,−361.6,513.5) — nested up into the bone by the
  depth test, glowing down into the mouth, pulsing on the old Heart's 7s
  beat. Visible from spawn as a red star inside the open jaw (flag 3 carries
  the star-size floor). It does not gaze-track; only the eyes do. Stamp v45.

## 2026-07-19 — claude-fable (v44 — impulse coasts)

- James: releasing W at 120 m/s in space should not be a wall. Impulse now
  has its own velocity state: quick ramp while held (τ 0.5s), and on release
  it coasts on the same 3.2s constant as the thruster — forward and reverse
  alike. X (all-stop) bleeds it fast like everything else; H zeroes it; the
  autopilot's release point accounts for impulse + thrust coast distance.
  The instant stop is gone. Stamp v44.

## 2026-07-19 — claude-fable (v43 — N toggles NAV, lock-on autopilot)

- N toggles the NAV panel from the keyboard (any other key hands control
  back — see below).
- LOCK-ON, per James's spec: with a target ringed, hold the nose on the ring
  (the existing ~3° lock) for 3 continuous seconds → the ring ARMS (bright,
  breathing). Click inside the armed circle → autopilot: the nose eases onto
  the course (0.5 rad/s cap), nav-assist thrusters cruise at up to 900 m/s
  (distance/8, floor 140 — no tank drain), mode line reads AUTO, ring shows
  a steady double border. Release point = standoff + |thrust|·3.2s (the
  coast time constant), so the ship cuts power one coast-length out and
  drifts to a stop at the doorstep: 2600m off Korrudan (the buffer edge),
  700m off a colony, dead on top of a fuel station (the flyover refuels).
- ANY control input cancels: keys (except N), mouse steering, H, X. Panel
  retarget also resets the arm/lock state.
- Controls card: N row + a lock-on explainer. Stamp v43.

## 2026-07-19 — claude-fable (v42 — spawn aims between the eyes)

- James: dead-on at the skull needs pitch −3 from spawn. Baked it: the spawn
  basis (and H-home) now loads with the nose dipped 3° — position unchanged
  at [0,0,20000], ATT honestly reads PIT −03, R levels to the true horizon
  as always. spawnBasis() is the one source of the starting orientation.
  Stamp v42.

## 2026-07-19 — claude-fable (v41 — spawn at z 20,000)

- Start position and H-home moved to [0, 0, 20000] — a proper long approach
  to Korrudan across the static space (face ~19.4km out; ~16s of overdrive).
- The load-in sight corridor stretched with it (z 0..20600, both the orb
  exclusion and station placement) so nothing parks in the view on the way
  in. Sim re-run: all 9 PASS (stations re-jittered around the longer
  corridor, forgiveness bars unchanged). POS Z placeholder updated.
  Stamp v41.

## 2026-07-19 — claude-fable (v40 — the parked-bank drift, solved)

- James pinned the "side-to-side coasting": bank the ship (A/D), stand still,
  and the view slides sideways forever at 0 m/s. That was the v26 coordinated
  turn carving heading at ANY speed — pure rotation, so the speedo was right.
- Fix: turn authority now scales with speed (|speed| / 120, capped at 1) and
  is zero at a standstill — wings need airflow. Held banks still sweep full
  circles the moment you're moving at impulse speed or better; a parked
  banked ship just sits there, tilted and patient. Stamp v40.

## 2026-07-19 — claude-fable (v39 — slimmer bays, button stack past the fuel gauge)

- All dash bays slimmed another notch per James (pods 11% → 9.5%, SYS 8.5%,
  FUEL 11.5%, cluster 22% → 19% / min 210px).
- NAV / TUNE / CTRL now stack vertically in the bay row itself, just past the
  fuel gauge — no longer floating at the console's absolute top right. Same
  instrument glass, tighter padding. Stamp v39.

## 2026-07-19 — claude-fable (v38 — impulse, fuel, NAV, and the space goes static)

Big approved batch (plan discussed, James: "love all suggestions", tanks doubled).

- FLIGHT: W/S renamed IMPULSE, 80 → 120 m/s, burns nothing, mode line shows
  IMPULSE. Overdrive 800 → 1200 m/s (engine drone rescaled to match). The
  controls card now says "reverse booster" for S + shift.
- THE SPACE IS STATIC: 48 × 48 × 12 km — the old slider maximums, now
  SPACE_X/Z/Y constants. Spread sliders and "the space" tuner group removed;
  sanitizeCfg() overrides stale saved presets. Defaults densified for the
  bigger volume (orbs 140 → 400, dust 1400 → 2200) and the veil patches
  doubled (r 3200–5200) to keep the same angular wall cover. sim.mjs updated
  to the new cfg: all 6 legacy tests still PASS.
- FUEL (forgiving by design): H2O tank feeds the booster (180s of continuous
  burn), deuterium feeds overdrive (120s). Dry tank = that drive refuses
  (ENG reads NO H2O / NO DEU; overdrive sputters out with the wind-down);
  impulse is always free — limp, never stranded. 64 water globes (knots of
  blue glass) + 36 deuterium depots (tight hot amber-green pulses) at seeded
  STRATIFIED positions — pure-random left 14km voids, the jittered grid
  caps the worst H2O gap at 9.7km (TEST 9). 150m flyover refills to full:
  two-note chime through the cave echo (water high/glassy, deuterium lower)
  + the meter sweeps up with a glow flourish. New FUEL bay (same glass) with
  H2O and DEU bars; they breathe amber below 25%.
- NAV: third deck button. Panel lists Korrudan (the Head), the globe-thread
  communities by name — Yth-Alune, Sorrek Bloom, Vhal-Imir — and
  water/deuterium (nearest at click). Click to target: orange ring on the
  item (edge-clamped off-screen, name + live distance beneath), pointer
  arrow orbiting the reticle toward its bearing; within ~3° the ring locks
  solid and the arrow stands down. Click again to clear.
- reef-sim.mjs grew TESTS 7–9 (station determinism/exclusions/forgiveness);
  extraction-marker gotcha: the markers also appear in doc comments — the
  sim anchors on `const STATION_SEED =` with an offset search. ALL PASS ×9.
  Stamp v38.

## 2026-07-19 — claude-fable (v37 — longer coast, X all-stop, deck buttons + controls card)

Three James asks in one pass (his fourth item — side-to-side coasting should
be shorter — is PENDING a numbered-question answer: there is no lateral
velocity in this flight model, so it's either the bank-turn carving during a
coast or the mouse-look ease; waiting on which before touching either).

- Coast: free-coast time constant 1.6s → 3.2s — releasing a burn now carries
  you roughly twice as long. The all-stop exists precisely so the long drift
  never becomes a nuisance.
- X = ALL-STOP: the clear "stop in space" control. Cancels overdrive (with
  the wind-down thump), bleeds thrust at τ 0.35s — fast but no head-snap —
  console reads BRAKE while it's working. Any fresh thrust input (shift,
  space, W, S) releases it.
- TUNE + CTRL are ship controls now: two buttons seated on the deck's flat
  run, upper right of the console, styled as small panes of the same blue
  instrument glass (same gradient, whitish outline, top sheen — per James,
  "just like all the other panels look, but these are just buttons"). The
  floating "tune" pill is gone. TUNE opens the tuner; CTRL opens a new
  controls card (right side, above the console): every flight control plus a
  legend of the console bays. One panel at a time — each closes the other;
  buttons blur after click so the space bar keeps toggling overdrive, and
  engaged buttons light like active instruments.
- Hint line now mentions X and CTRL. Stamp v37.

## 2026-07-19 — claude-fable (v36 — booster de-sirened)

- James: the shift booster sounded like a police siren / blowing hot air. Guilty
  parties: the 620→1500 Hz gliding sine "turbine whine" (that WAS a siren) and
  the sawtooth sub growl. Both gone. The booster is now a pure low rushing
  noise — white noise through a lowpass whose cutoff opens 180→480 Hz with the
  throttle, over a fixed 70 Hz noise bed for weight. Nothing tonal, no pitch
  glides; the reverse burn darkens the rush instead of dropping a tone.
  Overdrive's pulsing saws are untouched (different drive, different animal).
  Stamp v36.

## 2026-07-19 — claude-fable (v35 — compact console rows, the reef spreads)

James's pass on v34 (a couple minutes' look): panel rows fall too wide — labels
and values shouldn't be justified across the bay — and the reef earns more.

- Console rows compacted: no more space-between justify. Labels sit tight
  against their values (fixed 4.6ch label column so values still align down
  the glass), bays slimmed 14% → 11% (SYS 9.5%), the cluster capped at 22%,
  and the whole instrument group packs toward the center with the wings
  pinned at the ends — the bare deck between is deliberate open real estate
  for future systems ("we can use that space for other things later").
- THE REEF SPREADS: one colony → a species. REEF_COLONIES table: the flagship
  at [6600,−900,−5200] grown ~30% (12 trees, longer branches, 380 spores) plus
  two outlying patches at [−8200,600,3400] and [−2600,−1500,−8600]. Hidden
  exit stays flagship-only; NAV's REEF row now reads the NEAREST colony.
- reef-sim.mjs updated for multi-colony (extraction marker is now
  `const REEF_COLONIES`): 5905 points, deterministic, nearest-to-origin
  7723m, 0 corridor hits, max spread 893m, worst overdraw 2.6 screens, gaze
  clamp holds. ALL PASS. Stamp v35.

## 2026-07-19 — claude-fable (v34 — skull detail, engine sound, HUD readability, THE REEF, the gaze)

James's session brief: skull needs its detail back, engines need voices, HUD text
was unreadably tiny (plus he wants live position), and from the pitch list he
picked the Reef and the Gaze to build.

- SKULL NORMAL MAP: the Meshy source GLB carried a 4K normal map we'd been
  throwing away. Extracted raw from the GLB (Node, zero re-encode —
  `assets/skull/skull-normal.jpg`, 15.7MB) and sampled in the skull shader via
  a screen-space cotangent frame (no tangent attribute needed; UV flips absorb
  into B automatically). Fine sculpted detail returns at zero triangle cost;
  decimation stays 0.45. Optional load — missing file = v33 lighting. glTF +Y
  convention assumed: if bumps read as dents to James's eye, flip the green
  channel sign in perturb(). If he still wants more, next lever is decimate
  0.45 → 0.75 (~28MB bin).
- ENGINE SOUND: three synthesized voices on a new "engines" bus with its own
  channel slider (arachno-wars pattern). Thruster = cold-gas hiss (W/S).
  Booster = throaty sub-saw + noise + turbine whine climbing with the shift
  burn (and carrying the wind-down as thrust decays). Overdrive = detuned saws
  pulsing at 4.4Hz — a genuinely different animal — with an ignition thump +
  noise breath on engage and a low wind-down on disengage. Reverse burn (S)
  detunes everything to 0.82x so the flip is audible. All params move through
  setTargetAtTime from the frame loop.
- HUD READABILITY REDESIGN: same footprint philosophy (console cap 118 → 150px,
  ~7% of a 4K screen) but the type roughly DOUBLED: rows clamp to 20px, the
  speed number to 46px, everything gets a faint phosphor glow. Screens went
  glassy — gradient glass faces, top-edge sheen, cyan inner glow, rounded
  bezels. New POS bay (live X/Y/Z in meters, running as you fly) between the
  cluster and NAV; NAV gains a REEF range row. Wings slimmed to make room.
- THE REEF: a bioluminescent orb colony at [6600, −900, −5200] (~8.5km out) —
  nine seeded branching mineral growths (dim, desaturated nodes every 7m,
  tight 1.35x quads) crusted with 272 fast-pulsing polyps in five hue
  families, 300 drifting spores, and a pale exit orb nested at its heart (a
  hidden BONUS exit — the three near home stay canonical). Fixed world coords
  like the skull; spread sliders and wander can't touch it. Geometry is a pure
  function of REEF_SEED — identical every visit.
- THE GAZE: within ~6km the skull's red eyes track the ship — each eye drifts
  inside its socket toward you (48m clamp < the 53m measured bone clearance,
  slow 1/0.6s ease). Beyond range they relax to dead ahead. Cheapest possible
  haunting.
- Verification: `tmp/orb-dimension/reef-sim.mjs` extracts reefGeometry()
  VERBATIM from world.js and asserts: deterministic (2 runs identical, 2223
  pts), population budget, clears the KEEP-2400 buffer (nearest 7886m) and the
  sight corridor (0 hits), inside default flight bounds, worst in-colony
  overdraw 1.7 screens, gaze clamp ≤ 48m over 40k poses. ALL PASS. Stamp v34.
- Untested by James's eye yet: normal-map light direction, engine mix levels,
  HUD type scale, reef look from inside. All four are one-number tweaks.

## 2026-07-18 — claude-fable (v33 — bigger buffer + a clear sightline at load-in)

- Monument buffer widened: KEEP 1560 → 2400m (skull corner ~1370, so ~1km of empty dark
  around the bone in every direction).
- New corridor exclusion: a 950m-radius cylinder along the view axis from the buffer edge
  to just past spawn (z 0..6200) — orbs can no longer sit between the load-in camera and
  the face. Both zones sphere+cylinder sim-verified together, 40k trials, 0 violations.
  Dust motes still drift everywhere (atmosphere). Stamp v33.

## 2026-07-18 — claude-fable (v32 — eyes to 2x, head tilted back 5°)

- Eyes: radius 240 ("Yikes!") → 160 (double the original 80), same wide ±270 seats.
- The skull now tilts back 5°: rotation about X baked into the loader (positions AND
  normals, after the 3x scale), face lifted skyward. The eye fixed positions carry the
  same rotation ((±270,−45,570) → (±270,4.9,571.7)) — retilt them if the angle changes.
  Stamp v32.

## 2026-07-18 — claude-fable (v31 — eyes tripled and un-crossed)

- James: the red orbs read cross-eyed, hugging the nose. Radius 80 → 240, x ±180 → ±270
  (world m). Same y/depth. Update the comment's canonical socket numbers if re-measuring —
  the wider seat matches the outer halves of the measured socket holes. Stamp v31.

## 2026-07-18 — claude-fable (v30 — spawn to [0,0,5600])

- Another 2000m back per James (2600 → 3600 → 5600 over three requests; the skull's face
  is now ~4.76km from spawn, still well inside the 11.4km flight bound). H-home matches.
  Stamp v30.

## 2026-07-18 — claude-fable (v29 — spawn back again, monument clearance, red eyes)

- Spawn + H-home moved another 1000m back: [0,0,3600] (skull face now ~2.76km ahead).
- Monument clearance: assemble() pushes any orb within 1560m of the origin radially out to
  a shell just past the skull (corner radius ~1370m at 3x + wander margin) — the welcome
  ring (250–1000m) and near portals now form the inner shell around the monument. Dust
  motes stay as ember atmosphere (one-line change if James wants them out too); veils
  unaffected. Sim: worst post-push radius 1572m over 20k trials.
- THE EYES: two fixed red orbs (r=80, hues 2/357, sat 92%, slow 3.2s pulse) seated in the
  measured socket centers (skull.bin hole-map: canonical ±60,−15,190 → world ±180,−45,570).
  New instance flag 3 = eye: red-tinted shader branch + the heart's never-smaller-than-a-
  star clause, so the red gaze is visible all the way from spawn. o.fix positions are
  spread-slider-proof and wander-proof; socket bone partially occludes the glow (depth
  test) so they read as nested, not floating. Sim-verified seating (53–55m to bone).
  Stamp v29.

## 2026-07-18 — claude-fable (v28 — skull scale + quality fix, per James's drive-by review)

- James's two notes before leaving for a movie, both valid: (1) 600m at 2600m viewing
  distance subtends ~13° — reads like a nearby orb, not a monument; (2) decimation to 16%
  visibly faceted the bone up close ("looks like junk").
- Fixes: re-exported at decimate 0.45 → 579k tris (was 206k) with the full 4K basecolor
  (was 2K) — 22MB served total, fine locally; and the loader now scales positions 3x at
  parse (SKULL_SCALE const in world.js) → the skull stands 1800m tall, ~38° from spawn,
  face ~1760m away. Anisotropic filtering (x8) added for grazing-angle sharpness. Binary
  re-validated by the Node sim (579k tris, y ±300 canonical). Stamp v28.
- Untested by James yet (he's at the movies) — next session: judge scale and surface
  quality in-world; if 3x still reads small, it's a one-number change.

## 2026-07-18 — claude-fable (v27 — THE SKULL: a 600m fossil god at the center of the world)

- James's Meshy skull ("alien god skull v2", tuned by him on the canvas, 600m tall,
  exported to `assets/ref/`) now floats at the exact center, face toward spawn. Weathered
  bone, bronze-green metal veins, hanging jaw. It dwarfs everything, as ordered.
- Probes confirmed no surgery needed: the mouth is an open ring and the severed underside
  is open — fly in through the teeth, exit below. No collision (walls are ghosts, v1).
- Pipeline (`tmp/orb-dimension/skull_prep.py`, headless Blender): recenter on origin,
  decimate 1.29M→206k tris, export custom binary (SKUL magic, interleaved pos/norm/uv +
  u32 indices, Y-up world coords) + 2K basecolor JPG — 7.4MB total, down from 70MB.
  Node sim validates the binary exactly as world.js parses it (bbox/normals/uvs/indices).
- Rendering: new skull pass inside the world's own WebGL2 pipeline (NOT an overlay canvas
  — that lesson is learned). Context now has a depth buffer; skull draws first (opaque,
  depth-written), orbs then depth-TEST with writes off, so sprites clip behind bone and
  shine through the eye sockets. Shader: basecolor × (cool starlight key + faint fill +
  warm pulse breathing up into the mouth from below — the Heart's soul lives on) with the
  orbs' haze knob. Skull texture on unit 1; orb state handed back after each pass.
- The Heart orb itself is retired (assemble() no longer includes it; makeHeart() kept for
  lore). HOME readout + edge marker already pointed at the origin = the skull's center.
- Served-only enhancement: skull.bin needs fetch(), so on file:// the world simply has no
  skull. Known quirk: portal clicks ignore skull occlusion (can click an orb through bone).
  Stamp v27 (v26 was taken by the coordinated-turn build below).
- Next: James flies it — judge scale from spawn, lighting/pulse, whether mouth-transit
  wants collision or interior detail later. `assets/ref/` (70MB) stays gitignored?  — decide
  at wrap-up whether to commit the source GLB or just the prepped assets.

## 2026-07-18 — claude-fable (v26 — coordinated turn: banking is turning)

- James: no way to HOLD a turn — mouse steering runs out of desk, bank alone didn't
  change heading, so a full banked circle back to the start was impossible.
- Added the aircraft rule after the roll block: while banked, the ship carves around the
  world-vertical at TURN_RATE(0.5 rad/s) x sin(bank) — hold a bank, sweep a continuous
  circle; level (or R) and the turn stops. Node-sim verified: 45° held bank closes a full
  360° circle in ~18s with zero bank drift; left banks left, right banks right. Arrow keys
  still steer directly; mouse unchanged. Stamp v26.

## 2026-07-18 — claude-fable (v25 — REDIRECTION: spaceship retired, v17 viewscreen restored)

- James's call after flying the whole arc: no flying/shooting game here — too much work for
  the reward, and that road is all hard design decisions best made deliberately on paper,
  not prompted through. The original vision stands: a giant black space full of orbs to fly
  through, to be populated with Meshy-made wonders (doorways, big floating things, things
  on the ground below).
- Restored the v15/v17 viewscreen HUD character-for-character (dark canopy frame + gussets,
  canted machined deck, wings, stencil labels, inset screens): version archaeology via the
  earlier session's transcript confirmed v13=corner brackets (in git), v14=the "Claude
  Design" cards, v15=the hybrid deck James approved, v16/17=flight-only. All v18-v24
  cockpit work is OUT of the world: no three.js overlay, no C/V keys, no plate chrome.
- One upgrade kept, per James: the boresight reticle is now the full attitude instrument —
  the WHOLE reticle counter-rotates through 360° with bank (was: horizon bars only), so a
  barrel roll spins it all the way around inside the fixed canopy.
- Kept: spawn/H-home at [0,0,2600] (James: definitely better), v16/17 S-reverse flight,
  patched shared three loaders, `assets/ship/crescent-wishbone.glb` (beloved model, future
  set-dressing candidate?). Parked in `tmp/orb-dimension/parked/`: cockpit3d.js + the
  extracted chrome plates. Concepts stay in `tmp/orb-dimension/concepts/`. Stamp v25.
- Meshy round-trip pipeline (concept → James art-directs in Meshy → API pull → world) is
  proven and stays — that's the tool for populating the space going forward.

## 2026-07-17 — claude-fable (exterior view PARKED; interior is the focus)

- James's call: the exterior/ship direction is getting too complicated for a two-person
  team right now. The interior view — load in, fly around the orbs from inside a cockpit —
  is the original vision and is close. Exterior stays functional behind V (ship, plumes,
  lazy GLB load all keep working) but gets no further investment for now; leaving V now
  ALWAYS restores the interior cockpit even if it had been toggled off.
- Keep from this arc either way: the Meshy account→API→repo model pipeline, the GLB
  inspection/preview headless-Blender recipe, `assets/ship/crescent-wishbone.glb`, and the
  patched shared three.js loaders. Interior work continues from the v19 extracted chrome +
  v21 hard-lock doctrine.

## 2026-07-17 — claude-fable (v24 — ship orientation fixed: nose forward)

- James's v23 report: ship rendered in profile facing screen-left, plumes floating where
  the tail would be if it faced away. Root cause: the model's LENGTH runs along its X axis
  (nose −X, tail +X, pods ±Z) — v23 assumed nose −Z and never rotated it, and the nozzle
  scan hunted max-Z with a stale matrixWorld (pre-add, unbaked transforms).
- Fix: nozzles now scanned in ship-local coords (updateMatrixWorld before scale/rotate,
  tail = max X, cluster per z-sign); ship rotated −90° about Y so nose points −Z; plumes
  placed via the explicit local→rig map (x,y,z)→(−z·S, y·S, x·S), aft = rig +Z. Nose sign
  confirmed two independent ways (James's report; which Blender preview azimuth caught the
  thruster glow). Stamp v24.
- Still open from James's look: hull reads more silver than white (env/material tune),
  ship is rigid in camera space by design — consider a few degrees of input-driven lean.

## 2026-07-17 — claude-fable (v23 — exterior ship view: the Crescent Wishbone flies)

- James designed his ship in Meshy ("Crescent Wishbone Spaceship", image-to-3d) — pulled via
  the Meshy API straight into `assets/ship/crescent-wishbone.glb` (36MB, 294k tris, 4K PBR
  set + loose texture copies alongside). Headless Blender previews in `tmp/orb-dimension/`;
  hull reads dark there only because bare metal needs an environment to reflect.
- V toggles the exterior view: the ship rides 13.5m ahead / 3.4m below the camera, nose
  forward, rigid in camera space — the world canvas supplies all motion cues, so the chase
  cam needed zero changes to the world renderer. C still toggles the interior placeholder;
  GLB lazy-loads on first V press only.
- Engine plumes: nozzle positions found by scanning the mesh for rearmost vertex clusters
  per side at load; each gets an additive glow sprite + cone that scale with thrust (idle
  wisp → W → shift burn → overdrive 2.4x), light flicker, plus a point light so the hull
  catches its own engine glow. Pearlescent hull lit by a PMREM synthetic environment
  (space sphere + two light cards).
- Shared-lib note: vendored `src/lib/three/` loaders/utils had bare `'three'` import
  specifiers (mandala-shop resolved them via its index.html importmap). Patched all three
  files to relative `'../three.module.js'` so orb-dimension works without an importmap —
  same URL/instance either way, mandala-shop unaffected. Orb's index.html untouched.
  Stamp v23.
- Next: James flies it; tune ship offset/scale, plume look, maybe input-driven ship lean
  (into turns, never lagging); texture downsize before public ship.

## 2026-07-17 — claude-fable (v22 — spawn pulled back 1000m)

- Start point and H-home reset moved from [0,0,1600] to [0,0,2600], same heading (facing
  the heart down −Z). More approach room for the new cockpit. Stamp v22.

## 2026-07-17 — claude-fable (v21 — cockpit hard-locked to camera, lag removed)

- James flew v20: the camera-lag lean fought the arrow-key steering ("extreme odds against
  the wasd keys") and let the cockpit drift off the reticle. His spec, now law: the cockpit
  horizon stays LOCKED to the reticle at all times; a full barrel roll shows the world
  rolling around a rock-steady canopy, cockpit glued to the view.
- cockpit3d.js: all smoothing/delta/clamp code deleted; frame() just renders. The cockpit is
  rigid in camera space — the world canvas underneath supplies all motion cues. The 3D rig's
  continuing value: perspective depth now, ship GLB + exterior chase view next. Stamp v21.

## 2026-07-17 — claude-fable (v20 — 3D cockpit proof: transparent three.js overlay + camera lag)

- James called the flat plates' limit: a cockpit that stays screen-fixed through banks kills
  the illusion. New tactic agreed: real 3D cockpit, camera inside, eventually an exterior
  view too. This build proves the rig with a placeholder before any ship modeling.
- `cockpit3d.js` (new): transparent three.js canvas (vendored `src/lib/three/`) at z5 under
  the HUD, DPR capped 1.5. Placeholder cube-built cockpit matching the concept layout: two
  swept side struts, carbon console slab with five glowing frosted sockets, rear bulkhead
  ring so looking back shows cabin. Loaded via dynamic import from world.js — on file:// the
  module can't load and the flat v19 chrome simply stays (graceful degradation).
- Motion: the cockpit is rigid in camera space; the illusion comes from LAG. A smoothed
  basis (τ=0.15s) trails the live flight basis; the cockpit rotates by the delta, hard-
  clamped at 7° (motion-sickness restraint). Node sim with real three.js verifies: lean
  rises into a bank, saturates at 7.00°, decays to 0 within ~0.5s of leveling. C toggles
  3D cockpit vs flat plates (mode-3d class hides .ck-*/.vs-console-rig). Stamp v20.
- Next: James picks/draws the ship design; then Meshy image-to-3D exterior + interior
  (Blender fallback for the interior), GLB replaces the cube frame, exterior chase view.

## 2026-07-17 — claude-fable (v19 — chrome extracted from the chosen concept, supersedes v18)

- James rejected the v18 plates: the green-screen image-to-image pass had REGENERATED the
  design (fat beige struts, rope-like carbon weave, hallucinated grab handles) instead of
  converting it. Lesson recorded: every Meshy image-to-image pass is a redraw, not an edit —
  never use one to "convert" approved art.
- v19 extracts the chrome pixel-for-pixel from the approved concept
  (`tmp/orb-dimension/concepts/cockpit-concept-3-open-glass.png`) via flood-fill background
  keying (scipy label from frame edges, star despeckle, 0.8px edge soften) — `extract_v2.py`
  + `slice_v3.py`. Thin swooping struts, molded console, glowing sockets all survive intact.
- Slices: band crop y765 (the arch tops out ~y770), caps split at the socket gaps (x267/x772),
  strut feet masked so no band artwork rides along; struts now render ABOVE the band and
  overlap ~28px so the foot plants onto the console face. Verified by PIL-composited
  simulations at 1600x900, 2560x900, 900x1100 (`v3-assembled-*.png`). Stamp v19.
- Instruments: ATT / cluster / NAV mapped to the three middle sockets by native
  x-fractions; SYS absolutely positioned into the right cap's socket.

## 2026-07-17 — claude-fable (v18 — rendered cockpit chrome, Meshy pipeline)

- The dashboard-style dark canopy (flat struts, gussets, machined deck) is replaced with
  rendered art: pearlescent white metal struts + carbon-trimmed frosted-glass console band,
  concepted via Meshy (nano-banana-pro), chroma-keyed and sliced with PIL. Concepts and
  scripts live in `tmp/orb-dimension/concepts/`; production plates in `assets/cockpit/`.
- Resize scheme: struts anchor to the side edges and scale with viewport height (wider
  window = more open glass between them, no stretching); the console band is a 3-slice —
  sculpted caps at native aspect, middle slice stretches. Struts tuck ~46px under the band
  so the joint never seams. Chrome is ~80% open center per James's brief.
- Existing readouts (ATT / speed cluster / NAV / SYS) now sit as dark glass insets over the
  frosted band middle — alignment with the drawn sockets is approximate, instrument
  restyling (alien typography, weapons/shields panels) is the next pass. Old .vs-wing DOM
  kept but display:none. Stamp v18.
- Next: tune band height / socket alignment with James's eye, restore the pearlescent glow
  (CSS or a re-render), higher-res plates if 1024px source shows soft on big screens.

## 2026-07-17 — claude-fable (v17 — S reverses the boosts, supersedes v16)

- James corrected v16: "not brake, reverse." S now flips the burn direction while held —
  shift and overdrive thrust backwards at full strength (−400/−800), swinging smoothly
  through zero, and swing forward again on release. Overdrive stays toggled throughout.
  Console: speed shows a − sign, mode reads REVERSE, throttle bar turns amber on a
  reverse burn. Stamp v17.

## 2026-07-17 — claude-fable (v16 — S brakes the boosts)

- S now outranks shift/space (per James): holding it kicks the overdrive toggle off,
  blocks the shift burn from building, and bleeds thrust at a 0.5s time constant
  (vs 1.6s free coast). Console mode line shows BRAKE while it's doing that. Stamp v16.

## 2026-07-17 — claude-fable (v15 — cockpit redesign: hybrid deck + glass)

- James's verdict on the v14 console: "looks like Claude Design" — four identical rounded
  cards read as a SaaS dashboard, not a ship. Redesigned in the hybrid direction he chose
  (canted physical console + sparse glass projections):
  - Console is now ONE machined deck, perspective-tilted toward the pilot
    (rotateX 13° in a 640px perspective rig; deck spans -2%..102% so the top-edge
    convergence never gaps against the side struts). No border-radius cards, no gaps —
    instrument screens are inset into the metal (dark faces, inner shadow, scanlines
    on the screens only), stencil paint labels (ATT/NAV/SYS) on the deck itself.
  - Asymmetry: unequal wings of inert structure (vent slats + four bolt heads each,
    7% left / 4.5% right), pods 15/15/12.5%, central velocity cluster rises out of
    the deck with a clipped-corner silhouette and an amber hazard-stripe lip.
  - Glass layer: boresight reticle dead center (four arc segments, cross ticks, dot)
    whose horizon bars counter-rotate with bank every frame — the first live
    instrument on the canopy, and the anchor point for weapons later. Faint bracket
    arcs mid-screen left/right.
- Flight untouched this pass (James: A/D roll "definite improvement"; more tuning later).
  Stamp v15.

## 2026-07-17 — claude-fable (v14 — ship viewscreen + A/D roll)

- HUD rebuilt as a proper ship viewscreen (James: "feel like you are in a ship", ≤10% of
  the screen): canopy frame all the way around — top strut with heading-tape ticks, side
  struts, angled corner gussets, faint interior glass glow — and a bottom console of four
  readout panels: ATTITUDE (HDG/PIT/BNK), VELOCITY (big m/s number, live throttle bar,
  IDLE/COAST/BURN/OVERDRIVE mode line), NAV (HOME distance, CONTACTS within 2.5 km,
  EXITS), SYSTEMS (ENG NOMINAL; WEP and SHD report OFFLINE — weapons, shields, and
  enemies to blow up are the planned next phase). Console text refreshes at ~8 Hz;
  throttle bar every frame. CRT scanlines over the console. Old hairline corners/edges
  and the floating speed readout are gone (speed lives in the console now).
- Roll moved Q/E → A/D at James's request (NMS-style: bank with keys, point the nose
  with the mouse) and slowed 30% (0.66 → 0.46 rad/s). Strafe removed; Q/E deliberately
  unassigned for now. Hint text updated, stamp v14.
- Flight hint, tuner toggle/panel, and the portal focus anchor all sit above the console
  (CSS vars --console-h / --vs-side).
- Next: weapons, shields, enemies — the SYSTEMS panel is waiting to flip WEP/SHD online.
  James is also going to study No Man's Sky's flight feel for further tuning.

## 2026-07-16 — claude-fable (session close — committed at v13)

- First commit of the world: `src/worlds/orb-dimension/` plus its map-room link, drift
  registry entry, and World Ideas #55 (status `live`). Blender build scripts, the .blend,
  lit previews, and the verification sim live in `tmp/orb-dimension/` — gitignored by
  repo policy, local only.
- Where things stand: flyable, tunable, stable — James is happily doing barrel rolls.
  Controls: W/S dolly, A/D strafe, Q/E persistent roll, R levels, shift thruster (400),
  space toggles overdrive (800), drag steers in the local frame, H hard-resets home.
  Rescue/orientation net: the fog-proof Heart star + edge marker + veils (no view
  direction is ever black — sim-verified).
- Next, per James: default-preset values he'll paste from "copy settings"; Blender cave
  room (floor/ceiling/walls at honest scale); space stations and dimensional doors as
  the real exits; POI map; Procreate → image-to-3D → Blender model pipeline for props;
  possibly secret worlds outside the drift.

## 2026-07-16 — claude-fable (v13 — tuner presets)

- Presets row at the bottom of the tuner: name field + save / apply / set as start /
  delete, stored in localStorage (`elastic-orb-dimension-presets-v1`). "Set as start"
  (★) makes that preset win on every load — James's chosen default load-in. "copy
  settings" puts the live values on the clipboard as JSON so he can paste them in chat
  for me to bake into the shipped DEFAULTS.
- Applying a preset re-rolls the field only if the grouping changed; otherwise the
  existing orbs just retune in place. Stamp v13.
- Also incoming from James: Procreate drawings → image-to-3D → Blender → world models
  (the validated Hunyuan3D pipeline is exactly this; see memory `hunyuan3d-pipeline`),
  plus interest in another 3D generator. Models for stations/doors will likely arrive
  by that road.

## 2026-07-16 — claude-fable (v12 — overdrive + ghost HUD)

- Roll rate backed off 40% per James (1.1 → 0.66 rad/s).
- Space = OVERDRIVE toggle: ramps to 800 m/s and HOLDS until tapped again, then coasts
  down (or settles to 400 if shift still held). H clears it.
- First pass of the minimal HUD ("invisible jet" brief: a humanoid species 10,000 years
  ahead, exotic-matter ship): hairline corner brackets, 6px frosted-glass slivers on all
  four window edges (backdrop blur), speed readout reworked into thin letterspaced glass
  type — brightens with a hairline underline while overdrive is engaged. Shows for any
  motion now (dolly/strafe included). Stamp v12.
- James's roadmap for this world, logged: space stations; doors leading to other
  dimensions (probably the real exits); a map with points of interest; possibly SECRET
  WORLDS hidden outside the drift system entirely. "Now THAT is elastic space, baby."

## 2026-07-16 — claude-fable (v11 — free flight: persistent roll + banking)

- James (a No Man's Sky pilot, thousands of hours) wants real 3D flight: Q/E roll while
  held and STAY rolled, R glides back to the plane of the ecliptic, banking into turns.
- Camera rebuilt from horizon-locked yaw/pitch to a free orthonormal basis (f/r/u) rotated
  incrementally in its own frame (Rodrigues + per-frame re-orthonormalization). Mouse and
  arrows now yaw/pitch in the LOCAL frame, so a banked yaw curves the bank; pitch is
  unclamped (loops possible). Q/E roll at ~63°/s with eased start/stop, persistent. R
  levels roll+pitch keeping heading (~1s glide, cancelled by any look/roll input). Strafe
  slides along the banked wing plane. H hard-resets orientation, position, thruster.
  All downstream math (billboards, view matrix, raycast, home marker) was already
  basis-driven, so it inherited free flight unchanged. Stamp v11.

## 2026-07-15 — claude-fable (v10 — A/D strafe)

- v9 thruster confirmed working well. Q/E barrel-roll idea discussed and parked (tap-to-
  roll recommended if revisited); James chose A/D strafe first. A/D slide left/right at
  dolly speed (80 m/s, horizon-locked, instant stop), composing with dolly + thruster;
  mouse look unchanged. Strafe + drag-to-look is the orbit-an-orb combo. Stamp v10.

## 2026-07-15 — claude-fable (v9 — the thruster)

- James confirmed v8 flight feels smooth (dollied, steered mid-flight with the mouse,
  orbited an orb and looked back at himself) and spec'd motion step two himself: shift
  fires a thruster that takes a few seconds to reach full velocity, then coasts to a stop
  over a few seconds after release.
- Implemented exactly that: hold shift → speed ramps toward 400 m/s (≈95% in ~3.5s);
  release → exponential coast (~6s to standstill), zeroed below 4 m/s. Velocity direction
  always follows the gaze — steering curves the flight rather than diverging from it.
  W/S dolly (80 m/s, instant stop) composes on top, so S is a soft brake while coasting.
  H / "return home" also kills the thruster. Small m/s readout shows while thrusting or
  coasting. Bounds and all v6–v8 GPU guards unchanged. Stamp v9.
- Next candidates when James asks: a speed/VMAX knob in the tuner ("the flight" group),
  vertical or strafe drift, sound reacting to speed, and the Blender cave room.

## 2026-07-15 — claude-fable (v8 — the dolly + grouped tuner)

- James signed off on the look ("this is starting to look amazing") and asked for the
  dolly. Motion step one: hold W to glide forward along the gaze at a constant gentle
  80 m/s, S to back out, release = instant dead stop. No momentum, no strafing, no speed
  control. Bounds clamp to 0.95x spread. H (and the tuner button, now "return home")
  restores position AND view.
- Tuner controls grouped into labelled subpanels per James: "the field" (orbs, dust,
  grouping), "the space" (width/depth/height), "the orbs" (sizes, glass, glow), "the air"
  (haze, color fade). Actions row unchanged.
- Sim TEST 3 back to random positions across the whole dolly-reachable volume: still
  zero blind poses in 2000. All six tests PASS.
- Next steps when James asks: strafe or vertical drift as motion step two; then maybe
  gentle speed control; the Blender cave room remains the big build on deck.

## 2026-07-15 — claude-fable (v7 — square glow fix)

- FIRST CONFIRMED WORKING VIEW: James sees the orbs (in pirate voice). One visual bug in
  his report: glows rendering as translucent rectangles/squares — the v6 fill-rate fix
  shrank dust quads to 1.6x and veils to 1.05x, but the halo falloff still assumed a 2.6x
  quad, so the gradient was cut mid-fade at the card edge. Halo falloff (and the discard
  radius) is now normalized per instance to its own quad size — every glow reaches zero
  before its card's edge. Stamp bumped to v7.

## 2026-07-15 — claude-fable (seventh pass, same session — v6 stamp + resilience)

- James reported the page loading quarter-size top-left then "zooming" to fill, then
  FLIGHT — which is impossible in the look-only build. Verified: server hash == disk hash
  (current build served), no external edits, world folder untracked/unmodified. Strong
  suspicion: a stale tab still running pass-5 JS (the crashed tab restored). To end the
  ambiguity forever, the hint line now ends with a build stamp ("· v6") — if the stamp is
  missing, it's an old copy.
- Hardening from the report anyway: canvas gets inline fullscreen styles + dark body
  fallback (a failed stylesheet can never leave a 300x150 canvas on a white page); vertex
  shader caps billboard radius at 0.8x distance; CPU skips quads inside the near-fade's
  zero zone (draws only the culled count); DYNAMIC RESOLUTION — frame-time EMA scales
  internal render res down to 0.5x when the GPU drowns (James is on 3840x2160) and creeps
  back up when load eases. webglcontextlost still auto-reloads.
- Sim suite now 6 tests, all PASS: group in view at spawn (27 orbs); wander ≤ ~10 m/s;
  zero blind orientations /2000; home always indicated; overdraw 4.3 screens (defaults);
  maxed-tuner abuse 150.8 raw screens → 37.7 at the dynamic-res floor (affordable).
- Rendering answer for James: the canvas renders at the monitor's native resolution
  (device-pixel-ratio aware, no upscale-zoom anywhere in the code).

## 2026-07-15 — claude-fable (sixth pass, same session — LOOK-ONLY build)

- James's session ended in a GPU context loss (white screen + sad-face square, audio still
  playing): the fifth pass's veil patches were a fill-rate bomb — near the walls, dozens of
  screen-covering translucent quads per frame → frame rate collapse (his "gray blur" and
  the un-stoppable slow cruise: at 2 FPS the velocity damping takes ~10 real seconds) →
  Windows TDR killed the context. Fixed with per-instance quad sizes (veils 1.05x radius,
  dust 1.6x, orbs 2.6x); sim TEST 5 now asserts worst-case overdraw (5.0 screens, was 50+).
  webglcontextlost handler reloads the page if it ever happens again.
- Per James, flight is REMOVED for now — figure it out bit by bit. The camera is bolted
  1600m outside the central group, facing it. Drag or arrow keys rotate the view; H or the
  tuner's "recenter view" resets it; nothing else moves, ever. No momentum anywhere.
  Fly-speed slider and wheel-speed gone. Flight returns once looking works for James.
- Sim updated for the look-only build, all PASS: 27 group orbs squarely in view at spawn;
  zero blind orientations in 2000; wander ≤ 9 m/s; home always indicated; overdraw ≤ 5.
- Next: James verifies he can just LOOK — group ahead, swing away, swing back, orbs still
  there. Then reintroduce motion one small piece at a time (probably slow dolly first).

## 2026-07-15 — claude-fable (fifth pass, same session — verified in simulation)

- James lost the field a third time, so this pass was verified headlessly before handover:
  `tmp/orb-dimension/sim.mjs` replicates the world's math (population, wander, camera
  physics, projection, fog) and asserts. Results: camera drift over 120s with no input =
  exactly 0m; max wander speed 9.4 m/s; ZERO blind poses out of 2000 random positions +
  orientations (worst case sees 8 glows, mean 61); home always indicated.
- Found: tuner sliders re-rolled the ENTIRE field on every input tick (scrubbing "orbs"
  teleported everything — reads as "they zoomed by and vanished"). Orbs now live in
  persistent pools; count/dust sliders add/remove at the list's far end and never touch
  what's around you. Only "regenerate" and grouping changes re-roll.
- The Heart: one bright fog-proof pulsing white star at the exact center (the mysterious
  ambient source, made visible). Never renders below star-size on screen — visible from
  anywhere. You spawn 900m from it, facing it; H flies you back to it.
- Home marker: when the heart is off-screen, a soft dot glides along the screen edge in
  its direction. You can always point yourself home.
- Veil patches: ~120 huge, very dim glowing washes parked on the cave's ceiling, floor,
  and walls (deterministic grid, just past the flyable bounds) — faint mottling of rock
  miles away. Every possible view direction meets at least one; doubles as the interim
  answer to "some texture back there" until the Blender room is built.
- Flyable bounds pulled strictly inside the inhabited volume (0.95x spread); dust spills
  to 1.3x and got bigger (2–6m) and denser (default 1400), so looking out from the edge
  still shows embers. Speed cap halved to 600 m/s, default 150, gentler wheel; saved
  tuner values are clamped to current ranges on load.

## 2026-07-15 — claude-fable (fourth pass, same session)

- Root cause of James getting lost found: orb wander amplitude was scaled to the volume
  size (±480m at default spread), so the near orbs drifted their entire distance-to-viewer
  sideways within seconds — the field visibly fled the camera on load, twice. Wander is now
  absolute meters (60m orbs / 30m dust / 15m portals, a few m/s — "drifting slowly about").
- Ember dust layer: ~900 tiny motes (1.5–4.5m, halo-dominant, twinkling) fill the whole
  volume so no viewing direction is ever pure black and flying always has parallax to read
  speed against. "dust" slider in the tuner (0–2500).
- Welcoming ring tightened: 12 orbs at 250–1000m, evenly spread in angle, biased large.
- Pale exit orbs now resist fog 60% — they read as lighthouses from far off.
- Drag-look sensitivity nearly halved (0.0022 → 0.0013 rad/px).

## 2026-07-15 — claude-fable (third pass, same session)

- James got lost on first load: spawn was at the field's edge looking across it, so one
  drag swept every orb out of view with nothing nearby to reorient by. Now you wake DEAD
  CENTER in the volume, perfectly stationary (idle bob removed entirely — the camera never
  moves unbidden). A "welcoming committee" of a dozen orbs always rings the spawn at
  350–1600m regardless of grouping, and the three pale exit orbs sit within sight of home.
- Added H = fly home (also the tuner's "fly home" button); hint mentions it.

## 2026-07-15 — claude-fable (second pass, same session)

- Camera flight, per James: rebuilt the renderer from DOM-sprite parallax to raw WebGL2 —
  one instanced draw of billboard quads (a sphere is the one shape a billboard renders
  honestly, which is why the Blender sprites survive a flythrough). The four shell PNGs
  live in a texture array; each orb's two crossfading color layers + halo are composited
  behind the glass in the fragment shader. Depth-sorted back-to-front, premultiplied alpha
  over the CSS cave background.
- Flight: drag to look, WASD + E/Q (or Space) to fly, scroll sets cruise speed, shift ×3.
  Deliberately gentle — damped acceleration, smoothed look, pitch clamp, no roll (James's
  motion sensitivity). Gentle idle bob until first input; off under prefers-reduced-motion.
- Tuner panel (Chrome Rift pattern: toggle button + bottom panel, localStorage):
  orb count, width/depth/height spreads, size range, glass opacity, glow, haze, color-fade
  speed, fly speed, grouping select (scatter / clusters / strata / river), regenerate /
  fly home / reset. Positions are stored normalized, so spread sliders stretch the volume
  LIVE mid-flight — that's the "stretch them way out" experiment James asked for.
- Exits: pale pulsing orbs — three near the flight start plus one per ~60 orbs scattered.
  Click = raycast → triggers the hidden data-drift anchors (still keyboard-focusable).
- index.html deliberately untouched (canvas/tuner/hint injected from world.js).
- Where things stand: flyable and tunable. Next: the cave itself — Blender-rendered
  floor/ceiling/wall geometry or baked shells mounted around this volume (renderer is now
  true 3D, so mounting real surfaces is straightforward); orb-lit ground pools; sound
  experiments (speed-reactive wind, orb proximity chimes).

## 2026-07-15 — claude-fable

- First build, from James's pitch: an endless black volume — cave-black, not monitor-black,
  ten miles across and two miles high, dimly lit by an unfindable ambient source, with dozens
  of glowing colored balls drifting through it.
- Orb sprites rendered in headless Blender (Cycles, transparent film): four translucent glass
  shell variants (`glass`, `frosted`, `swirl`, `banded`) in `assets/orbs/`. The shells are
  neutral grays with real alpha — all hue comes from layered color gradients the page stacks
  BEHIND each shell (two crossfading hue layers + an outer halo). Build script + .blend +
  lit previews live in `tmp/orb-dimension/`.
- The space is code: world-coordinate volume with perspective projection (scale, dimming,
  depth blur by z), 46 drifting orbs in four depth bands plus one out-of-focus near wanderer,
  sum-of-sines wander, very slow camera drift + gentle pointer parallax (both off under
  prefers-reduced-motion).
- Three pale white pulsing orbs are the drift exits (`data-drift`, clamped on-screen).
- Sound: Web Audio synthesis through the shared sound control — sub-bass air rumble plus
  sparse far-off tones through an echo chain.
- Where things stand: first pass complete and registered. Untuned by James's eye yet — likely
  knobs: orb count/size mix, drift and crossfade speeds, how dim the ambient light sits,
  halo strength, ping frequency/loudness.
