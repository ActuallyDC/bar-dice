import { describe, expect, it } from "vitest";
import { easyHold } from "./easyHold";
import { asHand } from "./score";

describe("easyHold", () => {
  it("stays on a 5-of-a-kind from roll 1", () => {
    const r = easyHold(asHand([6, 6, 6, 6, 6]));
    expect(r.stay).toBe(true);
    expect(r.held).toEqual([true, true, true, true, true]);
  });

  it("stays on five wilds (Five Sixes)", () => {
    const r = easyHold(asHand([1, 1, 1, 1, 1]));
    expect(r.stay).toBe(true);
  });

  it("stays on three-of-a-kind plus enough wilds (4 wilds + 1 face = 5 of that face)", () => {
    const r = easyHold(asHand([1, 1, 1, 1, 4]));
    expect(r.stay).toBe(true);
    expect(r.held).toEqual([true, true, true, true, true]);
  });

  it("holds wilds and matching face, rerolls the rest", () => {
    // 1,1,5,5,6 → score is (4,5). Hold the two 1s and two 5s, reroll the 6.
    const r = easyHold(asHand([1, 1, 5, 5, 6]));
    expect(r.stay).toBe(false);
    expect(r.held).toEqual([true, true, true, true, false]);
  });

  it("holds a single wild + the highest singleton when no pair exists", () => {
    // 2,3,4,5,6 → score (1,6). Hold the 6, reroll everything else.
    const r = easyHold(asHand([2, 3, 4, 5, 6]));
    expect(r.stay).toBe(false);
    expect(r.held).toEqual([false, false, false, false, true]);
  });

  it("on 1,2,3,4,5 holds the wild + the 5", () => {
    const r = easyHold(asHand([1, 2, 3, 4, 5]));
    expect(r.stay).toBe(false);
    expect(r.held).toEqual([true, false, false, false, true]);
  });

  it("two wilds + a pair holds wilds + pair", () => {
    // 1,1,3,3,2 → score (4,3). Hold 1,1,3,3, reroll the 2.
    const r = easyHold(asHand([1, 1, 3, 3, 2]));
    expect(r.held).toEqual([true, true, true, true, false]);
  });

  it("on 6,6,5,5,4 (no wilds, count tie) holds the higher-face pair", () => {
    // Score is (2,6); should hold the two 6s only.
    const r = easyHold(asHand([6, 6, 5, 5, 4]));
    expect(r.held).toEqual([true, true, false, false, false]);
  });
});
