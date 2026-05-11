import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyGameResult,
  defaultPrefs,
  emptyRoster,
  ensureRosterPlayer,
  loadPrefs,
  loadRoster,
  nameKey,
  PREFS_KEY,
  ROSTER_KEY,
  saveRoster,
  savePrefs,
} from "./storage";

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe("nameKey", () => {
  it("trims, collapses whitespace, lowercases", () => {
    expect(nameKey("  Bob   the  Builder ")).toBe("bob the builder");
    expect(nameKey("ANA")).toBe("ana");
    expect(nameKey("ana")).toBe("ana");
  });
});

describe("roster round-trip", () => {
  it("returns empty when nothing stored", () => {
    expect(loadRoster()).toEqual(emptyRoster());
  });

  it("persists and reloads", () => {
    const r = ensureRosterPlayer(emptyRoster(), "Steve").roster;
    saveRoster(r);
    expect(loadRoster()).toEqual(r);
  });

  it("falls back to empty on corrupted JSON", () => {
    window.localStorage.setItem(ROSTER_KEY, "{not valid}");
    expect(loadRoster()).toEqual(emptyRoster());
  });

  it("falls back to empty on version mismatch", () => {
    window.localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({ version: 99, players: {} }),
    );
    expect(loadRoster()).toEqual(emptyRoster());
  });
});

describe("ensureRosterPlayer", () => {
  it("creates a new entry with zeros", () => {
    const { roster, key } = ensureRosterPlayer(emptyRoster(), "Steve");
    expect(key).toBe("steve");
    expect(roster.players.steve).toEqual({
      displayName: "Steve",
      shotsOwed: 0,
      gamesPlayed: 0,
      lastLossAt: null,
    });
  });

  it("updates display name casing on re-entry without resetting tally", () => {
    let r = ensureRosterPlayer(emptyRoster(), "Steve").roster;
    r = { ...r, players: { ...r.players, steve: { ...r.players.steve, shotsOwed: 3 } } };
    const next = ensureRosterPlayer(r, "STEVE").roster;
    expect(next.players.steve.displayName).toBe("STEVE");
    expect(next.players.steve.shotsOwed).toBe(3);
  });
});

describe("applyGameResult", () => {
  it("bumps gamesPlayed for everyone and shotsOwed+lastLossAt for the loser", () => {
    const fixed = new Date("2026-05-09T12:00:00Z");
    const r = applyGameResult(emptyRoster(), ["Ana", "Bob", "Steve"], "Bob", fixed);
    expect(r.players.ana.gamesPlayed).toBe(1);
    expect(r.players.ana.shotsOwed).toBe(0);
    expect(r.players.bob.gamesPlayed).toBe(1);
    expect(r.players.bob.shotsOwed).toBe(1);
    expect(r.players.bob.lastLossAt).toBe(fixed.toISOString());
    expect(r.players.steve.shotsOwed).toBe(0);
  });

  it("accumulates over multiple games with overlapping rosters", () => {
    const r1 = applyGameResult(emptyRoster(), ["Ana", "Bob"], "Ana");
    const r2 = applyGameResult(r1, ["Ana", "Bob", "Steve"], "Steve");
    expect(r2.players.ana.gamesPlayed).toBe(2);
    expect(r2.players.ana.shotsOwed).toBe(1);
    expect(r2.players.bob.gamesPlayed).toBe(2);
    expect(r2.players.bob.shotsOwed).toBe(0);
    expect(r2.players.steve.gamesPlayed).toBe(1);
    expect(r2.players.steve.shotsOwed).toBe(1);
  });

  it("treats name-key collisions as the same player", () => {
    const r1 = applyGameResult(emptyRoster(), ["Bob"], "Bob");
    const r2 = applyGameResult(r1, ["bob "], "bob ");
    expect(Object.keys(r2.players)).toEqual(["bob"]);
    expect(r2.players.bob.gamesPlayed).toBe(2);
    expect(r2.players.bob.shotsOwed).toBe(2);
  });
});

describe("prefs round-trip", () => {
  it("returns easy by default", () => {
    expect(loadPrefs()).toEqual(defaultPrefs());
  });

  it("persists and reloads lastMode", () => {
    savePrefs({ version: 1, lastMode: "advanced" });
    expect(loadPrefs().lastMode).toBe("advanced");
  });

  it("falls back to default on corrupted JSON", () => {
    window.localStorage.setItem(PREFS_KEY, "garbage");
    expect(loadPrefs()).toEqual(defaultPrefs());
  });

  it("falls back to default on version mismatch", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ version: 9, lastMode: "advanced" }),
    );
    expect(loadPrefs()).toEqual(defaultPrefs());
  });

  it("falls back to default on invalid mode value", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ version: 1, lastMode: "expert" }),
    );
    expect(loadPrefs()).toEqual(defaultPrefs());
  });
});
