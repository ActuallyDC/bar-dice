# Session Handoff — Bar Dice — 2026-05-10

## 1. Project DNA
A pass-and-play web app for the bar-dice game (loser buys a round), played on a single phone passed between 2+ players. Single-page React build, no backend, mobile-first dark aesthetic, lives in `dice-app/` under the workspace root.

## 2. The 'Done' List
- Full game flow built end-to-end: Setup → PlayerEntry → TurnOrder → Game → RoundSummary → Finale → ResultModal.
- Pure scoring engine in `dice-app/src/game/score.ts` (wild 1s, ranked hands, `describeScore` returns "Four Fives (45)" form).
- Pure reducer in `dice-app/src/game/reducer.ts` covering elim/finale contexts, single-roll roll-offs, 2-player→finale shortcut.
- Easy-mode `easyHold` algorithm; both Easy and Advanced share the same Roll → (Stay | Roll Again) → End Turn flow.
- Tally + undo system: `UndoProvider` / `UndoToast`, single-toast replacement, 5-second timeout, snapshot/restore via localStorage.
- Persistence: versioned schemas `dice.tally.v1` and `dice.prefs.v1` with corruption fallbacks.
- Animation tuning: SetupDie and in-game Die both at 1200ms with longer rotation arcs; PlayerEntry has a 3-sec hold with visible 1-sec-tick countdown.
- Copy/voice pass: "Bar Dice", "Pass-and-play. Loser buys a round.", conditional Easy/Advanced mode tips, "Roll to Enter", "Tiebreaker! One Roll Each", "Got a {N}!", "Order Of Entry (Whoever typed first)", "Rolled a N".
- Current Leader badge during rounds — green badge + `text-bar-good` score for the highest committed score in `state.poolResults` (ties highlight all tied).
- 63 vitest tests passing across 5 files (last verified green).
- Three memory files written: `bar-dice-project.md`, `bar-dice-voice.md`, `bar-dice-launch.md`, plus index `MEMORY.md`.
- `.claude/launch.json` wired at workspace root with `cwd: "dice-app"`, name `dice-app-dev`, port 5176.

## 3. Current State
**Active file:** none — code is in a stable, tested state. Most-recently-read file this session was `dice-app/src/game/reducer.ts` (read for context, not edited).
**Recent changes:** none in this session. The last functional changes from the prior session were:
- `dice-app/src/game/reducer.ts` — 2-player START routes directly to `finale` context; STAY no longer mode-gated.
- `dice-app/src/components/Scoreboard.tsx` — Current Leader detection via `compareScores` over `poolOrder`/`poolResults`.
- `dice-app/src/components/Die.tsx` and `SetupDie.tsx` — animation duration 1.2s.
- `dice-app/src/components/PlayerEntry.tsx` — "Roll to Enter" label, 3-sec countdown, phase-based labels.

**Active bugs / broken states:** None.

**Pending design idea (not yet implemented):** drop the "Number of players" input on the Setup entry menu in favor of a name-only entry list — once at least 2 names are entered a "Start" button at the bottom becomes enabled, and additional names can still be added after that. Not started; user wants to play-test the current build first.

**Pending real-world test:** user is taking the build to a bar to play with friends before deciding which copy/UX tweaks to make next. Watch for feedback on the 3-sec countdown pace, "Tiebreaker!" prompt clarity, "Current leader" visibility in low light, and any reach for an undo/back affordance.

## 4. Decision Log
- **No git repo for this project** — User has not initialized one; all history lives in chat + memory files. Rejected silent `git init` because the user hasn't asked and a fresh repo without a baseline commit would be noise. Future session: ask before initializing.
- **2-player games skip elimination, route straight to Best of 3 finale** — Rejected the spec's elim-then-finale flow because with 2 players one elim round leaves a single player with no opponent for a finale. Implemented in `reducer.ts` START handler.
- **Roll-offs are single-roll, not 2-roll** — Rejected the spec's full 2-roll tiebreaker flow because the user found it too slow for what is effectively sudden death. Applies to elim and finale roll-offs identically.
- **Easy mode keeps the Stay/Roll-Again choice; only the *holding* decision is automated** — Rejected auto-firing Roll 2 in Easy mode. The user wanted Easy players to retain agency over whether to take roll 2; "Easy" means we make the holding decision, not the whether-to-reroll decision.
- **Score display includes a numeric code (e.g. "Four Fives (45)")** — Rejected pure prose form because bar players verbally call hands as numbers ("forty-five!"); the code mirrors how players actually say it.
- **launch.json sits at workspace root, not inside `dice-app/`** — Rejected nesting it under `dice-app/` because the Preview tool searches from the parent of CWD; the root location uses `cwd: "dice-app"` to still run `npm run dev` from the right place. Documented in `bar-dice-launch.md` to prevent re-creation in the wrong spot.

## 5. Immediate Next Step
Paste this into the new session:

> I just play-tested Bar Dice with friends. Before applying their feedback, I want to redesign the Setup entry screen. Open `dice-app/src/components/Setup.tsx` and `dice-app/src/components/GameSettings.tsx` and remove the "Number of players" input entirely. Replace it with an open-ended name-entry list: every time a player submits a name, append a new empty slot. Once at least 2 names have been entered, enable a "Start" button at the bottom of the screen — but keep allowing additional names to be added until Start is pressed. Match the existing Bar Dice voice (confident, casual, slightly cheeky, no instructional fluff). Update reducer/turnOrder code only if the dynamic player count breaks an assumption. Add or update vitest coverage and confirm the full suite stays green (`cd dice-app && npx vitest run`, currently 63 tests). Then verify in the preview (`mcp__Claude_Preview__preview_start { name: "dice-app-dev" }`, port 5176).
