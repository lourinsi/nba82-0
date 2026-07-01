"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  DollarSign,
  List,
  Map,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  StopCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { RESULT_BADGE_META_BY_ID } from "../achievementMeta";
import { getCachedPlayers, loadApiJson, loadPlayers } from "../apiClient";
import { teamThemeStyle } from "../all-time/teamStyles";
import {
  adjustedStatsSnapshot,
  colorModeSnapshot,
  setGameHeaderState,
  subscribeToAdjustedStats,
  subscribeToColorMode,
  subscribeToGameHeaderAction,
} from "../clientPreferences";
import {
  FIRST_GAME_TIP_INDEX,
  GAME_TIPS,
  nextRotatingGameTipIndex,
  type GameTip,
} from "../gameTips";
import type { Achievement, Player, StatsEngineConfig } from "../GameCourt";
import MobileGameFooter, {
  type MobileGameFooterNavItem,
  type MobileGameFooterSlot,
} from "../MobileGameFooter";
import { UNKNOWN_PLAYER_IMAGE, handlePlayerImageError } from "../playerImages";
import {
  optimizeMysteryDraftPositions,
  type MysteryPositionAssignment,
} from "./mysteryDraftResults";
import {
  DEFAULT_MYSTERY_DRAFT_SETTINGS,
  MYSTERY_AWARD_FILTER_OPTIONS,
  MYSTERY_SEASON_POOL_OPTIONS,
  acceptMysteryDraftSecondOffer,
  createMysteryDraftGame,
  declineMysteryDraftSecondOffer,
  generateSpinCandidates,
  minimumLegalOfferForCurrentCard,
  maxLegalOffer,
  mysteryDefaultPoolBiasForSeasonPool,
  mysteryDraftYearsLabel,
  mysteryPoolLogicLabel,
  mysteryPoolSourceLabel,
  mysterySeasonPoolLabel,
  passMysteryDraftCard,
  publicMysteryDraftCard,
  rosterSlotsRemaining,
  selectVisibleMysteryStint,
  startMysteryDraftGame,
  submitMysteryDraftOffer,
  tsStarPercentValue,
  validateMysteryDraftOffer,
  weightedWs48Value,
  updateConnectedPoolWeights,
  type MysteryDraftAverageStats,
  type MysteryAwardFilter,
  type MysteryDraftOfferResult,
  type MysteryPoolBiasKey,
  type MysteryDraftRawSeasonStats,
  type MysteryDraftRosterCard,
  type MysteryDraftSeasonPool,
  type MysteryDraftSettings,
  type MysteryDraftSpinCandidate,
  type MysteryDraftStatRanges,
  type MysteryNumberRange,
} from "./mysteryDraftGame";
import {
  MYSTERY_RESULT_STORAGE_KEY,
  MYSTERY_RESULTS_PATH,
} from "./mysteryDraftResultConstants";
import { buildMysteryDraftResultsPayload } from "./mysteryDraftResults";

const MYSTERY_SPIN_TICK_MS = 86;
const MYSTERY_SPIN_MAX_MS = 5000;
const MYSTERY_TOAST_MS = 3600;

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

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMarketRange(min: number | null | undefined, max: number | null | undefined) {
  return `${formatMoney(min)}-${formatMoney(max)}`;
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

function playerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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

function RosterBadgeFloat({ achievements }: { achievements: Achievement[] }) {
  if (!achievements.length) {
    return null;
  }

  const visibleAchievements = achievements.slice(0, 4);
  const hiddenCount = Math.max(0, achievements.length - visibleAchievements.length);

  return (
    <div className="mystery-roster-floating-badges" aria-label="Season badges">
      {visibleAchievements.map((achievement, index) => {
        const meta = RESULT_BADGE_META_BY_ID[achievement.id];
        const title = achievement.title || meta?.description || achievementChipLabel(achievement);

        return (
          <span
            className={`mystery-roster-floating-badge ${
              meta ? `court-achievement-badge-${meta.variant}` : ""
            }`}
            key={`${achievement.id}-${index}`}
            title={title}
          >
            {meta?.symbol || achievement.label}
          </span>
        );
      })}
      {hiddenCount > 0 ? (
        <span className="mystery-roster-floating-badge mystery-roster-floating-badge-more">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function MysteryCourtBadgeRail({ achievements }: { achievements: Achievement[] }) {
  if (!achievements.length) {
    return null;
  }

  const visibleAchievements = achievements.slice(0, 3);
  const hiddenCount = Math.max(0, achievements.length - visibleAchievements.length);

  return (
    <span className="mystery-court-badges" aria-label="Season badges">
      {visibleAchievements.map((achievement, index) => {
        const meta = RESULT_BADGE_META_BY_ID[achievement.id];
        const title = achievement.title || meta?.description || achievementChipLabel(achievement);

        return (
          <span
            className={`mystery-court-badge ${meta ? `court-achievement-badge-${meta.variant}` : ""}`}
            key={`${achievement.id}-${index}`}
            title={title}
          >
            {meta?.symbol || achievement.label}
          </span>
        );
      })}
      {hiddenCount > 0 ? <span className="mystery-court-badge mystery-court-badge-more">+{hiddenCount}</span> : null}
    </span>
  );
}

function rosterStatIcon(statId: string) {
  switch (statId) {
    case "pra":
      return "🏀";
    case "ts-pct":
    case "ts-star":
      return "🎯";
    case "ws-48":
      return "📈";
    case "mpg":
      return "⏱";
    default:
      return "•";
  }
}

function RosterStatStrip({ achievements }: { achievements: Achievement[] }) {
  return (
    <div className="mystery-roster-stat-strip" aria-label="Season stats">
      {achievements.map((achievement, index) => (
        <span
          className={`mystery-roster-stat-pill mystery-roster-stat-${achievement.id}`}
          key={`${achievement.id}-${achievement.value}-${index}`}
          title={achievement.title}
        >
          <span className="mystery-roster-stat-icon" aria-hidden="true">
            {rosterStatIcon(achievement.id)}
          </span>
          <span className="mystery-roster-stat-value">{achievement.value}</span>
          <span className="mystery-roster-stat-label">{achievement.label}</span>
        </span>
      ))}
    </div>
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

function PositionChips({
  eligiblePositions,
  primaryPosition,
}: {
  eligiblePositions: readonly string[];
  primaryPosition: string | null;
}) {
  const visiblePositions = eligiblePositions.length ? eligiblePositions : [];

  if (!visiblePositions.length) {
    return (
      <div className="mystery-position-chips" aria-label="Positions unknown">
        <span className="mystery-position-chip mystery-position-chip-muted">POS unknown</span>
      </div>
    );
  }

  return (
    <div className="mystery-position-chips" aria-label={`Positions ${visiblePositions.join(", ")}`}>
      {visiblePositions.map((position) => (
        <span
          className={`mystery-position-chip ${position === primaryPosition ? "mystery-position-chip-primary" : ""}`}
          key={position}
        >
          {position}
        </span>
      ))}
    </div>
  );
}

function formatBiasPercent(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

function PoolBiasSlider({
  children,
  helper,
  label,
  onChange,
  value,
}: {
  children?: ReactNode;
  helper: string;
  label: string;
  onChange: (value: string) => void;
  value: number;
}) {
  return (
    <div className="mystery-pool-bias-control">
      <div className="mystery-pool-bias-row">
        <label>
          <span>{label}</span>
          <strong>{formatBiasPercent(value)}</strong>
        </label>
        {children ? <div className="mystery-pool-bias-select">{children}</div> : null}
      </div>
      <input
        max={100}
        min={0}
        step={0.1}
        type="range"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>{helper}</small>
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
  variant?: "card" | "spin" | "result" | "roster";
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

function resultTypeClassName(resultType: MysteryDraftOfferResult["resultType"]) {
  return resultType.toLowerCase().replace(/_/g, "-");
}

function revealOutcomeText(result: MysteryDraftOfferResult) {
  if (result.resultType === "SNIPED") {
    return "SNIPED! Added to roster";
  }

  if (result.resultType === "ACCEPTED") {
    return result.acceptedSecondOffer ? "Accepted second offer - Added to roster" : "Accepted - Added to roster";
  }

  if (result.resultType === "REJECTED_COUNTER") {
    return "Rejected - Second offer available";
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

  if (result.resultType === "SNIPED") {
    return "Perfect match";
  }

  if (result.resultType === "ACCEPTED") {
    if (result.acceptedSecondOffer) {
      return "Accepted counter offer";
    }

    return delta > 0 ? `Overpaid by ${formatMoney(delta)}` : "Matched true price";
  }

  if (result.resultType === "REJECTED" || result.resultType === "REJECTED_COUNTER") {
    return `Short by ${formatMoney(Math.abs(delta))}`;
  }

  return null;
}

function resultToneLabel(result: MysteryDraftOfferResult) {
  if (result.resultType === "SNIPED") {
    return "SNIPED!";
  }

  if (result.resultType === "ACCEPTED") {
    return "Accepted";
  }

  if (result.resultType === "REJECTED" || result.resultType === "REJECTED_COUNTER") {
    return "Rejected";
  }

  return "Passed";
}

function resultSubcopy(result: MysteryDraftOfferResult) {
  if (result.resultType === "SNIPED") {
    const baseScore = formatScore(result.baseScore ?? result.revealedCard?.baseScore ?? 0);
    const finalScore = formatScore(result.finalScore ?? result.revealedCard?.finalScore ?? 0);

    // return `Perfect price. +10% score bonus: ${baseScore} to ${finalScore}`;
    return `Perfect price +10%`;
  }

  if (result.resultType === "ACCEPTED") {
    return result.acceptedSecondOffer ? "Counter offer accepted" : "Added to roster";
  }

  if (result.resultType === "REJECTED_COUNTER") {
    return "Counter offer available";
  }

  if (result.resultType === "REJECTED") {
    return "Card lost";
  }

  return result.revealedCard ? "Card revealed and skipped" : "Card skipped";
}

function ResultStatusIcon({ resultType }: { resultType: MysteryDraftOfferResult["resultType"] }) {
  if (resultType === "ACCEPTED" || resultType === "SNIPED") {
    return <CheckCircle2 />;
  }

  if (resultType === "REJECTED" || resultType === "REJECTED_COUNTER") {
    return <XCircle />;
  }

  return <SkipForward />;
}

function MysteryResultCard({
  canAcceptSecondOffer = false,
  canSpin,
  counterOfferUnavailableText = null,
  isLoading,
  onAcceptSecondOffer,
  onDeclineSecondOffer,
  onNewRun,
  onSpinNext,
  onViewResults,
  result,
  runComplete,
  showAdjustedStats,
}: {
  canAcceptSecondOffer?: boolean;
  canSpin: boolean;
  counterOfferUnavailableText?: string | null;
  isLoading: boolean;
  onAcceptSecondOffer?: () => void;
  onDeclineSecondOffer?: () => void;
  onNewRun: () => void;
  onSpinNext: () => void;
  onViewResults: () => void;
  result: MysteryDraftOfferResult;
  runComplete: boolean;
  showAdjustedStats: boolean;
}) {
  const revealedCard = result.revealedCard;
  const deltaText = revealDeltaText(result);
  const articleStyle = revealedCard ? teamThemeStyle(revealedCard.team) : undefined;
  const isCounterOffer = result.resultType === "REJECTED_COUNTER";

  return (
    <article
      className={`mystery-current-card mystery-result-card mystery-result-card-${resultTypeClassName(result.resultType)}`}
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

          {result.secondOffer !== null ? (
            <div className="mystery-hidden-price-panel mystery-second-offer-panel" aria-label="Second offer">
              <span>{result.acceptedSecondOffer ? "Second Offer Paid" : "Second Offer"}</span>
              <strong>{formatMoney(result.secondOffer)}</strong>
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
        {result.paidAmount !== null ? <span>Paid {formatMoney(result.paidAmount)}</span> : null}
        {result.secondOffer !== null ? <strong>Second Offer {formatMoney(result.secondOffer)}</strong> : null}
        {result.wasSniped ? <strong>+10% player score</strong> : null}
        {deltaText ? <strong>{deltaText}</strong> : null}
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
        {isCounterOffer ? (
          <div className="mystery-counter-actions">
            <button
              className="mystery-primary-button"
              disabled={!canAcceptSecondOffer || isLoading}
              type="button"
              onClick={onAcceptSecondOffer}
            >
              <DollarSign size={18} />
              Accept {formatMoney(result.secondOffer)}
            </button>
            <button
              className="mystery-secondary-button"
              disabled={isLoading}
              type="button"
              onClick={onDeclineSecondOffer}
            >
              <SkipForward size={18} />
              Decline
            </button>
            <p className="mystery-validation">
              {counterOfferUnavailableText || "Accepting a second offer does not apply the snipe bonus."}
            </p>
          </div>
        ) : runComplete ? (
          <>
            <div className="mystery-result-final-score">
              <span>Run Complete</span>
              <strong>Ready</strong>
            </div>
            <div className="mystery-complete-actions">
              <button className="mystery-primary-button" type="button" onClick={onViewResults}>
                <Trophy size={18} />
                View Results
              </button>
              <button className="mystery-secondary-button" type="button" onClick={onNewRun}>
                <RotateCcw size={18} />
                New Run
              </button>
            </div>
          </>
        ) : (
          <button
            aria-disabled={!canSpin}
            className="mystery-primary-button"
            disabled={isLoading}
            type="button"
            onClick={onSpinNext}
          >
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
  const statAchievements = buildSeasonMetricAchievements(card, showAdjustedStats);

  return (
    <article className="mystery-roster-card" style={teamThemeStyle(card.team)}>
      <div className="mystery-roster-main">
        <div className="mystery-roster-heading">
          <div className="mystery-roster-rank">
            <span>{rank}</span>
            <small>Pick</small>
          </div>
          <div className="mystery-roster-price">
            <span>{formatMoney(card.paidPrice)}</span>
            <small>Paid</small>
          </div>
        </div>
        <div className="mystery-roster-person">
          <div className="mystery-roster-media">
            <div className="mystery-roster-photo-stack">
              <PlayerPortrait
                imageUrl={card.playerImageUrl}
                playerName={card.playerName}
                variant="roster"
              />
              <RosterBadgeFloat achievements={card.seasonAchievements} />
            </div>
            <PositionChips
              eligiblePositions={card.eligiblePositions}
              primaryPosition={card.primaryPosition}
            />
          </div>
          <div className="mystery-roster-copy">
            <div className="mystery-roster-teamline">
              <span>{card.team}</span>
              <i aria-hidden="true" />
              <span>{card.seasonLabel}</span>
            </div>
            <h3>{card.playerName}</h3>
            <div className="mystery-roster-season-line">
              <CalendarDays size={18} />
              <span>{card.eraLabel} era</span>
              <strong>{card.seasonLabel} season</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="mystery-roster-stats">
        <RosterStatStrip achievements={statAchievements} />
      </div>
    </article>
  );
}

function MysteryCourtSlot({ assignment }: { assignment: MysteryPositionAssignment }) {
  const card = assignment.card;

  return (
    <div
      className={`court-slot court-slot-${assignment.slot.toLowerCase()} mystery-court-slot ${
        card ? "court-slot-filled" : ""
      }`}
      role="group"
      aria-label={card ? `${card.playerName}, ${assignment.slot}` : `${assignment.slot} slot`}
      data-player-name={card?.playerName}
      style={card ? teamThemeStyle(card.team) : undefined}
    >
      <span className="court-slot-position">{assignment.slot}</span>
      {card ? (
        <>
          <span className="court-slot-name">{playerInitials(card.playerName)}</span>
          <span className="court-slot-team">
            {card.team} - {card.eraLabel}
          </span>
          <MysteryCourtBadgeRail achievements={card.seasonAchievements} />
        </>
      ) : null}
    </div>
  );
}

function MysteryCourtView({ roster }: { roster: MysteryDraftRosterCard[] }) {
  const optimization = useMemo(() => optimizeMysteryDraftPositions(roster), [roster]);

  return (
    <div className="mystery-court-view">
      <div className="mystery-court-note" role="note">
        Positions are automatically optimized for the best lineup fit. Manual swaps are unavailable in Mystery Draft.
      </div>
      <div className="game-court court-blueprint mystery-court-board" aria-label="Auto-positioned mystery lineup">
        <div className="court-key" />
        <div className="court-rim" />
        <div className="court-arc" />
        {optimization.assignments.map((assignment) => (
          <MysteryCourtSlot assignment={assignment} key={assignment.slot} />
        ))}
      </div>
    </div>
  );
}

function MysteryRosterWarmup({ tip }: { tip: GameTip }) {
  return (
    <section className="mystery-shell mystery-lobby-shell mystery-warmup-shell">
      <article className="mystery-warmup-card" role="status" aria-live="polite">
        <RefreshCw className="mystery-warmup-spinner" size={42} />
        <span className="mystery-kicker">Warming Rosters</span>
        <h1>Mystery Salary Draft</h1>
        <p>Fetching the player-season pool...</p>
        <span className="roster-tip-content mystery-warmup-tip" key={`${tip.eyebrow}-${tip.text}`}>
          <span className="roster-tip-kicker">{tip.eyebrow}</span>
          <span className="roster-tip-copy">{tip.text}</span>
        </span>
      </article>
    </section>
  );
}

function MysteryGameTipCard({ tip }: { tip: GameTip }) {
  return (
    <aside className="mystery-game-tip-card" role="note">
      <span className="roster-tip-content" key={`${tip.eyebrow}-${tip.text}`}>
        <span className="roster-tip-kicker">{tip.eyebrow}</span>
        <span className="roster-tip-copy">{tip.text}</span>
      </span>
    </aside>
  );
}

export default function MysteryDraftPage() {
  const router = useRouter();
  const lightMode = useSyncExternalStore(subscribeToColorMode, colorModeSnapshot, () => false);
  const adjustedStatsEnabled = useSyncExternalStore(subscribeToAdjustedStats, adjustedStatsSnapshot, () => false);
  const [players, setPlayers] = useState<Player[]>(() => getCachedPlayers<Player>() ?? []);
  const [statsEngineConfig, setStatsEngineConfig] =
    useState<StatsEngineConfig>(FALLBACK_STATS_ENGINE_CONFIG);
  const [loading, setLoading] = useState(() => !getCachedPlayers<Player>());
  const [error, setError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<MysteryDraftSettings>({
    ...DEFAULT_MYSTERY_DRAFT_SETTINGS,
  });
  const [game, setGame] = useState(() => createMysteryDraftGame(settingsDraft));
  const [offerText, setOfferText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rosterPanelOpen, setRosterPanelOpen] = useState(true);
  const [rosterViewMode, setRosterViewMode] = useState<"roster" | "court">("roster");
  const [toastWarning, setToastWarning] = useState<string | null>(null);
  const [spinCandidates, setSpinCandidates] = useState<MysteryDraftSpinCandidate[]>([]);
  const [spinIndex, setSpinIndex] = useState(0);
  const [activeTipIndex, setActiveTipIndex] = useState(FIRST_GAME_TIP_INDEX);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinCandidatesRef = useRef<MysteryDraftSpinCandidate[]>([]);
  const spinIndexRef = useRef(0);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicCard = useMemo(() => publicMysteryDraftCard(game.currentCard), [game.currentCard]);
  const activeTip = GAME_TIPS[activeTipIndex] ?? GAME_TIPS[0];
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
  const lastRevealDelta = game.lastResult ? revealDeltaText(game.lastResult) : null;
  const counterOfferResult = game.lastResult?.resultType === "REJECTED_COUNTER" ? game.lastResult : null;
  const counterOfferAmount = counterOfferResult?.secondOffer ?? null;
  const canAcceptCounterOffer =
    counterOfferAmount !== null && Number.isFinite(counterOfferAmount) && counterOfferAmount <= legalMaxOffer;
  const counterOfferUnavailableText =
    counterOfferAmount !== null && !canAcceptCounterOffer
      ? "Not enough salary cap for this second offer."
      : null;
  const canSpin =
    !loading &&
    !error &&
    !isSpinning &&
    game.status === "ACTIVE" &&
    game.started &&
    !game.currentCard &&
    game.spinsUsed < game.maxSpins &&
    game.roster.length < game.rosterSize &&
    legalMaxOffer >= game.settings.minimumOffer;
  const mobileCourtAssignments = useMemo(
    () => optimizeMysteryDraftPositions(game.roster).assignments,
    [game.roster],
  );
  const mysteryMobileFooterSlots: MobileGameFooterSlot[] = mobileCourtAssignments.map((assignment) => {
    const card = assignment.card;

    return {
      ariaLabel: card ? `${card.playerName}, ${assignment.slot}` : `${assignment.slot} slot`,
      className: `mystery-mobile-footer-slot-${assignment.fitKind}`,
      filled: Boolean(card),
      key: assignment.slot,
      label: assignment.slot,
      style: card ? teamThemeStyle(card.team) : undefined,
      title: card ? `${card.playerName} - ${card.team} ${card.seasonLabel}` : `${assignment.slot} slot`,
      token: card ? playerInitials(card.playerName) : assignment.slot,
    };
  });
  const mysteryMobileFooterNavItems: MobileGameFooterNavItem[] = [
    { active: true, id: "play", label: "Play" },
    { id: "feed", label: "Feed" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "challenges", label: "Challenges" },
    { id: "profile", label: "Profile" },
  ];
  const shouldShowMysteryTip = game.started && game.status === "ACTIVE" && !game.lastResult;

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

  const showToastWarning = useCallback((message: string) => {
    if (!message) {
      return;
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastWarning(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastWarning(null);
      toastTimeoutRef.current = null;
    }, MYSTERY_TOAST_MS);
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
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setDetailsOpen(false);
    setGame(createMysteryDraftGame(settingsDraft));
    setIsSpinning(false);
    setOfferText("");
    setToastWarning(null);
    setSpinCandidates([]);
    setSpinIndex(0);
    spinCandidatesRef.current = [];
    spinIndexRef.current = 0;
  }, [clearSpinTimers, settingsDraft]);

  const startDraft = useCallback(() => {
    clearSpinTimers();
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setDetailsOpen(false);
    setGame(startMysteryDraftGame(settingsDraft));
    setIsSpinning(false);
    setOfferText("");
    setRosterPanelOpen(true);
    setRosterViewMode("roster");
    setToastWarning(null);
    setSpinCandidates([]);
    setSpinIndex(0);
    spinCandidatesRef.current = [];
    spinIndexRef.current = 0;
  }, [clearSpinTimers, settingsDraft]);

  const viewResults = useCallback(() => {
    if (game.status !== "COMPLETE") {
      return;
    }

    const payload = buildMysteryDraftResultsPayload(game, adjustedStatsEnabled);

    sessionStorage.setItem(MYSTERY_RESULT_STORAGE_KEY, JSON.stringify(payload));
    router.push(MYSTERY_RESULTS_PATH);
  }, [adjustedStatsEnabled, game, router]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const cachedPlayers = getCachedPlayers<Player>();

        if (cachedPlayers) {
          setPlayers(cachedPlayers);
          setError(null);
          setLoading(false);
          return;
        }

        if (active) {
          setLoading(true);
        }

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
      eyebrow: game.started ? (game.status === "COMPLETE" ? "Mystery Final" : "Mystery Draft") : "Mystery Lobby",
      resetDisabled: false,
      resetLabel: "New mystery draft",
      showAdjustedStatsToggle: true,
      showReset: game.started,
      title:
        game.started
          ? `${game.roster.length}/${game.rosterSize} players - ${formatMoney(game.salaryRemaining)}`
          : `${mysterySeasonPoolLabel(settingsDraft.seasonPool)} setup`,
    });
  }, [
    game.roster.length,
    game.rosterSize,
    game.salaryRemaining,
    game.started,
    game.status,
    settingsDraft.seasonPool,
  ]);

  useEffect(() => () => setGameHeaderState(null), []);

  useEffect(() => () => clearSpinTimers(), [clearSpinTimers]);

  useEffect(() => {
    if (!game.warnings.length) {
      return;
    }

    const latestWarning = game.warnings[game.warnings.length - 1] ?? null;

    if (!latestWarning) {
      return;
    }

    const showToastTimeout = setTimeout(() => showToastWarning(latestWarning), 0);

    return () => {
      clearTimeout(showToastTimeout);
    };
  }, [game.warnings, showToastWarning]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!loading && !shouldShowMysteryTip) {
      return;
    }

    const tipInterval = window.setInterval(() => {
      setActiveTipIndex((currentIndex) => nextRotatingGameTipIndex(currentIndex));
    }, 10000);

    return () => {
      window.clearInterval(tipInterval);
    };
  }, [loading, shouldShowMysteryTip]);

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
    setGame(createMysteryDraftGame(merged));
  }

  function updateNumberSetting(key: keyof MysteryDraftSettings, value: string, min: number, max: number) {
    const numeric = clamp(Number(value), min, max);

    if (!Number.isFinite(numeric)) {
      return;
    }

    updateSettings({ [key]: numeric } as Partial<MysteryDraftSettings>);
  }

  function updatePoolBias(key: MysteryPoolBiasKey, value: string) {
    const nextWeights = updateConnectedPoolWeights(
      {
        activeStar: settingsDraft.activeStar,
        award: settingsDraft.award,
        top100: settingsDraft.top100,
        wildcard: settingsDraft.wildcard,
      },
      key,
      Number(value),
    );

    updateSettings(nextWeights);
  }

  function updateAwardFilter(key: "awardFilter" | "activeStarFilter", value: string) {
    if (!MYSTERY_AWARD_FILTER_OPTIONS.some((option) => option.value === value)) {
      return;
    }

    updateSettings({ [key]: value as MysteryAwardFilter } as Partial<MysteryDraftSettings>);
  }

  function updateSeasonPool(value: string) {
    if (!MYSTERY_SEASON_POOL_OPTIONS.some((option) => option.value === value)) {
      return;
    }

    const seasonPool = value as MysteryDraftSeasonPool;

    updateSettings({
      ...mysteryDefaultPoolBiasForSeasonPool(seasonPool),
      activeStarFilter: DEFAULT_MYSTERY_DRAFT_SETTINGS.activeStarFilter,
      awardFilter: DEFAULT_MYSTERY_DRAFT_SETTINGS.awardFilter,
      seasonPool,
    });
  }

  function spinUnavailableMessage() {
    if (loading) {
      return "Loading the player pool.";
    }

    if (error) {
      return `API error: ${error}`;
    }

    if (isSpinning) {
      return "Spin already in progress.";
    }

    if (!game.started) {
      return "Start the draft first.";
    }

    if (game.status === "COMPLETE") {
      return "Run complete. View results or start a new run.";
    }

    if (counterOfferResult) {
      return "Accept or decline the second offer first.";
    }

    if (game.currentCard) {
      return "Bid or pass on the current card first.";
    }

    if (game.roster.length >= game.rosterSize) {
      return "Roster is full. View results when ready.";
    }

    if (game.spinsUsed >= game.maxSpins) {
      return "All spins are exhausted.";
    }

    if (legalMaxOffer < game.settings.minimumOffer) {
      return "Not enough salary left to bid on another card.";
    }

    return "Can't spin right now.";
  }

  function handleSpin() {
    if (!canSpin) {
      showToastWarning(spinUnavailableMessage());
      return;
    }

    setOfferText("");
    setDetailsOpen(false);

    const result = generateSpinCandidates(game, players, statsEngineConfig, 30);

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
      showToastWarning(
        offerValidation.message ||
          (legalMaxOffer < currentMinimumOffer
            ? "Not enough salary left for the minimum offer."
            : `Minimum offer is ${formatMoney(currentMinimumOffer)}.`),
      );
      return;
    }

    const nextGame = submitMysteryDraftOffer(game, offerValue);

    setGame(nextGame);
    if (nextGame.lastResult?.resultType === "ACCEPTED" || nextGame.lastResult?.resultType === "SNIPED") {
      setRosterViewMode("court");
    }
    setDetailsOpen(false);
    setOfferText("");
  }

  function handleAcceptSecondOffer() {
    if (!counterOfferResult) {
      return;
    }

    if (!canAcceptCounterOffer) {
      showToastWarning(counterOfferUnavailableText || "Not enough salary cap for this second offer.");
      return;
    }

    const nextGame = acceptMysteryDraftSecondOffer(game);

    setGame(nextGame);
    if (nextGame.lastResult?.accepted) {
      setRosterViewMode("court");
    }
    setDetailsOpen(false);
    setOfferText("");
  }

  function handleDeclineSecondOffer() {
    setGame((current) => declineMysteryDraftSecondOffer(current));
    setDetailsOpen(false);
    setOfferText("");
  }

  function handlePass() {
    setGame((current) => passMysteryDraftCard(current));
    setDetailsOpen(false);
    setOfferText("");
  }

  if (!game.started) {
    if (loading && !error) {
      return (
        <main className={`mystery-page ${lightMode ? "mystery-page-light" : ""}`}>
          <MysteryRosterWarmup tip={activeTip} />
        </main>
      );
    }

    return (
      <main className={`mystery-page ${lightMode ? "mystery-page-light" : ""}`}>
        <section className="mystery-shell mystery-lobby-shell">
          <section className="mystery-lobby-card">
            <div className="mystery-lobby-heading">
              <span className="mystery-kicker">Solo Mode</span>
              <h1>Mystery Salary Draft</h1>
            </div>

            <div className="mystery-lobby-main">
              <label className="mystery-lobby-field">
                <span>Season Pool</span>
                <select
                  value={settingsDraft.seasonPool}
                  onChange={(event) => updateSeasonPool(event.target.value)}
                >
                  {MYSTERY_SEASON_POOL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mystery-lobby-field mystery-lobby-years-field">
                <span>Draft Years</span>
                {settingsDraft.seasonPool === "custom" ? (
                  <div className="mystery-lobby-custom-range">
                    <input
                      aria-label="Draft years start"
                      max={settingsDraft.customEndYear}
                      min={1949}
                      type="number"
                      value={settingsDraft.customStartYear}
                      onChange={(event) => updateNumberSetting("customStartYear", event.target.value, 1949, 2026)}
                    />
                    <input
                      aria-label="Draft years end"
                      max={2026}
                      min={settingsDraft.customStartYear}
                      type="number"
                      value={settingsDraft.customEndYear}
                      onChange={(event) => updateNumberSetting("customEndYear", event.target.value, 1949, 2026)}
                    />
                  </div>
                ) : (
                  <strong className="mystery-draft-years-value">{mysteryDraftYearsLabel(settingsDraft)}</strong>
                )}
              </div>

              <button
                className="mystery-primary-button mystery-start-button"
                disabled={loading}
                type="button"
                onClick={startDraft}
              >
                <Sparkles size={18} />
                {loading ? "Loading..." : "Start Draft"}
              </button>

              {error ? <p className="mystery-validation">API error: {error}</p> : null}
            </div>

            <details className="mystery-panel mystery-lobby-advanced">
              <summary className="mystery-panel-title">
                <Sparkles size={18} />
                <h2>Show More Settings</h2>
              </summary>
              <div className="mystery-pool-bias-panel">
                <div className="mystery-pool-bias-heading">
                  <span className="mystery-kicker">Pool Bias</span>
                  <strong>{mysteryPoolLogicLabel(settingsDraft)}</strong>
                </div>
                <PoolBiasSlider
                  helper="Prioritizes all-time Top 100 players within the selected draft years."
                  label="Top 100 Bias"
                  value={settingsDraft.top100}
                  onChange={(value) => updatePoolBias("top100", value)}
                />
                <PoolBiasSlider
                  helper="Prioritizes players who earned the selected award or accolade inside the selected draft years."
                  label="Award Bias"
                  value={settingsDraft.award}
                  onChange={(value) => updatePoolBias("award", value)}
                >
                  <select
                    aria-label="Award Bias filter"
                    value={settingsDraft.awardFilter}
                    onChange={(event) => updateAwardFilter("awardFilter", event.target.value)}
                  >
                    {MYSTERY_AWARD_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </PoolBiasSlider>
                <PoolBiasSlider
                  helper="Adds current active stars, even outside the selected era. At 0%, active players are not banned."
                  label="Active Star Injection"
                  value={settingsDraft.activeStar}
                  onChange={(value) => updatePoolBias("activeStar", value)}
                >
                  <select
                    aria-label="Active Star Injection filter"
                    value={settingsDraft.activeStarFilter}
                    onChange={(event) => updateAwardFilter("activeStarFilter", event.target.value)}
                  >
                    {MYSTERY_AWARD_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </PoolBiasSlider>
                <PoolBiasSlider
                  helper="Adds random eligible seasons for variety."
                  label="Wildcard Bias"
                  value={settingsDraft.wildcard}
                  onChange={(value) => updatePoolBias("wildcard", value)}
                />
              </div>
              <div className="mystery-settings-grid">
                <label>
                  Salary Cap
                  <input
                    min={20}
                    type="number"
                    value={settingsDraft.salaryCap}
                    onChange={(event) => updateNumberSetting("salaryCap", event.target.value, 20, 999)}
                  />
                </label>
                <label>
                  Roster Size
                  <input
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
                    min={1}
                    type="number"
                    value={settingsDraft.minimumOffer}
                    onChange={(event) => updateNumberSetting("minimumOffer", event.target.value, 1, 50)}
                  />
                </label>
                <label>
                  Increment
                  <input
                    min={1}
                    type="number"
                    value={settingsDraft.offerIncrement}
                    onChange={(event) => updateNumberSetting("offerIncrement", event.target.value, 1, 25)}
                  />
                </label>
                <label>
                  Price Multiplier
                  <input
                    max={2}
                    min={0.05}
                    step={0.05}
                    type="number"
                    value={settingsDraft.scoreToPriceMultiplier}
                    onChange={(event) => updateNumberSetting("scoreToPriceMultiplier", event.target.value, 0.05, 2)}
                  />
                </label>
                <label className="mystery-toggle">
                  <input
                    checked={settingsDraft.allowDuplicatePlayers}
                    type="checkbox"
                    onChange={(event) => updateSettings({ allowDuplicatePlayers: event.target.checked })}
                  />
                  Duplicate Players
                </label>
                <label className="mystery-toggle">
                  <input
                    checked={settingsDraft.removeOfferedStintAfterSpin}
                    type="checkbox"
                    onChange={(event) => updateSettings({ removeOfferedStintAfterSpin: event.target.checked })}
                  />
                  Remove Offered Stints
                </label>
                <label className="mystery-toggle">
                  <input
                    checked={settingsDraft.revealAfterPass}
                    type="checkbox"
                    onChange={(event) => updateSettings({ revealAfterPass: event.target.checked })}
                  />
                  Reveal Passes
                </label>
              </div>
            </details>
          </section>
        </section>
      </main>
    );
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

        <div className="mystery-toast-region" aria-live="polite">
          {toastWarning ? <div className="mystery-toast">{toastWarning}</div> : null}
        </div>

        <div className="mystery-layout">
          <section className="mystery-table">
            {isSpinning && activeSpinCandidate ? (
              <article className="mystery-current-card mystery-spin-card" style={teamThemeStyle(activeSpinCandidate.team)}>
                <div className="mystery-card-topline">
                  <span>{mysteryPoolSourceLabel(activeSpinCandidate.poolSource, game.settings)}</span>
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
            ) : counterOfferResult ? (
              <MysteryResultCard
                canAcceptSecondOffer={canAcceptCounterOffer}
                canSpin={canSpin}
                counterOfferUnavailableText={counterOfferUnavailableText}
                isLoading={loading}
                onAcceptSecondOffer={handleAcceptSecondOffer}
                onDeclineSecondOffer={handleDeclineSecondOffer}
                onNewRun={resetRun}
                onSpinNext={handleSpin}
                onViewResults={viewResults}
                result={counterOfferResult}
                runComplete={game.status === "COMPLETE"}
                showAdjustedStats={adjustedStatsEnabled}
              />
            ) : publicCard ? (
              <article className="mystery-current-card" style={teamThemeStyle(publicCard.team)}>
                <div className="mystery-card-topline">
                  <span>{mysteryPoolSourceLabel(publicCard.poolSource, game.settings)}</span>
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
                    <PositionChips
                      eligiblePositions={publicCard.eligiblePositions}
                      primaryPosition={publicCard.primaryPosition}
                    />
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
                    <button className="mystery-primary-button" type="submit">
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
                isLoading={loading}
                onNewRun={resetRun}
                onSpinNext={handleSpin}
                onViewResults={viewResults}
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
                  <h2>{game.status === "COMPLETE" ? "Roster Ready" : "Spin A Card"}</h2>
                </div>
                {game.status === "COMPLETE" ? (
                  <div className="mystery-final-score">
                    <span>{game.roster.length} acquired cards</span>
                  </div>
                ) : null}
                {game.status === "COMPLETE" ? (
                  <div className="mystery-complete-actions mystery-complete-actions-centered">
                    <button className="mystery-primary-button" type="button" onClick={viewResults}>
                      <Trophy size={18} />
                      View Results
                    </button>
                    <button className="mystery-secondary-button" type="button" onClick={resetRun}>
                      <RotateCcw size={18} />
                      New Run
                    </button>
                  </div>
                ) : (
                  <button
                    aria-disabled={!canSpin}
                    className="mystery-primary-button"
                    disabled={loading}
                    type="button"
                    onClick={handleSpin}
                  >
                    <RefreshCw size={18} />
                    {loading ? "Loading..." : "Spin Card"}
                  </button>
                )}
                {error ? <p className="mystery-validation">API error: {error}</p> : null}
              </article>
            )}

            {shouldShowMysteryTip ? <MysteryGameTipCard tip={activeTip} /> : null}

            {game.lastResult && !counterOfferResult ? (
              <section
                className={`mystery-reveal mystery-reveal-log mystery-reveal-${resultTypeClassName(game.lastResult.resultType)}`}
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
                    {game.lastResult.secondOffer !== null ? (
                      <span>Second Offer {formatMoney(game.lastResult.secondOffer)}</span>
                    ) : null}
                    {game.lastResult.wasSniped ? <span>+10% player score</span> : null}
                    {lastRevealDelta ? <span>{lastRevealDelta}</span> : null}
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
                <h2>{rosterViewMode === "roster" ? "Roster" : "Court"}</h2>
                <span>{slotsRemaining} slots left</span>
              </summary>
              <div className="mystery-view-toggle" aria-label="Roster panel view">
                <button
                  aria-pressed={rosterViewMode === "roster"}
                  className={rosterViewMode === "roster" ? "mystery-view-toggle-active" : ""}
                  type="button"
                  onClick={() => setRosterViewMode("roster")}
                >
                  <List size={16} />
                  Roster
                </button>
                <button
                  aria-pressed={rosterViewMode === "court"}
                  className={rosterViewMode === "court" ? "mystery-view-toggle-active" : ""}
                  type="button"
                  onClick={() => setRosterViewMode("court")}
                >
                  <Map size={16} />
                  Court
                </button>
              </div>
              {rosterViewMode === "roster" ? (
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
              ) : (
                <MysteryCourtView roster={game.roster} />
              )}
            </details>

          </aside>
        </div>
      </section>
      <MobileGameFooter
        className="mobile-game-footer-mystery"
        navItems={mysteryMobileFooterNavItems}
        slots={mysteryMobileFooterSlots}
      />
    </main>
  );
}
