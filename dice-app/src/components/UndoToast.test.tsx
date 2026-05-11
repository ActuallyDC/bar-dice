import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { UndoToast } from "./UndoToast";

describe("UndoToast countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("ticks the visible seconds remaining", () => {
    const now = 1_000_000;
    vi.setSystemTime(now);
    const expiresAt = now + 5000;
    render(
      <UndoToast
        visible={true}
        label="Settled tab."
        expiresAt={expiresAt}
        onUndo={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("(5s)")).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(now + 1000);
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText("(4s)")).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(now + 4000);
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText("(1s)")).toBeInTheDocument();
  });
});
