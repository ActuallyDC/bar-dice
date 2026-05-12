import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Tally } from "./Tally";
import { UndoProvider, useRoster } from "./UndoProvider";
import { ROSTER_KEY, applyGameResult } from "../game/storage";

function seedRoster(players: Record<string, { displayName: string; shotsOwed: number; shotsBought: number; gamesPlayed: number; gamesLost: number; lastLossAt: string | null }>) {
  window.localStorage.setItem(
    ROSTER_KEY,
    JSON.stringify({ version: 1, players }),
  );
}

describe("Tally", () => {
  it("renders four stat columns per player", () => {
    seedRoster({
      bob: {
        displayName: "Bob",
        shotsOwed: 5,
        shotsBought: 7,
        gamesPlayed: 3,
        gamesLost: 2,
        lastLossAt: null,
      },
    });
    render(
      <UndoProvider>
        <Tally onBack={() => {}} />
      </UndoProvider>,
    );
    expect(screen.getByText("Games Played")).toBeInTheDocument();
    expect(screen.getByText("Games Lost")).toBeInTheDocument();
    expect(screen.getByText("Shots Owed")).toBeInTheDocument();
    expect(screen.getByText("Shots Bought")).toBeInTheDocument();
    // Bob: 3 played, 2 lost, 5 owed, 7 bought.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("does not render the old 'N games played' subtitle", () => {
    seedRoster({
      bob: {
        displayName: "Bob",
        shotsOwed: 5,
        shotsBought: 0,
        gamesPlayed: 3,
        gamesLost: 2,
        lastLossAt: null,
      },
    });
    render(
      <UndoProvider>
        <Tally onBack={() => {}} />
      </UndoProvider>,
    );
    expect(screen.queryByText(/\d+ games played/i)).not.toBeInTheDocument();
  });
});

function TestHarness({ onCtx }: { onCtx: (ctx: ReturnType<typeof useRoster>) => void }) {
  const ctx = useRoster();
  onCtx(ctx);
  return null;
}

describe("Tally — undo dismissal on mount", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("dismisses an active game-result undo when Tally mounts", async () => {
    let ctxRef: ReturnType<typeof useRoster> | null = null;
    const { rerender } = render(
      <UndoProvider>
        <TestHarness onCtx={(c) => { ctxRef = c; }} />
      </UndoProvider>,
    );
    act(() => {
      const next = applyGameResult(ctxRef!.roster, ["Ana", "Bob"], "Bob");
      ctxRef!.applyMutation(next, "Bob now owes a shot.", "game-result");
    });
    expect(screen.queryByText(/Undo/)).not.toBeNull();
    rerender(
      <UndoProvider>
        <TestHarness onCtx={(c) => { ctxRef = c; }} />
        <Tally onBack={() => {}} />
      </UndoProvider>,
    );
    await act(async () => {});
    expect(screen.queryByText(/Undo/)).toBeNull();
  });

  it("does NOT dismiss a tally-action undo when Tally mounts", async () => {
    let ctxRef: ReturnType<typeof useRoster> | null = null;
    const { rerender } = render(
      <UndoProvider>
        <TestHarness onCtx={(c) => { ctxRef = c; }} />
      </UndoProvider>,
    );
    act(() => {
      const next = applyGameResult(ctxRef!.roster, ["Ana"], "Ana");
      ctxRef!.applyMutation(next, "Settled Ana's tab.", "tally-action");
    });
    expect(screen.queryByText(/Undo/)).not.toBeNull();
    rerender(
      <UndoProvider>
        <TestHarness onCtx={(c) => { ctxRef = c; }} />
        <Tally onBack={() => {}} />
      </UndoProvider>,
    );
    await act(async () => {});
    expect(screen.queryByText(/Undo/)).not.toBeNull();
  });
});
