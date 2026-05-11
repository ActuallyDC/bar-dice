import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameSettings } from "./GameSettings";

function setup(initialNames: string[] = []) {
  const onNamesChange = vi.fn();
  const onStart = vi.fn();
  const onModeChange = vi.fn();
  const onViewTally = vi.fn();
  const utils = render(
    <GameSettings
      names={initialNames}
      onNamesChange={onNamesChange}
      mode="easy"
      onModeChange={onModeChange}
      onStart={onStart}
      onViewTally={onViewTally}
    />,
  );
  return { ...utils, onNamesChange, onStart };
}

describe("GameSettings name list", () => {
  it("Start button is disabled until 2 names are added", () => {
    const { rerender, onStart } = setup([]);
    const start = screen.getByRole("button", { name: /^start$/i });
    expect(start).toBeDisabled();

    rerender(
      <GameSettings
        names={["Ana"]}
        onNamesChange={() => {}}
        mode="easy"
        onModeChange={() => {}}
        onStart={onStart}
        onViewTally={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /^start$/i })).toBeDisabled();

    rerender(
      <GameSettings
        names={["Ana", "Bob"]}
        onNamesChange={() => {}}
        mode="easy"
        onModeChange={() => {}}
        onStart={onStart}
        onViewTally={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /^start$/i })).toBeEnabled();
  });

  it("appends a new name when Add is pressed", () => {
    const { onNamesChange } = setup(["Ana"]);
    const input = screen.getByPlaceholderText("Who's in?");
    fireEvent.change(input, { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onNamesChange).toHaveBeenCalledWith(["Ana", "Bob"]);
  });

  it("rejects duplicate names case-insensitively", () => {
    const { onNamesChange } = setup(["Ana"]);
    const input = screen.getByPlaceholderText("Who's in?");
    fireEvent.change(input, { target: { value: "ana" } });
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
    expect(onNamesChange).not.toHaveBeenCalled();
  });

  it("removes a name when its ✕ is tapped", () => {
    const { onNamesChange } = setup(["Ana", "Bob"]);
    fireEvent.click(screen.getByRole("button", { name: /remove ana/i }));
    expect(onNamesChange).toHaveBeenCalledWith(["Bob"]);
  });

  it("calls onStart with the entered names when Start is pressed", () => {
    const { onStart } = setup(["Ana", "Bob"]);
    fireEvent.click(screen.getByRole("button", { name: /^start$/i }));
    expect(onStart).toHaveBeenCalledWith(["Ana", "Bob"]);
  });
});
