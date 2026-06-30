"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { Moon, RotateCcw, Sun } from "lucide-react";
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
  MYSTERY_DRAFT_HOW_TO,
  PER_100_HOW_TO,
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
  "/per-100": {
    content: PER_100_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.per100,
  },
  "/mystery-draft": {
    content: MYSTERY_DRAFT_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.mysteryDraft,
  },
  "/classic/you-know-ball": {
    content: YOU_KNOW_BALL_HOW_TO,
    storageKey: HOW_TO_STORAGE_KEYS.youKnowBall,
  },
};

const MENU_LINKS = [
  { href: "/", label: "Home", adminOnly: false },
  { href: "/classic", label: "Classic", adminOnly: false },
  { href: "/classic/you-know-ball", label: "You Know Ball", adminOnly: false },
  { href: "/all-time", label: "All Time", adminOnly: false },
  { href: "/per-100", label: "PER 100", adminOnly: false },
  { href: "/mystery-draft", label: "Mystery Draft", adminOnly: false },
  { href: "/legacy-engine", label: "Legacy Engine", adminOnly: true },
  { href: "/stats-engine", label: "Stats Engine", adminOnly: true },
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

function normalizeEraInput(value: string) {
  const compactValue = value.trim().toLowerCase().replace(/[^0-9a-z]/g, "");

  if (/^\d{4}s?$/.test(compactValue)) {
    return `${compactValue.slice(2, 4)}'s`;
  }

  if (/^\d{2}s?$/.test(compactValue)) {
    return `${compactValue.slice(0, 2)}'s`;
  }

  return value.trim().replace(/[’`]/g, "'");
}

function resolveOption(value: string, options: readonly string[]) {
  const normalizedValue = normalizeEraInput(value).toLowerCase();

  return options.find((option) => option.toLowerCase() === normalizedValue) ?? null;
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
    normalizedPathname === "/classic" ||
    normalizedPathname === "/classic/results" ||
    normalizedPathname === "/per-100" ||
    normalizedPathname === "/per-100/results";
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
  const [openAdminPicker, setOpenAdminPicker] = useState<"team" | "era" | null>(null);
  const lightMode = useSyncExternalStore(subscribeToColorMode, colorModeSnapshot, () => false);
  const adjustedStats = useSyncExternalStore(subscribeToAdjustedStats, adjustedStatsSnapshot, () => false);
  const tipsEnabled = useSyncExternalStore(
    subscribeToHowToState,
    () => howToTipsEnabledSnapshot(GUIDE_STORAGE_KEYS),
    () => false,
  );
  const visibleMenuLinks = MENU_LINKS.filter((link) => !link.adminOnly || isAdmin);
  const adminSelection = gameHeaderState?.adminSelection;

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
    if (!menuOpen && !authPanelOpen && !openAdminPicker) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAuthPanelOpen(false);
        setOpenAdminPicker(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authPanelOpen, menuOpen, openAdminPicker]);

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

  function resolveTeam(value: string) {
    const normalizedTeam = value.trim().toUpperCase();

    return adminSelection?.teamOptions.find((team) => team === normalizedTeam) ?? null;
  }

  function resolveEra(value: string) {
    return adminSelection ? resolveOption(value, adminSelection.eraOptions) : null;
  }

  function commitAdminTeam(value: string) {
    if (!adminSelection) {
      return "";
    }

    const team = resolveTeam(value);

    if (team) {
      requestGameHeaderAction("set-admin-team", team);
      return team;
    }

    return adminSelection.team;
  }

  function commitAdminEra(value: string) {
    if (!adminSelection) {
      return "";
    }

    const era = resolveEra(value);

    if (era) {
      requestGameHeaderAction("set-admin-era", era);
      return era;
    }

    return adminSelection.era;
  }

  function selectAdminTeam(team: string) {
    requestGameHeaderAction("set-admin-team", team);
    setOpenAdminPicker(null);
  }

  function selectAdminEra(era: string) {
    requestGameHeaderAction("set-admin-era", era);
    setOpenAdminPicker(null);
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
            {adminSelection ? (
              <form
                className="site-admin-picker"
                aria-label="Admin roster selection"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setOpenAdminPicker(null);
                  }
                }}
                onSubmit={(event) => event.preventDefault()}
              >
                <label
                  className={`site-admin-picker-field ${openAdminPicker === "team" ? "site-admin-picker-field-open" : ""}`}
                >
                  <span>Team</span>
                  <input
                    aria-label="Admin team"
                    aria-autocomplete="list"
                    aria-controls="site-admin-team-options"
                    aria-expanded={openAdminPicker === "team"}
                    autoComplete="off"
                    defaultValue={adminSelection.team}
                    disabled={gameHeaderState?.resetDisabled}
                    key={`admin-team-${adminSelection.team}`}
                    maxLength={3}
                    role="combobox"
                    onBlur={(event) => {
                      event.currentTarget.value = commitAdminTeam(event.currentTarget.value);
                    }}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value.toUpperCase();
                      event.currentTarget.value = nextValue;

                      const team = resolveTeam(nextValue);

                      if (team) {
                        requestGameHeaderAction("set-admin-team", team);
                        event.currentTarget.value = team;
                        setOpenAdminPicker(null);
                      }
                    }}
                    onClick={() => setOpenAdminPicker("team")}
                    onFocus={() => setOpenAdminPicker("team")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.value = commitAdminTeam(event.currentTarget.value);
                        setOpenAdminPicker(null);
                      }
                    }}
                  />
                  {openAdminPicker === "team" ? (
                    <div
                      className="site-admin-picker-menu site-admin-picker-menu-team"
                      id="site-admin-team-options"
                      role="listbox"
                    >
                      {adminSelection.teamOptions.map((team) => (
                        <button
                          aria-selected={team === adminSelection.team}
                          className="site-admin-picker-option"
                          key={team}
                          role="option"
                          type="button"
                          onClick={() => selectAdminTeam(team)}
                          onMouseDown={(event) => event.preventDefault()}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label
                  className={`site-admin-picker-field ${openAdminPicker === "era" ? "site-admin-picker-field-open" : ""}`}
                >
                  <span>Era</span>
                  <input
                    aria-label="Admin era"
                    aria-autocomplete="list"
                    aria-controls="site-admin-era-options"
                    aria-expanded={openAdminPicker === "era"}
                    autoComplete="off"
                    defaultValue={adminSelection.era}
                    disabled={gameHeaderState?.resetDisabled}
                    key={`admin-era-${adminSelection.era}`}
                    role="combobox"
                    onBlur={(event) => {
                      event.currentTarget.value = commitAdminEra(event.currentTarget.value);
                    }}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value;
                      const era = resolveEra(nextValue);

                      if (era) {
                        requestGameHeaderAction("set-admin-era", era);
                        event.currentTarget.value = era;
                        setOpenAdminPicker(null);
                      }
                    }}
                    onClick={() => setOpenAdminPicker("era")}
                    onFocus={() => setOpenAdminPicker("era")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.value = commitAdminEra(event.currentTarget.value);
                        setOpenAdminPicker(null);
                      }
                    }}
                  />
                  {openAdminPicker === "era" ? (
                    <div
                      className="site-admin-picker-menu site-admin-picker-menu-era"
                      id="site-admin-era-options"
                      role="listbox"
                    >
                      {adminSelection.eraOptions.map((era) => (
                        <button
                          aria-selected={era === adminSelection.era}
                          className="site-admin-picker-option"
                          key={era}
                          role="option"
                          type="button"
                          onClick={() => selectAdminEra(era)}
                          onMouseDown={(event) => event.preventDefault()}
                        >
                          {era}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
              </form>
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
              {lightMode ? <Sun className="site-icon" /> : <Moon className="site-icon" />}
            </button>
            {gameHeaderState?.showReset ? (
              <button
                aria-label={gameHeaderState.resetLabel}
                className="site-control-button site-reset-button"
                disabled={gameHeaderState.resetDisabled}
                type="button"
                onClick={() => requestGameHeaderAction("reset")}
              >
                <RotateCcw />
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
              {visibleMenuLinks.map((link) => (
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

function IconMenu() {
  return (
    <svg aria-hidden="true" className="site-icon" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
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
