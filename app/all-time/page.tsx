"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

type Position = "PG" | "SG" | "SF" | "PF" | "C";

type Accolades = {
  mvp_count: number;
  finals_mvp_count: number;
  dpoy_count: number;
  roy_won: boolean;
  championship_rings: number;
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

type Lineup = Partial<Record<Position, Player>>;
type TeamEra = { team: string; era: string };
type Achievement = { id: string; value: string; label: string };
type AchievementDisplay = {
  id: string;
  label: string;
  count: (player: Player) => number;
  value?: (player: Player) => string;
  sortValue?: (player: Player) => number;
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
const POSITION_PRIORITY_OPTIONS = ["None", ...POSITIONS] as const;
type PositionPriority = (typeof POSITION_PRIORITY_OPTIONS)[number];
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
const DEFAULT_ERAS = ["90's", "00's", "10's", "20's"];
const ACHIEVEMENT_DISPLAY_ORDER: AchievementDisplay[] = [
  {
    id: "goat",
    label: "GOAT",
    count: (player) => playerGoatRank(player),
    value: (player) => ordinalRank(playerGoatRank(player)),
    sortValue: (player) => player.goat_score ?? (playerGoatRank(player) ? 101 - playerGoatRank(player) : 0),
  },
  { id: "mvp", label: "MVP", count: (player) => player.accolades.mvp_count },
  { id: "fmvp", label: "FMVP", count: (player) => player.accolades.finals_mvp_count },
  { id: "rings", label: "RING", count: (player) => player.accolades.championship_rings },
  { id: "dpoy", label: "DPOY", count: (player) => player.accolades.dpoy_count },
  { id: "roy", label: "ROY", count: (player) => (player.accolades.roy_won ? 1 : 0) },
  { id: "all-nba-1st", label: "NBA1", count: (player) => player.accolades.all_nba_1st },
  { id: "olympic-gold", label: "GOLD", count: (player) => player.accolades.olympic_gold_medals ?? 0 },
  { id: "all-nba-2nd", label: "NBA2", count: (player) => player.accolades.all_nba_2nd },
  { id: "all-defense-1st", label: "DEF1", count: (player) => player.accolades.all_def_1st },
  { id: "all-rookie-1st", label: "ROOK1", count: (player) => player.accolades.all_rookie_1st ?? 0 },
  { id: "all-star-mvp", label: "AS MVP", count: (player) => player.accolades.all_star_mvp_count ?? 0 },
  { id: "scoring", label: "SCORING", count: (player) => player.accolades.scoring_titles },
  { id: "assists", label: "ASSISTS", count: (player) => player.accolades.assist_titles },
  { id: "rebounds", label: "REBOUNDS", count: (player) => player.accolades.rebound_titles },
  { id: "steals", label: "STEALS", count: (player) => player.accolades.steal_titles },
  { id: "blocks", label: "BLOCKS", count: (player) => player.accolades.block_titles },
  { id: "all-nba-3rd", label: "NBA3", count: (player) => player.accolades.all_nba_3rd },
  { id: "all-defense-2nd", label: "DEF2", count: (player) => player.accolades.all_def_2nd },
  { id: "all-rookie-2nd", label: "ROOK2", count: (player) => player.accolades.all_rookie_2nd ?? 0 },
  { id: "all-star", label: "ALL-STAR", count: (player) => player.accolades.all_star_selections },
  { id: "olympic-silver", label: "SILVER", count: (player) => player.accolades.olympic_silver_medals ?? 0 },
  { id: "olympic-bronze", label: "BRONZE", count: (player) => player.accolades.olympic_bronze_medals ?? 0 },
  { id: "seasons", label: "SEASONS", count: (player) => player.accolades.seasons_played },
];
const TOTAL_ACHIEVEMENT_DISPLAY_ORDER = ACHIEVEMENT_DISPLAY_ORDER.filter((achievement) => achievement.id !== "goat");
const SEASON_TIERS: SeasonTier[] = [
  {
    minScore: 1500,
    minWins: 100,
    maxWins: 100,
    tier: "WTF",
    description: "THIS MIGHT BE THE BEST TEAM EVER YOU JUST BROKE 82-0 AND THE SCORE IS 100-0. The engine is crying. The database is melting.",
  },
  {
    minScore: 1000,
    minWins: 82,
    maxWins: 82,
    tier: "S+ (The Immortal 82-0)",
    description: "The Absolute Pinnacle. You drafted a lineup of literal basketball Gods. This team sweeps the league, goes undefeated, and forces opposing fanbases to switch sports.",
  },
  {
    minScore: 850,
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
  return Number.isNaN(decade) ? 999 : decade;
}

function fullEraLabel(era: string) {
  const decade = Number(era.slice(0, 2));

  if (Number.isNaN(decade)) {
    return era;
  }

  return `${decade >= 40 ? 1900 + decade : 2000 + decade}s`;
}

function playerMatchesTeamEra(player: Player, team: string, era: string) {
  if (player.team_eras?.length) {
    return player.team_eras.some((teamEra) => teamEra.team === team && teamEra.era === era);
  }

  return player.teams.includes(team) && player.eras.includes(era);
}

function currentPositionForPlayer(lineup: Lineup, playerId: string) {
  return POSITIONS.find((position) => lineup[position]?.id === playerId) ?? null;
}

function placementStatus(lineup: Lineup, player: Player, target: Position): PlacementStatus {
  if (!player.positions.includes(target)) {
    return "blocked";
  }

  const source = currentPositionForPlayer(lineup, player.id);
  const targetPlayer = lineup[target];

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
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  const [positionPriority, setPositionPriority] = useState<PositionPriority>("None");
  const [accoladePriority, setAccoladePriority] = useState("goat");
  const [lineup, setLineup] = useState<Lineup>({});
  const [selectedSlot, setSelectedSlot] = useState<Position | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [draggedFromPosition, setDraggedFromPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState("Ready");
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
    () =>
      Array.from(
        new Set([
          ...DEFAULT_ERAS,
          ...players.flatMap((player) => [
            ...player.eras,
            ...(player.team_eras?.map((teamEra) => teamEra.era) ?? []),
          ]),
        ]),
      ).sort((a, b) => eraSortValue(a) - eraSortValue(b)),
    [players],
  );

  const selectedPlayerIds = useMemo(
    () =>
      new Set(
        Object.values(lineup).flatMap((player) => (player ? [player.id] : [])),
      ),
    [lineup],
  );

  const filteredPlayers = useMemo(
    () =>
      players
        .filter((player) => playerMatchesTeamEra(player, selectedTeam, selectedEra))
        .filter((player) => !selectedPlayerIds.has(player.id))
        .sort((a, b) => {
          const aPositionPriority = positionPriority !== "None" && a.positions.includes(positionPriority) ? 1 : 0;
          const bPositionPriority = positionPriority !== "None" && b.positions.includes(positionPriority) ? 1 : 0;
          const positionDelta = bPositionPriority - aPositionPriority;

          if (positionDelta) {
            return positionDelta;
          }

          const accoladeDelta =
            achievementPriorityValue(b, accoladePriority) - achievementPriorityValue(a, accoladePriority);

          if (accoladeDelta) {
            return accoladeDelta;
          }

          const legacyDelta = playerLegacyScore(b) - playerLegacyScore(a);

          return legacyDelta || a.name.localeCompare(b.name);
        }),
    [accoladePriority, players, positionPriority, selectedEra, selectedPlayerIds, selectedTeam],
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
        const player = lineup[position];

        return player ? [{ position, player }] : [];
      }),
    [lineup],
  );
  const lineupAchievementTotals = useMemo(
    () => buildAchievementTotals(lineupEntries.map(({ player }) => player)),
    [lineupEntries],
  );
  const teamLegacyScore = POSITIONS.reduce(
    (sum, position) => sum + playerLegacyScore(lineup[position]),
    0,
  );
  const lineupHasStephCurry = POSITIONS.some((position) => {
    const player = lineup[position];

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
    const targetPlayer = lineup[target];

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
      const targetPlayer = next[target];

      if (currentSource) {
        delete next[currentSource];
      }

      next[target] = player;

      if (status === "swap" && currentSource && targetPlayer) {
        next[currentSource] = targetPlayer;
      }

      return next;
    });
    setSelectedSlot(null);
    setStatus(
      status === "swap" && source && lineup[target]
        ? `${player.name} swapped to ${target}; ${lineup[target]?.name} moved to ${source}.`
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
      const removedPlayer = lineup[draggedFromPosition];

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
      [draggedFromPosition]: targetPlayer,
    }));
    setSelectedSlot(null);
    setStatus(`${targetPlayer.name} replaced ${draggedPlayer.name} at ${draggedFromPosition}.`);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
  }

  function handlePositionPick(position: Position) {
    setSelectedSlot((current) => (current === position ? null : position));
  }

  function clearLineup() {
    setLineup({});
    setSelectedSlot(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setStatus("Lineup cleared.");
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
      selectedEraLabel: fullEraLabel(selectedEra),
      simulationResult: result,
      lineup: lineupEntries.map(({ position, player }) => ({
        position,
        player: {
          id: player.id,
          name: player.name,
        },
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

          <div className="grid gap-3 sm:grid-cols-[160px_160px_auto] sm:items-end">
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
                value={selectedEra}
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
        <aside className="min-h-[calc(100vh-132px)] overflow-hidden rounded-lg border border-white/10 bg-[#202431]">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#31d6a1]">Roster Feed</p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {selectedTeam} {selectedEra}
                </h2>
              </div>
              <span className="rounded-md bg-[#2e3446] px-3 py-2 text-sm font-black text-[#f4f2ec]">
                {filteredPlayers.length} Players
              </span>
            </div>

            <p className="mt-4 text-xs font-semibold text-[#aeb4c2]">
              Showing players with an actual {selectedTeam} season during the {fullEraLabel(selectedEra)}.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-[#aeb4c2]">
                Position Priority
                <select
                  className="h-10 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-black normal-case tracking-normal text-white outline-none transition focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20"
                  value={positionPriority}
                  onChange={(event) => setPositionPriority(event.target.value as PositionPriority)}
                >
                  {POSITION_PRIORITY_OPTIONS.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-[#aeb4c2]">
                Accolade Priority
                <select
                  className="h-10 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-black normal-case tracking-normal text-white outline-none transition focus:border-[#ff8a2a] focus:ring-2 focus:ring-[#ff8a2a]/20"
                  value={accoladePriority}
                  onChange={(event) => setAccoladePriority(event.target.value)}
                >
                  {ACHIEVEMENT_DISPLAY_ORDER.map((achievement) => (
                    <option key={achievement.id} value={achievement.id}>
                      {achievement.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="max-h-[calc(100vh-250px)] overflow-y-auto px-3 py-3">
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
                No players found for this team and era.
              </p>
            ) : (
              <div className="grid gap-2">
                {filteredPlayers.map((player) => {
                  const canRosterSwap = rosterDropAllowed(player);

                  return (
                    <button
                      key={player.id}
                      aria-grabbed={draggedPlayerId === player.id}
                      className={`player-card grid min-h-[86px] grid-cols-[minmax(174px,0.95fr)_minmax(0,1.55fr)] items-center gap-3 rounded-lg border border-white/10 bg-[#282d3b] px-3 py-3 text-left transition hover:border-[#31d6a1]/60 hover:bg-[#303747] focus:outline-none focus:ring-2 focus:ring-[#31d6a1]/35 ${
                        draggedPlayerId === player.id ? "player-card-dragging" : ""
                      } ${canRosterSwap ? "player-card-roster-drop" : ""}`}
                      draggable
                      type="button"
                      onClick={() => assignPlayer(player, selectedSlot ?? undefined)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(event) => handleRosterDragOver(event, player)}
                      onDragStart={(event) => handleDragStart(event, player)}
                      onDrop={(event) => handleRosterDrop(event, player)}
                    >
                      <span className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
                        <span className="player-token" aria-hidden="true">
                          {playerInitials(player.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-base font-black text-white">{player.name}</span>
                          <span className="mt-1 block text-xs font-black text-[#b86cff]">
                            {player.positions.join(" / ")}
                          </span>
                          <span className="block truncate text-xs font-semibold text-[#aeb4c2]">
                            {selectedTeam} - {fullEraLabel(selectedEra)}
                          </span>
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

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#202431] px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a2a]">Court Blueprint</p>
              <p className="mt-1 text-sm font-semibold text-[#cfd3df]">{status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((position) => (
                <button
                  key={position}
                  className={`h-9 min-w-11 rounded-lg border px-3 text-sm font-black transition ${
                    selectedSlot === position
                      ? "border-[#31d6a1] bg-[#31d6a1] text-[#15171f]"
                      : "border-white/12 bg-white/[0.05] text-white hover:border-white/30"
                  }`}
                  type="button"
                  onClick={() => handlePositionPick(position)}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={courtRef}
            className="court-blueprint relative min-h-[560px] overflow-hidden rounded-lg border border-white/10 shadow-2xl shadow-black/25"
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
  const player = lineup[position];
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
      draggable={Boolean(player)}
      onClick={onSelect}
      onDragEnd={onPlayerDragEnd}
      onDragOver={onDragOver}
      onDragStart={player ? (event) => onPlayerDragStart(event, player) : undefined}
      onDrop={onDrop}
    >
      <span className="court-slot-position">{position}</span>
      {player ? (
        <>
          <span className="court-slot-name">{player.name}</span>
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
