"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, FormEvent } from "react";
import { teamThemeStyle } from "./teamStyles";

type Position = "PG" | "SG" | "SF" | "PF" | "C";

type Accolades = {
  mvp_count: number;
  finals_mvp_count: number;
  dpoy_count: number;
  roy_won: boolean;
  championship_rings: number;
  most_improved?: number;
  "6moy"?: number;
  olympic_gold_medals?: number;
  olympic_silver_medals?: number;
  olympic_bronze_medals?: number;
  top_3_mvp: number;
  top_10_mvp: number;
  top_3_dpoy: number;
  all_nba_1st: number;
  all_nba_2nd: number;
  all_nba_3rd: number;
  all_def_1st: number;
  all_def_2nd: number;
  all_rookie_1st?: number;
  all_rookie_2nd?: number;
  all_star_selections: number;
  all_star_mvp_count?: number;
  seasons_played: number;
  scoring_titles: number;
  assist_titles: number;
  rebound_titles: number;
  steal_titles: number;
  block_titles: number;
};

type Player = {
  id: string;
  name: string;
  legacy_points?: number; // This is the base score from accolades
  goat_rank?: number | null; // Bleacher Report GOAT ranking (1-100)
  goat_score?: number; // Bleacher Report GOAT score (101-rank)
  positions: Position[];
  primary_position: Position;
  current_team: string | null;
  teams: string[];
  eras: string[];
  team_eras?: TeamEra[];
  accolades: Accolades;
};

type TeamEra = { team: string; era: string };
type DraftSelection = TeamEra & { eraLabel: string };
type LineupSlot = {
  player: Player;
  selection: DraftSelection;
};
type Lineup = Partial<Record<Position, LineupSlot>>;
type Achievement = { id: string; value: string; label: string };
type AchievementDisplay = {
  id: string;
  label: string;
  count: (player: Player) => number;
  value?: (player: Player) => string;
  sortValue?: (player: Player) => number;
  weight: number;
};
type PlacementStatus = "blocked" | "move" | "same" | "swap";
type SeasonTier = {
  minScore: number;
  minWins: number;
  maxWins: number;
  fixedLosses?: number;
  tier: string;
  description: string;
};
type SeasonProjection = {
  score: number;
  wins: number;
  losses: number;
  tier: string;
  description: string;
};
type ResultPlayer = {
  position: Position;
  player: {
    id: string;
    name: string;
  };
  selection: DraftSelection;
  achievements: Achievement[];
  positionBonus?: PositionBonus;
};
type PositionBonus = {
  multiplier: number;
  points: number;
};
type AllTimeResultPayload = {
  mode: "all-time";
  selectedTeam: string;
  selectedEraLabel: string;
  simulationResult: SeasonProjection;
  lineup: ResultPlayer[];
  totals: Achievement[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ALL_TIME_RESULT_STORAGE_KEY = "nba82_all_time_result";
const ADMIN_DEFAULT_TEAM = "LAL";
const ADMIN_DEFAULT_ERA = "10's";
const PUBLIC_TEAM_PLACEHOLDER = "?";
const PUBLIC_ERA_PLACEHOLDER = "?";
const PUBLIC_ROUND_COUNT = 5;
const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const POSITION_FILTER_OPTIONS = ["All", "G", "F", "C"] as const;
type PositionFilter = (typeof POSITION_FILTER_OPTIONS)[number];
const CURRENT_NBA_TEAMS = [
  "ATL",
  "BKN",
  "BOS",
  "CHA",
  "CHI",
  "CLE",
  "DAL",
  "DEN",
  "DET",
  "GSW",
  "HOU",
  "IND",
  "LAC",
  "LAL",
  "MEM",
  "MIA",
  "MIL",
  "MIN",
  "NOP",
  "NYK",
  "OKC",
  "ORL",
  "PHI",
  "PHX",
  "POR",
  "SAC",
  "SAS",
  "TOR",
  "UTA",
  "WAS",
]; // The '40s and '50s eras are now combined into the '60s era for display and filtering purposes.
const TEAM_FIRST_ERAS: Record<string, string> = { // Updated to reflect the combined '40s, '50s, and '60s era.
  ATL: "60's",
  BKN: "60's",
  BOS: "60's",
  CHA: "80's",
  CHI: "60's",
  CLE: "70's",
  DAL: "80's",
  DEN: "60's",
  DET: "60's",
  GSW: "60's",
  HOU: "60's",
  IND: "60's",
  LAC: "70's",
  LAL: "60's",
  MEM: "90's",
  MIA: "80's",
  MIL: "60's",
  MIN: "80's",
  NOP: "00's",
  NYK: "60's",
  OKC: "60's",
  ORL: "80's",
  PHI: "60's",
  PHX: "60's",
  POR: "70's",
  SAC: "60's",
  SAS: "60's",
  TOR: "90's",
  UTA: "70's",
  WAS: "60's",
};
const DEFAULT_ERAS = ["60's", "90's", "00's", "10's", "20's"]; // Added '60s as a default era option.
const SPIN_DURATION_MS = 1320;
const SPIN_TICK_MS = 72;
type SpinTileStyle = CSSProperties & {
  "--spin-primary": string;
  "--spin-accent": string;
  "--spin-kicker": string;
  "--spin-number": string;
};
type SpinTarget = "all" | "team" | "era";
const UNKNOWN_SPIN_TILE_STYLE: SpinTileStyle = {
  "--spin-primary": "#202637",
  "--spin-accent": "#aeb4c2",
  "--spin-kicker": "#cfd3df",
  "--spin-number": "#f4f2ec",
};
const ERA_TILE_STYLES: Record<string, SpinTileStyle> = { // '40s and '50s now use the '60s style.
  // "40's": {
  //   "--spin-primary": "#574536",
  //   "--spin-accent": "#c89b5f",
  //   "--spin-kicker": "#ffdba8",
  //   "--spin-number": "#fff7e6",
  // },
  // "50's": {
  //   "--spin-primary": "#24504a",
  //   "--spin-accent": "#7ad7c8",
  //   "--spin-kicker": "#aaf5ea",
  //   "--spin-number": "#f0fffc",
  // },
  "60's": {
    "--spin-primary": "#254772",
    "--spin-accent": "#ffcf56",
    "--spin-kicker": "#ffe6a1",
    "--spin-number": "#ffffff",
  },
  "70's": {
    "--spin-primary": "#6d371d",
    "--spin-accent": "#ff8f35",
    "--spin-kicker": "#ffc08a",
    "--spin-number": "#fff3df",
  },
  "80's": {
    "--spin-primary": "#25246d",
    "--spin-accent": "#ff4fc4",
    "--spin-kicker": "#ffb4e8",
    "--spin-number": "#ffffff",
  },
  "90's": {
    "--spin-primary": "#1d1d22",
    "--spin-accent": "#e23d3d",
    "--spin-kicker": "#ff9292",
    "--spin-number": "#ffffff",
  },
  "00's": {
    "--spin-primary": "#183b72",
    "--spin-accent": "#c7d1df",
    "--spin-kicker": "#e9f1fb",
    "--spin-number": "#ffffff",
  },
  "10's": {
    "--spin-primary": "#123f46",
    "--spin-accent": "#31d6a1",
    "--spin-kicker": "#89f0cd",
    "--spin-number": "#ffffff",
  },
  "20's": {
    "--spin-primary": "#321a66",
    "--spin-accent": "#7de0ff",
    "--spin-kicker": "#b6f0ff",
    "--spin-number": "#ffffff",
  },
};
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
} satisfies Partial<Record<keyof Accolades, number>>;
type WeightedAccoladeKey = keyof typeof ACCOLADE_WEIGHTS;

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
    label: "ALL NBA",
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
    label: "ALL DEF",
    count: (player) => player.accolades.all_def_1st + player.accolades.all_def_2nd,
    sortValue: (player) => weightedAccoladeScore(player, ["all_def_1st", "all_def_2nd"]),
    weight: ACCOLADE_WEIGHTS.all_def_1st,
  },
  { id: "scoring", label: "SCORING", count: (player) => player.accolades.scoring_titles, weight: ACCOLADE_WEIGHTS.scoring_titles },
  { id: "assists", label: "ASSISTS", count: (player) => player.accolades.assist_titles, weight: ACCOLADE_WEIGHTS.assist_titles },
  { id: "rebounds", label: "REBOUNDS", count: (player) => player.accolades.rebound_titles, weight: ACCOLADE_WEIGHTS.rebound_titles },
  { id: "steals", label: "STEALS", count: (player) => player.accolades.steal_titles, weight: ACCOLADE_WEIGHTS.steal_titles },
  { id: "blocks", label: "BLOCKS", count: (player) => player.accolades.block_titles, weight: ACCOLADE_WEIGHTS.block_titles },
  {
    id: "all-star-mvp",
    label: "AS MVP",
    count: (player) => player.accolades.all_star_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.all_star_mvp_count,
  },
  {
    id: "all-star",
    label: "ALL-STAR",
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
    label: "ROOK1",
    count: (player) => player.accolades.all_rookie_1st ?? 0,
    weight: ACCOLADE_WEIGHTS.all_rookie_1st,
  },
  {
    id: "all-rookie-2nd",
    label: "ROOK2",
    count: (player) => player.accolades.all_rookie_2nd ?? 0,
    weight: ACCOLADE_WEIGHTS.all_rookie_2nd,
  },
  { id: "seasons", label: "SEASONS", count: (player) => player.accolades.seasons_played, weight: ACCOLADE_WEIGHTS.seasons_played },
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

function buildAchievements(player: Player) {
  return ACHIEVEMENT_DISPLAY_ORDER.flatMap((achievement) => {
    const count = achievement.count(player);

    return count > 0
      ? [
          {
            id: achievement.id,
            value: achievement.value ? achievement.value(player) : achievement.id === "seasons" ? String(count) : countValue(count),
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
            value: achievement.id === "seasons" ? String(total) : countValue(total),
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

  return isTop100Goat ? 1.15 : 1;
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

function achievementPriorityValue(player: Player, achievementId: string) {
  const achievement = ACHIEVEMENT_DISPLAY_ORDER.find((candidate) => candidate.id === achievementId);

  if (!achievement) {
    return 0;
  }

  return achievement.sortValue ? achievement.sortValue(player) : achievement.count(player);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function eraSortValue(era: string) {
  const canonicalEra = getCanonicalEra(era); // Use canonical era for sorting
  const decade = Number(canonicalEra.slice(0, 2));

  if (Number.isNaN(decade)) {
    return 9999;
  }

  return decade >= 60 ? 1900 + decade : 2000 + decade; // Adjusted for '60s as earliest canonical
}

function fullEraLabel(era: string) {
  const canonicalEra = getCanonicalEra(era); // Use canonical era for labeling
  const decade = Number(canonicalEra.slice(0, 2));

  if (Number.isNaN(decade)) {
    return canonicalEra;
  }
  return `${decade >= 40 ? 1900 + decade : 2000 + decade}s`;
}

function buildDraftSelection(team: string, era: string): DraftSelection {
  return {
    team,
    era,
    eraLabel: fullEraLabel(era),
  };
}

function teamEraExists(team: string, era: string) {
  const firstEra = TEAM_FIRST_ERAS[team];

  return !firstEra || eraSortValue(getCanonicalEra(era)) >= eraSortValue(firstEra);
}

function playerHasRecordedTeamEra(player: Player, team: string, canonicalEra: string) {
  if (player.team_eras?.length) {
    return player.team_eras.some(
      (teamEra) => teamEra.team === team && getCanonicalEra(teamEra.era) === canonicalEra,
    );
  }

  return (
    player.teams.includes(team) &&
    player.eras.some((playerEra) => getCanonicalEra(playerEra) === canonicalEra)
  );
}

function playerMatchesTeamEra(player: Player, team: string, era: string) {
  const canonicalSelectedEra = getCanonicalEra(era);

  if (player.team_eras?.length) {
    return playerHasRecordedTeamEra(player, team, canonicalSelectedEra);
  }

  return teamEraExists(team, era) && playerHasRecordedTeamEra(player, team, canonicalSelectedEra);
}

function eraOptionsForTeam(players: Player[], team: string) {
  const allPlayerErasForTeam = players.flatMap(
    (player) =>
      player.team_eras?.filter((teamEra) => teamEra.team === team).map((teamEra) => teamEra.era) ||
      (player.teams.includes(team) ? player.eras : []),
  );

  const uniqueCanonicalPlayerEras = Array.from(new Set(allPlayerErasForTeam.map(getCanonicalEra)));

  if (uniqueCanonicalPlayerEras.length || players.length) {
    return uniqueCanonicalPlayerEras.sort((a, b) => eraSortValue(a) - eraSortValue(b));
  }

  const fallbackEras = Array.from(new Set(DEFAULT_ERAS.map(getCanonicalEra))).filter((era) => teamEraExists(team, era));

  return fallbackEras.sort((a, b) => eraSortValue(a) - eraSortValue(b));
}

function playerMatchesPositionFilter(player: Player, filter: PositionFilter) {
  if (filter === "All") {
    return true;
  }

  if (filter === "G") {
    return player.positions.some((position) => position === "PG" || position === "SG");
  }

  if (filter === "F") {
    return player.positions.some((position) => position === "SF" || position === "PF");
  }

  return player.positions.includes("C");
}

function currentPositionForPlayer(lineup: Lineup, playerId: string) {
  return POSITIONS.find((position) => lineup[position]?.player.id === playerId) ?? null;
}

function placementStatus(lineup: Lineup, player: Player, target: Position): PlacementStatus {
  if (!player.positions.includes(target)) {
    return "blocked";
  }

  const source = currentPositionForPlayer(lineup, player.id);
  const targetPlayer = lineup[target]?.player;

  if (source === target) {
    return "same";
  }

  if (!targetPlayer) {
    return "move";
  }

  if (!source) {
    return "move";
  }

  if (source && targetPlayer.positions.includes(source)) {
    return "swap";
  }

  return "blocked";
}

function playerInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (initials.length >= 2) {
    return initials.slice(0, 2);
  }

  const fallback = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return fallback.slice(0, 2).padEnd(2, fallback[0] ?? "?");
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDifferentItem<T>(items: T[], current: T) {
  const options = items.length > 1 ? items.filter((item) => item !== current) : items;

  return randomItem(options);
}

function randomDraftSelection(players: Player[], teamOptions: string[], currentTeam?: string, currentEra?: string) {
  const teamsWithEraData = teamOptions.filter((team) => eraOptionsForTeam(players, team).length > 0);
  const validTeamOptions = teamsWithEraData.length ? teamsWithEraData : teamOptions;
  const team = currentTeam ? randomDifferentItem(validTeamOptions, currentTeam) : randomItem(validTeamOptions);
  const eras = eraOptionsForTeam(players, team);
  const fallbackEras = DEFAULT_ERAS.filter((era) => teamEraExists(team, era));
  const eraOptions = eras.length ? eras : fallbackEras.length ? fallbackEras : DEFAULT_ERAS;
  const era = currentEra ? randomDifferentItem(eraOptions, currentEra) : randomItem(eraOptions);

  return buildDraftSelection(team, era);
}

function teamOptionsForEra(players: Player[], teamOptions: string[], era: string) {
  const canonicalEra = getCanonicalEra(era);
  const validTeams = teamOptions.filter((team) => {
    const eras = eraOptionsForTeam(players, team);

    return eras.includes(canonicalEra);
  });

  return validTeams;
}

function randomTeamSelectionForEra(players: Player[], teamOptions: string[], era: string, currentTeam: string) {
  const validTeams = teamOptionsForEra(players, teamOptions, era);

  if (!validTeams.length) {
    return randomDraftSelection(players, teamOptions, currentTeam, era);
  }

  const team = randomDifferentItem(validTeams, currentTeam);

  return buildDraftSelection(team, era);
}

function randomEraSelectionForTeam(players: Player[], team: string, currentEra: string) {
  const eras = eraOptionsForTeam(players, team);
  const validEras = eras.length ? eras : DEFAULT_ERAS.filter((era) => teamEraExists(team, era));
  const era = randomDifferentItem(validEras.length ? validEras : DEFAULT_ERAS, currentEra);

  return buildDraftSelection(team, era);
}

function teamSpinTileStyle(team: string): SpinTileStyle {
  if (team === PUBLIC_TEAM_PLACEHOLDER) {
    return UNKNOWN_SPIN_TILE_STYLE;
  }

  const theme = teamThemeStyle(team);

  return {
    "--spin-primary": theme["--team-primary"],
    "--spin-accent": theme["--team-secondary"],
    "--spin-kicker": theme["--team-readable-secondary"],
    "--spin-number": theme["--team-readable-number"],
  };
}

function eraSpinTileStyle(era: string): SpinTileStyle {
  if (era === PUBLIC_ERA_PLACEHOLDER) {
    return UNKNOWN_SPIN_TILE_STYLE;
  }

  return ERA_TILE_STYLES[getCanonicalEra(era)] ?? ERA_TILE_STYLES["20's"]; // Use canonical era for style
}

function formatLegacyScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function playerIsStephCurry(player: Player) {
  return normalizeName(player.name) === "stephen curry";
}

function projectSeasonRecord(score: number, hasStephCurry: boolean): SeasonProjection {
  const tier = SEASON_TIERS.find((candidate) => score >= candidate.minScore) ?? SEASON_TIERS[SEASON_TIERS.length - 1];
  const wins = tier.minWins === tier.maxWins ? tier.minWins : randomInteger(tier.minWins, tier.maxWins);
  const losses = Math.max(0, tier.fixedLosses ?? 82 - wins);
  const isHistoricStephRun = tier.tier === "S- (Historic Season)" && hasStephCurry;
  const description =
    isHistoricStephRun || (wins === 73 && losses === 9)
      ? "What a historic season, beat the bulls record, you got the unanimous MVP, you are now up 3-1 in the finals, what could go wrong?"
      : tier.description;

  return {
    score,
    wins,
    losses,
    tier: tier.tier,
    description,
  };
}

export default function Home() {
  const router = useRouter();
  const courtRef = useRef<HTMLDivElement | null>(null);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(PUBLIC_TEAM_PLACEHOLDER);
  const [selectedEra, setSelectedEra] = useState(PUBLIC_ERA_PLACEHOLDER);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("All");
  const [accoladePriority, setAccoladePriority] = useState("goat");
  const [rosterSearch, setRosterSearch] = useState("");
  const [lineup, setLineup] = useState<Lineup>({});
  const [selectedSlot, setSelectedSlot] = useState<Position | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [draggedFromPosition, setDraggedFromPosition] = useState<Position | null>(null);
  const [publicRoundsSpent, setPublicRoundsSpent] = useState(0);
  const [awaitingPublicPick, setAwaitingPublicPick] = useState(false);
  const [publicTeamSwapUsed, setPublicTeamSwapUsed] = useState(false);
  const [publicEraSwapUsed, setPublicEraSwapUsed] = useState(false);
  const [, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinningTarget, setSpinningTarget] = useState<SpinTarget | null>(null);
  const isSpinning = spinningTarget !== null;
  const spinStatusLabel =
    spinningTarget === "team" ? "TEAM SPINNING..." : spinningTarget === "era" ? "ERA SPINNING..." : "SPINNING...";

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayers() {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/players`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = (await response.json()) as Player[];
        setPlayers(data);
        setError(null);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch players");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAdminSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await response.json()) as { admin?: boolean };

        if (!active) {
          return;
        }

        setIsAdmin(Boolean(data.admin));

        if (data.admin) {
          setSelectedTeam((currentTeam) =>
            currentTeam === PUBLIC_TEAM_PLACEHOLDER ? ADMIN_DEFAULT_TEAM : currentTeam,
          );
          setSelectedEra((currentEra) =>
            currentEra === PUBLIC_ERA_PLACEHOLDER ? ADMIN_DEFAULT_ERA : currentEra,
          );
        }
      } catch {
        if (active) {
          setIsAdmin(false);
        }
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    }

    checkAdminSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }

      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    },
    [],
  );

  const teamOptions = CURRENT_NBA_TEAMS;
  const hasSelectedTeam = selectedTeam !== PUBLIC_TEAM_PLACEHOLDER;
  const hasSelectedEra = selectedEra !== PUBLIC_ERA_PLACEHOLDER;

  const eraOptions = useMemo(
    () => (hasSelectedTeam ? eraOptionsForTeam(players, selectedTeam) : []),
    [hasSelectedTeam, players, selectedTeam],
  );
  const activeEra = hasSelectedEra
    ? eraOptions.includes(selectedEra)
      ? selectedEra
      : eraOptions[eraOptions.length - 1] ?? selectedEra
    : PUBLIC_ERA_PLACEHOLDER;
  const hasActiveDraftSelection = hasSelectedTeam && activeEra !== PUBLIC_ERA_PLACEHOLDER;
  const publicGameComplete = publicRoundsSpent >= PUBLIC_ROUND_COUNT && !awaitingPublicPick;
  const publicSpinAllowed =
    authChecked &&
    !loading &&
    !error &&
    !isAdmin &&
    !isSpinning &&
    !awaitingPublicPick &&
    publicRoundsSpent < PUBLIC_ROUND_COUNT;
  const publicTeamSwapAllowed =
    authChecked &&
    !loading &&
    !error &&
    !isAdmin &&
    hasActiveDraftSelection &&
    awaitingPublicPick &&
    !publicTeamSwapUsed &&
    !isSpinning;
  const publicEraSwapAllowed =
    authChecked &&
    !loading &&
    !error &&
    !isAdmin &&
    hasActiveDraftSelection &&
    awaitingPublicPick &&
    !publicEraSwapUsed &&
    !isSpinning;
  const rosterSelectionDisabled =
    !isAdmin && (!authChecked || !hasActiveDraftSelection || !awaitingPublicPick || isSpinning || publicGameComplete);
  const publicDisplayRound = Math.min(
    publicRoundsSpent + (!awaitingPublicPick && publicRoundsSpent < PUBLIC_ROUND_COUNT ? 1 : 0),
    PUBLIC_ROUND_COUNT,
  );
  const showPublicRosterSpinCta = publicSpinAllowed && publicRoundsSpent > 0;

  const selectedPlayerIds = useMemo(
    () =>
      new Set(
        Object.values(lineup).flatMap((slot) => (slot ? [slot.player.id] : [])),
      ),
    [lineup],
  );
  const normalizedRosterSearch = useMemo(() => normalizeName(rosterSearch), [rosterSearch]);

  const filteredPlayers = useMemo(
    () =>
      (hasActiveDraftSelection ? players : [])
        .filter((player) => playerMatchesTeamEra(player, selectedTeam, activeEra))
        .filter((player) => !selectedPlayerIds.has(player.id))
        .filter((player) => playerMatchesPositionFilter(player, positionFilter))
        .filter((player) => {
          if (!normalizedRosterSearch) {
            return true;
          }

          return normalizeName(`${player.name} ${playerInitials(player.name)} ${player.positions.join(" ")}`).includes(
            normalizedRosterSearch,
          );
        })
        .sort((a, b) => {
          const accoladeDelta =
            achievementPriorityValue(b, accoladePriority) - achievementPriorityValue(a, accoladePriority);

          if (accoladeDelta) {
            return accoladeDelta;
          }

          const legacyDelta = playerLegacyScore(b) - playerLegacyScore(a);

          return legacyDelta || a.name.localeCompare(b.name);
        }),
    [
      accoladePriority,
      activeEra,
      hasActiveDraftSelection,
      normalizedRosterSearch,
      players,
      positionFilter,
      selectedPlayerIds,
      selectedTeam,
    ],
  );

  const draggedPlayer = useMemo(
    () => players.find((player) => player.id === draggedPlayerId) ?? null,
    [draggedPlayerId, players],
  );

  const dropStatuses = useMemo(
    () =>
      Object.fromEntries(
        POSITIONS.map((position) => {
          if (!draggedPlayer || (isSpinning && !isAdmin)) return [position, "blocked"];
          const status = placementStatus(lineup, draggedPlayer, position);

          if (isAdmin) return [position, status];

          // Public mode: 
          // 1. Swapping/Moving on the court (draggedFromPosition is not null) is allowed.
          // 2. Roster to court (draggedFromPosition is null) is allowed only if target slot is empty.
          if (draggedFromPosition !== null) {
            return [position, status === "move" || status === "swap" || status === "same" ? status : "blocked"];
          }
          return [position, (status === "move" && !lineup[position]) || status === "same" ? status : "blocked"];
        }),
      ) as Record<Position, PlacementStatus>,
    [draggedPlayer, isAdmin, lineup, draggedFromPosition, isSpinning],
  );

  const lineupComplete = POSITIONS.every((position) => Boolean(lineup[position]));
  const lineupEntries = useMemo(
    () =>
      POSITIONS.flatMap((position) => {
        const slot = lineup[position];

        return slot ? [{ position, player: slot.player, selection: slot.selection }] : [];
      }),
    [lineup],
  );
  const lineupAchievementTotals = useMemo(
    () => buildAchievementTotals(lineupEntries.map(({ player }) => player)),
    [lineupEntries],
  );
  const teamLegacyScore = Number(
    POSITIONS.reduce(
      (sum, position) => sum + lineupSlotScore(lineup[position], position),
      0,
    ).toFixed(2),
  );
  const lineupHasStephCurry = POSITIONS.some((position) => {
    const player = lineup[position]?.player;

    return player ? playerIsStephCurry(player) : false;
  });
  const teamTileSpinning = spinningTarget === "all" || spinningTarget === "team";
  const eraTileSpinning = spinningTarget === "all" || spinningTarget === "era";

  const simulateSeason = useCallback(() => {
    if (!lineupComplete) {
      setStatus("Fill all five court slots before simulating.");
      return;
    }

    const result = projectSeasonRecord(teamLegacyScore, lineupHasStephCurry);
    const payload: AllTimeResultPayload = {
      mode: "all-time",
      selectedTeam,
      selectedEraLabel: fullEraLabel(activeEra),
      simulationResult: result,
      lineup: lineupEntries.map(({ position, player, selection }) => ({
        position,
        player: {
          id: player.id,
          name: player.name,
        },
        selection,
        achievements: buildAchievements(player),
        positionBonus: positionBonusForSlot(lineup[position], position),
      })),
      totals: lineupAchievementTotals,
    };

    sessionStorage.setItem(ALL_TIME_RESULT_STORAGE_KEY, JSON.stringify(payload));
    setStatus(`${result.tier}: ${result.wins}-${result.losses}`);
    router.push("/all-time/results");
  }, [
    activeEra,
    lineup,
    lineupAchievementTotals,
    lineupComplete,
    lineupEntries,
    lineupHasStephCurry,
    router,
    selectedTeam,
    teamLegacyScore,
  ]);

  const hasAutoSimulated = useRef(false);

  useEffect(() => {
    if (lineupComplete && !isAdmin && !isSpinning) {
      if (!hasAutoSimulated.current) {
        hasAutoSimulated.current = true;
        simulateSeason();
      }
    } else {
      hasAutoSimulated.current = false;
    }
  }, [lineupComplete, isAdmin, isSpinning, simulateSeason]);

  function enterAdminMode() {
    setIsAdmin(true);
    setAuthPanelOpen(false);
    setLoginError(null);
    setLoginPassword("");
    setSelectedTeam((currentTeam) => (currentTeam === PUBLIC_TEAM_PLACEHOLDER ? ADMIN_DEFAULT_TEAM : currentTeam));
    setSelectedEra((currentEra) => (currentEra === PUBLIC_ERA_PLACEHOLDER ? ADMIN_DEFAULT_ERA : currentEra));
    setAwaitingPublicPick(false);
    setPublicRoundsSpent(0);
    setPublicTeamSwapUsed(false);
    setPublicEraSwapUsed(false);
  }

  function resetPublicGame() {
    setSelectedTeam(PUBLIC_TEAM_PLACEHOLDER);
    setSelectedEra(PUBLIC_ERA_PLACEHOLDER);
    setLineup({});
    setSelectedSlot(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setPublicRoundsSpent(0);
    setAwaitingPublicPick(false);
    setPublicTeamSwapUsed(false);
    setPublicEraSwapUsed(false);
  }

  function handlePublicReset() {
    resetPublicGame();
    setAuthPanelOpen(false);
    setLoginError(null);
    setStatus("Public draft reset.");
  }

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = (await response.json()) as { admin?: boolean; message?: string };

      if (!response.ok || !data.admin) {
        setLoginError(data.message ?? "Unable to sign in.");
        return;
      }

      enterAdminMode();
    } catch {
      setLoginError("Unable to sign in right now.");
    } finally {
      setLoginPending(false);
    }
  }

  async function handleAdminLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    setAuthPanelOpen(false);
    resetPublicGame();
    setStatus("Returned to public mode.");
  }

  function handleCourtSlotSelect(position: Position) {
    if (!isAdmin && lineup[position]) {
      setStatus("Public lineup slots lock once filled.");
      return;
    }

    setSelectedSlot((current) => (current === position ? null : position));
  }

  function rosterPlayerSelectable(player: Player) {
    if (isAdmin) {
      return true;
    }

    if (rosterSelectionDisabled) {
      return false;
    }

    if (selectedSlot) {
      return !lineup[selectedSlot] && player.positions.includes(selectedSlot);
    }

    return player.positions.some((position) => !lineup[position]);
  }

  function assignPlayer(player: Player, preferredPosition?: Position, allowReplace = false) {
    if (isSpinning) {
      setStatus("Wait for the spin to finish before assigning a player.");
      return false;
    }

    const source = currentPositionForPlayer(lineup, player.id);

    if (!isAdmin) {
      // Swapping within the court is always allowed in public mode.
      // Picking from the roster (source is null) is only allowed when awaiting a pick.
      if (!source) { // Player is from roster
        if (rosterSelectionDisabled) {
          setStatus(publicGameComplete ? "Draft complete." : "Spin before choosing the next player.");
          return false;
        }
        if (preferredPosition) {
          const status = placementStatus(lineup, player, preferredPosition);

          if (status === "blocked" || lineup[preferredPosition]) {
            setStatus("Public slots are locked once filled. Use admin mode to replace players.");
            return false;
          }
        }
        allowReplace = false;
      }
    }

    const target =
      preferredPosition ??
      [player.primary_position, ...player.positions.filter((p) => p !== player.primary_position)]
        .find((position) => {
          const status = placementStatus(lineup, player, position);
          return (status === "move" && (allowReplace || !lineup[position])) || status === "same";
        });

    if (!target) {
      setStatus(`${player.name} has no open eligible slot.`);
      setSelectedSlot(null);
      return false;
    }

    if (!player.positions.includes(target)) {
      setStatus(`${player.name} is ${player.positions.join("/")} and cannot be slotted at ${target}.`);
      setSelectedSlot(null);
      return false;
    }

    const status = placementStatus(lineup, player, target);
    const targetSlot = lineup[target];
    const targetPlayer = targetSlot?.player;

    if (status === "same") {
      setSelectedSlot(null);
      setStatus(`${player.name} is already assigned to ${target}.`);
      return false;
    }

    if (status === "blocked" || (!allowReplace && targetPlayer && !source)) {
      const detail =
        targetPlayer && source
          ? `${targetPlayer.name} cannot move to ${source}.`
          : `${target} is already occupied.`;

      setStatus(`${player.name} was not moved. ${detail}`);
      setSelectedSlot(null);
      return false;
    }

    const replacedPlayer = allowReplace ? targetPlayer : null;

    setLineup((currentLineup) => {
      const next = { ...currentLineup };
      const currentSource = currentPositionForPlayer(currentLineup, player.id);
      const existingSlot = currentSource ? currentLineup[currentSource] : null;
      const selection = existingSlot?.selection ?? buildDraftSelection(selectedTeam, activeEra);
      const targetSlot = next[target];

      if (currentSource) {
        delete next[currentSource];
      }

      next[target] = { player, selection };

      if (status === "swap" && currentSource && targetSlot) {
        next[currentSource] = targetSlot;
      }

      return next;
    });
    setSelectedSlot(null);
    setStatus(
      status === "swap" && source && targetPlayer
        ? `${player.name} swapped to ${target}; ${targetPlayer.name} moved to ${source}.`
        : replacedPlayer
          ? `${player.name} replaced ${replacedPlayer.name} at ${target}.`
        : `${player.name} assigned to ${target}.`,
    );
    if (!isAdmin && !source) {
      setAwaitingPublicPick(false);
    }
    return true;
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, player: Player, sourcePosition: Position | null = null) {
    if (isSpinning && !isAdmin) {
      setStatus("Wait for the spin to finish before moving players.");
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-player-id", player.id);
    event.dataTransfer.setData("application/x-source-position", sourcePosition ?? "");
    event.dataTransfer.setData("text/plain", player.name);
    setDraggedPlayerId(player.id);
    setDraggedFromPosition(sourcePosition);
    setSelectedSlot(null);
  }

  function dragEndedInsideCourt(event: DragEvent<HTMLButtonElement>) {
    const courtBounds = courtRef.current?.getBoundingClientRect();

    if (!courtBounds) {
      return false;
    }

    return (
      event.clientX >= courtBounds.left &&
      event.clientX <= courtBounds.right &&
      event.clientY >= courtBounds.top &&
      event.clientY <= courtBounds.bottom
    );
  }

  function handleDragEnd(event: DragEvent<HTMLButtonElement>) {
    // In public mode, dragging a player off the court should not remove them.
    // The drag operation itself is allowed to start, but the drop effect will be 'none'
    // if not dropped on a valid target. We only allow removal in admin mode.
    if (!isAdmin && draggedFromPosition !== null) { // If dragging from court in public mode
      setDraggedPlayerId(null); // Reset dragged state without removing the player
      setDraggedFromPosition(null);
      return;
    }

    if (draggedFromPosition && event.dataTransfer.dropEffect === "none" && !dragEndedInsideCourt(event)) {
      const removedPlayer = lineup[draggedFromPosition]?.player;

      setLineup((currentLineup) => {
        const next = { ...currentLineup };
        delete next[draggedFromPosition];
        return next;
      });
      setSelectedSlot(null);
      setStatus(removedPlayer ? `${removedPlayer.name} removed from ${draggedFromPosition}.` : "Player removed from lineup.");
    }

    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
  }

  function handleSlotDragOver(event: DragEvent<HTMLButtonElement>, position: Position) {
    if (!draggedPlayer || dropStatuses[position] === "blocked") {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleSlotDrop(event: DragEvent<HTMLButtonElement>, position: Position) {
    event.preventDefault();

    if (!draggedPlayer) return;

    assignPlayer(draggedPlayer, position, true);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
  }

  function rosterDropAllowed(targetPlayer: Player) {
    return Boolean(isAdmin && draggedPlayer && draggedFromPosition && targetPlayer.positions.includes(draggedFromPosition));
  }

  function handleRosterDragOver(event: DragEvent<HTMLButtonElement>, targetPlayer: Player) {
    if (!rosterDropAllowed(targetPlayer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleRosterDrop(event: DragEvent<HTMLButtonElement>, targetPlayer: Player) {
    event.preventDefault();

    // In public mode, dropping onto the roster is never allowed.
    if (!isAdmin) return;

    if (!draggedPlayer || !draggedFromPosition) {
      setDraggedPlayerId(null);
      setDraggedFromPosition(null);
      return;
    }

    if (!targetPlayer.positions.includes(draggedFromPosition)) {
      setStatus(`${targetPlayer.name} cannot be slotted at ${draggedFromPosition}.`);
      setDraggedPlayerId(null);
      setDraggedFromPosition(null);
      return;
    }

    setLineup((currentLineup) => ({
      ...currentLineup,
      [draggedFromPosition]: {
        player: targetPlayer,
        selection: buildDraftSelection(selectedTeam, activeEra),
      },
    }));
    setSelectedSlot(null);
    setStatus(`${targetPlayer.name} replaced ${draggedPlayer.name} at ${draggedFromPosition}.`);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
  }

  function clearLineup() {
    if (!isAdmin) {
      return;
    }

    setLineup({});
    setSelectedSlot(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setStatus("Lineup cleared.");
  }

  function draftSelectionHasPublicEligiblePlayer(selection: DraftSelection) {
    return players.some(
      (player) =>
        playerMatchesTeamEra(player, selection.team, selection.era) &&
        !selectedPlayerIds.has(player.id) &&
        player.positions.some((position) => !lineup[position]),
    );
  }

  function selectionForSpinTarget(target: SpinTarget, requirePublicEligiblePlayer = false) {
    const currentTeam = hasSelectedTeam ? selectedTeam : undefined;
    const currentEra = activeEra !== PUBLIC_ERA_PLACEHOLDER ? activeEra : undefined;
    const buildSelection = () => {
      if (target === "team" && currentTeam && currentEra) {
        return randomTeamSelectionForEra(players, teamOptions, activeEra, selectedTeam);
      }

      if (target === "era" && currentTeam && currentEra) {
        return randomEraSelectionForTeam(players, selectedTeam, activeEra);
      }

      return randomDraftSelection(players, teamOptions, currentTeam, currentEra);
    };
    const fallbackSelection = buildSelection();

    if (!requirePublicEligiblePlayer || draftSelectionHasPublicEligiblePlayer(fallbackSelection)) {
      return fallbackSelection;
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidateSelection = buildSelection();

      if (draftSelectionHasPublicEligiblePlayer(candidateSelection)) {
        return candidateSelection;
      }
    }

    return fallbackSelection;
  }

  function applySpinSelection(selection: DraftSelection, target: SpinTarget) {
    if (target === "team" || target === "all") {
      setSelectedTeam(selection.team);
    }

    if (target === "era" || target === "all") {
      setSelectedEra(selection.era);
    }
  }

  function spinTeamEra(target: SpinTarget = "all") {
    if (isSpinning) {
      return;
    }

    if (!isAdmin) {
      if (target === "all" && !publicSpinAllowed) {
        setStatus(publicGameComplete ? "All public rounds are complete." : "Choose a player before spinning again.");
        return;
      }

      if (target === "team" && !publicTeamSwapAllowed) {
        setStatus("The public team swap is no longer available.");
        return;
      }

      if (target === "era" && !publicEraSwapAllowed) {
        setStatus("The public era swap is no longer available.");
        return;
      }
    }

    const finalSelection = selectionForSpinTarget(target, !isAdmin);

    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
    }

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    setSelectedSlot(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setSpinningTarget(target);
    setStatus("Spinning...");

    spinIntervalRef.current = setInterval(() => {
      const previewSelection = selectionForSpinTarget(target);

      applySpinSelection(previewSelection, target);
    }, SPIN_TICK_MS);

    spinTimeoutRef.current = setTimeout(() => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }

      spinTimeoutRef.current = null;
      applySpinSelection(finalSelection, target);
      setSpinningTarget(null);
      setStatus(`Spun ${finalSelection.team} ${finalSelection.eraLabel}.`);

      if (!isAdmin) {
        if (target === "all") {
          setPublicRoundsSpent((roundsSpent) => Math.min(roundsSpent + 1, PUBLIC_ROUND_COUNT));
          setAwaitingPublicPick(true);
        } else if (target === "team") {
          setPublicTeamSwapUsed(true);
        } else {
          setPublicEraSwapUsed(true);
        }
      }
    }, SPIN_DURATION_MS);
  }

  return (
    <main className="min-h-screen bg-[#15171f] text-[#f4f2ec]">
      <header className="border-b border-white/10 bg-[#1c1f29]/95 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a2a]">
              {isAdmin ? "Admin Mode" : "Public Mode"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-white sm:text-3xl">
              82-0 Accolade Workspace
            </h1>
          </div>

          {isAdmin ? (
            <div className="grid gap-3 sm:grid-cols-[160px_160px_92px_auto_auto] sm:items-end">
              <label className="grid gap-1 text-sm font-semibold text-[#cfd3df]">
                Team
                <select
                  className={`h-11 rounded-lg border border-[#ff8a2a]/45 bg-[#242938] px-3 text-base font-black text-white outline-none transition focus:border-[#ffb13d] focus:ring-2 focus:ring-[#ff8a2a]/25 disabled:cursor-wait disabled:opacity-100 ${
                    isSpinning ? "animate-pulse shadow-[0_0_22px_rgba(255,138,42,0.22)]" : ""
                  }`}
                  disabled={isSpinning}
                  value={selectedTeam}
                  onChange={(event) => setSelectedTeam(event.target.value)}
                >
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-[#cfd3df]">
                Era
                <select
                  className={`h-11 rounded-lg border border-[#b86cff]/45 bg-[#242938] px-3 text-base font-black text-white outline-none transition focus:border-[#d998ff] focus:ring-2 focus:ring-[#b86cff]/25 disabled:cursor-wait disabled:opacity-100 ${
                    isSpinning ? "animate-pulse shadow-[0_0_22px_rgba(184,108,255,0.22)]" : ""
                  }`}
                  disabled={isSpinning}
                  value={activeEra}
                  onChange={(event) => setSelectedEra(event.target.value)}
                >
                  {eraOptions.map((era) => (
                    <option key={era} value={era}>
                      {era}
                    </option>
                  ))}
                </select>
              </label>

              <button
                aria-label="Spin random roster feed"
                aria-busy={isSpinning}
                className="h-11 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] px-4 text-sm font-black text-[#89f0cd] transition hover:border-[#31d6a1]/70 hover:bg-[#31d6a1]/[0.22] disabled:cursor-wait disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-[#aeb4c2]"
                disabled={isSpinning}
                type="button"
                onClick={() => spinTeamEra("all")}
              >
                {isSpinning ? "SPINNING..." : "Spin"}
              </button>

              <button
                className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-wait disabled:text-[#8f96a7]"
                disabled={isSpinning}
                type="button"
                onClick={clearLineup}
              >
                Clear Lineup
              </button>

              <button
                className="h-11 rounded-lg border border-[#ff8a2a]/35 bg-[#ff8a2a]/10 px-4 text-sm font-black text-[#ffbf86] transition hover:border-[#ff8a2a]/60 hover:bg-[#ff8a2a]/20"
                type="button"
                onClick={handleAdminLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="relative flex flex-wrap items-end gap-3 lg:justify-end">
              <div className="grid h-11 content-center rounded-lg border border-white/12 bg-white/[0.05] px-4">
                <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#aeb4c2]">Round</span>
                <span className="text-sm font-black text-white">
                  {publicDisplayRound}/{PUBLIC_ROUND_COUNT}
                </span>
              </div>

              <button
                aria-label="Reset public draft"
                className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-[#ff8a2a]/45 hover:bg-[#ff8a2a]/10 hover:text-[#ffbf86] disabled:cursor-not-allowed disabled:text-[#8f96a7]"
                disabled={!authChecked || isSpinning}
                type="button"
                onClick={handlePublicReset}
              >
                Reset
              </button>

              <button
                aria-label="Spin random roster feed"
                aria-busy={isSpinning}
                className="h-11 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] px-6 text-sm font-black text-[#89f0cd] transition hover:border-[#31d6a1]/70 hover:bg-[#31d6a1]/[0.22] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-[#aeb4c2]"
                disabled={!publicSpinAllowed}
                type="button"
                onClick={() => spinTeamEra("all")}
              >
                {isSpinning ? "SPINNING..." : "Spin"}
              </button>

              <button
                className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-wait disabled:text-[#8f96a7]"
                disabled={!authChecked}
                type="button"
                onClick={() => {
                  setAuthPanelOpen((open) => !open);
                  setLoginError(null);
                }}
              >
                Admin Login
              </button>

              {authPanelOpen ? (
                <form
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-20 grid w-[280px] max-w-[calc(100vw-2rem)] gap-3 rounded-lg border border-white/12 bg-[#202431] p-4 shadow-2xl shadow-black/35"
                  onSubmit={handleAdminLogin}
                >
                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[#cfd3df]">
                    Username
                    <input
                      autoComplete="username"
                      className="h-10 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20"
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[#cfd3df]">
                    Password
                    <input
                      autoComplete="current-password"
                      className="h-10 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                    />
                  </label>

                  {loginError ? <p className="text-xs font-semibold text-[#ffbf86]">{loginError}</p> : null}

                  <button
                    className="h-10 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1] px-4 text-sm font-black text-[#15171f] transition hover:bg-[#65e8bf] disabled:cursor-wait disabled:border-white/10 disabled:bg-white/[0.08] disabled:text-[#8f96a7]"
                    disabled={loginPending}
                    type="submit"
                  >
                    {loginPending ? "Signing In..." : "Sign In"}
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(420px,520px)_1fr] lg:px-8">
        <aside className="flex max-h-[720px] min-h-[560px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#202431] lg:sticky lg:top-5 lg:h-[calc(100vh-132px)] lg:max-h-[calc(100vh-132px)] lg:min-h-0">
          {isSpinning ? (
            <div className="spin-stage flex min-h-0 flex-1 flex-col px-4 py-5">
              <div className="spin-stage-header">
                <span className="spin-stage-mark" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#31d6a1]">Draft Draw</span>
              </div>

              <div
                className="mt-5 grid grid-cols-2 gap-3"
                aria-busy={isSpinning}
                aria-live={isSpinning ? "off" : "polite"}
              >
                <SpinTile
                  label="Team"
                  onSpin={() => spinTeamEra("team")}
                  style={teamSpinTileStyle(selectedTeam)}
                  disabled={isSpinning}
                  tone="team"
                  value={selectedTeam}
                  spinning={teamTileSpinning}
                />
                <SpinTile
                  label="Era"
                  onSpin={() => spinTeamEra("era")}
                  style={eraSpinTileStyle(activeEra)}
                  disabled={isSpinning}
                  tone="era"
                  value={activeEra}
                  spinning={eraTileSpinning}
                />
              </div>

              <div className="spin-stage-meter mt-5" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <p className="mt-5 text-center text-base font-black uppercase text-[#cfd3df]">{spinStatusLabel}</p>
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-4 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#31d6a1]">Roster Feed</p>
                  <div className="mt-2 grid grid-cols-2 gap-3" aria-live="polite">
                    <SpinTile
                      label="Team"
                      onSpin={() => spinTeamEra("team")}
                      style={teamSpinTileStyle(selectedTeam)}
                      disabled={isAdmin ? isSpinning : !publicTeamSwapAllowed}
                      tone="team"
                      value={selectedTeam}
                      spinning={teamTileSpinning}
                    />
                    <SpinTile
                      label="Era"
                      onSpin={() => spinTeamEra("era")}
                      style={eraSpinTileStyle(activeEra)}
                      disabled={isAdmin ? isSpinning : !publicEraSwapAllowed}
                      tone="era"
                      value={activeEra}
                      spinning={eraTileSpinning}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs font-semibold text-[#aeb4c2]">
                  {hasActiveDraftSelection
                    ? `Showing players with an actual ${selectedTeam} season during the ${fullEraLabel(activeEra)}.`
                    : "No roster drawn yet."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div
                    aria-label="Position filter"
                    className="flex h-10 items-center gap-1 rounded-lg bg-[#1a1f2b] p-1"
                    role="group"
                  >
                    {POSITION_FILTER_OPTIONS.map((filter) => (
                      <button
                        key={filter}
                        className={`h-8 rounded-md px-3 text-sm font-black transition ${
                          positionFilter === filter
                            ? "bg-[#ff6f13] text-white"
                            : "text-[#cfd3df] hover:bg-white/[0.06] hover:text-white"
                        }`}
                        type="button"
                        onClick={() => setPositionFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <input
                    aria-label="Search roster"
                    className="h-10 min-w-[150px] flex-1 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-[#aeb4c2] focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20"
                    placeholder="Search..."
                    type="search"
                    value={rosterSearch}
                    onChange={(event) => setRosterSearch(event.target.value)}
                  />

                  <select
                    aria-label="Accolade filter"
                    className="h-10 w-[132px] rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-black normal-case tracking-normal text-white outline-none transition focus:border-[#ff8a2a] focus:ring-2 focus:ring-[#ff8a2a]/20"
                    value={accoladePriority}
                    onChange={(event) => setAccoladePriority(event.target.value)}
                  >
                    {ACHIEVEMENT_DISPLAY_ORDER.map((achievement) => (
                      <option key={achievement.id} value={achievement.id}>
                        {achievement.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-3 text-sm font-semibold text-[#cfd3df]">{filteredPlayers.length} players available</p>

                {showPublicRosterSpinCta ? (
                  <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="grid gap-1">
                      <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#89f0cd]">
                        Next Draw
                      </span>
                      <span className="text-lg font-black leading-none text-white">
                        Round {publicDisplayRound}/{PUBLIC_ROUND_COUNT}
                      </span>
                    </span>
                    <button
                      aria-label={`Spin round ${publicDisplayRound}`}
                      className="h-12 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1] px-5 text-sm font-black text-[#15171f] transition hover:bg-[#65e8bf]"
                      type="button"
                      onClick={() => spinTeamEra("all")}
                    >
                      Spin
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="roster-list-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {loading ? (
                  <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-[#cfd3df]">
                    Loading player accolades...
                  </p>
                ) : error ? (
                  <p className="rounded-lg border border-[#ff8a2a]/30 bg-[#ff8a2a]/10 p-4 text-sm font-semibold text-[#ffd5b4]">
                    {error}
                  </p>
                ) : filteredPlayers.length === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-[#cfd3df]">
                    {!hasActiveDraftSelection
                      ? "Spin to reveal a roster."
                      : rosterSearch.trim()
                        ? "No players match that search."
                        : "No players found for this team and era."}
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {filteredPlayers.map((player) => {
                      const canRosterSwap = rosterDropAllowed(player);
                      const canSelectPlayer = rosterPlayerSelectable(player);

                      return (
                        <button
                          key={player.id}
                          aria-grabbed={draggedPlayerId === player.id}
                          className={`player-card grid min-h-[82px] grid-cols-1 gap-3 rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 sm:grid-cols-[minmax(150px,0.85fr)_minmax(0,1.15fr)] sm:items-center ${
                            draggedPlayerId === player.id ? "player-card-dragging" : ""
                          } ${canRosterSwap ? "player-card-roster-drop" : ""} ${
                            canSelectPlayer ? "" : "player-card-disabled"
                          }`}
                          disabled={!canSelectPlayer}
                          draggable={true}
                          type="button"
                          onClick={() => assignPlayer(player, selectedSlot ?? undefined)}
                          onDoubleClick={() => assignPlayer(player)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(event) => handleRosterDragOver(event, player)}
                          onDragStart={(event) => handleDragStart(event, player)}
                          onDrop={(event) => handleRosterDrop(event, player)}
                          style={teamThemeStyle(selectedTeam)}
                        >
                          <span className="min-w-0">
                            <span className="player-card-name block truncate text-base font-black leading-tight">
                              {player.name}
                            </span>
                            <span className="player-card-positions mt-1 block text-xs font-black">
                              {player.positions.join(" / ")}
                            </span>
                            <span className="player-card-team block truncate text-xs font-semibold">
                              {selectedTeam} - {fullEraLabel(activeEra)}
                            </span>
                          </span>
                          <AchievementStrip achievements={buildAchievements(player)} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <section className="flex flex-col gap-4 self-start">
          <div
            ref={courtRef}
            className="court-blueprint relative h-[520px] overflow-hidden rounded-lg border border-white/10 shadow-2xl shadow-black/25 sm:h-[560px]"
          >
            <div className="court-key" />
            <div className="court-rim" />
            <div className="court-arc" />

            {POSITIONS.map((position) => (
              <CourtSlot
                key={position}
                lineup={lineup}
                position={position}
                selected={selectedSlot === position} // This is for visual feedback, not drag logic
                canDragPlayer={true} // Allow drag to start, drop targets will restrict
                canDrop={draggedPlayer ? dropStatuses[position] !== "blocked" : false}
                blocked={Boolean(draggedPlayer && dropStatuses[position] === "blocked")}
                swapTarget={dropStatuses[position] === "swap"}
                onSelect={() => handleCourtSlotSelect(position)}
                onPlayerDragEnd={handleDragEnd}
                onPlayerDragStart={(event, player) => handleDragStart(event, player, position)}
                onDragOver={(event) => handleSlotDragOver(event, position)}
                onDrop={(event) => handleSlotDrop(event, position)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#ff8a2a]/25 bg-[#202431] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a2a]">Grand Legacy Score</p>
              <p className="mt-1 text-3xl font-black text-white">{formatLegacyScore(teamLegacyScore)}</p>
            </div>
            <button
              className="h-12 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1] px-5 text-sm font-black text-[#15171f] transition hover:bg-[#65e8bf] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-[#8f96a7]"
              disabled={!lineupComplete || isSpinning}
              type="button"
              onClick={simulateSeason}
            >
              Simulate Season
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function SpinTile({
  disabled,
  label,
  onSpin,
  style,
  tone,
  value,
  spinning,
}: {
  disabled: boolean;
  label: string;
  onSpin: () => void;
  style: SpinTileStyle;
  tone: "team" | "era";
  value: string;
  spinning: boolean;
}) {
  return (
    <div
      className={`spin-tile spin-tile-${tone} text-center ${spinning ? "spin-tile-spinning" : ""}`}
      style={style}
    >
      <button
        aria-label={`Spin ${label.toLowerCase()}`}
        className={`spin-tile-action ${spinning ? "spin-tile-action-spinning" : ""}`}
        disabled={disabled}
        type="button"
        onClick={onSpin}
      >
        <span className="sr-only">Spin {label.toLowerCase()}</span>
      </button>
      <span className="spin-tile-inner" aria-hidden="true">
        <span className="spin-tile-topline">
          <span className="spin-tile-label">{label}</span>
          <span className="spin-tile-wheel">
            <span />
          </span>
        </span>
        <span className="spin-tile-reel">
          <span key={`${label}-${value}`} className="spin-tile-value">
            {value}
          </span>
        </span>
      </span>
    </div>
  );
}

function AchievementStrip({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) {
    return <span className="achievement-strip achievement-strip-empty" aria-hidden="true" />;
  }

  return (
    <span // AchievementStrip component
      className="achievement-strip flex overflow-x-auto whitespace-nowrap pb-1 min-w-0"
      aria-label={achievements.map((item) => `${item.value} ${item.label}`).join(", ")}
    >
      {achievements.map((achievement) => (
        <span className="achievement-stat flex-shrink-0" key={achievement.id}>
          <span className="achievement-value">{achievement.value}</span>
          <span className="achievement-label">{achievement.label}</span>
        </span>
      ))}
    </span>
  );
}

function CourtSlot({
  canDragPlayer,
  lineup,
  position,
  selected,
  canDrop,
  blocked,
  swapTarget,
  onSelect,
  onPlayerDragEnd,
  onPlayerDragStart,
  onDragOver,
  onDrop,
}: {
  canDragPlayer: boolean;
  lineup: Lineup;
  position: Position;
  selected: boolean;
  canDrop: boolean;
  blocked: boolean;
  swapTarget: boolean;
  onSelect: () => void;
  onPlayerDragEnd: (event: DragEvent<HTMLButtonElement>) => void;
  onPlayerDragStart: (event: DragEvent<HTMLButtonElement>, player: Player) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  const slot = lineup[position];
  const player = slot?.player;
  const courtAchievements = player ? buildAchievements(player).slice(0, 4) : [];

  return (
    <button
      className={`court-slot court-slot-${position.toLowerCase()} ${selected ? "court-slot-selected" : ""} ${
        player ? "court-slot-filled" : ""
      } ${player && !canDragPlayer ? "court-slot-locked" : ""} ${canDrop ? "court-slot-can-drop" : ""} ${swapTarget ? "court-slot-swap-target" : ""} ${
        blocked ? "court-slot-blocked" : ""
      }`}
      type="button"
      aria-grabbed={player ? undefined : false}
      aria-label={player ? `${player.name}, ${position}` : `${position} slot`}
      data-player-name={player?.name}
      draggable={canDragPlayer && Boolean(player)}
      style={slot ? teamThemeStyle(slot.selection.team) : undefined}
      title={player?.name}
      onClick={onSelect}
      onDragEnd={onPlayerDragEnd}
      onDragOver={onDragOver}
      onDragStart={player ? (event) => onPlayerDragStart(event, player) : undefined}
      onDrop={onDrop}
    >
      <span className="court-slot-position">{position}</span>
      {player ? (
        <>
          <span className="court-slot-name">{playerInitials(player.name)}</span>
          <span className="court-slot-team">
            {slot.selection.team} - {slot.selection.eraLabel}
          </span>
          {courtAchievements.length ? <CourtAchievementGrid achievements={courtAchievements} /> : null}
        </>
      ) : null}
    </button>
  );
}

function CourtAchievementGrid({ achievements }: { achievements: Achievement[] }) {
  const rows = [achievements.slice(0, 2), achievements.slice(2, 4)].filter((row) => row.length > 0);

  return (
    <span
      className="court-achievement-grid"
      aria-label={achievements.map((item) => `${item.value} ${item.label}`).join(", ")}
    >
      {rows.map((row) => (
        <span className="court-achievement-row" key={row.map((achievement) => achievement.id).join("-")}>
          {row.map((achievement, index) => (
            <span className="court-achievement-item" key={achievement.id}>
              {index > 0 ? <span className="court-achievement-separator">/</span> : null}
              <span className="court-achievement-value">{achievement.value}</span>
              <span className="court-achievement-label">{achievement.label}</span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
