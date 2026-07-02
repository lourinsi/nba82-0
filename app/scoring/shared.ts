import type { LeagueAverage, LeagueAverages } from "../GameCourt";

export function numericValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace(/,/g, "").replace("%", ""));

  return Number.isFinite(numeric) ? numeric : null;
}

export function firstNumericValue(source: Record<string, unknown> | undefined | null, keys: readonly string[]) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const numeric = numericValue(source[key]);

      if (numeric !== null) {
        return numeric;
      }
    }
  }

  return null;
}

export function positiveNumber(value: unknown) {
  const numeric = numericValue(value);

  return numeric !== null && numeric > 0 ? numeric : null;
}

export function nonNegativeNumber(value: unknown) {
  const numeric = numericValue(value);

  return numeric !== null && numeric >= 0 ? numeric : null;
}

export function normalizeTsPct(value: unknown) {
  const numeric = positiveNumber(value);

  if (numeric === null) {
    return null;
  }

  return numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
}

export function rounded(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

export function seasonEndYear(season: unknown) {
  const value = String(season || "").trim();
  const fullYearRange = value.match(/^(\d{4})\D+(\d{4})/);

  if (fullYearRange) {
    return Number(fullYearRange[2]);
  }

  const shortYearRange = value.match(/^(\d{4})\D+(\d{2})/);

  if (shortYearRange) {
    const startYear = Number(shortYearRange[1]);
    const endYearSuffix = Number(shortYearRange[2]);
    const startCentury = Math.floor(startYear / 100) * 100;
    const endYear = startCentury + endYearSuffix;

    return endYear > startYear ? endYear : endYear + 100;
  }

  const singleYear = value.match(/\d{4}/);

  return singleYear ? Number(singleYear[0]) : null;
}

export function seasonKeyCandidates(season: unknown) {
  const rawSeason = String(season || "").trim();

  if (!rawSeason) {
    return [];
  }

  const candidates = [rawSeason];
  const endYear = seasonEndYear(rawSeason);
  const startYear = Number(rawSeason.match(/^(\d{4})/)?.[1]);

  if (startYear && endYear) {
    candidates.push(`${startYear}-${String(endYear).slice(-2)}`);
    candidates.push(`${startYear}-${endYear}`);
  }

  return Array.from(new Set(candidates));
}

export function leagueAverageForSeason(
  leagueAverages: LeagueAverages | undefined,
  season: unknown,
): LeagueAverage | null {
  if (!leagueAverages) {
    return null;
  }

  for (const key of seasonKeyCandidates(season)) {
    if (leagueAverages[key]) {
      return leagueAverages[key];
    }
  }

  return null;
}

