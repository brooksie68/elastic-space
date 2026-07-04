import type { LinkRule, World } from "./world";

type DriftContext = {
  season?: string;
  visitedSlugs?: string[];
  maxLinks?: number;
};

type DriftLink = {
  targetSlug: string;
  source: "fixed" | "weighted" | "mood" | "contrast" | "secret";
  reason?: string;
};

function pickWeighted<T>(items: T[], getWeight: (item: T) => number): T | null {
  const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);

  if (total <= 0) {
    return null;
  }

  let cursor = Math.random() * total;

  for (const item of items) {
    cursor -= Math.max(0, getWeight(item));
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1] ?? null;
}

function hasSharedMood(world: World, candidate: World): boolean {
  return candidate.moods.some((mood) => world.moods.includes(mood));
}

function isContrastPair(world: World, candidate: World): boolean {
  return !hasSharedMood(world, candidate);
}

function asDriftLink(rule: LinkRule, source: DriftLink["source"]): DriftLink {
  return {
    targetSlug: rule.targetSlug,
    source,
    reason: rule.reason,
  };
}

export function pickDriftLinks(
  currentWorld: World,
  allWorlds: World[],
  context: DriftContext = {},
): DriftLink[] {
  const maxLinks = context.maxLinks ?? 4;
  const visited = new Set(context.visitedSlugs ?? []);
  const liveWorlds = allWorlds.filter(
    (world) =>
      world.slug !== currentWorld.slug &&
      (world.status === "live" || world.status === "hidden") &&
      !visited.has(world.slug),
  );

  const fixed = currentWorld.exits
    .filter((rule) => rule.mode === "fixed")
    .slice(0, 1)
    .map((rule) => asDriftLink(rule, "fixed"));

  const weightedCandidates = currentWorld.exits.filter((rule) => rule.mode === "weighted");
  const weightedPick = pickWeighted(weightedCandidates, (rule) => rule.weight ?? 1);
  const weighted = weightedPick ? [asDriftLink(weightedPick, "weighted")] : [];

  const moodPool = liveWorlds.filter((world) => hasSharedMood(currentWorld, world));
  const moodPick = pickWeighted(moodPool, (world) => world.weight);
  const mood = moodPick
    ? [{ targetSlug: moodPick.slug, source: "mood" as const, reason: "shared mood" }]
    : [];

  const contrastPool = liveWorlds.filter((world) => isContrastPair(currentWorld, world));
  const contrastPick = pickWeighted(contrastPool, (world) => world.weight);
  const contrast = contrastPick
    ? [{ targetSlug: contrastPick.slug, source: "contrast" as const, reason: "contrast cut" }]
    : [];

  const secret = currentWorld.exits
    .filter(
      (rule) =>
        rule.mode === "secret" &&
        (!rule.conditions?.length ||
          rule.conditions.includes("always") ||
          (context.season && rule.conditions.includes(`season:${context.season}`))),
    )
    .slice(0, 1)
    .map((rule) => asDriftLink(rule, "secret"));

  const seen = new Set<string>();

  return [...fixed, ...weighted, ...mood, ...contrast, ...secret]
    .filter((link) => {
      if (seen.has(link.targetSlug)) {
        return false;
      }

      seen.add(link.targetSlug);
      return true;
    })
    .slice(0, maxLinks);
}
