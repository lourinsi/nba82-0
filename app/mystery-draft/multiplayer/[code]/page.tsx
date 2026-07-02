"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  Ban,
  CheckCircle2,
  Clipboard,
  Clock3,
  Crown,
  Gavel,
  Hourglass,
  LogOut,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import {
  colorModeSnapshot,
  setGameHeaderState,
  subscribeToColorMode,
} from "../../../clientPreferences";
import {
  mysteryDraftYearsLabel,
  mysterySeasonPoolLabel,
} from "../../mysteryDraftGame";
import {
  forgetMysteryMultiplayerParticipant,
  getMysteryMultiplayerGameState,
  getMysteryMultiplayerLobby,
  leaveMysteryMultiplayerLobby,
  normalizeMysteryLobbyCode,
  readMysteryMultiplayerParticipantSession,
  startMysteryMultiplayerLobby,
  submitMysteryMultiplayerBid,
  type MultiplayerAuctionPlayer,
  type MultiplayerGameState,
  type MultiplayerLobbySnapshot,
  type MultiplayerParticipant,
  type MultiplayerParticipantSession,
  type MultiplayerRoster,
  type MultiplayerRound,
} from "../../multiplayerClient";
import { STAT_MODE_LABELS, normalizeStatMode } from "../../../scoring";

const WAITING_POLL_MS = 3000;
const ACTIVE_POLL_MS = 1000;
const UNKNOWN_PLAYER_IMAGE = "/images/players/unknown-player.png";

function formatMoney(value: number | null | undefined) {
  const numeric = Number(value || 0);

  return `$${Math.round(numeric).toLocaleString()}`;
}

function formatScore(value: number | null | undefined) {
  const numeric = Number(value || 0);

  return numeric.toFixed(1);
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatSettingValue(value: boolean) {
  return value ? "On" : "Off";
}

function secondsUntil(value: string | null | undefined, nowMs: number) {
  if (!value || nowMs <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(value).getTime() - nowMs) / 1000));
}

function settingChips(snapshot: MultiplayerLobbySnapshot) {
  const settings = snapshot.lobby.settings;
  const statMode = normalizeStatMode(settings.statMode);

  return [
    { label: "Stat", value: STAT_MODE_LABELS[statMode] },
    { label: "Season", value: mysterySeasonPoolLabel(settings.seasonPool) },
    { label: "Years", value: mysteryDraftYearsLabel(settings) },
    { label: "Roster", value: `${settings.rosterSize}` },
    { label: "Salary", value: formatMoney(settings.salaryCap) },
    { label: "Timer", value: `${settings.bidTimerSeconds ?? settings.multiplayer.bidTimerSeconds}s` },
    { label: "Reveal Season", value: formatSettingValue(settings.revealTrueSeason) },
    { label: "Reveal Price", value: formatSettingValue(settings.revealTruePrice) },
    { label: "Market Range", value: "Off" },
  ];
}

function snapshotFromGameState(state: MultiplayerGameState): MultiplayerLobbySnapshot {
  return {
    lobby: state.lobby,
    participants: state.participants,
  };
}

function participantName(participants: MultiplayerParticipant[], participantId: string | null | undefined) {
  return participants.find((participant) => participant.id === participantId)?.name ?? "Player";
}

function playerSeasonDisplay(player: MultiplayerAuctionPlayer, state: MultiplayerGameState) {
  const settings = state.game?.settings ?? state.lobby.settings;

  if (settings.revealTrueSeason) {
    return {
      seasonLabel: `${player.team} ${player.seasonLabel}`,
      shouldShowPossibleSeasons: false,
    };
  }

  return {
    seasonLabel: `${player.team} - Possible seasons: ${player.possibleYearRange}`,
    shouldShowPossibleSeasons: true,
  };
}

function statLabel(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "--";
}

function submissionForParticipant(gameState: MultiplayerGameState, participantId: string | null | undefined) {
  return gameState.bids.find((bid) => bid.participantId === participantId) ?? null;
}

function activeSubmissionTotal(gameState: MultiplayerGameState) {
  const settings = gameState.game?.settings ?? gameState.lobby.settings;
  const openRosters = gameState.rosters.filter(
    (roster) => !roster.isFull && roster.remainingBudget >= settings.minimumBid,
  );

  return openRosters.length || gameState.participants.length;
}

function bidPanelMessage({
  bidAmount,
  hasSubmitted,
  isBidding,
  minimumBid,
  remainingBudget,
  rosterFull,
  secondsLeft,
}: {
  bidAmount: number;
  hasSubmitted: boolean;
  isBidding: boolean;
  minimumBid: number;
  remainingBudget: number;
  rosterFull: boolean;
  secondsLeft: number;
}) {
  if (hasSubmitted) {
    return "Bid already submitted.";
  }

  if (rosterFull) {
    return "Roster full.";
  }

  if (!isBidding || secondsLeft <= 0) {
    return "Bidding is closed.";
  }

  if (!Number.isFinite(bidAmount)) {
    return "Enter a whole-dollar bid.";
  }

  if (bidAmount < minimumBid) {
    return `Minimum secret bid is ${formatMoney(minimumBid)}.`;
  }

  if (bidAmount > remainingBudget) {
    return "Bid exceeds remaining budget.";
  }

  return null;
}

function MultiplayerAuctionCard({
  currentPlayer,
  gameState,
  round,
}: {
  currentPlayer: MultiplayerAuctionPlayer | null;
  gameState: MultiplayerGameState;
  round: MultiplayerRound | null;
}) {
  if (!currentPlayer) {
    return (
      <section className="mystery-multiplayer-panel mystery-auction-card">
        <span className="mystery-kicker">Auction</span>
        <strong>No active player</strong>
      </section>
    );
  }

  const settings = gameState.game?.settings ?? gameState.lobby.settings;
  const seasonDisplay = playerSeasonDisplay(currentPlayer, gameState);
  const gameComplete = gameState.game?.status === "completed";
  const cardKicker = gameComplete
    ? "Game Complete"
    : round?.status === "revealed" || round?.status === "completed"
      ? "Bid Reveal"
      : "Now Bidding";

  return (
    <section className="mystery-multiplayer-panel mystery-auction-card">
      <div className="mystery-auction-card-media">
        <img
          alt={currentPlayer.playerName}
          src={currentPlayer.playerImageUrl || UNKNOWN_PLAYER_IMAGE}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = UNKNOWN_PLAYER_IMAGE;
          }}
        />
      </div>
      <div className="mystery-auction-card-copy">
        <span className="mystery-kicker">{cardKicker}</span>
        <h2>{currentPlayer.playerName}</h2>
        <p>{seasonDisplay.seasonLabel}</p>
        {settings.revealTruePrice ? (
          <div className="mystery-auction-facts mystery-auction-facts-price">
            <span>
              <small>True Price</small>
              <strong>{formatMoney(currentPlayer.truePrice)}</strong>
            </span>
          </div>
        ) : null}
        <div className="mystery-auction-stats">
          <span>
            <small>PTS</small>
            <strong>{statLabel(currentPlayer.rawStats?.ppg)}</strong>
          </span>
          <span>
            <small>REB</small>
            <strong>{statLabel(currentPlayer.rawStats?.rpg)}</strong>
          </span>
          <span>
            <small>AST</small>
            <strong>{statLabel(currentPlayer.rawStats?.apg)}</strong>
          </span>
          <span>
            <small>MPG</small>
            <strong>{statLabel(currentPlayer.rawStats?.mpg)}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

function MultiplayerBidPanel({
  actionError,
  currentParticipant,
  gameState,
  nowMs,
  onBidSubmitted,
  setActionError,
}: {
  actionError: string | null;
  currentParticipant: MultiplayerParticipant | null;
  gameState: MultiplayerGameState;
  nowMs: number;
  onBidSubmitted: (state: MultiplayerGameState) => void;
  setActionError: (message: string | null) => void;
}) {
  const settings = gameState.game?.settings ?? gameState.lobby.settings;
  const round = gameState.currentRound;
  const myRoster = gameState.rosters.find((roster) => roster.participantId === currentParticipant?.id) ?? null;
  const remainingBudget = myRoster?.remainingBudget ?? 0;
  const rosterFull = Boolean(myRoster?.isFull);
  const minimumBid = settings.minimumBid;
  const secondsLeft = secondsUntil(round?.bidEndsAt, nowMs);
  const ownSubmission = submissionForParticipant(gameState, currentParticipant?.id);
  const hasSubmitted = Boolean(ownSubmission);
  const isBidding = round?.status === "bidding" && gameState.game?.status === "active" && secondsLeft > 0;
  const submittedCount = gameState.bids.length;
  const submissionTotal = activeSubmissionTotal(gameState);
  const [bidDraft, setBidDraft] = useState<{ roundId: string | null; value: string }>({
    roundId: null,
    value: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const bidText = bidDraft.roundId === round?.id ? bidDraft.value : String(minimumBid);
  const bidAmount = Number(bidText);
  const validationMessage = bidPanelMessage({
    bidAmount,
    hasSubmitted,
    isBidding,
    minimumBid,
    remainingBudget,
    rosterFull,
    secondsLeft,
  });
  const submitDisabled = submitting || !currentParticipant || !round || Boolean(validationMessage);
  const passDisabled = submitting || !currentParticipant || !round || !isBidding || rosterFull || hasSubmitted;

  async function submitAmount(amount: number) {
    if (!currentParticipant || !round || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      const nextState = await submitMysteryMultiplayerBid({
        amount,
        codeOrId: gameState.lobby.code,
        participantId: currentParticipant.id,
        roundId: round.id,
      });

      onBidSubmitted(nextState);
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Unable to submit bid.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitBid() {
    if (submitDisabled) {
      return;
    }

    await submitAmount(bidAmount);
  }

  async function handlePassBid() {
    if (passDisabled) {
      return;
    }

    await submitAmount(0);
  }

  const ownSubmissionLabel = ownSubmission
    ? ownSubmission.amount && ownSubmission.amount > 0
      ? `Your bid: ${formatMoney(ownSubmission.amount)}`
      : "No bid/pass"
    : null;
  const closedLabel =
    gameState.game?.status === "completed"
      ? "Game complete"
      : round?.status === "revealed" || round?.status === "completed"
        ? "Round reveal in progress"
        : "Bidding is closed";

  return (
    <section className="mystery-multiplayer-panel mystery-bid-panel">
      <div className="mystery-multiplayer-panel-title">
        <Gavel size={18} />
        <h2>Secret Bid</h2>
      </div>
      <div className="mystery-bid-status-grid">
        <span>
          <small>Secret Bid</small>
          <strong>{hasSubmitted ? "Submitted" : "Hidden"}</strong>
        </span>
        <span>
          <small>Your Budget</small>
          <strong>{formatMoney(remainingBudget)}</strong>
        </span>
        <span>
          <small>Submitted</small>
          <strong>
            {submittedCount}/{submissionTotal}
          </strong>
        </span>
      </div>
      {hasSubmitted ? (
        <div className="mystery-submission-receipt">
          <CheckCircle2 size={20} />
          <div>
            <strong>Bid submitted</strong>
            <span>{ownSubmissionLabel}</span>
            {gameState.currentRound?.status === "bidding" ? <small>Waiting for other players.</small> : null}
          </div>
        </div>
      ) : !isBidding ? (
        <div className="mystery-submission-receipt mystery-submission-receipt-muted">
          <Hourglass size={20} />
          <div>
            <strong>{closedLabel}</strong>
            <span>No new secret bids are being accepted.</span>
          </div>
        </div>
      ) : (
        <>
          <label className="mystery-bid-input">
            <span>Bid Amount</span>
            <input
              disabled={!isBidding || rosterFull || submitting}
              inputMode="numeric"
              min={minimumBid}
              step={settings.bidIncrement}
              type="number"
              value={bidText}
              onChange={(event) => setBidDraft({ roundId: round?.id ?? null, value: event.target.value })}
            />
          </label>
          <div className="mystery-bid-actions">
            <button
              className="mystery-primary-button"
              disabled={submitDisabled}
              type="button"
              onClick={handleSubmitBid}
            >
              <Send size={18} />
              {submitting ? "Submitting..." : "Submit Secret Bid"}
            </button>
            <button
              className="mystery-secondary-button"
              disabled={passDisabled}
              type="button"
              onClick={handlePassBid}
            >
              <Ban size={18} />
              No Bid/Pass
            </button>
          </div>
        </>
      )}
      {validationMessage && !hasSubmitted && isBidding ? <p className="mystery-bid-note">{validationMessage}</p> : null}
      {actionError ? <p className="mystery-validation">{actionError}</p> : null}
    </section>
  );
}

function MultiplayerSubmissionPanel({
  currentParticipant,
  gameState,
}: {
  currentParticipant: MultiplayerParticipant | null;
  gameState: MultiplayerGameState;
}) {
  const settings = gameState.game?.settings ?? gameState.lobby.settings;
  const round = gameState.currentRound;
  const bidByParticipantId = new Map(gameState.bids.map((bid) => [bid.participantId, bid]));
  const rosterByParticipantId = new Map(gameState.rosters.map((roster) => [roster.participantId, roster]));
  const submittedCount = gameState.bids.length;
  const submissionTotal = activeSubmissionTotal(gameState);
  const revealAllAmounts = Boolean(round && round.status !== "bidding");
  const winnerName =
    revealAllAmounts && !round?.noBid ? participantName(gameState.participants, round?.winnerParticipantId) : null;

  return (
    <section className="mystery-multiplayer-panel mystery-submission-panel">
      <div className="mystery-multiplayer-panel-title">
        <Activity size={18} />
        <h2>{revealAllAmounts ? "Final Bids" : "Submissions"}</h2>
        <span>
          {submittedCount}/{submissionTotal}
        </span>
      </div>
      {winnerName ? (
        <div className="mystery-submission-winner">
          <small>Highest Bidder</small>
          <strong>
            {winnerName} - {formatMoney(round?.winningBid)}
          </strong>
        </div>
      ) : null}
      <div className="mystery-feed-list">
        {gameState.participants.map((participant) => {
          const bid = bidByParticipantId.get(participant.id) ?? null;
          const roster = rosterByParticipantId.get(participant.id) ?? null;
          const canShowAmount = Boolean(bid && (revealAllAmounts || bid.isOwnSubmission));
          const amountLabel = bid?.amount && bid.amount > 0 ? formatMoney(bid.amount) : "No bid/pass";
          const statusLabel = bid
            ? canShowAmount
              ? amountLabel
              : "Submitted"
            : roster?.isFull || (roster && roster.remainingBudget < settings.minimumBid)
              ? "Inactive"
              : "Waiting";
          const isCurrentParticipant = participant.id === currentParticipant?.id;

          return (
            <div
              className={`mystery-feed-row ${bid ? "mystery-feed-row-submitted" : "mystery-feed-row-waiting"}`}
              key={participant.id}
            >
              <span>
                {participant.name}
                {isCurrentParticipant ? " (You)" : ""}
              </span>
              <strong>{statusLabel}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MultiplayerRevealPanel({
  currentPlayer,
  gameState,
}: {
  currentPlayer: MultiplayerAuctionPlayer | null;
  gameState: MultiplayerGameState;
}) {
  const round = gameState.currentRound;

  if (!round || (round.status !== "revealed" && round.status !== "completed")) {
    return null;
  }

  const winnerName = participantName(gameState.participants, round.winnerParticipantId);

  return (
    <section className="mystery-multiplayer-panel mystery-reveal-panel">
      <div className="mystery-multiplayer-panel-title">
        <Sparkles size={18} />
        <h2>Result</h2>
      </div>
      {round.noBid ? (
        <strong>No bids. Player skipped.</strong>
      ) : (
        <strong>
          {winnerName} wins {currentPlayer?.playerName ?? "the player"} for {formatMoney(round.winningBid)}
        </strong>
      )}
      {gameState.game?.status === "completed" ? <span>Game complete.</span> : <span>Next player coming...</span>}
    </section>
  );
}

function MultiplayerRosterBoard({ rosters }: { rosters: MultiplayerRoster[] }) {
  return (
    <section className="mystery-multiplayer-panel mystery-roster-board">
      <div className="mystery-multiplayer-panel-title">
        <Users size={18} />
        <h2>Rosters</h2>
      </div>
      <div className="mystery-roster-grid">
        {rosters.map((roster) => (
          <article className="mystery-roster-card" key={roster.participantId}>
            <header>
              <div>
                <strong>{roster.participantName}</strong>
                <span>
                  {roster.count}/{roster.rosterSize} players
                </span>
              </div>
              <div>
                <strong>{formatMoney(roster.remainingBudget)}</strong>
                <span>{formatScore(roster.totalScore)} pts</span>
              </div>
            </header>
            {roster.picks.length ? (
              <div className="mystery-roster-picks">
                {roster.picks.map((pick) => (
                  <span key={pick.id}>
                    {pick.playerName}
                    <small>
                      {pick.team ? `${pick.team} ` : ""}
                      {pick.seasonLabel ?? ""} - {formatMoney(pick.paidAmount)}
                    </small>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mystery-empty-copy">No drafted players yet.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function MultiplayerResults({ gameState }: { gameState: MultiplayerGameState }) {
  if (gameState.game?.status !== "completed") {
    return null;
  }

  return (
    <section className="mystery-multiplayer-panel mystery-results-panel">
      <div className="mystery-multiplayer-panel-title">
        <Trophy size={18} />
        <h2>Final Results</h2>
      </div>
      <div className="mystery-results-list">
        {gameState.standings.map((standing) => (
          <article className="mystery-result-row" key={standing.participantId}>
            <div className="mystery-result-rank">
              {standing.rank === 1 ? <Crown size={18} /> : null}
              <strong>#{standing.rank}</strong>
            </div>
            <div>
              <strong>{standing.participantName}</strong>
              <span>
                {formatScore(standing.totalScore)} pts - {formatMoney(standing.remainingBudget)} left
              </span>
            </div>
            <div>
              <span>Best: {standing.bestPick?.playerName ?? "--"}</span>
              <span>Price: {standing.mostExpensivePick ? formatMoney(standing.mostExpensivePick.paidAmount) : "--"}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MultiplayerSyncBanner({
  error,
  gameState,
  hasRecentFailure,
  isRefreshing,
}: {
  error: string | null;
  gameState: MultiplayerGameState;
  hasRecentFailure: boolean;
  isRefreshing: boolean;
}) {
  if (!error && !hasRecentFailure && (!isRefreshing || gameState.game?.status === "completed")) {
    return null;
  }

  const message = error || hasRecentFailure
    ? "Having trouble syncing. Keeping the latest game state on screen."
    : gameState.currentRound?.status === "revealed"
      ? "Loading the next player..."
      : "Syncing game state...";

  return (
    <section className="mystery-sync-banner" role={error ? "status" : undefined}>
      <Hourglass size={16} />
      <span>{message}</span>
    </section>
  );
}

function MultiplayerGameScreen({
  actionError,
  copied,
  currentParticipant,
  gameState,
  nowMs,
  onCopyCode,
  onBidSubmitted,
  setActionError,
}: {
  actionError: string | null;
  copied: boolean;
  currentParticipant: MultiplayerParticipant | null;
  gameState: MultiplayerGameState;
  nowMs: number;
  onCopyCode: () => void;
  onBidSubmitted: (state: MultiplayerGameState) => void;
  setActionError: (message: string | null) => void;
}) {
  const round = gameState.currentRound;
  const game = gameState.game;
  const secondsLeft = secondsUntil(round?.bidEndsAt, nowMs);
  const revealSecondsLeft = secondsUntil(round?.revealEndsAt, nowMs);

  return (
    <>
      <section className="mystery-game-topbar">
        <div className="mystery-game-code-cell">
          <span className="mystery-kicker">Lobby Code</span>
          <strong>{gameState.lobby.code}</strong>
          <button className="mystery-secondary-button mystery-game-code-copy" type="button" onClick={onCopyCode}>
            <Clipboard size={16} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div>
          <span className="mystery-kicker">Status</span>
          <strong>{game?.status === "completed" ? "Completed" : round?.status ?? "Starting"}</strong>
        </div>
        <div>
          <span className="mystery-kicker">Round</span>
          <strong>
            {round ? round.roundIndex + 1 : 0}/{game?.poolSize ?? 0}
          </strong>
        </div>
        <div>
          <span className="mystery-kicker">Timer</span>
          <strong>
            <Clock3 size={18} />
            {round?.status === "revealed" ? formatTimer(revealSecondsLeft) : formatTimer(secondsLeft)}
          </strong>
        </div>
      </section>

      <section className="mystery-budget-strip">
        {gameState.rosters.map((roster) => (
          <span key={roster.participantId}>
            <small>{roster.participantName}</small>
            <strong>{formatMoney(roster.remainingBudget)}</strong>
            <em>
              {roster.count}/{roster.rosterSize}
            </em>
          </span>
        ))}
      </section>

      <section className="mystery-game-grid">
        <div className="mystery-game-main">
          <MultiplayerAuctionCard currentPlayer={gameState.currentPlayer} gameState={gameState} round={round} />
          <MultiplayerRevealPanel currentPlayer={gameState.currentPlayer} gameState={gameState} />
          <MultiplayerRosterBoard rosters={gameState.rosters} />
          <MultiplayerResults gameState={gameState} />
        </div>
        <aside className="mystery-game-side">
          <MultiplayerBidPanel
            actionError={actionError}
            currentParticipant={currentParticipant}
            gameState={gameState}
            nowMs={nowMs}
            onBidSubmitted={onBidSubmitted}
            setActionError={setActionError}
          />
          <MultiplayerSubmissionPanel currentParticipant={currentParticipant} gameState={gameState} />
        </aside>
      </section>
    </>
  );
}

export default function MysteryMultiplayerLobbyPage() {
  const router = useRouter();
  const params = useParams<{ code?: string }>();
  const lightMode = useSyncExternalStore(subscribeToColorMode, colorModeSnapshot, () => false);
  const code = normalizeMysteryLobbyCode(String(params.code || ""));
  const [snapshot, setSnapshot] = useState<MultiplayerLobbySnapshot | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [participantSession, setParticipantSession] = useState<MultiplayerParticipantSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchFailureCount, setFetchFailureCount] = useState(0);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);
  const snapshotRef = useRef<MultiplayerLobbySnapshot | null>(null);
  const displaySnapshot = gameState ? snapshotFromGameState(gameState) : snapshot;

  const currentParticipant = useMemo(() => {
    if (!displaySnapshot || !participantSession) {
      return null;
    }

    return (
      displaySnapshot.participants.find((participant) => participant.id === participantSession.participantId) ||
      displaySnapshot.participants.find(
        (participant) => participantSession.clientId && participant.clientId === participantSession.clientId,
      ) ||
      null
    );
  }, [displaySnapshot, participantSession]);
  const hostParticipant = displaySnapshot?.participants.find((participant) => participant.isHost) ?? null;
  const isHost = Boolean(currentParticipant?.isHost);
  const settingsSummary = displaySnapshot ? settingChips(displaySnapshot) : [];
  const viewerParticipantId = participantSession?.participantId ?? null;
  const shouldPoll = gameState?.game?.status !== "completed";
  const pollMs = gameState?.game?.status === "active" ? ACTIVE_POLL_MS : WAITING_POLL_MS;

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const fetchLobbyOrGame = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!code) {
      setError("Lobby code is missing.");
      setLoading(false);
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    const currentGameState = gameStateRef.current;
    const currentSnapshot = snapshotRef.current;
    const hasUsableState = Boolean(currentGameState || currentSnapshot);
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    inFlightRef.current = true;

    if (!silent && !hasUsableState) {
      setLoading(true);
    }

    if (hasUsableState) {
      setIsRefreshing(true);
    }

    try {
      const shouldFetchGame =
        currentGameState?.game ||
        currentSnapshot?.lobby.status === "started" ||
        currentSnapshot?.lobby.status === "completed";
      if (shouldFetchGame) {
        const nextGameState = await getMysteryMultiplayerGameState(code, viewerParticipantId);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setGameState(nextGameState);
        setSnapshot(snapshotFromGameState(nextGameState));
      } else {
        const lobbySnapshot = await getMysteryMultiplayerLobby(code);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (lobbySnapshot.lobby.status === "started" || lobbySnapshot.lobby.status === "completed") {
          const nextGameState = await getMysteryMultiplayerGameState(code, viewerParticipantId);

          if (requestId !== requestIdRef.current) {
            return;
          }

          setGameState(nextGameState);
          setSnapshot(snapshotFromGameState(nextGameState));
        } else {
          setSnapshot(lobbySnapshot);
        }
      }

      setFetchFailureCount(0);
      setError(null);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const message = fetchError instanceof Error ? fetchError.message : "Unable to load lobby.";

      setFetchFailureCount((previousCount) => {
        const nextCount = previousCount + 1;

        if (!hasUsableState || nextCount >= 3) {
          setError(message);
        }

        return nextCount;
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }

      inFlightRef.current = false;
    }
  }, [code, viewerParticipantId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setParticipantSession(readMysteryMultiplayerParticipantSession(code));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [code]);

  useEffect(() => {
    setGameHeaderState({
      eyebrow: gameState?.game ? "Multiplayer Draft" : "Multiplayer Lobby",
      resetDisabled: false,
      resetLabel: "Back to Mystery Draft",
      showAdjustedStatsToggle: false,
      showReset: false,
      title: gameState?.game
        ? `${gameState.rosters.length} players - Round ${(gameState.currentRound?.roundIndex ?? 0) + 1}`
        : code || "Mystery Draft",
    });

    return () => setGameHeaderState(null);
  }, [code, gameState?.currentRound?.roundIndex, gameState?.game, gameState?.rosters.length]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchLobbyOrGame({ silent: Boolean(gameStateRef.current || snapshotRef.current) });
    }, 0);

    if (!shouldPoll) {
      return () => {
        window.clearTimeout(initialFetch);
      };
    }

    // TODO: Replace polling with realtime events in a later multiplayer step.
    const interval = window.setInterval(() => {
      void fetchLobbyOrGame({ silent: true });
    }, pollMs);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [fetchLobbyOrGame, pollMs, shouldPoll]);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    const timeout = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(() => {
      updateNow();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setActionError("Unable to copy lobby code.");
    }
  }

  async function handleStartLobby() {
    if (!displaySnapshot || !currentParticipant) {
      return;
    }

    try {
      setStarting(true);
      setActionError(null);
      const nextGameState = await startMysteryMultiplayerLobby({
        lobbyId: displaySnapshot.lobby.id,
        participantId: currentParticipant.id,
      });

      setGameState(nextGameState);
      setSnapshot(snapshotFromGameState(nextGameState));
    } catch (startError) {
      setActionError(startError instanceof Error ? startError.message : "Unable to start lobby.");
    } finally {
      setStarting(false);
    }
  }

  async function handleLeaveLobby() {
    if (!displaySnapshot || !currentParticipant) {
      router.push("/mystery-draft");
      return;
    }

    try {
      setLeaving(true);
      setActionError(null);
      await leaveMysteryMultiplayerLobby({
        lobbyId: displaySnapshot.lobby.id,
        participantId: currentParticipant.id,
      });
      forgetMysteryMultiplayerParticipant(displaySnapshot.lobby.code);
      router.push("/mystery-draft");
    } catch (leaveError) {
      setActionError(leaveError instanceof Error ? leaveError.message : "Unable to leave lobby.");
    } finally {
      setLeaving(false);
    }
  }

  function handleBidSubmitted(nextGameState: MultiplayerGameState) {
    setGameState(nextGameState);
    setSnapshot(snapshotFromGameState(nextGameState));
  }

  return (
    <main className={`mystery-page ${lightMode ? "mystery-page-light" : ""}`}>
      <section className="mystery-shell mystery-lobby-shell">
        <section className="mystery-lobby-card mystery-multiplayer-lobby-card mystery-multiplayer-game-card">
          <header className="mystery-lobby-heading">
            <span className="mystery-kicker">Multiplayer Mode</span>
            <h1>{gameState?.game ? "Mystery Draft" : "Mystery Draft Lobby"}</h1>
          </header>

          {loading ? (
            <div className="mystery-multiplayer-status">
              <RefreshCw className="mystery-warmup-spinner" size={34} />
              <strong>Loading Lobby</strong>
            </div>
          ) : error && !displaySnapshot ? (
            <div className="mystery-multiplayer-status">
              <strong>{error}</strong>
              <button className="mystery-secondary-button" type="button" onClick={() => router.push("/mystery-draft")}>
                Back
              </button>
            </div>
          ) : displaySnapshot ? (
            <>
              {!gameState?.game ? (
                <section className="mystery-lobby-code-panel" aria-label="Lobby code">
                <div>
                  <span className="mystery-kicker">Lobby Code</span>
                  <strong>{displaySnapshot.lobby.code}</strong>
                  <p>Share code {displaySnapshot.lobby.code} with friends.</p>
                </div>
                <button className="mystery-secondary-button" type="button" onClick={handleCopyCode}>
                  <Clipboard size={18} />
                  {copied ? "Copied" : "Copy Code"}
                </button>
              </section>
              ) : null}

              {gameState?.game ? (
                <>
                  <MultiplayerSyncBanner
                    error={error}
                    gameState={gameState}
                    hasRecentFailure={fetchFailureCount > 0}
                    isRefreshing={isRefreshing}
                  />
                  <MultiplayerGameScreen
                    actionError={actionError}
                    copied={copied}
                    currentParticipant={currentParticipant}
                    gameState={gameState}
                    nowMs={nowMs}
                    onCopyCode={handleCopyCode}
                    onBidSubmitted={handleBidSubmitted}
                    setActionError={setActionError}
                  />
                  <section className="mystery-multiplayer-actions">
                    <div>
                      <span className="mystery-kicker">You</span>
                      <strong>{currentParticipant?.name ?? "Spectator"}</strong>
                    </div>
                    <button
                      className="mystery-ghost-button"
                      disabled={leaving}
                      type="button"
                      onClick={handleLeaveLobby}
                    >
                      <LogOut size={18} />
                      {leaving ? "Leaving..." : "Leave Lobby"}
                    </button>
                  </section>
                </>
              ) : (
                <>
                  <section className="mystery-multiplayer-grid">
                    <div className="mystery-multiplayer-panel">
                      <div className="mystery-multiplayer-panel-title">
                        <Users size={18} />
                        <h2>Joined Players</h2>
                        <span>{displaySnapshot.participants.length}</span>
                      </div>
                      <div className="mystery-participant-list">
                        {displaySnapshot.participants.map((participant) => (
                          <div className="mystery-participant-row" key={participant.id}>
                            <span>{participant.name}</span>
                            {participant.isHost ? <strong>Host</strong> : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mystery-multiplayer-panel">
                      <div className="mystery-multiplayer-panel-title">
                        <Sparkles size={18} />
                        <h2>Game Settings</h2>
                      </div>
                      <div className="mystery-settings-summary">
                        {settingsSummary.map((setting) => (
                          <span key={setting.label}>
                            <small>{setting.label}</small>
                            <strong>{setting.value}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="mystery-multiplayer-actions">
                    <div>
                      <span className="mystery-kicker">Host</span>
                      <strong>{hostParticipant?.name ?? "Waiting"}</strong>
                    </div>
                    {isHost ? (
                      <button
                        className="mystery-primary-button"
                        disabled={starting}
                        type="button"
                        onClick={handleStartLobby}
                      >
                        <Play size={18} />
                        {starting ? "Starting..." : "Start Game"}
                      </button>
                    ) : (
                      <button className="mystery-secondary-button" disabled type="button">
                        Waiting for host
                      </button>
                    )}
                    <button
                      className="mystery-ghost-button"
                      disabled={leaving}
                      type="button"
                      onClick={handleLeaveLobby}
                    >
                      <LogOut size={18} />
                      {leaving ? "Leaving..." : "Leave Lobby"}
                    </button>
                  </section>
                </>
              )}

              {!currentParticipant && displaySnapshot.lobby.status === "waiting" ? (
                <p className="mystery-validation">Join from the Mystery Draft screen to participate in this lobby.</p>
              ) : null}
              {actionError && !gameState?.game ? <p className="mystery-validation">{actionError}</p> : null}
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
