import { useState } from "react";
import type { GameMode, PlayerSlot, Roster, TurnOrderOption } from "../game/types";
import { GameSettings } from "./GameSettings";
import { PlayerEntry } from "./PlayerEntry";
import { TurnOrder } from "./TurnOrder";
import { ConfirmModal } from "./ConfirmModal";

type Step = "settings" | "entry" | "order";

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
}

export function Setup({ initialMode, roster, onComplete, onViewTally }: Props) {
  const [step, setStep] = useState<Step>("settings");
  const [names, setNames] = useState<string[]>([]);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [slots, setSlots] = useState<PlayerSlot[]>([]);
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [option, setOption] = useState<TurnOrderOption>("highestRoll");
  const [confirmRestart, setConfirmRestart] = useState(false);

  function handleStartFromSettings(submitted: string[]) {
    setNames(submitted);
    setSlots([]);
    setCurrentSlot(0);
    setStep("entry");
  }

  function handleSlotComplete(slot: PlayerSlot) {
    setSlots((prev) => {
      const next = prev.slice();
      next[currentSlot] = slot;
      return next;
    });
    if (currentSlot + 1 >= names.length) {
      setStep("order");
    } else {
      setCurrentSlot(currentSlot + 1);
    }
  }

  function handleEntryBack() {
    if (currentSlot === 0) {
      setStep("settings");
    } else {
      setCurrentSlot(currentSlot - 1);
    }
  }

  function handleOrderBack() {
    setCurrentSlot(names.length - 1);
    setStep("entry");
  }

  function performRestart() {
    setStep("settings");
    setNames([]);
    setSlots([]);
    setCurrentSlot(0);
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
          names={names}
          onNamesChange={setNames}
          mode={mode}
          onModeChange={setMode}
          onStart={handleStartFromSettings}
          onViewTally={onViewTally}
        />
      )}
      {step === "entry" && (
        <PlayerEntry
          slotIndex={currentSlot}
          totalSlots={names.length}
          completedSlots={slots}
          roster={roster}
          prefilledName={names[currentSlot]}
          onBack={handleEntryBack}
          onComplete={handleSlotComplete}
          onRestart={() => setConfirmRestart(true)}
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
