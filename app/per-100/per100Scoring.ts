import type {
  CareerSeason,
  LeagueAverage,
  StatsEngineConfig,
  TeamEra,
  Player,
} from "../GameCourt";

export const DEFAULT_PER100_SCORE_CONFIG = Object.freeze({
  pointsWeight: 1.0,
  assistWeight: 0.7,
  reboundWeight: 0.6,
  praMultiplier: 1.67,

  tsPlusDivisor: 200,

  owsWeight: 1.0,
  dwsWeight: 1.0,
  winShareScale: 200,

  baseMPG: 32,
  maxMPG: 50,
  maxMinutesMultiplier: 1.3,
  minMinutesMultiplier: 0.1,

  lowMPG: 22,
  lowMPGMultiplier: 0.45,

  applyMinutesPenaltyToWinShares: true,

  regulationMinutes: 48,
  possessionsScale: 100,
});

export type Per100ScoreConfig = typeof DEFAULT_PER100_SCORE_CONFIG;
export type Per100ScoreConfigOverrides = Partial<Per100ScoreConfig>;

type Per100Metric = "pts" | "ast" | "reb";
type Per100StatResolution = {
  source: "direct" | "estimated-totals" | "estimated-per-game" | "missing";
  value: number | null;
};

export type WeightedPer100SeasonScore = {
  adjustedPRA: number;
  dws: number;
  estimated: boolean;
  estimatedPossessions?: number;
  games: number;
  missingStats: string[];
  minutes: number;
  mpg: number;
  ows: number;
  per100AST: number;
  per100PTS: number;
  per100REB: number;
  score: number | null;
  season: string;
  sources: Record<Per100Metric, Per100StatResolution["source"]>;
  team: string;
  totalScore: number;
  tsPct: number;
  tsPlus: number;
  warnings: string[];
  weightedAssists: number;
  weightedDWS48: number;
  weightedOWS48: number;
  weightedPRA: number;
  weightedPoints: number;
  weightedRebounds: number;
};

export type WeightedPer100StintScore = Omit<
  WeightedPer100SeasonScore,
  "estimatedPossessions" | "season" | "sources"
> & {
  season: string;
  seasons: string[];
  sources: Record<Per100Metric, Per100StatResolution["source"][]>;
  totalGames: number;
};

const GAMES_KEYS = ["games_played", "gamesPlayed", "g", "G", "gp", "GP"];
const MINUTES_KEYS = ["minutes", "mp", "MP", "total_minutes", "minutes_played", "minutesPlayed"];
const MPG_KEYS = ["mpg", "MPG", "mp_per_g", "minutes_per_game", "minutesPerGame"];
const TEAM_PACE_KEYS = ["team_pace", "teamPace", "pace", "Pace", "PACE"];
const TS_PCT_KEYS = ["ts_pct", "TS_PCT", "TS%", "true_shooting_pct", "trueShootingPct"];
const TS_PLUS_KEYS = ["ts_plus", "TS_PLUS", "tsPlus", "ts_pct_plus", "tsPctPlus", "TS+"];
const OWS_KEYS = ["ows", "OWS", "offensive_win_shares", "offensiveWinShares"];
const DWS_KEYS = ["dws", "DWS", "defensive_win_shares", "defensiveWinShares"];

const PER100_KEYS: Record<Per100Metric, string[]> = {
  pts: ["per100PTS", "per_100_pts", "per100_pts", "per100_ppg", "pts_per_100", "ptsPer100", "pts_per_poss"],
  ast: ["per100AST", "per_100_ast", "per100_ast", "per100_apg", "ast_per_100", "astPer100", "ast_per_poss"],
  reb: ["per100REB", "per_100_reb", "per100_reb", "per100_rpg", "trb_per_100", "rebPer100", "trb_per_poss"],
};
const TOTAL_KEYS: Record<Per100Metric, string[]> = {
  pts: ["pts", "PTS", "points", "total_points"],
  ast: ["ast", "AST", "assists", "total_assists"],
  reb: ["trb", "TRB", "reb", "REB", "rebounds", "total_rebounds"],
};
const PER_GAME_KEYS: Record<Per100Metric, string[]> = {
  pts: ["ppg", "PPG", "points_per_game", "pointsPerGame", "pts_per_game", "ptsPerGame"],
  ast: ["apg", "APG", "assists_per_game", "assistsPerGame", "ast_per_game", "astPerGame"],
  reb: ["rpg", "RPG", "rebounds_per_game", "reboundsPerGame", "trb_per_game", "rebPerGame"],
};
const LEAGUE_TS_KEYS = ["league_ts_pct", "leagueTsPct", "TS_PCT", "ts_pct", "TS%", "true_shooting_pct"];

function numericValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumericValue(source: Record<string, unknown> | undefined | null, keys: readonly string[]) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const numeric = numericValue(source[key]);

      if (numeric !== null) {
        return numeric;
      }
    }
  }

  return null;
}

function positiveNumber(value: unknown) {
  const numeric = numericValue(value);

  return numeric !== null && numeric > 0 ? numeric : null;
}

function nonNegativeNumber(value: unknown) {
  const numeric = numericValue(value);

  return numeric !== null && numeric >= 0 ? numeric : null;
}

function normalizeTsPct(value: unknown) {
  const numeric = positiveNumber(value);

  if (numeric === null) {
    return null;
  }

  return numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
}

function rounded(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function getCanonicalEra(era: string) {
  return era === "40's" || era === "50's" ? "60's" : era;
}

export function seasonEndYear(season: unknown) {
  const value = String(season || "").trim();
  const fullYearRange = value.match(/^(\d{4})\D+(\d{4})/);

  if (fullYearRange) {
    return Number(fullYearRange[2]);
  }

  const shortYearRange = value.match(/^(\d{4})\D+(\d{2})/);

  if (shortYearRange) {
    const startYear = Number(shortYearRange[1]);
    const endYearSuffix = Number(shortYearRange[2]);
    const startCentury = Math.floor(startYear / 100) * 100;
    const endYear = startCentury + endYearSuffix;

    return endYear > startYear ? endYear : endYear + 100;
  }

  const singleYear = value.match(/\d{4}/);

  return singleYear ? Number(singleYear[0]) : null;
}

function seasonKeyCandidates(season: unknown) {
  const rawSeason = String(season || "").trim();

  if (!rawSeason) {
    return [];
  }

  const candidates = [rawSeason];
  const endYear = seasonEndYear(rawSeason);
  const startYear = Number(rawSeason.match(/^(\d{4})/)?.[1]);

  if (startYear && endYear) {
    candidates.push(`${startYear}-${String(endYear).slice(-2)}`);
    candidates.push(`${startYear}-${endYear}`);
  }

  return Array.from(new Set(candidates));
}

export function leagueAverageForPer100Season(
  statsEngineConfig: StatsEngineConfig | undefined,
  season: unknown,
): LeagueAverage | null {
  const leagueAverages = statsEngineConfig?.leagueAverages;

  if (!leagueAverages) {
    return null;
  }

  for (const key of seasonKeyCandidates(season)) {
    if (leagueAverages[key]) {
      return leagueAverages[key];
    }
  }

  return null;
}

function leagueTsPct(leagueAverage: LeagueAverage | null | undefined) {
  return normalizeTsPct(firstNumericValue(leagueAverage, LEAGUE_TS_KEYS));
}

export function minutesMultiplier(mpg: number, overrides: Per100ScoreConfigOverrides = {}) {
  const config = { ...DEFAULT_PER100_SCORE_CONFIG, ...overrides };

  if (!Number.isFinite(mpg) || mpg <= 0) {
    return config.minMinutesMultiplier;
  }

  if (mpg < config.baseMPG) {
    const exponent =
      Math.log(config.lowMPGMultiplier) /
      Math.log(config.lowMPG / config.baseMPG);

    const raw = Math.pow(mpg / config.baseMPG, exponent);

    return Math.max(
      config.minMinutesMultiplier,
      Math.min(1, raw)
    );
  }

  const k =
    (config.maxMinutesMultiplier - 1) /
    Math.log(config.maxMPG / config.baseMPG);

  const raw = 1 + k * Math.log(mpg / config.baseMPG);

  return Math.min(config.maxMinutesMultiplier, raw);
}

export function estimatePossessionsPlayed(
  minutes: number,
  teamPace: number,
  overrides: Per100ScoreConfigOverrides = {},
) {
  const config = { ...DEFAULT_PER100_SCORE_CONFIG, ...overrides };

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new RangeError("minutes must be a finite number greater than zero.");
  }

  if (!Number.isFinite(teamPace) || teamPace <= 0) {
    throw new RangeError("teamPace must be a finite number greater than zero.");
  }

  return (minutes / config.regulationMinutes) * teamPace;
}

function estimatedPer100FromTotal(
  total: number,
  minutes: number,
  teamPace: number,
  overrides: Per100ScoreConfigOverrides,
) {
  const config = { ...DEFAULT_PER100_SCORE_CONFIG, ...overrides };
  const estimatedPossessions = estimatePossessionsPlayed(minutes, teamPace, config);

  return {
    estimatedPossessions,
    value: (total / estimatedPossessions) * config.possessionsScale,
  };
}

function estimatedPer100FromPerGame(
  perGame: number,
  mpg: number,
  teamPace: number,
  overrides: Per100ScoreConfigOverrides,
) {
  const config = { ...DEFAULT_PER100_SCORE_CONFIG, ...overrides };
  const estimatedPossessionsPerGame = (mpg / config.regulationMinutes) * teamPace;

  if (!Number.isFinite(estimatedPossessionsPerGame) || estimatedPossessionsPerGame <= 0) {
    return null;
  }

  return (perGame / estimatedPossessionsPerGame) * config.possessionsScale;
}

function seasonMinutes(source: Record<string, unknown>) {
  const direct = positiveNumber(firstNumericValue(source, MINUTES_KEYS));

  if (direct !== null) {
    return direct;
  }

  const mpg = positiveNumber(firstNumericValue(source, MPG_KEYS));
  const games = positiveNumber(firstNumericValue(source, GAMES_KEYS));

  return mpg !== null && games !== null ? mpg * games : null;
}

function seasonMpg(source: Record<string, unknown>, minutes: number | null) {
  const direct = positiveNumber(firstNumericValue(source, MPG_KEYS));

  if (direct !== null) {
    return direct;
  }

  const games = positiveNumber(firstNumericValue(source, GAMES_KEYS));

  return minutes !== null && games !== null ? minutes / games : null;
}

function seasonGames(source: Record<string, unknown>) {
  return positiveNumber(firstNumericValue(source, GAMES_KEYS));
}

function resolvePer100Stat(
  source: Record<string, unknown>,
  metric: Per100Metric,
  minutes: number | null,
  mpg: number | null,
  teamPace: number | null,
  overrides: Per100ScoreConfigOverrides,
): Per100StatResolution & { estimatedPossessions?: number } {
  const direct = nonNegativeNumber(firstNumericValue(source, PER100_KEYS[metric]));

  if (direct !== null) {
    return { source: "direct", value: direct };
  }

  if (minutes !== null && teamPace !== null) {
    const total = firstNumericValue(source, TOTAL_KEYS[metric]);

    if (total !== null && total >= 0) {
      const estimated = estimatedPer100FromTotal(total, minutes, teamPace, overrides);

      return {
        estimatedPossessions: estimated.estimatedPossessions,
        source: "estimated-totals",
        value: estimated.value,
      };
    }
  }

  if (mpg !== null && teamPace !== null) {
    const perGame = firstNumericValue(source, PER_GAME_KEYS[metric]);

    if (perGame !== null && perGame >= 0) {
      return {
        source: "estimated-per-game",
        value: estimatedPer100FromPerGame(perGame, mpg, teamPace, overrides),
      };
    }
  }

  return { source: "missing", value: null };
}

function tsPlusValue(source: Record<string, unknown>, tsPct: number | null, leagueAverage: LeagueAverage | null) {
  const direct = positiveNumber(firstNumericValue(source, TS_PLUS_KEYS));

  if (direct !== null) {
    return { direct: true, value: direct };
  }

  const leagueTs = leagueTsPct(leagueAverage);

  if (tsPct !== null && leagueTs !== null) {
    return { direct: false, value: (tsPct / leagueTs) * 100 };
  }

  if (tsPct !== null) {
    return { direct: false, value: 100 };
  }

  return { direct: false, value: null };
}

export function calculateWeightedPer100SeasonScore(
  player: {
    DWS: number;
    OWS: number;
    minutes: number;
    mpg: number;
    per100AST: number;
    per100PTS: number;
    per100REB: number;
    tsPct: number;
    tsPlus: number;
  },
  overrides: Per100ScoreConfigOverrides = {},
) {
  const config = { ...DEFAULT_PER100_SCORE_CONFIG, ...overrides };

  if (!Number.isFinite(player.minutes) || player.minutes <= 0) {
    throw new RangeError("minutes must be greater than zero.");
  }

  if (!Number.isFinite(player.tsPct) || player.tsPct < 0 || player.tsPct > 1) {
    throw new RangeError("tsPct must be a decimal between 0 and 1.");
  }

  const scaledTSPlus = player.tsPlus / config.tsPlusDivisor;
  const weightedPoints = player.per100PTS * (player.tsPct + scaledTSPlus) * config.pointsWeight;
  const weightedAssists = player.per100AST * config.assistWeight;
  const weightedRebounds = player.per100REB * config.reboundWeight;
  const weightedPRA = weightedPoints + weightedAssists + weightedRebounds;
  const mpgMultiplier = minutesMultiplier(player.mpg, config);
  const adjustedPRA = weightedPRA * mpgMultiplier * config.praMultiplier;
  const winShareMinutesPenalty = config.applyMinutesPenaltyToWinShares
    ? Math.min(1, mpgMultiplier)
    : 1;

  const weightedOWS48 =
    ((player.OWS * config.owsWeight * config.regulationMinutes) / player.minutes) *
    config.winShareScale *
    winShareMinutesPenalty;

  const weightedDWS48 =
    ((player.DWS * config.dwsWeight * config.regulationMinutes) / player.minutes) *
    config.winShareScale *
    winShareMinutesPenalty;
  const totalScore = adjustedPRA + weightedOWS48 + weightedDWS48;

  return {
    adjustedPRA,
    mpgMultiplier,
    scaledTSPlus,
    totalScore,
    weightedAssists,
    weightedDWS48,
    weightedOWS48,
    weightedPRA,
    weightedPoints,
    weightedRebounds,
  };
}

export function scorePer100Season(
  season: CareerSeason,
  leagueAverage: LeagueAverage | null = null,
  overrides: Per100ScoreConfigOverrides = {},
): WeightedPer100SeasonScore {
  const source = season as Record<string, unknown>;
  const missingStats: string[] = [];
  const warnings: string[] = [];
  const minutes = seasonMinutes(source);
  const mpg = seasonMpg(source, minutes);
  const games = seasonGames(source);
  const teamPace = positiveNumber(firstNumericValue(source, TEAM_PACE_KEYS));
  const tsPct = normalizeTsPct(firstNumericValue(source, TS_PCT_KEYS));
  const tsPlus = tsPlusValue(source, tsPct, leagueAverage);
  const ows = firstNumericValue(source, OWS_KEYS);
  const dws = firstNumericValue(source, DWS_KEYS);
  const per100PTS = resolvePer100Stat(source, "pts", minutes, mpg, teamPace, overrides);
  const per100AST = resolvePer100Stat(source, "ast", minutes, mpg, teamPace, overrides);
  const per100REB = resolvePer100Stat(source, "reb", minutes, mpg, teamPace, overrides);
  const estimatedPossessions = [per100PTS, per100AST, per100REB].find((stat) => stat.estimatedPossessions)
    ?.estimatedPossessions;

  if (minutes === null) missingStats.push("minutes");
  if (mpg === null) missingStats.push("mpg");
  if (teamPace === null && [per100PTS, per100AST, per100REB].some((stat) => stat.source !== "direct")) {
    missingStats.push("team_pace");
  }
  if (per100PTS.value === null) missingStats.push("per100PTS");
  if (per100AST.value === null) missingStats.push("per100AST");
  if (per100REB.value === null) missingStats.push("per100REB");
  if (tsPct === null) missingStats.push("ts_pct");
  if (tsPlus.value === null) missingStats.push("ts_plus");
  if (ows === null) missingStats.push("OWS");
  if (dws === null) missingStats.push("DWS");

  if (!tsPlus.direct && tsPlus.value !== null) {
    warnings.push("TS+ estimated from player TS% and league TS%.");
  }

  const baseResult = {
    adjustedPRA: 0,
    dws: dws ?? 0,
    estimated: [per100PTS, per100AST, per100REB].some((stat) => stat.source.startsWith("estimated")),
    estimatedPossessions,
    games: games ?? 0,
    missingStats,
    minutes: minutes ?? 0,
    mpg: mpg ?? 0,
    ows: ows ?? 0,
    per100AST: per100AST.value ?? 0,
    per100PTS: per100PTS.value ?? 0,
    per100REB: per100REB.value ?? 0,
    season: String(season.season ?? ""),
    sources: {
      ast: per100AST.source,
      pts: per100PTS.source,
      reb: per100REB.source,
    },
    team: String(season.team ?? ""),
    tsPct: tsPct ?? 0,
    tsPlus: tsPlus.value ?? 0,
    warnings,
    weightedAssists: 0,
    weightedDWS48: 0,
    weightedOWS48: 0,
    weightedPRA: 0,
    weightedPoints: 0,
    weightedRebounds: 0,
  };

  if (missingStats.length) {
    return {
      ...baseResult,
      score: null,
      totalScore: 0,
    };
  }

  const weighted = calculateWeightedPer100SeasonScore(
    {
      DWS: dws ?? 0,
      OWS: ows ?? 0,
      minutes: minutes ?? 0,
      mpg: mpg ?? 0,
      per100AST: per100AST.value ?? 0,
      per100PTS: per100PTS.value ?? 0,
      per100REB: per100REB.value ?? 0,
      tsPct: tsPct ?? 0,
      tsPlus: tsPlus.value ?? 0,
    },
    overrides,
  );
  const totalScore = rounded(weighted.totalScore, 2);

  return {
    ...baseResult,
    adjustedPRA: rounded(weighted.adjustedPRA, 4),
    per100AST: rounded(per100AST.value ?? 0, 2),
    per100PTS: rounded(per100PTS.value ?? 0, 2),
    per100REB: rounded(per100REB.value ?? 0, 2),
    score: totalScore,
    totalScore,
    tsPlus: rounded(tsPlus.value ?? 0, 2),
    weightedAssists: rounded(weighted.weightedAssists, 4),
    weightedDWS48: rounded(weighted.weightedDWS48, 4),
    weightedOWS48: rounded(weighted.weightedOWS48, 4),
    weightedPRA: rounded(weighted.weightedPRA, 4),
    weightedPoints: rounded(weighted.weightedPoints, 4),
    weightedRebounds: rounded(weighted.weightedRebounds, 4),
  };
}

export function careerSeasonsForPer100Selection(player: Player, selection: TeamEra) {
  const selectedEra = getCanonicalEra(selection.era);

  return (
    player.career_seasons?.filter(
      (season) =>
        season.team === selection.team &&
        getCanonicalEra(String(season.era || "")) === selectedEra,
    ) ?? []
  );
}

function weightedAverage(scores: WeightedPer100SeasonScore[], value: (score: WeightedPer100SeasonScore) => number) {
  let weightedTotal = 0;
  let weightTotal = 0;
  let sampleTotal = 0;
  let sampleCount = 0;

  for (const score of scores) {
    const numeric = value(score);

    if (!Number.isFinite(numeric)) {
      continue;
    }

    if (score.games > 0) {
      weightedTotal += numeric * score.games;
      weightTotal += score.games;
    } else {
      sampleTotal += numeric;
      sampleCount += 1;
    }
  }

  if (weightTotal > 0) {
    return weightedTotal / weightTotal;
  }

  return sampleCount > 0 ? sampleTotal / sampleCount : 0;
}

function uniqueSources(scores: WeightedPer100SeasonScore[], metric: Per100Metric) {
  return Array.from(new Set(scores.map((score) => score.sources[metric])));
}

function stintSeasonLabel(scores: WeightedPer100SeasonScore[]) {
  const seasons = scores.map((score) => score.season).filter(Boolean);

  if (seasons.length <= 1) {
    return seasons[0] ?? "";
  }

  return `${seasons[0]} to ${seasons[seasons.length - 1]}`;
}

export function per100StintForSelection(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
  overrides: Per100ScoreConfigOverrides = {},
): WeightedPer100StintScore | null {
  if (!player || !selection) {
    return null;
  }

  const scores = careerSeasonsForPer100Selection(player, selection)
    .map((season) =>
      scorePer100Season(
        season,
        leagueAverageForPer100Season(statsEngineConfig, season.season),
        overrides,
      ),
    )
    .filter((score) => score.score !== null)
    .sort((a, b) => (seasonEndYear(a.season) ?? 0) - (seasonEndYear(b.season) ?? 0));

  if (!scores.length) {
    return null;
  }

  const totalGames = scores.reduce((sum, score) => sum + score.games, 0);
  const minutes = scores.reduce((sum, score) => sum + score.minutes, 0);
  const ows = scores.reduce((sum, score) => sum + score.ows, 0);
  const dws = scores.reduce((sum, score) => sum + score.dws, 0);
  const mpg = totalGames > 0 ? minutes / totalGames : weightedAverage(scores, (score) => score.mpg);
  const per100PTS = weightedAverage(scores, (score) => score.per100PTS);
  const per100REB = weightedAverage(scores, (score) => score.per100REB);
  const per100AST = weightedAverage(scores, (score) => score.per100AST);
  const tsPct = weightedAverage(scores, (score) => score.tsPct);
  const tsPlus = weightedAverage(scores, (score) => score.tsPlus);
  const weighted = calculateWeightedPer100SeasonScore(
    {
      DWS: dws,
      OWS: ows,
      minutes,
      mpg,
      per100AST,
      per100PTS,
      per100REB,
      tsPct,
      tsPlus,
    },
    overrides,
  );
  const totalScore = rounded(weighted.totalScore, 2);
  const warnings = Array.from(new Set(scores.flatMap((score) => score.warnings)));

  return {
    adjustedPRA: rounded(weighted.adjustedPRA, 4),
    dws: rounded(dws, 3),
    estimated: scores.some((score) => score.estimated),
    games: totalGames,
    missingStats: [],
    minutes: rounded(minutes, 1),
    mpg: rounded(mpg, 2),
    ows: rounded(ows, 3),
    per100AST: rounded(per100AST, 2),
    per100PTS: rounded(per100PTS, 2),
    per100REB: rounded(per100REB, 2),
    score: totalScore,
    season: stintSeasonLabel(scores),
    seasons: scores.map((score) => score.season),
    sources: {
      ast: uniqueSources(scores, "ast"),
      pts: uniqueSources(scores, "pts"),
      reb: uniqueSources(scores, "reb"),
    },
    team: selection.team,
    totalGames,
    totalScore,
    tsPct: rounded(tsPct, 4),
    tsPlus: rounded(tsPlus, 2),
    warnings,
    weightedAssists: rounded(weighted.weightedAssists, 4),
    weightedDWS48: rounded(weighted.weightedDWS48, 4),
    weightedOWS48: rounded(weighted.weightedOWS48, 4),
    weightedPRA: rounded(weighted.weightedPRA, 4),
    weightedPoints: rounded(weighted.weightedPoints, 4),
    weightedRebounds: rounded(weighted.weightedRebounds, 4),
  };
}

export function bestPer100SeasonForSelection(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
  overrides: Per100ScoreConfigOverrides = {},
) {
  if (!player || !selection) {
    return null;
  }

  const scoredSeasons = careerSeasonsForPer100Selection(player, selection)
    .map((season) =>
      scorePer100Season(
        season,
        leagueAverageForPer100Season(statsEngineConfig, season.season),
        overrides,
      ),
    )
    .filter((score) => score.score !== null);

  return scoredSeasons.sort(
    (first, second) =>
      second.totalScore - first.totalScore ||
      seasonEndYear(second.season)! - seasonEndYear(first.season)!,
  )[0] ?? null;
}

export function firstMissingPer100SeasonForSelection(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
  overrides: Per100ScoreConfigOverrides = {},
) {
  if (!player || !selection) {
    return null;
  }

  return careerSeasonsForPer100Selection(player, selection)
    .map((season) =>
      scorePer100Season(
        season,
        leagueAverageForPer100Season(statsEngineConfig, season.season),
        overrides,
      ),
    )
    .find((score) => score.missingStats.length > 0) ?? null;
}
