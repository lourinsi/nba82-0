"use client";

import GameCourt from "../GameCourt";
import { classicCourtConfig } from "./classicGameConfig";

export default function ClassicPage() {
  return <GameCourt config={classicCourtConfig} />;
}
