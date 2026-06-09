"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Position = "PG" | "SG" | "SF" | "PF" | "C";
type Achievement = { id: string; value: string; label: string };
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

const ALL_TIME_RESULT_STORAGE_KEY = "nba82_all_time_result";

function playerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatLegacyScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function readStoredResult() {
  try {
    const raw = sessionStorage.getItem(ALL_TIME_RESULT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as AllTimeResultPayload;

    return payload.mode === "all-time" && payload.simulationResult && Array.isArray(payload.lineup) ? payload : null;
  } catch {
    return null;
  }
}

export default function AllTimeResultsPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<AllTimeResultPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPayload(readStoredResult());
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function goToAllTime() {
    router.push("/all-time");
  }

  function buildAnother() {
    sessionStorage.removeItem(ALL_TIME_RESULT_STORAGE_KEY);
    router.push("/all-time");
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
            <h1>All Time Results</h1>
          </header>

          <section className="season-result-empty">
            <p>No simulated season found.</p>
            <button type="button" onClick={goToAllTime}>
              Build All Time Team
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
            <p className="season-result-mode">All Time Mode</p>
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
            onClick={goToAllTime}
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
            {lineup.map((entry, index) => (
              <ResultPlayerRow
                key={entry.position}
                achievements={entry.achievements}
                eraLabel={selectedEraLabel}
                player={entry.player}
                position={entry.position}
                team={selectedTeam}
                toneIndex={index}
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
  eraLabel,
  player,
  position,
  team,
  toneIndex,
}: {
  achievements: Achievement[];
  eraLabel: string;
  player: { id: string; name: string };
  position: Position;
  team: string;
  toneIndex: number;
}) {
  return (
    <div className={`result-player-row result-player-row-${toneIndex % 5}`}>
      <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-4">
        <span className="result-player-token" aria-hidden="true">
          <span>{playerInitials(player.name)}</span>
          <span>{position}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-black text-white">{player.name}</span>
          <span className="mt-1 block truncate text-sm font-semibold text-[#cfd3df]">
            {team} - {eraLabel}
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
