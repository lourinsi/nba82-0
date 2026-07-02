import {
  eraSortValue,
  teamEraExists,
  type Accolades,
  type Achievement,
  type AchievementDisplay,
  type CareerSeason,
  type ClassicPointBlock,
  type ClassicStatKey,
  type ClassicStatLine,
  type GameCourtConfig,
  type LineupSlot,
  type Player,
  type Position,
  type PositionBonus,
  type RosterSortMode,
  type ScoringAccolades,
  type SeasonTier,
  type StatDisplay,
  type StatsEngineConfig,
  type TeamEra,
} from "../GameCourt";
import {
  ACHIEVEMENT_TITLE_BY_ID,
  RESULT_BADGE_SCORE_WEIGHT_BY_ID,
} from "../achievementMeta";
import { CLASSIC_HOW_TO, HOW_TO_STORAGE_KEYS, YOU_KNOW_BALL_HOW_TO } from "../howToContent";
import {
  adjustedVolumeStatsForSelection as scoringAdjustedVolumeStatsForSelection,
  calculateLeagueAdjustedStintPointsForBlock,
  isClassicVolumeMetric as scoringIsClassicVolumeMetric,
  leagueAdjustedTsHybridPercentForSeason,
  tsHybridPercentNumberForSelection,
  weightedAdjustedMetricForSelection as scoringWeightedAdjustedMetricForSelection,
  weightedRawTsPercentForSelection as scoringWeightedRawTsPercentForSelection,
  weightedTsPercentForSelection as scoringWeightedTsPercentForSelection,
} from "../scoring";

const DEFAULT_ERAS = ["60's", "90's", "00's", "10's", "20's"];

const ACCOLADE_WEIGHTS = {
  finals_mvp_count: 7.5,
  estimated_finals_mvp_count: 7.5,
  mvp_count: 5,
  aba_mvp_count: 7,
  aba_playoffs_mvp_count: 5,
  all_nba_1st: 7,
  all_nba_2nd: 5.5,
  all_nba_3rd: 4,
  aba_all_league_1st: 6,
  aba_all_league_2nd: 4,
  dpoy_count: 2.5,
  all_def_1st: 2,
  all_def_2nd: 1.5,
  aba_all_def_1st: 1.75,
  aba_all_def_2nd: 1.25,
  scoring_titles: 3,
  assist_titles: 3,
  rebound_titles: 2,
  aba_scoring_titles: 2.5,
  aba_assist_titles: 2.5,
  aba_rebound_titles: 1.75,
  three_point_titles: 2.5,
  steal_titles: 1.5,
  block_titles: 1.5,
  // no more olympics point value
  all_star_mvp_count: 1.1,
  aba_all_star_mvp_count: 1,
  three_point_contest_wins: 1,
  all_star_selections: 1,
  aba_all_star_selections: 0.8,
  championship_rings: 1,
  aba_championship_rings: 2,
  "6moy": 1,
  most_improved: 1,
  roy_won: 1.1,
  aba_rookie_of_year_count: 1,
  all_rookie_1st: 1,
  all_rookie_2nd: 0.75,
  seasons_played: 0.25,
  // games_started: 0.01,
} satisfies Partial<Record<keyof Accolades, number>>;
export const CLASSIC_BADGE_SCORE_WEIGHTS_BY_ID = RESULT_BADGE_SCORE_WEIGHT_BY_ID;
const CLASSIC_ACCOLADE_SCORE_MULTIPLIER = 0.5;
// Stored JSON points are fallback data; this is the scale baked into those cached points.
const STORED_CLASSIC_STINT_SCALING_FACTOR = 250;
const CLASSIC_STINT_SCALING_FACTOR = 250;
const LEGACY_ENGINE_FACTORS = {
  descentExponent: 0.2,
  descentNumerator: 3.2,
  ascentMultiplier: 0.0035,
  densityBonusMultiplier: 0.1,
};
type WeightedAccoladeKey = keyof typeof ACCOLADE_WEIGHTS;
type ClassicVolumeMetric = "ppg" | "rpg" | "apg" | "spg" | "bpg";

const MERGED_CLASSIC_ACCOLADE_KEYS = [
  "mvp_count",
  "finals_mvp_count",
  "estimated_finals_mvp_count",
  "aba_mvp_count",
  "aba_playoffs_mvp_count",
  "dpoy_count",
  "championship_rings",
  "aba_championship_rings",
  "most_improved",
  "6moy",
  "olympic_gold_medals",
  "olympic_silver_medals",
  "olympic_bronze_medals",
  "top_3_mvp",
  "top_10_mvp",
  "top_3_dpoy",
  "all_nba_1st",
  "all_nba_2nd",
  "all_nba_3rd",
  "aba_all_league_1st",
  "aba_all_league_2nd",
  "all_def_1st",
  "all_def_2nd",
  "aba_all_def_1st",
  "aba_all_def_2nd",
  "all_rookie_1st",
  "all_rookie_2nd",
  "all_star_selections",
  "all_star_mvp_count",
  "aba_all_star_selections",
  "aba_all_star_mvp_count",
  "aba_rookie_of_year_count",
  "seasons_played",
  "scoring_titles",
  "assist_titles",
  "rebound_titles",
  "aba_scoring_titles",
  "aba_assist_titles",
  "aba_rebound_titles",
  "three_point_titles",
  "steal_titles",
  "block_titles",
  "three_point_contest_wins",
  "games_started",
] as const satisfies readonly (keyof Accolades)[];
const EARLY_CLASSIC_ERA_ACCOLADE_MULTIPLIER = 0.5;

const CLASSIC_BOX_SCORE_DISPLAY_ORDER: StatDisplay[] = [
  { id: "ppg", label: "PTS" },
  { id: "rpg", label: "REB" },
  { id: "apg", label: "AST" },
  { id: "spg", label: "STL" },
  { id: "bpg", label: "BLK" },
];
const CLASSIC_ROSTER_STAT_DISPLAY_ORDER = [
  { id: "ppg", label: "PPG" },
  { id: "rpg", label: "RPG" },
  { id: "apg", label: "APG" },
  { id: "spg", label: "SPG" },
  { id: "bpg", label: "BPG" },
] as const satisfies readonly { id: ClassicVolumeMetric; label: string }[];
const CLASSIC_STORED_STAT_DISPLAY_ORDER: StatDisplay[] = [
  ...CLASSIC_BOX_SCORE_DISPLAY_ORDER,
  { id: "ts_pct", label: "TS%" },
  { id: "ws_48", label: "WS/48" },
];
const CLASSIC_STAT_TOOLTIPS: Record<ClassicStatKey, string> = {
  apg: "Assists per game",
  bpg: "Blocks per game",
  ppg: "Points per game",
  rpg: "Rebounds per game",
  spg: "Steals per game",
  ts_pct: "Avg True shooting",
  ws_48: "Avg Win shares per 48",
};
const CLASSIC_BASE_METRICS = ["ppg", "rpg", "apg"] as const satisfies readonly ClassicVolumeMetric[];
const CLASSIC_DEFENSIVE_METRICS = ["spg", "bpg"] as const satisfies readonly ClassicVolumeMetric[];
const ACHIEVEMENT_DISPLAY_ORDER: AchievementDisplay[] = [
  // {
  //   id: "goat",
  //   label: "GOAT",
  //   count: (player) => playerGoatRank(player),
  //   value: (player) => ordinalRank(playerGoatRank(player)),
  //   sortValue: (player) => player.goat_score ?? (playerGoatRank(player) ? 101 - playerGoatRank(player) : 0),
  //   weight: Number.POSITIVE_INFINITY,
  // },
  { id: "mvp", label: "MVP", count: (player) => player.accolades.mvp_count, weight: ACCOLADE_WEIGHTS.mvp_count },
  {
    id: "aba-mvp",
    label: "ABA MVP",
    count: (player) => player.accolades.aba_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_mvp_count,
  },
  {
    id: "fmvp",
    label: "FMVP",
    count: (player) => player.accolades.finals_mvp_count,
    weight: ACCOLADE_WEIGHTS.finals_mvp_count,
  },
  {
    id: "aba-playoffs-mvp",
    label: "ABA PMVP",
    count: (player) => player.accolades.aba_playoffs_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_playoffs_mvp_count,
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
    sortValue: (player) =>
      weightedAccoladeScore(player, ["all_nba_1st", "all_nba_2nd", "all_nba_3rd"]),
    weight: ACCOLADE_WEIGHTS.all_nba_1st,
  },
  {
    id: "aba-all-league",
    label: "ALL ABA",
    count: (player) => (player.accolades.aba_all_league_1st ?? 0) + (player.accolades.aba_all_league_2nd ?? 0),
    sortValue: (player) => weightedAccoladeScore(player, ["aba_all_league_1st", "aba_all_league_2nd"]),
    weight: ACCOLADE_WEIGHTS.aba_all_league_1st,
  },
  {
    id: "rings",
    label: "RING",
    count: (player) => player.accolades.championship_rings,
    weight: ACCOLADE_WEIGHTS.championship_rings,
  },
  {
    id: "aba-champ",
    label: "ABA CH",
    count: (player) => player.accolades.aba_championship_rings ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_championship_rings,
  },
  { id: "dpoy", label: "DPOY", count: (player) => player.accolades.dpoy_count, weight: ACCOLADE_WEIGHTS.dpoy_count },
  {
    id: "all-defense",
    label: "DEF",
    count: (player) => player.accolades.all_def_1st + player.accolades.all_def_2nd,
    sortValue: (player) => weightedAccoladeScore(player, ["all_def_1st", "all_def_2nd"]),
    weight: ACCOLADE_WEIGHTS.all_def_1st,
  },
  {
    id: "aba-all-defense",
    label: "ABA DEF",
    count: (player) => (player.accolades.aba_all_def_1st ?? 0) + (player.accolades.aba_all_def_2nd ?? 0),
    sortValue: (player) => weightedAccoladeScore(player, ["aba_all_def_1st", "aba_all_def_2nd"]),
    weight: ACCOLADE_WEIGHTS.aba_all_def_1st,
  },
  { id: "scoring", label: "SCO", count: (player) => player.accolades.scoring_titles, weight: ACCOLADE_WEIGHTS.scoring_titles },
  {
    id: "aba-scoring",
    label: "ABA SCO",
    count: (player) => player.accolades.aba_scoring_titles ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_scoring_titles,
  },
  { id: "assists", label: "AST", count: (player) => player.accolades.assist_titles, weight: ACCOLADE_WEIGHTS.assist_titles },
  {
    id: "aba-assists",
    label: "ABA AST",
    count: (player) => player.accolades.aba_assist_titles ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_assist_titles,
  },
  { id: "rebounds", label: "REB", count: (player) => player.accolades.rebound_titles, weight: ACCOLADE_WEIGHTS.rebound_titles },
  {
    id: "aba-rebounds",
    label: "ABA REB",
    count: (player) => player.accolades.aba_rebound_titles ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_rebound_titles,
  },
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
    id: "aba-all-star-mvp",
    label: "ABA ASM",
    count: (player) => player.accolades.aba_all_star_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_all_star_mvp_count,
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
  {
    id: "aba-all-star",
    label: "ABA AS",
    count: (player) => player.accolades.aba_all_star_selections ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_all_star_selections,
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
    id: "aba-roy",
    label: "ABA ROY",
    count: (player) => player.accolades.aba_rookie_of_year_count ?? 0,
    weight: ACCOLADE_WEIGHTS.aba_rookie_of_year_count,
  },
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
  // {
  //   id: "games-started",
  //   label: "Starts",
  //   count: (player) => player.accolades.games_started ?? 0,
  //   weight: ACCOLADE_WEIGHTS.games_started,
  // },
];
const TOTAL_ACHIEVEMENT_DISPLAY_ORDER = ACHIEVEMENT_DISPLAY_ORDER.filter((achievement) => achievement.id !== "goat");
export const CLASSIC_SEASON_TIERS: SeasonTier[] = [
  {
    minScore: 1000,
    minWins: 100,
    maxWins: 100,
    tier: "WTF",
    description: "THIS MIGHT BE THE BEST TEAM EVER YOU JUST BROKE 82-0 AND THE SCORE IS 100-0. The engine is crying. The database is melting.",
  },
  {
    minScore: 870,
    minWins: 82,
    maxWins: 82,
    tier: "S+ (The Immortal 82-0)",
    description: "The Absolute Pinnacle. You drafted a lineup of literal basketball Gods. This team sweeps the league, goes undefeated, and forces opposing fanbases to switch sports.",
  },
  {
    minScore: 800,
    minWins: 81,
    maxWins: 81,
    tier: "S (You're almost there buddyy...)",
    description: "A historically painful result. You built one of the greatest rosters in the history of the sport, but dropped a random Tuesday night game vs the miami heat in where Bam scored 83 POINTS!",
  },
  {
    minScore: 690,
    minWins: 74,
    maxWins: 80,
    tier: "S- (Historic Season)",
    description: "Congrats, your team just broke the regular season wins record. This squad systematically dismantles the league.",
  },
  {
    minScore: 570,
    minWins: 67,
    maxWins: 73,
    tier: "A+ (Dynasty)",
    description: "Vegas' #1 Pick. A championship-caliber team featuring a couple of absolute Hall of Fame carries. How does it feel to be the favourites to win?",
  },
  {
    minScore: 460,
    minWins: 60,
    maxWins: 66,
    tier: "A (Championship Contenders)",
    description: "The 60-Win Elite. You have the firepower and the star power.",
  },
  {
    minScore: 360,
    minWins: 54,
    maxWins: 59,
    tier: "A- (One Piece Away)",
    description: "You have the system, the depth, and the regular season aura. But when Game 7 gets ugly, everyone suddenly remembers you do not have THAT guy.",
  },
  {
    minScore: 280,
    minWins: 49,
    maxWins: 53,
    tier: "B+ (The Dark Horse)",
    description: "A dangerous team that makes every contender nervous. You are not the main character, but you are absolutely capable of ruining the script.",
  },
  {
    minScore: 210,
    minWins: 44,
    maxWins: 48,
    tier: "B (Playoff Team)",
    description: "You made the playoffs. The banner will not be raised, the documentary will not be made, but hey, at least the season mattered.",
  },
  {
    minScore: 150,
    minWins: 38,
    maxWins: 43,
    tier: "B- (Just Made The Playoffs)",
    description: "You slipped into the playoffs and immediately became someone else's warm-up round. Respectfully, the contenders are not scared.",
  },
  {
    minScore: 100,
    minWins: 33,
    maxWins: 37,
    tier: "C+ (Play-In Team)",
    description: "You fought for 82 games just to earn the honor of getting packed up on a random Wednesday night. The Play-In lights might be too bright.",
  },
  {
    minScore: 75,
    minWins: 30,
    maxWins: 33,
    tier: "C (You Suck)",
    description: "Dont know if you are trying to get to the play-in or trying to tank. Either way, the fans are confused and the front office is lying.",
  },
  {
    minScore: 55,
    minWins: 25,
    maxWins: 29,
    tier: "C- (Basketball Purgatory)",
    description: "Not good enough to compete, not bad enough to land the franchise savior. Just 82 games of fake hope and post-game press conference excuses.",
  },
  {
    minScore: 40,
    minWins: 20,
    maxWins: 24,
    tier: "D+ (Hopeless)",
    description: "The roster had names that sounded decent until basketball actually started. Now the fans are doing draft lottery math in January.",
  },
  {
    minScore: 29,
    minWins: 15,
    maxWins: 19,
    tier: "D (Rebuilding)",
    description: "Wait 'Til Next Year. The season was over before Christmas and the only thing developing here is depression.",
  },
  {
    minScore: 19,
    minWins: 10,
    maxWins: 14,
    tier: "D- (The Process)",
    description: "The Tank Job. Management traded everything that could dribble and is now selling patience like it is a real product.",
  },
  {
    minScore: 9,
    minWins: 5,
    maxWins: 9,
    tier: "F+ (The G-League Call-Ups)",
    description: "Opposing teams are resting their starters against you and still winning by 30. Your mascot has more trade value than half the roster.",
  },
  {
    minScore: 1,
    minWins: 1,
    maxWins: 4,
    tier: "F (The Basement Dwellers)",
    description: "A historically disgusting season. You are losing by 40 on national television while the commentators start talking about anything else.",
  },
  {
    minScore: Number.NEGATIVE_INFINITY,
    minWins: 0,
    maxWins: 0,
    tier: "F- (The Legendary 0-82)",
    description: "The Anti-GOATs. No wins, no aura, no shame. You successfully made every other bad team feel better about themselves.",
  }
];

function countValue(count: number) {
  return `${count}x`;
}

function achievementCountNumber(achievement: Achievement) {
  const countMatch = /^(\d+(?:\.\d+)?)x$/i.exec(achievement.value.trim());

  return countMatch ? Number(countMatch[1]) : 1;
}

function achievementScoreValue(achievement: Achievement) {
  return typeof achievement.scoreValue === "number" && Number.isFinite(achievement.scoreValue)
    ? achievement.scoreValue
    : achievementCountNumber(achievement) * (CLASSIC_BADGE_SCORE_WEIGHTS_BY_ID[achievement.id] ?? 0);
}

function sortAchievementsByScoreValue(achievements: Achievement[]) {
  return [...achievements].sort((first, second) => {
    const scoreDelta = achievementScoreValue(second) - achievementScoreValue(first);

    if (scoreDelta) {
      return scoreDelta;
    }

    const countDelta = achievementCountNumber(second) - achievementCountNumber(first);

    if (countDelta) {
      return countDelta;
    }

    return (first.title || first.label).localeCompare(second.title || second.label);
  });
}

function statValue(value: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
}

function wholeStatValue(value: unknown) {
  const numeric = numericValue(value);

  return String(Math.round(numeric ?? 0));
}

function ws48Value(value: unknown) {
  const numeric = numericValue(value);

  return numeric === null ? "0.00" : numeric.toFixed(2);
}

function tsPercentValue(value: unknown) {
  const numeric = numericValue(value);

  return numeric === null ? "0%" : `${Math.round(numeric * 100)}%`;
}

function compactPraValueFromStats(stats: ClassicStatLine | undefined) {
  return `${wholeStatValue(stats?.ppg)}/${wholeStatValue(stats?.rpg)}/${wholeStatValue(stats?.apg)}`;
}

function compactPraValue(block: ClassicPointBlock) {
  return compactPraValueFromStats(block.stats);
}

function stocksValueFromStats(stats: ClassicStatLine | undefined) {
  const steals = Number(stats?.spg ?? 0);
  const blocks = Number(stats?.bpg ?? 0);
  const total = (Number.isFinite(steals) ? steals : 0) + (Number.isFinite(blocks) ? blocks : 0);

  return statValue(Number(total.toFixed(1)));
}

function stocksValue(block: ClassicPointBlock) {
  return stocksValueFromStats(block.stats);
}

// function playerGoatRank(player: Player) {
//   const explicitRank = Number(player.goat_rank || 0);

//   if (explicitRank) {
//     return explicitRank;
//   }

//   const goatScore = Number(player.goat_score || 0);

//   return goatScore > 0 ? 101 - goatScore : 0;
// }

function numericAccoladeValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) ? numeric : 0;
}

function getCanonicalEra(era: string) {
  if (era === "40's" || era === "50's") {
    return "60's";
  }
  return era;
}

function weightedAccoladeScore(player: Player, keys: WeightedAccoladeKey[]) {
  return keys.reduce(
    (sum, key) => sum + numericAccoladeValue(player.accolades[key]) * ACCOLADE_WEIGHTS[key],
    0,
  );
}

function positiveNumber(value: unknown) {
  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function scaledClassicStintPoints(points: unknown) {
  const numeric = Number(points ?? 0);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const storedScale = positiveNumber(STORED_CLASSIC_STINT_SCALING_FACTOR) || 1;
  const activeScale = positiveNumber(CLASSIC_STINT_SCALING_FACTOR) || storedScale;

  return numeric * (activeScale / storedScale);
}

function numericValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function isClassicVolumeMetric(metric: ClassicStatKey): metric is ClassicVolumeMetric {
  return scoringIsClassicVolumeMetric(metric);
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

    if (
      typeof awardSeasonEndYear === "number" &&
      selectedSeasonYears.has(awardSeasonEndYear)
    ) {
      allStarSeasonYears.add(awardSeasonEndYear);
    }
  }

  return allStarSeasonYears.size;
}

function inferredAllStarSelectionsForSelection(player: Player, selection: TeamEra) {
  return inferredAllStarSelectionsForSeasons(player, careerSeasonsForSelection(player, selection));
}

function inferredAllStarSelectionsForBlock(player: Player, block: ClassicPointBlock) {
  return inferredAllStarSelectionsForSeasons(player, careerSeasonsForClassicBlock(player, block));
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

function runtimeClassicStintPointsForBlock(
  player: Player,
  block: ClassicPointBlock,
  statsEngineConfig: StatsEngineConfig | undefined,
) {
  return calculateLeagueAdjustedStintPointsForBlock(player, block, statsEngineConfig);
}

function classicBlockPoints(
  player: Player,
  block: ClassicPointBlock,
  statsEngineConfig: StatsEngineConfig | undefined,
) {
  return runtimeClassicStintPointsForBlock(player, block, statsEngineConfig) ?? scaledClassicStintPoints(block.points);
}

function tsHybridPercentForSeason(playerTs: number, leagueTs: number) {
  return leagueAdjustedTsHybridPercentForSeason(playerTs, leagueTs);
}

function weightedAdjustedMetricForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  metric: ClassicVolumeMetric,
) {
  return scoringWeightedAdjustedMetricForSelection(player, selection, statsEngineConfig, metric);
}

function adjustedVolumeStatsForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
): ClassicStatLine {
  return scoringAdjustedVolumeStatsForSelection(player, selection, statsEngineConfig);
}

function weightedTsPercentForSelection(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  valueForSeason: (playerTs: number, leagueTs: number) => number | null,
) {
  return scoringWeightedTsPercentForSelection(player, selection, statsEngineConfig, valueForSeason);
}

function weightedRawTsPercentForSelection(player: Player, selection: TeamEra) {
  return scoringWeightedRawTsPercentForSelection(player, selection);
}

function rawTsPercentValue(player: Player, selection: TeamEra, block: ClassicPointBlock) {
  const tsPercent = weightedRawTsPercentForSelection(player, selection);

  return tsPercent === null ? tsPercentValue(block.stats?.ts_pct) : `${Math.round(tsPercent)}%`;
}

function tsHybridPercentValue(
  player: Player,
  selection: TeamEra,
  block: ClassicPointBlock,
  statsEngineConfig: StatsEngineConfig,
) {
  const tsHybridPercent = weightedTsPercentForSelection(
    player,
    selection,
    statsEngineConfig,
    tsHybridPercentForSeason,
  );

  return tsHybridPercent === null ? tsPercentValue(block.stats?.ts_pct) : `${Math.round(tsHybridPercent)}%`;
}

function tsHybridPercentNumber(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
) {
  return tsHybridPercentNumberForSelection(player, selection, statsEngineConfig);
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

function blockStatWeight(block: ClassicPointBlock) {
  return positiveNumber(block.accolades?.games_started) || positiveNumber(block.accolades?.seasons_played) || 1;
}

function classicAccoladeMultiplier(block: ClassicPointBlock) {
  return block.era === "40's" || block.era === "50's" ? EARLY_CLASSIC_ERA_ACCOLADE_MULTIPLIER : 1;
}

function classicStatPrecision(stat: ClassicStatKey) {
  return stat === "ts_pct" || stat === "ws_48" ? 3 : 1;
}

function mergeClassicStats(blocks: ClassicPointBlock[]) {
  const stats = {} as ClassicStatLine;

  for (const stat of CLASSIC_STORED_STAT_DISPLAY_ORDER) {
    let weightedTotal = 0;
    let weightTotal = 0;

    for (const block of blocks) {
      const value = Number(block.stats?.[stat.id] ?? 0);

      if (!Number.isFinite(value) || value <= 0) {
        continue;
      }

      const weight = blockStatWeight(block);
      weightedTotal += value * weight;
      weightTotal += weight;
    }

    stats[stat.id] = weightTotal > 0 ? Number((weightedTotal / weightTotal).toFixed(classicStatPrecision(stat.id))) : null;
  }

  return stats;
}

function mergeClassicAccolades(blocks: ClassicPointBlock[], scoring = false): Accolades | ScoringAccolades | undefined {
  const blocksWithAccolades = blocks.filter((block) => block.accolades);

  if (!blocksWithAccolades.length) {
    return undefined;
  }

  const merged = { ...blocksWithAccolades[0].accolades } as Accolades;

  for (const key of MERGED_CLASSIC_ACCOLADE_KEYS) {
    const total = blocksWithAccolades.reduce(
      (sum, block) => sum + numericAccoladeValue(block.accolades?.[key]) * (scoring ? classicAccoladeMultiplier(block) : 1),
      0,
    );

    if (total > 0 || key in merged) {
      merged[key] = total as never;
    }
  }

  if (scoring) {
    (merged as ScoringAccolades).roy_won = blocksWithAccolades.reduce(
        (sum, block) => sum + numericAccoladeValue(block.accolades?.roy_won) * classicAccoladeMultiplier(block),
        0,
      );
  } else {
    merged.roy_won = blocksWithAccolades.some((block) => Boolean(block.accolades?.roy_won));
  }

  return merged;
}

function scoringAccoladesForBlock(block: ClassicPointBlock) {
  return mergeClassicAccolades([block], true) as ScoringAccolades | undefined;
}

function weightedBlockAverage(blocks: ClassicPointBlock[], value: (block: ClassicPointBlock) => number) {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const block of blocks) {
    const numericValue = value(block);

    if (!Number.isFinite(numericValue)) {
      continue;
    }

    const weight = positiveNumber(block.accolades?.seasons_played) || 1;
    weightedTotal += numericValue * weight;
    weightTotal += weight;
  }

  return weightTotal > 0 ? Number((weightedTotal / weightTotal).toFixed(2)) : 0;
}

function classicBlockForSelection(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
) {
  const blocks = classicBlocksForSelection(player, selection);

  if (!player || !blocks.length || !selection) {
    return undefined;
  }

  if (blocks.length === 1) {
    const block = blocks[0];
    const inferredAllStarSelections = inferredAllStarSelectionsForBlock(player, block);
    const accolades = withInferredAllStarSelections(block.accolades, inferredAllStarSelections);
    const scoringAccolades = withInferredAllStarSelections(
      scoringAccoladesForBlock(block),
      inferredAllStarSelections * classicAccoladeMultiplier(block),
    );

    return {
      ...block,
      accolades,
      points: classicBlockPoints(player, block, statsEngineConfig),
      scoringAccolades,
    };
  }

  const inferredAllStarSelections = inferredAllStarSelectionsForSelection(player, selection);
  const inferredScoringAllStarSelections = blocks.reduce(
    (sum, block) => sum + inferredAllStarSelectionsForBlock(player, block) * classicAccoladeMultiplier(block),
    0,
  );

  return {
    team: selection.team,
    era: getCanonicalEra(selection.era),
    points: weightedBlockAverage(blocks, (block) => classicBlockPoints(player, block, statsEngineConfig)),
    stats: mergeClassicStats(blocks),
    accolades: withInferredAllStarSelections(
      mergeClassicAccolades(blocks) as Accolades | undefined,
      inferredAllStarSelections,
    ),
    scoringAccolades: withInferredAllStarSelections(
      mergeClassicAccolades(blocks, true) as ScoringAccolades | undefined,
      inferredScoringAllStarSelections,
    ),
  };
}

function playerWithClassicAccolades(player: Player, selection: TeamEra | undefined) {
  const block = classicBlockForSelection(player, selection);

  return block?.accolades ? { ...player, accolades: block.accolades } : player;
}

function buildBoxScoreAchievements(block: ClassicPointBlock | undefined) {
  if (!block) {
    return [];
  }

  return CLASSIC_BOX_SCORE_DISPLAY_ORDER.map((stat) => {
    const value = Number(block?.stats?.[stat.id] ?? 0);

    return {
      id: stat.id,
      value: statValue(value),
      label: stat.label,
      title: CLASSIC_STAT_TOOLTIPS[stat.id],
    };
  });
}

function buildStocksAchievement(value: string, adjusted: boolean) {
  return {
    id: "stocks",
    value,
    label: "STOCKS",
    title: adjusted ? "Stls + Blks translated to latest league averages" : "Stls + Blks",
  };
}

function buildMixedStatAchievements(
  player: Player,
  selection: TeamEra,
  block: ClassicPointBlock | undefined,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  if (!block) {
    return [];
  }

  const adjustedStats = showAdjustedStats
    ? adjustedVolumeStatsForSelection(player, selection, statsEngineConfig)
    : undefined;
  const adjustedPraAvailable = CLASSIC_BASE_METRICS.every((metric) => numericValue(adjustedStats?.[metric]) !== null);
  const adjustedStocksAvailable = CLASSIC_DEFENSIVE_METRICS.every(
    (metric) => numericValue(adjustedStats?.[metric]) !== null,
  );

  return [
    {
      id: "pra",
      value: showAdjustedStats && adjustedPraAvailable ? compactPraValueFromStats(adjustedStats) : compactPraValue(block),
      label: "P/R/A",
      title: showAdjustedStats ? "Pts + Rebs + Asts translated to latest league averages" : "Pts + Rebs + Asts",
    },
    buildStocksAchievement(
      showAdjustedStats && adjustedStocksAvailable ? stocksValueFromStats(adjustedStats) : stocksValue(block),
      showAdjustedStats && adjustedStocksAvailable,
    ),
    showAdjustedStats
      ? {
          id: "ts-star",
          value: tsHybridPercentValue(player, selection, block, statsEngineConfig),
          label: "TS*",
          title: "TS+ & TS% combined",
        }
      : {
          id: "ts-pct",
          value: rawTsPercentValue(player, selection, block),
          label: "TS%",
          title: "True shooting",
        },
    { id: "ws-48", value: ws48Value(block.stats?.ws_48), label: "WS/48", title: "Win shares per 48 minutes" },
  ];
}

function buildRosterStatAchievements(
  player: Player,
  selection: TeamEra,
  block: ClassicPointBlock | undefined,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  if (!block) {
    return [];
  }

  const adjustedStats = showAdjustedStats
    ? adjustedVolumeStatsForSelection(player, selection, statsEngineConfig)
    : undefined;
  const volumeStats = CLASSIC_ROSTER_STAT_DISPLAY_ORDER.map((stat) => {
    const adjustedValue = showAdjustedStats ? numericValue(adjustedStats?.[stat.id]) : null;
    const rawValue = numericValue(block.stats?.[stat.id]);
    const value = adjustedValue ?? rawValue ?? 0;

    return {
      id: stat.id,
      value: statValue(value),
      label: stat.label,
      title:
        showAdjustedStats && adjustedValue !== null
          ? `${CLASSIC_STAT_TOOLTIPS[stat.id]} translated to latest league averages`
          : CLASSIC_STAT_TOOLTIPS[stat.id],
    };
  });

  return [
    ...volumeStats,
    showAdjustedStats
      ? {
          id: "ts-star",
          value: tsHybridPercentValue(player, selection, block, statsEngineConfig),
          label: "TS*",
          title: "TS+ & TS% combined",
        }
      : {
          id: "ts-pct",
          value: rawTsPercentValue(player, selection, block),
          label: "TS%",
          title: "True shooting",
        },
    { id: "ws-48", value: ws48Value(block.stats?.ws_48), label: "WS/48", title: "Win shares per 48 minutes" },
  ];
}

function classicAccoladeScore(
  accolades: Accolades | ScoringAccolades | undefined,
  engineSeasonsPlayed?: number,
) {
  if (!accolades) {
    return 0;
  }

  const rawBasePoints = (Object.keys(ACCOLADE_WEIGHTS) as WeightedAccoladeKey[]).reduce(
    (sum, key) => sum + numericAccoladeValue(accolades[key]) * ACCOLADE_WEIGHTS[key],
    0,
  );
  const basePoints = rawBasePoints * CLASSIC_ACCOLADE_SCORE_MULTIPLIER;
  const seasons = Math.max(
    numericAccoladeValue(engineSeasonsPlayed ?? accolades.seasons_played),
    1,
  );
  const descent = LEGACY_ENGINE_FACTORS.descentNumerator / Math.pow(seasons, LEGACY_ENGINE_FACTORS.descentExponent);
  const ascent = LEGACY_ENGINE_FACTORS.ascentMultiplier * seasons;
  const uShapeModifier = descent + ascent;
  const densityBonus = basePoints * uShapeModifier * LEGACY_ENGINE_FACTORS.densityBonusMultiplier;

  return Number((basePoints + densityBonus).toFixed(2));
}

function buildAccoladeAchievements(player: Player, selection?: TeamEra) {
  const displayPlayer = playerWithClassicAccolades(player, selection);

  return ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const count = achievement.count(displayPlayer);

    return count > 0
      ? [
          {
            id: achievement.id,
            value: achievement.value
              ? achievement.value(displayPlayer)
              : achievement.id === "seasons" ||
                  achievement.id === "games-started"
                ? String(count)
                : countValue(count),
            label: achievement.label,
            title: ACHIEVEMENT_TITLE_BY_ID[achievement.id] || achievement.label,
            scoreValue: achievement.sortValue?.(displayPlayer) ?? count * achievement.weight,
          },
        ]
      : [];
  });
}

function buildAchievements(player: Player, selection?: TeamEra) {
  const block = classicBlockForSelection(player, selection);

  return [...buildBoxScoreAchievements(block), ...buildAccoladeAchievements(player, selection)];
}

function buildResultAchievements(
  player: Player,
  selection: TeamEra,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  const block = classicBlockForSelection(player, selection);

  return [
    ...buildMixedStatAchievements(player, selection, block, statsEngineConfig, showAdjustedStats),
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
  const block = classicBlockForSelection(player, selection);
  const mixedStatAchievements = buildMixedStatAchievements(
    player,
    selection,
    block,
    statsEngineConfig,
    showAdjustedStats,
  ).map((achievement) => (achievement.id === "stocks" ? { ...achievement, label: "STKS" } : achievement));
  const statAchievements = buildRosterStatAchievements(
    player,
    selection,
    block,
    statsEngineConfig,
    showAdjustedStats,
  );
  const accoladeAchievements = buildAccoladeAchievements(player, selection);
  const topAccoladeAchievements = sortAchievementsByScoreValue(accoladeAchievements).slice(0, 3);

  if (rosterSortMode === "stats") {
    return statAchievements;
  }

  if (rosterSortMode === "awards") {
    return accoladeAchievements;
  }

  return [
    ...mixedStatAchievements,
    ...topAccoladeAchievements,
  ];
}

function classicStatValueForDisplay(
  slot: LineupSlot,
  stat: ClassicStatKey,
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  if (showAdjustedStats && isClassicVolumeMetric(stat)) {
    const adjustedValue = weightedAdjustedMetricForSelection(slot.player, slot.selection, statsEngineConfig, stat);

    if (adjustedValue !== null) {
      return adjustedValue;
    }
  }

  return numericValue(classicBlockForSelection(slot.player, slot.selection)?.stats?.[stat]);
}

function averageClassicStat(slots: LineupSlot[], stat: ClassicStatKey) {
  let total = 0;
  let count = 0;

  for (const slot of slots) {
    const value = numericValue(classicBlockForSelection(slot.player, slot.selection)?.stats?.[stat]);

    if (value === null || value <= 0) {
      continue;
    }

    total += value;
    count += 1;
  }

  return count > 0 ? total / count : null;
}

function averageTsForDisplay(
  slots: LineupSlot[],
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  if (showAdjustedStats) {
    const tsStarValues = slots
      .map((slot) => tsHybridPercentNumber(slot.player, slot.selection, statsEngineConfig))
      .filter((value): value is number => value !== null && Number.isFinite(value));

    return tsStarValues.length > 0
      ? tsStarValues.reduce((sum, value) => sum + value, 0) / tsStarValues.length
      : null;
  }

  const avgTsPct = averageClassicStat(slots, "ts_pct");

  return avgTsPct === null ? null : avgTsPct * 100;
}

function buildAchievementTotals(
  slots: LineupSlot[],
  statsEngineConfig: StatsEngineConfig,
  showAdjustedStats: boolean,
) {
  const statTotals = CLASSIC_BOX_SCORE_DISPLAY_ORDER.flatMap((stat) => {
    const total = slots.reduce((sum, slot) => {
      const value = classicStatValueForDisplay(slot, stat.id, statsEngineConfig, showAdjustedStats);
      const numeric = value ?? Number.NaN;

      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);

    return total > 0
      ? [
          {
            id: stat.id,
            value: statValue(Number(total.toFixed(1))),
            label: stat.label,
            title: CLASSIC_STAT_TOOLTIPS[stat.id],
          },
        ]
      : [];
  });
  const avgTs = averageTsForDisplay(slots, statsEngineConfig, showAdjustedStats);
  const avgWs48 = averageClassicStat(slots, "ws_48");
  const efficiencyTotals = [
    ...(avgTs !== null
      ? [
          {
            id: showAdjustedStats ? "avg-ts-star" : "avg-ts-pct",
            value: `${Math.round(avgTs)}%`,
            label: showAdjustedStats ? "AVG TS*" : "AVG TS%",
            title: showAdjustedStats ? "Avg TS+ & TS% combined" : "Avg true shooting",
          },
        ]
      : []),
    ...(avgWs48 !== null
      ? [
          {
            id: "avg-ws-48",
            value: ws48Value(avgWs48),
            label: "AVG WS/48",
            title: "Avg win shares per 48 minutes",
          },
        ]
      : []),
  ];
  const accoladeTotals = TOTAL_ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const total = slots.reduce(
      (sum, slot) => sum + achievement.count(playerWithClassicAccolades(slot.player, slot.selection)),
      0,
    );

    return total > 0
      ? [
          {
            id: achievement.id,
            value:
              achievement.id === "seasons" || achievement.id === "games-started"
                ? String(total)
                : countValue(total),
            label: achievement.label,
            title: ACHIEVEMENT_TITLE_BY_ID[achievement.id] || achievement.label,
          },
        ]
      : [];
  });

  return [...statTotals, ...efficiencyTotals, ...accoladeTotals];
}

function playerLegacyScore(
  player: Player | undefined,
  selection: TeamEra | undefined,
  statsEngineConfig?: StatsEngineConfig,
) {
  const block = classicBlockForSelection(player, selection, statsEngineConfig);

  if (!block) {
    return 0;
  }

  const statPoints = Number(block.points ?? 0);
  const classicScore =
    classicAccoladeScore(
      block.scoringAccolades ?? block.accolades,
      positiveNumber(block.accolades?.seasons_played),
    ) + (Number.isFinite(statPoints) ? statPoints : 0);

  return Number(classicScore.toFixed(2));
}

function playerClassicStatsScore(player: Player, selection: TeamEra | undefined, statsEngineConfig?: StatsEngineConfig) {
  const statPoints = Number(classicBlockForSelection(player, selection, statsEngineConfig)?.points ?? 0);

  return Number.isFinite(statPoints) ? statPoints : 0;
}

function playerClassicAwardsScore(player: Player, selection: TeamEra | undefined) {
  const block = classicBlockForSelection(player, selection);

  if (!block) {
    return 0;
  }

  return classicAccoladeScore(
    block.scoringAccolades ?? block.accolades,
    positiveNumber(block.accolades?.seasons_played),
  );
}

function positionScoreMultiplier(player: Player | undefined, assignedPosition: Position) {
  if (!player || player.primary_position !== assignedPosition) {
    return 1;
  }

  // The bonus only applies to players ranked in the top 100 GOAT list.
  // The goat_rank is 1-100, or null/0 if not ranked.
  // The goat_score is 101-rank, or 0 if not ranked.
  const isTop100Goat = (player.goat_rank && player.goat_rank >= 1 && player.goat_rank <= 100) || (player.goat_score && player.goat_score > 0);

  return isTop100Goat ? 1.10 : 1.10;
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
    (playerLegacyScore(slot.player, slot.selection, statsEngineConfig) * positionScoreMultiplier(slot.player, assignedPosition)).toFixed(2),
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

  const baseScore = playerLegacyScore(slot.player, slot.selection, statsEngineConfig);
  const multiplier = positionScoreMultiplier(slot.player, assignedPosition);
  const points = Number((baseScore * multiplier - baseScore).toFixed(2));

  return points > 0 ? { multiplier, points } : undefined;
}

function playerHasRecordedTeamEra(player: Player, team: string, canonicalEra: string) {
  return Boolean(
    player.classic_points_by_team_era?.some(
      (block) => block.team === team && getCanonicalEra(block.era) === canonicalEra,
    ),
  );
}

function eraOptionsForTeam(players: Player[], team: string) {
  const allPlayerErasForTeam = players.flatMap(
    (player) =>
      player.classic_points_by_team_era
        ?.filter((block) => block.team === team)
        .map((block) => block.era) || [],
  );

  const uniqueCanonicalPlayerEras = Array.from(new Set(allPlayerErasForTeam.map(getCanonicalEra))).filter((era) =>
    teamEraExists(team, era),
  );

  if (uniqueCanonicalPlayerEras.length || players.length) {
    return uniqueCanonicalPlayerEras.sort((a, b) => eraSortValue(a) - eraSortValue(b));
  }

  const fallbackEras = Array.from(new Set(DEFAULT_ERAS.map(getCanonicalEra))).filter((era) => teamEraExists(team, era));

  return fallbackEras.sort((a, b) => eraSortValue(a) - eraSortValue(b));
}

export const CLASSIC_RESULT_STORAGE_KEY = "nba82_classic_result";

export const classicCourtConfig = {
  mode: "classic",
  logoLabel: "CLASSIC",
  scoreLabel: "Classic Score",
  resultStorageKey: CLASSIC_RESULT_STORAGE_KEY,
  resultsPath: "/classic/results",
  returnPath: "/classic",
  resultModeLabel: "Classic Mode",
  howTo: {
    content: CLASSIC_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.classic,
  },
  seasonTiers: CLASSIC_SEASON_TIERS,
  usesStatsEngineConfig: true,
  supportsAdjustedStats: true,
  courtAchievementLimit: 3,
  badgeScoreWeights: CLASSIC_BADGE_SCORE_WEIGHTS_BY_ID,
  buildAchievementTotals,
  buildPlayerAchievements: buildAchievements,
  buildResultAchievements,
  buildRosterFeedAchievements,
  rosterSortScores: {
    mixed: playerLegacyScore,
    stats: playerClassicStatsScore,
    awards: playerClassicAwardsScore,
  },
  eraOptionsForTeam,
  lineupSlotScore,
  playerScore: playerLegacyScore,
  playerHasRecordedTeamEra,
  positionBonusForSlot,
} satisfies GameCourtConfig;

const HIDDEN_ACHIEVEMENTS: Achievement[] = [];
const hiddenAchievements = () => HIDDEN_ACHIEVEMENTS;
const neutralRosterSortScore = () => 0;

export const youKnowBallCourtConfig = {
  ...classicCourtConfig,
  logoLabel: "YOU KNOW BALL",
  scoreLabel: "You Know Ball Score",
  returnPath: "/classic/you-know-ball",
  resultModeLabel: "You Know Ball Mode",
  howTo: {
    content: YOU_KNOW_BALL_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.youKnowBall,
  },
  courtAchievementLimit: 0,
  showAdjustedStatsControl: false,
  showRosterSortControls: false,
  useRosterScoreTiebreaker: false,
  rosterSortOptions: [{ id: "name", label: "Name" }],
  defaultRosterSortMode: "name",
  buildPlayerAchievements: hiddenAchievements,
  buildRosterFeedAchievements: hiddenAchievements,
  rosterSortScores: {
    name: neutralRosterSortScore,
  },
} satisfies GameCourtConfig;
