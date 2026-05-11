import { describeScore } from "../game/score";
import type { GameState, Summary } from "../game/reducer";
import type { PlayerSlot } from "../game/types";
import { Button, Card, Heading, Subtle } from "./ui";

interface Props {
  state: GameState;
  summary: Summary;
  onAdvance: () => void;
}

export function RoundSummary({ state, summary, onAdvance }: Props) {
  const playersById: Record<string, PlayerSlot> = Object.fromEntries(
    state.players.map((p) => [p.id, p]),
  );
  const headline = headlineFor(summary);
  const advanceLabel = advanceLabelFor(summary, state);
  const winnerName =
    summary.winnerId && playersById[summary.winnerId]?.displayName;

  return (
    <Card className="flex flex-col gap-3">
      <Heading level={2}>{headline.title}</Heading>
      {headline.subtitle && <Subtle>{headline.subtitle}</Subtle>}

      <ol className="flex flex-col gap-1">
        {summary.poolPlayers.map((id) => {
          const r = summary.poolResults[id];
          const player = playersById[id];
          if (!r || !player) return null;
          const isWinner = id === summary.winnerId;
          const isTied = summary.tiedIds?.includes(id);
          return (
            <li
              key={id}
              className={[
                "flex items-center justify-between rounded-xl px-3 py-2",
                isWinner
                  ? "bg-bar-good/15 text-bar-good"
                  : isTied
                    ? "bg-bar-amber/15 text-bar-amber"
                    : "bg-bar-panel2 text-bar-ink",
              ].join(" ")}
            >
              <span className="font-semibold">{player.displayName}</span>
              <span className="font-mono text-sm">{describeScore(r.score)}</span>
            </li>
          );
        })}
      </ol>

      {summary.kind === "elimResolved" && winnerName && (
        <p className="text-bar-good font-semibold">
          {winnerName} is Safe.
        </p>
      )}
      {summary.kind === "rollOffNeeded" && (
        <p className="text-bar-amber font-semibold">
          {summary.tiedIds!
            .map((id) => playersById[id]?.displayName)
            .filter(Boolean)
            .join(" & ")}{" "}
          tied — one roll each to break it.
        </p>
      )}
      {summary.kind === "finaleResolved" && summary.finaleLoserId && (
        <p className="text-bar-ink">
          {playersById[summary.winnerId!]?.displayName} wins game{" "}
          {state.context.gameNumber}.{" "}
          <span className="text-bar-mute">
            ({playersById[summary.finaleLoserId]?.displayName} drops a game)
          </span>
        </p>
      )}

      <Button fullWidth onClick={onAdvance}>
        {advanceLabel}
      </Button>
    </Card>
  );
}

function headlineFor(summary: Summary): { title: string; subtitle?: string } {
  if (summary.kind === "rollOffNeeded") {
    return { title: "Tiebreaker! One Roll Each" };
  }
  if (summary.kind === "elimResolved") {
    if (summary.context.kind === "elim") {
      return {
        title: summary.inRollOff
          ? `Roll-off — round ${summary.context.round}`
          : `Round ${summary.context.round} results`,
      };
    }
  }
  if (summary.kind === "finaleResolved") {
    return {
      title: summary.inRollOff
        ? `Finale roll-off — game ${summary.context.gameNumber}`
        : `Finale — game ${summary.context.gameNumber}`,
    };
  }
  return { title: "Results" };
}

function advanceLabelFor(summary: Summary, state: GameState): string {
  if (summary.kind === "rollOffNeeded") return "Start Tiebreaker";
  if (summary.kind === "elimResolved") {
    // Determine whether next state is finale or another round.
    const safeAfter = state.safeIds.length + 1;
    const remainingAfter = state.players.length - safeAfter;
    if (remainingAfter === 2) return "To the Finale";
    return "Next Round";
  }
  // finaleResolved
  const newLosses =
    (state.finaleLosses[summary.finaleLoserId!] ?? 0) + 1;
  if (newLosses >= 2) return "Reveal Loser";
  return "Next Game";
}
