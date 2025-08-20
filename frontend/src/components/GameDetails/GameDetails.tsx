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

const GameDetails: React.FC<GameDetailsProps> = ({ id, dateCreated, notes, players, winner, onClose }) => {
  return (
    <div className="game-details-modal">
      <div className="game-details-header">
        <span className="game-details-date">{new Date(dateCreated).toLocaleString()}</span>
        <button className="game-details-close" onClick={onClose}>&times;</button>
      </div>
      <div className="game-details-body">
        <div className="game-details-players">
          {players.map((p, idx) => (
            <div key={idx} className={p.placement === 1 ? "winner" : ""}>
              <span className="player-name">{p.name}</span>
              <span className="player-commander">({p.commander})</span>
              {p.placement === 1 && <span className="winner-trophy"> 🏆</span>}
            </div>
          ))}
        </div>
        {notes && <div className="game-details-notes">{notes}</div>}
      </div>
    </div>
  );
};

export default GameDetails;
