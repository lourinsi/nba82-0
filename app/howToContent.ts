export type HowToOverlaySection = {
  eyebrow?: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
};

export type HowToOverlayContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: HowToOverlaySection[];
  footer?: string;
};

export const HOW_TO_STORAGE_KEYS = {
  home: "nba82_how_to_home_dismissed",
  allTime: "nba82_how_to_all_time_dismissed",
  classic: "nba82_how_to_classic_dismissed",
  per100: "nba82_how_to_per_100_dismissed",
  youKnowBall: "nba82_how_to_you_know_ball_dismissed",
} as const;

export const HOME_HOW_TO = {
  eyebrow: "How To Play",
  title: "Pick Your Challenge",
  intro:
    "Build a five-man lineup and see how close it gets to 82-0. Each mode gives you a different amount of help.",
  sections: [
    {
      eyebrow: "Playable",
      title: "All Time",
      description: "Draft the best players by career accolades and all-time resume.",
      steps: [
        "Spin for a team and era, then pick one eligible player.",
        "Fill PG, SG, SF, PF, and C. Bigger resumes usually score better.",
      ],
    },
    {
      eyebrow: "Playable",
      title: "Classic",
      description: "Build around the team-era you spin.",
      steps: [
        "Stats are era-adjusted, so raw box scores do not carry the whole pick.",
        "Efficiency, winning impact, and stint accolades feed one final score.",
      ],
    },
    {
      eyebrow: "Playable",
      title: "PER 100",
      description: "Draft around pace-adjusted team-era stints.",
      steps: [
        "The score favors per-100 production, TS+, minutes, and offensive/defensive win shares.",
        "Older seasons use team pace estimates only when true per-100 rows are missing.",
      ],
    },
    {
      eyebrow: "Playable",
      title: "You Know Ball",
      description: "Let's see if you know ball.",
      steps: [
        "It plays like Classic, but you will not be spoonfed stats or awards while drafting.",
        "Pick from memory, team context, and feel. The score still checks the work.",
      ],
    },
  ],
  footer: "Use Don't Show Again to hide this guide until local storage is cleared.",
} satisfies HowToOverlayContent;

export const PER_100_HOW_TO = {
  eyebrow: "PER 100 Guide",
  title: "PER 100 Mode",
  intro:
    "Spin a team and era, then draft the player whose eligible stint grades highest by pace-adjusted per-100 production, efficiency, minutes, and win-share split.",
  sections: [
    {
      title: "The Draft",
      description: "Each pick still comes from the spun team-era pool.",
      steps: [
        "Fill PG, SG, SF, PF, and C.",
        "A player is judged by his averaged eligible seasons for that team-era.",
      ],
    },
    {
      title: "Scoring",
      description: "The formula leans on Basketball-Reference season stats.",
      steps: [
        "Per-100 PTS, REB, AST, TS+, OWS, DWS, minutes, and MPG drive the score.",
        "When true per-100 stats are missing, the estimate uses that team season's pace.",
      ],
    },
  ],
  footer: "No invented defense, no made-up stocks. Missing inputs stay missing.",
} satisfies HowToOverlayContent;

export const ALL_TIME_HOW_TO = {
  eyebrow: "All Time Guide",
  title: "Draft By Accolades",
  intro:
    "All Time is the resume mode. Draft the best players you can based on their accolades, awards, and career legacy.",
  sections: [
    {
      title: "The Draft",
      description: "Spin a team and era, then choose one player who fits your lineup.",
      steps: [
        "Fill PG, SG, SF, PF, and C.",
        "Position fit still matters, even when the player is a legend.",
      ],
    },
    {
      title: "What Scores Well",
      description: "The score leans on accolades without turning the guide into a cheat sheet.",
      steps: [
        "MVPs, All-NBA, Finals MVPs, rings, defense, and major awards carry real weight.",
        "A strong five at natural positions usually beats five names jammed together.",
      ],
    },
  ],
  footer: "Simple idea: pick the most accomplished lineup the board gives you.",
} satisfies HowToOverlayContent;

export const CLASSIC_HOW_TO = {
  eyebrow: "Classic Guide",
  title: "Classic Mode",
  intro:
    "Spin a team and era, then build the best five from those player pools. The score looks at that stint, not the player's full career.",
  sections: [
    {
      title: "The Draft",
      description: "Each spin gives you a team and era.",
      steps: [
        "Pick one eligible player from that exact pool.",
        "Fill all five positions to get your projected record.",
      ],
    },
    {
      title: "Scoring",
      description: "Stats are era-adjusted, so raw box scores are not automatic wins.",
      steps: [
        "Production, efficiency, and winning impact are baked into one score.",
        "Accolades from that stint can still push a player higher.",
      ],
    },
  ],
  footer: "Use the clues, but trust the actual team-era run too.",
} satisfies HowToOverlayContent;

export const YOU_KNOW_BALL_HOW_TO = {
  eyebrow: "You Know Ball Guide",
  title: "Let's See If You Know Ball",
  intro: "Same team-era draft idea as Classic, but this mode will not spoonfeed you stats or awards.",
  sections: [
    {
      title: "The Draft",
      description: "Spin a team and era, then pick from that pool without the extra hints.",
      steps: [
        "Fill PG, SG, SF, PF, and C.",
        "Use memory, team history, and positional fit to make the call.",
      ],
    },
    {
      title: "What Changes",
      description: "The game is not hiding the rules, just the easy clues.",
      steps: [
        "No stat tiles during the draft.",
        "No award tiles during the draft.",
        "Your final score still judges the quality of the picks.",
      ],
    },
  ],
  footer: "No hints up front. Just ball knowledge.",
} satisfies HowToOverlayContent;
