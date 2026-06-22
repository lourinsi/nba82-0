import SeasonResultsView from "../../results/SeasonResultsView";

const ALL_TIME_RESULT_STORAGE_KEY = "nba82_all_time_result";

const ACHIEVEMENT_TITLE_BY_ID: Record<string, string> = {
  "all-defense": "DEF - All-Defense teams",
  "all-nba": "ALL NBA - All-NBA teams",
  "all-rookie-1st": "R1 - All-Rookie 1st team",
  "all-rookie-2nd": "R2 - All-Rookie 2nd team",
  "all-star": "AS - All-Star selections",
  "all-star-mvp": "ASM - All-Star MVPs",
  assists: "AST - Assist titles",
  blocks: "BLK - Block titles",
  dpoy: "DPOY - Defensive Player of the Year",
  "sixth-man": "6MOY - Sixth Man of the Year",
  fmvp: "FMVP - Finals MVP",
  "games-started": "GS - Games started",
  goat: "GOAT - all-time rank",
  mvp: "MVP - Most Valuable Player",
  "most-improved": "MIP - Most Improved Player",
  rebounds: "REB - Rebound titles",
  rings: "RING - Championships",
  roy: "ROY - Rookie of the Year",
  scoring: "SCO - Scoring titles",
  seasons: "YRS - Seasons played",
  steals: "STL - Steal titles",
};

export default function AllTimeResultsPage() {
  return (
    <SeasonResultsView
      config={{
        achievementTitleById: ACHIEVEMENT_TITLE_BY_ID,
        defaultModeLabel: "All Time Mode",
        defaultReturnPath: "/all-time",
        emptyButtonLabel: "Build All Time Team",
        emptyTitle: "All Time Results",
        expectedMode: "all-time",
        storageKey: ALL_TIME_RESULT_STORAGE_KEY,
      }}
    />
  );
}
