import { motion } from "framer-motion";
import type { DieValue } from "../game/types";
import { DieFace } from "./SetupDie";

interface Props {
  value: DieValue;
  held: boolean;
  /** Whether the die responds to taps (Advanced mode after roll 1). */
  interactive: boolean;
  onToggle?: () => void;
  size?: number;
  /** Hide the dots — for the placeholder state before any roll. */
  blank?: boolean;
  /** Bumped each roll to retrigger the tumble. */
  rollKey?: string | number;
}

export function Die({
  value,
  held,
  interactive,
  onToggle,
  size = 64,
  blank = false,
  rollKey = "",
}: Props) {
  const cls = [
    "relative rounded-xl flex items-center justify-center select-none transition-colors",
    held
      ? "bg-bar-amber/20 border-2 border-bar-amber"
      : "bg-bar-panel2 border-2 border-bar-line",
    interactive ? "tap-target focus-ring cursor-pointer" : "cursor-default",
  ].join(" ");

  const animateProps = held
    ? { rotate: 0 }
    : { rotate: [0, -22, 28, -20, 16, -10, 6, 0] };

  const inner = (
    <motion.div
      className={cls}
      style={{ width: size, height: size }}
      key={rollKey}
      initial={false}
      animate={animateProps}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <DieFace value={blank ? null : value} size={size} highlight={held} />
      {held && !blank && (
        <span
          aria-hidden
          className="absolute top-1 right-1 text-[10px] font-bold text-bar-amber"
        >
          ✓
        </span>
      )}
    </motion.div>
  );

  if (!interactive) return inner;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={held}
      aria-label={`Die showing ${value}, ${held ? "held" : "not held"}`}
      className="bg-transparent border-0 p-0"
    >
      {inner}
    </button>
  );
}
