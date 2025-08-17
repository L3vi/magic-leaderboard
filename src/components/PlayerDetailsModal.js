import React, { useEffect } from 'react';
import Modal from './Modal';

const PlayerDetailsModal = ({ player, event, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!player) return null;
  
  // Gather all games for this player
  const games = event.games.filter(g => g.players.some(p => p.name === player.name));
  
  // Commander frequency
  const commanderCounts = {};
  (player.commanderHistory || []).forEach(({ commander }) => {
    if (commander) commanderCounts[commander] = (commanderCounts[commander] || 0) + 1;
  });
  const mostPlayed = Object.entries(commanderCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count})`);

  // Head-to-head statistics
  const opponentStats = Object.entries(player.opponentStats || {})
    .map(([opponentName, stats]) => ({
      name: opponentName,
      ...stats,
  winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : '0'
    }))
    .sort((a, b) => b.winRate - a.winRate);

  // Win rate by commander
  const commanderWinRates = {};
  (player.commanderHistory || []).forEach(({ commander, placement }) => {
    if (commander) {
      if (!commanderWinRates[commander]) {
        commanderWinRates[commander] = { wins: 0, games: 0 };
      }
      commanderWinRates[commander].games += 1;
      if (placement === 1) {
        commanderWinRates[commander].wins += 1;
      }
    }
  });

  const commanderWinRatesList = Object.entries(commanderWinRates)
    .map(([commander, stats]) => ({
      commander,
  winRate: Math.round((stats.wins / stats.games) * 100),
      wins: stats.wins,
      games: stats.games
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Modal isOpen={!!player} onClose={onClose} title={player.name}>
      {/* Flattened content for modal-body, no extra scrolling containers */}
      <div className="player-details-overview">
        <div className="player-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{player.games}</div>
            <div className="stat-label">Games Played</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{player.score}</div>
            <div className="stat-label">Total Points</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{player.games ? (player.score / player.games).toFixed(2) : '-'}</div>
            <div className="stat-label">Avg Points</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{player.games ? ((player.first / player.games) * 100).toFixed(1) : '0'}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
        </div>
        <div className="placement-breakdown">
          <h3>Placement Breakdown</h3>
          <div className="placement-stats">
            <div className="placement-stat first">1st: {player.first || 0}</div>
            <div className="placement-stat second">2nd: {player.second || 0}</div>
            <div className="placement-stat third">3rd: {player.third || 0}</div>
            <div className="placement-stat fourth">4th: {player.fourth || 0}</div>
          </div>
        </div>
      </div>
      {mostPlayed.length > 0 && (
        <div className="player-details-section">
          <h3>Most Played Commanders</h3>
          <div className="commanders-list">
            {mostPlayed.slice(0, 5).map((commander, idx) => (
              <span key={idx} className="commander-item">{commander}</span>
            ))}
          </div>
        </div>
      )}
      {commanderWinRatesList.length > 0 && (
        <div className="player-details-section">
          <h3>Commander Win Rates</h3>
          <div className="commander-winrates">
            {commanderWinRatesList.slice(0, 5).map((item, idx) => (
              <div key={idx} className="commander-winrate-item">
                <span className="commander-name">{item.commander}</span>
                <span className="commander-record">{item.wins}W-{item.games - item.wins}L ({item.winRate}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {opponentStats.length > 0 && (
        <div className="player-details-section">
          <h3>Head-to-Head Record</h3>
          <div className="opponent-stats">
            {opponentStats.slice(0, 5).map((opponent, idx) => (
              <div key={idx} className="opponent-stat-item">
                <span className="opponent-name">{opponent.name}</span>
                <span className="opponent-record">
                  {opponent.wins}W-{opponent.losses}L ({opponent.winRate}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="player-details-section">
        <h3>Recent Games</h3>
        <div className="recent-games-table">
          <table className="scoreboard-table">
            <thead>
              <tr className="scoreboard-header-row">
                <th>Date</th>
                <th>Place</th>
                <th>Commander</th>
                <th>Opponents</th>
              </tr>
            </thead>
            <tbody>
              {games.slice(-10).reverse().map((g, idx) => {
                const p = g.players.find(pl => pl.name === player.name);
                const opponents = g.players
                  .filter(pl => pl.name !== player.name)
                  .map(pl => pl.name)
                  .join(', ');
                return (
                  <tr key={g.id + idx} className="scoreboard-row">
                    <td>{formatDate(g.dateCreated || g.date)}</td>
                    <td className={`placement-${p.placement}`}>{p.placement}</td>
                    <td className="player-details-commander">{p.commander || '—'}</td>
                    <td className="opponents-list">{opponents}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default PlayerDetailsModal;
