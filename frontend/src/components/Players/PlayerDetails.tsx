import React, { useState } from "react";
import { Player } from "./PlayerRow";
import { useCommanderArt, useCommanderFullImage } from "../../hooks/useCommanderArt";
import { useCommanderColors } from "../../hooks/useCommanderColors";
import PartnerCommanderDisplay from "../PartnerCommanderDisplay/PartnerCommanderDisplay";
import CardModal from "../CardModal/CardModal";
import "./PlayerDetails.css";

interface PlayerDetailsProps {
  player: Player;
  games: Array<{
    id: string;
    dateCreated: string;
    notes?: string;
    players: Array<{ playerId: string; placement: number; commander: string | string[] }>;
  }>;
  players: Array<{ id: string; name: string }>;
}

const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player, games, players }) => {
  const [selectedCard, setSelectedCard] = useState<{ name: string; imageUrl: string } | null>(null);
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;
  const gamesForPlayer = games.filter(g => g.players.some(p => getPlayerName(p.playerId) === player.name));
  const totalGames = gamesForPlayer.length;
  const wins = gamesForPlayer.filter(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement === 1).length;
  const winRate = totalGames ? Math.round((wins / totalGames) * 100) : 0;
  const placements = gamesForPlayer.map(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement || 0);
  const avgPlacement = placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length).toFixed(2) : "-";
  const commanders = gamesForPlayer
    .map(g => {
      const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
      const cmd = p?.commander;
      return Array.isArray(cmd) ? cmd : (cmd ? [cmd] : []);
    })
    .flat()
    .filter(Boolean);
  const commanderCounts = commanders.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>);
  const mostPlayedCommander = Object.entries(commanderCounts).sort((a, b) => b[1] - a[1])[0];
  const deckDiversity = new Set(commanders).size;
  const sortedGames = [...gamesForPlayer].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  const firstGameDate = gamesForPlayer.length ? new Date(sortedGames[sortedGames.length - 1].dateCreated).toLocaleDateString() : "-";
  const lastGameDate = gamesForPlayer.length ? new Date(sortedGames[0].dateCreated).toLocaleDateString() : "-";

  // Calculate color distribution
  const colorDistribution = React.useMemo(() => {
    const distribution: Record<string, number> = {};
    commanders.forEach((commander) => {
      // We'll fetch colors in a separate component to handle async
      // For now, store the commander for processing
      distribution[commander] = (distribution[commander] || 0) + 1;
    });
    return distribution;
  }, [commanders]);

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
            <div className="secondary-stat-label">Avg Placement</div>
            <div className="secondary-stat-value">{avgPlacement}</div>
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
          <MostPlayedCommanderCard commander={mostPlayedCommander[0]} count={mostPlayedCommander[1]} onCardClick={setSelectedCard} />
        )}

        {/* Commander Color Distribution */}
        {commanders.length > 0 && (
          <CommanderColorDistribution commanders={commanders} />
        )}

        {/* Recent Games */}
        {sortedGames.length > 0 && (
          <div className="recent-games-section">
            <div className="section-title">Recent Games</div>
            <div className="games-list">
              {sortedGames.map(g => {
                const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
                return (
                  <GameItemWithImage key={g.id} game={g} player={p} onCardClick={setSelectedCard} />
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
      />
    </>
  );
};

function MostPlayedCommanderCard({ commander, count, onCardClick }: { commander: string; count: number; onCardClick: (card: { name: string; imageUrl: string }) => void }) {
  const artUrl = useCommanderArt(commander);
  const fullImageUrl = useCommanderFullImage(commander);

  return (
    <div className="commander-section">
      <div className="section-title">Most Played Commander</div>
      <div className="commander-card">
        {artUrl && (
          <img
            src={artUrl}
            alt={commander}
            className="commander-thumbnail"
            style={{ cursor: "pointer" }}
            onClick={() => onCardClick({ name: commander, imageUrl: fullImageUrl })}
          />
        )}
        <div className="commander-info">
          <div className="commander-name">{commander}</div>
          <div className="commander-count">{count} game{count > 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
}

function GameItemWithImage({ game, player, onCardClick }: { game: any; player: any; onCardClick: (card: { name: string; imageUrl: string }) => void }) {
  const commanders = Array.isArray(player?.commander) ? player?.commander : [player?.commander || ""];

  return (
    <div className={`game-item placement-${player?.placement}`}>
      <div className="game-item-header">
        <div className="game-date">{new Date(game.dateCreated).toLocaleDateString()}</div>
        <div className={`game-placement placement-badge placement-${player?.placement}`}>
          {player?.placement === 1 ? '🏆' : `#${player?.placement}`}
        </div>
      </div>
      <div className="game-item-body">
        <PartnerCommanderDisplay
          commanders={commanders}
          onCardClick={onCardClick}
          size="small"
          isWinner={player?.placement === 1}
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
