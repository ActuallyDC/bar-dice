import { scoreHand } from "./score";
import type { Hand } from "./types";

export interface EasyHoldDecision {
  /** Boolean per-die: true means hold (don't re-roll). */
  held: readonly [boolean, boolean, boolean, boolean, boolean];
  /** True if the engine recommends staying — already a 5-of-a-kind. */
  stay: boolean;
}

/**
 * Optimal-hold algorithm for Easy mode. Hold every wild AND every die that
 * matches the face the score engine selected for this hand. If the hand is
 * already a 5-of-a-kind, signal `stay` and hold everything.
 */
export function easyHold(dice: Hand): EasyHoldDecision {
  const score = scoreHand(dice);
  if (score.count === 5) {
    return {
      held: [true, true, true, true, true],
      stay: true,
    };
  }
  const held = dice.map(
    (d) => d === 1 || d === score.faceValue,
  ) as unknown as [boolean, boolean, boolean, boolean, boolean];
  return { held, stay: false };
}
