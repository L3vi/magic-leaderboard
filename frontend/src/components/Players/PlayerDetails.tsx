import React, { useState } from "react";
import { Player } from "./PlayerRow";
import { useCommanderArt, useCommanderFullImage, useCommanderArtWithPreference, useCommanderFullImageWithPreference } from "../../hooks/useCommanderArt";
import { useCommanderColors } from "../../hooks/useCommanderColors";
import PartnerCommanderDisplay from "../PartnerCommanderDisplay/PartnerCommanderDisplay";
import CardModal from "../CardModal/CardModal";
import "./PlayerDetails.css";

interface PlayerDetailsProps {
  player: Player & { id?: string };
  games: Array<{
    id: string;
    dateCreated: string;
    notes?: string;
    players: Array<{ playerId: string; placement: number; commander: string | string[] }>;
  }>;
  players: Array<{ id: string; name: string }>;
  onGameClick?: (gameId: string) => void;
  playerId?: string;
}

const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player, games, players, onGameClick, playerId: propPlayerId }) => {
  const [selectedCard, setSelectedCard] = useState<{ name: string; imageUrl: string } | null>(null);
  const playerId = propPlayerId || player.id; // Use prop if provided, otherwise use player.id
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;
  const gamesForPlayer = games.filter(g => g.players.some(p => getPlayerName(p.playerId) === player.name));
  const totalGames = gamesForPlayer.length;
  const wins = gamesForPlayer.filter(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement === 1).length;
  const winRate = totalGames ? Math.round((wins / totalGames) * 100) : 0;
  const placements = gamesForPlayer.map(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement || 0);
  const avgPlacement = placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length).toFixed(2) : "-";
  
  // Get unique deck combinations (treating companion pairs as single decks)
  const deckCombinations = gamesForPlayer
    .map(g => {
      const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
      const cmd = p?.commander;
      // Create a sortable key for the deck (handles both single commanders and companion pairs)
      if (Array.isArray(cmd)) {
        return cmd.sort().join("|");
      }
      return cmd || "";
    })
    .filter(Boolean);
  
  const uniqueDeckCombinations = new Set(deckCombinations);
  const deckDiversity = uniqueDeckCombinations.size;
  
  // Get deck combination counts for the "most played commander" stat
  const deckCombinationCounts = deckCombinations.reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostPlayedDeckEntry = Object.entries(deckCombinationCounts).sort((a, b) => b[1] - a[1])[0];
  const mostPlayedCommander = mostPlayedDeckEntry ? [mostPlayedDeckEntry[0].split("|"), mostPlayedDeckEntry[1]] : undefined;
  
  const sortedGames = [...gamesForPlayer].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  const firstGameDate = gamesForPlayer.length ? new Date(sortedGames[sortedGames.length - 1].dateCreated).toLocaleDateString() : "-";
  const lastGameDate = gamesForPlayer.length ? new Date(sortedGames[0].dateCreated).toLocaleDateString() : "-";

  // Calculate color distribution from deck combinations
  const colorDistribution = React.useMemo(() => {
    const distribution: Record<string, number> = {};
    deckCombinations.forEach((deckCombo) => {
      // Split the deck combination back into individual commanders for color tracking
      const commanders = deckCombo.split("|");
      commanders.forEach((commander) => {
        distribution[commander] = (distribution[commander] || 0) + 1;
      });
    });
    return distribution;
  }, [deckCombinations]);

  return (
    <>
      <div className="player-details">
        {/* Key Stats Cards */}
        <div className="player-stats-cards">
          <div className="stat-card stat-card-primary">
            <div className="stat-label">Score</div>
            <div className="stat-value">{player.score}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Games</div>
            <div className="stat-value">{totalGames}</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-label">Wins</div>
            <div className="stat-value">{wins}</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{winRate}%</div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="player-secondary-stats">
          <div className="secondary-stat">
            <div className="secondary-stat-label">Avg Score</div>
            <div className="secondary-stat-value">{player.average.toFixed(2)}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Most Common Place</div>
            <div className="secondary-stat-value">#{player.mostCommonPlacement}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Time Played</div>
            <div className="secondary-stat-value">{player.estimatedMinutesPlayed ? `${Math.floor(player.estimatedMinutesPlayed / 60)}h ${player.estimatedMinutesPlayed % 60}m` : '-'}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Decks Played</div>
            <div className="secondary-stat-value">{deckDiversity}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">First Game</div>
            <div className="secondary-stat-value">{firstGameDate}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Last Game</div>
            <div className="secondary-stat-value">{lastGameDate}</div>
          </div>
        </div>

        {/* Most Played Commander */}
        {mostPlayedCommander && (
          <MostPlayedCommanderCard commander={mostPlayedCommander[0]} count={mostPlayedCommander[1]} onCardClick={setSelectedCard} playerId={playerId} />
        )}

        {/* Commander Color Distribution */}
        {deckCombinations.length > 0 && (
          <CommanderColorDistribution commanders={deckCombinations.flatMap(dc => dc.split("|"))} />
        )}

        {/* Recent Games */}
        {sortedGames.length > 0 && (
          <div className="recent-games-section">
            <div className="section-title">Recent Games</div>
            <div className="games-list">
              {sortedGames.map(g => {
                const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
                return (
                  <GameItemWithImage key={g.id} game={g} player={p} onCardClick={setSelectedCard} onGameClick={onGameClick} />
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <CardModal
        isOpen={!!selectedCard}
        imageUrl={selectedCard?.imageUrl || ""}
        cardName={selectedCard?.name || ""}
        onClose={() => setSelectedCard(null)}
        playerId={playerId}
      />
    </>
  );
};

function MostPlayedCommanderCard({ commander, count, onCardClick, playerId }: { commander: string | string[]; count: number; onCardClick: (card: { name: string; imageUrl: string }) => void; playerId?: string }) {
  const commanderArray = Array.isArray(commander) ? commander : [commander];
  const artUrls = commanderArray.map(c => useCommanderArtWithPreference(c, playerId));
  const fullImageUrls = commanderArray.map(c => useCommanderFullImageWithPreference(c, playerId));
  const commanderName = commanderArray.join(" + ");

  return (
    <div className="commander-section">
      <div className="section-title">Most Played Commander</div>
      <div className="commander-card">
        {commanderArray.length === 2 ? (
          // Partner commanders display
          <PartnerCommanderDisplay
            commanders={commanderArray}
            onCardClick={onCardClick}
            size="large"
            isWinner={false}
            playerId={playerId}
          />
        ) : (
          // Single commander display
          artUrls[0] && (
            <img
              src={artUrls[0]}
              alt={commanderArray[0]}
              className="commander-thumbnail"
              style={{ cursor: "pointer" }}
              onClick={() => onCardClick({ name: commanderArray[0], imageUrl: fullImageUrls[0] })}
            />
          )
        )}
        <div className="commander-info">
          <div className="commander-name">{commanderName}</div>
          <div className="commander-count">{count} game{count > 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
}

function GameItemWithImage({ game, player, onCardClick, onGameClick }: { game: any; player: any; onCardClick: (card: { name: string; imageUrl: string }) => void; onGameClick?: (gameId: string) => void }) {
  const commanders = Array.isArray(player?.commander) ? player?.commander : [player?.commander || ""];

  const handleCardClick = (card: { name: string; imageUrl: string }) => {
    onCardClick(card);
  };

  return (
    <div 
      className={`game-item placement-${player?.placement}`}
      onClick={() => onGameClick?.(game.id)}
      style={{ cursor: onGameClick ? 'pointer' : 'default' }}
    >
      <div className="game-item-header">
        <div className="game-date">{new Date(game.dateCreated).toLocaleDateString()}</div>
        <div className={`game-placement placement-badge placement-${player?.placement}`}>
          {player?.placement === 1 ? '🏆' : `#${player?.placement}`}
        </div>
      </div>
      <div className="game-item-body">
        <PartnerCommanderDisplay
          commanders={commanders}
          onCardClick={handleCardClick}
          size="small"
          isWinner={player?.placement === 1}
          playerId={player?.playerId}
        />
        <div className="game-commander-info">
          <div className="game-commander">{Array.isArray(player?.commander) ? player?.commander.join(' // ') : player?.commander}</div>
          {game.notes && <div className="game-notes">{game.notes}</div>}
        </div>
      </div>
    </div>
  );
}

function CommanderColorDistribution({ commanders }: { commanders: string[] }) {
  // Color names and their hex values for Magic colors
  const COLOR_MAP: Record<string, { name: string; hex: string }> = {
    W: { name: 'White', hex: '#F5F5DC' },
    U: { name: 'Blue', hex: '#0E47A1' },
    B: { name: 'Black', hex: '#1C1C1C' },
    R: { name: 'Red', hex: '#D32F2F' },
    G: { name: 'Green', hex: '#2E7D32' },
  };

  // Calculate individual color frequency
  const colorFrequency: Record<string, number> = {};
  let totalColorCount = 0;

  // We need to fetch colors for each unique commander
  const uniqueCommanders = [...new Set(commanders)];
  const colorResults = uniqueCommanders.map((cmd) => ({
    commander: cmd,
    colors: useCommanderColors(cmd),
  }));

  // Build color frequency from fetched colors
  commanders.forEach((commander) => {
    const result = colorResults.find((r) => r.commander === commander);
    if (result && result.colors.length > 0) {
      result.colors.forEach((color: string) => {
        colorFrequency[color] = (colorFrequency[color] || 0) + 1;
        totalColorCount++;
      });
    }
  });

  if (totalColorCount === 0) {
    return null;
  }

  // Sort colors by frequency
  const sortedColors = Object.entries(colorFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      code: color,
      ...COLOR_MAP[color],
      count,
      percentage: Math.round((count / totalColorCount) * 100),
    }));

  return (
    <div className="commander-color-distribution">
      <div className="section-title">Color Preferences</div>
      <div className="color-bars">
        {sortedColors.map(({ code, name, hex, count, percentage }) => (
          <div key={code} className="color-bar-item">
            <div className="color-indicator" style={{ backgroundColor: hex }} title={name} />
            <div className="color-bar-label">{name}</div>
            <div className="color-bar-container">
              <div
                className="color-bar-fill"
                style={{ width: `${percentage}%`, backgroundColor: hex }}
              />
            </div>
            <div className="color-bar-count">
              {count} ({percentage}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayerDetails;
