import type { Achievement, Position, SeasonTier } from "../GameCourt";
import { CLASSIC_SEASON_TIERS } from "../classic/classicGameConfig";
import {
  MYSTERY_LINEUP_POSITIONS,
  tsStarPercentValue,
  weightedWs48Value,
  type MysteryDraftGameState,
  type MysteryDraftRosterCard,
} from "./mysteryDraftGame";
import { MYSTERY_RESULT_MODE } from "./mysteryDraftResultConstants";

type SeasonProjection = {
  description: string;
  losses: number;
  score: number;
  tier: string;
  wins: number;
};

type ResultPayload = {
  adjustedTotals?: Achievement[];
  draftBaseScore: number;
  finalOptimizedScore: number;
  lineup: MysteryResultPlayer[];
  mode: string;
  originalTotals?: Achievement[];
  resultModeLabel: string;
  resultSummary: Array<{ label: string; value: string }>;
  returnPath: string;
  selectedEraLabel: string;
  selectedTeam: string;
  showAdjustedStats?: boolean;
  simulationResult: SeasonProjection;
  totals: Achievement[];
};

type MysteryResultPlayer = {
  achievements: Achievement[];
  adjustedAchievements?: Achievement[];
  baseScore?: number;
  eligiblePositions?: Position[];
  emptySlot?: boolean;
  fitLabel?: string;
  originalAchievements?: Achievement[];
  player: {
    id: string;
    name: string;
  };
  position: Position;
  positionAdjustedScore?: number;
  positionBonus?: {
    label?: string;
    multiplier: number;
    points: number;
  };
  primaryPosition?: Position | null;
  salary?: {
    paidPrice?: number;
    reservePrice?: number;
  };
  scoreBonus?: {
    label?: string;
    multiplier: number;
    points: number;
  };
  scoreContribution?: number;
  selection?: {
    era?: string;
    eraLabel: string;
    team: string;
  };
};

export type MysteryPositionFitKind = "primary" | "secondary" | "out-of-position" | "empty";

export type MysteryPositionAssignment = {
  baseScore: number;
  card: MysteryDraftRosterCard | null;
  eligiblePositions: Position[];
  fitKind: MysteryPositionFitKind;
  fitLabel: string;
  fitMultiplier: number;
  positionAdjustedScore: number;
  primaryPosition: Position | null;
  slot: Position;
};

type OptimizationCandidate = {
  assignments: MysteryPositionAssignment[];
  draftBaseScore: number;
  eligibleFitCount: number;
  finalOptimizedScore: number;
  primaryFitCount: number;
  preservedFitBaseScore: number;
};

function rounded(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function formatMoney(value: number) {
  return `$${value}`;
}

function formatAverage(value: number | null, digits = 1, suffix = "") {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(digits).replace(/\.0+$/, "")}${suffix}`
    : "--";
}

function formatPraValues(points: number | null, rebounds: number | null, assists: number | null) {
  return [formatAverage(points, 0), formatAverage(rebounds, 0), formatAverage(assists, 0)].join(" / ");
}

export function calculatePositionFitMultiplier(
  card: MysteryDraftRosterCard | null,
  assignedPosition: Position,
) {
  if (!card) {
    return {
      fitKind: "empty" as const,
      fitLabel: "Missing Slot",
      multiplier: 1,
    };
  }

  if (card.primaryPosition === assignedPosition) {
    return {
      fitKind: "primary" as const,
      fitLabel: "Primary Fit +10%",
      multiplier: 1.1,
    };
  }

  if (card.eligiblePositions.includes(assignedPosition)) {
    return {
      fitKind: "secondary" as const,
      fitLabel: card.primaryPosition ? "Secondary Fit" : "Flexible Fit",
      multiplier: 1,
    };
  }

  return {
    fitKind: "out-of-position" as const,
    fitLabel: "Out of Position -10%",
    multiplier: 0.9,
  };
}

function assignmentForSlot(card: MysteryDraftRosterCard | null, slot: Position): MysteryPositionAssignment {
  const fit = calculatePositionFitMultiplier(card, slot);
  const baseScore = card?.finalScore ?? card?.score ?? 0;
  const positionAdjustedScore = rounded(baseScore * fit.multiplier);

  return {
    baseScore,
    card,
    eligiblePositions: card?.eligiblePositions ?? [],
    fitKind: fit.fitKind,
    fitLabel: fit.fitLabel,
    fitMultiplier: fit.multiplier,
    positionAdjustedScore,
    primaryPosition: card?.primaryPosition ?? null,
    slot,
  };
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) {
    return [items];
  }

  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];

    return permutations(rest).map((permutation) => [item, ...permutation]);
  });
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [[]];
  }

  if (items.length < size) {
    return [];
  }

  if (items.length === size) {
    return [items];
  }

  const [first, ...rest] = items;

  return [
    ...combinations(rest, size - 1).map((combination) => [first, ...combination]),
    ...combinations(rest, size),
  ];
}

function candidateForAssignments(assignments: MysteryPositionAssignment[]): OptimizationCandidate {
  return {
    assignments,
    draftBaseScore: rounded(assignments.reduce((sum, assignment) => sum + assignment.baseScore, 0)),
    eligibleFitCount: assignments.filter(
      (assignment) => assignment.fitKind === "primary" || assignment.fitKind === "secondary",
    ).length,
    finalOptimizedScore: rounded(
      assignments.reduce((sum, assignment) => sum + assignment.positionAdjustedScore, 0),
    ),
    preservedFitBaseScore: rounded(
      assignments.reduce(
        (sum, assignment) =>
          assignment.fitKind === "primary" || assignment.fitKind === "secondary"
            ? sum + assignment.baseScore
            : sum,
        0,
      ),
    ),
    primaryFitCount: assignments.filter((assignment) => assignment.fitKind === "primary").length,
  };
}

function isBetterCandidate(candidate: OptimizationCandidate, best: OptimizationCandidate | null) {
  if (!best) {
    return true;
  }

  return (
    candidate.finalOptimizedScore > best.finalOptimizedScore ||
    (candidate.finalOptimizedScore === best.finalOptimizedScore &&
      (candidate.primaryFitCount > best.primaryFitCount ||
        (candidate.primaryFitCount === best.primaryFitCount &&
          (candidate.eligibleFitCount > best.eligibleFitCount ||
            (candidate.eligibleFitCount === best.eligibleFitCount &&
              candidate.preservedFitBaseScore > best.preservedFitBaseScore)))))
  );
}

export function optimizeMysteryDraftPositions(cards: MysteryDraftRosterCard[]) {
  const cardGroups =
    cards.length > MYSTERY_LINEUP_POSITIONS.length
      ? combinations(cards, MYSTERY_LINEUP_POSITIONS.length)
      : [cards];
  let best: OptimizationCandidate | null = null;

  for (const cardGroup of cardGroups) {
    const paddedCards: Array<MysteryDraftRosterCard | null> = [
      ...cardGroup,
      ...Array.from({ length: Math.max(0, MYSTERY_LINEUP_POSITIONS.length - cardGroup.length) }, () => null),
    ];

    for (const permutation of permutations(paddedCards)) {
      const candidate = candidateForAssignments(
        MYSTERY_LINEUP_POSITIONS.map((slot, index) => assignmentForSlot(permutation[index] ?? null, slot)),
      );

      if (isBetterCandidate(candidate, best)) {
        best = candidate;
      }
    }
  }

  return (
    best ?? {
      assignments: MYSTERY_LINEUP_POSITIONS.map((slot) => assignmentForSlot(null, slot)),
      draftBaseScore: 0,
      eligibleFitCount: 0,
      finalOptimizedScore: 0,
      preservedFitBaseScore: 0,
      primaryFitCount: 0,
    }
  );
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function projectMysterySeasonRecord(score: number, seasonTiers: SeasonTier[] = CLASSIC_SEASON_TIERS) {
  const tier = seasonTiers.find((candidate) => score >= candidate.minScore) ?? seasonTiers[seasonTiers.length - 1];
  const wins = tier.minWins === tier.maxWins ? tier.minWins : randomInteger(tier.minWins, tier.maxWins);
  const losses = Math.max(0, tier.fixedLosses ?? 82 - wins);

  return {
    description: tier.description,
    losses,
    score,
    tier: tier.tier,
    wins,
  };
}

function buildSeasonMetricAchievements(card: MysteryDraftRosterCard, showAdjustedStats: boolean): Achievement[] {
  const tsDisplayValue = showAdjustedStats ? tsStarPercentValue(card.statScore) : card.rawStats.tsPct;
  const ws48DisplayValue = showAdjustedStats ? weightedWs48Value(card.statScore) : card.rawStats.ws48;

  return [
    {
      id: "pra",
      label: "P/R/A",
      title: showAdjustedStats
        ? "Per-100 points, rebounds, assists"
        : "Raw points, rebounds, assists per game",
      value: showAdjustedStats
        ? formatPraValues(card.statScore.per100PTS, card.statScore.per100REB, card.statScore.per100AST)
        : formatPraValues(card.rawStats.ppg, card.rawStats.rpg, card.rawStats.apg),
    },
    {
      id: showAdjustedStats ? "ts-star" : "ts-pct",
      label: showAdjustedStats ? "TS*" : "TS%",
      title: showAdjustedStats ? "True shooting with era context" : "True shooting percentage",
      value: tsDisplayValue === null ? "--" : `${Math.round(tsDisplayValue)}%`,
    },
    {
      id: "ws-48",
      label: "WS/48",
      title: showAdjustedStats ? "Weighted win-share rate per 48 minutes" : "Win shares per 48 minutes",
      value: ws48DisplayValue === null ? "--" : ws48DisplayValue.toFixed(3),
    },
    {
      id: "mpg",
      label: "MPG",
      title: "Minutes per game",
      value: formatAverage(showAdjustedStats ? card.statScore.mpg : card.rawStats.mpg, 1),
    },
  ];
}

function resultAchievementsForCard(card: MysteryDraftRosterCard, showAdjustedStats: boolean) {
  return [...buildSeasonMetricAchievements(card, showAdjustedStats), ...card.seasonAchievements];
}

function emptySlotAchievement(slot: Position): Achievement {
  return {
    id: `empty-${slot.toLowerCase()}`,
    label: "Missing",
    title: `${slot} was not filled during the draft`,
    value: "0",
  };
}

export function buildMysteryDraftResultsPayload(
  game: MysteryDraftGameState,
  showAdjustedStats: boolean,
): ResultPayload {
  const optimization = optimizeMysteryDraftPositions(game.roster);
  const draftBaseScore = optimization.draftBaseScore;
  const finalOptimizedScore = optimization.finalOptimizedScore;
  const totalPaid = game.roster.reduce((sum, card) => sum + card.paidPrice, 0);
  const fitDelta = rounded(finalOptimizedScore - draftBaseScore);
  const totals: Achievement[] = [
    {
      id: "final-score",
      label: "Final",
      title: "Final position-optimized score",
      value: formatScore(finalOptimizedScore),
    },
    {
      id: "draft-score",
      label: "Draft",
      title: "Original drafted-card score before position fit",
      value: formatScore(draftBaseScore),
    },
    {
      id: "fit-delta",
      label: "Fit",
      title: "Net score change from position assignment",
      value: `${fitDelta >= 0 ? "+" : ""}${formatScore(fitDelta)}`,
    },
    {
      id: "total-paid",
      label: "Paid",
      title: "Total salary paid",
      value: formatMoney(totalPaid),
    },
    {
      id: "salary-left",
      label: "Left",
      title: "Salary remaining",
      value: formatMoney(game.salaryRemaining),
    },
    {
      id: "spins-used",
      label: "Spins",
      title: "Spins used",
      value: `${game.spinsUsed}/${game.maxSpins}`,
    },
  ];

  return {
    draftBaseScore,
    finalOptimizedScore,
    lineup: optimization.assignments.map((assignment) => {
      const card = assignment.card;
      const originalAchievements = card
        ? resultAchievementsForCard(card, false)
        : [emptySlotAchievement(assignment.slot)];
      const adjustedAchievements = card
        ? resultAchievementsForCard(card, true)
        : [emptySlotAchievement(assignment.slot)];

      return {
        achievements: showAdjustedStats ? adjustedAchievements : originalAchievements,
        adjustedAchievements,
        baseScore: assignment.baseScore,
        eligiblePositions: assignment.eligiblePositions,
        emptySlot: !card,
        fitLabel: assignment.fitLabel,
        originalAchievements,
        player: {
          id: card?.rosterCardId ?? `missing-${assignment.slot.toLowerCase()}`,
          name: card?.playerName ?? "Missing Slot",
        },
        position: assignment.slot,
        positionAdjustedScore: assignment.positionAdjustedScore,
        positionBonus: card
          ? {
              label: assignment.fitLabel,
              multiplier: assignment.fitMultiplier,
              points: rounded(assignment.positionAdjustedScore - assignment.baseScore),
            }
          : undefined,
        primaryPosition: assignment.primaryPosition,
        salary: card
          ? {
              paidPrice: card.paidPrice,
              reservePrice: card.reservePrice,
            }
          : undefined,
        scoreBonus: card?.wasSniped
          ? {
              label: "Snipe Bonus",
              multiplier: card.scoreMultiplier,
              points: rounded((card.finalScore ?? card.score) - (card.baseScore ?? card.score)),
            }
          : undefined,
        scoreContribution: assignment.positionAdjustedScore,
        selection: card
          ? {
              era: card.era,
              eraLabel: `${card.cardSeasonLabel} season`,
              team: card.team,
            }
          : {
              eraLabel: "No card drafted",
              team: "NBA",
            },
      } satisfies MysteryResultPlayer;
    }),
    mode: MYSTERY_RESULT_MODE,
    originalTotals: totals,
    adjustedTotals: totals,
    resultModeLabel: "Mystery Salary Draft",
    resultSummary: [
      { label: "Final Score", value: formatScore(finalOptimizedScore) },
      { label: "Draft Score", value: formatScore(draftBaseScore) },
      { label: "Total Paid", value: formatMoney(totalPaid) },
      { label: "Salary Left", value: formatMoney(game.salaryRemaining) },
      { label: "Cards Drafted", value: `${game.roster.length}/${game.rosterSize}` },
      { label: "Spins", value: `${game.spinsUsed}/${game.maxSpins}` },
    ],
    returnPath: "/mystery-draft",
    selectedEraLabel: "Salary Draft",
    selectedTeam: "Mystery",
    showAdjustedStats,
    simulationResult: projectMysterySeasonRecord(finalOptimizedScore),
    totals,
  };
}
