# Frontend

React + TypeScript client for Magic Leaderboard.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start app:
   ```bash
   npm run dev
   ```

## Data Management

The frontend automatically syncs data files from `../backend/data/` before starting development or building. The synced files (`src/data/*.json`) are git-ignored since the backend is the source of truth.
