import { useMemo, useState } from "react";
import type { Roster } from "../game/types";
import { useRoster } from "./UndoProvider";
import { Button, Heading, ScreenShell, Subtle } from "./ui";
import { ConfirmModal } from "./ConfirmModal";

interface Props {
  onBack: () => void;
}

export function Tally({ onBack }: Props) {
  const { roster, applyMutation } = useRoster();
  const [confirmSettleKey, setConfirmSettleKey] = useState<string | null>(null);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const rows = useMemo(() => {
    return Object.entries(roster.players)
      .map(([key, p]) => ({ key, ...p }))
      .sort((a, b) => {
        if (b.shotsOwed !== a.shotsOwed) return b.shotsOwed - a.shotsOwed;
        return a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        });
      });
  }, [roster]);

  function settleUp(key: string) {
    const p = roster.players[key];
    if (!p) return;
    const next: Roster = {
      ...roster,
      players: { ...roster.players, [key]: { ...p, shotsOwed: 0 } },
    };
    applyMutation(next, `Settled ${p.displayName}'s tab. Undo (5s)`);
    setConfirmSettleKey(null);
  }

  function removePlayer(key: string) {
    const p = roster.players[key];
    if (!p) return;
    const players = { ...roster.players };
    delete players[key];
    const next: Roster = { ...roster, players };
    applyMutation(next, `Removed ${p.displayName}. Undo (5s)`);
    setConfirmRemoveKey(null);
  }

  function clearAll() {
    const players: Roster["players"] = {};
    for (const [k, p] of Object.entries(roster.players)) {
      players[k] = { ...p, shotsOwed: 0 };
    }
    const next: Roster = { ...roster, players };
    applyMutation(next, `Cleared all tabs. Undo (5s)`);
    setConfirmClearAll(false);
  }

  return (
    <>
      <ScreenShell
        footer={
          <Button variant="secondary" fullWidth onClick={onBack}>
            Back
          </Button>
        }
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="tap-target focus-ring text-bar-ink/80 hover:text-bar-ink rounded-xl px-3 py-2 -ml-3"
            aria-label="Back"
          >
            ← Back
          </button>
          <Subtle>The bar tab</Subtle>
        </div>
        <Heading level={1}>Shots owed</Heading>

        {rows.length === 0 ? (
          <p className="text-bar-mute mt-4">
            No players yet. Play a game to start the tab.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.key}
                className="rounded-2xl bg-bar-panel border border-bar-line p-3 flex flex-col gap-3"
              >
                <span className="font-semibold text-bar-ink">{r.displayName}</span>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Games" value={r.gamesLost} tone={r.gamesLost > 0 ? "amber" : "mute"} />
                  <Stat
                    label="Shots"
                    value={r.shotsOwed}
                    tone={r.shotsOwed > 0 ? "ember" : "good"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmSettleKey(r.key)}
                    disabled={r.shotsOwed === 0}
                  >
                    Settle Up
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmRemoveKey(r.key)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="text-bar-ember underline text-sm tap-target focus-ring px-3"
            >
              Clear All Tallies
            </button>
          </div>
        )}
      </ScreenShell>

      <ConfirmModal
        open={confirmSettleKey !== null}
        title="Settle the tab?"
        message={
          confirmSettleKey
            ? `Zero out ${roster.players[confirmSettleKey]?.displayName ?? "this player"}'s shots owed.`
            : ""
        }
        confirmLabel="Settle Up"
        cancelLabel="Cancel"
        onConfirm={() => confirmSettleKey && settleUp(confirmSettleKey)}
        onCancel={() => setConfirmSettleKey(null)}
      />

      <ConfirmModal
        open={confirmRemoveKey !== null}
        title="Remove from roster?"
        message={
          confirmRemoveKey
            ? `Permanently remove ${roster.players[confirmRemoveKey]?.displayName ?? "this player"} (and their tab) from the roster.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => confirmRemoveKey && removePlayer(confirmRemoveKey)}
        onCancel={() => setConfirmRemoveKey(null)}
      />

      <ConfirmModal
        open={confirmClearAll}
        title="Clear all tabs?"
        message="Zero out every player's shots owed. (Players are not removed.)"
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        destructive
        onConfirm={clearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "amber" | "ember" | "mute";
}) {
  const colors: Record<typeof tone, string> = {
    good: "bg-bar-good/10 text-bar-good border-bar-good/30",
    amber: "bg-bar-amber/10 text-bar-amber border-bar-amber/40",
    ember: "bg-bar-ember/15 text-bar-ember border-bar-ember/40",
    mute: "bg-bar-panel2 text-bar-mute border-bar-line",
  };
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2 flex items-baseline justify-between",
        colors[tone],
      ].join(" ")}
    >
      <span className="text-xs uppercase tracking-wider font-semibold opacity-80">
        {label}
      </span>
      <span className="text-2xl font-bold font-mono tabular-nums">{value}</span>
    </div>
  );
}
