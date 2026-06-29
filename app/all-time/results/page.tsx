import { ACHIEVEMENT_TITLE_BY_ID } from "../../achievementMeta";
import SeasonResultsView from "../../results/SeasonResultsView";

const ALL_TIME_RESULT_STORAGE_KEY = "nba82_all_time_result";

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
