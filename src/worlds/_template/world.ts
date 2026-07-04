import type { World } from "../../core/world";

export const templateWorld: World = {
  slug: "replace-me",
  title: "Replace Me",
  creators: ["unknown signal"],
  status: "draft",
  summary: "A one-paragraph internal note about what this world is trying to do.",
  tags: ["art", "interactive"],
  moods: ["dark", "playful", "unstable"],
  contentType: "hybrid",
  entryPoints: ["direct", "drift"],
  exits: [
    {
      targetSlug: "somewhere-else",
      mode: "fixed",
      reason: "primary authored route",
    },
    {
      targetSlug: "rare-door",
      mode: "secret",
      conditions: ["season:halloween"],
      reason: "seasonal apparition",
    },
  ],
  weight: 5,
  rarity: "uncommon",
  era: "launch-season",
  warnings: [],
  soundtrack: [],
  behavior: {
    injectDriftLinks: true,
    allowRemixRoutes: true,
    hideChrome: false,
  },
  admin: {
    owner: "unknown signal",
    editable: true,
    driftEnabled: true,
    hiddenFromDirectory: false,
    contentPath: "src/worlds/replace-me",
    assetPaths: [],
    notes: "Replace with real editorial notes.",
  },
};
