
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
            {filteredGames.map(game => (
              <li key={game.id} className="game-history-game" tabIndex={0} aria-label={`Game on ${new Date(game.dateCreated).toLocaleDateString()}`}>
                <div className="game-history-header">
                  <span className="game-history-date">{new Date(game.dateCreated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  {game.notes && <span className="game-history-notes" aria-label="Game notes">{game.notes}</span>}
                </div>
                <table className="game-history-table" role="table">
                  <thead>
                    <tr>
                      <th scope="col">Place</th>
                      <th scope="col">Player</th>
                      <th scope="col">Commander</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.players.map(player => (
                      <tr key={player.name} className={player.placement === 1 ? "game-history-winner" : ""}>
                        <td>{player.placement}</td>
                        <td>{player.name}</td>
                        <td>{player.commander}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default GameHistory;
