import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { DieValue } from "../game/types";

interface Props {
  /** When `null`, the die is shown blank/idle. When set, the die rolls then settles on the value. */
  value: DieValue | null;
  /** Bumped each time the parent wants the die to roll. */
  rollKey: number;
  /** Callback after the visible roll completes. */
  onRollSettled?: (value: DieValue) => void;
  size?: number;
}

/**
 * Single d6 with a brief tumble animation. Used in PlayerEntry for the per-player setup roll.
 * The parent owns the resulting value; this component just animates and reports completion.
 */
export function SetupDie({ value, rollKey, onRollSettled, size = 88 }: Props) {
  const [displayed, setDisplayed] = useState<DieValue>(value ?? 1);
  const [rolling, setRolling] = useState(false);
  const lastRollKey = useRef<number>(rollKey);
  const controls = useAnimationControls();

  useEffect(() => {
    if (rollKey === lastRollKey.current) return;
    lastRollKey.current = rollKey;
    if (value == null) return;
    setRolling(true);
    const ANIM_MS = 1200;
    controls.start({
      rotate: [0, -25, 30, -22, 18, -10, 6, 0],
      transition: { duration: ANIM_MS / 1000, ease: "easeOut" },
    });
    const id = window.setInterval(() => {
      setDisplayed(((Math.floor(Math.random() * 6) + 1) as DieValue));
    }, 75);
    const t = window.setTimeout(() => {
      window.clearInterval(id);
      setDisplayed(value);
      setRolling(false);
      onRollSettled?.(value);
    }, ANIM_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey]);

  // Sync when the parent changes value externally (e.g. revisiting a slot).
  useEffect(() => {
    if (!rolling && value != null) setDisplayed(value);
  }, [value, rolling]);

  return (
    <motion.div
      animate={controls}
      className={[
        "relative rounded-xl bg-bar-panel2 border-2 border-bar-amber/60 shadow-inner",
        "flex items-center justify-center select-none",
      ].join(" ")}
      style={{ width: size, height: size }}
      aria-label={value == null ? "die not yet rolled" : `die showing ${displayed}`}
    >
      <DieFace value={value == null && !rolling ? null : displayed} size={size} />
    </motion.div>
  );
}

export function DieFace({
  value,
  size = 88,
  highlight = false,
}: {
  value: DieValue | null;
  size?: number;
  highlight?: boolean;
}) {
  const dot = size * 0.13;
  const cx = size / 2;
  const off = size * 0.27;
  const positions: Record<DieValue, [number, number][]> = {
    1: [[cx, cx]],
    2: [
      [cx - off, cx - off],
      [cx + off, cx + off],
    ],
    3: [
      [cx - off, cx - off],
      [cx, cx],
      [cx + off, cx + off],
    ],
    4: [
      [cx - off, cx - off],
      [cx + off, cx - off],
      [cx - off, cx + off],
      [cx + off, cx + off],
    ],
    5: [
      [cx - off, cx - off],
      [cx + off, cx - off],
      [cx, cx],
      [cx - off, cx + off],
      [cx + off, cx + off],
    ],
    6: [
      [cx - off, cx - off],
      [cx + off, cx - off],
      [cx - off, cx],
      [cx + off, cx],
      [cx - off, cx + off],
      [cx + off, cx + off],
    ],
  };
  const fill = highlight ? "#f5a524" : "#f5e6c8";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {value == null
        ? null
        : positions[value].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={dot} fill={fill} />
          ))}
    </svg>
  );
}
