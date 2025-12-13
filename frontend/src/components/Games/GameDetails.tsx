import React, { useState } from "react";
import { useCommanderArt, useCommanderFullImage } from "../../hooks/useCommanderArt";
import { getCommanderArtPreference } from "../../services/playerArtPreferences";
import PartnerCommanderDisplay from "../PartnerCommanderDisplay/PartnerCommanderDisplay";
import CardModal from "../CardModal/CardModal";
import "./GameDetails.css";

interface Player {
  name: string;
  playerId?: string;
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
  onPlayerClick?: (playerName: string) => void;
}

const GameDetails: React.FC<GameDetailsProps> = ({ id, dateCreated, notes, players, winner, onClose, onPlayerClick }) => {
  const [selectedCard, setSelectedCard] = useState<{ name: string; imageUrl: string; playerId?: string } | null>(null);
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
              <PlayerCardWithImage key={idx} player={player} onCardClick={setSelectedCard} onPlayerClick={onPlayerClick} />
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
        playerId={selectedCard?.playerId}
      />
    </>
  );
};

function PlayerCardWithImage({ player, onCardClick, onPlayerClick }: { player: any; onCardClick: (card: { name: string; imageUrl: string; playerId?: string }) => void; onPlayerClick?: (playerName: string) => void }) {
  const commanders = Array.isArray(player.commander) ? player.commander : [player.commander];
  const commanderText = commanders.join(" // ");

  return (
    <div 
      className={`player-card placement-${player.placement}`}
      onClick={() => onPlayerClick?.(player.name)}
      style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
    >
      <div className="player-card-header">
        <div className="placement-indicator">
          {player.placement === 1 ? '🏆' : `#${player.placement}`}
        </div>
        <div className="player-commanders-images" onClick={(e) => e.stopPropagation()}>
          <PartnerCommanderDisplay
            commanders={commanders}
            onCardClick={(card) => onCardClick({ ...card, playerId: player.playerId })}
            size="small"
            isWinner={player.placement === 1}
            playerId={player.playerId}
          />
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
