import { postApiJson, requestApiJson } from "../apiClient";
import type { MysteryDraftSettings } from "./mysteryDraftGame";

const CLIENT_ID_STORAGE_KEY = "nba82_mystery_multiplayer_client_id";
const PARTICIPANT_SESSION_PREFIX = "nba82_mystery_multiplayer_participant_";

export type MultiplayerLobbyStatus = "waiting" | "started" | "completed" | "abandoned";

export type MysteryDraftMultiplayerSettings = MysteryDraftSettings & {
  bidIncrement: number;
  bidTimerSeconds: number;
  gameMode: "multiplayer";
  highestBidWins: true;
  minimumBid: number;
  multiplayer: {
    bidTimerSeconds: number;
    revealDurationSeconds: number;
    revealAllBidsAfterRound: boolean;
    highestBidWins: true;
    noMarketRange: true;
  };
  noMarketRange: true;
  poolSize: number;
  revealAllBidsAfterRound: boolean;
  revealDurationSeconds: number;
};

export type MultiplayerParticipant = {
  clientId: string | null;
  id: string;
  isHost: boolean;
  joinedAt: string;
  lobbyId: string;
  name: string;
  userId: string | null;
};

export type MultiplayerLobby = {
  code: string;
  createdAt: string;
  hostUserId: string | null;
  id: string;
  settings: MysteryDraftMultiplayerSettings;
  status: MultiplayerLobbyStatus;
  updatedAt: string;
};

export type MultiplayerLobbySnapshot = {
  lobby: MultiplayerLobby;
  participants: MultiplayerParticipant[];
};

export type MultiplayerLobbyResponse = MultiplayerLobbySnapshot & {
  participant: MultiplayerParticipant;
};

export type MultiplayerGameStatus = "active" | "completed";
export type MultiplayerRoundStatus = "bidding" | "revealed" | "completed";

export type MultiplayerAuctionPlayer = {
  accoladeScore: number;
  baseScore: number;
  cardSeasonLabel: string;
  eligiblePositions: string[];
  era: string;
  eraLabel: string;
  finalScore: number;
  hiddenSeasonId: string;
  playerId: string;
  playerImageUrl: string | null;
  playerName: string;
  playerSeasonId: string;
  poolIndex: number;
  possibleSeasonLabels: string[];
  possibleYearRange: string;
  primaryPosition: string | null;
  rawStats?: {
    apg: number | null;
    mpg: number | null;
    ppg: number | null;
    rpg: number | null;
    tsStarPct: number | null;
    weightedWs48: number | null;
  };
  seasonEndYear: number | null;
  seasonId: string;
  seasonLabel: string;
  statMode: MysteryDraftSettings["statMode"];
  statModeLabel: string;
  stintKey: string;
  team: string;
  truePrice: number;
};

export type MultiplayerRound = {
  bidEndsAt: string;
  bidStartedAt: string;
  gameId: string;
  id: string;
  noBid: boolean;
  playerSeasonId: string;
  revealEndsAt: string | null;
  resolvedAt: string | null;
  roundIndex: number;
  status: MultiplayerRoundStatus;
  winnerParticipantId: string | null;
  winningBid: number | null;
};

export type MultiplayerBid = {
  amount: number | null;
  createdAt: string;
  id: string;
  isOwnSubmission: boolean;
  isPass: boolean | null;
  participantId: string;
  participantName: string;
  roundId: string;
};

export type MultiplayerGame = {
  createdAt: string;
  currentRoundIndex: number;
  id: string;
  lobbyId: string;
  poolSize: number;
  settings: MysteryDraftMultiplayerSettings;
  status: MultiplayerGameStatus;
  updatedAt: string;
};

export type MultiplayerRosterPick = {
  baseScore: number;
  createdAt: string;
  finalScore: number;
  id: string;
  paidAmount: number;
  player: MultiplayerAuctionPlayer | null;
  playerName: string;
  playerSeasonId: string;
  roundId: string;
  seasonLabel: string | null;
  team: string | null;
};

export type MultiplayerRoster = {
  bestPick: MultiplayerRosterPick | null;
  count: number;
  isFull: boolean;
  mostExpensivePick: MultiplayerRosterPick | null;
  participantId: string;
  participantName: string;
  picks: MultiplayerRosterPick[];
  remainingBudget: number;
  rosterSize: number;
  spent: number;
  totalScore: number;
};

export type MultiplayerStanding = {
  bestPick: MultiplayerRosterPick | null;
  isTie: boolean;
  mostExpensivePick: MultiplayerRosterPick | null;
  participantId: string;
  participantName: string;
  rank: number;
  remainingBudget: number;
  roster: MultiplayerRosterPick[];
  spent: number;
  totalScore: number;
};

export type MultiplayerGameState = {
  bids: MultiplayerBid[];
  budgets: Record<string, number>;
  currentPlayer: MultiplayerAuctionPlayer | null;
  currentRound: MultiplayerRound | null;
  game: MultiplayerGame | null;
  highestBid: MultiplayerBid | null;
  lobby: MultiplayerLobby;
  participants: MultiplayerParticipant[];
  rosters: MultiplayerRoster[];
  serverTime: string;
  standings: MultiplayerStanding[];
};

export type MultiplayerParticipantSession = {
  clientId: string | null;
  participantId: string;
};

function browserStorage(kind: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window[kind];
  } catch {
    return null;
  }
}

function safeStorage(storage: Storage | null, callback: (storage: Storage) => void) {
  try {
    if (storage) {
      callback(storage);
    }
  } catch {
    // Storage can be unavailable in private windows or strict browser settings.
  }
}

function randomClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getMysteryMultiplayerClientId() {
  const localStorage = browserStorage("localStorage");

  if (!localStorage) {
    return randomClientId();
  }

  const existingClientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);

  if (existingClientId) {
    return existingClientId;
  }

  const clientId = randomClientId();

  safeStorage(localStorage, (storage) => storage.setItem(CLIENT_ID_STORAGE_KEY, clientId));

  return clientId;
}

function participantSessionKey(code: string) {
  return `${PARTICIPANT_SESSION_PREFIX}${code.trim().toUpperCase()}`;
}

export function rememberMysteryMultiplayerParticipant(code: string, participant: MultiplayerParticipant) {
  const sessionStorage = browserStorage("sessionStorage");

  if (!sessionStorage) {
    return;
  }

  const value = JSON.stringify({
    clientId: participant.clientId,
    participantId: participant.id,
  } satisfies MultiplayerParticipantSession);

  safeStorage(sessionStorage, (storage) => storage.setItem(participantSessionKey(code), value));
}

export function readMysteryMultiplayerParticipantSession(code: string): MultiplayerParticipantSession | null {
  const sessionStorage = browserStorage("sessionStorage");

  if (!sessionStorage) {
    return null;
  }

  try {
    const rawValue = sessionStorage.getItem(participantSessionKey(code));
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;

    return parsedValue && typeof parsedValue.participantId === "string" ? parsedValue : null;
  } catch {
    return null;
  }
}

export function forgetMysteryMultiplayerParticipant(code: string) {
  const sessionStorage = browserStorage("sessionStorage");

  if (!sessionStorage) {
    return;
  }

  safeStorage(sessionStorage, (storage) => storage.removeItem(participantSessionKey(code)));
}

export function normalizeMysteryLobbyCode(code: string) {
  return code.trim().toUpperCase();
}

export function buildMysteryMultiplayerSettings(
  settings: MysteryDraftSettings,
): MysteryDraftMultiplayerSettings {
  const bidTimerSeconds = 20;
  const revealDurationSeconds = 4;
  const minimumBid = settings.minimumOffer;
  const bidIncrement = settings.offerIncrement;

  return {
    ...settings,
    bidIncrement,
    bidTimerSeconds,
    gameMode: "multiplayer",
    highestBidWins: true,
    minimumBid,
    multiplayer: {
      bidTimerSeconds,
      highestBidWins: true,
      noMarketRange: true,
      revealAllBidsAfterRound: false,
      revealDurationSeconds,
    },
    noMarketRange: true,
    poolSize: 30,
    revealAllBidsAfterRound: false,
    revealDurationSeconds,
  };
}

export function createMysteryMultiplayerLobby({
  clientId,
  hostName,
  settings,
}: {
  clientId: string;
  hostName: string;
  settings: MysteryDraftMultiplayerSettings;
}) {
  return postApiJson<MultiplayerLobbyResponse>("/api/mystery-draft/multiplayer/lobbies", {
    clientId,
    hostName,
    settings,
  });
}

export function joinMysteryMultiplayerLobby({
  clientId,
  code,
  playerName,
}: {
  clientId: string;
  code: string;
  playerName: string;
}) {
  return postApiJson<MultiplayerLobbyResponse>("/api/mystery-draft/multiplayer/lobbies/join", {
    clientId,
    code: normalizeMysteryLobbyCode(code),
    playerName,
  });
}

export function getMysteryMultiplayerLobby(codeOrId: string) {
  return requestApiJson<MultiplayerLobbySnapshot>(
    `/api/mystery-draft/multiplayer/lobbies/${encodeURIComponent(codeOrId)}`,
  );
}

export function leaveMysteryMultiplayerLobby({
  lobbyId,
  participantId,
}: {
  lobbyId: string;
  participantId: string;
}) {
  return postApiJson<MultiplayerLobbySnapshot>(
    `/api/mystery-draft/multiplayer/lobbies/${encodeURIComponent(lobbyId)}/leave`,
    { participantId },
  );
}

export function startMysteryMultiplayerLobby({
  lobbyId,
  participantId,
}: {
  lobbyId: string;
  participantId: string;
}) {
  return postApiJson<MultiplayerGameState>(
    `/api/mystery-draft/multiplayer/lobbies/${encodeURIComponent(lobbyId)}/start`,
    { participantId },
  );
}

export function getMysteryMultiplayerGameState(codeOrId: string, participantId?: string | null) {
  const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";

  return requestApiJson<MultiplayerGameState>(
    `/api/mystery-draft/multiplayer/games/${encodeURIComponent(codeOrId)}/state${query}`,
  );
}

export function submitMysteryMultiplayerBid({
  amount,
  codeOrId,
  participantId,
  roundId,
}: {
  amount: number;
  codeOrId: string;
  participantId: string;
  roundId: string;
}) {
  return postApiJson<MultiplayerGameState>(
    `/api/mystery-draft/multiplayer/games/${encodeURIComponent(codeOrId)}/bids`,
    {
      amount,
      participantId,
      roundId,
    },
  );
}
