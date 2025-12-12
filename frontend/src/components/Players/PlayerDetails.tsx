import React from "react";
import { Player } from "./PlayerRow";
import { useCommanderArt } from "../../hooks/useCommanderArt";
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

  return (
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
        <MostPlayedCommanderCard commander={mostPlayedCommander[0]} count={mostPlayedCommander[1]} />
      )}

      {/* Recent Games */}
      {sortedGames.length > 0 && (
        <div className="recent-games-section">
          <div className="section-title">Recent Games</div>
          <div className="games-list">
            {sortedGames.map(g => {
              const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
              return (
                <GameItemWithImage key={g.id} game={g} player={p} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function MostPlayedCommanderCard({ commander, count }: { commander: string; count: number }) {
  const artUrl = useCommanderArt(commander);

  return (
    <div className="commander-section">
      <div className="section-title">Most Played Commander</div>
      <div className="commander-card">
        {artUrl && (
          <img src={artUrl} alt={commander} className="commander-thumbnail" />
        )}
        <div className="commander-info">
          <div className="commander-name">{commander}</div>
          <div className="commander-count">{count} game{count > 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
}

function GameItemWithImage({ game, player }: { game: any; player: any }) {
  const commanders = Array.isArray(player?.commander) ? player?.commander : [player?.commander || ""];
  const primaryCommander = commanders[0] || "";
  const artUrl = useCommanderArt(primaryCommander);

  return (
    <div className={`game-item placement-${player?.placement}`}>
      <div className="game-item-header">
        <div className="game-date">{new Date(game.dateCreated).toLocaleDateString()}</div>
        <div className={`game-placement placement-badge placement-${player?.placement}`}>
          {player?.placement === 1 ? '🏆' : `#${player?.placement}`}
        </div>
      </div>
      <div className="game-item-body">
        {artUrl && (
          <img src={artUrl} alt={player?.commander} className="game-commander-thumb" />
        )}
        <div className="game-commander-info">
          <div className="game-commander">{Array.isArray(player?.commander) ? player?.commander.join(' // ') : player?.commander}</div>
          {game.notes && <div className="game-notes">{game.notes}</div>}
        </div>
      </div>
    </div>
  );
}

export default PlayerDetails;
