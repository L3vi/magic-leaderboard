
# Magic Leaderboard

A web app to track Magic: The Gathering Commander games and player rankings for casual tournaments.

## Features
- **Leaderboard:** View current player rankings.
- **Game Logging:** Record new games and results.
- **Player Management:** Add and manage players.
- **Score Tracking:** Track scores per player and game.
- **Game History:** Browse past games.

## Planned Features
- Multiple scoresheets by date/year.
- Detailed player histories.
- Commander data integration.
- Performance analytics and graphs.
- Timestamped games.

## Tech Stack
- **Frontend:** React + TypeScript (bundled with Vite)
- **Backend:** Express + TypeScript (local API + backup/restore scripts)
- **Database:** Firebase Firestore (live). The browser reads and writes Firestore
  directly using anonymous auth; `firestore.rules` validates document shape but
  cannot prevent a determined visitor from deleting data.
- **Data archives:** `archived-data/*.json` are backups and the offline fallback
  bundle, not the live database. See [DATA-SYNC.md](DATA-SYNC.md).

### Firestore collections
| Collection | Contents |
|---|---|
| `players` | Global player docs (shared by both leaderboard styles) |
| `sessions` | Commander seasons; games live in the `games` subcollection |
| `cube-events` | Draft/cube data, used by the `draft-variant` branch only |

Commander scoring is 1st=4, 2nd=3, 3rd=2, 4th+=1
(`frontend/src/services/dataService.ts`). Player game counts are commander-only.

The season (a.k.a. "season selector") is chosen in the header and **persisted to
`localStorage`** under `magicLeaderboard_activeSession`; a fresh load with no
stored value falls back to the newest season by `createdAt`
(`frontend/src/context/SessionContext.tsx`).

## Project Structure
```
magic-leaderboard/
  ├── package.json          # Root convenience scripts
  ├── backend/
  │   ├── src/api/          # API endpoints
  │   ├── data/             # JSON data files (source of truth)
  │   ├── package.json
  │   └── tsconfig.json
  ├── frontend/
  │   ├── src/
  │   │   ├── components/   # React components
  │   │   └── data/        # Synced from backend (git-ignored)
  │   ├── package.json
  │   └── tsconfig.json
  └── README.md
```

## Setup

### Quick Start (Recommended)
```bash
# Install all dependencies
npm install

# Start both frontend and backend
npm run dev
```

### Individual Setup
```bash
# Backend only
cd backend && npm install && npm run dev

# Frontend only  
cd frontend && npm install && npm run dev
```

## Deployment

This project uses GitHub Actions to automatically deploy to GitHub Pages.

### How It Works
- Each branch has its own `.github/workflows/deploy.yml` workflow file
- When you push to a branch, GitHub reads that branch's workflow file
- If the workflow's trigger branch matches the branch you pushed to, it deploys
- **All branches deploy to the same GitHub Pages URL** (last push wins)

### Current Setup
- **main**: Production — the Commander leaderboard. Deploys when `main` is pushed.
- **draft-variant**: The Cube Draft variant. Deploys when `draft-variant` is pushed.
- **gh-pages**: Build output, published by the workflow. Never edit by hand.
- **combined-formats**: Local-only, never pushed, paused experiment — see
  [docs/combined-formats-experiment.md](docs/combined-formats-experiment.md).

Both workflows build on Node 22 via `actions/setup-node@v6` and publish
`frontend/dist` with `peaceiris/actions-gh-pages@v4`.

**⚠️ Important**: Both branches deploy to the same GitHub Pages URL, so pushing either overwrites what's currently live. The most recent push determines what's publicly visible.

## Development Guidelines
- Use feature branches for new features.
- Keep code modular and organized.
- Write tests for new features.
- Refactor for maintainability.

---

This project is designed for simplicity, clarity, and scalability. Feel free to add features and keep the codebase clean!
