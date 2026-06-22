"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCachedPlayers, loadApiJson, loadPlayers } from "../apiClient";

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
  all_star_mvp_count: 1,
  all_star_selections: 1,
  "6moy": 1,
  most_improved: 1,
  roy_won: 1,
  all_rookie_1st: 1,
  all_rookie_2nd: 0.75,
  seasons_played: 0.25,
  games_started: 0.01,
};

type AccoladeKey = keyof typeof ACCOLADE_WEIGHTS;
type AccoladeValues = Record<AccoladeKey, number>;
type EngineParams = {
  descentExponent: number;
  descentNumerator: number;
  ascentMultiplier: number;
  densityBonusMultiplier: number;
};
type AccoladeField = {
  key: AccoladeKey;
  label: string;
  countDefault: number;
  maxCount: number;
  weightMax: number;
  weightStep?: number;
};
type EngineField = {
  key: keyof EngineParams;
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
};
type LegacyScore = {
  basePoints: number;
  seasons: number;
  descent: number;
  ascent: number;
  uShapeModifier: number;
  densityBonus: number;
  totalLegacyScore: number;
};
type LegacyEngineConfigPayload = {
  accoladeWeights?: Partial<AccoladeValues>;
  legacyEngineFactors?: Partial<EngineParams>;
};
type HistoryPlayer = {
  id?: string | number;
  name: string;
  legacy_points?: number;
  accolades?: Partial<Record<AccoladeKey, number | boolean | null>>;
};

const TEST_PLAYER_NAME = "Test Player";
const FALLBACK_ENGINE_PARAMS: EngineParams = {
  descentExponent: 0.2,
  descentNumerator: 3.2,
  ascentMultiplier: 0.0035,
  densityBonusMultiplier: 0.1,
};

function sortHistoryPlayers(players: HistoryPlayer[]) {
  return [...players]
    .filter((historyPlayer) => historyPlayer.name)
    .sort(
      (a, b) =>
        numberValue(b.legacy_points) - numberValue(a.legacy_points) ||
        a.name.localeCompare(b.name),
    );
}

const ACCOLADE_FIELDS: AccoladeField[] = [
  { key: "mvp_count", label: "MVP", countDefault: 1, maxCount: 8, weightMax: 16 },
  { key: "finals_mvp_count", label: "Finals MVP", countDefault: 1, maxCount: 8, weightMax: 16 },
  { key: "all_nba_1st", label: "All-NBA 1st", countDefault: 3, maxCount: 16, weightMax: 16 },
  { key: "all_nba_2nd", label: "All-NBA 2nd", countDefault: 2, maxCount: 16, weightMax: 14 },
  { key: "all_nba_3rd", label: "All-NBA 3rd", countDefault: 1, maxCount: 16, weightMax: 12 },
  { key: "championship_rings", label: "Rings", countDefault: 1, maxCount: 12, weightMax: 8 },
  { key: "dpoy_count", label: "DPOY", countDefault: 0, maxCount: 6, weightMax: 8 },
  { key: "all_def_1st", label: "All-Defense 1st", countDefault: 1, maxCount: 12, weightMax: 8 },
  { key: "all_def_2nd", label: "All-Defense 2nd", countDefault: 1, maxCount: 12, weightMax: 7 },
  { key: "scoring_titles", label: "Scoring Titles", countDefault: 1, maxCount: 12, weightMax: 8 },
  { key: "assist_titles", label: "Assist Titles", countDefault: 0, maxCount: 12, weightMax: 8 },
  { key: "rebound_titles", label: "Rebound Titles", countDefault: 0, maxCount: 12, weightMax: 7 },
  { key: "steal_titles", label: "Steal Titles", countDefault: 0, maxCount: 12, weightMax: 6 },
  { key: "block_titles", label: "Block Titles", countDefault: 0, maxCount: 12, weightMax: 6 },
  { key: "all_star_mvp_count", label: "All-Star MVP", countDefault: 0, maxCount: 8, weightMax: 5 },
  { key: "all_star_selections", label: "All-Star Selections", countDefault: 7, maxCount: 25, weightMax: 5 },
  { key: "6moy", label: "Sixth Man", countDefault: 0, maxCount: 5, weightMax: 5 },
  { key: "most_improved", label: "Most Improved", countDefault: 0, maxCount: 3, weightMax: 5 },
  { key: "roy_won", label: "Rookie of the Year", countDefault: 0, maxCount: 1, weightMax: 5 },
  { key: "all_rookie_1st", label: "All-Rookie 1st", countDefault: 1, maxCount: 2, weightMax: 5 },
  { key: "all_rookie_2nd", label: "All-Rookie 2nd", countDefault: 0, maxCount: 2, weightMax: 5 },
  { key: "seasons_played", label: "Seasons Played", countDefault: 12, maxCount: 35, weightMax: 2 },
  {
    key: "games_started",
    label: "Games Started",
    countDefault: 720,
    maxCount: 1800,
    weightMax: 0.08,
    weightStep: 0.001,
  },
];

const ENGINE_FIELDS: EngineField[] = [
  { key: "descentExponent", label: "Descent Exponent", min: 0, max: 2.5, step: 0.01, digits: 2 },
  { key: "descentNumerator", label: "Descent Numerator", min: 0, max: 100, step: 0.05, digits: 2 },
  { key: "ascentMultiplier", label: "Ascent Multiplier", min: 0, max: 1.0, step: 0.0001, digits: 4 },
  { key: "densityBonusMultiplier", label: "Density Bonus Multiplier", min: 0, max: 8, step: 0.05, digits: 2 },
];

const PRESET_PROFILES: Array<{ name: string; accolades: Partial<AccoladeValues> }> = [
  {
    name: "Peak Monster",
    accolades: {
      mvp_count: 3,
      finals_mvp_count: 2,
      all_nba_1st: 6,
      all_nba_2nd: 1,
      championship_rings: 2,
      scoring_titles: 4,
      all_star_selections: 9,
      seasons_played: 9,
      games_started: 680,
    },
  },
  {
    name: "Longevity Star",
    accolades: {
      mvp_count: 1,
      finals_mvp_count: 1,
      all_nba_1st: 5,
      all_nba_2nd: 5,
      all_nba_3rd: 4,
      championship_rings: 2,
      all_def_1st: 3,
      all_star_selections: 17,
      seasons_played: 21,
      games_started: 1400,
    },
  },
  {
    name: "Two-Way Anchor",
    accolades: {
      dpoy_count: 3,
      all_nba_1st: 2,
      all_nba_2nd: 3,
      all_def_1st: 8,
      all_def_2nd: 2,
      rebound_titles: 2,
      block_titles: 2,
      all_star_selections: 11,
      seasons_played: 14,
      games_started: 910,
    },
  },
  {
    name: "Starter Compiler",
    accolades: {
      all_nba_3rd: 2,
      all_def_2nd: 2,
      all_star_selections: 5,
      seasons_played: 18,
      games_started: 1150,
    },
  },
];

function createDefaultPlayer(): AccoladeValues {
  return Object.fromEntries(ACCOLADE_FIELDS.map((field) => [field.key, field.countDefault])) as AccoladeValues;
}

function createDefaultWeights(): AccoladeValues {
  return { ...ACCOLADE_WEIGHTS };
}

function legacyEngineFallbackParams(): EngineParams {
  return { ...FALLBACK_ENGINE_PARAMS };
}

function mergeAccoladeWeights(accoladeWeights: LegacyEngineConfigPayload["accoladeWeights"]) {
  const nextWeights = createDefaultWeights();

  for (const field of ACCOLADE_FIELDS) {
    const value = Number(accoladeWeights?.[field.key]);

    if (Number.isFinite(value)) {
      nextWeights[field.key] = value;
    }
  }

  return nextWeights;
}

function mergeEngineFactors(legacyEngineFactors: LegacyEngineConfigPayload["legacyEngineFactors"]) {
  const nextFactors = legacyEngineFallbackParams();

  for (const field of ENGINE_FIELDS) {
    const value = Number(legacyEngineFactors?.[field.key]);

    if (Number.isFinite(value)) {
      nextFactors[field.key] = value;
    }
  }

  return nextFactors;
}

function playerAccoladesToInput(historyPlayer: HistoryPlayer): AccoladeValues {
  return Object.fromEntries(
    ACCOLADE_FIELDS.map((field) => {
      const rawValue = numberValue(historyPlayer.accolades?.[field.key]);

      return [field.key, Math.round(clamp(rawValue, 0, field.maxCount))];
    }),
  ) as AccoladeValues;
}

function numberValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calculateLegacyScore(
  accolades: Partial<AccoladeValues>,
  weights: AccoladeValues,
  params: EngineParams,
): LegacyScore {
  const basePoints = ACCOLADE_FIELDS.reduce(
    (sum, field) => sum + numberValue(accolades[field.key]) * numberValue(weights[field.key]),
    0,
  );
  const seasonsPlayed = numberValue(accolades.seasons_played);
  const seasons = Math.max(seasonsPlayed, 1);
  const descent = params.descentNumerator / Math.pow(seasons, params.descentExponent);
  const ascent = params.ascentMultiplier * seasons;
  const uShapeModifier = descent + ascent;
  const densityBonus = basePoints * uShapeModifier * params.densityBonusMultiplier;
  const totalLegacyScore = basePoints + densityBonus;

  return {
    basePoints,
    seasons,
    descent,
    ascent,
    uShapeModifier,
    densityBonus,
    totalLegacyScore,
  };
}

function curveModifier(seasons: number, params: EngineParams) {
  const descent = params.descentNumerator / Math.pow(seasons, params.descentExponent);
  const ascent = params.ascentMultiplier * seasons;

  return descent + ascent;
}

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

function weightStep(field: AccoladeField) {
  return field.weightStep ?? (field.key === "games_started" ? 0.001 : 0.05);
}

function weightsObjectString(weights: AccoladeValues) {
  const lines = Object.entries(weights).map(([key, value]) => {
    const objectKey = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);

    return `  ${objectKey}: ${trimNumber(value)},`;
  });

  return `const ACCOLADE_WEIGHTS = {\n${lines.join("\n")}\n};`;
}

function SliderNumberControl({
  label,
  value,
  min,
  max,
  step,
  digits,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  digits: number;
  onChange: (value: number) => void;
}) {
  const normalizedValue = clamp(value, min, max);

  function commit(rawValue: string) {
    const nextValue = clamp(numberValue(Number(rawValue)), min, max);
    const roundedValue = step >= 1 ? Math.round(nextValue) : nextValue;
    onChange(roundedValue);
  }

  return (
    <label className="legacy-control">
      <span className="legacy-control-label">
        <span>{label}</span>
        <strong>{formatNumber(normalizedValue, digits)}</strong>
      </span>
      <span className="legacy-control-inputs">
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
    <div className="legacy-metric">
      <span>{label}</span>
      <strong className={variant ? `legacy-metric-${variant}` : undefined}>{value}</strong>
    </div>
  );
}

export default function LegacyEnginePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [defaultWeights, setDefaultWeights] = useState<AccoladeValues>(createDefaultWeights);
  const [engineDefaults, setEngineDefaults] = useState<EngineParams>(legacyEngineFallbackParams);
  const [weights, setWeights] = useState<AccoladeValues>(createDefaultWeights);
  const [player, setPlayer] = useState<AccoladeValues>(createDefaultPlayer);
  const [engine, setEngine] = useState<EngineParams>(legacyEngineFallbackParams);
  const [historyPlayers, setHistoryPlayers] = useState<HistoryPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState(TEST_PLAYER_NAME);
  const [playerSearchFocused, setPlayerSearchFocused] = useState(false);
  const [selectedHistoryPlayer, setSelectedHistoryPlayer] = useState<HistoryPlayer | null>(null);
  const [copied, setCopied] = useState(false);

  const score = useMemo(() => calculateLegacyScore(player, weights, engine), [engine, player, weights]);
  const curveLow = useMemo(() => {
    let lowSeason = 1;
    let lowModifier = curveModifier(1, engine);

    for (let season = 1; season <= 35; season += 0.25) {
      const modifier = curveModifier(season, engine);

      if (modifier < lowModifier) {
        lowSeason = season;
        lowModifier = modifier;
      }
    }

    return { season: lowSeason, modifier: lowModifier };
  }, [engine]);
  const rankings = useMemo(
    () =>
      [
        { name: selectedHistoryPlayer?.name ?? TEST_PLAYER_NAME, score },
        ...PRESET_PROFILES.map((profile) => ({
          name: profile.name,
          score: calculateLegacyScore(profile.accolades, weights, engine),
        })),
      ].sort((a, b) => b.score.totalLegacyScore - a.score.totalLegacyScore),
    [engine, score, selectedHistoryPlayer, weights],
  );
  const weightsCode = useMemo(() => weightsObjectString(weights), [weights]);
  const filteredHistoryPlayers = useMemo(() => {
    const normalizedQuery =
      normalizeSearchValue(playerSearch) === normalizeSearchValue(TEST_PLAYER_NAME)
        ? ""
        : normalizeSearchValue(playerSearch);
    const candidates = normalizedQuery
      ? historyPlayers.filter((historyPlayer) =>
          normalizeSearchValue(historyPlayer.name).includes(normalizedQuery),
        )
      : historyPlayers;

    return candidates.slice(0, 10);
  }, [historyPlayers, playerSearch]);
  const showPlayerOptions = playerSearchFocused && !playersError;

  useEffect(() => {
    let active = true;

    async function loadLegacyEngineConfig() {
      try {
        const config = await loadApiJson<LegacyEngineConfigPayload>("/api/legacy-engine-config");
        const nextWeights = mergeAccoladeWeights(config.accoladeWeights);
        const nextEngineDefaults = mergeEngineFactors(config.legacyEngineFactors);

        if (!active) {
          return;
        }

        setDefaultWeights(nextWeights);
        setWeights(nextWeights);
        setEngineDefaults(nextEngineDefaults);
        setEngine(nextEngineDefaults);
      } catch {
        // Keep local fallback values if the API is unavailable.
      }
    }

    loadLegacyEngineConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHistoryPlayers() {
      try {
        const cachedPlayers = getCachedPlayers<HistoryPlayer>();

        setPlayersLoading(!cachedPlayers);
        setPlayersError(null);

        const players = cachedPlayers ?? (await loadPlayers<HistoryPlayer>());
        const sortedPlayers = sortHistoryPlayers(players);

        if (!active) {
          return;
        }

        setHistoryPlayers(sortedPlayers);
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

    loadHistoryPlayers();

    return () => {
      active = false;
    };
  }, []);

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!canvas || !parent) {
      return;
    }

    const rect = parent.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { left: 54, right: 22, top: 24, bottom: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const data = Array.from({ length: 137 }, (_, index) => {
      const season = 1 + index * 0.25;

      return { season, modifier: curveModifier(season, engine) };
    });
    const maxModifier = Math.max(...data.map((point) => point.modifier), score.uShapeModifier, 0.01);
    const yMax = maxModifier * 1.08;
    const xForSeason = (season: number) => padding.left + ((season - 1) / 34) * plotWidth;
    const yForModifier = (modifier: number) =>
      padding.top + (1 - modifier / (yMax || 1)) * plotHeight;

    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.08)";
    context.fillStyle = "rgba(244, 242, 236, 0.68)";
    context.font = "700 11px Arial, Helvetica, sans-serif";
    context.lineWidth = 1;

    for (let index = 0; index <= 4; index += 1) {
      const y = padding.top + (plotHeight / 4) * index;
      const value = yMax - (yMax / 4) * index;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.fillText(formatNumber(value, 2), padding.left - 10, y);
    }

    [1, 5, 10, 15, 20, 25, 30, 35].forEach((season) => {
      const x = xForSeason(season);
      context.beginPath();
      context.moveTo(x, padding.top);
      context.lineTo(x, height - padding.bottom);
      context.stroke();
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(String(season), x, height - padding.bottom + 12);
    });
    context.restore();

    context.save();
    context.beginPath();
    data.forEach((point, index) => {
      const x = xForSeason(point.season);
      const y = yForModifier(point.modifier);

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.lineTo(xForSeason(35), yForModifier(0));
    context.lineTo(xForSeason(1), yForModifier(0));
    context.closePath();

    const areaFill = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaFill.addColorStop(0, "rgba(49, 214, 161, 0.22)");
    areaFill.addColorStop(1, "rgba(49, 214, 161, 0.02)");
    context.fillStyle = areaFill;
    context.fill();
    context.restore();

    context.save();
    context.beginPath();
    data.forEach((point, index) => {
      const x = xForSeason(point.season);
      const y = yForModifier(point.modifier);

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    const stroke = context.createLinearGradient(padding.left, 0, width - padding.right, 0);
    stroke.addColorStop(0, "#31d6a1");
    stroke.addColorStop(0.58, "#7ac7ff");
    stroke.addColorStop(1, "#ff8a2a");
    context.strokeStyle = stroke;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.stroke();
    context.restore();

    const markerSeason = clamp(score.seasons, 1, 35);
    const markerModifier = curveModifier(markerSeason, engine);
    const markerX = xForSeason(markerSeason);
    const markerY = yForModifier(markerModifier);

    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.28)";
    context.setLineDash([5, 7]);
    context.beginPath();
    context.moveTo(markerX, padding.top);
    context.lineTo(markerX, height - padding.bottom);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#ff8a2a";
    context.strokeStyle = "#151923";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(markerX, markerY, 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#f4f2ec";
    context.font = "800 12px Arial, Helvetica, sans-serif";
    context.textAlign = markerX > width - 148 ? "right" : "left";
    context.textBaseline = "middle";
    context.fillText(
      `${formatNumber(markerModifier, 4)} modifier`,
      markerX > width - 148 ? markerX - 14 : markerX + 14,
      clamp(markerY - 16, padding.top + 12, height - padding.bottom - 12),
    );
    context.restore();
  }, [engine, score.seasons, score.uShapeModifier]);

  useEffect(() => {
    drawCurve();

    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!parent) {
      return;
    }

    const resizeObserver = new ResizeObserver(drawCurve);
    resizeObserver.observe(parent);

    return () => resizeObserver.disconnect();
  }, [drawCurve]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyWeights() {
    try {
      await navigator.clipboard.writeText(weightsCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function updateWeight(key: AccoladeKey, value: number) {
    setWeights((currentWeights) => ({ ...currentWeights, [key]: value }));
  }

  function updatePlayer(key: AccoladeKey, value: number) {
    setPlayer((currentPlayer) => ({ ...currentPlayer, [key]: Math.round(value) }));
  }

  function updateEngine(key: keyof EngineParams, value: number) {
    setEngine((currentEngine) => ({ ...currentEngine, [key]: value }));
  }

  function selectHistoryPlayer(historyPlayer: HistoryPlayer) {
    setSelectedHistoryPlayer(historyPlayer);
    setPlayerSearch(historyPlayer.name);
    setPlayer(playerAccoladesToInput(historyPlayer));
    setPlayerSearchFocused(false);
  }

  function resetPlayer() {
    setSelectedHistoryPlayer(null);
    setPlayerSearch(TEST_PLAYER_NAME);
    setPlayerSearchFocused(false);
    setPlayer(createDefaultPlayer());
  }

  return (
    <main className="legacy-engine-page">
      <aside className="legacy-sidebar" aria-label="Weight configurator">
        <div className="legacy-sidebar-header">
          <Link className="legacy-back-link" href="/">
            82-0
          </Link>
          <p className="legacy-eyebrow">Legacy Engine</p>
          <h1>Simulator</h1>
        </div>

        <div className="legacy-sidebar-actions">
          <button type="button" onClick={() => setWeights(defaultWeights)}>
            Reset Weights
          </button>
          <button type="button" onClick={copyWeights}>
            {copied ? "Copied" : "Copy Object"}
          </button>
        </div>

        <div className="legacy-weight-list">
          {ACCOLADE_FIELDS.map((field) => (
            <SliderNumberControl
              digits={field.key === "games_started" ? 3 : 2}
              key={field.key}
              label={field.label}
              max={field.weightMax}
              min={0}
              onChange={(value) => updateWeight(field.key, value)}
              step={weightStep(field)}
              value={weights[field.key]}
            />
          ))}
        </div>
      </aside>

      <section className="legacy-workbench">
        <header className="legacy-topbar">
          <div className="legacy-topbar-heading">
            <div>
              <p className="legacy-eyebrow">Pro-Peak U-Shape</p>
              <h2>Engine Parameters</h2>
            </div>
            <button type="button" onClick={() => setEngine(engineDefaults)}>
              Reset U-Shape
            </button>
          </div>
          <div className="legacy-engine-grid">
            {ENGINE_FIELDS.map((field) => (
              <SliderNumberControl
                digits={field.digits}
                key={field.key}
                label={field.label}
                max={field.max}
                min={field.min}
                onChange={(value) => updateEngine(field.key, value)}
                step={field.step}
                value={engine[field.key]}
              />
            ))}
          </div>
        </header>

        <div className="legacy-dashboard">
          <section className="legacy-panel legacy-player-panel" aria-label="Test player input">
            <div className="legacy-panel-heading legacy-player-heading">
              <div className="legacy-player-title-field">
                <input
                  aria-autocomplete="list"
                  aria-controls="legacy-player-options"
                  aria-expanded={showPlayerOptions}
                  aria-haspopup="listbox"
                  aria-label="Search and select test player"
                  className="legacy-player-name-input"
                  onBlur={() => window.setTimeout(() => setPlayerSearchFocused(false), 120)}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    setPlayerSearch(nextValue);
                    setPlayerSearchFocused(true);

                    if (selectedHistoryPlayer && nextValue !== selectedHistoryPlayer.name) {
                      setSelectedHistoryPlayer(null);
                    }
                  }}
                  onFocus={(event) => {
                    setPlayerSearchFocused(true);

                    if (!selectedHistoryPlayer && playerSearch === TEST_PLAYER_NAME) {
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
                  <p className="legacy-player-picker-message">Player API unavailable: {playersError}</p>
                ) : null}

                {showPlayerOptions ? (
                  <div className="legacy-player-options" id="legacy-player-options" role="listbox">
                    <button
                      aria-selected={!selectedHistoryPlayer}
                      className="legacy-player-option legacy-player-option-primary"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={resetPlayer}
                      role="option"
                      type="button"
                    >
                      <span>{TEST_PLAYER_NAME}</span>
                      <small>Custom profile</small>
                    </button>
                    {playersLoading ? (
                      <p className="legacy-player-picker-message">Loading players...</p>
                    ) : filteredHistoryPlayers.length ? (
                      filteredHistoryPlayers.map((historyPlayer) => (
                        <button
                          aria-selected={selectedHistoryPlayer?.name === historyPlayer.name}
                          className="legacy-player-option"
                          key={`${historyPlayer.id ?? historyPlayer.name}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectHistoryPlayer(historyPlayer)}
                          role="option"
                          type="button"
                        >
                          <span>{historyPlayer.name}</span>
                          <small>
                            {formatNumber(numberValue(historyPlayer.accolades?.seasons_played), 0)} yrs
                            {Number.isFinite(Number(historyPlayer.legacy_points))
                              ? ` | ${formatNumber(numberValue(historyPlayer.legacy_points), 2)} LP`
                              : ""}
                          </small>
                        </button>
                      ))
                    ) : (
                      <p className="legacy-player-picker-message">No players found.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={resetPlayer}>
                Reset Player
              </button>
            </div>
            <div className="legacy-player-inputs">
              {ACCOLADE_FIELDS.map((field) => (
                <SliderNumberControl
                  digits={0}
                  key={field.key}
                  label={field.label}
                  max={field.maxCount}
                  min={0}
                  onChange={(value) => updatePlayer(field.key, value)}
                  step={1}
                  value={player[field.key]}
                />
              ))}
            </div>
          </section>

          <section className="legacy-output-stack">
            <div className="legacy-metrics" aria-live="polite">
              <MetricCard label="Base Points" value={formatNumber(score.basePoints, 2)} />
              <MetricCard label="U-Shape Modifier" value={formatNumber(score.uShapeModifier, 4)} />
              <MetricCard label="Density Bonus" value={formatNumber(score.densityBonus, 2)} variant="warm" />
              <MetricCard label="Total Legacy Score" value={formatNumber(score.totalLegacyScore, 2)} variant="accent" />
            </div>

            <section className="legacy-panel legacy-graph-panel" aria-label="U-shape curve">
              <div className="legacy-panel-heading">
                <h2>U-Shape Curve</h2>
                <span className="legacy-graph-meta">Season marker: {formatNumber(score.seasons, 0)}</span>
              </div>
              <div className="legacy-canvas-frame">
                <canvas ref={canvasRef} aria-label="U-shape modifier curve" />
              </div>
              <div className="legacy-mini-stats">
                <span>
                  Descent <strong>{formatNumber(score.descent, 4)}</strong>
                </span>
                <span>
                  Ascent <strong>{formatNumber(score.ascent, 4)}</strong>
                </span>
                <span>
                  Curve Low{" "}
                  <strong>
                    {formatNumber(curveLow.modifier, 4)} at {formatNumber(curveLow.season, 1)} yrs
                  </strong>
                </span>
              </div>
            </section>

            <div className="legacy-lower-grid">
              <section className="legacy-panel legacy-ranking-panel" aria-label="Ranking sandbox">
                <div className="legacy-panel-heading">
                  <h2>Ranking Sandbox</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Profile</th>
                      <th>Seasons</th>
                      <th>Base</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((row, index) => (
                      <tr key={row.name}>
                        <td>
                          <span className="legacy-rank-pill">{index + 1}</span>
                        </td>
                        <td>{row.name}</td>
                        <td>{formatNumber(row.score.seasons, 0)}</td>
                        <td>{formatNumber(row.score.basePoints, 2)}</td>
                        <td>{formatNumber(row.score.totalLegacyScore, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="legacy-panel legacy-code-panel" aria-label="Current weights object">
                <div className="legacy-panel-heading">
                  <h2>ACCOLADE_WEIGHTS</h2>
                  <button type="button" onClick={copyWeights}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre>{weightsCode}</pre>
              </section>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
