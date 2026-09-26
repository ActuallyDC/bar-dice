import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Game } from "./Game";
import { makeInitialState, reducer, type GameAction, type GameState } from "../game/reducer";
import { asHand } from "../game/score";
import { restingOrientation } from "./dieTumble";
import type { GameMode, PlayerSlot } from "../game/types";

// jsdom has no Web Animations API. Stub it with animations that only
// finish when the test says the dice have landed.
let pending: Array<() => void> = [];

function stubAnimations() {
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: () => {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      pending.push(finish);
      return { finished, cancel: () => {} };
    },
  });
}

async function landDice() {
  await act(async () => {
    pending.splice(0).forEach((finish) => finish());
  });
}

afterEach(() => {
  delete (Element.prototype as { animate?: unknown }).animate;
  pending = [];
});

function started(mode: GameMode): GameState {
  const players: PlayerSlot[] = ["Ana", "Bob", "Cat"].map((name, i) => ({
    id: name.toLowerCase(),
    displayName: name,
    nameKey: name.toLowerCase(),
    setupRoll: 3,
    entryIndex: i,
  }));
  return reducer(makeInitialState(), {
    type: "START",
    players,
    turnOrder: players.map((p) => p.id),
    mode,
  });
}

const apply = (s: GameState, ...actions: GameAction[]) => actions.reduce(reducer, s);
const noop = () => {};
const holdAll: GameAction[] = [0, 1, 2, 3, 4].map((index) => ({ type: "TOGGLE_HOLD", index }));

describe("Game — hints", () => {
  const roll1 = { type: "ROLL_1", dice: asHand([5, 5, 5, 2, 3]) } as const;

  it("Auto names the 2nd Roll button", () => {
    render(<Game state={apply(started("easy"), roll1)} dispatch={noop} />);
    expect(screen.getByText("Optimal hold applied. 2nd Roll or Stay.")).toBeInTheDocument();
  });

  it("Manual names the 2nd Roll button", () => {
    render(<Game state={apply(started("advanced"), roll1)} dispatch={noop} />);
    expect(screen.getByText("Tap dice to hold them. Then 2nd Roll or Stay.")).toBeInTheDocument();
  });
});

describe("Game — no spoilers while the dice tumble", () => {
  it("hides the score and locks the buttons until every die lands", async () => {
    stubAnimations();
    const before = started("easy");
    const rolled = apply(before, { type: "ROLL_1", dice: asHand([5, 5, 5, 2, 3]) });
    const { rerender } = render(<Game state={before} dispatch={noop} />);
    rerender(<Game state={rolled} dispatch={noop} />);

    expect(screen.queryByText("Three Fives (35)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Optimal hold applied/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stay" })).toBeDisabled();

    await landDice();

    expect(screen.getByText("Three Fives (35)")).toBeInTheDocument();
    expect(screen.getByText(/Optimal hold applied/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stay" })).toBeEnabled();
  });

  it("Manual: dice can't be held until they land", async () => {
    stubAnimations();
    const before = started("advanced");
    const rolled = apply(before, { type: "ROLL_1", dice: asHand([5, 5, 5, 2, 3]) });
    const { rerender } = render(<Game state={before} dispatch={noop} />);
    rerender(<Game state={rolled} dispatch={noop} />);

    expect(screen.queryAllByRole("button", { name: /^Die showing/ })).toHaveLength(0);

    await landDice();

    expect(screen.getAllByRole("button", { name: /^Die showing/ })).toHaveLength(5);
  });

  it("held dice keep their highlight until the 2nd Roll lands, even if the score face changes", async () => {
    stubAnimations();
    const rolled = apply(started("advanced"), { type: "ROLL_1", dice: asHand([2, 2, 1, 4, 5]) });
    const held = apply(
      rolled,
      { type: "TOGGLE_HOLD", index: 0 },
      { type: "TOGGLE_HOLD", index: 1 },
      { type: "TOGGLE_HOLD", index: 2 },
    );
    const { container, rerender } = render(<Game state={held} dispatch={noop} />);
    const highlighted = () =>
      [...container.querySelectorAll("[data-held]")].map((d) => d.getAttribute("data-held"));

    // 2,2 + wild re-rolls into 3,3 → Three Threes; the 2s drop out of the score.
    rerender(
      <Game state={apply(held, { type: "ROLL_2", dice: asHand([6, 6, 6, 3, 3]) })} dispatch={noop} />,
    );
    expect(highlighted()).toEqual(["true", "true", "true", "false", "false"]);

    await landDice();

    expect(highlighted()).toEqual(["false", "false", "true", "true", "true"]);
    expect(screen.getByText("Three Threes (33)")).toBeInTheDocument();
  });

  it("Manual: each die still shows its rolled face once it becomes tappable", async () => {
    stubAnimations();
    const dice = asHand([6, 2, 3, 4, 5]);
    const before = started("advanced");
    const { container, rerender } = render(<Game state={before} dispatch={noop} />);
    rerender(<Game state={apply(before, { type: "ROLL_1", dice })} dispatch={noop} />);
    await landDice();

    expect(screen.getAllByRole("button", { name: /^Die showing/ })).toHaveLength(5);
    const cubes = [...container.querySelectorAll("[data-held]")].map(
      (die) => die.querySelector<HTMLElement>("[data-cube]")!,
    );
    cubes.forEach((cube, i) => {
      const [z, x, y] = (cube.style.transform.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      const rest = restingOrientation(dice[i]);
      const turns = (a: number, b: number) => ((a - b) % 360 + 360) % 360;
      expect(turns(x, rest.x)).toBe(0);
      expect(turns(y, rest.y)).toBe(0);
      expect(turns(z, 0) % 90).toBe(0);
    });
  });

  it("shows the result straight away when the browser can't animate", () => {
    const before = started("easy");
    const rolled = apply(before, { type: "ROLL_1", dice: asHand([5, 5, 5, 2, 3]) });
    const { rerender } = render(<Game state={before} dispatch={noop} />);
    rerender(<Game state={rolled} dispatch={noop} />);

    expect(screen.getByText("Three Fives (35)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stay" })).toBeEnabled();
  });

  it("a 2nd Roll with every die held settles at once", async () => {
    stubAnimations();
    const before = started("advanced");
    const rolled = apply(before, { type: "ROLL_1", dice: asHand([5, 5, 5, 2, 3]) });
    const { rerender } = render(<Game state={before} dispatch={noop} />);
    rerender(<Game state={rolled} dispatch={noop} />);
    await landDice();

    const held = apply(rolled, ...holdAll);
    rerender(<Game state={held} dispatch={noop} />);
    rerender(
      <Game state={apply(held, { type: "ROLL_2", dice: asHand([6, 6, 6, 6, 6]) })} dispatch={noop} />,
    );

    expect(screen.getByText("Three Fives (35)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End Turn" })).toBeEnabled();
  });

  it("Same Players Again starts roll tracking over", async () => {
    stubAnimations();
    // Three rolls into a game: Ana's 1st + 2nd Roll, then Bob's 1st Roll.
    const midGame = apply(
      started("easy"),
      { type: "ROLL_1", dice: asHand([2, 3, 4, 5, 6]) },
      { type: "ROLL_2", dice: asHand([6, 6, 6, 6, 6]) },
      { type: "COMMIT_TURN" },
      { type: "ROLL_1", dice: asHand([2, 3, 4, 5, 6]) },
    );
    const { rerender } = render(<Game state={midGame} dispatch={noop} />);

    const rematch = started("easy");
    rerender(<Game state={rematch} dispatch={noop} />);
    expect(screen.getByRole("button", { name: "1st Roll" })).toBeEnabled();

    rerender(
      <Game state={apply(rematch, { type: "ROLL_1", dice: asHand([5, 5, 5, 2, 3]) })} dispatch={noop} />,
    );
    expect(screen.queryByText("Three Fives (35)")).not.toBeInTheDocument();

    await landDice();

    expect(screen.getByText("Three Fives (35)")).toBeInTheDocument();
  });
});
