export {
  STAT_MODE_HELPER_TEXT,
  STAT_MODE_LABELS,
  STAT_MODE_OPTIONS,
  STAT_MODES,
  normalizeStatMode,
  type PlayerSeasonDisplayStats,
  type PlayerSeasonScoreBreakdown,
  type PlayerSeasonScoreConfigOverrides,
  type PlayerSeasonScoreInput,
  type PlayerSeasonScoreResult,
  type StatMode,
} from "./types";
export * from "./modes/per100";
export * from "./modes/leagueAdjusted";
export * from "./modes/raw";

import { calculateLeagueAdjustedScore } from "./modes/leagueAdjusted";
import { calculatePer100Score } from "./modes/per100";
import { calculateRawScore } from "./modes/raw";
import { STAT_MODES, normalizeStatMode, type PlayerSeasonScoreInput } from "./types";

export function calculatePlayerSeasonScore({
  configOverrides,
  leagueAverage,
  playerSeason,
  statMode,
  statsEngineConfig,
}: PlayerSeasonScoreInput) {
  const resolvedStatMode = normalizeStatMode(statMode);

  if (resolvedStatMode === STAT_MODES.LEAGUE_ADJUSTED) {
    return calculateLeagueAdjustedScore({
      configOverrides: configOverrides?.leagueAdjusted,
      leagueAverage,
      playerSeason,
      statsEngineConfig,
    });
  }

  if (resolvedStatMode === STAT_MODES.RAW) {
    return calculateRawScore({
      configOverrides: configOverrides?.raw,
      leagueAverage,
      playerSeason,
      statsEngineConfig,
    });
  }

  return calculatePer100Score({
    configOverrides: configOverrides?.per100,
    leagueAverage,
    playerSeason,
    statsEngineConfig,
  });
}
