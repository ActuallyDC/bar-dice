import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tally } from "./Tally";
import { UndoProvider } from "./UndoProvider";
import { ROSTER_KEY } from "../game/storage";

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
