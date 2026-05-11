import { useEffect, useMemo, useState } from "react";
import { computeTurnOrder } from "../game/turnOrder";
import type { PlayerSlot, TurnOrderOption } from "../game/types";
import { Button, Heading, ScreenShell, Subtle } from "./ui";

interface Props {
  slots: PlayerSlot[];
  initialOption?: TurnOrderOption;
  onBack: () => void;
  onStart: (orderedIds: string[], chosen: TurnOrderOption) => void;
  onRestart: () => void;
}

const OPTIONS: { key: TurnOrderOption; label: string }[] = [
  { key: "highestRoll", label: "Highest Roll Goes First" },
  { key: "entryOrder", label: "Order Of Entry (Whoever typed first)" },
  { key: "alphabetical", label: "Alphabetical" },
  { key: "randomize", label: "Randomize" },
];

export function TurnOrder(props: Props) {
  const { slots, initialOption, onBack, onStart, onRestart } = props;
  const [option, setOption] = useState<TurnOrderOption>(
    initialOption ?? "highestRoll",
  );
  const [reshuffleKey, setReshuffleKey] = useState(0);

  const ordered = useMemo(() => {
    return computeTurnOrder({
      players: slots.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        setupRoll: s.setupRoll,
        entryIndex: s.entryIndex,
      })),
      option,
    });
    // reshuffleKey is intentionally a dep so tapping Randomize re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, option, reshuffleKey]);

  const slotById = useMemo(() => {
    const map: Record<string, PlayerSlot> = {};
    for (const s of slots) map[s.id] = s;
    return map;
  }, [slots]);

  function handleOptionClick(opt: TurnOrderOption) {
    if (opt === "randomize" && option === "randomize") {
      setReshuffleKey((k) => k + 1);
    } else {
      setOption(opt);
    }
  }

  // Always reshuffle once when first switching to randomize.
  useEffect(() => {
    if (option === "randomize") setReshuffleKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option]);

  return (
    <ScreenShell
      footer={
        <Button fullWidth onClick={() => onStart(ordered, option)}>
          Start Game
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
        <Subtle>Turn order</Subtle>
      </div>

      <Heading level={1}>Who rolls first?</Heading>

      <section role="radiogroup" aria-label="Turn order option" className="flex flex-col gap-2">
        {OPTIONS.map((o) => {
          const selected = option === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleOptionClick(o.key)}
              className={[
                "tap-target focus-ring text-left rounded-2xl px-4 py-3 border transition-colors",
                selected
                  ? "bg-bar-amber/15 border-bar-amber text-bar-ink"
                  : "bg-bar-panel border-bar-line text-bar-ink hover:bg-bar-panel2",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.label}</span>
                {selected && (
                  <span className="text-xs text-bar-amber font-semibold">
                    Selected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl bg-bar-panel border border-bar-line p-3">
        <p className="text-xs uppercase tracking-wider text-bar-mute mb-2">
          Round 1 order
        </p>
        <ol className="flex flex-col gap-1">
          {ordered.map((id, i) => {
            const slot = slotById[id];
            return (
              <li key={id} className="flex items-center justify-between text-bar-ink">
                <span>
                  <span className="text-bar-mute mr-2">{i + 1}.</span>
                  {slot?.displayName ?? id}
                </span>
                {option === "highestRoll" && (
                  <span className="font-mono text-bar-mute">
                    Rolled a {slot?.setupRoll}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
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
