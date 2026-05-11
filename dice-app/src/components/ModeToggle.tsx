import type { GameMode } from "../game/types";
import { modeLabel } from "../game/modeLabel";

interface Props {
  value: GameMode;
  onChange: (m: GameMode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Game mode"
      className="grid grid-cols-2 rounded-2xl bg-bar-panel2 border border-bar-line p-1 gap-1"
    >
      {(["easy", "advanced"] as GameMode[]).map((m) => {
        const selected = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m)}
            className={[
              "tap-target focus-ring rounded-xl px-4 py-3 font-semibold transition-colors",
              selected
                ? "bg-bar-amber text-black"
                : "bg-transparent text-bar-ink/80 hover:text-bar-ink",
            ].join(" ")}
          >
            {modeLabel(m)}
          </button>
        );
      })}
    </div>
  );
}
