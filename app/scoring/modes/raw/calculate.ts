import type { CareerSeason, LeagueAverage, StatsEngineConfig } from "../../../GameCourt";
import {
  firstNumericValue,
  leagueAverageForSeason,
  normalizeTsPct,
  positiveNumber,
  rounded,
} from "../../shared";
import { STAT_MODES, type PlayerSeasonScoreResult } from "../../types";
import { RAW_SCORE_CONFIG } from "./config";
import type { RawScoreConfigOverrides } from "./types";

const RAW_POINTS_KEYS = ["ppg", "PPG", "points_per_game", "pointsPerGame", "pts_per_game", "ptsPerGame"];
const RAW_REBOUNDS_KEYS = [
  "rpg",
  "RPG",
  "rebounds_per_game",
  "reboundsPerGame",
  "reb_per_game",
  "rebPerGame",
  "trb_per_game",
];
const RAW_ASSISTS_KEYS = ["apg", "APG", "assists_per_game", "assistsPerGame", "ast_per_game", "astPerGame"];
const RAW_MPG_KEYS = ["mpg", "MPG", "mp_per_g", "minutes_per_game", "minutesPerGame"];
const RAW_MINUTES_KEYS = ["minutes", "mp", "MP", "total_minutes", "minutes_played", "minutesPlayed"];
const RAW_GAMES_KEYS = ["games_played", "gamesPlayed", "g", "G", "gp", "GP"];
const RAW_TS_KEYS = ["ts_pct", "TS_PCT", "TS%", "true_shooting_pct", "trueShootingPct"];
const RAW_WS48_KEYS = ["ws_per_48", "ws_48", "WS/48", "ws48"];
const LEAGUE_TS_KEYS = ["league_ts_pct", "leagueTsPct", "TS_PCT", "ts_pct", "TS%", "true_shooting_pct"];

function mergeConfig(overrides: RawScoreConfigOverrides = {}) {
  return { ...RAW_SCORE_CONFIG, ...overrides };
}

function rawMpgForSeason(source: Record<string, unknown>) {
  const direct = positiveNumber(firstNumericValue(source, RAW_MPG_KEYS));

  if (direct !== null) {
    return direct;
  }

  const minutes = positiveNumber(firstNumericValue(source, RAW_MINUTES_KEYS));
  const games = positiveNumber(firstNumericValue(source, RAW_GAMES_KEYS));

  return minutes !== null && games !== null ? minutes / games : null;
}

function leagueTsPct(leagueAverage: LeagueAverage | null | undefined) {
  return normalizeTsPct(firstNumericValue(leagueAverage, LEAGUE_TS_KEYS));
}

function tsPlusValue(tsPct: number | null, leagueAverage: LeagueAverage | null) {
  const leagueTs = leagueTsPct(leagueAverage);

  if (tsPct !== null && leagueTs !== null) {
    return (tsPct / leagueTs) * 100;
  }

  if (tsPct !== null) {
    return 100;
  }

  return null;
}

function tsHybridPercentValue(tsPct: number | null, tsPlus: number | null) {
  if (tsPct === null || tsPct <= 0) {
    return null;
  }

  const leagueTs = tsPlus && tsPlus > 0 ? tsPct / (tsPlus / 100) : null;
  const tsHybrid =
    leagueTs && Number.isFinite(leagueTs) && leagueTs > 0
      ? tsPct * 0.5 + (tsPct + (tsPct - leagueTs)) * 0.5
      : tsPct;

  return tsHybrid * 100;
}

function minutesMultiplier(mpg: number | null, overrides: RawScoreConfigOverrides = {}) {
  const config = mergeConfig(overrides);

  if (mpg === null || !Number.isFinite(mpg) || mpg <= 0) {
    return config.minMinutesMultiplier;
  }

  if (mpg < config.baseMPG) {
    const exponent = Math.log(config.lowMPGMultiplier) / Math.log(config.lowMPG / config.baseMPG);
    const raw = Math.pow(mpg / config.baseMPG, exponent);

    return Math.max(config.minMinutesMultiplier, Math.min(1, raw));
  }

  const k = (config.maxMinutesMultiplier - 1) / Math.log(config.maxMPG / config.baseMPG);
  const raw = 1 + k * Math.log(mpg / config.baseMPG);

  return Math.min(config.maxMinutesMultiplier, raw);
}

export function calculateRawScore({
  configOverrides = {},
  leagueAverage,
  playerSeason,
  statsEngineConfig,
}: {
  configOverrides?: RawScoreConfigOverrides;
  leagueAverage?: LeagueAverage | null;
  playerSeason: CareerSeason;
  statsEngineConfig?: StatsEngineConfig;
}): PlayerSeasonScoreResult {
  const source = playerSeason as Record<string, unknown>;
  const config = mergeConfig(configOverrides);
  const points = firstNumericValue(source, RAW_POINTS_KEYS);
  const rebounds = firstNumericValue(source, RAW_REBOUNDS_KEYS);
  const assists = firstNumericValue(source, RAW_ASSISTS_KEYS);
  const mpg = rawMpgForSeason(source);
  const ws48 = firstNumericValue(source, RAW_WS48_KEYS);
  const tsPct = normalizeTsPct(firstNumericValue(source, RAW_TS_KEYS));
  const resolvedLeagueAverage =
    leagueAverage ?? leagueAverageForSeason(statsEngineConfig?.leagueAverages, playerSeason.season);
  const tsPlus = tsPlusValue(tsPct, resolvedLeagueAverage);
  const missingStats: string[] = [];

  if (points === null) missingStats.push("ppg");
  if (rebounds === null) missingStats.push("rpg");
  if (assists === null) missingStats.push("apg");
  if (mpg === null) missingStats.push("mpg");
  if (tsPct === null) missingStats.push("ts_pct");
  if (tsPlus === null) missingStats.push("ts_plus");
  if (ws48 === null) missingStats.push("ws_48");

  if (missingStats.length) {
    return {
      displayStats: {
        assists,
        mpg,
        points,
        rebounds,
        tsHybrid: tsHybridPercentValue(tsPct, tsPlus),
        ws48,
      },
      missingStats,
      mode: STAT_MODES.RAW,
      score: null,
      scoreBreakdown: {
        assistsScore: 0,
        efficiencyScore: 0,
        impactScore: 0,
        pointsScore: 0,
        reboundsScore: 0,
        totalScore: 0,
      },
      totalScore: 0,
      warnings: [],
    };
  }

  const scaledTSPlus = (tsPlus ?? 0) / config.tsPlusDivisor;
  const pointsScore = (points ?? 0) * ((tsPct ?? 0) + scaledTSPlus) * config.pointsWeight;
  const assistsScore = (assists ?? 0) * config.assistWeight;
  const reboundsScore = (rebounds ?? 0) * config.reboundWeight;
  const weightedPRA = pointsScore + assistsScore + reboundsScore;
  const mpgMultiplier = minutesMultiplier(mpg, config);
  const volumeScore = weightedPRA * mpgMultiplier * config.praMultiplier;
  const winShareMinutesPenalty = Math.min(1, mpgMultiplier);
  const impactScore = (ws48 ?? 0) * config.winShareScale * winShareMinutesPenalty;
  const totalScore = rounded(volumeScore + impactScore, 2);

  return {
    displayStats: {
      assists: rounded(assists ?? 0, 2),
      mpg: rounded(mpg ?? 0, 2),
      points: rounded(points ?? 0, 2),
      rebounds: rounded(rebounds ?? 0, 2),
      tsHybrid: tsHybridPercentValue(tsPct, tsPlus),
      ws48,
    },
    missingStats,
    mode: STAT_MODES.RAW,
    score: totalScore,
    scoreBreakdown: {
      assistsScore: rounded(assistsScore, 4),
      efficiencyScore: rounded(volumeScore - weightedPRA, 4),
      impactScore: rounded(impactScore, 4),
      pointsScore: rounded(pointsScore, 4),
      reboundsScore: rounded(reboundsScore, 4),
      totalScore,
    },
    totalScore,
    warnings: resolvedLeagueAverage ? [] : ["TS+ fallback used because league TS% was unavailable."],
  };
}

