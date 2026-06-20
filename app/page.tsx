import Link from "next/link";

const GAME_MODES = [
  {
    title: "All Time",
    status: "Playable",
    href: "/all-time",
    description: "Build a five-man lineup from every era and chase the perfect season.",
    enabled: true,
  },
  {
    title: "Legacy Engine",
    status: "Simulator",
    href: "/legacy-engine",
    description: "Tune accolade weights and the Pro-Peak curve in real time.",
    enabled: true,
  },
  {
    title: "Stats Engine",
    status: "Simulator",
    href: "/stats-engine",
    description: "Tune era-relative stats, TS hybrid, and WS/48 multipliers.",
    enabled: true,
  },
  {
    title: "Classic",
    status: "Playable",
    href: "/classic",
    description: "The streamlined 82-0 draft format.",
    enabled: true,
  },
  {
    title: "You Know Ball",
    status: "Coming Soon",
    description: "Classic mode with the accolade clues hidden.",
    enabled: false,
  },
] as const;

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-shell">
        <header className="landing-header">
          <Link className="season-result-logo" href="/" aria-label="Go to home">
            82-0
          </Link>
          <h1>Can you go 82-0?</h1>
        </header>

        <div className="mode-grid">
          {GAME_MODES.map((mode) =>
            mode.enabled ? (
              <Link className="mode-card mode-card-active" href={mode.href} key={mode.title}>
                <span className="mode-card-status">{mode.status}</span>
                <span className="mode-card-title">{mode.title}</span>
                <span className="mode-card-description">{mode.description}</span>
                <span className="mode-card-action">Play Mode</span>
              </Link>
            ) : (
              <div aria-disabled="true" className="mode-card mode-card-disabled" key={mode.title}>
                <span className="mode-card-status">{mode.status}</span>
                <span className="mode-card-title">{mode.title}</span>
                <span className="mode-card-description">{mode.description}</span>
                <span className="mode-card-action">Locked</span>
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
