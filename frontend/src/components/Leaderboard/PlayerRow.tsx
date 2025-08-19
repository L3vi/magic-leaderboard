
import React from "react";

/**
 * Player interface defines the shape of a leaderboard player.
 * @property name - Player's name.
 * @property score - Player's score.
 * @property average - Player's average placement.
 * @property gamesPlayed - Number of games played.
 */
export interface Player {
  name: string;
  score: number;
  average: number;
  gamesPlayed: number;
}

/**
 * PlayerRow component for the Magic Leaderboard app.
 * - Displays a single player's stats in the leaderboard.
 * - Uses ARIA roles and semantic HTML for accessibility.
 */
const PlayerRow: React.FC<{ player: Player }> = ({ player }) => (
  <div className="player-row" role="row" tabIndex={0} aria-label={`Player ${player.name}, Score ${player.score}, Avg Place ${player.average.toFixed(2)}, Games ${player.gamesPlayed}`}>
    <span className="player-name" role="cell">{player.name}</span>
    <span className="player-score" role="cell">{player.score}</span>
    <span className="player-average" role="cell">{player.average.toFixed(2)}</span>
    <span className="player-games" role="cell">{player.gamesPlayed}</span>
  </div>
);

export default PlayerRow;
