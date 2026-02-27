import React from "react";
import { getMatchWinner } from "../../utils/standings";
import type { Match, Player } from "../../types";
import "./MatchRow.css";

interface MatchRowProps {
  match: Match;
  playerLookup: Record<string, Player>;
  onClick?: () => void;
}

const MatchRow: React.FC<MatchRowProps> = ({ match, playerLookup, onClick }) => {
  const [p1, p2] = match.players;
  const winnerId = getMatchWinner(match);
  const isDraw = !winnerId;

  const p1Name = playerLookup[p1.playerId]?.name || p1.playerId;
  const p2Name = playerLookup[p2.playerId]?.name || p2.playerId;

  // Winner goes on left
  let leftName: string, rightName: string, leftWins: number, rightWins: number;
  if (winnerId === p2.playerId) {
    leftName = p2Name;
    rightName = p1Name;
    leftWins = p2.wins;
    rightWins = p1.wins;
  } else {
    leftName = p1Name;
    rightName = p2Name;
    leftWins = p1.wins;
    rightWins = p2.wins;
  }

  return (
    <div
      className="match-row-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <span className={`match-row-name${!isDraw && winnerId ? " winner" : ""}`}>
        {leftName}
      </span>
      <span className="match-row-score">{leftWins} - {rightWins}</span>
      <span className="match-row-name">{rightName}</span>
    </div>
  );
};

export default MatchRow;
