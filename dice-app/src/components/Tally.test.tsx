import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Tally } from "./Tally";
import { UndoProvider, useRoster } from "./UndoProvider";
import { ROSTER_KEY, applyGameResult } from "../game/storage";

function seedRoster(players: Record<string, { displayName: string; shotsOwed: number; gamesPlayed: number; gamesLost: number; lastLossAt: string | null }>) {
  window.localStorage.setItem(
    ROSTER_KEY,
    JSON.stringify({ version: 1, players }),
  );
}

describe("Tally", () => {
  it("renders Games and Shots columns per player", () => {
    seedRoster({
      bob: {
        displayName: "Bob",
        shotsOwed: 5,
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
    // Two columns, both labelled.
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText("Shots")).toBeInTheDocument();
    // Bob: 2 games lost, 5 shots owed.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not render the old 'N games played' subtitle", () => {
    seedRoster({
      bob: {
        displayName: "Bob",
        shotsOwed: 5,
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
    expect(screen.queryByText(/games played/i)).not.toBeInTheDocument();
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
