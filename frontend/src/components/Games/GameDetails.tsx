import React from "react";
import { useCommanderArt } from "../../hooks/useCommanderArt";
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
  const sortedPlayers = [...players].sort((a, b) => a.placement - b.placement);
  
  return (
    <div className="game-details">
      {/* Game Date & Summary */}
      <div className="game-summary">
        <div className="game-date">
          {new Date(dateCreated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        </div>
        <div className="game-player-count">
          {players.length} player{players.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Players List - Card Based */}
      <div className="players-section">
        <div className="section-title">Results</div>
        <div className="players-list">
          {sortedPlayers.map((player, idx) => (
            <PlayerCardWithImage key={idx} player={player} />
          ))}
        </div>
      </div>

      {/* Notes Section */}
      {notes && (
        <div className="notes-section">
          <div className="section-title">Notes</div>
          <div className="notes-card">
            <p>{notes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

function PlayerCardWithImage({ player }: { player: any }) {
  const artUrl = useCommanderArt(player.commander);

  return (
    <div className={`player-card placement-${player.placement}`}>
      <div className="player-card-header">
        <div className="placement-indicator">
          {player.placement === 1 ? '🏆' : `#${player.placement}`}
        </div>
        {artUrl && (
          <img src={artUrl} alt={player.commander} className="player-card-thumbnail" />
        )}
        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-commander">{player.commander}</div>
        </div>
      </div>
    </div>
  );
}

export default GameDetails;
