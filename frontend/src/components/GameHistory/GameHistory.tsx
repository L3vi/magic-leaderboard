
import React, { useState, useMemo } from "react";
import "./GameHistory.css";

// TypeScript interfaces for game history data
interface Player {
  name: string;
  placement: number;
  commander: string;
}

interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: Player[];
}

interface Event {
  id: string;
  date: string;
  games: Game[];
}

interface GameHistoryData {
  year: number;
  events: Event[];
}

// Load game history data
import gameHistoryRaw from "../../data/game-history.json";
const gameHistory: GameHistoryData = gameHistoryRaw;


const GameHistory: React.FC = () => {
  // Filtering state
  const [filter, setFilter] = useState("");
  // Track selected game for modal (future)
  const [selected, setSelected] = useState<string | null>(null);

  // Flatten all games from all events
  const allGames = useMemo(() => {
    return gameHistory.events.flatMap(event => event.games.map(game => ({ ...game, eventDate: event.date })));
  }, []);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let games = allGames;
    if (filter.trim()) {
      games = games.filter(game =>
        game.players.some(
          p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.commander.toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    // Sort by dateCreated, newest first
    return games.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  }, [allGames, filter]);


  // Placeholder for modal open
  const openDetails = (id: string) => {
    setSelected(id);
    // TODO: open modal in future
    console.log('Open details for game:', id);
  };

  return (
    <section className="game-history" aria-labelledby="game-history-title">
      <h2 id="game-history-title" className="game-history-title">Game History</h2>
      <div className="game-history-controls">
        <input
          type="text"
          className="game-history-filter"
          placeholder="Filter by player or commander..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter games"
        />
      </div>
      <div className="game-history-content">
        {filteredGames.length === 0 ? (
          <p className="game-history-empty">No game history found.</p>
        ) : (
          <ul className="game-history-list" aria-live="polite">
            {filteredGames.map(game => {
              // Find winner (placement 1)
              const winner = game.players.find(p => p.placement === 1);
              return (
                <li
                  key={game.id}
                  className="game-history-game"
                  tabIndex={0}
                  aria-label={`Game on ${new Date(game.dateCreated).toLocaleDateString()}`}
                >
                  <div className="game-history-summary-row">
                    <div className="game-history-summary-main">
                      <span className="game-history-date">
                        {new Date(game.dateCreated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span className="game-history-players">
                        {game.players.map(p => p.name).join(", ")}
                      </span>
                      {winner && (
                        <span className="game-history-winner" aria-label="Winning player">
                          Winner: <strong>{winner.name}</strong> (<span className="game-history-winner-commander">{winner.commander}</span>)
                        </span>
                      )}
                    </div>
                    <div className="game-history-summary-actions">
                      <button
                        className="game-history-details-btn"
                        onClick={() => openDetails(game.id)}
                        aria-label="Show more details"
                      >
                        More Details
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default GameHistory;
