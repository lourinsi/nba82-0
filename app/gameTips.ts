export type GameTip = {
  eyebrow: string;
  text: string;
};

export const GAME_TIPS = [
  {
    eyebrow: "Scouting Report",
    text: "Scouting 4,651 resumes. Give it a second, the database is doing cardio.",
  },
  {
    eyebrow: "Classic Tip",
    text: "Classic Mode loves peaks. A short monster run can hit harder than a long polite career.",
  },
  {
    eyebrow: "Classic Tip",
    text: "Turn on adjusted stats to see how good a player's numbers were compared to their own era.",
  },
  {
    eyebrow: "Classic Tip",
    text: "Raw stats can be loud, but adjusted stats add context. Different eras played different basketball.",
  },
  {
    eyebrow: "Classic Tip",
    text: "TS% shows scoring efficiency using field goals, threes, and free throws. Basically: how clean were the buckets?",
  },
  {
    eyebrow: "Classic Tip",
    text: "TS+ compares a player's TS% to their era's TS%. Above average efficiency gets rewarded properly.",
  },
  {
    eyebrow: "Classic Tip",
    text: "Raw TS% can underrate old-school stars. TS+ helps show who was efficient for their time.",
  },
  {
    eyebrow: "Classic Tip",
    text: "TS* = (TS% + TS+)/2. It balances raw efficiency with era-adjusted efficiency.",
  },
  {
    eyebrow: "Classic Tip",
    text: "TS* protects older players with lower raw TS%, while still respecting how efficient modern players became.",
  },
  {
    eyebrow: "Classic Tip",
    text: "If two players look close, check TS%, TS+, and TS*. Same points can have very different value.",
  },
  {
    eyebrow: "Era Note",
    text: "Players from the 1950s are grouped together with the 1960s era in this game.",
  },
  {
    eyebrow: "Era Note",
    text: "Some 60s players also played in the 50s. Their 50s accolades are still retained.",
  },
  {
    eyebrow: "Era Note",
    text: "The 50s and 60s can get messy, so the game keeps those early-era resumes together instead of pretending history was neat.",
  },
  {
    eyebrow: "Draft Tip",
    text: "A player with a short peak can still be a monster pick if that peak was unfair enough.",
  },
  // {
  //   eyebrow: "Draft Tip",
  //   text: "Do not only stare at career length. Classic Mode cares a lot about how terrifying the player was at their best.",
  // },
  {
    eyebrow: "Draft Tip",
    text: "Adjusted stats are your friend when comparing old legends to modern efficiency monsters. Turn it on!",
  },
  {
    eyebrow: "Engine Warning",
    text: "If you draft literal basketball gods, the sim can break way harder than 82-0.",
  },
  {
    eyebrow: "Engine Warning",
    text: "A perfect team is nice. A deeply unfair team is where the engine starts making business decisions.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Wilt averaged 48.5 minutes per game in 1961-62 because overtime exists and rest apparently did not.",
  },
  {
    eyebrow: "NBA Fact",
    text: "The three-point line arrived in the NBA in 1979. Before that, deep shots were just long twos with emotional damage.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Alex English scored more total points in the 1980s than Bird, Magic, or Jordan. Quiet buckets still count.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Wes Unseld won Rookie of the Year and MVP in the same season. First year on the job, instantly overqualified.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Scott Skiles still holds the single-game assist record with 30. His teammates were basically on direct deposit.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Nate Thurmond recorded the NBA's first official quadruple-double in 1974. Box score chaos, but classy.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Alvin Robertson had a quadruple-double with steals in 1986. Ten steals is a crime scene with a stat sheet.",
  },
  {
    eyebrow: "NBA Fact",
    text: "Manute Bol blocked more shots than he scored points as a rookie. That is commitment to the job description.",
  },
  {
    eyebrow: "NBA Fact",
    text: "David Thompson scored 73 on the final day of 1977-78, then George Gervin answered with 63 to win the scoring title.",
  },
  {
    eyebrow: "NBA Fact",
    text: "The shot clock arrived in 1954 and saved basketball from becoming competitive waiting.",
  },
  // {
  //   eyebrow: "Roster Tip",
  //   text: "Use filters when the feed gets crowded. 4,651 players is not a list, it is a census.",
  // },
] as const satisfies readonly GameTip[];

export const FIRST_GAME_TIP_INDEX = 0;

export function randomGameTip() {
  return GAME_TIPS[randomGameTipIndex()];
}

export function randomGameTipIndex({ includeFirstTip = true }: { includeFirstTip?: boolean } = {}) {
  if (includeFirstTip || GAME_TIPS.length <= 1) {
    return Math.floor(Math.random() * GAME_TIPS.length);
  }

  return 1 + Math.floor(Math.random() * (GAME_TIPS.length - 1));
}

export function randomRotatingGameTipIndex() {
  return randomGameTipIndex({ includeFirstTip: false });
}

export function nextRotatingGameTipIndex(currentIndex: number) {
  if (GAME_TIPS.length <= 1) {
    return FIRST_GAME_TIP_INDEX;
  }

  const nextIndex = currentIndex + 1;

  return nextIndex > FIRST_GAME_TIP_INDEX && nextIndex < GAME_TIPS.length ? nextIndex : FIRST_GAME_TIP_INDEX + 1;
}
