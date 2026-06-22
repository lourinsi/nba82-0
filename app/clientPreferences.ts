export const ADMIN_SESSION_CHANGE_EVENT = "nba82-admin-session-change";
export const COLOR_MODE_STORAGE_KEY = "nba82-color-mode";
export const COLOR_MODE_CHANGE_EVENT = "nba82-color-mode-change";
export const ADJUSTED_STATS_STORAGE_KEY = "nba82-adjusted-stats";
export const ADJUSTED_STATS_CHANGE_EVENT = "nba82-adjusted-stats-change";
export const GAME_HEADER_STATE_CHANGE_EVENT = "nba82-game-header-state-change";
export const GAME_HEADER_ACTION_EVENT = "nba82-game-header-action";
export const HOW_TO_STORAGE_CHANGE_EVENT = "nba82-how-to-storage-change";
export const HOW_TO_OPEN_EVENT = "nba82-how-to-open";

const HOW_TO_DISMISSED_VALUE = "dismissed";
const howToSeenThisPageLoad = new Set<string>();
export type GameHeaderAction = "reset";
export type GameHeaderState = {
  eyebrow: string;
  resetDisabled: boolean;
  resetLabel: string;
  showAdjustedStatsToggle: boolean;
  showReset: boolean;
  title: string;
};

let currentGameHeaderState: GameHeaderState | null = null;

function dispatchWindowEvent(eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}

export function subscribeToColorMode(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(COLOR_MODE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(COLOR_MODE_CHANGE_EVENT, onStoreChange);
  };
}

export function colorModeSnapshot() {
  try {
    return window.localStorage.getItem(COLOR_MODE_STORAGE_KEY) === "light";
  } catch {
    return false;
  }
}

export function setStoredLightMode(lightMode: boolean) {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, lightMode ? "light" : "dark");
  } catch {
    // Storage restrictions should not block the in-page event sync.
  }

  dispatchWindowEvent(COLOR_MODE_CHANGE_EVENT);
}

export function subscribeToAdjustedStats(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ADJUSTED_STATS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ADJUSTED_STATS_CHANGE_EVENT, onStoreChange);
  };
}

export function adjustedStatsSnapshot() {
  try {
    return window.localStorage.getItem(ADJUSTED_STATS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setStoredAdjustedStats(adjustedStats: boolean) {
  try {
    window.localStorage.setItem(ADJUSTED_STATS_STORAGE_KEY, adjustedStats ? "on" : "off");
  } catch {
    // Storage restrictions should not block the in-page event sync.
  }

  dispatchWindowEvent(ADJUSTED_STATS_CHANGE_EVENT);
}

export function subscribeToGameHeaderState(onStoreChange: () => void) {
  window.addEventListener(GAME_HEADER_STATE_CHANGE_EVENT, onStoreChange);

  return () => window.removeEventListener(GAME_HEADER_STATE_CHANGE_EVENT, onStoreChange);
}

export function gameHeaderStateSnapshot() {
  return currentGameHeaderState;
}

export function setGameHeaderState(state: GameHeaderState | null) {
  currentGameHeaderState = state;
  dispatchWindowEvent(GAME_HEADER_STATE_CHANGE_EVENT);
}

export function requestGameHeaderAction(action: GameHeaderAction) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(GAME_HEADER_ACTION_EVENT, { detail: { action } }));
}

export function subscribeToGameHeaderAction(onAction: (action: GameHeaderAction) => void) {
  function handleAction(event: Event) {
    const detail = event instanceof CustomEvent ? (event.detail as { action?: unknown }) : null;

    if (detail?.action === "reset") {
      onAction(detail.action);
    }
  }

  window.addEventListener(GAME_HEADER_ACTION_EVENT, handleAction);

  return () => window.removeEventListener(GAME_HEADER_ACTION_EVENT, handleAction);
}

export function subscribeToHowToState(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(HOW_TO_STORAGE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(HOW_TO_STORAGE_CHANGE_EVENT, onStoreChange);
  };
}

export function isHowToDismissed(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === HOW_TO_DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export function setHowToDismissed(storageKey: string, dismissed: boolean) {
  try {
    if (dismissed) {
      window.localStorage.setItem(storageKey, HOW_TO_DISMISSED_VALUE);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage restrictions; the overlay can still close in memory.
  }

  dispatchWindowEvent(HOW_TO_STORAGE_CHANGE_EVENT);
}

export function hasHowToBeenSeenThisPageLoad(storageKey: string) {
  return howToSeenThisPageLoad.has(storageKey);
}

export function markHowToSeenThisPageLoad(storageKey: string) {
  howToSeenThisPageLoad.add(storageKey);
  dispatchWindowEvent(HOW_TO_STORAGE_CHANGE_EVENT);
}

export function clearHowToSeenThisPageLoad(storageKeys?: string | readonly string[]) {
  if (!storageKeys) {
    howToSeenThisPageLoad.clear();
  } else if (typeof storageKeys === "string") {
    howToSeenThisPageLoad.delete(storageKeys);
  } else {
    storageKeys.forEach((storageKey) => howToSeenThisPageLoad.delete(storageKey));
  }

  dispatchWindowEvent(HOW_TO_STORAGE_CHANGE_EVENT);
}

export function howToTipsEnabledSnapshot(storageKeys: readonly string[]) {
  return storageKeys.every((storageKey) => !isHowToDismissed(storageKey));
}

export function setHowToTipsEnabled(storageKeys: readonly string[], enabled: boolean) {
  storageKeys.forEach((storageKey) => setHowToDismissed(storageKey, !enabled));

  if (enabled) {
    clearHowToSeenThisPageLoad(storageKeys);
  }

  dispatchWindowEvent(HOW_TO_STORAGE_CHANGE_EVENT);
}

export function requestHowToOpen(storageKey: string) {
  clearHowToSeenThisPageLoad(storageKey);

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(HOW_TO_OPEN_EVENT, { detail: { storageKey } }));
}

export function subscribeToHowToOpen(storageKey: string, onOpen: () => void) {
  function handleOpen(event: Event) {
    const detail = event instanceof CustomEvent ? (event.detail as { storageKey?: unknown }) : null;

    if (detail?.storageKey === storageKey) {
      onOpen();
    }
  }

  window.addEventListener(HOW_TO_OPEN_EVENT, handleOpen);

  return () => window.removeEventListener(HOW_TO_OPEN_EVENT, handleOpen);
}

export function dispatchAdminSessionChanged() {
  dispatchWindowEvent(ADMIN_SESSION_CHANGE_EVENT);
}
