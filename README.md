
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

## Development Guidelines
- Use feature branches for new features.
- Keep code modular and organized.
- Write tests for new features.
- Refactor for maintainability.

---

This project is designed for simplicity, clarity, and scalability. Feel free to add features and keep the codebase clean!
