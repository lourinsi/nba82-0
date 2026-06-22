"use client";

import GameCourt from "../../GameCourt";
import { youKnowBallCourtConfig } from "../classicGameConfig";

export default function YouKnowBallPage() {
  return <GameCourt config={youKnowBallCourtConfig} />;
}
