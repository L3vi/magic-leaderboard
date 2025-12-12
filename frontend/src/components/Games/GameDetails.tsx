import React, { useState } from "react";
import { useCommanderArt, useCommanderFullImage } from "../../hooks/useCommanderArt";
import CardModal from "../CardModal/CardModal";
import "./GameDetails.css";

interface Player {
  name: string;
  placement: number;
  commander: string | string[];
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
  const [selectedCard, setSelectedCard] = useState<{ name: string; imageUrl: string } | null>(null);
  const sortedPlayers = [...players].sort((a, b) => a.placement - b.placement);
  
  return (
    <>
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
              <PlayerCardWithImage key={idx} player={player} onCardClick={setSelectedCard} />
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
      
      <CardModal
        isOpen={!!selectedCard}
        imageUrl={selectedCard?.imageUrl || ""}
        cardName={selectedCard?.name || ""}
        onClose={() => setSelectedCard(null)}
      />
    </>
  );
};

function PlayerCardWithImage({ player, onCardClick }: { player: any; onCardClick: (card: { name: string; imageUrl: string }) => void }) {
  const commanders = Array.isArray(player.commander) ? player.commander : [player.commander];
  const commanderText = commanders.join(" // ");

  return (
    <div className={`player-card placement-${player.placement}`}>
      <div className="player-card-header">
        <div className="placement-indicator">
          {player.placement === 1 ? '🏆' : `#${player.placement}`}
        </div>
        <div className="player-commanders-images">
          {commanders.map((cmd: string, idx: number) => {
            const artUrl = useCommanderArt(cmd);
            const fullImageUrl = useCommanderFullImage(cmd);
            return artUrl ? (
              <img
                key={idx}
                src={artUrl}
                alt={cmd}
                className="player-card-thumbnail"
                style={{ cursor: "pointer" }}
                onClick={() => onCardClick({ name: cmd, imageUrl: fullImageUrl })}
              />
            ) : null;
          })}
        </div>
        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-commander">{commanderText}</div>
        </div>
      </div>
    </div>
  );
}

export default GameDetails;
