# Experiment: `combined-formats` (paused)

A local-only prototype that fuses the commander leaderboard and the cube/draft
app into a single "event" that *is* the home leaderboard.

**Status:** paused since 2026-06-10. Branch exists **locally only and has never
been pushed** (`git branch -r --contains combined-formats` returns nothing).

## What it does

- Bottom nav: `Standings · Games · Drafts`, plus a "+" FAB with three create
  options (commander game / new draft / record match). `Header` gained a
  `hideNav` prop.
- **Hybrid standings:** one row per player blending their commander finish with
  their draft finish, combined by a finish-place points curve
  `[10, 8, 6, 5, 4, 3, 2, 1]` (this was model #2; the native per-format view is
  also still shown as model #1).
- Reads the active commander session plus the single `cube-events` doc as a demo.
- Create flows and draft-finishing are **stubs** (they fire a toast).

New files: `frontend/src/pages/CombinedEventPage.tsx` (+ css),
`frontend/src/services/combinedEventService.ts`,
`frontend/src/utils/combinedStandings.ts`.

## Before you resume: it has diverged badly

The branch is 3 commits on top of the **2026-06-10** state of `main`. `main` has
since moved **109 commits** ahead of that merge base (the June 11–15 stats,
commander-art and scroll work). A plain `git diff main..combined-formats` shows
~100 files and ~7,800 deletions — that is almost entirely `main`'s newer work
missing from the branch, not deliberate deletions.

Resuming realistically means re-prototyping the idea on current `main` rather
than rebasing 3 commits over 109.

## Running it as-is

```bash
git checkout combined-formats
cd frontend
set -a; . ./.env; set +a && npx vite --port 5174   # hits real Firebase
```

## Intended next steps (from when it was paused)

1. Wire up the create flows.
2. Design a real unified `event` document model (rather than reading a commander
   session and a cube event side by side).
3. Player drill-in on the hybrid standings row.

## Cross-format counting note

Player game counts are commander-only by decision (2026-06-10); cross-format
counting was deferred to this merge. For reference when it happens: a cube
`match` is a 2-player best-of-3 with no rounds array, but each player has a
`wins` field, so games-in-a-match = the sum of both players' `wins`
(= 81 games across 36 matches; both players are credited all games whether they
won or not). The commander and cube player pools overlap only on `player-levi`.
