import { describe, expect, it } from "vitest";
import { renderFinaleSeries } from "./Scoreboard";

describe("renderFinaleSeries", () => {
  it("renders chronologically — won game 1, lost game 2", () => {
    // player A; log = [A, B] → A won game 1, lost game 2.
    expect(renderFinaleSeries("a", ["a", "b"])).toBe("W L _");
  });

  it("renders chronologically — lost game 1, won game 2", () => {
    expect(renderFinaleSeries("a", ["b", "a"])).toBe("L W _");
  });

  it("pads with underscores when fewer than 3 games played", () => {
    expect(renderFinaleSeries("a", [])).toBe("_ _ _");
    expect(renderFinaleSeries("a", ["a"])).toBe("W _ _");
  });

  it("renders full series", () => {
    expect(renderFinaleSeries("a", ["a", "b", "a"])).toBe("W L W");
  });
});
