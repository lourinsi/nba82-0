"use client";

import GameCourt from "../GameCourt";
import { per100CourtConfig } from "./per100GameConfig";

export default function Per100Page() {
  return <GameCourt config={per100CourtConfig} />;
}
