import { API_BASE_URL } from "./apiConfig";

const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;
const PLAYERS_PATH = "/api/players";

type CacheEntry = {
  cachedAt: number;
  value: unknown;
};

const apiCache = new Map<string, CacheEntry>();
const apiRequests = new Map<string, Promise<unknown>>();

function cachedApiValue<T>(path: string) {
  const entry = apiCache.get(path);

  if (!entry || Date.now() - entry.cachedAt > CLIENT_CACHE_TTL_MS) {
    return null;
  }

  return entry.value as T;
}

export function getCachedApiJson<T>(path: string) {
  return cachedApiValue<T>(path);
}

export async function loadApiJson<T>(path: string) {
  const cachedValue = cachedApiValue<T>(path);

  if (cachedValue) {
    return cachedValue;
  }

  const activeRequest = apiRequests.get(path);

  if (activeRequest) {
    return (await activeRequest) as T;
  }

  const request = fetch(`${API_BASE_URL}${path}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = (await response.json()) as T;
    apiCache.set(path, { cachedAt: Date.now(), value: data });

    return data;
  });

  apiRequests.set(path, request);

  try {
    return await request;
  } finally {
    apiRequests.delete(path);
  }
}

export async function requestApiJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const data = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && data.error
        ? data.error
        : `API returned ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export function postApiJson<T>(path: string, body: unknown) {
  return requestApiJson<T>(path, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

export function getCachedPlayers<T>() {
  return getCachedApiJson<T[]>(PLAYERS_PATH);
}

export function loadPlayers<T>() {
  return loadApiJson<T[]>(PLAYERS_PATH);
}

export function warmupPlayers<T>() {
  return loadPlayers<T>();
}
