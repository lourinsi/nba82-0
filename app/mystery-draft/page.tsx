"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  StopCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { RESULT_BADGE_META_BY_ID } from "../achievementMeta";
import { loadApiJson, loadPlayers } from "../apiClient";
import { teamThemeStyle } from "../all-time/teamStyles";
import {
  adjustedStatsSnapshot,
  colorModeSnapshot,
  setGameHeaderState,
  subscribeToAdjustedStats,
  subscribeToColorMode,
  subscribeToGameHeaderAction,
} from "../clientPreferences";
import type { Achievement, Player, StatsEngineConfig } from "../GameCourt";
import { UNKNOWN_PLAYER_IMAGE, handlePlayerImageError } from "../playerImages";
import {
  DEFAULT_MYSTERY_DRAFT_SETTINGS,
  createMysteryDraftGame,
  generateSpinCandidates,
  minimumLegalOfferForCurrentCard,
  maxLegalOffer,
  mysteryDraftFinalScore,
  passMysteryDraftCard,
  publicMysteryDraftCard,
  rosterSlotsRemaining,
  selectVisibleMysteryStint,
  submitMysteryDraftOffer,
  tsStarPercentValue,
  validateMysteryDraftOffer,
  weightedWs48Value,
  type MysteryDraftAverageStats,
  type MysteryDraftGameState,
  type MysteryDraftOfferResult,
  type MysteryDraftRawSeasonStats,
  type MysteryDraftRosterCard,
  type MysteryDraftSettings,
  type MysteryDraftSpinCandidate,
  type MysteryDraftStatRanges,
  type MysteryNumberRange,
} from "./mysteryDraftGame";

const MYSTERY_SPIN_TICK_MS = 86;
const MYSTERY_SPIN_MAX_MS = 5000;

const FALLBACK_STATS_ENGINE_CONFIG: StatsEngineConfig = {
  allTimeTsBaseline: 0.54,
  leagueAverages: {},
  tsBlendWeights: {
    absolute: 0.5,
    era: 0.5,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value}` : "--";
}

function formatMarketRange(min: number | null | undefined, max: number | null | undefined) {
  return `${formatMoney(min)}-${formatMoney(max)}`;
}

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function formatFixed(value: number, digits: number) {
  return value.toFixed(digits).replace(/\.0+$/, "");
}

function formatRange(range: MysteryNumberRange | null, digits = 1, suffix = "") {
  if (!range) {
    return "--";
  }

  const min = formatFixed(range.min, digits);
  const max = formatFixed(range.max, digits);

  return `${min}${min === max ? "" : `-${max}`}${suffix}`;
}

function formatAverage(value: number | null, digits = 1, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${formatFixed(value, digits)}${suffix}` : "--";
}

function formatPraValues(points: number | null, rebounds: number | null, assists: number | null) {
  return [
    formatAverage(points, 0),
    formatAverage(rebounds, 0),
    formatAverage(assists, 0),
  ].join(" / ");
}

function formatPraRange(ranges: MysteryDraftStatRanges | null | undefined) {
  if (!ranges) {
    return "--";
  }

  return [
    formatRange(ranges.per100PTS, 0),
    formatRange(ranges.per100REB, 0),
    formatRange(ranges.per100AST, 0),
  ].join(" / ");
}

function formatPraAverage(averages: MysteryDraftAverageStats | null | undefined) {
  if (!averages) {
    return "--";
  }

  return formatPraValues(averages.per100PTS, averages.per100REB, averages.per100AST);
}

function displayStatsForCard(
  card: NonNullable<ReturnType<typeof publicMysteryDraftCard>>,
  showAdjustedStats: boolean,
) {
  return {
    averageStats: showAdjustedStats ? card.averageStats : card.rawAverageStats,
    modeLabel: showAdjustedStats ? "Per 100" : "Raw",
    statRanges: showAdjustedStats ? card.statRanges : card.rawStatRanges,
    tsLabel: showAdjustedStats ? "TS*" : "TS%",
    wsLabel: "WS/48",
  };
}

function formatRawSeasonPra(rawStats: MysteryDraftRawSeasonStats) {
  return formatPraValues(rawStats.ppg, rawStats.rpg, rawStats.apg);
}

function runHasStarted(game: MysteryDraftGameState) {
  return game.spinsUsed > 0 || game.roster.length > 0 || Boolean(game.currentCard);
}

function buildSeasonMetricAchievements(card: MysteryDraftRosterCard, showAdjustedStats: boolean): Achievement[] {
  const tsDisplayValue = showAdjustedStats ? tsStarPercentValue(card.statScore) : card.rawStats.tsPct;
  const ws48DisplayValue = showAdjustedStats ? weightedWs48Value(card.statScore) : card.rawStats.ws48;

  return [
    {
      id: "pra",
      label: "P/R/A",
      title: showAdjustedStats
        ? "Per-100 points, rebounds, assists"
        : "Raw points, rebounds, assists per game",
      value: showAdjustedStats
        ? formatPraValues(card.statScore.per100PTS, card.statScore.per100REB, card.statScore.per100AST)
        : formatRawSeasonPra(card.rawStats),
    },
    {
      id: showAdjustedStats ? "ts-star" : "ts-pct",
      label: showAdjustedStats ? "TS*" : "TS%",
      title: showAdjustedStats ? "True shooting with era context" : "True shooting percentage",
      value: tsDisplayValue === null ? "--" : `${Math.round(tsDisplayValue)}%`,
    },
    {
      id: "ws-48",
      label: "WS/48",
      title: showAdjustedStats ? "Weighted win-share rate per 48 minutes" : "Win shares per 48 minutes",
      value: ws48DisplayValue === null ? "--" : ws48DisplayValue.toFixed(3),
    },
    {
      id: "mpg",
      label: "MPG",
      title: "Minutes per game",
      value: formatAverage(showAdjustedStats ? card.statScore.mpg : card.rawStats.mpg, 1),
    },
  ];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="mystery-stat-tile">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const meta = RESULT_BADGE_META_BY_ID[achievement.id];

  if (meta) {
    return (
      <span
        className={`court-achievement-badge court-achievement-badge-${meta.variant}`}
        title={achievement.title || meta.description}
      >
        <span className="court-achievement-badge-symbol">{meta.symbol}</span>
        <span className="court-achievement-badge-count">{achievement.value}</span>
      </span>
    );
  }

  return (
    <span className={`achievement-stat achievement-stat-${achievement.id}`} title={achievement.title}>
      <span className="achievement-value">{achievement.value}</span>
      <span className="achievement-label">{achievement.label}</span>
    </span>
  );
}

function achievementChipLabel(achievement: Achievement) {
  return achievement.label || RESULT_BADGE_META_BY_ID[achievement.id]?.description || achievement.id;
}

function PossibleBadgeChips({
  achievements,
  limit = achievements.length,
}: {
  achievements: Achievement[];
  limit?: number;
}) {
  if (!achievements.length) {
    return null;
  }

  const visibleAchievements = achievements.slice(0, limit);
  const hiddenCount = Math.max(0, achievements.length - visibleAchievements.length);

  return (
    <div className="mystery-possible-badges" aria-label="Possible badges for this stint">
      <span>Possible</span>
      {visibleAchievements.map((achievement) => (
        <b key={achievement.id}>{achievementChipLabel(achievement)}</b>
      ))}
      {hiddenCount > 0 ? <b>+{hiddenCount}</b> : null}
    </div>
  );
}

function PlayerPortrait({
  imageUrl,
  playerName,
  variant = "card",
}: {
  imageUrl: string | null;
  playerName: string;
  variant?: "card" | "spin" | "result";
}) {
  const initials = playerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`mystery-player-portrait mystery-player-portrait-${variant}`} aria-hidden="true">
      <img
        alt=""
        loading="lazy"
        src={imageUrl || UNKNOWN_PLAYER_IMAGE}
        onError={handlePlayerImageError}
      />
      <span>{initials || "?"}</span>
    </div>
  );
}

function AchievementStrip({
  achievements,
  emptyLabel = "No exact season badges",
}: {
  achievements: Achievement[];
  emptyLabel?: string;
}) {
  if (!achievements.length) {
    return <p className="mystery-empty-copy">{emptyLabel}</p>;
  }

  return (
    <div className="achievement-strip mystery-achievement-strip">
      {achievements.map((achievement, index) => (
        <AchievementBadge achievement={achievement} key={`${achievement.id}-${achievement.value}-${index}`} />
      ))}
    </div>
  );
}

function revealCardTitle(result: MysteryDraftOfferResult) {
  return result.revealedCard
    ? `${result.revealedCard.team} ${result.revealedCard.cardSeasonLabel} ${result.revealedCard.playerName}`
    : "Card Skipped";
}

function revealOutcomeText(result: MysteryDraftOfferResult) {
  if (result.resultType === "ACCEPTED") {
    return "Accepted - Added to roster";
  }

  if (result.resultType === "REJECTED") {
    return "Rejected - Card lost";
  }

  return "Passed - Card lost";
}

function revealDeltaText(result: MysteryDraftOfferResult) {
  if (result.minimumNeeded === null || result.userOffer === null) {
    return null;
  }

  const delta = result.userOffer - result.minimumNeeded;

  if (result.resultType === "ACCEPTED") {
    return delta > 0 ? `Overpaid by ${formatMoney(delta)}` : "Matched true price";
  }

  if (result.resultType === "REJECTED") {
    return `Short by ${formatMoney(Math.abs(delta))}`;
  }

  return null;
}

function resultToneLabel(result: MysteryDraftOfferResult) {
  if (result.resultType === "ACCEPTED") {
    return "Accepted";
  }

  if (result.resultType === "REJECTED") {
    return "Rejected";
  }

  return "Passed";
}

function resultSubcopy(result: MysteryDraftOfferResult) {
  if (result.resultType === "ACCEPTED") {
    return "Added to roster";
  }

  if (result.resultType === "REJECTED") {
    return "Card lost";
  }

  return result.revealedCard ? "Card revealed and skipped" : "Card skipped";
}

function ResultStatusIcon({ resultType }: { resultType: MysteryDraftOfferResult["resultType"] }) {
  if (resultType === "ACCEPTED") {
    return <CheckCircle2 />;
  }

  if (resultType === "REJECTED") {
    return <XCircle />;
  }

  return <SkipForward />;
}

function MysteryResultCard({
  canSpin,
  finalScore,
  isLoading,
  onNewRun,
  onSpinNext,
  result,
  runComplete,
  showAdjustedStats,
}: {
  canSpin: boolean;
  finalScore: number;
  isLoading: boolean;
  onNewRun: () => void;
  onSpinNext: () => void;
  result: MysteryDraftOfferResult;
  runComplete: boolean;
  showAdjustedStats: boolean;
}) {
  const revealedCard = result.revealedCard;
  const deltaText = revealDeltaText(result);
  const articleStyle = revealedCard ? teamThemeStyle(revealedCard.team) : undefined;

  return (
    <article
      className={`mystery-current-card mystery-result-card mystery-result-card-${result.resultType.toLowerCase()}`}
      style={articleStyle}
    >
      <div className="mystery-card-topline">
        <span>Reveal Result</span>
        <span>{resultToneLabel(result)}</span>
      </div>

      <div className="mystery-card-hero mystery-result-hero">
        <div className="mystery-card-copy mystery-result-copy">
          <div className="mystery-result-heading-row">
            <span className="mystery-result-chip">
              <ResultStatusIcon resultType={result.resultType} />
              {resultToneLabel(result)}
            </span>
            <span className="mystery-result-subcopy">{resultSubcopy(result)}</span>
          </div>

          <span className="mystery-card-team">
            {revealedCard ? `${revealedCard.team} ${revealedCard.cardSeasonLabel}` : "Mystery Draft"}
          </span>
          <h2>{revealedCard ? revealedCard.playerName : "Card Skipped"}</h2>
          {revealedCard ? <p className="mystery-result-season">{revealedCard.seasonLabel}</p> : null}

          {result.minimumNeeded !== null ? (
            <div className="mystery-hidden-price-panel" aria-label="Hidden price">
              <span>Hidden Price</span>
              <strong>{formatMoney(result.minimumNeeded)}</strong>
            </div>
          ) : null}
        </div>

        {revealedCard ? (
          <PlayerPortrait
            imageUrl={revealedCard.playerImageUrl}
            playerName={revealedCard.playerName}
            variant="result"
          />
        ) : (
          <div className="mystery-result-empty-mark" aria-hidden="true">
            <SkipForward />
          </div>
        )}
      </div>

      <div className="mystery-result-stamp" aria-hidden="true">
        <ResultStatusIcon resultType={result.resultType} />
        <span>{resultToneLabel(result)}</span>
      </div>

      <div className="mystery-result-summary">
        <span>{result.userOffer === null ? "No offer submitted" : `You offered ${formatMoney(result.userOffer)}`}</span>
        {deltaText ? <strong>{deltaText}</strong> : null}
        {revealedCard ? <span>Score {formatScore(revealedCard.score)}</span> : null}
      </div>

      {revealedCard ? (
        <div className="mystery-result-details">
          <div className="mystery-result-detail-block">
            <span className="mystery-kicker">Exact Season Stats</span>
            <AchievementStrip achievements={buildSeasonMetricAchievements(revealedCard, showAdjustedStats)} />
          </div>
          <div className="mystery-result-detail-block">
            <span className="mystery-kicker">Exact Season Badges</span>
            <AchievementStrip
              achievements={revealedCard.seasonAchievements}
              emptyLabel="No exact season badges"
            />
          </div>
        </div>
      ) : null}

      <div className="mystery-result-actions">
        {runComplete ? (
          <>
            <div className="mystery-result-final-score">
              <span>Final Score</span>
              <strong>{formatScore(finalScore)}</strong>
            </div>
            <button className="mystery-primary-button" type="button" onClick={onNewRun}>
              <RotateCcw size={18} />
              New Run
            </button>
          </>
        ) : (
          <button className="mystery-primary-button" disabled={!canSpin} type="button" onClick={onSpinNext}>
            <RefreshCw size={18} />
            {isLoading ? "Loading..." : "Spin Next"}
          </button>
        )}
      </div>
    </article>
  );
}

function RosterCard({
  card,
  rank,
  showAdjustedStats,
}: {
  card: MysteryDraftRosterCard;
  rank: number;
  showAdjustedStats: boolean;
}) {
  return (
    <article className="mystery-roster-card" style={teamThemeStyle(card.team)}>
      <div className="mystery-roster-rank">{rank}</div>
      <div className="mystery-roster-main">
        <div>
          <span className="mystery-kicker">
            {card.team} {card.cardSeasonLabel}
          </span>
          <h3>{card.playerName}</h3>
          <p>
            {card.eraLabel} - {card.seasonLabel}
          </p>
        </div>
        <div className="mystery-roster-price">
          <span>{formatMoney(card.paidPrice)}</span>
          <small>Paid</small>
        </div>
      </div>
      <div className="mystery-roster-meta">
        <span>Score {formatScore(card.score)}</span>
        <span>Reserve {formatMoney(card.reservePrice)}</span>
      </div>
      <AchievementStrip
        achievements={[...buildSeasonMetricAchievements(card, showAdjustedStats), ...card.seasonAchievements]}
      />
    </article>
  );
}

export default function MysteryDraftPage() {
  const lightMode = useSyncExternalStore(subscribeToColorMode, colorModeSnapshot, () => false);
  const adjustedStatsEnabled = useSyncExternalStore(subscribeToAdjustedStats, adjustedStatsSnapshot, () => false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [statsEngineConfig, setStatsEngineConfig] =
    useState<StatsEngineConfig>(FALLBACK_STATS_ENGINE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<MysteryDraftSettings>({
    ...DEFAULT_MYSTERY_DRAFT_SETTINGS,
  });
  const [game, setGame] = useState(() => createMysteryDraftGame(settingsDraft));
  const [offerText, setOfferText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rosterPanelOpen, setRosterPanelOpen] = useState(true);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(true);
  const [spinCandidates, setSpinCandidates] = useState<MysteryDraftSpinCandidate[]>([]);
  const [spinIndex, setSpinIndex] = useState(0);
  const spinCandidatesRef = useRef<MysteryDraftSpinCandidate[]>([]);
  const spinIndexRef = useRef(0);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicCard = useMemo(() => publicMysteryDraftCard(game.currentCard), [game.currentCard]);
  const displayedCardStats = publicCard ? displayStatsForCard(publicCard, adjustedStatsEnabled) : null;
  const activeSpinCandidate = spinCandidates[spinIndex] ?? null;
  const legalMaxOffer = maxLegalOffer(game);
  const currentMinimumOffer = minimumLegalOfferForCurrentCard(game);
  const slotsRemaining = rosterSlotsRemaining(game);
  const hasOfferText = offerText.trim().length > 0;
  const offerValue = hasOfferText ? Number(offerText) : Number.NaN;
  const offerValidation = game.currentCard
    ? validateMysteryDraftOffer(game, offerValue)
    : { message: null, valid: false };
  const finalScore = mysteryDraftFinalScore(game);
  const started = runHasStarted(game);
  const lastRevealDelta = game.lastResult ? revealDeltaText(game.lastResult) : null;
  const canSpin =
    !loading &&
    !error &&
    !isSpinning &&
    game.status === "ACTIVE" &&
    !game.currentCard &&
    game.spinsUsed < game.maxSpins &&
    game.roster.length < game.rosterSize;

  const clearSpinTimers = useCallback(() => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  }, []);

  const stopMysterySpin = useCallback(() => {
    const candidates = spinCandidatesRef.current;
    const candidate = candidates.length ? candidates[spinIndexRef.current % candidates.length] : null;

    clearSpinTimers();
    setIsSpinning(false);
    setSpinCandidates([]);
    setSpinIndex(0);
    spinCandidatesRef.current = [];
    spinIndexRef.current = 0;

    if (candidate) {
      setDetailsOpen(false);
      setOfferText("");
      setGame((current) => selectVisibleMysteryStint(current, candidate));
    }
  }, [clearSpinTimers]);

  const resetRun = useCallback(() => {
    clearSpinTimers();
    setDetailsOpen(false);
    setGame(createMysteryDraftGame(settingsDraft));
    setIsSpinning(false);
    setOfferText("");
    setSettingsPanelOpen(true);
    setSpinCandidates([]);
    setSpinIndex(0);
    spinCandidatesRef.current = [];
    spinIndexRef.current = 0;
  }, [clearSpinTimers, settingsDraft]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const loadedPlayers = await loadPlayers<Player>();

        if (active) {
          setPlayers(loadedPlayers);
          setError(null);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch players");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStatsEngineConfig() {
      try {
        const config = await loadApiJson<Partial<StatsEngineConfig>>("/api/stats-engine-config");
        const tsBlendWeights = config.tsBlendWeights ?? FALLBACK_STATS_ENGINE_CONFIG.tsBlendWeights;

        if (!active) {
          return;
        }

        setStatsEngineConfig({
          allTimeTsBaseline: Number(config.allTimeTsBaseline ?? FALLBACK_STATS_ENGINE_CONFIG.allTimeTsBaseline),
          leagueAverages:
            config.leagueAverages && typeof config.leagueAverages === "object" ? config.leagueAverages : {},
          tsBlendWeights: {
            absolute: Number(tsBlendWeights.absolute ?? FALLBACK_STATS_ENGINE_CONFIG.tsBlendWeights.absolute),
            era: Number(tsBlendWeights.era ?? FALLBACK_STATS_ENGINE_CONFIG.tsBlendWeights.era),
          },
        });
      } catch {
        if (active) {
          setStatsEngineConfig(FALLBACK_STATS_ENGINE_CONFIG);
        }
      }
    }

    void loadStatsEngineConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setGameHeaderState({
      eyebrow: game.status === "COMPLETE" ? "Mystery Final" : "Mystery Draft",
      resetDisabled: false,
      resetLabel: "Reset mystery draft",
      showAdjustedStatsToggle: true,
      showReset: true,
      title:
        game.status === "COMPLETE"
          ? `Score ${formatScore(finalScore)}`
          : `${game.roster.length}/${game.rosterSize} players - ${formatMoney(game.salaryRemaining)}`,
    });
  }, [finalScore, game.roster.length, game.rosterSize, game.salaryRemaining, game.status]);

  useEffect(() => () => setGameHeaderState(null), []);

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(
    () =>
      subscribeToGameHeaderAction((action) => {
        if (action === "reset") {
          resetRun();
        }
      }),
    [resetRun],
  );

  function updateSettings(nextSettings: Partial<MysteryDraftSettings>) {
    const merged = { ...settingsDraft, ...nextSettings };

    setSettingsDraft(merged);

    if (!started) {
      setGame(createMysteryDraftGame(merged));
    }
  }

  function updateNumberSetting(key: keyof MysteryDraftSettings, value: string, min: number, max: number) {
    const numeric = clamp(Number(value), min, max);

    if (!Number.isFinite(numeric)) {
      return;
    }

    updateSettings({ [key]: numeric } as Partial<MysteryDraftSettings>);
  }

  function updateTop100Chance(value: string) {
    const top100Chance = clamp(Number(value), 0, 100) / 100;

    updateSettings({
      randomHistoricalChance: Number((1 - top100Chance).toFixed(2)),
      top100Chance: Number(top100Chance.toFixed(2)),
    });
  }

  function handleSpin() {
    if (!canSpin) {
      return;
    }

    setOfferText("");
    setDetailsOpen(false);
    setSettingsPanelOpen(false);

    const result = generateSpinCandidates(game, players, statsEngineConfig, 34);

    setGame(result.state);

    if (!result.candidates.length) {
      return;
    }

    clearSpinTimers();
    spinCandidatesRef.current = result.candidates;
    spinIndexRef.current = 0;
    setSpinCandidates(result.candidates);
    setSpinIndex(0);
    setIsSpinning(true);

    spinIntervalRef.current = setInterval(() => {
      const candidateCount = spinCandidatesRef.current.length;

      if (!candidateCount) {
        return;
      }

      setSpinIndex((current) => {
        const next = (current + 1) % candidateCount;

        spinIndexRef.current = next;
        return next;
      });
    }, MYSTERY_SPIN_TICK_MS);

    spinTimeoutRef.current = setTimeout(() => {
      stopMysterySpin();
    }, MYSTERY_SPIN_MAX_MS);
  }

  function handleOfferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!offerValidation.valid) {
      return;
    }

    setGame((current) => submitMysteryDraftOffer(current, offerValue));
    setDetailsOpen(false);
    setOfferText("");
  }

  function handlePass() {
    setGame((current) => passMysteryDraftCard(current));
    setDetailsOpen(false);
    setOfferText("");
  }

  return (
    <main className={`mystery-page ${lightMode ? "mystery-page-light" : ""}`}>
      <section className="mystery-shell">
        <header className="mystery-header">
          <div>
            <span className="mystery-kicker">Solo Mode</span>
            <h1>Mystery Salary Draft</h1>
          </div>
          <button className="mystery-ghost-button" type="button" onClick={resetRun}>
            <RotateCcw size={18} />
            New Run
          </button>
        </header>

        <section className="mystery-scorebar" aria-label="Run status">
          <StatTile label="Salary" value={formatMoney(game.salaryRemaining)} />
          <StatTile label="Roster" value={`${game.roster.length}/${game.rosterSize}`} />
          <StatTile label="Spins" value={`${game.spinsUsed}/${game.maxSpins}`} />
          <StatTile label="Max Offer" value={formatMoney(legalMaxOffer)} />
        </section>

        {game.warnings.length ? (
          <div className="mystery-warning-strip">
            {game.warnings.map((warning, index) => (
              <span key={`${warning}-${index}`}>{warning}</span>
            ))}
          </div>
        ) : null}

        <div className="mystery-layout">
          <section className="mystery-table">
            {isSpinning && activeSpinCandidate ? (
              <article className="mystery-current-card mystery-spin-card" style={teamThemeStyle(activeSpinCandidate.team)}>
                <div className="mystery-card-topline">
                  <span>{activeSpinCandidate.poolSource === "top100" ? "Top 100 Pool" : "Historical Pool"}</span>
                  <span>Spinning</span>
                </div>

                <div className="mystery-card-hero mystery-spin-hero">
                  <div className="mystery-spin-copy">
                    <span className="mystery-card-team">
                      {activeSpinCandidate.team} {activeSpinCandidate.eraLabel}
                    </span>
                    <h2>{activeSpinCandidate.playerName}</h2>
                    <p>
                      {activeSpinCandidate.possibleSeasonCount} possible season
                      {activeSpinCandidate.possibleSeasonCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <PlayerPortrait
                    imageUrl={activeSpinCandidate.playerImageUrl}
                    playerName={activeSpinCandidate.playerName}
                    variant="spin"
                  />
                </div>

                <div className="mystery-spin-actions">
                  <button className="mystery-primary-button mystery-stop-button" type="button" onClick={stopMysterySpin}>
                    <StopCircle size={18} />
                    Stop
                  </button>
                  <p>Auto-stops after 5 seconds.</p>
                </div>
              </article>
            ) : publicCard ? (
              <article className="mystery-current-card" style={teamThemeStyle(publicCard.team)}>
                <div className="mystery-card-topline">
                  <span>{publicCard.poolSource === "top100" ? "Top 100 Pool" : "Historical Pool"}</span>
                  <span>
                    {publicCard.possibleSeasonLabels.length} possible season
                    {publicCard.possibleSeasonLabels.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mystery-card-hero">
                  <div className="mystery-card-copy">
                    <PossibleBadgeChips achievements={publicCard.possibleAchievements} limit={4} />
                    <span className="mystery-card-team">
                      {publicCard.team} {publicCard.eraLabel}
                    </span>
                    <h2>{publicCard.playerName}</h2>
                    <div className="mystery-market-panel" aria-label="Market range">
                      <span>Market Range</span>
                      <strong>{formatMarketRange(publicCard.marketMin, publicCard.marketMax)}</strong>
                    </div>
                  </div>
                  <PlayerPortrait imageUrl={publicCard.playerImageUrl} playerName={publicCard.playerName} />
                </div>

                <section className="mystery-details-block">
                  <div className="mystery-card-secondary-row">
                    <span className="mystery-possible-years">
                      <CalendarDays size={17} />
                      Possible Years: {publicCard.possibleYearRange}
                    </span>
                    <button
                      aria-expanded={detailsOpen}
                      className="mystery-details-toggle"
                      type="button"
                      onClick={() => setDetailsOpen((open) => !open)}
                    >
                      <ChevronDown size={18} />
                      {detailsOpen ? "Hide Details" : "See More"}
                    </button>
                  </div>

                  {detailsOpen && displayedCardStats ? (
                    <div className="mystery-details-body">
                      <div className="mystery-detail-stat-groups">
                        <div className="mystery-detail-stat-group">
                          <span className="mystery-kicker">{displayedCardStats.modeLabel} Averages</span>
                          <div className="mystery-card-facts mystery-card-facts-compact">
                            <StatTile label="Avg P/R/A" value={formatPraAverage(displayedCardStats.averageStats)} />
                            <StatTile
                              label={`Avg ${displayedCardStats.tsLabel}`}
                              value={formatAverage(displayedCardStats.averageStats.tsStarPct, 0, "%")}
                            />
                            <StatTile
                              label={`Avg ${displayedCardStats.wsLabel}`}
                              value={formatAverage(displayedCardStats.averageStats.weightedWs48, 3)}
                            />
                            <StatTile label="Avg MPG" value={formatAverage(displayedCardStats.averageStats.mpg, 1)} />
                          </div>
                        </div>
                        <div className="mystery-detail-stat-group">
                          <span className="mystery-kicker">{displayedCardStats.modeLabel} Ranges</span>
                          <div className="mystery-card-facts mystery-card-facts-compact">
                            <StatTile label="P/R/A Range" value={formatPraRange(displayedCardStats.statRanges)} />
                            <StatTile
                              label={`${displayedCardStats.tsLabel} Range`}
                              value={formatRange(displayedCardStats.statRanges.tsStarPct, 0, "%")}
                            />
                            <StatTile
                              label={`${displayedCardStats.wsLabel} Range`}
                              value={formatRange(displayedCardStats.statRanges.weightedWs48, 3)}
                            />
                            <StatTile label="MPG Range" value={formatRange(displayedCardStats.statRanges.mpg, 1)} />
                          </div>
                        </div>
                      </div>
                      <div className="mystery-details-section">
                        <span className="mystery-kicker">Full Possible Badges</span>
                        {publicCard.possibleAchievements.length ? (
                          <PossibleBadgeChips achievements={publicCard.possibleAchievements} />
                        ) : (
                          <p className="mystery-empty-copy">No known season-specific badges in this stint.</p>
                        )}
                      </div>
                      <div className="mystery-details-section">
                        <span className="mystery-kicker">Possible Seasons</span>
                        <div className="mystery-season-list">
                          {publicCard.possibleSeasonLabels.map((seasonLabel) => (
                            <span key={seasonLabel}>{seasonLabel}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <form className="mystery-offer-form" onSubmit={handleOfferSubmit}>
                  <label>
                    <span>Offer</span>
                    <div className="mystery-offer-input">
                      <DollarSign size={18} />
                      <input
                        inputMode="numeric"
                        max={legalMaxOffer}
                        min={currentMinimumOffer}
                        placeholder={String(currentMinimumOffer)}
                        step={game.settings.offerIncrement}
                        type="number"
                        value={offerText}
                        onChange={(event) => setOfferText(event.target.value)}
                      />
                    </div>
                  </label>
                  <div className="mystery-offer-actions">
                    <button className="mystery-primary-button" disabled={!offerValidation.valid} type="submit">
                      <DollarSign size={18} />
                      Submit Offer
                    </button>
                    <button className="mystery-secondary-button" type="button" onClick={handlePass}>
                      <SkipForward size={18} />
                      Pass
                    </button>
                  </div>
                  {hasOfferText && offerValidation.message ? (
                    <p className="mystery-validation">{offerValidation.message}</p>
                  ) : (
                    <p className="mystery-validation">Minimum offer is {formatMoney(currentMinimumOffer)}.</p>
                  )}
                </form>
              </article>
            ) : game.lastResult ? (
              <MysteryResultCard
                canSpin={canSpin}
                finalScore={finalScore}
                isLoading={loading}
                onNewRun={resetRun}
                onSpinNext={handleSpin}
                result={game.lastResult}
                runComplete={game.status === "COMPLETE"}
                showAdjustedStats={adjustedStatsEnabled}
              />
            ) : (
              <article className="mystery-empty-table">
                <div className="mystery-empty-visual" aria-hidden="true">
                  <Sparkles />
                </div>
                <div>
                  <span className="mystery-kicker">
                    {game.status === "COMPLETE" ? "Run Complete" : "Ready"}
                  </span>
                  <h2>{game.status === "COMPLETE" ? "Final Score" : "Spin A Card"}</h2>
                </div>
                {game.status === "COMPLETE" ? (
                  <div className="mystery-final-score">
                    <strong>{formatScore(finalScore)}</strong>
                    <span>{game.roster.length} acquired cards</span>
                  </div>
                ) : null}
                {game.status === "COMPLETE" ? (
                  <button className="mystery-primary-button" type="button" onClick={resetRun}>
                    <RotateCcw size={18} />
                    New Run
                  </button>
                ) : (
                  <button className="mystery-primary-button" disabled={!canSpin} type="button" onClick={handleSpin}>
                    <RefreshCw size={18} />
                    {loading ? "Loading..." : "Spin Card"}
                  </button>
                )}
                {error ? <p className="mystery-validation">API error: {error}</p> : null}
              </article>
            )}

            {game.lastResult ? (
              <section
                className={`mystery-reveal mystery-reveal-log mystery-reveal-${game.lastResult.resultType.toLowerCase()}`}
                aria-label="Last reveal"
              >
                <div className="mystery-reveal-icon" aria-hidden="true">
                  <ResultStatusIcon resultType={game.lastResult.resultType} />
                </div>
                <div className="mystery-reveal-body">
                  <div className="mystery-reveal-heading">
                    <span className="mystery-kicker">Last Reveal</span>
                    <div className="mystery-reveal-title-row">
                      <h2>{revealCardTitle(game.lastResult)}</h2>
                      {game.lastResult.minimumNeeded !== null ? (
                        <span className="mystery-true-price">
                          Hidden Price {formatMoney(game.lastResult.minimumNeeded)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mystery-reveal-summary">
                    <span>
                      {game.lastResult.userOffer === null
                        ? "No offer submitted"
                        : `You offered ${formatMoney(game.lastResult.userOffer)}`}
                    </span>
                    <strong>{revealOutcomeText(game.lastResult)}</strong>
                    {lastRevealDelta ? <span>{lastRevealDelta}</span> : null}
                    {game.lastResult.revealedCard ? (
                      <span>Score {formatScore(game.lastResult.revealedCard.score)}</span>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}
          </section>

          <aside className="mystery-side">
            <details
              className="mystery-panel mystery-roster-panel"
              open={rosterPanelOpen}
              onToggle={(event) => setRosterPanelOpen(event.currentTarget.open)}
            >
              <summary className="mystery-panel-title">
                <Trophy size={18} />
                <h2>Roster</h2>
                <span>{slotsRemaining} slots left</span>
              </summary>
              <div className="mystery-roster-list">
                {game.roster.length ? (
                  game.roster.map((card, index) => (
                    <RosterCard
                      card={card}
                      key={card.rosterCardId}
                      rank={index + 1}
                      showAdjustedStats={adjustedStatsEnabled}
                    />
                  ))
                ) : (
                  <p className="mystery-empty-copy">No acquired cards yet.</p>
                )}
              </div>
            </details>

            <details
              className="mystery-panel mystery-settings-panel"
              open={settingsPanelOpen}
              onToggle={(event) => setSettingsPanelOpen(event.currentTarget.open)}
            >
              <summary className="mystery-panel-title">
                <Sparkles size={18} />
                <h2>Settings</h2>
              </summary>
              <div className="mystery-settings-grid">
                <label>
                  Salary Cap
                  <input
                    disabled={started}
                    min={20}
                    type="number"
                    value={settingsDraft.salaryCap}
                    onChange={(event) => updateNumberSetting("salaryCap", event.target.value, 20, 999)}
                  />
                </label>
                <label>
                  Roster Size
                  <input
                    disabled={started}
                    max={12}
                    min={1}
                    type="number"
                    value={settingsDraft.rosterSize}
                    onChange={(event) => updateNumberSetting("rosterSize", event.target.value, 1, 12)}
                  />
                </label>
                <label>
                  Max Spins
                  <input
                    disabled={started}
                    max={60}
                    min={1}
                    type="number"
                    value={settingsDraft.maxSpins}
                    onChange={(event) => updateNumberSetting("maxSpins", event.target.value, 1, 60)}
                  />
                </label>
                <label>
                  Minimum Offer
                  <input
                    disabled={started}
                    min={1}
                    type="number"
                    value={settingsDraft.minimumOffer}
                    onChange={(event) => updateNumberSetting("minimumOffer", event.target.value, 1, 50)}
                  />
                </label>
                <label>
                  Increment
                  <input
                    disabled={started}
                    min={1}
                    type="number"
                    value={settingsDraft.offerIncrement}
                    onChange={(event) => updateNumberSetting("offerIncrement", event.target.value, 1, 25)}
                  />
                </label>
                <label>
                  Price Multiplier
                  <input
                    disabled={started}
                    max={2}
                    min={0.05}
                    step={0.05}
                    type="number"
                    value={settingsDraft.scoreToPriceMultiplier}
                    onChange={(event) => updateNumberSetting("scoreToPriceMultiplier", event.target.value, 0.05, 2)}
                  />
                </label>
                <label className="mystery-setting-wide">
                  Top 100 Chance
                  <input
                    disabled={started}
                    max={100}
                    min={0}
                    step={1}
                    type="range"
                    value={Math.round(settingsDraft.top100Chance * 100)}
                    onChange={(event) => updateTop100Chance(event.target.value)}
                  />
                  <span>{Math.round(settingsDraft.top100Chance * 100)}%</span>
                </label>
                <label className="mystery-toggle">
                  <input
                    checked={settingsDraft.allowDuplicatePlayers}
                    disabled={started}
                    type="checkbox"
                    onChange={(event) => updateSettings({ allowDuplicatePlayers: event.target.checked })}
                  />
                  Duplicate Players
                </label>
                <label className="mystery-toggle">
                  <input
                    checked={settingsDraft.removeOfferedStintAfterSpin}
                    disabled={started}
                    type="checkbox"
                    onChange={(event) => updateSettings({ removeOfferedStintAfterSpin: event.target.checked })}
                  />
                  Remove Offered Stints
                </label>
                <label className="mystery-toggle">
                  <input
                    checked={settingsDraft.revealAfterPass}
                    disabled={started}
                    type="checkbox"
                    onChange={(event) => updateSettings({ revealAfterPass: event.target.checked })}
                  />
                  Reveal Passes
                </label>
              </div>
            </details>
          </aside>
        </div>
      </section>
    </main>
  );
}
