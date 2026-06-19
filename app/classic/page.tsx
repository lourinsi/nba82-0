"use client";

import GameCourt, {
  eraSortValue,
  teamEraExists,
  type Accolades,
  type AchievementDisplay,
  type ClassicPointBlock,
  type ClassicStatKey,
  type ClassicStatLine,
  type GameCourtConfig,
  type LineupSlot,
  type Player,
  type Position,
  type PositionBonus,
  type ScoringAccolades,
  type SeasonTier,
  type StatDisplay,
  type TeamEra,
} from "../GameCourt";

const DEFAULT_ERAS = ["60's", "90's", "00's", "10's", "20's"];
const ROSTER_CONTROL_BASE_CLASS =
  "h-10 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-black normal-case tracking-normal text-white outline-none transition";
const ROSTER_FEED_VIEW_OPTIONS = [
  { id: "mixed", label: "Mixed" },
  { id: "stats", label: "Stats" },
  { id: "awards", label: "Awards" },
] as const;
type RosterFeedView = (typeof ROSTER_FEED_VIEW_OPTIONS)[number]["id"];
const ROSTER_SORT_OPTIONS = [
  { id: "pra", label: "PRA" },
  { id: "stocks", label: "Stocks" },
  { id: "awards", label: "Awards" },
] as const;
type RosterSort = (typeof ROSTER_SORT_OPTIONS)[number]["id"];

const ACCOLADE_WEIGHTS = {
  mvp_count: 8,
  finals_mvp_count: 7,
  all_nba_1st: 7,
  all_nba_2nd: 5.5,
  all_nba_3rd: 4,
  championship_rings: 2.5,
  dpoy_count: 2.5,
  all_def_1st: 2,
  all_def_2nd: 1.5,
  scoring_titles: 3,
  assist_titles: 3,
  rebound_titles: 2,
  steal_titles: 1.5,
  block_titles: 1.5,
  // no more olympics point value
  all_star_mvp_count: 1,
  all_star_selections: 1,
  "6moy": 1,
  most_improved: 1,
  roy_won: 1,
  all_rookie_1st: 1,
  all_rookie_2nd: 0.75,
  seasons_played: 0.25,
  games_started: 0.01,
} satisfies Partial<Record<keyof Accolades, number>>;
const CLASSIC_ACCOLADE_SCORE_MULTIPLIER = 0.5;
const LEGACY_ENGINE_FACTORS = {
  descentExponent: 0.2,
  descentNumerator: 3.2,
  ascentMultiplier: 0.0035,
  densityBonusMultiplier: 0.1,
};
type WeightedAccoladeKey = keyof typeof ACCOLADE_WEIGHTS;

const MERGED_CLASSIC_ACCOLADE_KEYS = [
  "mvp_count",
  "finals_mvp_count",
  "dpoy_count",
  "championship_rings",
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
  "steal_titles",
  "block_titles",
  "games_started",
] as const satisfies readonly (keyof Accolades)[];
const EARLY_CLASSIC_ERA_ACCOLADE_MULTIPLIER = 0.5;

const CLASSIC_STAT_DISPLAY_ORDER: StatDisplay[] = [
  { id: "ppg", label: "PTS" },
  { id: "rpg", label: "REB" },
  { id: "apg", label: "AST" },
  { id: "spg", label: "STL" },
  { id: "bpg", label: "BLK" },
];
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
    id: "fmvp",
    label: "FMVP",
    count: (player) => player.accolades.finals_mvp_count,
    weight: ACCOLADE_WEIGHTS.finals_mvp_count,
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
  { id: "steals", label: "STL", count: (player) => player.accolades.steal_titles, weight: ACCOLADE_WEIGHTS.steal_titles },
  { id: "blocks", label: "BLK", count: (player) => player.accolades.block_titles, weight: ACCOLADE_WEIGHTS.block_titles },
  {
    id: "all-star-mvp",
    label: "ASM",
    count: (player) => player.accolades.all_star_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.all_star_mvp_count,
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
  { id: "seasons", label: "YRS", count: (player) => player.accolades.seasons_played, weight: ACCOLADE_WEIGHTS.seasons_played },
  {
    id: "games-started",
    label: "Starts",
    count: (player) => player.accolades.games_started ?? 0,
    weight: ACCOLADE_WEIGHTS.games_started,
  },
];
const TOTAL_ACHIEVEMENT_DISPLAY_ORDER = ACHIEVEMENT_DISPLAY_ORDER.filter((achievement) => achievement.id !== "goat");
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
    minScore: 29,
    minWins: 15,
    maxWins: 19,
    tier: "D (Rebuilding)",
    description: "Wait 'Til Next Year. The season was over before Christmas and the only thing developing here is depression.",
  },
  {
    minScore: 21,
    minWins: 10,
    maxWins: 14,
    tier: "D- (The Process)",
    description: "The Tank Job. Management traded everything that could dribble and is now selling patience like it is a real product.",
  },
  {
    minScore: 15,
    minWins: 5,
    maxWins: 9,
    tier: "F+ (The G-League Call-Ups)",
    description: "Opposing teams are resting their starters against you and still winning by 30. Your mascot has more trade value than half the roster.",
  },
  {
    minScore: 8,
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

function statValue(value: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
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

function mergeClassicStats(blocks: ClassicPointBlock[]) {
  const stats = {} as ClassicStatLine;

  for (const stat of CLASSIC_STAT_DISPLAY_ORDER) {
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

    stats[stat.id] = weightTotal > 0 ? Number((weightedTotal / weightTotal).toFixed(1)) : null;
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

function classicBlockForSelection(player: Player | undefined, selection: TeamEra | undefined) {
  const blocks = classicBlocksForSelection(player, selection);

  if (!blocks.length || !selection) {
    return undefined;
  }

  if (blocks.length === 1) {
    return {
      ...blocks[0],
      scoringAccolades: scoringAccoladesForBlock(blocks[0]),
    };
  }

  return {
    team: selection.team,
    era: getCanonicalEra(selection.era),
    points: weightedBlockAverage(blocks, (block) => Number(block.points ?? 0)),
    stats: mergeClassicStats(blocks),
    accolades: mergeClassicAccolades(blocks) as Accolades | undefined,
    scoringAccolades: mergeClassicAccolades(blocks, true) as ScoringAccolades | undefined,
  };
}

function playerWithClassicAccolades(player: Player, selection: TeamEra | undefined) {
  const block = classicBlockForSelection(player, selection);

  return block?.accolades ? { ...player, accolades: block.accolades } : player;
}

function buildStatAchievements(block: ClassicPointBlock | undefined) {
  if (!block) {
    return [];
  }

  return CLASSIC_STAT_DISPLAY_ORDER.map((stat) => {
    const value = Number(block?.stats?.[stat.id] ?? 0);

    return {
      id: stat.id,
      value: statValue(value),
      label: stat.label,
    };
  });
}

function buildMixedStatAchievements(block: ClassicPointBlock | undefined) {
  if (!block) {
    return [];
  }

  const points = Number(block?.stats?.ppg ?? 0);
  const rebounds = Number(block?.stats?.rpg ?? 0);
  const assists = Number(block?.stats?.apg ?? 0);
  const steals = Number(block?.stats?.spg ?? 0);
  const blocks = Number(block?.stats?.bpg ?? 0);
  const stocks = Number((steals + blocks).toFixed(1));

  return [
    { id: "ppg", value: statValue(points), label: "PTS" },
    { id: "rpg", value: statValue(rebounds), label: "REB" },
    { id: "apg", value: statValue(assists), label: "AST" },
    { id: "stocks", value: statValue(stocks), label: "STCK" },
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
          },
        ]
      : [];
  });
}

function buildAchievements(player: Player, selection?: TeamEra) {
  const block = classicBlockForSelection(player, selection);

  return [...buildStatAchievements(block), ...buildAccoladeAchievements(player, selection)];
}

function buildRosterFeedAchievements(player: Player, selection: TeamEra, rosterFeedView: RosterFeedView) {
  const block = classicBlockForSelection(player, selection);
  const accoladeAchievements = buildAccoladeAchievements(player, selection);

  if (rosterFeedView === "stats") {
    return buildStatAchievements(block);
  }

  if (rosterFeedView === "awards") {
    return accoladeAchievements;
  }

  return [...buildMixedStatAchievements(block), ...accoladeAchievements.slice(0, 3)];
}

function buildAchievementTotals(slots: LineupSlot[]) {
  const statTotals = CLASSIC_STAT_DISPLAY_ORDER.flatMap((stat) => {
    const total = slots.reduce((sum, slot) => {
      const value = Number(classicBlockForSelection(slot.player, slot.selection)?.stats?.[stat.id] ?? 0);

      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return total > 0
      ? [
          {
            id: stat.id,
            value: statValue(Number(total.toFixed(1))),
            label: stat.label,
          },
        ]
      : [];
  });
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
          },
        ]
      : [];
  });

  return [...statTotals, ...accoladeTotals];
}

function playerLegacyScore(player: Player | undefined, selection: TeamEra | undefined) {
  const block = classicBlockForSelection(player, selection);

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

  return Number((playerLegacyScore(slot.player, slot.selection) * positionScoreMultiplier(slot.player, assignedPosition)).toFixed(2));
}

function positionBonusForSlot(slot: LineupSlot | undefined, assignedPosition: Position): PositionBonus | undefined {
  if (!slot) {
    return undefined;
  }

  const baseScore = playerLegacyScore(slot.player, slot.selection);
  const multiplier = positionScoreMultiplier(slot.player, assignedPosition);
  const points = Number((baseScore * multiplier - baseScore).toFixed(2));

  return points > 0 ? { multiplier, points } : undefined;
}

function classicStatTotal(player: Player, selection: TeamEra | undefined, stats: ClassicStatKey[]) {
  return stats.reduce((sum, stat) => {
    const value = Number(classicBlockForSelection(player, selection)?.stats?.[stat] ?? 0);

    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function accoladeSortValue(player: Player, achievement: AchievementDisplay, selection: TeamEra | undefined) {
  const displayPlayer = playerWithClassicAccolades(player, selection);

  return achievement.sortValue ? achievement.sortValue(displayPlayer) : achievement.count(displayPlayer);
}

function awardHierarchySortDelta(a: Player, b: Player, selection: TeamEra | undefined) {
  for (const achievement of ACHIEVEMENT_DISPLAY_ORDER) {
    const delta = accoladeSortValue(b, achievement, selection) - accoladeSortValue(a, achievement, selection);

    if (delta) {
      return delta;
    }
  }

  return 0;
}

function rosterSortDelta(a: Player, b: Player, rosterSort: RosterSort, selection: TeamEra | undefined) {
  if (rosterSort === "pra") {
    return classicStatTotal(b, selection, ["ppg", "rpg", "apg"]) - classicStatTotal(a, selection, ["ppg", "rpg", "apg"]);
  }

  if (rosterSort === "stocks") {
    return classicStatTotal(b, selection, ["spg", "bpg"]) - classicStatTotal(a, selection, ["spg", "bpg"]);
  }

  return awardHierarchySortDelta(a, b, selection);
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

const classicCourtConfig = {
  mode: "classic",
  logoLabel: "CLASSIC",
  scoreLabel: "Classic Score",
  resultStorageKey: "nba82_classic_result",
  resultsPath: "/classic/results",
  seasonTiers: SEASON_TIERS,
  rosterControls: [
    {
      id: "rosterFeedView",
      ariaLabel: "Roster feed view",
      className: `${ROSTER_CONTROL_BASE_CLASS} w-[116px] focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20`,
      options: ROSTER_FEED_VIEW_OPTIONS,
    },
    {
      id: "rosterSort",
      ariaLabel: "Roster sort filter",
      className: `${ROSTER_CONTROL_BASE_CLASS} w-[132px] focus:border-[#ff8a2a] focus:ring-2 focus:ring-[#ff8a2a]/20`,
      options: ROSTER_SORT_OPTIONS,
    },
  ],
  defaultRosterControlValues: {
    rosterFeedView: "mixed",
    rosterSort: "pra",
  },
  courtAchievementLimit: 5,
  buildAchievementTotals,
  buildPlayerAchievements: buildAchievements,
  buildRosterFeedAchievements: (player, selection, rosterControls) =>
    buildRosterFeedAchievements(player, selection, (rosterControls.rosterFeedView ?? "mixed") as RosterFeedView),
  compareRosterPlayers: (a, b, selection, rosterControls) =>
    rosterSortDelta(a, b, (rosterControls.rosterSort ?? "pra") as RosterSort, selection),
  eraOptionsForTeam,
  lineupSlotScore,
  playerScore: playerLegacyScore,
  playerHasRecordedTeamEra,
  positionBonusForSlot,
} satisfies GameCourtConfig;

export default function ClassicPage() {
  return <GameCourt config={classicCourtConfig} />;
}
