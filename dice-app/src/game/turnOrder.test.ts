import { describe, expect, it } from "vitest";
import { computeTurnOrder } from "./turnOrder";
import type { PlayerOrderInput } from "./types";

const makePlayers = (
  rows: { id: string; displayName: string; setupRoll: number }[],
): PlayerOrderInput[] =>
  rows.map((r, i) => ({
    id: r.id,
    displayName: r.displayName,
    setupRoll: r.setupRoll as 1 | 2 | 3 | 4 | 5 | 6,
    entryIndex: i,
  }));

describe("computeTurnOrder — highestRoll with tiebreak", () => {
  it("sorts by setupRoll descending; ties break by later entryIndex first", () => {
    const players = makePlayers([
      { id: "S", displayName: "Steve", setupRoll: 4 },
      { id: "T", displayName: "Tom", setupRoll: 3 },
      { id: "B", displayName: "Bob", setupRoll: 6 },
      { id: "A", displayName: "Ana", setupRoll: 6 },
    ]);
    expect(computeTurnOrder({ players, option: "highestRoll" })).toEqual([
      "A",
      "B",
      "S",
      "T",
    ]);
  });
});

describe("computeTurnOrder — entryOrder", () => {
  it("preserves the entry order exactly", () => {
    const players = makePlayers([
      { id: "S", displayName: "Steve", setupRoll: 1 },
      { id: "T", displayName: "Tom", setupRoll: 6 },
      { id: "B", displayName: "Bob", setupRoll: 3 },
    ]);
    expect(computeTurnOrder({ players, option: "entryOrder" })).toEqual([
      "S",
      "T",
      "B",
    ]);
  });
});

describe("computeTurnOrder — alphabetical", () => {
  it("sorts case-insensitively", () => {
    const players = makePlayers([
      { id: "1", displayName: "Steve", setupRoll: 1 },
      { id: "2", displayName: "tom", setupRoll: 1 },
      { id: "3", displayName: "bob", setupRoll: 1 },
    ]);
    expect(computeTurnOrder({ players, option: "alphabetical" })).toEqual([
      "3",
      "1",
      "2",
    ]);
  });
});

describe("computeTurnOrder — randomize", () => {
  it("returns a permutation of all input ids", () => {
    const players = makePlayers([
      { id: "1", displayName: "A", setupRoll: 1 },
      { id: "2", displayName: "B", setupRoll: 2 },
      { id: "3", displayName: "C", setupRoll: 3 },
      { id: "4", displayName: "D", setupRoll: 4 },
    ]);
    const result = computeTurnOrder({ players, option: "randomize" });
    expect(result.slice().sort()).toEqual(["1", "2", "3", "4"]);
  });

  it("is deterministic given a seeded rng", () => {
    const players = makePlayers([
      { id: "1", displayName: "A", setupRoll: 1 },
      { id: "2", displayName: "B", setupRoll: 2 },
      { id: "3", displayName: "C", setupRoll: 3 },
    ]);
    // Tiny seeded LCG.
    let s = 42;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
    const a = computeTurnOrder({ players, option: "randomize", rng });
    s = 42;
    const b = computeTurnOrder({ players, option: "randomize", rng });
    expect(a).toEqual(b);
  });
});
