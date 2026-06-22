const LOCAL_API_BASE_URL = "http://localhost:4000";
const PRODUCTION_API_BASE_URL = "https://nba82-0-server.onrender.com";
const LOCAL_API_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isHttpBaseUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalApiBaseUrl(value: string) {
  try {
    return LOCAL_API_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function resolveApiBaseUrl() {
  const configuredApiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "");
  const isProduction = process.env.NODE_ENV === "production";

  if (
    configuredApiBaseUrl &&
    isHttpBaseUrl(configuredApiBaseUrl) &&
    !(isProduction && isLocalApiBaseUrl(configuredApiBaseUrl))
  ) {
    return configuredApiBaseUrl;
  }

  return isProduction ? PRODUCTION_API_BASE_URL : LOCAL_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
