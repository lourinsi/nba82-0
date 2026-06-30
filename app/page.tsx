"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_SESSION_CHANGE_EVENT } from "./clientPreferences";

const PLAYABLE_GAMES = [
  {
    title: "CLASSIC",
    status: "Playable",
    href: "/classic",
    description: "Build the best team that can go 82-0.",
    action: "Play Mode",
    enabled: true,
  },
  {
    title: "YOU KNOW BALL",
    status: "Playable",
    href: "/classic/you-know-ball",
    description: "Classic draft with accolade clues hidden.",
    action: "Play Mode",
    enabled: true,
  },
  {
    title: "ALL TIME",
    status: "Playable",
    href: "/all-time",
    description: "Accolades only: no stat lines, just awards and career resume.",
    action: "Play Mode",
    enabled: true,
  },
  {
    title: "PER 100",
    status: "Playable",
    href: "/per-100",
    description: "Team-era stint scoring by per-100 production, TS+, and win-share split.",
    action: "Play Mode",
    enabled: true,
  },
  {
    title: "MYSTERY DRAFT",
    status: "Playable",
    href: "/mystery-draft",
    description: "Solo salary bidding on hidden Per 100 season cards.",
    action: "Play Mode",
    enabled: true,
  },
] as const;

const ADMIN_GAMES = [
  {
    title: "LEGACY ENGINE",
    status: "Admin",
    href: "/legacy-engine",
    description: "Adjust accolade weights and the Pro-Peak curve.",
    action: "Open Engine",
    enabled: true,
  },
  {
    title: "STATS ENGINE",
    status: "Admin",
    href: "/stats-engine",
    description: "Adjust era-relative stats, TS%, and WS/48 weights.",
    action: "Open Engine",
    enabled: true,
  },
] as const;

function ModeCardContent({ mode }: { mode: (typeof PLAYABLE_GAMES | typeof ADMIN_GAMES)[number] }) {
  return (
    <>
      <span className="mode-card-status">{mode.status}</span>
      <span className="mode-card-title">{mode.title}</span>
      <span className="mode-card-description">{mode.description}</span>
      <span className="mode-card-action">{mode.enabled ? mode.action : "Locked"}</span>
    </>
  );
}

async function fetchAdminSession() {
  const response = await fetch("/api/admin/session", { cache: "no-store" });
  const data = (await response.json()) as { admin?: boolean };

  return Boolean(data.admin);
}

export default function LandingPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeIndex, setActiveIndex] = useState(3);

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

  function getCarouselOffset(index: number) {
    let offset = index - activeIndex;
    const halfwayPoint = PLAYABLE_GAMES.length / 2;

    if (offset > halfwayPoint) {
      offset -= PLAYABLE_GAMES.length;
    }

    if (offset < -halfwayPoint) {
      offset += PLAYABLE_GAMES.length;
    }

    return offset;
  }

  function getCarouselCardStyle(index: number) {
    const offset = getCarouselOffset(index);
    const absoluteOffset = Math.abs(offset);
    const translateX = offset * 260;
    const rotateY = offset * -12;
    const scale = absoluteOffset === 0 ? 1 : absoluteOffset === 1 ? 0.9 : 0.75;

    return {
      opacity: absoluteOffset === 0 ? 1 : absoluteOffset === 1 ? 0.6 : 0.38,
      transform: `translateX(calc(-50% + ${translateX}px)) rotateY(${rotateY}deg) scale(${scale})`,
      transition: "all 500ms ease-out",
      zIndex: 20 - absoluteOffset,
    };
  }

  return (
    <main className="landing-page">
      <section className="landing-shell">
        <header className="landing-header">
          <Link className="season-result-logo" href="/" aria-label="Go to home">
            82-0
          </Link>
          <h1>Can you go 82-0?</h1>
        </header>

        <div className="relative mx-auto h-[292px] w-full overflow-visible [perspective:1100px] sm:h-[320px]">
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {PLAYABLE_GAMES.map((mode, index) => {
              const active = index === activeIndex;

              return mode.enabled ? (
                <Link
                  aria-current={active ? "true" : undefined}
                  className={`mode-card mode-card-active absolute left-1/2 top-4 w-[min(84vw,330px)] origin-center select-none !transition-all !duration-500 !ease-out [backface-visibility:hidden] ${
                    active ? "!border-blue-400 !shadow-[0_0_30px_rgba(59,130,246,0.5)]" : ""
                  }`}
                  href={mode.href}
                  key={mode.title}
                  onClick={(event) => {
                    if (!active) {
                      event.preventDefault();
                      setActiveIndex(index);
                    }
                  }}
                  style={getCarouselCardStyle(index)}
                >
                  <ModeCardContent mode={mode} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="mode-card mode-card-disabled absolute left-1/2 top-4 w-[min(84vw,330px)] origin-center select-none !transition-all !duration-500 !ease-out [backface-visibility:hidden]"
                  key={mode.title}
                  style={getCarouselCardStyle(index)}
                >
                  <ModeCardContent mode={mode} />
                </div>
              );
            })}
          </div>
        </div>

        <div aria-label="Select a game mode" className="mt-5 flex items-center justify-center gap-3">
          {PLAYABLE_GAMES.map((mode, index) => (
            <button
              aria-label={`Select ${mode.title}`}
              aria-pressed={index === activeIndex}
              className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                index === activeIndex ? "bg-blue-500" : "bg-slate-300/70 hover:bg-slate-200"
              }`}
              key={mode.title}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>

        {isAdmin ? (
          <section aria-label="Admin tools" className="mx-auto mt-12 w-full max-w-3xl border-t border-slate-400/30 pt-8">
            <div className="grid gap-4 md:grid-cols-2">
              {ADMIN_GAMES.map((mode) =>
                mode.enabled ? (
                  <Link
                    className="mode-card mode-card-active !transition-[background-color,border-color,box-shadow] hover:!transform-none"
                    href={mode.href}
                    key={mode.title}
                  >
                    <ModeCardContent mode={mode} />
                  </Link>
                ) : (
                  <div aria-disabled="true" className="mode-card mode-card-disabled" key={mode.title}>
                    <ModeCardContent mode={mode} />
                  </div>
                ),
              )}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
