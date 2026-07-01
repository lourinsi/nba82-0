import type { Achievement, CareerSeason, Player, Position, StatsEngineConfig, TeamEra } from "../GameCourt";
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
  activeStar: number;
  activeStarFilter: MysteryAwardFilter;
  award: number;
  awardFilter: MysteryAwardFilter;
  customEndYear: number;
  customStartYear: number;
  maxSpins: number;
  minimumOffer: number;
  offerIncrement: number;
  removeOfferedStintAfterSpin: boolean;
  revealAfterPass: boolean;
  rosterSize: number;
  salaryCap: number;
  scoreToPriceMultiplier: number;
  seasonPool: MysteryDraftSeasonPool;
  top100: number;
  wildcard: number;
};

export type MysteryDraftSeasonPool =
  | "all-time"
  | "current"
  | "2020s"
  | "2010s"
  | "2000s"
  | "1990s"
  | "1980s"
  | "1970s"
  | "1960s"
  | "1950s"
  | "custom";

export type MysteryDraftSeasonPoolOption = {
  label: string;
  value: MysteryDraftSeasonPool;
};

export type MysteryPoolBiasKey = "top100" | "award" | "activeStar" | "wildcard";
export type MysteryPoolBiasWeights = Record<MysteryPoolBiasKey, number>;

export type MysteryAwardFilter =
  | "all_star"
  | "mvp"
  | "finals_mvp"
  | "all_nba"
  | "all_defensive"
  | "dpoy"
  | "scoring_title"
  | "assist_title"
  | "rebound_title"
  | "steals_title"
  | "blocks_title"
  | "champion"
  | "roy"
  | "sixth_man"
  | "most_improved";

export type MysteryAwardFilterOption = {
  label: string;
  value: MysteryAwardFilter;
};

export const CURRENT_MYSTERY_SEASON_END_YEAR = 2026;
export const FIRST_MYSTERY_SEASON_END_YEAR = 1949;
export const MYSTERY_SEASON_POOL_OPTIONS = [
  { label: "All-Time", value: "all-time" },
  { label: "Current Season (2025-26)", value: "current" },
  { label: "2020s", value: "2020s" },
  { label: "2010s", value: "2010s" },
  { label: "2000s", value: "2000s" },
  { label: "1990s", value: "1990s" },
  { label: "1980s", value: "1980s" },
  { label: "1970s", value: "1970s" },
  { label: "1960s", value: "1960s" },
  { label: "1950s", value: "1950s" },
  { label: "Custom Range", value: "custom" },
] as const satisfies readonly MysteryDraftSeasonPoolOption[];

export const MYSTERY_POOL_BIAS_KEYS = ["top100", "award", "activeStar", "wildcard"] as const;
export const MYSTERY_AWARD_FILTER_OPTIONS = [
  { label: "All-Star", value: "all_star" },
  { label: "MVP", value: "mvp" },
  { label: "Finals MVP", value: "finals_mvp" },
  { label: "All-NBA", value: "all_nba" },
  { label: "All-Defensive", value: "all_defensive" },
  { label: "DPOY", value: "dpoy" },
  { label: "Scoring Title", value: "scoring_title" },
  { label: "Assist Title", value: "assist_title" },
  { label: "Rebound Title", value: "rebound_title" },
  { label: "Steals Title", value: "steals_title" },
  { label: "Blocks Title", value: "blocks_title" },
  { label: "Champion", value: "champion" },
  { label: "ROY", value: "roy" },
  { label: "6MOY", value: "sixth_man" },
  { label: "MIP", value: "most_improved" },
] as const satisfies readonly MysteryAwardFilterOption[];

export const ALL_TIME_MYSTERY_POOL_BIAS_DEFAULTS: MysteryPoolBiasWeights = Object.freeze({
  activeStar: 29,
  award: 0,
  top100: 70,
  wildcard: 1,
});

export const RANGE_MYSTERY_POOL_BIAS_DEFAULTS: MysteryPoolBiasWeights = Object.freeze({
  activeStar: 0,
  award: 90,
  top100: 5,
  wildcard: 5,
});

export const DEFAULT_MYSTERY_DRAFT_SETTINGS: MysteryDraftSettings = Object.freeze({
  salaryCap: 1000,
  rosterSize: 5,
  maxSpins: 15,
  minimumOffer: 1,
  offerIncrement: 1,
  top100: ALL_TIME_MYSTERY_POOL_BIAS_DEFAULTS.top100,
  award: ALL_TIME_MYSTERY_POOL_BIAS_DEFAULTS.award,
  activeStar: ALL_TIME_MYSTERY_POOL_BIAS_DEFAULTS.activeStar,
  wildcard: ALL_TIME_MYSTERY_POOL_BIAS_DEFAULTS.wildcard,
  awardFilter: "all_star",
  activeStarFilter: "all_star",
  scoreToPriceMultiplier: 1.00,
  seasonPool: "all-time",
  customStartYear: 2000,
  customEndYear: 2009,
  allowDuplicatePlayers: false,
  removeOfferedStintAfterSpin: true,
  revealAfterPass: true,
});

export type MysteryDraftSettingsInput = Partial<MysteryDraftSettings>;
export type MysteryDraftStatus = "ACTIVE" | "COMPLETE";
export type MysteryDraftPoolSource = MysteryPoolBiasKey;
export type MysteryDraftOfferResultType = "ACCEPTED" | "REJECTED" | "REJECTED_COUNTER" | "SNIPED" | "PASSED";

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
  eligiblePositions: Position[];
  primaryPosition: Position | null;
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
  eligiblePositions: Position[];
  era: string;
  eraLabel: string;
  marketMax: number;
  marketMin: number;
  playerImageUrl: string | null;
  playerId: string;
  playerName: string;
  primaryPosition: Position | null;
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
  baseScore: number;
  cardSeasonLabel: string;
  eligiblePositions: Position[];
  era: string;
  eraLabel: string;
  finalScore: number;
  paidAmount: number;
  paidPrice: number;
  playerImageUrl: string | null;
  playerId: string;
  playerName: string;
  primaryPosition: Position | null;
  rawStats: MysteryDraftRawSeasonStats;
  reservePrice: number;
  rosterCardId: string;
  score: number;
  seasonAchievements: Achievement[];
  seasonEndYear: number | null;
  seasonId: string;
  seasonLabel: string;
  scoreMultiplier: number;
  statScore: WeightedPer100SeasonScore;
  statScoreOnly: number;
  team: string;
  truePrice: number;
  wasSniped: boolean;
};

export type MysteryDraftOfferResult = {
  accepted: boolean;
  acceptedSecondOffer: boolean;
  addedToRoster: boolean;
  baseScore: number | null;
  cardLost: boolean;
  finalScore: number | null;
  label: string;
  minimumNeeded: number | null;
  paidAmount: number | null;
  resultType: MysteryDraftOfferResultType;
  revealedCard: MysteryDraftRosterCard | null;
  salarySpent: number;
  scoreMultiplier: number;
  secondOffer: number | null;
  truePrice: number | null;
  userOffer: number | null;
  wasSniped: boolean;
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
  started: boolean;
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

type MysterySeasonPredicate = (player: Player, selection: TeamEra, season: CareerSeason) => boolean;

type MysteryCandidateStintOptions = {
  ignoreSeasonPool?: boolean;
  seasonPredicate?: MysterySeasonPredicate;
};

type MysteryPlayerSeason = {
  player: Player;
  season: CareerSeason;
  selection: TeamEra;
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

const MAX_WARNING_COUNT = 5;
export const MYSTERY_LINEUP_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const satisfies readonly Position[];
export const SNIPE_SCORE_MULTIPLIER = 1.10;
export const SECOND_OFFER_CONFIG = Object.freeze({
  minimumMarkupPct: 0.05,
  distanceWeight: 1.05,
  distanceCurve: 1.9,
  maxMarkupPct: 0.75,
  roundToIncrement: 1,
});

export type MysterySecondOfferConfig = typeof SECOND_OFFER_CONFIG;
export type MysteryBidResolutionStatus = "sniped" | "accepted" | "rejected_counter";
export type MysteryBidResolution = {
  accepted: boolean;
  finalPlayerScore: number;
  label: "SNIPED!" | "Accepted" | "Rejected";
  paidAmount: number | null;
  scoreMultiplier: number;
  secondOffer: number | null;
  status: MysteryBidResolutionStatus;
  truePrice: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rounded(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

export function roundUpToIncrement(value: number, increment = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (!Number.isFinite(increment) || increment <= 0) {
    return Math.ceil(value);
  }

  return Math.ceil(value / increment) * increment;
}

export function calculateSecondOffer(
  originalOffer: number,
  truePrice: number,
  config: MysterySecondOfferConfig = SECOND_OFFER_CONFIG,
) {
  if (!Number.isFinite(originalOffer) || !Number.isFinite(truePrice)) {
    throw new Error("Invalid offer or true price");
  }

  if (truePrice <= 0) {
    return 0;
  }

  if (originalOffer >= truePrice) {
    return truePrice;
  }

  const gapRatio = Math.max(0, Math.min(1, (truePrice - originalOffer) / truePrice));
  const markupPct = config.minimumMarkupPct + config.distanceWeight * Math.pow(gapRatio, config.distanceCurve);
  const cappedMarkupPct = Math.min(markupPct, config.maxMarkupPct);
  const rawSecondOffer = truePrice * (1 + cappedMarkupPct);

  return roundUpToIncrement(rawSecondOffer, config.roundToIncrement);
}

export function resolveBid({
  originalOffer,
  playerScore,
  truePrice,
}: {
  originalOffer: number;
  playerScore: number;
  truePrice: number;
}): MysteryBidResolution {
  const basePlayerScore = Number.isFinite(playerScore) ? playerScore : 0;

  if (originalOffer === truePrice) {
    return {
      status: "sniped",
      label: "SNIPED!",
      accepted: true,
      paidAmount: originalOffer,
      truePrice,
      secondOffer: null,
      scoreMultiplier: SNIPE_SCORE_MULTIPLIER,
      finalPlayerScore: rounded(basePlayerScore * SNIPE_SCORE_MULTIPLIER),
    };
  }

  if (originalOffer > truePrice) {
    return {
      status: "accepted",
      label: "Accepted",
      accepted: true,
      paidAmount: originalOffer,
      truePrice,
      secondOffer: null,
      scoreMultiplier: 1.00,
      finalPlayerScore: basePlayerScore,
    };
  }

  const secondOffer = calculateSecondOffer(originalOffer, truePrice);

  return {
    status: "rejected_counter",
    label: "Rejected",
    accepted: false,
    paidAmount: null,
    truePrice,
    secondOffer,
    scoreMultiplier: 1.00,
    finalPlayerScore: basePlayerScore,
  };
}

function positiveInteger(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
}

function positiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function allowedSeasonPool(value: unknown): MysteryDraftSeasonPool {
  const seasonPool = String(value || "");

  return MYSTERY_SEASON_POOL_OPTIONS.some((option) => option.value === seasonPool)
    ? (seasonPool as MysteryDraftSeasonPool)
    : DEFAULT_MYSTERY_DRAFT_SETTINGS.seasonPool;
}

function allowedAwardFilter(value: unknown): MysteryAwardFilter {
  const awardFilter = String(value || "");

  return MYSTERY_AWARD_FILTER_OPTIONS.some((option) => option.value === awardFilter)
    ? (awardFilter as MysteryAwardFilter)
    : DEFAULT_MYSTERY_DRAFT_SETTINGS.awardFilter;
}

function seasonEndYearSetting(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function poolBiasNumber(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? clamp(numeric, 0, 100) : fallback;
}

export function mysteryDefaultPoolBiasForSeasonPool(pool: MysteryDraftSeasonPool): MysteryPoolBiasWeights {
  return {
    ...(pool === "all-time" ? ALL_TIME_MYSTERY_POOL_BIAS_DEFAULTS : RANGE_MYSTERY_POOL_BIAS_DEFAULTS),
  };
}

export function normalizePoolWeights(weights: Partial<MysteryPoolBiasWeights>): MysteryPoolBiasWeights {
  const total = MYSTERY_POOL_BIAS_KEYS.reduce((sum, key) => sum + poolBiasNumber(weights[key], 0), 0);

  if (total <= 0) {
    return {
      activeStar: 25,
      award: 25,
      top100: 25,
      wildcard: 25,
    };
  }

  const normalized = MYSTERY_POOL_BIAS_KEYS.reduce(
    (next, key) => ({
      ...next,
      [key]: Math.round((poolBiasNumber(weights[key], 0) / total) * 1000) / 10,
    }),
    {} as MysteryPoolBiasWeights,
  );
  const roundedTotal = MYSTERY_POOL_BIAS_KEYS.reduce((sum, key) => sum + normalized[key], 0);
  const diff = Math.round((100 - roundedTotal) * 10) / 10;

  if (diff !== 0) {
    const largestKey = MYSTERY_POOL_BIAS_KEYS.reduce((best, key) =>
      normalized[key] > normalized[best] ? key : best,
    MYSTERY_POOL_BIAS_KEYS[0]);

    normalized[largestKey] = Math.round((normalized[largestKey] + diff) * 10) / 10;
  }

  return normalized;
}

export function updateConnectedPoolWeights(
  weights: MysteryPoolBiasWeights,
  changedKey: MysteryPoolBiasKey,
  newValue: number,
): MysteryPoolBiasWeights {
  const clampedValue = clamp(newValue, 0, 100);
  const otherKeys = MYSTERY_POOL_BIAS_KEYS.filter((key) => key !== changedKey);
  const oldOtherTotal = otherKeys.reduce((sum, key) => sum + weights[key], 0);
  const newOtherTotal = 100 - clampedValue;
  const next = {
    ...weights,
    [changedKey]: clampedValue,
  };

  if (oldOtherTotal <= 0) {
    const split = newOtherTotal / otherKeys.length;

    for (const key of otherKeys) {
      next[key] = split;
    }
  } else {
    for (const key of otherKeys) {
      next[key] = (weights[key] / oldOtherTotal) * newOtherTotal;
    }
  }

  return normalizePoolWeights(next);
}

export function getCategoryCounts(weights: MysteryPoolBiasWeights, poolSize = 30): MysteryPoolBiasWeights {
  const normalizedPoolSize = clamp(Math.round(poolSize), 0, 1000);
  const positiveWeightKeys = MYSTERY_POOL_BIAS_KEYS.filter((key) => weights[key] > 0);
  const raw = MYSTERY_POOL_BIAS_KEYS.reduce(
    (next, key) => ({
      ...next,
      [key]: (weights[key] / 100) * normalizedPoolSize,
    }),
    {} as MysteryPoolBiasWeights,
  );
  const floors = MYSTERY_POOL_BIAS_KEYS.reduce(
    (next, key) => ({
      ...next,
      [key]: Math.floor(raw[key]),
    }),
    {} as MysteryPoolBiasWeights,
  );
  const used = MYSTERY_POOL_BIAS_KEYS.reduce((sum, key) => sum + floors[key], 0);
  let remaining = normalizedPoolSize - used;
  const decimals = positiveWeightKeys.map((key) => ({
    decimal: raw[key] - Math.floor(raw[key]),
    key,
  })).sort((first, second) => second.decimal - first.decimal);

  for (let index = 0; decimals.length && index < remaining; index += 1) {
    floors[decimals[index % decimals.length].key] += 1;
  }

  for (const key of MYSTERY_POOL_BIAS_KEYS) {
    if (weights[key] > 0 && floors[key] === 0 && normalizedPoolSize >= MYSTERY_POOL_BIAS_KEYS.length) {
      const donorKey = MYSTERY_POOL_BIAS_KEYS.filter((candidateKey) => candidateKey !== key).sort(
        (first, second) => floors[second] - floors[first],
      )[0];

      if (donorKey && floors[donorKey] > 1) {
        floors[donorKey] -= 1;
        floors[key] += 1;
      }
    }
  }

  let total = MYSTERY_POOL_BIAS_KEYS.reduce((sum, key) => sum + floors[key], 0);

  while (total > normalizedPoolSize) {
    const donorKey = [...MYSTERY_POOL_BIAS_KEYS].sort((first, second) => floors[second] - floors[first])[0];

    floors[donorKey] -= 1;
    total -= 1;
  }

  while (total < normalizedPoolSize) {
    const receiverKey = [...positiveWeightKeys].sort((first, second) => weights[second] - weights[first])[0];

    if (!receiverKey) {
      break;
    }

    floors[receiverKey] += 1;
    total += 1;
  }

  remaining = normalizedPoolSize - MYSTERY_POOL_BIAS_KEYS.reduce((sum, key) => sum + floors[key], 0);

  if (remaining !== 0 && weights.wildcard > 0) {
    floors.wildcard += remaining;
  }

  return floors;
}

function uniquePositions(positions: Position[]) {
  return MYSTERY_LINEUP_POSITIONS.filter((position) => positions.includes(position));
}

export function parseEligiblePositions(value: unknown): Position[] {
  if (Array.isArray(value)) {
    return uniquePositions(value.flatMap((item) => parseEligiblePositions(item)));
  }

  if (value === null || value === undefined) {
    return [];
  }

  const raw = String(value).trim();

  if (!raw) {
    return [];
  }

  const normalized = raw
    .toUpperCase()
    .replace(/POINT\s+GUARD/g, "PG")
    .replace(/SHOOTING\s+GUARD/g, "SG")
    .replace(/SMALL\s+FORWARD/g, "SF")
    .replace(/POWER\s+FORWARD/g, "PF")
    .replace(/CENTRE/g, "C")
    .replace(/CENTER/g, "C");
  const positions: Position[] = [];

  for (const match of normalized.matchAll(/\b(PG|SG|SF|PF|C)\b/g)) {
    positions.push(match[1] as Position);
  }

  if (positions.length === 0) {
    if (/\bG\b|\bGUARD\b/.test(normalized)) {
      positions.push("PG", "SG");
    }

    if (/\bF\b|\bFORWARD\b/.test(normalized)) {
      positions.push("SF", "PF");
    }
  }

  return uniquePositions(positions);
}

export function normalizePosition(value: unknown): Position | null {
  return parseEligiblePositions(value)[0] ?? null;
}

function firstPositionFromSources(sources: unknown[]) {
  for (const source of sources) {
    const position = normalizePosition(source);

    if (position) {
      return position;
    }
  }

  return null;
}

function positionsFromSources(sources: unknown[]) {
  return uniquePositions(sources.flatMap((source) => parseEligiblePositions(source)));
}

export function mysteryPositionInfoForPlayer(
  player: Player,
  season?: CareerSeason | null,
): { eligiblePositions: Position[]; primaryPosition: Position | null } {
  const playerRecord = player as Record<string, unknown>;
  const seasonRecord = (season ?? {}) as Record<string, unknown>;
  const explicitPrimaryPosition = firstPositionFromSources([
    seasonRecord.primary_position,
    seasonRecord.primaryPosition,
    seasonRecord.primary_pos,
    seasonRecord.primaryPos,
    playerRecord.primary_position,
    playerRecord.primaryPosition,
    playerRecord.primary_pos,
    playerRecord.primaryPos,
  ]);
  const parsedEligiblePositions = positionsFromSources([
    seasonRecord.positions,
    seasonRecord.position,
    seasonRecord.secondaryPositions,
    seasonRecord.secondary_positions,
    seasonRecord.pos,
    seasonRecord.bref_position,
    seasonRecord.brefPosition,
    playerRecord.positions,
    playerRecord.position,
    playerRecord.secondaryPositions,
    playerRecord.secondary_positions,
    playerRecord.pos,
    playerRecord.bref_position,
    playerRecord.brefPosition,
  ]);
  const primaryPosition = explicitPrimaryPosition ?? parsedEligiblePositions[0] ?? null;
  const eligiblePositions = primaryPosition
    ? uniquePositions([primaryPosition, ...parsedEligiblePositions])
    : parsedEligiblePositions;

  return {
    eligiblePositions: eligiblePositions.length ? eligiblePositions : [...MYSTERY_LINEUP_POSITIONS],
    primaryPosition,
  };
}

function normalizeSettings(settings: MysteryDraftSettingsInput = {}): MysteryDraftSettings {
  const settingsRecord = settings as Record<string, unknown>;
  const seasonPool = allowedSeasonPool(settings.seasonPool);
  const defaultBias = mysteryDefaultPoolBiasForSeasonPool(seasonPool);
  const legacyTop100Chance = Number(settingsRecord.top100Chance);
  const hasLegacyChance = Number.isFinite(legacyTop100Chance);
  const customStartYear = clamp(seasonEndYearSetting(
    settings.customStartYear,
    DEFAULT_MYSTERY_DRAFT_SETTINGS.customStartYear,
  ), FIRST_MYSTERY_SEASON_END_YEAR, CURRENT_MYSTERY_SEASON_END_YEAR);
  const customEndYear = clamp(seasonEndYearSetting(
    settings.customEndYear,
    DEFAULT_MYSTERY_DRAFT_SETTINGS.customEndYear,
  ), FIRST_MYSTERY_SEASON_END_YEAR, CURRENT_MYSTERY_SEASON_END_YEAR);
  const poolWeights = normalizePoolWeights({
    activeStar: poolBiasNumber(settings.activeStar, defaultBias.activeStar),
    award: poolBiasNumber(settings.award, defaultBias.award),
    top100: poolBiasNumber(
      settings.top100,
      hasLegacyChance ? clamp(legacyTop100Chance, 0, 1) * 100 : defaultBias.top100,
    ),
    wildcard: poolBiasNumber(
      settings.wildcard,
      hasLegacyChance ? (1 - clamp(legacyTop100Chance, 0, 1)) * 100 : defaultBias.wildcard,
    ),
  });

  return {
    salaryCap: positiveInteger(settings.salaryCap, DEFAULT_MYSTERY_DRAFT_SETTINGS.salaryCap),
    rosterSize: positiveInteger(settings.rosterSize, DEFAULT_MYSTERY_DRAFT_SETTINGS.rosterSize),
    maxSpins: positiveInteger(settings.maxSpins, DEFAULT_MYSTERY_DRAFT_SETTINGS.maxSpins),
    minimumOffer: positiveInteger(settings.minimumOffer, DEFAULT_MYSTERY_DRAFT_SETTINGS.minimumOffer),
    offerIncrement: positiveInteger(settings.offerIncrement, DEFAULT_MYSTERY_DRAFT_SETTINGS.offerIncrement),
    ...poolWeights,
    awardFilter: allowedAwardFilter(settings.awardFilter),
    activeStarFilter: allowedAwardFilter(settings.activeStarFilter),
    scoreToPriceMultiplier: positiveNumber(
      settings.scoreToPriceMultiplier,
      DEFAULT_MYSTERY_DRAFT_SETTINGS.scoreToPriceMultiplier,
    ),
    seasonPool,
    customStartYear: Math.min(customStartYear, customEndYear),
    customEndYear: Math.max(customStartYear, customEndYear),
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

function weightedRandomItem<T>(items: readonly T[], getWeight: (item: T) => number) {
  const weightedItems = items.map((item) => ({
    item,
    weight: Math.max(0, getWeight(item)),
  }));
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return randomItem(items);
  }

  let threshold = Math.random() * totalWeight;

  for (const weightedItem of weightedItems) {
    threshold -= weightedItem.weight;

    if (threshold <= 0) {
      return weightedItem.item;
    }
  }

  return weightedItems[weightedItems.length - 1].item;
}

function shuffled<T>(items: readonly T[]) {
  return [...items].sort(() => Math.random() - 0.5);
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
  const badgeIds = seasonAwardBadgeIdsForSelection(player, selection, season);
  const selectedSeasonEndYear = seasonEndYear(season.season);
  const counts = new Map<string, number>();

  if (typeof selectedSeasonEndYear !== "number") {
    return [];
  }

  for (const badgeId of badgeIds) {
    counts.set(badgeId, (counts.get(badgeId) ?? 0) + 1);
  }

  return sortBadgeAchievements(
    Array.from(counts.entries()).map(([badgeId, count]) => badgeAchievement(badgeId, count)),
  );
}

function seasonAwardBadgeIdsForSelection(player: Player, selection: TeamEra, season: CareerSeason) {
  const selectedSeasonEndYear = seasonEndYear(season.season);

  if (!player.awards_raw?.length || typeof selectedSeasonEndYear !== "number") {
    return [];
  }

  return player.awards_raw.flatMap((award) => {
    if (seasonEndYear(award.season) !== selectedSeasonEndYear || !awardAppliesToSelection(award, selection)) {
      return [];
    }

    return badgeIdsForAward(award);
  });
}

function seasonAwardSourceRecord(season: CareerSeason) {
  const seasonRecord = season as Record<string, unknown>;
  const awards = seasonRecord.awards;

  return awards && typeof awards === "object"
    ? { ...seasonRecord, ...(awards as Record<string, unknown>) }
    : seasonRecord;
}

function truthySeasonAwardValue(value: unknown) {
  if (value === true) {
    return true;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value || "").trim().toLowerCase();

  return normalized === "true" || normalized === "yes" || normalized === "1";
}

function seasonHasAwardField(season: CareerSeason, keys: readonly string[]) {
  const source = seasonAwardSourceRecord(season);

  return keys.some((key) => truthySeasonAwardValue(source[key]));
}

function seasonHasRankOneAwardField(season: CareerSeason, keys: readonly string[]) {
  const source = seasonAwardSourceRecord(season);

  return keys.some((key) => Number(source[key]) === 1);
}

export function seasonMatchesAwardFilter(
  player: Player,
  selection: TeamEra,
  season: CareerSeason,
  awardFilter: MysteryAwardFilter,
) {
  const badgeIds = new Set(seasonAwardBadgeIdsForSelection(player, selection, season));

  switch (awardFilter) {
    case "all_star":
      return (
        badgeIds.has("all-star") ||
        badgeIds.has("all-star-mvp") ||
        badgeIds.has("aba-all-star") ||
        badgeIds.has("aba-all-star-mvp") ||
        seasonHasAwardField(season, ["all_star", "allStar", "is_all_star", "isAllStar"])
      );

    case "mvp":
      return (
        badgeIds.has("mvp") ||
        badgeIds.has("aba-mvp") ||
        seasonHasAwardField(season, ["mvp", "most_valuable_player"]) ||
        seasonHasRankOneAwardField(season, ["mvp_rank", "mvpRank"])
      );

    case "finals_mvp":
      return (
        badgeIds.has("fmvp") ||
        badgeIds.has("retro-fmvp") ||
        badgeIds.has("aba-playoffs-mvp") ||
        seasonHasAwardField(season, ["finals_mvp", "finalsMvp", "playoffs_mvp", "playoffsMvp"])
      );

    case "all_nba":
      return (
        badgeIds.has("all-nba") ||
        badgeIds.has("aba-all-league") ||
        seasonHasAwardField(season, [
          "all_nba",
          "all_nba_1st",
          "all_nba_2nd",
          "all_nba_3rd",
          "allNba",
          "allNba1st",
          "allNba2nd",
          "allNba3rd",
          "aba_all_league_1st",
          "aba_all_league_2nd",
        ])
      );

    case "all_defensive":
      return (
        badgeIds.has("all-defense") ||
        badgeIds.has("aba-all-defense") ||
        seasonHasAwardField(season, [
          "all_defensive",
          "all_def",
          "all_def_1st",
          "all_def_2nd",
          "allDefense",
          "allDef1st",
          "allDef2nd",
          "aba_all_def_1st",
          "aba_all_def_2nd",
        ])
      );

    case "dpoy":
      return (
        badgeIds.has("dpoy") ||
        seasonHasAwardField(season, ["dpoy", "defensive_player_of_the_year"]) ||
        seasonHasRankOneAwardField(season, ["dpoy_rank", "dpoyRank"])
      );

    case "scoring_title":
      return badgeIds.has("scoring") || badgeIds.has("aba-scoring") || seasonHasAwardField(season, ["scoring_title"]);

    case "assist_title":
      return badgeIds.has("assists") || badgeIds.has("aba-assists") || seasonHasAwardField(season, ["assist_title"]);

    case "rebound_title":
      return badgeIds.has("rebounds") || badgeIds.has("aba-rebounds") || seasonHasAwardField(season, ["rebound_title"]);

    case "steals_title":
      return badgeIds.has("steals") || seasonHasAwardField(season, ["steals_title", "steal_title"]);

    case "blocks_title":
      return badgeIds.has("blocks") || seasonHasAwardField(season, ["blocks_title", "block_title"]);

    case "champion":
      return (
        badgeIds.has("rings") ||
        badgeIds.has("aba-champ") ||
        seasonHasAwardField(season, ["champion", "championship", "nba_champion", "aba_champion"])
      );

    case "roy":
      return badgeIds.has("roy") || badgeIds.has("aba-roy") || seasonHasAwardField(season, ["roy", "rookie_of_year"]);

    case "sixth_man":
      return (
        badgeIds.has("sixth-man") ||
        seasonHasAwardField(season, ["sixth_man", "sixth_man_of_the_year", "sixthMan"])
      );

    case "most_improved":
      return badgeIds.has("most-improved") || seasonHasAwardField(season, ["most_improved", "mostImproved"]);

    default:
      return false;
  }
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

export function mysterySeasonPoolLabel(pool: MysteryDraftSeasonPool) {
  return MYSTERY_SEASON_POOL_OPTIONS.find((option) => option.value === pool)?.label ?? "All-Time";
}

export function mysteryAwardFilterLabel(filter: MysteryAwardFilter) {
  return MYSTERY_AWARD_FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? "All-Star";
}

export function mysterySeasonPoolRange(settings: MysteryDraftSettingsInput = {}) {
  const normalizedSettings = normalizeSettings(settings);

  if (normalizedSettings.seasonPool === "all-time") {
    return null;
  }

  if (normalizedSettings.seasonPool === "current") {
    return {
      endYear: CURRENT_MYSTERY_SEASON_END_YEAR,
      startYear: CURRENT_MYSTERY_SEASON_END_YEAR,
    };
  }

  if (normalizedSettings.seasonPool === "custom") {
    return {
      endYear: normalizedSettings.customEndYear,
      startYear: normalizedSettings.customStartYear,
    };
  }

  const startYear = Number(normalizedSettings.seasonPool.slice(0, 4));

  return {
    endYear: Math.min(startYear + 9, CURRENT_MYSTERY_SEASON_END_YEAR),
    startYear,
  };
}

export function mysteryDraftYearsLabel(settings: MysteryDraftSettingsInput = {}) {
  const normalizedSettings = normalizeSettings(settings);
  const range = mysterySeasonPoolRange(normalizedSettings);

  if (!range) {
    return `${FIRST_MYSTERY_SEASON_END_YEAR}-${CURRENT_MYSTERY_SEASON_END_YEAR}`;
  }

  return range.startYear === range.endYear ? String(range.endYear) : `${range.startYear}-${range.endYear}`;
}

export function mysteryPoolLogicLabel(settings: MysteryDraftSettingsInput = {}) {
  const normalizedSettings = normalizeSettings(settings);

  return [
    `${normalizedSettings.top100}% Top 100`,
    `${normalizedSettings.award}% ${mysteryAwardFilterLabel(normalizedSettings.awardFilter)}`,
    `${normalizedSettings.activeStar}% Active Star`,
    `${normalizedSettings.wildcard}% Wildcard`,
  ].join(" / ");
}

export function mysteryPoolSourceLabel(poolSource: MysteryDraftPoolSource, settings: MysteryDraftSettingsInput = {}) {
  const normalizedSettings = normalizeSettings(settings);

  if (poolSource === "top100") {
    return "Top 100 Bias";
  }

  if (poolSource === "award") {
    return `${mysteryAwardFilterLabel(normalizedSettings.awardFilter)} Award Bias`;
  }

  if (poolSource === "activeStar") {
    return `Active ${mysteryAwardFilterLabel(normalizedSettings.activeStarFilter)} Injection`;
  }

  return "Wildcard Bias";
}

function careerSeasonInMysteryPool(season: CareerSeason, settings: MysteryDraftSettings) {
  const range = mysterySeasonPoolRange(settings);

  if (!range) {
    return true;
  }

  const endYear = seasonEndYear(season.season);

  return typeof endYear === "number" && endYear >= range.startYear && endYear <= range.endYear;
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

type MysterySeasonYearRange = ReturnType<typeof mysterySeasonPoolRange>;

function isSeasonInYearRange(season: CareerSeason, yearRange: MysterySeasonYearRange) {
  if (!yearRange) {
    return true;
  }

  const endYear = seasonEndYear(season.season);

  return typeof endYear === "number" && endYear >= yearRange.startYear && endYear <= yearRange.endYear;
}

function allMysteryPlayerSeasons(players: Player[]) {
  return players.flatMap((player) => {
    if (!player.id || !Array.isArray(player.career_seasons)) {
      return [];
    }

    return player.career_seasons.flatMap((season) => {
      const team = String(season.team || "").trim();
      const era = eraForCareerSeason(season);

      if (!team || !era) {
        return [];
      }

      return [
        {
          player,
          season,
          selection: { team, era },
        } satisfies MysteryPlayerSeason,
      ];
    });
  });
}

export function getAwardQualifiedPlayerIds(
  playerSeasons: MysteryPlayerSeason[],
  yearRange: MysterySeasonYearRange,
  awardFilter: MysteryAwardFilter,
) {
  const qualifiedPlayerIds = new Set<string>();

  for (const playerSeason of playerSeasons) {
    if (!isSeasonInYearRange(playerSeason.season, yearRange)) {
      continue;
    }

    if (
      seasonMatchesAwardFilter(
        playerSeason.player,
        playerSeason.selection,
        playerSeason.season,
        awardFilter,
      )
    ) {
      qualifiedPlayerIds.add(playerSeason.player.id);
    }
  }

  return qualifiedPlayerIds;
}

export function getAwardCandidates(
  playerSeasons: MysteryPlayerSeason[],
  yearRange: MysterySeasonYearRange,
  awardFilter: MysteryAwardFilter,
) {
  const qualifiedPlayerIds = getAwardQualifiedPlayerIds(playerSeasons, yearRange, awardFilter);

  return playerSeasons.filter(
    (playerSeason) =>
      isSeasonInYearRange(playerSeason.season, yearRange) &&
      qualifiedPlayerIds.has(playerSeason.player.id),
  );
}

export function getAwardCandidateWeight(
  player: Player,
  selection: TeamEra,
  season: CareerSeason,
  awardFilter: MysteryAwardFilter,
) {
  return seasonMatchesAwardFilter(player, selection, season, awardFilter) ? 2 : 1;
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

function playerIsCurrentlyActive(player: Player) {
  const playerRecord = player as Record<string, unknown>;

  if (typeof playerRecord.is_active === "boolean") {
    return playerRecord.is_active;
  }

  if (typeof playerRecord.active === "boolean") {
    return playerRecord.active;
  }

  const currentTeam = String(player.current_team || "").trim().toLowerCase();

  return Boolean(currentTeam && currentTeam !== "retired" && currentTeam !== "none" && currentTeam !== "n/a");
}

function sourceSeasonPredicate(poolSource: MysteryDraftPoolSource, settings: MysteryDraftSettings): MysterySeasonPredicate {
  if (poolSource === "activeStar") {
    return (player, selection, season) => seasonMatchesAwardFilter(player, selection, season, settings.activeStarFilter);
  }

  return () => true;
}

function playerCanContributeToSource(player: Player, state: MysteryDraftGameState, poolSource: MysteryDraftPoolSource) {
  if (
    !player.id ||
    !player.name ||
    !Array.isArray(player.career_seasons) ||
    player.career_seasons.length === 0 ||
    playerAlreadyAcquired(player, state)
  ) {
    return false;
  }

  if (poolSource === "top100") {
    return playerIsTop100(player);
  }

  if (poolSource === "activeStar") {
    return playerIsCurrentlyActive(player);
  }

  return true;
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

function careerSeasonsForMysterySelection(
  player: Player,
  selection: TeamEra,
  settings: MysteryDraftSettings,
  options: MysteryCandidateStintOptions = {},
) {
  const selectedEra = getCanonicalEra(selection.era);

  return (
    player.career_seasons?.filter(
      (season) =>
        season.team === selection.team &&
        eraForCareerSeason(season) === selectedEra &&
        (options.ignoreSeasonPool || careerSeasonInMysteryPool(season, settings)) &&
        (!options.seasonPredicate || options.seasonPredicate(player, selection, season)),
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
  options: MysteryCandidateStintOptions = {},
) {
  const normalizedSettings = normalizeSettings(settings);
  const accoladeScore = playerPer100AwardsScore(player, selection);

  return careerSeasonsForMysterySelection(player, selection, normalizedSettings, options)
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

      const positionInfo = mysteryPositionInfoForPlayer(player, season);

      return {
        accoladeScore,
        cardSeasonLabel: cardSeasonLabel(season),
        eligiblePositions: positionInfo.eligiblePositions,
        primaryPosition: positionInfo.primaryPosition,
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
  options: MysteryCandidateStintOptions = {},
) {
  const groupedSelections = new Map<string, TeamEra>();

  for (const season of player.career_seasons ?? []) {
    const team = String(season.team || "").trim();
    const era = eraForCareerSeason(season);
    const selection = { team, era };

    if (
      !team ||
      !era ||
      (!options.ignoreSeasonPool && !careerSeasonInMysteryPool(season, state.settings)) ||
      (options.seasonPredicate && !options.seasonPredicate(player, selection, season))
    ) {
      continue;
    }

    const key = teamEraStintKey(player.id, team, era);

    if (state.settings.removeOfferedStintAfterSpin && state.offeredStintKeys.includes(key)) {
      continue;
    }

    groupedSelections.set(key, selection);
  }

  return Array.from(groupedSelections.entries()).flatMap(([stintKey, selection]) => {
    const eligibleSeasons = resolveEligibleStintSeasons(
      player,
      selection,
      statsEngineConfig,
      state.settings,
      options,
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

function createCardFromStint(
  stint: CandidateStint,
  poolSource: MysteryDraftPoolSource,
  settings: MysteryDraftSettings,
) {
  const hiddenSeason =
    poolSource === "award"
      ? weightedRandomItem(stint.eligibleSeasons, (season) =>
          getAwardCandidateWeight(stint.player, stint.selection, season.sourceSeason, settings.awardFilter),
        )
      : randomItem(stint.eligibleSeasons);
  const { marketMax, marketMin } = calculateMarketRange(stint.eligibleSeasons);
  const eligiblePositions = uniquePositions(stint.eligibleSeasons.flatMap((season) => season.eligiblePositions));
  const primaryPosition = stint.eligibleSeasons.find((season) => season.primaryPosition)?.primaryPosition ?? null;

  return {
    averageStats: averageStatsForSeasons(stint.eligibleSeasons),
    cardId: randomId("mystery-card"),
    eligiblePositions,
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
    primaryPosition,
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
    eligiblePositions: card.eligiblePositions,
    era: card.era,
    eraLabel: card.eraLabel,
    marketMax: card.marketMax,
    marketMin: card.marketMin,
    playerImageUrl: card.playerImageUrl,
    playerId: card.playerId,
    playerName: card.playerName,
    primaryPosition: card.primaryPosition,
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
    started: false,
    status: "ACTIVE",
    warnings: [],
  };
}

export function startMysteryDraftGame(settings: MysteryDraftSettingsInput = {}): MysteryDraftGameState {
  return {
    ...createMysteryDraftGame(settings),
    started: true,
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
  return rounded(state.roster.reduce((sum, card) => sum + (card.finalScore ?? card.score), 0));
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

function spinCandidatesForSource(
  players: Player[],
  state: MysteryDraftGameState,
  statsEngineConfig: StatsEngineConfig,
  poolSource: MysteryDraftPoolSource,
) {
  const awardQualifiedPlayerIds =
    poolSource === "award"
      ? getAwardQualifiedPlayerIds(
          allMysteryPlayerSeasons(players),
          mysterySeasonPoolRange(state.settings),
          state.settings.awardFilter,
        )
      : null;
  const options: MysteryCandidateStintOptions = {
    ignoreSeasonPool: poolSource === "activeStar",
    seasonPredicate: sourceSeasonPredicate(poolSource, state.settings),
  };

  return shuffled(players).flatMap((player) => {
    if (!playerCanContributeToSource(player, state, poolSource)) {
      return [];
    }

    if (awardQualifiedPlayerIds && !awardQualifiedPlayerIds.has(player.id)) {
      return [];
    }

    return playerCandidateStints(player, state, statsEngineConfig, options).map((stint) =>
      spinCandidateFromStint(stint, poolSource),
    );
  });
}

function broadestSpinCandidates(
  players: Player[],
  state: MysteryDraftGameState,
  statsEngineConfig: StatsEngineConfig,
) {
  return shuffled(players).flatMap((player) => {
    if (
      !player.id ||
      !player.name ||
      !Array.isArray(player.career_seasons) ||
      player.career_seasons.length === 0 ||
      playerAlreadyAcquired(player, state)
    ) {
      return [];
    }

    return playerCandidateStints(player, state, statsEngineConfig).map((stint) =>
      spinCandidateFromStint(stint, "wildcard"),
    );
  });
}

export function generateSpinCandidates(
  state: MysteryDraftGameState,
  players: Player[],
  statsEngineConfig: StatsEngineConfig,
  count = 30,
): MysteryDraftSpinCandidateResult {
  if (!state.started || state.status !== "ACTIVE") {
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

  const warnings: string[] = [];
  const targetCount = clamp(Math.round(count), 1, 80);
  const counts = getCategoryCounts(
    {
      activeStar: state.settings.activeStar,
      award: state.settings.award,
      top100: state.settings.top100,
      wildcard: state.settings.wildcard,
    },
    targetCount,
  );
  const sourceOrder: MysteryDraftPoolSource[] = ["top100", "award", "activeStar", "wildcard"];
  const sourceCandidates = sourceOrder.reduce(
    (next, poolSource) => ({
      ...next,
      [poolSource]: spinCandidatesForSource(players, state, statsEngineConfig, poolSource),
    }),
    {} as Record<MysteryDraftPoolSource, MysteryDraftSpinCandidate[]>,
  );
  const selected: MysteryDraftSpinCandidate[] = [];
  const selectedStintKeys = new Set<string>();
  const selectedPlayerIds = new Set<string>();
  const poolWeights: MysteryPoolBiasWeights = {
    activeStar: state.settings.activeStar,
    award: state.settings.award,
    top100: state.settings.top100,
    wildcard: state.settings.wildcard,
  };

  function addFromSource(
    poolSource: MysteryDraftPoolSource,
    targetSourceCount: number,
    allowDuplicatePlayers = state.settings.allowDuplicatePlayers,
  ) {
    let added = 0;

    for (const candidate of shuffled(sourceCandidates[poolSource])) {
      if (added >= targetSourceCount) {
        break;
      }

      if (selectedStintKeys.has(candidate.stintKey)) {
        continue;
      }

      if (!allowDuplicatePlayers && selectedPlayerIds.has(candidate.playerId)) {
        continue;
      }

      selected.push(candidate);
      selectedStintKeys.add(candidate.stintKey);
      selectedPlayerIds.add(candidate.playerId);
      added += 1;
    }

    return added;
  }

  for (const poolSource of sourceOrder) {
    const targetSourceCount = counts[poolSource];

    if (targetSourceCount <= 0) {
      continue;
    }

    if (!sourceCandidates[poolSource].length) {
      warnings.push(`${mysteryPoolSourceLabel(poolSource, state.settings)} has no available eligible seasons.`);
      continue;
    }

    addFromSource(poolSource, targetSourceCount, state.settings.allowDuplicatePlayers);
  }

  for (const poolSource of sourceOrder) {
    if (poolSource === "wildcard" || poolWeights[poolSource] <= 0 || selected.length >= targetCount) {
      continue;
    }

    addFromSource(poolSource, targetCount - selected.length, state.settings.allowDuplicatePlayers);
  }

  const strictNonWildcardSource = sourceOrder.find(
    (poolSource) => poolSource !== "wildcard" && poolWeights[poolSource] >= 100,
  );
  const strictSourceStillAvailable =
    Boolean(strictNonWildcardSource) &&
    poolWeights.wildcard <= 0 &&
    selected.some((candidate) => candidate.poolSource === strictNonWildcardSource);

  let missing = targetCount - selected.length;

  if (missing > 0 && !strictSourceStillAvailable) {
    addFromSource("wildcard", missing, state.settings.allowDuplicatePlayers);
  }

  missing = targetCount - selected.length;

  if (missing > 0 && !strictSourceStillAvailable && !state.settings.allowDuplicatePlayers) {
    const duplicateFallbackSources = sourceOrder.filter(
      (poolSource) => poolSource === "wildcard" || poolWeights[poolSource] > 0,
    );

    for (const poolSource of duplicateFallbackSources) {
      if (selected.length >= targetCount) {
        break;
      }

      addFromSource(poolSource, targetCount - selected.length, true);
    }
  }

  missing = targetCount - selected.length;

  if (missing > 0 && !strictSourceStillAvailable) {
    for (const candidate of broadestSpinCandidates(players, state, statsEngineConfig)) {
      if (selected.length >= targetCount) {
        break;
      }

      if (selectedStintKeys.has(candidate.stintKey)) {
        continue;
      }

      selected.push(candidate);
      selectedStintKeys.add(candidate.stintKey);
    }
  }

  if (selected.length) {
    if (selected.length < targetCount) {
      warnings.push(`Only ${selected.length} eligible mystery candidates were available for this spin.`);
    }

    return {
      candidates: shuffled(selected).slice(0, targetCount),
      state: {
        ...state,
        lastResult: null,
        warnings: appendWarnings(state, warnings),
      },
    };
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

  const card = createCardFromStint(candidate, candidate.poolSource, state.settings);
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
  options: {
    scoreMultiplier?: number;
    truePrice?: number;
    wasSniped?: boolean;
  } = {},
): MysteryDraftRosterCard {
  const scoreMultiplier = options.scoreMultiplier ?? 1.00;
  const baseScore = season.score;
  const finalScore = rounded(baseScore * scoreMultiplier);
  const truePrice = options.truePrice ?? season.reservePrice;

  return {
    accoladeScore: season.accoladeScore,
    baseScore,
    cardSeasonLabel: season.cardSeasonLabel,
    eligiblePositions: season.eligiblePositions,
    era: card.era,
    eraLabel: card.eraLabel,
    finalScore,
    paidAmount: paidPrice,
    paidPrice,
    playerImageUrl: card.playerImageUrl,
    playerId: card.playerId,
    playerName: card.playerName,
    primaryPosition: season.primaryPosition,
    rawStats: season.rawStats,
    reservePrice: season.reservePrice,
    rosterCardId: randomId("mystery-roster-card"),
    score: finalScore,
    seasonAchievements: season.seasonAchievements,
    seasonEndYear: season.seasonEndYear,
    seasonId: season.seasonId,
    seasonLabel: season.seasonLabel,
    scoreMultiplier,
    statScore: season.statScore,
    statScoreOnly: season.statScoreOnly,
    team: card.team,
    truePrice,
    wasSniped: options.wasSniped ?? false,
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

  if (state.lastResult?.resultType === "REJECTED_COUNTER") {
    return {
      ...state,
      warnings: appendWarnings(state, ["Accept or reject the second offer before bidding again."]),
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
  const bid = resolveBid({
    originalOffer: offer,
    playerScore: hiddenSeason.score,
    truePrice: hiddenSeason.reservePrice,
  });
  const wasSniped = bid.status === "sniped";
  const accepted = bid.accepted;
  const paidAmount = bid.paidAmount ?? 0;
  const revealedCard = revealedCardFromSeason(state.currentCard, hiddenSeason, paidAmount, {
    scoreMultiplier: bid.scoreMultiplier,
    truePrice: bid.truePrice,
    wasSniped,
  });

  if (!accepted) {
    return {
      ...state,
      lastResult: {
        accepted: false,
        acceptedSecondOffer: false,
        addedToRoster: false,
        baseScore: hiddenSeason.score,
        cardLost: false,
        finalScore: hiddenSeason.score,
        label: bid.label,
        minimumNeeded: bid.truePrice,
        paidAmount: null,
        resultType: "REJECTED_COUNTER",
        revealedCard,
        salarySpent: 0,
        scoreMultiplier: bid.scoreMultiplier,
        secondOffer: bid.secondOffer,
        truePrice: bid.truePrice,
        userOffer: offer,
        wasSniped: false,
      } satisfies MysteryDraftOfferResult,
    };
  }

  const roster = [...state.roster, revealedCard];
  const salaryRemaining = state.salaryRemaining - paidAmount;
  const acquiredPlayerIds = Array.from(new Set([...state.acquiredPlayerIds, state.currentCard.playerId]));
  const acquiredPlayerNames = Array.from(new Set([...state.acquiredPlayerNames, normalizeName(state.currentCard.playerName)]));
  const nextState = {
    ...state,
    acquiredPlayerIds,
    acquiredPlayerNames,
    currentCard: null,
    lastResult: {
      accepted: true,
      acceptedSecondOffer: false,
      addedToRoster: true,
      baseScore: hiddenSeason.score,
      cardLost: false,
      finalScore: bid.finalPlayerScore,
      label: bid.label,
      minimumNeeded: bid.truePrice,
      paidAmount,
      resultType: wasSniped ? "SNIPED" : "ACCEPTED",
      revealedCard,
      salarySpent: paidAmount,
      scoreMultiplier: bid.scoreMultiplier,
      secondOffer: null,
      truePrice: bid.truePrice,
      userOffer: offer,
      wasSniped,
    } satisfies MysteryDraftOfferResult,
    roster,
    salaryRemaining,
  };

  return stateWithStatusForRunEnd(nextState);
}

export function acceptMysteryDraftSecondOffer(state: MysteryDraftGameState): MysteryDraftGameState {
  const counterResult = state.lastResult;

  if (!state.currentCard || counterResult?.resultType !== "REJECTED_COUNTER" || counterResult.secondOffer === null) {
    return {
      ...state,
      warnings: appendWarnings(state, ["No second offer is available."]),
    };
  }

  if (counterResult.secondOffer > maxLegalOffer(state)) {
    return {
      ...state,
      warnings: appendWarnings(state, ["Not enough salary cap for the second offer."]),
    };
  }

  const hiddenSeason = hiddenSeasonForCard(state.currentCard);
  const truePrice = counterResult.truePrice ?? hiddenSeason.reservePrice;
  const paidAmount = counterResult.secondOffer;
  const revealedCard = revealedCardFromSeason(state.currentCard, hiddenSeason, paidAmount, {
    scoreMultiplier: 1.00,
    truePrice,
    wasSniped: false,
  });
  const roster = [...state.roster, revealedCard];
  const salaryRemaining = state.salaryRemaining - paidAmount;
  const acquiredPlayerIds = Array.from(new Set([...state.acquiredPlayerIds, state.currentCard.playerId]));
  const acquiredPlayerNames = Array.from(new Set([...state.acquiredPlayerNames, normalizeName(state.currentCard.playerName)]));
  const nextState = {
    ...state,
    acquiredPlayerIds,
    acquiredPlayerNames,
    currentCard: null,
    lastResult: {
      ...counterResult,
      accepted: true,
      acceptedSecondOffer: true,
      addedToRoster: true,
      baseScore: hiddenSeason.score,
      cardLost: false,
      finalScore: hiddenSeason.score,
      label: "Accepted",
      minimumNeeded: truePrice,
      paidAmount,
      resultType: "ACCEPTED",
      revealedCard,
      salarySpent: paidAmount,
      scoreMultiplier: 1.00,
      secondOffer: paidAmount,
      truePrice,
      wasSniped: false,
    } satisfies MysteryDraftOfferResult,
    roster,
    salaryRemaining,
  };

  return stateWithStatusForRunEnd(nextState);
}

export function declineMysteryDraftSecondOffer(state: MysteryDraftGameState): MysteryDraftGameState {
  const counterResult = state.lastResult;

  if (!state.currentCard || counterResult?.resultType !== "REJECTED_COUNTER") {
    return state;
  }

  const nextState = {
    ...state,
    currentCard: null,
    lastResult: {
      ...counterResult,
      accepted: false,
      acceptedSecondOffer: false,
      addedToRoster: false,
      cardLost: true,
      label: "Rejected",
      paidAmount: null,
      resultType: "REJECTED",
      salarySpent: 0,
      scoreMultiplier: 1.00,
      wasSniped: false,
    } satisfies MysteryDraftOfferResult,
  };

  return stateWithStatusForRunEnd(nextState);
}

export function passMysteryDraftCard(state: MysteryDraftGameState): MysteryDraftGameState {
  if (state.lastResult?.resultType === "REJECTED_COUNTER") {
    return declineMysteryDraftSecondOffer(state);
  }

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
      acceptedSecondOffer: false,
      addedToRoster: false,
      baseScore: revealedCard?.baseScore ?? null,
      cardLost: true,
      finalScore: revealedCard?.finalScore ?? null,
      label: "Passed",
      minimumNeeded: state.settings.revealAfterPass ? hiddenSeason.reservePrice : null,
      paidAmount: null,
      resultType: "PASSED",
      revealedCard,
      salarySpent: 0,
      scoreMultiplier: 1.00,
      secondOffer: null,
      truePrice: state.settings.revealAfterPass ? hiddenSeason.reservePrice : null,
      userOffer: null,
      wasSniped: false,
    } satisfies MysteryDraftOfferResult,
  };

  return stateWithStatusForRunEnd(nextState);
}
