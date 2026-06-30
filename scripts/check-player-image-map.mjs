import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const GOAT_RANKINGS_PATH = path.resolve(ROOT_DIR, "..", "nba_82-0_server", "data", "br_goat_rankings.json");
const PLAYER_DATA_PATHS = [
  path.resolve(ROOT_DIR, "..", "nba_82-0_server", "data", "players_accolades_bref.json"),
  path.resolve(ROOT_DIR, "..", "nba_82-0_server", "data", "players_accolades.json"),
];
const PLAYER_IMAGE_MAP_PATH = path.resolve(ROOT_DIR, "data", "player_image_map.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJson(filePath);
}

function normalizePlayerImageSlug(playerName) {
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

function stringOrNull(value) {
  const text = value === null || value === undefined ? "" : String(value).trim();

  return text || null;
}

function numberOrNull(value) {
  const numeric = Number(value);

  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function goatRankingsFromSource(payload) {
  if (!payload || !Array.isArray(payload.rankings)) {
    throw new Error(`Expected ${GOAT_RANKINGS_PATH} to contain a rankings array.`);
  }

  return payload.rankings
    .map((ranking) => ({
      bref_id: stringOrNull(ranking.bref_id),
      media_score: Number(ranking.media_score),
      player: stringOrNull(ranking.player),
      rank: Number(ranking.rank),
    }))
    .filter(
      (ranking) =>
        ranking.player &&
        ranking.bref_id &&
        Number.isInteger(ranking.rank) &&
        ranking.rank >= 1 &&
        ranking.rank <= 100,
    )
    .sort((first, second) => first.rank - second.rank);
}

function imageUrlOverrideFromEntry(entry) {
  return stringOrNull(entry?.imageUrlOverride) || stringOrNull(entry?.imageUrl);
}

function imageProviderFromEntry(entry) {
  return stringOrNull(entry?.imageProvider);
}

function nbaStatsIdFromEntry(entry) {
  return numberOrNull(entry?.nba_stats_id);
}

function sourceFromEntry(entry) {
  return stringOrNull(entry?.source);
}

function buildNbaStatsLookup(filePaths) {
  const lookup = new Map();

  for (const filePath of filePaths) {
    const players = readJsonIfExists(filePath);

    if (!Array.isArray(players)) {
      continue;
    }

    for (const player of players) {
      const brefId = stringOrNull(player?.bref_id)?.toLowerCase();
      const nbaStatsId = numberOrNull(player?.nba_stats_id);

      if (brefId && nbaStatsId && !lookup.has(brefId)) {
        lookup.set(brefId, nbaStatsId);
      }
    }
  }

  return lookup;
}

function createGeneratedImageMap(rankings, existingMap = {}, nbaStatsLookup = new Map()) {
  const existingEntries = Object.values(existingMap).filter((entry) => entry && typeof entry === "object");
  const existingBySlug = new Map(
    existingEntries
      .map((entry) => [stringOrNull(entry.slug), entry])
      .filter(([slug]) => Boolean(slug)),
  );

  return rankings.reduce((map, ranking) => {
    const slug = normalizePlayerImageSlug(ranking.player);
    const existingEntry = existingMap[ranking.bref_id] || existingBySlug.get(slug) || {};
    const imageUrlOverride = imageUrlOverrideFromEntry(existingEntry);
    const existingNbaStatsId = nbaStatsIdFromEntry(existingEntry);
    const existingImageProvider = imageProviderFromEntry(existingEntry);
    const nbaStatsId = existingNbaStatsId || nbaStatsLookup.get(ranking.bref_id.toLowerCase()) || null;
    const imageProvider = existingImageProvider || (nbaStatsId ? "nba-cdn" : null);
    const existingHadMapping = Boolean(imageUrlOverride || existingNbaStatsId || existingImageProvider);

    map[ranking.bref_id] = {
      player: ranking.player,
      slug,
      bref_id: ranking.bref_id,
      rank: ranking.rank,
      media_score: ranking.media_score,
      nba_stats_id: nbaStatsId,
      imageProvider,
      imageUrlOverride,
      source: existingHadMapping
        ? sourceFromEntry(existingEntry) || (nbaStatsId ? "players_accolades_bref" : "manual-or-verified")
        : nbaStatsId
          ? "players_accolades_bref"
          : "unmapped",
    };

    return map;
  }, {});
}

function missingImageMappings(rankings, imageMap) {
  return rankings.filter((ranking) => {
    const slug = normalizePlayerImageSlug(ranking.player);
    const byBref = imageMap[ranking.bref_id];
    const bySlug = Object.values(imageMap).find((entry) => entry?.slug === slug);

    return !nbaStatsIdFromEntry(byBref) && !imageUrlOverrideFromEntry(byBref) &&
      !nbaStatsIdFromEntry(bySlug) && !imageUrlOverrideFromEntry(bySlug);
  });
}

function printMissingMappings(missing) {
  if (!missing.length) {
    console.log("All Top 100 player image mappings include nba_stats_id or imageUrlOverride.");
    return;
  }

  console.log(`Missing image mappings (${missing.length}):`);
  for (const ranking of missing) {
    console.log(`${ranking.rank}. ${ranking.player} - ${ranking.bref_id} - ${normalizePlayerImageSlug(ranking.player)}`);
  }
}

function main() {
  const shouldWrite = process.argv.includes("--write");
  const source = readJson(GOAT_RANKINGS_PATH);
  const rankings = goatRankingsFromSource(source);
  const existingMap = readJsonIfExists(PLAYER_IMAGE_MAP_PATH) || {};
  const nbaStatsLookup = buildNbaStatsLookup(PLAYER_DATA_PATHS);
  const imageMap = shouldWrite ? createGeneratedImageMap(rankings, existingMap, nbaStatsLookup) : existingMap;

  if (shouldWrite) {
    fs.mkdirSync(path.dirname(PLAYER_IMAGE_MAP_PATH), { recursive: true });
    fs.writeFileSync(PLAYER_IMAGE_MAP_PATH, `${JSON.stringify(imageMap, null, 2)}\n`);
    console.log(`Wrote ${rankings.length} player image candidates to ${PLAYER_IMAGE_MAP_PATH}`);
  }

  printMissingMappings(missingImageMappings(rankings, imageMap));
}

main();
