import React from "react";
import { motion } from "framer-motion";
import PartnerCommanderDisplay from "../PartnerCommanderDisplay/PartnerCommanderDisplay";
import "./GameRow.css";

interface Player {
  playerId: string;
  name: string;
  placement: number;
  commander: string | string[];
}

interface GameRowProps {
  id: string;
  dateCreated: string;
  notes: string;
  players: Player[];
  winner?: Player;
  onClick?: () => void;
  active?: boolean;
}

const GameRow: React.FC<GameRowProps> = ({
  id,
  dateCreated,
  notes,
  players,
  winner,
  onClick,
}) => {
  return (
    <motion.div
      layoutId={`game-${id}`}
      className="game-row"
      tabIndex={0}
      aria-label={`Game on ${new Date(dateCreated).toLocaleDateString()}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <span className="game-row-date">
        {new Date(dateCreated).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </span>

      <div className="game-row-players">
        {players.map((p, idx) => {
          const commanders = Array.isArray(p.commander) ? p.commander : [p.commander];
          const isWinner = winner && p.name === winner.name;
          const key = JSON.stringify(p.commander) + idx;
          
          const playerDetails = (
            <div className="game-row-player-details">
              <div
                key={p.name + idx}
                style={
                  isWinner ? { color: "var(--accent)", fontWeight: 700 } : {}
                }
              >
                {p.name}
              </div>
            </div>
          );
          
          return (
            <div key={p.name + "-container-" + idx} className="game-row-player">
              <PartnerCommanderDisplay
                commanders={commanders}
                responsive={true}
                playerCount={players.length}
                isWinner={isWinner}
                playerId={p.playerId}
              />
              {playerDetails}
            </div>
          );
        })}      </div>
    </motion.div>
  );
};

export default GameRow;
