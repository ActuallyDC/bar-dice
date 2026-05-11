import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TurnOrder } from "./TurnOrder";
import type { PlayerSlot } from "../game/types";

const slots: PlayerSlot[] = [
  { id: "a", displayName: "Ana", nameKey: "ana", setupRoll: 6, entryIndex: 0 },
  { id: "b", displayName: "Bob", nameKey: "bob", setupRoll: 5, entryIndex: 1 },
];

describe("TurnOrder labels", () => {
  it("uses the new Order of Entry / Whoever typed first label", () => {
    render(
      <TurnOrder
        slots={slots}
        onBack={() => {}}
        onStart={() => {}}
        onRestart={() => {}}
      />,
    );
    expect(
      screen.getByText("Order of Entry / Whoever typed first"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Order Of Entry (Whoever typed first)"),
    ).not.toBeInTheDocument();
  });
});

describe("TurnOrder — custom option", () => {
  function slots(): PlayerSlot[] {
    return [
      { id: "a", displayName: "Ana", nameKey: "ana", setupRoll: 6, entryIndex: 0 },
      { id: "b", displayName: "Bob", nameKey: "bob", setupRoll: 5, entryIndex: 1 },
      { id: "c", displayName: "Cleo", nameKey: "cleo", setupRoll: 4, entryIndex: 2 },
    ];
  }

  it("renders ▲/▼ buttons when Custom is selected", () => {
    render(
      <TurnOrder
        slots={slots()}
        initialOption="highestRoll"
        onBack={() => {}}
        onStart={() => {}}
        onRestart={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Custom"));
    const ups = screen.getAllByLabelText(/Move .* up/);
    const downs = screen.getAllByLabelText(/Move .* down/);
    expect(ups).toHaveLength(3);
    expect(downs).toHaveLength(3);
    expect(ups[0]).toBeDisabled();
    expect(downs[downs.length - 1]).toBeDisabled();
  });

  it("seeds custom order from the currently displayed order", () => {
    const onStart = vi.fn();
    render(
      <TurnOrder
        slots={slots()}
        initialOption="highestRoll"
        onBack={() => {}}
        onStart={onStart}
        onRestart={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Custom"));
    fireEvent.click(screen.getByText("Start Game"));
    expect(onStart).toHaveBeenCalledWith(["a", "b", "c"], "custom");
  });

  it("Move-down swaps a row with the one below it", () => {
    const onStart = vi.fn();
    render(
      <TurnOrder
        slots={slots()}
        initialOption="highestRoll"
        onBack={() => {}}
        onStart={onStart}
        onRestart={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Custom"));
    fireEvent.click(screen.getByLabelText("Move Ana down"));
    fireEvent.click(screen.getByText("Start Game"));
    expect(onStart).toHaveBeenCalledWith(["b", "a", "c"], "custom");
  });

  it("preserves tweaks when toggling away and back", () => {
    const onStart = vi.fn();
    render(
      <TurnOrder
        slots={slots()}
        initialOption="highestRoll"
        onBack={() => {}}
        onStart={onStart}
        onRestart={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Custom"));
    fireEvent.click(screen.getByLabelText("Move Ana down"));
    fireEvent.click(screen.getByText("Alphabetical"));
    fireEvent.click(screen.getByText("Custom"));
    fireEvent.click(screen.getByText("Start Game"));
    expect(onStart).toHaveBeenCalledWith(["b", "a", "c"], "custom");
  });
});
