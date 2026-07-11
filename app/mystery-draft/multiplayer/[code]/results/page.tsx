"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Home,
  Info,
  Medal,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { ApiError } from "../../../../apiClient";
import { setGameHeaderState } from "../../../../clientPreferences";
import {
  getMysteryMultiplayerResults,
  normalizeMysteryLobbyCode,
  type MultiplayerResultsPick,
  type MultiplayerProjectedRecord,
  type MultiplayerResultsResponse,
  type MultiplayerResultsRoster,
  type MultiplayerResultsStanding,
} from "../../../multiplayerClient";

function formatMoney(value: number | null | undefined) {
  const numeric = Number(value || 0);

  return `$${Math.round(numeric).toLocaleString()}`;
}

function formatScore(value: number | null | undefined) {
  const numeric = Number(value || 0);

  return numeric.toFixed(1);
}

function formatStat(value: number | null | undefined, digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatTs(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return (value > 1 ? value / 100 : value).toFixed(3);
}

function formatRecord(record: MultiplayerProjectedRecord | null | undefined) {
  return record ? `${record.wins}-${record.losses}` : "--";
}

function fallbackProjectedRecord(score: number | null | undefined): MultiplayerProjectedRecord {
  const numericScore = Number(score || 0);
  const tiers = [
    { minScore: 540, wins: 82 },
    { minScore: 500, wins: 78 },
    { minScore: 460, wins: 74 },
    { minScore: 410, wins: 68 },
    { minScore: 360, wins: 61 },
    { minScore: 310, wins: 56 },
    { minScore: 260, wins: 51 },
    { minScore: 210, wins: 46 },
    { minScore: 160, wins: 40 },
    { minScore: 110, wins: 34 },
    { minScore: 70, wins: 28 },
    { minScore: 40, wins: 20 },
    { minScore: 20, wins: 12 },
    { minScore: Number.NEGATIVE_INFINITY, wins: 4 },
  ];
  const tier = tiers.find((candidate) => numericScore >= candidate.minScore) ?? tiers[tiers.length - 1];
  const wins = Math.max(0, Math.min(82, tier.wins));

  return { losses: 82 - wins, wins };
}

function initialsForName(name: string) {
  const initials = name
    .split(/[\s_]+/)
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

function rankTone(rank: number | null | undefined) {
  if (rank === 1) {
    return "gold";
  }

  if (rank === 2) {
    return "silver";
  }

  if (rank === 3) {
    return "bronze";
  }

  return "standard";
}

function playerMeta(pick: MultiplayerResultsPick) {
  return [pick.team, pick.seasonLabel].filter(Boolean).join(" - ") || "Mystery season";
}

export default function MysteryMultiplayerResultsPage() {
  const params = useParams<{ code?: string }>();
  const router = useRouter();
  const code = normalizeMysteryLobbyCode(String(params.code || ""));
  const [results, setResults] = useState<MultiplayerResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showFullStats, setShowFullStats] = useState(false);
  const activeGamePath = `/mystery-draft/multiplayer/${encodeURIComponent(code)}`;

  useEffect(() => {
    setGameHeaderState({
      eyebrow: "Multiplayer Results",
      resetDisabled: false,
      resetLabel: "Back to Mystery Draft",
      showAdjustedStatsToggle: false,
      showReset: false,
      title: code || "Final Standings",
    });

    return () => setGameHeaderState(null);
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadResults() {
      if (!code) {
        setError("Results not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setRedirecting(false);
        setError(null);
        const nextResults = await getMysteryMultiplayerResults(code, controller.signal);

        if (cancelled) {
          return;
        }

        if (nextResults.game.status !== "completed") {
          setRedirecting(true);
          router.replace(activeGamePath);
          return;
        }

        setResults(nextResults);
      } catch (loadError) {
        if (cancelled || (loadError instanceof Error && loadError.name === "AbortError")) {
          return;
        }

        if (loadError instanceof ApiError && loadError.status === 409) {
          setRedirecting(true);
          router.replace(activeGamePath);
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Results not found.");
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeGamePath, code, loadAttempt, router]);

  const champion = results?.standings[0] ?? null;
  const orderedRosters = useMemo(() => {
    if (!results) {
      return [];
    }

    return [...results.rosters].sort((first, second) => {
      const firstRank = first.rank ?? Number.MAX_SAFE_INTEGER;
      const secondRank = second.rank ?? Number.MAX_SAFE_INTEGER;

      return firstRank - secondRank || second.totalScore - first.totalScore || first.name.localeCompare(second.name);
    });
  }, [results]);

  function playAgain() {
    router.push("/mystery-draft");
  }

  function goHome() {
    router.push("/");
  }

  if (loading || redirecting) {
    return (
      <main className="multiplayer-results-page">
        <section className="multiplayer-results-shell">
          <div className="multiplayer-results-state">
            <span className="multiplayer-results-spinner" aria-hidden="true" />
            <strong>{redirecting ? "Returning to the active game..." : "Loading results..."}</strong>
          </div>
        </section>
      </main>
    );
  }

  if (error || !results || !champion) {
    return (
      <main className="multiplayer-results-page">
        <section className="multiplayer-results-shell">
          <header className="multiplayer-results-header">
            <Link className="multiplayer-results-logo" href="/" aria-label="Go home">
              82-0
            </Link>
            <h1>Multiplayer Results</h1>
            <p>Final Standings</p>
          </header>
          <div className="multiplayer-results-state">
            <strong>{error || "Results not found."}</strong>
            <button
              className="multiplayer-results-action multiplayer-results-action-teal"
              type="button"
              onClick={() => setLoadAttempt((currentAttempt) => currentAttempt + 1)}
            >
              <RotateCcw size={18} />
              Retry
            </button>
            <button className="multiplayer-results-action multiplayer-results-action-secondary" type="button" onClick={playAgain}>
              <ArrowLeft size={18} />
              Back to Mystery Draft
            </button>
          </div>
        </section>
      </main>
    );
  }

  const playerCount = results.participants.length;

  return (
    <main className="multiplayer-results-page">
      <section className="multiplayer-results-shell">
        <header className="multiplayer-results-header">
          <Link className="multiplayer-results-logo" href="/" aria-label="Go home">
            82-0
          </Link>
          <h1>MULTIPLAYER RESULTS</h1>
          <p>FINAL STANDINGS</p>
          <div className="multiplayer-results-meta" aria-label="Results summary">
            <span>Lobby {results.lobby.code}</span>
            <span>{playerCount} players</span>
            <span>Completed</span>
          </div>
        </header>

        <ChampionBanner champion={champion} />

        <section className="multiplayer-roster-grid" aria-label="Participant rosters">
          {orderedRosters.map((roster) => {
            return (
              <RosterCard
                expanded={showFullStats}
                key={roster.participantId}
                roster={roster}
                onToggle={() => setShowFullStats((currentValue) => !currentValue)}
              />
            );
          })}
        </section>

        <p className="multiplayer-results-helper">
          <Info size={16} />
          <span>* TS% (True Shooting Percentage)</span>
        </p>

        <section className="multiplayer-results-actions" aria-label="Results actions">
          <button className="multiplayer-results-action multiplayer-results-action-teal" type="button" onClick={playAgain}>
            <RotateCcw size={20} />
            Play Again
          </button>
          <button className="multiplayer-results-action multiplayer-results-action-gold" type="button" onClick={goHome}>
            <Home size={20} />
            Go Home
          </button>
        </section>
      </section>
    </main>
  );
}

function ChampionBanner({
  champion,
}: {
  champion: MultiplayerResultsStanding;
}) {
  return (
    <section className="multiplayer-champion-banner" aria-label={`Champion ${champion.name}`}>
      <div className="multiplayer-champion-trophy" aria-hidden="true">
        <Trophy size={72} />
        <span>Champion</span>
      </div>

      <div className="multiplayer-champion-identity">
        <span className="multiplayer-champion-crown">
          <Crown size={40} />
        </span>
        <span className="multiplayer-avatar multiplayer-avatar-gold">{initialsForName(champion.name)}</span>
        <div>
          <span className="multiplayer-results-kicker">Champion</span>
          <h2>{champion.name}</h2>
          <span className="multiplayer-winner-badge">
            <Crown size={16} />
            #1 Winner
          </span>
        </div>
      </div>

      <div className="multiplayer-champion-stats" aria-label="Champion summary">
        <span>
          <small>Total Score</small>
          <strong>{formatScore(champion.totalScore)}</strong>
          <em>pts</em>
        </span>
        <span>
          <small>Budget Left</small>
          <strong>{formatMoney(champion.remainingBudget)}</strong>
        </span>
        <span>
          <small>Projected Record</small>
          <strong>{formatRecord(champion.projectedRecord ?? fallbackProjectedRecord(champion.totalScore))}</strong>
        </span>
      </div>
    </section>
  );
}

function RosterCard({
  expanded,
  onToggle,
  roster,
}: {
  expanded: boolean;
  onToggle: () => void;
  roster: MultiplayerResultsRoster;
}) {
  const tone = rankTone(roster.rank);
  const projectedRecord = roster.projectedRecord ?? fallbackProjectedRecord(roster.totalScore);

  return (
    <article className={`multiplayer-roster-card multiplayer-rank-${tone}`}>
      <header>
        <span className="multiplayer-rank-shield">
          <Medal size={20} />
          {roster.rank ? `#${roster.rank}` : "--"}
        </span>
        <span className={`multiplayer-avatar multiplayer-avatar-${tone}`}>{initialsForName(roster.name)}</span>
        <div>
          <strong>{roster.name}</strong>
        </div>
        <ResultMetric label="Total Score" value={formatScore(roster.totalScore)} sublabel="pts" />
        <ResultMetric label="Budget Left" value={formatMoney(roster.remainingBudget)} />
        <ResultMetric label="Projected Record" value={formatRecord(projectedRecord)} />
      </header>

      <div className="multiplayer-player-list">
        {roster.picks.length ? (
          roster.picks.map((pick, pickIndex) => (
            <RosterPlayerRow
              expanded={expanded}
              key={`${roster.participantId}-${pick.playerName}-${pickIndex}`}
              pick={pick}
            />
          ))
        ) : (
          <p>No drafted players.</p>
        )}
      </div>

      <button className="multiplayer-see-stats-button" type="button" aria-expanded={expanded} onClick={onToggle}>
        {expanded ? "See Less Stats" : "See More Stats"}
        <ChevronDown size={17} />
      </button>
    </article>
  );
}

function ResultMetric({
  label,
  sublabel,
  value,
}: {
  label: string;
  sublabel?: string;
  value: string;
}) {
  return (
    <span className="multiplayer-result-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      {sublabel ? <em>{sublabel}</em> : null}
    </span>
  );
}

function RosterPlayerRow({ expanded, pick }: { expanded: boolean; pick: MultiplayerResultsPick }) {
  const stats = pick.stats ?? {
    assists: null,
    points: null,
    pra: null,
    rebounds: null,
    tsStarPct: null,
    ws48: null,
  };
  const statItems = [
    { label: "PTS", value: formatStat(stats.points) },
    { label: "REB", value: formatStat(stats.rebounds) },
    { label: "AST", value: formatStat(stats.assists) },
    { label: "WS/48", value: formatStat(stats.ws48, 3) },
    { label: "TS*", value: formatTs(stats.tsStarPct) },
  ];

  return (
    <div className={`multiplayer-player-row ${expanded ? "multiplayer-player-row-expanded" : ""}`}>
      <span className="multiplayer-player-avatar">{initialsForName(pick.playerName)}</span>
      <span>
        <strong>{pick.playerName}</strong>
        <small>{playerMeta(pick)}</small>
      </span>
      <span className="multiplayer-player-score">
        <strong>{formatScore(pick.finalScore)}</strong>
        <small>pts</small>
        <em>{formatMoney(pick.paidAmount)}</em>
      </span>
      {expanded ? (
        <span className="multiplayer-player-statline multiplayer-player-statline-full">
          {statItems.map((item) => (
            <span key={item.label}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
