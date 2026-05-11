import { describe, expect, it } from "vitest";
import { asHand, compareScores, describeScore, scoreHand } from "./score";

describe("scoreHand — worked examples", () => {
  const cases: { dice: number[]; count: number; face: number; display: string }[] = [
    { dice: [1, 1, 3, 5, 6], count: 3, face: 6, display: "Three Sixes (36)" },
    { dice: [1, 1, 1, 5, 6], count: 4, face: 6, display: "Four Sixes (46)" },
    { dice: [1, 1, 1, 1, 1], count: 5, face: 6, display: "Five Sixes (56)" },
    { dice: [2, 2, 3, 3, 4], count: 2, face: 3, display: "Two Threes (23)" },
    { dice: [2, 2, 2, 3, 4], count: 3, face: 2, display: "Three Twos (32)" },
    { dice: [1, 2, 3, 4, 5], count: 2, face: 5, display: "Two Fives (25)" },
    { dice: [1, 1, 6, 6, 6], count: 5, face: 6, display: "Five Sixes (56)" },
    { dice: [6, 6, 5, 5, 4], count: 2, face: 6, display: "Two Sixes (26)" },
  ];
  for (const c of cases) {
    it(`scores [${c.dice.join(",")}] as ${c.display}`, () => {
      const s = scoreHand(asHand(c.dice));
      expect(s).toEqual({ count: c.count, faceValue: c.face });
      expect(describeScore(s)).toBe(c.display);
    });
  }
});

describe("scoreHand — edge cases", () => {
  it("never scores faceValue = 1", () => {
    const s = scoreHand(asHand([1, 1, 1, 1, 2]));
    expect(s.faceValue).not.toBe(1);
    expect(s).toEqual({ count: 5, faceValue: 2 });
  });

  it("breaks count tie by higher face", () => {
    // 4s and 5s both count 2 on their own; the 1 promotes to whichever is best.
    // With wilds: 4-count = 1+wild = ... here no wild. 4,4,5,5,2 → both 4s and 5s count 2; 5s wins.
    expect(scoreHand(asHand([4, 4, 5, 5, 2]))).toEqual({ count: 2, faceValue: 5 });
  });

  it("a single wild promotes to highest singleton when no pair exists", () => {
    // 1,2,3,4,5 → with the wild adding to 5 we get count 2 on 5s.
    // 5 is also strictly the highest face, so faceValue 5.
    expect(scoreHand(asHand([1, 2, 3, 4, 5]))).toEqual({ count: 2, faceValue: 5 });
  });

  it("wilds with a pair go to the higher-count face", () => {
    // 1,1,2,2,6 → 2s with wilds = 4, 6s with wilds = 3. 2s wins on count.
    expect(scoreHand(asHand([1, 1, 2, 2, 6]))).toEqual({ count: 4, faceValue: 2 });
  });
});

describe("describeScore singular/plural + numeric code", () => {
  it("uses singular for count = 1, with code", () => {
    expect(describeScore({ count: 1, faceValue: 4 })).toBe("One Four (14)");
    expect(describeScore({ count: 1, faceValue: 6 })).toBe("One Six (16)");
  });
  it("uses plural for count >= 2, with code", () => {
    expect(describeScore({ count: 2, faceValue: 4 })).toBe("Two Fours (24)");
    expect(describeScore({ count: 5, faceValue: 6 })).toBe("Five Sixes (56)");
  });
});

describe("compareScores", () => {
  it("higher count wins", () => {
    expect(
      compareScores({ count: 3, faceValue: 2 }, { count: 2, faceValue: 6 }),
    ).toBe(1);
  });
  it("higher face breaks count tie", () => {
    expect(
      compareScores({ count: 3, faceValue: 5 }, { count: 3, faceValue: 6 }),
    ).toBe(-1);
  });
  it("equal scores tie", () => {
    expect(
      compareScores({ count: 4, faceValue: 6 }, { count: 4, faceValue: 6 }),
    ).toBe(0);
  });
});
