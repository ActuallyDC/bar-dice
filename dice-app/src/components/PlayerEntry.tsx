import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DieValue, PlayerSlot, Roster } from "../game/types";
import { nameKey } from "../game/storage";
import { Button, ScreenShell, Subtle } from "./ui";
import { PlayerChip } from "./PlayerChip";
import { SetupDie } from "./SetupDie";

interface Props {
  slotIndex: number;          // 0-indexed
  totalSlots: number;
  completedSlots: PlayerSlot[]; // entries already completed (may include the one at slotIndex if revisited)
  roster: Roster;
  onBack: () => void;
  onComplete: (slot: PlayerSlot) => void;
  onRestart: () => void;
}

export function PlayerEntry(props: Props) {
  const {
    slotIndex,
    totalSlots,
    completedSlots,
    roster,
    onBack,
    onComplete,
    onRestart,
  } = props;

  const existing = completedSlots[slotIndex] ?? null;
  const [name, setName] = useState<string>(existing?.displayName ?? "");
  const [phase, setPhase] = useState<"idle" | "rolling" | "showing">("idle");
  const [rolledValue, setRolledValue] = useState<DieValue | null>(
    existing?.setupRoll ?? null,
  );
  const [countdown, setCountdown] = useState<number>(0);
  const rollKeyRef = useRef<number>(0);
  const showingTimerRef = useRef<number | null>(null);
  const countdownTickRef = useRef<number | null>(null);

  function clearShowingTimer() {
    if (showingTimerRef.current != null) {
      window.clearTimeout(showingTimerRef.current);
      showingTimerRef.current = null;
    }
    if (countdownTickRef.current != null) {
      window.clearInterval(countdownTickRef.current);
      countdownTickRef.current = null;
    }
  }

  // If the slotIndex changes (Back/Next), reset local state from existing.
  useEffect(() => {
    setName(existing?.displayName ?? "");
    setRolledValue(existing?.setupRoll ?? null);
    setPhase("idle");
    setCountdown(0);
    clearShowingTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotIndex]);

  useEffect(() => clearShowingTimer, []);

  const otherSlotKeys = useMemo(
    () =>
      new Set(
        completedSlots
          .filter((_, i) => i !== slotIndex)
          .map((s) => s.nameKey),
      ),
    [completedSlots, slotIndex],
  );

  const trimmed = name.trim();
  const trimmedKey = nameKey(trimmed);
  const isDuplicate = trimmed.length > 0 && otherSlotKeys.has(trimmedKey);
  const nameValid = trimmed.length > 0 && !isDuplicate;

  const usedRosterKeys = useMemo(
    () => new Set(completedSlots.map((s) => s.nameKey)),
    [completedSlots],
  );

  const rosterChips = useMemo(() => {
    return Object.values(roster.players)
      .map((p) => ({ key: nameKey(p.displayName), name: p.displayName }))
      .filter((p) => !usedRosterKeys.has(p.key))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [roster, usedRosterKeys]);

  const isRevisit = existing !== null;
  const buttonLabel = (() => {
    if (isRevisit) return "Continue";
    if (phase === "rolling") return "Rolling…";
    if (phase === "showing" && rolledValue != null) {
      return `Got a ${rolledValue}!`;
    }
    return "Roll to Enter";
  })();
  const buttonDisabled = !nameValid || phase !== "idle";

  function commit(value: DieValue) {
    const slot: PlayerSlot = {
      id: existing?.id ?? `p${slotIndex}-${Date.now().toString(36)}`,
      displayName: trimmed,
      nameKey: trimmedKey,
      setupRoll: value,
      entryIndex: slotIndex,
    };
    onComplete(slot);
  }

  const handleRollSettled = useCallback(
    (value: DieValue) => {
      setPhase("showing");
      clearShowingTimer();
      // Hold the result on screen with a visible 3..2..1 countdown so other
      // players can see the value before the screen advances.
      setCountdown(3);
      countdownTickRef.current = window.setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      showingTimerRef.current = window.setTimeout(() => {
        clearShowingTimer();
        commit(value);
      }, 3000);
    },
    // commit closes over current props — they're stable through this slot
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trimmed, trimmedKey, slotIndex, existing?.id],
  );

  function handlePrimary() {
    if (!nameValid) return;
    if (isRevisit && rolledValue != null) {
      // Revisited slot — name may have changed; commit without re-rolling.
      commit(rolledValue);
      return;
    }
    // Fresh slot: roll the die now. SetupDie animates; onRollSettled fires
    // when the tumble completes, then we hold the result for 3 s before
    // calling commit().
    const value = (1 + Math.floor(Math.random() * 6)) as DieValue;
    setRolledValue(value);
    rollKeyRef.current += 1;
    setPhase("rolling");
  }

  return (
    <ScreenShell
      footer={
        <Button fullWidth disabled={buttonDisabled} onClick={handlePrimary}>
          {buttonLabel}
        </Button>
      }
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="tap-target focus-ring text-bar-ink/80 hover:text-bar-ink rounded-xl px-3 py-2 -ml-3"
          aria-label="Back"
        >
          ← Back
        </button>
        <Subtle>
          Player {slotIndex + 1} of {totalSlots}
        </Subtle>
      </div>

      {completedSlots.length > 0 && (
        <section className="rounded-2xl bg-bar-panel border border-bar-line p-3">
          <p className="text-xs uppercase tracking-wider text-bar-mute mb-2">
            Entered so far
          </p>
          <ul className="flex flex-col gap-1">
            {completedSlots.map((s, i) => (
              <li
                key={s.id}
                className={[
                  "flex items-center justify-between text-sm",
                  i === slotIndex ? "text-bar-amber font-semibold" : "text-bar-ink",
                ].join(" ")}
              >
                <span>{s.displayName}</span>
                <span className="font-mono text-bar-mute">— {s.setupRoll}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2 mt-2">
        <label htmlFor="player-name" className="font-semibold">
          Name
        </label>
        <input
          id="player-name"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tap-target focus-ring w-full rounded-2xl bg-bar-panel2 border border-bar-line px-4 py-3 text-xl text-bar-ink"
          placeholder="Player name"
          aria-invalid={isDuplicate}
        />
        <div className="min-h-[1.5rem]">
          {isDuplicate && (
            <p className="text-sm text-bar-ember">
              That name is already in this game
            </p>
          )}
        </div>
      </section>

      {rosterChips.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-bar-mute">
            From the bar
          </p>
          <div className="flex flex-wrap gap-2">
            {rosterChips.map((c) => (
              <PlayerChip
                key={c.key}
                label={c.name}
                onClick={() => setName(c.name)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col items-center gap-3 mt-4">
        <SetupDie
          value={rolledValue}
          rollKey={rollKeyRef.current}
          onRollSettled={handleRollSettled}
        />
        <p
          className="text-bar-amber text-base font-semibold min-h-[1.5rem]"
          aria-live="polite"
        >
          {phase === "showing" && countdown > 0
            ? `${slotIndex + 1 < totalSlots ? "Next Player Entry" : "Turn Order"} in ${countdown}…`
            : " "}
        </p>
      </section>

      <section className="mt-auto flex justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="text-bar-mute hover:text-bar-ink underline text-sm tap-target focus-ring px-3"
        >
          Restart Setup
        </button>
      </section>
    </ScreenShell>
  );
}
