"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import {
  ADMIN_SESSION_CHANGE_EVENT,
  adjustedStatsSnapshot,
  colorModeSnapshot,
  dispatchAdminSessionChanged,
  gameHeaderStateSnapshot,
  howToTipsEnabledSnapshot,
  requestHowToOpen,
  requestGameHeaderAction,
  setStoredAdjustedStats,
  setHowToTipsEnabled,
  setStoredLightMode,
  subscribeToAdjustedStats,
  subscribeToColorMode,
  subscribeToGameHeaderState,
  subscribeToHowToState,
} from "./clientPreferences";
import HowToOverlay from "./HowToOverlay";
import {
  ALL_TIME_HOW_TO,
  CLASSIC_HOW_TO,
  HOME_HOW_TO,
  HOW_TO_STORAGE_KEYS,
  YOU_KNOW_BALL_HOW_TO,
  type HowToOverlayContent,
} from "./howToContent";

const GUIDE_STORAGE_KEYS = Object.values(HOW_TO_STORAGE_KEYS);

type RouteGuide = {
  content: HowToOverlayContent;
  storageKey: string;
};

const ROUTE_GUIDES: Record<string, RouteGuide> = {
  "/": {
    content: HOME_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.home,
  },
  "/all-time": {
    content: ALL_TIME_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.allTime,
  },
  "/classic": {
    content: CLASSIC_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.classic,
  },
  "/classic/you-know-ball": {
    content: YOU_KNOW_BALL_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.youKnowBall,
  },
};

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/all-time", label: "All Time" },
  { href: "/classic", label: "Classic" },
  { href: "/classic/you-know-ball", label: "You Know Ball" },
  { href: "/legacy-engine", label: "Legacy Engine" },
  { href: "/stats-engine", label: "Stats Engine" },
] as const;

function normalizePathname(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
}

function guideForPathname(pathname: string | null) {
  return ROUTE_GUIDES[normalizePathname(pathname)] ?? null;
}

async function fetchAdminSession() {
  const response = await fetch("/api/admin/session", { cache: "no-store" });
  const data = (await response.json()) as { admin?: boolean };

  return Boolean(data.admin);
}

export default function SiteControls() {
  const pathname = usePathname();
  const normalizedPathname = normalizePathname(pathname);
  const currentGuide = guideForPathname(pathname);
  const gameHeaderState = useSyncExternalStore(subscribeToGameHeaderState, gameHeaderStateSnapshot, () => null);
  const routeShowsAdjustedStatsToggle =
    normalizedPathname === "/classic" || normalizedPathname === "/classic/results";
  const showAdjustedStatsToggle =
    gameHeaderState?.showAdjustedStatsToggle ?? routeShowsAdjustedStatsToggle;
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const lightMode = useSyncExternalStore(subscribeToColorMode, colorModeSnapshot, () => false);
  const adjustedStats = useSyncExternalStore(subscribeToAdjustedStats, adjustedStatsSnapshot, () => true);
  const tipsEnabled = useSyncExternalStore(
    subscribeToHowToState,
    () => howToTipsEnabledSnapshot(GUIDE_STORAGE_KEYS),
    () => false,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("site-light-mode", lightMode);
  }, [lightMode]);

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
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    }

    function handleAdminSessionChange() {
      void syncAdminSession();
    }

    void syncAdminSession();
    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, handleAdminSessionChange);

    return () => {
      active = false;
      window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, handleAdminSessionChange);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !authPanelOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAuthPanelOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authPanelOpen, menuOpen]);

  function toggleLightMode() {
    setStoredLightMode(!lightMode);
  }

  function toggleAdjustedStats() {
    setStoredAdjustedStats(!adjustedStats);
  }

  function openCurrentGuide() {
    if (!currentGuide) {
      return;
    }

    requestHowToOpen(currentGuide.storageKey);
    setMenuOpen(false);
  }

  function toggleTips() {
    const nextTipsEnabled = !tipsEnabled;

    setHowToTipsEnabled(GUIDE_STORAGE_KEYS, nextTipsEnabled);

    if (nextTipsEnabled && currentGuide) {
      requestHowToOpen(currentGuide.storageKey);
    }
  }

  function openProfilePanel() {
    setAuthPanelOpen((open) => !open);
    setMenuOpen(false);
    setLoginError(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = (await response.json()) as { admin?: boolean; message?: string };

      if (!response.ok || !data.admin) {
        setLoginError(data.message ?? "Unable to sign in.");
        return;
      }

      setIsAdmin(true);
      setAuthPanelOpen(false);
      setLoginUsername("");
      setLoginPassword("");
      dispatchAdminSessionChanged();
    } catch {
      setLoginError("Unable to sign in right now.");
    } finally {
      setLoginPending(false);
    }
  }

  async function handleLogout() {
    setLoginPending(true);
    setLoginError(null);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAdmin(false);
      dispatchAdminSessionChanged();
    } catch {
      setLoginError("Unable to log out right now.");
    } finally {
      setLoginPending(false);
    }
  }

  return (
    <>
      <header className="site-topbar">
        <div className="site-topbar-inner">
          <div className="site-topbar-main">
            <Link className="site-topbar-logo" href="/" aria-label="Go to home">
              82-0
            </Link>
            {gameHeaderState ? (
              <span className="site-game-status" aria-label={`${gameHeaderState.eyebrow}: ${gameHeaderState.title}`}>
                <small>{gameHeaderState.eyebrow}</small>
                <strong>{gameHeaderState.title}</strong>
              </span>
            ) : null}
          </div>

          <div className="site-topbar-actions" aria-label="Site controls">
            {showAdjustedStatsToggle ? (
              <button
                aria-label={adjustedStats ? "Show original stats" : "Show adjusted stats"}
                aria-pressed={adjustedStats}
                className="site-adjusted-toggle-button"
                type="button"
                onClick={toggleAdjustedStats}
              >
                <span className="stats-toggle-switch site-adjusted-toggle-switch" aria-hidden="true">
                  <span className="stats-toggle-knob" />
                </span>
                <span className="site-adjusted-toggle-copy">
                  <span>Adjusted</span>
                  <small>{adjustedStats ? "On" : "Off"}</small>
                </span>
              </button>
            ) : null}
            <button
              aria-label={lightMode ? "Use dark mode" : "Use light mode"}
              aria-pressed={lightMode}
              className="site-control-button"
              type="button"
              onClick={toggleLightMode}
            >
              <IconSun />
            </button>
            {gameHeaderState?.showReset ? (
              <button
                aria-label={gameHeaderState.resetLabel}
                className="site-control-button site-reset-button"
                disabled={gameHeaderState.resetDisabled}
                type="button"
                onClick={() => requestGameHeaderAction("reset")}
              >
                <IconReset />
              </button>
            ) : null}
            <button
              aria-controls="site-menu"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="site-control-button"
              type="button"
              onClick={() => {
                setMenuOpen(true);
                setAuthPanelOpen(false);
              }}
            >
              <IconMenu />
            </button>
            <button
              aria-controls="site-profile-panel"
              aria-expanded={authPanelOpen}
              aria-label={isAdmin ? "Open profile" : "Open login"}
              className="site-control-button"
              disabled={!authChecked}
              type="button"
              onClick={openProfilePanel}
            >
              <IconProfile />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="site-menu-layer" id="site-menu">
          <button
            aria-label="Close menu"
            className="site-menu-backdrop"
            type="button"
            onClick={() => setMenuOpen(false)}
          />
          <aside aria-label="Menu" className="site-menu-panel">
            <header className="site-menu-header">
              <h2>Menu</h2>
              <button
                aria-label="Close menu"
                className="site-menu-close"
                type="button"
                onClick={() => setMenuOpen(false)}
              >
                <IconClose />
              </button>
            </header>

            <nav className="site-menu-list" aria-label="Primary">
              {MENU_LINKS.map((link) => (
                <Link
                  className="site-menu-item"
                  href={link.href}
                  key={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            <section className="site-menu-section" aria-labelledby="site-settings-title">
              <h3 id="site-settings-title">Settings</h3>
              {currentGuide ? (
                <button className="site-menu-item" type="button" onClick={openCurrentGuide}>
                  <IconBook />
                  <span>How to Play</span>
                </button>
              ) : null}
              <button
                aria-pressed={tipsEnabled}
                className="site-menu-item site-menu-toggle-item"
                type="button"
                onClick={toggleTips}
              >
                <IconSettings />
                <span className="site-menu-toggle-copy">
                  <span>Tips</span>
                  <small>{tipsEnabled ? "On" : "Off"}</small>
                </span>
                <span className="stats-toggle-switch site-menu-toggle-switch" aria-hidden="true">
                  <span className="stats-toggle-knob" />
                </span>
              </button>
            </section>
          </aside>
        </div>
      ) : null}

      {authPanelOpen ? (
        <section className="site-auth-popover" id="site-profile-panel" aria-label="Profile">
          <header className="site-auth-header">
            <h2>{isAdmin ? "Profile" : "Login"}</h2>
            <button
              aria-label="Close profile"
              className="site-menu-close"
              type="button"
              onClick={() => setAuthPanelOpen(false)}
            >
              <IconClose />
            </button>
          </header>

          {isAdmin ? (
            <div className="site-auth-body">
              <p>Signed in as admin.</p>
              {loginError ? <p className="site-auth-error">{loginError}</p> : null}
              <button className="site-auth-submit" disabled={loginPending} type="button" onClick={handleLogout}>
                {loginPending ? "Logging Out..." : "Log Out"}
              </button>
            </div>
          ) : (
            <form className="site-auth-body" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete="current-password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>
              {loginError ? <p className="site-auth-error">{loginError}</p> : null}
              <button className="site-auth-submit" disabled={loginPending} type="submit">
                {loginPending ? "Signing In..." : "Sign In"}
              </button>
            </form>
          )}
        </section>
      ) : null}

      {currentGuide ? (
        <HowToOverlay
          key={currentGuide.storageKey}
          content={currentGuide.content}
          storageKey={currentGuide.storageKey}
        />
      ) : null}
    </>
  );
}

function IconSun() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconReset() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <path d="M3 8V3h5" />
      <path d="M3.8 13a8.2 8.2 0 1 0 2.4-5.8L3 10.4" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16M8 7h8" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </svg>
  );
}
