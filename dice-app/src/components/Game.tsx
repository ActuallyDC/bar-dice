import { useMemo } from "react";
import {
  activePlayerId,
  reducer,
  roll5,
  type GameState,
} from "../game/reducer";
import { describeScore, scoreHand } from "../game/score";
import type { GameMode } from "../game/types";
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

  // A monotonic key for the current turn — used to retrigger dice tumble.
  const turnKey = `${state.context.kind}-${state.context.round ?? state.context.gameNumber ?? 0}-${state.inRollOff ? "ro" : "main"}-${state.poolIndex}-${state.turnPhase}`;

  // Provide a stable score for the current dice (only meaningful after rolling).
  const liveScore =
    state.turnPhase === "idle" ? null : scoreHand(state.dice);

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
          <ActionButtons state={state} dispatch={dispatch} />
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
              state.turnPhase === "rolled1"
            }
            onToggle={(i) => dispatch({ type: "TOGGLE_HOLD", index: i })}
            rollKey={turnKey}
            stayed={state.stayedThisTurn}
            newlyMatched={state.newlyMatched}
          />
          {liveScore && (
            <p className="text-bar-ink font-mono text-base">
              {describeScore(liveScore)}
            </p>
          )}
          {state.inRollOff && state.turnPhase !== "idle" && (
            <Subtle>Tiebreaker — one roll only.</Subtle>
          )}
          {!state.inRollOff &&
            state.mode === "easy" &&
            state.turnPhase === "rolled1" && (
              <Subtle>Optimal hold applied. Roll Again or Stay.</Subtle>
            )}
          {!state.inRollOff &&
            state.mode === "advanced" &&
            state.turnPhase === "rolled1" && (
              <Subtle>Tap dice to hold them. Then Roll Again or Stay.</Subtle>
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
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
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
      <Button fullWidth onClick={() => dispatch({ type: "COMMIT_TURN" })}>
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
        Roll
      </Button>
    );
  }
  if (phase === "rolled1") {
    const reroll = state.held.filter((h) => !h).length;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: "STAY" })}
        >
          Stay
        </Button>
        <Button
          onClick={() => dispatch({ type: "ROLL_2", dice: roll5() })}
        >
          Roll Again ({reroll} left)
        </Button>
      </div>
    );
  }
  return (
    <Button fullWidth onClick={() => dispatch({ type: "COMMIT_TURN" })}>
      End Turn
    </Button>
  );
}
