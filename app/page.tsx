"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_SESSION_CHANGE_EVENT } from "./clientPreferences";

const GAME_MODES = [
  {
    title: "Classic",
    status: "Playable",
    href: "/classic",
    description: "Build the best team that can go 82-0.",
    action: "Play Mode",
    adminOnly: false,
    enabled: true,
  },
  {
    title: "You Know Ball",
    status: "Playable",
    href: "/classic/you-know-ball",
    description: "Classic draft with accolade clues hidden.",
    action: "Play Mode",
    adminOnly: false,
    enabled: true,
  },
  {
    title: "All Time",
    status: "Playable",
    href: "/all-time",
    description: "Accolades only: no stat lines, just awards and career resume.",
    action: "Play Mode",
    adminOnly: false,
    enabled: true,
  },
  {
    title: "PER 100",
    status: "Playable",
    href: "/per-100",
    description: "Team-era stint scoring by per-100 production, TS+, and win-share split.",
    action: "Play Mode",
    adminOnly: false,
    enabled: true,
  },
  {
    title: "Legacy Engine",
    status: "Admin",
    href: "/legacy-engine",
    description: "Adjust accolade weights and the Pro-Peak curve.",
    action: "Open Engine",
    adminOnly: true,
    enabled: true,
  },
  {
    title: "Stats Engine",
    status: "Admin",
    href: "/stats-engine",
    description: "Adjust era-relative stats, TS%, and WS/48 weights.",
    action: "Open Engine",
    adminOnly: true,
    enabled: true,
  },
] as const;

async function fetchAdminSession() {
  const response = await fetch("/api/admin/session", { cache: "no-store" });
  const data = (await response.json()) as { admin?: boolean };

  return Boolean(data.admin);
}

export default function LandingPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncAdminSession() {
      try {
        const admin = await fetchAdminSession();

        if (active) {
          setIsAdmin(admin);
        }
      } catch {
        if (active) {
          setIsAdmin(false);
        }
      }
    }

    void syncAdminSession();
    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, syncAdminSession);

    return () => {
      active = false;
      window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, syncAdminSession);
    };
  }, []);

  const visibleModes = GAME_MODES.filter((mode) => !mode.adminOnly || isAdmin);

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
          {visibleModes.map((mode) =>
            mode.enabled ? (
              <Link className="mode-card mode-card-active" href={mode.href} key={mode.title}>
                <span className="mode-card-status">{mode.status}</span>
                <span className="mode-card-title">{mode.title}</span>
                <span className="mode-card-description">{mode.description}</span>
                <span className="mode-card-action">{mode.action}</span>
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
