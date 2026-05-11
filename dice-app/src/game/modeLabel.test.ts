import { describe, expect, it } from "vitest";
import { modeLabel } from "./modeLabel";

describe("modeLabel", () => {
  it("maps easy to Auto", () => {
    expect(modeLabel("easy")).toBe("Auto");
  });
  it("maps advanced to Manual", () => {
    expect(modeLabel("advanced")).toBe("Manual");
  });
});
