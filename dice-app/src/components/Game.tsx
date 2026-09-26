import { useMemo, useState } from "react";
import {
  activePlayerId,
  reducer,
  roll5,
  type GameState,
} from "../game/reducer";
import { compareScores, describeScore, scoreHand } from "../game/score";
import { maxScoreAfterRoll2 } from "../game/projection";
import type { GameMode, Score } from "../game/types";
import { modeLabel } from "../game/modeLabel";
import { Button, Heading, ScreenShell, Subtle } from "./ui";
import { Scoreboard } from "./Scoreboard";
import { DiceTray } from "./DiceTray";
import { RoundSummary } from "./RoundSummary";

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
  onCancelGame?: () => void;
}

export function Game({ state, dispatch, onCancelGame }: Props) {
  const activeId = activePlayerId(state);
  const activePlayer = useMemo(
    () => state.players.find((p) => p.id === activeId) ?? null,
    [state.players, activeId],
  );

  // The latest roll whose dice have all landed. Until they do, the result
  // (score, hints, holds, buttons) stays hidden so the tumble isn't spoiled.
  const [settledRollId, setSettledRollId] = useState(state.rollId);
  // Same Players Again restarts rollId at 0 without remounting Game.
  if (state.rollId < settledRollId) setSettledRollId(state.rollId);
  const rolling =
    state.rollId > settledRollId && state.lastRolled.some(Boolean);

  // Provide a stable score for the current dice (only meaningful after rolling).
  const liveScore =
    state.turnPhase === "idle" || rolling ? null : scoreHand(state.dice);

  // Auto-mode courtesy warning: after the 1st Roll, if the optimal hold
  // can't beat the current leader even in the best case, surface it so
  // the player can decide whether to take the 2nd Roll anyway.
  const cannotBeatLeader = useMemo<{
    max: Score;
    leader: Score;
  } | null>(() => {
    if (state.mode !== "easy") return null;
    if (state.inRollOff) return null;
    if (state.turnPhase !== "rolled1") return null;
    let leader: Score | null = null;
    for (const id of state.poolOrder) {
      if (id === activeId) continue;
      const r = state.poolResults[id];
      if (!r) continue;
      if (!leader || compareScores(r.score, leader) === 1) leader = r.score;
    }
    if (!leader) return null;
    const max = maxScoreAfterRoll2(state.dice, state.held);
    if (!max) return null;
    if (compareScores(max, leader) < 0) return { max, leader };
    return null;
  }, [
    state.mode,
    state.inRollOff,
    state.turnPhase,
    state.poolOrder,
    state.poolResults,
    state.dice,
    state.held,
    activeId,
  ]);

  const showDice = state.summary === null && !state.finished && activeId;

  const isFinale = state.context.kind === "finale";
  const headerTitle = isFinale
    ? state.inRollOff
      ? "Finale Tiebreaker"
      : "Best of Three"
    : state.inRollOff
      ? `Round ${state.context.round} — Tiebreaker`
      : `Round ${state.context.round}`;

  return (
    <ScreenShell
      footer={
        showDice ? (
          <ActionButtons state={state} dispatch={dispatch} rolling={rolling} />
        ) : null
      }
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <Heading level={2}>{headerTitle}</Heading>
          <Subtle>
            Mode: <ModeBadge mode={state.mode} />
          </Subtle>
        </div>
        {onCancelGame && (
          <button
            type="button"
            onClick={onCancelGame}
            className="text-bar-mute hover:text-bar-ink underline text-sm tap-target focus-ring px-2"
          >
            End game
          </button>
        )}
      </header>

      <Scoreboard state={state} />

      {state.summary && (
        <RoundSummary
          state={state}
          summary={state.summary}
          onAdvance={() => dispatch({ type: "ADVANCE_FROM_SUMMARY" })}
        />
      )}

      {showDice && activePlayer && (
        <section className="flex flex-col items-center gap-4 mt-2">
          <p className="text-bar-amber font-semibold text-lg">
            {activePlayer.displayName}'s turn
          </p>
          <DiceTray
            dice={state.dice}
            held={state.held}
            blank={state.turnPhase === "idle"}
            interactive={
              state.mode === "advanced" &&
              !state.inRollOff &&
              state.turnPhase === "rolled1" &&
              !rolling
            }
            onToggle={(i) => dispatch({ type: "TOGGLE_HOLD", index: i })}
            rollId={state.rollId}
            rolled={state.lastRolled}
            settling={rolling}
            onSettled={setSettledRollId}
            stayed={state.stayedThisTurn}
            newlyMatched={state.newlyMatched}
          />
          {liveScore && (
            <p className="text-bar-ink font-mono text-base">
              {describeScore(liveScore)}
            </p>
          )}
          {state.inRollOff && state.turnPhase !== "idle" && !rolling && (
            <Subtle>Tiebreaker — one roll only.</Subtle>
          )}
          {!state.inRollOff &&
            state.mode === "easy" &&
            state.turnPhase === "rolled1" &&
            !rolling && (
              <Subtle>Optimal hold applied. 2nd Roll or Stay.</Subtle>
            )}
          {cannotBeatLeader && !rolling && (
            <p className="text-sm text-bar-ember text-center">
              Best case here is {describeScore(cannotBeatLeader.max)} — won't
              beat {describeScore(cannotBeatLeader.leader)}.
            </p>
          )}
          {!state.inRollOff &&
            state.mode === "advanced" &&
            state.turnPhase === "rolled1" &&
            !rolling && (
              <Subtle>Tap dice to hold them. Then 2nd Roll or Stay.</Subtle>
            )}
        </section>
      )}
    </ScreenShell>
  );
}

function ModeBadge({ mode }: { mode: GameMode }) {
  return (
    <span
      className={[
        "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
        mode === "easy"
          ? "bg-bar-amber/15 text-bar-amber border-bar-amber/40"
          : "bg-bar-ember/15 text-bar-ember border-bar-ember/40",
      ].join(" ")}
    >
      {modeLabel(mode)}
    </span>
  );
}

function ActionButtons({
  state,
  dispatch,
  rolling,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
  /** Dice still in the air — nothing to decide yet. */
  rolling: boolean;
}) {
  const phase = state.turnPhase;
  // Roll-off / tiebreaker: single roll, both modes.
  if (state.inRollOff) {
    if (phase === "idle") {
      return (
        <Button
          fullWidth
          onClick={() => dispatch({ type: "ROLL_1", dice: roll5() })}
        >
          Roll
        </Button>
      );
    }
    return (
      <Button
        fullWidth
        disabled={rolling}
        onClick={() => dispatch({ type: "COMMIT_TURN" })}
      >
        End Turn
      </Button>
    );
  }
  // Standard turn — both Easy and Advanced share this flow.
  // Difference: Easy has held flags pre-set by the reducer (via easyHold),
  // Advanced lets the player toggle them by tapping dice.
  if (phase === "idle") {
    return (
      <Button
        fullWidth
        onClick={() => dispatch({ type: "ROLL_1", dice: roll5() })}
      >
        1st Roll
      </Button>
    );
  }
  if (phase === "rolled1") {
    const reroll = state.held.filter((h) => !h).length;
    const rerollLabel = reroll === 1 ? "1 die" : `${reroll} dice`;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          disabled={rolling}
          onClick={() => dispatch({ type: "STAY" })}
        >
          Stay
        </Button>
        <Button
          disabled={rolling}
          onClick={() => dispatch({ type: "ROLL_2", dice: roll5() })}
        >
          2nd Roll ({rerollLabel})
        </Button>
      </div>
    );
  }
  return (
    <Button
      fullWidth
      disabled={rolling}
      onClick={() => dispatch({ type: "COMMIT_TURN" })}
    >
      End Turn
    </Button>
  );
}
