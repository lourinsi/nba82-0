import {
  ACHIEVEMENT_TITLE_BY_ID,
  RESULT_BADGE_META_BY_ID,
  RESULT_BADGE_SCORE_WEIGHT_BY_ID,
} from "../../achievementMeta";
import SeasonResultsView from "../../results/SeasonResultsView";

const PER100_RESULT_STORAGE_KEY = "nba82_per100_result";

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
