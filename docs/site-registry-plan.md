# Site Registry Plan

## Purpose

The registry is the factual memory of Elastic Space. It should let any human or coding agent arrive later and immediately answer:

- What worlds exist?
- Where is each one?
- Is it public, hidden, unfinished, or retired?
- Who or what added it, and when?
- Is it part of a section or related to other worlds?

The registry supports the private control panel. It must not dictate a public navigation system or creative style.

## Architecture

Use one manifest per world: `src/worlds/<slug>/world.json`.

The server scans those manifests and builds the registry at runtime. A future cached index may be generated for speed, but generated files are never edited by hand. This avoids a single shared registry file becoming a merge-conflict bottleneck when several agents add worlds independently.

The folder is the unit of ownership. A contributor adding sixteen worlds creates sixteen folders and sixteen manifests; it should not need to modify sixteen unrelated records elsewhere.

## Small stable schema

Required fields:

```json
{
  "schemaVersion": 1,
  "slug": "weather-vending-machine",
  "title": "Weather Vending Machine",
  "summary": "A vending machine dispenses brief and unusable weather.",
  "status": "draft",
  "entry": "index.html",
  "createdBy": "claude-code",
  "createdAt": "2026-07-01T22:10:00Z",
  "updatedAt": "2026-07-01T22:10:00Z"
}
```

Optional fields:

```json
{
  "section": "impossible-retail",
  "related": ["night-mall", "receipt-oracle"],
  "tags": ["machine", "weather", "retail"],
  "notes": "Internal context for future maintainers.",
  "batch": "claude-code-2026-07-01-night-mall"
}
```

Field meanings:

- `schemaVersion`: integer version of the manifest contract.
- `slug`: permanent, unique, lowercase kebab-case identifier matching the folder name.
- `title`: human-readable control-panel label; it need not appear publicly.
- `summary`: one plain sentence describing what the world actually is.
- `status`: `draft`, `live`, `hidden`, or `retired`.
- `entry`: relative path to the world's entry document.
- `createdBy`: stable human or tool identity, such as `brook`, `codex`, or `claude-code`.
- `createdAt` / `updatedAt`: ISO 8601 UTC timestamps.
- `section`: optional loose grouping; absence means standalone.
- `related`: optional slugs with a meaningful creative relationship. This does not automatically create public links.
- `tags`: optional internal discovery terms, not a controlled aesthetic taxonomy.
- `notes`: optional private maintenance context.
- `batch`: optional shared identifier for a set created together.

Rich behavior, route, asset, audio, warning, and curation metadata can remain as optional extensions. The registry must tolerate unknown fields so worlds can evolve without forcing every contributor to upgrade simultaneously.

## Contributor rules

1. One world folder owns one `world.json`.
2. Never reuse or rename a published slug. Retire the old record and create a new one when identity changes materially.
3. `summary` describes; it does not advertise or interpret.
4. `createdBy` identifies the actual contributor or tool. Do not overwrite it during later edits.
5. Update `updatedAt` when the world's code, assets, or manifest changes materially.
6. New work begins as `draft` unless the human request explicitly authorizes publication.
7. `hidden` means reachable intentionally but excluded from ordinary selection. `retired` means preserved but inactive.
8. Relations must reference slugs, never filesystem paths or titles.
9. Missing related worlds are warnings, not fatal errors; agents may be working in parallel.
10. Unknown optional fields are preserved. Do not delete metadata merely because your tool does not use it.
11. Registry validation must report one bad world without making every valid world disappear.
12. Do not modify another contributor's world solely to standardize formatting or taste.

## Validation

Add a script that scans all manifests and checks:

- valid JSON and supported `schemaVersion`
- required fields and allowed status values
- unique slugs matching folder names
- safe relative `entry` paths whose files exist
- valid timestamps
- `related` values formatted as slugs
- warnings for missing relations and duplicate batch metadata

Validation should produce concise, per-world errors and exit unsuccessfully when required data is invalid.

## Control-panel use

The first registry view should provide:

- all worlds, including drafts, hidden, and retired records
- filters for status, contributor, section, tag, batch, and modification date
- direct links to each world and its source folder
- a detail view showing all known and unknown metadata
- warnings for invalid manifests, missing entries, broken relations, and orphaned worlds

Batch grouping is what makes “Claude added sixteen pages last night” legible instead of alarming: the control panel can show the batch, contributor, timestamps, summaries, and validation state without assuming those pages should share a style or route structure.

## Implementation sequence

1. Define a JSON Schema for version 1 while remaining compatible with the existing manifests.
2. Add a validator and a `npm run registry:check` command.
3. Normalize the server's existing world scan into a single registry service.
4. Update existing manifests incrementally with the required provenance and timestamp fields.
5. Make the admin directory consume the normalized registry and display validation warnings.
6. Add batch, section, contributor, and date filters.
7. Later, add graph views and editing without changing the manifest's small required core.

The registry is bookkeeping, not authorship. Its job is to make creative disorder governable without making it uniform.
