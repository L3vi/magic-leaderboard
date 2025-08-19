import React from "react";

export interface Player {
  name: string;
  score: number;
  average: number;
  gamesPlayed: number;
}

const PlayerRow: React.FC<{ player: Player }> = ({ player }) => (
  <div className="player-row">
    <span className="player-name">{player.name}</span>
    <span className="player-score">{player.score}</span>
    <span className="player-average">{player.average.toFixed(2)}</span>
    <span className="player-games">{player.gamesPlayed}</span>
  </div>
);

export default PlayerRow;
