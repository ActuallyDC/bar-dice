import { useMemo, useRef, useState } from "react";
import type { DieValue, GameMode, PlayerSlot, Roster } from "../game/types";
import { nameKey } from "../game/storage";
import { Button, Heading, ScreenShell, Subtle } from "./ui";
import { ModeToggle } from "./ModeToggle";
import { SetupDie } from "./SetupDie";
import { PlayerChip } from "./PlayerChip";

interface Row {
  id: string;
  displayName: string;
  nameKey: string;
  setupRoll: DieValue | null;
  rolling: boolean;
  rollKey: number;
}

interface Props {
  initialRows?: PlayerSlot[];
  mode: GameMode;
  roster: Roster;
  onModeChange: (m: GameMode) => void;
  onStart: (slots: PlayerSlot[]) => void;
  onViewTally: () => void;
  onRestart?: () => void;
}

export function GameSettings(props: Props) {
  const {
    initialRows,
    mode,
    roster,
    onModeChange,
    onStart,
    onViewTally,
  } = props;

  const [rows, setRows] = useState<Row[]>(() =>
    (initialRows ?? []).map((s) => ({
      id: s.id,
      displayName: s.displayName,
      nameKey: s.nameKey,
      setupRoll: s.setupRoll,
      rolling: false,
      rollKey: 0,
    })),
  );
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmed = draft.trim().replace(/\s+/g, " ");
  const trimmedKey = nameKey(trimmed);
  const isDuplicate =
    trimmed.length > 0 && rows.some((r) => r.nameKey === trimmedKey);
  const anyRolling = rows.some((r) => r.rolling);
  const canAdd = trimmed.length > 0 && !isDuplicate && !anyRolling;
  const committedCount = rows.filter((r) => !r.rolling && r.setupRoll !== null)
    .length;
  const canStart = committedCount >= 2 && !anyRolling;

  function commitAdd() {
    if (!canAdd) return;
    const value = (1 + Math.floor(Math.random() * 6)) as DieValue;
    const id = `p${rows.length}-${Date.now().toString(36)}`;
    setRows((prev) => [
      ...prev,
      {
        id,
        displayName: trimmed,
        nameKey: trimmedKey,
        setupRoll: value,
        rolling: true,
        rollKey: Date.now(),
      },
    ]);
    setDraft("");
  }

  function handleRollSettled(rowId: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, rolling: false } : r)),
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function remove(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  function handleStart() {
    if (!canStart) return;
    const slots: PlayerSlot[] = rows
      .filter((r) => !r.rolling && r.setupRoll !== null)
      .map((r, i) => ({
        id: r.id,
        displayName: r.displayName,
        nameKey: r.nameKey,
        setupRoll: r.setupRoll!,
        entryIndex: i,
      }));
    onStart(slots);
  }

  const rosterChips = useMemo(() => {
    const used = new Set(rows.map((r) => r.nameKey));
    return Object.values(roster.players)
      .map((p) => ({ key: nameKey(p.displayName), name: p.displayName }))
      .filter((p) => !used.has(p.key))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [roster, rows]);

  return (
    <ScreenShell
      footer={
        <Button fullWidth disabled={!canStart} onClick={handleStart}>
          Start
        </Button>
      }
    >
      <Heading level={1}>Bar Dice</Heading>
      <Subtle>Pass-and-play. Loser buys a round.</Subtle>

      <section className="flex flex-col gap-2 mt-2">
        <label className="font-semibold text-bar-ink" htmlFor="player-name">
          Players
        </label>
        <div className="flex gap-2">
          <input
            id="player-name"
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitAdd();
              }
            }}
            className="tap-target focus-ring flex-1 rounded-2xl bg-bar-panel2 border border-bar-line px-4 py-3 text-lg font-semibold text-bar-ink"
            placeholder="Who's in?"
            aria-invalid={isDuplicate}
          />
          <Button onClick={commitAdd} disabled={!canAdd}>
            {anyRolling ? "Adding…" : "Add"}
          </Button>
        </div>

        {isDuplicate && (
          <p className="text-sm text-bar-ember">Already on the list.</p>
        )}

        {rosterChips.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-bar-mute">
              From the bar
            </p>
            <div className="flex flex-wrap gap-2">
              {rosterChips.map((c) => (
                <PlayerChip
                  key={c.key}
                  label={c.name}
                  onClick={() => setDraft(c.name)}
                />
              ))}
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <ul className="flex flex-col gap-1 mt-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl bg-bar-panel border border-bar-line px-4 py-2 gap-3"
              >
                <span className="font-semibold text-bar-ink">{r.displayName}</span>
                <span className="flex items-center gap-2">
                  <span data-testid={`row-roll-${r.displayName}`} className="font-mono text-bar-mute">
                    {r.rolling ? "" : r.setupRoll}
                  </span>
                  <SetupDie
                    value={r.setupRoll}
                    rollKey={r.rollKey}
                    onRollSettled={() => handleRollSettled(r.id)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="tap-target focus-ring text-bar-mute hover:text-bar-ember rounded-xl px-2"
                    aria-label={`Remove ${r.displayName}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {!canStart && (
          <p className="text-sm text-bar-mute">Need at least 2.</p>
        )}
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <span className="font-semibold text-bar-ink">Mode</span>
        <ModeToggle value={mode} onChange={onModeChange} />
        <Subtle>
          {mode === "easy"
            ? "We make the optimal decisions for you."
            : "You know how this rolls."}
        </Subtle>
      </section>

      <section className="mt-auto flex justify-center">
        <button
          type="button"
          className="text-bar-amber underline underline-offset-4 tap-target focus-ring px-3"
          onClick={onViewTally}
        >
          View Tally
        </button>
      </section>
    </ScreenShell>
  );
}
