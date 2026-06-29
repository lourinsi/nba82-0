"use client";

import GameCourt, {
  eraSortValue,
  teamEraExists,
  type Accolades,
  type AchievementDisplay,
  type GameCourtConfig,
  type LineupSlot,
  type Player,
  type Position,
  type PositionBonus,
  type RosterSortOption,
  type RosterSortScores,
  type SeasonTier,
} from "../GameCourt";
import { ALL_TIME_HOW_TO, HOW_TO_STORAGE_KEYS } from "../howToContent";

const DEFAULT_ERAS = ["60's", "90's", "00's", "10's", "20's"];

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
  games_started: 0.01,
} satisfies Partial<Record<keyof Accolades, number>>;
type WeightedAccoladeKey = keyof typeof ACCOLADE_WEIGHTS;

function sortAchievementsByWeight(achievements: AchievementDisplay[]) {
  return [...achievements].sort((a, b) => b.weight - a.weight);
}

const ACHIEVEMENT_DISPLAY_ORDER = sortAchievementsByWeight([
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
    label: "NBA",
    count: (player) => player.accolades.all_nba_1st + player.accolades.all_nba_2nd + player.accolades.all_nba_3rd,
    sortValue: (player) =>
      weightedAccoladeScore(player, ["all_nba_1st", "all_nba_2nd", "all_nba_3rd"]),
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
  {
    id: "seasons",
    label: "YRS",
    count: (player) => player.accolades.seasons_played ?? 0,
    weight: ACCOLADE_WEIGHTS.seasons_played,
  },
  {
    id: "games-started",
    label: "GS",
    count: (player) => player.accolades.games_started ?? 0,
    weight: ACCOLADE_WEIGHTS.games_started,
  },
]);
const TOTAL_ACHIEVEMENT_DISPLAY_ORDER = ACHIEVEMENT_DISPLAY_ORDER.filter((achievement) => achievement.id !== "goat");
const ROSTER_ACCOLADE_SORT_LABELS: Partial<Record<string, string>> = {
  mvp: "MVPs",
  fmvp: "FMVPs",
  "retro-fmvp": "Retro FMVPs",
  "all-nba": "All NBA",
  scoring: "Scoring Titles",
  assists: "Assist Titles",
  rebounds: "Rebound Titles",
  "three-point-title": "3PT Titles",
  rings: "Rings",
  dpoy: "DPOYs",
  "all-defense": "All Defense",
  steals: "Steal Titles",
  blocks: "Block Titles",
  "all-star-mvp": "All-Star MVPs",
  "three-point-contest": "3PT Contest",
  "all-star": "All-Stars",
  "sixth-man": "6MOYs",
  "most-improved": "MIPs",
  roy: "ROYs",
  "all-rookie-1st": "All-Rookie 1st",
  "all-rookie-2nd": "All-Rookie 2nd",
  seasons: "Seasons",
  "games-started": "Starts",
};
const ALL_TIME_ROSTER_SORT_OPTIONS: readonly RosterSortOption[] = ACHIEVEMENT_DISPLAY_ORDER.map((achievement) => ({
  id: achievement.id,
  label: ROSTER_ACCOLADE_SORT_LABELS[achievement.id] ?? achievement.label,
}));
const SEASON_TIERS: SeasonTier[] = [
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
    minScore: 28,
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
    minScore: 11,
    minWins: 5,
    maxWins: 9,
    tier: "F+ (The G-League Call-Ups)",
    description: "Opposing teams are resting their starters against you and still winning by 30. Your mascot has more trade value than half the roster.",
  },
  {
    minScore: 4,
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

// function playerGoatRank(player: Player) {
//   const explicitRank = Number(player.goat_rank || 0);

//   if (explicitRank) {
//     return explicitRank;
//   }

//   const goatScore = Number(player.goat_score || 0);

//   return goatScore > 0 ? 101 - goatScore : 0;
// }

function numericAccoladeValue(value: Accolades[keyof Accolades]) {
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

function buildRosterSortScores(achievements: AchievementDisplay[]) {
  return achievements.reduce<RosterSortScores>((scores, achievement) => {
    scores[achievement.id] = (player) => achievement.sortValue?.(player) ?? achievement.count(player);

    return scores;
  }, {});
}

const ALL_TIME_ROSTER_SORT_SCORES = buildRosterSortScores(ACHIEVEMENT_DISPLAY_ORDER);

function buildAchievements(player: Player) {
  return ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const count = achievement.count(player);

    return count > 0
      ? [
          {
            id: achievement.id,
            value: achievement.value
              ? achievement.value(player)
              : achievement.id === "seasons" ||
                  achievement.id === "games-started"
                ? String(count)
                : countValue(count),
            label: achievement.label,
          },
        ]
      : [];
  });
}

function buildAchievementTotals(players: Player[]) {
  return TOTAL_ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const total = players.reduce((sum, player) => sum + achievement.count(player), 0);

    return total > 0
      ? [
          {
            id: achievement.id,
            value:
              achievement.id === "seasons" || achievement.id === "games-started"
                ? String(total)
                : countValue(total),
            label: achievement.label,
          },
        ]
      : [];
  });
}

function playerLegacyScore(player: Player | undefined) {
  const legacyPoints = Number(player?.legacy_points ?? 0);
  // const goatScore = Number(player?.goat_score ?? 0);

  // return Number((legacyPoints + goatScore).toFixed(2));

  return Number((legacyPoints).toFixed(2));
}

function positionScoreMultiplier(player: Player | undefined, assignedPosition: Position) {
  if (!player || player.primary_position !== assignedPosition) {
    return 1;
  }

  // The bonus only applies to players ranked in the top 100 GOAT list.
  // The goat_rank is 1-100, or null/0 if not ranked.
  // The goat_score is 101-rank, or 0 if not ranked.
  const isTop100Goat = (player.goat_rank && player.goat_rank >= 1 && player.goat_rank <= 100) || (player.goat_score && player.goat_score > 0);

  return isTop100Goat ? 1.10 : 1;
}
function lineupSlotScore(slot: LineupSlot | undefined, assignedPosition: Position) {
  if (!slot) {
    return 0;
  }

  return Number((playerLegacyScore(slot.player) * positionScoreMultiplier(slot.player, assignedPosition)).toFixed(2));
}

function positionBonusForSlot(slot: LineupSlot | undefined, assignedPosition: Position): PositionBonus | undefined {
  if (!slot) {
    return undefined;
  }

  const baseScore = playerLegacyScore(slot.player);
  const multiplier = positionScoreMultiplier(slot.player, assignedPosition);
  const points = Number((baseScore * multiplier - baseScore).toFixed(2));

  return points > 0 ? { multiplier, points } : undefined;
}

function playerHasRecordedTeamEra(player: Player, team: string, canonicalEra: string) {
  if (player.team_eras?.length) {
    return player.team_eras.some(
      (teamEra) => teamEra.team === team && getCanonicalEra(teamEra.era) === canonicalEra,
    );
  }

  return player.teams.includes(team) && player.eras.some((playerEra) => getCanonicalEra(playerEra) === canonicalEra);
}

function eraOptionsForTeam(players: Player[], team: string) {
  const allPlayerErasForTeam = players.flatMap(
    (player) =>
      player.team_eras?.filter((teamEra) => teamEra.team === team).map((teamEra) => teamEra.era) ||
      (player.teams.includes(team) ? player.eras : []),
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

const allTimeCourtConfig = {
  mode: "all-time",
  logoLabel: "ALL TIME",
  scoreLabel: "Grand Legacy Score",
  resultStorageKey: "nba82_all_time_result",
  resultsPath: "/all-time/results",
  howTo: {
    content: ALL_TIME_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.allTime,
  },
  seasonTiers: SEASON_TIERS,
  rosterSortOptions: ALL_TIME_ROSTER_SORT_OPTIONS,
  defaultRosterSortMode: "mvp",
  defaultRosterSortDirection: "desc",
  courtAchievementLimit: 3,
  buildAchievementTotals: (slots) => buildAchievementTotals(slots.map((slot) => slot.player)),
  buildPlayerAchievements: (player) => buildAchievements(player),
  buildRosterFeedAchievements: (player) => buildAchievements(player),
  rosterSortScores: ALL_TIME_ROSTER_SORT_SCORES,
  eraOptionsForTeam,
  lineupSlotScore,
  playerScore: playerLegacyScore,
  playerHasRecordedTeamEra,
  positionBonusForSlot,
} satisfies GameCourtConfig;

export default function AllTimePage() {
  return <GameCourt config={allTimeCourtConfig} />;
}
