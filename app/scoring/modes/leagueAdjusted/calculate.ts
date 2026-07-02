import type {
  CareerSeason,
  ClassicPointBlock,
  ClassicStatKey,
  ClassicStatLine,
  LeagueAverage,
  LeagueAverages,
  Player,
  StatsEngineConfig,
  TeamEra,
} from "../../../GameCourt";
import {
  firstNumericValue,
  leagueAverageForSeason,
  positiveNumber,
  rounded,
  seasonEndYear,
} from "../../shared";
import { STAT_MODES, type PlayerSeasonScoreResult } from "../../types";
import { LEAGUE_ADJUSTED_SCORE_CONFIG } from "./config";
import type {
  ClassicVolumeMetric,
  LeagueAdjustedScoreConfigOverrides,
  LeagueAdjustedSeasonIndex,
} from "./types";

export const CLASSIC_BASE_METRICS = ["ppg", "rpg", "apg"] as const satisfies readonly ClassicVolumeMetric[];
export const CLASSIC_DEFENSIVE_METRICS = ["spg", "bpg"] as const satisfies readonly ClassicVolumeMetric[];
export const CLASSIC_VOLUME_METRICS = [
  ...CLASSIC_BASE_METRICS,
  ...CLASSIC_DEFENSIVE_METRICS,
] as const satisfies readonly ClassicVolumeMetric[];

const GAMES_KEYS = ["games_played", "gamesPlayed", "gp", "GP"];
const MPG_KEYS = ["mpg", "MPG", "mp_per_g", "minutes_per_game", "minutesPerGame"];
const MINUTES_KEYS = ["minutes", "mp", "MP", "total_minutes", "minutes_played", "minutesPlayed"];
const PLAYER_DIRECT_STAT_KEYS: Record<ClassicStatKey, string[]> = {
  ppg: ["ppg", "PPG", "points_per_game", "pointsPerGame", "pts_per_game", "ptsPerGame"],
  rpg: ["rpg", "RPG", "rebounds_per_game", "reboundsPerGame", "reb_per_game", "rebPerGame", "trb_per_game"],
  apg: ["apg", "APG", "assists_per_game", "assistsPerGame", "ast_per_game", "astPerGame"],
  spg: ["spg", "SPG", "steals_per_game", "stealsPerGame", "stl_per_game", "stlPerGame"],
  bpg: ["bpg", "BPG", "blocks_per_game", "blocksPerGame", "blk_per_game", "blkPerGame"],
  ts_pct: ["ts_pct", "TS_PCT", "tsPct", "true_shooting_pct", "trueShootingPct", "true_shooting_percentage"],
  ws_48: ["ws_48", "WS_48", "ws_per_48", "WS_PER_48", "wsPer48", "win_shares_per_48", "winSharesPer48"],
};
const PLAYER_TOTAL_STAT_KEYS: Record<ClassicVolumeMetric, string[]> = {
  ppg: ["pts", "PTS", "points", "total_points"],
  rpg: ["reb", "REB", "trb", "TRB", "rebounds", "total_rebounds"],
  apg: ["ast", "AST", "assists", "total_assists"],
  spg: ["stl", "STL", "steals", "total_steals"],
  bpg: ["blk", "BLK", "blocks", "total_blocks"],
};
const LEAGUE_AVERAGE_KEYS: Record<ClassicVolumeMetric | "ts_pct", string[]> = {
  ppg: ["PPG", "ppg"],
  rpg: ["RPG", "rpg"],
  apg: ["APG", "apg"],
  spg: ["SPG", "spg"],
  bpg: ["BPG", "bpg"],
  ts_pct: ["league_ts_pct", "leagueTsPct", "TS_PCT", "ts_pct", "TS%", "true_shooting_pct", "trueShootingPct"],
};

function mergeConfig(overrides: LeagueAdjustedScoreConfigOverrides = {}) {
  return {
    ...LEAGUE_ADJUSTED_SCORE_CONFIG,
    ...overrides,
    volumeWeights: {
      ...LEAGUE_ADJUSTED_SCORE_CONFIG.volumeWeights,
      ...overrides.volumeWeights,
    },
  };
}

function roundWeight(value: number) {
  return Number(value.toFixed(4));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function firstPositiveNumericValue(source: Record<string, unknown> | undefined | null, keys: readonly string[]) {
  const numeric = firstNumericValue(source, keys);

  return numeric !== null && numeric > 0 ? numeric : null;
}

function resolveTsWeights(config = LEAGUE_ADJUSTED_SCORE_CONFIG) {
  const peer = clamp(Number(config.tsPeerWeight), 0, 1);

  return { peer: roundWeight(peer), skill: roundWeight(1 - peer) };
}

export function eraAdjustedTsPct(playerTs: number, leagueTs: number) {
  return playerTs + (playerTs - leagueTs);
}

export function leagueAdjustedTsHybridPct(
  playerTs: number,
  leagueTs: number,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
) {
  const config = mergeConfig(overrides);
  const tsWeights = resolveTsWeights(config);
  const adjustedTs = eraAdjustedTsPct(playerTs, leagueTs);

  return adjustedTs * tsWeights.peer + playerTs * tsWeights.skill;
}

export function leagueAdjustedPlayerMetricValue(season: CareerSeason, metric: ClassicStatKey) {
  const direct = firstNumericValue(season as Record<string, unknown>, PLAYER_DIRECT_STAT_KEYS[metric]);

  if (direct !== null) {
    return direct;
  }

  if (!isClassicVolumeMetric(metric)) {
    return null;
  }

  const total = firstNumericValue(season as Record<string, unknown>, PLAYER_TOTAL_STAT_KEYS[metric]);
  const gamesPlayed = firstPositiveNumericValue(season as Record<string, unknown>, GAMES_KEYS);

  if (total === null || !gamesPlayed) {
    return null;
  }

  return total / gamesPlayed;
}

export function leagueAdjustedMpgValue(season: CareerSeason) {
  const source = season as Record<string, unknown>;
  const direct = positiveNumber(firstNumericValue(source, MPG_KEYS));

  if (direct !== null) {
    return direct;
  }

  const minutes = positiveNumber(firstNumericValue(source, MINUTES_KEYS));
  const gamesPlayed = positiveNumber(firstNumericValue(source, GAMES_KEYS));

  return minutes !== null && gamesPlayed !== null ? minutes / gamesPlayed : null;
}

export function leagueAdjustedLeagueMetricValue(
  leagueAverage: LeagueAverage | null | undefined,
  metric: ClassicVolumeMetric | "ts_pct",
) {
  return firstPositiveNumericValue(leagueAverage, LEAGUE_AVERAGE_KEYS[metric]);
}

export function isClassicVolumeMetric(metric: ClassicStatKey): metric is ClassicVolumeMetric {
  return CLASSIC_VOLUME_METRICS.includes(metric as ClassicVolumeMetric);
}

function hasDefensiveLeagueAverages(leagueAverage: LeagueAverage | null | undefined) {
  return CLASSIC_DEFENSIVE_METRICS.every(
    (metric) => leagueAdjustedLeagueMetricValue(leagueAverage, metric) !== null,
  );
}

export function leagueAdjustedMetricWeightsForSeason(
  leagueAverage: LeagueAverage | null | undefined,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
) {
  const config = mergeConfig(overrides);

  if (!hasDefensiveLeagueAverages(leagueAverage)) {
    const totalWeight = CLASSIC_VOLUME_METRICS.reduce(
      (sum, metric) => sum + Number(config.volumeWeights[metric] || 0),
      0,
    );
    const balancedWeight = totalWeight / CLASSIC_BASE_METRICS.length;

    return Object.fromEntries(CLASSIC_BASE_METRICS.map((metric) => [metric, balancedWeight])) as Partial<
      Record<ClassicVolumeMetric, number>
    >;
  }

  return Object.fromEntries(
    CLASSIC_VOLUME_METRICS.map((metric) => [metric, Number(config.volumeWeights[metric] || 0)]),
  ) as Partial<Record<ClassicVolumeMetric, number>>;
}

export function calculateLeagueAdjustedSeasonIndex(
  season: CareerSeason,
  leagueAverage: LeagueAverage,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
): LeagueAdjustedSeasonIndex | null {
  const config = mergeConfig(overrides);
  const weights = leagueAdjustedMetricWeightsForSeason(leagueAverage, config);
  const components: Partial<Record<ClassicVolumeMetric, number>> = {};
  const playerStats: ClassicStatLine = {};
  const missingStats: string[] = [];
  let baseVolumeIndex = 0;

  for (const metric of CLASSIC_VOLUME_METRICS) {
    if (!Object.prototype.hasOwnProperty.call(weights, metric)) {
      continue;
    }

    const weight = weights[metric] ?? 0;
    const playerValue = leagueAdjustedPlayerMetricValue(season, metric);
    const leagueValue = leagueAdjustedLeagueMetricValue(leagueAverage, metric);

    playerStats[metric] = playerValue;

    if (playerValue === null || leagueValue === null) {
      missingStats.push(metric);
      return null;
    }

    const component = (playerValue / leagueValue) * weight;
    components[metric] = component;
    baseVolumeIndex += component;
  }

  let efficiencyModifier = 1;
  let tsHybridPercent: number | null = null;
  const playerTs = leagueAdjustedPlayerMetricValue(season, "ts_pct");
  const leagueTs = leagueAdjustedLeagueMetricValue(leagueAverage, "ts_pct");

  playerStats.ts_pct = playerTs;

  if (playerTs !== null && leagueTs !== null) {
    const tsHybrid = leagueAdjustedTsHybridPct(playerTs, leagueTs, config);

    if (Number.isFinite(tsHybrid)) {
      tsHybridPercent = tsHybrid * 100;
      efficiencyModifier += (tsHybrid - leagueTs) * Number(config.tsImpact || 0);
    }
  }

  const playerWs48 = leagueAdjustedPlayerMetricValue(season, "ws_48");
  playerStats.ws_48 = playerWs48;

  if (playerWs48 !== null) {
    const wsBonus = playerWs48 - config.ws48Baseline;

    if (Number.isFinite(wsBonus)) {
      efficiencyModifier += wsBonus * Number(config.wsImpact || 0);
    }
  }

  const totalIndex = baseVolumeIndex * efficiencyModifier;

  return {
    baseVolumeIndex,
    components,
    efficiencyModifier,
    impactComponent: (components.spg ?? 0) + (components.bpg ?? 0),
    missingStats,
    playerStats,
    totalIndex,
    tsHybridPercent,
    warnings: [],
  };
}

export function scoreClassicSeasonAgainstLeague(
  season: CareerSeason,
  leagueAverage: LeagueAverage,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
) {
  return calculateLeagueAdjustedSeasonIndex(season, leagueAverage, overrides)?.totalIndex ?? null;
}

export function latestLeagueAverageForMetrics(
  leagueAverages: LeagueAverages,
  metrics: readonly (ClassicVolumeMetric | "ts_pct")[],
) {
  return Object.entries(leagueAverages)
    .map(([season, leagueAverage]) => ({
      leagueAverage,
      sortValue: seasonEndYear(season) ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((a, b) => b.sortValue - a.sortValue)
    .find(({ leagueAverage }) =>
      metrics.every((metric) => leagueAdjustedLeagueMetricValue(leagueAverage, metric) !== null),
    )
    ?.leagueAverage ?? null;
}

export function leagueAdjustedMetricForSeason(
  season: CareerSeason,
  leagueAverage: LeagueAverage | null | undefined,
  targetLeagueAverage: LeagueAverage | null | undefined,
  metric: ClassicVolumeMetric,
) {
  const playerValue = leagueAdjustedPlayerMetricValue(season, metric);
  const leagueValue = leagueAdjustedLeagueMetricValue(leagueAverage, metric);
  const targetValue = leagueAdjustedLeagueMetricValue(targetLeagueAverage, metric);

  if (playerValue === null || leagueValue === null || targetValue === null) {
    return null;
  }

  const adjustedValue = (playerValue / leagueValue) * targetValue;

  return Number.isFinite(adjustedValue) ? adjustedValue : null;
}

function careerSeasonsForSelection(player: Player, selection: TeamEra) {
  const selectedEra = getCanonicalEra(selection.era);

  return (
    player.career_seasons?.filter(
      (season) => season.team === selection.team && getCanonicalEra(String(season.era || "")) === selectedEra,
    ) ?? []
  );
}

function careerSeasonsForClassicBlock(player: Player, block: ClassicPointBlock) {
  return (
    player.career_seasons?.filter(
      (season) => season.team === block.team && String(season.era || "") === block.era,
    ) ?? []
  );
}

function getCanonicalEra(era: string) {
  return era === "40's" || era === "50's" ? "60's" : era;
}

export function weightedAdjustedMetricForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  metric: ClassicVolumeMetric,
) {
  const targetLeagueAverage = latestLeagueAverageForMetrics(statsEngineConfig.leagueAverages, [metric]);

  if (!targetLeagueAverage) {
    return null;
  }

  let weightedTotal = 0;
  let weightTotal = 0;
  let sampleTotal = 0;
  let sampleCount = 0;

  for (const season of careerSeasonsForSelection(player, selection)) {
    const leagueAverage = leagueAverageForSeason(statsEngineConfig.leagueAverages, season.season);
    const adjustedValue = leagueAdjustedMetricForSeason(season, leagueAverage, targetLeagueAverage, metric);

    if (adjustedValue === null) {
      continue;
    }

    const gamesPlayed = positiveNumber(season.games_played);

    if (gamesPlayed) {
      weightedTotal += adjustedValue * gamesPlayed;
      weightTotal += gamesPlayed;
    } else {
      sampleTotal += adjustedValue;
      sampleCount += 1;
    }
  }

  if (weightTotal > 0) {
    return weightedTotal / weightTotal;
  }

  if (sampleCount > 0) {
    return sampleTotal / sampleCount;
  }

  return null;
}

export function adjustedVolumeStatsForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
): ClassicStatLine {
  return Object.fromEntries(
    CLASSIC_VOLUME_METRICS.map((metric) => [
      metric,
      weightedAdjustedMetricForSelection(player, selection, statsEngineConfig, metric),
    ]),
  ) as ClassicStatLine;
}

function leagueTsValue(leagueAverage: LeagueAverage | null) {
  return leagueAdjustedLeagueMetricValue(leagueAverage, "ts_pct");
}

export function leagueAdjustedTsHybridPercentForSeason(
  playerTs: number,
  leagueTs: number,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
) {
  const tsHybrid = leagueAdjustedTsHybridPct(playerTs, leagueTs, overrides);

  return Number.isFinite(tsHybrid) ? tsHybrid * 100 : null;
}

export function weightedTsPercentForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  valueForSeason: (playerTs: number, leagueTs: number) => number | null,
) {
  let weightedTotal = 0;
  let weightTotal = 0;
  let sampleTotal = 0;
  let sampleCount = 0;

  for (const season of careerSeasonsForSelection(player, selection)) {
    const playerTs = firstPositiveNumericValue(season as Record<string, unknown>, ["ts_pct", "TS_PCT"]);
    const leagueTs = leagueTsValue(leagueAverageForSeason(statsEngineConfig.leagueAverages, season.season));

    if (!playerTs || !leagueTs) {
      continue;
    }

    const tsPercent = valueForSeason(playerTs, leagueTs);

    if (tsPercent === null) {
      continue;
    }

    const gamesPlayed = positiveNumber(season.games_played);

    if (gamesPlayed) {
      weightedTotal += tsPercent * gamesPlayed;
      weightTotal += gamesPlayed;
    } else {
      sampleTotal += tsPercent;
      sampleCount += 1;
    }
  }

  if (weightTotal > 0) {
    return weightedTotal / weightTotal;
  }

  if (sampleCount > 0) {
    return sampleTotal / sampleCount;
  }

  return null;
}

export function weightedRawTsPercentForSelection(player: Player, selection: TeamEra) {
  let weightedTotal = 0;
  let weightTotal = 0;
  let sampleTotal = 0;
  let sampleCount = 0;

  for (const season of careerSeasonsForSelection(player, selection)) {
    const playerTs = firstPositiveNumericValue(season as Record<string, unknown>, ["ts_pct", "TS_PCT"]);

    if (!playerTs) {
      continue;
    }

    const tsPercent = playerTs * 100;
    const gamesPlayed = positiveNumber(season.games_played);

    if (gamesPlayed) {
      weightedTotal += tsPercent * gamesPlayed;
      weightTotal += gamesPlayed;
    } else {
      sampleTotal += tsPercent;
      sampleCount += 1;
    }
  }

  if (weightTotal > 0) {
    return weightedTotal / weightTotal;
  }

  if (sampleCount > 0) {
    return sampleTotal / sampleCount;
  }

  return null;
}

export function tsHybridPercentNumberForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
) {
  return weightedTsPercentForSelection(
    player,
    selection,
    statsEngineConfig,
    (playerTs, leagueTs) => leagueAdjustedTsHybridPercentForSeason(playerTs, leagueTs, overrides),
  );
}

export function calculateLeagueAdjustedStintPointsForBlock(
  player: Player,
  block: ClassicPointBlock,
  statsEngineConfig: StatsEngineConfig | undefined,
  overrides: LeagueAdjustedScoreConfigOverrides = {},
) {
  if (!statsEngineConfig?.leagueAverages || !Object.keys(statsEngineConfig.leagueAverages).length) {
    return null;
  }

  const matchingSeasons = careerSeasonsForClassicBlock(player, block);
  let indexTotal = 0;
  let scoredSeasons = 0;

  for (const season of matchingSeasons) {
    const leagueAverage = leagueAverageForSeason(statsEngineConfig.leagueAverages, season.season);

    if (!leagueAverage) {
      continue;
    }

    const index = scoreClassicSeasonAgainstLeague(season, leagueAverage, overrides);

    if (index === null) {
      continue;
    }

    indexTotal += index;
    scoredSeasons += 1;
  }

  if (!scoredSeasons) {
    return null;
  }

  return (indexTotal / scoredSeasons) * mergeConfig(overrides).stintScalingFactor;
}

function displayMetricForScore(
  season: CareerSeason,
  leagueAverage: LeagueAverage | null,
  statsEngineConfig: StatsEngineConfig | undefined,
  metric: ClassicVolumeMetric,
) {
  const targetLeagueAverage = statsEngineConfig?.leagueAverages
    ? latestLeagueAverageForMetrics(statsEngineConfig.leagueAverages, [metric])
    : null;
  const adjustedValue = leagueAdjustedMetricForSeason(season, leagueAverage, targetLeagueAverage, metric);

  return adjustedValue ?? leagueAdjustedPlayerMetricValue(season, metric);
}

export function calculateLeagueAdjustedScore({
  configOverrides = {},
  leagueAverage,
  playerSeason,
  statsEngineConfig,
}: {
  configOverrides?: LeagueAdjustedScoreConfigOverrides;
  leagueAverage?: LeagueAverage | null;
  playerSeason: CareerSeason;
  statsEngineConfig?: StatsEngineConfig;
}): PlayerSeasonScoreResult {
  const resolvedLeagueAverage =
    leagueAverage ?? leagueAverageForSeason(statsEngineConfig?.leagueAverages, playerSeason.season);
  const missingStats: string[] = [];

  if (!resolvedLeagueAverage) {
    missingStats.push("league_average");
  }

  const seasonIndex = resolvedLeagueAverage
    ? calculateLeagueAdjustedSeasonIndex(playerSeason, resolvedLeagueAverage, configOverrides)
    : null;

  if (!seasonIndex && !missingStats.length) {
    missingStats.push("league_adjusted_inputs");
  }

  const config = mergeConfig(configOverrides);
  const totalScore = seasonIndex ? rounded(seasonIndex.totalIndex * config.stintScalingFactor, 2) : 0;
  const pointsScore = (seasonIndex?.components.ppg ?? 0) * config.stintScalingFactor;
  const reboundsScore = (seasonIndex?.components.rpg ?? 0) * config.stintScalingFactor;
  const assistsScore = (seasonIndex?.components.apg ?? 0) * config.stintScalingFactor;
  const impactScore = (seasonIndex?.impactComponent ?? 0) * config.stintScalingFactor;
  const rawTsPct = leagueAdjustedPlayerMetricValue(playerSeason, "ts_pct");
  const fallbackTsHybrid = rawTsPct !== null ? rawTsPct * 100 : null;

  return {
    displayStats: {
      assists: displayMetricForScore(playerSeason, resolvedLeagueAverage, statsEngineConfig, "apg"),
      mpg: leagueAdjustedMpgValue(playerSeason),
      points: displayMetricForScore(playerSeason, resolvedLeagueAverage, statsEngineConfig, "ppg"),
      rebounds: displayMetricForScore(playerSeason, resolvedLeagueAverage, statsEngineConfig, "rpg"),
      tsHybrid: seasonIndex?.tsHybridPercent ?? fallbackTsHybrid,
      ws48: leagueAdjustedPlayerMetricValue(playerSeason, "ws_48"),
    },
    missingStats,
    mode: STAT_MODES.LEAGUE_ADJUSTED,
    score: seasonIndex ? totalScore : null,
    scoreBreakdown: {
      assistsScore: rounded(assistsScore, 4),
      efficiencyScore: rounded(totalScore - pointsScore - reboundsScore - assistsScore - impactScore, 4),
      impactScore: rounded(impactScore, 4),
      pointsScore: rounded(pointsScore, 4),
      reboundsScore: rounded(reboundsScore, 4),
      totalScore,
    },
    sourceScore: seasonIndex,
    totalScore,
    warnings: seasonIndex?.warnings ?? [],
  };
}
