# Bar Dice v1.2 — Design Spec

**Date:** 2026-05-11
**Baseline:** git tag `v1.1` (commit `4ce4e1d`)
**Scope:** Apply v1.1 playtest feedback. Collapse Setup name-entry and per-player rolling into one inline screen, fix the View-Tally double-apply bug, change the shots-per-loss rule, distinguish the Stay animation from a re-roll, add a Custom turn order, highlight newly-matched dice after Roll 2, and dismiss the game-result Undo on entering Tally.

---

## 1. Scope

In scope for v1.2:

1. **Setup roll inline-on-Add** — pressing Add immediately rolls that player's single die on the Setup screen. PlayerEntry as a separate phase goes away on the main path.
2. **Shots-per-loss rule change** — `shotsOwed += playerCount` per loss (was `playerCount − 1`).
3. **Stay animation** — lock-in scale-snap instead of tumble.
4. **View Tally double-apply bug fix** — `applyGameResult` runs exactly once per finished game, regardless of how many times `ResultModal` mounts/unmounts.
5. **Dismiss game-result Undo on Tally entry** — in-Tally Undos (Settle Up, Remove, Clear All) survive Tally remounts.
6. **Custom turn order** — fifth option on Turn Order screen, ▲/▼ arrows, initial order = current displayed order.
7. **Newly-matched dice highlight on Roll 2** — re-rolled dice that happen to land on the held face get a gold pulse and become held-styled.

Out of scope:

- Roll-off mechanics (still single-roll per the v1.0 drift).
- Existing turn order algorithms (`highestRoll` / `entryOrder` / `alphabetical` / `randomize`).
- Scoring rules / `compareScores` / `describeScore`.
- Mode label names ("Auto" / "Manual" stay).
- Tally layout (Games + Shots two-column from v1.1 stays).
- Storage version bump (defensive defaulting on read remains the chosen strategy).

---

## 2. Versioning

- Work proceeds on `main` from `v1.1` (`4ce4e1d`).
- Tagged `v1.2` once green in browser preview.
- `v1.1` tag remains checkout-able for comparison.

---

## 3. Setup roll inline-on-Add

### 3.1 Current flow

`Setup.tsx` orchestrates three steps: `"settings"` (name list in `GameSettings`) → `"entry"` (per-slot rolling in `PlayerEntry`, looped via `currentSlot`) → `"order"` (`TurnOrder`).

### 3.2 Target flow

Two steps: `"settings"` (inline name entry + per-name rolling) → `"order"`. PlayerEntry is deleted.

### 3.3 `GameSettings.tsx`

The screen now owns name entry **and** per-name rolling. Mental model: each row in the list is a player slot in one of three local states (`"idle"` doesn't apply because rows only exist after Add — but a row immediately enters `"rolling"` on creation, then `"committed"`).

**New state.**

```ts
type Row = {
  id: string;            // stable, like `p${idx}-${Date.now().toString(36)}`
  displayName: string;   // trimmed, normalized
  nameKey: string;       // nameKey(displayName)
  setupRoll: DieValue | null;  // null while rolling
  rolling: boolean;
};

const [rows, setRows] = useState<Row[]>([]);
const [draft, setDraft] = useState("");
```

Derived: `committedRows = rows.filter(r => !r.rolling && r.setupRoll != null)`.

**Add behaviour.** When the user presses Add (or hits Enter in the input):

1. Validate the draft (trimmed, non-empty, not a duplicate of any existing `nameKey`).
2. Roll the die immediately: `const value = (1 + Math.floor(Math.random() * 6)) as DieValue`.
3. Append a row with `setupRoll: value`, `rolling: true`.
4. Clear `draft`.
5. Render the row with a `<SetupDie>` next to it. The die's `rollKey` is bumped per row so it re-tumbles on initial mount. (The reused `SetupDie` component already handles its own animation and fires `onRollSettled` after the 1200 ms tumble.)
6. When `onRollSettled` fires, flip that row's `rolling` to `false`. Refocus the name input.

**Add button gating.** `disabled` iff:
- Draft is empty/whitespace, OR
- Draft duplicates a name already in `rows` (case-insensitive `nameKey` compare), OR
- Any row in `rows` has `rolling: true` (single concurrent animation).

The button label reads `"Adding…"` while a row is mid-roll, `"Add"` otherwise.

**Remove behaviour.** Each row has a ✕ on the right side. Tap removes the row from `rows` with no confirm, regardless of whether it's mid-roll or committed. (If mid-roll, the SetupDie unmounts; no callback fires.)

**Start button.** Footer "Start" enabled iff `committedRows.length >= 2` AND no row is `rolling`. On click, pass `committedRows` up as a `PlayerSlot[]`:

```ts
const slots: PlayerSlot[] = committedRows.map((r, i) => ({
  id: r.id,
  displayName: r.displayName,
  nameKey: r.nameKey,
  setupRoll: r.setupRoll!,
  entryIndex: i,
}));
onStart(slots);
```

**Helper text below the list while disabled:** `"Need at least 2."` (unchanged from v1.1).

**Roster chips ("From the bar").** Render above the name input, sorted alphabetically. Each chip excludes any name whose `nameKey` matches an existing `rows` entry. Tapping a chip fills the input with that name (does NOT auto-add — user still presses Add to commit + roll).

**Props (new shape):**

```ts
interface Props {
  initialRows?: PlayerSlot[];        // re-entry after Back from TurnOrder
  mode: GameMode;
  roster: Roster;                    // for "From the bar" chips
  onModeChange: (m: GameMode) => void;
  onStart: (slots: PlayerSlot[]) => void;
  onViewTally: () => void;
  onRestart?: () => void;
}
```

`initialRows` lets `Setup.tsx` preserve names + rolls across a TurnOrder Back. On mount, if `initialRows` is non-empty, hydrate `rows` from it (`rolling: false`).

### 3.4 `Setup.tsx`

- `Step` becomes `"settings" | "order"`. The `"entry"` branch and `PlayerEntry` import go away.
- State narrows: `slots: PlayerSlot[]`, `option: TurnOrderOption`, `mode: GameMode`, `confirmRestart`.
- `handleStartFromSettings(submitted: PlayerSlot[])` → `setSlots(submitted); setStep("order")`.
- `handleOrderBack()` → `setStep("settings")`. The slots are preserved and passed to `GameSettings` as `initialRows`.
- `handleSlotComplete`, `handleEntryBack`, `currentSlot` state are all deleted.
- `performRestart` clears `slots` and resets `option`.

### 3.5 `PlayerEntry.tsx` deletion

- File deleted.
- `PlayerEntry.test.tsx` (if it exists separately) deleted.
- `Setup.tsx` import removed.
- `SetupDie` keeps its current API — it's now consumed only by `GameSettings`.

### 3.6 Visual layout sketch

```
Bar Dice
Pass-and-play. Loser buys a round.

Players
[Who's in?          ] [Add]

From the bar:
  [Alice] [Bob] [Cleo]   (chips of rostered names not already in rows)

┌────────────────────────────────────────────┐
│ Bob                              [die: 4] ✕│  ← committed
│ Sue                              [die: 🎲] ✕│  ← rolling
└────────────────────────────────────────────┘

Need at least 2.   (only when committedRows.length < 2)

Mode: [ Auto | Manual ]
We make the optimal decisions for you.

View Tally

[ Start ] (footer, disabled until 2+ rows and no rolling)
```

### 3.7 Tests

- `GameSettings.test.tsx`:
  - Add a name → row appears with rolling state → after the SetupDie's `onRollSettled` fires (mocked / via test helper), row commits with the rolled value.
  - Add while a row is rolling → Add button is disabled.
  - Duplicate name (case-insensitive) → Add disabled, inline "Already on the list." message.
  - Remove a mid-roll row → row disappears, no error.
  - Start button disabled while < 2 committed rows or any row is rolling; enabled otherwise.
  - `initialRows` hydrates `rows` correctly on remount (Back from TurnOrder).
  - Roster chip tap fills the input but does not auto-add.

---

## 4. Shots-per-loss rule change

### 4.1 `applyGameResult` (`storage.ts`)

In [storage.ts:155](dice-app/src/game/storage.ts:155), the loser's shots increment:

```ts
// before
shotsOwed: next.players[k].shotsOwed + (participantsDisplayNames.length - 1),
// after
shotsOwed: next.players[k].shotsOwed + participantsDisplayNames.length,
```

`gamesLost` and `gamesPlayed` increment unchanged (+1 each). `lastLossAt` unchanged. `Settle Up` still zeros shots only.

### 4.2 Worked example

Bob loses a 4-player game → +1 game, +4 shots. Bob loses a 3-player game without settling → +1 game, +3 shots. Total: **2 games / 7 shots**.

### 4.3 Tests (`storage.test.ts`)

- Existing single-game test updates: 3-player game with Bob as loser → `shotsOwed = 3`, `gamesLost = 1`.
- Existing multi-game test (4-player then 3-player, both Bob): `shotsOwed = 4 + 3 = 7`, `gamesLost = 2`.
- Defaulting test for legacy roster shape (no `gamesLost`) — unchanged.

---

## 5. View Tally double-apply bug fix

### 5.1 Root cause

In [App.tsx:77](dice-app/src/App.tsx:77):

```tsx
const showResult = screen.kind === "game" && gameState.finished && !!gameState.loserId;
```

`ResultModal` is only rendered while `screen.kind === "game"`. Tapping "View Tally" sets `screen` to `"tally"`, unmounting the modal. Tapping Back from Tally returns to `"game"`, remounting the modal. The remount creates a fresh `appliedKeyRef = useRef<string | null>(null)`, the `useEffect` fires with the same `mountKey`, and `applyGameResult` runs a second time.

User's "+1/+1" report corresponds to a 2-player game where `participantsDisplayNames.length - 1 = 1`, making it look like both fields incremented by 1. With larger games it'd be `+1 game / +(N-1) shots`. After the rule change in section 4, the duplicate apply would be `+1 game / +N shots` — same root cause, scaled.

### 5.2 Fix: lift the once-only guard into reducer state

The "apply result once" responsibility moves out of the modal's lifecycle and into the reducer, which survives unmount/remount.

**`types.ts` / `reducer.ts`:**

- Add to `GameState`: `resultApplied: boolean`.
- Initialize `false` in `makeInitialState` and on `START` / `RESET`.
- New action: `{ type: "MARK_RESULT_APPLIED" }` → returns a new state with `resultApplied: true`. Idempotent (no-op when already `true`).

**`ResultModal.tsx`:**

- Remove `appliedKeyRef` and `mountKey` entirely.
- New props: `resultApplied: boolean`, `onResultApplied: () => void`.
- `useEffect` body:
  ```ts
  if (resultApplied) return;
  const loser = participants.find((p) => p.id === loserId);
  if (!loser) return;
  const next = applyGameResult(
    roster,
    participants.map((p) => p.displayName),
    loser.displayName,
  );
  applyMutation(next, `${loser.displayName} now owes a shot.`, "game-result");
  onResultApplied();
  ```
- Effect deps include `resultApplied` (and the inputs needed to compute the mutation).

**`App.tsx`:**

- Pass `resultApplied={gameState.resultApplied}` and `onResultApplied={() => dispatch({ type: "MARK_RESULT_APPLIED" })}` to `<ResultModal>`.

`RESET` and the implicit reset inside `SAME_PLAYERS_AGAIN` clear `resultApplied = false` so the next game's loss applies fresh.

### 5.3 Tests

- `reducer.test.ts`:
  - `MARK_RESULT_APPLIED` sets the flag.
  - `RESET` clears it.
  - Re-dispatching `MARK_RESULT_APPLIED` is idempotent.
- `ResultModal` integration test:
  - Render with `resultApplied=false` → `applyMutation` called exactly once.
  - Render again with `resultApplied=true` (simulating return-from-Tally remount) → `applyMutation` NOT called.

---

## 6. Stay animation — lock-in snap

### 6.1 Current behaviour

In [Die.tsx:35](dice-app/src/components/Die.tsx:35):

```ts
const animateProps = held
  ? { rotate: 0 }
  : { rotate: [0, -22, 28, -20, 16, -10, 6, 0] };
```

When `STAY` fires, `turnPhase` transitions `rolled1` → `rolled2`, which changes [Game.tsx:30](dice-app/src/components/Game.tsx:30)'s `turnKey`. Every die re-keys; any die with `held=false` re-runs the full tumble. Visually indistinguishable from Roll Again.

### 6.2 Fix

**Reducer:**

- `STAY` action sets `state.held = [true, true, true, true, true]` (the player is committing what's on the table — everything counts as held for scoring/visuals).
- Add `state.stayedThisTurn: boolean`. Set `true` in `STAY`. Cleared in `ROLL_1`, `COMMIT_TURN`, `RESET`, and `START`.

**`Die.tsx`:** new prop `stayed?: boolean`.

```ts
const animateProps =
  held && stayed
    ? { rotate: 0, scale: [1, 1.08, 1] }
    : held
      ? { rotate: 0 }
      : { rotate: [0, -22, 28, -20, 16, -10, 6, 0] };

const transition =
  held && stayed
    ? { duration: 0.4, ease: "easeOut" }
    : { duration: 1.2, ease: "easeOut" };
```

**`DiceTray.tsx`:** new optional prop `stayed?: boolean`; passes through to each `Die`.

**`Game.tsx`:** pass `stayed={state.stayedThisTurn}` into `<DiceTray>`.

### 6.3 Tests

- `reducer.test.ts`:
  - `STAY` sets all `held` true and `stayedThisTurn=true`.
  - `ROLL_1` (next turn) clears `stayedThisTurn` back to `false`.
  - `COMMIT_TURN` clears `stayedThisTurn`.
- `Die` smoke test: render with `held=true, stayed=true` and assert the snap animation props are passed (use a test that asserts on the framer-motion `animate` prop, or rely on a visual snapshot).

---

## 7. Newly-matched dice highlight on Roll 2

### 7.1 Reducer

In `ROLL_2`:

1. Snapshot `prevHeld = state.held` and `heldFace` = the common face of currently-held dice. (Well-defined for Bar Dice — holds are always one face. If `prevHeld` has zero true entries, `heldFace = null` and no dice can newly-match.)
2. Build the post-roll `dice` array (un-held positions replaced by the action's `dice` values).
3. Compute `newlyMatched: readonly [bool×5]`:
   ```ts
   newlyMatched[i] = !prevHeld[i] && heldFace !== null && newDice[i] === heldFace;
   ```
4. Set `state.held[i] = true` for every `newlyMatched[i] === true` position (they count toward the score and look held).
5. Persist `state.newlyMatched` on the state.

`newlyMatched` resets to `[false, false, false, false, false]` on `ROLL_1`, `COMMIT_TURN`, `RESET`, `START`.

### 7.2 `Die.tsx`

New prop `newlyMatched?: boolean`. When `newlyMatched && !stayed`, the existing tumble keyframe runs and a gold pulse plays on top:

```ts
animate={{
  rotate: tumbleKeyframe,
  boxShadow: [
    "0 0 0 0 rgba(245, 191, 90, 0)",
    "0 0 0 0 rgba(245, 191, 90, 0)",
    "0 0 0 6px rgba(245, 191, 90, 0.55)",
    "0 0 0 0 rgba(245, 191, 90, 0)",
  ],
}}
transition={{
  rotate: { duration: 1.2, ease: "easeOut" },
  boxShadow: { duration: 1.8, times: [0, 0.66, 0.85, 1], ease: "easeOut" },
}}
```

Originally-held dice (`held=true` going into Roll 2) do not pulse — `newlyMatched=false` for them.

### 7.3 `DiceTray.tsx` / `Game.tsx`

`DiceTray` accepts `newlyMatched?: readonly [bool×5]` and passes through per-index to each `Die`. `Game.tsx` passes `state.newlyMatched`.

### 7.4 Tests

- `reducer.test.ts`:
  - `ROLL_2` with `prevHeld=[T,T,T,F,F]`, held face 4, new dice replacing positions 3 and 4 with `[4, 2]` → `newlyMatched=[F,F,F,T,F]`, `held=[T,T,T,T,F]`.
  - `ROLL_2` with `prevHeld=[F,F,F,F,F]` (defensive — shouldn't happen in normal flow) → `newlyMatched=[F×5]`, `held` unchanged.
  - `ROLL_1` clears `newlyMatched`.
  - `COMMIT_TURN` clears `newlyMatched`.

---

## 8. Custom turn order

### 8.1 Types

**`types.ts`:**

```ts
export type TurnOrderOption =
  | "highestRoll"
  | "entryOrder"
  | "alphabetical"
  | "randomize"
  | "custom"; // new
```

`computeTurnOrder` is **not** extended — when `option === "custom"`, the consumer (`TurnOrder` component) provides the order directly, bypassing the function.

### 8.2 `TurnOrder.tsx`

**Options list:** append `{ key: "custom", label: "Custom" }`.

**New state:**

```ts
const [customOrder, setCustomOrder] = useState<string[] | null>(null);
```

**Memo handling.** `computeTurnOrder` does not have a `"custom"` case, so the `ordered` memo must avoid calling it with `option="custom"`. Refactor:

```ts
const ordered = useMemo<string[]>(() => {
  if (option === "custom") return customOrder ?? [];
  return computeTurnOrder({
    players: slots.map(...),
    option,
  });
  // reshuffleKey intentional dep for randomize re-runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [slots, option, reshuffleKey, customOrder]);
```

**Seeding in `handleOptionClick`.** Seed `customOrder` from the CURRENT displayed `ordered` at the moment the user taps Custom, BEFORE swapping option. This avoids a "blank list" flash and ensures the seed matches what was just on screen.

```ts
function handleOptionClick(opt: TurnOrderOption) {
  if (opt === "custom" && customOrder === null) {
    setCustomOrder(ordered);
  }
  if (opt === "randomize" && option === "randomize") {
    setReshuffleKey((k) => k + 1);
  } else {
    setOption(opt);
  }
}
```

Switching off `"custom"` to another option leaves `customOrder` intact. Selecting an algorithmic option does NOT re-seed `customOrder` — re-entering Custom returns the user's tweaks.

The Round 1 order section iterates over `ordered`.

**Reorder controls.** When `option === "custom"`, each row in the Round 1 section renders ▲/▼ buttons on the right:

```tsx
<button onClick={() => moveUp(i)} disabled={i === 0} aria-label={`Move ${slot.displayName} up`}>▲</button>
<button onClick={() => moveDown(i)} disabled={i === ordered.length - 1} aria-label={`Move ${slot.displayName} down`}>▼</button>
```

`moveUp(i)` swaps positions `i-1` and `i` in `customOrder`. `moveDown(i)` swaps `i` and `i+1`. Both are no-ops at the edges.

For non-custom options, the right column shows existing per-option labels (e.g., "Rolled a 5" for `highestRoll`), unchanged.

**Start button.** `onStart(ordered, option)` — passes the custom order when applicable (since `ordered` resolves to `customOrder` when option is custom).

### 8.3 `Setup.tsx`

No change required — `Setup.handleStart` already forwards `orderedIds` regardless of option.

### 8.4 `App.tsx` / reducer / `LineupSnapshot`

No reducer change — `state.turnOrder` already stores arbitrary id arrays. The Custom order rides in just like any other. `chosenOption: "custom"` flows through the existing `SetupResult` / `LineupSnapshot` path. Same-Players-Again preserves the custom order via `lineup.turnOrderIds`.

### 8.5 Tests

- `TurnOrder.test.tsx`:
  - Select Custom → arrows appear on each row, with first ▲ disabled and last ▼ disabled.
  - Tap ▼ on the first row → row order updates; first ▲ now becomes enabled on the new first row.
  - Switch to Alphabetical then back to Custom → user's tweaked order is preserved.
  - Switch from Highest Roll (initial) to Custom → `customOrder` seeds from the Highest Roll result.
  - `onStart` callback receives the tweaked order with `option === "custom"`.

---

## 9. Dismiss game-result Undo on Tally entry

### 9.1 `UndoProvider.tsx`

**State shape:**

```ts
interface UndoState {
  snapshot: Roster;
  label: string;
  expiresAt: number;
  token: number;
  source: "game-result" | "tally-action" | "other"; // new
}
```

**API:**

```ts
applyMutation: (next: Roster, label: string, source?: UndoState["source"]) => void;
dismissUndoIfSource: (source: UndoState["source"]) => void;
```

- `applyMutation` defaults `source` to `"other"`.
- `dismissUndoIfSource(source)` checks `undo?.source === source`; if so, clears the timer and `setUndo(null)`. No-op otherwise.

### 9.2 Call sites

- `ResultModal.tsx` (`useEffect`) → `applyMutation(next, label, "game-result")`.
- `Tally.tsx` `settleUp`, `removePlayer`, `clearAll` → `applyMutation(next, label, "tally-action")`.
- All other call sites: unchanged (default `"other"`).

### 9.3 `Tally.tsx`

On mount:

```ts
const { roster, applyMutation, dismissUndoIfSource } = useRoster();
useEffect(() => {
  dismissUndoIfSource("game-result");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Single-shot effect — runs once per Tally mount.

### 9.4 Tests

- `UndoProvider.test`:
  - `dismissUndoIfSource("game-result")` clears an active `"game-result"` toast.
  - `dismissUndoIfSource("game-result")` does NOT clear a `"tally-action"` toast.
  - `dismissUndoIfSource(...)` on empty state is a no-op.
- `Tally.test`:
  - Mount with active `"game-result"` undo → toast dismisses.
  - Mount with active `"tally-action"` undo → toast remains.

---

## 10. Voice / copy reference

New strings:

| Where | String |
|---|---|
| GameSettings Add button (mid-roll) | `Adding…` |
| TurnOrder Custom option label | `Custom` |

Existing voice (per memory `bar-dice-voice.md`): confident, casual, slightly cheeky.

---

## 11. Test plan & verification

- `cd dice-app; npx vitest run` — full suite green. Net new tests cover: inline-Add flow, shots-rule update, reducer `resultApplied`/`stayedThisTurn`/`newlyMatched`, Custom turn order, source-tagged Undo dismissal.
- Browser verification via `mcp__Claude_Preview__preview_start { name: "dice-app-dev" }` on port 5176:
  - Inline roll on Add — type, Add, watch the die tumble inline, row commits. Add 2-3 more, remove one. Tap Start.
  - Stay animation — play a turn, hit Roll, then Stay. Confirm dice scale-pulse rather than tumble.
  - Newly-matched highlight — hold a face on Roll 1, hit Roll Again. Re-rolled dice landing on the held face show the gold pulse.
  - Custom turn order — pick Custom, rearrange with ▲/▼, start the game, confirm Round 1 turn order matches.
  - View Tally double-apply — play to completion, tap View Tally from ResultModal, Back. Loser's GAMES/SHOTS are correct (not inflated).
  - Undo dismissal — game-result toast dismisses on entering Tally; in-Tally Settle/Remove/Clear toasts survive Back-and-return to Tally.
  - Shots scaling — 4-player loss = +4 shots; same player loses a 3-player game = +3 shots; total = 2 games / 7 shots.

---

## 12. Risks & open items

- **PlayerEntry deletion.** Confirm no test file outside of `Setup.test.tsx` directly imports `PlayerEntry`. The component and its dedicated test file go away.
- **`TurnOrder` Back-flow.** Setup → TurnOrder (custom, reordered) → Back → TurnOrder remounts and `customOrder` re-seeds from the algorithm. Acceptable for v1.2 — the user can re-tweak.
- **Roster chip behaviour.** Tapping a chip fills the input, doesn't auto-add. User still presses Add to roll, which preserves intent and avoids surprise rolls when the chip was a misfire.
- **OneDrive + git.** Same as v1.1 — workspace lives in a OneDrive-synced folder. If commits fail mid-implementation, pause OneDrive sync.
- **Single concurrent inline roll.** Add is disabled while any row is mid-roll. With ~1200 ms per roll this is briefly noticeable; the typing rhythm naturally accommodates it. Considered allowing parallel rolls and rejected — overlapping animations would clutter the screen and make it unclear which name is rolling for which die.

---

## 13. Rollout

- All changes ship as one set on `main`, tagged `v1.2` once green in browser preview.
- `v1.1` remains checkout-able for playtest comparison.
