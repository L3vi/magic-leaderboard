
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
- **Frontend:** React + TypeScript (bundled with Parcel)
- **Backend:** Express + TypeScript
- **Database:** SQLite

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
    public/
      index.html
      logo.svg
    src/
      App.tsx
      index.tsx
    package.json
    tsconfig.json
  README.md
```

## Setup

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```
Parcel will auto-open the app in your browser.

## Development Guidelines
- Use feature branches for new features.
- Keep code modular and organized.
- Write tests for new features.
- Refactor for maintainability.

---

This project is designed for simplicity, clarity, and scalability. Feel free to add features and keep the codebase clean!
