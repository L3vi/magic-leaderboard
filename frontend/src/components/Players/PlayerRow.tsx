
import React from "react";
import { motion } from "framer-motion";
import "./PlayerRow.css";

/**
 * Player interface defines the shape of a leaderboard player.
 * @property name - Player's name.
 * @property score - Player's score.
 * @property average - Player's average score per game.
 * @property gamesPlayed - Number of games played.
 * @property mostCommonPlacement - Player's most common placement.
 * @property estimatedMinutesPlayed - Estimated total minutes played based on game gaps.
 */
export interface Player {
  name: string;
  score: number;
  average: number;
  gamesPlayed: number;
  mostCommonPlacement?: number;
  estimatedMinutesPlayed?: number;
}

/**
 * PlayerRow component for the Magic Leaderboard app.
 * - Displays a single player's stats in the leaderboard.
 * - Uses ARIA roles and semantic HTML for accessibility.
 */

interface PlayerRowProps {
  player: Player;
  onClick?: () => void;
  rank?: number;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ player, onClick, rank }) => (
  <motion.div
    layoutId={`player-${player.name}`}
    className={`player-row${rank === 1 ? ' rank-1' : rank === 2 ? ' rank-2' : rank === 3 ? ' rank-3' : ''}`}
    role="row"
    tabIndex={0}
    aria-label={`Player ${player.name}, Score ${player.score}, Average Score ${player.average.toFixed(2)}, Games ${player.gamesPlayed}`}
    onClick={onClick}
    style={onClick ? { cursor: "pointer" } : undefined}
  >
    <span className="leaderboard-col player-name" role="cell">{player.name}</span>
    <span className="leaderboard-col player-score" role="cell">{player.score}</span>
    <span className="leaderboard-col player-average" role="cell">{player.average.toFixed(1)}</span>
    <span className="leaderboard-col games-col" role="cell">{player.gamesPlayed}</span>
  </motion.div>
);

export default PlayerRow;
