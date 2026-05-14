import { useReducer, useState } from "react";
import { loadPrefs, setLastMode } from "./game/storage";
import type { GameMode, PlayerSlot, TurnOrderOption } from "./game/types";
import { Setup, type SetupResult } from "./components/Setup";
import { makeInitialState, reducer } from "./game/reducer";
import { Game } from "./components/Game";
import { ResultModal } from "./components/ResultModal";
import { Tally } from "./components/Tally";
import { HowToPlay } from "./components/HowToPlay";
import { UndoProvider, useRoster } from "./components/UndoProvider";
import { ConfirmModal } from "./components/ConfirmModal";

type Screen =
  | { kind: "setup" }
  | { kind: "game" }
  | { kind: "tally"; from: "setup" | "result" }
  | { kind: "howToPlay" };

interface LineupSnapshot {
  slots: PlayerSlot[];
  turnOrderIds: string[];
  mode: GameMode;
  chosenOption: TurnOrderOption;
}

export default function App() {
  return (
    <UndoProvider>
      <AppInner />
    </UndoProvider>
  );
}

function AppInner() {
  const { roster } = useRoster();
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [screen, setScreen] = useState<Screen>({ kind: "setup" });
  const [lineup, setLineup] = useState<LineupSnapshot | null>(null);
  const [gameState, dispatch] = useReducer(reducer, makeInitialState());
  const [confirmEnd, setConfirmEnd] = useState(false);

  function handleSetupComplete(r: SetupResult) {
    setLastMode(r.mode);
    setLineup({
      slots: r.slots,
      turnOrderIds: r.turnOrderIds,
      mode: r.mode,
      chosenOption: r.chosenOption,
    });
    dispatch({
      type: "START",
      players: r.slots,
      turnOrder: r.turnOrderIds,
      mode: r.mode,
    });
    setScreen({ kind: "game" });
  }

  function handleNewGame() {
    setPrefs(loadPrefs());
    dispatch({ type: "RESET" });
    setLineup(null);
    setScreen({ kind: "setup" });
  }

  function handleSamePlayersAgain() {
    if (!lineup) return handleNewGame();
    // Keep the same slots and the same turn-order option result, but re-START.
    dispatch({ type: "RESET" });
    dispatch({
      type: "START",
      players: lineup.slots,
      turnOrder: lineup.turnOrderIds,
      mode: lineup.mode,
    });
    setScreen({ kind: "game" });
  }

  const showResult =
    screen.kind === "game" && gameState.finished && !!gameState.loserId;

  return (
    <>
      {screen.kind === "setup" && (
        <Setup
          initialMode={prefs.lastMode}
          roster={roster}
          onComplete={handleSetupComplete}
          onViewTally={() => setScreen({ kind: "tally", from: "setup" })}
          onViewHowToPlay={() => setScreen({ kind: "howToPlay" })}
        />
      )}
      {screen.kind === "howToPlay" && (
        <HowToPlay onBack={() => setScreen({ kind: "setup" })} />
      )}
      {screen.kind === "game" && lineup && (
        <Game
          state={gameState}
          dispatch={dispatch}
          onCancelGame={() => setConfirmEnd(true)}
        />
      )}
      {screen.kind === "tally" && (
        <Tally
          onBack={() =>
            setScreen(
              screen.from === "result" ? { kind: "game" } : { kind: "setup" },
            )
          }
        />
      )}
      {showResult && lineup && gameState.loserId && (
        <ResultModal
          loserId={gameState.loserId}
          participants={lineup.slots}
          resultApplied={gameState.resultApplied}
          onResultApplied={() => dispatch({ type: "MARK_RESULT_APPLIED" })}
          onViewTally={() => setScreen({ kind: "tally", from: "result" })}
          onNewGame={handleNewGame}
          onSamePlayersAgain={handleSamePlayersAgain}
        />
      )}
      <ConfirmModal
        open={confirmEnd}
        title="End this game?"
        message="Game progress will be lost. The shot tally is unaffected."
        confirmLabel="End game"
        cancelLabel="Keep playing"
        destructive
        onConfirm={() => {
          setConfirmEnd(false);
          handleNewGame();
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </>
  );
}
