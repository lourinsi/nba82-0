"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
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
  legacy_points?: number;
  goat_rank?: number;
  goat_score?: number;
  final_legacy_points?: number;
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
];
const TEAM_FIRST_ERAS: Record<string, string> = {
  ATL: "40's",
  BKN: "60's",
  BOS: "40's",
  CHA: "80's",
  CHI: "60's",
  CLE: "70's",
  DAL: "80's",
  DEN: "60's",
  DET: "40's",
  GSW: "40's",
  HOU: "60's",
  IND: "60's",
  LAC: "70's",
  LAL: "40's",
  MEM: "90's",
  MIA: "80's",
  MIL: "60's",
  MIN: "80's",
  NOP: "00's",
  NYK: "40's",
  OKC: "60's",
  ORL: "80's",
  PHI: "40's",
  PHX: "60's",
  POR: "70's",
  SAC: "40's",
  SAS: "60's",
  TOR: "90's",
  UTA: "70's",
  WAS: "60's",
};
const DEFAULT_ERAS = ["90's", "00's", "10's", "20's"];
const ACCOLADE_WEIGHTS = {
  mvp_count: 10,
  finals_mvp_count: 5,
  dpoy_count: 5,
  championship_rings: 3,
  roy_won: 3,
  all_nba_1st: 5,
  all_nba_2nd: 3,
  all_nba_3rd: 2,
  all_def_1st: 3,
  all_def_2nd: 2,
  scoring_titles: 3,
  assist_titles: 3,
  rebound_titles: 3,
  steal_titles: 3,
  block_titles: 3,
  olympic_gold_medals: 3,
  olympic_silver_medals: 1,
  olympic_bronze_medals: 0.5,
  all_rookie_1st: 2,
  all_rookie_2nd: 1.5,
  all_star_selections: 2,
  all_star_mvp_count: 3,
  "6moy": 2,
  most_improved: 2,
  seasons_played: 0.5,
} satisfies Partial<Record<keyof Accolades, number>>;
type WeightedAccoladeKey = keyof typeof ACCOLADE_WEIGHTS;

const ACHIEVEMENT_DISPLAY_ORDER: AchievementDisplay[] = [
  {
    id: "goat",
    label: "GOAT",
    count: (player) => playerGoatRank(player),
    value: (player) => ordinalRank(playerGoatRank(player)),
    sortValue: (player) => player.goat_score ?? (playerGoatRank(player) ? 101 - playerGoatRank(player) : 0),
    weight: Number.POSITIVE_INFINITY,
  },
  { id: "mvp", label: "MVP", count: (player) => player.accolades.mvp_count, weight: ACCOLADE_WEIGHTS.mvp_count },
  {
    id: "fmvp",
    label: "FMVP",
    count: (player) => player.accolades.finals_mvp_count,
    weight: ACCOLADE_WEIGHTS.finals_mvp_count,
  },
  { id: "dpoy", label: "DPOY", count: (player) => player.accolades.dpoy_count, weight: ACCOLADE_WEIGHTS.dpoy_count },
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
  { id: "roy", label: "ROY", count: (player) => (player.accolades.roy_won ? 1 : 0), weight: ACCOLADE_WEIGHTS.roy_won },
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
    id: "olympic-gold",
    label: "GOLD",
    count: (player) => player.accolades.olympic_gold_medals ?? 0,
    weight: ACCOLADE_WEIGHTS.olympic_gold_medals,
  },
  {
    id: "all-star-mvp",
    label: "AS MVP",
    count: (player) => player.accolades.all_star_mvp_count ?? 0,
    weight: ACCOLADE_WEIGHTS.all_star_mvp_count,
  },
  {
    id: "all-rookie-1st",
    label: "ROOK1",
    count: (player) => player.accolades.all_rookie_1st ?? 0,
    weight: ACCOLADE_WEIGHTS.all_rookie_1st,
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
  {
    id: "all-rookie-2nd",
    label: "ROOK2",
    count: (player) => player.accolades.all_rookie_2nd ?? 0,
    weight: ACCOLADE_WEIGHTS.all_rookie_2nd,
  },
  {
    id: "olympic-silver",
    label: "SILVER",
    count: (player) => player.accolades.olympic_silver_medals ?? 0,
    weight: ACCOLADE_WEIGHTS.olympic_silver_medals,
  },
  {
    id: "olympic-bronze",
    label: "BRONZE",
    count: (player) => player.accolades.olympic_bronze_medals ?? 0,
    weight: ACCOLADE_WEIGHTS.olympic_bronze_medals,
  },
  { id: "seasons", label: "SEASONS", count: (player) => player.accolades.seasons_played, weight: ACCOLADE_WEIGHTS.seasons_played },
];
const TOTAL_ACHIEVEMENT_DISPLAY_ORDER = ACHIEVEMENT_DISPLAY_ORDER.filter((achievement) => achievement.id !== "goat");
const SEASON_TIERS: SeasonTier[] = [
  {
    minScore: 2000,
    minWins: 100,
    maxWins: 100,
    tier: "WTF",
    description: "THIS MIGHT BE THE BEST TEAM EVER YOU JUST BROKE 82-0 AND THE SCORE IS 100-0. The engine is crying. The database is melting.",
  },
  {
    minScore: 1500,
    minWins: 82,
    maxWins: 82,
    tier: "S+ (The Immortal 82-0)",
    description: "The Absolute Pinnacle. You drafted a lineup of literal basketball Gods. This team sweeps the league, goes undefeated, and forces opposing fanbases to switch sports.",
  },
  {
    minScore: 1000,
    minWins: 81,
    maxWins: 81,
    tier: "S (You're almost there buddyy...)",
    description: "A historically painful result. You built one of the greatest rosters in the history of the sport, but dropped a random Tuesday night game vs the miami heat in where Bam scored 83 POINTS!",
  },
  {
    minScore: 750,
    minWins: 74,
    maxWins: 80,
    tier: "S- (Historic Season)",
    description: "Congrats, your team just broke the regular season wins record. This squad systematically dismantles the league.",
  },
  {
    minScore: 585,
    minWins: 67,
    maxWins: 73,
    tier: "A+ (Dynasty)",
    description: "Vegas' #1 Pick. A championship-caliber team featuring a couple of absolute Hall of Fame carries. How does it feel to be the favourites to win?",
  },
  {
    minScore: 470,
    minWins: 60,
    maxWins: 66,
    tier: "A (Championship Contenders)",
    description: "The 60-Win Elite. You have the firepower and the star power.",
  },
  {
    minScore: 400,
    minWins: 54,
    maxWins: 59,
    tier: "A- (One Piece Away)",
    description: "You have the system, the depth, and the regular season aura. But when Game 7 gets ugly, everyone suddenly remembers you do not have THAT guy.",
  },
  {
    minScore: 335,
    minWins: 49,
    maxWins: 53,
    tier: "B+ (The Dark Horse)",
    description: "A dangerous team that makes every contender nervous. You are not the main character, but you are absolutely capable of ruining the script.",
  },
  {
    minScore: 250,
    minWins: 44,
    maxWins: 48,
    tier: "B (Playoff Team)",
    description: "You made the playoffs. The banner will not be raised, the documentary will not be made, but hey, at least the season mattered.",
  },
  {
    minScore: 195,
    minWins: 38,
    maxWins: 43,
    tier: "B- (Just Made The Playoffs)",
    description: "You slipped into the playoffs and immediately became someone else's warm-up round. Respectfully, the contenders are not scared.",
  },
  {
    minScore: 150,
    minWins: 33,
    maxWins: 37,
    tier: "C+ (Play-In Team)",
    description: "You fought for 82 games just to earn the honor of getting packed up on a random Wednesday night. The Play-In lights might be too bright.",
  },
  {
    minScore: 125,
    minWins: 30,
    maxWins: 33,
    tier: "C (You Suck)",
    description: "Dont know if you are trying to get to the play-in or trying to tank. Either way, the fans are confused and the front office is lying.",
  },
  {
    minScore: 95,
    minWins: 25,
    maxWins: 29,
    tier: "C- (Basketball Purgatory)",
    description: "Not good enough to compete, not bad enough to land the franchise savior. Just 82 games of fake hope and post-game press conference excuses.",
  },
  {
    minScore: 70,
    minWins: 20,
    maxWins: 24,
    tier: "D+ (Hopeless)",
    description: "The roster had names that sounded decent until basketball actually started. Now the fans are doing draft lottery math in January.",
  },
  {
    minScore: 45,
    minWins: 15,
    maxWins: 19,
    tier: "D (Rebuilding)",
    description: "Wait 'Til Next Year. The season was over before Christmas and the only thing developing here is depression.",
  },
  {
    minScore: 30,
    minWins: 10,
    maxWins: 14,
    tier: "D- (The Process)",
    description: "The Tank Job. Management traded everything that could dribble and is now selling patience like it is a real product.",
  },
  {
    minScore: 20,
    minWins: 5,
    maxWins: 9,
    tier: "F+ (The G-League Call-Ups)",
    description: "Opposing teams are resting their starters against you and still winning by 30. Your mascot has more trade value than half the roster.",
  },
  {
    minScore: 10,
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

function ordinalRank(rank: number) {
  if (!rank) {
    return "";
  }

  const teenRemainder = rank % 100;

  if (teenRemainder >= 11 && teenRemainder <= 13) {
    return `${rank}th`;
  }

  const suffix = rank % 10 === 1 ? "st" : rank % 10 === 2 ? "nd" : rank % 10 === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}

function playerGoatRank(player: Player) {
  const explicitRank = Number(player.goat_rank || 0);

  if (explicitRank) {
    return explicitRank;
  }

  const goatScore = Number(player.goat_score || 0);

  return goatScore > 0 ? 101 - goatScore : 0;
}

function numericAccoladeValue(value: Accolades[keyof Accolades]) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) ? numeric : 0;
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
  return Number(player?.final_legacy_points ?? player?.legacy_points ?? 0);
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
  const decade = Number(era.slice(0, 2));

  if (Number.isNaN(decade)) {
    return 9999;
  }

  return decade >= 40 ? 1900 + decade : 2000 + decade;
}

function fullEraLabel(era: string) {
  const decade = Number(era.slice(0, 2));

  if (Number.isNaN(decade)) {
    return era;
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

  return !firstEra || eraSortValue(era) >= eraSortValue(firstEra);
}

function playerMatchesTeamEra(player: Player, team: string, era: string) {
  if (!teamEraExists(team, era)) {
    return false;
  }

  if (player.team_eras?.length) {
    return player.team_eras.some((teamEra) => teamEra.team === team && teamEra.era === era);
  }

  return player.teams.includes(team) && player.eras.includes(era);
}

function playerErasForTeam(player: Player, team: string) {
  const filterPossibleEras = (eras: string[]) => eras.filter((era) => teamEraExists(team, era));

  if (player.team_eras?.length) {
    return filterPossibleEras(player.team_eras.filter((teamEra) => teamEra.team === team).map((teamEra) => teamEra.era));
  }

  return player.teams.includes(team) ? filterPossibleEras(player.eras) : [];
}

function eraOptionsForTeam(players: Player[], team: string) {
  const teamEras = players.flatMap((player) => playerErasForTeam(player, team));
  const eras = teamEras.length ? teamEras : DEFAULT_ERAS.filter((era) => teamEraExists(team, era));

  return Array.from(new Set(eras)).sort((a, b) => eraSortValue(a) - eraSortValue(b));
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

function canDropAt(lineup: Lineup, player: Player, position: Position) {
  const status = placementStatus(lineup, player, position);

  return status === "move" || status === "same" || status === "swap";
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

function formatLegacyScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function playerIsStephCurry(player: Player) {
  return normalizeName(player.name) === "stephen curry";
}

function projectSeasonRecord(score: number, hasStephCurry: boolean): SeasonProjection {
  const tier = SEASON_TIERS.find((candidate) => score >= candidate.minScore) ?? SEASON_TIERS[SEASON_TIERS.length - 1];
  const wins = tier.minWins === tier.maxWins ? tier.minWins : randomInteger(tier.minWins, tier.maxWins);
  const losses = tier.fixedLosses ?? 82 - wins;
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("LAL");
  const [selectedEra, setSelectedEra] = useState("10's");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("All");
  const [accoladePriority, setAccoladePriority] = useState("goat");
  const [rosterSearch, setRosterSearch] = useState("");
  const [lineup, setLineup] = useState<Lineup>({});
  const [selectedSlot, setSelectedSlot] = useState<Position | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [draggedFromPosition, setDraggedFromPosition] = useState<Position | null>(null);
  const [, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const teamOptions = CURRENT_NBA_TEAMS;

  const eraOptions = useMemo(
    () => eraOptionsForTeam(players, selectedTeam),
    [players, selectedTeam],
  );
  const activeEra = eraOptions.includes(selectedEra) ? selectedEra : eraOptions[eraOptions.length - 1] ?? selectedEra;

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
      players
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
    [accoladePriority, activeEra, normalizedRosterSearch, players, positionFilter, selectedPlayerIds, selectedTeam],
  );

  const draggedPlayer = useMemo(
    () => players.find((player) => player.id === draggedPlayerId) ?? null,
    [draggedPlayerId, players],
  );

  const dropStatuses = useMemo(
    () =>
      Object.fromEntries(
        POSITIONS.map((position) => [
          position,
          draggedPlayer ? placementStatus(lineup, draggedPlayer, position) : "blocked",
        ]),
      ) as Record<Position, PlacementStatus>,
    [draggedPlayer, lineup],
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
  const teamLegacyScore = POSITIONS.reduce(
    (sum, position) => sum + playerLegacyScore(lineup[position]?.player),
    0,
  );
  const lineupHasStephCurry = POSITIONS.some((position) => {
    const player = lineup[position]?.player;

    return player ? playerIsStephCurry(player) : false;
  });

  function assignPlayer(player: Player, preferredPosition?: Position, allowReplace = false) {
    const source = currentPositionForPlayer(lineup, player.id);
    const target =
      preferredPosition ??
      player.positions.find((position) => {
        const status = placementStatus(lineup, player, position);
        return (status === "move" && (allowReplace || !lineup[position])) || status === "same";
      });

    if (!target) {
      setStatus(`${player.name} has no open eligible slot.`);
      setSelectedSlot(null);
      return;
    }

    if (!player.positions.includes(target)) {
      setStatus(`${player.name} is ${player.positions.join("/")} and cannot be slotted at ${target}.`);
      setSelectedSlot(null);
      return;
    }

    const status = placementStatus(lineup, player, target);
    const targetSlot = lineup[target];
    const targetPlayer = targetSlot?.player;

    if (status === "same") {
      setSelectedSlot(null);
      setStatus(`${player.name} is already assigned to ${target}.`);
      return;
    }

    if (status === "blocked" || (!allowReplace && targetPlayer && !source)) {
      const detail =
        targetPlayer && source
          ? `${targetPlayer.name} cannot move to ${source}.`
          : `${target} is already occupied.`;

      setStatus(`${player.name} was not moved. ${detail}`);
      setSelectedSlot(null);
      return;
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
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, player: Player, sourcePosition: Position | null = null) {
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
    if (!draggedPlayer || !canDropAt(lineup, draggedPlayer, position)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleSlotDrop(event: DragEvent<HTMLButtonElement>, position: Position) {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("application/x-player-id") || draggedPlayerId;
    const player = players.find((candidate) => candidate.id === playerId);

    if (!player) {
      setStatus("Dropped player could not be found.");
      setDraggedPlayerId(null);
      return;
    }

    assignPlayer(player, position, true);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
  }

  function rosterDropAllowed(targetPlayer: Player) {
    return Boolean(draggedPlayer && draggedFromPosition && targetPlayer.positions.includes(draggedFromPosition));
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
    setLineup({});
    setSelectedSlot(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setStatus("Lineup cleared.");
  }

  function spinTeamEra() {
    const team = randomItem(teamOptions);
    const eras = eraOptionsForTeam(players, team);
    const era = randomItem(eras.length ? eras : DEFAULT_ERAS);

    setSelectedTeam(team);
    setSelectedEra(era);
    setSelectedSlot(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setStatus(`Spun ${team} ${fullEraLabel(era)}.`);
  }

  function simulateSeason() {
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
      })),
      totals: lineupAchievementTotals,
    };

    sessionStorage.setItem(ALL_TIME_RESULT_STORAGE_KEY, JSON.stringify(payload));
    setStatus(`${result.tier}: ${result.wins}-${result.losses}`);
    router.push("/all-time/results");
  }

  return (
    <main className="min-h-screen bg-[#15171f] text-[#f4f2ec]">
      <header className="border-b border-white/10 bg-[#1c1f29]/95 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a2a]">Admin Mode</p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-white sm:text-3xl">
              82-0 Accolade Workspace
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_160px_92px_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-semibold text-[#cfd3df]">
              Team
              <select
                className="h-11 rounded-lg border border-[#ff8a2a]/45 bg-[#242938] px-3 text-base font-black text-white outline-none transition focus:border-[#ffb13d] focus:ring-2 focus:ring-[#ff8a2a]/25"
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
                className="h-11 rounded-lg border border-[#b86cff]/45 bg-[#242938] px-3 text-base font-black text-white outline-none transition focus:border-[#d998ff] focus:ring-2 focus:ring-[#b86cff]/25"
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
              className="h-11 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] px-4 text-sm font-black text-[#89f0cd] transition hover:border-[#31d6a1]/70 hover:bg-[#31d6a1]/[0.22]"
              type="button"
              onClick={spinTeamEra}
            >
              Spin
            </button>

            <button
              className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.1]"
              type="button"
              onClick={clearLineup}
            >
              Clear Lineup
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(420px,520px)_1fr] lg:px-8">
        <aside className="flex max-h-[720px] min-h-[560px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#202431] lg:sticky lg:top-5 lg:h-[calc(100vh-132px)] lg:max-h-[calc(100vh-132px)] lg:min-h-0">
          <div className="border-b border-white/10 px-4 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#31d6a1]">Roster Feed</p>
              <h2 className="mt-1 text-xl font-black text-white">
                {selectedTeam} {activeEra}
              </h2>
            </div>

            <p className="mt-3 text-xs font-semibold text-[#aeb4c2]">
              Showing players with an actual {selectedTeam} season during the {fullEraLabel(activeEra)}.
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
                {rosterSearch.trim() ? "No players match that search." : "No players found for this team and era."}
              </p>
            ) : (
              <div className="grid gap-2">
                {filteredPlayers.map((player) => {
                  const canRosterSwap = rosterDropAllowed(player);

                  return (
                    <button
                      key={player.id}
                      aria-grabbed={draggedPlayerId === player.id}
                      className={`player-card grid min-h-[82px] grid-cols-1 gap-3 rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 sm:grid-cols-[minmax(150px,0.85fr)_minmax(0,1.15fr)] sm:items-center ${
                        draggedPlayerId === player.id ? "player-card-dragging" : ""
                      } ${canRosterSwap ? "player-card-roster-drop" : ""}`}
                      draggable
                      type="button"
                      onClick={() => assignPlayer(player, selectedSlot ?? undefined)}
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
                selected={selectedSlot === position}
                canDrop={draggedPlayer ? dropStatuses[position] !== "blocked" : false}
                blocked={Boolean(draggedPlayer && dropStatuses[position] === "blocked")}
                swapTarget={dropStatuses[position] === "swap"}
                onSelect={() => setSelectedSlot((current) => (current === position ? null : position))}
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
              disabled={!lineupComplete}
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

function AchievementStrip({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) {
    return <span className="achievement-strip achievement-strip-empty" aria-hidden="true" />;
  }

  return (
    <span className="achievement-strip" aria-label={achievements.map((item) => `${item.value} ${item.label}`).join(", ")}>
      {achievements.map((achievement) => (
        <span className="achievement-stat" key={achievement.id}>
          <span className="achievement-value">{achievement.value}</span>
          <span className="achievement-label">{achievement.label}</span>
        </span>
      ))}
    </span>
  );
}

function CourtSlot({
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
      } ${canDrop ? "court-slot-can-drop" : ""} ${swapTarget ? "court-slot-swap-target" : ""} ${
        blocked ? "court-slot-blocked" : ""
      }`}
      type="button"
      aria-grabbed={player ? undefined : false}
      aria-label={player ? `${player.name}, ${position}` : `${position} slot`}
      data-player-name={player?.name}
      draggable={Boolean(player)}
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
