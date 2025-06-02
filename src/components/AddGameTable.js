import React from 'react';

function getCommanderHistory(events, playerName) {
  const commanders = {};
  events.forEach(ev => ev.games.forEach(g => g.players.forEach(p => {
    if (p.name === playerName && p.commander) {
      commanders[p.commander] = (commanders[p.commander] || 0) + 1;
    }
  })));
  return Object.entries(commanders).sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

export default function AddGameTable({ events, players, setPlayers, placements, setPlacements, commanders, setCommanders, allPlayers, addPlayer, removePlayer }) {
  function handlePlayerChange(i, val) {
    const arr = [...players];
    arr[i] = val;
    setPlayers(arr);
  }
  function handlePlacementChange(i, val) {
    const arr = [...placements];
    arr[i] = val;
    setPlacements(arr);
  }
  function handleCommanderChange(i, val) {
    const arr = [...commanders];
    arr[i] = val;
    setCommanders(arr);
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="scoreboard-table addgame-table">
        <thead>
          <tr className="scoreboard-header-row">
            <th className="scoreboard-rank-header">#</th>
            <th className="scoreboard-player-header">Player</th>
            <th className="scoreboard-placement-header scoreboard-placement-header-score">Place</th>
            <th className="scoreboard-player-header">Commander</th>
            <th style={{ width: 32 }}></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i} className="scoreboard-row addgame-row">
              <td className="scoreboard-rank">{i + 1}</td>
              <td className="scoreboard-player-cell">
                <input
                  type="text"
                  list="player-suggestions"
                  value={p}
                  onChange={e => handlePlayerChange(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  autoFocus={i === 0}
                  className="addgame-input"
                />
              </td>
              <td className="scoreboard-player-score">
                <select
                  value={placements[i]}
                  onChange={e => handlePlacementChange(i, Number(e.target.value))}
                  className="addgame-select"
                >
                  {players.map((_, idx) => (
                    <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                  ))}
                </select>
              </td>
              <td className="scoreboard-player-cell">
                <input
                  type="text"
                  list={`commander-suggestions-${i}`}
                  value={commanders[i]}
                  onChange={e => handleCommanderChange(i, e.target.value)}
                  placeholder="Commander"
                  className="addgame-input"
                />
                <datalist id={`commander-suggestions-${i}`}>
                  {getCommanderHistory(events, p).map(c => <option key={c} value={c} />)}
                </datalist>
              </td>
              <td>
                {players.length > 2 && (
                  <button type="button" onClick={() => removePlayer(i)} title="Remove Player" className="addgame-remove-btn">×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="player-suggestions">
        {allPlayers.map(name => <option key={name} value={name} />)}
      </datalist>
      <button type="button" onClick={addPlayer} className="addgame-add-btn">+ Add Player</button>
    </div>
  );
}
