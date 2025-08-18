# Magic: The Gathering Commander Leaderboard

A small web application to track Magic: The Gathering Commander games for a friend tournament.

## Core Features
- **Leaderboard:** Shows current player rankings based on scores.
- **Game Creation:** Log a new game and enter results.
- **Player Management:** Add new players.
- **Score Tracking:** Track scores per player for each game.
- **Game History:** Keep a record of past games.

## Future/Advanced Features
- Multiple scoresheets by date/year.
- Detailed game histories per player.
- Integration with external data (like commanders).
- Analytics/graphs showing player performance over time.
- Timestamped game start/end for accuracy.

## Tech Stack
- **Frontend:** React + TypeScript
- **Backend:** Express + TypeScript
- **Database:** SQLite (easy to migrate later)
- **Bundler:** Parcel (frontend)

## Project Structure
```
magic-leaderboard/
  backend/
    src/
      controllers/
      models/
      routes/
      app.ts
    package.json
    tsconfig.json
  frontend/
    src/
      components/
      pages/
      App.tsx
      index.tsx
    package.json
    tsconfig.json
  README.md
```

## Setup

### Backend
1. `cd backend`
2. `npm install`
3. `npm run dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run start`

## Incremental Development
- Add features one at a time, using feature branches.
- Keep code modular and organized.
- Write tests for new features.
- Refactor as needed for maintainability.

---

This project is designed for simplicity, clarity, and scalability. Add features as needed and keep the codebase clean!
