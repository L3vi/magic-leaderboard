
import React from "react";
import { motion } from "framer-motion";
import type { PlayerRowDisplay as Player } from "../../types";
import "./PlayerRow.css";
import { useShrinkToFit } from "../../hooks/useShrinkToFit";

// Re-export so consumers can `import { Player } from "./PlayerRow"`.
export type { PlayerRowDisplay as Player } from "../../types";

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

const PlayerRow: React.FC<PlayerRowProps> = ({ player, onClick, rank }) => {
  const nameRef = useShrinkToFit<HTMLSpanElement>(player.name);
  return (
    <motion.div
      layoutId={`player-${player.name}`}
      className={`player-row${rank === 1 ? ' rank-1' : rank === 2 ? ' rank-2' : rank === 3 ? ' rank-3' : ''}`}
      role="row"
      tabIndex={0}
      aria-label={`Player ${player.name}, Weighted Average ${player.weightedAverage !== undefined ? player.weightedAverage.toFixed(2) : "none"}, Average Score ${player.average.toFixed(2)}, Score ${player.score}, Games ${player.gamesPlayed}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <span className="leaderboard-col player-name" role="cell" ref={nameRef}>{player.name}</span>
      <span className="leaderboard-col weighted-avg-col" role="cell">{player.weightedAverage !== undefined ? player.weightedAverage.toFixed(2) : "—"}</span>
      <span className="leaderboard-col player-average" role="cell">{player.average.toFixed(2)}</span>
      <span className="leaderboard-col player-score" role="cell">{player.score}</span>
      <span className="leaderboard-col games-col" role="cell">{player.gamesPlayed}</span>
    </motion.div>
  );
};

export default PlayerRow;
