import React from "react";
import "./GameHistory.css";

const GameHistory: React.FC = () => {
  return (
    <div className="game-history">
      {/* Game history content will go here */}
      <h2 className="game-history-title">Game History</h2>
      <div className="game-history-content">
        {/* No games to show yet */}
        <p>No game history available.</p>
      </div>
    </div>
  );
};

export default GameHistory;
