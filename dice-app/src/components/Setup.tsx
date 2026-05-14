import { useState } from "react";
import type { GameMode, PlayerSlot, Roster, TurnOrderOption } from "../game/types";
import { GameSettings } from "./GameSettings";
import { TurnOrder } from "./TurnOrder";
import { ConfirmModal } from "./ConfirmModal";

type Step = "settings" | "order";

export interface SetupResult {
  slots: PlayerSlot[];
  turnOrderIds: string[];
  mode: GameMode;
  chosenOption: TurnOrderOption;
}

interface Props {
  initialMode: GameMode;
  roster: Roster;
  onComplete: (r: SetupResult) => void;
  onViewTally: () => void;
  onViewHowToPlay: () => void;
}

export function Setup({ initialMode, roster, onComplete, onViewTally, onViewHowToPlay }: Props) {
  const [step, setStep] = useState<Step>("settings");
  const [slots, setSlots] = useState<PlayerSlot[]>([]);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [option, setOption] = useState<TurnOrderOption>("highestRoll");
  const [confirmRestart, setConfirmRestart] = useState(false);

  function handleStartFromSettings(submitted: PlayerSlot[]) {
    setSlots(submitted);
    setStep("order");
  }

  function handleOrderBack() {
    setStep("settings");
  }

  function performRestart() {
    setStep("settings");
    setSlots([]);
    setOption("highestRoll");
  }

  function handleStart(orderedIds: string[], chosen: TurnOrderOption) {
    setOption(chosen);
    onComplete({
      slots,
      turnOrderIds: orderedIds,
      mode,
      chosenOption: chosen,
    });
  }

  return (
    <>
      {step === "settings" && (
        <GameSettings
          initialRows={slots}
          mode={mode}
          roster={roster}
          onModeChange={setMode}
          onStart={handleStartFromSettings}
          onViewTally={onViewTally}
          onViewHowToPlay={onViewHowToPlay}
        />
      )}
      {step === "order" && (
        <TurnOrder
          slots={slots}
          initialOption={option}
          onBack={handleOrderBack}
          onStart={handleStart}
          onRestart={() => setConfirmRestart(true)}
        />
      )}
      <ConfirmModal
        open={confirmRestart}
        title="Restart Setup?"
        message="All entered players and rolls will be cleared."
        confirmLabel="Restart"
        cancelLabel="Keep going"
        destructive
        onConfirm={() => {
          setConfirmRestart(false);
          performRestart();
        }}
        onCancel={() => setConfirmRestart(false)}
      />
    </>
  );
}
