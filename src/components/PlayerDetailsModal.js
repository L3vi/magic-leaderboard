import React from 'react';

const PlayerDetailsModal = ({ player, event, onClose }) => {
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
      <div className="modal-content" style={{ minWidth: 340, maxWidth: 520, padding: 36 }}>
        <h2 style={{ fontSize: '2.1rem', marginBottom: 8, letterSpacing: '1.2px' }}>{player.name}</h2>
        <div style={{ display: 'flex', gap: 18, marginBottom: 18, fontSize: '1.18rem', fontWeight: 500, justifyContent: 'center' }}>
          <span><b>Games</b>: {player.games}</span>
          <span><b>Points</b>: {player.score}</span>
          <span><b>Avg</b>: {player.games ? (player.score / player.games).toFixed(2) : '-'}</span>
        </div>
        <div style={{ marginBottom: 18, fontSize: '1.08rem', textAlign: 'center' }}>
          <b>Most Played Commanders:</b> <span style={{ color: '#b3d8ff' }}>{mostPlayed.length ? mostPlayed.join(', ') : '—'}</span>
        </div>
        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 18 }}>
          <table className="scoreboard-table" style={{ fontSize: '1.01rem', minWidth: 320 }}>
            <thead>
              <tr className="scoreboard-header-row">
                <th style={{ fontSize: '1.01rem' }}>Date</th>
                <th style={{ fontSize: '1.01rem' }}>Placement</th>
                <th style={{ fontSize: '1.01rem' }}>Commander</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, idx) => {
                const p = g.players.find(pl => pl.name === player.name);
                return (
                  <tr key={g.id + idx} className="scoreboard-row">
                    <td style={{ fontSize: '1.01rem' }}>{event.date}</td>
                    <td style={{ fontWeight: 600, fontSize: '1.01rem' }}>{p.placement}</td>
                    <td style={{ fontSize: '1.01rem', color: '#b3d8ff' }}>{p.commander || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="modal-close-btn" style={{ fontSize: '1.08rem', padding: '10px 28px', marginTop: 8 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PlayerDetailsModal;
