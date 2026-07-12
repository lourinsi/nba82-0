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
  id: string;
  isActive: boolean;
  isHost: boolean;
  joinedAt: string;
  name: string;
};

export type MultiplayerLobby = {
  code: string;
  id: string;
  settings: MysteryDraftMultiplayerSettings;
  stateVersion: number;
  status: MultiplayerLobbyStatus;
};

export type MultiplayerLobbySnapshot = {
  lobby: MultiplayerLobby;
  participants: MultiplayerParticipant[];
};

export type MultiplayerLobbyResponse = MultiplayerLobbySnapshot & {
  participant: MultiplayerParticipant;
  participantToken: string;
};

export type MultiplayerGameStatus = "active" | "completed";
export type MultiplayerRoundStatus = "bidding" | "revealed" | "completed";

export type MultiplayerAuctionPlayer = {
  playerImageUrl: string | null;
  playerName: string;
  possibleYearRange: string;
  rawStats?: {
    apg: number | null;
    mpg: number | null;
    ppg: number | null;
    rpg: number | null;
    tsStarPct: number | null;
    weightedWs48: number | null;
  };
  seasonLabel: string | null;
  team: string | null;
  truePrice: number | null;
};

export type MultiplayerRound = {
  awardReason: "highest_bid" | "richest_no_bid" | "sole_incomplete_auto_assign" | "skipped" | null;
  bidEndsAt: string;
  id: string;
  noBid: boolean;
  revealEndsAt: string | null;
  roundIndex: number;
  status: MultiplayerRoundStatus;
  winnerParticipantId: string | null;
  winningBid: number | null;
};

export type MultiplayerBid = {
  amount: number | null;
  hasSubmittedBid: boolean;
  isOwnSubmission: boolean;
  isPass: boolean | null;
  participantId: string;
};

export type MultiplayerGame = {
  poolSize: number;
  rosterSize: number;
  settings: MysteryDraftMultiplayerSettings;
  stateVersion: number;
  status: MultiplayerGameStatus;
  totalRounds: number;
};

export type MultiplayerRosterPick = {
  id: string;
  paidAmount: number;
  playerName: string;
  seasonLabel: string | null;
  team: string | null;
};

export type MultiplayerRoster = {
  count: number;
  isFull: boolean;
  participantId: string;
  participantName: string;
  picks: MultiplayerRosterPick[];
  remainingBudget: number;
  rosterSize: number;
  totalScore: number;
};

export type MultiplayerGameState = {
  bids: MultiplayerBid[];
  currentPlayer: MultiplayerAuctionPlayer | null;
  currentRound: MultiplayerRound | null;
  fastForward: {
    active: boolean;
    assignmentPrice?: number;
    participantId?: string;
    participantName?: string;
  };
  game: MultiplayerGame | null;
  lobby: MultiplayerLobby;
  participants: MultiplayerParticipant[];
  rosters: MultiplayerRoster[];
  serverTime: string;
  stateVersion: number;
};

export type MultiplayerParticipantSession = {
  clientId: string;
  participantId: string;
  participantToken: string;
};

export type MultiplayerResultsPick = {
  finalScore: number;
  paidAmount: number;
  playerName: string;
  seasonLabel: string | null;
  stats?: {
    assists: number | null;
    points: number | null;
    pra: number | null;
    rebounds: number | null;
    tsStarPct: number | null;
    ws48: number | null;
  };
  team: string | null;
};

export type MultiplayerProjectedRecord = {
  losses: number;
  wins: number;
};

export type MultiplayerResultsStanding = {
  name: string;
  participantId: string;
  projectedRecord: MultiplayerProjectedRecord;
  rank: number;
  remainingBudget: number;
  totalScore: number;
};

export type MultiplayerResultsRoster = {
  name: string;
  participantId: string;
  picks: MultiplayerResultsPick[];
  projectedRecord: MultiplayerProjectedRecord;
  rank: number | null;
  remainingBudget: number;
  totalScore: number;
};

export type MultiplayerResultsResponse = {
  game: Pick<MultiplayerGame, "poolSize" | "rosterSize" | "status" | "totalRounds"> & {
    currentRoundIndex: number;
    id: string;
  };
  lobby: Pick<MultiplayerLobby, "code" | "id" | "status">;
  participants: MultiplayerParticipant[];
  rosters: MultiplayerResultsRoster[];
  standings: MultiplayerResultsStanding[];
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

  let existingClientId: string | null = null;

  try {
    existingClientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  } catch {
    return randomClientId();
  }

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

export function rememberMysteryMultiplayerParticipant(
  code: string,
  participantSession: MultiplayerParticipantSession,
) {
  const sessionStorage = browserStorage("sessionStorage");

  if (!sessionStorage) {
    return;
  }

  const value = JSON.stringify(participantSession);

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

    return parsedValue &&
      typeof parsedValue.clientId === "string" &&
      typeof parsedValue.participantId === "string" &&
      typeof parsedValue.participantToken === "string"
      ? parsedValue
      : null;
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
    poolSize: 0,
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

export function getMysteryMultiplayerLobby(codeOrId: string, signal?: AbortSignal, knownStateVersion?: number | null) {
  return requestApiJson<MultiplayerLobbySnapshot | null>(
    `/api/mystery-draft/multiplayer/lobbies/${encodeURIComponent(codeOrId)}`,
    {
      headers: Number.isSafeInteger(knownStateVersion)
        ? { "X-Known-State-Version": String(knownStateVersion) }
        : undefined,
      signal,
    },
  );
}

export function leaveMysteryMultiplayerLobby({
  lobbyId,
  participantToken,
  signal,
}: {
  lobbyId: string;
  participantToken: string;
  signal?: AbortSignal;
}) {
  return requestApiJson<MultiplayerLobbySnapshot>(
    `/api/mystery-draft/multiplayer/lobbies/${encodeURIComponent(lobbyId)}/leave`,
    {
      body: JSON.stringify({ participantToken }),
      method: "POST",
      signal,
    },
  );
}

export function startMysteryMultiplayerLobby({
  lobbyId,
  participantToken,
  signal,
}: {
  lobbyId: string;
  participantToken: string;
  signal?: AbortSignal;
}) {
  return requestApiJson<MultiplayerGameState>(
    `/api/mystery-draft/multiplayer/lobbies/${encodeURIComponent(lobbyId)}/start`,
    {
      body: JSON.stringify({ participantToken }),
      method: "POST",
      signal,
    },
  );
}

export function getMysteryMultiplayerGameState(
  codeOrId: string,
  {
    participantToken,
    signal,
    knownStateVersion,
  }: {
    participantToken?: string | null;
    signal?: AbortSignal;
    knownStateVersion?: number | null;
  } = {},
) {
  return requestApiJson<MultiplayerGameState | null>(
    `/api/mystery-draft/multiplayer/games/${encodeURIComponent(codeOrId)}/state`,
    {
      headers: {
        ...(Number.isSafeInteger(knownStateVersion)
          ? { "X-Known-State-Version": String(knownStateVersion) }
          : {}),
        ...(participantToken ? { "X-Multiplayer-Participant-Token": participantToken } : {}),
      },
      signal,
    },
  );
}

export function getMysteryMultiplayerResults(codeOrId: string, signal?: AbortSignal) {
  return requestApiJson<MultiplayerResultsResponse>(
    `/api/mystery-draft/multiplayer/games/${encodeURIComponent(codeOrId)}/results`,
    { signal },
  );
}

export function submitMysteryMultiplayerBid({
  amount,
  codeOrId,
  participantToken,
  roundId,
  signal,
}: {
  amount: number;
  codeOrId: string;
  participantToken: string;
  roundId: string;
  signal?: AbortSignal;
}) {
  return requestApiJson<MultiplayerGameState>(
    `/api/mystery-draft/multiplayer/games/${encodeURIComponent(codeOrId)}/bids`,
    {
      body: JSON.stringify({
        amount,
        participantToken,
        roundId,
      }),
      method: "POST",
      signal,
    },
  );
}
