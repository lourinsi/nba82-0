import type { ClassicStatKey, ClassicStatLine } from "../../../GameCourt";
import type { LEAGUE_ADJUSTED_SCORE_CONFIG } from "./config";

export type LeagueAdjustedScoreConfig = typeof LEAGUE_ADJUSTED_SCORE_CONFIG;
export type LeagueAdjustedScoreConfigOverrides = Partial<LeagueAdjustedScoreConfig> & {
  volumeWeights?: Partial<LeagueAdjustedScoreConfig["volumeWeights"]>;
};

export type ClassicVolumeMetric = "ppg" | "rpg" | "apg" | "spg" | "bpg";

export type LeagueAdjustedSeasonIndex = {
  baseVolumeIndex: number;
  components: Partial<Record<ClassicVolumeMetric, number>>;
  efficiencyModifier: number;
  impactComponent: number;
  missingStats: string[];
  playerStats: ClassicStatLine;
  totalIndex: number;
  tsHybridPercent: number | null;
  warnings: string[];
};

export type LeagueAdjustedStatKey = ClassicStatKey;

