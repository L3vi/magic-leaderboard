import { useEffect, useRef } from "react";

function useScryfallUris(players) {
  const [uris, setUris] = useState({});
  const requested = useRef({});

  useEffect(() => {
    players.forEach((player) => {
      const commander = player.commander;
      if (!commander || uris[commander] || requested.current[commander]) return;
      requested.current[commander] = true;
      fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commander)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.scryfall_uri) {
            setUris((prev) => ({ ...prev, [commander]: data.scryfall_uri }));
          }
        })
        .catch(() => {});
    });
  }, [players]);
  return uris;
}
import React, { useState, useMemo } from "react";

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatDateTime = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${dateStr}, ${timeStr}`;
};

const getPlacementDisplay = (placement) => {
  const placements = {
    1: { text: "1st", color: "#ffd700" },
    2: { text: "2nd", color: "#c0c0c0" },
    3: { text: "3rd", color: "#cd7f32" },
    4: { text: "4th", color: "#b3cfff" },
  };
  return placements[placement] || { text: `${placement}th`, color: "#ffffff" };
};

// Function to get Scryfall image URL for a card
const getCardImageUrl = (cardName) => {
  if (!cardName) return null;
  const encodedName = encodeURIComponent(cardName.toLowerCase());
  return `https://api.scryfall.com/cards/named?format=image&version=art_crop&exact=${encodedName}`;
};

// Fetch Scryfall card data and cache scryfall_uri per commander
const GameCard = ({ game, onPlayerClick, expanded, onExpand }) => {
  // Sort players by placement
  const sortedPlayers = [...game.players].sort(
    (a, b) => a.placement - b.placement
  );
  // Scryfall URIs for commanders
  const scryfallUris = useScryfallUris(sortedPlayers);
  // Create comma-separated player list with winner highlighted
  const playerList = sortedPlayers.map((player, index) => {
    const isWinner = player.placement === 1;
    return (
      <span key={index}>
        <span className={isWinner ? "winner-name" : "player-name"}>
          {player.name}
        </span>
        {index < sortedPlayers.length - 1 ? ", " : ""}
      </span>
    );
  });
  // Find the winning commander
  const winningPlayer = sortedPlayers[0];
  const winningCommander = winningPlayer?.commander;
  return (
    <div className="game-card">
      <div
        className="game-card-header"
        onClick={() => onExpand(game.id)}
      >
        <div className="game-card-main-info">
          <div className="game-players-summary">
            {playerList}
          </div>
          {winningCommander && (
            <div className="game-winning-commander">
              <span className="winner-name">{winningCommander}</span>
            </div>
          )}
          <div className="game-datetime">
            {formatDateTime(game.dateCreated || game.date)}
          </div>
        </div>
        <div className="expand-indicator">{expanded ? "▼" : "▶"}</div>
      </div>
      {expanded && (
        <div className="game-card-details">
          <div className="game-players-list striped-list">
            {sortedPlayers.map((player, index) => {
              const placementInfo = getPlacementDisplay(player.placement);
              return (
                <div
                  key={index}
                  className={`game-player-row${index % 2 === 0 ? ' even' : ' odd'}`}
                  onClick={() =>
                    onPlayerClick && onPlayerClick({ name: player.name })
                  }
                >
                  <div className="player-placement-info">
                    <span
                      className="placement-badge"
                      style={{
                        backgroundColor: placementInfo.color,
                        color: "#000",
                      }}
                    >
                      {placementInfo.text}
                    </span>
                    <span className="player-name">{player.name}</span>
                  </div>
                  {player.commander && (
                    <div className="player-commander-container">
                      <span className="player-commander">{player.commander}</span>
                      {scryfallUris[player.commander] ? (
                        <a
                          href={scryfallUris[player.commander]}
                          target="_blank"
                          rel="noopener noreferrer"
                          tabIndex={0}
                          aria-label={`View ${player.commander} on Scryfall`}
                          onClick={e => e.stopPropagation()}
                        >
                          <img 
                            src={getCardImageUrl(player.commander)} 
                            alt={player.commander}
                            className="commander-card-art"
                            onClick={e => e.stopPropagation()}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </a>
                      ) : (
                        <img 
                          src={getCardImageUrl(player.commander)} 
                          alt={player.commander}
                          className="commander-card-art"
                          onClick={e => e.stopPropagation()}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
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
// ...existing code...

const GamesList = ({ event, onPlayerClick }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedGameId, setExpandedGameId] = useState(null);

  const filteredAndSortedGames = useMemo(() => {
    if (!event || !event.games) return [];
    let games = [...event.games];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      games = games.filter(
        (game) =>
          game.players.some(
            (player) =>
              player.name.toLowerCase().includes(query) ||
              player?.commander.toLowerCase().includes(query)
          ) || game?.notes.toLowerCase().includes(query)
      );
    }
    games.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "date":
          valA = new Date(a.dateCreated || a.date || 0);
          valB = new Date(b.dateCreated || b.date || 0);
          break;
        case "winner":
          const winnerA = a.players.find((p) => p.placement === 1)?.name || "";
          const winnerB = b.players.find((p) => p.placement === 1)?.name || "";
          valA = winnerA.toLowerCase();
          valB = winnerB.toLowerCase();
          break;
        case "players":
          valA = a.players.length;
          valB = b.players.length;
          break;
        default:
          valA = a.id;
          valB = b.id;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return games;
  }, [event, searchQuery, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir(field === "winner" ? "asc" : "desc");
    }
  };

  const handleExpand = (gameId) => {
    setExpandedGameId(prev => prev === gameId ? null : gameId);
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
        <div className="games-header-row">
          <div className="games-sort-controls">
            <span className="sort-label">Sort by:</span>
            <button
              className={`sort-button ${sortBy === "date" ? "active" : ""}`}
              onClick={() => handleSort("date")}
            >
              Date {sortBy === "date" && (sortDir === "asc" ? "▲" : "▼")}
            </button>
            <button
              className={`sort-button ${sortBy === "winner" ? "active" : ""}`}
              onClick={() => handleSort("winner")}
            >
              Winner {sortBy === "winner" && (sortDir === "asc" ? "▲" : "▼")}
            </button>
            <button
              className={`sort-button ${sortBy === "players" ? "active" : ""}`}
              onClick={() => handleSort("players")}
            >
              Players {sortBy === "players" && (sortDir === "asc" ? "▲" : "▼")}
            </button>
          </div>
          <div className="games-search-controls">
            <input
              type="text"
              placeholder="Search games by player, commander, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="games-search-input"
            />
          </div>
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
            expanded={expandedGameId === game.id}
            onExpand={handleExpand}
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
