import SeasonResultsView from "../../results/SeasonResultsView";

const PER100_RESULT_STORAGE_KEY = "nba82_per100_result";

const ACHIEVEMENT_TITLE_BY_ID: Record<string, string> = {
  "all-defense": "All-DEF",
  "all-nba": "All-NBA",
  "all-rookie-1st": "All-Rookie 1st",
  "all-rookie-2nd": "All-Rookie 2nd",
  "all-star": "AS",
  "all-star-mvp": "AS MVP",
  "avg-mpg": "Average minutes per game",
  "avg-ts-star": "Average TS+ & TS% combined",
  "avg-ws-48": "Average weighted win shares per 48",
  assists: "AST Champ",
  blocks: "BLK Champ",
  dpoy: "DPOY",
  "sixth-man": "6MOY",
  fmvp: "FMVP",
  mpg: "Minutes per game",
  mvp: "MVP",
  "most-improved": "MIP",
  pra: "Pts + Rebs + Asts",
  pts: "Points",
  asts: "Assists",
  rebs: "Rebounds",
  rebounds: "REB Champ",
  rings: "Championships",
  roy: "ROY",
  scoring: "PTS Champ",
  steals: "STL Champ",
  "three-point-contest": "3-Point Contest",
  "three-point-title": "3PT Champ",
  "ts-star": "TS+ & TS% combined",
  "ws-48": "Weighted win shares per 48",
};

const RESULT_BADGE_META_BY_ID = {
  "all-defense": { symbol: "DEF", variant: "defense", description: "All-DEF" },
  "all-nba": { symbol: "NBA", variant: "nba", description: "All-NBA" },
  "all-rookie-1st": { symbol: "R1", variant: "rookie", description: "All-Rookie 1st" },
  "all-rookie-2nd": { symbol: "R2", variant: "rookie", description: "All-Rookie 2nd" },
  "all-star": { symbol: "AS", variant: "all-star-logo", description: "AS" },
  "all-star-mvp": { symbol: "★", variant: "all-star-mvp", description: "AS MVP" },
  assists: { symbol: "AST", variant: "assist", description: "AST Champ" },
  blocks: { symbol: "BLK", variant: "defense", description: "BLK Champ" },
  dpoy: { symbol: "DPOY", variant: "dpoy", description: "DPOY" },
  fmvp: { symbol: "F", variant: "fmvp", description: "FMVP" },
  mvp: { symbol: "M", variant: "mvp", description: "MVP" },
  "most-improved": { symbol: "MIP", variant: "rise", description: "MIP" },
  rebounds: { symbol: "REB", variant: "rebound", description: "REB Champ" },
  rings: { symbol: "💍", variant: "ring", description: "Rings" },
  roy: { symbol: "ROY", variant: "roy", description: "ROY" },
  scoring: { symbol: "PTS", variant: "points", description: "PTS Champ" },
  "sixth-man": { symbol: "6th", variant: "sixth", description: "6MOY" },
  steals: { symbol: "STL", variant: "defense", description: "STL Champ" },
  "three-point-contest": { symbol: "3PC", variant: "points", description: "3-Point Contest" },
  "three-point-title": { symbol: "3PT", variant: "points", description: "3PT Champ" },
};

const RESULT_BADGE_SCORE_WEIGHT_BY_ID: Record<string, number> = {
  mvp: 8,
  fmvp: 7.1,
  "all-nba": 7,
  scoring: 3,
  assists: 3,
  dpoy: 2.5,
  "three-point-title": 2.5,
  rings: 2.4,
  rebounds: 2,
  "all-defense": 2,
  steals: 1.5,
  blocks: 1.5,
  "all-star-mvp": 1.1,
  roy: 1.1,
  "three-point-contest": 1,
  "all-star": 1,
  "sixth-man": 1,
  "most-improved": 1,
  "all-rookie-1st": 1,
  "all-rookie-2nd": 0.75,
};

export default function Per100ResultsPage() {
  return (
    <SeasonResultsView
      config={{
        achievementTitleById: ACHIEVEMENT_TITLE_BY_ID,
        defaultModeLabel: "PER 100 Mode",
        defaultReturnPath: "/per-100",
        emptyButtonLabel: "Build PER 100 Team",
        emptyTitle: "PER 100 Results",
        expectedMode: "per-100",
        resultBadgeMetaById: RESULT_BADGE_META_BY_ID,
        resultBadgeScoreWeightById: RESULT_BADGE_SCORE_WEIGHT_BY_ID,
        showAdjustedStats: true,
        storageKey: PER100_RESULT_STORAGE_KEY,
      }}
    />
  );
}
