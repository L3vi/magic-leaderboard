import React from "react";
import "./GameDetails.css";

interface Player {
  name: string;
  placement: number;
  commander: string;
}

interface GameDetailsProps {
  id: string;
  dateCreated: string;
  notes: string;
  players: Player[];
  winner?: Player;
  onClose: () => void;
}

const GameDetails: React.FC<GameDetailsProps> = ({ id, dateCreated, notes, players, winner }) => {
  return (
    <div className="game-details">
      <h3 className="game-details-title">Game Details</h3>
      <div className="game-details-info">
        <div><strong>Date:</strong> {new Date(dateCreated).toLocaleString()}</div>
        {notes && (
          <div><strong>Notes:</strong> {notes}</div>
        )}
        {winner && (
          <div><strong>Winner:</strong> <span className="winner-name">{winner.name}</span></div>
        )}
      </div>
      <div className="game-details-players">
        <h4>Players</h4>
        <table className="game-details-players-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Commander</th>
              <th>Placement</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={idx} className={p.placement === 1 ? "winner" : ""}>
                <td className="player-name">{p.name} {p.placement === 1 && <span className="winner-badge">🏆</span>}</td>
                <td className="player-commander">{p.commander}</td>
                <td>{p.placement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameDetails;
