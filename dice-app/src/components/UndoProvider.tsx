import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadRoster, saveRoster } from "../game/storage";
import type { Roster } from "../game/types";
import { UndoToast } from "./UndoToast";

interface UndoState {
  snapshot: Roster;
  label: string;
  expiresAt: number;
  /** Token to allow the toast to know which mutation it belongs to. */
  token: number;
  source: "game-result" | "tally-action" | "other";
}

interface UndoContextValue {
  roster: Roster;
  /** Apply a roster mutation, persist immediately, show an undo toast. */
  applyMutation: (next: Roster, label: string, source?: UndoState["source"]) => void;
  /** Dismiss the undo toast only if it belongs to the given source. */
  dismissUndoIfSource: (source: UndoState["source"]) => void;
  /** Clear the roster outright (for tests). Persists. */
  setRoster: (r: Roster) => void;
}

const Ctx = createContext<UndoContextValue | null>(null);

export const UNDO_TIMEOUT_MS = 5000;

export function UndoProvider({ children }: { children: ReactNode }) {
  const [roster, setRosterState] = useState<Roster>(() => loadRoster());
  const [undo, setUndo] = useState<UndoState | null>(null);
  const tokenRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const applyMutation = useCallback(
    (next: Roster, label: string, source: UndoState["source"] = "other") => {
      // Snapshot the *current* roster (pre-mutation) for undo.
      const snapshot = roster;
      // Persist & swap.
      saveRoster(next);
      setRosterState(next);
      // Replace any in-flight toast — the prior mutation finalizes.
      tokenRef.current += 1;
      const token = tokenRef.current;
      clearTimer();
      const expiresAt = Date.now() + UNDO_TIMEOUT_MS;
      setUndo({ snapshot, label, expiresAt, token, source });
      timerRef.current = window.setTimeout(() => {
        setUndo((cur) => (cur && cur.token === token ? null : cur));
        timerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [roster, clearTimer],
  );

  const dismissUndoIfSource = useCallback(
    (source: UndoState["source"]) => {
      setUndo((cur) => {
        if (cur && cur.source === source) {
          clearTimer();
          return null;
        }
        return cur;
      });
    },
    [clearTimer],
  );

  const handleUndo = useCallback(() => {
    if (!undo) return;
    saveRoster(undo.snapshot);
    setRosterState(undo.snapshot);
    clearTimer();
    setUndo(null);
  }, [undo, clearTimer]);

  const handleDismiss = useCallback(() => {
    clearTimer();
    setUndo(null);
  }, [clearTimer]);

  const setRosterImperative = useCallback((r: Roster) => {
    saveRoster(r);
    setRosterState(r);
  }, []);

  const value = useMemo<UndoContextValue>(
    () => ({
      roster,
      applyMutation,
      dismissUndoIfSource,
      setRoster: setRosterImperative,
    }),
    [roster, applyMutation, dismissUndoIfSource, setRosterImperative],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <UndoToast
        visible={undo !== null}
        label={undo?.label ?? ""}
        expiresAt={undo?.expiresAt}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </Ctx.Provider>
  );
}

export function useRoster(): UndoContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useRoster must be used inside <UndoProvider>");
  }
  return ctx;
}
