import React from "react";
import { Player } from "../Leaderboard/PlayerRow";
import "./PlayerDetails.css";

interface PlayerDetailsProps {
  player: Player;
  games: Array<{
    id: string;
    dateCreated: string;
    notes?: string;
    players: Array<{ playerId: string; placement: number; commander: string }>;
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
  const commanders = gamesForPlayer.map(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.commander).filter(Boolean);
  const commanderCounts = commanders.reduce((acc, c) => { acc[c!] = (acc[c!] || 0) + 1; return acc; }, {} as Record<string, number>);
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
        <div className="commander-section">
          <div className="section-title">Most Played Commander</div>
          <div className="commander-card">
            <div className="commander-name">{mostPlayedCommander[0]}</div>
            <div className="commander-count">{mostPlayedCommander[1]} game{mostPlayedCommander[1] > 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      {/* Recent Games */}
      {sortedGames.length > 0 && (
        <div className="recent-games-section">
          <div className="section-title">Recent Games</div>
          <div className="games-list">
            {sortedGames.map(g => {
              const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
              return (
                <div key={g.id} className={`game-item placement-${p?.placement}`}>
                  <div className="game-item-header">
                    <div className="game-date">{new Date(g.dateCreated).toLocaleDateString()}</div>
                    <div className={`game-placement placement-badge placement-${p?.placement}`}>
                      {p?.placement === 1 ? '🏆' : `#${p?.placement}`}
                    </div>
                  </div>
                  <div className="game-commander">{p?.commander}</div>
                  {g.notes && <div className="game-notes">{g.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetails;
