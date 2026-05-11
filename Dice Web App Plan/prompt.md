# Dice — bar game web app

**Role:** You are an expert full-stack web developer. You write clean, typed, well-tested React.

**Goal:** Build a single-page web app for a bar dice game called **"Dice."** It will be played pass-and-play on one phone by **2 or more players** (no hard upper limit, but a friendly warning appears once the lineup exceeds 9 — see Setup flow), while standing at a bar. Loser buys shots.

---

## Game rules (authoritative)

**Dice & rolls**
- 5 six-sided dice per turn.
- Each player gets up to 2 rolls per turn. After roll 1, they tap dice to *hold* them; un-held dice are re-rolled. Holding nothing on roll 2 re-rolls all five. They may also "stay" after roll 1 and skip roll 2.
- **1s are wild** and represent any face value to maximize the hand.

**Scoring a hand (the "score engine")**

**Final-hand scoring is always deterministic, in both game modes.** When the dice come to rest at the end of a turn, the engine computes the single best `(count, faceValue)` from those five dice — wilds auto-assign to whichever face yields the highest score. There is no "where do I put my wilds" prompt, ever. Game modes (Easy / Advanced — see below) only change *how dice are held between roll 1 and roll 2*; they do not affect how a final hand is scored.

A hand's score is `(count, faceValue)` where:
- `faceValue` is one of `2..6` (never `1` — wilds always promote to a higher face if any non-1 is present).
- `count` is the number of dice (including wilds) showing that face.

Algorithm:
1. Separate the 5 dice into wilds (`= 1`) and non-wilds.
2. **If all five dice are wilds** → score is `(5, 6)` ("Five Sixes").
3. Otherwise, for each distinct non-wild face `f` in `{2,3,4,5,6}`, compute `count_f = (# non-wilds showing f) + (# wilds)`. The score is the `(count_f, f)` pair with the highest `count_f`; break ties by highest `f`.

Comparing two scores: higher `count` wins; if equal, higher `faceValue` wins; if both equal, it's a tie.

**Display format:** render scores as words — `"Four Sixes"`, `"Three Fives"`, etc. Singular for count = 1 (`"One Four"`).

**Worked examples (use these as unit tests):**

| Dice | Score | Display |
|---|---|---|
| `1, 1, 3, 5, 6` | `(3, 6)` | Three Sixes |
| `1, 1, 1, 5, 6` | `(4, 6)` | Four Sixes |
| `1, 1, 1, 1, 1` | `(5, 6)` | Five Sixes |
| `2, 2, 3, 3, 4` | `(2, 3)` | Two Threes |
| `2, 2, 2, 3, 4` | `(3, 2)` | Three Twos |
| `1, 2, 3, 4, 5` | `(2, 5)` | Two Fives |
| `1, 1, 6, 6, 6` | `(5, 6)` | Five Sixes |
| `6, 6, 5, 5, 4` | `(2, 6)` | Two Sixes (count tie → higher face) |

**Game modes (chosen on the Setup screen, applies to all players in that game)**

The mode changes *only* the between-rolls hold step. Final scoring is identical.

- **Easy** *(default)* — no player input on holds. The active player taps a single "Roll Turn" button. Roll 1 plays out, then:
  1. If roll 1 already produced a 5-of-a-kind (`count = 5`), the turn ends after a brief reveal pause (~600 ms). No roll 2.
  2. Otherwise, the **optimal-hold** algorithm marks dice as held automatically (visually highlighted), then roll 2 plays for the un-held dice. The final hand is scored.

  *Optimal-hold algorithm*: hold every wild (face = 1) **and** every die matching the face the score engine selected for roll 1's score. Re-roll the rest. (Examples: `1,1,5,5,6` → score `(4,5)`, hold the two 1s + two 5s, re-roll the 6. `2,3,4,5,6` → score `(1,6)`, hold the 6, re-roll the rest. `1,2,3,4,5` → score `(2,5)`, hold the 1 + the 5, re-roll the 2/3/4.)

- **Advanced** — the player taps individual dice between roll 1 and roll 2 to toggle held / un-held, then taps `Roll Again` or `Stay`. **Any combination is permitted, including objectively bad ones.** Example: a player rolling `1, 1, 1, 1, 3` may keep the 3 and re-roll all four wilds. The app does not warn, hint, or prevent this — Advanced is for players who want full control (and bluffing space).

The mode is set per-game on the Setup screen. The last-used mode is remembered as a default for the next game (stored in `localStorage` key `dice.prefs.v1`, schema `{ version: 1, lastMode: "easy" | "advanced" }`).

**Round structure**
- Every player still "in" rolls once each. Turn order in round 1 is whatever was selected in the Setup → Turn Order step (Highest Roll First, Order of Entry, Alphabetical, or Randomize). In subsequent rounds, the round-1 order is preserved with eliminated (Safe) players skipped — so if round 1 was `Ana, Bob, Steve, Tom` and Ana was Safe, round 2 plays in order `Bob, Steve, Tom`.
- The player with the highest score is **Safe** and removed from the next round.
- Repeat until exactly 2 players remain.

**Tie rule (roll-off)**
- If multiple players tie for highest in a round, only those tied players play a roll-off (full 2-roll turn each). The roll-off winner is Safe; the loser(s) continue in the next round.
- Roll-offs themselves can tie → repeat until one player has the highest.

**The finale (best of three)**
- The last 2 players play a best-of-three.
- First to **lose 2** is the **Loser** (buys shots). Show a clear loser-reveal modal. Show the winner too, but the headline is the loser.
- Ties in a finale game also use the roll-off rule above.

---

## Shot tally (persisted across games on this device)

The whole point of the game is the bar tab — track it.

- After every completed game, increment the loser's `shotsOwed` by 1 and increment `gamesPlayed` for everyone who played that game. `lastLossAt` updates on the loser.
- Setup screen shows a **roster** of known players from prior games as one-tap chips (sorted by name), plus a free-text "new player" input. Selecting an existing chip adds that player to the lineup. Typing a name that matches an existing player (case-insensitive, trimmed, whitespace-collapsed) reuses that roster entry instead of creating a duplicate.
- A **Tally screen** is reachable from the setup screen ("View Tally" link) and from the result modal ("View Tally" button). It lists every roster player sorted by `shotsOwed` descending, with a count badge and `gamesPlayed`. Each row has:
  - **Settle Up** — zeros that player's `shotsOwed` (with confirm modal). Keeps `gamesPlayed`.
  - **Remove Player** — deletes the roster entry entirely (with confirm modal).
- A **Clear All Tallies** action at the bottom of the Tally screen zeros every player's `shotsOwed` (does not delete anyone).

**Undo (5-second toast)**

Every action that mutates the persisted roster shows a single bottom-of-screen undo toast. The mutation commits to `localStorage` immediately so closing the tab still saves; undo restores from an in-memory snapshot of the prior roster.

Actions that produce a toast:
- Result modal mount: `"X now owes N shots. Undo (5s)"` — reverts the post-game increment (`shotsOwed -= 1`, `gamesPlayed -= 1` for each player who played, `lastLossAt` restored to its prior value). Useful when the wrong player got declared loser due to a dispute.
- Tally → Settle Up: `"Settled X's tab. Undo (5s)"` — restores that player's `shotsOwed`.
- Tally → Remove Player: `"Removed X. Undo (5s)"` — restores the full roster entry including history.
- Tally → Clear All Tallies: `"Cleared all tabs. Undo (5s)"` — restores every `shotsOwed` value at once.

Toast rules:
- Auto-dismiss after **5 seconds**, or on tap-anywhere outside the Undo button.
- Only one toast at a time. If a new destructive action fires while a toast is live, the prior toast finalizes (snapshot discarded) and the new toast replaces it.
- The Undo tap target is ≥ 48 px and labeled clearly. Toast width is full-width on mobile, max-width centered on wider viewports.
- Implementation: keep `undoState: { snapshot: Roster, label: string, expiresAt: number } | null` in a top-level provider or context. On Undo click, write the snapshot back to storage and clear `undoState`.

**Storage**
- `localStorage` key: `dice.tally.v1`.
- Schema:
  ```ts
  type Roster = {
    version: 1;
    players: Record<string /* NameKey */, {
      displayName: string;     // most recently entered casing
      shotsOwed: number;
      gamesPlayed: number;
      lastLossAt: string | null; // ISO timestamp
    }>;
  };
  ```
  `NameKey = name.trim().replace(/\s+/g, " ").toLowerCase()`.
- Wrap reads in `try/catch`. On parse failure or version mismatch with no migration available, fall back to an empty roster (don't crash). Bump the version key (`dice.tally.v2`, etc.) and write a forward migration when the schema changes.
- **Game-in-progress state is NOT persisted.** Reload mid-game = abandon. Only the roster persists.

---

## Technical requirements

- **Stack:** Vite + React + TypeScript + Tailwind CSS. Framer Motion for dice animations. No backend, no router, no accounts. `localStorage` is permitted **only** for the shot tally / roster described above — in-progress game state must not persist.
- **State:** React hooks only (`useState`/`useReducer`). A single reducer for game state is preferred.
- **Testing:** Vitest. Unit-test the score engine against every row in the worked-examples table above before writing UI. Add tests for: score comparison, tie detection, and a 5-player round simulation that picks the correct Safe player.
- **Mobile-first:** target a phone held in one hand. Tap targets ≥ 48 px. Primary actions reachable with a thumb (bottom of screen). Avoid hover-only affordances. Use system font stack; no custom font downloads.
- **Aesthetic:** dark "bar" theme — near-black background, warm amber/red accents, generous spacing. Avoid skeuomorphism; flat geometric dice are fine.
- **Accessibility:** semantic buttons, `aria-pressed` on held dice, focus-visible rings, color-blind-safe held/unheld distinction (don't rely on color alone — also use a border or icon).

### UI surfaces

1. **Setup flow** — three sub-screens, played in order. Implement as a `Setup.tsx` orchestrator with three child screens.

   **1a. Game Settings**
   - Numeric input for **player count** (typed by the user). Validation:
     - **Minimum 2** — values < 2, non-integers, negatives, and non-numerics show inline error "Enter a number, 2 or more" and disable Next.
     - **No upper cap.** Any integer ≥ 2 is accepted.
     - **Soft warning at > 9.** When the entered count is ≥ 10, show a small amber/warning-colored helper line below the input: *"Think about the tab though..."* This is informational only — Next remains enabled.
   - Mode toggle: `Easy` / `Advanced` segmented control, defaulted to `dice.prefs.v1.lastMode` (fallback `Easy`). Helper line: *"Easy: app holds optimal dice. Advanced: you choose."*
   - "View Tally" link to navigate to the Tally screen.
   - "Next" button advances to Player Entry.

   **1b. Player Entry** — repeats once per slot, top to bottom
   - Header: "Player N of M" (1-indexed, M = the count from 1a).
   - Name input field. Validation:
     - Empty / whitespace-only names are rejected.
     - Names that match (modulo trim + whitespace collapse + case) a name **already entered in the current game** show inline error `"That name is already in this game"` and disable the Roll button.
     - Names that match an entry on the persisted roster reuse that roster entry's tally history (display the original casing in the lineup list, but track the value the user actually typed for display purposes).
   - Roster chip strip below the input: prior-game names *not yet used in this game*, as one-tap fill chips. Quick-fill is optional — players can always just type.
   - "Roll Die" button (disabled until name is valid). Tapping it:
     1. Commits the name to slot N.
     2. Runs a single-d6 roll animation (~600 ms) on a centered die.
     3. Records the result as `setupRoll: 1..6` for that player.
     4. Advances to slot N+1, or to Turn Order if N == M.
   - At the top of the screen, a running **"Entered so far"** list with each completed player's name + their setup-roll die value (e.g. `Steve — 4`, `Bob — 6`).
   - The setup roll is one-shot. There is no re-roll button.

   **1c. Turn Order**
   - Header: "Who rolls first?"
   - Four radio options. The selected option updates a **live preview list** below showing the resulting round-1 turn order with each player's name and (where relevant) their setup-roll value.
     - **Highest Roll First** — sort players by `setupRoll` descending. **Ties break by entry order descending** — the player who tied *latest* (most recently typed their name) goes first within a tie group. Example: with entry order Steve(4) → Tom(3) → Bob(6) → Ana(6), the order is Ana, Bob, Steve, Tom.
     - **Order of Entry** — preserves the order players typed their names in step 1b.
     - **Alphabetical** — sort by `displayName` ascending, case-insensitive (`localeCompare(other, undefined, { sensitivity: "base" })`).
     - **Randomize** — Fisher-Yates shuffle. Tapping the option a second time re-shuffles, so a disliked random order can be rolled again.
   - "Start Game" button: persists `dice.prefs.v1.lastMode`, locks in the chosen turn order as the round-1 player order, and begins round 1.

   **Back navigation through the Setup flow**
   - Every sub-screen except 1a shows a `← Back` button at the top-left.
   - **From 1b slot N**: Back returns to slot N − 1 if N > 1, otherwise to 1a (Game Settings). The previously-completed slot's name and `setupRoll` are preserved and pre-filled when revisited. Any name typed but not yet rolled in the current slot is discarded.
   - **From 1c (Turn Order)**: Back returns to 1b at slot M (the last slot), with all completed slots' names and rolls preserved. The selected turn-order radio is also remembered if the player returns to 1c.
   - When revisiting a completed slot via Back, the name field is editable. **Setup rolls are one-shot — there is no re-roll button**, even on revisit. (Re-rolling on revisit would let players reshuffle their luck after seeing other rolls.) To start over, every sub-screen has a small "Restart Setup" link at the bottom that clears all setup state and returns to 1a after a confirm.

   **Turn order in subsequent rounds and the finale**: the round-1 order is the canonical order; in later rounds, eliminated (Safe) players are simply skipped while the remaining players keep their relative positions. Roll-offs use entry-order (sub-screen 1b) among the tied players, regardless of the chosen turn-order option, to keep tiebreak deterministic and quick.
2. **Game screen**
   - Top: scoreboard listing every player with status badge: `In`, `Safe (round N)`, or current turn highlight. Mode badge ("Easy" / "Advanced") visible somewhere persistent so players are reminded which mode they're in.
   - Center: dice tray for the active player. Held dice are visually distinct (dimmed outline + checkmark) and the running computed score is shown live.
   - **Easy mode behavior**: dice are NOT individually tappable. The player taps a single `Roll Turn` button; the app handles roll 1, applies the optimal-hold algorithm, runs roll 2 (or skips it if 5-of-a-kind), and surfaces an `End Turn` button. There is a brief pause (~600 ms) between roll 1 landing and the auto-roll-2 starting so the player can see what was held.
   - **Advanced mode behavior**: dice are tappable to toggle held / un-held between rolls. The bottom action button progression is `Roll` → `Roll Again (1 left)` + `Stay` → `End Turn`. Any hold combination is allowed (including keeping nothing or keeping bad dice).
   - After the last player in a round rolls, show a round-summary card: who's Safe, who advances, and a "Next Round" button. Roll-offs auto-trigger from this card if needed; roll-offs use the same mode as the parent game.
3. **Finale screen** — same as game screen but with a "Best of Three" header and a `W L _` series tracker per player.
4. **Result modal** — full-screen overlay with the loser's name and "buys the shots." Shows the loser's updated total (`shotsOwed`) so the running tab is visible. Buttons: `View Tally`, `New Game` (resets to setup, roster persists), `Same Players Again` (skips setup, starts a new game with the same lineup).
5. **Tally screen** — list view described in the Shot Tally section above. Reachable from setup and result modal; back button returns to the previous screen.

### Animations

- On Roll: dice tumble in place for ~600 ms (Framer Motion `rotate` keyframes + face cycling) before settling on the final value. Don't gate gameplay on the animation — score updates as soon as the values are committed; the animation is decorative.
- Held dice do not animate.

### File layout (suggested)

```
src/
  game/
    score.ts          // pure scoring engine
    score.test.ts     // worked-examples table
    easyHold.ts       // optimal-hold algorithm for Easy mode
    easyHold.test.ts  // hold-decision examples
    reducer.ts        // game state machine (mode-aware)
    reducer.test.ts
    storage.ts        // localStorage adapter for roster/tally + prefs
    storage.test.ts   // round-trip + corrupted-storage fallback tests
    turnOrder.ts      // pure: compute round-1 order from setup data + chosen option
    turnOrder.test.ts // tiebreak, alphabetical, entry-order, randomize tests
    types.ts
  components/
    Setup.tsx         // orchestrator for the 3-step setup flow
    GameSettings.tsx  // step 1a: player count + mode toggle
    PlayerEntry.tsx   // step 1b: per-slot name + d6 setup roll
    TurnOrder.tsx     // step 1c: pick first-roller rule + preview
    SetupDie.tsx      // single-d6 component used during PlayerEntry
    PlayerChip.tsx    // roster chip used as quick-fill in PlayerEntry
    ModeToggle.tsx    // Easy / Advanced segmented control
    Scoreboard.tsx
    DiceTray.tsx
    Die.tsx
    RoundSummary.tsx
    ResultModal.tsx
    Tally.tsx
    UndoToast.tsx     // 5-second undo toast
    UndoProvider.tsx  // context provider managing undoState
  App.tsx
  main.tsx
  index.css           // Tailwind directives
```

---

## Build order (do not skip)

1. Scaffold the Vite + React + TS + Tailwind project. Verify `npm run dev` opens a blank styled page.
2. Implement `score.ts` and pass every row of the worked-examples table in `score.test.ts`. **Do not start UI until score tests are green.**
3. Implement `easyHold.ts` (the optimal-hold algorithm) with `easyHold.test.ts` covering: 5-of-a-kind → stay; mixed wilds + matches → hold wilds + matches; all-singletons-with-wild → hold the wild + the highest singleton; no-wilds-no-pair → hold the highest singleton.
4. Implement `storage.ts` for both `dice.tally.v1` (roster) and `dice.prefs.v1` (lastMode). Tests cover round-trip, name-key normalization, corrupted-JSON fallback, and version-mismatch fallback for both keys.
5. Implement `reducer.ts` mode-aware (it should call `easyHold` automatically in Easy mode and accept explicit hold-toggle actions in Advanced mode). Test a simulated 5-player round in each mode.
6. Implement `turnOrder.ts` as a pure function: input = `{ players: { displayName, setupRoll, entryIndex }[], option: "highestRoll" | "entryOrder" | "alphabetical" | "randomize" }`, output = ordered array of player IDs. Test all four options, including the highest-roll tiebreak (later entry wins within a tied roll group), alphabetical case-insensitivity, and randomize producing a permutation.
7. Build the Setup flow as `Setup.tsx` orchestrating `GameSettings.tsx` → `PlayerEntry.tsx` (looped per slot) → `TurnOrder.tsx`. Use `SetupDie.tsx` for the per-player d6 roll. Wire to reducer + storage. Validate player-count input (≥ 2, no upper cap; surface the "Think about the tab though..." warning at ≥ 10) and per-game name uniqueness inline. Implement Back navigation: completed slot data persists across navigation, current-slot pending input is discarded, and the setup roll is one-shot (no re-roll button on revisit). Add a "Restart Setup" link with a confirm dialog on each sub-screen.
8. Build the Game screen for **Advanced mode first** (DiceTray with tap-to-hold + Roll/Stay buttons). Defer animations.
9. Add Easy mode behavior on the Game screen: single `Roll Turn` button, auto-hold visualization, auto-roll-2 sequence. Reuse the same DiceTray component, just with tap disabled.
10. Add round summary + auto-roll-off handling. Roll-offs inherit the parent game's mode and use entry-order among tied players.
11. Build the Finale screen + Result modal. Result modal increments tally on mount and shows the undo toast.
12. Build the `UndoProvider` + `UndoToast` plumbing. Wire the result-modal increment through it.
13. Build the Tally screen with Settle Up / Remove / Clear All actions, each routed through the UndoProvider so they show toasts.
14. Add Framer Motion roll animation to both the main game DiceTray and the SetupDie last.

## Acceptance check (manually verify before reporting done)
- 4-player game runs end-to-end **in both modes**: 2 elimination rounds reduce to 2 finalists; finale plays a best-of-three; loser modal shows the right name and the loser's `shotsOwed` increased by exactly 1.
- **Setup flow** runs end-to-end: typing `5` advances to player entry; entering five names with five setup rolls collects all data; the Turn Order screen shows a working live preview for each option.
- **Highest Roll First tiebreak**: with setup rolls `Steve=4, Tom=3, Bob=6, Ana=6` (entry order Steve→Tom→Bob→Ana), the resulting order is `Ana, Bob, Steve, Tom` — Ana goes ahead of Bob because she entered later among the tied 6s.
- **Alphabetical** orders names case-insensitively (verify `bob` < `Steve` < `tom`).
- **Order of Entry** matches the typing order exactly. **Randomize** returns a permutation; tapping the option a second time may produce a different order.
- Round 2 turn order matches round 1 minus eliminated players (verify with a 4-player game).
- Player count input rejects 0, 1, negatives, non-integers, and non-numerics; Next stays disabled until a valid integer ≥ 2 is entered. Entering 8 or 9 keeps Next enabled with no warning. Entering 10 or higher keeps Next enabled and surfaces the *"Think about the tab though..."* warning. A 12-player game runs end-to-end without UI breakage (player list scrolls; tap targets remain ≥ 48 px).
- Entering a duplicate name during Player Entry shows the inline error and disables Roll until the name is changed.
- **Back navigation**: from Player Entry slot 3, tapping Back returns to slot 2 with the previously-entered name and roll value pre-filled and not re-rolled. Tapping Back from slot 1 returns to Game Settings. From Turn Order, tapping Back returns to the last Player Entry slot. Pending unrolled input on the current slot is discarded on Back, but completed slots are preserved.
- The "Restart Setup" link clears all setup state after a confirm and returns the user to Game Settings.
- **Easy mode** plays a full turn with a single `Roll Turn` tap per player. Optimal-hold visualization is visible between rolls. 5-of-a-kind on roll 1 ends the turn without a roll 2.
- **Advanced mode** allows the player to hold *any* combination, including `keep the 3, re-roll all four 1s` from a `1,1,1,1,3` hand. The app does not warn or prevent this.
- The mode toggle on Setup defaults to whatever was last used (verify by playing once in Advanced, returning to setup → toggle is on Advanced).
- Forcing a tie (set dice values manually in dev) triggers a roll-off only between tied players, in the same mode as the parent game.
- All score-engine, easyHold, and storage tests pass.
- After two games on the same device with overlapping rosters, the Tally screen shows correct cumulative `shotsOwed` and `gamesPlayed`. Reload preserves the tally; in-progress games are NOT preserved.
- Adding a player whose name (modulo case/whitespace) matches an existing roster entry reuses that entry instead of creating a duplicate.
- "Settle Up" zeros only the targeted player's `shotsOwed` after a confirm, and leaves `gamesPlayed` untouched.
- **Undo flow**: after Settle Up, Remove Player, Clear All Tallies, and post-game increment, a toast appears with a working Undo button. Tapping it within 5 s reverts the change. Letting it expire commits the change permanently. Triggering a second destructive action while a toast is live finalizes the first action and shows a fresh toast.
- On a 390 × 844 viewport (iPhone 14), every interactive element — including the mode toggle and the undo toast — is tappable with one thumb without scrolling.
