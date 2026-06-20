"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, FormEvent } from "react";
import { teamThemeStyle } from "./all-time/teamStyles";

export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type Accolades = {
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
  games_started?: number;
};
export type ScoringAccolades = Omit<Accolades, "roy_won"> & { roy_won: boolean | number };

export type ClassicStatKey = "ppg" | "rpg" | "apg" | "spg" | "bpg" | "ts_pct" | "ws_48";
export type ClassicStatLine = Partial<Record<ClassicStatKey, number | null>>;
export type CareerSeason = Partial<TeamEra> & {
  season?: string | number | null;
  games_played?: number | string | null;
  ppg?: number | string | null;
  rpg?: number | string | null;
  apg?: number | string | null;
  spg?: number | string | null;
  bpg?: number | string | null;
  ts_pct?: number | string | null;
  ws_48?: number | string | null;
  ws_per_48?: number | string | null;
};

export type Player = {
  id: string;
  name: string;
  legacy_points?: number; // Career all-time score.
  classic_points_by_team_era?: ClassicPointBlock[];
  career_seasons?: CareerSeason[];
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

export type TeamEra = { team: string; era: string };
export type ClassicPointBlock = TeamEra & {
  points?: number;
  stats?: ClassicStatLine;
  accolades?: Accolades;
  scoringAccolades?: ScoringAccolades;
};
export type DraftSelection = TeamEra & { eraLabel: string };
export type LineupSlot = {
  player: Player;
  selection: DraftSelection;
};
type Lineup = Partial<Record<Position, LineupSlot>>;
export type Achievement = { id: string; value: string; label: string; title?: string };
export type AchievementDisplay = {
  id: string;
  label: string;
  count: (player: Player) => number;
  value?: (player: Player) => string;
  sortValue?: (player: Player) => number;
  weight: number;
};
export type StatDisplay = {
  id: ClassicStatKey;
  label: string;
};
type PlacementStatus = "blocked" | "move" | "same" | "swap";
export type SeasonTier = {
  minScore: number;
  minWins: number;
  maxWins: number;
  fixedLosses?: number;
  tier: string;
  description: string;
};
export type SeasonProjection = {
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
  scoreContribution: number;
  achievements: Achievement[];
  positionBonus?: PositionBonus;
};
export type PositionBonus = {
  multiplier: number;
  points: number;
};
type GameResultPayload = {
  mode: GameMode;
  selectedTeam: string;
  selectedEraLabel: string;
  simulationResult: SeasonProjection;
  lineup: ResultPlayer[];
  totals: Achievement[];
};

export type GameMode = "classic" | "all-time";
export type RosterSortMode = string;
type RosterSortDirection = "desc" | "asc";
export type RosterSortScores = Record<
  RosterSortMode,
  (player: Player, selection: DraftSelection, statsEngineConfig: StatsEngineConfig) => number
>;
export type RosterSortOption = {
  id: RosterSortMode;
  label: string;
};
export type LeagueAverage = Record<string, number | string | null | undefined>;
export type LeagueAverages = Record<string, LeagueAverage>;
export type StatsEngineConfig = {
  allTimeTsBaseline: number;
  leagueAverages: LeagueAverages;
  tsBlendWeights: {
    absolute: number;
    era: number;
  };
};
export type LineupEntry = {
  position: Position;
  player: Player;
  selection: DraftSelection;
};
export type GameCourtConfig = {
  mode: GameMode;
  logoLabel: string;
  scoreLabel: string;
  resultStorageKey: string;
  resultsPath: string;
  seasonTiers: SeasonTier[];
  usesStatsEngineConfig?: boolean;
  rosterSortOptions?: readonly RosterSortOption[];
  defaultRosterSortMode?: RosterSortMode;
  defaultRosterSortDirection?: RosterSortDirection;
  courtAchievementLimit: number;
  buildAchievementTotals: (slots: LineupSlot[], statsEngineConfig: StatsEngineConfig) => Achievement[];
  buildPlayerAchievements: (player: Player, selection: DraftSelection) => Achievement[];
  buildResultAchievements?: (
    player: Player,
    selection: DraftSelection,
    statsEngineConfig: StatsEngineConfig,
  ) => Achievement[];
  buildRosterFeedAchievements: (
    player: Player,
    selection: DraftSelection,
    statsEngineConfig: StatsEngineConfig,
  ) => Achievement[];
  rosterSortScores: RosterSortScores;
  eraOptionsForTeam: (players: Player[], team: string) => string[];
  lineupSlotScore: (
    slot: LineupSlot | undefined,
    assignedPosition: Position,
    statsEngineConfig: StatsEngineConfig,
  ) => number;
  playerScore: (player: Player, selection: DraftSelection, statsEngineConfig: StatsEngineConfig) => number;
  playerHasRecordedTeamEra: (player: Player, team: string, canonicalEra: string) => boolean;
  positionBonusForSlot: (
    slot: LineupSlot | undefined,
    assignedPosition: Position,
    statsEngineConfig: StatsEngineConfig,
  ) => PositionBonus | undefined;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const FALLBACK_ALL_TIME_TS_BASELINE = 0.54;
const DEFAULT_STATS_ENGINE_CONFIG: StatsEngineConfig = {
  allTimeTsBaseline: FALLBACK_ALL_TIME_TS_BASELINE,
  leagueAverages: {},
  tsBlendWeights: {
    absolute: 0.5,
    era: 0.5,
  },
};
const DEFAULT_ROSTER_SORT_OPTIONS = [
  { id: "mixed", label: "Mixed" },
  { id: "stats", label: "Stats" },
  { id: "awards", label: "Awards" },
] as const satisfies readonly RosterSortOption[];
const ROSTER_SORT_CONTROL_CLASS =
  "h-10 rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-black normal-case tracking-normal text-white outline-none transition focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20";
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
export function countValue(count: number) {
  return `${count}x`;
}

export function numericAccoladeValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) ? numeric : 0;
}

function positiveNumberValue(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

export function getCanonicalEra(era: string) {
  if (era === "40's" || era === "50's") {
    return "60's";
  }
  return era;
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

export function eraSortValue(era: string) {
  const canonicalEra = getCanonicalEra(era); // Use canonical era for sorting
  const decade = Number(canonicalEra.slice(0, 2));

  if (Number.isNaN(decade)) {
    return 9999;
  }

  return decade >= 60 ? 1900 + decade : 2000 + decade; // Adjusted for '60s as earliest canonical
}

export function fullEraLabel(era: string) {
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

export function teamEraExists(team: string, era: string) {
  const firstEra = TEAM_FIRST_ERAS[team];

  return !firstEra || eraSortValue(getCanonicalEra(era)) >= eraSortValue(firstEra);
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

type EraOptionsResolver = (players: Player[], team: string) => string[];

function randomDraftSelection(
  players: Player[],
  teamOptions: string[],
  resolveEraOptionsForTeam: EraOptionsResolver,
  currentTeam?: string,
  currentEra?: string,
) {
  const teamsWithEraData = teamOptions.filter((team) => resolveEraOptionsForTeam(players, team).length > 0);
  const validTeamOptions = teamsWithEraData.length ? teamsWithEraData : teamOptions;
  const team = currentTeam ? randomDifferentItem(validTeamOptions, currentTeam) : randomItem(validTeamOptions);
  const eras = resolveEraOptionsForTeam(players, team);
  const fallbackEras = DEFAULT_ERAS.filter((era) => teamEraExists(team, era));
  const eraOptions = eras.length ? eras : fallbackEras.length ? fallbackEras : DEFAULT_ERAS;
  const era = currentEra ? randomDifferentItem(eraOptions, currentEra) : randomItem(eraOptions);

  return buildDraftSelection(team, era);
}

function teamOptionsForEra(
  players: Player[],
  teamOptions: string[],
  era: string,
  resolveEraOptionsForTeam: EraOptionsResolver,
) {
  const canonicalEra = getCanonicalEra(era);
  const validTeams = teamOptions.filter((team) => {
    const eras = resolveEraOptionsForTeam(players, team);

    return eras.includes(canonicalEra);
  });

  return validTeams;
}

function randomTeamSelectionForEra(
  players: Player[],
  teamOptions: string[],
  era: string,
  currentTeam: string,
  resolveEraOptionsForTeam: EraOptionsResolver,
) {
  const validTeams = teamOptionsForEra(players, teamOptions, era, resolveEraOptionsForTeam);

  if (!validTeams.length) {
    return randomDraftSelection(players, teamOptions, resolveEraOptionsForTeam, currentTeam, era);
  }

  const team = randomDifferentItem(validTeams, currentTeam);

  return buildDraftSelection(team, era);
}

function randomEraSelectionForTeam(
  players: Player[],
  team: string,
  currentEra: string,
  resolveEraOptionsForTeam: EraOptionsResolver,
) {
  const eras = resolveEraOptionsForTeam(players, team);
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

function projectSeasonRecord(score: number, hasStephCurry: boolean, seasonTiers: SeasonTier[]): SeasonProjection {
  const tier = seasonTiers.find((candidate) => score >= candidate.minScore) ?? seasonTiers[seasonTiers.length - 1];
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

export default function GameCourt({ config }: { config: GameCourtConfig }) {
  const {
    mode,
    logoLabel,
    scoreLabel,
    resultStorageKey,
    resultsPath,
    seasonTiers,
    usesStatsEngineConfig = false,
    rosterSortOptions = DEFAULT_ROSTER_SORT_OPTIONS,
    defaultRosterSortMode,
    defaultRosterSortDirection = "desc",
    courtAchievementLimit,
    buildAchievementTotals,
    buildPlayerAchievements,
    buildResultAchievements,
    buildRosterFeedAchievements,
    rosterSortScores,
    eraOptionsForTeam: resolveEraOptionsForTeam,
    lineupSlotScore,
    playerScore,
    playerHasRecordedTeamEra,
    positionBonusForSlot,
  } = config;
  const initialRosterSortMode =
    defaultRosterSortMode ?? rosterSortOptions[0]?.id ?? DEFAULT_ROSTER_SORT_OPTIONS[0].id;
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
  const [rosterSortMode, setRosterSortMode] = useState<RosterSortMode>(initialRosterSortMode);
  const [rosterSortDirection, setRosterSortDirection] =
    useState<RosterSortDirection>(defaultRosterSortDirection);
  const [statsEngineConfig, setStatsEngineConfig] = useState<StatsEngineConfig>(DEFAULT_STATS_ENGINE_CONFIG);
  const [rosterSearch, setRosterSearch] = useState("");
  const [lineup, setLineup] = useState<Lineup>({});
  const [selectedSlot, setSelectedSlot] = useState<Position | null>(null);
  const [mobileMoveSource, setMobileMoveSource] = useState<Position | null>(null);
  const [positionPickerPlayer, setPositionPickerPlayer] = useState<Player | null>(null);
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
    if (!usesStatsEngineConfig) {
      return;
    }

    const controller = new AbortController();

    async function loadStatsEngineConfig() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats-engine-config`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const config = (await response.json()) as Partial<StatsEngineConfig>;
        const tsBlendWeights = config.tsBlendWeights ?? DEFAULT_STATS_ENGINE_CONFIG.tsBlendWeights;

        setStatsEngineConfig({
          allTimeTsBaseline: positiveNumberValue(
            config.allTimeTsBaseline,
            DEFAULT_STATS_ENGINE_CONFIG.allTimeTsBaseline,
          ),
          leagueAverages:
            config.leagueAverages && typeof config.leagueAverages === "object" ? config.leagueAverages : {},
          tsBlendWeights: {
            absolute: positiveNumberValue(
              tsBlendWeights.absolute,
              DEFAULT_STATS_ENGINE_CONFIG.tsBlendWeights.absolute,
            ),
            era: positiveNumberValue(tsBlendWeights.era, DEFAULT_STATS_ENGINE_CONFIG.tsBlendWeights.era),
          },
        });
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
      }
    }

    loadStatsEngineConfig();

    return () => controller.abort();
  }, [usesStatsEngineConfig]);

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
    () => (hasSelectedTeam ? resolveEraOptionsForTeam(players, selectedTeam) : []),
    [hasSelectedTeam, players, resolveEraOptionsForTeam, selectedTeam],
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
  const showPublicRosterSpinCta = publicSpinAllowed;

  const selectedPlayerIds = useMemo(
    () =>
      new Set(
        Object.values(lineup).flatMap((slot) => (slot ? [slot.player.id] : [])),
      ),
    [lineup],
  );
  const normalizedRosterSearch = useMemo(() => normalizeName(rosterSearch), [rosterSearch]);

  const filteredPlayers = useMemo(
    () => {
      const selection = buildDraftSelection(selectedTeam, activeEra);
      const fallbackSortMode = rosterSortOptions[0]?.id ?? DEFAULT_ROSTER_SORT_OPTIONS[0].id;
      const sortScore =
        rosterSortScores[rosterSortMode] ??
        rosterSortScores[fallbackSortMode] ??
        rosterSortScores.mixed ??
        playerScore;
      const scoreCache = new Map<string, { legacy: number; priority: number }>();
      const scoresForPlayer = (player: Player) => {
        const cached = scoreCache.get(player.id);

        if (cached) {
          return cached;
        }

        const scores = {
          legacy: playerScore(player, selection, statsEngineConfig),
          priority: sortScore(player, selection, statsEngineConfig),
        };

        scoreCache.set(player.id, scores);
        return scores;
      };

      return (hasActiveDraftSelection ? players : [])
        .filter((player) => {
          const canonicalSelectedEra = getCanonicalEra(activeEra);

          if (!teamEraExists(selectedTeam, canonicalSelectedEra)) {
            return false;
          }

          return playerHasRecordedTeamEra(player, selectedTeam, canonicalSelectedEra);
        })
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
          const aScores = scoresForPlayer(a);
          const bScores = scoresForPlayer(b);
          const rawPriorityDelta = bScores.priority - aScores.priority;
          const priorityDelta = rosterSortDirection === "desc" ? rawPriorityDelta : -rawPriorityDelta;

          if (priorityDelta) {
            return priorityDelta;
          }

          const legacyDelta = bScores.legacy - aScores.legacy;

          return legacyDelta || a.name.localeCompare(b.name);
        });
    },
    [
      activeEra,
      hasActiveDraftSelection,
      normalizedRosterSearch,
      playerHasRecordedTeamEra,
      playerScore,
      players,
      positionFilter,
      rosterSortDirection,
      rosterSortMode,
      rosterSortOptions,
      rosterSortScores,
      selectedPlayerIds,
      selectedTeam,
      statsEngineConfig,
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
    () => buildAchievementTotals(lineupEntries.map(({ player, selection }) => ({ player, selection })), statsEngineConfig),
    [buildAchievementTotals, lineupEntries, statsEngineConfig],
  );
  const teamLegacyScore = Number(
    POSITIONS.reduce(
      (sum, position) => sum + lineupSlotScore(lineup[position], position, statsEngineConfig),
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

    const result = projectSeasonRecord(teamLegacyScore, lineupHasStephCurry, seasonTiers);
    const payload: GameResultPayload = {
      mode,
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
        scoreContribution: lineupSlotScore(lineup[position], position, statsEngineConfig),
        achievements: buildResultAchievements
          ? buildResultAchievements(player, selection, statsEngineConfig)
          : buildPlayerAchievements(player, selection),
        positionBonus: positionBonusForSlot(lineup[position], position, statsEngineConfig),
      })),
      totals: lineupAchievementTotals,
    };

    sessionStorage.setItem(resultStorageKey, JSON.stringify(payload));
    setStatus(`${result.tier}: ${result.wins}-${result.losses}`);
    router.push(resultsPath);
  }, [
    activeEra,
    buildPlayerAchievements,
    buildResultAchievements,
    lineup,
    lineupAchievementTotals,
    lineupComplete,
    lineupEntries,
    lineupHasStephCurry,
    lineupSlotScore,
    mode,
    positionBonusForSlot,
    resultStorageKey,
    resultsPath,
    router,
    selectedTeam,
    seasonTiers,
    statsEngineConfig,
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
    setMobileMoveSource(null);
    setPositionPickerPlayer(null);
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
    setMobileMoveSource(null);
    setPositionPickerPlayer(null);
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
    setMobileMoveSource(null);
    setPositionPickerPlayer(null);

    if (!isAdmin && lineup[position]) {
      setStatus("Public lineup slots lock once filled.");
      return;
    }

    setSelectedSlot((current) => (current === position ? null : position));
  }

  function handleMobileLineupSlotSelect(position: Position) {
    setPositionPickerPlayer(null);

    if (mobileMoveSource) {
      if (mobileMoveSource === position) {
        setMobileMoveSource(null);
        return;
      }

      const sourceSlot = lineup[mobileMoveSource];

      if (!sourceSlot) {
        setMobileMoveSource(null);
        handleCourtSlotSelect(position);
        return;
      }

      if (!assignPlayer(sourceSlot.player, position, true)) {
        setMobileMoveSource(null);
      }

      return;
    }

    const slot = lineup[position];

    if (slot) {
      setSelectedSlot(null);
      setMobileMoveSource(position);
      setStatus(`Choose a new position for ${slot.player.name}.`);
      return;
    }

    handleCourtSlotSelect(position);
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

  function rosterAssignablePositions(player: Player) {
    if (isSpinning) {
      return [];
    }

    if (!isAdmin && rosterSelectionDisabled) {
      return [];
    }

    if (selectedSlot) {
      const status = placementStatus(lineup, player, selectedSlot);

      return !lineup[selectedSlot] && player.positions.includes(selectedSlot) && status !== "blocked"
        ? [selectedSlot]
        : [];
    }

    return POSITIONS.filter((position) => {
      if (!player.positions.includes(position)) {
        return false;
      }

      const status = placementStatus(lineup, player, position);

      if (status === "same") {
        return true;
      }

      return status === "move" && !lineup[position];
    });
  }

  function handleRosterPlayerClick(player: Player) {
    if (!rosterPlayerSelectable(player)) {
      return;
    }

    const assignablePositions = rosterAssignablePositions(player);

    if (selectedSlot || assignablePositions.length <= 1) {
      assignPlayer(player, selectedSlot ?? assignablePositions[0]);
      return;
    }

    setPositionPickerPlayer(player);
  }

  function choosePositionForPicker(position: Position) {
    if (!positionPickerPlayer) {
      return;
    }

    if (assignPlayer(positionPickerPlayer, position)) {
      setPositionPickerPlayer(null);
    }
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
    setMobileMoveSource(null);
    setPositionPickerPlayer(null);
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
    setMobileMoveSource(null);
    setPositionPickerPlayer(null);
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
    setMobileMoveSource(null);
    setPositionPickerPlayer(null);
    setDraggedPlayerId(null);
    setDraggedFromPosition(null);
    setStatus("Lineup cleared.");
  }

  function draftSelectionHasPublicEligiblePlayer(selection: DraftSelection) {
    const canonicalEra = getCanonicalEra(selection.era);

    if (!teamEraExists(selection.team, canonicalEra)) {
      return false;
    }

    return players.some(
      (player) =>
        playerHasRecordedTeamEra(player, selection.team, canonicalEra) &&
        !selectedPlayerIds.has(player.id) &&
        player.positions.some((position) => !lineup[position]),
    );
  }

  function selectionForSpinTarget(target: SpinTarget, requirePublicEligiblePlayer = false) {
    const currentTeam = hasSelectedTeam ? selectedTeam : undefined;
    const currentEra = activeEra !== PUBLIC_ERA_PLACEHOLDER ? activeEra : undefined;
    const buildSelection = () => {
      if (target === "team" && currentTeam && currentEra) {
        return randomTeamSelectionForEra(players, teamOptions, activeEra, selectedTeam, resolveEraOptionsForTeam);
      }

      if (target === "era" && currentTeam && currentEra) {
        return randomEraSelectionForTeam(players, selectedTeam, activeEra, resolveEraOptionsForTeam);
      }

      return randomDraftSelection(players, teamOptions, resolveEraOptionsForTeam, currentTeam, currentEra);
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

    setPositionPickerPlayer(null);

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
    setMobileMoveSource(null);
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

  const positionPickerAssignablePositions = positionPickerPlayer ? rosterAssignablePositions(positionPickerPlayer) : [];

  return (
    <main className="game-page min-h-screen bg-[#15171f] text-[#f4f2ec]">
      <header className="game-header border-b border-white/10 bg-[#1c1f29]/95 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] sm:px-6 lg:px-8">
        <div className="game-header-inner mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="game-brand">
            <Link className="game-logo-mark" href="/" aria-label="Go to home">
              <span>82-0</span>
              <small>{logoLabel}</small>
            </Link>
            <div className="game-brand-copy">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a2a]">
              {isAdmin ? "Admin Mode" : "Public Mode"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-white sm:text-3xl">
              {isAdmin ? "Admin Workspace" : `Round ${publicDisplayRound}/${PUBLIC_ROUND_COUNT}`}
            </h1>
            </div>
          </div>

          {isAdmin ? (
            <div className="game-admin-controls grid gap-3 sm:grid-cols-[160px_160px_92px_auto_auto] sm:items-end">
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
                className="game-control-button game-spin-button h-11 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] px-4 text-sm font-black text-[#89f0cd] transition hover:border-[#31d6a1]/70 hover:bg-[#31d6a1]/[0.22] disabled:cursor-wait disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-[#aeb4c2]"
                disabled={isSpinning}
                type="button"
                onClick={() => spinTeamEra("all")}
              >
                {isSpinning ? "SPINNING..." : "Spin"}
              </button>

              <button
                className="game-control-button game-clear-button h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-wait disabled:text-[#8f96a7]"
                disabled={isSpinning}
                type="button"
                onClick={clearLineup}
              >
                Clear Lineup
              </button>

              <button
                className="game-control-button game-logout-button h-11 rounded-lg border border-[#ff8a2a]/35 bg-[#ff8a2a]/10 px-4 text-sm font-black text-[#ffbf86] transition hover:border-[#ff8a2a]/60 hover:bg-[#ff8a2a]/20"
                type="button"
                onClick={handleAdminLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="game-public-controls relative flex flex-wrap items-end gap-3 lg:justify-end">
              <div className="game-round-pill grid h-11 content-center rounded-lg border border-white/12 bg-white/[0.05] px-4">
                <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#aeb4c2]">Round</span>
                <span className="text-sm font-black text-white">
                  {publicDisplayRound}/{PUBLIC_ROUND_COUNT}
                </span>
              </div>

              <button
                aria-label="Reset public draft"
                className="game-control-button game-reset-button h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-[#ff8a2a]/45 hover:bg-[#ff8a2a]/10 hover:text-[#ffbf86] disabled:cursor-not-allowed disabled:text-[#8f96a7]"
                disabled={!authChecked || isSpinning}
                type="button"
                onClick={handlePublicReset}
              >
                Reset
              </button>

              <button
                aria-label="Spin random roster feed"
                aria-busy={isSpinning}
                className="game-control-button game-spin-button h-11 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] px-6 text-sm font-black text-[#89f0cd] transition hover:border-[#31d6a1]/70 hover:bg-[#31d6a1]/[0.22] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-[#aeb4c2]"
                disabled={!publicSpinAllowed}
                type="button"
                onClick={() => spinTeamEra("all")}
              >
                {isSpinning ? "SPINNING..." : "Spin"}
              </button>

              <button
                className="game-control-button game-admin-button h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-wait disabled:text-[#8f96a7]"
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
                  className="game-auth-panel absolute right-0 top-[calc(100%+0.75rem)] z-20 grid w-[280px] max-w-[calc(100vw-2rem)] gap-3 rounded-lg border border-white/12 bg-[#202431] p-4 shadow-2xl shadow-black/35"
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

      <section className="game-shell mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(420px,520px)_1fr] lg:px-8">
        <aside className="game-roster-panel flex max-h-[720px] min-h-[560px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#202431] lg:sticky lg:top-5 lg:h-[calc(100vh-132px)] lg:max-h-[calc(100vh-132px)] lg:min-h-0">
          {isSpinning ? (
            <div className="spin-stage game-spin-stage flex min-h-0 flex-1 flex-col px-4 py-5">
              <div className="spin-stage-header">
                <span className="spin-stage-mark" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#31d6a1]">Draft Draw</span>
              </div>

              <div
                className="game-spin-grid mt-5 grid grid-cols-2 gap-3"
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
                  <div className="game-spin-grid mt-2 grid grid-cols-2 gap-3" aria-live="polite">
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

                <div className="roster-filter-row mt-4 flex flex-wrap items-center gap-2">
                  <div
                    aria-label="Position filter"
                    className="position-filter-group flex h-10 items-center gap-1 rounded-lg bg-[#1a1f2b] p-1"
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
                    className="h-10 min-w-[112px] flex-[0.85_1_132px] rounded-lg border border-white/12 bg-[#242938] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-[#aeb4c2] focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20"
                    placeholder="Search..."
                    type="search"
                    value={rosterSearch}
                    onChange={(event) => setRosterSearch(event.target.value)}
                  />

                  <span className="roster-sort-control flex min-w-[150px] items-center gap-2">
                    <select
                      aria-label="Roster sort filter"
                      className={`${ROSTER_SORT_CONTROL_CLASS} min-w-0 flex-1`}
                      value={rosterSortMode}
                      onChange={(event) => setRosterSortMode(event.target.value)}
                    >
                      {rosterSortOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label={
                        rosterSortDirection === "desc"
                          ? "Sort direction descending"
                          : "Sort direction ascending"
                      }
                      className="h-10 w-10 rounded-lg border border-white/12 bg-[#242938] text-lg font-black leading-none tracking-normal text-white outline-none transition hover:border-[#31d6a1]/50 hover:bg-white/[0.07] focus:border-[#31d6a1] focus:ring-2 focus:ring-[#31d6a1]/20"
                      title={rosterSortDirection === "desc" ? "Descending" : "Ascending"}
                      type="button"
                      onClick={() =>
                        setRosterSortDirection((current) => (current === "desc" ? "asc" : "desc"))
                      }
                    >
                      {rosterSortDirection === "desc" ? "↓" : "↑"}
                    </button>
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-[#cfd3df]">{filteredPlayers.length} players available</p>

                {showPublicRosterSpinCta ? (
                  <div className="next-draw-card mt-3 flex flex-col gap-3 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1]/[0.14] p-3 sm:flex-row sm:items-center sm:justify-between">
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
                      className="big-spin-button h-12 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1] px-5 text-sm font-black text-[#15171f] transition hover:bg-[#65e8bf]"
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
                      const playerSelection = buildDraftSelection(selectedTeam, activeEra);

                      return (
                        <button
                          key={player.id}
                          aria-grabbed={draggedPlayerId === player.id}
                          className={`roster-player-card player-card grid min-h-[82px] grid-cols-1 gap-3 rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 sm:grid-cols-[minmax(150px,0.85fr)_minmax(0,1.15fr)] sm:items-center ${
                            draggedPlayerId === player.id ? "player-card-dragging" : ""
                          } ${canRosterSwap ? "player-card-roster-drop" : ""} ${
                            canSelectPlayer ? "" : "player-card-disabled"
                          }`}
                          disabled={!canSelectPlayer}
                          draggable={true}
                          type="button"
                          onClick={() => handleRosterPlayerClick(player)}
                          onDoubleClick={() => {
                            setPositionPickerPlayer(null);
                            assignPlayer(player);
                          }}
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
                          <AchievementStrip
                            achievements={buildRosterFeedAchievements(
                              player,
                              playerSelection,
                              statsEngineConfig,
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <section className="game-court-section flex flex-col gap-4 self-start">
          <div
            ref={courtRef}
            className="game-court court-blueprint relative h-[520px] overflow-hidden rounded-lg border border-white/10 shadow-2xl shadow-black/25 sm:h-[560px]"
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
                achievementLimit={courtAchievementLimit}
                buildPlayerAchievements={buildPlayerAchievements}
                showAchievements={isAdmin}
                onSelect={() => handleCourtSlotSelect(position)}
                onPlayerDragEnd={handleDragEnd}
                onPlayerDragStart={(event, player) => handleDragStart(event, player, position)}
                onDragOver={(event) => handleSlotDragOver(event, position)}
                onDrop={(event) => handleSlotDrop(event, position)}
              />
            ))}
          </div>

          {isAdmin ? (
            <div className="game-score-panel flex flex-col gap-3 rounded-lg border border-[#ff8a2a]/25 bg-[#202431] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a2a]">{scoreLabel}</p>
                <p className="mt-1 text-3xl font-black text-white">{formatLegacyScore(teamLegacyScore)}</p>
              </div>
              <button
                className="simulate-button h-12 rounded-lg border border-[#31d6a1]/45 bg-[#31d6a1] px-5 text-sm font-black text-[#15171f] transition hover:bg-[#65e8bf] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-[#8f96a7]"
                disabled={!lineupComplete || isSpinning}
                type="button"
                onClick={simulateSeason}
              >
                Simulate Season
              </button>
            </div>
          ) : null}
        </section>
      </section>

      {positionPickerPlayer ? (
        <div
          aria-labelledby="position-picker-title"
          aria-modal="true"
          className="position-picker"
          role="dialog"
        >
          <button
            aria-label="Close position picker"
            className="position-picker-backdrop"
            type="button"
            onClick={() => setPositionPickerPlayer(null)}
          />
          <div className="position-picker-panel">
            <div className="position-picker-heading">
              <h2 id="position-picker-title">{positionPickerPlayer.name} - Choose Position</h2>
              <button
                aria-label="Close position picker"
                className="position-picker-close"
                type="button"
                onClick={() => setPositionPickerPlayer(null)}
              >
                x
              </button>
            </div>

            <div className="position-picker-options">
              {POSITIONS.map((position) => {
                const assignable = positionPickerAssignablePositions.includes(position);
                const naturalPosition = positionPickerPlayer.positions.includes(position);

                return (
                  <button
                    key={position}
                    className={`position-picker-option ${assignable ? "position-picker-option-active" : ""}`}
                    disabled={!assignable}
                    type="button"
                    onClick={() => choosePositionForPicker(position)}
                  >
                    <span className="position-picker-position">{position}</span>
                    <span className="position-picker-status">{assignable ? "Pick" : naturalPosition ? "Filled" : "N/A"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="mobile-lineup-rail" aria-label="Lineup positions">
        {POSITIONS.map((position) => {
          const slot = lineup[position];
          const mobileSourceSlot = mobileMoveSource ? lineup[mobileMoveSource] : undefined;
          const canReceiveMobileMove = Boolean(
            mobileSourceSlot &&
              mobileMoveSource !== position &&
              placementStatus(lineup, mobileSourceSlot.player, position) !== "blocked",
          );

          return (
            <button
              key={position}
              aria-label={slot ? `${slot.player.name}, ${position}` : `${position} slot`}
              className={`mobile-lineup-slot ${
                selectedSlot === position || mobileMoveSource === position ? "mobile-lineup-slot-selected" : ""
              } ${canReceiveMobileMove ? "mobile-lineup-slot-can-move" : ""} ${
                slot ? "mobile-lineup-slot-filled" : ""
              }`}
              style={slot ? teamThemeStyle(slot.selection.team) : undefined}
              type="button"
              onClick={() => handleMobileLineupSlotSelect(position)}
            >
              <span className="mobile-lineup-token">{slot ? playerInitials(slot.player.name) : position}</span>
              <span className="mobile-lineup-label">{position}</span>
            </button>
          );
        })}
      </nav>
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

const ACHIEVEMENT_TITLE_BY_ID: Record<string, string> = {
  apg: "AST - Assists per game",
  "all-defense": "DEF - All-Defense teams",
  "all-nba": "ALL NBA - All-NBA teams",
  "all-rookie-1st": "R1 - All-Rookie 1st team",
  "all-rookie-2nd": "R2 - All-Rookie 2nd team",
  "all-star": "AS - All-Star selections",
  "all-star-mvp": "ASM - All-Star MVPs",
  assists: "AST - Assist titles",
  "avg-ts-pct": "AVG TS% - average true shooting",
  "avg-ts-star": "AVG TS* - average TS+ & TS% combined",
  "avg-ws-48": "AVG WS/48 - average win shares per 48",
  bpg: "BLK - Blocks per game",
  blocks: "BLK - Block titles",
  championship_rings: "RING - Championships",
  dpoy: "DPOY - Defensive Player of the Year",
  "sixth-man": "6MOY - Sixth Man of the Year",
  fmvp: "FMVP - Finals MVP",
  goat: "GOAT rank",
  mvp: "MVP - Most Valuable Player",
  "most-improved": "MIP - Most Improved Player",
  pra: "PRA - Pts + Rebs + Asts",
  rebs: "REB - Rebound titles",
  rebounds: "REB - Rebound titles",
  rings: "RING - Championships",
  roy: "ROY - Rookie of the Year",
  rpg: "REB - Rebounds per game",
  scoring: "SCO - Scoring titles",
  seasons: "YRS - Seasons played",
  spg: "STL - Steals per game",
  steals: "STL - Steal titles",
  stocks: "Stocks - Stls + Blks",
  "ts-plus": "TS+ - era-adjusted TS%",
  "ts-star": "TS* - TS+ & TS% combined",
  ts_pct: "TS% - true shooting",
  "ws-48": "WS/48 - Win shares per 48",
};

function achievementTitle(achievement: Achievement) {
  return achievement.title || ACHIEVEMENT_TITLE_BY_ID[achievement.id] || `${achievement.label}: ${achievement.value}`;
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
        <span
          aria-label={`${achievement.value} ${achievement.label}. ${achievementTitle(achievement)}`}
          className={`achievement-stat achievement-stat-${achievement.id} flex-shrink-0`}
          data-tooltip={achievementTitle(achievement)}
          key={achievement.id}
          title={achievementTitle(achievement)}
        >
          <span className="achievement-value">{achievement.value}</span>
          <span className="achievement-label">{achievement.label}</span>
        </span>
      ))}
    </span>
  );
}

function CourtSlot({
  achievementLimit,
  buildPlayerAchievements,
  canDragPlayer,
  lineup,
  position,
  selected,
  showAchievements,
  canDrop,
  blocked,
  swapTarget,
  onSelect,
  onPlayerDragEnd,
  onPlayerDragStart,
  onDragOver,
  onDrop,
}: {
  achievementLimit: number;
  buildPlayerAchievements: (player: Player, selection: DraftSelection) => Achievement[];
  canDragPlayer: boolean;
  lineup: Lineup;
  position: Position;
  selected: boolean;
  showAchievements: boolean;
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
  const courtAchievements =
    showAchievements && player && slot ? buildPlayerAchievements(player, slot.selection).slice(0, achievementLimit) : [];

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
  const rows: Achievement[][] = [];

  for (let index = 0; index < achievements.length; index += 2) {
    rows.push(achievements.slice(index, index + 2));
  }

  return (
    <span
      className="court-achievement-grid"
      aria-label={achievements.map((item) => `${item.value} ${item.label}`).join(", ")}
    >
      {rows.map((row) => (
        <span className="court-achievement-row" key={row.map((achievement) => achievement.id).join("-")}>
          {row.map((achievement, index) => (
            <span
              aria-label={`${achievement.value} ${achievement.label}. ${achievementTitle(achievement)}`}
              className="court-achievement-item"
              data-tooltip={achievementTitle(achievement)}
              key={achievement.id}
              title={achievementTitle(achievement)}
            >
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
