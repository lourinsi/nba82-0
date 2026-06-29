import type { CSSProperties } from "react";

type TeamPalette = {
  primary: string;
  secondary: string;
  number?: string;
  contrast?: string;
  accent?: string;
};

type TeamThemeStyle = CSSProperties & {
  "--team-primary": string;
  "--team-secondary": string;
  "--team-number": string;
  "--team-contrast": string;
  "--team-accent": string;
  "--team-readable-primary": string;
  "--team-readable-secondary": string;
  "--team-readable-number": string;
};

const FALLBACK_TEAM_PALETTE: TeamPalette = {
  primary: "#2f86ff",
  secondary: "#ff8a2a",
  number: "#f4f2ec",
  contrast: "#ffffff",
};

const TEAM_PALETTES: Record<string, TeamPalette> = {
  ABA: { primary: "#5b2333", secondary: "#2fbf71", number: "#f4f2ec" },
  ATL: { primary: "#c8102e", secondary: "#fdb927", number: "#fdb927" },
  BKN: { primary: "#0b0b0d", secondary: "#ffffff", number: "#ffffff" },
  BOS: { primary: "#007a33", secondary: "#ba9653", number: "#ffffff" },
  CHA: { primary: "#00788c", secondary: "#1d1160", number: "#ffffff" },
  CHI: { primary: "#ce1141", secondary: "#111111", number: "#ffffff" },
  CLE: { primary: "#6f263d", secondary: "#ffb81c", number: "#ffb81c" },
  DAL: { primary: "#00538c", secondary: "#b8c4ca", number: "#ffffff" },
  DEN: { primary: "#0e2240", secondary: "#fec524", number: "#fec524" },
  DET: { primary: "#1d42ba", secondary: "#c8102e", number: "#ffffff" },
  GSW: { primary: "#1d428a", secondary: "#ffc72c", number: "#ffc72c" },
  HOU: { primary: "#ce1141", secondary: "#c4ced4", number: "#ffffff" },
  IND: { primary: "#002d62", secondary: "#fdbb30", number: "#fdbb30" },
  LAC: { primary: "#1d428a", secondary: "#c8102e", number: "#ffffff" },
  LAL: { primary: "#552583", secondary: "#fdb927", number: "#fdb927" },
  MEM: { primary: "#5d76a9", secondary: "#12173f", number: "#ffffff" },
  MIA: { primary: "#98002e", secondary: "#f9a01b", number: "#ffffff" },
  MIL: { primary: "#00471b", secondary: "#eee1c6", number: "#eee1c6" },
  MIN: { primary: "#0c2340", secondary: "#78be20", number: "#78be20" },
  NOP: { primary: "#0c2340", secondary: "#c8102e", number: "#ffffff" },
  NYK: { primary: "#006bb6", secondary: "#f58426", number: "#ffffff" },
  OKC: { primary: "#007ac1", secondary: "#ef3b24", number: "#ffffff" },
  ORL: { primary: "#0077c0", secondary: "#c4ced4", number: "#ffffff" },
  PHI: { primary: "#006bb6", secondary: "#ed174c", number: "#ffffff" },
  PHX: { primary: "#1d1160", secondary: "#e56020", number: "#ffffff" },
  POR: { primary: "#e03a3e", secondary: "#111111", number: "#ffffff" },
  SAC: { primary: "#5a2d81", secondary: "#63727a", number: "#ffffff" },
  SAS: { primary: "#111111", secondary: "#c4ced4", number: "#ffffff" },
  TOR: { primary: "#ce1141", secondary: "#a1a1a4", number: "#ffffff" },
  UTA: { primary: "#002b5c", secondary: "#f9a01b", number: "#f9a01b" },
  WAS: { primary: "#002b5c", secondary: "#e31837", number: "#ffffff" },
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);

  return rgbToHex({
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
  });
}

function channelLuminance(value: number) {
  const normalized = value / 255;

  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);

  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(color: string, background: string) {
  const colorLuminance = relativeLuminance(color);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(colorLuminance, backgroundLuminance);
  const darker = Math.min(colorLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function readableAccent(color: string) {
  const darkSurface = "#202431";

  if (contrastRatio(color, darkSurface) >= 4.5) {
    return color;
  }

  for (const amount of [0.5, 0.62, 0.74, 0.84]) {
    const mixed = mixHex(color, "#ffffff", amount);

    if (contrastRatio(mixed, darkSurface) >= 4.5) {
      return mixed;
    }
  }

  return "#ffffff";
}

export function teamThemeStyle(team: string | null | undefined): TeamThemeStyle {
  const palette = team ? TEAM_PALETTES[team] ?? FALLBACK_TEAM_PALETTE : FALLBACK_TEAM_PALETTE;
  const numberColor = palette.number ?? palette.secondary;

  return {
    "--team-primary": palette.primary,
    "--team-secondary": palette.secondary,
    "--team-number": numberColor,
    "--team-contrast": palette.contrast ?? "#ffffff",
    "--team-accent": palette.accent ?? readableAccent(palette.secondary),
    "--team-readable-primary": readableAccent(palette.primary),
    "--team-readable-secondary": readableAccent(palette.secondary),
    "--team-readable-number": readableAccent(numberColor),
  };
}
