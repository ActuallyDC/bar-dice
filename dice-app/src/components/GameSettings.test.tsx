import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameSettings } from "./GameSettings";
import { emptyRoster } from "../game/storage";

vi.mock("./SetupDie", () => ({
  SetupDie: ({ onRollSettled }: { onRollSettled?: (v: number) => void; value: number | null; rollKey: number | string }) => {
    setTimeout(() => onRollSettled?.(4), 1300);
    return null;
  },
  DieFace: () => null,
}));

const noop = () => {};

describe("GameSettings — inline roll on Add", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rolls the die when Add is pressed and commits the row when settled", async () => {
    render(
      <GameSettings
        initialRows={[]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={noop}
        onViewTally={noop}
      />,
    );
    const input = screen.getByPlaceholderText("Who's in?");
    fireEvent.change(input, { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Bob")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    await waitFor(() => {
      const rollLabel = screen.getByTestId(`row-roll-Bob`);
      expect(rollLabel.textContent).toMatch(/[1-6]/);
    });
  });

  it("disables Add while a row is rolling", () => {
    render(
      <GameSettings
        initialRows={[]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={noop}
        onViewTally={noop}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Who's in?"), {
      target: { value: "Bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      screen.getByRole("button", { name: /Adding|Add/ }),
    ).toBeDisabled();
  });

  it("disables Start until 2+ rows are committed and none are rolling", async () => {
    render(
      <GameSettings
        initialRows={[]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={noop}
        onViewTally={noop}
      />,
    );
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toBeDisabled();

    function add(name: string) {
      fireEvent.change(screen.getByPlaceholderText("Who's in?"), {
        target: { value: name },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add|Adding/ }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }

    add("Bob");
    expect(start).toBeDisabled();
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByTestId(`row-roll-Bob`)).toBeTruthy());
    vi.useFakeTimers();

    add("Sue");
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByTestId(`row-roll-Sue`)).toBeTruthy());
    expect(start).not.toBeDisabled();
  });

  it("rejects a duplicate name (case-insensitive)", () => {
    render(
      <GameSettings
        initialRows={[
          {
            id: "p0",
            displayName: "Bob",
            nameKey: "bob",
            setupRoll: 4,
            entryIndex: 0,
          },
        ]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={noop}
        onViewTally={noop}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Who's in?"), {
      target: { value: "  bob " },
    });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(screen.getByText("Already on the list.")).toBeTruthy();
  });

  it("removes a mid-roll row without error", () => {
    render(
      <GameSettings
        initialRows={[]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={noop}
        onViewTally={noop}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Who's in?"), {
      target: { value: "Bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByLabelText("Remove Bob"));
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("hydrates rows from initialRows", () => {
    render(
      <GameSettings
        initialRows={[
          {
            id: "p0",
            displayName: "Bob",
            nameKey: "bob",
            setupRoll: 4,
            entryIndex: 0,
          },
          {
            id: "p1",
            displayName: "Sue",
            nameKey: "sue",
            setupRoll: 6,
            entryIndex: 1,
          },
        ]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={noop}
        onViewTally={noop}
      />,
    );
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Sue")).toBeTruthy();
    expect(screen.getByTestId("row-roll-Bob").textContent).toContain("4");
    expect(screen.getByTestId("row-roll-Sue").textContent).toContain("6");
    expect(screen.getByRole("button", { name: "Start" })).not.toBeDisabled();
  });

  it("onStart receives PlayerSlot[] with the committed rows", () => {
    const onStart = vi.fn();
    render(
      <GameSettings
        initialRows={[
          {
            id: "p0",
            displayName: "Bob",
            nameKey: "bob",
            setupRoll: 4,
            entryIndex: 0,
          },
          {
            id: "p1",
            displayName: "Sue",
            nameKey: "sue",
            setupRoll: 6,
            entryIndex: 1,
          },
        ]}
        mode="easy"
        roster={emptyRoster()}
        onModeChange={noop}
        onStart={onStart}
        onViewTally={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const arg = onStart.mock.calls[0][0];
    expect(arg).toHaveLength(2);
    expect(arg[0].displayName).toBe("Bob");
    expect(arg[0].setupRoll).toBe(4);
    expect(arg[1].displayName).toBe("Sue");
    expect(arg[1].setupRoll).toBe(6);
  });
});
