import React from "react";
import PlayerRow, { Player } from "./PlayerRow";
import "./Leaderboard.css";
import playersData from "../../data/players.json";

const Leaderboard: React.FC = () => {
  const players = playersData as Player[];

  return (
    <section className="leaderboard">
      <h2 className="leaderboard-title">Leaderboard</h2>
      <div className="leaderboard-header">
        <span>Name</span>
        <span>Score</span>
        <span>Average</span>
        <span>Games</span>
      </div>
      <div className="leaderboard-list">
        {players.map((player) => (
          <PlayerRow key={player.name} player={player} />
        ))}
      </div>
    </section>
  );
};

export default Leaderboard;
