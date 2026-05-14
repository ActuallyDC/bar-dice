import { describe, expect, it } from "vitest";
import { maxScoreAfterRoll2 } from "./projection";
import { asHand } from "./score";

describe("maxScoreAfterRoll2", () => {
  it("projects Five of the held face when a non-wild is held", () => {
    expect(
      maxScoreAfterRoll2(asHand([4, 4, 1, 2, 3]), [true, true, true, false, false]),
    ).toEqual({ count: 5, faceValue: 4 });
  });

  it("ignores the wild 1 when picking the held face", () => {
    // First held position is the wild 1; real score face is 4.
    expect(
      maxScoreAfterRoll2(asHand([1, 4, 4, 2, 5]), [true, true, true, false, false]),
    ).toEqual({ count: 5, faceValue: 4 });
  });

  it("returns Five Sixes when only wild 1s are held", () => {
    expect(
      maxScoreAfterRoll2(asHand([1, 2, 3, 4, 5]), [true, false, false, false, false]),
    ).toEqual({ count: 5, faceValue: 6 });
  });

  it("returns null when nothing is held", () => {
    expect(
      maxScoreAfterRoll2(asHand([1, 2, 3, 4, 5]), [false, false, false, false, false]),
    ).toBeNull();
  });
});
