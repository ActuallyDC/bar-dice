export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type ScoreFace = 2 | 3 | 4 | 5 | 6;
export type Hand = readonly [DieValue, DieValue, DieValue, DieValue, DieValue];

export interface Score {
  count: number;
  faceValue: ScoreFace;
}

export type GameMode = "easy" | "advanced";

export type TurnOrderOption =
  | "highestRoll"
  | "entryOrder"
  | "alphabetical"
  | "randomize";

/** A roster player keyed in storage. */
export interface RosterPlayer {
  displayName: string;
  shotsOwed: number;
  gamesPlayed: number;
  lastLossAt: string | null;
}

export interface Roster {
  version: 1;
  players: Record<string, RosterPlayer>;
}

export interface Prefs {
  version: 1;
  lastMode: GameMode;
}

/** Active in-game player (not persisted). */
export interface PlayerSlot {
  /** Stable id used inside the reducer. */
  id: string;
  /** Display name as the user typed it (most recent casing). */
  displayName: string;
  /** Normalized key used to dedupe and to look up roster entries. */
  nameKey: string;
  /** The d6 setup-roll value from the entry screen. */
  setupRoll: DieValue;
  /** Order in which the player was entered (0-indexed). */
  entryIndex: number;
}

export interface PlayerOrderInput {
  id: string;
  displayName: string;
  setupRoll: DieValue;
  entryIndex: number;
}
