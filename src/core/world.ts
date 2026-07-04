export type WorldStatus = "draft" | "live" | "retired" | "hidden";

export type WorldContentType =
  | "html"
  | "react"
  | "canvas"
  | "video"
  | "audio"
  | "hybrid";

export type WorldRarity = "common" | "uncommon" | "rare" | "mythic";

export type LinkMode = "fixed" | "weighted" | "conditional" | "secret";

export type LinkRule = {
  targetSlug: string;
  mode: LinkMode;
  weight?: number;
  conditions?: string[];
  reason?: string;
};

export type WorldBehavior = {
  autoplayAudio?: boolean;
  hideChrome?: boolean;
  injectDriftLinks?: boolean;
  allowComments?: boolean;
  allowRemixRoutes?: boolean;
};

export type WorldAdmin = {
  owner?: string;
  notes?: string;
  featured?: boolean;
  directoryOrder?: number;
  editable?: boolean;
  driftEnabled?: boolean;
  hiddenFromDirectory?: boolean;
  contentPath?: string;
  assetPaths?: string[];
};

export type World = {
  slug: string;
  title: string;
  creators: string[];
  status: WorldStatus;
  summary: string;
  tags: string[];
  moods: string[];
  contentType: WorldContentType;
  entryPoints: string[];
  exits: LinkRule[];
  weight: number;
  rarity?: WorldRarity;
  era?: string;
  warnings?: string[];
  soundtrack?: string[];
  behavior?: WorldBehavior;
  admin?: WorldAdmin;
};
