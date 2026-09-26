import { useRef } from "react";
import type { Hand } from "../game/types";
import { Die } from "./Die";
import { finishFractions } from "./dieTumble";

type Flags = readonly [boolean, boolean, boolean, boolean, boolean];

interface Props {
  dice: Hand;
  held: Flags;
  interactive: boolean;
  blank?: boolean;
  onToggle?: (index: number) => void;
  /** Bumped by the reducer on every roll to start a tumble. */
  rollId?: number;
  /** Which dice the latest roll re-rolled. */
  rolled?: Flags;
  /** True until every re-rolled die has landed. */
  settling?: boolean;
  /** Called once every die re-rolled by roll `rollId` has landed. */
  onSettled?: (rollId: number) => void;
  stayed?: boolean;
  newlyMatched?: Flags;
}

const NONE: Flags = [false, false, false, false, false];

export function DiceTray({
  dice,
  held,
  interactive,
  blank = false,
  onToggle,
  rollId = 0,
  rolled = NONE,
  settling = false,
  onSettled,
  stayed = false,
  newlyMatched,
}: Props) {
  const rolledCount = rolled.filter(Boolean).length;
  const finishes = useRef<{ rollId: number; byDie: number[] } | null>(null);
  const landed = useRef({ rollId, count: 0 });

  // Landing order for this throw, drawn once per roll the first time a die asks.
  function finishFor(index: number): number {
    if (finishes.current?.rollId !== rollId) {
      const order = finishFractions(rolledCount);
      const byDie = [0.5, 0.5, 0.5, 0.5, 0.5];
      rolled.forEach((r, i) => {
        if (r) byDie[i] = order.shift() ?? 0.5;
      });
      finishes.current = { rollId, byDie };
    }
    return finishes.current.byDie[index];
  }

  function handleLanded() {
    if (landed.current.rollId !== rollId) landed.current = { rollId, count: 0 };
    landed.current.count += 1;
    if (landed.current.count === rolledCount) onSettled?.(rollId);
  }

  return (
    <div className="grid grid-cols-5 gap-2 justify-center">
      {dice.map((d, i) => (
        <Die
          key={i}
          value={d}
          held={held[i]}
          interactive={interactive}
          blank={blank}
          onToggle={() => onToggle?.(i)}
          size={56}
          rollId={rollId}
          rolled={rolled[i]}
          finish={() => finishFor(i)}
          settling={settling}
          onLanded={handleLanded}
          stayed={stayed}
          newlyMatched={newlyMatched?.[i] ?? false}
        />
      ))}
    </div>
  );
}
