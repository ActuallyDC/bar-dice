import type { DieValue, Hand, Score, ScoreFace } from "./types";

const FACES: readonly ScoreFace[] = [2, 3, 4, 5, 6];

/**
 * Score a 5-die hand. 1s are wild and auto-promote to whichever
 * non-wild face yields the highest count; ties on count break by
 * the higher face value. An all-wild hand scores Five Sixes.
 */
export function scoreHand(dice: Hand): Score {
  let wilds = 0;
  const counts: Record<ScoreFace, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    if (d === 1) wilds += 1;
    else counts[d] += 1;
  }
  if (wilds === 5) return { count: 5, faceValue: 6 };

  let best: Score = { count: 0, faceValue: 2 };
  for (const f of FACES) {
    const total = counts[f] + wilds;
    if (total === 0) continue;
    if (
      total > best.count ||
      (total === best.count && f > best.faceValue)
    ) {
      best = { count: total, faceValue: f };
    }
  }
  return best;
}

/** -1 if a < b, 1 if a > b, 0 if tied. */
export function compareScores(a: Score, b: Score): -1 | 0 | 1 {
  if (a.count !== b.count) return a.count > b.count ? 1 : -1;
  if (a.faceValue !== b.faceValue) return a.faceValue > b.faceValue ? 1 : -1;
  return 0;
}

const SINGULAR_COUNT = ["Zero", "One", "Two", "Three", "Four", "Five"] as const;
const FACE_SINGULAR: Record<ScoreFace, string> = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
};
const FACE_PLURAL: Record<ScoreFace, string> = {
  2: "Twos",
  3: "Threes",
  4: "Fours",
  5: "Fives",
  6: "Sixes",
};

export function describeScore(score: Score): string {
  const countWord = SINGULAR_COUNT[score.count] ?? String(score.count);
  const faceWord =
    score.count === 1 ? FACE_SINGULAR[score.faceValue] : FACE_PLURAL[score.faceValue];
  // Bar shorthand: count digit followed by face digit, e.g., 45 = Four Fives.
  return `${countWord} ${faceWord} (${score.count}${score.faceValue})`;
}

/** Convenience used widely in tests and the reducer. */
export function asHand(values: readonly number[]): Hand {
  if (values.length !== 5) {
    throw new Error(`expected 5 dice, got ${values.length}`);
  }
  return values.map((v) => {
    if (!Number.isInteger(v) || v < 1 || v > 6) {
      throw new Error(`invalid die value ${v}`);
    }
    return v as DieValue;
  }) as unknown as Hand;
}
