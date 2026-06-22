import SeasonResultsView from "../../results/SeasonResultsView";

const CLASSIC_RESULT_STORAGE_KEY = "nba82_classic_result";

const ACHIEVEMENT_TITLE_BY_ID: Record<string, string> = {
  "all-defense": "All-DEF",
  "all-nba": "All-NBA",
  "all-rookie-1st": "All-Rookie 1st",
  "all-rookie-2nd": "All-Rookie 2nd",
  "all-star": "AS",
  "all-star-mvp": "AS MVP",
  assists: "AST Champ",
  "avg-ts-pct": "Avg true shooting",
  "avg-ts-star": "Avg TS+ & TS% combined",
  "avg-ws-48": "Avg win shares per 48",
  blocks: "BLK Champ",
  dpoy: "DPOY",
  "sixth-man": "6MOY",
  fmvp: "FMVP",
  mvp: "MVP",
  "most-improved": "MIP",
  pra: "Pts + Rebs + Asts",
  rebounds: "REB Champ",
  rings: "Championships",
  roy: "ROY",
  scoring: "PTS Champ",
  seasons: "YRS",
  steals: "STL Champ",
  stocks: "Stocks - Stls + Blks",
  "ts-pct": "True shooting",
  "ts-plus": "Era-adjusted TS%",
  "ts-star": "TS+ & TS% combined",
  "ws-48": "Win shares per 48",
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
};

const RESULT_BADGE_SCORE_WEIGHT_BY_ID: Record<string, number> = {
  mvp: 8,
  fmvp: 7,
  "all-nba": 7,
  scoring: 3,
  assists: 3,
  rings: 2.5,
  dpoy: 2.5,
  rebounds: 2,
  "all-defense": 2,
  steals: 1.5,
  blocks: 1.5,
  "all-star-mvp": 1,
  "all-star": 1,
  roy: 1,
  "sixth-man": 1,
  "most-improved": 1,
  "all-rookie-1st": 1,
  "all-rookie-2nd": 0.75,
};

export default function ClassicResultsPage() {
  return (
    <SeasonResultsView
      config={{
        achievementTitleById: ACHIEVEMENT_TITLE_BY_ID,
        defaultModeLabel: "Classic Mode",
        defaultReturnPath: "/classic",
        emptyButtonLabel: "Build Classic Team",
        emptyTitle: "Classic Results",
        expectedMode: "classic",
        hiddenAchievementIds: ["seasons"],
        resultBadgeMetaById: RESULT_BADGE_META_BY_ID,
        resultBadgeScoreWeightById: RESULT_BADGE_SCORE_WEIGHT_BY_ID,
        showAdjustedStats: true,
        storageKey: CLASSIC_RESULT_STORAGE_KEY,
      }}
    />
  );
}
