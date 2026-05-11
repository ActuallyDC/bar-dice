import { easyHold } from "./easyHold";
import { compareScores, scoreHand } from "./score";
import type {
  DieValue,
  GameMode,
  Hand,
  PlayerSlot,
  Score,
} from "./types";

export type ContextKind = "elim" | "finale";

export interface Context {
  kind: ContextKind;
  round?: number;
  gameNumber?: number;
}

export type TurnPhase = "idle" | "rolled1" | "rolled2";

export interface PoolResult {
  score: Score;
  dice: Hand;
}

export type SummaryKind = "elimResolved" | "rollOffNeeded" | "finaleResolved";

export interface Summary {
  kind: SummaryKind;
  context: Context;
  inRollOff: boolean;
  /** Players who rolled in the just-finished pool, in pool order. */
  poolPlayers: string[];
  poolResults: Record<string, PoolResult>;
  winnerId?: string;
  /** Set when ties need a roll-off. */
  tiedIds?: string[];
  /** For finale: the player who lost this finale game. */
  finaleLoserId?: string;
}

export interface GameState {
  mode: GameMode;
  players: PlayerSlot[];
  /** Round-1 ordering of player ids (set at game start). */
  turnOrder: string[];

  context: Context;
  inRollOff: boolean;

  safeIds: string[];
  finalists: string[];
  finaleLosses: Record<string, number>;
  finaleGameLog: string[];

  poolOrder: string[];
  poolIndex: number;
  poolResults: Record<string, PoolResult>;

  dice: Hand;
  held: [boolean, boolean, boolean, boolean, boolean];
  turnPhase: TurnPhase;
  /** When true the dice belong to the active player but no roll has happened yet. */
  awaitingFirstRoll: boolean;

  summary: Summary | null;

  loserId: string | null;
  finished: boolean;
}

export type GameAction =
  | {
      type: "START";
      players: PlayerSlot[];
      turnOrder: string[];
      mode: GameMode;
    }
  | { type: "ROLL_1"; dice: Hand }
  | { type: "TOGGLE_HOLD"; index: number }
  | { type: "ROLL_2"; dice: Hand }
  | { type: "STAY" }
  | { type: "COMMIT_TURN" }
  | { type: "ADVANCE_FROM_SUMMARY" }
  | { type: "RESET" };

const PLACEHOLDER_HAND: Hand = [1, 1, 1, 1, 1];
const ALL_FALSE: [boolean, boolean, boolean, boolean, boolean] = [
  false,
  false,
  false,
  false,
  false,
];

export function makeInitialState(): GameState {
  return {
    mode: "easy",
    players: [],
    turnOrder: [],
    context: { kind: "elim", round: 1 },
    inRollOff: false,
    safeIds: [],
    finalists: [],
    finaleLosses: {},
    finaleGameLog: [],
    poolOrder: [],
    poolIndex: 0,
    poolResults: {},
    dice: PLACEHOLDER_HAND,
    held: ALL_FALSE,
    turnPhase: "idle",
    awaitingFirstRoll: true,
    summary: null,
    loserId: null,
    finished: false,
  };
}

export function activePlayerId(state: GameState): string | null {
  if (state.summary || state.finished) return null;
  return state.poolOrder[state.poolIndex] ?? null;
}

export function inGamePlayerCount(state: GameState): number {
  return state.players.length - state.safeIds.length;
}

/** Players still in the elimination phase (not yet safe). */
export function eliminationPoolFromTurnOrder(state: GameState): string[] {
  const safeSet = new Set(state.safeIds);
  return state.turnOrder.filter((id) => !safeSet.has(id));
}

export function entryOrderIds(state: GameState, ids: readonly string[]): string[] {
  const set = new Set(ids);
  return state.players
    .filter((p) => set.has(p.id))
    .sort((a, b) => a.entryIndex - b.entryIndex)
    .map((p) => p.id);
}

function startContextPool(
  state: GameState,
  context: Context,
): GameState {
  let poolOrder: string[];
  if (context.kind === "elim") {
    poolOrder = state.turnOrder.filter(
      (id) => !state.safeIds.includes(id),
    );
  } else {
    // finale: both finalists in their canonical turn order
    poolOrder = state.turnOrder.filter((id) =>
      state.finalists.includes(id),
    );
  }
  return {
    ...state,
    context,
    inRollOff: false,
    poolOrder,
    poolIndex: 0,
    poolResults: {},
    dice: PLACEHOLDER_HAND,
    held: ALL_FALSE,
    turnPhase: "idle",
    awaitingFirstRoll: true,
    summary: null,
  };
}

function startRollOffPool(state: GameState, tiedIds: string[]): GameState {
  return {
    ...state,
    inRollOff: true,
    poolOrder: entryOrderIds(state, tiedIds),
    poolIndex: 0,
    poolResults: {},
    dice: PLACEHOLDER_HAND,
    held: ALL_FALSE,
    turnPhase: "idle",
    awaitingFirstRoll: true,
    summary: null,
  };
}

function evaluatePool(state: GameState): GameState {
  const order = state.poolOrder;
  const results = state.poolResults;
  let bestScore: Score | null = null;
  for (const id of order) {
    const r = results[id];
    if (!r) continue;
    if (!bestScore || compareScores(r.score, bestScore) === 1) {
      bestScore = r.score;
    }
  }
  if (!bestScore) {
    // shouldn't happen — guard anyway
    return state;
  }
  const tied = order.filter(
    (id) => compareScores(results[id].score, bestScore!) === 0,
  );
  if (tied.length === 1) {
    const winnerId = tied[0];
    const summary: Summary = state.context.kind === "elim"
      ? {
          kind: "elimResolved",
          context: state.context,
          inRollOff: state.inRollOff,
          poolPlayers: order,
          poolResults: results,
          winnerId,
        }
      : {
          kind: "finaleResolved",
          context: state.context,
          inRollOff: state.inRollOff,
          poolPlayers: order,
          poolResults: results,
          winnerId,
          finaleLoserId: order.find((id) => id !== winnerId),
        };
    return { ...state, summary };
  }
  // tie → roll-off
  const summary: Summary = {
    kind: "rollOffNeeded",
    context: state.context,
    inRollOff: state.inRollOff,
    poolPlayers: order,
    poolResults: results,
    tiedIds: tied,
  };
  return { ...state, summary };
}

function handleAdvanceFromSummary(state: GameState): GameState {
  const summary = state.summary;
  if (!summary) return state;
  if (summary.kind === "rollOffNeeded") {
    return startRollOffPool(state, summary.tiedIds!);
  }
  if (summary.kind === "elimResolved") {
    const safeIds = [...state.safeIds, summary.winnerId!];
    const remaining = state.players
      .filter((p) => !safeIds.includes(p.id))
      .map((p) => p.id);
    if (remaining.length === 2) {
      // Move into finale
      const finalists = remaining;
      const next: GameState = {
        ...state,
        safeIds,
        finalists,
        finaleLosses: Object.fromEntries(finalists.map((id) => [id, 0])),
      };
      return startContextPool(next, { kind: "finale", gameNumber: 1 });
    }
    // Advance to next elim round
    const nextRound = (state.context.round ?? 1) + 1;
    return startContextPool(
      { ...state, safeIds },
      { kind: "elim", round: nextRound },
    );
  }
  // finaleResolved
  const winnerId = summary.winnerId!;
  const loserId = summary.finaleLoserId!;
  const finaleLosses = {
    ...state.finaleLosses,
    [loserId]: (state.finaleLosses[loserId] ?? 0) + 1,
  };
  const finaleGameLog = [...state.finaleGameLog, winnerId];
  if (finaleLosses[loserId] >= 2) {
    return {
      ...state,
      finaleLosses,
      finaleGameLog,
      summary: null,
      loserId,
      finished: true,
      poolOrder: [],
      poolIndex: 0,
      poolResults: {},
      turnPhase: "idle",
      awaitingFirstRoll: false,
    };
  }
  const nextGame = (state.context.gameNumber ?? 1) + 1;
  return startContextPool(
    { ...state, finaleLosses, finaleGameLog },
    { kind: "finale", gameNumber: nextGame },
  );
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RESET":
      return makeInitialState();

    case "START": {
      const fresh = makeInitialState();
      const seeded: GameState = {
        ...fresh,
        mode: action.mode,
        players: action.players,
        turnOrder: action.turnOrder,
      };
      // 2-player games skip the elimination phase entirely — Best of 3 directly.
      if (action.players.length === 2) {
        const finalists = action.turnOrder.slice();
        const seededWithFinale: GameState = {
          ...seeded,
          finalists,
          finaleLosses: Object.fromEntries(finalists.map((id) => [id, 0])),
        };
        return startContextPool(seededWithFinale, { kind: "finale", gameNumber: 1 });
      }
      return startContextPool(seeded, { kind: "elim", round: 1 });
    }

    case "ROLL_1": {
      if (state.summary || state.finished) return state;
      if (state.turnPhase !== "idle") return state;
      const dice = action.dice;
      // Roll-off / tiebreaker: single roll, no holds, no Stay, no Roll 2.
      if (state.inRollOff) {
        return {
          ...state,
          dice,
          held: ALL_FALSE,
          turnPhase: "rolled2",
          awaitingFirstRoll: false,
        };
      }
      // Easy mode: precompute hold flags via easyHold.
      if (state.mode === "easy") {
        const decision = easyHold(dice);
        return {
          ...state,
          dice,
          held: decision.held as [boolean, boolean, boolean, boolean, boolean],
          turnPhase: decision.stay ? "rolled2" : "rolled1",
          awaitingFirstRoll: false,
        };
      }
      // Advanced mode: nothing held by default.
      return {
        ...state,
        dice,
        held: ALL_FALSE,
        turnPhase: "rolled1",
        awaitingFirstRoll: false,
      };
    }

    case "TOGGLE_HOLD": {
      if (state.mode !== "advanced") return state;
      if (state.turnPhase !== "rolled1") return state;
      const i = action.index;
      if (i < 0 || i >= 5) return state;
      const held = state.held.slice() as [
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
      ];
      held[i] = !held[i];
      return { ...state, held };
    }

    case "STAY": {
      if (state.turnPhase !== "rolled1") return state;
      return { ...state, turnPhase: "rolled2" };
    }

    case "ROLL_2": {
      if (state.turnPhase !== "rolled1") return state;
      const dice = state.dice.slice() as DieValue[];
      for (let i = 0; i < 5; i++) {
        if (!state.held[i]) dice[i] = action.dice[i];
      }
      return {
        ...state,
        dice: dice as unknown as Hand,
        turnPhase: "rolled2",
      };
    }

    case "COMMIT_TURN": {
      if (state.turnPhase !== "rolled2") return state;
      const id = activePlayerId(state);
      if (!id) return state;
      const score = scoreHand(state.dice);
      const poolResults = {
        ...state.poolResults,
        [id]: { score, dice: state.dice },
      };
      const nextIndex = state.poolIndex + 1;
      if (nextIndex >= state.poolOrder.length) {
        // Pool exhausted; evaluate.
        return evaluatePool({
          ...state,
          poolResults,
          poolIndex: nextIndex,
          turnPhase: "idle",
          dice: PLACEHOLDER_HAND,
          held: ALL_FALSE,
          awaitingFirstRoll: false,
        });
      }
      return {
        ...state,
        poolResults,
        poolIndex: nextIndex,
        turnPhase: "idle",
        dice: PLACEHOLDER_HAND,
        held: ALL_FALSE,
        awaitingFirstRoll: true,
      };
    }

    case "ADVANCE_FROM_SUMMARY":
      return handleAdvanceFromSummary(state);

    default:
      return state;
  }
}

/** Helper: produce a Hand of 5 random dice using a custom rng. */
export function roll5(rng: () => number = Math.random): Hand {
  const out: number[] = [];
  for (let i = 0; i < 5; i++) {
    out.push(1 + Math.floor(rng() * 6));
  }
  return out as unknown as Hand;
}
