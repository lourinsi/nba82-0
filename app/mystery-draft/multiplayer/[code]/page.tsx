"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  Ban,
  CheckCircle2,
  Clipboard,
  Clock3,
  Gavel,
  Hourglass,
  LogOut,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { ApiError } from "../../../apiClient";
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

  const targetMs = new Date(value).getTime();

  return Number.isFinite(targetMs) ? Math.max(0, Math.ceil((targetMs - nowMs) / 1000)) : 0;
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
      seasonLabel: [player.team, player.seasonLabel].filter(Boolean).join(" ") || "Mystery season",
      shouldShowPossibleSeasons: false,
    };
  }

  return {
    seasonLabel: `${player.team ? `${player.team} - ` : ""}Possible seasons: ${player.possibleYearRange}`,
    shouldShowPossibleSeasons: true,
  };
}

function statLabel(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "--";
}

function submissionForParticipant(gameState: MultiplayerGameState, participantId: string | null | undefined) {
  return gameState.bids.find((bid) => bid.participantId === participantId && bid.hasSubmittedBid) ?? null;
}

function activeSubmissionTotal(gameState: MultiplayerGameState) {
  const settings = gameState.game?.settings ?? gameState.lobby.settings;
  const activeParticipantIds = new Set(
    gameState.participants.filter((participant) => participant.isActive).map((participant) => participant.id),
  );
  const openRosters = gameState.rosters.filter(
    (roster) =>
      activeParticipantIds.has(roster.participantId) &&
      !roster.isFull &&
      roster.remainingBudget >= settings.minimumBid,
  );

  return openRosters.length;
}

function bidPanelMessage({
  bidAmount,
  hasSubmitted,
  isBidding,
  minimumBid,
  participantActive,
  remainingBudget,
  rosterFull,
  secondsLeft,
}: {
  bidAmount: number;
  hasSubmitted: boolean;
  isBidding: boolean;
  minimumBid: number;
  participantActive: boolean;
  remainingBudget: number;
  rosterFull: boolean;
  secondsLeft: number;
}) {
  if (hasSubmitted) {
    return "Your bid is already locked in.";
  }

  if (!participantActive) {
    return "You are no longer active in this lobby.";
  }

  if (rosterFull) {
    return "Roster full.";
  }

  if (!isBidding || secondsLeft <= 0) {
    return "Bidding is closed.";
  }

  if (!Number.isInteger(bidAmount)) {
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
  onSubmitBid,
  setActionError,
}: {
  actionError: string | null;
  currentParticipant: MultiplayerParticipant | null;
  gameState: MultiplayerGameState;
  nowMs: number;
  onSubmitBid: (request: { amount: number; roundId: string; signal: AbortSignal }) => Promise<void>;
  setActionError: (message: string | null) => void;
}) {
  const settings = gameState.game?.settings ?? gameState.lobby.settings;
  const round = gameState.currentRound;
  const myRoster = gameState.rosters.find((roster) => roster.participantId === currentParticipant?.id) ?? null;
  const remainingBudget = myRoster?.remainingBudget ?? 0;
  const rosterFull = Boolean(myRoster?.isFull);
  const participantActive = currentParticipant ? currentParticipant.isActive : true;
  const minimumBid = settings.minimumBid;
  const secondsLeft = secondsUntil(round?.bidEndsAt, nowMs);
  const ownSubmission = submissionForParticipant(gameState, currentParticipant?.id);
  const hasSubmitted = Boolean(ownSubmission);
  const isBidding = round?.status === "bidding" && gameState.game?.status === "active" && secondsLeft > 0;
  const submittedCount = gameState.bids.filter((bid) => bid.hasSubmittedBid).length;
  const submissionTotal = activeSubmissionTotal(gameState);
  const [bidDraft, setBidDraft] = useState<{ roundId: string | null; value: string }>({
    roundId: null,
    value: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const submitControllerRef = useRef<AbortController | null>(null);
  const bidText = bidDraft.roundId === round?.id ? bidDraft.value : String(minimumBid);
  const bidAmount = Number(bidText);
  const validationMessage = bidPanelMessage({
    bidAmount,
    hasSubmitted,
    isBidding,
    minimumBid,
    participantActive,
    remainingBudget,
    rosterFull,
    secondsLeft,
  });
  const submitDisabled = submitting || !currentParticipant || !round || Boolean(validationMessage);
  const passDisabled =
    submitting || !currentParticipant || !participantActive || !round || !isBidding || rosterFull || hasSubmitted;

  useEffect(() => () => submitControllerRef.current?.abort(), []);

  async function submitAmount(amount: number) {
    if (!currentParticipant || !round || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      const controller = new AbortController();

      submitControllerRef.current?.abort();
      submitControllerRef.current = controller;
      await onSubmitBid({
        amount,
        roundId: round.id,
        signal: controller.signal,
      });
    } catch (submitError) {
      if (!(submitError instanceof DOMException && submitError.name === "AbortError")) {
        setActionError(submitError instanceof Error ? submitError.message : "Unable to submit bid.");
      }
    } finally {
      const controller = submitControllerRef.current;

      if (controller && !controller.signal.aborted) {
        setSubmitting(false);
      }

      submitControllerRef.current = null;
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
            {gameState.currentRound?.status === "bidding" ? <small>Your bid is already locked in.</small> : null}
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
              disabled={!currentParticipant || !participantActive || !isBidding || rosterFull || submitting}
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
  const submittedCount = gameState.bids.filter((bid) => bid.hasSubmittedBid).length;
  const submissionTotal = activeSubmissionTotal(gameState);
  const roundResolved = Boolean(round && round.status !== "bidding");
  const revealAllAmounts = Boolean(roundResolved && settings.revealAllBidsAfterRound);
  const winnerName =
    roundResolved && round?.winnerParticipantId
      ? participantName(gameState.participants, round.winnerParticipantId)
      : null;
  const winnerLabel = round?.awardReason === "richest_no_bid" ? "No-bid Award" : "Highest Bidder";

  return (
    <section className="mystery-multiplayer-panel mystery-submission-panel">
      <div className="mystery-multiplayer-panel-title">
        <Activity size={18} />
        <h2>{revealAllAmounts ? "Final Bids" : roundResolved ? "Bid Result" : "Submissions"}</h2>
        <span>
          {submittedCount}/{submissionTotal}
        </span>
      </div>
      {winnerName ? (
        <div className="mystery-submission-winner">
          <small>{winnerLabel}</small>
          <strong>
            {winnerName} - {formatMoney(round?.winningBid)}
          </strong>
        </div>
      ) : null}
      <div className="mystery-feed-list">
        {gameState.participants.map((participant) => {
          const bid = bidByParticipantId.get(participant.id) ?? null;
          const roster = rosterByParticipantId.get(participant.id) ?? null;
          const hasSubmittedBid = Boolean(bid?.hasSubmittedBid);
          const canShowAmount = Boolean(hasSubmittedBid && bid && (revealAllAmounts || bid.isOwnSubmission));
          const amountLabel = bid?.amount && bid.amount > 0 ? formatMoney(bid.amount) : "No bid/pass";
          const statusLabel = hasSubmittedBid
            ? canShowAmount
              ? amountLabel
              : "Submitted"
            : !participant.isActive || roster?.isFull || (roster && roster.remainingBudget < settings.minimumBid)
              ? "Inactive"
              : "Waiting";
          const isCurrentParticipant = participant.id === currentParticipant?.id;

          return (
            <div
              className={`mystery-feed-row ${hasSubmittedBid ? "mystery-feed-row-submitted" : "mystery-feed-row-waiting"}`}
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
  const automaticAssignment = round.awardReason === "sole_incomplete_auto_assign";
  const noBidAward = round.awardReason === "richest_no_bid" ||
    (round.noBid && round.winnerParticipantId && !automaticAssignment);

  return (
    <section className="mystery-multiplayer-panel mystery-reveal-panel">
      <div className="mystery-multiplayer-panel-title">
        <Sparkles size={18} />
        <h2>Result</h2>
      </div>
      {automaticAssignment ? (
        <strong>
          {winnerName} gets {currentPlayer?.playerName ?? "the player"} for $1
        </strong>
      ) : round.noBid && !round.winnerParticipantId ? (
        <strong>No bids. Player skipped.</strong>
      ) : noBidAward ? (
        <strong>
          {winnerName} gets {currentPlayer?.playerName ?? "the player"} for {formatMoney(round.winningBid)}
        </strong>
      ) : (
        <strong>
          {winnerName} wins {currentPlayer?.playerName ?? "the player"} for {formatMoney(round.winningBid)}
        </strong>
      )}
      {automaticAssignment ? (
        <span>Only one roster remains incomplete. Next player coming...</span>
      ) : round.noBid && !round.winnerParticipantId ? (
        <span>No eligible participant could receive this player.</span>
      ) : noBidAward ? (
        <span>No positive bids. Richest remaining budget wins.</span>
      ) : gameState.game?.status === "completed" ? (
        <span>Game complete.</span>
      ) : (
        <span>Next player coming...</span>
      )}
    </section>
  );
}

function MultiplayerFastForwardPanel({ gameState, nowMs }: { gameState: MultiplayerGameState; nowMs: number }) {
  const fastForward = gameState.fastForward;
  const playerName = gameState.currentPlayer?.playerName ?? "The current player";
  const secondsLeft = secondsUntil(gameState.currentRound?.revealEndsAt, nowMs);

  return (
    <section className="mystery-multiplayer-panel mystery-bid-panel">
      <div className="mystery-multiplayer-panel-title">
        <Sparkles size={18} />
        <h2>Fast Forward</h2>
      </div>
      <div className="mystery-submission-receipt">
        <CheckCircle2 size={20} />
        <div>
          <strong>Only {fastForward.participantName ?? "one player"} still needs players.</strong>
          <span>{playerName} is being assigned for {formatMoney(fastForward.assignmentPrice ?? 1)}.</span>
          <small>Next player in {secondsLeft} seconds...</small>
        </div>
      </div>
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

function MultiplayerSyncBanner({
  error,
  gameState,
  hasRecentFailure,
  isRefreshing,
  nowMs,
}: {
  error: string | null;
  gameState: MultiplayerGameState;
  hasRecentFailure: boolean;
  isRefreshing: boolean;
  nowMs: number;
}) {
  const revealHasExpired =
    gameState.currentRound?.status === "revealed" &&
    gameState.currentRound.revealEndsAt &&
    secondsUntil(gameState.currentRound.revealEndsAt, nowMs) <= 0;
  const biddingHasExpired =
    gameState.currentRound?.status === "bidding" &&
    secondsUntil(gameState.currentRound.bidEndsAt, nowMs) <= 0;
  const gameIsActive = gameState.game?.status !== "completed";
  const transitionMessage = gameIsActive
    ? biddingHasExpired
      ? "Resolving secret bids..."
      : revealHasExpired
        ? "Loading the next player..."
        : isRefreshing && !gameState.currentRound
          ? "Syncing game state..."
          : null
    : null;

  if (!error && !hasRecentFailure && !transitionMessage) {
    return null;
  }

  const message = error
    ? "Having trouble syncing. Keeping the latest game state on screen."
    : hasRecentFailure
      ? "Syncing the latest round..."
      : transitionMessage;

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
  onSubmitBid,
  setActionError,
}: {
  actionError: string | null;
  copied: boolean;
  currentParticipant: MultiplayerParticipant | null;
  gameState: MultiplayerGameState;
  nowMs: number;
  onCopyCode: () => void;
  onSubmitBid: (request: { amount: number; roundId: string; signal: AbortSignal }) => Promise<void>;
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
            {round ? round.roundIndex + 1 : 0}/{game?.totalRounds ?? game?.poolSize ?? 0}
          </strong>
        </div>
        <div>
          <span className="mystery-kicker">Timer</span>
          <strong>
            <Clock3 size={18} />
            {gameState.fastForward.active
              ? `Auto ${formatTimer(revealSecondsLeft)}`
              : round?.status === "revealed"
                ? formatTimer(revealSecondsLeft)
                : formatTimer(secondsLeft)}
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
        </div>
        <aside className="mystery-game-side">
          {gameState.fastForward.active ? (
            <MultiplayerFastForwardPanel gameState={gameState} nowMs={nowMs} />
          ) : (
            <>
              <MultiplayerBidPanel
                actionError={actionError}
                currentParticipant={currentParticipant}
                gameState={gameState}
                key={round?.id ?? "no-round"}
                nowMs={nowMs}
                onSubmitBid={onSubmitBid}
                setActionError={setActionError}
              />
              <MultiplayerSubmissionPanel currentParticipant={currentParticipant} gameState={gameState} />
            </>
          )}
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
  const [participantIdentity, setParticipantIdentity] = useState<{
    code: string;
    session: MultiplayerParticipantSession | null;
  }>({ code: "", session: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchFailureCount, setFetchFailureCount] = useState(0);
  const [clientCanPoll, setClientCanPoll] = useState(true);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const pollControllerRef = useRef<AbortController | null>(null);
  const actionControllerRef = useRef<AbortController | null>(null);
  const actionInFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const serverClockOffsetRef = useRef(0);
  const rateLimitUntilRef = useRef(0);
  const copiedTimeoutRef = useRef<number | null>(null);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);
  const snapshotRef = useRef<MultiplayerLobbySnapshot | null>(null);
  const participantSession = participantIdentity.code === code ? participantIdentity.session : null;
  const identityResolved = participantIdentity.code === code;
  const displaySnapshot = gameState ? snapshotFromGameState(gameState) : snapshot;

  const currentParticipant = useMemo(() => {
    if (!displaySnapshot || !participantSession) {
      return null;
    }

    return displaySnapshot.participants.find((participant) => participant.id === participantSession.participantId) ?? null;
  }, [displaySnapshot, participantSession]);
  const hostParticipant = displaySnapshot?.participants.find((participant) => participant.isHost) ?? null;
  const isHost = Boolean(currentParticipant?.isHost);
  const settingsSummary = displaySnapshot ? settingChips(displaySnapshot) : [];
  const viewerParticipantToken = participantSession?.participantToken ?? null;
  const gameCompleted =
    gameState?.game?.status === "completed" || displaySnapshot?.lobby.status === "completed";
  const shouldPoll = identityResolved && clientCanPoll && !gameCompleted && !leaving;
  const pollMs = gameState?.game?.status === "active" ? ACTIVE_POLL_MS : WAITING_POLL_MS;
  const completedResultsPath = code ? `/mystery-draft/${encodeURIComponent(code)}/results` : "";

  const invalidatePollRequest = useCallback(() => {
    requestIdRef.current += 1;
    pollControllerRef.current?.abort();
    pollControllerRef.current = null;
    inFlightRef.current = false;
  }, []);

  const applyLobbySnapshot = useCallback((nextSnapshot: MultiplayerLobbySnapshot) => {
    if (!mountedRef.current) {
      return;
    }

    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
  }, []);

  const applyGameState = useCallback((nextGameState: MultiplayerGameState, requestStartedAt = Date.now()) => {
    if (!mountedRef.current) {
      return;
    }

    const receivedAt = Date.now();
    const serverTimeMs = new Date(nextGameState.serverTime).getTime();

    if (Number.isFinite(serverTimeMs)) {
      serverClockOffsetRef.current = serverTimeMs - (requestStartedAt + receivedAt) / 2;
      setNowMs(receivedAt + serverClockOffsetRef.current);
    }

    if (gameStateRef.current?.currentRound?.id !== nextGameState.currentRound?.id) {
      setActionError(null);
    }

    gameStateRef.current = nextGameState;
    snapshotRef.current = snapshotFromGameState(nextGameState);
    setGameState(nextGameState);
    setFetchFailureCount(0);
    setError(null);
  }, []);

  const beginAuthoritativeAction = useCallback(() => {
    if (actionInFlightRef.current) {
      return false;
    }

    actionInFlightRef.current = true;
    invalidatePollRequest();
    setIsRefreshing(false);
    return true;
  }, [invalidatePollRequest]);

  const endAuthoritativeAction = useCallback(() => {
    actionInFlightRef.current = false;
  }, []);

  const fetchLobbyOrGame = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!identityResolved || !clientCanPoll || actionInFlightRef.current) {
      return;
    }

    if (Date.now() < rateLimitUntilRef.current) {
      return;
    }

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
    let hasUsableState = Boolean(currentGameState || currentSnapshot);
    const requestId = requestIdRef.current + 1;
    const controller = new AbortController();
    const requestStartedAt = Date.now();

    requestIdRef.current = requestId;
    inFlightRef.current = true;
    pollControllerRef.current = controller;

    if (!silent && !hasUsableState) {
      setLoading(true);
    }

    if (hasUsableState) {
      setIsRefreshing(true);
    }

    try {
      const shouldFetchGame =
        currentGameState?.game ||
        currentSnapshot?.lobby.status === "started";
      if (shouldFetchGame) {
        const nextGameState = await getMysteryMultiplayerGameState(code, {
          knownStateVersion: currentGameState?.stateVersion ?? null,
          participantToken: viewerParticipantToken,
          signal: controller.signal,
        });

        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        if (nextGameState) {
          applyGameState(nextGameState, requestStartedAt);
        }
      } else {
        const lobbySnapshot = await getMysteryMultiplayerLobby(
          code,
          controller.signal,
          currentSnapshot?.lobby.stateVersion ?? null,
        );

        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        if (lobbySnapshot) {
          applyLobbySnapshot(lobbySnapshot);
          hasUsableState = true;
        }

        if (lobbySnapshot?.lobby.status === "started") {
          setIsRefreshing(true);
          const nextGameState = await getMysteryMultiplayerGameState(code, {
            participantToken: viewerParticipantToken,
            signal: controller.signal,
          });

          if (!mountedRef.current || requestId !== requestIdRef.current) {
            return;
          }

          if (nextGameState) {
            applyGameState(nextGameState, requestStartedAt);
          }
        }
      }

      if (mountedRef.current && requestId === requestIdRef.current) {
        setFetchFailureCount(0);
        setError(null);
      }
    } catch (fetchError) {
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current ||
        (fetchError instanceof Error && fetchError.name === "AbortError")
      ) {
        return;
      }

      const message = fetchError instanceof ApiError && fetchError.status === 429
        ? `Sync paused by the server. Retrying in ${fetchError.retryAfterSeconds ?? "a few"} seconds.`
        : fetchError instanceof Error
          ? fetchError.message
          : "Unable to load lobby.";

      if (fetchError instanceof ApiError && fetchError.status === 429) {
        rateLimitUntilRef.current = Date.now() + (fetchError.retryAfterSeconds ?? 3) * 1000;
      }

      setFetchFailureCount((previousCount) => {
        const nextCount = previousCount + 1;

        if (!hasUsableState || nextCount >= 3) {
          setError(message);
        }

        return nextCount;
      });
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
        inFlightRef.current = false;
        pollControllerRef.current = null;
      }
    }
  }, [applyGameState, applyLobbySnapshot, clientCanPoll, code, identityResolved, viewerParticipantToken]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      invalidatePollRequest();
      actionControllerRef.current?.abort();
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, [invalidatePollRequest]);

  useEffect(() => {
    invalidatePollRequest();
    gameStateRef.current = null;
    snapshotRef.current = null;
    const timeout = window.setTimeout(() => {
      setGameState(null);
      setSnapshot(null);
      setLoading(true);
      setError(null);
      setFetchFailureCount(0);
      setParticipantIdentity({
        code,
        session: readMysteryMultiplayerParticipantSession(code),
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [code, invalidatePollRequest]);

  useEffect(() => {
    invalidatePollRequest();
  }, [invalidatePollRequest, viewerParticipantToken]);

  useEffect(() => {
    const updateAvailability = () => {
      const nextCanPoll = !document.hidden && navigator.onLine;

      if (!nextCanPoll) {
        invalidatePollRequest();
        setIsRefreshing(false);

        if (!gameStateRef.current && !snapshotRef.current) {
          setLoading(false);
          setError(navigator.onLine ? "Game sync is paused while this tab is hidden." : "You appear to be offline.");
        }
      }

      setClientCanPoll(nextCanPoll);
    };

    updateAvailability();
    document.addEventListener("visibilitychange", updateAvailability);
    window.addEventListener("online", updateAvailability);
    window.addEventListener("offline", updateAvailability);

    return () => {
      document.removeEventListener("visibilitychange", updateAvailability);
      window.removeEventListener("online", updateAvailability);
      window.removeEventListener("offline", updateAvailability);
    };
  }, [invalidatePollRequest]);

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
    if (gameCompleted && completedResultsPath) {
      invalidatePollRequest();
      router.replace(completedResultsPath);
    }
  }, [completedResultsPath, gameCompleted, invalidatePollRequest, router]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const initialFetch = window.setTimeout(() => {
      void fetchLobbyOrGame({ silent: Boolean(gameStateRef.current || snapshotRef.current) });
    }, 0);

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
    if (!clientCanPoll) {
      return;
    }

    const updateNow = () => setNowMs(Date.now() + serverClockOffsetRef.current);
    const timeout = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(() => {
      updateNow();
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [clientCanPoll]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimeoutRef.current = null;
      }, 1600);
    } catch {
      setActionError("Unable to copy lobby code.");
    }
  }

  async function handleStartLobby() {
    if (!displaySnapshot || !currentParticipant || !participantSession || !beginAuthoritativeAction()) {
      return;
    }

    const controller = new AbortController();
    const requestStartedAt = Date.now();
    actionControllerRef.current = controller;

    try {
      setStarting(true);
      setActionError(null);
      const nextGameState = await startMysteryMultiplayerLobby({
        lobbyId: displaySnapshot.lobby.id,
        participantToken: participantSession.participantToken,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        applyGameState(nextGameState, requestStartedAt);
      }
    } catch (startError) {
      if (!(startError instanceof Error && startError.name === "AbortError")) {
        setActionError(startError instanceof Error ? startError.message : "Unable to start lobby.");
      }
    } finally {
      if (mountedRef.current && actionControllerRef.current === controller) {
        setStarting(false);
        actionControllerRef.current = null;
      }
      endAuthoritativeAction();
    }
  }

  async function handleLeaveLobby() {
    if (!displaySnapshot || !currentParticipant) {
      router.push("/mystery-draft");
      return;
    }

    if (!participantSession || !beginAuthoritativeAction()) {
      return;
    }

    const controller = new AbortController();
    actionControllerRef.current = controller;

    try {
      setLeaving(true);
      setActionError(null);
      await leaveMysteryMultiplayerLobby({
        lobbyId: displaySnapshot.lobby.id,
        participantToken: participantSession.participantToken,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        forgetMysteryMultiplayerParticipant(displaySnapshot.lobby.code);
        router.push("/mystery-draft");
      }
    } catch (leaveError) {
      if (!(leaveError instanceof Error && leaveError.name === "AbortError")) {
        setActionError(leaveError instanceof Error ? leaveError.message : "Unable to leave lobby.");
      }
    } finally {
      if (mountedRef.current && actionControllerRef.current === controller) {
        setLeaving(false);
        actionControllerRef.current = null;
      }
      endAuthoritativeAction();
    }
  }

  const handleSubmitBid = useCallback(async ({
    amount,
    roundId,
    signal,
  }: {
    amount: number;
    roundId: string;
    signal: AbortSignal;
  }) => {
    if (!participantSession || !beginAuthoritativeAction()) {
      throw new Error("Another multiplayer action is already in progress.");
    }

    const requestStartedAt = Date.now();

    try {
      const nextGameState = await submitMysteryMultiplayerBid({
        amount,
        codeOrId: code,
        participantToken: participantSession.participantToken,
        roundId,
        signal,
      });

      if (!signal.aborted) {
        applyGameState(nextGameState, requestStartedAt);
      }
    } finally {
      endAuthoritativeAction();
    }
  }, [applyGameState, beginAuthoritativeAction, code, endAuthoritativeAction, participantSession]);

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
              <strong>{participantSession ? "Restoring your game..." : "Reconnecting to lobby..."}</strong>
            </div>
          ) : error && !displaySnapshot ? (
            <div className="mystery-multiplayer-status">
              <strong>{error}</strong>
              <button
                className="mystery-primary-button"
                disabled={!clientCanPoll}
                type="button"
                onClick={() => void fetchLobbyOrGame()}
              >
                Retry
              </button>
              <button className="mystery-secondary-button" type="button" onClick={() => router.push("/mystery-draft")}>
                Back
              </button>
            </div>
          ) : gameCompleted ? (
            <div className="mystery-multiplayer-status">
              <RefreshCw className="mystery-warmup-spinner" size={34} />
              <strong>Game complete. Loading results...</strong>
            </div>
          ) : displaySnapshot ? (
            <>
              {!gameState?.game && (error || fetchFailureCount > 0 || displaySnapshot.lobby.status === "started") ? (
                <section className="mystery-sync-banner" role={error ? "status" : undefined}>
                  <Hourglass size={16} />
                  <span>
                    {error
                      ? "Having trouble syncing. Keeping the latest lobby state on screen."
                      : displaySnapshot.lobby.status === "started"
                        ? "Syncing game state..."
                        : "Syncing lobby..."}
                  </span>
                </section>
              ) : null}
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
                    nowMs={nowMs}
                  />
                  <MultiplayerGameScreen
                    actionError={actionError}
                    copied={copied}
                    currentParticipant={currentParticipant}
                    gameState={gameState}
                    nowMs={nowMs}
                    onCopyCode={handleCopyCode}
                    onSubmitBid={handleSubmitBid}
                    setActionError={setActionError}
                  />
                  <section className="mystery-multiplayer-actions">
                    <div>
                      <span className="mystery-kicker">You</span>
                      <strong>{currentParticipant?.name ?? "Spectator"}</strong>
                    </div>
                    <button
                      className="mystery-ghost-button"
                      disabled={leaving || starting}
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
                        disabled={starting || leaving}
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
                      disabled={leaving || starting}
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
