# MTG Commander Score Tracker

This project is a simple web application designed to track scores for Magic: The Gathering Commander games. It allows users to input the placement of players in each game and automatically updates their scores based on their performance.

## Features

- Track scores for up to 8 players.
- Input player placements (1st, 2nd, 3rd, 4th) and automatically calculate points.
- Points distribution:
  - 1st place: 4 points
  - 2nd place: 3 points
  - 3rd place: 2 points
  - 4th place: 1 point
- Scores are saved in a JSON file for persistence.

## Project Structure

```
mtg-commander-score-tracker
├── public
│   └── index.html        # Main HTML file
├── src
│   ├── App.js            # Main application logic
│   ├── components
│   │   └── ScoreBoard.js  # Component for displaying scores
│   └── data
│       └── scores.json    # JSON file for storing scores
├── package.json           # NPM configuration file
└── README.md              # Project documentation
```

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mtg-commander-score-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the application:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000` to access the score tracker.

## Usage

- Use the UI to select the placement of each player after a game.
- The scores will be updated automatically based on the placements selected.
- The scores are saved in `src/data/scores.json` and will persist across sessions.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the project.