import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
