import playerImageMapJson from "../data/player_image_map.json";

export const UNKNOWN_PLAYER_IMAGE = "/images/players/unknown-player.png";
export const NBA_CDN_HEADSHOT_BASE_URL = "https://cdn.nba.com/headshots/nba/latest/260x190";

export type PlayerImageMapEntry = {
  bref_id: string;
  imageProvider?: "nba-cdn" | "local" | string | null;
  imageUrlOverride?: string | null;
  media_score: number;
  nba_stats_id?: number | string | null;
  player: string;
  rank: number;
  slug: string;
  source: string;
};

export type PlayerImageLookupInput = {
  bref_id?: string | null;
  brefId?: string | null;
  name?: string | null;
  player?: string | null;
  playerName?: string | null;
};

type PlayerImageMap = Record<string, PlayerImageMapEntry>;

export const playerImageMap = playerImageMapJson as PlayerImageMap;

const playerImageEntries = Object.values(playerImageMap);
const playerImageBySlug = new Map(playerImageEntries.map((entry) => [entry.slug, entry]));

function stringOrNull(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value).trim();

  return text || null;
}

export function getNbaCdnHeadshotUrl(nbaStatsId: unknown) {
  const id = stringOrNull(nbaStatsId);

  return id ? `${NBA_CDN_HEADSHOT_BASE_URL}/${encodeURIComponent(id)}.png` : null;
}

function imageUrlForEntry(entry: PlayerImageMapEntry | null | undefined) {
  const override = stringOrNull(entry?.imageUrlOverride);

  if (override) {
    return override;
  }

  if (entry?.imageProvider === "nba-cdn") {
    return getNbaCdnHeadshotUrl(entry.nba_stats_id);
  }

  return null;
}

export function normalizePlayerImageSlug(playerName: unknown) {
  return String(playerName ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2018\u2019`]/g, "")
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function getPlayerImageEntryByBrefId(brefId: unknown) {
  const normalizedBrefId = stringOrNull(brefId)?.toLowerCase();

  return normalizedBrefId ? playerImageMap[normalizedBrefId] ?? null : null;
}

export function getPlayerImageEntryByName(playerName: unknown) {
  const slug = normalizePlayerImageSlug(playerName);

  return slug ? playerImageBySlug.get(slug) ?? null : null;
}

export function getPlayerImageByBrefId(brefId: unknown) {
  return imageUrlForEntry(getPlayerImageEntryByBrefId(brefId)) ?? UNKNOWN_PLAYER_IMAGE;
}

export function getPlayerImageByName(playerName: unknown) {
  return imageUrlForEntry(getPlayerImageEntryByName(playerName)) ?? UNKNOWN_PLAYER_IMAGE;
}

export function getPlayerImageForMysteryCard(player: PlayerImageLookupInput | null | undefined) {
  const brefId = stringOrNull(player?.bref_id) ?? stringOrNull(player?.brefId);
  const playerName = stringOrNull(player?.player) ?? stringOrNull(player?.name) ?? stringOrNull(player?.playerName);
  const brefImageUrl = imageUrlForEntry(getPlayerImageEntryByBrefId(brefId));

  if (brefImageUrl) {
    return brefImageUrl;
  }

  return imageUrlForEntry(getPlayerImageEntryByName(playerName)) ?? UNKNOWN_PLAYER_IMAGE;
}

export function handlePlayerImageError(event: { currentTarget: HTMLImageElement }) {
  const image = event.currentTarget;

  if (image.currentSrc.endsWith(UNKNOWN_PLAYER_IMAGE) || image.src.endsWith(UNKNOWN_PLAYER_IMAGE)) {
    image.onerror = null;
    return;
  }

  image.src = UNKNOWN_PLAYER_IMAGE;
}
