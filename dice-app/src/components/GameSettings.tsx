import { useState } from "react";
import type { GameMode } from "../game/types";
import { Button, Heading, ScreenShell, Subtle } from "./ui";
import { ModeToggle } from "./ModeToggle";

interface Props {
  names: string[];
  onNamesChange: (names: string[]) => void;
  mode: GameMode;
  onModeChange: (m: GameMode) => void;
  onStart: (names: string[]) => void;
  onViewTally: () => void;
  onRestart?: () => void;
}

export function GameSettings(props: Props) {
  const {
    names,
    onNamesChange,
    mode,
    onModeChange,
    onStart,
    onViewTally,
  } = props;

  const [draft, setDraft] = useState("");

  const trimmed = draft.trim().replace(/\s+/g, " ");
  const isDuplicate =
    trimmed.length > 0 &&
    names.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const canAdd = trimmed.length > 0 && !isDuplicate;
  const canStart = names.length >= 2;

  function commitAdd() {
    if (!canAdd) return;
    onNamesChange([...names, trimmed]);
    setDraft("");
  }

  function remove(idx: number) {
    onNamesChange(names.filter((_, i) => i !== idx));
  }

  return (
    <ScreenShell
      footer={
        <Button fullWidth disabled={!canStart} onClick={() => onStart(names)}>
          Start
        </Button>
      }
    >
      <Heading level={1}>Bar Dice</Heading>
      <Subtle>Pass-and-play. Loser buys a round.</Subtle>

      <section className="flex flex-col gap-2 mt-2">
        <label className="font-semibold text-bar-ink" htmlFor="player-name">
          Players
        </label>
        <div className="flex gap-2">
          <input
            id="player-name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitAdd();
              }
            }}
            className="tap-target focus-ring flex-1 rounded-2xl bg-bar-panel2 border border-bar-line px-4 py-3 text-lg font-semibold text-bar-ink"
            placeholder="Who's in?"
            aria-invalid={isDuplicate}
          />
          <Button onClick={commitAdd} disabled={!canAdd}>
            Add
          </Button>
        </div>

        {isDuplicate && (
          <p className="text-sm text-bar-ember">Already on the list.</p>
        )}

        {names.length > 0 && (
          <ul className="flex flex-col gap-1 mt-1">
            {names.map((n, idx) => (
              <li
                key={`${n}-${idx}`}
                className="flex items-center justify-between rounded-2xl bg-bar-panel border border-bar-line px-4 py-2"
              >
                <span className="font-semibold text-bar-ink">{n}</span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="tap-target focus-ring text-bar-mute hover:text-bar-ember rounded-xl px-2"
                  aria-label={`Remove ${n}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {!canStart && (
          <p className="text-sm text-bar-mute">Need at least 2.</p>
        )}
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <span className="font-semibold text-bar-ink">Mode</span>
        <ModeToggle value={mode} onChange={onModeChange} />
        <Subtle>
          {mode === "easy"
            ? "We make the optimal decisions for you."
            : "You know how this rolls."}
        </Subtle>
      </section>

      <section className="mt-auto flex justify-center">
        <button
          type="button"
          className="text-bar-amber underline underline-offset-4 tap-target focus-ring px-3"
          onClick={onViewTally}
        >
          View Tally
        </button>
      </section>
    </ScreenShell>
  );
}
