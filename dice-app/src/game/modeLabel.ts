import type { GameMode } from "./types";

export function modeLabel(mode: GameMode): "Auto" | "Manual" {
  return mode === "easy" ? "Auto" : "Manual";
}
