import { useEffect, useRef } from "react";
import { applyGameResult, nameKey } from "../game/storage";
import type { PlayerSlot } from "../game/types";
import { useRoster } from "./UndoProvider";
import { Button } from "./ui";

interface Props {
  loserId: string;
  participants: PlayerSlot[];
  onViewTally: () => void;
  onNewGame: () => void;
  onSamePlayersAgain: () => void;
}

export function ResultModal({
  loserId,
  participants,
  onViewTally,
  onNewGame,
  onSamePlayersAgain,
}: Props) {
  const { roster, applyMutation } = useRoster();
  const appliedKeyRef = useRef<string | null>(null);

  // The "applied key" identifies which game-result this modal mount belongs to.
  // We mutate exactly once per mount.
  const mountKey = `${loserId}|${participants.map((p) => p.id).join(",")}`;

  useEffect(() => {
    if (appliedKeyRef.current === mountKey) return;
    appliedKeyRef.current = mountKey;
    const loser = participants.find((p) => p.id === loserId);
    if (!loser) return;
    const next = applyGameResult(
      roster,
      participants.map((p) => p.displayName),
      loser.displayName,
    );
    applyMutation(next, `${loser.displayName} now owes a shot.`);
    // intentionally only run once per mount key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountKey]);

  const loser = participants.find((p) => p.id === loserId);
  const loserDisplayName = loser?.displayName ?? "Unknown";
  const loserKey = loser ? nameKey(loser.displayName) : "";
  const shotsOwed = roster.players[loserKey]?.shotsOwed ?? 0;

  return (
    <div
      className="fixed inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loser-headline"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="uppercase tracking-[0.3em] text-bar-amber text-sm">
          Loser
        </p>
        <h1
          id="loser-headline"
          className="text-5xl font-extrabold text-bar-ember"
        >
          {loserDisplayName}
        </h1>
        <p className="text-2xl text-bar-ink font-semibold">
          buys the shots.
        </p>
        <p className="mt-4 text-bar-mute text-sm">
          {loserDisplayName}'s tab:{" "}
          <span className="font-mono text-bar-amber text-base">
            {shotsOwed} {shotsOwed === 1 ? "shot" : "shots"}
          </span>
        </p>
      </div>
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-w-md w-full mx-auto flex flex-col gap-2">
        <Button fullWidth onClick={onSamePlayersAgain}>
          Same Players Again
        </Button>
        <Button variant="secondary" fullWidth onClick={onNewGame}>
          New Game
        </Button>
        <Button variant="ghost" fullWidth onClick={onViewTally}>
          View Tally
        </Button>
      </div>
    </div>
  );
}
