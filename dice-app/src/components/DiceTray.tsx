import type { Hand } from "../game/types";
import { Die } from "./Die";

interface Props {
  dice: Hand;
  held: readonly [boolean, boolean, boolean, boolean, boolean];
  interactive: boolean;
  blank?: boolean;
  onToggle?: (index: number) => void;
  /** Bumped each roll to retrigger the tumble animation per non-held die. */
  rollKey?: string | number;
}

export function DiceTray({
  dice,
  held,
  interactive,
  blank = false,
  onToggle,
  rollKey = "",
}: Props) {
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
          rollKey={rollKey}
        />
      ))}
    </div>
  );
}
