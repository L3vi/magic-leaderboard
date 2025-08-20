import React from "react";
import { Player } from "../Leaderboard/PlayerRow";
import "./PlayerDetails.css";

interface PlayerDetailsProps {
  player: Player;
}

const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player }) => {
  return (
    <div className="player-details">
      <h2 className="player-details-name">{player.name}</h2>
      <ul className="player-details-stats">
        <li><strong>Score:</strong> {player.score}</li>
        <li><strong>Average Placement:</strong> {player.average.toFixed(2)}</li>
        <li><strong>Games Played:</strong> {player.gamesPlayed}</li>
      </ul>
    </div>
  );
};

export default PlayerDetails;
