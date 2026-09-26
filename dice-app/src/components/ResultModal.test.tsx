import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ResultModal } from "./ResultModal";
import { UndoProvider } from "./UndoProvider";
import type { PlayerSlot } from "../game/types";

const participants: PlayerSlot[] = ["Ana", "Bob", "Cat"].map((name, i) => ({
  id: name.toLowerCase(),
  displayName: name,
  nameKey: name.toLowerCase(),
  setupRoll: 3,
  entryIndex: i,
}));

const noop = () => {};

describe("ResultModal — undo toast", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("says how many shots the loss put on the loser's tab", () => {
    render(
      <UndoProvider>
        <ResultModal
          loserId="bob"
          participants={participants}
          resultApplied={false}
          onResultApplied={noop}
          onViewTally={noop}
          onNewGame={noop}
          onSamePlayersAgain={noop}
        />
      </UndoProvider>,
    );
    expect(screen.getByText("+3 shots on Bob's tab.")).toBeInTheDocument();
  });
});
