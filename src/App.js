import React, { useState, useEffect } from 'react';
import ScoreBoard from './components/ScoreBoard';
import AddGameTable from './components/AddGameTable';
import PlayerDetailsModal from './components/PlayerDetailsModal';
import scores2025 from './data/scores-2025.json';
import scores2024 from './data/scores-2024.json';

const AVAILABLE_SHEETS = [
  { label: '2025', file: 'scores-2025.json', data: scores2025 },
  { label: '2024', file: 'scores-2024.json', data: scores2024 }
];

function aggregatePlayers(event) {
  // Aggregate player stats from all games in the event
  const playerMap = {};
  event.games.forEach(game => {
    game.players.forEach(({ name, placement, commander }) => {
      if (!playerMap[name]) {
        playerMap[name] = {
          name,
          score: 0,
          first: 0,
          second: 0,
          third: 0,
          fourth: 0,
          games: 0,
          commanderHistory: []
        };
      }
      playerMap[name].games += 1;
      playerMap[name].commanderHistory.push({ commander, gameId: game.id, placement });
      switch (placement) {
        case 1: playerMap[name].first += 1; playerMap[name].score += 4; break;
        case 2: playerMap[name].second += 1; playerMap[name].score += 3; break;
        case 3: playerMap[name].third += 1; playerMap[name].score += 2; break;
        case 4: playerMap[name].fourth += 1; playerMap[name].score += 1; break;
        default: break;
      }
    });
  });
  return Object.values(playerMap);
}

const getToday = () => new Date().toISOString().slice(0, 10);

function getUniquePlayers(events) {
  const names = new Set();
  events.forEach(ev => ev.games.forEach(g => g.players.forEach(p => names.add(p.name))));
  return Array.from(names);
}

function getCommanderHistory(events, playerName) {
  const commanders = {};
  events.forEach(ev => ev.games.forEach(g => g.players.forEach(p => {
    if (p.name === playerName && p.commander) {
      commanders[p.commander] = (commanders[p.commander] || 0) + 1;
    }
  })));
  return Object.entries(commanders).sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

const AddGameWizard = ({ events, onClose, onSubmit }) => {
  const allPlayers = getUniquePlayers(events);
  const [date, setDate] = useState(getToday());
  const [players, setPlayers] = useState([allPlayers[0] || '', allPlayers[1] || '', '', '']);
  const [placements, setPlacements] = useState([1, 2, 3, 4]);
  const [commanders, setCommanders] = useState(['', '', '', '']);
  const [error, setError] = useState('');

  const addPlayer = () => {
    setPlayers(p => [...p, '']);
    setPlacements(p => [...p, p.length + 1]);
    setCommanders(c => [...c, '']);
  };
  const removePlayer = i => {
    if (players.length > 2) {
      setPlayers(p => p.filter((_, idx) => idx !== i));
      setPlacements(p => p.filter((_, idx) => idx !== i));
      setCommanders(c => c.filter((_, idx) => idx !== i));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const names = players.map(p => p.trim()).filter(Boolean);
    if (names.length < 2 || new Set(names).size !== names.length) {
      setError('Enter at least 2 unique player names.');
      return;
    }
    // Compose game object
    const game = {
      id: `game-${Date.now()}`,
      timestampStart: null,
      timestampEnd: null,
      players: players.map((name, i) => ({
        name: name.trim(),
        placement: placements[i],
        commander: commanders[i] || ''
      }))
    };
    onSubmit({ date, game });
  };

  return (
    <div className="addgame-modal-overlay">
      <div className="addgame-modal-content">
        <h2>Add Game</h2>
        <form onSubmit={handleSubmit}>
          <label>Date:<br />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="addgame-date-input" />
          </label>
          <div className="addgame-table-wrapper">
            <AddGameTable
              events={events}
              players={players}
              setPlayers={setPlayers}
              placements={placements}
              setPlacements={setPlacements}
              commanders={commanders}
              setCommanders={setCommanders}
              allPlayers={allPlayers}
              addPlayer={addPlayer}
              removePlayer={removePlayer}
            />
          </div>
          {error && <div className="addgame-error">{error}</div>}
          <div className="addgame-modal-actions">
            <button className="modal-close-btn" type="button" onClick={onClose}>Cancel</button>
            <button className="modal-close-btn" type="submit">Add Game</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [selectedSheet, setSelectedSheet] = useState(AVAILABLE_SHEETS[0].file);
  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [showAddGame, setShowAddGame] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    const sheet = AVAILABLE_SHEETS.find(s => s.file === selectedSheet);
    if (sheet && sheet.data && sheet.data.events && sheet.data.events.length > 0) {
      // For now, just use the first event in the year
      setEvent(sheet.data.events[0]);
    } else {
      setEvent(null);
    }
  }, [selectedSheet]);

  useEffect(() => {
    if (event) {
      setPlayers(aggregatePlayers(event));
    } else {
      setPlayers([]);
    }
  }, [event]);

  const handleAddGame = ({ date, game }) => {
    // For now, just add to the first event in the selected year (in-memory)
    setEvent(ev => {
      const newEvent = { ...ev, games: [...ev.games, game] };
      setPlayers(aggregatePlayers(newEvent));
      return newEvent;
    });
    setShowAddGame(false);
  };

  return (
    <div className="app-container">
      <div className="app-header-row">
        <h1>MTG Commander Leaderboard</h1>
        <select
          id="scoresheet-select"
          className="scoresheet-select"
          value={selectedSheet}
          onChange={e => setSelectedSheet(e.target.value)}
        >
          {AVAILABLE_SHEETS.map(sheet => (
            <option key={sheet.file} value={sheet.file}>{sheet.label}</option>
          ))}
        </select>
      </div>
      <ScoreBoard
        scores={{ players }}
        onPlayerClick={player => setSelectedPlayer(player)}
        minimal
      />
      <button
        onClick={() => setShowAddGame(true)}
        aria-label="Add Game"
        title="Add Game"
      >
        +
      </button>
      {showAddGame && (
        <AddGameWizard
          events={event ? [event] : []}
          onClose={() => setShowAddGame(false)}
          onSubmit={handleAddGame}
        />
      )}
      {selectedPlayer && (
        <PlayerDetailsModal
          player={selectedPlayer}
          event={event}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};

export default App;