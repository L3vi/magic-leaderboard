import React, { useState, useMemo } from 'react';

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleString();
};

const getPlacementDisplay = (placement) => {
  const placements = {
    1: { text: '1st', color: '#ffd700' },
    2: { text: '2nd', color: '#c0c0c0' },
    3: { text: '3rd', color: '#cd7f32' },
    4: { text: '4th', color: '#b3cfff' }
  };
  return placements[placement] || { text: `${placement}th`, color: '#ffffff' };
};

const GameCard = ({ game, onPlayerClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Sort players by placement
  const sortedPlayers = [...game.players].sort((a, b) => a.placement - b.placement);
  const winner = sortedPlayers[0];
  
  return (
    <div className="game-card">
      <div className="game-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="game-card-main-info">
          <div className="game-winner">
            <span className="winner-crown">👑</span>
            <span className="winner-name">{winner.name}</span>
            {winner.commander && <span className="winner-commander">({winner.commander})</span>}
          </div>
          <div className="game-meta">
            <span className="game-date">{formatDate(game.dateCreated || game.date)}</span>
            <span className="player-count">{game.players.length} players</span>
          </div>
        </div>
        <div className="expand-indicator">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="game-card-details">
          <div className="game-players-list">
            {sortedPlayers.map((player, index) => {
              const placementInfo = getPlacementDisplay(player.placement);
              return (
                <div 
                  key={index} 
                  className="game-player-row"
                  onClick={() => onPlayerClick && onPlayerClick({ name: player.name })}
                >
                  <div className="player-placement-info">
                    <span 
                      className="placement-badge"
                      style={{ backgroundColor: placementInfo.color, color: '#000' }}
                    >
                      {placementInfo.text}
                    </span>
                    <span className="player-name">{player.name}</span>
                  </div>
                  {player.commander && (
                    <span className="player-commander">{player.commander}</span>
                  )}
                </div>
              );
            })}
          </div>
          
          {game.notes && (
            <div className="game-notes">
              <strong>Notes:</strong> {game.notes}
            </div>
          )}
          
          <div className="game-timestamps">
            {game.dateCreated && (
              <div className="timestamp">
                <strong>Recorded:</strong> {formatDateTime(game.dateCreated)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GamesList = ({ event, onPlayerClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'winner', 'players'
  const [sortDir, setSortDir] = useState('desc');

  const filteredAndSortedGames = useMemo(() => {
    if (!event || !event.games) return [];
    
    let games = [...event.games];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      games = games.filter(game => 
        game.players.some(player => 
          player.name.toLowerCase().includes(query) ||
          (player.commander && player.commander.toLowerCase().includes(query))
        ) ||
        (game.notes && game.notes.toLowerCase().includes(query))
      );
    }
    
    // Sort games
    games.sort((a, b) => {
      let valA, valB;
      
      switch (sortBy) {
        case 'date':
          valA = new Date(a.dateCreated || a.date || 0);
          valB = new Date(b.dateCreated || b.date || 0);
          break;
        case 'winner':
          const winnerA = a.players.find(p => p.placement === 1)?.name || '';
          const winnerB = b.players.find(p => p.placement === 1)?.name || '';
          valA = winnerA.toLowerCase();
          valB = winnerB.toLowerCase();
          break;
        case 'players':
          valA = a.players.length;
          valB = b.players.length;
          break;
        default:
          valA = a.id;
          valB = b.id;
      }
      
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return games;
  }, [event, searchQuery, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'winner' ? 'asc' : 'desc');
    }
  };

  if (!event || !event.games) {
    return (
      <div className="games-list-container">
        <div className="no-games">No games found for this time period.</div>
      </div>
    );
  }

  return (
    <div className="games-list-container">
      <div className="games-list-header">
        <div className="games-search-controls">
          <input
            type="text"
            placeholder="Search games by player, commander, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="games-search-input"
          />
        </div>
        
        <div className="games-sort-controls">
          <span className="sort-label">Sort by:</span>
          <button 
            className={`sort-button ${sortBy === 'date' ? 'active' : ''}`}
            onClick={() => handleSort('date')}
          >
            Date {sortBy === 'date' && (sortDir === 'asc' ? '▲' : '▼')}
          </button>
          <button 
            className={`sort-button ${sortBy === 'winner' ? 'active' : ''}`}
            onClick={() => handleSort('winner')}
          >
            Winner {sortBy === 'winner' && (sortDir === 'asc' ? '▲' : '▼')}
          </button>
          <button 
            className={`sort-button ${sortBy === 'players' ? 'active' : ''}`}
            onClick={() => handleSort('players')}
          >
            Players {sortBy === 'players' && (sortDir === 'asc' ? '▲' : '▼')}
          </button>
        </div>
      </div>

      <div className="games-stats">
        <span className="games-count">
          Showing {filteredAndSortedGames.length} of {event.games.length} games
        </span>
      </div>

      <div className="games-list">
        {filteredAndSortedGames.map((game) => (
          <GameCard 
            key={game.id} 
            game={game} 
            onPlayerClick={onPlayerClick}
          />
        ))}
      </div>
      
      {filteredAndSortedGames.length === 0 && searchQuery && (
        <div className="no-games">No games match your search criteria.</div>
      )}
    </div>
  );
};

export default GamesList;
