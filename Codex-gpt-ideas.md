# 20 Buildable Elastic Space Ideas

Every proposal below is a **single HTML-page mini-application**: no account, no backend, and no run-time AI/API dependency. The default stack is vanilla HTML, CSS, and JavaScript. Use the locally available PixiJS bundle for ideas that need many animated sprites or particles. Image generation, Blender, and ElevenLabs are optional **asset-production tools**: generated images become sprites/plates, Blender produces pre-rendered transparent PNG or short video loops, and ElevenLabs supplies a small set of voice lines. Nothing depends on a service being available during a visit.

## 1. The Door That Learns Knocking

**The app:** A sealed apartment door listens to a visitor's knock rhythm. It gradually teaches three increasingly unnerving knock patterns; matching one changes the peephole, the hallway sound, and eventually opens a different kind of exit.

**Build:** HTML/CSS for the door and peephole, Canvas for dust and hallway light, and Web Audio for sampled knocks. Pointer taps work everywhere; microphone rhythm is an optional alternate input. A finite-state machine compares tap intervals with forgiving timing windows.

**Three-night plan:** Night 1: create the door, tap timing, and one success path. Night 2: add three door states, peephole animations, and six short audio cues (including optional ElevenLabs tenant messages). Night 3: tune timing, add keyboard operation/reduced-motion behavior, and polish the ending.

## 2. Smuggler's Aquarium

**The app:** A customs inspector must identify three illegal aquatic creatures hidden in shipping crates. A flashlight, water-temperature dial, and feeding pipette make each creature reveal a different behavior; the visitor decides whether to release, confiscate, or accidentally overfeed it.

**Build:** PixiJS for a single tank scene, particle bubbles, and creature state machines. Use three or four pre-rendered transparent creature sprites; image generation or Blender can make the source art, but the page only loads PNG/WebP assets. Decisions lead to seven authored end cards.

**Three-night plan:** Night 1: make the tank, tools, one creature, and the interaction loop. Night 2: add two creatures, behaviors, particles, and sound. Night 3: write endings, add mobile controls, and optimize sprite counts.

## 3. Department of Misfiled Weather

**The app:** A clerk works in an archive where weather has been filed under the wrong headings. Dragging “anxious fog” into “kitchen appliances” or “Tuesday” into “hail” causes the office to become a visual weather experiment.

**Build:** A drag-and-drop filing interface over a Canvas weather renderer. Six weather effects (rain, fog, wind, lightning, sun, and pollen) are enough; each tag changes two or three renderer parameters. CSS filters and a handful of static office assets carry the rest.

**Three-night plan:** Night 1: build the filing tray and one Canvas effect. Night 2: add the six effects, combination rules, and three “correct” but strange classifications. Night 3: add sound layers, touch drag controls, and an exit hidden in the archive.

## 4. Pocket Planet Laundromat

**The app:** Tiny planets arrive with stains: a ring of satellites, too much gravity, a permanent eclipse, or a civilization stuck to the hem. The visitor operates a coin laundry to clean them without destroying the inhabitants.

**Build:** One illustrated laundromat with three washer windows; each window is a Canvas or PixiJS simulation with simple circular bodies, tinted water, and spinning cycles. Blender can produce a handsome washer front as a single background plate; all planet behavior is 2D JavaScript.

**Three-night plan:** Night 1: make one washer and a planet that spins, sloshes, and responds to settings. Night 2: add three planet recipes and their failures/successes. Night 3: add machine sounds, a printed receipt ending, and responsive layout.

## 5. Night Shift at the Doll Hospital

**The app:** Three damaged dolls arrive with impossible symptoms: one casts the wrong shadow, one speaks only through its wound, and one has a loose memory instead of a loose eye. The visitor diagnoses them using ordinary-looking hospital tools.

**Build:** DOM cards and a large inspection table, with Canvas overlays for X-ray, heat, and shadow views. Each doll is a small finite puzzle with two or three tools; no physics engine or procedural dialogue is necessary. ElevenLabs can create five to ten uncanny nurse announcements.

**Three-night plan:** Night 1: build the table, tool selection, and one doll puzzle. Night 2: add the other two puzzles, visual inspection modes, and consequences. Night 3: add voice, accessibility labels, and a final discharge report.

## 6. Eel Karaoke

**The app:** A lounge full of electric eels expects the visitor to conduct their karaoke number. The visitor draws a melody lane; eels follow it, harmonize, sulk when ignored, and make the water flicker with their song.

**Build:** PixiJS handles 20–40 eel sprites, glowing trails, and water distortion; the melody is a pointer-drawn line sampled into a simple note sequence. Web Audio oscillator tones plus recorded vocal stings keep it self-contained. No microphone is required.

**Three-night plan:** Night 1: draw a melody line and have one eel follow it with sound. Night 2: add a small eel school, harmony rules, scoreless “audience mood,” and lighting. Night 3: add performance variations, mute controls, and a graceful low-power mode.

## 7. Do Not Feed the Hole

**The app:** A hole in a tasteful living-room wall asks for objects. Feeding it a lamp, plant, clock, or typed secret changes its appetite and gradually reveals that it has been furnishing a room on the other side.

**Build:** A DOM/CSS room with draggable objects, plus a Canvas/PixiJS hole that uses a masked swirl, particles, and a simple appetite state machine. The “other room” is a prebuilt collage assembled from the visitor's choices; local storage can preserve one version of it.

**Three-night plan:** Night 1: implement object dragging, swallowing, and two visible hole reactions. Night 2: add six objects, choice combinations, and the revealed room. Night 3: add sound, save/clear behavior, and a small secret ending.

## 8. Emergency Star Repair

**The app:** A neighborhood star has gone out. The visitor works at a repair bench, soldering flares, balancing planets, and removing a small black hole from its ventilation system before dawn.

**Build:** Canvas 2D is sufficient: draggable components snap into three repair stations, with simple orbital math and particle sparks. Blender can create a few polished tool and component renders, but all simulation remains lightweight JavaScript.

**Three-night plan:** Night 1: make the repair bench, drag/snap pieces, and one completed station. Night 2: add three repair tasks, star animation, and failure states. Night 3: add sound, procedural star names, and an ending sunrise.

## 9. Bureau of Alternate Selves

**The app:** An administrative photo booth issues identification cards for variants of the visitor: “the self who learned birdsong,” “the self with a second childhood,” or “the self who never left the mall.” The card arrives with a bureaucratic score and an implausible restriction.

**Build:** Optional webcam capture via `getUserMedia`, rendered to an HTML Canvas with a few reliable image treatments: posterization, tint, mirrored fragments, grain, and ID-card cropping. A bundled silhouette illustration provides a no-camera fallback. Card text comes from authored fragments, not an AI call.

**Three-night plan:** Night 1: create the form, card composition, and fallback portrait. Night 2: add camera capture, four image treatments, and a 60-line text fragment library. Night 3: add export-to-PNG, privacy copy, and keyboard-friendly controls.

## 10. The Last Animal Translation Service

**The app:** A call-center operator tries to communicate with an animal that may be the last of its species. The visitor makes waveform “sentences” using sliders for pitch, pulse, warmth, and repetition; the creature responds in ways that slowly become legible.

**Build:** SVG or Canvas visualizes the outgoing and incoming waveforms. A finite response table maps a manageable set of signal qualities to 20 authored replies and creature animations, so it feels like language without requiring language-model logic. Web Audio plays the signals.

**Three-night plan:** Night 1: build the four controls, waveform display, and six response rules. Night 2: add the creature visual, 20 replies, audio, and a relationship meter. Night 3: refine the puzzle path, add a text-free tutorial beat, and complete the final exchange.

## 11. The Unclaimed Shadows Office

**The app:** Shadows separated from their owners wait in a municipal office. The visitor uses a movable desk lamp to reunite shadows with objects, but some shadows belong to absent, impossible, or future objects.

**Build:** A single Canvas scene with flat object silhouettes and ray-based or precomputed shadow polygons. Keep it intentionally 2D: five objects, five shadow targets, three lamp positions, and a visible “match” threshold are plenty. CSS creates the office, forms, and desk clutter.

**Three-night plan:** Night 1: make movable lighting and one object/shadow match. Night 2: add five authored cases and the impossible-object twist. Night 3: add paper sound, hint states, touch input, and a stamped closing sequence.

## 12. Cartographer for a Tiny Rainstorm

**The app:** The visitor draws a miniature city by placing roofs, drains, parks, and street slopes. Then they release a rainstorm and watch it discover puddles, shortcuts, flooded basements, and unexpected rivers.

**Build:** A grid-based Canvas simulation—not fluid dynamics. Each grid cell stores elevation, permeability, and building state; raindrops follow simple downhill neighbor rules. A hand-drawn tile set generated as SVG or image assets makes the result feel lush.

**Three-night plan:** Night 1: make the tile editor and basic downhill water movement. Night 2: add building tile types, runoff rules, clouds, and a few storm presets. Night 3: add saving via local storage, a playback/replay button, and visual polish.

## 13. Horizon Repair Shop

**The app:** Horizons arrive broken: a sunset has the wrong vanishing point, mountains have been installed upside down, or the sea keeps returning to the sky. The visitor repairs each with sliders, draggable layers, and a deliberately untrustworthy level.

**Build:** Layered DOM images or Canvas strips with blend modes, parallax, and draggable anchors. Image generation is especially useful here for five cohesive landscape plate sets; no complex rendering is needed. Success is checked by simple target ranges, not image analysis.

**Three-night plan:** Night 1: create one layered horizon and draggable alignment controls. Night 2: add four repair jobs, blend-mode effects, and different target rules. Night 3: add short ambient audio loops, a gallery of repaired horizons, and mobile controls.

## 14. The Emergency Eclipse Rehearsal

**The app:** The sun and moon are preparing for an eclipse but cannot remember their marks. The visitor operates a theatrical control board to cue orbital position, cloud cover, birds, temperature, and audience awe.

**Build:** A single SVG or Canvas proscenium with a timeline. Each control adjusts a small set of values, and a visible rehearsal score grades only broad timing windows. A generated three-second video loop of clouds is optional; CSS/Canvas clouds also work.

**Three-night plan:** Night 1: build the stage, sun/moon motion, and one cue control. Night 2: add the timeline, five cues, audience reactions, and three possible rehearsal outcomes. Night 3: add sound design, replay/share card generation, and reduced-motion support.

## 15. Memory Vending Machine

**The app:** A vending machine sells memories in cans, but it can only stock memories that the visitor describes in five words or fewer. It prints a package design, nutrition facts, side effects, and a tiny visual diorama for each submission.

**Build:** Vanilla JavaScript uses an input string, deterministic hashing, and curated word banks to select a palette, flavor, warning, and sprite arrangement. Canvas draws the package and diorama; nothing needs to leave the browser. Generated product art can be a fixed sprite sheet.

**Three-night plan:** Night 1: create the input, deterministic seed, and can renderer. Night 2: write the word banks, add 30–50 visual combinations, and animate dispensing. Night 3: add PNG export, local recent-memory shelf, and empty-input surprises.

## 16. The Fake Moon-Landing Set

**The app:** The visitor is the exhausted director of an obviously fake moon landing. They arrange rocks, move a cardboard Earth, control a wind machine, and direct a tiny astronaut—only to discover the fake set has begun producing real lunar phenomena.

**Build:** CSS 3D transforms or a 2D Canvas composition with draggable props. Use a handful of Blender-rendered cardboard-prop PNGs and one short astronaut sprite sequence. A simple checklist drives the first phase; four escalating anomalies drive the second.

**Three-night plan:** Night 1: make the stage and drag/drop composition. Night 2: add the checklist, scoring, and three prop interactions. Night 3: add anomalies, camera-flash effects, sound, and a clean reset.

## 17. The Museum of Lost Interface Gestures

**The app:** A quiet museum preserves endangered interactions: double-clicking, click-and-drag selection, scrollbar grabbing, right-clicking, and mouse circles. Each successful gesture wakes an exhibit that behaves like a small animal.

**Build:** DOM is the right tool: each exhibit listens for a specific pointer/keyboard event and reveals a CSS or SVG animation. There are no hard puzzles, only discovery; a touch-friendly alternate gesture is provided beside each exhibit.

**Three-night plan:** Night 1: create the gallery shell and three gesture detectors. Night 2: add seven exhibits, animations, labels, and sound. Night 3: add touch alternatives, accessibility descriptions, and a final museum map that has learned the visitor's habits.

## 18. The Sunken Call Center

**The app:** The visitor routes incoming calls from ships, whales, drowned cities, and the moon while the switchboard slowly floods. Correct routing is less important than noticing that several calls describe the same event from incompatible angles.

**Build:** A DOM switchboard with six plug sockets, timed call cards, and a Canvas water overlay. The narrative is a deck of 24 authored call snippets shuffled with constraints; Web Audio adds line crackle and brief caller voices. The flood is a CSS/Canvas height value.

**Three-night plan:** Night 1: build plug routing, a call queue, and one call result. Night 2: write/load the call deck, add flood timing, and create three endings. Night 3: mix sound, improve legibility, and add pause/mute controls.

## 19. The Houseplant Witness Protection Program

**The app:** A nervous houseplant has been relocated under a new identity. The visitor must prepare its apartment, forge its plant paperwork, and coach it through a visit from a suspicious window cleaner.

**Build:** A point-and-click DOM room with five draggable props and a branching state machine. The plant is a frame-by-frame CSS/SVG animation with three moods; a generated illustrated room is enough for atmosphere. All writing is authored in short fragments.

**Three-night plan:** Night 1: create the room, prop placement, and plant mood logic. Night 2: add paperwork, three visitor questions, and two good/bad outcomes. Night 3: add plant sounds, idle animation, and a compact replay flow.

## 20. The Exit Interview for a Former Reality

**The app:** A reality that has just been discontinued interviews the visitor about its performance. The questions are ordinary at first—lighting, gravity, customer support—then begin changing the room, until the visitor must decide which physical law gets to survive.

**Build:** A form-driven DOM application with 10 authored questions. Each answer toggles CSS classes and small Canvas overlays: gravity rotates the interface, light changes palette, language makes labels drift, and time delays button responses. There are four deterministic endings based on answer categories.

**Three-night plan:** Night 1: create the interview interface, answer storage, and three room transformations. Night 2: add all questions, transformation combinations, and endings. Night 3: tune transitions, add voice prompts or text-only sound cues, and test every path on desktop and mobile.

## Practical asset rule

Keep each world self-contained under `src/worlds/<slug>/`: one `index.html`, one small JavaScript file, one stylesheet, and an `assets/` directory. Prefer 2D PNG/WebP/SVG assets and audio clips under a few seconds. Use Blender for pre-rendered plates or sprite sequences rather than live 3D unless the page genuinely needs WebGL. Use generated imagery and ElevenLabs for atmosphere, but make the interaction and narrative work even if every asset is replaced with simple placeholders.
