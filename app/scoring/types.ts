import type { CareerSeason, LeagueAverage, StatsEngineConfig } from "../GameCourt";
import type { LeagueAdjustedScoreConfigOverrides } from "./modes/leagueAdjusted/types";
import type { Per100ScoreConfigOverrides } from "./modes/per100/types";
import type { RawScoreConfigOverrides } from "./modes/raw/types";

export const STAT_MODES = {
  PER_100: "per100",
  LEAGUE_ADJUSTED: "leagueAdjusted",
  RAW: "raw",
} as const;

export type StatMode = typeof STAT_MODES[keyof typeof STAT_MODES];

export const STAT_MODE_LABELS = {
  [STAT_MODES.PER_100]: "Per 100",
  [STAT_MODES.LEAGUE_ADJUSTED]: "League adjusted stats",
  [STAT_MODES.RAW]: "No adjustment",
} as const satisfies Record<StatMode, string>;

export const STAT_MODE_HELPER_TEXT = {
  [STAT_MODES.PER_100]: "Stats adjusted to per-100 possessions.",
  [STAT_MODES.LEAGUE_ADJUSTED]: "Classic league-adjusted stat model.",
  [STAT_MODES.RAW]: "Raw season stats. TS* still uses hybrid efficiency.",
} as const satisfies Record<StatMode, string>;

export const STAT_MODE_OPTIONS = [
  { label: STAT_MODE_LABELS[STAT_MODES.PER_100], value: STAT_MODES.PER_100 },
  { label: STAT_MODE_LABELS[STAT_MODES.LEAGUE_ADJUSTED], value: STAT_MODES.LEAGUE_ADJUSTED },
  { label: STAT_MODE_LABELS[STAT_MODES.RAW], value: STAT_MODES.RAW },
] as const;

export type PlayerSeasonDisplayStats = {
  assists: number | null;
  mpg: number | null;
  points: number | null;
  rebounds: number | null;
  tsHybrid: number | null;
  ws48: number | null;
};

export type PlayerSeasonScoreBreakdown = {
  assistsScore: number;
  efficiencyScore: number;
  impactScore: number;
  pointsScore: number;
  reboundsScore: number;
  totalScore: number;
};

export type PlayerSeasonScoreResult = {
  displayStats: PlayerSeasonDisplayStats;
  missingStats: string[];
  mode: StatMode;
  score: number | null;
  scoreBreakdown: PlayerSeasonScoreBreakdown;
  sourceScore?: unknown;
  totalScore: number;
  warnings: string[];
};

export type PlayerSeasonScoreConfigOverrides = {
  leagueAdjusted?: LeagueAdjustedScoreConfigOverrides;
  per100?: Per100ScoreConfigOverrides;
  raw?: RawScoreConfigOverrides;
};

export type PlayerSeasonScoreInput = {
  adjustedStatsEnabled?: boolean;
  configOverrides?: PlayerSeasonScoreConfigOverrides;
  leagueAverage?: LeagueAverage | null;
  playerSeason: CareerSeason;
  statMode?: StatMode | null;
  statsEngineConfig?: StatsEngineConfig;
};

export function normalizeStatMode(value: unknown): StatMode {
  return STAT_MODE_OPTIONS.some((option) => option.value === value)
    ? (value as StatMode)
    : STAT_MODES.PER_100;
}

