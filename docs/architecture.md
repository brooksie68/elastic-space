# architecture

## Experience Model

The site is made of `worlds` connected by `drift`, with a separate private `control` layer for administration.

### Worlds

A world is an individual page or self-contained interactive experience. It can be:

- a visual art piece
- a text fragment or interview
- a tiny game or toy
- a sound-reactive experience
- a glitch experiment
- a political intervention
- a collaborative artifact
- a hidden portal page whose main job is to redirect tone and momentum

Each world should own:

- a slug
- a title
- a creator or creators
- a short description for internal curation
- tags
- media requirements
- behavior flags
- a preferred mood profile
- a link policy
- admin metadata

World-local generated artwork should remain inside that world's folder. When an asset is generated on a removable chroma background, keep the source only when it is useful for iteration and give the alpha-ready runtime file an unambiguous name. Runtime pages must reference the processed asset, not the chroma source.

### Layered painted environments

Worlds may combine painted raster plates with DOM, Canvas, SVG, or WebGL animation. Use separate visual planes when depth matters:

- opaque terrain and architecture belong on solid painted or rendered layers
- atmospheric distance comes from blur, scale, contrast, saturation, and value
- element transparency is appropriate for clouds, mist, water, membranes, and light, but not for solid geology
- DOM stacking and CSS filters are preferable when each plate needs independent depth treatment
- Canvas should own motion and interactions that benefit from a shared frame loop, not illustration that requires painterly detail

`wildflowers-at-dusk` is the current reference for this hybrid approach: DOM-stacked mountain and hill plates sit beneath a Canvas containing rain, cloud sprites, cedar framing, and foreground plants.

### Drift

`drift` is the dynamic navigation layer. By default, every drift portal chooses a random published world when clicked. Worlds expose the portal but do not choose or name its destination.

Drift tracks each tab's session. It serves unseen worlds until the registry is exhausted, then starts a new cycle while retaining lifetime visit totals. HTTP uses `sessionStorage`; `file://` carries the same state in the destination URL.

Instead of fixed menus everywhere, the system should generate a changing graph of links based on:

- editorial curation
- randomization
- theme affinity
- contrast pairing
- recency
- seasonal events
- contributor spotlights
- hidden weights and rare routes

Direct routes are exceptional and must be intentionally authored, such as links within a sequence of pages.

### Control

`control` is the private admin layer.

It should give you:

- a true directory of every world, whether public, hidden, draft, or retired
- direct edit access to any world
- visibility into route connections, secret doors, and drift behavior
- publishing controls
- contributor review controls
- asset visibility
- the ability to override drift when needed

This is important because the public site should feel disorienting by design, while the authoring system should feel brutally clear.

### Sound

Browsers block audible autoplay until a visitor interacts with the page (or grants the site a
persistent sound permission), so every world with sound shares one control:
`src/core/sound-control.js`.

- A world loads the script and calls `ElasticSoundControl.attach({ media })` with an audio
  element, or `attach({ start, stop, setVolume })` to wrap Web Audio synthesis.
- The control renders a small speaker button fixed top right. It pulses twice on load to announce
  that the world has sound, carries a tooltip ("Turn on this world's sound"), and has distinct
  on/off icon states.
- Clicking toggles sound. While sound is on, hovering the control reveals a simple volume slider.
- On attach it makes one autoplay attempt: visitors who have allowed sound for the site (browser
  site settings, or earned media-engagement) get sound immediately; everyone else gets it on first
  click of the button.
- The root directory page tells visitors how to grant the persistent browser sound permission.

Worlds must not implement their own audio toggles or autoplay workarounds — extend the shared
control instead so behavior stays identical across the space.

## World Schema

Each world should eventually have a content file that looks conceptually like this:

```ts
type World = {
  slug: string;
  title: string;
  creators: string[];
  status: "draft" | "live" | "retired" | "hidden";
  summary: string;
  tags: string[];
  moods: string[];
  contentType: "html" | "react" | "canvas" | "video" | "audio" | "hybrid";
  entryPoints: string[];
  exits: LinkRule[];
  weight: number;
  rarity?: "common" | "uncommon" | "rare" | "mythic";
  era?: string;
  warnings?: string[];
  soundtrack?: string[];
  admin?: WorldAdmin;
};
```

The actual implementation can evolve, but the important idea is that worlds are content objects, not just loose pages.

## Navigation Model

There should be multiple kinds of movement through the site.

### 1. Embedded links

Each world can expose links inside its own design. These can be obvious, hidden, disguised, or interactive.

### 2. Drift links

The platform injects a small number of rotating outgoing routes chosen from the graph engine. These should shift over time.

### 3. Ritual doors

Some routes only appear under conditions:

- on certain dates
- after visiting a sequence of worlds
- after staying on a page for a while
- when a contributor is being featured
- when a world is freshly published

### 4. Emergency exits

Even a maze needs mercy. There should be at least one way to reorient without turning the whole thing into a boring sitemap.

## Graph Engine

The navigation system should be graph-based.

Each world is a node.
Each possible transition is an edge with metadata.

Conceptually:

```ts
type LinkRule = {
  targetSlug: string;
  mode: "fixed" | "weighted" | "conditional" | "secret";
  weight?: number;
  conditions?: string[];
  reason?: string;
};
```

At runtime, outgoing links can be selected by combining:

- hand-authored fixed edges
- weighted random edges
- adjacency by tag or mood
- contrast edges between incompatible moods
- seasonal edge packs
- rare secret edges

This lets navigation stay dynamic without becoming meaningless.

## Admin Model

The admin experience should expose a complete directory, not a watered-down version of the maze.

### Directory Views

The admin should be able to switch between:

- `all worlds`: every record in one place
- `by status`: draft, live, hidden, retired
- `by creator`
- `by tag or mood`
- `by era or event`
- `by route graph`
- `orphaned`: worlds with weak or missing inbound and outbound routes

### World Detail

Each world should have an editor view with:

- metadata
- content entry path
- asset inventory
- route definitions
- drift eligibility
- publish state
- notes
- history later on

### Route Control

You should be able to:

- inspect inbound and outbound links
- add or remove fixed routes
- adjust weighted routes
- preview secret conditions
- temporarily pin or suppress a route

### Operational Controls

The admin layer should also support:

- featuring a world
- retiring a world without deleting it
- hiding a world from drift but keeping it live by direct link
- scheduling seasonal visibility
- reviewing contributor submissions before publication

## Suggested Technical Stack

The first version should optimize for fast invention.

### App layer

- a modern web app with strong support for bespoke pages
- likely React-based unless we find a better reason not to
- routing that supports both stable URLs and dynamic exit generation

### Content layer

- file-based world definitions stored in-repo
- optional markdown or MDX for text-heavy worlds
- support for fully custom code-driven worlds

### Asset layer

- per-world folders for images, audio, video, and oddments
- strong naming conventions so the archive does not become a landfill

### Data layer

- lightweight metadata store at first
- later: a small backend or database for submissions, analytics, featured rotations, contributor profiles, and admin history

### Admin layer

- a private dashboard with a complete directory
- list and graph views of the content network
- inline editing for world metadata and route rules
- preview controls for draft and hidden worlds

## Publishing Model

The platform should support several publishing states:

- `draft`: not visible publicly
- `live`: discoverable through normal drift
- `hidden`: accessible only via direct or conditional routes
- `retired`: preserved but removed from active rotation

This is important because not every piece should be equally exposed all the time.

## Visual System

The site should not force one aesthetic across all worlds.

Instead, the shell should provide a light-touch framework:

- page bootstrapping
- asset loading
- soundtrack hooks
- transition primitives
- navigation injection points
- accessibility guardrails where practical

Inside that frame, each world can mutate freely.

## MVP

The first working version only needs:

1. a shell app
2. a registry of worlds
3. a private directory view for all worlds
4. 5 to 10 initial worlds
5. rotating drift links on each world
6. one hidden-route mechanic
7. one contributor intake path

That is enough to prove the core idea without overengineering it into taxidermy.
