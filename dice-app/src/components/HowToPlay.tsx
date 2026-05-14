import { Button, Heading, ScreenShell, Subtle } from "./ui";

interface Props {
  onBack: () => void;
}

export function HowToPlay({ onBack }: Props) {
  return (
    <ScreenShell
      footer={
        <Button fullWidth onClick={onBack}>
          Back
        </Button>
      }
    >
      <Heading level={1}>How to Play</Heading>
      <Subtle>Pass-and-play. Loser buys a round.</Subtle>

      <section className="flex flex-col gap-2 mt-2">
        <Heading level={2}>The gist</Heading>
        <p className="text-bar-ink">
          Five dice, two rolls each. Build the highest hand you can. Last
          player standing wins. Whoever's left at the bottom buys the round.
        </p>
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <Heading level={2}>A turn</Heading>
        <ol className="list-decimal pl-5 space-y-1 text-bar-ink">
          <li>Roll all five dice (the <b>1st Roll</b>).</li>
          <li>
            Keep the dice you like, re-roll the rest (your <b>2nd Roll</b>) —
            or <b>Stay</b> on your first roll if it's already strong.
          </li>
          <li>End your turn and pass the phone.</li>
        </ol>
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <Heading level={2}>Scoring</Heading>
        <p className="text-bar-ink">
          Your score is the most of a kind you can show. Five Sixes (56) beats
          Four Sixes (46) beats Three Sixes (36), and so on. Same count?
          Higher face wins — so Five Sixes beats Five Fives.
        </p>
        <p className="text-bar-ink">
          <b>1s are wild.</b> They count as whatever face helps your score
          most.
        </p>
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <Heading level={2}>Rounds</Heading>
        <p className="text-bar-ink">
          Each round, the highest hand goes Safe and sits the rest out. The
          others keep rolling until only two players remain — that's the{" "}
          <b>Best of Three</b> finale. Lose two finale games and you're the
          loser. Two-player games skip straight to the finale.
        </p>
        <p className="text-bar-ink">
          Tied for high? It's a <b>Tiebreaker</b> — one roll each, highest
          wins.
        </p>
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <Heading level={2}>Auto vs Manual</Heading>
        <p className="text-bar-ink">
          <b>Auto:</b> we pick the optimal dice to hold after your 1st roll.
          You still decide whether to Stay or take the 2nd Roll.
        </p>
        <p className="text-bar-ink">
          <b>Manual:</b> tap dice to hold them yourself. You know how this
          rolls.
        </p>
      </section>

      <section className="flex flex-col gap-2 mt-2">
        <Subtle>Please play responsibly.</Subtle>
      </section>
    </ScreenShell>
  );
}
