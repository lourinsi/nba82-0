"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { teamThemeStyle } from "../all-time/teamStyles";
import {
  adjustedStatsSnapshot,
  colorModeSnapshot,
  subscribeToAdjustedStats,
  subscribeToColorMode,
} from "../clientPreferences";

type Position = "PG" | "SG" | "SF" | "PF" | "C";
export type ResultAchievement = {
  id: string;
  value: string;
  label: string;
  title?: string;
  scoreValue?: number;
};
type SeasonProjection = {
  score: number;
  wins: number;
  losses: number;
  tier: string;
  description: string;
};
type DraftSelection = {
  team: string;
  era?: string;
  eraLabel: string;
};
type PositionBonus = {
  multiplier: number;
  points: number;
};
type ResultPlayer = {
  position: Position;
  player: {
    id: string;
    name: string;
  };
  selection?: DraftSelection;
  scoreContribution?: number;
  achievements: ResultAchievement[];
  originalAchievements?: ResultAchievement[];
  adjustedAchievements?: ResultAchievement[];
  positionBonus?: PositionBonus;
};
type ResultPayload = {
  mode: string;
  selectedTeam: string;
  selectedEraLabel: string;
  resultModeLabel?: string;
  returnPath?: string;
  simulationResult: SeasonProjection;
  lineup: ResultPlayer[];
  totals: ResultAchievement[];
  originalTotals?: ResultAchievement[];
  adjustedTotals?: ResultAchievement[];
};
type ResultBadgeMeta = {
  symbol: string;
  variant: string;
  description: string;
};

type SeasonResultsConfig = {
  achievementTitleById: Record<string, string>;
  defaultModeLabel: string;
  defaultReturnPath: string;
  emptyButtonLabel: string;
  emptyTitle: string;
  expectedMode: string;
  hiddenAchievementIds?: readonly string[];
  resultBadgeMetaById?: Record<string, ResultBadgeMeta>;
  resultBadgeScoreWeightById?: Record<string, number>;
  showAdjustedStats?: boolean;
  storageKey: string;
};

function readStoredResult(storageKey: string, expectedMode: string) {
  try {
    const raw = sessionStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as ResultPayload;

    return payload.mode === expectedMode && payload.simulationResult && Array.isArray(payload.lineup)
      ? payload
      : null;
  } catch {
    return null;
  }
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

function formatLegacyScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatBoostPercent(multiplier: number) {
  return `${Math.round((multiplier - 1) * 100)}%`;
}

function achievementBadgeCount(value: string) {
  const trimmedValue = value.trim();
  const countMatch = /^(\d+(?:\.\d+)?)x$/i.exec(trimmedValue);

  if (!countMatch || Number(countMatch[1]) <= 1) {
    return null;
  }

  return trimmedValue;
}

function achievementBadgeCountNumber(value: string) {
  const trimmedValue = value.trim();
  const countMatch = /^(\d+(?:\.\d+)?)x$/i.exec(trimmedValue);

  return countMatch ? Number(countMatch[1]) : 1;
}

export default function SeasonResultsView({ config }: { config: SeasonResultsConfig }) {
  const router = useRouter();
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lightMode = useSyncExternalStore(subscribeToColorMode, colorModeSnapshot, () => false);
  const adjustedStatsEnabled = useSyncExternalStore(subscribeToAdjustedStats, adjustedStatsSnapshot, () => false);
  const pageClassName = `season-result-page ${lightMode ? "season-result-page-light" : "season-result-page-dark"}`;
  const hiddenAchievementIds = new Set(config.hiddenAchievementIds ?? []);
  const resultBadgeMetaById = config.resultBadgeMetaById ?? {};
  const resultBadgeScoreWeightById = config.resultBadgeScoreWeightById ?? {};
  const canShowBadges = Object.keys(resultBadgeMetaById).length > 0;

  function achievementTitle(achievement: ResultAchievement) {
    return (
      achievement.title ||
      config.achievementTitleById[achievement.id] ||
      `${achievement.label}: ${achievement.value}`
    );
  }

  function visibleAchievements(achievements: ResultAchievement[]) {
    return achievements.filter((achievement) => !hiddenAchievementIds.has(achievement.id));
  }

  function resultBadgeTooltip(achievement: ResultAchievement) {
    return `${achievement.value} ${resultBadgeMetaById[achievement.id]?.description ?? achievement.label}`;
  }

  function resultBadgeScore(achievement: ResultAchievement) {
    return typeof achievement.scoreValue === "number" && Number.isFinite(achievement.scoreValue)
      ? achievement.scoreValue
      : achievementBadgeCountNumber(achievement.value) * (resultBadgeScoreWeightById[achievement.id] ?? 0);
  }

  function prioritizeResultBadgeAchievements(achievements: ResultAchievement[]) {
    return [...achievements].sort((first, second) => {
      const priorityDelta = resultBadgeScore(second) - resultBadgeScore(first);

      if (priorityDelta) {
        return priorityDelta;
      }

      const countDelta = achievementBadgeCountNumber(second.value) - achievementBadgeCountNumber(first.value);

      if (countDelta) {
        return countDelta;
      }

      return achievementTitle(first).localeCompare(achievementTitle(second));
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPayload(readStoredResult(config.storageKey, config.expectedMode));
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [config.expectedMode, config.storageKey]);

  function goBack() {
    router.push(payload?.returnPath ?? config.defaultReturnPath);
  }

  function buildAnother() {
    const nextPath = payload?.returnPath ?? config.defaultReturnPath;

    sessionStorage.removeItem(config.storageKey);
    router.push(nextPath);
  }

  if (!loaded) {
    return <main className={pageClassName} />;
  }

  if (!payload) {
    return (
      <main className={pageClassName}>
        <div className="season-result-shell">
          <header className="season-result-header">
            <Link className="season-result-logo" href="/" aria-label="Go to home">
              82-0
            </Link>
            <h1>{config.emptyTitle}</h1>
          </header>

          <section className="season-result-empty">
            <p>No simulated season found.</p>
            <button type="button" onClick={goBack}>
              {config.emptyButtonLabel}
            </button>
          </section>
        </div>
      </main>
    );
  }

  const { lineup, selectedEraLabel, selectedTeam, simulationResult, totals } = payload;
  const canToggleStats =
    Boolean(config.showAdjustedStats) &&
    Boolean(payload.originalTotals?.length || payload.adjustedTotals?.length) &&
    lineup.some((entry) => entry.originalAchievements?.length || entry.adjustedAchievements?.length);
  const showAdjustedStats = canToggleStats && adjustedStatsEnabled;
  const displayTotals = visibleAchievements(
    showAdjustedStats ? payload.adjustedTotals ?? totals : payload.originalTotals ?? totals,
  );

  return (
    <main className={pageClassName}>
      <div className="season-result-shell">
        <header className="season-result-header">
          <Link className="season-result-logo" href="/" aria-label="Go to home">
            82-0
          </Link>
          <h1>Can you go 82-0?</h1>
        </header>

        <section className="season-result-card">
          <div className="season-result-hero">
            <div className="season-result-hero-top">
              <div className="season-result-record-block">
                <p className="season-result-mode">{payload.resultModeLabel ?? config.defaultModeLabel}</p>
                <p className="season-result-kicker">Projected Record</p>
                <p className="season-result-record">
                  {simulationResult.wins}
                  <span>-</span>
                  {simulationResult.losses}
                </p>
              </div>
              <div
                className="season-result-score-summary"
                aria-label={`Team points ${formatLegacyScore(simulationResult.score)}`}
              >
                <span>Team Pts</span>
                <strong>{formatLegacyScore(simulationResult.score)}</strong>
              </div>
            </div>
            <p className="season-result-tier">
              {simulationResult.tier} <span>{formatLegacyScore(simulationResult.score)} pts</span>
            </p>
          </div>

          <p className="season-result-description">{simulationResult.description}</p>
        </section>

        <div className="season-result-actions">
          <button
            className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.1]"
            type="button"
            onClick={goBack}
          >
            Back to Court
          </button>
          <button
            className="h-11 rounded-lg border border-[#ff8a2a]/45 bg-[#ff8a2a] px-4 text-sm font-black text-[#15171f] transition hover:bg-[#ffb13d]"
            type="button"
            onClick={buildAnother}
          >
            Build Another
          </button>
        </div>

        <section className="season-result-board">
          <div className="grid gap-3">
            {lineup.map((entry) => {
              const achievements = showAdjustedStats
                ? entry.adjustedAchievements ?? entry.achievements
                : entry.originalAchievements ?? entry.achievements;

              return (
                <ResultPlayerRow
                  key={entry.position}
                  achievements={achievements}
                  achievementTitle={achievementTitle}
                  canShowBadges={canShowBadges}
                  fallbackEraLabel={selectedEraLabel}
                  fallbackTeam={selectedTeam}
                  player={entry.player}
                  position={entry.position}
                  positionBonus={entry.positionBonus}
                  prioritizeResultBadgeAchievements={prioritizeResultBadgeAchievements}
                  resultBadgeMetaById={resultBadgeMetaById}
                  resultBadgeTooltip={resultBadgeTooltip}
                  scoreContribution={entry.scoreContribution}
                  selection={entry.selection}
                  visibleAchievements={visibleAchievements}
                />
              );
            })}
          </div>

          <div className="result-totals">
            <div className="result-totals-label">
              <span>Lineup Totals</span>
              <span>{displayTotals.length} categories</span>
            </div>
            <AchievementStrip achievements={displayTotals} achievementTitle={achievementTitle} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultPlayerRow({
  achievements,
  achievementTitle,
  canShowBadges,
  fallbackEraLabel,
  fallbackTeam,
  player,
  position,
  positionBonus,
  prioritizeResultBadgeAchievements,
  resultBadgeMetaById,
  resultBadgeTooltip,
  scoreContribution,
  selection,
  visibleAchievements,
}: {
  achievements: ResultAchievement[];
  achievementTitle: (achievement: ResultAchievement) => string;
  canShowBadges: boolean;
  fallbackEraLabel: string;
  fallbackTeam: string;
  player: { id: string; name: string };
  position: Position;
  positionBonus?: PositionBonus;
  prioritizeResultBadgeAchievements: (achievements: ResultAchievement[]) => ResultAchievement[];
  resultBadgeMetaById: Record<string, ResultBadgeMeta>;
  resultBadgeTooltip: (achievement: ResultAchievement) => string;
  scoreContribution?: number;
  selection?: DraftSelection;
  visibleAchievements: (achievements: ResultAchievement[]) => ResultAchievement[];
}) {
  const displaySelection = {
    team: selection?.team ?? fallbackTeam,
    eraLabel: selection?.eraLabel ?? fallbackEraLabel,
  };
  const positionBoost = positionBonus && positionBonus.points > 0 ? positionBonus : null;
  const contribution =
    typeof scoreContribution === "number" && Number.isFinite(scoreContribution) ? scoreContribution : null;
  const displayAchievements = visibleAchievements(achievements);
  const badgeAchievements = canShowBadges
    ? prioritizeResultBadgeAchievements(
        displayAchievements.filter((achievement) => resultBadgeMetaById[achievement.id]),
      )
    : [];
  const stripAchievements = canShowBadges
    ? displayAchievements.filter((achievement) => !resultBadgeMetaById[achievement.id])
    : displayAchievements;

  return (
    <div className="result-player-row" style={teamThemeStyle(displaySelection.team)}>
      {badgeAchievements.length || (canShowBadges && contribution !== null) ? (
        <ResultAccoladeBadges
          achievements={badgeAchievements}
          contribution={contribution}
          resultBadgeMetaById={resultBadgeMetaById}
          resultBadgeTooltip={resultBadgeTooltip}
        />
      ) : null}
      {positionBoost ? (
        <span
          aria-label={`Primary position fit bonus: ${formatBoostPercent(positionBoost.multiplier)}.`}
          className="result-position-boost"
          tabIndex={0}
        >
          <span>fit</span>
          <span>+{formatBoostPercent(positionBoost.multiplier)}</span>
          <span className="result-position-boost-tooltip" role="tooltip">
            Primary position fit bonus.
          </span>
        </span>
      ) : null}

      <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-4">
        <span className="result-player-token" aria-hidden="true">
          <span>{playerInitials(player.name)}</span>
          <span>{position}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-black text-white">{player.name}</span>
          <span className="result-player-meta mt-1 block truncate text-sm font-semibold">
            {displaySelection.team} - {displaySelection.eraLabel}
          </span>
          {!canShowBadges && contribution !== null ? (
            <span className="result-player-score">
              <span>{formatLegacyScore(contribution)}</span>
              <span>pts</span>
            </span>
          ) : null}
        </span>
      </div>

      {stripAchievements.length ? (
        <AchievementStrip achievements={stripAchievements} achievementTitle={achievementTitle} />
      ) : null}
    </div>
  );
}

function ResultAccoladeBadges({
  achievements,
  contribution,
  resultBadgeMetaById,
  resultBadgeTooltip,
}: {
  achievements: ResultAchievement[];
  contribution: number | null;
  resultBadgeMetaById: Record<string, ResultBadgeMeta>;
  resultBadgeTooltip: (achievement: ResultAchievement) => string;
}) {
  return (
    <span
      className="result-accolade-badges"
      aria-label={[
        ...achievements.map((item) => `${item.value} ${item.label}`),
        ...(contribution !== null ? [`${formatLegacyScore(contribution)} points`] : []),
      ].join(", ")}
    >
      {achievements.map((achievement) => {
        const badge = resultBadgeMetaById[achievement.id];
        const count = achievementBadgeCount(achievement.value);

        return (
          <span
            aria-label={`${achievement.value} ${achievement.label}. ${resultBadgeTooltip(achievement)}`}
            className={`result-award-badge court-achievement-badge court-achievement-badge-${badge.variant}`}
            data-tooltip={resultBadgeTooltip(achievement)}
            key={achievement.id}
            tabIndex={0}
          >
            <span className="court-achievement-badge-symbol" aria-hidden="true">
              {badge.symbol}
            </span>
            {count ? (
              <span className="court-achievement-badge-count" aria-hidden="true">
                {count}
              </span>
            ) : null}
          </span>
        );
      })}
      {contribution !== null ? (
        <span className="result-badge-score">
          <span>{formatLegacyScore(contribution)}</span>
          <span>pts</span>
        </span>
      ) : null}
    </span>
  );
}

function AchievementStrip({
  achievements,
  achievementTitle,
}: {
  achievements: ResultAchievement[];
  achievementTitle: (achievement: ResultAchievement) => string;
}) {
  if (achievements.length === 0) {
    return <span className="achievement-strip achievement-strip-empty" aria-hidden="true" />;
  }

  return (
    <span
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
