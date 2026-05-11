import { useEffect, useRef, useState } from "react";

interface Props {
  visible: boolean;
  label: string;
  expiresAt?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Bottom-of-screen undo toast. Tap-anywhere outside the Undo button dismisses
 * (commits) the action; tapping Undo calls onUndo. Auto-dismiss timing lives in
 * the provider; the toast just displays the live remaining seconds.
 */
export function UndoToast({
  visible,
  label,
  expiresAt,
  onUndo,
  onDismiss,
}: Props) {
  const wasVisible = useRef(visible);

  // Live tick — re-render every 250 ms so the displayed (Ns) keeps up.
  const [, force] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      wasVisible.current = true;
      window.addEventListener("pointerdown", handler, { capture: true });
    }, 0);
    function handler(e: PointerEvent) {
      if (!wasVisible.current) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-undo-button='true']")) return;
      onDismiss();
    }
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", handler, { capture: true });
    };
  }, [visible, onDismiss]);

  const secondsRemaining =
    expiresAt != null
      ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      : null;

  return (
    <div
      aria-live="polite"
      className={[
        "fixed inset-x-0 bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center px-3 pointer-events-none z-40",
        "transition-transform transition-opacity duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
    >
      {visible && (
        <div className="pointer-events-auto bg-bar-panel2 border border-bar-amber/60 rounded-2xl shadow-lg flex items-center justify-between gap-3 px-4 py-3 w-full max-w-md">
          <p className="text-bar-ink text-sm">{label}</p>
          <div className="flex items-center gap-2">
            {secondsRemaining != null && (
              <span
                className="text-bar-mute text-xs font-mono tabular-nums"
                aria-hidden="true"
              >
                ({secondsRemaining}s)
              </span>
            )}
            <button
              type="button"
              data-undo-button="true"
              onClick={onUndo}
              className="tap-target focus-ring rounded-xl bg-bar-amber text-black px-4 font-semibold"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
