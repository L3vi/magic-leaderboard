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
  notes?: string;
  players: Player[];
  winner?: Player;
  onClose: () => void;
}

// Optional: If you have a commander art hook, import it
// import useCommanderArt from "../GameHistory/useCommanderArt";

const GameDetails: React.FC<GameDetailsProps> = ({ id, dateCreated, notes, players, winner, onClose }) => {
  return (
    <div className="game-details">
      <div className="game-details-header">
        <span className="game-details-date">{new Date(dateCreated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      <div className="game-details-info">
        <table className="game-details-players-table">
          <thead>
            <tr>
              <th>Placement</th>
              <th>Player</th>
              <th>Commander</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={idx} className={p.placement === 1 ? "winner" : ""}>
                <td>{p.placement}</td>
                <td>
                  <span className="player-name">{p.name}</span>
                  {p.placement === 1 && <span className="winner-badge" title="Winner">🏆</span>}
                </td>
                <td>
                  {/* If you have commander art, show it here */}
                  {/* <img src={useCommanderArt(p.commander)} alt={p.commander} className="commander-art" /> */}
                  <span className="player-commander">{p.commander}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notes && (
        <div className="game-details-notes">
          <h3>Notes</h3>
          <p>{notes}</p>
        </div>
      )}
    </div>
  );
};

export default GameDetails;
