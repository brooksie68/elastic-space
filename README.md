# Elastic Space

Elastic Space is an explorable collection of digital environments. It is not a conventional website, a portfolio, or a content funnel. Visitors should wander, experiment, and gradually realize that the space is larger than the page where they arrived.

This README is the creative compass for humans and coding agents. Read it before adding or substantially changing a world.

## The spirit of the thing

Each page is a visual, sensory, or conceptual world with permission to establish its own rules. A world might be an animation, poem, game, fake product site, interview, instrument, field of clickable flowers, blank room, noisy machine, or something we do not yet have a category for.

There is no site-wide visual identity. The blue-green biomechanical environment is one world, not the Elastic Space brand. Its atmosphere may return or mutate, as may any other theme. Worlds can stand alone, form sections, blur into one another, disappear, and reappear much later.

Public movement through the site is usually embedded in the experience rather than placed in a toolbar. An exit might be a flower, blob, sound, gesture, object, word, animation, delay, collision, or anything else a browser can express. That list should keep expanding.

Navigation may also be conspicuously obvious when that is the interesting choice. A page containing one changing word, with each word leading somewhere distinct, belongs here. So does an inexplicable marketing site for an energy drink that does not exist. Elastic Space must not become trapped by rules about appearing unconventional.

Some interactions lead elsewhere. Others react, transform, hide, make sound, or do nothing apparent. Visitors should not always know which kind they have found.

The current entry behavior may eventually select a random world. Treat that as provisional, not doctrine.

The durable principle is **discovery without instruction**. Surprise can come from opacity, clarity, beauty, ugliness, repetition, interruption, sincerity, absurdity, or an abrupt change of genre.

## Creative rules

- Do not add shared public navigation merely to make the project easier to understand.
- Do not force a world to inherit the appearance, interaction model, or tone of another world.
- Conventional interface language is allowed when the convention itself serves the world.
- Let interactions belong to the scene whenever possible.
- Accessibility and basic browser safety still matter, even when orientation is intentionally unstable.
- Archiving every iteration is not required. Preserve an older version only when there is a specific reason to keep it.
- The private control panel should be clear, complete, and practical. Public opacity and private clarity are complementary.

## Working with other coding agents

Agents are invited to add worlds and extend existing sections. Do not normalize another contributor's work to match your own taste. Leave enough metadata that the next agent can understand what appeared, who or what added it, and how it participates in the site.

When adding a world:

1. Create a self-contained folder under `src/worlds/<slug>/`.
2. Add its page code and a valid `world.json` manifest.
3. Keep assets inside that folder unless they are intentionally shared.
4. Do not edit unrelated worlds as cleanup.
5. Run `npm run registry` after adding, removing, or renaming a world.

World-to-world exits should normally use the shared random drift system. Add
`data-drift` to a generically labeled link and load `src/core/world-registry.js`
followed by `src/core/drift.js`. Do not name or hard-code its destination.
Direct links are reserved for deliberately fixed routes such as sequences.
6. Do not hand-edit a generated registry artifact.
7. Verify the world directly and verify that the registry can discover it.

The registry contract and implementation plan live in [Site Registry Plan](C:\Users\brook\ai-projects\elastic-space\docs\site-registry-plan.md).

## Project model

- **Worlds:** individual pages or related environments.
- **Drift:** authored, random, conditional, obvious, or hidden movement between worlds.
- **Rituals:** rotation, contribution, curation, and temporary disruptions.
- **Control:** the private map room and eventual operating panel for the whole site.

Related documents:

- [Current Index: The Plasma Pool](C:\Users\brook\ai-projects\elastic-space\docs\current-index.md)
- [Architecture](C:\Users\brook\ai-projects\elastic-space\docs\architecture.md)
- [Admin](C:\Users\brook\ai-projects\elastic-space\docs\admin.md)
- [Contributions](C:\Users\brook\ai-projects\elastic-space\docs\contributions.md)
- [Manifesto](C:\Users\brook\ai-projects\elastic-space\docs\manifesto.md)

## Run locally

Run `serve-local.cmd`, then open `http://127.0.0.1:4173/`.

- Admin: `http://127.0.0.1:4173/admin/`
- Health check: `http://127.0.0.1:4173/healthz`
- Server status: `npm run local:status`
- Restart: `npm run local:restart`
- Stop: `npm run local:stop`

Use HTTP for development. The admin panel and registry API do not work fully through `file:///` URLs.

## Jerry's Pool

Jerry's Pool lives at `src/worlds/jerrys-pool/`. Its scene is primarily DOM/CSS, with a Canvas background and a PixiJS/WebGL renderer dedicated to the 330-dot current field. PixiJS is loaded from the preserved local bundle in `assets/the plasma pool — pixi_files/`; the world does not require a CDN.

Current denizen timing is maintained in `docs/denizen-frequency-rubric.md`. The detailed world architecture and performance constraints are recorded in `docs/current-index.md`.
