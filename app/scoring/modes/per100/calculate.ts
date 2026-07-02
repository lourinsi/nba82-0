import type { CareerSeason, LeagueAverage, StatsEngineConfig } from "../../../GameCourt";
import {
  leagueAverageForPer100Season,
  scorePer100Season,
  type WeightedPer100SeasonScore,
} from "../../../per-100/per100Scoring";
import { STAT_MODES, type PlayerSeasonScoreResult } from "../../types";
import { PER100_SCORE_CONFIG } from "./config";
import type { Per100ScoreConfigOverrides } from "./types";

export function per100WeightedWs48Value(score: WeightedPer100SeasonScore) {
  return (score.weightedOWS48 + score.weightedDWS48) / PER100_SCORE_CONFIG.winShareScale;
}

export function per100TsHybridPercentValue(score: WeightedPer100SeasonScore) {
  if (!Number.isFinite(score.tsPct) || score.tsPct <= 0) {
    return null;
  }

  const leagueTs = score.tsPlus > 0 ? score.tsPct / (score.tsPlus / 100) : null;
  const tsHybrid =
    leagueTs && Number.isFinite(leagueTs) && leagueTs > 0
      ? score.tsPct * 0.5 + (score.tsPct + (score.tsPct - leagueTs)) * 0.5
      : score.tsPct;

  return tsHybrid * 100;
}

export function calculatePer100Score({
  configOverrides = {},
  leagueAverage,
  playerSeason,
  statsEngineConfig,
}: {
  configOverrides?: Per100ScoreConfigOverrides;
  leagueAverage?: LeagueAverage | null;
  playerSeason: CareerSeason;
  statsEngineConfig?: StatsEngineConfig;
}): PlayerSeasonScoreResult {
  const statScore = scorePer100Season(
    playerSeason,
    leagueAverage ?? leagueAverageForPer100Season(statsEngineConfig, playerSeason.season),
    configOverrides,
  );
  const totalScore = statScore.score ?? 0;
  const impactScore = statScore.weightedOWS48 + statScore.weightedDWS48;

  return {
    displayStats: {
      assists: statScore.per100AST,
      mpg: statScore.mpg,
      points: statScore.per100PTS,
      rebounds: statScore.per100REB,
      tsHybrid: per100TsHybridPercentValue(statScore),
      ws48: per100WeightedWs48Value(statScore),
    },
    missingStats: statScore.missingStats,
    mode: STAT_MODES.PER_100,
    score: statScore.score,
    scoreBreakdown: {
      assistsScore: statScore.weightedAssists,
      efficiencyScore: statScore.adjustedPRA - statScore.weightedPRA,
      impactScore,
      pointsScore: statScore.weightedPoints,
      reboundsScore: statScore.weightedRebounds,
      totalScore,
    },
    sourceScore: statScore,
    totalScore,
    warnings: statScore.warnings,
  };
}

