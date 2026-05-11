import { compareScores, describeScore } from "../game/score";
import type { GameState } from "../game/reducer";
import { activePlayerId } from "../game/reducer";
import type { PlayerSlot, Score } from "../game/types";

interface Props {
  state: GameState;
}

export function Scoreboard({ state }: Props) {
  const safeSet = new Set(state.safeIds);
  const activeId = activePlayerId(state);
  const finaleSet = new Set(state.finalists);
  const inFinale = state.context.kind === "finale";

  // Compute "current leader" from in-progress pool results — the player(s)
  // tied for the highest committed score this pool. Only meaningful while
  // the round is still being played out (no summary up, game not finished).
  const leaderIds: Set<string> = (() => {
    if (state.summary || state.finished) return new Set();
    let bestScore: Score | null = null;
    for (const id of state.poolOrder) {
      const r = state.poolResults[id];
      if (!r) continue;
      if (!bestScore || compareScores(r.score, bestScore) === 1) {
        bestScore = r.score;
      }
    }
    if (!bestScore) return new Set();
    const ids = new Set<string>();
    for (const id of state.poolOrder) {
      const r = state.poolResults[id];
      if (r && compareScores(r.score, bestScore) === 0) ids.add(id);
    }
    return ids;
  })();

  // Sort: canonical entry order.
  const ordered = [...state.players].sort((a, b) => a.entryIndex - b.entryIndex);

  return (
    <ul className="flex flex-col gap-1 rounded-2xl bg-bar-panel border border-bar-line p-3">
      {ordered.map((p) => (
        <PlayerRow
          key={p.id}
          player={p}
          isActive={p.id === activeId}
          isSafe={safeSet.has(p.id)}
          isFinalist={inFinale && finaleSet.has(p.id)}
          inFinale={inFinale}
          isLeader={leaderIds.has(p.id)}
          state={state}
        />
      ))}
    </ul>
  );
}

function PlayerRow({
  player,
  isActive,
  isSafe,
  isFinalist,
  inFinale,
  isLeader,
  state,
}: {
  player: PlayerSlot;
  isActive: boolean;
  isSafe: boolean;
  isFinalist: boolean;
  inFinale: boolean;
  isLeader: boolean;
  state: GameState;
}) {
  const result = state.poolResults[player.id];
  const losses = state.finaleLosses[player.id] ?? 0;
  const opponent = state.finalists.find((id) => id !== player.id);
  const wins = opponent ? state.finaleLosses[opponent] ?? 0 : 0;
  const status = (() => {
    if (state.finished) {
      if (state.loserId === player.id) return { label: "Loser", tone: "ember" as const };
      if (isFinalist) return { label: "Winner", tone: "good" as const };
      return null;
    }
    if (isSafe) return { label: "Safe", tone: "good" as const };
    if (inFinale && isFinalist) {
      return { label: renderFinaleSeries(wins, losses), tone: "amber" as const };
    }
    if (isLeader) return { label: "Current leader", tone: "good" as const };
    return null;
  })();

  return (
    <li
      className={[
        "flex items-center justify-between rounded-xl px-3 py-2 transition-colors",
        isActive ? "bg-bar-amber/15 border border-bar-amber" : "border border-transparent",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={[
            "truncate font-semibold",
            isActive ? "text-bar-amber" : isSafe ? "text-bar-mute" : "text-bar-ink",
          ].join(" ")}
        >
          {player.displayName}
        </span>
        {result && (
          <span
            className={[
              "text-xs font-mono truncate",
              isLeader ? "text-bar-good font-bold" : "text-bar-mute",
            ].join(" ")}
          >
            {describeScore(result.score)}
          </span>
        )}
      </div>
      {status && <Badge label={status.label} tone={status.tone} />}
    </li>
  );
}

function renderFinaleSeries(wins: number, losses: number): string {
  // Best-of-three: render up to 3 slots, filling W's first then L's, then "_".
  const slots: string[] = [];
  for (let i = 0; i < wins; i++) slots.push("W");
  for (let i = 0; i < losses; i++) slots.push("L");
  while (slots.length < 3) slots.push("_");
  return slots.slice(0, 3).join(" ");
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "amber" | "ember";
}) {
  const colors: Record<typeof tone, string> = {
    good: "bg-bar-good/15 text-bar-good border-bar-good/30",
    amber: "bg-bar-amber/15 text-bar-amber border-bar-amber/40",
    ember: "bg-bar-ember/20 text-bar-ember border-bar-ember/40",
  };
  return (
    <span
      className={[
        "ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap",
        colors[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}
