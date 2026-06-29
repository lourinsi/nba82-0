"use client";

import {
  eraSortValue,
  teamEraExists,
  type Accolades,
  type Achievement,
  type AchievementDisplay,
  type CareerSeason,
  type ClassicPointBlock,
  type GameCourtConfig,
  type LineupSlot,
  type Player,
  type Position,
  type PositionBonus,
  type RosterSortMode,
  type RosterSortOption,
  type ScoringAccolades,
  type StatsEngineConfig,
  type TeamEra,
} from "../GameCourt";
import {
  CLASSIC_BADGE_SCORE_WEIGHTS_BY_ID,
  CLASSIC_SEASON_TIERS,
} from "../classic/classicGameConfig";
import { ACHIEVEMENT_TITLE_BY_ID } from "../achievementMeta";
import { PER_100_HOW_TO, HOW_TO_STORAGE_KEYS } from "../howToContent";
import {
  DEFAULT_PER100_SCORE_CONFIG,
  careerSeasonsForPer100Selection,
  firstMissingPer100SeasonForSelection,
  per100StintForSelection,
  type WeightedPer100SeasonScore,
  type WeightedPer100StintScore,
} from "./per100Scoring";

const DEFAULT_ERAS = ["60's", "90's", "00's", "10's", "20's"];
const PER100_RESULT_STORAGE_KEY = "nba82_per100_result";
const POSITION_FIT_MULTIPLIER = 1.1;
const PER100_ACCOLADE_SCORE_MULTIPLIER = 0.5;
const ROSTER_SORT_OPTIONS = [
  { id: "mixed", label: "Mixed" },
  { id: "stats", label: "Stats" },
  { id: "awards", label: "Awards" },
] as const satisfies readonly RosterSortOption[];

const ACCOLADE_WEIGHTS = {
  finals_mvp_count: 7.5,
  estimated_finals_mvp_count: 7.5,
  mvp_count: 5,
  all_nba_1st: 7,
  all_nba_2nd: 5.5,
  all_nba_3rd: 4,
  dpoy_count: 2.5,
  all_def_1st: 2,
  all_def_2nd: 1.5,
  scoring_titles: 3,
  assist_titles: 3,
  rebound_titles: 2,
  three_point_titles: 2.5,
  steal_titles: 1.5,
  block_titles: 1.5,
  // no more olympics point value
  all_star_mvp_count: 1.1,
  three_point_contest_wins: 1,
  all_star_selections: 1,
  championship_rings: 1,
  "6moy": 1,
  most_improved: 1,
  roy_won: 1.1,
  all_rookie_1st: 1,
  all_rookie_2nd: 0.75,
  seasons_played: 0.25,
  // games_started: 0.01,
} satisfies Partial<Record<keyof Accolades, number>>;

type WeightedAccoladeKey = keyof typeof ACCOLADE_WEIGHTS;

const MERGED_ACCOLADE_KEYS = [
  "mvp_count",
  "finals_mvp_count",
  "estimated_finals_mvp_count",
  "dpoy_count",
  "championship_rings",
  "most_improved",
  "top_3_mvp",
  "top_10_mvp",
  "top_3_dpoy",
  "all_nba_1st",
  "all_nba_2nd",
  "all_nba_3rd",
  "all_def_1st",
  "all_def_2nd",
  "all_rookie_1st",
  "all_rookie_2nd",
  "all_star_selections",
  "all_star_mvp_count",
  "seasons_played",
  "scoring_titles",
  "assist_titles",
  "rebound_titles",
  "three_point_titles",
  "steal_titles",
  "block_titles",
  "three_point_contest_wins",
  "games_started",
  "6moy",
] as const satisfies readonly (keyof Accolades)[];

const ACHIEVEMENT_DISPLAY_ORDER: AchievementDisplay[] = [
  { id: "mvp", label: "MVP", count: (player) => player.accolades.mvp_count, weight: ACCOLADE_WEIGHTS.mvp_count },
  {
    id: "fmvp",
    label: "FMVP",
    count: (player) => player.accolades.finals_mvp_count,
    weight: ACCOLADE_WEIGHTS.finals_mvp_count,
  },
  {
    id: "retro-fmvp",
    label: "RFMVP",
    count: (player) => player.accolades.estimated_finals_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.estimated_finals_mvp_count,
  },
  {
    id: "all-nba",
    label: "ALL NBA",
    count: (player) => player.accolades.all_nba_1st + player.accolades.all_nba_2nd + player.accolades.all_nba_3rd,
    sortValue: (player) => weightedAccoladeScore(player, ["all_nba_1st", "all_nba_2nd", "all_nba_3rd"]),
    weight: ACCOLADE_WEIGHTS.all_nba_1st,
  },
  {
    id: "rings",
    label: "RING",
    count: (player) => player.accolades.championship_rings,
    weight: ACCOLADE_WEIGHTS.championship_rings,
  },
  { id: "dpoy", label: "DPOY", count: (player) => player.accolades.dpoy_count, weight: ACCOLADE_WEIGHTS.dpoy_count },
  {
    id: "all-defense",
    label: "DEF",
    count: (player) => player.accolades.all_def_1st + player.accolades.all_def_2nd,
    sortValue: (player) => weightedAccoladeScore(player, ["all_def_1st", "all_def_2nd"]),
    weight: ACCOLADE_WEIGHTS.all_def_1st,
  },
  { id: "scoring", label: "SCO", count: (player) => player.accolades.scoring_titles, weight: ACCOLADE_WEIGHTS.scoring_titles },
  { id: "assists", label: "AST", count: (player) => player.accolades.assist_titles, weight: ACCOLADE_WEIGHTS.assist_titles },
  { id: "rebounds", label: "REB", count: (player) => player.accolades.rebound_titles, weight: ACCOLADE_WEIGHTS.rebound_titles },
  {
    id: "three-point-title",
    label: "3PT",
    count: (player) => player.accolades.three_point_titles ?? 0,
    weight: ACCOLADE_WEIGHTS.three_point_titles,
  },
  { id: "steals", label: "STL", count: (player) => player.accolades.steal_titles, weight: ACCOLADE_WEIGHTS.steal_titles },
  { id: "blocks", label: "BLK", count: (player) => player.accolades.block_titles, weight: ACCOLADE_WEIGHTS.block_titles },
  {
    id: "all-star-mvp",
    label: "ASM",
    count: (player) => player.accolades.all_star_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.all_star_mvp_count,
  },
  {
    id: "three-point-contest",
    label: "3PC",
    count: (player) => player.accolades.three_point_contest_wins ?? 0,
    weight: ACCOLADE_WEIGHTS.three_point_contest_wins,
  },
  {
    id: "all-star",
    label: "AS",
    count: (player) => player.accolades.all_star_selections,
    weight: ACCOLADE_WEIGHTS.all_star_selections,
  },
  { id: "sixth-man", label: "6MOY", count: (player) => player.accolades["6moy"] ?? 0, weight: ACCOLADE_WEIGHTS["6moy"] },
  {
    id: "most-improved",
    label: "MIP",
    count: (player) => player.accolades.most_improved ?? 0,
    weight: ACCOLADE_WEIGHTS.most_improved,
  },
  { id: "roy", label: "ROY", count: (player) => (player.accolades.roy_won ? 1 : 0), weight: ACCOLADE_WEIGHTS.roy_won },
  {
    id: "all-rookie-1st",
    label: "R1",
    count: (player) => player.accolades.all_rookie_1st ?? 0,
    weight: ACCOLADE_WEIGHTS.all_rookie_1st,
  },
  {
    id: "all-rookie-2nd",
    label: "R2",
    count: (player) => player.accolades.all_rookie_2nd ?? 0,
    weight: ACCOLADE_WEIGHTS.all_rookie_2nd,
  },
];
const TOTAL_ACHIEVEMENT_DISPLAY_ORDER = ACHIEVEMENT_DISPLAY_ORDER;

type RawPraLine = {
  apg: number;
  ppg: number;
  rpg: number;
};

const GAMES_KEYS = ["games_played", "gamesPlayed", "g", "G", "gp", "GP"];
const MPG_KEYS = ["mpg", "MPG", "mp_per_g", "minutes_per_game", "minutesPerGame"];
const TS_PCT_KEYS = ["ts_pct", "TS_PCT", "TS%", "true_shooting_pct", "trueShootingPct"];
const WS_48_KEYS = ["ws_per_48", "ws_48", "WS/48", "ws48"];
const RAW_STAT_KEYS = {
  apg: ["apg", "APG", "assists_per_game", "assistsPerGame", "ast_per_game", "astPerGame"],
  ppg: ["ppg", "PPG", "points_per_game", "pointsPerGame", "pts_per_game", "ptsPerGame"],
  rpg: ["rpg", "RPG", "rebounds_per_game", "reboundsPerGame", "trb_per_game", "rebPerGame"],
} as const;
const PER100_STAT_KEYS = {
  apg: ["per100AST", "per_100_ast", "per100_ast", "per100_apg", "ast_per_100", "astPer100", "ast_per_poss"],
  ppg: ["per100PTS", "per_100_pts", "per100_pts", "per100_ppg", "pts_per_100", "ptsPer100", "pts_per_poss"],
  rpg: ["per100REB", "per_100_reb", "per100_reb", "per100_rpg", "trb_per_100", "rebPer100", "trb_per_poss"],
} as const;

function getCanonicalEra(era: string) {
  return era === "40's" || era === "50's" ? "60's" : era;
}

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

function numericAccoladeValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) ? numeric : 0;
}

function statValue(value: number, digits = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(digits);
}

function wholeStatValue(value: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? String(Math.round(numeric)) : "0";
}

function countValue(value: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0x";
  }

  const count = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, "");

  return `${count}x`;
}

function ws48Value(value: unknown) {
  const numeric = numericValue(value);

  return numeric === null ? "0.00" : numeric.toFixed(2);
}

function compactPraValues(points: number, rebounds: number, assists: number) {
  return `${wholeStatValue(points)}/${wholeStatValue(rebounds)}/${wholeStatValue(assists)}`;
}

function compactMissingValue(score: WeightedPer100SeasonScore | null) {
  if (!score?.missingStats.length) {
    return "Need data";
  }

  return `Need ${score.missingStats.slice(0, 2).join(", ")}`;
}

function seasonGames(source: Record<string, unknown>) {
  return positiveNumber(firstNumericValue(source, GAMES_KEYS));
}

function weightedAccoladeScore(player: Player, keys: readonly WeightedAccoladeKey[]) {
  return keys.reduce(
    (sum, key) => sum + numericAccoladeValue(player.accolades[key]) * Number(ACCOLADE_WEIGHTS[key] ?? 0),
    0,
  );
}

function achievementScoreValue(achievement: Achievement) {
  return typeof achievement.scoreValue === "number" && Number.isFinite(achievement.scoreValue)
    ? achievement.scoreValue
    : numericAccoladeValue(achievement.value) * (CLASSIC_BADGE_SCORE_WEIGHTS_BY_ID[achievement.id] ?? 0);
}

function sortAchievementsByScoreValue(achievements: Achievement[]) {
  return [...achievements].sort((first, second) => achievementScoreValue(second) - achievementScoreValue(first));
}

function classicBlocksForSelection(player: Player | undefined, selection: TeamEra | undefined) {
  if (!player || !selection) {
    return [];
  }

  const selectedEra = getCanonicalEra(selection.era);

  return player.classic_points_by_team_era?.filter(
    (block) => block.team === selection.team && getCanonicalEra(block.era) === selectedEra,
  ) ?? [];
}

function seasonEndYear(season: unknown) {
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

function normalizedAwardDescription(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isNbaAllStarSelectionAward(description: unknown) {
  const normalized = normalizedAwardDescription(description);

  return normalized.includes("nba all star") && !normalized.includes("most valuable player");
}

function seasonEndYearSet(seasons: CareerSeason[]) {
  return new Set(
    seasons
      .map((season) => seasonEndYear(season.season))
      .filter((year): year is number => typeof year === "number" && Number.isFinite(year)),
  );
}

function inferredAllStarSelectionsForSeasons(player: Player, seasons: CareerSeason[]) {
  if (!player.awards_raw?.length || !seasons.length) {
    return 0;
  }

  const selectedSeasonYears = seasonEndYearSet(seasons);

  if (!selectedSeasonYears.size) {
    return 0;
  }

  const allStarSeasonYears = new Set<number>();

  for (const award of player.awards_raw) {
    if (!isNbaAllStarSelectionAward(award.description)) {
      continue;
    }

    const awardSeasonEndYear = seasonEndYear(award.season);

    if (typeof awardSeasonEndYear === "number" && selectedSeasonYears.has(awardSeasonEndYear)) {
      allStarSeasonYears.add(awardSeasonEndYear);
    }
  }

  return allStarSeasonYears.size;
}

function inferredAllStarSelectionsForSelection(player: Player, selection: TeamEra | undefined) {
  return selection
    ? inferredAllStarSelectionsForSeasons(player, careerSeasonsForPer100Selection(player, selection))
    : 0;
}

function withInferredAllStarSelections<T extends Accolades | ScoringAccolades | undefined>(
  accolades: T,
  count: number,
) {
  if (!accolades || count <= 0) {
    return accolades;
  }

  const currentCount = numericAccoladeValue(accolades.all_star_selections);

  if (currentCount >= count) {
    return accolades;
  }

  return { ...accolades, all_star_selections: count } as T;
}

function mergeAccolades(blocks: ClassicPointBlock[]) {
  const blocksWithAccolades = blocks.filter((block) => block.accolades);

  if (!blocksWithAccolades.length) {
    return undefined;
  }

  const merged = { ...blocksWithAccolades[0].accolades } as Accolades;

  for (const key of MERGED_ACCOLADE_KEYS) {
    const total = blocksWithAccolades.reduce(
      (sum, block) => sum + numericAccoladeValue(block.accolades?.[key]),
      0,
    );

    if (total > 0 || key in merged) {
      merged[key] = total as never;
    }
  }

  merged.roy_won = blocksWithAccolades.some((block) => Boolean(block.accolades?.roy_won));

  return merged;
}

function accoladesForSelection(player: Player, selection: TeamEra | undefined) {
  const blocks = classicBlocksForSelection(player, selection);
  const accolades = mergeAccolades(blocks) ?? player.accolades;
  const inferredAllStarSelections = inferredAllStarSelectionsForSelection(player, selection);

  return withInferredAllStarSelections(accolades, inferredAllStarSelections) ?? player.accolades;
}

function playerWithSelectionAccolades(player: Player, selection: TeamEra | undefined) {
  return { ...player, accolades: accoladesForSelection(player, selection) };
}

function accoladeScore(accolades: Accolades | ScoringAccolades | undefined) {
  if (!accolades) {
    return 0;
  }

  const rawBasePoints = (Object.keys(ACCOLADE_WEIGHTS) as WeightedAccoladeKey[]).reduce(
    (sum, key) => sum + numericAccoladeValue(accolades[key]) * Number(ACCOLADE_WEIGHTS[key] ?? 0),
    0,
  );

  return Number((rawBasePoints * PER100_ACCOLADE_SCORE_MULTIPLIER).toFixed(2));
}

function per100StintScoreForSelection(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
) {
  return per100StintForSelection(player, selection, statsEngineConfig);
}

function fallbackMissingSeasonForSelection(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
) {
  return firstMissingPer100SeasonForSelection(player, selection, statsEngineConfig);
}

function rawPraForSelection(player: Player | undefined, selection: TeamEra | undefined) {
  if (!player || !selection) {
    return null;
  }

  const rows = careerSeasonsForPer100Selection(player, selection)
    .map((season) => {
      const source = season as Record<string, unknown>;
      const ppg = firstNumericValue(source, RAW_STAT_KEYS.ppg);
      const rpg = firstNumericValue(source, RAW_STAT_KEYS.rpg);
      const apg = firstNumericValue(source, RAW_STAT_KEYS.apg);

      if (ppg === null || rpg === null || apg === null) {
        return null;
      }

      return {
        apg,
        games: seasonGames(source) ?? 0,
        ppg,
        rpg,
      };
    })
    .filter((row): row is RawPraLine & { games: number } => Boolean(row));

  if (!rows.length) {
    return null;
  }

  const average = (value: (row: RawPraLine & { games: number }) => number) => {
    const gameWeightedRows = rows.filter((row) => row.games > 0);

    if (gameWeightedRows.length) {
      const totalGames = gameWeightedRows.reduce((sum, row) => sum + row.games, 0);

      return gameWeightedRows.reduce((sum, row) => sum + value(row) * row.games, 0) / totalGames;
    }

    return rows.reduce((sum, row) => sum + value(row), 0) / rows.length;
  };

  return {
    apg: average((row) => row.apg),
    ppg: average((row) => row.ppg),
    rpg: average((row) => row.rpg),
  };
}

function weightedSeasonAverage(
  player: Player | undefined,
  selection: TeamEra | undefined,
  value: (source: Record<string, unknown>) => number | null,
) {
  if (!player || !selection) {
    return null;
  }

  const rows = careerSeasonsForPer100Selection(player, selection)
    .map((season) => {
      const source = season as Record<string, unknown>;
      const numeric = value(source);

      return numeric === null ? null : { games: seasonGames(source) ?? 0, value: numeric };
    })
    .filter((row): row is { games: number; value: number } => Boolean(row));

  if (!rows.length) {
    return null;
  }

  const gameWeightedRows = rows.filter((row) => row.games > 0);

  if (gameWeightedRows.length) {
    const totalGames = gameWeightedRows.reduce((sum, row) => sum + row.games, 0);

    return gameWeightedRows.reduce((sum, row) => sum + row.value * row.games, 0) / totalGames;
  }

  return rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
}

function per100PraForSelection(player: Player | undefined, selection: TeamEra | undefined) {
  if (!player || !selection) {
    return null;
  }

  const ppg = weightedSeasonAverage(player, selection, (source) => firstNumericValue(source, PER100_STAT_KEYS.ppg));
  const rpg = weightedSeasonAverage(player, selection, (source) => firstNumericValue(source, PER100_STAT_KEYS.rpg));
  const apg = weightedSeasonAverage(player, selection, (source) => firstNumericValue(source, PER100_STAT_KEYS.apg));

  return ppg === null || rpg === null || apg === null ? null : { apg, ppg, rpg };
}

function fallbackPer100StatAchievements(player: Player, selection: TeamEra, showAdjustedStats: boolean) {
  const rawPra = rawPraForSelection(player, selection);
  const per100Pra = per100PraForSelection(player, selection);
  const pra = showAdjustedStats && per100Pra ? per100Pra : rawPra ?? per100Pra;
  const ws48 = weightedSeasonAverage(player, selection, (source) => firstNumericValue(source, WS_48_KEYS));
  const tsPct = weightedSeasonAverage(player, selection, (source) => firstNumericValue(source, TS_PCT_KEYS));
  const mpg = weightedSeasonAverage(player, selection, (source) => firstNumericValue(source, MPG_KEYS));
  const achievements: Achievement[] = [];

  if (pra) {
    achievements.push({
      id: "pra",
      value: compactPraValues(pra.ppg, pra.rpg, pra.apg),
      label: "P/R/A",
      title: showAdjustedStats && per100Pra ? "Pts + Rebs + Asts per 100 possessions" : "Raw Pts + Rebs + Asts",
    });
  }

  if (ws48 !== null) {
    achievements.push({
      id: "ws-48",
      value: ws48Value(ws48),
      label: "WS/48",
      title: "Win shares per 48 minutes",
    });
  }

  if (tsPct !== null) {
    achievements.push({
      id: "ts-pct",
      value: `${Math.round((tsPct > 1 ? tsPct / 100 : tsPct) * 100)}%`,
      label: "TS%",
      title: "True shooting",
    });
  }

  achievements.push({
    id: "mpg",
    value: mpg !== null ? statValue(mpg) : "--",
    label: "MPG",
    title: mpg !== null ? "Minutes per game" : "Minutes per game unavailable in the current player payload",
  });

  return achievements;
}

function weightedWs48Number(score: WeightedPer100StintScore) {
  return (score.weightedOWS48 + score.weightedDWS48) / DEFAULT_PER100_SCORE_CONFIG.winShareScale;
}

function tsStarPercentNumber(score: WeightedPer100StintScore) {
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

function tsStarValue(score: WeightedPer100StintScore) {
  const value = tsStarPercentNumber(score);

  return value === null ? "N/A" : `${Math.round(value)}%`;
}

function buildPer100StatAchievements(
  player: Player,
  selection: TeamEra,
  score: WeightedPer100StintScore | null,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  void statsEngineConfig;

  if (!score) {
    return fallbackPer100StatAchievements(player, selection, showAdjustedStats);
  }

  const rawPra = rawPraForSelection(player, selection);
  const praValue =
    showAdjustedStats || !rawPra
      ? compactPraValues(score.per100PTS, score.per100REB, score.per100AST)
      : compactPraValues(rawPra.ppg, rawPra.rpg, rawPra.apg);
  const praTitle = showAdjustedStats
    ? score.estimated
      ? "Pts + Rebs + Asts per 100 possessions, estimated from B-Ref team pace where needed"
      : "Pts + Rebs + Asts per 100 possessions"
    : "Raw Pts + Rebs + Asts per game for this team-era stint";

  return [
    {
      id: "pra",
      value: praValue,
      label: "P/R/A",
      title: praTitle,
    },
    {
      id: "ws-48",
      value: ws48Value(weightedWs48Number(score)),
      label: "WS/48",
      title: "Weighted OWS/DWS per 48 minutes",
    },
    {
      id: "ts-star",
      value: tsStarValue(score),
      label: "TS*",
      title: score.warnings.length ? score.warnings.join(" ") : "TS+ & TS% combined",
    },
    {
      id: "mpg",
      value: statValue(score.mpg),
      label: "MPG",
      title: "Minutes per game",
    },
  ];
}

function buildPer100ResultStatAchievements(
  player: Player,
  selection: TeamEra,
  score: WeightedPer100StintScore | null,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  void statsEngineConfig;

  if (!score) {
    return buildMissingAchievements(fallbackMissingSeasonForSelection(player, selection, statsEngineConfig));
  }

  const rawPra = rawPraForSelection(player, selection);
  const points = showAdjustedStats || !rawPra ? score.per100PTS : rawPra.ppg;
  const rebounds = showAdjustedStats || !rawPra ? score.per100REB : rawPra.rpg;
  const assists = showAdjustedStats || !rawPra ? score.per100AST : rawPra.apg;
  const sourceTitle = showAdjustedStats
    ? score.estimated
      ? "Per 100 possessions, estimated from B-Ref team pace where needed"
      : "Per 100 possessions"
    : "Raw per-game team-era stint average";

  return [
    {
      id: "pts",
      value: statValue(points),
      label: "PTS",
      title: `Points - ${sourceTitle}`,
    },
    {
      id: "rebs",
      value: statValue(rebounds),
      label: "REB",
      title: `Rebounds - ${sourceTitle}`,
    },
    {
      id: "asts",
      value: statValue(assists),
      label: "AST",
      title: `Assists - ${sourceTitle}`,
    },
    {
      id: "ws-48",
      value: ws48Value(weightedWs48Number(score)),
      label: "WS/48",
      title: "Weighted OWS/DWS per 48 minutes",
    },
    {
      id: "ts-star",
      value: tsStarValue(score),
      label: "TS*",
      title: score.warnings.length ? score.warnings.join(" ") : "TS+ & TS% combined",
    },
    {
      id: "mpg",
      value: statValue(score.mpg),
      label: "MPG",
      title: "Minutes per game",
    },
  ];
}

function buildMissingAchievements(score: WeightedPer100SeasonScore | null) {
  return [
    {
      id: "pra",
      value: "N/A",
      label: "P/R/A",
      title: compactMissingValue(score),
    },
  ];
}

function buildAccoladeAchievements(player: Player, selection?: TeamEra) {
  const displayPlayer = playerWithSelectionAccolades(player, selection);

  return ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const count = achievement.count(displayPlayer);

    return count > 0
      ? [
          {
            id: achievement.id,
            value: achievement.value ? achievement.value(displayPlayer) : countValue(count),
            label: achievement.label,
            title: ACHIEVEMENT_TITLE_BY_ID[achievement.id] || achievement.label,
            scoreValue: achievement.sortValue?.(displayPlayer) ?? count * achievement.weight,
          },
        ]
      : [];
  });
}

function buildPlayerAchievements(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  const score = per100StintScoreForSelection(player, selection, statsEngineConfig);
  const statAchievements = score
    ? buildPer100StatAchievements(player, selection, score, statsEngineConfig, showAdjustedStats)
    : fallbackPer100StatAchievements(player, selection, showAdjustedStats);

  return [...statAchievements, ...buildAccoladeAchievements(player, selection)];
}

function buildResultAchievements(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  const score = per100StintScoreForSelection(player, selection, statsEngineConfig);

  return [
    ...buildPer100ResultStatAchievements(player, selection, score, statsEngineConfig, showAdjustedStats),
    ...buildAccoladeAchievements(player, selection),
  ];
}

function buildRosterFeedAchievements(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
  rosterSortMode?: RosterSortMode,
) {
  const score = per100StintScoreForSelection(player, selection, statsEngineConfig);
  const statAchievements = score
    ? buildPer100StatAchievements(player, selection, score, statsEngineConfig, showAdjustedStats)
    : fallbackPer100StatAchievements(player, selection, showAdjustedStats);
  const accoladeAchievements = buildAccoladeAchievements(player, selection);
  const topAccoladeAchievements = sortAchievementsByScoreValue(accoladeAchievements).slice(0, 3);

  if (rosterSortMode === "stats") {
    return statAchievements;
  }

  if (rosterSortMode === "awards") {
    return accoladeAchievements;
  }

  return [
    ...statAchievements,
    ...topAccoladeAchievements,
  ];
}

function buildAchievementTotals(
  slots: LineupSlot[],
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  const scoreRows = slots
    .map((slot) => ({
      rawPra: rawPraForSelection(slot.player, slot.selection),
      score: per100StintScoreForSelection(slot.player, slot.selection, statsEngineConfig),
    }))
    .filter((row): row is { rawPra: RawPraLine | null; score: WeightedPer100StintScore } => Boolean(row.score));

  const statTotals =
    scoreRows.length > 0
      ? [
          {
            id: "pts",
            value: statValue(
              showAdjustedStats
                ? scoreRows.reduce((sum, row) => sum + row.score.per100PTS, 0)
                : scoreRows.reduce((sum, row) => sum + (row.rawPra?.ppg ?? row.score.per100PTS), 0),
            ),
            label: "PTS",
            title: showAdjustedStats ? "Lineup points per 100 possessions" : "Lineup raw points per game",
          },
          {
            id: "rebs",
            value: statValue(
              showAdjustedStats
                ? scoreRows.reduce((sum, row) => sum + row.score.per100REB, 0)
                : scoreRows.reduce((sum, row) => sum + (row.rawPra?.rpg ?? row.score.per100REB), 0),
            ),
            label: "REB",
            title: showAdjustedStats ? "Lineup rebounds per 100 possessions" : "Lineup raw rebounds per game",
          },
          {
            id: "asts",
            value: statValue(
              showAdjustedStats
                ? scoreRows.reduce((sum, row) => sum + row.score.per100AST, 0)
                : scoreRows.reduce((sum, row) => sum + (row.rawPra?.apg ?? row.score.per100AST), 0),
            ),
            label: "AST",
            title: showAdjustedStats ? "Lineup assists per 100 possessions" : "Lineup raw assists per game",
          },
          {
            id: "avg-ws-48",
            value: ws48Value(
              scoreRows.reduce((sum, row) => sum + weightedWs48Number(row.score), 0) / scoreRows.length,
            ),
            label: "AVG WS/48",
            title: "Avg weighted OWS/DWS per 48 minutes",
          },
          {
            id: "avg-ts-star",
            value: `${Math.round(
              scoreRows.reduce((sum, row) => sum + (tsStarPercentNumber(row.score) ?? 0), 0) / scoreRows.length,
            )}%`,
            label: "AVG TS*",
            title: "Avg TS+ & TS% combined",
          },
          {
            id: "avg-mpg",
            value: statValue(scoreRows.reduce((sum, row) => sum + row.score.mpg, 0) / scoreRows.length),
            label: "AVG MPG",
            title: "Average minutes per game",
          },
        ]
      : [
          {
            id: "pra",
            value: "N/A",
            label: "P/R/A",
            title: "No lineup seasons have enough PER 100 inputs yet",
          },
        ];

  const accoladeTotals = TOTAL_ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const total = slots.reduce(
      (sum, slot) => sum + achievement.count(playerWithSelectionAccolades(slot.player, slot.selection)),
      0,
    );

    return total > 0
      ? [
          {
            id: achievement.id,
            value: countValue(total),
            label: achievement.label,
            title: ACHIEVEMENT_TITLE_BY_ID[achievement.id] || achievement.label,
          },
        ]
      : [];
  });

  return [...statTotals, ...accoladeTotals];
}

function playerPer100StatsScore(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
) {
  return per100StintScoreForSelection(player, selection, statsEngineConfig)?.totalScore ?? 0;
}

function playerPer100AwardsScore(player: Player | undefined, selection: TeamEra | undefined) {
  if (!player) {
    return 0;
  }

  return accoladeScore(accoladesForSelection(player, selection));
}

function playerPer100MixedScore(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
) {
  return playerPer100StatsScore(player, selection, statsEngineConfig) + playerPer100AwardsScore(player, selection);
}

function positionScoreMultiplier(player: Player | undefined, assignedPosition: Position) {
  return player && player.primary_position === assignedPosition ? POSITION_FIT_MULTIPLIER : 1;
}

function lineupSlotScore(
  slot: LineupSlot | undefined,
  assignedPosition: Position,
  statsEngineConfig?: StatsEngineConfig,
) {
  if (!slot) {
    return 0;
  }

  return Number(
    (playerPer100MixedScore(slot.player, slot.selection, statsEngineConfig) * positionScoreMultiplier(slot.player, assignedPosition)).toFixed(2),
  );
}

function positionBonusForSlot(
  slot: LineupSlot | undefined,
  assignedPosition: Position,
  statsEngineConfig?: StatsEngineConfig,
): PositionBonus | undefined {
  if (!slot) {
    return undefined;
  }

  const baseScore = playerPer100MixedScore(slot.player, slot.selection, statsEngineConfig);
  const multiplier = positionScoreMultiplier(slot.player, assignedPosition);
  const points = Number((baseScore * multiplier - baseScore).toFixed(2));

  return points > 0 ? { multiplier, points } : undefined;
}

function playerHasRecordedTeamEra(player: Player, team: string, canonicalEra: string) {
  return Boolean(
    player.career_seasons?.some(
      (season) => season.team === team && getCanonicalEra(String(season.era || "")) === canonicalEra,
    ),
  );
}

function eraOptionsForTeam(players: Player[], team: string) {
  const playerEras = players.flatMap((player) =>
    (player.career_seasons ?? [])
      .filter((season) => season.team === team)
      .map((season) => getCanonicalEra(String(season.era || ""))),
  );
  const uniquePlayerEras = Array.from(new Set(playerEras)).filter((era) => teamEraExists(team, era));

  if (uniquePlayerEras.length || players.length) {
    return uniquePlayerEras.sort((a, b) => eraSortValue(a) - eraSortValue(b));
  }

  return DEFAULT_ERAS.filter((era) => teamEraExists(team, era)).sort((a, b) => eraSortValue(a) - eraSortValue(b));
}

export const per100CourtConfig = {
  mode: "per-100",
  logoLabel: "PER 100",
  scoreLabel: "PER 100 Score",
  resultStorageKey: PER100_RESULT_STORAGE_KEY,
  resultsPath: "/per-100/results",
  returnPath: "/per-100",
  resultModeLabel: "PER 100 Mode",
  howTo: {
    content: PER_100_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.per100,
  },
  seasonTiers: CLASSIC_SEASON_TIERS,
  usesStatsEngineConfig: true,
  supportsAdjustedStats: true,
  courtAchievementLimit: 3,
  badgeScoreWeights: CLASSIC_BADGE_SCORE_WEIGHTS_BY_ID,
  rosterSortOptions: ROSTER_SORT_OPTIONS,
  defaultRosterSortMode: "mixed",
  buildAchievementTotals,
  buildPlayerAchievements,
  buildResultAchievements,
  buildRosterFeedAchievements,
  rosterSortScores: {
    mixed: playerPer100MixedScore,
    stats: playerPer100StatsScore,
    awards: playerPer100AwardsScore,
  },
  eraOptionsForTeam,
  lineupSlotScore,
  playerScore: playerPer100MixedScore,
  playerHasRecordedTeamEra,
  positionBonusForSlot,
} satisfies GameCourtConfig;
