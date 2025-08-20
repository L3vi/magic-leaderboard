
import React from "react";
import { Player } from "../Leaderboard/PlayerRow";
import "./PlayerDetails.css";

// Add gameHistory prop for flexibility
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
  // Helper to get player name from ID
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;
  // Filter games for this player
  const gamesForPlayer = games.filter(g => g.players.some(p => getPlayerName(p.playerId) === player.name));
  const totalGames = gamesForPlayer.length;
  const wins = gamesForPlayer.filter(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement === 1).length;
  const winRate = totalGames ? Math.round((wins / totalGames) * 100) : 0;
  const placements = gamesForPlayer.map(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement || 0);
  const avgPlacement = placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length).toFixed(2) : "-";
  const commanders = gamesForPlayer.map(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.commander).filter(Boolean);
  const commanderCounts = commanders.reduce((acc, c) => { acc[c!] = (acc[c!] || 0) + 1; return acc; }, {} as Record<string, number>);
  const mostPlayedCommander = Object.entries(commanderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const deckDiversity = new Set(commanders).size;
  const sortedGames = [...gamesForPlayer].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  const firstGameDate = gamesForPlayer.length ? new Date(sortedGames[sortedGames.length - 1].dateCreated).toLocaleDateString() : "-";
  const lastGameDate = gamesForPlayer.length ? new Date(sortedGames[0].dateCreated).toLocaleDateString() : "-";
  const recentGames = sortedGames.slice(0, 5);

  return (
    <div className="player-details">
      <h2 className="player-details-name">{player.name}</h2>
      <div className="player-details-section">
        <dl className="player-details-stats-grid">
          <div>
            <dt>Score</dt>
            <dd>{player.score}</dd>
          </div>
          <div>
            <dt>Games Played</dt>
            <dd>{totalGames}</dd>
          </div>
          <div className="player-details-highlight">
            <dt>Wins</dt>
            <dd>{wins}</dd>
          </div>
          <div className="player-details-highlight">
            <dt>Win Rate</dt>
            <dd>{winRate}%</dd>
          </div>
          <div>
            <dt>Avg Placement</dt>
            <dd>{avgPlacement}</dd>
          </div>
        </dl>
      </div>
      <hr className="player-details-divider" />
      <div className="player-details-section">
        <dl className="player-details-commander-grid">
          <div>
            <dt>Most Played Commander</dt>
            <dd>{mostPlayedCommander}</dd>
          </div>
          <div>
            <dt>Deck Diversity</dt>
            <dd>{deckDiversity}</dd>
          </div>
        </dl>
      </div>
      <hr className="player-details-divider" />
      <div className="player-details-section">
        <dl className="player-details-history-grid">
          <div>
            <dt>First Game</dt>
            <dd>{firstGameDate}</dd>
          </div>
          <div>
            <dt>Last Game</dt>
            <dd>{lastGameDate}</dd>
          </div>
        </dl>
      </div>
      <hr className="player-details-divider" />
      <div className="player-details-recent">
        <h3>Recent Games</h3>
        <table className="player-details-recent-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Placement</th>
              <th>Commander</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {recentGames.map(g => {
              const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
              return (
                <tr key={g.id}>
                  <td>{new Date(g.dateCreated).toLocaleDateString()}</td>
                  <td className={`player-details-placement placement-${p?.placement}`}>{p?.placement}</td>
                  <td><strong>{p?.commander}</strong></td>
                  <td>{g.notes ? <em>{g.notes}</em> : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerDetails;
