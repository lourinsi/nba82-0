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
  youKnowBall: "nba82_how_to_you_know_ball_dismissed",
} as const;

export const HOME_HOW_TO = {
  eyebrow: "How To Play",
  title: "Pick Your 82-0 Challenge",
  intro:
    "Every mode asks the same big question: can you build a five-man lineup that survives the full 82-game grind? The clues and scoring focus change by mode.",
  sections: [
    {
      eyebrow: "Playable",
      title: "All Time",
      description: "The legacy-heavy version where every era is on the board.",
      steps: [
        "Spin for a franchise and era, then draft one eligible player into an open position.",
        "Fill PG, SG, SF, PF, and C. Position eligibility matters, so stars still need a real slot.",
        "The player clues lean on career legacy and awards, then your finished five gets projected into a season record.",
      ],
      tips: [
        "MVPs, Finals MVPs, All-NBA peaks, rings, and elite defense matter more than smaller resume pieces.",
        "A natural-position all-timer can get a useful bump, but a cleaner overall lineup still matters.",
      ],
    },
    {
      eyebrow: "Playable",
      title: "Classic",
      description: "The streamlined draft where the exact team-era stint is the star.",
      steps: [
        "Each round reveals a team and era. Pick one player who actually logged that team-era stretch.",
        "Classic shows stat and award clues so you can compare production, efficiency, and resume at a glance.",
        "Once all five positions are filled, the public draft jumps straight to the result.",
      ],
      tips: [
        "Do not chase only the biggest name. A monster stint can beat a famous player in the wrong chapter.",
        "Team or era swaps are best saved for a draw that really blocks your lineup.",
      ],
    },
    {
      eyebrow: "Coming Soon",
      title: "You Know Ball",
      description: "Classic rules, but the visible stat and award clues are hidden.",
      steps: [
        "Draft from the same team-era pools as Classic.",
        "Judge players from memory, context, fit, and instinct instead of clue tiles.",
        "The page is not live yet, but this is the intended no-hints version of the challenge.",
      ],
      tips: [
        "Think in seasons and franchises, not just career reputation.",
        "This mode should reward knowing the sneaky peaks and not only the obvious legends.",
      ],
    },
  ],
  footer: "Dismiss a guide with Don't Show Again and it stays hidden in this browser until local storage is cleared.",
} satisfies HowToOverlayContent;

export const ALL_TIME_HOW_TO = {
  eyebrow: "All Time Guide",
  title: "Build The Best Five Across Eras",
  intro:
    "All Time is about legacy power. You are drafting a five-player lineup from random franchise-era pools and trying to stack enough resume weight to chase 82-0.",
  sections: [
    {
      title: "Draft Loop",
      description: "The public draft gives you five chances to build a lineup.",
      steps: [
        "Spin to reveal a team and era.",
        "Choose one available player from that pool for an eligible open position.",
        "Repeat until PG, SG, SF, PF, and C are filled. The season simulates automatically in public mode.",
      ],
    },
    {
      title: "How The Score Thinks",
      description: "The engine favors the kind of resume that usually travels across eras.",
      steps: [
        "MVP-level awards and All-NBA seasons are heavy signals.",
        "Finals MVPs, rings, DPOY, All-Defense, and statistical titles help separate elite resumes.",
        "Durability still counts, but seasons played are a lighter nudge than true peak indicators.",
      ],
      tips: [
        "Do not overfit one clue. A stacked two-way resume usually ages better than a one-category specialist.",
        "A top-tier player in his primary position can get a small fit bonus, so do not waste clean position matches.",
      ],
    },
    {
      title: "Lineup Tips",
      description: "The best lineups usually have both stars and structure.",
      steps: [
        "Use the position filter when a draw gives you too many names to scan.",
        "If you already know your weak spot, pick for that slot before taking another luxury piece.",
        "On mobile, the bottom lineup rail is the fastest way to check your five spots.",
      ],
    },
  ],
  footer: "The exact math stays under the hood, but the board is trying to reward real all-time weight, not just name value.",
} satisfies HowToOverlayContent;

export const CLASSIC_HOW_TO = {
  eyebrow: "Classic Guide",
  title: "Draft The Best Team-Era Stints",
  intro:
    "Classic is still five players, five positions, and one season projection, but the score focuses on what a player did for the drawn franchise and era.",
  sections: [
    {
      title: "Draft Loop",
      description: "Treat every spin like a mini roster puzzle.",
      steps: [
        "Spin to reveal a team and era.",
        "Draft one eligible player from that exact team-era pool.",
        "Fill all five positions. Public mode simulates as soon as the lineup is complete.",
      ],
    },
    {
      title: "Reading The Clues",
      description: "Classic gives you more stint-specific information than All Time.",
      steps: [
        "Stat clues highlight scoring, rebounds, assists, stocks, efficiency, and WS/48 impact.",
        "Award clues still matter, but they are tied to the relevant stint instead of the whole career.",
        "Use Mixed, Stats, and Awards sorting to compare different kinds of value without letting one number make every pick for you.",
      ],
      tips: [
        "Raw points are loud, but efficiency and all-around production can swing a close pick.",
        "Era context matters. A great efficiency season in a tougher shooting environment can be stronger than it first looks.",
      ],
    },
    {
      title: "Lineup Tips",
      description: "You are drafting a team, not a museum wall.",
      steps: [
        "Save swaps for draws that leave you with no real fit or a very thin player pool.",
        "Famous players can have quiet stints. Role players can have excellent franchise-era peaks.",
        "If a position is getting scarce, solve it early before the last spin traps you.",
      ],
    },
  ],
  footer: "Classic shows enough to guide you, but the best picks still come from knowing the context behind the numbers.",
} satisfies HowToOverlayContent;

export const YOU_KNOW_BALL_HOW_TO = {
  eyebrow: "You Know Ball Guide",
  title: "Classic Without The Receipts",
  intro:
    "You Know Ball uses the Classic draft idea, but stat and award clues stay hidden. It is the memory-test version for people who trust their hoops brain.",
  sections: [
    {
      title: "Draft Loop",
      description: "The skeleton is Classic: five team-era picks, five positions, one projected season.",
      steps: [
        "Spin for a team and era.",
        "Pick one eligible player from that team-era pool without visible stats or awards.",
        "Complete the lineup and let the same kind of stint-value logic judge the result.",
      ],
    },
    {
      title: "What Changes",
      description: "The game hides the obvious crutches.",
      steps: [
        "No stat tiles to point you toward the best box-score season.",
        "No award tiles to confirm the resume.",
        "You have to lean on team history, era memory, and positional fit.",
      ],
      tips: [
        "Remember the actual franchise stint. A player can be an all-timer and still not be the best answer for that draw.",
        "Trust the boring-good picks when they fit the roster better than a famous name.",
      ],
    },
  ],
  footer: "This content is ready for the mode when the page is created.",
} satisfies HowToOverlayContent;
