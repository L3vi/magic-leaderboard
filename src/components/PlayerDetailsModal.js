import React, { useEffect } from 'react';

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
  player.commanderHistory.forEach(({ commander }) => {
    if (commander) commanderCounts[commander] = (commanderCounts[commander] || 0) + 1;
  });
  const mostPlayed = Object.entries(commanderCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count})`);

  return (
    <div className="modal-overlay">
      <div className="modal-content player-details-modal">
        <h2 className="player-details-name">{player.name}</h2>
        <div className="player-details-stats">
          <span><b>Games</b>: {player.games}</span>
          <span><b>Points</b>: {player.score}</span>
          <span><b>Avg</b>: {player.games ? (player.score / player.games).toFixed(2) : '-'}</span>
        </div>
        <div className="player-details-commanders">
          <b>Most Played Commanders:</b> <span className="player-details-commanders-list">{mostPlayed.length ? mostPlayed.join(', ') : '—'}</span>
        </div>
        <div className="player-details-games-table">
          <table className="scoreboard-table">
            <thead>
              <tr className="scoreboard-header-row">
                <th>Date</th>
                <th>Placement</th>
                <th>Commander</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, idx) => {
                const p = g.players.find(pl => pl.name === player.name);
                return (
                  <tr key={g.id + idx} className="scoreboard-row">
                    <td>{event.date}</td>
                    <td className="player-details-placement">{p.placement}</td>
                    <td className="player-details-commander">{p.commander || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="modal-close-btn player-details-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PlayerDetailsModal;
