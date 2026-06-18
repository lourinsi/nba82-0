"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { teamThemeStyle } from "../../all-time/teamStyles";

type Position = "PG" | "SG" | "SF" | "PF" | "C";
type Achievement = { id: string; value: string; label: string };
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
  achievements: Achievement[];
  positionBonus?: PositionBonus;
};
type ClassicResultPayload = {
  mode: "classic";
  selectedTeam: string;
  selectedEraLabel: string;
  simulationResult: SeasonProjection;
  lineup: ResultPlayer[];
  totals: Achievement[];
};

const CLASSIC_RESULT_STORAGE_KEY = "nba82_classic_result";

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

function readStoredResult() {
  try {
    const raw = sessionStorage.getItem(CLASSIC_RESULT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as ClassicResultPayload;

    return payload.mode === "classic" && payload.simulationResult && Array.isArray(payload.lineup) ? payload : null;
  } catch {
    return null;
  }
}

export default function ClassicResultsPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ClassicResultPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPayload(readStoredResult());
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function goToClassic() {
    router.push("/classic");
  }

  function buildAnother() {
    sessionStorage.removeItem(CLASSIC_RESULT_STORAGE_KEY);
    router.push("/classic");
  }

  if (!loaded) {
    return <main className="season-result-page" />;
  }

  if (!payload) {
    return (
      <main className="season-result-page">
        <div className="season-result-shell">
          <header className="season-result-header">
            <div className="season-result-logo" aria-hidden="true">
              82-0
            </div>
            <h1>Classic Results</h1>
          </header>

          <section className="season-result-empty">
            <p>No simulated season found.</p>
            <button type="button" onClick={goToClassic}>
              Build Classic Team
            </button>
          </section>
        </div>
      </main>
    );
  }

  const { lineup, selectedEraLabel, selectedTeam, simulationResult, totals } = payload;

  return (
    <main className="season-result-page">
      <div className="season-result-shell">
        <header className="season-result-header">
          <div className="season-result-logo" aria-hidden="true">
            82-0
          </div>
          <h1>Can you go 82-0?</h1>
        </header>

        <section className="season-result-card">
          <div className="season-result-hero">
            <p className="season-result-mode">Classic Mode</p>
            <p className="season-result-kicker">Projected Record</p>
            <p className="season-result-record">
              {simulationResult.wins}
              <span>-</span>
              {simulationResult.losses}
            </p>
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
            onClick={goToClassic}
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
            {lineup.map((entry) => (
              <ResultPlayerRow
                key={entry.position}
                achievements={entry.achievements}
                fallbackEraLabel={selectedEraLabel}
                fallbackTeam={selectedTeam}
                player={entry.player}
                position={entry.position}
                positionBonus={entry.positionBonus}
                selection={entry.selection}
              />
            ))}
          </div>

          <div className="result-totals">
            <div className="result-totals-label">
              <span>Lineup Totals</span>
              <span>{totals.length} categories</span>
            </div>
            <AchievementStrip achievements={totals} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultPlayerRow({
  achievements,
  fallbackEraLabel,
  fallbackTeam,
  player,
  position,
  positionBonus,
  selection,
}: {
  achievements: Achievement[];
  fallbackEraLabel: string;
  fallbackTeam: string;
  player: { id: string; name: string };
  position: Position;
  positionBonus?: PositionBonus;
  selection?: DraftSelection;
}) {
  const displaySelection = {
    team: selection?.team ?? fallbackTeam,
    eraLabel: selection?.eraLabel ?? fallbackEraLabel,
  };
  const positionBoost = positionBonus && positionBonus.points > 0 ? positionBonus : null;

  return (
    <div className="result-player-row" style={teamThemeStyle(displaySelection.team)}>
      {positionBoost ? (
        <span
          aria-label="This player plays his primary position."
          className="result-position-boost"
          tabIndex={0}
        >
          {formatBoostPercent(positionBoost.multiplier)} boost
          <span className="result-position-boost-tooltip" role="tooltip">
            This player plays his primary position.
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
        </span>
      </div>

      <AchievementStrip achievements={achievements} />
    </div>
  );
}

function AchievementStrip({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) {
    return <span className="achievement-strip achievement-strip-empty" aria-hidden="true" />;
  }

  return (
    <span className="achievement-strip flex overflow-x-auto whitespace-nowrap pb-1 min-w-0" aria-label={achievements.map((item) => `${item.value} ${item.label}`).join(", ")}>
      {achievements.map((achievement) => (
        <span className="achievement-stat flex-shrink-0" key={achievement.id}>
          <span className="achievement-value">{achievement.value}</span>
          <span className="achievement-label">{achievement.label}</span>
        </span>
      ))}
    </span>
  );
}
