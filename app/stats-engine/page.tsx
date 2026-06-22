"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const TEST_PLAYER_NAME = "Michael Jordan";
const FALLBACK_SCALING_FACTOR = 250;
const FALLBACK_WS_48_BASELINE = 0.1;

type StatWeights = {
  asts: number;
  pts: number;
  rebs: number;
  stocks: number;
  ts_impact: number;
  ts_peer_weight: number;
  ts_skill_weight: number;
  wsImpact: number;
};
type StatWeightKey = keyof StatWeights;
type ConfigStatWeights = Partial<StatWeights> & {
  tsImpact?: number;
  tsPeerWeight?: number;
  tsSkillWeight?: number;
};
type WeightField = {
  key: StatWeightKey;
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
};
type SeasonStat = {
  season?: string | null;
  team?: string | null;
  era?: string | null;
  games_played?: number | string | null;
  gamesPlayed?: number | string | null;
  GP?: number | string | null;
  gp?: number | string | null;
  ppg?: number | string | null;
  PPG?: number | string | null;
  rpg?: number | string | null;
  RPG?: number | string | null;
  apg?: number | string | null;
  APG?: number | string | null;
  spg?: number | string | null;
  SPG?: number | string | null;
  bpg?: number | string | null;
  BPG?: number | string | null;
  ts_pct?: number | string | null;
  TS_PCT?: number | string | null;
  "TS%"?: number | string | null;
  true_shooting_pct?: number | string | null;
  trueShootingPct?: number | string | null;
  true_shooting_percentage?: number | string | null;
  ws_48?: number | string | null;
  ws_per_48?: number | string | null;
  wsPer48?: number | string | null;
};
type ClassicBlock = {
  team?: string | null;
  era?: string | null;
  points?: number | null;
};
type Player = {
  id?: string | number;
  name: string;
  career_seasons?: SeasonStat[];
  classic_points_by_team_era?: ClassicBlock[];
  legacy_points?: number | null;
};
type LeagueAverage = Record<string, number | string | null | undefined>;
type LeagueAverages = Record<string, LeagueAverage>;
type StatsEngineConfigPayload = {
  leagueAverages?: LeagueAverages;
  scalingFactor?: number;
  statWeights?: ConfigStatWeights;
  ws48Baseline?: number;
};
type ScopeOption = {
  era?: string;
  key: string;
  label: string;
  storedPoints?: number | null;
  team?: string;
};
type SeasonScore = {
  baseIndex: number;
  components: {
    asts: number;
    pts: number;
    rebs: number;
    stocks: number;
    tsHybrid: number;
    ws: number;
  };
  efficiencyModifier: number;
  issues: string[];
  points: number;
  season: string;
  team: string;
  totalIndex: number;
};
type StatLine = Record<"apg" | "bpg" | "ppg" | "rpg" | "spg" | "ts_pct" | "ws_48", number | null>;
type ScoreResult = {
  averageBaseIndex: number;
  averageEfficiencyModifier: number;
  averageIndex: number;
  componentAverages: SeasonScore["components"];
  issueCount: number;
  points: number;
  scoredSeasons: number;
  seasonScores: SeasonScore[];
  statLine: StatLine;
  totalSeasons: number;
};

const DEFAULT_WEIGHTS: StatWeights = {
  asts: 0.55,
  pts: 0.8,
  rebs: 0.45,
  stocks: 0.25,
  ts_impact: 1,
  ts_peer_weight: 0.5,
  ts_skill_weight: 0.5,
  wsImpact: 1.5,
};

const WEIGHT_FIELDS: WeightField[] = [
  { key: "pts", label: "PTS", min: 0, max: 2.5, step: 0.05, digits: 2 },
  { key: "asts", label: "AST", min: 0, max: 2.5, step: 0.05, digits: 2 },
  { key: "rebs", label: "REB", min: 0, max: 2.5, step: 0.05, digits: 2 },
  { key: "stocks", label: "Stocks", min: 0, max: 1.5, step: 0.05, digits: 2 },
  { key: "ts_impact", label: "TS% Impact", min: 0, max: 2, step: 0.01, digits: 2 },
  { key: "ts_peer_weight", label: "TS Peer Weight", min: 0, max: 1, step: 0.01, digits: 2 },
  { key: "ts_skill_weight", label: "TS Skill Weight", min: 0, max: 1, step: 0.01, digits: 2 },
  { key: "wsImpact", label: "WS/48 Impact", min: 0, max: 1.5, step: 0.01, digits: 2 },
];

const STAT_LINE_FIELDS: Array<{ key: keyof StatLine; label: string; digits: number }> = [
  { key: "ppg", label: "PTS", digits: 1 },
  { key: "rpg", label: "REB", digits: 1 },
  { key: "apg", label: "AST", digits: 1 },
  { key: "spg", label: "STL", digits: 1 },
  { key: "bpg", label: "BLK", digits: 1 },
  { key: "ts_pct", label: "TS%", digits: 3 },
  { key: "ws_48", label: "WS/48", digits: 3 },
];

const EMPTY_COMPONENTS: SeasonScore["components"] = {
  asts: 0,
  pts: 0,
  rebs: 0,
  stocks: 0,
  tsHybrid: 0,
  ws: 0,
};

const EMPTY_STAT_LINE: StatLine = {
  apg: null,
  bpg: null,
  ppg: null,
  rpg: null,
  spg: null,
  ts_pct: null,
  ws_48: null,
};

const EMPTY_SCORE: ScoreResult = {
  averageBaseIndex: 0,
  averageEfficiencyModifier: 1,
  averageIndex: 0,
  componentAverages: EMPTY_COMPONENTS,
  issueCount: 0,
  points: 0,
  scoredSeasons: 0,
  seasonScores: [],
  statLine: EMPTY_STAT_LINE,
  totalSeasons: 0,
};

const PLAYER_METRIC_KEYS: Record<keyof StatLine, string[]> = {
  apg: ["apg", "APG"],
  bpg: ["bpg", "BPG"],
  ppg: ["ppg", "PPG"],
  rpg: ["rpg", "RPG"],
  spg: ["spg", "SPG"],
  ts_pct: ["ts_pct", "TS_PCT", "TS%", "true_shooting_pct", "trueShootingPct", "true_shooting_percentage"],
  ws_48: ["ws_48", "ws_per_48", "wsPer48"],
};

const LEAGUE_METRIC_KEYS: Record<"apg" | "bpg" | "ppg" | "rpg" | "spg" | "ts_pct", string[]> = {
  apg: ["APG", "apg"],
  bpg: ["BPG", "bpg"],
  ppg: ["PPG", "ppg"],
  rpg: ["RPG", "rpg"],
  spg: ["SPG", "spg"],
  ts_pct: ["league_ts_pct", "leagueTsPct", "TS_PCT", "ts_pct", "TS%", "true_shooting_pct", "trueShootingPct"],
};

function numericValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = numericValue(value);
  return numeric === null ? fallback : numeric;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundWeight(value: number) {
  return Number(value.toFixed(4));
}

function resolveTsWeights(peerInput: unknown, skillInput?: unknown) {
  const peerWeight = numericValue(peerInput);
  const skillWeight = numericValue(skillInput);
  const peer = clamp(
    peerWeight !== null
      ? peerWeight
      : skillWeight !== null
        ? 1 - skillWeight
        : DEFAULT_WEIGHTS.ts_peer_weight,
    0,
    1,
  );

  return {
    peer: roundWeight(peer),
    skill: roundWeight(1 - peer),
  };
}

function eraAdjustedTsPct(playerTs: number, leagueTs: number) {
  return playerTs + (playerTs - leagueTs);
}

function tsHybridPct(playerTs: number, leagueTs: number, weights: StatWeights) {
  const tsWeights = resolveTsWeights(weights.ts_peer_weight, weights.ts_skill_weight);
  const adjustedTs = eraAdjustedTsPct(playerTs, leagueTs);

  return adjustedTs * tsWeights.peer + playerTs * tsWeights.skill;
}

function firstNumericValue(source: Record<string, unknown> | undefined | null, keys: string[]) {
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

function firstPositiveNumericValue(source: Record<string, unknown> | undefined | null, keys: string[]) {
  const numeric = firstNumericValue(source, keys);
  return numeric !== null && numeric > 0 ? numeric : null;
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

function leagueAverageForSeason(leagueAverages: LeagueAverages, season: unknown) {
  for (const key of seasonKeyCandidates(season)) {
    if (leagueAverages[key]) {
      return leagueAverages[key];
    }
  }

  return null;
}

function playerMetricValue(season: SeasonStat, metric: keyof StatLine) {
  return firstNumericValue(season as Record<string, unknown>, PLAYER_METRIC_KEYS[metric]);
}

function leagueMetricValue(leagueAverage: LeagueAverage | null, metric: keyof typeof LEAGUE_METRIC_KEYS) {
  return firstPositiveNumericValue(leagueAverage, LEAGUE_METRIC_KEYS[metric]);
}

function gamesPlayed(season: SeasonStat) {
  return firstPositiveNumericValue(season as Record<string, unknown>, ["games_played", "gamesPlayed", "gp", "GP"]);
}

function mergeWeights(statWeights: ConfigStatWeights | undefined) {
  const nextWeights = { ...DEFAULT_WEIGHTS };

  for (const field of WEIGHT_FIELDS) {
    const numeric = numericValue(statWeights?.[field.key]);

    if (numeric !== null) {
      nextWeights[field.key] = numeric;
    }
  }

  const tsImpact = numericValue(statWeights?.ts_impact ?? statWeights?.tsImpact);
  const tsPeerWeight = numericValue(statWeights?.ts_peer_weight ?? statWeights?.tsPeerWeight);
  const tsSkillWeight = numericValue(statWeights?.ts_skill_weight ?? statWeights?.tsSkillWeight);
  const tsWeights = resolveTsWeights(tsPeerWeight, tsSkillWeight);

  if (tsImpact !== null) {
    nextWeights.ts_impact = tsImpact;
  }

  nextWeights.ts_peer_weight = tsWeights.peer;
  nextWeights.ts_skill_weight = tsWeights.skill;

  return nextWeights;
}

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatOptional(value: number | null, digits = 1) {
  return value === null ? "-" : formatNumber(value, digits);
}

function formatSigned(value: number, digits = 3) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, digits)}`;
}

function trimNumber(value: number) {
  return Number(value.toFixed(4)).toString();
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function scopeOptionsForPlayer(player: Player | null): ScopeOption[] {
  if (!player) {
    return [{ key: "career", label: "Career" }];
  }

  const blockOptions = (player.classic_points_by_team_era || [])
    .filter((block) => block.team && block.era)
    .map((block) => ({
      era: String(block.era),
      key: `${block.team}:${block.era}`,
      label: `${block.team} ${block.era}`,
      storedPoints: block.points,
      team: String(block.team),
    }));

  return [{ key: "career", label: "Career" }, ...blockOptions];
}

function seasonsForScope(player: Player | null, scope: ScopeOption) {
  const seasons = player?.career_seasons || [];

  if (!scope.team || !scope.era) {
    return seasons;
  }

  return seasons.filter((season) => season.team === scope.team && season.era === scope.era);
}

function averagedStatLine(seasons: SeasonStat[]): StatLine {
  const totals = Object.fromEntries(
    STAT_LINE_FIELDS.map((field) => [field.key, { games: 0, samples: 0, value: 0 }]),
  ) as Record<keyof StatLine, { games: number; samples: number; value: number }>;

  for (const season of seasons) {
    const games = gamesPlayed(season);

    for (const field of STAT_LINE_FIELDS) {
      const value = playerMetricValue(season, field.key);

      if (value === null) {
        continue;
      }

      if (games) {
        totals[field.key].games += games;
        totals[field.key].value += value * games;
      } else {
        totals[field.key].samples += 1;
        totals[field.key].value += value;
      }
    }
  }

  return Object.fromEntries(
    STAT_LINE_FIELDS.map((field) => {
      const total = totals[field.key];
      const value =
        total.games > 0
          ? total.value / total.games
          : total.samples > 0
            ? total.value / total.samples
            : null;

      return [field.key, value === null ? null : Number(value.toFixed(field.digits))];
    }),
  ) as StatLine;
}

function scoreSeason(
  season: SeasonStat,
  leagueAverages: LeagueAverages,
  weights: StatWeights,
  ws48Baseline: number,
  scalingFactor: number,
): SeasonScore | null {
  const leagueAverage = leagueAverageForSeason(leagueAverages, season.season);
  const issues: string[] = [];

  if (!leagueAverage) {
    return null;
  }

  const playerPpg = playerMetricValue(season, "ppg");
  const playerRpg = playerMetricValue(season, "rpg");
  const playerApg = playerMetricValue(season, "apg");
  const leaguePpg = leagueMetricValue(leagueAverage, "ppg");
  const leagueRpg = leagueMetricValue(leagueAverage, "rpg");
  const leagueApg = leagueMetricValue(leagueAverage, "apg");

  if (playerPpg === null || playerRpg === null || playerApg === null || !leaguePpg || !leagueRpg || !leagueApg) {
    return null;
  }

  const leagueSpg = leagueMetricValue(leagueAverage, "spg");
  const leagueBpg = leagueMetricValue(leagueAverage, "bpg");
  const hasDefensiveBaseline = leagueSpg !== null && leagueBpg !== null;
  const totalVolumeWeight = weights.pts + weights.rebs + weights.asts + weights.stocks * 2;
  const ptsWeight = hasDefensiveBaseline ? weights.pts : totalVolumeWeight / 3;
  const rebsWeight = hasDefensiveBaseline ? weights.rebs : totalVolumeWeight / 3;
  const astsWeight = hasDefensiveBaseline ? weights.asts : totalVolumeWeight / 3;
  const ptsComponent = (playerPpg / leaguePpg) * ptsWeight;
  const rebsComponent = (playerRpg / leagueRpg) * rebsWeight;
  const astsComponent = (playerApg / leagueApg) * astsWeight;
  let stocksComponent = 0;

  if (leagueSpg !== null && leagueBpg !== null) {
    const playerSpg = playerMetricValue(season, "spg");
    const playerBpg = playerMetricValue(season, "bpg");

    if (playerSpg === null || playerBpg === null) {
      return null;
    }

    stocksComponent = (playerSpg / leagueSpg) * weights.stocks + (playerBpg / leagueBpg) * weights.stocks;
  } else if (weights.stocks > 0) {
    issues.push("stocks redistributed");
  }

  const playerTs = playerMetricValue(season, "ts_pct");
  const leagueTs = leagueMetricValue(leagueAverage, "ts_pct");
  const playerWs48 = playerMetricValue(season, "ws_48");
  let tsHybrid = 0;

  if (playerTs !== null && leagueTs) {
    const hybrid = tsHybridPct(playerTs, leagueTs, weights);

    tsHybrid = Number.isFinite(hybrid) ? (hybrid - leagueTs) * weights.ts_impact : 0;
  }

  const ws = playerWs48 !== null ? (playerWs48 - ws48Baseline) * weights.wsImpact : 0;
  const efficiencyModifier = 1 + tsHybrid + ws;
  const baseIndex = ptsComponent + rebsComponent + astsComponent + stocksComponent;
  const totalIndex = baseIndex * efficiencyModifier;

  return {
    baseIndex,
    components: {
      asts: astsComponent,
      pts: ptsComponent,
      rebs: rebsComponent,
      stocks: stocksComponent,
      tsHybrid,
      ws,
    },
    efficiencyModifier,
    issues,
    points: totalIndex * scalingFactor,
    season: String(season.season || ""),
    team: String(season.team || ""),
    totalIndex,
  };
}

function scorePlayer(
  player: Player | null,
  scope: ScopeOption,
  leagueAverages: LeagueAverages,
  weights: StatWeights,
  ws48Baseline: number,
  scalingFactor: number,
): ScoreResult {
  const seasons = seasonsForScope(player, scope);
  const seasonScores = seasons
    .map((season) => scoreSeason(season, leagueAverages, weights, ws48Baseline, scalingFactor))
    .filter((score): score is SeasonScore => Boolean(score));

  if (!seasonScores.length) {
    return {
      ...EMPTY_SCORE,
      statLine: averagedStatLine(seasons),
      totalSeasons: seasons.length,
    };
  }

  const totals = seasonScores.reduce(
    (sum, seasonScore) => ({
      baseIndex: sum.baseIndex + seasonScore.baseIndex,
      components: {
        asts: sum.components.asts + seasonScore.components.asts,
        pts: sum.components.pts + seasonScore.components.pts,
        rebs: sum.components.rebs + seasonScore.components.rebs,
        stocks: sum.components.stocks + seasonScore.components.stocks,
        tsHybrid: sum.components.tsHybrid + seasonScore.components.tsHybrid,
        ws: sum.components.ws + seasonScore.components.ws,
      },
      efficiencyModifier: sum.efficiencyModifier + seasonScore.efficiencyModifier,
      issues: sum.issues + seasonScore.issues.length,
      totalIndex: sum.totalIndex + seasonScore.totalIndex,
    }),
    {
      baseIndex: 0,
      components: { ...EMPTY_COMPONENTS },
      efficiencyModifier: 0,
      issues: 0,
      totalIndex: 0,
    },
  );
  const scoredSeasons = seasonScores.length;
  const averageIndex = totals.totalIndex / scoredSeasons;

  return {
    averageBaseIndex: totals.baseIndex / scoredSeasons,
    averageEfficiencyModifier: totals.efficiencyModifier / scoredSeasons,
    averageIndex,
    componentAverages: {
      asts: totals.components.asts / scoredSeasons,
      pts: totals.components.pts / scoredSeasons,
      rebs: totals.components.rebs / scoredSeasons,
      stocks: totals.components.stocks / scoredSeasons,
      tsHybrid: totals.components.tsHybrid / scoredSeasons,
      ws: totals.components.ws / scoredSeasons,
    },
    issueCount: totals.issues,
    points: averageIndex * scalingFactor,
    scoredSeasons,
    seasonScores,
    statLine: averagedStatLine(seasons),
    totalSeasons: seasons.length,
  };
}

function weightsObjectString(weights: StatWeights) {
  const tsWeights = resolveTsWeights(weights.ts_peer_weight, weights.ts_skill_weight);

  return `const STATS_ENGINE_WEIGHTS = {
  pts: ${trimNumber(weights.pts)},
  asts: ${trimNumber(weights.asts)},
  rebs: ${trimNumber(weights.rebs)},
  stocks: ${trimNumber(weights.stocks)},
  ts_impact: ${trimNumber(weights.ts_impact)},
  ts_peer_weight: ${trimNumber(tsWeights.peer)},
  ts_skill_weight: ${trimNumber(tsWeights.skill)},
  wsImpact: ${trimNumber(weights.wsImpact)},
};`;
}

function SliderNumberControl({
  digits,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  digits: number;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const normalizedValue = clamp(value, min, max);

  function commit(rawValue: string) {
    const nextValue = clamp(numberValue(rawValue), min, max);
    onChange(step >= 1 ? Math.round(nextValue) : nextValue);
  }

  return (
    <label className="stats-control">
      <span className="stats-control-label">
        <span>{label}</span>
        <strong>{formatNumber(normalizedValue, digits)}</strong>
      </span>
      <span className="stats-control-inputs">
        <input
          aria-label={`${label} slider`}
          max={max}
          min={min}
          onChange={(event) => commit(event.target.value)}
          step={step}
          type="range"
          value={normalizedValue}
        />
        <input
          aria-label={label}
          max={max}
          min={min}
          onChange={(event) => commit(event.target.value)}
          step={step}
          type="number"
          value={normalizedValue}
        />
      </span>
    </label>
  );
}

function MetricCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "accent" | "warm";
}) {
  return (
    <div className="stats-metric">
      <span>{label}</span>
      <strong className={variant ? `stats-metric-${variant}` : undefined}>{value}</strong>
    </div>
  );
}

export default function StatsEnginePage() {
  const [defaultWeights, setDefaultWeights] = useState<StatWeights>(DEFAULT_WEIGHTS);
  const [weights, setWeights] = useState<StatWeights>(DEFAULT_WEIGHTS);
  const [leagueAverages, setLeagueAverages] = useState<LeagueAverages>({});
  const [ws48Baseline, setWs48Baseline] = useState(FALLBACK_WS_48_BASELINE);
  const [scalingFactor, setScalingFactor] = useState(FALLBACK_SCALING_FACTOR);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState(TEST_PLAYER_NAME);
  const [playerSearchFocused, setPlayerSearchFocused] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [scopeKey, setScopeKey] = useState("career");
  const [copied, setCopied] = useState(false);

  const defaultSelectedPlayer = useMemo(
    () => players.find((player) => player.name === TEST_PLAYER_NAME) || players[0] || null,
    [players],
  );
  const activePlayer = selectedPlayer || defaultSelectedPlayer;
  const scopeOptions = useMemo(() => scopeOptionsForPlayer(activePlayer), [activePlayer]);
  const selectedScope = useMemo(
    () => scopeOptions.find((option) => option.key === scopeKey) || scopeOptions[0],
    [scopeKey, scopeOptions],
  );
  const selectedScore = useMemo(
    () =>
      scorePlayer(
        activePlayer,
        selectedScope,
        leagueAverages,
        weights,
        ws48Baseline,
        scalingFactor,
      ),
    [activePlayer, leagueAverages, scalingFactor, selectedScope, weights, ws48Baseline],
  );
  const weightsCode = useMemo(() => weightsObjectString(weights), [weights]);
  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          numberValue(b.legacy_points) - numberValue(a.legacy_points) ||
          a.name.localeCompare(b.name),
      ),
    [players],
  );
  const filteredPlayers = useMemo(() => {
    const query =
      normalizeSearchValue(playerSearch) === normalizeSearchValue(TEST_PLAYER_NAME)
        ? ""
        : normalizeSearchValue(playerSearch);
    const candidates = query
      ? sortedPlayers.filter((player) => normalizeSearchValue(player.name).includes(query))
      : sortedPlayers;

    return candidates.slice(0, 10);
  }, [playerSearch, sortedPlayers]);
  const careerRankings = useMemo(
    () =>
      players
        .map((player) => {
          const score = scorePlayer(
            player,
            { key: "career", label: "Career" },
            leagueAverages,
            weights,
            ws48Baseline,
            scalingFactor,
          );

          return { player, score };
        })
        .filter((row) => row.score.scoredSeasons > 0)
        .sort((a, b) => b.score.points - a.score.points)
        .slice(0, 10),
    [leagueAverages, players, scalingFactor, weights, ws48Baseline],
  );
  const componentRows = useMemo(
    () => [
      { label: "PTS", value: selectedScore.componentAverages.pts },
      { label: "AST", value: selectedScore.componentAverages.asts },
      { label: "REB", value: selectedScore.componentAverages.rebs },
      { label: "Stocks", value: selectedScore.componentAverages.stocks },
      { label: "TS Hybrid", value: selectedScore.componentAverages.tsHybrid },
      { label: "WS/48", value: selectedScore.componentAverages.ws },
    ],
    [selectedScore],
  );
  const maxComponent = useMemo(
    () => Math.max(0.001, ...componentRows.map((row) => Math.abs(row.value))),
    [componentRows],
  );
  const recentSeasonScores = useMemo(
    () => [...selectedScore.seasonScores].reverse().slice(0, 8),
    [selectedScore.seasonScores],
  );
  const showPlayerOptions = playerSearchFocused && !playersError;

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats-engine-config`, { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const config = (await response.json()) as StatsEngineConfigPayload;
        const nextWeights = mergeWeights(config.statWeights);

        if (!active) {
          return;
        }

        setDefaultWeights(nextWeights);
        setWeights(nextWeights);
        setLeagueAverages(config.leagueAverages || {});
        setWs48Baseline(numberValue(config.ws48Baseline, FALLBACK_WS_48_BASELINE));
        setScalingFactor(numberValue(config.scalingFactor, FALLBACK_SCALING_FACTOR));
      } catch {
        // Keep local fallback values if the API is unavailable.
      }
    }

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPlayers() {
      try {
        setPlayersLoading(true);
        setPlayersError(null);

        const response = await fetch(`${API_BASE_URL}/api/players`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const playerRows = ((await response.json()) as Player[]).filter((player) => player.name);

        if (!active) {
          return;
        }

        setPlayers(playerRows);
      } catch (error) {
        if (active) {
          setPlayersError(error instanceof Error ? error.message : "Unable to load players");
        }
      } finally {
        if (active) {
          setPlayersLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  function updateWeight(key: StatWeightKey, value: number) {
    setWeights((currentWeights) => {
      if (key === "ts_peer_weight") {
        const tsWeights = resolveTsWeights(value);

        return {
          ...currentWeights,
          ts_peer_weight: tsWeights.peer,
          ts_skill_weight: tsWeights.skill,
        };
      }

      if (key === "ts_skill_weight") {
        const tsWeights = resolveTsWeights(null, value);

        return {
          ...currentWeights,
          ts_peer_weight: tsWeights.peer,
          ts_skill_weight: tsWeights.skill,
        };
      }

      return { ...currentWeights, [key]: value };
    });
  }

  function selectPlayer(player: Player) {
    setSelectedPlayer(player);
    setPlayerSearch(player.name);
    setPlayerSearchFocused(false);
    setScopeKey("career");
  }

  async function copyWeights() {
    try {
      await navigator.clipboard.writeText(weightsCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="stats-engine-page">
      <aside className="stats-sidebar" aria-label="Stats weight configurator">
        <div className="stats-sidebar-header">
          <Link className="stats-back-link" href="/">
            82-0
          </Link>
          <p className="stats-eyebrow">Stats Engine</p>
          <h1>Era Lab</h1>
        </div>

        <div className="stats-sidebar-actions">
          <button type="button" onClick={() => setWeights(defaultWeights)}>
            Reset Weights
          </button>
          <button type="button" onClick={copyWeights}>
            {copied ? "Copied" : "Copy Object"}
          </button>
        </div>

        <div className="stats-weight-list">
          {WEIGHT_FIELDS.map((field) => (
            <SliderNumberControl
              digits={field.digits}
              key={field.key}
              label={field.label}
              max={field.max}
              min={field.min}
              onChange={(value) => updateWeight(field.key, value)}
              step={field.step}
              value={weights[field.key]}
            />
          ))}
        </div>
      </aside>

      <section className="stats-workbench">
        <header className="stats-topbar">
          <div className="stats-player-picker">
            <p className="stats-eyebrow">Player</p>
            <div className="stats-player-title-field">
              <input
                aria-autocomplete="list"
                aria-controls="stats-player-options"
                aria-expanded={showPlayerOptions}
                aria-haspopup="listbox"
                aria-label="Search and select player"
                className="stats-player-name-input"
                onBlur={() => window.setTimeout(() => setPlayerSearchFocused(false), 120)}
                onChange={(event) => {
                  setPlayerSearch(event.target.value);
                  setPlayerSearchFocused(true);
                }}
                onFocus={(event) => {
                  setPlayerSearchFocused(true);

                  if (playerSearch === TEST_PLAYER_NAME) {
                    event.currentTarget.select();
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPlayerSearchFocused(false);
                  }
                }}
                placeholder={playersLoading ? "Loading players..." : "Search NBA history"}
                role="combobox"
                type="search"
                value={playerSearch}
              />

              {playersError ? (
                <p className="stats-player-picker-message">Player API unavailable: {playersError}</p>
              ) : null}

              {showPlayerOptions ? (
                <div className="stats-player-options" id="stats-player-options" role="listbox">
                  {playersLoading ? (
                    <p className="stats-player-picker-message">Loading players...</p>
                  ) : filteredPlayers.length ? (
                    filteredPlayers.map((player) => (
                      <button
                        aria-selected={activePlayer?.name === player.name}
                        className="stats-player-option"
                        key={`${player.id ?? player.name}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectPlayer(player)}
                        role="option"
                        type="button"
                      >
                        <span>{player.name}</span>
                        <small>{formatNumber(numberValue(player.legacy_points), 2)} LP</small>
                      </button>
                    ))
                  ) : (
                    <p className="stats-player-picker-message">No players found.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <label className="stats-scope-control">
            <span>Scope</span>
            <select
              aria-label="Stats scoring scope"
              onChange={(event) => setScopeKey(event.target.value)}
              value={selectedScope.key}
            >
              {scopeOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="stats-baseline-strip">
            <span>
              WS/48 Base <strong>{formatNumber(ws48Baseline, 3)}</strong>
            </span>
            <span>
              Scale <strong>{formatNumber(scalingFactor, 0)}</strong>
            </span>
          </div>
        </header>

        <div className="stats-dashboard">
          <section className="stats-score-strip" aria-live="polite">
            <MetricCard label="Stats Score" value={formatNumber(selectedScore.points, 2)} variant="accent" />
            <MetricCard label="Base Volume" value={formatNumber(selectedScore.averageBaseIndex, 3)} />
            <MetricCard label="Efficiency Modifier" value={formatNumber(selectedScore.averageEfficiencyModifier, 3)} variant="warm" />
            <MetricCard
              label="Scored Seasons"
              value={`${formatNumber(selectedScore.scoredSeasons, 0)} / ${formatNumber(selectedScore.totalSeasons, 0)}`}
            />
          </section>

          <section className="stats-panel stats-breakdown-panel" aria-label="Score component breakdown">
            <div className="stats-panel-heading">
              <h2>Component Breakdown</h2>
              {selectedScope.storedPoints ? <span>Stored {formatNumber(selectedScope.storedPoints, 2)}</span> : null}
            </div>
            <div className="stats-component-list">
              {componentRows.map((row) => {
                const percent = Math.min(100, (Math.abs(row.value) / maxComponent) * 100);

                return (
                  <div className="stats-component-row" key={row.label}>
                    <span>{row.label}</span>
                    <div className="stats-component-track">
                      <i
                        className={row.value < 0 ? "stats-component-bar stats-component-bar-negative" : "stats-component-bar"}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <strong>{row.label.includes("TS") || row.label === "WS/48" ? formatSigned(row.value, 4) : formatNumber(row.value, 3)}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="stats-panel stats-statline-panel" aria-label="Selected player stat line">
            <div className="stats-panel-heading">
              <h2>Stat Line</h2>
            </div>
            <div className="stats-statline-grid">
              {STAT_LINE_FIELDS.map((field) => (
                <div className="stats-statline-tile" key={field.key}>
                  <span>{field.label}</span>
                  <strong>{formatOptional(selectedScore.statLine[field.key], field.digits)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-panel stats-season-panel" aria-label="Season scoring rows">
            <div className="stats-panel-heading">
              <h2>Season Rows</h2>
              {selectedScore.issueCount ? <span>{selectedScore.issueCount} notes</span> : null}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Team</th>
                  <th>Base</th>
                  <th>Eff</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {recentSeasonScores.length ? (
                  recentSeasonScores.map((seasonScore) => (
                    <tr key={`${seasonScore.season}:${seasonScore.team}`}>
                      <td>{seasonScore.season}</td>
                      <td>{seasonScore.team}</td>
                      <td>{formatNumber(seasonScore.baseIndex, 3)}</td>
                      <td>{formatNumber(seasonScore.efficiencyModifier, 3)}</td>
                      <td>{formatNumber(seasonScore.points, 2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No scored seasons.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="stats-panel stats-ranking-panel" aria-label="Career stats ranking">
            <div className="stats-panel-heading">
              <h2>Career Ranking</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {careerRankings.map((row, index) => (
                  <tr key={`${row.player.id ?? row.player.name}:career`}>
                    <td>
                      <span className="stats-rank-pill">{index + 1}</span>
                    </td>
                    <td>{row.player.name}</td>
                    <td>{formatNumber(row.score.points, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="stats-panel stats-code-panel" aria-label="Current stats weights object">
            <div className="stats-panel-heading">
              <h2>STATS_ENGINE_WEIGHTS</h2>
              <button type="button" onClick={copyWeights}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>{weightsCode}</pre>
          </section>
        </div>
      </section>
    </main>
  );
}
