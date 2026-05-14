import type { Hand, Score, ScoreFace } from "./types";

/**
 * Best score the active player could reach after the 2nd Roll, given
 * the current held set. Assumes every re-rolled die lands on the held
 * face (or a wild 1, which promotes to it). If only wild 1s are held,
 * the all-wild best case is Five Sixes — matching scoreHand's promotion
 * rule for an all-wild hand.
 *
 * Returns null when nothing is held — in that case any score is reachable
 * so a "best case" warning would be meaningless.
 */
export function maxScoreAfterRoll2(
  dice: Hand,
  held: readonly boolean[],
): Score | null {
  let heldFace: number | null = null;
  for (let i = 0; i < 5; i++) {
    if (!held[i]) continue;
    const v = dice[i];
    if (v !== 1) {
      heldFace = v;
      break;
    }
    if (heldFace === null) heldFace = v;
  }
  if (heldFace === null) return null;
  const face: ScoreFace = (heldFace === 1 ? 6 : heldFace) as ScoreFace;
  return { count: 5, faceValue: face };
}
