import { describe, expect, it } from "vitest";
import {
  activePlayerId,
  inGamePlayerCount,
  makeInitialState,
  reducer,
  type GameAction,
  type GameState,
} from "./reducer";
import { asHand } from "./score";
import type { GameMode, Hand, PlayerSlot } from "./types";

function players(names: string[]): PlayerSlot[] {
  return names.map((n, i) => ({
    id: n.toLowerCase(),
    displayName: n,
    nameKey: n.toLowerCase(),
    setupRoll: ((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
    entryIndex: i,
  }));
}

function startGame(mode: GameMode, names: string[]): GameState {
  const ps = players(names);
  return reducer(makeInitialState(), {
    type: "START",
    players: ps,
    turnOrder: ps.map((p) => p.id),
    mode,
  });
}

function dispatch(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(reducer, state);
}

/** Apply a complete Easy-mode turn for the active player using preset roll dice. */
function easyTurn(state: GameState, roll1: Hand, roll2: Hand): GameState {
  let s = state;
  s = reducer(s, { type: "ROLL_1", dice: roll1 });
  if (s.turnPhase === "rolled1") {
    s = reducer(s, { type: "ROLL_2", dice: roll2 });
  }
  s = reducer(s, { type: "COMMIT_TURN" });
  return s;
}

/** Apply a complete Advanced-mode turn: hold pattern then re-roll. */
function advancedTurn(
  state: GameState,
  roll1: Hand,
  holdAfter1: boolean[],
  roll2OrStay: { kind: "roll"; dice: Hand } | { kind: "stay" },
): GameState {
  let s = reducer(state, { type: "ROLL_1", dice: roll1 });
  for (let i = 0; i < 5; i++) {
    if (holdAfter1[i]) s = reducer(s, { type: "TOGGLE_HOLD", index: i });
  }
  if (roll2OrStay.kind === "stay") {
    s = reducer(s, { type: "STAY" });
  } else {
    s = reducer(s, { type: "ROLL_2", dice: roll2OrStay.dice });
  }
  s = reducer(s, { type: "COMMIT_TURN" });
  return s;
}

describe("reducer — START", () => {
  it("sets up the elimination pool from turnOrder for 3+ players", () => {
    const s = startGame("easy", ["Ana", "Bob", "Steve", "Tom"]);
    expect(s.context.kind).toBe("elim");
    expect(s.context.round).toBe(1);
    expect(s.poolOrder).toEqual(["ana", "bob", "steve", "tom"]);
    expect(activePlayerId(s)).toBe("ana");
    expect(s.turnPhase).toBe("idle");
    expect(s.awaitingFirstRoll).toBe(true);
    expect(inGamePlayerCount(s)).toBe(4);
  });

  it("a 2-player game starts directly in the Best-of-3 finale", () => {
    const s = startGame("easy", ["Ana", "Bob"]);
    expect(s.context.kind).toBe("finale");
    expect(s.context.gameNumber).toBe(1);
    expect(s.finalists.sort()).toEqual(["ana", "bob"]);
    expect(s.poolOrder).toEqual(["ana", "bob"]);
    expect(s.finaleLosses).toEqual({ ana: 0, bob: 0 });
    expect(s.safeIds).toEqual([]);
  });

  it("a 2-player game can be played to a Loser without stalling", () => {
    let s = startGame("easy", ["Ana", "Bob"]);
    // Ana wins game 1
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // Ana → (5,6)
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // Bob → ?
    expect(s.summary?.kind).toBe("finaleResolved");
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.context.gameNumber).toBe(2);
    // Ana wins game 2 → Bob has 2 losses → game over
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // Ana
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // Bob
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.finished).toBe(true);
    expect(s.loserId).toBe("bob");
  });
});

describe("reducer — Easy mode 5-player round picks the correct Safe player", () => {
  it("the player with the highest hand becomes safe", () => {
    let s = startGame("easy", ["A", "B", "C", "D", "E"]);
    expect(activePlayerId(s)).toBe("a");
    // A: roll1 [2,2,3,4,5] → easyHold holds the two 2s; roll2 fills [_,_,2,2,2] → (5,2)
    s = easyTurn(s, asHand([2, 2, 3, 4, 5]), asHand([2, 2, 2, 2, 2])); // A → (5,2)
    // B: roll1 [3,3,3,4,5] → holds the three 3s; roll2 fills weakly → ends as (3,3)
    s = easyTurn(s, asHand([3, 3, 3, 4, 5]), asHand([2, 2, 2, 2, 2])); // B → (3,3)
    // C: roll1 [1,1,6,6,5] → score (4,6), holds wilds+6s; roll2 fills pos4 with 6 → (5,6)
    s = easyTurn(s, asHand([1, 1, 6, 6, 5]), asHand([6, 6, 6, 6, 6])); // C → (5,6)
    // D: roll1 [2,3,4,5,6] → score (1,6), holds the 6; roll2 fills 0..3 with [2,2,2,2] → (1,6)
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // D → (1,6)
    // E: roll1 [2,2,3,4,5] → holds the 2s; roll2 fills weakly → (3,2)
    s = easyTurn(s, asHand([2, 2, 3, 4, 5]), asHand([3, 4, 5, 3, 4])); // E → (3,2)
    expect(s.summary).not.toBeNull();
    expect(s.summary?.kind).toBe("elimResolved");
    expect(s.summary?.winnerId).toBe("c");
  });
});

describe("reducer — Advanced mode 5-player round picks the correct Safe player", () => {
  it("respects player choice of holds", () => {
    let s = startGame("advanced", ["A", "B", "C", "D", "E"]);
    // A: rolls 2,2,3,4,5; holds the two 2s; rerolls to 6,6,6 → final 2,2,6,6,6 → score (3,6)
    s = advancedTurn(
      s,
      asHand([2, 2, 3, 4, 5]),
      [true, true, false, false, false],
      { kind: "roll", dice: asHand([1, 1, 6, 6, 6]) },
    );
    // B: rolls 1,2,3,4,5; holds nothing; rerolls all to 4,4,4,4,4 → (5 with wild?? no: the wild is in pos 0 if reroll gave a 4 there) — actually reroll value position 0 = 4, so dice = 4,4,4,4,4 → (5,4)
    s = advancedTurn(
      s,
      asHand([1, 2, 3, 4, 5]),
      [false, false, false, false, false],
      { kind: "roll", dice: asHand([4, 4, 4, 4, 4]) },
    );
    // C: stays after roll 1 with 3,3,3,3,3 → (5,3)
    s = advancedTurn(
      s,
      asHand([3, 3, 3, 3, 3]),
      [false, false, false, false, false],
      { kind: "stay" },
    );
    // D: rolls 2,3,4,5,6 → holds the 6 → rerolls to 6,6,6,6 → final 6,6,6,6,6 → (5,6)
    s = advancedTurn(
      s,
      asHand([2, 3, 4, 5, 6]),
      [false, false, false, false, true],
      { kind: "roll", dice: asHand([6, 6, 6, 6, 6]) },
    );
    // E: rolls 2,2,2,3,3 → holds the 3s → rerolls to 1,1,1 → final 1,1,1,3,3 → 3s with 3 wilds = (5,3)
    s = advancedTurn(
      s,
      asHand([2, 2, 2, 3, 3]),
      [false, false, false, true, true],
      { kind: "roll", dice: asHand([1, 1, 1, 3, 3]) },
    );
    expect(s.summary?.kind).toBe("elimResolved");
    expect(s.summary?.winnerId).toBe("d"); // D's (5,6) beats everyone
  });
});

describe("reducer — Advanced mode: Easy auto-hold doesn't apply", () => {
  it("dice are not pre-held in advanced mode", () => {
    let s = startGame("advanced", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([1, 1, 5, 5, 6]) });
    expect(s.held).toEqual([false, false, false, false, false]);
    expect(s.turnPhase).toBe("rolled1");
  });
});

describe("reducer — Easy mode: optimal hold is applied automatically", () => {
  it("holds wilds and matching face after roll 1", () => {
    let s = startGame("easy", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([1, 1, 5, 5, 6]) });
    expect(s.held).toEqual([true, true, true, true, false]);
    expect(s.turnPhase).toBe("rolled1");
  });

  it("skips roll 2 on a 5-of-a-kind from roll 1", () => {
    let s = startGame("easy", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([6, 6, 6, 6, 6]) });
    expect(s.turnPhase).toBe("rolled2");
    expect(s.held).toEqual([true, true, true, true, true]);
  });
});

describe("reducer — TOGGLE_HOLD only valid in Advanced rolled1", () => {
  it("ignored in Easy mode", () => {
    let s = startGame("easy", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([1, 1, 5, 5, 6]) });
    const before = s.held;
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    expect(s.held).toBe(before);
  });
});

describe("reducer — STAY is valid in both Easy and Advanced", () => {
  it("Easy mode can STAY after roll 1 instead of taking roll 2", () => {
    let s = startGame("easy", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([1, 1, 5, 5, 6]) });
    expect(s.turnPhase).toBe("rolled1");
    s = reducer(s, { type: "STAY" });
    expect(s.turnPhase).toBe("rolled2");
    // Score uses the dice from roll 1 unchanged.
    s = reducer(s, { type: "COMMIT_TURN" });
    expect(s.poolResults.a.score).toEqual({ count: 4, faceValue: 5 });
  });
});

describe("reducer — Tie triggers a roll-off (elim path)", () => {
  it("roll-off uses only the tied players; single-roll format", () => {
    // 3-player elim round so we exercise the elim roll-off branch (2-player
    // games start directly in the finale, which is covered separately).
    let s = startGame("easy", ["A", "B", "C"]);
    // A & B tie at Five Sixes; C is well below.
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // A → (5,6)
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // B → (5,6)
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // C → low
    expect(s.summary?.kind).toBe("rollOffNeeded");
    expect(s.summary?.tiedIds?.sort()).toEqual(["a", "b"]);
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.inRollOff).toBe(true);
    expect(s.poolOrder).toEqual(["a", "b"]); // only the tied players

    // Single-roll roll-off: ROLL_1 should land directly in "rolled2" with no holds.
    s = reducer(s, { type: "ROLL_1", dice: asHand([6, 6, 6, 6, 6]) });
    expect(s.turnPhase).toBe("rolled2");
    expect(s.held).toEqual([false, false, false, false, false]);
    s = reducer(s, { type: "COMMIT_TURN" });

    // Player B's single roll
    s = reducer(s, { type: "ROLL_1", dice: asHand([2, 3, 4, 5, 6]) });
    expect(s.turnPhase).toBe("rolled2");
    s = reducer(s, { type: "COMMIT_TURN" });

    expect(s.summary?.kind).toBe("elimResolved");
    expect(s.summary?.winnerId).toBe("a");
  });
});

describe("reducer — Advanced roll-off ignores TOGGLE_HOLD and STAY", () => {
  it("a single roll commits directly", () => {
    let s = startGame("advanced", ["A", "B", "C"]);
    // Round 1: A wins clearly so we exit elimination → finale of B vs C.
    s = advancedTurn(
      s,
      asHand([6, 6, 6, 6, 6]),
      [true, true, true, true, true],
      { kind: "stay" },
    );
    s = advancedTurn(s, asHand([2, 3, 4, 5, 6]), [], { kind: "roll", dice: asHand([2, 2, 2, 2, 2]) });
    s = advancedTurn(s, asHand([2, 3, 4, 5, 6]), [], { kind: "roll", dice: asHand([2, 2, 2, 2, 2]) });
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    // Finale game 1: B vs C tie (both Five Sixes).
    s = advancedTurn(s, asHand([6, 6, 6, 6, 6]), [true, true, true, true, true], { kind: "stay" });
    s = advancedTurn(s, asHand([6, 6, 6, 6, 6]), [true, true, true, true, true], { kind: "stay" });
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" }); // start finale roll-off
    expect(s.inRollOff).toBe(true);

    // Roll-off in Advanced: ROLL_1 → directly rolled2; TOGGLE_HOLD / STAY are no-ops.
    s = reducer(s, { type: "ROLL_1", dice: asHand([5, 5, 5, 5, 5]) });
    expect(s.turnPhase).toBe("rolled2");
    const beforeToggle = s;
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    expect(s).toBe(beforeToggle); // unchanged
    s = reducer(s, { type: "STAY" });
    expect(s).toBe(beforeToggle); // unchanged
    s = reducer(s, { type: "COMMIT_TURN" });
    s = reducer(s, { type: "ROLL_1", dice: asHand([2, 3, 4, 5, 6]) });
    s = reducer(s, { type: "COMMIT_TURN" });

    expect(s.summary?.kind).toBe("finaleResolved");
  });
});

describe("reducer — round 2 turn order skips Safe players", () => {
  it("with 4 players, round 2 has 3 players in their original order minus Safe", () => {
    let s = startGame("easy", ["A", "B", "C", "D"]);
    // A wins round 1 with Five Sixes
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // A
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 3, 4, 5, 6])); // B
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 3, 4, 5, 6])); // C
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 3, 4, 5, 6])); // D
    expect(s.summary?.winnerId).toBe("a");
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.context).toEqual({ kind: "elim", round: 2 });
    expect(s.poolOrder).toEqual(["b", "c", "d"]);
    expect(s.safeIds).toEqual(["a"]);
  });
});

describe("reducer — full 4-player game ends with one loser", () => {
  it("plays through to the finale and produces a loserId", () => {
    let s = startGame("easy", ["A", "B", "C", "D"]);
    // Round 1: A safe.
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // A → (5,6)
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // B
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // C
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // D
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    // Round 2 (B,C,D): B wins.
    s = easyTurn(s, asHand([5, 5, 5, 5, 5]), asHand([1, 1, 1, 1, 1])); // B → (5,5)
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // C
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // D
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    // Now finale: C vs D
    expect(s.context.kind).toBe("finale");
    expect(s.context.gameNumber).toBe(1);
    expect(s.finalists.sort()).toEqual(["c", "d"]);
    expect(s.poolOrder).toEqual(["c", "d"]);

    // Finale game 1: C wins
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // C
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // D
    expect(s.summary?.kind).toBe("finaleResolved");
    expect(s.summary?.winnerId).toBe("c");
    expect(s.summary?.finaleLoserId).toBe("d");
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.context.gameNumber).toBe(2);
    expect(s.finaleLosses.d).toBe(1);

    // Finale game 2: C wins again → D loses series 0-2 → game over
    s = easyTurn(s, asHand([6, 6, 6, 6, 6]), asHand([1, 1, 1, 1, 1])); // C
    s = easyTurn(s, asHand([2, 3, 4, 5, 6]), asHand([2, 2, 2, 2, 2])); // D
    expect(s.summary?.kind).toBe("finaleResolved");
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.finished).toBe(true);
    expect(s.loserId).toBe("d");
  });
});

describe("reducer — finale tie triggers a roll-off in same mode", () => {
  it("inRollOff is set; mode unchanged", () => {
    // 3-player game so we reach the finale via elimination (covers a different
    // path than the 2-player direct-to-finale start).
    let s = startGame("advanced", ["A", "B", "C"]);
    // Round 1: A wins clearly
    s = advancedTurn(s, asHand([6, 6, 6, 6, 6]), [true, true, true, true, true], { kind: "stay" });
    s = advancedTurn(s, asHand([2, 3, 4, 5, 6]), [], { kind: "roll", dice: asHand([2, 2, 2, 2, 2]) });
    s = advancedTurn(s, asHand([2, 3, 4, 5, 6]), [], { kind: "roll", dice: asHand([2, 2, 2, 2, 2]) });
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    // Finale game 1: tie between B and C.
    s = advancedTurn(s, asHand([6, 6, 6, 6, 6]), [true, true, true, true, true], { kind: "stay" });
    s = advancedTurn(s, asHand([6, 6, 6, 6, 6]), [true, true, true, true, true], { kind: "stay" });
    expect(s.summary?.kind).toBe("rollOffNeeded");
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    expect(s.inRollOff).toBe(true);
    expect(s.context.kind).toBe("finale");
    expect(s.mode).toBe("advanced");
    expect(s.poolOrder.sort()).toEqual(["b", "c"]);
  });
});

describe("reducer — RESET", () => {
  it("returns to initial state", () => {
    let s = startGame("easy", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([6, 6, 6, 6, 6]) });
    s = reducer(s, { type: "RESET" });
    expect(s).toEqual(makeInitialState());
  });
});

describe("reducer — same-players-again is supported via RESET + START", () => {
  it("a fresh START with the same 2 players resets to a fresh finale", () => {
    let s = startGame("easy", ["A", "B"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([6, 6, 6, 6, 6]) });
    s = dispatch(s, { type: "RESET" }, {
      type: "START",
      mode: "easy",
      players: players(["A", "B"]),
      turnOrder: ["a", "b"],
    });
    expect(s.context).toEqual({ kind: "finale", gameNumber: 1 });
    expect(s.poolOrder).toEqual(["a", "b"]);
    expect(s.safeIds).toEqual([]);
    expect(s.finaleLosses).toEqual({ a: 0, b: 0 });
  });

  it("a fresh START with the same 3+ players resets to a fresh elim round 1", () => {
    let s = startGame("easy", ["A", "B", "C"]);
    s = reducer(s, { type: "ROLL_1", dice: asHand([6, 6, 6, 6, 6]) });
    s = dispatch(s, { type: "RESET" }, {
      type: "START",
      mode: "easy",
      players: players(["A", "B", "C"]),
      turnOrder: ["a", "b", "c"],
    });
    expect(s.context).toEqual({ kind: "elim", round: 1 });
    expect(s.poolOrder).toEqual(["a", "b", "c"]);
    expect(s.safeIds).toEqual([]);
  });
});

function p(id: string, idx: number): PlayerSlot {
  return {
    id,
    displayName: id.toUpperCase(),
    nameKey: id,
    setupRoll: 6,
    entryIndex: idx,
  };
}

// Five 6s - top score.
const TOP: Hand = [6, 6, 6, 6, 6];
// Four 6s - genuinely lower (5 is not a wild, so no promotion).
const MID: Hand = [6, 6, 6, 6, 5];

describe("finaleGameLog", () => {
  it("appends each finale game winnerId in order", () => {
    let s = makeInitialState();
    s = reducer(s, {
      type: "START",
      players: [p("a", 0), p("b", 1)],
      turnOrder: ["a", "b"],
      mode: "advanced",
    });
    // Helper: drive one finale game where the *first roller* gets firstHand and second gets secondHand.
    const playGame = (firstHand: Hand, secondHand: Hand) => {
      s = reducer(s, { type: "ROLL_1", dice: firstHand });
      s = reducer(s, { type: "STAY" });
      s = reducer(s, { type: "COMMIT_TURN" });
      s = reducer(s, { type: "ROLL_1", dice: secondHand });
      s = reducer(s, { type: "STAY" });
      s = reducer(s, { type: "COMMIT_TURN" });
      // Summary should now be finaleResolved.
      s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    };
    // turnOrder is [a, b] so a rolls first each game.
    // Game 1: a wins (a gets TOP, b gets MID).
    playGame(TOP, MID);
    expect(s.finaleGameLog).toEqual(["a"]);
    // Game 2: b wins (a gets MID, b gets TOP).
    playGame(MID, TOP);
    expect(s.finaleGameLog).toEqual(["a", "b"]);
    // Game 3: a wins -> game ends (best of 3).
    playGame(TOP, MID);
    expect(s.finaleGameLog).toEqual(["a", "b", "a"]);
    expect(s.finished).toBe(true);
    expect(s.loserId).toBe("b");
  });

  it("is reset on RESET", () => {
    let s = makeInitialState();
    s = { ...s, finaleGameLog: ["a", "b"] };
    s = reducer(s, { type: "RESET" });
    expect(s.finaleGameLog).toEqual([]);
  });
});

describe("resultApplied", () => {
  it("MARK_RESULT_APPLIED sets the flag", () => {
    const s = makeInitialState();
    expect(s.resultApplied).toBe(false);
    const next = reducer(s, { type: "MARK_RESULT_APPLIED" });
    expect(next.resultApplied).toBe(true);
  });

  it("is idempotent when already true", () => {
    let s = reducer(makeInitialState(), { type: "MARK_RESULT_APPLIED" });
    const ref = s;
    s = reducer(s, { type: "MARK_RESULT_APPLIED" });
    expect(s.resultApplied).toBe(true);
    expect(s).toBe(ref);
  });

  it("RESET clears the flag", () => {
    const flagged = reducer(makeInitialState(), { type: "MARK_RESULT_APPLIED" });
    const reset = reducer(flagged, { type: "RESET" });
    expect(reset.resultApplied).toBe(false);
  });

  it("START clears the flag", () => {
    const flagged = reducer(makeInitialState(), { type: "MARK_RESULT_APPLIED" });
    const p1: PlayerSlot = { id: "p1", displayName: "Ana", nameKey: "ana", setupRoll: 6, entryIndex: 0 };
    const p2: PlayerSlot = { id: "p2", displayName: "Bob", nameKey: "bob", setupRoll: 1, entryIndex: 1 };
    const started = reducer(flagged, { type: "START", players: [p1, p2], turnOrder: ["p1", "p2"], mode: "advanced" });
    expect(started.resultApplied).toBe(false);
  });
});

describe("stayedThisTurn", () => {
  function startTwoPlayer() {
    const p1: PlayerSlot = {
      id: "p1", displayName: "Ana", nameKey: "ana",
      setupRoll: 6, entryIndex: 0,
    };
    const p2: PlayerSlot = {
      id: "p2", displayName: "Bob", nameKey: "bob",
      setupRoll: 1, entryIndex: 1,
    };
    return reducer(makeInitialState(), {
      type: "START",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      mode: "advanced",
    });
  }

  it("STAY sets all held flags true and stayedThisTurn=true", () => {
    let s = startTwoPlayer();
    s = reducer(s, { type: "ROLL_1", dice: [3, 3, 1, 2, 4] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 1 });
    s = reducer(s, { type: "STAY" });
    expect(s.stayedThisTurn).toBe(true);
    expect(s.held).toEqual([true, true, true, true, true]);
    expect(s.turnPhase).toBe("rolled2");
  });

  it("COMMIT_TURN clears stayedThisTurn", () => {
    let s = startTwoPlayer();
    s = reducer(s, { type: "ROLL_1", dice: [3, 3, 1, 2, 4] });
    s = reducer(s, { type: "STAY" });
    s = reducer(s, { type: "COMMIT_TURN" });
    expect(s.stayedThisTurn).toBe(false);
  });

  it("ROLL_1 (next turn) leaves stayedThisTurn false", () => {
    let s = startTwoPlayer();
    s = reducer(s, { type: "ROLL_1", dice: [3, 3, 1, 2, 4] });
    s = reducer(s, { type: "STAY" });
    s = reducer(s, { type: "COMMIT_TURN" });
    s = reducer(s, { type: "ROLL_1", dice: [1, 2, 3, 4, 5] });
    expect(s.stayedThisTurn).toBe(false);
  });
});

describe("newlyMatched", () => {
  function startTwoPlayerAdvanced() {
    const p1: PlayerSlot = {
      id: "p1", displayName: "Ana", nameKey: "ana",
      setupRoll: 6, entryIndex: 0,
    };
    const p2: PlayerSlot = {
      id: "p2", displayName: "Bob", nameKey: "bob",
      setupRoll: 1, entryIndex: 1,
    };
    return reducer(makeInitialState(), {
      type: "START",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      mode: "advanced",
    });
  }

  it("ROLL_2 marks dice that newly landed on the held face", () => {
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [4, 4, 4, 2, 1] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 1 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 2 });
    // Held: indices 0,1,2 (all face 4). Re-roll 3 and 4 with [4, 2].
    s = reducer(s, { type: "ROLL_2", dice: [9, 9, 9, 4, 2] as any });
    expect(s.newlyMatched).toEqual([false, false, false, true, false]);
    expect(s.held).toEqual([true, true, true, true, false]);
  });

  it("ROLL_2 with no held dice yields all-false newlyMatched", () => {
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [1, 2, 3, 4, 5] });
    // No holds — re-roll everything.
    s = reducer(s, { type: "ROLL_2", dice: [6, 6, 6, 6, 6] });
    expect(s.newlyMatched).toEqual([false, false, false, false, false]);
  });

  it("ROLL_1 clears newlyMatched", () => {
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [4, 4, 4, 2, 1] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 1 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 2 });
    s = reducer(s, { type: "ROLL_2", dice: [9, 9, 9, 4, 2] as any });
    expect(s.newlyMatched.some(Boolean)).toBe(true);
    s = reducer(s, { type: "COMMIT_TURN" });
    s = reducer(s, { type: "ROLL_1", dice: [1, 2, 3, 4, 5] });
    expect(s.newlyMatched).toEqual([false, false, false, false, false]);
  });

  it("COMMIT_TURN clears newlyMatched", () => {
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [4, 4, 4, 2, 1] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "ROLL_2", dice: [9, 4, 1, 2, 3] as any });
    // Pos 1 matches the held face (4); pos 2 is a wild 1.
    expect(s.newlyMatched).toEqual([false, true, true, false, false]);
    s = reducer(s, { type: "COMMIT_TURN" });
    expect(s.newlyMatched).toEqual([false, false, false, false, false]);
  });

  it("a re-rolled 1 (wild) is newlyMatched when the held face is not 1", () => {
    // Player holds three 4s. Roll 2 lands a 1 in pos 3 (wild → counts as a 4).
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [4, 4, 4, 2, 5] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 1 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 2 });
    s = reducer(s, { type: "ROLL_2", dice: [9, 9, 9, 1, 6] as any });
    expect(s.newlyMatched).toEqual([false, false, false, true, false]);
    expect(s.held).toEqual([true, true, true, true, false]);
  });

  it("a re-rolled score-face is newlyMatched even when the first held position is a wild 1", () => {
    // Player holds the wild 1 (pos 0) and a pair of 4s (pos 1, 2). Roll 2
    // lands another 4 in pos 3. The score face is 4; the held face must be
    // detected as 4, not 1, so the new 4 is recognised as a match.
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [1, 4, 4, 2, 5] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 1 });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 2 });
    s = reducer(s, { type: "ROLL_2", dice: [9, 9, 9, 4, 6] as any });
    expect(s.newlyMatched).toEqual([false, false, false, true, false]);
    expect(s.held).toEqual([true, true, true, true, false]);
  });

  it("a re-rolled 1 still highlights even when only a wild 1 is held", () => {
    // All-1 holds: nothing else to compare against. A re-rolled 1 still
    // matches (held face is 1).
    let s = startTwoPlayerAdvanced();
    s = reducer(s, { type: "ROLL_1", dice: [1, 2, 3, 4, 5] });
    s = reducer(s, { type: "TOGGLE_HOLD", index: 0 });
    s = reducer(s, { type: "ROLL_2", dice: [9, 1, 6, 6, 6] as any });
    expect(s.newlyMatched).toEqual([false, true, false, false, false]);
    expect(s.held).toEqual([true, true, false, false, false]);
  });
});

describe("tiebreaker order", () => {
  it("uses turnOrder, not entryIndex, when starting an elim roll-off", () => {
    // 4 players entered A,B,C,D (entryIndex 0..3) but turnOrder is reversed.
    let s = makeInitialState();
    s = reducer(s, {
      type: "START",
      players: [p("a", 0), p("b", 1), p("c", 2), p("d", 3)],
      turnOrder: ["d", "c", "b", "a"],
      mode: "advanced",
    });
    // Force a summary with rollOffNeeded for a tied pair {a, c}.
    s = {
      ...s,
      summary: {
        kind: "rollOffNeeded",
        context: s.context,
        inRollOff: false,
        poolPlayers: s.poolOrder,
        poolResults: s.poolResults,
        tiedIds: ["a", "c"],
      },
    };
    s = reducer(s, { type: "ADVANCE_FROM_SUMMARY" });
    // turnOrder is [d, c, b, a]; filter to {a, c} → [c, a].
    expect(s.poolOrder).toEqual(["c", "a"]);
    expect(s.inRollOff).toBe(true);
  });
});
