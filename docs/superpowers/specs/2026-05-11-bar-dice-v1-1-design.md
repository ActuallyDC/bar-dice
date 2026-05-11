# Bar Dice v1.1 — Design Spec

**Date:** 2026-05-11
**Baseline:** git tag `v1.0` (commit `1466cc6`)
**Scope:** Apply post-playtest feedback. UI-level redesigns + targeted reducer/storage adjustments. Keep `GameMode` values and existing turn-order/round flow intact.

---

## 1. Scope

In scope for v1.1:

1. **Setup screen redesign** — replace player-count input with an open-ended name-entry list.
2. **Mode label rename** — "Easy" → "Auto", "Advanced" → "Manual" (UI labels only).
3. **Turn-order option label** — "Order Of Entry (Whoever typed first)" → "Order of Entry / Whoever typed first".
4. **"Loser" text size bump** — moderate, both in the Scoreboard badge and in the ResultModal headline.
5. **WL tracker chronological fix** — finale series renders in actual game order.
6. **Tiebreaker order preservation** — elim + finale tiebreakers re-roll in entry order.
7. **Undo countdown** — live ticking number on the toast.
8. **Tally redesign** — two-column **Games** / **Shots** layout; shots-per-loss scales with player count.

Out of scope:

- Roll-off mechanics (still single-roll per the v1.0 drift).
- Turn order algorithms.
- Scoring rules / `compareScores` / `describeScore`.
- Visual / colour tokens beyond the size bumps listed above.

---

## 2. Step 0 — Versioning (already complete)

- `git init` in workspace root.
- Commit current tree as v1.0 baseline.
- Tag `v1.0`.

v1.1 work proceeds on `main` from that tag.

---

## 3. Setup screen redesign

### 3.1 `GameSettings.tsx`

**Remove:**
- `countText` input, `parseCount`, count validation messaging ("Enter a number, 2 or more", "Think about the tab though…").
- The `onCountTextChange` and `countText` props.

**Add:**
- A controlled text input + "Add" button.
  - Placeholder: **"Who's in?"**
  - "Add" disabled when input is empty/whitespace or duplicates a name already in the list (case-insensitive compare on trimmed value).
  - Pressing Enter in the input behaves like Add.
- A list rendering the entered names in entry order. Each row:
  - Name on the left.
  - A small "✕" tap target on the right that removes the row.
- Footer button label changes from "Next" to **"Start"**, disabled while fewer than 2 names exist.
- Helper text shown below the list while disabled: **"Need at least 2."**
- Mode toggle stays exactly where it was (label string update happens in `ModeToggle.tsx`, not here).
- "View Tally" link stays.

**Props (new shape):**

```ts
interface Props {
  names: string[];
  onNamesChange: (names: string[]) => void;
  mode: GameMode;
  onModeChange: (m: GameMode) => void;
  onStart: (names: string[]) => void;
  onViewTally: () => void;
  onRestart?: () => void;
}
```

`parseCount` (and its tests) is deleted.

### 3.2 `Setup.tsx`

- Replace `countText` / `playerCount` state with `names: string[]`.
- `Step` type stays `"settings" | "entry" | "order"`.
- `handleStartFromSettings(names: string[])` initialises an empty `slots: PlayerSlot[]` of length `names.length`, sets `currentSlot = 0`, advances to `"entry"`.
- Post-Start flow is unchanged. PlayerEntry is shown per slot, indexing into `names` for the pre-filled name.
- `handleEntryBack` from slot 0 returns to settings; the entered names are preserved (do not clear).
- `performRestart` clears `names` along with everything else.

### 3.3 `PlayerEntry.tsx`

- Add prop `prefilledName?: string`.
- When `prefilledName` is provided:
  - Skip the name-input phase entirely.
  - Render the prefilled name as the slot heading.
  - The "Roll to Enter" button is the initial interactive control.
  - All other timing (1200 ms tumble, 3-second hold, countdown copy) is unchanged.
- When `prefilledName` is **not** provided, behaviour is unchanged (defensive — keeps the existing API for any tests that exercise the old flow until they are migrated).
- The slot's `displayName` written into the `PlayerSlot` is the `prefilledName` verbatim (no re-trim — names were already trimmed before insertion).

---

## 4. Mode label rename ("Easy" / "Advanced" → "Auto" / "Manual")

UI-only. **`GameMode` type values stay as `"easy"` and `"advanced"`** in code, types, persisted roster, and tests.

Touch sites:

- `ModeToggle.tsx` — change the two displayed labels ("Easy" → "Auto", "Advanced" → "Manual").
- `Game.tsx` "Mode: Easy" / "Mode: Advanced" header pill (visible in the playtest screenshot) — display the mapped label. Implement a tiny helper, e.g. `modeLabel(mode: GameMode): "Auto" | "Manual"`, and route both `ModeToggle` and the header pill through it so a future rename happens in one place.
- `GameSettings.tsx` mode tip lines — keep the verbatim copy already in memory ("We make the optimal decisions for you." / "You know how this rolls.") — those don't reference "Easy"/"Advanced" by name.
- Grep the rest of the codebase for the literal strings `"Easy"` and `"Advanced"` and update any other display site found. Test-only references (asserting on `"easy"` / `"advanced"` mode values) are untouched.

Tests around mode behaviour are unaffected because the internal values do not change.

---

## 5. Turn-order option label (`TurnOrder.tsx`)

Single string change:

- `"Order Of Entry (Whoever typed first)"` → `"Order of Entry / Whoever typed first"`.

No behaviour change.

---

## 6. "Loser" text size bump

### 6.1 Scoreboard badge

In `Scoreboard.tsx` `Badge`, the "Loser" pill currently shares `text-[11px] font-semibold` with all status badges. Bump the "Loser" label only:

- `text-[11px]` → `text-sm` when `label === "Loser"`.
- Other badges (Safe, Current leader, Winner, finale series) stay at the existing size.

Implementation: gate via a label check inside `Badge` — keeps the call sites quiet.

### 6.2 ResultModal "Loser" pre-headline label

In `ResultModal.tsx` line 57–59, the small uppercase "Loser" label sits above the big loser-name headline:

```tsx
<p className="uppercase tracking-[0.3em] text-bar-amber text-xs">Loser</p>
```

- `text-xs` → `text-sm`. Keep `uppercase tracking-[0.3em] text-bar-amber`.
- The big `text-5xl` loser-name headline below is **not** changed (it's already huge).

---

## 7. WL tracker chronological fix

### 7.1 Bug

`renderFinaleSeries(wins, losses)` in `Scoreboard.tsx` builds the badge by pushing all `W`s first, then all `L`s. Chronological order is destroyed: "Won g1, lost g2" and "Lost g1, won g2" both render as `W L _`.

### 7.2 Fix

Introduce a new reducer state field on `GameState`:

```ts
finaleGameLog: string[]; // ordered winnerIds, one per completed finale game
```

- Appended to once per finale game outcome — wherever `finaleLosses` is incremented today.
- Cleared on Same-Players-Again / new-game resets, mirroring `finaleLosses`.
- Initialised to `[]` at game start and at finale entry.

`renderFinaleSeries` is rewritten to take `(playerId, log)`:

```ts
function renderFinaleSeries(playerId: string, log: string[]): string {
  const slots = log.map((winnerId) => (winnerId === playerId ? "W" : "L"));
  while (slots.length < 3) slots.push("_");
  return slots.slice(0, 3).join(" ");
}
```

`finaleLosses` is retained — it's used to detect the series outcome (Winner/Loser/series score). The log is additive.

### 7.3 Tests

- Reducer test: simulate finale sequence Win→Loss→Win for a specific player, assert `finaleGameLog` matches `[A, B, A]` (or equivalent), and `finaleLosses` still computes correctly.
- Scoreboard render test (or unit test on `renderFinaleSeries`): given `(playerId="P2", log=["P3","P2","P3"])`, output is `"L W L"`.

---

## 8. Tiebreaker order preservation

Both **elim tiebreaker** (multiple tied losers re-rolling) and **finale tiebreaker** (2 finalists re-rolling) must preserve the original entry order when listing participants for re-roll.

### 8.1 Implementation

- Locate the reducer cases that initialise a tiebreaker `poolOrder` (or equivalent participant list).
- Replace whatever order is used today with: `participants.sort((a, b) => playerById(a).entryIndex - playerById(b).entryIndex)`.
- `entryIndex` is already on `PlayerSlot` (per `Scoreboard.tsx`).

### 8.2 Tests

- Reducer test (elim tiebreaker): players A, B, C, D with entryIndex 0..3. Tied losers are C and A (in that registration order in the tied set). Assert that after `START_TIEBREAKER` (or whichever action), the participants roll in order A, then C.
- Reducer test (finale tiebreaker): same shape, two-finalist case.

---

## 9. Undo countdown — real-time tick

Today the "(5s)" suffix is baked into the label string callers pass to `applyMutation` (e.g. `` `${loser.displayName} now owes a shot. Undo (5s)` ``). The toast renders that label verbatim alongside a separate "Undo" button. The 5-second auto-dismiss lives in `UndoProvider` via `setTimeout` against `UNDO_TIMEOUT_MS`.

### 9.1 Implementation

- **Callers**: strip the trailing `" Undo (5s)"` from every label string passed to `applyMutation`. Affected sites (grep `Undo (5s)`):
  - `ResultModal.tsx` line 39 — `` `${loser.displayName} now owes a shot.` ``
  - `Tally.tsx` `settleUp` — `` `Settled ${p.displayName}'s tab.` ``
  - `Tally.tsx` `removePlayer` — `` `Removed ${p.displayName}.` ``
  - `Tally.tsx` `clearAll` — `` `Cleared all tabs.` ``
- **`UndoProvider`**: pass `expiresAt` (already in `UndoState`) down to `UndoToast` as a new prop. Keep the existing `setTimeout` auto-dismiss in the provider — it stays the single source of truth for dismissal. The toast just *displays* the live count.
- **`UndoToast`**: add `expiresAt?: number` prop. When `visible`, compute `secondsRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))`. Drive re-renders with a 250 ms `setInterval` (gives smooth-feeling ticks without a per-second misalignment risk; UI shows whole seconds). Render to the left of the Undo button as `(Ns)` in a slightly muted style; e.g.:

```tsx
<span className="text-bar-mute text-xs font-mono tabular-nums" aria-hidden="true">
  ({secondsRemaining}s)
</span>
```

- Clean up the interval on unmount and when `visible` flips to false.
- The "Undo" button text is unchanged.

### 9.2 Tests

- `UndoToast` test with `vi.useFakeTimers()`: render with `expiresAt = Date.now() + 5000` → assert "(5s)" visible → advance 1000 ms → "(4s)" → repeat to "(1s)" → advance another 1000 ms → "(0s)" (or toast unmounted, depending on provider behaviour).
- `UndoProvider` integration test: assert callers' label strings no longer include "Undo (5s)" suffix (regression guard against accidental re-introduction).

---

## 10. Tally — Games + Shots two-column layout

### 10.1 Roster shape (`types.ts`, `storage.ts`)

Add field:

```ts
interface RosterPlayer {
  // existing
  shotsOwed: number;
  gamesPlayed: number;
  // new
  gamesLost: number;
}
```

Storage validator (`storage.ts`): when reading from localStorage, default `gamesLost` to `0` if the stored shape predates this field. **Bump the storage version** if there's a version constant; otherwise rely on the defensive default-on-read.

### 10.2 `applyCompletedGame(roster, playerNames, loserName)` (`storage.ts`)

Change shots accounting:

- For every player in `playerNames`: `gamesPlayed + 1` (unchanged).
- For the loser specifically: `gamesLost + 1` (new), and `shotsOwed + (playerNames.length - 1)` (was `+ 1`).

Edge: if `playerNames.length < 2` we shouldn't be applying a completed game at all — keep current behaviour, no special-case here.

### 10.3 `Tally.tsx`

- The per-player card replaces the "N games played" subtitle with a two-column stat block:
  - Left column: label **"Games"**, value `gamesLost`.
  - Right column: label **"Shots"**, value `shotsOwed`.
  - Use the existing badge / pill styling so the visual weight is consistent with the rest of the screen.
- Sort order unchanged: by `shotsOwed` desc, then alphabetical.
- The standalone "shots owed" pill at the top of each row is removed — the right-column "Shots" stat replaces it. (Avoids duplication.)
- "Settle Up" button still zeros `shotsOwed`. It does **not** touch `gamesLost`. (You owe what you owe — the historical loss count is a separate record.)
- "Clear All Tallies" same: zeros every player's `shotsOwed` only.
- "Remove" still wipes the player.
- `ResultModal.tsx` reads `shotsOwed` from the roster — that read is still correct (the modal shows the post-game total).

### 10.4 Tests

- `storage.test.ts`:
  - Update existing "bumps gamesPlayed for everyone and shotsOwed+lastLossAt for the loser" — assert `gamesLost` for the loser increments, and `shotsOwed` increases by `(playerNames.length - 1)`.
  - Add a multi-game case: loser in a 4-player game (+3 shots, +1 games-lost), then in a 3-player game (+2 shots, +1 games-lost). Final state: shotsOwed = 5, gamesLost = 2.
  - Defaulting test: read an old-shape roster missing `gamesLost`, assert it loads with `gamesLost = 0`.

---

## 11. Voice / copy reference

New strings introduced by this spec:

| Where | String |
|---|---|
| GameSettings name input placeholder | `Who's in?` |
| GameSettings Add button | `Add` |
| GameSettings hint (when <2 names) | `Need at least 2.` |
| GameSettings footer button | `Start` |
| Tally Games column label | `Games` |
| Tally Shots column label | `Shots` |
| TurnOrder Order-of-Entry option | `Order of Entry / Whoever typed first` |
| ModeToggle labels | `Auto` / `Manual` |

Existing voice (per memory `bar-dice-voice.md`): confident, casual, slightly cheeky, no instructional fluff. Strings above conform.

---

## 12. Test plan & verification

- `cd dice-app && npx vitest run` — full suite must stay green. Today: 63 tests; after deletions and additions a different absolute number is expected — what matters is no regressions and new tests cover the new behaviour.
- Coverage delta:
  - Removed: `parseCount` tests.
  - Added: Setup name list (add/remove/dedupe/start-gate), finale game log ordering, tiebreaker entry-order, undo tick, shots scaling, gamesLost increment, roster defaulting.
- Browser verification via `mcp__Claude_Preview__preview_start { name: "dice-app-dev" }` on port 5176:
  - Walk through the new Setup screen (add 3 names, remove 1, add 2 more, Start).
  - Play a finale with mixed W/L order; eyeball the WL badges render chronologically.
  - Trigger an Undo and watch the toast tick.
  - Open the Tally and confirm Games + Shots columns are populated correctly across 2+ games with differing player counts.

---

## 13. Risks & open items

- **OneDrive + git**: the workspace lives in a OneDrive-synced folder. Local git operations work but `.git` syncing can occasionally cause lock contention. If commits fail mid-implementation, pause OneDrive sync momentarily.
- **PlayerEntry compatibility**: adding `prefilledName?: string` as optional keeps the old API alive. Once Setup always passes it, the old name-input branch becomes dead code — leave it for v1.1 unless a test still exercises it; remove in a follow-up if it's clearly unused.
- **Mode toggle layout**: "Auto" and "Manual" are similar length to "Easy" and "Advanced", so no layout reflow expected — but verify in preview.
- **Storage versioning**: there is no explicit version constant in `storage.ts` today. Defaulting `gamesLost` to 0 on read is the safer path; bumping introduces migration code we don't need.

---

## 14. Rollout

- All changes ship as one set on `main`, tagged `v1.1` once green in browser preview.
- `v1.0` tag remains checkout-able for playtest comparison.
