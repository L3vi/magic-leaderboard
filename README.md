
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
- **Backend:** Express + TypeScript
- **Database:** JSON files (migrating to SQLite)

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

**⚠️ Important**: Both branches deploy to the same GitHub Pages URL, so pushing either overwrites what's currently live. The most recent push determines what's publicly visible.

## Development Guidelines
- Use feature branches for new features.
- Keep code modular and organized.
- Write tests for new features.
- Refactor for maintainability.

---

This project is designed for simplicity, clarity, and scalability. Feel free to add features and keep the codebase clean!
