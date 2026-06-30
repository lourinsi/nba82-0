import type { Achievement, CareerSeason, Player, StatsEngineConfig, TeamEra } from "../GameCourt";
import { ACHIEVEMENT_TITLE_BY_ID, RESULT_BADGE_SCORE_WEIGHT_BY_ID } from "../achievementMeta";
import { getPlayerImageForMysteryCard } from "../playerImages";
import { playerPer100AwardsScore } from "../per-100/per100GameConfig";
import {
  DEFAULT_PER100_SCORE_CONFIG,
  leagueAverageForPer100Season,
  scorePer100Season,
  seasonEndYear,
  type WeightedPer100SeasonScore,
} from "../per-100/per100Scoring";

export type MysteryDraftSettings = {
  allowDuplicatePlayers: boolean;
  maxSpins: number;
  minimumOffer: number;
  offerIncrement: number;
  randomHistoricalChance: number;
  removeOfferedStintAfterSpin: boolean;
  revealAfterPass: boolean;
  rosterSize: number;
  salaryCap: number;
  scoreToPriceMultiplier: number;
  top100Chance: number;
};

export const DEFAULT_MYSTERY_DRAFT_SETTINGS: MysteryDraftSettings = Object.freeze({
  salaryCap: 1000,
  rosterSize: 5,
  maxSpins: 15,
  minimumOffer: 1,
  offerIncrement: 1,
  top100Chance: 0.99,
  randomHistoricalChance: 0.01,
  scoreToPriceMultiplier: 1.00,
  allowDuplicatePlayers: false,
  removeOfferedStintAfterSpin: true,
  revealAfterPass: true,
});

export type MysteryDraftSettingsInput = Partial<MysteryDraftSettings>;
export type MysteryDraftStatus = "ACTIVE" | "COMPLETE";
export type MysteryDraftPoolSource = "top100" | "historical";
export type MysteryDraftOfferResultType = "ACCEPTED" | "REJECTED" | "PASSED";

export type MysteryNumberRange = {
  max: number;
  min: number;
};

export type MysteryDraftStatRanges = {
  mpg: MysteryNumberRange | null;
  per100AST: MysteryNumberRange | null;
  per100PTS: MysteryNumberRange | null;
  per100REB: MysteryNumberRange | null;
  tsPlus: MysteryNumberRange | null;
  tsStarPct: MysteryNumberRange | null;
  weightedWs48: MysteryNumberRange | null;
};

export type MysteryDraftAverageStats = {
  mpg: number | null;
  per100AST: number | null;
  per100PTS: number | null;
  per100REB: number | null;
  tsStarPct: number | null;
  weightedWs48: number | null;
};

export type MysteryDraftRawSeasonStats = {
  apg: number | null;
  mpg: number | null;
  ppg: number | null;
  rpg: number | null;
  tsPct: number | null;
  ws48: number | null;
};

export type MysteryScoredSeason = {
  accoladeScore: number;
  cardSeasonLabel: string;
  rawStats: MysteryDraftRawSeasonStats;
  reservePrice: number;
  score: number;
  seasonEndYear: number | null;
  seasonAchievements: Achievement[];
  seasonId: string;
  seasonLabel: string;
  sourceSeason: CareerSeason;
  statScore: WeightedPer100SeasonScore;
  statScoreOnly: number;
};

export type MysteryDraftPublicCard = {
  averageStats: MysteryDraftAverageStats;
  cardId: string;
  era: string;
  eraLabel: string;
  marketMax: number;
  marketMin: number;
  playerImageUrl: string | null;
  playerId: string;
  playerName: string;
  poolSource: MysteryDraftPoolSource;
  possibleAchievements: Achievement[];
  possibleSeasonLabels: string[];
  possibleYearRange: string;
  rawAverageStats: MysteryDraftAverageStats;
  rawStatRanges: MysteryDraftStatRanges;
  statRanges: MysteryDraftStatRanges;
  team: string;
};

export type MysteryDraftCard = MysteryDraftPublicCard & {
  eligibleSeasons: MysteryScoredSeason[];
  hiddenReservePrice: number;
  hiddenSeasonId: string;
  stintKey: string;
};

export type MysteryDraftRosterCard = {
  accoladeScore: number;
  cardSeasonLabel: string;
  era: string;
  eraLabel: string;
  paidPrice: number;
  playerImageUrl: string | null;
  playerId: string;
  playerName: string;
  rawStats: MysteryDraftRawSeasonStats;
  reservePrice: number;
  rosterCardId: string;
  score: number;
  seasonAchievements: Achievement[];
  seasonEndYear: number | null;
  seasonId: string;
  seasonLabel: string;
  statScore: WeightedPer100SeasonScore;
  statScoreOnly: number;
  team: string;
};

export type MysteryDraftOfferResult = {
  accepted: boolean;
  addedToRoster: boolean;
  cardLost: boolean;
  minimumNeeded: number | null;
  resultType: MysteryDraftOfferResultType;
  revealedCard: MysteryDraftRosterCard | null;
  salarySpent: number;
  userOffer: number | null;
};

export type MysteryDraftGameState = {
  acquiredPlayerIds: string[];
  acquiredPlayerNames: string[];
  currentCard: MysteryDraftCard | null;
  lastResult: MysteryDraftOfferResult | null;
  maxSpins: number;
  offeredStintKeys: string[];
  roster: MysteryDraftRosterCard[];
  rosterSize: number;
  salaryCap: number;
  salaryRemaining: number;
  settings: MysteryDraftSettings;
  spinsUsed: number;
  status: MysteryDraftStatus;
  warnings: string[];
};

type CandidateStint = {
  eligibleSeasons: MysteryScoredSeason[];
  era: string;
  eraLabel: string;
  player: Player;
  playerImageUrl: string | null;
  possibleAchievements: Achievement[];
  selection: TeamEra;
  stintKey: string;
  team: string;
};

export type MysteryDraftSpinCandidate = CandidateStint & {
  candidateId: string;
  playerId: string;
  playerName: string;
  poolSource: MysteryDraftPoolSource;
  possibleSeasonCount: number;
};

export type MysteryDraftSpinCandidateResult = {
  candidates: MysteryDraftSpinCandidate[];
  state: MysteryDraftGameState;
};

const MAX_SPIN_ATTEMPTS = 220;
const MAX_WARNING_COUNT = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rounded(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function positiveInteger(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
}

function positiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeSettings(settings: MysteryDraftSettingsInput = {}): MysteryDraftSettings {
  const top100Chance = clamp(Number(settings.top100Chance ?? DEFAULT_MYSTERY_DRAFT_SETTINGS.top100Chance), 0, 1);
  const randomHistoricalChance = clamp(
    Number(settings.randomHistoricalChance ?? DEFAULT_MYSTERY_DRAFT_SETTINGS.randomHistoricalChance),
    0,
    1,
  );

  return {
    salaryCap: positiveInteger(settings.salaryCap, DEFAULT_MYSTERY_DRAFT_SETTINGS.salaryCap),
    rosterSize: positiveInteger(settings.rosterSize, DEFAULT_MYSTERY_DRAFT_SETTINGS.rosterSize),
    maxSpins: positiveInteger(settings.maxSpins, DEFAULT_MYSTERY_DRAFT_SETTINGS.maxSpins),
    minimumOffer: positiveInteger(settings.minimumOffer, DEFAULT_MYSTERY_DRAFT_SETTINGS.minimumOffer),
    offerIncrement: positiveInteger(settings.offerIncrement, DEFAULT_MYSTERY_DRAFT_SETTINGS.offerIncrement),
    top100Chance,
    randomHistoricalChance,
    scoreToPriceMultiplier: positiveNumber(
      settings.scoreToPriceMultiplier,
      DEFAULT_MYSTERY_DRAFT_SETTINGS.scoreToPriceMultiplier,
    ),
    allowDuplicatePlayers: Boolean(settings.allowDuplicatePlayers ?? DEFAULT_MYSTERY_DRAFT_SETTINGS.allowDuplicatePlayers),
    removeOfferedStintAfterSpin: Boolean(
      settings.removeOfferedStintAfterSpin ?? DEFAULT_MYSTERY_DRAFT_SETTINGS.removeOfferedStintAfterSpin,
    ),
    revealAfterPass: Boolean(settings.revealAfterPass ?? DEFAULT_MYSTERY_DRAFT_SETTINGS.revealAfterPass),
  };
}

const RAW_POINTS_KEYS = ["ppg", "pts_per_game", "points_per_game", "PTS"];
const RAW_REBOUNDS_KEYS = ["rpg", "reb_per_game", "rebounds_per_game", "TRB"];
const RAW_ASSISTS_KEYS = ["apg", "ast_per_game", "assists_per_game", "AST"];
const RAW_MPG_KEYS = ["mpg", "mp_per_g", "minutes_per_game", "MPG"];
const RAW_MINUTES_KEYS = ["minutes", "mp", "MP", "total_minutes", "minutes_played"];
const RAW_GAMES_KEYS = ["games_played", "gamesPlayed", "g", "G", "gp", "GP"];
const RAW_TS_KEYS = ["ts_pct", "TS_PCT", "TS%", "true_shooting_pct", "trueShootingPct"];
const RAW_WS48_KEYS = ["ws_per_48", "ws_48", "WS/48", "ws48"];

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace("%", ""));

  return Number.isFinite(numeric) ? numeric : null;
}

function firstFiniteNumber(source: Record<string, unknown> | undefined | null, keys: readonly string[]) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const numeric = finiteNumber(source[key]);

    if (numeric !== null) {
      return numeric;
    }
  }

  return null;
}

function normalizedPercent(value: number | null) {
  if (value === null || value <= 0) {
    return null;
  }

  if (value <= 1) {
    return rounded(value * 100, 2);
  }

  return value <= 100 ? rounded(value, 2) : null;
}

function rawMpgForSeason(source: Record<string, unknown>) {
  const direct = firstFiniteNumber(source, RAW_MPG_KEYS);

  if (direct !== null) {
    return direct;
  }

  const minutes = firstFiniteNumber(source, RAW_MINUTES_KEYS);
  const games = firstFiniteNumber(source, RAW_GAMES_KEYS);

  return minutes !== null && games !== null && games > 0 ? minutes / games : null;
}

function rawStatsForSeason(season: CareerSeason): MysteryDraftRawSeasonStats {
  const source = season as Record<string, unknown>;

  return {
    apg: firstFiniteNumber(source, RAW_ASSISTS_KEYS),
    mpg: rawMpgForSeason(source),
    ppg: firstFiniteNumber(source, RAW_POINTS_KEYS),
    rpg: firstFiniteNumber(source, RAW_REBOUNDS_KEYS),
    tsPct: normalizedPercent(firstFiniteNumber(source, RAW_TS_KEYS)),
    ws48: firstFiniteNumber(source, RAW_WS48_KEYS),
  };
}

function appendWarnings(state: MysteryDraftGameState, warnings: string[]) {
  if (!warnings.length) {
    return state.warnings;
  }

  return [...state.warnings, ...warnings].slice(-MAX_WARNING_COUNT);
}

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomId(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  return `${prefix}-${randomUuid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function normalizeName(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeAwardDescription(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeTeamText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const AWARD_TEAM_CODE_BY_NAME: Record<string, string> = {
  "atlanta hawks": "ATL",
  "st louis hawks": "ATL",
  "milwaukee hawks": "ATL",
  "tri cities blackhawks": "ATL",
  "boston celtics": "BOS",
  "brooklyn nets": "BKN",
  "new jersey nets": "BKN",
  "new york nets": "BKN",
  "charlotte hornets": "CHA",
  "charlotte bobcats": "CHA",
  "chicago bulls": "CHI",
  "cleveland cavaliers": "CLE",
  "dallas mavericks": "DAL",
  "denver nuggets": "DEN",
  "detroit pistons": "DET",
  "fort wayne pistons": "DET",
  "golden state warriors": "GSW",
  "san francisco warriors": "GSW",
  "philadelphia warriors": "GSW",
  "houston rockets": "HOU",
  "san diego rockets": "HOU",
  "indiana pacers": "IND",
  "los angeles clippers": "LAC",
  "san diego clippers": "LAC",
  "buffalo braves": "LAC",
  "los angeles lakers": "LAL",
  "minneapolis lakers": "LAL",
  "memphis grizzlies": "MEM",
  "vancouver grizzlies": "MEM",
  "miami heat": "MIA",
  "milwaukee bucks": "MIL",
  "minnesota timberwolves": "MIN",
  "new orleans pelicans": "NOP",
  "new orleans hornets": "NOP",
  "new orleans oklahoma city hornets": "NOP",
  "new york knicks": "NYK",
  "new york knickerbockers": "NYK",
  "oklahoma city thunder": "OKC",
  "seattle supersonics": "OKC",
  "orlando magic": "ORL",
  "philadelphia 76ers": "PHI",
  "philadelphia sixers": "PHI",
  "syracuse nationals": "PHI",
  "phoenix suns": "PHX",
  "portland trail blazers": "POR",
  "portland trailblazers": "POR",
  "sacramento kings": "SAC",
  "kansas city kings": "SAC",
  "kansas city omaha kings": "SAC",
  "cincinnati royals": "SAC",
  "rochester royals": "SAC",
  "san antonio spurs": "SAS",
  "toronto raptors": "TOR",
  "utah jazz": "UTA",
  "new orleans jazz": "UTA",
  "washington wizards": "WAS",
  "washington bullets": "WAS",
  "capital bullets": "WAS",
  "baltimore bullets": "WAS",
  "chicago zephyrs": "WAS",
  "chicago packers": "WAS",
  "aba team": "ABA",
};

const AWARD_BADGE_LABEL_BY_ID: Record<string, string> = {
  "aba-all-defense": "ABA DEF",
  "aba-all-league": "ALL-ABA",
  "aba-all-star": "ABA AS",
  "aba-all-star-mvp": "ABA AS MVP",
  "aba-assists": "ABA AST",
  "aba-champ": "ABA Champ",
  "aba-mvp": "ABA MVP",
  "aba-playoffs-mvp": "ABA PMVP",
  "aba-rebounds": "ABA REB",
  "aba-roy": "ABA ROY",
  "aba-scoring": "ABA PTS",
  "all-defense": "ALL-DEF",
  "all-nba": "ALL-NBA",
  "all-rookie-1st": "Rookie 1st",
  "all-rookie-2nd": "Rookie 2nd",
  "all-star": "AS",
  "all-star-mvp": "AS MVP",
  assists: "AST Champ",
  blocks: "BLK Champ",
  dpoy: "DPOY",
  fmvp: "FMVP",
  "most-improved": "MIP",
  mvp: "MVP",
  rebounds: "REB Champ",
  "retro-fmvp": "Retro FMVP",
  rings: "Champion",
  roy: "ROY",
  scoring: "PTS Champ",
  "sixth-man": "6MOY",
  steals: "STL Champ",
  "three-point-contest": "3PT Contest",
  "three-point-title": "3PT Champ",
};

function countValue(value: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0x";
  }

  const count = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, "");

  return `${count}x`;
}

function badgeAchievement(id: string, count: number): Achievement {
  const label = AWARD_BADGE_LABEL_BY_ID[id] ?? ACHIEVEMENT_TITLE_BY_ID[id] ?? id.toUpperCase();

  return {
    id,
    label,
    scoreValue: Number(RESULT_BADGE_SCORE_WEIGHT_BY_ID[id] ?? 0) * count,
    title: ACHIEVEMENT_TITLE_BY_ID[id] || label,
    value: countValue(count),
  };
}

function achievementSortValue(achievement: Achievement) {
  if (typeof achievement.scoreValue === "number" && Number.isFinite(achievement.scoreValue)) {
    return achievement.scoreValue;
  }

  return Number(RESULT_BADGE_SCORE_WEIGHT_BY_ID[achievement.id] ?? 0);
}

function sortBadgeAchievements(achievements: Achievement[]) {
  return [...achievements].sort(
    (first, second) =>
      achievementSortValue(second) - achievementSortValue(first) ||
      first.label.localeCompare(second.label),
  );
}

function teamNumber(value: unknown) {
  const numeric = Number(String(value || "").trim());

  return Number.isFinite(numeric) ? numeric : null;
}

function isConferenceFinalsMvp(description: string) {
  return /\b(eastern|western)\s+conference\s+finals\b/.test(description);
}

function isNbaFinalsMvp(description: string) {
  return (
    description.includes("most valuable player") &&
    !isConferenceFinalsMvp(description) &&
    (/\bnba finals\b/.test(description) || description.includes("bill russell"))
  );
}

function isEstimatedFinalsMvp(description: string) {
  return (
    (description.includes("estimated") || description.includes("retro")) &&
    description.includes("finals") &&
    (description.includes("mvp") || description.includes("most valuable player"))
  );
}

function isOfficialMvp(description: string) {
  return (
    description.includes("nba most valuable player") &&
    !description.includes("finals") &&
    !description.includes("all star") &&
    !description.includes("cup") &&
    !description.includes("in season tournament") &&
    !description.includes("sporting news") &&
    !description.includes("voting") &&
    !description.includes("ladder")
  );
}

function normalizeAwardTeamCode(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const compact = raw.toUpperCase();

  if (/^[A-Z0-9]{2,4}$/.test(compact)) {
    return compact;
  }

  return AWARD_TEAM_CODE_BY_NAME[normalizeTeamText(raw)] ?? null;
}

function awardTeamCodes(award: NonNullable<Player["awards_raw"]>[number]) {
  const rawTeamValues = [
    award.original_team,
    award.team,
    award.team_name,
    award.franchise_group,
  ];
  const codes = rawTeamValues.flatMap((rawValue) =>
    String(rawValue || "")
      .split(/\s*-\s*/)
      .map((part) => normalizeAwardTeamCode(part))
      .filter((code): code is string => Boolean(code)),
  );

  return Array.from(new Set(codes));
}

function awardAppliesToSelection(award: NonNullable<Player["awards_raw"]>[number], selection: TeamEra) {
  const codes = awardTeamCodes(award);

  return codes.length === 0 || codes.includes(selection.team);
}

function badgeIdsForAward(award: NonNullable<Player["awards_raw"]>[number]) {
  const description = normalizeAwardDescription(award.description);
  const ids: string[] = [];
  const awardTeamNumber = teamNumber(award.all_nba_team_number);

  if (!description) {
    return ids;
  }

  if (description.includes("aba playoffs mvp") || description.includes("aba playoff mvp")) {
    ids.push("aba-playoffs-mvp");
  } else if (
    description.includes("aba most valuable player") &&
    !description.includes("all star") &&
    !description.includes("playoff")
  ) {
    ids.push("aba-mvp");
  }

  if (description.includes("aba all star") && description.includes("mvp")) {
    ids.push("aba-all-star-mvp");
  } else if (description.includes("aba all star")) {
    ids.push("aba-all-star");
  }

  if (description.includes("aba champion")) {
    ids.push("aba-champ");
  }

  if (description.includes("aba rookie of the year")) {
    ids.push("aba-roy");
  }

  if (description.includes("aba scoring title")) {
    ids.push("aba-scoring");
  }

  if (description.includes("aba assist title")) {
    ids.push("aba-assists");
  }

  if (description.includes("aba rebound title") || description.includes("aba rebounding title")) {
    ids.push("aba-rebounds");
  }

  if (description.includes("aba all defensive") || description.includes("aba all defense")) {
    ids.push("aba-all-defense");
  }

  if (description.includes("all aba") || description.includes("aba all league")) {
    ids.push("aba-all-league");
  }

  if (isEstimatedFinalsMvp(description)) {
    ids.push("retro-fmvp");
  } else if (isNbaFinalsMvp(description)) {
    ids.push("fmvp");
  } else if (description.includes("all star") && description.includes("most valuable player")) {
    ids.push("all-star-mvp");
  } else if (isOfficialMvp(description)) {
    ids.push("mvp");
  } else if (description.includes("defensive player of the year") && !description.includes("voting")) {
    ids.push("dpoy");
  } else if (description.includes("most improved player")) {
    ids.push("most-improved");
  } else if (description.includes("sixth man of the year")) {
    ids.push("sixth-man");
  } else if (description.includes("rookie of the year") && !description.includes("sporting news")) {
    ids.push("roy");
  } else if (description.includes("nba champion")) {
    ids.push("rings");
  } else if (/(three point|three-point|3 point|3-point).*(contest|shootout).*(winner|champion)/.test(description)) {
    ids.push("three-point-contest");
  } else if (
    description.includes("nba all star") &&
    !description.includes("most valuable player") &&
    !description.includes("three point") &&
    !description.includes("three-point") &&
    !description.includes("3 point") &&
    !description.includes("3-point") &&
    !description.includes("contest") &&
    !description.includes("shootout")
  ) {
    ids.push("all-star");
  } else if (description.includes("all nba")) {
    ids.push("all-nba");
  } else if (description.includes("all defensive team")) {
    ids.push("all-defense");
  } else if (description.includes("all rookie team")) {
    if (awardTeamNumber === 2) {
      ids.push("all-rookie-2nd");
    } else {
      ids.push("all-rookie-1st");
    }
  } else if (/(scoring title|scoring leader|points leader|points champion)/.test(description)) {
    ids.push("scoring");
  } else if (/(assist title|assist leader|assists leader|assists champion)/.test(description)) {
    ids.push("assists");
  } else if (/(rebound title|rebounding title|rebound leader|rebounds leader|rebounds champion)/.test(description)) {
    ids.push("rebounds");
  } else if (
    /(three point title|three-point title|3 point title|3-point title|three point leader|three-point leader|3 point leader|3-point leader|three point champion|three-point champion|3 point champion|3-point champion|three pointers made leader|3 pointers made leader|3pm leader|fg3m leader)/.test(
      description,
    )
  ) {
    ids.push("three-point-title");
  } else if (/(steal title|steals leader|steals champion)/.test(description)) {
    ids.push("steals");
  } else if (/(block title|blocks leader|blocks champion)/.test(description)) {
    ids.push("blocks");
  }

  return Array.from(new Set(ids));
}

function seasonAchievementsForSelection(
  player: Player,
  selection: TeamEra,
  season: CareerSeason,
) {
  const selectedSeasonEndYear = seasonEndYear(season.season);
  const counts = new Map<string, number>();

  if (!player.awards_raw?.length || typeof selectedSeasonEndYear !== "number") {
    return [];
  }

  for (const award of player.awards_raw) {
    if (seasonEndYear(award.season) !== selectedSeasonEndYear || !awardAppliesToSelection(award, selection)) {
      continue;
    }

    for (const badgeId of badgeIdsForAward(award)) {
      counts.set(badgeId, (counts.get(badgeId) ?? 0) + 1);
    }
  }

  return sortBadgeAchievements(
    Array.from(counts.entries()).map(([badgeId, count]) => badgeAchievement(badgeId, count)),
  );
}

function possibleAchievementsForSeasons(seasons: MysteryScoredSeason[]) {
  const byId = new Map<string, Achievement>();

  for (const season of seasons) {
    for (const achievement of season.seasonAchievements) {
      const existing = byId.get(achievement.id);

      if (!existing || achievementSortValue(achievement) > achievementSortValue(existing)) {
        byId.set(achievement.id, {
          ...achievement,
          value: "Possible",
        });
      }
    }
  }

  return sortBadgeAchievements(Array.from(byId.values()));
}

function getCanonicalEra(era: string) {
  return era === "40's" || era === "50's" ? "60's" : era;
}

function fullEraLabel(era: string) {
  const canonicalEra = getCanonicalEra(era);
  const decade = Number(canonicalEra.slice(0, 2));

  if (Number.isNaN(decade)) {
    return canonicalEra;
  }

  return `${decade >= 40 ? 1900 + decade : 2000 + decade}s`;
}

function decadeLabelFromSeason(season: unknown) {
  const endYear = seasonEndYear(season);

  if (!endYear || endYear < 1940) {
    return null;
  }

  const decade = Math.floor((endYear % 100) / 10) * 10;

  return `${String(decade).padStart(2, "0")}'s`;
}

function eraForCareerSeason(season: CareerSeason) {
  return getCanonicalEra(decadeLabelFromSeason(season.season) ?? String(season.era || ""));
}

function playerAlreadyAcquired(player: Player, state: MysteryDraftGameState) {
  if (state.settings.allowDuplicatePlayers) {
    return false;
  }

  return (
    state.acquiredPlayerIds.includes(player.id) ||
    state.acquiredPlayerNames.includes(normalizeName(player.name))
  );
}

function playerIsTop100(player: Player) {
  const rank = Number(player.goat_rank || 0);
  const goatScore = Number(player.goat_score || 0);

  return (rank >= 1 && rank <= 100) || goatScore > 0;
}

function playerPoolSource(settings: MysteryDraftSettings): MysteryDraftPoolSource {
  const topChance = Math.max(0, settings.top100Chance);
  const historicalChance = Math.max(0, settings.randomHistoricalChance);
  const totalChance = topChance + historicalChance;

  if (totalChance <= 0) {
    return "top100";
  }

  return Math.random() < topChance / totalChance ? "top100" : "historical";
}

function candidatePlayersForSource(
  players: Player[],
  state: MysteryDraftGameState,
  poolSource: MysteryDraftPoolSource,
) {
  return players.filter(
    (player) =>
      player.id &&
      player.name &&
      !playerAlreadyAcquired(player, state) &&
      Array.isArray(player.career_seasons) &&
      player.career_seasons.length > 0 &&
      (poolSource === "historical" || playerIsTop100(player)),
  );
}

function teamEraStintKey(playerId: string, team: string, era: string) {
  return `${playerId}:${team}:${getCanonicalEra(era)}`;
}

function seasonIdentity(player: Player, selection: TeamEra, season: CareerSeason, index: number) {
  return [
    player.id,
    selection.team,
    getCanonicalEra(selection.era),
    String(season.season ?? "season"),
    String(index),
  ].join(":");
}

function seasonLabel(season: CareerSeason) {
  return String(season.season ?? "").trim() || "Unknown season";
}

function cardSeasonLabel(season: CareerSeason) {
  return String(seasonEndYear(season.season) ?? seasonLabel(season));
}

function careerSeasonsForMysterySelection(player: Player, selection: TeamEra) {
  const selectedEra = getCanonicalEra(selection.era);

  return (
    player.career_seasons?.filter(
      (season) => season.team === selection.team && eraForCareerSeason(season) === selectedEra,
    ) ?? []
  );
}

export function calculateSeasonReservePrice(score: number, settings: MysteryDraftSettingsInput = {}) {
  const normalizedSettings = normalizeSettings(settings);

  return Math.max(0, Math.round(score * normalizedSettings.scoreToPriceMultiplier));
}

export function calculateMarketRange(scoredSeasons: MysteryScoredSeason[]) {
  const prices = scoredSeasons.map((season) => season.reservePrice).filter((price) => Number.isFinite(price));

  if (!prices.length) {
    return { marketMax: 0, marketMin: 0 };
  }

  return {
    marketMax: Math.max(...prices),
    marketMin: Math.min(...prices),
  };
}

export function resolveEligibleStintSeasons(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  settings: MysteryDraftSettingsInput = {},
) {
  const normalizedSettings = normalizeSettings(settings);
  const accoladeScore = playerPer100AwardsScore(player, selection);

  return careerSeasonsForMysterySelection(player, selection)
    .map((season, index) => {
      const statScore = scorePer100Season(
        season,
        leagueAverageForPer100Season(statsEngineConfig, season.season),
      );

      if (statScore.score === null) {
        return null;
      }

      const statScoreOnly = statScore.totalScore;
      const score = rounded(statScoreOnly + accoladeScore);

      return {
        accoladeScore,
        cardSeasonLabel: cardSeasonLabel(season),
        rawStats: rawStatsForSeason(season),
        reservePrice: calculateSeasonReservePrice(score, normalizedSettings),
        score,
        seasonEndYear: seasonEndYear(season.season),
        seasonAchievements: seasonAchievementsForSelection(player, selection, season),
        seasonId: seasonIdentity(player, selection, season, index),
        seasonLabel: seasonLabel(season),
        sourceSeason: season,
        statScore,
        statScoreOnly,
      } satisfies MysteryScoredSeason;
    })
    .filter((season): season is MysteryScoredSeason => Boolean(season))
    .sort((first, second) => {
      const firstYear = first.seasonEndYear ?? 0;
      const secondYear = second.seasonEndYear ?? 0;

      return firstYear - secondYear || first.seasonLabel.localeCompare(second.seasonLabel);
    });
}

function playerCandidateStints(
  player: Player,
  state: MysteryDraftGameState,
  statsEngineConfig: StatsEngineConfig,
) {
  const groupedSelections = new Map<string, TeamEra>();

  for (const season of player.career_seasons ?? []) {
    const team = String(season.team || "").trim();
    const era = eraForCareerSeason(season);

    if (!team || !era) {
      continue;
    }

    const key = teamEraStintKey(player.id, team, era);

    if (state.settings.removeOfferedStintAfterSpin && state.offeredStintKeys.includes(key)) {
      continue;
    }

    groupedSelections.set(key, { team, era });
  }

  return Array.from(groupedSelections.entries()).flatMap(([stintKey, selection]) => {
    const eligibleSeasons = resolveEligibleStintSeasons(
      player,
      selection,
      statsEngineConfig,
      state.settings,
    );

    if (!eligibleSeasons.length) {
      return [];
    }

    return [
      {
        eligibleSeasons,
        era: selection.era,
        eraLabel: fullEraLabel(selection.era),
        player,
        playerImageUrl: getPlayerImageForMysteryCard(player),
        possibleAchievements: possibleAchievementsForSeasons(eligibleSeasons),
        selection,
        stintKey,
        team: selection.team,
      } satisfies CandidateStint,
    ];
  });
}

function rangeFrom(values: number[], digits = 2): MysteryNumberRange | null {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (!finiteValues.length) {
    return null;
  }

  return {
    max: rounded(Math.max(...finiteValues), digits),
    min: rounded(Math.min(...finiteValues), digits),
  };
}

function averageFrom(values: Array<number | null>, digits = 2) {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!finiteValues.length) {
    return null;
  }

  return rounded(
    finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length,
    digits,
  );
}

export function weightedWs48Value(score: WeightedPer100SeasonScore) {
  return (score.weightedOWS48 + score.weightedDWS48) / DEFAULT_PER100_SCORE_CONFIG.winShareScale;
}

export function tsStarPercentValue(score: WeightedPer100SeasonScore) {
  if (!Number.isFinite(score.tsPct) || score.tsPct <= 0) {
    return null;
  }

  const leagueTs = score.tsPlus > 0 ? score.tsPct / (score.tsPlus / 100) : null;
  const tsStar =
    leagueTs && Number.isFinite(leagueTs) && leagueTs > 0
      ? score.tsPct * 0.5 + (score.tsPct + (score.tsPct - leagueTs)) * 0.5
      : score.tsPct;

  return tsStar * 100;
}

function statRangesForSeasons(seasons: MysteryScoredSeason[]): MysteryDraftStatRanges {
  return {
    mpg: rangeFrom(seasons.map((season) => season.statScore.mpg), 1),
    per100AST: rangeFrom(seasons.map((season) => season.statScore.per100AST), 1),
    per100PTS: rangeFrom(seasons.map((season) => season.statScore.per100PTS), 1),
    per100REB: rangeFrom(seasons.map((season) => season.statScore.per100REB), 1),
    tsPlus: rangeFrom(seasons.map((season) => season.statScore.tsPlus), 0),
    tsStarPct: rangeFrom(
      seasons
        .map((season) => tsStarPercentValue(season.statScore))
        .filter((value): value is number => value !== null),
      0,
    ),
    weightedWs48: rangeFrom(seasons.map((season) => weightedWs48Value(season.statScore)), 3),
  };
}

function averageStatsForSeasons(seasons: MysteryScoredSeason[]): MysteryDraftAverageStats {
  return {
    mpg: averageFrom(seasons.map((season) => season.statScore.mpg), 1),
    per100AST: averageFrom(seasons.map((season) => season.statScore.per100AST), 1),
    per100PTS: averageFrom(seasons.map((season) => season.statScore.per100PTS), 1),
    per100REB: averageFrom(seasons.map((season) => season.statScore.per100REB), 1),
    tsStarPct: averageFrom(seasons.map((season) => tsStarPercentValue(season.statScore)), 0),
    weightedWs48: averageFrom(seasons.map((season) => weightedWs48Value(season.statScore)), 3),
  };
}

function rawStatRangesForSeasons(seasons: MysteryScoredSeason[]): MysteryDraftStatRanges {
  return {
    mpg: rangeFrom(seasons.map((season) => season.rawStats.mpg ?? Number.NaN), 1),
    per100AST: rangeFrom(seasons.map((season) => season.rawStats.apg ?? Number.NaN), 1),
    per100PTS: rangeFrom(seasons.map((season) => season.rawStats.ppg ?? Number.NaN), 1),
    per100REB: rangeFrom(seasons.map((season) => season.rawStats.rpg ?? Number.NaN), 1),
    tsPlus: null,
    tsStarPct: rangeFrom(seasons.map((season) => season.rawStats.tsPct ?? Number.NaN), 0),
    weightedWs48: rangeFrom(seasons.map((season) => season.rawStats.ws48 ?? Number.NaN), 3),
  };
}

function rawAverageStatsForSeasons(seasons: MysteryScoredSeason[]): MysteryDraftAverageStats {
  return {
    mpg: averageFrom(seasons.map((season) => season.rawStats.mpg), 1),
    per100AST: averageFrom(seasons.map((season) => season.rawStats.apg), 1),
    per100PTS: averageFrom(seasons.map((season) => season.rawStats.ppg), 1),
    per100REB: averageFrom(seasons.map((season) => season.rawStats.rpg), 1),
    tsStarPct: averageFrom(seasons.map((season) => season.rawStats.tsPct), 0),
    weightedWs48: averageFrom(seasons.map((season) => season.rawStats.ws48), 3),
  };
}

function possibleYearRange(seasons: MysteryScoredSeason[]) {
  const years = seasons
    .map((season) => season.seasonEndYear)
    .filter((year): year is number => typeof year === "number" && Number.isFinite(year));

  if (!years.length) {
    return "Unknown";
  }

  const min = Math.min(...years);
  const max = Math.max(...years);

  return min === max ? String(min) : `${min}-${max}`;
}

function createCardFromStint(stint: CandidateStint, poolSource: MysteryDraftPoolSource) {
  const hiddenSeason = randomItem(stint.eligibleSeasons);
  const { marketMax, marketMin } = calculateMarketRange(stint.eligibleSeasons);

  return {
    averageStats: averageStatsForSeasons(stint.eligibleSeasons),
    cardId: randomId("mystery-card"),
    eligibleSeasons: stint.eligibleSeasons,
    era: stint.era,
    eraLabel: stint.eraLabel,
    hiddenReservePrice: hiddenSeason.reservePrice,
    hiddenSeasonId: hiddenSeason.seasonId,
    marketMax,
    marketMin,
    playerImageUrl: stint.playerImageUrl,
    playerId: stint.player.id,
    playerName: stint.player.name,
    poolSource,
    possibleAchievements: stint.possibleAchievements,
    possibleSeasonLabels: stint.eligibleSeasons.map((season) => season.seasonLabel),
    possibleYearRange: possibleYearRange(stint.eligibleSeasons),
    rawAverageStats: rawAverageStatsForSeasons(stint.eligibleSeasons),
    rawStatRanges: rawStatRangesForSeasons(stint.eligibleSeasons),
    statRanges: statRangesForSeasons(stint.eligibleSeasons),
    stintKey: stint.stintKey,
    team: stint.team,
  } satisfies MysteryDraftCard;
}

export function publicMysteryDraftCard(card: MysteryDraftCard | null): MysteryDraftPublicCard | null {
  if (!card) {
    return null;
  }

  return {
    averageStats: card.averageStats,
    cardId: card.cardId,
    era: card.era,
    eraLabel: card.eraLabel,
    marketMax: card.marketMax,
    marketMin: card.marketMin,
    playerImageUrl: card.playerImageUrl,
    playerId: card.playerId,
    playerName: card.playerName,
    poolSource: card.poolSource,
    possibleAchievements: card.possibleAchievements,
    possibleSeasonLabels: card.possibleSeasonLabels,
    possibleYearRange: card.possibleYearRange,
    rawAverageStats: card.rawAverageStats,
    rawStatRanges: card.rawStatRanges,
    statRanges: card.statRanges,
    team: card.team,
  };
}

export function createMysteryDraftGame(settings: MysteryDraftSettingsInput = {}): MysteryDraftGameState {
  const normalizedSettings = normalizeSettings(settings);

  return {
    acquiredPlayerIds: [],
    acquiredPlayerNames: [],
    currentCard: null,
    lastResult: null,
    maxSpins: normalizedSettings.maxSpins,
    offeredStintKeys: [],
    roster: [],
    rosterSize: normalizedSettings.rosterSize,
    salaryCap: normalizedSettings.salaryCap,
    salaryRemaining: normalizedSettings.salaryCap,
    settings: normalizedSettings,
    spinsUsed: 0,
    status: "ACTIVE",
    warnings: [],
  };
}

export function rosterSlotsRemaining(state: MysteryDraftGameState) {
  return Math.max(0, state.rosterSize - state.roster.length);
}

export function maxLegalOffer(state: MysteryDraftGameState) {
  const slotsRemaining = rosterSlotsRemaining(state);

  if (slotsRemaining <= 1) {
    return state.salaryRemaining;
  }

  return Math.max(0, state.salaryRemaining - (slotsRemaining - 1) * state.settings.minimumOffer);
}

export function minimumLegalOfferForCurrentCard(state: MysteryDraftGameState) {
  return Math.max(state.settings.minimumOffer, state.currentCard?.marketMin ?? state.settings.minimumOffer);
}

export function mysteryDraftFinalScore(state: MysteryDraftGameState) {
  return rounded(state.roster.reduce((sum, card) => sum + card.score, 0));
}

function stateWithStatusForRunEnd(state: MysteryDraftGameState): MysteryDraftGameState {
  if (state.roster.length >= state.rosterSize || (state.spinsUsed >= state.maxSpins && !state.currentCard)) {
    return { ...state, status: "COMPLETE" };
  }

  return state;
}

export function completeMysteryDraftGame(state: MysteryDraftGameState): MysteryDraftGameState {
  return {
    ...state,
    currentCard: null,
    status: "COMPLETE",
  };
}

function spinCandidateFromStint(
  stint: CandidateStint,
  poolSource: MysteryDraftPoolSource,
): MysteryDraftSpinCandidate {
  return {
    ...stint,
    candidateId: randomId("mystery-spin-candidate"),
    playerId: stint.player.id,
    playerName: stint.player.name,
    poolSource,
    possibleSeasonCount: stint.eligibleSeasons.length,
  };
}

export function generateSpinCandidates(
  state: MysteryDraftGameState,
  players: Player[],
  statsEngineConfig: StatsEngineConfig,
  count = 28,
): MysteryDraftSpinCandidateResult {
  if (state.status !== "ACTIVE") {
    return { candidates: [], state };
  }

  if (state.currentCard) {
    return {
      candidates: [],
      state: {
        ...state,
        warnings: appendWarnings(state, ["Resolve the current mystery card before spinning again."]),
      },
    };
  }

  if (state.spinsUsed >= state.maxSpins || state.roster.length >= state.rosterSize) {
    return { candidates: [], state: completeMysteryDraftGame(state) };
  }

  const requestedPoolSource = playerPoolSource(state.settings);
  const poolSources: MysteryDraftPoolSource[] =
    requestedPoolSource === "top100" ? ["top100", "historical"] : ["historical", "top100"];
  const warnings: string[] = [];
  const targetCount = clamp(Math.round(count), 1, 80);

  for (const poolSource of poolSources) {
    const candidates = candidatePlayersForSource(players, state, poolSource);

    if (!candidates.length) {
      warnings.push(
        poolSource === "top100"
          ? "Top 100 pool has no available eligible players for this run."
          : "Historical pool has no available eligible players for this run.",
      );
      continue;
    }

    const spinCandidates: MysteryDraftSpinCandidate[] = [];

    for (let attempt = 0; attempt < MAX_SPIN_ATTEMPTS && spinCandidates.length < targetCount; attempt += 1) {
      const player = randomItem(candidates);
      const stints = playerCandidateStints(player, state, statsEngineConfig);

      if (!stints.length) {
        continue;
      }

      spinCandidates.push(spinCandidateFromStint(randomItem(stints), poolSource));
    }

    if (spinCandidates.length) {
      return {
        candidates: spinCandidates,
        state: {
          ...state,
          lastResult: null,
          warnings: appendWarnings(state, warnings),
        },
      };
    }

    warnings.push(
      poolSource === "top100"
        ? "Skipped unavailable Top 100 entries that could not produce a scored mystery stint."
        : "Skipped unavailable historical entries that could not produce a scored mystery stint.",
    );
  }

  return {
    candidates: [],
    state: completeMysteryDraftGame({
      ...state,
      warnings: appendWarnings(state, [
        ...warnings,
        "No eligible mystery stints remain. The run has been completed.",
      ]),
    }),
  };
}

export function selectVisibleMysteryStint(
  state: MysteryDraftGameState,
  candidate: MysteryDraftSpinCandidate | null | undefined,
): MysteryDraftGameState {
  if (!candidate || state.status !== "ACTIVE") {
    return state;
  }

  if (state.currentCard) {
    return {
      ...state,
      warnings: appendWarnings(state, ["Resolve the current mystery card before spinning again."]),
    };
  }

  if (state.spinsUsed >= state.maxSpins || state.roster.length >= state.rosterSize) {
    return completeMysteryDraftGame(state);
  }

  const card = createCardFromStint(candidate, candidate.poolSource);
  const offeredStintKeys = state.settings.removeOfferedStintAfterSpin
    ? Array.from(new Set([...state.offeredStintKeys, card.stintKey]))
    : state.offeredStintKeys;

  return {
    ...state,
    currentCard: card,
    lastResult: null,
    offeredStintKeys,
    spinsUsed: state.spinsUsed + 1,
  };
}

export function spinMysteryCard(
  state: MysteryDraftGameState,
  players: Player[],
  statsEngineConfig: StatsEngineConfig,
): MysteryDraftGameState {
  const result = generateSpinCandidates(state, players, statsEngineConfig, 1);

  if (!result.candidates.length) {
    return result.state;
  }

  return selectVisibleMysteryStint(result.state, result.candidates[0]);
}

function revealedCardFromSeason(
  card: MysteryDraftCard,
  season: MysteryScoredSeason,
  paidPrice: number,
): MysteryDraftRosterCard {
  return {
    accoladeScore: season.accoladeScore,
    cardSeasonLabel: season.cardSeasonLabel,
    era: card.era,
    eraLabel: card.eraLabel,
    paidPrice,
    playerImageUrl: card.playerImageUrl,
    playerId: card.playerId,
    playerName: card.playerName,
    rawStats: season.rawStats,
    reservePrice: season.reservePrice,
    rosterCardId: randomId("mystery-roster-card"),
    score: season.score,
    seasonAchievements: season.seasonAchievements,
    seasonEndYear: season.seasonEndYear,
    seasonId: season.seasonId,
    seasonLabel: season.seasonLabel,
    statScore: season.statScore,
    statScoreOnly: season.statScoreOnly,
    team: card.team,
  };
}

function hiddenSeasonForCard(card: MysteryDraftCard) {
  return card.eligibleSeasons.find((season) => season.seasonId === card.hiddenSeasonId) ?? card.eligibleSeasons[0];
}

function offerAlignsWithIncrement(offer: number, settings: MysteryDraftSettings, minimumOffer: number) {
  const steps = (offer - minimumOffer) / settings.offerIncrement;

  return Math.abs(steps - Math.round(steps)) < 0.000001;
}

export function validateMysteryDraftOffer(state: MysteryDraftGameState, offer: number) {
  if (!state.currentCard) {
    return { message: "Spin a mystery card before making an offer.", valid: false };
  }

  if (!Number.isFinite(offer)) {
    return { message: "Enter a valid offer.", valid: false };
  }

  const minimumOffer = minimumLegalOfferForCurrentCard(state);

  if (offer < minimumOffer) {
    return { message: `Minimum offer is $${minimumOffer}.`, valid: false };
  }

  if (!offerAlignsWithIncrement(offer, state.settings, minimumOffer)) {
    return { message: `Offers must move in $${state.settings.offerIncrement} increments.`, valid: false };
  }

  if (offer > state.salaryRemaining) {
    return { message: "Offer cannot exceed salary remaining.", valid: false };
  }

  const legalMax = maxLegalOffer(state);

  if (offer > legalMax) {
    return {
      message: `Max legal offer is $${legalMax} so you can still fill the roster.`,
      valid: false,
    };
  }

  return { message: null, valid: true };
}

export function submitMysteryDraftOffer(state: MysteryDraftGameState, offer: number): MysteryDraftGameState {
  if (!state.currentCard) {
    return {
      ...state,
      warnings: appendWarnings(state, ["Spin a mystery card before submitting an offer."]),
    };
  }

  const validation = validateMysteryDraftOffer(state, offer);

  if (!validation.valid) {
    return {
      ...state,
      warnings: appendWarnings(state, [validation.message ?? "Invalid offer."]),
    };
  }

  const hiddenSeason = hiddenSeasonForCard(state.currentCard);
  const accepted = offer >= hiddenSeason.reservePrice;
  const revealedCard = revealedCardFromSeason(state.currentCard, hiddenSeason, accepted ? offer : 0);
  const roster = accepted ? [...state.roster, revealedCard] : state.roster;
  const salaryRemaining = accepted ? state.salaryRemaining - offer : state.salaryRemaining;
  const acquiredPlayerIds = accepted
    ? Array.from(new Set([...state.acquiredPlayerIds, state.currentCard.playerId]))
    : state.acquiredPlayerIds;
  const acquiredPlayerNames = accepted
    ? Array.from(new Set([...state.acquiredPlayerNames, normalizeName(state.currentCard.playerName)]))
    : state.acquiredPlayerNames;
  const nextState = {
    ...state,
    acquiredPlayerIds,
    acquiredPlayerNames,
    currentCard: null,
    lastResult: {
      accepted,
      addedToRoster: accepted,
      cardLost: !accepted,
      minimumNeeded: hiddenSeason.reservePrice,
      resultType: accepted ? "ACCEPTED" : "REJECTED",
      revealedCard,
      salarySpent: accepted ? offer : 0,
      userOffer: offer,
    } satisfies MysteryDraftOfferResult,
    roster,
    salaryRemaining,
  };

  return stateWithStatusForRunEnd(nextState);
}

export function passMysteryDraftCard(state: MysteryDraftGameState): MysteryDraftGameState {
  if (!state.currentCard) {
    return state;
  }

  const hiddenSeason = hiddenSeasonForCard(state.currentCard);
  const revealedCard = state.settings.revealAfterPass
    ? revealedCardFromSeason(state.currentCard, hiddenSeason, 0)
    : null;
  const nextState = {
    ...state,
    currentCard: null,
    lastResult: {
      accepted: false,
      addedToRoster: false,
      cardLost: true,
      minimumNeeded: state.settings.revealAfterPass ? hiddenSeason.reservePrice : null,
      resultType: "PASSED",
      revealedCard,
      salarySpent: 0,
      userOffer: null,
    } satisfies MysteryDraftOfferResult,
  };

  return stateWithStatusForRunEnd(nextState);
}
