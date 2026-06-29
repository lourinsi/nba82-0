import {
  ACHIEVEMENT_TITLE_BY_ID,
  RESULT_BADGE_META_BY_ID,
  RESULT_BADGE_SCORE_WEIGHT_BY_ID,
} from "../../achievementMeta";
import SeasonResultsView from "../../results/SeasonResultsView";

const CLASSIC_RESULT_STORAGE_KEY = "nba82_classic_result";

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
