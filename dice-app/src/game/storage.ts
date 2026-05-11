import type { GameMode, Prefs, Roster, RosterPlayer } from "./types";

export const ROSTER_KEY = "dice.tally.v1";
export const PREFS_KEY = "dice.prefs.v1";

export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function emptyRoster(): Roster {
  return { version: 1, players: {} };
}

export function defaultPrefs(): Prefs {
  return { version: 1, lastMode: "easy" };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadRoster(): Roster {
  const ls = safeStorage();
  if (!ls) return emptyRoster();
  let raw: string | null;
  try {
    raw = ls.getItem(ROSTER_KEY);
  } catch {
    return emptyRoster();
  }
  if (raw === null) return emptyRoster();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== 1 ||
      typeof (parsed as { players?: unknown }).players !== "object" ||
      (parsed as { players?: unknown }).players === null
    ) {
      return emptyRoster();
    }
    const playersIn = (parsed as { players: Record<string, unknown> }).players;
    const players: Record<string, RosterPlayer> = {};
    for (const [k, v] of Object.entries(playersIn)) {
      if (!v || typeof v !== "object") continue;
      const p = v as Partial<RosterPlayer>;
      if (
        typeof p.displayName !== "string" ||
        typeof p.shotsOwed !== "number" ||
        typeof p.gamesPlayed !== "number" ||
        (p.lastLossAt !== null && typeof p.lastLossAt !== "string")
      ) {
        continue;
      }
      players[k] = {
        displayName: p.displayName,
        shotsOwed: p.shotsOwed,
        gamesPlayed: p.gamesPlayed,
        gamesLost: typeof p.gamesLost === "number" ? p.gamesLost : 0,
        lastLossAt: p.lastLossAt,
      };
    }
    return { version: 1, players };
  } catch {
    return emptyRoster();
  }
}

export function saveRoster(r: Roster): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(ROSTER_KEY, JSON.stringify(r));
  } catch {
    /* quota / private mode — drop silently */
  }
}

export function loadPrefs(): Prefs {
  const ls = safeStorage();
  if (!ls) return defaultPrefs();
  let raw: string | null;
  try {
    raw = ls.getItem(PREFS_KEY);
  } catch {
    return defaultPrefs();
  }
  if (raw === null) return defaultPrefs();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== 1
    ) {
      return defaultPrefs();
    }
    const mode = (parsed as { lastMode?: unknown }).lastMode;
    if (mode !== "easy" && mode !== "advanced") return defaultPrefs();
    return { version: 1, lastMode: mode };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(p: Prefs): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* drop silently */
  }
}

export function setLastMode(mode: GameMode): void {
  savePrefs({ version: 1, lastMode: mode });
}

/**
 * Add a roster entry for `displayName` if one doesn't exist; otherwise update
 * the displayName casing. Returns the canonical roster + the key that was
 * touched.
 */
export function ensureRosterPlayer(
  roster: Roster,
  displayName: string,
): { roster: Roster; key: string } {
  const key = nameKey(displayName);
  const existing = roster.players[key];
  const players = { ...roster.players };
  if (existing) {
    players[key] = { ...existing, displayName };
  } else {
    players[key] = {
      displayName,
      shotsOwed: 0,
      gamesPlayed: 0,
      gamesLost: 0,
      lastLossAt: null,
    };
  }
  return { roster: { ...roster, players }, key };
}

/**
 * Apply a completed game to the roster: bump gamesPlayed for everyone, and
 * bump shotsOwed + lastLossAt for the loser. All inputs are display names.
 */
export function applyGameResult(
  roster: Roster,
  participantsDisplayNames: readonly string[],
  loserDisplayName: string,
  now: Date = new Date(),
): Roster {
  let next = roster;
  for (const name of participantsDisplayNames) {
    const r = ensureRosterPlayer(next, name);
    next = r.roster;
    const k = r.key;
    next = {
      ...next,
      players: {
        ...next.players,
        [k]: { ...next.players[k], gamesPlayed: next.players[k].gamesPlayed + 1 },
      },
    };
  }
  const r = ensureRosterPlayer(next, loserDisplayName);
  next = r.roster;
  const k = r.key;
  next = {
    ...next,
    players: {
      ...next.players,
      [k]: {
        ...next.players[k],
        shotsOwed:
          next.players[k].shotsOwed + (participantsDisplayNames.length - 1),
        gamesLost: next.players[k].gamesLost + 1,
        lastLossAt: now.toISOString(),
      },
    },
  };
  return next;
}
