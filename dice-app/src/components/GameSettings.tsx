import { useMemo } from "react";
import type { GameMode } from "../game/types";
import { Button, Heading, ScreenShell, Subtle } from "./ui";
import { ModeToggle } from "./ModeToggle";

interface Props {
  countText: string;
  onCountTextChange: (v: string) => void;
  mode: GameMode;
  onModeChange: (m: GameMode) => void;
  onNext: (count: number) => void;
  onViewTally: () => void;
  onRestart?: () => void;
}

export function GameSettings(props: Props) {
  const {
    countText,
    onCountTextChange,
    mode,
    onModeChange,
    onNext,
    onViewTally,
  } = props;

  const validation = useMemo(() => parseCount(countText), [countText]);

  const showWarning = validation.ok && validation.count >= 10;

  return (
    <ScreenShell
      footer={
        <Button
          fullWidth
          disabled={!validation.ok}
          onClick={() => validation.ok && onNext(validation.count)}
        >
          Next
        </Button>
      }
    >
      <Heading level={1}>Bar Dice</Heading>
      <Subtle>Pass-and-play. Loser buys a round.</Subtle>

      <section className="flex flex-col gap-2 mt-2">
        <label className="font-semibold text-bar-ink" htmlFor="player-count">
          How many players?
        </label>
        <input
          id="player-count"
          inputMode="numeric"
          pattern="[0-9]*"
          value={countText}
          onChange={(e) => onCountTextChange(e.target.value)}
          className="tap-target focus-ring w-full rounded-2xl bg-bar-panel2 border border-bar-line px-4 py-3 text-2xl font-semibold text-bar-ink"
          placeholder="2 or more"
          aria-invalid={!validation.ok && countText.trim().length > 0}
          aria-describedby="player-count-help"
        />
        <div id="player-count-help" className="min-h-[1.5rem]">
          {!validation.ok && countText.trim().length > 0 && (
            <p className="text-sm text-bar-ember">
              Enter a number, 2 or more
            </p>
          )}
          {showWarning && (
            <p className="text-sm text-bar-amber">
              Think about the tab though...
            </p>
          )}
        </div>
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

export interface ParsedCount {
  ok: boolean;
  count: number;
}

export function parseCount(text: string): ParsedCount {
  const t = text.trim();
  if (t === "") return { ok: false, count: 0 };
  if (!/^-?\d+$/.test(t)) return { ok: false, count: 0 };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 2) return { ok: false, count: 0 };
  return { ok: true, count: n };
}
