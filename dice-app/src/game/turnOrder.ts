import type { PlayerOrderInput, TurnOrderOption } from "./types";

export type RandomFn = () => number;

export interface TurnOrderInput {
  players: readonly PlayerOrderInput[];
  option: TurnOrderOption;
  /** Optional rng for deterministic tests of `randomize`. Defaults to Math.random. */
  rng?: RandomFn;
}

/**
 * Returns the round-1 ordering of player ids based on the chosen option.
 * The function is pure given the rng.
 */
export function computeTurnOrder(input: TurnOrderInput): string[] {
  const { players, option, rng = Math.random } = input;
  const arr = players.slice();
  switch (option) {
    case "highestRoll":
      // Higher roll first; tie → later entryIndex first.
      return arr
        .slice()
        .sort((a, b) => {
          if (a.setupRoll !== b.setupRoll) return b.setupRoll - a.setupRoll;
          return b.entryIndex - a.entryIndex;
        })
        .map((p) => p.id);
    case "entryOrder":
      return arr
        .slice()
        .sort((a, b) => a.entryIndex - b.entryIndex)
        .map((p) => p.id);
    case "alphabetical":
      return arr
        .slice()
        .sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, {
            sensitivity: "base",
          }),
        )
        .map((p) => p.id);
    case "randomize": {
      // Fisher–Yates.
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out.map((p) => p.id);
    }
    case "custom":
      return arr.map((p) => p.id);
  }
}
