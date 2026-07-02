import {
  ACHIEVEMENT_TITLE_BY_ID,
  RESULT_BADGE_META_BY_ID,
  RESULT_BADGE_SCORE_WEIGHT_BY_ID,
} from "../../achievementMeta";
import {
  MYSTERY_RESULT_MODE,
  MYSTERY_RESULT_STORAGE_KEY,
} from "../mysteryDraftResultConstants";
import SeasonResultsView from "../../results/SeasonResultsView";

export default function MysteryDraftResultsPage() {
  return (
    <SeasonResultsView
      config={{
        achievementTitleById: ACHIEVEMENT_TITLE_BY_ID,
        defaultModeLabel: "Mystery Salary Draft",
        defaultReturnPath: "/mystery-draft",
        emptyButtonLabel: "Start Mystery Draft",
        emptyTitle: "Mystery Salary Draft Results",
        expectedMode: MYSTERY_RESULT_MODE,
        resultBadgeMetaById: RESULT_BADGE_META_BY_ID,
        resultBadgeScoreWeightById: RESULT_BADGE_SCORE_WEIGHT_BY_ID,
        showAdjustedStats: false,
        storageKey: MYSTERY_RESULT_STORAGE_KEY,
      }}
    />
  );
}
